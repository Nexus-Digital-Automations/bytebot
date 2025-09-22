/**
 * PARLANT Phase 1 Audit Trail System - Core Data Models and Schemas
 *
 * Enterprise-grade audit trail system for comprehensive tracking of all wrapped
 * database operations with forensic-level detail and multi-regulatory compliance.
 *
 * Features:
 * - Function execution logging with full parameter capture
 * - PARLANT validation request/response recording
 * - User context and authorization trail
 * - Performance metrics and timing analysis
 * - Error and exception comprehensive logging
 * - Bypass usage and authorization audit
 * - Security event correlation and analysis
 *
 * Compliance Standards:
 * - GDPR (General Data Protection Regulation)
 * - SOX (Sarbanes-Oxley Act)
 * - HIPAA (Health Insurance Portability and Accountability Act)
 * - PCI-DSS (Payment Card Industry Data Security Standard)
 *
 * @fileoverview Core audit data models and schemas
 * @version 1.0.0
 * @author Claude Code - Audit Trail System Agent
 */

import {
  ParlantValidationRequest,
  ParlantValidationResponse,
  RiskLevel,
  SecurityLevel,
  FunctionContext,
  ValidationResult,
  ErrorDetails,
  PerformanceMetrics,
} from "../../../types/parlant.types";

// Import types from compliance-forensic for early usage
import { ComplianceMetadata } from "./compliance-forensic.types";

// Import types from audit-extended for early usage
import { AuditParlantResponse } from "./audit-extended.types";

// Re-export types needed by other modules
export { RiskLevel };

// ===========================
// MISSING TYPE DEFINITIONS
// ===========================

/**
 * Compliance classification for data and operations
 */
export interface ComplianceClassification {
  classificationLevel: string;
  dataCategory: string;
  sensitivityLevel: string;
  retentionPeriod: string;
  handlingRequirements: string[];
}

/**
 * Parlant validation session context
 */
export interface ParlantValidationSession {
  sessionId: string;
  timestamp: Date;
  validationType: string;
  context: Record<string, unknown>;
}

/**
 * Conversation analysis data
 */
export interface ConversationAnalysis {
  analysisId: string;
  sentiment: string;
  topics: string[];
  confidence: number;
  metadata: Record<string, unknown>;
}

/**
 * Decision reasoning information
 */
export interface DecisionReasoning {
  decisionId: string;
  reasoning: string;
  factors: string[];
  confidence: number;
  timestamp: Date;
}

// BypassInfo is defined later in the file with more comprehensive properties

// ===========================
// CORE AUDIT TYPES
// ===========================

/**
 * Unique audit event identifier with forensic traceability
 */
export type AuditEventId = string & { __auditEventId: never };

/**
 * Audit trail session identifier for grouping related events
 */
export type AuditSessionId = string & { __auditSessionId: never };

/**
 * Database operation audit identifier
 */
export type DatabaseOperationId = string & { __databaseOperationId: never };

/**
 * Compliance audit identifier for regulatory tracking
 */
export type ComplianceAuditId = string & { __complianceAuditId: never };

/**
 * Forensic evidence identifier for evidence chain preservation
 */
export type ForensicEvidenceId = string & { __forensicEvidenceId: never };

// ===========================
// AUDIT EVENT TYPES
// ===========================

/**
 * Comprehensive audit event types for all database operations
 */
export enum AuditEventType {
  // Function Execution Events
  FUNCTION_EXECUTION_STARTED = "function_execution_started",
  FUNCTION_EXECUTION_COMPLETED = "function_execution_completed",
  FUNCTION_EXECUTION_FAILED = "function_execution_failed",
  FUNCTION_PARAMETER_CAPTURED = "function_parameter_captured",
  FUNCTION_RETURN_VALUE_CAPTURED = "function_return_value_captured",

  // PARLANT Validation Events
  PARLANT_VALIDATION_REQUESTED = "parlant_validation_requested",
  PARLANT_VALIDATION_RECEIVED = "parlant_validation_received",
  PARLANT_VALIDATION_APPROVED = "parlant_validation_approved",
  PARLANT_VALIDATION_DENIED = "parlant_validation_denied",
  PARLANT_VALIDATION_BYPASSED = "parlant_validation_bypassed",
  PARLANT_VALIDATION_TIMEOUT = "parlant_validation_timeout",
  PARLANT_VALIDATION_ERROR = "parlant_validation_error",

  // Database Operation Events
  DATABASE_OPERATION_INITIATED = "database_operation_initiated",
  DATABASE_OPERATION_EXECUTED = "database_operation_executed",
  DATABASE_OPERATION_ROLLED_BACK = "database_operation_rolled_back",
  DATABASE_TRANSACTION_STARTED = "database_transaction_started",
  DATABASE_TRANSACTION_COMMITTED = "database_transaction_committed",
  DATABASE_TRANSACTION_ABORTED = "database_transaction_aborted",

  // User Context and Authorization Events
  USER_AUTHENTICATION_SUCCESS = "user_authentication_success",
  USER_AUTHENTICATION_FAILED = "user_authentication_failed",
  USER_AUTHORIZATION_GRANTED = "user_authorization_granted",
  USER_AUTHORIZATION_DENIED = "user_authorization_denied",
  USER_PERMISSION_ESCALATED = "user_permission_escalated",
  USER_SESSION_CREATED = "user_session_created",
  USER_SESSION_EXPIRED = "user_session_expired",

  // Security Events
  SECURITY_VIOLATION_DETECTED = "security_violation_detected",
  SECURITY_ANOMALY_DETECTED = "security_anomaly_detected",
  SECURITY_POLICY_ENFORCED = "security_policy_enforced",
  SECURITY_BYPASS_ATTEMPTED = "security_bypass_attempted",
  SECURITY_ENCRYPTION_APPLIED = "security_encryption_applied",
  SECURITY_INTEGRITY_VERIFIED = "security_integrity_verified",

  // Performance and System Events
  PERFORMANCE_THRESHOLD_EXCEEDED = "performance_threshold_exceeded",
  PERFORMANCE_OPTIMIZATION_APPLIED = "performance_optimization_applied",
  SYSTEM_RESOURCE_EXHAUSTED = "system_resource_exhausted",
  SYSTEM_ERROR_OCCURRED = "system_error_occurred",
  SYSTEM_RECOVERY_INITIATED = "system_recovery_initiated",

  // Compliance Events
  COMPLIANCE_RULE_APPLIED = "compliance_rule_applied",
  COMPLIANCE_VIOLATION_DETECTED = "compliance_violation_detected",
  COMPLIANCE_AUDIT_STARTED = "compliance_audit_started",
  COMPLIANCE_AUDIT_COMPLETED = "compliance_audit_completed",
  COMPLIANCE_REPORT_GENERATED = "compliance_report_generated",

  // Administrative Events
  ADMIN_CONFIGURATION_CHANGED = "admin_configuration_changed",
  ADMIN_POLICY_UPDATED = "admin_policy_updated",
  ADMIN_USER_CREATED = "admin_user_created",
  ADMIN_USER_MODIFIED = "admin_user_modified",
  ADMIN_USER_DELETED = "admin_user_deleted",
  ADMIN_AUDIT_ACCESSED = "admin_audit_accessed",
}

/**
 * Audit event severity levels for classification and alerting
 */
export enum AuditEventSeverity {
  TRACE = "trace", // Detailed tracing information
  DEBUG = "debug", // Debug-level information
  INFO = "info", // Informational events
  NOTICE = "notice", // Normal but significant events
  WARNING = "warning", // Warning conditions
  ERROR = "error", // Error conditions
  CRITICAL = "critical", // Critical conditions
  ALERT = "alert", // Action must be taken immediately
  EMERGENCY = "emergency", // System is unusable
}

/**
 * Audit event status for tracking event lifecycle
 */
export enum AuditEventStatus {
  INITIATED = "initiated", // Event initiated but not complete
  IN_PROGRESS = "in_progress", // Event currently being processed
  COMPLETED = "completed", // Event successfully completed
  FAILED = "failed", // Event failed to complete
  CANCELLED = "cancelled", // Event was cancelled
  TIMEOUT = "timeout", // Event timed out
  CORRUPTED = "corrupted", // Event data corrupted
}

// ===========================
// AUDIT EVENT CORE STRUCTURE
// ===========================

/**
 * Core audit event structure for all database operations
 */
export interface AuditEvent {
  /** Unique audit event identifier */
  eventId: AuditEventId;

  /** Audit session identifier for grouping related events */
  sessionId: AuditSessionId;

  /** Database operation identifier */
  operationId: DatabaseOperationId;

  /** Event type classification */
  eventType: AuditEventType;

  /** Event severity level */
  severity: AuditEventSeverity;

  /** Event status */
  status: AuditEventStatus;

  /** Event timestamp with high precision */
  timestamp: Date;

  /** Microsecond precision timestamp for forensic analysis */
  timestampMicros: number;

  /** Source of the audit event */
  source: AuditEventSource;

  /** User context associated with the event */
  userContext: AuditUserContext;

  /** Function context if applicable */
  functionContext?: AuditFunctionContext;

  /** PARLANT validation context if applicable */
  parlantContext?: AuditParlantContext;

  /** Database operation context if applicable */
  databaseContext?: AuditDatabaseContext;

  /** Security context for the event */
  securityContext: AuditSecurityContext;

  /** Performance metrics for the event */
  performanceMetrics: AuditPerformanceMetrics;

  /** Event payload data */
  payload: AuditEventPayload;

  /** Compliance metadata */
  complianceMetadata: ComplianceMetadata;

  /** Forensic metadata for evidence chain */
  forensicMetadata: ForensicMetadata;

  /** Event correlation information */
  correlationData: EventCorrelationData;

  /** Event integrity verification */
  integrityVerification: IntegrityVerification;
}

/**
 * Audit event source information
 */
export interface AuditEventSource {
  /** Source system identifier */
  systemId: string;

  /** Source service identifier */
  serviceId: string;

  /** Source module or component */
  module: string;

  /** Source function or method */
  function: string;

  /** Source file path */
  filePath: string;

  /** Source line number */
  lineNumber: number;

  /** Source code version or commit hash */
  codeVersion: string;

  /** Deployment environment */
  environment: string;

  /** Host system information */
  hostInfo: HostSystemInfo;
}

/**
 * Host system information for audit traceability
 */
export interface HostSystemInfo {
  /** Hostname */
  hostname: string;

  /** IP address */
  ipAddress: string;

  /** Operating system */
  operatingSystem: string;

  /** OS version */
  osVersion: string;

  /** Process ID */
  processId: number;

  /** Thread ID */
  threadId: number;

  /** Container ID if applicable */
  containerId?: string;

  /** Kubernetes pod name if applicable */
  podName?: string;

  /** Kubernetes namespace if applicable */
  namespace?: string;
}

/**
 * Audit user context with enhanced security tracking
 */
export interface AuditUserContext {
  /** User identifier */
  userId: string;

  /** User session identifier */
  sessionId: string;

  /** User roles at time of event */
  roles: string[];

  /** User permissions at time of event */
  permissions: string[];

  /** User authentication method */
  authenticationMethod: string;

  /** Authentication timestamp */
  authenticationTimestamp: Date;

  /** User IP address */
  ipAddress: string;

  /** User agent string */
  userAgent: string;

  /** Geographic location if available */
  geolocation?: GeolocationData;

  /** Device information */
  deviceInfo?: DeviceInfo;

  /** Multi-factor authentication status */
  mfaStatus: MfaStatus;

  /** Security clearance level */
  securityClearance: string;
}

/**
 * Geographic location data for audit tracking
 */
export interface GeolocationData {
  /** Latitude */
  latitude: number;

  /** Longitude */
  longitude: number;

  /** Country code */
  countryCode: string;

  /** State or region */
  region: string;

  /** City */
  city: string;

  /** Timezone */
  timezone: string;

  /** ISP information */
  isp?: string;
}

/**
 * Device information for security tracking
 */
export interface DeviceInfo {
  /** Device type */
  deviceType: string;

  /** Device model */
  deviceModel: string;

  /** Operating system */
  operatingSystem: string;

  /** Browser information */
  browser: string;

  /** Screen resolution */
  screenResolution: string;

  /** Device fingerprint */
  deviceFingerprint: string;

  /** Trusted device status */
  trustedDevice: boolean;
}

/**
 * Multi-factor authentication status
 */
export interface MfaStatus {
  /** MFA enabled */
  enabled: boolean;

  /** MFA method used */
  method?: string;

  /** MFA verification timestamp */
  verificationTimestamp?: Date;

  /** MFA device identifier */
  deviceId?: string;

  /** MFA bypass reason if applicable */
  bypassReason?: string;
}

/**
 * Audit function context with comprehensive parameter tracking
 */
export interface AuditFunctionContext {
  /** Original function context */
  originalContext: FunctionContext;

  /** Function wrapper information */
  wrapperInfo: FunctionWrapperInfo;

  /** Function parameters with sanitization */
  parameters: ParameterCapture;

  /** Function return value with sanitization */
  returnValue?: ReturnValueCapture;

  /** Function execution metrics */
  executionMetrics: FunctionExecutionMetrics;

  /** Function security assessment */
  securityAssessment: FunctionSecurityAssessment;
}

/**
 * Function wrapper information for audit tracking
 */
export interface FunctionWrapperInfo {
  /** Wrapper type */
  wrapperType: string;

  /** Wrapper version */
  wrapperVersion: string;

  /** Wrapper configuration */
  configuration: Record<string, unknown>;

  /** Wrapper applied timestamp */
  appliedTimestamp: Date;

  /** Wrapper bypass status */
  bypassStatus: BypassStatus;
}

/**
 * Parameter capture with data sanitization and compliance
 */
export interface ParameterCapture {
  /** Raw parameters (sanitized) */
  rawParameters: Record<string, unknown>;

  /** Parameter metadata */
  parameterMetadata: ParameterMetadata[];

  /** Sensitive data indicators */
  sensitiveDataIndicators: SensitiveDataIndicator[];

  /** Data sanitization applied */
  sanitizationApplied: SanitizationInfo[];

  /** Compliance classification */
  complianceClassification: ComplianceClassification;
}

/**
 * Parameter metadata for individual parameters
 */
export interface ParameterMetadata {
  /** Parameter name */
  name: string;

  /** Parameter type */
  type: string;

  /** Parameter size in bytes */
  size: number;

  /** Parameter value hash */
  valueHash: string;

  /** Sensitive data classification */
  sensitiveDataType?: SensitiveDataType;

  /** Compliance requirements */
  complianceRequirements: string[];

  /** Encryption status */
  encrypted: boolean;

  /** Redaction applied */
  redacted: boolean;
}

/**
 * Sensitive data type classification
 */
export enum SensitiveDataType {
  PII = "pii", // Personally Identifiable Information
  PHI = "phi", // Protected Health Information
  FINANCIAL = "financial", // Financial data
  PAYMENT_CARD = "payment_card", // Payment card data
  CREDENTIALS = "credentials", // Authentication credentials
  API_KEYS = "api_keys", // API keys and tokens
  BIOMETRIC = "biometric", // Biometric data
  GENETIC = "genetic", // Genetic information
  BEHAVIORAL = "behavioral", // Behavioral data
  LOCATION = "location", // Location data
}

/**
 * Sensitive data indicator for compliance tracking
 */
export interface SensitiveDataIndicator {
  /** Data type */
  dataType: SensitiveDataType;

  /** Field path in parameters */
  fieldPath: string;

  /** Detection method */
  detectionMethod: string;

  /** Confidence score */
  confidence: number;

  /** Compliance implications */
  complianceImplications: string[];

  /** Required protections */
  requiredProtections: string[];
}

/**
 * Data sanitization information
 */
export interface SanitizationInfo {
  /** Sanitization type */
  type: SanitizationType;

  /** Field path sanitized */
  fieldPath: string;

  /** Sanitization method */
  method: string;

  /** Original data hash */
  originalDataHash: string;

  /** Sanitized data hash */
  sanitizedDataHash: string;

  /** Sanitization timestamp */
  timestamp: Date;

  /** Reversible sanitization */
  reversible: boolean;
}

/**
 * Sanitization types for data protection
 */
export enum SanitizationType {
  REDACTION = "redaction", // Data redacted with placeholders
  MASKING = "masking", // Data masked with patterns
  TOKENIZATION = "tokenization", // Data replaced with tokens
  ENCRYPTION = "encryption", // Data encrypted
  HASHING = "hashing", // Data hashed
  PSEUDONYMIZATION = "pseudonymization", // Data pseudonymized
  ANONYMIZATION = "anonymization", // Data anonymized
  TRUNCATION = "truncation", // Data truncated
}

/**
 * Return value capture with security analysis
 */
export interface ReturnValueCapture {
  /** Return value (sanitized) */
  value: unknown;

  /** Return value metadata */
  metadata: ReturnValueMetadata;

  /** Sensitive data in return value */
  sensitiveDataIndicators: SensitiveDataIndicator[];

  /** Data leakage assessment */
  dataLeakageAssessment: DataLeakageAssessment;
}

/**
 * Return value metadata
 */
export interface ReturnValueMetadata {
  /** Return type */
  type: string;

  /** Return value size */
  size: number;

  /** Return value hash */
  valueHash: string;

  /** Complex object structure */
  objectStructure?: ObjectStructure;

  /** Serialization format */
  serializationFormat: string;
}

/**
 * Object structure analysis for complex return values
 */
export interface ObjectStructure {
  /** Object type */
  type: string;

  /** Property count */
  propertyCount: number;

  /** Nested object depth */
  nestedDepth: number;

  /** Array element count */
  arrayElementCount?: number;

  /** Property metadata */
  properties: PropertyMetadata[];
}

/**
 * Property metadata for object analysis
 */
export interface PropertyMetadata {
  /** Property name */
  name: string;

  /** Property type */
  type: string;

  /** Property path */
  path: string;

  /** Sensitive data classification */
  sensitiveDataType?: SensitiveDataType;

  /** Nested object indicator */
  isNestedObject: boolean;

  /** Array indicator */
  isArray: boolean;
}

/**
 * Data leakage assessment for return values
 */
export interface DataLeakageAssessment {
  /** Leakage risk level */
  riskLevel: RiskLevel;

  /** Potential leakage types */
  potentialLeakageTypes: DataLeakageType[];

  /** Mitigation recommendations */
  mitigationRecommendations: string[];

  /** Compliance violations */
  complianceViolations: string[];
}

/**
 * Data leakage types
 */
export enum DataLeakageType {
  UNINTENTIONAL_PII_EXPOSURE = "unintentional_pii_exposure",
  EXCESSIVE_DATA_RETURN = "excessive_data_return",
  UNAUTHORIZED_DATA_ACCESS = "unauthorized_data_access",
  CROSS_TENANT_DATA_LEAK = "cross_tenant_data_leak",
  PRIVILEGE_ESCALATION_DATA = "privilege_escalation_data",
  DEBUG_INFORMATION_LEAK = "debug_information_leak",
  SYSTEM_METADATA_EXPOSURE = "system_metadata_exposure",
}

/**
 * Function execution metrics for performance analysis
 */
export interface FunctionExecutionMetrics {
  /** Execution start timestamp */
  startTimestamp: Date;

  /** Execution end timestamp */
  endTimestamp: Date;

  /** Total execution time in microseconds */
  executionTimeMicros: number;

  /** CPU time used */
  cpuTimeMicros: number;

  /** Memory allocation */
  memoryAllocated: number;

  /** Memory peak usage */
  memoryPeakUsage: number;

  /** I/O operations count */
  ioOperationsCount: number;

  /** Network requests count */
  networkRequestsCount: number;

  /** Database queries count */
  databaseQueriesCount: number;

  /** Cache operations count */
  cacheOperationsCount: number;

  /** Error count */
  errorCount: number;

  /** Retry count */
  retryCount: number;
}

/**
 * Function security assessment
 */
export interface FunctionSecurityAssessment {
  /** Security level */
  securityLevel: SecurityLevel;

  /** Risk level */
  riskLevel: RiskLevel;

  /** Security violations detected */
  securityViolations: SecurityViolation[];

  /** Authorization checks performed */
  authorizationChecks: AuthorizationCheck[];

  /** Input validation results */
  inputValidationResults: InputValidationResult[];

  /** Output validation results */
  outputValidationResults: OutputValidationResult[];

  /** Security recommendations */
  securityRecommendations: string[];
}

/**
 * Security violation details
 */
export interface SecurityViolation {
  /** Violation type */
  type: SecurityViolationType;

  /** Violation severity */
  severity: AuditEventSeverity;

  /** Violation description */
  description: string;

  /** Detection method */
  detectionMethod: string;

  /** Remediation actions */
  remediationActions: string[];

  /** Compliance impact */
  complianceImpact: string[];
}

/**
 * Security violation types
 */
export enum SecurityViolationType {
  UNAUTHORIZED_ACCESS = "unauthorized_access",
  PRIVILEGE_ESCALATION = "privilege_escalation",
  INPUT_INJECTION = "input_injection",
  OUTPUT_INFORMATION_LEAK = "output_information_leak",
  AUTHENTICATION_BYPASS = "authentication_bypass",
  AUTHORIZATION_BYPASS = "authorization_bypass",
  INSECURE_CONFIGURATION = "insecure_configuration",
  CRYPTOGRAPHIC_WEAKNESS = "cryptographic_weakness",
  DATA_INTEGRITY_VIOLATION = "data_integrity_violation",
  DENIAL_OF_SERVICE = "denial_of_service",
}

/**
 * Authorization check details
 */
export interface AuthorizationCheck {
  /** Check type */
  type: AuthorizationCheckType;

  /** Check result */
  result: AuthorizationResult;

  /** Required permissions */
  requiredPermissions: string[];

  /** User permissions */
  userPermissions: string[];

  /** Check timestamp */
  timestamp: Date;

  /** Check duration */
  durationMicros: number;

  /** Additional context */
  context: Record<string, unknown>;
}

/**
 * Authorization check types
 */
export enum AuthorizationCheckType {
  ROLE_BASED = "role_based",
  PERMISSION_BASED = "permission_based",
  ATTRIBUTE_BASED = "attribute_based",
  RULE_BASED = "rule_based",
  CONTEXT_BASED = "context_based",
  TIME_BASED = "time_based",
  LOCATION_BASED = "location_based",
}

/**
 * Authorization check results
 */
export enum AuthorizationResult {
  GRANTED = "granted",
  DENIED = "denied",
  CONDITIONAL = "conditional",
  ESCALATION_REQUIRED = "escalation_required",
  INSUFFICIENT_INFORMATION = "insufficient_information",
  ERROR = "error",
}

/**
 * Input validation result
 */
export interface InputValidationResult {
  /** Validation rule applied */
  rule: string;

  /** Validation result */
  result: ValidationResultType;

  /** Validation message */
  message: string;

  /** Field path validated */
  fieldPath: string;

  /** Validation severity */
  severity: AuditEventSeverity;

  /** Validation timestamp */
  timestamp: Date;
}

/**
 * Output validation result
 */
export interface OutputValidationResult {
  /** Validation rule applied */
  rule: string;

  /** Validation result */
  result: ValidationResultType;

  /** Validation message */
  message: string;

  /** Field path validated */
  fieldPath: string;

  /** Validation severity */
  severity: AuditEventSeverity;

  /** Validation timestamp */
  timestamp: Date;
}

/**
 * Validation result types
 */
export enum ValidationResultType {
  PASSED = "passed",
  FAILED = "failed",
  WARNING = "warning",
  SKIPPED = "skipped",
  ERROR = "error",
}

// ===========================
// PARLANT AUDIT CONTEXT
// ===========================

/**
 * PARLANT validation audit context
 */
export interface AuditParlantContext {
  /** Validation request data */
  validationRequest: AuditParlantRequest;

  /** Validation response data */
  validationResponse?: AuditParlantResponse;

  /** Validation session information */
  validationSession: ParlantValidationResponse;

  /** Conversation analysis */
  conversationAnalysis: ConversationAnalysis;

  /** Decision reasoning */
  decisionReasoning: DecisionReasoning;

  /** Bypass information if applicable */
  bypassInfo?: BypassInfo;
}

/**
 * Audit PARLANT request with enhanced tracking
 */
export interface AuditParlantRequest {
  /** Original request */
  originalRequest: ParlantValidationRequest;

  /** Request preprocessing */
  preprocessing: RequestPreprocessing;

  /** Risk assessment */
  riskAssessment: RiskAssessment;

  /** Request routing */
  requestRouting: RequestRouting;

  /** Request validation */
  requestValidation: RequestValidation;
}

/**
 * Request preprocessing information
 */
export interface RequestPreprocessing {
  /** Preprocessing steps applied */
  steps: PreprocessingStep[];

  /** Data transformations */
  transformations: DataTransformation[];

  /** Sanitization applied */
  sanitization: SanitizationInfo[];

  /** Validation rules applied */
  validationRules: string[];
}

/**
 * Preprocessing step details
 */
export interface PreprocessingStep {
  /** Step name */
  name: string;

  /** Step type */
  type: string;

  /** Step start time */
  startTime: Date;

  /** Step end time */
  endTime: Date;

  /** Step result */
  result: string;

  /** Step metadata */
  metadata: Record<string, unknown>;
}

/**
 * Data transformation details
 */
export interface DataTransformation {
  /** Transformation type */
  type: string;

  /** Source format */
  sourceFormat: string;

  /** Target format */
  targetFormat: string;

  /** Transformation rules */
  rules: string[];

  /** Transformation timestamp */
  timestamp: Date;
}

/**
 * Risk assessment details
 */
export interface RiskAssessment {
  /** Overall risk level */
  overallRiskLevel: RiskLevel;

  /** Risk factors */
  riskFactors: RiskFactor[];

  /** Risk score */
  riskScore: number;

  /** Risk calculation method */
  calculationMethod: string;

  /** Risk assessment timestamp */
  timestamp: Date;
}

/**
 * Risk factor details
 */
export interface RiskFactor {
  /** Factor name */
  name: string;

  /** Factor category */
  category: RiskFactorCategory;

  /** Factor weight */
  weight: number;

  /** Factor score */
  score: number;

  /** Factor description */
  description: string;

  /** Mitigation strategies */
  mitigationStrategies: string[];
}

/**
 * Risk factor categories
 */
export enum RiskFactorCategory {
  SECURITY = "security",
  COMPLIANCE = "compliance",
  OPERATIONAL = "operational",
  BUSINESS = "business",
  TECHNICAL = "technical",
  REGULATORY = "regulatory",
}

/**
 * Request routing information
 */
export interface RequestRouting {
  /** Routing strategy */
  strategy: string;

  /** Target endpoint */
  targetEndpoint: string;

  /** Routing rules applied */
  rulesApplied: string[];

  /** Load balancing info */
  loadBalancingInfo: LoadBalancingInfo;

  /** Failover information */
  failoverInfo?: FailoverInfo;
}

/**
 * Load balancing information
 */
export interface LoadBalancingInfo {
  /** Algorithm used */
  algorithm: string;

  /** Available endpoints */
  availableEndpoints: string[];

  /** Selected endpoint */
  selectedEndpoint: string;

  /** Selection reasoning */
  selectionReasoning: string;

  /** Health check status */
  healthCheckStatus: Record<string, string>;
}

/**
 * Failover information
 */
export interface FailoverInfo {
  /** Failover triggered */
  triggered: boolean;

  /** Original endpoint */
  originalEndpoint: string;

  /** Failover endpoint */
  failoverEndpoint: string;

  /** Failover reason */
  reason: string;

  /** Failover timestamp */
  timestamp: Date;
}

/**
 * Request validation details
 */
export interface RequestValidation {
  /** Schema validation */
  schemaValidation: SchemaValidationResult;

  /** Business rule validation */
  businessRuleValidation: BusinessRuleValidationResult[];

  /** Security validation */
  securityValidation: SecurityValidationResult;

  /** Compliance validation */
  complianceValidation: ComplianceValidationResult;
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  /** Validation passed */
  passed: boolean;

  /** Schema version */
  schemaVersion: string;

  /** Validation errors */
  errors: SchemaValidationError[];

  /** Validation warnings */
  warnings: SchemaValidationWarning[];
}

/**
 * Schema validation error
 */
export interface SchemaValidationError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Field path */
  fieldPath: string;

  /** Expected value */
  expectedValue: string;

  /** Actual value */
  actualValue: string;
}

/**
 * Schema validation warning
 */
export interface SchemaValidationWarning {
  /** Warning code */
  code: string;

  /** Warning message */
  message: string;

  /** Field path */
  fieldPath: string;

  /** Recommended action */
  recommendedAction: string;
}

/**
 * Business rule validation result
 */
export interface BusinessRuleValidationResult {
  /** Rule identifier */
  ruleId: string;

  /** Rule name */
  ruleName: string;

  /** Validation result */
  result: ValidationResultType;

  /** Rule description */
  description: string;

  /** Error message if failed */
  errorMessage?: string;

  /** Rule parameters */
  parameters: Record<string, unknown>;
}

/**
 * Security validation result
 */
export interface SecurityValidationResult {
  /** Overall security score */
  securityScore: number;

  /** Security checks performed */
  checksPerformed: SecurityCheck[];

  /** Security violations found */
  violationsFound: SecurityViolation[];

  /** Security recommendations */
  recommendations: string[];
}

/**
 * Security check details
 */
export interface SecurityCheck {
  /** Check name */
  name: string;

  /** Check type */
  type: SecurityCheckType;

  /** Check result */
  result: SecurityCheckResult;

  /** Check details */
  details: string;

  /** Check timestamp */
  timestamp: Date;
}

/**
 * Security check types
 */
export enum SecurityCheckType {
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  INPUT_SANITIZATION = "input_sanitization",
  OUTPUT_ENCODING = "output_encoding",
  CRYPTOGRAPHIC_VALIDATION = "cryptographic_validation",
  CERTIFICATE_VALIDATION = "certificate_validation",
  TOKEN_VALIDATION = "token_validation",
  SESSION_VALIDATION = "session_validation",
}

/**
 * Security check results
 */
export enum SecurityCheckResult {
  PASSED = "passed",
  FAILED = "failed",
  WARNING = "warning",
  NOT_APPLICABLE = "not_applicable",
  ERROR = "error",
}

/**
 * Compliance validation result
 */
export interface ComplianceValidationResult {
  /** Overall compliance status */
  overallStatus: ComplianceStatus;

  /** Compliance checks performed */
  checksPerformed: ComplianceCheck[];

  /** Compliance violations found */
  violationsFound: ComplianceViolation[];

  /** Compliance score */
  complianceScore: number;
}

/**
 * Compliance check details
 */
export interface ComplianceCheck {
  /** Check identifier */
  checkId: string;

  /** Compliance framework */
  framework: ComplianceFramework;

  /** Check name */
  name: string;

  /** Check result */
  result: ComplianceCheckResult;

  /** Check details */
  details: string;

  /** Required actions */
  requiredActions: string[];
}

/**
 * Compliance frameworks
 */
export enum ComplianceFramework {
  GDPR = "gdpr",
  SOX = "sox",
  HIPAA = "hipaa",
  PCI_DSS = "pci_dss",
  ISO_27001 = "iso_27001",
  NIST = "nist",
  FedRAMP = "fedramp",
  SOC2 = "soc2",
}

/**
 * Compliance check results
 */
export enum ComplianceCheckResult {
  PASSED = "passed",
  FAILED = "failed",
  WARNING = "warning",
  NOT_APPLICABLE = "not_applicable",
  REQUIRES_MANUAL_REVIEW = "requires_manual_review",
}

/**
 * Compliance violation details
 */
export interface ComplianceViolation {
  /** Violation identifier */
  violationId: string;

  /** Compliance framework */
  framework: ComplianceFramework;

  /** Violation type */
  type: ComplianceViolationType;

  /** Violation severity */
  severity: ComplianceViolationSeverity;

  /** Violation description */
  description: string;

  /** Legal implications */
  legalImplications: string[];

  /** Remediation steps */
  remediationSteps: string[];

  /** Deadline for remediation */
  remediationDeadline?: Date;
}

/**
 * Compliance violation types
 */
export enum ComplianceViolationType {
  DATA_PROTECTION = "data_protection",
  PRIVACY = "privacy",
  FINANCIAL_REPORTING = "financial_reporting",
  ACCESS_CONTROL = "access_control",
  AUDIT_TRAIL = "audit_trail",
  DATA_RETENTION = "data_retention",
  ENCRYPTION = "encryption",
  INCIDENT_RESPONSE = "incident_response",
}

/**
 * Compliance violation severity
 */
export enum ComplianceViolationSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
  SEVERE = "severe",
}

// ===========================
// MISSING TYPES - PERFORMANCE METRICS
// ===========================

/**
 * Comprehensive audit performance metrics
 */
export interface AuditPerformanceMetrics {
  /** Execution start timestamp */
  startTimestamp: Date;

  /** Execution end timestamp */
  endTimestamp: Date;

  /** Total execution time in microseconds */
  executionTimeMicros: number;

  /** CPU time used */
  cpuTimeMicros: number;

  /** Memory allocation */
  memoryAllocated: number;

  /** Memory peak usage */
  memoryPeakUsage: number;

  /** I/O operations count */
  ioOperationsCount: number;

  /** Network requests count */
  networkRequestsCount: number;

  /** Database queries count */
  databaseQueriesCount: number;

  /** Cache operations count */
  cacheOperationsCount: number;

  /** Error count */
  errorCount: number;

  /** Retry count */
  retryCount: number;

  /** Capture timestamp */
  captureTimestamp: Date;

  /** Processing start timestamp */
  processingStartTimestamp: Date;

  /** Processing end timestamp */
  processingEndTimestamp: Date;

  /** Total processing time in microseconds */
  totalProcessingTimeMicros: number;

  /** Validation time in microseconds */
  validationTimeMicros: number;

  /** Enrichment time in microseconds */
  enrichmentTimeMicros: number;

  /** Storage time in microseconds */
  storageTimeMicros: number;

  /** Compression time in microseconds */
  compressionTimeMicros: number;

  /** Encryption time in microseconds */
  encryptionTimeMicros: number;

  /** Network latency in microseconds */
  networkLatencyMicros: number;

  /** Disk I/O time in microseconds */
  diskIoTimeMicros: number;

  /** Memory usage in bytes */
  memoryUsageBytes: number;

  /** CPU usage in microseconds */
  cpuUsageMicros: number;

  /** Resource utilization */
  resourceUtilization: {
    cpuPercent: number;
    memoryPercent: number;
    diskPercent: number;
    networkPercent: number;
  };

  /** Performance impact assessment */
  performanceImpact: {
    systemImpact: string;
    userImpact: string;
    businessImpact: string;
  };

  /** Optimization opportunities */
  optimizationOpportunities: string[];

  /** Performance alerts */
  performanceAlerts: string[];
}

// ===========================
// MISSING TYPES - EVENT PAYLOAD
// ===========================

/**
 * Comprehensive audit event payload
 */
export interface AuditEventPayload {
  /** Event-specific data */
  eventData: Record<string, unknown>;

  /** Function execution data */
  functionData?: FunctionExecutionData;

  /** PARLANT validation data */
  parlantData?: ParlantValidationData;

  /** Database operation data */
  databaseData?: DatabaseOperationData;

  /** Security event data */
  securityData?: SecurityEventData;

  /** Performance data */
  performanceData?: PerformanceEventData;

  /** Error data */
  errorData?: ErrorEventData;
}

/**
 * Function execution data
 */
export interface FunctionExecutionData {
  /** Function name */
  functionName: string;

  /** Function parameters */
  parameters: Record<string, unknown>;

  /** Function return value */
  returnValue?: unknown;

  /** Execution context */
  executionContext: Record<string, unknown>;
}

/**
 * PARLANT validation data
 */
export interface ParlantValidationData {
  /** Validation request */
  request: ParlantValidationRequest;

  /** Validation response */
  response?: ParlantValidationResponse;

  /** Validation result */
  result?: ValidationResult;

  /** Validation timing */
  timing: Record<string, number>;
}

/**
 * Database operation data
 */
export interface DatabaseOperationData {
  /** Operation type */
  operationType: string;

  /** Query or operation details */
  operationDetails: string;

  /** Affected records count */
  affectedRecords: number;

  /** Operation timing */
  timing: Record<string, number>;

  /** Transaction context */
  transactionContext?: Record<string, unknown>;
}

/**
 * Security event data
 */
export interface SecurityEventData {
  /** Security event type */
  securityEventType: string;

  /** Threat indicators */
  threatIndicators: string[];

  /** Security context */
  securityContext: Record<string, unknown>;

  /** Risk assessment */
  riskAssessment: Record<string, unknown>;
}

/**
 * Performance event data
 */
export interface PerformanceEventData {
  /** Performance metrics */
  metrics: Record<string, number>;

  /** Performance thresholds */
  thresholds: Record<string, number>;

  /** Performance analysis */
  analysis: Record<string, unknown>;
}

/**
 * Error event data
 */
export interface ErrorEventData {
  /** Error details */
  errorDetails: ErrorDetails;

  /** Error context */
  errorContext: Record<string, unknown>;

  /** Stack trace */
  stackTrace?: string;

  /** Error recovery data */
  recoveryData?: Record<string, unknown>;
}

// ===========================
// MISSING TYPES - FORENSIC METADATA
// ===========================

/**
 * Comprehensive forensic metadata for evidence preservation
 */
export interface ForensicMetadata {
  /** Evidence identifier */
  evidenceId: ForensicEvidenceId;

  /** Chain of custody */
  chainOfCustody: ChainOfCustodyEntry[];

  /** Digital fingerprint */
  digitalFingerprint: DigitalFingerprint;

  /** Integrity verification */
  integrityVerification: IntegrityVerification;

  /** Evidence classification */
  evidenceClassification: EvidenceClassification;

  /** Preservation requirements */
  preservationRequirements: PreservationRequirement[];

  /** Legal metadata */
  legalMetadata: LegalMetadata;

  /** Evidence integrity assessment */
  evidenceIntegrity: IntegrityVerification;

  /** Forensic hash */
  forensicHash: string;

  /** Digital signature */
  digitalSignature: DigitalSignature | null;

  /** Timestamp authority */
  timestampAuthority: string | null;

  /** Legal hold status */
  legalHold:
    | boolean
    | { status: boolean; reason: string; startDate: Date; endDate?: Date };

  /** Expert witness assignment */
  expertWitness: {
    name: string;
    credentials: string;
    contact: string;
    assignmentDate: Date;
  } | null;
}

/**
 * Chain of custody entry
 */
export interface ChainOfCustodyEntry {
  /** Timestamp */
  timestamp: Date;

  /** Actor (person or system) */
  actor: string;

  /** Action performed */
  action: CustodyAction;

  /** Location */
  location: string;

  /** Digital signature */
  digitalSignature: string;

  /** Witness information */
  witnessInformation?: string;
}

/**
 * Custody actions
 */
export enum CustodyAction {
  CREATED = "created",
  ACCESSED = "accessed",
  MODIFIED = "modified",
  COPIED = "copied",
  TRANSFERRED = "transferred",
  ANALYZED = "analyzed",
  ARCHIVED = "archived",
  DESTROYED = "destroyed",
}

/**
 * Digital fingerprint
 */
export interface DigitalFingerprint {
  /** SHA-256 hash */
  sha256Hash: string;

  /** MD5 hash */
  md5Hash: string;

  /** Cryptographic signature */
  cryptographicSignature: string;

  /** Timestamp */
  timestamp: Date;

  /** Fingerprint metadata */
  metadata: Record<string, unknown>;
}

/**
 * Evidence classification
 */
export interface EvidenceClassification {
  /** Classification level */
  classificationLevel: ClassificationLevel;

  /** Evidence type */
  evidenceType: EvidenceType;

  /** Sensitivity level */
  sensitivityLevel: SensitivityLevel;

  /** Handling instructions */
  handlingInstructions: string[];
}

/**
 * Classification levels
 */
export enum ClassificationLevel {
  UNCLASSIFIED = "unclassified",
  CONFIDENTIAL = "confidential",
  SECRET = "secret",
  TOP_SECRET = "top_secret",
}

/**
 * Sensitivity levels
 */
export enum SensitivityLevel {
  PUBLIC = "public",
  INTERNAL = "internal",
  RESTRICTED = "restricted",
  HIGHLY_RESTRICTED = "highly_restricted",
}

/**
 * Preservation requirement
 */
export interface PreservationRequirement {
  /** Requirement type */
  requirementType: PreservationRequirementType;

  /** Preservation method */
  preservationMethod: string;

  /** Duration */
  duration: number;

  /** Legal basis */
  legalBasis: string;
}

/**
 * Preservation requirement types
 */
export enum PreservationRequirementType {
  LEGAL_HOLD = "legal_hold",
  REGULATORY_REQUIREMENT = "regulatory_requirement",
  BUSINESS_REQUIREMENT = "business_requirement",
  FORENSIC_REQUIREMENT = "forensic_requirement",
}

/**
 * Legal metadata
 */
export interface LegalMetadata {
  /** Jurisdiction */
  jurisdiction: string;

  /** Legal framework */
  legalFramework: string[];

  /** Admissibility requirements */
  admissibilityRequirements: string[];

  /** Legal privilege information */
  legalPrivilege?: LegalPrivilege;
}

/**
 * Legal privilege information
 */
export interface LegalPrivilege {
  /** Privilege type */
  privilegeType: PrivilegeType;

  /** Privilege holder */
  privilegeHolder: string;

  /** Privilege scope */
  privilegeScope: string;

  /** Waiver conditions */
  waiverConditions: string[];
}

/**
 * Privilege types
 */
export enum PrivilegeType {
  ATTORNEY_CLIENT = "attorney_client",
  WORK_PRODUCT = "work_product",
  EXECUTIVE = "executive",
  MEDICAL = "medical",
  CONFIDENTIAL_COMMUNICATIONS = "confidential_communications",
}

// ===========================
// MISSING TYPES - EVENT CORRELATION
// ===========================

/**
 * Event correlation data for linking related events
 */
export interface EventCorrelationData {
  /** Correlation identifier */
  correlationId: string;

  /** Related event identifiers */
  relatedEventIds: AuditEventId[];

  /** Correlation type */
  correlationType: CorrelationType;

  /** Correlation strength */
  correlationStrength: number;

  /** Correlation metadata */
  correlationMetadata: CorrelationMetadata;

  /** Causal relationships */
  causalRelationships: CausalRelationship[];

  /** Session correlation identifier */
  sessionCorrelationId: AuditSessionId;

  /** Operation correlation identifier */
  operationCorrelationId: DatabaseOperationId;

  /** User correlation identifier */
  userCorrelationId: string;

  /** Parent event identifier */
  parentEventId?: string;

  /** Child event identifiers */
  childEventIds: AuditEventId[];

  /** Correlation chain */
  correlationChain: string[];
}

/**
 * Correlation types
 */
export enum CorrelationType {
  TEMPORAL = "temporal",
  CAUSAL = "causal",
  FUNCTIONAL = "functional",
  SYSTEMIC = "systemic",
  USER_BASED = "user_based",
  SESSION_BASED = "session_based",
  TRANSACTION_BASED = "transaction_based",
}

/**
 * Correlation metadata
 */
export interface CorrelationMetadata {
  /** Correlation algorithm */
  correlationAlgorithm: string;

  /** Correlation timestamp */
  correlationTimestamp: Date;

  /** Confidence score */
  confidenceScore: number;

  /** Analysis method */
  analysisMethod: string;

  /** Correlation context */
  correlationContext: Record<string, unknown>;

  /** Correlation strength */
  correlationStrength: number;

  /** Correlation confidence */
  correlationConfidence: number;

  /** Correlation method */
  correlationMethod: string;
}

/**
 * Causal relationship
 */
export interface CausalRelationship {
  /** Cause event identifier */
  causeEventId: AuditEventId;

  /** Effect event identifier */
  effectEventId: AuditEventId;

  /** Relationship type */
  relationshipType: CausalRelationshipType;

  /** Confidence level */
  confidenceLevel: number;

  /** Time delay */
  timeDelayMicros: number;
}

/**
 * Causal relationship types
 */
export enum CausalRelationshipType {
  DIRECT_CAUSE = "direct_cause",
  INDIRECT_CAUSE = "indirect_cause",
  CONTRIBUTING_FACTOR = "contributing_factor",
  TRIGGERING_EVENT = "triggering_event",
  CONSEQUENCE = "consequence",
}

// ===========================
// MISSING TYPES - INTEGRITY VERIFICATION
// ===========================

/**
 * Comprehensive integrity verification
 */
export interface IntegrityVerification {
  /** Verification method */
  verificationMethod: IntegrityVerificationMethod;

  /** Verification result */
  verificationResult: IntegrityVerificationResult;

  /** Hash values */
  hashValues: HashValues;

  /** Digital signatures */
  digitalSignatures: DigitalSignature[];

  /** Verification timestamp */
  verificationTimestamp: Date;

  /** Verification context */
  verificationContext: VerificationContext;

  /** Hash algorithm used */
  hashAlgorithm: string;

  /** Hash value */
  hashValue: string;

  /** Digital signature */
  digitalSignature: DigitalSignature | null;

  /** Timestamp token */
  timestampToken:
    | string
    | { token: string; authority: string; timestamp: Date }
    | null;

  /** Merkle proof */
  merkleProof: string[] | { path: string[]; root: string; leaf: string } | null;

  /** Blockchain notarization */
  blockchainNotarization: {
    transactionHash: string;
    blockNumber: number;
    network: string;
    timestamp: Date;
  } | null;

  /** Integrity level */
  integrityLevel: string;

  /** Verification metadata */
  verificationMetadata: {
    verificationTimestamp: Date;
    verificationMethod: string;
    verificationStrength: string;
    verificationCertificate: string;
  };
}

/**
 * Integrity verification methods
 */
export enum IntegrityVerificationMethod {
  HASH_VERIFICATION = "hash_verification",
  DIGITAL_SIGNATURE = "digital_signature",
  BLOCKCHAIN_VERIFICATION = "blockchain_verification",
  MERKLE_TREE = "merkle_tree",
  TIMESTAMP_VERIFICATION = "timestamp_verification",
  CRYPTOGRAPHIC_PROOF = "cryptographic_proof",
}

/**
 * Integrity verification results
 */
export enum IntegrityVerificationResult {
  VERIFIED = "verified",
  FAILED = "failed",
  PARTIAL = "partial",
  UNKNOWN = "unknown",
  ERROR = "error",
}

/**
 * Hash values
 */
export interface HashValues {
  /** SHA-256 hash */
  sha256: string;

  /** SHA-512 hash */
  sha512: string;

  /** MD5 hash */
  md5: string;

  /** Custom hash algorithms */
  customHashes: Record<string, string>;
}

/**
 * Digital signature
 */
export interface DigitalSignature {
  /** Signature algorithm */
  algorithm: string;

  /** Signature value */
  signatureValue: string;

  /** Signer identifier */
  signerId: string;

  /** Signing timestamp */
  signingTimestamp: Date;

  /** Certificate information */
  certificateInfo: CertificateInfo;
}

/**
 * Certificate information
 */
export interface CertificateInfo {
  /** Certificate serial number */
  serialNumber: string;

  /** Issuer */
  issuer: string;

  /** Subject */
  subject: string;

  /** Valid from */
  validFrom: Date;

  /** Valid to */
  validTo: Date;

  /** Certificate fingerprint */
  fingerprint: string;
}

/**
 * Verification context
 */
export interface VerificationContext {
  /** Verification environment */
  environment: string;

  /** Verification tools */
  tools: string[];

  /** Verification parameters */
  parameters: Record<string, unknown>;

  /** Verification standards */
  standards: string[];
}

// ===========================
// MISSING TYPES - ADDITIONAL AUDIT CONTEXTS
// ===========================

/**
 * Audit database context
 */
export interface AuditDatabaseContext {
  /** Database identifier */
  databaseId: string;

  /** Database type */
  databaseType: string;

  /** Connection information */
  connectionInfo: DatabaseConnectionInfo;

  /** Transaction context */
  transactionContext: DatabaseTransactionContext;

  /** Query context */
  queryContext: DatabaseQueryContext;

  /** Performance metrics */
  performanceMetrics: DatabasePerformanceMetrics;
}

/**
 * Database connection information
 */
export interface DatabaseConnectionInfo {
  /** Connection identifier */
  connectionId: string;

  /** Database server */
  server: string;

  /** Database name */
  databaseName: string;

  /** Connection pool info */
  connectionPoolInfo?: ConnectionPoolInfo;

  /** Connection timestamp */
  connectionTimestamp: Date;
}

/**
 * Connection pool information
 */
export interface ConnectionPoolInfo {
  /** Pool name */
  poolName: string;

  /** Active connections */
  activeConnections: number;

  /** Pool size */
  poolSize: number;

  /** Wait time */
  waitTime: number;
}

/**
 * Database transaction context
 */
export interface DatabaseTransactionContext {
  /** Transaction identifier */
  transactionId: string;

  /** Transaction type */
  transactionType: DatabaseTransactionType;

  /** Isolation level */
  isolationLevel: string;

  /** Transaction start time */
  startTime: Date;

  /** Transaction status */
  status: DatabaseTransactionStatus;
}

/**
 * Database transaction types
 */
export enum DatabaseTransactionType {
  READ_ONLY = "read_only",
  READ_WRITE = "read_write",
  DISTRIBUTED = "distributed",
  NESTED = "nested",
}

/**
 * Database transaction status
 */
export enum DatabaseTransactionStatus {
  ACTIVE = "active",
  COMMITTED = "committed",
  ROLLED_BACK = "rolled_back",
  PREPARED = "prepared",
  UNKNOWN = "unknown",
}

/**
 * Database query context
 */
export interface DatabaseQueryContext {
  /** Query identifier */
  queryId: string;

  /** Query type */
  queryType: DatabaseQueryType;

  /** Query text (sanitized) */
  queryText: string;

  /** Query parameters */
  queryParameters: Record<string, unknown>;

  /** Execution plan */
  executionPlan?: string;
}

/**
 * Database query types
 */
export enum DatabaseQueryType {
  SELECT = "select",
  INSERT = "insert",
  UPDATE = "update",
  DELETE = "delete",
  CREATE = "create",
  DROP = "drop",
  ALTER = "alter",
  STORED_PROCEDURE = "stored_procedure",
}

/**
 * Database performance metrics
 */
export interface DatabasePerformanceMetrics {
  /** Query execution time */
  queryExecutionTime: number;

  /** Rows affected */
  rowsAffected: number;

  /** Rows returned */
  rowsReturned: number;

  /** CPU time */
  cpuTime: number;

  /** I/O operations */
  ioOperations: number;

  /** Memory usage */
  memoryUsage: number;
}

/**
 * Audit security context
 */
export interface AuditSecurityContext {
  /** Security level */
  securityLevel: SecurityLevel;

  /** Threat level */
  threatLevel: ThreatLevel;

  /** Security controls applied */
  securityControlsApplied: SecurityControl[];

  /** Risk assessment */
  riskAssessment: SecurityRiskAssessment;

  /** Security violations */
  securityViolations: SecurityViolation[];

  /** Security recommendations */
  securityRecommendations: string[];

  /** Sensitivity level */
  sensitivityLevel?: string;
}

/**
 * Threat levels
 */
export enum ThreatLevel {
  MINIMAL = "minimal",
  LOW = "low",
  MODERATE = "moderate",
  HIGH = "high",
  SEVERE = "severe",
  CRITICAL = "critical",
}

/**
 * Security control
 */
export interface SecurityControl {
  /** Control identifier */
  controlId: string;

  /** Control name */
  controlName: string;

  /** Control type */
  controlType: SecurityControlType;

  /** Implementation status */
  implementationStatus: ImplementationStatus;

  /** Effectiveness rating */
  effectivenessRating: EffectivenessRating;
}

/**
 * Security control types
 */
export enum SecurityControlType {
  PREVENTIVE = "preventive",
  DETECTIVE = "detective",
  CORRECTIVE = "corrective",
  DETERRENT = "deterrent",
  RECOVERY = "recovery",
  COMPENSATING = "compensating",
}

/**
 * Security risk assessment
 */
export interface SecurityRiskAssessment {
  /** Risk level */
  riskLevel: RiskLevel;

  /** Risk score */
  riskScore: number;

  /** Risk factors */
  riskFactors: SecurityRiskFactor[];

  /** Mitigation strategies */
  mitigationStrategies: string[];

  /** Assessment timestamp */
  assessmentTimestamp: Date;
}

/**
 * Security risk factor
 */
export interface SecurityRiskFactor {
  /** Factor name */
  factorName: string;

  /** Factor category */
  factorCategory: string;

  /** Impact level */
  impactLevel: RiskLevel;

  /** Likelihood */
  likelihood: number;

  /** Risk value */
  riskValue: number;
}

// ===========================
// MISSING TYPES - COMPLIANCE STATUS
// ===========================

/**
 * Compliance status enumeration
 */
export enum ComplianceStatus {
  COMPLIANT = "compliant",
  NON_COMPLIANT = "non_compliant",
  PARTIALLY_COMPLIANT = "partially_compliant",
  UNDER_REVIEW = "under_review",
  EXEMPTED = "exempted",
  PENDING_ASSESSMENT = "pending_assessment",
}

/**
 * Compliance risk assessment
 */
export interface ComplianceRiskAssessment {
  /** Risk identifier */
  riskId: string;

  /** Risk description */
  riskDescription: string;

  /** Risk level */
  riskLevel: RiskLevel;

  /** Impact assessment */
  impactAssessment: ComplianceImpactAssessment;

  /** Likelihood assessment */
  likelihoodAssessment: ComplianceLikelihoodAssessment;

  /** Risk mitigation */
  riskMitigation: RiskMitigation;
}

/**
 * Compliance impact assessment
 */
export interface ComplianceImpactAssessment {
  /** Financial impact */
  financialImpact: number;

  /** Reputational impact */
  reputationalImpact: ImpactLevel;

  /** Operational impact */
  operationalImpact: ImpactLevel;

  /** Legal impact */
  legalImpact: ImpactLevel;

  /** Strategic impact */
  strategicImpact: ImpactLevel;
}

/**
 * Impact levels
 */
export enum ImpactLevel {
  NEGLIGIBLE = "negligible",
  MINOR = "minor",
  MODERATE = "moderate",
  MAJOR = "major",
  SEVERE = "severe",
  CATASTROPHIC = "catastrophic",
}

/**
 * Compliance likelihood assessment
 */
export interface ComplianceLikelihoodAssessment {
  /** Probability score */
  probabilityScore: number;

  /** Historical frequency */
  historicalFrequency: number;

  /** Trend analysis */
  trendAnalysis: TrendAnalysis;

  /** Contributing factors */
  contributingFactors: string[];
}

/**
 * Trend analysis
 */
export interface TrendAnalysis {
  /** Trend direction */
  trendDirection: TrendDirection;

  /** Trend strength */
  trendStrength: number;

  /** Trend duration */
  trendDuration: number;

  /** Trend reliability */
  trendReliability: number;
}

/**
 * Trend directions
 */
export enum TrendDirection {
  INCREASING = "increasing",
  DECREASING = "decreasing",
  STABLE = "stable",
  VOLATILE = "volatile",
  CYCLICAL = "cyclical",
}

/**
 * Compliance documentation
 */
export interface ComplianceDocumentation {
  /** Documentation type */
  documentationType: ComplianceDocumentationType;

  /** Document references */
  documentReferences: DocumentReference[];

  /** Policy references */
  policyReferences: PolicyReference[];

  /** Procedure references */
  procedureReferences: ProcedureReference[];

  /** Evidence references */
  evidenceReferences: EvidenceReference[];
}

/**
 * Compliance documentation types
 */
export enum ComplianceDocumentationType {
  POLICY = "policy",
  PROCEDURE = "procedure",
  GUIDELINE = "guideline",
  STANDARD = "standard",
  EVIDENCE = "evidence",
  ASSESSMENT = "assessment",
  AUDIT_REPORT = "audit_report",
}

/**
 * Document reference
 */
export interface DocumentReference {
  /** Document identifier */
  documentId: string;

  /** Document title */
  title: string;

  /** Document version */
  version: string;

  /** Document location */
  location: string;

  /** Last updated */
  lastUpdated: Date;
}

/**
 * Policy reference
 */
export interface PolicyReference {
  /** Policy identifier */
  policyId: string;

  /** Policy name */
  policyName: string;

  /** Policy version */
  version: string;

  /** Effective date */
  effectiveDate: Date;

  /** Review date */
  reviewDate: Date;
}

/**
 * Procedure reference
 */
export interface ProcedureReference {
  /** Procedure identifier */
  procedureId: string;

  /** Procedure name */
  procedureName: string;

  /** Procedure version */
  version: string;

  /** Owner */
  owner: string;

  /** Last reviewed */
  lastReviewed: Date;
}

/**
 * Evidence reference
 */
export interface EvidenceReference {
  /** Evidence identifier */
  evidenceId: string;

  /** Evidence type */
  evidenceType: string;

  /** Evidence location */
  location: string;

  /** Collection date */
  collectionDate: Date;

  /** Retention period */
  retentionPeriod: number;
}

// ===========================
// MISSING TYPES - BYPASS STATUS
// ===========================

/**
 * Bypass status information
 */
export interface BypassStatus {
  /** Bypass enabled */
  bypassEnabled: boolean;

  /** Bypass type */
  bypassType?: BypassType;

  /** Bypass reason */
  bypassReason?: string;

  /** Authorization */
  authorization?: BypassAuthorization;

  /** Bypass timestamp */
  bypassTimestamp?: Date;

  /** Bypass duration */
  bypassDuration?: number;
}

/**
 * Bypass types
 */
export enum BypassType {
  EMERGENCY = "emergency",
  MAINTENANCE = "maintenance",
  TESTING = "testing",
  AUTHORIZED = "authorized",
  TEMPORARY = "temporary",
  PERMANENT = "permanent",
}

/**
 * Bypass authorization
 */
export interface BypassAuthorization {
  /** Authorizer identifier */
  authorizerId: string;

  /** Authorization level */
  authorizationLevel: string;

  /** Authorization timestamp */
  authorizationTimestamp: Date;

  /** Justification */
  justification: string;

  /** Approval workflow */
  approvalWorkflow?: string;
}

// ===========================
// MISSING TYPES - ENCRYPTION AND HSM
// ===========================

/**
 * Encryption performance settings
 */
export interface EncryptionPerformanceSettings {
  /** Batch size for bulk operations */
  batchSize: number;

  /** Parallel processing threads */
  parallelThreads: number;

  /** Memory limit for operations */
  memoryLimit: number;

  /** Timeout for encryption operations */
  operationTimeout: number;

  /** Cache encryption keys */
  cacheKeys: boolean;

  /** Optimize for throughput vs latency */
  optimizationMode: PerformanceOptimizationMode;
}

/**
 * Performance optimization modes
 */
export enum PerformanceOptimizationMode {
  THROUGHPUT = "throughput",
  LATENCY = "latency",
  BALANCED = "balanced",
  MEMORY_OPTIMIZED = "memory_optimized",
}

/**
 * Encryption compliance settings
 */
export interface EncryptionComplianceSettings {
  /** Required encryption standards */
  requiredStandards: EncryptionStandard[];

  /** FIPS compliance mode */
  fipsCompliance: boolean;

  /** Key escrow requirements */
  keyEscrowRequired: boolean;

  /** Audit encryption operations */
  auditEncryption: boolean;

  /** Compliance frameworks */
  complianceFrameworks: ComplianceFramework[];

  /** Geographic restrictions */
  geographicRestrictions: GeographicRestriction[];
}

/**
 * Encryption standards
 */
export enum EncryptionStandard {
  FIPS_140_2 = "fips_140_2",
  COMMON_CRITERIA = "common_criteria",
  NSA_SUITE_B = "nsa_suite_b",
  NIST_SP_800_57 = "nist_sp_800_57",
  ISO_27001 = "iso_27001",
  PKCS_11 = "pkcs_11",
}

/**
 * Geographic restriction
 */
export interface GeographicRestriction {
  /** Country code */
  countryCode: string;

  /** Restriction type */
  restrictionType: RestrictionType;

  /** Allowed algorithms */
  allowedAlgorithms: string[];

  /** Key length restrictions */
  keyLengthRestrictions: KeyLengthRestriction[];
}

/**
 * Restriction types
 */
export enum RestrictionType {
  EXPORT_CONTROL = "export_control",
  IMPORT_RESTRICTION = "import_restriction",
  USE_RESTRICTION = "use_restriction",
  ALGORITHM_RESTRICTION = "algorithm_restriction",
}

/**
 * Key length restriction
 */
export interface KeyLengthRestriction {
  /** Algorithm */
  algorithm: string;

  /** Maximum key length */
  maxKeyLength: number;

  /** Minimum key length */
  minKeyLength: number;

  /** Allowed key lengths */
  allowedKeyLengths: number[];
}

/**
 * HSM (Hardware Security Module) configuration
 */
export interface HsmConfig {
  /** HSM provider */
  provider: HsmProvider;

  /** HSM connection settings */
  connectionSettings: HsmConnectionSettings;

  /** HSM authentication */
  authentication: HsmAuthentication;

  /** HSM capabilities */
  capabilities: HsmCapabilities;

  /** Failover configuration */
  failoverConfig: HsmFailoverConfig;

  /** Performance settings */
  performanceSettings: HsmPerformanceSettings;
}

/**
 * HSM providers
 */
export enum HsmProvider {
  AWS_CLOUDHSM = "aws_cloudhsm",
  AZURE_DEDICATED_HSM = "azure_dedicated_hsm",
  THALES_LUNA = "thales_luna",
  SAFENET = "safenet",
  UTIMACO = "utimaco",
  YUBICO = "yubico",
  SOFTWARE_HSM = "software_hsm",
}

/**
 * HSM connection settings
 */
export interface HsmConnectionSettings {
  /** HSM endpoint */
  endpoint: string;

  /** Connection timeout */
  connectionTimeout: number;

  /** Connection pool size */
  connectionPoolSize: number;

  /** SSL/TLS configuration */
  tlsConfig: TlsConfig;

  /** Network settings */
  networkSettings: NetworkSettings;
}

/**
 * TLS configuration
 */
export interface TlsConfig {
  /** TLS version */
  version: string;

  /** Cipher suites */
  cipherSuites: string[];

  /** Certificate verification */
  certificateVerification: boolean;

  /** Client certificate */
  clientCertificate?: string;

  /** Client private key */
  clientPrivateKey?: string;
}

/**
 * Network settings
 */
export interface NetworkSettings {
  /** Retry attempts */
  retryAttempts: number;

  /** Retry delay */
  retryDelay: number;

  /** Keep-alive settings */
  keepAlive: boolean;

  /** Connection multiplexing */
  multiplexing: boolean;
}

/**
 * HSM authentication
 */
export interface HsmAuthentication {
  /** Authentication method */
  method: HsmAuthMethod;

  /** Credentials */
  credentials: HsmCredentials;

  /** Multi-factor authentication */
  mfaRequired: boolean;

  /** Session management */
  sessionManagement: HsmSessionManagement;
}

/**
 * HSM authentication methods
 */
export enum HsmAuthMethod {
  PASSWORD = "password",
  CERTIFICATE = "certificate",
  TOKEN = "token",
  BIOMETRIC = "biometric",
  SMART_CARD = "smart_card",
  OAUTH2 = "oauth2",
}

/**
 * HSM credentials
 */
export interface HsmCredentials {
  /** Username */
  username?: string;

  /** Password */
  password?: string;

  /** Certificate */
  certificate?: string;

  /** Private key */
  privateKey?: string;

  /** Token */
  token?: string;

  /** Additional parameters */
  additionalParams?: Record<string, string>;
}

/**
 * HSM session management
 */
export interface HsmSessionManagement {
  /** Session timeout */
  sessionTimeout: number;

  /** Session renewal */
  autoRenewal: boolean;

  /** Maximum concurrent sessions */
  maxConcurrentSessions: number;

  /** Session monitoring */
  sessionMonitoring: boolean;
}

/**
 * HSM capabilities
 */
export interface HsmCapabilities {
  /** Supported algorithms */
  supportedAlgorithms: string[];

  /** Key generation capabilities */
  keyGeneration: KeyGenerationCapabilities;

  /** Signing capabilities */
  signingCapabilities: SigningCapabilities;

  /** Encryption capabilities */
  encryptionCapabilities: EncryptionCapabilities;

  /** Hardware features */
  hardwareFeatures: HardwareFeatures;
}

/**
 * Key generation capabilities
 */
export interface KeyGenerationCapabilities {
  /** Supported key types */
  supportedKeyTypes: string[];

  /** Key size ranges */
  keySizeRanges: KeySizeRange[];

  /** Random number generation */
  randomNumberGeneration: RandomNumberGenerationInfo;

  /** Key derivation functions */
  keyDerivationFunctions: string[];
}

/**
 * Key size range
 */
export interface KeySizeRange {
  /** Key type */
  keyType: string;

  /** Minimum size */
  minSize: number;

  /** Maximum size */
  maxSize: number;

  /** Recommended sizes */
  recommendedSizes: number[];
}

/**
 * Random number generation information
 */
export interface RandomNumberGenerationInfo {
  /** TRNG (True Random Number Generator) available */
  trngAvailable: boolean;

  /** PRNG (Pseudo Random Number Generator) available */
  prngAvailable: boolean;

  /** Entropy sources */
  entropySources: string[];

  /** FIPS 140-2 compliance */
  fips140Compliance: boolean;
}

/**
 * Signing capabilities
 */
export interface SigningCapabilities {
  /** Supported signature algorithms */
  supportedAlgorithms: string[];

  /** Hash algorithms */
  hashAlgorithms: string[];

  /** Message recovery */
  messageRecovery: boolean;

  /** Blind signing */
  blindSigning: boolean;
}

/**
 * Encryption capabilities
 */
export interface EncryptionCapabilities {
  /** Symmetric algorithms */
  symmetricAlgorithms: string[];

  /** Asymmetric algorithms */
  asymmetricAlgorithms: string[];

  /** Modes of operation */
  modesOfOperation: string[];

  /** Padding schemes */
  paddingSchemes: string[];
}

/**
 * Hardware features
 */
export interface HardwareFeatures {
  /** Tamper resistance */
  tamperResistance: TamperResistanceLevel;

  /** Secure storage capacity */
  secureStorageCapacity: number;

  /** Processing power */
  processingPower: ProcessingPowerInfo;

  /** Environmental ratings */
  environmentalRatings: EnvironmentalRatings;
}

/**
 * Tamper resistance levels
 */
export enum TamperResistanceLevel {
  LEVEL_1 = "level_1",
  LEVEL_2 = "level_2",
  LEVEL_3 = "level_3",
  LEVEL_4 = "level_4",
}

/**
 * Processing power information
 */
export interface ProcessingPowerInfo {
  /** CPU type */
  cpuType: string;

  /** Clock speed */
  clockSpeed: number;

  /** Memory size */
  memorySize: number;

  /** Crypto accelerators */
  cryptoAccelerators: string[];
}

/**
 * Environmental ratings
 */
export interface EnvironmentalRatings {
  /** Operating temperature range */
  operatingTemperature: TemperatureRange;

  /** Storage temperature range */
  storageTemperature: TemperatureRange;

  /** Humidity range */
  humidityRange: HumidityRange;

  /** Altitude rating */
  altitudeRating: number;
}

/**
 * Temperature range
 */
export interface TemperatureRange {
  /** Minimum temperature (Celsius) */
  min: number;

  /** Maximum temperature (Celsius) */
  max: number;
}

/**
 * Humidity range
 */
export interface HumidityRange {
  /** Minimum humidity (%) */
  min: number;

  /** Maximum humidity (%) */
  max: number;
}

/**
 * HSM failover configuration
 */
export interface HsmFailoverConfig {
  /** Failover enabled */
  enabled: boolean;

  /** Backup HSM endpoints */
  backupEndpoints: string[];

  /** Failover strategy */
  strategy: FailoverStrategy;

  /** Health check configuration */
  healthCheck: HealthCheckConfig;

  /** Data synchronization */
  dataSynchronization: DataSynchronizationConfig;
}

/**
 * Failover strategies
 */
export enum FailoverStrategy {
  ACTIVE_PASSIVE = "active_passive",
  ACTIVE_ACTIVE = "active_active",
  ROUND_ROBIN = "round_robin",
  LOAD_BALANCED = "load_balanced",
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /** Check interval */
  interval: number;

  /** Timeout */
  timeout: number;

  /** Retry attempts */
  retryAttempts: number;

  /** Health check methods */
  methods: HealthCheckMethod[];
}

/**
 * Health check methods
 */
export enum HealthCheckMethod {
  PING = "ping",
  STATUS_CHECK = "status_check",
  OPERATION_TEST = "operation_test",
  CERTIFICATE_VALIDATION = "certificate_validation",
}

/**
 * Data synchronization configuration
 */
export interface DataSynchronizationConfig {
  /** Synchronization method */
  method: SynchronizationMethod;

  /** Sync interval */
  interval: number;

  /** Conflict resolution */
  conflictResolution: ConflictResolutionStrategy;

  /** Encryption for sync */
  encryptionEnabled: boolean;
}

/**
 * Synchronization methods
 */
export enum SynchronizationMethod {
  REAL_TIME = "real_time",
  BATCH = "batch",
  SCHEDULED = "scheduled",
  ON_DEMAND = "on_demand",
}

/**
 * Conflict resolution strategies
 */
export enum ConflictResolutionStrategy {
  LAST_WRITE_WINS = "last_write_wins",
  MANUAL_RESOLUTION = "manual_resolution",
  AUTOMATIC_MERGE = "automatic_merge",
  VERSION_CONTROL = "version_control",
}

/**
 * HSM performance settings
 */
export interface HsmPerformanceSettings {
  /** Connection pool settings */
  connectionPool: ConnectionPoolSettings;

  /** Operation timeouts */
  operationTimeouts: OperationTimeouts;

  /** Caching settings */
  caching: CachingSettings;

  /** Monitoring settings */
  monitoring: MonitoringSettings;
}

/**
 * Connection pool settings
 */
export interface ConnectionPoolSettings {
  /** Initial pool size */
  initialSize: number;

  /** Maximum pool size */
  maxSize: number;

  /** Pool growth increment */
  growthIncrement: number;

  /** Connection idle timeout */
  idleTimeout: number;

  /** Pool validation */
  validation: PoolValidationSettings;
}

/**
 * Pool validation settings
 */
export interface PoolValidationSettings {
  /** Validation on borrow */
  validateOnBorrow: boolean;

  /** Validation on return */
  validateOnReturn: boolean;

  /** Validation interval */
  validationInterval: number;

  /** Validation query */
  validationQuery: string;
}

/**
 * Operation timeouts
 */
export interface OperationTimeouts {
  /** Key generation timeout */
  keyGeneration: number;

  /** Signing timeout */
  signing: number;

  /** Encryption timeout */
  encryption: number;

  /** Decryption timeout */
  decryption: number;

  /** Key lookup timeout */
  keyLookup: number;
}

/**
 * Caching settings
 */
export interface CachingSettings {
  /** Enable caching */
  enabled: boolean;

  /** Cache size */
  cacheSize: number;

  /** Cache TTL */
  cacheTtl: number;

  /** Cache invalidation strategy */
  invalidationStrategy: CacheInvalidationStrategy;
}

/**
 * Cache invalidation strategies
 */
export enum CacheInvalidationStrategy {
  TTL_BASED = "ttl_based",
  USAGE_BASED = "usage_based",
  EVENT_BASED = "event_based",
  MANUAL = "manual",
}

/**
 * Monitoring settings
 */
export interface MonitoringSettings {
  /** Performance monitoring enabled */
  performanceMonitoring: boolean;

  /** Metrics collection interval */
  metricsInterval: number;

  /** Alert thresholds */
  alertThresholds: AlertThresholds;

  /** Logging configuration */
  logging: LoggingConfiguration;
}

/**
 * Alert thresholds
 */
export interface AlertThresholds {
  /** Response time threshold */
  responseTime: number;

  /** Error rate threshold */
  errorRate: number;

  /** Connection pool utilization */
  poolUtilization: number;

  /** Memory usage threshold */
  memoryUsage: number;
}

/**
 * Logging configuration
 */
export interface LoggingConfiguration {
  /** Log level */
  logLevel: LogLevel;

  /** Log sensitive data */
  logSensitiveData: boolean;

  /** Log rotation */
  logRotation: LogRotationSettings;

  /** Log destinations */
  destinations: LogDestination[];
}

/**
 * Log levels
 */
export enum LogLevel {
  TRACE = "trace",
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
}

/**
 * Log rotation settings
 */
export interface LogRotationSettings {
  /** Rotation enabled */
  enabled: boolean;

  /** Max file size */
  maxFileSize: number;

  /** Max files to keep */
  maxFiles: number;

  /** Rotation schedule */
  schedule: string;
}

/**
 * Log destinations
 */
export enum LogDestination {
  FILE = "file",
  CONSOLE = "console",
  SYSLOG = "syslog",
  ELASTICSEARCH = "elasticsearch",
  SPLUNK = "splunk",
}

/**
 * Quantum-resistant settings
 */
export interface QuantumResistantSettings {
  /** Enable quantum-resistant algorithms */
  enabled: boolean;

  /** Preferred algorithms */
  preferredAlgorithms: QuantumResistantAlgorithm[];

  /** Migration timeline */
  migrationTimeline: MigrationTimeline;

  /** Hybrid mode settings */
  hybridMode: HybridModeSettings;

  /** Research and development */
  researchSettings: QuantumResearchSettings;
}

/**
 * Quantum-resistant algorithms
 */
export enum QuantumResistantAlgorithm {
  KYBER = "kyber",
  DILITHIUM = "dilithium",
  FALCON = "falcon",
  SPHINCS_PLUS = "sphincs_plus",
  CLASSIC_MCELIECE = "classic_mceliece",
  BIKE = "bike",
  HQC = "hqc",
}

/**
 * Migration timeline
 */
export interface MigrationTimeline {
  /** Phase 1: Research and testing */
  phase1: MigrationPhase;

  /** Phase 2: Pilot deployment */
  phase2: MigrationPhase;

  /** Phase 3: Production rollout */
  phase3: MigrationPhase;

  /** Phase 4: Full migration */
  phase4: MigrationPhase;
}

/**
 * Migration phase
 */
export interface MigrationPhase {
  /** Phase name */
  name: string;

  /** Start date */
  startDate: Date;

  /** End date */
  endDate: Date;

  /** Milestones */
  milestones: Milestone[];

  /** Success criteria */
  successCriteria: string[];
}

/**
 * Milestone
 */
export interface Milestone {
  /** Milestone name */
  name: string;

  /** Target date */
  targetDate: Date;

  /** Completion criteria */
  completionCriteria: string[];

  /** Dependencies */
  dependencies: string[];
}

/**
 * Hybrid mode settings
 */
export interface HybridModeSettings {
  /** Classical algorithm */
  classicalAlgorithm: string;

  /** Quantum-resistant algorithm */
  quantumAlgorithm: QuantumResistantAlgorithm;

  /** Combination strategy */
  combinationStrategy: HybridCombinationStrategy;

  /** Performance impact assessment */
  performanceImpact: PerformanceImpactAssessment;
}

/**
 * Hybrid combination strategies
 */
export enum HybridCombinationStrategy {
  PARALLEL = "parallel",
  CASCADED = "cascaded",
  REDUNDANT = "redundant",
  ADAPTIVE = "adaptive",
}

/**
 * Performance impact assessment
 */
export interface PerformanceImpactAssessment {
  /** Encryption overhead */
  encryptionOverhead: number;

  /** Key size increase */
  keySizeIncrease: number;

  /** Signature size increase */
  signatureSizeIncrease: number;

  /** Processing time increase */
  processingTimeIncrease: number;
}

/**
 * Quantum research settings
 */
export interface QuantumResearchSettings {
  /** Algorithm monitoring */
  algorithmMonitoring: boolean;

  /** Threat assessment */
  threatAssessment: QuantumThreatAssessment;

  /** Research partnerships */
  researchPartnerships: string[];

  /** Standards tracking */
  standardsTracking: StandardsTrackingConfig;
}

/**
 * Quantum threat assessment
 */
export interface QuantumThreatAssessment {
  /** Current threat level */
  currentThreatLevel: QuantumThreatLevel;

  /** Timeline predictions */
  timelinePredictions: QuantumTimelinePrediction[];

  /** Impact analysis */
  impactAnalysis: QuantumImpactAnalysis;

  /** Mitigation strategies */
  mitigationStrategies: string[];
}

/**
 * Quantum threat levels
 */
export enum QuantumThreatLevel {
  THEORETICAL = "theoretical",
  RESEARCH = "research",
  EXPERIMENTAL = "experimental",
  NEAR_TERM = "near_term",
  IMMEDIATE = "immediate",
}

/**
 * Quantum timeline prediction
 */
export interface QuantumTimelinePrediction {
  /** Source */
  source: string;

  /** Predicted year */
  predictedYear: number;

  /** Confidence level */
  confidenceLevel: number;

  /** Key assumptions */
  keyAssumptions: string[];
}

/**
 * Quantum impact analysis
 */
export interface QuantumImpactAnalysis {
  /** Affected algorithms */
  affectedAlgorithms: string[];

  /** Business impact */
  businessImpact: BusinessImpactLevel;

  /** Technical impact */
  technicalImpact: TechnicalImpactLevel;

  /** Regulatory impact */
  regulatoryImpact: RegulatoryImpactLevel;
}

/**
 * Business impact levels
 */
export enum BusinessImpactLevel {
  MINIMAL = "minimal",
  LOW = "low",
  MODERATE = "moderate",
  HIGH = "high",
  SEVERE = "severe",
  CRITICAL = "critical",
}

/**
 * Technical impact levels
 */
export enum TechnicalImpactLevel {
  MINIMAL = "minimal",
  LOW = "low",
  MODERATE = "moderate",
  HIGH = "high",
  SEVERE = "severe",
  CRITICAL = "critical",
}

/**
 * Regulatory impact levels
 */
export enum RegulatoryImpactLevel {
  MINIMAL = "minimal",
  LOW = "low",
  MODERATE = "moderate",
  HIGH = "high",
  SEVERE = "severe",
  CRITICAL = "critical",
}

/**
 * Standards tracking configuration
 */
export interface StandardsTrackingConfig {
  /** Tracked organizations */
  trackedOrganizations: string[];

  /** Standards monitoring */
  standardsMonitoring: boolean;

  /** Update notifications */
  updateNotifications: boolean;

  /** Implementation deadlines */
  implementationDeadlines: ImplementationDeadline[];
}

/**
 * Implementation deadline
 */
export interface ImplementationDeadline {
  /** Standard name */
  standardName: string;

  /** Deadline date */
  deadlineDate: Date;

  /** Mandatory */
  mandatory: boolean;

  /** Preparation time */
  preparationTime: number;
}

// ===========================
// MISSING TYPES - STORAGE AND VALIDATION
// ===========================

/**
 * Storage backend configuration
 */
export interface StorageBackend {
  /** Backend type */
  backendType: StorageBackendType;

  /** Connection configuration */
  connectionConfig: StorageConnectionConfig;

  /** Performance settings */
  performanceSettings: StoragePerformanceSettings;

  /** Backup and recovery */
  backupRecovery: BackupRecoveryConfig;

  /** Security settings */
  securitySettings: StorageSecuritySettings;
}

/**
 * Storage backend types
 */
export enum StorageBackendType {
  FILE_SYSTEM = "file_system",
  DATABASE = "database",
  OBJECT_STORAGE = "object_storage",
  BLOCKCHAIN = "blockchain",
  DISTRIBUTED_LEDGER = "distributed_ledger",
  CLOUD_STORAGE = "cloud_storage",
}

/**
 * Storage connection configuration
 */
export interface StorageConnectionConfig {
  /** Connection string */
  connectionString: string;

  /** Authentication */
  authentication: StorageAuthentication;

  /** Connection pooling */
  connectionPooling: ConnectionPoolingConfig;

  /** Timeout settings */
  timeoutSettings: StorageTimeoutSettings;
}

/**
 * Storage authentication
 */
export interface StorageAuthentication {
  /** Authentication type */
  authenticationType: StorageAuthenticationType;

  /** Credentials */
  credentials: StorageCredentials;

  /** Access control */
  accessControl: StorageAccessControl;
}

/**
 * Storage authentication types
 */
export enum StorageAuthenticationType {
  USERNAME_PASSWORD = "username_password",
  API_KEY = "api_key",
  CERTIFICATE = "certificate",
  OAUTH2 = "oauth2",
  IAM_ROLE = "iam_role",
  KERBEROS = "kerberos",
}

/**
 * Storage credentials
 */
export interface StorageCredentials {
  /** Username */
  username?: string;

  /** Password */
  password?: string;

  /** API key */
  apiKey?: string;

  /** Certificate */
  certificate?: string;

  /** Private key */
  privateKey?: string;

  /** Token */
  token?: string;
}

/**
 * Storage access control
 */
export interface StorageAccessControl {
  /** Read permissions */
  readPermissions: string[];

  /** Write permissions */
  writePermissions: string[];

  /** Delete permissions */
  deletePermissions: string[];

  /** Admin permissions */
  adminPermissions: string[];
}

/**
 * Connection pooling configuration
 */
export interface ConnectionPoolingConfig {
  /** Pool enabled */
  enabled: boolean;

  /** Initial pool size */
  initialSize: number;

  /** Maximum pool size */
  maxSize: number;

  /** Pool timeout */
  poolTimeout: number;

  /** Idle timeout */
  idleTimeout: number;
}

/**
 * Storage timeout settings
 */
export interface StorageTimeoutSettings {
  /** Connection timeout */
  connectionTimeout: number;

  /** Read timeout */
  readTimeout: number;

  /** Write timeout */
  writeTimeout: number;

  /** Transaction timeout */
  transactionTimeout: number;
}

/**
 * Storage performance settings
 */
export interface StoragePerformanceSettings {
  /** Batch size */
  batchSize: number;

  /** Parallel operations */
  parallelOperations: number;

  /** Compression */
  compression: CompressionSettings;

  /** Indexing */
  indexing: IndexingSettings;

  /** Partitioning */
  partitioning: PartitioningSettings;
}

/**
 * Compression settings
 */
export interface CompressionSettings {
  /** Compression enabled */
  enabled: boolean;

  /** Compression algorithm */
  algorithm: CompressionAlgorithm;

  /** Compression level */
  level: number;

  /** Minimum size for compression */
  minSize: number;
}

/**
 * Compression algorithms
 */
export enum CompressionAlgorithm {
  GZIP = "gzip",
  DEFLATE = "deflate",
  BROTLI = "brotli",
  LZ4 = "lz4",
  ZSTD = "zstd",
}

/**
 * Indexing settings
 */
export interface IndexingSettings {
  /** Auto-indexing enabled */
  autoIndexing: boolean;

  /** Index fields */
  indexFields: string[];

  /** Index types */
  indexTypes: IndexType[];

  /** Index maintenance */
  indexMaintenance: IndexMaintenanceSettings;
}

/**
 * Index types
 */
export enum IndexType {
  BTREE = "btree",
  HASH = "hash",
  BITMAP = "bitmap",
  FULLTEXT = "fulltext",
  SPATIAL = "spatial",
}

/**
 * Index maintenance settings
 */
export interface IndexMaintenanceSettings {
  /** Auto-maintenance enabled */
  autoMaintenance: boolean;

  /** Maintenance schedule */
  maintenanceSchedule: string;

  /** Rebuild threshold */
  rebuildThreshold: number;

  /** Statistics update frequency */
  statisticsUpdateFrequency: number;
}

/**
 * Partitioning settings
 */
export interface PartitioningSettings {
  /** Partitioning enabled */
  enabled: boolean;

  /** Partitioning strategy */
  strategy: PartitioningStrategy;

  /** Partition size */
  partitionSize: number;

  /** Partition key */
  partitionKey: string;

  /** Partition maintenance */
  partitionMaintenance: PartitionMaintenanceSettings;
}

/**
 * Partitioning strategies
 */
export enum PartitioningStrategy {
  RANGE = "range",
  HASH = "hash",
  LIST = "list",
  COMPOSITE = "composite",
  TIME_BASED = "time_based",
}

/**
 * Partition maintenance settings
 */
export interface PartitionMaintenanceSettings {
  /** Auto-maintenance enabled */
  autoMaintenance: boolean;

  /** Partition pruning */
  partitionPruning: boolean;

  /** Partition merging */
  partitionMerging: boolean;

  /** Partition archival */
  partitionArchival: PartitionArchivalSettings;
}

/**
 * Partition archival settings
 */
export interface PartitionArchivalSettings {
  /** Archival enabled */
  enabled: boolean;

  /** Archival age threshold */
  ageThreshold: number;

  /** Archival storage */
  archivalStorage: string;

  /** Archival compression */
  archivalCompression: boolean;
}

/**
 * Backup and recovery configuration
 */
export interface BackupRecoveryConfig {
  /** Backup settings */
  backupSettings: BackupSettings;

  /** Recovery settings */
  recoverySettings: RecoverySettings;

  /** Disaster recovery */
  disasterRecovery: DisasterRecoverySettings;
}

/**
 * Backup settings
 */
export interface BackupSettings {
  /** Backup enabled */
  enabled: boolean;

  /** Backup frequency */
  frequency: BackupFrequency;

  /** Backup retention */
  retention: BackupRetentionSettings;

  /** Backup location */
  location: BackupLocationSettings;

  /** Backup encryption */
  encryption: BackupEncryptionSettings;
}

/**
 * Backup frequencies
 */
export enum BackupFrequency {
  CONTINUOUS = "continuous",
  HOURLY = "hourly",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

/**
 * Backup retention settings
 */
export interface BackupRetentionSettings {
  /** Daily backups to keep */
  dailyRetention: number;

  /** Weekly backups to keep */
  weeklyRetention: number;

  /** Monthly backups to keep */
  monthlyRetention: number;

  /** Yearly backups to keep */
  yearlyRetention: number;
}

/**
 * Backup location settings
 */
export interface BackupLocationSettings {
  /** Primary location */
  primaryLocation: string;

  /** Secondary location */
  secondaryLocation?: string;

  /** Geographic distribution */
  geographicDistribution: boolean;

  /** Cloud backup */
  cloudBackup: CloudBackupSettings;
}

/**
 * Cloud backup settings
 */
export interface CloudBackupSettings {
  /** Cloud backup enabled */
  enabled: boolean;

  /** Cloud provider */
  provider: CloudProvider;

  /** Storage class */
  storageClass: CloudStorageClass;

  /** Geographic regions */
  regions: string[];
}

/**
 * Cloud providers
 */
export enum CloudProvider {
  AWS = "aws",
  AZURE = "azure",
  GCP = "gcp",
  IBM = "ibm",
  ORACLE = "oracle",
}

/**
 * Cloud storage classes
 */
export enum CloudStorageClass {
  STANDARD = "standard",
  COLD = "cold",
  ARCHIVE = "archive",
  DEEP_ARCHIVE = "deep_archive",
}

/**
 * Backup encryption settings
 */
export interface BackupEncryptionSettings {
  /** Encryption enabled */
  enabled: boolean;

  /** Encryption algorithm */
  algorithm: string;

  /** Key management */
  keyManagement: BackupKeyManagement;

  /** Compression before encryption */
  compressionEnabled: boolean;
}

/**
 * Backup key management
 */
export interface BackupKeyManagement {
  /** Key provider */
  keyProvider: KeyProvider;

  /** Key rotation */
  keyRotation: KeyRotationSettings;

  /** Key escrow */
  keyEscrow: KeyEscrowSettings;
}

/**
 * Key providers
 */
export enum KeyProvider {
  INTERNAL = "internal",
  HSM = "hsm",
  KMS = "kms",
  THIRD_PARTY = "third_party",
}

/**
 * Key rotation settings
 */
export interface KeyRotationSettings {
  /** Rotation enabled */
  enabled: boolean;

  /** Rotation frequency */
  frequency: number;

  /** Auto-rotation */
  autoRotation: boolean;

  /** Rotation notification */
  notification: boolean;
}

/**
 * Key escrow settings
 */
export interface KeyEscrowSettings {
  /** Escrow enabled */
  enabled: boolean;

  /** Escrow agents */
  escrowAgents: string[];

  /** Recovery threshold */
  recoveryThreshold: number;

  /** Escrow verification */
  verification: EscrowVerificationSettings;
}

/**
 * Escrow verification settings
 */
export interface EscrowVerificationSettings {
  /** Verification frequency */
  frequency: number;

  /** Verification method */
  method: EscrowVerificationMethod;

  /** Verification documentation */
  documentation: boolean;
}

/**
 * Escrow verification methods
 */
export enum EscrowVerificationMethod {
  AUTOMATED = "automated",
  MANUAL = "manual",
  THIRD_PARTY = "third_party",
  HYBRID = "hybrid",
}

/**
 * Recovery settings
 */
export interface RecoverySettings {
  /** Recovery testing */
  recoveryTesting: RecoveryTestingSettings;

  /** Recovery procedures */
  recoveryProcedures: RecoveryProcedureSettings;

  /** Recovery time objectives */
  recoveryTimeObjective: number;

  /** Recovery point objectives */
  recoveryPointObjective: number;
}

/**
 * Recovery testing settings
 */
export interface RecoveryTestingSettings {
  /** Testing enabled */
  enabled: boolean;

  /** Testing frequency */
  frequency: number;

  /** Testing scope */
  scope: RecoveryTestingScope;

  /** Testing documentation */
  documentation: boolean;
}

/**
 * Recovery testing scopes
 */
export enum RecoveryTestingScope {
  FULL = "full",
  PARTIAL = "partial",
  METADATA_ONLY = "metadata_only",
  SAMPLE_DATA = "sample_data",
}

/**
 * Recovery procedure settings
 */
export interface RecoveryProcedureSettings {
  /** Automated recovery */
  automatedRecovery: boolean;

  /** Manual intervention points */
  manualInterventionPoints: string[];

  /** Recovery validation */
  recoveryValidation: RecoveryValidationSettings;

  /** Recovery notification */
  recoveryNotification: NotificationSettings;
}

/**
 * Recovery validation settings
 */
export interface RecoveryValidationSettings {
  /** Validation enabled */
  enabled: boolean;

  /** Validation checks */
  validationChecks: string[];

  /** Validation timeout */
  validationTimeout: number;

  /** Validation reporting */
  validationReporting: boolean;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  /** Notification enabled */
  enabled: boolean;

  /** Notification channels */
  channels: NotificationChannel[];

  /** Notification templates */
  templates: NotificationTemplate[];

  /** Escalation rules */
  escalationRules: EscalationRule[];
}

/**
 * Notification channels
 */
export enum NotificationChannel {
  EMAIL = "email",
  SMS = "sms",
  SLACK = "slack",
  WEBHOOK = "webhook",
  PAGER_DUTY = "pager_duty",
  MICROSOFT_TEAMS = "microsoft_teams",
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  /** Template name */
  name: string;

  /** Template content */
  content: string;

  /** Template variables */
  variables: string[];

  /** Template format */
  format: NotificationFormat;
}

/**
 * Notification formats
 */
export enum NotificationFormat {
  PLAIN_TEXT = "plain_text",
  HTML = "html",
  MARKDOWN = "markdown",
  JSON = "json",
}

/**
 * Escalation rule
 */
export interface EscalationRule {
  /** Rule name */
  name: string;

  /** Trigger conditions */
  triggerConditions: string[];

  /** Escalation delay */
  escalationDelay: number;

  /** Escalation targets */
  escalationTargets: string[];

  /** Maximum escalations */
  maxEscalations: number;
}

/**
 * Disaster recovery settings
 */
export interface DisasterRecoverySettings {
  /** Disaster recovery enabled */
  enabled: boolean;

  /** Recovery sites */
  recoverySites: RecoverySite[];

  /** Failover procedures */
  failoverProcedures: FailoverProcedureSettings;

  /** Business continuity */
  businessContinuity: BusinessContinuitySettings;
}

/**
 * Recovery site
 */
export interface RecoverySite {
  /** Site name */
  name: string;

  /** Site location */
  location: string;

  /** Site type */
  type: RecoverySiteType;

  /** Capacity */
  capacity: RecoverySiteCapacity;

  /** Readiness level */
  readinessLevel: RecoverySiteReadiness;
}

/**
 * Recovery site types
 */
export enum RecoverySiteType {
  HOT_SITE = "hot_site",
  WARM_SITE = "warm_site",
  COLD_SITE = "cold_site",
  CLOUD_SITE = "cloud_site",
}

/**
 * Recovery site capacity
 */
export interface RecoverySiteCapacity {
  /** Computing capacity */
  computingCapacity: number;

  /** Storage capacity */
  storageCapacity: number;

  /** Network capacity */
  networkCapacity: number;

  /** Personnel capacity */
  personnelCapacity: number;
}

/**
 * Recovery site readiness levels
 */
export enum RecoverySiteReadiness {
  IMMEDIATE = "immediate",
  WITHIN_HOURS = "within_hours",
  WITHIN_DAYS = "within_days",
  WITHIN_WEEKS = "within_weeks",
}

/**
 * Failover procedure settings
 */
export interface FailoverProcedureSettings {
  /** Automated failover */
  automatedFailover: boolean;

  /** Failover triggers */
  failoverTriggers: FailoverTrigger[];

  /** Failover validation */
  failoverValidation: FailoverValidationSettings;

  /** Rollback procedures */
  rollbackProcedures: RollbackProcedureSettings;
}

/**
 * Failover trigger
 */
export interface FailoverTrigger {
  /** Trigger name */
  name: string;

  /** Trigger condition */
  condition: string;

  /** Trigger threshold */
  threshold: number;

  /** Trigger delay */
  delay: number;
}

/**
 * Failover validation settings
 */
export interface FailoverValidationSettings {
  /** Validation enabled */
  enabled: boolean;

  /** Validation steps */
  validationSteps: string[];

  /** Validation timeout */
  timeout: number;

  /** Validation reporting */
  reporting: boolean;
}

/**
 * Rollback procedure settings
 */
export interface RollbackProcedureSettings {
  /** Rollback enabled */
  enabled: boolean;

  /** Rollback conditions */
  rollbackConditions: string[];

  /** Rollback validation */
  rollbackValidation: boolean;

  /** Rollback notification */
  rollbackNotification: boolean;
}

/**
 * Business continuity settings
 */
export interface BusinessContinuitySettings {
  /** Critical business functions */
  criticalFunctions: CriticalFunction[];

  /** Recovery priorities */
  recoveryPriorities: RecoveryPriority[];

  /** Communication plans */
  communicationPlans: CommunicationPlan[];

  /** Training and awareness */
  trainingAwareness: TrainingAwarenessSettings;
}

/**
 * Critical function
 */
export interface CriticalFunction {
  /** Function name */
  name: string;

  /** Function description */
  description: string;

  /** Recovery time objective */
  rto: number;

  /** Recovery point objective */
  rpo: number;

  /** Dependencies */
  dependencies: string[];
}

/**
 * Recovery priority
 */
export interface RecoveryPriority {
  /** Priority level */
  level: number;

  /** Function names */
  functions: string[];

  /** Recovery order */
  recoveryOrder: number;

  /** Resource allocation */
  resourceAllocation: number;
}

/**
 * Communication plan
 */
export interface CommunicationPlan {
  /** Plan name */
  name: string;

  /** Stakeholder groups */
  stakeholderGroups: string[];

  /** Communication channels */
  communicationChannels: NotificationChannel[];

  /** Communication templates */
  communicationTemplates: NotificationTemplate[];
}

/**
 * Training and awareness settings
 */
export interface TrainingAwarenessSettings {
  /** Training enabled */
  enabled: boolean;

  /** Training frequency */
  frequency: number;

  /** Training modules */
  modules: string[];

  /** Awareness campaigns */
  awarenessCampaigns: string[];
}

/**
 * Storage security settings
 */
export interface StorageSecuritySettings {
  /** Encryption at rest */
  encryptionAtRest: EncryptionAtRestSettings;

  /** Encryption in transit */
  encryptionInTransit: EncryptionInTransitSettings;

  /** Access controls */
  accessControls: StorageAccessControlSettings;

  /** Audit logging */
  auditLogging: StorageAuditLoggingSettings;
}

/**
 * Encryption at rest settings
 */
export interface EncryptionAtRestSettings {
  /** Encryption enabled */
  enabled: boolean;

  /** Encryption algorithm */
  algorithm: string;

  /** Key management */
  keyManagement: string;

  /** Transparent encryption */
  transparentEncryption: boolean;
}

/**
 * Encryption in transit settings
 */
export interface EncryptionInTransitSettings {
  /** Encryption enabled */
  enabled: boolean;

  /** TLS version */
  tlsVersion: string;

  /** Cipher suites */
  cipherSuites: string[];

  /** Certificate validation */
  certificateValidation: boolean;
}

/**
 * Storage access control settings
 */
export interface StorageAccessControlSettings {
  /** Authentication required */
  authenticationRequired: boolean;

  /** Authorization model */
  authorizationModel: AuthorizationModel;

  /** Role-based access control */
  rbac: RbacSettings;

  /** Attribute-based access control */
  abac: AbacSettings;
}

/**
 * Authorization models
 */
export enum AuthorizationModel {
  RBAC = "rbac",
  ABAC = "abac",
  DAC = "dac",
  MAC = "mac",
  HYBRID = "hybrid",
}

/**
 * RBAC settings
 */
export interface RbacSettings {
  /** Roles defined */
  roles: Role[];

  /** Role inheritance */
  roleInheritance: boolean;

  /** Dynamic roles */
  dynamicRoles: boolean;

  /** Role auditing */
  roleAuditing: boolean;
}

/**
 * Role definition
 */
export interface Role {
  /** Role name */
  name: string;

  /** Role description */
  description: string;

  /** Permissions */
  permissions: Permission[];

  /** Parent roles */
  parentRoles: string[];
}

/**
 * Permission definition
 */
export interface Permission {
  /** Permission name */
  name: string;

  /** Resource */
  resource: string;

  /** Actions */
  actions: string[];

  /** Conditions */
  conditions: string[];
}

/**
 * ABAC settings
 */
export interface AbacSettings {
  /** Attributes defined */
  attributes: Attribute[];

  /** Policies defined */
  policies: AbacPolicy[];

  /** Policy evaluation */
  policyEvaluation: PolicyEvaluationSettings;

  /** Attribute management */
  attributeManagement: AttributeManagementSettings;
}

/**
 * Attribute definition
 */
export interface Attribute {
  /** Attribute name */
  name: string;

  /** Attribute type */
  type: AttributeType;

  /** Attribute values */
  values: string[];

  /** Attribute source */
  source: string;
}

/**
 * Attribute types
 */
export enum AttributeType {
  SUBJECT = "subject",
  OBJECT = "object",
  ENVIRONMENT = "environment",
  ACTION = "action",
}

/**
 * ABAC policy
 */
export interface AbacPolicy {
  /** Policy name */
  name: string;

  /** Policy description */
  description: string;

  /** Policy rules */
  rules: PolicyRule[];

  /** Policy effect */
  effect: PolicyEffect;
}

/**
 * Policy rule
 */
export interface PolicyRule {
  /** Rule condition */
  condition: string;

  /** Rule target */
  target: string;

  /** Rule action */
  action: string;

  /** Rule effect */
  effect: PolicyEffect;
}

/**
 * Policy effects
 */
export enum PolicyEffect {
  PERMIT = "permit",
  DENY = "deny",
  NOT_APPLICABLE = "not_applicable",
  INDETERMINATE = "indeterminate",
}

/**
 * Policy evaluation settings
 */
export interface PolicyEvaluationSettings {
  /** Evaluation engine */
  evaluationEngine: string;

  /** Combining algorithm */
  combiningAlgorithm: CombiningAlgorithm;

  /** Performance optimization */
  performanceOptimization: boolean;

  /** Caching enabled */
  cachingEnabled: boolean;
}

/**
 * Combining algorithms
 */
export enum CombiningAlgorithm {
  DENY_OVERRIDES = "deny_overrides",
  PERMIT_OVERRIDES = "permit_overrides",
  FIRST_APPLICABLE = "first_applicable",
  DENY_UNLESS_PERMIT = "deny_unless_permit",
  PERMIT_UNLESS_DENY = "permit_unless_deny",
}

/**
 * Attribute management settings
 */
export interface AttributeManagementSettings {
  /** Attribute discovery */
  attributeDiscovery: boolean;

  /** Attribute validation */
  attributeValidation: boolean;

  /** Attribute lifecycle */
  attributeLifecycle: AttributeLifecycleSettings;

  /** Attribute federation */
  attributeFederation: AttributeFederationSettings;
}

/**
 * Attribute lifecycle settings
 */
export interface AttributeLifecycleSettings {
  /** Creation workflow */
  creationWorkflow: string;

  /** Update workflow */
  updateWorkflow: string;

  /** Deletion workflow */
  deletionWorkflow: string;

  /** Archival workflow */
  archivalWorkflow: string;
}

/**
 * Attribute federation settings
 */
export interface AttributeFederationSettings {
  /** Federation enabled */
  enabled: boolean;

  /** Federation protocols */
  protocols: string[];

  /** Trust relationships */
  trustRelationships: TrustRelationship[];

  /** Attribute mapping */
  attributeMapping: AttributeMapping[];
}

/**
 * Trust relationship
 */
export interface TrustRelationship {
  /** Partner name */
  partnerName: string;

  /** Trust level */
  trustLevel: TrustLevel;

  /** Certificate */
  certificate: string;

  /** Expiration date */
  expirationDate: Date;
}

/**
 * Trust levels
 */
export enum TrustLevel {
  NONE = "none",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  FULL = "full",
}

/**
 * Attribute mapping
 */
export interface AttributeMapping {
  /** Source attribute */
  sourceAttribute: string;

  /** Target attribute */
  targetAttribute: string;

  /** Transformation rules */
  transformationRules: string[];

  /** Validation rules */
  validationRules: string[];
}

/**
 * Storage audit logging settings
 */
export interface StorageAuditLoggingSettings {
  /** Audit logging enabled */
  enabled: boolean;

  /** Logged operations */
  loggedOperations: string[];

  /** Log format */
  logFormat: AuditLogFormat;

  /** Log retention */
  logRetention: AuditLogRetentionSettings;

  /** Log integrity */
  logIntegrity: AuditLogIntegritySettings;
}

/**
 * Audit log formats
 */
export enum AuditLogFormat {
  JSON = "json",
  XML = "xml",
  CEF = "cef",
  SYSLOG = "syslog",
  CUSTOM = "custom",
}

/**
 * Audit log retention settings
 */
export interface AuditLogRetentionSettings {
  /** Retention period */
  retentionPeriod: number;

  /** Archival enabled */
  archivalEnabled: boolean;

  /** Archival location */
  archivalLocation: string;

  /** Compression enabled */
  compressionEnabled: boolean;
}

/**
 * Audit log integrity settings
 */
export interface AuditLogIntegritySettings {
  /** Digital signatures */
  digitalSignatures: boolean;

  /** Hash chains */
  hashChains: boolean;

  /** Timestamp services */
  timestampServices: boolean;

  /** Immutable storage */
  immutableStorage: boolean;
}

/**
 * Validation engine configuration
 */
export interface ValidationEngine {
  /** Engine type */
  engineType: ValidationEngineType;

  /** Validation rules */
  validationRules: ValidationRule[];

  /** Rule execution */
  ruleExecution: RuleExecutionSettings;

  /** Performance settings */
  performanceSettings: ValidationPerformanceSettings;

  /** Error handling */
  errorHandling: ValidationErrorHandlingSettings;
}

/**
 * Validation engine types
 */
export enum ValidationEngineType {
  RULES_ENGINE = "rules_engine",
  SCHEMA_VALIDATOR = "schema_validator",
  BUSINESS_RULES = "business_rules",
  MACHINE_LEARNING = "machine_learning",
  HYBRID = "hybrid",
}

/**
 * Validation rule
 */
export interface ValidationRule {
  /** Rule identifier */
  ruleId: string;

  /** Rule name */
  name: string;

  /** Rule description */
  description: string;

  /** Rule type */
  ruleType: ValidationRuleType;

  /** Rule condition */
  condition: string;

  /** Rule action */
  action: ValidationRuleAction;

  /** Rule priority */
  priority: number;

  /** Rule enabled */
  enabled: boolean;
}

/**
 * Validation rule types
 */
export enum ValidationRuleType {
  SYNTAX = "syntax",
  SEMANTIC = "semantic",
  BUSINESS = "business",
  SECURITY = "security",
  COMPLIANCE = "compliance",
  PERFORMANCE = "performance",
}

/**
 * Validation rule actions
 */
export enum ValidationRuleAction {
  ACCEPT = "accept",
  REJECT = "reject",
  WARN = "warn",
  TRANSFORM = "transform",
  ESCALATE = "escalate",
}

/**
 * Rule execution settings
 */
export interface RuleExecutionSettings {
  /** Execution mode */
  executionMode: RuleExecutionMode;

  /** Parallel execution */
  parallelExecution: boolean;

  /** Rule ordering */
  ruleOrdering: RuleOrderingStrategy;

  /** Short-circuit evaluation */
  shortCircuitEvaluation: boolean;

  /** Rule dependencies */
  ruleDependencies: RuleDependency[];
}

/**
 * Rule execution modes
 */
export enum RuleExecutionMode {
  SEQUENTIAL = "sequential",
  PARALLEL = "parallel",
  CONDITIONAL = "conditional",
  PRIORITY_BASED = "priority_based",
}

/**
 * Rule ordering strategies
 */
export enum RuleOrderingStrategy {
  PRIORITY = "priority",
  DEPENDENCY = "dependency",
  ALPHABETICAL = "alphabetical",
  PERFORMANCE = "performance",
  CUSTOM = "custom",
}

/**
 * Rule dependency
 */
export interface RuleDependency {
  /** Source rule */
  sourceRule: string;

  /** Target rule */
  targetRule: string;

  /** Dependency type */
  dependencyType: RuleDependencyType;

  /** Condition */
  condition?: string;
}

/**
 * Rule dependency types
 */
export enum RuleDependencyType {
  PREREQUISITE = "prerequisite",
  MUTEX = "mutex",
  CONDITIONAL = "conditional",
  SEQUENTIAL = "sequential",
}

/**
 * Validation performance settings
 */
export interface ValidationPerformanceSettings {
  /** Timeout settings */
  timeoutSettings: ValidationTimeoutSettings;

  /** Caching settings */
  cachingSettings: ValidationCachingSettings;

  /** Resource limits */
  resourceLimits: ValidationResourceLimits;

  /** Optimization settings */
  optimizationSettings: ValidationOptimizationSettings;
}

/**
 * Validation timeout settings
 */
export interface ValidationTimeoutSettings {
  /** Rule execution timeout */
  ruleExecutionTimeout: number;

  /** Total validation timeout */
  totalValidationTimeout: number;

  /** Timeout action */
  timeoutAction: TimeoutAction;

  /** Timeout retry */
  timeoutRetry: TimeoutRetrySettings;
}

/**
 * Timeout actions
 */
export enum TimeoutAction {
  FAIL = "fail",
  WARN = "warn",
  SKIP = "skip",
  DEFAULT_VALUE = "default_value",
}

/**
 * Timeout retry settings
 */
export interface TimeoutRetrySettings {
  /** Retry enabled */
  enabled: boolean;

  /** Max retries */
  maxRetries: number;

  /** Retry delay */
  retryDelay: number;

  /** Backoff strategy */
  backoffStrategy: BackoffStrategy;
}

/**
 * Backoff strategies
 */
export enum BackoffStrategy {
  FIXED = "fixed",
  LINEAR = "linear",
  EXPONENTIAL = "exponential",
  JITTERED = "jittered",
}

/**
 * Validation caching settings
 */
export interface ValidationCachingSettings {
  /** Caching enabled */
  enabled: boolean;

  /** Cache size */
  cacheSize: number;

  /** Cache TTL */
  cacheTtl: number;

  /** Cache key strategy */
  cacheKeyStrategy: CacheKeyStrategy;

  /** Cache invalidation */
  cacheInvalidation: CacheInvalidationSettings;
}

/**
 * Cache key strategies
 */
export enum CacheKeyStrategy {
  HASH_BASED = "hash_based",
  RULE_BASED = "rule_based",
  CONTENT_BASED = "content_based",
  COMPOSITE = "composite",
}

/**
 * Cache invalidation settings
 */
export interface CacheInvalidationSettings {
  /** Invalidation strategy */
  strategy: CacheInvalidationStrategy;

  /** Time-based invalidation */
  timeBasedInvalidation: boolean;

  /** Event-based invalidation */
  eventBasedInvalidation: boolean;

  /** Manual invalidation */
  manualInvalidation: boolean;
}

/**
 * Validation resource limits
 */
export interface ValidationResourceLimits {
  /** Memory limit */
  memoryLimit: number;

  /** CPU limit */
  cpuLimit: number;

  /** Disk space limit */
  diskSpaceLimit: number;

  /** Network bandwidth limit */
  networkBandwidthLimit: number;

  /** Concurrent operations limit */
  concurrentOperationsLimit: number;
}

/**
 * Validation optimization settings
 */
export interface ValidationOptimizationSettings {
  /** Rule optimization */
  ruleOptimization: boolean;

  /** Query optimization */
  queryOptimization: boolean;

  /** Memory optimization */
  memoryOptimization: boolean;

  /** Network optimization */
  networkOptimization: boolean;

  /** Algorithm optimization */
  algorithmOptimization: AlgorithmOptimizationSettings;
}

/**
 * Algorithm optimization settings
 */
export interface AlgorithmOptimizationSettings {
  /** Optimization level */
  optimizationLevel: OptimizationLevel;

  /** Optimization targets */
  optimizationTargets: OptimizationTarget[];

  /** Optimization constraints */
  optimizationConstraints: OptimizationConstraint[];

  /** Performance profiling */
  performanceProfiling: boolean;
}

/**
 * Optimization levels
 */
export enum OptimizationLevel {
  NONE = "none",
  BASIC = "basic",
  STANDARD = "standard",
  AGGRESSIVE = "aggressive",
  CUSTOM = "custom",
}

/**
 * Optimization targets
 */
export enum OptimizationTarget {
  SPEED = "speed",
  MEMORY = "memory",
  ACCURACY = "accuracy",
  THROUGHPUT = "throughput",
  LATENCY = "latency",
}

/**
 * Optimization constraint
 */
export interface OptimizationConstraint {
  /** Constraint type */
  constraintType: ConstraintType;

  /** Constraint value */
  constraintValue: number;

  /** Constraint unit */
  constraintUnit: string;

  /** Constraint priority */
  priority: number;
}

/**
 * Constraint types
 */
export enum ConstraintType {
  MAX_MEMORY = "max_memory",
  MAX_CPU = "max_cpu",
  MAX_TIME = "max_time",
  MAX_DISK = "max_disk",
  MAX_NETWORK = "max_network",
}

/**
 * Validation error handling settings
 */
export interface ValidationErrorHandlingSettings {
  /** Error handling strategy */
  errorHandlingStrategy: ErrorHandlingStrategy;

  /** Error reporting */
  errorReporting: ErrorReportingSettings;

  /** Error recovery */
  errorRecovery: ErrorRecoverySettings;

  /** Error escalation */
  errorEscalation: ErrorEscalationSettings;
}

/**
 * Error handling strategies
 */
export enum ErrorHandlingStrategy {
  FAIL_FAST = "fail_fast",
  COLLECT_ALL_ERRORS = "collect_all_errors",
  CONTINUE_ON_ERROR = "continue_on_error",
  RETRY_ON_ERROR = "retry_on_error",
  FALLBACK_ON_ERROR = "fallback_on_error",
}

/**
 * Error reporting settings
 */
export interface ErrorReportingSettings {
  /** Detailed error reporting */
  detailedErrorReporting: boolean;

  /** Error context inclusion */
  errorContextInclusion: boolean;

  /** Stack trace inclusion */
  stackTraceInclusion: boolean;

  /** Error categorization */
  errorCategorization: boolean;

  /** Error aggregation */
  errorAggregation: ErrorAggregationSettings;
}

/**
 * Error aggregation settings
 */
export interface ErrorAggregationSettings {
  /** Aggregation enabled */
  enabled: boolean;

  /** Aggregation period */
  aggregationPeriod: number;

  /** Aggregation threshold */
  aggregationThreshold: number;

  /** Aggregation grouping */
  aggregationGrouping: string[];
}

/**
 * Error recovery settings
 */
export interface ErrorRecoverySettings {
  /** Recovery enabled */
  enabled: boolean;

  /** Recovery strategies */
  recoveryStrategies: RecoveryStrategy[];

  /** Recovery timeout */
  recoveryTimeout: number;

  /** Recovery validation */
  recoveryValidation: boolean;
}

/**
 * Recovery strategies
 */
export enum RecoveryStrategy {
  RETRY = "retry",
  FALLBACK = "fallback",
  IGNORE = "ignore",
  DEFAULT_VALUE = "default_value",
  MANUAL_INTERVENTION = "manual_intervention",
}

/**
 * Error escalation settings
 */
export interface ErrorEscalationSettings {
  /** Escalation enabled */
  enabled: boolean;

  /** Escalation rules */
  escalationRules: ErrorEscalationRule[];

  /** Escalation channels */
  escalationChannels: NotificationChannel[];

  /** Escalation tracking */
  escalationTracking: boolean;
}

/**
 * Error escalation rule
 */
export interface ErrorEscalationRule {
  /** Rule name */
  name: string;

  /** Error criteria */
  errorCriteria: string[];

  /** Escalation delay */
  escalationDelay: number;

  /** Escalation target */
  escalationTarget: string;

  /** Max escalations */
  maxEscalations: number;
}

// ===========================
// ADDITIONAL CONFIGURATION INTERFACES
// ===========================

/**
 * Compliance configuration
 */
export interface ComplianceConfig {
  /** Enable compliance checking */
  enabled: boolean;

  /** Compliance frameworks */
  frameworks: string[];

  /** Strict mode */
  strictMode: boolean;

  /** Auto-reporting */
  autoReporting: boolean;

  /** Compliance officer contact */
  officerContact: string;

  /** Audit frequency days */
  auditFrequencyDays: number;
}

/**
 * Forensic configuration
 */
export interface ForensicConfig {
  /** Enable forensic mode */
  enabled: boolean;

  /** Evidence preservation level */
  preservationLevel: string;

  /** Chain of custody requirements */
  chainOfCustodyRequired: boolean;

  /** Digital signature requirement */
  digitalSignatureRequired: boolean;

  /** Expert witness assignment */
  expertWitnessRequired: boolean;

  /** Evidence retention years */
  retentionYears: number;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  /** Enable monitoring */
  enabled: boolean;

  /** Monitoring interval milliseconds */
  intervalMs: number;

  /** Alert thresholds */
  alertThresholds: Record<string, number>;

  /** Metrics collection enabled */
  metricsEnabled: boolean;

  /** Performance tracking */
  performanceTracking: boolean;

  /** Health check frequency */
  healthCheckFrequencyMs: number;
}

/**
 * Anomaly detection configuration
 */
export interface AnomalyDetectionConfig {
  /** Enable anomaly detection */
  enabled: boolean;

  /** Detection algorithms */
  algorithms: string[];

  /** Sensitivity threshold */
  sensitivityThreshold: number;

  /** Learning mode enabled */
  learningMode: boolean;

  /** Baseline window hours */
  baselineWindowHours: number;

  /** Alert on anomaly */
  alertOnAnomaly: boolean;
}

/**
 * Threat intelligence configuration
 */
export interface ThreatIntelligenceConfig {
  /** Enable threat intelligence */
  enabled: boolean;

  /** Intelligence sources */
  sources: string[];

  /** Update frequency hours */
  updateFrequencyHours: number;

  /** Threat scoring enabled */
  threatScoringEnabled: boolean;

  /** Auto-blocking threats */
  autoBlockThreats: boolean;

  /** Integration APIs */
  integrationApis: string[];
}

/**
 * Incident response configuration
 */
export interface IncidentResponseConfig {
  /** Enable incident response */
  enabled: boolean;

  /** Response teams */
  responseTeams: string[];

  /** Escalation matrix */
  escalationMatrix: Record<string, string[]>;

  /** Auto-response enabled */
  autoResponseEnabled: boolean;

  /** Response timeout minutes */
  responseTimeoutMinutes: number;

  /** Communication channels */
  communicationChannels: string[];
}

// ===========================
// OPERATIONAL INTERFACES
// ===========================

/**
 * Storage backend operational interface for class implementations
 */
export interface IStorageBackend {
  /** Initialize the storage backend */
  initialize(): Promise<void>;

  /** Store an audit event */
  store(event: AuditEvent): Promise<string>;

  /** Shutdown the storage backend */
  shutdown(): Promise<void>;
}

/**
 * Validation engine operational interface for class implementations
 */
export interface IValidationEngine {
  /** Initialize the validation engine */
  initialize(): Promise<void>;

  /** Validate an audit event */
  validate(event: AuditEvent): Promise<{
    success: boolean;
    score: number;
    messages: string[];
  }>;

  /** Shutdown the validation engine */
  shutdown(): Promise<void>;
}

// ===========================
// MISSING TYPE DEFINITIONS
// ===========================

/**
 * Compliance classification for audit data
 */
export interface ComplianceClassification {
  /** Classification level */
  level: ComplianceLevel;

  /** Applicable frameworks */
  frameworks: ComplianceFramework[];

  /** Classification reason */
  reason: string;

  /** Data retention requirements */
  retentionRequirements: RetentionRequirement[];

  /** Access restrictions */
  accessRestrictions: AccessRestriction[];
}

/**
 * Compliance classification levels
 */
export enum ComplianceLevel {
  PUBLIC = "public",
  INTERNAL = "internal",
  CONFIDENTIAL = "confidential",
  RESTRICTED = "restricted",
  TOP_SECRET = "top_secret",
}

/**
 * Data retention requirement
 */
export interface RetentionRequirement {
  /** Retention period in days */
  retentionPeriod: number;

  /** Framework requiring retention */
  framework: ComplianceFramework;

  /** Disposal method */
  disposalMethod: DisposalMethod;
}

/**
 * Data disposal methods
 */
export enum DisposalMethod {
  SECURE_DELETE = "secure_delete",
  PHYSICAL_DESTRUCTION = "physical_destruction",
  CRYPTOGRAPHIC_ERASURE = "cryptographic_erasure",
  DEGAUSSING = "degaussing",
}

/**
 * Access restriction definition
 */
export interface AccessRestriction {
  /** Restriction type */
  type: RestrictionType;

  /** Allowed roles */
  allowedRoles: string[];

  /** Required permissions */
  requiredPermissions: string[];

  /** Geographic restrictions */
  geographicRestrictions?: string[];
}

/**
 * Conversation analysis for PARLANT interactions
 */
export interface ConversationAnalysis {
  /** Conversation ID */
  conversationId: string;

  /** Message count */
  messageCount: number;

  /** Conversation duration */
  duration: number;

  /** Intent analysis */
  intentAnalysis: IntentAnalysis;

  /** Sentiment analysis */
  sentimentAnalysis: SentimentAnalysis;

  /** Topics discussed */
  topics: string[];

  /** Risk indicators */
  riskIndicators: RiskIndicator[];
}

/**
 * Intent analysis results
 */
export interface IntentAnalysis {
  /** Primary intent */
  primaryIntent: string;

  /** Confidence score */
  confidence: number;

  /** Alternative intents */
  alternativeIntents: Array<{
    intent: string;
    confidence: number;
  }>;
}

/**
 * Sentiment analysis results
 */
export interface SentimentAnalysis {
  /** Overall sentiment */
  sentiment: SentimentType;

  /** Confidence score */
  confidence: number;

  /** Emotional indicators */
  emotions: EmotionIndicator[];
}

/**
 * Sentiment types
 */
export enum SentimentType {
  POSITIVE = "positive",
  NEGATIVE = "negative",
  NEUTRAL = "neutral",
  MIXED = "mixed",
}

/**
 * Emotion indicator
 */
export interface EmotionIndicator {
  /** Emotion type */
  emotion: string;

  /** Intensity score */
  intensity: number;
}

/**
 * Risk indicator for conversation
 */
export interface RiskIndicator {
  /** Risk type */
  type: ConversationRiskType;

  /** Risk level */
  level: RiskLevel;

  /** Description */
  description: string;

  /** Evidence */
  evidence: string[];
}

/**
 * Conversation risk types
 */
export enum ConversationRiskType {
  POLICY_VIOLATION = "policy_violation",
  SECURITY_THREAT = "security_threat",
  COMPLIANCE_RISK = "compliance_risk",
  INAPPROPRIATE_CONTENT = "inappropriate_content",
  DATA_BREACH_RISK = "data_breach_risk",
}

/**
 * Decision reasoning for PARLANT validation
 */
export interface DecisionReasoning {
  /** Decision made */
  decision: ValidationDecision;

  /** Reasoning steps */
  reasoningSteps: ReasoningStep[];

  /** Evidence considered */
  evidence: DecisionEvidence[];

  /** Confidence level */
  confidence: number;

  /** Alternative decisions */
  alternatives: AlternativeDecision[];
}

/**
 * Validation decision types
 */
export enum ValidationDecision {
  APPROVE = "approve",
  DENY = "deny",
  REQUIRE_REVIEW = "require_review",
  REQUEST_ADDITIONAL_INFO = "request_additional_info",
  ESCALATE = "escalate",
}

/**
 * Reasoning step in decision process
 */
export interface ReasoningStep {
  /** Step number */
  step: number;

  /** Step description */
  description: string;

  /** Rule applied */
  ruleApplied?: string;

  /** Result of step */
  result: string;
}

/**
 * Evidence used in decision making
 */
export interface DecisionEvidence {
  /** Evidence type */
  type: EvidenceType;

  /** Evidence description */
  description: string;

  /** Source of evidence */
  source: string;

  /** Reliability score */
  reliability: number;
}

/**
 * Evidence types for audit trail
 */
export enum EvidenceType {
  USER_INPUT = "user_input",
  SYSTEM_LOG = "system_log",
  VALIDATION_RESULT = "validation_result",
  POLICY_RULE = "policy_rule",
  HISTORICAL_DATA = "historical_data",
  EXTERNAL_SOURCE = "external_source",
  BIOMETRIC_DATA = "biometric_data",
  CRYPTOGRAPHIC_PROOF = "cryptographic_proof",
}

/**
 * Alternative decision option
 */
export interface AlternativeDecision {
  /** Alternative decision */
  decision: ValidationDecision;

  /** Reasoning for alternative */
  reasoning: string;

  /** Confidence in alternative */
  confidence: number;
}

/**
 * Bypass information for audit trail
 */
export interface BypassInfo {
  /** Bypass type */
  type: BypassType;

  /** Authorization provided */
  authorization: BypassAuthorization;

  /** Reason for bypass */
  reason: string;

  /** Bypass duration */
  duration?: number;

  /** Conditions applied */
  conditions: string[];

  /** Approver information */
  approver: ApproverInfo;
}

/**
 * Bypass types
 */
export enum BypassType {
  EMERGENCY_OVERRIDE = "emergency_override",
  ADMINISTRATIVE_BYPASS = "administrative_bypass",
  MAINTENANCE_BYPASS = "maintenance_bypass",
  TESTING_BYPASS = "testing_bypass",
  COMPLIANCE_EXCEPTION = "compliance_exception",
}

/**
 * Bypass authorization details
 */
export interface BypassAuthorization {
  /** Authorization ID */
  authorizationId: string;

  /** Authorization level */
  level: AuthorizationLevel;

  /** Issuing authority */
  issuingAuthority: string;

  /** Valid from */
  validFrom: Date;

  /** Valid until */
  validUntil?: Date;
}

/**
 * Authorization levels
 */
export enum AuthorizationLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
  EMERGENCY = "emergency",
}

/**
 * Approver information
 */
export interface ApproverInfo {
  /** Approver ID */
  approverId: string;

  /** Approver name */
  name: string;

  /** Approver role */
  role: string;

  /** Approval timestamp */
  approvalTimestamp: Date;

  /** Digital signature */
  digitalSignature?: string;
}

/**
 * Implementation status for audit controls
 */
export enum ImplementationStatus {
  NOT_IMPLEMENTED = "not_implemented",
  PLANNED = "planned",
  IN_PROGRESS = "in_progress",
  IMPLEMENTED = "implemented",
  PARTIALLY_IMPLEMENTED = "partially_implemented",
  DEFERRED = "deferred",
  CANCELLED = "cancelled",
}

/**
 * Effectiveness rating for controls
 */
export enum EffectivenessRating {
  INEFFECTIVE = "ineffective",
  PARTIALLY_EFFECTIVE = "partially_effective",
  LARGELY_EFFECTIVE = "largely_effective",
  EFFECTIVE = "effective",
  HIGHLY_EFFECTIVE = "highly_effective",
}

/**
 * Risk mitigation strategy
 */
export interface RiskMitigation {
  /** Mitigation strategy */
  strategy: MitigationStrategy;

  /** Implementation plan */
  implementationPlan: ImplementationPlan;

  /** Expected effectiveness */
  expectedEffectiveness: EffectivenessRating;

  /** Cost estimate */
  costEstimate?: number;

  /** Timeline */
  timeline: MitigationTimeline;

  /** Success metrics */
  successMetrics: string[];
}

/**
 * Mitigation strategies
 */
export enum MitigationStrategy {
  AVOID = "avoid",
  MITIGATE = "mitigate",
  TRANSFER = "transfer",
  ACCEPT = "accept",
  MONITOR = "monitor",
}

/**
 * Implementation plan for mitigation
 */
export interface ImplementationPlan {
  /** Plan phases */
  phases: ImplementationPhase[];

  /** Required resources */
  requiredResources: ResourceRequirement[];

  /** Dependencies */
  dependencies: string[];

  /** Success criteria */
  successCriteria: string[];
}

/**
 * Implementation phase
 */
export interface ImplementationPhase {
  /** Phase name */
  name: string;

  /** Phase description */
  description: string;

  /** Start date */
  startDate: Date;

  /** End date */
  endDate: Date;

  /** Deliverables */
  deliverables: string[];

  /** Status */
  status: ImplementationStatus;
}

/**
 * Resource requirement
 */
export interface ResourceRequirement {
  /** Resource type */
  type: ResourceType;

  /** Quantity needed */
  quantity: number;

  /** Duration needed */
  duration: number;

  /** Cost */
  cost?: number;
}

/**
 * Resource types
 */
export enum ResourceType {
  PERSONNEL = "personnel",
  TECHNOLOGY = "technology",
  BUDGET = "budget",
  TIME = "time",
  INFRASTRUCTURE = "infrastructure",
}

/**
 * Mitigation timeline
 */
export interface MitigationTimeline {
  /** Start date */
  startDate: Date;

  /** Target completion date */
  targetCompletionDate: Date;

  /** Milestones */
  milestones: TimelineMilestone[];

  /** Critical path */
  criticalPath: string[];
}

/**
 * Timeline milestone
 */
export interface TimelineMilestone {
  /** Milestone name */
  name: string;

  /** Target date */
  targetDate: Date;

  /** Completion status */
  completed: boolean;

  /** Completion date */
  completionDate?: Date;
}

// Export additional types from compliance-forensic.types
export * from "./compliance-forensic.types";
