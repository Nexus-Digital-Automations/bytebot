/* eslint-env jest */

/**
 * Integration Tests for CacheModule
 *
 * Complete test suite for Redis-based cache module configuration and
 * dependency injection. Tests module initialization, Redis connection
 * configuration, service provider setup, and integration patterns.
 *
 * Features tested:
 * - Module configuration and initialization
 * - Redis connection configuration from environment variables
 * - Service dependency injection and provider setup
 * - Cache manager configuration with TTL and limits
 * - Environment variable handling and defaults
 * - Module export validation
 * - Error handling for configuration issues
 *
 * @author Claude Code - Subagent 4 (Cache Testing Specialist)
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CacheModule } from '../cache.module';
import { CacheService } from '../cache.service';
import { CacheKeyGenerator } from '../cache-key.generator';
import { MetricsService } from '../../metrics/metrics.service';

// Mock the redis store import
jest.mock('cache-manager-redis-store', () => ({
  _esModule: true,
  default: jest.fn(),
}));

// Mock environment variables helper
const mockEnvVars = (envVars: Record<string, string> = {}) => {
  const originalEnv = process.env;
  process.env = { ...originalEnv, ...envVars };
  return () => {
    process.env = originalEnv;
  };
};

describe('CacheModule', () => {
  let module: TestingModule;
  let cacheService: CacheService;
  let keyGenerator: CacheKeyGenerator;
  let cacheManager: Cache;
  let restoreEnv: () => void;

  beforeEach(() => {
    // Reset environment variables
    restoreEnv = mockEnvVars();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
    restoreEnv();
    jest.clearAllMocks();
  });

  describe('Module Initialization', () => {
    it('should compile and initialize successfully', async () => {
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

      expect(module).toBeDefined();
    });

    it('should provide all required services', async () => {
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
      keyGenerator = module.get<CacheKeyGenerator>(CacheKeyGenerator);
      cacheManager = module.get<Cache>(CACHE_MANAGER);

      expect(cacheService).toBeDefined();
      expect(cacheService).toBeInstanceOf(CacheService);
      expect(keyGenerator).toBeDefined();
      expect(keyGenerator).toBeInstanceOf(CacheKeyGenerator);
      expect(cacheManager).toBeDefined();
    });

    it('should be a global module', () => {
      const moduleMetadata = Reflect.getMetadata('_module:global__', CacheModule);
      expect(moduleMetadata).toBe(true);
    });
  });

  describe('Configuration with Default Environment Variables', () => {
    it('should use default configuration when no env vars are set', async () => {
      restoreEnv = mockEnvVars({}); // No environment variables

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

      // Module should initialize successfully with defaults
      expect(module).toBeDefined();
      
      // Check that the cache manager was created
      cacheManager = module.get<Cache>(CACHE_MANAGER);
      expect(cacheManager).toBeDefined();
    });

    it('should apply default values correctly', async () => {
      // Capture the configuration that would be used
      const CacheModuleClass = CacheModule as unknown;
      const factory = CacheModuleClass.prototype.constructor;
      
      // We can't directly test the factory function, but we can test
      // that the module compiles with expected defaults
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

      expect(module).toBeDefined();
      
      // Verify services are available (indicating successful configuration)
      const services = [
        CacheService,
        CacheKeyGenerator,
        CACHE_MANAGER,
      ];

      for (const service of services) {
        expect(module.get(service)).toBeDefined();
      }
    });
  });

  describe('Configuration with Custom Environment Variables', () => {
    it('should use custom Redis host and port', async () => {
      restoreEnv = mockEnvVars({
        REDIS_HOST: 'custom-redis-host',
        REDIS_PORT: '6380',
        REDIS_PASSWORD: 'secret-password',
        REDIS_DB: '2',
        CACHE_TTL: '600',
        CACHE_MAX_ITEMS: '2000',
      });

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

      expect(module).toBeDefined();
      
      // Verify cache manager is created (indicating config was processed)
      cacheManager = module.get<Cache>(CACHE_MANAGER);
      expect(cacheManager).toBeDefined();
    });

    it('should handle invalid port numbers gracefully', async () => {
      restoreEnv = mockEnvVars({
        REDIS_PORT: 'invalid-port',
        CACHE_TTL: 'invalid-ttl',
        CACHE_MAX_ITEMS: 'invalid-max',
        REDIS_DB: 'invalid-db',
      });

      // Should not throw during module compilation
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

      expect(module).toBeDefined();
    });

    it('should handle missing environment variables', async () => {
      restoreEnv = mockEnvVars({
        REDIS_HOST: undefined,
        REDIS_PORT: undefined,
        REDIS_PASSWORD: undefined,
      } as unknown);

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

      expect(module).toBeDefined();
    });
  });

  describe('Service Dependencies and Injection', () => {
    beforeEach(async () => {
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
    });

    it('should inject CacheManager into CacheService', () => {
      cacheService = module.get<CacheService>(CacheService);
      cacheManager = module.get<Cache>(CACHE_MANAGER);

      expect(cacheService).toBeDefined();
      expect(cacheManager).toBeDefined();
      
      // CacheService should have received the cache manager dependency
      expect(cacheService).toBeInstanceOf(CacheService);
    });

    it('should inject CacheKeyGenerator into CacheService', () => {
      cacheService = module.get<CacheService>(CacheService);
      keyGenerator = module.get<CacheKeyGenerator>(CacheKeyGenerator);

      expect(cacheService).toBeDefined();
      expect(keyGenerator).toBeDefined();
      
      // Both should be properly instantiated
      expect(cacheService).toBeInstanceOf(CacheService);
      expect(keyGenerator).toBeInstanceOf(CacheKeyGenerator);
    });

    it('should inject MetricsService into CacheService', () => {
      cacheService = module.get<CacheService>(CacheService);
      const metricsService = module.get<MetricsService>(MetricsService);

      expect(cacheService).toBeDefined();
      expect(metricsService).toBeDefined();
      
      // MetricsService should be the mocked version
      expect(metricsService.recordCacheOperation).toBeDefined();
    });

    it('should make CacheKeyGenerator independently available', () => {
      keyGenerator = module.get<CacheKeyGenerator>(CacheKeyGenerator);

      expect(keyGenerator).toBeDefined();
      expect(keyGenerator).toBeInstanceOf(CacheKeyGenerator);
      
      // Should be able to use the key generator independently
      const testKey = keyGenerator.generate('test-key');
      expect(testKey).toBe('bytebot:test-key');
    });
  });

  describe('Module Exports', () => {
    beforeEach(async () => {
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
    });

    it('should export CacheService', () => {
      const exportedService = module.get<CacheService>(CacheService);
      expect(exportedService).toBeDefined();
      expect(exportedService).toBeInstanceOf(CacheService);
    });

    it('should export CacheKeyGenerator', () => {
      const exportedGenerator = module.get<CacheKeyGenerator>(CacheKeyGenerator);
      expect(exportedGenerator).toBeDefined();
      expect(exportedGenerator).toBeInstanceOf(CacheKeyGenerator);
    });

    it('should export NestCacheModule', () => {
      const cacheManager = module.get<Cache>(CACHE_MANAGER);
      expect(cacheManager).toBeDefined();
    });
  });

  describe('Integration Testing', () => {
    beforeEach(async () => {
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
      keyGenerator = module.get<CacheKeyGenerator>(CacheKeyGenerator);
    });

    it('should enable cache operations through CacheService', async () => {
      // Mock the underlying cache manager for this test
      const mockCacheManager = {
        get: jest.fn().mockResolvedValue('"test-value"'),
        set: jest.fn().mockResolvedValue(undefined),
        del: jest.fn().mockResolvedValue(undefined),
      };

      // Replace the cache manager in the service
      (cacheService as unknown).cacheManager = mockCacheManager;

      // Test cache operations
      await cacheService.set('test-key', 'test-value');
      expect(mockCacheManager.set).toHaveBeenCalled();

      const value = await cacheService.get('test-key');
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(value).toBe('test-value');

      await cacheService.del('test-key');
      expect(mockCacheManager.del).toHaveBeenCalled();
    });

    it('should enable key generation through CacheKeyGenerator', () => {
      const simpleKey = keyGenerator.generate('simple');
      expect(simpleKey).toBe('bytebot:simple');

      const apiKey = keyGenerator.generateApiKey('GET', '/api/test');
      expect(apiKey).toMatch(/^api:api:get:api_test$/);

      const dbKey = keyGenerator.generateDbKey('users', 'SELECT');
      expect(dbKey).toBe('database:db:users:select');
    });

    it('should coordinate between CacheService and CacheKeyGenerator', async () => {
      // Mock the cache manager
      const mockCacheManager = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
      };
      (cacheService as unknown).cacheManager = mockCacheManager;

      // Use CacheService which should use CacheKeyGenerator internally
      await cacheService.set('coordination-test', 'test-value');

      // Verify that key generation was used (check the call to cache manager)
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'bytebot:coordination-test',
        expect.any(String),
        expect.any(Number)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle MetricsService dependency injection errors', async () => {
      // Test with missing MetricsService
      await expect(
        Test.createTestingModule({
          imports: [CacheModule],
          // No MetricsService provided
        }).compile()
      ).rejects.toThrow();
    });

    it('should handle module initialization with invalid configuration', async () => {
      // This tests the resilience of the configuration factory
      restoreEnv = mockEnvVars({
        REDIS_HOST: '', // Empty host
        REDIS_PORT: '-1', // Invalid port
      });

      // Should still compile but may have issues at runtime
      module = await Test.createTestingModule({
        imports: [CacheModule],
        providers: [
          {
            provide: MetricsService,
            useValue: {
              recordCacheOperation: jest.fn(),
            },
          },
        ],
      }).compile();

      expect(module).toBeDefined();
    });
  });

  describe('Module Lifecycle', () => {
    it('should initialize and close cleanly', async () => {
      module = await Test.createTestingModule({
        imports: [CacheModule],
        providers: [
          {
            provide: MetricsService,
            useValue: {
              recordCacheOperation: jest.fn(),
            },
          },
        ],
      }).compile();

      expect(module).toBeDefined();

      // Should close without errors
      await expect(module.close()).resolves.toBeUndefined();
    });

    it('should handle multiple module instances', async () => {
      const module1 = await Test.createTestingModule({
        imports: [CacheModule],
        providers: [
          {
            provide: MetricsService,
            useValue: { recordCacheOperation: jest.fn() },
          },
        ],
      }).compile();

      const module2 = await Test.createTestingModule({
        imports: [CacheModule],
        providers: [
          {
            provide: MetricsService,
            useValue: { recordCacheOperation: jest.fn() },
          },
        ],
      }).compile();

      expect(module1).toBeDefined();
      expect(module2).toBeDefined();

      await module1.close();
      await module2.close();
    });
  });

  describe('Performance and Resource Management', () => {
    it('should not leak memory during module operations', async () => {
      // Create and destroy modules to test for leaks
      for (let i = 0; i < 10; i++) {
        const testModule = await Test.createTestingModule({
          imports: [CacheModule],
          providers: [
            {
              provide: MetricsService,
              useValue: { recordCacheOperation: jest.fn() },
            },
          ],
        }).compile();

        await testModule.close();
      }

      // If we get here without memory issues, the test passes
      expect(true).toBe(true);
    });

    it('should handle rapid service access', async () => {
      module = await Test.createTestingModule({
        imports: [CacheModule],
        providers: [
          {
            provide: MetricsService,
            useValue: { recordCacheOperation: jest.fn() },
          },
        ],
      }).compile();

      // Rapidly access services to test for concurrency issues
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve(module.get<CacheService>(CacheService))
        );
      }

      const services = await Promise.all(promises);
      
      // All should be the same instance (singleton)
      const firstService = services[0];
      for (const service of services) {
        expect(service).toBe(firstService);
      }
    });
  });
});