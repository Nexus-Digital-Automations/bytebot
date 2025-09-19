"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationType = exports.ConditionType = exports.ValidationDecision = exports.WorkflowType = exports.RollbackStrategy = exports.ImpactSeverity = exports.ImpactScope = exports.ActionCategory = exports.ActionType = exports.AuthenticationLevel = exports.ValidationType = exports.ProtocolPriority = exports.ParlantStreamingProtocolType = void 0;
var ParlantStreamingProtocolType;
(function (ParlantStreamingProtocolType) {
    ParlantStreamingProtocolType["PROTOCOL_HANDSHAKE"] = "protocol_handshake";
    ParlantStreamingProtocolType["PROTOCOL_ACKNOWLEDGED"] = "protocol_acknowledged";
    ParlantStreamingProtocolType["PROTOCOL_UPGRADE"] = "protocol_upgrade";
    ParlantStreamingProtocolType["PROTOCOL_DOWNGRADE"] = "protocol_downgrade";
    ParlantStreamingProtocolType["STREAM_LIFECYCLE_CREATE"] = "stream_lifecycle_create";
    ParlantStreamingProtocolType["STREAM_LIFECYCLE_READY"] = "stream_lifecycle_ready";
    ParlantStreamingProtocolType["STREAM_LIFECYCLE_SUSPEND"] = "stream_lifecycle_suspend";
    ParlantStreamingProtocolType["STREAM_LIFECYCLE_RESUME"] = "stream_lifecycle_resume";
    ParlantStreamingProtocolType["STREAM_LIFECYCLE_TERMINATE"] = "stream_lifecycle_terminate";
    ParlantStreamingProtocolType["VALIDATION_PROTOCOL_INIT"] = "validation_protocol_init";
    ParlantStreamingProtocolType["VALIDATION_PROTOCOL_STREAM"] = "validation_protocol_stream";
    ParlantStreamingProtocolType["VALIDATION_PROTOCOL_BATCH"] = "validation_protocol_batch";
    ParlantStreamingProtocolType["VALIDATION_PROTOCOL_PRIORITY"] = "validation_protocol_priority";
    ParlantStreamingProtocolType["CONFIRMATION_PROTOCOL_REQUEST"] = "confirmation_protocol_request";
    ParlantStreamingProtocolType["CONFIRMATION_PROTOCOL_RESPONSE"] = "confirmation_protocol_response";
    ParlantStreamingProtocolType["CONFIRMATION_PROTOCOL_TIMEOUT"] = "confirmation_protocol_timeout";
    ParlantStreamingProtocolType["CONFIRMATION_PROTOCOL_ESCALATION"] = "confirmation_protocol_escalation";
    ParlantStreamingProtocolType["PERFORMANCE_PROTOCOL_METRICS"] = "performance_protocol_metrics";
    ParlantStreamingProtocolType["PERFORMANCE_PROTOCOL_ALERT"] = "performance_protocol_alert";
    ParlantStreamingProtocolType["PERFORMANCE_PROTOCOL_OPTIMIZATION"] = "performance_protocol_optimization";
    ParlantStreamingProtocolType["SECURITY_PROTOCOL_CHALLENGE"] = "security_protocol_challenge";
    ParlantStreamingProtocolType["SECURITY_PROTOCOL_VERIFICATION"] = "security_protocol_verification";
    ParlantStreamingProtocolType["SECURITY_PROTOCOL_AUDIT"] = "security_protocol_audit";
})(ParlantStreamingProtocolType || (exports.ParlantStreamingProtocolType = ParlantStreamingProtocolType = {}));
var ProtocolPriority;
(function (ProtocolPriority) {
    ProtocolPriority["BACKGROUND"] = "background";
    ProtocolPriority["LOW"] = "low";
    ProtocolPriority["NORMAL"] = "normal";
    ProtocolPriority["HIGH"] = "high";
    ProtocolPriority["CRITICAL"] = "critical";
    ProtocolPriority["EMERGENCY"] = "emergency";
})(ProtocolPriority || (exports.ProtocolPriority = ProtocolPriority = {}));
var ValidationType;
(function (ValidationType) {
    ValidationType["FUNCTION_EXECUTION"] = "function_execution";
    ValidationType["DATA_ACCESS"] = "data_access";
    ValidationType["SYSTEM_OPERATION"] = "system_operation";
    ValidationType["USER_ACTION"] = "user_action";
    ValidationType["AUTOMATED_WORKFLOW"] = "automated_workflow";
    ValidationType["SECURITY_OPERATION"] = "security_operation";
    ValidationType["COMPLIANCE_CHECK"] = "compliance_check";
    ValidationType["BUSINESS_PROCESS"] = "business_process";
})(ValidationType || (exports.ValidationType = ValidationType = {}));
var AuthenticationLevel;
(function (AuthenticationLevel) {
    AuthenticationLevel["ANONYMOUS"] = "anonymous";
    AuthenticationLevel["BASIC"] = "basic";
    AuthenticationLevel["MULTI_FACTOR"] = "multi_factor";
    AuthenticationLevel["CERTIFICATE"] = "certificate";
    AuthenticationLevel["BIOMETRIC"] = "biometric";
    AuthenticationLevel["ENTERPRISE_SSO"] = "enterprise_sso";
})(AuthenticationLevel || (exports.AuthenticationLevel = AuthenticationLevel = {}));
var ActionType;
(function (ActionType) {
    ActionType["CREATE"] = "create";
    ActionType["READ"] = "read";
    ActionType["UPDATE"] = "update";
    ActionType["DELETE"] = "delete";
    ActionType["EXECUTE"] = "execute";
    ActionType["CONFIGURE"] = "configure";
    ActionType["DEPLOY"] = "deploy";
    ActionType["MIGRATE"] = "migrate";
    ActionType["BACKUP"] = "backup";
    ActionType["RESTORE"] = "restore";
})(ActionType || (exports.ActionType = ActionType = {}));
var ActionCategory;
(function (ActionCategory) {
    ActionCategory["DATA_OPERATION"] = "data_operation";
    ActionCategory["SYSTEM_OPERATION"] = "system_operation";
    ActionCategory["USER_OPERATION"] = "user_operation";
    ActionCategory["SECURITY_OPERATION"] = "security_operation";
    ActionCategory["ADMINISTRATIVE"] = "administrative";
    ActionCategory["MAINTENANCE"] = "maintenance";
    ActionCategory["EMERGENCY"] = "emergency";
})(ActionCategory || (exports.ActionCategory = ActionCategory = {}));
var ImpactScope;
(function (ImpactScope) {
    ImpactScope["LOCAL"] = "local";
    ImpactScope["SERVICE"] = "service";
    ImpactScope["CLUSTER"] = "cluster";
    ImpactScope["REGION"] = "region";
    ImpactScope["GLOBAL"] = "global";
    ImpactScope["EXTERNAL"] = "external";
})(ImpactScope || (exports.ImpactScope = ImpactScope = {}));
var ImpactSeverity;
(function (ImpactSeverity) {
    ImpactSeverity["MINIMAL"] = "minimal";
    ImpactSeverity["LOW"] = "low";
    ImpactSeverity["MEDIUM"] = "medium";
    ImpactSeverity["HIGH"] = "high";
    ImpactSeverity["CRITICAL"] = "critical";
    ImpactSeverity["CATASTROPHIC"] = "catastrophic";
})(ImpactSeverity || (exports.ImpactSeverity = ImpactSeverity = {}));
var RollbackStrategy;
(function (RollbackStrategy) {
    RollbackStrategy["IMMEDIATE"] = "immediate";
    RollbackStrategy["DEFERRED"] = "deferred";
    RollbackStrategy["MANUAL"] = "manual";
    RollbackStrategy["CONDITIONAL"] = "conditional";
    RollbackStrategy["NONE"] = "none";
})(RollbackStrategy || (exports.RollbackStrategy = RollbackStrategy = {}));
var WorkflowType;
(function (WorkflowType) {
    WorkflowType["AUTOMATIC"] = "automatic";
    WorkflowType["MANUAL"] = "manual";
    WorkflowType["HYBRID"] = "hybrid";
    WorkflowType["CONDITIONAL"] = "conditional";
    WorkflowType["PARALLEL"] = "parallel";
    WorkflowType["SEQUENTIAL"] = "sequential";
})(WorkflowType || (exports.WorkflowType = WorkflowType = {}));
var ValidationDecision;
(function (ValidationDecision) {
    ValidationDecision["APPROVED"] = "approved";
    ValidationDecision["DENIED"] = "denied";
    ValidationDecision["CONDITIONAL"] = "conditional";
    ValidationDecision["ESCALATED"] = "escalated";
    ValidationDecision["DEFERRED"] = "deferred";
    ValidationDecision["TIMEOUT"] = "timeout";
    ValidationDecision["ERROR"] = "error";
})(ValidationDecision || (exports.ValidationDecision = ValidationDecision = {}));
var ConditionType;
(function (ConditionType) {
    ConditionType["PREREQUISITE"] = "prerequisite";
    ConditionType["MONITORING"] = "monitoring";
    ConditionType["APPROVAL"] = "approval";
    ConditionType["VERIFICATION"] = "verification";
    ConditionType["NOTIFICATION"] = "notification";
    ConditionType["ROLLBACK"] = "rollback";
})(ConditionType || (exports.ConditionType = ConditionType = {}));
var RecommendationType;
(function (RecommendationType) {
    RecommendationType["SECURITY_IMPROVEMENT"] = "security_improvement";
    RecommendationType["PERFORMANCE_OPTIMIZATION"] = "performance_optimization";
    RecommendationType["COST_REDUCTION"] = "cost_reduction";
    RecommendationType["RISK_MITIGATION"] = "risk_mitigation";
    RecommendationType["COMPLIANCE_ENHANCEMENT"] = "compliance_enhancement";
    RecommendationType["PROCESS_IMPROVEMENT"] = "process_improvement";
    RecommendationType["TECHNOLOGY_UPGRADE"] = "technology_upgrade";
})(RecommendationType || (exports.RecommendationType = RecommendationType = {}));
//# sourceMappingURL=parlant-streaming-integration.types.js.map