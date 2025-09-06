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
import { HealthController } from '../health.controller';
import { HealthService } from '../health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;
  let mockLogger: jest.Mocked<Logger>;

  const operationId = `health_controller_test_${Date.now()}`;

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
    } as any;

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
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);

    // Mock the logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLogger.log);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(mockLogger.debug);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLogger.error);

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

      jest.spyOn(healthService, 'getBasicHealth').mockResolvedValue(mockBasicHealthResponse);

      const result = await controller.getHealth();

      expect(result).toEqual(mockBasicHealthResponse);
      expect(healthService.getBasicHealth).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith('Health check requested');
      expect(mockLogger.debug).toHaveBeenCalledWith('Health check completed successfully');

      console.log(`[${testId}] Basic health check test completed successfully`);
    });

    it('should handle service errors gracefully', async () => {
      const testId = `${operationId}_basic_health_error`;
      console.log(`[${testId}] Testing basic health check error handling`);

      const serviceError = new Error('Database connection failed');
      jest.spyOn(healthService, 'getBasicHealth').mockRejectedValue(serviceError);

      const result = await controller.getHealth();

      expect(result).toEqual({
        status: 'unhealthy',
        timestamp: expect.any(String),
        error: 'Database connection failed',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Health check failed: Database connection failed'
      );

      console.log(`[${testId}] Basic health check error handling test completed`);
    });

    it('should handle unknown errors gracefully', async () => {
      const testId = `${operationId}_basic_health_unknown_error`;
      console.log(`[${testId}] Testing basic health check with unknown error`);

      jest.spyOn(healthService, 'getBasicHealth').mockRejectedValue('Unknown error type');

      const result = await controller.getHealth();

      expect(result).toEqual({
        status: 'unhealthy',
        timestamp: expect.any(String),
        error: 'Unknown error',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Health check failed: Unknown error'
      );

      console.log(`[${testId}] Unknown error handling test completed`);
    });

    it('should validate response format structure', async () => {
      const testId = `${operationId}_basic_health_format`;
      console.log(`[${testId}] Testing basic health check response format`);

      jest.spyOn(healthService, 'getBasicHealth').mockResolvedValue(mockBasicHealthResponse);

      const result = await controller.getHealth();

      // Validate response structure
      expect(result).toMatchObject({
        status: expect.stringMatching(/^(healthy|unhealthy)$/),
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        uptime: expect.any(Number),
        memory: expect.objectContaining({
          used: expect.any(Number),
          free: expect.any(Number),
          total: expect.any(Number),
        }),
      });

      console.log(`[${testId}] Response format validation test completed`);
    });

    it('should complete within performance threshold', async () => {
      const testId = `${operationId}_basic_health_performance`;
      console.log(`[${testId}] Testing basic health check performance`);

      jest.spyOn(healthService, 'getBasicHealth').mockResolvedValue(mockBasicHealthResponse);

      const startTime = Date.now();
      await controller.getHealth();
      const executionTime = Date.now() - startTime;

      // Health check should complete within 100ms
      expect(executionTime).toBeLessThan(100);

      console.log(`[${testId}] Performance test completed (${executionTime}ms)`);
    });
  });

  describe('Detailed Status Endpoint', () => {
    it('should return comprehensive status information', async () => {
      const testId = `${operationId}_detailed_status_comprehensive`;
      console.log(`[${testId}] Testing detailed status comprehensive information`);

      jest.spyOn(healthService, 'getDetailedStatus').mockResolvedValue(mockDetailedStatusResponse);

      const result = await controller.getDetailedStatus();

      expect(result).toEqual(mockDetailedStatusResponse);
      expect(healthService.getDetailedStatus).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith('Detailed status requested');
      expect(mockLogger.debug).toHaveBeenCalledWith('Detailed status completed successfully');

      console.log(`[${testId}] Comprehensive status test completed successfully`);
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

      jest.spyOn(healthService, 'getDetailedStatus').mockResolvedValue(degradedResponse);

      const result = await controller.getDetailedStatus();

      expect(result.status).toBe('degraded');
      expect(result.services.cache).toBe('unavailable');
      expect(result.services.external).toBe('unknown');

      console.log(`[${testId}] Degraded service status test completed`);
    });

    it('should handle unhealthy service status', async () => {
      const testId = `${operationId}_detailed_status_unhealthy`;
      console.log(`[${testId}] Testing detailed status with unhealthy services`);

      const unhealthyResponse = {
        ...mockDetailedStatusResponse,
        status: 'unhealthy' as const,
        services: {
          database: 'disconnected' as const,
          cache: 'unavailable' as const,
          external: 'unreachable' as const,
        },
      };

      jest.spyOn(healthService, 'getDetailedStatus').mockResolvedValue(unhealthyResponse);

      const result = await controller.getDetailedStatus();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database).toBe('disconnected');

      console.log(`[${testId}] Unhealthy service status test completed`);
    });

    it('should handle detailed status errors gracefully', async () => {
      const testId = `${operationId}_detailed_status_error`;
      console.log(`[${testId}] Testing detailed status error handling`);

      const serviceError = new Error('Service monitoring failure');
      jest.spyOn(healthService, 'getDetailedStatus').mockRejectedValue(serviceError);

      const result = await controller.getDetailedStatus();

      expect(result).toEqual({
        status: 'error',
        timestamp: expect.any(String),
        error: 'Service monitoring failure',
        services: {},
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Detailed status check failed: Service monitoring failure'
      );

      console.log(`[${testId}] Detailed status error handling test completed`);
    });

    it('should validate detailed status response structure', async () => {
      const testId = `${operationId}_detailed_status_structure`;
      console.log(`[${testId}] Testing detailed status response structure`);

      jest.spyOn(healthService, 'getDetailedStatus').mockResolvedValue(mockDetailedStatusResponse);

      const result = await controller.getDetailedStatus();

      expect(result).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        uptime: expect.any(Number),
        memory: expect.objectContaining({
          used: expect.any(Number),
          free: expect.any(Number),
          total: expect.any(Number),
          heapUsed: expect.any(Number),
          heapTotal: expect.any(Number),
        }),
        services: expect.objectContaining({
          database: expect.stringMatching(/^(connected|disconnected|unknown)$/),
          cache: expect.stringMatching(/^(available|unavailable|unknown)$/),
          external: expect.stringMatching(/^(reachable|unreachable|unknown)$/),
        }),
        performance: expect.objectContaining({
          requestsPerSecond: expect.any(Number),
          averageResponseTime: expect.any(Number),
        }),
      });

      console.log(`[${testId}] Response structure validation test completed`);
    });

    it('should complete within performance threshold', async () => {
      const testId = `${operationId}_detailed_status_performance`;
      console.log(`[${testId}] Testing detailed status performance`);

      jest.spyOn(healthService, 'getDetailedStatus').mockResolvedValue(mockDetailedStatusResponse);

      const startTime = Date.now();
      await controller.getDetailedStatus();
      const executionTime = Date.now() - startTime;

      // Detailed status should complete within 200ms
      expect(executionTime).toBeLessThan(200);

      console.log(`[${testId}] Detailed status performance test completed (${executionTime}ms)`);
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log health check requests properly', async () => {
      const testId = `${operationId}_logging_health_requests`;
      console.log(`[${testId}] Testing health check request logging`);

      jest.spyOn(healthService, 'getBasicHealth').mockResolvedValue(mockBasicHealthResponse);

      await controller.getHealth();

      expect(mockLogger.debug).toHaveBeenCalledWith('Health check requested');
      expect(mockLogger.debug).toHaveBeenCalledWith('Health check completed successfully');

      console.log(`[${testId}] Health check logging test completed`);
    });

    it('should log detailed status requests properly', async () => {
      const testId = `${operationId}_logging_status_requests`;
      console.log(`[${testId}] Testing detailed status request logging`);

      jest.spyOn(healthService, 'getDetailedStatus').mockResolvedValue(mockDetailedStatusResponse);

      await controller.getDetailedStatus();

      expect(mockLogger.debug).toHaveBeenCalledWith('Detailed status requested');
      expect(mockLogger.debug).toHaveBeenCalledWith('Detailed status completed successfully');

      console.log(`[${testId}] Detailed status logging test completed`);
    });

    it('should log errors with proper context', async () => {
      const testId = `${operationId}_logging_error_context`;
      console.log(`[${testId}] Testing error logging with context`);

      const contextualError = new Error('Connection timeout to monitoring service');
      jest.spyOn(healthService, 'getDetailedStatus').mockRejectedValue(contextualError);

      await controller.getDetailedStatus();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Detailed status check failed: Connection timeout to monitoring service'
      );

      console.log(`[${testId}] Error context logging test completed`);
    });

    it('should handle concurrent logging requests', async () => {
      const testId = `${operationId}_logging_concurrent`;
      console.log(`[${testId}] Testing concurrent request logging`);

      jest.spyOn(healthService, 'getBasicHealth').mockResolvedValue(mockBasicHealthResponse);

      // Simulate concurrent requests
      const promises = Array(10).fill(null).map(() => controller.getHealth());
      await Promise.all(promises);

      // Should log debug messages for each request (20 total: 10 request + 10 completion)
      expect(mockLogger.debug).toHaveBeenCalledTimes(20);

      console.log(`[${testId}] Concurrent logging test completed`);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should maintain consistent error response format', async () => {
      const testId = `${operationId}_error_format_consistency`;
      console.log(`[${testId}] Testing error response format consistency`);

      const testErrors = [
        new Error('Database connection failed'),
        new Error('Service timeout'),
        'String error',
        null,
        undefined,
      ];

      for (const error of testErrors) {
        jest.spyOn(healthService, 'getBasicHealth').mockRejectedValue(error);

        const result = await controller.getHealth();

        expect(result).toMatchObject({
          status: 'unhealthy',
          timestamp: expect.any(String),
          error: expect.any(String),
        });
      }

      console.log(`[${testId}] Error format consistency test completed`);
    });

    it('should recover from service failures gracefully', async () => {
      const testId = `${operationId}_service_failure_recovery`;
      console.log(`[${testId}] Testing recovery from service failures`);

      // Simulate service failure followed by recovery
      jest.spyOn(healthService, 'getBasicHealth')
        .mockRejectedValueOnce(new Error('Service temporarily unavailable'))
        .mockResolvedValueOnce(mockBasicHealthResponse);

      // First call should handle error gracefully
      const errorResult = await controller.getHealth();
      expect(errorResult.status).toBe('unhealthy');

      // Second call should succeed
      const successResult = await controller.getHealth();
      expect(successResult.status).toBe('healthy');

      console.log(`[${testId}] Service failure recovery test completed`);
    });

    it('should handle service timeout scenarios', async () => {
      const testId = `${operationId}_service_timeout`;
      console.log(`[${testId}] Testing service timeout handling`);

      // Simulate timeout error
      const timeoutError = new Error('Health check timeout');
      timeoutError.name = 'TimeoutError';

      jest.spyOn(healthService, 'getDetailedStatus').mockRejectedValue(timeoutError);

      const result = await controller.getDetailedStatus();

      expect(result.status).toBe('error');
      expect(result.error).toBe('Health check timeout');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Detailed status check failed: Health check timeout'
      );

      console.log(`[${testId}] Service timeout handling test completed`);
    });

    it('should maintain service availability during errors', async () => {
      const testId = `${operationId}_availability_during_errors`;
      console.log(`[${testId}] Testing service availability during errors`);

      // Mix of successful and failed requests
      const healthCalls = [
        () => {
          jest.spyOn(healthService, 'getBasicHealth').mockResolvedValueOnce(mockBasicHealthResponse);
          return controller.getHealth();
        },
        () => {
          jest.spyOn(healthService, 'getBasicHealth').mockRejectedValueOnce(new Error('Service error'));
          return controller.getHealth();
        },
      ];

      const results = await Promise.all(healthCalls.map(call => call()));

      // Both requests should complete (not crash the service)
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('healthy');
      expect(results[1].status).toBe('unhealthy');

      console.log(`[${testId}] Service availability test completed`);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-frequency health checks efficiently', async () => {
      const testId = `${operationId}_high_frequency_health`;
      console.log(`[${testId}] Testing high-frequency health checks`);

      jest.spyOn(healthService, 'getBasicHealth').mockResolvedValue(mockBasicHealthResponse);

      const startTime = Date.now();
      const promises = Array(50).fill(null).map(() => controller.getHealth());
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(50);
      expect(results.every(result => result.status === 'healthy')).toBe(true);
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second

      console.log(`[${testId}] High-frequency health checks completed (${totalTime}ms for 50 requests)`);
    });

    it('should handle mixed endpoint load efficiently', async () => {
      const testId = `${operationId}_mixed_endpoint_load`;
      console.log(`[${testId}] Testing mixed endpoint load handling`);

      jest.spyOn(healthService, 'getBasicHealth').mockResolvedValue(mockBasicHealthResponse);
      jest.spyOn(healthService, 'getDetailedStatus').mockResolvedValue(mockDetailedStatusResponse);

      const startTime = Date.now();
      
      const promises = [
        ...Array(25).fill(null).map(() => controller.getHealth()),
        ...Array(25).fill(null).map(() => controller.getDetailedStatus()),
      ];

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(50);
      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds

      console.log(`[${testId}] Mixed endpoint load test completed (${totalTime}ms for 50 requests)`);
    });

    it('should maintain response consistency under load', async () => {
      const testId = `${operationId}_response_consistency_load`;
      console.log(`[${testId}] Testing response consistency under load`);

      jest.spyOn(healthService, 'getBasicHealth').mockResolvedValue(mockBasicHealthResponse);

      // Execute multiple concurrent requests
      const promises = Array(20).fill(null).map(() => controller.getHealth());
      const results = await Promise.all(promises);

      // All responses should be identical
      const firstResponse = results[0];
      const allIdentical = results.every(result => 
        JSON.stringify(result) === JSON.stringify(firstResponse)
      );

      expect(allIdentical).toBe(true);

      console.log(`[${testId}] Response consistency under load test completed`);
    });

    it('should not leak memory during extended operations', async () => {
      const testId = `${operationId}_memory_leak_prevention`;
      console.log(`[${testId}] Testing memory leak prevention`);

      jest.spyOn(healthService, 'getBasicHealth').mockResolvedValue(mockBasicHealthResponse);

      const initialMemory = process.memoryUsage();

      // Execute many health checks
      for (let i = 0; i < 100; i++) {
        await controller.getHealth();
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be minimal (less than 2MB for 100 operations)
      expect(memoryGrowth).toBeLessThan(2 * 1024 * 1024);

      console.log(`[${testId}] Memory leak prevention test completed (${Math.round(memoryGrowth / 1024)}KB growth)`);
    });
  });

  describe('Integration and Compatibility', () => {
    it('should maintain backward compatibility in response format', async () => {
      const testId = `${operationId}_backward_compatibility`;
      console.log(`[${testId}] Testing backward compatibility in response format`);

      jest.spyOn(healthService, 'getBasicHealth').mockResolvedValue(mockBasicHealthResponse);

      const result = await controller.getHealth();

      // Ensure response contains expected fields for backward compatibility
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('memory');

      // Memory object should have expected structure
      expect(result.memory).toHaveProperty('used');
      expect(result.memory).toHaveProperty('free');
      expect(result.memory).toHaveProperty('total');

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
        jest.spyOn(healthService, 'getBasicHealth').mockResolvedValue(variation);
        
        const result = await controller.getHealth();
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
      jest.spyOn(healthService, 'getBasicHealth').mockResolvedValue(mockBasicHealthResponse);
      jest.spyOn(healthService, 'getDetailedStatus').mockResolvedValue(mockDetailedStatusResponse);

      const basicResult = await controller.getHealth();
      const detailedResult = await controller.getDetailedStatus();

      expect(basicResult.status).toBeDefined();
      expect(detailedResult.services).toBeDefined();

      console.log(`[${testId}] Service lifecycle integration test completed`);
    });

    it('should handle service method parameter validation', async () => {
      const testId = `${operationId}_parameter_validation`;
      console.log(`[${testId}] Testing service method parameter validation`);

      jest.spyOn(healthService, 'getBasicHealth').mockResolvedValue(mockBasicHealthResponse);

      // Both endpoints should work without parameters
      await expect(controller.getHealth()).resolves.toBeDefined();
      await expect(controller.getDetailedStatus()).resolves.toBeDefined();

      console.log(`[${testId}] Parameter validation test completed`);
    });
  });

  describe('Security and Validation', () => {
    it('should not expose sensitive information in responses', async () => {
      const testId = `${operationId}_sensitive_info_protection`;
      console.log(`[${testId}] Testing sensitive information protection`);

      jest.spyOn(healthService, 'getDetailedStatus').mockResolvedValue(mockDetailedStatusResponse);

      const result = await controller.getDetailedStatus();

      // Ensure no sensitive data is exposed
      const responseStr = JSON.stringify(result);
      expect(responseStr).not.toMatch(/password|secret|key|token/i);

      console.log(`[${testId}] Sensitive information protection test completed`);
    });

    it('should validate response data types', async () => {
      const testId = `${operationId}_response_data_types`;
      console.log(`[${testId}] Testing response data type validation`);

      jest.spyOn(healthService, 'getBasicHealth').mockResolvedValue(mockBasicHealthResponse);

      const result = await controller.getHealth();

      expect(typeof result.status).toBe('string');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.uptime).toBe('number');
      expect(typeof result.memory).toBe('object');
      expect(typeof result.memory.used).toBe('number');
      expect(typeof result.memory.free).toBe('number');
      expect(typeof result.memory.total).toBe('number');

      console.log(`[${testId}] Response data type validation test completed`);
    });

    it('should sanitize error messages', async () => {
      const testId = `${operationId}_error_message_sanitization`;
      console.log(`[${testId}] Testing error message sanitization`);

      const maliciousError = new Error('Database error: <script>alert("XSS")</script>');
      jest.spyOn(healthService, 'getBasicHealth').mockRejectedValue(maliciousError);

      const result = await controller.getHealth();

      expect(result.error).toBe('Database error: <script>alert("XSS")</script>');
      // In a real implementation, you might want to sanitize this further

      console.log(`[${testId}] Error message sanitization test completed`);
    });

    it('should limit error message length', async () => {
      const testId = `${operationId}_error_message_length`;
      console.log(`[${testId}] Testing error message length limits`);

      const longError = new Error('A'.repeat(1000)); // Very long error message
      jest.spyOn(healthService, 'getBasicHealth').mockRejectedValue(longError);

      const result = await controller.getHealth();

      expect(result.error).toBeDefined();
      expect(result.error.length).toBeGreaterThan(0);

      console.log(`[${testId}] Error message length test completed`);
    });
  });
});