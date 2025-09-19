/**
 * Server-only exports for @bytebot/shared package
 *
 * This entry point includes server-side components like NestJS
 * interceptors, services, and decorators that require Node.js
 * dependencies and cannot be used in browser environments.
 */

// Re-export everything from the client-safe index
export * from "./index-client";

// Explicitly re-export the correct SecurityLevel from parlant-integration.types to resolve ambiguity
export { SecurityLevel } from "./types/parlant-integration.types";

// Server-only Security Utilities (requiring Node.js dependencies)
// Temporarily disabled due to TypeScript compilation errors
// export {
//   hashPassword,
//   verifyPassword,
//   validatePassword,
//   generateSecurePassword,
//   generateAccessToken,
//   generateRefreshToken,
//   verifyToken,
// } from "./utils/security.utils";

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

// RBAC Types and Utilities - specific exports to avoid conflicts with parlant.types
export {
  UserContext as RBACUserContext,
  RequestContext as RBACRequestContext,
  SecurityContext as RBACSecurityContext,
  PermissionMatrix,
  AccessControlEntry,
  AuthorizationResult as RBACAuthorizationResult,
  BatchAuthorizationResult,
  RBACMetadata,
  RBACGuardConfig,
  AuthorizationCacheEntry,
  AuthorizationEvent,
  IRBACService,
  IPermissionService,
} from "./types/rbac.types";
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
  SecurityLevel as EnvironmentSecurityLevel,
  EnvironmentSecurityConfig,
  EnvironmentSecurityConfigManager,
  getSecurityLevelForEnvironment,
  getEnvironmentSecurityConfig,
  isSecurityFeatureEnabled,
} from "./config/environment-security.config";

// Security Middleware Types - server environment
export {
  SecurityLevel as SecurityLevelMiddleware,
  ServiceType,
} from "./middleware/security-middleware.standardized";

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

// Permission-Based Guards - server-only (NestJS)
export {
  PermissionGuard,
  ResourceGuard,
  OwnershipGuard,
  CompositeGuard,
  RoleGuard,
  AuditGuard,
  HealthGuard,
  IPWhitelistGuard,
  TimeBasedAccessGuard,
  PermissionConfig,
  ResourceConfig,
  OwnershipConfig,
  CompositeGuardConfig,
  IPWhitelistConfig,
  TimeBasedAccessConfig,
  RequirePermissions,
  RequireOwnership,
  PERMISSION_GUARD_KEY,
  RESOURCE_GUARD_KEY,
  OWNERSHIP_GUARD_KEY,
  COMPOSITE_GUARD_KEY,
  IP_WHITELIST_KEY,
  TIME_BASED_ACCESS_KEY,
  AUDIT_GUARD_KEY,
  HEALTH_GUARD_KEY,
} from "./guards/permission-based-guards";

// Security Interceptors - server-only (NestJS + requires @nestjs/microservices)
export * from "./interceptors/critical-area-sanitization.interceptor";
export * from "./interceptors/response.interceptor";
export * from "./interceptors/security-logging.interceptor";

// Parlant Authentication & Authorization Services - server-only (NestJS)
export {
  ParlantEnhancedAuthService,
  ConversationalAuthContext,
  AuthenticationMethod,
  RiskAssessment,
  ConversationalAuthResult,
  RequiredActionType,
} from "./services/parlant-enhanced-auth.service";

export {
  ParlantMFAService,
  MFAMethod,
  MFAChallenge,
  MFAValidationRequest,
  MFAValidationResult,
  MFASetupRequest,
  MFASetupResult,
} from "./services/parlant-mfa.service";

// Parlant Enhanced Guards - server-only (NestJS)
export {
  ParlantEnhancedRBACGuard,
  ConversationalAuthorizationContext,
  AuthorizationRiskAssessment,
  ConversationalAuthorizationResult,
} from "./guards/parlant-enhanced-rbac.guard";

// Parlant Enhanced Middleware - server-only (NestJS)
export {
  ParlantEnhancedAuthMiddleware,
  ParlantAuthenticatedRequest,
  EnhancedAuthenticationState,
  AuthMethod,
  SecurityContext,
  RequestRiskAssessment,
} from "./middleware/parlant-enhanced-auth.middleware";

// Parlant Authentication Module - server-only (NestJS)
export {
  ParlantAuthModule,
  ParlantAuthModuleOptions,
  ParlantAuthModuleAsyncOptions,
  createEnvironmentConfig,
  validateParlantAuthConfig,
} from "./modules/parlant-auth.module";

// Enterprise Validation Services - server-only (NestJS) - explicit exports to avoid ValidationResult conflict
export {
  ValidationConfigurationService,
  ValidationProfileManager,
  SecurityThreatDetector,
  ValidationAuditLogger,
  ValidationMetricsCollector,
  ValidationCacheService,
} from "./validation/services";

// Export validation types with prefixes to avoid conflicts
export {
  ValidationResult as EnterpriseValidationResult,
  SecurityValidationResult,
  ThreatInfo,
  ThreatAnalysisResult,
  ValidationSuccessMetrics,
  ValidationFailureMetrics,
  ValidationAuditEntry,
  ValidationCacheEntry,
  ValidationProfile,
  SecurityThreatContext,
  ValidationFailureContext,
  ValidationPerformanceMetrics,
  CustomValidationRule,
  ValidationTypeNames,
} from "./validation/services/types";

export * from "./validation/enterprise-validation.module";

// Terminal Execution Enhancement System - server-only (Node.js child_process)
export * from "./terminal";

// Audit System Types and Services - server-only
export {
  AuditSeverity,
  SecurityEventCategory,
  ComplianceFramework,
  AuditEventStatus,
  AuditEvent,
  AuditEventMetadata,
  PerformanceMetrics as AuditPerformanceMetrics,
  SecurityContext as AuditSecurityContext,
  TokenInfo,
  ComplianceInfo,
  GeolocationInfo,
  ErrorInfo,
  AuditEventQuery,
  AuditEventSearchResult,
  AuditStatistics,
  AuditExportConfig,
  RetentionPolicy,
  AlertConfig,
  AlertCondition,
  AlertDestination,
} from "./audit/types";
export * from "./audit/services/audit-logger.service";
export * from "./audit/processors/audit-event.processor";
export * from "./audit/compliance/compliance-framework.service";
export * from "./audit/integrations/audit.module";

// Security Framework - server-only security services and ML algorithms
// Export security components selectively to avoid conflicts
// Note: Commented out to avoid PerformanceMetrics conflict, re-enable after resolving
// export * from "./security";

// Parlant Integration - Shared Library Foundation
// Core services, decorators, and utilities for conversational AI validation
// (types are already exported from index-client to avoid conflicts)
export * from "./services/parlant-integration.service";

// Enhanced JWT-Parlant Bridge Service - PARLANT Phase 1 Implementation
export * from "./services/enhanced-jwt-parlant-bridge.service";
export * from "./services/jwt-parlant-bridge.service";

// Enhanced Parlant Authentication Guard
export * from "./guards/enhanced-parlant-auth.guard";

// Enhanced JWT Bridge Types
export * from "./types/enhanced-jwt-bridge.types";
// Parlant Decorators - specific exports to avoid ParlantValidationConfig conflict
export {
  PARLANT_VALIDATION_KEY,
  PARLANT_CONVERSATION_KEY,
  PARLANT_SECURITY_KEY,
  PARLANT_APPROVAL_KEY,
  PARLANT_WRAPPER_CONFIG_KEY,
  PARLANT_RULES_KEY,
  PARLANT_CONTEXT_KEY,
  ParlantValidationConfig as ParlantDecoratorValidationConfig,
  ParlantValidation,
  ConversationContextConfig,
  ConversationContext,
  SecurityClassificationConfig,
  SecurityClassification,
  ApprovalWorkflowConfig,
  EscalationRule,
  EscalationCondition,
  ApprovalWorkflow,
  ParlantWrapper,
  ValidationRules,
  ConversationParam,
  ValidationRequestParam,
  UserContextParam,
  CompleteParlantConfig,
  ParlantIntegrated,
  getParlantValidationMetadata,
  getConversationContextMetadata,
  getSecurityClassificationMetadata,
  getApprovalWorkflowMetadata,
  getValidationRulesMetadata,
  hasParlantValidation,
  getAllParlantMetadata,
} from "./decorators/parlant-validation.decorators";

// Parlant Simple Decorators - from alternative decorator file
export {
  ParlantValidated,
  ParlantSecure,
  ParlantCritical,
  ParlantCached,
  ParlantFast,
} from "./decorators/parlant-validation.decorator";

// export * from "./interceptors/parlant-validation.interceptor";
export * from "./utils/parlant-wrapper.utils";

// Note: Parlant types are already exported from index-client.ts
// Avoiding duplicate exports to prevent conflicts

// Parlant Services - integration service and interfaces
export {
  ParlantIntegrationService,
  ParlantIntegrationConfig,
  ConversationManager,
  ValidationEngine,
  AuditService,
  ServiceHealthStatus,
  ParlantValidationError,
} from "./services/parlant-integration.service";

// Parlant Wrapper Utilities - function wrapping and registry
export {
  createParlantWrapper,
  wrapFunctionWithMetadata,
  wrapClassMethods,
  parlantWrapper,
  ParlantWrapperBuilder,
  ParlantWrapperRegistry,
  ParlantValidationRejection,
  FunctionWrapperConfig,
  ParlantExecutionResult,
  WrappedFunction,
} from "./utils/parlant-wrapper.utils";

// Parlant Interceptor - NestJS automatic validation
// export {
//   ParlantValidationInterceptor,
//   ParlantValidationInterceptorConfig,
//   ParlantValidationDenialError,
//   ParlantServiceUnavailableError,
// } from "./interceptors/parlant-validation.interceptor";

// Local Monitoring System - server-only (NestJS + Prometheus)
export * from "./monitoring";

// PARLANT Emergency Bypass System - Phase 1 Complete Implementation
// Enterprise-grade emergency bypass with multi-tier authorization, time-limited tokens,
// comprehensive audit trails, and intelligent failover mechanisms
export * from "./parlant/bypass";

// Note: Test utilities are available but not exported by default
// to avoid jest dependencies in production builds.
// Import them directly from specific paths when needed in tests:
// import { MockRegistry } from "@bytebot/shared/dist/test-utils/mocks";
