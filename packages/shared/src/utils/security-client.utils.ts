/**
 * Client-Safe Security Utilities Module - Browser-Compatible Version
 *
 * This module provides security utility functions that can run safely in
 * browser environments without Node.js dependencies like JSDOM, crypto, or bcrypt.
 * For server-only utilities, use security.utils.ts
 *
 * @fileoverview Client-safe security utilities for browser/Next.js builds
 * @version 2.0.0
 * @author Bytebot Security Team - Client-Safe Implementation
 */

import {
  UserRole,
  Permission,
  SanitizationOptions,
  XSSDetectionResult,
  SQLInjectionDetectionResult,
  CommandInjectionDetectionResult,
  FilePathValidationResult,
  CoordinatesValidationResult,
} from "../types/security.types";

// ===========================
// CLIENT-SAFE SANITIZATION
// ===========================

/**
 * Default sanitization options for client-side use
 */
export const DEFAULT_SANITIZATION_OPTIONS: SanitizationOptions = {
  stripHtml: true,
  allowedTags: ["p", "br", "strong", "em", "u", "i"],
  allowedAttributes: {},
  normalizeWhitespace: true,
  maxLength: 10000,
  allowedCharsets: ["utf8"],
  removeControlChars: true,
  escapeSpecialChars: true,
};

/**
 * Basic client-safe input sanitization using simple HTML escaping
 * Note: For production use, consider using a proper sanitization library
 */
export function sanitizeInput(
  input: string,
  options: Partial<SanitizationOptions> = {},
): string {
  const opts = { ...DEFAULT_SANITIZATION_OPTIONS, ...options };

  if (!input || typeof input !== "string") {
    return "";
  }

  let sanitized = input.trim();

  // Apply length limit
  if (opts.maxLength && sanitized.length > opts.maxLength) {
    sanitized = sanitized.substring(0, opts.maxLength);
  }

  // Basic HTML escaping if enabled
  if (opts.escapeSpecialChars) {
    sanitized = sanitized
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }

  return sanitized;
}

/**
 * Recursively sanitize an object's string properties
 */
export function sanitizeObject(
  obj: unknown,
  options: Partial<SanitizationOptions> = {},
): unknown {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, options));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeInput(value, options);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ===========================
// BASIC THREAT DETECTION
// ===========================

/**
 * Basic XSS pattern detection (client-safe version)
 */
export function detectXSS(input: string): XSSDetectionResult {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
  ];

  const threats: string[] = [];
  let riskLevel: "low" | "medium" | "high" | "critical" = "low";

  for (const pattern of xssPatterns) {
    const matches = input.match(pattern);
    if (matches) {
      threats.push(...matches);
      riskLevel = "high";
    }
  }

  return {
    hasXSS: threats.length > 0,
    threats,
    riskScore: threats.length * 25,
    severity: riskLevel,
    confidence: threats.length > 0 ? 0.8 : 0.95,
    detectionContext: threats,
  };
}

/**
 * Basic SQL injection pattern detection
 */
export function detectSQLInjection(input: string): SQLInjectionDetectionResult {
  const sqlPatterns = [
    /('|"|;|--|\*|\/\*.*\*\/)/gi,
    /(union|select|insert|update|delete|drop|create|alter|exec|execute)/gi,
    /(or\s+\d+\s*=\s*\d+|and\s+\d+\s*=\s*\d+)/gi,
  ];

  const threats: string[] = [];
  let riskLevel: "low" | "medium" | "high" | "critical" = "low";

  for (const pattern of sqlPatterns) {
    const matches = input.match(pattern);
    if (matches) {
      threats.push(...matches);
      riskLevel = "medium";
    }
  }

  return {
    hasInjection: threats.length > 0,
    threats,
    riskScore: threats.length * 20,
    severity: riskLevel,
    confidence: 0.7,
    detectionContext: threats,
  };
}

/**
 * Basic command injection pattern detection
 */
export function detectCommandInjection(
  input: string,
): CommandInjectionDetectionResult {
  const commandPatterns = [
    /(\||&|;|`|\$\(|\${)/g,
    /(rm|cat|ls|cd|pwd|whoami|id|ps|kill|chmod|chown)/gi,
  ];

  const threats: string[] = [];
  let riskLevel: "low" | "medium" | "high" | "critical" = "low";

  for (const pattern of commandPatterns) {
    const matches = input.match(pattern);
    if (matches) {
      threats.push(...matches);
      riskLevel = "high";
    }
  }

  return {
    hasInjection: threats.length > 0,
    threats,
    riskScore: threats.length * 30,
    severity: riskLevel,
    confidence: 0.8,
    detectionContext: threats,
  };
}

// ===========================
// AUTHORIZATION HELPERS
// ===========================

/**
 * Role hierarchy for permission checking
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole._ADMIN]: [
    Permission._TASK_READ,
    Permission._TASK_WRITE,
    Permission._TASK_DELETE,
    Permission._COMPUTER_CONTROL,
    Permission._COMPUTER_VIEW,
    Permission._SYSTEM_ADMIN,
    Permission._USER_MANAGE,
    Permission._METRICS_VIEW,
    Permission._LOGS_VIEW,
  ],
  [UserRole._OPERATOR]: [
    Permission._TASK_READ,
    Permission._TASK_WRITE,
    Permission._TASK_DELETE,
    Permission._COMPUTER_CONTROL,
    Permission._COMPUTER_VIEW,
    Permission._METRICS_VIEW,
  ],
  [UserRole._VIEWER]: [
    Permission._TASK_READ,
    Permission._COMPUTER_VIEW,
    Permission._METRICS_VIEW,
  ],
  [UserRole._USER]: [
    Permission._TASK_READ,
    Permission._COMPUTER_VIEW,
    Permission._VIEW_OWN_PROFILE,
    Permission._VIEW_PUBLIC_CONTENT,
  ],
  [UserRole._GUEST]: [Permission._VIEW_PUBLIC_CONTENT],
};

/**
 * Check if a user role has a specific permission
 */
export function hasPermission(
  userRole: UserRole,
  permission: Permission,
): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if a user role is equal to or higher than the required role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy = [UserRole._VIEWER, UserRole._OPERATOR, UserRole._ADMIN];

  const userLevel = roleHierarchy.indexOf(userRole);
  const requiredLevel = roleHierarchy.indexOf(requiredRole);

  return userLevel >= requiredLevel;
}

// ===========================
// VALIDATION HELPERS
// ===========================

/**
 * Validate file path for basic security issues
 */
export function validateFilePath(filePath: string): FilePathValidationResult {
  const issues: string[] = [];
  let riskLevel: "low" | "medium" | "high" | "critical" = "low";

  // Check for path traversal
  if (filePath.includes("../") || filePath.includes("..\\")) {
    issues.push("Path traversal detected");
    riskLevel = "high";
  }

  // Check for absolute paths
  if (filePath.startsWith("/") || /^[a-zA-Z]:/.test(filePath)) {
    issues.push("Absolute path detected");
    riskLevel = "medium";
  }

  // Check for suspicious extensions
  const suspiciousExtensions = [".exe", ".bat", ".cmd", ".sh", ".ps1"];
  if (
    suspiciousExtensions.some((ext) => filePath.toLowerCase().endsWith(ext))
  ) {
    issues.push("Suspicious file extension");
    riskLevel = "high";
  }

  return {
    isValid: issues.length === 0,
    errors: issues.length > 0 ? issues : undefined,
    riskScore: issues.length * 25,
    severity: riskLevel,
    detectionContext: issues.length > 0 ? issues : undefined,
  };
}

/**
 * Validate coordinates for basic sanity checks
 */
export function validateCoordinates(
  x: number,
  y: number,
): CoordinatesValidationResult {
  const issues: string[] = [];

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    issues.push("Invalid coordinate values");
  }

  if (x < 0 || y < 0) {
    issues.push("Negative coordinates");
  }

  if (x > 10000 || y > 10000) {
    issues.push("Coordinates too large");
  }

  return {
    isValid: issues.length === 0,
    errors: issues.length > 0 ? issues : undefined,
    riskScore: issues.length * 20,
    severity: issues.length > 2 ? "high" : issues.length > 0 ? "medium" : "low",
    isOverflow: x > 10000 || y > 10000,
    normalizedCoordinates: {
      x: Math.max(0, Math.min(10000, Math.floor(x))),
      y: Math.max(0, Math.min(10000, Math.floor(y))),
    },
  };
}

// ===========================
// COMPREHENSIVE PATTERN DETECTION
// ===========================

/**
 * Detect comprehensive malicious patterns (client-safe version)
 */
export function detectComprehensiveMaliciousPatterns(content: string): {
  threats: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  categories: string[];
} {
  const allThreats: string[] = [];
  const categories: string[] = [];

  const xssResult = detectXSS(content);
  if (xssResult.hasXSS) {
    allThreats.push(...xssResult.threats);
    categories.push("XSS");
  }

  const sqlResult = detectSQLInjection(content);
  if (sqlResult.hasInjection) {
    allThreats.push(...sqlResult.threats);
    categories.push("SQL Injection");
  }

  const cmdResult = detectCommandInjection(content);
  if (cmdResult.hasInjection) {
    allThreats.push(...cmdResult.threats);
    categories.push("Command Injection");
  }

  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  if (categories.length > 2) {
    riskLevel = "critical";
  } else if (categories.length > 1) {
    riskLevel = "high";
  } else if (categories.length === 1) {
    riskLevel = "medium";
  }

  return { threats: allThreats, riskLevel, categories };
}

/**
 * Advanced XSS detection (client-safe version)
 */
export function detectAdvancedXSS(content: string): XSSDetectionResult {
  // For client-safe version, use the basic XSS detection
  return detectXSS(content);
}

/**
 * Detect malicious file content patterns (client-safe version)
 */
export function detectMaliciousFileContent(
  filename: string,
  content: string,
): {
  threats: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  isClean: boolean;
} {
  const pathResult = validateFilePath(filename);
  const contentResult = detectComprehensiveMaliciousPatterns(content);

  const pathErrors = pathResult.errors || [];
  return {
    threats: [...pathErrors, ...contentResult.threats],
    riskLevel:
      pathResult.severity === "high" || contentResult.riskLevel === "high"
        ? "high"
        : contentResult.riskLevel,
    isClean: pathResult.isValid && contentResult.threats.length === 0,
  };
}

// ===========================
// DEFAULT EXPORTS
// ===========================

export const DEFAULT_PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90, // days
  preventReuse: 5, // last N passwords
};
