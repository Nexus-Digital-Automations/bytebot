/**
 * PARLANT Validation Layer Types and Interfaces
 *
 * Comprehensive type definitions for the PARLANT Integration Layer that enables
 * conversational validation of database functions with intelligent caching,
 * emergency bypass mechanisms, and sub-1000ms response times.
 *
 * @module ValidationLayerTypes
 * @version 1.0.0
 * @author AIgent Integration Team
 */

import { SecurityLevel } from "../../../types/parlant-integration.types";

// Re-export SecurityLevel so it can be imported from this module
export { SecurityLevel };

// ===== CORE VALIDATION TYPES =====

/**
 * Validation request sent to PARLANT for conversational approval
 */
export interface ValidationRequest {
  /** Unique request identifier */
  id: string;

  /** Function being validated */
  functionName: string;

  /** Package/service context */
  packageName: string;

  /** Operation type classification */
  operationType: DatabaseOperationType;

  /** Function parameters for context */
  parameters: Record<string, unknown>;

  /** User context for validation */
  userContext: UserValidationContext;

  /** Security classification */
  securityLevel: SecurityLevel;

  /** Request timestamp */
  timestamp: Date;

  /** Request timeout in milliseconds */
  timeoutMs: number;

  /** Conversation metadata */
  conversationMeta: ConversationMetadata;
}

/**
 * Validation response from PARLANT with decision and context
 */
export interface ValidationResponse {
  /** Correlation ID matching request */
  requestId: string;

  /** Validation decision */
  decision: ValidationDecision;

  /** PARLANT conversation ID for audit trail */
  conversationId: string;

  /** Human-readable reasoning */
  reasoning: string;

  /** Confidence score 0-1 */
  confidence: number;

  /** Execution permissions if approved */
  executionContext?: ExecutionContext;

  /** Response timestamp */
  timestamp: Date;

  /** Processing time in milliseconds */
  processingTimeMs: number;

  /** Cache metadata */
  cacheInfo: CacheMetadata;

  /** Additional validation metadata */
  metadata: ValidationMetadata;
}

/**
 * Conversation context built from function parameters
 */
export interface ConversationContext {
  /** Natural language description of operation */
  operationDescription: string;

  /** Formatted parameter summary */
  parameterSummary: string;

  /** Risk assessment context */
  riskContext: RiskContext;

  /** User intent interpretation */
  userIntent: string;

  /** Business impact assessment */
  businessImpact: BusinessImpact;

  /** Related conversation history */
  conversationHistory?: ConversationHistoryEntry[];
}

/**
 * Intelligent cache entry with optimization metadata
 */
export interface CacheEntry {
  /** Cache key identifier */
  key: string;

  /** Cached validation response */
  response: ValidationResponse;

  /** Cache creation timestamp */
  createdAt: Date;

  /** Cache expiration timestamp */
  expiresAt: Date;

  /** Number of cache hits */
  hitCount: number;

  /** Cache confidence score */
  confidenceScore: number;

  /** Cache entry metadata */
  metadata: CacheEntryMetadata;
}

/**
 * Emergency bypass configuration for critical operations
 */
export interface BypassConfiguration {
  /** Enable emergency bypass */
  enabled: boolean;

  /** Bypass trigger conditions */
  triggers: BypassTrigger[];

  /** Maximum bypass duration in milliseconds */
  maxDurationMs: number;

  /** Required authorization level */
  authorizationLevel: AuthorizationLevel;

  /** Audit requirements */
  auditRequirements: AuditRequirement[];
}

/**
 * Validation metrics for performance monitoring
 */
export interface ValidationMetrics {
  /** Total validation requests */
  totalRequests: number;

  /** Successful validations */
  successfulValidations: number;

  /** Failed validations */
  failedValidations: number;

  /** Cache hit rate percentage */
  cacheHitRate: number;

  /** Average response time in milliseconds */
  averageResponseTimeMs: number;

  /** P95 response time in milliseconds */
  p95ResponseTimeMs: number;

  /** Emergency bypass usage count */
  bypassUsageCount: number;

  /** Metrics collection period */
  periodStart: Date;
  periodEnd: Date;
}

// ===== ENUMERATION TYPES =====

/**
 * Database operation types for validation classification
 */
export enum DatabaseOperationType {
  READ = "read",
  WRITE = "write",
  UPDATE = "update",
  DELETE = "delete",
  BULK_OPERATION = "bulk_operation",
  SCHEMA_CHANGE = "schema_change",
  TRANSACTION = "transaction",
  ADMIN_OPERATION = "admin_operation",
}

/**
 * Validation decision outcomes
 */
export enum ValidationDecision {
  APPROVE = "approve",
  DENY = "deny",
  MODIFY = "modify",
  REQUIRE_CONFIRMATION = "require_confirmation",
  ESCALATE = "escalate",
  BYPASS = "bypass",
}

/**
 * Authorization levels for bypass operations
 */
export enum AuthorizationLevel {
  USER = "user",
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin",
  SYSTEM = "system",
  EMERGENCY = "emergency",
}

/**
 * Cache strategy types
 */
export enum CacheStrategy {
  AGGRESSIVE = "aggressive",
  CONSERVATIVE = "conservative",
  ADAPTIVE = "adaptive",
  DISABLED = "disabled",
}

// ===== SUPPORTING INTERFACES =====

/**
 * User context for validation decisions
 */
export interface UserValidationContext {
  /** User identifier */
  userId: string;

  /** User roles and permissions */
  roles: string[];

  /** Session information */
  sessionId: string;

  /** IP address for security */
  ipAddress: string;

  /** User agent information */
  userAgent?: string;

  /** Additional user metadata */
  metadata: Record<string, unknown>;
}

/**
 * Conversation metadata for PARLANT communication
 */
export interface ConversationMetadata {
  /** Conversation thread ID */
  threadId?: string;

  /** Conversation priority level */
  priority: ConversationPriority;

  /** Required response types */
  responseTypes: ResponseType[];

  /** Language preferences */
  language: string;

  /** Interface preferences */
  interfacePreferences: InterfacePreferences;
}

/**
 * Execution context for approved operations
 */
export interface ExecutionContext {
  /** Execution constraints */
  constraints: ExecutionConstraints;

  /** Resource limits */
  resourceLimits: ResourceLimits;

  /** Monitoring requirements */
  monitoringConfig: MonitoringConfiguration;

  /** Audit trail requirements */
  auditConfig: AuditConfiguration;
}

/**
 * Risk assessment context
 */
export interface RiskContext {
  /** Overall risk level */
  riskLevel: RiskLevel;

  /** Identified risk factors */
  riskFactors: string[];

  /** Risk mitigation strategies */
  mitigationStrategies: string[];

  /** Risk score 0-100 */
  riskScore: number;
}

/**
 * Business impact assessment
 */
export interface BusinessImpact {
  /** Impact severity level */
  severity: ImpactSeverity;

  /** Affected business areas */
  affectedAreas: string[];

  /** Estimated impact duration */
  estimatedDurationMs: number;

  /** Recovery requirements */
  recoveryRequirements: string[];
}

/**
 * Conversation history entry
 */
export interface ConversationHistoryEntry {
  /** History entry ID */
  id: string;

  /** Related function/operation */
  relatedFunction: string;

  /** Previous decision */
  decision: ValidationDecision;

  /** Similarity score to current request */
  similarityScore: number;

  /** Timestamp of previous decision */
  timestamp: Date;
}

/**
 * Cache metadata for optimization
 */
export interface CacheMetadata {
  /** Cache hit/miss status */
  status: CacheStatus;

  /** Cache strategy used */
  strategy: CacheStrategy;

  /** Cache tier (L1, L2, L3) */
  tier: CacheTier;

  /** Time to live remaining */
  ttlRemainingMs: number;
}

/**
 * Cache entry detailed metadata
 */
export interface CacheEntryMetadata {
  /** Cache strategy used */
  strategy: CacheStrategy;

  /** Cache tier location */
  tier: CacheTier;

  /** Entry size in bytes */
  sizeBytes: number;

  /** Access pattern information */
  accessPattern: AccessPattern;

  /** Optimization hints */
  optimizationHints: string[];
}

/**
 * Validation metadata
 */
export interface ValidationMetadata {
  /** Validation source */
  source: ValidationSource;

  /** Processing pipeline stages */
  pipelineStages: PipelineStage[];

  /** Performance metrics */
  performanceMetrics: PerformanceMetrics;

  /** Quality indicators */
  qualityIndicators: QualityIndicator[];
}

/**
 * Bypass trigger conditions
 */
export interface BypassTrigger {
  /** Trigger type */
  type: BypassTriggerType;

  /** Trigger condition */
  condition: string;

  /** Trigger priority */
  priority: number;

  /** Required authorization */
  authorizationRequired: AuthorizationLevel;
}

/**
 * Audit requirements for operations
 */
export interface AuditRequirement {
  /** Audit type */
  type: AuditType;

  /** Audit detail level */
  detailLevel: AuditDetailLevel;

  /** Retention period in days */
  retentionDays: number;

  /** Compliance requirements */
  complianceRequirements: string[];
}

// ===== ADDITIONAL ENUMS =====

export enum ConversationPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent",
  EMERGENCY = "emergency",
}

export enum ResponseType {
  BINARY = "binary",
  DETAILED = "detailed",
  INTERACTIVE = "interactive",
  STREAMING = "streaming",
}

export enum RiskLevel {
  MINIMAL = "minimal",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum ImpactSeverity {
  NEGLIGIBLE = "negligible",
  MINOR = "minor",
  MODERATE = "moderate",
  MAJOR = "major",
  CRITICAL = "critical",
}

export enum CacheStatus {
  HIT = "hit",
  MISS = "miss",
  STALE = "stale",
  EXPIRED = "expired",
  INVALIDATED = "invalidated",
}

export enum CacheTier {
  L1_MEMORY = "l1_memory",
  L2_REDIS = "l2_redis",
  L3_DATABASE = "l3_database",
}

export enum ValidationSource {
  PARLANT_LIVE = "parlant_live",
  CACHE_L1 = "cache_l1",
  CACHE_L2 = "cache_l2",
  CACHE_L3 = "cache_l3",
  FALLBACK = "fallback",
  BYPASS = "bypass",
}

export enum BypassTriggerType {
  TIMEOUT = "timeout",
  CONNECTION_FAILURE = "connection_failure",
  CRITICAL_OPERATION = "critical_operation",
  EMERGENCY_OVERRIDE = "emergency_override",
  MAINTENANCE_MODE = "maintenance_mode",
}

export enum AuditType {
  BASIC = "basic",
  DETAILED = "detailed",
  COMPREHENSIVE = "comprehensive",
  FORENSIC = "forensic",
}

export enum AuditDetailLevel {
  MINIMAL = "minimal",
  STANDARD = "standard",
  DETAILED = "detailed",
  VERBOSE = "verbose",
}

// ===== COMPLEX TYPE DEFINITIONS =====

export interface InterfacePreferences {
  preferredMode: "text" | "voice" | "visual";
  accessibility: AccessibilityOptions;
  responseFormat: "json" | "natural_language" | "structured";
}

export interface AccessibilityOptions {
  screenReader: boolean;
  highContrast: boolean;
  largeText: boolean;
  keyboardOnly: boolean;
}

export interface ExecutionConstraints {
  maxExecutionTimeMs: number;
  allowedOperations: string[];
  restrictedOperations: string[];
  resourceQuotas: ResourceQuota[];
}

export interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxFileSystemAccess: number;
  maxNetworkConnections: number;
}

export interface ResourceQuota {
  resource: string;
  limit: number;
  unit: string;
}

export interface MonitoringConfiguration {
  realTimeMonitoring: boolean;
  metricsCollection: boolean;
  alerting: AlertingConfig;
  dashboard: DashboardConfig;
}

export interface AlertingConfig {
  enabled: boolean;
  thresholds: AlertThreshold[];
  channels: string[];
}

export interface AlertThreshold {
  metric: string;
  threshold: number;
  severity: "info" | "warning" | "critical";
}

export interface DashboardConfig {
  enabled: boolean;
  refreshIntervalMs: number;
  metrics: string[];
}

export interface AuditConfiguration {
  enabled: boolean;
  level: AuditDetailLevel;
  retention: AuditRetentionConfig;
  compliance: ComplianceConfig;
}

export interface AuditRetentionConfig {
  defaultDays: number;
  complianceDays: number;
  archiveAfterDays: number;
}

export interface ComplianceConfig {
  frameworks: string[];
  requirements: ComplianceRequirement[];
}

export interface ComplianceRequirement {
  framework: string;
  requirement: string;
  mandatory: boolean;
}

export interface AccessPattern {
  frequency: AccessFrequency;
  temporal: TemporalPattern;
  user: UserAccessPattern;
}

export enum AccessFrequency {
  RARE = "rare",
  OCCASIONAL = "occasional",
  REGULAR = "regular",
  FREQUENT = "frequent",
  CONSTANT = "constant",
}

export interface TemporalPattern {
  peakHours: number[];
  weeklyPattern: DayOfWeek[];
  seasonality: SeasonalityPattern;
}

export enum DayOfWeek {
  MONDAY = "monday",
  TUESDAY = "tuesday",
  WEDNESDAY = "wednesday",
  THURSDAY = "thursday",
  FRIDAY = "friday",
  SATURDAY = "saturday",
  SUNDAY = "sunday",
}

export interface SeasonalityPattern {
  type: "none" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  strength: number;
}

export interface UserAccessPattern {
  userCount: number;
  concurrency: ConcurrencyPattern;
  geography: GeographicPattern;
}

export interface ConcurrencyPattern {
  averageConcurrentUsers: number;
  peakConcurrentUsers: number;
  concurrencyDistribution: number[];
}

export interface GeographicPattern {
  regions: string[];
  distribution: Record<string, number>;
}

export interface PipelineStage {
  name: string;
  duration: number;
  status: "pending" | "processing" | "completed" | "failed";
  metadata: Record<string, unknown>;
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  resourceUtilization: ResourceUtilization;
}

export interface ResourceUtilization {
  cpu: number;
  memory: number;
  network: number;
  storage: number;
}

export interface QualityIndicator {
  metric: string;
  value: number;
  threshold: number;
  status: "good" | "warning" | "critical";
}

// ===== ERROR TYPES =====

export class ValidationLayerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ValidationLayerError";
  }
}

export class ConversationContextError extends ValidationLayerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "CONVERSATION_CONTEXT_ERROR", details);
    this.name = "ConversationContextError";
  }
}

export class CacheOptimizationError extends ValidationLayerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "CACHE_OPTIMIZATION_ERROR", details);
    this.name = "CacheOptimizationError";
  }
}

export class BypassExecutionError extends ValidationLayerError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "BYPASS_EXECUTION_ERROR", details);
    this.name = "BypassExecutionError";
  }
}
