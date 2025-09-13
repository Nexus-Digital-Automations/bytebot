/**
 * Comprehensive Error Type Definitions for bytebotd Package
 *
 * This module provides enterprise-grade error handling types and utilities
 * to ensure type safety and proper error propagation throughout the application.
 *
 * @author Error Handling Specialist
 * @version 1.0.0
 * @security-focus Critical
 */

/**
 * Base error interface that all custom errors should implement
 */
export interface BaseError {
  readonly name: string;
  readonly message: string;
  readonly code: string;
  readonly timestamp: Date;
  readonly stack?: string;
  readonly context?: Record<string, unknown>;
}

/**
 * Authentication-related error types
 */
export interface AuthenticationError extends BaseError {
  readonly name: 'AuthenticationError';
  readonly code:
    | 'AUTH_FAILED'
    | 'TOKEN_INVALID'
    | 'TOKEN_EXPIRED'
    | 'UNAUTHORIZED';
  readonly userId?: string;
  readonly tokenType?: 'access' | 'refresh' | 'api';
}

/**
 * Authorization-related error types
 */
export interface AuthorizationError extends BaseError {
  readonly name: 'AuthorizationError';
  readonly code: 'FORBIDDEN' | 'INSUFFICIENT_PERMISSIONS' | 'ROLE_REQUIRED';
  readonly userId?: string;
  readonly requiredRole?: string;
  readonly currentRole?: string;
  readonly requiredPermissions?: string[];
}

/**
 * Validation error types
 */
export interface ValidationError extends BaseError {
  readonly name: 'ValidationError';
  readonly code:
    | 'INVALID_INPUT'
    | 'SCHEMA_VALIDATION_FAILED'
    | 'CONSTRAINT_VIOLATION';
  readonly field?: string;
  readonly expectedType?: string;
  readonly actualValue?: unknown;
  readonly validationRules?: string[];
}

/**
 * Security-related error types
 */
export interface SecurityError extends BaseError {
  readonly name: 'SecurityError';
  readonly code:
    | 'RATE_LIMIT_EXCEEDED'
    | 'SUSPICIOUS_ACTIVITY'
    | 'ATTACK_DETECTED'
    | 'SECURITY_VIOLATION';
  readonly clientIp?: string;
  readonly userAgent?: string;
  readonly attackType?: string;
  readonly severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * System/Infrastructure error types
 */
export interface SystemError extends BaseError {
  readonly name: 'SystemError';
  readonly code:
    | 'DATABASE_ERROR'
    | 'NETWORK_ERROR'
    | 'SERVICE_UNAVAILABLE'
    | 'INTERNAL_ERROR';
  readonly service?: string;
  readonly operation?: string;
  readonly retryable?: boolean;
}

/**
 * HTTP-specific error types for safe response handling
 */
export interface HttpError extends BaseError {
  readonly name: 'HttpError';
  readonly statusCode: number;
  readonly statusText: string;
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
}

/**
 * Union type for all possible error types in the application
 */
export type ApplicationError =
  | AuthenticationError
  | AuthorizationError
  | ValidationError
  | SecurityError
  | SystemError
  | HttpError;

/**
 * Type guard to check if an error is an ApplicationError
 */
export function isApplicationError(error: unknown): error is ApplicationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    'message' in error &&
    'code' in error &&
    'timestamp' in error
  );
}

/**
 * Type guard for Authentication errors
 */
export function isAuthenticationError(
  error: unknown,
): error is AuthenticationError {
  return isApplicationError(error) && error.name === 'AuthenticationError';
}

/**
 * Type guard for Authorization errors
 */
export function isAuthorizationError(
  error: unknown,
): error is AuthorizationError {
  return isApplicationError(error) && error.name === 'AuthorizationError';
}

/**
 * Type guard for Validation errors
 */
export function isValidationError(error: unknown): error is ValidationError {
  return isApplicationError(error) && error.name === 'ValidationError';
}

/**
 * Type guard for Security errors
 */
export function isSecurityError(error: unknown): error is SecurityError {
  return isApplicationError(error) && error.name === 'SecurityError';
}

/**
 * Type guard for System errors
 */
export function isSystemError(error: unknown): error is SystemError {
  return isApplicationError(error) && error.name === 'SystemError';
}

/**
 * Type guard for HTTP errors
 */
export function isHttpError(error: unknown): error is HttpError {
  return isApplicationError(error) && error.name === 'HttpError';
}

/**
 * Safe error message extraction that handles unknown error types
 */
export function getErrorMessage(error: unknown): string {
  if (isApplicationError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
}

/**
 * Safe error code extraction
 */
export function getErrorCode(error: unknown): string {
  if (isApplicationError(error)) {
    return error.code;
  }

  if (error instanceof Error) {
    return error.name ?? 'UNKNOWN_ERROR';
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Safe error context extraction
 */
export function getErrorContext(error: unknown): Record<string, unknown> {
  if (isApplicationError(error)) {
    return error.context ?? {};
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      stack: error.stack,
    };
  }

  return {
    errorType: typeof error,
    errorValue: error,
  };
}

/**
 * Error severity levels for logging and monitoring
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Get error severity based on error type and code
 */
export function getErrorSeverity(error: unknown): ErrorSeverity {
  if (isSecurityError(error)) {
    return error.severity
      ? ErrorSeverity[
          error.severity.toUpperCase() as keyof typeof ErrorSeverity
        ]
      : ErrorSeverity.HIGH;
  }

  if (isAuthenticationError(error) ?? isAuthorizationError(error)) {
    return ErrorSeverity.MEDIUM;
  }

  if (isSystemError(error)) {
    return ErrorSeverity.HIGH;
  }

  if (isValidationError(error)) {
    return ErrorSeverity.LOW;
  }

  return ErrorSeverity.MEDIUM;
}
