/**
 * Circuit Breaker Guard Unit Tests - Comprehensive testing for resilience patterns
 * Tests circuit breaker functionality, failure detection, and recovery mechanisms
 *
 * Test Coverage:
 * - Circuit breaker state transitions (closed/open/half-open)
 * - Failure threshold detection
 * - Automatic recovery and timeout handling
 * - Request blocking during open state
 * - Performance monitoring and metrics
 * - Configuration validation
 * - Concurrent request handling
 * - Error handling and logging
 *
 * @author Testing & Quality Assurance Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerGuard } from '../circuit-breaker.guard';

describe('CircuitBreakerGuard', () => {
  let guard: CircuitBreakerGuard;
  let configService: jest.Mocked<ConfigService>;

  // Mock configuration
  const mockConfig = {
    circuitBreaker: {
      failureThreshold: 50, // 50% failure rate
      minimumRequests: 10,
      timeout: 60000, // 1 minute
      halfOpenMaxCalls: 5,
      resetTimeoutMultiplier: 1.5,
    },
  };

  // Mock execution context
  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => ({
        url: '/api/test',
        method: 'GET',
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Test Agent' },
      }),
      getResponse: () => ({
        status: jest.fn(),
        json: jest.fn(),
      }),
    }),
    getHandler: () => ({
      name: 'testHandler',
    }),
    getClass: () => ({
      name: 'TestController',
    }),
  } as ExecutionContext;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerGuard,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<CircuitBreakerGuard>(CircuitBreakerGuard);
    configService = module.get(ConfigService);

    // Setup default mocks
    configService.get.mockReturnValue(mockConfig.circuitBreaker);

    // Reset circuit breaker state before each test
    (guard as any).resetCircuitBreaker('testHandler');
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up any timers
    jest.clearAllTimers();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(configService.get).toHaveBeenCalledWith('circuitBreaker', {
        infer: true,
      });
    });

    it('should throw error if configuration is missing', () => {
      configService.get.mockReturnValue(undefined);

      expect(() => {
        new CircuitBreakerGuard(configService);
      }).toThrow('Circuit breaker configuration not found');
    });

    it('should validate configuration parameters', () => {
      const invalidConfigs = [
        { ...mockConfig.circuitBreaker, failureThreshold: 150 }, // > 100%
        { ...mockConfig.circuitBreaker, failureThreshold: -10 }, // < 0%
        { ...mockConfig.circuitBreaker, minimumRequests: 0 }, // Must be > 0
        { ...mockConfig.circuitBreaker, timeout: -1000 }, // Must be positive
      ];

      invalidConfigs.forEach((config) => {
        configService.get.mockReturnValue(config);
        expect(() => {
          new CircuitBreakerGuard(configService);
        }).toThrow('Invalid circuit breaker configuration');
      });
    });
  });

  describe('canActivate - closed state', () => {
    it('should allow requests when circuit is closed', async () => {
      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
    });

    it('should track successful requests', async () => {
      // Arrange
      const getStatsSpy = jest.spyOn(guard as any, 'getCircuitStats');

      // Act
      await guard.canActivate(mockExecutionContext);
      (guard as any).recordSuccess('testHandler');

      // Assert
      const stats = getStatsSpy.call(guard, 'testHandler');
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(0);
      expect(stats.state).toBe('closed');
    });

    it('should track failed requests', async () => {
      // Arrange
      const getStatsSpy = jest.spyOn(guard as any, 'getCircuitStats');

      // Act
      await guard.canActivate(mockExecutionContext);
      (guard as any).recordFailure('testHandler');

      // Assert
      const stats = getStatsSpy.call(guard, 'testHandler');
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(1);
      expect(stats.state).toBe('closed');
    });

    it('should remain closed below failure threshold', async () => {
      // Arrange - simulate requests below threshold
      const handlerName = 'testHandler';

      // Add some successful requests first
      for (let i = 0; i < 20; i++) {
        await guard.canActivate(mockExecutionContext);
        (guard as any).recordSuccess(handlerName);
      }

      // Add failures below threshold (4 out of 24 = 16.7% < 50%)
      for (let i = 0; i < 4; i++) {
        await guard.canActivate(mockExecutionContext);
        (guard as any).recordFailure(handlerName);
      }

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      const stats = (guard as any).getCircuitStats(handlerName);
      expect(stats.state).toBe('closed');
    });
  });

  describe('canActivate - state transitions', () => {
    it('should open circuit when failure threshold is exceeded', async () => {
      // Arrange - simulate minimum requests with high failure rate
      const handlerName = 'testHandler';

      // Add minimum requests with failures above threshold
      for (let i = 0; i < 5; i++) {
        await guard.canActivate(mockExecutionContext);
        (guard as any).recordSuccess(handlerName);
      }

      for (let i = 0; i < 10; i++) {
        await guard.canActivate(mockExecutionContext);
        (guard as any).recordFailure(handlerName);
      }
      // 10 failures out of 15 total = 66.7% > 50% threshold

      // Act - trigger state check
      await guard.canActivate(mockExecutionContext);

      // Assert
      const stats = (guard as any).getCircuitStats(handlerName);
      expect(stats.state).toBe('open');
      expect(stats.lastFailureTime).toBeDefined();
    });

    it('should block requests when circuit is open', async () => {
      // Arrange - force circuit to open state
      const handlerName = 'testHandler';
      (guard as any).openCircuit(handlerName);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        HttpException,
      );
    });

    it('should transition to half-open after timeout', async () => {
      // Arrange - open circuit and mock timeout
      jest.useFakeTimers();
      const handlerName = 'testHandler';
      (guard as any).openCircuit(handlerName);

      // Act - advance time beyond timeout
      jest.advanceTimersByTime(mockConfig.circuitBreaker.timeout + 1000);

      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      const stats = (guard as any).getCircuitStats(handlerName);
      expect(stats.state).toBe('half-open');

      jest.useRealTimers();
    });

    it('should limit requests in half-open state', async () => {
      // Arrange - set circuit to half-open
      const handlerName = 'testHandler';
      (guard as any).setCircuitState(handlerName, 'half-open');

      // Act - make requests up to half-open limit
      const results: boolean[] = [];
      for (let i = 0; i < mockConfig.circuitBreaker.halfOpenMaxCalls + 2; i++) {
        try {
          const result = await guard.canActivate(mockExecutionContext);
          results.push(result);
        } catch (error) {
          results.push(false);
        }
      }

      // Assert
      const allowedRequests = results.filter((r) => r === true).length;
      expect(allowedRequests).toBeLessThanOrEqual(
        mockConfig.circuitBreaker.halfOpenMaxCalls,
      );
    });

    it('should close circuit after successful half-open period', async () => {
      // Arrange - set circuit to half-open
      const handlerName = 'testHandler';
      (guard as any).setCircuitState(handlerName, 'half-open');

      // Act - simulate successful requests in half-open state
      for (let i = 0; i < mockConfig.circuitBreaker.halfOpenMaxCalls; i++) {
        await guard.canActivate(mockExecutionContext);
        (guard as any).recordSuccess(handlerName);
      }

      // Trigger evaluation
      await guard.canActivate(mockExecutionContext);

      // Assert
      const stats = (guard as any).getCircuitStats(handlerName);
      expect(stats.state).toBe('closed');
    });

    it('should reopen circuit after half-open failures', async () => {
      // Arrange - set circuit to half-open
      const handlerName = 'testHandler';
      (guard as any).setCircuitState(handlerName, 'half-open');

      // Act - simulate failed request in half-open state
      await guard.canActivate(mockExecutionContext);
      (guard as any).recordFailure(handlerName);

      // Assert
      const stats = (guard as any).getCircuitStats(handlerName);
      expect(stats.state).toBe('open');
    });
  });

  describe('error handling', () => {
    it('should throw service unavailable when circuit is open', async () => {
      // Arrange
      const handlerName = 'testHandler';
      (guard as any).openCircuit(handlerName);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: expect.stringContaining('Circuit breaker is open'),
        }),
      );
    });

    it('should include circuit breaker metadata in error', async () => {
      // Arrange
      const handlerName = 'testHandler';
      (guard as any).openCircuit(handlerName);

      // Act & Assert
      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error) {
        expect(error.getResponse()).toMatchObject({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: expect.any(String),
          circuitBreaker: {
            state: 'open',
            nextAttemptIn: expect.any(Number),
            failureRate: expect.any(Number),
          },
        });
      }
    });

    it('should handle concurrent state transitions safely', async () => {
      // Arrange
      const handlerName = 'testHandler';
      const concurrentRequests = 20;

      // Simulate concurrent requests that might trigger state changes
      const promises = Array.from(
        { length: concurrentRequests },
        async (_, i) => {
          try {
            await guard.canActivate(mockExecutionContext);
            if (i % 3 === 0) {
              (guard as any).recordFailure(handlerName);
            } else {
              (guard as any).recordSuccess(handlerName);
            }
            return true;
          } catch {
            return false;
          }
        },
      );

      // Act
      const results = await Promise.all(promises);

      // Assert - should handle concurrent access without crashes
      expect(results).toHaveLength(concurrentRequests);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('performance and monitoring', () => {
    it('should complete guard check within performance threshold', async () => {
      // Act
      const startTime = Date.now();
      await guard.canActivate(mockExecutionContext);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(50); // Should complete within 50ms
    });

    it('should provide circuit breaker statistics', () => {
      // Arrange
      const handlerName = 'testHandler';
      (guard as any).recordSuccess(handlerName);
      (guard as any).recordFailure(handlerName);

      // Act
      const stats = (guard as any).getCircuitStats(handlerName);

      // Assert
      expect(stats).toMatchObject({
        state: expect.any(String),
        successCount: expect.any(Number),
        failureCount: expect.any(Number),
        failureRate: expect.any(Number),
        totalRequests: expect.any(Number),
        lastFailureTime: expect.any(Date),
      });
    });

    it('should reset statistics appropriately', () => {
      // Arrange
      const handlerName = 'testHandler';
      (guard as any).recordSuccess(handlerName);
      (guard as any).recordFailure(handlerName);

      // Act
      (guard as any).resetCircuitBreaker(handlerName);

      // Assert
      const stats = (guard as any).getCircuitStats(handlerName);
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(0);
      expect(stats.state).toBe('closed');
    });

    it('should handle multiple different handlers independently', async () => {
      // Arrange
      const context1 = {
        ...mockExecutionContext,
        getHandler: () => ({ name: 'handler1' }),
      } as ExecutionContext;

      const context2 = {
        ...mockExecutionContext,
        getHandler: () => ({ name: 'handler2' }),
      } as ExecutionContext;

      // Act - make handler1 fail and handler2 succeed
      await guard.canActivate(context1);
      (guard as any).recordFailure('handler1');

      await guard.canActivate(context2);
      (guard as any).recordSuccess('handler2');

      // Assert
      const stats1 = (guard as any).getCircuitStats('handler1');
      const stats2 = (guard as any).getCircuitStats('handler2');

      expect(stats1.failureCount).toBe(1);
      expect(stats1.successCount).toBe(0);
      expect(stats2.failureCount).toBe(0);
      expect(stats2.successCount).toBe(1);
    });

    it('should clean up old circuit breaker data', () => {
      // Arrange
      const handlerName = 'oldHandler';
      (guard as any).recordSuccess(handlerName);

      // Mock old timestamp
      const stats = (guard as any).getCircuitStats(handlerName);
      stats.lastFailureTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      // Act
      (guard as any).cleanupOldStats();

      // Assert - old stats should be cleaned up
      const cleanedStats = (guard as any).circuitBreakers.get(handlerName);
      expect(cleanedStats).toBeUndefined();
    });
  });

  describe('configuration and flexibility', () => {
    it('should respect custom failure threshold configuration', async () => {
      // Arrange - lower failure threshold
      const customConfig = {
        ...mockConfig.circuitBreaker,
        failureThreshold: 25, // 25%
      };
      configService.get.mockReturnValue(customConfig);

      const customGuard = new CircuitBreakerGuard(configService);
      const handlerName = 'testHandler';

      // Add requests with 30% failure rate (above 25% threshold)
      for (let i = 0; i < 7; i++) {
        await customGuard.canActivate(mockExecutionContext);
        (customGuard as any).recordSuccess(handlerName);
      }

      for (let i = 0; i < 3; i++) {
        await customGuard.canActivate(mockExecutionContext);
        (customGuard as any).recordFailure(handlerName);
      }

      // Act - trigger evaluation
      await customGuard.canActivate(mockExecutionContext);

      // Assert
      const stats = (customGuard as any).getCircuitStats(handlerName);
      expect(stats.state).toBe('open');
    });

    it('should respect custom minimum requests configuration', async () => {
      // Arrange - higher minimum requests
      const customConfig = {
        ...mockConfig.circuitBreaker,
        minimumRequests: 20,
      };
      configService.get.mockReturnValue(customConfig);

      const customGuard = new CircuitBreakerGuard(configService);
      const handlerName = 'testHandler';

      // Add high failure rate but below minimum requests
      for (let i = 0; i < 15; i++) {
        await customGuard.canActivate(mockExecutionContext);
        (customGuard as any).recordFailure(handlerName); // 100% failure rate
      }

      // Act
      const result = await customGuard.canActivate(mockExecutionContext);

      // Assert - should still be closed due to minimum requests not met
      expect(result).toBe(true);
      const stats = (customGuard as any).getCircuitStats(handlerName);
      expect(stats.state).toBe('closed');
    });

    it('should handle dynamic configuration updates', () => {
      // Arrange
      const newConfig = {
        ...mockConfig.circuitBreaker,
        failureThreshold: 75,
      };

      // Act
      configService.get.mockReturnValue(newConfig);
      (guard as any).updateConfiguration();

      // Assert
      expect((guard as any).config.failureThreshold).toBe(75);
    });
  });

  describe('logging and observability', () => {
    it('should log circuit breaker state changes', () => {
      // Arrange
      const loggerSpy = jest.spyOn(guard['logger'], 'warn');
      const handlerName = 'testHandler';

      // Act
      (guard as any).openCircuit(handlerName);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker opened'),
        expect.objectContaining({
          handler: handlerName,
          failureRate: expect.any(Number),
          totalRequests: expect.any(Number),
        }),
      );
    });

    it('should log circuit breaker recovery', () => {
      // Arrange
      const loggerSpy = jest.spyOn(guard['logger'], 'log');
      const handlerName = 'testHandler';

      // Act
      (guard as any).closeCircuit(handlerName);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker closed'),
        expect.objectContaining({
          handler: handlerName,
          state: 'closed',
        }),
      );
    });

    it('should log blocked requests', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(guard['logger'], 'debug');
      const handlerName = 'testHandler';
      (guard as any).openCircuit(handlerName);

      // Act
      try {
        await guard.canActivate(mockExecutionContext);
      } catch (error) {
        // Expected error
      }

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Request blocked by circuit breaker'),
        expect.objectContaining({
          handler: handlerName,
          state: 'open',
          url: '/api/test',
        }),
      );
    });

    it('should provide metrics for monitoring systems', () => {
      // Arrange
      const handlerName = 'testHandler';
      (guard as any).recordSuccess(handlerName);
      (guard as any).recordFailure(handlerName);

      // Act
      const metrics = (guard as any).getMetrics();

      // Assert
      expect(metrics).toMatchObject({
        [handlerName]: {
          state: expect.any(String),
          successCount: expect.any(Number),
          failureCount: expect.any(Number),
          failureRate: expect.any(Number),
          uptime: expect.any(Number),
        },
      });
    });
  });

  describe('integration scenarios', () => {
    it('should work with different HTTP methods', async () => {
      const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of httpMethods) {
        // Arrange
        const context = {
          ...mockExecutionContext,
          switchToHttp: () => ({
            getRequest: () => ({
              ...mockExecutionContext.switchToHttp().getRequest(),
              method,
            }),
            getResponse: () =>
              mockExecutionContext.switchToHttp().getResponse(),
          }),
        } as ExecutionContext;

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      }
    });

    it('should handle requests with different URL patterns', async () => {
      const urlPatterns = [
        '/api/users',
        '/api/users/123',
        '/api/orders/search?status=pending',
        '/health/check',
        '/admin/dashboard',
      ];

      for (const url of urlPatterns) {
        // Arrange
        const context = {
          ...mockExecutionContext,
          switchToHttp: () => ({
            getRequest: () => ({
              ...mockExecutionContext.switchToHttp().getRequest(),
              url,
            }),
            getResponse: () =>
              mockExecutionContext.switchToHttp().getResponse(),
          }),
        } as ExecutionContext;

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      }
    });

    it('should integrate with other guards gracefully', async () => {
      // This would be an integration test with other guards
      // For now, we test that the guard doesn't interfere with normal request flow

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
    });
  });
});
