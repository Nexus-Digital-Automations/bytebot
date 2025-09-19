/* eslint-disable no-unused-vars */

/**
 * Parlant Streaming Integration Types
 *
 * Comprehensive type definitions for Parlant Phase 1 WebSocket streaming integration.
 * Defines message protocols, validation structures, and streaming interfaces for
 * enterprise-grade real-time conversational AI validation workflows.
 *
 * Features:
 * - Bidirectional streaming message protocols
 * - Comprehensive validation request/response structures
 * - Stream multiplexing support with session management
 * - Security and authentication interfaces
 * - Performance monitoring and metrics types
 * - Error handling and audit trail structures
 *
 * Note: This file contains comprehensive type definitions for future implementation.
 * Many enums are unused currently but are part of the complete architecture specification.
 *
 * @module ParlantStreamingIntegrationTypes
 * @version 1.0.0
 * @author AIgent Integration Team
 */

// ===== CORE STREAMING PROTOCOL TYPES =====

/**
 * Parlant streaming protocol message types
 */
export enum ParlantStreamingProtocolType {
  // Connection lifecycle
  PROTOCOL_HANDSHAKE = "protocol_handshake",
  PROTOCOL_ACKNOWLEDGED = "protocol_acknowledged",
  PROTOCOL_UPGRADE = "protocol_upgrade",
  PROTOCOL_DOWNGRADE = "protocol_downgrade",

  // Stream lifecycle management
  STREAM_LIFECYCLE_CREATE = "stream_lifecycle_create",
  STREAM_LIFECYCLE_READY = "stream_lifecycle_ready",
  STREAM_LIFECYCLE_SUSPEND = "stream_lifecycle_suspend",
  STREAM_LIFECYCLE_RESUME = "stream_lifecycle_resume",
  STREAM_LIFECYCLE_TERMINATE = "stream_lifecycle_terminate",

  // Real-time validation protocols
  VALIDATION_PROTOCOL_INIT = "validation_protocol_init",
  VALIDATION_PROTOCOL_STREAM = "validation_protocol_stream",
  VALIDATION_PROTOCOL_BATCH = "validation_protocol_batch",
  VALIDATION_PROTOCOL_PRIORITY = "validation_protocol_priority",

  // Interactive confirmation protocols
  CONFIRMATION_PROTOCOL_REQUEST = "confirmation_protocol_request",
  CONFIRMATION_PROTOCOL_RESPONSE = "confirmation_protocol_response",
  CONFIRMATION_PROTOCOL_TIMEOUT = "confirmation_protocol_timeout",
  CONFIRMATION_PROTOCOL_ESCALATION = "confirmation_protocol_escalation",

  // Performance and monitoring
  PERFORMANCE_PROTOCOL_METRICS = "performance_protocol_metrics",
  PERFORMANCE_PROTOCOL_ALERT = "performance_protocol_alert",
  PERFORMANCE_PROTOCOL_OPTIMIZATION = "performance_protocol_optimization",

  // Security and compliance
  SECURITY_PROTOCOL_CHALLENGE = "security_protocol_challenge",
  SECURITY_PROTOCOL_VERIFICATION = "security_protocol_verification",
  SECURITY_PROTOCOL_AUDIT = "security_protocol_audit",
}

/**
 * Base protocol message structure
 */
export interface ParlantProtocolMessage {
  readonly protocolType: ParlantStreamingProtocolType;
  readonly protocolVersion: string;
  readonly messageId: string;
  readonly correlationId?: string;
  readonly sessionId: string;
  readonly streamId?: string;
  readonly timestamp: number;
  readonly ttl?: number; // Time to live in milliseconds
  readonly payload: Record<string, unknown>;
  readonly headers: ParlantProtocolHeaders;
}

/**
 * Protocol message headers for routing and processing
 */
export interface ParlantProtocolHeaders {
  readonly priority: ProtocolPriority;
  readonly reliability: ProtocolReliability;
  readonly compression: ProtocolCompression;
  readonly encryption: ProtocolEncryption;
  readonly routing: ProtocolRouting;
  readonly audit: ProtocolAudit;
  readonly performance: ProtocolPerformance;
}

/**
 * Protocol priority levels
 */
export enum ProtocolPriority {
  BACKGROUND = "background",
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  CRITICAL = "critical",
  EMERGENCY = "emergency",
}

/**
 * Protocol reliability options
 */
export interface ProtocolReliability {
  readonly requiresAck: boolean;
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly timeoutMs: number;
  readonly duplicateDetection: boolean;
  readonly orderingGuarantee: boolean;
}

/**
 * Protocol compression settings
 */
export interface ProtocolCompression {
  readonly enabled: boolean;
  readonly algorithm: "gzip" | "deflate" | "brotli" | "lz4";
  readonly level: number; // 1-9 compression level
  readonly threshold: number; // Minimum bytes to compress
}

/**
 * Protocol encryption configuration
 */
export interface ProtocolEncryption {
  readonly enabled: boolean;
  readonly algorithm: "aes-256-gcm" | "chacha20-poly1305" | "aes-128-gcm";
  readonly keyRotation: boolean;
  readonly endToEnd: boolean;
}

/**
 * Protocol routing information
 */
export interface ProtocolRouting {
  readonly hints: string[];
  readonly affinity: "session" | "user" | "service" | "none";
  readonly loadBalancing:
    | "round_robin"
    | "least_connections"
    | "weighted"
    | "sticky";
  readonly regionPreference?: string;
}

/**
 * Protocol audit configuration
 */
export interface ProtocolAudit {
  readonly enabled: boolean;
  readonly level: "minimal" | "standard" | "detailed" | "forensic";
  readonly retention: number; // Days to retain audit data
  readonly compliance: string[]; // Compliance frameworks
}

/**
 * Protocol performance settings
 */
export interface ProtocolPerformance {
  readonly metricsEnabled: boolean;
  readonly latencyTracking: boolean;
  readonly throughputTracking: boolean;
  readonly resourceTracking: boolean;
  readonly samplingRate: number; // 0.0 to 1.0
}

// ===== ENHANCED VALIDATION TYPES =====

/**
 * Enhanced validation request with streaming capabilities
 */
export interface EnhancedParlantValidationRequest {
  readonly requestId: string;
  readonly operationId: string;
  readonly validationType: ValidationType;
  readonly context: EnhancedValidationContext;
  readonly action: EnhancedValidationAction;
  readonly constraints: ValidationConstraints;
  readonly streaming: ValidationStreamingConfig;
  readonly workflow: ValidationWorkflowConfig;
  readonly security: ValidationSecurityConfig;
  readonly compliance: ValidationComplianceConfig;
}

/**
 * Validation type enumeration
 */
export enum ValidationType {
  FUNCTION_EXECUTION = "function_execution",
  DATA_ACCESS = "data_access",
  SYSTEM_OPERATION = "system_operation",
  USER_ACTION = "user_action",
  AUTOMATED_WORKFLOW = "automated_workflow",
  SECURITY_OPERATION = "security_operation",
  COMPLIANCE_CHECK = "compliance_check",
  BUSINESS_PROCESS = "business_process",
}

/**
 * Enhanced validation context with comprehensive information
 */
export interface EnhancedValidationContext {
  readonly user: UserValidationContext;
  readonly session: SessionValidationContext;
  readonly application: ApplicationValidationContext;
  readonly environment: EnvironmentValidationContext;
  readonly business: BusinessValidationContext;
  readonly technical: TechnicalValidationContext;
  readonly security: SecurityValidationContext;
  readonly compliance: ComplianceValidationContext;
}

/**
 * User validation context
 */
export interface UserValidationContext {
  readonly userId: string;
  readonly userRole: string[];
  readonly permissions: string[];
  readonly authenticationLevel: AuthenticationLevel;
  readonly sessionDuration: number;
  readonly previousActions: UserActionHistory[];
  readonly riskProfile: UserRiskProfile;
  readonly preferences: UserValidationPreferences;
}

/**
 * Authentication levels
 */
export enum AuthenticationLevel {
  ANONYMOUS = "anonymous",
  BASIC = "basic",
  MULTI_FACTOR = "multi_factor",
  CERTIFICATE = "certificate",
  BIOMETRIC = "biometric",
  ENTERPRISE_SSO = "enterprise_sso",
}

/**
 * User action history
 */
export interface UserActionHistory {
  readonly timestamp: number;
  readonly action: string;
  readonly outcome: "success" | "failure" | "partial";
  readonly riskScore: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * User risk profile
 */
export interface UserRiskProfile {
  readonly riskScore: number; // 0-100
  readonly riskFactors: string[];
  readonly trustScore: number; // 0-100
  readonly anomalyScore: number; // 0-100
  readonly lastAssessment: number;
}

/**
 * User validation preferences
 */
export interface UserValidationPreferences {
  readonly confirmationMethod: "auto" | "prompt" | "always_confirm";
  readonly riskTolerance: "low" | "medium" | "high";
  readonly notificationPreferences: NotificationPreferences;
  readonly auditLevel: "minimal" | "standard" | "detailed";
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  readonly email: boolean;
  readonly sms: boolean;
  readonly push: boolean;
  readonly inApp: boolean;
  readonly webhook?: string;
}

/**
 * Session validation context
 */
export interface SessionValidationContext {
  readonly sessionId: string;
  readonly sessionType: "interactive" | "batch" | "api" | "automated";
  readonly startTime: number;
  readonly duration: number;
  readonly activityCount: number;
  readonly securityEvents: SecurityEvent[];
  readonly performanceMetrics: SessionPerformanceMetrics;
}

/**
 * Security event information
 */
export interface SecurityEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly timestamp: number;
  readonly description: string;
  readonly mitigated: boolean;
}

/**
 * Session performance metrics
 */
export interface SessionPerformanceMetrics {
  readonly averageResponseTime: number;
  readonly errorRate: number;
  readonly throughput: number;
  readonly resourceUtilization: number;
}

/**
 * Application validation context
 */
export interface ApplicationValidationContext {
  readonly applicationId: string;
  readonly applicationVersion: string;
  readonly componentId?: string;
  readonly featureFlags: Record<string, boolean>;
  readonly configuration: Record<string, unknown>;
  readonly dependencies: ApplicationDependency[];
  readonly healthStatus: ApplicationHealthStatus;
}

/**
 * Application dependency
 */
export interface ApplicationDependency {
  readonly dependencyId: string;
  readonly dependencyType: "service" | "database" | "api" | "library";
  readonly version: string;
  readonly status: "healthy" | "degraded" | "unavailable";
  readonly lastCheck: number;
}

/**
 * Application health status
 */
export interface ApplicationHealthStatus {
  readonly status: "healthy" | "degraded" | "unhealthy";
  readonly uptime: number;
  readonly lastHealthCheck: number;
  readonly issues: string[];
  readonly metrics: Record<string, number>;
}

/**
 * Environment validation context
 */
export interface EnvironmentValidationContext {
  readonly environment: "development" | "staging" | "production" | "test";
  readonly region: string;
  readonly zone?: string;
  readonly infrastructure: InfrastructureContext;
  readonly networkContext: NetworkContext;
  readonly resourceContext: ResourceContext;
}

/**
 * Infrastructure context
 */
export interface InfrastructureContext {
  readonly platform: "cloud" | "on_premise" | "hybrid";
  readonly provider?: string;
  readonly instanceType?: string;
  readonly clusterInfo?: ClusterInfo;
}

/**
 * Cluster information
 */
export interface ClusterInfo {
  readonly clusterId: string;
  readonly nodeCount: number;
  readonly masterNodes: number;
  readonly workerNodes: number;
  readonly version: string;
}

/**
 * Network context
 */
export interface NetworkContext {
  readonly networkType: "public" | "private" | "hybrid";
  readonly ipAddress: string;
  readonly subnet?: string;
  readonly firewallRules: string[];
  readonly loadBalancer?: LoadBalancerInfo;
}

/**
 * Load balancer information
 */
export interface LoadBalancerInfo {
  readonly type: "application" | "network" | "gateway";
  readonly algorithm: string;
  readonly healthCheck: boolean;
  readonly sslTermination: boolean;
}

/**
 * Resource context
 */
export interface ResourceContext {
  readonly cpu: ResourceMetric;
  readonly memory: ResourceMetric;
  readonly storage: ResourceMetric;
  readonly network: ResourceMetric;
}

/**
 * Resource metric
 */
export interface ResourceMetric {
  readonly current: number;
  readonly maximum: number;
  readonly unit: string;
  readonly trend: "increasing" | "decreasing" | "stable";
}

/**
 * Business validation context
 */
export interface BusinessValidationContext {
  readonly organizationId: string;
  readonly businessUnit: string;
  readonly department?: string;
  readonly project?: ProjectContext;
  readonly costCenter?: string;
  readonly budget: BudgetContext;
  readonly compliance: BusinessComplianceContext;
}

/**
 * Project context
 */
export interface ProjectContext {
  readonly projectId: string;
  readonly projectName: string;
  readonly phase:
    | "planning"
    | "development"
    | "testing"
    | "deployment"
    | "maintenance";
  readonly priority: "low" | "medium" | "high" | "critical";
  readonly deadline?: number;
}

/**
 * Budget context
 */
export interface BudgetContext {
  readonly budgetId: string;
  readonly allocatedAmount: number;
  readonly spentAmount: number;
  readonly currency: string;
  readonly period: "monthly" | "quarterly" | "annually";
}

/**
 * Business compliance context
 */
export interface BusinessComplianceContext {
  readonly frameworks: string[];
  readonly policies: string[];
  readonly lastAudit: number;
  readonly nextAudit: number;
  readonly complianceScore: number;
}

/**
 * Technical validation context
 */
export interface TechnicalValidationContext {
  readonly architecture: ArchitectureContext;
  readonly deployment: DeploymentContext;
  readonly monitoring: MonitoringContext;
  readonly integration: IntegrationContext;
}

/**
 * Architecture context
 */
export interface ArchitectureContext {
  readonly pattern: "monolith" | "microservices" | "serverless" | "hybrid";
  readonly technologies: string[];
  readonly databases: string[];
  readonly messageQueues: string[];
  readonly caches: string[];
}

/**
 * Deployment context
 */
export interface DeploymentContext {
  readonly strategy: "blue_green" | "canary" | "rolling" | "recreate";
  readonly version: string;
  readonly deploymentTime: number;
  readonly rollbackAvailable: boolean;
  readonly healthChecks: string[];
}

/**
 * Monitoring context
 */
export interface MonitoringContext {
  readonly tools: string[];
  readonly metrics: MonitoringMetric[];
  readonly alerts: MonitoringAlert[];
  readonly dashboards: string[];
}

/**
 * Monitoring metric
 */
export interface MonitoringMetric {
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly threshold?: number;
  readonly trend: "up" | "down" | "stable";
}

/**
 * Monitoring alert
 */
export interface MonitoringAlert {
  readonly alertId: string;
  readonly severity: "info" | "warning" | "error" | "critical";
  readonly message: string;
  readonly timestamp: number;
  readonly resolved: boolean;
}

/**
 * Integration context
 */
export interface IntegrationContext {
  readonly externalSystems: ExternalSystemInfo[];
  readonly apis: ApiInfo[];
  readonly webhooks: WebhookInfo[];
  readonly dataFlows: DataFlowInfo[];
}

/**
 * External system information
 */
export interface ExternalSystemInfo {
  readonly systemId: string;
  readonly systemType: string;
  readonly version: string;
  readonly status: "available" | "degraded" | "unavailable";
  readonly lastCheck: number;
}

/**
 * API information
 */
export interface ApiInfo {
  readonly apiId: string;
  readonly version: string;
  readonly endpoint: string;
  readonly method: string;
  readonly authRequired: boolean;
  readonly rateLimit: number;
}

/**
 * Webhook information
 */
export interface WebhookInfo {
  readonly webhookId: string;
  readonly url: string;
  readonly events: string[];
  readonly active: boolean;
  readonly lastTriggered?: number;
}

/**
 * Data flow information
 */
export interface DataFlowInfo {
  readonly flowId: string;
  readonly source: string;
  readonly destination: string;
  readonly dataType: string;
  readonly frequency: string;
  readonly lastExecution?: number;
}

/**
 * Enhanced validation action
 */
export interface EnhancedValidationAction {
  readonly actionId: string;
  readonly actionType: ActionType;
  readonly actionCategory: ActionCategory;
  readonly parameters: ActionParameters;
  readonly execution: ActionExecution;
  readonly impact: ActionImpact;
  readonly dependencies: ActionDependency[];
  readonly rollback: ActionRollback;
  readonly monitoring: ActionMonitoring;
}

/**
 * Action types
 */
export enum ActionType {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  EXECUTE = "execute",
  CONFIGURE = "configure",
  DEPLOY = "deploy",
  MIGRATE = "migrate",
  BACKUP = "backup",
  RESTORE = "restore",
}

/**
 * Action categories
 */
export enum ActionCategory {
  DATA_OPERATION = "data_operation",
  SYSTEM_OPERATION = "system_operation",
  USER_OPERATION = "user_operation",
  SECURITY_OPERATION = "security_operation",
  ADMINISTRATIVE = "administrative",
  MAINTENANCE = "maintenance",
  EMERGENCY = "emergency",
}

/**
 * Action parameters
 */
export interface ActionParameters {
  readonly parameters: Record<string, unknown>;
  readonly validation: ParameterValidation[];
  readonly sanitization: ParameterSanitization[];
  readonly encryption: ParameterEncryption[];
}

/**
 * Parameter validation
 */
export interface ParameterValidation {
  readonly parameter: string;
  readonly type: string;
  readonly required: boolean;
  readonly constraints: Record<string, unknown>;
  readonly customValidation?: string;
}

/**
 * Parameter sanitization
 */
export interface ParameterSanitization {
  readonly parameter: string;
  readonly method: string;
  readonly options: Record<string, unknown>;
}

/**
 * Parameter encryption
 */
export interface ParameterEncryption {
  readonly parameter: string;
  readonly algorithm: string;
  readonly keyId: string;
  readonly iv?: string;
}

/**
 * Action execution configuration
 */
export interface ActionExecution {
  readonly mode: "synchronous" | "asynchronous" | "deferred";
  readonly timeout: number;
  readonly retries: number;
  readonly idempotent: boolean;
  readonly transactional: boolean;
  readonly atomic: boolean;
}

/**
 * Action impact assessment
 */
export interface ActionImpact {
  readonly scope: ImpactScope;
  readonly severity: ImpactSeverity;
  readonly reversibility: ActionReversibility;
  readonly dataImpact: DataImpact;
  readonly systemImpact: SystemImpact;
  readonly userImpact: UserImpact;
  readonly businessImpact: BusinessImpact;
}

/**
 * Impact scope
 */
export enum ImpactScope {
  LOCAL = "local",
  SERVICE = "service",
  CLUSTER = "cluster",
  REGION = "region",
  GLOBAL = "global",
  EXTERNAL = "external",
}

/**
 * Impact severity
 */
export enum ImpactSeverity {
  MINIMAL = "minimal",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
  CATASTROPHIC = "catastrophic",
}

/**
 * Action reversibility
 */
export interface ActionReversibility {
  readonly reversible: boolean;
  readonly rollbackMethod?: string;
  readonly rollbackTime?: number;
  readonly rollbackComplexity: "simple" | "moderate" | "complex" | "impossible";
  readonly dataLoss: boolean;
}

/**
 * Data impact
 */
export interface DataImpact {
  readonly affectedRecords: number;
  readonly dataTypes: string[];
  readonly personalData: boolean;
  readonly sensitiveData: boolean;
  readonly backupRequired: boolean;
  readonly encryption: boolean;
}

/**
 * System impact
 */
export interface SystemImpact {
  readonly downtime: number;
  readonly performance: "improved" | "neutral" | "degraded";
  readonly availability: "improved" | "neutral" | "reduced";
  readonly security: "improved" | "neutral" | "reduced";
  readonly scalability: "improved" | "neutral" | "reduced";
}

/**
 * User impact
 */
export interface UserImpact {
  readonly affectedUsers: number;
  readonly userExperience: "improved" | "neutral" | "degraded";
  readonly functionality: "enhanced" | "maintained" | "reduced";
  readonly training: boolean;
  readonly communication: boolean;
}

/**
 * Business impact
 */
export interface BusinessImpact {
  readonly revenue: number;
  readonly cost: number;
  readonly compliance: "improved" | "maintained" | "reduced";
  readonly reputation: "positive" | "neutral" | "negative";
  readonly competitive: "advantage" | "neutral" | "disadvantage";
}

/**
 * Action dependency
 */
export interface ActionDependency {
  readonly dependencyId: string;
  readonly dependencyType: "prerequisite" | "concurrent" | "subsequent";
  readonly required: boolean;
  readonly description: string;
  readonly validationMethod: string;
  readonly timeout?: number;
}

/**
 * Action rollback configuration
 */
export interface ActionRollback {
  readonly strategy: RollbackStrategy;
  readonly automated: boolean;
  readonly timeout: number;
  readonly triggers: RollbackTrigger[];
  readonly validation: RollbackValidation[];
}

/**
 * Rollback strategy
 */
export enum RollbackStrategy {
  IMMEDIATE = "immediate",
  DEFERRED = "deferred",
  MANUAL = "manual",
  CONDITIONAL = "conditional",
  NONE = "none",
}

/**
 * Rollback trigger
 */
export interface RollbackTrigger {
  readonly triggerId: string;
  readonly condition: string;
  readonly threshold: number;
  readonly timeWindow: number;
  readonly action: "rollback" | "alert" | "pause";
}

/**
 * Rollback validation
 */
export interface RollbackValidation {
  readonly validationId: string;
  readonly method: string;
  readonly criteria: Record<string, unknown>;
  readonly timeout: number;
  readonly required: boolean;
}

/**
 * Action monitoring
 */
export interface ActionMonitoring {
  readonly enabled: boolean;
  readonly metrics: ActionMetric[];
  readonly alerts: ActionAlert[];
  readonly dashboards: string[];
  readonly retention: number;
}

/**
 * Action metric
 */
export interface ActionMetric {
  readonly metricId: string;
  readonly name: string;
  readonly type: "counter" | "gauge" | "histogram" | "timer";
  readonly unit: string;
  readonly labels: Record<string, string>;
}

/**
 * Action alert
 */
export interface ActionAlert {
  readonly alertId: string;
  readonly condition: string;
  readonly threshold: number;
  readonly severity: "info" | "warning" | "error" | "critical";
  readonly notification: string[];
}

// ===== VALIDATION CONFIGURATION TYPES =====

/**
 * Validation constraints
 */
export interface ValidationConstraints {
  readonly timeConstraints: TimeConstraints;
  readonly resourceConstraints: ResourceConstraints;
  readonly securityConstraints: SecurityConstraints;
  readonly businessConstraints: BusinessConstraints;
  readonly technicalConstraints: TechnicalConstraints;
}

/**
 * Time constraints
 */
export interface TimeConstraints {
  readonly maxExecutionTime: number;
  readonly timeWindow?: TimeWindow;
  readonly scheduling?: SchedulingConstraints;
  readonly deadlines?: Deadline[];
}

/**
 * Time window
 */
export interface TimeWindow {
  readonly start: number;
  readonly end: number;
  readonly timezone: string;
  readonly recurring?: boolean;
  readonly exclusions?: TimeWindow[];
}

/**
 * Scheduling constraints
 */
export interface SchedulingConstraints {
  readonly allowedDays: number[]; // 0-6 (Sunday-Saturday)
  readonly allowedHours: number[]; // 0-23
  readonly blackoutPeriods: TimeWindow[];
  readonly preferredTime?: number;
}

/**
 * Deadline
 */
export interface Deadline {
  readonly deadlineId: string;
  readonly timestamp: number;
  readonly priority: "soft" | "hard";
  readonly consequences: string[];
}

/**
 * Resource constraints
 */
export interface ResourceConstraints {
  readonly maxCpu: number;
  readonly maxMemory: number;
  readonly maxStorage: number;
  readonly maxNetwork: number;
  readonly concurrency: number;
  readonly quotas: ResourceQuota[];
}

/**
 * Resource quota
 */
export interface ResourceQuota {
  readonly resource: string;
  readonly limit: number;
  readonly period: "second" | "minute" | "hour" | "day";
  readonly burst?: number;
}

/**
 * Security constraints
 */
export interface SecurityConstraints {
  readonly authenticationRequired: boolean;
  readonly authorizationRequired: boolean;
  readonly auditRequired: boolean;
  readonly encryptionRequired: boolean;
  readonly minimumAuthLevel: AuthenticationLevel;
  readonly requiredPermissions: string[];
  readonly forbiddenActions: string[];
}

/**
 * Business constraints
 */
export interface BusinessConstraints {
  readonly approvalRequired: boolean;
  readonly budgetLimit?: number;
  readonly complianceRequired: string[];
  readonly businessHours?: boolean;
  readonly emergencyOverride?: boolean;
  readonly stakeholderApproval?: string[];
}

/**
 * Technical constraints
 */
export interface TechnicalConstraints {
  readonly dependencies: string[];
  readonly prerequisites: string[];
  readonly exclusions: string[];
  readonly compatibility: CompatibilityConstraint[];
  readonly versions: VersionConstraint[];
}

/**
 * Compatibility constraint
 */
export interface CompatibilityConstraint {
  readonly component: string;
  readonly version: string;
  readonly operator: "=" | ">" | "<" | ">=" | "<=" | "!=";
  readonly required: boolean;
}

/**
 * Version constraint
 */
export interface VersionConstraint {
  readonly component: string;
  readonly minVersion?: string;
  readonly maxVersion?: string;
  readonly exactVersion?: string;
  readonly excludedVersions?: string[];
}

/**
 * Validation streaming configuration
 */
export interface ValidationStreamingConfig {
  readonly enabled: boolean;
  readonly protocol: StreamingProtocol;
  readonly compression: StreamingCompression;
  readonly batching: StreamingBatching;
  readonly ordering: StreamingOrdering;
  readonly reliability: StreamingReliability;
  readonly performance: StreamingPerformance;
}

/**
 * Streaming protocol
 */
export interface StreamingProtocol {
  readonly version: string;
  readonly features: string[];
  readonly extensions: string[];
  readonly negotiation: boolean;
  readonly fallback: string[];
}

/**
 * Streaming compression
 */
export interface StreamingCompression {
  readonly enabled: boolean;
  readonly algorithm: "gzip" | "deflate" | "brotli" | "lz4";
  readonly level: number;
  readonly threshold: number;
  readonly adaptive: boolean;
}

/**
 * Streaming batching
 */
export interface StreamingBatching {
  readonly enabled: boolean;
  readonly maxSize: number;
  readonly maxDelay: number;
  readonly strategy: "size" | "time" | "hybrid";
}

/**
 * Streaming ordering
 */
export interface StreamingOrdering {
  readonly guaranteed: boolean;
  readonly method: "sequence" | "timestamp" | "custom";
  readonly bufferSize: number;
  readonly timeout: number;
}

/**
 * Streaming reliability
 */
export interface StreamingReliability {
  readonly acknowledgments: boolean;
  readonly retries: number;
  readonly timeout: number;
  readonly deadLetter: boolean;
  readonly persistence: boolean;
}

/**
 * Streaming performance
 */
export interface StreamingPerformance {
  readonly maxThroughput: number;
  readonly targetLatency: number;
  readonly bufferSize: number;
  readonly prefetch: number;
  readonly parallelism: number;
}

/**
 * Validation workflow configuration
 */
export interface ValidationWorkflowConfig {
  readonly workflowId: string;
  readonly workflowType: WorkflowType;
  readonly stages: WorkflowStage[];
  readonly routing: WorkflowRouting;
  readonly escalation: WorkflowEscalation;
  readonly notifications: WorkflowNotifications;
}

/**
 * Workflow type
 */
export enum WorkflowType {
  AUTOMATIC = "automatic",
  MANUAL = "manual",
  HYBRID = "hybrid",
  CONDITIONAL = "conditional",
  PARALLEL = "parallel",
  SEQUENTIAL = "sequential",
}

/**
 * Workflow stage
 */
export interface WorkflowStage {
  readonly stageId: string;
  readonly name: string;
  readonly type: "validation" | "approval" | "execution" | "verification";
  readonly required: boolean;
  readonly timeout: number;
  readonly participants: string[];
  readonly conditions: StageCondition[];
}

/**
 * Stage condition
 */
export interface StageCondition {
  readonly conditionId: string;
  readonly expression: string;
  readonly required: boolean;
  readonly errorAction: "fail" | "skip" | "retry";
}

/**
 * Workflow routing
 */
export interface WorkflowRouting {
  readonly strategy: "round_robin" | "random" | "priority" | "load_based";
  readonly rules: RoutingRule[];
  readonly fallback: string[];
}

/**
 * Routing rule
 */
export interface RoutingRule {
  readonly ruleId: string;
  readonly condition: string;
  readonly target: string;
  readonly weight?: number;
  readonly priority?: number;
}

/**
 * Workflow escalation
 */
export interface WorkflowEscalation {
  readonly enabled: boolean;
  readonly triggers: EscalationTrigger[];
  readonly levels: EscalationLevel[];
}

/**
 * Escalation trigger
 */
export interface EscalationTrigger {
  readonly triggerId: string;
  readonly condition: string;
  readonly delay: number;
  readonly automatic: boolean;
}

/**
 * Escalation level
 */
export interface EscalationLevel {
  readonly level: number;
  readonly participants: string[];
  readonly timeout: number;
  readonly actions: string[];
}

/**
 * Workflow notifications
 */
export interface WorkflowNotifications {
  readonly enabled: boolean;
  readonly channels: NotificationChannel[];
  readonly templates: NotificationTemplate[];
  readonly rules: NotificationRule[];
}

/**
 * Notification channel
 */
export interface NotificationChannel {
  readonly channelId: string;
  readonly type: "email" | "sms" | "push" | "webhook" | "slack";
  readonly config: Record<string, unknown>;
  readonly enabled: boolean;
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  readonly templateId: string;
  readonly name: string;
  readonly subject: string;
  readonly body: string;
  readonly format: "text" | "html" | "markdown";
}

/**
 * Notification rule
 */
export interface NotificationRule {
  readonly ruleId: string;
  readonly event: string;
  readonly condition: string;
  readonly channels: string[];
  readonly template: string;
  readonly priority: ProtocolPriority;
}

// ===== ENHANCED RESPONSE TYPES =====

/**
 * Enhanced validation response with comprehensive results
 */
export interface EnhancedParlantValidationResponse {
  readonly responseId: string;
  readonly requestId: string;
  readonly operationId: string;
  readonly result: ValidationResult;
  readonly reasoning: ValidationReasoning;
  readonly evidence: ValidationEvidence;
  readonly conditions: ValidationCondition[];
  readonly recommendations: ValidationRecommendation[];
  readonly auditTrail: EnhancedAuditTrailEntry[];
  readonly performance: ValidationPerformanceMetrics;
  readonly security: ValidationSecurityResults;
  readonly compliance: ValidationComplianceResults;
}

/**
 * Validation result
 */
export interface ValidationResult {
  readonly decision: ValidationDecision;
  readonly confidence: number;
  readonly riskScore: number;
  readonly trustScore: number;
  readonly qualityScore: number;
  readonly metadata: ValidationResultMetadata;
}

/**
 * Validation decision
 */
export enum ValidationDecision {
  APPROVED = "approved",
  DENIED = "denied",
  CONDITIONAL = "conditional",
  ESCALATED = "escalated",
  DEFERRED = "deferred",
  TIMEOUT = "timeout",
  ERROR = "error",
}

/**
 * Validation result metadata
 */
export interface ValidationResultMetadata {
  readonly validationMethod: string;
  readonly aiModel?: string;
  readonly humanReviewed: boolean;
  readonly automaticDecision: boolean;
  readonly reviewTime: number;
  readonly version: string;
}

/**
 * Validation reasoning
 */
export interface ValidationReasoning {
  readonly summary: string;
  readonly factors: ReasoningFactor[];
  readonly analysis: ReasoningAnalysis;
  readonly alternatives: ReasoningAlternative[];
}

/**
 * Reasoning factor
 */
export interface ReasoningFactor {
  readonly factorId: string;
  readonly category:
    | "security"
    | "business"
    | "technical"
    | "compliance"
    | "risk";
  readonly weight: number;
  readonly impact: "positive" | "negative" | "neutral";
  readonly description: string;
  readonly evidence: string[];
}

/**
 * Reasoning analysis
 */
export interface ReasoningAnalysis {
  readonly methodology: string;
  readonly assumptions: string[];
  readonly limitations: string[];
  readonly confidence: number;
  readonly bias: BiasAnalysis[];
}

/**
 * Bias analysis
 */
export interface BiasAnalysis {
  readonly biasType: string;
  readonly description: string;
  readonly mitigation: string;
  readonly impact: "low" | "medium" | "high";
}

/**
 * Reasoning alternative
 */
export interface ReasoningAlternative {
  readonly alternativeId: string;
  readonly description: string;
  readonly pros: string[];
  readonly cons: string[];
  readonly riskAssessment: number;
  readonly feasibility: number;
}

/**
 * Validation evidence
 */
export interface ValidationEvidence {
  readonly sources: EvidenceSource[];
  readonly artifacts: EvidenceArtifact[];
  readonly references: EvidenceReference[];
  readonly verification: EvidenceVerification;
}

/**
 * Evidence source
 */
export interface EvidenceSource {
  readonly sourceId: string;
  readonly type: "system" | "human" | "external" | "historical";
  readonly credibility: number;
  readonly relevance: number;
  readonly timestamp: number;
  readonly data: Record<string, unknown>;
}

/**
 * Evidence artifact
 */
export interface EvidenceArtifact {
  readonly artifactId: string;
  readonly type: "log" | "screenshot" | "document" | "metric" | "trace";
  readonly format: string;
  readonly size: number;
  readonly checksum: string;
  readonly location: string;
}

/**
 * Evidence reference
 */
export interface EvidenceReference {
  readonly referenceId: string;
  readonly type:
    | "policy"
    | "procedure"
    | "regulation"
    | "standard"
    | "guideline";
  readonly title: string;
  readonly version: string;
  readonly section?: string;
  readonly url?: string;
}

/**
 * Evidence verification
 */
export interface EvidenceVerification {
  readonly verified: boolean;
  readonly method: string;
  readonly timestamp: number;
  readonly verifier: string;
  readonly confidence: number;
}

/**
 * Validation condition
 */
export interface ValidationCondition {
  readonly conditionId: string;
  readonly type: ConditionType;
  readonly description: string;
  readonly required: boolean;
  readonly deadline?: number;
  readonly verification: ConditionVerification;
  readonly dependencies: string[];
}

/**
 * Condition type
 */
export enum ConditionType {
  PREREQUISITE = "prerequisite",
  MONITORING = "monitoring",
  APPROVAL = "approval",
  VERIFICATION = "verification",
  NOTIFICATION = "notification",
  ROLLBACK = "rollback",
}

/**
 * Condition verification
 */
export interface ConditionVerification {
  readonly method: string;
  readonly criteria: Record<string, unknown>;
  readonly automated: boolean;
  readonly timeout: number;
  readonly retries: number;
}

/**
 * Validation recommendation
 */
export interface ValidationRecommendation {
  readonly recommendationId: string;
  readonly type: RecommendationType;
  readonly priority: ProtocolPriority;
  readonly title: string;
  readonly description: string;
  readonly rationale: string;
  readonly implementation: RecommendationImplementation;
  readonly impact: RecommendationImpact;
}

/**
 * Recommendation type
 */
export enum RecommendationType {
  SECURITY_IMPROVEMENT = "security_improvement",
  PERFORMANCE_OPTIMIZATION = "performance_optimization",
  COST_REDUCTION = "cost_reduction",
  RISK_MITIGATION = "risk_mitigation",
  COMPLIANCE_ENHANCEMENT = "compliance_enhancement",
  PROCESS_IMPROVEMENT = "process_improvement",
  TECHNOLOGY_UPGRADE = "technology_upgrade",
}

/**
 * Recommendation implementation
 */
export interface RecommendationImplementation {
  readonly complexity: "low" | "medium" | "high" | "very_high";
  readonly effort: number; // Person-hours
  readonly cost: number;
  readonly timeline: number; // Days
  readonly dependencies: string[];
  readonly risks: string[];
}

/**
 * Recommendation impact
 */
export interface RecommendationImpact {
  readonly security: "improved" | "neutral" | "degraded";
  readonly performance: "improved" | "neutral" | "degraded";
  readonly cost: "reduced" | "neutral" | "increased";
  readonly compliance: "improved" | "neutral" | "degraded";
  readonly risk: "reduced" | "neutral" | "increased";
  readonly quantified: QuantifiedImpact[];
}

/**
 * Quantified impact
 */
export interface QuantifiedImpact {
  readonly metric: string;
  readonly baseline: number;
  readonly projected: number;
  readonly unit: string;
  readonly confidence: number;
}

/**
 * Enhanced audit trail entry
 */
export interface EnhancedAuditTrailEntry {
  readonly entryId: string;
  readonly timestamp: number;
  readonly actor: AuditActor;
  readonly action: AuditAction;
  readonly outcome: AuditOutcome;
  readonly context: AuditContext;
  readonly evidence: AuditEvidence;
  readonly integrity: AuditIntegrity;
}

/**
 * Audit actor
 */
export interface AuditActor {
  readonly actorId: string;
  readonly actorType: "user" | "system" | "service" | "admin";
  readonly identity: string;
  readonly roles: string[];
  readonly session?: string;
  readonly location?: string;
}

/**
 * Audit action
 */
export interface AuditAction {
  readonly actionId: string;
  readonly actionType: string;
  readonly category: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  readonly classification: "normal" | "sensitive" | "critical";
}

/**
 * Audit outcome
 */
export interface AuditOutcome {
  readonly result: "success" | "failure" | "partial" | "cancelled";
  readonly statusCode?: number;
  readonly message?: string;
  readonly duration: number;
  readonly resources: AuditResourceUsage;
}

/**
 * Audit resource usage
 */
export interface AuditResourceUsage {
  readonly cpu: number;
  readonly memory: number;
  readonly network: number;
  readonly storage: number;
  readonly duration: number;
}

/**
 * Audit context
 */
export interface AuditContext {
  readonly requestId: string;
  readonly operationId: string;
  readonly sessionId: string;
  readonly traceId?: string;
  readonly parentId?: string;
  readonly correlationId?: string;
  readonly environment: string;
}

/**
 * Audit evidence
 */
export interface AuditEvidence {
  readonly logs: string[];
  readonly artifacts: string[];
  readonly checksums: Record<string, string>;
  readonly signatures: string[];
  readonly witnesses?: string[];
}

/**
 * Audit integrity
 */
export interface AuditIntegrity {
  readonly hash: string;
  readonly algorithm: string;
  readonly signature: string;
  readonly timestamp: number;
  readonly verified: boolean;
}

/**
 * Validation performance metrics
 */
export interface ValidationPerformanceMetrics {
  readonly totalTime: number;
  readonly analysisTime: number;
  readonly decisionTime: number;
  readonly verificationTime: number;
  readonly networkTime: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly resourceUsage: ValidationResourceUsage;
}

/**
 * Validation resource usage
 */
export interface ValidationResourceUsage {
  readonly cpu: number;
  readonly memory: number;
  readonly network: number;
  readonly storage: number;
  readonly apiCalls: number;
  readonly databaseQueries: number;
}

/**
 * Validation security results
 */
export interface ValidationSecurityResults {
  readonly securityScore: number;
  readonly threats: SecurityThreat[];
  readonly vulnerabilities: SecurityVulnerability[];
  readonly mitigations: SecurityMitigation[];
  readonly recommendations: SecurityRecommendation[];
}

/**
 * Security threat
 */
export interface SecurityThreat {
  readonly threatId: string;
  readonly type: string;
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly probability: number;
  readonly impact: number;
  readonly description: string;
  readonly mitigation?: string;
}

/**
 * Security vulnerability
 */
export interface SecurityVulnerability {
  readonly vulnerabilityId: string;
  readonly type: string;
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly cvss?: number;
  readonly description: string;
  readonly remediation?: string;
  readonly timeline?: number;
}

/**
 * Security mitigation
 */
export interface SecurityMitigation {
  readonly mitigationId: string;
  readonly type: string;
  readonly effectiveness: number;
  readonly cost: number;
  readonly complexity: "low" | "medium" | "high";
  readonly description: string;
}

/**
 * Security recommendation
 */
export interface SecurityRecommendation {
  readonly recommendationId: string;
  readonly priority: ProtocolPriority;
  readonly category: string;
  readonly description: string;
  readonly implementation: string;
  readonly benefit: string;
}

/**
 * Validation compliance results
 */
export interface ValidationComplianceResults {
  readonly complianceScore: number;
  readonly frameworks: ComplianceFramework[];
  readonly violations: ComplianceViolation[];
  readonly attestations: ComplianceAttestation[];
  readonly certifications: ComplianceCertification[];
}

/**
 * Compliance framework
 */
export interface ComplianceFramework {
  readonly frameworkId: string;
  readonly name: string;
  readonly version: string;
  readonly score: number;
  readonly requirements: ComplianceRequirement[];
}

/**
 * Compliance requirement
 */
export interface ComplianceRequirement {
  readonly requirementId: string;
  readonly description: string;
  readonly status:
    | "compliant"
    | "non_compliant"
    | "partially_compliant"
    | "not_applicable";
  readonly evidence?: string[];
  readonly exceptions?: string[];
}

/**
 * Compliance violation
 */
export interface ComplianceViolation {
  readonly violationId: string;
  readonly framework: string;
  readonly requirement: string;
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly description: string;
  readonly remediation: string;
  readonly deadline?: number;
}

/**
 * Compliance attestation
 */
export interface ComplianceAttestation {
  readonly attestationId: string;
  readonly framework: string;
  readonly attestor: string;
  readonly timestamp: number;
  readonly period: number;
  readonly status: "active" | "expired" | "revoked";
  readonly evidence: string[];
}

/**
 * Compliance certification
 */
export interface ComplianceCertification {
  readonly certificationId: string;
  readonly name: string;
  readonly issuer: string;
  readonly issuedDate: number;
  readonly expiryDate: number;
  readonly status: "active" | "expired" | "revoked" | "suspended";
  readonly scope: string[];
}

// ===== EXPORT ALL TYPES =====

export {
  // Core protocol types
  ParlantStreamingProtocolType,
  ParlantProtocolMessage,
  ParlantProtocolHeaders,
  ProtocolPriority,
  ProtocolReliability,
  ProtocolCompression,
  ProtocolEncryption,
  ProtocolRouting,
  ProtocolAudit,
  ProtocolPerformance,

  // Enhanced validation types
  EnhancedParlantValidationRequest,
  ValidationType,
  EnhancedValidationContext,

  // Enhanced response types
  EnhancedParlantValidationResponse,
  ValidationResult,
  ValidationDecision,

  // Configuration types
  ValidationConstraints,
  ValidationStreamingConfig,
  ValidationWorkflowConfig,

  // All other types...
};
