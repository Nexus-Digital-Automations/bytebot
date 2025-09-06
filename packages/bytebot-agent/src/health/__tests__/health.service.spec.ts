/**
 * Health Service Unit Tests - Comprehensive testing for health check functionality
 * Tests health monitoring, dependency checks, and status reporting
 *
 * Test Coverage:
 * - Liveness probe health checks
 * - Readiness probe health checks
 * - Startup probe health checks
 * - Database connectivity validation
 * - External service health monitoring
 * - System resource monitoring
 * - Health status aggregation
 * - Performance and reliability testing
 *
 * @author Testing & Quality Assurance Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from '../health.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  HealthStatus,
  HealthCheckResult,
  DependencyHealth,
  SystemHealth,
} from '../types/health.interface';

describe('HealthService', () => {
  let service: HealthService;
  let configService: jest.Mocked<ConfigService>;
  let prismaService: jest.Mocked<PrismaService>;

  // Mock system metrics
  const mockSystemMetrics = {
    cpuUsage: 45.2,
    memoryUsage: {
      used: 1024 * 1024 * 1024, // 1GB
      total: 4 * 1024 * 1024 * 1024, // 4GB
      percentage: 25.0,
    },
    diskUsage: {
      used: 50 * 1024 * 1024 * 1024, // 50GB
      total: 100 * 1024 * 1024 * 1024, // 100GB
      percentage: 50.0,
    },
    uptime: 3600, // 1 hour
  };

  const mockConfig = {
    health: {
      database: {
        timeout: 5000,
        retryAttempts: 3,
      },
      system: {
        cpuThreshold: 80,
        memoryThreshold: 90,
        diskThreshold: 85,
      },
    },
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const mockPrismaService = {
      $queryRaw: jest.fn(),
      $disconnect: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    configService = module.get(ConfigService);
    prismaService = module.get(PrismaService);

    // Setup default mocks
    configService.get.mockReturnValue(mockConfig.health);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLivenessCheck', () => {
    it('should return healthy status when service is running', async () => {
      // Act
      const result = await service.getLivenessCheck();

      // Assert
      expect(result).toEqual({
        status: HealthStatus.HEALTHY,
        timestamp: expect.any(Date),
        checks: {
          service: {
            status: HealthStatus.HEALTHY,
            message: 'Service is running',
            responseTime: expect.any(Number),
          },
        },
        responseTime: expect.any(Number),
      });
    });

    it('should complete liveness check within performance threshold', async () => {
      // Act
      const startTime = Date.now();
      const result = await service.getLivenessCheck();
      const duration = Date.now() - startTime;

      // Assert
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(result.responseTime).toBeLessThan(100);
    });

    it('should handle service startup phase', async () => {
      // Arrange - simulate startup phase
      const startupService = new HealthService(configService, prismaService);

      // Act
      const result = await startupService.getLivenessCheck();

      // Assert
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.checks.service.message).toContain('Service is running');
    });

    it('should log liveness check attempts', async () => {
      // Arrange
      const debugSpy = jest.spyOn(service['logger'], 'debug');

      // Act
      await service.getLivenessCheck();

      // Assert
      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Liveness check completed'),
        expect.objectContaining({
          status: HealthStatus.HEALTHY,
          responseTime: expect.any(Number),
        }),
      );
    });
  });

  describe('getReadinessCheck', () => {
    it('should return healthy status when all dependencies are available', async () => {
      // Arrange
      prismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // Act
      const result = await service.getReadinessCheck();

      // Assert
      expect(result).toEqual({
        status: HealthStatus.HEALTHY,
        timestamp: expect.any(Date),
        checks: {
          database: {
            status: HealthStatus.HEALTHY,
            message: 'Database connection successful',
            responseTime: expect.any(Number),
          },
        },
        responseTime: expect.any(Number),
      });
    });

    it('should return unhealthy status when database is unavailable', async () => {
      // Arrange
      prismaService.$queryRaw.mockRejectedValue(
        new Error('Connection refused'),
      );

      // Act
      const result = await service.getReadinessCheck();

      // Assert
      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks.database.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks.database.message).toContain(
        'Database connection failed',
      );
      expect(result.checks.database.error).toBeDefined();
    });

    it('should handle database timeout scenarios', async () => {
      // Arrange
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 6000),
      );
      prismaService.$queryRaw.mockReturnValue(timeoutPromise as any);

      // Act
      const result = await service.getReadinessCheck();

      // Assert
      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks.database.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks.database.message).toContain(
        'Database connection failed',
      );
    });

    it('should validate multiple dependencies', async () => {
      // Arrange
      prismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // Mock additional external services
      jest.spyOn(service as any, 'checkExternalServices').mockResolvedValue({
        api: {
          status: HealthStatus.HEALTHY,
          message: 'API service available',
          responseTime: 50,
        },
        cache: {
          status: HealthStatus.HEALTHY,
          message: 'Cache service available',
          responseTime: 25,
        },
      });

      // Act
      const result = await service.getReadinessCheck();

      // Assert
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.checks).toMatchObject({
        database: expect.objectContaining({ status: HealthStatus.HEALTHY }),
      });
    });

    it('should retry failed dependency checks', async () => {
      // Arrange
      prismaService.$queryRaw
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Still failing'))
        .mockResolvedValueOnce([{ result: 1 }]);

      // Act
      const result = await service.getReadinessCheck();

      // Assert
      expect(prismaService.$queryRaw).toHaveBeenCalledTimes(3);
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.checks.database.status).toBe(HealthStatus.HEALTHY);
    });

    it('should aggregate multiple dependency failures correctly', async () => {
      // Arrange
      prismaService.$queryRaw.mockRejectedValue(new Error('DB failed'));

      jest.spyOn(service as any, 'checkExternalServices').mockResolvedValue({
        api: {
          status: HealthStatus.UNHEALTHY,
          message: 'API service unavailable',
          error: 'Connection timeout',
        },
      });

      // Act
      const result = await service.getReadinessCheck();

      // Assert
      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks.database.status).toBe(HealthStatus.UNHEALTHY);
    });
  });

  describe('getStartupCheck', () => {
    it('should return healthy status when startup is complete', async () => {
      // Arrange
      prismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // Act
      const result = await service.getStartupCheck();

      // Assert
      expect(result).toEqual({
        status: HealthStatus.HEALTHY,
        timestamp: expect.any(Date),
        checks: {
          initialization: {
            status: HealthStatus.HEALTHY,
            message: 'Service initialization complete',
            responseTime: expect.any(Number),
          },
          database: {
            status: HealthStatus.HEALTHY,
            message: 'Database connection successful',
            responseTime: expect.any(Number),
          },
          migrations: {
            status: HealthStatus.HEALTHY,
            message: 'Database migrations up to date',
            responseTime: expect.any(Number),
          },
        },
        responseTime: expect.any(Number),
      });
    });

    it('should return unhealthy status during startup phase', async () => {
      // Arrange - simulate startup in progress
      jest.spyOn(service as any, 'isStartupComplete').mockReturnValue(false);

      // Act
      const result = await service.getStartupCheck();

      // Assert
      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks.initialization.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks.initialization.message).toContain(
        'startup in progress',
      );
    });

    it('should validate database migration status', async () => {
      // Arrange
      prismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      jest.spyOn(service as any, 'checkMigrationStatus').mockResolvedValue({
        status: HealthStatus.HEALTHY,
        message: 'All migrations applied',
        migrationsApplied: 15,
        pendingMigrations: 0,
      });

      // Act
      const result = await service.getStartupCheck();

      // Assert
      expect(result.checks.migrations.status).toBe(HealthStatus.HEALTHY);
      expect(result.checks.migrations.message).toContain('up to date');
    });

    it('should handle pending database migrations', async () => {
      // Arrange
      prismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      jest.spyOn(service as any, 'checkMigrationStatus').mockResolvedValue({
        status: HealthStatus.UNHEALTHY,
        message: 'Pending migrations detected',
        migrationsApplied: 10,
        pendingMigrations: 2,
      });

      // Act
      const result = await service.getStartupCheck();

      // Assert
      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks.migrations.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks.migrations.message).toContain('Pending migrations');
    });
  });

  describe('getDetailedHealthCheck', () => {
    it('should return comprehensive health status', async () => {
      // Arrange
      prismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      jest
        .spyOn(service as any, 'getSystemMetrics')
        .mockResolvedValue(mockSystemMetrics);

      // Act
      const result = await service.getDetailedHealthCheck();

      // Assert
      expect(result).toEqual({
        status: HealthStatus.HEALTHY,
        timestamp: expect.any(Date),
        version: expect.any(String),
        uptime: expect.any(Number),
        checks: {
          liveness: expect.objectContaining({ status: HealthStatus.HEALTHY }),
          readiness: expect.objectContaining({ status: HealthStatus.HEALTHY }),
          startup: expect.objectContaining({ status: HealthStatus.HEALTHY }),
        },
        dependencies: expect.any(Object),
        system: expect.objectContaining({
          cpu: expect.any(Number),
          memory: expect.any(Object),
          disk: expect.any(Object),
        }),
        responseTime: expect.any(Number),
      });
    });

    it('should detect system resource pressure', async () => {
      // Arrange
      const highResourceUsage = {
        ...mockSystemMetrics,
        cpuUsage: 85.0, // Above threshold
        memoryUsage: {
          ...mockSystemMetrics.memoryUsage,
          percentage: 95.0, // Above threshold
        },
      };

      prismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      jest
        .spyOn(service as any, 'getSystemMetrics')
        .mockResolvedValue(highResourceUsage);

      // Act
      const result = await service.getDetailedHealthCheck();

      // Assert
      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.system.cpu).toBe(85.0);
      expect(result.system.memory.percentage).toBe(95.0);
    });

    it('should include performance metrics', async () => {
      // Arrange
      prismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      jest
        .spyOn(service as any, 'getSystemMetrics')
        .mockResolvedValue(mockSystemMetrics);

      // Act
      const startTime = Date.now();
      const result = await service.getDetailedHealthCheck();
      const duration = Date.now() - startTime;

      // Assert
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.responseTime).toBeLessThan(1000); // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle partial health check failures gracefully', async () => {
      // Arrange
      prismaService.$queryRaw.mockRejectedValue(new Error('DB failure'));
      jest
        .spyOn(service as any, 'getSystemMetrics')
        .mockResolvedValue(mockSystemMetrics);

      // Act
      const result = await service.getDetailedHealthCheck();

      // Assert
      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.checks.readiness.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.system).toBeDefined(); // System metrics should still be available
    });
  });

  describe('dependency monitoring', () => {
    it('should monitor database connection pool', async () => {
      // Arrange
      const mockPoolStats = {
        active: 5,
        idle: 15,
        total: 20,
        waitingCount: 0,
      };

      jest
        .spyOn(service as any, 'getDatabasePoolStats')
        .mockResolvedValue(mockPoolStats);
      prismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // Act
      const result = await service.getReadinessCheck();

      // Assert
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.checks.database.metadata).toMatchObject({
        pool: mockPoolStats,
      });
    });

    it('should detect database connection pool exhaustion', async () => {
      // Arrange
      const exhaustedPoolStats = {
        active: 20,
        idle: 0,
        total: 20,
        waitingCount: 5, // Connections waiting
      };

      jest
        .spyOn(service as any, 'getDatabasePoolStats')
        .mockResolvedValue(exhaustedPoolStats);
      prismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // Act
      const result = await service.getReadinessCheck();

      // Assert
      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.checks.database.status).toBe(HealthStatus.DEGRADED);
      expect(result.checks.database.message).toContain(
        'connection pool pressure',
      );
    });

    it('should validate external service dependencies', async () => {
      // Mock external service checks
      const externalServices = [
        { name: 'auth-service', url: 'http://auth:8080/health' },
        { name: 'storage-service', url: 'http://storage:8080/health' },
      ];

      jest.spyOn(service as any, 'checkExternalServices').mockResolvedValue({
        'auth-service': {
          status: HealthStatus.HEALTHY,
          message: 'Auth service available',
          responseTime: 150,
        },
        'storage-service': {
          status: HealthStatus.HEALTHY,
          message: 'Storage service available',
          responseTime: 75,
        },
      });

      prismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // Act
      const result = await service.getReadinessCheck();

      // Assert
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.dependencies).toMatchObject({
        'auth-service': expect.objectContaining({
          status: HealthStatus.HEALTHY,
        }),
        'storage-service': expect.objectContaining({
          status: HealthStatus.HEALTHY,
        }),
      });
    });
  });

  describe('performance and reliability', () => {
    it('should complete health checks within SLA thresholds', async () => {
      // Arrange
      prismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const healthCheckTypes = [
        { method: 'getLivenessCheck', threshold: 50 },
        { method: 'getReadinessCheck', threshold: 200 },
        { method: 'getStartupCheck', threshold: 500 },
        { method: 'getDetailedHealthCheck', threshold: 1000 },
      ];

      for (const { method, threshold } of healthCheckTypes) {
        // Act
        const startTime = Date.now();
        await (service as any)[method]();
        const duration = Date.now() - startTime;

        // Assert
        expect(duration).toBeLessThan(threshold);
      }
    });

    it('should handle concurrent health check requests', async () => {
      // Arrange
      prismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);
      const concurrentRequests = 20;

      // Act
      const startTime = Date.now();
      const promises = Array.from({ length: concurrentRequests }, () =>
        service.getReadinessCheck(),
      );
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(concurrentRequests);
      expect(
        results.every((result) => result.status === HealthStatus.HEALTHY),
      ).toBe(true);
      expect(duration).toBeLessThan(5000); // Should handle 20 concurrent requests within 5 seconds
    });

    it('should implement circuit breaker pattern for failing dependencies', async () => {
      // Arrange
      const consecutiveFailures = 5;

      // Mock consecutive failures
      for (let i = 0; i < consecutiveFailures; i++) {
        prismaService.$queryRaw.mockRejectedValueOnce(new Error('DB failure'));
        await service.getReadinessCheck();
      }

      // Act - next call should be circuit broken
      const result = await service.getReadinessCheck();

      // Assert
      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.checks.database.message).toContain('circuit breaker open');
    });

    it('should recover from circuit breaker state', async () => {
      // Arrange - trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        prismaService.$queryRaw.mockRejectedValueOnce(new Error('DB failure'));
        await service.getReadinessCheck();
      }

      // Wait for circuit breaker timeout
      await new Promise((resolve) => setTimeout(resolve, 1100)); // Wait 1.1 seconds

      // Mock successful response
      prismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // Act
      const result = await service.getReadinessCheck();

      // Assert
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.checks.database.status).toBe(HealthStatus.HEALTHY);
    });
  });

  describe('error handling and logging', () => {
    it('should handle and log health check errors', async () => {
      // Arrange
      const errorSpy = jest.spyOn(service['logger'], 'error');
      prismaService.$queryRaw.mockRejectedValue(new Error('Unexpected error'));

      // Act
      const result = await service.getReadinessCheck();

      // Assert
      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Health check error'),
        expect.objectContaining({
          error: expect.any(String),
          stack: expect.any(String),
        }),
      );
    });

    it('should not expose sensitive information in health responses', async () => {
      // Arrange
      prismaService.$queryRaw.mockRejectedValue(
        new Error('Connection failed: password=secret123'),
      );

      // Act
      const result = await service.getReadinessCheck();

      // Assert
      const resultString = JSON.stringify(result);
      expect(resultString).not.toContain('password');
      expect(resultString).not.toContain('secret123');
      expect(result.checks.database.error).toBeDefined();
      expect(result.checks.database.error).not.toContain('secret123');
    });

    it('should provide meaningful error messages for different failure types', async () => {
      const errorScenarios = [
        {
          error: new Error('ECONNREFUSED'),
          expectedMessage: 'connection refused',
        },
        { error: new Error('timeout'), expectedMessage: 'connection timeout' },
        {
          error: new Error('ENOTFOUND'),
          expectedMessage: 'hostname not found',
        },
      ];

      for (const { error, expectedMessage } of errorScenarios) {
        // Arrange
        prismaService.$queryRaw.mockRejectedValue(error);

        // Act
        const result = await service.getReadinessCheck();

        // Assert
        expect(result.checks.database.message.toLowerCase()).toContain(
          expectedMessage,
        );

        // Reset mock for next iteration
        jest.clearAllMocks();
        configService.get.mockReturnValue(mockConfig.health);
      }
    });
  });
});
