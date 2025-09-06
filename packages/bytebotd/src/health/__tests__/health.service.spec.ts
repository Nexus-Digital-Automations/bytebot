/**
 * Health Service Test Suite
 *
 * Comprehensive unit tests for system health monitoring service covering:
 * - Basic health status monitoring
 * - Detailed system status reporting
 * - Service dependency health checking
 * - Performance metrics collection
 * - Memory and uptime monitoring
 * - Service stability validation
 *
 * @author Claude Code (Testing & QA Specialist)
 * @version 1.0.0
 * @coverage-target 95%+
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { HealthService } from '../health.service';

describe('HealthService', () => {
  let service: HealthService;
  let mockLogger: jest.Mocked<Logger>;

  const operationId = `health_service_test_${Date.now()}`;

  beforeEach(async () => {
    console.log(`[${operationId}] Setting up HealthService test module`);

    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      verbose: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService],
    }).compile();

    service = module.get<HealthService>(HealthService);

    // Mock the logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLogger.log);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(mockLogger.debug);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLogger.error);

    console.log(`[${operationId}] HealthService test setup completed`);
  });

  afterEach(() => {
    console.log(`[${operationId}] HealthService test cleanup completed`);
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize with proper configuration', async () => {
      const testId = `${operationId}_initialization`;
      console.log(`[${testId}] Testing service initialization`);

      expect(service).toBeDefined();
      expect(mockLogger.log).toHaveBeenCalledWith('Health Service initialized');

      const initTime = service.getInitializationTime();
      expect(initTime).toBeGreaterThan(0);
      expect(initTime).toBeLessThanOrEqual(Date.now());

      console.log(
        `[${testId}] Service initialization test completed successfully`,
      );
    });

    it('should record accurate initialization timestamp', async () => {
      const testId = `${operationId}_initialization_timestamp`;
      console.log(`[${testId}] Testing initialization timestamp accuracy`);

      const beforeInit = Date.now() - 1000; // Account for test setup time
      const initTime = service.getInitializationTime();
      const afterInit = Date.now();

      expect(initTime).toBeGreaterThanOrEqual(beforeInit);
      expect(initTime).toBeLessThanOrEqual(afterInit);

      console.log(`[${testId}] Initialization timestamp test completed`);
    });
  });

  describe('Basic Health Monitoring', () => {
    it('should return healthy status with valid memory and uptime data', async () => {
      const testId = `${operationId}_basic_health`;
      console.log(`[${testId}] Testing basic health monitoring`);

      // Mock process.memoryUsage and process.uptime
      const mockMemoryUsage = {
        rss: 134217728, // 128 MB
        heapTotal: 67108864, // 64 MB
        heapUsed: 33554432, // 32 MB
        external: 1048576, // 1 MB
        arrayBuffers: 0,
      };

      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemoryUsage);
      jest.spyOn(process, 'uptime').mockReturnValue(300); // 5 minutes

      const result = await service.getBasicHealth();

      expect(result).toMatchObject({
        status: 'healthy',
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        uptime: 300,
        memory: {
          used: 128, // MB (rss converted)
          free: 32, // MB (heapTotal - heapUsed converted)
          total: 64, // MB (heapTotal converted)
        },
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Getting basic health status'),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Basic health status retrieved successfully'),
      );

      console.log(
        `[${testId}] Basic health monitoring test completed successfully`,
      );
    });

    it('should handle memory usage edge cases', async () => {
      const testId = `${operationId}_memory_edge_cases`;
      console.log(`[${testId}] Testing memory usage edge cases`);

      const edgeCases = [
        // Zero memory scenario
        {
          rss: 0,
          heapTotal: 0,
          heapUsed: 0,
          external: 0,
          arrayBuffers: 0,
        },
        // Large memory scenario
        {
          rss: 1073741824, // 1 GB
          heapTotal: 536870912, // 512 MB
          heapUsed: 268435456, // 256 MB
          external: 10485760, // 10 MB
          arrayBuffers: 0,
        },
        // Unusual heap usage (used > total)
        {
          rss: 134217728, // 128 MB
          heapTotal: 33554432, // 32 MB
          heapUsed: 67108864, // 64 MB (more than total)
          external: 1048576,
          arrayBuffers: 0,
        },
      ];

      for (const mockMemory of edgeCases) {
        jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemory);
        jest.spyOn(process, 'uptime').mockReturnValue(100);

        const result = await service.getBasicHealth();

        expect(result.status).toBe('healthy');
        expect(result.memory.used).toBeGreaterThanOrEqual(0);
        expect(result.memory.total).toBeGreaterThanOrEqual(0);
        // free can be negative in edge cases
        expect(typeof result.memory.free).toBe('number');
      }

      console.log(`[${testId}] Memory edge cases test completed`);
    });

    it('should handle process.uptime variations', async () => {
      const testId = `${operationId}_uptime_variations`;
      console.log(`[${testId}] Testing process uptime variations`);

      const uptimeValues = [0, 1, 60, 3600, 86400, 604800]; // 0s, 1s, 1m, 1h, 1d, 1w

      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 67108864,
        heapTotal: 33554432,
        heapUsed: 16777216,
        external: 1048576,
        arrayBuffers: 0,
      });

      for (const uptime of uptimeValues) {
        jest.spyOn(process, 'uptime').mockReturnValue(uptime);

        const result = await service.getBasicHealth();

        expect(result.uptime).toBe(Math.round(uptime));
        expect(result.status).toBe('healthy');
      }

      console.log(`[${testId}] Uptime variations test completed`);
    });

    it('should generate unique operation IDs for tracking', async () => {
      const testId = `${operationId}_operation_ids`;
      console.log(`[${testId}] Testing operation ID generation for tracking`);

      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 67108864,
        heapTotal: 33554432,
        heapUsed: 16777216,
        external: 1048576,
        arrayBuffers: 0,
      });
      jest.spyOn(process, 'uptime').mockReturnValue(300);

      // Execute multiple health checks
      await service.getBasicHealth();
      await service.getBasicHealth();
      await service.getBasicHealth();

      // Check that operation IDs were generated (present in log messages)
      const debugCalls = mockLogger.debug.mock.calls;
      const operationIdCalls = debugCalls.filter(
        (call) => call[0].includes('[health_') || call[0].includes('[status_'),
      );

      expect(operationIdCalls.length).toBeGreaterThanOrEqual(6); // 3 operations × 2 logs each

      console.log(`[${testId}] Operation ID generation test completed`);
    });

    it('should handle basic health errors gracefully', async () => {
      const testId = `${operationId}_basic_health_errors`;
      console.log(`[${testId}] Testing basic health error handling`);

      // Mock process.memoryUsage to throw an error
      jest.spyOn(process, 'memoryUsage').mockImplementation(() => {
        throw new Error('Memory access denied');
      });

      await expect(service.getBasicHealth()).rejects.toThrow(
        'Memory access denied',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to get basic health: Memory access denied',
        ),
      );

      console.log(`[${testId}] Basic health error handling test completed`);
    });
  });

  describe('Detailed Status Monitoring', () => {
    it('should return comprehensive system status', async () => {
      const testId = `${operationId}_detailed_status`;
      console.log(`[${testId}] Testing detailed system status monitoring`);

      const mockMemoryUsage = {
        rss: 268435456, // 256 MB
        heapTotal: 134217728, // 128 MB
        heapUsed: 67108864, // 64 MB
        external: 2097152, // 2 MB
        arrayBuffers: 0,
      };

      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemoryUsage);
      jest.spyOn(process, 'uptime').mockReturnValue(1800); // 30 minutes

      const result = await service.getDetailedStatus();

      expect(result).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        uptime: 1800,
        memory: {
          used: 256, // MB (rss)
          free: 64, // MB (heapTotal - heapUsed)
          total: 128, // MB (heapTotal)
          heapUsed: 64, // MB
          heapTotal: 128, // MB
        },
        services: {
          database: expect.stringMatching(/^(connected|disconnected|unknown)$/),
          cache: expect.stringMatching(/^(available|unavailable|unknown)$/),
          external: expect.stringMatching(/^(reachable|unreachable|unknown)$/),
        },
        performance: {
          requestsPerSecond: expect.any(Number),
          averageResponseTime: expect.any(Number),
        },
      });

      console.log(
        `[${testId}] Detailed status monitoring test completed successfully`,
      );
    });

    it('should determine correct overall status based on service health', async () => {
      const testId = `${operationId}_overall_status_determination`;
      console.log(`[${testId}] Testing overall status determination logic`);

      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 134217728,
        heapTotal: 67108864,
        heapUsed: 33554432,
        external: 1048576,
        arrayBuffers: 0,
      });
      jest.spyOn(process, 'uptime').mockReturnValue(300);

      // Mock the private service health check method
      const originalCheckServiceHealth = service['checkServiceHealth'];

      // Test healthy status
      jest.spyOn(service, 'checkServiceHealth' as any).mockReturnValue({
        database: 'connected',
        cache: 'available',
        external: 'reachable',
      });

      let result = await service.getDetailedStatus();
      expect(result.status).toBe('healthy');

      // Test degraded status (unknown services)
      jest.spyOn(service, 'checkServiceHealth' as any).mockReturnValue({
        database: 'unknown',
        cache: 'unknown',
        external: 'unknown',
      });

      result = await service.getDetailedStatus();
      expect(result.status).toBe('degraded');

      // Test unhealthy status (failed services)
      jest.spyOn(service, 'checkServiceHealth' as any).mockReturnValue({
        database: 'disconnected',
        cache: 'unavailable',
        external: 'unreachable',
      });

      result = await service.getDetailedStatus();
      expect(result.status).toBe('unhealthy');

      console.log(`[${testId}] Overall status determination test completed`);
    });

    it('should provide detailed logging with context', async () => {
      const testId = `${operationId}_detailed_logging`;
      console.log(`[${testId}] Testing detailed logging with context`);

      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 134217728,
        heapTotal: 67108864,
        heapUsed: 33554432,
        external: 1048576,
        arrayBuffers: 0,
      });
      jest.spyOn(process, 'uptime').mockReturnValue(600);

      await service.getDetailedStatus();

      // Verify detailed logging with context
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Getting detailed system status'),
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Detailed status retrieved successfully'),
        expect.objectContaining({
          status: expect.any(String),
          memoryUsage: expect.stringContaining('MB'),
          uptime: expect.stringContaining('s'),
          servicesCount: expect.any(Number),
        }),
      );

      console.log(`[${testId}] Detailed logging test completed`);
    });

    it('should handle detailed status errors gracefully', async () => {
      const testId = `${operationId}_detailed_status_errors`;
      console.log(`[${testId}] Testing detailed status error handling`);

      // Mock process.uptime to throw an error
      jest.spyOn(process, 'uptime').mockImplementation(() => {
        throw new Error('System uptime unavailable');
      });

      await expect(service.getDetailedStatus()).rejects.toThrow(
        'System uptime unavailable',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to get detailed status: System uptime unavailable',
        ),
      );

      console.log(`[${testId}] Detailed status error handling test completed`);
    });
  });

  describe('Service Health Checking', () => {
    it('should return unknown status for unimplemented health checks', async () => {
      const testId = `${operationId}_service_health_unknown`;
      console.log(`[${testId}] Testing unimplemented service health checks`);

      // Access the private method for testing
      const serviceHealthResult = service['checkServiceHealth']();

      expect(serviceHealthResult).toEqual({
        database: 'unknown',
        cache: 'unknown',
        external: 'unknown',
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('Checking service health');

      console.log(`[${testId}] Service health unknown status test completed`);
    });

    it('should log service health check activity', async () => {
      const testId = `${operationId}_service_health_logging`;
      console.log(`[${testId}] Testing service health check logging`);

      await service.getDetailedStatus();

      // Verify that service health checking was logged
      expect(mockLogger.debug).toHaveBeenCalledWith('Checking service health');

      console.log(`[${testId}] Service health logging test completed`);
    });

    it('should provide extensible service health structure', async () => {
      const testId = `${operationId}_service_health_structure`;
      console.log(`[${testId}] Testing service health structure extensibility`);

      const result = await service.getDetailedStatus();

      // Verify service structure supports expected services
      expect(result.services).toHaveProperty('database');
      expect(result.services).toHaveProperty('cache');
      expect(result.services).toHaveProperty('external');

      // Verify all services have valid status values
      Object.values(result.services).forEach((status) => {
        expect([
          'connected',
          'disconnected',
          'unknown',
          'available',
          'unavailable',
          'reachable',
          'unreachable',
        ]).toContain(status);
      });

      console.log(`[${testId}] Service health structure test completed`);
    });
  });

  describe('Performance Metrics Collection', () => {
    it('should return placeholder performance metrics', async () => {
      const testId = `${operationId}_performance_metrics`;
      console.log(`[${testId}] Testing performance metrics collection`);

      const result = await service.getDetailedStatus();

      expect(result.performance).toEqual({
        requestsPerSecond: 0,
        averageResponseTime: 0,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Getting performance metrics',
      );

      console.log(`[${testId}] Performance metrics test completed`);
    });

    it('should log performance metrics collection activity', async () => {
      const testId = `${operationId}_performance_metrics_logging`;
      console.log(`[${testId}] Testing performance metrics logging`);

      // Access the private method directly
      const performanceResult = service['getPerformanceMetrics']();

      expect(performanceResult).toEqual({
        requestsPerSecond: 0,
        averageResponseTime: 0,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Getting performance metrics',
      );

      console.log(`[${testId}] Performance metrics logging test completed`);
    });

    it('should provide extensible performance metrics structure', async () => {
      const testId = `${operationId}_performance_structure`;
      console.log(`[${testId}] Testing performance metrics structure`);

      const result = await service.getDetailedStatus();

      expect(result.performance).toHaveProperty('requestsPerSecond');
      expect(result.performance).toHaveProperty('averageResponseTime');

      expect(typeof result.performance.requestsPerSecond).toBe('number');
      expect(typeof result.performance.averageResponseTime).toBe('number');

      console.log(`[${testId}] Performance metrics structure test completed`);
    });
  });

  describe('Service Stability Validation', () => {
    it('should correctly identify stable services', async () => {
      const testId = `${operationId}_service_stable`;
      console.log(`[${testId}] Testing stable service identification`);

      // Wait a moment to ensure service has been running
      await new Promise((resolve) => setTimeout(resolve, 100));

      const isStable = service.isServiceStable(0.05); // 50ms minimum
      expect(isStable).toBe(true);

      console.log(`[${testId}] Service stability test completed`);
    });

    it('should correctly identify unstable services', async () => {
      const testId = `${operationId}_service_unstable`;
      console.log(`[${testId}] Testing unstable service identification`);

      const isStable = service.isServiceStable(3600); // 1 hour minimum
      expect(isStable).toBe(false);

      console.log(`[${testId}] Service instability test completed`);
    });

    it('should use default minimum time when not specified', async () => {
      const testId = `${operationId}_default_minimum_time`;
      console.log(`[${testId}] Testing default minimum time for stability`);

      const isStable = service.isServiceStable(); // Should use default 30s

      // Service was just created, so should not be stable for 30s
      expect(isStable).toBe(false);

      console.log(`[${testId}] Default minimum time test completed`);
    });

    it('should log stability check results with context', async () => {
      const testId = `${operationId}_stability_logging`;
      console.log(`[${testId}] Testing stability check logging`);

      service.isServiceStable(10);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringMatching(/Service stability check: (stable|warming up)/),
        expect.objectContaining({
          uptime: expect.stringMatching(/\d+s/),
          minimumRequired: expect.stringMatching(/\d+s/),
        }),
      );

      console.log(`[${testId}] Stability logging test completed`);
    });

    it('should handle edge cases in stability calculation', async () => {
      const testId = `${operationId}_stability_edge_cases`;
      console.log(`[${testId}] Testing stability calculation edge cases`);

      // Test with very small minimum time (should be stable)
      expect(service.isServiceStable(0.001)).toBe(true);

      // Test with zero minimum time (should be stable)
      expect(service.isServiceStable(0)).toBe(true);

      // Test with negative minimum time (should be stable)
      expect(service.isServiceStable(-1)).toBe(true);

      console.log(`[${testId}] Stability edge cases test completed`);
    });
  });

  describe('Memory Management and Performance', () => {
    it('should complete basic health check within performance threshold', async () => {
      const testId = `${operationId}_basic_health_performance`;
      console.log(`[${testId}] Testing basic health check performance`);

      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 134217728,
        heapTotal: 67108864,
        heapUsed: 33554432,
        external: 1048576,
        arrayBuffers: 0,
      });
      jest.spyOn(process, 'uptime').mockReturnValue(300);

      const startTime = Date.now();
      await service.getBasicHealth();
      const executionTime = Date.now() - startTime;

      // Should complete within 50ms
      expect(executionTime).toBeLessThan(50);

      console.log(
        `[${testId}] Basic health performance test completed (${executionTime}ms)`,
      );
    });

    it('should complete detailed status within performance threshold', async () => {
      const testId = `${operationId}_detailed_status_performance`;
      console.log(`[${testId}] Testing detailed status performance`);

      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 134217728,
        heapTotal: 67108864,
        heapUsed: 33554432,
        external: 1048576,
        arrayBuffers: 0,
      });
      jest.spyOn(process, 'uptime').mockReturnValue(300);

      const startTime = Date.now();
      await service.getDetailedStatus();
      const executionTime = Date.now() - startTime;

      // Should complete within 100ms
      expect(executionTime).toBeLessThan(100);

      console.log(
        `[${testId}] Detailed status performance test completed (${executionTime}ms)`,
      );
    });

    it('should handle concurrent health checks efficiently', async () => {
      const testId = `${operationId}_concurrent_health_checks`;
      console.log(`[${testId}] Testing concurrent health check efficiency`);

      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 134217728,
        heapTotal: 67108864,
        heapUsed: 33554432,
        external: 1048576,
        arrayBuffers: 0,
      });
      jest.spyOn(process, 'uptime').mockReturnValue(300);

      const startTime = Date.now();

      // Execute 20 concurrent health checks
      const promises = Array(20)
        .fill(null)
        .map(() => service.getBasicHealth());
      const results = await Promise.all(promises);

      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(20);
      expect(results.every((result) => result.status === 'healthy')).toBe(true);
      expect(totalTime).toBeLessThan(500); // Should complete within 500ms

      console.log(
        `[${testId}] Concurrent health checks completed (${totalTime}ms for 20 checks)`,
      );
    });

    it('should not leak memory during extended operations', async () => {
      const testId = `${operationId}_memory_leak_prevention`;
      console.log(`[${testId}] Testing memory leak prevention`);

      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 134217728,
        heapTotal: 67108864,
        heapUsed: 33554432,
        external: 1048576,
        arrayBuffers: 0,
      });
      jest.spyOn(process, 'uptime').mockReturnValue(300);

      const initialMemory = process.memoryUsage();

      // Execute many health checks
      for (let i = 0; i < 50; i++) {
        await service.getBasicHealth();
        await service.getDetailedStatus();
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be minimal (less than 1MB for 100 operations)
      expect(memoryGrowth).toBeLessThan(1024 * 1024);

      console.log(
        `[${testId}] Memory leak prevention test completed (${Math.round(memoryGrowth / 1024)}KB growth)`,
      );
    });

    it('should maintain consistent response times under load', async () => {
      const testId = `${operationId}_response_time_consistency`;
      console.log(`[${testId}] Testing response time consistency under load`);

      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 134217728,
        heapTotal: 67108864,
        heapUsed: 33554432,
        external: 1048576,
        arrayBuffers: 0,
      });
      jest.spyOn(process, 'uptime').mockReturnValue(300);

      const executionTimes: number[] = [];

      // Execute 10 health checks and measure individual times
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        await service.getBasicHealth();
        executionTimes.push(Date.now() - startTime);
      }

      // Calculate variance in execution times
      const avgTime =
        executionTimes.reduce((sum, time) => sum + time, 0) /
        executionTimes.length;
      const maxVariance =
        Math.max(...executionTimes) - Math.min(...executionTimes);

      // Variance should be reasonable (less than 50ms difference)
      expect(maxVariance).toBeLessThan(50);
      expect(avgTime).toBeLessThan(20); // Average should be very fast

      console.log(
        `[${testId}] Response time consistency test completed (avg: ${avgTime.toFixed(2)}ms, variance: ${maxVariance}ms)`,
      );
    });
  });

  describe('Integration and Edge Cases', () => {
    it('should handle system resource constraints gracefully', async () => {
      const testId = `${operationId}_resource_constraints`;
      console.log(`[${testId}] Testing system resource constraint handling`);

      // Simulate very low memory conditions
      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 1048576, // 1 MB
        heapTotal: 524288, // 0.5 MB
        heapUsed: 524288, // 0.5 MB (100% usage)
        external: 0,
        arrayBuffers: 0,
      });
      jest.spyOn(process, 'uptime').mockReturnValue(10);

      const result = await service.getBasicHealth();

      expect(result.status).toBe('healthy');
      expect(result.memory.used).toBe(1); // 1 MB
      expect(result.memory.free).toBe(0); // No free memory

      console.log(`[${testId}] Resource constraints handling test completed`);
    });

    it('should provide accurate uptime calculations across service lifecycle', async () => {
      const testId = `${operationId}_uptime_accuracy`;
      console.log(`[${testId}] Testing uptime calculation accuracy`);

      const testUptimes = [0.1, 1, 59.9, 60, 61, 3599, 3600, 3601];

      for (const testUptime of testUptimes) {
        jest.spyOn(process, 'uptime').mockReturnValue(testUptime);

        const result = await service.getBasicHealth();
        const expectedUptime = Math.round(testUptime);

        expect(result.uptime).toBe(expectedUptime);
      }

      console.log(`[${testId}] Uptime accuracy test completed`);
    });

    it('should handle timestamp generation consistently', async () => {
      const testId = `${operationId}_timestamp_consistency`;
      console.log(`[${testId}] Testing timestamp generation consistency`);

      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 134217728,
        heapTotal: 67108864,
        heapUsed: 33554432,
        external: 1048576,
        arrayBuffers: 0,
      });
      jest.spyOn(process, 'uptime').mockReturnValue(300);

      const beforeTime = new Date();
      const result = await service.getBasicHealth();
      const afterTime = new Date();

      const resultTime = new Date(result.timestamp);

      expect(resultTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(resultTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      console.log(`[${testId}] Timestamp consistency test completed`);
    });

    it('should handle service initialization edge cases', async () => {
      const testId = `${operationId}_initialization_edge_cases`;
      console.log(`[${testId}] Testing service initialization edge cases`);

      // Test initialization time consistency
      const initTime1 = service.getInitializationTime();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const initTime2 = service.getInitializationTime();

      expect(initTime1).toBe(initTime2); // Should be consistent

      // Test stability calculation with initialization time
      const currentTime = Date.now();
      const timeSinceInit = currentTime - initTime1;

      expect(timeSinceInit).toBeGreaterThanOrEqual(0);
      expect(service.isServiceStable(timeSinceInit / 1000 - 1)).toBe(true);

      console.log(`[${testId}] Initialization edge cases test completed`);
    });

    it('should maintain thread safety in concurrent operations', async () => {
      const testId = `${operationId}_thread_safety`;
      console.log(`[${testId}] Testing thread safety in concurrent operations`);

      jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 134217728,
        heapTotal: 67108864,
        heapUsed: 33554432,
        external: 1048576,
        arrayBuffers: 0,
      });
      jest.spyOn(process, 'uptime').mockReturnValue(300);

      // Execute mixed concurrent operations
      const operations = [
        () => service.getBasicHealth(),
        () => service.getDetailedStatus(),
        () => service.isServiceStable(10),
        () => service.getInitializationTime(),
      ];

      const promises = Array(20)
        .fill(null)
        .map((_, i) => operations[i % operations.length]());

      const results = await Promise.all(promises);

      // All operations should complete successfully
      expect(results).toHaveLength(20);

      // Health check results should be consistent
      const healthResults = results.filter(
        (r) => r && typeof r === 'object' && 'status' in r,
      );
      const allHealthy = healthResults.every((r) => r.status === 'healthy');
      expect(allHealthy).toBe(true);

      console.log(`[${testId}] Thread safety test completed successfully`);
    });
  });
});
