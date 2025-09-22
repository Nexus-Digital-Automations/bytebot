/**
 * Security Test Automation Framework
 *
 * Agent 3: Comprehensive security test automation with automated execution,
 * test case management, test environment automation, and continuous security testing.
 *
 * @author Bytebot Security Team - Agent 3
 * @version 1.0.0
 */
import { SecurityTestCase, SecurityTestResult, SecurityTestSuite, SecurityTestExecutionOptions } from '../types/security-test-types';
/**
 * Security Test Automation Framework
 *
 * Provides comprehensive security test automation including:
 * - Automated test execution and scheduling
 * - Test case management and organization
 * - Test environment automation
 * - Continuous security testing integration
 * - Test result management and reporting
 */
export declare class SecurityTestAutomation {
    private config;
    private testSuites;
    private testResults;
    private scheduledTests;
    private logs;
    private isRunning;
    constructor(config: SecurityAutomationConfig);
    /**
     * Initialize test suites from configuration
     */
    private initializeTestSuites;
    /**
     * Start automated security testing
     */
    startAutomatedTesting(): Promise<void>;
    /**
     * Stop automated security testing
     */
    stopAutomatedTesting(): Promise<void>;
    /**
     * Execute security test suite
     */
    executeTestSuite(suiteId: string, options?: SecurityTestExecutionOptions): Promise<SecurityTestResult[]>;
    /**
     * Execute test cases with specified options
     */
    private executeTestCases;
    /**
     * Execute individual test case
     */
    private executeTestCase;
    /**
     * Perform actual test execution
     */
    private performTestExecution;
    /**
     * Execute test step
     */
    private executeTestStep;
    /**
     * Execute HTTP request step
     */
    private executeHttpRequest;
    /**
     * Execute database query step
     */
    private executeDatabaseQuery;
    /**
     * Execute file operation step
     */
    private executeFileOperation;
    /**
     * Execute security scan step
     */
    private executeSecurityScan;
    /**
     * Execute custom validation step
     */
    private executeCustomValidation;
    /**
     * Validate step outcomes
     */
    private validateStepOutcomes;
    /**
     * Schedule recurring tests
     */
    private scheduleRecurringTests;
    /**
     * Start continuous monitoring
     */
    private startContinuousMonitoring;
    /**
     * Perform continuous monitoring checks
     */
    private performContinuousMonitoring;
    /**
     * Monitor security events
     */
    private monitorSecurityEvents;
    /**
     * Check system health
     */
    private checkSystemHealth;
    /**
     * Validate security configurations
     */
    private validateSecurityConfigurations;
    /**
     * Generate monitoring report
     */
    private generateMonitoringReport;
    /**
     * Execute setup scripts
     */
    private executeSetupScripts;
    /**
     * Execute teardown scripts
     */
    private executeTeardownScripts;
    /**
     * Execute precondition
     */
    private executePrecondition;
    /**
     * Capture test evidence
     */
    private captureTestEvidence;
    /**
     * Validate test compliance
     */
    private validateTestCompliance;
    /**
     * Calculate test metrics
     */
    private calculateTestMetrics;
    /**
     * Generate test report
     */
    private generateTestReport;
    /**
     * Parse schedule interval
     */
    private parseScheduleInterval;
    /**
     * Wait for available slot in semaphore
     */
    private waitForSlot;
    /**
     * Release slot in semaphore
     */
    private releaseSlot;
    /**
     * Extract value from object by path
     */
    private extractValueByPath;
    /**
     * Create error result for failed tests
     */
    private createErrorResult;
    /**
     * Log automation activities
     */
    private log;
    /**
     * Get test results
     */
    getTestResults(suiteId?: string): Map<string, SecurityTestResult[]>;
    /**
     * Get test suite
     */
    getTestSuite(suiteId: string): SecurityTestSuite | undefined;
    /**
     * Get all test suites
     */
    getAllTestSuites(): SecurityTestSuite[];
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
}
/**
 * Security Automation Configuration
 */
export interface SecurityAutomationConfig {
    testSuites: TestSuiteConfig[];
    schedules?: ScheduleConfig[];
    continuousMonitoring?: {
        enabled: boolean;
        interval: string;
        healthChecks: string[];
        alertThresholds: Record<string, number>;
    };
    reporting?: {
        enabled: boolean;
        formats: ('json' | 'html' | 'pdf')[];
        destinations: string[];
    };
    notifications?: {
        enabled: boolean;
        channels: ('email' | 'slack' | 'webhook')[];
        triggers: ('failure' | 'completion' | 'critical_vulnerability')[];
    };
}
export interface TestSuiteConfig {
    id: string;
    name: string;
    description: string;
    category: any;
    testCases: SecurityTestCase[];
    setupScripts?: string[];
    teardownScripts?: string[];
    environment: string;
    configuration?: Record<string, any>;
    metadata?: Record<string, any>;
}
export interface ScheduleConfig {
    testSuiteId: string;
    interval: string;
    enabled: boolean;
    options?: SecurityTestExecutionOptions;
}
//# sourceMappingURL=security-test-automation.d.ts.map