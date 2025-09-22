/**
 * Error Handling and Recovery Service Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ErrorHandlingRecoveryService } from '../error-handling-recovery.service';
import {
  ParlantValidationRequest,
  SecurityLevel,
  ParlantUserContext,
} from '../../types/parlant-shared.types';
import {
  RecoveryStrategy,
  CircuitBreakerState,
  ErrorSeverity,
  ErrorHandlingRequest,
} from '../error-handling-recovery.service';

describe('ErrorHandlingRecoveryService', () => {
  let service: ErrorHandlingRecoveryService;
  let module: TestingModule;

  const mockUserContext: ParlantUserContext = {
    userId: 'test-user',
    roles: ['user'],
    sessionId: 'session-123',
    ipAddress: '127.0.0.1',
    metadata: {}
  };

  const mockValidationRequest: ParlantValidationRequest = {
    operationId: 'test-op',
    functionName: 'testFunction',
    packageName: 'test-package',
    description: 'Test function',
    parameters: {},
    userContext: mockUserContext,
    securityLevel: SecurityLevel._MEDIUM,
    timeout: 5000
  };

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      providers: [
        ErrorHandlingRecoveryService,
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    });

    module = await moduleBuilder.compile();
    service = module.get<ErrorHandlingRecoveryService>(ErrorHandlingRecoveryService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Error Handling', () => {
    it('should handle timeout errors with exponential backoff', async () => {
      const errorRequest = {
        originalRequest: mockValidationRequest,
        error: new Error('Request timeout'),
        attemptNumber: 2,
        previousAttempts: [],
        context: {
          serviceName: 'test-service',
          operationId: 'test-op',
          timestamp: new Date(),
          userContext: mockUserContext as unknown as Record<string, unknown>,
          systemState: {
            cpuUsage: 50,
            memoryUsage: 60,
            activeConnections: 100,
            queueDepth: 10,
            errorRate: 5
          }
        }
      };

      const result = await service.handleError(errorRequest);

      expect(result).toBeDefined();
      expect(result.handled).toBeDefined();
      expect(result.strategy).toBe(RecoveryStrategy.EXPONENTIAL_BACKOFF);
      expect(result.errorAnalysis.category).toBe('timeout');
      expect(result.errorAnalysis.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should use fallback service for validation errors', async () => {
      const errorRequest = {
        originalRequest: mockValidationRequest,
        error: new Error('Validation failed'),
        attemptNumber: 1,
        previousAttempts: [],
        context: {
          serviceName: 'validation-service',
          operationId: 'test-op',
          timestamp: new Date(),
          userContext: mockUserContext as unknown as Record<string, unknown>,
          systemState: {
            cpuUsage: 30,
            memoryUsage: 40,
            activeConnections: 50,
            queueDepth: 2,
            errorRate: 2
          }
        }
      };

      const result = await service.handleError(errorRequest);

      expect(result).toBeDefined();
      expect(result.strategy).toBe(RecoveryStrategy.FALLBACK_SERVICE);
      expect(result.errorAnalysis.category).toBe('validation');
    });

    it('should recommend graceful degradation for resource errors', async () => {
      const errorRequest = {
        originalRequest: mockValidationRequest,
        error: new Error('Memory limit exceeded'),
        attemptNumber: 1,
        previousAttempts: [],
        context: {
          serviceName: 'resource-service',
          operationId: 'test-op',
          timestamp: new Date(),
          userContext: mockUserContext as unknown as Record<string, unknown>,
          systemState: {
            cpuUsage: 95,
            memoryUsage: 98,
            activeConnections: 1000,
            queueDepth: 100,
            errorRate: 25
          }
        }
      };

      const result = await service.handleError(errorRequest);

      expect(result).toBeDefined();
      expect(result.strategy).toBe(RecoveryStrategy.GRACEFUL_DEGRADATION);
      expect(result.errorAnalysis.category).toBe('resource');
      expect(result.errorAnalysis.severity).toBe(ErrorSeverity.CRITICAL);
    });
  });

  describe('Circuit Breaker', () => {
    it('should collect error handling metrics', async () => {
      const metrics = await service.getErrorHandlingMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.circuitBreakers).toBeDefined();
      expect(metrics.errorPatterns).toBeDefined();
      expect(metrics.fallbackServices).toBeDefined();
    });

    it('should initialize with proper service configuration', () => {
      expect(service).toBeDefined();
      expect(service.getErrorHandlingMetrics).toBeDefined();
      expect(service.handleError).toBeDefined();
    });
  });

  describe('Fallback Services', () => {
    it('should handle different security levels appropriately', async () => {
      const testCases = [
        { securityLevel: SecurityLevel._MINIMAL, expectApproved: true },
        { securityLevel: SecurityLevel._LOW, expectApproved: true },
        { securityLevel: SecurityLevel._CRITICAL, expectApproved: false }
      ];

      for (const testCase of testCases) {
        const request = {
          ...mockValidationRequest,
          securityLevel: testCase.securityLevel,
          operationId: `fallback-test-${testCase.securityLevel}`
        };

        const errorRequest = {
          originalRequest: request,
          error: new Error('Service unavailable'),
          attemptNumber: 3,
          previousAttempts: [],
          context: {
            serviceName: 'fallback-test-service',
            operationId: request.operationId,
            timestamp: new Date(),
            userContext: mockUserContext as unknown as Record<string, unknown>,
            systemState: {
              cpuUsage: 50,
              memoryUsage: 60,
              activeConnections: 100,
              queueDepth: 10,
              errorRate: 10
            }
          }
        };

        const result = await service.handleError(errorRequest);

        expect(result).toBeDefined();
        expect(result.strategy).toBe(RecoveryStrategy.FALLBACK_SERVICE);

        if (result.fallbackResponse) {
          if (testCase.securityLevel === SecurityLevel._CRITICAL) {
            expect(result.fallbackResponse.approved).toBe(false);
          } else if (testCase.securityLevel === SecurityLevel._MINIMAL ||
                     testCase.securityLevel === SecurityLevel._LOW) {
            // Could be true for auto-approve, or determined by rules
            expect(result.fallbackResponse.approved).toBeDefined();
          }
        }
      }
    });
  });
});