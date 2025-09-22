/**
 * @fileoverview Gateway Interface Definitions
 * Comprehensive interfaces for enterprise API gateway functionality
 *
 * @version 1.0.0
 * @author AIgent Enterprise API Team
 * @since 2025-09-21
 */

export interface GatewayClusterConfig {
  clusterId: string;
  instances: ServiceInstance[];
  loadBalancer: LoadBalancingConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  throttling: ThrottlingConfig;
}

export interface ServiceInstance {
  instanceId: string;
  host: string;
  port: number;
  status: InstanceStatus;
  capacity: number;
  currentLoad: number;
  specializations: string[];
  location: GeographicLocation;
  healthScore: number;
  responseTimeHistory: number[];
}

export type InstanceStatus =
  | "HEALTHY"
  | "UNHEALTHY"
  | "DRAINING"
  | "MAINTENANCE";

export interface LoadBalancingConfig {
  algorithm: LoadBalancingAlgorithm;
  healthCheck: HealthCheckConfig;
  sessionAffinity: boolean;
  weightedRouting: boolean;
}

export type LoadBalancingAlgorithm =
  | "ROUND_ROBIN"
  | "LEAST_CONNECTIONS"
  | "WEIGHTED"
  | "IP_HASH"
  | "PERFORMANCE_BASED"
  | "GEOGRAPHIC";

export interface HealthCheckConfig {
  enabled: boolean;
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
  endpoint: string;
}

export interface SecurityConfig {
  authenticationRequired: boolean;
  authorizationPolicies: AuthorizationPolicy[];
  threatDetection: ThreatDetectionConfig;
  rateLimiting: RateLimitingConfig;
  encryption: EncryptionConfig;
}

export interface AuthorizationPolicy {
  policyId: string;
  name: string;
  rules: AuthorizationRule[];
  priority: number;
  enabled: boolean;
}

export interface AuthorizationRule {
  ruleId: string;
  condition: string;
  action: "ALLOW" | "DENY" | "REQUIRE_MFA";
  resources: string[];
  principals: string[];
}

export interface ThreatDetectionConfig {
  enabled: boolean;
  algorithms: ThreatDetectionAlgorithm[];
  sensitivity: "LOW" | "MEDIUM" | "HIGH";
  responseActions: ThreatResponseAction[];
}

export interface ThreatDetectionAlgorithm {
  algorithmId: string;
  type:
    | "SIGNATURE_BASED"
    | "ANOMALY_DETECTION"
    | "BEHAVIOR_ANALYSIS"
    | "ML_BASED";
  confidence: number;
  enabled: boolean;
}

export interface ThreatResponseAction {
  actionId: string;
  trigger: string;
  action: "BLOCK" | "MONITOR" | "CHALLENGE" | "QUARANTINE";
  duration: number;
  escalation: boolean;
}

export interface RateLimitingConfig {
  globalLimit: number;
  userLimit: number;
  ipLimit: number;
  endpointLimits: EndpointRateLimit[];
  burstAllowance: number;
}

export interface EndpointRateLimit {
  endpoint: string;
  method: string;
  limit: number;
  window: number;
  burstLimit: number;
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: string;
  keySize: number;
  certificateRotation: boolean;
  tlsVersion: string;
}

export interface MonitoringConfig {
  enabled: boolean;
  metrics: MetricConfig[];
  alerting: AlertingConfig;
  logging: LoggingConfig;
  tracing: TracingConfig;
}

export interface MetricConfig {
  metricName: string;
  enabled: boolean;
  interval: number;
  retention: number;
  aggregation: string[];
}

export interface AlertingConfig {
  enabled: boolean;
  rules: AlertRule[];
  channels: AlertChannel[];
  escalation: EscalationConfig;
}

export interface AlertRule {
  ruleId: string;
  condition: string;
  threshold: number;
  severity: AlertSeverity;
  enabled: boolean;
}

export type AlertSeverity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export interface AlertChannel {
  channelId: string;
  type: "EMAIL" | "SMS" | "SLACK" | "WEBHOOK" | "PAGERDUTY";
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface EscalationConfig {
  enabled: boolean;
  levels: EscalationLevel[];
  timeout: number;
}

export interface EscalationLevel {
  level: number;
  contacts: string[];
  timeout: number;
  actions: string[];
}

export interface LoggingConfig {
  enabled: boolean;
  level: LogLevel;
  format: string;
  destination: LogDestination[];
  retention: number;
}

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export interface LogDestination {
  type: "FILE" | "ELASTICSEARCH" | "SPLUNK" | "CLOUDWATCH";
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface TracingConfig {
  enabled: boolean;
  samplingRate: number;
  tracingProvider: string;
  exporters: TracingExporter[];
}

export interface TracingExporter {
  type: "JAEGER" | "ZIPKIN" | "OTLP";
  endpoint: string;
  enabled: boolean;
}

export interface ThrottlingConfig {
  enabled: boolean;
  adaptive: boolean;
  globalThresholds: ThrottlingThresholds;
  userThresholds: ThrottlingThresholds;
  backoffStrategy: BackoffStrategy;
}

export interface ThrottlingThresholds {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
}

export interface BackoffStrategy {
  type: "EXPONENTIAL" | "LINEAR" | "FIXED";
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
}

export interface RoutingDecision {
  selectedInstance: ServiceInstance;
  routingReason: string;
  confidence: number;
  alternativeInstances: ServiceInstance[];
  routingMetrics: RoutingMetrics;
  estimatedResponseTime: number;
}

export interface RoutingMetrics {
  loadScore: number;
  latencyScore: number;
  healthScore: number;
  capacityScore: number;
  affinityScore: number;
}

export interface RoutingStrategy {
  strategyId: string;
  type: RoutingStrategyType;
  priority: number;
  criteria: RoutingCriteria;
  fallbackStrategy: string;
}

export type RoutingStrategyType =
  | "PERFORMANCE"
  | "GEOGRAPHIC"
  | "CAPACITY"
  | "AFFINITY"
  | "COST"
  | "COMPLIANCE";

export interface RoutingCriteria {
  latencyWeight: number;
  capacityWeight: number;
  healthWeight: number;
  affinityWeight: number;
  costWeight: number;
}

export interface BatchProcessingResult {
  batchId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  throughput: number;
  results: BatchRequestResult[];
  performanceAnalysis: PerformanceAnalysis;
  optimizationRecommendations: string[];
}

export interface BatchRequestResult {
  requestId: string;
  success: boolean;
  statusCode: number;
  processingTime: number;
  error?: string;
  routing: RoutingDecision;
}

export interface PerformanceAnalysis {
  throughputAnalysis: ThroughputAnalysis;
  latencyAnalysis: LatencyAnalysis;
  errorAnalysis: ErrorAnalysis;
  resourceAnalysis: ResourceAnalysis;
}

export interface ThroughputAnalysis {
  currentThroughput: number;
  targetThroughput: number;
  bottlenecks: string[];
  optimizationPotential: number;
}

export interface LatencyAnalysis {
  p50: number;
  p95: number;
  p99: number;
  distribution: LatencyDistribution;
  outliers: LatencyOutlier[];
}

export interface LatencyDistribution {
  buckets: LatencyBucket[];
  mean: number;
  median: number;
  standardDeviation: number;
}

export interface LatencyBucket {
  lowerBound: number;
  upperBound: number;
  count: number;
  percentage: number;
}

export interface LatencyOutlier {
  requestId: string;
  latency: number;
  cause: string;
  recommendation: string;
}

export interface ErrorAnalysis {
  totalErrors: number;
  errorRate: number;
  errorTypes: ErrorTypeAnalysis[];
  errorTrends: ErrorTrend[];
}

export interface ErrorTypeAnalysis {
  errorType: string;
  count: number;
  percentage: number;
  severity: AlertSeverity;
  resolution: string;
}

export interface ErrorTrend {
  timeWindow: string;
  errorCount: number;
  trend: "INCREASING" | "DECREASING" | "STABLE";
  prediction: number;
}

export interface ResourceAnalysis {
  cpuUtilization: UtilizationAnalysis;
  memoryUtilization: UtilizationAnalysis;
  networkUtilization: UtilizationAnalysis;
  storageUtilization: UtilizationAnalysis;
}

export interface UtilizationAnalysis {
  current: number;
  average: number;
  peak: number;
  trend: "INCREASING" | "DECREASING" | "STABLE";
  capacity: number;
  recommendations: string[];
}

export interface GatewayMetrics {
  requestsPerSecond: number;
  averageLatency: number;
  errorRate: number;
  throughput: number;
  activeConnections: number;
  queueDepth: number;
  cacheHitRate: number;
  securityBlocks: number;
}

export interface ClusterHealth {
  clusterId: string;
  overallStatus: ClusterStatus;
  healthyInstances: number;
  totalInstances: number;
  performance: GatewayMetrics;
  capacity: CapacityInfo;
  alerts: Alert[];
  lastChecked: Date;
}

export type ClusterStatus = "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "CRITICAL";

export interface CapacityInfo {
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  projectedCapacity: number;
  scalingRecommendations: string[];
}

export interface Alert {
  alertId: string;
  type: string;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolution?: string;
}

export interface FailoverStrategy {
  enabled: boolean;
  triggerConditions: FailoverTrigger[];
  targetSelection: TargetSelectionStrategy;
  drainTimeout: number;
  healthCheckOverride: boolean;
}

export interface FailoverTrigger {
  condition: string;
  threshold: number;
  duration: number;
  action: "IMMEDIATE" | "GRACEFUL" | "MONITOR";
}

export interface TargetSelectionStrategy {
  primary: "CAPACITY" | "HEALTH" | "PROXIMITY" | "COST";
  secondary: string[];
  excludeCriteria: string[];
}

export interface GeographicLocation {
  latitude: number;
  longitude: number;
  country: string;
  region: string;
  city: string;
  datacenter?: string;
}

// Gateway API Request/Response Interfaces
export interface APIRequest {
  id: string;
  requestId: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  parameters: Record<string, any>;
  body?: any;
  timestamp: Date;
  userContext?: UserContext;
  securityLevel: SecurityLevel;
  operation: APIOperation;
}

export type SecurityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface APIOperation {
  type: string;
  id: string;
  name: string;
  description: string;
  baselineExecutionTime: number;
  currentState: OperationState;
  progress: OperationProgress;
  userContext: UserContext;
  securityLevel: SecurityLevel;
}

export interface OperationState {
  phase: "VALIDATION" | "EXECUTION" | "COMPLETION" | "ERROR";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";
  startTime: Date;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
}

export interface OperationProgress {
  percentage: number;
  estimatedTimeRemaining: number;
  currentActivity: string;
  milestones: ProgressMilestone[];
}

export interface ProgressMilestone {
  name: string;
  completed: boolean;
  timestamp?: Date;
  duration?: number;
}

export interface UserContext {
  userId: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  authLevel: 'BASIC' | 'ENHANCED' | 'ENTERPRISE';
}

export interface ValidationResult {
  isValid: boolean;
  valid: boolean; // Alias for isValid for compatibility
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ValidationWarning {
  field: string;
  message: string;
  recommendation?: string;
}

export interface LoadBalancingStrategy {
  strategyType: LoadBalancingAlgorithm;
  weights?: Record<string, number>;
  affinityRules?: AffinityRule[];
  healthThreshold: number;
}

export interface AffinityRule {
  type: 'SESSION' | 'USER' | 'GEOGRAPHIC' | 'CUSTOM';
  key: string;
  duration?: number;
}

export interface SecurityEnforcement {
  authenticationRequired: boolean;
  authorizationPolicies: string[];
  encryptionLevel: 'NONE' | 'BASIC' | 'ADVANCED' | 'ENTERPRISE';
  auditLevel: 'MINIMAL' | 'STANDARD' | 'COMPREHENSIVE';
  allowed: boolean;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  resourceUtilization: ResourceUtilization;
  timestamp: Date;
  latency?: {
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface ResourceUtilization {
  cpu: number;
  memory: number;
  network: number;
  storage: number;
}
