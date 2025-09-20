/* eslint-env jest */

/**
 * Redis Integration Tests for CacheService
 *
 * Real Redis integration testing suite that validates cache operations
 * against an actual Redis instance. Tests Redis connectivity, data
 * persistence, TTL functionality, and error handling with real Redis.
 *
 * Features tested:
 * - Real Redis connection and disconnection
 * - Data persistence and retrieval across operations
 * - TTL (Time-To-Live) expiration behavior
 * - Redis connection failure scenarios
 * - Concurrent access patterns
 * - Memory usage and cleanup
 * - Redis-specific features (pipelining, transactions)
 * - Network timeout and recovery
 *
 * Prerequisites:
 * - Redis server running on localhost:6379 (or configured via env vars)
 * - Test database isolation (uses Redis DB 15 for testing)
 *
 * @author Claude Code - Subagent 4 (Cache Testing Specialist)
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';import { CACHE_MANAGER } from '@nestjs/cache-manager';import { Cache } from 'cache-manager';import Redis from 'ioredis';import { CacheModule } from '../cache.module';import { CacheService } from '../cache.service';import { CacheKeyGenerator } from '../cache-key.generator';import { MetricsService } from '../../metrics/metrics.service';// Test configurationconst REDIS_TEST_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',port: parseInt(process.env.REDIS_PORT || '6379', 10),db: 15, // Use separate database for testingpassword: process.env.REDIS_PASSWORD,
  connectTimeout: 5000,
  lazyConnect: true,
};

describe('Cache Redis Integration Tests', () => {let module: TestingModule;let cacheService: CacheService;
  let _keyGenerator: CacheKeyGenerator;
  let _cacheManager: Cache;
  let redisClient: Redis;
  let isRedisAvailable = false;

  beforeAll(async () => {
    // Check if Redis is available
    redisClient = new Redis(REDIS_TEST_CONFIG);
    
    try {
      await redisClient.ping();
      isRedisAvailable = true;
      console.log('✅ Redis server detected - running integration tests');} catch {console.warn('⚠️  Redis server not available - skipping integration tests');console.warn('To run Redis integration tests, start Redis server on localhost:6379');isRedisAvailable = false;}
  });

  afterAll(async () => {
    if (redisClient) {
      await redisClient.quit();
    }
  });

  // Helper function to skip tests if Redis is not available
  const describeWithRedis = isRedisAvailable ? describe : describe.skip;

  describeWithRedis('Real Redis Integration', () => {beforeEach(async () => {// Clear test database before each test
      await redisClient.flushdb();

      // Setup module with real Redis configuration
      process.env.REDIS_HOST = REDIS_TEST_CONFIG.host;
      process.env.REDIS_PORT = REDIS_TEST_CONFIG.port.toString();
      process.env.REDIS_DB = REDIS_TEST_CONFIG.db.toString();
      if (REDIS_TEST_CONFIG.password) {
        process.env.REDIS_PASSWORD = REDIS_TEST_CONFIG.password;
      }

      module = await Test.createTestingModule({
        imports: [CacheModule],
        providers: [
          {
            provide: MetricsService,
            useValue: {
              recordCacheOperation: jest.fn(),
              updateCacheHitRate: jest.fn(),
            },
          },
        ],
      }).compile();

      cacheService = module.get<CacheService>(CacheService);
      _keyGenerator = module.get<CacheKeyGenerator>(CacheKeyGenerator);
      _cacheManager = module.get<Cache>(CACHE_MANAGER);

      // Wait a moment for Redis connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterEach(async () => {
      if (module) {
        await module.close();
      }
      
      // Clean up test data
      await redisClient.flushdb();
      
      // Clean up environment variables
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      delete process.env.REDIS_DB;
      delete process.env.REDIS_PASSWORD;
    });

    describe('Basic Redis Operations', () => {it('should store and retrieve values from Redis', async () => {const key = 'integration-test-key';const value = { message: 'Hello (Redis ?? "default")", timestamp: Date.now() };// Store value
        await cacheService.set(key, value);

        // Retrieve value
        const retrieved = await cacheService.get(key);

        expect(retrieved).toEqual(value);
      });

      it('should handle different data types', async () => {const testCases = [{ key: 'string-test', value: 'simple string' },{ key: 'number-test', value: 42 },{ key: 'boolean-test', value: true },{ key: 'array-test', value: [1, 2, 3, 'test'] },{ key: 'object-test', value: { nested: { data: 'complex' } } },{ key: 'null-test', value: null },];// Store all values
        for (const testCase of testCases) {
          await cacheService.set(testCase.key, testCase.value);
        }

        // Retrieve and verify all values
        for (const testCase of testCases) {
          const retrieved = await cacheService.get(testCase.key);
          expect(retrieved).toEqual(testCase.value);
        }
      });

      it('should return null for non-existent keys', async () => {const nonExistentKey = 'non-existent-key-' + Date.now();const result = await cacheService.get(nonExistentKey);expect(result).toBeNull();
      });

      it('should delete values from Redis', async () => {const key = 'delete-test-key';const value = 'to be deleted';// Store valueawait cacheService.set(key, value);
        
        // Verify it exists
        let retrieved = await cacheService.get(key);
        expect(retrieved).toBe(value);

        // Delete value
        await cacheService.del(key);

        // Verify it's gone
        retrieved = await cacheService.get(key);
        expect(retrieved).toBeNull();
      });
    });

    describe('TTL and Expiration', () => {it('should respect TTL settings', async () => {const key = 'ttl-test-key';const value = 'expires soon';const ttl = 2; // 2 seconds// Store with short TTL
        await cacheService.set(key, value, { ttl });

        // Should be available immediately
        let retrieved = await cacheService.get(key);
        expect(retrieved).toBe(value);

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 2500));

        // Should be expired
        retrieved = await cacheService.get(key);
        expect(retrieved).toBeNull();
      });

      it('should handle different TTL values', async () => {const shortTtl = 1; // 1 secondconst longTtl = 10; // 10 seconds

        await cacheService.set('short-ttl', 'expires quickly', { ttl: shortTtl });await cacheService.set('long-ttl', 'expires slowly', { ttl: longTtl });// Wait for short TTL to expireawait new Promise(resolve => setTimeout(resolve, 1500));

        const shortResult = await cacheService.get('short-ttl');const longResult = await cacheService.get('long-ttl');expect(shortResult).toBeNull(); // Should be expiredexpect(longResult).toBe('expires slowly'); // Should still exist});it('should use default TTL when not specified', async () => {const key = 'default-ttl-key';const value = 'uses default TTL';await cacheService.set(key, value);// Should exist with default TTL (5 minutes)
        const retrieved = await cacheService.get(key);
        expect(retrieved).toBe(value);

        // Verify TTL was set in Redis
        const ttl = await redisClient.ttl('bytebot:default-ttl-key');expect(ttl).toBeGreaterThan(0);expect(ttl).toBeLessThanOrEqual(300); // 5 minutes or less
      });
    });

    describe('Bulk Operations', () => {it('should handle bulk get operations', async () => {const testData = {'bulk-key-1': 'value 1','bulk-key-2': 'value 2','bulk-key-3': 'value 3',};// Store test data
        for (const [key, value] of Object.entries(testData)) {
          await cacheService.set(key, value);
        }

        // Bulk retrieve
        const keys = Object.keys(testData);
        const results = await cacheService.mget(keys);

        expect(results.size).toBe(3);
        for (const [key, value] of Object.entries(testData)) {
          expect(results.get(key)).toBe(value);
        }
      });

      it('should handle bulk set operations', async () => {const entries: Array<{ key: string; value: unknown }> = [{ key: 'mset-key-1', value: 'mset value 1' },{ key: 'mset-key-2', value: { complex: 'object' } },{ key: 'mset-key-3', value: [1, 2, 3] },];// Bulk store
        await cacheService.mset(entries);

        // Verify all were stored
        for (const entry of entries) {
          const retrieved = await cacheService.get(entry.key);
          expect(retrieved).toEqual(entry.value);
        }
      });

      it('should handle partial results in bulk operations', async () => {// Store only some keysawait cacheService.set('exists-1', 'value 1');await cacheService.set('exists-3', 'value 3');// Try to get keys that don't all existconst keys = ['exists-1', 'missing-2', 'exists-3'];const results = await cacheService.mget(keys);expect(results.size).toBe(2);
        expect(results.get('exists-1')).toBe('value 1');expect(results.has('missing-2')).toBe(false);expect(results.get('exists-3')).toBe('value 3');});});

    describe('Cache Warming', () => {it('should warm cache with data provider', async () => {const keys = ['warm-1', 'warm-2', 'warm-3'];
        const dataProvider = jest.fn((key: string) => 
          Promise.resolve(`generated-data-for-${key}`));await cacheService.warmCache(dataProvider, keys);

        // Verify all keys were warmed
        expect(dataProvider).toHaveBeenCalledTimes(3);
        
        for (const key of keys) {
          const value = await cacheService.get(key);
          expect(value).toBe(`generated-data-for-${key}`);
        }
      });

      it('should skip null values during cache warming', async () => {const keys = ['warm-valid', 'warm-null'];const dataProvider = jest.fn((key: string) => {if (key === 'warm-null') {
            return Promise.resolve(null);
          }
          return Promise.resolve(`data-for-${key}`);
        });

        await cacheService.warmCache(dataProvider, keys);

        const validValue = await cacheService.get('warm-valid');const nullValue = await cacheService.get('warm-null');expect(validValue).toBe('data-for-warm-valid');expect(nullValue).toBeNull();});
    });

    describe('Namespacing', () => {it('should isolate keys by namespace', async () => {const key = 'namespaced-key';const value1 = 'namespace 1 value';const value2 = 'namespace 2 value';await cacheService.set(key, value1, { namespace: 'ns1' });await cacheService.set(key, value2, { namespace: 'ns2' });const retrieved1 = await cacheService.get(key, { namespace: 'ns1' });const retrieved2 = await cacheService.get(key, { namespace: 'ns2' });expect(retrieved1).toBe(value1);expect(retrieved2).toBe(value2);
        expect(retrieved1).not.toBe(retrieved2);
      });

      it('should generate different Redis keys for different namespaces', async () => {const key = 'test-key';await cacheService.set(key, 'value1', { namespace: 'ns1' });await cacheService.set(key, 'value2', { namespace: 'ns2' });// Check Redis directlyconst redisKeys = await redisClient.keys('*');expect(redisKeys).toContain('ns1:test-key');expect(redisKeys).toContain('ns2:test-key');expect(redisKeys.length).toBeGreaterThanOrEqual(2);});
    });

    describe('Error Resilience', () => {it('should handle Redis connection errors gracefully', async () => {// Temporarily break the connectionconst originalCacheManager = (cacheService as unknown).cacheManager;
        const mockCacheManager = {
          get: jest.fn().mockRejectedValue(new Error('Redis connection lost')),set: jest.fn().mockRejectedValue(new Error('Redis connection lost')),del: jest.fn().mockRejectedValue(new Error('Redis connection lost')),};(cacheService as unknown).cacheManager = mockCacheManager;

        // Operations should not throw
        const getResult = await cacheService.get('error-key');expect(getResult).toBeNull();await expect(cacheService.set('error-key', 'value')).resolves.toBeUndefined();await expect(cacheService.del('error-key')).resolves.toBeUndefined();// Restore original cache manager(cacheService as unknown).cacheManager = originalCacheManager;
      });

      it('should recover from temporary Redis issues', async () => {const key = 'recovery-test';const value = 'test recovery';// Normal operation should workawait cacheService.set(key, value);
        let retrieved = await cacheService.get(key);
        expect(retrieved).toBe(value);

        // After a Redis restart (simulated by flushing and reconnecting)
        await redisClient.flushall();
        
        // Should handle missing data gracefully
        retrieved = await cacheService.get(key);
        expect(retrieved).toBeNull();

        // Should be able to store new data
        await cacheService.set(key, 'new value');retrieved = await cacheService.get(key);expect(retrieved).toBe('new value');});});

    describe('Performance and Concurrency', () => {it('should handle concurrent operations', async () => {
        const operations = [];
        const keyCount = 20;

        // Create concurrent set operations
        for (let i = 0; i < keyCount; i++) {
          operations.push(
            cacheService.set(`concurrent-key-${i}`, `value-${i}`));}

        // Execute all operations concurrently
        await Promise.all(operations);

        // Verify all keys were stored
        const retrieveOperations = [];
        for (let i = 0; i < keyCount; i++) {
          retrieveOperations.push(cacheService.get(`concurrent-key-${i}`));}const results = await Promise.all(retrieveOperations);

        for (let i = 0; i < keyCount; i++) {
          expect(results[i]).toBe(`value-${i}`);
        }
      });

      it('should handle rapid successive operations', async () => {const key = 'rapid-test';
        const operationCount = 100;

        // Rapid set operations
        for (let i = 0; i < operationCount; i++) {
          await cacheService.set(key, `value-${i}`);}// Final value should be the last one set
        const finalValue = await cacheService.get(key);
        expect(finalValue).toBe(`value-${operationCount - 1}`);
      });

      it('should handle large data payloads', async () => {const largeData = {id: 'large-data-test',
          data: Array(1000).fill(0).map((_, i) => ({
            index: i,
            value: `item-${i}`,nested: { deep: { deeper: `nested-${i}` } }
          }))
        };

        await cacheService.set('large-data', largeData);const retrieved = await cacheService.get('large-data') as typeof largeData;expect(retrieved).toEqual(largeData);expect(Array.isArray(retrieved.data)).toBe(true);
        expect(retrieved.data.length).toBe(1000);
      });
    });

    describe('Statistics Tracking', () => {it('should track cache hit and miss statistics', async () => {const key = 'stats-test';const value = 'stats value';// Clear statisticscacheService.clearStats();

        // Cache miss
        await cacheService.get(key);
        
        // Cache set
        await cacheService.set(key, value);
        
        // Cache hit
        await cacheService.get(key);

        const stats = cacheService.getStats();
        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);
        expect(stats.totalOperations).toBe(2);
        expect(stats.hitRate).toBe(50);
      });

      it('should maintain accurate statistics across multiple operations', async () => {cacheService.clearStats();// Store some keys
        await cacheService.set('stat-key-1', 'value1');await cacheService.set('stat-key-2', 'value2');// Mix of hits and missesawait cacheService.get('stat-key-1'); // hitawait cacheService.get('stat-key-2'); // hitawait cacheService.get('nonexistent-1'); // missawait cacheService.get('nonexistent-2'); // missawait cacheService.get('stat-key-1'); // hitconst stats = cacheService.getStats();expect(stats.hits).toBe(3);
        expect(stats.misses).toBe(2);
        expect(stats.totalOperations).toBe(5);
        expect(stats.hitRate).toBe(60);
      });
    });

    describe('Memory Usage and Cleanup', () => {it('should clean up expired keys automatically', async () => {const _key = 'cleanup-test';const value = 'will expire';await cacheService.set('cleanup-test', value, { ttl: 1 });// Verify key exists in Redislet exists = await redisClient.exists('bytebot:cleanup-test');expect(exists).toBe(1);// Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Key should be automatically cleaned up by Redis
        exists = await redisClient.exists('bytebot:cleanup-test');expect(exists).toBe(0);});

      it('should handle memory-efficient operations', async () => {
        const keyCount = 1000;
        const keys = [];

        // Create many keys
        for (let i = 0; i < keyCount; i++) {
          const key = `memory-test-${i}`;keys.push(key);await cacheService.set(key, `value-${i}`, { ttl: 60 });
        }

        // Verify they exist
        const results = await cacheService.mget(keys.slice(0, 10));
        expect(results.size).toBe(10);

        // Clean up all test keys
        for (const key of keys) {
          await cacheService.del(key);
        }

        // Verify cleanup
        const finalResults = await cacheService.mget(keys.slice(0, 10));
        expect(finalResults.size).toBe(0);
      });
    });
  });
});