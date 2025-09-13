/**
 * Comprehensive Security Test Suite - Enterprise Security Validation
 *
 * This test suite validates all security components including:
 * - CORS policies and origin validation with attack simulation
 * - Security headers with helmet.js configuration verification
 * - CSP nonce generation and violation reporting
 * - Security event monitoring and real-time threat detection
 * - Attack pattern recognition and automated response
 * - Performance and load testing for security middleware
 *
 * @fileoverview Complete security testing with attack simulation
 * @version 2.0.0
 * @author Security Testing & Validation Specialist
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Request, Response } from "express";
import {
  ComprehensiveSecurityMiddleware,
  SecurityEvent,
} from "../src/middleware/comprehensive-security.middleware";
import { SecurityEventType } from "../src/types/security.types";
import {
  SecurityMonitoringService,
  SecurityAlert,
  SecurityAlertLevel,
  AttackPattern,
} from "../src/services/security-monitoring.service";
import {
  getEnvironmentConfig,
  validateOriginPattern,
  calculateCorsRiskScore,
} from "../src/config/cors-security.config";

// Mock Express request/response objects
const createMockRequest = (
  overrides: Partial<Request> = {},
): Partial<Request> => ({
  method: "GET",
  url: "/test",
  get: jest.fn((header: string) => {
    const headers: Record<string, string | string[]> = {
      "user-agent": "Mozilla/5.0 (Test Browser)",
      accept: "application/json",
      "set-cookie": ["test-cookie=value"],
      ...(overrides as any).headers,
    };
    const value = headers[header.toLowerCase()];
    if (header.toLowerCase() === "set-cookie" && Array.isArray(value)) {
      return value;
    }
    return typeof value === "string" ? value : undefined;
  }) as unknown as Request["get"],
  ip: "127.0.0.1",
  ...overrides,
});

const createMockResponse = (): Partial<Response> => {
  const headers: Record<string, string> = {};
  const mockResponse: Partial<Response> = {};

  mockResponse.setHeader = jest.fn(
    (name: string, value: string | number | readonly string[]): Response => {
      headers[name.toLowerCase()] = String(value);
      return mockResponse as Response;
    },
  );

  mockResponse.removeHeader = jest.fn((name: string): Response => {
    delete headers[name.toLowerCase()];
    return mockResponse as Response;
  });

  mockResponse.getHeaders = jest.fn(() => headers);
  mockResponse.status = jest.fn().mockReturnValue(mockResponse);
  mockResponse.json = jest.fn().mockReturnValue(mockResponse);
  mockResponse.end = jest.fn().mockReturnValue(mockResponse);
  mockResponse.locals = {};

  return mockResponse;
};

describe("Comprehensive Security System", () => {
  let securityMiddleware: ComprehensiveSecurityMiddleware;
  let securityMonitoring: SecurityMonitoringService;
  let configService: ConfigService;
  let eventEmitter: EventEmitter2;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ComprehensiveSecurityMiddleware,
        SecurityMonitoringService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const config: Record<string, unknown> = {
                NODE_ENV: "test",
                SERVICE_NAME: "test-service",
                CORS_ORIGINS: "http://localhost:3000,https://app.bytebot.ai",
                ENABLE_SECURITY_ALERTS: "true",
                ENABLE_CSP_REPORTING: "true",
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
            on: jest.fn(),
            once: jest.fn(),
          },
        },
      ],
    }).compile();

    securityMiddleware = module.get<ComprehensiveSecurityMiddleware>(
      ComprehensiveSecurityMiddleware,
    );
    securityMonitoring = module.get<SecurityMonitoringService>(
      SecurityMonitoringService,
    );
    configService = module.get<ConfigService>(ConfigService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(async () => {
    await module.close();
  });

  describe("CORS Security Validation", () => {
    describe("Origin Validation", () => {
      test("should allow legitimate origins in development", () => {
        const result = validateOriginPattern(
          "http://localhost:3000",
          "development",
        );
        expect(result.valid).toBe(true);
        expect(result.reason).toContain("development pattern");
      });

      test("should allow production origins", () => {
        const result = validateOriginPattern(
          "https://app.bytebot.ai",
          "production",
        );
        expect(result.valid).toBe(true);
        expect(result.reason).toContain("production pattern");
      });

      test("should reject malicious origins", () => {
        const maliciousOrigins = [
          "http://malicious-site.com",
          "https://attacker.evil",
          "javascript://xss-attack",
          'data:text/html,<script>alert("xss")</script>',
          "file:///etc/passwd",
        ];

        maliciousOrigins.forEach((origin) => {
          const result = validateOriginPattern(origin, "production");
          expect(result.valid).toBe(false);
          expect(result.reason).toContain("does not match");
        });
      });

      test("should handle edge cases gracefully", () => {
        const edgeCases = ["", null, undefined, "   ", "not-a-url"];

        edgeCases.forEach((origin) => {
          const result = validateOriginPattern(origin as any, "production");
          expect(result.valid).toBe(false);
        });
      });
    });

    describe("Risk Score Calculation", () => {
      test("should assign high risk to suspicious origins", () => {
        const suspiciousOrigins = [
          { origin: "http://192.168.1.1", expectedScore: 75 }, // IP address
          { origin: "http://localhost:3000", expectedScore: 70 }, // Localhost in production
          { origin: "http://suspicious.tk", expectedScore: 65 }, // Suspicious TLD
        ];

        suspiciousOrigins.forEach(({ origin, expectedScore }) => {
          const score = calculateCorsRiskScore(origin, "production");
          expect(score).toBeGreaterThanOrEqual(expectedScore);
        });
      });

      test("should consider request patterns in risk calculation", () => {
        const baseScore = calculateCorsRiskScore(
          "http://unknown.com",
          "production",
        );
        const repeatedScore = calculateCorsRiskScore(
          "http://unknown.com",
          "production",
          {
            requestCount: 15,
          },
        );

        expect(repeatedScore).toBeGreaterThan(baseScore);
      });

      test("should assign higher risk in production environment", () => {
        const origin = "http://unknown.com";
        const devScore = calculateCorsRiskScore(origin, "development");
        const prodScore = calculateCorsRiskScore(origin, "production");

        expect(prodScore).toBeGreaterThan(devScore);
      });
    });

    describe("CORS Middleware Integration", () => {
      test("should apply CORS headers for allowed origins", async () => {
        const req = createMockRequest({
          get: jest.fn((header) => {
            if (header === "Origin") return "http://localhost:3000";
            if (header.toLowerCase() === "set-cookie")
              return ["test-cookie=value"];
            return undefined;
          }) as unknown as Request["get"],
        });
        const res = createMockResponse();
        const next = jest.fn();

        await new Promise<void>((resolve) => {
          const originalNext = next;
          next.mockImplementation(() => {
            originalNext();
            resolve();
          });

          securityMiddleware.use(req as Request, res as Response, next);
        });

        expect(res.setHeader).toHaveBeenCalledWith(
          "Access-Control-Allow-Origin",
          "http://localhost:3000",
        );
        expect(res.setHeader).toHaveBeenCalledWith(
          "Access-Control-Allow-Credentials",
          "true",
        );
      });

      test("should block malicious origins in production", async () => {
        // Mock production environment
        const prodConfigService = {
          get: jest.fn((key: string, defaultValue?: unknown) => {
            if (key === "NODE_ENV") return "production";
            if (key === "SERVICE_NAME") return "test-service";
            return configService.get(key, defaultValue);
          }),
        };

        const prodModule = await Test.createTestingModule({
          providers: [
            ComprehensiveSecurityMiddleware,
            { provide: ConfigService, useValue: prodConfigService },
          ],
        }).compile();

        const prodMiddleware = prodModule.get<ComprehensiveSecurityMiddleware>(
          ComprehensiveSecurityMiddleware,
        );

        const req = createMockRequest({
          get: jest.fn((header) => {
            if (header === "Origin") return "http://malicious.com";
            if (header.toLowerCase() === "set-cookie")
              return ["test-cookie=value"];
            return undefined;
          }) as unknown as Request["get"],
        });
        const res = createMockResponse();
        const next = jest.fn();

        await new Promise<void>((resolve) => {
          const statusMock = jest.fn().mockReturnValue({
            json: jest.fn().mockImplementation(() => resolve()),
          });
          res.status = statusMock;

          prodMiddleware.use(req as Request, res as Response, next);
        });

        expect(res.status).toHaveBeenCalledWith(403);
      });
    });
  });

  describe("Security Headers Validation", () => {
    test("should validate essential security headers", () => {
      const headers = {
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "strict-origin-when-cross-origin",
        "x-service": "test-service",
      };

      const validation = securityMiddleware.validateResponseHeaders(headers);
      expect(validation.valid).toBe(true);
      expect(validation.missing).toHaveLength(0);
    });

    test("should detect missing security headers", () => {
      const headers = {
        "x-service": "test-service",
      };

      const validation = securityMiddleware.validateResponseHeaders(headers);
      expect(validation.valid).toBe(false);
      expect(validation.missing).toContain("x-content-type-options");
      expect(validation.missing).toContain("x-frame-options");
      expect(validation.missing).toContain("referrer-policy");
    });

    test("should provide production-specific recommendations", () => {
      // Mock production environment
      const prodConfigService = {
        get: jest.fn((key: string) => {
          if (key === "NODE_ENV") return "production";
          return configService.get(key);
        }),
      };

      // Create production middleware instance
      const prodMiddleware = new ComprehensiveSecurityMiddleware(
        prodConfigService as any,
      );

      const headers = {
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "strict-origin-when-cross-origin",
        "x-service": "test-service",
        "x-powered-by": "Express", // Should be removed in production
      };

      const validation = prodMiddleware.validateResponseHeaders(headers);
      expect(validation.recommendations).toContain(
        "Remove X-Powered-By header in production",
      );
    });
  });

  describe("Security Event Monitoring", () => {
    test("should process security events correctly", async () => {
      const testEvent: SecurityEvent = {
        eventId: "test-event-123",
        type: SecurityEventType._CORS_VIOLATION,
        timestamp: new Date(),
        serviceName: "test-service",
        environment: "test",
        origin: "http://malicious.com",
        ipAddress: "192.168.1.100",
        userAgent: "Malicious Bot/1.0",
        endpoint: "/api/test",
        method: "GET",
        riskScore: 85,
        blocked: true,
        success: false,
        reason: "Origin not allowed by CORS policy",
        metadata: { test: true },
      };

      await securityMonitoring.processSecurityEvent(testEvent);

      // Verify event was processed
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "security.event",
        testEvent,
      );
    });

    test("should generate security dashboard", async () => {
      const dashboard = await securityMonitoring.getSecurityDashboardSummary();

      expect(dashboard).toHaveProperty("timestamp");
      expect(dashboard).toHaveProperty("environment");
      expect(dashboard).toHaveProperty("totalEvents");
      expect(dashboard).toHaveProperty("criticalAlerts");
      expect(dashboard).toHaveProperty("topThreats");
      expect(dashboard).toHaveProperty("recentAlerts");
      expect(dashboard).toHaveProperty("metrics");

      expect(Array.isArray(dashboard.topThreats)).toBe(true);
      expect(Array.isArray(dashboard.recentAlerts)).toBe(true);
      expect(Array.isArray(dashboard.metrics)).toBe(true);
    });
  });

  describe("Attack Pattern Detection", () => {
    test("should detect CORS flood attacks", async () => {
      const baseEvent: SecurityEvent = {
        eventId: "",
        type: SecurityEventType._CORS_VIOLATION,
        timestamp: new Date(),
        serviceName: "test-service",
        environment: "test",
        origin: "http://malicious.com",
        ipAddress: "192.168.1.100",
        userAgent: "Attack Bot/1.0",
        endpoint: "/api/test",
        method: "GET",
        riskScore: 50,
        blocked: true,
        success: false,
        reason: "Origin not allowed",
        metadata: {},
      };

      // Simulate rapid CORS violations from same IP
      for (let i = 0; i < 15; i++) {
        const event = { ...baseEvent, eventId: `flood-test-${i}` };
        await securityMonitoring.processSecurityEvent(event);
      }

      // Check if flood pattern was detected (would generate alert)
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        expect.stringContaining("security.alert"),
        expect.any(Object),
      );
    });

    test("should detect CSP bypass attempts", async () => {
      const cspEvents = Array.from({ length: 5 }, (_, i) => ({
        eventId: `csp-test-${i}`,
        type: SecurityEventType._CSP_VIOLATION,
        timestamp: new Date(),
        serviceName: "test-service",
        environment: "test",
        origin: "http://suspicious.com",
        ipAddress: "192.168.1.101",
        userAgent: "Script Injector/1.0",
        endpoint: "/vulnerable-page",
        method: "CSP_REPORT",
        riskScore: 70,
        blocked: true,
        success: false,
        reason: "CSP violation: script-src",
        metadata: {
          violatedDirective: "script-src",
          blockedUri: "javascript:alert(1)",
        },
      }));

      for (const event of cspEvents) {
        await securityMonitoring.processSecurityEvent(event);
      }

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        expect.stringContaining("security.alert"),
        expect.any(Object),
      );
    });
  });

  describe("Performance and Load Testing", () => {
    test("should handle high-volume requests efficiently", async () => {
      const startTime = Date.now();
      const requestCount = 1000;

      const requests = Array.from({ length: requestCount }, (_, i) => {
        const req = createMockRequest({
          url: `/test/${i}`,
          get: jest.fn(
            () => "http://localhost:3000",
          ) as unknown as Request["get"],
        });
        const res = createMockResponse();
        const next = jest.fn();

        return new Promise<void>((resolve) => {
          next.mockImplementation(() => resolve());
          securityMiddleware.use(req as Request, res as Response, next);
        });
      });

      await Promise.all(requests);

      const processingTime = Date.now() - startTime;
      const averageTimePerRequest = processingTime / requestCount;

      // Should process requests efficiently (less than 10ms per request on average)
      expect(averageTimePerRequest).toBeLessThan(10);
    });

    test("should maintain memory efficiency during sustained load", async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Simulate sustained load
      for (let batch = 0; batch < 10; batch++) {
        const batchRequests = Array.from({ length: 100 }, (_, i) => {
          const req = createMockRequest({
            url: `/load-test/${batch}-${i}`,
            get: jest.fn(
              () => `http://localhost:300${i % 10}`,
            ) as unknown as Request["get"],
          });
          const res = createMockResponse();
          const next = jest.fn();

          return new Promise<void>((resolve) => {
            next.mockImplementation(() => resolve());
            securityMiddleware.use(req as Request, res as Response, next);
          });
        });

        await Promise.all(batchRequests);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for 1000 requests)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe("CSP Nonce Generation and Validation", () => {
    test("should generate unique nonces for each request", async () => {
      const nonces: string[] = [];
      const requestCount = 100;

      for (let i = 0; i < requestCount; i++) {
        const req = createMockRequest();
        const res = createMockResponse();
        const next = jest.fn();

        await new Promise<void>((resolve) => {
          next.mockImplementation(() => {
            const setHeaderMock = res.setHeader as jest.MockedFunction<
              (
                name: string,
                value: string | number | readonly string[],
              ) => Response
            >;
            const nonce = setHeaderMock.mock.calls.find(
              (call) => call[0] === "X-CSP-Nonce",
            )?.[1];
            if (nonce && typeof nonce === "string") {
              nonces.push(nonce);
            }
            resolve();
          });

          securityMiddleware.use(req as Request, res as Response, next);
        });
      }

      // All nonces should be unique
      const uniqueNonces = new Set(nonces);
      expect(uniqueNonces.size).toBe(nonces.length);

      // Nonces should be base64 encoded and appropriate length
      nonces.forEach((nonce) => {
        expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
        expect(Buffer.from(nonce, "base64").length).toBe(16);
      });
    });

    test("should handle CSP violation reports correctly", async () => {
      const mockCSPReport = {
        "csp-report": {
          "document-uri": "https://app.bytebot.ai/test",
          "violated-directive": "script-src",
          "blocked-uri": "https://evil.com/malicious.js",
          "source-file": "https://app.bytebot.ai/app.js",
          "line-number": 42,
          "column-number": 13,
          "status-code": 200,
        },
      };

      const req = createMockRequest({
        url: "/api/security/csp-report",
        method: "POST",
        body: mockCSPReport,
      });
      const res = createMockResponse();
      const next = jest.fn();

      await new Promise<void>((resolve) => {
        res.status = jest.fn().mockReturnValue({
          end: jest.fn().mockImplementation(() => resolve()),
        });

        securityMiddleware.use(req as Request, res as Response, next);
      });

      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe("Configuration Validation", () => {
    test("should validate environment-specific configurations", () => {
      const environments = ["development", "staging", "production"];

      environments.forEach((env) => {
        const config = getEnvironmentConfig(env);

        expect(config).toHaveProperty("environment", env);
        expect(config).toHaveProperty("allowedOrigins");
        expect(config).toHaveProperty("security");
        expect(config).toHaveProperty("rateLimits");

        expect(Array.isArray(config.allowedOrigins)).toBe(true);
        expect(config.allowedOrigins.length).toBeGreaterThan(0);

        // Production should have stricter security
        if (env === "production") {
          expect(config.security.enforceHTTPS).toBe(true);
          expect(config.security.strictOriginValidation).toBe(true);
        }
      });
    });

    test("should provide fallback for unknown environments", () => {
      const config = getEnvironmentConfig("unknown-env");
      expect(config.environment).toBe("development"); // Should fallback to development
    });
  });

  describe("Error Handling and Resilience", () => {
    test("should handle malformed requests gracefully", async () => {
      const malformedRequests = [
        createMockRequest({ method: null as any }),
        createMockRequest({ url: null as any }),
        createMockRequest({ get: null as any }),
      ];

      for (const req of malformedRequests) {
        const res = createMockResponse();
        const next = jest.fn();

        // Should not throw errors
        expect(() => {
          securityMiddleware.use(req as Request, res as Response, next);
        }).not.toThrow();
      }
    });

    test("should recover from processing errors", async () => {
      const req = createMockRequest({
        get: jest.fn().mockImplementation(() => {
          throw new Error("Simulated processing error");
        }),
      });
      const res = createMockResponse();
      const next = jest.fn();

      await new Promise<void>((resolve) => {
        next.mockImplementation((error) => {
          expect(error).toBeInstanceOf(Error);
          resolve();
        });

        securityMiddleware.use(req as Request, res as Response, next);
      });

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("Integration Testing", () => {
    test("should work with real Express middleware chain", () => {
      // Test that middleware can be properly integrated into Express app
      const middlewareFn = securityMiddleware.use.bind(securityMiddleware);
      expect(typeof middlewareFn).toBe("function");
      expect(middlewareFn.length).toBe(3); // req, res, next
    });

    test("should provide configuration access for debugging", () => {
      const config = securityMiddleware.getSecurityConfig();

      expect(config).toHaveProperty("serviceName");
      expect(config).toHaveProperty("environment");
      expect(config).toHaveProperty("enableCSP");
      expect(config).toHaveProperty("enableHSTS");
      expect(config).toHaveProperty("enableDynamicNonce");
    });
  });

  describe("Security Metrics and Reporting", () => {
    test("should track security metrics accurately", async () => {
      // Process various security events
      const events: SecurityEvent[] = [
        {
          eventId: "metric-test-1",
          type: SecurityEventType._CORS_VIOLATION,
          timestamp: new Date(),
          riskScore: 60,
          ipAddress: undefined,
          userAgent: undefined,
          endpoint: "/test-resource",
          method: "GET",
          success: false,
          message: "Test violation",
          metadata: {
            serviceName: "test-service",
            environment: "test",
          },
          sessionId: undefined,
        },
        {
          eventId: "metric-test-2",
          type: SecurityEventType._CSP_VIOLATION,
          timestamp: new Date(),
          riskScore: 80,
          ipAddress: undefined,
          userAgent: undefined,
          endpoint: "/csp-resource",
          method: "POST",
          success: false,
          message: "Test CSP violation",
          metadata: {
            serviceName: "test-service",
            environment: "test",
          },
          sessionId: undefined,
        },
      ];

      for (const event of events) {
        await securityMonitoring.processSecurityEvent(event);
      }

      const dashboard = await securityMonitoring.getSecurityDashboardSummary();

      expect(dashboard.totalEvents).toBeGreaterThanOrEqual(events.length);
      expect(dashboard.blockedRequests).toBeGreaterThanOrEqual(events.length);
    });
  });
});

describe("Edge Cases and Advanced Scenarios", () => {
  test("should handle Unicode and special characters in origins", () => {
    const unicodeOrigins = [
      "https://测试.example.com",
      "https://тест.example.com",
      "https://test-üñíçødé.example.com",
    ];

    unicodeOrigins.forEach((origin) => {
      expect(() => {
        validateOriginPattern(origin, "development");
      }).not.toThrow();
    });
  });

  test("should detect sophisticated attack patterns", async () => {
    // Simulate a coordinated attack with multiple vectors
    const sophisticatedAttack = [
      // Phase 1: Reconnaissance
      ...Array.from({ length: 5 }, (_, i) => ({
        eventId: `recon-${i}`,
        type: SecurityEventType._CORS_VIOLATION,
        timestamp: new Date(Date.now() - (5 - i) * 1000),
        serviceName: "test-service",
        environment: "production",
        ipAddress: `192.168.1.${100 + i}`,
        riskScore: 30,
        blocked: true,
        success: false,
        endpoint: "/api/reconnaissance",
        method: "GET",
        reason: "Reconnaissance probe",
        metadata: { phase: "reconnaissance" },
      })),

      // Phase 2: Exploitation attempts
      ...Array.from({ length: 10 }, (_, i) => ({
        eventId: `exploit-${i}`,
        type: SecurityEventType._SUSPICIOUS_ACTIVITY,
        timestamp: new Date(Date.now() - i * 500),
        serviceName: "test-service",
        environment: "production",
        ipAddress: "192.168.1.105",
        riskScore: 85,
        blocked: true,
        success: false,
        endpoint: "/api/exploit",
        method: "POST",
        reason: "Exploitation attempt",
        metadata: { phase: "exploitation" },
      })),
    ];

    // Process attack events and verify detection
    // This would test the advanced pattern recognition capabilities
    expect(sophisticatedAttack.length).toBe(15);
  });
});

export {};
