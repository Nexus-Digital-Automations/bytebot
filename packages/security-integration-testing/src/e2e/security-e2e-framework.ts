/**
 * End-to-End Security Validation Framework
 *
 * Agent 1: Comprehensive E2E security testing with user journey validation,
 * security boundary testing, and cross-component security integration.
 *
 * @author Bytebot Security Team - Agent 1
 * @version 1.0.0
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import {
  SecurityTestCase,
  SecurityTestResult,
  SecurityTestEvidence,
  SecurityTestLog,
  SecurityVulnerability,
  SecurityTestSeverity,
  SecurityTestStatus,
  SecurityTestCategory
} from '../types/security-test-types';

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
export class SecurityE2EFramework {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private logs: SecurityTestLog[] = [];
  private evidence: SecurityTestEvidence[] = [];
  private vulnerabilities: SecurityVulnerability[] = [];

  constructor(private config: SecurityE2EConfig) {}

  /**
   * Initialize the E2E security testing framework
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing E2E Security Testing Framework');

    this.browser = await puppeteer.launch({
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
  async runE2ESecurityTestSuite(testCases: SecurityTestCase[]): Promise<SecurityTestResult[]> {
    const results: SecurityTestResult[] = [];

    this.log('info', `Starting E2E security test suite with ${testCases.length} test cases`);

    for (const testCase of testCases) {
      try {
        const result = await this.executeE2ESecurityTest(testCase);
        results.push(result);

        if (result.status === SecurityTestStatus.FAILED) {
          this.log('error', `E2E test failed: ${testCase.name}`, { vulnerabilities: result.vulnerabilities });
        }
      } catch (error) {
        this.log('error', `E2E test execution error: ${testCase.name}`, error);
        results.push(this.createErrorResult(testCase, error as Error));
      }
    }

    this.log('info', `E2E security test suite completed. Results: ${results.length}`);
    return results;
  }

  /**
   * Execute individual end-to-end security test
   */
  private async executeE2ESecurityTest(testCase: SecurityTestCase): Promise<SecurityTestResult> {
    const startTime = new Date();
    this.log('info', `Executing E2E security test: ${testCase.name}`);

    const result: SecurityTestResult = {
      testCaseId: testCase.id,
      status: SecurityTestStatus.RUNNING,
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

        if (stepResult.status === SecurityTestStatus.FAILED) {
          result.status = SecurityTestStatus.FAILED;
          break;
        }
      }

      // Validate security boundaries
      await this.validateSecurityBoundaries(testCase);

      // Capture evidence
      await this.captureSecurityEvidence(testCase);

      // Calculate security score
      result.metrics.securityScore = this.calculateSecurityScore(result);

      if (result.status !== SecurityTestStatus.FAILED) {
        result.status = SecurityTestStatus.PASSED;
        result.passed = true;
      }

    } catch (error) {
      result.status = SecurityTestStatus.ERROR;
      result.error = error as Error;
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
  private async executeSecurityTestStep(step: any): Promise<any> {
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
        status: validationResults.every(v => v.passed) ? SecurityTestStatus.PASSED : SecurityTestStatus.FAILED,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        validationResults,
        actualOutcome
      };

    } catch (error) {
      const endTime = new Date();
      this.log('error', `Security step execution failed: ${step.action}`, error);

      return {
        stepId: step.id,
        status: SecurityTestStatus.ERROR,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        validationResults: [],
        actualOutcome: null,
        error: error as Error
      };
    }
  }

  /**
   * Perform secure authentication testing
   */
  private async performSecureAuthentication(params: any): Promise<any> {
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
  private async testAuthorization(params: any): Promise<any> {
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
            severity: SecurityTestSeverity.HIGH,
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

      } catch (error) {
        this.log('error', `Authorization test failed for ${resource.url}`, error);
      }
    }

    return { authorizationTests: results };
  }

  /**
   * Validate input security
   */
  private async validateInputSecurity(params: any): Promise<any> {
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
              severity: SecurityTestSeverity.HIGH,
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
            const element = document.querySelector(selector) as HTMLInputElement;
            if (element) element.value = '';
          }, input.selector);
        }

        results.push({
          input: input.selector,
          tested: testPayloads.length,
          vulnerabilities: this.vulnerabilities.length
        });

      } catch (error) {
        this.log('error', `Input security test failed for ${input.selector}`, error);
      }
    }

    return { inputSecurityTests: results };
  }

  /**
   * Test session security
   */
  private async testSessionSecurity(params: any): Promise<any> {
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
        severity: SecurityTestSeverity.MEDIUM,
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
        severity: SecurityTestSeverity.MEDIUM,
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
  private async validateEncryption(params: any): Promise<any> {
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
            severity: SecurityTestSeverity.HIGH,
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
            severity: SecurityTestSeverity.MEDIUM,
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

      } catch (error) {
        this.log('error', `Encryption validation failed for ${endpoint.url}`, error);
      }
    }

    return { encryptionTests: results };
  }

  /**
   * Test secure error handling
   */
  private async testSecureErrorHandling(params: any): Promise<any> {
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
            severity: SecurityTestSeverity.MEDIUM,
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

      } catch (error) {
        this.log('error', `Error handling test failed for ${errorTest.url}`, error);
      }
    }

    return { errorHandlingTests: results };
  }

  /**
   * Setup comprehensive security monitoring
   */
  private async setupSecurityMonitoring(): Promise<void> {
    if (!this.page) return;

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
  private async validateSecurityBoundaries(testCase: SecurityTestCase): Promise<void> {
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
        severity: SecurityTestSeverity.MEDIUM,
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
        severity: SecurityTestSeverity.MEDIUM,
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
  private async captureSecurityEvidence(testCase: SecurityTestCase): Promise<void> {
    if (!this.page) return;

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
        return (window as any).__networkLogs || [];
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

    } catch (error) {
      this.log('error', 'Failed to capture security evidence', error);
    }
  }

  /**
   * Execute test preconditions
   */
  private async executePreconditions(preconditions: string[]): Promise<void> {
    for (const precondition of preconditions) {
      this.log('info', `Executing precondition: ${precondition}`);
      // Implementation would depend on specific precondition types
    }
  }

  /**
   * Validate security outcomes
   */
  private async validateSecurityOutcomes(validations: any[], actualOutcome: any): Promise<any[]> {
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
          severity: passed ? SecurityTestSeverity.INFO : SecurityTestSeverity.MEDIUM
        };

      } catch (error) {
        return {
          validationType: validation.type,
          passed: false,
          expected: validation.expected,
          actual: null,
          message: `Validation error: ${(error as Error).message}`,
          severity: SecurityTestSeverity.HIGH
        };
      }
    });
  }

  /**
   * Check authentication security
   */
  private checkAuthenticationSecurity(cookies: any[], headers: any): void {
    // Check for weak session management
    const sessionCookie = cookies.find(c => c.name.toLowerCase().includes('session'));

    if (sessionCookie && !sessionCookie.httpOnly) {
      this.addVulnerability({
        id: `auth-session-${Date.now()}`,
        type: 'Authentication',
        severity: SecurityTestSeverity.MEDIUM,
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
        severity: SecurityTestSeverity.HIGH,
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
  private calculateSecurityScore(result: SecurityTestResult): number {
    const totalTests = result.stepResults.length;
    const passedTests = result.stepResults.filter(r => r.status === SecurityTestStatus.PASSED).length;
    const vulnerabilityPenalty = this.vulnerabilities.reduce((penalty, vuln) => {
      switch (vuln.severity) {
        case SecurityTestSeverity.CRITICAL: return penalty + 50;
        case SecurityTestSeverity.HIGH: return penalty + 30;
        case SecurityTestSeverity.MEDIUM: return penalty + 15;
        case SecurityTestSeverity.LOW: return penalty + 5;
        default: return penalty;
      }
    }, 0);

    const baseScore = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    return Math.max(0, baseScore - vulnerabilityPenalty);
  }

  /**
   * Check if user is authenticated
   */
  private async isAuthenticated(): Promise<boolean> {
    if (!this.page) return false;

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
    } catch (error) {
      this.log('error', 'Failed to check authentication status', error);
      return false;
    }
  }

  /**
   * Extract value from object by path
   */
  private extractValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Add security vulnerability
   */
  private addVulnerability(vulnerability: SecurityVulnerability): void {
    this.vulnerabilities.push(vulnerability);
    this.log('warn', `Security vulnerability detected: ${vulnerability.type} - ${vulnerability.description}`);
  }

  /**
   * Create error result for failed tests
   */
  private createErrorResult(testCase: SecurityTestCase, error: Error): SecurityTestResult {
    const timestamp = new Date();
    return {
      testCaseId: testCase.id,
      status: SecurityTestStatus.ERROR,
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
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry: SecurityTestLog = {
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
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }

    this.log('info', 'E2E Security Framework cleaned up successfully');
  }
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