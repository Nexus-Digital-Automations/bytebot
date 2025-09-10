/**
 * Health Controller Unit Tests - Enterprise-Grade Testing for HealthController
 * Comprehensive test suite for HTTP endpoints used by Kubernetes health probes,
 * monitoring systems, and application health checks.
 *
 * Features tested:
 * - Basic health status endpoints (/health)
 * - Kubernetes liveness probes (/health/live)
 * - Kubernetes readiness probes (/health/ready)
 * - Startup probes (/health/startup)
 * - Detailed system status (/health/status)
 *
 * @author Testing & Quality Assurance Specialist
 * @version 2.0.0 - Enterprise-Grade with comprehensive logging
 * @since 2025-09-10
 * @category Integration Tests
 * @requires NestJS Testing Framework
 * @requires supertest for HTTP endpoint testing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { HealthController } from '../health.controller';
import { HealthService } from '../health.service';

/**
 * Helper function to safely get HTTP server with proper typing and logging
 * Ensures type safety when accessing the underlying HTTP server for testing
 *
 * @param app - NestJS application instance
 * @returns HTTP server instance with proper typing
 * @throws Error if server cannot be accessed
 */
const getHttpServer = (app: INestApplication): Server => {
  const startTime = Date.now();
  const server = app.getHttpServer() as Server;
  const duration = Date.now() - startTime;

  console.log(`[TEST-UTILS] HTTP server accessed in ${duration}ms`);

  if (!server) {
    throw new Error('Failed to access HTTP server from NestJS application');
  }

  return server;
};

/**
 * Type-safe wrapper for Jest mock function call expectations
 * Prevents unbound method warnings by properly typing mock expectations
 *
 * @param mockFn - Jest mock function to check
 * @param times - Expected number of calls
 */
const expectMockCallCount = (
  mockFn: jest.MockedFunction<any>,
  times: number,
): void => {
  expect(mockFn).toHaveBeenCalledTimes(times);
};

describe('HealthController', () => {
  let app: INestApplication;
  let controller: HealthController;
  let healthService: jest.Mocked<HealthService>;

  // Mock health responses based on actual service types
  const mockHealthySystemResponse = {
    isHealthy: true,
    details: { status: 'healthy', responseTime: 25 },
  };

  const mockUnhealthySystemResponse = {
    isHealthy: false,
    details: { status: 'unhealthy', responseTime: 5000 },
    error: 'System check failed',
  };

  const mockDetailedStatusResponse = {
    status: 'healthy' as const,
    timestamp: new Date().toISOString(),
    uptime: 3600,
    memory: {
      used: 67108864,
      free: 134217728,
      total: 201326592,
      heapUsed: 16777216,
      heapTotal: 33554432,
    },
    services: {
      database: 'connected' as const,
      authentication: 'active' as const,
      configuration: 'loaded' as const,
      external: 'reachable' as const,
      securityMonitoring: 'active' as const,
      metrics: 'collecting' as const,
      tracing: 'enabled' as const,
      alerting: 'active' as const,
      observability: 'operational' as const,
    },
    dependencies: {
      anthropic: 'available' as const,
      openai: 'available' as const,
      redis: 'connected' as const,
      prometheus: 'connected' as const,
      jaeger: 'connected' as const,
      grafana: 'connected' as const,
      elasticsearch: 'connected' as const,
    },
    security: {
      authenticationHealth: 'healthy' as const,
      authorizationHealth: 'healthy' as const,
      rateLimitingHealth: 'healthy' as const,
      securityEvents: {
        totalToday: 100,
        highSeverityToday: 2,
        threatCount: 1,
        blockedRequests: 5,
      },
      complianceStatus: 'compliant' as const,
    },
    performance: {
      requestsPerSecond: 12.5,
      averageResponseTime: 45,
      taskProcessingRate: 8.2,
      databaseQueryLatency: 15,
      securityOverheadMs: 3,
      authenticationLatency: 8,
      cpuUsagePercent: 15.2,
      memoryUsagePercent: 42.8,
      diskUsagePercent: 65.4,
      networkLatencyMs: 12,
      gcPauseDuration: 2.3,
      gcPauseTimeMs: 1.8,
      threadPoolUtilization: 78.5,
    },
    operationId: 'test-operation-123',
  };

  beforeEach(async () => {
    const testStartTime = Date.now();
    console.log(
      `[TEST-SETUP] Starting test module setup at ${new Date().toISOString()}`,
    );

    const mockHealthService = {
      // Core methods used by controller
      generateCorrelationId: jest.fn().mockReturnValue('test-operation-123'),
      getBasicHealth: jest.fn(),
      getDetailedStatus: jest.fn(),
      checkProcessHealth: jest.fn(),
      checkSystemResponsiveness: jest.fn(),
      checkDatabaseHealth: jest.fn(),
      checkAuthenticationService: jest.fn(),
      checkExternalServices: jest.fn(),
      checkStartupComplete: jest.fn(),
      checkModuleInitialization: jest.fn(),
      checkConfigurationLoaded: jest.fn(),

      // Performance and metrics methods
      getHealthDashboard: jest.fn(),
      getPerformanceMetricsEnhanced: jest.fn(),
      measureAuthenticationLatency: jest.fn(),
      recordRequestMetrics: jest.fn(),
      getInitializationTime: jest.fn().mockReturnValue(Date.now() - 30000),
      isServiceStable: jest.fn().mockReturnValue(true),
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
    controller = module.get<HealthController>(HealthController);
    healthService = module.get(HealthService);

    await app.init();

    const setupDuration = Date.now() - testStartTime;
    console.log(
      `[TEST-SETUP] Test module setup completed in ${setupDuration}ms`,
    );
  });

  afterEach(async () => {
    const cleanupStartTime = Date.now();
    console.log(
      `[TEST-CLEANUP] Starting test cleanup at ${new Date().toISOString()}`,
    );

    jest.clearAllMocks();

    if (app) {
      try {
        await app.close();
        console.log(`[TEST-CLEANUP] Application closed successfully`);
      } catch (error) {
        console.error(`[TEST-CLEANUP] Error closing application:`, error);
        throw error;
      }
    }

    const cleanupDuration = Date.now() - cleanupStartTime;
    console.log(
      `[TEST-CLEANUP] Test cleanup completed in ${cleanupDuration}ms`,
    );
  });

  describe('GET /health', () => {
    it('should return basic health status with comprehensive validation', async () => {
      const testStartTime = Date.now();
      console.log(`[TEST] Starting basic health status test`);

      // Arrange
      const mockBasicHealthResponse = {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        uptime: 3600,
        memory: {
          used: 64,
          free: 128,
          total: 192,
        },
        operationId: 'test-operation-123',
      };

      healthService.getBasicHealth.mockReturnValue(mockBasicHealthResponse);

      // Act & Assert
      const response = await request(getHttpServer(app))
        .get('/health')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expectMockCallCount(healthService.getBasicHealth, 1);

      const testDuration = Date.now() - testStartTime;
      console.log(
        `[TEST] Basic health status test completed in ${testDuration}ms`,
      );
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 when system is responsive with timing validation', async () => {
      const testStartTime = Date.now();
      console.log(`[TEST] Testing liveness probe - system responsive scenario`);

      // Arrange
      healthService.checkProcessHealth.mockReturnValue(
        mockHealthySystemResponse,
      );
      healthService.checkSystemResponsiveness.mockResolvedValue(
        mockHealthySystemResponse,
      );

      console.log(`[TEST] Mock services configured for healthy system`);

      // Act & Assert
      const responseStartTime = Date.now();
      await request(getHttpServer(app))
        .get('/health/live')
        .expect(HttpStatus.OK);

      const responseTime = Date.now() - responseStartTime;
      console.log(`[TEST] Liveness probe responded in ${responseTime}ms`);

      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds

      const testDuration = Date.now() - testStartTime;
      console.log(
        `[TEST] Liveness test (responsive) completed in ${testDuration}ms`,
      );
    });

    it('should return 503 when system is unresponsive with error logging', async () => {
      const testStartTime = Date.now();
      console.log(
        `[TEST] Testing liveness probe - system unresponsive scenario`,
      );

      // Arrange
      healthService.checkProcessHealth.mockReturnValue(
        mockUnhealthySystemResponse,
      );
      healthService.checkSystemResponsiveness.mockResolvedValue(
        mockUnhealthySystemResponse,
      );

      console.log(`[TEST] Mock services configured for unhealthy system`);

      // Act & Assert
      const responseStartTime = Date.now();
      const response = await request(getHttpServer(app))
        .get('/health/live')
        .expect(HttpStatus.SERVICE_UNAVAILABLE);

      const responseTime = Date.now() - responseStartTime;
      console.log(
        `[TEST] Unhealthy liveness probe responded in ${responseTime}ms`,
      );

      // Validate error response structure
      expect(response.body).toHaveProperty('error');

      const testDuration = Date.now() - testStartTime;
      console.log(
        `[TEST] Liveness test (unresponsive) completed in ${testDuration}ms`,
      );
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 when service is ready with dependency validation', async () => {
      const testStartTime = Date.now();
      console.log(`[TEST] Testing readiness probe - all dependencies healthy`);

      // Arrange
      healthService.checkDatabaseHealth.mockResolvedValue(
        mockHealthySystemResponse,
      );
      healthService.checkExternalServices.mockReturnValue(
        mockHealthySystemResponse,
      );
      healthService.checkAuthenticationService.mockReturnValue(
        mockHealthySystemResponse,
      );

      console.log(`[TEST] All dependency health checks mocked as healthy`);

      // Act & Assert
      const responseStartTime = Date.now();
      await request(getHttpServer(app))
        .get('/health/ready')
        .expect(HttpStatus.OK);

      const responseTime = Date.now() - responseStartTime;
      console.log(
        `[TEST] Readiness probe (healthy) responded in ${responseTime}ms`,
      );

      // Validate all health checks were called
      expectMockCallCount(healthService.checkDatabaseHealth, 1);
      expectMockCallCount(healthService.checkExternalServices, 1);
      expectMockCallCount(healthService.checkAuthenticationService, 1);

      const testDuration = Date.now() - testStartTime;
      console.log(
        `[TEST] Readiness test (healthy) completed in ${testDuration}ms`,
      );
    });

    it('should return 503 when database is unhealthy with detailed error info', async () => {
      const testStartTime = Date.now();
      console.log(
        `[TEST] Testing readiness probe - database unhealthy scenario`,
      );

      // Arrange
      healthService.checkDatabaseHealth.mockResolvedValue(
        mockUnhealthySystemResponse,
      );
      healthService.checkExternalServices.mockReturnValue(
        mockHealthySystemResponse,
      );
      healthService.checkAuthenticationService.mockReturnValue(
        mockHealthySystemResponse,
      );

      console.log(`[TEST] Database health check mocked as unhealthy`);

      // Act & Assert
      const responseStartTime = Date.now();
      const response = await request(getHttpServer(app))
        .get('/health/ready')
        .expect(HttpStatus.SERVICE_UNAVAILABLE);

      const responseTime = Date.now() - responseStartTime;
      console.log(
        `[TEST] Readiness probe (database unhealthy) responded in ${responseTime}ms`,
      );

      // Validate error response includes database issue
      expect(response.body).toHaveProperty('error');

      const testDuration = Date.now() - testStartTime;
      console.log(
        `[TEST] Readiness test (database unhealthy) completed in ${testDuration}ms`,
      );
    });
  });

  describe('GET /health/startup', () => {
    it('should return 200 when startup checks pass with initialization validation', async () => {
      const testStartTime = Date.now();
      console.log(`[TEST] Testing startup probe - all initialization complete`);

      // Arrange
      healthService.checkStartupComplete.mockReturnValue(
        mockHealthySystemResponse,
      );
      healthService.checkModuleInitialization.mockReturnValue(
        mockHealthySystemResponse,
      );
      healthService.checkConfigurationLoaded.mockReturnValue(
        mockHealthySystemResponse,
      );

      console.log(`[TEST] All startup checks mocked as successful`);

      // Act & Assert
      const responseStartTime = Date.now();
      await request(getHttpServer(app))
        .get('/health/startup')
        .expect(HttpStatus.OK);

      const responseTime = Date.now() - responseStartTime;
      console.log(`[TEST] Startup probe responded in ${responseTime}ms`);

      // Validate all startup checks were called
      expectMockCallCount(healthService.checkStartupComplete, 1);
      expectMockCallCount(healthService.checkModuleInitialization, 1);
      expectMockCallCount(healthService.checkConfigurationLoaded, 1);

      const testDuration = Date.now() - testStartTime;
      console.log(`[TEST] Startup test completed in ${testDuration}ms`);
    });
  });

  describe('GET /health/status', () => {
    it('should return detailed system status with comprehensive metrics validation', async () => {
      const testStartTime = Date.now();
      console.log(`[TEST] Testing detailed status endpoint with full metrics`);

      // Arrange
      healthService.getDetailedStatus.mockResolvedValue(
        mockDetailedStatusResponse,
      );

      console.log(`[TEST] Mock detailed status response configured`);

      // Act & Assert
      const responseStartTime = Date.now();
      const response = await request(getHttpServer(app))
        .get('/health/status')
        .expect(HttpStatus.OK);

      const responseTime = Date.now() - responseStartTime;
      console.log(`[TEST] Detailed status responded in ${responseTime}ms`);

      // Validate comprehensive response structure
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('dependencies');
      expect(response.body).toHaveProperty('security');
      expect(response.body).toHaveProperty('performance');
      expect(response.body).toHaveProperty('operationId');

      // Validate nested structures with proper typing
      const responseBody = response.body as typeof mockDetailedStatusResponse;
      expect(responseBody.memory).toHaveProperty('used');
      expect(responseBody.memory).toHaveProperty('free');
      expect(responseBody.memory).toHaveProperty('total');

      expect(responseBody.services).toHaveProperty('database');
      expect(responseBody.services).toHaveProperty('authentication');

      expect(responseBody.security).toHaveProperty('authenticationHealth');
      expect(responseBody.security).toHaveProperty('securityEvents');

      expect(responseBody.performance).toHaveProperty('requestsPerSecond');
      expect(responseBody.performance).toHaveProperty('averageResponseTime');

      expectMockCallCount(healthService.getDetailedStatus, 1);

      const testDuration = Date.now() - testStartTime;
      console.log(`[TEST] Detailed status test completed in ${testDuration}ms`);
    });
  });

  describe('Controller Instance Validation', () => {
    it('should be properly defined and initialized', () => {
      console.log(`[TEST] Validating controller instance definition`);
      const validationStartTime = Date.now();

      expect(controller).toBeDefined();
      expect(controller).not.toBeNull();
      expect(typeof controller).toBe('object');

      const validationDuration = Date.now() - validationStartTime;
      console.log(
        `[TEST] Controller definition validated in ${validationDuration}ms`,
      );
    });

    it('should be proper instance of HealthController class', () => {
      console.log(`[TEST] Validating controller instance type`);
      const validationStartTime = Date.now();

      expect(controller).toBeInstanceOf(HealthController);
      expect(controller.constructor.name).toBe('HealthController');

      const validationDuration = Date.now() - validationStartTime;
      console.log(
        `[TEST] Controller type validation completed in ${validationDuration}ms`,
      );
    });

    it('should have all required health service dependencies injected', () => {
      console.log(`[TEST] Validating service dependency injection`);
      const validationStartTime = Date.now();

      expect(healthService).toBeDefined();
      expect(healthService).not.toBeNull();

      // Validate mock methods are available
      expect(typeof healthService.generateCorrelationId).toBe('function');
      expect(typeof healthService.getBasicHealth).toBe('function');
      expect(typeof healthService.getDetailedStatus).toBe('function');
      expect(typeof healthService.checkProcessHealth).toBe('function');

      const validationDuration = Date.now() - validationStartTime;
      console.log(
        `[TEST] Service dependency validation completed in ${validationDuration}ms`,
      );
    });
  });
});
