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
export * from './e2e/security-e2e-framework';
export * from './integration/cross-service-security';
export * from './automation/security-test-automation';
export * from './regression/security-regression-suite';
export * from './performance/security-performance-testing';
export * from './data-management/security-test-data-manager';
export * from './environment/security-test-environment';
export * from './reporting/security-analytics-dashboard';
export * from './compliance/security-compliance-validator';
export * from './monitoring/security-monitoring-integration';
export * from './types/security-test-types';
export * from './config/security-test-config';
export * from './utils/security-test-utils';
export { SecurityIntegrationTestFramework } from './core/security-integration-framework';
export { SecurityTestOrchestrator } from './core/security-test-orchestrator';
export { SecurityValidationEngine } from './core/security-validation-engine';
export { SecurityTestSuite, SecurityTestCase, SecurityTestResult, SecurityTestReport, SecurityValidationResult } from './types/security-test-types';
export { SecurityTestConfig, SecurityEnvironmentConfig, SecurityComplianceConfig } from './config/security-test-config';
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
export declare class SecurityTestingFramework {
    private framework;
    private orchestrator;
    private validator;
    constructor(config?: Partial<SecurityTestConfig>);
    /**
     * Initialize the security testing framework
     */
    initialize(): Promise<void>;
    /**
     * Run comprehensive security test suite
     */
    runFullSecurityTestSuite(): Promise<SecurityTestReport>;
    /**
     * Run specific security test category
     */
    runSecurityTestCategory(category: string): Promise<SecurityTestReport>;
    /**
     * Validate security compliance
     */
    validateSecurityCompliance(): Promise<SecurityValidationResult>;
    /**
     * Generate comprehensive security report
     */
    generateSecurityReport(): Promise<SecurityTestReport>;
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
}
export default SecurityTestingFramework;
//# sourceMappingURL=index.d.ts.map