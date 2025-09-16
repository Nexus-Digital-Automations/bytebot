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
import { HealthService, HealthCheckResult, DetailedStatusResponse, BasicHealthResponse } from '../health.service';
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
        'NODE_ENV': 'test',
        'DATABASE_URL': 'postgresql://localhost:5432/test',
        'JWT_SECRET': 'test-jwt-secret-key',
        'ANTHROPIC_API_KEY': 'test-anthropic-key',
        'OPENAI_API_KEY': 'test-openai-key',
        'REDIS_URL': 'redis://localhost:6379',
        'TRACING_ENABLED': true,
        'METRICS_ENABLED': true,
        'HEALTH_PROBES_ENABLED': true,
        'STRUCTURED_LOGGING': true,
        'CORRELATION_ID_ENABLED': true,
        'SERVICE_NAME': 'bytebot-agent',
        'TRACING_SAMPLE_RATE': 0.1,
        'PROMETHEUS_ENDPOINT': '/metrics',
        'METRICS_COLLECT_INTERVAL': 30000,
        'LOG_LEVEL': 'info',
        'HEALTH_PROBE_INITIAL_DELAY': 30,
        'HEALTH_PROBE_PERIOD': 10,
        'HEALTH_PROBE_TIMEOUT': 5,
        'HEALTH_PROBE_FAILURE_THRESHOLD': 3,
        'HEALTH_PROBE_SUCCESS_THRESHOLD': 1,
        'LOCAL_FILE_HEALTH_CHECK': true,
        'PROCESS_MONITORING_ENABLED': true,
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
      expect(result.security.securityEvents).toHaveProperty('highSeverityToday');
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
      prismaService.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

      const result = await service.getDetailedStatus();
      expect(result).toBeDefined();
      expect(result.services.database).toBe('disconnected');
    });
  });

  describe('checkSystemResponsiveness', () => {
    it('should return healthy status for responsive system', async () => {
      // Act
      const result = await service.checkSystemResponsiveness();

      // Assert
      expect(result).toHaveProperty('isHealthy');
      expect(result).toHaveProperty('details');
      expect(result.isHealthy).toBe(true);
    });

    it('should measure system response time', async () => {
      // Act
      const result = await service.checkSystemResponsiveness();

      // Assert
      expect(result.details).toHaveProperty('responseTime');
      expect(typeof result.details.responseTime).toBe('number');
      expect(result.details.responseTime).toBeGreaterThan(0);
    });
  });

  describe('checkDatabaseHealth', () => {
    it('should return healthy status when database is responsive', async () => {
      // Arrange
      prismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // Act
      const result = await service.checkDatabaseHealth();

      // Assert
      expect(result).toHaveProperty('isHealthy');
      expect(result).toHaveProperty('details');
      expect(result.isHealthy).toBe(true);
    });

    it('should return unhealthy status when database fails', async () => {
      // Arrange
      prismaService.$queryRaw.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act
      const result = await service.checkDatabaseHealth();

      // Assert
      expect(result).toHaveProperty('isHealthy');
      expect(result).toHaveProperty('error');
      expect(result.isHealthy).toBe(false);
    });

    it('should measure database response time', async () => {
      // Arrange
      prismaService.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // Act
      const result = await service.checkDatabaseHealth();

      // Assert
      expect(result.details).toHaveProperty('responseTime');
      expect(typeof result.details.responseTime).toBe('number');
      expect(result.details.responseTime).toBeGreaterThan(0);
    });
  });

  describe('checkProcessHealth', () => {
    it('should return process health information', () => {
      // Act
      const result = service.checkProcessHealth();

      // Assert
      expect(result).toHaveProperty('isHealthy');
      expect(result).toHaveProperty('details');
      expect(result.isHealthy).toBe(true);
    });

    it('should include memory usage information', () => {
      // Act
      const result = service.checkProcessHealth();

      // Assert
      expect(result.details).toHaveProperty('memory');
      expect(result.details.memory).toHaveProperty('rss');
      expect(result.details.memory).toHaveProperty('heapTotal');
      expect(result.details.memory).toHaveProperty('heapUsed');
    });

    it('should include process uptime', () => {
      // Act
      const result = service.checkProcessHealth();

      // Assert
      expect(result.details).toHaveProperty('uptime');
      expect(typeof result.details.uptime).toBe('number');
      expect(result.details.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Service Instance', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should be an instance of HealthService', () => {
      expect(service).toBeInstanceOf(HealthService);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      // Arrange
      prismaService.$queryRaw.mockRejectedValue(
        new Error('Connection timeout'),
      );

      // Act
      const result = await service.checkDatabaseHealth();

      // Assert
      expect(result.isHealthy).toBe(false);
      expect(result.error).toContain('Connection timeout');
    });

    it('should handle configuration errors gracefully', async () => {
      // Arrange
      configService.get.mockImplementation(() => {
        throw new Error('Configuration unavailable');
      });
      prismaService.$queryRaw.mockResolvedValue([{ count: 1 }]);

      // Act
      const result = await service.getDetailedStatus();

      // Assert
      expect(result).toHaveProperty('status');
      // Should still return status even if configuration fails
    });
  });
});
