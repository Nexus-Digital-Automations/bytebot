/**
 * Security Types Module - Bytebot Platform Security Framework
 *
 * This module defines comprehensive security types for authentication, authorization,
 * validation, and security event tracking across all Bytebot microservices.
 *
 * @fileoverview Enterprise-grade security type definitions
 * @version 1.0.0
 * @author Bytebot Security Team
 */

import {
  IsEmail,
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  IsBoolean,
  IsNumber,
  IsDate,
  IsArray,
} from "class-validator";

// ===========================
// SECURITY EVENT TYPES
// ===========================

/**
 * Security event types for comprehensive security monitoring
 */
export enum SecurityEventType {
  AUTHENTICATION_FAILED = "authentication_failed",
  ACCESS_DENIED = "access_denied",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
  SECURITY_CONFIG_CHANGED = "security_config_changed",
  DATA_ACCESS_VIOLATION = "data_access_violation",
}

/**
 * Security event interface
 */
export interface SecurityEvent {
  eventId: string;
  type: SecurityEventType;
  timestamp: Date;
  riskScore: number;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint: string;
  method: string;
  success: boolean;
  message?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a security event with standardized structure
 */
export function createSecurityEvent(
  type: SecurityEventType,
  endpoint: string,
  method: string,
  success: boolean,
  message?: string,
  metadata?: Record<string, any>,
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
): SecurityEvent {
  return {
    eventId: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: new Date(),
    riskScore: calculateRiskScore(type, success),
    userId,
    ipAddress,
    userAgent,
    endpoint,
    method,
    success,
    message,
    metadata,
  };
}

/**
 * Calculate risk score for security events
 */
function calculateRiskScore(type: SecurityEventType, success: boolean): number {
  const baseScores = {
    [SecurityEventType.AUTHENTICATION_FAILED]: 60,
    [SecurityEventType.ACCESS_DENIED]: 40,
    [SecurityEventType.SUSPICIOUS_ACTIVITY]: 80,
    [SecurityEventType.SECURITY_CONFIG_CHANGED]: 30,
    [SecurityEventType.DATA_ACCESS_VIOLATION]: 90,
  };

  let score = baseScores[type] || 50;

  // Increase risk for failed events
  if (!success) {
    score += 20;
  }

  return Math.min(100, score);
}

/**
 * Sanitization options for input validation
 */
export interface SanitizationOptions {
  stripHtml: boolean;
  normalizeWhitespace: boolean;
  maxLength?: number;
  allowedCharsets?: string[];
  removeControlChars: boolean;
  escapeSpecialChars: boolean;
}

/**
 * Default sanitization options
 */
export const DEFAULT_SANITIZATION_OPTIONS: SanitizationOptions = {
  stripHtml: true,
  normalizeWhitespace: true,
  maxLength: 10000,
  allowedCharsets: ["utf8"],
  removeControlChars: true,
  escapeSpecialChars: true,
};

// ===========================
// AUTHENTICATION TYPES
// ===========================

/**
 * User authentication roles with hierarchical permissions
 * - admin: Full system access including user management
 * - operator: Task creation and computer control permissions
 * - viewer: Read-only access to tasks and system status
 */
export enum UserRole {
  ADMIN = "admin",
  OPERATOR = "operator",
  VIEWER = "viewer",
}

/**
 * Fine-grained permission system for RBAC
 * Maps to specific API endpoints and operations
 */
export enum Permission {
  // Task permissions
  TASK_READ = "task:read",
  TASK_WRITE = "task:write",
  TASK_DELETE = "task:delete",

  // Computer control permissions
  COMPUTER_CONTROL = "computer:control",
  COMPUTER_VIEW = "computer:view",

  // System administration
  SYSTEM_ADMIN = "system:admin",
  USER_MANAGE = "user:manage",

  // Monitoring and metrics
  METRICS_VIEW = "metrics:view",
  LOGS_VIEW = "logs:view",
}

/**
 * JWT token payload structure with security metadata
 */
export interface JwtPayload {
  /** Unique user identifier */
  sub: string;

  /** User email address */
  email: string;

  /** Assigned user role */
  role: UserRole;

  /** Array of specific permissions */
  permissions: Permission[];

  /** Token issued timestamp */
  iat: number;

  /** Token expiration timestamp */
  exp: number;

  /** Token issuer */
  iss: string;

  /** Session identifier for tracking */
  sessionId: string;

  /** IP address for security validation */
  ipAddress?: string;
}

/**
 * User registration/login DTO with validation
 */
export class AuthCredentialsDto {
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;

  @IsString({ message: "Password must be a string" })
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password: string;
}

/**
 * User registration DTO with additional fields
 */
export class RegisterUserDto extends AuthCredentialsDto {
  @IsString({ message: "First name must be a string" })
  firstName: string;

  @IsString({ message: "Last name must be a string" })
  lastName: string;

  @IsEnum(UserRole, { message: "Role must be admin, operator, or viewer" })
  role: UserRole;
}

/**
 * JWT token response structure
 */
export interface AuthTokenResponse {
  /** Access token (short-lived) */
  accessToken: string;

  /** Refresh token (long-lived) */
  refreshToken: string;

  /** Token type (always 'Bearer') */
  tokenType: "Bearer";

  /** Access token expiration in seconds */
  expiresIn: number;

  /** User information */
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    permissions: Permission[];
  };
}

// ===========================
// VALIDATION TYPES
// ===========================

/**
 * Input validation error details
 */
export interface ValidationError {
  /** Field that failed validation */
  field: string;

  /** Validation constraint that was violated */
  constraint: string;

  /** Human-readable error message */
  message: string;

  /** Invalid value that was provided */
  rejectedValue: any;
}

/**
 * Comprehensive validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;

  /** Array of validation errors if any */
  errors: ValidationError[];

  /** Sanitized/transformed data */
  sanitizedData?: any;

  /** Validation timestamp */
  timestamp: Date;
}

/**
 * Request sanitization options
 */
export interface SanitizationOptions {
  /** Allow HTML content (sanitized) */
  allowHtml: boolean;

  /** Strip HTML tags completely */
  stripHtml: boolean;

  /** Allowed HTML tags if HTML is allowed */
  allowedTags?: string[];

  /** Allowed HTML attributes */
  allowedAttributes?: Record<string, string[]>;

  /** Maximum string length */
  maxLength?: number;

  /** Trim whitespace */
  trim: boolean;
}

// ===========================
// RATE LIMITING TYPES
// ===========================

/**
 * Rate limiting configuration per endpoint
 */
export interface RateLimitConfig {
  /** Maximum number of requests */
  max: number;

  /** Time window in milliseconds */
  windowMs: number;

  /** Message when rate limit exceeded */
  message: string;

  /** Custom skip function */
  skip?: (req: any) => boolean;

  /** Key generator for rate limiting */
  keyGenerator?: (req: any) => string;
}

/**
 * Rate limiting presets for different endpoint types
 */
export enum RateLimitPreset {
  /** Authentication endpoints (strict) */
  AUTH = "auth",

  /** Computer control operations (moderate) */
  COMPUTER_USE = "computer-use",

  /** Task operations (moderate) */
  TASK_OPERATIONS = "task-operations",

  /** Read operations (lenient) */
  READ_OPERATIONS = "read-operations",

  /** WebSocket connections (strict) */
  WEBSOCKET = "websocket",
}

// ===========================
// SECURITY EVENT TYPES
// ===========================

/**
 * Security event categories for audit logging
 */
export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = "auth.login.success",
  LOGIN_FAILED = "auth.login.failed",
  LOGOUT = "auth.logout",
  TOKEN_REFRESH = "auth.token.refresh",

  // Authorization events
  ACCESS_GRANTED = "authz.access.granted",
  ACCESS_DENIED = "authz.access.denied",
  PERMISSION_ESCALATION_ATTEMPT = "authz.escalation.attempt",

  // Validation events
  VALIDATION_FAILED = "validation.failed",
  XSS_ATTEMPT_BLOCKED = "validation.xss.blocked",
  INJECTION_ATTEMPT_BLOCKED = "validation.injection.blocked",

  // Rate limiting events
  RATE_LIMIT_EXCEEDED = "rate_limit.exceeded",
  SUSPICIOUS_ACTIVITY = "security.suspicious.activity",

  // System events
  SECURITY_CONFIG_CHANGED = "security.config.changed",
  ADMIN_ACTION = "security.admin.action",
}

/**
 * Security event details for audit logging
 */
export interface SecurityEvent {
  /** Unique event identifier */
  eventId: string;

  /** Event type from enum */
  type: SecurityEventType;

  /** Event timestamp */
  timestamp: Date;

  /** User ID associated with event */
  userId?: string;

  /** Source IP address */
  ipAddress: string;

  /** User agent string */
  userAgent?: string;

  /** API endpoint or resource accessed */
  resource: string;

  /** HTTP method */
  method: string;

  /** Whether the action succeeded */
  success: boolean;

  /** Detailed event message */
  message: string;

  /** Additional event metadata */
  metadata?: Record<string, any>;

  /** Session identifier */
  sessionId?: string;

  /** Risk score (0-100) */
  riskScore?: number;
}

// ===========================
// SECURITY CONFIGURATION
// ===========================

/**
 * JWT configuration settings
 */
export interface JwtConfig {
  /** Secret key for token signing */
  secret: string;

  /** Access token expiration (default: 15m) */
  accessTokenExpiry: string;

  /** Refresh token expiration (default: 7d) */
  refreshTokenExpiry: string;

  /** Token issuer */
  issuer: string;

  /** Token audience */
  audience: string;

  /** Algorithm for signing (default: HS256) */
  algorithm: string;
}

/**
 * Password security requirements
 */
export interface PasswordPolicy {
  /** Minimum password length */
  minLength: number;

  /** Require uppercase characters */
  requireUppercase: boolean;

  /** Require lowercase characters */
  requireLowercase: boolean;

  /** Require numeric characters */
  requireNumbers: boolean;

  /** Require special characters */
  requireSpecialChars: boolean;

  /** Salt rounds for bcrypt hashing */
  saltRounds: number;
}

/**
 * Security headers configuration
 */
export interface SecurityHeadersConfig {
  /** Enable Content Security Policy */
  csp: boolean;

  /** CSP directives */
  cspDirectives?: Record<string, string[]>;

  /** Enable HSTS */
  hsts: boolean;

  /** HSTS max age in seconds */
  hstsMaxAge: number;

  /** Enable X-Frame-Options */
  frameOptions: boolean;

  /** Frame options value */
  frameOptionsValue: "DENY" | "SAMEORIGIN" | "ALLOW-FROM";

  /** Enable X-Content-Type-Options */
  noSniff: boolean;

  /** Enable X-XSS-Protection */
  xssFilter: boolean;
}

/**
 * CORS configuration
 */
export interface CorsConfig {
  /** Allowed origins */
  origins: string[];

  /** Allowed methods */
  methods: string[];

  /** Allowed headers */
  allowedHeaders: string[];

  /** Exposed headers */
  exposedHeaders: string[];

  /** Allow credentials */
  credentials: boolean;

  /** Max age for preflight requests */
  maxAge: number;
}

/**
 * Complete security configuration
 */
export interface SecurityConfig {
  /** JWT configuration */
  jwt: JwtConfig;

  /** Password policy */
  passwordPolicy: PasswordPolicy;

  /** Rate limiting settings */
  rateLimiting: Record<RateLimitPreset, RateLimitConfig>;

  /** Security headers */
  headers: SecurityHeadersConfig;

  /** CORS settings */
  cors: CorsConfig;

  /** Request sanitization defaults */
  sanitization: SanitizationOptions;

  /** Enable security event logging */
  auditLogging: boolean;

  /** Session timeout in minutes */
  sessionTimeout: number;

  /** Maximum concurrent sessions per user */
  maxSessionsPerUser: number;
}

// ===========================
// API VERSIONING TYPES
// ===========================

/**
 * API version information
 */
export interface ApiVersion {
  /** Version number (e.g., "1.0", "2.1") */
  version: string;

  /** Version release date */
  releaseDate: Date;

  /** Whether this version is deprecated */
  deprecated: boolean;

  /** Deprecation date if applicable */
  deprecationDate?: Date;

  /** End of life date */
  endOfLifeDate?: Date;

  /** Breaking changes in this version */
  breakingChanges: string[];

  /** New features in this version */
  features: string[];
}

/**
 * API versioning strategy enum
 */
export enum VersioningStrategy {
  /** Version in URL path (/api/v1/) */
  URI = "uri",

  /** Version in custom header */
  HEADER = "header",

  /** Version in query parameter */
  QUERY = "query",

  /** Version in Accept header */
  MEDIA_TYPE = "media-type",
}

// ===========================
// SECURITY DECORATORS DATA
// ===========================

/**
 * Role-based access control decorator metadata
 */
export interface RoleMetadata {
  /** Required roles */
  roles: UserRole[];

  /** Whether all roles are required (AND) or any (OR) */
  requireAll: boolean;
}

/**
 * Permission-based access control decorator metadata
 */
export interface PermissionMetadata {
  /** Required permissions */
  permissions: Permission[];

  /** Whether all permissions are required (AND) or any (OR) */
  requireAll: boolean;
}

/**
 * Rate limiting decorator metadata
 */
export interface ThrottleMetadata {
  /** Rate limit preset or custom config */
  config: RateLimitPreset | RateLimitConfig;

  /** Override global rate limiting */
  override: boolean;
}

// ===========================
// ERROR TYPES
// ===========================

/**
 * Security-related error types
 */
export enum SecurityErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS",
  TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED",
  TOKEN_INVALID = "AUTH_TOKEN_INVALID",
  TOKEN_MALFORMED = "AUTH_TOKEN_MALFORMED",

  // Authorization errors
  INSUFFICIENT_PERMISSIONS = "AUTHZ_INSUFFICIENT_PERMISSIONS",
  ROLE_REQUIRED = "AUTHZ_ROLE_REQUIRED",
  ACCESS_DENIED = "AUTHZ_ACCESS_DENIED",

  // Validation errors
  VALIDATION_FAILED = "VALIDATION_FAILED",
  XSS_DETECTED = "VALIDATION_XSS_DETECTED",
  INJECTION_DETECTED = "VALIDATION_INJECTION_DETECTED",
  REQUEST_TOO_LARGE = "VALIDATION_REQUEST_TOO_LARGE",

  // Rate limiting errors
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  TOO_MANY_REQUESTS = "RATE_LIMIT_TOO_MANY_REQUESTS",

  // System errors
  SECURITY_CONFIG_ERROR = "SECURITY_CONFIG_ERROR",
  INTERNAL_SECURITY_ERROR = "SECURITY_INTERNAL_ERROR",
}

/**
 * Structured security error response
 */
export interface SecurityError {
  /** Error code from enum */
  code: SecurityErrorCode;

  /** Human-readable error message */
  message: string;

  /** Detailed error description */
  details?: string;

  /** Timestamp when error occurred */
  timestamp: Date;

  /** Request path that caused error */
  path: string;

  /** Error correlation ID for tracking */
  correlationId: string;

  /** Additional error metadata */
  metadata?: Record<string, any>;
}

// ===========================
// EXPORT ALL TYPES
// ===========================

export default {
  UserRole,
  Permission,
  SecurityEventType,
  RateLimitPreset,
  VersioningStrategy,
  SecurityErrorCode,
};
