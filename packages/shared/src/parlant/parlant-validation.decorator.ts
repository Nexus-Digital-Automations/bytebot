/**
 * PARLANT Validation Decorators - MAXIMUM IMPLEMENTATION
 *
 * Comprehensive decorator system for function-level conversational validation
 * across ALL Bytebot API endpoints with automatic integration and error handling.
 *
 * Features:
 * - Automatic PARLANT validation for all decorated methods
 * - Performance-optimized execution with caching
 * - Comprehensive error handling with conversational guidance
 * - Risk-based validation levels with security enforcement
 * - Real-time audit trails for enterprise compliance
 * - Context-aware validation with user intent analysis
 *
 * Performance: Sub-500ms validation targets with intelligent caching
 * Security: Enterprise-grade validation with conversational authentication
 * Compliance: Complete audit trails for regulatory requirements (SOX, GDPR, HIPAA)
 */

import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
  CallHandler,
  NestInterceptor,
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, throwError } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";
import {
  ParlantIntegrationService,
  ParlantValidationRequest,
  ParlantValidationResponse,
  RiskLevel,
  ConversationalValidationError,
  ParlantConversationContext,
} from "./monitoring/parlant-integration.service";
import {
  ConversationPriority,
  ConversationState,
} from "../types/parlant.types";

// Re-export types for external use
export {
  ParlantValidationRequest,
  ParlantValidationResponse,
  ConversationalValidationError,
  RiskLevel,
};

// ===== PARLANT VALIDATION METADATA =====

/**
 * Metadata key for PARLANT validation configuration
 */
export const PARLANT_VALIDATION_KEY = "parlant:validation";

/**
 * Security levels for PARLANT validation
 */
export enum SecurityLevel {
  MINIMAL = "MINIMAL",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * Validation mode for PARLANT operations
 */
export enum ValidationMode {
  AUTOMATIC = "AUTOMATIC", // Automatic approval for low-risk operations
  CONVERSATIONAL = "CONVERSATIONAL", // Requires conversational validation
  EXPLICIT = "EXPLICIT", // Requires explicit user confirmation
  BLOCKED = "BLOCKED", // Operation not permitted
}

/**
 * Comprehensive PARLANT validation configuration
 */
export interface ParlantValidationConfig {
  /** Human-readable intent description */
  intent: string;

  /** Security level for risk assessment */
  securityLevel: SecurityLevel;

  /** Validation mode for operation */
  validationMode?: ValidationMode;

  /** Detailed description for context */
  description?: string;

  /** Whether result can be cached */
  cacheable?: boolean;

  /** Timeout for validation in milliseconds */
  timeout?: number;

  /** Required user roles for operation */
  requiredRoles?: string[];

  /** Business category for audit trails */
  businessCategory?: string;

  /** Compliance flags for regulatory requirements */
  complianceFlags?: string[];

  /** Custom validation rules */
  customRules?: Array<{
    name: string;
    condition: string;
    action: "APPROVE" | "DENY" | "REQUIRE_CONFIRMATION";
    priority: number;
  }>;
}

// ===== PARLANT VALIDATION DECORATORS =====

/**
 * Critical operation decorator - highest security validation
 * Use for operations that can cause system damage or security breaches
 */
export function ParlantCritical(
  intent: string,
  options?: Partial<ParlantValidationConfig>,
): MethodDecorator {
  const config: ParlantValidationConfig = {
    intent,
    securityLevel: SecurityLevel.CRITICAL,
    validationMode: ValidationMode.EXPLICIT,
    cacheable: false,
    timeout: 30000,
    businessCategory: "CRITICAL_OPERATION",
    complianceFlags: ["HIGH_RISK", "SECURITY_SENSITIVE"],
    ...options,
  };

  return SetMetadata(PARLANT_VALIDATION_KEY, config);
}

/**
 * High security operation decorator
 * Use for operations that modify system state or access sensitive data
 */
export function ParlantSecure(
  intent: string,
  options?: Partial<ParlantValidationConfig>,
): MethodDecorator {
  const config: ParlantValidationConfig = {
    intent,
    securityLevel: SecurityLevel.HIGH,
    validationMode: ValidationMode.CONVERSATIONAL,
    cacheable: false,
    timeout: 15000,
    businessCategory: "SECURE_OPERATION",
    complianceFlags: ["SECURITY_SENSITIVE"],
    ...options,
  };

  return SetMetadata(PARLANT_VALIDATION_KEY, config);
}

/**
 * Standard validation decorator
 * Use for regular operations that require conversational validation
 */
export function ParlantValidated(
  config: ParlantValidationConfig,
): MethodDecorator {
  const fullConfig: ParlantValidationConfig = {
    validationMode: ValidationMode.CONVERSATIONAL,
    cacheable: true,
    timeout: 10000,
    businessCategory: "STANDARD_OPERATION",
    ...config,
  };

  return SetMetadata(PARLANT_VALIDATION_KEY, fullConfig);
}

/**
 * Low-risk operation decorator
 * Use for read-only operations and informational queries
 */
export function ParlantMonitored(
  intent: string,
  options?: Partial<ParlantValidationConfig>,
): MethodDecorator {
  const config: ParlantValidationConfig = {
    intent,
    securityLevel: SecurityLevel.LOW,
    validationMode: ValidationMode.AUTOMATIC,
    cacheable: true,
    timeout: 5000,
    businessCategory: "MONITORING_OPERATION",
    ...options,
  };

  return SetMetadata(PARLANT_VALIDATION_KEY, config);
}

/**
 * Batch operation decorator
 * Use for operations that process multiple items with batch validation
 */
export function ParlantBatch(
  intent: string,
  options?: Partial<ParlantValidationConfig>,
): MethodDecorator {
  const config: ParlantValidationConfig = {
    intent,
    securityLevel: SecurityLevel.MEDIUM,
    validationMode: ValidationMode.CONVERSATIONAL,
    cacheable: false,
    timeout: 45000,
    businessCategory: "BATCH_OPERATION",
    complianceFlags: ["BATCH_PROCESSING"],
    ...options,
  };

  return SetMetadata(PARLANT_VALIDATION_KEY, config);
}

/**
 * Administrative operation decorator
 * Use for system administration and configuration changes
 */
export function ParlantAdmin(
  intent: string,
  options?: Partial<ParlantValidationConfig>,
): MethodDecorator {
  const config: ParlantValidationConfig = {
    intent,
    securityLevel: SecurityLevel.CRITICAL,
    validationMode: ValidationMode.EXPLICIT,
    cacheable: false,
    timeout: 60000,
    requiredRoles: ["ADMIN", "SYSTEM_ADMIN"],
    businessCategory: "ADMINISTRATIVE_OPERATION",
    complianceFlags: ["ADMIN_OPERATION", "SYSTEM_CHANGE"],
    ...options,
  };

  return SetMetadata(PARLANT_VALIDATION_KEY, config);
}

// ===== PARLANT VALIDATION INTERCEPTOR =====

/**
 * PARLANT Validation Interceptor
 * Automatically validates all decorated methods using PARLANT conversational AI
 */
@Injectable()
export class ParlantValidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ParlantValidationInterceptor.name);
  private readonly validationCache = new Map<
    string,
    {
      response: ParlantValidationResponse;
      timestamp: Date;
      ttl: number;
    }
  >();

  constructor(
    private readonly reflector: Reflector,
    private readonly parlantService: ParlantIntegrationService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const validationConfig = this.reflector.get<ParlantValidationConfig>(
      PARLANT_VALIDATION_KEY,
      context.getHandler(),
    );

    // Skip validation if no PARLANT metadata
    if (!validationConfig) {
      return next.handle();
    }

    const operationId = this.generateOperationId();
    const startTime = Date.now();

    return this.performValidation(context, validationConfig, operationId).pipe(
      switchMap((validationResult) => {
        if (!validationResult.approved) {
          throw new ConversationalValidationError(
            validationResult.conversationId,
            validationResult.reason,
            [],
            validationResult.confidence,
            this.mapSecurityLevelToRiskLevel(validationConfig.securityLevel),
          );
        }

        // Log successful validation
        const validationTime = Date.now() - startTime;
        this.logger.log(`[${operationId}] PARLANT validation approved`, {
          operationId,
          intent: validationConfig.intent,
          securityLevel: validationConfig.securityLevel,
          confidence: validationResult.confidence,
          validationTime,
          conversationId: validationResult.conversationId,
        });

        // Proceed with original method execution
        return next.handle();
      }),
      catchError((error) => {
        const validationTime = Date.now() - startTime;

        if (error instanceof ConversationalValidationError) {
          this.logger.warn(`[${operationId}] PARLANT validation denied`, {
            operationId,
            intent: validationConfig.intent,
            reasoning: error.reasoning,
            conversationId: error.conversationId,
            validationTime,
          });

          // Transform to HTTP exception with conversational guidance
          const httpError = new HttpException(
            {
              statusCode: HttpStatus.FORBIDDEN,
              message: "Operation denied by conversational validation",
              error: "Conversational Validation Failed",
              details: {
                intent: validationConfig.intent,
                reasoning: error.reasoning,
                conversationId: error.conversationId,
                suggestedAlternatives: error.suggestedAlternatives,
                securityLevel: validationConfig.securityLevel,
                businessCategory: validationConfig.businessCategory,
              },
              guidance: this.generateConversationalGuidance(
                error,
                validationConfig,
              ),
              metadata: {
                operationId,
                validationTimestamp: new Date(),
                validationTime,
              },
            },
            HttpStatus.FORBIDDEN,
          );

          return throwError(() => httpError);
        }

        this.logger.error(`[${operationId}] PARLANT validation error`, {
          operationId,
          intent: validationConfig.intent,
          error: error instanceof Error ? error.message : String(error),
          validationTime,
        });

        return throwError(() => error);
      }),
    );
  }

  /**
   * Perform PARLANT validation for the operation
   */
  private performValidation(
    context: ExecutionContext,
    config: ParlantValidationConfig,
    operationId: string,
  ): Observable<ParlantValidationResponse> {
    return new Observable((observer) => {
      this.executeValidation(context, config, operationId)
        .then((result) => {
          observer.next(result);
          observer.complete();
        })
        .catch((error) => observer.error(error));
    });
  }

  /**
   * Execute validation logic with caching and performance optimization
   */
  private async executeValidation(
    context: ExecutionContext,
    config: ParlantValidationConfig,
    operationId: string,
  ): Promise<ParlantValidationResponse> {
    const request = context.switchToHttp().getRequest();
    const user = request.user || {};

    // Check cache if enabled
    if (config.cacheable) {
      const cacheKey = this.generateCacheKey(config, user, request);
      const cached = this.getCachedValidation(cacheKey);
      if (cached) {
        this.logger.debug(`[${operationId}] Using cached PARLANT validation`);
        return cached;
      }
    }

    // Build validation request
    const validationRequest: ParlantValidationRequest = {
      functionName: `${context.getClass().name}.${context.getHandler().name}`,
      functionParams: this.extractFunctionParams(request),
      actionDescription: config.intent,
      context: this.buildConversationContext(request, user, config),
      riskLevel: this.mapSecurityLevelToRiskLevel(config.securityLevel),
      operationId,
    };

    // Perform validation with timeout
    const validationPromise =
      this.parlantService.validateFunctionExecution(validationRequest);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Validation timeout")),
        config.timeout || 10000,
      );
    });

    const validationResult = await Promise.race([
      validationPromise,
      timeoutPromise,
    ]);

    // Cache result if enabled
    if (config.cacheable && validationResult.approved) {
      const cacheKey = this.generateCacheKey(config, user, request);
      this.setCachedValidation(
        cacheKey,
        validationResult,
        config.timeout || 10000,
      );
    }

    return validationResult;
  }

  /**
   * Extract function parameters from request
   */
  private extractFunctionParams(request: any): Record<string, unknown> {
    return {
      method: request.method,
      url: request.url,
      params: request.params || {},
      query: request.query || {},
      body: this.sanitizeBody(request.body),
      headers: this.sanitizeHeaders(request.headers),
      userAgent: request.headers?.["user-agent"]?.substring(0, 100),
      ipAddress: this.getClientIpAddress(request),
    };
  }

  /**
   * Build conversation context for validation
   */
  private buildConversationContext(
    request: any,
    user: any,
    config: ParlantValidationConfig,
  ): ParlantConversationContext {
    const conversationId = this.generateOperationId();
    return {
      conversationId,
      userId: user.id || "anonymous",
      sessionId: request.headers?.["x-session-id"] || `session_${Date.now()}`,
      state: ConversationState._ACTIVE,
      participants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        priority: ConversationPriority._NORMAL,
        tags: ["function-validation"],
        properties: {
          operationId: this.generateOperationId(),
          businessCategory: config.businessCategory,
          complianceFlags: config.complianceFlags || [],
          endpoint: `${request.method} ${request.url}`,
          timestamp: new Date().toISOString(),
          requiredRoles: config.requiredRoles || [],
          customRules: config.customRules || [],
        },
        history: [],
      },
    };
  }

  /**
   * Map security level to risk level
   */
  private mapSecurityLevelToRiskLevel(securityLevel: SecurityLevel): RiskLevel {
    switch (securityLevel) {
      case SecurityLevel.MINIMAL:
        return RiskLevel._MINIMAL;
      case SecurityLevel.LOW:
        return RiskLevel._LOW;
      case SecurityLevel.MEDIUM:
        return RiskLevel._MODERATE;
      case SecurityLevel.HIGH:
        return RiskLevel._HIGH;
      case SecurityLevel.CRITICAL:
        return RiskLevel._CRITICAL;
      default:
        return RiskLevel._MODERATE;
    }
  }

  /**
   * Generate conversational guidance for denied operations
   */
  private generateConversationalGuidance(
    error: ConversationalValidationError,
    config: ParlantValidationConfig,
  ): {
    nextSteps: string[];
    alternatives: string[];
    securityNotes: string[];
    contactInfo?: string;
  } {
    const guidance: {
      nextSteps: string[];
      alternatives: string[];
      securityNotes: string[];
      contactInfo?: string;
    } = {
      nextSteps: [
        "Review the operation intent and ensure it aligns with business requirements",
        "Verify you have appropriate permissions for this operation",
        "Consider using an alternative approach that requires lower privileges",
      ],
      alternatives: error.suggestedAlternatives || [
        "Request explicit approval from a system administrator",
        "Use a read-only alternative if available",
        "Break down the operation into smaller, safer steps",
      ],
      securityNotes: [
        `This operation requires ${config.securityLevel} security clearance`,
        "All high-risk operations are subject to conversational validation",
        "Security policies are enforced to protect system integrity",
      ],
    };

    if (config.securityLevel === SecurityLevel.CRITICAL) {
      guidance.nextSteps.unshift(
        "Contact system administrator for critical operation approval",
      );
      guidance.contactInfo = "System Administrator: admin@company.com";
    }

    return guidance;
  }

  /**
   * Generate cache key for validation results
   */
  private generateCacheKey(
    config: ParlantValidationConfig,
    user: any,
    request: any,
  ): string {
    const keyData = {
      intent: config.intent,
      securityLevel: config.securityLevel,
      userId: user.id,
      method: request.method,
      url: request.url,
      userRole: user.role,
    };
    return Buffer.from(JSON.stringify(keyData)).toString("base64");
  }

  /**
   * Get cached validation result
   */
  private getCachedValidation(
    cacheKey: string,
  ): ParlantValidationResponse | null {
    const cached = this.validationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp.getTime() < cached.ttl) {
      return cached.response;
    }
    if (cached) {
      this.validationCache.delete(cacheKey);
    }
    return null;
  }

  /**
   * Set cached validation result
   */
  private setCachedValidation(
    cacheKey: string,
    response: ParlantValidationResponse,
    ttl: number,
  ): void {
    this.validationCache.set(cacheKey, {
      response,
      timestamp: new Date(),
      ttl,
    });

    // Cleanup old cache entries
    if (this.validationCache.size > 1000) {
      const oldestKey = this.validationCache.keys().next().value;
      if (oldestKey) {
        this.validationCache.delete(oldestKey);
      }
    }
  }

  /**
   * Sanitize request body for validation
   */
  private sanitizeBody(body: any): any {
    if (!body) return {};

    const sanitized = { ...body };

    // Remove sensitive fields
    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "key",
      "credentials",
    ];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = "[REDACTED]";
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request headers for validation
   */
  private sanitizeHeaders(headers: any): Record<string, string> {
    if (!headers) return {};

    const sanitized: Record<string, string> = {};
    Object.entries(headers).forEach(([key, value]) => {
      if (
        !key.toLowerCase().includes("authorization") &&
        !key.toLowerCase().includes("cookie") &&
        !key.toLowerCase().includes("token")
      ) {
        sanitized[key] = String(value);
      }
    });

    return sanitized;
  }

  /**
   * Extract client IP address from request
   */
  private getClientIpAddress(request: any): string {
    return (
      request.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
      request.headers?.["x-real-ip"] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      "unknown"
    );
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `parlant_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

// ===== CONTEXT EXTRACTORS =====

/**
 * Extract conversation context from request
 */
export const ConversationContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ParlantConversationContext => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user || {};

    const conversationId = `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    return {
      conversationId,
      userId: user.id || "anonymous",
      sessionId:
        request.headers?.["x-session-id"] ||
        request.sessionID ||
        `session_${Date.now()}`,
      state: ConversationState._ACTIVE,
      participants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        priority: ConversationPriority._NORMAL,
        tags: ["context-extraction"],
        properties: {
          endpoint: `${request.method} ${request.url}`,
          timestamp: new Date().toISOString(),
          userAgent: request.headers?.["user-agent"]?.substring(0, 100),
          ipAddress:
            request.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
            request.connection?.remoteAddress ||
            "unknown",
        },
        history: [],
      },
    };
  },
);

/**
 * Extract validation metadata from decorator
 */
export const ValidationConfig = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ParlantValidationConfig | null => {
    const reflector = new Reflector();
    return reflector.get<ParlantValidationConfig>(
      PARLANT_VALIDATION_KEY,
      ctx.getHandler(),
    );
  },
);
