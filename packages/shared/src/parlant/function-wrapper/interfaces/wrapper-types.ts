/**
 * PARLANT Phase 1 Function Wrapper Framework - Core TypeScript Interfaces
 *
 * Universal type-safe function wrapping infrastructure for database functions
 * with PARLANT conversational validation while maintaining original function
 * signatures and behavior.
 *
 * @fileoverview Core TypeScript interfaces with generic type support
 * @version 1.0.0
 * @author Function Wrapper Framework Agent
 * @created 2025-09-19
 */

import { Logger } from '@nestjs/common';

/**
 * Generic function type constraint for wrapped functions
 * Supports both sync and async functions with any parameter signature
 */
export type AnyFunction = (...args: any[]) => any;
export type AsyncFunction<T extends AnyFunction = AnyFunction> = T extends (...args: any[]) => Promise<infer R>
  ? T
  : (...args: Parameters<T>) => Promise<ReturnType<T>>;

/**
 * Function signature preservation type
 * Maintains exact parameter types and return types while adding wrapper functionality
 */
export type WrapFunction<T extends AnyFunction> = T extends (...args: infer P) => infer R
  ? R extends Promise<infer U>
    ? (...args: P) => Promise<WrapperResult<U>>
    : (...args: P) => Promise<WrapperResult<R>>
  : never;

/**
 * Core wrapper configuration interface
 * Defines validation, caching, and monitoring options for wrapped functions
 */
export interface WrapperConfig {
  /** Unique identifier for the wrapped function */
  readonly functionId: string;

  /** Human-readable description for PARLANT conversation context */
  readonly description: string;

  /** PARLANT validation level */
  readonly validationLevel: ValidationLevel;

  /** Enable result caching */
  readonly cacheable?: boolean;

  /** Cache TTL in milliseconds */
  readonly cacheTtl?: number;

  /** Enable performance monitoring */
  readonly monitoring?: boolean;

  /** Custom validation rules */
  readonly customValidation?: ValidationRule[];

  /** Timeout for PARLANT validation in milliseconds */
  readonly validationTimeout?: number;

  /** Enable async processing */
  readonly asyncMode?: boolean;

  /** Batch processing configuration */
  readonly batchConfig?: BatchConfig;

  /** Error handling strategy */
  readonly errorStrategy?: ErrorStrategy;

  /** Metadata for function categorization */
  readonly metadata?: WrapperMetadata;
}

/**
 * PARLANT validation security levels
 * Determines depth and rigor of conversational validation
 */
export enum ValidationLevel {
  /** Critical operations requiring multi-factor validation */
  CRITICAL = 'critical',

  /** High-priority operations with enhanced validation */
  HIGH = 'high',

  /** Standard operations with basic validation */
  MEDIUM = 'medium',

  /** Low-priority operations with minimal overhead */
  LOW = 'low',

  /** Optional validation for development/testing */
  OPTIONAL = 'optional'
}

/**
 * Custom validation rule definition
 * Enables granular control over validation logic
 */
export interface ValidationRule {
  /** Rule identifier */
  readonly id: string;

  /** Rule description for PARLANT context */
  readonly description: string;

  /** Validation function */
  readonly validator: (params: any[], context: ValidationContext) => Promise<ValidationResult>;

  /** Rule priority (higher numbers execute first) */
  readonly priority?: number;

  /** Continue validation on rule failure */
  readonly continueOnFailure?: boolean;
}

/**
 * Validation context passed to validation rules
 * Provides complete context for intelligent validation decisions
 */
export interface ValidationContext {
  /** Function being validated */
  readonly functionName: string;

  /** Function parameters */
  readonly parameters: readonly any[];

  /** User context from PARLANT session */
  readonly userContext: UserContext;

  /** Conversation session ID */
  readonly conversationId: string;

  /** Previous validation results in session */
  readonly previousValidations: ValidationResult[];

  /** System timestamp */
  readonly timestamp: Date;

  /** Additional metadata */
  readonly metadata: Record<string, any>;
}

/**
 * User context from PARLANT authentication
 * Links wrapper validation to user identity and permissions
 */
export interface UserContext {
  /** User unique identifier */
  readonly userId: string;

  /** JWT authentication token */
  readonly authToken: string;

  /** User roles and permissions */
  readonly permissions: readonly string[];

  /** User session metadata */
  readonly sessionMetadata: Record<string, any>;

  /** Request IP address */
  readonly ipAddress?: string;

  /** User agent string */
  readonly userAgent?: string;
}

/**
 * Validation result from PARLANT conversation
 * Contains approval status and detailed reasoning
 */
export interface ValidationResult {
  /** Validation approved/rejected */
  readonly approved: boolean;

  /** Unique validation ID for audit trail */
  readonly validationId: string;

  /** Human-readable reason for decision */
  readonly reason: string;

  /** Conversation context that led to decision */
  readonly conversationContext: ConversationContext;

  /** Confidence score (0-1) */
  readonly confidence: number;

  /** Validation execution time in milliseconds */
  readonly executionTime: number;

  /** Additional validation metadata */
  readonly metadata: Record<string, any>;

  /** Suggested actions if validation failed */
  readonly suggestedActions?: string[];
}

/**
 * PARLANT conversation context
 * Captures conversational state for audit and debugging
 */
export interface ConversationContext {
  /** Conversation session ID */
  readonly sessionId: string;

  /** Messages exchanged during validation */
  readonly messages: readonly ConversationMessage[];

  /** Guidelines applied during validation */
  readonly appliedGuidelines: readonly string[];

  /** Tools invoked during validation */
  readonly toolsInvoked: readonly string[];

  /** Conversation state */
  readonly state: ConversationState;
}

/**
 * Individual conversation message
 * Represents single exchange in PARLANT validation
 */
export interface ConversationMessage {
  /** Message unique ID */
  readonly id: string;

  /** Message role (user, assistant, system) */
  readonly role: 'user' | 'assistant' | 'system';

  /** Message content */
  readonly content: string;

  /** Message timestamp */
  readonly timestamp: Date;

  /** Message metadata */
  readonly metadata?: Record<string, any>;
}

/**
 * Conversation state enumeration
 * Tracks current state of PARLANT validation conversation
 */
export enum ConversationState {
  INITIATED = 'initiated',
  VALIDATING = 'validating',
  WAITING_FOR_INPUT = 'waiting_for_input',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  TIMEOUT = 'timeout',
  ERROR = 'error'
}

/**
 * Wrapper execution result
 * Contains original function result plus wrapper metadata
 */
export interface WrapperResult<T> {
  /** Original function result */
  readonly result: T;

  /** Wrapper execution metadata */
  readonly metadata: ExecutionMetadata;

  /** Success indicator */
  readonly success: boolean;

  /** Error information if execution failed */
  readonly error?: WrapperError;
}

/**
 * Wrapper execution metadata
 * Performance and audit information from wrapper execution
 */
export interface ExecutionMetadata {
  /** Unique execution ID */
  readonly executionId: string;

  /** Total execution time including validation */
  readonly totalExecutionTime: number;

  /** Function execution time (excluding validation) */
  readonly functionExecutionTime: number;

  /** Validation execution time */
  readonly validationExecutionTime: number;

  /** Cache hit/miss status */
  readonly cacheStatus: CacheStatus;

  /** Validation result reference */
  readonly validationResult: ValidationResult;

  /** Performance metrics */
  readonly performanceMetrics: PerformanceMetrics;

  /** Audit trail information */
  readonly auditTrail: AuditTrail;
}

/**
 * Cache status enumeration
 * Tracks cache behavior for performance optimization
 */
export enum CacheStatus {
  HIT = 'hit',
  MISS = 'miss',
  BYPASS = 'bypass',
  ERROR = 'error',
  DISABLED = 'disabled'
}

/**
 * Performance metrics for monitoring
 * Detailed performance data for optimization
 */
export interface PerformanceMetrics {
  /** Memory usage before execution */
  readonly memoryBefore: number;

  /** Memory usage after execution */
  readonly memoryAfter: number;

  /** Memory delta */
  readonly memoryDelta: number;

  /** CPU time consumed */
  readonly cpuTime: number;

  /** Network requests made */
  readonly networkRequests: number;

  /** Database queries executed */
  readonly databaseQueries: number;

  /** Custom performance counters */
  readonly customMetrics: Record<string, number>;
}

/**
 * Audit trail for compliance and debugging
 * Complete record of wrapper execution for audit purposes
 */
export interface AuditTrail {
  /** Execution start timestamp */
  readonly startTime: Date;

  /** Execution end timestamp */
  readonly endTime: Date;

  /** Function name and parameters */
  readonly functionCall: FunctionCall;

  /** User context at execution */
  readonly userContext: UserContext;

  /** Validation steps performed */
  readonly validationSteps: readonly ValidationStep[];

  /** Result summary */
  readonly resultSummary: ResultSummary;

  /** Additional audit metadata */
  readonly auditMetadata: Record<string, any>;
}

/**
 * Function call information for audit
 * Captures complete function invocation details
 */
export interface FunctionCall {
  /** Function name */
  readonly functionName: string;

  /** Function parameters (sanitized) */
  readonly parameters: readonly any[];

  /** Parameter types */
  readonly parameterTypes: readonly string[];

  /** Return type */
  readonly returnType: string;

  /** Source location */
  readonly sourceLocation?: string;
}

/**
 * Individual validation step for audit
 * Records each validation decision point
 */
export interface ValidationStep {
  /** Step unique ID */
  readonly stepId: string;

  /** Step description */
  readonly description: string;

  /** Step result */
  readonly result: 'passed' | 'failed' | 'skipped';

  /** Step execution time */
  readonly executionTime: number;

  /** Step metadata */
  readonly metadata: Record<string, any>;
}

/**
 * Result summary for audit
 * High-level summary of execution outcome
 */
export interface ResultSummary {
  /** Success/failure status */
  readonly success: boolean;

  /** Result type */
  readonly resultType: string;

  /** Result size (if applicable) */
  readonly resultSize?: number;

  /** Error category (if failed) */
  readonly errorCategory?: string;

  /** Business impact assessment */
  readonly businessImpact?: BusinessImpact;
}

/**
 * Business impact assessment
 * Evaluates business significance of function execution
 */
export interface BusinessImpact {
  /** Impact level */
  readonly level: 'low' | 'medium' | 'high' | 'critical';

  /** Affected systems */
  readonly affectedSystems: readonly string[];

  /** Data sensitivity level */
  readonly dataSensitivity: 'public' | 'internal' | 'confidential' | 'restricted';

  /** Compliance requirements */
  readonly complianceRequirements: readonly string[];
}

/**
 * Wrapper error information
 * Detailed error context for debugging and recovery
 */
export interface WrapperError {
  /** Error code */
  readonly code: string;

  /** Error message */
  readonly message: string;

  /** Original error (if applicable) */
  readonly originalError?: Error;

  /** Error category */
  readonly category: ErrorCategory;

  /** Error metadata */
  readonly metadata: Record<string, any>;

  /** Recovery suggestions */
  readonly recoverySuggestions?: string[];

  /** Error stack trace */
  readonly stackTrace?: string;
}

/**
 * Error category enumeration
 * Categorizes errors for appropriate handling
 */
export enum ErrorCategory {
  VALIDATION_ERROR = 'validation_error',
  TIMEOUT_ERROR = 'timeout_error',
  PERMISSION_ERROR = 'permission_error',
  NETWORK_ERROR = 'network_error',
  SYSTEM_ERROR = 'system_error',
  USER_ERROR = 'user_error',
  CONFIGURATION_ERROR = 'configuration_error'
}

/**
 * Batch processing configuration
 * Optimizes performance for bulk operations
 */
export interface BatchConfig {
  /** Maximum batch size */
  readonly maxBatchSize: number;

  /** Batch timeout in milliseconds */
  readonly batchTimeout: number;

  /** Batch processing strategy */
  readonly strategy: BatchStrategy;

  /** Enable parallel processing within batch */
  readonly parallelProcessing?: boolean;

  /** Maximum parallel threads */
  readonly maxParallelThreads?: number;
}

/**
 * Batch processing strategy
 * Defines how batched operations are processed
 */
export enum BatchStrategy {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  ADAPTIVE = 'adaptive',
  PRIORITY_BASED = 'priority_based'
}

/**
 * Error handling strategy
 * Defines how errors are handled and recovered
 */
export interface ErrorStrategy {
  /** Retry configuration */
  readonly retryConfig?: RetryConfig;

  /** Fallback behavior */
  readonly fallbackBehavior: FallbackBehavior;

  /** Error notification settings */
  readonly notificationSettings?: NotificationSettings;

  /** Circuit breaker configuration */
  readonly circuitBreakerConfig?: CircuitBreakerConfig;
}

/**
 * Retry configuration for failed operations
 * Implements intelligent retry logic
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  readonly maxRetries: number;

  /** Base delay between retries */
  readonly baseDelay: number;

  /** Backoff strategy */
  readonly backoffStrategy: BackoffStrategy;

  /** Maximum delay between retries */
  readonly maxDelay: number;

  /** Jitter factor (0-1) */
  readonly jitter?: number;
}

/**
 * Backoff strategy for retries
 * Defines delay calculation between retry attempts
 */
export enum BackoffStrategy {
  FIXED = 'fixed',
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential',
  FIBONACCI = 'fibonacci'
}

/**
 * Fallback behavior on error
 * Defines system behavior when operations fail
 */
export enum FallbackBehavior {
  THROW_ERROR = 'throw_error',
  RETURN_DEFAULT = 'return_default',
  RETURN_CACHED = 'return_cached',
  EXECUTE_FALLBACK = 'execute_fallback',
  SKIP_VALIDATION = 'skip_validation'
}

/**
 * Notification settings for error handling
 * Configures alerting and monitoring
 */
export interface NotificationSettings {
  /** Enable email notifications */
  readonly emailNotifications?: boolean;

  /** Email recipients */
  readonly emailRecipients?: readonly string[];

  /** Enable Slack notifications */
  readonly slackNotifications?: boolean;

  /** Slack webhook URL */
  readonly slackWebhook?: string;

  /** Enable system logging */
  readonly systemLogging?: boolean;

  /** Custom notification handlers */
  readonly customHandlers?: readonly string[];
}

/**
 * Circuit breaker configuration
 * Prevents cascading failures
 */
export interface CircuitBreakerConfig {
  /** Failure threshold to open circuit */
  readonly failureThreshold: number;

  /** Success threshold to close circuit */
  readonly successThreshold: number;

  /** Timeout in open state */
  readonly timeout: number;

  /** Monitoring window duration */
  readonly monitoringWindow: number;

  /** Enable adaptive thresholds */
  readonly adaptiveThresholds?: boolean;
}

/**
 * Wrapper metadata for categorization
 * Additional information for function organization
 */
export interface WrapperMetadata {
  /** Function category */
  readonly category: FunctionCategory;

  /** Business domain */
  readonly domain: string;

  /** Data classification */
  readonly dataClassification: DataClassification;

  /** Service dependencies */
  readonly dependencies: readonly string[];

  /** SLA requirements */
  readonly slaRequirements?: SlaRequirements;

  /** Custom tags */
  readonly tags: readonly string[];
}

/**
 * Function category enumeration
 * Categorizes functions by operational type
 */
export enum FunctionCategory {
  DATABASE_READ = 'database_read',
  DATABASE_WRITE = 'database_write',
  API_CALL = 'api_call',
  FILE_OPERATION = 'file_operation',
  COMPUTATION = 'computation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  MONITORING = 'monitoring',
  UTILITY = 'utility'
}

/**
 * Data classification levels
 * Defines data sensitivity for security decisions
 */
export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  TOP_SECRET = 'top_secret'
}

/**
 * SLA requirements definition
 * Performance and availability requirements
 */
export interface SlaRequirements {
  /** Maximum response time in milliseconds */
  readonly maxResponseTime: number;

  /** Required availability percentage */
  readonly availability: number;

  /** Maximum error rate percentage */
  readonly maxErrorRate: number;

  /** Required throughput (operations per second) */
  readonly throughput: number;
}

/**
 * Function wrapper factory interface
 * Creates configured function wrappers
 */
export interface FunctionWrapperFactory {
  /**
   * Create a wrapped function with PARLANT validation
   *
   * @param originalFunction - Function to wrap
   * @param config - Wrapper configuration
   * @returns Wrapped function with preserved signature
   */
  createWrapper<T extends AnyFunction>(
    originalFunction: T,
    config: WrapperConfig
  ): WrapFunction<T>;

  /**
   * Create multiple wrapped functions
   *
   * @param functions - Map of function name to function
   * @param configs - Map of function name to config
   * @returns Map of wrapped functions
   */
  createBatchWrappers<T extends Record<string, AnyFunction>>(
    functions: T,
    configs: Record<keyof T, WrapperConfig>
  ): { [K in keyof T]: WrapFunction<T[K]> };

  /**
   * Register a validation rule globally
   *
   * @param rule - Validation rule to register
   */
  registerValidationRule(rule: ValidationRule): void;

  /**
   * Get factory configuration
   *
   * @returns Current factory configuration
   */
  getConfiguration(): FactoryConfiguration;

  /**
   * Update factory configuration
   *
   * @param config - New configuration
   */
  updateConfiguration(config: Partial<FactoryConfiguration>): void;
}

/**
 * Factory configuration interface
 * Global settings for the wrapper factory
 */
export interface FactoryConfiguration {
  /** Default PARLANT client configuration */
  readonly defaultParlantConfig: ParlantClientConfig;

  /** Default caching configuration */
  readonly defaultCacheConfig: CacheConfiguration;

  /** Default monitoring configuration */
  readonly defaultMonitoringConfig: MonitoringConfiguration;

  /** Global validation rules */
  readonly globalValidationRules: readonly ValidationRule[];

  /** Performance optimization settings */
  readonly performanceConfig: PerformanceConfiguration;

  /** Security settings */
  readonly securityConfig: SecurityConfiguration;
}

/**
 * PARLANT client configuration
 * Settings for PARLANT service integration
 */
export interface ParlantClientConfig {
  /** PARLANT service URL */
  readonly serviceUrl: string;

  /** API key for authentication */
  readonly apiKey: string;

  /** Default timeout for requests */
  readonly timeout: number;

  /** Retry configuration */
  readonly retryConfig: RetryConfig;

  /** Connection pool settings */
  readonly connectionPool?: ConnectionPoolConfig;

  /** WebSocket configuration */
  readonly websocketConfig?: WebSocketConfig;
}

/**
 * Cache configuration
 * Settings for result caching
 */
export interface CacheConfiguration {
  /** Cache provider type */
  readonly provider: CacheProvider;

  /** Default TTL in milliseconds */
  readonly defaultTtl: number;

  /** Maximum cache size */
  readonly maxSize: number;

  /** Cache eviction strategy */
  readonly evictionStrategy: EvictionStrategy;

  /** Enable cache statistics */
  readonly enableStatistics?: boolean;

  /** Cache serialization format */
  readonly serializationFormat?: SerializationFormat;
}

/**
 * Cache provider enumeration
 * Supported cache implementations
 */
export enum CacheProvider {
  MEMORY = 'memory',
  REDIS = 'redis',
  MEMCACHED = 'memcached',
  HYBRID = 'hybrid'
}

/**
 * Cache eviction strategy
 * Defines how cache entries are removed
 */
export enum EvictionStrategy {
  LRU = 'lru',
  LFU = 'lfu',
  FIFO = 'fifo',
  TTL_BASED = 'ttl_based',
  ADAPTIVE = 'adaptive'
}

/**
 * Serialization format for cache
 * Defines how data is serialized in cache
 */
export enum SerializationFormat {
  JSON = 'json',
  BINARY = 'binary',
  COMPRESSED = 'compressed',
  CUSTOM = 'custom'
}

/**
 * Monitoring configuration
 * Settings for performance and health monitoring
 */
export interface MonitoringConfiguration {
  /** Enable performance monitoring */
  readonly enablePerformanceMonitoring: boolean;

  /** Enable health checks */
  readonly enableHealthChecks: boolean;

  /** Metrics collection interval */
  readonly metricsInterval: number;

  /** Metrics retention period */
  readonly metricsRetention: number;

  /** Alert thresholds */
  readonly alertThresholds: AlertThresholds;

  /** Custom metric collectors */
  readonly customCollectors?: readonly string[];
}

/**
 * Alert thresholds configuration
 * Defines when to trigger alerts
 */
export interface AlertThresholds {
  /** Response time threshold in milliseconds */
  readonly responseTimeThreshold: number;

  /** Error rate threshold (0-1) */
  readonly errorRateThreshold: number;

  /** Memory usage threshold (0-1) */
  readonly memoryThreshold: number;

  /** CPU usage threshold (0-1) */
  readonly cpuThreshold: number;

  /** Cache hit rate threshold (0-1) */
  readonly cacheHitRateThreshold: number;
}

/**
 * Performance configuration
 * Settings for performance optimization
 */
export interface PerformanceConfiguration {
  /** Enable performance optimization */
  readonly enableOptimization: boolean;

  /** Concurrent execution limit */
  readonly concurrentExecutionLimit: number;

  /** Queue size for pending operations */
  readonly queueSize: number;

  /** Enable adaptive performance tuning */
  readonly adaptiveTuning: boolean;

  /** Performance profiling settings */
  readonly profilingConfig?: ProfilingConfiguration;
}

/**
 * Profiling configuration
 * Settings for performance profiling
 */
export interface ProfilingConfiguration {
  /** Enable CPU profiling */
  readonly enableCpuProfiling: boolean;

  /** Enable memory profiling */
  readonly enableMemoryProfiling: boolean;

  /** Profiling sample rate (0-1) */
  readonly sampleRate: number;

  /** Profiling output format */
  readonly outputFormat: ProfilingFormat;
}

/**
 * Profiling output format
 * Supported profiling data formats
 */
export enum ProfilingFormat {
  JSON = 'json',
  FLAME_GRAPH = 'flame_graph',
  CSV = 'csv',
  BINARY = 'binary'
}

/**
 * Security configuration
 * Settings for security and access control
 */
export interface SecurityConfiguration {
  /** Enable security validation */
  readonly enableSecurityValidation: boolean;

  /** Encryption settings */
  readonly encryptionConfig: EncryptionConfiguration;

  /** Access control settings */
  readonly accessControlConfig: AccessControlConfiguration;

  /** Audit settings */
  readonly auditConfig: AuditConfiguration;

  /** Threat detection settings */
  readonly threatDetectionConfig?: ThreatDetectionConfiguration;
}

/**
 * Encryption configuration
 * Settings for data encryption
 */
export interface EncryptionConfiguration {
  /** Enable data encryption */
  readonly enableEncryption: boolean;

  /** Encryption algorithm */
  readonly algorithm: EncryptionAlgorithm;

  /** Key management settings */
  readonly keyManagement: KeyManagementConfig;

  /** Encryption scope */
  readonly encryptionScope: EncryptionScope[];
}

/**
 * Encryption algorithm enumeration
 * Supported encryption algorithms
 */
export enum EncryptionAlgorithm {
  AES_256_GCM = 'aes_256_gcm',
  AES_256_CBC = 'aes_256_cbc',
  CHACHA20_POLY1305 = 'chacha20_poly1305',
  RSA_OAEP = 'rsa_oaep'
}

/**
 * Key management configuration
 * Settings for encryption key management
 */
export interface KeyManagementConfig {
  /** Key rotation interval in milliseconds */
  readonly rotationInterval: number;

  /** Key storage provider */
  readonly keyStorage: KeyStorageProvider;

  /** Enable key escrow */
  readonly enableKeyEscrow: boolean;

  /** Key derivation settings */
  readonly keyDerivation: KeyDerivationConfig;
}

/**
 * Key storage provider enumeration
 * Supported key storage implementations
 */
export enum KeyStorageProvider {
  MEMORY = 'memory',
  FILE_SYSTEM = 'file_system',
  HARDWARE_SECURITY_MODULE = 'hsm',
  CLOUD_KEY_MANAGEMENT = 'cloud_kms',
  VAULT = 'vault'
}

/**
 * Key derivation configuration
 * Settings for key derivation functions
 */
export interface KeyDerivationConfig {
  /** Key derivation function */
  readonly function: KeyDerivationFunction;

  /** Iteration count */
  readonly iterations: number;

  /** Salt length */
  readonly saltLength: number;

  /** Key length */
  readonly keyLength: number;
}

/**
 * Key derivation function enumeration
 * Supported key derivation functions
 */
export enum KeyDerivationFunction {
  PBKDF2 = 'pbkdf2',
  SCRYPT = 'scrypt',
  ARGON2 = 'argon2',
  BCRYPT = 'bcrypt'
}

/**
 * Encryption scope enumeration
 * Defines what data to encrypt
 */
export enum EncryptionScope {
  PARAMETERS = 'parameters',
  RESULTS = 'results',
  AUDIT_TRAIL = 'audit_trail',
  CACHE = 'cache',
  COMMUNICATION = 'communication'
}

/**
 * Access control configuration
 * Settings for access control and authorization
 */
export interface AccessControlConfiguration {
  /** Enable access control */
  readonly enableAccessControl: boolean;

  /** Default access policy */
  readonly defaultPolicy: AccessPolicy;

  /** Role-based access control settings */
  readonly rbacConfig: RbacConfiguration;

  /** Attribute-based access control settings */
  readonly abacConfig?: AbacConfiguration;
}

/**
 * Access policy enumeration
 * Default access control policies
 */
export enum AccessPolicy {
  ALLOW_ALL = 'allow_all',
  DENY_ALL = 'deny_all',
  ROLE_BASED = 'role_based',
  ATTRIBUTE_BASED = 'attribute_based',
  CUSTOM = 'custom'
}

/**
 * Role-based access control configuration
 * Settings for RBAC implementation
 */
export interface RbacConfiguration {
  /** Enable RBAC */
  readonly enableRbac: boolean;

  /** Role hierarchy */
  readonly roleHierarchy: RoleHierarchy;

  /** Permission assignments */
  readonly permissionAssignments: PermissionAssignments;

  /** Enable role inheritance */
  readonly enableRoleInheritance: boolean;
}

/**
 * Role hierarchy definition
 * Defines role relationships and inheritance
 */
export interface RoleHierarchy {
  /** Role definitions */
  readonly roles: readonly RoleDefinition[];

  /** Role inheritance rules */
  readonly inheritanceRules: readonly InheritanceRule[];
}

/**
 * Role definition
 * Defines a security role
 */
export interface RoleDefinition {
  /** Role identifier */
  readonly roleId: string;

  /** Role name */
  readonly roleName: string;

  /** Role description */
  readonly description: string;

  /** Role permissions */
  readonly permissions: readonly string[];

  /** Role metadata */
  readonly metadata: Record<string, any>;
}

/**
 * Inheritance rule
 * Defines how roles inherit from other roles
 */
export interface InheritanceRule {
  /** Parent role ID */
  readonly parentRoleId: string;

  /** Child role ID */
  readonly childRoleId: string;

  /** Inheritance type */
  readonly inheritanceType: InheritanceType;
}

/**
 * Inheritance type enumeration
 * Types of role inheritance
 */
export enum InheritanceType {
  FULL = 'full',
  PARTIAL = 'partial',
  CONDITIONAL = 'conditional'
}

/**
 * Permission assignments
 * Maps permissions to functions
 */
export interface PermissionAssignments {
  /** Function permission mappings */
  readonly functionPermissions: Record<string, readonly string[]>;

  /** Default permissions */
  readonly defaultPermissions: readonly string[];

  /** Permission groups */
  readonly permissionGroups: readonly PermissionGroup[];
}

/**
 * Permission group definition
 * Groups related permissions together
 */
export interface PermissionGroup {
  /** Group identifier */
  readonly groupId: string;

  /** Group name */
  readonly groupName: string;

  /** Group permissions */
  readonly permissions: readonly string[];

  /** Group description */
  readonly description: string;
}

/**
 * Attribute-based access control configuration
 * Settings for ABAC implementation
 */
export interface AbacConfiguration {
  /** Enable ABAC */
  readonly enableAbac: boolean;

  /** Attribute definitions */
  readonly attributeDefinitions: readonly AttributeDefinition[];

  /** Policy rules */
  readonly policyRules: readonly PolicyRule[];

  /** Evaluation engine settings */
  readonly evaluationEngine: EvaluationEngineConfig;
}

/**
 * Attribute definition
 * Defines an access control attribute
 */
export interface AttributeDefinition {
  /** Attribute identifier */
  readonly attributeId: string;

  /** Attribute name */
  readonly attributeName: string;

  /** Attribute type */
  readonly attributeType: AttributeType;

  /** Attribute source */
  readonly attributeSource: AttributeSource;

  /** Attribute validation rules */
  readonly validationRules: readonly string[];
}

/**
 * Attribute type enumeration
 * Types of access control attributes
 */
export enum AttributeType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  LIST = 'list',
  OBJECT = 'object'
}

/**
 * Attribute source enumeration
 * Sources of attribute values
 */
export enum AttributeSource {
  USER = 'user',
  ENVIRONMENT = 'environment',
  RESOURCE = 'resource',
  ACTION = 'action',
  COMPUTED = 'computed'
}

/**
 * Policy rule definition
 * Defines an ABAC policy rule
 */
export interface PolicyRule {
  /** Rule identifier */
  readonly ruleId: string;

  /** Rule name */
  readonly ruleName: string;

  /** Rule effect */
  readonly effect: PolicyEffect;

  /** Rule conditions */
  readonly conditions: readonly Condition[];

  /** Rule priority */
  readonly priority: number;
}

/**
 * Policy effect enumeration
 * Effects of policy rule evaluation
 */
export enum PolicyEffect {
  ALLOW = 'allow',
  DENY = 'deny',
  CONDITIONAL_ALLOW = 'conditional_allow',
  CONDITIONAL_DENY = 'conditional_deny'
}

/**
 * Condition definition
 * Defines a policy condition
 */
export interface Condition {
  /** Condition identifier */
  readonly conditionId: string;

  /** Attribute reference */
  readonly attributeRef: string;

  /** Condition operator */
  readonly operator: ConditionOperator;

  /** Condition value */
  readonly value: any;

  /** Condition metadata */
  readonly metadata?: Record<string, any>;
}

/**
 * Condition operator enumeration
 * Operators for policy conditions
 */
export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  REGEX_MATCH = 'regex_match',
  IN = 'in',
  NOT_IN = 'not_in'
}

/**
 * Evaluation engine configuration
 * Settings for ABAC policy evaluation
 */
export interface EvaluationEngineConfig {
  /** Evaluation strategy */
  readonly evaluationStrategy: EvaluationStrategy;

  /** Enable caching of evaluation results */
  readonly enableCaching: boolean;

  /** Cache TTL for evaluation results */
  readonly cacheTtl: number;

  /** Maximum evaluation time */
  readonly maxEvaluationTime: number;
}

/**
 * Evaluation strategy enumeration
 * Strategies for policy evaluation
 */
export enum EvaluationStrategy {
  FAIL_FAST = 'fail_fast',
  COMPLETE_EVALUATION = 'complete_evaluation',
  PRIORITY_BASED = 'priority_based',
  ADAPTIVE = 'adaptive'
}

/**
 * Audit configuration
 * Settings for audit logging and compliance
 */
export interface AuditConfiguration {
  /** Enable audit logging */
  readonly enableAuditLogging: boolean;

  /** Audit level */
  readonly auditLevel: AuditLevel;

  /** Audit retention period */
  readonly retentionPeriod: number;

  /** Audit storage configuration */
  readonly storageConfig: AuditStorageConfig;

  /** Compliance settings */
  readonly complianceConfig: ComplianceConfiguration;
}

/**
 * Audit level enumeration
 * Levels of audit detail
 */
export enum AuditLevel {
  MINIMAL = 'minimal',
  STANDARD = 'standard',
  DETAILED = 'detailed',
  COMPREHENSIVE = 'comprehensive'
}

/**
 * Audit storage configuration
 * Settings for audit data storage
 */
export interface AuditStorageConfig {
  /** Storage provider */
  readonly storageProvider: AuditStorageProvider;

  /** Storage encryption */
  readonly enableEncryption: boolean;

  /** Storage compression */
  readonly enableCompression: boolean;

  /** Storage partitioning */
  readonly partitioningStrategy: PartitioningStrategy;
}

/**
 * Audit storage provider enumeration
 * Supported audit storage implementations
 */
export enum AuditStorageProvider {
  FILE_SYSTEM = 'file_system',
  DATABASE = 'database',
  ELASTICSEARCH = 'elasticsearch',
  CLOUD_STORAGE = 'cloud_storage',
  SIEM = 'siem'
}

/**
 * Partitioning strategy enumeration
 * Strategies for audit data partitioning
 */
export enum PartitioningStrategy {
  BY_DATE = 'by_date',
  BY_USER = 'by_user',
  BY_FUNCTION = 'by_function',
  BY_SEVERITY = 'by_severity',
  HYBRID = 'hybrid'
}

/**
 * Compliance configuration
 * Settings for regulatory compliance
 */
export interface ComplianceConfiguration {
  /** Enable compliance checking */
  readonly enableComplianceChecking: boolean;

  /** Compliance frameworks */
  readonly frameworks: readonly ComplianceFramework[];

  /** Compliance reporting settings */
  readonly reportingConfig: ComplianceReportingConfig;

  /** Data retention policies */
  readonly dataRetentionPolicies: readonly DataRetentionPolicy[];
}

/**
 * Compliance framework enumeration
 * Supported compliance frameworks
 */
export enum ComplianceFramework {
  GDPR = 'gdpr',
  HIPAA = 'hipaa',
  SOX = 'sox',
  PCI_DSS = 'pci_dss',
  ISO_27001 = 'iso_27001',
  NIST = 'nist',
  SOC2 = 'soc2'
}

/**
 * Compliance reporting configuration
 * Settings for compliance reporting
 */
export interface ComplianceReportingConfig {
  /** Enable automated reporting */
  readonly enableAutomatedReporting: boolean;

  /** Report generation schedule */
  readonly reportingSchedule: ReportingSchedule;

  /** Report formats */
  readonly reportFormats: readonly ReportFormat[];

  /** Report recipients */
  readonly reportRecipients: readonly ReportRecipient[];
}

/**
 * Reporting schedule definition
 * Defines when compliance reports are generated
 */
export interface ReportingSchedule {
  /** Report frequency */
  readonly frequency: ReportFrequency;

  /** Schedule details */
  readonly scheduleDetails: ScheduleDetails;

  /** Time zone */
  readonly timeZone: string;
}

/**
 * Report frequency enumeration
 * Frequencies for compliance reports
 */
export enum ReportFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
  ON_DEMAND = 'on_demand'
}

/**
 * Schedule details
 * Specific scheduling information
 */
export interface ScheduleDetails {
  /** Day of week (for weekly reports) */
  readonly dayOfWeek?: number;

  /** Day of month (for monthly reports) */
  readonly dayOfMonth?: number;

  /** Hour of day */
  readonly hourOfDay: number;

  /** Minute of hour */
  readonly minuteOfHour: number;
}

/**
 * Report format enumeration
 * Supported compliance report formats
 */
export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
  HTML = 'html'
}

/**
 * Report recipient definition
 * Defines who receives compliance reports
 */
export interface ReportRecipient {
  /** Recipient identifier */
  readonly recipientId: string;

  /** Recipient name */
  readonly recipientName: string;

  /** Recipient email */
  readonly recipientEmail: string;

  /** Recipient role */
  readonly recipientRole: string;

  /** Delivery preferences */
  readonly deliveryPreferences: DeliveryPreferences;
}

/**
 * Delivery preferences
 * Preferences for report delivery
 */
export interface DeliveryPreferences {
  /** Delivery method */
  readonly deliveryMethod: DeliveryMethod;

  /** Encryption required */
  readonly requireEncryption: boolean;

  /** Digital signature required */
  readonly requireDigitalSignature: boolean;

  /** Delivery confirmation required */
  readonly requireDeliveryConfirmation: boolean;
}

/**
 * Delivery method enumeration
 * Methods for report delivery
 */
export enum DeliveryMethod {
  EMAIL = 'email',
  SECURE_FTP = 'secure_ftp',
  API = 'api',
  WEB_PORTAL = 'web_portal',
  PHYSICAL_DELIVERY = 'physical_delivery'
}

/**
 * Data retention policy
 * Defines how long data is retained
 */
export interface DataRetentionPolicy {
  /** Policy identifier */
  readonly policyId: string;

  /** Policy name */
  readonly policyName: string;

  /** Data categories covered */
  readonly dataCategories: readonly string[];

  /** Retention period */
  readonly retentionPeriod: RetentionPeriod;

  /** Disposal method */
  readonly disposalMethod: DisposalMethod;

  /** Legal hold exceptions */
  readonly legalHoldExceptions: readonly LegalHoldException[];
}

/**
 * Retention period definition
 * Defines how long to retain data
 */
export interface RetentionPeriod {
  /** Period duration */
  readonly duration: number;

  /** Period unit */
  readonly unit: RetentionUnit;

  /** Start date calculation */
  readonly startDateCalculation: StartDateCalculation;
}

/**
 * Retention unit enumeration
 * Units for retention periods
 */
export enum RetentionUnit {
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
  YEARS = 'years'
}

/**
 * Start date calculation enumeration
 * How to calculate retention start date
 */
export enum StartDateCalculation {
  CREATION_DATE = 'creation_date',
  LAST_ACCESS_DATE = 'last_access_date',
  LAST_MODIFICATION_DATE = 'last_modification_date',
  CUSTOM = 'custom'
}

/**
 * Disposal method enumeration
 * Methods for data disposal
 */
export enum DisposalMethod {
  DELETE = 'delete',
  ARCHIVE = 'archive',
  ANONYMIZE = 'anonymize',
  ENCRYPT_AND_STORE = 'encrypt_and_store',
  PHYSICAL_DESTRUCTION = 'physical_destruction'
}

/**
 * Legal hold exception
 * Defines exceptions to normal retention
 */
export interface LegalHoldException {
  /** Exception identifier */
  readonly exceptionId: string;

  /** Exception reason */
  readonly reason: string;

  /** Hold start date */
  readonly holdStartDate: Date;

  /** Hold end date (if known) */
  readonly holdEndDate?: Date;

  /** Responsible party */
  readonly responsibleParty: string;

  /** Exception metadata */
  readonly metadata: Record<string, any>;
}

/**
 * Threat detection configuration
 * Settings for security threat detection
 */
export interface ThreatDetectionConfiguration {
  /** Enable threat detection */
  readonly enableThreatDetection: boolean;

  /** Detection rules */
  readonly detectionRules: readonly ThreatDetectionRule[];

  /** Response actions */
  readonly responseActions: readonly ResponseAction[];

  /** Machine learning settings */
  readonly mlConfig?: MlConfiguration;
}

/**
 * Threat detection rule
 * Defines a threat detection pattern
 */
export interface ThreatDetectionRule {
  /** Rule identifier */
  readonly ruleId: string;

  /** Rule name */
  readonly ruleName: string;

  /** Threat category */
  readonly threatCategory: ThreatCategory;

  /** Detection pattern */
  readonly detectionPattern: DetectionPattern;

  /** Rule severity */
  readonly severity: ThreatSeverity;

  /** Rule actions */
  readonly actions: readonly string[];
}

/**
 * Threat category enumeration
 * Categories of security threats
 */
export enum ThreatCategory {
  INJECTION_ATTACK = 'injection_attack',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  DATA_EXFILTRATION = 'data_exfiltration',
  DENIAL_OF_SERVICE = 'denial_of_service',
  MALWARE = 'malware',
  SOCIAL_ENGINEERING = 'social_engineering',
  INSIDER_THREAT = 'insider_threat'
}

/**
 * Detection pattern definition
 * Defines how threats are detected
 */
export interface DetectionPattern {
  /** Pattern type */
  readonly patternType: PatternType;

  /** Pattern definition */
  readonly pattern: string;

  /** Pattern metadata */
  readonly metadata: Record<string, any>;
}

/**
 * Pattern type enumeration
 * Types of detection patterns
 */
export enum PatternType {
  REGEX = 'regex',
  STATISTICAL = 'statistical',
  BEHAVIORAL = 'behavioral',
  SIGNATURE = 'signature',
  ANOMALY = 'anomaly',
  MACHINE_LEARNING = 'machine_learning'
}

/**
 * Threat severity enumeration
 * Severity levels for threats
 */
export enum ThreatSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Response action definition
 * Defines response to detected threats
 */
export interface ResponseAction {
  /** Action identifier */
  readonly actionId: string;

  /** Action name */
  readonly actionName: string;

  /** Action type */
  readonly actionType: ActionType;

  /** Action parameters */
  readonly parameters: Record<string, any>;

  /** Action priority */
  readonly priority: number;
}

/**
 * Action type enumeration
 * Types of threat response actions
 */
export enum ActionType {
  BLOCK_REQUEST = 'block_request',
  RATE_LIMIT = 'rate_limit',
  QUARANTINE_USER = 'quarantine_user',
  ALERT_ADMIN = 'alert_admin',
  LOG_EVENT = 'log_event',
  FORCE_LOGOUT = 'force_logout',
  REQUIRE_2FA = 'require_2fa'
}

/**
 * Machine learning configuration
 * Settings for ML-based threat detection
 */
export interface MlConfiguration {
  /** Enable ML threat detection */
  readonly enableMlDetection: boolean;

  /** ML model configuration */
  readonly modelConfig: MlModelConfig;

  /** Training data configuration */
  readonly trainingDataConfig: TrainingDataConfig;

  /** Model update schedule */
  readonly updateSchedule: ModelUpdateSchedule;
}

/**
 * ML model configuration
 * Settings for machine learning models
 */
export interface MlModelConfig {
  /** Model type */
  readonly modelType: MlModelType;

  /** Model parameters */
  readonly parameters: Record<string, any>;

  /** Model version */
  readonly version: string;

  /** Model accuracy threshold */
  readonly accuracyThreshold: number;
}

/**
 * ML model type enumeration
 * Types of machine learning models
 */
export enum MlModelType {
  ANOMALY_DETECTION = 'anomaly_detection',
  CLASSIFICATION = 'classification',
  CLUSTERING = 'clustering',
  REGRESSION = 'regression',
  DEEP_LEARNING = 'deep_learning'
}

/**
 * Training data configuration
 * Settings for ML model training data
 */
export interface TrainingDataConfig {
  /** Data sources */
  readonly dataSources: readonly string[];

  /** Data preprocessing settings */
  readonly preprocessingConfig: PreprocessingConfig;

  /** Feature selection settings */
  readonly featureSelectionConfig: FeatureSelectionConfig;

  /** Data validation settings */
  readonly validationConfig: DataValidationConfig;
}

/**
 * Preprocessing configuration
 * Settings for data preprocessing
 */
export interface PreprocessingConfig {
  /** Normalization method */
  readonly normalizationMethod: NormalizationMethod;

  /** Missing value handling */
  readonly missingValueHandling: MissingValueHandling;

  /** Outlier detection method */
  readonly outlierDetectionMethod: OutlierDetectionMethod;

  /** Feature scaling method */
  readonly featureScalingMethod: FeatureScalingMethod;
}

/**
 * Normalization method enumeration
 * Methods for data normalization
 */
export enum NormalizationMethod {
  MIN_MAX = 'min_max',
  Z_SCORE = 'z_score',
  ROBUST = 'robust',
  QUANTILE = 'quantile'
}

/**
 * Missing value handling enumeration
 * Methods for handling missing values
 */
export enum MissingValueHandling {
  DROP = 'drop',
  MEAN_IMPUTATION = 'mean_imputation',
  MEDIAN_IMPUTATION = 'median_imputation',
  MODE_IMPUTATION = 'mode_imputation',
  FORWARD_FILL = 'forward_fill',
  BACKWARD_FILL = 'backward_fill'
}

/**
 * Outlier detection method enumeration
 * Methods for detecting outliers
 */
export enum OutlierDetectionMethod {
  Z_SCORE = 'z_score',
  IQR = 'iqr',
  ISOLATION_FOREST = 'isolation_forest',
  LOCAL_OUTLIER_FACTOR = 'local_outlier_factor'
}

/**
 * Feature scaling method enumeration
 * Methods for feature scaling
 */
export enum FeatureScalingMethod {
  STANDARD_SCALER = 'standard_scaler',
  MIN_MAX_SCALER = 'min_max_scaler',
  ROBUST_SCALER = 'robust_scaler',
  QUANTILE_TRANSFORMER = 'quantile_transformer'
}

/**
 * Feature selection configuration
 * Settings for feature selection
 */
export interface FeatureSelectionConfig {
  /** Feature selection method */
  readonly selectionMethod: FeatureSelectionMethod;

  /** Number of features to select */
  readonly numberOfFeatures: number;

  /** Feature importance threshold */
  readonly importanceThreshold: number;

  /** Cross-validation settings */
  readonly crossValidationConfig: CrossValidationConfig;
}

/**
 * Feature selection method enumeration
 * Methods for selecting features
 */
export enum FeatureSelectionMethod {
  UNIVARIATE = 'univariate',
  RECURSIVE_ELIMINATION = 'recursive_elimination',
  LASSO = 'lasso',
  TREE_BASED = 'tree_based',
  MUTUAL_INFORMATION = 'mutual_information'
}

/**
 * Cross-validation configuration
 * Settings for cross-validation
 */
export interface CrossValidationConfig {
  /** Number of folds */
  readonly numberOfFolds: number;

  /** Validation strategy */
  readonly validationStrategy: ValidationStrategy;

  /** Stratification settings */
  readonly stratificationConfig?: StratificationConfig;
}

/**
 * Validation strategy enumeration
 * Strategies for model validation
 */
export enum ValidationStrategy {
  K_FOLD = 'k_fold',
  STRATIFIED_K_FOLD = 'stratified_k_fold',
  TIME_SERIES_SPLIT = 'time_series_split',
  LEAVE_ONE_OUT = 'leave_one_out'
}

/**
 * Stratification configuration
 * Settings for stratified validation
 */
export interface StratificationConfig {
  /** Stratification column */
  readonly stratificationColumn: string;

  /** Minimum samples per class */
  readonly minSamplesPerClass: number;

  /** Balance classes */
  readonly balanceClasses: boolean;
}

/**
 * Data validation configuration
 * Settings for training data validation
 */
export interface DataValidationConfig {
  /** Enable data validation */
  readonly enableValidation: boolean;

  /** Validation rules */
  readonly validationRules: readonly DataValidationRule[];

  /** Data quality threshold */
  readonly qualityThreshold: number;

  /** Validation report settings */
  readonly reportSettings: ValidationReportSettings;
}

/**
 * Data validation rule
 * Defines a data quality rule
 */
export interface DataValidationRule {
  /** Rule identifier */
  readonly ruleId: string;

  /** Rule name */
  readonly ruleName: string;

  /** Rule type */
  readonly ruleType: DataValidationRuleType;

  /** Rule parameters */
  readonly parameters: Record<string, any>;

  /** Rule severity */
  readonly severity: RuleSeverity;
}

/**
 * Data validation rule type enumeration
 * Types of data validation rules
 */
export enum DataValidationRuleType {
  COMPLETENESS = 'completeness',
  UNIQUENESS = 'uniqueness',
  VALIDITY = 'validity',
  ACCURACY = 'accuracy',
  CONSISTENCY = 'consistency',
  TIMELINESS = 'timeliness'
}

/**
 * Rule severity enumeration
 * Severity levels for validation rules
 */
export enum RuleSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Validation report settings
 * Settings for validation reports
 */
export interface ValidationReportSettings {
  /** Enable validation reports */
  readonly enableReports: boolean;

  /** Report format */
  readonly reportFormat: ValidationReportFormat;

  /** Report recipients */
  readonly reportRecipients: readonly string[];

  /** Report schedule */
  readonly reportSchedule: ValidationReportSchedule;
}

/**
 * Validation report format enumeration
 * Formats for validation reports
 */
export enum ValidationReportFormat {
  JSON = 'json',
  HTML = 'html',
  PDF = 'pdf',
  CSV = 'csv'
}

/**
 * Validation report schedule
 * Schedule for validation reports
 */
export interface ValidationReportSchedule {
  /** Report frequency */
  readonly frequency: ValidationReportFrequency;

  /** Report time */
  readonly reportTime: string;

  /** Report timezone */
  readonly timezone: string;
}

/**
 * Validation report frequency enumeration
 * Frequencies for validation reports
 */
export enum ValidationReportFrequency {
  REAL_TIME = 'real_time',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

/**
 * Model update schedule
 * Schedule for updating ML models
 */
export interface ModelUpdateSchedule {
  /** Update frequency */
  readonly updateFrequency: ModelUpdateFrequency;

  /** Update conditions */
  readonly updateConditions: readonly ModelUpdateCondition[];

  /** Rollback configuration */
  readonly rollbackConfig: ModelRollbackConfig;
}

/**
 * Model update frequency enumeration
 * Frequencies for model updates
 */
export enum ModelUpdateFrequency {
  CONTINUOUS = 'continuous',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ON_DEMAND = 'on_demand'
}

/**
 * Model update condition
 * Conditions that trigger model updates
 */
export interface ModelUpdateCondition {
  /** Condition identifier */
  readonly conditionId: string;

  /** Condition type */
  readonly conditionType: UpdateConditionType;

  /** Condition threshold */
  readonly threshold: number;

  /** Condition parameters */
  readonly parameters: Record<string, any>;
}

/**
 * Update condition type enumeration
 * Types of model update conditions
 */
export enum UpdateConditionType {
  ACCURACY_DEGRADATION = 'accuracy_degradation',
  DRIFT_DETECTION = 'drift_detection',
  NEW_DATA_AVAILABILITY = 'new_data_availability',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  SCHEDULED_UPDATE = 'scheduled_update'
}

/**
 * Model rollback configuration
 * Settings for model rollback
 */
export interface ModelRollbackConfig {
  /** Enable automatic rollback */
  readonly enableAutoRollback: boolean;

  /** Rollback conditions */
  readonly rollbackConditions: readonly RollbackCondition[];

  /** Rollback strategy */
  readonly rollbackStrategy: RollbackStrategy;

  /** Model version history */
  readonly versionHistorySize: number;
}

/**
 * Rollback condition
 * Conditions that trigger model rollback
 */
export interface RollbackCondition {
  /** Condition identifier */
  readonly conditionId: string;

  /** Condition type */
  readonly conditionType: RollbackConditionType;

  /** Condition threshold */
  readonly threshold: number;

  /** Condition parameters */
  readonly parameters: Record<string, any>;
}

/**
 * Rollback condition type enumeration
 * Types of rollback conditions
 */
export enum RollbackConditionType {
  ACCURACY_DROP = 'accuracy_drop',
  ERROR_RATE_INCREASE = 'error_rate_increase',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  ANOMALY_DETECTION = 'anomaly_detection'
}

/**
 * Rollback strategy enumeration
 * Strategies for model rollback
 */
export enum RollbackStrategy {
  IMMEDIATE = 'immediate',
  GRADUAL = 'gradual',
  CANARY = 'canary',
  BLUE_GREEN = 'blue_green'
}

/**
 * Connection pool configuration
 * Settings for PARLANT connection pooling
 */
export interface ConnectionPoolConfig {
  /** Minimum pool size */
  readonly minPoolSize: number;

  /** Maximum pool size */
  readonly maxPoolSize: number;

  /** Connection timeout */
  readonly connectionTimeout: number;

  /** Idle timeout */
  readonly idleTimeout: number;

  /** Health check interval */
  readonly healthCheckInterval: number;
}

/**
 * WebSocket configuration
 * Settings for WebSocket connections
 */
export interface WebSocketConfig {
  /** Enable WebSocket */
  readonly enableWebSocket: boolean;

  /** WebSocket timeout */
  readonly timeout: number;

  /** Heartbeat interval */
  readonly heartbeatInterval: number;

  /** Reconnection settings */
  readonly reconnectionConfig: ReconnectionConfig;
}

/**
 * Reconnection configuration
 * Settings for WebSocket reconnection
 */
export interface ReconnectionConfig {
  /** Enable automatic reconnection */
  readonly enableAutoReconnect: boolean;

  /** Maximum reconnection attempts */
  readonly maxReconnectAttempts: number;

  /** Reconnection delay */
  readonly reconnectionDelay: number;

  /** Exponential backoff factor */
  readonly backoffFactor: number;
}