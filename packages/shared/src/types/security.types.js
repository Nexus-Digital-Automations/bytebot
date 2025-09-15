"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityErrorCode = exports.VersioningStrategy = exports.RateLimitPreset = exports.RegisterUserDto = exports.AuthCredentialsDto = exports.Permission = exports.UserRole = exports.DEFAULT_SANITIZATION_OPTIONS = exports.createSecurityEvent = exports.RateLimitServiceType = exports.SecurityEventType = void 0;
var SecurityEventType;
(function (SecurityEventType) {
    SecurityEventType["_AUTHENTICATION_FAILED"] = "authentication_failed";
    SecurityEventType["_LOGIN_SUCCESS"] = "auth.login.success";
    SecurityEventType["_LOGIN_FAILED"] = "auth.login.failed";
    SecurityEventType["_LOGOUT"] = "auth.logout";
    SecurityEventType["_TOKEN_REFRESH"] = "auth.token.refresh";
    SecurityEventType["_ACCESS_GRANTED"] = "authz.access.granted";
    SecurityEventType["_ACCESS_DENIED"] = "access_denied";
    SecurityEventType["_PERMISSION_ESCALATION_ATTEMPT"] = "authz.escalation.attempt";
    SecurityEventType["_SUSPICIOUS_ACTIVITY"] = "suspicious_activity";
    SecurityEventType["_SECURITY_CONFIG_CHANGED"] = "security_config_changed";
    SecurityEventType["_DATA_ACCESS_VIOLATION"] = "data_access_violation";
    SecurityEventType["_CSP_VIOLATION"] = "csp_violation";
    SecurityEventType["_ADMIN_ACTION"] = "security.admin.action";
    SecurityEventType["_MALFORMED_REQUEST"] = "malformed_request";
    SecurityEventType["_CORS_VIOLATION"] = "cors_violation";
    SecurityEventType["_VALIDATION_FAILED"] = "validation_failed";
    SecurityEventType["_XSS_ATTEMPT_BLOCKED"] = "xss_attempt_blocked";
    SecurityEventType["_INJECTION_ATTEMPT_BLOCKED"] = "injection_attempt_blocked";
    SecurityEventType["_RATE_LIMIT_EXCEEDED"] = "rate_limit.exceeded";
})(SecurityEventType || (exports.SecurityEventType = SecurityEventType = {}));
var RateLimitServiceType;
(function (RateLimitServiceType) {
    RateLimitServiceType["_BYTEBOTD"] = "bytebotd";
    RateLimitServiceType["_BYTEBOT_AGENT"] = "bytebot-agent";
    RateLimitServiceType["_BYTEBOT_UI"] = "bytebot-ui";
    RateLimitServiceType["_SHARED"] = "shared";
})(RateLimitServiceType || (exports.RateLimitServiceType = RateLimitServiceType = {}));
function createSecurityEvent(type, endpoint, method, success = false, message, metadata, userId, ipAddress, userAgent) {
    const event = {
        eventId: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        timestamp: new Date(),
        riskScore: calculateRiskScore(type, success),
        endpoint,
        method,
        resource: endpoint,
    };
    if (userId !== undefined)
        event.userId = userId;
    if (ipAddress !== undefined)
        event.ipAddress = ipAddress;
    if (userAgent !== undefined)
        event.userAgent = userAgent;
    if (success !== undefined)
        event.success = success;
    if (message !== undefined)
        event.message = message;
    if (metadata !== undefined)
        event.metadata = metadata;
    return event;
}
exports.createSecurityEvent = createSecurityEvent;
function calculateRiskScore(type, success) {
    const baseScores = {
        [SecurityEventType._AUTHENTICATION_FAILED]: 60,
        [SecurityEventType._LOGIN_SUCCESS]: 10,
        [SecurityEventType._LOGIN_FAILED]: 50,
        [SecurityEventType._LOGOUT]: 5,
        [SecurityEventType._TOKEN_REFRESH]: 15,
        [SecurityEventType._ACCESS_GRANTED]: 10,
        [SecurityEventType._ACCESS_DENIED]: 40,
        [SecurityEventType._PERMISSION_ESCALATION_ATTEMPT]: 85,
        [SecurityEventType._SUSPICIOUS_ACTIVITY]: 80,
        [SecurityEventType._SECURITY_CONFIG_CHANGED]: 30,
        [SecurityEventType._DATA_ACCESS_VIOLATION]: 90,
        [SecurityEventType._CSP_VIOLATION]: 45,
        [SecurityEventType._ADMIN_ACTION]: 25,
        [SecurityEventType._VALIDATION_FAILED]: 35,
        [SecurityEventType._XSS_ATTEMPT_BLOCKED]: 75,
        [SecurityEventType._INJECTION_ATTEMPT_BLOCKED]: 85,
        [SecurityEventType._RATE_LIMIT_EXCEEDED]: 30,
        [SecurityEventType._MALFORMED_REQUEST]: 35,
        [SecurityEventType._CORS_VIOLATION]: 45,
    };
    const baseScore = baseScores[type];
    let score = baseScore;
    if (!success) {
        score += 20;
    }
    return Math.min(100, score);
}
exports.DEFAULT_SANITIZATION_OPTIONS = {
    stripHtml: true,
    normalizeWhitespace: true,
    maxLength: 10000,
    allowedCharsets: ["utf8"],
    removeControlChars: true,
    escapeSpecialChars: true,
};
var UserRole;
(function (UserRole) {
    UserRole["_ADMIN"] = "admin";
    UserRole["_OPERATOR"] = "operator";
    UserRole["_VIEWER"] = "viewer";
    UserRole["_USER"] = "user";
    UserRole["_GUEST"] = "guest";
})(UserRole || (exports.UserRole = UserRole = {}));
var Permission;
(function (Permission) {
    Permission["_TASK_READ"] = "task:read";
    Permission["_TASK_WRITE"] = "task:write";
    Permission["_TASK_DELETE"] = "task:delete";
    Permission["_COMPUTER_CONTROL"] = "computer:control";
    Permission["_COMPUTER_VIEW"] = "computer:view";
    Permission["_SYSTEM_ADMIN"] = "system:admin";
    Permission["_USER_MANAGE"] = "user:manage";
    Permission["_METRICS_VIEW"] = "metrics:view";
    Permission["_LOGS_VIEW"] = "logs:view";
    Permission["_EXECUTE"] = "execute";
    Permission["_ADMIN"] = "admin";
    Permission["_CONFIGURE"] = "configure";
    Permission["_MONITOR"] = "monitor";
    Permission["_USER_MANAGEMENT"] = "user:management";
    Permission["_TASK_MANAGEMENT"] = "task:management";
    Permission["_SYSTEM_MANAGEMENT"] = "system:management";
    Permission["_AUDIT_ACCESS"] = "audit:access";
    Permission["_SECURITY_MANAGEMENT"] = "security:management";
    Permission["_API_ACCESS"] = "api:access";
    Permission["_API_WRITE"] = "api:write";
    Permission["_API_ADMIN"] = "api:admin";
    Permission["_COMPUTER_USE"] = "computer:use";
    Permission["_COMPUTER_ADMIN"] = "computer:admin";
    Permission["_SCREEN_CAPTURE"] = "screen:capture";
    Permission["_FILE_ACCESS"] = "file:access";
    Permission["_CREATE_USER"] = "create:user";
    Permission["_DELETE_USER"] = "delete:user";
    Permission["_VIEW_ADMIN_PANEL"] = "view:admin_panel";
    Permission["_CREATE_TASK"] = "create:task";
    Permission["_VIEW_OWN_PROFILE"] = "view:own_profile";
    Permission["_VIEW_PUBLIC_CONTENT"] = "view:public_content";
})(Permission || (exports.Permission = Permission = {}));
class AuthCredentialsDto {
    email;
    password;
}
exports.AuthCredentialsDto = AuthCredentialsDto;
class RegisterUserDto extends AuthCredentialsDto {
    firstName;
    lastName;
    role;
}
exports.RegisterUserDto = RegisterUserDto;
var RateLimitPreset;
(function (RateLimitPreset) {
    RateLimitPreset["_AUTH"] = "auth";
    RateLimitPreset["_COMPUTER_USE"] = "computer-use";
    RateLimitPreset["_TASK_OPERATIONS"] = "task-operations";
    RateLimitPreset["_READ_OPERATIONS"] = "read-operations";
    RateLimitPreset["_WEBSOCKET"] = "websocket";
})(RateLimitPreset || (exports.RateLimitPreset = RateLimitPreset = {}));
var VersioningStrategy;
(function (VersioningStrategy) {
    VersioningStrategy["_URI"] = "uri";
    VersioningStrategy["_HEADER"] = "header";
    VersioningStrategy["_QUERY"] = "query";
    VersioningStrategy["_MEDIA_TYPE"] = "media-type";
})(VersioningStrategy || (exports.VersioningStrategy = VersioningStrategy = {}));
var SecurityErrorCode;
(function (SecurityErrorCode) {
    SecurityErrorCode["_INVALID_CREDENTIALS"] = "AUTH_INVALID_CREDENTIALS";
    SecurityErrorCode["_TOKEN_EXPIRED"] = "AUTH_TOKEN_EXPIRED";
    SecurityErrorCode["_TOKEN_INVALID"] = "AUTH_TOKEN_INVALID";
    SecurityErrorCode["_TOKEN_MALFORMED"] = "AUTH_TOKEN_MALFORMED";
    SecurityErrorCode["_INSUFFICIENT_PERMISSIONS"] = "AUTHZ_INSUFFICIENT_PERMISSIONS";
    SecurityErrorCode["_ROLE_REQUIRED"] = "AUTHZ_ROLE_REQUIRED";
    SecurityErrorCode["_ACCESS_DENIED"] = "AUTHZ_ACCESS_DENIED";
    SecurityErrorCode["_VALIDATION_FAILED"] = "VALIDATION_FAILED";
    SecurityErrorCode["_XSS_DETECTED"] = "VALIDATION_XSS_DETECTED";
    SecurityErrorCode["_INJECTION_DETECTED"] = "VALIDATION_INJECTION_DETECTED";
    SecurityErrorCode["_REQUEST_TOO_LARGE"] = "VALIDATION_REQUEST_TOO_LARGE";
    SecurityErrorCode["_RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    SecurityErrorCode["_TOO_MANY_REQUESTS"] = "RATE_LIMIT_TOO_MANY_REQUESTS";
    SecurityErrorCode["_SECURITY_CONFIG_ERROR"] = "SECURITY_CONFIG_ERROR";
    SecurityErrorCode["_INTERNAL_SECURITY_ERROR"] = "SECURITY_INTERNAL_ERROR";
})(SecurityErrorCode || (exports.SecurityErrorCode = SecurityErrorCode = {}));
exports.default = {
    UserRole,
    Permission,
    SecurityEventType,
    RateLimitPreset,
    VersioningStrategy,
    SecurityErrorCode,
};
//# sourceMappingURL=security.types.js.map