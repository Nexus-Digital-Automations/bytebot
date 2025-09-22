/**
 * Enhanced JWT-Parlant Bridge Service Test Suite
 *
 * Comprehensive test coverage for the Enhanced JWT-Parlant Bridge Service
 * including bi-directional token exchange, security validation, failover
 * mechanisms, and performance optimization.
 *
 * @module EnhancedJwtParlantBridgeServiceSpec
 * @version 2.0.0
 * @author PARLANT Phase 1 JWT Bridge Security Test Specialist
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { EnhancedJwtParlantBridgeService } from "../enhanced-jwt-parlant-bridge.service";
import { JwtParlantBridgeService } from "../jwt-parlant-bridge.service";
import {
  Platform,
  SecurityValidationLevel,
  TokenExchangeRequest,
  AlertSeverity,
} from "../../types/enhanced-jwt-bridge.types";
import * as jwt from "jsonwebtoken";

describe("EnhancedJwtParlantBridgeService", () => {
  let service: EnhancedJwtParlantBridgeService;
  let configService: ConfigService;
  let module: TestingModule;

  // Test data
  const mockJwtSecret = "test-secret-key-for-jwt-signing";
  const mockUserId = "test-user-123";
  const mockEmail = "test@example.com";
  const mockRoles = ["user", "operator"];
  const mockPermissions = ["read", "write"];

  beforeEach(async () => {
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
                    return mockJwtSecret;
                  case "redis":
                    return {
                      host: "localhost",
                      port: 6379,
                      password: undefined,
                      db: 0,
                    };
                  case "parlant.apiUrl":
                    return "http://localhost:8000";
                  case "parlant.apiKey":
                    return "test-api-key";
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
    configService = module.get<ConfigService>(ConfigService);

    // Mock Redis and external API calls
    jest
      .spyOn(service as any, "initializeRedisClient")
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, "initializeParlantClient")
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, "validateJwtConfiguration")
      .mockResolvedValue(undefined);
    jest
      .spyOn(service as any, "startEnhancedPeriodicTasks")
      .mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe("Service Initialization", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should initialize enhanced components on module init", async () => {
      const initializeFailoverSystemsSpy = jest
        .spyOn(service as any, "initializeFailoverSystems")
        .mockResolvedValue(undefined);
      const initializeIdentityMappingsSpy = jest
        .spyOn(service as any, "initializeIdentityMappings")
        .mockResolvedValue(undefined);
      const initializeSecurityMonitoringSpy = jest
        .spyOn(service as any, "initializeSecurityMonitoring")
        .mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(initializeFailoverSystemsSpy).toHaveBeenCalled();
      expect(initializeIdentityMappingsSpy).toHaveBeenCalled();
      expect(initializeSecurityMonitoringSpy).toHaveBeenCalled();
    });

    it("should cleanup resources on module destroy", async () => {
      const stopEnhancedPeriodicTasksSpy = jest
        .spyOn(service as any, "stopEnhancedPeriodicTasks")
        .mockResolvedValue(undefined);
      const flushSecurityAlertsSpy = jest
        .spyOn(service as any, "flushSecurityAlerts")
        .mockResolvedValue(undefined);
      const savePerformanceMetricsSpy = jest
        .spyOn(service as any, "savePerformanceMetrics")
        .mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(stopEnhancedPeriodicTasksSpy).toHaveBeenCalled();
      expect(flushSecurityAlertsSpy).toHaveBeenCalled();
      expect(savePerformanceMetricsSpy).toHaveBeenCalled();
    });
  });

  describe("Token Exchange", () => {
    let mockAigentToken: string;
    let mockTokenExchangeRequest: TokenExchangeRequest;

    beforeEach(() => {
      // Create mock JWT token
      mockAigentToken = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: "testuser",
          roles: mockRoles,
          permissions: mockPermissions,
          sessionId: "session-123",
          type: "access",
          securityLevel: "standard",
          mfaVerified: true,
        },
        mockJwtSecret,
        {
          expiresIn: "1h",
          issuer: "bytebot-auth-service",
          audience: "bytebot-api",
        },
      );

      mockTokenExchangeRequest = {
        sourceToken: mockAigentToken,
        sourcePlatform: Platform.AIGENT,
        targetPlatform: Platform.PARLANT,
        exchangeReason: "authentication",
        metadata: {
          clientIp: "127.0.0.1",
          userAgent: "test-agent",
          securityLevel: SecurityValidationLevel.STANDARD,
        },
      };
    });

    it("should successfully exchange AIgent token to PARLANT token", async () => {
      // Mock required methods
      jest
        .spyOn(service as any, "validateTokenExchangeSecurity")
        .mockResolvedValue({
          passed: true,
          riskScore: 10,
          threatIndicators: [],
          validationTime: 50,
        });

      jest.spyOn(service as any, "parseSourceToken").mockResolvedValue({
        sub: mockUserId,
        email: mockEmail,
        username: "testuser",
        roles: mockRoles,
        permissions: mockPermissions,
      });

      jest.spyOn(service as any, "performIdentityMapping").mockResolvedValue({
        success: true,
        confidence: 0.95,
        aigentUserId: mockUserId,
        parlantUserId: `parlant_${mockUserId}`,
      });

      jest
        .spyOn(service as any, "translateToken")
        .mockResolvedValue("translated-parlant-token");
      jest
        .spyOn(service as any, "updatePerformanceMetrics")
        .mockResolvedValue(undefined);
      jest.spyOn(service as any, "logAuditEvent").mockResolvedValue(undefined);

      const result = await service.exchangeToken(mockTokenExchangeRequest);

      expect(result.success).toBe(true);
      expect(result.translatedToken).toBe("translated-parlant-token");
      expect(result.identityMapping.success).toBe(true);
      expect(result.identityMapping.confidence).toBe(0.95);
      expect(result.securityValidation.passed).toBe(true);
    });

    it("should handle token exchange failure", async () => {
      // Mock security validation failure
      jest
        .spyOn(service as any, "validateTokenExchangeSecurity")
        .mockResolvedValue({
          passed: false,
          reason: "High risk score",
          riskScore: 90,
          threatIndicators: ["suspicious_ip"],
          validationTime: 100,
        });

      jest
        .spyOn(service as any, "updatePerformanceMetrics")
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as any, "createSecurityAlert")
        .mockResolvedValue(undefined);

      const result = await service.exchangeToken(mockTokenExchangeRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBeDefined();
      expect(result.securityValidation.passed).toBe(false);
      expect(result.securityValidation.riskScore).toBe(100);
    });

    it("should validate security requirements for token exchange", async () => {
      const validateSecuritySpy = jest.spyOn(
        service as any,
        "validateTokenExchangeSecurity",
      );

      await service.exchangeToken(mockTokenExchangeRequest);

      expect(validateSecuritySpy).toHaveBeenCalledWith(
        mockTokenExchangeRequest,
        expect.any(String),
      );
    });

    it("should perform identity mapping during token exchange", async () => {
      jest
        .spyOn(service as any, "validateTokenExchangeSecurity")
        .mockResolvedValue({
          passed: true,
          riskScore: 10,
          threatIndicators: [],
          validationTime: 50,
        });

      const mockSourcePayload = {
        sub: mockUserId,
        email: mockEmail,
        username: "testuser",
      };

      jest
        .spyOn(service as any, "parseSourceToken")
        .mockResolvedValue(mockSourcePayload);

      const performIdentityMappingSpy = jest
        .spyOn(service as any, "performIdentityMapping")
        .mockResolvedValue({
          success: true,
          confidence: 0.95,
          aigentUserId: mockUserId,
          parlantUserId: `parlant_${mockUserId}`,
        });

      jest
        .spyOn(service as any, "translateToken")
        .mockResolvedValue("translated-token");
      jest
        .spyOn(service as any, "updatePerformanceMetrics")
        .mockResolvedValue(undefined);
      jest.spyOn(service as any, "logAuditEvent").mockResolvedValue(undefined);

      await service.exchangeToken(mockTokenExchangeRequest);

      expect(performIdentityMappingSpy).toHaveBeenCalledWith(
        mockSourcePayload,
        Platform.PARLANT,
        expect.any(String),
      );
    });

    it("should track performance metrics for token exchange", async () => {
      jest
        .spyOn(service as any, "validateTokenExchangeSecurity")
        .mockResolvedValue({
          passed: true,
          riskScore: 10,
          threatIndicators: [],
          validationTime: 50,
        });

      jest.spyOn(service as any, "parseSourceToken").mockResolvedValue({});
      jest.spyOn(service as any, "performIdentityMapping").mockResolvedValue({
        success: true,
        confidence: 0.95,
        aigentUserId: mockUserId,
        parlantUserId: `parlant_${mockUserId}`,
      });
      jest
        .spyOn(service as any, "translateToken")
        .mockResolvedValue("translated-token");
      jest.spyOn(service as any, "logAuditEvent").mockResolvedValue(undefined);

      const updatePerformanceMetricsSpy = jest
        .spyOn(service as any, "updatePerformanceMetrics")
        .mockResolvedValue(undefined);

      await service.exchangeToken(mockTokenExchangeRequest);

      expect(updatePerformanceMetricsSpy).toHaveBeenCalledWith(
        "exchange",
        expect.any(Number),
        true,
      );
    });
  });

  describe("Token Lifecycle Management", () => {
    const mockTokenId = "token-123";

    it("should refresh token successfully", async () => {
      jest.spyOn(service as any, "refreshToken").mockResolvedValue({
        success: true,
        newToken: "new-refreshed-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      const result = await service.manageTokenLifecycle(mockTokenId, "refresh");

      expect(result.success).toBe(true);
      expect(result.newToken).toBe("new-refreshed-token");
      expect(result.expiresAt).toBeDefined();
    });

    it("should revoke token successfully", async () => {
      jest.spyOn(service as any, "revokeToken").mockResolvedValue({
        success: true,
      });

      const result = await service.manageTokenLifecycle(mockTokenId, "revoke");

      expect(result.success).toBe(true);
    });

    it("should extend token successfully", async () => {
      const extendedExpiryTime = new Date(Date.now() + 7200000); // 2 hours
      jest.spyOn(service as any, "extendToken").mockResolvedValue({
        success: true,
        expiresAt: extendedExpiryTime,
      });

      const result = await service.manageTokenLifecycle(mockTokenId, "extend");

      expect(result.success).toBe(true);
      expect(result.expiresAt).toEqual(extendedExpiryTime);
    });

    it("should validate token lifecycle successfully", async () => {
      jest.spyOn(service as any, "validateTokenLifecycle").mockResolvedValue({
        success: true,
      });

      const result = await service.manageTokenLifecycle(
        mockTokenId,
        "validate",
      );

      expect(result.success).toBe(true);
    });

    it("should handle unsupported lifecycle operation", async () => {
      const result = await service.manageTokenLifecycle(
        mockTokenId,
        "unsupported" as any,
      );

      expect(result.success).toBe(false);
      expect(result.reason).toContain("Unsupported lifecycle operation");
    });

    it("should handle lifecycle operation errors gracefully", async () => {
      jest
        .spyOn(service as any, "refreshToken")
        .mockRejectedValue(new Error("Refresh failed"));

      const result = await service.manageTokenLifecycle(mockTokenId, "refresh");

      expect(result.success).toBe(false);
      expect(result.reason).toBe("Refresh failed");
    });
  });

  describe("Failover System", () => {
    const mockPrimarySystemId = "primary-system-1";

    it("should perform failover successfully", async () => {
      const mockFailoverSystem = {
        systemId: "failover-system-1",
        systemType: "secondary" as const,
        systemUrl: "http://localhost:8001",
        healthStatus: "healthy" as const,
        lastHealthCheck: new Date(),
        responseTime: 100,
        priority: 1,
        loadCapacity: 1000,
        currentLoad: 50,
      };

      jest
        .spyOn(service as any, "selectBestFailoverSystem")
        .mockResolvedValue(mockFailoverSystem);
      jest.spyOn(service as any, "migrateActiveSessions").mockResolvedValue(25);
      jest
        .spyOn(service as any, "createSecurityAlert")
        .mockResolvedValue(undefined);

      const result = await service.performFailover(
        mockPrimarySystemId,
        "health_check_failed",
      );

      expect(result.success).toBe(true);
      expect(result.failoverSystemId).toBe("failover-system-1");
      expect(result.affectedSessions).toBe(25);
      expect(result.failoverTime).toBeGreaterThan(0);
    });

    it("should handle failover when no healthy systems available", async () => {
      jest
        .spyOn(service as any, "selectBestFailoverSystem")
        .mockResolvedValue(null);

      const result = await service.performFailover(
        mockPrimarySystemId,
        "health_check_failed",
      );

      expect(result.success).toBe(false);
      expect(result.affectedSessions).toBe(0);
    });

    it("should create security alert during failover", async () => {
      const mockFailoverSystem = {
        systemId: "failover-system-1",
        systemType: "secondary" as const,
        systemUrl: "http://localhost:8001",
        healthStatus: "healthy" as const,
        lastHealthCheck: new Date(),
        responseTime: 100,
        priority: 1,
        loadCapacity: 1000,
        currentLoad: 50,
      };

      jest
        .spyOn(service as any, "selectBestFailoverSystem")
        .mockResolvedValue(mockFailoverSystem);
      jest.spyOn(service as any, "migrateActiveSessions").mockResolvedValue(25);

      const createSecurityAlertSpy = jest
        .spyOn(service as any, "createSecurityAlert")
        .mockResolvedValue(undefined);

      await service.performFailover(mockPrimarySystemId, "health_check_failed");

      expect(createSecurityAlertSpy).toHaveBeenCalledWith({
        alertType: "system_compromise",
        severity: "high",
        userContext: expect.any(Object),
        details: expect.objectContaining({
          description: expect.stringContaining("System failover"),
          indicators: expect.arrayContaining([
            "system_failover",
            "health_check_failed",
          ]),
          riskScore: 80,
        }),
      });
    });
  });

  describe("Security Monitoring", () => {
    it("should detect and return security threats", async () => {
      const mockAuthPatternAlerts = [
        {
          alertId: "alert-1",
          alertType: "authentication_failure" as const,
          severity: AlertSeverity.MEDIUM,
          timestamp: new Date(),
          userContext: {
            userId: "user-1",
            ipAddress: "192.168.1.100",
            userAgent: "suspicious-agent",
            sessionId: "session-1",
          },
          details: {
            description: "Multiple failed authentication attempts",
            indicators: ["failed_auth_pattern"],
            riskScore: 70,
            affectedSystems: ["aigent"],
            recommendedActions: ["block_ip", "investigate_user"],
          },
          responseStatus: "pending" as const,
        },
      ];

      jest
        .spyOn(service as any, "detectSuspiciousAuthPatterns")
        .mockResolvedValue(mockAuthPatternAlerts);
      jest.spyOn(service as any, "detectTokenAbuse").mockResolvedValue([]);
      jest.spyOn(service as any, "detectSystemAnomalies").mockResolvedValue([]);
      jest
        .spyOn(service as any, "getAlertSeverityDistribution")
        .mockReturnValue({ medium: 1 });

      const alerts = await service.monitorSecurityThreats();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe("authentication_failure");
      expect(alerts[0].severity).toBe(AlertSeverity.MEDIUM);
    });

    it("should emit security events for detected threats", async () => {
      const mockAlert = {
        alertId: "alert-1",
        alertType: "token_abuse" as const,
        severity: AlertSeverity.HIGH,
        timestamp: new Date(),
        userContext: {
          userId: "user-1",
          ipAddress: "192.168.1.100",
          userAgent: "automated-tool",
          sessionId: "session-1",
        },
        details: {
          description: "Token being used from multiple IPs",
          indicators: ["multiple_ip_usage"],
          riskScore: 85,
          affectedSystems: ["aigent", "parlant"],
          recommendedActions: ["revoke_token", "investigate_account"],
        },
        responseStatus: "pending" as const,
      };

      jest
        .spyOn(service as any, "detectSuspiciousAuthPatterns")
        .mockResolvedValue([]);
      jest
        .spyOn(service as any, "detectTokenAbuse")
        .mockResolvedValue([mockAlert]);
      jest.spyOn(service as any, "detectSystemAnomalies").mockResolvedValue([]);

      const emitSpy = jest.spyOn(service, "emit");

      await service.monitorSecurityThreats();

      expect(emitSpy).toHaveBeenCalledWith(
        "security:threat_detected",
        mockAlert,
      );
    });

    it("should handle security monitoring errors gracefully", async () => {
      jest
        .spyOn(service as any, "detectSuspiciousAuthPatterns")
        .mockRejectedValue(new Error("Detection failed"));
      jest.spyOn(service as any, "detectTokenAbuse").mockResolvedValue([]);
      jest.spyOn(service as any, "detectSystemAnomalies").mockResolvedValue([]);

      const alerts = await service.monitorSecurityThreats();

      expect(alerts).toEqual([]);
    });
  });

  describe("Performance Optimization", () => {
    it("should optimize performance and return metrics", async () => {
      const mockCurrentMetrics = {
        authenticationMetrics: {
          averageResponseTime: 800,
          p95ResponseTime: 1200,
          p99ResponseTime: 1500,
          successRate: 99.5,
          throughput: 1000,
        },
        exchangeMetrics: {
          averageExchangeTime: 500,
          exchangeSuccessRate: 99.8,
          translationAccuracy: 100,
          identityMappingSuccess: 99.9,
        },
        systemMetrics: {
          primarySystemUptime: 99.9,
          failoverEvents: 2,
          loadDistribution: { "system-1": 60, "system-2": 40 },
          resourceUtilization: 75,
        },
        securityMetrics: {
          threatDetectionRate: 0.1,
          falsePositiveRate: 0.05,
          blockedAttacks: 5,
          securityIncidents: 0,
        },
      };

      // Mock private property access
      (service as any).performanceMetrics = mockCurrentMetrics;
      (service as any).tokenExchangeCache = new Map();

      jest
        .spyOn(service as any, "optimizeConnectionPools")
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as any, "optimizeRedisPerformance")
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as any, "optimizeLoadBalancing")
        .mockResolvedValue(undefined);

      const result = await service.optimizePerformance();

      expect(result.currentMetrics).toEqual(mockCurrentMetrics);
      expect(result.optimizations).toContain("connection_pools_optimized");
      expect(result.optimizations).toContain("redis_performance_optimized");
      expect(result.optimizations).toContain("load_balancing_optimized");
      expect(result.targetAchieved).toBe(true); // Both auth and exchange are under 1000ms
    });

    it("should detect when performance targets are not achieved", async () => {
      const mockSlowMetrics = {
        authenticationMetrics: {
          averageResponseTime: 1200,
          p95ResponseTime: 1800,
          p99ResponseTime: 2500,
          successRate: 99.5,
          throughput: 1000,
        },
        exchangeMetrics: {
          averageExchangeTime: 1100,
          exchangeSuccessRate: 99.8,
          translationAccuracy: 100,
          identityMappingSuccess: 99.9,
        },
        systemMetrics: {
          primarySystemUptime: 99.9,
          failoverEvents: 2,
          loadDistribution: {},
          resourceUtilization: 75,
        },
        securityMetrics: {
          threatDetectionRate: 0.1,
          falsePositiveRate: 0.05,
          blockedAttacks: 5,
          securityIncidents: 0,
        },
      };

      (service as any).performanceMetrics = mockSlowMetrics;
      (service as any).tokenExchangeCache = new Map();

      jest
        .spyOn(service as any, "optimizeConnectionPools")
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as any, "optimizeRedisPerformance")
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as any, "optimizeLoadBalancing")
        .mockResolvedValue(undefined);

      const result = await service.optimizePerformance();

      expect(result.targetAchieved).toBe(false);
    });

    it("should optimize token cache when size exceeds threshold", async () => {
      const largeCacheMap = new Map();
      for (let i = 0; i < 10001; i++) {
        largeCacheMap.set(`token-${i}`, { data: "mock-response" });
      }

      (service as any).tokenExchangeCache = largeCacheMap;

      const optimizeTokenCacheSpy = jest
        .spyOn(service as any, "optimizeTokenCache")
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as any, "optimizeConnectionPools")
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as any, "optimizeRedisPerformance")
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as any, "optimizeLoadBalancing")
        .mockResolvedValue(undefined);

      const result = await service.optimizePerformance();

      expect(optimizeTokenCacheSpy).toHaveBeenCalled();
      expect(result.optimizations).toContain("token_cache_optimized");
    });
  });

  describe("Compliance Reporting", () => {
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-31");

    it("should generate comprehensive compliance report", async () => {
      const mockAuditAnalysis = {
        totalEvents: 10000,
        securityEvents: 150,
        authenticationEvents: 8500,
        failoverEvents: 5,
      };

      const mockFindings = [
        {
          category: "authentication",
          severity: "medium" as const,
          description: "Some failed authentication attempts detected",
          evidence: ["auth_log_1", "auth_log_2"],
          remediation: ["strengthen_password_policy", "enable_mfa"],
        },
      ];

      jest
        .spyOn(service as any, "analyzeAuditTrail")
        .mockResolvedValue(mockAuditAnalysis);
      jest
        .spyOn(service as any, "calculateComplianceScore")
        .mockResolvedValue(95);
      jest
        .spyOn(service as any, "generateComplianceFindings")
        .mockResolvedValue(mockFindings);
      jest
        .spyOn(service as any, "storeComplianceReport")
        .mockResolvedValue(undefined);

      const report = await service.generateComplianceReport(
        startDate,
        endDate,
        "comprehensive",
      );

      expect(report.reportType).toBe("comprehensive");
      expect(report.period.start).toEqual(startDate);
      expect(report.period.end).toEqual(endDate);
      expect(report.complianceScore).toBe(95);
      expect(report.findings).toEqual(mockFindings);
      expect(report.auditTrail).toEqual(mockAuditAnalysis);
    });

    it("should generate SOC2 specific compliance report", async () => {
      jest.spyOn(service as any, "analyzeAuditTrail").mockResolvedValue({
        totalEvents: 5000,
        securityEvents: 75,
        authenticationEvents: 4000,
        failoverEvents: 2,
      });
      jest
        .spyOn(service as any, "calculateComplianceScore")
        .mockResolvedValue(98);
      jest
        .spyOn(service as any, "generateComplianceFindings")
        .mockResolvedValue([]);
      jest
        .spyOn(service as any, "storeComplianceReport")
        .mockResolvedValue(undefined);

      const report = await service.generateComplianceReport(
        startDate,
        endDate,
        "soc2",
      );

      expect(report.reportType).toBe("soc2");
      expect(report.complianceScore).toBe(98);
    });

    it("should handle compliance report generation errors", async () => {
      jest
        .spyOn(service as any, "analyzeAuditTrail")
        .mockRejectedValue(new Error("Analysis failed"));

      await expect(
        service.generateComplianceReport(startDate, endDate, "gdpr"),
      ).rejects.toThrow("Analysis failed");
    });

    it("should store compliance report after generation", async () => {
      jest.spyOn(service as any, "analyzeAuditTrail").mockResolvedValue({
        totalEvents: 1000,
        securityEvents: 10,
        authenticationEvents: 800,
        failoverEvents: 0,
      });
      jest
        .spyOn(service as any, "calculateComplianceScore")
        .mockResolvedValue(92);
      jest
        .spyOn(service as any, "generateComplianceFindings")
        .mockResolvedValue([]);

      const storeComplianceReportSpy = jest
        .spyOn(service as any, "storeComplianceReport")
        .mockResolvedValue(undefined);

      await service.generateComplianceReport(startDate, endDate, "hipaa");

      expect(storeComplianceReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          reportType: "hipaa",
          complianceScore: 92,
        }),
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle initialization errors gracefully", async () => {
      jest
        .spyOn(service as any, "initializeFailoverSystems")
        .mockRejectedValue(new Error("Failover init failed"));

      await expect(service.onModuleInit()).rejects.toThrow(
        "Failover init failed",
      );
    });

    it("should handle token exchange validation errors", async () => {
      const invalidRequest: TokenExchangeRequest = {
        sourceToken: "invalid-token",
        sourcePlatform: Platform.AIGENT,
        targetPlatform: Platform.PARLANT,
        exchangeReason: "authentication",
        metadata: {
          clientIp: "127.0.0.1",
          userAgent: "test-agent",
          securityLevel: SecurityValidationLevel.STANDARD,
        },
      };

      jest
        .spyOn(service as any, "validateTokenExchangeSecurity")
        .mockRejectedValue(new Error("Validation error"));
      jest
        .spyOn(service as any, "updatePerformanceMetrics")
        .mockResolvedValue(undefined);
      jest
        .spyOn(service as any, "createSecurityAlert")
        .mockResolvedValue(undefined);

      const result = await service.exchangeToken(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBeDefined();
    });

    it("should handle performance optimization errors", async () => {
      jest
        .spyOn(service as any, "optimizeConnectionPools")
        .mockRejectedValue(new Error("Optimization failed"));

      const result = await service.optimizePerformance();

      expect(result.targetAchieved).toBe(false);
      expect(result.optimizations).toBeDefined();
    });
  });
});
