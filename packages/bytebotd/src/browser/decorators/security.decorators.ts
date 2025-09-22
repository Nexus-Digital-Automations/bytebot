/**
 * Browser Automation Security Decorators
 *
 * Provides security decorators for browser automation endpoints including
 * authentication validation, role-based access control, rate limiting,
 * and security logging.
 *
 * Features:
 * - Authentication requirement decorators
 * - Role-based access control
 * - Permission-based authorization
 * - Rate limiting decorators
 * - Security logging and monitoring
 * - Request validation decorators
 * - Session security enforcement
 *
 * @author API Security Specialist
 * @version 1.0.0
 * @since Browser Automation Security Implementation
 */

import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiResponse } from '@nestjs/swagger';
import { UserRole, Permission } from '@bytebot/shared';

/**
 * Security levels for browser automation operations
 */
export enum BrowserSecurityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Browser operation risk levels
 */
export enum BrowserRiskLevel {
  SAFE = 'safe',
  MODERATE = 'moderate',
  ELEVATED = 'elevated',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Rate limiting configurations
 */
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Security validation requirements
 */
export interface SecurityValidationConfig {
  validateInput?: boolean;
  validateUrls?: boolean;
  validateSelectors?: boolean;
  validateSession?: boolean;
  logSecurityEvents?: boolean;
  requireParentValidation?: boolean;
}

// ===== METADATA KEYS =====

export const BROWSER_AUTH_REQUIRED_KEY = 'browser_auth_required';
export const BROWSER_ROLES_KEY = 'browser_roles';
export const BROWSER_PERMISSIONS_KEY = 'browser_permissions';
export const BROWSER_SECURITY_LEVEL_KEY = 'browser_security_level';
export const BROWSER_RISK_LEVEL_KEY = 'browser_risk_level';
export const BROWSER_RATE_LIMIT_KEY = 'browser_rate_limit';
export const BROWSER_VALIDATION_KEY = 'browser_validation';
export const BROWSER_PUBLIC_KEY = 'browser_public';
export const BROWSER_SESSION_REQUIRED_KEY = 'browser_session_required';
export const BROWSER_AUDIT_LOG_KEY = 'browser_audit_log';

// ===== AUTHENTICATION DECORATORS =====

/**
 * Require authentication for browser automation endpoint
 */
export const BrowserAuth = () => {
  return applyDecorators(
    SetMetadata(BROWSER_AUTH_REQUIRED_KEY, true),
    ApiBearerAuth(),
    ApiResponse({
      status: 401,
      description:
        'Unauthorized - Authentication required for browser automation',
    }),
    ApiResponse({
      status: 403,
      description:
        'Forbidden - Insufficient permissions for browser automation',
    }),
  );
};

/**
 * Mark endpoint as public (no authentication required)
 */
export const BrowserPublic = () => {
  return SetMetadata(BROWSER_PUBLIC_KEY, true);
};

/**
 * Require specific roles for browser automation
 */
export const BrowserRoles = (...roles: UserRole[]) => {
  return applyDecorators(
    SetMetadata(BROWSER_ROLES_KEY, roles),
    BrowserAuth(),
    ApiResponse({
      status: 403,
      description: `Forbidden - Requires one of roles: ${roles.join(', ')}`,
    }),
  );
};

/**
 * Require specific permissions for browser automation
 */
export const BrowserPermissions = (...permissions: Permission[]) => {
  return applyDecorators(
    SetMetadata(BROWSER_PERMISSIONS_KEY, permissions),
    BrowserAuth(),
    ApiResponse({
      status: 403,
      description: `Forbidden - Requires permissions: ${permissions.join(', ')}`,
    }),
  );
};

// ===== SECURITY LEVEL DECORATORS =====

/**
 * Set security level for browser automation endpoint
 */
export const SetBrowserSecurityLevel = (level: BrowserSecurityLevel) => {
  return applyDecorators(
    SetMetadata(BROWSER_SECURITY_LEVEL_KEY, level),
    BrowserAuth(),
    ApiSecurity('browser-automation-security'),
  );
};

/**
 * Set risk level for browser automation operation
 */
export const SetBrowserRiskLevel = (level: BrowserRiskLevel) => {
  return applyDecorators(
    SetMetadata(BROWSER_RISK_LEVEL_KEY, level),
    BrowserAuth(),
  );
};

/**
 * Mark endpoint as requiring session validation
 */
export const BrowserSessionRequired = () => {
  return applyDecorators(
    SetMetadata(BROWSER_SESSION_REQUIRED_KEY, true),
    BrowserAuth(),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Valid browser session required',
    }),
  );
};

// ===== RATE LIMITING DECORATORS =====

/**
 * Apply rate limiting to browser automation endpoint
 */
export const BrowserRateLimit = (config: RateLimitConfig) => {
  return applyDecorators(
    SetMetadata(BROWSER_RATE_LIMIT_KEY, config),
    ApiResponse({
      status: 429,
      description: 'Too Many Requests - Rate limit exceeded',
      headers: {
        'X-RateLimit-Limit': {
          description: 'Request limit per window',
          schema: { type: 'integer' },
        },
        'X-RateLimit-Remaining': {
          description: 'Remaining requests in current window',
          schema: { type: 'integer' },
        },
        'X-RateLimit-Reset': {
          description: 'Time when rate limit resets',
          schema: { type: 'integer' },
        },
      },
    }),
  );
};

/**
 * Apply standard rate limiting for browser tasks
 */
export const BrowserTaskRateLimit = () => {
  return BrowserRateLimit({
    windowMs: 60000, // 1 minute
    max: 10, // 10 tasks per minute
    message: 'Too many browser tasks created',
  });
};

/**
 * Apply standard rate limiting for browser sessions
 */
export const BrowserSessionRateLimit = () => {
  return BrowserRateLimit({
    windowMs: 300000, // 5 minutes
    max: 5, // 5 sessions per 5 minutes
    message: 'Too many browser sessions created',
  });
};

/**
 * Apply strict rate limiting for high-risk operations
 */
export const BrowserStrictRateLimit = () => {
  return BrowserRateLimit({
    windowMs: 300000, // 5 minutes
    max: 3, // 3 requests per 5 minutes
    message: 'Rate limit exceeded for high-risk browser operation',
  });
};

// ===== VALIDATION DECORATORS =====

/**
 * Enable comprehensive input validation
 */
export const BrowserValidation = (config?: SecurityValidationConfig) => {
  const defaultConfig: SecurityValidationConfig = {
    validateInput: true,
    validateUrls: true,
    validateSelectors: true,
    validateSession: false,
    logSecurityEvents: true,
    requireParentValidation: false,
  };

  return applyDecorators(
    SetMetadata(BROWSER_VALIDATION_KEY, { ...defaultConfig, ...config }),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Input validation failed',
    }),
    ApiResponse({
      status: 422,
      description: 'Unprocessable Entity - Validation processing failed',
    }),
  );
};

/**
 * Enable strict validation for sensitive operations
 */
export const BrowserStrictValidation = () => {
  return BrowserValidation({
    validateInput: true,
    validateUrls: true,
    validateSelectors: true,
    validateSession: true,
    logSecurityEvents: true,
    requireParentValidation: true,
  });
};

// ===== AUDIT LOGGING DECORATORS =====

/**
 * Enable security audit logging
 */
export const BrowserAuditLog = (options?: {
  logLevel?: 'info' | 'warn' | 'error';
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  sensitiveFields?: string[];
}) => {
  const defaultOptions = {
    logLevel: 'info' as const,
    includeRequestBody: true,
    includeResponseBody: false,
    sensitiveFields: ['password', 'token', 'secret', 'key'],
  };

  return SetMetadata(BROWSER_AUDIT_LOG_KEY, { ...defaultOptions, ...options });
};

// ===== COMBINED SECURITY DECORATORS =====

/**
 * Apply basic security for browser automation endpoints
 */
export const BrowserBasicSecurity = () => {
  return applyDecorators(
    BrowserAuth(),
    SetBrowserSecurityLevel(BrowserSecurityLevel.LOW),
    SetBrowserRiskLevel(BrowserRiskLevel.SAFE),
    BrowserValidation(),
    BrowserAuditLog(),
  );
};

/**
 * Apply enhanced security for sensitive browser operations
 */
export const BrowserEnhancedSecurity = () => {
  return applyDecorators(
    BrowserAuth(),
    BrowserRoles(UserRole._ADMIN, UserRole._OPERATOR),
    SetBrowserSecurityLevel(BrowserSecurityLevel.MEDIUM),
    SetBrowserRiskLevel(BrowserRiskLevel.MODERATE),
    BrowserValidation({
      validateInput: true,
      validateUrls: true,
      validateSelectors: true,
      validateSession: true,
      logSecurityEvents: true,
    }),
    BrowserTaskRateLimit(),
    BrowserAuditLog(),
  );
};

/**
 * Apply maximum security for critical browser operations
 */
export const BrowserMaximumSecurity = () => {
  return applyDecorators(
    BrowserAuth(),
    BrowserRoles(UserRole._ADMIN),
    BrowserPermissions(Permission._COMPUTER_CONTROL),
    SetBrowserSecurityLevel(BrowserSecurityLevel.CRITICAL),
    SetBrowserRiskLevel(BrowserRiskLevel.CRITICAL),
    BrowserStrictValidation(),
    BrowserStrictRateLimit(),
    BrowserAuditLog({
      logLevel: 'warn',
      includeRequestBody: true,
      includeResponseBody: true,
    }),
  );
};

/**
 * Apply security for browser session management
 */
export const BrowserSessionSecurity = () => {
  return applyDecorators(
    BrowserAuth(),
    SetBrowserSecurityLevel(BrowserSecurityLevel.MEDIUM),
    SetBrowserRiskLevel(BrowserRiskLevel.MODERATE),
    BrowserValidation({
      validateInput: true,
      validateUrls: true,
      validateSession: false,
      logSecurityEvents: true,
    }),
    BrowserSessionRateLimit(),
    BrowserAuditLog(),
  );
};

/**
 * Apply security for browser task execution
 */
export const BrowserTaskSecurity = () => {
  return applyDecorators(
    BrowserAuth(),
    SetBrowserSecurityLevel(BrowserSecurityLevel.MEDIUM),
    SetBrowserRiskLevel(BrowserRiskLevel.ELEVATED),
    BrowserStrictValidation(),
    BrowserTaskRateLimit(),
    BrowserAuditLog({
      includeRequestBody: true,
      sensitiveFields: ['password', 'token', 'secret', 'key', 'credential'],
    }),
  );
};

/**
 * Apply security for data extraction operations
 */
export const BrowserExtractionSecurity = () => {
  return applyDecorators(
    BrowserAuth(),
    SetBrowserSecurityLevel(BrowserSecurityLevel.HIGH),
    SetBrowserRiskLevel(BrowserRiskLevel.HIGH),
    BrowserValidation({
      validateInput: true,
      validateUrls: true,
      validateSelectors: true,
      validateSession: true,
      logSecurityEvents: true,
      requireParentValidation: true,
    }),
    BrowserRateLimit({
      windowMs: 600000, // 10 minutes
      max: 20, // 20 extractions per 10 minutes
      message: 'Rate limit exceeded for data extraction operations',
    }),
    BrowserAuditLog({
      logLevel: 'warn',
      includeRequestBody: true,
      includeResponseBody: true,
      sensitiveFields: [
        'password',
        'token',
        'secret',
        'key',
        'credential',
        'ssn',
        'social',
      ],
    }),
  );
};

/**
 * Apply security for administrative browser operations
 */
export const BrowserAdminSecurity = () => {
  return applyDecorators(
    BrowserMaximumSecurity(),
    BrowserPermissions(
      Permission._COMPUTER_CONTROL,
      Permission._WRITE,
    ),
    ApiResponse({
      status: 403,
      description: 'Forbidden - Administrator privileges required',
    }),
  );
};

// ===== UTILITY DECORATORS =====

/**
 * Mark endpoint for development/testing only
 */
export const BrowserDevelopmentOnly = () => {
  return applyDecorators(
    BrowserAuth(),
    BrowserRoles(UserRole._ADMIN),
    SetMetadata('development_only', true),
    ApiResponse({
      status: 503,
      description:
        'Service Unavailable - Development endpoint not available in production',
    }),
  );
};

/**
 * Apply security for file upload operations
 */
export const BrowserFileUploadSecurity = () => {
  return applyDecorators(
    BrowserAuth(),
    SetBrowserSecurityLevel(BrowserSecurityLevel.HIGH),
    SetBrowserRiskLevel(BrowserRiskLevel.HIGH),
    BrowserValidation({
      validateInput: true,
      logSecurityEvents: true,
      requireParentValidation: true,
    }),
    BrowserRateLimit({
      windowMs: 300000, // 5 minutes
      max: 5, // 5 uploads per 5 minutes
      message: 'Rate limit exceeded for file upload operations',
    }),
    BrowserAuditLog({
      logLevel: 'warn',
      includeRequestBody: false, // Don't log file contents
      includeResponseBody: false,
    }),
  );
};

/**
 * Apply security for screenshot operations
 */
export const BrowserScreenshotSecurity = () => {
  return applyDecorators(
    BrowserAuth(),
    SetBrowserSecurityLevel(BrowserSecurityLevel.MEDIUM),
    SetBrowserRiskLevel(BrowserRiskLevel.MODERATE),
    BrowserValidation({
      validateInput: true,
      validateSession: true,
      logSecurityEvents: true,
    }),
    BrowserRateLimit({
      windowMs: 60000, // 1 minute
      max: 30, // 30 screenshots per minute
      message: 'Rate limit exceeded for screenshot operations',
    }),
    BrowserAuditLog(),
  );
};

/**
 * Apply security for navigation operations
 */
export const BrowserNavigationSecurity = () => {
  return applyDecorators(
    BrowserAuth(),
    SetBrowserSecurityLevel(BrowserSecurityLevel.MEDIUM),
    SetBrowserRiskLevel(BrowserRiskLevel.ELEVATED),
    BrowserValidation({
      validateInput: true,
      validateUrls: true,
      validateSession: true,
      logSecurityEvents: true,
    }),
    BrowserRateLimit({
      windowMs: 60000, // 1 minute
      max: 50, // 50 navigations per minute
      message: 'Rate limit exceeded for navigation operations',
    }),
    BrowserAuditLog({
      sensitiveFields: ['password', 'token', 'secret', 'key', 'credential'],
    }),
  );
};

