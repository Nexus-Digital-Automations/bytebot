/**
 * Security Utilities Module - Bytebot Platform Security Framework
 *
 * This module provides comprehensive security utility functions for validation,
 * sanitization, authentication, and authorization across all Bytebot microservices.
 *
 * @fileoverview Enterprise-grade security utilities
 * @version 1.0.0
 * @author Bytebot Security Team
 */

import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { createHash, randomBytes, createHmac } from "crypto";
import DOMPurify from "dompurify";
import sanitizeHtml from "sanitize-html";
import { JSDOM } from "jsdom";
import {
  UserRole,
  Permission,
  JwtPayload,
  PasswordPolicy,
  SanitizationOptions,
  ValidationResult,
  ValidationError,
  SecurityEvent,
  SecurityEventType,
  SecurityErrorCode,
  RateLimitConfig,
  RateLimitPreset,
} from "../types/security.types";

// Initialize DOMPurify for server-side usage
const window = new JSDOM("").window;
const purify = DOMPurify(window as any);

// ===========================
// PASSWORD UTILITIES
// ===========================

/**
 * Default password policy configuration
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  saltRounds: 12,
};

/**
 * Hash a password using bcrypt with salt rounds
 * @param password Plain text password to hash
 * @param saltRounds Number of salt rounds (default: 12)
 * @returns Promise resolving to hashed password
 */
export async function hashPassword(
  password: string,
  saltRounds: number = 12,
): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    throw new Error(`Password hashing failed: ${error.message}`);
  }
}

/**
 * Verify a password against its hash
 * @param password Plain text password to verify
 * @param hashedPassword Stored password hash
 * @returns Promise resolving to boolean indicating match
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error(`Password verification failed: ${error.message}`);
  }
}

/**
 * Validate password against security policy
 * @param password Password to validate
 * @param policy Password policy to check against
 * @returns Validation result with errors if any
 */
export function validatePassword(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): ValidationResult {
  const errors: ValidationError[] = [];
  const timestamp = new Date();

  // Check minimum length
  if (password.length < policy.minLength) {
    errors.push({
      field: "password",
      constraint: "minLength",
      message: `Password must be at least ${policy.minLength} characters long`,
      rejectedValue: password.length,
    });
  }

  // Check uppercase requirement
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push({
      field: "password",
      constraint: "requireUppercase",
      message: "Password must contain at least one uppercase letter",
      rejectedValue: password,
    });
  }

  // Check lowercase requirement
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push({
      field: "password",
      constraint: "requireLowercase",
      message: "Password must contain at least one lowercase letter",
      rejectedValue: password,
    });
  }

  // Check numbers requirement
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push({
      field: "password",
      constraint: "requireNumbers",
      message: "Password must contain at least one number",
      rejectedValue: password,
    });
  }

  // Check special characters requirement
  if (
    policy.requireSpecialChars &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push({
      field: "password",
      constraint: "requireSpecialChars",
      message: "Password must contain at least one special character",
      rejectedValue: password,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? password : null,
    timestamp,
  };
}

/**
 * Generate a secure random password
 * @param length Password length (default: 16)
 * @param includeSymbols Whether to include special characters
 * @returns Randomly generated secure password
 */
export function generateSecurePassword(
  length: number = 16,
  includeSymbols: boolean = true,
): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  let charset = lowercase + uppercase + numbers;
  if (includeSymbols) {
    charset += symbols;
  }

  let password = "";

  // Ensure at least one character from each required set
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];

  if (includeSymbols) {
    password += symbols[Math.floor(Math.random() * symbols.length)];
  }

  // Fill remaining length with random characters
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle the password to randomize character positions
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

// ===========================
// JWT UTILITIES
// ===========================

/**
 * Generate a JWT access token
 * @param payload Token payload
 * @param secret JWT secret key
 * @param expiresIn Token expiration (default: 15m)
 * @returns Signed JWT token
 */
export function generateAccessToken(
  payload: Omit<JwtPayload, "iat" | "exp">,
  secret: string,
  expiresIn: string = "15m",
): string {
  const now = Math.floor(Date.now() / 1000);
  const expSeconds = parseExpirationToSeconds(expiresIn);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expSeconds,
  };

  return jwt.sign(fullPayload, secret, {
    algorithm: "HS256",
  });
}

/**
 * Generate a JWT refresh token
 * @param userId User identifier
 * @param sessionId Session identifier
 * @param secret JWT secret key
 * @param expiresIn Token expiration (default: 7d)
 * @returns Signed refresh token
 */
export function generateRefreshToken(
  userId: string,
  sessionId: string,
  secret: string,
  expiresIn: string = "7d",
): string {
  const payload = {
    sub: userId,
    sessionId,
    type: "refresh",
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, secret, {
    algorithm: "HS256",
  });
}

/**
 * Verify and decode a JWT token
 * @param token JWT token to verify
 * @param secret JWT secret key
 * @returns Decoded token payload
 */
export function verifyToken(token: string, secret: string): JwtPayload {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error) {
    const errorObj = error as { name?: string };
    if (errorObj.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    } else if (errorObj.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    } else {
      throw new Error("Token verification failed");
    }
  }
}

/**
 * Parse expiration string to seconds
 * @param expiration Expiration string (e.g., '15m', '1h', '7d')
 * @returns Expiration in seconds
 */
function parseExpirationToSeconds(expiration: string): number {
  const match = expiration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error("Invalid expiration format");
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 60 * 60 * 24;
    default:
      throw new Error("Invalid expiration unit");
  }
}

// ===========================
// SANITIZATION UTILITIES
// ===========================

/**
 * Default sanitization options
 */
export const DEFAULT_SANITIZATION_OPTIONS: SanitizationOptions = {
  allowHtml: false,
  stripHtml: true,
  allowedTags: ["b", "i", "em", "strong", "p", "br"],
  allowedAttributes: {
    a: ["href"],
    img: ["src", "alt"],
  },
  maxLength: 10000,
  trim: true,
};

/**
 * Sanitize user input to prevent XSS and injection attacks
 * @param input Input string to sanitize
 * @param options Sanitization options
 * @returns Sanitized input string
 */
export function sanitizeInput(
  input: string,
  options: SanitizationOptions = DEFAULT_SANITIZATION_OPTIONS,
): string {
  if (typeof input !== "string") {
    return "";
  }

  let sanitized = input;

  // Trim whitespace if requested
  if (options.trim) {
    sanitized = sanitized.trim();
  }

  // Apply length limit
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  // Handle HTML content
  if (options.stripHtml) {
    // Strip all HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, "");
  } else if (options.allowHtml) {
    // Sanitize HTML while allowing safe tags
    sanitized = sanitizeHtml(sanitized, {
      allowedTags: options.allowedTags || [],
      allowedAttributes: options.allowedAttributes || {},
      allowedSchemes: ["http", "https", "mailto"],
    });
  }

  // Remove potential script injections
  sanitized = sanitized
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/expression\s*\(/gi, "");

  // Additional security patterns for advanced threats
  sanitized = sanitized
    // Remove potential template injection
    .replace(/\{\{.*?\}\}/g, "")
    .replace(/\$\{.*?\}/g, "")
    // Remove server-side includes
    .replace(/<!--\s*#(include|exec|echo).*?-->/gi, "")
    // Remove potential XML/XXE attacks
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, "")
    // Remove data URIs that could contain malicious content
    .replace(
      /data:(?!image\/(png|jpg|jpeg|gif|svg\+xml);base64,)[^;]*;base64,[a-zA-Z0-9+/=]*/gi,
      "",
    )
    // Remove potential LDAP injection
    .replace(/[()\*\\]/g, "")
    // Remove potential command injection
    .replace(/[;&|`${}]/g, "")
    // Remove potential path traversal
    .replace(/\.{2,}[\/\\]/g, "")
    // Remove null bytes and control characters
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return sanitized;
}

/**
 * Sanitize an object recursively
 * @param obj Object to sanitize
 * @param options Sanitization options
 * @returns Sanitized object
 */
export function sanitizeObject(
  obj: any,
  options: SanitizationOptions = DEFAULT_SANITIZATION_OPTIONS,
): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return sanitizeInput(obj, options);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, options));
  }

  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeInput(key, options);
      sanitized[sanitizedKey] = sanitizeObject(value, options);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Detect potential XSS attempts in input with advanced pattern matching
 * @param input Input string to analyze
 * @returns True if potential XSS detected
 */
export function detectXSS(input: string): boolean {
  if (typeof input !== "string") {
    return false;
  }

  const xssPatterns = [
    // Basic script injection
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,

    // Protocol-based attacks
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /data:image\/svg\+xml/gi,

    // Event handlers
    /on\w+\s*=/gi,
    /on\w+\s*\(/gi,

    // Object/embed attacks
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>.*?<\/embed>/gi,
    /<applet[^>]*>.*?<\/applet>/gi,

    // CSS-based attacks
    /expression\s*\(/gi,
    /-moz-binding/gi,
    /behavior\s*:/gi,
    /<link[^>]*stylesheet.*?>/gi,
    /<style[^>]*>.*?<\/style>/gi,

    // Advanced XSS patterns
    /&#x[0-9a-f]+;/gi, // Hex entities
    /&#[0-9]+;/gi, // Decimal entities
    /\\u[0-9a-f]{4}/gi, // Unicode escapes
    /\\x[0-9a-f]{2}/gi, // Hex escapes

    // DOM-based XSS
    /document\.|window\.|eval\(|setTimeout\(|setInterval\(/gi,

    // Base64 encoded scripts
    /data:.*base64.*script/gi,

    // SVG-based XSS
    /<svg[^>]*>.*?<\/svg>/gi,
    /<use[^>]*xlink:href/gi,

    // Template injection
    /\{\{.*\}\}/gi,
    /\$\{.*\}/gi,

    // Server-side includes
    /<!--\s*#(include|exec|echo)/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Detect potential SQL injection attempts with advanced pattern matching
 * @param input Input string to analyze
 * @returns True if potential SQL injection detected
 */
export function detectSQLInjection(input: string): boolean {
  if (typeof input !== "string") {
    return false;
  }

  const sqlPatterns = [
    // Classic SQL injection patterns
    /(\bor\b|\bOR\b).+?=.+?=/gi,
    /(\band\b|\bAND\b).+?=.+?=/gi,
    /('\s*or\s*'1'\s*=\s*'1'|"\s*or\s*"1"\s*=\s*"1")/gi,

    // UNION attacks
    /union.+?select/gi,
    /union\s+all\s+select/gi,
    /(\bunion\b|\bUNION\b)[\s\/*]*?(\bselect\b|\bSELECT\b)/gi,

    // Basic SQL keywords
    /select.+?from/gi,
    /insert.+?into/gi,
    /update.+?set/gi,
    /delete.+?from/gi,
    /drop.+?table/gi,
    /truncate.+?table/gi,
    /alter.+?table/gi,
    /create.+?table/gi,

    // Stored procedures
    /exec(\s|\+)+(s|x)p\w+/gi,
    /(\bexec\b|\bEXEC\b)(\s|\()+(\bsp_|\bxp_)/gi,

    // Comment-based attacks
    /--[\s\S]*/gi,
    /\/\*[\s\S]*\*\//gi,
    /#.*$/gm,

    // Advanced SQL patterns
    /(\b'|%27)(\s)*(or|OR)(\s)*(\b'|%27)/gi,
    /(\b'|%27)(\s)*(and|AND)(\s)*(\b'|%27)/gi,
    /('|%27|")(\s)*(\||\|\||&|&&)/gi,

    // Hex/Unicode encoding attacks
    /(0x[0-9a-f]+|\\x[0-9a-f]{2})/gi,

    // Time-based attacks
    /(waitfor|delay|sleep|benchmark)\s*\(/gi,

    // Information disclosure
    /(information_schema|sysobjects|msysaccessobjects|pg_tables)/gi,
    /(version\(\)|@@version|user\(\)|current_user)/gi,

    // Blind SQL injection
    /(substring|ascii|char|ord|hex|unhex)\s*\(/gi,

    // Database-specific functions
    /(concat|load_file|into\s+outfile|dumpfile)/gi,
    /(xp_cmdshell|sp_configure|openrowset|opendatasource)/gi,

    // Boolean-based attacks
    /(\btrue\b|\bfalse\b)\s*(and|or|\||&)/gi,

    // Stacked queries
    /;\s*(select|insert|update|delete|drop|create|alter)/gi,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

// ===========================
// RBAC UTILITIES
// ===========================

/**
 * Default role-to-permissions mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.TASK_READ,
    Permission.TASK_WRITE,
    Permission.TASK_DELETE,
    Permission.COMPUTER_CONTROL,
    Permission.COMPUTER_VIEW,
    Permission.SYSTEM_ADMIN,
    Permission.USER_MANAGE,
    Permission.METRICS_VIEW,
    Permission.LOGS_VIEW,
  ],
  [UserRole.OPERATOR]: [
    Permission.TASK_READ,
    Permission.TASK_WRITE,
    Permission.COMPUTER_CONTROL,
    Permission.COMPUTER_VIEW,
    Permission.METRICS_VIEW,
  ],
  [UserRole.VIEWER]: [
    Permission.TASK_READ,
    Permission.COMPUTER_VIEW,
    Permission.METRICS_VIEW,
  ],
};

/**
 * Check if a user role has required permissions
 * @param userRole User's role
 * @param requiredPermissions Required permissions
 * @param requireAll Whether all permissions are required (default: true)
 * @returns True if user has required permissions
 */
export function hasPermission(
  userRole: UserRole,
  requiredPermissions: Permission[],
  requireAll: boolean = true,
): boolean {
  const userPermissions = ROLE_PERMISSIONS[userRole] || [];

  if (requireAll) {
    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  } else {
    return requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );
  }
}

/**
 * Check if user has required role
 * @param userRole User's current role
 * @param requiredRoles Required roles
 * @param requireAll Whether all roles are required (default: false)
 * @returns True if user has required role
 */
export function hasRole(
  userRole: UserRole,
  requiredRoles: UserRole[],
  requireAll: boolean = false,
): boolean {
  if (requireAll) {
    // This doesn't make sense for single user role, but included for completeness
    return requiredRoles.every((role) => role === userRole);
  } else {
    return requiredRoles.includes(userRole);
  }
}

// ===========================
// SECURITY EVENT UTILITIES
// ===========================

/**
 * Generate unique event ID
 * @returns Unique event identifier
 */
export function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString("hex");
  return `evt_${timestamp}_${random}`;
}

/**
 * Calculate risk score for security event
 * @param eventType Type of security event
 * @param metadata Additional event metadata
 * @returns Risk score (0-100)
 */
export function calculateRiskScore(
  eventType: SecurityEventType,
  metadata?: Record<string, any>,
): number {
  const baseScores: Record<SecurityEventType, number> = {
    [SecurityEventType.LOGIN_SUCCESS]: 0,
    [SecurityEventType.LOGIN_FAILED]: 25,
    [SecurityEventType.LOGOUT]: 0,
    [SecurityEventType.TOKEN_REFRESH]: 0,
    [SecurityEventType.ACCESS_GRANTED]: 0,
    [SecurityEventType.ACCESS_DENIED]: 30,
    [SecurityEventType.PERMISSION_ESCALATION_ATTEMPT]: 80,
    [SecurityEventType.VALIDATION_FAILED]: 20,
    [SecurityEventType.XSS_ATTEMPT_BLOCKED]: 70,
    [SecurityEventType.INJECTION_ATTEMPT_BLOCKED]: 85,
    [SecurityEventType.RATE_LIMIT_EXCEEDED]: 40,
    [SecurityEventType.SUSPICIOUS_ACTIVITY]: 60,
    [SecurityEventType.SECURITY_CONFIG_CHANGED]: 50,
    [SecurityEventType.ADMIN_ACTION]: 10,
  };

  let score = baseScores[eventType] || 50;

  // Adjust score based on metadata
  if (metadata) {
    // Repeated failures increase risk
    if (metadata.attemptCount && metadata.attemptCount > 3) {
      score += 20;
    }

    // Suspicious IP patterns
    if (metadata.suspiciousIP) {
      score += 25;
    }

    // Off-hours activity
    if (metadata.offHours) {
      score += 15;
    }

    // Multiple failed attempts from same IP
    if (metadata.failedAttemptsFromIP && metadata.failedAttemptsFromIP > 5) {
      score += 30;
    }
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Create security event object
 * @param type Event type
 * @param resource Resource accessed
 * @param method HTTP method
 * @param success Whether action succeeded
 * @param message Event message
 * @param metadata Additional metadata
 * @param userId User ID (optional)
 * @param ipAddress IP address
 * @param userAgent User agent (optional)
 * @param sessionId Session ID (optional)
 * @returns Security event object
 */
export function createSecurityEvent(
  type: SecurityEventType,
  resource: string,
  method: string,
  success: boolean,
  message: string,
  metadata?: Record<string, any>,
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
  sessionId?: string,
): SecurityEvent {
  return {
    eventId: generateEventId(),
    type,
    timestamp: new Date(),
    userId,
    ipAddress: ipAddress || "unknown",
    userAgent,
    resource,
    method,
    success,
    message,
    metadata,
    sessionId,
    riskScore: calculateRiskScore(type, metadata),
  };
}

// ===========================
// RATE LIMITING UTILITIES
// ===========================

/**
 * Default rate limiting configurations
 */
export const DEFAULT_RATE_LIMITS: Record<RateLimitPreset, RateLimitConfig> = {
  [RateLimitPreset.AUTH]: {
    max: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: "Too many authentication attempts, please try again later",
  },
  [RateLimitPreset.COMPUTER_USE]: {
    max: 100,
    windowMs: 60 * 1000, // 1 minute
    message: "Computer control rate limit exceeded",
  },
  [RateLimitPreset.TASK_OPERATIONS]: {
    max: 50,
    windowMs: 60 * 1000, // 1 minute
    message: "Task operation rate limit exceeded",
  },
  [RateLimitPreset.READ_OPERATIONS]: {
    max: 500,
    windowMs: 60 * 1000, // 1 minute
    message: "Read operation rate limit exceeded",
  },
  [RateLimitPreset.WEBSOCKET]: {
    max: 10,
    windowMs: 60 * 1000, // 1 minute
    message: "WebSocket connection rate limit exceeded",
  },
};

/**
 * Generate rate limit key for request
 * @param req Express request object
 * @param prefix Key prefix
 * @returns Rate limit key
 */
export function generateRateLimitKey(
  req: {
    ip?: string;
    connection?: { remoteAddress?: string };
    user?: { id?: string };
  },
  prefix: string = "rl",
): string {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const userId = req.user?.id || "anonymous";
  return `${prefix}:${ip}:${userId}`;
}

// ===========================
// CRYPTO UTILITIES
// ===========================

/**
 * Generate secure random string
 * @param length String length
 * @param encoding Encoding format (default: hex)
 * @returns Random string
 */
export function generateRandomString(
  length: number = 32,
  encoding: BufferEncoding = "hex",
): string {
  return randomBytes(length).toString(encoding);
}

/**
 * Generate HMAC signature
 * @param data Data to sign
 * @param secret Secret key
 * @param algorithm Hash algorithm (default: sha256)
 * @returns HMAC signature
 */
export function generateHMAC(
  data: string,
  secret: string,
  algorithm: string = "sha256",
): string {
  return createHmac(algorithm, secret).update(data).digest("hex");
}

/**
 * Verify HMAC signature
 * @param data Original data
 * @param signature Provided signature
 * @param secret Secret key
 * @param algorithm Hash algorithm (default: sha256)
 * @returns True if signature is valid
 */
export function verifyHMAC(
  data: string,
  signature: string,
  secret: string,
  algorithm: string = "sha256",
): boolean {
  const expectedSignature = generateHMAC(data, secret, algorithm);
  return signature === expectedSignature;
}

/**
 * Hash data using specified algorithm
 * @param data Data to hash
 * @param algorithm Hash algorithm (default: sha256)
 * @returns Hash digest
 */
export function hashData(data: string, algorithm: string = "sha256"): string {
  return createHash(algorithm).update(data).digest("hex");
}

// Export all utilities
/**
 * Detect malicious file uploads by checking file content patterns
 * @param content File content as string or buffer
 * @param filename Original filename
 * @returns True if malicious patterns detected
 */
export function detectMaliciousFileContent(
  content: string | Buffer,
  filename?: string,
): boolean {
  const contentStr = Buffer.isBuffer(content)
    ? content.toString("utf8")
    : content;

  // Check for executable file signatures
  const executableSignatures = [
    /^MZ/, // Windows PE

    /^\x7fELF/, // Linux ELF
    /^\xca\xfe\xba\xbe/, // Java class
    // eslint-disable-next-line no-control-regex
    /^PK\x03\x04.*\.jar$/i, // JAR files
    /^#!/, // Shell scripts
  ];

  // Check for script content in non-script files
  const scriptPatterns = [
    /<\?php/gi,
    /<script[^>]*>/gi,
    /<%[^>]*%>/gi, // ASP
    /\${.*}/gi, // Template injection
    /eval\s*\(/gi,
    /exec\s*\(/gi,
    /system\s*\(/gi,
    /passthru\s*\(/gi,
    /shell_exec\s*\(/gi,
  ];

  // Check filename for suspicious extensions
  if (filename) {
    const suspiciousExtensions = [
      ".php",
      ".asp",
      ".aspx",
      ".jsp",
      ".py",
      ".rb",
      ".pl",
      ".sh",
      ".bat",
      ".cmd",
      ".exe",
      ".scr",
      ".com",
      ".pif",
      ".jar",
      ".vbs",
      ".js",
      ".jar",
      ".war",
    ];

    const hasBlockedExtension = suspiciousExtensions.some((ext) =>
      filename.toLowerCase().endsWith(ext),
    );

    if (hasBlockedExtension) {
      return true;
    }
  }

  // Check content patterns
  if (executableSignatures.some((sig) => sig.test(contentStr))) {
    return true;
  }

  if (scriptPatterns.some((pattern) => pattern.test(contentStr))) {
    return true;
  }

  return false;
}

/**
 * Validate file path for security issues
 * @param filePath File path to validate
 * @param allowedBasePaths Allowed base directories (optional)
 * @returns ValidationResult with path safety information
 */
export function validateFilePath(
  filePath: string,
  allowedBasePaths?: string[],
): ValidationResult {
  const errors: ValidationError[] = [];
  const timestamp = new Date();

  // Check for path traversal attempts
  if (/\.{2,}[\/\\]|[\/\\]\.{2,}/.test(filePath)) {
    errors.push({
      field: "filePath",
      constraint: "pathTraversal",
      message: "Path traversal detected in file path",
      rejectedValue: filePath,
    });
  }

  // Check for absolute paths when not allowed
  if (/^[\/\\]/.test(filePath) || /^[A-Za-z]:[\/\\]/.test(filePath)) {
    errors.push({
      field: "filePath",
      constraint: "absolutePath",
      message: "Absolute paths are not allowed",
      rejectedValue: filePath,
    });
  }

  // Check for null bytes
  // eslint-disable-next-line no-control-regex
  if (/\x00/.test(filePath)) {
    errors.push({
      field: "filePath",
      constraint: "nullByte",
      message: "Null bytes detected in file path",
      rejectedValue: filePath,
    });
  }

  // Check against allowed base paths if provided
  if (allowedBasePaths && allowedBasePaths.length > 0) {
    const normalizedPath = filePath.replace(/[\/\\]+/g, "/").toLowerCase();
    const isAllowed = allowedBasePaths.some((basePath) => {
      const normalizedBase = basePath.replace(/[\/\\]+/g, "/").toLowerCase();
      return normalizedPath.startsWith(normalizedBase);
    });

    if (!isAllowed) {
      errors.push({
        field: "filePath",
        constraint: "unauthorizedPath",
        message: "File path is not within allowed directories",
        rejectedValue: filePath,
      });
    }
  }

  const sanitizedPath = filePath
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, "") // Remove control characters
    .replace(/\.{3,}/g, "..") // Normalize multiple dots
    .replace(/[\/\\]{2,}/g, "/") // Normalize path separators
    .trim();

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedPath : null,
    timestamp,
  };
}

/**
 * Validate screen coordinates for computer-use actions
 * @param x X coordinate
 * @param y Y coordinate
 * @param screenBounds Optional screen bounds for validation
 * @returns ValidationResult with coordinate safety information
 */
export function validateCoordinates(
  x: number,
  y: number,
  screenBounds?: { width: number; height: number },
): ValidationResult {
  const errors: ValidationError[] = [];
  const timestamp = new Date();

  // Check for valid number types
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    errors.push({
      field: "coordinates",
      constraint: "invalidNumber",
      message: "Coordinates must be finite numbers",
      rejectedValue: { x, y },
    });
  }

  // Check for negative coordinates
  if (x < 0 || y < 0) {
    errors.push({
      field: "coordinates",
      constraint: "negativeCoordinates",
      message: "Coordinates cannot be negative",
      rejectedValue: { x, y },
    });
  }

  // Check against screen bounds if provided
  if (screenBounds) {
    if (x > screenBounds.width || y > screenBounds.height) {
      errors.push({
        field: "coordinates",
        constraint: "outOfBounds",
        message: "Coordinates exceed screen boundaries",
        rejectedValue: { x, y },
      });
    }
  }

  // Check for suspiciously large values (potential overflow attacks)
  const MAX_REASONABLE_COORDINATE = 65535; // Common max screen resolution
  if (x > MAX_REASONABLE_COORDINATE || y > MAX_REASONABLE_COORDINATE) {
    errors.push({
      field: "coordinates",
      constraint: "suspiciouslyLarge",
      message: "Coordinates are suspiciously large",
      rejectedValue: { x, y },
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData:
      errors.length === 0 ? { x: Math.round(x), y: Math.round(y) } : null,
    timestamp,
  };
}

/**
 * Enhanced XSS and content security scanning functions
 */

/**
 * Advanced DOMPurify configuration for different content types
 */
export const ENHANCED_DOMPURIFY_CONFIGS = {
  /**
   * Ultra strict configuration - strips all HTML
   */
  ULTRA_STRICT: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    SANITIZE_DOM: true,
    FORBID_TAGS: [
      "script",
      "object",
      "embed",
      "link",
      "style",
      "iframe",
      "frame",
      "frameset",
    ],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onfocus",
      "onblur",
      "onchange",
      "onsubmit",
    ],
  },

  /**
   * Strict configuration - minimal safe HTML
   */
  STRICT: {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "u", "br", "p"],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    SANITIZE_DOM: true,
    FORBID_TAGS: [
      "script",
      "object",
      "embed",
      "link",
      "style",
      "iframe",
      "frame",
      "frameset",
    ],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onfocus",
      "onblur",
      "onchange",
      "onsubmit",
    ],
  },

  /**
   * Moderate configuration - formatted text with safe attributes
   */
  MODERATE: {
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "u",
      "br",
      "p",
      "span",
      "div",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
    ],
    ALLOWED_ATTR: ["class", "id", "title"],
    KEEP_CONTENT: true,
    SANITIZE_DOM: true,
    FORBID_TAGS: [
      "script",
      "object",
      "embed",
      "link",
      "style",
      "iframe",
      "frame",
      "frameset",
    ],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onfocus",
      "onblur",
      "onchange",
      "onsubmit",
    ],
  },

  /**
   * Rich content configuration - for trusted content areas
   */
  RICH_CONTENT: {
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "u",
      "br",
      "p",
      "span",
      "div",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "blockquote",
      "pre",
      "code",
    ],
    ALLOWED_ATTR: ["class", "id", "title", "href", "src", "alt", "target"],
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    KEEP_CONTENT: true,
    SANITIZE_DOM: true,
    FORBID_TAGS: [
      "script",
      "object",
      "embed",
      "link",
      "style",
      "iframe",
      "frame",
      "frameset",
    ],
    FORBID_ATTR: [
      "onerror",
      "onload",
      "onclick",
      "onmouseover",
      "onfocus",
      "onblur",
      "onchange",
      "onsubmit",
    ],
  },
} as const;

/**
 * Enhanced XSS pattern detection with more comprehensive patterns
 */
export function detectAdvancedXSS(input: string): {
  hasXSS: boolean;
  threats: string[];
  riskScore: number;
} {
  if (typeof input !== "string") {
    return { hasXSS: false, threats: [], riskScore: 0 };
  }

  const threats: string[] = [];
  let riskScore = 0;

  const advancedXSSPatterns = [
    // Basic script injection
    {
      pattern: /<script[^>]*>.*?<\/script>/gi,
      threat: "Script Injection",
      score: 10,
    },
    {
      pattern: /<iframe[^>]*>.*?<\/iframe>/gi,
      threat: "IFrame Injection",
      score: 9,
    },

    // Protocol-based attacks
    { pattern: /javascript\s*:/gi, threat: "JavaScript Protocol", score: 9 },
    { pattern: /vbscript\s*:/gi, threat: "VBScript Protocol", score: 8 },
    {
      pattern: /data\s*:\s*text\/html/gi,
      threat: "Data HTML Protocol",
      score: 8,
    },
    {
      pattern: /data\s*:\s*image\/svg\+xml/gi,
      threat: "SVG Data Protocol",
      score: 7,
    },

    // Event handlers (comprehensive list)
    {
      pattern:
        /on(?:abort|blur|change|click|dblclick|error|focus|keydown|keypress|keyup|load|mousedown|mousemove|mouseout|mouseover|mouseup|reset|resize|select|submit|unload)\s*=/gi,
      threat: "Event Handler",
      score: 8,
    },

    // Object/embed attacks
    {
      pattern: /<object[^>]*>.*?<\/object>/gi,
      threat: "Object Injection",
      score: 8,
    },
    {
      pattern: /<embed[^>]*>.*?<\/embed>/gi,
      threat: "Embed Injection",
      score: 8,
    },
    {
      pattern: /<applet[^>]*>.*?<\/applet>/gi,
      threat: "Applet Injection",
      score: 8,
    },

    // CSS-based attacks
    { pattern: /expression\s*\(/gi, threat: "CSS Expression", score: 7 },
    { pattern: /-moz-binding\s*:/gi, threat: "Mozilla Binding", score: 7 },
    { pattern: /behavior\s*:/gi, threat: "CSS Behavior", score: 6 },
    {
      pattern: /<style[^>]*>.*?<\/style>/gi,
      threat: "Style Injection",
      score: 6,
    },

    // Advanced encoding patterns
    { pattern: /&#x[0-9a-f]+;/gi, threat: "Hex Entity Encoding", score: 5 },
    { pattern: /&#[0-9]+;/gi, threat: "Decimal Entity Encoding", score: 4 },
    { pattern: /\\u[0-9a-f]{4}/gi, threat: "Unicode Escape", score: 5 },
    { pattern: /\\x[0-9a-f]{2}/gi, threat: "Hex Escape", score: 5 },

    // DOM-based XSS
    {
      pattern: /document\.|window\.|eval\(|setTimeout\(|setInterval\(/gi,
      threat: "DOM Manipulation",
      score: 8,
    },

    // Base64 encoded scripts
    {
      pattern: /data\s*:.*base64.*(?:script|javascript)/gi,
      threat: "Base64 Script",
      score: 9,
    },

    // SVG-based XSS
    { pattern: /<svg[^>]*>.*?<\/svg>/gi, threat: "SVG Injection", score: 7 },
    { pattern: /<use[^>]*xlink:href/gi, threat: "SVG XLink", score: 6 },

    // Template injection
    { pattern: /\{\{.*?\}\}/gi, threat: "Template Injection", score: 7 },
    { pattern: /\$\{.*?\}/gi, threat: "Template Literal", score: 7 },

    // Server-side includes
    {
      pattern: /<!--\s*#(?:include|exec|echo)/gi,
      threat: "SSI Injection",
      score: 8,
    },

    // Meta refresh attacks
    { pattern: /<meta[^>]*refresh[^>]*>/gi, threat: "Meta Refresh", score: 6 },

    // Form-based attacks
    { pattern: /<form[^>]*>.*?<\/form>/gi, threat: "Form Injection", score: 5 },

    // Link-based attacks
    { pattern: /<link[^>]*>/gi, threat: "Link Injection", score: 6 },

    // Import-based attacks
    { pattern: /@import\s*["'].*?["']/gi, threat: "CSS Import", score: 6 },
  ];

  for (const { pattern, threat, score } of advancedXSSPatterns) {
    if (pattern.test(input)) {
      threats.push(threat);
      riskScore += score;
    }
  }

  return {
    hasXSS: threats.length > 0,
    threats,
    riskScore: Math.min(10, Math.floor(riskScore / 10)), // Normalize to 0-10 scale
  };
}

/**
 * Enhanced content sanitization with context-aware rules
 */
export function sanitizeContentByContext(
  input: string,
  context:
    | "task_description"
    | "message_content"
    | "search_query"
    | "file_name"
    | "config_data"
    | "user_input",
  options?: Partial<SanitizationOptions>,
): { sanitized: string; removed: string[]; riskScore: number } {
  if (typeof input !== "string") {
    return { sanitized: "", removed: [], riskScore: 0 };
  }

  const removed: string[] = [];
  let sanitized = input;

  // Detect threats first
  const xssAnalysis = detectAdvancedXSS(input);

  if (xssAnalysis.hasXSS) {
    removed.push(...xssAnalysis.threats);
  }

  // Context-specific sanitization rules
  const contextRules = {
    task_description: {
      allowHtml: false,
      stripHtml: true,
      maxLength: 10000,
      allowedTags: [],
      allowedAttributes: {},
    },
    message_content: {
      allowHtml: false,
      stripHtml: true,
      maxLength: 50000,
      allowedTags: ["b", "i", "em", "strong", "br", "p"],
      allowedAttributes: {},
    },
    search_query: {
      allowHtml: false,
      stripHtml: true,
      maxLength: 500,
      allowedTags: [],
      allowedAttributes: {},
    },
    file_name: {
      allowHtml: false,
      stripHtml: true,
      maxLength: 255,
      allowedTags: [],
      allowedAttributes: {},
    },
    config_data: {
      allowHtml: false,
      stripHtml: true,
      maxLength: 1000,
      allowedTags: [],
      allowedAttributes: {},
    },
    user_input: {
      allowHtml: false,
      stripHtml: true,
      maxLength: 5000,
      allowedTags: [],
      allowedAttributes: {},
    },
  };

  const rules = { ...contextRules[context], ...options };

  // Initialize DOMPurify if needed
  const window = new JSDOM("").window;
  const purify = DOMPurify(window as any);

  // Apply context-specific sanitization
  if (rules.stripHtml || !rules.allowHtml) {
    // Strip all HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, "");
    if (/<[^>]*>/.test(input)) {
      removed.push("HTML Tags Stripped");
    }
  } else if (rules.allowHtml) {
    // Use DOMPurify with context-specific configuration
    let config;

    switch (context) {
      case "message_content":
        config = ENHANCED_DOMPURIFY_CONFIGS.MODERATE;
        break;
      case "task_description":
        config = ENHANCED_DOMPURIFY_CONFIGS.STRICT;
        break;
      default:
        config = ENHANCED_DOMPURIFY_CONFIGS.ULTRA_STRICT;
    }

    const originalLength = sanitized.length;
    sanitized = purify.sanitize(sanitized, config);

    if (sanitized.length < originalLength) {
      removed.push("Dangerous HTML Sanitized");
    }
  }

  // Apply length limits
  if (rules.maxLength && sanitized.length > rules.maxLength) {
    sanitized = sanitized.substring(0, rules.maxLength);
    removed.push(`Content Truncated (max: ${rules.maxLength})`);
  }

  // Remove dangerous characters and patterns
  const originalSanitized = sanitized;

  sanitized = sanitized
    // Remove potential script injections
    .replace(/javascript\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/expression\s*\(/gi, "")

    // Remove potential template injections
    .replace(/\{\{.*?\}\}/g, "")
    .replace(/\$\{.*?\}/g, "")

    // Remove server-side includes
    .replace(/<!--\s*#(?:include|exec|echo).*?-->/gi, "")

    // Remove potential XML/XXE attacks
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, "")

    // Remove dangerous data URIs
    .replace(
      /data:(?!image\/(?:png|jpg|jpeg|gif|svg\+xml);base64,)[^;]*;base64,[a-zA-Z0-9+\/=]*/gi,
      "",
    )

    // Remove potential LDAP injection characters
    .replace(/[()\\*]/g, "")

    // Remove potential command injection characters
    .replace(/[;&|`${}]/g, "")

    // Remove potential path traversal
    .replace(/\.{2,}[\/\\]/g, "")

    // Remove null bytes and control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")

    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();

  if (originalSanitized !== sanitized) {
    removed.push("Dangerous Patterns Removed");
  }

  return {
    sanitized,
    removed,
    riskScore: xssAnalysis.riskScore,
  };
}

/**
 * Comprehensive file content security scanner
 */
export function scanFileContent(
  content: string | Buffer,
  fileName?: string,
  mimeType?: string,
): {
  isSafe: boolean;
  threats: string[];
  riskScore: number;
  metadata: {
    fileSize: number;
    contentType?: string;
    encoding?: string;
  };
} {
  const threats: string[] = [];
  let riskScore = 0;

  const contentStr = Buffer.isBuffer(content)
    ? content.toString("utf8")
    : content;
  const fileSize = Buffer.isBuffer(content)
    ? content.length
    : Buffer.byteLength(contentStr, "utf8");

  // File size limits (10MB max)
  if (fileSize > 10 * 1024 * 1024) {
    threats.push("File Too Large");
    riskScore += 8;
  }

  // Check file extension safety
  if (fileName) {
    const dangerousExtensions = [
      ".exe",
      ".bat",
      ".cmd",
      ".com",
      ".pif",
      ".scr",
      ".vbs",
      ".vbe",
      ".js",
      ".jse",
      ".ws",
      ".wsf",
      ".wsc",
      ".wsh",
      ".ps1",
      ".ps1xml",
      ".ps2",
      ".ps2xml",
      ".psc1",
      ".psc2",
      ".msh",
      ".msh1",
      ".msh2",
      ".mshxml",
      ".msh1xml",
      ".msh2xml",
      ".scf",
      ".lnk",
      ".inf",
      ".reg",
      ".doc",
      ".xls",
      ".ppt",
      ".docm",
      ".xlsm",
      ".pptm",
      ".jar",
      ".class",
      ".war",
      ".ear",
      ".php",
      ".asp",
      ".aspx",
      ".jsp",
      ".py",
      ".rb",
      ".pl",
      ".sh",
      ".bash",
      ".zsh",
      ".fish",
    ];

    const fileExt = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
    if (dangerousExtensions.includes(fileExt)) {
      threats.push(`Dangerous File Extension: ${fileExt}`);
      riskScore += 9;
    }
  }

  // Check for executable signatures
  const executableSignatures = [
    { pattern: /^MZ/, name: "Windows PE Executable", risk: 10 },
    { pattern: /^\x7fELF/, name: "Linux ELF Executable", risk: 10 },
    { pattern: /^\xca\xfe\xba\xbe/, name: "Java Class File", risk: 8 },
    { pattern: /^PK\x03\x04.*\.jar$/i, name: "JAR Archive", risk: 7 },
    { pattern: /^#!/, name: "Shell Script", risk: 8 },
    { pattern: /^\xff\xfb/, name: "MP3 with potential payload", risk: 3 },
    { pattern: /^\x89PNG/, name: "PNG with potential payload", risk: 2 },
  ];

  for (const { pattern, name, risk } of executableSignatures) {
    if (pattern.test(contentStr)) {
      threats.push(name);
      riskScore += risk;
    }
  }

  // Check for script content patterns
  const scriptPatterns = [
    { pattern: /<\?php/gi, name: "PHP Code", risk: 9 },
    { pattern: /<script[^>]*>/gi, name: "JavaScript Code", risk: 8 },
    { pattern: /<%[^>]*%>/gi, name: "ASP Code", risk: 8 },
    { pattern: /\${.*}/gi, name: "Template Injection", risk: 7 },
    { pattern: /eval\s*\(/gi, name: "Eval Function", risk: 9 },
    { pattern: /exec\s*\(/gi, name: "Exec Function", risk: 9 },
    { pattern: /system\s*\(/gi, name: "System Function", risk: 9 },
    { pattern: /passthru\s*\(/gi, name: "Passthru Function", risk: 9 },
    { pattern: /shell_exec\s*\(/gi, name: "Shell Exec Function", risk: 9 },
    { pattern: /base64_decode\s*\(/gi, name: "Base64 Decode", risk: 6 },
    { pattern: /document\.cookie/gi, name: "Cookie Access", risk: 5 },
    { pattern: /window\.location/gi, name: "Location Manipulation", risk: 5 },
  ];

  for (const { pattern, name, risk } of scriptPatterns) {
    if (pattern.test(contentStr)) {
      threats.push(name);
      riskScore += risk;
    }
  }

  // Check for XSS patterns in file content
  const xssAnalysis = detectAdvancedXSS(contentStr);
  if (xssAnalysis.hasXSS) {
    threats.push(...xssAnalysis.threats.map((t) => `XSS: ${t}`));
    riskScore += xssAnalysis.riskScore;
  }

  // Check for SQL injection patterns
  if (detectSQLInjection(contentStr)) {
    threats.push("SQL Injection Patterns");
    riskScore += 7;
  }

  // Check for common malware patterns
  const malwarePatterns = [
    { pattern: /CreateObject\s*\(/gi, name: "COM Object Creation", risk: 7 },
    { pattern: /WScript\.Shell/gi, name: "WScript Shell", risk: 8 },
    { pattern: /cmd\.exe/gi, name: "Command Prompt Access", risk: 7 },
    { pattern: /powershell/gi, name: "PowerShell Access", risk: 7 },
    { pattern: /wget|curl/gi, name: "Network Download Tools", risk: 6 },
    { pattern: /nc\s|netcat/gi, name: "Network Tools", risk: 6 },
  ];

  for (const { pattern, name, risk } of malwarePatterns) {
    if (pattern.test(contentStr)) {
      threats.push(name);
      riskScore += risk;
    }
  }

  return {
    isSafe: threats.length === 0,
    threats,
    riskScore: Math.min(10, Math.floor(riskScore / 10)),
    metadata: {
      fileSize,
      contentType: mimeType,
      encoding: Buffer.isBuffer(content) ? "binary" : "utf8",
    },
  };
}

/**
 * Content Security Policy (CSP) generator for different contexts
 */
export function generateCSPHeader(context: "api" | "ui" | "admin"): string {
  const baseCSP = {
    "default-src": "'self'",
    "script-src": "'self'",
    "style-src": "'self' 'unsafe-inline'",
    "img-src": "'self' data: https:",
    "font-src": "'self'",
    "connect-src": "'self'",
    "frame-src": "'none'",
    "object-src": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "frame-ancestors": "'none'",
    "block-all-mixed-content": "",
    "upgrade-insecure-requests": "",
  };

  const contextCSP = {
    api: {
      ...baseCSP,
      "script-src": "'none'",
      "style-src": "'none'",
      "img-src": "'none'",
    },
    ui: {
      ...baseCSP,
      "script-src": "'self' 'unsafe-eval'",
      "style-src": "'self' 'unsafe-inline'",
      "img-src": "'self' data: https:",
    },
    admin: {
      ...baseCSP,
      "script-src": "'self' 'nonce-{nonce}'",
      "style-src": "'self' 'nonce-{nonce}'",
      "img-src": "'self' data:",
    },
  };

  const csp = contextCSP[context];
  return Object.entries(csp)
    .map(([directive, sources]) => `${directive} ${sources}`)
    .join("; ");
}

export default {
  // Password utilities
  hashPassword,
  verifyPassword,
  validatePassword,
  generateSecurePassword,
  DEFAULT_PASSWORD_POLICY,

  // JWT utilities
  generateAccessToken,
  generateRefreshToken,
  verifyToken,

  // Sanitization utilities
  sanitizeInput,
  sanitizeObject,
  detectXSS,
  detectSQLInjection,
  DEFAULT_SANITIZATION_OPTIONS,

  // Enhanced security utilities
  detectAdvancedXSS,
  sanitizeContentByContext,
  scanFileContent,
  generateCSPHeader,
  ENHANCED_DOMPURIFY_CONFIGS,

  // RBAC utilities
  hasPermission,
  hasRole,
  ROLE_PERMISSIONS,

  // Security event utilities
  generateEventId,
  calculateRiskScore,
  createSecurityEvent,

  // Rate limiting utilities
  DEFAULT_RATE_LIMITS,
  generateRateLimitKey,

  // Crypto utilities
  generateRandomString,
  generateHMAC,
  verifyHMAC,
  hashData,

  // Advanced validation utilities
  detectMaliciousFileContent,
  validateFilePath,
  validateCoordinates,
};
