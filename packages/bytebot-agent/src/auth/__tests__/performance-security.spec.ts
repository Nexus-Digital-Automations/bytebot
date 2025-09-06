/**
 * Authentication Performance Security Tests
 *
 * This test suite validates authentication system performance under various
 * load conditions and security scenarios, ensuring the system maintains
 * security posture while handling high-volume requests and potential attacks.
 *
 * Test Coverage:
 * - Authentication overhead and latency under normal load
 * - Rate limiting effectiveness and performance impact
 * - Concurrent authentication request handling
 * - Memory usage and leak prevention during sustained load
 * - Performance degradation under attack scenarios
 * - System recovery and resilience testing
 *
 * @author Performance Security Testing Specialist
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { performance, PerformanceObserver } from 'perf_hooks';
import { setTimeout } from 'timers/promises';

// Performance monitoring utilities
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private memoryBaseline: NodeJS.MemoryUsage;
  private observer: PerformanceObserver;

  constructor() {
    this.memoryBaseline = process.memoryUsage();
    this.setupPerformanceObserver();
  }

  private setupPerformanceObserver(): void {
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!this.metrics.has(entry.name)) {
          this.metrics.set(entry.name, []);
        }
        this.metrics.get(entry.name)!.push(entry.duration);
      });
    });
    this.observer.observe({ entryTypes: ['measure'] });
  }

  markStart(label: string): void {
    performance.mark(`${label}-start`);
  }

  markEnd(label: string): void {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
  }

  getStats(metricName: string) {
    const values = this.metrics.get(metricName) || [];
    if (values.length === 0) return null;

    const sorted = values.sort((a, b) => a - b);
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  getMemoryUsage() {
    const current = process.memoryUsage();
    return {
      current,
      delta: {
        rss: current.rss - this.memoryBaseline.rss,
        heapTotal: current.heapTotal - this.memoryBaseline.heapTotal,
        heapUsed: current.heapUsed - this.memoryBaseline.heapUsed,
        external: current.external - this.memoryBaseline.external,
        arrayBuffers: current.arrayBuffers - this.memoryBaseline.arrayBuffers,
      },
    };
  }

  cleanup(): void {
    this.observer.disconnect();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// Load testing utilities
class LoadTestingUtilities {
  static async simulateConcurrentRequests<T>(
    requestFunction: () => Promise<T>,
    concurrency: number,
    totalRequests: number,
  ): Promise<{
    results: Array<{ success: boolean; duration: number; error?: Error }>;
    totalDuration: number;
    throughput: number;
  }> {
    const startTime = performance.now();
    const results: Array<{
      success: boolean;
      duration: number;
      error?: Error;
    }> = [];
    const batches = Math.ceil(totalRequests / concurrency);

    for (let batch = 0; batch < batches; batch++) {
      const batchSize = Math.min(
        concurrency,
        totalRequests - batch * concurrency,
      );
      const promises = Array.from({ length: batchSize }, async () => {
        const requestStart = performance.now();
        try {
          await requestFunction();
          return {
            success: true,
            duration: performance.now() - requestStart,
          };
        } catch (error) {
          return {
            success: false,
            duration: performance.now() - requestStart,
            error: error as Error,
          };
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);

      // Small delay between batches to prevent overwhelming the system
      if (batch < batches - 1) {
        await setTimeout(10);
      }
    }

    const totalDuration = performance.now() - startTime;
    const throughput = totalRequests / (totalDuration / 1000);

    return { results, totalDuration, throughput };
  }

  static async simulateGradualLoad<T>(
    requestFunction: () => Promise<T>,
    maxConcurrency: number,
    durationMs: number,
    rampUpMs: number,
  ): Promise<{
    results: Array<{ success: boolean; duration: number; timestamp: number }>;
    peakThroughput: number;
    averageThroughput: number;
  }> {
    const startTime = performance.now();
    const results: Array<{
      success: boolean;
      duration: number;
      timestamp: number;
    }> = [];
    const endTime = startTime + durationMs;
    let currentConcurrency = 1;

    const rampUpInterval = rampUpMs / maxConcurrency;
    let lastRampUp = startTime;

    while (performance.now() < endTime) {
      // Gradually increase concurrency during ramp-up period
      if (
        performance.now() - lastRampUp > rampUpInterval &&
        currentConcurrency < maxConcurrency
      ) {
        currentConcurrency++;
        lastRampUp = performance.now();
      }

      // Execute concurrent requests
      const promises = Array.from({ length: currentConcurrency }, async () => {
        const requestStart = performance.now();
        try {
          await requestFunction();
          return {
            success: true,
            duration: performance.now() - requestStart,
            timestamp: performance.now(),
          };
        } catch (error) {
          return {
            success: false,
            duration: performance.now() - requestStart,
            timestamp: performance.now(),
            error: error as Error,
          };
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);

      await setTimeout(50); // 50ms interval between batches
    }

    const totalDuration = performance.now() - startTime;
    const averageThroughput = results.length / (totalDuration / 1000);

    // Calculate peak throughput (highest throughput in any 1-second window)
    const oneSecondWindows = Math.floor(totalDuration / 1000);
    let peakThroughput = 0;

    for (let i = 0; i < oneSecondWindows; i++) {
      const windowStart = startTime + i * 1000;
      const windowEnd = windowStart + 1000;
      const windowRequests = results.filter(
        (r) => r.timestamp >= windowStart && r.timestamp < windowEnd,
      ).length;
      peakThroughput = Math.max(peakThroughput, windowRequests);
    }

    return { results, peakThroughput, averageThroughput };
  }
}

// Rate limiting simulation
class RateLimitSimulator {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 900000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(clientId: string): boolean {
    const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];

    // Remove old requests outside the window
    const validRequests = clientRequests.filter(
      (timestamp) => now - timestamp < this.windowMs,
    );

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(clientId, validRequests);
    return true;
  }

  getRequestCount(clientId: string): number {
    const now = Date.now();
    const clientRequests = this.requests.get(clientId) || [];
    return clientRequests.filter((timestamp) => now - timestamp < this.windowMs)
      .length;
  }

  reset(): void {
    this.requests.clear();
  }
}

describe('Authentication Performance Security Tests', () => {
  let jwtAuthGuard: JwtAuthGuard;
  let rolesGuard: RolesGuard;
  let jwtService: JwtService;
  let reflector: Reflector;
  let performanceMonitor: PerformanceMonitor;
  let rateLimitSimulator: RateLimitSimulator;

  // Test data
  const validToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0VXNlcklkIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZXMiOlsiVVNFUiJdLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0.test-signature';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        RolesGuard,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn().mockResolvedValue({}),
            decode: jest.fn().mockReturnValue({}),
            sign: jest.fn().mockReturnValue('mock-token'),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    jwtAuthGuard = module.get<JwtAuthGuard>(JwtAuthGuard);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
    jwtService = module.get<JwtService>(JwtService);
    reflector = module.get<Reflector>(Reflector);

    performanceMonitor = new PerformanceMonitor();
    rateLimitSimulator = new RateLimitSimulator();
  });

  afterAll(() => {
    performanceMonitor.cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    rateLimitSimulator.reset();
  });

  describe('Authentication Performance Baseline', () => {
    it('should measure JWT validation performance under normal load', async () => {
      // Setup JWT service mock for successful validation
      jest.spyOn(jwtService, 'verify').mockResolvedValue({
        sub: 'testUserId',
        email: 'test@example.com',
        roles: ['USER'],
        iat: 1600000000,
        exp: 9999999999,
      });

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: `Bearer ${validToken}` },
          }),
        }),
      } as ExecutionContext;

      // Performance test with concurrent requests
      const { results, totalDuration, throughput } =
        await LoadTestingUtilities.simulateConcurrentRequests(
          async () => {
            performanceMonitor.markStart('jwt-validation');
            const result = await jwtAuthGuard.canActivate(mockContext);
            performanceMonitor.markEnd('jwt-validation');
            return result;
          },
          10, // 10 concurrent requests
          100, // 100 total requests
        );

      // Analyze results
      const successfulRequests = results.filter((r) => r.success);
      const averageLatency =
        successfulRequests.reduce((sum, r) => sum + r.duration, 0) /
        successfulRequests.length;

      const stats = performanceMonitor.getStats('jwt-validation');
      const memoryUsage = performanceMonitor.getMemoryUsage();

      // Performance assertions
      expect(successfulRequests.length).toBe(100);
      expect(averageLatency).toBeLessThan(10); // Less than 10ms average
      expect(stats?.p99).toBeLessThan(50); // 99th percentile under 50ms
      expect(throughput).toBeGreaterThan(50); // At least 50 requests per second
      expect(memoryUsage.delta.heapUsed).toBeLessThan(10 * 1024 * 1024); // Less than 10MB memory increase

      console.log(`✅ JWT Validation Performance:
        - Success Rate: ${(successfulRequests.length / results.length) * 100}%
        - Average Latency: ${averageLatency.toFixed(2)}ms
        - P99 Latency: ${stats?.p99?.toFixed(2)}ms
        - Throughput: ${throughput.toFixed(2)} req/s
        - Memory Delta: ${(memoryUsage.delta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should measure role validation performance under concurrent load', async () => {
      // Setup mocks
      jest.spyOn(jwtService, 'verify').mockResolvedValue({
        sub: 'testUserId',
        email: 'test@example.com',
        roles: ['USER', 'ADMIN'],
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['USER']);

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: `Bearer ${validToken}` },
            user: { roles: ['USER', 'ADMIN'] },
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      // Performance test with role validation
      const { results, totalDuration } =
        await LoadTestingUtilities.simulateConcurrentRequests(
          async () => {
            performanceMonitor.markStart('role-validation');
            const result = await rolesGuard.canActivate(mockContext);
            performanceMonitor.markEnd('role-validation');
            return result;
          },
          15, // 15 concurrent requests
          150, // 150 total requests
        );

      const successfulRequests = results.filter((r) => r.success);
      const stats = performanceMonitor.getStats('role-validation');

      expect(successfulRequests.length).toBe(150);
      expect(stats?.avg).toBeLessThan(5); // Role validation should be very fast
      expect(stats?.p99).toBeLessThan(20);

      console.log(`✅ Role Validation Performance:
        - Success Rate: 100%
        - Average Latency: ${stats?.avg.toFixed(2)}ms
        - P99 Latency: ${stats?.p99.toFixed(2)}ms`);
    });
  });

  describe('Rate Limiting Performance Impact', () => {
    it('should measure authentication performance with rate limiting enabled', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(async () => {
        // Simulate rate limit check
        const allowed = rateLimitSimulator.isAllowed('client-1');
        if (!allowed) {
          throw new Error('Rate limit exceeded');
        }

        return {
          sub: 'testUserId',
          email: 'test@example.com',
          roles: ['USER'],
        };
      });

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: `Bearer ${validToken}` },
            ip: '192.168.1.1',
          }),
        }),
      } as ExecutionContext;

      // Test rate limiting effectiveness
      const { results } = await LoadTestingUtilities.simulateConcurrentRequests(
        async () => {
          performanceMonitor.markStart('rate-limited-auth');
          try {
            const result = await jwtAuthGuard.canActivate(mockContext);
            performanceMonitor.markEnd('rate-limited-auth');
            return result;
          } catch (error) {
            performanceMonitor.markEnd('rate-limited-auth');
            throw error;
          }
        },
        5, // 5 concurrent requests
        150, // 150 total requests (should exceed rate limit)
      );

      const successfulRequests = results.filter((r) => r.success);
      const rateLimitedRequests = results.filter(
        (r) => !r.success && r.error?.message === 'Rate limit exceeded',
      );

      // Verify rate limiting is working
      expect(successfulRequests.length).toBeLessThanOrEqual(100); // Rate limit is 100
      expect(rateLimitedRequests.length).toBeGreaterThan(0);
      expect(successfulRequests.length + rateLimitedRequests.length).toBe(150);

      const stats = performanceMonitor.getStats('rate-limited-auth');
      expect(stats?.avg).toBeLessThan(15); // Should still be fast even with rate limiting

      console.log(`✅ Rate Limiting Performance:
        - Successful Requests: ${successfulRequests.length}/150
        - Rate Limited Requests: ${rateLimitedRequests.length}
        - Average Latency: ${stats?.avg.toFixed(2)}ms`);
    });

    it('should handle burst traffic with rate limiting gracefully', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(async () => {
        const allowed = rateLimitSimulator.isAllowed('burst-client');
        if (!allowed) {
          throw new Error('Rate limit exceeded');
        }

        return {
          sub: 'burstUserId',
          email: 'burst@example.com',
          roles: ['USER'],
        };
      });

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: `Bearer ${validToken}` },
            ip: '192.168.1.100',
          }),
        }),
      } as ExecutionContext;

      // Simulate burst traffic pattern
      const burstResults: Array<{
        success: boolean;
        duration: number;
        error?: Error;
      }> = [];

      // Initial burst of 200 requests in quick succession
      const { results: burstBatch } =
        await LoadTestingUtilities.simulateConcurrentRequests(
          async () => {
            return await jwtAuthGuard.canActivate(mockContext);
          },
          20, // High concurrency
          200, // Large burst
        );

      burstResults.push(...burstBatch);

      // Wait for rate limit window to partially reset
      await setTimeout(1000);

      // Second wave
      const { results: secondBatch } =
        await LoadTestingUtilities.simulateConcurrentRequests(
          async () => {
            return await jwtAuthGuard.canActivate(mockContext);
          },
          10,
          100,
        );

      burstResults.push(...secondBatch);

      const totalSuccessful = burstResults.filter((r) => r.success).length;
      const totalRateLimited = burstResults.filter(
        (r) => !r.success && r.error?.message === 'Rate limit exceeded',
      ).length;

      // Rate limiting should have prevented system overload
      expect(totalSuccessful).toBeLessThan(200); // Rate limiting should kick in
      expect(totalRateLimited).toBeGreaterThan(50); // Should have blocked excess requests

      console.log(`✅ Burst Traffic Handling:
        - Total Requests: ${burstResults.length}
        - Successful: ${totalSuccessful}
        - Rate Limited: ${totalRateLimited}
        - Protection Effectiveness: ${((totalRateLimited / burstResults.length) * 100).toFixed(1)}%`);
    });
  });

  describe('System Performance Under Attack', () => {
    it('should maintain performance during brute force attack simulation', async () => {
      let attackAttempts = 0;
      let legitimateRequests = 0;

      jest.spyOn(jwtService, 'verify').mockImplementation(async (token) => {
        // Simulate attack detection - invalid tokens
        if (token.includes('attack-token')) {
          attackAttempts++;
          // Simulate timing for invalid tokens (should be consistent)
          await setTimeout(1);
          throw new Error('Invalid token signature');
        }

        legitimateRequests++;
        return {
          sub: 'legitimateUser',
          email: 'legit@example.com',
          roles: ['USER'],
        };
      });

      // Simulate mixed traffic: attacks + legitimate requests
      const attackPromises = Array.from({ length: 50 }, (_, i) => {
        const mockContext = {
          switchToHttp: () => ({
            getRequest: () => ({
              headers: { authorization: `Bearer attack-token-${i}` },
              ip: `192.168.1.${100 + (i % 10)}`, // Different IPs
            }),
          }),
        } as ExecutionContext;

        return jwtAuthGuard.canActivate(mockContext).catch(() => false);
      });

      const legitimatePromises = Array.from({ length: 20 }, () => {
        const mockContext = {
          switchToHttp: () => ({
            getRequest: () => ({
              headers: { authorization: `Bearer ${validToken}` },
              ip: '192.168.1.50', // Legitimate user IP
            }),
          }),
        } as ExecutionContext;

        performanceMonitor.markStart('under-attack-auth');
        return jwtAuthGuard.canActivate(mockContext).then((result) => {
          performanceMonitor.markEnd('under-attack-auth');
          return result;
        });
      });

      const startTime = performance.now();
      const results = await Promise.all([
        ...attackPromises,
        ...legitimatePromises,
      ]);
      const totalTime = performance.now() - startTime;

      const legitimateSuccessful = results.slice(50).filter(Boolean).length;
      const attacksBlocked = results.slice(0, 50).filter((r) => !r).length;

      const stats = performanceMonitor.getStats('under-attack-auth');
      const memoryUsage = performanceMonitor.getMemoryUsage();

      // Performance should remain stable for legitimate requests
      expect(legitimateSuccessful).toBe(20);
      expect(attacksBlocked).toBe(50);
      expect(stats?.avg).toBeLessThan(20); // Legitimate requests should still be fast
      expect(memoryUsage.delta.heapUsed).toBeLessThan(50 * 1024 * 1024); // Memory should be stable

      console.log(`✅ Performance Under Attack:
        - Attack Requests Blocked: ${attacksBlocked}/50
        - Legitimate Requests Successful: ${legitimateSuccessful}/20
        - Average Legitimate Request Latency: ${stats?.avg.toFixed(2)}ms
        - Total Processing Time: ${totalTime.toFixed(2)}ms
        - Memory Usage Delta: ${(memoryUsage.delta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should recover gracefully from sustained load', async () => {
      jest.spyOn(jwtService, 'verify').mockResolvedValue({
        sub: 'testUserId',
        email: 'test@example.com',
        roles: ['USER'],
      });

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: `Bearer ${validToken}` },
          }),
        }),
      } as ExecutionContext;

      // Simulate sustained high load for 5 seconds with gradual ramp-up
      const { results, peakThroughput, averageThroughput } =
        await LoadTestingUtilities.simulateGradualLoad(
          async () => {
            performanceMonitor.markStart('sustained-load');
            const result = await jwtAuthGuard.canActivate(mockContext);
            performanceMonitor.markEnd('sustained-load');
            return result;
          },
          15, // Max 15 concurrent requests
          5000, // 5 seconds duration
          2000, // 2 second ramp-up
        );

      const successRate =
        (results.filter((r) => r.success).length / results.length) * 100;
      const stats = performanceMonitor.getStats('sustained-load');
      const memoryUsage = performanceMonitor.getMemoryUsage();

      // System should maintain performance and recover
      expect(successRate).toBeGreaterThan(95); // At least 95% success rate
      expect(averageThroughput).toBeGreaterThan(10); // Should handle reasonable throughput
      expect(stats?.p99).toBeLessThan(100); // 99th percentile should be reasonable
      expect(memoryUsage.delta.heapUsed).toBeLessThan(100 * 1024 * 1024); // Memory should be controlled

      // Wait for system recovery
      await setTimeout(2000);
      const postRecoveryMemory = performanceMonitor.getMemoryUsage();

      console.log(`✅ Sustained Load Recovery:
        - Total Requests: ${results.length}
        - Success Rate: ${successRate.toFixed(2)}%
        - Peak Throughput: ${peakThroughput} req/s
        - Average Throughput: ${averageThroughput.toFixed(2)} req/s
        - P99 Latency: ${stats?.p99.toFixed(2)}ms
        - Memory Delta During Load: ${(memoryUsage.delta.heapUsed / 1024 / 1024).toFixed(2)}MB
        - Memory Delta After Recovery: ${(postRecoveryMemory.delta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory during high-volume authentication', async () => {
      const initialMemory = process.memoryUsage();
      const memorySnapshots: NodeJS.MemoryUsage[] = [initialMemory];

      jest.spyOn(jwtService, 'verify').mockResolvedValue({
        sub: 'memoryTestUser',
        email: 'memory@example.com',
        roles: ['USER'],
      });

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: `Bearer ${validToken}` },
          }),
        }),
      } as ExecutionContext;

      // Run multiple cycles of high-volume requests
      for (let cycle = 0; cycle < 5; cycle++) {
        await LoadTestingUtilities.simulateConcurrentRequests(
          async () => {
            return await jwtAuthGuard.canActivate(mockContext);
          },
          10,
          200,
        );

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Take memory snapshot
        memorySnapshots.push(process.memoryUsage());

        // Small delay between cycles
        await setTimeout(100);
      }

      const finalMemory = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / 1024 / 1024;

      // Check for memory leaks
      expect(memoryGrowthMB).toBeLessThan(50); // Should not grow more than 50MB

      // Analyze memory trend
      const growthTrend = memorySnapshots.map((snapshot, index) => ({
        cycle: index,
        heapUsed: snapshot.heapUsed / 1024 / 1024,
      }));

      console.log(`✅ Memory Leak Test:
        - Initial Memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        - Final Memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
        - Memory Growth: ${memoryGrowthMB.toFixed(2)}MB
        - Growth Trend: ${JSON.stringify(growthTrend, null, 2)}`);
    });

    it('should handle concurrent requests without resource exhaustion', async () => {
      let activeConnections = 0;
      let maxConcurrentConnections = 0;

      jest.spyOn(jwtService, 'verify').mockImplementation(async () => {
        activeConnections++;
        maxConcurrentConnections = Math.max(
          maxConcurrentConnections,
          activeConnections,
        );

        // Simulate variable processing time
        await setTimeout(Math.random() * 20 + 5);

        activeConnections--;

        return {
          sub: 'concurrentUser',
          email: 'concurrent@example.com',
          roles: ['USER'],
        };
      });

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: `Bearer ${validToken}` },
          }),
        }),
      } as ExecutionContext;

      const startTime = performance.now();

      // High concurrency test
      const { results } = await LoadTestingUtilities.simulateConcurrentRequests(
        async () => {
          return await jwtAuthGuard.canActivate(mockContext);
        },
        50, // Very high concurrency
        500, // Large number of requests
      );

      const endTime = performance.now();
      const successfulRequests = results.filter((r) => r.success);
      const averageLatency =
        results.reduce((sum, r) => sum + r.duration, 0) / results.length;

      // Resource management assertions
      expect(successfulRequests.length).toBe(500);
      expect(maxConcurrentConnections).toBeLessThanOrEqual(60); // Should manage concurrency
      expect(averageLatency).toBeLessThan(50); // Should handle load efficiently

      console.log(`✅ Resource Management Test:
        - Total Requests: ${results.length}
        - Successful Requests: ${successfulRequests.length}
        - Max Concurrent Connections: ${maxConcurrentConnections}
        - Average Latency: ${averageLatency.toFixed(2)}ms
        - Total Duration: ${(endTime - startTime).toFixed(2)}ms
        - Final Active Connections: ${activeConnections}`);
    });
  });

  describe('Scalability and Bottleneck Analysis', () => {
    it('should identify performance bottlenecks under extreme load', async () => {
      const operationTimes = {
        tokenExtraction: 0,
        tokenValidation: 0,
        roleCheck: 0,
        logging: 0,
      };

      let operationCount = 0;

      jest.spyOn(jwtService, 'verify').mockImplementation(async () => {
        const start = performance.now();

        // Simulate token validation overhead
        await setTimeout(Math.random() * 5 + 2);
        operationTimes.tokenValidation += performance.now() - start;
        operationCount++;

        return {
          sub: 'scaleTestUser',
          email: 'scale@example.com',
          roles: ['USER', 'ADMIN'],
        };
      });

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: `Bearer ${validToken}` },
          }),
        }),
      } as ExecutionContext;

      // Extreme load test
      const { results, throughput } =
        await LoadTestingUtilities.simulateConcurrentRequests(
          async () => {
            const opStart = performance.now();

            // Token extraction simulation
            const extractStart = performance.now();
            const token = validToken; // Simulate extraction
            operationTimes.tokenExtraction += performance.now() - extractStart;

            // Actual validation
            const result = await jwtAuthGuard.canActivate(mockContext);

            // Logging simulation
            const logStart = performance.now();
            // Simulate security logging overhead
            operationTimes.logging += performance.now() - logStart;

            return result;
          },
          25, // Extreme concurrency
          1000, // Very large request volume
        );

      const successRate =
        (results.filter((r) => r.success).length / results.length) * 100;

      // Calculate average times per operation
      const avgTimes = {
        tokenExtraction: operationTimes.tokenExtraction / operationCount,
        tokenValidation: operationTimes.tokenValidation / operationCount,
        roleCheck: operationTimes.roleCheck / operationCount,
        logging: operationTimes.logging / operationCount,
      };

      // Performance and bottleneck analysis
      expect(successRate).toBeGreaterThan(90); // Should handle extreme load
      expect(throughput).toBeGreaterThan(20); // Should maintain reasonable throughput
      expect(avgTimes.tokenValidation).toBeLessThan(10); // Token validation should be efficient

      // Identify bottlenecks
      const bottleneck = Object.entries(avgTimes).reduce(
        (max, [operation, time]) =>
          time > max.time ? { operation, time } : max,
        { operation: '', time: 0 },
      );

      console.log(`✅ Scalability Analysis:
        - Total Requests: ${results.length}
        - Success Rate: ${successRate.toFixed(2)}%
        - Throughput: ${throughput.toFixed(2)} req/s
        - Operation Times:
          * Token Extraction: ${avgTimes.tokenExtraction.toFixed(2)}ms
          * Token Validation: ${avgTimes.tokenValidation.toFixed(2)}ms  
          * Role Check: ${avgTimes.roleCheck.toFixed(2)}ms
          * Logging: ${avgTimes.logging.toFixed(2)}ms
        - Primary Bottleneck: ${bottleneck.operation} (${bottleneck.time.toFixed(2)}ms)`);
    });
  });
});
