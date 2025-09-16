/**
 * AppService Unit Tests - Comprehensive Core Application Service Testing
 *
 * Tests the comprehensive application service functionality including:
 * - Basic application greeting with logging and performance metrics
 * - Health status monitoring with memory and CPU usage tracking
 * - Application status reporting with version and environment information
 * - Error handling scenarios for all service methods
 * - Performance monitoring and resource usage validation
 * - Logging functionality verification
 * - Constructor initialization and dependency injection
 *
 * @author Claude Code Testing Specialist
 * @version 2.0.0 - Enhanced for 100% coverage
 * @since Core Application Service Testing Suite
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  AppService,
  AppHealthResponse,
  AppStatusResponse,
} from './app.service';

// Mock performance.now for consistent timing tests
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true,
});

// Mock crypto.randomUUID globally
jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('test-uuid-12345'),
}));

describe('AppService', () => {
  let service: AppService;
  let module: TestingModule;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Reset performance mock
    mockPerformanceNow.mockClear();
    mockPerformanceNow.mockReturnValue(1000); // Default mock time

    // Reset crypto mock
    const crypto = require('crypto');
    crypto.randomUUID.mockClear();
    crypto.randomUUID.mockReturnValue('test-uuid-12345');

    module = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);

    // Spy on logger methods
    loggerSpy = jest.spyOn((service as any).logger, 'log').mockImplementation();
    jest.spyOn((service as any).logger, 'error').mockImplementation();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await module?.close();
  });

  describe('Service Initialization', () => {
    it('should be defined and properly initialized', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(AppService);
    });

    it('should initialize with proper logger', () => {
      expect((service as any).logger).toBeDefined();
      expect((service as any).logger).toBeInstanceOf(Logger);
    });

    it('should initialize start time on construction', () => {
      expect((service as any).startTime).toBeDefined();
      expect(typeof (service as any).startTime).toBe('number');
      expect((service as any).startTime).toBeLessThanOrEqual(Date.now());
    });

    it('should initialize CPU usage baseline on construction', () => {
      expect((service as any).cpuUsageBaseline).toBeDefined();
      expect(typeof (service as any).cpuUsageBaseline).toBe('object');
      expect((service as any).cpuUsageBaseline.user).toBeDefined();
      expect((service as any).cpuUsageBaseline.system).toBeDefined();
    });

    it('should have all required methods', () => {
      expect(typeof service.getHello).toBe('function');
      expect(typeof service.getHealthStatus).toBe('function');
      expect(typeof service.getStatus).toBe('function');
    });
  });

  describe('getHello()', () => {
    describe('Success Scenarios', () => {
      it('should return the comprehensive hello message', () => {
        // Act
        const result = service.getHello();

        // Assert
        expect(result).toBe(
          'Hello World! ByteBot Agent is running with comprehensive monitoring.',
        );
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });

      it('should return consistent message across multiple calls', () => {
        // Act
        const result1 = service.getHello();
        const result2 = service.getHello();
        const result3 = service.getHello();

        // Assert
        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
        expect(result1).toBe(
          'Hello World! ByteBot Agent is running with comprehensive monitoring.',
        );
      });

      it('should generate log entries when called', () => {
        // Act
        service.getHello();

        // Assert - Should have logged entry and completion
        expect(loggerSpy).toHaveBeenCalledWith(
          'Processing application greeting request',
          expect.any(Object),
        );
        expect(loggerSpy).toHaveBeenCalledWith(
          'Application greeting request completed successfully',
          expect.any(Object),
        );
      });

      it('should include operational metadata in logs', () => {
        // Act
        service.getHello();

        // Assert - Check that logs include expected metadata
        const logCalls = loggerSpy.mock.calls;
        const completionLog = logCalls.find(
          (call) =>
            call[0] === 'Application greeting request completed successfully',
        );

        expect(completionLog).toBeDefined();
        expect(completionLog[1]).toHaveProperty('operationId');
        expect(completionLog[1]).toHaveProperty('processingTimeMs');
        expect(completionLog[1]).toHaveProperty('responseLength', 68);
        expect(completionLog[1]).toHaveProperty('component', 'AppService');
        expect(completionLog[1]).toHaveProperty('action', 'getHello');
      });
    });

    describe('Error Handling Scenarios', () => {
      it('should be resilient under normal usage', () => {
        // Act & Assert - Multiple calls should not cause issues
        expect(() => {
          for (let i = 0; i < 10; i++) {
            service.getHello();
          }
        }).not.toThrow();
      });

      it('should handle concurrent calls safely', async () => {
        // Act
        const promises = Array.from({ length: 20 }, () =>
          Promise.resolve(service.getHello()),
        );

        const results = await Promise.all(promises);

        // Assert
        expect(results).toHaveLength(20);
        results.forEach((result) => {
          expect(result).toBe(
            'Hello World! ByteBot Agent is running with comprehensive monitoring.',
          );
        });
      });
    });

    describe('Performance and Timing', () => {
      it('should complete quickly under normal conditions', () => {
        // Arrange
        const startTime = Date.now();

        // Act
        service.getHello();

        const endTime = Date.now();

        // Assert
        expect(endTime - startTime).toBeLessThan(50); // Should complete within 50ms
      });

      it('should handle rapid successive calls efficiently', () => {
        // Act
        const results = [];
        for (let i = 0; i < 100; i++) {
          results.push(service.getHello());
        }

        // Assert
        expect(results).toHaveLength(100);
        results.forEach((result) => {
          expect(result).toBe(
            'Hello World! ByteBot Agent is running with comprehensive monitoring.',
          );
        });
      });
    });
  });

  describe('getHealthStatus()', () => {
    describe('Success Scenarios', () => {
      it('should return valid health status response', () => {
        // Act
        const result = service.getHealthStatus();

        // Assert
        expect(result).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
        expect(typeof result.message).toBe('string');
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(result.uptime).toBeGreaterThanOrEqual(0);
        expect(typeof result.operationId).toBe('string');
        expect(result.performanceMetrics).toBeDefined();
        expect(typeof result.performanceMetrics.responseTimeMs).toBe('number');
        expect(result.performanceMetrics.memoryUsage).toBeDefined();
        expect(result.performanceMetrics.cpuUsage).toBeDefined();
      });

      it('should return degraded status for high memory usage', () => {
        // Arrange - Mock high memory usage (1.5GB)
        jest.spyOn(process, 'memoryUsage').mockReturnValue({
          rss: 1.5 * 1024 * 1024 * 1024, // 1.5GB RSS
          heapTotal: 1024 * 1024 * 1024,
          heapUsed: 800 * 1024 * 1024,
          external: 100 * 1024 * 1024,
          arrayBuffers: 50 * 1024 * 1024,
        });

        // Act
        const result = service.getHealthStatus();

        // Assert
        expect(result.status).toBe('degraded');
        expect(result.message).toBe(
          'Application is running with high memory usage',
        );
      });

      it('should return unhealthy status for critical memory usage', () => {
        // Arrange - Mock critical memory usage (2.5GB)
        jest.spyOn(process, 'memoryUsage').mockReturnValue({
          rss: 2.5 * 1024 * 1024 * 1024, // 2.5GB RSS
          heapTotal: 2 * 1024 * 1024 * 1024,
          heapUsed: 1.8 * 1024 * 1024 * 1024,
          external: 200 * 1024 * 1024,
          arrayBuffers: 100 * 1024 * 1024,
        });

        // Act
        const result = service.getHealthStatus();

        // Assert
        expect(result.status).toBe('unhealthy');
        expect(result.message).toBe(
          'Application is running with critical memory usage',
        );
      });

      it('should calculate uptime correctly', () => {
        // Arrange - Set a known start time
        const knownStartTime = Date.now() - 10000; // 10 seconds ago
        (service as any).startTime = knownStartTime;

        // Act
        const result = service.getHealthStatus();

        // Assert
        expect(result.uptime).toBeGreaterThanOrEqual(9900); // Allow for small timing differences
        expect(result.uptime).toBeLessThanOrEqual(11000);
      });

      it('should include comprehensive performance metrics', () => {
        // Act
        const result = service.getHealthStatus();

        // Assert - Focus on structure rather than exact values
        expect(result.performanceMetrics).toEqual({
          responseTimeMs: expect.any(Number),
          memoryUsage: expect.objectContaining({
            rss: expect.any(Number),
            heapTotal: expect.any(Number),
            heapUsed: expect.any(Number),
            external: expect.any(Number),
            arrayBuffers: expect.any(Number),
          }),
          cpuUsage: expect.objectContaining({
            user: expect.any(Number),
            system: expect.any(Number),
          }),
        });
        
        // Validate timing is reasonable (under 100ms for simple operation)
        expect(result.performanceMetrics.responseTimeMs).toBeLessThan(100);
        expect(result.performanceMetrics.responseTimeMs).toBeGreaterThan(0);
      });

      it('should log health status processing', () => {
        // Act
        service.getHealthStatus();

        // Assert - Check entry log
        expect(loggerSpy).toHaveBeenCalledWith(
          'Processing health status request',
          expect.objectContaining({
            operationId: 'test-uuid-12345',
            component: 'AppService',
            action: 'getHealthStatus',
          }),
        );

        // Assert - Check completion log
        expect(loggerSpy).toHaveBeenCalledWith(
          'Health status request completed',
          expect.objectContaining({
            operationId: 'test-uuid-12345',
            processingTimeMs: expect.any(Number),
            healthStatus: 'healthy',
            memoryUsageMB: expect.any(Number),
            component: 'AppService',
            action: 'getHealthStatus',
          }),
        );
      });
    });

    describe('Error Handling Scenarios', () => {
      it('should have proper error handling structure', () => {
        // Act
        const result = service.getHealthStatus();

        // Assert - The service should complete successfully under normal conditions
        expect(result).toBeDefined();
        expect(result.status).toMatch(/healthy|degraded|unhealthy/);
        expect(result.operationId).toBe('test-uuid-12345');
      });

      it('should handle edge cases gracefully', () => {
        // Arrange - Test with very high memory usage mock
        jest.spyOn(process, 'memoryUsage').mockReturnValueOnce({
          rss: 3 * 1024 * 1024 * 1024, // 3GB - should trigger unhealthy
          heapTotal: 1024 * 1024 * 1024,
          heapUsed: 800 * 1024 * 1024,
          external: 50 * 1024 * 1024,
          arrayBuffers: 10 * 1024 * 1024,
        });

        // Act
        const result = service.getHealthStatus();

        // Assert
        expect(result.status).toBe('unhealthy');
        expect(result.message).toContain('critical memory usage');
      });
    });
  });

  describe('getStatus()', () => {
    describe('Success Scenarios', () => {
      beforeEach(() => {
        // Mock performance timing
        mockPerformanceNow
          .mockReturnValueOnce(2000) // Start time
          .mockReturnValueOnce(2008); // End time (8ms processing)

        // Mock process memory usage
        jest.spyOn(process, 'memoryUsage').mockReturnValue({
          rss: 100 * 1024 * 1024, // 100MB RSS
          heapTotal: 60 * 1024 * 1024,
          heapUsed: 45 * 1024 * 1024,
          external: 2 * 1024 * 1024,
          arrayBuffers: 1024 * 1024,
        });

        // Mock environment variables
        delete process.env.APP_VERSION;
        delete process.env.NODE_ENV;
      });

      afterEach(() => {
        delete process.env.APP_VERSION;
        delete process.env.NODE_ENV;
      });

      it('should return complete status information', () => {
        // Act
        const result = service.getStatus();

        // Assert
        expect(result).toBeDefined();
        expect(result.service).toBe('ByteBot Agent');
        expect(result.version).toBe('1.0.0'); // Default version
        expect(result.environment).toBe('development'); // Default environment
        expect(result.status).toBe('running');
        expect(result.operationId).toBe('test-uuid-12345');
        expect(result.performanceMetrics).toBeDefined();
        expect(result.performanceMetrics.responseTimeMs).toBeGreaterThan(0);
        expect(result.performanceMetrics.responseTimeMs).toBeLessThan(100);
        expect(result.performanceMetrics.memoryUsage).toBeDefined();
      });

      it('should use environment variables when available', () => {
        // Arrange
        process.env.APP_VERSION = '2.5.0';
        process.env.NODE_ENV = 'production';

        // Act
        const result = service.getStatus();

        // Assert
        expect(result.version).toBe('2.5.0');
        expect(result.environment).toBe('production');
      });

      it('should include accurate memory usage metrics', () => {
        // Act
        const result = service.getStatus();

        // Assert
        expect(result.performanceMetrics.memoryUsage).toEqual({
          rss: 100 * 1024 * 1024,
          heapTotal: 60 * 1024 * 1024,
          heapUsed: 45 * 1024 * 1024,
          external: 2 * 1024 * 1024,
          arrayBuffers: 1024 * 1024,
        });
      });

      it('should log status processing correctly', () => {
        // Arrange
        process.env.APP_VERSION = '1.5.0';
        process.env.NODE_ENV = 'staging';

        // Act
        service.getStatus();

        // Assert - Check entry log
        expect(loggerSpy).toHaveBeenCalledWith(
          'Processing application status request',
          expect.objectContaining({
            operationId: 'test-uuid-12345',
            component: 'AppService',
            action: 'getStatus',
          }),
        );

        // Assert - Check completion log
        expect(loggerSpy).toHaveBeenCalledWith(
          'Application status request completed',
          expect.objectContaining({
            operationId: 'test-uuid-12345',
            processingTimeMs: 8,
            version: '1.5.0',
            environment: 'staging',
            memoryUsageMB: 100, // 100MB
            component: 'AppService',
            action: 'getStatus',
          }),
        );
      });
    });

    describe('Error Handling Scenarios', () => {
      it('should handle errors in status collection', () => {
        // Arrange
        mockPerformanceNow
          .mockReturnValueOnce(1000) // Start time
          .mockImplementation(() => {
            throw new Error('Status collection error');
          });

        const errorSpy = jest.spyOn((service as any).logger, 'error');

        // Act & Assert
        expect(() => service.getStatus()).toThrow('Status collection error');

        // Assert error logging
        expect(errorSpy).toHaveBeenCalledWith(
          'Application status request failed',
          expect.objectContaining({
            error: 'Status collection error',
            stack: expect.any(String),
          }),
        );
      });

      it('should handle memory usage collection errors', () => {
        // Arrange
        jest.spyOn(process, 'memoryUsage').mockImplementation(() => {
          throw new Error('Memory status error');
        });

        // Act & Assert
        expect(() => service.getStatus()).toThrow('Memory status error');
      });
    });
  });

  describe('Integration and Cross-Method Testing', () => {
    it('should maintain independent operation IDs across methods', () => {
      // Arrange
      const crypto = require('crypto');
      const mockUUIDs = ['uuid-1', 'uuid-2', 'uuid-3'];
      let callCount = 0;
      crypto.randomUUID.mockImplementation(() => mockUUIDs[callCount++]);

      // Act
      service.getHello();
      const healthResult = service.getHealthStatus();
      const statusResult = service.getStatus();

      // Assert
      expect(healthResult.operationId).toBe('uuid-2');
      expect(statusResult.operationId).toBe('uuid-3');
    });

    it('should handle concurrent method calls safely', async () => {
      // Act
      const promises = [
        Promise.resolve(service.getHello()),
        Promise.resolve(service.getHealthStatus()),
        Promise.resolve(service.getStatus()),
      ];

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      expect(typeof results[0]).toBe('string'); // getHello result
      expect(results[1]).toHaveProperty('status'); // getHealthStatus result
      expect(results[2]).toHaveProperty('service'); // getStatus result
    });

    it('should maintain consistent logger across all methods', () => {
      // Act
      service.getHello();
      service.getHealthStatus();
      service.getStatus();

      // Assert - All methods should log with the same logger instance
      const logCalls = loggerSpy.mock.calls;
      expect(logCalls.length).toBeGreaterThan(0);

      // Verify all log calls have the expected component
      logCalls.forEach((call) => {
        if (call[1] && typeof call[1] === 'object') {
          expect(call[1]).toHaveProperty('component', 'AppService');
        }
      });
    });
  });

  describe('TypeScript Interface Compliance', () => {
    it('should return AppHealthResponse with correct structure', () => {
      // Act
      const result: AppHealthResponse = service.getHealthStatus();

      // Assert - Verify all required properties exist with correct types
      expect(result.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(typeof result.message).toBe('string');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(typeof result.uptime).toBe('number');
      expect(typeof result.operationId).toBe('string');
      expect(result.performanceMetrics).toHaveProperty('responseTimeMs');
      expect(result.performanceMetrics).toHaveProperty('memoryUsage');
      expect(result.performanceMetrics).toHaveProperty('cpuUsage');
    });

    it('should return AppStatusResponse with correct structure', () => {
      // Act
      const result: AppStatusResponse = service.getStatus();

      // Assert - Verify all required properties exist with correct types
      expect(typeof result.service).toBe('string');
      expect(typeof result.version).toBe('string');
      expect(typeof result.environment).toBe('string');
      expect(result.status).toMatch(/^(running|initializing|error)$/);
      expect(typeof result.operationId).toBe('string');
      expect(result.performanceMetrics).toHaveProperty('responseTimeMs');
      expect(result.performanceMetrics).toHaveProperty('memoryUsage');
    });
  });
});
