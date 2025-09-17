/**
 * Database Health Service Comprehensive Test Suite
 * Tests health monitoring, Kubernetes probe integration, reliability patterns,
 * and performance tracking for database health management
 *
 * Coverage:
 * - Health check registration and execution
 * - Kubernetes liveness/readiness/startup probes
 * - Retry logic and timeout handling
 * - Background monitoring and metrics collection
 * - Health history and reporting
 * - Error handling and fallback scenarios
 *
 * @author Database Testing Specialist
 * @version 1.0.0
 * @since Comprehensive Database Testing Phase
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import {
  DatabaseHealthService,
  HealthCheckOptions,
  HealthCheckResult,
  HealthReport,
} from '../health/database-health.service';
import { DatabaseService } from '../database.service';
import { ConnectionPoolService } from '../connection-pool.service';

describe('DatabaseHealthService Comprehensive Test Suite', () => {
  let service: DatabaseHealthService;
  let configService: ConfigService;
  let databaseService: DatabaseService;
  let connectionPoolService: ConnectionPoolService;
  let module: TestingModule;

  // Mock data
  const mockConnectionPoolMetrics = {
    active: 5,
    idle: 3,
    total: 8,
    waiting: 0,
    utilization: 62.5,
    exhausted: false,
  };

  const mockPoolHealthCheck = {
    healthy: true,
    issues: [],
    lastCheck: new Date(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        DatabaseHealthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                DB_HEALTH_CHECK_TIMEOUT: 5000,
                DB_HEALTH_RETRY_ATTEMPTS: 2,
                DB_HEALTH_RETRY_DELAY: 1000,
                DB_BACKGROUND_HEALTH_INTERVAL: 60000,
                DB_HEALTH_HISTORY_SIZE: 100,
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: DatabaseService,
          useValue: {
            executeRawQuery: jest.fn(),
            getHealthStatus: jest.fn(),
            getMetrics: jest.fn(),
          },
        },
        {
          provide: ConnectionPoolService,
          useValue: {
            getPoolMetrics: jest
              .fn()
              .mockReturnValue(mockConnectionPoolMetrics),
            performPoolHealthCheck: jest
              .fn()
              .mockReturnValue(mockPoolHealthCheck),
          },
        },
      ],
    }).compile();

    service = module.get<DatabaseHealthService>(DatabaseHealthService);
    configService = module.get<ConfigService>(ConfigService);
    databaseService = module.get<DatabaseService>(DatabaseService);
    connectionPoolService = module.get<ConnectionPoolService>(
      ConnectionPoolService,
    );

    // Clear any existing timers
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(async () => {
    // Clean up intervals
    if ((service as any).backgroundMonitoring) {
      clearInterval((service as any).backgroundMonitoring);
    }
    jest.useRealTimers();
    await module.close();
  });

  describe('Service Initialization', () => {
    it('should initialize health service with registered checks', async () => {
      expect(service).toBeDefined();
      expect((service as any).healthChecks.size).toBeGreaterThan(0);

      const registeredChecks = Array.from((service as any).healthChecks.keys());
      expect(registeredChecks).toContain('database-connectivity');
      expect(registeredChecks).toContain('connection-pool');
      expect(registeredChecks).toContain('database-performance');
      expect(registeredChecks).toContain('schema-integrity');
    });

    it('should start background monitoring on module init', async () => {
      databaseService.executeRawQuery = jest
        .fn()
        .mockResolvedValue([{ health_check: 1 }]);

      await service.onModuleInit();

      expect((service as any).backgroundMonitoring).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith(
        'DB_BACKGROUND_HEALTH_INTERVAL',
        60000,
      );
    });

    it('should perform initial health check on module init', async () => {
      databaseService.executeRawQuery = jest
        .fn()
        .mockResolvedValue([{ health_check: 1 }]);

      await service.onModuleInit();

      expect(databaseService.executeRawQuery).toHaveBeenCalled();
      expect(service.getLastHealthReport()).toBeDefined();
    });

    it('should clean up resources on module destroy', () => {
      (service as any).backgroundMonitoring = setInterval(() => {}, 1000);

      service.onModuleDestroy();

      expect((service as any).backgroundMonitoring).toBeUndefined();
    });
  });

  describe('Individual Health Checks', () => {
    it('should perform database connectivity check successfully', async () => {
      databaseService.executeRawQuery = jest
        .fn()
        .mockResolvedValue([{ health_check: 1 }]);

      const options: HealthCheckOptions = {
        timeout: 5000,
        critical: true,
        includeDetails: true,
        retryAttempts: 2,
        retryDelay: 1000,
      };

      const connectivityCheck = (service as any).healthChecks.get(
        'database-connectivity',
      );
      const result = await connectivityCheck(options);

      expect(result.name).toBe('database-connectivity');
      expect(result.status).toBe('healthy');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.details).toBeDefined();
    });

    it('should handle database connectivity check failure', async () => {
      const dbError = new Error('Connection failed');
      databaseService.executeRawQuery = jest.fn().mockRejectedValue(dbError);

      const options: HealthCheckOptions = {
        timeout: 5000,
        critical: true,
        includeDetails: false,
        retryAttempts: 0,
        retryDelay: 1000,
      };

      const connectivityCheck = (service as any).healthChecks.get(
        'database-connectivity',
      );
      const result = await connectivityCheck(options);

      expect(result.name).toBe('database-connectivity');
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Connection failed');
    });

    it('should perform connection pool health check', async () => {
      const options: HealthCheckOptions = {
        timeout: 5000,
        critical: true,
        includeDetails: true,
        retryAttempts: 1,
        retryDelay: 1000,
      };

      const poolCheck = (service as any).healthChecks.get('connection-pool');
      const result = await poolCheck(options);

      expect(result.name).toBe('connection-pool');
      expect(result.status).toBe('healthy');
      expect(result.details).toEqual({
        utilization: mockConnectionPoolMetrics.utilization,
        active: mockConnectionPoolMetrics.active,
        total: mockConnectionPoolMetrics.total,
        issues: mockPoolHealthCheck.issues,
      });
    });

    it('should detect degraded connection pool performance', async () => {
      // Mock high utilization but still healthy pool
      connectionPoolService.getPoolMetrics = jest.fn().mockReturnValue({
        ...mockConnectionPoolMetrics,
        utilization: 85,
      });
      connectionPoolService.performPoolHealthCheck = jest.fn().mockReturnValue({
        healthy: true,
        issues: ['High utilization detected'],
      });

      const options: HealthCheckOptions = {
        timeout: 5000,
        critical: true,
        includeDetails: true,
        retryAttempts: 1,
        retryDelay: 1000,
      };

      const poolCheck = (service as any).healthChecks.get('connection-pool');
      const result = await poolCheck(options);

      expect(result.status).toBe('degraded');
    });

    it('should perform database performance check', async () => {
      databaseService.executeRawQuery = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve([{ count: 5 }]), 50); // Fast query
        });
      });

      const options: HealthCheckOptions = {
        timeout: 5000,
        critical: false,
        includeDetails: true,
        retryAttempts: 1,
        retryDelay: 1000,
      };

      const performanceCheck = (service as any).healthChecks.get(
        'database-performance',
      );
      const result = await performanceCheck(options);

      expect(result.name).toBe('database-performance');
      expect(result.status).toBe('healthy'); // Under 100ms
      expect(result.details).toEqual({
        queryDuration: expect.any(Number),
        threshold: { healthy: 100, degraded: 1000 },
      });
    });

    it('should detect slow database performance', async () => {
      databaseService.executeRawQuery = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve([{ count: 5 }]), 500); // Degraded performance
        });
      });

      const options: HealthCheckOptions = {
        timeout: 5000,
        critical: false,
        includeDetails: false,
        retryAttempts: 1,
        retryDelay: 1000,
      };

      const performanceCheck = (service as any).healthChecks.get(
        'database-performance',
      );
      const result = await performanceCheck(options);

      expect(result.status).toBe('degraded'); // Between 100ms and 1000ms
    });

    it('should perform schema integrity check', async () => {
      // Mock successful table existence checks
      databaseService.executeRawQuery = jest
        .fn()
        .mockResolvedValueOnce([{ table_name: 'Task' }])
        .mockResolvedValueOnce([{ table_name: 'User' }])
        .mockResolvedValueOnce([{ table_name: 'Message' }]);

      const options: HealthCheckOptions = {
        timeout: 5000,
        critical: false,
        includeDetails: true,
        retryAttempts: 1,
        retryDelay: 1000,
      };

      const schemaCheck = (service as any).healthChecks.get('schema-integrity');
      const result = await schemaCheck(options);

      expect(result.name).toBe('schema-integrity');
      expect(result.status).toBe('healthy');
      expect(result.details).toEqual({
        tablesChecked: 3,
        tablesFound: 3,
        missingTables: [],
      });
    });

    it('should detect missing database tables', async () => {
      // Mock missing table scenario
      databaseService.executeRawQuery = jest
        .fn()
        .mockResolvedValueOnce([{ table_name: 'Task' }])
        .mockResolvedValueOnce([]) // User table missing
        .mockResolvedValueOnce([{ table_name: 'Message' }]);

      const options: HealthCheckOptions = {
        timeout: 5000,
        critical: false,
        includeDetails: true,
        retryAttempts: 1,
        retryDelay: 1000,
      };

      const schemaCheck = (service as any).healthChecks.get('schema-integrity');
      const result = await schemaCheck(options);

      expect(result.status).toBe('unhealthy');
      expect(result.details.missingTables).toContain('User');
    });
  });

  describe('Comprehensive Health Check Execution', () => {
    beforeEach(() => {
      // Mock all health checks to succeed by default
      databaseService.executeRawQuery = jest
        .fn()
        .mockResolvedValue([{ health_check: 1 }]);
    });

    it('should perform comprehensive health check', async () => {
      const report = await service.performHealthCheck(true);

      expect(report).toBeDefined();
      expect(report.status).toBe('healthy');
      expect(report.checks.length).toBeGreaterThan(0);
      expect(report.summary.total).toBe(report.checks.length);
      expect(report.kubernetes).toBeDefined();
      expect(report.kubernetes.liveness).toBe(true);
      expect(report.kubernetes.readiness).toBe(true);
      expect(report.kubernetes.startup).toBe(true);
    });

    it('should detect degraded status with some failures', async () => {
      // Make performance check fail
      databaseService.executeRawQuery = jest
        .fn()
        .mockImplementation((query) => {
          if (query.includes('information_schema')) {
            return Promise.reject(new Error('Performance check failed'));
          }
          return Promise.resolve([{ health_check: 1 }]);
        });

      const report = await service.performHealthCheck(true);

      expect(report.status).toBe('degraded'); // Non-critical check failed
      expect(report.summary.unhealthy).toBe(1);
      expect(report.kubernetes.liveness).toBe(true); // Still alive
      expect(report.kubernetes.readiness).toBe(true); // Still ready (non-critical failure)
    });

    it('should detect unhealthy status with critical failures', async () => {
      // Make connectivity check fail
      databaseService.executeRawQuery = jest
        .fn()
        .mockImplementation((query) => {
          if (query === 'SELECT 1 as health_check') {
            return Promise.reject(new Error('Database connection failed'));
          }
          return Promise.resolve([{ count: 5 }]);
        });

      const report = await service.performHealthCheck(true);

      expect(report.status).toBe('unhealthy'); // Critical check failed
      expect(report.kubernetes.liveness).toBe(false);
      expect(report.kubernetes.readiness).toBe(false);
      expect(report.kubernetes.startup).toBe(false);
    });

    it('should handle health check timeouts', async () => {
      // Make health check take longer than timeout
      databaseService.executeRawQuery = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve([{ health_check: 1 }]), 10000); // 10 seconds
        });
      });

      const report = await service.performHealthCheck(false);

      expect(
        report.checks.some((check) => check.error?.includes('timed out')),
      ).toBe(true);
    });

    it('should retry failed health checks', async () => {
      let attemptCount = 0;
      databaseService.executeRawQuery = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve([{ health_check: 1 }]);
      });

      const report = await service.performHealthCheck(false);

      expect(attemptCount).toBe(3); // Initial + 2 retries
      expect(
        report.checks.find((c) => c.name === 'database-connectivity')
          ?.retryCount,
      ).toBe(2);
    });
  });

  describe('Kubernetes Probe Integration', () => {
    beforeEach(() => {
      databaseService.executeRawQuery = jest
        .fn()
        .mockResolvedValue([{ health_check: 1 }]);
    });

    it('should provide liveness probe status', async () => {
      const livenessStatus = await service.getLivenessStatus();

      expect(livenessStatus.status).toBe(true);
      expect(livenessStatus.details).toEqual({
        checks: expect.any(Number),
        healthy: expect.any(Number),
        status: 'healthy',
      });
    });

    it('should handle liveness probe failure', async () => {
      databaseService.executeRawQuery = jest
        .fn()
        .mockRejectedValue(new Error('DB down'));

      const livenessStatus = await service.getLivenessStatus();

      expect(livenessStatus.status).toBe(false);
    });

    it('should provide readiness probe status', async () => {
      const readinessStatus = await service.getReadinessStatus();

      expect(readinessStatus.status).toBe(true);
      expect(readinessStatus.details).toEqual({
        overallStatus: 'healthy',
        criticalChecksHealthy: true,
        connectionPoolUtilization: expect.any(Number),
      });
    });

    it('should handle readiness probe with degraded status', async () => {
      // Make non-critical check fail
      databaseService.executeRawQuery = jest
        .fn()
        .mockImplementation((query) => {
          if (query.includes('information_schema')) {
            return Promise.reject(new Error('Performance degraded'));
          }
          return Promise.resolve([{ health_check: 1 }]);
        });

      const readinessStatus = await service.getReadinessStatus();

      expect(readinessStatus.status).toBe(true); // Still ready despite degradation
      expect(readinessStatus.details.overallStatus).toBe('degraded');
    });

    it('should provide startup probe status', async () => {
      const startupStatus = await service.getStartupStatus();

      expect(startupStatus.status).toBe(true);
      expect(startupStatus.details).toEqual({
        databaseInitialized: true,
        connectionPoolReady: true,
        uptime: expect.any(Number),
      });
    });

    it('should handle startup probe failure', async () => {
      connectionPoolService.getPoolMetrics = jest.fn().mockReturnValue({
        ...mockConnectionPoolMetrics,
        total: 0,
        exhausted: true,
      });

      const startupStatus = await service.getStartupStatus();

      expect(startupStatus.status).toBe(false);
      expect(startupStatus.details.connectionPoolReady).toBe(false);
    });
  });

  describe('Health History and Metrics', () => {
    beforeEach(() => {
      databaseService.executeRawQuery = jest
        .fn()
        .mockResolvedValue([{ health_check: 1 }]);
    });

    it('should maintain health check history', async () => {
      await service.performHealthCheck();
      await service.performHealthCheck();
      await service.performHealthCheck();

      const history = service.getHealthHistory();

      expect(history.length).toBe(3);
      expect(history[0].timestamp).toBeInstanceOf(Date);
      expect(history[0].status).toBe('healthy');
    });

    it('should limit health history size', async () => {
      // Override config for smaller history
      configService.get = jest.fn((key: string, defaultValue?: any) => {
        if (key === 'DB_HEALTH_HISTORY_SIZE') return 2;
        return defaultValue;
      });

      // Perform multiple health checks
      await service.performHealthCheck();
      await service.performHealthCheck();
      await service.performHealthCheck();

      const history = service.getHealthHistory();

      expect(history.length).toBe(2); // Limited to configured size
    });

    it('should provide health metrics', async () => {
      // Perform some health checks with different outcomes
      await service.performHealthCheck(); // Healthy

      // Make next check fail
      databaseService.executeRawQuery = jest
        .fn()
        .mockRejectedValue(new Error('Failure'));
      await service.performHealthCheck(); // Unhealthy

      // Make next check succeed again
      databaseService.executeRawQuery = jest
        .fn()
        .mockResolvedValue([{ health_check: 1 }]);
      await service.performHealthCheck(); // Healthy

      const metrics = service.getHealthMetrics();

      expect(metrics.totalChecks).toBe(3);
      expect(metrics.successRate).toBeCloseTo(66.67, 1); // 2 out of 3 successful
      expect(metrics.averageDuration).toBeGreaterThan(0);
      expect(metrics.recentFailures).toBe(1);
    });

    it('should return last health report', async () => {
      await service.performHealthCheck(true);

      const lastReport = service.getLastHealthReport();

      expect(lastReport).toBeDefined();
      expect(lastReport?.status).toBe('healthy');
      expect(lastReport?.checks.length).toBeGreaterThan(0);
    });
  });

  describe('Background Monitoring', () => {
    beforeEach(() => {
      databaseService.executeRawQuery = jest
        .fn()
        .mockResolvedValue([{ health_check: 1 }]);
    });

    it('should start background monitoring', async () => {
      await service.onModuleInit();

      expect((service as any).backgroundMonitoring).toBeDefined();
      expect(typeof (service as any).backgroundMonitoring).toBe('object');
    });

    it('should perform periodic health checks', async () => {
      await service.onModuleInit();

      // Fast forward time to trigger background checks
      jest.advanceTimersByTime(60000); // 1 minute

      expect(databaseService.executeRawQuery).toHaveBeenCalledTimes(2); // Initial + background
    });

    it('should handle background monitoring errors gracefully', async () => {
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      databaseService.executeRawQuery = jest
        .fn()
        .mockRejectedValue(new Error('Background check failed'));

      await service.onModuleInit();

      // Fast forward time to trigger background check
      jest.advanceTimersByTime(60000);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Background health check failed',
        expect.any(Error),
      );

      loggerErrorSpy.mockRestore();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should generate fallback report on health check execution failure', async () => {
      // Make health check registration fail
      jest
        .spyOn(service as any, 'generateOperationId')
        .mockImplementation(() => {
          throw new Error('Operation ID generation failed');
        });

      const report = await service.performHealthCheck();

      expect(report.status).toBe('unhealthy');
      expect(report.checks.length).toBe(1);
      expect(report.checks[0].name).toBe('health-check-execution');
      expect(report.checks[0].error).toContain(
        'Operation ID generation failed',
      );
    });

    it('should handle health check critical classification', () => {
      const isCritical = (service as any).isHealthCheckCritical;

      expect(isCritical('database-connectivity')).toBe(true);
      expect(isCritical('connection-pool')).toBe(true);
      expect(isCritical('database-performance')).toBe(false);
      expect(isCritical('schema-integrity')).toBe(false);
    });

    it('should handle connection pool metrics errors', () => {
      connectionPoolService.getPoolMetrics = jest
        .fn()
        .mockImplementation(() => {
          throw new Error('Pool metrics error');
        });

      const utilization = (service as any).getConnectionPoolUtilization();
      expect(utilization).toBe(0);

      const poolReady = (service as any).isConnectionPoolReady();
      expect(poolReady).toBe(false);
    });

    it('should calculate service uptime correctly', () => {
      const uptime = (service as any).getServiceUptime();
      expect(uptime).toBeGreaterThanOrEqual(0);
      expect(typeof uptime).toBe('number');
    });

    it('should generate unique operation IDs', () => {
      const operationIds = new Set();

      for (let i = 0; i < 50; i++) {
        const operationId = (service as any).generateOperationId();
        expect(operationId).toMatch(/^health_\d+_[a-z0-9]{6}$/);
        expect(operationIds.has(operationId)).toBe(false);
        operationIds.add(operationId);
      }

      expect(operationIds.size).toBe(50);
    });

    it('should handle delay utility correctly', async () => {
      const startTime = Date.now();
      await (service as any).delay(100);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Health Check Configuration', () => {
    it('should use configuration values for health check options', async () => {
      const report = await service.performHealthCheck();

      expect(configService.get).toHaveBeenCalledWith(
        'DB_HEALTH_CHECK_TIMEOUT',
        5000,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'DB_HEALTH_RETRY_ATTEMPTS',
        2,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'DB_HEALTH_RETRY_DELAY',
        1000,
      );
    });

    it('should handle missing configuration gracefully', () => {
      configService.get = jest.fn().mockReturnValue(undefined);

      expect(() => {
        const options = {
          timeout: configService.get('DB_HEALTH_CHECK_TIMEOUT', 5000),
          critical: true,
          includeDetails: false,
          retryAttempts: configService.get('DB_HEALTH_RETRY_ATTEMPTS', 2),
          retryDelay: configService.get('DB_HEALTH_RETRY_DELAY', 1000),
        };
      }).not.toThrow();
    });
  });
});
