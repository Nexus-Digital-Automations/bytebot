/**
 * Circuit Breaker Authentication Guard Tests - Comprehensive resilience testing
 * Tests circuit breaker patterns, failure recovery, and fallback mechanisms
 *
 * Test Coverage:
 * - Circuit breaker state transitions (closed -> open -> half-open -> closed)
 * - Failure detection and threshold management
 * - Automatic recovery mechanisms
 * - Fallback authentication strategies
 * - Performance monitoring and metrics collection
 * - Graceful degradation under high load
 * - Concurrent request management in half-open state
 *
 * @author Enterprise Security & Resilience Testing Specialist
 * @version 1.0.0
 * @since Phase 2: Circuit Breaker Authentication Testing
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerAuthGuard } from '../circuit-breaker-auth.guard';
import { SecurityMonitoringService } from '../../services/security-monitoring.service';

describe('CircuitBreakerAuthGuard', () => {
  let guard: CircuitBreakerAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let securityMonitoring: jest.Mocked<SecurityMonitoringService>;

  // Test data
  const mockConfig = {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    responseTimeThreshold: 1000, // 1 second
    maxConcurrentRequests: 5,
    fallbackEnabled: true,
    monitoringEnabled: true,
  };

  const mockValidJwtPayload = {
    sub: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'USER',
    sessionId: 'session-123',
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const createMockRequest = (overrides: any = {}) => ({
    headers: {
      authorization: 'Bearer valid-jwt-token',
      'user-agent': 'Test Browser',
      'x-forwarded-for': '192.168.1.100',
      ...overrides.headers,
    },
    connection: { remoteAddress: '192.168.1.100' },
    socket: { remoteAddress: '192.168.1.100' },
    ...overrides,
  });

  const createMockExecutionContext = (
    request: any = createMockRequest(),
  ): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => jest.fn(),
    }),
    getHandler: () => ({ name: 'testHandler' }),
    getClass: () => ({ name: 'TestController' }),
    getArgs: () => [],
    getArgByIndex: () => ({}),
    switchToRpc: () => ({ getData: () => ({}), getContext: () => ({}) }),
    switchToWs: () => ({ getData: () => ({}), getClient: () => ({}) }),
    getType: () => 'http' as const,
  });

  beforeEach(async () => {
    // Create mocks
    const mockReflector = {
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndOverride: jest.fn(),
      getAllAndMerge: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      signAsync: jest.fn(),
      verify: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockSecurityMonitoring = {
      recordLoginAttempt: jest.fn(),
      isIpBlocked: jest.fn(),
      logSecurityEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SecurityMonitoringService,
          useValue: mockSecurityMonitoring,
        },
      ],
    }).compile();

    guard = module.get<CircuitBreakerAuthGuard>(CircuitBreakerAuthGuard);
    reflector = module.get(Reflector);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    securityMonitoring = module.get(SecurityMonitoringService);

    // Setup default mocks
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockResolvedValue(mockValidJwtPayload);
    configService.get.mockImplementation((key, defaultValue) => {
      const configMap: Record<string, any> = {
        'auth.circuitBreaker.failureThreshold': mockConfig.failureThreshold,
        'auth.circuitBreaker.successThreshold': mockConfig.successThreshold,
        'auth.circuitBreaker.timeout': mockConfig.timeout,
        'auth.circuitBreaker.responseTimeThreshold':
          mockConfig.responseTimeThreshold,
        'auth.circuitBreaker.maxConcurrentRequests':
          mockConfig.maxConcurrentRequests,
        'auth.circuitBreaker.fallbackEnabled': mockConfig.fallbackEnabled,
        'auth.circuitBreaker.monitoringEnabled': mockConfig.monitoringEnabled,
      };
      return configMap[key] !== undefined ? configMap[key] : defaultValue;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    // Reset circuit breaker state
    guard.reset('test-reset');
  });

  describe('initialization', () => {
    it('should initialize with correct configuration', () => {
      const config = guard.getConfiguration();
      const metrics = guard.getMetrics();

      expect(config).toEqual(mockConfig);
      expect(metrics.state).toBe('closed');
      expect(metrics.failureCount).toBe(0);
      expect(metrics.successCount).toBe(0);
    });

    it('should use default configuration values when not provided', () => {
      configService.get.mockReturnValue(undefined);

      // Create new guard instance to test defaults
      const newGuard = new CircuitBreakerAuthGuard(
        reflector,
        jwtService,
        configService,
        securityMonitoring,
      );

      const config = newGuard.getConfiguration();
      expect(config.failureThreshold).toBe(5); // Default value
      expect(config.successThreshold).toBe(3); // Default value
    });
  });

  describe('public route handling', () => {
    it('should allow access to public routes', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext();

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });
  });

  describe('successful authentication', () => {
    it('should authenticate valid JWT token successfully', async () => {
      // Arrange
      const context = createMockExecutionContext();

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-jwt-token');

      const metrics = guard.getMetrics();
      expect(metrics.successCount).toBe(1);
      expect(metrics.totalAttempts).toBe(1);
      expect(metrics.state).toBe('closed');
    });

    it('should record security monitoring event for successful auth', async () => {
      // Arrange
      const context = createMockExecutionContext();

      // Act
      await guard.canActivate(context);

      // Assert
      expect(securityMonitoring.recordLoginAttempt).toHaveBeenCalledWith(
        'authenticated-user',
        '192.168.1.100',
        'Test Browser',
        true,
      );
    });

    it('should attach user information to request', async () => {
      // Arrange
      const request = createMockRequest();
      const context = createMockExecutionContext(request);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(request.user).toEqual({
        userId: mockValidJwtPayload.sub,
        username: mockValidJwtPayload.username,
        email: mockValidJwtPayload.email,
        role: mockValidJwtPayload.role,
        sessionId: mockValidJwtPayload.sessionId,
      });
    });
  });

  describe('authentication failures', () => {
    it('should handle missing authorization header', async () => {
      // Arrange
      const request = createMockRequest({
        headers: { 'user-agent': 'Test Browser' }, // No authorization header
      });
      const context = createMockExecutionContext(request);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      const metrics = guard.getMetrics();
      expect(metrics.failureCount).toBe(1);
      expect(metrics.totalAttempts).toBe(1);
    });

    it('should handle invalid authorization header format', async () => {
      // Arrange
      const request = createMockRequest({
        headers: {
          authorization: 'Invalid token-format',
          'user-agent': 'Test Browser',
        },
      });
      const context = createMockExecutionContext(request);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle JWT verification errors', async () => {
      // Arrange
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));
      const context = createMockExecutionContext();

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow();

      const metrics = guard.getMetrics();
      expect(metrics.failureCount).toBe(1);
    });

    it('should handle invalid token payload', async () => {
      // Arrange
      jwtService.verifyAsync.mockResolvedValue({
        ...mockValidJwtPayload,
        type: 'refresh', // Invalid type for access
      });
      const context = createMockExecutionContext();

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should record security monitoring event for failed auth', async () => {
      // Arrange
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));
      const context = createMockExecutionContext();

      // Act
      try {
        await guard.canActivate(context);
      } catch {
        // Expected to throw
      }

      // Assert
      expect(securityMonitoring.recordLoginAttempt).toHaveBeenCalledWith(
        'unknown',
        '192.168.1.100',
        'Test Browser',
        false,
      );
    });
  });

  describe('circuit breaker state transitions', () => {
    it('should transition to OPEN state after threshold failures', async () => {
      // Arrange
      jwtService.verifyAsync.mockRejectedValue(new Error('Auth failure'));
      const context = createMockExecutionContext();

      // Act - Trigger failures up to threshold
      for (let i = 0; i < mockConfig.failureThreshold; i++) {
        try {
          await guard.canActivate(context);
        } catch {
          // Expected failures
        }
      }

      // Assert
      const metrics = guard.getMetrics();
      expect(metrics.state).toBe('open');
      expect(metrics.failureCount).toBe(mockConfig.failureThreshold);
    });

    it('should block requests in OPEN state', async () => {
      // Arrange - Force circuit to OPEN state
      jwtService.verifyAsync.mockRejectedValue(new Error('Auth failure'));
      const context = createMockExecutionContext();

      // First trigger failures to open circuit
      for (let i = 0; i < mockConfig.failureThreshold; i++) {
        try {
          await guard.canActivate(context);
        } catch {
          // Expected failures
        }
      }

      // Reset JWT service to return valid tokens
      jwtService.verifyAsync.mockResolvedValue(mockValidJwtPayload);

      // Act & Assert - Requests should be blocked while circuit is open
      await expect(guard.canActivate(context)).rejects.toThrow(
        ServiceUnavailableException,
      );

      expect(securityMonitoring.recordLoginAttempt).toHaveBeenCalledWith(
        'unknown',
        '192.168.1.100',
        'Test Browser',
        false,
      );
    });

    it('should transition to HALF_OPEN state after timeout', async () => {
      // Arrange - Force circuit to OPEN state
      jwtService.verifyAsync.mockRejectedValue(new Error('Auth failure'));
      const context = createMockExecutionContext();

      for (let i = 0; i < mockConfig.failureThreshold; i++) {
        try {
          await guard.canActivate(context);
        } catch {
          // Expected failures
        }
      }

      // Mock time passage
      jest
        .spyOn(Date.prototype, 'getTime')
        .mockReturnValueOnce(Date.now()) // Initial state change time
        .mockReturnValue(Date.now() + mockConfig.timeout + 1000); // After timeout

      // Reset JWT service for successful auth
      jwtService.verifyAsync.mockResolvedValue(mockValidJwtPayload);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      const metrics = guard.getMetrics();
      expect(metrics.state).toBe('half_open');
    });

    it('should transition to CLOSED state after successful recoveries in HALF_OPEN', async () => {
      // Arrange - Force circuit to OPEN then HALF_OPEN
      jwtService.verifyAsync.mockRejectedValue(new Error('Auth failure'));
      const context = createMockExecutionContext();

      // Open the circuit
      for (let i = 0; i < mockConfig.failureThreshold; i++) {
        try {
          await guard.canActivate(context);
        } catch {
          // Expected failures
        }
      }

      // Simulate timeout passage to transition to HALF_OPEN
      jest
        .spyOn(Date.prototype, 'getTime')
        .mockReturnValue(Date.now() + mockConfig.timeout + 1000);

      // Reset JWT service for successful auth
      jwtService.verifyAsync.mockResolvedValue(mockValidJwtPayload);

      // Act - Make successful requests in half-open state
      for (let i = 0; i < mockConfig.successThreshold; i++) {
        await guard.canActivate(context);
      }

      // Assert
      const metrics = guard.getMetrics();
      expect(metrics.state).toBe('closed');
      expect(metrics.failureCount).toBe(0); // Should be reset
    });

    it('should return to OPEN state on failure in HALF_OPEN state', async () => {
      // Arrange - Get to HALF_OPEN state
      jwtService.verifyAsync.mockRejectedValue(new Error('Auth failure'));
      const context = createMockExecutionContext();

      // Open the circuit
      for (let i = 0; i < mockConfig.failureThreshold; i++) {
        try {
          await guard.canActivate(context);
        } catch {
          // Expected failures
        }
      }

      // Transition to HALF_OPEN
      jest
        .spyOn(Date.prototype, 'getTime')
        .mockReturnValue(Date.now() + mockConfig.timeout + 1000);

      // First request succeeds to enter half-open
      jwtService.verifyAsync.mockResolvedValueOnce(mockValidJwtPayload);
      await guard.canActivate(context);

      // Next request fails
      jwtService.verifyAsync.mockRejectedValue(new Error('Auth failure'));

      // Act & Assert
      try {
        await guard.canActivate(context);
      } catch {
        // Expected failure
      }

      const metrics = guard.getMetrics();
      expect(metrics.state).toBe('open');
    });
  });

  describe('concurrent request management in HALF_OPEN', () => {
    it('should limit concurrent requests in HALF_OPEN state', async () => {
      // Arrange - Get to HALF_OPEN state
      jwtService.verifyAsync.mockRejectedValue(new Error('Auth failure'));
      const context = createMockExecutionContext();

      // Open the circuit
      for (let i = 0; i < mockConfig.failureThreshold; i++) {
        try {
          await guard.canActivate(context);
        } catch {
          // Expected failures
        }
      }

      // Transition to HALF_OPEN
      jest
        .spyOn(Date.prototype, 'getTime')
        .mockReturnValue(Date.now() + mockConfig.timeout + 1000);

      // Reset JWT service but make it slow
      jwtService.verifyAsync.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockValidJwtPayload), 100),
          ),
      );

      // Act - Start multiple concurrent requests
      const promises = Array(mockConfig.maxConcurrentRequests + 2)
        .fill(null)
        .map(() => guard.canActivate(context));

      const results = await Promise.allSettled(promises);

      // Assert - Some requests should be rejected due to concurrent limit
      const rejectedCount = results.filter(
        (r) => r.status === 'rejected',
      ).length;
      expect(rejectedCount).toBeGreaterThan(0);

      const rejectedReasons = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => r.reason);

      expect(
        rejectedReasons.some(
          (reason) =>
            reason instanceof ServiceUnavailableException &&
            reason.message.includes('too many concurrent requests'),
        ),
      ).toBe(true);
    });
  });

  describe('fallback authentication', () => {
    it('should attempt fallback authentication when primary fails', async () => {
      // Arrange
      jwtService.verifyAsync.mockRejectedValue(new Error('TokenExpiredError'));
      const request = createMockRequest();
      const context = createMockExecutionContext(request);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(request.user).toEqual({
        userId: 'fallback-user',
        username: 'fallback',
        email: 'fallback@system.local',
        role: 'VIEWER',
        sessionId: expect.stringMatching(/^fallback-\d+$/),
        isFallback: true,
      });
    });

    it('should not attempt fallback for non-fallbackable errors', async () => {
      // Arrange
      jwtService.verifyAsync.mockRejectedValue(new Error('Network error'));
      const context = createMockExecutionContext();

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow();
    });

    it('should respect fallback configuration', async () => {
      // Arrange - Disable fallback
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'auth.circuitBreaker.fallbackEnabled') return false;
        const configMap: Record<string, any> = {
          'auth.circuitBreaker.failureThreshold': mockConfig.failureThreshold,
          'auth.circuitBreaker.successThreshold': mockConfig.successThreshold,
          'auth.circuitBreaker.timeout': mockConfig.timeout,
          'auth.circuitBreaker.responseTimeThreshold':
            mockConfig.responseTimeThreshold,
          'auth.circuitBreaker.maxConcurrentRequests':
            mockConfig.maxConcurrentRequests,
          'auth.circuitBreaker.monitoringEnabled': mockConfig.monitoringEnabled,
        };
        return configMap[key] !== undefined ? configMap[key] : defaultValue;
      });

      // Create new guard with fallback disabled
      const newGuard = new CircuitBreakerAuthGuard(
        reflector,
        jwtService,
        configService,
        securityMonitoring,
      );

      jwtService.verifyAsync.mockRejectedValue(new Error('TokenExpiredError'));
      const context = createMockExecutionContext();

      // Act & Assert
      await expect(newGuard.canActivate(context)).rejects.toThrow();
    });
  });

  describe('response time monitoring', () => {
    it('should track response times', async () => {
      // Arrange
      const context = createMockExecutionContext();

      // Act
      await guard.canActivate(context);

      // Assert
      const metrics = guard.getMetrics();
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
    });

    it('should warn about slow response times', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(guard['logger'], 'warn');
      jwtService.verifyAsync.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve(mockValidJwtPayload),
              mockConfig.responseTimeThreshold + 100,
            ),
          ),
      );
      const context = createMockExecutionContext();

      // Act
      await guard.canActivate(context);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Authentication response time exceeded threshold',
        ),
        expect.any(Object),
      );
    });

    it('should handle JWT verification timeout', async () => {
      // Arrange
      jwtService.verifyAsync.mockImplementation(
        () => new Promise(() => {}), // Never resolves (simulates timeout)
      );
      const context = createMockExecutionContext();

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow();
    });
  });

  describe('IP address extraction', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      // Arrange
      const request = createMockRequest({
        headers: {
          authorization: 'Bearer valid-jwt-token',
          'x-forwarded-for': '203.0.113.1, 203.0.113.2',
        },
      });
      const context = createMockExecutionContext(request);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(securityMonitoring.recordLoginAttempt).toHaveBeenCalledWith(
        'authenticated-user',
        '203.0.113.1', // First IP from forwarded header
        undefined,
        true,
      );
    });

    it('should extract IP from x-real-ip header', async () => {
      // Arrange
      const request = createMockRequest({
        headers: {
          authorization: 'Bearer valid-jwt-token',
          'x-real-ip': '203.0.113.3',
        },
      });
      delete request.headers['x-forwarded-for'];
      const context = createMockExecutionContext(request);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(securityMonitoring.recordLoginAttempt).toHaveBeenCalledWith(
        'authenticated-user',
        '203.0.113.3',
        undefined,
        true,
      );
    });

    it('should fallback to connection remote address', async () => {
      // Arrange
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-jwt-token' },
        connection: { remoteAddress: '203.0.113.4' },
      });
      delete request.headers['x-forwarded-for'];
      delete request.headers['x-real-ip'];
      const context = createMockExecutionContext(request);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(securityMonitoring.recordLoginAttempt).toHaveBeenCalledWith(
        'authenticated-user',
        '203.0.113.4',
        undefined,
        true,
      );
    });
  });

  describe('metrics and monitoring', () => {
    it('should provide comprehensive metrics', async () => {
      // Arrange
      const context = createMockExecutionContext();

      // Act - Perform some operations
      await guard.canActivate(context);

      // Act & Assert
      const metrics = guard.getMetrics();
      expect(metrics).toEqual({
        state: 'closed',
        failureCount: 0,
        successCount: 1,
        totalAttempts: 1,
        averageResponseTime: expect.any(Number),
        lastSuccessTime: expect.any(Date),
        stateChangedAt: expect.any(Date),
        halfOpenAttempts: 0,
      });
    });

    it('should provide configuration details', () => {
      const config = guard.getConfiguration();
      expect(config).toEqual(mockConfig);
    });
  });

  describe('reset functionality', () => {
    it('should reset circuit breaker state', async () => {
      // Arrange - Trigger some failures
      jwtService.verifyAsync.mockRejectedValue(new Error('Auth failure'));
      const context = createMockExecutionContext();

      try {
        await guard.canActivate(context);
      } catch {
        // Expected failure
      }

      // Act
      guard.reset('test-operation');

      // Assert
      const metrics = guard.getMetrics();
      expect(metrics.state).toBe('closed');
      expect(metrics.failureCount).toBe(0);
      expect(metrics.successCount).toBe(0);
      expect(metrics.totalAttempts).toBe(0);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle undefined headers gracefully', async () => {
      // Arrange
      const request = createMockRequest({ headers: undefined });
      const context = createMockExecutionContext(request);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle missing connection information', async () => {
      // Arrange
      const request = createMockRequest({
        connection: undefined,
        socket: undefined,
        headers: { authorization: 'Bearer valid-jwt-token' },
      });
      const context = createMockExecutionContext(request);

      // Act
      await guard.canActivate(context);

      // Assert
      expect(securityMonitoring.recordLoginAttempt).toHaveBeenCalledWith(
        'authenticated-user',
        'unknown', // Fallback IP
        undefined,
        true,
      );
    });

    it('should handle JWT service throwing non-Error objects', async () => {
      // Arrange
      jwtService.verifyAsync.mockRejectedValue('String error');
      const context = createMockExecutionContext();

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow();
    });
  });
});
