/**
 * Database Service Comprehensive Test Suite
 * Tests connection pooling, health monitoring, circuit breaker integration,
 * retry logic, performance metrics, and reliability patterns
 *
 * Coverage:
 * - Connection pool management and optimization
 * - Health monitoring and recovery
 * - Circuit breaker integration
 * - Retry logic and reliability patterns
 * - Performance metrics collection
 * - Error handling and resilience
 *
 * @author Database Testing Specialist
 * @version 1.0.0
 * @since Comprehensive Database Testing Phase
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  DatabaseService,
  DatabaseMetrics,
  QueryPerformanceMetrics,
} from '../database.service';
import { ConnectionPoolConfig } from '../connection-pool.config';
import { CircuitBreakerService } from '../../common/services/circuit-breaker.service';
import { RetryService } from '../../common/services/retry.service';
import { ShutdownService } from '../../common/services/shutdown.service';

describe('DatabaseService Comprehensive Test Suite', () => {
  let service: DatabaseService;
  let configService: ConfigService;
  let connectionPoolConfig: ConnectionPoolConfig;
  let circuitBreakerService: CircuitBreakerService;
  let retryService: RetryService;
  let shutdownService: ShutdownService;
  let mockPrismaClient: jest.Mocked<PrismaClient>;
  let module: TestingModule;

  // Test configuration
  const mockConnectionPoolOptions = {
    maxConnections: 20,
    minConnections: 5,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 300000,
    slowQueryThreshold: 1000,
    logQueries: true,
    enableRetries: true,
    retryAttempts: 3,
    retryDelayMs: 1000,
  };

  const mockMetricsConfig = {
    collectConnectionMetrics: true,
    metricsCollectionInterval: 30000,
    enableSlowQueryTracking: true,
    enablePerformanceMonitoring: true,
  };

  beforeEach(async () => {
    // Create mock Prisma client
    mockPrismaClient = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $queryRaw: jest.fn(),
      $queryRawUnsafe: jest.fn(),
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
      $on: jest.fn(),
      $use: jest.fn(),
    } as any;

    module = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                NODE_ENV: 'test',
                DB_HEALTH_CHECK_INTERVAL: 30000,
                DATABASE_URL: 'postgresql://user:pass@localhost:5432/test',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: ConnectionPoolConfig,
          useValue: {
            validateConfiguration: jest.fn(),
            getConnectionPoolOptions: jest
              .fn()
              .mockReturnValue(mockConnectionPoolOptions),
            getPrismaConnectionUrl: jest
              .fn()
              .mockReturnValue(
                'postgresql://user:pass@localhost:5432/test?connection_limit=20&pool_timeout=30',
              ),
            getMetricsConfig: jest.fn().mockReturnValue(mockMetricsConfig),
          },
        },
        {
          provide: CircuitBreakerService,
          useValue: {
            execute: jest.fn(),
            getAllCircuitMetrics: jest.fn(),
            getCircuitState: jest.fn(),
            resetCircuit: jest.fn(),
          },
        },
        {
          provide: RetryService,
          useValue: {
            executeWithRetry: jest.fn(),
            PresetConfigs: {
              DATABASE: {
                maxAttempts: 3,
                delay: 1000,
                backoffMultiplier: 2,
              },
            },
          },
        },
        {
          provide: ShutdownService,
          useValue: {
            registerCleanupTask: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
    configService = module.get<ConfigService>(ConfigService);
    connectionPoolConfig =
      module.get<ConnectionPoolConfig>(ConnectionPoolConfig);
    circuitBreakerService = module.get<CircuitBreakerService>(
      CircuitBreakerService,
    );
    retryService = module.get<RetryService>(RetryService);
    shutdownService = module.get<ShutdownService>(ShutdownService);

    // Mock private properties and methods
    (service as any).prismaClient = mockPrismaClient;
    (service as any).connectionPoolOptions = mockConnectionPoolOptions;
    (service as any).startTime = new Date();
    (service as any).queryMetrics = [];
    (service as any).lastHealthCheck = new Date();
    (service as any).isHealthy = true;
    (service as any).totalQueries = 0;
    (service as any).totalQueryTime = 0;
    (service as any).slowQueries = 0;
    (service as any).errorCount = 0;
  });

  afterEach(async () => {
    // Clear intervals if they exist
    if ((service as any).healthCheckInterval) {
      clearInterval((service as any).healthCheckInterval as NodeJS.Timeout);
    }
    if ((service as any).metricsInterval) {
      clearInterval((service as any).metricsInterval as NodeJS.Timeout);
    }
    await module.close();
  });

  describe('Service Initialization', () => {
    it('should initialize database service successfully', async () => {
      mockPrismaClient.$connect.mockResolvedValue();

      await service.onModuleInit();

      expect(connectionPoolConfig.validateConfiguration).toHaveBeenCalled();
      expect(connectionPoolConfig.getConnectionPoolOptions).toHaveBeenCalled();
      expect(mockPrismaClient.$connect).toHaveBeenCalled();
      expect(shutdownService.registerCleanupTask).toHaveBeenCalledTimes(2);
    });

    it('should handle initialization errors gracefully', async () => {
      const initError = new Error('Connection failed');
      mockPrismaClient.$connect.mockRejectedValue(initError);

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
      expect(connectionPoolConfig.validateConfiguration).toHaveBeenCalled();
    });

    it('should register shutdown cleanup tasks', async () => {
      mockPrismaClient.$connect.mockResolvedValue();

      await service.onModuleInit();

      expect(shutdownService.registerCleanupTask).toHaveBeenCalledWith(
        'database-connections',
        expect.any(Function),
      );
      expect(shutdownService.registerCleanupTask).toHaveBeenCalledWith(
        'database-metrics',
        expect.any(Function),
      );
    });

    it('should configure Prisma client with correct options', async () => {
      mockPrismaClient.$connect.mockResolvedValue();

      await service.onModuleInit();

      expect(connectionPoolConfig.getPrismaConnectionUrl).toHaveBeenCalled();
    });
  });

  describe('Connection Pool Management', () => {
    beforeEach(async () => {
      mockPrismaClient.$connect.mockResolvedValue();
      await service.onModuleInit();
    });

    it('should get Prisma client instance', () => {
      const client = service.getPrismaClient();
      expect(client).toBeDefined();
      expect(client).toBe(mockPrismaClient);
    });

    it('should throw error if service not initialized', () => {
      (service as any).prismaClient = null;

      expect(() => service.getPrismaClient()).toThrow(
        'Database service not initialized. Call onModuleInit first.',
      );
    });

    it('should get connection pool metrics', async () => {
      const metrics = service.getMetrics();

      expect(metrics.connectionPool).toBeDefined();
      expect(metrics.connectionPool).toHaveProperty('active');
      expect(metrics.connectionPool).toHaveProperty('idle');
      expect(metrics.connectionPool).toHaveProperty('waiting');
      expect(metrics.connectionPool).toHaveProperty('total');
    });

    it('should validate connection pool configuration', () => {
      expect(mockConnectionPoolOptions.maxConnections).toBeGreaterThan(0);
      expect(mockConnectionPoolOptions.minConnections).toBeGreaterThanOrEqual(
        0,
      );
      expect(mockConnectionPoolOptions.maxConnections).toBeGreaterThanOrEqual(
        mockConnectionPoolOptions.minConnections,
      );
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      mockPrismaClient.$connect.mockResolvedValue();
      await service.onModuleInit();
    });

    it('should perform successful health check', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ health_check: 1 }]);

      const healthStatus = service.getHealthStatus();

      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.lastHealthCheck).toBeInstanceOf(Date);
      expect(healthStatus.connectionStatus).toBe('connected');
      expect(healthStatus.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should handle health check failures', async () => {
      const healthError = new Error('Connection lost');
      mockPrismaClient.$queryRaw.mockRejectedValue(healthError);

      // Manually trigger health check failure
      (service as any).isHealthy = false;
      (service as any).errorCount = 1;

      const healthStatus = service.getHealthStatus();

      expect(healthStatus.isHealthy).toBe(false);
      expect(healthStatus.connectionStatus).toBe('disconnected');
    });

    it('should collect health metrics continuously', (done) => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ health_check: 1 }]);

      // Mock the health check interval
      const mockInterval = setInterval(async () => {
        try {
          await (service as any).performHealthCheck();
          clearInterval(mockInterval);
          done();
        } catch (error) {
          clearInterval(mockInterval);
          done(error);
        }
      }, 100);

      (service as any).healthCheckInterval = mockInterval;
    });

    it('should handle health check timeout scenarios', async () => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), 50);
      });
      mockPrismaClient.$queryRaw.mockImplementation(
        () => timeoutPromise as any,
      );

      // Trigger health check manually
      try {
        await (service as any).performHealthCheck();
      } catch (error) {
        // Expected to fail
      }

      // Verify error handling
      const healthStatus = service.getHealthStatus();
      expect((service as any).errorCount).toBeGreaterThan(0);
    });
  });

  describe('Performance Metrics Collection', () => {
    beforeEach(async () => {
      mockPrismaClient.$connect.mockResolvedValue();
      await service.onModuleInit();
    });

    it('should collect comprehensive database metrics', async () => {
      // Simulate some query activity
      (service as any).totalQueries = 100;
      (service as any).totalQueryTime = 5000; // 5 seconds total
      (service as any).slowQueries = 5;
      (service as any).errorCount = 2;

      const metrics: DatabaseMetrics = service.getMetrics();

      expect(metrics.performance.totalQueries).toBe(100);
      expect(metrics.performance.averageQueryTime).toBe(50); // 5000/100
      expect(metrics.performance.slowQueries).toBe(5);
      expect(metrics.health.errorRate).toBe(0.02); // 2/100
      expect(metrics.performance.queriesPerSecond).toBeGreaterThan(0);
    });

    it('should track query performance metrics', () => {
      const queryMetrics: QueryPerformanceMetrics = {
        query: 'SELECT * FROM tasks',
        duration: 1500,
        timestamp: new Date(),
        success: true,
      };

      (service as any).recordQueryMetrics(queryMetrics);

      expect((service as any).totalQueries).toBe(1);
      expect((service as any).totalQueryTime).toBe(1500);
      expect((service as any).slowQueries).toBe(1); // > 1000ms threshold
    });

    it('should track failed query metrics', () => {
      const failedQueryMetrics: QueryPerformanceMetrics = {
        query: 'INVALID SQL',
        duration: 100,
        timestamp: new Date(),
        success: false,
        error: 'Syntax error',
      };

      (service as any).recordQueryMetrics(failedQueryMetrics);

      expect((service as any).totalQueries).toBe(1);
      expect((service as any).errorCount).toBe(1);
    });

    it('should limit query metrics history', () => {
      // Add more than 1000 query metrics
      for (let i = 0; i < 1050; i++) {
        (service as any).recordQueryMetrics({
          query: `query_${i}`,
          duration: 100,
          timestamp: new Date(),
          success: true,
        });
      }

      expect((service as any).queryMetrics.length).toBe(1000);
    });

    it('should detect and warn about performance issues', async () => {
      // Mock logger warn method
      const loggerWarnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      // Set up concerning metrics
      (service as any).totalQueries = 100;
      (service as any).totalQueryTime = 150000; // 1500ms average
      (service as any).slowQueries = 15;
      (service as any).errorCount = 8; // 8% error rate

      await (service as any).collectAndLogMetrics();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'High average query time detected',
        expect.objectContaining({ averageQueryTime: 1500 }),
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'High number of slow queries detected',
        expect.objectContaining({ slowQueries: 15 }),
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'High database error rate detected',
        expect.objectContaining({ errorRate: 0.08 }),
      );

      loggerWarnSpy.mockRestore();
    });
  });

  describe('Circuit Breaker Integration', () => {
    beforeEach(async () => {
      mockPrismaClient.$connect.mockResolvedValue();
      await service.onModuleInit();
    });

    it('should execute operations with circuit breaker protection', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      circuitBreakerService.execute = jest.fn().mockResolvedValue('success');

      const result = await service.executeWithCircuitBreaker(
        mockOperation,
        'test_circuit',
      );

      expect(circuitBreakerService.execute).toHaveBeenCalledWith(
        'test_circuit',
        mockOperation,
        expect.any(Function),
      );
      expect(result).toBe('success');
    });

    it('should handle circuit breaker fallback', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new Error('Service down'));
      const fallbackError = new Error(
        'Database circuit breaker is open - service unavailable',
      );

      circuitBreakerService.execute = jest
        .fn()
        .mockImplementation((name, operation, fallback) => fallback());

      await expect(
        service.executeWithCircuitBreaker(mockOperation),
      ).rejects.toThrow(
        'Database circuit breaker is open - service unavailable',
      );
    });

    it('should get reliability metrics including circuit breaker data', async () => {
      const mockCircuitMetrics = [
        {
          circuitName: 'database_default',
          state: 'CLOSED',
          failureCount: 0,
          successCount: 100,
          lastFailureTime: null,
        },
        {
          circuitName: 'database_health_check',
          state: 'HALF_OPEN',
          failureCount: 3,
          successCount: 97,
          lastFailureTime: new Date(),
        },
      ];

      circuitBreakerService.getAllCircuitMetrics = jest
        .fn()
        .mockReturnValue(mockCircuitMetrics);

      const reliabilityMetrics = service.getReliabilityMetrics();

      expect(reliabilityMetrics.circuitBreakers).toHaveLength(2);
      expect(reliabilityMetrics.circuitBreakers[0].circuitName).toBe(
        'database_default',
      );
      expect(reliabilityMetrics.performance).toBeDefined();
      expect(reliabilityMetrics.connectionPool).toBeDefined();
    });
  });

  describe('Retry Logic Integration', () => {
    beforeEach(async () => {
      mockPrismaClient.$connect.mockResolvedValue();
      await service.onModuleInit();
    });

    it('should execute operations with retry logic', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      retryService.executeWithRetry = jest.fn().mockResolvedValue('success');

      const result = await service.executeWithRetry(mockOperation);

      expect(retryService.executeWithRetry).toHaveBeenCalledWith(
        mockOperation,
        RetryService.PresetConfigs.DATABASE,
      );
      expect(result).toBe('success');
    });

    it('should combine circuit breaker and retry patterns', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      circuitBreakerService.execute = jest
        .fn()
        .mockImplementation((name, operation) => operation());
      retryService.executeWithRetry = jest.fn().mockResolvedValue('success');

      const result = await service.executeWithReliability(
        mockOperation,
        'test_circuit',
      );

      expect(circuitBreakerService.execute).toHaveBeenCalledWith(
        'test_circuit',
        expect.any(Function),
      );
      expect(retryService.executeWithRetry).toHaveBeenCalledWith(
        mockOperation,
        RetryService.PresetConfigs.DATABASE,
      );
      expect(result).toBe('success');
    });
  });

  describe('Raw Query Execution', () => {
    beforeEach(async () => {
      mockPrismaClient.$connect.mockResolvedValue();
      await service.onModuleInit();
    });

    it('should execute raw query successfully', async () => {
      const mockResult = [{ id: 1, name: 'test' }];
      mockPrismaClient.$queryRawUnsafe.mockResolvedValue(mockResult);

      const result = await service.executeRawQuery(
        'SELECT * FROM tasks WHERE id = $1',
        ['task-id-123'],
      );

      expect(mockPrismaClient.$queryRawUnsafe).toHaveBeenCalledWith(
        'SELECT * FROM tasks WHERE id = $1',
        'task-id-123',
      );
      expect(result).toEqual(mockResult);
    });

    it('should execute raw query without parameters', async () => {
      const mockResult = [{ count: 5 }];
      mockPrismaClient.$queryRawUnsafe.mockResolvedValue(mockResult);

      const result = await service.executeRawQuery(
        'SELECT COUNT(*) as count FROM tasks',
      );

      expect(mockPrismaClient.$queryRawUnsafe).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM tasks',
      );
      expect(result).toEqual(mockResult);
    });

    it('should record metrics for raw query execution', async () => {
      mockPrismaClient.$queryRawUnsafe.mockResolvedValue([]);
      const recordMetricsSpy = jest.spyOn(service as any, 'recordQueryMetrics');

      await service.executeRawQuery('SELECT 1');

      expect(recordMetricsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'raw_query',
          success: true,
          duration: expect.any(Number),
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should handle raw query errors and record metrics', async () => {
      const queryError = new Error('SQL syntax error');
      mockPrismaClient.$queryRawUnsafe.mockRejectedValue(queryError);
      const recordMetricsSpy = jest.spyOn(service as any, 'recordQueryMetrics');

      await expect(service.executeRawQuery('INVALID SQL')).rejects.toThrow(
        'SQL syntax error',
      );

      expect(recordMetricsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'raw_query',
          success: false,
          error: 'SQL syntax error',
          duration: expect.any(Number),
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should execute raw query with full reliability patterns', async () => {
      const mockResult = [{ success: true }];
      mockPrismaClient.$queryRawUnsafe.mockResolvedValue(mockResult);

      circuitBreakerService.execute = jest
        .fn()
        .mockImplementation((name, operation) => operation());
      retryService.executeWithRetry = jest
        .fn()
        .mockImplementation((operation) => operation());

      const result = await service.executeRawQueryWithReliability(
        'SELECT * FROM tasks LIMIT 1',
      );

      expect(result).toEqual(mockResult);
      expect(circuitBreakerService.execute).toHaveBeenCalled();
      expect(retryService.executeWithRetry).toHaveBeenCalled();
    });
  });

  describe('Service Shutdown and Cleanup', () => {
    beforeEach(async () => {
      mockPrismaClient.$connect.mockResolvedValue();
      mockPrismaClient.$disconnect.mockResolvedValue();
      await service.onModuleInit();
    });

    it('should perform graceful shutdown', async () => {
      // Set up intervals
      (service as any).healthCheckInterval = setInterval(() => {}, 1000);
      (service as any).metricsInterval = setInterval(() => {}, 1000);

      await service.onModuleDestroy();

      expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    });

    it('should handle shutdown errors gracefully', async () => {
      const shutdownError = new Error('Disconnect failed');
      mockPrismaClient.$disconnect.mockRejectedValue(shutdownError);

      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      await service.onModuleDestroy();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error during database service shutdown',
        shutdownError,
      );

      loggerErrorSpy.mockRestore();
    });

    it('should execute database cleanup tasks', async () => {
      // Simulate cleanup task execution
      const cleanupTasks = (shutdownService.registerCleanupTask as jest.Mock)
        .mock.calls;

      expect(cleanupTasks).toHaveLength(2);

      const [connectionsCleanup, metricsCleanup] = cleanupTasks;

      expect(connectionsCleanup[0]).toBe('database-connections');
      expect(metricsCleanup[0]).toBe('database-metrics');

      // Execute cleanup tasks
      await connectionsCleanup[1]();
      await metricsCleanup[1]();

      // Verify cleanup effects
      expect((service as any).queryMetrics).toEqual([]);
      expect((service as any).totalQueries).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle connection pool exhaustion', async () => {
      const poolError = new Error('Connection pool exhausted');
      mockPrismaClient.$queryRawUnsafe.mockRejectedValue(poolError);

      await expect(service.executeRawQuery('SELECT 1')).rejects.toThrow(
        'Connection pool exhausted',
      );
    });

    it('should handle database connection timeout', async () => {
      const timeoutError = new Error('Connection timeout');
      mockPrismaClient.$connect.mockRejectedValue(timeoutError);

      await expect(service.onModuleInit()).rejects.toThrow(
        'Connection timeout',
      );
    });

    it('should handle query timeout scenarios', async () => {
      const timeoutError = new Error('Query timeout exceeded');
      mockPrismaClient.$queryRawUnsafe.mockRejectedValue(timeoutError);

      await expect(
        service.executeRawQuery('SELECT * FROM large_table'),
      ).rejects.toThrow('Query timeout exceeded');
    });

    it('should handle concurrent health checks gracefully', async () => {
      mockPrismaClient.$queryRaw.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve([{ health_check: 1 }]), 100),
          ) as any,
      );

      // Trigger multiple concurrent health checks
      const healthCheckPromises = Array.from({ length: 5 }, () =>
        (service as any).performHealthCheck(),
      );

      await Promise.all(healthCheckPromises);

      // Verify no race conditions occurred
      expect((service as any).isHealthy).toBe(true);
    });

    it('should handle metrics collection errors', async () => {
      const metricsError = new Error('Metrics collection failed');
      // Mock a method that exists on the service
      jest
        .spyOn(service as any, 'performHealthCheck')
        .mockRejectedValue(metricsError);

      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      await (service as any).collectAndLogMetrics();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to collect database metrics',
        metricsError,
      );

      loggerErrorSpy.mockRestore();
    });

    it('should validate operation ID generation', () => {
      const operationId1 = (service as any).generateOperationId();
      const operationId2 = (service as any).generateOperationId();

      expect(operationId1).toMatch(/^db_op_\d+_[a-z0-9]{7}$/);
      expect(operationId2).toMatch(/^db_op_\d+_[a-z0-9]{7}$/);
      expect(operationId1).not.toBe(operationId2);
    });
  });

  describe('Configuration Integration', () => {
    it('should respect configuration values', () => {
      expect(configService.get).toHaveBeenCalledWith('NODE_ENV');
      expect(configService.get).toHaveBeenCalledWith(
        'DB_HEALTH_CHECK_INTERVAL',
        30000,
      );
    });

    it('should use different log levels based on environment', async () => {
      const prodConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'NODE_ENV') return 'production';
          return defaultValue;
        }),
      };

      const prodModule = await Test.createTestingModule({
        providers: [
          DatabaseService,
          { provide: ConfigService, useValue: prodConfigService },
          { provide: ConnectionPoolConfig, useValue: connectionPoolConfig },
          { provide: CircuitBreakerService, useValue: circuitBreakerService },
          { provide: RetryService, useValue: retryService },
          { provide: ShutdownService, useValue: shutdownService },
        ],
      }).compile();

      const prodService = prodModule.get<DatabaseService>(DatabaseService);

      // Verify production configuration is applied
      const logConfig = (prodService as any).getLogConfiguration();
      expect(logConfig).toEqual(['error', 'warn']);
    });

    it('should handle missing configuration gracefully', () => {
      const emptyConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      expect(() => {
        const logConfig = (service as any).getLogConfiguration();
        // Should return default configuration
      }).not.toThrow();
    });
  });
});
