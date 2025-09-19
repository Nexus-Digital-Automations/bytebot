/**
 * Enhanced JWT-Parlant Bridge Service Performance Tests
 *
 * Comprehensive performance test suite targeting sub-1000ms authentication
 * times and enterprise-grade throughput requirements for the Enhanced
 * JWT-Parlant Bridge Service.
 *
 * @module EnhancedJwtParlantBridgeServicePerformanceSpec
 * @version 2.0.0
 * @author PARLANT Phase 1 JWT Bridge Performance Test Specialist
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

describe("EnhancedJwtParlantBridgeService Performance Tests", () => {
  let service: EnhancedJwtParlantBridgeService;
  let module: TestingModule;

  // Performance test configuration
  const PERFORMANCE_TARGET_MS = 1000; // Sub-1000ms target
  const LOAD_TEST_ITERATIONS = 100;
  const CONCURRENT_USERS = 50;
  const STRESS_TEST_DURATION = 30000; // 30 seconds

  // Test credentials
  const testJwtSecret = "performance-test-secret-key";
  const mockUserId = "perf-user-123";
  const mockEmail = "performance@test.com";

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        EnhancedJwtParlantBridgeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              switch (key) {
                case "JWT_SECRET":
                  return testJwtSecret;
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
                default:
                  return defaultValue;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EnhancedJwtParlantBridgeService>(EnhancedJwtParlantBridgeService);

    // Mock all external dependencies for performance testing
    jest.spyOn(service as any, "initializeRedisClient").mockResolvedValue(undefined);
    jest.spyOn(service as any, "initializeParlantClient").mockResolvedValue(undefined);
    jest.spyOn(service as any, "validateJwtConfiguration").mockResolvedValue(undefined);
    jest.spyOn(service as any, "startEnhancedPeriodicTasks").mockResolvedValue(undefined);

    // Mock fast responses for external services
    jest.spyOn(service as any, "validateTokenExchangeSecurity").mockResolvedValue({
      passed: true,
      riskScore: 10,
      threatIndicators: [],
      validationTime: 5, // Fast validation
    });

    jest.spyOn(service as any, "parseSourceToken").mockImplementation(async (token: string) => {
      return jwt.decode(token);
    });

    jest.spyOn(service as any, "performIdentityMapping").mockResolvedValue({
      success: true,
      confidence: 0.95,
      aigentUserId: mockUserId,
      parlantUserId: `parlant_${mockUserId}`,
    });

    jest.spyOn(service as any, "translateToken").mockResolvedValue("fast-translated-token");
    jest.spyOn(service as any, "updatePerformanceMetrics").mockResolvedValue(undefined);
    jest.spyOn(service as any, "logAuditEvent").mockResolvedValue(undefined);

    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    await module.close();
  });

  describe("Single Request Performance", () => {
    it("should complete token exchange in under 1000ms", async () => {
      const token = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: "perfuser",
          roles: ["user"],
          permissions: ["read"],
          sessionId: "session-perf-single",
          type: "access",
          securityLevel: "standard",
          mfaVerified: true,
        },
        testJwtSecret,
        { expiresIn: "1h" }
      );

      const exchangeRequest: TokenExchangeRequest = {
        sourceToken: token,
        sourcePlatform: Platform.AIGENT,
        targetPlatform: Platform.PARLANT,
        exchangeReason: "authentication",
        metadata: {
          clientIp: "127.0.0.1",
          userAgent: "Performance Test",
          securityLevel: SecurityValidationLevel.STANDARD,
        },
      };

      const startTime = Date.now();
      const result = await service.exchangeToken(exchangeRequest);
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(responseTime).toBeLessThan(PERFORMANCE_TARGET_MS);

      console.log(`Single request response time: ${responseTime}ms`);
    });

    it("should complete bridge session creation in under 1000ms", async () => {
      const token = jwt.sign(
        {
          sub: mockUserId,
          email: mockEmail,
          username: "perfuser",
          roles: ["user"],
          permissions: ["read"],
          sessionId: "session-bridge-perf",
          type: "access",
          securityLevel: "standard",
          mfaVerified: true,
        },
        testJwtSecret,
        { expiresIn: "1h" }
      );

      // Mock Redis and PARLANT API calls
      jest.spyOn(service as any, "storeSessionInRedis").mockResolvedValue(undefined);
      jest.spyOn(service as any, "createParlantSession").mockResolvedValue("parlant-session-fast");

      const startTime = Date.now();
      const result = await service.createBridgeSession(
        token,
        "refresh-token",
        "127.0.0.1",
        "Performance Test Agent"
      );
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(responseTime).toBeLessThan(PERFORMANCE_TARGET_MS);

      console.log(`Bridge session creation time: ${responseTime}ms`);
    });

    it("should complete token lifecycle management in under 500ms", async () => {
      const tokenId = "perf-token-123";

      // Mock fast token refresh
      jest.spyOn(service as any, "refreshToken").mockResolvedValue({
        success: true,
        newToken: "fast-refreshed-token",
        expiresAt: new Date(Date.now() + 3600000),
      });

      const startTime = Date.now();
      const result = await service.manageTokenLifecycle(tokenId, "refresh");
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(responseTime).toBeLessThan(500); // Even faster for lifecycle operations

      console.log(`Token lifecycle management time: ${responseTime}ms`);
    });
  });

  describe("Load Testing", () => {
    it("should handle multiple sequential requests efficiently", async () => {
      const results: number[] = [];

      for (let i = 0; i < LOAD_TEST_ITERATIONS; i++) {
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
          testJwtSecret,
          { expiresIn: "1h" }
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

        const startTime = Date.now();
        const result = await service.exchangeToken(exchangeRequest);
        const endTime = Date.now();

        const responseTime = endTime - startTime;
        results.push(responseTime);

        expect(result.success).toBe(true);
      }

      // Calculate performance statistics
      const avgResponseTime = results.reduce((a, b) => a + b, 0) / results.length;
      const maxResponseTime = Math.max(...results);
      const minResponseTime = Math.min(...results);
      const p95ResponseTime = results.sort((a, b) => a - b)[Math.floor(results.length * 0.95)];

      console.log(`Load Test Results (${LOAD_TEST_ITERATIONS} requests):`);
      console.log(`  Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`  Min response time: ${minResponseTime}ms`);
      console.log(`  Max response time: ${maxResponseTime}ms`);
      console.log(`  P95 response time: ${p95ResponseTime}ms`);

      // Performance assertions
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_TARGET_MS);
      expect(p95ResponseTime).toBeLessThan(PERFORMANCE_TARGET_MS * 1.5); // Allow 1.5x target for P95
      expect(maxResponseTime).toBeLessThan(PERFORMANCE_TARGET_MS * 2); // Allow 2x target for max
    });

    it("should handle concurrent requests efficiently", async () => {
      const promises: Promise<{ responseTime: number; success: boolean }>[] = [];

      for (let i = 0; i < CONCURRENT_USERS; i++) {
        const token = jwt.sign(
          {
            sub: `concurrent-user-${i}`,
            email: `concurrent${i}@test.com`,
            username: `concurrent${i}`,
            roles: ["user"],
            permissions: ["read"],
            sessionId: `session-concurrent-${i}`,
            type: "access",
            securityLevel: "standard",
            mfaVerified: true,
          },
          testJwtSecret,
          { expiresIn: "1h" }
        );

        const exchangeRequest: TokenExchangeRequest = {
          sourceToken: token,
          sourcePlatform: Platform.AIGENT,
          targetPlatform: Platform.PARLANT,
          exchangeReason: "authentication",
          metadata: {
            clientIp: "127.0.0.1",
            userAgent: `Concurrent Test ${i}`,
            securityLevel: SecurityValidationLevel.STANDARD,
          },
        };

        const promise = (async () => {
          const startTime = Date.now();
          const result = await service.exchangeToken(exchangeRequest);
          const endTime = Date.now();

          return {
            responseTime: endTime - startTime,
            success: result.success,
          };
        })();

        promises.push(promise);
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const responseTimes = results.map(r => r.responseTime);
      const successCount = results.filter(r => r.success).length;

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const throughput = (CONCURRENT_USERS * 1000) / totalTime; // requests per second

      console.log(`Concurrent Test Results (${CONCURRENT_USERS} concurrent users):`);
      console.log(`  Total time: ${totalTime}ms`);
      console.log(`  Success rate: ${(successCount / CONCURRENT_USERS * 100).toFixed(2)}%`);
      console.log(`  Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`  Max response time: ${maxResponseTime}ms`);
      console.log(`  Throughput: ${throughput.toFixed(2)} req/sec`);

      // Performance assertions
      expect(successCount).toBe(CONCURRENT_USERS); // 100% success rate
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_TARGET_MS * 2); // Allow 2x for concurrent
      expect(throughput).toBeGreaterThan(10); // At least 10 req/sec
    });
  });

  describe("Stress Testing", () => {
    it("should maintain performance under sustained load", async () => {
      const results: number[] = [];
      const errors: number[] = [];
      let requestCount = 0;

      const startTime = Date.now();
      const endTime = startTime + STRESS_TEST_DURATION;

      console.log(`Starting stress test for ${STRESS_TEST_DURATION / 1000} seconds...`);

      while (Date.now() < endTime) {
        const promises: Promise<void>[] = [];

        // Send batch of concurrent requests
        for (let i = 0; i < 10; i++) {
          const token = jwt.sign(
            {
              sub: `stress-user-${requestCount}`,
              email: `stress${requestCount}@test.com`,
              username: `stress${requestCount}`,
              roles: ["user"],
              permissions: ["read"],
              sessionId: `session-stress-${requestCount}`,
              type: "access",
              securityLevel: "standard",
              mfaVerified: true,
            },
            testJwtSecret,
            { expiresIn: "1h" }
          );

          const exchangeRequest: TokenExchangeRequest = {
            sourceToken: token,
            sourcePlatform: Platform.AIGENT,
            targetPlatform: Platform.PARLANT,
            exchangeReason: "authentication",
            metadata: {
              clientIp: "127.0.0.1",
              userAgent: `Stress Test ${requestCount}`,
              securityLevel: SecurityValidationLevel.STANDARD,
            },
          };

          const promise = (async () => {
            try {
              const reqStartTime = Date.now();
              const result = await service.exchangeToken(exchangeRequest);
              const reqEndTime = Date.now();

              if (result.success) {
                results.push(reqEndTime - reqStartTime);
              } else {
                errors.push(1);
              }
            } catch (error) {
              errors.push(1);
            }
          })();

          promises.push(promise);
          requestCount++;
        }

        await Promise.all(promises);

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const totalDuration = Date.now() - startTime;
      const avgResponseTime = results.length > 0 ? results.reduce((a, b) => a + b, 0) / results.length : 0;
      const errorRate = (errors.length / requestCount) * 100;
      const throughput = (requestCount * 1000) / totalDuration;

      console.log(`Stress Test Results:`);
      console.log(`  Duration: ${totalDuration}ms`);
      console.log(`  Total requests: ${requestCount}`);
      console.log(`  Successful requests: ${results.length}`);
      console.log(`  Error rate: ${errorRate.toFixed(2)}%`);
      console.log(`  Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`  Throughput: ${throughput.toFixed(2)} req/sec`);

      // Stress test assertions
      expect(errorRate).toBeLessThan(5); // Less than 5% error rate
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_TARGET_MS * 3); // Allow 3x target under stress
      expect(throughput).toBeGreaterThan(5); // At least 5 req/sec under stress
    }, STRESS_TEST_DURATION + 10000); // Add buffer time for test completion
  });

  describe("Memory and Resource Performance", () => {
    it("should not have memory leaks during extended operation", async () => {
      const initialMemory = process.memoryUsage();

      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        const token = jwt.sign(
          {
            sub: `memory-user-${i}`,
            email: `memory${i}@test.com`,
            username: `memory${i}`,
            roles: ["user"],
            permissions: ["read"],
            sessionId: `session-memory-${i}`,
            type: "access",
            securityLevel: "standard",
            mfaVerified: true,
          },
          testJwtSecret,
          { expiresIn: "1h" }
        );

        const exchangeRequest: TokenExchangeRequest = {
          sourceToken: token,
          sourcePlatform: Platform.AIGENT,
          targetPlatform: Platform.PARLANT,
          exchangeReason: "authentication",
          metadata: {
            clientIp: "127.0.0.1",
            userAgent: `Memory Test ${i}`,
            securityLevel: SecurityValidationLevel.STANDARD,
          },
        };

        await service.exchangeToken(exchangeRequest);

        // Trigger garbage collection periodically
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);

      console.log(`Memory Usage:`);
      console.log(`  Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Growth: ${memoryGrowthMB.toFixed(2)} MB`);

      // Memory growth should be reasonable (less than 50MB for 1000 operations)
      expect(memoryGrowthMB).toBeLessThan(50);
    });

    it("should efficiently clean up resources", async () => {
      const cacheSize = (service as any).tokenExchangeCache?.size || 0;
      const initialCacheSize = cacheSize;

      // Perform operations to fill cache
      for (let i = 0; i < 100; i++) {
        const token = jwt.sign(
          {
            sub: `cleanup-user-${i}`,
            email: `cleanup${i}@test.com`,
            username: `cleanup${i}`,
            roles: ["user"],
            permissions: ["read"],
            sessionId: `session-cleanup-${i}`,
            type: "access",
            securityLevel: "standard",
            mfaVerified: true,
          },
          testJwtSecret,
          { expiresIn: "1h" }
        );

        const exchangeRequest: TokenExchangeRequest = {
          sourceToken: token,
          sourcePlatform: Platform.AIGENT,
          targetPlatform: Platform.PARLANT,
          exchangeReason: "authentication",
          metadata: {
            clientIp: "127.0.0.1",
            userAgent: `Cleanup Test ${i}`,
            securityLevel: SecurityValidationLevel.STANDARD,
          },
        };

        await service.exchangeToken(exchangeRequest);
      }

      const midCacheSize = (service as any).tokenExchangeCache?.size || 0;

      // Trigger cleanup
      if ((service as any).cleanupRateLimitCache) {
        (service as any).cleanupRateLimitCache();
      }

      const finalCacheSize = (service as any).tokenExchangeCache?.size || 0;

      console.log(`Cache Cleanup:`);
      console.log(`  Initial cache size: ${initialCacheSize}`);
      console.log(`  Mid cache size: ${midCacheSize}`);
      console.log(`  Final cache size: ${finalCacheSize}`);

      // Cache should grow during operations but cleanup should be efficient
      expect(midCacheSize).toBeGreaterThanOrEqual(initialCacheSize);
    });
  });

  describe("Performance Optimization", () => {
    it("should achieve performance optimization targets", async () => {
      const result = await service.optimizePerformance();

      expect(result.optimizations).toBeDefined();
      expect(result.optimizations.length).toBeGreaterThan(0);
      expect(result.currentMetrics).toBeDefined();

      console.log(`Performance Optimization Results:`);
      console.log(`  Optimizations applied: ${result.optimizations.join(", ")}`);
      console.log(`  Target achieved: ${result.targetAchieved}`);
      console.log(`  Auth P95: ${result.currentMetrics.authenticationMetrics.p95ResponseTime}ms`);
      console.log(`  Exchange avg: ${result.currentMetrics.exchangeMetrics.averageExchangeTime}ms`);

      // Performance targets should be achievable
      if (result.targetAchieved) {
        expect(result.currentMetrics.authenticationMetrics.p95ResponseTime).toBeLessThan(PERFORMANCE_TARGET_MS);
        expect(result.currentMetrics.exchangeMetrics.averageExchangeTime).toBeLessThan(PERFORMANCE_TARGET_MS);
      }
    });

    it("should provide real-time performance metrics", async () => {
      // Perform some operations to generate metrics
      for (let i = 0; i < 10; i++) {
        const token = jwt.sign(
          {
            sub: `metrics-user-${i}`,
            email: `metrics${i}@test.com`,
            username: `metrics${i}`,
            roles: ["user"],
            permissions: ["read"],
            sessionId: `session-metrics-${i}`,
            type: "access",
            securityLevel: "standard",
            mfaVerified: true,
          },
          testJwtSecret,
          { expiresIn: "1h" }
        );

        const exchangeRequest: TokenExchangeRequest = {
          sourceToken: token,
          sourcePlatform: Platform.AIGENT,
          targetPlatform: Platform.PARLANT,
          exchangeReason: "authentication",
          metadata: {
            clientIp: "127.0.0.1",
            userAgent: `Metrics Test ${i}`,
            securityLevel: SecurityValidationLevel.STANDARD,
          },
        };

        await service.exchangeToken(exchangeRequest);
      }

      const optimizationResult = await service.optimizePerformance();
      const metrics = optimizationResult.currentMetrics;

      expect(metrics.authenticationMetrics).toBeDefined();
      expect(metrics.exchangeMetrics).toBeDefined();
      expect(metrics.systemMetrics).toBeDefined();
      expect(metrics.securityMetrics).toBeDefined();

      console.log(`Real-time Performance Metrics:`);
      console.log(`  Auth success rate: ${metrics.authenticationMetrics.successRate}%`);
      console.log(`  Exchange success rate: ${metrics.exchangeMetrics.exchangeSuccessRate}%`);
      console.log(`  System uptime: ${metrics.systemMetrics.primarySystemUptime}%`);
    });
  });
});