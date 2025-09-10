/**
 * Minimal exports for @bytebot/shared package
 *
 * This provides only essential types and utilities that compile successfully
 * without external dependencies. Includes commonly used exports from dependent packages.
 */

// Basic agent types
export interface AgentTask {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  priority: "low" | "medium" | "high" | "critical";
  created_at: Date;
  updated_at: Date;
}

// Security Event Types - Basic enum for security events
export enum SecurityEventType {
  _AUTHENTICATION_FAILED = "authentication_failed",
  _LOGIN_FAILED = "login_failed",
  _CORS_VIOLATION = "cors_violation",
  _INPUT_VALIDATION_FAILED = "input_validation_failed",
  _XSS_ATTEMPT = "xss_attempt",
  _SQL_INJECTION_ATTEMPT = "sql_injection_attempt",
  _RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  _UNAUTHORIZED_ACCESS = "unauthorized_access",
}

// Basic security types
export interface SecurityEvent {
  eventId: string;
  type: SecurityEventType | string;
  timestamp: Date;
  riskScore: number;
  blocked?: boolean;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  origin?: string;
}

// User roles and permissions
export enum UserRole {
  _USER = "user",
  _ADMIN = "admin",
  _MODERATOR = "moderator",
  _OPERATOR = "operator", // Additional role for operators
  _GUEST = "guest",
  _VIEWER = "viewer", // Additional role for viewers
}

export enum Permission {
  _READ = "read",
  _WRITE = "write",
  _DELETE = "delete",
  _ADMIN_PERMISSION = "admin",
  _COMPUTER_CONTROL = "computer_control", // Computer control permission
  _COMPUTER_VIEW = "computer_view", // Computer view permission
}

// JWT Payload interface
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  iat?: number;
  exp?: number;
}

// Basic validation result
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

// Sanitization options
export interface SanitizationOptions {
  stripHtml: boolean;
  normalizeWhitespace: boolean;
  removeControlChars: boolean;
  escapeSpecialChars: boolean;
}

// Control character pattern (C0 controls 0-31 and DEL 127)
const CONTROL_CHARS_REGEX = new RegExp(
  "[" +
    String.fromCharCode(0) +
    "-" +
    String.fromCharCode(31) +
    String.fromCharCode(127) +
    "]",
  "g",
);

// Default sanitization options
export const DEFAULT_SANITIZATION_OPTIONS: SanitizationOptions = {
  stripHtml: true,
  normalizeWhitespace: true,
  removeControlChars: true,
  escapeSpecialChars: true,
};

// Security event creation utility
export function createSecurityEvent(
  type: SecurityEventType,
  eventId: string,
  riskScore: number = 50,
  additionalData: Partial<SecurityEvent> = {},
): SecurityEvent {
  return {
    eventId,
    type,
    timestamp: new Date(),
    riskScore,
    blocked: false,
    ...additionalData,
  };
}

// Basic security utility functions (stubs for compatibility)
export function sanitizeInput(
  input: string,
  options: Partial<SanitizationOptions> = {},
): string {
  // Basic sanitization implementation
  const opts = { ...DEFAULT_SANITIZATION_OPTIONS, ...options };
  let sanitized = input;

  if (opts.stripHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, "");
  }

  if (opts.normalizeWhitespace) {
    sanitized = sanitized.replace(/\s+/g, " ").trim();
  }

  if (opts.removeControlChars) {
    // Remove control characters using predefined pattern
    sanitized = sanitized.replace(CONTROL_CHARS_REGEX, "");
  }

  if (opts.escapeSpecialChars) {
    sanitized = sanitized
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }

  return sanitized;
}

export function sanitizeObject(
  obj: unknown,
  options: Partial<SanitizationOptions> = {},
): unknown {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (typeof obj === "string") {
    return sanitizeInput(obj, options);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, options));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    sanitized[key] = sanitizeObject(value, options);
  }

  return sanitized;
}

export function detectXSS(input: string): boolean {
  // Basic XSS detection patterns
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\s*\(/i,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

export function detectSQLInjection(input: string): boolean {
  // Basic SQL injection detection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)|(--)|(;)|(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
    /'\s*(OR|AND)\s*'.*?'/i,
    /\b(UNION\s+(ALL\s+)?SELECT)\b/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

// Export placeholder for future functionality
export const SHARED_PACKAGE_VERSION = "0.0.1";
