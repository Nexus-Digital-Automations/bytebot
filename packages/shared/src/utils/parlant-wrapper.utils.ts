/**
 * Parlant Wrapper Utilities - Function-Level Conversational AI Integration
 *
 * This module provides utility functions for wrapping existing functions with
 * Parlant conversational AI validation capabilities. These utilities enable
 * seamless integration of real-time validation, approval workflows, and
 * conversational interfaces without requiring major code changes.
 *
 * @fileoverview Parlant function wrapping utilities and patterns
 * @version 1.0.0
 * @author Parlant Integration Research Agent #2
 */

import { Logger } from "@nestjs/common";

/**
 * Interface for objects with dynamic property access
 */
interface DynamicObject {
  constructor?: {
    name?: string;
  };
  prototype?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Interface for class constructors with prototypes
 */
interface ClassConstructor {
  prototype: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): any;
}
import {
  ParlantValidationRequest,
  ParlantValidationResponse,
  ParlantConversationContext,
  ValidationResult as _ValidationResult,
  ValidationDecision,
  ConversationState,
  ConversationPriority,
  FunctionSecurityLevel,
  RiskLevel,
  ValidationMode,
  ApprovalLevel,
  FunctionContext,
  SourceLocation,
  ExecutionContext,
  ExecutionEnvironment,
  UserContext as _UserContext,
  RequestContext as _RequestContext,
  SessionContext as _SessionContext,
  ValidationParameters,
  ValidationRule,
  ValidationRuleType as _ValidationRuleType,
  PerformanceMetrics,
  ErrorDetails as _ErrorDetails,
  ErrorSeverity as _ErrorSeverity,
  ParlantWrapperConfig as _ParlantWrapperConfig,
} from "../types/parlant.types";
import {
  getParlantValidationMetadata,
  getConversationContextMetadata,
  getSecurityClassificationMetadata,
  getApprovalWorkflowMetadata,
  getValidationRulesMetadata,
} from "../decorators/parlant-validation.decorators";

// ===========================
// FUNCTION WRAPPING INTERFACES
// ===========================

/**
 * Wrapped function signature
 */
export type WrappedFunction<T extends (...args: any[]) => any> = (
  ...args: Parameters<T>
) => Promise<ReturnType<T>>;

/**
 * Function wrapper configuration
 */
export interface FunctionWrapperConfig {
  /** Enable wrapping */
  enabled: boolean;

  /** Validation mode */
  validationMode: ValidationMode;

  /** Approval level */
  approvalLevel: ApprovalLevel;

  /** Function security level */
  securityLevel: FunctionSecurityLevel;

  /** Risk level */
  riskLevel: RiskLevel;

  /** Validation timeout */
  timeout: number;

  /** Cache results */
  cacheable: boolean;

  /** Validation rules */
  rules: ValidationRule[];

  /** Conversation priority */
  conversationPriority: ConversationPriority;

  /** Custom configuration */
  customConfig?: Record<string, unknown>;
}

/**
 * Function execution result with Parlant validation
 */
export interface ParlantExecutionResult<T> {
  /** Function execution result */
  result: T;

  /** Validation response */
  validation: ParlantValidationResponse;

  /** Performance metrics */
  metrics: PerformanceMetrics;

  /** Conversation context */
  conversationContext: ParlantConversationContext;

  /** Execution metadata */
  metadata: {
    functionName: string;
    executionTime: number;
    approved: boolean;
    cached: boolean;
  };
}

/**
 * Wrapper context information
 */
export interface WrapperContext {
  /** Function being wrapped */
  functionName: string;

  /** Function source location */
  sourceLocation: SourceLocation;

  /** Execution context */
  executionContext: ExecutionContext;

  /** Wrapper configuration */
  config: FunctionWrapperConfig;

  /** Logger instance */
  logger: Logger;

  /** Performance metrics */
  startTime: number;
}

/**
 * Parlant service interface for function validation
 */
export interface ParlantService {
  /** Validate function execution */
  validateFunctionExecution(
    _request: ParlantValidationRequest,
  ): Promise<ParlantValidationResponse>;
}

// ===========================
// CORE WRAPPER FUNCTIONS
// ===========================

/**
 * Create a Parlant-wrapped version of a function
 *
 * @param originalFunction - The function to wrap
 * @param config - Wrapper configuration
 * @param parlantService - Parlant integration service
 * @returns Wrapped function with Parlant validation
 *
 * @example
 * ```typescript
 * const wrappedFunction = createParlantWrapper(
 *   originalFunction,
 *   {
 *     enabled: true,
 *     validationMode: ValidationMode._INTERACTIVE,
 *     approvalLevel: ApprovalLevel._SINGLE_APPROVAL,
 *     securityLevel: FunctionSecurityLevel.RESTRICTED,
 *     riskLevel: RiskLevel.HIGH,
 *     timeout: 30000,
 *     cacheable: false,
 *     rules: [],
 *     conversationPriority: ConversationPriority.HIGH
 *   },
 *   parlantService
 * );
 * ```
 */
export function createParlantWrapper<
  T extends (...args: any[]) => any,
>(
  originalFunction: T,
  config: FunctionWrapperConfig,
  parlantService: ParlantService,
): WrappedFunction<T> {
  const logger = new Logger(`ParlantWrapper:${originalFunction.name}`);

  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const context = createWrapperContext(originalFunction, config, logger);

    logger.log(`[${context.functionName}] Starting Parlant-wrapped execution`, {
      functionName: context.functionName,
      args: sanitizeArguments(args),
      config: {
        validationMode: config.validationMode,
        approvalLevel: config.approvalLevel,
        securityLevel: config.securityLevel,
        riskLevel: config.riskLevel,
      },
    });

    try {
      // Skip wrapper if disabled
      if (!config.enabled) {
        logger.debug(
          `[${context.functionName}] Parlant wrapper disabled, executing directly`,
        );
        return (await originalFunction(...args)) as ReturnType<T>;
      }

      // Create validation request
      const validationRequest = createValidationRequest(
        originalFunction,
        args,
        context,
      );

      // Perform validation
      const validationResponse =
        await parlantService.validateFunctionExecution(validationRequest);

      // Check validation result
      if (validationResponse.result.decision !== ValidationDecision._APPROVED) {
        const error = new ParlantValidationRejection(
          `Function execution denied: ${validationResponse.result.reasoning}`,
          validationResponse.result.decision,
          validationResponse.result.confidence,
          validationResponse,
        );

        logger.warn(`[${context.functionName}] Function execution rejected`, {
          decision: validationResponse.result.decision,
          reasoning: validationResponse.result.reasoning,
          confidence: validationResponse.result.confidence,
        });

        throw error;
      }

      // Execute function with validation approval
      logger.log(`[${context.functionName}] Function approved for execution`, {
        decision: validationResponse.result.decision,
        confidence: validationResponse.result.confidence,
        conversationId: validationResponse.conversationContext.conversationId,
      });

      const executionStartTime = performance.now();
      const result = await executeWithMonitoring(
        originalFunction,
        args,
        context,
        validationResponse,
      );
      const executionTime = performance.now() - executionStartTime;

      logger.log(
        `[${context.functionName}] Function execution completed successfully`,
        {
          executionTime: Math.round(executionTime),
          conversationId: validationResponse.conversationContext.conversationId,
        },
      );

      return result as ReturnType<T>;
    } catch (error) {
      const executionTime = performance.now() - context.startTime;

      logger.error(`[${context.functionName}] Function execution failed`, {
        error: error instanceof Error ? error.message : String(error),
        executionTime: Math.round(executionTime),
      });

      // Log error details if it's a Parlant validation rejection
      if (error instanceof ParlantValidationRejection) {
        await logValidationRejection(error, context, parlantService);
      }

      throw error;
    }
  };
}

/**
 * Wrap function with metadata from decorators
 *
 * @param originalFunction - The function to wrap
 * @param target - Class instance
 * @param propertyKey - Method name
 * @param parlantService - Parlant integration service
 * @returns Wrapped function with decorator-based configuration
 */
export function wrapFunctionWithMetadata<
  T extends (...args: any[]) => any,
>(
  originalFunction: T,
  target: unknown,
  propertyKey: string,
  parlantService: unknown,
): WrappedFunction<T> {
  const targetObj = target as DynamicObject;
  const logger = new Logger(
    `ParlantWrapper:${targetObj.constructor?.name || "Unknown"}.${propertyKey}`,
  );

  // Extract metadata from decorators
  const validationConfig = getParlantValidationMetadata(
    target as object,
    propertyKey,
  );
  const conversationConfig = getConversationContextMetadata(
    target as object,
    propertyKey,
  );
  const securityConfig = getSecurityClassificationMetadata(
    target as object,
    propertyKey,
  );
  const _approvalConfig = getApprovalWorkflowMetadata(
    target as object,
    propertyKey,
  );
  const validationRules = getValidationRulesMetadata(
    target as object,
    propertyKey,
  );

  if (!validationConfig?.enabled) {
    logger.debug(
      `Parlant validation not enabled for ${targetObj.constructor?.name || "Unknown"}.${propertyKey}`,
    );
    return originalFunction as WrappedFunction<T>;
  }

  // Create wrapper configuration from metadata
  const wrapperConfig: FunctionWrapperConfig = {
    enabled: validationConfig.enabled ?? true,
    validationMode: validationConfig.mode ?? ValidationMode._INTERACTIVE,
    approvalLevel:
      validationConfig.approvalLevel ?? ApprovalLevel._SINGLE_APPROVAL,
    securityLevel:
      securityConfig?.securityLevel ?? FunctionSecurityLevel._INTERNAL,
    riskLevel: securityConfig?.riskLevel ?? RiskLevel._MODERATE,
    timeout: validationConfig.timeout ?? 30000,
    cacheable: validationConfig.cacheable ?? false,
    rules: validationRules ?? [],
    conversationPriority:
      conversationConfig?.priority ?? ConversationPriority._NORMAL,
    customConfig: validationConfig.customConfig,
  };

  logger.log(
    `Creating Parlant wrapper for ${targetObj.constructor?.name || "Unknown"}.${propertyKey}`,
    {
      validationMode: wrapperConfig.validationMode,
      approvalLevel: wrapperConfig.approvalLevel,
      securityLevel: wrapperConfig.securityLevel,
      riskLevel: wrapperConfig.riskLevel,
    },
  );

  return createParlantWrapper(
    originalFunction,
    wrapperConfig,
    parlantService as ParlantService,
  );
}

/**
 * Wrap all methods of a class with Parlant validation
 *
 * @param target - Class to wrap
 * @param parlantService - Parlant integration service
 * @returns Class with wrapped methods
 */
export function wrapClassMethods(
  target: unknown,
  parlantService: unknown,
): unknown {
  const targetObj = target as DynamicObject;
  const logger = new Logger(
    `ParlantWrapper:${targetObj.constructor?.name || "Unknown"}`,
  );

  const methodNames = targetObj.prototype
    ? Object.getOwnPropertyNames(targetObj.prototype).filter(
        (name) =>
          name !== "constructor" &&
          targetObj.prototype &&
          typeof targetObj.prototype[name] === "function",
      )
    : [];

  logger.log(
    `Wrapping ${methodNames.length} methods for class ${targetObj.constructor?.name || "Unknown"}`,
    {
      methods: methodNames,
    },
  );

  for (const methodName of methodNames) {
    const classTarget = target as ClassConstructor;
    const originalMethod = classTarget.prototype[methodName];

    // Type guard to ensure originalMethod is a function
    if (typeof originalMethod !== "function") {
      continue; // Skip non-function properties
    }

    const wrappedMethod = wrapFunctionWithMetadata(
      originalMethod as (...args: any[]) => any,
      classTarget.prototype,
      methodName,
      parlantService,
    );

    classTarget.prototype[methodName] = wrappedMethod;
  }

  return target;
}

// ===========================
// HELPER FUNCTIONS
// ===========================

/**
 * Create wrapper context for function execution
 */
function createWrapperContext(
  originalFunction: (...args: any[]) => any,
  config: FunctionWrapperConfig,
  logger: Logger,
): WrapperContext {
  return {
    functionName: originalFunction.name || "anonymous",
    sourceLocation: extractSourceLocation(originalFunction),
    executionContext: createExecutionContext(),
    config,
    logger,
    startTime: performance.now(),
  };
}

/**
 * Extract source location from function
 */
function extractSourceLocation(
  _func: (...args: any[]) => any,
): SourceLocation {
  // In a real implementation, this would use stack traces or source maps
  return {
    filePath: "unknown",
    methodName: _func.name || "anonymous",
    moduleName: "shared",
  };
}

/**
 * Create execution context for function
 */
function createExecutionContext(): ExecutionContext {
  return {
    environment:
      process.env.NODE_ENV === "production"
        ? ExecutionEnvironment._PRODUCTION
        : ExecutionEnvironment._DEVELOPMENT,
    properties: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };
}

/**
 * Create validation request for function execution
 */
function createValidationRequest<T extends (...args: any[]) => any>(
  originalFunction: T,
  args: Parameters<T>,
  context: WrapperContext,
): ParlantValidationRequest {
  const requestId = generateRequestId();

  const functionContext: FunctionContext = {
    functionName: context.functionName,
    arguments: convertArgsToRecord(args),
    source: context.sourceLocation,
    securityLevel: context.config.securityLevel,
    riskLevel: context.config.riskLevel,
    executionContext: context.executionContext,
  };

  const validationParams: ValidationParameters = {
    mode: context.config.validationMode,
    approvalLevel: context.config.approvalLevel,
    timeout: context.config.timeout,
    cacheable: context.config.cacheable,
    rules: context.config.rules,
  };

  const conversationContext: ParlantConversationContext = {
    conversationId: generateConversationId(),
    state: ConversationState._INITIATED,
    metadata: {
      priority: context.config.conversationPriority,
      tags: ["function-validation"],
      properties: { functionName: context.functionName },
      history: [],
    },
    participants: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    requestId,
    functionContext,
    validationParams,
    conversationContext,
    timestamp: new Date(),
    timeout: context.config.timeout,
  };
}

/**
 * Execute function with monitoring and validation context
 */
async function executeWithMonitoring<T>(
  originalFunction: (...args: any[]) => any,
  args: unknown[],
  context: WrapperContext,
  validationResponse: ParlantValidationResponse,
): Promise<T> {
  const startTime = performance.now();

  try {
    // Execute the original function
    const result = await originalFunction(...args);

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Log successful execution
    context.logger.debug(`Function executed successfully`, {
      functionName: context.functionName,
      executionTime: Math.round(executionTime),
      conversationId: validationResponse.conversationContext.conversationId,
    });

    return result as T;
  } catch (error) {
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Log execution error
    context.logger.error(`Function execution failed`, {
      functionName: context.functionName,
      executionTime: Math.round(executionTime),
      error: error instanceof Error ? error.message : String(error),
      conversationId: validationResponse.conversationContext.conversationId,
    });

    throw error;
  }
}

/**
 * Sanitize function arguments for logging
 */
function sanitizeArguments(args: unknown[]): unknown[] {
  return args.map((arg) => {
    if (typeof arg === "object" && arg !== null) {
      // Remove sensitive data from objects
      const sanitized = { ...(arg as Record<string, unknown>) };

      // Common sensitive field names
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

      for (const field of sensitiveFields) {
        if (field in sanitized) {
          (sanitized as Record<string, unknown>)[field] = "[REDACTED]";
        }
      }

      return sanitized;
    }

    return arg;
  });
}

/**
 * Convert function arguments to record format
 */
function convertArgsToRecord(args: unknown[]): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  args.forEach((arg, index) => {
    record[`arg${index}`] = arg;
  });

  return record;
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique conversation ID
 */
function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log validation rejection details
 */
async function logValidationRejection(
  error: ParlantValidationRejection,
  context: WrapperContext,
  _parlantService: ParlantService,
): Promise<void> {
  try {
    // Create audit entry for rejection
    const auditData = {
      functionName: context.functionName,
      decision: error._decision,
      confidence: error._confidence,
      reasoning: error._validationResponse.result.reasoning,
      timestamp: new Date(),
    };

    context.logger.warn(
      "Function validation rejected - audit entry created",
      auditData,
    );

    // In a real implementation, this would log to an audit service
    // await parlantService.logAuditEntry(auditData);
  } catch (auditError) {
    context.logger.error("Failed to log validation rejection audit entry", {
      error:
        auditError instanceof Error ? auditError.message : String(auditError),
    });
  }
}

// ===========================
// WRAPPER UTILITY CLASSES
// ===========================

/**
 * Custom error for Parlant validation rejections
 */
export class ParlantValidationRejection extends Error {
  constructor(
    message: string,
    public readonly _decision: ValidationDecision,
    public readonly _confidence: number,
    public readonly _validationResponse: ParlantValidationResponse,
  ) {
    super(message);
    this.name = "ParlantValidationRejection";
  }
}

/**
 * Function wrapper builder for fluent configuration
 */
export class ParlantWrapperBuilder<T extends (...args: any[]) => any> {
  private config: Partial<FunctionWrapperConfig> = {};

  constructor(
    private _originalFunction: T,
    private _parlantService: ParlantService,
  ) {}

  /**
   * Enable or disable the wrapper
   */
  enabled(enabled: boolean): ParlantWrapperBuilder<T> {
    this.config.enabled = enabled;
    return this;
  }

  /**
   * Set validation mode
   */
  validationMode(mode: ValidationMode): ParlantWrapperBuilder<T> {
    this.config.validationMode = mode;
    return this;
  }

  /**
   * Set approval level
   */
  approvalLevel(level: ApprovalLevel): ParlantWrapperBuilder<T> {
    this.config.approvalLevel = level;
    return this;
  }

  /**
   * Set security level
   */
  securityLevel(level: FunctionSecurityLevel): ParlantWrapperBuilder<T> {
    this.config.securityLevel = level;
    return this;
  }

  /**
   * Set risk level
   */
  riskLevel(level: RiskLevel): ParlantWrapperBuilder<T> {
    this.config.riskLevel = level;
    return this;
  }

  /**
   * Set timeout
   */
  timeout(timeout: number): ParlantWrapperBuilder<T> {
    this.config.timeout = timeout;
    return this;
  }

  /**
   * Enable or disable caching
   */
  cacheable(cacheable: boolean): ParlantWrapperBuilder<T> {
    this.config.cacheable = cacheable;
    return this;
  }

  /**
   * Add validation rules
   */
  rules(rules: ValidationRule[]): ParlantWrapperBuilder<T> {
    this.config.rules = rules;
    return this;
  }

  /**
   * Set conversation priority
   */
  conversationPriority(
    priority: ConversationPriority,
  ): ParlantWrapperBuilder<T> {
    this.config.conversationPriority = priority;
    return this;
  }

  /**
   * Add custom configuration
   */
  customConfig(config: Record<string, unknown>): ParlantWrapperBuilder<T> {
    this.config.customConfig = config;
    return this;
  }

  /**
   * Build the wrapped function
   */
  build(): WrappedFunction<T> {
    const defaultConfig: FunctionWrapperConfig = {
      enabled: true,
      validationMode: ValidationMode._INTERACTIVE,
      approvalLevel: ApprovalLevel._SINGLE_APPROVAL,
      securityLevel: FunctionSecurityLevel._INTERNAL,
      riskLevel: RiskLevel._MODERATE,
      timeout: 30000,
      cacheable: false,
      rules: [],
      conversationPriority: ConversationPriority._NORMAL,
    };

    const finalConfig = { ...defaultConfig, ...this.config };
    return createParlantWrapper(
      this._originalFunction,
      finalConfig,
      this._parlantService,
    );
  }
}

/**
 * Create a wrapper builder for fluent configuration
 *
 * @param originalFunction - Function to wrap
 * @param parlantService - Parlant integration service
 * @returns Wrapper builder instance
 *
 * @example
 * ```typescript
 * const wrappedFunction = parlantWrapper(originalFunction, parlantService)
 *   .validationMode(ValidationMode._INTERACTIVE)
 *   .approvalLevel(ApprovalLevel.DUAL_APPROVAL)
 *   .securityLevel(FunctionSecurityLevel.RESTRICTED)
 *   .riskLevel(RiskLevel.HIGH)
 *   .timeout(60000)
 *   .conversationPriority(ConversationPriority.CRITICAL)
 *   .build();
 * ```
 */
export function parlantWrapper<T extends (...args: any[]) => any>(
  originalFunction: T,
  parlantService: unknown,
): ParlantWrapperBuilder<T> {
  return new ParlantWrapperBuilder(
    originalFunction,
    parlantService as ParlantService,
  );
}

// ===========================
// WRAPPER REGISTRY
// ===========================

/**
 * Global registry for wrapped functions
 */
export class ParlantWrapperRegistry {
  private static instance: ParlantWrapperRegistry;
  private wrappedFunctions = new Map<
    string,
    WrappedFunction<(...args: any[]) => any>
  >();
  private wrapperMetadata = new Map<string, FunctionWrapperConfig>();
  private logger = new Logger("ParlantWrapperRegistry");

  static getInstance(): ParlantWrapperRegistry {
    if (!ParlantWrapperRegistry.instance) {
      ParlantWrapperRegistry.instance = new ParlantWrapperRegistry();
    }
    return ParlantWrapperRegistry.instance;
  }

  /**
   * Register a wrapped function
   */
  register<T extends (...args: any[]) => any>(
    functionId: string,
    wrappedFunction: WrappedFunction<T>,
    config: FunctionWrapperConfig,
  ): void {
    this.wrappedFunctions.set(functionId, wrappedFunction);
    this.wrapperMetadata.set(functionId, config);

    this.logger.log(`Registered wrapped function: ${functionId}`, {
      securityLevel: config.securityLevel,
      riskLevel: config.riskLevel,
      validationMode: config.validationMode,
    });
  }

  /**
   * Get a wrapped function
   */
  get<T extends (...args: any[]) => any>(
    functionId: string,
  ): WrappedFunction<T> | undefined {
    return this.wrappedFunctions.get(functionId);
  }

  /**
   * Get wrapper configuration
   */
  getConfig(functionId: string): FunctionWrapperConfig | undefined {
    return this.wrapperMetadata.get(functionId);
  }

  /**
   * List all registered functions
   */
  list(): string[] {
    return Array.from(this.wrappedFunctions.keys());
  }

  /**
   * Unregister a wrapped function
   */
  unregister(functionId: string): void {
    this.wrappedFunctions.delete(functionId);
    this.wrapperMetadata.delete(functionId);
    this.logger.log(`Unregistered wrapped function: ${functionId}`);
  }

  /**
   * Get registry statistics
   */
  getStatistics(): {
    totalFunctions: number;
    bySecurityLevel: Record<string, number>;
    byRiskLevel: Record<string, number>;
    byValidationMode: Record<string, number>;
  } {
    const stats = {
      totalFunctions: this.wrappedFunctions.size,
      bySecurityLevel: {} as Record<string, number>,
      byRiskLevel: {} as Record<string, number>,
      byValidationMode: {} as Record<string, number>,
    };

    for (const config of Array.from(this.wrapperMetadata.values())) {
      // Count by security level
      const secLevel = config.securityLevel;
      stats.bySecurityLevel[secLevel] =
        (stats.bySecurityLevel[secLevel] || 0) + 1;

      // Count by risk level
      const riskLevel = config.riskLevel;
      stats.byRiskLevel[riskLevel] = (stats.byRiskLevel[riskLevel] || 0) + 1;

      // Count by validation mode
      const valMode = config.validationMode;
      stats.byValidationMode[valMode] =
        (stats.byValidationMode[valMode] || 0) + 1;
    }

    return stats;
  }
}
