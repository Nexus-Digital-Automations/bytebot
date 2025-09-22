/**
 * @fileoverview Real-Time API Monitoring Interfaces
 * Enterprise-grade real-time monitoring system for PARLANT Phase 1
 * Provides WebSocket integration, conversational dashboard, and user intervention
 *
 * @version 1.0.0
 * @author AIgent PARLANT Team
 * @since 2025-09-22
 */

import { EventEmitter } from "events";

// Core WebSocket Communication Interfaces
export interface WebSocketConnection {
  id: string;
  userId: string;
  operationId?: string;
  sessionId: string;
  connectionTime: Date;
  lastActivity: Date;
  status: WebSocketStatus;
  subscriptions: string[];
  compressionEnabled: boolean;
  rateLimitRemaining: number;
}

export interface WebSocketMessage {
  id: string;
  type: WebSocketMessageType;
  timestamp: Date;
  operationId?: string;
  sessionId: string;
  priority: MessagePriority;
  data: unknown;
  compressed?: boolean;
  retryCount?: number;
}

export interface WebSocketPool {
  maxConnections: number;
  activeConnections: Map<string, WebSocketConnection>;
  connectionGroups: Map<string, string[]>; // operationId -> connectionIds
  healthyConnections: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  averageLatency: number;
}

// Real-Time Monitoring Core Interfaces
export interface RealTimeMonitoringConfig {
  enabled: boolean;
  webSocketPort: number;
  maxConnections: number;
  maxConnectionsPerUser: number;
  messageCompressionEnabled: boolean;
  rateLimiting: {
    messagesPerSecond: number;
    burstLimit: number;
    windowSizeMs: number;
  };
  monitoring: {
    updateIntervalMs: number;
    metricsRetentionMs: number;
    alertThresholds: AlertThresholds;
    conversationalEnabled: boolean;
  };
  performance: {
    targetLatencyMs: number;
    maxConcurrentOperations: number;
    memoryThresholdMB: number;
    cpuThresholdPercent: number;
  };
  security: {
    authenticationRequired: boolean;
    encryptionEnabled: boolean;
    auditLoggingEnabled: boolean;
    sessionTimeoutMs: number;
  };
}

export interface RealTimeMonitoringSession {
  sessionId: string;
  userId: string;
  operationId: string;
  startTime: Date;
  lastActivity: Date;
  monitoringLevel: MonitoringLevel;
  conversationalInterface: ConversationalInterface;
  webSocketConnections: string[];
  performanceMetrics: PerformanceMetrics;
  interventionCapabilities: InterventionCapability[];
  alertSubscriptions: AlertSubscription[];
  status: SessionStatus;
}

// Conversational Dashboard Interfaces
export interface ConversationalInterface {
  sessionId: string;
  conversationHistory: ConversationMessage[];
  activeQueries: ActiveQuery[];
  naturalLanguageProcessor: NLPProcessor;
  responseGenerator: ResponseGenerator;
  userPreferences: ConversationalPreferences;
  contextMemory: ContextMemory;
}

export interface ConversationMessage {
  id: string;
  timestamp: Date;
  type: "user" | "system" | "alert" | "insight";
  content: string;
  metadata: ConversationMetadata;
  followUpActions?: FollowUpAction[];
  relatedOperations?: string[];
}

export interface ActiveQuery {
  queryId: string;
  userId: string;
  naturalLanguageQuery: string;
  parsedIntent: QueryIntent;
  targetOperations: string[];
  estimatedResponseTime: number;
  status: QueryStatus;
  partialResults?: QueryResult[];
}

export interface QueryIntent {
  type: QueryType;
  action: string;
  targets: string[];
  filters: QueryFilter[];
  timeRange?: TimeRange;
  aggregationType?: AggregationType;
  outputFormat: OutputFormat;
}

// Performance Analytics Interfaces
export interface PerformanceAnalytics {
  operationId: string;
  realTimeMetrics: RealTimeMetrics;
  historicalTrends: HistoricalTrend[];
  anomalyDetection: AnomalyDetection;
  bottleneckAnalysis: BottleneckAnalysis;
  predictiveInsights: PredictiveInsight[];
  optimizationSuggestions: OptimizationSuggestion[];
}

export interface RealTimeMetrics {
  timestamp: Date;
  latency: LatencyMetrics;
  throughput: ThroughputMetrics;
  errorRates: ErrorRateMetrics;
  resourceUtilization: ResourceUtilizationMetrics;
  businessMetrics: BusinessMetrics;
  customMetrics: Map<string, number>;
}

export interface BottleneckAnalysis {
  detectedBottlenecks: Bottleneck[];
  performanceImpact: PerformanceImpact;
  rootCauseAnalysis: RootCauseAnalysis;
  resolutionSuggestions: ResolutionSuggestion[];
  estimatedResolutionTime: number;
  priorityLevel: BottleneckPriority;
}

// Intelligent Alerting Interfaces
export interface IntelligentAlert {
  alertId: string;
  timestamp: Date;
  operationId: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  conversationalExplanation: ConversationalExplanation;
  context: AlertContext;
  suggestedActions: SuggestedAction[];
  escalationPath: EscalationStep[];
  userInterventionRequired: boolean;
  automaticResolutionAttempted: boolean;
}

export interface ConversationalExplanation {
  summary: string;
  technicalDetails: string;
  businessImpact: string;
  userFriendlyExplanation: string;
  visualAids?: VisualAid[];
  relatedDocumentation?: DocumentationLink[];
}

export interface SuggestedAction {
  actionId: string;
  type: ActionType;
  description: string;
  estimatedImpact: ImpactAssessment;
  riskLevel: RiskLevel;
  requiredPermissions: string[];
  executionSteps: ExecutionStep[];
  rollbackProcedure?: RollbackProcedure;
}

// User Intervention Interfaces
export interface UserInterventionFramework {
  sessionId: string;
  operationId: string;
  interventionCapabilities: InterventionCapability[];
  activeInterventions: ActiveIntervention[];
  interventionHistory: InterventionRecord[];
  realTimeControl: RealTimeControl;
  safetyMechanisms: SafetyMechanism[];
}

export interface InterventionCapability {
  capabilityId: string;
  type: InterventionType;
  description: string;
  naturalLanguageCommands: string[];
  requiredPermissions: string[];
  safetyConstraints: SafetyConstraint[];
  estimatedImpact: ImpactAssessment;
  reversible: boolean;
}

export interface RealTimeControl {
  commandProcessor: CommandProcessor;
  validationEngine: ValidationEngine;
  executionEngine: ExecutionEngine;
  monitoringEngine: MonitoringEngine;
  rollbackEngine: RollbackEngine;
}

// Enterprise Security Interfaces
export interface MonitoringSecurityFramework {
  authenticationProvider: AuthenticationProvider;
  authorizationEngine: AuthorizationEngine;
  auditLogger: AuditLogger;
  encryptionManager: EncryptionManager;
  sessionManager: SessionManager;
  threatDetector: ThreatDetector;
}

export interface AccessControlPolicy {
  policyId: string;
  userId: string;
  operationPermissions: OperationPermission[];
  monitoringPermissions: MonitoringPermission[];
  interventionPermissions: InterventionPermission[];
  timeBasedRestrictions: TimeRestriction[];
  contextualRestrictions: ContextualRestriction[];
}

// Type Definitions
export type WebSocketStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";
export type WebSocketMessageType =
  | "operation_update"
  | "performance_metric"
  | "alert"
  | "intervention_request"
  | "conversation"
  | "heartbeat";
export type MessagePriority = "critical" | "high" | "normal" | "low";
export type MonitoringLevel =
  | "basic"
  | "enhanced"
  | "comprehensive"
  | "real_time";
export type SessionStatus =
  | "active"
  | "paused"
  | "completed"
  | "error"
  | "terminated";
export type QueryType =
  | "status"
  | "metrics"
  | "logs"
  | "analysis"
  | "prediction"
  | "control";
export type QueryStatus =
  | "processing"
  | "completed"
  | "failed"
  | "partial"
  | "cached";
export type AggregationType =
  | "sum"
  | "average"
  | "min"
  | "max"
  | "count"
  | "percentile";
export type OutputFormat = "text" | "chart" | "table" | "json" | "conversation";
export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";
export type AlertCategory =
  | "performance"
  | "security"
  | "business"
  | "system"
  | "user";
export type ActionType =
  | "automatic"
  | "manual"
  | "collaborative"
  | "approval_required";
export type RiskLevel = "none" | "low" | "medium" | "high" | "critical";
export type InterventionType =
  | "pause"
  | "modify"
  | "redirect"
  | "scale"
  | "fallback"
  | "terminate";
export type BottleneckPriority = "immediate" | "urgent" | "normal" | "deferred";

// Supporting Interfaces
export interface AlertThresholds {
  latencyMs: number;
  errorRatePercent: number;
  throughputDropPercent: number;
  resourceUtilizationPercent: number;
  businessMetricThresholds: Map<string, number>;
}

export interface ConversationalPreferences {
  technicalDetailLevel: "basic" | "intermediate" | "advanced";
  explanationStyle: "concise" | "detailed" | "comprehensive";
  visualAidsEnabled: boolean;
  notificationFrequency: "immediate" | "batched" | "scheduled";
  languagePreference: string;
  timeZone: string;
}

export interface ContextMemory {
  recentOperations: string[];
  userPatterns: UserPattern[];
  conversationContext: ConversationContext;
  learningProfile: LearningProfile;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  resourceUtilization: number;
  businessKPIs: Map<string, number>;
  customMetrics: Map<string, number>;
}

export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  max: number;
  average: number;
}

export interface ThroughputMetrics {
  requestsPerSecond: number;
  peakThroughput: number;
  sustainedThroughput: number;
  throughputTrend: number;
}

export interface ErrorRateMetrics {
  overall: number;
  byType: Map<string, number>;
  trend: number;
  criticalErrors: number;
}

export interface ResourceUtilizationMetrics {
  cpu: number;
  memory: number;
  network: number;
  storage: number;
  connections: number;
}

export interface BusinessMetrics {
  userSatisfaction: number;
  completionRate: number;
  retryRate: number;
  escalationRate: number;
  customBusinessKPIs: Map<string, number>;
}

// Event and Stream Interfaces
export interface MonitoringEventStream extends EventEmitter {
  streamId: string;
  operationId: string;
  subscribers: Set<string>;
  compressionEnabled: boolean;
  bufferSize: number;
  maxRetries: number;
}

export interface StreamSubscription {
  subscriptionId: string;
  userId: string;
  streamId: string;
  filters: StreamFilter[];
  transformations: StreamTransformation[];
  deliveryGuarantee: DeliveryGuarantee;
}

export interface ConversationalMonitoringEngine {
  processNaturalLanguageQuery(
    query: string,
    context: QueryContext,
  ): Promise<QueryResult>;
  generateConversationalResponse(
    data: unknown,
    context: ResponseContext,
  ): Promise<ConversationalResponse>;
  explainPerformanceData(
    metrics: PerformanceMetrics,
    userLevel: string,
  ): Promise<PerformanceExplanation>;
  suggestInterventions(
    situation: MonitoringSituation,
  ): Promise<InterventionSuggestion[]>;
  createLiveNarrative(operationId: string): Promise<LiveNarrative>;
}

// Additional Supporting Types
export interface TimeRange {
  start: Date;
  end: Date;
  timezone?: string;
}

export interface QueryFilter {
  field: string;
  operator:
    | "equals"
    | "contains"
    | "greater_than"
    | "less_than"
    | "in"
    | "range";
  value: unknown;
}

export interface ConversationMetadata {
  operationId?: string;
  queryId?: string;
  alertId?: string;
  performanceContext?: PerformanceContext;
  userContext?: UserContext;
}

export interface FollowUpAction {
  actionId: string;
  description: string;
  type: "query" | "intervention" | "explanation" | "drill_down";
  parameters?: Record<string, unknown>;
}

export interface Bottleneck {
  type:
    | "cpu"
    | "memory"
    | "network"
    | "database"
    | "external_service"
    | "algorithm";
  location: string;
  severity: number;
  impact: PerformanceImpact;
  detectionTime: Date;
  estimatedDuration: number;
}

export interface PerformanceImpact {
  userExperience: number;
  businessMetrics: Map<string, number>;
  systemStability: number;
  costImplications: number;
}

export interface RootCauseAnalysis {
  primaryCause: string;
  contributingFactors: string[];
  analysisConfidence: number;
  evidenceTrail: Evidence[];
  relatedIncidents: string[];
}

export interface ResolutionSuggestion {
  suggestionId: string;
  description: string;
  estimatedEffectiveness: number;
  implementationComplexity: "low" | "medium" | "high";
  estimatedImplementationTime: number;
  riskAssessment: RiskAssessment;
}

export interface HistoricalTrend {
  metric: string;
  timeRange: TimeRange;
  dataPoints: DataPoint[];
  trend: "increasing" | "decreasing" | "stable" | "volatile";
  seasonality?: SeasonalityPattern;
}

export interface AnomalyDetection {
  anomaliesDetected: Anomaly[];
  detectionModel: string;
  confidence: number;
  baselineRange: NumberRange;
  detectionSensitivity: number;
}

export interface PredictiveInsight {
  insightId: string;
  type:
    | "performance_degradation"
    | "capacity_issue"
    | "security_risk"
    | "business_impact";
  prediction: string;
  confidence: number;
  timeHorizon: number;
  preventiveActions: PreventiveAction[];
}

export interface OptimizationSuggestion {
  suggestionId: string;
  category: "performance" | "cost" | "reliability" | "user_experience";
  description: string;
  estimatedBenefit: OptimizationBenefit;
  implementationGuide: ImplementationGuide;
  prerequisites: string[];
}

// This interface represents the main service that orchestrates all monitoring capabilities
// Additional missing interfaces
export interface EscalationStep {
  type: string;
  assignedTo: string;
  expectedResponseTime: number;
  escalationCriteria: string[];
  notificationChannels: string[];
}

export interface AlertContext {
  operationId: string;
  triggeringMetrics: RealTimeMetrics;
  historicalContext: Record<string, unknown>;
  businessContext: Record<string, unknown>;
  technicalContext: Record<string, unknown>;
}

export interface ExecutionStep {
  stepId: string;
  description: string;
  command: string;
  estimatedDuration: number;
  riskLevel: RiskLevel;
}

export interface RollbackProcedure {
  procedureId: string;
  steps: ExecutionStep[];
  automatedRollback: boolean;
  rollbackTimeout: number;
}

export interface ImpactAssessment {
  severity: "low" | "medium" | "high" | "critical";
  businessImpact: number;
  technicalImpact: number;
  userImpact: number;
  estimatedDowntime: number;
}

export interface VisualAid {
  type: "chart" | "diagram" | "screenshot" | "video";
  title: string;
  description: string;
  url?: string;
  data?: unknown;
}

export interface DocumentationLink {
  title: string;
  url: string;
  description: string;
  relevanceScore: number;
}

export interface ConversationalAlert {
  alertId: string;
  conversationalSummary: string;
  technicalExplanation: string;
  businessImpactExplanation: string;
  visualAids: VisualAid[];
  followUpQuestions: string[];
  interventionOptions: any[];
  confidenceScore: number;
  urgencyLevel: string;
  estimatedResolutionTime: number;
  relatedDocumentation: DocumentationLink[];
}

export interface AlertSubscription {
  subscriptionId: string;
  userId: string;
  alertTypes: AlertCategory[];
  severityLevels: AlertSeverity[];
  operationIds: string[];
  notificationChannels: string[];
}

export interface AlertRule {
  ruleId: string;
  title: string;
  description: string;
  conditions: AlertCondition[];
  severity: AlertSeverity;
  category: AlertCategory;
  logicalOperator: "AND" | "OR";
  enabled: boolean;
}

export interface AlertCondition {
  conditionId: string;
  metric: string;
  operator: "greater_than" | "less_than" | "equals" | "not_equals";
  threshold: number;
  timeWindow: number;
}

export interface NotificationChannel {
  channelId: string;
  type: "email" | "sms" | "webhook" | "in_app";
  configuration: Record<string, unknown>;
  enabled: boolean;
}

export interface AlertHistory {
  alertId: string;
  alert: IntelligentAlert;
  timestamp: Date;
  resolved: boolean;
  resolutionTime: number | null;
}

export interface ConversationalResponse {
  queryId: string;
  content: string;
  followUpActions: any[];
}

export interface InterventionCommand {
  commandId: string;
  text: string;
  userId: string;
  timestamp: Date;
}

export interface InterventionResult {
  success: boolean;
  message: string;
  alertId?: string;
  action?: string;
  reason?: string;
  result?: unknown;
  alternatives?: string[];
  followUpActions?: string[];
  interventionTime?: number;
}

export interface AccessValidationResult {
  allowed: boolean;
  reason: string;
  requiredPermissions: string[];
  grantedPermissions?: string[];
  restrictions?: any[];
  threatLevel?: string;
  validationTime: number;
  sessionExpiration?: Date;
}

export interface MonitoringActivity {
  activityId: string;
  type: string;
  userId: string;
  operationId: string;
  timestamp: Date;
  details: Record<string, unknown>;
}

export interface MonitoringConfig {
  userId: string;
  monitoringLevel?: MonitoringLevel;
  webSocketEnabled?: boolean;
  userPreferences?: ConversationalPreferences;
  technicalLevel?: string;
  interventionEnabled?: boolean;
  interventionCapabilities?: InterventionCapability[];
  alertSubscriptions?: AlertSubscription[];
}

export interface ConnectionPoolConfig {
  initialSize: number;
  maxSize: number;
  growthFactor: number;
  shrinkThreshold: number;
  healthCheckInterval: number;
}

export interface MessageQueueConfig {
  maxSize: number;
  priorityLevels: number;
  batchSize: number;
  flushInterval: number;
}

export interface CompressionConfig {
  enabled: boolean;
  threshold: number;
  level: number;
  windowBits: number;
  memLevel: number;
}

export interface SecurityConfig {
  authenticationRequired: boolean;
  encryptionEnabled: boolean;
  rateLimitingEnabled: boolean;
  maxMessageSize: number;
  allowedOrigins: string[];
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  resourceUtilization: number;
  businessKPIs: Map<string, number>;
  customMetrics: Map<string, number>;
}

export interface RealTimeAPIMonitorService {
  // Core monitoring operations
  initiateMonitoring(
    operationId: string,
    config: MonitoringConfig,
  ): Promise<RealTimeMonitoringSession>;
  terminateMonitoring(sessionId: string): Promise<void>;

  // WebSocket management
  establishWebSocketConnection(
    userId: string,
    authToken: string,
  ): Promise<WebSocketConnection>;
  broadcastUpdate(
    message: WebSocketMessage,
    targetConnections?: string[],
  ): Promise<void>;

  // Conversational interface
  processNaturalLanguageQuery(
    query: string,
    sessionId: string,
  ): Promise<ConversationalResponse>;
  explainCurrentSituation(
    operationId: string,
    userLevel: string,
  ): Promise<ConversationalExplanation>;

  // Performance analytics
  collectRealTimeMetrics(operationId: string): Promise<RealTimeMetrics>;
  analyzePerformanceBottlenecks(
    operationId: string,
  ): Promise<BottleneckAnalysis>;

  // Intelligent alerting
  evaluateAlertConditions(operationId: string): Promise<IntelligentAlert[]>;
  generateConversationalAlerts(
    alert: IntelligentAlert,
    userPreferences: ConversationalPreferences,
  ): Promise<ConversationalAlert>;

  // User intervention
  enableUserIntervention(
    operationId: string,
    capabilities: InterventionCapability[],
  ): Promise<UserInterventionFramework>;
  processInterventionCommand(
    command: InterventionCommand,
    sessionId: string,
  ): Promise<InterventionResult>;

  // Security and access control
  validateAccess(
    userId: string,
    operationId: string,
    action: string,
  ): Promise<AccessValidationResult>;
  auditMonitoringActivity(activity: MonitoringActivity): Promise<void>;
}
