/**
 * Orchestrator Core Types and Interfaces
 *
 * Comprehensive type definitions for Parlant-integrated orchestration with
 * enterprise-grade multi-service coordination, approval workflows, and
 * performance optimization targeting <500ms response times.
 *
 * @module OrchestratorTypes
 * @version 1.0.0
 * @author AIgent Orchestrator Team
 */

import { 
  ParlantValidationRequest as _ParlantValidationRequest, 
  ParlantValidationResponse,
  ParlantConversationContext,
  SecurityLevel
} from '@aiagent/shared/types/parlant-integration.types';

// ===== ORCHESTRATION CORE INTERFACES =====

/**
 * Orchestration task that coordinates multiple services
 */
export interface OrchestrationTask {
  /** Unique task identifier */
  readonly taskId: string;
  /** Task name for identification */
  readonly name: string;
  /** Human-readable description */
  readonly description: string;
  /** Task priority level */
  readonly priority: OrchestrationPriority;
  /** Required services for this task */
  readonly services: ServiceDependency[];
  /** Execution workflow steps */
  readonly workflow: WorkflowStep[];
  /** Performance requirements */
  readonly performanceRequirements: PerformanceRequirements;
  /** Security and compliance requirements */
  readonly complianceRequirements: ComplianceRequirements;
  /** Task metadata */
  readonly metadata: OrchestrationMetadata;
}

export enum OrchestrationPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  BACKGROUND = 'background'
}

/**
 * Service dependency specification
 */
export interface ServiceDependency {
  /** Service identifier */
  readonly serviceId: string;
  /** Service name */
  readonly serviceName: string;
  /** Required service endpoints */
  readonly endpoints: string[];
  /** Dependency type */
  readonly dependencyType: DependencyType;
  /** Health check configuration */
  readonly healthCheck: ServiceHealthCheck;
  /** Fallback strategy if service unavailable */
  readonly fallbackStrategy: FallbackStrategy;
}

export enum DependencyType {
  REQUIRED = 'required',
  OPTIONAL = 'optional',
  CONDITIONAL = 'conditional'
}

export interface ServiceHealthCheck {
  /** Health check endpoint */
  readonly endpoint: string;
  /** Timeout for health check */
  readonly timeoutMs: number;
  /** Expected response status */
  readonly expectedStatus: number;
  /** Health check interval */
  readonly intervalMs: number;
}

export enum FallbackStrategy {
  FAIL_FAST = 'fail_fast',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  CACHE_FALLBACK = 'cache_fallback',
  ALTERNATE_SERVICE = 'alternate_service'
}

/**
 * Workflow step in orchestration
 */
export interface WorkflowStep {
  /** Step identifier */
  readonly stepId: string;
  /** Step name */
  readonly name: string;
  /** Step description */
  readonly description: string;
  /** Step type */
  readonly type: WorkflowStepType;
  /** Service to execute this step */
  readonly serviceId: string;
  /** Function or endpoint to call */
  readonly endpoint: string;
  /** Input parameters */
  readonly parameters: Record<string, unknown>;
  /** Dependencies on previous steps */
  readonly dependencies: string[];
  /** Conditional execution logic */
  readonly condition?: WorkflowCondition;
  /** Retry configuration */
  readonly retryConfig: RetryConfiguration;
  /** Timeout configuration */
  readonly timeout: TimeoutConfiguration;
  /** Parlant validation requirements */
  readonly parlantValidation: ParlantWorkflowValidation;
}

export enum WorkflowStepType {
  SERVICE_CALL = 'service_call',
  VALIDATION = 'validation',
  APPROVAL = 'approval',
  NOTIFICATION = 'notification',
  DATA_TRANSFORM = 'data_transform',
  CONDITION = 'condition',
  PARALLEL = 'parallel',
  SEQUENCE = 'sequence'
}

export interface WorkflowCondition {
  /** Condition expression */
  readonly expression: string;
  /** Variables available in condition */
  readonly variables: Record<string, unknown>;
  /** Action if condition true */
  readonly onTrue: string;
  /** Action if condition false */
  readonly onFalse: string;
}

export interface RetryConfiguration {
  /** Maximum retry attempts */
  readonly maxAttempts: number;
  /** Base delay between retries */
  readonly baseDelayMs: number;
  /** Exponential backoff multiplier */
  readonly backoffMultiplier: number;
  /** Maximum delay between retries */
  readonly maxDelayMs: number;
  /** Jitter to prevent thundering herd */
  readonly jitterMs: number;
}

export interface TimeoutConfiguration {
  /** Individual step timeout */
  readonly stepTimeoutMs: number;
  /** Overall workflow timeout */
  readonly workflowTimeoutMs: number;
  /** Grace period for cleanup */
  readonly gracePeriodMs: number;
}

/**
 * Parlant validation for workflow steps
 */
export interface ParlantWorkflowValidation {
  /** Enable Parlant validation */
  readonly enabled: boolean;
  /** Required approval level */
  readonly approvalLevel: ApprovalLevel;
  /** Risk assessment requirements */
  readonly riskAssessment: RiskAssessmentRequirements;
  /** Conversation context */
  readonly conversationContext: ParlantConversationContext;
  /** Custom validation logic */
  readonly customValidation?: string;
}

export enum ApprovalLevel {
  NONE = 'none',
  AUTOMATED = 'automated',
  HUMAN_REVIEW = 'human_review',
  MULTI_PARTY = 'multi_party',
  EXECUTIVE = 'executive'
}

export interface RiskAssessmentRequirements {
  /** Maximum allowed risk level */
  readonly maxRiskLevel: SecurityLevel;
  /** Required risk factors to check */
  readonly requiredFactors: string[];
  /** Risk mitigation strategies */
  readonly mitigationStrategies: string[];
}

// ===== PERFORMANCE AND COMPLIANCE =====

export interface PerformanceRequirements {
  /** Maximum total execution time */
  readonly maxExecutionTimeMs: number;
  /** Target response time (P95) */
  readonly targetP95Ms: number;
  /** Target response time (P99) */
  readonly targetP99Ms: number;
  /** Maximum memory usage */
  readonly maxMemoryMb: number;
  /** Maximum CPU usage percentage */
  readonly maxCpuPercent: number;
  /** Required throughput */
  readonly minThroughput: number;
  /** SLA requirements */
  readonly slaRequirements: SlaRequirements;
}

export interface SlaRequirements {
  /** Required availability percentage */
  readonly availabilityPercent: number;
  /** Maximum error rate */
  readonly maxErrorRate: number;
  /** Recovery time objective */
  readonly rtoMinutes: number;
  /** Recovery point objective */
  readonly rpoMinutes: number;
}

export interface ComplianceRequirements {
  /** Audit trail requirements */
  readonly auditTrail: boolean;
  /** Data retention period */
  readonly dataRetentionDays: number;
  /** Encryption requirements */
  readonly encryptionRequired: boolean;
  /** Compliance frameworks */
  readonly frameworks: ComplianceFramework[];
  /** Access control requirements */
  readonly accessControl: AccessControlRequirements;
}

export interface ComplianceFramework {
  /** Framework name (e.g., SOC2, GDPR) */
  readonly name: string;
  /** Required controls */
  readonly controls: string[];
  /** Compliance level */
  readonly level: ComplianceLevel;
}

export enum ComplianceLevel {
  BASIC = 'basic',
  STANDARD = 'standard',
  STRICT = 'strict',
  CUSTOM = 'custom'
}

export interface AccessControlRequirements {
  /** Required roles for execution */
  readonly requiredRoles: string[];
  /** Required permissions */
  readonly requiredPermissions: string[];
  /** Multi-factor authentication required */
  readonly mfaRequired: boolean;
  /** IP whitelist restrictions */
  readonly ipWhitelist?: string[];
}

export interface OrchestrationMetadata {
  /** Task creation timestamp */
  readonly createdAt: Date;
  /** Task creator */
  readonly createdBy: string;
  /** Task version */
  readonly version: string;
  /** Tags for categorization */
  readonly tags: string[];
  /** Custom metadata */
  readonly custom: Record<string, unknown>;
}

// ===== ORCHESTRATION EXECUTION =====

/**
 * Orchestration execution context
 */
export interface OrchestrationExecutionContext {
  /** Execution ID */
  readonly executionId: string;
  /** Task being executed */
  readonly task: OrchestrationTask;
  /** Current execution state */
  readonly state: OrchestrationState;
  /** Step execution results */
  readonly stepResults: Map<string, StepExecutionResult>;
  /** Execution metrics */
  readonly metrics: OrchestrationMetrics;
  /** Error handling context */
  readonly errorContext?: OrchestrationError;
  /** Parlant conversation tracking */
  readonly conversationTracking: ConversationTracking;
}

export interface OrchestrationState {
  /** Current status */
  readonly status: OrchestrationStatus;
  /** Currently executing step */
  readonly currentStep?: string;
  /** Completed steps */
  readonly completedSteps: string[];
  /** Failed steps */
  readonly failedSteps: string[];
  /** Skipped steps */
  readonly skippedSteps: string[];
  /** Execution start time */
  readonly startTime: Date;
  /** Last update time */
  readonly lastUpdateTime: Date;
  /** Estimated completion time */
  readonly estimatedCompletionTime?: Date;
}

export enum OrchestrationStatus {
  PENDING = 'pending',
  VALIDATING = 'validating',
  APPROVED = 'approved',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended'
}

export interface StepExecutionResult {
  /** Step ID */
  readonly stepId: string;
  /** Execution status */
  readonly status: StepExecutionStatus;
  /** Result data */
  readonly result?: unknown;
  /** Error if failed */
  readonly error?: Error;
  /** Execution start time */
  readonly startTime: Date;
  /** Execution end time */
  readonly endTime?: Date;
  /** Execution duration */
  readonly durationMs?: number;
  /** Retry attempts made */
  readonly retryAttempts: number;
  /** Parlant validation result */
  readonly parlantValidation?: ParlantValidationResponse;
}

export enum StepExecutionStatus {
  PENDING = 'pending',
  VALIDATING = 'validating',
  APPROVED = 'approved',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled'
}

export interface OrchestrationMetrics {
  /** Total execution time */
  readonly totalExecutionTimeMs: number;
  /** Validation time */
  readonly validationTimeMs: number;
  /** Service call times */
  readonly serviceCallTimes: Map<string, number>;
  /** Memory usage peak */
  readonly peakMemoryMb: number;
  /** CPU usage statistics */
  readonly cpuUsageStats: CpuUsageStats;
  /** Network usage statistics */
  readonly networkStats: NetworkStats;
  /** Cache hit rates */
  readonly cacheStats: CacheStats;
}

export interface CpuUsageStats {
  /** Average CPU usage */
  readonly average: number;
  /** Peak CPU usage */
  readonly peak: number;
  /** CPU usage over time */
  readonly timeline: Array<{ timestamp: Date; usage: number }>;
}

export interface NetworkStats {
  /** Bytes sent */
  readonly bytesSent: number;
  /** Bytes received */
  readonly bytesReceived: number;
  /** Number of requests made */
  readonly requestCount: number;
  /** Average request time */
  readonly avgRequestTimeMs: number;
}

export interface CacheStats {
  /** Cache hits */
  readonly hits: number;
  /** Cache misses */
  readonly misses: number;
  /** Hit rate percentage */
  readonly hitRate: number;
  /** Cache response time */
  readonly avgResponseTimeMs: number;
}

export interface ConversationTracking {
  /** Active conversation IDs */
  readonly conversationIds: string[];
  /** Approval requests */
  readonly approvalRequests: ApprovalRequest[];
  /** Conversation summaries */
  readonly summaries: ConversationSummary[];
}

export interface ApprovalRequest {
  /** Request ID */
  readonly requestId: string;
  /** Step requiring approval */
  readonly stepId: string;
  /** Approval level required */
  readonly approvalLevel: ApprovalLevel;
  /** Request timestamp */
  readonly requestTime: Date;
  /** Approval deadline */
  readonly deadline?: Date;
  /** Current status */
  readonly status: ApprovalStatus;
  /** Approver information */
  readonly approver?: ApproverInfo;
  /** Approval response */
  readonly response?: ApprovalResponse;
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export interface ApproverInfo {
  /** Approver user ID */
  readonly userId: string;
  /** Approver role */
  readonly role: string;
  /** Approval timestamp */
  readonly approvalTime: Date;
  /** Approver comments */
  readonly comments?: string;
}

export interface ApprovalResponse {
  /** Approved or rejected */
  readonly approved: boolean;
  /** Reasoning */
  readonly reason: string;
  /** Confidence score */
  readonly confidence: number;
  /** Additional conditions */
  readonly conditions?: string[];
  /** Follow-up actions */
  readonly followUpActions?: string[];
}

export interface ConversationSummary {
  /** Conversation ID */
  readonly conversationId: string;
  /** Summary text */
  readonly summary: string;
  /** Key decisions made */
  readonly decisions: string[];
  /** Risk factors identified */
  readonly riskFactors: string[];
  /** Mitigation strategies */
  readonly mitigations: string[];
}

// ===== ERROR HANDLING =====

export interface OrchestrationError {
  /** Error ID */
  readonly errorId: string;
  /** Error type */
  readonly type: OrchestrationErrorType;
  /** Error message */
  readonly message: string;
  /** Error details */
  readonly details: unknown;
  /** Step where error occurred */
  readonly stepId?: string;
  /** Service where error occurred */
  readonly serviceId?: string;
  /** Error timestamp */
  readonly timestamp: Date;
  /** Recovery strategies */
  readonly recoveryStrategies: RecoveryStrategy[];
  /** Error severity */
  readonly severity: ErrorSeverity;
}

export enum OrchestrationErrorType {
  VALIDATION_ERROR = 'validation_error',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  TIMEOUT = 'timeout',
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  DATA_ERROR = 'data_error',
  SYSTEM_ERROR = 'system_error',
  NETWORK_ERROR = 'network_error',
  CONFIGURATION_ERROR = 'configuration_error'
}

export interface RecoveryStrategy {
  /** Strategy type */
  readonly type: RecoveryStrategyType;
  /** Strategy description */
  readonly description: string;
  /** Estimated recovery time */
  readonly estimatedTimeMs: number;
  /** Success probability */
  readonly successProbability: number;
  /** Implementation function */
  readonly implementation?: string;
}

export enum RecoveryStrategyType {
  RETRY = 'retry',
  FALLBACK_SERVICE = 'fallback_service',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  MANUAL_INTERVENTION = 'manual_intervention',
  ROLLBACK = 'rollback',
  SKIP_STEP = 'skip_step'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// ===== ORCHESTRATOR CONFIGURATION =====

export interface OrchestratorConfiguration {
  /** Global performance settings */
  readonly performance: GlobalPerformanceSettings;
  /** Service registry configuration */
  readonly serviceRegistry: ServiceRegistryConfig;
  /** Parlant integration settings */
  readonly parlantIntegration: ParlantIntegrationConfig;
  /** Caching configuration */
  readonly caching: OrchestratorCachingConfig;
  /** Monitoring configuration */
  readonly monitoring: MonitoringConfiguration;
  /** Security settings */
  readonly security: SecurityConfiguration;
}

export interface GlobalPerformanceSettings {
  /** Default step timeout */
  readonly defaultStepTimeoutMs: number;
  /** Default workflow timeout */
  readonly defaultWorkflowTimeoutMs: number;
  /** Maximum concurrent executions */
  readonly maxConcurrentExecutions: number;
  /** Thread pool size */
  readonly threadPoolSize: number;
  /** Memory limits */
  readonly memoryLimits: MemoryLimits;
}

export interface MemoryLimits {
  /** Maximum heap size */
  readonly maxHeapSizeMb: number;
  /** Orchestration context cache size */
  readonly contextCacheSizeMb: number;
  /** Result cache size */
  readonly resultCacheSizeMb: number;
}

export interface ServiceRegistryConfig {
  /** Service discovery mechanism */
  readonly discoveryType: ServiceDiscoveryType;
  /** Service registry endpoint */
  readonly registryEndpoint?: string;
  /** Health check interval */
  readonly healthCheckIntervalMs: number;
  /** Service timeout */
  readonly serviceTimeoutMs: number;
}

export enum ServiceDiscoveryType {
  STATIC = 'static',
  DNS = 'dns',
  CONSUL = 'consul',
  KUBERNETES = 'kubernetes',
  EUREKA = 'eureka'
}

export interface ParlantIntegrationConfig {
  /** Enable Parlant integration */
  readonly enabled: boolean;
  /** Parlant API endpoint */
  readonly apiEndpoint: string;
  /** WebSocket endpoint */
  readonly websocketEndpoint: string;
  /** API key */
  readonly apiKey: string;
  /** Connection timeout */
  readonly connectionTimeoutMs: number;
  /** Request timeout */
  readonly requestTimeoutMs: number;
  /** Retry configuration */
  readonly retryConfig: RetryConfiguration;
}

export interface OrchestratorCachingConfig {
  /** Enable caching */
  readonly enabled: boolean;
  /** Cache provider */
  readonly provider: CacheProvider;
  /** Default TTL */
  readonly defaultTtlMs: number;
  /** Cache size limits */
  readonly sizeLimits: CacheSizeLimits;
}

export enum CacheProvider {
  MEMORY = 'memory',
  REDIS = 'redis',
  MEMCACHED = 'memcached',
  HYBRID = 'hybrid'
}

export interface CacheSizeLimits {
  /** Maximum entries */
  readonly maxEntries: number;
  /** Maximum memory usage */
  readonly maxMemoryMb: number;
  /** Eviction policy */
  readonly evictionPolicy: EvictionPolicy;
}

export enum EvictionPolicy {
  LRU = 'lru',
  LFU = 'lfu',
  FIFO = 'fifo',
  TTL = 'ttl'
}

export interface MonitoringConfiguration {
  /** Enable monitoring */
  readonly enabled: boolean;
  /** Metrics collection interval */
  readonly metricsIntervalMs: number;
  /** Trace sampling rate */
  readonly traceSamplingRate: number;
  /** Log level */
  readonly logLevel: LogLevel;
  /** Export configuration */
  readonly exportConfig: MetricsExportConfig;
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

export interface MetricsExportConfig {
  /** Prometheus endpoint */
  readonly prometheusEndpoint?: string;
  /** Grafana dashboard URL */
  readonly grafanaDashboard?: string;
  /** Custom export handlers */
  readonly customHandlers: string[];
}

export interface SecurityConfiguration {
  /** Encryption settings */
  readonly encryption: EncryptionConfig;
  /** Authentication settings */
  readonly authentication: AuthenticationConfig;
  /** Authorization settings */
  readonly authorization: AuthorizationConfig;
  /** Audit settings */
  readonly audit: AuditConfig;
}

export interface EncryptionConfig {
  /** Encryption algorithm */
  readonly algorithm: string;
  /** Key rotation interval */
  readonly keyRotationDays: number;
  /** Encrypt data at rest */
  readonly encryptAtRest: boolean;
  /** Encrypt data in transit */
  readonly encryptInTransit: boolean;
}

export interface AuthenticationConfig {
  /** Authentication provider */
  readonly provider: AuthProvider;
  /** Token expiration */
  readonly tokenExpirationMs: number;
  /** Refresh token enabled */
  readonly refreshTokenEnabled: boolean;
  /** Multi-factor authentication */
  readonly mfaEnabled: boolean;
}

export enum AuthProvider {
  JWT = 'jwt',
  OAUTH2 = 'oauth2',
  SAML = 'saml',
  OIDC = 'oidc',
  CUSTOM = 'custom'
}

export interface AuthorizationConfig {
  /** Authorization model */
  readonly model: AuthorizationModel;
  /** Role-based access control */
  readonly rbacEnabled: boolean;
  /** Attribute-based access control */
  readonly abacEnabled: boolean;
  /** Policy engine */
  readonly policyEngine: PolicyEngine;
}

export enum AuthorizationModel {
  RBAC = 'rbac',
  ABAC = 'abac',
  PBAC = 'pbac',
  CUSTOM = 'custom'
}

export enum PolicyEngine {
  OPA = 'opa',
  CEDAR = 'cedar',
  CUSTOM = 'custom'
}

export interface AuditConfig {
  /** Enable audit logging */
  readonly enabled: boolean;
  /** Audit log retention */
  readonly retentionDays: number;
  /** Audit event types */
  readonly eventTypes: AuditEventType[];
  /** Audit storage */
  readonly storage: AuditStorageConfig;
}

export enum AuditEventType {
  EXECUTION_START = 'execution_start',
  EXECUTION_END = 'execution_end',
  VALIDATION_REQUEST = 'validation_request',
  APPROVAL_REQUEST = 'approval_request',
  ERROR_OCCURRED = 'error_occurred',
  SECURITY_VIOLATION = 'security_violation',
  CONFIGURATION_CHANGE = 'configuration_change'
}

export interface AuditStorageConfig {
  /** Storage type */
  readonly type: AuditStorageType;
  /** Storage endpoint */
  readonly endpoint?: string;
  /** Encryption enabled */
  readonly encrypted: boolean;
  /** Compression enabled */
  readonly compressed: boolean;
}

export enum AuditStorageType {
  FILE = 'file',
  DATABASE = 'database',
  S3 = 's3',
  ELASTICSEARCH = 'elasticsearch',
  SYSLOG = 'syslog'
}