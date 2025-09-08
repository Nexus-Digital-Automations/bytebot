/**
 * Client-safe exports for @bytebot/shared package
 *
 * This entry point only includes utilities and types that are safe
 * for browser/Next.js environments. Server-only components like
 * NestJS interceptors and services are excluded to prevent
 * Node.js dependency conflicts.
 */

// Core types - safe for client use
export * from "./types/messageContent.types";
export * from "./types/computerAction.types";
export * from "./types/agent.types";

// Client-safe utilities
export * from "./utils/messageContent.utils";
export * from "./utils/computerAction.utils";

// Security Types (exported individually to avoid duplicates)
export {
  SecurityEventType,
  SecurityEvent,
  createSecurityEvent,
  SanitizationOptions,
  UserRole,
  Permission,
  JwtPayload,
  PasswordPolicy,
  ValidationResult,
  ValidationError,
  SecurityErrorCode,
  RateLimitConfig,
  RateLimitPreset,
  RateLimitServiceType,
  DEFAULT_SANITIZATION_OPTIONS,
  XSSDetectionResult,
  SQLInjectionDetectionResult,
  CommandInjectionDetectionResult,
  FilePathValidationResult,
  CoordinatesValidationResult,
} from "./types/security.types";

// Client-safe Security Utilities (browser-compatible subset)
export {
  sanitizeInput,
  sanitizeObject,
  detectXSS,
  detectSQLInjection,
  detectCommandInjection,
  hasPermission,
  hasRole,
  DEFAULT_PASSWORD_POLICY,
  ROLE_PERMISSIONS,
  detectComprehensiveMaliciousPatterns,
  detectAdvancedXSS,
  detectMaliciousFileContent,
  validateFilePath,
  validateCoordinates,
} from "./utils/security-client.utils";

// Task Management DTOs - types only, safe for client
export * from "./dto/task-validation.dto";

// Note: The following are excluded from client builds to prevent Node.js dependency conflicts:
// - NestJS interceptors and services
// - Server-only middleware components
// - NestJS decorators and modules
// - Enterprise validation services that depend on NestJS
//
// These should be imported directly from the server entry point when needed:
// import { CriticalAreaSanitizationInterceptor } from "@bytebot/shared/server";
