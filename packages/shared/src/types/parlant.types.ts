/**
 * Parlant Integration Types - Bytebot Platform Conversational AI Framework
 *
 * This module defines comprehensive types and interfaces for integrating Parlant's
 * conversational AI validation capabilities across all Bytebot microservices.
 * Provides foundational types for function-level wrapping, conversation management,
 * and real-time validation workflows.
 *
 * @fileoverview Parlant conversational AI integration type definitions
 * @version 1.0.0
 * @author Parlant Integration Research Agent #2
 */

// ===========================
// CORE PARLANT TYPES
// ===========================

/**
 * Parlant conversation context for maintaining dialogue state
 */
export interface ParlantConversationContext {
  /** Unique conversation identifier */
  conversationId: string;

  /** User identifier associated with the conversation */
  userId?: string;

  /** Session identifier for grouping related conversations */
  sessionId?: string;

  /** Current conversation state */
  state: ConversationState;

  /** Conversation metadata and history */
  metadata: ConversationMetadata;

  /** Active conversation participants */
  participants: ConversationParticipant[];

  /** Conversation creation timestamp */
  createdAt: Date;

  /** Last conversation update timestamp */
  updatedAt: Date;
}

/**
 * Conversation state enumeration
 */
export enum ConversationState {
  _INITIATED = "initiated",
  _ACTIVE = "active",
  _VALIDATING = "validating",
  _APPROVED = "approved",
  _DENIED = "denied",
  _COMPLETED = "completed",
  _SUSPENDED = "suspended",
  _ERROR = "error",
}

/**
 * Conversation metadata container
 */
export interface ConversationMetadata {
  /** Conversation topic or subject */
  topic?: string;

  /** Conversation priority level */
  priority: ConversationPriority;

  /** Associated tags for categorization */
  tags: string[];

  /** Custom metadata properties */
  properties: Record<string, unknown>;

  /** Conversation history entries */
  history: ConversationHistoryEntry[];
}

/**
 * Conversation priority levels
 */
export enum ConversationPriority {
  _LOW = "low",
  _NORMAL = "normal",
  _HIGH = "high",
  _CRITICAL = "critical",
  _EMERGENCY = "emergency",
}

/**
 * Conversation history entry
 */
export interface ConversationHistoryEntry {
  /** Entry identifier */
  id: string;

  /** Entry timestamp */
  timestamp: Date;

  /** Entry type */
  type: ConversationHistoryType;

  /** Entry actor (user, system, parlant) */
  actor: string;

  /** Entry content */
  content: string;

  /** Additional entry metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Conversation history entry types
 */
export enum ConversationHistoryType {
  _MESSAGE = "message",
  _VALIDATION_REQUEST = "validation_request",
  _VALIDATION_RESPONSE = "validation_response",
  _APPROVAL = "approval",
  _DENIAL = "denial",
  _ERROR = "error",
  _STATE_CHANGE = "state_change",
}

/**
 * Conversation participant information
 */
export interface ConversationParticipant {
  /** Participant identifier */
  id: string;

  /** Participant type */
  type: ParticipantType;

  /** Participant display name */
  name: string;

  /** Participant role in conversation */
  role: ParticipantRole;

  /** Participant capabilities */
  capabilities: ParticipantCapability[];

  /** Participant join timestamp */
  joinedAt: Date;
}

/**
 * Participant types
 */
export enum ParticipantType {
  _HUMAN = "human",
  _AI_AGENT = "ai_agent",
  _SYSTEM = "system",
  _BOT = "bot",
}

/**
 * Participant roles in conversation
 */
export enum ParticipantRole {
  _REQUESTOR = "requestor",
  _APPROVER = "approver",
  _OBSERVER = "observer",
  _MODERATOR = "moderator",
  _VALIDATOR = "validator",
}

/**
 * Participant capabilities
 */
export enum ParticipantCapability {
  _VALIDATE_FUNCTIONS = "validate_functions",
  _APPROVE_ACTIONS = "approve_actions",
  _DENY_ACTIONS = "deny_actions",
  _MODIFY_REQUESTS = "modify_requests",
  _VIEW_AUDIT = "view_audit",
  _MANAGE_CONVERSATION = "manage_conversation",
}

// ===========================
// FUNCTION VALIDATION TYPES
// ===========================

/**
 * Parlant function validation request
 */
export interface ParlantValidationRequest {
  /** Unique request identifier */
  requestId: string;

  /** Function being validated */
  functionContext: FunctionContext;

  /** Validation parameters */
  validationParams: ValidationParameters;

  /** Conversation context for this validation */
  conversationContext: ParlantConversationContext;

  /** Request timestamp */
  timestamp: Date;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Request metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Function context information for validation
 */
export interface FunctionContext {
  /** Function name being called */
  functionName: string;

  /** Function arguments/parameters */
  arguments: Record<string, unknown>;

  /** Function return type information */
  returnType?: string;

  /** Function source location */
  source: SourceLocation;

  /** Function security classification */
  securityLevel: FunctionSecurityLevel;

  /** Function risk assessment */
  riskLevel: RiskLevel;

  /** Function execution context */
  executionContext: ExecutionContext;
}

/**
 * Source location information
 */
export interface SourceLocation {
  /** Source file path */
  filePath: string;

  /** Line number in source */
  lineNumber?: number;

  /** Column number in source */
  columnNumber?: number;

  /** Function/method name */
  methodName?: string;

  /** Class name if applicable */
  className?: string;

  /** Module/package name */
  moduleName?: string;
}

/**
 * Function security levels
 */
export enum FunctionSecurityLevel {
  _PUBLIC = "public",
  _INTERNAL = "internal",
  _RESTRICTED = "restricted",
  _CONFIDENTIAL = "confidential",
  _SECRET = "secret",
}

/**
 * Risk assessment levels
 */
export enum RiskLevel {
  _MINIMAL = "minimal",
  _LOW = "low",
  _MODERATE = "moderate",
  _HIGH = "high",
  _CRITICAL = "critical",
  _EXTREME = "extreme",
}

/**
 * Function execution context
 */
export interface ExecutionContext {
  /** Execution environment */
  environment: ExecutionEnvironment;

  /** User context if available */
  user?: UserContext;

  /** Request context if applicable */
  request?: RequestContext;

  /** Session information */
  session?: SessionContext;

  /** Additional context properties */
  properties: Record<string, unknown>;
}

/**
 * Execution environments
 */
export enum ExecutionEnvironment {
  _DEVELOPMENT = "development",
  _TESTING = "testing",
  _STAGING = "staging",
  _PRODUCTION = "production",
  _LOCAL = "local",
}

/**
 * User context information
 */
export interface UserContext {
  /** User identifier */
  userId: string;

  /** User roles */
  roles: string[];

  /** User permissions */
  permissions: string[];

  /** User metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Request context information
 */
export interface RequestContext {
  /** Request identifier */
  requestId: string;

  /** Request method */
  method?: string;

  /** Request URL */
  url?: string;

  /** Request headers */
  headers?: Record<string, string>;

  /** Client IP address */
  clientIp?: string;

  /** User agent */
  userAgent?: string;
}

/**
 * Session context information
 */
export interface SessionContext {
  /** Session identifier */
  sessionId: string;

  /** Session start time */
  startTime: Date;

  /** Last activity time */
  lastActivity: Date;

  /** Session metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Validation parameters
 */
export interface ValidationParameters {
  /** Validation mode */
  mode: ValidationMode;

  /** Required approval level */
  approvalLevel: ApprovalLevel;

  /** Validation timeout in milliseconds */
  timeout: number;

  /** Whether to cache validation results */
  cacheable: boolean;

  /** Validation rules to apply */
  rules: ValidationRule[];

  /** Custom validation configuration */
  customConfig?: Record<string, unknown>;
}

/**
 * Validation modes
 */
export enum ValidationMode {
  _SYNCHRONOUS = "synchronous",
  _ASYNCHRONOUS = "asynchronous",
  _INTERACTIVE = "interactive",
  _BATCH = "batch",
  _STREAMING = "streaming",
}

/**
 * Approval levels required for validation
 */
export enum ApprovalLevel {
  _AUTOMATIC = "automatic",
  _SINGLE_APPROVAL = "single_approval",
  _DUAL_APPROVAL = "dual_approval",
  _COMMITTEE_APPROVAL = "committee_approval",
  _UNANIMOUS_APPROVAL = "unanimous_approval",
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  /** Rule identifier */
  id: string;

  /** Rule name */
  name: string;

  /** Rule type */
  type: ValidationRuleType;

  /** Rule configuration */
  config: Record<string, unknown>;

  /** Rule priority */
  priority: number;

  /** Whether rule is enabled */
  enabled: boolean;
}

/**
 * Validation rule types
 */
export enum ValidationRuleType {
  _SECURITY_CHECK = "security_check",
  _AUTHORIZATION = "authorization",
  _INPUT_VALIDATION = "input_validation",
  _BUSINESS_LOGIC = "business_logic",
  _COMPLIANCE = "compliance",
  _CUSTOM = "custom",
}

// ===========================
// VALIDATION RESPONSE TYPES
// ===========================

/**
 * Parlant validation response
 */
export interface ParlantValidationResponse {
  /** Response identifier (matches request) */
  requestId: string;

  /** Validation result */
  result: ValidationResult;

  /** Response timestamp */
  timestamp: Date;

  /** Processing time in milliseconds */
  processingTime: number;

  /** Updated conversation context */
  conversationContext: ParlantConversationContext;

  /** Response metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Validation result information
 */
export interface ValidationResult {
  /** Overall validation decision */
  decision: ValidationDecision;

  /** Confidence score (0-1) */
  confidence: number;

  /** Validation reasoning */
  reasoning: string;

  /** Individual rule results */
  ruleResults: ValidationRuleResult[];

  /** Recommendations for next steps */
  recommendations: ValidationRecommendation[];

  /** Any modifications suggested */
  modifications?: FunctionModification[];

  /** Validation evidence */
  evidence: ValidationEvidence;
}

/**
 * Validation decisions
 */
export enum ValidationDecision {
  _APPROVED = "approved",
  _DENIED = "denied",
  _CONDITIONAL_APPROVAL = "conditional_approval",
  _REQUEST_MORE_INFO = "request_more_info",
  _ESCALATE = "escalate",
  _DEFER = "defer",
}

/**
 * Individual validation rule result
 */
export interface ValidationRuleResult {
  /** Rule identifier */
  ruleId: string;

  /** Rule decision */
  decision: ValidationDecision;

  /** Rule confidence score */
  confidence: number;

  /** Rule reasoning */
  reasoning: string;

  /** Rule processing time */
  processingTime: number;

  /** Rule metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Validation recommendation
 */
export interface ValidationRecommendation {
  /** Recommendation type */
  type: RecommendationType;

  /** Recommendation description */
  description: string;

  /** Recommendation priority */
  priority: number;

  /** Whether recommendation is actionable */
  actionable: boolean;

  /** Recommended actions */
  actions?: RecommendedAction[];
}

/**
 * Recommendation types
 */
export enum RecommendationType {
  _SECURITY_IMPROVEMENT = "security_improvement",
  _PERFORMANCE_OPTIMIZATION = "performance_optimization",
  _CODE_QUALITY = "code_quality",
  _COMPLIANCE_ENHANCEMENT = "compliance_enhancement",
  _USER_EXPERIENCE = "user_experience",
  _OPERATIONAL = "operational",
}

/**
 * Recommended action
 */
export interface RecommendedAction {
  /** Action identifier */
  id: string;

  /** Action type */
  type: ActionType;

  /** Action description */
  description: string;

  /** Action parameters */
  parameters: Record<string, unknown>;

  /** Action urgency */
  urgency: ActionUrgency;
}

/**
 * Action types
 */
export enum ActionType {
  _MODIFY_FUNCTION = "modify_function",
  _ADD_VALIDATION = "add_validation",
  _UPDATE_PERMISSIONS = "update_permissions",
  _ENHANCE_LOGGING = "enhance_logging",
  _IMPROVE_ERROR_HANDLING = "improve_error_handling",
  _OPTIMIZE_PERFORMANCE = "optimize_performance",
}

/**
 * Action urgency levels
 */
export enum ActionUrgency {
  _IMMEDIATE = "immediate",
  _HIGH = "high",
  _NORMAL = "normal",
  _LOW = "low",
  _DEFERRED = "deferred",
}

/**
 * Function modification suggestion
 */
export interface FunctionModification {
  /** Modification type */
  type: ModificationType;

  /** Original function signature */
  original: string;

  /** Modified function signature */
  modified: string;

  /** Modification reasoning */
  reasoning: string;

  /** Modification impact assessment */
  impact: ModificationImpact;
}

/**
 * Modification types
 */
export enum ModificationType {
  _PARAMETER_VALIDATION = "parameter_validation",
  _RETURN_SANITIZATION = "return_sanitization",
  _ERROR_HANDLING = "error_handling",
  _LOGGING_ENHANCEMENT = "logging_enhancement",
  _PERFORMANCE_OPTIMIZATION = "performance_optimization",
  _SECURITY_HARDENING = "security_hardening",
}

/**
 * Modification impact assessment
 */
export interface ModificationImpact {
  /** Breaking change indicator */
  breakingChange: boolean;

  /** Performance impact */
  performanceImpact: ImpactLevel;

  /** Security impact */
  securityImpact: ImpactLevel;

  /** Compatibility impact */
  compatibilityImpact: ImpactLevel;

  /** Testing requirements */
  testingRequired: TestingRequirement[];
}

/**
 * Impact levels
 */
export enum ImpactLevel {
  _NONE = "none",
  _MINIMAL = "minimal",
  _LOW = "low",
  _MODERATE = "moderate",
  _HIGH = "high",
  _SEVERE = "severe",
}

/**
 * Testing requirements
 */
export enum TestingRequirement {
  _UNIT_TESTS = "unit_tests",
  _INTEGRATION_TESTS = "integration_tests",
  _END_TO_END_TESTS = "end_to_end_tests",
  _SECURITY_TESTS = "security_tests",
  _PERFORMANCE_TESTS = "performance_tests",
  _REGRESSION_TESTS = "regression_tests",
}

/**
 * Validation evidence container
 */
export interface ValidationEvidence {
  /** Evidence artifacts */
  artifacts: EvidenceArtifact[];

  /** Evidence sources */
  sources: EvidenceSource[];

  /** Evidence confidence score */
  confidenceScore: number;

  /** Evidence completeness indicator */
  complete: boolean;

  /** Evidence collection timestamp */
  collectedAt: Date;
}

/**
 * Evidence artifact
 */
export interface EvidenceArtifact {
  /** Artifact identifier */
  id: string;

  /** Artifact type */
  type: ArtifactType;

  /** Artifact content */
  content: string | Buffer;

  /** Artifact metadata */
  metadata: Record<string, unknown>;

  /** Artifact creation timestamp */
  createdAt: Date;
}

/**
 * Evidence artifact types
 */
export enum ArtifactType {
  _LOG_ENTRY = "log_entry",
  _SCREENSHOT = "screenshot",
  _CODE_SNIPPET = "code_snippet",
  _NETWORK_TRACE = "network_trace",
  _SECURITY_SCAN = "security_scan",
  _PERFORMANCE_METRIC = "performance_metric",
}

/**
 * Evidence source information
 */
export interface EvidenceSource {
  /** Source identifier */
  id: string;

  /** Source type */
  type: SourceType;

  /** Source reliability score */
  reliability: number;

  /** Source description */
  description: string;

  /** Source metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Evidence source types
 */
export enum SourceType {
  _SYSTEM_LOG = "system_log",
  _USER_INPUT = "user_input",
  _AUTOMATED_SCAN = "automated_scan",
  _HUMAN_REVIEW = "human_review",
  _EXTERNAL_API = "external_api",
  _DATABASE_QUERY = "database_query",
}

// ===========================
// INTEGRATION WRAPPER TYPES
// ===========================

/**
 * Parlant function wrapper configuration
 */
export interface ParlantWrapperConfig {
  /** Enable wrapper functionality */
  enabled: boolean;

  /** Default validation mode */
  defaultValidationMode: ValidationMode;

  /** Default approval level */
  defaultApprovalLevel: ApprovalLevel;

  /** Default timeout in milliseconds */
  defaultTimeout: number;

  /** Cache configuration */
  cacheConfig: CacheConfiguration;

  /** Logging configuration */
  loggingConfig: LoggingConfiguration;

  /** Error handling configuration */
  errorHandling: ErrorHandlingConfiguration;
}

/**
 * Cache configuration for Parlant integration
 */
export interface CacheConfiguration {
  /** Enable caching */
  enabled: boolean;

  /** Cache TTL in seconds */
  ttl: number;

  /** Cache size limit */
  sizeLimit: number;

  /** Cache key strategy */
  keyStrategy: CacheKeyStrategy;

  /** Cache eviction policy */
  evictionPolicy: CacheEvictionPolicy;
}

/**
 * Cache key strategies
 */
export enum CacheKeyStrategy {
  _FUNCTION_SIGNATURE = "function_signature",
  _PARAMETER_HASH = "parameter_hash",
  _FULL_CONTEXT = "full_context",
  _CUSTOM = "custom",
}

/**
 * Cache eviction policies
 */
export enum CacheEvictionPolicy {
  _LRU = "lru",
  _LFU = "lfu",
  _FIFO = "fifo",
  _TTL = "ttl",
  _CUSTOM = "custom",
}

/**
 * Logging configuration for Parlant integration
 */
export interface LoggingConfiguration {
  /** Enable logging */
  enabled: boolean;

  /** Log level */
  level: LogLevel;

  /** Log destination */
  destination: LogDestination;

  /** Include sensitive data in logs */
  includeSensitiveData: boolean;

  /** Log format */
  format: LogFormat;
}

/**
 * Log levels
 */
export enum LogLevel {
  _DEBUG = "debug",
  _INFO = "info",
  _WARN = "warn",
  _ERROR = "error",
  _FATAL = "fatal",
}

/**
 * Log destinations
 */
export enum LogDestination {
  _CONSOLE = "console",
  _FILE = "file",
  _DATABASE = "database",
  _REMOTE_SERVICE = "remote_service",
  _MULTIPLE = "multiple",
}

/**
 * Log formats
 */
export enum LogFormat {
  _JSON = "json",
  _TEXT = "text",
  _STRUCTURED = "structured",
  _CUSTOM = "custom",
}

/**
 * Error handling configuration
 */
export interface ErrorHandlingConfiguration {
  /** Error handling strategy */
  strategy: ErrorHandlingStrategy;

  /** Retry configuration */
  retryConfig: RetryConfiguration;

  /** Fallback behavior */
  fallbackBehavior: FallbackBehavior;

  /** Error reporting */
  errorReporting: ErrorReportingConfig;
}

/**
 * Error handling strategies
 */
export enum ErrorHandlingStrategy {
  _FAIL_FAST = "fail_fast",
  _RETRY_WITH_BACKOFF = "retry_with_backoff",
  _FALLBACK_TO_DEFAULT = "fallback_to_default",
  _GRACEFUL_DEGRADATION = "graceful_degradation",
  _CIRCUIT_BREAKER = "circuit_breaker",
}

/**
 * Retry configuration
 */
export interface RetryConfiguration {
  /** Maximum retry attempts */
  maxAttempts: number;

  /** Initial retry delay in milliseconds */
  initialDelay: number;

  /** Retry delay multiplier */
  delayMultiplier: number;

  /** Maximum retry delay */
  maxDelay: number;

  /** Retry conditions */
  retryConditions: RetryCondition[];
}

/**
 * Retry conditions
 */
export enum RetryCondition {
  _NETWORK_ERROR = "network_error",
  _TIMEOUT = "timeout",
  _SERVER_ERROR = "server_error",
  _RATE_LIMIT = "rate_limit",
  _TEMPORARY_FAILURE = "temporary_failure",
  _CUSTOM = "custom",
}

/**
 * Fallback behaviors
 */
export enum FallbackBehavior {
  _ALLOW_EXECUTION = "allow_execution",
  _DENY_EXECUTION = "deny_execution",
  _USE_CACHED_RESULT = "use_cached_result",
  _ESCALATE_TO_HUMAN = "escalate_to_human",
  _LOG_AND_CONTINUE = "log_and_continue",
}

/**
 * Error reporting configuration
 */
export interface ErrorReportingConfig {
  /** Enable error reporting */
  enabled: boolean;

  /** Error reporting destination */
  destination: string;

  /** Include stack traces */
  includeStackTrace: boolean;

  /** Include context information */
  includeContext: boolean;

  /** Error reporting format */
  format: LogFormat;
}

// ===========================
// AUDIT AND MONITORING TYPES
// ===========================

/**
 * Parlant audit entry for validation tracking
 */
export interface ParlantAuditEntry {
  /** Audit entry identifier */
  id: string;

  /** Audit entry type */
  type: AuditEntryType;

  /** Audit timestamp */
  timestamp: Date;

  /** Related conversation ID */
  conversationId: string;

  /** Related validation request ID */
  requestId?: string;

  /** Actor who performed the action */
  actor: AuditActor;

  /** Action performed */
  action: AuditAction;

  /** Audit entry details */
  details: AuditEntryDetails;

  /** Audit entry metadata */
  metadata: Record<string, unknown>;
}

/**
 * Audit entry types
 */
export enum AuditEntryType {
  _VALIDATION_REQUEST = "validation_request",
  _VALIDATION_RESPONSE = "validation_response",
  _APPROVAL = "approval",
  _DENIAL = "denial",
  _ESCALATION = "escalation",
  _CONVERSATION_START = "conversation_start",
  _CONVERSATION_END = "conversation_end",
  _ERROR = "error",
}

/**
 * Audit actor information
 */
export interface AuditActor {
  /** Actor identifier */
  id: string;

  /** Actor type */
  type: ActorType;

  /** Actor name */
  name: string;

  /** Actor roles */
  roles: string[];

  /** Actor metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Actor types for audit
 */
export enum ActorType {
  _USER = "user",
  _SYSTEM = "system",
  _AI_AGENT = "ai_agent",
  _SERVICE = "service",
  _ADMIN = "admin",
}

/**
 * Audit actions
 */
export enum AuditAction {
  _REQUEST_VALIDATION = "request_validation",
  _PROVIDE_VALIDATION = "provide_validation",
  _APPROVE_REQUEST = "approve_request",
  _DENY_REQUEST = "deny_request",
  _ESCALATE_REQUEST = "escalate_request",
  _MODIFY_REQUEST = "modify_request",
  _CANCEL_REQUEST = "cancel_request",
}

/**
 * Audit entry details container
 */
export interface AuditEntryDetails {
  /** Function context if applicable */
  functionContext?: FunctionContext;

  /** Validation result if applicable */
  validationResult?: ValidationResult;

  /** Error information if applicable */
  error?: ErrorDetails;

  /** Performance metrics */
  performanceMetrics?: PerformanceMetrics;

  /** Additional details */
  additionalDetails?: Record<string, unknown>;
}

/**
 * Error details for audit
 */
export interface ErrorDetails {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Error stack trace */
  stackTrace?: string;

  /** Error context */
  context?: Record<string, unknown>;

  /** Error severity */
  severity: ErrorSeverity;
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  _LOW = "low",
  _MEDIUM = "medium",
  _HIGH = "high",
  _CRITICAL = "critical",
  _FATAL = "fatal",
}

/**
 * Performance metrics for monitoring
 */
export interface PerformanceMetrics {
  /** Execution start time */
  startTime: Date;

  /** Execution end time */
  endTime: Date;

  /** Total execution duration in milliseconds */
  duration: number;

  /** Memory usage in bytes */
  memoryUsage?: number;

  /** CPU usage percentage */
  cpuUsage?: number;

  /** Network I/O metrics */
  networkMetrics?: NetworkMetrics;

  /** Custom performance metrics */
  customMetrics?: Record<string, number>;
}

/**
 * Network I/O metrics
 */
export interface NetworkMetrics {
  /** Bytes sent */
  bytesSent: number;

  /** Bytes received */
  bytesReceived: number;

  /** Request count */
  requestCount: number;

  /** Average response time */
  averageResponseTime: number;

  /** Error count */
  errorCount: number;
}

// ===========================
// WEBSOCKET EVENT TYPES
// ===========================

/**
 * Parlant WebSocket event types for real-time communication
 */
export interface ParlantWebSocketEvents {
  // Client to Server Events
  "parlant:validate_function": (_request: ParlantValidationRequest) => void;
  "parlant:conversation_update": (
    _conversationId: string,
    _context: Partial<ParlantConversationContext>,
  ) => void;
  "parlant:join_conversation": (_conversationId: string) => void;
  "parlant:leave_conversation": (_conversationId: string) => void;
  "parlant:send_message": (
    _conversationId: string,
    _message: ConversationMessage,
  ) => void;

  // Server to Client Events
  "parlant:validation_result": (_response: ParlantValidationResponse) => void;
  "parlant:conversation_status": (_status: ConversationStatusUpdate) => void;
  "parlant:intent_analysis": (_analysis: IntentAnalysis) => void;
  "parlant:message_received": (_message: ConversationMessage) => void;
  "parlant:participant_joined": (_participant: ConversationParticipant) => void;
  "parlant:participant_left": (_participantId: string) => void;
  "parlant:error": (_error: ParlantError) => void;
}

/**
 * Conversation message structure
 */
export interface ConversationMessage {
  /** Message identifier */
  id: string;

  /** Conversation identifier */
  conversationId: string;

  /** Sender information */
  sender: ConversationParticipant;

  /** Message content */
  content: string;

  /** Message type */
  type: MessageType;

  /** Message timestamp */
  timestamp: Date;

  /** Message metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Message types
 */
export enum MessageType {
  _TEXT = "text",
  _VALIDATION_REQUEST = "validation_request",
  _VALIDATION_RESPONSE = "validation_response",
  _SYSTEM_NOTIFICATION = "system_notification",
  _ERROR = "error",
  _COMMAND = "command",
}

/**
 * Conversation status update
 */
export interface ConversationStatusUpdate {
  /** Conversation identifier */
  conversationId: string;

  /** New conversation state */
  state: ConversationState;

  /** Status update timestamp */
  timestamp: Date;

  /** Status change reason */
  reason?: string;

  /** Additional status metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Intent analysis result
 */
export interface IntentAnalysis {
  /** Analysis identifier */
  id: string;

  /** Conversation identifier */
  conversationId: string;

  /** Detected intent */
  intent: DetectedIntent;

  /** Intent confidence score */
  confidence: number;

  /** Analysis timestamp */
  timestamp: Date;

  /** Analysis metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Detected intent information
 */
export interface DetectedIntent {
  /** Intent name */
  name: string;

  /** Intent category */
  category: IntentCategory;

  /** Intent parameters */
  parameters: Record<string, unknown>;

  /** Intent description */
  description: string;

  /** Intent confidence score */
  confidence: number;
}

/**
 * Intent categories
 */
export enum IntentCategory {
  _VALIDATION_REQUEST = "validation_request",
  _APPROVAL_RESPONSE = "approval_response",
  _INFORMATION_REQUEST = "information_request",
  _STATUS_INQUIRY = "status_inquiry",
  _ERROR_REPORT = "error_report",
  _ESCALATION = "escalation",
}

/**
 * Parlant error structure
 */
export interface ParlantError {
  /** Error identifier */
  id: string;

  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Error details */
  details?: Record<string, unknown>;

  /** Error timestamp */
  timestamp: Date;

  /** Error severity */
  severity: ErrorSeverity;

  /** Error context */
  context?: Record<string, unknown>;
}

// ===========================
// RE-EXPORTS FROM PARLANT-INTEGRATION.TYPES
// ===========================

// Re-export SecurityLevel from parlant-integration.types for convenience
export { SecurityLevel } from "./parlant-integration.types";
