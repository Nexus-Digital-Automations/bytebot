/**
 * Parlant Function Validation Decorator
 *
 * Revolutionary function-level validation decorator that enables conversational AI
 * control over ALL 1,520+ functions across the AIgent ecosystem. Provides
 * real-time validation, security checks, audit trails, and performance monitoring
 * through Parlant's conversational AI engine.
 *
 * @module ParlantValidationDecorator
 * @version 1.0.0
 * @author AIgent Integration Team
 */

// Note: Injectable and Inject not currently used but available for future DI needs
import { v4 as uuidv4 } from "uuid";

// Type for generic function to replace Function type with additional properties
type GenericFunction = ((..._args: unknown[]) => unknown) & {
  _parlantWrapped?: boolean;
  _parlantMetadata?: ParlantFunctionMetadata;
  _parlantConfig?: ParlantValidationConfig;
};
import {
  ParlantValidationRequest,
  ParlantValidationResponse,
  ParlantUserContext,
  ParlantFunctionMetadata,
  ParlantValidationConfig,
  ParlantDecoratorOptions,
  SecurityLevel,
  ParlantValidationError,
  ParlantTimeoutError,
  ParlantAuthenticationError,
} from "../types/parlant-integration.types";
import { ParlantIntegrationService } from "../services/parlant-integration.service";

/**
 * Parlant Validation Decorator
 *
 * Wraps any function to enable conversational AI validation through Parlant.
 * This decorator transforms traditional function calls into AI-validated operations
 * with enterprise-grade security, monitoring, and audit capabilities.
 *
 * @param options Configuration options for the validation
 * @returns Method decorator function
 */
export function ParlantValidated(options: ParlantDecoratorOptions) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const functionName = `${className}.${propertyKey}`;

    // Create function metadata
    const metadata: ParlantFunctionMetadata = {
      name: functionName,
      packageName: getPackageName(),
      description: options.description,
      parameterSchemas: extractParameterSchemas(originalMethod),
      returnSchema: extractReturnSchema(originalMethod),
      securityRequirements: getSecurityRequirements(
        options.securityLevel || SecurityLevel._MEDIUM,
      ),
      performanceSla: {
        maxResponseTime: options.timeout || 5000,
        requiredUptime: 99.9,
        maxErrorRate: 1.0,
      },
    };

    // Create validation configuration
    const validationConfig: ParlantValidationConfig = {
      enabled: true,
      securityLevel: options.securityLevel || SecurityLevel._MEDIUM,
      cacheable: options.cacheable !== false,
      cacheTtl: options.cacheTtl || 3600000, // 1 hour default
      timeout: options.timeout || 5000,
      retryConfig: {
        maxAttempts: 3,
        baseDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000,
      },
    };

    // Replace the original method with validation wrapper
    descriptor.value = async function (...args: unknown[]) {
      const startTime = Date.now();
      const operationId = uuidv4();
      const context = this as unknown;

      // Get Parlant Integration Service instance
      const parlantService = getParlantService(context);
      if (!parlantService) {
        throw new ParlantValidationError(
          "Parlant Integration Service not available",
          { functionName, operationId },
        );
      }

      // Register function if not already registered
      // Access functionRegistry through the service's public method
      if (!parlantService.hasFunction(functionName)) {
        parlantService.registerFunction(
          functionName,
          metadata,
          validationConfig,
        );
      }

      // Get user context
      const userContext = await getUserContext(context, args);

      // Create validation request
      const validationRequest: ParlantValidationRequest = {
        operationId,
        functionName,
        packageName: metadata.packageName,
        description: metadata.description,
        parameters: extractParameters(originalMethod, args),
        userContext,
        securityLevel: validationConfig.securityLevel,
        timeout: validationConfig.timeout,
      };

      try {
        // Perform Parlant validation
        const validationResponse = await performValidationWithRetry(
          parlantService,
          validationRequest,
          validationConfig,
          options.customValidator,
        );

        // Check if operation is approved
        if (!validationResponse.approved) {
          const error = new ParlantValidationError(
            `Operation blocked by Parlant validation: ${validationResponse.reason}`,
            {
              functionName,
              operationId,
              conversationId: validationResponse.conversationId,
              reason: validationResponse.reason,
              confidence: validationResponse.confidence,
            },
          );

          // Update function metrics
          updateFunctionMetrics(parlantService, functionName, {
            failed: true,
            validationTime: Date.now() - startTime,
          });

          throw error;
        }

        // Apply execution context if provided
        if (validationResponse.executionContext) {
          await applyExecutionContext(
            validationResponse.executionContext,
            context,
          );
        }

        // Execute the original function with monitoring
        const result = await executeWithMonitoring(
          originalMethod,
          context,
          args,
          validationResponse,
          operationId,
        );

        // Update function metrics
        const executionTime = Date.now() - startTime;
        updateFunctionMetrics(parlantService, functionName, {
          success: true,
          validationTime: validationResponse.metadata.processingTime,
          executionTime,
          cacheHit: validationResponse.metadata.cacheStatus === "hit",
        });

        // Log successful execution
        logFunctionExecution(functionName, operationId, {
          success: true,
          executionTime,
          result: sanitizeForLogging(result),
          validationResponse,
        });

        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;

        // Update function metrics
        updateFunctionMetrics(parlantService, functionName, {
          failed: true,
          validationTime: 0,
          executionTime,
          error: error.message,
        });

        // Log failed execution
        logFunctionExecution(functionName, operationId, {
          success: false,
          executionTime,
          error: error.message,
          stack: error.stack,
        });

        throw error;
      }
    };

    // Preserve metadata
    Object.defineProperty(descriptor.value, "name", {
      value: originalMethod.name,
    });
    Object.defineProperty(descriptor.value, "_parlantMetadata", {
      value: metadata,
    });
    Object.defineProperty(descriptor.value, "_parlantConfig", {
      value: validationConfig,
    });
    Object.defineProperty(descriptor.value, "_originalMethod", {
      value: originalMethod,
    });

    return descriptor;
  };
}

/**
 * Class decorator for automatic Parlant validation of all methods
 */
export function ParlantValidatedClass(classOptions: {
  packageName?: string;
  defaultSecurityLevel?: SecurityLevel;
  enableValidation?: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function <T extends new (..._args: any[]) => object>(constructor: T) {
    return class extends constructor {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(...args: any[]) {
        super(...args);

        if (classOptions.enableValidation !== false) {
          // Auto-wrap all methods with Parlant validation
          const prototype = Object.getPrototypeOf(this);
          const methodNames = Object.getOwnPropertyNames(prototype).filter(
            (name) =>
              name !== "constructor" &&
              typeof prototype[name] === "function" &&
              !name.startsWith("_"), // Skip private methods
          );

          for (const methodName of methodNames) {
            const originalMethod = prototype[methodName];
            if (originalMethod && !originalMethod._parlantWrapped) {
              this.wrapMethodWithParlant(
                methodName,
                originalMethod,
                classOptions,
              );
            }
          }
        }
      }

      public wrapMethodWithParlant(
        methodName: string,
        originalMethod: GenericFunction,
        options: unknown,
      ) {
        const typedOptions = options as {
          defaultSecurityLevel?: SecurityLevel;
          packageName?: string;
          enableValidation?: boolean;
        };
        const decoratorOptions: ParlantDecoratorOptions = {
          description: `Auto-generated validation for ${methodName}`,
          securityLevel:
            typedOptions.defaultSecurityLevel || SecurityLevel._MEDIUM,
          cacheable: true,
        };

        // Apply the decorator programmatically
        const descriptor = {
          value: originalMethod,
          writable: true,
          enumerable: false,
          configurable: true,
        };

        ParlantValidated(decoratorOptions)(this, methodName, descriptor);

        // Replace the method
        Object.defineProperty(this, methodName, {
          ...descriptor,
          value: descriptor.value,
        });

        // Mark as wrapped
        descriptor.value._parlantWrapped = true;
      }
    };
  };
}

/**
 * Perform validation with retry logic
 */
async function performValidationWithRetry(
  parlantService: ParlantIntegrationService,
  request: ParlantValidationRequest,
  config: ParlantValidationConfig,
  // eslint-disable-next-line no-unused-vars
  customValidator?: (request: ParlantValidationRequest) => Promise<boolean>,
): Promise<ParlantValidationResponse> {
  const { maxAttempts, baseDelay, backoffMultiplier, maxDelay } =
    config.retryConfig;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Run custom validator if provided
      if (customValidator) {
        const customResult = await customValidator(request);
        if (!customResult) {
          return {
            approved: false,
            conversationId: "",
            reason: "Custom validation failed",
            confidence: 1.0,
            metadata: {
              startTime: new Date(),
              endTime: new Date(),
              processingTime: 0,
              cacheStatus: "miss" as "hit" | "miss" | "stale",
              source: "parlant" as "cache" | "parlant" | "fallback",
              riskAssessment: {
                level: SecurityLevel._HIGH,
                factors: ["Custom validation failure"],
                score: 90,
                mitigations: ["Review function parameters and context"],
              },
            },
          };
        }
      }

      // Perform Parlant validation
      return await parlantService.validateFunction(request);
    } catch (error) {
      lastError = error;

      // Don't retry on authentication errors
      if (error instanceof ParlantAuthenticationError) {
        throw error;
      }

      // Don't retry if this is the last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));

      console.warn(
        `Parlant validation retry ${attempt}/${maxAttempts} for ${request.functionName}`,
        {
          error: error.message,
          nextDelay: delay,
        },
      );
    }
  }

  throw lastError;
}

/**
 * Execute function with monitoring and resource constraints
 */
async function executeWithMonitoring(
  originalMethod: GenericFunction,
  context: unknown,
  args: unknown[],
  validationResponse: ParlantValidationResponse,
  operationId: string,
): Promise<unknown> {
  const executionContext = validationResponse.executionContext;

  if (!executionContext) {
    return originalMethod.apply(context, args);
  }

  // Set up monitoring
  const startTime = Date.now();
  let memoryUsageBefore = 0;

  if (executionContext.monitoring.realTimeMonitoring) {
    memoryUsageBefore = process.memoryUsage().heapUsed;
  }

  // Execute with timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(
        new ParlantTimeoutError(
          `Function execution timeout: ${executionContext.resourceLimits.maxExecutionTime}ms`,
        ),
      );
    }, executionContext.resourceLimits.maxExecutionTime);
  });

  try {
    const result = await Promise.race([
      originalMethod.apply(context, args),
      timeoutPromise,
    ]);

    // Monitor resource usage
    if (executionContext.monitoring.realTimeMonitoring) {
      const executionTime = Date.now() - startTime;
      const memoryUsed = process.memoryUsage().heapUsed - memoryUsageBefore;
      const memoryUsageMB = memoryUsed / 1024 / 1024;

      if (memoryUsageMB > executionContext.resourceLimits.maxMemoryUsage) {
        console.warn(`Memory limit exceeded for ${operationId}`, {
          used: memoryUsageMB,
          limit: executionContext.resourceLimits.maxMemoryUsage,
        });
      }

      // Log performance metrics
      console.log(`Function execution metrics for ${operationId}`, {
        executionTime,
        memoryUsage: memoryUsageMB,
        resourceLimits: executionContext.resourceLimits,
      });
    }

    return result;
  } catch (error) {
    if (executionContext.monitoring.alertOnViolations) {
      console.error(`Function execution failed for ${operationId}`, {
        error: error.message,
        stack: error.stack,
      });
    }
    throw error;
  }
}

/**
 * Apply execution context constraints
 */
async function applyExecutionContext(
  executionContext: unknown,
  _context: unknown,
): Promise<void> {
  // Apply constraints based on execution context
  const contextWithConstraints = executionContext as { constraints?: unknown };
  if (contextWithConstraints.constraints) {
    // Implementation would depend on specific constraint types
    console.debug(
      "Applying execution constraints",
      contextWithConstraints.constraints,
    );
  }

  // Set up resource monitoring
  const contextWithMonitoring = executionContext as {
    monitoring?: { realTimeMonitoring?: boolean };
  };
  if (contextWithMonitoring.monitoring?.realTimeMonitoring) {
    // Set up monitoring hooks
    console.debug("Real-time monitoring enabled for function execution");
  }
}

/**
 * Get Parlant service instance from context
 */
function getParlantService(context: unknown): ParlantIntegrationService | null {
  const typedContext = context as {
    parlantService?: ParlantIntegrationService;
    constructor?: { parlantService?: ParlantIntegrationService };
  };

  // Try to get service from NestJS context
  if (typedContext.parlantService) {
    return typedContext.parlantService;
  }

  // Try to get from constructor
  if (typedContext.constructor?.parlantService) {
    return typedContext.constructor.parlantService;
  }

  // Try to get from global registry (fallback)
  const globalService = (
    global as unknown as { __parlantService__?: ParlantIntegrationService }
  ).__parlantService__;
  if (globalService) {
    return globalService;
  }

  return null;
}

/**
 * Extract user context from function context and arguments
 */
async function getUserContext(
  context: unknown,
  args: unknown[],
): Promise<ParlantUserContext> {
  // Try to extract from request context (NestJS)
  const request =
    (context as { request?: unknown }).request ||
    args.find((arg: unknown) => arg && (arg as { user?: unknown }).user);

  const typedRequest = request as {
    user?: { id?: string; roles?: string[] };
    sessionID?: string;
    ip?: string;
    headers?: { [key: string]: string };
  };

  if (typedRequest && typedRequest.user) {
    return {
      userId: typedRequest.user.id || "anonymous",
      roles: typedRequest.user.roles || ["user"],
      sessionId: typedRequest.sessionID || "no-session",
      ipAddress: typedRequest.ip || "127.0.0.1",
      metadata: {
        timestamp: Date.now(),
        userAgent: typedRequest.headers?.["user-agent"] || "unknown",
      },
    };
  }

  // Default anonymous context
  return {
    userId: "anonymous",
    roles: ["anonymous"],
    sessionId: "anonymous-session",
    ipAddress: "127.0.0.1",
    metadata: {
      timestamp: Date.now(),
      source: "system",
    },
  };
}

/**
 * Extract function parameters from arguments
 */
function extractParameters(
  method: GenericFunction,
  args: unknown[],
): Record<string, unknown> {
  const paramNames = getParameterNames(method);
  const parameters: Record<string, unknown> = {};

  for (let i = 0; i < Math.min(paramNames.length, args.length); i++) {
    parameters[paramNames[i]] = sanitizeForLogging(args[i]);
  }

  return parameters;
}

/**
 * Get parameter names from function
 */
function getParameterNames(func: GenericFunction): string[] {
  const funcStr = func.toString();
  const match = funcStr.match(/\(([^)]*)\)/);

  if (!match) return [];

  return match[1]
    .split(",")
    .map((param) => param.trim().split("=")[0].trim())
    .filter((param) => param && !param.startsWith("..."));
}

/**
 * Extract parameter schemas for validation
 */
function extractParameterSchemas(
  method: GenericFunction,
): Record<string, unknown> {
  // This would typically use reflection metadata or TypeScript decorators
  // For now, return basic schema
  const paramNames = getParameterNames(method);
  const schemas: Record<string, unknown> = {};

  for (const paramName of paramNames) {
    schemas[paramName] = { type: "unknown", required: true };
  }

  return schemas;
}

/**
 * Extract return schema for validation
 */
function extractReturnSchema(
  _method: GenericFunction,
): Record<string, unknown> {
  // This would typically use reflection metadata
  return { type: "unknown" };
}

/**
 * Get security requirements based on level
 */
function getSecurityRequirements(level: SecurityLevel): string[] {
  switch (level) {
    case SecurityLevel._LOW:
      return ["basic-auth"];
    case SecurityLevel._MEDIUM:
      return ["basic-auth", "input-validation"];
    case SecurityLevel._HIGH:
      return ["basic-auth", "input-validation", "audit-logging"];
    case SecurityLevel._CRITICAL:
      return [
        "basic-auth",
        "input-validation",
        "audit-logging",
        "two-factor-auth",
        "real-time-monitoring",
      ];
    default:
      return ["basic-auth"];
  }
}

/**
 * Get package name from context
 */
function getPackageName(): string {
  // Try to detect package name from call stack or module info
  const stack = new Error().stack;
  if (stack) {
    const match = stack.match(/\/packages\/([^/]+)\//);
    if (match) {
      return match[1];
    }
  }

  return "unknown-package";
}

/**
 * Update function metrics
 */
function updateFunctionMetrics(
  parlantService: ParlantIntegrationService,
  functionName: string,
  update: {
    success?: boolean;
    failed?: boolean;
    validationTime?: number;
    executionTime?: number;
    cacheHit?: boolean;
    error?: string;
  },
): void {
  // Get function metrics through the service's public method
  const metrics = parlantService.getFunctionMetrics?.(functionName);
  if (!metrics) return;

  metrics.totalInvocations = (metrics.totalInvocations || 0) + 1;

  if (update.success) {
    metrics.successfulValidations++;
  }

  if (update.failed) {
    metrics.failedValidations++;
  }

  if (update.validationTime !== undefined) {
    // Update average validation time with exponential moving average
    const alpha = 0.1;
    metrics.averageValidationTime =
      metrics.averageValidationTime * (1 - alpha) +
      update.validationTime * alpha;
  }

  if (update.cacheHit !== undefined) {
    // Update cache hit rate
    const totalValidations =
      metrics.successfulValidations + metrics.failedValidations;
    if (totalValidations > 0) {
      metrics.cacheHitRate = update.cacheHit
        ? (metrics.cacheHitRate * (totalValidations - 1) + 100) /
          totalValidations
        : (metrics.cacheHitRate * (totalValidations - 1)) / totalValidations;
    }
  }

  const totalValidations =
    (metrics.successfulValidations || 0) + (metrics.failedValidations || 0);
  metrics.errorRate =
    totalValidations > 0
      ? ((metrics.failedValidations || 0) / totalValidations) * 100
      : 0;

  metrics.lastUpdated = new Date();
}

/**
 * Log function execution
 */
function logFunctionExecution(
  functionName: string,
  operationId: string,
  details: {
    success: boolean;
    executionTime: number;
    result?: unknown;
    error?: string;
    stack?: string;
    validationResponse?: ParlantValidationResponse;
  },
): void {
  const logData = {
    functionName,
    operationId,
    success: details.success,
    executionTime: details.executionTime,
    timestamp: new Date().toISOString(),
  };

  if (details.success) {
    console.log(
      `✅ Parlant-validated function executed: ${functionName}`,
      logData,
    );
  } else {
    console.error(`❌ Parlant-validated function failed: ${functionName}`, {
      ...logData,
      error: details.error,
      stack: details.stack,
    });
  }

  // Additional audit logging could be implemented here
}

/**
 * Sanitize data for logging (remove sensitive information)
 */
function sanitizeForLogging(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    // Truncate long strings
    return data.length > 1000
      ? data.substring(0, 1000) + "...[truncated]"
      : data;
  }

  if (typeof data === "object") {
    if (Array.isArray(data)) {
      return data.length > 10
        ? [...data.slice(0, 10), `...[${data.length - 10} more items]`]
        : data.map((item) => sanitizeForLogging(item));
    }

    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = [
      "password",
      "token",
      "secret",
      "key",
      "auth",
      "credential",
    ];

    for (const [key, value] of Object.entries(data)) {
      if (
        sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))
      ) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeForLogging(value);
      }
    }

    return sanitized;
  }

  return data;
}

/**
 * Utility function to create Parlant validation decorator with common settings
 */
export const ParlantSecure = (
  description: string,
  securityLevel: SecurityLevel = SecurityLevel._HIGH,
) => ParlantValidated({ description, securityLevel, cacheable: true });

export const ParlantCritical = (description: string) =>
  ParlantValidated({
    description,
    securityLevel: SecurityLevel._CRITICAL,
    cacheable: false,
  });

export const ParlantCached = (
  description: string,
  cacheTtl: number = 3600000,
) => ParlantValidated({ description, cacheable: true, cacheTtl });

export const ParlantFast = (description: string, timeout: number = 1000) =>
  ParlantValidated({ description, timeout, cacheable: true });
