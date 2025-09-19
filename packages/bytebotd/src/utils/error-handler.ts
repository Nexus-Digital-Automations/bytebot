/**
 * Comprehensive Error Handling Utilities
 *
 * This module provides enterprise-grade error handling utilities including
 * safe error catching, error transformation, logging, and monitoring integration.
 *
 * @author Error Handling Specialist
 * @version 1.0.0
 * @security-focus Critical
 */

import {
  ApplicationError,
  getErrorMessage as _getErrorMessage,
  getErrorCode as _getErrorCode,
  getErrorContext as _getErrorContext,
  getErrorSeverity,
  isApplicationError,
  isAuthenticationError,
  isAuthorizationError,
  isSecurityError,
  isSystemError,
  isValidationError,
  isHttpError,
} from '../types/error-types';

import {
  ErrorFactory,
  BaseCustomError as _BaseCustomError,
} from '../errors/custom-errors';

/**
 * Result type for operations that may fail
 */
export type Result<T, E = ApplicationError> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: E;
    };

/**
 * Async result type for Promise-based operations
 */
export type AsyncResult<T, E = ApplicationError> = Promise<Result<T, E>>;

/**
 * Error context for logging and monitoring
 */
export interface ErrorLogContext {
  operationId: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  clientIp?: string;
  userAgent?: string;
  requestId?: string;
  traceId?: string;
  service: string;
  operation: string;
  duration?: number;
  additionalContext?: Record<string, unknown>;
}

/**
 * Error logging levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Logger interface for dependency injection
 */
export interface ErrorLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  fatal(message: string, context?: Record<string, unknown>): void;
}

/**
 * Default console logger implementation
 */
export const defaultLogger: ErrorLogger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    console.debug(`[DEBUG] ${message}`, context ?? ''),
  info: (message: string, context?: Record<string, unknown>) =>
    console.info(`[INFO] ${message}`, context ?? ''),
  warn: (message: string, context?: Record<string, unknown>) =>
    console.warn(`[WARN] ${message}`, context ?? ''),
  error: (message: string, context?: Record<string, unknown>) =>
    console.error(`[ERROR] ${message}`, context ?? ''),
  fatal: (message: string, context?: Record<string, unknown>) =>
    console.error(`[FATAL] ${message}`, context ?? ''),
};

/**
 * Global error handler configuration
 */
export interface ErrorHandlerConfig {
  logger: ErrorLogger;
  enableMonitoring: boolean;
  enableStackTraces: boolean;
  sensitiveFieldPattern: RegExp;
  maxContextSize: number;
}

/**
 * Default error handler configuration
 */
export const defaultErrorHandlerConfig: ErrorHandlerConfig = {
  logger: defaultLogger,
  enableMonitoring: true,
  enableStackTraces: process.env.NODE_ENV !== 'production',
  sensitiveFieldPattern: /(password|token|secret|key|auth|credential)/i,
  maxContextSize: 10000, // Maximum size of context object in characters
};

/**
 * Global error handler instance
 */
let globalErrorHandler: ErrorHandler;

/**
 * Main error handler class
 */
export class ErrorHandler {
  constructor(private config: ErrorHandlerConfig = defaultErrorHandlerConfig) {}

  /**
   * Safe execution wrapper that catches and transforms errors
   */
  async safeExecute<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorLogContext>,
  ): AsyncResult<T> {
    const startTime = Date.now();
    const operationId =
      context.operationId ??
      `op${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    const fullContext: ErrorLogContext = {
      operationId,
      timestamp: new Date(),
      service: 'unknown',
      operation: 'unknown',
      ...context,
    };

    try {
      this.config.logger.debug(`Starting operation: ${fullContext.operation}`, {
        operationId,
        service: fullContext.service,
      });

      const result = await operation();

      const duration = Date.now() - startTime;
      this.config.logger.debug(
        `Operation completed successfully: ${fullContext.operation}`,
        { operationId, duration, service: fullContext.service },
      );

      return { success: true, data: result };
    } catch (error) {
      const duration = Date.now() - startTime;
      const transformedError = this.transformError(error, {
        ...fullContext,
        duration,
      });

      this.logError(transformedError, { ...fullContext, duration });

      return { success: false, error: transformedError };
    }
  }

  /**
   * Synchronous safe execution wrapper
   */
  safeExecuteSync<T>(
    operation: () => T,
    context: Partial<ErrorLogContext>,
  ): Result<T> {
    const startTime = Date.now();
    const operationId =
      context.operationId ??
      `op_sync${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    const fullContext: ErrorLogContext = {
      operationId,
      timestamp: new Date(),
      service: 'unknown',
      operation: 'unknown',
      ...context,
    };

    try {
      this.config.logger.debug(
        `Starting sync operation: ${fullContext.operation}`,
        { operationId, service: fullContext.service },
      );

      const result = operation();

      const duration = Date.now() - startTime;
      this.config.logger.debug(
        `Sync operation completed successfully: ${fullContext.operation}`,
        { operationId, duration, service: fullContext.service },
      );

      return { success: true, data: result };
    } catch (error) {
      const duration = Date.now() - startTime;
      const transformedError = this.transformError(error, {
        ...fullContext,
        duration,
      });

      this.logError(transformedError, { ...fullContext, duration });

      return { success: false, error: transformedError };
    }
  }

  /**
   * Transform unknown errors into typed ApplicationError instances
   */
  transformError(
    error: unknown,
    context?: Partial<ErrorLogContext>,
  ): ApplicationError {
    // If already an ApplicationError, return as-is
    if (isApplicationError(error)) {
      return error;
    }

    // If it's a standard Error instance, transform it
    if (error instanceof Error) {
      return this.transformStandardError(error, context);
    }

    // Handle primitive types and unknown objects
    return ErrorFactory.system.serviceUnavailable('Unknown service', {
      originalError: error,
      errorType: typeof error,
      context,
    });
  }

  /**
   * Transform standard Error instances into ApplicationError instances
   */
  private transformStandardError(
    error: Error,
    context?: Partial<ErrorLogContext>,
  ): ApplicationError {
    const errorMessage = error.message;
    const errorName = error.name;
    const errorStack = error.stack;

    // Check for common error patterns and transform accordingly
    if (
      errorName === 'UnauthorizedException' ||
      errorMessage.includes('unauthorized')
    ) {
      return ErrorFactory.authentication.unauthorized({
        originalError: error,
        stack: errorStack,
        context,
      });
    }

    if (
      errorName === 'ForbiddenException' ||
      errorMessage.includes('forbidden')
    ) {
      return ErrorFactory.authorization.forbidden(undefined, undefined, {
        originalError: error,
        stack: errorStack,
        context,
      });
    }

    if (
      errorName === 'ValidationError' ||
      errorMessage.includes('validation')
    ) {
      return ErrorFactory.validation.invalidInput(
        undefined,
        undefined,
        undefined,
        {
          originalError: error,
          stack: errorStack,
          context,
        },
      );
    }

    if (errorName === 'TokenExpiredError' || errorMessage.includes('expired')) {
      return ErrorFactory.authentication.tokenExpired({
        originalError: error,
        stack: errorStack,
        context,
      });
    }

    if (errorName === 'JsonWebTokenError' || errorMessage.includes('jwt')) {
      return ErrorFactory.authentication.tokenInvalid({
        originalError: error,
        stack: errorStack,
        context,
      });
    }

    if (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests')
    ) {
      return ErrorFactory.security.rateLimitExceeded(undefined, 'medium', {
        originalError: error,
        stack: errorStack,
        context,
      });
    }

    if (
      errorMessage.includes('database') ||
      errorMessage.includes('connection')
    ) {
      return ErrorFactory.system.database(undefined, true, {
        originalError: error,
        stack: errorStack,
        context,
      });
    }

    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return ErrorFactory.system.network(undefined, {
        originalError: error,
        stack: errorStack,
        context,
      });
    }

    // Default to system error for unclassified errors
    return ErrorFactory.system.serviceUnavailable(undefined, {
      originalError: error,
      errorName,
      stack: errorStack,
      context,
    });
  }

  /**
   * Log error with appropriate level and context
   */
  logError(error: ApplicationError, context: ErrorLogContext): void {
    const severity = getErrorSeverity(error);
    const logLevel = this.getLogLevelFromSeverity(severity);
    const sanitizedContext = this.sanitizeContext(context);
    const errorDetails = this.buildErrorDetails(error, sanitizedContext);

    switch (logLevel) {
      case LogLevel.DEBUG:
        this.config.logger.debug(error.message, errorDetails);
        break;
      case LogLevel.INFO:
        this.config.logger.info(error.message, errorDetails);
        break;
      case LogLevel.WARN:
        this.config.logger.warn(error.message, errorDetails);
        break;
      case LogLevel.ERROR:
        this.config.logger.error(error.message, errorDetails);
        break;
      case LogLevel.FATAL:
        this.config.logger.fatal(error.message, errorDetails);
        break;
    }

    // Send to monitoring service if enabled
    if (this.config.enableMonitoring) {
      this.sendToMonitoring(error, sanitizedContext);
    }
  }

  /**
   * Build comprehensive error details for logging
   */
  private buildErrorDetails(
    error: ApplicationError,
    context: ErrorLogContext,
  ): Record<string, unknown> {
    const details: Record<string, unknown> = {
      errorName: error.name,
      errorCode: error.code,
      timestamp: error.timestamp,
      operationId: context.operationId,
      service: context.service,
      operation: context.operation,
      duration: context.duration,
    };

    // Add stack trace if enabled
    if (this.config.enableStackTraces && error.stack) {
      details.stack = error.stack;
    }

    // Add error-specific details
    if (isAuthenticationError(error)) {
      details.userId = error.userId;
      details.tokenType = error.tokenType;
    }

    if (isAuthorizationError(error)) {
      details.userId = error.userId;
      details.requiredRole = error.requiredRole;
      details.currentRole = error.currentRole;
      details.requiredPermissions = error.requiredPermissions;
    }

    if (isValidationError(error)) {
      details.field = error.field;
      details.expectedType = error.expectedType;
      details.validationRules = error.validationRules;
    }

    if (isSecurityError(error)) {
      details.clientIp = error.clientIp;
      details.userAgent = error.userAgent;
      details.attackType = error.attackType;
      details.severity = error.severity;
    }

    if (isSystemError(error)) {
      details.service = error.service;
      details.operation = error.operation;
      details.retryable = error.retryable;
    }

    if (isHttpError(error)) {
      details.statusCode = error.statusCode;
      details.statusText = error.statusText;
    }

    // Add context information
    if (context.userId) details.userId = context.userId;
    if (context.sessionId) details.sessionId = context.sessionId;
    if (context.clientIp) details.clientIp = context.clientIp;
    if (context.userAgent) details.userAgent = context.userAgent;
    if (context.requestId) details.requestId = context.requestId;
    if (context.traceId) details.traceId = context.traceId;

    // Add error context
    if (error.context && Object.keys(error.context).length > 0) {
      details.errorContext = error.context;
    }

    // Add additional context
    if (
      context.additionalContext &&
      Object.keys(context.additionalContext).length > 0
    ) {
      details.additionalContext = context.additionalContext;
    }

    return details;
  }

  /**
   * Get log level from error severity
   */
  private getLogLevelFromSeverity(severity: string): LogLevel {
    switch (severity.toLowerCase()) {
      case 'low':
        return LogLevel.INFO;
      case 'medium':
        return LogLevel.WARN;
      case 'high':
        return LogLevel.ERROR;
      case 'critical':
        return LogLevel.FATAL;
      default:
        return LogLevel.ERROR;
    }
  }

  /**
   * Sanitize context to remove sensitive information
   */
  private sanitizeContext(context: ErrorLogContext): ErrorLogContext {
    const sanitized = { ...context };

    // Remove sensitive fields from additional context
    if (sanitized.additionalContext) {
      sanitized.additionalContext = this.sanitizeObject(
        sanitized.additionalContext,
      );
    }

    // Truncate large context objects
    const contextStr = JSON.stringify(sanitized);
    if (contextStr.length > this.config.maxContextSize) {
      sanitized.additionalContext = {
        ...sanitized.additionalContext,
        truncated: true,
        originalSize: contextStr.length,
      };
    }

    return sanitized;
  }

  /**
   * Recursively sanitize object to remove sensitive fields
   */
  private sanitizeObject(
    obj: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.config.sensitiveFieldPattern.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Send error to monitoring service (placeholder for actual implementation)
   */
  private sendToMonitoring(
    error: ApplicationError,
    context: ErrorLogContext,
  ): void {
    // Placeholder for monitoring service integration
    // In a real implementation, this would send to services like:
    // - Sentry
    // - New Relic
    // - DataDog
    // - Custom metrics endpoint

    this.config.logger.debug('Error sent to monitoring service', {
      errorCode: error.code,
      operationId: context.operationId,
      service: context.service,
    });
  }
}

/**
 * Get or create global error handler instance
 */
export function getErrorHandler(
  config?: Partial<ErrorHandlerConfig>,
): ErrorHandler {
  if (!globalErrorHandler) {
    const fullConfig = { ...defaultErrorHandlerConfig, ...config };
    globalErrorHandler = new ErrorHandler(fullConfig);
  }
  return globalErrorHandler;
}

/**
 * Convenient wrapper functions for common error handling patterns
 */
export const ErrorHandlerUtils = {
  /**
   * Safe async function execution
   */
  safeAsync<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorLogContext>,
  ): AsyncResult<T> {
    return getErrorHandler().safeExecute(operation, context);
  },

  /**
   * Safe sync function execution
   */
  safeSync<T>(
    operation: () => T,
    context: Partial<ErrorLogContext>,
  ): Result<T> {
    return getErrorHandler().safeExecuteSync(operation, context);
  },

  /**
   * Transform any error to ApplicationError
   */
  transformError(
    error: unknown,
    context?: Partial<ErrorLogContext>,
  ): ApplicationError {
    return getErrorHandler().transformError(error, context);
  },

  /**
   * Log error with proper context
   */
  logError(error: ApplicationError, context: ErrorLogContext): void {
    getErrorHandler().logError(error, context);
  },

  /**
   * Check if operation result was successful
   */
  isSuccess<T>(result: Result<T>): result is { success: true; data: T } {
    return result.success;
  },

  /**
   * Check if operation result was a failure
   */
  isFailure<T>(
    result: Result<T>,
  ): result is { success: false; error: ApplicationError } {
    return !result.success;
  },

  /**
   * Extract data from successful result or throw error
   */
  unwrap<T>(result: Result<T>): T {
    if (result.success) {
      return result.data;
    }
    throw result.error;
  },

  /**
   * Extract data from successful result or return default value
   */
  unwrapOr<T>(result: Result<T>, defaultValue: T): T {
    if (result.success) {
      return result.data;
    }
    return defaultValue;
  },

  /**
   * Chain multiple operations that may fail
   */
  async chain<T, U>(
    result: AsyncResult<T>,
    nextOperation: (data: T) => AsyncResult<U>,
  ): AsyncResult<U> {
    const firstResult = await result;
    if (!firstResult.success) {
      return firstResult;
    }
    return nextOperation(firstResult.data);
  },
};
