/**
 * Browser Orchestration Types
 *
 * Comprehensive type definitions for browser orchestration operations including
 * strategies, configurations, resources, tasks, and coordination patterns.
 *
 * Type Categories:
 * - Core Orchestration Types: Basic orchestration concepts and patterns
 * - Strategy Types: Coordination and distribution strategies
 * - Resource Types: Resource allocation and management
 * - Task Types: Distributed task definitions and execution
 * - Agent Types: Agent capabilities and coordination
 * - Session Types: Multi-agent session management
 * - Monitoring Types: Orchestration metrics and monitoring
 * - Configuration Types: Orchestration configuration schemas
 *
 * @module OrchestrationTypes
 * @version 1.0.0
 * @author Specialized API Security & Validation Agent
 * @since Browser Orchestration Security Implementation
 */

/**
 * Task priority levels for orchestration
 */
export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

/**
 * Coordination modes for multi-agent operations
 */
export enum CoordinationMode {
  SIMPLE = 'simple',              // Single coordinator, simple distribution
  PEER_TO_PEER = 'peer_to_peer',  // Agents coordinate directly with each other
  HIERARCHICAL = 'hierarchical',  // Tree-based coordination hierarchy
  CUSTOM = 'custom',              // Custom coordination logic
}

/**
 * Task distribution strategies
 */
export enum TaskDistributionStrategy {
  ROUND_ROBIN = 'round_robin',    // Distribute tasks in round-robin fashion
  WEIGHTED = 'weighted',          // Distribute based on agent capabilities
  PRIORITY = 'priority',          // Distribute based on task priority
  LOAD_BALANCED = 'load_balanced', // Distribute based on current load
  CUSTOM = 'custom',              // Custom distribution logic
}

/**
 * Agent capability types
 */
export enum AgentCapability {
  BROWSER_AUTOMATION = 'browser_automation',
  DATA_EXTRACTION = 'data_extraction',
  FORM_FILLING = 'form_filling',
  SCREENSHOT_CAPTURE = 'screenshot_capture',
  PERFORMANCE_MONITORING = 'performance_monitoring',
  SECURITY_SCANNING = 'security_scanning',
  API_TESTING = 'api_testing',
  LOAD_TESTING = 'load_testing',
  CUSTOM = 'custom',
}

/**
 * Orchestration execution status
 */
export enum OrchestrationStatus {
  PENDING = 'pending',
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TERMINATING = 'terminating',
}

/**
 * Agent status in orchestration
 */
export enum AgentStatus {
  IDLE = 'idle',
  ASSIGNED = 'assigned',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  UNAVAILABLE = 'unavailable',
  TERMINATED = 'terminated',
}

/**
 * Resource allocation and limits
 */
export interface ResourceLimits {
  maxMemoryGB: number;
  maxCpuCores: number;
  maxNetworkMBps: number;
  maxStorageGB: number;
  maxExecutionTimeMs: number;
}

/**
 * Current resource usage
 */
export interface ResourceUsage {
  memoryUsageGB: number;
  cpuUsagePercent: number;
  networkUsageMBps: number;
  storageUsageGB: number;
  executionTimeMs: number;
  lastUpdated: Date;
}

/**
 * Failover configuration
 */
export interface FailoverConfig {
  enabled: boolean;
  strategy: 'IMMEDIATE' | 'GRACEFUL' | 'MANUAL';
  timeoutMs: number;
  maxRetries: number;
  fallbackAgents?: string[];
  notificationChannels?: string[];
}

/**
 * Orchestration strategy configuration
 */
export interface OrchestrationStrategy {
  maxAgents: number;
  maxSessions: number;
  coordinationMode: CoordinationMode;
  taskDistribution: TaskDistributionStrategy;
  coordinationProtocol?: string;
  encryptedCommunication?: boolean;
  agentIsolation?: boolean;
  monitoringEnabled?: boolean;
  failoverConfig?: FailoverConfig;
  customDistributionLogic?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Agent configuration and capabilities
 */
export interface AgentConfig {
  agentId: string;
  name: string;
  capabilities: AgentCapability[];
  maxConcurrentTasks: number;
  resourceLimits: ResourceLimits;
  configuration: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  priority: number;
  healthCheckUrl?: string;
  shutdownTimeoutMs?: number;
}

/**
 * Agent runtime information
 */
export interface AgentInfo {
  config: AgentConfig;
  status: AgentStatus;
  currentLoad: number;
  resourceUsage: ResourceUsage;
  assignedTasks: string[];
  lastHeartbeat: Date;
  performanceMetrics: AgentPerformanceMetrics;
  errorHistory: AgentError[];
}

/**
 * Agent performance metrics
 */
export interface AgentPerformanceMetrics {
  tasksCompleted: number;
  tasksSuccessful: number;
  tasksFailed: number;
  averageTaskDurationMs: number;
  averageResourceUtilization: number;
  errorRate: number;
  throughputPerMinute: number;
  lastCalculated: Date;
}

/**
 * Agent error information
 */
export interface AgentError {
  timestamp: Date;
  errorType: string;
  errorMessage: string;
  taskId?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  resolved: boolean;
  context?: Record<string, unknown>;
}

/**
 * Distributed task definition
 */
export interface DistributedTask {
  taskId: string;
  name: string;
  description: string;
  priority: TaskPriority;
  actions: TaskAction[];
  dependencies: string[];
  metadata: Record<string, unknown>;
  resourceRequirements: Partial<ResourceLimits>;
  timeoutMs?: number;
  retryConfig?: TaskRetryConfig;
  validationRules?: TaskValidationRule[];
  expectedOutputs?: TaskOutput[];
}

/**
 * Task action definition
 */
export interface TaskAction {
  actionId: string;
  type: 'navigate' | 'click' | 'type' | 'extract' | 'screenshot' | 'wait' | 'custom';
  selector?: string;
  url?: string;
  text?: string;
  parameters?: Record<string, unknown>;
  waitTimeoutMs?: number;
  conditions?: ActionCondition[];
  expectedResults?: ActionResult[];
}

/**
 * Action condition
 */
export interface ActionCondition {
  type: 'ELEMENT_VISIBLE' | 'ELEMENT_CLICKABLE' | 'PAGE_LOADED' | 'CUSTOM';
  selector?: string;
  timeout?: number;
  customLogic?: string;
}

/**
 * Action result
 */
export interface ActionResult {
  type: 'SCREENSHOT' | 'TEXT' | 'HTML' | 'DATA' | 'METRIC';
  name: string;
  selector?: string;
  format?: string;
  validation?: string;
}

/**
 * Task retry configuration
 */
export interface TaskRetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
  retryConditions: string[];
  stopConditions: string[];
}

/**
 * Task validation rule
 */
export interface TaskValidationRule {
  type: 'RESULT_VALIDATION' | 'PERFORMANCE_VALIDATION' | 'SECURITY_VALIDATION';
  condition: string;
  expectedValue?: unknown;
  threshold?: number;
  message: string;
}

/**
 * Task output definition
 */
export interface TaskOutput {
  name: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'OBJECT' | 'ARRAY' | 'FILE';
  format?: string;
  validation?: string;
  required: boolean;
  description?: string;
}

/**
 * Task execution result
 */
export interface TaskExecutionResult {
  taskId: string;
  agentId: string;
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'CANCELLED';
  startTime: Date;
  endTime: Date;
  duration: number;
  outputs: Record<string, unknown>;
  errors: TaskExecutionError[];
  performance: TaskPerformanceMetrics;
  resourceUsage: ResourceUsage;
  metadata: Record<string, unknown>;
}

/**
 * Task execution error
 */
export interface TaskExecutionError {
  timestamp: Date;
  actionId?: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  recovery?: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Task performance metrics
 */
export interface TaskPerformanceMetrics {
  executionTimeMs: number;
  actionCount: number;
  successfulActions: number;
  failedActions: number;
  averageActionTime: number;
  throughputActionsPerSecond: number;
  errorRate: number;
  resourceEfficiency: number;
}

/**
 * Multi-agent session configuration
 */
export interface MultiAgentSession {
  sessionId: string;
  name: string;
  description: string;
  orchestrationConfig: OrchestrationConfig;
  agents: AgentInfo[];
  tasks: DistributedTask[];
  status: OrchestrationStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  resourceUsage: ResourceUsage;
  metrics: OrchestrationMetrics;
  events: OrchestrationEvent[];
  metadata: Record<string, unknown>;
}

/**
 * Orchestration configuration
 */
export interface OrchestrationConfig {
  strategy: OrchestrationStrategy;
  resourceLimits: ResourceLimits;
  tasks: DistributedTask[];
  agents: AgentConfig[];
  monitoringConfig?: OrchestrationMonitoringConfig;
  securityConfig?: OrchestrationSecurityConfig;
  notifications?: NotificationConfig;
  metadata?: Record<string, unknown>;
}

/**
 * Orchestration monitoring configuration
 */
export interface OrchestrationMonitoringConfig {
  enableMetrics: boolean;
  enableTracing: boolean;
  enableLogging: boolean;
  metricsInterval: number;
  alertThresholds: AlertThreshold[];
  dashboardConfig?: Record<string, unknown>;
  exportConfig?: MetricsExportConfig;
}

/**
 * Alert threshold configuration
 */
export interface AlertThreshold {
  metric: string;
  operator: 'GT' | 'LT' | 'EQ' | 'NE' | 'GTE' | 'LTE';
  value: number;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  description: string;
  actions: string[];
}

/**
 * Metrics export configuration
 */
export interface MetricsExportConfig {
  enabled: boolean;
  exportInterval: number;
  destinations: MetricsDestination[];
  format: 'JSON' | 'PROMETHEUS' | 'INFLUX' | 'CUSTOM';
  filters?: string[];
}

/**
 * Metrics destination
 */
export interface MetricsDestination {
  type: 'HTTP' | 'FILE' | 'DATABASE' | 'QUEUE';
  url?: string;
  authentication?: Record<string, unknown>;
  configuration: Record<string, unknown>;
}

/**
 * Orchestration security configuration
 */
export interface OrchestrationSecurityConfig {
  authenticationRequired: boolean;
  encryptionEnabled: boolean;
  accessControlLists: AccessControlEntry[];
  auditingEnabled: boolean;
  complianceProfiles: string[];
  securityScanInterval?: number;
  vulnerabilityThresholds?: Record<string, number>;
}

/**
 * Access control entry
 */
export interface AccessControlEntry {
  principal: string;
  principalType: 'USER' | 'GROUP' | 'SERVICE' | 'ROLE';
  permissions: string[];
  resources: string[];
  conditions?: AccessCondition[];
  expiresAt?: Date;
}

/**
 * Access condition
 */
export interface AccessCondition {
  type: 'IP_RANGE' | 'TIME_WINDOW' | 'GEOLOCATION' | 'CUSTOM';
  configuration: Record<string, unknown>;
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  templates: NotificationTemplate[];
  rules: NotificationRule[];
}

/**
 * Notification channel
 */
export interface NotificationChannel {
  channelId: string;
  type: 'EMAIL' | 'SLACK' | 'WEBHOOK' | 'SMS' | 'PUSH';
  configuration: Record<string, unknown>;
  enabled: boolean;
  priority: number;
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  templateId: string;
  name: string;
  eventTypes: string[];
  subject: string;
  body: string;
  format: 'TEXT' | 'HTML' | 'MARKDOWN';
  variables: string[];
}

/**
 * Notification rule
 */
export interface NotificationRule {
  ruleId: string;
  eventType: string;
  conditions: NotificationCondition[];
  channels: string[];
  templateId: string;
  enabled: boolean;
  priority: number;
}

/**
 * Notification condition
 */
export interface NotificationCondition {
  field: string;
  operator: 'EQ' | 'NE' | 'GT' | 'LT' | 'CONTAINS' | 'REGEX';
  value: unknown;
}

/**
 * Orchestration metrics
 */
export interface OrchestrationMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  activeAgents: number;
  averageTaskDuration: number;
  throughputTasksPerMinute: number;
  resourceUtilization: ResourceUtilizationMetrics;
  errorRate: number;
  successRate: number;
  performance: PerformanceMetrics;
  lastUpdated: Date;
}

/**
 * Resource utilization metrics
 */
export interface ResourceUtilizationMetrics {
  memoryUtilization: number;
  cpuUtilization: number;
  networkUtilization: number;
  storageUtilization: number;
  agentUtilization: number;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  errorRate: number;
  uptime: number;
  reliability: number;
}

/**
 * Orchestration event
 */
export interface OrchestrationEvent {
  eventId: string;
  timestamp: Date;
  eventType: 'ORCHESTRATION_STARTED' | 'ORCHESTRATION_COMPLETED' | 'TASK_ASSIGNED' | 'TASK_COMPLETED' | 'AGENT_ADDED' | 'AGENT_REMOVED' | 'ERROR_OCCURRED' | 'RESOURCE_THRESHOLD_EXCEEDED';
  source: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  details: Record<string, unknown>;
  correlationId?: string;
  tags?: string[];
}

/**
 * Orchestration scaling configuration
 */
export interface OrchestrationScalingConfig {
  autoScaling: boolean;
  minAgents: number;
  maxAgents: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
  scalingMetrics: string[];
  scalingPolicies: ScalingPolicy[];
}

/**
 * Scaling policy
 */
export interface ScalingPolicy {
  policyId: string;
  name: string;
  metric: string;
  threshold: number;
  action: 'SCALE_UP' | 'SCALE_DOWN';
  adjustment: number;
  adjustmentType: 'ABSOLUTE' | 'PERCENTAGE';
  cooldown: number;
  enabled: boolean;
}

/**
 * Orchestration deployment configuration
 */
export interface OrchestrationDeployment {
  deploymentId: string;
  name: string;
  version: string;
  environment: 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';
  region: string;
  configuration: OrchestrationConfig;
  scaling: OrchestrationScalingConfig;
  networking: NetworkingConfig;
  security: SecurityDeploymentConfig;
  monitoring: MonitoringDeploymentConfig;
  status: 'DEPLOYING' | 'ACTIVE' | 'UPDATING' | 'TERMINATING' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

/**
 * Networking configuration
 */
export interface NetworkingConfig {
  vpcId?: string;
  subnetIds?: string[];
  securityGroupIds?: string[];
  loadBalancer?: LoadBalancerConfig;
  dns?: DnsConfig;
  ssl?: SslConfig;
}

/**
 * Load balancer configuration
 */
export interface LoadBalancerConfig {
  enabled: boolean;
  type: 'APPLICATION' | 'NETWORK' | 'CLASSIC';
  algorithm: 'ROUND_ROBIN' | 'LEAST_CONNECTIONS' | 'WEIGHTED' | 'IP_HASH';
  healthCheck: HealthCheckConfig;
  stickySession: boolean;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  enabled: boolean;
  path: string;
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
  expectedCodes: number[];
}

/**
 * DNS configuration
 */
export interface DnsConfig {
  domain: string;
  hostedZoneId?: string;
  recordType: 'A' | 'CNAME' | 'ALIAS';
  ttl: number;
  healthCheck?: boolean;
}

/**
 * SSL configuration
 */
export interface SslConfig {
  enabled: boolean;
  certificateArn?: string;
  certificatePath?: string;
  keyPath?: string;
  protocols: string[];
  ciphers: string[];
  redirectHttpToHttps: boolean;
}

/**
 * Security deployment configuration
 */
export interface SecurityDeploymentConfig {
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  secretsManagement: SecretsManagementConfig;
  networkSecurity: NetworkSecurityConfig;
  accessLogging: boolean;
  vulnerabilityScanning: boolean;
  complianceChecks: string[];
}

/**
 * Secrets management configuration
 */
export interface SecretsManagementConfig {
  provider: 'AWS_SECRETS_MANAGER' | 'HASHICORP_VAULT' | 'KUBERNETES_SECRETS' | 'AZURE_KEY_VAULT';
  region?: string;
  keyId?: string;
  rotationEnabled: boolean;
  rotationSchedule?: string;
}

/**
 * Network security configuration
 */
export interface NetworkSecurityConfig {
  firewallEnabled: boolean;
  allowedCidrs: string[];
  blockedCidrs: string[];
  intrusion Detection: boolean;
  ddosProtection: boolean;
  webApplicationFirewall: boolean;
}

/**
 * Monitoring deployment configuration
 */
export interface MonitoringDeploymentConfig {
  logging: LoggingConfig;
  metrics: MetricsConfig;
  tracing: TracingConfig;
  alerting: AlertingConfig;
  dashboards: DashboardConfig[];
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  enabled: boolean;
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  destination: 'STDOUT' | 'FILE' | 'CLOUDWATCH' | 'ELASTICSEARCH' | 'CUSTOM';
  retention: number;
  format: 'JSON' | 'TEXT' | 'STRUCTURED';
  includeMetadata: boolean;
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  enabled: boolean;
  provider: 'PROMETHEUS' | 'CLOUDWATCH' | 'DATADOG' | 'NEW_RELIC' | 'CUSTOM';
  scrapeInterval: number;
  retention: number;
  customMetrics: CustomMetric[];
}

/**
 * Custom metric definition
 */
export interface CustomMetric {
  name: string;
  type: 'COUNTER' | 'GAUGE' | 'HISTOGRAM' | 'SUMMARY';
  description: string;
  labels: string[];
  buckets?: number[];
}

/**
 * Tracing configuration
 */
export interface TracingConfig {
  enabled: boolean;
  provider: 'JAEGER' | 'ZIPKIN' | 'AWS_XRAY' | 'DATADOG' | 'CUSTOM';
  samplingRate: number;
  endpoint?: string;
  serviceName: string;
}

/**
 * Alerting configuration
 */
export interface AlertingConfig {
  enabled: boolean;
  provider: 'PROMETHEUS_ALERTMANAGER' | 'CLOUDWATCH_ALARMS' | 'PAGERDUTY' | 'CUSTOM';
  rules: AlertRule[];
  silencing: SilencingConfig;
  escalation: EscalationConfig;
}

/**
 * Alert rule
 */
export interface AlertRule {
  ruleId: string;
  name: string;
  query: string;
  threshold: number;
  operator: 'GT' | 'LT' | 'EQ' | 'NE';
  duration: number;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  labels: Record<string, string>;
  annotations: Record<string, string>;
}

/**
 * Silencing configuration
 */
export interface SilencingConfig {
  enabled: boolean;
  defaultDuration: number;
  autoSilencing: boolean;
  silencingRules: SilencingRule[];
}

/**
 * Silencing rule
 */
export interface SilencingRule {
  ruleId: string;
  matchers: Record<string, string>;
  duration: number;
  reason: string;
  enabled: boolean;
}

/**
 * Escalation configuration
 */
export interface EscalationConfig {
  enabled: boolean;
  policies: EscalationPolicy[];
  defaultPolicy: string;
}

/**
 * Escalation policy
 */
export interface EscalationPolicy {
  policyId: string;
  name: string;
  levels: EscalationLevel[];
  repeatInterval?: number;
  maxEscalations?: number;
}

/**
 * Escalation level
 */
export interface EscalationLevel {
  level: number;
  delay: number;
  targets: EscalationTarget[];
  stopOnAcknowledge: boolean;
}

/**
 * Escalation target
 */
export interface EscalationTarget {
  type: 'USER' | 'GROUP' | 'SERVICE' | 'WEBHOOK';
  identifier: string;
  configuration?: Record<string, unknown>;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  dashboardId: string;
  name: string;
  description: string;
  panels: DashboardPanel[];
  layout: DashboardLayout;
  refresh: number;
  timeRange: TimeRange;
  variables: DashboardVariable[];
}

/**
 * Dashboard panel
 */
export interface DashboardPanel {
  panelId: string;
  title: string;
  type: 'GRAPH' | 'TABLE' | 'STAT' | 'GAUGE' | 'HEATMAP' | 'TEXT';
  query: string;
  position: PanelPosition;
  size: PanelSize;
  configuration: Record<string, unknown>;
}

/**
 * Dashboard layout
 */
export interface DashboardLayout {
  type: 'GRID' | 'FLOW' | 'CUSTOM';
  columns: number;
  rowHeight: number;
  margins: Margins;
}

/**
 * Time range
 */
export interface TimeRange {
  from: string;
  to: string;
  refresh: string;
}

/**
 * Dashboard variable
 */
export interface DashboardVariable {
  name: string;
  type: 'QUERY' | 'CONSTANT' | 'INTERVAL' | 'DATASOURCE';
  query?: string;
  value?: string;
  options?: VariableOption[];
}

/**
 * Variable option
 */
export interface VariableOption {
  text: string;
  value: string;
  selected: boolean;
}

/**
 * Panel position
 */
export interface PanelPosition {
  x: number;
  y: number;
}

/**
 * Panel size
 */
export interface PanelSize {
  width: number;
  height: number;
}

/**
 * Margins
 */
export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Orchestration template
 */
export interface OrchestrationTemplate {
  templateId: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  configuration: OrchestrationConfig;
  variables: TemplateVariable[];
  constraints: TemplateConstraint[];
  documentation: string;
  examples: TemplateExample[];
  createdAt: Date;
  updatedAt: Date;
  author: string;
  deprecated: boolean;
}

/**
 * Template variable
 */
export interface TemplateVariable {
  name: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';
  description: string;
  defaultValue?: unknown;
  required: boolean;
  validation?: string;
  options?: unknown[];
}

/**
 * Template constraint
 */
export interface TemplateConstraint {
  type: 'RESOURCE' | 'AGENT' | 'TASK' | 'SECURITY' | 'CUSTOM';
  condition: string;
  message: string;
  severity: 'WARNING' | 'ERROR';
}

/**
 * Template example
 */
export interface TemplateExample {
  name: string;
  description: string;
  variables: Record<string, unknown>;
  expectedOutput: string;
}

/**
 * Orchestration execution plan
 */
export interface OrchestrationExecutionPlan {
  planId: string;
  sessionId: string;
  phases: ExecutionPhase[];
  dependencies: PlanDependency[];
  resourceAllocation: PlannedResourceAllocation[];
  timeline: ExecutionTimeline;
  riskAssessment: PlanRiskAssessment;
  alternatives: AlternativePlan[];
  metadata: Record<string, unknown>;
}

/**
 * Execution phase
 */
export interface ExecutionPhase {
  phaseId: string;
  name: string;
  description: string;
  order: number;
  tasks: string[];
  agents: string[];
  estimatedDuration: number;
  dependencies: string[];
  conditions: PhaseCondition[];
  rollbackPlan?: RollbackPlan;
}

/**
 * Phase condition
 */
export interface PhaseCondition {
  type: 'PREREQUISITE' | 'RESOURCE_AVAILABILITY' | 'CUSTOM';
  condition: string;
  required: boolean;
}

/**
 * Rollback plan
 */
export interface RollbackPlan {
  enabled: boolean;
  triggers: string[];
  steps: RollbackStep[];
  timeoutMs: number;
  notification: boolean;
}

/**
 * Rollback step
 */
export interface RollbackStep {
  stepId: string;
  action: string;
  parameters: Record<string, unknown>;
  order: number;
  critical: boolean;
}

/**
 * Plan dependency
 */
export interface PlanDependency {
  dependencyId: string;
  source: string;
  target: string;
  type: 'SEQUENCE' | 'RESOURCE' | 'DATA' | 'SYNCHRONIZATION';
  condition?: string;
  optional: boolean;
}

/**
 * Planned resource allocation
 */
export interface PlannedResourceAllocation {
  phaseId: string;
  agentId: string;
  resources: ResourceLimits;
  startTime: Date;
  endTime: Date;
  priority: number;
  reservationId?: string;
}

/**
 * Execution timeline
 */
export interface ExecutionTimeline {
  totalDuration: number;
  phases: PhaseTimeline[];
  criticalPath: string[];
  bufferTime: number;
  dependencies: TimelineDependency[];
}

/**
 * Phase timeline
 */
export interface PhaseTimeline {
  phaseId: string;
  startOffset: number;
  duration: number;
  endOffset: number;
  parallelPhases: string[];
}

/**
 * Timeline dependency
 */
export interface TimelineDependency {
  source: string;
  target: string;
  delay: number;
  type: 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH' | 'START_TO_FINISH';
}

/**
 * Plan risk assessment
 */
export interface PlanRiskAssessment {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: PlanRiskFactor[];
  mitigationStrategies: MitigationStrategy[];
  contingencyPlans: ContingencyPlan[];
  successProbability: number;
}

/**
 * Plan risk factor
 */
export interface PlanRiskFactor {
  factor: string;
  category: 'RESOURCE' | 'TECHNICAL' | 'OPERATIONAL' | 'EXTERNAL';
  probability: number;
  impact: number;
  riskScore: number;
  description: string;
}

/**
 * Mitigation strategy
 */
export interface MitigationStrategy {
  strategyId: string;
  riskFactors: string[];
  approach: string;
  implementation: string;
  effectiveness: number;
  cost: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Contingency plan
 */
export interface ContingencyPlan {
  planId: string;
  trigger: string;
  alternatives: AlternativePlan[];
  activationCriteria: string[];
  deactivationCriteria: string[];
  resources: ResourceLimits;
}

/**
 * Alternative plan
 */
export interface AlternativePlan {
  planId: string;
  name: string;
  description: string;
  configuration: Partial<OrchestrationConfig>;
  tradeoffs: PlanTradeoff[];
  viability: number;
  cost: number;
}

/**
 * Plan tradeoff
 */
export interface PlanTradeoff {
  aspect: 'PERFORMANCE' | 'COST' | 'RELIABILITY' | 'COMPLEXITY' | 'SECURITY';
  description: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  magnitude: number;
}

// Export all types for use in other modules
export type {
  ResourceLimits,
  ResourceUsage,
  FailoverConfig,
  OrchestrationStrategy,
  AgentConfig,
  AgentInfo,
  AgentPerformanceMetrics,
  AgentError,
  DistributedTask,
  TaskAction,
  ActionCondition,
  ActionResult,
  TaskRetryConfig,
  TaskValidationRule,
  TaskOutput,
  TaskExecutionResult,
  TaskExecutionError,
  TaskPerformanceMetrics,
  MultiAgentSession,
  OrchestrationConfig,
  OrchestrationMonitoringConfig,
  AlertThreshold,
  MetricsExportConfig,
  MetricsDestination,
  OrchestrationSecurityConfig,
  AccessControlEntry,
  AccessCondition,
  NotificationConfig,
  NotificationChannel,
  NotificationTemplate,
  NotificationRule,
  NotificationCondition,
  OrchestrationMetrics,
  ResourceUtilizationMetrics,
  PerformanceMetrics,
  OrchestrationEvent,
  OrchestrationScalingConfig,
  ScalingPolicy,
  OrchestrationDeployment,
  NetworkingConfig,
  LoadBalancerConfig,
  HealthCheckConfig,
  DnsConfig,
  SslConfig,
  SecurityDeploymentConfig,
  SecretsManagementConfig,
  NetworkSecurityConfig,
  MonitoringDeploymentConfig,
  LoggingConfig,
  MetricsConfig,
  CustomMetric,
  TracingConfig,
  AlertingConfig,
  AlertRule,
  SilencingConfig,
  SilencingRule,
  EscalationConfig,
  EscalationPolicy,
  EscalationLevel,
  EscalationTarget,
  DashboardConfig,
  DashboardPanel,
  DashboardLayout,
  TimeRange,
  DashboardVariable,
  VariableOption,
  PanelPosition,
  PanelSize,
  Margins,
  OrchestrationTemplate,
  TemplateVariable,
  TemplateConstraint,
  TemplateExample,
  OrchestrationExecutionPlan,
  ExecutionPhase,
  PhaseCondition,
  RollbackPlan,
  RollbackStep,
  PlanDependency,
  PlannedResourceAllocation,
  ExecutionTimeline,
  PhaseTimeline,
  TimelineDependency,
  PlanRiskAssessment,
  PlanRiskFactor,
  MitigationStrategy,
  ContingencyPlan,
  AlternativePlan,
  PlanTradeoff,
};