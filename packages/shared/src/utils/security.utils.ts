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
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + parseExpirationToSeconds(expiresIn),
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
    if (error.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    } else if (error.name === "JsonWebTokenError") {
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
      /data:(?!image\/(png|jpg|jpeg|gif|svg\+xml);base64,)[^;]*;base64,[a-zA-Z0-9+\/=]*/gi,
      "",
    )
    // Remove potential LDAP injection
    .replace(/[()\*\\]/g, "")
    // Remove potential command injection
    .replace(/[;&|`${}]/g, "")
    // Remove potential path traversal
    .replace(/\.{2,}[\/\\]/g, "")
    // Remove null bytes and control characters
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
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeInput(key, options)] = sanitizeObject(value, options);
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
export function generateRateLimitKey(req: any, prefix: string = "rl"): string {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
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
