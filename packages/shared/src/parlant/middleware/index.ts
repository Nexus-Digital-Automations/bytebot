/**
 * Enhanced PARLANT Universal Middleware Framework - Main Export
 * Enterprise-Grade Conversational Validation System
 *
 * This module provides the main exports for the enhanced PARLANT universal
 * middleware framework, making it easy to import and use all components.
 *
 * @author Claude Code - PARLANT Universal Framework Team
 * @version 2.0.0 - Enhanced Enterprise Framework
 * @since 2024-09-22
 */

// ===== CORE MIDDLEWARE =====
export {
  EnhancedUniversalParlantMiddleware,
  type ParlantRequestContext,
  type UserContext,
  type PerformanceMetrics,
  type ConversationalErrorContext,
  type EndpointConfiguration,
  type CacheStrategy,
  type RetryPolicy,
  type ValidationPerformanceTarget,
} from "./core/universal-parlant-middleware";

// ===== ENHANCED DECORATORS =====
export {
  EnhancedParlantValidated,
  TypeSafeValidation,
  PerformanceMonitored,
  IntelligentCache,
  ContextAwareAuth,
  ParlantContext,
  EnhancedUser,
  DecoratorUtils,
  ENHANCED_PARLANT_METADATA_KEY,
  PARLANT_PERFORMANCE_METADATA_KEY,
  PARLANT_AUDIT_METADATA_KEY,
  PARLANT_CACHE_METADATA_KEY,
  PARLANT_TYPE_METADATA_KEY,
} from "./decorators/enhanced-parlant-decorators";

export type {
  EnhancedParlantValidationConfig,
  CachingStrategy,
  ParameterValidationConfig,
  ReturnValueValidationConfig,
  ContextRequirements,
  OrganizationalConstraints,
  TimeBasedRestrictions,
  CustomErrorHandling,
  EscalationRule,
  FallbackStrategy,
  RetryPolicy as DecoratorRetryPolicy,
  RetryCondition,
  ParameterValidator,
  ReturnValueValidator,
  MethodPerformanceMetrics,
  MethodAuditEvent,
} from "./decorators/enhanced-parlant-decorators";

// ===== REQUEST/RESPONSE INTERCEPTORS =====
export { ParlantRequestResponseInterceptor } from "./interceptors/parlant-request-response-interceptor";

export type {
  ParlantInterceptorConfig,
  ErrorTransformationRule,
  CustomErrorHandler,
  RequestProcessingMetrics,
  ProcessingStage,
  ThreatDetectionResult,
  ResponseTransformationContext,
} from "./interceptors/parlant-request-response-interceptor";

// ===== ENHANCED TYPE DEFINITIONS =====
export {
  SecurityLevel,
  ValidationMode,
  ApprovalLevel,
  RiskLevel,
  AuthenticationStatus,
  AuthorizationLevel,
  ComplianceStatus,
  ValidationStatus,
  ValidationLevel,
  // Type guards
  isSecurityLevel,
  isValidationMode,
  isHTTPMethod,
  isParlantOperationId,
  // Branded type creators
  createUserId,
  createSessionId,
  createOrganizationId,
  createDepartmentId,
  createPermissionId,
  createRoleId,
  // Default configurations
  DEFAULT_PERFORMANCE_CONFIG,
  DEFAULT_SECURITY_CONFIG,
} from "./types/enhanced-parlant-types";

export type {
  ParlantOperationId,
  SecurityLevelHierarchy,
  IsValidSecurityLevel,
  RiskLevelScore,
  EnhancedParlantRequest,
  HTTPMethod,
  RequestMetadata,
  SecurityContext,
  SecurityFlag,
  UserContext as EnhancedUserContext,
  UserRole,
  Permission,
  PermissionAction,
  PermissionScope,
  PermissionCondition,
  ConditionType,
  ComparisonOperator,
  RoleRestriction,
  RestrictionType,
  AuthenticationMethod,
  SessionMetadata,
  GeolocationData,
  SecurityEvent,
  SecurityEventType,
  SecurityEventSeverity,
  EnhancedPerformanceMetrics,
  PerformancePhase,
  MemorySnapshot,
  CPUSnapshot,
  NetworkMetrics,
  CacheMetrics,
  ValidationMetrics,
  EnhancedMiddlewareConfig,
  PerformanceConfig,
  SecurityConfig,
  ThreatDetectionConfig,
  ThreatPattern,
  ThreatType,
  ThreatSeverity,
  ThreatResponseAction,
  ResponseActionType,
  AuditEvent,
  AuditEventType,
  AuditEventSeverity,
  AuditOutcome,
  AuditMetadata,
  RetentionPolicy,
  ComplianceFlag,
  ConfigBuilder,
  DeepReadonly,
  PartialExcept,
  TypedEventEmitter,
  MiddlewareEvents,
  ValidationResult,
  ValidationWarning,
  WarningCategory,
  ValidationRecommendation,
  RecommendationPriority,
  RecommendationCategory,
  // Branded types
  UserId,
  SessionId,
  OrganizationId,
  DepartmentId,
  PermissionId,
  RoleId,
} from "./types/enhanced-parlant-types";

// ===== INTEGRATION EXAMPLES =====
export {
  BasicTasksController,
  TaskReportsController,
  TasksModule,
  BasicIntegrationAppModule,
  MinimalExampleController,
  PerformanceOptimizedController,
  SecurityFocusedController,
  TasksService,
} from "./examples/basic-integration";

export type {
  CreateTaskDto,
  UpdateTaskDto,
  TaskQueryDto,
  Task,
} from "./examples/basic-integration";

// ===== UTILITY CONSTANTS =====

/**
 * Framework version information
 */
export const PARLANT_MIDDLEWARE_VERSION = "2.0.0";

/**
 * Performance targets for validation
 */
export const PERFORMANCE_TARGETS = {
  FAST: 100, // Sub-100ms for cached operations
  STANDARD: 500, // Sub-500ms for standard operations
  COMPLEX: 1000, // Sub-1000ms for complex operations
  CRITICAL: 5000, // Sub-5000ms for critical operations
} as const;

/**
 * Default cache TTL values (in milliseconds)
 */
export const CACHE_TTL = {
  SHORT: 60000, // 1 minute
  MEDIUM: 300000, // 5 minutes
  LONG: 1800000, // 30 minutes
  EXTENDED: 3600000, // 1 hour
} as const;

/**
 * Security level mappings
 */
export const SECURITY_LEVEL_SCORES = {
  [SecurityLevel._MINIMAL]: 0,
  [SecurityLevel._LOW]: 1,
  [SecurityLevel._MEDIUM]: 2,
  [SecurityLevel._HIGH]: 3,
  [SecurityLevel._CRITICAL]: 4,
} as const;

/**
 * Risk level scores for numerical comparison
 */
export const RISK_LEVEL_SCORES = {
  [RiskLevel._MINIMAL]: 0,
  [RiskLevel._LOW]: 25,
  [RiskLevel._MODERATE]: 50,
  [RiskLevel._HIGH]: 75,
  [RiskLevel._CRITICAL]: 100,
} as const;

// ===== CONFIGURATION HELPERS =====

/**
 * Create a basic PARLANT validation configuration
 */
export function createBasicValidationConfig(
  intent: string,
  securityLevel: SecurityLevel = SecurityLevel._MEDIUM,
): EnhancedParlantValidationConfig {
  return {
    intent,
    description: `Basic validation for: ${intent}`,
    securityLevel,
    enableMetrics: true,
    enableAuditTrail: true,
    performanceTarget: PERFORMANCE_TARGETS.STANDARD,
    parameterValidation: {
      validateTypes: true,
      sanitizeInputs: true,
      maxSize: 10000,
      maxDepth: 5,
    },
  };
}

/**
 * Create a high-performance validation configuration
 */
export function createPerformanceValidationConfig(
  intent: string,
  targetTime: number = PERFORMANCE_TARGETS.FAST,
): EnhancedParlantValidationConfig {
  return {
    intent,
    description: `High-performance validation for: ${intent}`,
    securityLevel: SecurityLevel._LOW,
    enableMetrics: true,
    performanceTarget: targetTime,
    cachingStrategy: {
      enabled: true,
      ttl: CACHE_TTL.MEDIUM,
      scope: "user",
    },
    parameterValidation: {
      validateTypes: false, // Skip for performance
      sanitizeInputs: false,
    },
  };
}

/**
 * Create a high-security validation configuration
 */
export function createSecurityValidationConfig(
  intent: string,
  requiredRoles: string[] = [],
): EnhancedParlantValidationConfig {
  return {
    intent,
    description: `High-security validation for: ${intent}`,
    securityLevel: SecurityLevel._HIGH,
    validationMode: ValidationMode._SYNCHRONOUS,
    approvalLevel: ApprovalLevel._SINGLE_APPROVAL,
    enableMetrics: true,
    enableAuditTrail: true,
    performanceTarget: PERFORMANCE_TARGETS.COMPLEX,
    contextRequirements: {
      requireAuthentication: true,
      requiredRoles,
      minimumSecurityClearance: SecurityLevel._MEDIUM,
    },
    parameterValidation: {
      validateTypes: true,
      sanitizeInputs: true,
      maxSize: 5000,
      maxDepth: 3,
    },
    customErrorHandling: {
      escalationRules: [
        {
          condition: (error) => error.message.includes("permission"),
          escalationLevel: "HIGH",
          notificationTargets: ["security@company.com"],
          requiresHumanIntervention: true,
        },
      ],
    },
  };
}

// ===== TYPE UTILITIES =====

/**
 * Utility type for extracting PARLANT context from request
 */
export type ExtractParlantContext<T> = T extends EnhancedParlantRequest
  ? T["parlant"]
  : never;

/**
 * Utility type for extracting user context from request
 */
export type ExtractUserContext<T> = T extends EnhancedParlantRequest
  ? T["user"]
  : never;

/**
 * Utility type for checking if a security level is sufficient
 */
export type IsSecurityLevelSufficient<
  Required extends SecurityLevel,
  Provided extends SecurityLevel,
> = (typeof SECURITY_LEVEL_SCORES)[Provided] extends infer ProvidedScore
  ? (typeof SECURITY_LEVEL_SCORES)[Required] extends infer RequiredScore
    ? ProvidedScore extends number
      ? RequiredScore extends number
        ? ProvidedScore extends {
            readonly [K in keyof typeof SECURITY_LEVEL_SCORES]: number;
          }[keyof typeof SECURITY_LEVEL_SCORES]
          ? RequiredScore extends {
              readonly [K in keyof typeof SECURITY_LEVEL_SCORES]: number;
            }[keyof typeof SECURITY_LEVEL_SCORES]
            ? ProvidedScore extends RequiredScore
              ? true
              : false
            : false
          : false
        : false
      : false
    : false
  : false;

// ===== MODULE INFORMATION =====

/**
 * Enhanced PARLANT Middleware Framework information
 */
export const FRAMEWORK_INFO = {
  name: "Enhanced PARLANT Universal Middleware Framework",
  version: PARLANT_MIDDLEWARE_VERSION,
  description:
    "Enterprise-grade conversational validation for Bytebot ecosystem",
  author: "Claude Code - PARLANT Framework Team",
  features: [
    "Universal middleware pipeline",
    "Sub-1000ms performance optimization",
    "Complete TypeScript type safety",
    "Enterprise security features",
    "Intelligent caching strategies",
    "Comprehensive monitoring",
    "Advanced decorator patterns",
    "Request/response interception",
  ],
  compatibility: {
    nestjs: "^10.0.0",
    typescript: "^5.0.0",
    node: "^18.0.0",
  },
} as const;

// ===== DEFAULT EXPORT =====

/**
 * Default export with the most commonly used components
 */
export default {
  // Core middleware
  EnhancedUniversalParlantMiddleware,

  // Main decorators
  EnhancedParlantValidated,
  TypeSafeValidation,
  PerformanceMonitored,
  IntelligentCache,
  ContextAwareAuth,

  // Parameter decorators
  ParlantContext,
  EnhancedUser,

  // Interceptors
  ParlantRequestResponseInterceptor,

  // Enums
  SecurityLevel,
  ValidationMode,
  ApprovalLevel,
  RiskLevel,
  ValidationStatus,
  ValidationLevel,

  // Configuration helpers
  createBasicValidationConfig,
  createPerformanceValidationConfig,
  createSecurityValidationConfig,

  // Constants
  PERFORMANCE_TARGETS,
  CACHE_TTL,
  FRAMEWORK_INFO,

  // Version
  version: PARLANT_MIDDLEWARE_VERSION,
};
