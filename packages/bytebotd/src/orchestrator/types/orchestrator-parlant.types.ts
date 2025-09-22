/**
 * Orchestrator PARLANT Integration Types
 *
 * Comprehensive type definitions for multi-service orchestration validation
 * integrating PARLANT conversational AI validation across service coordination,
 * load balancing, health management, configuration, and API gateway operations.
 *
 * Type Categories:
 * - Multi-Service Workflow Validation: Cross-service transaction validation
 * - Resource Allocation Validation: Approval workflows for resource changes
 * - Failover Decision Support: Conversational approval for critical decisions
 * - Configuration Management: System-wide change validation
 * - API Gateway Integration: Request routing and authentication validation
 *
 * @module OrchestratorParlantTypes
 * @version 1.0.0
 * @author Specialized Multi-Service Orchestration Agent
 * @since Orchestrator PARLANT Integration Implementation
 */

import { RiskLevel } from '../../parlant/parlant-integration.service';
import {
  OrchestrationStatus,
  ResourceLimits,
  ResourceUsage,
} from '../../browser-use/types/orchestration.types'; /*** Multi-service workflow definition with validation checkpoints
 */
export interface MultiServiceWorkflow {
  workflowId: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  validationRequirements: WorkflowValidationRequirement[];
  riskAssessment: WorkflowRiskAssessment;
  approvalThresholds: ApprovalThreshold[];
  rollbackStrategy: WorkflowRollbackStrategy;
  metadata: Record<string, unknown>;
}

/**
 * Individual workflow step with service targeting
 */
export interface WorkflowStep {
  stepId: string;
  name: string;
  targetService: string;
  operation: string;
  parameters: Record<string, unknown>;
  dependencies: string[];
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  approvalCriteria: ApprovalCriteria;
  businessImpact: BusinessImpactAssessment;
  executionTimeout: number;
  retryPolicy: StepRetryPolicy;
}

/**
 * Workflow validation requirements
 */
export interface WorkflowValidationRequirement {
  requirementId: string;
  type:
    | 'CROSS_SERVICE_TRANSACTION'
    | 'RESOURCE_ALLOCATION'
    | 'SECURITY_CHECKPOINT'
    | 'BUSINESS_APPROVAL';
  condition: string;
  validationLevel: 'BASIC' | 'COMPREHENSIVE' | 'ENTERPRISE';
  approvalRequired: boolean;
  conversationalPrompt?: string;
  escalationPath?: string[];
}

/**
 * Workflow risk assessment
 */
export interface WorkflowRiskAssessment {
  overallRisk: RiskLevel;
  riskFactors: WorkflowRiskFactor[];
  mitigationStrategies: string[];
  businessImpactScore: number;
  technicalComplexityScore: number;
  operationalRiskScore: number;
  complianceRequirements: string[];
}

/**
 * Workflow risk factor
 */
export interface WorkflowRiskFactor {
  factor: string;
  category:
    | 'TECHNICAL'
    | 'BUSINESS'
    | 'OPERATIONAL'
    | 'SECURITY'
    | 'COMPLIANCE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  likelihood: number;
  impact: number;
  mitigation: string;
}

/**
 * Approval threshold configuration
 */
export interface ApprovalThreshold {
  thresholdId: string;
  metric: string;
  operator: 'GT' | 'LT' | 'EQ' | 'GTE' | 'LTE';
  value: number;
  approvalLevel: 'AUTOMATIC' | 'SUPERVISOR' | 'MANAGER' | 'EXECUTIVE';
  conversationalValidation: boolean;
  timeoutMinutes: number;
}

/**
 * Workflow rollback strategy
 */
export interface WorkflowRollbackStrategy {
  enabled: boolean;
  automaticTriggers: string[];
  rollbackSteps: RollbackStep[];
  compensationActions: CompensationAction[];
  dataRecoveryPlan: DataRecoveryPlan;
  notificationPlan: NotificationPlan;
}

/**
 * Rollback step definition
 */
export interface RollbackStep {
  stepId: string;
  targetService: string;
  action: string;
  parameters: Record<string, unknown>;
  order: number;
  critical: boolean;
  timeoutSeconds: number;
  successCriteria: string[];
}

/**
 * Compensation action for failed operations
 */
export interface CompensationAction {
  actionId: string;
  description: string;
  triggerCondition: string;
  compensationLogic: string;
  rollbackOnFailure: boolean;
  notifyStakeholders: boolean;
}

/**
 * Data recovery plan
 */
export interface DataRecoveryPlan {
  enabled: boolean;
  backupSources: string[];
  recoveryProcedures: RecoveryProcedure[];
  validationSteps: string[];
  recoveryTimeObjective: number;
  recoveryPointObjective: number;
}

/**
 * Recovery procedure
 */
export interface RecoveryProcedure {
  procedureId: string;
  name: string;
  steps: string[];
  automationLevel: 'MANUAL' | 'SEMI_AUTOMATIC' | 'AUTOMATIC';
  estimatedDuration: number;
  prerequisites: string[];
}

/**
 * Notification plan
 */
export interface NotificationPlan {
  channels: NotificationChannel[];
  escalationMatrix: EscalationMatrix;
  messageTemplates: MessageTemplate[];
  urgencyLevels: UrgencyLevel[];
}

/**
 * Notification channel
 */
export interface NotificationChannel {
  channelId: string;
  type: 'EMAIL' | 'SLACK' | 'SMS' | 'WEBHOOK' | 'DASHBOARD';
  configuration: Record<string, unknown>;
  enabled: boolean;
  priority: number;
}

/**
 * Escalation matrix
 */
export interface EscalationMatrix {
  levels: EscalationLevel[];
  timeoutMinutes: number[];
  recipients: string[][];
  conditions: string[];
}

/**
 * Escalation level
 */
export interface EscalationLevel {
  level: number;
  name: string;
  description: string;
  recipients: string[];
  timeoutMinutes: number;
  approvalRequired: boolean;
}

/**
 * Message template
 */
export interface MessageTemplate {
  templateId: string;
  eventType: string;
  subject: string;
  body: string;
  format: 'TEXT' | 'HTML' | 'MARKDOWN';
  variables: string[];
}

/**
 * Urgency level
 */
export interface UrgencyLevel {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  responseTimeMinutes: number;
  escalationEnabled: boolean;
  conversationalApproval: boolean;
}

/**
 * Approval criteria for workflow steps
 */
export interface ApprovalCriteria {
  automatic: AutomaticApprovalCriteria;
  manual: ManualApprovalCriteria;
  conversational: ConversationalApprovalCriteria;
  businessRules: BusinessRule[];
}

/**
 * Automatic approval criteria
 */
export interface AutomaticApprovalCriteria {
  enabled: boolean;
  conditions: string[];
  riskLevelThreshold: RiskLevel;
  resourceImpactThreshold: number;
  businessImpactThreshold: number;
  complianceChecks: string[];
}

/**
 * Manual approval criteria
 */
export interface ManualApprovalCriteria {
  required: boolean;
  approverRoles: string[];
  minimumApprovers: number;
  timeoutMinutes: number;
  fallbackBehavior: 'DENY' | 'APPROVE' | 'ESCALATE';
  documentationRequired: boolean;
}

/**
 * Conversational approval criteria
 */
export interface ConversationalApprovalCriteria {
  enabled: boolean;
  parlantSessionId?: string;
  validationPrompts: ValidationPrompt[];
  confidenceThreshold: number;
  fallbackToManual: boolean;
  contextEnrichment: ContextEnrichment;
}

/**
 * Validation prompt for conversational approval
 */
export interface ValidationPrompt {
  promptId: string;
  text: string;
  expectedResponses: string[];
  contextVariables: string[];
  validationLogic: string;
  weight: number;
}

/**
 * Context enrichment for conversational validation
 */
export interface ContextEnrichment {
  includeSystemState: boolean;
  includeResourceMetrics: boolean;
  includeRecentEvents: boolean;
  includeUserHistory: boolean;
  customContext: Record<string, unknown>;
}

/**
 * Business rule for approval decisions
 */
export interface BusinessRule {
  ruleId: string;
  name: string;
  condition: string;
  action: 'APPROVE' | 'DENY' | 'ESCALATE' | 'REQUEST_INFO';
  priority: number;
  active: boolean;
  metadata: Record<string, unknown>;
}

/**
 * Business impact assessment
 */
export interface BusinessImpactAssessment {
  financialImpact: FinancialImpact;
  operationalImpact: OperationalImpact;
  complianceImpact: ComplianceImpact;
  customerImpact: CustomerImpact;
  reputationalImpact: ReputationalImpact;
}

/**
 * Financial impact assessment
 */
export interface FinancialImpact {
  estimatedCost: number;
  revenueAtRisk: number;
  budgetCategory: string;
  approvalRequired: boolean;
  justification: string;
}

/**
 * Operational impact assessment
 */
export interface OperationalImpact {
  serviceDowntime: number;
  performanceImpact: number;
  resourceUtilization: number;
  affectedServices: string[];
  recoveryTime: number;
}

/**
 * Compliance impact assessment
 */
export interface ComplianceImpact {
  complianceFrameworks: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  auditRequirements: string[];
  documentationNeeded: boolean;
  signoffRequired: boolean;
}

/**
 * Customer impact assessment
 */
export interface CustomerImpact {
  affectedCustomers: number;
  severityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  communicationRequired: boolean;
  compensationNeeded: boolean;
  escalationPath: string[];
}

/**
 * Reputational impact assessment
 */
export interface ReputationalImpact {
  publicVisibility: 'LOW' | 'MEDIUM' | 'HIGH';
  mediaAttention: boolean;
  brandRisk: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  stakeholderConcern: boolean;
  mitigationStrategy: string;
}

/**
 * Step retry policy
 */
export interface StepRetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  retryDelay: number;
  backoffStrategy: 'LINEAR' | 'EXPONENTIAL' | 'FIXED';
  retryConditions: string[];
  stopConditions: string[];
}

/**
 * Orchestration context for multi-service coordination
 */
export interface OrchestrationContext {
  contextId: string;
  userId: string;
  sessionId: string;
  workflowId: string;
  currentStep: string;
  executionState: OrchestrationExecutionState;
  serviceStates: ServiceState[];
  resourceAllocations: ResourceAllocation[];
  validationHistory: ValidationHistoryEntry[];
  conversationalContext: ConversationalContext;
}

/**
 * Orchestration execution state
 */
export interface OrchestrationExecutionState {
  status: OrchestrationStatus;
  currentPhase: string;
  completedSteps: string[];
  failedSteps: string[];
  pendingApprovals: PendingApproval[];
  rollbackInitiated: boolean;
  lastError?: OrchestrationError;
}

/**
 * Service state within orchestration
 */
export interface ServiceState {
  serviceId: string;
  serviceName: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  version: string;
  resourceUsage: ResourceUsage;
  lastHealthCheck: Date;
  dependencyStatus: DependencyStatus[];
  operationalMetrics: OperationalMetrics;
}

/**
 * Resource allocation tracking
 */
export interface ResourceAllocation {
  allocationId: string;
  serviceId: string;
  resourceType: 'CPU' | 'MEMORY' | 'STORAGE' | 'NETWORK' | 'CUSTOM';
  allocated: number;
  used: number;
  reserved: number;
  limits: ResourceLimits;
  allocationTime: Date;
  expirationTime?: Date;
}

/**
 * Validation history entry
 */
export interface ValidationHistoryEntry {
  entryId: string;
  timestamp: Date;
  stepId: string;
  validationType: 'AUTOMATIC' | 'MANUAL' | 'CONVERSATIONAL';
  result: 'APPROVED' | 'DENIED' | 'PENDING' | 'TIMEOUT';
  approver?: string;
  reasoning: string;
  confidence?: number;
  duration: number;
}

/**
 * Conversational context for PARLANT integration
 */
export interface ConversationalContext {
  parlantSessionId: string;
  conversationId: string;
  messageHistory: ConversationMessage[];
  currentIntent: string;
  confidence: number;
  validationState: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  approvalQueue: ApprovalRequest[];
}

/**
 * Conversation message
 */
export interface ConversationMessage {
  messageId: string;
  timestamp: Date;
  sender: 'USER' | 'SYSTEM' | 'PARLANT' | 'ORCHESTRATOR';
  content: string;
  messageType:
    | 'VALIDATION_REQUEST'
    | 'APPROVAL_REQUEST'
    | 'STATUS_UPDATE'
    | 'ERROR_NOTIFICATION';
  metadata: Record<string, unknown>;
}

/**
 * Approval request
 */
export interface ApprovalRequest {
  requestId: string;
  workflowId: string;
  stepId: string;
  description: string;
  requestedBy: string;
  requestTime: Date;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  approvalType: 'AUTOMATIC' | 'MANUAL' | 'CONVERSATIONAL';
  businessJustification: string;
  riskAssessment: WorkflowRiskAssessment;
  estimatedImpact: BusinessImpactAssessment;
  timeoutMinutes: number;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'TIMEOUT' | 'CANCELLED';
  approver?: string;
  approvalTime?: Date;
  reasoning?: string;
  conditions?: ApprovalCondition[];
}

/**
 * Approval condition
 */
export interface ApprovalCondition {
  conditionId: string;
  description: string;
  type: 'MONITORING' | 'ROLLBACK_TRIGGER' | 'RESOURCE_LIMIT' | 'TIME_LIMIT';
  parameters: Record<string, unknown>;
  mandatory: boolean;
}

/**
 * Pending approval tracking
 */
export interface PendingApproval {
  approvalId: string;
  workflowId: string;
  stepId: string;
  requestedAt: Date;
  timeoutAt: Date;
  approverRole: string;
  approverUserId?: string;
  escalationLevel: number;
  businessJustification: string;
  conversationalPrompt?: string;
  parlantValidationId?: string;
}

/**
 * Orchestration error
 */
export interface OrchestrationError {
  errorId: string;
  timestamp: Date;
  errorType:
    | 'VALIDATION_FAILED'
    | 'APPROVAL_TIMEOUT'
    | 'SERVICE_FAILURE'
    | 'RESOURCE_EXHAUSTED'
    | 'BUSINESS_RULE_VIOLATION';
  message: string;
  details: Record<string, unknown>;
  affectedServices: string[];
  recoveryActions: string[];
  escalationRequired: boolean;
}

/**
 * Dependency status
 */
export interface DependencyStatus {
  dependencyId: string;
  dependencyType: 'SERVICE' | 'DATABASE' | 'EXTERNAL_API' | 'RESOURCE';
  status: 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
  responseTime: number;
  lastChecked: Date;
  errorRate: number;
}

/**
 * Operational metrics
 */
export interface OperationalMetrics {
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  successRate: number;
  throughput: number;
  concurrentUsers: number;
  resourceEfficiency: number;
  lastUpdated: Date;
}

/**
 * Workflow validation result
 */
export interface WorkflowValidationResult {
  validationId: string;
  workflowId: string;
  timestamp: Date;
  approved: boolean;
  validatedSteps: ValidationStep[];
  overallRisk: RiskLevel;
  totalEstimatedTime: number;
  resourceRequirements: ResourceRequirement[];
  businessApprovalRequired: boolean;
  technicalApprovalRequired: boolean;
  complianceApprovalRequired: boolean;
  haltedAt?: string;
  reasoning: string;
  recommendations: string[];
  nextActions: string[];
}

/**
 * Validation step result
 */
export interface ValidationStep {
  stepId: string;
  approved: boolean;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
  approvalType: 'AUTOMATIC' | 'MANUAL' | 'CONVERSATIONAL';
  businessImpact: BusinessImpactAssessment;
  technicalFeasibility: TechnicalFeasibility;
  complianceStatus: ComplianceStatus;
  estimatedDuration: number;
  resourceImpact: ResourceImpact;
  dependencies: string[];
  reasoning: string;
  validationTimestamp: Date;
}

/**
 * Technical feasibility assessment
 */
export interface TechnicalFeasibility {
  feasible: boolean;
  confidence: number;
  technicalRisks: string[];
  resourceRequirements: ResourceRequirement[];
  implementationComplexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  estimatedEffort: number;
  prerequisites: string[];
}

/**
 * Compliance status
 */
export interface ComplianceStatus {
  compliant: boolean;
  framework: string;
  requirements: ComplianceRequirement[];
  violations: ComplianceViolation[];
  remediation: string[];
  signoffRequired: boolean;
}

/**
 * Compliance requirement
 */
export interface ComplianceRequirement {
  requirementId: string;
  framework: string;
  description: string;
  mandatory: boolean;
  status: 'MET' | 'NOT_MET' | 'PARTIALLY_MET' | 'NOT_APPLICABLE';
  evidence: string[];
}

/**
 * Compliance violation
 */
export interface ComplianceViolation {
  violationId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  requirement: string;
  remediation: string;
  timeToFix: number;
}

/**
 * Resource impact assessment
 */
export interface ResourceImpact {
  cpuImpact: number;
  memoryImpact: number;
  storageImpact: number;
  networkImpact: number;
  customResources: CustomResourceImpact[];
  peakUsage: ResourceUsage;
  sustainedUsage: ResourceUsage;
}

/**
 * Custom resource impact
 */
export interface CustomResourceImpact {
  resourceType: string;
  impact: number;
  unit: string;
  description: string;
}

/**
 * Resource requirement
 */
export interface ResourceRequirement {
  resourceType: 'CPU' | 'MEMORY' | 'STORAGE' | 'NETWORK' | 'CUSTOM';
  amount: number;
  unit: string;
  duration: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  justification: string;
}

/**
 * Multi-service coordination configuration
 */
export interface MultiServiceCoordinationConfig {
  coordinationId: string;
  name: string;
  description: string;
  services: ServiceCoordinationConfig[];
  validationRules: CoordinationValidationRule[];
  approvalWorkflows: ApprovalWorkflowConfig[];
  monitoringConfig: CoordinationMonitoringConfig;
  failureHandling: FailureHandlingConfig;
  performanceTargets: PerformanceTargets;
}

/**
 * Service coordination configuration
 */
export interface ServiceCoordinationConfig {
  serviceId: string;
  serviceName: string;
  role: 'PRIMARY' | 'SECONDARY' | 'SUPPORT' | 'MONITORING';
  dependencies: string[];
  communicationProtocol: 'HTTP' | 'GRPC' | 'MESSAGING' | 'WEBSOCKET';
  endpoints: ServiceEndpoint[];
  healthChecks: HealthCheckConfig[];
  circuitBreaker: CircuitBreakerConfig;
  retryPolicy: RetryPolicyConfig;
}

/**
 * Service endpoint configuration
 */
export interface ServiceEndpoint {
  endpointId: string;
  path: string;
  method: string;
  purpose: string;
  validationRequired: boolean;
  approvalRequired: boolean;
  riskLevel: RiskLevel;
  rateLimiting: RateLimitingConfig;
  authentication: AuthenticationConfig;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  checkId: string;
  type: 'BASIC' | 'DETAILED' | 'COMPREHENSIVE';
  interval: number;
  timeout: number;
  retries: number;
  successCriteria: string[];
  failureCriteria: string[];
  escalationOnFailure: boolean;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  fallbackStrategy:
    | 'FAIL_FAST'
    | 'GRACEFUL_DEGRADATION'
    | 'ALTERNATIVE_SERVICE';
  monitoringEnabled: boolean;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicyConfig {
  enabled: boolean;
  maxAttempts: number;
  initialDelay: number;
  backoffStrategy: 'LINEAR' | 'EXPONENTIAL' | 'FIXED';
  jitter: boolean;
  retryableErrors: string[];
  nonRetryableErrors: string[];
}

/**
 * Rate limiting configuration
 */
export interface RateLimitingConfig {
  enabled: boolean;
  requestsPerSecond: number;
  burstCapacity: number;
  algorithm: 'TOKEN_BUCKET' | 'SLIDING_WINDOW' | 'FIXED_WINDOW';
  keyStrategy: 'IP' | 'USER' | 'SERVICE' | 'GLOBAL';
  enforcement: 'BLOCK' | 'THROTTLE' | 'QUEUE';
} /**
 * Authentication configuration
 */
export interface AuthenticationConfig {
  required: boolean;
  methods: ('API_KEY' | 'JWT' | 'OAUTH' | 'BASIC' | 'CERTIFICATE')[];
  validationEndpoint?: string;
  cacheTtl: number;
  fallbackBehavior: 'DENY' | 'ALLOW' | 'ESCALATE';
} /**
 * Coordination validation rule
 */
export interface CoordinationValidationRule {
  ruleId: string;
  name: string;
  description: string;
  condition: string;
  action: 'ALLOW' | 'DENY' | 'APPROVE' | 'ESCALATE';
  priority: number;
  active: boolean;
  conversationalValidation: boolean;
  metadata: Record<string, unknown>;
}

/**
 * Approval workflow configuration
 */
export interface ApprovalWorkflowConfig {
  workflowId: string;
  name: string;
  trigger: string;
  steps: ApprovalWorkflowStep[];
  timeoutMinutes: number;
  escalationPolicy: EscalationPolicy;
  notificationConfig: NotificationConfig;
  parlantIntegration: ParlantIntegrationConfig;
}

/**
 * Approval workflow step
 */
export interface ApprovalWorkflowStep {
  stepId: string;
  name: string;
  type: 'AUTOMATIC' | 'MANUAL' | 'CONVERSATIONAL';
  approverRole: string;
  timeoutMinutes: number;
  fallbackBehavior: 'DENY' | 'APPROVE' | 'ESCALATE';
  conditions: string[];
  parlantValidation: boolean;
}

/**
 * Escalation policy
 */
export interface EscalationPolicy {
  policyId: string;
  levels: EscalationLevel[];
  timeoutMinutes: number;
  maxEscalations: number;
  finalAction: 'APPROVE' | 'DENY' | 'SUSPEND';
} /**
 * Notification configuration
 */
export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  templates: MessageTemplate[];
  urgencyMapping: Record<string, string>;
  suppressDuplicates: boolean;
}

/**
 * PARLANT integration configuration
 */
export interface ParlantIntegrationConfig {
  enabled: boolean;
  sessionManagement: ParlantSessionConfig;
  validationRules: ParlantValidationRule[];
  conversationFlow: ConversationFlowConfig;
  fallbackBehavior: 'MANUAL_APPROVAL' | 'AUTO_DENY' | 'AUTO_APPROVE';
} /**
 * PARLANT session configuration
 */
export interface ParlantSessionConfig {
  sessionTimeout: number;
  maxConcurrentSessions: number;
  sessionPersistence: boolean;
  contextEnrichment: boolean;
  confidenceThreshold: number;
}

/**
 * PARLANT validation rule
 */
export interface ParlantValidationRule {
  ruleId: string;
  trigger: string;
  validationPrompt: string;
  expectedResponses: string[];
  confidenceThreshold: number;
  fallbackAction: 'APPROVE' | 'DENY' | 'ESCALATE';
} /**
 * Conversation flow configuration
 */
export interface ConversationFlowConfig {
  initialPrompt: string;
  followUpPrompts: string[];
  confirmationRequired: boolean;
  maxTurns: number;
  timeoutMinutes: number;
  contextVariables: string[];
}

/**
 * Coordination monitoring configuration
 */
export interface CoordinationMonitoringConfig {
  metricsCollection: MetricsCollectionConfig;
  alerting: AlertingConfig;
  dashboards: DashboardConfig[];
  auditTrail: AuditTrailConfig;
  performanceTracking: PerformanceTrackingConfig;
}

/**
 * Metrics collection configuration
 */
export interface MetricsCollectionConfig {
  enabled: boolean;
  interval: number;
  retention: number;
  metrics: string[];
  aggregation: AggregationConfig;
  export: ExportConfig;
}

/**
 * Aggregation configuration
 */
export interface AggregationConfig {
  functions: ('SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT' | 'PERCENTILE')[];
  intervals: number[];
  dimensions: string[];
}

/**
 * Export configuration
 */
export interface ExportConfig {
  enabled: boolean;
  format: 'PROMETHEUS' | 'INFLUXDB' | 'ELASTICSEARCH' | 'CUSTOM';
  endpoint: string;
  authentication: Record<string, unknown>;
  batchSize: number;
}

/**
 * Alerting configuration
 */
export interface AlertingConfig {
  enabled: boolean;
  rules: AlertRule[];
  channels: AlertChannel[];
  escalation: AlertEscalationConfig;
  suppression: AlertSuppressionConfig;
}

/**
 * Alert rule
 */
export interface AlertRule {
  ruleId: string;
  name: string;
  condition: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  threshold: number;
  duration: number;
  cooldown: number;
  enabled: boolean;
}

/**
 * Alert channel
 */
export interface AlertChannel {
  channelId: string;
  type: 'EMAIL' | 'SLACK' | 'WEBHOOK' | 'PAGERDUTY';
  configuration: Record<string, unknown>;
  severityFilter: string[];
  enabled: boolean;
}

/**
 * Alert escalation configuration
 */
export interface AlertEscalationConfig {
  enabled: boolean;
  levels: AlertEscalationLevel[];
  timeoutMinutes: number;
  maxEscalations: number;
}

/**
 * Alert escalation level
 */
export interface AlertEscalationLevel {
  level: number;
  recipients: string[];
  channels: string[];
  timeoutMinutes: number;
  severity: string[];
}

/**
 * Alert suppression configuration
 */
export interface AlertSuppressionConfig {
  enabled: boolean;
  rules: SuppressionRule[];
  duration: number;
  similarity: number;
}

/**
 * Suppression rule
 */
export interface SuppressionRule {
  ruleId: string;
  condition: string;
  duration: number;
  priority: number;
  enabled: boolean;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  dashboardId: string;
  name: string;
  description: string;
  panels: DashboardPanel[];
  layout: string;
  refreshInterval: number;
  timeRange: string;
}

/**
 * Dashboard panel
 */
export interface DashboardPanel {
  panelId: string;
  title: string;
  type: string;
  query: string;
  visualization: string;
  position: Position;
  size: Size;
}

/**
 * Position
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Size
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Audit trail configuration
 */
export interface AuditTrailConfig {
  enabled: boolean;
  retention: number;
  encryption: boolean;
  compression: boolean;
  events: string[];
  storage: StorageConfig;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  type: 'DATABASE' | 'FILE' | 'CLOUD' | 'ELASTICSEARCH';
  configuration: Record<string, unknown>;
  backup: BackupConfig;
  archival: ArchivalConfig;
}

/**
 * Backup configuration
 */
export interface BackupConfig {
  enabled: boolean;
  frequency: number;
  retention: number;
  location: string;
  encryption: boolean;
}

/**
 * Archival configuration
 */
export interface ArchivalConfig {
  enabled: boolean;
  age: number;
  storage: string;
  compression: boolean;
  indexing: boolean;
}

/**
 * Performance tracking configuration
 */
export interface PerformanceTrackingConfig {
  enabled: boolean;
  metrics: PerformanceMetric[];
  baselines: PerformanceBaseline[];
  alerting: PerformanceAlertingConfig;
  reporting: PerformanceReportingConfig;
}

/**
 * Performance metric
 */
export interface PerformanceMetric {
  metricId: string;
  name: string;
  type: 'COUNTER' | 'GAUGE' | 'HISTOGRAM' | 'TIMER';
  unit: string;
  description: string;
  tags: string[];
}

/**
 * Performance baseline
 */
export interface PerformanceBaseline {
  baselineId: string;
  metric: string;
  period: string;
  value: number;
  tolerance: number;
  alertOnDeviation: boolean;
}

/**
 * Performance alerting configuration
 */
export interface PerformanceAlertingConfig {
  enabled: boolean;
  thresholds: PerformanceThreshold[];
  notifications: PerformanceNotificationConfig[];
}

/**
 * Performance threshold
 */
export interface PerformanceThreshold {
  thresholdId: string;
  metric: string;
  operator: string;
  value: number;
  severity: string;
  duration: number;
}

/**
 * Performance notification configuration
 */
export interface PerformanceNotificationConfig {
  configId: string;
  channels: string[];
  template: string;
  frequency: number;
  enabled: boolean;
}

/**
 * Performance reporting configuration
 */
export interface PerformanceReportingConfig {
  enabled: boolean;
  frequency: number;
  recipients: string[];
  format: 'PDF' | 'HTML' | 'CSV' | 'JSON';
  sections: string[];
}

/**
 * Failure handling configuration
 */
export interface FailureHandlingConfig {
  strategies: FailureStrategy[];
  circuitBreakers: CircuitBreakerConfig[];
  bulkheads: BulkheadConfig[];
  timeouts: TimeoutConfig[];
  retries: RetryConfig[];
}

/**
 * Failure strategy
 */
export interface FailureStrategy {
  strategyId: string;
  name: string;
  trigger: string;
  actions: FailureAction[];
  priority: number;
  enabled: boolean;
}

/**
 * Failure action
 */
export interface FailureAction {
  actionId: string;
  type: 'RETRY' | 'FALLBACK' | 'CIRCUIT_BREAK' | 'ALERT' | 'ESCALATE';
  configuration: Record<string, unknown>;
  timeout: number;
  order: number;
}

/**
 * Bulkhead configuration
 */
export interface BulkheadConfig {
  bulkheadId: string;
  name: string;
  type: 'THREAD_POOL' | 'SEMAPHORE' | 'CONNECTION_POOL';
  capacity: number;
  queueSize: number;
  rejectionPolicy: 'ABORT' | 'CALLER_RUNS' | 'DISCARD' | 'DISCARD_OLDEST';
} /**
 * Timeout configuration
 */
export interface TimeoutConfig {
  timeoutId: string;
  name: string;
  duration: number;
  action: 'CANCEL' | 'FALLBACK' | 'RETRY';
  enabled: boolean;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  retryId: string;
  name: string;
  maxAttempts: number;
  delay: number;
  backoff: string;
  conditions: string[];
  enabled: boolean;
}

/**
 * Performance targets
 */
export interface PerformanceTargets {
  latency: LatencyTarget;
  throughput: ThroughputTarget;
  availability: AvailabilityTarget;
  reliability: ReliabilityTarget;
  scalability: ScalabilityTarget;
}

/**
 * Latency target
 */
export interface LatencyTarget {
  p50: number;
  p95: number;
  p99: number;
  max: number;
  unit: string;
}

/**
 * Throughput target
 */
export interface ThroughputTarget {
  requestsPerSecond: number;
  transactionsPerSecond: number;
  dataProcessingRate: number;
  unit: string;
}

/**
 * Availability target
 */
export interface AvailabilityTarget {
  uptime: number;
  maintenanceWindow: string;
  recoveryTime: number;
  unit: string;
}

/**
 * Reliability target
 */
export interface ReliabilityTarget {
  errorRate: number;
  meanTimeBetweenFailures: number;
  meanTimeToRecovery: number;
  unit: string;
}

/**
 * Scalability target
 */
export interface ScalabilityTarget {
  maxUsers: number;
  maxConnections: number;
  horizontalScalingThreshold: number;
  verticalScalingThreshold: number;
}

// Export all types for use in other modules
export type {
  MultiServiceWorkflow,
  WorkflowStep,
  WorkflowValidationRequirement,
  WorkflowRiskAssessment,
  WorkflowRiskFactor,
  ApprovalThreshold,
  WorkflowRollbackStrategy,
  RollbackStep,
  CompensationAction,
  DataRecoveryPlan,
  RecoveryProcedure,
  NotificationPlan,
  NotificationChannel,
  EscalationMatrix,
  EscalationLevel,
  MessageTemplate,
  UrgencyLevel,
  ApprovalCriteria,
  AutomaticApprovalCriteria,
  ManualApprovalCriteria,
  ConversationalApprovalCriteria,
  ValidationPrompt,
  ContextEnrichment,
  BusinessRule,
  BusinessImpactAssessment,
  FinancialImpact,
  OperationalImpact,
  ComplianceImpact,
  CustomerImpact,
  ReputationalImpact,
  StepRetryPolicy,
  OrchestrationContext,
  OrchestrationExecutionState,
  ServiceState,
  ResourceAllocation,
  ValidationHistoryEntry,
  ConversationalContext,
  ConversationMessage,
  ApprovalRequest,
  ApprovalCondition,
  PendingApproval,
  OrchestrationError,
  DependencyStatus,
  OperationalMetrics,
  WorkflowValidationResult,
  ValidationStep,
  TechnicalFeasibility,
  ComplianceStatus,
  ComplianceRequirement,
  ComplianceViolation,
  ResourceImpact,
  CustomResourceImpact,
  ResourceRequirement,
  MultiServiceCoordinationConfig,
  ServiceCoordinationConfig,
  ServiceEndpoint,
  HealthCheckConfig,
  CircuitBreakerConfig,
  RetryPolicyConfig,
  RateLimitingConfig,
  AuthenticationConfig,
  CoordinationValidationRule,
  ApprovalWorkflowConfig,
  ApprovalWorkflowStep,
  EscalationPolicy,
  NotificationConfig,
  ParlantIntegrationConfig,
  ParlantSessionConfig,
  ParlantValidationRule,
  ConversationFlowConfig,
  CoordinationMonitoringConfig,
  MetricsCollectionConfig,
  AggregationConfig,
  ExportConfig,
  AlertingConfig,
  AlertRule,
  AlertChannel,
  AlertEscalationConfig,
  AlertEscalationLevel,
  AlertSuppressionConfig,
  SuppressionRule,
  DashboardConfig,
  DashboardPanel,
  Position,
  Size,
  AuditTrailConfig,
  StorageConfig,
  BackupConfig,
  ArchivalConfig,
  PerformanceTrackingConfig,
  PerformanceMetric,
  PerformanceBaseline,
  PerformanceAlertingConfig,
  PerformanceThreshold,
  PerformanceNotificationConfig,
  PerformanceReportingConfig,
  FailureHandlingConfig,
  FailureStrategy,
  FailureAction,
  BulkheadConfig,
  TimeoutConfig,
  RetryConfig,
  PerformanceTargets,
  LatencyTarget,
  ThroughputTarget,
  AvailabilityTarget,
  ReliabilityTarget,
  ScalabilityTarget,
};
