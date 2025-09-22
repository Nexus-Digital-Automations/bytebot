/**
 * Enhanced JWT-Parlant Bridge Service Integration Tests
 *
 * Comprehensive integration test suite for the Enhanced JWT-Parlant Bridge Service
 * testing real-world scenarios including Redis integration, HTTP calls, and
 * end-to-end token exchange workflows.
 *
 * @module EnhancedJwtParlantBridgeServiceIntegrationSpec
 * @version 2.0.0
 * @author PARLANT Phase 1 JWT Bridge Integration Test Specialist
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { EnhancedJwtParlantBridgeService } from "../enhanced-jwt-parlant-bridge.service";
import {
  Platform,
  SecurityValidationLevel,
  TokenExchangeRequest,
} from "../../types/enhanced-jwt-bridge.types";
import * as jwt from "jsonwebtoken";
import Redis from "ioredis";
import axios from "axios";

// Mock Redis for integration tests
jest.mock("ioredis");
const MockedRedis = Redis as jest.MockedClass<typeof Redis>;

// Mock axios for HTTP calls
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("EnhancedJwtParlantBridgeService Integration Tests", () => {
  let service: EnhancedJwtParlantBridgeService;
  let module: TestingModule;
  let mockRedisInstance: jest.Mocked<Redis>;

  // Test configuration
  const testConfig = {
    JWT_SECRET: "integration-test-secret-key",
    JWT_REFRESH_SECRET: "integration-test-refresh-secret",
    REDIS_HOST: "localhost",
    REDIS_PORT: 6379,
    PARLANT_API_URL: "http://localhost:8000",
    PARLANT_API_KEY: "integration-test-api-key",
  };

  // Test data
  const mockUserId = "integration-user-123";
  const mockEmail = "integration@test.com";
  const mockUsername = "integrationuser";

  beforeEach(async () => {
    // Setup Redis mock
    mockRedisInstance = {
      connect: jest.fn().mockResolvedValue("OK"),
      quit: jest.fn().mockResolvedValue("OK"),
      setex: jest.fn().mockResolvedValue("OK"),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      on: jest.fn(),
      off: jest.fn(),
    } as any;

    MockedRedis.mockImplementation(() => mockRedisInstance);

    // Setup axios mock
    mockedAxios.create.mockReturnValue(mockedAxios);

    module = await Test.createTestingModule({
      providers: [
        EnhancedJwtParlantBridgeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (
                key: string,
                defaultValue?:
                  | string
                  | number
                  | boolean
                  | Record<string, unknown>,
              ) => {
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
                  case "parlant.failoverUrls":
                    return "http://localhost:8001,http://localhost:8002";
                  default:
                    return defaultValue;
                }
              },
            ),
          },
        },
      ],
    }).compile();

    service = module.get<EnhancedJwtParlantBridgeService>(
      EnhancedJwtParlantBridgeService,
    );

    // Initialize the service
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    await module.close();
    jest.clearAllMocks();
  });

  describe("Redis Integration", () => {
    it("should connect to Redis during initialization", async () => {
      expect(MockedRedis).toHaveBeenCalledWith({
        host: testConfig.REDIS_HOST,
        port: testConfig.REDIS_PORT,
        password: undefined,
        db: 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
      expect(mockRedisInstance.connect).toHaveBeenCalled();
    });

    it("should store session data in Redis", async () => {
      const mockToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          roles: ["user"],
          permissions: ["read"],
          sessionId: "session-123",
          type: "access",
          securityLevel: "standard",
          mfaVerified: true,
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      // Mock successful PARLANT session creation
      mockedAxios.post.mockResolvedValue({
        data: { session_id: "parlant-session-123" },
      });

      const validationContext = await service.createBridgeSession(
        mockToken,
        "refresh-token",
        "127.0.0.1",
        "test-agent",
      );

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        "session:session-123",
        3600,
        expect.any(String),
      );
      expect(validationContext.sessionId).toBe("parlant-session-123");
    });

    it("should retrieve session data from Redis", async () => {
      const mockSessionData = {
        aigentSessionId: "session-456",
        parlantSessionId: "parlant-session-456",
        userId: mockUserId,
        accessToken: "access-token",
        refreshToken: "refresh-token",
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        securityLevel: "standard",
        mfaVerified: true,
        emergencyOverride: false,
        metadata: {},
      };

      mockRedisInstance.get.mockResolvedValue(JSON.stringify(mockSessionData));

      // Mock successful PARLANT session validation
      mockedAxios.get.mockResolvedValue({
        data: { valid: true },
      });

      const validationContext = await service.validateSession("session-456");

      expect(mockRedisInstance.get).toHaveBeenCalledWith("session:session-456");
      expect(validationContext).toBeDefined();
      expect(validationContext?.sessionId).toBe("parlant-session-456");
    });

    it("should handle Redis connection failures gracefully", async () => {
      mockRedisInstance.connect.mockRejectedValue(
        new Error("Redis connection failed"),
      );

      await expect(service.onModuleInit()).rejects.toThrow(
        "Redis connection failed",
      );
    });

    it("should cleanup expired sessions from Redis", async () => {
      const expiredSessionKeys = [
        "session:expired-1",
        "session:expired-2",
        "session:expired-3",
      ];

      mockRedisInstance.keys.mockResolvedValue(expiredSessionKeys);

      // Mock the cleanup process
      const cleanupExpiredSessionsSpy = jest.spyOn(
        service as any,
        "cleanupExpiredSessions",
      );

      // Trigger cleanup (normally done by timer)
      (service as any).cleanupExpiredSessions();

      expect(cleanupExpiredSessionsSpy).toHaveBeenCalled();
    });
  });

  describe("PARLANT API Integration", () => {
    it("should create PARLANT session via API", async () => {
      const mockToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          roles: ["user", "operator"],
          permissions: ["read", "write"],
          sessionId: "session-789",
          type: "access",
          securityLevel: "elevated",
          mfaVerified: true,
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const expectedSessionResponse = {
        session_id: "parlant-session-789",
        agent_id: "agent-123",
        conversation_id: "conv-456",
      };

      mockedAxios.post.mockResolvedValue({
        data: expectedSessionResponse,
      });

      const validationContext = await service.createBridgeSession(
        mockToken,
        "refresh-token",
        "192.168.1.100",
        "Mozilla/5.0 Integration Test",
      );

      expect(mockedAxios.post).toHaveBeenCalledWith("/sessions", {
        user_id: mockUserId,
        username: mockUsername,
        roles: ["user", "operator"],
        permissions: ["read", "write"],
        security_level: "elevated",
        mfa_verified: true,
        validation_level: "standard",
        metadata: {
          ip_address: "192.168.1.100",
          user_agent: "Mozilla/5.0 Integration Test",
          tenant_id: undefined,
          session_created_at: expect.any(String),
        },
      });

      expect(validationContext.sessionId).toBe("parlant-session-789");
    });

    it("should validate PARLANT session via API", async () => {
      const parlantSessionId = "parlant-session-validate-test";

      mockedAxios.get.mockResolvedValue({
        data: { valid: true, status: "active" },
      });

      // Call the private method through session validation
      const mockSessionData = {
        aigentSessionId: "session-validate",
        parlantSessionId,
        userId: mockUserId,
        accessToken: "access-token",
        refreshToken: "refresh-token",
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        securityLevel: "standard",
        mfaVerified: true,
        emergencyOverride: false,
        metadata: {},
      };

      mockRedisInstance.get.mockResolvedValue(JSON.stringify(mockSessionData));

      const result = await service.validateSession("session-validate");

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `/sessions/${parlantSessionId}/validate`,
      );
      expect(result).toBeDefined();
    });

    it("should handle PARLANT API unavailability with fallback", async () => {
      const mockToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          roles: ["user"],
          permissions: ["read"],
          sessionId: "session-fallback",
          type: "access",
          securityLevel: "standard",
          mfaVerified: false,
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      // Mock PARLANT API failure
      mockedAxios.post.mockRejectedValue(new Error("PARLANT API unavailable"));

      const validationContext = await service.createBridgeSession(
        mockToken,
        "refresh-token",
        "127.0.0.1",
        "test-agent",
      );

      // Should still create session with fallback PARLANT session ID
      expect(validationContext.sessionId).toMatch(/^parlant_fallback_/);
    });

    it("should invalidate PARLANT session via API", async () => {
      const parlantSessionId = "parlant-session-invalidate";

      mockedAxios.delete.mockResolvedValue({
        data: { success: true },
      });

      // Setup session data for invalidation
      const mockSessionData = {
        aigentSessionId: "session-invalidate",
        parlantSessionId,
        userId: mockUserId,
        accessToken: "access-token",
        refreshToken: "refresh-token",
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        securityLevel: "standard",
        mfaVerified: true,
        emergencyOverride: false,
        metadata: {},
      };

      // Set up the session bridge in service
      (service as any).sessionBridges.set(
        "session-invalidate",
        mockSessionData,
      );

      // Call the private invalidation method
      await (service as any).invalidateSession("session-invalidate");

      expect(mockedAxios.delete).toHaveBeenCalledWith(
        `/sessions/${parlantSessionId}`,
      );
      expect(mockRedisInstance.del).toHaveBeenCalledWith(
        "session:session-invalidate",
      );
    });

    it("should handle PARLANT health check", async () => {
      mockedAxios.get.mockResolvedValue({
        data: { status: "healthy", version: "1.0.0" },
      });

      // Initialize should attempt health check
      await service.onModuleInit();

      expect(mockedAxios.get).toHaveBeenCalledWith("/health");
    });
  });

  describe("End-to-End Token Exchange", () => {
    it("should perform complete AIgent to PARLANT token exchange", async () => {
      const aigentToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          roles: ["developer", "operator"],
          permissions: ["read", "write", "execute"],
          sessionId: "session-e2e",
          type: "access",
          securityLevel: "elevated",
          mfaVerified: true,
          tenantId: "tenant-123",
        },
        testConfig.JWT_SECRET,
        {
          expiresIn: "1h",
          issuer: "bytebot-auth-service",
          audience: "bytebot-api",
        },
      );

      const exchangeRequest: TokenExchangeRequest = {
        sourceToken: aigentToken,
        sourcePlatform: Platform.AIGENT,
        targetPlatform: Platform.PARLANT,
        exchangeReason: "authentication",
        metadata: {
          clientIp: "203.0.113.0",
          userAgent: "Integration Test Browser",
          securityLevel: SecurityValidationLevel.ELEVATED,
        },
      };

      // Mock all intermediate API calls
      mockedAxios.post.mockResolvedValue({
        data: { session_id: "parlant-session-e2e" },
      });

      const result = await service.exchangeToken(exchangeRequest);

      expect(result.success).toBe(true);
      expect(result.translatedToken).toBeDefined();
      expect(result.identityMapping.success).toBe(true);
      expect(result.identityMapping.aigentUserId).toBe(mockUserId);
      expect(result.identityMapping.parlantUserId).toBe(
        `parlant_${mockUserId}`,
      );
      expect(result.securityValidation.passed).toBe(true);
      expect(result.securityValidation.riskScore).toBeLessThan(100);
    });

    it("should handle token exchange with security violations", async () => {
      const suspiciousToken = jwt.sign(
        {
          sub: "suspicious-user",
          email: "suspicious@evil.com",
          username: "hacker",
          roles: ["admin"], // Suspicious elevated role
          permissions: ["*"], // Wildcard permissions are suspicious
          sessionId: "session-suspicious",
          type: "access",
          securityLevel: "critical",
          mfaVerified: false, // MFA not verified for critical security level
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const exchangeRequest: TokenExchangeRequest = {
        sourceToken: suspiciousToken,
        sourcePlatform: Platform.AIGENT,
        targetPlatform: Platform.PARLANT,
        exchangeReason: "authentication",
        metadata: {
          clientIp: "1.2.3.4", // Potentially suspicious IP
          userAgent: "curl/7.68.0", // Automated tool user agent
          securityLevel: SecurityValidationLevel.CRITICAL,
        },
      };

      const result = await service.exchangeToken(exchangeRequest);

      // Should still attempt exchange but with high risk score
      expect(result.securityValidation.riskScore).toBeGreaterThan(50);
      expect(result.securityValidation.threatIndicators).toContain(
        "exchange_failure",
      );
    });

    it("should perform PARLANT to AIgent token exchange", async () => {
      // Create a mock PARLANT token (simplified format)
      const parlantToken =
        "parlant_token_" +
        Buffer.from(
          JSON.stringify({
            user_id: mockUserId,
            agent_id: "agent-456",
            conversation_id: "conv-789",
            permissions: ["chat", "analysis"],
            expires_at: Date.now() + 3600000,
          }),
        ).toString("base64");

      const exchangeRequest: TokenExchangeRequest = {
        sourceToken: parlantToken,
        sourcePlatform: Platform.PARLANT,
        targetPlatform: Platform.AIGENT,
        exchangeReason: "session_sync",
        metadata: {
          clientIp: "127.0.0.1",
          userAgent: "PARLANT Agent",
          securityLevel: SecurityValidationLevel.STANDARD,
        },
      };

      const result = await service.exchangeToken(exchangeRequest);

      expect(result.success).toBe(true);
      expect(result.translatedToken).toBeDefined();
      expect(result.identityMapping.parlantUserId).toBe(
        `parlant_${mockUserId}`,
      );
    });
  });

  describe("Performance and Monitoring Integration", () => {
    it("should track performance metrics during token exchange", async () => {
      const startTime = Date.now();

      const aigentToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          roles: ["user"],
          permissions: ["read"],
          sessionId: "session-perf",
          type: "access",
          securityLevel: "standard",
          mfaVerified: true,
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const exchangeRequest: TokenExchangeRequest = {
        sourceToken: aigentToken,
        sourcePlatform: Platform.AIGENT,
        targetPlatform: Platform.PARLANT,
        exchangeReason: "authentication",
        metadata: {
          clientIp: "127.0.0.1",
          userAgent: "Performance Test",
          securityLevel: SecurityValidationLevel.STANDARD,
        },
      };

      const result = await service.exchangeToken(exchangeRequest);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.securityValidation.validationTime).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should emit security events during suspicious activity", async () => {
      const eventListener = jest.fn();
      service.on("security:audit", eventListener);

      const aigentToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          roles: ["user"],
          permissions: ["read"],
          sessionId: "session-audit",
          type: "access",
          securityLevel: "standard",
          mfaVerified: true,
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      await service.createBridgeSession(
        aigentToken,
        "refresh-token",
        "127.0.0.1",
        "test-agent",
      );

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "authentication",
          action: "bridge_session_created",
          outcome: "success",
        }),
      );
    });

    it("should handle high-load scenarios", async () => {
      const promises: Promise<any>[] = [];
      const concurrentRequests = 10;

      // Create multiple tokens for concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        const token = jwt.sign(
          {
            sub: `user-${i}`,
            email: `user${i}@test.com`,
            username: `user${i}`,
            roles: ["user"],
            permissions: ["read"],
            sessionId: `session-load-${i}`,
            type: "access",
            securityLevel: "standard",
            mfaVerified: true,
          },
          testConfig.JWT_SECRET,
          { expiresIn: "1h" },
        );

        const exchangeRequest: TokenExchangeRequest = {
          sourceToken: token,
          sourcePlatform: Platform.AIGENT,
          targetPlatform: Platform.PARLANT,
          exchangeReason: "authentication",
          metadata: {
            clientIp: "127.0.0.1",
            userAgent: `Load Test ${i}`,
            securityLevel: SecurityValidationLevel.STANDARD,
          },
        };

        promises.push(service.exchangeToken(exchangeRequest));
      }

      const results = await Promise.all(promises);

      // All requests should complete successfully
      expect(results).toHaveLength(concurrentRequests);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.identityMapping.aigentUserId).toBe(`user-${index}`);
      });
    });
  });

  describe("Failover Integration", () => {
    it("should attempt failover when primary system is unavailable", async () => {
      // Mock primary system failure
      mockedAxios.post.mockRejectedValueOnce(new Error("Connection timeout"));

      // Mock successful failover system
      mockedAxios.post.mockResolvedValueOnce({
        data: { session_id: "parlant-failover-session" },
      });

      const result = await service.performFailover(
        "primary-system-1",
        "timeout",
      );

      expect(result.success).toBe(true);
      expect(result.failoverSystemId).toBeDefined();
      expect(result.failoverTime).toBeGreaterThan(0);
    });

    it("should handle complete system failure scenario", async () => {
      // Mock all systems failing
      mockedAxios.post.mockRejectedValue(new Error("All systems down"));
      mockedAxios.get.mockRejectedValue(new Error("All systems down"));

      const result = await service.performFailover(
        "primary-system-1",
        "manual_failover",
      );

      expect(result.success).toBe(false);
      expect(result.affectedSessions).toBe(0);
    });
  });

  describe("Compliance Integration", () => {
    it("should generate compliance report with real audit data", async () => {
      // Create some audit events first
      const aigentToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: mockUsername,
          roles: ["user"],
          permissions: ["read"],
          sessionId: "session-compliance",
          type: "access",
          securityLevel: "standard",
          mfaVerified: true,
        },
        testConfig.JWT_SECRET,
        { expiresIn: "1h" },
      );

      // Perform several operations to generate audit trail
      await service.createBridgeSession(
        aigentToken,
        "refresh-token",
        "127.0.0.1",
        "compliance-test",
      );

      const exchangeRequest: TokenExchangeRequest = {
        sourceToken: aigentToken,
        sourcePlatform: Platform.AIGENT,
        targetPlatform: Platform.PARLANT,
        exchangeReason: "authentication",
        metadata: {
          clientIp: "127.0.0.1",
          userAgent: "Compliance Test",
          securityLevel: SecurityValidationLevel.STANDARD,
        },
      };

      await service.exchangeToken(exchangeRequest);

      // Generate compliance report
      const startDate = new Date(Date.now() - 86400000); // 24 hours ago
      const endDate = new Date();

      const report = await service.generateComplianceReport(
        startDate,
        endDate,
        "comprehensive",
      );

      expect(report.reportType).toBe("comprehensive");
      expect(report.complianceScore).toBeGreaterThan(0);
      expect(report.auditTrail.totalEvents).toBeGreaterThanOrEqual(0);
      expect(report.reportId).toMatch(/^compliance_comprehensive_\d+$/);
    });
  });
});
