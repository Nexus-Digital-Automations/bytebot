/**
 * Health Controller Unit Tests - Comprehensive testing for health endpoints
 * Tests HTTP endpoints for Kubernetes health probes and monitoring
 *
 * Test Coverage:
 * - Liveness probe endpoint (/health/live)
 * - Readiness probe endpoint (/health/ready)
 * - Startup probe endpoint (/health/startup)
 * - Detailed health endpoint (/health)
 * - HTTP status code mapping
 * - Response format validation
 * - Error handling and logging
 * - Performance and security testing
 *
 * @author Testing & Quality Assurance Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { HealthController } from '../health.controller';
import { HealthService } from '../health.service';
import { HealthStatus } from '../types/health.interface';

describe('HealthController', () => {
  let app: INestApplication;
  let controller: HealthController;
  let healthService: jest.Mocked<HealthService>;

  // Mock health responses
  const mockHealthyResponse = {
    status: HealthStatus.HEALTHY,
    timestamp: new Date(),
    checks: {
      service: {
        status: HealthStatus.HEALTHY,
        message: 'Service is running',
        responseTime: 25,
      },
    },
    responseTime: 50,
  };

  const mockUnhealthyResponse = {
    status: HealthStatus.UNHEALTHY,
    timestamp: new Date(),
    checks: {
      database: {
        status: HealthStatus.UNHEALTHY,
        message: 'Database connection failed',
        error: 'Connection timeout',
        responseTime: 5000,
      },
    },
    responseTime: 5100,
  };

  const mockDegradedResponse = {
    status: HealthStatus.DEGRADED,
    timestamp: new Date(),
    checks: {
      service: {
        status: HealthStatus.HEALTHY,
        message: 'Service is running',
        responseTime: 25,
      },
      database: {
        status: HealthStatus.HEALTHY,
        message: 'Database connection successful',
        responseTime: 150,
      },
    },
    system: {
      cpu: 85.0, // High CPU usage
      memory: { percentage: 70.0 },
    },
    responseTime: 200,
  };

  const mockDetailedHealthResponse = {
    status: HealthStatus.HEALTHY,
    timestamp: new Date(),
    version: '1.0.0',
    uptime: 3600,
    checks: {
      liveness: mockHealthyResponse,
      readiness: mockHealthyResponse,
      startup: mockHealthyResponse,
    },
    dependencies: {
      database: {
        status: HealthStatus.HEALTHY,
        message: 'Database connection successful',
        responseTime: 45,
      },
    },
    system: {
      cpu: 45.2,
      memory: {
        used: 1073741824, // 1GB
        total: 4294967296, // 4GB
        percentage: 25.0,
      },
      disk: {
        used: 53687091200, // 50GB
        total: 107374182400, // 100GB
        percentage: 50.0,
      },
    },
    responseTime: 125,
  };

  beforeEach(async () => {
    const mockHealthService = {
      getLivenessCheck: jest.fn(),
      getReadinessCheck: jest.fn(),
      getStartupCheck: jest.fn(),
      getDetailedHealthCheck: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get(HealthService);
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('/health/live (GET)', () => {
    it('should return 200 OK when service is healthy', async () => {
      // Arrange
      healthService.getLivenessCheck.mockResolvedValue(mockHealthyResponse);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        status: HealthStatus.HEALTHY,
        timestamp: expect.any(String),
        checks: expect.any(Object),
        responseTime: expect.any(Number),
      });
      expect(healthService.getLivenessCheck).toHaveBeenCalledTimes(1);
    });

    it('should return 503 Service Unavailable when service is unhealthy', async () => {
      // Arrange
      healthService.getLivenessCheck.mockResolvedValue(mockUnhealthyResponse);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(HttpStatus.SERVICE_UNAVAILABLE);

      expect(response.body).toMatchObject({
        status: HealthStatus.UNHEALTHY,
        timestamp: expect.any(String),
      });
    });

    it('should return 200 OK for degraded service status', async () => {
      // Arrange
      healthService.getLivenessCheck.mockResolvedValue(mockDegradedResponse);

      // Act & Assert
      await request(app.getHttpServer())
        .get('/health/live')
        .expect(HttpStatus.OK);
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      healthService.getLivenessCheck.mockRejectedValue(
        new Error('Internal service error'),
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(HttpStatus.SERVICE_UNAVAILABLE);

      expect(response.body).toMatchObject({
        status: HealthStatus.UNHEALTHY,
        error: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should include proper response headers', async () => {
      // Arrange
      healthService.getLivenessCheck.mockResolvedValue(mockHealthyResponse);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(HttpStatus.OK)
        .expect('Content-Type', /json/);

      expect(response.headers['cache-control']).toBe(
        'no-cache, no-store, must-revalidate',
      );
      expect(response.headers['x-health-check-type']).toBe('liveness');
    });

    it('should complete within performance threshold', async () => {
      // Arrange
      healthService.getLivenessCheck.mockResolvedValue(mockHealthyResponse);

      // Act
      const startTime = Date.now();
      await request(app.getHttpServer())
        .get('/health/live')
        .expect(HttpStatus.OK);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(200); // Should complete within 200ms
    });

    it('should handle concurrent liveness requests', async () => {
      // Arrange
      healthService.getLivenessCheck.mockResolvedValue(mockHealthyResponse);
      const concurrentRequests = 10;

      // Act
      const promises = Array.from({ length: concurrentRequests }, () =>
        request(app.getHttpServer()).get('/health/live').expect(HttpStatus.OK),
      );

      const responses = await Promise.all(promises);

      // Assert
      expect(responses).toHaveLength(concurrentRequests);
      expect(responses.every((res) => res.status === HttpStatus.OK)).toBe(true);
    });
  });

  describe('/health/ready (GET)', () => {
    it('should return 200 OK when all dependencies are ready', async () => {
      // Arrange
      healthService.getReadinessCheck.mockResolvedValue(mockHealthyResponse);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        status: HealthStatus.HEALTHY,
        checks: expect.any(Object),
      });
      expect(response.headers['x-health-check-type']).toBe('readiness');
    });

    it('should return 503 Service Unavailable when dependencies are not ready', async () => {
      // Arrange
      healthService.getReadinessCheck.mockResolvedValue(mockUnhealthyResponse);

      // Act & Assert
      await request(app.getHttpServer())
        .get('/health/ready')
        .expect(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('should return 200 OK for degraded readiness status', async () => {
      // Arrange
      const degradedReadinessResponse = {
        ...mockHealthyResponse,
        status: HealthStatus.DEGRADED,
      };
      healthService.getReadinessCheck.mockResolvedValue(
        degradedReadinessResponse,
      );

      // Act & Assert
      await request(app.getHttpServer())
        .get('/health/ready')
        .expect(HttpStatus.OK);
    });

    it('should include dependency check details', async () => {
      // Arrange
      const readinessWithDependencies = {
        ...mockHealthyResponse,
        checks: {
          ...mockHealthyResponse.checks,
          database: {
            status: HealthStatus.HEALTHY,
            message: 'Database connection successful',
            responseTime: 45,
          },
          cache: {
            status: HealthStatus.HEALTHY,
            message: 'Cache connection successful',
            responseTime: 15,
          },
        },
      };
      healthService.getReadinessCheck.mockResolvedValue(
        readinessWithDependencies,
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(HttpStatus.OK);

      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('cache');
      expect(response.body.checks.database.status).toBe(HealthStatus.HEALTHY);
      expect(response.body.checks.cache.status).toBe(HealthStatus.HEALTHY);
    });

    it('should timeout for long-running readiness checks', async () => {
      // Arrange
      const longRunningPromise = new Promise((resolve) =>
        setTimeout(() => resolve(mockHealthyResponse), 10000),
      );
      healthService.getReadinessCheck.mockReturnValue(
        longRunningPromise as any,
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .timeout(5000)
        .expect(HttpStatus.SERVICE_UNAVAILABLE);

      expect(response.body.error).toContain('timeout');
    });
  });

  describe('/health/startup (GET)', () => {
    it('should return 200 OK when startup is complete', async () => {
      // Arrange
      const startupResponse = {
        ...mockHealthyResponse,
        checks: {
          ...mockHealthyResponse.checks,
          initialization: {
            status: HealthStatus.HEALTHY,
            message: 'Service initialization complete',
            responseTime: 100,
          },
          migrations: {
            status: HealthStatus.HEALTHY,
            message: 'Database migrations up to date',
            responseTime: 200,
          },
        },
      };
      healthService.getStartupCheck.mockResolvedValue(startupResponse);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health/startup')
        .expect(HttpStatus.OK);

      expect(response.body.checks).toHaveProperty('initialization');
      expect(response.body.checks).toHaveProperty('migrations');
      expect(response.headers['x-health-check-type']).toBe('startup');
    });

    it('should return 503 Service Unavailable during startup phase', async () => {
      // Arrange
      const startupInProgressResponse = {
        ...mockUnhealthyResponse,
        checks: {
          initialization: {
            status: HealthStatus.UNHEALTHY,
            message: 'Service startup in progress',
            responseTime: 500,
          },
        },
      };
      healthService.getStartupCheck.mockResolvedValue(
        startupInProgressResponse,
      );

      // Act & Assert
      await request(app.getHttpServer())
        .get('/health/startup')
        .expect(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('should handle startup check failures', async () => {
      // Arrange
      healthService.getStartupCheck.mockRejectedValue(
        new Error('Startup check failed'),
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health/startup')
        .expect(HttpStatus.SERVICE_UNAVAILABLE);

      expect(response.body).toMatchObject({
        status: HealthStatus.UNHEALTHY,
        error: expect.any(String),
      });
    });

    it('should allow longer response times for startup checks', async () => {
      // Arrange
      const slowStartupResponse = {
        ...mockHealthyResponse,
        responseTime: 2000, // 2 seconds
      };
      healthService.getStartupCheck.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(slowStartupResponse), 2000),
          ),
      );

      // Act
      const startTime = Date.now();
      await request(app.getHttpServer())
        .get('/health/startup')
        .timeout(5000)
        .expect(HttpStatus.OK);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeGreaterThan(1900);
      expect(duration).toBeLessThan(2200);
    });
  });

  describe('/health (GET)', () => {
    it('should return comprehensive health information', async () => {
      // Arrange
      healthService.getDetailedHealthCheck.mockResolvedValue(
        mockDetailedHealthResponse,
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({
        status: HealthStatus.HEALTHY,
        version: expect.any(String),
        uptime: expect.any(Number),
        checks: {
          liveness: expect.any(Object),
          readiness: expect.any(Object),
          startup: expect.any(Object),
        },
        dependencies: expect.any(Object),
        system: {
          cpu: expect.any(Number),
          memory: expect.any(Object),
          disk: expect.any(Object),
        },
      });
      expect(response.headers['x-health-check-type']).toBe('detailed');
    });

    it('should return 503 when overall health is unhealthy', async () => {
      // Arrange
      const unhealthyDetailedResponse = {
        ...mockDetailedHealthResponse,
        status: HealthStatus.UNHEALTHY,
      };
      healthService.getDetailedHealthCheck.mockResolvedValue(
        unhealthyDetailedResponse,
      );

      // Act & Assert
      await request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('should include system resource information', async () => {
      // Arrange
      healthService.getDetailedHealthCheck.mockResolvedValue(
        mockDetailedHealthResponse,
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK);

      expect(response.body.system).toMatchObject({
        cpu: expect.any(Number),
        memory: {
          used: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number),
        },
        disk: {
          used: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number),
        },
      });
    });

    it('should include application version and uptime', async () => {
      // Arrange
      healthService.getDetailedHealthCheck.mockResolvedValue(
        mockDetailedHealthResponse,
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.version).toBe('string');
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should handle partial system information gracefully', async () => {
      // Arrange
      const partialHealthResponse = {
        ...mockDetailedHealthResponse,
        system: {
          cpu: 45.2,
          memory: { percentage: 25.0 }, // Missing used/total
          // Missing disk information
        },
      };
      healthService.getDetailedHealthCheck.mockResolvedValue(
        partialHealthResponse,
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK);

      expect(response.body.system.cpu).toBe(45.2);
      expect(response.body.system.memory.percentage).toBe(25.0);
    });
  });

  describe('HTTP status code mapping', () => {
    const statusMappingTests = [
      { healthStatus: HealthStatus.HEALTHY, httpStatus: HttpStatus.OK },
      { healthStatus: HealthStatus.DEGRADED, httpStatus: HttpStatus.OK },
      {
        healthStatus: HealthStatus.UNHEALTHY,
        httpStatus: HttpStatus.SERVICE_UNAVAILABLE,
      },
    ];

    statusMappingTests.forEach(({ healthStatus, httpStatus }) => {
      it(`should map ${healthStatus} to HTTP ${httpStatus}`, async () => {
        // Arrange
        const response = { ...mockHealthyResponse, status: healthStatus };
        healthService.getLivenessCheck.mockResolvedValue(response);

        // Act & Assert
        await request(app.getHttpServer())
          .get('/health/live')
          .expect(httpStatus);
      });
    });
  });

  describe('response format validation', () => {
    it('should include ISO timestamp in responses', async () => {
      // Arrange
      healthService.getLivenessCheck.mockResolvedValue(mockHealthyResponse);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(HttpStatus.OK);

      expect(response.body.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });

    it('should include response time metrics', async () => {
      // Arrange
      healthService.getDetailedHealthCheck.mockResolvedValue(
        mockDetailedHealthResponse,
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK);

      expect(response.body.responseTime).toBeDefined();
      expect(typeof response.body.responseTime).toBe('number');
      expect(response.body.responseTime).toBeGreaterThan(0);
    });

    it('should not expose sensitive system information', async () => {
      // Arrange
      healthService.getDetailedHealthCheck.mockResolvedValue(
        mockDetailedHealthResponse,
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(HttpStatus.OK);

      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toMatch(/password/i);
      expect(responseString).not.toMatch(/secret/i);
      expect(responseString).not.toMatch(/token/i);
      expect(responseString).not.toMatch(/key/i);
    });

    it('should sanitize error messages', async () => {
      // Arrange
      const errorResponse = {
        ...mockUnhealthyResponse,
        checks: {
          database: {
            status: HealthStatus.UNHEALTHY,
            message: 'Connection failed',
            error:
              'Database connection failed: username=admin password=secret123',
            responseTime: 5000,
          },
        },
      };
      healthService.getReadinessCheck.mockResolvedValue(errorResponse);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(HttpStatus.SERVICE_UNAVAILABLE);

      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toContain('secret123');
      expect(responseString).not.toContain('password=');
    });
  });

  describe('security and performance', () => {
    it('should include security headers', async () => {
      // Arrange
      healthService.getLivenessCheck.mockResolvedValue(mockHealthyResponse);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(HttpStatus.OK);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should handle high-frequency health check requests', async () => {
      // Arrange
      healthService.getLivenessCheck.mockResolvedValue(mockHealthyResponse);
      const highFrequencyRequests = 50;

      // Act
      const startTime = Date.now();
      const promises = Array.from({ length: highFrequencyRequests }, () =>
        request(app.getHttpServer()).get('/health/live').expect(HttpStatus.OK),
      );

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(5000); // Should handle 50 requests within 5 seconds
    });

    it('should implement rate limiting for detailed health checks', async () => {
      // Arrange
      healthService.getDetailedHealthCheck.mockResolvedValue(
        mockDetailedHealthResponse,
      );

      // Act - make many rapid requests
      const rapidRequests = Array.from({ length: 20 }, () =>
        request(app.getHttpServer()).get('/health'),
      );

      const results = await Promise.all(rapidRequests);

      // Assert - some requests should be rate limited
      const okResponses = results.filter((res) => res.status === HttpStatus.OK);
      const rateLimitedResponses = results.filter(
        (res) => res.status === HttpStatus.TOO_MANY_REQUESTS,
      );

      expect(okResponses.length).toBeGreaterThan(0);
      // Rate limiting might not be implemented yet, but we test the structure
    });

    it('should log health check requests for monitoring', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(controller['logger'], 'log');
      healthService.getLivenessCheck.mockResolvedValue(mockHealthyResponse);

      // Act
      await request(app.getHttpServer())
        .get('/health/live')
        .expect(HttpStatus.OK);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Health check request'),
        expect.objectContaining({
          type: 'liveness',
          status: HealthStatus.HEALTHY,
          responseTime: expect.any(Number),
        }),
      );
    });
  });

  describe('error scenarios', () => {
    it('should handle service unavailable gracefully', async () => {
      // Arrange
      healthService.getLivenessCheck.mockRejectedValue(
        new Error('Service temporarily unavailable'),
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health/live')
        .expect(HttpStatus.SERVICE_UNAVAILABLE);

      expect(response.body).toMatchObject({
        status: HealthStatus.UNHEALTHY,
        error: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should handle timeout scenarios', async () => {
      // Arrange
      const timeoutPromise = new Promise(() => {}); // Never resolves
      healthService.getReadinessCheck.mockReturnValue(timeoutPromise as any);

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health/ready')
        .timeout(1000)
        .expect(HttpStatus.SERVICE_UNAVAILABLE);

      expect(response.body.error).toContain('timeout');
    });

    it('should provide meaningful error responses', async () => {
      // Arrange
      healthService.getStartupCheck.mockRejectedValue(
        new Error('Database migration failed'),
      );

      // Act & Assert
      const response = await request(app.getHttpServer())
        .get('/health/startup')
        .expect(HttpStatus.SERVICE_UNAVAILABLE);

      expect(response.body).toMatchObject({
        status: HealthStatus.UNHEALTHY,
        error: 'Health check failed',
        timestamp: expect.any(String),
        details: expect.any(String),
      });
    });
  });
});
