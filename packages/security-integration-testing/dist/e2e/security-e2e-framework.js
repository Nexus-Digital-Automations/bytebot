"use strict";
/**
 * End-to-End Security Validation Framework
 *
 * Agent 1: Comprehensive E2E security testing with user journey validation,
 * security boundary testing, and cross-component security integration.
 *
 * @author Bytebot Security Team - Agent 1
 * @version 1.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityE2EFramework = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const security_test_types_1 = require("../types/security-test-types");
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
class SecurityE2EFramework {
    constructor(config) {
        this.config = config;
        this.browser = null;
        this.page = null;
        this.logs = [];
        this.evidence = [];
        this.vulnerabilities = [];
    }
    /**
     * Initialize the E2E security testing framework
     */
    async initialize() {
        console.log('🚀 Initializing E2E Security Testing Framework');
        this.browser = await puppeteer_1.default.launch({
            headless: this.config.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--allow-running-insecure-content'
            ]
        });
        this.page = await this.browser.newPage();
        // Set up security monitoring
        await this.setupSecurityMonitoring();
        this.log('info', 'E2E Security Framework initialized successfully');
    }
    /**
     * Run comprehensive end-to-end security test suite
     */
    async runE2ESecurityTestSuite(testCases) {
        const results = [];
        this.log('info', `Starting E2E security test suite with ${testCases.length} test cases`);
        for (const testCase of testCases) {
            try {
                const result = await this.executeE2ESecurityTest(testCase);
                results.push(result);
                if (result.status === security_test_types_1.SecurityTestStatus.FAILED) {
                    this.log('error', `E2E test failed: ${testCase.name}`, { vulnerabilities: result.vulnerabilities });
                }
            }
            catch (error) {
                this.log('error', `E2E test execution error: ${testCase.name}`, error);
                results.push(this.createErrorResult(testCase, error));
            }
        }
        this.log('info', `E2E security test suite completed. Results: ${results.length}`);
        return results;
    }
    /**
     * Execute individual end-to-end security test
     */
    async executeE2ESecurityTest(testCase) {
        const startTime = new Date();
        this.log('info', `Executing E2E security test: ${testCase.name}`);
        const result = {
            testCaseId: testCase.id,
            status: security_test_types_1.SecurityTestStatus.RUNNING,
            startTime,
            endTime: new Date(),
            duration: 0,
            passed: false,
            vulnerabilities: [],
            stepResults: [],
            logs: [],
            metrics: {
                executionTime: 0,
                memoryUsage: 0,
                networkCalls: 0,
                databaseQueries: 0,
                vulnerabilitiesFound: 0,
                securityScore: 0,
                complianceScore: 0
            },
            evidence: []
        };
        try {
            // Execute pre-conditions
            await this.executePreconditions(testCase.preconditions);
            // Execute test steps
            for (const step of testCase.steps) {
                const stepResult = await this.executeSecurityTestStep(step);
                result.stepResults.push(stepResult);
                if (stepResult.status === security_test_types_1.SecurityTestStatus.FAILED) {
                    result.status = security_test_types_1.SecurityTestStatus.FAILED;
                    break;
                }
            }
            // Validate security boundaries
            await this.validateSecurityBoundaries(testCase);
            // Capture evidence
            await this.captureSecurityEvidence(testCase);
            // Calculate security score
            result.metrics.securityScore = this.calculateSecurityScore(result);
            if (result.status !== security_test_types_1.SecurityTestStatus.FAILED) {
                result.status = security_test_types_1.SecurityTestStatus.PASSED;
                result.passed = true;
            }
        }
        catch (error) {
            result.status = security_test_types_1.SecurityTestStatus.ERROR;
            result.error = error;
            this.log('error', `E2E test execution failed: ${testCase.name}`, error);
        }
        const endTime = new Date();
        result.endTime = endTime;
        result.duration = endTime.getTime() - startTime.getTime();
        result.metrics.executionTime = result.duration;
        result.logs = [...this.logs];
        result.evidence = [...this.evidence];
        result.vulnerabilities = [...this.vulnerabilities];
        return result;
    }
    /**
     * Execute security test step with comprehensive validation
     */
    async executeSecurityTestStep(step) {
        const startTime = new Date();
        this.log('info', `Executing security step: ${step.action}`);
        try {
            let actualOutcome;
            switch (step.action) {
                case 'navigate':
                    await this.page?.goto(step.parameters.url, { waitUntil: 'networkidle0' });
                    actualOutcome = { url: this.page?.url() };
                    break;
                case 'authenticate':
                    actualOutcome = await this.performSecureAuthentication(step.parameters);
                    break;
                case 'test_authorization':
                    actualOutcome = await this.testAuthorization(step.parameters);
                    break;
                case 'validate_input_security':
                    actualOutcome = await this.validateInputSecurity(step.parameters);
                    break;
                case 'test_session_security':
                    actualOutcome = await this.testSessionSecurity(step.parameters);
                    break;
                case 'validate_encryption':
                    actualOutcome = await this.validateEncryption(step.parameters);
                    break;
                case 'test_error_handling':
                    actualOutcome = await this.testSecureErrorHandling(step.parameters);
                    break;
                default:
                    throw new Error(`Unknown security test action: ${step.action}`);
            }
            // Validate security outcomes
            const validationResults = await this.validateSecurityOutcomes(step.validations, actualOutcome);
            const endTime = new Date();
            return {
                stepId: step.id,
                status: validationResults.every(v => v.passed) ? security_test_types_1.SecurityTestStatus.PASSED : security_test_types_1.SecurityTestStatus.FAILED,
                startTime,
                endTime,
                duration: endTime.getTime() - startTime.getTime(),
                validationResults,
                actualOutcome
            };
        }
        catch (error) {
            const endTime = new Date();
            this.log('error', `Security step execution failed: ${step.action}`, error);
            return {
                stepId: step.id,
                status: security_test_types_1.SecurityTestStatus.ERROR,
                startTime,
                endTime,
                duration: endTime.getTime() - startTime.getTime(),
                validationResults: [],
                actualOutcome: null,
                error: error
            };
        }
    }
    /**
     * Perform secure authentication testing
     */
    async performSecureAuthentication(params) {
        this.log('info', 'Testing secure authentication');
        // Test authentication security
        await this.page?.type('#username', params.username);
        await this.page?.type('#password', params.password);
        // Capture network traffic for analysis
        const response = await Promise.all([
            this.page?.waitForNavigation({ waitUntil: 'networkidle0' }),
            this.page?.click('#login-button')
        ]);
        // Validate secure authentication
        const cookies = await this.page?.cookies();
        const securityHeaders = response[0]?.headers() || {};
        // Check for security vulnerabilities
        this.checkAuthenticationSecurity(cookies, securityHeaders);
        return {
            authenticated: await this.isAuthenticated(),
            cookies,
            securityHeaders,
            url: this.page?.url()
        };
    }
    /**
     * Test authorization security
     */
    async testAuthorization(params) {
        this.log('info', 'Testing authorization security');
        const results = [];
        for (const resource of params.resources) {
            try {
                const response = await this.page?.goto(resource.url, { waitUntil: 'networkidle0' });
                const statusCode = response?.status();
                const expectedAccess = resource.expectedAccess;
                const actualAccess = statusCode === 200;
                if (expectedAccess !== actualAccess) {
                    this.addVulnerability({
                        id: `auth-${Date.now()}`,
                        type: 'Authorization Bypass',
                        severity: security_test_types_1.SecurityTestSeverity.HIGH,
                        description: `Unexpected access to ${resource.url}. Expected: ${expectedAccess}, Actual: ${actualAccess}`,
                        location: resource.url,
                        recommendation: 'Review access controls and authorization logic',
                        evidence: [{ statusCode, url: resource.url }],
                        exploitability: 0.8,
                        impact: 0.9,
                        timestamp: new Date()
                    });
                }
                results.push({
                    resource: resource.url,
                    expectedAccess,
                    actualAccess,
                    statusCode,
                    secure: expectedAccess === actualAccess
                });
            }
            catch (error) {
                this.log('error', `Authorization test failed for ${resource.url}`, error);
            }
        }
        return { authorizationTests: results };
    }
    /**
     * Validate input security
     */
    async validateInputSecurity(params) {
        this.log('info', 'Validating input security');
        const results = [];
        for (const input of params.inputs) {
            try {
                // Test various injection attacks
                const testPayloads = [
                    "'; DROP TABLE users; --",
                    '<script>alert("XSS")</script>',
                    '{{7*7}}',
                    '../../../etc/passwd',
                    'javascript:alert("XSS")'
                ];
                for (const payload of testPayloads) {
                    await this.page?.type(input.selector, payload);
                    await this.page?.click(input.submitButton);
                    // Check for vulnerabilities
                    const content = await this.page?.content();
                    const hasVulnerability = content?.includes(payload) || content?.includes('49') || content?.includes('alert');
                    if (hasVulnerability) {
                        this.addVulnerability({
                            id: `input-${Date.now()}`,
                            type: 'Input Validation',
                            severity: security_test_types_1.SecurityTestSeverity.HIGH,
                            description: `Input validation vulnerability detected with payload: ${payload}`,
                            location: input.selector,
                            recommendation: 'Implement proper input validation and sanitization',
                            evidence: [{ payload, response: content }],
                            exploitability: 0.9,
                            impact: 0.8,
                            timestamp: new Date()
                        });
                    }
                    // Clear input
                    await this.page?.evaluate((selector) => {
                        const element = document.querySelector(selector);
                        if (element)
                            element.value = '';
                    }, input.selector);
                }
                results.push({
                    input: input.selector,
                    tested: testPayloads.length,
                    vulnerabilities: this.vulnerabilities.length
                });
            }
            catch (error) {
                this.log('error', `Input security test failed for ${input.selector}`, error);
            }
        }
        return { inputSecurityTests: results };
    }
    /**
     * Test session security
     */
    async testSessionSecurity(params) {
        this.log('info', 'Testing session security');
        const cookies = await this.page?.cookies();
        const sessionCookie = cookies?.find(c => c.name.toLowerCase().includes('session'));
        const securityChecks = {
            httpOnly: sessionCookie?.httpOnly || false,
            secure: sessionCookie?.secure || false,
            sameSite: sessionCookie?.sameSite !== 'none',
            hasExpiry: !!sessionCookie?.expires
        };
        // Check for session vulnerabilities
        if (!securityChecks.httpOnly) {
            this.addVulnerability({
                id: `session-httponly-${Date.now()}`,
                type: 'Session Security',
                severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                description: 'Session cookie missing HttpOnly flag',
                location: 'Cookie Configuration',
                recommendation: 'Set HttpOnly flag on session cookies',
                evidence: [sessionCookie],
                exploitability: 0.6,
                impact: 0.7,
                timestamp: new Date()
            });
        }
        if (!securityChecks.secure) {
            this.addVulnerability({
                id: `session-secure-${Date.now()}`,
                type: 'Session Security',
                severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                description: 'Session cookie missing Secure flag',
                location: 'Cookie Configuration',
                recommendation: 'Set Secure flag on session cookies',
                evidence: [sessionCookie],
                exploitability: 0.5,
                impact: 0.6,
                timestamp: new Date()
            });
        }
        return {
            sessionCookie,
            securityChecks,
            vulnerabilities: this.vulnerabilities.length
        };
    }
    /**
     * Validate encryption implementation
     */
    async validateEncryption(params) {
        this.log('info', 'Validating encryption implementation');
        const results = [];
        for (const endpoint of params.endpoints) {
            try {
                const response = await this.page?.goto(endpoint.url, { waitUntil: 'networkidle0' });
                const securityHeaders = response?.headers() || {};
                // Check HTTPS enforcement
                const isHTTPS = this.page?.url().startsWith('https://');
                const hasHSTS = securityHeaders['strict-transport-security'];
                if (!isHTTPS) {
                    this.addVulnerability({
                        id: `encryption-https-${Date.now()}`,
                        type: 'Encryption',
                        severity: security_test_types_1.SecurityTestSeverity.HIGH,
                        description: `Endpoint not using HTTPS: ${endpoint.url}`,
                        location: endpoint.url,
                        recommendation: 'Enforce HTTPS for all endpoints',
                        evidence: [{ url: endpoint.url, protocol: 'HTTP' }],
                        exploitability: 0.9,
                        impact: 0.9,
                        timestamp: new Date()
                    });
                }
                if (!hasHSTS) {
                    this.addVulnerability({
                        id: `encryption-hsts-${Date.now()}`,
                        type: 'Encryption',
                        severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                        description: `Missing HSTS header: ${endpoint.url}`,
                        location: endpoint.url,
                        recommendation: 'Implement HSTS headers',
                        evidence: [{ headers: securityHeaders }],
                        exploitability: 0.4,
                        impact: 0.5,
                        timestamp: new Date()
                    });
                }
                results.push({
                    endpoint: endpoint.url,
                    https: isHTTPS,
                    hsts: !!hasHSTS,
                    headers: securityHeaders
                });
            }
            catch (error) {
                this.log('error', `Encryption validation failed for ${endpoint.url}`, error);
            }
        }
        return { encryptionTests: results };
    }
    /**
     * Test secure error handling
     */
    async testSecureErrorHandling(params) {
        this.log('info', 'Testing secure error handling');
        const results = [];
        for (const errorTest of params.errorTests) {
            try {
                const response = await this.page?.goto(errorTest.url, { waitUntil: 'networkidle0' });
                const content = await this.page?.content();
                const statusCode = response?.status();
                // Check for information disclosure
                const hasStackTrace = content?.includes('at ') && content?.includes('.js:');
                const hasSystemInfo = content?.includes('Server:') || content?.includes('PHP/') || content?.includes('Node.js');
                const hasInternalPaths = content?.includes('/usr/') || content?.includes('C:\\');
                if (hasStackTrace || hasSystemInfo || hasInternalPaths) {
                    this.addVulnerability({
                        id: `error-disclosure-${Date.now()}`,
                        type: 'Information Disclosure',
                        severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                        description: `Error page reveals sensitive information: ${errorTest.url}`,
                        location: errorTest.url,
                        recommendation: 'Implement generic error pages without sensitive information',
                        evidence: [{ content, statusCode }],
                        exploitability: 0.3,
                        impact: 0.5,
                        timestamp: new Date()
                    });
                }
                results.push({
                    url: errorTest.url,
                    statusCode,
                    hasStackTrace,
                    hasSystemInfo,
                    hasInternalPaths,
                    secure: !(hasStackTrace || hasSystemInfo || hasInternalPaths)
                });
            }
            catch (error) {
                this.log('error', `Error handling test failed for ${errorTest.url}`, error);
            }
        }
        return { errorHandlingTests: results };
    }
    /**
     * Setup comprehensive security monitoring
     */
    async setupSecurityMonitoring() {
        if (!this.page)
            return;
        // Monitor console errors and warnings
        this.page.on('console', (msg) => {
            this.log('info', `Console ${msg.type()}: ${msg.text()}`);
        });
        // Monitor network requests
        this.page.on('request', (request) => {
            this.log('debug', `Request: ${request.method()} ${request.url()}`);
        });
        // Monitor responses
        this.page.on('response', (response) => {
            this.log('debug', `Response: ${response.status()} ${response.url()}`);
        });
        // Monitor dialog boxes (potential XSS)
        this.page.on('dialog', async (dialog) => {
            this.log('warn', `Dialog detected: ${dialog.type()} - ${dialog.message()}`);
            await dialog.dismiss();
        });
    }
    /**
     * Validate security boundaries
     */
    async validateSecurityBoundaries(testCase) {
        this.log('info', 'Validating security boundaries');
        // Check Content Security Policy
        const cspHeader = await this.page?.evaluate(() => {
            const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
            return meta ? meta.getAttribute('content') : null;
        });
        if (!cspHeader) {
            this.addVulnerability({
                id: `boundary-csp-${Date.now()}`,
                type: 'Security Headers',
                severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                description: 'Missing Content Security Policy',
                location: 'HTTP Headers',
                recommendation: 'Implement Content Security Policy headers',
                evidence: [{ header: 'CSP', present: false }],
                exploitability: 0.5,
                impact: 0.6,
                timestamp: new Date()
            });
        }
        // Check X-Frame-Options
        const response = await this.page?.goto(this.page.url(), { waitUntil: 'networkidle0' });
        const headers = response?.headers() || {};
        if (!headers['x-frame-options']) {
            this.addVulnerability({
                id: `boundary-xframe-${Date.now()}`,
                type: 'Security Headers',
                severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                description: 'Missing X-Frame-Options header',
                location: 'HTTP Headers',
                recommendation: 'Implement X-Frame-Options header to prevent clickjacking',
                evidence: [{ headers }],
                exploitability: 0.4,
                impact: 0.5,
                timestamp: new Date()
            });
        }
    }
    /**
     * Capture comprehensive security evidence
     */
    async captureSecurityEvidence(testCase) {
        if (!this.page)
            return;
        try {
            // Capture screenshot
            const screenshot = await this.page.screenshot({
                fullPage: true,
                type: 'png'
            });
            this.evidence.push({
                type: 'screenshot',
                timestamp: new Date(),
                data: screenshot,
                description: `Screenshot for test case: ${testCase.name}`,
                metadata: { testCaseId: testCase.id }
            });
            // Capture network logs
            const networkLogs = await this.page.evaluate(() => {
                return window.__networkLogs || [];
            });
            this.evidence.push({
                type: 'network_trace',
                timestamp: new Date(),
                data: networkLogs,
                description: `Network logs for test case: ${testCase.name}`,
                metadata: { testCaseId: testCase.id }
            });
            // Capture security metrics
            const securityMetrics = await this.page.evaluate(() => {
                return {
                    csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content'),
                    cookies: document.cookie,
                    localStorage: Object.keys(localStorage).length,
                    sessionStorage: Object.keys(sessionStorage).length,
                    mixedContent: document.querySelectorAll('img[src^="http:"]').length > 0
                };
            });
            this.evidence.push({
                type: 'response_data',
                timestamp: new Date(),
                data: securityMetrics,
                description: `Security metrics for test case: ${testCase.name}`,
                metadata: { testCaseId: testCase.id }
            });
        }
        catch (error) {
            this.log('error', 'Failed to capture security evidence', error);
        }
    }
    /**
     * Execute test preconditions
     */
    async executePreconditions(preconditions) {
        for (const precondition of preconditions) {
            this.log('info', `Executing precondition: ${precondition}`);
            // Implementation would depend on specific precondition types
        }
    }
    /**
     * Validate security outcomes
     */
    async validateSecurityOutcomes(validations, actualOutcome) {
        return validations.map(validation => {
            try {
                let passed = false;
                const expected = validation.expected;
                const actual = this.extractValueByPath(actualOutcome, validation.rule);
                switch (validation.operator) {
                    case 'equals':
                        passed = actual === expected;
                        break;
                    case 'contains':
                        passed = String(actual).includes(String(expected));
                        break;
                    case 'matches':
                        passed = new RegExp(expected).test(String(actual));
                        break;
                    case 'greater_than':
                        passed = Number(actual) > Number(expected);
                        break;
                    case 'less_than':
                        passed = Number(actual) < Number(expected);
                        break;
                    case 'exists':
                        passed = actual !== undefined && actual !== null;
                        break;
                    default:
                        passed = false;
                }
                return {
                    validationType: validation.type,
                    passed,
                    expected,
                    actual,
                    message: passed ? 'Validation passed' : validation.message,
                    severity: passed ? security_test_types_1.SecurityTestSeverity.INFO : security_test_types_1.SecurityTestSeverity.MEDIUM
                };
            }
            catch (error) {
                return {
                    validationType: validation.type,
                    passed: false,
                    expected: validation.expected,
                    actual: null,
                    message: `Validation error: ${error.message}`,
                    severity: security_test_types_1.SecurityTestSeverity.HIGH
                };
            }
        });
    }
    /**
     * Check authentication security
     */
    checkAuthenticationSecurity(cookies, headers) {
        // Check for weak session management
        const sessionCookie = cookies.find(c => c.name.toLowerCase().includes('session'));
        if (sessionCookie && !sessionCookie.httpOnly) {
            this.addVulnerability({
                id: `auth-session-${Date.now()}`,
                type: 'Authentication',
                severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                description: 'Session cookie not marked as HttpOnly',
                location: 'Authentication System',
                recommendation: 'Mark session cookies as HttpOnly to prevent XSS attacks',
                evidence: [sessionCookie],
                exploitability: 0.6,
                impact: 0.7,
                timestamp: new Date()
            });
        }
        // Check for password in URL or headers
        const authHeader = headers.authorization;
        if (authHeader && authHeader.includes('Basic')) {
            this.addVulnerability({
                id: `auth-basic-${Date.now()}`,
                type: 'Authentication',
                severity: security_test_types_1.SecurityTestSeverity.HIGH,
                description: 'Basic authentication detected',
                location: 'Authentication Headers',
                recommendation: 'Use stronger authentication methods like JWT or OAuth2',
                evidence: [{ header: 'Authorization', type: 'Basic' }],
                exploitability: 0.8,
                impact: 0.9,
                timestamp: new Date()
            });
        }
    }
    /**
     * Calculate security score based on test results
     */
    calculateSecurityScore(result) {
        const totalTests = result.stepResults.length;
        const passedTests = result.stepResults.filter(r => r.status === security_test_types_1.SecurityTestStatus.PASSED).length;
        const vulnerabilityPenalty = this.vulnerabilities.reduce((penalty, vuln) => {
            switch (vuln.severity) {
                case security_test_types_1.SecurityTestSeverity.CRITICAL: return penalty + 50;
                case security_test_types_1.SecurityTestSeverity.HIGH: return penalty + 30;
                case security_test_types_1.SecurityTestSeverity.MEDIUM: return penalty + 15;
                case security_test_types_1.SecurityTestSeverity.LOW: return penalty + 5;
                default: return penalty;
            }
        }, 0);
        const baseScore = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
        return Math.max(0, baseScore - vulnerabilityPenalty);
    }
    /**
     * Check if user is authenticated
     */
    async isAuthenticated() {
        if (!this.page)
            return false;
        try {
            // Check for common authentication indicators
            const indicators = await this.page.evaluate(() => {
                return {
                    hasLogoutButton: !!document.querySelector('[href*="logout"], [onclick*="logout"]'),
                    hasUserMenu: !!document.querySelector('.user-menu, .profile-menu, #user-menu'),
                    hasAuthCookie: document.cookie.includes('session') || document.cookie.includes('auth'),
                    isLoginPage: window.location.href.includes('login') || window.location.href.includes('signin')
                };
            });
            return (indicators.hasLogoutButton || indicators.hasUserMenu || indicators.hasAuthCookie) && !indicators.isLoginPage;
        }
        catch (error) {
            this.log('error', 'Failed to check authentication status', error);
            return false;
        }
    }
    /**
     * Extract value from object by path
     */
    extractValueByPath(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    /**
     * Add security vulnerability
     */
    addVulnerability(vulnerability) {
        this.vulnerabilities.push(vulnerability);
        this.log('warn', `Security vulnerability detected: ${vulnerability.type} - ${vulnerability.description}`);
    }
    /**
     * Create error result for failed tests
     */
    createErrorResult(testCase, error) {
        const timestamp = new Date();
        return {
            testCaseId: testCase.id,
            status: security_test_types_1.SecurityTestStatus.ERROR,
            startTime: timestamp,
            endTime: timestamp,
            duration: 0,
            passed: false,
            vulnerabilities: [],
            stepResults: [],
            logs: [...this.logs],
            metrics: {
                executionTime: 0,
                memoryUsage: 0,
                networkCalls: 0,
                databaseQueries: 0,
                vulnerabilitiesFound: 0,
                securityScore: 0,
                complianceScore: 0
            },
            evidence: [],
            error
        };
    }
    /**
     * Log security testing activities
     */
    log(level, message, data) {
        const logEntry = {
            timestamp: new Date(),
            level,
            message,
            data,
            component: 'SecurityE2EFramework'
        };
        this.logs.push(logEntry);
        console.log(`[${level.toUpperCase()}] ${message}`, data || '');
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
        this.log('info', 'E2E Security Framework cleaned up successfully');
    }
}
exports.SecurityE2EFramework = SecurityE2EFramework;
//# sourceMappingURL=security-e2e-framework.js.map