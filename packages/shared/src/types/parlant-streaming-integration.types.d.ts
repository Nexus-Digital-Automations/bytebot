export interface ValidationSecurityConfig {
  encryptionRequired: boolean;
  integrityValidation: boolean;
  threatDetection: boolean;
  auditLevel: "basic" | "detailed" | "comprehensive";
}
export interface ValidationComplianceConfig {
  frameworks: string[];
  strictMode: boolean;
  auditRequired: boolean;
  dataRetention: number;
}
export interface SecurityValidationContext {
  securityLevel: "low" | "medium" | "high" | "critical";
  threatLevel: number;
  encryptionStatus: boolean;
  auditTrail: string[];
}
export interface ComplianceValidationContext {
  operationId: string;
  timestamp: Date;
  frameworks: string[];
  scope: string;
  status: "pending" | "validated" | "failed";
}
export declare enum ParlantStreamingProtocolType {
  PROTOCOL_HANDSHAKE = "protocol_handshake",
  PROTOCOL_ACKNOWLEDGED = "protocol_acknowledged",
  PROTOCOL_UPGRADE = "protocol_upgrade",
  PROTOCOL_DOWNGRADE = "protocol_downgrade",
  STREAM_LIFECYCLE_CREATE = "stream_lifecycle_create",
  STREAM_LIFECYCLE_READY = "stream_lifecycle_ready",
  STREAM_LIFECYCLE_SUSPEND = "stream_lifecycle_suspend",
  STREAM_LIFECYCLE_RESUME = "stream_lifecycle_resume",
  STREAM_LIFECYCLE_TERMINATE = "stream_lifecycle_terminate",
  VALIDATION_PROTOCOL_INIT = "validation_protocol_init",
  VALIDATION_PROTOCOL_STREAM = "validation_protocol_stream",
  VALIDATION_PROTOCOL_BATCH = "validation_protocol_batch",
  VALIDATION_PROTOCOL_PRIORITY = "validation_protocol_priority",
  CONFIRMATION_PROTOCOL_REQUEST = "confirmation_protocol_request",
  CONFIRMATION_PROTOCOL_RESPONSE = "confirmation_protocol_response",
  CONFIRMATION_PROTOCOL_TIMEOUT = "confirmation_protocol_timeout",
  CONFIRMATION_PROTOCOL_ESCALATION = "confirmation_protocol_escalation",
  PERFORMANCE_PROTOCOL_METRICS = "performance_protocol_metrics",
  PERFORMANCE_PROTOCOL_ALERT = "performance_protocol_alert",
  PERFORMANCE_PROTOCOL_OPTIMIZATION = "performance_protocol_optimization",
  SECURITY_PROTOCOL_CHALLENGE = "security_protocol_challenge",
  SECURITY_PROTOCOL_VERIFICATION = "security_protocol_verification",
  SECURITY_PROTOCOL_AUDIT = "security_protocol_audit",
}
export interface ParlantProtocolMessage {
  readonly protocolType: ParlantStreamingProtocolType;
  readonly protocolVersion: string;
  readonly messageId: string;
  readonly correlationId?: string;
  readonly sessionId: string;
  readonly streamId?: string;
  readonly timestamp: number;
  readonly ttl?: number;
  readonly payload: Record<string, unknown>;
  readonly headers: ParlantProtocolHeaders;
}
export interface ParlantProtocolHeaders {
  readonly priority: ProtocolPriority;
  readonly reliability: ProtocolReliability;
  readonly compression: ProtocolCompression;
  readonly encryption: ProtocolEncryption;
  readonly routing: ProtocolRouting;
  readonly audit: ProtocolAudit;
  readonly performance: ProtocolPerformance;
}
export declare enum ProtocolPriority {
  BACKGROUND = "background",
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  CRITICAL = "critical",
  EMERGENCY = "emergency",
}
export interface ProtocolReliability {
  readonly requiresAck: boolean;
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly timeoutMs: number;
  readonly duplicateDetection: boolean;
  readonly orderingGuarantee: boolean;
}
export interface ProtocolCompression {
  readonly enabled: boolean;
  readonly algorithm: "gzip" | "deflate" | "brotli" | "lz4";
  readonly level: number;
  readonly threshold: number;
}
export interface ProtocolEncryption {
  readonly enabled: boolean;
  readonly algorithm: "aes-256-gcm" | "chacha20-poly1305" | "aes-128-gcm";
  readonly keyRotation: boolean;
  readonly endToEnd: boolean;
}
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
export interface ProtocolAudit {
  readonly enabled: boolean;
  readonly level: "minimal" | "standard" | "detailed" | "forensic";
  readonly retention: number;
  readonly compliance: string[];
}
export interface ProtocolPerformance {
  readonly metricsEnabled: boolean;
  readonly latencyTracking: boolean;
  readonly throughputTracking: boolean;
  readonly resourceTracking: boolean;
  readonly samplingRate: number;
}
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
export declare enum ValidationType {
  FUNCTION_EXECUTION = "function_execution",
  DATA_ACCESS = "data_access",
  SYSTEM_OPERATION = "system_operation",
  USER_ACTION = "user_action",
  AUTOMATED_WORKFLOW = "automated_workflow",
  SECURITY_OPERATION = "security_operation",
  COMPLIANCE_CHECK = "compliance_check",
  BUSINESS_PROCESS = "business_process",
}
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
export declare enum AuthenticationLevel {
  ANONYMOUS = "anonymous",
  BASIC = "basic",
  MULTI_FACTOR = "multi_factor",
  CERTIFICATE = "certificate",
  BIOMETRIC = "biometric",
  ENTERPRISE_SSO = "enterprise_sso",
}
export interface UserActionHistory {
  readonly timestamp: number;
  readonly action: string;
  readonly outcome: "success" | "failure" | "partial";
  readonly riskScore: number;
  readonly metadata?: Record<string, unknown>;
}
export interface UserRiskProfile {
  readonly riskScore: number;
  readonly riskFactors: string[];
  readonly trustScore: number;
  readonly anomalyScore: number;
  readonly lastAssessment: number;
}
export interface UserValidationPreferences {
  readonly confirmationMethod: "auto" | "prompt" | "always_confirm";
  readonly riskTolerance: "low" | "medium" | "high";
  readonly notificationPreferences: NotificationPreferences;
  readonly auditLevel: "minimal" | "standard" | "detailed";
}
export interface NotificationPreferences {
  readonly email: boolean;
  readonly sms: boolean;
  readonly push: boolean;
  readonly inApp: boolean;
  readonly webhook?: string;
}
export interface SessionValidationContext {
  readonly sessionId: string;
  readonly sessionType: "interactive" | "batch" | "api" | "automated";
  readonly startTime: number;
  readonly duration: number;
  readonly activityCount: number;
  readonly securityEvents: SecurityEvent[];
  readonly performanceMetrics: SessionPerformanceMetrics;
}
export interface SecurityEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly timestamp: number;
  readonly description: string;
  readonly mitigated: boolean;
}
export interface SessionPerformanceMetrics {
  readonly averageResponseTime: number;
  readonly errorRate: number;
  readonly throughput: number;
  readonly resourceUtilization: number;
}
export interface ApplicationValidationContext {
  readonly applicationId: string;
  readonly applicationVersion: string;
  readonly componentId?: string;
  readonly featureFlags: Record<string, boolean>;
  readonly configuration: Record<string, unknown>;
  readonly dependencies: ApplicationDependency[];
  readonly healthStatus: ApplicationHealthStatus;
}
export interface ApplicationDependency {
  readonly dependencyId: string;
  readonly dependencyType: "service" | "database" | "api" | "library";
  readonly version: string;
  readonly status: "healthy" | "degraded" | "unavailable";
  readonly lastCheck: number;
}
export interface ApplicationHealthStatus {
  readonly status: "healthy" | "degraded" | "unhealthy";
  readonly uptime: number;
  readonly lastHealthCheck: number;
  readonly issues: string[];
  readonly metrics: Record<string, number>;
}
export interface EnvironmentValidationContext {
  readonly environment: "development" | "staging" | "production" | "test";
  readonly region: string;
  readonly zone?: string;
  readonly infrastructure: InfrastructureContext;
  readonly networkContext: NetworkContext;
  readonly resourceContext: ResourceContext;
}
export interface InfrastructureContext {
  readonly platform: "cloud" | "on_premise" | "hybrid";
  readonly provider?: string;
  readonly instanceType?: string;
  readonly clusterInfo?: ClusterInfo;
}
export interface ClusterInfo {
  readonly clusterId: string;
  readonly nodeCount: number;
  readonly masterNodes: number;
  readonly workerNodes: number;
  readonly version: string;
}
export interface NetworkContext {
  readonly networkType: "public" | "private" | "hybrid";
  readonly ipAddress: string;
  readonly subnet?: string;
  readonly firewallRules: string[];
  readonly loadBalancer?: LoadBalancerInfo;
}
export interface LoadBalancerInfo {
  readonly type: "application" | "network" | "gateway";
  readonly algorithm: string;
  readonly healthCheck: boolean;
  readonly sslTermination: boolean;
}
export interface ResourceContext {
  readonly cpu: ResourceMetric;
  readonly memory: ResourceMetric;
  readonly storage: ResourceMetric;
  readonly network: ResourceMetric;
}
export interface ResourceMetric {
  readonly current: number;
  readonly maximum: number;
  readonly unit: string;
  readonly trend: "increasing" | "decreasing" | "stable";
}
export interface BusinessValidationContext {
  readonly organizationId: string;
  readonly businessUnit: string;
  readonly department?: string;
  readonly project?: ProjectContext;
  readonly costCenter?: string;
  readonly budget: BudgetContext;
  readonly compliance: BusinessComplianceContext;
}
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
export interface BudgetContext {
  readonly budgetId: string;
  readonly allocatedAmount: number;
  readonly spentAmount: number;
  readonly currency: string;
  readonly period: "monthly" | "quarterly" | "annually";
}
export interface BusinessComplianceContext {
  readonly frameworks: string[];
  readonly policies: string[];
  readonly lastAudit: number;
  readonly nextAudit: number;
  readonly complianceScore: number;
}
export interface TechnicalValidationContext {
  readonly architecture: ArchitectureContext;
  readonly deployment: DeploymentContext;
  readonly monitoring: MonitoringContext;
  readonly integration: IntegrationContext;
}
export interface ArchitectureContext {
  readonly pattern: "monolith" | "microservices" | "serverless" | "hybrid";
  readonly technologies: string[];
  readonly databases: string[];
  readonly messageQueues: string[];
  readonly caches: string[];
}
export interface DeploymentContext {
  readonly strategy: "blue_green" | "canary" | "rolling" | "recreate";
  readonly version: string;
  readonly deploymentTime: number;
  readonly rollbackAvailable: boolean;
  readonly healthChecks: string[];
}
export interface MonitoringContext {
  readonly tools: string[];
  readonly metrics: MonitoringMetric[];
  readonly alerts: MonitoringAlert[];
  readonly dashboards: string[];
}
export interface MonitoringMetric {
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly threshold?: number;
  readonly trend: "up" | "down" | "stable";
}
export interface MonitoringAlert {
  readonly alertId: string;
  readonly severity: "info" | "warning" | "error" | "critical";
  readonly message: string;
  readonly timestamp: number;
  readonly resolved: boolean;
}
export interface IntegrationContext {
  readonly externalSystems: ExternalSystemInfo[];
  readonly apis: ApiInfo[];
  readonly webhooks: WebhookInfo[];
  readonly dataFlows: DataFlowInfo[];
}
export interface ExternalSystemInfo {
  readonly systemId: string;
  readonly systemType: string;
  readonly version: string;
  readonly status: "available" | "degraded" | "unavailable";
  readonly lastCheck: number;
}
export interface ApiInfo {
  readonly apiId: string;
  readonly version: string;
  readonly endpoint: string;
  readonly method: string;
  readonly authRequired: boolean;
  readonly rateLimit: number;
}
export interface WebhookInfo {
  readonly webhookId: string;
  readonly url: string;
  readonly events: string[];
  readonly active: boolean;
  readonly lastTriggered?: number;
}
export interface DataFlowInfo {
  readonly flowId: string;
  readonly source: string;
  readonly destination: string;
  readonly dataType: string;
  readonly frequency: string;
  readonly lastExecution?: number;
}
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
export declare enum ActionType {
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
export declare enum ActionCategory {
  DATA_OPERATION = "data_operation",
  SYSTEM_OPERATION = "system_operation",
  USER_OPERATION = "user_operation",
  SECURITY_OPERATION = "security_operation",
  ADMINISTRATIVE = "administrative",
  MAINTENANCE = "maintenance",
  EMERGENCY = "emergency",
}
export interface ActionParameters {
  readonly parameters: Record<string, unknown>;
  readonly validation: ParameterValidation[];
  readonly sanitization: ParameterSanitization[];
  readonly encryption: ParameterEncryption[];
}
export interface ParameterValidation {
  readonly parameter: string;
  readonly type: string;
  readonly required: boolean;
  readonly constraints: Record<string, unknown>;
  readonly customValidation?: string;
}
export interface ParameterSanitization {
  readonly parameter: string;
  readonly method: string;
  readonly options: Record<string, unknown>;
}
export interface ParameterEncryption {
  readonly parameter: string;
  readonly algorithm: string;
  readonly keyId: string;
  readonly iv?: string;
}
export interface ActionExecution {
  readonly mode: "synchronous" | "asynchronous" | "deferred";
  readonly timeout: number;
  readonly retries: number;
  readonly idempotent: boolean;
  readonly transactional: boolean;
  readonly atomic: boolean;
}
export interface ActionImpact {
  readonly scope: ImpactScope;
  readonly severity: ImpactSeverity;
  readonly reversibility: ActionReversibility;
  readonly dataImpact: DataImpact;
  readonly systemImpact: SystemImpact;
  readonly userImpact: UserImpact;
  readonly businessImpact: BusinessImpact;
}
export declare enum ImpactScope {
  LOCAL = "local",
  SERVICE = "service",
  CLUSTER = "cluster",
  REGION = "region",
  GLOBAL = "global",
  EXTERNAL = "external",
}
export declare enum ImpactSeverity {
  MINIMAL = "minimal",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
  CATASTROPHIC = "catastrophic",
}
export interface ActionReversibility {
  readonly reversible: boolean;
  readonly rollbackMethod?: string;
  readonly rollbackTime?: number;
  readonly rollbackComplexity: "simple" | "moderate" | "complex" | "impossible";
  readonly dataLoss: boolean;
}
export interface DataImpact {
  readonly affectedRecords: number;
  readonly dataTypes: string[];
  readonly personalData: boolean;
  readonly sensitiveData: boolean;
  readonly backupRequired: boolean;
  readonly encryption: boolean;
}
export interface SystemImpact {
  readonly downtime: number;
  readonly performance: "improved" | "neutral" | "degraded";
  readonly availability: "improved" | "neutral" | "reduced";
  readonly security: "improved" | "neutral" | "reduced";
  readonly scalability: "improved" | "neutral" | "reduced";
}
export interface UserImpact {
  readonly affectedUsers: number;
  readonly userExperience: "improved" | "neutral" | "degraded";
  readonly functionality: "enhanced" | "maintained" | "reduced";
  readonly training: boolean;
  readonly communication: boolean;
}
export interface BusinessImpact {
  readonly revenue: number;
  readonly cost: number;
  readonly compliance: "improved" | "maintained" | "reduced";
  readonly reputation: "positive" | "neutral" | "negative";
  readonly competitive: "advantage" | "neutral" | "disadvantage";
}
export interface ActionDependency {
  readonly dependencyId: string;
  readonly dependencyType: "prerequisite" | "concurrent" | "subsequent";
  readonly required: boolean;
  readonly description: string;
  readonly validationMethod: string;
  readonly timeout?: number;
}
export interface ActionRollback {
  readonly strategy: RollbackStrategy;
  readonly automated: boolean;
  readonly timeout: number;
  readonly triggers: RollbackTrigger[];
  readonly validation: RollbackValidation[];
}
export declare enum RollbackStrategy {
  IMMEDIATE = "immediate",
  DEFERRED = "deferred",
  MANUAL = "manual",
  CONDITIONAL = "conditional",
  NONE = "none",
}
export interface RollbackTrigger {
  readonly triggerId: string;
  readonly condition: string;
  readonly threshold: number;
  readonly timeWindow: number;
  readonly action: "rollback" | "alert" | "pause";
}
export interface RollbackValidation {
  readonly validationId: string;
  readonly method: string;
  readonly criteria: Record<string, unknown>;
  readonly timeout: number;
  readonly required: boolean;
}
export interface ActionMonitoring {
  readonly enabled: boolean;
  readonly metrics: ActionMetric[];
  readonly alerts: ActionAlert[];
  readonly dashboards: string[];
  readonly retention: number;
}
export interface ActionMetric {
  readonly metricId: string;
  readonly name: string;
  readonly type: "counter" | "gauge" | "histogram" | "timer";
  readonly unit: string;
  readonly labels: Record<string, string>;
}
export interface ActionAlert {
  readonly alertId: string;
  readonly condition: string;
  readonly threshold: number;
  readonly severity: "info" | "warning" | "error" | "critical";
  readonly notification: string[];
}
export interface ValidationConstraints {
  readonly timeConstraints: TimeConstraints;
  readonly resourceConstraints: ResourceConstraints;
  readonly securityConstraints: SecurityConstraints;
  readonly businessConstraints: BusinessConstraints;
  readonly technicalConstraints: TechnicalConstraints;
}
export interface TimeConstraints {
  readonly maxExecutionTime: number;
  readonly timeWindow?: TimeWindow;
  readonly scheduling?: SchedulingConstraints;
  readonly deadlines?: Deadline[];
}
export interface TimeWindow {
  readonly start: number;
  readonly end: number;
  readonly timezone: string;
  readonly recurring?: boolean;
  readonly exclusions?: TimeWindow[];
}
export interface SchedulingConstraints {
  readonly allowedDays: number[];
  readonly allowedHours: number[];
  readonly blackoutPeriods: TimeWindow[];
  readonly preferredTime?: number;
}
export interface Deadline {
  readonly deadlineId: string;
  readonly timestamp: number;
  readonly priority: "soft" | "hard";
  readonly consequences: string[];
}
export interface ResourceConstraints {
  readonly maxCpu: number;
  readonly maxMemory: number;
  readonly maxStorage: number;
  readonly maxNetwork: number;
  readonly concurrency: number;
  readonly quotas: ResourceQuota[];
}
export interface ResourceQuota {
  readonly resource: string;
  readonly limit: number;
  readonly period: "second" | "minute" | "hour" | "day";
  readonly burst?: number;
}
export interface SecurityConstraints {
  readonly authenticationRequired: boolean;
  readonly authorizationRequired: boolean;
  readonly auditRequired: boolean;
  readonly encryptionRequired: boolean;
  readonly minimumAuthLevel: AuthenticationLevel;
  readonly requiredPermissions: string[];
  readonly forbiddenActions: string[];
}
export interface BusinessConstraints {
  readonly approvalRequired: boolean;
  readonly budgetLimit?: number;
  readonly complianceRequired: string[];
  readonly businessHours?: boolean;
  readonly emergencyOverride?: boolean;
  readonly stakeholderApproval?: string[];
}
export interface TechnicalConstraints {
  readonly dependencies: string[];
  readonly prerequisites: string[];
  readonly exclusions: string[];
  readonly compatibility: CompatibilityConstraint[];
  readonly versions: VersionConstraint[];
}
export interface CompatibilityConstraint {
  readonly component: string;
  readonly version: string;
  readonly operator: "=" | ">" | "<" | ">=" | "<=" | "!=";
  readonly required: boolean;
}
export interface VersionConstraint {
  readonly component: string;
  readonly minVersion?: string;
  readonly maxVersion?: string;
  readonly exactVersion?: string;
  readonly excludedVersions?: string[];
}
export interface ValidationStreamingConfig {
  readonly enabled: boolean;
  readonly protocol: StreamingProtocol;
  readonly compression: StreamingCompression;
  readonly batching: StreamingBatching;
  readonly ordering: StreamingOrdering;
  readonly reliability: StreamingReliability;
  readonly performance: StreamingPerformance;
}
export interface StreamingProtocol {
  readonly version: string;
  readonly features: string[];
  readonly extensions: string[];
  readonly negotiation: boolean;
  readonly fallback: string[];
}
export interface StreamingCompression {
  readonly enabled: boolean;
  readonly algorithm: "gzip" | "deflate" | "brotli" | "lz4";
  readonly level: number;
  readonly threshold: number;
  readonly adaptive: boolean;
}
export interface StreamingBatching {
  readonly enabled: boolean;
  readonly maxSize: number;
  readonly maxDelay: number;
  readonly strategy: "size" | "time" | "hybrid";
}
export interface StreamingOrdering {
  readonly guaranteed: boolean;
  readonly method: "sequence" | "timestamp" | "custom";
  readonly bufferSize: number;
  readonly timeout: number;
}
export interface StreamingReliability {
  readonly acknowledgments: boolean;
  readonly retries: number;
  readonly timeout: number;
  readonly deadLetter: boolean;
  readonly persistence: boolean;
}
export interface StreamingPerformance {
  readonly maxThroughput: number;
  readonly targetLatency: number;
  readonly bufferSize: number;
  readonly prefetch: number;
  readonly parallelism: number;
}
export interface ValidationWorkflowConfig {
  readonly workflowId: string;
  readonly workflowType: WorkflowType;
  readonly stages: WorkflowStage[];
  readonly routing: WorkflowRouting;
  readonly escalation: WorkflowEscalation;
  readonly notifications: WorkflowNotifications;
}
export declare enum WorkflowType {
  AUTOMATIC = "automatic",
  MANUAL = "manual",
  HYBRID = "hybrid",
  CONDITIONAL = "conditional",
  PARALLEL = "parallel",
  SEQUENTIAL = "sequential",
}
export interface WorkflowStage {
  readonly stageId: string;
  readonly name: string;
  readonly type: "validation" | "approval" | "execution" | "verification";
  readonly required: boolean;
  readonly timeout: number;
  readonly participants: string[];
  readonly conditions: StageCondition[];
}
export interface StageCondition {
  readonly conditionId: string;
  readonly expression: string;
  readonly required: boolean;
  readonly errorAction: "fail" | "skip" | "retry";
}
export interface WorkflowRouting {
  readonly strategy: "round_robin" | "random" | "priority" | "load_based";
  readonly rules: RoutingRule[];
  readonly fallback: string[];
}
export interface RoutingRule {
  readonly ruleId: string;
  readonly condition: string;
  readonly target: string;
  readonly weight?: number;
  readonly priority?: number;
}
export interface WorkflowEscalation {
  readonly enabled: boolean;
  readonly triggers: EscalationTrigger[];
  readonly levels: EscalationLevel[];
}
export interface EscalationTrigger {
  readonly triggerId: string;
  readonly condition: string;
  readonly delay: number;
  readonly automatic: boolean;
}
export interface EscalationLevel {
  readonly level: number;
  readonly participants: string[];
  readonly timeout: number;
  readonly actions: string[];
}
export interface WorkflowNotifications {
  readonly enabled: boolean;
  readonly channels: NotificationChannel[];
  readonly templates: NotificationTemplate[];
  readonly rules: NotificationRule[];
}
export interface NotificationChannel {
  readonly channelId: string;
  readonly type: "email" | "sms" | "push" | "webhook" | "slack";
  readonly config: Record<string, unknown>;
  readonly enabled: boolean;
}
export interface NotificationTemplate {
  readonly templateId: string;
  readonly name: string;
  readonly subject: string;
  readonly body: string;
  readonly format: "text" | "html" | "markdown";
}
export interface NotificationRule {
  readonly ruleId: string;
  readonly event: string;
  readonly condition: string;
  readonly channels: string[];
  readonly template: string;
  readonly priority: ProtocolPriority;
}
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
export interface ValidationResult {
  readonly decision: ValidationDecision;
  readonly confidence: number;
  readonly riskScore: number;
  readonly trustScore: number;
  readonly qualityScore: number;
  readonly metadata: ValidationResultMetadata;
}
export declare enum ValidationDecision {
  APPROVED = "approved",
  DENIED = "denied",
  CONDITIONAL = "conditional",
  ESCALATED = "escalated",
  DEFERRED = "deferred",
  TIMEOUT = "timeout",
  ERROR = "error",
}
export interface ValidationResultMetadata {
  readonly validationMethod: string;
  readonly aiModel?: string;
  readonly humanReviewed: boolean;
  readonly automaticDecision: boolean;
  readonly reviewTime: number;
  readonly version: string;
}
export interface ValidationReasoning {
  readonly summary: string;
  readonly factors: ReasoningFactor[];
  readonly analysis: ReasoningAnalysis;
  readonly alternatives: ReasoningAlternative[];
}
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
export interface ReasoningAnalysis {
  readonly methodology: string;
  readonly assumptions: string[];
  readonly limitations: string[];
  readonly confidence: number;
  readonly bias: BiasAnalysis[];
}
export interface BiasAnalysis {
  readonly biasType: string;
  readonly description: string;
  readonly mitigation: string;
  readonly impact: "low" | "medium" | "high";
}
export interface ReasoningAlternative {
  readonly alternativeId: string;
  readonly description: string;
  readonly pros: string[];
  readonly cons: string[];
  readonly riskAssessment: number;
  readonly feasibility: number;
}
export interface ValidationEvidence {
  readonly sources: EvidenceSource[];
  readonly artifacts: EvidenceArtifact[];
  readonly references: EvidenceReference[];
  readonly verification: EvidenceVerification;
}
export interface EvidenceSource {
  readonly sourceId: string;
  readonly type: "system" | "human" | "external" | "historical";
  readonly credibility: number;
  readonly relevance: number;
  readonly timestamp: number;
  readonly data: Record<string, unknown>;
}
export interface EvidenceArtifact {
  readonly artifactId: string;
  readonly type: "log" | "screenshot" | "document" | "metric" | "trace";
  readonly format: string;
  readonly size: number;
  readonly checksum: string;
  readonly location: string;
}
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
export interface EvidenceVerification {
  readonly verified: boolean;
  readonly method: string;
  readonly timestamp: number;
  readonly verifier: string;
  readonly confidence: number;
}
export interface ValidationCondition {
  readonly conditionId: string;
  readonly type: ConditionType;
  readonly description: string;
  readonly required: boolean;
  readonly deadline?: number;
  readonly verification: ConditionVerification;
  readonly dependencies: string[];
}
export declare enum ConditionType {
  PREREQUISITE = "prerequisite",
  MONITORING = "monitoring",
  APPROVAL = "approval",
  VERIFICATION = "verification",
  NOTIFICATION = "notification",
  ROLLBACK = "rollback",
}
export interface ConditionVerification {
  readonly method: string;
  readonly criteria: Record<string, unknown>;
  readonly automated: boolean;
  readonly timeout: number;
  readonly retries: number;
}
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
export declare enum RecommendationType {
  SECURITY_IMPROVEMENT = "security_improvement",
  PERFORMANCE_OPTIMIZATION = "performance_optimization",
  COST_REDUCTION = "cost_reduction",
  RISK_MITIGATION = "risk_mitigation",
  COMPLIANCE_ENHANCEMENT = "compliance_enhancement",
  PROCESS_IMPROVEMENT = "process_improvement",
  TECHNOLOGY_UPGRADE = "technology_upgrade",
}
export interface RecommendationImplementation {
  readonly complexity: "low" | "medium" | "high" | "very_high";
  readonly effort: number;
  readonly cost: number;
  readonly timeline: number;
  readonly dependencies: string[];
  readonly risks: string[];
}
export interface RecommendationImpact {
  readonly security: "improved" | "neutral" | "degraded";
  readonly performance: "improved" | "neutral" | "degraded";
  readonly cost: "reduced" | "neutral" | "increased";
  readonly compliance: "improved" | "neutral" | "degraded";
  readonly risk: "reduced" | "neutral" | "increased";
  readonly quantified: QuantifiedImpact[];
}
export interface QuantifiedImpact {
  readonly metric: string;
  readonly baseline: number;
  readonly projected: number;
  readonly unit: string;
  readonly confidence: number;
}
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
export interface AuditActor {
  readonly actorId: string;
  readonly actorType: "user" | "system" | "service" | "admin";
  readonly identity: string;
  readonly roles: string[];
  readonly session?: string;
  readonly location?: string;
}
export interface AuditAction {
  readonly actionId: string;
  readonly actionType: string;
  readonly category: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  readonly classification: "normal" | "sensitive" | "critical";
}
export interface AuditOutcome {
  readonly result: "success" | "failure" | "partial" | "cancelled";
  readonly statusCode?: number;
  readonly message?: string;
  readonly duration: number;
  readonly resources: AuditResourceUsage;
}
export interface AuditResourceUsage {
  readonly cpu: number;
  readonly memory: number;
  readonly network: number;
  readonly storage: number;
  readonly duration: number;
}
export interface AuditContext {
  readonly requestId: string;
  readonly operationId: string;
  readonly sessionId: string;
  readonly traceId?: string;
  readonly parentId?: string;
  readonly correlationId?: string;
  readonly environment: string;
}
export interface AuditEvidence {
  readonly logs: string[];
  readonly artifacts: string[];
  readonly checksums: Record<string, string>;
  readonly signatures: string[];
  readonly witnesses?: string[];
}
export interface AuditIntegrity {
  readonly hash: string;
  readonly algorithm: string;
  readonly signature: string;
  readonly timestamp: number;
  readonly verified: boolean;
}
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
export interface ValidationResourceUsage {
  readonly cpu: number;
  readonly memory: number;
  readonly network: number;
  readonly storage: number;
  readonly apiCalls: number;
  readonly databaseQueries: number;
}
export interface ValidationSecurityResults {
  readonly securityScore: number;
  readonly threats: SecurityThreat[];
  readonly vulnerabilities: SecurityVulnerability[];
  readonly mitigations: SecurityMitigation[];
  readonly recommendations: SecurityRecommendation[];
}
export interface SecurityThreat {
  readonly threatId: string;
  readonly type: string;
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly probability: number;
  readonly impact: number;
  readonly description: string;
  readonly mitigation?: string;
}
export interface SecurityVulnerability {
  readonly vulnerabilityId: string;
  readonly type: string;
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly cvss?: number;
  readonly description: string;
  readonly remediation?: string;
  readonly timeline?: number;
}
export interface SecurityMitigation {
  readonly mitigationId: string;
  readonly type: string;
  readonly effectiveness: number;
  readonly cost: number;
  readonly complexity: "low" | "medium" | "high";
  readonly description: string;
}
export interface SecurityRecommendation {
  readonly recommendationId: string;
  readonly priority: ProtocolPriority;
  readonly category: string;
  readonly description: string;
  readonly implementation: string;
  readonly benefit: string;
}
export interface ValidationComplianceResults {
  readonly complianceScore: number;
  readonly frameworks: ComplianceFramework[];
  readonly violations: ComplianceViolation[];
  readonly attestations: ComplianceAttestation[];
  readonly certifications: ComplianceCertification[];
}
export interface ComplianceFramework {
  readonly frameworkId: string;
  readonly name: string;
  readonly version: string;
  readonly score: number;
  readonly requirements: ComplianceRequirement[];
}
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
export interface ComplianceViolation {
  readonly violationId: string;
  readonly framework: string;
  readonly requirement: string;
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly description: string;
  readonly remediation: string;
  readonly deadline?: number;
}
export interface ComplianceAttestation {
  readonly attestationId: string;
  readonly framework: string;
  readonly attestor: string;
  readonly timestamp: number;
  readonly period: number;
  readonly status: "active" | "expired" | "revoked";
  readonly evidence: string[];
}
export interface ComplianceCertification {
  readonly certificationId: string;
  readonly name: string;
  readonly issuer: string;
  readonly issuedDate: number;
  readonly expiryDate: number;
  readonly status: "active" | "expired" | "revoked" | "suspended";
  readonly scope: string[];
}
//# sourceMappingURL=parlant-streaming-integration.types.d.ts.map
