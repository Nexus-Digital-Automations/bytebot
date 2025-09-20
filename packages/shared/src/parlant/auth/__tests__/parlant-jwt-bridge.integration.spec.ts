/**
 * PARLANT JWT Bridge Service - Comprehensive Integration Tests
 *
 * Enterprise-grade integration test suite for the PARLANT JWT Bridge Service
 * testing complete authentication bridge workflow, token exchange, security
 * validation, performance benchmarking, and error handling scenarios.
 *
 * Test Coverage:
 * - Token exchange workflow testing (AIgent ↔ Parlant)
 * - Bi-directional token validation
 * - Risk assessment and security level validation
 * - Conversational validation simulation
 * - Performance testing (sub-1000ms target)
 * - Error handling and fallback scenarios
 * - Cache behavior testing
 * - Authentication bridge testing with real JWT tokens
 * - Security validation for all security levels (MINIMAL, LOW, MODERATE, HIGH, CRITICAL)
 *
 * @module ParlantJwtBridgeIntegrationSpec
 * @version 1.0.0
 * @author PARLANT Integration Test Specialist
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  ParlantJWTBridgeService,
  ParlantContext,
  RiskAssessment,
  JWTBridgeMetrics,
} from "../parlant-jwt-bridge.service";
import * as jwt from "jsonwebtoken";
import Redis from "ioredis";

// Mock Redis for integration tests
jest.mock("ioredis");
const MockedRedis = Redis as jest.MockedClass<typeof Redis>;

describe("ParlantJWTBridgeService Integration Tests", () => {
  let service: ParlantJWTBridgeService;
  let jwtService: JwtService;
  let module: TestingModule;
  let mockRedisInstance: jest.Mocked<Redis>;

  // Test configuration
  const testConfig = {
    JWT_SECRET: "parlant-integration-test-secret-key-2024",
    JWT_REFRESH_SECRET: "parlant-integration-test-refresh-secret-2024",
    REDIS_HOST: "localhost",
    REDIS_PORT: 6379,
    PARLANT_API_URL: "http://localhost:8000",
    PARLANT_API_KEY: "parlant-integration-test-api-key",
  };

  // Test data constants
  const mockUserId = "parlant-integration-user-123";
  const mockEmail = "parlant.integration@test.com";
  const mockUsername = "parlantintegrationuser";
  const mockConversationId = "conv-integration-456";
  const mockSessionId = "session-integration-789";

  // Performance tracking
  let performanceMetrics: {
    tokenExchangeTimes: number[];
    validationTimes: number[];
    conversationalValidationTimes: number[];
  };

  beforeEach(async () => {
    // Reset performance metrics
    performanceMetrics = {
      tokenExchangeTimes: [],
      validationTimes: [],
      conversationalValidationTimes: [],
    };

    // Setup Redis mock with comprehensive interface
    mockRedisInstance = {
      connect: jest.fn().mockResolvedValue("OK"),
      quit: jest.fn().mockResolvedValue("OK"),
      setex: jest.fn().mockResolvedValue("OK"),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      flushall: jest.fn().mockResolvedValue("OK"),
      ping: jest.fn().mockResolvedValue("PONG"),
      info: jest.fn().mockResolvedValue("redis_version:6.2.0"),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      status: "ready",
    } as any;

    MockedRedis.mockImplementation(() => mockRedisInstance);

    module = await Test.createTestingModule({
      providers: [
        ParlantJWTBridgeService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn((payload: any, options?: any) => {
              return jwt.sign(
                payload,
                testConfig.JWT_SECRET,
                options || { expiresIn: "1h" },
              );
            }),
            verify: jest.fn((token: string) => {
              return jwt.verify(token, testConfig.JWT_SECRET);
            }),
            decode: jest.fn((token: string) => {
              return jwt.decode(token);
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              switch (key) {
                case "JWT_SECRET":
                  return testConfig.JWT_SECRET;
                case "JWT_REFRESH_SECRET":
                  return testConfig.JWT_REFRESH_SECRET;
                case "redis":
                  return {
                    host: testConfig.REDIS_HOST,
                    port: testConfig.REDIS_PORT,
                    password: undefined,
                    db: 0,
                  };
                case "parlant.apiUrl":
                  return testConfig.PARLANT_API_URL;
                case "parlant.apiKey":
                  return testConfig.PARLANT_API_KEY;
                default:
                  return defaultValue;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ParlantJWTBridgeService>(ParlantJWTBridgeService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe("Service Initialization and Health Checks", () => {
    it("should initialize service with correct configuration", async () => {
      expect(service).toBeDefined();
      expect(jwtService).toBeDefined();
    });

    it("should pass health check with healthy status", async () => {
      const healthResult = await service.healthCheck();

      expect(healthResult.status).toBe("healthy");
      expect(healthResult.metrics).toBeDefined();
      expect(typeof healthResult.metrics.tokenExchangeLatency).toBe("number");
      expect(typeof healthResult.metrics.validationSuccess).toBe("number");
      expect(typeof healthResult.metrics.validationFailures).toBe("number");
    });

    it("should return performance metrics", () => {
      const metrics = service.getPerformanceMetrics();

      expect(metrics).toHaveProperty("tokenExchangeLatency");
      expect(metrics).toHaveProperty("validationSuccess");
      expect(metrics).toHaveProperty("validationFailures");
      expect(metrics).toHaveProperty("cacheHitRate");
      expect(metrics).toHaveProperty("conversationalValidationTime");
    });
  });

  describe("Token Exchange Workflow Testing (AIgent → Parlant)", () => {
    it("should successfully exchange AIgent token to Parlant token", async () => {
      const startTime = Date.now();

      // Create valid AIgent token
      const aigentToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          role: "user",
          permissions: ["read", "write"],
          sessionId: mockSessionId,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          iss: "aigent-auth-service",
          aud: "bytebot-api",
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const parlantContext: ParlantContext = {
        conversationId: mockConversationId,
        sessionId: mockSessionId,
        userId: mockUserId,
        securityLevel: "MODERATE",
        timestamp: new Date(),
        metadata: {
          testCase: "token-exchange-basic",
          environment: "integration-test",
        },
      };

      const result = await service.exchangeTokens(aigentToken, parlantContext);

      const exchangeTime = Date.now() - startTime;
      performanceMetrics.tokenExchangeTimes.push(exchangeTime);

      // Verify successful exchange
      expect(result.parlantToken).toBeDefined();
      expect(result.sessionData).toBeDefined();
      expect(result.metrics).toBeDefined();

      // Verify token structure
      const decodedParlantToken = jwt.decode(result.parlantToken) as any;
      expect(decodedParlantToken.userId).toBe(mockUserId);
      expect(decodedParlantToken.conversationId).toBe(mockConversationId);
      expect(decodedParlantToken.sessionId).toBe(mockSessionId);
      expect(decodedParlantToken.securityLevel).toBe("MODERATE");
      expect(decodedParlantToken.iss).toBe("aigent-parlant-bridge");
      expect(decodedParlantToken.aud).toBe("parlant-service");

      // Verify session data
      expect(result.sessionData.sessionId).toBe(mockSessionId);
      expect(result.sessionData.conversationId).toBe(mockConversationId);
      expect(result.sessionData.userId).toBe(mockUserId);
      expect(result.sessionData.role).toBe("user");
      expect(result.sessionData.securityLevel).toBe("MODERATE");

      // Verify performance metrics
      expect(result.metrics.tokenExchangeLatency).toBeGreaterThan(0);
      expect(result.metrics.validationSuccess).toBeGreaterThanOrEqual(1);

      // Performance assertion - should complete within 1000ms
      expect(exchangeTime).toBeLessThan(1000);
    });

    it("should handle different user roles in token exchange", async () => {
      const roles = ["user", "admin", "system", "moderator"];
      const results = [];

      for (const role of roles) {
        const aigentToken = jwt.sign(
          {
            sub: `${mockUserId}-${role}`,
            email: `${role}@test.com`,
            username: `${role}user`,
            role,
            permissions: role === "admin" ? ["*"] : ["read"],
            sessionId: `${mockSessionId}-${role}`,
          },
          testConfig.JWT_SECRET,
          { expiresIn: "1h" },
        );

        const parlantContext: ParlantContext = {
          conversationId: `${mockConversationId}-${role}`,
          sessionId: `${mockSessionId}-${role}`,
          userId: `${mockUserId}-${role}`,
          securityLevel: role === "admin" ? "CRITICAL" : "LOW",
          timestamp: new Date(),
        };

        const result = await service.exchangeTokens(
          aigentToken,
          parlantContext,
        );
        results.push({ role, result });

        expect(result.parlantToken).toBeDefined();
        expect(result.sessionData.role).toBe(role);
      }

      // Verify all roles were processed successfully
      expect(results).toHaveLength(roles.length);
      results.forEach(({ role, result }) => {
        expect(result.sessionData.role).toBe(role);
      });
    });

    it("should preserve user permissions during token exchange", async () => {
      const permissions = ["read", "write", "admin", "execute"];

      const aigentToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          role: "developer",
          permissions,
          sessionId: mockSessionId,
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const parlantContext: ParlantContext = {
        conversationId: mockConversationId,
        sessionId: mockSessionId,
        userId: mockUserId,
        securityLevel: "MODERATE",
        timestamp: new Date(),
      };

      const result = await service.exchangeTokens(aigentToken, parlantContext);

      expect(result.sessionData.permissions).toEqual(permissions);

      const decodedToken = jwt.decode(result.parlantToken) as any;
      expect(decodedToken.permissions).toEqual(permissions);
    });
  });

  describe("Bi-directional Token Validation", () => {
    it("should validate AIgent tokens correctly", async () => {
      const validToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          role: "user",
          permissions: ["read"],
          sessionId: mockSessionId,
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      // Use private method through service instance
      const validateMethod = (service as any).validateAIgentToken.bind(service);
      const payload = await validateMethod(validToken);

      expect(payload.sub).toBe(mockUserId);
      expect(payload.email).toBe(mockEmail);
      expect(payload.username).toBe(mockUsername);
      expect(payload.role).toBe("user");
    });

    it("should reject expired tokens", async () => {
      const expiredToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          role: "user",
          permissions: ["read"],
          sessionId: mockSessionId,
        },
        testConfig.JWT_SECRET,
        { expiresIn: "-1h" }, // Expired 1 hour ago
      );

      const validateMethod = (service as any).validateAIgentToken.bind(service);

      await expect(validateMethod(expiredToken)).rejects.toThrow(
        "Invalid AIgent token",
      );
    });

    it("should reject tokens with invalid signature", async () => {
      const invalidToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          role: "user",
          permissions: ["read"],
          sessionId: mockSessionId,
        },
        "wrong-secret", // Wrong secret
        { expiresIn: "1h" },
      );

      const validateMethod = (service as any).validateAIgentToken.bind(service);

      await expect(validateMethod(invalidToken)).rejects.toThrow(
        "Invalid AIgent token",
      );
    });

    it("should validate token format and structure", async () => {
      const malformedTokens = [
        "not.a.jwt",
        "invalid",
        "",
        null,
        undefined,
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature",
      ];

      const validateMethod = (service as any).validateAIgentToken.bind(service);

      for (const token of malformedTokens) {
        await expect(validateMethod(token)).rejects.toThrow();
      }
    });
  });

  describe("Risk Assessment and Security Level Validation", () => {
    it("should assess LOW risk for standard users during business hours", async () => {
      // Mock business hours (9 AM)
      const businessHourDate = new Date();
      businessHourDate.setHours(9, 0, 0, 0);
      jest
        .spyOn(global, "Date")
        .mockImplementation(() => businessHourDate as any);

      const payload = {
        sub: mockUserId,
        role: "user",
        permissions: ["read"],
      };

      const context: ParlantContext = {
        conversationId: mockConversationId,
        sessionId: mockSessionId,
        userId: mockUserId,
        securityLevel: "LOW",
        timestamp: businessHourDate,
      };

      const assessMethod = (service as any).assessTokenRisk.bind(service);
      const riskAssessment: RiskAssessment = await assessMethod(
        payload,
        context,
      );

      expect(riskAssessment.riskLevel).toBe("LOW");
      expect(riskAssessment.requiresConversation).toBe(false);
      expect(riskAssessment.confidence).toBeGreaterThan(0.5);
      expect(Array.isArray(riskAssessment.factors)).toBe(true);

      (global.Date as any).mockRestore();
    });

    it("should assess HIGH risk for admin users", async () => {
      const payload = {
        sub: mockUserId,
        role: "admin",
        permissions: ["*"],
      };

      const context: ParlantContext = {
        conversationId: mockConversationId,
        sessionId: mockSessionId,
        userId: mockUserId,
        securityLevel: "MODERATE",
        timestamp: new Date(),
      };

      const assessMethod = (service as any).assessTokenRisk.bind(service);
      const riskAssessment: RiskAssessment = await assessMethod(
        payload,
        context,
      );

      expect(riskAssessment.riskLevel).toBe("HIGH");
      expect(riskAssessment.requiresConversation).toBe(true);
      expect(riskAssessment.factors).toContain(
        "Administrative privileges detected",
      );
    });

    it("should assess CRITICAL risk for critical security level requests", async () => {
      const payload = {
        sub: mockUserId,
        role: "user",
        permissions: ["read"],
      };

      const context: ParlantContext = {
        conversationId: mockConversationId,
        sessionId: mockSessionId,
        userId: mockUserId,
        securityLevel: "CRITICAL",
        timestamp: new Date(),
      };

      const assessMethod = (service as any).assessTokenRisk.bind(service);
      const riskAssessment: RiskAssessment = await assessMethod(
        payload,
        context,
      );

      expect(riskAssessment.riskLevel).toBe("CRITICAL");
      expect(riskAssessment.requiresConversation).toBe(true);
      expect(riskAssessment.factors).toContain(
        "Critical security level requested",
      );
    });

    it("should assess MEDIUM risk for off-hours access", async () => {
      // Mock off-hours (2 AM)
      const offHourDate = new Date();
      offHourDate.setHours(2, 0, 0, 0);
      jest.spyOn(global, "Date").mockImplementation(() => offHourDate as any);

      const payload = {
        sub: mockUserId,
        role: "user",
        permissions: ["read"],
      };

      const context: ParlantContext = {
        conversationId: mockConversationId,
        sessionId: mockSessionId,
        userId: mockUserId,
        securityLevel: "LOW",
        timestamp: offHourDate,
      };

      const assessMethod = (service as any).assessTokenRisk.bind(service);
      const riskAssessment: RiskAssessment = await assessMethod(
        payload,
        context,
      );

      expect(riskAssessment.riskLevel).toBe("MEDIUM");
      expect(riskAssessment.factors).toContain("Off-hours access detected");

      (global.Date as any).mockRestore();
    });

    it("should apply security validation based on risk level", async () => {
      const riskAssessment: RiskAssessment = {
        riskLevel: "HIGH",
        requiresConversation: true,
        confidence: 0.9,
        factors: ["Administrative privileges", "High-risk operation"],
      };

      const context: ParlantContext = {
        conversationId: mockConversationId,
        sessionId: mockSessionId,
        userId: mockUserId,
        securityLevel: "HIGH",
        timestamp: new Date(),
      };

      const applySecurityMethod = (service as any).applySecurityValidation.bind(
        service,
      );

      // Should not throw for valid high-risk scenario
      await expect(
        applySecurityMethod(riskAssessment, context),
      ).resolves.not.toThrow();
    });
  });

  describe("Security Level Configuration Testing", () => {
    const securityLevels = [
      "MINIMAL",
      "LOW",
      "MODERATE",
      "HIGH",
      "CRITICAL",
    ] as const;

    it.each(securityLevels)(
      "should handle %s security level correctly",
      async (securityLevel) => {
        const aigentToken = jwt.sign(
          {
            sub: mockUserId,
            email: mockEmail,
            username: mockUsername,
            role: securityLevel === "CRITICAL" ? "admin" : "user",
            permissions: securityLevel === "CRITICAL" ? ["*"] : ["read"],
            sessionId: mockSessionId,
          },
          testConfig.JWT_SECRET,
          { expiresIn: "1h" },
        );

        const parlantContext: ParlantContext = {
          conversationId: mockConversationId,
          sessionId: mockSessionId,
          userId: mockUserId,
          securityLevel,
          timestamp: new Date(),
          metadata: { testSecurityLevel: securityLevel },
        };

        const result = await service.exchangeTokens(
          aigentToken,
          parlantContext,
        );

        expect(result.parlantToken).toBeDefined();
        expect(result.sessionData.securityLevel).toBe(securityLevel);

        const decodedToken = jwt.decode(result.parlantToken) as any;
        expect(decodedToken.securityLevel).toBe(securityLevel);
      },
    );

    it("should enforce MFA requirements for HIGH and CRITICAL security levels", async () => {
      const securityConfig = (service as any).securityConfig;

      expect(securityConfig.securityLevels.HIGH.mfaRequired).toBe(true);
      expect(securityConfig.securityLevels.CRITICAL.mfaRequired).toBe(
        "hardware-token",
      );
      expect(securityConfig.securityLevels.MINIMAL.mfaRequired).toBe(false);
      expect(securityConfig.securityLevels.LOW.mfaRequired).toBe(false);
    });

    it("should enforce conversational validation requirements", async () => {
      const securityConfig = (service as any).securityConfig;

      expect(securityConfig.securityLevels.MINIMAL.conversationValidation).toBe(
        false,
      );
      expect(securityConfig.securityLevels.LOW.conversationValidation).toBe(
        "optional",
      );
      expect(
        securityConfig.securityLevels.MODERATE.conversationValidation,
      ).toBe("recommended");
      expect(securityConfig.securityLevels.HIGH.conversationValidation).toBe(
        "required",
      );
      expect(
        securityConfig.securityLevels.CRITICAL.conversationValidation,
      ).toBe("dual-approval");
    });
  });

  describe("Conversational Validation Simulation", () => {
    it("should simulate conversational validation for high-risk operations", async () => {
      const startTime = Date.now();

      const context: ParlantContext = {
        conversationId: mockConversationId,
        sessionId: mockSessionId,
        userId: mockUserId,
        securityLevel: "HIGH",
        timestamp: new Date(),
        metadata: { requiresConversation: true },
      };

      const simulateMethod = (
        service as any
      ).simulateConversationalValidation.bind(service);
      await simulateMethod(context);

      const validationTime = Date.now() - startTime;
      performanceMetrics.conversationalValidationTimes.push(validationTime);

      // Verify that validation completed
      expect(validationTime).toBeGreaterThan(0);
      expect(validationTime).toBeLessThan(500); // Should be fast simulation

      // Check if metrics were updated
      const metrics = service.getPerformanceMetrics();
      expect(metrics.conversationalValidationTime).toBeGreaterThan(0);
    });

    it("should handle different conversational validation types", async () => {
      const validationTypes = [
        { securityLevel: "LOW" as const, expected: "optional" },
        { securityLevel: "MODERATE" as const, expected: "recommended" },
        { securityLevel: "HIGH" as const, expected: "required" },
        { securityLevel: "CRITICAL" as const, expected: "dual-approval" },
      ];

      for (const { securityLevel, expected } of validationTypes) {
        const context: ParlantContext = {
          conversationId: `${mockConversationId}-${securityLevel}`,
          sessionId: `${mockSessionId}-${securityLevel}`,
          userId: mockUserId,
          securityLevel,
          timestamp: new Date(),
        };

        const securityConfig = (service as any).securityConfig;
        const levelConfig = securityConfig.securityLevels[securityLevel];

        expect(levelConfig.conversationValidation).toBe(expected);
      }
    });

    it("should track conversational validation performance", async () => {
      const iterations = 5;
      const validationTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        const context: ParlantContext = {
          conversationId: `${mockConversationId}-perf-${i}`,
          sessionId: `${mockSessionId}-perf-${i}`,
          userId: mockUserId,
          securityLevel: "HIGH",
          timestamp: new Date(),
        };

        const simulateMethod = (
          service as any
        ).simulateConversationalValidation.bind(service);
        await simulateMethod(context);

        const validationTime = Date.now() - startTime;
        validationTimes.push(validationTime);
      }

      // Calculate average validation time
      const avgValidationTime =
        validationTimes.reduce((a, b) => a + b, 0) / validationTimes.length;

      expect(avgValidationTime).toBeLessThan(100); // Should be very fast for simulation
      expect(validationTimes.every((time) => time < 200)).toBe(true);
    });
  });

  describe("Performance Testing with Sub-1000ms Target", () => {
    it("should complete token exchange within 1000ms performance target", async () => {
      const iterations = 10;
      const performanceTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        const aigentToken = jwt.sign(
          {
            sub: `${mockUserId}-perf-${i}`,
            email: `perf${i}@test.com`,
            username: `perfuser${i}`,
            role: "user",
            permissions: ["read"],
            sessionId: `${mockSessionId}-perf-${i}`,
          },
          testConfig.JWT_SECRET,
          { expiresIn: "1h" },
        );

        const parlantContext: ParlantContext = {
          conversationId: `${mockConversationId}-perf-${i}`,
          sessionId: `${mockSessionId}-perf-${i}`,
          userId: `${mockUserId}-perf-${i}`,
          securityLevel: "LOW", // Fast path for performance testing
          timestamp: new Date(),
        };

        await service.exchangeTokens(aigentToken, parlantContext);

        const exchangeTime = Date.now() - startTime;
        performanceTimes.push(exchangeTime);
      }

      // Performance assertions
      const avgTime =
        performanceTimes.reduce((a, b) => a + b, 0) / performanceTimes.length;
      const maxTime = Math.max(...performanceTimes);
      const minTime = Math.min(...performanceTimes);

      expect(avgTime).toBeLessThan(1000); // Average under 1000ms
      expect(maxTime).toBeLessThan(1500); // Max under 1500ms (allowing some variance)
      expect(minTime).toBeGreaterThan(0); // Sanity check

      // 95th percentile should be under 1000ms
      const sortedTimes = performanceTimes.sort((a, b) => a - b);
      const percentile95Index = Math.floor(sortedTimes.length * 0.95);
      const percentile95 = sortedTimes[percentile95Index];

      expect(percentile95).toBeLessThan(1000);
    });

    it("should maintain performance under concurrent load", async () => {
      const concurrency = 5;
      const promises: Promise<any>[] = [];

      const startTime = Date.now();

      for (let i = 0; i < concurrency; i++) {
        const aigentToken = jwt.sign(
          {
            sub: `${mockUserId}-concurrent-${i}`,
            email: `concurrent${i}@test.com`,
            username: `concurrentuser${i}`,
            role: "user",
            permissions: ["read"],
            sessionId: `${mockSessionId}-concurrent-${i}`,
          },
          testConfig.JWT_SECRET,
          { expiresIn: "1h" },
        );

        const parlantContext: ParlantContext = {
          conversationId: `${mockConversationId}-concurrent-${i}`,
          sessionId: `${mockSessionId}-concurrent-${i}`,
          userId: `${mockUserId}-concurrent-${i}`,
          securityLevel: "LOW",
          timestamp: new Date(),
        };

        promises.push(service.exchangeTokens(aigentToken, parlantContext));
      }

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All operations should complete successfully
      expect(results).toHaveLength(concurrency);
      results.forEach((result, index) => {
        expect(result.parlantToken).toBeDefined();
        expect(result.sessionData).toBeDefined();
      });

      // Total time for concurrent operations should be reasonable
      expect(totalTime).toBeLessThan(2000); // 2 seconds for 5 concurrent operations
    });

    it("should optimize performance for repeated operations", async () => {
      const sameUser = `${mockUserId}-optimization`;
      const iterations = 3;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        const aigentToken = jwt.sign(
          {
            sub: sameUser,
            email: "optimization@test.com",
            username: "optimizationuser",
            role: "user",
            permissions: ["read"],
            sessionId: `${mockSessionId}-opt-${i}`,
          },
          testConfig.JWT_SECRET,
          { expiresIn: "1h" },
        );

        const parlantContext: ParlantContext = {
          conversationId: `${mockConversationId}-opt-${i}`,
          sessionId: `${mockSessionId}-opt-${i}`,
          userId: sameUser,
          securityLevel: "LOW",
          timestamp: new Date(),
        };

        await service.exchangeTokens(aigentToken, parlantContext);

        const exchangeTime = Date.now() - startTime;
        times.push(exchangeTime);
      }

      // Performance should be consistent or improve with repeated operations
      expect(times[1]).toBeLessThanOrEqual(times[0] * 1.2); // Allow 20% variance
      expect(times[2]).toBeLessThanOrEqual(times[0] * 1.2);
    });
  });

  describe("Error Handling and Fallback Scenarios", () => {
    it("should handle invalid JWT token gracefully", async () => {
      const invalidToken = "invalid.jwt.token";

      const parlantContext: ParlantContext = {
        conversationId: mockConversationId,
        sessionId: mockSessionId,
        userId: mockUserId,
        securityLevel: "LOW",
        timestamp: new Date(),
      };

      await expect(
        service.exchangeTokens(invalidToken, parlantContext),
      ).rejects.toThrow("Invalid AIgent token");

      // Verify failure metrics are updated
      const metrics = service.getPerformanceMetrics();
      expect(metrics.validationFailures).toBeGreaterThan(0);
    });

    it("should handle missing required token fields", async () => {
      const incompleteToken = jwt.sign(
        {
          sub: mockUserId,
          // Missing other required fields
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const parlantContext: ParlantContext = {
        conversationId: mockConversationId,
        sessionId: mockSessionId,
        userId: mockUserId,
        securityLevel: "LOW",
        timestamp: new Date(),
      };

      // Should handle gracefully and still create a token with available data
      const result = await service.exchangeTokens(
        incompleteToken,
        parlantContext,
      );

      expect(result.parlantToken).toBeDefined();
      expect(result.sessionData.userId).toBe(mockUserId);
    });

    it("should handle expired tokens appropriately", async () => {
      const expiredToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          role: "user",
          permissions: ["read"],
          sessionId: mockSessionId,
        },
        testConfig.JWT_SECRET,
        { expiresIn: "-1h" }, // Expired
      );

      const parlantContext: ParlantContext = {
        conversationId: mockConversationId,
        sessionId: mockSessionId,
        userId: mockUserId,
        securityLevel: "LOW",
        timestamp: new Date(),
      };

      await expect(
        service.exchangeTokens(expiredToken, parlantContext),
      ).rejects.toThrow("Invalid AIgent token");
    });

    it("should handle malformed Parlant context", async () => {
      const validToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          role: "user",
          permissions: ["read"],
          sessionId: mockSessionId,
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const malformedContext = {
        // Missing required fields
        userId: mockUserId,
      } as any;

      await expect(
        service.exchangeTokens(validToken, malformedContext),
      ).rejects.toThrow();
    });

    it("should provide meaningful error messages", async () => {
      const testCases = [
        {
          token: "not.a.jwt",
          expectedError: /invalid/i,
        },
        {
          token: "",
          expectedError: /invalid/i,
        },
        {
          token: null,
          expectedError: /invalid/i,
        },
      ];

      const parlantContext: ParlantContext = {
        conversationId: mockConversationId,
        sessionId: mockSessionId,
        userId: mockUserId,
        securityLevel: "LOW",
        timestamp: new Date(),
      };

      for (const { token, expectedError } of testCases) {
        await expect(
          service.exchangeTokens(token as any, parlantContext),
        ).rejects.toThrow(expectedError);
      }
    });

    it("should handle system failures gracefully", async () => {
      // Mock JWT service failure
      const originalSign = jwtService.sign;
      jwtService.sign = jest.fn().mockImplementation(() => {
        throw new Error("JWT service unavailable");
      });

      const validToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          role: "user",
          permissions: ["read"],
          sessionId: mockSessionId,
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const parlantContext: ParlantContext = {
        conversationId: mockConversationId,
        sessionId: mockSessionId,
        userId: mockUserId,
        securityLevel: "LOW",
        timestamp: new Date(),
      };

      await expect(
        service.exchangeTokens(validToken, parlantContext),
      ).rejects.toThrow("JWT service unavailable");

      // Restore original implementation
      jwtService.sign = originalSign;
    });
  });

  describe("Cache Behavior Testing", () => {
    it("should handle cache operations efficiently", async () => {
      // Test multiple operations with same user to verify caching behavior
      const sameUserToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          role: "user",
          permissions: ["read"],
          sessionId: mockSessionId,
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const parlantContext: ParlantContext = {
        conversationId: mockConversationId,
        sessionId: mockSessionId,
        userId: mockUserId,
        securityLevel: "LOW",
        timestamp: new Date(),
      };

      // First operation - should be slower (cache miss)
      const startTime1 = Date.now();
      const result1 = await service.exchangeTokens(
        sameUserToken,
        parlantContext,
      );
      const time1 = Date.now() - startTime1;

      // Second operation - should potentially be faster (cache hit)
      const startTime2 = Date.now();
      const result2 = await service.exchangeTokens(
        sameUserToken,
        parlantContext,
      );
      const time2 = Date.now() - startTime2;

      expect(result1.parlantToken).toBeDefined();
      expect(result2.parlantToken).toBeDefined();

      // Both operations should complete successfully
      expect(result1.sessionData.userId).toBe(mockUserId);
      expect(result2.sessionData.userId).toBe(mockUserId);
    });

    it("should handle cache invalidation scenarios", async () => {
      // Test behavior when cache might be invalidated
      const parlantContext: ParlantContext = {
        conversationId: mockConversationId,
        sessionId: mockSessionId,
        userId: mockUserId,
        securityLevel: "LOW",
        timestamp: new Date(),
      };

      // Create different tokens for same user
      const token1 = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          role: "user",
          permissions: ["read"],
          sessionId: `${mockSessionId}-1`,
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const token2 = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          role: "admin", // Different role - should invalidate cache
          permissions: ["read", "write"],
          sessionId: `${mockSessionId}-2`,
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const result1 = await service.exchangeTokens(token1, {
        ...parlantContext,
        sessionId: `${mockSessionId}-1`,
      });
      const result2 = await service.exchangeTokens(token2, {
        ...parlantContext,
        sessionId: `${mockSessionId}-2`,
      });

      expect(result1.sessionData.role).toBe("user");
      expect(result2.sessionData.role).toBe("admin");
    });
  });

  describe("Authentication Bridge Testing with Real JWT Tokens", () => {
    it("should bridge authentication seamlessly between systems", async () => {
      // Create comprehensive real-world token
      const realWorldToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          firstName: "Integration",
          lastName: "User",
          role: "developer",
          permissions: ["read", "write", "execute"],
          sessionId: mockSessionId,
          department: "Engineering",
          team: "Platform",
          mfaVerified: true,
          deviceId: "device-123",
          location: "San Francisco",
          timezone: "America/Los_Angeles",
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          iss: "aigent-auth-service",
          aud: "bytebot-api",
          jti: crypto.randomUUID(),
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const parlantContext: ParlantContext = {
        conversationId: mockConversationId,
        sessionId: mockSessionId,
        userId: mockUserId,
        securityLevel: "MODERATE",
        timestamp: new Date(),
        metadata: {
          integrationTest: true,
          realWorldScenario: true,
          testEnvironment: "integration",
        },
      };

      const result = await service.exchangeTokens(
        realWorldToken,
        parlantContext,
      );

      // Verify comprehensive bridging
      expect(result.parlantToken).toBeDefined();
      expect(result.sessionData).toBeDefined();

      // Decode and verify Parlant token preserves important data
      const decodedParlantToken = jwt.decode(result.parlantToken) as any;
      expect(decodedParlantToken.userId).toBe(mockUserId);
      expect(decodedParlantToken.role).toBe("developer");
      expect(decodedParlantToken.permissions).toEqual([
        "read",
        "write",
        "execute",
      ]);
      expect(decodedParlantToken.conversationId).toBe(mockConversationId);
      expect(decodedParlantToken.sessionId).toBe(mockSessionId);

      // Verify session data preservation
      expect(result.sessionData.userId).toBe(mockUserId);
      expect(result.sessionData.role).toBe("developer");
      expect(result.sessionData.permissions).toEqual([
        "read",
        "write",
        "execute",
      ]);
      expect(result.sessionData.metadata.bridgeVersion).toBe("1.0.0");
      expect(result.sessionData.metadata.parlantIntegration).toBe(true);
    });

    it("should handle complex authentication scenarios", async () => {
      const complexScenarios = [
        {
          name: "Multi-tenant user",
          tokenData: {
            sub: `${mockUserId}-tenant`,
            tenantId: "tenant-123",
            role: "admin",
            permissions: ["tenant:admin", "read", "write"],
          },
          securityLevel: "HIGH" as const,
        },
        {
          name: "Service account",
          tokenData: {
            sub: "service-account-456",
            accountType: "service",
            role: "system",
            permissions: ["system:read", "system:write"],
          },
          securityLevel: "CRITICAL" as const,
        },
        {
          name: "Temporary access",
          tokenData: {
            sub: `${mockUserId}-temp`,
            temporary: true,
            role: "guest",
            permissions: ["read"],
            exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
          },
          securityLevel: "LOW" as const,
        },
      ];

      for (const scenario of complexScenarios) {
        const token = jwt.sign(
          {
            email: "complex@test.com",
            username: "complexuser",
            sessionId: `${mockSessionId}-${scenario.name}`,
            ...scenario.tokenData,
          },
          testConfig.JWT_SECRET,
          { expiresIn: "1h" },
        );

        const parlantContext: ParlantContext = {
          conversationId: `${mockConversationId}-${scenario.name}`,
          sessionId: `${mockSessionId}-${scenario.name}`,
          userId: scenario.tokenData.sub,
          securityLevel: scenario.securityLevel,
          timestamp: new Date(),
          metadata: { scenario: scenario.name },
        };

        const result = await service.exchangeTokens(token, parlantContext);

        expect(result.parlantToken).toBeDefined();
        expect(result.sessionData.userId).toBe(scenario.tokenData.sub);
        expect(result.sessionData.role).toBe(scenario.tokenData.role);
        expect(result.sessionData.permissions).toEqual(
          scenario.tokenData.permissions,
        );
      }
    });
  });

  describe("Comprehensive End-to-End Integration", () => {
    it("should complete full authentication bridge workflow", async () => {
      const workflowId = `workflow-${Date.now()}`;
      const startTime = Date.now();

      // Step 1: Create AIgent authentication token
      const aigentToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          role: "developer",
          permissions: ["read", "write", "execute"],
          sessionId: mockSessionId,
          workflowId,
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      // Step 2: Create Parlant context
      const parlantContext: ParlantContext = {
        conversationId: mockConversationId,
        sessionId: mockSessionId,
        userId: mockUserId,
        securityLevel: "MODERATE",
        timestamp: new Date(),
        metadata: {
          workflowId,
          step: "token-exchange",
        },
      };

      // Step 3: Perform token exchange
      const exchangeResult = await service.exchangeTokens(
        aigentToken,
        parlantContext,
      );

      // Step 4: Validate results
      expect(exchangeResult.parlantToken).toBeDefined();
      expect(exchangeResult.sessionData).toBeDefined();
      expect(exchangeResult.metrics).toBeDefined();

      // Step 5: Verify performance
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(1000);

      // Step 6: Verify token can be decoded and used
      const decodedToken = jwt.decode(exchangeResult.parlantToken) as any;
      expect(decodedToken.userId).toBe(mockUserId);
      expect(decodedToken.conversationId).toBe(mockConversationId);

      // Step 7: Verify session data integrity
      expect(exchangeResult.sessionData.sessionId).toBe(mockSessionId);
      expect(exchangeResult.sessionData.conversationId).toBe(
        mockConversationId,
      );
      expect(exchangeResult.sessionData.userId).toBe(mockUserId);

      // Step 8: Verify metrics tracking
      expect(exchangeResult.metrics.tokenExchangeLatency).toBeGreaterThan(0);
      expect(exchangeResult.metrics.validationSuccess).toBeGreaterThanOrEqual(
        1,
      );
    });

    it("should maintain data consistency across operations", async () => {
      const consistencyTestData = {
        userId: `${mockUserId}-consistency`,
        email: "consistency@test.com",
        username: "consistencyuser",
        role: "analyst",
        permissions: ["read", "analyze"],
        sessionId: `${mockSessionId}-consistency`,
        conversationId: `${mockConversationId}-consistency`,
      };

      const token = jwt.sign(
        {
          sub: consistencyTestData.userId,
          email: consistencyTestData.email,
          username: consistencyTestData.username,
          role: consistencyTestData.role,
          permissions: consistencyTestData.permissions,
          sessionId: consistencyTestData.sessionId,
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const parlantContext: ParlantContext = {
        conversationId: consistencyTestData.conversationId,
        sessionId: consistencyTestData.sessionId,
        userId: consistencyTestData.userId,
        securityLevel: "LOW",
        timestamp: new Date(),
      };

      const result = await service.exchangeTokens(token, parlantContext);

      // Verify all data is consistently preserved
      expect(result.sessionData.userId).toBe(consistencyTestData.userId);
      expect(result.sessionData.role).toBe(consistencyTestData.role);
      expect(result.sessionData.permissions).toEqual(
        consistencyTestData.permissions,
      );

      const decodedToken = jwt.decode(result.parlantToken) as any;
      expect(decodedToken.userId).toBe(consistencyTestData.userId);
      expect(decodedToken.role).toBe(consistencyTestData.role);
      expect(decodedToken.permissions).toEqual(consistencyTestData.permissions);
      expect(decodedToken.conversationId).toBe(
        consistencyTestData.conversationId,
      );
      expect(decodedToken.sessionId).toBe(consistencyTestData.sessionId);
    });
  });

  describe("Performance Summary and Reporting", () => {
    afterAll(() => {
      // Generate performance summary
      if (performanceMetrics.tokenExchangeTimes.length > 0) {
        const avgExchangeTime =
          performanceMetrics.tokenExchangeTimes.reduce((a, b) => a + b, 0) /
          performanceMetrics.tokenExchangeTimes.length;
        const maxExchangeTime = Math.max(
          ...performanceMetrics.tokenExchangeTimes,
        );
        const minExchangeTime = Math.min(
          ...performanceMetrics.tokenExchangeTimes,
        );

        console.log("📊 PARLANT JWT Bridge Performance Summary:");
        console.log(
          `   Token Exchange - Avg: ${avgExchangeTime.toFixed(2)}ms, Max: ${maxExchangeTime}ms, Min: ${minExchangeTime}ms`,
        );
        console.log(
          `   Total Operations: ${performanceMetrics.tokenExchangeTimes.length}`,
        );
        console.log(
          `   Sub-1000ms Target: ${performanceMetrics.tokenExchangeTimes.filter((t) => t < 1000).length}/${performanceMetrics.tokenExchangeTimes.length} (${((performanceMetrics.tokenExchangeTimes.filter((t) => t < 1000).length / performanceMetrics.tokenExchangeTimes.length) * 100).toFixed(1)}%)`,
        );
      }
    });
  });
});
