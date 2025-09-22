"use strict";
/**
 * Security Test Types and Interfaces
 *
 * Comprehensive type definitions for the security integration testing framework
 * including test suites, cases, results, and validation structures.
 *
 * @author Bytebot Security Team
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityTestStatus = exports.SecurityTestCategory = exports.SecurityTestSeverity = void 0;
/**
 * Security test severity levels
 */
var SecurityTestSeverity;
(function (SecurityTestSeverity) {
    SecurityTestSeverity["CRITICAL"] = "critical";
    SecurityTestSeverity["HIGH"] = "high";
    SecurityTestSeverity["MEDIUM"] = "medium";
    SecurityTestSeverity["LOW"] = "low";
    SecurityTestSeverity["INFO"] = "info";
})(SecurityTestSeverity || (exports.SecurityTestSeverity = SecurityTestSeverity = {}));
/**
 * Security test categories
 */
var SecurityTestCategory;
(function (SecurityTestCategory) {
    SecurityTestCategory["AUTHENTICATION"] = "authentication";
    SecurityTestCategory["AUTHORIZATION"] = "authorization";
    SecurityTestCategory["INPUT_VALIDATION"] = "input_validation";
    SecurityTestCategory["ENCRYPTION"] = "encryption";
    SecurityTestCategory["SESSION_MANAGEMENT"] = "session_management";
    SecurityTestCategory["ERROR_HANDLING"] = "error_handling";
    SecurityTestCategory["LOGGING_MONITORING"] = "logging_monitoring";
    SecurityTestCategory["NETWORK_SECURITY"] = "network_security";
    SecurityTestCategory["API_SECURITY"] = "api_security";
    SecurityTestCategory["DATA_PROTECTION"] = "data_protection";
    SecurityTestCategory["COMPLIANCE"] = "compliance";
    SecurityTestCategory["INFRASTRUCTURE"] = "infrastructure";
})(SecurityTestCategory || (exports.SecurityTestCategory = SecurityTestCategory = {}));
/**
 * Security test status
 */
var SecurityTestStatus;
(function (SecurityTestStatus) {
    SecurityTestStatus["PENDING"] = "pending";
    SecurityTestStatus["RUNNING"] = "running";
    SecurityTestStatus["PASSED"] = "passed";
    SecurityTestStatus["FAILED"] = "failed";
    SecurityTestStatus["SKIPPED"] = "skipped";
    SecurityTestStatus["ERROR"] = "error";
})(SecurityTestStatus || (exports.SecurityTestStatus = SecurityTestStatus = {}));
//# sourceMappingURL=security-test-types.js.map