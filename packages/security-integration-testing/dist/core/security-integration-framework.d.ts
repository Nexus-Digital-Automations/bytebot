/**
 * Core Security Integration Framework
 *
 * Agent 4: Central orchestration framework that coordinates all security testing
 * components including E2E testing, cross-service testing, automation, regression,
 * performance testing, and comprehensive reporting.
 *
 * @author Bytebot Security Team - Agent 4
 * @version 1.0.0
 */
import { SecurityTestResult, SecurityTestReport, SecurityTestConfiguration } from '../types/security-test-types';
/**
 * Main Security Integration Framework
 *
 * Orchestrates comprehensive security testing across all system components:
 * - End-to-end security validation
 * - Cross-service security testing
 * - Automated security test execution
 * - Security regression testing
 * - Performance security testing
 * - Compliance validation
 * - Comprehensive reporting and analytics
 */
export declare class SecurityIntegrationTestFramework {
    private config;
    private e2eFramework;
    private crossServiceTesting;
    private testAutomation;
    private logs;
    private isInitialized;
    private testResults;
    constructor(config: Partial<SecurityTestConfiguration>);
    /**
     * Initialize all security testing components
     */
    private initializeComponents;
    /**
     * Initialize the complete security testing framework
     */
    initialize(): Promise<void>;
    /**
     * Run comprehensive security test suite
     */
    runComprehensiveSecurityTests(): Promise<SecurityTestReport>;
    /**
     * Run specific security test category
     */
    runSecurityTestCategory(category: string): Promise<SecurityTestResult[]>;
    /**
     * Generate E2E test cases
     */
    private generateE2ETestCases;
    /**
     * Run automated test suites
     */
    private runAutomatedTestSuites;
    /**
     * Run security regression tests
     */
    private runSecurityRegressionTests;
    /**
     * Run security performance tests
     */
    private runSecurityPerformanceTests;
    /**
     * Run compliance tests
     */
    private runComplianceTests;
    /**
     * Execute performance security test
     */
    private executePerformanceSecurityTest;
    /**
     * Run compliance framework tests
     */
    private runComplianceFrameworkTests;
    /**
     * Generate compliance tests for framework
     */
    private generateComplianceTests;
    /**
     * Execute compliance test
     */
    private executeComplianceTest;
    /**
     * Get baseline security results
     */
    private getBaselineSecurityResults;
    /**
     * Run current security tests
     */
    private runCurrentSecurityTests;
    /**
     * Compare security results for regressions
     */
    private compareSecurityResults;
    /**
     * Generate comprehensive security report
     */
    generateComprehensiveReport(): Promise<SecurityTestReport>;
    /**
     * Generate suite results for report
     */
    private generateSuiteResults;
    /**
     * Generate test summary
     */
    private generateTestSummary;
    /**
     * Generate compliance result
     */
    private generateComplianceResult;
    /**
     * Generate performance metrics
     */
    private generatePerformanceMetrics;
    /**
     * Generate security recommendations
     */
    private generateSecurityRecommendations;
    /**
     * Get service configurations
     */
    private getServiceConfigurations;
    /**
     * Get authorization tests
     */
    private getAuthorizationTests;
    /**
     * Get data flows
     */
    private getDataFlows;
    /**
     * Get communication tests
     */
    private getCommunicationTests;
    /**
     * Get test suite configurations
     */
    private getTestSuiteConfigurations;
    /**
     * Get schedule configurations
     */
    private getScheduleConfigurations;
    /**
     * Log framework activities
     */
    private log;
    /**
     * Get all test results
     */
    getAllTestResults(): Map<string, SecurityTestResult[]>;
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
}
//# sourceMappingURL=security-integration-framework.d.ts.map