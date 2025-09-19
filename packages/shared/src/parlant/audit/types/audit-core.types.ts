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
} from '../../types/parlant.types';

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
  FUNCTION_EXECUTION_STARTED = 'function_execution_started',
  FUNCTION_EXECUTION_COMPLETED = 'function_execution_completed',
  FUNCTION_EXECUTION_FAILED = 'function_execution_failed',
  FUNCTION_PARAMETER_CAPTURED = 'function_parameter_captured',
  FUNCTION_RETURN_VALUE_CAPTURED = 'function_return_value_captured',

  // PARLANT Validation Events
  PARLANT_VALIDATION_REQUESTED = 'parlant_validation_requested',
  PARLANT_VALIDATION_RECEIVED = 'parlant_validation_received',
  PARLANT_VALIDATION_APPROVED = 'parlant_validation_approved',
  PARLANT_VALIDATION_DENIED = 'parlant_validation_denied',
  PARLANT_VALIDATION_BYPASSED = 'parlant_validation_bypassed',
  PARLANT_VALIDATION_TIMEOUT = 'parlant_validation_timeout',
  PARLANT_VALIDATION_ERROR = 'parlant_validation_error',

  // Database Operation Events
  DATABASE_OPERATION_INITIATED = 'database_operation_initiated',
  DATABASE_OPERATION_EXECUTED = 'database_operation_executed',
  DATABASE_OPERATION_ROLLED_BACK = 'database_operation_rolled_back',
  DATABASE_TRANSACTION_STARTED = 'database_transaction_started',
  DATABASE_TRANSACTION_COMMITTED = 'database_transaction_committed',
  DATABASE_TRANSACTION_ABORTED = 'database_transaction_aborted',

  // User Context and Authorization Events
  USER_AUTHENTICATION_SUCCESS = 'user_authentication_success',
  USER_AUTHENTICATION_FAILED = 'user_authentication_failed',
  USER_AUTHORIZATION_GRANTED = 'user_authorization_granted',
  USER_AUTHORIZATION_DENIED = 'user_authorization_denied',
  USER_PERMISSION_ESCALATED = 'user_permission_escalated',
  USER_SESSION_CREATED = 'user_session_created',
  USER_SESSION_EXPIRED = 'user_session_expired',

  // Security Events
  SECURITY_VIOLATION_DETECTED = 'security_violation_detected',
  SECURITY_ANOMALY_DETECTED = 'security_anomaly_detected',
  SECURITY_POLICY_ENFORCED = 'security_policy_enforced',
  SECURITY_BYPASS_ATTEMPTED = 'security_bypass_attempted',
  SECURITY_ENCRYPTION_APPLIED = 'security_encryption_applied',
  SECURITY_INTEGRITY_VERIFIED = 'security_integrity_verified',

  // Performance and System Events
  PERFORMANCE_THRESHOLD_EXCEEDED = 'performance_threshold_exceeded',
  PERFORMANCE_OPTIMIZATION_APPLIED = 'performance_optimization_applied',
  SYSTEM_RESOURCE_EXHAUSTED = 'system_resource_exhausted',
  SYSTEM_ERROR_OCCURRED = 'system_error_occurred',
  SYSTEM_RECOVERY_INITIATED = 'system_recovery_initiated',

  // Compliance Events
  COMPLIANCE_RULE_APPLIED = 'compliance_rule_applied',
  COMPLIANCE_VIOLATION_DETECTED = 'compliance_violation_detected',
  COMPLIANCE_AUDIT_STARTED = 'compliance_audit_started',
  COMPLIANCE_AUDIT_COMPLETED = 'compliance_audit_completed',
  COMPLIANCE_REPORT_GENERATED = 'compliance_report_generated',

  // Administrative Events
  ADMIN_CONFIGURATION_CHANGED = 'admin_configuration_changed',
  ADMIN_POLICY_UPDATED = 'admin_policy_updated',
  ADMIN_USER_CREATED = 'admin_user_created',
  ADMIN_USER_MODIFIED = 'admin_user_modified',
  ADMIN_USER_DELETED = 'admin_user_deleted',
  ADMIN_AUDIT_ACCESSED = 'admin_audit_accessed',
}

/**
 * Audit event severity levels for classification and alerting
 */
export enum AuditEventSeverity {
  TRACE = 'trace',           // Detailed tracing information
  DEBUG = 'debug',           // Debug-level information
  INFO = 'info',             // Informational events
  NOTICE = 'notice',         // Normal but significant events
  WARNING = 'warning',       // Warning conditions
  ERROR = 'error',           // Error conditions
  CRITICAL = 'critical',     // Critical conditions
  ALERT = 'alert',           // Action must be taken immediately
  EMERGENCY = 'emergency',   // System is unusable
}

/**
 * Audit event status for tracking event lifecycle
 */
export enum AuditEventStatus {
  INITIATED = 'initiated',     // Event initiated but not complete
  IN_PROGRESS = 'in_progress', // Event currently being processed
  COMPLETED = 'completed',     // Event successfully completed
  FAILED = 'failed',           // Event failed to complete
  CANCELLED = 'cancelled',     // Event was cancelled
  TIMEOUT = 'timeout',         // Event timed out
  CORRUPTED = 'corrupted',     // Event data corrupted
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
  PII = 'pii',                    // Personally Identifiable Information
  PHI = 'phi',                    // Protected Health Information
  FINANCIAL = 'financial',        // Financial data
  PAYMENT_CARD = 'payment_card',  // Payment card data
  CREDENTIALS = 'credentials',    // Authentication credentials
  API_KEYS = 'api_keys',         // API keys and tokens
  BIOMETRIC = 'biometric',       // Biometric data
  GENETIC = 'genetic',           // Genetic information
  BEHAVIORAL = 'behavioral',     // Behavioral data
  LOCATION = 'location',         // Location data
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
  REDACTION = 'redaction',           // Data redacted with placeholders
  MASKING = 'masking',               // Data masked with patterns
  TOKENIZATION = 'tokenization',     // Data replaced with tokens
  ENCRYPTION = 'encryption',         // Data encrypted
  HASHING = 'hashing',              // Data hashed
  PSEUDONYMIZATION = 'pseudonymization', // Data pseudonymized
  ANONYMIZATION = 'anonymization',   // Data anonymized
  TRUNCATION = 'truncation',         // Data truncated
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
  UNINTENTIONAL_PII_EXPOSURE = 'unintentional_pii_exposure',
  EXCESSIVE_DATA_RETURN = 'excessive_data_return',
  UNAUTHORIZED_DATA_ACCESS = 'unauthorized_data_access',
  CROSS_TENANT_DATA_LEAK = 'cross_tenant_data_leak',
  PRIVILEGE_ESCALATION_DATA = 'privilege_escalation_data',
  DEBUG_INFORMATION_LEAK = 'debug_information_leak',
  SYSTEM_METADATA_EXPOSURE = 'system_metadata_exposure',
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
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  INPUT_INJECTION = 'input_injection',
  OUTPUT_INFORMATION_LEAK = 'output_information_leak',
  AUTHENTICATION_BYPASS = 'authentication_bypass',
  AUTHORIZATION_BYPASS = 'authorization_bypass',
  INSECURE_CONFIGURATION = 'insecure_configuration',
  CRYPTOGRAPHIC_WEAKNESS = 'cryptographic_weakness',
  DATA_INTEGRITY_VIOLATION = 'data_integrity_violation',
  DENIAL_OF_SERVICE = 'denial_of_service',
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
  ROLE_BASED = 'role_based',
  PERMISSION_BASED = 'permission_based',
  ATTRIBUTE_BASED = 'attribute_based',
  RULE_BASED = 'rule_based',
  CONTEXT_BASED = 'context_based',
  TIME_BASED = 'time_based',
  LOCATION_BASED = 'location_based',
}

/**
 * Authorization check results
 */
export enum AuthorizationResult {
  GRANTED = 'granted',
  DENIED = 'denied',
  CONDITIONAL = 'conditional',
  ESCALATION_REQUIRED = 'escalation_required',
  INSUFFICIENT_INFORMATION = 'insufficient_information',
  ERROR = 'error',
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
  PASSED = 'passed',
  FAILED = 'failed',
  WARNING = 'warning',
  SKIPPED = 'skipped',
  ERROR = 'error',
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
  validationSession: ParlantValidationSession;

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
  SECURITY = 'security',
  COMPLIANCE = 'compliance',
  OPERATIONAL = 'operational',
  BUSINESS = 'business',
  TECHNICAL = 'technical',
  REGULATORY = 'regulatory',
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
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  INPUT_SANITIZATION = 'input_sanitization',
  OUTPUT_ENCODING = 'output_encoding',
  CRYPTOGRAPHIC_VALIDATION = 'cryptographic_validation',
  CERTIFICATE_VALIDATION = 'certificate_validation',
  TOKEN_VALIDATION = 'token_validation',
  SESSION_VALIDATION = 'session_validation',
}

/**
 * Security check results
 */
export enum SecurityCheckResult {
  PASSED = 'passed',
  FAILED = 'failed',
  WARNING = 'warning',
  NOT_APPLICABLE = 'not_applicable',
  ERROR = 'error',
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
 * Compliance status enumeration
 */
export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  UNDER_REVIEW = 'under_review',
  EXEMPTED = 'exempted',
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
  GDPR = 'gdpr',
  SOX = 'sox',
  HIPAA = 'hipaa',
  PCI_DSS = 'pci_dss',
  ISO_27001 = 'iso_27001',
  NIST = 'nist',
  FedRAMP = 'fedramp',
  SOC2 = 'soc2',
}

/**
 * Compliance check results
 */
export enum ComplianceCheckResult {
  PASSED = 'passed',
  FAILED = 'failed',
  WARNING = 'warning',
  NOT_APPLICABLE = 'not_applicable',
  REQUIRES_MANUAL_REVIEW = 'requires_manual_review',
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
  DATA_PROTECTION = 'data_protection',
  PRIVACY = 'privacy',
  FINANCIAL_REPORTING = 'financial_reporting',
  ACCESS_CONTROL = 'access_control',
  AUDIT_TRAIL = 'audit_trail',
  DATA_RETENTION = 'data_retention',
  ENCRYPTION = 'encryption',
  INCIDENT_RESPONSE = 'incident_response',
}

/**
 * Compliance violation severity
 */
export enum ComplianceViolationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  SEVERE = 'severe',
}

// Continue with remaining types in next file...

export * from './audit-core.types';