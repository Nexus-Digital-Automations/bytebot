/**
 * Query Logging Interceptor Comprehensive Test Suite
 * Tests query performance monitoring, slow query detection, metrics collection,
 * and comprehensive logging for database operations
 *
 * Coverage:
 * - Query interception and monitoring
 * - Performance metrics collection and analysis
 * - Slow query detection and alerting
 * - Request context extraction and correlation
 * - Error handling and logging
 * - Query statistics and reporting
 * - Data sanitization and security
 *
 * @author Database Testing Specialist
 * @version 1.0.0
 * @since Comprehensive Database Testing Phase
 */

import { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import {
  QueryLoggingInterceptor,
  QueryMetrics,
  SlowQueryAlert,
} from '../interceptors/query-logging.interceptor';

describe('QueryLoggingInterceptor Comprehensive Test Suite', () => {
  let interceptor: QueryLoggingInterceptor;
  let configService: ConfigService;
  let module: TestingModule;

  // Mock data
  const mockConfig = {
    DB_SLOW_QUERY_THRESHOLD_MS: 1000,
    DB_ENABLE_VERBOSE_LOGGING: false,
    DB_ENABLE_SLOW_QUERY_ALERTS: true,
    DB_MAX_METRICS_HISTORY: 10000,
  };

  // Mock execution context
  const createMockExecutionContext = (
    controllerName = 'TestController',
    methodName = 'findAll',
    requestData = {},
  ): jest.Mocked<ExecutionContext> => {
    const mockRequest = {
      user: { id: 'user123', email: 'test@example.com' },
      sessionId: 'session123',
      route: { path: '/api/test' },
      method: 'GET',
      url: '/api/test',
      headers: {
        'user-agent': 'Test Agent',
        'x-correlation-id': 'corr123',
      },
      ...requestData,
    };

    const mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getHandler: jest.fn().mockReturnValue({ name: methodName }),
      getClass: jest.fn().mockReturnValue({ name: controllerName }),
    } as unknown as jest.Mocked<ExecutionContext>;

    return mockContext;
  };

  // Mock call handler
  const createMockCallHandler = (
    _result: unknown = { _data: 'test' },
    shouldError = false,
  ): jest.Mocked<CallHandler> => {
    const handler = {
      handle: jest.fn(),
    } as jest.Mocked<CallHandler>;

    if (shouldError) {
      handler.handle.mockReturnValue(
        throwError(() => new Error('Database error')),
      );
    } else {
      handler.handle.mockReturnValue(of(result));
    }

    return handler;
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        QueryLoggingInterceptor,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              return mockConfig[key as keyof typeof mockConfig] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    interceptor = module.get<QueryLoggingInterceptor>(QueryLoggingInterceptor);
    configService = module.get<ConfigService>(ConfigService);

    // Clear any existing metrics
    interceptor.clearMetrics();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Interceptor Initialization', () => {
    it('should initialize with configuration values', () => {
      expect(interceptor).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith(
        'DB_SLOW_QUERY_THRESHOLD_MS',
        1000,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'DB_ENABLE_VERBOSE_LOGGING',
        false,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'DB_ENABLE_SLOW_QUERY_ALERTS',
        true,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'DB_MAX_METRICS_HISTORY',
        10000,
      );
    });

    it('should handle missing configuration gracefully', () => {
      configService.get = jest.fn().mockReturnValue(undefined);

      // Create new interceptor instance
      const newInterceptor = new QueryLoggingInterceptor(configService);

      expect(newInterceptor).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith(
        'DB_SLOW_QUERY_THRESHOLD_MS',
        1000,
      );
    });
  });

  describe('Query Interception and Monitoring', () => {
    it('should intercept successful database operations', (done) => {
      const context = createMockExecutionContext('UserController', 'findById');
      const callHandler = createMockCallHandler([{ id: 1, name: 'Test User' }]);

      const result$ = interceptor.intercept(context, callHandler);

      result$.subscribe({
        next: (result) => {
          expect(result).toEqual([{ id: 1, name: 'Test User' }]);

          // Check that metrics were recorded
          const metrics = interceptor.getQueryMetrics();
          expect(metrics).toHaveLength(1);
          expect(metrics[0].queryType).toBe('SELECT');
          expect(metrics[0].success).toBe(true);
          expect(metrics[0].duration).toBeGreaterThanOrEqual(0);
          expect(metrics[0].operationId).toMatch(/^query_\d+_[a-z0-9]{6}$/);
          done();
        },
        _error: done,
      });
    });

    it('should intercept failed database operations', (done) => {
      const context = createMockExecutionContext('UserController', 'create');
      const callHandler = createMockCallHandler(null, true);

      const result$ = interceptor.intercept(context, callHandler);

      result$.subscribe({
        next: () => {
          done(new Error('Should not reach success handler'));
        },
        _error: (error) => {
          expect(error.message).toBe('Database error');

          // Check that error metrics were recorded
          const metrics = interceptor.getQueryMetrics();
          expect(metrics).toHaveLength(1);
          expect(metrics[0].queryType).toBe('INSERT');
          expect(metrics[0].success).toBe(false);
          expect(metrics[0].error).toBe('Database error');
          done();
        },
      });
    });

    it('should measure query execution duration accurately', (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler({ id: 1 });

      // Mock performance.now to simulate time passage
      const originalNow = performance.now;
      let callCount = 0;
      performance.now = jest.fn(() => {
        callCount++;
        return callCount === 1 ? 1000 : 1150; // 150ms execution time
      });

      const result$ = interceptor.intercept(context, callHandler);

      result$.subscribe({
        next: () => {
          const metrics = interceptor.getQueryMetrics();
          expect(metrics[0].duration).toBe(150);

          // Restore original function
          performance.now = originalNow;
          done();
        },
        _error: done,
      });
    });

    it('should extract request context correctly', (done) => {
      const context = createMockExecutionContext(
        'ProductController',
        'update',
        {
          user: { id: 'user456', email: 'test@example.com' },
          sessionId: 'session456',
          headers: {
            'user-agent': 'Custom Agent',
            'x-correlation-id': 'custom-corr',
            'x-user-id': 'header-user',
            'x-session-id': 'header-session',
          },
        },
      );
      const callHandler = createMockCallHandler({ affected: 1 });

      const result$ = interceptor.intercept(context, callHandler);

      result$.subscribe({
        next: () => {
          const metrics = interceptor.getQueryMetrics();
          const requestContext = metrics[0].requestContext;

          expect(requestContext?.userId).toBe('user456');
          expect(requestContext?.sessionId).toBe('session456');
          expect(requestContext?.endpoint).toBe('/api/test');
          expect(requestContext?.method).toBe('GET');
          expect(requestContext?.userAgent).toBe('Custom Agent');
          expect(requestContext?.correlationId).toBe('custom-corr');
          done();
        },
        _error: done,
      });
    });

    it('should handle missing HTTP context gracefully', (done) => {
      const mockContext = {
        switchToHttp: jest.fn().mockImplementation(() => {
          throw new Error('No HTTP context');
        }),
        getHandler: jest.fn().mockReturnValue({ name: 'backgroundTask' }),
        getClass: jest.fn().mockReturnValue({ name: 'BackgroundService' }),
      } as unknown as jest.Mocked<ExecutionContext>;

      const callHandler = createMockCallHandler({ _result: 'background' });

      const result$ = interceptor.intercept(mockContext, callHandler);

      result$.subscribe({
        next: () => {
          const metrics = interceptor.getQueryMetrics();
          const requestContext = metrics[0].requestContext;

          expect(requestContext?.userId).toBe('system');
          expect(requestContext?.endpoint).toBe('background');
          expect(requestContext?.method).toBe('internal');
          done();
        },
        _error: done,
      });
    });
  });

  describe('Query Type Inference', () => {
    it('should infer INSERT query type correctly', (done) => {
      const testCases = [
        ['UserController', 'create'],
        ['ProductService', 'insert'],
        ['OrderController', 'addOrder'],
      ];

      let completedTests = 0;
      const totalTests = testCases.length;

      testCases.forEach(([controller, method]) => {
        const context = createMockExecutionContext(controller, method);
        const callHandler = createMockCallHandler({ id: 1 });

        interceptor.intercept(context, callHandler).subscribe({
          next: () => {
            const metrics = interceptor.getQueryMetrics();
            const lastMetric = metrics[metrics.length - 1];
            expect(lastMetric.queryType).toBe('INSERT');

            completedTests++;
            if (completedTests === totalTests) done();
          },
          _error: done,
        });
      });
    });

    it('should infer UPDATE query type correctly', (done) => {
      const testCases = [
        ['UserController', 'update'],
        ['ProductService', 'modify'],
        ['OrderController', 'editOrder'],
      ];

      let completedTests = 0;
      const totalTests = testCases.length;

      testCases.forEach(([controller, method]) => {
        const context = createMockExecutionContext(controller, method);
        const callHandler = createMockCallHandler({ affected: 1 });

        interceptor.intercept(context, callHandler).subscribe({
          next: () => {
            const metrics = interceptor.getQueryMetrics();
            const lastMetric = metrics[metrics.length - 1];
            expect(lastMetric.queryType).toBe('UPDATE');

            completedTests++;
            if (completedTests === totalTests) done();
          },
          _error: done,
        });
      });
    });

    it('should infer DELETE query type correctly', (done) => {
      const testCases = [
        ['UserController', 'delete'],
        ['ProductService', 'remove'],
      ];

      let completedTests = 0;
      const totalTests = testCases.length;

      testCases.forEach(([controller, method]) => {
        const context = createMockExecutionContext(controller, method);
        const callHandler = createMockCallHandler({ count: 1 });

        interceptor.intercept(context, callHandler).subscribe({
          next: () => {
            const metrics = interceptor.getQueryMetrics();
            const lastMetric = metrics[metrics.length - 1];
            expect(lastMetric.queryType).toBe('DELETE');

            completedTests++;
            if (completedTests === totalTests) done();
          },
          _error: done,
        });
      });
    });

    it('should infer SELECT query type correctly', (done) => {
      const testCases = [
        ['UserController', 'find'],
        ['ProductService', 'get'],
        ['OrderController', 'select'],
      ];

      let completedTests = 0;
      const totalTests = testCases.length;

      testCases.forEach(([controller, method]) => {
        const context = createMockExecutionContext(controller, method);
        const callHandler = createMockCallHandler([{ id: 1 }]);

        interceptor.intercept(context, callHandler).subscribe({
          next: () => {
            const metrics = interceptor.getQueryMetrics();
            const lastMetric = metrics[metrics.length - 1];
            expect(lastMetric.queryType).toBe('SELECT');

            completedTests++;
            if (completedTests === totalTests) done();
          },
          _error: done,
        });
      });
    });

    it('should default to UNKNOWN for unrecognized query types', (done) => {
      const context = createMockExecutionContext(
        'CustomController',
        'customOperation',
      );
      const callHandler = createMockCallHandler({ _result: 'custom' });

      const result$ = interceptor.intercept(context, callHandler);

      result$.subscribe({
        next: () => {
          const metrics = interceptor.getQueryMetrics();
          expect(metrics[0].queryType).toBe('UNKNOWN');
          done();
        },
        _error: done,
      });
    });
  });

  describe('Rows Affected Extraction', () => {
    it('should extract count from Prisma bulk operations', (done) => {
      const context = createMockExecutionContext(
        'UserController',
        'updateMany',
      );
      const callHandler = createMockCallHandler({ count: 5 });

      const result$ = interceptor.intercept(context, callHandler);

      result$.subscribe({
        next: () => {
          const metrics = interceptor.getQueryMetrics();
          expect(metrics[0].rowsAffected).toBe(5);
          done();
        },
        _error: done,
      });
    });

    it('should extract length from array results', (done) => {
      const context = createMockExecutionContext('UserController', 'findMany');
      const callHandler = createMockCallHandler([
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
        { id: 3, name: 'User 3' },
      ]);

      const result$ = interceptor.intercept(context, callHandler);

      result$.subscribe({
        next: () => {
          const metrics = interceptor.getQueryMetrics();
          expect(metrics[0].rowsAffected).toBe(3);
          done();
        },
        _error: done,
      });
    });

    it('should return 1 for single object results', (done) => {
      const context = createMockExecutionContext(
        'UserController',
        'findUnique',
      );
      const callHandler = createMockCallHandler({ id: 1, name: 'User' });

      const result$ = interceptor.intercept(context, callHandler);

      result$.subscribe({
        next: () => {
          const metrics = interceptor.getQueryMetrics();
          expect(metrics[0].rowsAffected).toBe(1);
          done();
        },
        _error: done,
      });
    });

    it('should return undefined for primitive results', (done) => {
      const context = createMockExecutionContext('UserController', 'count');
      const callHandler = createMockCallHandler(42);

      const result$ = interceptor.intercept(context, callHandler);

      result$.subscribe({
        next: () => {
          const metrics = interceptor.getQueryMetrics();
          expect(metrics[0].rowsAffected).toBeUndefined();
          done();
        },
        _error: done,
      });
    });
  });

  describe('Slow Query Detection and Alerting', () => {
    it('should detect and alert on slow queries', (done) => {
      const loggerWarnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      // Mock slow query execution (2000ms > 1000ms threshold)
      const originalNow = performance.now;
      let callCount = 0;
      performance.now = jest.fn(() => {
        callCount++;
        return callCount === 1 ? 1000 : 3000; // 2000ms execution time
      });

      const context = createMockExecutionContext(
        'UserController',
        'complexQuery',
      );
      const callHandler = createMockCallHandler({ results: [] });

      const result$ = interceptor.intercept(context, callHandler);

      result$.subscribe({
        next: () => {
          expect(loggerWarnSpy).toHaveBeenCalledWith(
            'Slow query detected',
            expect.objectContaining({
              query: 'SELECT',
              duration: '2000.00ms',
              threshold: '1000ms',
              slowBy: '1000.00ms',
            }),
          );

          performance.now = originalNow;
          loggerWarnSpy.mockRestore();
          done();
        },
        _error: done,
      });
    });

    it('should not alert when slow query alerts are disabled', (done) => {
      // Create interceptor with disabled alerts
      const noAlertsConfig = {
        ...mockConfig,
        DB_ENABLE_SLOW_QUERY_ALERTS: false,
      };
      configService.get = jest.fn((key: string, defaultValue?: any) => {
        return (
          noAlertsConfig[key as keyof typeof noAlertsConfig] || defaultValue
        );
      });

      const noAlertsInterceptor = new QueryLoggingInterceptor(configService);
      const loggerWarnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      // Mock slow query
      const originalNow = performance.now;
      let callCount = 0;
      performance.now = jest.fn(() => {
        callCount++;
        return callCount === 1 ? 1000 : 3000; // 2000ms execution time
      });

      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler([]);

      const result$ = noAlertsInterceptor.intercept(context, callHandler);

      result$.subscribe({
        next: () => {
          expect(loggerWarnSpy).not.toHaveBeenCalledWith(
            'Slow query detected',
            expect.anything(),
          );

          performance.now = originalNow;
          loggerWarnSpy.mockRestore();
          done();
        },
        _error: done,
      });
    });

    it('should log verbose information when enabled', (done) => {
      // Create interceptor with verbose logging
      const verboseConfig = { ...mockConfig, DB_ENABLE_VERBOSE_LOGGING: true };
      configService.get = jest.fn((key: string, defaultValue?: any) => {
        return verboseConfig[key as keyof typeof verboseConfig] || defaultValue;
      });

      const verboseInterceptor = new QueryLoggingInterceptor(configService);
      const loggerDebugSpy = jest
        .spyOn(Logger.prototype, 'debug')
        .mockImplementation();

      const context = createMockExecutionContext('UserController', 'findById');
      const callHandler = createMockCallHandler({ id: 1 });

      const result$ = verboseInterceptor.intercept(context, callHandler);

      result$.subscribe({
        next: () => {
          expect(loggerDebugSpy).toHaveBeenCalledWith(
            expect.stringContaining('Database operation started'),
            expect.objectContaining({
              queryType: 'SELECT',
              endpoint: '/api/test',
              method: 'GET',
            }),
          );

          loggerDebugSpy.mockRestore();
          done();
        },
        _error: done,
      });
    });
  });

  describe('Query Statistics and Reporting', () => {
    beforeEach((done) => {
      // Add multiple queries with different characteristics
      const queries = [
        {
          controller: 'UserController',
          method: 'findAll',
          _result: [1, 2, 3],
          delay: 100,
        },
        {
          controller: 'UserController',
          method: 'create',
          _result: { id: 1 },
          delay: 200,
        },
        {
          controller: 'OrderController',
          method: 'update',
          _result: { count: 2 },
          delay: 1500,
        }, // Slow
        {
          controller: 'ProductController',
          method: 'delete',
          _result: null,
          delay: 50,
          _error: true,
        },
        {
          controller: 'UserController',
          method: 'findById',
          _result: { id: 1 },
          delay: 80,
        },
      ];

      let completed = 0;
      queries.forEach((query, index) => {
        // Mock performance timing
        const originalNow = performance.now;
        let callCount = 0;
        performance.now = jest.fn(() => {
          callCount++;
          return callCount === 1 ? index * 1000 : index * 1000 + query.delay;
        });

        const context = createMockExecutionContext(
          query.controller,
          query.method,
        );
        const callHandler = createMockCallHandler(query.result, query.error);

        interceptor.intercept(context, callHandler).subscribe({
          next: () => {
            performance.now = originalNow;
            completed++;
            if (completed === queries.length) done();
          },
          _error: () => {
            performance.now = originalNow;
            completed++;
            if (completed === queries.length) done();
          },
        });
      });
    });

    it('should generate comprehensive query statistics', () => {
      const stats = interceptor.getQueryStatistics();

      expect(stats.totalQueries).toBe(5);
      expect(stats.successfulQueries).toBe(4);
      expect(stats.failedQueries).toBe(1);
      expect(stats.slowQueries).toBe(1); // Only the 1500ms query
      expect(stats.errorRate).toBe(20); // 1 out of 5 = 20%
      expect(stats.averageDuration).toBeGreaterThan(0);
      expect(stats.queriesPerMinute).toBeGreaterThan(0);

      expect(stats.queryTypes).toEqual({
        SELECT: 2, // findAll, findById
        INSERT: 1, // create
        UPDATE: 1, // update
        DELETE: 1, // delete
      });
    });

    it('should return empty statistics for no queries', () => {
      interceptor.clearMetrics();

      const stats = interceptor.getQueryStatistics();

      expect(stats.totalQueries).toBe(0);
      expect(stats.successfulQueries).toBe(0);
      expect(stats.failedQueries).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.slowQueries).toBe(0);
      expect(stats.errorRate).toBe(0);
      expect(stats.queriesPerMinute).toBe(0);
      expect(stats.queryTypes).toEqual({});
    });

    it('should generate slow query report', () => {
      const slowReport = interceptor.getSlowQueryReport();

      expect(slowReport.totalSlowQueries).toBe(1);
      expect(slowReport.slowQueryThreshold).toBe(1000);
      expect(slowReport.queries).toHaveLength(1);
      expect(slowReport.queries[0].queryType).toBe('UPDATE');
      expect(slowReport.queries[0].duration).toBe(1500);
      expect(slowReport.queries[0].success).toBe(true);
    });

    it('should sort slow queries by duration in descending order', () => {
      // Add more slow queries with different durations
      const additionalSlowQueries = [
        { duration: 3000, method: 'slowQuery1' },
        { duration: 2000, method: 'slowQuery2' },
        { duration: 1200, method: 'slowQuery3' },
      ];

      let completed = 0;
      additionalSlowQueries.forEach((query, index) => {
        const originalNow = performance.now;
        let callCount = 0;
        performance.now = jest.fn(() => {
          callCount++;
          return callCount === 1
            ? (10 + index) * 1000
            : (10 + index) * 1000 + query.duration;
        });

        const context = createMockExecutionContext(
          'TestController',
          query.method,
        );
        const callHandler = createMockCallHandler({ id: index });

        interceptor.intercept(context, callHandler).subscribe({
          next: () => {
            performance.now = originalNow;
            completed++;
            if (completed === additionalSlowQueries.length) {
              const slowReport = interceptor.getSlowQueryReport();

              expect(slowReport.totalSlowQueries).toBe(4); // Original 1 + 3 new
              expect(slowReport.queries[0].duration).toBe(3000); // Slowest first
              expect(slowReport.queries[1].duration).toBe(2000);
              expect(slowReport.queries[2].duration).toBe(1500);
              expect(slowReport.queries[3].duration).toBe(1200);
            }
          },
          _error: () => {
            performance.now = originalNow;
            completed++;
          },
        });
      });
    });
  });

  describe('Data Sanitization and Security', () => {
    it('should sanitize sensitive data in query results', (done) => {
      const sensitiveResult = {
        id: 1,
        username: 'testuser',
        password: 'secret123',
        apiKey: 'api_key_value',
        userToken: 'token_value',
        passwordHash: 'hash_value',
        secretData: 'confidential',
      };

      const context = createMockExecutionContext(
        'UserController',
        'findWithSensitiveData',
      );
      const callHandler = createMockCallHandler(sensitiveResult);

      // Mock slow query to trigger sanitization in alert context
      const originalNow = performance.now;
      let callCount = 0;
      performance.now = jest.fn(() => {
        callCount++;
        return callCount === 1 ? 1000 : 3000; // 2000ms (slow query)
      });

      const loggerWarnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      const result$ = interceptor.intercept(context, callHandler);

      result$.subscribe({
        next: () => {
          // Check that the logger was called with sanitized data
          const logCall = loggerWarnSpy.mock.calls.find(
            (call) => call[0] === 'Slow query detected',
          );

          expect(logCall).toBeDefined();
          const loggedContext = logCall?.[1].context;

          // Sensitive fields should be redacted
          expect(loggedContext.result.password).toBe('[REDACTED]');
          expect(loggedContext.result.apiKey).toBe('[REDACTED]');
          expect(loggedContext.result.userToken).toBe('[REDACTED]');
          expect(loggedContext.result.passwordHash).toBe('[REDACTED]');
          expect(loggedContext.result.secretData).toBe('[REDACTED]');

          // Non-sensitive fields should remain
          expect(loggedContext.result.id).toBe(1);
          expect(loggedContext.result.username).toBe('testuser');

          performance.now = originalNow;
          loggerWarnSpy.mockRestore();
          done();
        },
        _error: done,
      });
    });

    it('should sanitize arrays of objects', (done) => {
      const sensitiveArray = [
        { id: 1, name: 'User 1', password: 'pass1' },
        { id: 2, name: 'User 2', secretKey: 'secret2' },
      ];

      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(sensitiveArray);

      // Mock slow query to trigger sanitization
      const originalNow = performance.now;
      let callCount = 0;
      performance.now = jest.fn(() => {
        callCount++;
        return callCount === 1 ? 1000 : 3000; // Slow query
      });

      const loggerWarnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      const result$ = interceptor.intercept(context, callHandler);

      result$.subscribe({
        next: () => {
          const logCall = loggerWarnSpy.mock.calls.find(
            (call) => call[0] === 'Slow query detected',
          );

          const loggedArray = logCall?.[1].context.result;

          expect(Array.isArray(loggedArray)).toBe(true);
          expect(loggedArray[0].password).toBe('[REDACTED]');
          expect(loggedArray[1].secretKey).toBe('[REDACTED]');
          expect(loggedArray[0].name).toBe('User 1');
          expect(loggedArray[1].name).toBe('User 2');

          performance.now = originalNow;
          loggerWarnSpy.mockRestore();
          done();
        },
        _error: done,
      });
    });

    it('should handle non-object results safely', (done) => {
      const primitiveResult = 'simple string result';

      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(primitiveResult);

      // Mock slow query
      const originalNow = performance.now;
      let callCount = 0;
      performance.now = jest.fn(() => {
        callCount++;
        return callCount === 1 ? 1000 : 3000;
      });

      const loggerWarnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      const result$ = interceptor.intercept(context, callHandler);

      result$.subscribe({
        next: () => {
          const logCall = loggerWarnSpy.mock.calls.find(
            (call) => call[0] === 'Slow query detected',
          );

          expect(logCall?.[1].context.result).toBe('simple string result');

          performance.now = originalNow;
          loggerWarnSpy.mockRestore();
          done();
        },
        _error: done,
      });
    });
  });

  describe('Metrics History Management', () => {
    it('should maintain maximum metrics history size', () => {
      const maxHistory = 5;

      // Create interceptor with small history limit
      const smallHistoryConfig = {
        ...mockConfig,
        DB_MAX_METRICS_HISTORY: maxHistory,
      };
      configService.get = jest.fn((key: string, defaultValue?: any) => {
        return (
          smallHistoryConfig[key as keyof typeof smallHistoryConfig] ||
          defaultValue
        );
      });

      const limitedInterceptor = new QueryLoggingInterceptor(configService);

      // Add more queries than the limit
      for (let i = 0; i < 10; i++) {
        const context = createMockExecutionContext(
          'TestController',
          `method${i}`,
        );
        const callHandler = createMockCallHandler({ id: i });

        limitedInterceptor.intercept(context, callHandler).subscribe();
      }

      const metrics = limitedInterceptor.getQueryMetrics();
      expect(metrics.length).toBe(maxHistory);

      // Should keep the most recent queries
      expect(metrics[0].queryFingerprint).toBe('TestController.method5');
      expect(metrics[4].queryFingerprint).toBe('TestController.method9');
    });

    it('should clear all metrics when requested', () => {
      // Add some metrics first
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler({ id: 1 });

      interceptor.intercept(context, callHandler).subscribe();
      expect(interceptor.getQueryMetrics().length).toBe(1);

      // Clear metrics
      interceptor.clearMetrics();
      expect(interceptor.getQueryMetrics().length).toBe(0);
    });

    it('should return copy of metrics to prevent external modification', () => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler({ id: 1 });

      interceptor.intercept(context, callHandler).subscribe();

      const metrics1 = interceptor.getQueryMetrics();
      const metrics2 = interceptor.getQueryMetrics();

      expect(metrics1).not.toBe(metrics2); // Different array instances
      expect(metrics1).toEqual(metrics2); // Same content

      // Modifying one shouldn't affect the other
      metrics1.push({} as QueryMetrics);
      expect(metrics2.length).not.toBe(metrics1.length);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null and undefined results gracefully', (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(null);

      const result$ = interceptor.intercept(context, callHandler);

      result$.subscribe({
        next: (result) => {
          expect(result).toBeNull();

          const metrics = interceptor.getQueryMetrics();
          expect(metrics[0].rowsAffected).toBeUndefined();
          done();
        },
        _error: done,
      });
    });

    it('should generate unique operation and connection IDs', () => {
      const operationIds = new Set();
      const connectionIds = new Set();

      for (let i = 0; i < 50; i++) {
        const operationId = (interceptor as any).generateOperationId();
        const connectionId = (interceptor as any).generateConnectionId();

        expect(operationId).toMatch(/^query_\d+_[a-z0-9]{6}$/);
        expect(connectionId).toMatch(/^conn_[a-z0-9]{6}$/);

        expect(operationIds.has(operationId)).toBe(false);
        expect(connectionIds.has(connectionId)).toBe(false);

        operationIds.add(operationId);
        connectionIds.add(connectionId);
      }

      expect(operationIds.size).toBe(50);
      expect(connectionIds.size).toBe(50);
    });

    it('should handle complex nested objects in sanitization', () => {
      const complexObject = {
        user: {
          id: 1,
          profile: {
            name: 'Test',
            credentials: {
              password: 'secret',
              apiKey: 'key123',
            },
          },
        },
        settings: {
          theme: 'dark',
          tokens: ['token1', 'token2'],
        },
      };

      const sanitized = (interceptor as any).sanitizeResult(complexObject);

      expect(sanitized.user.profile.credentials.password).toBe('[REDACTED]');
      expect(sanitized.user.profile.credentials.apiKey).toBe('[REDACTED]');
      expect(sanitized.user.profile.name).toBe('Test');
      expect(sanitized.settings.theme).toBe('dark');
    });
  });
});
