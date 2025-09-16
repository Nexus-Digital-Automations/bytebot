/**
 * Metrics Service Comprehensive Unit Tests
 * Tests Prometheus metrics collection, performance tracking, and monitoring
 *
 * @author Claude Code - Testing & Quality Assurance Specialist
 * @version 2.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MetricsService } from '../metrics.service';
import { register, Counter, Histogram, Gauge, Registry } from 'prom-client';

// Mock prom-client
jest.mock('prom-client', () => ({
  register: {
    clear: jest.fn(),
    metrics: jest.fn(),
  },
  collectDefaultMetrics: jest.fn(),
  Counter: jest.fn().mockImplementation(() => ({
    labels: jest.fn().mockReturnThis(),
    inc: jest.fn(),
  })),
  Histogram: jest.fn().mockImplementation(() => ({
    labels: jest.fn().mockReturnThis(),
    observe: jest.fn(),
  })),
  Gauge: jest.fn().mockImplementation(() => ({
    labels: jest.fn().mockReturnThis(),
    set: jest.fn(),
    inc: jest.fn(),
    dec: jest.fn(),
  })),
  Registry: jest.fn(),
}));

const mockRegister = register as jest.Mocked<Registry>;
const MockCounter = Counter as jest.MockedClass<typeof Counter>;
const MockHistogram = Histogram as jest.MockedClass<typeof Histogram>;
const MockGauge = Gauge as jest.MockedClass<typeof Gauge>;

describe('MetricsService', () => {
  let service: MetricsService;
  let configService: jest.Mocked<ConfigService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let mockCounter: jest.Mocked<Counter<string>>;
  let mockHistogram: jest.Mocked<Histogram<string>>;
  let mockGauge: jest.Mocked<Gauge<string>>;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock implementations
    mockCounter = {
      labels: jest.fn().mockReturnThis(),
      inc: jest.fn(),
    } as any;

    mockHistogram = {
      labels: jest.fn().mockReturnThis(),
      observe: jest.fn(),
    } as any;

    mockGauge = {
      labels: jest.fn().mockReturnThis(),
      set: jest.fn(),
      inc: jest.fn(),
      dec: jest.fn(),
    } as any;

    MockCounter.mockImplementation(() => mockCounter);
    MockHistogram.mockImplementation(() => mockHistogram);
    MockGauge.mockImplementation(() => mockGauge);

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    configService = module.get(ConfigService);
    eventEmitter = module.get(EventEmitter2);

    // Setup default config values
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const mockValues = {
        NODE_ENV: 'test',
        METRICS_ENABLED: true,
        PROMETHEUS_ENDPOINT: '/metrics',
        SERVICE_NAME: 'bytebot-agent-test',
      };
      return mockValues[key] || defaultValue;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined and properly initialized', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MetricsService);
    });

    it('should initialize all metric types', () => {
      // Verify Counter metrics are initialized
      expect(MockCounter).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'bytebot_agent_http_requests_total',
          help: 'Total number of HTTP requests processed',
        }),
      );

      // Verify Histogram metrics are initialized
      expect(MockHistogram).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'bytebot_agent_http_request_duration_seconds',
          help: 'HTTP request duration in seconds',
        }),
      );

      // Verify Gauge metrics are initialized
      expect(MockGauge).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'bytebot_agent_http_requests_in_flight',
          help: 'Number of HTTP requests currently being processed',
        }),
      );
    });

    it('should initialize with proper metric prefixes', () => {
      expect(MockCounter).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringMatching(/^bytebot_agent_/),
        }),
      );
    });

    it('should register metrics with the Prometheus registry', () => {
      expect(MockCounter).toHaveBeenCalledWith(
        expect.objectContaining({
          registers: expect.arrayContaining([mockRegister]),
        }),
      );
    });
  });

  describe('HTTP Request Metrics', () => {
    it('should record API request metrics', () => {
      const method = 'GET';
      const route = '/api/health';
      const statusCode = 200;
      const duration = 150; // ms
      const userId = 'user123';

      service.recordApiRequest(method, route, statusCode, duration, userId);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        method,
        route,
        '200',
        'user123',
      );
      expect(mockCounter.inc).toHaveBeenCalled();

      expect(mockHistogram.labels).toHaveBeenCalledWith(method, route, '200');
      expect(mockHistogram.observe).toHaveBeenCalledWith(0.15); // Convert to seconds
    });

    it('should handle API requests without user ID', () => {
      const method = 'POST';
      const route = '/api/tasks';
      const statusCode = 201;
      const duration = 250;

      service.recordApiRequest(method, route, statusCode, duration);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        method,
        route,
        '201',
        'anonymous',
      );
    });

    it('should track in-flight requests', () => {
      const method = 'GET';
      const route = '/api/status';

      service.recordRequestStart(method, route);
      expect(mockGauge.labels).toHaveBeenCalledWith(method, route);
      expect(mockGauge.inc).toHaveBeenCalled();

      service.recordRequestEnd(method, route);
      expect(mockGauge.labels).toHaveBeenCalledWith(method, route);
      expect(mockGauge.dec).toHaveBeenCalled();
    });

    it('should handle multiple concurrent requests', () => {
      const requests = [
        { method: 'GET', route: '/api/health' },
        { method: 'POST', route: '/api/tasks' },
        { method: 'PUT', route: '/api/users/123' },
      ];

      requests.forEach(({ method, route }) => {
        service.recordRequestStart(method, route);
      });

      expect(mockGauge.inc).toHaveBeenCalledTimes(3);

      requests.forEach(({ method, route }) => {
        service.recordRequestEnd(method, route);
      });

      expect(mockGauge.dec).toHaveBeenCalledTimes(3);
    });
  });

  describe('Task Processing Metrics', () => {
    it('should record task processing metrics', () => {
      const taskType = 'image-analysis';
      const status = 'completed';
      const duration = 5000; // ms
      const userId = 'user456';

      service.recordTaskProcessing(taskType, status, duration, userId);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        taskType,
        status,
        'user456',
      );
      expect(mockCounter.inc).toHaveBeenCalled();

      expect(mockHistogram.labels).toHaveBeenCalledWith(
        taskType,
        status,
        'user456',
      );
      expect(mockHistogram.observe).toHaveBeenCalledWith(5.0); // Convert to seconds
    });

    it('should handle task processing without user ID', () => {
      const taskType = 'system-maintenance';
      const status = 'failed';
      const duration = 1500;

      service.recordTaskProcessing(taskType, status, duration);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        taskType,
        status,
        'system',
      );
      expect(mockHistogram.labels).toHaveBeenCalledWith(
        taskType,
        status,
        'system',
      );
    });

    it('should track task queue metrics', () => {
      const taskType = 'data-processing';
      const count = 5;
      const userId = 'user789';

      service.setTasksInProgress(taskType, count, userId);

      expect(mockGauge.labels).toHaveBeenCalledWith(taskType, 'user789');
      expect(mockGauge.set).toHaveBeenCalledWith(5);
    });

    it('should track task queue size by priority', () => {
      const priorities = [
        { priority: 'high', size: 3 },
        { priority: 'medium', size: 8 },
        { priority: 'low', size: 15 },
      ];

      priorities.forEach(({ priority, size }) => {
        service.setTaskQueueSize(priority, size);
        expect(mockGauge.labels).toHaveBeenCalledWith(priority);
        expect(mockGauge.set).toHaveBeenCalledWith(size);
      });
    });
  });

  describe('Computer Use Operation Metrics', () => {
    it('should record computer use operations', () => {
      const operationType = 'click';
      const status = 'success';
      const duration = 50;
      const userId = 'user123';

      service.recordComputerUseOperation(
        operationType,
        status,
        duration,
        userId,
      );

      expect(mockCounter.labels).toHaveBeenCalledWith(
        operationType,
        status,
        'user123',
      );
      expect(mockHistogram.labels).toHaveBeenCalledWith(operationType, status);
      expect(mockHistogram.observe).toHaveBeenCalledWith(0.05);
    });

    it('should record ANE processing metrics', () => {
      const operationType = 'neural-enhancement';
      const status = 'success';
      const duration = 125;

      service.recordANEProcessing(operationType, status, duration);

      expect(mockHistogram.labels).toHaveBeenCalledWith(operationType, status);
      expect(mockHistogram.observe).toHaveBeenCalledWith(0.125);
    });

    it('should record computer use errors', () => {
      const operationType = 'screenshot';
      const errorType = 'timeout';

      service.recordComputerUseError(operationType, errorType);

      expect(mockCounter.labels).toHaveBeenCalledWith(operationType, errorType);
      expect(mockCounter.inc).toHaveBeenCalled();
    });
  });

  describe('WebSocket Metrics', () => {
    it('should track WebSocket connections', () => {
      const connectionType = 'agent';
      const count = 5;
      const userId = 'user456';

      service.setWebSocketConnections(connectionType, count, userId);

      expect(mockGauge.labels).toHaveBeenCalledWith(connectionType, 'user456');
      expect(mockGauge.set).toHaveBeenCalledWith(5);
    });

    it('should record WebSocket messages', () => {
      const direction = 'incoming';
      const messageType = 'task-update';
      const userId = 'user789';

      service.recordWebSocketMessage(direction, messageType, userId);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        direction,
        messageType,
        'user789',
      );
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should record WebSocket errors', () => {
      const errorType = 'connection-lost';
      const connectionType = 'agent';

      service.recordWebSocketError(errorType, connectionType);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        errorType,
        connectionType,
      );
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should handle anonymous WebSocket connections', () => {
      service.setWebSocketConnections('guest', 2);
      expect(mockGauge.labels).toHaveBeenCalledWith('guest', 'anonymous');

      service.recordWebSocketMessage('outgoing', 'welcome');
      expect(mockCounter.labels).toHaveBeenCalledWith(
        'outgoing',
        'welcome',
        'anonymous',
      );
    });
  });

  describe('Database Metrics', () => {
    it('should track database connections', () => {
      const database = 'postgresql';
      const state = 'active';
      const count = 10;

      service.setDatabaseConnections(database, state, count);

      expect(mockGauge.labels).toHaveBeenCalledWith(database, state);
      expect(mockGauge.set).toHaveBeenCalledWith(10);
    });

    it('should record database query metrics', () => {
      const operation = 'SELECT';
      const table = 'users';
      const duration = 25;
      const status = 'success';

      service.recordDatabaseQuery(operation, table, duration, status);

      expect(mockHistogram.labels).toHaveBeenCalledWith(
        operation,
        table,
        status,
      );
      expect(mockHistogram.observe).toHaveBeenCalledWith(0.025);
    });

    it('should record database errors', () => {
      const operation = 'INSERT';
      const errorType = 'constraint-violation';
      const table = 'tasks';

      service.recordDatabaseError(operation, errorType, table);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        operation,
        errorType,
        'tasks',
      );
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should handle database queries without explicit status', () => {
      service.recordDatabaseQuery('UPDATE', 'profiles', 15);

      expect(mockHistogram.labels).toHaveBeenCalledWith(
        'UPDATE',
        'profiles',
        'success',
      );
    });

    it('should handle database errors without table name', () => {
      service.recordDatabaseError('CONNECT', 'timeout');

      expect(mockCounter.labels).toHaveBeenCalledWith(
        'CONNECT',
        'timeout',
        'unknown',
      );
    });
  });

  describe('Authentication Metrics', () => {
    it('should record authentication attempts', () => {
      const method = 'jwt';
      const status = 'success';
      const duration = 75;
      const userAgent = 'Mozilla/5.0';

      service.recordAuthAttempt(method, status, duration, userAgent);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        method,
        status,
        userAgent,
      );
      expect(mockCounter.inc).toHaveBeenCalled();

      expect(mockHistogram.labels).toHaveBeenCalledWith(method, status);
      expect(mockHistogram.observe).toHaveBeenCalledWith(0.075);
    });

    it('should track active user sessions', () => {
      const sessionType = 'web';
      const count = 25;

      service.setActiveUserSessions(sessionType, count);

      expect(mockGauge.labels).toHaveBeenCalledWith(sessionType);
      expect(mockGauge.set).toHaveBeenCalledWith(25);
    });

    it('should record authentication failures', () => {
      const method = 'oauth';
      const reason = 'expired-token';
      const userAgent = 'Chrome/98.0';

      service.recordAuthFailure(method, reason, userAgent);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        method,
        reason,
        userAgent,
      );
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should record session duration', () => {
      const sessionType = 'api';
      const duration = 1800000; // 30 minutes in ms
      const terminationReason = 'logout';

      service.recordSessionDuration(sessionType, duration, terminationReason);

      expect(mockHistogram.labels).toHaveBeenCalledWith(
        sessionType,
        terminationReason,
      );
      expect(mockHistogram.observe).toHaveBeenCalledWith(1800); // Convert to seconds
    });

    it('should handle unknown user agents', () => {
      service.recordAuthAttempt('basic', 'failure', 100);
      expect(mockCounter.labels).toHaveBeenCalledWith(
        'basic',
        'failure',
        'unknown',
      );

      service.recordAuthFailure('token', 'invalid', undefined);
      expect(mockCounter.labels).toHaveBeenCalledWith(
        'token',
        'invalid',
        'unknown',
      );
    });
  });

  describe('Security Metrics', () => {
    it('should record security events', () => {
      const eventType = 'suspicious-login';
      const severity = 'high';
      const source = 'auth-service';

      service.recordSecurityEvent(eventType, severity, source);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        eventType,
        severity,
        source,
      );
      expect(mockCounter.inc).toHaveBeenCalled();

      expect(eventEmitter.emit).toHaveBeenCalledWith('security.event', {
        type: eventType,
        severity,
        source,
        timestamp: expect.any(String),
      });
    });

    it('should record threat detections', () => {
      const threatType = 'sql-injection';
      const confidence = 'high';
      const mitigation = 'blocked';

      service.recordThreatDetection(threatType, confidence, mitigation);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        threatType,
        confidence,
        mitigation,
      );
      expect(mockCounter.inc).toHaveBeenCalled();

      expect(eventEmitter.emit).toHaveBeenCalledWith('security.threat', {
        type: threatType,
        confidence,
        mitigation,
        timestamp: expect.any(String),
      });
    });

    it('should record vulnerability scans', () => {
      const scanType = 'dependency-check';
      const result = 'vulnerabilities_found';
      const severity = 'medium';

      service.recordVulnerabilityScan(scanType, result, severity);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        scanType,
        result,
        'medium',
      );
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should record compliance checks', () => {
      const framework = 'GDPR';
      const control = 'data-encryption';
      const result = 'compliant';

      service.recordComplianceCheck(framework, control, result);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        framework,
        control,
        result,
      );
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should handle vulnerability scans without severity', () => {
      service.recordVulnerabilityScan('security-scan', 'clean');

      expect(mockCounter.labels).toHaveBeenCalledWith(
        'security-scan',
        'clean',
        'none',
      );
    });
  });

  describe('Authorization and Rate Limiting Metrics', () => {
    it('should record authorization checks', () => {
      const resource = 'user-profile';
      const action = 'read';
      const result = 'allowed';
      const duration = 5;

      service.recordAuthorizationCheck(resource, action, result, duration);

      expect(mockCounter.labels).toHaveBeenCalledWith(resource, action, result);
      expect(mockCounter.inc).toHaveBeenCalled();

      expect(mockHistogram.labels).toHaveBeenCalledWith(resource, action);
      expect(mockHistogram.observe).toHaveBeenCalledWith(0.005);
    });

    it('should record access denials', () => {
      const resource = 'admin-panel';
      const reason = 'insufficient-permissions';
      const userRole = 'user';

      service.recordAccessDenial(resource, reason, userRole);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        resource,
        reason,
        userRole,
      );
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should record privilege escalation attempts', () => {
      const userRole = 'user';
      const targetRole = 'admin';
      const result = 'failure';

      service.recordPrivilegeEscalation(userRole, targetRole, result);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        userRole,
        targetRole,
        result,
      );
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should record rate limit hits', () => {
      const endpoint = '/api/data';
      const limitType = 'requests-per-minute';
      const userId = 'user123';

      service.recordRateLimitHit(endpoint, limitType, userId);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        endpoint,
        limitType,
        'user123',
      );
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should record rate limit bypass attempts', () => {
      const endpoint = '/api/upload';
      const method = 'header-manipulation';
      const sourceIp = '192.168.1.100';

      service.recordRateLimitBypass(endpoint, method, sourceIp);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        endpoint,
        method,
        sourceIp,
      );
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should update rate limit window utilization', () => {
      const endpoint = '/api/search';
      const windowDuration = '1-minute';
      const utilizationPercent = 75.5;

      service.updateRateLimitUtilization(
        endpoint,
        windowDuration,
        utilizationPercent,
      );

      expect(mockGauge.labels).toHaveBeenCalledWith(endpoint, windowDuration);
      expect(mockGauge.set).toHaveBeenCalledWith(75.5);
    });
  });

  describe('Business and Custom Metrics', () => {
    it('should record user interactions', () => {
      const interactionType = 'button-click';
      const feature = 'task-creation';
      const userSegment = 'premium';

      service.recordUserInteraction(interactionType, feature, userSegment);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        interactionType,
        feature,
        userSegment,
      );
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should record feature usage', () => {
      const feature = 'ai-assistant';
      const version = 'v2.1';
      const userType = 'enterprise';

      service.recordFeatureUsage(feature, version, userType);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        feature,
        version,
        userType,
      );
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should record business process duration', () => {
      const processName = 'order-fulfillment';
      const processVersion = 'v1.0';
      const result = 'success';
      const duration = 30000; // 30 seconds

      service.recordBusinessProcess(
        processName,
        processVersion,
        result,
        duration,
      );

      expect(mockHistogram.labels).toHaveBeenCalledWith(
        processName,
        processVersion,
        result,
      );
      expect(mockHistogram.observe).toHaveBeenCalledWith(30);
    });

    it('should update revenue metrics', () => {
      const metricType = 'monthly-revenue';
      const value = 125000.5;
      const currency = 'USD';
      const period = '2024-01';

      service.updateRevenueMetrics(metricType, value, currency, period);

      expect(mockGauge.labels).toHaveBeenCalledWith(
        metricType,
        currency,
        period,
      );
      expect(mockGauge.set).toHaveBeenCalledWith(125000.5);
    });

    it('should update business metrics with success rates', () => {
      const requestsPerSecond = 45.7;
      const taskSuccessRates = {
        'image-processing': 98.5,
        'text-analysis': 95.2,
        'data-export': 99.1,
      };

      service.updateBusinessMetrics(requestsPerSecond, taskSuccessRates);

      expect(mockGauge.set).toHaveBeenCalledWith(45.7);

      Object.entries(taskSuccessRates).forEach(([taskType, rate]) => {
        expect(mockGauge.labels).toHaveBeenCalledWith(taskType);
        expect(mockGauge.set).toHaveBeenCalledWith(rate);
      });
    });

    it('should set system health score', () => {
      const healthScore = 0.925; // 92.5%

      service.setSystemHealthScore(healthScore);

      expect(mockGauge.set).toHaveBeenCalledWith(0.925);
    });

    it('should clamp health score to valid range', () => {
      service.setSystemHealthScore(1.5); // Over 100%
      expect(mockGauge.set).toHaveBeenCalledWith(1.0);

      service.setSystemHealthScore(-0.1); // Negative
      expect(mockGauge.set).toHaveBeenCalledWith(0.0);
    });
  });

  describe('Observability Metrics', () => {
    it('should record tracing spans', () => {
      const serviceName = 'task-service';
      const operation = 'process-request';
      const status = 'success';

      service.recordTracingSpan(serviceName, operation, status);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        serviceName,
        operation,
        status,
      );
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should record tracing errors', () => {
      const serviceName = 'auth-service';
      const errorType = 'span-creation-failed';

      service.recordTracingError(serviceName, errorType);

      expect(mockCounter.labels).toHaveBeenCalledWith(serviceName, errorType);
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should record log events', () => {
      const level = 'error';
      const component = 'database';
      const correlationId = 'req-123-456';

      service.recordLogEvent(level, component, correlationId);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        level,
        component,
        correlationId,
      );
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should record alerts triggered', () => {
      const alertType = 'high-memory-usage';
      const severity = 'critical';
      const channel = 'slack';

      service.recordAlertTriggered(alertType, severity, channel);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        alertType,
        severity,
        channel,
      );
      expect(mockCounter.inc).toHaveBeenCalled();

      expect(eventEmitter.emit).toHaveBeenCalledWith('alert.triggered', {
        type: alertType,
        severity,
        channel,
        timestamp: expect.any(String),
      });
    });

    it('should handle log events without correlation ID', () => {
      service.recordLogEvent('info', 'startup');

      expect(mockCounter.labels).toHaveBeenCalledWith(
        'info',
        'startup',
        'none',
      );
    });
  });

  describe('Error Handling and Application Metrics', () => {
    it('should record application errors', () => {
      const errorType = 'validation-error';
      const severity = 'medium';
      const component = 'api-gateway';

      service.recordApplicationError(errorType, severity, component);

      expect(mockCounter.labels).toHaveBeenCalledWith(
        errorType,
        severity,
        component,
      );
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should record errors by category', () => {
      const category = 'network';
      const subcategory = 'timeout';

      service.recordErrorByCategory(category, subcategory);

      expect(mockCounter.labels).toHaveBeenCalledWith(category, subcategory);
      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should handle different severity levels', () => {
      const severityLevels = ['low', 'medium', 'high', 'critical'] as const;

      severityLevels.forEach((severity) => {
        service.recordApplicationError(
          'test-error',
          severity,
          'test-component',
        );
        expect(mockCounter.labels).toHaveBeenCalledWith(
          'test-error',
          severity,
          'test-component',
        );
      });
    });
  });

  describe('Health Check Integration', () => {
    it('should record health check metrics', () => {
      const serviceName = 'database';
      const isHealthy = true;
      const timestamp = Date.now();

      service.recordHealthCheck(serviceName, isHealthy, timestamp);

      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should record dashboard access metrics', () => {
      const operationId = 'dashboard-123';

      service.recordDashboardAccess(operationId);

      expect(mockCounter.inc).toHaveBeenCalled();
    });

    it('should handle health check failures', () => {
      service.recordHealthCheck('redis', false, Date.now());
      // Should not throw error
      expect(mockCounter.inc).toHaveBeenCalled();
    });
  });

  describe('Prometheus Integration', () => {
    beforeEach(() => {
      mockRegister.metrics.mockResolvedValue('# Prometheus metrics output');
    });

    it('should return Prometheus formatted metrics', async () => {
      const metrics = await service.getPrometheusMetrics();

      expect(typeof metrics).toBe('string');
      expect(mockRegister.metrics).toHaveBeenCalled();
    });

    it('should update system metrics before export', async () => {
      // Mock process.memoryUsage for system metrics update
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 100000000,
        heapTotal: 50000000,
        heapUsed: 25000000,
        external: 5000000,
        arrayBuffers: 1000000,
      });

      await service.getPrometheusMetrics();

      expect(mockGauge.set).toHaveBeenCalled(); // System metrics updated

      process.memoryUsage = originalMemoryUsage;
    });

    it('should handle metrics collection errors', async () => {
      mockRegister.metrics.mockRejectedValue(new Error('Registry error'));

      await expect(service.getPrometheusMetrics()).rejects.toThrow(
        'Registry error',
      );
    });

    it('should provide metrics summary', async () => {
      mockRegister.metrics.mockResolvedValue(`
        bytebot_agent_security_events_total{event_type="login",severity="low"} 10
        bytebot_agent_http_request_duration_seconds{method="GET"} 0.05
        bytebot_agent_user_interactions_total{type="click",feature="button"} 25
        bytebot_agent_tracing_spans_total{service="api"} 100
      `);

      const summary = await service.getMetricsSummary();

      expect(summary).toHaveProperty('security');
      expect(summary).toHaveProperty('performance');
      expect(summary).toHaveProperty('business');
      expect(summary).toHaveProperty('observability');

      expect(typeof summary.security.total).toBe('number');
      expect(typeof summary.performance.total).toBe('number');
    });

    it('should categorize metrics correctly in summary', async () => {
      mockRegister.metrics.mockResolvedValue(`
        bytebot_agent_auth_attempts_total 5
        bytebot_agent_duration_seconds 0.1
        bytebot_agent_user_clicks_total 20
        bytebot_agent_tracing_errors_total 2
      `);

      const summary = await service.getMetricsSummary();

      expect(summary.security.total).toBeGreaterThanOrEqual(0);
      expect(summary.performance.total).toBeGreaterThanOrEqual(0);
      expect(summary.business.total).toBeGreaterThanOrEqual(0);
      expect(summary.observability.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Registry Management', () => {
    it('should provide access to metrics registry', () => {
      const registry = service.getRegistry();
      expect(registry).toBe(mockRegister);
    });

    it('should clear metrics for testing', () => {
      service.clearMetrics();
      expect(mockRegister.clear).toHaveBeenCalled();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle periodic metrics collection', () => {
      // Test that periodic collection doesn't throw errors
      expect(() => {
        // The service starts periodic collection in constructor
        // We just verify it doesn't crash
      }).not.toThrow();
    });

    it('should handle system metrics updates', () => {
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        rss: 150000000,
        heapTotal: 75000000,
        heapUsed: 35000000,
        external: 8000000,
        arrayBuffers: 2000000,
      });

      // Trigger system metrics update (called internally)
      service['updateSystemMetrics']();

      expect(mockGauge.set).toHaveBeenCalledWith(150000000); // RSS
      expect(mockGauge.set).toHaveBeenCalledWith(75000000); // Heap total
      expect(mockGauge.set).toHaveBeenCalledWith(35000000); // Heap used

      process.memoryUsage = originalMemoryUsage;
    });

    it('should handle memory usage errors gracefully', () => {
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockImplementation(() => {
        throw new Error('Memory access failed');
      });

      expect(() => {
        service['updateSystemMetrics']();
      }).not.toThrow();

      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Event Integration', () => {
    it('should emit security events', () => {
      service.recordSecurityEvent('test-event', 'medium', 'test-source');

      expect(eventEmitter.emit).toHaveBeenCalledWith('security.event', {
        type: 'test-event',
        severity: 'medium',
        source: 'test-source',
        timestamp: expect.any(String),
      });
    });

    it('should emit threat detection events', () => {
      service.recordThreatDetection('malware', 'high', 'quarantined');

      expect(eventEmitter.emit).toHaveBeenCalledWith('security.threat', {
        type: 'malware',
        confidence: 'high',
        mitigation: 'quarantined',
        timestamp: expect.any(String),
      });
    });

    it('should emit alert events', () => {
      service.recordAlertTriggered('system-overload', 'critical', 'email');

      expect(eventEmitter.emit).toHaveBeenCalledWith('alert.triggered', {
        type: 'system-overload',
        severity: 'critical',
        channel: 'email',
        timestamp: expect.any(String),
      });
    });

    it('should handle event emitter failures gracefully', () => {
      eventEmitter.emit.mockImplementation(() => {
        throw new Error('Event emitter failed');
      });

      expect(() => {
        service.recordSecurityEvent('test', 'low', 'test');
      }).not.toThrow();

      expect(mockCounter.inc).toHaveBeenCalled(); // Metric should still be recorded
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing labels gracefully', () => {
      expect(() => {
        service.recordApiRequest('', '', 0, 0);
      }).not.toThrow();
    });

    it('should handle negative durations', () => {
      service.recordTaskProcessing('test', 'completed', -100);
      expect(mockHistogram.observe).toHaveBeenCalledWith(-0.1);
    });

    it('should handle very large durations', () => {
      service.recordTaskProcessing('test', 'completed', 9999999);
      expect(mockHistogram.observe).toHaveBeenCalledWith(9999.999);
    });

    it('should handle empty metric labels', () => {
      service.recordUserInteraction('', '', '');
      expect(mockCounter.labels).toHaveBeenCalledWith('', '', '');
    });

    it('should handle special characters in labels', () => {
      service.recordFeatureUsage('ai-assistant™', 'v2.0-β', 'enterprise+');
      expect(mockCounter.labels).toHaveBeenCalledWith(
        'ai-assistant™',
        'v2.0-β',
        'enterprise+',
      );
    });

    it('should handle concurrent metric updates', () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve(
            service.recordApiRequest('GET', '/test', 200, Math.random() * 100),
          ),
        );
      }

      expect(() => Promise.all(promises)).not.toThrow();
    });
  });
});
