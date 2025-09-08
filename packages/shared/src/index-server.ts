/**
 * Server-only exports for @bytebot/shared package
 *
 * This entry point includes server-side components like NestJS
 * interceptors, services, and decorators that require Node.js
 * dependencies and cannot be used in browser environments.
 */

// Re-export everything from the client-safe index
export * from "./index-client";

// Server-only Security Utilities (requiring Node.js dependencies)
export {
  hashPassword,
  verifyPassword,
  validatePassword,
  generateSecurePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "./utils/security.utils";

// Core Security Validation - server-only decorators
export * from "./decorators/security-validation.decorators";

// RBAC Authorization Decorators - server-only (NestJS) - specific exports to avoid conflicts
export {
  Role,
  ResourceType,
  RequireRole,
  RequirePermission as RequireRBACPermission,
  RequireAllPermissions,
  RequireAnyRole,
  AdminOnly,
  ConditionalAccess,
  extractRBACMetadata as extractRBACMetadataFromDecorators,
  hasRequiredRoles,
  hasRequiredPermissions,
  validateTimeBasedAccess,
  validateIPBasedAccess,
} from "./decorators/rbac-authorization.decorators";

// Re-export Permission enum from RBAC decorators as RBACPermission to avoid conflicts
export { Permission as RBACPermission } from "./decorators/rbac-authorization.decorators";

// RBAC Types and Utilities
export * from "./types/rbac.types";
export {
  analyzeSecurityRequirements,
  getCacheStats,
  clearMetadataCache,
  requiresRole,
  requiresPermission,
  getRequiredRoles,
  getRequiredPermissions,
  extractRBACMetadata as extractRBACMetadataFromUtils,
} from "./utils/rbac-metadata.utils";

// Security Middleware - server-only (NestJS/Express)
export * from "./middleware/file-security.middleware";
export * from "./middleware/helmet-security.middleware";
export * from "./middleware/csp-nonce.middleware";
export * from "./middleware/security-middleware.standardized";

// Security Services - server-only (NestJS)
export * from "./services/csp-violation-reporting.service";
export * from "./services/critical-area-sanitization.service";

// Security Configuration - server environment
export * from "./config/cors-security.config";
export {
  SecurityLevel,
  EnvironmentSecurityConfig,
  EnvironmentSecurityConfigManager,
  getSecurityLevelForEnvironment,
  getEnvironmentSecurityConfig,
  isSecurityFeatureEnabled,
} from "./config/environment-security.config";

// Standardized Validation Pipes - server-only (NestJS)
export {
  StandardizedValidationPipe,
  StandardizedValidationPipes,
  ValidationSecurityLevel,
  ValidationServiceType,
} from "./pipes/validation.standardized";

// Standardized Rate Limit Guards - server-only (NestJS)
export {
  StandardizedRateLimitGuard,
  StandardizedRateLimitConfig,
  RateLimitSecurityLevel,
} from "./guards/rate-limit.standardized";

// Critical Area Security Interceptors - server-only (NestJS + requires @nestjs/microservices)
export * from "./interceptors/critical-area-sanitization.interceptor";

// Enterprise Validation Services - server-only (NestJS)
export * from "./validation/services";
export * from "./validation/enterprise-validation.module";

// Note: Test utilities are available but not exported by default
// to avoid jest dependencies in production builds.
// Import them directly from specific paths when needed in tests:
// import { MockRegistry } from "@bytebot/shared/dist/test-utils/mocks";
