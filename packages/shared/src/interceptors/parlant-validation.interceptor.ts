/**
 * Parlant Validation Interceptor - Automatic Conversational AI Integration
 *
 * This interceptor automatically applies Parlant conversational AI validation
 * to NestJS controllers and methods decorated with Parlant validation decorators.
 * It provides seamless integration without requiring code changes in controllers.
 *
 * @fileoverview NestJS interceptor for automatic Parlant validation
 * @version 1.0.0
 * @author Parlant Integration Research Agent #2
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
  Optional,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, from, throwError } from "rxjs";
import { switchMap, catchError, tap } from "rxjs/operators";
import { Request } from "express";
import {
  ParlantValidationRequest,
  ParlantValidationResponse,
  ValidationDecision,
  ConversationState,
  ConversationPriority,
  FunctionSecurityLevel,
  RiskLevel,
  ValidationMode,
  ApprovalLevel,
  FunctionContext,
  SourceLocation,
  ExecutionContext as ParlantExecutionContext,
  ExecutionEnvironment,
  UserContext,
  RequestContext,
  SessionContext,
  ValidationParameters,
  ParlantConversationContext,
  ParlantAuditEntry,
  AuditEntryType,
  ActorType,
  AuditAction,
} from "../types/parlant.types";
import {
  getParlantValidationMetadata,
  getConversationContextMetadata,
  getSecurityClassificationMetadata,
  getApprovalWorkflowMetadata,
  getValidationRulesMetadata,
  hasParlantValidation,
} from "../decorators/parlant-validation.decorators";
import { ParlantIntegrationService } from "../services/parlant-integration.service";

// ===========================
// INTERCEPTOR CONFIGURATION
// ===========================

/**
 * Configuration options for the Parlant validation interceptor
 */
export interface ParlantValidationInterceptorConfig {
  /** Enable the interceptor */
  enabled: boolean;

  /** Global timeout for validation requests */
  globalTimeout: number;

  /** Enable caching of validation results */
  cacheEnabled: boolean;

  /** Default cache TTL in milliseconds */
  cacheTtl: number;

  /** Enable audit logging */
  auditEnabled: boolean;

  /** Enable performance monitoring */
  performanceMonitoring: boolean;

  /** Fallback behavior when Parlant is unavailable */
  fallbackBehavior: "allow" | "deny" | "error";

  /** Skip validation for certain environments */
  skipEnvironments: string[];

  /** Custom error handler */
  customErrorHandler?: (
    _error: Error | unknown,
    _context: ExecutionContext,
  ) => unknown;
}

/**
 * Default interceptor configuration
 */
const DEFAULT_CONFIG: ParlantValidationInterceptorConfig = {
  enabled: true,
  globalTimeout: 30000,
  cacheEnabled: true,
  cacheTtl: 300000, // 5 minutes
  auditEnabled: true,
  performanceMonitoring: true,
  fallbackBehavior: "allow",
  skipEnvironments: ["test"],
};

// ===========================
// MAIN INTERCEPTOR IMPLEMENTATION
// ===========================

@Injectable()
export class ParlantValidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ParlantValidationInterceptor.name);
  private readonly config: ParlantValidationInterceptorConfig;

  constructor(
    private readonly _reflector: Reflector,
    @Optional()
    @Inject("PARLANT_INTEGRATION_SERVICE")
    private readonly _parlantService?: ParlantIntegrationService,
    @Optional()
    @Inject("PARLANT_INTERCEPTOR_CONFIG")
    config?: Partial<ParlantValidationInterceptorConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!this._parlantService) {
      this.logger.warn(
        "ParlantIntegrationService not available - interceptor will use fallback behavior",
      );
    }

    this.logger.log("ParlantValidationInterceptor initialized", {
      enabled: this.config.enabled,
      fallbackBehavior: this.config.fallbackBehavior,
      cacheEnabled: this.config.cacheEnabled,
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startTime = performance.now();

    // Skip if interceptor is disabled
    if (!this.config.enabled) {
      return next.handle();
    }

    // Skip for certain environments
    if (
      this.config.skipEnvironments.includes(
        process.env.NODE_ENV || "development",
      )
    ) {
      this.logger.debug("Skipping Parlant validation for current environment");
      return next.handle();
    }

    const handler = context.getHandler();
    const target = context.getClass();

    // Check if method has Parlant validation metadata
    const hasValidation = hasParlantValidation(target.prototype, handler.name);

    if (!hasValidation) {
      // No Parlant validation configured for this method
      return next.handle();
    }

    // Extract all Parlant metadata
    const validationConfig = getParlantValidationMetadata(
      target.prototype,
      handler.name,
    );
    const conversationConfig = getConversationContextMetadata(
      target.prototype,
      handler.name,
    );
    const securityConfig = getSecurityClassificationMetadata(
      target.prototype,
      handler.name,
    );
    const approvalConfig = getApprovalWorkflowMetadata(
      target.prototype,
      handler.name,
    );
    const validationRules = getValidationRulesMetadata(
      target.prototype,
      handler.name,
    );

    const operationId = this.generateOperationId();

    this.logger.log(
      `[${operationId}] Intercepting method for Parlant validation`,
      {
        className: target.name,
        methodName: handler.name,
        validationMode: validationConfig?.mode,
        approvalLevel: validationConfig?.approvalLevel,
      },
    );

    // Perform validation before method execution
    return from(
      this.performValidation(context, operationId, {
        validation: validationConfig,
        conversation: conversationConfig,
        security: securityConfig,
        approval: approvalConfig,
        rules: validationRules,
      }),
    ).pipe(
      switchMap((validationResult) => {
        // Validation passed, execute the method
        this.logger.log(
          `[${operationId}] Validation approved - executing method`,
          {
            decision: validationResult.result.decision,
            confidence: validationResult.result.confidence,
          },
        );

        // Store validation context in request for potential use by method
        const request = context.switchToHttp().getRequest();
        request.parlantValidationResult = validationResult;
        request.parlantConversation = validationResult.conversationContext;
        request.parlantOperationId = operationId;

        return next.handle();
      }),
      tap((_result) => {
        // Log successful completion
        const processingTime = performance.now() - startTime;
        this.logger.log(
          `[${operationId}] Method execution completed successfully`,
          {
            processingTime: Math.round(processingTime),
          },
        );
      }),
      catchError((error) => {
        // Log error and handle accordingly
        const processingTime = performance.now() - startTime;
        this.logger.error(`[${operationId}] Method execution failed`, {
          error: error.message,
          processingTime: Math.round(processingTime),
        });

        // Use custom error handler if provided
        if (this.config.customErrorHandler) {
          const handledError = this.config.customErrorHandler(error, context);
          if (handledError) {
            return throwError(handledError);
          }
        }

        return throwError(error);
      }),
    );
  }

  // ===========================
  // PRIVATE VALIDATION METHODS
  // ===========================

  /**
   * Perform Parlant validation for the intercepted method
   */
  private async performValidation(
    context: ExecutionContext,
    operationId: string,
    metadata: Record<string, unknown>,
  ): Promise<ParlantValidationResponse> {
    try {
      // Create validation request
      const validationRequest = this.createValidationRequest(
        context,
        operationId,
        metadata,
      );

      // Check cache first if enabled
      if (this.config.cacheEnabled) {
        const cachedResult = await this.getCachedValidation(validationRequest);
        if (cachedResult) {
          this.logger.debug(`[${operationId}] Using cached validation result`);
          return cachedResult;
        }
      }

      // Perform validation through service
      if (!this._parlantService) {
        return this.handleFallback(validationRequest, "Service not available");
      }

      const validationResponse =
        await this._parlantService.validateFunctionExecution(validationRequest);

      // Cache the result if approved and caching is enabled
      if (
        this.config.cacheEnabled &&
        validationResponse.result.decision === ValidationDecision.APPROVED
      ) {
        await this.cacheValidation(validationRequest, validationResponse);
      }

      // Log audit entry if enabled
      if (this.config.auditEnabled) {
        await this.logAuditEntry(
          validationRequest,
          validationResponse,
          operationId,
        );
      }

      // Check validation decision
      if (validationResponse.result.decision !== ValidationDecision.APPROVED) {
        throw new ParlantValidationDenialError(
          validationResponse.result.reasoning,
          validationResponse.result.decision,
          validationResponse.result.confidence,
        );
      }

      return validationResponse;
    } catch (error) {
      this.logger.error(`[${operationId}] Validation failed`, {
        error: error.message,
      });

      // Handle validation errors based on configuration
      if (error instanceof ParlantValidationDenialError) {
        throw error;
      }

      // Service error - apply fallback behavior
      return this.handleFallback(
        await this.createValidationRequest(context, operationId, metadata),
        error.message,
      );
    }
  }

  /**
   * Create validation request from execution context
   */
  private createValidationRequest(
    context: ExecutionContext,
    operationId: string,
    metadata: Record<string, unknown>,
  ): ParlantValidationRequest {
    const handler = context.getHandler();
    const target = context.getClass();
    const request = context.switchToHttp().getRequest<Request>();
    const args = context.getArgs();

    // Extract function context
    const functionContext: FunctionContext = {
      functionName: handler.name,
      arguments: this.extractMethodArguments(args),
      source: this.createSourceLocation(target, handler),
      securityLevel:
        metadata.security?.securityLevel || FunctionSecurityLevel.INTERNAL,
      riskLevel: metadata.security?.riskLevel || RiskLevel.MODERATE,
      executionContext: this.createExecutionContext(request),
    };

    // Create validation parameters
    const validationParams: ValidationParameters = {
      mode: metadata.validation?.mode || ValidationMode.INTERACTIVE,
      approvalLevel:
        metadata.validation?.approvalLevel || ApprovalLevel.SINGLE_APPROVAL,
      timeout: metadata.validation?.timeout || this.config.globalTimeout,
      cacheable: this.config.cacheEnabled,
      rules: metadata.rules || [],
    };

    // Create conversation context
    const conversationContext: ParlantConversationContext = {
      conversationId: this.generateConversationId(operationId),
      state: ConversationState.INITIATED,
      metadata: {
        topic:
          metadata.conversation?.topic ||
          `${target.name}.${handler.name} validation`,
        priority:
          metadata.conversation?.priority || ConversationPriority.NORMAL,
        tags: ["interceptor", "nestjs", target.name.toLowerCase()],
        properties: {
          className: target.name,
          methodName: handler.name,
          operationId,
        },
        history: [],
      },
      participants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      requestId: this.generateRequestId(operationId),
      functionContext,
      validationParams,
      conversationContext,
      timestamp: new Date(),
      timeout: validationParams.timeout,
    };
  }

  /**
   * Create source location information
   */
  private createSourceLocation(
    target: unknown,
    handler: (...args: unknown[]) => unknown,
  ): SourceLocation {
    return {
      filePath: target.name + ".ts", // Simplified
      methodName: handler.name,
      className: target.name,
      moduleName: "shared",
    };
  }

  /**
   * Create execution context from request
   */
  private createExecutionContext(request: Request): ParlantExecutionContext {
    const userContext: UserContext = {
      userId: request.user?.id || "anonymous",
      roles: request.user?.roles || [],
      permissions: request.user?.permissions || [],
    };

    const requestContext: RequestContext = {
      requestId:
        (request.headers["x-request-id"] as string) || this.generateRequestId(),
      method: request.method,
      url: request.url,
      headers: this.sanitizeHeaders(request.headers),
      clientIp: request.ip,
      userAgent: request.get("user-agent"),
    };

    const sessionContext: SessionContext = {
      sessionId: request.session?.id || "no-session",
      startTime: new Date(request.session?.startTime || Date.now()),
      lastActivity: new Date(),
    };

    return {
      environment:
        process.env.NODE_ENV === "production"
          ? ExecutionEnvironment.PRODUCTION
          : ExecutionEnvironment.DEVELOPMENT,
      user: userContext,
      request: requestContext,
      session: sessionContext,
      properties: {
        nodeVersion: process.version,
        platform: process.platform,
      },
    };
  }

  /**
   * Extract method arguments safely
   */
  private extractMethodArguments(args: unknown[]): Record<string, unknown> {
    const methodArguments: Record<string, unknown> = {};

    // Skip first 3 args which are typically request, response, next in NestJS
    const methodArgs = args.slice(3);

    methodArgs.forEach((arg, index) => {
      if (arg !== null && arg !== undefined) {
        methodArguments[`arg${index}`] = this.sanitizeArgument(arg);
      }
    });

    return methodArguments;
  }

  /**
   * Sanitize argument for logging/validation
   */
  private sanitizeArgument(arg: unknown): unknown {
    if (typeof arg !== "object" || arg === null) {
      return arg;
    }

    const sensitiveFields = [
      "password",
      "token",
      "apiKey",
      "secret",
      "privateKey",
      "accessToken",
      "refreshToken",
      "sessionId",
      "authorization",
    ];

    const sanitized = Array.isArray(arg) ? [...arg] : { ...arg };

    if (typeof sanitized === "object") {
      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = "[REDACTED]";
        }
      }
    }

    return sanitized;
  }

  /**
   * Sanitize request headers
   */
  private sanitizeHeaders(
    headers: Record<string, unknown>,
  ): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];

    Object.keys(headers).forEach((key) => {
      const value = headers[key];
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = typeof value === "string" ? value : String(value);
      }
    });

    return sanitized;
  }

  /**
   * Handle fallback behavior when validation fails
   */
  private async handleFallback(
    request: ParlantValidationRequest,
    reason: string,
  ): Promise<ParlantValidationResponse> {
    this.logger.warn(
      `Applying fallback behavior: ${this.config.fallbackBehavior}`,
      { reason },
    );

    switch (this.config.fallbackBehavior) {
      case "allow":
        return this.createFallbackApprovalResponse(request, reason);

      case "deny":
        throw new ParlantValidationDenialError(
          `Validation denied due to service unavailability: ${reason}`,
          ValidationDecision.DENIED,
          0,
        );

      case "error":
      default:
        throw new Error(`Parlant validation service unavailable: ${reason}`);
    }
  }

  /**
   * Create fallback approval response
   */
  private createFallbackApprovalResponse(
    request: ParlantValidationRequest,
    reason: string,
  ): ParlantValidationResponse {
    return {
      requestId: request.requestId,
      result: {
        decision: ValidationDecision.APPROVED,
        confidence: 0.5, // Low confidence for fallback
        reasoning: `Fallback approval due to: ${reason}`,
        ruleResults: [],
        recommendations: [],
        evidence: {
          artifacts: [],
          sources: [],
          confidenceScore: 0.5,
          complete: false,
          collectedAt: new Date(),
        },
      },
      timestamp: new Date(),
      processingTime: 0,
      conversationContext: request.conversationContext,
    };
  }

  /**
   * Get cached validation result
   */
  private async getCachedValidation(
    _request: ParlantValidationRequest,
  ): Promise<ParlantValidationResponse | null> {
    // Implementation would use actual cache service
    // For now, return null to skip caching
    return null;
  }

  /**
   * Cache validation result
   */
  private async cacheValidation(
    _request: ParlantValidationRequest,
    _response: ParlantValidationResponse,
  ): Promise<void> {
    // Implementation would use actual cache service
    // For now, do nothing
  }

  /**
   * Log audit entry for validation
   */
  private async logAuditEntry(
    request: ParlantValidationRequest,
    response: ParlantValidationResponse,
    operationId: string,
  ): Promise<void> {
    const auditEntry: ParlantAuditEntry = {
      id: this.generateAuditId(),
      type: AuditEntryType.VALIDATION_RESPONSE,
      timestamp: new Date(),
      conversationId: request.conversationContext.conversationId,
      requestId: request.requestId,
      actor: {
        id: "parlant-interceptor",
        type: ActorType.SERVICE,
        name: "Parlant Validation Interceptor",
        roles: ["validator", "interceptor"],
      },
      action: AuditAction.PROVIDE_VALIDATION,
      details: {
        functionContext: request.functionContext,
        validationResult: response.result,
        performanceMetrics: {
          startTime: new Date(Date.now() - response.processingTime),
          endTime: response.timestamp,
          duration: response.processingTime,
          customMetrics: {
            interceptor: "nestjs",
            operationId,
          },
        },
      },
      metadata: {
        interceptorVersion: "1.0.0",
        environment: process.env.NODE_ENV || "development",
      },
    };

    // Log audit entry (implementation would use actual audit service)
    this.logger.log("Parlant validation audit entry", {
      auditId: auditEntry.id,
      requestId: request.requestId,
      decision: response.result.decision,
      operationId,
    });
  }

  // ===========================
  // UTILITY METHODS
  // ===========================

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(operationId?: string): string {
    const suffix = operationId
      ? `_${operationId.split("_")[1]}`
      : `_${Date.now()}`;
    return `req${suffix}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate conversation ID
   */
  private generateConversationId(operationId: string): string {
    const suffix = operationId.split("_")[1] || Date.now();
    return `conv_${suffix}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate audit entry ID
   */
  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ===========================
// ERROR CLASSES
// ===========================

/**
 * Custom error for Parlant validation denials
 */
export class ParlantValidationDenialError extends Error {
  constructor(
    message: string,
    public readonly _decision: ValidationDecision,
    public readonly _confidence: number,
  ) {
    super(message);
    this.name = "ParlantValidationDenialError";
  }
}

/**
 * Custom error for Parlant service unavailability
 */
export class ParlantServiceUnavailableError extends Error {
  constructor(
    message: string,
    public readonly _originalError?: Error | unknown,
  ) {
    super(message);
    this.name = "ParlantServiceUnavailableError";
  }
}
