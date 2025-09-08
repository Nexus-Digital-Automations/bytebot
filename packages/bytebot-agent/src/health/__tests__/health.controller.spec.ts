/**
 * Health Controller Unit Tests - Testing for actual HealthController implementation
 * Tests HTTP endpoints for Kubernetes health probes and monitoring
 *
 * @author Testing & Quality Assurance Specialist
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { HealthController } from '../health.controller';
import { HealthService } from '../health.service';

/**
 * Helper function to safely get HTTP server with proper typing
 */
const getHttpServer = (app: INestApplication): Server => {
  return app.getHttpServer() as Server;
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
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (app) {
      await app.close();
    }
  });

  describe('GET /health', () => {
    it('should return basic health status', async () => {
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
      expect(healthService.getBasicHealth).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /health/live', () => {
    it('should return 200 when system is responsive', async () => {
      // Arrange
      healthService.checkProcessHealth.mockReturnValue(
        mockHealthySystemResponse,
      );
      healthService.checkSystemResponsiveness.mockResolvedValue(
        mockHealthySystemResponse,
      );

      // Act & Assert
      await request(getHttpServer(app))
        .get('/health/live')
        .expect(HttpStatus.OK);
    });

    it('should return 503 when system is unresponsive', async () => {
      // Arrange
      healthService.checkProcessHealth.mockReturnValue(
        mockUnhealthySystemResponse,
      );
      healthService.checkSystemResponsiveness.mockResolvedValue(
        mockUnhealthySystemResponse,
      );

      // Act & Assert
      await request(getHttpServer(app))
        .get('/health/live')
        .expect(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 when service is ready', async () => {
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

      // Act & Assert
      await request(getHttpServer(app))
        .get('/health/ready')
        .expect(HttpStatus.OK);
    });

    it('should return 503 when database is unhealthy', async () => {
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

      // Act & Assert
      await request(getHttpServer(app))
        .get('/health/ready')
        .expect(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });

  describe('GET /health/startup', () => {
    it('should return 200 when startup checks pass', async () => {
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

      // Act & Assert
      await request(getHttpServer(app))
        .get('/health/startup')
        .expect(HttpStatus.OK);
    });
  });

  describe('GET /health/status', () => {
    it('should return detailed system status', async () => {
      // Arrange
      healthService.getDetailedStatus.mockResolvedValue(
        mockDetailedStatusResponse,
      );

      // Act & Assert
      const response = await request(getHttpServer(app))
        .get('/health/status')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('dependencies');
      expect(response.body).toHaveProperty('operationId');
      expect(healthService.getDetailedStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('Controller Instance', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should be an instance of HealthController', () => {
      expect(controller).toBeInstanceOf(HealthController);
    });
  });
});
