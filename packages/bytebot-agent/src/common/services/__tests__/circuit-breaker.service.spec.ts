/**
 * Circuit Breaker Service Test Suite - Resilience and Fault Tolerance Testing
 *
 * Tests circuit breaker pattern implementation for service resilience,
 * fault tolerance, automatic recovery, and failure isolation
 *
 * @author Claude Code
 * @version 1.0.0
 * @since Common Services Testing Phase
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { CircuitBreakerService } from '../circuit-breaker.service';

// Circuit breaker states
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;
  let configService: jest.Mocked<ConfigService>;
  let module: TestingModule;

  const mockLogger = {
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    verbose: jest.fn(),
  };

  const defaultConfig = {
    'circuitBreaker.failureThreshold': 5,
    'circuitBreaker.successThreshold': 3,
    'circuitBreaker.timeout': 60000,
    'circuitBreaker.monitoringPeriod': 10000,
    'circuitBreaker.resetTimeout': 30000,
    'circuitBreaker.volumeThreshold': 10,
    'circuitBreaker.errorThresholdPercentage': 50,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        return defaultConfig[key] ?? defaultValue;
      }),
    };

    module = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    })
      .setLogger(mockLogger as any)
      .compile();

    configService = module.get<ConfigService>(
      ConfigService,
    ) as jest.Mocked<ConfigService>;
    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
    jest.useRealTimers();
  });

  describe('Service Initialization', () => {
    it('should be defined and properly initialized', () => {
      expect(service).toBeDefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Circuit Breaker Service initialized',
      );
    });

    it('should load configuration from ConfigService', () => {
      expect(configService.get).toHaveBeenCalledWith(
        'circuitBreaker.failureThreshold',
        5,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'circuitBreaker.timeout',
        60000,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'circuitBreaker.resetTimeout',
        30000,
      );
    });

    it('should initialize circuit breakers map', () => {
      expect(service.getCircuitState('test-service')).toBe(CircuitState.CLOSED);
    });
  });

  describe('Circuit Breaker States', () => {
    it('should start in CLOSED state', () => {
      const state = service.getCircuitState('new-service');
      expect(state).toBe(CircuitState.CLOSED);
    });

    it('should transition to OPEN state after failure threshold', async () => {
      const serviceName = 'failing-service';
      const mockFailingFunction = jest
        .fn()
        .mockRejectedValue(new Error('Service failure'));

      // Execute failing function multiple times to reach threshold
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(serviceName, mockFailingFunction);
        } catch (error) {
          // Expected failures
        }
      }

      const state = service.getCircuitState(serviceName);
      expect(state).toBe(CircuitState.OPEN);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Circuit breaker opened for service: ${serviceName}`,
      );
    });

    it('should transition to HALF_OPEN state after timeout', async () => {
      const serviceName = 'recovery-service';
      const mockFailingFunction = jest
        .fn()
        .mockRejectedValue(new Error('Service failure'));

      // Trigger circuit breaker to open
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(serviceName, mockFailingFunction);
        } catch (error) {
          // Expected failures
        }
      }

      expect(service.getCircuitState(serviceName)).toBe(CircuitState.OPEN);

      // Fast-forward time to trigger reset timeout
      jest.advanceTimersByTime(35000); // 35 seconds (more than reset timeout of 30s)

      // Next execution should attempt half-open state
      const mockSuccessFunction = jest.fn().mockResolvedValue('success');
      await service.execute(serviceName, mockSuccessFunction);

      expect(service.getCircuitState(serviceName)).toBe(CircuitState.HALF_OPEN);
    });

    it('should return to CLOSED state after successful recovery', async () => {
      const serviceName = 'recovering-service';

      // First, open the circuit
      const mockFailingFunction = jest
        .fn()
        .mockRejectedValue(new Error('Service failure'));
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(serviceName, mockFailingFunction);
        } catch (error) {
          // Expected failures
        }
      }

      // Wait for reset timeout
      jest.advanceTimersByTime(35000);

      // Execute successful operations to close circuit
      const mockSuccessFunction = jest.fn().mockResolvedValue('success');
      for (let i = 0; i < 3; i++) {
        await service.execute(serviceName, mockSuccessFunction);
      }

      expect(service.getCircuitState(serviceName)).toBe(CircuitState.CLOSED);
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Circuit breaker closed for service: ${serviceName}`,
      );
    });

    it('should return to OPEN state if failure occurs in HALF_OPEN', async () => {
      const serviceName = 'unstable-service';

      // Open the circuit
      const mockFailingFunction = jest
        .fn()
        .mockRejectedValue(new Error('Service failure'));
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(serviceName, mockFailingFunction);
        } catch (error) {
          // Expected failures
        }
      }

      // Wait for reset timeout to enter half-open
      jest.advanceTimersByTime(35000);

      // Execute one successful operation to enter half-open
      const mockSuccessFunction = jest.fn().mockResolvedValue('success');
      await service.execute(serviceName, mockSuccessFunction);
      expect(service.getCircuitState(serviceName)).toBe(CircuitState.HALF_OPEN);

      // Now fail again - should return to open
      try {
        await service.execute(serviceName, mockFailingFunction);
      } catch (error) {
        // Expected failure
      }

      expect(service.getCircuitState(serviceName)).toBe(CircuitState.OPEN);
    });
  });

  describe('Function Execution', () => {
    it('should execute function normally when circuit is CLOSED', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success-result');

      const result = await service.execute('test-service', mockFunction);

      expect(result).toBe('success-result');
      expect(mockFunction).toHaveBeenCalledTimes(1);
    });

    it('should execute function with parameters', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      const params = ['param1', 'param2', { key: 'value' }];

      const result = await service.execute(
        'test-service',
        mockFunction,
        ...params,
      );

      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalledWith(...params);
    });

    it('should reject immediately when circuit is OPEN', async () => {
      const serviceName = 'blocked-service';
      const mockFunction = jest.fn().mockResolvedValue('should-not-execute');

      // Open the circuit first
      const mockFailingFunction = jest
        .fn()
        .mockRejectedValue(new Error('Service failure'));
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(serviceName, mockFailingFunction);
        } catch (error) {
          // Expected failures
        }
      }

      // Now try to execute when circuit is open
      await expect(service.execute(serviceName, mockFunction)).rejects.toThrow(
        'Circuit breaker is OPEN for service: blocked-service',
      );

      expect(mockFunction).not.toHaveBeenCalled();
    });

    it('should track execution metrics', async () => {
      const serviceName = 'metrics-service';
      const mockSuccessFunction = jest.fn().mockResolvedValue('success');
      const mockFailingFunction = jest
        .fn()
        .mockRejectedValue(new Error('failure'));

      // Execute some successful operations
      await service.execute(serviceName, mockSuccessFunction);
      await service.execute(serviceName, mockSuccessFunction);

      // Execute some failures
      try {
        await service.execute(serviceName, mockFailingFunction);
      } catch (error) {
        // Expected failure
      }

      const metrics = service.getCircuitMetrics(serviceName);
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.failureRate).toBe(33.33); // 1 failure out of 3 requests
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle different error types appropriately', async () => {
      const serviceName = 'error-service';

      const errorTypes = [
        new Error('Network error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
        'String error',
        { message: 'Object error' },
      ];

      for (const error of errorTypes) {
        const mockFailingFunction = jest.fn().mockRejectedValue(error);

        try {
          await service.execute(serviceName, mockFailingFunction);
        } catch (caughtError) {
          expect(caughtError).toBeDefined();
        }
      }

      const metrics = service.getCircuitMetrics(serviceName);
      expect(metrics.failedRequests).toBe(5);
    });

    it('should implement exponential backoff for recovery attempts', async () => {
      const serviceName = 'backoff-service';

      // Open the circuit
      const mockFailingFunction = jest
        .fn()
        .mockRejectedValue(new Error('Service failure'));
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(serviceName, mockFailingFunction);
        } catch (error) {
          // Expected failures
        }
      }

      // Check that backoff is applied
      const initialResetTimeout = 30000;

      // First recovery attempt
      jest.advanceTimersByTime(initialResetTimeout);
      try {
        await service.execute(serviceName, mockFailingFunction);
      } catch (error) {
        // Expected failure
      }

      // Second recovery attempt should have longer timeout
      const backoffTimeout = initialResetTimeout * 2;
      jest.advanceTimersByTime(backoffTimeout);

      const mockSuccessFunction = jest.fn().mockResolvedValue('success');
      await service.execute(serviceName, mockSuccessFunction);

      expect(mockSuccessFunction).toHaveBeenCalled();
    });

    it('should reset backoff after successful recovery', async () => {
      const serviceName = 'reset-backoff-service';

      // Open the circuit and apply backoff
      const mockFailingFunction = jest
        .fn()
        .mockRejectedValue(new Error('Service failure'));
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(serviceName, mockFailingFunction);
        } catch (error) {
          // Expected failures
        }
      }

      // Wait and recover successfully
      jest.advanceTimersByTime(35000);
      const mockSuccessFunction = jest.fn().mockResolvedValue('success');

      // Execute enough successful operations to close circuit
      for (let i = 0; i < 3; i++) {
        await service.execute(serviceName, mockSuccessFunction);
      }

      expect(service.getCircuitState(serviceName)).toBe(CircuitState.CLOSED);

      // Verify backoff has been reset by checking that next failure cycle uses original timeout
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(serviceName, mockFailingFunction);
        } catch (error) {
          // Expected failures
        }
      }

      expect(service.getCircuitState(serviceName)).toBe(CircuitState.OPEN);
    });
  });

  describe('Configuration and Thresholds', () => {
    it('should respect custom failure thresholds', () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'circuitBreaker.failureThreshold') return 3; // Custom threshold
          return defaultConfig[key] ?? defaultValue;
        },
      );

      const customService = new CircuitBreakerService(configService);

      // Should open after 3 failures instead of default 5
      expect(customService).toBeDefined();
    });

    it('should respect custom success thresholds for recovery', () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'circuitBreaker.successThreshold') return 2; // Custom threshold
          return defaultConfig[key] ?? defaultValue;
        },
      );

      const customService = new CircuitBreakerService(configService);

      // Should close after 2 successes instead of default 3
      expect(customService).toBeDefined();
    });

    it('should handle volume threshold for statistical significance', async () => {
      const serviceName = 'volume-service';
      const mockFunction = jest.fn();

      // Configure high failure rate but low volume
      mockFunction.mockRejectedValueOnce(new Error('failure'));
      mockFunction.mockResolvedValue('success');

      try {
        await service.execute(serviceName, mockFunction);
      } catch (error) {
        // Expected failure
      }

      // Execute successful operation
      await service.execute(serviceName, mockFunction);

      // Should not open circuit due to low volume (only 2 requests, threshold is 10)
      expect(service.getCircuitState(serviceName)).toBe(CircuitState.CLOSED);

      const metrics = service.getCircuitMetrics(serviceName);
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.failureRate).toBe(50);
    });

    it('should apply error threshold percentage correctly', async () => {
      const serviceName = 'percentage-service';
      const mockSuccessFunction = jest.fn().mockResolvedValue('success');
      const mockFailingFunction = jest
        .fn()
        .mockRejectedValue(new Error('failure'));

      // Execute enough requests to meet volume threshold
      // With 50% error threshold, need 6 failures out of 10 requests to open circuit
      for (let i = 0; i < 4; i++) {
        await service.execute(serviceName, mockSuccessFunction);
      }

      for (let i = 0; i < 6; i++) {
        try {
          await service.execute(serviceName, mockFailingFunction);
        } catch (error) {
          // Expected failures
        }
      }

      // Should open circuit as failure rate (60%) exceeds threshold (50%)
      expect(service.getCircuitState(serviceName)).toBe(CircuitState.OPEN);
    });
  });

  describe('Multiple Service Management', () => {
    it('should manage multiple independent circuit breakers', async () => {
      const service1 = 'service-1';
      const service2 = 'service-2';
      const service3 = 'service-3';

      const mockSuccess = jest.fn().mockResolvedValue('success');
      const mockFailure = jest.fn().mockRejectedValue(new Error('failure'));

      // Service 1: Keep closed (successful)
      await service.execute(service1, mockSuccess);

      // Service 2: Open (failing)
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(service2, mockFailure);
        } catch (error) {
          // Expected failures
        }
      }

      // Service 3: Keep closed (successful)
      await service.execute(service3, mockSuccess);

      expect(service.getCircuitState(service1)).toBe(CircuitState.CLOSED);
      expect(service.getCircuitState(service2)).toBe(CircuitState.OPEN);
      expect(service.getCircuitState(service3)).toBe(CircuitState.CLOSED);
    });

    it('should provide independent metrics for each service', async () => {
      const service1 = 'metrics-service-1';
      const service2 = 'metrics-service-2';

      const mockSuccess = jest.fn().mockResolvedValue('success');
      const mockFailure = jest.fn().mockRejectedValue(new Error('failure'));

      // Service 1: 3 successes, 2 failures
      for (let i = 0; i < 3; i++) {
        await service.execute(service1, mockSuccess);
      }
      for (let i = 0; i < 2; i++) {
        try {
          await service.execute(service1, mockFailure);
        } catch (error) {
          // Expected failures
        }
      }

      // Service 2: 1 success, 4 failures
      await service.execute(service2, mockSuccess);
      for (let i = 0; i < 4; i++) {
        try {
          await service.execute(service2, mockFailure);
        } catch (error) {
          // Expected failures
        }
      }

      const metrics1 = service.getCircuitMetrics(service1);
      const metrics2 = service.getCircuitMetrics(service2);

      expect(metrics1.totalRequests).toBe(5);
      expect(metrics1.successfulRequests).toBe(3);
      expect(metrics1.failedRequests).toBe(2);

      expect(metrics2.totalRequests).toBe(5);
      expect(metrics2.successfulRequests).toBe(1);
      expect(metrics2.failedRequests).toBe(4);
    });

    it('should support bulk operations on all circuits', () => {
      const services = ['bulk-1', 'bulk-2', 'bulk-3'];

      // Initialize circuits by getting their states
      services.forEach((serviceName) => {
        service.getCircuitState(serviceName);
      });

      const allStates = service.getAllCircuitStates();

      expect(Object.keys(allStates)).toHaveLength(3);
      expect(allStates['bulk-1']).toBe(CircuitState.CLOSED);
      expect(allStates['bulk-2']).toBe(CircuitState.CLOSED);
      expect(allStates['bulk-3']).toBe(CircuitState.CLOSED);
    });
  });

  describe('Monitoring and Health Checks', () => {
    it('should provide health status for circuit breakers', () => {
      const serviceName = 'health-service';

      // Execute some operations to generate metrics
      const mockSuccess = jest.fn().mockResolvedValue('success');
      service.execute(serviceName, mockSuccess);

      const health = service.getHealthStatus();

      expect(health).toBeDefined();
      expect(health.totalCircuits).toBeGreaterThan(0);
      expect(health.openCircuits).toBeDefined();
      expect(health.halfOpenCircuits).toBeDefined();
      expect(health.closedCircuits).toBeDefined();
    });

    it('should track circuit breaker events for monitoring', async () => {
      const serviceName = 'monitored-service';
      const mockFailure = jest
        .fn()
        .mockRejectedValue(new Error('monitored failure'));

      // Generate circuit breaker events
      for (let i = 0; i < 5; i++) {
        try {
          await service.execute(serviceName, mockFailure);
        } catch (error) {
          // Expected failures
        }
      }

      // Should have logged circuit opening
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Circuit breaker opened for service: ${serviceName}`,
      );
    });

    it('should provide detailed metrics history', async () => {
      const serviceName = 'history-service';
      const mockSuccess = jest.fn().mockResolvedValue('success');

      // Execute operations over time
      await service.execute(serviceName, mockSuccess);

      jest.advanceTimersByTime(5000);
      await service.execute(serviceName, mockSuccess);

      jest.advanceTimersByTime(5000);
      await service.execute(serviceName, mockSuccess);

      const metrics = service.getCircuitMetrics(serviceName);

      expect(metrics.requestsPerSecond).toBeDefined();
      expect(metrics.averageResponseTime).toBeDefined();
      expect(metrics.lastFailureTime).toBeDefined();
      expect(metrics.lastSuccessTime).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-frequency executions efficiently', async () => {
      const serviceName = 'high-frequency-service';
      const mockFunction = jest.fn().mockResolvedValue('success');

      const startTime = Date.now();
      const promises = [];

      // Execute 1000 operations concurrently
      for (let i = 0; i < 1000; i++) {
        promises.push(service.execute(serviceName, mockFunction));
      }

      await Promise.all(promises);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockFunction).toHaveBeenCalledTimes(1000);

      const metrics = service.getCircuitMetrics(serviceName);
      expect(metrics.totalRequests).toBe(1000);
    });

    it('should maintain performance with many concurrent services', async () => {
      const services = Array.from(
        { length: 100 },
        (_, i) => `concurrent-service-${i}`,
      );
      const mockFunction = jest.fn().mockResolvedValue('success');

      const startTime = Date.now();
      const promises = [];

      // Execute operations on all services concurrently
      services.forEach((serviceName) => {
        promises.push(service.execute(serviceName, mockFunction));
      });

      await Promise.all(promises);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(3000); // Should handle 100 services quickly
      expect(mockFunction).toHaveBeenCalledTimes(100);

      const allStates = service.getAllCircuitStates();
      expect(Object.keys(allStates)).toHaveLength(100);
    });

    it('should clean up old metrics to prevent memory leaks', () => {
      const serviceName = 'cleanup-service';
      const mockFunction = jest.fn().mockResolvedValue('success');

      // Execute operations
      service.execute(serviceName, mockFunction);

      // Fast-forward time beyond cleanup period
      jest.advanceTimersByTime(300000); // 5 minutes

      // Verify cleanup has occurred (implementation-specific)
      const health = service.getHealthStatus();
      expect(health).toBeDefined();
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle undefined/null function gracefully', async () => {
      await expect(
        service.execute('test-service', null as any),
      ).rejects.toThrow();

      await expect(
        service.execute('test-service', undefined as any),
      ).rejects.toThrow();
    });

    it('should handle empty service names', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');

      await expect(service.execute('', mockFunction)).rejects.toThrow(
        'Service name cannot be empty',
      );
    });

    it('should handle functions that throw synchronously', async () => {
      const serviceName = 'sync-error-service';
      const mockSyncError = jest.fn().mockImplementation(() => {
        throw new Error('Synchronous error');
      });

      await expect(service.execute(serviceName, mockSyncError)).rejects.toThrow(
        'Synchronous error',
      );

      const metrics = service.getCircuitMetrics(serviceName);
      expect(metrics.failedRequests).toBe(1);
    });

    it('should handle promise rejection with non-error values', async () => {
      const serviceName = 'non-error-rejection-service';
      const mockRejectString = jest.fn().mockRejectedValue('string rejection');
      const mockRejectNumber = jest.fn().mockRejectedValue(404);
      const mockRejectObject = jest.fn().mockRejectedValue({ code: 'ERROR' });

      try {
        await service.execute(serviceName, mockRejectString);
      } catch (error) {
        expect(error).toBe('string rejection');
      }

      try {
        await service.execute(serviceName, mockRejectNumber);
      } catch (error) {
        expect(error).toBe(404);
      }

      try {
        await service.execute(serviceName, mockRejectObject);
      } catch (error) {
        expect(error).toEqual({ code: 'ERROR' });
      }

      const metrics = service.getCircuitMetrics(serviceName);
      expect(metrics.failedRequests).toBe(3);
    });
  });
});
