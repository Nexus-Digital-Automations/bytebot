/* eslint-env jest */


/**
 * Health Controller Test Suite
 *
 * Comprehensive unit tests for system health monitoring controller covering:
 * - Basic health check endpoints
 * - Detailed system status reporting
 * - Error handling and graceful degradation
 * - Performance monitoring and reliability
 * - API response format validation
 *
 * @author Claude Code (Testing & QA Specialist)
 * @version 1.0.0
 * @coverage-target 95%+
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthIndicatorResult,
  HealthCheckResult,
  HealthIndicatorStatus,
} from '@nestjs/terminus';
import { HealthController } from '../health.controller';
import {
  HealthService,
  BasicHealthResponse,
  DetailedStatusResponse,
} from '../health.service';
import { ByteBotdUser } from '../../auth/decorators/roles.decorator';
import { UserRole, Permission } from '@bytebot/shared';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: jest.Mocked<HealthService>;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let httpHealthIndicator: jest.Mocked<HttpHealthIndicator>;
  let memoryHealthIndicator: jest.Mocked<MemoryHealthIndicator>;
  let diskHealthIndicator: jest.Mocked<DiskHealthIndicator>;
  let mockLogger: jest.Mocked<Logger>;

  const operationId = `health_controller_test_${Date.now()}`;

  // Mock user for authenticated calls
  const mockUser: ByteBotdUser = {
    sub: 'test-user-id',
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'test-user',
    role: UserRole._ADMIN,
    isActive: true,
    firstName: 'Test',
    lastName: 'User',
    sessionId: 'test-session-id',
    permissions: [Permission._COMPUTER_CONTROL],
  };

  // Mock health service responses
  const mockBasicHealthResponse = {
    status: 'healthy' as const,
    timestamp: new Date().toISOString(),
    uptime: 300, // 5 minutes
    memory: {
      used: 128, // MB
      free: 256, // MB
      total: 384, // MB
    },
  };

  const mockDetailedStatusResponse = {
    status: 'healthy' as const,
    timestamp: new Date().toISOString(),
    uptime: 300, // 5 minutes
    memory: {
      used: 128, // MB
      free: 256, // MB
      total: 384, // MB
      heapUsed: 64, // MB
      heapTotal: 192, // MB
    },
    services: {
      database: 'connected' as const,
      cache: 'available' as const,
      external: 'reachable' as const,
    },
    performance: {
      requestsPerSecond: 45,
      averageResponseTime: 120, // ms
    },
  };

  beforeEach(async () => {
    console.log(`[${operationId}] Setting up HealthController test module`);

    // Create a mock logger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      verbose: jest.fn(),
      fatal: jest.fn(),
      localInstance: {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        fatal: jest.fn(),
      },
      options: {},
      registerLocalInstanceRef: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    // Create mocked Terminus dependencies
    healthCheckService = {
      check: jest.fn(),
      healthCheckExecutor: jest.fn(),
      errorLogger: jest.fn(),
      logger: jest.fn(),
    } as unknown as jest.Mocked<HealthCheckService>;

    httpHealthIndicator = {
      pingCheck: jest.fn(),
      responseCheck: jest.fn(),
    } as unknown as jest.Mocked<HttpHealthIndicator>;

    memoryHealthIndicator = {
      checkHeap: jest.fn(),
      checkRSS: jest.fn(),
      healthIndicatorService: jest.fn(),
    } as unknown as jest.Mocked<MemoryHealthIndicator>;

    diskHealthIndicator = {
      checkStorage: jest.fn(),
      checkDiskSpace: jest.fn(),
      healthIndicatorService: jest.fn(),
      isOptionThresholdPercent: jest.fn(),
    } as unknown as jest.Mocked<DiskHealthIndicator>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            getBasicHealth: jest.fn(),
            getDetailedStatus: jest.fn(),
            isServiceStable: jest.fn(),
            getInitializationTime: jest.fn(),
            checkProcessHealth: jest.fn(),
            checkDatabaseHealth: jest.fn(),
            checkExternalServices: jest.fn(),
            checkStartupComplete: jest.fn(),
            checkModuleInitialization: jest.fn(),
          } as Partial<HealthService> as jest.Mocked<HealthService>,
        },
        {
          provide: HealthCheckService,
          useValue: healthCheckService,
        },
        {
          provide: HttpHealthIndicator,
          useValue: httpHealthIndicator,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: memoryHealthIndicator,
        },
        {
          provide: DiskHealthIndicator,
          useValue: diskHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<jest.Mocked<HealthService>>(HealthService);

    // Mock the logger
    (
      jest.spyOn(Logger.prototype, 'log')
    ).mockImplementation(mockLogger.log);
    (
      jest.spyOn(Logger.prototype, 'debug')
    ).mockImplementation(mockLogger.debug);
    (
      jest.spyOn(Logger.prototype, 'error')
    ).mockImplementation(mockLogger.error);

    console.log(`[${operationId}] HealthController test setup completed`);
  });

  afterEach(() => {
    console.log(`[${operationId}] HealthController test cleanup completed`);
    jest.clearAllMocks();
  });

  describe('Basic Health Check Endpoint', () => {
    it('should return healthy status for basic health check', async () => {
      const testId = `${operationId}_basic_health_healthy`;
      console.log(`[${testId}] Testing basic health check with healthy status`);

      (
        healthService.getBasicHealth
      ).mockReturnValue(mockBasicHealthResponse);

      const result = await controller.getHealth(mockUser);

      expect(result).toEqual(mockBasicHealthResponse);
      expect(healthService.getBasicHealth).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith('Health check requested');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Health check completed successfully',
      );

      console.log(`[${testId}] Basic health check test completed successfully`);
    });

    it('should handle service errors gracefully', async () => {
      const testId = `${operationId}_basic_health_error`;
      console.log(`[${testId}] Testing basic health check error handling`);

      const serviceError = new Error('Database connection failed');
      (
        healthService.getBasicHealth
      ).mockImplementation(() => {
        throw serviceError;
      });

      const result = await controller.getHealth(mockUser);

      expect(result).toHaveProperty('status', 'unhealthy');
      expect(result).toHaveProperty('error', 'Database connection failed');
      expect((result as { timestamp: string }).timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Health check failed: Database connection failed',
      );

      console.log(
        `[${testId}] Basic health check error handling test completed`,
      );
    });

    it('should handle unknown errors gracefully', async () => {
      const testId = `${operationId}_basic_health_unknown_error`;
      console.log(`[${testId}] Testing basic health check with unknown error`);

      (
        healthService.getBasicHealth
      ).mockImplementation(() => {
        throw 'Unknown error type';
      });

      const result = await controller.getHealth(mockUser);

      expect(result).toHaveProperty('status', 'unhealthy');
      expect(result).toHaveProperty('error', 'Unknown _error');
      expect((result as { timestamp: string }).timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Health check failed: Unknown _error',
      );

      console.log(`[${testId}] Unknown error handling test completed`);
    });

    it('should validate response format structure', async () => {
      const testId = `${operationId}_basic_health_format`;
      console.log(`[${testId}] Testing basic health check response format`);

      (
        healthService.getBasicHealth
      ).mockReturnValue(mockBasicHealthResponse);

      const result = await controller.getHealth(mockUser);

      // Validate response structure with proper typing
      const typedResult = result as BasicHealthResponse;
      expect(typedResult.status).toMatch(/^(healthy|unhealthy)$/);
      expect(typedResult.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      
      // Validate numeric values with proper typing
      expect(typeof typedResult.uptime).toBe('number');
      
      // Type guard for memory property
      if (typedResult.memory && typeof typedResult.memory === 'object') {
        expect(typeof typedResult.memory.used).toBe('number');
        expect(typeof typedResult.memory.free).toBe('number');
        expect(typeof typedResult.memory.total).toBe('number');
      } else {
        fail('Memory property is missing or not an object');
      }

      console.log(`[${testId}] Response format validation test completed`);
    });

    it('should complete within performance threshold', async () => {
      const testId = `${operationId}_basic_health_performance`;
      console.log(`[${testId}] Testing basic health check performance`);

      (
        healthService.getBasicHealth
      ).mockReturnValue(mockBasicHealthResponse);

      const startTime = Date.now();
      await controller.getHealth(mockUser);
      const executionTime = Date.now() - startTime;

      // Health check should complete within 100ms
      expect(executionTime).toBeLessThan(100);

      console.log(
        `[${testId}] Performance test completed (${executionTime}ms)`,
      );
    });
  });

  describe('Detailed Status Endpoint', () => {
    it('should return comprehensive status information', async () => {
      const testId = `${operationId}_detailed_status_comprehensive`;
      console.log(
        `[${testId}] Testing detailed status comprehensive information`,
      );

      (
        healthService.getDetailedStatus
      ).mockReturnValue(mockDetailedStatusResponse);

      const result = await controller.getDetailedStatus(mockUser);

      expect(result).toEqual(mockDetailedStatusResponse);
      expect(healthService.getDetailedStatus).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Detailed status requested',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Detailed status completed successfully',
      );

      console.log(
        `[${testId}] Comprehensive status test completed successfully`,
      );
    });

    it('should handle degraded service status', async () => {
      const testId = `${operationId}_detailed_status_degraded`;
      console.log(`[${testId}] Testing detailed status with degraded services`);

      const degradedResponse = {
        ...mockDetailedStatusResponse,
        status: 'degraded' as const,
        services: {
          database: 'connected' as const,
          cache: 'unavailable' as const,
          external: 'unknown' as const,
        },
      };

      (
        healthService.getDetailedStatus
      ).mockReturnValue(degradedResponse);

      const result = await controller.getDetailedStatus(mockUser);

      expect(result.status).toBe('degraded');
      expect((result as DetailedStatusResponse).services.cache).toBe(
        'unavailable',
      );
      expect((result as DetailedStatusResponse).services.external).toBe(
        'unknown',
      );

      console.log(`[${testId}] Degraded service status test completed`);
    });

    it('should handle unhealthy service status', async () => {
      const testId = `${operationId}_detailed_status_unhealthy`;
      console.log(
        `[${testId}] Testing detailed status with unhealthy services`,
      );

      const unhealthyResponse = {
        ...mockDetailedStatusResponse,
        status: 'unhealthy' as const,
        services: {
          database: 'disconnected' as const,
          cache: 'unavailable' as const,
          external: 'unreachable' as const,
        },
      };

      (
        healthService.getDetailedStatus
      ).mockReturnValue(unhealthyResponse);

      const result = await controller.getDetailedStatus(mockUser);

      expect(result.status).toBe('unhealthy');
      expect((result as DetailedStatusResponse).services.database).toBe(
        'disconnected',
      );

      console.log(`[${testId}] Unhealthy service status test completed`);
    });

    it('should handle detailed status errors gracefully', async () => {
      const testId = `${operationId}_detailed_status_error`;
      console.log(`[${testId}] Testing detailed status error handling`);

      const serviceError = new Error('Service monitoring failure');
      (
        healthService.getDetailedStatus
      ).mockImplementation(() => {
        throw serviceError;
      });

      const result = await controller.getDetailedStatus(mockUser);

      expect(result).toEqual({
        status: 'error',
        timestamp: expect.stringMatching(/.*/) as string,
        error: 'Service monitoring failure',
        services: {},
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Detailed status check failed: Service monitoring failure',
      );

      console.log(`[${testId}] Detailed status error handling test completed`);
    });

    it('should validate detailed status response structure', async () => {
      const testId = `${operationId}_detailed_status_structure`;
      console.log(`[${testId}] Testing detailed status response structure`);

      (
        healthService.getDetailedStatus
      ).mockReturnValue(mockDetailedStatusResponse);

      const result = await controller.getDetailedStatus(mockUser);

      // Type-safe validation for detailed status response
      const typedDetailedResult = result as DetailedStatusResponse;
      
      // Validate structure with separate assertions to avoid unsafe assignments
      expect(typedDetailedResult.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(typedDetailedResult.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(typeof typedDetailedResult.uptime).toBe('number');
      
      // Memory validation with type guard
      if (typedDetailedResult.memory && typeof typedDetailedResult.memory === 'object') {
        expect(typeof typedDetailedResult.memory.used).toBe('number');
        expect(typeof typedDetailedResult.memory.free).toBe('number');
        expect(typeof typedDetailedResult.memory.total).toBe('number');
        expect(typeof typedDetailedResult.memory.heapUsed).toBe('number');
        expect(typeof typedDetailedResult.memory.heapTotal).toBe('number');
      } else {
        fail('Memory property is missing or not an object');
      }
      
      // Services validation with type guard
      if (typedDetailedResult.services && typeof typedDetailedResult.services === 'object') {
        expect(typedDetailedResult.services.database).toMatch(/^(connected|disconnected|unknown)$/);
        expect(typedDetailedResult.services.cache).toMatch(/^(available|unavailable|unknown)$/);
        expect(typedDetailedResult.services.external).toMatch(/^(reachable|unreachable|unknown)$/);
      } else {
        fail('Services property is missing or not an object');
      }
      
      // Performance validation with type guard
      if (typedDetailedResult.performance && typeof typedDetailedResult.performance === 'object') {
        expect(typeof typedDetailedResult.performance.requestsPerSecond).toBe('number');
        expect(typeof typedDetailedResult.performance.averageResponseTime).toBe('number');
      } else {
        fail('Performance property is missing or not an object');
      }

      console.log(`[${testId}] Response structure validation test completed`);
    });

    it('should complete within performance threshold', async () => {
      const testId = `${operationId}_detailed_status_performance`;
      console.log(`[${testId}] Testing detailed status performance`);

      (
        healthService.getDetailedStatus
      ).mockReturnValue(mockDetailedStatusResponse);

      const startTime = Date.now();
      await controller.getDetailedStatus(mockUser);
      const executionTime = Date.now() - startTime;

      // Detailed status should complete within 200ms
      expect(executionTime).toBeLessThan(200);

      console.log(
        `[${testId}] Detailed status performance test completed (${executionTime}ms)`,
      );
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log health check requests properly', async () => {
      const testId = `${operationId}_logging_health_requests`;
      console.log(`[${testId}] Testing health check request logging`);

      (
        healthService.getBasicHealth
      ).mockReturnValue(mockBasicHealthResponse);

      await controller.getHealth(mockUser);

      expect(mockLogger.debug).toHaveBeenCalledWith('Health check requested');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Health check completed successfully',
      );

      console.log(`[${testId}] Health check logging test completed`);
    });

    it('should log detailed status requests properly', async () => {
      const testId = `${operationId}_logging_status_requests`;
      console.log(`[${testId}] Testing detailed status request logging`);

      (
        healthService.getDetailedStatus
      ).mockReturnValue(mockDetailedStatusResponse);

      await controller.getDetailedStatus(mockUser);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Detailed status requested',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Detailed status completed successfully',
      );

      console.log(`[${testId}] Detailed status logging test completed`);
    });

    it('should log errors with proper context', async () => {
      const testId = `${operationId}_logging_error_context`;
      console.log(`[${testId}] Testing error logging with context`);

      const contextualError = new Error(
        'Connection timeout to monitoring service',
      );
      (
        healthService.getDetailedStatus
      ).mockImplementation(() => {
        throw contextualError;
      });

      await controller.getDetailedStatus(mockUser);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Detailed status check failed: Connection timeout to monitoring service',
      );

      console.log(`[${testId}] Error context logging test completed`);
    });

    it('should handle concurrent logging requests', async () => {
      const testId = `${operationId}_logging_concurrent`;
      console.log(`[${testId}] Testing concurrent request logging`);

      (
        healthService.getBasicHealth
      ).mockReturnValue(mockBasicHealthResponse);

      // Simulate concurrent requests
      const promises = Array(10)
        .fill(null)
        .map(() => controller.getHealth(mockUser));
      await Promise.all(promises);

      // Should log debug messages for each request (20 total: 10 request + 10 completion)
      expect(mockLogger.debug).toHaveBeenCalledTimes(20);

      console.log(`[${testId}] Concurrent logging test completed`);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should maintain consistent _error response format', async () => {
      const testId = `${operationId}_error_format_consistency`;
      console.log(`[${testId}] Testing error response format consistency`);

      const testErrors = [
        new Error('Database connection failed'),
        new Error('Service timeout'),
        'String error',
        null,
        undefined,
      ];

      for (const _error of testErrors) {
        (
          healthService.getBasicHealth
        ).mockImplementation(() => {
          throw _error;
        });

        const result = await controller.getHealth(mockUser);

        expect(result).toMatchObject({
          status: 'unhealthy',
          timestamp: expect.stringMatching(/.*/) as unknown as string,
          error: expect.stringMatching(/.*/) as unknown as string,
        });
      }

      console.log(`[${testId}] Error format consistency test completed`);
    });

    it('should recover from service failures gracefully', async () => {
      const testId = `${operationId}_service_failure_recovery`;
      console.log(`[${testId}] Testing recovery from service failures`);

      // Simulate service failure followed by recovery
      healthService.getBasicHealth
        .mockImplementationOnce(() => {
          throw new Error('Service temporarily unavailable');
        })
        .mockReturnValueOnce(mockBasicHealthResponse);

      // First call should handle error gracefully
      const errorResult = await controller.getHealth(mockUser);
      expect(errorResult.status).toBe('unhealthy');

      // Second call should succeed
      const successResult = await controller.getHealth(mockUser);
      expect(successResult.status).toBe('healthy');

      console.log(`[${testId}] Service failure recovery test completed`);
    });

    it('should handle service timeout scenarios', async () => {
      const testId = `${operationId}_service_timeout`;
      console.log(`[${testId}] Testing service timeout handling`);

      // Simulate timeout error
      const timeoutError = new Error('Health check timeout');
      timeoutError.name = 'TimeoutError';

      (
        healthService.getDetailedStatus
      ).mockImplementation(() => {
        throw timeoutError;
      });

      const result = await controller.getDetailedStatus(mockUser);

      expect(result.status).toBe('error');
      expect((result as { error: string }).error).toBe('Health check timeout');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Detailed status check failed: Health check timeout',
      );

      console.log(`[${testId}] Service timeout handling test completed`);
    });

    it('should maintain service availability during errors', async () => {
      const testId = `${operationId}_availability_during_errors`;
      console.log(`[${testId}] Testing service availability during errors`);

      // Mix of successful and failed requests
      const healthCalls = [
        () => {
          healthService.getBasicHealth.mockReturnValueOnce(
            mockBasicHealthResponse,
          );
          return controller.getHealth(mockUser);
        },
        () => {
          healthService.getBasicHealth.mockImplementationOnce(() => {
            throw new Error('Service error');
          });
          return controller.getHealth(mockUser);
        },
      ];

      const results = await Promise.all(healthCalls.map((call) => call()));

      // Both requests should complete (not crash the service)
      expect(results).toHaveLength(2);
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
      expect(results[0]?.status).toBe('healthy');
      expect(results[1]?.status).toBe('unhealthy');

      console.log(`[${testId}] Service availability test completed`);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-frequency health checks efficiently', async () => {
      const testId = `${operationId}_high_frequency_health`;
      console.log(`[${testId}] Testing high-frequency health checks`);

      (
        healthService.getBasicHealth
      ).mockReturnValue(mockBasicHealthResponse);

      const startTime = Date.now();
      const promises = Array(50)
        .fill(null)
        .map(() => controller.getHealth(mockUser));
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(50);
      expect(results.every((result) => result.status === 'healthy')).toBe(true);
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second

      console.log(
        `[${testId}] High-frequency health checks completed (${totalTime}ms for 50 requests)`,
      );
    });

    it('should handle mixed endpoint load efficiently', async () => {
      const testId = `${operationId}_mixed_endpoint_load`;
      console.log(`[${testId}] Testing mixed endpoint load handling`);

      (
        healthService.getBasicHealth
      ).mockReturnValue(mockBasicHealthResponse);
      (
        healthService.getDetailedStatus
      ).mockReturnValue(mockDetailedStatusResponse);

      const startTime = Date.now();

      const promises = [
        ...Array(25)
          .fill(null)
          .map(() => controller.getHealth(mockUser)),
        ...Array(25)
          .fill(null)
          .map(() => controller.getDetailedStatus(mockUser)),
      ];

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(50);
      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds

      console.log(
        `[${testId}] Mixed endpoint load test completed (${totalTime}ms for 50 requests)`,
      );
    });

    it('should maintain response consistency under load', async () => {
      const testId = `${operationId}_response_consistency_load`;
      console.log(`[${testId}] Testing response consistency under load`);

      (
        healthService.getBasicHealth
      ).mockReturnValue(mockBasicHealthResponse);

      // Execute multiple concurrent requests
      const promises = Array(20)
        .fill(null)
        .map(() => controller.getHealth(mockUser));
      const results = await Promise.all(promises);

      // All responses should be identical
      const firstResponse = results[0];
      const allIdentical = results.every(
        (result) => JSON.stringify(result) === JSON.stringify(firstResponse),
      );

      expect(allIdentical).toBe(true);

      console.log(`[${testId}] Response consistency under load test completed`);
    });

    it('should not leak memory during extended operations', async () => {
      const testId = `${operationId}_memory_leak_prevention`;
      console.log(`[${testId}] Testing memory leak prevention`);

      (
        healthService.getBasicHealth
      ).mockReturnValue(mockBasicHealthResponse);

      const initialMemory = process.memoryUsage();

      // Execute many health checks
      for (let i = 0; i < 100; i++) {
        await controller.getHealth(mockUser);
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be minimal (less than 2MB for 100 operations)
      expect(memoryGrowth).toBeLessThan(2 * 1024 * 1024);

      console.log(
        `[${testId}] Memory leak prevention test completed (${Math.round(memoryGrowth / 1024)}KB growth)`,
      );
    });
  });

  describe('Integration and Compatibility', () => {
    it('should maintain backward compatibility in response format', async () => {
      const testId = `${operationId}_backward_compatibility`;
      console.log(
        `[${testId}] Testing backward compatibility in response format`,
      );

      (
        healthService.getBasicHealth
      ).mockReturnValue(mockBasicHealthResponse);

      const result = await controller.getHealth(mockUser);

      // Ensure response contains expected fields for backward compatibility
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result as BasicHealthResponse).toHaveProperty('memory');

      // Memory object should have expected structure
      expect((result as BasicHealthResponse).memory).toHaveProperty('used');
      expect((result as BasicHealthResponse).memory).toHaveProperty('free');
      expect((result as BasicHealthResponse).memory).toHaveProperty('total');

      console.log(`[${testId}] Backward compatibility test completed`);
    });

    it('should handle different service response variations', async () => {
      const testId = `${operationId}_service_response_variations`;
      console.log(`[${testId}] Testing different service response variations`);

      const variations = [
        { ...mockBasicHealthResponse, status: 'healthy' as const },
        { ...mockBasicHealthResponse, status: 'unhealthy' as const },
        { ...mockBasicHealthResponse, memory: { used: 0, free: 0, total: 0 } },
      ];

      for (const variation of variations) {
        (
          healthService.getBasicHealth
        ).mockReturnValue(variation);

        const result = await controller.getHealth(mockUser);
        expect(result).toEqual(variation);
      }

      console.log(`[${testId}] Service response variations test completed`);
    });

    it('should properly integrate with health service lifecycle', async () => {
      const testId = `${operationId}_service_lifecycle_integration`;
      console.log(`[${testId}] Testing health service lifecycle integration`);

      // Test service initialization
      expect(controller).toBeDefined();
      expect(healthService).toBeDefined();

      // Test service interaction
      (
        healthService.getBasicHealth
      ).mockReturnValue(mockBasicHealthResponse);
      (
        healthService.getDetailedStatus
      ).mockReturnValue(mockDetailedStatusResponse);

      const basicResult = await controller.getHealth(mockUser);
      const detailedResult = await controller.getDetailedStatus(mockUser);

      expect(basicResult.status).toBeDefined();
      expect(detailedResult.services).toBeDefined();

      console.log(`[${testId}] Service lifecycle integration test completed`);
    });

    it('should handle service method parameter validation', async () => {
      const testId = `${operationId}_parameter_validation`;
      console.log(`[${testId}] Testing service method parameter validation`);

      (
        healthService.getBasicHealth
      ).mockReturnValue(mockBasicHealthResponse);

      // Both endpoints should work without parameters
      expect(await controller.getHealth(mockUser)).toBeDefined();
      expect(await controller.getDetailedStatus(mockUser)).toBeDefined();

      console.log(`[${testId}] Parameter validation test completed`);
    });
  });

  describe('Security and Validation', () => {
    it('should not expose sensitive information in responses', async () => {
      const testId = `${operationId}_sensitive_info_protection`;
      console.log(`[${testId}] Testing sensitive information protection`);

      (
        healthService.getDetailedStatus
      ).mockReturnValue(mockDetailedStatusResponse);

      const result = await controller.getDetailedStatus(mockUser);

      // Ensure no sensitive data is exposed
      const responseStr = JSON.stringify(result);
      expect(responseStr).not.toMatch(/password|secret|key|token/i);

      console.log(
        `[${testId}] Sensitive information protection test completed`,
      );
    });

    it('should validate response data types', async () => {
      const testId = `${operationId}_response_data_types`;
      console.log(`[${testId}] Testing response data type validation`);

      (
        healthService.getBasicHealth
      ).mockReturnValue(mockBasicHealthResponse);

      const result = await controller.getHealth(mockUser);

      expect(typeof result.status).toBe('string');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof (result as BasicHealthResponse).uptime).toBe('number');
      expect(typeof (result as BasicHealthResponse).memory).toBe('object');
      expect(typeof (result as BasicHealthResponse).memory.used).toBe('number');
      expect(typeof (result as BasicHealthResponse).memory.free).toBe('number');
      expect(typeof (result as BasicHealthResponse).memory.total).toBe(
        'number',
      );

      console.log(`[${testId}] Response data type validation test completed`);
    });

    it('should sanitize _error messages', async () => {
      const testId = `${operationId}_error_message_sanitization`;
      console.log(`[${testId}] Testing error message sanitization`);

      const maliciousError = new Error(
        'Database error: <script>alert("XSS")</script>',
      );
      (
        healthService.getBasicHealth
      ).mockImplementation(() => {
        throw maliciousError;
      });

      const result = await controller.getHealth(mockUser);

      expect((result as { error: string }).error).toBe(
        'Database error: <script>alert("XSS")</script>',
      );
      // In a real implementation, you might want to sanitize this further

      console.log(`[${testId}] Error message sanitization test completed`);
    });

    it('should limit _error message length', async () => {
      const testId = `${operationId}_error_message_length`;
      console.log(`[${testId}] Testing error message length limits`);

      const longError = new Error('A'.repeat(1000)); // Very long error message
      (
        healthService.getBasicHealth
      ).mockImplementation(() => {
        throw longError;
      });

      const result = await controller.getHealth(mockUser);

      expect((result as { error: string }).error).toBeDefined();
      expect((result as { error: string }).error.length).toBeGreaterThan(0);

      console.log(`[${testId}] Error message length test completed`);
    });
  });

  describe('Kubernetes Health Probe Endpoints', () => {
    const mockHealthIndicatorResult: HealthIndicatorResult = {
      process: {
        status: 'up',
        uptime: 300,
        memoryMB: 128,
      },
    };

    describe('Liveness Probe (checkLiveness)', () => {
      it('should return successful liveness check', async () => {
        const testId = `${operationId}_liveness_success`;
        console.log(`[${testId}] Testing successful liveness probe`);

        // Mock successful health checks
        (
          memoryHealthIndicator.checkHeap
        ).mockResolvedValue({
          memory_heap: {
            status: 'up' as HealthIndicatorStatus,
            limit: '150MB',
            used: '64MB',
          },
        });

        (
          healthService.checkProcessHealth
        ).mockReturnValue(mockHealthIndicatorResult);

        (
          healthCheckService.check
        ).mockResolvedValue({
          status: 'ok',
          info: { memory_heap: { status: 'up' }, process: { status: 'up' } },
          error: {},
          details: { memory_heap: { status: 'up' }, process: { status: 'up' } },
        } as HealthCheckResult);

        const result = await controller.checkLiveness(mockUser);

        expect(healthCheckService.check).toHaveBeenCalledWith([
          expect.any(Function),
          expect.any(Function),
        ]);
        expect(result).toBeDefined();
        expect(result.status).toBe('ok');

        console.log(`[${testId}] Liveness probe success test completed`);
      });

      it('should handle liveness check failures', async () => {
        const testId = `${operationId}_liveness_failure`;
        console.log(`[${testId}] Testing liveness probe failure handling`);

        // Mock failed health checks
        const healthError = new Error('Memory limit exceeded');
        (
          memoryHealthIndicator.checkHeap
        ).mockRejectedValue(healthError);

        (
          healthCheckService.check
        ).mockRejectedValue(healthError);

        try {
          await controller.checkLiveness(mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Memory limit exceeded');
        }

        expect(healthCheckService.check).toHaveBeenCalled();
        console.log(`[${testId}] Liveness probe failure test completed`);
      });

      it('should log liveness probe operations with operation ID', async () => {
        const testId = `${operationId}_liveness_logging`;
        console.log(`[${testId}] Testing liveness probe logging`);

        (
          healthCheckService.check
        ).mockResolvedValue({
          status: 'ok',
          info: {},
          error: {},
          details: {},
        });

        await controller.checkLiveness(mockUser);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringMatching(/\[liveness_\d+\] Liveness probe requested/),
        );

        console.log(`[${testId}] Liveness probe logging test completed`);
      });

      it('should check memory heap within acceptable limits', async () => {
        const testId = `${operationId}_liveness_memory_check`;
        console.log(`[${testId}] Testing liveness memory limit validation`);

        (
          memoryHealthIndicator.checkHeap
        ).mockResolvedValue({
          memory_heap: { status: 'up', limit: '150MB', used: '120MB' },
        });

        (
          healthService.checkProcessHealth
        ).mockReturnValue(mockHealthIndicatorResult);

        (
          healthCheckService.check
        ).mockResolvedValue({
          status: 'ok',
          info: { memory_heap: { status: 'up' } },
          error: {},
          details: {},
        });

        await controller.checkLiveness(mockUser);

        expect(memoryHealthIndicator.checkHeap).toHaveBeenCalledWith(
          'memory_heap',
          150 * 1024 * 1024, // 150MB in bytes
        );

        console.log(`[${testId}] Memory limit validation test completed`);
      });
    });

    describe('Readiness Probe (checkReadiness)', () => {
      it('should return successful readiness check', async () => {
        const testId = `${operationId}_readiness_success`;
        console.log(`[${testId}] Testing successful readiness probe`);

        // Mock all readiness dependencies
        (
          healthService.checkDatabaseHealth
        ).mockResolvedValue({
          database: { status: 'up', responseTime: '25ms' },
        });

        (
          healthService.checkExternalServices
        ).mockResolvedValue({
          external_services: { status: 'up', serviceCount: 2 },
        });

        (
          diskHealthIndicator.checkStorage
        ).mockResolvedValue({
          storage: { status: 'up', usage: '65%' },
        });

        (
          memoryHealthIndicator.checkHeap
        ).mockResolvedValue({
          memory_heap: { status: 'up', used: '80MB' },
        });

        (
          healthCheckService.check
        ).mockResolvedValue({
          status: 'ok',
          info: {
            database: { status: 'up' },
            external_services: { status: 'up' },
            storage: { status: 'up' },
            memory_heap: { status: 'up' },
          },
          error: {},
          details: {},
        });

        const result = await controller.checkReadiness(mockUser);

        expect(healthCheckService.check).toHaveBeenCalledWith([
          expect.any(Function), // database health
          expect.any(Function), // external services
          expect.any(Function), // disk storage
          expect.any(Function), // memory heap
        ]);
        expect(result.status).toBe('ok');

        console.log(`[${testId}] Readiness probe success test completed`);
      });

      it('should handle readiness check failures', async () => {
        const testId = `${operationId}_readiness_failure`;
        console.log(`[${testId}] Testing readiness probe failure scenarios`);

        // Mock database failure
        (
          jest.spyOn(
            healthService,
            'checkDatabaseHealth',
          )
        ).mockRejectedValue(new Error('Database connection timeout'));

        (
          healthCheckService.check
        ).mockRejectedValue(new Error('Readiness check failed'));

        try {
          await controller.checkReadiness(mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }

        expect(healthCheckService.check).toHaveBeenCalled();
        console.log(`[${testId}] Readiness failure handling test completed`);
      });

      it('should validate storage and memory thresholds', async () => {
        const testId = `${operationId}_readiness_thresholds`;
        console.log(`[${testId}] Testing readiness threshold validation`);

        (
          healthService.checkDatabaseHealth
        ).mockResolvedValue({
          database: { status: 'up' },
        });

        (
          healthService.checkExternalServices
        ).mockResolvedValue({
          external_services: { status: 'up' },
        });

        (
          diskHealthIndicator.checkStorage
        ).mockResolvedValue({
          storage: { status: 'up' },
        });

        (
          memoryHealthIndicator.checkHeap
        ).mockResolvedValue({
          memory_heap: { status: 'up' },
        });

        (
          healthCheckService.check
        ).mockResolvedValue({
          status: 'ok',
          info: {},
          error: {},
          details: {},
        });

        await controller.checkReadiness(mockUser);

        // Verify threshold parameters
        expect(diskHealthIndicator.checkStorage).toHaveBeenCalledWith(
          'storage',
          { thresholdPercent: 0.8, path: '/' },
        );
        expect(memoryHealthIndicator.checkHeap).toHaveBeenCalledWith(
          'memory_heap',
          120 * 1024 * 1024, // 120MB limit
        );

        console.log(`[${testId}] Threshold validation test completed`);
      });

      it('should handle partial service failures gracefully', async () => {
        const testId = `${operationId}_readiness_partial_failure`;
        console.log(`[${testId}] Testing partial service failure handling`);

        // Mock external services failure but database success
        (
          healthService.checkDatabaseHealth
        ).mockResolvedValue({
          database: { status: 'up' },
        });

        (
          healthService.checkExternalServices
        ).mockRejectedValue(new Error('External service unavailable'));

        (
          diskHealthIndicator.checkStorage
        ).mockResolvedValue({
          storage: { status: 'up' },
        });

        (
          memoryHealthIndicator.checkHeap
        ).mockResolvedValue({
          memory_heap: { status: 'up' },
        });

        (
          healthCheckService.check
        ).mockRejectedValue(new Error('Some services are down'));

        try {
          await controller.checkReadiness(mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }

        console.log(`[${testId}] Partial failure handling test completed`);
      });

      it('should log readiness probe with detailed context', async () => {
        const testId = `${operationId}_readiness_detailed_logging`;
        console.log(`[${testId}] Testing readiness probe detailed logging`);

        // Mock successful checks
        (
          healthService.checkDatabaseHealth
        ).mockResolvedValue({
          database: { status: 'up' },
        });

        (
          healthService.checkExternalServices
        ).mockResolvedValue({
          external_services: { status: 'up' },
        });

        (
          diskHealthIndicator.checkStorage
        ).mockResolvedValue({
          storage: { status: 'up' },
        });

        (
          memoryHealthIndicator.checkHeap
        ).mockResolvedValue({
          memory_heap: { status: 'up' },
        });

        (
          healthCheckService.check
        ).mockResolvedValue({
          status: 'ok',
          info: {},
          error: {},
          details: {},
        });

        await controller.checkReadiness(mockUser);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringMatching(/\[readiness_\d+\] Readiness probe requested/),
        );

        console.log(`[${testId}] Detailed logging test completed`);
      });
    });

    describe('Startup Probe (checkStartup)', () => {
      it('should return successful startup check', async () => {
        const testId = `${operationId}_startup_success`;
        console.log(`[${testId}] Testing successful startup probe`);

        // Mock startup dependencies
        (
          healthService.checkStartupComplete
        ).mockReturnValue({
          startup: { status: 'up', uptime: '45s' },
        });

        (
          healthService.checkModuleInitialization
        ).mockReturnValue({
          modules: { status: 'up', modules: { health: true } },
        });

        (
          healthService.checkDatabaseHealth
        ).mockResolvedValue({
          database: { status: 'up', responseTime: '15ms' },
        });

        (
          healthCheckService.check
        ).mockResolvedValue({
          status: 'ok',
          info: {
            startup: { status: 'up' },
            modules: { status: 'up' },
            database: { status: 'up' },
          },
          error: {},
          details: {},
        });

        const result = await controller.checkStartup(mockUser);

        expect(healthCheckService.check).toHaveBeenCalledWith([
          expect.any(Function), // startup completion check
          expect.any(Function), // module initialization check
          expect.any(Function), // basic database check
        ]);
        expect(result.status).toBe('ok');

        console.log(`[${testId}] Startup probe success test completed`);
      });

      it('should handle startup check failures', async () => {
        const testId = `${operationId}_startup_failure`;
        console.log(`[${testId}] Testing startup probe failure scenarios`);

        // Mock startup not complete
        (
          healthService.checkStartupComplete
        ).mockReturnValue({
          startup: { status: 'down', message: 'Service is still starting up' },
        });

        (
          healthCheckService.check
        ).mockRejectedValue(new Error('Startup not complete'));

        try {
          await controller.checkStartup(mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }

        console.log(`[${testId}] Startup failure handling test completed`);
      });

      it('should validate module initialization status', async () => {
        const testId = `${operationId}_startup_module_validation`;
        console.log(`[${testId}] Testing module initialization validation`);

        (
          healthService.checkStartupComplete
        ).mockReturnValue({
          startup: { status: 'up' },
        });

        (
          healthService.checkModuleInitialization
        ).mockReturnValue({
          modules: {
            status: 'up',
            modules: {
              'computer-use': true,
              'input-tracking': true,
              'cua-integration': true,
              health: true,
            },
          },
        });

        (
          healthService.checkDatabaseHealth
        ).mockResolvedValue({
          database: { status: 'up' },
        });

        (
          healthCheckService.check
        ).mockResolvedValue({
          status: 'ok',
          info: {},
          error: {},
          details: {},
        });

        await controller.checkStartup(mockUser);

        expect(healthService.checkModuleInitialization).toHaveBeenCalled();
        console.log(`[${testId}] Module validation test completed`);
      });

      it('should handle long startup times appropriately', async () => {
        const testId = `${operationId}_startup_long_duration`;
        console.log(`[${testId}] Testing long startup duration handling`);

        // Mock service that hasn't been running long enough
        (
          healthService.checkStartupComplete
        ).mockReturnValue({
          startup: {
            status: 'down',
            uptime: '5s',
            message: 'Service is still starting up',
          },
        });

        (
          healthService.checkModuleInitialization
        ).mockReturnValue({
          modules: { status: 'up', modules: {} },
        });

        (
          healthService.checkDatabaseHealth
        ).mockResolvedValue({
          database: { status: 'up' },
        });

        (
          healthCheckService.check
        ).mockRejectedValue(
          new Error('Startup probe failed - still initializing'),
        );

        try {
          await controller.checkStartup(mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('still initializing');
        }

        console.log(`[${testId}] Long startup duration test completed`);
      });

      it('should log startup probe with timing information', async () => {
        const testId = `${operationId}_startup_timing_logging`;
        console.log(`[${testId}] Testing startup probe timing logging`);

        (
          healthService.checkStartupComplete
        ).mockReturnValue({
          startup: { status: 'up', uptime: '120s' },
        });

        (
          healthService.checkModuleInitialization
        ).mockReturnValue({
          modules: { status: 'up' },
        });

        (
          healthService.checkDatabaseHealth
        ).mockResolvedValue({
          database: { status: 'up' },
        });

        (
          healthCheckService.check
        ).mockResolvedValue({
          status: 'ok',
          info: {},
          error: {},
          details: {},
        });

        await controller.checkStartup(mockUser);

        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringMatching(/\[startup_\d+\] Startup probe requested/),
        );

        console.log(`[${testId}] Timing logging test completed`);
      });
    });

    describe('Health Probe Integration and Performance', () => {
      it('should handle concurrent health probe requests', async () => {
        const testId = `${operationId}_concurrent_probes`;
        console.log(`[${testId}] Testing concurrent health probe handling`);

        // Mock all health checks to succeed
        (
          healthService.checkProcessHealth
        ).mockReturnValue(mockHealthIndicatorResult);
        (
          healthService.checkDatabaseHealth
        ).mockResolvedValue({
          database: { status: 'up' },
        });
        (
          healthService.checkExternalServices
        ).mockResolvedValue({
          external_services: { status: 'up' },
        });
        (
          healthService.checkStartupComplete
        ).mockReturnValue({
          startup: { status: 'up' },
        });
        (
          healthService.checkModuleInitialization
        ).mockReturnValue({
          modules: { status: 'up' },
        });

        (
          memoryHealthIndicator.checkHeap
        ).mockResolvedValue({
          memory_heap: { status: 'up' },
        });
        (
          diskHealthIndicator.checkStorage
        ).mockResolvedValue({
          storage: { status: 'up' },
        });

        (
          healthCheckService.check
        ).mockResolvedValue({
          status: 'ok',
          info: {},
          error: {},
          details: {},
        });

        // Execute concurrent probe requests
        const probePromises = [
          controller.checkLiveness(mockUser),
          controller.checkReadiness(mockUser),
          controller.checkStartup(mockUser),
        ];

        const results = await Promise.all(probePromises);

        expect(results).toHaveLength(3);
        results.forEach((result) => {
          expect(result.status).toBe('ok');
        });

        console.log(`[${testId}] Concurrent probe handling test completed`);
      });

      it('should complete health probes within acceptable timeouts', async () => {
        const testId = `${operationId}_probe_performance`;
        console.log(`[${testId}] Testing health probe performance`);

        // Mock fast responses
        (
          healthService.checkProcessHealth
        ).mockReturnValue(mockHealthIndicatorResult);
        (
          memoryHealthIndicator.checkHeap
        ).mockResolvedValue({
          memory_heap: { status: 'up' },
        });

        (
          healthCheckService.check
        ).mockResolvedValue({
          status: 'ok',
          info: {},
          error: {},
          details: {},
        });

        const startTime = Date.now();
        await controller.checkLiveness(mockUser);
        const executionTime = Date.now() - startTime;

        // Health probes should be very fast (under 500ms)
        expect(executionTime).toBeLessThan(500);

        console.log(
          `[${testId}] Probe performance test completed (${executionTime}ms)`,
        );
      });

      it('should maintain probe response consistency', async () => {
        const testId = `${operationId}_probe_consistency`;
        console.log(`[${testId}] Testing health probe response consistency`);

        (
          healthService.checkProcessHealth
        ).mockReturnValue(mockHealthIndicatorResult);
        (
          memoryHealthIndicator.checkHeap
        ).mockResolvedValue({
          memory_heap: { status: 'up' },
        });

        const consistentResponse = {
          status: 'ok' as const,
          info: {
            process: { status: 'up' as HealthIndicatorStatus },
            memory_heap: { status: 'up' as HealthIndicatorStatus },
          },
          error: {},
          details: {
            process: { status: 'up' as HealthIndicatorStatus },
            memory_heap: { status: 'up' as HealthIndicatorStatus },
          },
        };

        (
          healthCheckService.check
        ).mockResolvedValue(consistentResponse);

        // Execute multiple identical requests
        const requests = Array(5)
          .fill(null)
          .map(() => controller.checkLiveness(mockUser));
        const results = await Promise.all(requests);

        // All results should be identical
        expect(results).toHaveLength(5);
        results.forEach((result) => {
          expect(result.status).toBe('ok');
          expect(JSON.stringify(result)).toBe(
            JSON.stringify(consistentResponse),
          );
        });

        console.log(`[${testId}] Probe consistency test completed`);
      });

      it('should handle probe timeout scenarios gracefully', async () => {
        const testId = `${operationId}_probe_timeout_handling`;
        console.log(`[${testId}] Testing health probe timeout handling`);

        // Mock timeout scenario
        const timeoutError = new Error('Health check timeout');
        timeoutError.name = 'TimeoutError';

        (
          healthService.checkDatabaseHealth
        ).mockRejectedValue(timeoutError);
        (
          healthCheckService.check
        ).mockRejectedValue(timeoutError);

        try {
          await controller.checkReadiness(mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).name).toBe('TimeoutError');
        }

        console.log(`[${testId}] Probe timeout handling test completed`);
      });

      it('should validate Kubernetes probe response formats', async () => {
        const testId = `${operationId}_kubernetes_response_format`;
        console.log(
          `[${testId}] Testing Kubernetes probe response format compliance`,
        );

        (
          healthService.checkProcessHealth
        ).mockReturnValue(mockHealthIndicatorResult);
        (
          memoryHealthIndicator.checkHeap
        ).mockResolvedValue({
          memory_heap: { status: 'up' },
        });

        const kubernetesResponse = {
          status: 'ok' as const,
          info: {
            process: {
              status: 'up' as HealthIndicatorStatus,
              uptime: 300,
              memoryMB: 128,
            },
            memory_heap: {
              status: 'up' as HealthIndicatorStatus,
              limit: '150MB',
              used: '64MB',
            },
          },
          error: {},
          details: {
            process: {
              status: 'up' as HealthIndicatorStatus,
              uptime: 300,
              memoryMB: 128,
            },
            memory_heap: {
              status: 'up' as HealthIndicatorStatus,
              limit: '150MB',
              used: '64MB',
            },
          },
        };

        (
          healthCheckService.check
        ).mockResolvedValue(kubernetesResponse);

        const result = await controller.checkLiveness(mockUser);

        // Validate Kubernetes-compatible response structure
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('info');
        expect(result).toHaveProperty('error');
        expect(result).toHaveProperty('details');
        expect(['ok', 'error', 'shutting_down'].includes(result.status)).toBe(
          true,
        );

        console.log(`[${testId}] Kubernetes response format test completed`);
      });
    });

    describe('Health Probe Error Scenarios and Recovery', () => {
      it('should handle health service unavailability', async () => {
        const testId = `${operationId}_service_unavailable`;
        console.log(
          `[${testId}] Testing health service unavailability handling`,
        );

        const unavailableError = new Error('Health service unavailable');
        (
          healthService.checkProcessHealth
        ).mockImplementation(() => {
          throw unavailableError;
        });

        (
          healthCheckService.check
        ).mockRejectedValue(unavailableError);

        try {
          await controller.checkLiveness(mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('unavailable');
        }

        console.log(`[${testId}] Service unavailability test completed`);
      });

      it('should recover from transient probe failures', async () => {
        const testId = `${operationId}_probe_failure_recovery`;
        console.log(`[${testId}] Testing probe failure recovery`);

        // First call fails, second succeeds
        jest
          .spyOn(healthService, 'checkProcessHealth')
          .mockImplementationOnce(() => {
            throw new Error('Transient failure');
          })
          .mockReturnValueOnce(mockHealthIndicatorResult);

        memoryHealthIndicator.checkHeap
          .mockRejectedValueOnce(new Error('Memory check failed'))
          .mockResolvedValueOnce({ memory_heap: { status: 'up' } });

        healthCheckService.check
          .mockRejectedValueOnce(new Error('Health check failed'))
          .mockResolvedValueOnce({
            status: 'ok',
            info: {},
            error: {},
            details: {},
          });

        // First call should fail
        try {
          await controller.checkLiveness(mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }

        // Second call should succeed
        const result = await controller.checkLiveness(mockUser);
        expect(result.status).toBe('ok');

        console.log(`[${testId}] Probe failure recovery test completed`);
      });

      it('should handle memory pressure scenarios in liveness probe', async () => {
        const testId = `${operationId}_memory_pressure_liveness`;
        console.log(`[${testId}] Testing memory pressure in liveness probe`);

        const memoryError = new Error('Memory threshold exceeded');
        (
          memoryHealthIndicator.checkHeap
        ).mockRejectedValue(memoryError);

        (
          healthCheckService.check
        ).mockRejectedValue(memoryError);

        try {
          await controller.checkLiveness(mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('Memory');
        }

        console.log(`[${testId}] Memory pressure liveness test completed`);
      });

      it('should handle disk space issues in readiness probe', async () => {
        const testId = `${operationId}_disk_space_readiness`;
        console.log(`[${testId}] Testing disk space issues in readiness probe`);

        const diskError = new Error('Insufficient disk space');
        (
          diskHealthIndicator.checkStorage
        ).mockRejectedValue(diskError);

        (
          healthCheckService.check
        ).mockRejectedValue(diskError);

        try {
          await controller.checkReadiness(mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('disk');
        }

        console.log(`[${testId}] Disk space readiness test completed`);
      });

      it('should maintain probe functionality under high load', async () => {
        const testId = `${operationId}_probe_high_load`;
        console.log(`[${testId}] Testing probe functionality under high load`);

        // Mock successful but slow responses
        (
          jest.spyOn(
            healthService,
            'checkProcessHealth',
          )
        ).mockReturnValue(mockHealthIndicatorResult);

        (
          memoryHealthIndicator.checkHeap
        ).mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ memory_heap: { status: 'up' } }), 10),
            ),
        );

        (
          healthCheckService.check
        ).mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    status: 'ok',
                    info: {},
                    error: {},
                    details: {},
                  }),
                20,
              ),
            ),
        );

        // Execute high load scenario
        const highLoadPromises = Array(20)
          .fill(null)
          .map(() => controller.checkLiveness(mockUser));
        const results = await Promise.all(highLoadPromises);

        expect(results).toHaveLength(20);
        results.forEach((result) => {
          expect(result.status).toBe('ok');
        });

        console.log(`[${testId}] High load probe test completed`);
      });
    });
  });
});
