/**
 * Performance Test Suite for PARLANT Database Wrapper System
 *
 * TESTING FRAMEWORK: Jest with Performance Benchmarking
 * TARGET: Sub-1000ms validation response times under enterprise load
 * FOCUS AREAS:
 * - Single operation performance validation
 * - Concurrent operation load testing
 * - Memory usage and resource optimization
 * - Cache performance and hit rate optimization
 * - Database connection pool efficiency
 * - Backup service performance impact
 * - Risk level escalation performance costs
 * - Validation caching effectiveness
 * - Enterprise-scale stress testing
 *
 * @package @bytebot/bytebot-agent
 * @author Claude Code - Comprehensive Testing Framework
 * @version 1.0.0
 */

import { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  ParlantValidatedDatabaseService,
  RiskLevel,
  DatabaseOperationMetadata,
} from '../parlant-validated-database.service';
import {
  ParlantValidatedPrismaService,
  PrismaModelSecurity,
} from '../prisma/parlant-validated-prisma.service';
import { DatabaseBackupService } from '../database-backup.service';
import { DatabaseService } from '../database.service';
import { PrismaService } from '../prisma/prisma.service';
import { ParlantUserContext } from '@shared/types/parlant-integration.types';

// ===== PERFORMANCE TEST CONFIGURATION =====

const PERFORMANCE_THRESHOLDS = {
  LOW_RISK_MAX_TIME: 100, // 100ms for read operations
  MEDIUM_RISK_MAX_TIME: 300, // 300ms for standard writes
  HIGH_RISK_MAX_TIME: 800, // 800ms for destructive operations (includes backup)
  CRITICAL_RISK_MAX_TIME: 1000, // 1000ms for migrations/security
  CACHE_HIT_MAX_TIME: 50, // 50ms for cached validations
  CONCURRENT_OPERATION_MAX_TIME: 1200, // 1200ms under load
  MEMORY_THRESHOLD_MB: 100, // 100MB max memory usage
  MIN_CACHE_HIT_RATE: 0.8, // 80% cache hit rate minimum
} as const;

const LOAD_TEST_CONFIG = {
  CONCURRENT_OPERATIONS: 50,
  STRESS_TEST_OPERATIONS: 200,
  SUSTAINED_LOAD_DURATION: 10000, // 10 seconds
  MEMORY_SAMPLING_INTERVAL: 1000, // 1 second
} as const;

// ===== MOCK IMPLEMENTATIONS =====

const mockDatabaseService = {
  getPrismaClient: jest.fn(),
  getMetrics: jest.fn(),
  getHealthStatus: jest.fn(),
  executeRawQuery: jest.fn(),
  executeRawQueryWithReliability: jest.fn(),
};

const mockPrismaService = {
  getOptimizedClient: jest.fn(),
  executeQuery: jest.fn(),
  getHealthStatus: jest.fn(),
  getDatabaseMetrics: jest.fn(),
};

const mockBackupService = {
  createPreOperationBackup: jest.fn(),
  restoreFromBackup: jest.fn(),
  getBackupStatistics: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

// ===== PERFORMANCE TEST DATA FACTORY =====

class PerformanceTestDataFactory {
  static createUserContext(): ParlantUserContext {
    return {
      userId: 'perf-user-123',
      sessionId: 'perf-session-456',
      permissions: ['read', 'write', 'admin'],
      roles: ['admin'],
    };
  }

  static createLowRiskOperation(): DatabaseOperationMetadata {
    return {
      operationType: 'READ',
      tableName: 'public_data',
      affectedRows: 0,
      queryDescription: 'SELECT * FROM public_data LIMIT 10',
      dataTypes: ['string'],
      isDestructive: false,
      requiresBackup: false,
    };
  }

  static createMediumRiskOperation(): DatabaseOperationMetadata {
    return {
      operationType: 'WRITE',
      tableName: 'user_sessions',
      affectedRows: 1,
      queryDescription: 'INSERT INTO user_sessions (user_id, token)',
      dataTypes: ['uuid', 'string'],
      isDestructive: false,
      requiresBackup: false,
    };
  }

  static createHighRiskOperation(): DatabaseOperationMetadata {
    return {
      operationType: 'DELETE',
      tableName: 'user_data',
      affectedRows: 1,
      queryDescription: 'DELETE FROM user_data WHERE id = ?',
      dataTypes: ['uuid'],
      isDestructive: true,
      requiresBackup: true,
    };
  }

  static createCriticalRiskOperation(): DatabaseOperationMetadata {
    return {
      operationType: 'MIGRATION',
      tableName: undefined,
      affectedRows: 0,
      queryDescription: 'ALTER TABLE users ADD COLUMN new_field TEXT',
      dataTypes: ['text'],
      isDestructive: false,
      requiresBackup: true,
    };
  }

  static createBulkOperation(recordCount: number): DatabaseOperationMetadata {
    return {
      operationType: 'WRITE',
      tableName: 'analytics_events',
      affectedRows: recordCount,
      queryDescription: `Bulk insert ${recordCount} analytics events`,
      dataTypes: ['json', 'timestamp'],
      isDestructive: false,
      requiresBackup: recordCount > 1000,
    };
  }
}

// ===== PERFORMANCE UTILITY FUNCTIONS =====

class PerformanceUtils {
  /**
   * Measure execution time of an async operation
   */
  static async measureExecutionTime<T>(
    operation: () => Promise<T>,
  ): Promise<{ _result: T; duration: number }> {
    const startTime = process.hrtime.bigint();
    const result = await operation();
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
    return { result, duration };
  }

  /**
   * Get current memory usage
   */
  static getMemoryUsage(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
  } {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
      heapTotal: memUsage.heapTotal / 1024 / 1024, // MB
      external: memUsage.external / 1024 / 1024, // MB
    };
  }

  /**
   * Run concurrent operations and measure performance
   */
  static async runConcurrentOperations<T>(
    operations: (() => Promise<T>)[],
    maxConcurrency: number = 10,
  ): Promise<{ results: T[]; totalDuration: number; averageDuration: number }> {
    const startTime = process.hrtime.bigint();

    const chunks = [];
    for (let i = 0; i < operations.length; i += maxConcurrency) {
      chunks.push(operations.slice(i, i + maxConcurrency));
    }

    const results: T[] = [];
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(chunk.map((op) => op()));
      results.push(...chunkResults);
    }

    const endTime = process.hrtime.bigint();
    const totalDuration = Number(endTime - startTime) / 1_000_000;
    const averageDuration = totalDuration / operations.length;

    return { results, totalDuration, averageDuration };
  }

  /**
   * Monitor memory usage during operation
   */
  static async monitorMemoryUsage<T>(
    operation: () => Promise<T>,
    samplingInterval: number = 100,
  ): Promise<{
    _result: T;
    memoryStats: { peak: number; average: number; samples: number[] };
  }> {
    const memorySamples: number[] = [];
    let isRunning = true;

    // Start memory monitoring
    const memoryMonitor = setInterval(() => {
      if (isRunning) {
        memorySamples.push(this.getMemoryUsage().heapUsed);
      }
    }, samplingInterval);

    try {
      const result = await operation();
      isRunning = false;
      clearInterval(memoryMonitor);

      const peak = Math.max(...memorySamples);
      const average =
        memorySamples.reduce((sum, val) => sum + val, 0) / memorySamples.length;

      return {
        result,
        memoryStats: {
          peak,
          average,
          samples: memorySamples,
        },
      };
    } catch (error) {
      isRunning = false;
      clearInterval(memoryMonitor);
      throw error;
    }
  }

  /**
   * Create a load generator for stress testing
   */
  static createLoadGenerator(
    operationFactory: () => Promise<any>,
    operationsPerSecond: number,
    durationMs: number,
  ): Promise<{
    operationsCompleted: number;
    errorCount: number;
    averageResponseTime: number;
  }> {
    return new Promise((resolve) => {
      const interval = 1000 / operationsPerSecond;
      const startTime = Date.now();
      let operationsCompleted = 0;
      let errorCount = 0;
      let totalResponseTime = 0;

      const intervalId = setInterval(async () => {
        if (Date.now() - startTime >= durationMs) {
          clearInterval(intervalId);
          resolve({
            operationsCompleted,
            errorCount,
            averageResponseTime:
              operationsCompleted > 0
                ? totalResponseTime / operationsCompleted
                : 0,
          });
          return;
        }

        const opStartTime = Date.now();
        try {
          await operationFactory();
          operationsCompleted++;
          totalResponseTime += Date.now() - opStartTime;
        } catch (error) {
          errorCount++;
        }
      }, interval);
    });
  }
}

// ===== MAIN PERFORMANCE TEST SUITE =====

describe('PARLANT Performance Tests - Sub-1000ms Validation Target', () => {
  let databaseService: ParlantValidatedDatabaseService;
  let prismaService: ParlantValidatedPrismaService;
  let backupService: DatabaseBackupService;
  let module: TestingModule;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Configure fast mocks for performance testing
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: any) => {
        const config = {
          PARLANT_ENABLED: true,
          PARLANT_CACHE_ENABLED: true,
          PARLANT_AUDIT_ENABLED: true,
          DATABASE_BACKUP_ENABLED: true,
        };
        return config[key] ?? defaultValue;
      },
    );

    // Fast mock responses
    mockDatabaseService.getPrismaClient.mockResolvedValue({});
    mockDatabaseService.getMetrics.mockResolvedValue({
      connectionCount: 5,
      queryCount: 100,
      averageQueryTime: 25,
    });
    mockDatabaseService.getHealthStatus.mockResolvedValue({
      status: 'healthy',
      uptime: 3600,
    });
    mockDatabaseService.executeRawQuery.mockResolvedValue([
      { _result: 'success' },
    ]);

    mockPrismaService.getOptimizedClient.mockReturnValue({
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 1 }),
        update: jest.fn().mockResolvedValue({ id: 1 }),
      },
    });

    // Fast backup mock (simulates optimized backup)
    mockBackupService.createPreOperationBackup.mockResolvedValue({
      backupId: 'fast-backup-123',
      backupPath: '/tmp/fast-backup.sql',
      backupSize: 1024,
      duration: 200, // 200ms backup time
      checksum: 'fast123',
      timestamp: new Date(),
      verified: true,
    });

    // Create testing module
    module = await Test.createTestingModule({
      providers: [
        ParlantValidatedDatabaseService,
        ParlantValidatedPrismaService,
        DatabaseBackupService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    databaseService = module.get<ParlantValidatedDatabaseService>(
      ParlantValidatedDatabaseService,
    );
    prismaService = module.get<ParlantValidatedPrismaService>(
      ParlantValidatedPrismaService,
    );
    backupService = module.get<DatabaseBackupService>(DatabaseBackupService);
  });

  afterEach(async () => {
    await module.close();
  });

  // ===== SINGLE OPERATION PERFORMANCE TESTS =====

  describe('Single Operation Performance Benchmarks', () => {
    const userContext = PerformanceTestDataFactory.createUserContext();

    it('should process LOW risk operations within 100ms', async () => {
      const metadata = PerformanceTestDataFactory.createLowRiskOperation();
      const mockOperation = jest.fn().mockResolvedValue({ _data: 'test' });

      const { duration } = await PerformanceUtils.measureExecutionTime(
        async () => {
          return databaseService.validateAndExecute(
            'lowRiskPerformanceTest',
            mockOperation,
            metadata,
            userContext,
          );
        },
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.LOW_RISK_MAX_TIME);
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should process MEDIUM risk operations within 300ms', async () => {
      const metadata = PerformanceTestDataFactory.createMediumRiskOperation();
      const mockOperation = jest.fn().mockResolvedValue({ created: true });

      const { duration } = await PerformanceUtils.measureExecutionTime(
        async () => {
          return databaseService.validateAndExecute(
            'mediumRiskPerformanceTest',
            mockOperation,
            metadata,
            userContext,
          );
        },
      );

      expect(duration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.MEDIUM_RISK_MAX_TIME,
      );
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should process HIGH risk operations within 800ms (including backup)', async () => {
      const metadata = PerformanceTestDataFactory.createHighRiskOperation();
      const mockOperation = jest.fn().mockResolvedValue({ deleted: true });

      const { duration } = await PerformanceUtils.measureExecutionTime(
        async () => {
          return databaseService.validateAndExecute(
            'highRiskPerformanceTest',
            mockOperation,
            metadata,
            userContext,
          );
        },
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.HIGH_RISK_MAX_TIME);
      expect(mockOperation).toHaveBeenCalled();
      expect(mockBackupService.createPreOperationBackup).toHaveBeenCalled();
    });

    it('should process CRITICAL risk operations within 1000ms', async () => {
      const metadata = PerformanceTestDataFactory.createCriticalRiskOperation();
      const mockOperation = jest.fn().mockResolvedValue({ migrated: true });

      const { duration } = await PerformanceUtils.measureExecutionTime(
        async () => {
          return databaseService.validateAndExecute(
            'criticalRiskPerformanceTest',
            mockOperation,
            metadata,
            userContext,
          );
        },
      );

      expect(duration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CRITICAL_RISK_MAX_TIME,
      );
      expect(mockOperation).toHaveBeenCalled();
      expect(mockBackupService.createPreOperationBackup).toHaveBeenCalled();
    });
  });

  // ===== PRISMA SERVICE PERFORMANCE TESTS =====

  describe('Prisma Service Performance Benchmarks', () => {
    const userContext = PerformanceTestDataFactory.createUserContext();

    it('should process findMany operations within performance thresholds', async () => {
      const { duration } = await PerformanceUtils.measureExecutionTime(
        async () => {
          return prismaService.findMany('User', { take: 10 }, userContext);
        },
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.LOW_RISK_MAX_TIME);
    });

    it('should process create operations within performance thresholds', async () => {
      const args = {
        _data: {
          name: 'Performance Test User',
          email: 'perf@test.com',
        },
      };

      const { duration } = await PerformanceUtils.measureExecutionTime(
        async () => {
          return prismaService.create('User', args, userContext);
        },
      );

      expect(duration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.MEDIUM_RISK_MAX_TIME,
      );
    });

    it('should process update operations on CONFIDENTIAL models efficiently', async () => {
      const args = {
        where: { id: 123 },
        _data: { name: 'Updated User' },
      };

      const { duration } = await PerformanceUtils.measureExecutionTime(
        async () => {
          return prismaService.update('User', args, userContext);
        },
      );

      expect(duration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.MEDIUM_RISK_MAX_TIME,
      );
    });

    it('should handle model security escalation without significant performance impact', async () => {
      // Test operations on different security levels
      const operations = [
        () => prismaService.findMany('User', {}, userContext), // CONFIDENTIAL
        () => prismaService.findMany('BrowserSession', {}, userContext), // INTERNAL
      ];

      for (const operation of operations) {
        const { duration } =
          await PerformanceUtils.measureExecutionTime(operation);
        expect(duration).toBeLessThan(
          PERFORMANCE_THRESHOLDS.MEDIUM_RISK_MAX_TIME,
        );
      }
    });
  });

  // ===== CACHE PERFORMANCE TESTS =====

  describe('Cache Performance and Optimization', () => {
    const userContext = PerformanceTestDataFactory.createUserContext();

    it('should demonstrate cache hit performance benefits', async () => {
      const metadata = PerformanceTestDataFactory.createLowRiskOperation();
      const mockOperation = jest.fn().mockResolvedValue({ cached: true });

      // First call (cache miss)
      const { duration: firstCallDuration } =
        await PerformanceUtils.measureExecutionTime(async () => {
          return databaseService.validateAndExecute(
            'cacheTestOperation',
            mockOperation,
            metadata,
            userContext,
          );
        });

      // Second call (should hit cache)
      const { duration: secondCallDuration } =
        await PerformanceUtils.measureExecutionTime(async () => {
          return databaseService.validateAndExecute(
            'cacheTestOperation',
            mockOperation,
            metadata,
            userContext,
          );
        });

      // Cache hit should be significantly faster
      expect(secondCallDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CACHE_HIT_MAX_TIME,
      );
      expect(secondCallDuration).toBeLessThan(firstCallDuration * 0.5); // At least 50% faster
    });

    it('should maintain high cache hit rate under load', async () => {
      const metadata = PerformanceTestDataFactory.createLowRiskOperation();
      const mockOperation = jest.fn().mockResolvedValue({ _data: 'cached' });

      // Execute same operation multiple times
      const operations = Array(20)
        .fill(null)
        .map(
          () => () =>
            databaseService.validateAndExecute(
              'cacheLoadTest',
              mockOperation,
              metadata,
              userContext,
            ),
        );

      const { averageDuration } =
        await PerformanceUtils.runConcurrentOperations(operations, 5);

      // Average duration should be low due to caching
      expect(averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CACHE_HIT_MAX_TIME,
      );

      // Check cache statistics
      const cacheStats = databaseService.getCacheStatistics();
      const hitRate =
        parseFloat(cacheStats.cacheHitRate.replace('%', '')) / 100;
      expect(hitRate).toBeGreaterThan(
        PERFORMANCE_THRESHOLDS.MIN_CACHE_HIT_RATE,
      );
    });
  });

  // ===== CONCURRENT OPERATION PERFORMANCE TESTS =====

  describe('Concurrent Operation Performance', () => {
    const userContext = PerformanceTestDataFactory.createUserContext();

    it('should handle concurrent LOW risk operations efficiently', async () => {
      const metadata = PerformanceTestDataFactory.createLowRiskOperation();
      const mockOperation = jest.fn().mockResolvedValue({ concurrent: true });

      const operations = Array(LOAD_TEST_CONFIG.CONCURRENT_OPERATIONS)
        .fill(null)
        .map(
          () => () =>
            databaseService.validateAndExecute(
              'concurrentLowRisk',
              mockOperation,
              metadata,
              userContext,
            ),
        );

      const { totalDuration, averageDuration } =
        await PerformanceUtils.runConcurrentOperations(operations, 10);

      expect(averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATION_MAX_TIME,
      );
      expect(totalDuration).toBeLessThan(
        LOAD_TEST_CONFIG.CONCURRENT_OPERATIONS *
          PERFORMANCE_THRESHOLDS.LOW_RISK_MAX_TIME,
      );
    });

    it('should handle mixed risk level operations under concurrent load', async () => {
      const operations = [
        // LOW risk operations (70%)
        ...Array(35)
          .fill(null)
          .map(() => {
            const metadata =
              PerformanceTestDataFactory.createLowRiskOperation();
            const mockOp = jest.fn().mockResolvedValue({ low: true });
            return () =>
              databaseService.validateAndExecute(
                'concurrentLow',
                mockOp,
                metadata,
                userContext,
              );
          }),
        // MEDIUM risk operations (20%)
        ...Array(10)
          .fill(null)
          .map(() => {
            const metadata =
              PerformanceTestDataFactory.createMediumRiskOperation();
            const mockOp = jest.fn().mockResolvedValue({ medium: true });
            return () =>
              databaseService.validateAndExecute(
                'concurrentMedium',
                mockOp,
                metadata,
                userContext,
              );
          }),
        // HIGH risk operations (10%)
        ...Array(5)
          .fill(null)
          .map(() => {
            const metadata =
              PerformanceTestDataFactory.createHighRiskOperation();
            const mockOp = jest.fn().mockResolvedValue({ high: true });
            return () =>
              databaseService.validateAndExecute(
                'concurrentHigh',
                mockOp,
                metadata,
                userContext,
              );
          }),
      ];

      const { averageDuration } =
        await PerformanceUtils.runConcurrentOperations(operations, 15);

      expect(averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CONCURRENT_OPERATION_MAX_TIME,
      );
    });
  });

  // ===== MEMORY USAGE PERFORMANCE TESTS =====

  describe('Memory Usage and Resource Optimization', () => {
    const userContext = PerformanceTestDataFactory.createUserContext();

    it('should maintain memory usage below thresholds during operations', async () => {
      const metadata = PerformanceTestDataFactory.createMediumRiskOperation();
      const mockOperation = jest.fn().mockResolvedValue({ memory: 'test' });

      const { memoryStats } = await PerformanceUtils.monitorMemoryUsage(
        async () => {
          const operations = Array(50)
            .fill(null)
            .map(() =>
              databaseService.validateAndExecute(
                'memoryTest',
                mockOperation,
                metadata,
                userContext,
              ),
            );
          return Promise.all(operations);
        },
        LOAD_TEST_CONFIG.MEMORY_SAMPLING_INTERVAL,
      );

      expect(memoryStats.peak).toBeLessThan(
        PERFORMANCE_THRESHOLDS.MEMORY_THRESHOLD_MB,
      );
      expect(memoryStats.average).toBeLessThan(
        PERFORMANCE_THRESHOLDS.MEMORY_THRESHOLD_MB * 0.8,
      );
    });

    it('should handle bulk operations without memory leaks', async () => {
      const bulkMetadata = PerformanceTestDataFactory.createBulkOperation(1000);
      const mockBulkOperation = jest.fn().mockResolvedValue({ inserted: 1000 });

      const { memoryStats } = await PerformanceUtils.monitorMemoryUsage(
        async () => {
          return databaseService.validateAndExecute(
            'bulkMemoryTest',
            mockBulkOperation,
            bulkMetadata,
            userContext,
          );
        },
      );

      expect(memoryStats.peak).toBeLessThan(
        PERFORMANCE_THRESHOLDS.MEMORY_THRESHOLD_MB,
      );
    });
  });

  // ===== BACKUP SERVICE PERFORMANCE IMPACT TESTS =====

  describe('Backup Service Performance Impact', () => {
    const userContext = PerformanceTestDataFactory.createUserContext();

    it('should minimize backup overhead for HIGH risk operations', async () => {
      const metadata = PerformanceTestDataFactory.createHighRiskOperation();
      const mockOperation = jest.fn().mockResolvedValue({ deleted: true });

      // Mock fast backup
      mockBackupService.createPreOperationBackup.mockResolvedValue({
        backupId: 'fast-backup',
        backupPath: '/tmp/fast.sql',
        backupSize: 1024,
        duration: 150, // Fast backup
        checksum: 'fast',
        timestamp: new Date(),
        verified: true,
      });

      const { duration } = await PerformanceUtils.measureExecutionTime(
        async () => {
          return databaseService.validateAndExecute(
            'fastBackupTest',
            mockOperation,
            metadata,
            userContext,
          );
        },
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.HIGH_RISK_MAX_TIME);
    });

    it('should handle parallel backup creation efficiently', async () => {
      const operations = Array(5)
        .fill(null)
        .map(() => {
          const metadata = PerformanceTestDataFactory.createHighRiskOperation();
          const mockOp = jest.fn().mockResolvedValue({ deleted: true });
          return () =>
            databaseService.validateAndExecute(
              'parallelBackup',
              mockOp,
              metadata,
              userContext,
            );
        });

      const { averageDuration } =
        await PerformanceUtils.runConcurrentOperations(operations, 3);

      expect(averageDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.HIGH_RISK_MAX_TIME,
      );
    });
  });

  // ===== STRESS TESTING =====

  describe('Enterprise-Scale Stress Testing', () => {
    const userContext = PerformanceTestDataFactory.createUserContext();

    it('should maintain performance under sustained load', async () => {
      const metadata = PerformanceTestDataFactory.createLowRiskOperation();
      const mockOperation = jest.fn().mockResolvedValue({ stress: true });

      const loadTest = await PerformanceUtils.createLoadGenerator(
        () =>
          databaseService.validateAndExecute(
            'stressTest',
            mockOperation,
            metadata,
            userContext,
          ),
        10, // 10 operations per second
        5000, // 5 seconds duration
      );

      expect(loadTest.errorCount).toBe(0);
      expect(loadTest.averageResponseTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.LOW_RISK_MAX_TIME,
      );
      expect(loadTest.operationsCompleted).toBeGreaterThan(40); // Should complete ~50 operations
    });

    it('should handle peak load scenarios', async () => {
      const operations = Array(LOAD_TEST_CONFIG.STRESS_TEST_OPERATIONS)
        .fill(null)
        .map((_, index) => {
          const riskType = index % 4;
          let _metadata: DatabaseOperationMetadata;

          switch (riskType) {
            case 0:
              metadata = PerformanceTestDataFactory.createLowRiskOperation();
              break;
            case 1:
              metadata = PerformanceTestDataFactory.createMediumRiskOperation();
              break;
            case 2:
              metadata = PerformanceTestDataFactory.createHighRiskOperation();
              break;
            default:
              metadata =
                PerformanceTestDataFactory.createCriticalRiskOperation();
          }

          const mockOp = jest.fn().mockResolvedValue({ peak: true });
          return () =>
            databaseService.validateAndExecute(
              `peakTest${index}`,
              mockOp,
              metadata,
              userContext,
            );
        });

      const startTime = Date.now();
      const { results } = await PerformanceUtils.runConcurrentOperations(
        operations,
        20,
      );
      const totalDuration = Date.now() - startTime;

      expect(results).toHaveLength(LOAD_TEST_CONFIG.STRESS_TEST_OPERATIONS);
      expect(totalDuration).toBeLessThan(60000); // Should complete within 1 minute
    });
  });

  // ===== PERFORMANCE REGRESSION TESTS =====

  describe('Performance Regression Prevention', () => {
    const userContext = PerformanceTestDataFactory.createUserContext();

    it('should maintain consistent performance across multiple test runs', async () => {
      const metadata = PerformanceTestDataFactory.createMediumRiskOperation();
      const mockOperation = jest.fn().mockResolvedValue({ regression: true });

      const testRuns = 5;
      const durations: number[] = [];

      for (let i = 0; i < testRuns; i++) {
        const { duration } = await PerformanceUtils.measureExecutionTime(
          async () => {
            return databaseService.validateAndExecute(
              `regressionTest${i}`,
              mockOperation,
              metadata,
              userContext,
            );
          },
        );
        durations.push(duration);
      }

      // Check consistency (standard deviation should be low)
      const average =
        durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const variance =
        durations.reduce((sum, d) => sum + Math.pow(d - average, 2), 0) /
        durations.length;
      const standardDeviation = Math.sqrt(variance);

      expect(average).toBeLessThan(PERFORMANCE_THRESHOLDS.MEDIUM_RISK_MAX_TIME);
      expect(standardDeviation).toBeLessThan(average * 0.2); // Less than 20% variation
    });

    it('should demonstrate performance improvements with caching', async () => {
      const metadata = PerformanceTestDataFactory.createLowRiskOperation();
      const mockOperation = jest.fn().mockResolvedValue({ cached: true });

      // Clear cache first
      databaseService.clearCache();

      // Measure first execution (cache miss)
      const { duration: uncachedDuration } =
        await PerformanceUtils.measureExecutionTime(async () => {
          return databaseService.validateAndExecute(
            'cacheBenefitTest',
            mockOperation,
            metadata,
            userContext,
          );
        });

      // Measure subsequent execution (cache hit)
      const { duration: cachedDuration } =
        await PerformanceUtils.measureExecutionTime(async () => {
          return databaseService.validateAndExecute(
            'cacheBenefitTest',
            mockOperation,
            metadata,
            userContext,
          );
        });

      // Cached execution should be significantly faster
      expect(cachedDuration).toBeLessThan(uncachedDuration * 0.6);
      expect(cachedDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CACHE_HIT_MAX_TIME,
      );
    });
  });

  // ===== PERFORMANCE STATISTICS AND MONITORING =====

  describe('Performance Statistics and Monitoring', () => {
    it('should provide comprehensive performance metrics', async () => {
      const userContext = PerformanceTestDataFactory.createUserContext();

      // Execute various operations
      const operations = [
        PerformanceTestDataFactory.createLowRiskOperation(),
        PerformanceTestDataFactory.createMediumRiskOperation(),
        PerformanceTestDataFactory.createHighRiskOperation(),
      ];

      for (let i = 0; i < operations.length; i++) {
        const mockOp = jest.fn().mockResolvedValue({ stats: true });
        await databaseService.validateAndExecute(
          `statsTest${i}`,
          mockOp,
          operations[i],
          userContext,
        );
      }

      // Check performance statistics
      const dbStats = databaseService.getDatabaseOperationStatistics();
      expect(dbStats.totalOperations).toBeGreaterThan(0);
      expect(dbStats.averageExecutionTime).toMatch(/^\d+(\.\d+)?ms$/);

      const cacheStats = databaseService.getCacheStatistics();
      expect(cacheStats.averageValidationTime).toMatch(/^\d+(\.\d+)?ms$/);

      const prismaStats = prismaService.getPrismaOperationStatistics();
      expect(prismaStats.averageExecutionTime).toMatch(/^\d+(\.\d+)?ms$/);
    });

    it('should track performance trends over time', async () => {
      const userContext = PerformanceTestDataFactory.createUserContext();
      const metadata = PerformanceTestDataFactory.createMediumRiskOperation();

      // Execute multiple operations to build performance history
      for (let i = 0; i < 10; i++) {
        const mockOp = jest.fn().mockResolvedValue({ trend: i });
        await databaseService.validateAndExecute(
          `trendTest${i}`,
          mockOp,
          metadata,
          userContext,
        );
      }

      const stats = databaseService.getDatabaseOperationStatistics();
      expect(stats.totalOperations).toBe(10);
      expect(stats.successRate).toBe('100.00%');
    });
  });
});
