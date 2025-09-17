"use strict";
/**
 * Parlant Integration Types and Interfaces
 *
 * Comprehensive type definitions for Maximum Parlant Integration with AIgent ecosystem.
 * Supports function-level wrapping across ALL 1,520+ functions with enterprise-grade
 * validation, authentication, and performance optimization.
 *
 * @module ParlantIntegrationTypes
 * @version 1.0.0
 * @author AIgent Integration Team
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParlantTimeoutError = exports.ParlantAuthenticationError = exports.ParlantConnectionError = exports.ParlantValidationError = exports.ParlantIntegrationError = exports.ParlantMessageType = exports.SecurityLevel = void 0;
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
/**
 * Error types for Parlant Integration
 */
class ParlantIntegrationError extends Error {
    _code;
    _details;
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
//# sourceMappingURL=parlant-integration.types.js.map