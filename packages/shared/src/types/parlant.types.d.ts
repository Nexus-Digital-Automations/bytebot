export interface ParlantConversationContext {
  conversationId: string;
  userId?: string;
  sessionId?: string;
  state: ConversationState;
  metadata: ConversationMetadata;
  participants: ConversationParticipant[];
  createdAt: Date;
  updatedAt: Date;
}
export declare enum ConversationState {
  _INITIATED = "initiated",
  _ACTIVE = "active",
  _VALIDATING = "validating",
  _APPROVED = "approved",
  _DENIED = "denied",
  _COMPLETED = "completed",
  _SUSPENDED = "suspended",
  _ERROR = "error",
}
export interface ConversationMetadata {
  topic?: string;
  priority: ConversationPriority;
  tags: string[];
  properties: Record<string, unknown>;
  history: ConversationHistoryEntry[];
}
export declare enum ConversationPriority {
  _LOW = "low",
  _NORMAL = "normal",
  _HIGH = "high",
  _CRITICAL = "critical",
  _EMERGENCY = "emergency",
}
export interface ConversationHistoryEntry {
  id: string;
  timestamp: Date;
  type: ConversationHistoryType;
  actor: string;
  content: string;
  metadata?: Record<string, unknown>;
}
export declare enum ConversationHistoryType {
  _MESSAGE = "message",
  _VALIDATION_REQUEST = "validation_request",
  _VALIDATION_RESPONSE = "validation_response",
  _APPROVAL = "approval",
  _DENIAL = "denial",
  _ERROR = "error",
  _STATE_CHANGE = "state_change",
}
export interface ConversationParticipant {
  id: string;
  type: ParticipantType;
  name: string;
  role: ParticipantRole;
  capabilities: ParticipantCapability[];
  joinedAt: Date;
}
export declare enum ParticipantType {
  _HUMAN = "human",
  _AI_AGENT = "ai_agent",
  _SYSTEM = "system",
  _BOT = "bot",
}
export declare enum ParticipantRole {
  _REQUESTOR = "requestor",
  _APPROVER = "approver",
  _OBSERVER = "observer",
  _MODERATOR = "moderator",
  _VALIDATOR = "validator",
}
export declare enum ParticipantCapability {
  _VALIDATE_FUNCTIONS = "validate_functions",
  _APPROVE_ACTIONS = "approve_actions",
  _DENY_ACTIONS = "deny_actions",
  _MODIFY_REQUESTS = "modify_requests",
  _VIEW_AUDIT = "view_audit",
  _MANAGE_CONVERSATION = "manage_conversation",
}
export interface ParlantValidationRequest {
  requestId: string;
  functionContext: FunctionContext;
  validationParams: ValidationParameters;
  conversationContext: ParlantConversationContext;
  timestamp: Date;
  timeout?: number;
  metadata?: Record<string, unknown>;
}
export interface FunctionContext {
  functionName: string;
  arguments: Record<string, unknown>;
  returnType?: string;
  source: SourceLocation;
  securityLevel: FunctionSecurityLevel;
  riskLevel: RiskLevel;
  executionContext: ExecutionContext;
}
export interface SourceLocation {
  filePath: string;
  lineNumber?: number;
  columnNumber?: number;
  methodName?: string;
  className?: string;
  moduleName?: string;
}
export declare enum FunctionSecurityLevel {
  _PUBLIC = "public",
  _INTERNAL = "internal",
  _RESTRICTED = "restricted",
  _CONFIDENTIAL = "confidential",
  _SECRET = "secret",
}
export declare enum RiskLevel {
  _MINIMAL = "minimal",
  _LOW = "low",
  _MODERATE = "moderate",
  _HIGH = "high",
  _CRITICAL = "critical",
  _EXTREME = "extreme",
}
export interface ExecutionContext {
  environment: ExecutionEnvironment;
  user?: UserContext;
  request?: RequestContext;
  session?: SessionContext;
  properties: Record<string, unknown>;
}
export declare enum ExecutionEnvironment {
  _DEVELOPMENT = "development",
  _TESTING = "testing",
  _STAGING = "staging",
  _PRODUCTION = "production",
  _LOCAL = "local",
}
export interface UserContext {
  userId: string;
  roles: string[];
  permissions: string[];
  metadata?: Record<string, unknown>;
}
export interface RequestContext {
  requestId: string;
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  clientIp?: string;
  userAgent?: string;
}
export interface SessionContext {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  metadata?: Record<string, unknown>;
}
export interface ValidationParameters {
  mode: ValidationMode;
  approvalLevel: ApprovalLevel;
  timeout: number;
  cacheable: boolean;
  rules: ValidationRule[];
  customConfig?: Record<string, unknown>;
}
export declare enum ValidationMode {
  _SYNCHRONOUS = "synchronous",
  _ASYNCHRONOUS = "asynchronous",
  _INTERACTIVE = "interactive",
  _BATCH = "batch",
  _STREAMING = "streaming",
  _AUTOMATED = "automated",
}
export declare enum ApprovalLevel {
  _AUTOMATIC = "automatic",
  _SINGLE_APPROVAL = "single_approval",
  _DUAL_APPROVAL = "dual_approval",
  _COMMITTEE_APPROVAL = "committee_approval",
  _UNANIMOUS_APPROVAL = "unanimous_approval",
}
export interface ValidationRule {
  id: string;
  name: string;
  type: ValidationRuleType;
  config: Record<string, unknown>;
  priority: number;
  enabled: boolean;
}
export declare enum ValidationRuleType {
  _SECURITY_CHECK = "security_check",
  _AUTHORIZATION = "authorization",
  _INPUT_VALIDATION = "input_validation",
  _BUSINESS_LOGIC = "business_logic",
  _COMPLIANCE = "compliance",
  _CUSTOM = "custom",
}
export interface ParlantValidationResponse {
  requestId: string;
  result: ValidationResult;
  timestamp: Date;
  processingTime: number;
  conversationContext: ParlantConversationContext;
  metadata?: Record<string, unknown>;
}
export interface ValidationResult {
  decision: ValidationDecision;
  confidence: number;
  reasoning: string;
  ruleResults: ValidationRuleResult[];
  recommendations: ValidationRecommendation[];
  modifications?: FunctionModification[];
  evidence: ValidationEvidence;
}
export declare enum ValidationDecision {
  _APPROVED = "approved",
  _DENIED = "denied",
  _CONDITIONAL_APPROVAL = "conditional_approval",
  _REQUEST_MORE_INFO = "request_more_info",
  _ESCALATE = "escalate",
  _DEFER = "defer",
}
export interface ValidationRuleResult {
  ruleId: string;
  decision: ValidationDecision;
  confidence: number;
  reasoning: string;
  processingTime: number;
  metadata?: Record<string, unknown>;
}
export interface ValidationRecommendation {
  type: RecommendationType;
  description: string;
  priority: number;
  actionable: boolean;
  actions?: RecommendedAction[];
}
export declare enum RecommendationType {
  _SECURITY_IMPROVEMENT = "security_improvement",
  _PERFORMANCE_OPTIMIZATION = "performance_optimization",
  _CODE_QUALITY = "code_quality",
  _COMPLIANCE_ENHANCEMENT = "compliance_enhancement",
  _USER_EXPERIENCE = "user_experience",
  _OPERATIONAL = "operational",
}
export interface RecommendedAction {
  id: string;
  type: ActionType;
  description: string;
  parameters: Record<string, unknown>;
  urgency: ActionUrgency;
}
export declare enum ActionType {
  _MODIFY_FUNCTION = "modify_function",
  _ADD_VALIDATION = "add_validation",
  _UPDATE_PERMISSIONS = "update_permissions",
  _ENHANCE_LOGGING = "enhance_logging",
  _IMPROVE_ERROR_HANDLING = "improve_error_handling",
  _OPTIMIZE_PERFORMANCE = "optimize_performance",
}
export declare enum ActionUrgency {
  _IMMEDIATE = "immediate",
  _HIGH = "high",
  _NORMAL = "normal",
  _LOW = "low",
  _DEFERRED = "deferred",
}
export interface FunctionModification {
  type: ModificationType;
  original: string;
  modified: string;
  reasoning: string;
  impact: ModificationImpact;
}
export declare enum ModificationType {
  _PARAMETER_VALIDATION = "parameter_validation",
  _RETURN_SANITIZATION = "return_sanitization",
  _ERROR_HANDLING = "error_handling",
  _LOGGING_ENHANCEMENT = "logging_enhancement",
  _PERFORMANCE_OPTIMIZATION = "performance_optimization",
  _SECURITY_HARDENING = "security_hardening",
}
export interface ModificationImpact {
  breakingChange: boolean;
  performanceImpact: ImpactLevel;
  securityImpact: ImpactLevel;
  compatibilityImpact: ImpactLevel;
  testingRequired: TestingRequirement[];
}
export declare enum ImpactLevel {
  _NONE = "none",
  _MINIMAL = "minimal",
  _LOW = "low",
  _MODERATE = "moderate",
  _HIGH = "high",
  _SEVERE = "severe",
}
export declare enum TestingRequirement {
  _UNIT_TESTS = "unit_tests",
  _INTEGRATION_TESTS = "integration_tests",
  _END_TO_END_TESTS = "end_to_end_tests",
  _SECURITY_TESTS = "security_tests",
  _PERFORMANCE_TESTS = "performance_tests",
  _REGRESSION_TESTS = "regression_tests",
}
export interface ValidationEvidence {
  artifacts: EvidenceArtifact[];
  sources: EvidenceSource[];
  confidenceScore: number;
  complete: boolean;
  collectedAt: Date;
}
export interface EvidenceArtifact {
  id: string;
  type: ArtifactType;
  content: string | Buffer;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
export declare enum ArtifactType {
  _LOG_ENTRY = "log_entry",
  _SCREENSHOT = "screenshot",
  _CODE_SNIPPET = "code_snippet",
  _NETWORK_TRACE = "network_trace",
  _SECURITY_SCAN = "security_scan",
  _PERFORMANCE_METRIC = "performance_metric",
}
export interface EvidenceSource {
  id: string;
  type: SourceType;
  reliability: number;
  description: string;
  metadata?: Record<string, unknown>;
}
export declare enum SourceType {
  _SYSTEM_LOG = "system_log",
  _USER_INPUT = "user_input",
  _AUTOMATED_SCAN = "automated_scan",
  _HUMAN_REVIEW = "human_review",
  _EXTERNAL_API = "external_api",
  _DATABASE_QUERY = "database_query",
}
export interface ParlantWrapperConfig {
  enabled: boolean;
  defaultValidationMode: ValidationMode;
  defaultApprovalLevel: ApprovalLevel;
  defaultTimeout: number;
  cacheConfig: CacheConfiguration;
  loggingConfig: LoggingConfiguration;
  errorHandling: ErrorHandlingConfiguration;
}
export interface CacheConfiguration {
  enabled: boolean;
  ttl: number;
  sizeLimit: number;
  keyStrategy: CacheKeyStrategy;
  evictionPolicy: CacheEvictionPolicy;
}
export declare enum CacheKeyStrategy {
  _FUNCTION_SIGNATURE = "function_signature",
  _PARAMETER_HASH = "parameter_hash",
  _FULL_CONTEXT = "full_context",
  _CUSTOM = "custom",
}
export declare enum CacheEvictionPolicy {
  _LRU = "lru",
  _LFU = "lfu",
  _FIFO = "fifo",
  _TTL = "ttl",
  _CUSTOM = "custom",
}
export interface LoggingConfiguration {
  enabled: boolean;
  level: LogLevel;
  destination: LogDestination;
  includeSensitiveData: boolean;
  format: LogFormat;
}
export declare enum LogLevel {
  _DEBUG = "debug",
  _INFO = "info",
  _WARN = "warn",
  _ERROR = "error",
  _FATAL = "fatal",
}
export declare enum LogDestination {
  _CONSOLE = "console",
  _FILE = "file",
  _DATABASE = "database",
  _REMOTE_SERVICE = "remote_service",
  _MULTIPLE = "multiple",
}
export declare enum LogFormat {
  _JSON = "json",
  _TEXT = "text",
  _STRUCTURED = "structured",
  _CUSTOM = "custom",
}
export interface ErrorHandlingConfiguration {
  strategy: ErrorHandlingStrategy;
  retryConfig: RetryConfiguration;
  fallbackBehavior: FallbackBehavior;
  errorReporting: ErrorReportingConfig;
}
export declare enum ErrorHandlingStrategy {
  _FAIL_FAST = "fail_fast",
  _RETRY_WITH_BACKOFF = "retry_with_backoff",
  _FALLBACK_TO_DEFAULT = "fallback_to_default",
  _GRACEFUL_DEGRADATION = "graceful_degradation",
  _CIRCUIT_BREAKER = "circuit_breaker",
}
export interface RetryConfiguration {
  maxAttempts: number;
  initialDelay: number;
  delayMultiplier: number;
  maxDelay: number;
  retryConditions: RetryCondition[];
}
export declare enum RetryCondition {
  _NETWORK_ERROR = "network_error",
  _TIMEOUT = "timeout",
  _SERVER_ERROR = "server_error",
  _RATE_LIMIT = "rate_limit",
  _TEMPORARY_FAILURE = "temporary_failure",
  _CUSTOM = "custom",
}
export declare enum FallbackBehavior {
  _ALLOW_EXECUTION = "allow_execution",
  _DENY_EXECUTION = "deny_execution",
  _USE_CACHED_RESULT = "use_cached_result",
  _ESCALATE_TO_HUMAN = "escalate_to_human",
  _LOG_AND_CONTINUE = "log_and_continue",
}
export interface ErrorReportingConfig {
  enabled: boolean;
  destination: string;
  includeStackTrace: boolean;
  includeContext: boolean;
  format: LogFormat;
}
export interface ParlantAuditEntry {
  id: string;
  type: AuditEntryType;
  timestamp: Date;
  conversationId: string;
  requestId?: string;
  actor: AuditActor;
  action: AuditAction;
  details: AuditEntryDetails;
  metadata: Record<string, unknown>;
}
export declare enum AuditEntryType {
  _VALIDATION_REQUEST = "validation_request",
  _VALIDATION_RESPONSE = "validation_response",
  _APPROVAL = "approval",
  _DENIAL = "denial",
  _ESCALATION = "escalation",
  _CONVERSATION_START = "conversation_start",
  _CONVERSATION_END = "conversation_end",
  _ERROR = "error",
}
export interface AuditActor {
  id: string;
  type: ActorType;
  name: string;
  roles: string[];
  metadata?: Record<string, unknown>;
}
export declare enum ActorType {
  _USER = "user",
  _SYSTEM = "system",
  _AI_AGENT = "ai_agent",
  _SERVICE = "service",
  _ADMIN = "admin",
}
export declare enum AuditAction {
  _REQUEST_VALIDATION = "request_validation",
  _PROVIDE_VALIDATION = "provide_validation",
  _APPROVE_REQUEST = "approve_request",
  _DENY_REQUEST = "deny_request",
  _ESCALATE_REQUEST = "escalate_request",
  _MODIFY_REQUEST = "modify_request",
  _CANCEL_REQUEST = "cancel_request",
}
export interface AuditEntryDetails {
  functionContext?: FunctionContext;
  validationResult?: ValidationResult;
  error?: ErrorDetails;
  performanceMetrics?: PerformanceMetrics;
  additionalDetails?: Record<string, unknown>;
}
export interface ErrorDetails {
  code: string;
  message: string;
  stackTrace?: string;
  context?: Record<string, unknown>;
  severity: ErrorSeverity;
}
export declare enum ErrorSeverity {
  _LOW = "low",
  _MEDIUM = "medium",
  _HIGH = "high",
  _CRITICAL = "critical",
  _FATAL = "fatal",
}
export interface PerformanceMetrics {
  startTime: Date;
  endTime: Date;
  duration: number;
  memoryUsage?: number;
  cpuUsage?: number;
  networkMetrics?: NetworkMetrics;
  customMetrics?: Record<string, number>;
}
export interface NetworkMetrics {
  bytesSent: number;
  bytesReceived: number;
  requestCount: number;
  averageResponseTime: number;
  errorCount: number;
}
export interface ParlantWebSocketEvents {
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
  "parlant:validation_result": (_response: ParlantValidationResponse) => void;
  "parlant:conversation_status": (_status: ConversationStatusUpdate) => void;
  "parlant:intent_analysis": (_analysis: IntentAnalysis) => void;
  "parlant:message_received": (_message: ConversationMessage) => void;
  "parlant:participant_joined": (_participant: ConversationParticipant) => void;
  "parlant:participant_left": (_participantId: string) => void;
  "parlant:error": (_error: ParlantError) => void;
}
export interface ConversationMessage {
  id: string;
  conversationId: string;
  sender: ConversationParticipant;
  content: string;
  type: MessageType;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
export declare enum MessageType {
  _TEXT = "text",
  _VALIDATION_REQUEST = "validation_request",
  _VALIDATION_RESPONSE = "validation_response",
  _SYSTEM_NOTIFICATION = "system_notification",
  _ERROR = "error",
  _COMMAND = "command",
}
export interface ConversationStatusUpdate {
  conversationId: string;
  state: ConversationState;
  timestamp: Date;
  reason?: string;
  metadata?: Record<string, unknown>;
}
export interface IntentAnalysis {
  id: string;
  conversationId: string;
  intent: DetectedIntent;
  confidence: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
export interface DetectedIntent {
  name: string;
  category: IntentCategory;
  parameters: Record<string, unknown>;
  description: string;
  confidence: number;
}
export declare enum IntentCategory {
  _VALIDATION_REQUEST = "validation_request",
  _APPROVAL_RESPONSE = "approval_response",
  _INFORMATION_REQUEST = "information_request",
  _STATUS_INQUIRY = "status_inquiry",
  _ERROR_REPORT = "error_report",
  _ESCALATION = "escalation",
}
export interface ParlantError {
  id: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
}
export { SecurityLevel } from "./parlant-integration.types";
//# sourceMappingURL=parlant.types.d.ts.map
