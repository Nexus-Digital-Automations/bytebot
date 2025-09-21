"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalLevel = exports.ValidationMode = exports.RiskLevel = exports.SecuritySeverity = exports.SecurityConsiderationType = exports.FunctionSecurityLevel = exports.ParlantTimeoutError = exports.ParlantAuthenticationError = exports.ParlantConnectionError = exports.ParlantValidationError = exports.ParlantIntegrationError = exports.ParlantMessageType = exports.SecurityLevel = void 0;
var SecurityLevel;
(function (SecurityLevel) {
    SecurityLevel["_MINIMAL"] = "minimal";
    SecurityLevel["_LOW"] = "low";
    SecurityLevel["_MEDIUM"] = "medium";
    SecurityLevel["_HIGH"] = "high";
    SecurityLevel["_CRITICAL"] = "critical";
})(SecurityLevel || (exports.SecurityLevel = SecurityLevel = {}));
var ParlantMessageType;
(function (ParlantMessageType) {
    ParlantMessageType["_VALIDATION_REQUEST"] = "validation_request";
    ParlantMessageType["_VALIDATION_RESPONSE"] = "validation_response";
    ParlantMessageType["_STATUS_UPDATE"] = "status_update";
    ParlantMessageType["_ERROR"] = "error";
    ParlantMessageType["_HEARTBEAT"] = "heartbeat";
    ParlantMessageType["_AUTH_CHALLENGE"] = "auth_challenge";
    ParlantMessageType["_AUTH_RESPONSE"] = "auth_response";
})(ParlantMessageType || (exports.ParlantMessageType = ParlantMessageType = {}));
class ParlantIntegrationError extends Error {
    constructor(message, _code, _details) {
        super(message);
        this._code = _code;
        this._details = _details;
        this.name = "ParlantIntegrationError";
    }
}
exports.ParlantIntegrationError = ParlantIntegrationError;
class ParlantValidationError extends ParlantIntegrationError {
    constructor(message, details) {
        super(message, "VALIDATION_ERROR", details);
        this.name = "ParlantValidationError";
    }
}
exports.ParlantValidationError = ParlantValidationError;
class ParlantConnectionError extends ParlantIntegrationError {
    constructor(message, details) {
        super(message, "CONNECTION_ERROR", details);
        this.name = "ParlantConnectionError";
    }
}
exports.ParlantConnectionError = ParlantConnectionError;
class ParlantAuthenticationError extends ParlantIntegrationError {
    constructor(message, details) {
        super(message, "AUTHENTICATION_ERROR", details);
        this.name = "ParlantAuthenticationError";
    }
}
exports.ParlantAuthenticationError = ParlantAuthenticationError;
class ParlantTimeoutError extends ParlantIntegrationError {
    constructor(message, details) {
        super(message, "TIMEOUT_ERROR", details);
        this.name = "ParlantTimeoutError";
    }
}
exports.ParlantTimeoutError = ParlantTimeoutError;
var FunctionSecurityLevel;
(function (FunctionSecurityLevel) {
    FunctionSecurityLevel["_PUBLIC"] = "public";
    FunctionSecurityLevel["_INTERNAL"] = "internal";
    FunctionSecurityLevel["_RESTRICTED"] = "restricted";
    FunctionSecurityLevel["_CONFIDENTIAL"] = "confidential";
    FunctionSecurityLevel["_SECRET"] = "secret";
})(FunctionSecurityLevel || (exports.FunctionSecurityLevel = FunctionSecurityLevel = {}));
var SecurityConsiderationType;
(function (SecurityConsiderationType) {
    SecurityConsiderationType["_AUTHENTICATION_BYPASS"] = "authentication_bypass";
    SecurityConsiderationType["_PRIVILEGE_ESCALATION"] = "privilege_escalation";
    SecurityConsiderationType["_DATA_EXPOSURE"] = "data_exposure";
    SecurityConsiderationType["_INJECTION_VULNERABILITY"] = "injection_vulnerability";
    SecurityConsiderationType["_DENIAL_OF_SERVICE"] = "denial_of_service";
    SecurityConsiderationType["_CROSS_SITE_SCRIPTING"] = "cross_site_scripting";
    SecurityConsiderationType["_SENSITIVE_DATA_ACCESS"] = "sensitive_data_access";
})(SecurityConsiderationType || (exports.SecurityConsiderationType = SecurityConsiderationType = {}));
var SecuritySeverity;
(function (SecuritySeverity) {
    SecuritySeverity["_LOW"] = "low";
    SecuritySeverity["_MEDIUM"] = "medium";
    SecuritySeverity["_HIGH"] = "high";
    SecuritySeverity["_CRITICAL"] = "critical";
})(SecuritySeverity || (exports.SecuritySeverity = SecuritySeverity = {}));
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["_LOW"] = "low";
    RiskLevel["_MEDIUM"] = "medium";
    RiskLevel["_HIGH"] = "high";
    RiskLevel["_CRITICAL"] = "critical";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
var ValidationMode;
(function (ValidationMode) {
    ValidationMode["_STRICT"] = "strict";
    ValidationMode["_PERMISSIVE"] = "permissive";
    ValidationMode["_ADVISORY"] = "advisory";
})(ValidationMode || (exports.ValidationMode = ValidationMode = {}));
var ApprovalLevel;
(function (ApprovalLevel) {
    ApprovalLevel["_AUTOMATIC"] = "automatic";
    ApprovalLevel["_MANUAL"] = "manual";
    ApprovalLevel["_ESCALATED"] = "escalated";
})(ApprovalLevel || (exports.ApprovalLevel = ApprovalLevel = {}));
//# sourceMappingURL=parlant-integration.types.js.map