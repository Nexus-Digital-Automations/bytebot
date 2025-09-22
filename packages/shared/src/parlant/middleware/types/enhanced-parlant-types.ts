/**
 * Enhanced PARLANT TypeScript Type Definitions
 * Enterprise-Grade Type Safety and Validation System
 *
 * This module provides comprehensive TypeScript type definitions for the
 * enhanced PARLANT universal middleware framework. Built with strict type
 * safety, intelligent inference, and comprehensive validation support.
 *
 * Features:
 * - Complete type preservation throughout the middleware pipeline
 * - Advanced generic types with constraint validation
 * - Intelligent type inference for complex scenarios
 * - Comprehensive union and intersection types
 * - Type-safe configuration and options
 * - Advanced utility types for framework extensibility
 * - Strict null safety and undefined handling
 * - Performance-optimized type checking
 *
 * Type Safety Specifications:
 * - Zero runtime type coercion
 * - Compile-time validation of all middleware configurations
 * - Strict null and undefined checks
 * - Exhaustive union type checking
 * - Type-safe event handling and callbacks
 * - Intelligent type narrowing and guards
 *
 * @author Claude Code - PARLANT Type System Team
 * @version 2.0.0 - Enhanced Enterprise Types
 * @since 2024-09-22
 */

// ===== CORE PARLANT TYPES =====

/**
 * Base PARLANT operation identifier with strict typing
 */
export type ParlantOperationId = `parlant-${string}-${string}-${string}`;

/**
 * Enhanced security levels with hierarchical typing
 */
export enum SecurityLevel {
  _MINIMAL = 'MINIMAL',
  _LOW = 'LOW',
  _MEDIUM = 'MEDIUM',
  _HIGH = 'HIGH',
  _CRITICAL = 'CRITICAL',
}

/**
 * Security level hierarchy for type checking
 */
export type SecurityLevelHierarchy = {
  [SecurityLevel._MINIMAL]: 0;
  [SecurityLevel._LOW]: 1;
  [SecurityLevel._MEDIUM]: 2;
  [SecurityLevel._HIGH]: 3;
  [SecurityLevel._CRITICAL]: 4;
};

/**
 * Type guard for security level validation
 */
export type IsValidSecurityLevel<T> = T extends SecurityLevel ? true : false;

/**
 * Enhanced validation modes with strict typing
 */
export enum ValidationMode {
  _AUTOMATED = 'AUTOMATED',
  _INTERACTIVE = 'INTERACTIVE',
  _SYNCHRONOUS = 'SYNCHRONOUS',
  _ASYNCHRONOUS = 'ASYNCHRONOUS',
  _BATCH = 'BATCH',
}

/**
 * Enhanced approval levels
 */
export enum ApprovalLevel {
  _AUTOMATIC = 'AUTOMATIC',
  _SINGLE_APPROVAL = 'SINGLE_APPROVAL',
  _DUAL_APPROVAL = 'DUAL_APPROVAL',
  _COMMITTEE_APPROVAL = 'COMMITTEE_APPROVAL',
  _ESCALATED_APPROVAL = 'ESCALATED_APPROVAL',
}

/**
 * Enhanced risk levels with numerical mapping
 */
export enum RiskLevel {
  _MINIMAL = 'MINIMAL',
  _LOW = 'LOW',
  _MODERATE = 'MODERATE',
  _HIGH = 'HIGH',
  _CRITICAL = 'CRITICAL',
}

/**
 * Risk level scoring system
 */
export type RiskLevelScore = {
  [RiskLevel._MINIMAL]: 0;
  [RiskLevel._LOW]: 25;
  [RiskLevel._MODERATE]: 50;
  [RiskLevel._HIGH]: 75;
  [RiskLevel._CRITICAL]: 100;
};

// ===== ENHANCED REQUEST/RESPONSE TYPES =====

/**
 * Enhanced PARLANT request with strict typing
 */
export interface EnhancedParlantRequest<TBody = unknown, TQuery = Record<string, string>, TParams = Record<string, string>> {
  readonly requestId: ParlantOperationId;
  readonly method: HTTPMethod;
  readonly url: string;
  readonly path: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: TBody;
  readonly query: TQuery;
  readonly params: TParams;
  readonly ip: string;
  readonly userAgent: string;
  readonly timestamp: Date;
  readonly startTime: number;

  // Enhanced properties
  readonly parlant?: ParlantRequestContext;
  readonly user?: UserContext;
  readonly metadata?: RequestMetadata;
  readonly security?: SecurityContext;
}

/**
 * Strict HTTP method typing
 */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

/**
 * Type-safe request metadata
 */
export interface RequestMetadata {
  readonly processedAt: Date;
  readonly processingTime: number;
  readonly interceptorVersion: string;
  readonly middlewareStack: readonly string[];
  readonly transformationsApplied: readonly string[];
}

/**
 * Enhanced security context with strict typing
 */
export interface SecurityContext {
  readonly threatLevel: RiskLevel;
  readonly authenticationStatus: AuthenticationStatus;
  readonly authorizationLevel: AuthorizationLevel;
  readonly securityFlags: readonly SecurityFlag[];
  readonly complianceStatus: ComplianceStatus;
  readonly auditTrail: readonly AuditEvent[];
}

/**
 * Authentication status enumeration
 */
export enum AuthenticationStatus {
  AUTHENTICATED = 'AUTHENTICATED',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  EXPIRED = 'EXPIRED',
  INVALID = 'INVALID',
  PENDING = 'PENDING',
}

/**
 * Authorization level enumeration
 */
export enum AuthorizationLevel {
  NONE = 'NONE',
  BASIC = 'BASIC',
  STANDARD = 'STANDARD',
  ELEVATED = 'ELEVATED',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
}

/**
 * Security flags for threat detection
 */
export type SecurityFlag =
  | 'SQL_INJECTION_DETECTED'
  | 'XSS_DETECTED'
  | 'CSRF_DETECTED'
  | 'SENSITIVE_DATA_DETECTED'
  | 'MALICIOUS_PAYLOAD_DETECTED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SUSPICIOUS_BEHAVIOR'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT';

/**
 * Compliance status enumeration
 */
export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  EXEMPT = 'EXEMPT',
  UNKNOWN = 'UNKNOWN',
}

// ===== ENHANCED USER CONTEXT TYPES =====

/**
 * Enhanced user context with comprehensive typing
 */
export interface UserContext {
  readonly id: string;
  readonly username: string;
  readonly email?: string;
  readonly roles: readonly UserRole[];
  readonly permissions: readonly Permission[];
  readonly securityClearance: SecurityLevel;
  readonly organizationId?: string;
  readonly departmentId?: string;
  readonly sessionId: string;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly lastActivity: Date;
  readonly authenticationMethod: AuthenticationMethod;
  readonly sessionMetadata: SessionMetadata;
}

/**
 * User role with hierarchical permissions
 */
export interface UserRole {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly permissions: readonly Permission[];
  readonly inheritsFrom?: readonly string[];
  readonly restrictions?: readonly RoleRestriction[];
}

/**
 * Permission system with granular controls
 */
export interface Permission {
  readonly id: string;
  readonly resource: string;
  readonly action: PermissionAction;
  readonly scope: PermissionScope;
  readonly conditions?: readonly PermissionCondition[];
  readonly expiresAt?: Date;
}

/**
 * Permission actions
 */
export type PermissionAction = 'READ' | 'WRITE' | 'CREATE' | 'DELETE' | 'UPDATE' | 'EXECUTE' | 'ADMIN';

/**
 * Permission scopes
 */
export type PermissionScope = 'GLOBAL' | 'ORGANIZATION' | 'DEPARTMENT' | 'TEAM' | 'PERSONAL';

/**
 * Permission conditions for contextual access
 */
export interface PermissionCondition {
  readonly type: ConditionType;
  readonly operator: ComparisonOperator;
  readonly value: unknown;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Condition types for permissions
 */
export type ConditionType =
  | 'TIME_RANGE'
  | 'IP_ADDRESS'
  | 'GEOGRAPHIC_LOCATION'
  | 'DEVICE_TYPE'
  | 'SECURITY_LEVEL'
  | 'CUSTOM';

/**
 * Comparison operators
 */
export type ComparisonOperator = 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'MATCHES';

/**
 * Role restrictions
 */
export interface RoleRestriction {
  readonly type: RestrictionType;
  readonly value: unknown;
  readonly description: string;
  readonly enforced: boolean;
}

/**
 * Restriction types
 */
export type RestrictionType =
  | 'TIME_BASED'
  | 'LOCATION_BASED'
  | 'IP_BASED'
  | 'DEVICE_BASED'
  | 'USAGE_QUOTA'
  | 'CUSTOM';

/**
 * Authentication methods
 */
export type AuthenticationMethod =
  | 'PASSWORD'
  | 'MFA'
  | 'SSO'
  | 'API_KEY'
  | 'CERTIFICATE'
  | 'BIOMETRIC'
  | 'TOKEN';

/**
 * Session metadata
 */
export interface SessionMetadata {
  readonly sessionId: string;
  readonly createdAt: Date;
  readonly lastAccessedAt: Date;
  readonly expiresAt: Date;
  readonly deviceFingerprint: string;
  readonly geolocation?: GeolocationData;
  readonly securityEvents: readonly SecurityEvent[];
}

/**
 * Geolocation data
 */
export interface GeolocationData {
  readonly country: string;
  readonly region: string;
  readonly city: string;
  readonly coordinates?: readonly [number, number]; // [latitude, longitude]
  readonly accuracy: number;
  readonly source: 'IP' | 'GPS' | 'USER_PROVIDED';
}

/**
 * Security events
 */
export interface SecurityEvent {
  readonly id: string;
  readonly type: SecurityEventType;
  readonly timestamp: Date;
  readonly severity: SecurityEventSeverity;
  readonly description: string;
  readonly metadata: Record<string, unknown>;
  readonly resolved: boolean;
}

/**
 * Security event types
 */
export type SecurityEventType =
  | 'LOGIN_ATTEMPT'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'PERMISSION_ESCALATION'
  | 'SUSPICIOUS_ACTIVITY'
  | 'SECURITY_VIOLATION';

/**
 * Security event severity
 */
export type SecurityEventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// ===== PERFORMANCE AND MONITORING TYPES =====

/**
 * Enhanced performance metrics with comprehensive tracking
 */
export interface EnhancedPerformanceMetrics {
  readonly operationId: ParlantOperationId;
  readonly startTime: number;
  readonly endTime?: number;
  readonly phases: readonly PerformancePhase[];
  readonly memoryUsage: readonly MemorySnapshot[];
  readonly cpuUsage: readonly CPUSnapshot[];
  readonly networkMetrics?: NetworkMetrics;
  readonly cacheMetrics?: CacheMetrics;
  readonly validationMetrics?: ValidationMetrics;
}

/**
 * Performance phase tracking
 */
export interface PerformancePhase {
  readonly name: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly memoryDelta: number;
  readonly cpuDelta: number;
  readonly success: boolean;
  readonly errorMessage?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Memory usage snapshot
 */
export interface MemorySnapshot {
  readonly timestamp: number;
  readonly heapUsed: number;
  readonly heapTotal: number;
  readonly external: number;
  readonly rss: number;
}

/**
 * CPU usage snapshot
 */
export interface CPUSnapshot {
  readonly timestamp: number;
  readonly user: number;
  readonly system: number;
}

/**
 * Network metrics
 */
export interface NetworkMetrics {
  readonly requestSize: number;
  readonly responseSize: number;
  readonly compressionRatio?: number;
  readonly bandwidth: number;
  readonly latency: number;
  readonly roundTripTime: number;
}

/**
 * Cache metrics
 */
export interface CacheMetrics {
  readonly hitRate: number;
  readonly missRate: number;
  readonly hitCount: number;
  readonly missCount: number;
  readonly averageAccessTime: number;
  readonly cacheSize: number;
  readonly evictionCount: number;
}

/**
 * Validation metrics
 */
export interface ValidationMetrics {
  readonly validationTime: number;
  readonly validationAttempts: number;
  readonly validationSuccess: boolean;
  readonly confidenceScore: number;
  readonly riskScore: number;
  readonly threatsDetected: number;
  readonly mitigationsApplied: number;
}

// ===== CONFIGURATION TYPES =====

/**
 * Enhanced middleware configuration with strict typing
 */
export interface EnhancedMiddlewareConfig {
  readonly performance: PerformanceConfig;
  readonly security: SecurityConfig;
  readonly validation: ValidationConfig;
  readonly caching: CachingConfig;
  readonly monitoring: MonitoringConfig;
  readonly errorHandling: ErrorHandlingConfig;
  readonly compliance: ComplianceConfig;
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  readonly maxProcessingTime: number;
  readonly targetCacheHitRatio: number;
  readonly maxMemoryUsage: number;
  readonly maxConcurrentRequests: number;
  readonly errorRateThreshold: number;
  readonly enableProfiling: boolean;
  readonly enableMetrics: boolean;
  readonly metricsRetentionPeriod: number;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  readonly threatDetection: ThreatDetectionConfig;
  readonly authentication: AuthenticationConfig;
  readonly authorization: AuthorizationConfig;
  readonly dataProtection: DataProtectionConfig;
  readonly auditLogging: AuditLoggingConfig;
}

/**
 * Threat detection configuration
 */
export interface ThreatDetectionConfig {
  readonly enabled: boolean;
  readonly sqlInjectionDetection: boolean;
  readonly xssDetection: boolean;
  readonly csrfProtection: boolean;
  readonly sensitiveDataDetection: boolean;
  readonly maliciousPayloadDetection: boolean;
  readonly customPatterns: readonly ThreatPattern[];
  readonly responseActions: readonly ThreatResponseAction[];
}

/**
 * Threat pattern definition
 */
export interface ThreatPattern {
  readonly id: string;
  readonly name: string;
  readonly pattern: RegExp;
  readonly threatType: ThreatType;
  readonly severity: ThreatSeverity;
  readonly confidence: number;
  readonly enabled: boolean;
}

/**
 * Threat types
 */
export type ThreatType =
  | 'SQL_INJECTION'
  | 'XSS'
  | 'CSRF'
  | 'COMMAND_INJECTION'
  | 'PATH_TRAVERSAL'
  | 'SENSITIVE_DATA_EXPOSURE'
  | 'MALICIOUS_PAYLOAD'
  | 'CUSTOM';

/**
 * Threat severity levels
 */
export type ThreatSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Threat response actions
 */
export interface ThreatResponseAction {
  readonly threatType: ThreatType;
  readonly severity: ThreatSeverity;
  readonly action: ResponseActionType;
  readonly parameters?: Record<string, unknown>;
  readonly notificationTargets?: readonly string[];
}

/**
 * Response action types
 */
export type ResponseActionType =
  | 'BLOCK'
  | 'QUARANTINE'
  | 'SANITIZE'
  | 'LOG_ONLY'
  | 'NOTIFY'
  | 'ESCALATE'
  | 'RATE_LIMIT';

// ===== AUDIT AND COMPLIANCE TYPES =====

/**
 * Enhanced audit event with comprehensive tracking
 */
export interface AuditEvent {
  readonly id: string;
  readonly timestamp: Date;
  readonly operationId: ParlantOperationId;
  readonly eventType: AuditEventType;
  readonly severity: AuditEventSeverity;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly resource: string;
  readonly action: string;
  readonly outcome: AuditOutcome;
  readonly details: Record<string, unknown>;
  readonly metadata: AuditMetadata;
  readonly complianceFlags: readonly ComplianceFlag[];
}

/**
 * Audit event types
 */
export type AuditEventType =
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'DATA_ACCESS'
  | 'DATA_MODIFICATION'
  | 'CONFIGURATION_CHANGE'
  | 'SECURITY_EVENT'
  | 'SYSTEM_EVENT'
  | 'COMPLIANCE_EVENT';

/**
 * Audit event severity
 */
export type AuditEventSeverity = 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Audit outcome
 */
export type AuditOutcome = 'SUCCESS' | 'FAILURE' | 'PARTIAL_SUCCESS' | 'DENIED' | 'ERROR';

/**
 * Audit metadata
 */
export interface AuditMetadata {
  readonly source: string;
  readonly version: string;
  readonly correlationId: string;
  readonly parentEventId?: string;
  readonly childEventIds?: readonly string[];
  readonly tags: readonly string[];
  readonly retentionPolicy: RetentionPolicy;
}

/**
 * Retention policy
 */
export interface RetentionPolicy {
  readonly retentionPeriod: number;
  readonly archiveAfter: number;
  readonly deleteAfter: number;
  readonly complianceRequirements: readonly string[];
}

/**
 * Compliance flags
 */
export type ComplianceFlag =
  | 'GDPR_APPLICABLE'
  | 'HIPAA_APPLICABLE'
  | 'SOX_APPLICABLE'
  | 'PCI_DSS_APPLICABLE'
  | 'FERPA_APPLICABLE'
  | 'CCPA_APPLICABLE'
  | 'CUSTOM_COMPLIANCE';

// ===== UTILITY TYPES =====

/**
 * Type-safe configuration builder
 */
export type ConfigBuilder<T> = {
  [K in keyof T]: T[K] extends object
    ? ConfigBuilder<T[K]>
    : T[K];
};

/**
 * Recursive readonly type
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Optional properties helper
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Type-safe event emitter
 */
export interface TypedEventEmitter<T extends Record<string, any[]>> {
  emit<K extends keyof T>(event: K, ...args: T[K]): boolean;
  on<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this;
  off<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this;
  once<K extends keyof T>(event: K, listener: (...args: T[K]) => void): this;
}

/**
 * Middleware events
 */
export interface MiddlewareEvents {
  'request:start': [EnhancedParlantRequest];
  'request:validated': [EnhancedParlantRequest, ValidationResult];
  'request:error': [EnhancedParlantRequest, Error];
  'request:complete': [EnhancedParlantRequest, any];
  'performance:warning': [ParlantOperationId, PerformanceMetrics];
  'security:threat': [ParlantOperationId, ThreatDetectionResult];
  'audit:event': [AuditEvent];
}

/**
 * Validation result with comprehensive information
 */
export interface ValidationResult {
  readonly operationId: ParlantOperationId;
  readonly approved: boolean;
  readonly confidence: number;
  readonly reasoning: string;
  readonly timestamp: Date;
  readonly validationTime: number;
  readonly cacheHit: boolean;
  readonly status: ValidationStatus;
  readonly level: ValidationLevel;
  readonly processingTime: number;
  readonly metadata: Record<string, unknown>;
  readonly warnings?: readonly ValidationWarning[];
  readonly recommendations?: readonly ValidationRecommendation[];
}

/**
 * Validation status enumeration
 */
export enum ValidationStatus {
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  PENDING = 'PENDING',
  CONDITIONAL = 'CONDITIONAL',
  ERROR = 'ERROR',
}

/**
 * Validation level enumeration
 */
export enum ValidationLevel {
  BASIC = 'BASIC',
  STANDARD = 'STANDARD',
  COMPREHENSIVE = 'COMPREHENSIVE',
  EXHAUSTIVE = 'EXHAUSTIVE',
}

/**
 * Validation warnings
 */
export interface ValidationWarning {
  readonly code: string;
  readonly message: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly category: WarningCategory;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Warning categories
 */
export type WarningCategory =
  | 'PERFORMANCE'
  | 'SECURITY'
  | 'COMPLIANCE'
  | 'BEST_PRACTICE'
  | 'DEPRECATION';

/**
 * Validation recommendations
 */
export interface ValidationRecommendation {
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly priority: RecommendationPriority;
  readonly category: RecommendationCategory;
  readonly actionRequired: boolean;
  readonly implementationGuide?: string;
}

/**
 * Recommendation priority
 */
export type RecommendationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/**
 * Recommendation categories
 */
export type RecommendationCategory =
  | 'SECURITY_IMPROVEMENT'
  | 'PERFORMANCE_OPTIMIZATION'
  | 'COMPLIANCE_ENHANCEMENT'
  | 'RELIABILITY_IMPROVEMENT'
  | 'USABILITY_ENHANCEMENT';

/**
 * Threat detection result
 */
export interface ThreatDetectionResult {
  readonly id: string;
  readonly type: ThreatType;
  readonly severity: ThreatSeverity;
  readonly confidence: number;
  readonly location: 'headers' | 'query' | 'body' | 'url' | 'metadata';
  readonly pattern: string;
  readonly value: string;
  readonly mitigationApplied: boolean;
  readonly mitigationStrategy?: string;
  readonly additionalContext?: Record<string, unknown>;
}

// ===== TYPE GUARDS AND VALIDATORS =====

/**
 * Type guard for security level validation
 */
export const isSecurityLevel = (value: unknown): value is SecurityLevel => {
  return typeof value === 'string' && Object.values(SecurityLevel).includes(value as SecurityLevel);
};

/**
 * Type guard for validation mode
 */
export const isValidationMode = (value: unknown): value is ValidationMode => {
  return typeof value === 'string' && Object.values(ValidationMode).includes(value as ValidationMode);
};

/**
 * Type guard for HTTP method
 */
export const isHTTPMethod = (value: unknown): value is HTTPMethod => {
  const methods: HTTPMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
  return typeof value === 'string' && methods.includes(value as HTTPMethod);
};

/**
 * Type guard for PARLANT operation ID
 */
export const isParlantOperationId = (value: unknown): value is ParlantOperationId => {
  return typeof value === 'string' && /^parlant-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/.test(value);
};

// ===== BRANDED TYPES FOR ADDITIONAL SAFETY =====

/**
 * Branded string types for type safety
 */
export type UserId = string & { readonly __brand: 'UserId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type OrganizationId = string & { readonly __brand: 'OrganizationId' };
export type DepartmentId = string & { readonly __brand: 'DepartmentId' };
export type PermissionId = string & { readonly __brand: 'PermissionId' };
export type RoleId = string & { readonly __brand: 'RoleId' };

/**
 * Branded utility functions
 */
export const createUserId = (id: string): UserId => id as UserId;
export const createSessionId = (id: string): SessionId => id as SessionId;
export const createOrganizationId = (id: string): OrganizationId => id as OrganizationId;
export const createDepartmentId = (id: string): DepartmentId => id as DepartmentId;
export const createPermissionId = (id: string): PermissionId => id as PermissionId;
export const createRoleId = (id: string): RoleId => id as RoleId;

// ===== CONFIGURATION DEFAULTS =====

/**
 * Default configurations with type safety
 */
export const DEFAULT_PERFORMANCE_CONFIG: DeepReadonly<PerformanceConfig> = {
  maxProcessingTime: 1000,
  targetCacheHitRatio: 0.95,
  maxMemoryUsage: 200 * 1024 * 1024, // 200MB
  maxConcurrentRequests: 10000,
  errorRateThreshold: 0.001, // 0.1%
  enableProfiling: true,
  enableMetrics: true,
  metricsRetentionPeriod: 86400000, // 24 hours
} as const;

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: DeepReadonly<Partial<SecurityConfig>> = {
  threatDetection: {
    enabled: true,
    sqlInjectionDetection: true,
    xssDetection: true,
    csrfProtection: true,
    sensitiveDataDetection: true,
    maliciousPayloadDetection: true,
    customPatterns: [],
    responseActions: [],
  },
} as const;

// ===== MODULE EXPORTS =====

/**
 * Comprehensive type export for external consumption
 */
export type {
  // Core types
  EnhancedParlantRequest,
  UserContext,
  SecurityContext,
  EnhancedPerformanceMetrics,

  // Configuration types
  EnhancedMiddlewareConfig,
  PerformanceConfig,
  SecurityConfig,

  // Event types
  MiddlewareEvents,
  TypedEventEmitter,

  // Utility types
  DeepReadonly,
  PartialExcept,
  ConfigBuilder,
};