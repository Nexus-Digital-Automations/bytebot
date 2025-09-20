"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityLevel = exports.IntentCategory = exports.MessageType = exports.ErrorSeverity = exports.AuditAction = exports.ActorType = exports.AuditEntryType = exports.FallbackBehavior = exports.RetryCondition = exports.ErrorHandlingStrategy = exports.LogFormat = exports.LogDestination = exports.LogLevel = exports.CacheEvictionPolicy = exports.CacheKeyStrategy = exports.SourceType = exports.ArtifactType = exports.TestingRequirement = exports.ImpactLevel = exports.ModificationType = exports.ActionUrgency = exports.ActionType = exports.RecommendationType = exports.ValidationDecision = exports.ValidationRuleType = exports.ApprovalLevel = exports.ValidationMode = exports.ExecutionEnvironment = exports.RiskLevel = exports.FunctionSecurityLevel = exports.ParticipantCapability = exports.ParticipantRole = exports.ParticipantType = exports.ConversationHistoryType = exports.ConversationPriority = exports.ConversationState = void 0;
var ConversationState;
(function (ConversationState) {
    ConversationState["_INITIATED"] = "initiated";
    ConversationState["_ACTIVE"] = "active";
    ConversationState["_VALIDATING"] = "validating";
    ConversationState["_APPROVED"] = "approved";
    ConversationState["_DENIED"] = "denied";
    ConversationState["_COMPLETED"] = "completed";
    ConversationState["_SUSPENDED"] = "suspended";
    ConversationState["_ERROR"] = "error";
})(ConversationState || (exports.ConversationState = ConversationState = {}));
var ConversationPriority;
(function (ConversationPriority) {
    ConversationPriority["_LOW"] = "low";
    ConversationPriority["_NORMAL"] = "normal";
    ConversationPriority["_HIGH"] = "high";
    ConversationPriority["_CRITICAL"] = "critical";
    ConversationPriority["_EMERGENCY"] = "emergency";
})(ConversationPriority || (exports.ConversationPriority = ConversationPriority = {}));
var ConversationHistoryType;
(function (ConversationHistoryType) {
    ConversationHistoryType["_MESSAGE"] = "message";
    ConversationHistoryType["_VALIDATION_REQUEST"] = "validation_request";
    ConversationHistoryType["_VALIDATION_RESPONSE"] = "validation_response";
    ConversationHistoryType["_APPROVAL"] = "approval";
    ConversationHistoryType["_DENIAL"] = "denial";
    ConversationHistoryType["_ERROR"] = "error";
    ConversationHistoryType["_STATE_CHANGE"] = "state_change";
})(ConversationHistoryType || (exports.ConversationHistoryType = ConversationHistoryType = {}));
var ParticipantType;
(function (ParticipantType) {
    ParticipantType["_HUMAN"] = "human";
    ParticipantType["_AI_AGENT"] = "ai_agent";
    ParticipantType["_SYSTEM"] = "system";
    ParticipantType["_BOT"] = "bot";
})(ParticipantType || (exports.ParticipantType = ParticipantType = {}));
var ParticipantRole;
(function (ParticipantRole) {
    ParticipantRole["_REQUESTOR"] = "requestor";
    ParticipantRole["_APPROVER"] = "approver";
    ParticipantRole["_OBSERVER"] = "observer";
    ParticipantRole["_MODERATOR"] = "moderator";
    ParticipantRole["_VALIDATOR"] = "validator";
})(ParticipantRole || (exports.ParticipantRole = ParticipantRole = {}));
var ParticipantCapability;
(function (ParticipantCapability) {
    ParticipantCapability["_VALIDATE_FUNCTIONS"] = "validate_functions";
    ParticipantCapability["_APPROVE_ACTIONS"] = "approve_actions";
    ParticipantCapability["_DENY_ACTIONS"] = "deny_actions";
    ParticipantCapability["_MODIFY_REQUESTS"] = "modify_requests";
    ParticipantCapability["_VIEW_AUDIT"] = "view_audit";
    ParticipantCapability["_MANAGE_CONVERSATION"] = "manage_conversation";
})(ParticipantCapability || (exports.ParticipantCapability = ParticipantCapability = {}));
var FunctionSecurityLevel;
(function (FunctionSecurityLevel) {
    FunctionSecurityLevel["_PUBLIC"] = "public";
    FunctionSecurityLevel["_INTERNAL"] = "internal";
    FunctionSecurityLevel["_RESTRICTED"] = "restricted";
    FunctionSecurityLevel["_CONFIDENTIAL"] = "confidential";
    FunctionSecurityLevel["_SECRET"] = "secret";
})(FunctionSecurityLevel || (exports.FunctionSecurityLevel = FunctionSecurityLevel = {}));
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["_MINIMAL"] = "minimal";
    RiskLevel["_LOW"] = "low";
    RiskLevel["_MODERATE"] = "moderate";
    RiskLevel["_HIGH"] = "high";
    RiskLevel["_CRITICAL"] = "critical";
    RiskLevel["_EXTREME"] = "extreme";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
var ExecutionEnvironment;
(function (ExecutionEnvironment) {
    ExecutionEnvironment["_DEVELOPMENT"] = "development";
    ExecutionEnvironment["_TESTING"] = "testing";
    ExecutionEnvironment["_STAGING"] = "staging";
    ExecutionEnvironment["_PRODUCTION"] = "production";
    ExecutionEnvironment["_LOCAL"] = "local";
})(ExecutionEnvironment || (exports.ExecutionEnvironment = ExecutionEnvironment = {}));
var ValidationMode;
(function (ValidationMode) {
    ValidationMode["_SYNCHRONOUS"] = "synchronous";
    ValidationMode["_ASYNCHRONOUS"] = "asynchronous";
    ValidationMode["_INTERACTIVE"] = "interactive";
    ValidationMode["_BATCH"] = "batch";
    ValidationMode["_STREAMING"] = "streaming";
    ValidationMode["_AUTOMATED"] = "automated";
})(ValidationMode || (exports.ValidationMode = ValidationMode = {}));
var ApprovalLevel;
(function (ApprovalLevel) {
    ApprovalLevel["_AUTOMATIC"] = "automatic";
    ApprovalLevel["_SINGLE_APPROVAL"] = "single_approval";
    ApprovalLevel["_DUAL_APPROVAL"] = "dual_approval";
    ApprovalLevel["_COMMITTEE_APPROVAL"] = "committee_approval";
    ApprovalLevel["_UNANIMOUS_APPROVAL"] = "unanimous_approval";
})(ApprovalLevel || (exports.ApprovalLevel = ApprovalLevel = {}));
var ValidationRuleType;
(function (ValidationRuleType) {
    ValidationRuleType["_SECURITY_CHECK"] = "security_check";
    ValidationRuleType["_AUTHORIZATION"] = "authorization";
    ValidationRuleType["_INPUT_VALIDATION"] = "input_validation";
    ValidationRuleType["_BUSINESS_LOGIC"] = "business_logic";
    ValidationRuleType["_COMPLIANCE"] = "compliance";
    ValidationRuleType["_CUSTOM"] = "custom";
})(ValidationRuleType || (exports.ValidationRuleType = ValidationRuleType = {}));
var ValidationDecision;
(function (ValidationDecision) {
    ValidationDecision["_APPROVED"] = "approved";
    ValidationDecision["_DENIED"] = "denied";
    ValidationDecision["_CONDITIONAL_APPROVAL"] = "conditional_approval";
    ValidationDecision["_REQUEST_MORE_INFO"] = "request_more_info";
    ValidationDecision["_ESCALATE"] = "escalate";
    ValidationDecision["_DEFER"] = "defer";
})(ValidationDecision || (exports.ValidationDecision = ValidationDecision = {}));
var RecommendationType;
(function (RecommendationType) {
    RecommendationType["_SECURITY_IMPROVEMENT"] = "security_improvement";
    RecommendationType["_PERFORMANCE_OPTIMIZATION"] = "performance_optimization";
    RecommendationType["_CODE_QUALITY"] = "code_quality";
    RecommendationType["_COMPLIANCE_ENHANCEMENT"] = "compliance_enhancement";
    RecommendationType["_USER_EXPERIENCE"] = "user_experience";
    RecommendationType["_OPERATIONAL"] = "operational";
})(RecommendationType || (exports.RecommendationType = RecommendationType = {}));
var ActionType;
(function (ActionType) {
    ActionType["_MODIFY_FUNCTION"] = "modify_function";
    ActionType["_ADD_VALIDATION"] = "add_validation";
    ActionType["_UPDATE_PERMISSIONS"] = "update_permissions";
    ActionType["_ENHANCE_LOGGING"] = "enhance_logging";
    ActionType["_IMPROVE_ERROR_HANDLING"] = "improve_error_handling";
    ActionType["_OPTIMIZE_PERFORMANCE"] = "optimize_performance";
})(ActionType || (exports.ActionType = ActionType = {}));
var ActionUrgency;
(function (ActionUrgency) {
    ActionUrgency["_IMMEDIATE"] = "immediate";
    ActionUrgency["_HIGH"] = "high";
    ActionUrgency["_NORMAL"] = "normal";
    ActionUrgency["_LOW"] = "low";
    ActionUrgency["_DEFERRED"] = "deferred";
})(ActionUrgency || (exports.ActionUrgency = ActionUrgency = {}));
var ModificationType;
(function (ModificationType) {
    ModificationType["_PARAMETER_VALIDATION"] = "parameter_validation";
    ModificationType["_RETURN_SANITIZATION"] = "return_sanitization";
    ModificationType["_ERROR_HANDLING"] = "error_handling";
    ModificationType["_LOGGING_ENHANCEMENT"] = "logging_enhancement";
    ModificationType["_PERFORMANCE_OPTIMIZATION"] = "performance_optimization";
    ModificationType["_SECURITY_HARDENING"] = "security_hardening";
})(ModificationType || (exports.ModificationType = ModificationType = {}));
var ImpactLevel;
(function (ImpactLevel) {
    ImpactLevel["_NONE"] = "none";
    ImpactLevel["_MINIMAL"] = "minimal";
    ImpactLevel["_LOW"] = "low";
    ImpactLevel["_MODERATE"] = "moderate";
    ImpactLevel["_HIGH"] = "high";
    ImpactLevel["_SEVERE"] = "severe";
})(ImpactLevel || (exports.ImpactLevel = ImpactLevel = {}));
var TestingRequirement;
(function (TestingRequirement) {
    TestingRequirement["_UNIT_TESTS"] = "unit_tests";
    TestingRequirement["_INTEGRATION_TESTS"] = "integration_tests";
    TestingRequirement["_END_TO_END_TESTS"] = "end_to_end_tests";
    TestingRequirement["_SECURITY_TESTS"] = "security_tests";
    TestingRequirement["_PERFORMANCE_TESTS"] = "performance_tests";
    TestingRequirement["_REGRESSION_TESTS"] = "regression_tests";
})(TestingRequirement || (exports.TestingRequirement = TestingRequirement = {}));
var ArtifactType;
(function (ArtifactType) {
    ArtifactType["_LOG_ENTRY"] = "log_entry";
    ArtifactType["_SCREENSHOT"] = "screenshot";
    ArtifactType["_CODE_SNIPPET"] = "code_snippet";
    ArtifactType["_NETWORK_TRACE"] = "network_trace";
    ArtifactType["_SECURITY_SCAN"] = "security_scan";
    ArtifactType["_PERFORMANCE_METRIC"] = "performance_metric";
})(ArtifactType || (exports.ArtifactType = ArtifactType = {}));
var SourceType;
(function (SourceType) {
    SourceType["_SYSTEM_LOG"] = "system_log";
    SourceType["_USER_INPUT"] = "user_input";
    SourceType["_AUTOMATED_SCAN"] = "automated_scan";
    SourceType["_HUMAN_REVIEW"] = "human_review";
    SourceType["_EXTERNAL_API"] = "external_api";
    SourceType["_DATABASE_QUERY"] = "database_query";
})(SourceType || (exports.SourceType = SourceType = {}));
var CacheKeyStrategy;
(function (CacheKeyStrategy) {
    CacheKeyStrategy["_FUNCTION_SIGNATURE"] = "function_signature";
    CacheKeyStrategy["_PARAMETER_HASH"] = "parameter_hash";
    CacheKeyStrategy["_FULL_CONTEXT"] = "full_context";
    CacheKeyStrategy["_CUSTOM"] = "custom";
})(CacheKeyStrategy || (exports.CacheKeyStrategy = CacheKeyStrategy = {}));
var CacheEvictionPolicy;
(function (CacheEvictionPolicy) {
    CacheEvictionPolicy["_LRU"] = "lru";
    CacheEvictionPolicy["_LFU"] = "lfu";
    CacheEvictionPolicy["_FIFO"] = "fifo";
    CacheEvictionPolicy["_TTL"] = "ttl";
    CacheEvictionPolicy["_CUSTOM"] = "custom";
})(CacheEvictionPolicy || (exports.CacheEvictionPolicy = CacheEvictionPolicy = {}));
var LogLevel;
(function (LogLevel) {
    LogLevel["_DEBUG"] = "debug";
    LogLevel["_INFO"] = "info";
    LogLevel["_WARN"] = "warn";
    LogLevel["_ERROR"] = "error";
    LogLevel["_FATAL"] = "fatal";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
var LogDestination;
(function (LogDestination) {
    LogDestination["_CONSOLE"] = "console";
    LogDestination["_FILE"] = "file";
    LogDestination["_DATABASE"] = "database";
    LogDestination["_REMOTE_SERVICE"] = "remote_service";
    LogDestination["_MULTIPLE"] = "multiple";
})(LogDestination || (exports.LogDestination = LogDestination = {}));
var LogFormat;
(function (LogFormat) {
    LogFormat["_JSON"] = "json";
    LogFormat["_TEXT"] = "text";
    LogFormat["_STRUCTURED"] = "structured";
    LogFormat["_CUSTOM"] = "custom";
})(LogFormat || (exports.LogFormat = LogFormat = {}));
var ErrorHandlingStrategy;
(function (ErrorHandlingStrategy) {
    ErrorHandlingStrategy["_FAIL_FAST"] = "fail_fast";
    ErrorHandlingStrategy["_RETRY_WITH_BACKOFF"] = "retry_with_backoff";
    ErrorHandlingStrategy["_FALLBACK_TO_DEFAULT"] = "fallback_to_default";
    ErrorHandlingStrategy["_GRACEFUL_DEGRADATION"] = "graceful_degradation";
    ErrorHandlingStrategy["_CIRCUIT_BREAKER"] = "circuit_breaker";
})(ErrorHandlingStrategy || (exports.ErrorHandlingStrategy = ErrorHandlingStrategy = {}));
var RetryCondition;
(function (RetryCondition) {
    RetryCondition["_NETWORK_ERROR"] = "network_error";
    RetryCondition["_TIMEOUT"] = "timeout";
    RetryCondition["_SERVER_ERROR"] = "server_error";
    RetryCondition["_RATE_LIMIT"] = "rate_limit";
    RetryCondition["_TEMPORARY_FAILURE"] = "temporary_failure";
    RetryCondition["_CUSTOM"] = "custom";
})(RetryCondition || (exports.RetryCondition = RetryCondition = {}));
var FallbackBehavior;
(function (FallbackBehavior) {
    FallbackBehavior["_ALLOW_EXECUTION"] = "allow_execution";
    FallbackBehavior["_DENY_EXECUTION"] = "deny_execution";
    FallbackBehavior["_USE_CACHED_RESULT"] = "use_cached_result";
    FallbackBehavior["_ESCALATE_TO_HUMAN"] = "escalate_to_human";
    FallbackBehavior["_LOG_AND_CONTINUE"] = "log_and_continue";
})(FallbackBehavior || (exports.FallbackBehavior = FallbackBehavior = {}));
var AuditEntryType;
(function (AuditEntryType) {
    AuditEntryType["_VALIDATION_REQUEST"] = "validation_request";
    AuditEntryType["_VALIDATION_RESPONSE"] = "validation_response";
    AuditEntryType["_APPROVAL"] = "approval";
    AuditEntryType["_DENIAL"] = "denial";
    AuditEntryType["_ESCALATION"] = "escalation";
    AuditEntryType["_CONVERSATION_START"] = "conversation_start";
    AuditEntryType["_CONVERSATION_END"] = "conversation_end";
    AuditEntryType["_ERROR"] = "error";
})(AuditEntryType || (exports.AuditEntryType = AuditEntryType = {}));
var ActorType;
(function (ActorType) {
    ActorType["_USER"] = "user";
    ActorType["_SYSTEM"] = "system";
    ActorType["_AI_AGENT"] = "ai_agent";
    ActorType["_SERVICE"] = "service";
    ActorType["_ADMIN"] = "admin";
})(ActorType || (exports.ActorType = ActorType = {}));
var AuditAction;
(function (AuditAction) {
    AuditAction["_REQUEST_VALIDATION"] = "request_validation";
    AuditAction["_PROVIDE_VALIDATION"] = "provide_validation";
    AuditAction["_APPROVE_REQUEST"] = "approve_request";
    AuditAction["_DENY_REQUEST"] = "deny_request";
    AuditAction["_ESCALATE_REQUEST"] = "escalate_request";
    AuditAction["_MODIFY_REQUEST"] = "modify_request";
    AuditAction["_CANCEL_REQUEST"] = "cancel_request";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["_LOW"] = "low";
    ErrorSeverity["_MEDIUM"] = "medium";
    ErrorSeverity["_HIGH"] = "high";
    ErrorSeverity["_CRITICAL"] = "critical";
    ErrorSeverity["_FATAL"] = "fatal";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
var MessageType;
(function (MessageType) {
    MessageType["_TEXT"] = "text";
    MessageType["_VALIDATION_REQUEST"] = "validation_request";
    MessageType["_VALIDATION_RESPONSE"] = "validation_response";
    MessageType["_SYSTEM_NOTIFICATION"] = "system_notification";
    MessageType["_ERROR"] = "error";
    MessageType["_COMMAND"] = "command";
})(MessageType || (exports.MessageType = MessageType = {}));
var IntentCategory;
(function (IntentCategory) {
    IntentCategory["_VALIDATION_REQUEST"] = "validation_request";
    IntentCategory["_APPROVAL_RESPONSE"] = "approval_response";
    IntentCategory["_INFORMATION_REQUEST"] = "information_request";
    IntentCategory["_STATUS_INQUIRY"] = "status_inquiry";
    IntentCategory["_ERROR_REPORT"] = "error_report";
    IntentCategory["_ESCALATION"] = "escalation";
})(IntentCategory || (exports.IntentCategory = IntentCategory = {}));
var parlant_integration_types_1 = require("./parlant-integration.types");
Object.defineProperty(exports, "SecurityLevel", { enumerable: true, get: function () { return parlant_integration_types_1.SecurityLevel; } });
//# sourceMappingURL=parlant.types.js.map