/**
 * PARLANT Authentication Framework Performance Test Suite
 *
 * Comprehensive performance testing and optimization for enterprise-grade
 * PARLANT authentication system. Validates sub-1000ms response targets,
 * concurrent session handling, security validation performance under load,
 * cache performance, and memory usage optimization.
 *
 * Performance Targets:
 * - Token exchange operations: < 1000ms P95
 * - Session creation/validation: < 500ms P95
 * - Security validation: < 200ms P95
 * - Cache hit rate: > 85%
 * - Memory usage: Stable under load
 * - Concurrent sessions: 1000+ simultaneous
 *
 * @fileoverview PARLANT authentication performance testing suite
 * @version 1.0.0
 * @author Performance Testing Agent
 * @created 2025-09-20
 */

import { Test, TestingModule } from "@nestjs/testing";
import { performance } from "perf_hooks";
import { EventEmitter } from "events";
import {
  ParlantJWTBridgeService,
  ParlantContext,
  JWTBridgeMetrics,
} from "../parlant-jwt-bridge.service";
import {
  ParlantSessionManager,
  ParlantSession,
} from "../parlant-session-manager.service";
import { ParlantSecurityValidator } from "../parlant-security-validator.service";
import { ParlantAuthModule } from "../parlant-auth.module";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

/**
 * Performance test configuration
 */
interface PerformanceTestConfig {
  /** Target response time thresholds */
  responseTimeTargets: {
    tokenExchange: number;
    sessionCreation: number;
    sessionValidation: number;
    securityValidation: number;
  };
  /** Load testing parameters */
  loadTestParams: {
    concurrentUsers: number[];
    testDuration: number;
    rampUpTime: number;
    warmupRequests: number;
  };
  /** Cache performance targets */
  cacheTargets: {
    hitRate: number;
    lookupTime: number;
  };
  /** Memory performance targets */
  memoryTargets: {
    maxHeapIncrease: number; // MB
    maxLeakRate: number; // MB/hour
  };
}

/**
 * Performance test result
 */
interface PerformanceTestResult {
  testName: string;
  executionTime: number;
  responseTimeStats: {
    mean: number;
    median: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  throughputStats: {
    averageRps: number;
    peakRps: number;
    totalRequests: number;
  };
  errorStats: {
    totalErrors: number;
    errorRate: number;
    errorTypes: Record<string, number>;
  };
  resourceStats: {
    memoryUsage: number;
    cpuUsage: number;
    heapGrowth: number;
  };
  cacheStats?: {
    hitRate: number;
    averageLookupTime: number;
  };
  complianceResults: {
    meetsP95Target: boolean;
    meetsP99Target: boolean;
    meetsThroughputTarget: boolean;
    meetsErrorRateTarget: boolean;
  };
}

/**
 * Load test worker data
 */
interface LoadTestWorkerData {
  workerId: string;
  iterations: number;
  testType: "token_exchange" | "session_management" | "security_validation";
  testConfig: any;
}

/**
 * Performance benchmark result
 */
interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  p95Time: number;
  p99Time: number;
  throughput: number;
  memoryImpact: number;
}

describe("PARLANT Authentication Performance Testing Suite", () => {
  let module: TestingModule;
  let jwtBridgeService: ParlantJWTBridgeService;
  let sessionManager: ParlantSessionManager;
  let securityValidator: ParlantSecurityValidator;
  let jwtService: JwtService;

  // Performance test configuration
  const performanceConfig: PerformanceTestConfig = {
    responseTimeTargets: {
      tokenExchange: 1000, // 1 second P95
      sessionCreation: 500, // 500ms P95
      sessionValidation: 200, // 200ms P95
      securityValidation: 200, // 200ms P95
    },
    loadTestParams: {
      concurrentUsers: [10, 50, 100, 250, 500, 1000],
      testDuration: 60000, // 1 minute
      rampUpTime: 10000, // 10 seconds
      warmupRequests: 100,
    },
    cacheTargets: {
      hitRate: 0.85, // 85%
      lookupTime: 10, // 10ms
    },
    memoryTargets: {
      maxHeapIncrease: 100, // 100MB
      maxLeakRate: 50, // 50MB/hour
    },
  };

  // Test data generators
  const generateTestContext = (index: number = 0): ParlantContext => ({
    conversationId: `conv_${Date.now()}_${index}`,
    sessionId: `session_${Date.now()}_${index}`,
    userId: `user_${Date.now()}_${index}`,
    securityLevel: "MODERATE",
    timestamp: new Date(),
    metadata: {
      testIteration: index,
      generatedAt: Date.now(),
    },
  });

  const generateTestToken = (): string => {
    return jwtService.sign({
      sub: `user_${Date.now()}`,
      role: "user",
      permissions: ["read", "write"],
      iat: Math.floor(Date.now() / 1000),
    });
  };

  beforeAll(async () => {
    // Setup testing module with performance optimizations
    module = await Test.createTestingModule({
      imports: [ParlantAuthModule],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: any) => {
              const config = {
                JWT_SECRET: "test-secret-key-for-performance-testing",
                JWT_EXPIRES_IN: "1h",
              };
              return config[key] || defaultValue;
            },
          },
        },
      ],
    }).compile();

    jwtBridgeService = module.get<ParlantJWTBridgeService>(
      ParlantJWTBridgeService,
    );
    sessionManager = module.get<ParlantSessionManager>(ParlantSessionManager);
    securityValidator = module.get<ParlantSecurityValidator>(
      ParlantSecurityValidator,
    );
    jwtService = module.get<JwtService>(JwtService);

    // Warm up services
    await warmupServices();
  });

  afterAll(async () => {
    await module.close();
  });

  /**
   * Warm up services to establish baseline performance
   */
  async function warmupServices(): Promise<void> {
    console.log("🔥 Warming up PARLANT authentication services...");

    const warmupIterations = performanceConfig.loadTestParams.warmupRequests;

    for (let i = 0; i < warmupIterations; i++) {
      try {
        const token = generateTestToken();
        const context = generateTestContext(i);

        // Warm up token exchange
        await jwtBridgeService.exchangeTokens(token, context);

        // Warm up session management
        await sessionManager.createSession(context);

        // Small delay to prevent overwhelming
        if (i % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      } catch (error) {
        // Ignore warmup errors
      }
    }

    console.log("✅ Service warmup completed");
  }

  /**
   * Calculate performance statistics from response times
   */
  function calculatePerformanceStats(
    responseTimes: number[],
  ): PerformanceTestResult["responseTimeStats"] {
    const sorted = [...responseTimes].sort((a, b) => a - b);
    const length = sorted.length;

    if (length === 0) {
      return { mean: 0, median: 0, p95: 0, p99: 0, min: 0, max: 0 };
    }

    const sum = sorted.reduce((acc, time) => acc + time, 0);
    const mean = sum / length;
    const median =
      length % 2 === 0
        ? (sorted[length / 2 - 1] + sorted[length / 2]) / 2
        : sorted[Math.floor(length / 2)];

    const p95Index = Math.floor(length * 0.95);
    const p99Index = Math.floor(length * 0.99);

    return {
      mean,
      median,
      p95: sorted[p95Index] || sorted[length - 1],
      p99: sorted[p99Index] || sorted[length - 1],
      min: sorted[0],
      max: sorted[length - 1],
    };
  }

  /**
   * Execute concurrent load test
   */
  async function executeConcurrentLoadTest(
    testFunction: () => Promise<void>,
    concurrency: number,
    duration: number,
  ): Promise<{
    responseTimes: number[];
    errors: Error[];
    totalRequests: number;
    resourceUsage: { memory: number; heap: number };
  }> {
    const responseTimes: number[] = [];
    const errors: Error[] = [];
    let totalRequests = 0;
    let isRunning = true;

    const initialMemory = process.memoryUsage();

    // Create concurrent workers
    const workers = Array.from({ length: concurrency }, async (_, workerId) => {
      while (isRunning) {
        const startTime = performance.now();

        try {
          await testFunction();
          const endTime = performance.now();
          responseTimes.push(endTime - startTime);
          totalRequests++;
        } catch (error) {
          errors.push(error as Error);
        }

        // Small delay to prevent overwhelming
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    });

    // Run for specified duration
    await new Promise((resolve) => setTimeout(resolve, duration));
    isRunning = false;

    // Wait for all workers to complete
    await Promise.all(workers);

    const finalMemory = process.memoryUsage();

    return {
      responseTimes,
      errors,
      totalRequests,
      resourceUsage: {
        memory: (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024, // MB
        heap: finalMemory.heapUsed / 1024 / 1024, // MB
      },
    };
  }

  describe("Token Exchange Performance Testing", () => {
    it("should validate token exchange latency under load", async () => {
      console.log("🧪 Testing token exchange performance...");

      const testResults: PerformanceTestResult[] = [];

      for (const concurrentUsers of performanceConfig.loadTestParams
        .concurrentUsers) {
        console.log(`Testing with ${concurrentUsers} concurrent users...`);

        const testFunction = async () => {
          const token = generateTestToken();
          const context = generateTestContext();
          await jwtBridgeService.exchangeTokens(token, context);
        };

        const loadTestResult = await executeConcurrentLoadTest(
          testFunction,
          concurrentUsers,
          10000, // 10 second test
        );

        const responseTimeStats = calculatePerformanceStats(
          loadTestResult.responseTimes,
        );
        const throughputStats = {
          averageRps: loadTestResult.totalRequests / 10, // 10 second test
          peakRps: loadTestResult.totalRequests / 10,
          totalRequests: loadTestResult.totalRequests,
        };

        const result: PerformanceTestResult = {
          testName: `Token Exchange - ${concurrentUsers} users`,
          executionTime: 10000,
          responseTimeStats,
          throughputStats,
          errorStats: {
            totalErrors: loadTestResult.errors.length,
            errorRate:
              loadTestResult.errors.length / loadTestResult.totalRequests,
            errorTypes: {},
          },
          resourceStats: {
            memoryUsage: loadTestResult.resourceUsage.memory,
            cpuUsage: 0, // Would need actual CPU monitoring
            heapGrowth: loadTestResult.resourceUsage.heap,
          },
          complianceResults: {
            meetsP95Target:
              responseTimeStats.p95 <
              performanceConfig.responseTimeTargets.tokenExchange,
            meetsP99Target:
              responseTimeStats.p99 <
              performanceConfig.responseTimeTargets.tokenExchange * 2,
            meetsThroughputTarget: throughputStats.averageRps > 100, // 100 RPS minimum
            meetsErrorRateTarget:
              loadTestResult.errors.length / loadTestResult.totalRequests <
              0.01,
          },
        };

        testResults.push(result);

        console.log(
          `  P95: ${responseTimeStats.p95.toFixed(2)}ms, RPS: ${throughputStats.averageRps.toFixed(2)}, Errors: ${loadTestResult.errors.length}`,
        );

        // Validate performance targets
        expect(responseTimeStats.p95).toBeLessThan(
          performanceConfig.responseTimeTargets.tokenExchange,
        );
        expect(responseTimeStats.p99).toBeLessThan(
          performanceConfig.responseTimeTargets.tokenExchange * 2,
        );
        expect(
          loadTestResult.errors.length / loadTestResult.totalRequests,
        ).toBeLessThan(0.01);
      }

      console.log("✅ Token exchange performance validation completed");
    }, 300000); // 5 minute timeout

    it("should maintain performance under sustained load", async () => {
      console.log("🔄 Testing sustained load performance...");

      const sustainedTestDuration = 60000; // 1 minute
      const concurrentUsers = 100;

      const performanceSnapshots: Array<{
        timestamp: number;
        p95ResponseTime: number;
        throughput: number;
        memoryUsage: number;
      }> = [];

      const snapshotInterval = 10000; // 10 seconds
      let testStartTime = Date.now();

      // Start performance monitoring
      const monitoringInterval = setInterval(() => {
        const metrics = jwtBridgeService.getPerformanceMetrics();
        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;

        performanceSnapshots.push({
          timestamp: Date.now() - testStartTime,
          p95ResponseTime: metrics.tokenExchangeLatency || 0,
          throughput: metrics.validationSuccess || 0,
          memoryUsage,
        });
      }, snapshotInterval);

      try {
        const testFunction = async () => {
          const token = generateTestToken();
          const context = generateTestContext();
          await jwtBridgeService.exchangeTokens(token, context);
        };

        const loadTestResult = await executeConcurrentLoadTest(
          testFunction,
          concurrentUsers,
          sustainedTestDuration,
        );

        clearInterval(monitoringInterval);

        // Analyze performance trends
        const initialSnapshot = performanceSnapshots[0];
        const finalSnapshot =
          performanceSnapshots[performanceSnapshots.length - 1];

        if (initialSnapshot && finalSnapshot) {
          // Check for performance degradation
          const responseDegradation =
            (finalSnapshot.p95ResponseTime - initialSnapshot.p95ResponseTime) /
            initialSnapshot.p95ResponseTime;
          const memoryGrowth =
            finalSnapshot.memoryUsage - initialSnapshot.memoryUsage;

          expect(responseDegradation).toBeLessThan(0.2); // Less than 20% degradation
          expect(memoryGrowth).toBeLessThan(
            performanceConfig.memoryTargets.maxHeapIncrease,
          );

          console.log(
            `  Performance degradation: ${(responseDegradation * 100).toFixed(2)}%`,
          );
          console.log(`  Memory growth: ${memoryGrowth.toFixed(2)}MB`);
        }

        console.log("✅ Sustained load performance validation completed");
      } finally {
        clearInterval(monitoringInterval);
      }
    }, 120000); // 2 minute timeout

    it("should validate concurrent session handling performance", async () => {
      console.log("👥 Testing concurrent session handling...");

      const maxConcurrentSessions = 1000;
      const sessionCreationTimes: number[] = [];
      const sessionValidationTimes: number[] = [];

      // Create concurrent sessions
      const sessionPromises = Array.from(
        { length: maxConcurrentSessions },
        async (_, index) => {
          const startTime = performance.now();

          try {
            const context = generateTestContext(index);
            const session = await sessionManager.createSession(context);

            const creationTime = performance.now() - startTime;
            sessionCreationTimes.push(creationTime);

            // Test session validation
            const validationStart = performance.now();
            const retrievedSession = await sessionManager.getSession(
              session.sessionId,
            );
            const validationTime = performance.now() - validationStart;
            sessionValidationTimes.push(validationTime);

            expect(retrievedSession).toBeDefined();
            expect(retrievedSession!.sessionId).toBe(session.sessionId);

            return session;
          } catch (error) {
            console.error(`Session ${index} failed:`, error);
            throw error;
          }
        },
      );

      const sessions = await Promise.all(sessionPromises);

      // Calculate performance statistics
      const creationStats = calculatePerformanceStats(sessionCreationTimes);
      const validationStats = calculatePerformanceStats(sessionValidationTimes);

      // Validate performance targets
      expect(creationStats.p95).toBeLessThan(
        performanceConfig.responseTimeTargets.sessionCreation,
      );
      expect(validationStats.p95).toBeLessThan(
        performanceConfig.responseTimeTargets.sessionValidation,
      );

      console.log(`  Session creation P95: ${creationStats.p95.toFixed(2)}ms`);
      console.log(
        `  Session validation P95: ${validationStats.p95.toFixed(2)}ms`,
      );
      console.log(`  Total sessions created: ${sessions.length}`);

      // Cleanup sessions
      for (const session of sessions) {
        await sessionManager.terminateSession(session.sessionId);
      }

      console.log("✅ Concurrent session handling validation completed");
    }, 180000); // 3 minute timeout
  });

  describe("Cache Performance Testing", () => {
    it("should validate cache performance and hit rates", async () => {
      console.log("💾 Testing cache performance...");

      const cacheTestIterations = 1000;
      const cacheLookupTimes: number[] = [];
      let cacheHits = 0;
      let cacheMisses = 0;

      // Pre-populate cache with some data
      const prePopulateCount = 100;
      for (let i = 0; i < prePopulateCount; i++) {
        const token = generateTestToken();
        const context = generateTestContext(i);
        await jwtBridgeService.exchangeTokens(token, context);
      }

      // Test cache performance
      for (let i = 0; i < cacheTestIterations; i++) {
        const startTime = performance.now();

        // Use existing context for cache hits, new context for cache misses
        const useExistingContext = i < cacheTestIterations * 0.8; // 80% cache hit target
        const context = useExistingContext
          ? generateTestContext(i % prePopulateCount)
          : generateTestContext(i + prePopulateCount);

        const token = generateTestToken();

        try {
          const result = await jwtBridgeService.exchangeTokens(token, context);
          const lookupTime = performance.now() - startTime;
          cacheLookupTimes.push(lookupTime);

          // Analyze cache performance from metrics
          const metrics = jwtBridgeService.getPerformanceMetrics();
          if (metrics.cacheHitRate > 0) {
            cacheHits++;
          } else {
            cacheMisses++;
          }
        } catch (error) {
          console.error(`Cache test iteration ${i} failed:`, error);
        }
      }

      const cacheHitRate = cacheHits / (cacheHits + cacheMisses);
      const cacheStats = calculatePerformanceStats(cacheLookupTimes);

      console.log(`  Cache hit rate: ${(cacheHitRate * 100).toFixed(2)}%`);
      console.log(`  Average lookup time: ${cacheStats.mean.toFixed(2)}ms`);
      console.log(`  P95 lookup time: ${cacheStats.p95.toFixed(2)}ms`);

      // Validate cache performance targets
      expect(cacheHitRate).toBeGreaterThan(
        performanceConfig.cacheTargets.hitRate,
      );
      expect(cacheStats.p95).toBeLessThan(
        performanceConfig.cacheTargets.lookupTime,
      );

      console.log("✅ Cache performance validation completed");
    }, 120000); // 2 minute timeout

    it("should test cache performance under memory pressure", async () => {
      console.log("🧠 Testing cache performance under memory pressure...");

      const largeDataSets: any[] = [];
      const cachePerformanceUnderPressure: number[] = [];

      try {
        // Create memory pressure
        for (let i = 0; i < 1000; i++) {
          largeDataSets.push(
            new Array(10000).fill(`memory-pressure-data-${i}`),
          );
        }

        // Test cache performance under memory pressure
        for (let i = 0; i < 100; i++) {
          const startTime = performance.now();

          const token = generateTestToken();
          const context = generateTestContext(i);
          await jwtBridgeService.exchangeTokens(token, context);

          const responseTime = performance.now() - startTime;
          cachePerformanceUnderPressure.push(responseTime);
        }

        const pressureStats = calculatePerformanceStats(
          cachePerformanceUnderPressure,
        );

        console.log(
          `  P95 under memory pressure: ${pressureStats.p95.toFixed(2)}ms`,
        );

        // Should still meet performance targets under pressure
        expect(pressureStats.p95).toBeLessThan(
          performanceConfig.responseTimeTargets.tokenExchange * 1.5,
        ); // 50% tolerance

        console.log("✅ Cache performance under memory pressure validated");
      } finally {
        // Cleanup memory pressure
        largeDataSets.length = 0;

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }, 60000); // 1 minute timeout
  });

  describe("Security Validation Performance Testing", () => {
    it("should validate security validation performance under load", async () => {
      console.log("🔒 Testing security validation performance...");

      const securityTestCases = [
        { securityLevel: "MINIMAL", expectedTime: 50 },
        { securityLevel: "LOW", expectedTime: 100 },
        { securityLevel: "MODERATE", expectedTime: 200 },
        { securityLevel: "HIGH", expectedTime: 300 },
        { securityLevel: "CRITICAL", expectedTime: 500 },
      ] as const;

      for (const testCase of securityTestCases) {
        const securityValidationTimes: number[] = [];
        const testIterations = 100;

        console.log(`  Testing ${testCase.securityLevel} security level...`);

        for (let i = 0; i < testIterations; i++) {
          const startTime = performance.now();

          try {
            const token = generateTestToken();
            const context: ParlantContext = {
              ...generateTestContext(i),
              securityLevel: testCase.securityLevel,
            };

            await jwtBridgeService.exchangeTokens(token, context);

            const validationTime = performance.now() - startTime;
            securityValidationTimes.push(validationTime);
          } catch (error) {
            console.error(`Security validation ${i} failed:`, error);
          }
        }

        const securityStats = calculatePerformanceStats(
          securityValidationTimes,
        );

        console.log(
          `    P95: ${securityStats.p95.toFixed(2)}ms, Expected: < ${testCase.expectedTime}ms`,
        );

        // Validate security performance targets
        expect(securityStats.p95).toBeLessThan(testCase.expectedTime);
      }

      console.log("✅ Security validation performance completed");
    }, 180000); // 3 minute timeout

    it("should test concurrent security validations", async () => {
      console.log("🔐 Testing concurrent security validations...");

      const concurrentValidations = 500;
      const validationTimes: number[] = [];

      const validationPromises = Array.from(
        { length: concurrentValidations },
        async (_, index) => {
          const startTime = performance.now();

          try {
            const token = generateTestToken();
            const context = generateTestContext(index);

            await jwtBridgeService.exchangeTokens(token, context);

            const validationTime = performance.now() - startTime;
            validationTimes.push(validationTime);
          } catch (error) {
            console.error(`Concurrent validation ${index} failed:`, error);
          }
        },
      );

      await Promise.all(validationPromises);

      const concurrentStats = calculatePerformanceStats(validationTimes);

      console.log(
        `  Concurrent validations P95: ${concurrentStats.p95.toFixed(2)}ms`,
      );
      console.log(`  Total validations: ${validationTimes.length}`);

      // Should handle concurrent validations efficiently
      expect(concurrentStats.p95).toBeLessThan(
        performanceConfig.responseTimeTargets.securityValidation * 2,
      );
      expect(validationTimes.length).toBe(concurrentValidations);

      console.log("✅ Concurrent security validation completed");
    }, 120000); // 2 minute timeout
  });

  describe("Memory Usage and Resource Management", () => {
    it("should validate memory usage patterns", async () => {
      console.log("🧮 Testing memory usage patterns...");

      const initialMemory = process.memoryUsage();
      const memorySnapshots: Array<{
        iteration: number;
        heapUsed: number;
        timestamp: number;
      }> = [];

      const testIterations = 1000;

      for (let i = 0; i < testIterations; i++) {
        const token = generateTestToken();
        const context = generateTestContext(i);

        try {
          await jwtBridgeService.exchangeTokens(token, context);

          // Take memory snapshot every 100 iterations
          if (i % 100 === 0) {
            const currentMemory = process.memoryUsage();
            memorySnapshots.push({
              iteration: i,
              heapUsed: currentMemory.heapUsed / 1024 / 1024, // MB
              timestamp: Date.now(),
            });
          }
        } catch (error) {
          console.error(`Memory test iteration ${i} failed:`, error);
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth =
        (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB

      console.log(`  Memory growth: ${memoryGrowth.toFixed(2)}MB`);
      console.log(
        `  Final heap usage: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      );

      // Analyze memory growth trend
      if (memorySnapshots.length >= 2) {
        const firstSnapshot = memorySnapshots[0];
        const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
        const growthRate =
          (lastSnapshot.heapUsed - firstSnapshot.heapUsed) /
          (testIterations / 100);

        console.log(
          `  Memory growth rate: ${growthRate.toFixed(4)}MB per 100 operations`,
        );

        // Should not have excessive memory growth
        expect(growthRate).toBeLessThan(1); // Less than 1MB per 100 operations
      }

      expect(memoryGrowth).toBeLessThan(
        performanceConfig.memoryTargets.maxHeapIncrease,
      );

      console.log("✅ Memory usage validation completed");
    }, 120000); // 2 minute timeout

    it("should detect and prevent memory leaks", async () => {
      console.log("🔍 Testing for memory leaks...");

      const leakDetectionPhases = 3;
      const operationsPerPhase = 500;
      const memoryBaselines: number[] = [];

      for (let phase = 0; phase < leakDetectionPhases; phase++) {
        console.log(
          `  Memory leak detection phase ${phase + 1}/${leakDetectionPhases}`,
        );

        // Force garbage collection before each phase if available
        if (global.gc) {
          global.gc();
          await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for GC
        }

        const phaseStartMemory = process.memoryUsage().heapUsed;

        // Perform operations
        for (let i = 0; i < operationsPerPhase; i++) {
          const token = generateTestToken();
          const context = generateTestContext(i);

          try {
            await jwtBridgeService.exchangeTokens(token, context);

            // Create and destroy session to test cleanup
            const session = await sessionManager.createSession(context);
            await sessionManager.terminateSession(session.sessionId);
          } catch (error) {
            console.error(`Memory leak test ${i} failed:`, error);
          }
        }

        // Force garbage collection after operations if available
        if (global.gc) {
          global.gc();
          await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for GC
        }

        const phaseEndMemory = process.memoryUsage().heapUsed;
        const phaseMemoryGrowth =
          (phaseEndMemory - phaseStartMemory) / 1024 / 1024; // MB

        memoryBaselines.push(phaseMemoryGrowth);
        console.log(
          `    Phase ${phase + 1} memory growth: ${phaseMemoryGrowth.toFixed(2)}MB`,
        );
      }

      // Analyze memory growth trend across phases
      if (memoryBaselines.length >= 2) {
        const avgGrowthPerPhase =
          memoryBaselines.reduce((sum, growth) => sum + growth, 0) /
          memoryBaselines.length;

        console.log(
          `  Average memory growth per phase: ${avgGrowthPerPhase.toFixed(2)}MB`,
        );

        // Memory growth should stabilize, not increase linearly
        expect(avgGrowthPerPhase).toBeLessThan(20); // Less than 20MB average growth per phase

        // Check for consistent memory leaks (increasing growth each phase)
        const growthTrend = memoryBaselines.slice(1).every(
          (growth, index) => growth <= memoryBaselines[index] * 2, // Each phase shouldn't be more than 2x previous
        );

        expect(growthTrend).toBe(true);
      }

      console.log("✅ Memory leak detection completed");
    }, 300000); // 5 minute timeout
  });

  describe("Performance Benchmarking and Optimization", () => {
    it("should benchmark core operations", async () => {
      console.log("📊 Benchmarking core authentication operations...");

      const benchmarkOperations = [
        {
          name: "Token Exchange",
          operation: async () => {
            const token = generateTestToken();
            const context = generateTestContext();
            return await jwtBridgeService.exchangeTokens(token, context);
          },
        },
        {
          name: "Session Creation",
          operation: async () => {
            const context = generateTestContext();
            return await sessionManager.createSession(context);
          },
        },
        {
          name: "Session Validation",
          operation: async () => {
            const context = generateTestContext();
            const session = await sessionManager.createSession(context);
            const result = await sessionManager.getSession(session.sessionId);
            await sessionManager.terminateSession(session.sessionId);
            return result;
          },
        },
        {
          name: "JWT Signing",
          operation: async () => {
            return jwtService.sign({ test: "data" });
          },
        },
        {
          name: "JWT Verification",
          operation: async () => {
            const token = jwtService.sign({ test: "data" });
            return jwtService.verify(token);
          },
        },
      ];

      const benchmarkResults: BenchmarkResult[] = [];

      for (const benchmark of benchmarkOperations) {
        console.log(`  Benchmarking ${benchmark.name}...`);

        const iterations = 1000;
        const times: number[] = [];
        const memoryBefore = process.memoryUsage().heapUsed;

        const startTime = performance.now();

        for (let i = 0; i < iterations; i++) {
          const operationStart = performance.now();

          try {
            await benchmark.operation();
            const operationEnd = performance.now();
            times.push(operationEnd - operationStart);
          } catch (error) {
            console.error(
              `Benchmark ${benchmark.name} iteration ${i} failed:`,
              error,
            );
          }
        }

        const totalTime = performance.now() - startTime;
        const memoryAfter = process.memoryUsage().heapUsed;
        const memoryImpact = (memoryAfter - memoryBefore) / 1024 / 1024; // MB

        if (times.length > 0) {
          const sortedTimes = [...times].sort((a, b) => a - b);
          const result: BenchmarkResult = {
            operation: benchmark.name,
            iterations: times.length,
            totalTime,
            averageTime:
              times.reduce((sum, time) => sum + time, 0) / times.length,
            minTime: Math.min(...times),
            maxTime: Math.max(...times),
            p95Time: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
            p99Time: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
            throughput: times.length / (totalTime / 1000), // ops/sec
            memoryImpact,
          };

          benchmarkResults.push(result);

          console.log(`    Average: ${result.averageTime.toFixed(2)}ms`);
          console.log(`    P95: ${result.p95Time.toFixed(2)}ms`);
          console.log(
            `    Throughput: ${result.throughput.toFixed(2)} ops/sec`,
          );
          console.log(`    Memory impact: ${result.memoryImpact.toFixed(2)}MB`);
        }
      }

      // Validate benchmark results against targets
      const tokenExchangeBenchmark = benchmarkResults.find(
        (r) => r.operation === "Token Exchange",
      );
      if (tokenExchangeBenchmark) {
        expect(tokenExchangeBenchmark.p95Time).toBeLessThan(
          performanceConfig.responseTimeTargets.tokenExchange,
        );
        expect(tokenExchangeBenchmark.throughput).toBeGreaterThan(100); // 100 ops/sec minimum
      }

      const sessionBenchmark = benchmarkResults.find(
        (r) => r.operation === "Session Creation",
      );
      if (sessionBenchmark) {
        expect(sessionBenchmark.p95Time).toBeLessThan(
          performanceConfig.responseTimeTargets.sessionCreation,
        );
      }

      console.log("✅ Performance benchmarking completed");
    }, 300000); // 5 minute timeout

    it("should validate enterprise-grade performance under realistic load", async () => {
      console.log(
        "🏢 Testing enterprise-grade performance under realistic load...",
      );

      const enterpriseLoadTest = {
        duration: 120000, // 2 minutes
        concurrentUsers: 500,
        requestVariations: [
          { type: "token_exchange", weight: 0.4 },
          { type: "session_create", weight: 0.3 },
          { type: "session_validate", weight: 0.2 },
          { type: "session_terminate", weight: 0.1 },
        ],
      };

      const performanceMetrics = {
        tokenExchange: [] as number[],
        sessionCreate: [] as number[],
        sessionValidate: [] as number[],
        sessionTerminate: [] as number[],
      };

      const errors: Error[] = [];
      let totalOperations = 0;

      console.log(
        `  Running enterprise load test for ${enterpriseLoadTest.duration / 1000} seconds with ${enterpriseLoadTest.concurrentUsers} concurrent users...`,
      );

      const testFunction = async () => {
        // Randomly select operation based on weights
        const random = Math.random();
        let cumulativeWeight = 0;
        let selectedOperation = "token_exchange";

        for (const variation of enterpriseLoadTest.requestVariations) {
          cumulativeWeight += variation.weight;
          if (random <= cumulativeWeight) {
            selectedOperation = variation.type;
            break;
          }
        }

        const startTime = performance.now();

        try {
          switch (selectedOperation) {
            case "token_exchange":
              const token = generateTestToken();
              const context = generateTestContext();
              await jwtBridgeService.exchangeTokens(token, context);
              performanceMetrics.tokenExchange.push(
                performance.now() - startTime,
              );
              break;

            case "session_create":
              const createContext = generateTestContext();
              await sessionManager.createSession(createContext);
              performanceMetrics.sessionCreate.push(
                performance.now() - startTime,
              );
              break;

            case "session_validate":
              const validateContext = generateTestContext();
              const session =
                await sessionManager.createSession(validateContext);
              await sessionManager.getSession(session.sessionId);
              performanceMetrics.sessionValidate.push(
                performance.now() - startTime,
              );
              break;

            case "session_terminate":
              const terminateContext = generateTestContext();
              const sessionToTerminate =
                await sessionManager.createSession(terminateContext);
              await sessionManager.terminateSession(
                sessionToTerminate.sessionId,
              );
              performanceMetrics.sessionTerminate.push(
                performance.now() - startTime,
              );
              break;
          }

          totalOperations++;
        } catch (error) {
          errors.push(error as Error);
        }
      };

      const loadTestResult = await executeConcurrentLoadTest(
        testFunction,
        enterpriseLoadTest.concurrentUsers,
        enterpriseLoadTest.duration,
      );

      // Analyze results
      const results = {
        tokenExchange: calculatePerformanceStats(
          performanceMetrics.tokenExchange,
        ),
        sessionCreate: calculatePerformanceStats(
          performanceMetrics.sessionCreate,
        ),
        sessionValidate: calculatePerformanceStats(
          performanceMetrics.sessionValidate,
        ),
        sessionTerminate: calculatePerformanceStats(
          performanceMetrics.sessionTerminate,
        ),
      };

      const totalThroughput =
        totalOperations / (enterpriseLoadTest.duration / 1000);
      const errorRate = errors.length / totalOperations;

      console.log(`  Total operations: ${totalOperations}`);
      console.log(
        `  Overall throughput: ${totalThroughput.toFixed(2)} ops/sec`,
      );
      console.log(`  Error rate: ${(errorRate * 100).toFixed(3)}%`);
      console.log(
        `  Memory growth: ${loadTestResult.resourceUsage.memory.toFixed(2)}MB`,
      );

      console.log("  Operation Performance:");
      Object.entries(results).forEach(([operation, stats]) => {
        if (stats.mean > 0) {
          console.log(
            `    ${operation}: P95=${stats.p95.toFixed(2)}ms, P99=${stats.p99.toFixed(2)}ms`,
          );
        }
      });

      // Validate enterprise requirements
      expect(results.tokenExchange.p95).toBeLessThan(
        performanceConfig.responseTimeTargets.tokenExchange,
      );
      expect(results.sessionCreate.p95).toBeLessThan(
        performanceConfig.responseTimeTargets.sessionCreation,
      );
      expect(results.sessionValidate.p95).toBeLessThan(
        performanceConfig.responseTimeTargets.sessionValidation,
      );
      expect(totalThroughput).toBeGreaterThan(500); // 500 ops/sec minimum for enterprise
      expect(errorRate).toBeLessThan(0.001); // Less than 0.1% error rate
      expect(loadTestResult.resourceUsage.memory).toBeLessThan(
        performanceConfig.memoryTargets.maxHeapIncrease,
      );

      console.log("✅ Enterprise-grade performance validation completed");
    }, 300000); // 5 minute timeout
  });

  describe("Performance Regression Detection", () => {
    it("should detect performance regressions", async () => {
      console.log("📈 Testing performance regression detection...");

      // Establish baseline performance
      const baselineIterations = 100;
      const baselineResponseTimes: number[] = [];

      console.log("  Establishing performance baseline...");
      for (let i = 0; i < baselineIterations; i++) {
        const startTime = performance.now();

        const token = generateTestToken();
        const context = generateTestContext(i);
        await jwtBridgeService.exchangeTokens(token, context);

        baselineResponseTimes.push(performance.now() - startTime);
      }

      const baselineStats = calculatePerformanceStats(baselineResponseTimes);
      console.log(`  Baseline P95: ${baselineStats.p95.toFixed(2)}ms`);

      // Simulate performance regression by introducing artificial delays
      const originalExchangeTokens =
        jwtBridgeService.exchangeTokens.bind(jwtBridgeService);

      // Add 200ms delay to simulate regression
      const regressedExchangeTokens = async (
        token: string,
        context: ParlantContext,
      ) => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return originalExchangeTokens(token, context);
      };

      // Replace method temporarily
      (jwtBridgeService as any).exchangeTokens = regressedExchangeTokens;

      try {
        // Test with artificial regression
        const regressionTestIterations = 50;
        const regressionResponseTimes: number[] = [];

        console.log("  Testing with simulated regression...");
        for (let i = 0; i < regressionTestIterations; i++) {
          const startTime = performance.now();

          const token = generateTestToken();
          const context = generateTestContext(i);
          await jwtBridgeService.exchangeTokens(token, context);

          regressionResponseTimes.push(performance.now() - startTime);
        }

        const regressionStats = calculatePerformanceStats(
          regressionResponseTimes,
        );
        console.log(`  Regression P95: ${regressionStats.p95.toFixed(2)}ms`);

        // Detect regression
        const regressionPercentage =
          ((regressionStats.p95 - baselineStats.p95) / baselineStats.p95) * 100;
        console.log(
          `  Detected regression: ${regressionPercentage.toFixed(2)}%`,
        );

        // Should detect the introduced regression
        expect(regressionPercentage).toBeGreaterThan(50); // Should detect significant regression
        expect(regressionStats.p95).toBeGreaterThan(baselineStats.p95 * 1.5); // 50% regression threshold
      } finally {
        // Restore original method
        (jwtBridgeService as any).exchangeTokens = originalExchangeTokens;
      }

      // Verify restoration
      const restoredResponseTimes: number[] = [];
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();

        const token = generateTestToken();
        const context = generateTestContext(i);
        await jwtBridgeService.exchangeTokens(token, context);

        restoredResponseTimes.push(performance.now() - startTime);
      }

      const restoredStats = calculatePerformanceStats(restoredResponseTimes);
      console.log(`  Restored P95: ${restoredStats.p95.toFixed(2)}ms`);

      // Should be back to baseline performance
      expect(restoredStats.p95).toBeLessThan(baselineStats.p95 * 1.2); // Within 20% of baseline

      console.log("✅ Performance regression detection completed");
    }, 180000); // 3 minute timeout
  });
});
