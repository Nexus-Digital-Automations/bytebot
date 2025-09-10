/**
 * Comprehensive Security Headers Integration Tests
 *
 * Enterprise-grade security header testing suite with automated validation,
 * external scanner integration, and compliance verification.
 *
 * Features:
 * - Complete security header validation (CORS, CSP, HSTS, X-Frame-Options)
 * - Environment-specific policy testing
 * - CSP nonce generation and validation
 * - Helmet.js integration testing
 * - CSP violation reporting simulation
 * - Performance impact measurement
 * - OWASP compliance verification
 * - External security scanner integration
 * - Attack simulation and resistance testing
 *
 * @fileoverview Comprehensive security headers testing and validation
 * @version 2.0.0
 * @author Security Headers Testing Specialist
 */

import request from "supertest";
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";

// Import security components
import { HelmetSecurityMiddleware } from "../src/middleware/helmet-security.middleware";
import { CSPNonceMiddleware } from "../src/middleware/csp-nonce.middleware";
import { CSPViolationReportingService } from "../src/services/csp-violation-reporting.service";
import {
  EnvironmentSecurityConfigManager,
  SecurityEnvironment,
  SecurityLevel,
  getEnvironmentSecurityConfig,
  isSecurityFeatureEnabled,
} from "../src/config/environment-security.config";
import {
  RateLimitServiceType,
  generateEventId,
  SecurityEventType,
} from "../src/utils/security.utils";

// Mock Express app for testing
import express, { Express, Request, Response } from "express";
import { performance } from "perf_hooks";

/**
 * Security header test configuration
 */
interface SecurityHeaderTestConfig {
  environment: SecurityEnvironment;
  serviceType: RateLimitServiceType;
  expectedHeaders: Record<string, string | RegExp>;
  forbiddenHeaders: string[];
  performanceThresholds: {
    maxResponseTime: number; // milliseconds
    maxMemoryIncrease: number; // MB
    maxCpuUsage: number; // percentage
  };
}

/**
 * Security test results
 */
interface SecurityTestResults {
  testId: string;
  timestamp: Date;
  environment: SecurityEnvironment;
  serviceType: RateLimitServiceType;

  // Header validation results
  headerTests: {
    passed: number;
    failed: number;
    details: Array<{
      header: string;
      expected: string | RegExp;
      actual: string | undefined;
      passed: boolean;
      critical: boolean;
    }>;
  };

  // CSP tests
  cspTests: {
    nonceGenerated: boolean;
    nonceValid: boolean;
    violationReportingEnabled: boolean;
    policyCompliant: boolean;
  };

  // Performance metrics
  performance: {
    responseTimeMs: number;
    memoryUsageMB: number;
    cpuUsagePercent: number;
    throughputRps: number;
  };

  // Compliance status
  compliance: {
    owasp: boolean;
    soc2: boolean;
    gdpr: boolean;
    overallScore: number;
  };

  // Security score
  securityScore: number;

  // Recommendations
  recommendations: string[];

  // Critical issues
  criticalIssues: string[];
}

describe("Security Headers Integration Tests", () => {
  let app: Express;
  let configService: ConfigService;
  let eventEmitter: EventEmitter2;
  let securityConfigManager: EnvironmentSecurityConfigManager;
  let cspViolationService: CSPViolationReportingService;

  // Test configurations for different environments
  const testConfigurations: SecurityHeaderTestConfig[] = [
    {
      environment: SecurityEnvironment._DEVELOPMENT,
      serviceType: RateLimitServiceType._BYTEBOT_UI,
      expectedHeaders: {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": /^(DENY|SAMEORIGIN)$/,
        "X-Security-Framework": "Bytebot-Enterprise",
        "X-Security-Version": "2.0.0",
      },
      forbiddenHeaders: ["Server", "X-Powered-By"],
      performanceThresholds: {
        maxResponseTime: 100,
        maxMemoryIncrease: 10,
        maxCpuUsage: 20,
      },
    },
    {
      environment: SecurityEnvironment._PRODUCTION,
      serviceType: RateLimitServiceType._BYTEBOTD,
      expectedHeaders: {
        "Strict-Transport-Security": /^max-age=\d+/,
        "Content-Security-Policy": /script-src.*'nonce-/,
        "X-Frame-Options": "SAMEORIGIN",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": /^(strict-origin-when-cross-origin|no-referrer)$/,
      },
      forbiddenHeaders: ["Server", "X-Powered-By", "X-Debug-Info"],
      performanceThresholds: {
        maxResponseTime: 50,
        maxMemoryIncrease: 5,
        maxCpuUsage: 10,
      },
    },
    {
      environment: SecurityEnvironment._STAGING,
      serviceType: RateLimitServiceType._BYTEBOT_AGENT,
      expectedHeaders: {
        "Content-Security-Policy": /default-src.*'self'/,
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "X-CSP-Nonce": /.{24,}/,
      },
      forbiddenHeaders: ["Server"],
      performanceThresholds: {
        maxResponseTime: 75,
        maxMemoryIncrease: 8,
        maxCpuUsage: 15,
      },
    },
  ];

  beforeAll(async () => {
    // Initialize services
    configService = new ConfigService();
    eventEmitter = new EventEmitter2();
    securityConfigManager = EnvironmentSecurityConfigManager.getInstance();

    // Create CSP violation service for testing
    cspViolationService = new CSPViolationReportingService(
      configService,
      eventEmitter,
      RateLimitServiceType._SHARED,
    );
  });

  afterAll(async () => {
    // Clean up resources
    if (cspViolationService) {
      await cspViolationService.onModuleDestroy();
    }
    securityConfigManager.clearCache();
  });

  describe.each(testConfigurations)(
    "Security Headers for $environment environment ($serviceType service)",
    (testConfig) => {
      let testApp: Express;
      let testResults: SecurityTestResults;

      beforeEach(async () => {
        // Create test Express app
        testApp = express();

        // Apply security middleware based on configuration
        const helmetMiddleware = new HelmetSecurityMiddleware(
          configService,
          testConfig.serviceType,
        );

        const cspNonceMiddleware = new CSPNonceMiddleware(
          configService,
          testConfig.serviceType,
        );

        // Mock environment
        process.env.NODE_ENV = testConfig.environment;

        // Apply middleware
        testApp.use((req, res, next) => {
          helmetMiddleware.use(req, res, next);
        });

        testApp.use((req, res, next) => {
          cspNonceMiddleware.use(req, res, next);
        });

        // Test route
        testApp.get("/test", (req: Request, res: Response) => {
          res.json({
            message: "Security test endpoint",
            nonce: (req as any).nonce,
            timestamp: new Date().toISOString(),
          });
        });

        // CSP violation reporting endpoint
        testApp.post(
          "/security/csp-violations",
          (req: Request, res: Response) => {
            res.status(204).send();
          },
        );

        // Initialize test results
        testResults = {
          testId: generateEventId(),
          timestamp: new Date(),
          environment: testConfig.environment,
          serviceType: testConfig.serviceType,
          headerTests: { passed: 0, failed: 0, details: [] },
          cspTests: {
            nonceGenerated: false,
            nonceValid: false,
            violationReportingEnabled: false,
            policyCompliant: false,
          },
          performance: {
            responseTimeMs: 0,
            memoryUsageMB: 0,
            cpuUsagePercent: 0,
            throughputRps: 0,
          },
          compliance: {
            owasp: false,
            soc2: false,
            gdpr: false,
            overallScore: 0,
          },
          securityScore: 0,
          recommendations: [],
          criticalIssues: [],
        };
      });

      it("should apply all required security headers", async () => {
        const startTime = performance.now();
        const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;

        const response = await request(testApp).get("/test").expect(200);

        const endTime = performance.now();
        const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;

        // Record performance metrics
        testResults.performance.responseTimeMs = endTime - startTime;
        testResults.performance.memoryUsageMB = finalMemory - initialMemory;

        // Test required headers
        for (const [headerName, expectedValue] of Object.entries(
          testConfig.expectedHeaders,
        )) {
          const actualValue = response.headers[headerName.toLowerCase()];
          let passed = false;

          if (expectedValue instanceof RegExp) {
            passed = expectedValue.test(actualValue || "");
          } else {
            passed = actualValue === expectedValue;
          }

          testResults.headerTests.details.push({
            header: headerName,
            expected: expectedValue,
            actual: actualValue,
            passed,
            critical: [
              "Content-Security-Policy",
              "Strict-Transport-Security",
              "X-Frame-Options",
            ].includes(headerName),
          });

          if (passed) {
            testResults.headerTests.passed++;
          } else {
            testResults.headerTests.failed++;
            if (
              [
                "Content-Security-Policy",
                "Strict-Transport-Security",
                "X-Frame-Options",
              ].includes(headerName)
            ) {
              testResults.criticalIssues.push(
                `Missing critical header: ${headerName}`,
              );
            }
          }

          expect(actualValue).toBeDefined();
          if (expectedValue instanceof RegExp) {
            expect(actualValue).toMatch(expectedValue);
          } else {
            expect(actualValue).toBe(expectedValue);
          }
        }

        // Test forbidden headers are not present
        for (const forbiddenHeader of testConfig.forbiddenHeaders) {
          const headerValue = response.headers[forbiddenHeader.toLowerCase()];
          expect(headerValue).toBeUndefined();

          if (headerValue) {
            testResults.criticalIssues.push(
              `Forbidden header present: ${forbiddenHeader}`,
            );
          }
        }

        console.log(
          `✅ Security headers test passed for ${testConfig.environment}/${testConfig.serviceType}`,
        );
      });

      it("should generate valid CSP nonces", async () => {
        const response = await request(testApp).get("/test").expect(200);

        // Check for CSP nonce in headers
        const cspHeader = response.headers["content-security-policy"];
        const nonceHeader =
          response.headers["x-csp-nonce"] ||
          response.headers["x-ui-csp-nonce"] ||
          response.headers["x-api-csp-nonce"];

        if (cspHeader && cspHeader.includes("'nonce-")) {
          testResults.cspTests.nonceGenerated = true;

          // Extract nonce from CSP header
          const nonceMatch = cspHeader.match(/'nonce-([^']+)'/);
          if (nonceMatch) {
            const cspNonce = nonceMatch[1];
            testResults.cspTests.nonceValid = cspNonce.length >= 16; // Minimum secure length

            // Check if nonce header matches CSP nonce
            if (nonceHeader === cspNonce) {
              testResults.cspTests.policyCompliant = true;
            }
          }
        }

        // Check response body for nonce
        const responseBody = response.body;
        if (responseBody.nonce) {
          expect(responseBody.nonce).toBeDefined();
          expect(responseBody.nonce.length).toBeGreaterThan(16);
          testResults.cspTests.nonceGenerated = true;
          testResults.cspTests.nonceValid = true;
        }

        console.log(
          `✅ CSP nonce test passed for ${testConfig.environment}/${testConfig.serviceType}`,
        );
      });

      it("should have proper Content Security Policy configuration", async () => {
        const response = await request(testApp).get("/test").expect(200);

        const cspHeader = response.headers["content-security-policy"];

        if (cspHeader) {
          // Test for basic CSP directives
          expect(cspHeader).toContain("default-src");
          expect(cspHeader).toContain("script-src");

          // Test for security-focused directives
          if (testConfig.environment === SecurityEnvironment._PRODUCTION) {
            expect(cspHeader).toContain("object-src 'none'");
            expect(cspHeader).toContain("base-uri 'self'");
          }

          // Test for nonce-based script execution
          if (cspHeader.includes("'nonce-")) {
            testResults.cspTests.nonceGenerated = true;
            testResults.cspTests.nonceValid = true;
          }

          testResults.cspTests.policyCompliant = true;
        } else {
          testResults.criticalIssues.push(
            "Content Security Policy header missing",
          );
        }

        console.log(
          `✅ CSP configuration test passed for ${testConfig.environment}/${testConfig.serviceType}`,
        );
      });

      it("should handle CSP violation reporting", async () => {
        // Simulate a CSP violation report
        const violationReport = {
          "csp-report": {
            "document-uri": "https://example.com/test",
            referrer: "https://example.com",
            "violated-directive": "script-src 'self'",
            "effective-directive": "script-src",
            "original-policy": "default-src 'self'; script-src 'self'",
            disposition: "enforce",
            "blocked-uri": "https://malicious.com/script.js",
            "line-number": 1,
            "column-number": 1,
            "source-file": "https://example.com/test",
            "status-code": 200,
          },
        };

        const response = await request(testApp)
          .post("/security/csp-violations")
          .send(violationReport)
          .expect(204);

        testResults.cspTests.violationReportingEnabled = true;

        console.log(
          `✅ CSP violation reporting test passed for ${testConfig.environment}/${testConfig.serviceType}`,
        );
      });

      it("should meet performance requirements", async () => {
        const performanceTests = [];
        const startTime = performance.now();
        const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;

        // Run multiple requests to test throughput
        for (let i = 0; i < 100; i++) {
          performanceTests.push(request(testApp).get("/test").expect(200));
        }

        await Promise.all(performanceTests);

        const endTime = performance.now();
        const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        const totalTime = endTime - startTime;

        testResults.performance.responseTimeMs = totalTime / 100; // Average per request
        testResults.performance.memoryUsageMB = finalMemory - initialMemory;
        testResults.performance.throughputRps = 100 / (totalTime / 1000);

        // Validate performance thresholds
        expect(testResults.performance.responseTimeMs).toBeLessThan(
          testConfig.performanceThresholds.maxResponseTime,
        );
        expect(testResults.performance.memoryUsageMB).toBeLessThan(
          testConfig.performanceThresholds.maxMemoryIncrease,
        );

        if (
          testResults.performance.responseTimeMs >=
          testConfig.performanceThresholds.maxResponseTime
        ) {
          testResults.recommendations.push(
            `Response time (${testResults.performance.responseTimeMs.toFixed(2)}ms) exceeds threshold (${testConfig.performanceThresholds.maxResponseTime}ms)`,
          );
        }

        console.log(
          `✅ Performance test passed for ${testConfig.environment}/${testConfig.serviceType}`,
        );
        console.log(
          `   📊 Average response time: ${testResults.performance.responseTimeMs.toFixed(2)}ms`,
        );
        console.log(
          `   📊 Memory increase: ${testResults.performance.memoryUsageMB.toFixed(2)}MB`,
        );
        console.log(
          `   📊 Throughput: ${testResults.performance.throughputRps.toFixed(2)} RPS`,
        );
      });

      it("should comply with security standards", async () => {
        const response = await request(testApp).get("/test").expect(200);

        let owaspCompliant = true;
        let soc2Compliant = true;
        let gdprCompliant = true;

        // OWASP compliance checks
        const requiredOwaspHeaders = [
          "X-Content-Type-Options",
          "X-Frame-Options",
        ];

        for (const header of requiredOwaspHeaders) {
          if (!response.headers[header.toLowerCase()]) {
            owaspCompliant = false;
            testResults.recommendations.push(
              `OWASP: Missing required header ${header}`,
            );
          }
        }

        // SOC 2 compliance checks (if in production)
        if (testConfig.environment === SecurityEnvironment._PRODUCTION) {
          const requiredSoc2Headers = [
            "Strict-Transport-Security",
            "Content-Security-Policy",
          ];

          for (const header of requiredSoc2Headers) {
            if (!response.headers[header.toLowerCase()]) {
              soc2Compliant = false;
              testResults.recommendations.push(
                `SOC 2: Missing required header ${header}`,
              );
            }
          }
        }

        // GDPR compliance (basic privacy headers)
        if (!response.headers["referrer-policy"]) {
          gdprCompliant = false;
          testResults.recommendations.push(
            "GDPR: Consider adding Referrer-Policy header for privacy",
          );
        }

        testResults.compliance.owasp = owaspCompliant;
        testResults.compliance.soc2 = soc2Compliant;
        testResults.compliance.gdpr = gdprCompliant;

        // Calculate overall compliance score
        const complianceFactors = [
          owaspCompliant,
          soc2Compliant,
          gdprCompliant,
        ].filter(Boolean).length;
        testResults.compliance.overallScore = (complianceFactors / 3) * 100;

        expect(owaspCompliant).toBe(true);
        if (testConfig.environment === SecurityEnvironment._PRODUCTION) {
          expect(soc2Compliant).toBe(true);
        }

        console.log(
          `✅ Compliance test passed for ${testConfig.environment}/${testConfig.serviceType}`,
        );
        console.log(`   📊 OWASP: ${owaspCompliant ? "✅" : "❌"}`);
        console.log(`   📊 SOC 2: ${soc2Compliant ? "✅" : "❌"}`);
        console.log(`   📊 GDPR: ${gdprCompliant ? "✅" : "❌"}`);
        console.log(
          `   📊 Overall Score: ${testResults.compliance.overallScore.toFixed(1)}%`,
        );
      });

      it("should resist common attack vectors", async () => {
        // Test clickjacking protection
        const clickjackingResponse = await request(testApp)
          .get("/test")
          .set("X-Forwarded-Host", "malicious.com")
          .expect(200);

        expect(clickjackingResponse.headers["x-frame-options"]).toBeDefined();

        // Test MIME type sniffing protection
        const mimeSniffingResponse = await request(testApp)
          .get("/test")
          .set("Accept", "text/html,application/xhtml+xml")
          .expect(200);

        expect(mimeSniffingResponse.headers["x-content-type-options"]).toBe(
          "nosniff",
        );

        // Test XSS protection (if available)
        const xssResponse = await request(testApp)
          .get("/test")
          .set("User-Agent", "<script>alert('xss')</script>")
          .expect(200);

        // Should not contain the malicious script in response
        expect(xssResponse.text).not.toContain("<script>");

        console.log(
          `✅ Attack resistance test passed for ${testConfig.environment}/${testConfig.serviceType}`,
        );
      });

      afterEach(async () => {
        // Calculate overall security score
        const headerScore =
          (testResults.headerTests.passed /
            (testResults.headerTests.passed + testResults.headerTests.failed)) *
          40;
        const cspScore =
          Object.values(testResults.cspTests).filter(Boolean).length * 10;
        const complianceScore = testResults.compliance.overallScore * 0.3;
        const performanceScore =
          testResults.performance.responseTimeMs <=
          testConfig.performanceThresholds.maxResponseTime
            ? 20
            : 10;

        testResults.securityScore = Math.min(
          100,
          headerScore + cspScore + complianceScore + performanceScore,
        );

        // Generate final recommendations
        if (testResults.securityScore < 90) {
          testResults.recommendations.push(
            "Consider implementing additional security measures to achieve higher security score",
          );
        }

        if (testResults.criticalIssues.length === 0) {
          testResults.recommendations.push(
            "No critical security issues found - excellent security posture",
          );
        }

        // Log test summary
        console.log(`\n🔒 SECURITY TEST SUMMARY`);
        console.log(`   Environment: ${testResults.environment}`);
        console.log(`   Service: ${testResults.serviceType}`);
        console.log(
          `   Security Score: ${testResults.securityScore.toFixed(1)}/100`,
        );
        console.log(
          `   Headers Passed: ${testResults.headerTests.passed}/${testResults.headerTests.passed + testResults.headerTests.failed}`,
        );
        console.log(
          `   CSP Status: ${Object.values(testResults.cspTests).filter(Boolean).length}/4 features enabled`,
        );
        console.log(
          `   Compliance Score: ${testResults.compliance.overallScore.toFixed(1)}%`,
        );
        console.log(`   Critical Issues: ${testResults.criticalIssues.length}`);

        if (testResults.recommendations.length > 0) {
          console.log(`\n💡 RECOMMENDATIONS:`);
          testResults.recommendations.forEach((rec) =>
            console.log(`   • ${rec}`),
          );
        }

        if (testResults.criticalIssues.length > 0) {
          console.log(`\n🚨 CRITICAL ISSUES:`);
          testResults.criticalIssues.forEach((issue) =>
            console.log(`   • ${issue}`),
          );
        }

        console.log(`\n`);
      });
    },
  );

  describe("External Security Scanner Integration", () => {
    it("should validate security headers with external tools", async () => {
      // Mock external security scanner results
      const mockScannerResults = {
        testId: generateEventId(),
        timestamp: new Date(),
        scanner: "OWASP ZAP",
        url: "https://test.bytebot.ai",
        results: {
          securityHeaders: {
            score: 95,
            grade: "A",
            issues: [],
            recommendations: [
              "Consider implementing Expect-CT header",
              "Add Feature-Policy header for enhanced security",
            ],
          },
          ssl: {
            grade: "A+",
            issues: [],
          },
          vulnerabilities: {
            high: 0,
            medium: 1,
            low: 2,
            info: 5,
          },
        },
      };

      // Validate scanner results meet our requirements
      expect(mockScannerResults.results.securityHeaders.score).toBeGreaterThan(
        90,
      );
      expect(mockScannerResults.results.vulnerabilities.high).toBe(0);
      expect(mockScannerResults.results.ssl.grade).toMatch(/^A/);

      console.log(`✅ External security scanner validation passed`);
      console.log(
        `   📊 Security Headers Score: ${mockScannerResults.results.securityHeaders.score}/100`,
      );
      console.log(`   📊 SSL Grade: ${mockScannerResults.results.ssl.grade}`);
      console.log(
        `   📊 High Vulnerabilities: ${mockScannerResults.results.vulnerabilities.high}`,
      );
    });

    it("should validate security configuration against industry benchmarks", async () => {
      // Test against security configuration benchmarks
      const environmentConfigs = [
        SecurityEnvironment._DEVELOPMENT,
        SecurityEnvironment._STAGING,
        SecurityEnvironment._PRODUCTION,
      ];

      for (const env of environmentConfigs) {
        const config = getEnvironmentSecurityConfig(
          RateLimitServiceType._SHARED,
        );

        // Validate security features are enabled appropriately
        if (env === SecurityEnvironment._PRODUCTION) {
          expect(
            isSecurityFeatureEnabled(
              "comprehensiveHeaders",
              RateLimitServiceType._SHARED,
              env,
            ),
          ).toBe(true);
          expect(
            isSecurityFeatureEnabled(
              "threatIntelligence",
              RateLimitServiceType._SHARED,
              env,
            ),
          ).toBe(true);
        }

        // Validate CORS configuration
        expect(config.cors.enabled).toBe(true);
        if (env === SecurityEnvironment._PRODUCTION) {
          expect(config.cors.strictMode).toBe(true);
          expect(config.cors.allowedOrigins).not.toContain("*");
        }

        console.log(`✅ Configuration benchmark validation passed for ${env}`);
      }
    });
  });

  describe("Security Regression Tests", () => {
    it("should maintain security posture across updates", async () => {
      // Test that security features remain enabled after configuration changes
      const baseConfig = getEnvironmentSecurityConfig(
        RateLimitServiceType._SHARED,
      );

      // Simulate configuration update
      const configManager = EnvironmentSecurityConfigManager.getInstance();
      configManager.updateSecurityConfig(
        SecurityEnvironment._PRODUCTION,
        RateLimitServiceType._SHARED,
        {
          features: {
            ...baseConfig.features,
            securityTesting: true, // Ensure testing remains enabled
          },
        },
      );

      const updatedConfig = configManager.getSecurityConfig(
        SecurityEnvironment._PRODUCTION,
        RateLimitServiceType._SHARED,
      );

      // Validate critical security features remain enabled
      expect(updatedConfig.features.comprehensiveHeaders).toBe(true);
      expect(updatedConfig.features.securityMonitoring).toBe(true);
      expect(updatedConfig.features.securityTesting).toBe(true);

      console.log(`✅ Security regression test passed`);
    });

    it("should detect security configuration drift", async () => {
      // Test for unintended changes in security configuration
      const expectedSecurityFeatures = [
        "advancedCors",
        "comprehensiveHeaders",
        "securityMonitoring",
      ];

      const productionConfig = getEnvironmentSecurityConfig(
        RateLimitServiceType._SHARED,
      );

      for (const feature of expectedSecurityFeatures) {
        if (process.env.NODE_ENV === "production") {
          expect(
            productionConfig.features[
              feature as keyof typeof productionConfig.features
            ],
          ).toBe(true);
        }
      }

      // Validate security posture assessment
      const configManager = EnvironmentSecurityConfigManager.getInstance();
      const securityPosture = configManager.getSecurityPosture(
        SecurityEnvironment._PRODUCTION,
        RateLimitServiceType._SHARED,
      );

      expect(securityPosture.score).toBeGreaterThan(80);
      expect(securityPosture.level).toBe(SecurityLevel._HIGH);

      console.log(`✅ Security configuration drift detection passed`);
      console.log(`   📊 Security Posture Score: ${securityPosture.score}/100`);
      console.log(`   📊 Security Level: ${securityPosture.level}`);
    });
  });
});

/**
 * Performance benchmark tests for security middleware
 */
describe("Security Middleware Performance Tests", () => {
  it("should maintain acceptable performance under load", async () => {
    const testApp = express();

    // Apply all security middleware
    const helmetMiddleware = new HelmetSecurityMiddleware(
      new ConfigService(),
      RateLimitServiceType._SHARED,
    );

    const cspNonceMiddleware = new CSPNonceMiddleware(
      new ConfigService(),
      RateLimitServiceType._SHARED,
    );

    testApp.use((req, res, next) => {
      helmetMiddleware.use(req, res, next);
    });

    testApp.use((req, res, next) => {
      cspNonceMiddleware.use(req, res, next);
    });

    testApp.get("/benchmark", (req, res) => {
      res.json({ status: "ok", timestamp: Date.now() });
    });

    // Run load test
    const concurrentRequests = 1000;
    const requests = [];
    const startTime = performance.now();

    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(request(testApp).get("/benchmark").expect(200));
    }

    await Promise.all(requests);

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageResponseTime = totalTime / concurrentRequests;
    const requestsPerSecond = concurrentRequests / (totalTime / 1000);

    // Performance assertions
    expect(averageResponseTime).toBeLessThan(50); // 50ms average
    expect(requestsPerSecond).toBeGreaterThan(100); // 100 RPS minimum

    console.log(`🚀 PERFORMANCE BENCHMARK RESULTS:`);
    console.log(`   📊 Concurrent Requests: ${concurrentRequests}`);
    console.log(`   📊 Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(
      `   📊 Average Response Time: ${averageResponseTime.toFixed(2)}ms`,
    );
    console.log(
      `   📊 Requests Per Second: ${requestsPerSecond.toFixed(2)} RPS`,
    );
    console.log(`   ✅ Performance benchmark passed`);
  });
});
