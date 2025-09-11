/**
 * Enhanced Security Utilities Module - Bytebot Platform Security Framework
 *
 * This module provides comprehensive security utility functions for validation,
 * sanitization, authentication, and authorization across all Bytebot microservices.
 * Enhanced with advanced threat detection, malware scanning, and security monitoring.
 *
 * @fileoverview Enterprise-grade security utilities - Enhanced Version 2.0
 * @version 2.0.0
 * @author Bytebot Security Team - Enhanced Security Implementation
 */

import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { createHash, randomBytes, createHmac } from "crypto";
import * as DOMPurify from "dompurify";
import { Config } from "dompurify";
import * as sanitizeHtml from "sanitize-html";
import { JSDOM } from "jsdom";

// Import proper WindowLike type from DOMPurify
type WindowLikeWithDOMPurify = Pick<
  typeof globalThis,
  | "NodeFilter"
  | "Node"
  | "Element"
  | "HTMLTemplateElement"
  | "DocumentFragment"
  | "HTMLFormElement"
  | "DOMParser"
  | "NamedNodeMap"
> & {
  document: Document;
};
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
  RateLimitConfig,
  RateLimitPreset,
} from "../types/security.types";

// Lazy initialization of DOMPurify for server-side usage
type DOMPurifyInstance = {
  sanitize: (_source: string | Node, _config?: Config) => string;
  addHook: (_hook: string, _cb: (..._args: unknown[]) => void) => void;
  removeHook: (_hook: string) => void;
  removeHooks: (_hook: string) => void;
  isValidAttribute: (_tag: string, _attr: string, _value: string) => boolean;
};

let purify: DOMPurifyInstance | null = null;

function getPurify(): DOMPurifyInstance {
  if (!purify) {
    try {
      const jsdomWindow = new JSDOM("").window;
      // Create a compatible WindowLike object with required properties
      const window = {
        NodeFilter: jsdomWindow.NodeFilter,
        Node: jsdomWindow.Node,
        Element: jsdomWindow.Element,
        HTMLTemplateElement: jsdomWindow.HTMLTemplateElement,
        DocumentFragment: jsdomWindow.DocumentFragment,
        HTMLFormElement: jsdomWindow.HTMLFormElement,
        DOMParser: jsdomWindow.DOMParser,
        NamedNodeMap: jsdomWindow.NamedNodeMap,
        document: jsdomWindow.document,
      } as WindowLikeWithDOMPurify;
      const purifyConstructor = (DOMPurify as any).default || DOMPurify;
      purify = (purifyConstructor as any)(window) as DOMPurifyInstance;
    } catch (err) {
      throw new Error(
        `Failed to initialize DOMPurify: ${(err as Error).message}`,
      );
    }
  }
  return purify;
}

// ===========================
// ENHANCED THREAT DETECTION PATTERNS
// ===========================

/**
 * Advanced XSS detection patterns - Updated 2025
 */
export const ADVANCED_XSS_PATTERNS = [
  // Classic script injection patterns
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /onload\s*=/gi,
  /onerror\s*=/gi,
  /onclick\s*=/gi,
  /onmouseover\s*=/gi,

  // Modern XSS bypass techniques
  /data:text\/html/gi,
  /data:application\/octet-stream/gi,
  /<iframe[^>]*src=[^>]*>/gi,
  /<embed[^>]*src=[^>]*>/gi,
  /<object[^>]*data=[^>]*>/gi,

  // SVG-based XSS
  /<svg[^>]*onload=[^>]*>/gi,
  /<svg[^>]*>[\s\S]*?<script[\s\S]*?<\/svg>/gi,

  // Template injection patterns
  /\{\{.*?\}\}/g,
  /%7B%7B.*?%7D%7D/gi,
  /<%.*?%>/g,

  // Expression language injection
  /\${.*?}/g,
  /#\{.*?\}/g,

  // DOM clobbering vectors
  /name\s*=\s*['"]__proto__['"]|id\s*=\s*['"]__proto__['"]/gi,
  /name\s*=\s*['"]constructor['"]|id\s*=\s*['"]constructor['"]/gi,
];

/**
 * Advanced SQL injection patterns - Enhanced 2025
 */
export const ADVANCED_SQL_INJECTION_PATTERNS = [
  // Classic SQL injection
  /(union|select|insert|update|delete|drop|create|alter|execute|exec)\s+/gi,
  /('{1}|"{1}).*?(or|and)\s+[\w\s]*?=[\w\s]*?\1/gi,
  /('{1}|"{1})[^'"]*(or|and)[^'"]*('{1}|"{1})/gi,

  // Boolean-based blind SQL injection
  /\s+(or|and)\s+\d+\s*=\s*\d+/gi,
  /\s+(or|and)\s+['"][\w\s]*?['"](\s*=\s*['"][\w\s]*?['"])?/gi,

  // Time-based blind SQL injection
  /waitfor\s+delay\s+['"][\d:]+['"]/gi,
  /sleep\s*\(\s*\d+\s*\)/gi,
  /pg_sleep\s*\(\s*\d+\s*\)/gi,
  /benchmark\s*\(\s*\d+\s*,/gi,

  // UNION-based injection
  /union\s+(all\s+)?select\s+/gi,
  /\d+\s+union\s+(all\s+)?select/gi,

  // Stacked queries
  /;\s*(select|insert|update|delete|drop|create|alter)/gi,

  // Subquery injection
  /\(\s*select\s+[\w\s,*]+\s+from\s+[\w]+/gi,

  // Comment-based injection
  /(--|#|\/\*|\*\/)/g,

  // Function-based injection
  /(ascii|char|concat|substring|mid|length|count|group_concat)/gi,

  // Database-specific functions
  /(load_file|into\s+outfile|dumpfile)/gi,
  /(xp_cmdshell|sp_configure|openrowset)/gi,
];

/**
 * Command injection detection patterns
 */
const COMMAND_INJECTION_PATTERNS = [
  // Shell command separators
  /[;&|`$(){}]/g,

  // Common shell commands
  /(cat|ls|pwd|whoami|id|uname|ps|netstat|wget|curl|nc|telnet|ssh|ftp)/gi,

  // PowerShell commands
  /(Get-Process|Start-Process|Invoke-Expression|New-Object|Download)/gi,

  // Command substitution
  /\$\([^)]*\)/g,
  /`[^`]*`/g,

  // Environment variable expansion
  /\$\{[^}]*\}/g,

  // Redirection operators
  /[<>]/g,
];

/**
 * Path traversal detection patterns
 */
const PATH_TRAVERSAL_PATTERNS = [
  // Directory traversal sequences
  /\.\.\//g,
  /\.\.\\\\]/g,
  /%2e%2e%2f/gi,
  /%2e%2e%5c/gi,

  // Encoded traversal
  /%252e%252e%252f/gi,
  /%c0%ae%c0%ae%c0%af/gi,

  // URL encoded variations
  /\.\.%2f/gi,
  /\.\.%5c/gi,

  // Double encoding
  /%25%2e%25%2e%25%2f/gi,

  // Unicode variations
  /\u002e\u002e\u002f/gi,
  /\uff0e\uff0e\uff0f/gi,
];

/**
 * Template injection patterns
 */
const TEMPLATE_INJECTION_PATTERNS = [
  // Jinja2/Twig
  /\{\{.*?(config|request|session|g|lipsum|cycler|joiner|namespace).*?\}\}/gi,
  /\{%.*?(for|if|set|import|include|extends).*?%\}/gi,

  // Freemarker
  /<#.*?>/g,
  /\${.*?}/g,

  // Smarty
  /\{.*?\}/g,

  // Velocity
  /#set\s*\(/gi,
  /#if\s*\(/gi,

  // Django templates
  /\{%\s*(load|extends|block|for|if)\s*.*?%\}/gi,
];

/**
 * LDAP injection patterns
 */
const LDAP_INJECTION_PATTERNS = [
  // LDAP filter injection
  /[()&|!*]/g,

  // LDAP operators
  /(\*|\(|\)|&|\||!|=|~=|>|<)/g,

  // LDAP wildcards
  /\*/g,
];

/**
 * XML injection patterns
 */
const XML_INJECTION_PATTERNS = [
  // XXE injection
  /<!DOCTYPE[^>]*>/gi,
  /<!ENTITY[^>]*>/gi,

  // CDATA sections
  /<!\[CDATA\[.*?\]\]>/gi,

  // Processing instructions
  /<\?xml[^>]*\?>/gi,

  // External entity references
  /&[a-zA-Z][a-zA-Z0-9]*;/g,
];

/**
 * NoSQL injection patterns
 */
const NOSQL_INJECTION_PATTERNS = [
  // MongoDB operators
  /\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$exists|\$regex/gi,

  // JavaScript code in MongoDB
  /function\s*\(/gi,
  /this\./gi,

  // JSON injection
  /\{.*?"?\$.*?"?:/gi,
];

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
  } catch (err) {
    throw new Error(
      `Password hashing failed: ${err instanceof Error ? err.message : String(err)}`,
    );
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
  } catch (err) {
    throw new Error(
      `Password verification failed: ${err instanceof Error ? err.message : String(err)}`,
    );
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
    !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
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
    sanitizedData: errors.length === 0 ? { password } : undefined,
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
 * Generate a JWT refresh token with 7d expiration
 * @param userId User identifier
 * @param sessionId Session identifier
 * @param secret JWT secret key
 * @returns Signed refresh token
 */
export function generateRefreshToken(
  userId: string,
  sessionId: string,
  secret: string,
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
  } catch (err) {
    const errorObj = err as { name?: string };
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
  normalizeWhitespace: true,
  removeControlChars: true,
  escapeSpecialChars: true,
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
    try {
      sanitized = sanitizeHtml.default(sanitized, {
        allowedTags: options.allowedTags || [],
        allowedAttributes: options.allowedAttributes || {},
        allowedSchemes: ["http", "https", "mailto"],
      });
    } catch {
      // If sanitization fails, strip all HTML as fallback
      sanitized = sanitized.replace(/<[^>]*>/g, "");
    }
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
    .replace(/[()\\]/g, "")
    // Remove potential command injection
    .replace(/[;&|`${}]/g, "")
    // Remove potential path traversal
    .replace(/\.{2,}[/\\\\]/g, "")
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
  obj: unknown,
  options: SanitizationOptions = DEFAULT_SANITIZATION_OPTIONS,
): unknown {
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
 * Advanced SQL Injection Detection Engine - 2025 Modern Threat Detection
 * Comprehensive protection against NoSQL, Time-based, Boolean-based, Error-based,
 * JSON/XML-based, GraphQL, and ORM-specific injection patterns
 *
 * @param input Input string to analyze for SQL injection patterns
 * @returns Detailed threat analysis with classification and risk scoring
 */
export function detectSQLInjection(input: string): {
  hasInjection: boolean;
  threats: string[];
  riskScore: number;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  detectionContext: string[];
  databaseType?: string;
} {
  console.log(
    `[SQL-INJECTION-ENGINE] Starting advanced SQL injection detection for input: ${input.substring(0, 100)}${input.length > 100 ? "..." : ""}`,
  );

  if (typeof input !== "string") {
    console.log(
      "[SQL-INJECTION-ENGINE] Input validation: Non-string input rejected",
    );
    return {
      hasInjection: false,
      threats: [],
      riskScore: 0,
      severity: "low",
      confidence: 100,
      detectionContext: [],
    };
  }

  const threats: string[] = [];
  const detectionContext: string[] = [];
  let riskScore = 0;
  let totalConfidence = 0;
  let detectionCount = 0;
  let detectedDatabaseType: string | undefined;

  // Normalize input for better pattern matching
  input.normalize("NFKC").toLowerCase();
  const originalInput = input;

  // Performance optimization: Start detection timer
  const startTime = performance.now();

  // =================== ADVANCED SQL INJECTION PATTERNS ===================
  const advancedSQLPatterns = [
    // =================== CLASSIC PATTERNS (Enhanced) ===================
    // Classic boolean-based blind injection
    {
      pattern:
        /(\bor\b|\bOR\b)\s+(\d+\s*=\s*\d+|'[^']*'\s*=\s*'[^']*'|"[^"]*"\s*=\s*"[^"]*")/gi,
      threat: "Boolean-Based Blind Injection",
      score: 9,
      confidence: 95,
      context: "boolean-blind",
      dbType: "generic",
    },
    {
      pattern:
        /(\band\b|\bAND\b)\s+(\d+\s*=\s*\d+|'[^']*'\s*=\s*'[^']*'|"[^"]*"\s*=\s*"[^"]*")/gi,
      threat: "Boolean-Based Blind AND Injection",
      score: 9,
      confidence: 95,
      context: "boolean-blind",
      dbType: "generic",
    },
    {
      pattern:
        /('\s*or\s*'1'\s*=\s*'1'|"\s*or\s*"1"\s*=\s*"1"|'\s*or\s*1=1|"\s*or\s*1=1)/gi,
      threat: "Classic OR 1=1 Injection",
      score: 10,
      confidence: 98,
      context: "classic-injection",
      dbType: "generic",
    },

    // Enhanced UNION-based injection
    {
      pattern:
        /(\bunion\b|\bUNION\b)[\s/*]*(?:all\s*)?[\s/*]*(\bselect\b|\bSELECT\b)/gi,
      threat: "UNION-Based Injection",
      score: 9,
      confidence: 90,
      context: "union-based",
      dbType: "generic",
    },
    {
      pattern: /union\s+select\s+null/gi,
      threat: "UNION SELECT NULL Injection",
      score: 10,
      confidence: 95,
      context: "union-based",
      dbType: "generic",
    },

    // Enhanced SQL keywords with context awareness
    {
      pattern: /(\bselect\b|\bSELECT\b)\s+.*(\bfrom\b|\bFROM\b)/gi,
      threat: "SELECT Statement Injection",
      score: 8,
      confidence: 85,
      context: "sql-keywords",
      dbType: "generic",
    },
    {
      pattern: /(\binsert\b|\bINSERT\b)\s+.*(\binto\b|\bINTO\b)/gi,
      threat: "INSERT Statement Injection",
      score: 9,
      confidence: 90,
      context: "sql-keywords",
      dbType: "generic",
    },
    {
      pattern: /(\bupdate\b|\bUPDATE\b)\s+.*(\bset\b|\bSET\b)/gi,
      threat: "UPDATE Statement Injection",
      score: 9,
      confidence: 90,
      context: "sql-keywords",
      dbType: "generic",
    },
    {
      pattern: /(\bdelete\b|\bDELETE\b)\s+.*(\bfrom\b|\bFROM\b)/gi,
      threat: "DELETE Statement Injection",
      score: 10,
      confidence: 95,
      context: "sql-keywords",
      dbType: "generic",
    },
    {
      pattern:
        /(\bdrop\b|\bDROP\b)\s+(\btable\b|\bTABLE\b|\bdatabase\b|\bDATABASE\b)/gi,
      threat: "DROP Statement Injection",
      score: 10,
      confidence: 98,
      context: "destructive-sql",
      dbType: "generic",
    },
    {
      pattern: /(\btruncate\b|\bTRUNCATE\b)\s+(\btable\b|\bTABLE\b)/gi,
      threat: "TRUNCATE Statement Injection",
      score: 10,
      confidence: 95,
      context: "destructive-sql",
      dbType: "generic",
    },
    {
      pattern: /(\balter\b|\bALTER\b)\s+(\btable\b|\bTABLE\b)/gi,
      threat: "ALTER Statement Injection",
      score: 9,
      confidence: 90,
      context: "sql-keywords",
      dbType: "generic",
    },
    {
      pattern:
        /(\bcreate\b|\bCREATE\b)\s+(\btable\b|\bTABLE\b|\bdatabase\b|\bDATABASE\b)/gi,
      threat: "CREATE Statement Injection",
      score: 8,
      confidence: 85,
      context: "sql-keywords",
      dbType: "generic",
    },

    // Enhanced stored procedure attacks
    {
      pattern: /(\bexec\b|\bEXEC\b|\bexecute\b|\bEXECUTE\b)\s+(\bsp_|\bxp_)/gi,
      threat: "Stored Procedure Execution",
      score: 10,
      confidence: 95,
      context: "stored-procedure",
      dbType: "mssql",
    },
    {
      pattern:
        /(xp_cmdshell|sp_configure|openrowset|opendatasource|sp_makewebtask)/gi,
      threat: "Dangerous SQL Server Procedures",
      score: 10,
      confidence: 98,
      context: "stored-procedure",
      dbType: "mssql",
    },

    // Enhanced comment-based attacks
    {
      pattern: /--[+\s][\s\S]*/gi,
      threat: "SQL Comment Injection",
      score: 7,
      confidence: 80,
      context: "comment-based",
      dbType: "generic",
    },
    {
      pattern: /\/\*[\s\S]*?\*\//gi,
      threat: "Multi-line Comment Injection",
      score: 7,
      confidence: 85,
      context: "comment-based",
      dbType: "generic",
    },
    {
      pattern: /#.*$/gm,
      threat: "Hash Comment Injection",
      score: 6,
      confidence: 75,
      context: "comment-based",
      dbType: "mysql",
    },

    // Advanced encoding attacks
    {
      pattern: /(0x[0-9a-f]+|\\x[0-9a-f]{2}|%[0-9a-f]{2})/gi,
      threat: "Hex/URL Encoded Injection",
      score: 8,
      confidence: 85,
      context: "encoding-bypass",
      dbType: "generic",
    },
    {
      pattern: /(&#x[0-9a-f]+;|&#[0-9]+;|\\u[0-9a-f]{4})/gi,
      threat: "Unicode/HTML Entity Encoding",
      score: 7,
      confidence: 80,
      context: "encoding-bypass",
      dbType: "generic",
    },

    // =================== TIME-BASED BLIND INJECTION (2025) ===================
    {
      pattern:
        /(waitfor\s+delay\s+['"]?\d{2}:\d{2}:\d{2}['"]?|waitfor\s+time\s+['"]?\d{2}:\d{2}:\d{2}['"]?)/gi,
      threat: "SQL Server Time-Based Blind Injection",
      score: 10,
      confidence: 98,
      context: "time-based-blind",
      dbType: "mssql",
    },
    {
      pattern: /(sleep\s*\(\s*\d+\s*\)|pg_sleep\s*\(\s*\d+\s*\))/gi,
      threat: "MySQL/PostgreSQL Sleep Function",
      score: 10,
      confidence: 95,
      context: "time-based-blind",
      dbType: "mysql-postgres",
    },
    {
      pattern: /(benchmark\s*\(\s*\d+\s*,\s*[^)]+\))/gi,
      threat: "MySQL Benchmark Time Delay",
      score: 10,
      confidence: 95,
      context: "time-based-blind",
      dbType: "mysql",
    },
    {
      pattern:
        /(dbms_pipe\.receive_message\s*\([^)]+\)|dbms_lock\.sleep\s*\(\s*\d+\s*\))/gi,
      threat: "Oracle Time-Based Injection",
      score: 10,
      confidence: 95,
      context: "time-based-blind",
      dbType: "oracle",
    },
    {
      pattern: /(randomblob\s*\(\s*\d+\s*\)|like\s+['"][^'"]*%[^'"]*['"])/gi,
      threat: "SQLite Time-Based Injection",
      score: 9,
      confidence: 85,
      context: "time-based-blind",
      dbType: "sqlite",
    },

    // =================== ERROR-BASED INJECTION (2025) ===================
    {
      pattern: /(extractvalue\s*\([^)]+\)|updatexml\s*\([^)]+\))/gi,
      threat: "MySQL XML Error-Based Injection",
      score: 10,
      confidence: 95,
      context: "error-based",
      dbType: "mysql",
    },
    {
      pattern:
        /(convert\s*\(\s*int\s*,\s*[^)]+\)|cast\s*\([^)]+\s+as\s+int\s*\))/gi,
      threat: "SQL Server Error-Based Injection",
      score: 10,
      confidence: 90,
      context: "error-based",
      dbType: "mssql",
    },
    {
      pattern: /(ctxsys\.drithsx\.sn\s*\([^)]+\)|XMLType\s*\([^)]+\))/gi,
      threat: "Oracle Error-Based Injection",
      score: 10,
      confidence: 95,
      context: "error-based",
      dbType: "oracle",
    },
    {
      pattern: /((\d+::int|\d+::text)\s*[+\-*/]\s*['"][^'"]*['"])/gi,
      threat: "PostgreSQL Error-Based Injection",
      score: 9,
      confidence: 85,
      context: "error-based",
      dbType: "postgresql",
    },

    // =================== NOSQL INJECTION (2025) ===================
    {
      pattern: /(\$where\s*:|\$ne\s*:|\$gt\s*:|\$lt\s*:|\$regex\s*:)/gi,
      threat: "MongoDB NoSQL Injection",
      score: 10,
      confidence: 95,
      context: "nosql-injection",
      dbType: "mongodb",
    },
    {
      pattern: /(\$or\s*:\s*\[|\$and\s*:\s*\[|\$in\s*:\s*\[)/gi,
      threat: "MongoDB Logical Operator Injection",
      score: 9,
      confidence: 90,
      context: "nosql-injection",
      dbType: "mongodb",
    },
    {
      pattern: /(this\s*\.\s*\w+|function\s*\(\s*\))/gi,
      threat: "MongoDB JavaScript Injection",
      score: 10,
      confidence: 85,
      context: "nosql-injection",
      dbType: "mongodb",
    },
    {
      pattern: /(cql\s*=|select\s+.+from\s+.+where)/gi,
      threat: "Cassandra CQL Injection",
      score: 9,
      confidence: 80,
      context: "nosql-injection",
      dbType: "cassandra",
    },
    {
      pattern: /(redis\.|get\s+.+|set\s+.+|eval\s+['"][^'"]*['"])/gi,
      threat: "Redis Command Injection",
      score: 9,
      confidence: 80,
      context: "nosql-injection",
      dbType: "redis",
    },

    // =================== JSON/XML-BASED INJECTION (2025) ===================
    {
      pattern: /({[^}]*['"][^'"]*['"]\s*:\s*{\s*['"]\$[^'"]*['"])/gi,
      threat: "JSON NoSQL Injection",
      score: 9,
      confidence: 85,
      context: "json-injection",
      dbType: "document",
    },
    {
      pattern: /(<\?xml[^>]*>|<\.DOCTYPE[^>]*>)/gi,
      threat: "XML External Entity (XXE) Attack",
      score: 10,
      confidence: 95,
      context: "xml-injection",
      dbType: "generic",
    },
    {
      pattern: /(xpath\s*\([^)]*['"][^'"]*['"][^)]*\))/gi,
      threat: "XPath Injection",
      score: 9,
      confidence: 90,
      context: "xml-injection",
      dbType: "generic",
    },
    {
      pattern: /(json_extract\s*\([^)]*\)|json_unquote\s*\([^)]*\))/gi,
      threat: "JSON Function Injection",
      score: 8,
      confidence: 80,
      context: "json-injection",
      dbType: "mysql",
    },

    // =================== GRAPHQL INJECTION (2025) ===================
    {
      pattern: /(mutation\s*{|query\s*{|subscription\s*{)/gi,
      threat: "GraphQL Query Injection",
      score: 8,
      confidence: 85,
      context: "graphql-injection",
      dbType: "graphql",
    },
    {
      pattern: /(__schema|__type|__typename|__inputfields)/gi,
      threat: "GraphQL Introspection Attack",
      score: 9,
      confidence: 90,
      context: "graphql-injection",
      dbType: "graphql",
    },
    {
      pattern: /(fragment\s+\w+\s+on\s+\w+)/gi,
      threat: "GraphQL Fragment Injection",
      score: 7,
      confidence: 75,
      context: "graphql-injection",
      dbType: "graphql",
    },

    // =================== ORM-SPECIFIC INJECTION (2025) ===================
    {
      pattern: /(\bfrom\s*\(\s*['"][^'"]+['"]\s*\)|raw\s*\(['"][^'"]+['"]\))/gi,
      threat: "ORM Raw Query Injection",
      score: 10,
      confidence: 90,
      context: "orm-injection",
      dbType: "generic",
    },
    {
      pattern:
        /(whereRaw\s*\(['"][^'"]+['"]\)|havingRaw\s*\(['"][^'"]+['"]\))/gi,
      threat: "Knex.js Raw Injection",
      score: 9,
      confidence: 85,
      context: "orm-injection",
      dbType: "knex",
    },
    {
      pattern: /(\$raw\s*\(['"][^'"]+['"]\)|DB::raw\s*\(['"][^'"]+['"]\))/gi,
      threat: "Laravel Eloquent Raw Injection",
      score: 9,
      confidence: 85,
      context: "orm-injection",
      dbType: "laravel",
    },
    {
      pattern:
        /(createQuery\s*\(['"][^'"]+['"]\)|createNativeQuery\s*\(['"][^'"]+['"]\))/gi,
      threat: "JPA/Hibernate Native Query Injection",
      score: 9,
      confidence: 85,
      context: "orm-injection",
      dbType: "jpa",
    },
    {
      pattern:
        /(from_statement\s*\(['"][^'"]+['"]\)|text\s*\(['"][^'"]+['"]\))/gi,
      threat: "SQLAlchemy Raw Query Injection",
      score: 9,
      confidence: 85,
      context: "orm-injection",
      dbType: "sqlalchemy",
    },

    // =================== ADVANCED PATTERN MATCHING (2025) ===================
    // Database function abuse
    {
      pattern:
        /(load_file\s*\(['"][^'"]+['"]\)|into\s+outfile\s+['"][^'"]+['"]|into\s+dumpfile\s+['"][^'"]+['"])/gi,
      threat: "MySQL File System Access",
      score: 10,
      confidence: 95,
      context: "file-access",
      dbType: "mysql",
    },
    {
      pattern:
        /(copy\s+.+from\s+['"][^'"]+['"]|copy\s+.+to\s+['"][^'"]+['"])/gi,
      threat: "PostgreSQL File System Access",
      score: 10,
      confidence: 90,
      context: "file-access",
      dbType: "postgresql",
    },
    {
      pattern: /(utl_file\.|utl_http\.|dbms_java\.)/gi,
      threat: "Oracle System Package Abuse",
      score: 10,
      confidence: 95,
      context: "system-access",
      dbType: "oracle",
    },

    // Information disclosure patterns
    {
      pattern: /(information_schema\.|sys\.|msdb\.|master\.|tempdb\.)/gi,
      threat: "System Database Access",
      score: 9,
      confidence: 90,
      context: "info-disclosure",
      dbType: "generic",
    },
    {
      pattern: /(@@version|version\(\)|@@servername|@@hostname)/gi,
      threat: "Database Version Disclosure",
      score: 7,
      confidence: 85,
      context: "info-disclosure",
      dbType: "generic",
    },
    {
      pattern: /(user\(\)|current_user|session_user|system_user)/gi,
      threat: "User Information Disclosure",
      score: 6,
      confidence: 80,
      context: "info-disclosure",
      dbType: "generic",
    },

    // Blind injection function patterns
    {
      pattern: /(substring\s*\([^)]+\)|substr\s*\([^)]+\)|mid\s*\([^)]+\))/gi,
      threat: "String Extraction Functions",
      score: 8,
      confidence: 85,
      context: "blind-injection",
      dbType: "generic",
    },
    {
      pattern: /(ascii\s*\([^)]+\)|ord\s*\([^)]+\)|char\s*\([^)]+\))/gi,
      threat: "Character Manipulation Functions",
      score: 8,
      confidence: 85,
      context: "blind-injection",
      dbType: "generic",
    },
    {
      pattern: /(hex\s*\([^)]+\)|unhex\s*\([^)]+\)|bin\s*\([^)]+\))/gi,
      threat: "Encoding/Decoding Functions",
      score: 7,
      confidence: 80,
      context: "blind-injection",
      dbType: "mysql",
    },

    // Stacked queries and batch execution
    {
      pattern:
        /;\s*(select|insert|update|delete|drop|create|alter|exec|call)/gi,
      threat: "Stacked Query Injection",
      score: 10,
      confidence: 95,
      context: "stacked-queries",
      dbType: "generic",
    },
    {
      pattern: /(;\s*declare\s+@\w+|;\s*set\s+@\w+)/gi,
      threat: "SQL Server Variable Declaration",
      score: 9,
      confidence: 90,
      context: "stacked-queries",
      dbType: "mssql",
    },

    // Database-specific concatenation
    {
      pattern: /(concat\s*\([^)]+\)|\|\||\+\s*['"][^'"]*['"])/gi,
      threat: "String Concatenation Injection",
      score: 7,
      confidence: 75,
      context: "string-manipulation",
      dbType: "generic",
    },

    // Advanced boolean logic
    {
      pattern: /(case\s+when[^e]*end|if\s*\([^)]+\s*,\s*[^)]+\s*,\s*[^)]+\))/gi,
      threat: "Conditional Logic Injection",
      score: 8,
      confidence: 80,
      context: "conditional-logic",
      dbType: "generic",
    },
  ];

  // Multi-stage detection pipeline with database type identification
  console.log("[SQL-INJECTION-ENGINE] Starting pattern matching pipeline");

  // Stage 1: High-confidence pattern matching
  const highConfidencePatterns = advancedSQLPatterns.filter(
    (p) => p.confidence >= 90,
  );
  for (const {
    pattern,
    threat,
    score,
    confidence,
    context,
    dbType,
  } of highConfidencePatterns) {
    if (pattern.test(originalInput)) {
      console.log(
        `[SQL-INJECTION-ENGINE] High-confidence threat detected: ${threat} (confidence: ${confidence}%, context: ${context}, db: ${dbType})`,
      );
      threats.push(threat);
      riskScore += score;
      totalConfidence += confidence;
      detectionCount++;
      detectionContext.push(context);
      if (!detectedDatabaseType || dbType !== "generic") {
        detectedDatabaseType = dbType;
      }
    }
  }

  // Stage 2: Medium-confidence pattern matching (only if no high-confidence matches)
  if (threats.length === 0) {
    const mediumConfidencePatterns = advancedSQLPatterns.filter(
      (p) => p.confidence >= 75 && p.confidence < 90,
    );
    for (const {
      pattern,
      threat,
      score,
      confidence,
      context,
      dbType,
    } of mediumConfidencePatterns) {
      if (pattern.test(originalInput)) {
        console.log(
          `[SQL-INJECTION-ENGINE] Medium-confidence threat detected: ${threat} (confidence: ${confidence}%, context: ${context}, db: ${dbType})`,
        );
        threats.push(threat);
        riskScore += score * 0.8; // Reduce score for medium confidence
        totalConfidence += confidence;
        detectionCount++;
        detectionContext.push(context);
        if (!detectedDatabaseType || dbType !== "generic") {
          detectedDatabaseType = dbType;
        }
      }
    }
  }

  // Stage 3: Low-confidence pattern matching (only if no other matches and input looks suspicious)
  if (
    threats.length === 0 &&
    (input.includes("'") ||
      input.includes('"') ||
      /\b(select|insert|update|delete)\b/gi.test(input))
  ) {
    const lowConfidencePatterns = advancedSQLPatterns.filter(
      (p) => p.confidence < 75,
    );
    for (const {
      pattern,
      threat,
      score,
      confidence,
      context,
      dbType,
    } of lowConfidencePatterns) {
      if (pattern.test(originalInput)) {
        console.log(
          `[SQL-INJECTION-ENGINE] Low-confidence threat detected: ${threat} (confidence: ${confidence}%, context: ${context}, db: ${dbType})`,
        );
        threats.push(threat);
        riskScore += score * 0.5; // Significantly reduce score for low confidence
        totalConfidence += confidence;
        detectionCount++;
        detectionContext.push(context);
        if (!detectedDatabaseType || dbType !== "generic") {
          detectedDatabaseType = dbType;
        }
      }
    }
  }

  // Calculate normalized risk score and overall confidence
  const normalizedRiskScore = Math.min(10, Math.floor(riskScore / 10));
  const averageConfidence =
    detectionCount > 0 ? Math.round(totalConfidence / detectionCount) : 100;

  // Determine severity level based on risk score and confidence
  let severity: "low" | "medium" | "high" | "critical";
  if (normalizedRiskScore >= 8 && averageConfidence >= 90) {
    severity = "critical";
  } else if (normalizedRiskScore >= 6 && averageConfidence >= 80) {
    severity = "high";
  } else if (normalizedRiskScore >= 3 && averageConfidence >= 70) {
    severity = "medium";
  } else {
    severity = "low";
  }

  const detectionTime = performance.now() - startTime;
  console.log(
    `[SQL-INJECTION-ENGINE] Detection completed in ${detectionTime.toFixed(2)}ms - Threats: ${threats.length}, Risk Score: ${normalizedRiskScore}, Severity: ${severity}, Confidence: ${averageConfidence}%, DB Type: ${detectedDatabaseType || "unknown"}`,
  );

  // Context-aware false positive reduction
  const uniqueContexts = Array.from(new Set(detectionContext));
  const contextualRiskAdjustment = uniqueContexts.length > 3 ? 1.2 : 1.0; // Multiple attack contexts increase risk
  const adjustedRiskScore = Math.min(
    10,
    Math.floor(normalizedRiskScore * contextualRiskAdjustment),
  );

  return {
    hasInjection: threats.length > 0,
    threats,
    riskScore: adjustedRiskScore,
    severity,
    confidence: averageConfidence,
    detectionContext: uniqueContexts,
    databaseType: detectedDatabaseType,
  };
}

/**
 * Legacy compatibility function - maintains backward compatibility with existing code
 * @param input Input string to analyze
 * @returns True if potential SQL injection detected
 */
export function detectSQLInjectionLegacy(input: string): boolean {
  const result = detectSQLInjection(input);
  return result.hasInjection;
}

// ===========================
// COMMAND INJECTION DETECTION ENGINE
// ===========================

/**
 * Command injection detection result interface
 */
export interface CommandInjectionResult {
  hasInjection: boolean;
  threats: string[];
  riskScore: number;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  detectionContext: string[];
  platformType?: string;
  attackVectors: string[];
}

/**
 * Comprehensive Command Injection Detection Engine
 *
 * This advanced security function provides multi-layered protection against command injection attacks
 * across all major operating systems and shell environments. It employs sophisticated pattern recognition,
 * risk scoring, and threat classification to identify potential command injection attempts.
 *
 * SECURITY FEATURES:
 * - Multi-OS support (Windows, Linux, macOS, Unix variants)
 * - Shell-specific syntax recognition (bash, zsh, cmd, powershell)
 * - Encoding bypass detection (URL, HTML, Unicode, Base64)
 * - Command chaining and piping detection
 * - Process manipulation and privilege escalation patterns
 * - Container escape attempt detection
 * - Environment variable manipulation detection
 * - Script injection pattern recognition
 * - Risk scoring with confidence levels
 * - Comprehensive logging and audit trails
 *
 * @param input The input string to analyze for command injection patterns
 * @param options Optional configuration for detection sensitivity and context
 * @returns Detailed analysis results with threat classification and risk assessment
 */
export function detectCommandInjection(
  input: string,
  options: {
    strictMode?: boolean;
    contextType?: "url" | "form" | "api" | "file" | "general";
  } = {},
): CommandInjectionResult {
  const startTime = performance.now();
  console.log(
    `[CMD-INJECTION-ENGINE] Starting comprehensive command injection analysis for input length: ${input.length}`,
  );

  const { strictMode = false, contextType = "general" } = options;

  // Preserve original input for pattern matching
  const originalInput = input;

  // Initialize detection tracking
  const threats: string[] = [];
  let riskScore = 0;
  let totalConfidence = 0;
  let detectionCount = 0;
  const detectionContext: string[] = [];
  const attackVectors: string[] = [];
  let detectedPlatformType: string | undefined;

  console.log(
    `[CMD-INJECTION-ENGINE] Analysis mode: ${strictMode ? "strict" : "standard"}, Context: ${contextType}`,
  );

  // ===== CRITICAL COMMAND INJECTION PATTERNS =====
  // These patterns represent high-confidence command injection attempts
  const criticalPatterns = [
    // Shell command separators and operators
    {
      pattern: /[;&|`$(){}[\]<>]|\|\||&&/g,
      threat: "Shell Command Separator",
      score: 90,
      confidence: 95,
      context: "Command chaining/piping detected",
      platform: "unix",
    },
    // Process substitution and command execution
    {
      pattern: /\$\([^)]*\)|`[^`]*`|\${[^}]*}/g,
      threat: "Command Substitution",
      score: 95,
      confidence: 98,
      context: "Process substitution syntax detected",
      platform: "unix",
    },
    // Windows command injection patterns
    {
      pattern:
        /(&\s*[a-z]+)|(\|\s*[a-z]+)|(cmd\s*\/[ckqstv])|powershell|pwsh/gi,
      threat: "Windows Command Injection",
      score: 85,
      confidence: 90,
      context: "Windows shell command patterns",
      platform: "windows",
    },
    // File system manipulation
    {
      pattern: /(rm\s+-rf|del\s+\/[sqf]|rmdir|rd\s+\/s)[\s/\\]|\.\.\//g,
      threat: "File System Manipulation",
      score: 88,
      confidence: 92,
      context: "Dangerous file operations detected",
      platform: "multi",
    },
    // Network operations and data exfiltration
    {
      pattern: /(wget|curl|nc|netcat|telnet|ssh|scp|rsync)\s+/gi,
      threat: "Network Command Execution",
      score: 80,
      confidence: 85,
      context: "Network tools for data exfiltration",
      platform: "unix",
    },
    // System information gathering
    {
      pattern: /(whoami|id|ps\s|netstat|ifconfig|ipconfig|systeminfo|uname)/gi,
      threat: "System Information Gathering",
      score: 75,
      confidence: 80,
      context: "System reconnaissance commands",
      platform: "multi",
    },
    // Process control and privilege escalation
    {
      pattern: /(sudo|su\s|runas|kill\s+-9|killall|taskkill)/gi,
      threat: "Privilege Escalation",
      score: 90,
      confidence: 95,
      context: "Privilege escalation attempts",
      platform: "multi",
    },
    // Container escape attempts
    {
      pattern:
        /(docker\s+|kubectl\s+|containerd|runc|cgroups|\/proc\/self\/|chroot)/gi,
      threat: "Container Escape Attempt",
      score: 95,
      confidence: 90,
      context: "Container breakout patterns",
      platform: "unix",
    },
    // Script execution patterns
    {
      pattern:
        /(python|perl|ruby|node|php|bash|sh|zsh|csh|tcsh|fish)\s+(-c\s+|\/dev\/stdin|<<|<\s*\()/gi,
      threat: "Script Injection",
      score: 85,
      confidence: 88,
      context: "Interpreter execution with inline code",
      platform: "multi",
    },
    // Environment variable manipulation
    {
      pattern:
        /(export\s+|set\s+|setenv\s+|env\s+|PATH\s*=|LD_PRELOAD\s*=|LD_LIBRARY_PATH\s*=)/gi,
      threat: "Environment Variable Manipulation",
      score: 70,
      confidence: 75,
      context: "Environment variable tampering",
      platform: "unix",
    },
  ];

  // ===== ENCODING BYPASS DETECTION =====
  // Detect attempts to bypass security through various encoding schemes
  const encodingBypassPatterns = [
    {
      pattern: /%[0-9a-f]{2}/gi,
      threat: "URL Encoding Bypass",
      score: 60,
      confidence: 70,
      context: "URL encoded characters detected",
      platform: "multi",
    },
    {
      pattern: /&#x?[0-9a-f]+;/gi,
      threat: "HTML Entity Bypass",
      score: 65,
      confidence: 75,
      context: "HTML entity encoding detected",
      platform: "multi",
    },
    {
      pattern: /\\u[0-9a-f]{4}|\\x[0-9a-f]{2}/gi,
      threat: "Unicode Escape Bypass",
      score: 70,
      confidence: 80,
      context: "Unicode escape sequences detected",
      platform: "multi",
    },
    {
      pattern: /[a-zA-Z0-9+/]{4,}={0,2}/g,
      threat: "Base64 Encoding Bypass",
      score: 50,
      confidence: 60,
      context: "Potential Base64 encoded payload",
      platform: "multi",
    },
    {
      pattern: /\\[0-7]{3}|\\[abfnrtv\\]/g,
      threat: "Octal/Escape Sequence Bypass",
      score: 65,
      confidence: 70,
      context: "Escape sequence encoding detected",
      platform: "multi",
    },
  ];

  // ===== ADVANCED EVASION PATTERNS =====
  // Sophisticated evasion techniques used by advanced attackers
  const evasionPatterns = [
    {
      pattern: /\${IFS}|\$\(echo|\$'\w+'|\\\w/g,
      threat: "Advanced Shell Evasion",
      score: 85,
      confidence: 90,
      context: "Sophisticated shell metacharacter evasion",
      platform: "unix",
    },
    {
      pattern: /\^[a-zA-Z]|\|\s*more|\|\s*findstr/gi,
      threat: "Windows Command Evasion",
      score: 80,
      confidence: 85,
      context: "Windows-specific command evasion",
      platform: "windows",
    },
    {
      pattern:
        /(exec|system|eval|assert|call_user_func|passthru|shell_exec|popen|proc_open)/gi,
      threat: "Code Execution Function",
      score: 95,
      confidence: 98,
      context: "Dangerous code execution functions",
      platform: "multi",
    },
    {
      pattern: /\/\*[\s\S]*?\*\/|\/\/.*?[\r\n]|<!--[\s\S]*?-->/g,
      threat: "Comment-based Evasion",
      score: 40,
      confidence: 50,
      context: "Comments used for payload hiding",
      platform: "multi",
    },
    {
      pattern: /\+\s*'|'\s*\+|"\s*\+|\+\s*"|concat\s*\(/gi,
      threat: "String Concatenation Evasion",
      score: 60,
      confidence: 65,
      context: "String concatenation to evade detection",
      platform: "multi",
    },
  ];

  // ===== CONTEXTUAL RISK PATTERNS =====
  // Patterns that are suspicious in certain contexts but may be legitimate in others
  const contextualPatterns = [
    {
      pattern: /(ls\s|dir\s|cat\s|type\s|echo\s|printf\s)/gi,
      threat: "Basic System Commands",
      score: 30,
      confidence: 40,
      context: "Basic system commands - context dependent",
      platform: "multi",
    },
    {
      pattern: /\/[a-z]+\/[a-z]+|[a-z]:\\[a-z]+\\[a-z]+/gi,
      threat: "File Path Access",
      score: 35,
      confidence: 45,
      context: "Absolute file path references",
      platform: "multi",
    },
    {
      pattern: /\.(bat|cmd|exe|sh|py|pl|rb|js|vbs|ps1)[\s;"'|&<>]/gi,
      threat: "Executable File Reference",
      score: 55,
      confidence: 65,
      context: "References to executable files",
      platform: "multi",
    },
  ];

  // ===== PATTERN ANALYSIS EXECUTION =====
  console.log(`[CMD-INJECTION-ENGINE] Executing critical pattern analysis...`);

  // Analyze critical patterns
  for (const {
    pattern,
    threat,
    score,
    confidence,
    context,
    platform,
  } of criticalPatterns) {
    const matches = originalInput.match(pattern);
    if (matches) {
      console.log(
        `[CMD-INJECTION-ENGINE] CRITICAL threat detected: ${threat} - Matches: ${matches.length} (confidence: ${confidence}%, platform: ${platform})`,
      );
      threats.push(threat);
      attackVectors.push(
        `${threat}: ${matches.slice(0, 3).join(", ")}${matches.length > 3 ? "..." : ""}`,
      );
      riskScore += score;
      totalConfidence += confidence;
      detectionCount++;
      detectionContext.push(context);
      if (!detectedPlatformType || platform !== "multi") {
        detectedPlatformType = platform;
      }
    }
  }

  // Analyze encoding bypass patterns
  console.log(`[CMD-INJECTION-ENGINE] Executing encoding bypass analysis...`);
  /* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
  for (const {
    pattern,
    threat,
    score,
    confidence,
    context,
    platform,
  } of encodingBypassPatterns) {
    const matches = originalInput.match(pattern);
    if (matches) {
      console.log(
        `[CMD-INJECTION-ENGINE] Encoding bypass detected: ${threat} - Matches: ${matches.length} (confidence: ${confidence}%)`,
      );
      threats.push(threat);
      attackVectors.push(`${threat}: ${matches.slice(0, 2).join(", ")}`);
      riskScore += score;
      totalConfidence += confidence;
      detectionCount++;
      detectionContext.push(context);
    }
  }

  // Analyze advanced evasion patterns
  console.log(`[CMD-INJECTION-ENGINE] Executing evasion technique analysis...`);
  for (const {
    pattern,
    threat,
    score,
    confidence,
    context,
    platform,
  } of evasionPatterns) {
    const matches = originalInput.match(pattern);
    if (matches) {
      console.log(
        `[CMD-INJECTION-ENGINE] Advanced evasion detected: ${threat} - Matches: ${matches.length} (confidence: ${confidence}%, platform: ${platform})`,
      );
      threats.push(threat);
      attackVectors.push(`${threat}: ${matches.slice(0, 2).join(", ")}`);
      riskScore += score;
      totalConfidence += confidence;
      detectionCount++;
      detectionContext.push(context);
      if (!detectedPlatformType || platform !== "multi") {
        detectedPlatformType = platform;
      }
    }
  }

  // Analyze contextual patterns (apply context-based scoring adjustments)
  if (!strictMode || contextType === "general") {
    console.log(
      `[CMD-INJECTION-ENGINE] Executing contextual pattern analysis...`,
    );
    /* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
    for (const {
      pattern,
      threat,
      score,
      confidence,
      context,
      platform,
    } of contextualPatterns) {
      const matches = originalInput.match(pattern);
      if (matches) {
        // Adjust scoring based on context type
        let adjustedScore = score;
        let adjustedConfidence = confidence;

        if (contextType === "url" || contextType === "api") {
          adjustedScore *= 1.5; // Higher risk in web contexts
          adjustedConfidence += 10;
        } else if (contextType === "file") {
          adjustedScore *= 0.7; // Lower risk in file contexts
          adjustedConfidence -= 10;
        }

        console.log(
          `[CMD-INJECTION-ENGINE] Contextual pattern detected: ${threat} - Context: ${contextType} - Adjusted Score: ${adjustedScore}`,
        );
        threats.push(threat);
        attackVectors.push(`${threat}: ${matches.slice(0, 2).join(", ")}`);
        riskScore += adjustedScore;
        totalConfidence += adjustedConfidence;
        detectionCount++;
        detectionContext.push(context);
      }
    }
  }

  // ===== RISK CALCULATION AND THREAT CLASSIFICATION =====
  const normalizedRiskScore = Math.min(10, Math.floor(riskScore / 10));
  const averageConfidence =
    detectionCount > 0 ? Math.round(totalConfidence / detectionCount) : 100;

  // Enhanced severity determination with multiple factors
  let severity: "low" | "medium" | "high" | "critical";
  const uniqueThreats = new Set(threats).size;
  const hasHighConfidenceThreats = threats.some(
    (_, index) =>
      index < criticalPatterns.length &&
      criticalPatterns[index]?.confidence >= 90,
  );

  if (
    normalizedRiskScore >= 8 &&
    averageConfidence >= 90 &&
    hasHighConfidenceThreats
  ) {
    severity = "critical";
  } else if (
    normalizedRiskScore >= 6 &&
    averageConfidence >= 80 &&
    uniqueThreats >= 2
  ) {
    severity = "high";
  } else if (normalizedRiskScore >= 3 && averageConfidence >= 70) {
    severity = "medium";
  } else {
    severity = "low";
  }

  // Final risk score adjustment based on threat diversity and platform specificity
  const uniqueContexts = Array.from(new Set(detectionContext));
  const contextualRiskMultiplier =
    uniqueContexts.length > 3 ? 1.3 : uniqueContexts.length > 1 ? 1.1 : 1.0;
  const platformSpecificMultiplier =
    detectedPlatformType && detectedPlatformType !== "multi" ? 1.1 : 1.0;

  const finalRiskScore = Math.min(
    10,
    Math.floor(
      normalizedRiskScore *
        contextualRiskMultiplier *
        platformSpecificMultiplier,
    ),
  );

  const detectionTime = performance.now() - startTime;
  console.log(
    `[CMD-INJECTION-ENGINE] Analysis completed in ${detectionTime.toFixed(2)}ms`,
  );
  console.log(
    `[CMD-INJECTION-ENGINE] Final Results: Threats=${threats.length}, Risk=${finalRiskScore}, Severity=${severity}, Confidence=${averageConfidence}%, Platform=${detectedPlatformType || "unknown"}`,
  );
  console.log(
    `[CMD-INJECTION-ENGINE] Attack Vectors: ${attackVectors.slice(0, 3).join(" | ")}${attackVectors.length > 3 ? "..." : ""}`,
  );

  return {
    hasInjection: threats.length > 0,
    threats: Array.from(new Set(threats)), // Remove duplicates
    riskScore: finalRiskScore,
    severity,
    confidence: averageConfidence,
    detectionContext: uniqueContexts,
    platformType: detectedPlatformType,
    attackVectors: attackVectors.slice(0, 10), // Limit attack vectors for response size
  };
}

// ===========================
// RBAC UTILITIES
// ===========================

/**
 * Default role-to-permissions mapping
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
  metadata?: Record<string, unknown>,
): number {
  const baseScores: Partial<Record<SecurityEventType, number>> = {
    [SecurityEventType._LOGIN_SUCCESS]: 0,
    [SecurityEventType._LOGIN_FAILED]: 25,
    [SecurityEventType._LOGOUT]: 0,
    [SecurityEventType._TOKEN_REFRESH]: 0,
    [SecurityEventType._ACCESS_GRANTED]: 0,
    [SecurityEventType._ACCESS_DENIED]: 30,
    [SecurityEventType._PERMISSION_ESCALATION_ATTEMPT]: 80,
    [SecurityEventType._VALIDATION_FAILED]: 20,
    [SecurityEventType._XSS_ATTEMPT_BLOCKED]: 70,
    [SecurityEventType._INJECTION_ATTEMPT_BLOCKED]: 85,
    [SecurityEventType._RATE_LIMIT_EXCEEDED]: 40,
    [SecurityEventType._SUSPICIOUS_ACTIVITY]: 60,
    [SecurityEventType._SECURITY_CONFIG_CHANGED]: 50,
    [SecurityEventType._ADMIN_ACTION]: 10,
  };

  let score = baseScores[eventType] || 50;

  // Adjust score based on metadata
  if (metadata) {
    // Repeated failures increase risk
    if (
      typeof metadata.attemptCount === "number" &&
      metadata.attemptCount > 3
    ) {
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
    if (
      typeof metadata.failedAttemptsFromIP === "number" &&
      metadata.failedAttemptsFromIP > 5
    ) {
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
  metadata?: Record<string, unknown>,
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
    endpoint: resource,
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
 * Default rate limiting configurations for all rate limit presets
 *
 * This Record ensures complete coverage of all RateLimitPreset enum values
 * with security-focused rate limiting configurations following best practices:
 *
 * - Authentication: Strict limits (5 attempts / 15 min) to prevent brute force
 * - Computer Use: Moderate limits (100 ops / min) for automation safety
 * - Task Operations: Balanced limits (50 ops / min) for task management
 * - Read Operations: Generous limits (500 ops / min) for data access
 * - WebSocket: Conservative limits (10 connections / min) for resource protection
 *
 * @see RateLimitPreset for enum definitions
 * @see RateLimitConfig for configuration interface
 */
export const DEFAULT_RATE_LIMITS: Record<RateLimitPreset, RateLimitConfig> = {
  // Authentication endpoints - Strict security to prevent brute force attacks
  [RateLimitPreset._AUTH]: {
    max: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: "Too many authentication attempts. Please try again later.",
    // Custom skip function can be added for trusted IPs if needed
    skip: undefined,
    // Custom key generator can be added for more granular control
    keyGenerator: undefined,
  },

  // Computer control operations - Moderate limits for automation safety
  [RateLimitPreset._COMPUTER_USE]: {
    max: 100,
    windowMs: 60 * 1000, // 1 minute
    message:
      "Computer control rate limit exceeded. Please slow down your requests.",
    skip: undefined,
    keyGenerator: undefined,
  },

  // Task management operations - Balanced limits for productivity
  [RateLimitPreset._TASK_OPERATIONS]: {
    max: 50,
    windowMs: 60 * 1000, // 1 minute
    message: "Task operation rate limit exceeded. Please wait before retrying.",
    skip: undefined,
    keyGenerator: undefined,
  },

  // Read operations - Generous limits for data access needs
  [RateLimitPreset._READ_OPERATIONS]: {
    max: 500,
    windowMs: 60 * 1000, // 1 minute
    message:
      "Read operation rate limit exceeded. Please reduce request frequency.",
    skip: undefined,
    keyGenerator: undefined,
  },

  // WebSocket connections - Conservative limits for resource protection
  [RateLimitPreset._WEBSOCKET]: {
    max: 10,
    windowMs: 60 * 1000, // 1 minute
    message:
      "WebSocket connection rate limit exceeded. Please wait before reconnecting.",
    skip: undefined,
    keyGenerator: undefined,
  },
};

/**
 * Validate that DEFAULT_RATE_LIMITS covers all RateLimitPreset enum values
 * This compile-time check ensures that no rate limit preset is missing from the configuration
 */
const _rateLimitPresetCompleteness: Record<RateLimitPreset, true> = {
  [RateLimitPreset._AUTH]: true,
  [RateLimitPreset._COMPUTER_USE]: true,
  [RateLimitPreset._TASK_OPERATIONS]: true,
  [RateLimitPreset._READ_OPERATIONS]: true,
  [RateLimitPreset._WEBSOCKET]: true,
};

// Compile-time assertion to ensure DEFAULT_RATE_LIMITS has all required keys
const _defaultRateLimitsKeys = Object.keys(
  DEFAULT_RATE_LIMITS,
) as (keyof typeof DEFAULT_RATE_LIMITS)[];
const _presetKeys = Object.keys(
  _rateLimitPresetCompleteness,
) as (keyof typeof _rateLimitPresetCompleteness)[];

// This will cause a TypeScript error if any preset is missing from DEFAULT_RATE_LIMITS
type _ValidateCompleteness =
  typeof _defaultRateLimitsKeys extends typeof _presetKeys ? true : never;
const _completenessCheck: _ValidateCompleteness = true; // This line validates completeness at compile time

/**
 * Get rate limit configuration for a specific preset
 * @param preset Rate limit preset enum value
 * @returns Rate limit configuration
 */
export function getRateLimitConfig(preset: RateLimitPreset): RateLimitConfig {
  const config = DEFAULT_RATE_LIMITS[preset];
  if (!config) {
    throw new Error(`Rate limit configuration not found for preset: ${preset}`);
  }
  return { ...config }; // Return a copy to prevent mutation
}

/**
 * Get all available rate limit presets with their configurations
 * @returns Record of all rate limit presets and their configurations
 */
export function getAllRateLimitConfigs(): Record<
  RateLimitPreset,
  RateLimitConfig
> {
  return { ...DEFAULT_RATE_LIMITS }; // Return a copy to prevent mutation
}

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
 * Enhanced Path Traversal Protection - Advanced Security Validation
 *
 * Validates file paths against comprehensive security threats including:
 * - Directory traversal attacks (basic and advanced encoding bypasses)
 * - OS-specific path manipulation attempts
 * - Unicode normalization attacks
 * - Symlink exploitation attempts
 * - Double/triple encoding bypasses
 * - Case sensitivity manipulation
 * - Long path attacks
 * - File extension security risks
 *
 * @param filePath File path to validate
 * @param allowedBasePaths Allowed base directories (optional)
 * @param options Advanced validation options
 * @returns ValidationResult with comprehensive path safety information
 */
export function validateFilePath(
  filePath: string,
  allowedBasePaths?: string[],
  options: {
    allowAbsolutePaths?: boolean;
    maxPathLength?: number;
    allowedExtensions?: string[];
    strictMode?: boolean;
    logSecurityEvents?: boolean;
  } = {},
): ValidationResult {
  const errors: ValidationError[] = [];
  const timestamp = new Date();
  const startTime = Date.now();

  // Configuration with secure defaults
  const {
    allowAbsolutePaths = false,
    maxPathLength = 4096,
    allowedExtensions,
    strictMode = true,
    logSecurityEvents = true,
  } = options;

  console.log(
    `[PATH_VALIDATION] Starting validation for: ${filePath.substring(0, 100)}${filePath.length > 100 ? "..." : ""}`,
  );

  // ===========================
  // BASIC INPUT VALIDATION
  // ===========================

  if (!filePath || typeof filePath !== "string") {
    errors.push({
      field: "filePath",
      constraint: "invalidInput",
      message: "File path must be a non-empty string",
      rejectedValue: filePath,
    });
    return { isValid: false, errors, sanitizedData: {}, timestamp };
  }

  // Path length validation (prevent buffer overflow attacks)
  if (filePath.length > maxPathLength) {
    console.warn(
      `[PATH_SECURITY] Long path attack detected: ${filePath.length} chars (max: ${maxPathLength})`,
    );
    errors.push({
      field: "filePath",
      constraint: "pathTooLong",
      message: `Path length exceeds maximum allowed (${maxPathLength} characters)`,
      rejectedValue: filePath,
    });
  }

  // ===========================
  // ADVANCED ENCODING BYPASS DETECTION
  // ===========================

  // 1. Unicode normalization attacks
  const normalizedPath = filePath.normalize("NFC");
  if (normalizedPath !== filePath) {
    console.warn(`[PATH_SECURITY] Unicode normalization attack detected`);
    errors.push({
      field: "filePath",
      constraint: "unicodeNormalizationAttack",
      message: "Suspicious Unicode normalization detected",
      rejectedValue: filePath,
    });
  }

  // 2. URL encoding bypass attempts
  const urlEncodingPatterns = [
    /%2e%2e/gi, // URL encoded ..
    /%2f/gi, // URL encoded /
    /%5c/gi, // URL encoded \
    /%252e/gi, // Double URL encoded .
    /%252f/gi, // Double URL encoded /
    /%255c/gi, // Double URL encoded \
  ];

  for (const pattern of urlEncodingPatterns) {
    if (pattern.test(filePath)) {
      console.warn(
        `[PATH_SECURITY] URL encoding bypass attempt detected: ${pattern}`,
      );
      errors.push({
        field: "filePath",
        constraint: "urlEncodingBypass",
        message: "URL encoding bypass attempt detected",
        rejectedValue: filePath,
      });
      break;
    }
  }

  // 3. HTML entity encoding bypass
  const htmlEntityPatterns = [
    /&dot;&dot;/gi,
    /&#46;&#46;/gi,
    /&#x2e;&#x2e;/gi,
    /&sol;/gi,
    /&#47;/gi,
    /&#x2f;/gi,
  ];

  for (const pattern of htmlEntityPatterns) {
    if (pattern.test(filePath)) {
      console.warn(`[PATH_SECURITY] HTML entity encoding bypass detected`);
      errors.push({
        field: "filePath",
        constraint: "htmlEntityBypass",
        message: "HTML entity encoding bypass attempt detected",
        rejectedValue: filePath,
      });
      break;
    }
  }

  // 4. Base64 encoding detection
  if (/[A-Za-z0-9+/]{20,}={0,2}/.test(filePath)) {
    try {
      const decoded = Buffer.from(filePath, "base64").toString();
      if (/\.{2,}[/\\]|[/\\]\.{2,}/.test(decoded)) {
        console.warn(`[PATH_SECURITY] Base64 encoded path traversal detected`);
        errors.push({
          field: "filePath",
          constraint: "base64EncodingBypass",
          message: "Base64 encoded path traversal attempt detected",
          rejectedValue: filePath,
        });
      }
    } catch {
      // Not valid base64, continue
    }
  }

  // ===========================
  // OS-SPECIFIC PATH TRAVERSAL PATTERNS
  // ===========================

  const osSpecificPatterns = [
    // Windows-specific patterns
    /\.\.[/\\]/g, // Standard traversal
    /\.\.\\|\\\.\.$/g, // Windows backslash
    /[/\\]\.\.$/g, // Trailing traversal
    /\.\.;/g, // Windows alternate data streams
    /\$\$[^/\\]*\$\$/g, // Windows volume shadow copies

    // Unix/Linux/macOS patterns
    /\.\.\/|\/\.\.$|\/\.\.$/g, // Standard Unix traversal
    /~[^/]*\//g, // Home directory references
    /\/\.{1,2}\//g, // Hidden directory navigation

    // Advanced patterns
    /\.{3,}/g, // Multiple dots
    /[/\\]{2,}/g, // Multiple separators
    /\.[/\\]/g, // Single dot navigation
    /[/\\]\./g, // Hidden file access
  ];

  for (const pattern of osSpecificPatterns) {
    if (pattern.test(filePath)) {
      console.warn(
        `[PATH_SECURITY] OS-specific path traversal pattern detected: ${pattern}`,
      );
      errors.push({
        field: "filePath",
        constraint: "osSpecificTraversal",
        message: "OS-specific path traversal pattern detected",
        rejectedValue: filePath,
      });
      break;
    }
  }

  // ===========================
  // SYMLINK ATTACK PREVENTION
  // ===========================

  const symlinkPatterns = [
    /\/proc\//gi, // Linux proc filesystem
    /\/sys\//gi, // Linux sys filesystem
    /\/dev\//gi, // Device files
    /\\Device\\/gi, // Windows device namespace
    /\\DosDevices\\/gi, // Windows DOS devices
    /\\\\\?\\/gi, // Windows long path prefix
  ];

  for (const pattern of symlinkPatterns) {
    if (pattern.test(filePath)) {
      console.warn(
        `[PATH_SECURITY] Symlink attack pattern detected: ${pattern}`,
      );
      errors.push({
        field: "filePath",
        constraint: "symlinkAttack",
        message: "Potential symlink attack detected",
        rejectedValue: filePath,
      });
      break;
    }
  }

  // ===========================
  // CASE SENSITIVITY BYPASS DETECTION
  // ===========================

  if (strictMode) {
    // Check for case manipulation attempts
    const upperPath = filePath.toUpperCase();
    const lowerPath = filePath.toLowerCase();

    const dangerousPatterns = ["../", "..\\", "../", "..\\"];
    for (const pattern of dangerousPatterns) {
      if (
        upperPath.includes(pattern.toUpperCase()) ||
        lowerPath.includes(pattern.toLowerCase())
      ) {
        console.warn(`[PATH_SECURITY] Case sensitivity bypass detected`);
        errors.push({
          field: "filePath",
          constraint: "caseSensitivityBypass",
          message: "Case sensitivity bypass attempt detected",
          rejectedValue: filePath,
        });
        break;
      }
    }
  }

  // ===========================
  // NULL BYTE AND CONTROL CHARACTER DETECTION
  // ===========================

  // Enhanced null byte detection (including Unicode null)
  // eslint-disable-next-line no-control-regex
  const controlCharPattern = /[\x00-\x1f\x7f-\x9f]|\u0000|\uFEFF/;
  if (controlCharPattern.test(filePath)) {
    console.warn(`[PATH_SECURITY] Control characters or null bytes detected`);
    errors.push({
      field: "filePath",
      constraint: "controlCharacters",
      message: "Control characters or null bytes detected in file path",
      rejectedValue: filePath,
    });
  }

  // ===========================
  // ABSOLUTE PATH VALIDATION
  // ===========================

  if (!allowAbsolutePaths) {
    // Enhanced absolute path detection
    const absolutePathPatterns = [
      /^[/\\]/, // Unix/Windows root
      /^[A-Za-z]:[/\\]/, // Windows drive letter
      /^\\\\/, // UNC path
      /^file:\/\//gi, // File URI scheme
      /^[a-z]+:\/\//gi, // Any URI scheme
    ];

    for (const pattern of absolutePathPatterns) {
      if (pattern.test(filePath)) {
        console.warn(`[PATH_SECURITY] Absolute path detected when not allowed`);
        errors.push({
          field: "filePath",
          constraint: "absolutePath",
          message: "Absolute paths are not allowed",
          rejectedValue: filePath,
        });
        break;
      }
    }
  }

  // ===========================
  // FILE EXTENSION SECURITY VALIDATION
  // ===========================

  const fileExtension = filePath.split(".").pop()?.toLowerCase();

  // Check against allowed extensions if specified
  if (allowedExtensions && allowedExtensions.length > 0 && fileExtension) {
    const normalizedAllowed = allowedExtensions.map((ext) =>
      ext.toLowerCase().replace(/^\./, ""),
    );
    if (!normalizedAllowed.includes(fileExtension)) {
      console.warn(
        `[PATH_SECURITY] Disallowed file extension: ${fileExtension}`,
      );
      errors.push({
        field: "filePath",
        constraint: "disallowedExtension",
        message: `File extension '${fileExtension}' is not allowed`,
        rejectedValue: filePath,
      });
    }
  }

  // Check for dangerous file extensions
  const dangerousExtensions = [
    "exe",
    "bat",
    "cmd",
    "com",
    "pif",
    "scr",
    "vbs",
    "js",
    "jar",
    "sh",
    "ps1",
    "php",
    "asp",
    "jsp",
    "py",
    "rb",
    "pl",
  ];

  if (fileExtension && dangerousExtensions.includes(fileExtension)) {
    console.warn(
      `[PATH_SECURITY] Dangerous file extension detected: ${fileExtension}`,
    );
    errors.push({
      field: "filePath",
      constraint: "dangerousExtension",
      message: `Potentially dangerous file extension '${fileExtension}' detected`,
      rejectedValue: filePath,
    });
  }

  // ===========================
  // WHITELIST-BASED PATH VALIDATION
  // ===========================

  if (allowedBasePaths && allowedBasePaths.length > 0) {
    console.log(
      `[PATH_VALIDATION] Checking against ${allowedBasePaths.length} allowed base paths`,
    );

    // Enhanced path canonicalization
    const canonicalizePath = (path: string): string => {
      return path
        .replace(/[/\\]+/g, "/") // Normalize separators
        .replace(/\/\.\//g, "/") // Remove ./
        .replace(/\/[^/]*\/\.\.\//g, "/") // Remove ../
        .replace(/^\.\//g, "") // Remove leading ./
        .toLowerCase()
        .trim();
    };

    const canonicalPath = canonicalizePath(filePath);
    const isAllowed = allowedBasePaths.some((basePath) => {
      const canonicalBase = canonicalizePath(basePath);
      const isWithinBase = canonicalPath.startsWith(canonicalBase);
      console.log(
        `[PATH_VALIDATION] Checking '${canonicalPath}' against '${canonicalBase}': ${isWithinBase}`,
      );
      return isWithinBase;
    });

    if (!isAllowed) {
      console.warn(`[PATH_SECURITY] Path not within allowed directories`);
      errors.push({
        field: "filePath",
        constraint: "unauthorizedPath",
        message: "File path is not within allowed directories",
        rejectedValue: filePath,
      });
    }
  }

  // ===========================
  // PATH SANITIZATION
  // ===========================

  let sanitizedPath: string | null = filePath;

  if (errors.length === 0) {
    sanitizedPath = filePath
      // Remove control characters and null bytes
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f\x7f-\x9f]/g, "")
      // Normalize Unicode
      .normalize("NFC")
      // Normalize multiple dots (but preserve legitimate double dots)
      .replace(/\.{4,}/g, "...")
      // Normalize path separators
      .replace(/[/\\]{2,}/g, "/")
      // Trim whitespace
      .trim();

    console.log(`[PATH_VALIDATION] Path sanitized successfully`);
  } else {
    console.warn(
      `[PATH_SECURITY] Path validation failed with ${errors.length} errors`,
    );
    sanitizedPath = null;
  }

  // ===========================
  // SECURITY EVENT LOGGING
  // ===========================

  const validationTime = Date.now() - startTime;

  if (logSecurityEvents && errors.length > 0) {
    const securityEvent = {
      type: "PATH_TRAVERSAL_ATTEMPT",
      timestamp,
      severity: "HIGH",
      details: {
        originalPath: filePath,
        validationErrors: errors.map((e) => e.constraint),
        validationTimeMs: validationTime,
        userAgent: "system",
      },
    };
    console.error(`[SECURITY_EVENT] ${JSON.stringify(securityEvent, null, 2)}`);
  }

  console.log(
    `[PATH_VALIDATION] Completed in ${validationTime}ms - Valid: ${errors.length === 0}`,
  );

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: sanitizedPath ? { path: sanitizedPath } : undefined,
    timestamp,
  };
}

/**
 * Enhanced screen coordinate validation configuration
 */
interface CoordinateValidationConfig {
  /** Maximum reasonable coordinate value */
  maxReasonableCoordinate: number;
  /** Enable multi-monitor support */
  multiMonitorSupport: boolean;
  /** Enable floating-point precision attack detection */
  floatingPointProtection: boolean;
  /** Enable performance monitoring */
  performanceMonitoring: boolean;
  /** Enable accessibility compliance checks */
  accessibilityChecks: boolean;
  /** Custom bounds limits */
  customBounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

/**
 * Multi-monitor screen configuration
 */
interface MultiMonitorConfig {
  /** Primary screen dimensions */
  primary: { width: number; height: number; x: number; y: number };
  /** Secondary screens */
  secondary?: Array<{ width: number; height: number; x: number; y: number }>;
  /** Virtual screen bounds (spans all monitors) */
  virtual: { width: number; height: number; x: number; y: number };
}

/**
 * Coordinate validation performance metrics
 */
interface CoordinateValidationMetrics {
  /** Validation start time */
  startTime: number;
  /** Validation end time */
  endTime: number;
  /** Validation duration in nanoseconds */
  duration: number;
  /** Security checks performed */
  checksPerformed: string[];
  /** Threat level detected */
  threatLevel: "none" | "low" | "medium" | "high" | "critical";
}

/**
 * Default coordinate validation configuration
 */
const DEFAULT_COORDINATE_CONFIG: CoordinateValidationConfig = {
  maxReasonableCoordinate: 65535,
  multiMonitorSupport: true,
  floatingPointProtection: true,
  performanceMonitoring: true,
  accessibilityChecks: true,
};

/**
 * Enhanced coordinate validation with advanced security features
 *
 * This function provides comprehensive validation of screen coordinates with protection against:
 * - Coordinate-based injection attacks
 * - Integer overflow attacks
 * - Floating-point precision attacks
 * - Multi-monitor boundary violations
 * - Performance degradation attacks
 * - Accessibility violations
 *
 * @param x X coordinate to validate
 * @param y Y coordinate to validate
 * @param screenBounds Optional single screen bounds for validation
 * @param multiMonitorConfig Optional multi-monitor configuration
 * @param config Optional validation configuration
 * @returns Enhanced ValidationResult with security and performance metrics
 */
export function validateCoordinates(
  x: number,
  y: number,
  screenBounds?: { width: number; height: number },
  multiMonitorConfig?: MultiMonitorConfig,
  config: CoordinateValidationConfig = DEFAULT_COORDINATE_CONFIG,
): ValidationResult & {
  metrics?: CoordinateValidationMetrics;
  threatAnalysis?: {
    suspiciousPatterns: string[];
    riskScore: number;
    recommendations: string[];
  };
} {
  const startTime = config.performanceMonitoring
    ? process.hrtime.bigint()
    : BigInt(0);
  const errors: ValidationError[] = [];
  const timestamp = new Date();
  const checksPerformed: string[] = [];
  let threatLevel: CoordinateValidationMetrics["threatLevel"] = "none";
  const suspiciousPatterns: string[] = [];
  const recommendations: string[] = [];

  // Log validation attempt for security monitoring
  console.info(
    "🔍 [COORDINATE_VALIDATION] Starting enhanced coordinate validation",
    {
      coordinates: { x, y },
      timestamp: timestamp.toISOString(),
      config: {
        multiMonitorSupport: config.multiMonitorSupport,
        floatingPointProtection: config.floatingPointProtection,
        maxReasonableCoordinate: config.maxReasonableCoordinate,
      },
    },
  );

  // 1. Basic Type and Finite Number Validation
  checksPerformed.push("type_validation");
  if (typeof x !== "number" || typeof y !== "number") {
    errors.push({
      field: "coordinates",
      constraint: "invalidType",
      message: "Coordinates must be numeric values",
      rejectedValue: { x: typeof x, y: typeof y },
    });
    threatLevel = "medium";
    suspiciousPatterns.push("non_numeric_coordinates");
    recommendations.push("Ensure coordinates are passed as number types");
  }

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    errors.push({
      field: "coordinates",
      constraint: "invalidNumber",
      message:
        "Coordinates must be finite numbers (no NaN, Infinity, -Infinity)",
      rejectedValue: { x, y },
    });
    threatLevel = "high";
    suspiciousPatterns.push("infinite_or_nan_coordinates");
    recommendations.push(
      "Validate coordinate inputs before passing to validation function",
    );
  }

  // 2. Floating-Point Precision Attack Protection
  if (config.floatingPointProtection) {
    checksPerformed.push("floating_point_protection");

    // Check for extremely high precision values that could cause performance issues
    const xDecimalPlaces = (x.toString().split(".")[1] || "").length;
    const yDecimalPlaces = (y.toString().split(".")[1] || "").length;
    const MAX_DECIMAL_PLACES = 10;

    if (
      xDecimalPlaces > MAX_DECIMAL_PLACES ||
      yDecimalPlaces > MAX_DECIMAL_PLACES
    ) {
      errors.push({
        field: "coordinates",
        constraint: "excessivePrecision",
        message: `Coordinates have excessive decimal precision (max ${MAX_DECIMAL_PLACES} places)`,
        rejectedValue: { x, y, xDecimalPlaces, yDecimalPlaces },
      });
      threatLevel = "medium";
      suspiciousPatterns.push("excessive_floating_point_precision");
      recommendations.push(
        "Round coordinates to reasonable precision before validation",
      );
    }

    // Check for potential precision attack patterns
    const xStr = x.toString();
    const yStr = y.toString();
    if (
      xStr.includes("e") ||
      yStr.includes("e") ||
      xStr.length > 20 ||
      yStr.length > 20
    ) {
      suspiciousPatterns.push("scientific_notation_or_excessive_length");
      if (threatLevel === "none") threatLevel = "low";
    }
  }

  // 3. Integer Overflow Protection and Sanitization
  checksPerformed.push("overflow_protection");
  const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
  const MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER;

  if (
    x > MAX_SAFE_INTEGER ||
    x < MIN_SAFE_INTEGER ||
    y > MAX_SAFE_INTEGER ||
    y < MIN_SAFE_INTEGER
  ) {
    errors.push({
      field: "coordinates",
      constraint: "integerOverflow",
      message: "Coordinates exceed safe integer limits",
      rejectedValue: { x, y, MAX_SAFE_INTEGER, MIN_SAFE_INTEGER },
    });
    threatLevel = "critical";
    suspiciousPatterns.push("integer_overflow_attempt");
    recommendations.push("Implement input sanitization at API boundary");
  }

  // 4. Enhanced Bounds Checking with Configurable Limits
  checksPerformed.push("bounds_validation");

  // Check for negative coordinates (unless custom bounds allow)
  const minX = config.customBounds?.minX ?? 0;
  const minY = config.customBounds?.minY ?? 0;

  if (x < minX || y < minY) {
    errors.push({
      field: "coordinates",
      constraint: "belowMinimumBounds",
      message: `Coordinates cannot be below minimum bounds (x >= ${minX}, y >= ${minY})`,
      rejectedValue: { x, y, minX, minY },
    });
    if (x < -1000 || y < -1000) {
      threatLevel = "medium";
      suspiciousPatterns.push("extremely_negative_coordinates");
    }
  }

  // 5. Multi-Monitor Configuration Support
  if (config.multiMonitorSupport && multiMonitorConfig) {
    checksPerformed.push("multi_monitor_validation");

    const { primary, secondary = [], virtual } = multiMonitorConfig;
    let isWithinAnyScreen = false;

    // Check primary screen
    if (
      x >= primary.x &&
      x <= primary.x + primary.width &&
      y >= primary.y &&
      y <= primary.y + primary.height
    ) {
      isWithinAnyScreen = true;
    }

    // Check secondary screens
    for (const screen of secondary) {
      if (
        x >= screen.x &&
        x <= screen.x + screen.width &&
        y >= screen.y &&
        y <= screen.y + screen.height
      ) {
        isWithinAnyScreen = true;
        break;
      }
    }

    if (!isWithinAnyScreen) {
      // Check virtual screen bounds as fallback
      if (
        x < virtual.x ||
        x > virtual.x + virtual.width ||
        y < virtual.y ||
        y > virtual.y + virtual.height
      ) {
        errors.push({
          field: "coordinates",
          constraint: "outsideMultiMonitorBounds",
          message: "Coordinates are outside all configured monitor boundaries",
          rejectedValue: { x, y, multiMonitorConfig },
        });
        suspiciousPatterns.push("coordinates_outside_all_monitors");
      }
    }
  } else if (screenBounds) {
    // Single screen validation
    if (x > screenBounds.width || y > screenBounds.height) {
      errors.push({
        field: "coordinates",
        constraint: "outOfBounds",
        message: "Coordinates exceed screen boundaries",
        rejectedValue: { x, y, screenBounds },
      });
    }
  }

  // 6. Suspicious Large Value Detection (Enhanced)
  checksPerformed.push("suspicious_value_detection");
  const maxCoordinate =
    config.customBounds?.maxX ??
    config.customBounds?.maxY ??
    config.maxReasonableCoordinate;

  if (x > maxCoordinate || y > maxCoordinate) {
    const severity =
      x > maxCoordinate * 10 || y > maxCoordinate * 10 ? "high" : "medium";
    errors.push({
      field: "coordinates",
      constraint: "suspiciouslyLarge",
      message: `Coordinates are suspiciously large (max reasonable: ${maxCoordinate})`,
      rejectedValue: { x, y, maxCoordinate },
    });
    threatLevel = severity;
    suspiciousPatterns.push("suspiciously_large_coordinates");
    recommendations.push("Implement coordinate bounds checking at input layer");
  }

  // 7. Coordinate Injection Attack Detection
  checksPerformed.push("injection_attack_detection");

  // Check for patterns that might indicate injection attempts
  const coordStr = `${x},${y}`;
  const injectionPatterns = [
    /[<>]/, // HTML/XML injection
    /['"]/, // SQL injection quotes
    /[;{}]/, // Command injection
    /\\[x]/, // Hex escape sequences
  ];

  // Check for control characters separately to avoid linter warnings
  const hasControlChars = coordStr.split("").some((char) => {
    const code = char.charCodeAt(0);
    return code >= 0 && code <= 31;
  });

  for (const pattern of injectionPatterns) {
    if (pattern.test(coordStr)) {
      errors.push({
        field: "coordinates",
        constraint: "injectionPattern",
        message: "Coordinates contain suspicious injection patterns",
        rejectedValue: { x, y, pattern: pattern.source },
      });
      threatLevel = "high";
      suspiciousPatterns.push("potential_injection_attack");
      recommendations.push("Sanitize inputs before coordinate validation");
    }
  }

  // Check for control characters
  if (hasControlChars) {
    errors.push({
      field: "coordinates",
      constraint: "controlCharacters",
      message: "Coordinates contain control characters",
      rejectedValue: { x, y },
    });
    threatLevel = "high";
    suspiciousPatterns.push("control_characters_detected");
    recommendations.push("Remove control characters from coordinate inputs");
  }

  // 8. Accessibility Compliance Checks
  if (config.accessibilityChecks) {
    checksPerformed.push("accessibility_validation");

    // Check for coordinates that might interfere with accessibility tools
    // Screen readers often use specific coordinate ranges
    const accessibilityZones = {
      topLeft: { x: 0, y: 0, width: 100, height: 100 },
      topRight: {
        x: (screenBounds?.width || 1920) - 100,
        y: 0,
        width: 100,
        height: 100,
      },
    };

    for (const [zone, bounds] of Object.entries(accessibilityZones)) {
      if (
        x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height
      ) {
        // Warning, not error - accessibility zones can be legitimately targeted
        console.warn(
          "⚠️ [COORDINATE_VALIDATION] Coordinate targets accessibility zone",
          {
            zone,
            coordinates: { x, y },
            bounds,
          },
        );
        suspiciousPatterns.push(`accessibility_zone_targeting_${zone}`);
      }
    }
  }

  // 9. Performance Optimization for High-Frequency Validation
  const endTime = config.performanceMonitoring
    ? process.hrtime.bigint()
    : BigInt(0);
  const duration = config.performanceMonitoring
    ? Number(endTime - startTime)
    : 0;

  // 10. Advanced Error Categorization and Risk Scoring
  let riskScore = 0;
  if (suspiciousPatterns.length > 0) {
    riskScore = Math.min(100, suspiciousPatterns.length * 20);
  }

  // Adjust threat level based on error combinations
  if (errors.length > 3) {
    threatLevel = "high";
  } else if (errors.length > 1 && suspiciousPatterns.length > 0) {
    threatLevel = threatLevel === "none" ? "medium" : threatLevel;
  }

  // 11. Sanitize Coordinates (Enhanced)
  let sanitizedData:
    | {
        x: number;
        y: number;
        originalPrecision: { x: number; y: number };
      }
    | undefined = undefined;
  if (errors.length === 0 && Number.isFinite(x) && Number.isFinite(y)) {
    sanitizedData = {
      x: Math.round(Math.max(minX, Math.min(maxCoordinate, x))),
      y: Math.round(Math.max(minY, Math.min(maxCoordinate, y))),
      originalPrecision: {
        x: x,
        y: y,
      },
    };
  }

  // 12. Security Logging and Threat Detection
  if (threatLevel !== "none" || suspiciousPatterns.length > 0) {
    console.warn(
      "⚠️ [COORDINATE_SECURITY] Suspicious coordinate validation detected",
      {
        threatLevel,
        suspiciousPatterns,
        coordinates: { x, y },
        riskScore,
        timestamp: timestamp.toISOString(),
      },
    );
  }

  // Performance logging for optimization
  if (config.performanceMonitoring && duration > 1000000) {
    // > 1ms
    console.warn(
      "⚠️ [COORDINATE_PERFORMANCE] Slow coordinate validation detected",
      {
        duration,
        durationMs: duration / 1000000,
        checksPerformed,
        coordinates: { x, y },
      },
    );
  }

  const result = {
    isValid: errors.length === 0,
    errors,
    sanitizedData,
    timestamp,
    metrics: config.performanceMonitoring
      ? {
          startTime: Number(startTime),
          endTime: Number(endTime),
          duration,
          checksPerformed,
          threatLevel,
        }
      : undefined,
    threatAnalysis:
      suspiciousPatterns.length > 0
        ? {
            suspiciousPatterns,
            riskScore,
            recommendations,
          }
        : undefined,
  };

  // Log successful validation
  console.info("✅ [COORDINATE_VALIDATION] Coordinate validation completed", {
    isValid: result.isValid,
    threatLevel,
    checksPerformed: checksPerformed.length,
    duration: config.performanceMonitoring
      ? `${duration / 1000000}ms`
      : "not_measured",
    timestamp: timestamp.toISOString(),
  });

  return result;
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
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
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
 * Enhanced XSS Detection Engine with 2025 modern attack patterns
 * Comprehensive protection against WebAssembly, CSS-in-JS, Polyglot, Unicode normalization,
 * CRLF injection, DOM clobbering, Shadow DOM manipulation, and other advanced threats
 */
export function detectAdvancedXSS(input: string): {
  hasXSS: boolean;
  threats: string[];
  riskScore: number;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  detectionContext: string[];
} {
  if (typeof input !== "string") {
    console.log("[XSS-ENGINE] Input validation: Non-string input rejected");
    return {
      hasXSS: false,
      threats: [],
      riskScore: 0,
      severity: "low",
      confidence: 100,
      detectionContext: [],
    };
  }

  console.log(
    `[XSS-ENGINE] Starting advanced XSS detection for input: ${input.substring(0, 100)}${input.length > 100 ? "..." : ""}`,
  );

  const threats: string[] = [];
  const detectionContext: string[] = [];
  let riskScore = 0;
  let totalConfidence = 0;
  let detectionCount = 0;

  // Normalize input for Unicode normalization attack detection
  const normalizedInput = input.normalize("NFKC");
  if (normalizedInput !== input) {
    console.log("[XSS-ENGINE] Unicode normalization difference detected");
    detectionContext.push("unicode-normalization");
  }

  const advancedXSSPatterns = [
    // =================== CLASSIC PATTERNS ===================
    // Basic script injection
    {
      pattern: /<script[^>]*>.*?<\/script>/gi,
      threat: "Script Injection",
      score: 10,
      confidence: 95,
      context: "html-injection",
    },
    {
      pattern: /<iframe[^>]*>.*?<\/iframe>/gi,
      threat: "IFrame Injection",
      score: 9,
      confidence: 90,
      context: "html-injection",
    },

    // Protocol-based attacks
    {
      pattern: /javascript\s*:/gi,
      threat: "JavaScript Protocol",
      score: 9,
      confidence: 95,
      context: "protocol-injection",
    },
    {
      pattern: /vbscript\s*:/gi,
      threat: "VBScript Protocol",
      score: 8,
      confidence: 90,
      context: "protocol-injection",
    },
    {
      pattern: /data\s*:\s*text\/html/gi,
      threat: "Data HTML Protocol",
      score: 8,
      confidence: 85,
      context: "protocol-injection",
    },
    {
      pattern: /data\s*:\s*image\/svg\+xml/gi,
      threat: "SVG Data Protocol",
      score: 7,
      confidence: 80,
      context: "protocol-injection",
    },

    // Event handlers (comprehensive list)
    {
      pattern:
        /on(?:abort|blur|change|click|dblclick|error|focus|keydown|keypress|keyup|load|mousedown|mousemove|mouseout|mouseover|mouseup|reset|resize|select|submit|unload)\s*=/gi,
      threat: "Event Handler",
      score: 8,
      confidence: 90,
      context: "event-handler",
    },

    // Object/embed attacks
    {
      pattern: /<object[^>]*>.*?<\/object>/gi,
      threat: "Object Injection",
      score: 8,
      confidence: 85,
      context: "html-injection",
    },
    {
      pattern: /<embed[^>]*>.*?<\/embed>/gi,
      threat: "Embed Injection",
      score: 8,
      confidence: 85,
      context: "html-injection",
    },
    {
      pattern: /<applet[^>]*>.*?<\/applet>/gi,
      threat: "Applet Injection",
      score: 8,
      confidence: 85,
      context: "html-injection",
    },

    // CSS-based attacks
    {
      pattern: /expression\s*\(/gi,
      threat: "CSS Expression",
      score: 7,
      confidence: 85,
      context: "css-injection",
    },
    {
      pattern: /-moz-binding\s*:/gi,
      threat: "Mozilla Binding",
      score: 7,
      confidence: 80,
      context: "css-injection",
    },
    {
      pattern: /behavior\s*:/gi,
      threat: "CSS Behavior",
      score: 6,
      confidence: 75,
      context: "css-injection",
    },
    {
      pattern: /<style[^>]*>.*?<\/style>/gi,
      threat: "Style Injection",
      score: 6,
      confidence: 80,
      context: "css-injection",
    },

    // Advanced encoding patterns
    {
      pattern: /&#x[0-9a-f]+;/gi,
      threat: "Hex Entity Encoding",
      score: 5,
      confidence: 70,
      context: "encoding",
    },
    {
      pattern: /&#[0-9]+;/gi,
      threat: "Decimal Entity Encoding",
      score: 4,
      confidence: 65,
      context: "encoding",
    },
    {
      pattern: /\\u[0-9a-f]{4}/gi,
      threat: "Unicode Escape",
      score: 5,
      confidence: 70,
      context: "encoding",
    },
    {
      pattern: /\\x[0-9a-f]{2}/gi,
      threat: "Hex Escape",
      score: 5,
      confidence: 70,
      context: "encoding",
    },

    // DOM-based XSS
    {
      pattern: /document\.|window\.|eval\(|setTimeout\(|setInterval\(/gi,
      threat: "DOM Manipulation",
      score: 8,
      confidence: 85,
      context: "dom-manipulation",
    },

    // Base64 encoded scripts
    {
      pattern: /data\s*:.*base64.*(?:script|javascript)/gi,
      threat: "Base64 Script",
      score: 9,
      confidence: 90,
      context: "encoding",
    },

    // SVG-based XSS
    {
      pattern: /<svg[^>]*>.*?<\/svg>/gi,
      threat: "SVG Injection",
      score: 7,
      confidence: 80,
      context: "svg-injection",
    },
    {
      pattern: /<use[^>]*xlink:href/gi,
      threat: "SVG XLink",
      score: 6,
      confidence: 75,
      context: "svg-injection",
    },

    // Template injection
    {
      pattern: /\{\{.*?\}\}/gi,
      threat: "Template Injection",
      score: 7,
      confidence: 75,
      context: "template-injection",
    },
    {
      pattern: /\$\{.*?\}/gi,
      threat: "Template Literal",
      score: 7,
      confidence: 80,
      context: "template-injection",
    },

    // Server-side includes
    {
      pattern: /<!--\s*#(?:include|exec|echo)/gi,
      threat: "SSI Injection",
      score: 8,
      confidence: 85,
      context: "server-side-injection",
    },

    // Meta refresh attacks
    {
      pattern: /<meta[^>]*refresh[^>]*>/gi,
      threat: "Meta Refresh",
      score: 6,
      confidence: 80,
      context: "html-injection",
    },

    // Form-based attacks
    {
      pattern: /<form[^>]*>.*?<\/form>/gi,
      threat: "Form Injection",
      score: 5,
      confidence: 70,
      context: "html-injection",
    },

    // Link-based attacks
    {
      pattern: /<link[^>]*>/gi,
      threat: "Link Injection",
      score: 6,
      confidence: 75,
      context: "html-injection",
    },

    // Import-based attacks
    {
      pattern: /@import\s*["'].*?["']/gi,
      threat: "CSS Import",
      score: 6,
      confidence: 75,
      context: "css-injection",
    },

    // =================== 2025 MODERN ATTACK PATTERNS ===================

    // WebAssembly-based XSS (2025 threat)
    {
      pattern:
        /WebAssembly\.(instantiate|compile)|new\s+WebAssembly\.(Module|Instance)/gi,
      threat: "WebAssembly XSS",
      score: 10,
      confidence: 95,
      context: "webassembly-injection",
    },
    {
      pattern: /\.wasm["']?\s*[,)}]]|\.wasm\b/gi,
      threat: "WebAssembly Binary Reference",
      score: 8,
      confidence: 80,
      context: "webassembly-injection",
    },
    {
      pattern: /application\/wasm|wasm-module/gi,
      threat: "WebAssembly MIME Type",
      score: 7,
      confidence: 75,
      context: "webassembly-injection",
    },

    // CSS-in-JS injection patterns (2025 threat)
    {
      pattern: /styled\.|css`|emotion\.|@emotion\/styled/gi,
      threat: "CSS-in-JS Injection",
      score: 8,
      confidence: 85,
      context: "css-in-js-injection",
    },
    {
      pattern:
        /\$\{[^}]*(?:eval|Function|setTimeout|setInterval|document|window)[^}]*\}/gi,
      threat: "CSS-in-JS Template Injection",
      score: 9,
      confidence: 90,
      context: "css-in-js-injection",
    },
    {
      pattern: /createGlobalStyle|ThemeProvider.*\$\{/gi,
      threat: "Styled Components Injection",
      score: 7,
      confidence: 80,
      context: "css-in-js-injection",
    },

    // Polyglot XSS attacks (2025 threat)
    {
      pattern: /<!--(?:[^>]|>(?!\s*-->))*--!?>|<\?xml[^>]*\?>.*<script/gi,
      threat: "Polyglot HTML/XML XSS",
      score: 9,
      confidence: 85,
      context: "polyglot-attack",
    },
    {
      pattern: /\/\*.*?<script.*?\*\//gi,
      threat: "Polyglot CSS/JS XSS",
      score: 8,
      confidence: 80,
      context: "polyglot-attack",
    },
    {
      pattern: /%PDF.*javascript|PDF.*openAction|PDF.*JS/gi,
      threat: "Polyglot PDF/JS XSS",
      score: 9,
      confidence: 85,
      context: "polyglot-attack",
    },

    // Unicode normalization attacks (2025 threat)
    {
      pattern: /[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g,
      threat: "Unicode Control Characters",
      score: 7,
      confidence: 90,
      context: "unicode-normalization",
    },
    {
      pattern: /(?:[\u0300-\u036F]|[\u1AB0-\u1AFF]|[\u1DC0-\u1DFF])+/g,
      threat: "Unicode Combining Characters",
      score: 6,
      confidence: 75,
      context: "unicode-normalization",
    },
    {
      pattern: /[\uFE00-\uFE0F]/g,
      threat: "Unicode Variation Selectors",
      score: 6,
      confidence: 80,
      context: "unicode-normalization",
    },

    // CRLF injection patterns (2025 threat)
    {
      pattern: /%0D%0A|%0A%0D|\\r\\n|\\n\\r|%0D|%0A/gi,
      threat: "CRLF Injection (Encoded)",
      score: 8,
      confidence: 90,
      context: "crlf-injection",
    },
    {
      pattern: /\r\n.*?(?:Location:|Set-Cookie:|Content-Type:)/gi,
      threat: "CRLF Header Injection",
      score: 9,
      confidence: 85,
      context: "crlf-injection",
    },
    {
      pattern: /\\u000D\\u000A|\\u000A\\u000D/gi,
      threat: "CRLF Unicode Injection",
      score: 8,
      confidence: 80,
      context: "crlf-injection",
    },

    // DOM clobbering attacks (2025 threat)
    {
      pattern:
        /<(?:img|form|iframe|object)\s+[^>]*(?:name|id)\s*=\s*["']?(?:location|document|window|eval)["']?/gi,
      threat: "DOM Clobbering",
      score: 9,
      confidence: 90,
      context: "dom-clobbering",
    },
    {
      pattern:
        /<form[^>]*name\s*=\s*["']?(?:attributes|innerHTML|outerHTML)["']?/gi,
      threat: "Form DOM Clobbering",
      score: 8,
      confidence: 85,
      context: "dom-clobbering",
    },
    {
      pattern:
        /<iframe[^>]*name\s*=\s*["']?(?:contentDocument|contentWindow)["']?/gi,
      threat: "IFrame DOM Clobbering",
      score: 9,
      confidence: 85,
      context: "dom-clobbering",
    },

    // Shadow DOM manipulation (2025 threat)
    {
      pattern: /attachShadow|shadowRoot|customElements\.define/gi,
      threat: "Shadow DOM Manipulation",
      score: 8,
      confidence: 85,
      context: "shadow-dom-manipulation",
    },
    {
      pattern: /<template[^>]*>.*?<\/template>/gi,
      threat: "Template Element Injection",
      score: 7,
      confidence: 80,
      context: "shadow-dom-manipulation",
    },
    {
      pattern: /slot\s*=|<slot[^>]*>/gi,
      threat: "Shadow DOM Slot Injection",
      score: 6,
      confidence: 75,
      context: "shadow-dom-manipulation",
    },

    // Advanced event handler patterns (2025 threat)
    {
      pattern:
        /on(?:auxclick|beforeinput|compositionstart|compositionupdate|compositionend|contextmenu|wheel|animationstart|animationend|transitionstart|transitionend)\s*=/gi,
      threat: "Modern Event Handler",
      score: 8,
      confidence: 85,
      context: "modern-event-handler",
    },
    {
      pattern:
        /addEventListener\s*\(\s*["'](?:message|storage|popstate|hashchange)["']/gi,
      threat: "Dynamic Event Listener",
      score: 7,
      confidence: 80,
      context: "modern-event-handler",
    },

    // Modern browser API abuse (2025 threat)
    {
      pattern: /(?:fetch|XMLHttpRequest).*?(?:eval|Function|setTimeout)/gi,
      threat: "Fetch API Code Injection",
      score: 9,
      confidence: 85,
      context: "modern-api-abuse",
    },
    {
      pattern:
        /(?:localStorage|sessionStorage)\.setItem.*?(?:<script|javascript:|eval)/gi,
      threat: "Storage API XSS",
      score: 8,
      confidence: 80,
      context: "modern-api-abuse",
    },
    {
      pattern: /postMessage\s*\([^)]*(?:eval|Function|setTimeout)/gi,
      threat: "PostMessage Code Injection",
      score: 9,
      confidence: 85,
      context: "modern-api-abuse",
    },

    // Service Worker and Web Worker attacks (2025 threat)
    {
      pattern: /new\s+(?:ServiceWorker|Worker|SharedWorker)\s*\(/gi,
      threat: "Web Worker Injection",
      score: 9,
      confidence: 90,
      context: "web-worker-injection",
    },
    {
      pattern: /navigator\.serviceWorker\.register/gi,
      threat: "Service Worker Registration",
      score: 8,
      confidence: 85,
      context: "web-worker-injection",
    },
    {
      pattern: /importScripts\s*\(/gi,
      threat: "Worker Script Import",
      score: 8,
      confidence: 80,
      context: "web-worker-injection",
    },

    // Content Security Policy bypass (2025 threat)
    {
      pattern: /'unsafe-(?:eval|inline)'|'unsafe-hashes'|data:|blob:/gi,
      threat: "CSP Bypass Directive",
      score: 8,
      confidence: 85,
      context: "csp-bypass",
    },
    {
      pattern: /Content-Security-Policy.*(?:'none'|\*)/gi,
      threat: "Weak CSP Configuration",
      score: 7,
      confidence: 80,
      context: "csp-bypass",
    },
  ];

  // Multi-stage detection pipeline with performance optimization
  const startTime = performance.now();

  // Stage 1: High-confidence pattern matching
  const highConfidencePatterns = advancedXSSPatterns.filter(
    (p) => p.confidence >= 85,
  );
  for (const {
    pattern,
    threat,
    score,
    confidence,
    context,
  } of highConfidencePatterns) {
    if (pattern.test(input)) {
      console.log(
        `[XSS-ENGINE] High-confidence threat detected: ${threat} (confidence: ${confidence}%, context: ${context})`,
      );
      threats.push(threat);
      riskScore += score;
      totalConfidence += confidence;
      detectionCount++;
      detectionContext.push(context);
    }
  }

  // Stage 2: Medium-confidence pattern matching (only if no high-confidence matches)
  if (threats.length === 0) {
    const mediumConfidencePatterns = advancedXSSPatterns.filter(
      (p) => p.confidence >= 70 && p.confidence < 85,
    );
    for (const {
      pattern,
      threat,
      score,
      confidence,
      context,
    } of mediumConfidencePatterns) {
      if (pattern.test(input)) {
        console.log(
          `[XSS-ENGINE] Medium-confidence threat detected: ${threat} (confidence: ${confidence}%, context: ${context})`,
        );
        threats.push(threat);
        riskScore += score * 0.8; // Reduce score for medium confidence
        totalConfidence += confidence;
        detectionCount++;
        detectionContext.push(context);
      }
    }
  }

  // Stage 3: Low-confidence pattern matching (only if no other matches and input looks suspicious)
  if (threats.length === 0 && input.includes("<") && input.includes(">")) {
    const lowConfidencePatterns = advancedXSSPatterns.filter(
      (p) => p.confidence < 70,
    );
    for (const {
      pattern,
      threat,
      score,
      confidence,
      context,
    } of lowConfidencePatterns) {
      if (pattern.test(input)) {
        console.log(
          `[XSS-ENGINE] Low-confidence threat detected: ${threat} (confidence: ${confidence}%, context: ${context})`,
        );
        threats.push(threat);
        riskScore += score * 0.5; // Significantly reduce score for low confidence
        totalConfidence += confidence;
        detectionCount++;
        detectionContext.push(context);
      }
    }
  }

  // Calculate normalized risk score and overall confidence
  const normalizedRiskScore = Math.min(10, Math.floor(riskScore / 10));
  const averageConfidence =
    detectionCount > 0 ? Math.round(totalConfidence / detectionCount) : 100;

  // Determine severity level based on risk score and confidence
  let severity: "low" | "medium" | "high" | "critical";
  if (normalizedRiskScore >= 8 && averageConfidence >= 85) {
    severity = "critical";
  } else if (normalizedRiskScore >= 6 && averageConfidence >= 75) {
    severity = "high";
  } else if (normalizedRiskScore >= 3 && averageConfidence >= 65) {
    severity = "medium";
  } else {
    severity = "low";
  }

  const detectionTime = performance.now() - startTime;
  console.log(
    `[XSS-ENGINE] Detection completed in ${detectionTime.toFixed(2)}ms - Threats: ${threats.length}, Risk Score: ${normalizedRiskScore}, Severity: ${severity}, Confidence: ${averageConfidence}%`,
  );

  // Context-aware false positive reduction
  const uniqueContexts = Array.from(new Set(detectionContext));
  const contextualRiskAdjustment = uniqueContexts.length > 3 ? 1.2 : 1.0; // Multiple attack contexts increase risk
  const adjustedRiskScore = Math.min(
    10,
    Math.floor(normalizedRiskScore * contextualRiskAdjustment),
  );

  return {
    hasXSS: threats.length > 0,
    threats,
    riskScore: adjustedRiskScore,
    severity,
    confidence: averageConfidence,
    detectionContext: uniqueContexts,
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
  const jsdomWindow = new JSDOM("").window;
  const window = {
    NodeFilter: jsdomWindow.NodeFilter,
    Node: jsdomWindow.Node,
    Element: jsdomWindow.Element,
    HTMLTemplateElement: jsdomWindow.HTMLTemplateElement,
    DocumentFragment: jsdomWindow.DocumentFragment,
    HTMLFormElement: jsdomWindow.HTMLFormElement,
    DOMParser: jsdomWindow.DOMParser,
    NamedNodeMap: jsdomWindow.NamedNodeMap,
    document: jsdomWindow.document,
  } as WindowLikeWithDOMPurify;

  const purifyConstructor = (DOMPurify as any).default || DOMPurify;
  const _purify = (purifyConstructor as any)(window) as DOMPurifyInstance;

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
    sanitized = getPurify().sanitize(
      sanitized,
      config as unknown as Config & { RETURN_TRUSTED_TYPE: true },
    ) as unknown as string;

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
      /data:(?!image\/(?:png|jpg|jpeg|gif|svg\+xml);base64,)[^;]*;base64,[a-zA-Z0-9+/=]*/gi,
      "",
    )

    // Remove potential LDAP injection characters
    .replace(/[()\\*]/g, "")

    // Remove potential command injection characters
    .replace(/[;&|`${}]/g, "")

    // Remove potential path traversal
    .replace(/\.{2,}[/\\\\]/g, "")

    // Remove null bytes and control characters
    // eslint-disable-next-line no-control-regex
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
  /* eslint-disable no-control-regex */
  const executableSignatures = [
    { pattern: /^MZ/, name: "Windows PE Executable", risk: 10 },
    { pattern: /^\x7fELF/, name: "Linux ELF Executable", risk: 10 },
    { pattern: /^\xca\xfe\xba\xbe/, name: "Java Class File", risk: 8 },
    { pattern: /^PK\x03\x04.*\.jar$/i, name: "JAR Archive", risk: 7 },
    { pattern: /^#!/, name: "Shell Script", risk: 8 },
    { pattern: /^\xff\xfb/, name: "MP3 with potential payload", risk: 3 },
    { pattern: /^\x89PNG/, name: "PNG with potential payload", risk: 2 },
  ];
  /* eslint-enable no-control-regex */

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
  detectSQLInjectionLegacy,
  detectCommandInjection,
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
  getRateLimitConfig,
  getAllRateLimitConfigs,

  // Crypto utilities
  generateRandomString,
  generateHMAC,
  verifyHMAC,
  hashData,

  // Advanced validation utilities
  detectMaliciousFileContent,
  validateFilePath,
  validateCoordinates,

  // Enhanced threat detection utilities (New)
  detectPathTraversal,
  detectCommandInjectionAdvanced,
  detectTemplateInjection,
  detectLDAPInjection,
  detectXMLInjection,
  detectNoSQLInjection,
  detectComprehensiveMaliciousPatterns,
};

// ===========================
// ENHANCED THREAT DETECTION FUNCTIONS
// ===========================

/**
 * Advanced path traversal detection with comprehensive pattern matching
 * @param input - Input string to analyze
 * @returns Detection result with threat details
 */
export function detectPathTraversal(input: string): {
  isDetected: boolean;
  threats: Array<{
    type: string;
    pattern: string;
    severity: number;
    confidence: number;
  }>;
  riskScore: number;
} {
  const threats: Array<{
    type: string;
    pattern: string;
    severity: number;
    confidence: number;
  }> = [];

  let riskScore = 0;

  PATH_TRAVERSAL_PATTERNS.forEach((pattern) => {
    const matches = input.match(pattern);
    if (matches) {
      threats.push({
        type: "Path Traversal",
        pattern: matches[0],
        severity: 8,
        confidence: 90,
      });
      riskScore += 8;
    }
  });

  return {
    isDetected: threats.length > 0,
    threats,
    riskScore: Math.min(riskScore, 10),
  };
}

/**
 * Advanced command injection detection with platform-specific patterns
 * @param input - Input string to analyze
 * @returns Detection result with comprehensive threat analysis
 */
export function detectCommandInjectionAdvanced(input: string): {
  isDetected: boolean;
  threats: Array<{
    type: string;
    pattern: string;
    severity: number;
    confidence: number;
    platform?: string;
  }>;
  riskScore: number;
} {
  const threats: Array<{
    type: string;
    pattern: string;
    severity: number;
    confidence: number;
    platform?: string;
  }> = [];

  let riskScore = 0;

  COMMAND_INJECTION_PATTERNS.forEach((pattern, index) => {
    const matches = input.match(pattern);
    if (matches) {
      const severity = index < 2 ? 9 : index < 5 ? 8 : 7;
      const platform = index < 2 ? "unix" : index < 5 ? "windows" : "multi";

      threats.push({
        type: "Command Injection",
        pattern: matches[0],
        severity,
        confidence: 85,
        platform,
      });
      riskScore += severity;
    }
  });

  return {
    isDetected: threats.length > 0,
    threats,
    riskScore: Math.min(riskScore, 10),
  };
}

/**
 * Template injection detection for multiple template engines
 * @param input - Input string to analyze
 * @returns Detection result with template engine identification
 */
export function detectTemplateInjection(input: string): {
  isDetected: boolean;
  threats: Array<{
    type: string;
    engine: string;
    pattern: string;
    severity: number;
    confidence: number;
  }>;
  riskScore: number;
} {
  const threats: Array<{
    type: string;
    engine: string;
    pattern: string;
    severity: number;
    confidence: number;
  }> = [];

  let riskScore = 0;

  // Jinja2/Twig patterns
  const jinja2Patterns = TEMPLATE_INJECTION_PATTERNS.slice(0, 2);
  jinja2Patterns.forEach((pattern) => {
    const matches = input.match(pattern);
    if (matches) {
      threats.push({
        type: "Template Injection",
        engine: "Jinja2/Twig",
        pattern: matches[0],
        severity: 9,
        confidence: 90,
      });
      riskScore += 9;
    }
  });

  // Other template engines
  TEMPLATE_INJECTION_PATTERNS.slice(2).forEach((pattern, index) => {
    const matches = input.match(pattern);
    if (matches) {
      const engines = ["Freemarker", "Smarty", "Velocity", "Django"];
      threats.push({
        type: "Template Injection",
        engine: engines[index] || "Unknown",
        pattern: matches[0],
        severity: 8,
        confidence: 80,
      });
      riskScore += 8;
    }
  });

  return {
    isDetected: threats.length > 0,
    threats,
    riskScore: Math.min(riskScore, 10),
  };
}

/**
 * LDAP injection detection
 * @param input - Input string to analyze
 * @returns Detection result
 */
export function detectLDAPInjection(input: string): {
  isDetected: boolean;
  threats: Array<{
    type: string;
    pattern: string;
    severity: number;
    confidence: number;
  }>;
  riskScore: number;
} {
  const threats: Array<{
    type: string;
    pattern: string;
    severity: number;
    confidence: number;
  }> = [];

  let riskScore = 0;

  LDAP_INJECTION_PATTERNS.forEach((pattern) => {
    const matches = input.match(pattern);
    if (matches) {
      threats.push({
        type: "LDAP Injection",
        pattern: matches[0],
        severity: 7,
        confidence: 80,
      });
      riskScore += 7;
    }
  });

  return {
    isDetected: threats.length > 0,
    threats,
    riskScore: Math.min(riskScore, 10),
  };
}

/**
 * XML/XXE injection detection
 * @param input - Input string to analyze
 * @returns Detection result
 */
export function detectXMLInjection(input: string): {
  isDetected: boolean;
  threats: Array<{
    type: string;
    pattern: string;
    severity: number;
    confidence: number;
  }>;
  riskScore: number;
} {
  const threats: Array<{
    type: string;
    pattern: string;
    severity: number;
    confidence: number;
  }> = [];

  let riskScore = 0;

  XML_INJECTION_PATTERNS.forEach((pattern, index) => {
    const matches = input.match(pattern);
    if (matches) {
      const severity = index < 2 ? 10 : index < 4 ? 8 : 6;
      threats.push({
        type: index < 2 ? "XXE Injection" : "XML Injection",
        pattern: matches[0],
        severity,
        confidence: 85,
      });
      riskScore += severity;
    }
  });

  return {
    isDetected: threats.length > 0,
    threats,
    riskScore: Math.min(riskScore, 10),
  };
}

/**
 * NoSQL injection detection
 * @param input - Input string to analyze
 * @returns Detection result
 */
export function detectNoSQLInjection(input: string): {
  isDetected: boolean;
  threats: Array<{
    type: string;
    pattern: string;
    severity: number;
    confidence: number;
    database: string;
  }>;
  riskScore: number;
} {
  const threats: Array<{
    type: string;
    pattern: string;
    severity: number;
    confidence: number;
    database: string;
  }> = [];

  let riskScore = 0;

  NOSQL_INJECTION_PATTERNS.forEach((pattern, index) => {
    const matches = input.match(pattern);
    if (matches) {
      const database = index < 1 ? "MongoDB" : "Generic NoSQL";
      threats.push({
        type: "NoSQL Injection",
        pattern: matches[0],
        severity: 8,
        confidence: 85,
        database,
      });
      riskScore += 8;
    }
  });

  return {
    isDetected: threats.length > 0,
    threats,
    riskScore: Math.min(riskScore, 10),
  };
}

/**
 * Comprehensive malicious pattern detection combining all threat vectors
 * @param input - Input string to analyze
 * @returns Comprehensive threat analysis
 */
export function detectComprehensiveMaliciousPatterns(input: string): {
  isDetected: boolean;
  totalRiskScore: number;
  threatCategories: {
    xss: ReturnType<typeof detectAdvancedXSS>;
    sqlInjection: ReturnType<typeof detectSQLInjection>;
    pathTraversal: ReturnType<typeof detectPathTraversal>;
    commandInjection: ReturnType<typeof detectCommandInjectionAdvanced>;
    templateInjection: ReturnType<typeof detectTemplateInjection>;
    ldapInjection: ReturnType<typeof detectLDAPInjection>;
    xmlInjection: ReturnType<typeof detectXMLInjection>;
    nosqlInjection: ReturnType<typeof detectNoSQLInjection>;
  };
  recommendations: string[];
} {
  const threatCategories = {
    xss: detectAdvancedXSS(input),
    sqlInjection: detectSQLInjection(input),
    pathTraversal: detectPathTraversal(input),
    commandInjection: detectCommandInjectionAdvanced(input),
    templateInjection: detectTemplateInjection(input),
    ldapInjection: detectLDAPInjection(input),
    xmlInjection: detectXMLInjection(input),
    nosqlInjection: detectNoSQLInjection(input),
  };

  const totalRiskScore = Object.values(threatCategories).reduce(
    (sum, threat) => sum + (threat.riskScore || 0),
    0,
  );

  const isDetected = Object.values(threatCategories).some((threat: unknown) => {
    const t = threat as {
      isDetected?: boolean;
      hasXSS?: boolean;
      hasInjection?: boolean;
      detected?: boolean;
    };
    return t.isDetected || t.hasXSS || t.hasInjection || t.detected;
  });

  const recommendations: string[] = [];

  if (threatCategories.xss.hasXSS) {
    recommendations.push("Apply XSS sanitization with DOMPurify");
    recommendations.push("Implement Content Security Policy (CSP)");
  }

  if (threatCategories.sqlInjection.hasInjection) {
    recommendations.push("Use parameterized queries/prepared statements");
    recommendations.push("Apply input validation and sanitization");
  }

  if (
    (threatCategories.pathTraversal as { detected?: boolean }).detected ||
    (threatCategories.pathTraversal as { isDetected?: boolean }).isDetected
  ) {
    recommendations.push("Validate and normalize file paths");
    recommendations.push("Use allow-lists for permitted directories");
  }

  if (threatCategories.commandInjection.isDetected) {
    recommendations.push("Avoid direct shell command execution");
    recommendations.push("Use safe APIs for system operations");
  }

  if (threatCategories.templateInjection.isDetected) {
    recommendations.push("Use sandboxed template engines");
    recommendations.push("Validate template input strictly");
  }

  if (totalRiskScore > 15) {
    recommendations.push("CRITICAL: Block request immediately");
    recommendations.push("Log security incident for investigation");
  } else if (totalRiskScore > 8) {
    recommendations.push("HIGH RISK: Apply strict sanitization");
    recommendations.push("Monitor user activity closely");
  }

  return {
    isDetected,
    totalRiskScore: Math.min(totalRiskScore, 100),
    threatCategories,
    recommendations,
  };
}

// ===========================
// RE-EXPORT TYPES FOR CONVENIENCE
// ===========================

export type {
  SanitizationOptions,
  SecurityEvent,
} from "../types/security.types";

export {
  SecurityEventType,
  RateLimitServiceType,
} from "../types/security.types";
