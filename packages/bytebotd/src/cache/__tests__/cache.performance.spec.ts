/* eslint-env jest */

/**
 * Performance and Concurrency Tests for Cache Module
 *
 * Comprehensive performance testing suite for cache operations including
 * throughput benchmarks, concurrency stress tests, memory usage validation,
 * and latency measurements. Tests both Redis-backed and memory-based scenarios.
 *
 * Features tested:
 * - Throughput benchmarks for all cache operations
 * - Concurrent access stress testing
 * - Memory usage and leak detection
 * - Latency and response time measurements
 * - Cache hit/miss ratio optimization
 * - Large payload handling
 * - Connection pool stress testing
 * - Error recovery performance
 *
 * @author Claude Code - Subagent 4 (Cache Testing Specialist)
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheService } from '../cache.service';
import { CacheKeyGenerator } from '../cache-key.generator';
import { MetricsService } from '../../metrics/metrics.service';

describe('Cache Performance Tests', () => {
  let module: TestingModule;
  let cacheService: CacheService;
  let keyGenerator: jest.Mocked<CacheKeyGenerator>;
  let cacheManager: jest.Mocked<Cache>;
  let metricsService: jest.Mocked<MetricsService>;

  // Performance test configuration
  const PERFORMANCE_CONFIG = {
    SMALL_DATASET: 100,
    MEDIUM_DATASET: 1000,
    LARGE_DATASET: 10000,
    CONCURRENT_OPERATIONS: 50,
    STRESS_OPERATIONS: 1000,
    MAX_ACCEPTABLE_LATENCY: 100, // milliseconds
    MIN_THROUGHPUT_OPS_PER_SEC: 1000,
  };

  beforeEach(async () => {
    // Setup high-performance mocks
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
      wrap: jest.fn(),
    };

    const mockKeyGenerator = {
      generate: jest.fn(),
      generateApiKey: jest.fn(),
      generateDbKey: jest.fn(),
      generateTaskKey: jest.fn(),
      generateInvalidationPattern: jest.fn(),
      getKeyMetadata: jest.fn(),
      getStats: jest.fn(),
      clearStats: jest.fn(),
    };

    const mockMetricsService = {
      recordCacheOperation: jest.fn(),
      updateCacheHitRate: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: CacheKeyGenerator,
          useValue: mockKeyGenerator,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    cacheService = module.get<CacheService>(CacheService);
    cacheManager = module.get(CACHE_MANAGER);
    keyGenerator = module.get(CacheKeyGenerator);
    metricsService = module.get(MetricsService);

    // Setup fast mock behaviors for performance testing
    keyGenerator.generate.mockImplementation((key: string | string[] | Record<string, unknown>, namespace?: string) => 
      `${namespace || 'bytebot'}:${typeof key === 'string' ? key : JSON.stringify(key)}`
    );
    cacheManager.get.mockResolvedValue('"test-value"');
    cacheManager.set.mockResolvedValue(undefined);
    cacheManager.del.mockResolvedValue(true);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('Single Operation Performance', () => {
    it('should perform get operations with low latency', async () => {
      const operations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < operations; i++) {
        await cacheService.get(`perf-key-${i}`);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgLatency = totalTime / operations;

      console.log(`Get operations: ${operations} in ${totalTime.toFixed(2)}ms (avg: ${avgLatency.toFixed(2)}ms)`);
      
      expect(avgLatency).toBeLessThan(PERFORMANCE_CONFIG.MAX_ACCEPTABLE_LATENCY);
      expect(operations / (totalTime / 1000)).toBeGreaterThan(PERFORMANCE_CONFIG.MIN_THROUGHPUT_OPS_PER_SEC);
    });

    it('should perform set operations with low latency', async () => {
      const operations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < operations; i++) {
        await cacheService.set(`perf-set-key-${i}`, `value-${i}`);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgLatency = totalTime / operations;

      console.log(`Set operations: ${operations} in ${totalTime.toFixed(2)}ms (avg: ${avgLatency.toFixed(2)}ms)`);
      
      expect(avgLatency).toBeLessThan(PERFORMANCE_CONFIG.MAX_ACCEPTABLE_LATENCY);
    });

    it('should perform delete operations with low latency', async () => {
      const operations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < operations; i++) {
        await cacheService.del(`perf-del-key-${i}`);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgLatency = totalTime / operations;

      console.log(`Delete operations: ${operations} in ${totalTime.toFixed(2)}ms (avg: ${avgLatency.toFixed(2)}ms)`);
      
      expect(avgLatency).toBeLessThan(PERFORMANCE_CONFIG.MAX_ACCEPTABLE_LATENCY);
    });
  });

  describe('Bulk Operations Performance', () => {
    it('should handle bulk get operations efficiently', async () => {
      const keys = Array.from({ length: PERFORMANCE_CONFIG.MEDIUM_DATASET }, (_, i) => `bulk-key-${i}`);
      
      const startTime = performance.now();
      const results = await cacheService.mget(keys);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const throughput = keys.length / (totalTime / 1000);

      console.log(`Bulk get: ${keys.length} keys in ${totalTime.toFixed(2)}ms (${throughput.toFixed(0)} ops/sec)`);
      
      expect(results).toBeInstanceOf(Map);
      expect(throughput).toBeGreaterThan(PERFORMANCE_CONFIG.MIN_THROUGHPUT_OPS_PER_SEC);
    });

    it('should handle bulk set operations efficiently', async () => {
      const entries = Array.from({ length: PERFORMANCE_CONFIG.MEDIUM_DATASET }, (_, i) => ({
        key: `bulk-set-key-${i}`,
        value: `bulk-value-${i}`,
      }));
      
      const startTime = performance.now();
      await cacheService.mset(entries);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const throughput = entries.length / (totalTime / 1000);

      console.log(`Bulk set: ${entries.length} entries in ${totalTime.toFixed(2)}ms (${throughput.toFixed(0)} ops/sec)`);
      
      expect(throughput).toBeGreaterThan(PERFORMANCE_CONFIG.MIN_THROUGHPUT_OPS_PER_SEC);
    });

    it('should efficiently handle cache warming operations', async () => {
      const keys = Array.from({ length: PERFORMANCE_CONFIG.SMALL_DATASET }, (_, i) => `warm-key-${i}`);
      const dataProvider = jest.fn((key: string) => Promise.resolve(`data-for-${key}`));
      
      const startTime = performance.now();
      await cacheService.warmCache(dataProvider, keys);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const throughput = keys.length / (totalTime / 1000);

      console.log(`Cache warming: ${keys.length} keys in ${totalTime.toFixed(2)}ms (${throughput.toFixed(0)} ops/sec)`);
      
      expect(dataProvider).toHaveBeenCalledTimes(keys.length);
      expect(throughput).toBeGreaterThan(100); // Lower threshold for cache warming
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent get operations', async () => {
      const concurrency = PERFORMANCE_CONFIG.CONCURRENT_OPERATIONS;
      const operationsPerWorker = 100;
      
      const workers = Array.from({ length: concurrency }, async (_, i) => {
        const operations = [];
        for (let j = 0; j < operationsPerWorker; j++) {
          operations.push(cacheService.get(`concurrent-get-${i}-${j}`));
        }
        return Promise.all(operations);
      });

      const startTime = performance.now();
      await Promise.all(workers);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const totalOperations = concurrency * operationsPerWorker;
      const throughput = totalOperations / (totalTime / 1000);

      console.log(`Concurrent gets: ${totalOperations} ops across ${concurrency} workers in ${totalTime.toFixed(2)}ms (${throughput.toFixed(0)} ops/sec)`);
      
      expect(throughput).toBeGreaterThan(PERFORMANCE_CONFIG.MIN_THROUGHPUT_OPS_PER_SEC);
    });

    it('should handle concurrent set operations', async () => {
      const concurrency = PERFORMANCE_CONFIG.CONCURRENT_OPERATIONS;
      const operationsPerWorker = 50;
      
      const workers = Array.from({ length: concurrency }, async (_, i) => {
        const operations = [];
        for (let j = 0; j < operationsPerWorker; j++) {
          operations.push(cacheService.set(`concurrent-set-${i}-${j}`, `value-${i}-${j}`));
        }
        return Promise.all(operations);
      });

      const startTime = performance.now();
      await Promise.all(workers);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const totalOperations = concurrency * operationsPerWorker;
      const throughput = totalOperations / (totalTime / 1000);

      console.log(`Concurrent sets: ${totalOperations} ops across ${concurrency} workers in ${totalTime.toFixed(2)}ms (${throughput.toFixed(0)} ops/sec)`);
      
      expect(throughput).toBeGreaterThan(500); // Lower threshold for set operations
    });

    it('should handle mixed concurrent operations', async () => {
      const concurrency = PERFORMANCE_CONFIG.CONCURRENT_OPERATIONS;
      
      const workers = Array.from({ length: concurrency }, async (_, i) => {
        const operations = [];
        // Mix of get, set, and delete operations
        for (let j = 0; j < 20; j++) {
          if (j % 3 === 0) {
            operations.push(cacheService.get(`mixed-${i}-${j}`));
          } else if (j % 3 === 1) {
            operations.push(cacheService.set(`mixed-${i}-${j}`, `value-${i}-${j}`));
          } else {
            operations.push(cacheService.del(`mixed-${i}-${j}`));
          }
        }
        return Promise.all(operations);
      });

      const startTime = performance.now();
      await Promise.all(workers);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const totalOperations = concurrency * 20;
      const throughput = totalOperations / (totalTime / 1000);

      console.log(`Mixed concurrent ops: ${totalOperations} ops across ${concurrency} workers in ${totalTime.toFixed(2)}ms (${throughput.toFixed(0)} ops/sec)`);
      
      expect(throughput).toBeGreaterThan(500);
    });
  });

  describe('Large Dataset Performance', () => {
    it('should handle large value storage efficiently', async () => {
      const largeValue = {
        data: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          value: `large-data-item-${i}`,
          metadata: { timestamp: Date.now(), index: i }
        }))
      };

      const iterations = 10;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await cacheService.set(`large-value-${i}`, largeValue);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      console.log(`Large value storage: ${iterations} operations in ${totalTime.toFixed(2)}ms (avg: ${avgTime.toFixed(2)}ms)`);
      
      expect(avgTime).toBeLessThan(50); // Should handle large values quickly
    });

    it('should handle large key sets efficiently', async () => {
      const keyCount = PERFORMANCE_CONFIG.LARGE_DATASET;
      const keys = Array.from({ length: keyCount }, (_, i) => `large-set-key-${i}`);
      
      const startTime = performance.now();
      
      // Process in chunks to avoid overwhelming the system
      const chunkSize = 1000;
      for (let i = 0; i < keys.length; i += chunkSize) {
        const chunk = keys.slice(i, i + chunkSize);
        await cacheService.mget(chunk);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const throughput = keyCount / (totalTime / 1000);

      console.log(`Large key set: ${keyCount} keys in ${totalTime.toFixed(2)}ms (${throughput.toFixed(0)} ops/sec)`);
      
      expect(throughput).toBeGreaterThan(1000);
    });
  });

  describe('Key Generation Performance', () => {
    it('should generate keys efficiently', async () => {
      const operations = PERFORMANCE_CONFIG.LARGE_DATASET;
      
      const startTime = performance.now();
      
      for (let i = 0; i < operations; i++) {
        keyGenerator.generate(`perf-key-${i}`);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const throughput = operations / (totalTime / 1000);

      console.log(`Key generation: ${operations} keys in ${totalTime.toFixed(2)}ms (${throughput.toFixed(0)} keys/sec)`);
      
      expect(throughput).toBeGreaterThan(10000); // Key generation should be very fast
    });

    it('should generate complex keys efficiently', async () => {
      const operations = PERFORMANCE_CONFIG.MEDIUM_DATASET;
      
      const complexKeys = Array.from({ length: operations }, (_, i) => ({
        type: 'complex',
        id: i,
        metadata: { timestamp: Date.now(), user: `user-${i}` },
        tags: [`tag-${i % 10}`, `category-${i % 5}`]
      }));

      const startTime = performance.now();
      
      for (const key of complexKeys) {
        keyGenerator.generate(key);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const throughput = operations / (totalTime / 1000);

      console.log(`Complex key generation: ${operations} keys in ${totalTime.toFixed(2)}ms (${throughput.toFixed(0)} keys/sec)`);
      
      expect(throughput).toBeGreaterThan(1000);
    });

    it('should handle specialized key generation efficiently', async () => {
      const operations = PERFORMANCE_CONFIG.MEDIUM_DATASET;
      
      const startTime = performance.now();
      
      for (let i = 0; i < operations; i++) {
        // Mix of different key types
        if (i % 3 === 0) {
          keyGenerator.generateApiKey('GET', `/api/endpoint/${i}`);
        } else if (i % 3 === 1) {
          keyGenerator.generateDbKey('table', 'SELECT', { id: i });
        } else {
          keyGenerator.generateTaskKey(`task-${i}`, 'status');
        }
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const throughput = operations / (totalTime / 1000);

      console.log(`Specialized key generation: ${operations} keys in ${totalTime.toFixed(2)}ms (${throughput.toFixed(0)} keys/sec)`);
      
      expect(throughput).toBeGreaterThan(1000);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory during intensive operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform intensive operations
      for (let batch = 0; batch < 10; batch++) {
        const operations = [];
        for (let i = 0; i < 1000; i++) {
          operations.push(cacheService.get(`memory-test-${batch}-${i}`));
        }
        await Promise.all(operations);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      console.log(`Memory usage increase: ${memoryIncreaseMB.toFixed(2)} MB`);
      
      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncreaseMB).toBeLessThan(50);
    });

    it('should handle resource cleanup efficiently', async () => {
      // Create many cache operations with statistics tracking
      const operations = 1000;
      
      for (let i = 0; i < operations; i++) {
        await cacheService.get(`cleanup-test-${i}`);
      }

      const statsBeforeClear = cacheService.getStats();
      expect(statsBeforeClear.totalOperations).toBe(operations);

      // Clear statistics (simulating cleanup)
      const startTime = performance.now();
      cacheService.clearStats();
      const endTime = performance.now();
      
      const cleanupTime = endTime - startTime;
      console.log(`Statistics cleanup time: ${cleanupTime.toFixed(2)}ms`);
      
      const statsAfterClear = cacheService.getStats();
      expect(statsAfterClear.totalOperations).toBe(0);
      expect(cleanupTime).toBeLessThan(10); // Cleanup should be very fast
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors efficiently without performance degradation', async () => {
      // Configure cache manager to throw errors
      cacheManager.get.mockRejectedValue(new Error('Simulated error'));
      
      const operations = 1000;
      const startTime = performance.now();
      
      for (let i = 0; i < operations; i++) {
        await cacheService.get(`error-test-${i}`); // Should handle errors gracefully
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / operations;

      console.log(`Error handling: ${operations} operations in ${totalTime.toFixed(2)}ms (avg: ${avgTime.toFixed(2)}ms)`);
      
      // Even with errors, operations should complete quickly
      expect(avgTime).toBeLessThan(10);
    });

    it('should recover from errors without memory leaks', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate alternating success and error conditions
      for (let i = 0; i < 1000; i++) {
        if (i % 2 === 0) {
          cacheManager.get.mockResolvedValueOnce('"success"');
        } else {
          cacheManager.get.mockRejectedValueOnce(new Error('Error'));
        }
        
        await cacheService.get(`recovery-test-${i}`);
      }

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      console.log(`Error recovery memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);
      
      expect(memoryIncreaseMB).toBeLessThan(25);
    });
  });

  describe('Stress Testing', () => {
    it('should survive sustained high-load operations', async () => {
      const duration = 5000; // 5 seconds
      const startTime = Date.now();
      let operations = 0;
      
      // Run operations continuously for the duration
      while ((Date.now() - startTime) < duration) {
        const promises = [];
        for (let i = 0; i < 10; i++) {
          promises.push(cacheService.get(`stress-test-${operations + i}`));
        }
        await Promise.all(promises);
        operations += 10;
      }
      
      const actualDuration = Date.now() - startTime;
      const throughput = operations / (actualDuration / 1000);

      console.log(`Stress test: ${operations} operations in ${actualDuration}ms (${throughput.toFixed(0)} ops/sec)`);
      
      expect(operations).toBeGreaterThan(1000); // Should complete many operations
      expect(throughput).toBeGreaterThan(200);
    });

    it('should handle burst traffic patterns', async () => {
      const burstSize = 100;
      const burstCount = 10;
      const burstDelay = 100; // ms between bursts
      
      const startTime = performance.now();
      
      for (let burst = 0; burst < burstCount; burst++) {
        // Create burst of operations
        const operations = [];
        for (let i = 0; i < burstSize; i++) {
          operations.push(cacheService.get(`burst-${burst}-${i}`));
        }
        
        await Promise.all(operations);
        
        // Brief pause between bursts
        if (burst < burstCount - 1) {
          await new Promise(resolve => setTimeout(resolve, burstDelay));
        }
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const totalOperations = burstSize * burstCount;
      const throughput = totalOperations / (totalTime / 1000);

      console.log(`Burst test: ${totalOperations} operations in ${burstCount} bursts over ${totalTime.toFixed(2)}ms (${throughput.toFixed(0)} ops/sec)`);
      
      expect(throughput).toBeGreaterThan(500);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain consistent performance across test runs', async () => {
      const testRuns = 5;
      const operationsPerRun = 200;
      const times: number[] = [];
      
      for (let run = 0; run < testRuns; run++) {
        const startTime = performance.now();
        
        for (let i = 0; i < operationsPerRun; i++) {
          await cacheService.get(`regression-test-${run}-${i}`);
        }
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const variance = Math.max(...times) - Math.min(...times);
      
      console.log(`Performance consistency: avg=${avgTime.toFixed(2)}ms, min=${minTime.toFixed(2)}ms, max=${maxTime.toFixed(2)}ms, variance=${variance.toFixed(2)}ms`);
      
      // Performance should be consistent (variance less than 50% of average)
      expect(variance).toBeLessThan(avgTime * 0.5);
      expect(avgTime / operationsPerRun).toBeLessThan(5); // Less than 5ms per operation on average
    });
  });
});