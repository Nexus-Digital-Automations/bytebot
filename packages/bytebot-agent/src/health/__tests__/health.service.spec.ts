/**
 * Health Service Unit Tests - Testing for actual HealthService implementation
 * Tests health monitoring, dependency checks, and status reporting
 *
 * @author Testing & Quality Assurance Specialist
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HealthService } from '../health.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityMonitoringService } from '../../security/security-monitoring.service';
import { MetricsService } from '../../metrics/metrics.service';

describe('HealthService', () => {
  let service: HealthService;
  let configService: jest.Mocked<ConfigService>;
  let prismaService: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let securityMonitoringService: jest.Mocked<SecurityMonitoringService>;
  let metricsService: jest.Mocked<MetricsService>;

  beforeEach(async () => {
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
    };

    const mockSecurityMonitoringService = {
      processSecurityEvent: jest.fn(),
    };

    const mockMetricsService = {
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

    // Setup default mocks
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      switch (key) {
        case 'NODE_ENV':
          return 'test';
        case 'APP_VERSION':
          return '1.0.0';
        default:
          return defaultValue;
      }
    });

    // Setup basic security service mock
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDetailedStatus', () => {
    it('should return comprehensive system status', async () => {
      // Arrange
      prismaService.$queryRaw.mockResolvedValue([{ count: 1 }]);

      // Act
      const result = await service.getDetailedStatus();

      // Assert
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('database');
      expect(result).toHaveProperty('security');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('operationId');
    });

    it('should include valid timestamp', async () => {
      // Arrange
      prismaService.$queryRaw.mockResolvedValue([{ count: 1 }]);

      // Act
      const result = await service.getDetailedStatus();

      // Assert
      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).getTime()).toBeCloseTo(Date.now(), -3);
    });

    it('should include performance metrics', async () => {
      // Arrange
      prismaService.$queryRaw.mockResolvedValue([{ count: 1 }]);

      // Act
      const result = await service.getDetailedStatus();

      // Assert
      expect(result.performance).toHaveProperty('avgResponseTime');
      expect(result.performance).toHaveProperty('p95ResponseTime');
      expect(result.performance).toHaveProperty('memoryUtilization');
      expect(result.performance).toHaveProperty('cpuUtilization');
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
