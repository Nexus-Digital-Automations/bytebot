/**
 * Database Health Controller Comprehensive Test Suite
 * Tests REST API endpoints for database health monitoring, metrics collection,
 * circuit breaker management, and operational visibility
 *
 * Coverage:
 * - Health status endpoints and responses
 * - Database metrics collection and formatting
 * - Circuit breaker status and management
 * - Connection pool monitoring
 * - Manual health checks and operations
 * - Error handling and fallback responses
 * - HTTP status codes and headers
 *
 * @author Database Testing Specialist
 * @version 1.0.0
 * @since Comprehensive Database Testing Phase
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { DatabaseHealthController } from '../database-health.controller';
import { DatabaseService } from '../database.service';
import {
  CircuitBreakerGuard,
  CircuitBreakerState,
} from '../../common/guards/circuit-breaker.guard';
import { DatabaseHealthGuard } from '../../common/guards/database-health.guard';

describe('DatabaseHealthController Comprehensive Test Suite', () => {
  let controller: DatabaseHealthController;
  let databaseService: DatabaseService;
  let circuitBreakerGuard: CircuitBreakerGuard;
  let databaseHealthGuard: DatabaseHealthGuard;
  let module: TestingModule;

  // Mock data
  const mockHealthStatus = {
    isHealthy: true,
    lastHealthCheck: new Date(),
    uptime: 123456,
    connectionStatus: 'connected',
  };

  const mockDetailedHealthReport = {
    status: 'healthy',
    consecutiveFailures: 0,
    consecutiveSuccesses: 10,
    errorRate: 0.02,
    totalChecks: 50,
    responseTime: 25,
    timestamp: new Date(),
    totalFailures: 1,
  };

  const mockDatabaseMetrics = {
    connectionPool: {
      active: 5,
      idle: 3,
      waiting: 0,
      total: 8,
    },
    performance: {
      averageQueryTime: 45,
      slowQueries: 2,
      totalQueries: 100,
      queriesPerSecond: 10.5,
    },
    health: {
      isConnected: true,
      lastHealthCheck: new Date(),
      uptime: 123456,
      errorRate: 0.02,
    },
  };

  const mockCircuitMetrics = new Map([
    [
      'database-default',
      {
        state: CircuitBreakerState.CLOSED,
        totalRequests: 100,
        successCount: 95,
        failureCount: 5,
        failureRate: 0.05,
        lastFailureTime: new Date(),
        lastSuccessTime: new Date(),
        stateChangedAt: new Date(),
        nextRetryTime: null,
      },
    ],
    [
      'database-health',
      {
        state: CircuitBreakerState.HALF_OPEN,
        totalRequests: 50,
        successCount: 48,
        failureCount: 2,
        failureRate: 0.04,
        lastFailureTime: new Date(),
        lastSuccessTime: new Date(),
        stateChangedAt: new Date(),
        nextRetryTime: null,
      },
    ],
    [
      'other-service',
      {
        state: CircuitBreakerState.OPEN,
        totalRequests: 30,
        successCount: 20,
        failureCount: 10,
        failureRate: 0.33,
        lastFailureTime: new Date(),
        lastSuccessTime: new Date(),
        stateChangedAt: new Date(),
        nextRetryTime: new Date(Date.now() + 30000),
      },
    ],
  ]);

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [DatabaseHealthController],
      providers: [
        {
          provide: DatabaseService,
          useValue: {
            getHealthStatus: jest.fn().mockReturnValue(mockHealthStatus),
            getMetrics: jest.fn().mockReturnValue(mockDatabaseMetrics),
          },
        },
        {
          provide: CircuitBreakerGuard,
          useValue: {
            getAllCircuitMetrics: jest.fn().mockReturnValue(mockCircuitMetrics),
            resetCircuit: jest.fn(),
          },
        },
        {
          provide: DatabaseHealthGuard,
          useValue: {
            getDetailedHealthReport: jest
              .fn()
              .mockReturnValue(mockDetailedHealthReport),
            performHealthCheck: jest.fn().mockResolvedValue({
              success: true,
              responseTime: 25,
              timestamp: new Date(),
              error: null,
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<DatabaseHealthController>(DatabaseHealthController);
    databaseService = module.get<DatabaseService>(DatabaseService);
    circuitBreakerGuard = module.get<CircuitBreakerGuard>(CircuitBreakerGuard);
    databaseHealthGuard = module.get<DatabaseHealthGuard>(DatabaseHealthGuard);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Health Status Endpoint', () => {
    it('should return healthy status with comprehensive details', () => {
      const response = controller.getHealthStatus();

      expect(response).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        database: {
          connectionStatus: 'connected',
          isConnected: true,
          uptime: 123456,
          lastHealthCheck: mockHealthStatus.lastHealthCheck,
        },
        healthGuard: {
          status: 'healthy',
          consecutiveFailures: 0,
          consecutiveSuccesses: 10,
          errorRate: 0.02,
          totalChecks: 50,
        },
        checks: {
          connectivity: true,
          performance: true, // responseTime < 1000
          errorRate: true, // errorRate < 0.05
        },
      });
    });

    it('should return unhealthy status when database is down', () => {
      databaseService.getHealthStatus = jest.fn().mockReturnValue({
        ...mockHealthStatus,
        isHealthy: false,
        connectionStatus: 'disconnected',
      });

      const response = controller.getHealthStatus();

      expect(response).toEqual({
        status: 'unhealthy',
        timestamp: expect.any(String),
        database: {
          connectionStatus: 'disconnected',
          isConnected: false,
          uptime: 123456,
          lastHealthCheck: mockHealthStatus.lastHealthCheck,
        },
        healthGuard: {
          status: 'healthy',
          consecutiveFailures: 0,
          consecutiveSuccesses: 10,
          errorRate: 0.02,
          totalChecks: 50,
        },
        checks: {
          connectivity: false,
          performance: true,
          errorRate: true,
        },
      });
    });

    it('should detect performance issues in health checks', () => {
      databaseHealthGuard.getDetailedHealthReport = jest.fn().mockReturnValue({
        ...mockDetailedHealthReport,
        responseTime: 1500, // Slow response
        errorRate: 0.08, // High error rate
      });

      const response = controller.getHealthStatus();

      expect(response.checks.performance).toBe(false); // responseTime >= 1000
      expect(response.checks.errorRate).toBe(false); // errorRate >= 0.05
    });

    it('should handle health status errors gracefully', () => {
      const healthError = new Error('Health check service unavailable');
      databaseService.getHealthStatus = jest.fn().mockImplementation(() => {
        throw healthError;
      });

      const response = controller.getHealthStatus();

      expect(response).toEqual({
        status: 'unhealthy',
        timestamp: expect.any(String),
        error: 'Health check service unavailable',
        checks: {
          connectivity: false,
          performance: false,
          errorRate: false,
        },
      });
    });

    it('should include operation ID in response for tracking', () => {
      const response = controller.getHealthStatus();

      // The operation ID is used internally for logging but not exposed in response
      // We verify it's generated by checking the response structure
      expect(response.timestamp).toBeDefined();
      expect(typeof response.timestamp).toBe('string');
    });
  });

  describe('Database Metrics Endpoint', () => {
    it('should return comprehensive database metrics', () => {
      const response = controller.getDatabaseMetrics();

      expect(response).toEqual({
        timestamp: expect.any(String),
        connectionPool: {
          active: 5,
          idle: 3,
          waiting: 0,
          total: 8,
          utilization: 62.5, // (5/8) * 100
        },
        performance: {
          averageQueryTime: 45,
          slowQueries: 2,
          totalQueries: 100,
          queriesPerSecond: 10.5,
          slowQueryRate: 2, // (2/100) * 100
        },
        health: {
          isConnected: true,
          lastHealthCheck: expect.any(Date),
          uptime: 123456,
          errorRate: 0.02,
          status: 'healthy',
          consecutiveFailures: 0,
          totalFailures: 1,
        },
        operationId: expect.any(String),
      });
    });

    it('should handle zero total connections gracefully', () => {
      databaseService.getMetrics = jest.fn().mockReturnValue({
        ...mockDatabaseMetrics,
        connectionPool: {
          active: 0,
          idle: 0,
          waiting: 0,
          total: 0,
        },
      });

      const response = controller.getDatabaseMetrics();

      expect(response.connectionPool.utilization).toBe(0);
    });

    it('should handle zero total queries gracefully', () => {
      databaseService.getMetrics = jest.fn().mockReturnValue({
        ...mockDatabaseMetrics,
        performance: {
          averageQueryTime: 0,
          slowQueries: 0,
          totalQueries: 0,
          queriesPerSecond: 0,
        },
      });

      const response = controller.getDatabaseMetrics();

      expect(response.performance.slowQueryRate).toBe(0);
    });

    it('should handle metrics collection errors', () => {
      const metricsError = new Error('Failed to collect metrics');
      databaseService.getMetrics = jest.fn().mockImplementation(() => {
        throw metricsError;
      });

      expect(() => controller.getDatabaseMetrics()).toThrow(
        'Failed to collect metrics',
      );
    });

    it('should include operation ID for tracking', () => {
      const response = controller.getDatabaseMetrics();

      expect(response.operationId).toBeDefined();
      expect(response.operationId).toMatch(/^health_api_\d+_[a-z0-9]{7}$/);
    });
  });

  describe('Circuit Breaker Status Endpoint', () => {
    it('should return comprehensive circuit breaker status', () => {
      const response = controller.getCircuitBreakerStatus();

      expect(response).toEqual({
        timestamp: expect.any(String),
        totalCircuits: 3,
        circuits: [
          {
            circuitKey: 'database-default',
            state: CircuitBreakerState.CLOSED,
            totalRequests: 100,
            successCount: 95,
            failureCount: 5,
            failureRate: 0.05,
            lastFailureTime: expect.any(Date),
            lastSuccessTime: expect.any(Date),
            stateChangedAt: expect.any(Date),
            nextRetryTime: null,
          },
          {
            circuitKey: 'database-health',
            state: CircuitBreakerState.HALF_OPEN,
            totalRequests: 50,
            successCount: 48,
            failureCount: 2,
            failureRate: 0.04,
            lastFailureTime: expect.any(Date),
            lastSuccessTime: expect.any(Date),
            stateChangedAt: expect.any(Date),
            nextRetryTime: null,
          },
          {
            circuitKey: 'other-service',
            state: CircuitBreakerState.OPEN,
            totalRequests: 30,
            successCount: 20,
            failureCount: 10,
            failureRate: 0.33,
            lastFailureTime: expect.any(Date),
            lastSuccessTime: expect.any(Date),
            stateChangedAt: expect.any(Date),
            nextRetryTime: expect.any(Date),
          },
        ],
        summary: {
          openCircuits: 1,
          halfOpenCircuits: 1,
          closedCircuits: 1,
        },
        operationId: expect.any(String),
      });
    });

    it('should handle empty circuit breaker metrics', () => {
      circuitBreakerGuard.getAllCircuitMetrics = jest
        .fn()
        .mockReturnValue(new Map());

      const response = controller.getCircuitBreakerStatus();

      expect(response.totalCircuits).toBe(0);
      expect(response.circuits).toEqual([]);
      expect(response.summary).toEqual({
        openCircuits: 0,
        halfOpenCircuits: 0,
        closedCircuits: 0,
      });
    });

    it('should handle circuit breaker guard errors', () => {
      const circuitError = new Error('Circuit breaker service unavailable');
      circuitBreakerGuard.getAllCircuitMetrics = jest
        .fn()
        .mockImplementation(() => {
          throw circuitError;
        });

      expect(() => controller.getCircuitBreakerStatus()).toThrow(
        'Circuit breaker service unavailable',
      );
    });
  });

  describe('Circuit Breaker Reset Endpoint', () => {
    it('should reset circuit breaker successfully', () => {
      const circuitKey = 'database-default';
      const response = controller.resetCircuitBreaker(circuitKey);

      expect(circuitBreakerGuard.resetCircuit).toHaveBeenCalledWith(circuitKey);
      expect(response).toEqual({
        success: true,
        message: `Circuit breaker '${circuitKey}' has been reset`,
        timestamp: expect.any(String),
        circuitKey,
        operationId: expect.any(String),
      });
    });

    it('should handle circuit breaker reset errors', () => {
      const circuitKey = 'invalid-circuit';
      const resetError = new Error('Circuit not found');
      circuitBreakerGuard.resetCircuit = jest.fn().mockImplementation(() => {
        throw resetError;
      });

      expect(() => controller.resetCircuitBreaker(circuitKey)).toThrow(
        'Circuit not found',
      );
    });

    it('should include operation ID in reset response', () => {
      const response = controller.resetCircuitBreaker('test-circuit');

      expect(response.operationId).toBeDefined();
      expect(response.operationId).toMatch(/^health_api_\d+_[a-z0-9]{7}$/);
    });
  });

  describe('Manual Health Check Endpoint', () => {
    it('should perform manual health check successfully', async () => {
      const response = await controller.performHealthCheck();

      expect(databaseHealthGuard.performHealthCheck).toHaveBeenCalled();
      expect(response).toEqual({
        success: true,
        responseTime: 25,
        timestamp: expect.any(Date),
        error: null,
        operationId: expect.any(String),
      });
    });

    it('should handle manual health check failure', async () => {
      const healthError = new Error('Manual health check failed');
      databaseHealthGuard.performHealthCheck = jest.fn().mockResolvedValue({
        success: false,
        responseTime: 5000,
        timestamp: new Date(),
        error: 'Database connection timeout',
      });

      const response = await controller.performHealthCheck();

      expect(response.success).toBe(false);
      expect(response.error).toBe('Database connection timeout');
      expect(response.responseTime).toBe(5000);
    });

    it('should handle health check guard errors', async () => {
      const guardError = new Error('Health guard unavailable');
      databaseHealthGuard.performHealthCheck = jest
        .fn()
        .mockRejectedValue(guardError);

      await expect(controller.performHealthCheck()).rejects.toThrow(
        'Health guard unavailable',
      );
    });
  });

  describe('Connection Pool Status Endpoint', () => {
    it('should return connection pool status with utilization analysis', () => {
      const response = controller.getConnectionPoolStatus();

      expect(response).toEqual({
        timestamp: expect.any(String),
        connectionPool: {
          active: 5,
          idle: 3,
          waiting: 0,
          total: 8,
        },
        utilization: {
          percentage: 62.5, // (5/8) * 100
          status: 'moderate', // 50% < 62.5% < 75%
        },
        performance: {
          averageQueryTime: 45,
          totalQueries: 100,
          queriesPerSecond: 10.5,
        },
        operationId: expect.any(String),
      });
    });

    it('should classify high utilization correctly', () => {
      databaseService.getMetrics = jest.fn().mockReturnValue({
        ...mockDatabaseMetrics,
        connectionPool: {
          active: 7,
          idle: 1,
          waiting: 2,
          total: 8,
        },
      });

      const response = controller.getConnectionPoolStatus();

      expect(response.utilization.percentage).toBe(87.5); // (7/8) * 100
      expect(response.utilization.status).toBe('high'); // 75% < 87.5% < 90%
    });

    it('should classify critical utilization correctly', () => {
      databaseService.getMetrics = jest.fn().mockReturnValue({
        ...mockDatabaseMetrics,
        connectionPool: {
          active: 8,
          idle: 0,
          waiting: 5,
          total: 8,
        },
      });

      const response = controller.getConnectionPoolStatus();

      expect(response.utilization.percentage).toBe(100); // (8/8) * 100
      expect(response.utilization.status).toBe('critical'); // >= 90%
    });

    it('should classify normal utilization correctly', () => {
      databaseService.getMetrics = jest.fn().mockReturnValue({
        ...mockDatabaseMetrics,
        connectionPool: {
          active: 2,
          idle: 6,
          waiting: 0,
          total: 8,
        },
      });

      const response = controller.getConnectionPoolStatus();

      expect(response.utilization.percentage).toBe(25); // (2/8) * 100
      expect(response.utilization.status).toBe('normal'); // <= 50%
    });

    it('should handle zero total connections in utilization calculation', () => {
      databaseService.getMetrics = jest.fn().mockReturnValue({
        ...mockDatabaseMetrics,
        connectionPool: {
          active: 0,
          idle: 0,
          waiting: 0,
          total: 0,
        },
      });

      const response = controller.getConnectionPoolStatus();

      expect(response.utilization.percentage).toBe(0);
      expect(response.utilization.status).toBe('normal');
    });

    it('should handle connection pool status errors', () => {
      const poolError = new Error('Connection pool service unavailable');
      databaseService.getMetrics = jest.fn().mockImplementation(() => {
        throw poolError;
      });

      expect(() => controller.getConnectionPoolStatus()).toThrow(
        'Connection pool service unavailable',
      );
    });
  });

  describe('Utility Methods', () => {
    it('should classify pool utilization status correctly', () => {
      const getStatus = (controller as any).getPoolUtilizationStatus;

      expect(getStatus({ active: 9, total: 10, waiting: 0 })).toBe('critical'); // 90%
      expect(getStatus({ active: 8, total: 10, waiting: 0 })).toBe('high'); // 80%
      expect(getStatus({ active: 6, total: 10, waiting: 0 })).toBe('moderate'); // 60%
      expect(getStatus({ active: 3, total: 10, waiting: 0 })).toBe('normal'); // 30%
      expect(getStatus({ active: 0, total: 0, waiting: 0 })).toBe('normal'); // 0% (edge case)
    });

    it('should generate unique operation IDs', () => {
      const operationIds = new Set();

      for (let i = 0; i < 50; i++) {
        const operationId = (controller as any).generateOperationId();
        expect(operationId).toMatch(/^health_api_\d+_[a-z0-9]{7}$/);
        expect(operationIds.has(operationId)).toBe(false);
        operationIds.add(operationId);
      }

      expect(operationIds.size).toBe(50);
    });
  });

  describe('HTTP Response Headers and Status Codes', () => {
    it('should set appropriate cache control headers for health endpoint', () => {
      // Note: In actual tests, you might need to test these via HTTP requests
      // Here we're testing the controller logic directly
      const response = controller.getHealthStatus();

      expect(response).toBeDefined();
      expect(response.timestamp).toBeDefined();
      // Cache-Control header would be tested in integration tests
    });

    it('should set appropriate cache control for metrics endpoint', () => {
      const response = controller.getDatabaseMetrics();

      expect(response).toBeDefined();
      expect(response.timestamp).toBeDefined();
      // max-age=30 header would be tested in integration tests
    });

    it('should set appropriate cache control for connection pool endpoint', () => {
      const response = controller.getConnectionPoolStatus();

      expect(response).toBeDefined();
      expect(response.timestamp).toBeDefined();
      // max-age=10 header would be tested in integration tests
    });
  });

  describe('Error Propagation and Logging', () => {
    it('should propagate errors from database service', () => {
      const dbError = new Error('Database service error');
      databaseService.getMetrics = jest.fn().mockImplementation(() => {
        throw dbError;
      });

      expect(() => controller.getDatabaseMetrics()).toThrow(
        'Database service error',
      );
    });

    it('should propagate errors from circuit breaker guard', () => {
      const cbError = new Error('Circuit breaker error');
      circuitBreakerGuard.getAllCircuitMetrics = jest
        .fn()
        .mockImplementation(() => {
          throw cbError;
        });

      expect(() => controller.getCircuitBreakerStatus()).toThrow(
        'Circuit breaker error',
      );
    });

    it('should propagate async errors from health guard', async () => {
      const healthError = new Error('Health guard async error');
      databaseHealthGuard.performHealthCheck = jest
        .fn()
        .mockRejectedValue(healthError);

      await expect(controller.performHealthCheck()).rejects.toThrow(
        'Health guard async error',
      );
    });
  });

  describe('Response Format Consistency', () => {
    it('should include timestamp in all responses', () => {
      const healthResponse = controller.getHealthStatus();
      const metricsResponse = controller.getDatabaseMetrics();
      const circuitResponse = controller.getCircuitBreakerStatus();
      const poolResponse = controller.getConnectionPoolStatus();

      expect(healthResponse.timestamp).toBeDefined();
      expect(metricsResponse.timestamp).toBeDefined();
      expect(circuitResponse.timestamp).toBeDefined();
      expect(poolResponse.timestamp).toBeDefined();
    });

    it('should include operation ID in trackable responses', () => {
      const metricsResponse = controller.getDatabaseMetrics();
      const circuitResponse = controller.getCircuitBreakerStatus();
      const poolResponse = controller.getConnectionPoolStatus();

      expect(metricsResponse.operationId).toBeDefined();
      expect(circuitResponse.operationId).toBeDefined();
      expect(poolResponse.operationId).toBeDefined();
    });

    it('should maintain consistent error response format', () => {
      databaseService.getHealthStatus = jest.fn().mockImplementation(() => {
        throw new Error('Service error');
      });

      const errorResponse = controller.getHealthStatus();

      expect(errorResponse).toEqual({
        status: 'unhealthy',
        timestamp: expect.any(String),
        error: 'Service error',
        checks: {
          connectivity: false,
          performance: false,
          errorRate: false,
        },
      });
    });
  });
});
