/**
 * PARLANT Phase 1 Function Registration System - Core Types
 *
 * Comprehensive type definitions for function registration, discovery, and management.
 * Enables dynamic function wrapping, configuration management, and runtime control.
 *
 * @fileoverview Core registry type definitions for PARLANT function wrapping system
 * @version 1.0.0
 * @author Function Registration System Agent #1
 */

import {
  SecurityLevel,
  ValidationMode,
  ApprovalLevel,
  RiskLevel,
  FunctionSecurityLevel
} from '../../../types/parlant-integration.types';

// ===========================
// CORE REGISTRY TYPES
// ===========================

/**
 * Function registration entry in the PARLANT registry
 */
export interface FunctionRegistryEntry {
  /** Unique function identifier */
  id: string;

  /** Function name as it appears in code */
  name: string;

  /** Fully qualified function name with package/module path */
  qualifiedName: string;

  /** Function signature including parameters and return type */
  signature: FunctionSignature;

  /** Function metadata for documentation and discovery */
  metadata: FunctionMetadata;

  /** Security and risk assessment */
  security: FunctionSecurityAssessment;

  /** Registration configuration */
  config: FunctionRegistrationConfig;

  /** Dependency information */
  dependencies: FunctionDependencyInfo;

  /** Health and monitoring status */
  health: FunctionHealthStatus;

  /** Version information */
  version: FunctionVersionInfo;

  /** Registration timestamps */
  timestamps: RegistrationTimestamps;

  /** Current registration status */
  status: RegistrationStatus;
}

/**
 * Function signature definition
 */
export interface FunctionSignature {
  /** Parameter definitions */
  parameters: ParameterDefinition[];

  /** Return type information */
  returnType: TypeDefinition;

  /** Whether function is async */
  isAsync: boolean;

  /** Whether function is generator */
  isGenerator: boolean;

  /** Function overloads if applicable */
  overloads?: FunctionSignature[];

  /** Generic type parameters */
  generics?: GenericTypeParameter[];
}

/**
 * Parameter definition for function signature
 */
export interface ParameterDefinition {
  /** Parameter name */
  name: string;

  /** Parameter type */
  type: TypeDefinition;

  /** Whether parameter is optional */
  optional: boolean;

  /** Default value if any */
  defaultValue?: unknown;

  /** Parameter description */
  description?: string;

  /** Validation rules for parameter */
  validation?: ParameterValidationRule[];
}

/**
 * Type definition information
 */
export interface TypeDefinition {
  /** Type name */
  name: string;

  /** Type category */
  category: TypeCategory;

  /** Whether type is nullable */
  nullable: boolean;

  /** Whether type is array */
  isArray: boolean;

  /** Array dimensions if applicable */
  arrayDimensions?: number;

  /** Generic type arguments */
  typeArguments?: TypeDefinition[];

  /** Union types if applicable */
  unionTypes?: TypeDefinition[];

  /** Object properties if object type */
  properties?: PropertyDefinition[];
}

/**
 * Type categories
 */
export enum TypeCategory {
  _PRIMITIVE = "primitive",
  _OBJECT = "object",
  _ARRAY = "array",
  _FUNCTION = "function",
  _CLASS = "class",
  _INTERFACE = "interface",
  _ENUM = "enum",
  _UNION = "union",
  _GENERIC = "generic",
  _UNKNOWN = "unknown"
}

/**
 * Object property definition
 */
export interface PropertyDefinition {
  /** Property name */
  name: string;

  /** Property type */
  type: TypeDefinition;

  /** Whether property is optional */
  optional: boolean;

  /** Whether property is readonly */
  readonly: boolean;

  /** Property description */
  description?: string;
}

/**
 * Generic type parameter definition
 */
export interface GenericTypeParameter {
  /** Parameter name */
  name: string;

  /** Constraint type if any */
  constraint?: TypeDefinition;

  /** Default type if any */
  default?: TypeDefinition;
}

/**
 * Parameter validation rule
 */
export interface ParameterValidationRule {
  /** Rule type */
  type: ValidationRuleType;

  /** Rule configuration */
  config: Record<string, unknown>;

  /** Error message template */
  errorMessage: string;

  /** Rule priority */
  priority: number;
}

/**
 * Validation rule types
 */
export enum ValidationRuleType {
  _REQUIRED = "required",
  _TYPE_CHECK = "type_check",
  _MIN_VALUE = "min_value",
  _MAX_VALUE = "max_value",
  _MIN_LENGTH = "min_length",
  _MAX_LENGTH = "max_length",
  _PATTERN = "pattern",
  _CUSTOM = "custom"
}

/**
 * Function metadata for documentation and discovery
 */
export interface FunctionMetadata {
  /** Human-readable description */
  description: string;

  /** Function purpose/intent */
  purpose: string;

  /** Usage examples */
  examples: FunctionExample[];

  /** Documentation tags */
  tags: string[];

  /** Related functions */
  relatedFunctions: string[];

  /** Performance characteristics */
  performance: PerformanceCharacteristics;

  /** Author information */
  author: AuthorInfo;

  /** Documentation links */
  documentation: DocumentationLink[];

  /** Deprecation information if applicable */
  deprecation?: DeprecationInfo;
}

/**
 * Function usage example
 */
export interface FunctionExample {
  /** Example title */
  title: string;

  /** Example description */
  description: string;

  /** Example code */
  code: string;

  /** Expected output */
  expectedOutput?: string;

  /** Example category */
  category: ExampleCategory;
}

/**
 * Example categories
 */
export enum ExampleCategory {
  _BASIC_USAGE = "basic_usage",
  _ADVANCED_USAGE = "advanced_usage",
  _EDGE_CASE = "edge_case",
  _INTEGRATION = "integration",
  _PERFORMANCE = "performance"
}

/**
 * Performance characteristics
 */
export interface PerformanceCharacteristics {
  /** Time complexity */
  timeComplexity: string;

  /** Space complexity */
  spaceComplexity: string;

  /** Average execution time in milliseconds */
  averageExecutionTime?: number;

  /** Memory usage in bytes */
  memoryUsage?: number;

  /** CPU intensity level */
  cpuIntensity: IntensityLevel;

  /** I/O intensity level */
  ioIntensity: IntensityLevel;

  /** Network usage level */
  networkUsage: IntensityLevel;
}

/**
 * Intensity levels
 */
export enum IntensityLevel {
  _NONE = "none",
  _LOW = "low",
  _MEDIUM = "medium",
  _HIGH = "high",
  _EXTREME = "extreme"
}

/**
 * Author information
 */
export interface AuthorInfo {
  /** Author name */
  name: string;

  /** Author email */
  email?: string;

  /** Team/organization */
  team?: string;

  /** Creation date */
  createdAt: Date;

  /** Last modified by */
  lastModifiedBy?: string;

  /** Last modified date */
  lastModifiedAt?: Date;
}

/**
 * Documentation link
 */
export interface DocumentationLink {
  /** Link title */
  title: string;

  /** Link URL */
  url: string;

  /** Link type */
  type: DocumentationType;

  /** Link description */
  description?: string;
}

/**
 * Documentation types
 */
export enum DocumentationType {
  _API_DOCS = "api_docs",
  _TUTORIAL = "tutorial",
  _EXAMPLE = "example",
  _SPECIFICATION = "specification",
  _CHANGELOG = "changelog",
  _MIGRATION_GUIDE = "migration_guide"
}

/**
 * Deprecation information
 */
export interface DeprecationInfo {
  /** Deprecation reason */
  reason: string;

  /** Replacement function */
  replacement?: string;

  /** Deprecation date */
  deprecatedAt: Date;

  /** Planned removal date */
  removalDate?: Date;

  /** Migration guide */
  migrationGuide?: string;
}

/**
 * Function security assessment
 */
export interface FunctionSecurityAssessment {
  /** Security level */
  level: FunctionSecurityLevel;

  /** Risk level */
  risk: RiskLevel;

  /** Security considerations */
  considerations: SecurityConsideration[];

  /** Required permissions */
  permissions: Permission[];

  /** Security constraints */
  constraints: SecurityConstraint[];

  /** Audit requirements */
  auditRequirements: AuditRequirement[];
}

/**
 * Security consideration
 */
export interface SecurityConsideration {
  /** Consideration type */
  type: SecurityConsiderationType;

  /** Description */
  description: string;

  /** Severity level */
  severity: SecuritySeverity;

  /** Mitigation strategies */
  mitigations: string[];
}

/**
 * Security consideration types
 */
export enum SecurityConsiderationType {
  _DATA_ACCESS = "data_access",
  _EXTERNAL_COMMUNICATION = "external_communication",
  _FILE_SYSTEM_ACCESS = "file_system_access",
  _PRIVILEGE_ESCALATION = "privilege_escalation",
  _INJECTION_VULNERABILITY = "injection_vulnerability",
  _AUTHENTICATION_BYPASS = "authentication_bypass",
  _AUTHORIZATION_BYPASS = "authorization_bypass"
}

/**
 * Security severity levels
 */
export enum SecuritySeverity {
  _INFO = "info",
  _LOW = "low",
  _MEDIUM = "medium",
  _HIGH = "high",
  _CRITICAL = "critical"
}

/**
 * Permission definition
 */
export interface Permission {
  /** Permission name */
  name: string;

  /** Permission scope */
  scope: PermissionScope;

  /** Permission description */
  description: string;

  /** Whether permission is required */
  required: boolean;
}

/**
 * Permission scopes
 */
export enum PermissionScope {
  _READ = "read",
  _WRITE = "write",
  _EXECUTE = "execute",
  _ADMIN = "admin",
  _SYSTEM = "system"
}

/**
 * Security constraint
 */
export interface SecurityConstraint {
  /** Constraint type */
  type: SecurityConstraintType;

  /** Constraint configuration */
  config: Record<string, unknown>;

  /** Constraint description */
  description: string;

  /** Enforcement level */
  enforcement: EnforcementLevel;
}

/**
 * Security constraint types
 */
export enum SecurityConstraintType {
  _RATE_LIMITING = "rate_limiting",
  _IP_WHITELIST = "ip_whitelist",
  _TIME_WINDOW = "time_window",
  _USER_VERIFICATION = "user_verification",
  _MULTI_FACTOR_AUTH = "multi_factor_auth",
  _APPROVAL_REQUIRED = "approval_required"
}

/**
 * Enforcement levels
 */
export enum EnforcementLevel {
  _ADVISORY = "advisory",
  _WARNING = "warning",
  _BLOCKING = "blocking",
  _FATAL = "fatal"
}

/**
 * Audit requirement
 */
export interface AuditRequirement {
  /** Audit type */
  type: AuditType;

  /** Audit level */
  level: AuditLevel;

  /** Retention period in days */
  retentionPeriod: number;

  /** Audit description */
  description: string;
}

/**
 * Audit types
 */
export enum AuditType {
  _ACCESS_LOG = "access_log",
  _EXECUTION_LOG = "execution_log",
  _PARAMETER_LOG = "parameter_log",
  _RESULT_LOG = "result_log",
  _ERROR_LOG = "error_log",
  _SECURITY_EVENT = "security_event"
}

/**
 * Audit levels
 */
export enum AuditLevel {
  _NONE = "none",
  _BASIC = "basic",
  _DETAILED = "detailed",
  _COMPREHENSIVE = "comprehensive"
}

/**
 * Function registration configuration
 */
export interface FunctionRegistrationConfig {
  /** Whether function is enabled for wrapping */
  enabled: boolean;

  /** Default validation mode */
  defaultValidationMode: ValidationMode;

  /** Default approval level */
  defaultApprovalLevel: ApprovalLevel;

  /** Default timeout in milliseconds */
  defaultTimeout: number;

  /** Cache configuration */
  cache: CacheConfig;

  /** Monitoring configuration */
  monitoring: MonitoringConfig;

  /** Error handling configuration */
  errorHandling: ErrorHandlingConfig;

  /** Override settings */
  overrides: ConfigOverride[];
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Enable caching */
  enabled: boolean;

  /** Cache TTL in seconds */
  ttl: number;

  /** Cache strategy */
  strategy: CacheStrategy;

  /** Cache key pattern */
  keyPattern: string;

  /** Cache storage type */
  storageType: CacheStorageType;
}

/**
 * Cache strategies
 */
export enum CacheStrategy {
  _NONE = "none",
  _FUNCTION_LEVEL = "function_level",
  _PARAMETER_AWARE = "parameter_aware",
  _USER_AWARE = "user_aware",
  _CONTEXT_AWARE = "context_aware"
}

/**
 * Cache storage types
 */
export enum CacheStorageType {
  _MEMORY = "memory",
  _REDIS = "redis",
  _DATABASE = "database",
  _FILE_SYSTEM = "file_system"
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  /** Enable monitoring */
  enabled: boolean;

  /** Metrics to collect */
  metrics: MonitoringMetric[];

  /** Alerting configuration */
  alerting: AlertingConfig;

  /** Sampling rate */
  samplingRate: number;
}

/**
 * Monitoring metrics
 */
export enum MonitoringMetric {
  _EXECUTION_TIME = "execution_time",
  _MEMORY_USAGE = "memory_usage",
  _CPU_USAGE = "cpu_usage",
  _ERROR_RATE = "error_rate",
  _CALL_FREQUENCY = "call_frequency",
  _CACHE_HIT_RATE = "cache_hit_rate"
}

/**
 * Alerting configuration
 */
export interface AlertingConfig {
  /** Enable alerting */
  enabled: boolean;

  /** Alert thresholds */
  thresholds: AlertThreshold[];

  /** Notification channels */
  channels: NotificationChannel[];
}

/**
 * Alert threshold
 */
export interface AlertThreshold {
  /** Metric name */
  metric: MonitoringMetric;

  /** Threshold value */
  value: number;

  /** Comparison operator */
  operator: ComparisonOperator;

  /** Alert severity */
  severity: AlertSeverity;
}

/**
 * Comparison operators
 */
export enum ComparisonOperator {
  _GREATER_THAN = "gt",
  _GREATER_THAN_EQUAL = "gte",
  _LESS_THAN = "lt",
  _LESS_THAN_EQUAL = "lte",
  _EQUAL = "eq",
  _NOT_EQUAL = "ne"
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  _INFO = "info",
  _WARNING = "warning",
  _ERROR = "error",
  _CRITICAL = "critical"
}

/**
 * Notification channel
 */
export interface NotificationChannel {
  /** Channel type */
  type: ChannelType;

  /** Channel configuration */
  config: Record<string, unknown>;

  /** Channel description */
  description: string;
}

/**
 * Notification channel types
 */
export enum ChannelType {
  _EMAIL = "email",
  _SLACK = "slack",
  _WEBHOOK = "webhook",
  _SMS = "sms",
  _PAGER_DUTY = "pager_duty"
}

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfig {
  /** Error handling strategy */
  strategy: ErrorHandlingStrategy;

  /** Retry configuration */
  retry: RetryConfig;

  /** Circuit breaker configuration */
  circuitBreaker: CircuitBreakerConfig;

  /** Fallback configuration */
  fallback: FallbackConfig;
}

/**
 * Error handling strategies
 */
export enum ErrorHandlingStrategy {
  _FAIL_FAST = "fail_fast",
  _RETRY = "retry",
  _CIRCUIT_BREAKER = "circuit_breaker",
  _FALLBACK = "fallback",
  _HYBRID = "hybrid"
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number;

  /** Initial delay in milliseconds */
  initialDelay: number;

  /** Delay multiplier */
  delayMultiplier: number;

  /** Maximum delay */
  maxDelay: number;

  /** Jitter enabled */
  jitter: boolean;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold */
  failureThreshold: number;

  /** Success threshold */
  successThreshold: number;

  /** Timeout in milliseconds */
  timeout: number;

  /** Half-open retry delay */
  retryDelay: number;
}

/**
 * Fallback configuration
 */
export interface FallbackConfig {
  /** Fallback strategy */
  strategy: FallbackStrategy;

  /** Fallback configuration */
  config: Record<string, unknown>;
}

/**
 * Fallback strategies
 */
export enum FallbackStrategy {
  _RETURN_DEFAULT = "return_default",
  _RETURN_CACHED = "return_cached",
  _RETURN_ERROR = "return_error",
  _CALL_ALTERNATIVE = "call_alternative"
}

/**
 * Configuration override
 */
export interface ConfigOverride {
  /** Override condition */
  condition: OverrideCondition;

  /** Override configuration */
  config: Partial<FunctionRegistrationConfig>;

  /** Override description */
  description: string;

  /** Override priority */
  priority: number;
}

/**
 * Override condition
 */
export interface OverrideCondition {
  /** Condition type */
  type: ConditionType;

  /** Condition configuration */
  config: Record<string, unknown>;
}

/**
 * Condition types
 */
export enum ConditionType {
  _USER_ROLE = "user_role",
  _ENVIRONMENT = "environment",
  _TIME_WINDOW = "time_window",
  _PARAMETER_VALUE = "parameter_value",
  _CUSTOM = "custom"
}

/**
 * Function dependency information
 */
export interface FunctionDependencyInfo {
  /** Direct dependencies */
  direct: FunctionDependency[];

  /** Transitive dependencies */
  transitive: FunctionDependency[];

  /** Dependent functions */
  dependents: FunctionDependency[];

  /** External dependencies */
  external: ExternalDependency[];

  /** Dependency graph metadata */
  graphMetadata: DependencyGraphMetadata;
}

/**
 * Function dependency
 */
export interface FunctionDependency {
  /** Dependency function ID */
  functionId: string;

  /** Dependency type */
  type: DependencyType;

  /** Dependency strength */
  strength: DependencyStrength;

  /** Call frequency */
  callFrequency: CallFrequency;
}

/**
 * Dependency types
 */
export enum DependencyType {
  _SYNCHRONOUS_CALL = "synchronous_call",
  _ASYNCHRONOUS_CALL = "asynchronous_call",
  _CALLBACK = "callback",
  _EVENT_HANDLER = "event_handler",
  _COMPOSITION = "composition",
  _INHERITANCE = "inheritance"
}

/**
 * Dependency strength levels
 */
export enum DependencyStrength {
  _WEAK = "weak",
  _MODERATE = "moderate",
  _STRONG = "strong",
  _CRITICAL = "critical"
}

/**
 * Call frequency levels
 */
export enum CallFrequency {
  _RARE = "rare",
  _OCCASIONAL = "occasional",
  _FREQUENT = "frequent",
  _CONSTANT = "constant"
}

/**
 * External dependency
 */
export interface ExternalDependency {
  /** Dependency name */
  name: string;

  /** Dependency type */
  type: ExternalDependencyType;

  /** Version constraint */
  version: string;

  /** Dependency description */
  description: string;

  /** Whether dependency is optional */
  optional: boolean;
}

/**
 * External dependency types
 */
export enum ExternalDependencyType {
  _PACKAGE = "package",
  _SERVICE = "service",
  _DATABASE = "database",
  _FILE_SYSTEM = "file_system",
  _NETWORK_RESOURCE = "network_resource",
  _SYSTEM_RESOURCE = "system_resource"
}

/**
 * Dependency graph metadata
 */
export interface DependencyGraphMetadata {
  /** Graph complexity score */
  complexity: number;

  /** Graph depth */
  depth: number;

  /** Graph breadth */
  breadth: number;

  /** Circular dependencies detected */
  circularDependencies: boolean;

  /** Critical path analysis */
  criticalPath: string[];
}

/**
 * Function health status
 */
export interface FunctionHealthStatus {
  /** Overall health score */
  score: number;

  /** Health indicators */
  indicators: HealthIndicator[];

  /** Last health check timestamp */
  lastCheck: Date;

  /** Health trend */
  trend: HealthTrend;

  /** Health history */
  history: HealthCheckResult[];
}

/**
 * Health indicator
 */
export interface HealthIndicator {
  /** Indicator name */
  name: string;

  /** Indicator value */
  value: number;

  /** Indicator status */
  status: HealthStatus;

  /** Indicator description */
  description: string;
}

/**
 * Health status levels
 */
export enum HealthStatus {
  _HEALTHY = "healthy",
  _WARNING = "warning",
  _UNHEALTHY = "unhealthy",
  _CRITICAL = "critical",
  _UNKNOWN = "unknown"
}

/**
 * Health trends
 */
export enum HealthTrend {
  _IMPROVING = "improving",
  _STABLE = "stable",
  _DEGRADING = "degrading",
  _UNKNOWN = "unknown"
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  /** Check timestamp */
  timestamp: Date;

  /** Health score */
  score: number;

  /** Health status */
  status: HealthStatus;

  /** Check duration */
  duration: number;

  /** Check details */
  details: Record<string, unknown>;
}

/**
 * Function version information
 */
export interface FunctionVersionInfo {
  /** Current version */
  current: string;

  /** Version history */
  history: VersionEntry[];

  /** Version comparison */
  comparison: VersionComparison;

  /** Migration information */
  migration: MigrationInfo;
}

/**
 * Version entry
 */
export interface VersionEntry {
  /** Version number */
  version: string;

  /** Version timestamp */
  timestamp: Date;

  /** Version author */
  author: string;

  /** Version changes */
  changes: VersionChange[];

  /** Version tags */
  tags: string[];
}

/**
 * Version change
 */
export interface VersionChange {
  /** Change type */
  type: ChangeType;

  /** Change description */
  description: string;

  /** Breaking change indicator */
  breaking: boolean;

  /** Change impact */
  impact: ChangeImpact;
}

/**
 * Change types
 */
export enum ChangeType {
  _FEATURE = "feature",
  _BUGFIX = "bugfix",
  _PERFORMANCE = "performance",
  _SECURITY = "security",
  _DEPRECATION = "deprecation",
  _REMOVAL = "removal"
}

/**
 * Change impact levels
 */
export enum ChangeImpact {
  _NONE = "none",
  _MINOR = "minor",
  _MODERATE = "moderate",
  _MAJOR = "major",
  _BREAKING = "breaking"
}

/**
 * Version comparison
 */
export interface VersionComparison {
  /** Comparison with previous version */
  previousVersion: VersionDiff;

  /** Comparison with latest stable */
  latestStable: VersionDiff;

  /** Compatibility matrix */
  compatibility: CompatibilityMatrix;
}

/**
 * Version difference
 */
export interface VersionDiff {
  /** Version being compared */
  version: string;

  /** Differences found */
  differences: VersionChange[];

  /** Compatibility status */
  compatible: boolean;

  /** Migration required */
  migrationRequired: boolean;
}

/**
 * Compatibility matrix
 */
export interface CompatibilityMatrix {
  /** Backward compatibility */
  backward: CompatibilityLevel;

  /** Forward compatibility */
  forward: CompatibilityLevel;

  /** API compatibility */
  api: CompatibilityLevel;

  /** Binary compatibility */
  binary: CompatibilityLevel;
}

/**
 * Compatibility levels
 */
export enum CompatibilityLevel {
  _FULL = "full",
  _PARTIAL = "partial",
  _NONE = "none",
  _UNKNOWN = "unknown"
}

/**
 * Migration information
 */
export interface MigrationInfo {
  /** Migration required */
  required: boolean;

  /** Migration steps */
  steps: MigrationStep[];

  /** Migration complexity */
  complexity: MigrationComplexity;

  /** Estimated duration */
  estimatedDuration: string;
}

/**
 * Migration step
 */
export interface MigrationStep {
  /** Step order */
  order: number;

  /** Step description */
  description: string;

  /** Step type */
  type: MigrationStepType;

  /** Step automation level */
  automation: AutomationLevel;

  /** Step validation */
  validation: StepValidation;
}

/**
 * Migration step types
 */
export enum MigrationStepType {
  _PREPARATION = "preparation",
  _CODE_CHANGE = "code_change",
  _CONFIGURATION = "configuration",
  _DATA_MIGRATION = "data_migration",
  _TESTING = "testing",
  _DEPLOYMENT = "deployment",
  _VALIDATION = "validation"
}

/**
 * Automation levels
 */
export enum AutomationLevel {
  _MANUAL = "manual",
  _SEMI_AUTOMATED = "semi_automated",
  _FULLY_AUTOMATED = "fully_automated"
}

/**
 * Step validation
 */
export interface StepValidation {
  /** Validation criteria */
  criteria: ValidationCriteria[];

  /** Success indicators */
  successIndicators: string[];

  /** Rollback procedure */
  rollbackProcedure: string;
}

/**
 * Validation criteria
 */
export interface ValidationCriteria {
  /** Criteria name */
  name: string;

  /** Criteria type */
  type: CriteriaType;

  /** Expected value */
  expected: unknown;

  /** Validation method */
  method: ValidationMethod;
}

/**
 * Criteria types
 */
export enum CriteriaType {
  _FUNCTIONAL = "functional",
  _PERFORMANCE = "performance",
  _SECURITY = "security",
  _COMPATIBILITY = "compatibility",
  _COMPLIANCE = "compliance"
}

/**
 * Validation methods
 */
export enum ValidationMethod {
  _UNIT_TEST = "unit_test",
  _INTEGRATION_TEST = "integration_test",
  _PERFORMANCE_TEST = "performance_test",
  _SECURITY_SCAN = "security_scan",
  _MANUAL_VERIFICATION = "manual_verification"
}

/**
 * Migration complexity levels
 */
export enum MigrationComplexity {
  _TRIVIAL = "trivial",
  _SIMPLE = "simple",
  _MODERATE = "moderate",
  _COMPLEX = "complex",
  _VERY_COMPLEX = "very_complex"
}

/**
 * Registration timestamps
 */
export interface RegistrationTimestamps {
  /** Initial registration time */
  registered: Date;

  /** Last update time */
  updated: Date;

  /** Last access time */
  accessed: Date;

  /** Last health check time */
  healthCheck: Date;

  /** Last validation time */
  validated: Date;
}

/**
 * Registration status
 */
export enum RegistrationStatus {
  _ACTIVE = "active",
  _INACTIVE = "inactive",
  _DEPRECATED = "deprecated",
  _MAINTENANCE = "maintenance",
  _ERROR = "error",
  _UNKNOWN = "unknown"
}

// ===========================
// REGISTRY OPERATION TYPES
// ===========================

/**
 * Function discovery result
 */
export interface FunctionDiscoveryResult {
  /** Discovered functions */
  functions: FunctionDiscoveryEntry[];

  /** Discovery metadata */
  metadata: DiscoveryMetadata;

  /** Discovery statistics */
  statistics: DiscoveryStatistics;
}

/**
 * Function discovery entry
 */
export interface FunctionDiscoveryEntry {
  /** Function name */
  name: string;

  /** Function location */
  location: SourceLocation;

  /** Discovered signature */
  signature: FunctionSignature;

  /** Discovery confidence */
  confidence: number;

  /** Discovery method */
  method: DiscoveryMethod;
}

/**
 * Source location for discovered functions
 */
export interface SourceLocation {
  /** File path */
  filePath: string;

  /** Line number */
  lineNumber: number;

  /** Column number */
  columnNumber: number;

  /** Module name */
  moduleName: string;

  /** Package name */
  packageName: string;
}

/**
 * Discovery methods
 */
export enum DiscoveryMethod {
  _STATIC_ANALYSIS = "static_analysis",
  _RUNTIME_REFLECTION = "runtime_reflection",
  _AST_PARSING = "ast_parsing",
  _ANNOTATION_SCANNING = "annotation_scanning",
  _CONFIGURATION_BASED = "configuration_based"
}

/**
 * Discovery metadata
 */
export interface DiscoveryMetadata {
  /** Discovery session ID */
  sessionId: string;

  /** Discovery timestamp */
  timestamp: Date;

  /** Discovery scope */
  scope: DiscoveryScope;

  /** Discovery configuration */
  configuration: DiscoveryConfiguration;

  /** Discovery duration */
  duration: number;
}

/**
 * Discovery scope
 */
export interface DiscoveryScope {
  /** Paths to scan */
  paths: string[];

  /** File patterns to include */
  includePatterns: string[];

  /** File patterns to exclude */
  excludePatterns: string[];

  /** Maximum depth */
  maxDepth: number;

  /** Follow symlinks */
  followSymlinks: boolean;
}

/**
 * Discovery configuration
 */
export interface DiscoveryConfiguration {
  /** Discovery methods to use */
  methods: DiscoveryMethod[];

  /** Minimum confidence threshold */
  confidenceThreshold: number;

  /** Maximum functions to discover */
  maxFunctions: number;

  /** Timeout in milliseconds */
  timeout: number;

  /** Parallel processing enabled */
  parallel: boolean;
}

/**
 * Discovery statistics
 */
export interface DiscoveryStatistics {
  /** Total files scanned */
  filesScanned: number;

  /** Total functions discovered */
  functionsDiscovered: number;

  /** Functions registered */
  functionsRegistered: number;

  /** Functions skipped */
  functionsSkipped: number;

  /** Discovery errors */
  errors: number;

  /** Average confidence */
  averageConfidence: number;
}

/**
 * Registry query interface
 */
export interface RegistryQuery {
  /** Query filters */
  filters: QueryFilter[];

  /** Sort configuration */
  sort: SortConfiguration;

  /** Pagination */
  pagination: PaginationConfiguration;

  /** Include options */
  include: IncludeOptions;
}

/**
 * Query filter
 */
export interface QueryFilter {
  /** Field to filter on */
  field: string;

  /** Filter operator */
  operator: FilterOperator;

  /** Filter value */
  value: unknown;

  /** Case sensitive */
  caseSensitive: boolean;
}

/**
 * Filter operators
 */
export enum FilterOperator {
  _EQUALS = "eq",
  _NOT_EQUALS = "ne",
  _CONTAINS = "contains",
  _NOT_CONTAINS = "not_contains",
  _STARTS_WITH = "starts_with",
  _ENDS_WITH = "ends_with",
  _GREATER_THAN = "gt",
  _GREATER_THAN_EQUAL = "gte",
  _LESS_THAN = "lt",
  _LESS_THAN_EQUAL = "lte",
  _IN = "in",
  _NOT_IN = "not_in"
}

/**
 * Sort configuration
 */
export interface SortConfiguration {
  /** Field to sort by */
  field: string;

  /** Sort direction */
  direction: SortDirection;

  /** Secondary sort fields */
  secondary?: SortConfiguration[];
}

/**
 * Sort directions
 */
export enum SortDirection {
  _ASC = "asc",
  _DESC = "desc"
}

/**
 * Pagination configuration
 */
export interface PaginationConfiguration {
  /** Page number */
  page: number;

  /** Page size */
  size: number;

  /** Offset */
  offset: number;

  /** Maximum results */
  maxResults: number;
}

/**
 * Include options for query results
 */
export interface IncludeOptions {
  /** Include metadata */
  metadata: boolean;

  /** Include dependencies */
  dependencies: boolean;

  /** Include health status */
  health: boolean;

  /** Include version info */
  version: boolean;

  /** Include configuration */
  configuration: boolean;
}

/**
 * Registry query result
 */
export interface RegistryQueryResult {
  /** Matching functions */
  functions: FunctionRegistryEntry[];

  /** Total count */
  totalCount: number;

  /** Page info */
  pageInfo: PageInfo;

  /** Query execution metadata */
  metadata: QueryExecutionMetadata;
}

/**
 * Page information
 */
export interface PageInfo {
  /** Current page */
  currentPage: number;

  /** Page size */
  pageSize: number;

  /** Total pages */
  totalPages: number;

  /** Has next page */
  hasNextPage: boolean;

  /** Has previous page */
  hasPreviousPage: boolean;
}

/**
 * Query execution metadata
 */
export interface QueryExecutionMetadata {
  /** Execution time in milliseconds */
  executionTime: number;

  /** Cache hit */
  cacheHit: boolean;

  /** Query complexity score */
  complexity: number;

  /** Index usage */
  indexUsage: IndexUsage[];
}

/**
 * Index usage information
 */
export interface IndexUsage {
  /** Index name */
  name: string;

  /** Whether index was used */
  used: boolean;

  /** Index effectiveness */
  effectiveness: number;
}