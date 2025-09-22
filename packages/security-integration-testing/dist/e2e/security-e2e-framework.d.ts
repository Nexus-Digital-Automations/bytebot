/**
 * End-to-End Security Validation Framework
 *
 * Agent 1: Comprehensive E2E security testing with user journey validation,
 * security boundary testing, and cross-component security integration.
 *
 * @author Bytebot Security Team - Agent 1
 * @version 1.0.0
 */
import { SecurityTestCase, SecurityTestResult } from '../types/security-test-types';
/**
 * End-to-End Security Testing Framework
 *
 * Provides comprehensive end-to-end security validation including:
 * - Complete user journey security testing
 * - Multi-service security flow validation
 * - Security boundary testing and validation
 * - Cross-component security integration
 * - Security workflow regression testing
 */
export declare class SecurityE2EFramework {
    private config;
    private browser;
    private page;
    private logs;
    private evidence;
    private vulnerabilities;
    constructor(config: SecurityE2EConfig);
    /**
     * Initialize the E2E security testing framework
     */
    initialize(): Promise<void>;
    /**
     * Run comprehensive end-to-end security test suite
     */
    runE2ESecurityTestSuite(testCases: SecurityTestCase[]): Promise<SecurityTestResult[]>;
    /**
     * Execute individual end-to-end security test
     */
    private executeE2ESecurityTest;
    /**
     * Execute security test step with comprehensive validation
     */
    private executeSecurityTestStep;
    /**
     * Perform secure authentication testing
     */
    private performSecureAuthentication;
    /**
     * Test authorization security
     */
    private testAuthorization;
    /**
     * Validate input security
     */
    private validateInputSecurity;
    /**
     * Test session security
     */
    private testSessionSecurity;
    /**
     * Validate encryption implementation
     */
    private validateEncryption;
    /**
     * Test secure error handling
     */
    private testSecureErrorHandling;
    /**
     * Setup comprehensive security monitoring
     */
    private setupSecurityMonitoring;
    /**
     * Validate security boundaries
     */
    private validateSecurityBoundaries;
    /**
     * Capture comprehensive security evidence
     */
    private captureSecurityEvidence;
    /**
     * Execute test preconditions
     */
    private executePreconditions;
    /**
     * Validate security outcomes
     */
    private validateSecurityOutcomes;
    /**
     * Check authentication security
     */
    private checkAuthenticationSecurity;
    /**
     * Calculate security score based on test results
     */
    private calculateSecurityScore;
    /**
     * Check if user is authenticated
     */
    private isAuthenticated;
    /**
     * Extract value from object by path
     */
    private extractValueByPath;
    /**
     * Add security vulnerability
     */
    private addVulnerability;
    /**
     * Create error result for failed tests
     */
    private createErrorResult;
    /**
     * Log security testing activities
     */
    private log;
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
}
/**
 * E2E Security Configuration
 */
export interface SecurityE2EConfig {
    baseUrl: string;
    headless: boolean;
    timeout: number;
    retries: number;
    evidence: {
        screenshots: boolean;
        networkLogs: boolean;
        consoleLogs: boolean;
    };
    security: {
        validateHeaders: boolean;
        checkCookies: boolean;
        testCSP: boolean;
        validateInputs: boolean;
    };
}
//# sourceMappingURL=security-e2e-framework.d.ts.map