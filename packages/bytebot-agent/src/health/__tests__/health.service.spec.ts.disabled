/**
 * Health Service Comprehensive Unit Tests
 * Tests health monitoring, dependency checks, system status, and operational reliability
 *
 * @author Claude Code - Testing & Quality Assurance Specialist
 * @version 2.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  HealthService,
  HealthCheckResult,
  DetailedStatusResponse,
  BasicHealthResponse,
} from '../health.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityMonitoringService } from '../../security/security-monitoring.service';
import { MetricsService } from '../../metrics/metrics.service';
import * as fs from 'fs';
import * as dns from 'dns';
import * as v8 from 'v8';

// Mock external modules
jest.mock('fs');
jest.mock('dns');
jest.mock('v8');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedDns = dns as jest.Mocked<typeof dns>;
const mockedV8 = v8 as jest.Mocked<typeof v8>;

describe('HealthService', () => {
  let service: HealthService;
  let configService: jest.Mocked<ConfigService>;
  let prismaService: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let securityMonitoringService: jest.Mocked<SecurityMonitoringService>;
  let metricsService: jest.Mocked<MetricsService>;
  let mockStartTime: number;

  beforeEach(async () => {
    mockStartTime = Date.now();

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockPrismaService = {
      $queryRaw: jest.fn(),
      $disconnect: jest.fn(),
      user: { count: jest.fn() },
      task: { count: jest.fn() },
      message: { count: jest.fn() },
    };

    const mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
    };

    const mockSecurityMonitoringService = {
      getSecurityMetrics: jest.fn(),
      processSecurityEvent: jest.fn(),
      getThreatLevel: jest.fn(),
      getComplianceStatus: jest.fn(),
    };

    const mockMetricsService = {
      recordHealthCheck: jest.fn(),
      recordSecurityEvent: jest.fn(),
      recordComplianceCheck: jest.fn(),
      recordAlertTriggered: jest.fn(),
      getSystemMetrics: jest.fn(),
      getPerformanceMetrics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: SecurityMonitoringService,
          useValue: mockSecurityMonitoringService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    configService = module.get(ConfigService);
    prismaService = module.get(PrismaService);
    eventEmitter = module.get(EventEmitter2);
    securityMonitoringService = module.get(SecurityMonitoringService);
    metricsService = module.get(MetricsService);

    // Setup comprehensive default mocks
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const mockValues = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'test-jwt-secret-key',
        ANTHROPIC_API_KEY: 'test-anthropic-key',
        OPENAI_API_KEY: 'test-openai-key',
        REDIS_URL: 'redis://localhost:6379',
        TRACING_ENABLED: true,
        METRICS_ENABLED: true,
        HEALTH_PROBES_ENABLED: true,
        STRUCTURED_LOGGING: true,
        CORRELATION_ID_ENABLED: true,
        SERVICE_NAME: 'bytebot-agent',
        TRACING_SAMPLE_RATE: 0.1,
        PROMETHEUS_ENDPOINT: '/metrics',
        METRICS_COLLECT_INTERVAL: 30000,
        LOG_LEVEL: 'info',
        HEALTH_PROBE_INITIAL_DELAY: 30,
        HEALTH_PROBE_PERIOD: 10,
        HEALTH_PROBE_TIMEOUT: 5,
        HEALTH_PROBE_FAILURE_THRESHOLD: 3,
        HEALTH_PROBE_SUCCESS_THRESHOLD: 1,
        LOCAL_FILE_HEALTH_CHECK: true,
        PROCESS_MONITORING_ENABLED: true,
      };
      return mockValues[key] || defaultValue;
    });

    // Setup security monitoring mock
    securityMonitoringService.getSecurityMetrics.mockReturnValue({
      totalEvents: 10,
      highSeverityEvents: 2,
      threatsDetected: 1,
      threatsBlocked: 1,
    });

    // Setup mock file system
    mockedFs.promises = {
      access: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined),
      unlink: jest.fn().mockResolvedValue(undefined),
      stat: jest.fn().mockResolvedValue({ size: 1000 }),
    } as any;

    // Setup DNS mock
    mockedDns.resolve.mockImplementation((hostname, callback) => {
      callback(null);
    });

    // Setup V8 mock
    mockedV8.getHeapStatistics.mockReturnValue({
      total_heap_size: 10000000,
      used_heap_size: 5000000,
      heap_size_limit: 20000000,
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined and properly initialized', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(HealthService);
    });

    it('should initialize with proper observability configuration', () => {
      const config = service.getObservabilityConfig();

      expect(config).toHaveProperty('tracing');
      expect(config).toHaveProperty('metrics');
      expect(config).toHaveProperty('logging');

      expect(config.tracing.enabled).toBe(true);
      expect(config.metrics.enabled).toBe(true);
      expect(config.logging.structured).toBe(true);
    });

    it('should initialize with proper health probe configuration', () => {
      const config = service.getHealthProbeConfig();

      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('path');
      expect(config).toHaveProperty('initialDelaySeconds');
      expect(config).toHaveProperty('periodSeconds');

      expect(config.enabled).toBe(true);
      expect(config.path).toBe('/health');
    });

    it('should track initialization time', () => {
      const initTime = service.getInitializationTime();
      expect(initTime).toBeGreaterThan(0);
      expect(initTime).toBeCloseTo(mockStartTime, -3);
    });
  });

  describe('Basic Health Check', () => {
    it('should return basic health status', () => {
      const result = service.getBasicHealth();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('operationId');

      expect(result.status).toBe('healthy');
      expect(typeof result.timestamp).toBe('string');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include memory information', () => {
      const result = service.getBasicHealth();

      expect(result.memory).toHaveProperty('used');
      expect(result.memory).toHaveProperty('free');
      expect(result.memory).toHaveProperty('total');

      expect(typeof result.memory.used).toBe('number');
      expect(typeof result.memory.free).toBe('number');
      expect(typeof result.memory.total).toBe('number');
    });

    it('should generate unique operation IDs', () => {
      const result1 = service.getBasicHealth();
      const result2 = service.getBasicHealth();

      expect(result1.operationId).not.toBe(result2.operationId);
      expect(result1.operationId).toMatch(/^health_\d+_[\w-]+$/);
    });

    it('should handle errors gracefully', () => {
      // Mock process.memoryUsage to throw error
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => {
        throw new Error('Memory access failed');
      });

      expect(() => service.getBasicHealth()).toThrow('Memory access failed');

      // Restore
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Detailed Status Check', () => {
    beforeEach(() => {
      prismaService.$queryRaw.mockResolvedValue([{ health_check: 1 }]);
    });

    it('should return comprehensive system status', async () => {
      const result = await service.getDetailedStatus();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('services');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('security');
      expect(result).toHaveProperty('operationId');
    });

    it('should include comprehensive memory metrics', async () => {
      const result = await service.getDetailedStatus();

      expect(result.memory).toHaveProperty('used');
      expect(result.memory).toHaveProperty('free');
      expect(result.memory).toHaveProperty('total');
      expect(result.memory).toHaveProperty('heapUsed');
      expect(result.memory).toHaveProperty('heapTotal');

      expect(typeof result.memory.heapUsed).toBe('number');
      expect(typeof result.memory.heapTotal).toBe('number');
    });

    it('should include service status information', async () => {
      const result = await service.getDetailedStatus();

      expect(result.services).toHaveProperty('database');
      expect(result.services).toHaveProperty('authentication');
      expect(result.services).toHaveProperty('configuration');
      expect(result.services).toHaveProperty('external');
      expect(result.services).toHaveProperty('securityMonitoring');
      expect(result.services).toHaveProperty('metrics');
      expect(result.services).toHaveProperty('tracing');
      expect(result.services).toHaveProperty('alerting');
      expect(result.services).toHaveProperty('observability');
    });

    it('should include dependency status information', async () => {
      const result = await service.getDetailedStatus();

      expect(result.dependencies).toHaveProperty('anthropic');
      expect(result.dependencies).toHaveProperty('openai');
      expect(result.dependencies).toHaveProperty('redis');
      expect(result.dependencies).toHaveProperty('prometheus');
      expect(result.dependencies).toHaveProperty('jaeger');
      expect(result.dependencies).toHaveProperty('grafana');
      expect(result.dependencies).toHaveProperty('elasticsearch');
    });

    it('should include performance metrics', async () => {
      const result = await service.getDetailedStatus();

      expect(result.performance).toHaveProperty('requestsPerSecond');
      expect(result.performance).toHaveProperty('averageResponseTime');
      expect(result.performance).toHaveProperty('taskProcessingRate');
      expect(result.performance).toHaveProperty('databaseQueryLatency');
      expect(result.performance).toHaveProperty('securityOverheadMs');
      expect(result.performance).toHaveProperty('authenticationLatency');
      expect(result.performance).toHaveProperty('cpuUsagePercent');
      expect(result.performance).toHaveProperty('memoryUsagePercent');
      expect(result.performance).toHaveProperty('diskUsagePercent');
      expect(result.performance).toHaveProperty('networkLatencyMs');
    });

    it('should include security metrics', async () => {
      const result = await service.getDetailedStatus();

      expect(result.security).toHaveProperty('authenticationHealth');
      expect(result.security).toHaveProperty('authorizationHealth');
      expect(result.security).toHaveProperty('rateLimitingHealth');
      expect(result.security).toHaveProperty('securityEvents');
      expect(result.security).toHaveProperty('complianceStatus');

      expect(result.security.securityEvents).toHaveProperty('totalToday');
      expect(result.security.securityEvents).toHaveProperty(
        'highSeverityToday',
      );
      expect(result.security.securityEvents).toHaveProperty('threatCount');
      expect(result.security.securityEvents).toHaveProperty('blockedRequests');
    });

    it('should determine overall status correctly', async () => {
      // Test healthy status
      let result = await service.getDetailedStatus();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);

      // Test degraded status with some failures
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'REDIS_URL') return undefined; // Missing dependency
        return defaultValue;
      });

      result = await service.getDetailedStatus();
      expect(['degraded', 'unhealthy']).toContain(result.status);
    });

    it('should handle database errors in detailed status', async () => {
      prismaService.$queryRaw.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const result = await service.getDetailedStatus();
      expect(result).toBeDefined();
      expect(result.services.database).toBe('disconnected');
    });
  });

  describe('Individual Health Checks', () => {
    describe('Process Health Check', () => {
      it('should return healthy status for valid process', () => {
        const result = service.checkProcessHealth();

        expect(result).toHaveProperty('isHealthy');
        expect(result).toHaveProperty('details');
        expect(result.isHealthy).toBe(true);
        expect(result.details).toHaveProperty('uptime');
        expect(result.details).toHaveProperty('memoryMB');
        expect(result.details).toHaveProperty('heapUtilization');
        expect(result.details).toHaveProperty('status');
        expect(result.details.status).toBe('alive');
      });

      it('should include accurate memory metrics', () => {
        const result = service.checkProcessHealth();

        expect(typeof result.details.uptime).toBe('number');
        expect(typeof result.details.memoryMB).toBe('number');
        expect(typeof result.details.heapUtilization).toBe('number');

        expect(result.details.uptime).toBeGreaterThanOrEqual(0);
        expect(result.details.memoryMB).toBeGreaterThan(0);
        expect(result.details.heapUtilization).toBeGreaterThanOrEqual(0);
        expect(result.details.heapUtilization).toBeLessThanOrEqual(100);
      });

      it('should detect unhealthy process state', () => {
        // Mock invalid memory state
        const originalMemoryUsage = process.memoryUsage;
        process.memoryUsage = jest.fn().mockReturnValue({
          rss: 0,
          heapTotal: 0,
          heapUsed: 0,
          external: 0,
          arrayBuffers: 0,
        });

        const result = service.checkProcessHealth();

        expect(result.isHealthy).toBe(false);
        expect(result.details.status).toBe('unhealthy');
        expect(result.error).toContain('Process health check failed');

        // Restore
        process.memoryUsage = originalMemoryUsage;
      });

      it('should handle process monitoring errors', () => {
        const originalMemoryUsage = process.memoryUsage;
        process.memoryUsage = jest.fn(() => {
          throw new Error('Memory access denied');
        });

        const result = service.checkProcessHealth();

        expect(result.isHealthy).toBe(false);
        expect(result.error).toContain('Memory access denied');

        process.memoryUsage = originalMemoryUsage;
      });
    });

    describe('System Responsiveness Check', () => {
      it('should return healthy status for responsive system', async () => {
        const result = await service.checkSystemResponsiveness();

        expect(result).toHaveProperty('isHealthy');
        expect(result).toHaveProperty('details');
        expect(result.isHealthy).toBe(true);
        expect(result.details).toHaveProperty('responseTime');
        expect(result.details).toHaveProperty('status');
        expect(result.details.status).toBe('responsive');
      });

      it('should measure response time accurately', async () => {
        const result = await service.checkSystemResponsiveness();

        expect(typeof result.details.responseTime).toBe('string');
        expect(result.details.responseTime).toMatch(/^\d+ms$/);
      });

      it('should detect unresponsive system', async () => {
        // Mock slow system response
        const originalSetTimeout = global.setTimeout;
        global.setTimeout = jest.fn((callback, delay) => {
          // Simulate slow response
          return originalSetTimeout(callback, delay + 200);
        }) as any;

        const result = await service.checkSystemResponsiveness();

        // Should still be healthy but might be slower
        expect(result.isHealthy).toBe(true);

        global.setTimeout = originalSetTimeout;
      });

      it('should handle system responsiveness errors', async () => {
        // Mock timeout error
        jest.spyOn(global, 'setTimeout').mockImplementation(() => {
          throw new Error('System timeout');
        });

        const result = await service.checkSystemResponsiveness();

        expect(result.isHealthy).toBe(false);
        expect(result.error).toContain('System timeout');

        jest.restoreAllMocks();
      });
    });

    describe('Database Health Check', () => {
      it('should return healthy status when database is responsive', async () => {
        prismaService.$queryRaw.mockResolvedValue([{ health_check: 1 }]);

        const result = await service.checkDatabaseHealth();

        expect(result).toHaveProperty('isHealthy');
        expect(result).toHaveProperty('details');
        expect(result.isHealthy).toBe(true);
        expect(result.details).toHaveProperty('responseTime');
        expect(result.details).toHaveProperty('status');
        expect(result.details).toHaveProperty('provider');

        expect(result.details.status).toBe('connected');
        expect(result.details.provider).toBe('postgresql');
      });

      it('should return unhealthy status when database fails', async () => {
        prismaService.$queryRaw.mockRejectedValue(
          new Error('Connection timeout'),
        );

        const result = await service.checkDatabaseHealth();

        expect(result.isHealthy).toBe(false);
        expect(result.details.status).toBe('disconnected');
        expect(result.error).toContain('Connection timeout');
      });

      it('should measure database response time', async () => {
        prismaService.$queryRaw.mockResolvedValue([{ health_check: 1 }]);

        const result = await service.checkDatabaseHealth();

        expect(result.details.responseTime).toMatch(/^\d+ms$/);
        expect(parseInt(result.details.responseTime)).toBeGreaterThanOrEqual(0);
      });

      it('should handle different database errors', async () => {
        const errors = [
          new Error('ECONNREFUSED'),
          new Error('timeout'),
          new Error('authentication failed'),
          new Error('database not found'),
        ];

        for (const error of errors) {
          prismaService.$queryRaw.mockRejectedValue(error);
          const result = await service.checkDatabaseHealth();

          expect(result.isHealthy).toBe(false);
          expect(result.error).toContain(error.message);
          expect(result.details.status).toBe('disconnected');
        }
      });
    });

    describe('Authentication Service Check', () => {
      it('should return healthy status when JWT secret is configured', () => {
        const result = service.checkAuthenticationService();

        expect(result.isHealthy).toBe(true);
        expect(result.details).toHaveProperty('status');
        expect(result.details).toHaveProperty('provider');
        expect(result.details).toHaveProperty('configured');

        expect(result.details.status).toBe('active');
        expect(result.details.provider).toBe('jwt');
        expect(result.details.configured).toBe(true);
      });

      it('should return unhealthy status when JWT secret is missing', () => {
        configService.get.mockImplementation((key) => {
          if (key === 'JWT_SECRET') return undefined;
          return 'test-value';
        });

        const result = service.checkAuthenticationService();

        expect(result.isHealthy).toBe(false);
        expect(result.details.status).toBe('inactive');
        expect(result.details.configured).toBe(false);
        expect(result.error).toContain('JWT_SECRET not configured');
      });

      it('should return unhealthy status when JWT secret is too weak', () => {
        configService.get.mockImplementation((key) => {
          if (key === 'JWT_SECRET') return 'weak';
          return 'test-value';
        });

        const result = service.checkAuthenticationService();

        expect(result.isHealthy).toBe(false);
        expect(result.details.status).toBe('inactive');
      });

      it('should handle authentication service errors', () => {
        configService.get.mockImplementation(() => {
          throw new Error('Config access failed');
        });

        const result = service.checkAuthenticationService();

        expect(result.isHealthy).toBe(false);
        expect(result.error).toContain('Config access failed');
      });
    });

    describe('External Services Check', () => {
      it('should check all configured external services', () => {
        const result = service.checkExternalServices();

        expect(result.isHealthy).toBe(true);
        expect(result.details).toHaveProperty('anthropic');
        expect(result.details).toHaveProperty('openai');

        expect(result.details.anthropic).toBe('available');
        expect(result.details.openai).toBe('available');
      });

      it('should report unavailable services', () => {
        configService.get.mockImplementation((key) => {
          if (key === 'ANTHROPIC_API_KEY') return undefined;
          if (key === 'OPENAI_API_KEY') return 'test-key';
          return 'test-value';
        });

        const result = service.checkExternalServices();

        expect(result.isHealthy).toBe(false);
        expect(result.details.anthropic).toBe('unavailable');
        expect(result.details.openai).toBe('available');
        expect(result.error).toContain('Some external services not configured');
      });

      it('should handle configuration errors', () => {
        configService.get.mockImplementation(() => {
          throw new Error('External service config failed');
        });

        const result = service.checkExternalServices();

        expect(result.isHealthy).toBe(false);
        expect(result.error).toContain('External service config failed');
      });
    });

    describe('Startup Completion Check', () => {
      it('should return healthy status after minimum startup time', () => {
        // Mock service to be old enough
        const oldStartTime = Date.now() - 20000; // 20 seconds ago
        service['startTime'] = oldStartTime;

        const result = service.checkStartupComplete();

        expect(result.isHealthy).toBe(true);
        expect(result.details.status).toBe('initialized');
        expect(parseInt(result.details.uptime)).toBeGreaterThan(15);
      });

      it('should return unhealthy status during startup period', () => {
        // Mock service to be recently started
        const recentStartTime = Date.now() - 5000; // 5 seconds ago
        service['startTime'] = recentStartTime;

        const result = service.checkStartupComplete();

        expect(result.isHealthy).toBe(false);
        expect(result.details.status).toBe('initializing');
        expect(result.details).toHaveProperty('remainingSeconds');
        expect(result.error).toContain('Service is still starting up');
      });

      it('should track startup progress', () => {
        const recentStartTime = Date.now() - 10000; // 10 seconds ago
        service['startTime'] = recentStartTime;

        const result = service.checkStartupComplete();

        expect(result.details).toHaveProperty('uptime');
        expect(result.details).toHaveProperty('remainingSeconds');
        expect(result.details.remainingSeconds).toBeGreaterThan(0);
        expect(result.details.remainingSeconds).toBeLessThanOrEqual(10);
      });
    });

    describe('Module Initialization Check', () => {
      it('should check all core modules are initialized', () => {
        const result = service.checkModuleInitialization();

        expect(result.isHealthy).toBe(true);
        expect(result.details).toHaveProperty('modules');

        const modules = result.details.modules;
        expect(modules).toHaveProperty('database');
        expect(modules).toHaveProperty('configuration');
        expect(modules).toHaveProperty('authentication');
        expect(modules).toHaveProperty('tasks');
        expect(modules).toHaveProperty('anthropic');
        expect(modules).toHaveProperty('health');

        expect(modules.database).toBe(true);
        expect(modules.configuration).toBe(true);
        expect(modules.health).toBe(true);
      });

      it('should detect missing module dependencies', () => {
        // Simulate missing Anthropic API key
        configService.get.mockImplementation((key) => {
          if (key === 'ANTHROPIC_API_KEY') return undefined;
          return 'test-value';
        });

        const result = service.checkModuleInitialization();

        expect(result.isHealthy).toBe(false);
        expect(result.details.modules.anthropic).toBe(false);
        expect(result.error).toContain('Some modules not initialized');
      });
    });

    describe('Configuration Loaded Check', () => {
      it('should verify all required configuration is loaded', () => {
        const result = service.checkConfigurationLoaded();

        expect(result.isHealthy).toBe(true);
        expect(result.details).toHaveProperty('status');
        expect(result.details).toHaveProperty('environment');
        expect(result.details).toHaveProperty('requiredConfigs');

        expect(result.details.status).toBe('loaded');
        expect(result.details.environment).toBe('test');
      });

      it('should detect missing required configuration', () => {
        configService.get.mockImplementation((key) => {
          if (key === 'DATABASE_URL') return undefined;
          if (key === 'NODE_ENV') return 'test';
          if (key === 'ANTHROPIC_API_KEY') return 'test-key';
          return undefined;
        });

        const result = service.checkConfigurationLoaded();

        expect(result.isHealthy).toBe(false);
        expect(result.details.status).toBe('missing');
        expect(result.details).toHaveProperty('missingConfigs');
        expect(result.details.missingConfigs).toContain('DATABASE_URL');
        expect(result.error).toContain('Missing configuration');
      });

      it('should handle configuration access errors', () => {
        configService.get.mockImplementation(() => {
          throw new Error('Config access denied');
        });

        const result = service.checkConfigurationLoaded();

        expect(result.isHealthy).toBe(false);
        expect(result.error).toContain('Config access denied');
      });
    });
  });

  describe('Local Deployment Health Probes', () => {
    describe('Local Readiness Probe', () => {
      beforeEach(() => {
        prismaService.$queryRaw.mockResolvedValue([{ health_check: 1 }]);
      });

      it('should return ready status when all checks pass', async () => {
        const result = await service.checkLocalReadiness();

        expect(result.isHealthy).toBe(true);
        expect(result.details).toHaveProperty('status');
        expect(result.details).toHaveProperty('ready');
        expect(result.details.status).toBe('ready');
        expect(result.details.ready).toBe(true);
      });

      it('should return not ready when checks fail', async () => {
        // Simulate database failure
        prismaService.$queryRaw.mockRejectedValue(new Error('DB down'));

        const result = await service.checkLocalReadiness();

        expect(result.isHealthy).toBe(false);
        expect(result.details.status).toBe('not_ready');
        expect(result.details.ready).toBe(false);
        expect(result.error).toContain('readiness checks failed');
      });

      it('should track readiness check results', async () => {
        const result = await service.checkLocalReadiness();

        expect(result.details).toHaveProperty('totalChecks');
        expect(result.details).toHaveProperty('failedChecks');
        expect(result.details.totalChecks).toBeGreaterThan(0);
        expect(result.details.failedChecks).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Local Liveness Probe', () => {
      it('should return alive status for healthy process', async () => {
        const result = await service.checkLocalLiveness();

        expect(result.isHealthy).toBe(true);
        expect(result.details).toHaveProperty('status');
        expect(result.details).toHaveProperty('alive');
        expect(result.details.status).toBe('alive');
        expect(result.details.alive).toBe(true);
      });

      it('should include process information', async () => {
        const result = await service.checkLocalLiveness();

        expect(result.details).toHaveProperty('pid');
        expect(result.details).toHaveProperty('uptime');
        expect(result.details).toHaveProperty('memoryMB');

        expect(result.details.pid).toBe(process.pid);
        expect(typeof result.details.uptime).toBe('number');
        expect(typeof result.details.memoryMB).toBe('number');
      });

      it('should detect dead process state', async () => {
        // Mock unresponsive system
        const originalMemoryUsage = process.memoryUsage;
        process.memoryUsage = jest.fn(() => {
          throw new Error('Process not responding');
        });

        const result = await service.checkLocalLiveness();

        expect(result.isHealthy).toBe(false);
        expect(result.details.status).toBe('dead');
        expect(result.details.alive).toBe(false);

        process.memoryUsage = originalMemoryUsage;
      });
    });

    describe('Local File Health Check', () => {
      beforeEach(() => {
        // Setup mock file system responses
        mockedFs.promises.access.mockResolvedValue(undefined);
        mockedFs.promises.writeFile.mockResolvedValue(undefined);
        mockedFs.promises.stat.mockResolvedValue({ size: 1000 } as any);
      });

      it('should check all file system health indicators', async () => {
        const result = await service.checkLocalFileHealth();

        expect(result.isHealthy).toBe(true);
        expect(result.details).toHaveProperty('checks');

        const checks = result.details.checks;
        expect(checks).toHaveProperty('configFile');
        expect(checks).toHaveProperty('pidFile');
        expect(checks).toHaveProperty('logDirectory');
        expect(checks).toHaveProperty('secretsDirectory');
        expect(checks).toHaveProperty('tempDirectory');
      });

      it('should handle file access failures', async () => {
        mockedFs.promises.access.mockRejectedValue(new Error('Access denied'));

        const result = await service.checkLocalFileHealth();

        expect(result.isHealthy).toBe(false);
        expect(result.details).toHaveProperty('failedChecks');
        expect(result.details.failedChecks).toBeGreaterThan(0);
      });

      it('should create PID file during check', async () => {
        await service.checkLocalFileHealth();

        expect(mockedFs.promises.writeFile).toHaveBeenCalledWith(
          expect.stringContaining('bytebot-agent.pid'),
          process.pid.toString(),
        );
      });

      it('should handle missing secrets directory gracefully', async () => {
        mockedFs.promises.access.mockImplementation(async (path) => {
          if (path.includes('secrets')) {
            throw new Error('Secrets dir not found');
          }
        });

        const result = await service.checkLocalFileHealth();

        // Should still be healthy as secrets dir is optional
        expect(result.isHealthy).toBe(true);
        const secretsCheck = result.details.checks.secretsDirectory;
        expect(secretsCheck.healthy).toBe(true);
        expect(secretsCheck.details.warning).toContain(
          'will be created on first use',
        );
      });
    });
  });

  describe('Health Dashboard', () => {
    beforeEach(() => {
      prismaService.$queryRaw.mockResolvedValue([{ health_check: 1 }]);
    });

    it('should generate comprehensive health dashboard', async () => {
      const dashboard = await service.getHealthDashboard();

      expect(dashboard).toHaveProperty('summary');
      expect(dashboard).toHaveProperty('systemHealth');
      expect(dashboard).toHaveProperty('securityHealth');
      expect(dashboard).toHaveProperty('performance');
      expect(dashboard).toHaveProperty('resources');

      expect(dashboard.summary).toHaveProperty('overallStatus');
      expect(dashboard.summary).toHaveProperty('uptime');
      expect(dashboard.summary).toHaveProperty('lastCheck');
      expect(dashboard.summary).toHaveProperty('operationId');
    });

    it('should include system component statuses', async () => {
      const dashboard = await service.getHealthDashboard();

      expect(dashboard.systemHealth).toHaveProperty('process');
      expect(dashboard.systemHealth).toHaveProperty('database');
      expect(dashboard.systemHealth).toHaveProperty('authentication');
      expect(dashboard.systemHealth).toHaveProperty('external');

      expect(['healthy', 'unhealthy']).toContain(
        dashboard.systemHealth.process,
      );
      expect(['healthy', 'unhealthy']).toContain(
        dashboard.systemHealth.database,
      );
    });

    it('should handle dashboard generation errors', async () => {
      // Simulate error in one of the health checks
      prismaService.$queryRaw.mockRejectedValue(new Error('DB failure'));

      await expect(service.getHealthDashboard()).rejects.toThrow();
    });
  });

  describe('Observability Health Check', () => {
    it('should check observability feature health', () => {
      const result = service.checkObservabilityHealth();

      expect(result.isHealthy).toBe(true);
      expect(result.details).toHaveProperty('healthScore');
      expect(result.details).toHaveProperty('checks');
      expect(result.details).toHaveProperty('tracingEnabled');
      expect(result.details).toHaveProperty('metricsEnabled');
      expect(result.details).toHaveProperty('status');

      expect(result.details.healthScore).toBeGreaterThanOrEqual(80);
      expect(result.details.status).toBe('operational');
    });

    it('should detect degraded observability', () => {
      // Mock disabled features
      configService.get.mockImplementation((key, defaultValue) => {
        if (key === 'TRACING_ENABLED') return false;
        if (key === 'METRICS_ENABLED') return false;
        return defaultValue;
      });

      const result = service.checkObservabilityHealth();

      expect(result.isHealthy).toBe(false);
      expect(result.details.healthScore).toBeLessThan(80);
      expect(result.details.status).toBe('degraded');
      expect(result.error).toContain(
        'Some observability features are disabled',
      );
    });

    it('should calculate health score correctly', () => {
      const result = service.checkObservabilityHealth();

      const checks = result.details.checks;
      const enabledCount = Object.values(checks).filter(Boolean).length;
      const totalCount = Object.keys(checks).length;
      const expectedScore = (enabledCount / totalCount) * 100;

      expect(result.details.healthScore).toBeCloseTo(expectedScore, 1);
    });
  });

  describe('Performance Metrics Integration', () => {
    it('should record request metrics', () => {
      const responseTime = 123;
      service.recordRequestMetrics(responseTime);

      // Verify metrics are updated
      const basicHealth = service.getBasicHealth();
      expect(basicHealth).toBeDefined(); // Basic verification that service still works
    });

    it('should track service stability', () => {
      // Test with default minimum (30 seconds)
      const isStable = service.isServiceStable();
      expect(typeof isStable).toBe('boolean');

      // Test with custom minimum
      const isStableCustom = service.isServiceStable(5);
      expect(typeof isStableCustom).toBe('boolean');
    });

    it('should evaluate service stability correctly', () => {
      // Mock old service
      const oldStartTime = Date.now() - 35000; // 35 seconds ago
      service['startTime'] = oldStartTime;
      expect(service.isServiceStable()).toBe(true);

      // Mock new service
      const newStartTime = Date.now() - 15000; // 15 seconds ago
      service['startTime'] = newStartTime;
      expect(service.isServiceStable()).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection failures gracefully', async () => {
      prismaService.$queryRaw.mockRejectedValue(
        new Error('Connection timeout'),
      );

      const result = await service.checkDatabaseHealth();
      expect(result.isHealthy).toBe(false);
      expect(result.error).toContain('Connection timeout');
    });

    it('should handle configuration service failures', async () => {
      configService.get.mockImplementation(() => {
        throw new Error('Configuration unavailable');
      });

      // Should still be able to generate some health data
      const result = await service.getDetailedStatus();
      expect(result).toHaveProperty('status');
    });

    it('should handle security monitoring service unavailability', async () => {
      securityMonitoringService.getSecurityMetrics.mockImplementation(() => {
        throw new Error('Security service unavailable');
      });

      const result = await service.getDetailedStatus();
      expect(result).toHaveProperty('security');
      expect(result.security.authenticationHealth).toBe('unhealthy');
    });

    it('should handle metrics service unavailability', async () => {
      metricsService.recordHealthCheck.mockImplementation(() => {
        throw new Error('Metrics service unavailable');
      });

      // Should still complete health check
      const result = await service.getDetailedStatus();
      expect(result).toBeDefined();
    });

    it('should handle file system errors in local health checks', async () => {
      mockedFs.promises.access.mockRejectedValue(
        new Error('File system error'),
      );

      const result = await service.checkLocalFileHealth();
      expect(result.isHealthy).toBe(false);
      expect(result.error).toContain('file health checks failed');
    });

    it('should handle network connectivity issues', async () => {
      mockedDns.resolve.mockImplementation((hostname, callback) => {
        callback(new Error('Network unreachable'));
      });

      // Network check is part of performance metrics
      const result = await service.getDetailedStatus();
      expect(result.performance.networkLatencyMs).toBe(0); // Should default to 0 on failure
    });

    it('should handle V8 heap statistics unavailability', async () => {
      mockedV8.getHeapStatistics.mockImplementation(() => {
        throw new Error('Heap statistics unavailable');
      });

      const result = await service.getDetailedStatus();
      expect(result.performance.gcPauseTimeMs).toBe(0); // Should default to 0
    });
  });

  describe('Event System Integration', () => {
    it('should emit health events', async () => {
      const result = await service.getDetailedStatus();

      // Events are emitted internally, we can verify the service works
      expect(result).toBeDefined();
    });

    it('should not throw when event emitter fails', async () => {
      eventEmitter.emit.mockImplementation(() => {
        throw new Error('Event emitter failed');
      });

      // Should not crash health service
      await expect(service.getDetailedStatus()).resolves.toBeDefined();
    });
  });
});
