/**
 * Custom Error Classes for Enterprise Error Handling
 *
 * This module provides concrete implementations of custom error classes
 * that extend the base Error class while implementing our typed interfaces.
 *
 * @author Error Handling Specialist
 * @version 1.0.0
 * @security-focus Critical
 */

import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  SecurityError,
  SystemError,
  HttpError,
  ErrorSeverity as _ErrorSeverity,
} from '../types/error-types';

/**
 * Base custom error class that all other errors extend
 */
export abstract class BaseCustomError extends Error {
  public readonly timestamp: Date;
  public readonly context: Record<string, unknown>;
  public abstract readonly code: string;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.context = context;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Authentication error implementations
 */
export class TokenInvalidError
  extends BaseCustomError
  implements AuthenticationError
{
  public readonly name = 'AuthenticationError' as const;
  public readonly code = 'TOKEN_INVALID' as const;
  public readonly userId?: string;
  public readonly tokenType?: 'access' | 'refresh' | 'api';

  constructor(
    message = 'Invalid or malformed token',
    options: {
      userId?: string;
      tokenType?: 'access' | 'refresh' | 'api';
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, options.context);
    this.userId = options.userId;
    this.tokenType = options.tokenType;
  }
}

export class TokenExpiredError
  extends BaseCustomError
  implements AuthenticationError
{
  public readonly name = 'AuthenticationError' as const;
  public readonly code = 'TOKEN_EXPIRED' as const;
  public readonly userId?: string;
  public readonly tokenType?: 'access' | 'refresh' | 'api';

  constructor(
    message = 'Token has expired',
    options: {
      userId?: string;
      tokenType?: 'access' | 'refresh' | 'api';
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, options.context);
    this.userId = options.userId;
    this.tokenType = options.tokenType;
  }
}

export class AuthenticationFailedError
  extends BaseCustomError
  implements AuthenticationError
{
  public readonly name = 'AuthenticationError' as const;
  public readonly code = 'AUTH_FAILED' as const;
  public readonly userId?: string;
  public readonly tokenType?: 'access' | 'refresh' | 'api';

  constructor(
    message = 'Authentication failed',
    options: {
      userId?: string;
      tokenType?: 'access' | 'refresh' | 'api';
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, options.context);
    this.userId = options.userId;
    this.tokenType = options.tokenType;
  }
}

export class UnauthorizedError
  extends BaseCustomError
  implements AuthenticationError
{
  public readonly name = 'AuthenticationError' as const;
  public readonly code = 'UNAUTHORIZED' as const;
  public readonly userId?: string;
  public readonly tokenType?: 'access' | 'refresh' | 'api';

  constructor(
    message = 'Unauthorized access',
    options: {
      userId?: string;
      tokenType?: 'access' | 'refresh' | 'api';
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, options.context);
    this.userId = options.userId;
    this.tokenType = options.tokenType;
  }
}

/**
 * Authorization error implementations
 */
export class ForbiddenError
  extends BaseCustomError
  implements AuthorizationError
{
  public readonly name = 'AuthorizationError' as const;
  public readonly code = 'FORBIDDEN' as const;
  public readonly userId?: string;
  public readonly requiredRole?: string;
  public readonly currentRole?: string;
  public readonly requiredPermissions?: string[];

  constructor(
    message = 'Access forbidden',
    options: {
      userId?: string;
      requiredRole?: string;
      currentRole?: string;
      requiredPermissions?: string[];
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, options.context);
    this.userId = options.userId;
    this.requiredRole = options.requiredRole;
    this.currentRole = options.currentRole;
    this.requiredPermissions = options.requiredPermissions;
  }
}

export class InsufficientPermissionsError
  extends BaseCustomError
  implements AuthorizationError
{
  public readonly name = 'AuthorizationError' as const;
  public readonly code = 'INSUFFICIENT_PERMISSIONS' as const;
  public readonly userId?: string;
  public readonly requiredRole?: string;
  public readonly currentRole?: string;
  public readonly requiredPermissions?: string[];

  constructor(
    message = 'Insufficient permissions for this operation',
    options: {
      userId?: string;
      requiredRole?: string;
      currentRole?: string;
      requiredPermissions?: string[];
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, options.context);
    this.userId = options.userId;
    this.requiredRole = options.requiredRole;
    this.currentRole = options.currentRole;
    this.requiredPermissions = options.requiredPermissions;
  }
}

export class RoleRequiredError
  extends BaseCustomError
  implements AuthorizationError
{
  public readonly name = 'AuthorizationError' as const;
  public readonly code = 'ROLE_REQUIRED' as const;
  public readonly userId?: string;
  public readonly requiredRole?: string;
  public readonly currentRole?: string;
  public readonly requiredPermissions?: string[];

  constructor(
    message = 'Required role missing for this operation',
    options: {
      userId?: string;
      requiredRole?: string;
      currentRole?: string;
      requiredPermissions?: string[];
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, options.context);
    this.userId = options.userId;
    this.requiredRole = options.requiredRole;
    this.currentRole = options.currentRole;
    this.requiredPermissions = options.requiredPermissions;
  }
}

/**
 * Validation error implementations
 */
export class InvalidInputError
  extends BaseCustomError
  implements ValidationError
{
  public readonly name = 'ValidationError' as const;
  public readonly code = 'INVALID_INPUT' as const;
  public readonly field?: string;
  public readonly expectedType?: string;
  public readonly actualValue?: unknown;
  public readonly validationRules?: string[];

  constructor(
    message = 'Invalid input provided',
    options: {
      field?: string;
      expectedType?: string;
      actualValue?: unknown;
      validationRules?: string[];
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, options.context);
    this.field = options.field;
    this.expectedType = options.expectedType;
    this.actualValue = options.actualValue;
    this.validationRules = options.validationRules;
  }
}

export class SchemaValidationError
  extends BaseCustomError
  implements ValidationError
{
  public readonly name = 'ValidationError' as const;
  public readonly code = 'SCHEMA_VALIDATION_FAILED' as const;
  public readonly field?: string;
  public readonly expectedType?: string;
  public readonly actualValue?: unknown;
  public readonly validationRules?: string[];

  constructor(
    message = 'Schema validation failed',
    options: {
      field?: string;
      expectedType?: string;
      actualValue?: unknown;
      validationRules?: string[];
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, options.context);
    this.field = options.field;
    this.expectedType = options.expectedType;
    this.actualValue = options.actualValue;
    this.validationRules = options.validationRules;
  }
}

/**
 * Security error implementations
 */
export class RateLimitExceededError
  extends BaseCustomError
  implements SecurityError
{
  public readonly name = 'SecurityError' as const;
  public readonly code = 'RATE_LIMIT_EXCEEDED' as const;
  public readonly clientIp?: string;
  public readonly userAgent?: string;
  public readonly attackType?: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

  constructor(
    message = 'Rate limit exceeded',
    options: {
      clientIp?: string;
      userAgent?: string;
      attackType?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, options.context);
    this.clientIp = options.clientIp;
    this.userAgent = options.userAgent;
    this.attackType = options.attackType;
    this.severity = options.severity ?? 'medium';
  }
}

export class SuspiciousActivityError
  extends BaseCustomError
  implements SecurityError
{
  public readonly name = 'SecurityError' as const;
  public readonly code = 'SUSPICIOUS_ACTIVITY' as const;
  public readonly clientIp?: string;
  public readonly userAgent?: string;
  public readonly attackType?: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical' = 'high';

  constructor(
    message = 'Suspicious activity detected',
    options: {
      clientIp?: string;
      userAgent?: string;
      attackType?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, options.context);
    this.clientIp = options.clientIp;
    this.userAgent = options.userAgent;
    this.attackType = options.attackType;
    this.severity = options.severity ?? 'high';
  }
}

export class AttackDetectedError
  extends BaseCustomError
  implements SecurityError
{
  public readonly name = 'SecurityError' as const;
  public readonly code = 'ATTACK_DETECTED' as const;
  public readonly clientIp?: string;
  public readonly userAgent?: string;
  public readonly attackType?: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical' = 'critical';

  constructor(
    message = 'Security attack detected',
    options: {
      clientIp?: string;
      userAgent?: string;
      attackType?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, options.context);
    this.clientIp = options.clientIp;
    this.userAgent = options.userAgent;
    this.attackType = options.attackType;
    this.severity = options.severity ?? 'critical';
  }
}

/**
 * System error implementations
 */
export class DatabaseError extends BaseCustomError implements SystemError {
  public readonly name = 'SystemError' as const;
  public readonly code = 'DATABASE_ERROR' as const;
  public readonly service?: string;
  public readonly operation?: string;
  public readonly retryable?: boolean;

  constructor(
    message = 'Database operation failed',
    options: {
      service?: string;
      operation?: string;
      retryable?: boolean;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, options.context);
    this.service = options.service;
    this.operation = options.operation;
    this.retryable = options.retryable;
  }
}

export class NetworkError extends BaseCustomError implements SystemError {
  public readonly name = 'SystemError' as const;
  public readonly code = 'NETWORK_ERROR' as const;
  public readonly service?: string;
  public readonly operation?: string;
  public readonly retryable?: boolean;

  constructor(
    message = 'Network operation failed',
    options: {
      service?: string;
      operation?: string;
      retryable?: boolean;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, options.context);
    this.service = options.service;
    this.operation = options.operation;
    this.retryable = options.retryable ?? true; // Network errors are generally retryable
  }
}

export class ServiceUnavailableError
  extends BaseCustomError
  implements SystemError
{
  public readonly name = 'SystemError' as const;
  public readonly code = 'SERVICE_UNAVAILABLE' as const;
  public readonly service?: string;
  public readonly operation?: string;
  public readonly retryable?: boolean;

  constructor(
    message = 'Service temporarily unavailable',
    options: {
      service?: string;
      operation?: string;
      retryable?: boolean;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, options.context);
    this.service = options.service;
    this.operation = options.operation;
    this.retryable = options.retryable ?? true;
  }
}

/**
 * HTTP error implementation
 */
export class HttpErrorImpl extends BaseCustomError implements HttpError {
  public readonly name = 'HttpError' as const;
  public readonly code: string;
  public readonly statusCode: number;
  public readonly statusText: string;
  public readonly headers?: Record<string, string>;
  public readonly body?: unknown;

  constructor(
    statusCode: number,
    statusText: string,
    message?: string,
    options: {
      headers?: Record<string, string>;
      body?: unknown;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message ?? `HTTP ${statusCode}: ${statusText}`, options.context);
    this.code = `HTTP${statusCode}`;
    this.statusCode = statusCode;
    this.statusText = statusText;
    this.headers = options.headers;
    this.body = options.body;
  }
}

/**
 * Error factory functions for common scenarios
 */
export const ErrorFactory = {
  /**
   * Create authentication errors
   */
  authentication: {
    tokenInvalid: (context?: Record<string, unknown>) =>
      new TokenInvalidError(undefined, { context }),
    tokenExpired: (context?: Record<string, unknown>) =>
      new TokenExpiredError(undefined, { context }),
    authFailed: (context?: Record<string, unknown>) =>
      new AuthenticationFailedError(undefined, { context }),
    unauthorized: (context?: Record<string, unknown>) =>
      new UnauthorizedError(undefined, { context }),
  },

  /**
   * Create authorization errors
   */
  authorization: {
    forbidden: (
      requiredRole?: string,
      currentRole?: string,
      context?: Record<string, unknown>,
    ) => new ForbiddenError(undefined, { requiredRole, currentRole, context }),
    insufficientPermissions: (
      permissions?: string[],
      context?: Record<string, unknown>,
    ) =>
      new InsufficientPermissionsError(undefined, {
        requiredPermissions: permissions,
        context,
      }),
    roleRequired: (role: string, context?: Record<string, unknown>) =>
      new RoleRequiredError(undefined, { requiredRole: role, context }),
  },

  /**
   * Create validation errors
   */
  validation: {
    invalidInput: (
      field?: string,
      expectedType?: string,
      actualValue?: unknown,
      context?: Record<string, unknown>,
    ) =>
      new InvalidInputError(undefined, {
        field,
        expectedType,
        actualValue,
        context,
      }),
    schemaValidation: (
      field?: string,
      rules?: string[],
      context?: Record<string, unknown>,
    ) =>
      new SchemaValidationError(undefined, {
        field,
        validationRules: rules,
        context,
      }),
  },

  /**
   * Create security errors
   */
  security: {
    rateLimitExceeded: (
      clientIp?: string,
      severity?: 'low' | 'medium' | 'high' | 'critical',
      context?: Record<string, unknown>,
    ) => new RateLimitExceededError(undefined, { clientIp, severity, context }),
    suspiciousActivity: (
      attackType?: string,
      clientIp?: string,
      context?: Record<string, unknown>,
    ) =>
      new SuspiciousActivityError(undefined, { attackType, clientIp, context }),
    attackDetected: (
      attackType: string,
      clientIp?: string,
      context?: Record<string, unknown>,
    ) =>
      new AttackDetectedError(undefined, {
        attackType,
        clientIp,
        severity: 'critical',
        context,
      }),
  },

  /**
   * Create system errors
   */
  system: {
    database: (
      operation?: string,
      retryable = false,
      context?: Record<string, unknown>,
    ) => new DatabaseError(undefined, { operation, retryable, context }),
    network: (service?: string, context?: Record<string, unknown>) =>
      new NetworkError(undefined, { service, retryable: true, context }),
    serviceUnavailable: (service?: string, context?: Record<string, unknown>) =>
      new ServiceUnavailableError(undefined, { service, context }),
  },

  /**
   * Create HTTP errors
   */
  http: {
    badRequest: (message?: string, context?: Record<string, unknown>) =>
      new HttpErrorImpl(400, 'Bad Request', message, { context }),
    unauthorized: (message?: string, context?: Record<string, unknown>) =>
      new HttpErrorImpl(401, 'Unauthorized', message, { context }),
    forbidden: (message?: string, context?: Record<string, unknown>) =>
      new HttpErrorImpl(403, 'Forbidden', message, { context }),
    notFound: (message?: string, context?: Record<string, unknown>) =>
      new HttpErrorImpl(404, 'Not Found', message, { context }),
    tooManyRequests: (message?: string, context?: Record<string, unknown>) =>
      new HttpErrorImpl(429, 'Too Many Requests', message, { context }),
    internalServerError: (
      message?: string,
      context?: Record<string, unknown>,
    ) => new HttpErrorImpl(500, 'Internal Server Error', message, { context }),
  },
};
