/**
 * @fileoverview PARLANT Phase 1 - Comprehensive Rate Limiting Types
 * Enterprise-grade conversational rate limiting with intelligent feedback
 * Supporting 10,000+ requests/second with sub-50ms processing
 *
 * @version 1.0.0
 * @author AIgent Enterprise Rate Limiting Team
 * @since 2025-09-22
 */

import { UserContext, SecurityLevel, RiskLevel } from '../../interfaces/conversational-api.interface';

// Core Rate Limiting Types

export interface RateLimitConfiguration {
  // Multi-tier rate limits
  userLimits: UserRateLimits;
  apiLimits: APIRateLimits;
  operationLimits: OperationRateLimits;
  globalLimits: GlobalRateLimits;

  // Enterprise configuration
  enterprise: EnterpriseRateLimitConfig;

  // Performance configuration
  performance: PerformanceConfig;

  // Conversational configuration
  conversational: ConversationalConfig;
}

export interface UserRateLimits {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  concurrentConnections: number;
  byRole: Record<string, RoleBasedLimits>;
  byTier: Record<string, TierBasedLimits>;
}

export interface RoleBasedLimits {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
  specialPrivileges: string[];
}

export interface TierBasedLimits {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
  priorityLevel: number;
  queuePriority: number;
}

export interface APIRateLimits {
  endpointLimits: Record<string, EndpointLimits>;
  methodLimits: Record<string, MethodLimits>;
  resourceLimits: Record<string, ResourceLimits>;
  pathPatternLimits: PathPatternLimit[];
}

export interface EndpointLimits {
  path: string;
  requestsPerSecond: number;
  requestsPerMinute: number;
  burstLimit: number;
  securityLevel: SecurityLevel;
  costWeight: number;
}

export interface MethodLimits {
  method: string;
  requestsPerSecond: number;
  burstLimit: number;
  securityMultiplier: number;
}

export interface ResourceLimits {
  resourceType: string;
  requestsPerSecond: number;
  concurrentOperations: number;
  maxPayloadSize: number;
  costWeight: number;
}

export interface PathPatternLimit {
  pattern: string;
  regex: RegExp;
  limits: EndpointLimits;
  priority: number;
}

export interface OperationRateLimits {
  operationLimits: Record<string, OperationLimit>;
  complexityLimits: ComplexityBasedLimits;
  securityLevelLimits: Record<SecurityLevel, SecurityLevelLimits>;
  riskBasedLimits: Record<RiskLevel, RiskBasedLimits>;
}

export interface OperationLimit {
  operationType: string;
  requestsPerSecond: number;
  requestsPerMinute: number;
  burstLimit: number;
  concurrentExecutions: number;
  maxExecutionTime: number;
  resourceConsumptionLimit: number;
}

export interface ComplexityBasedLimits {
  lowComplexity: OperationLimit;
  mediumComplexity: OperationLimit;
  highComplexity: OperationLimit;
  criticalComplexity: OperationLimit;
}

export interface SecurityLevelLimits {
  requestsPerSecond: number;
  additionalValidationTime: number;
  requiredConfirmations: number;
  auditLevel: string;
}

export interface RiskBasedLimits {
  requestsPerSecond: number;
  cooldownPeriod: number;
  escalationThreshold: number;
  monitoringLevel: string;
}

export interface GlobalRateLimits {
  systemWideRequestsPerSecond: number;
  maxConcurrentConnections: number;
  maxQueueSize: number;
  circuitBreakerThreshold: number;
  emergencyMode: EmergencyModeConfig;
}

export interface EmergencyModeConfig {
  triggerThreshold: number;
  restrictionLevel: number;
  allowedOperations: string[];
  durationMinutes: number;
  autoRecovery: boolean;
}

export interface EnterpriseRateLimitConfig {
  slaCompliance: SLAComplianceConfig;
  fairQueuing: FairQueuingConfig;
  priorityManagement: PriorityManagementConfig;
  analytics: AnalyticsConfig;
}

export interface SLAComplianceConfig {
  guaranteedThroughput: number;
  guaranteedLatency: number;
  availabilityTarget: number;
  penaltyCalculation: PenaltyCalculationConfig;
}

export interface PenaltyCalculationConfig {
  latencyPenaltyPerMs: number;
  throughputPenaltyPerRequest: number;
  availabilityPenaltyPerMinute: number;
  maxPenaltyPerDay: number;
}

export interface FairQueuingConfig {
  enabled: boolean;
  algorithm: 'WEIGHTED_FAIR_QUEUING' | 'DEFICIT_ROUND_ROBIN' | 'CLASS_BASED_QUEUING';
  weights: Record<string, number>;
  maxQueueSize: number;
  dropStrategy: 'TAIL_DROP' | 'RANDOM_EARLY_DETECTION' | 'WEIGHTED_RANDOM_EARLY_DETECTION';
}

export interface PriorityManagementConfig {
  priorityLevels: number;
  priorityMapping: Record<string, number>;
  preemptionEnabled: boolean;
  starvationPrevention: StarvationPreventionConfig;
}

export interface StarvationPreventionConfig {
  enabled: boolean;
  maxWaitTime: number;
  promotionThreshold: number;
  agingFactor: number;
}

export interface AnalyticsConfig {
  enabled: boolean;
  retentionDays: number;
  aggregationIntervals: number[];
  exportFormats: string[];
  realTimeAnalytics: boolean;
}

export interface PerformanceConfig {
  targetProcessingTime: number; // Target: <50ms
  cacheConfig: CacheConfig;
  batchingConfig: BatchingConfig;
  connectionPoolConfig: ConnectionPoolConfig;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  algorithm: 'LRU' | 'LFU' | 'FIFO' | 'ADAPTIVE';
  distributedCache: DistributedCacheConfig;
}

export interface DistributedCacheConfig {
  enabled: boolean;
  replicationFactor: number;
  consistencyLevel: 'EVENTUAL' | 'STRONG' | 'WEAK';
  partitioningStrategy: string;
}

export interface BatchingConfig {
  enabled: boolean;
  batchSize: number;
  maxWaitTime: number;
  dynamicSizing: boolean;
}

export interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  acquisitionTimeout: number;
  idleTimeout: number;
  leakDetectionThreshold: number;
}

export interface ConversationalConfig {
  naturalLanguageEnabled: boolean;
  explanationLevel: 'BASIC' | 'DETAILED' | 'TECHNICAL';
  negotiationEnabled: boolean;
  alternativeSuggestions: boolean;
  userEducationEnabled: boolean;
}

// Rate Limiting State and Context

export interface RateLimitContext {
  userId: string;
  userContext: UserContext;
  apiEndpoint: string;
  method: string;
  operation: string;
  securityLevel: SecurityLevel;
  riskLevel: RiskLevel;
  timestamp: Date;
  requestId: string;
  sessionId: string;
  clientIP: string;
  userAgent: string;
  payloadSize: number;
  expectedComplexity: number;
  recentHistory: RateLimitHistory[];
}

export interface RateLimitHistory {
  timestamp: Date;
  endpoint: string;
  outcome: 'ALLOWED' | 'DENIED' | 'THROTTLED';
  reason?: string;
  waitTime?: number;
}

export interface RateLimitState {
  currentUsage: UsageMetrics;
  windowUsage: WindowUsageMetrics;
  quotaStatus: QuotaStatus;
  throttlingStatus: ThrottlingStatus;
  queueStatus: QueueStatus;
}

export interface UsageMetrics {
  requestsThisSecond: number;
  requestsThisMinute: number;
  requestsThisHour: number;
  requestsThisDay: number;
  burstUsage: number;
  concurrentConnections: number;
}

export interface WindowUsageMetrics {
  windows: TimeWindow[];
  projectedUsage: ProjectedUsage;
  trends: UsageTrend[];
}

export interface TimeWindow {
  startTime: Date;
  endTime: Date;
  requestCount: number;
  averageLatency: number;
  errorRate: number;
}

export interface ProjectedUsage {
  nextMinuteProjection: number;
  nextHourProjection: number;
  confidence: number;
  trendsUsed: string[];
}

export interface UsageTrend {
  period: 'MINUTE' | 'HOUR' | 'DAY';
  direction: 'INCREASING' | 'DECREASING' | 'STABLE';
  rate: number;
  confidence: number;
}

export interface QuotaStatus {
  remainingRequests: number;
  resetTime: Date;
  utilizationPercentage: number;
  quotaType: 'USER' | 'API' | 'OPERATION' | 'GLOBAL';
}

export interface ThrottlingStatus {
  isThrottled: boolean;
  throttleLevel: number;
  reason: string;
  recommendedWaitTime: number;
  estimatedRecoveryTime: Date;
}

export interface QueueStatus {
  position: number;
  estimatedWaitTime: number;
  queueLength: number;
  priority: number;
  canBypass: boolean;
}

// Rate Limiting Decisions and Responses

export interface RateLimitDecision {
  decision: 'ALLOW' | 'DENY' | 'THROTTLE' | 'QUEUE';
  reason: string;
  code: string;
  timestamp: Date;
  processingTime: number;

  // For ALLOW decisions
  remainingQuota?: QuotaStatus;

  // For DENY decisions
  retryAfter?: number;
  alternatives?: RateLimitAlternative[];

  // For THROTTLE decisions
  throttleDelay?: number;
  newLimits?: Partial<RateLimitConfiguration>;

  // For QUEUE decisions
  queuePosition?: number;
  estimatedWaitTime?: number;

  // Conversational response
  conversationalResponse?: ConversationalRateLimitResponse;

  // Analytics
  analytics?: RateLimitAnalytics;
}

export interface RateLimitAlternative {
  type: 'ENDPOINT' | 'METHOD' | 'TIMING' | 'BATCH';
  description: string;
  endpoint?: string;
  method?: string;
  suggestedTime?: Date;
  batchSize?: number;
  estimatedSuccess: number;
}

export interface ConversationalRateLimitResponse {
  explanation: string;
  userFriendlyMessage: string;
  technicalDetails?: string;
  suggestions: string[];
  negotiationOptions?: NegotiationOption[];
  educationalContent?: EducationalContent;
}

export interface NegotiationOption {
  option: string;
  description: string;
  tradeoffs: string[];
  requirements: string[];
  estimatedOutcome: string;
}

export interface EducationalContent {
  topic: string;
  explanation: string;
  bestPractices: string[];
  examples: string[];
  links: string[];
}

export interface RateLimitAnalytics {
  impactAssessment: ImpactAssessment;
  performanceMetrics: PerformanceMetrics;
  userBehaviorInsights: UserBehaviorInsights;
  systemHealthIndicators: SystemHealthIndicators;
}

export interface ImpactAssessment {
  userImpact: 'LOW' | 'MEDIUM' | 'HIGH';
  systemImpact: 'LOW' | 'MEDIUM' | 'HIGH';
  businessImpact: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedRevenueLoss: number;
  userSatisfactionImpact: number;
}

export interface PerformanceMetrics {
  decisionTime: number;
  cacheHitRate: number;
  throughputImpact: number;
  latencyImpact: number;
  resourceUtilization: number;
}

export interface UserBehaviorInsights {
  patternRecognition: string[];
  abuseIndicators: string[];
  legitimacyScore: number;
  behaviorClassification: string;
  recommendedActions: string[];
}

export interface SystemHealthIndicators {
  currentLoad: number;
  capacityUtilization: number;
  errorRate: number;
  responseTime: number;
  alertLevel: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
}

// Rate Limiting Events and Monitoring

export interface RateLimitEvent {
  eventType: RateLimitEventType;
  timestamp: Date;
  context: RateLimitContext;
  decision: RateLimitDecision;
  metadata: Record<string, any>;
}

export type RateLimitEventType =
  | 'REQUEST_EVALUATED'
  | 'LIMIT_EXCEEDED'
  | 'THROTTLE_APPLIED'
  | 'QUEUE_ADDED'
  | 'EMERGENCY_MODE_TRIGGERED'
  | 'CONFIGURATION_CHANGED'
  | 'ABUSE_DETECTED'
  | 'SLA_VIOLATION'
  | 'CAPACITY_THRESHOLD_REACHED';

export interface RateLimitingMetrics {
  // Request metrics
  totalRequests: number;
  allowedRequests: number;
  deniedRequests: number;
  throttledRequests: number;
  queuedRequests: number;

  // Performance metrics
  averageDecisionTime: number;
  p95DecisionTime: number;
  p99DecisionTime: number;
  cacheHitRate: number;

  // Effectiveness metrics
  falsePositiveRate: number;
  falseNegativeRate: number;
  abuseDetectionRate: number;
  userSatisfactionScore: number;

  // System health metrics
  systemLoad: number;
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;

  // Business metrics
  throughputProtection: number;
  revenueLossAverted: number;
  slaCompliance: number;
  customerRetention: number;
}

// Configuration and Management Types

export interface RateLimitConfigurationTemplate {
  name: string;
  description: string;
  version: string;
  applicability: string[];
  configuration: RateLimitConfiguration;
  testResults?: TemplateTestResults;
}

export interface TemplateTestResults {
  performanceScore: number;
  securityScore: number;
  usabilityScore: number;
  recommendations: string[];
  warnings: string[];
}

export interface DynamicRateLimitAdjustment {
  trigger: AdjustmentTrigger;
  adjustment: ConfigurationAdjustment;
  duration: number;
  reversible: boolean;
  reason: string;
  expectedImpact: string;
}

export interface AdjustmentTrigger {
  type: 'LOAD_BASED' | 'TIME_BASED' | 'EVENT_BASED' | 'MANUAL';
  condition: string;
  threshold: number;
  sensitivity: number;
}

export interface ConfigurationAdjustment {
  path: string;
  oldValue: any;
  newValue: any;
  adjustmentType: 'ABSOLUTE' | 'RELATIVE' | 'PERCENTAGE';
}

// Enterprise Features

export interface EnterpriseRateLimitFeatures {
  multiTenantSupport: MultiTenantConfig;
  geographicDistribution: GeographicConfig;
  complianceReporting: ComplianceReportingConfig;
  integrationPoints: IntegrationConfig;
}

export interface MultiTenantConfig {
  enabled: boolean;
  tenantIsolation: 'STRICT' | 'SHARED' | 'HYBRID';
  resourceAllocation: TenantResourceAllocation[];
  crossTenantLimits: CrossTenantLimits;
}

export interface TenantResourceAllocation {
  tenantId: string;
  allocatedCapacity: number;
  priorityLevel: number;
  guaranteedThroughput: number;
  burstAllowance: number;
}

export interface CrossTenantLimits {
  maxTenantsPerNode: number;
  sharedResourceLimits: Record<string, number>;
  isolationMetrics: string[];
}

export interface GeographicConfig {
  regions: RegionConfig[];
  routingStrategy: 'LATENCY_BASED' | 'CAPACITY_BASED' | 'REGULATORY_BASED';
  failoverConfig: FailoverConfig;
}

export interface RegionConfig {
  regionCode: string;
  capacity: number;
  latencyTargets: LatencyTargets;
  regulatoryRequirements: string[];
  localLimits: Partial<RateLimitConfiguration>;
}

export interface LatencyTargets {
  p50: number;
  p95: number;
  p99: number;
  timeout: number;
}

export interface FailoverConfig {
  enabled: boolean;
  triggerThreshold: number;
  failoverTime: number;
  backupRegions: string[];
  dataReplication: 'SYNC' | 'ASYNC' | 'EVENTUAL';
}

export interface ComplianceReportingConfig {
  enabled: boolean;
  reportingInterval: number;
  includedMetrics: string[];
  auditTrailRetention: number;
  encryptionRequired: boolean;
  accessControls: string[];
}

export interface IntegrationConfig {
  monitoringSystemIntegration: MonitoringIntegrationConfig;
  alertingSystemIntegration: AlertingIntegrationConfig;
  loggingSystemIntegration: LoggingIntegrationConfig;
  analyticsSystemIntegration: AnalyticsIntegrationConfig;
}

export interface MonitoringIntegrationConfig {
  enabled: boolean;
  endpoints: IntegrationEndpoint[];
  metrics: string[];
  updateInterval: number;
  authentication: IntegrationAuth;
}

export interface AlertingIntegrationConfig {
  enabled: boolean;
  endpoints: IntegrationEndpoint[];
  alertLevels: string[];
  escalationRules: EscalationRule[];
  authentication: IntegrationAuth;
}

export interface LoggingIntegrationConfig {
  enabled: boolean;
  endpoints: IntegrationEndpoint[];
  logLevels: string[];
  structuredLogging: boolean;
  authentication: IntegrationAuth;
}

export interface AnalyticsIntegrationConfig {
  enabled: boolean;
  endpoints: IntegrationEndpoint[];
  dataTypes: string[];
  batchSize: number;
  authentication: IntegrationAuth;
}

export interface IntegrationEndpoint {
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  timeout: number;
  retryPolicy: RetryPolicy;
}

export interface IntegrationAuth {
  type: 'NONE' | 'API_KEY' | 'OAUTH2' | 'JWT' | 'CERTIFICATE';
  credentials: Record<string, string>;
  refreshInterval?: number;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'FIXED' | 'EXPONENTIAL' | 'LINEAR';
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
}

export interface EscalationRule {
  condition: string;
  delay: number;
  action: string;
  recipients: string[];
  severity: string;
}