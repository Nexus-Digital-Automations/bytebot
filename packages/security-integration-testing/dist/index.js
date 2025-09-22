"use strict";
/**
 * Comprehensive Security Integration Testing Framework
 *
 * Main entry point for the security integration testing framework that provides
 * end-to-end security validation, cross-service security testing, regression testing,
 * and comprehensive security test automation for PARLANT Bytebot middleware.
 *
 * @author Bytebot Security Team
 * @version 1.0.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityTestingFramework = exports.SecurityComplianceConfig = exports.SecurityEnvironmentConfig = exports.SecurityTestConfig = exports.SecurityValidationEngine = exports.SecurityTestOrchestrator = exports.SecurityIntegrationTestFramework = void 0;
__exportStar(require("./e2e/security-e2e-framework"), exports);
__exportStar(require("./integration/cross-service-security"), exports);
__exportStar(require("./automation/security-test-automation"), exports);
__exportStar(require("./regression/security-regression-suite"), exports);
__exportStar(require("./performance/security-performance-testing"), exports);
__exportStar(require("./data-management/security-test-data-manager"), exports);
__exportStar(require("./environment/security-test-environment"), exports);
__exportStar(require("./reporting/security-analytics-dashboard"), exports);
__exportStar(require("./compliance/security-compliance-validator"), exports);
__exportStar(require("./monitoring/security-monitoring-integration"), exports);
__exportStar(require("./types/security-test-types"), exports);
__exportStar(require("./config/security-test-config"), exports);
__exportStar(require("./utils/security-test-utils"), exports);
// Core framework classes
var security_integration_framework_1 = require("./core/security-integration-framework");
Object.defineProperty(exports, "SecurityIntegrationTestFramework", { enumerable: true, get: function () { return security_integration_framework_1.SecurityIntegrationTestFramework; } });
var security_test_orchestrator_1 = require("./core/security-test-orchestrator");
Object.defineProperty(exports, "SecurityTestOrchestrator", { enumerable: true, get: function () { return security_test_orchestrator_1.SecurityTestOrchestrator; } });
var security_validation_engine_1 = require("./core/security-validation-engine");
Object.defineProperty(exports, "SecurityValidationEngine", { enumerable: true, get: function () { return security_validation_engine_1.SecurityValidationEngine; } });
// Configuration types
var security_test_config_1 = require("./config/security-test-config");
Object.defineProperty(exports, "SecurityTestConfig", { enumerable: true, get: function () { return security_test_config_1.SecurityTestConfig; } });
Object.defineProperty(exports, "SecurityEnvironmentConfig", { enumerable: true, get: function () { return security_test_config_1.SecurityEnvironmentConfig; } });
Object.defineProperty(exports, "SecurityComplianceConfig", { enumerable: true, get: function () { return security_test_config_1.SecurityComplianceConfig; } });
/**
 * Main Security Integration Testing Framework
 *
 * Provides comprehensive security testing capabilities including:
 * - End-to-end security validation
 * - Cross-service security testing
 * - Security regression testing
 * - Performance security testing
 * - Compliance validation
 * - Real-time monitoring integration
 */
class SecurityTestingFramework {
    constructor(config) {
        this.framework = new SecurityIntegrationTestFramework(config);
        this.orchestrator = new SecurityTestOrchestrator(config);
        this.validator = new SecurityValidationEngine(config);
    }
    /**
     * Initialize the security testing framework
     */
    async initialize() {
        await this.framework.initialize();
        await this.orchestrator.initialize();
        await this.validator.initialize();
    }
    /**
     * Run comprehensive security test suite
     */
    async runFullSecurityTestSuite() {
        return this.orchestrator.runFullTestSuite();
    }
    /**
     * Run specific security test category
     */
    async runSecurityTestCategory(category) {
        return this.orchestrator.runTestCategory(category);
    }
    /**
     * Validate security compliance
     */
    async validateSecurityCompliance() {
        return this.validator.validateCompliance();
    }
    /**
     * Generate comprehensive security report
     */
    async generateSecurityReport() {
        return this.framework.generateComprehensiveReport();
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        await this.framework.cleanup();
        await this.orchestrator.cleanup();
        await this.validator.cleanup();
    }
}
exports.SecurityTestingFramework = SecurityTestingFramework;
// Default export
exports.default = SecurityTestingFramework;
//# sourceMappingURL=index.js.map