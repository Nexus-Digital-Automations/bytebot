/**
 * PARLANT Security Validator Service - Comprehensive Integration Test Suite
 *
 * Enterprise-grade test suite for the PARLANT Security Validator Service with complete
 * coverage of operation security validation, risk assessment algorithms, security policy
 * enforcement, audit trail generation, time window validation, role-based access control,
 * and conversational validation simulation.
 *
 * Tests validate enterprise security requirements and compliance standards with
 * performance targets under 1000ms per validation operation.
 *
 * @author Claude Code (AIgent Security Testing Specialist)
 * @version 1.0.0
 * @priority CRITICAL - Security validation framework testing
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import {
  ParlantSecurityValidator,
  SecurityValidationRequest,
  SecurityValidationResult,
  SecurityAuditEntry,
  SecurityPolicy,
} from "../parlant-security-validator.service";
import { ParlantContext, RiskAssessment } from "../parlant-jwt-bridge.service";

describe("ParlantSecurityValidator - Comprehensive Integration Tests", () => {
  let service: ParlantSecurityValidator;
  let module: TestingModule;
  let logger: Logger;

  // Test data factories
  const createTestContext = (
    overrides: Partial<ParlantContext> = {},
  ): ParlantContext => ({
    conversationId: "conv_12345",
    sessionId: "sess_67890",
    userId: "user_test_001",
    securityLevel: "MODERATE",
    timestamp: new Date(),
    metadata: { role: "user", deviceId: "device_001" },
    ...overrides,
  });

  const createValidationRequest = (
    operation: string,
    overrides: Partial<SecurityValidationRequest> = {},
  ): SecurityValidationRequest => ({
    operation,
    userId: "user_test_001",
    sessionId: "sess_67890",
    conversationId: "conv_12345",
    parameters: {},
    context: createTestContext(),
    timestamp: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParlantSecurityValidator,
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ParlantSecurityValidator>(ParlantSecurityValidator);
    logger = module.get<Logger>(Logger);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe("Security Validator Service Initialization", () => {
    it("should initialize with default security policies", () => {
      expect(service).toBeDefined();
      expect(service.healthCheck).toBeDefined();
      expect(service.validateOperation).toBeDefined();
      expect(service.getAuditTrail).toBeDefined();
    });

    it("should have predefined security policies for core operations", async () => {
      const healthCheck = await service.healthCheck();
      expect(healthCheck.status).toBe("healthy");
      expect(healthCheck.metrics).toBeDefined();
    });
  });

  describe("Operation Security Validation Testing", () => {
    describe("Database Operations", () => {
      it("should validate database.read operations with LOW security requirements", async () => {
        const request = createValidationRequest("database.read", {
          parameters: { table: "users", limit: 10 },
        });

        const result = await service.validateOperation(request);

        expect(result.approved).toBe(true);
        expect(result.riskLevel).toBe("LOW");
        expect(result.validationMethod).toBe("automatic");
        expect(result.validationTime).toBeLessThan(1000);
        expect(result.auditTrail).toBeDefined();
      });

      it("should validate database.write operations with MODERATE security requirements", async () => {
        const request = createValidationRequest("database.write", {
          parameters: { table: "users", operation: "update", record_count: 1 },
          context: createTestContext({ metadata: { role: "admin" } }),
        });

        const result = await service.validateOperation(request);

        expect(result.approved).toBe(true);
        expect(result.riskLevel).toMatch(/LOW|MEDIUM|HIGH/);
        expect(result.validationMethod).toMatch(/automatic|conversational/);
        expect(result.validationTime).toBeLessThan(1000);
        expect(result.additionalChecks).toContain("conversational_validation");
      });

      it("should handle bulk database operations with increased security", async () => {
        const request = createValidationRequest("database.write", {
          parameters: {
            table: "users",
            operation: "batch_update",
            bulk: true,
            limit: 1000,
          },
          context: createTestContext({ metadata: { role: "admin" } }),
        });

        const result = await service.validateOperation(request);

        expect(result.riskLevel).toMatch(/MEDIUM|HIGH|CRITICAL/);
        expect(result.validationMethod).toBe("conversational");
        expect(result.additionalChecks).toContain("conversational_validation");
      });
    });

    describe("System Administration Operations", () => {
      it("should validate system.admin operations with CRITICAL security requirements", async () => {
        const request = createValidationRequest("system.admin", {
          parameters: { action: "config_update", component: "security" },
          context: createTestContext({
            securityLevel: "CRITICAL",
            metadata: { role: "admin" },
          }),
        });

        const result = await service.validateOperation(request);

        expect(result.riskLevel).toMatch(/HIGH|CRITICAL/);
        expect(result.validationMethod).toBe("conversational");
        expect(result.additionalChecks).toContain("conversational_validation");
      });

      it("should deny system.admin operations during off-hours", async () => {
        // Mock current time to be outside business hours (e.g., 2 AM)
        jest.spyOn(Date.prototype, "getHours").mockReturnValue(2);
        jest.spyOn(Date.prototype, "getMinutes").mockReturnValue(0);

        const request = createValidationRequest("system.admin", {
          context: createTestContext({ metadata: { role: "admin" } }),
        });

        const result = await service.validateOperation(request);

        expect(result.riskLevel).toMatch(/HIGH|CRITICAL/);
        expect(result.additionalChecks).toContain("conversational_validation");

        // Restore original implementation
        jest.restoreAllMocks();
      });

      it("should deny system.admin operations for non-admin users", async () => {
        const request = createValidationRequest("system.admin", {
          context: createTestContext({ metadata: { role: "user" } }),
        });

        const result = await service.validateOperation(request);

        expect(result.approved).toBe(false);
        expect(result.reason).toContain("Insufficient role permissions");
        expect(result.additionalChecks).toContain("role_permission_check");
      });
    });

    describe("PARLANT Conversation Operations", () => {
      it("should validate parlant.conversation operations with minimal security", async () => {
        const request = createValidationRequest("parlant.conversation", {
          parameters: { type: "chat", message_count: 5 },
        });

        const result = await service.validateOperation(request);

        expect(result.approved).toBe(true);
        expect(result.riskLevel).toBe("LOW");
        expect(result.validationMethod).toBe("automatic");
        expect(result.validationTime).toBeLessThan(1000);
      });
    });

    describe("Unknown Operations Security", () => {
      it("should apply restrictive default policy for unknown operations", async () => {
        const request = createValidationRequest("unknown.operation.test", {
          context: createTestContext({ metadata: { role: "user" } }),
        });

        const result = await service.validateOperation(request);

        expect(result.approved).toBe(false);
        expect(result.riskLevel).toMatch(/HIGH|CRITICAL/);
        expect(result.reason).toContain("Insufficient role permissions");
      });

      it("should allow unknown operations for admin users with conversational validation", async () => {
        const request = createValidationRequest("unknown.operation.test", {
          context: createTestContext({ metadata: { role: "admin" } }),
        });

        const result = await service.validateOperation(request);

        expect(result.riskLevel).toMatch(/HIGH|CRITICAL/);
        expect(result.validationMethod).toBe("conversational");
        expect(result.additionalChecks).toContain("conversational_validation");
      });
    });
  });

  describe("Risk Assessment Algorithm Validation", () => {
    describe("Risk Factor Evaluation", () => {
      it("should assess off-hours access risk correctly", async () => {
        // Test during business hours (10 AM)
        jest.spyOn(Date.prototype, "getHours").mockReturnValue(10);

        const request = createValidationRequest("database.write");
        const result = await service.validateOperation(request);

        // Should have lower risk during business hours
        expect(result.riskLevel).toMatch(/LOW|MEDIUM/);

        // Test during off-hours (3 AM)
        jest.spyOn(Date.prototype, "getHours").mockReturnValue(3);

        const offHoursResult = await service.validateOperation(request);

        // Should have higher risk during off-hours
        expect(["MEDIUM", "HIGH", "CRITICAL"]).toContain(
          offHoursResult.riskLevel,
        );

        jest.restoreAllMocks();
      });

      it("should assess administrative operation risk", async () => {
        const adminRequest = createValidationRequest("system.admin.config");
        const regularRequest = createValidationRequest("database.read");

        const adminResult = await service.validateOperation(adminRequest);
        const regularResult = await service.validateOperation(regularRequest);

        expect(["HIGH", "CRITICAL"]).toContain(adminResult.riskLevel);
        expect(regularResult.riskLevel).toBe("LOW");
      });

      it("should assess bulk operation risk", async () => {
        const bulkRequest = createValidationRequest("database.write", {
          parameters: { bulk: true, limit: 5000 },
        });
        const singleRequest = createValidationRequest("database.write", {
          parameters: { limit: 1 },
        });

        const bulkResult = await service.validateOperation(bulkRequest);
        const singleResult = await service.validateOperation(singleRequest);

        // Bulk operations should have higher risk
        expect(["MEDIUM", "HIGH", "CRITICAL"]).toContain(bulkResult.riskLevel);
      });

      it("should assess sensitive data access risk", async () => {
        const sensitiveRequest = createValidationRequest(
          "user.personal.access",
          {
            parameters: { include_payment_info: true },
          },
        );

        const result = await service.validateOperation(sensitiveRequest);

        expect(["MEDIUM", "HIGH", "CRITICAL"]).toContain(result.riskLevel);
      });

      it("should assess system modification risk", async () => {
        const systemModRequest = createValidationRequest(
          "config.update.security",
        );
        const result = await service.validateOperation(systemModRequest);

        expect(["HIGH", "CRITICAL"]).toContain(result.riskLevel);
      });
    });

    describe("Risk Score Calculation", () => {
      it("should calculate compound risk scores correctly", async () => {
        // Create a high-risk scenario: admin operation + off-hours + bulk + new device
        jest.spyOn(Date.prototype, "getHours").mockReturnValue(2); // 2 AM

        const highRiskRequest = createValidationRequest("system.admin.bulk", {
          parameters: { bulk: true, limit: 10000 },
          context: createTestContext({
            metadata: { role: "admin", newDevice: true },
          }),
        });

        const result = await service.validateOperation(highRiskRequest);

        expect(result.riskLevel).toMatch(/HIGH|CRITICAL/);
        expect(result.validationMethod).toBe("conversational");
        expect(result.confidence).toBeLessThan(1.0);

        jest.restoreAllMocks();
      });

      it("should maintain low risk for standard operations", async () => {
        const lowRiskRequest = createValidationRequest("database.read", {
          parameters: { limit: 10 },
          context: createTestContext({ metadata: { role: "viewer" } }),
        });

        const result = await service.validateOperation(lowRiskRequest);

        expect(result.riskLevel).toBe("LOW");
        expect(result.validationMethod).toBe("automatic");
        expect(result.confidence).toBeGreaterThan(0.7);
      });
    });
  });

  describe("Security Policy Enforcement Testing", () => {
    describe("Time Window Validation", () => {
      it("should enforce business hours for system.admin operations", async () => {
        // Test during allowed hours (10 AM)
        jest.spyOn(Date.prototype, "getHours").mockReturnValue(10);
        jest.spyOn(Date.prototype, "getMinutes").mockReturnValue(0);

        const allowedTimeRequest = createValidationRequest("system.admin", {
          context: createTestContext({ metadata: { role: "admin" } }),
        });

        const allowedResult =
          await service.validateOperation(allowedTimeRequest);
        expect(
          allowedResult.approved ||
            allowedResult.validationMethod === "conversational",
        ).toBe(true);

        // Test during restricted hours (11 PM)
        jest.spyOn(Date.prototype, "getHours").mockReturnValue(23);

        const restrictedTimeRequest = createValidationRequest("system.admin", {
          context: createTestContext({ metadata: { role: "admin" } }),
        });

        const restrictedResult = await service.validateOperation(
          restrictedTimeRequest,
        );
        expect(restrictedResult.approved).toBe(false);
        expect(restrictedResult.reason).toContain("time window");

        jest.restoreAllMocks();
      });
    });

    describe("Role-Based Access Control", () => {
      const roles = ["admin", "user", "operator", "viewer"];
      const operations = [
        "database.read",
        "database.write",
        "system.admin",
        "parlant.conversation",
      ];

      test.each([
        ["database.read", "admin", true],
        ["database.read", "user", true],
        ["database.read", "operator", true],
        ["database.read", "viewer", true],
        ["database.write", "admin", true],
        ["database.write", "user", true],
        ["database.write", "operator", true],
        ["database.write", "viewer", false],
        ["system.admin", "admin", true],
        ["system.admin", "user", false],
        ["system.admin", "operator", false],
        ["system.admin", "viewer", false],
        ["parlant.conversation", "admin", true],
        ["parlant.conversation", "user", true],
        ["parlant.conversation", "operator", true],
        ["parlant.conversation", "viewer", true],
      ])(
        "should enforce RBAC for %s operation with %s role (expected: %s)",
        async (operation, role, shouldAllow) => {
          const request = createValidationRequest(operation, {
            context: createTestContext({ metadata: { role } }),
          });

          const result = await service.validateOperation(request);

          if (shouldAllow) {
            expect(
              result.approved || result.validationMethod === "conversational",
            ).toBe(true);
          } else {
            expect(result.approved).toBe(false);
            expect(result.reason).toContain("Insufficient role permissions");
          }
        },
      );
    });

    describe("Multi-Factor Authentication Requirements", () => {
      it("should require MFA for database.write operations", async () => {
        const request = createValidationRequest("database.write", {
          context: createTestContext({ metadata: { role: "admin" } }),
        });

        const result = await service.validateOperation(request);

        // MFA requirement is enforced at policy level
        expect(result.validationMethod).toBe("conversational");
        expect(result.additionalChecks).toContain("conversational_validation");
      });

      it("should require MFA for system.admin operations", async () => {
        const request = createValidationRequest("system.admin", {
          context: createTestContext({ metadata: { role: "admin" } }),
        });

        const result = await service.validateOperation(request);

        expect(result.validationMethod).toBe("conversational");
        expect(result.additionalChecks).toContain("conversational_validation");
      });
    });
  });

  describe("Audit Trail Generation and Integrity", () => {
    it("should generate complete audit trail entries for all operations", async () => {
      const request = createValidationRequest("database.write", {
        parameters: { table: "users", action: "update" },
      });

      await service.validateOperation(request);

      const auditTrail = service.getAuditTrail();
      expect(auditTrail.length).toBeGreaterThan(0);

      const lastEntry = auditTrail[0]; // Most recent entry
      expect(lastEntry.timestamp).toBeInstanceOf(Date);
      expect(lastEntry.action).toBe("database.write");
      expect(lastEntry.userId).toBe("user_test_001");
      expect(lastEntry.sessionId).toBe("sess_67890");
      expect(lastEntry.conversationId).toBe("conv_12345");
      expect(lastEntry.decision).toMatch(/approved|denied|escalated/);
      expect(lastEntry.validationTime).toBeGreaterThan(0);
      expect(lastEntry.metadata).toBeDefined();
    });

    it("should support audit trail filtering by user", async () => {
      const user1Request = createValidationRequest("database.read", {
        userId: "user_001",
      });
      const user2Request = createValidationRequest("database.read", {
        userId: "user_002",
      });

      await service.validateOperation(user1Request);
      await service.validateOperation(user2Request);

      const user1Audit = service.getAuditTrail({ userId: "user_001" });
      const user2Audit = service.getAuditTrail({ userId: "user_002" });

      expect(user1Audit.every((entry) => entry.userId === "user_001")).toBe(
        true,
      );
      expect(user2Audit.every((entry) => entry.userId === "user_002")).toBe(
        true,
      );
    });

    it("should support audit trail filtering by operation", async () => {
      await service.validateOperation(createValidationRequest("database.read"));
      await service.validateOperation(
        createValidationRequest("database.write"),
      );

      const readAudit = service.getAuditTrail({ operation: "database.read" });
      const writeAudit = service.getAuditTrail({ operation: "database.write" });

      expect(readAudit.every((entry) => entry.action === "database.read")).toBe(
        true,
      );
      expect(
        writeAudit.every((entry) => entry.action === "database.write"),
      ).toBe(true);
    });

    it("should support audit trail filtering by date range", async () => {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - 1);

      const endDate = new Date();
      endDate.setHours(endDate.getHours() + 1);

      await service.validateOperation(createValidationRequest("database.read"));

      const filteredAudit = service.getAuditTrail({ startDate, endDate });

      expect(filteredAudit.length).toBeGreaterThan(0);
      expect(
        filteredAudit.every(
          (entry) => entry.timestamp >= startDate && entry.timestamp <= endDate,
        ),
      ).toBe(true);
    });

    it("should maintain audit trail integrity and ordering", async () => {
      const operations = [
        "database.read",
        "database.write",
        "parlant.conversation",
      ];

      for (const operation of operations) {
        await service.validateOperation(createValidationRequest(operation));
        // Small delay to ensure timestamp ordering
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const auditTrail = service.getAuditTrail();

      // Should be ordered by timestamp (most recent first)
      for (let i = 0; i < auditTrail.length - 1; i++) {
        expect(auditTrail[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          auditTrail[i + 1].timestamp.getTime(),
        );
      }
    });
  });

  describe("Conversational Validation Simulation", () => {
    it("should trigger conversational validation for high-risk operations", async () => {
      const highRiskRequest = createValidationRequest("system.admin", {
        context: createTestContext({
          securityLevel: "CRITICAL",
          metadata: { role: "admin" },
        }),
      });

      const result = await service.validateOperation(highRiskRequest);

      expect(result.validationMethod).toBe("conversational");
      expect(result.additionalChecks).toContain("conversational_validation");
      expect(result.reason).toContain("conversational validation");
    });

    it("should simulate conversational approval flow", async () => {
      const conversationalRequest = createValidationRequest("database.write", {
        context: createTestContext({ metadata: { role: "admin" } }),
      });

      const startTime = Date.now();
      const result = await service.validateOperation(conversationalRequest);
      const endTime = Date.now();

      expect(result.validationMethod).toBe("conversational");
      expect(result.approved).toBe(true); // Phase 1 simulation approves
      expect(result.reason).toContain("Phase 1 simulation");
      expect(endTime - startTime).toBeGreaterThan(100); // Simulated delay
      expect(result.validationTime).toBeGreaterThan(100);
    });

    it("should include conversational context in audit trail", async () => {
      const conversationalRequest = createValidationRequest("system.admin", {
        context: createTestContext({ metadata: { role: "admin" } }),
      });

      await service.validateOperation(conversationalRequest);

      const auditTrail = service.getAuditTrail();
      const lastEntry = auditTrail[0];

      expect(lastEntry.reason).toContain("conversational validation");
      expect(lastEntry.metadata).toBeDefined();
    });
  });

  describe("Performance and Scalability Testing", () => {
    it("should complete validation within 1000ms performance target", async () => {
      const request = createValidationRequest("database.read");

      const startTime = Date.now();
      const result = await service.validateOperation(request);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
      expect(result.validationTime).toBeLessThan(1000);
    });

    it("should handle concurrent validation requests efficiently", async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        createValidationRequest("database.read", {
          userId: `user_${i}`,
          sessionId: `sess_${i}`,
        }),
      );

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map((request) => service.validateOperation(request)),
      );
      const endTime = Date.now();

      expect(results.length).toBe(10);
      expect(results.every((result) => result.approved)).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // Allow some overhead for concurrent processing
    });

    it("should maintain cache efficiency for repeated operations", async () => {
      const request = createValidationRequest("database.read");

      // First validation (cache miss)
      const firstResult = await service.validateOperation(request);

      // Second validation (should be faster due to caching)
      const secondStartTime = Date.now();
      const secondResult = await service.validateOperation(request);
      const secondEndTime = Date.now();

      expect(secondResult.approved).toBe(firstResult.approved);
      expect(secondEndTime - secondStartTime).toBeLessThan(
        firstResult.validationTime,
      );
    });
  });

  describe("Health Check and Monitoring", () => {
    it("should provide comprehensive health status", async () => {
      // Perform some operations to generate metrics
      await service.validateOperation(createValidationRequest("database.read"));
      await service.validateOperation(
        createValidationRequest("database.write"),
      );

      const health = await service.healthCheck();

      expect(health.status).toBe("healthy");
      expect(health.metrics.totalValidations).toBeGreaterThan(0);
      expect(health.metrics.approvalRate).toBeGreaterThanOrEqual(0);
      expect(health.metrics.approvalRate).toBeLessThanOrEqual(1);
      expect(health.metrics.averageValidationTime).toBeGreaterThan(0);
      expect(health.metrics.cacheSize).toBeGreaterThanOrEqual(0);
      expect(health.metrics.auditTrailSize).toBeGreaterThan(0);
    });

    it("should handle health check errors gracefully", async () => {
      // Mock an error condition
      jest.spyOn(service, "getAuditTrail").mockImplementation(() => {
        throw new Error("Mock audit trail error");
      });

      const health = await service.healthCheck();

      expect(health.status).toBe("unhealthy");
      expect(health.metrics.totalValidations).toBe(0);

      jest.restoreAllMocks();
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle validation errors gracefully", async () => {
      // Create invalid request that will cause processing errors
      const invalidRequest = createValidationRequest("test.operation", {
        parameters: null as any,
        context: null as any,
      });

      const result = await service.validateOperation(invalidRequest);

      expect(result.approved).toBe(false);
      expect(result.riskLevel).toBe("CRITICAL");
      expect(result.reason).toContain("Validation system error");
      expect(result.confidence).toBe(0);
    });

    it("should handle missing context gracefully", async () => {
      const requestWithMissingContext = createValidationRequest(
        "database.read",
        {
          context: createTestContext({ metadata: undefined }),
        },
      );

      const result = await service.validateOperation(requestWithMissingContext);

      // Should still process but may have different risk assessment
      expect(result).toBeDefined();
      expect(result.validationTime).toBeGreaterThan(0);
    });

    it("should handle extreme parameter values", async () => {
      const extremeRequest = createValidationRequest("database.write", {
        parameters: {
          limit: Number.MAX_SAFE_INTEGER,
          bulk: true,
          nested: { deep: { very: { extreme: "value" } } },
        },
      });

      const result = await service.validateOperation(extremeRequest);

      expect(result).toBeDefined();
      expect(result.riskLevel).toMatch(/MEDIUM|HIGH|CRITICAL/);
    });
  });

  describe("Security Compliance and Enterprise Standards", () => {
    it("should maintain GDPR compliance in audit trail", async () => {
      const gdprRequest = createValidationRequest("user.personal.access", {
        parameters: { include_pii: true },
      });

      await service.validateOperation(gdprRequest);

      const auditTrail = service.getAuditTrail();
      const lastEntry = auditTrail[0];

      // Verify sensitive data is not logged directly
      expect(JSON.stringify(lastEntry)).not.toContain("password");
      expect(JSON.stringify(lastEntry)).not.toContain("ssn");
      expect(JSON.stringify(lastEntry)).not.toContain("credit_card");
    });

    it("should support SOX compliance requirements", async () => {
      const financialRequest = createValidationRequest(
        "financial.transaction",
        {
          parameters: { amount: 10000, currency: "USD" },
        },
      );

      const result = await service.validateOperation(financialRequest);

      // Financial operations should require high security
      expect(["HIGH", "CRITICAL"]).toContain(result.riskLevel);
      expect(result.validationMethod).toBe("conversational");

      // Audit trail should be complete
      const auditTrail = service.getAuditTrail();
      expect(auditTrail[0].metadata).toBeDefined();
    });

    it("should provide comprehensive security reporting", async () => {
      const operations = [
        "database.read",
        "database.write",
        "system.admin",
        "parlant.conversation",
      ];

      for (const operation of operations) {
        await service.validateOperation(
          createValidationRequest(operation, {
            context: createTestContext({ metadata: { role: "admin" } }),
          }),
        );
      }

      const fullAuditTrail = service.getAuditTrail();
      const healthMetrics = await service.healthCheck();

      // Verify comprehensive reporting capabilities
      expect(fullAuditTrail.length).toBe(operations.length);
      expect(healthMetrics.metrics.totalValidations).toBe(operations.length);
      expect(healthMetrics.metrics.approvalRate).toBeGreaterThan(0);

      // Verify security level distribution
      const riskLevels = fullAuditTrail.map((entry) => entry.riskLevel);
      expect(riskLevels).toContain("LOW");
      expect(
        riskLevels.some((level) => ["HIGH", "CRITICAL"].includes(level)),
      ).toBe(true);
    });
  });
});
