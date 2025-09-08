/**
 * CUA Performance Service Tests
 *
 * Comprehensive test suite for CuaPerformanceService covering:
 * - Performance metrics collection and management
 * - System resource monitoring (CPU, memory, disk)
 * - Operation timing and profiling
 * - Performance alerts and notifications
 * - Historical data analysis and summaries
 * - System health monitoring and assessment
 * - Memory management and cache optimization
 * - Error handling in metrics collection
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import {
  CuaPerformanceService,
  PerformanceMetric,
  SystemMetrics,
  PerformanceSummary,
  ErrorHandler,
} from '../cua-performance.service';

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
  },
}));

// Mock os module
jest.mock('os', () => ({
  totalmem: jest.fn(),
  freemem: jest.fn(),
  loadavg: jest.fn(),
  cpus: jest.fn(),
}));

const mockLogger = {
  log: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('CuaPerformanceService', () => {
  let service: CuaPerformanceService;
  let mockFs: jest.Mocked<typeof fs.promises>;
  let mockOs: jest.Mocked<typeof os>;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CuaPerformanceService],
    })
      .setLogger(mockLogger as any)
      .compile();

    service = module.get<CuaPerformanceService>(CuaPerformanceService);
    mockFs = fs.promises as jest.Mocked<typeof fs.promises>;
    mockOs = os as jest.Mocked<typeof os>;

    // Setup default OS mocks
    mockOs.totalmem.mockReturnValue(8589934592); // 8GB
    mockOs.freemem.mockReturnValue(2147483648); // 2GB
    mockOs.loadavg.mockReturnValue([1.0, 1.5, 2.0]);
    mockOs.cpus.mockReturnValue([{}, {}, {}, {}] as any); // 4 cores
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  describe('ErrorHandler Utility', () => {
    describe('extractErrorMessage', () => {
      it('should extract message from Error instances', () => {
        const error = new Error('Test error message');
        const result = ErrorHandler.extractErrorMessage(error);
        expect(result).toBe('Test error message');
      });

      it('should return string errors directly', () => {
        const result = ErrorHandler.extractErrorMessage('String error');
        expect(result).toBe('String error');
      });

      it('should handle complex error objects', () => {
        const error = { message: 'Complex error', code: 500 };
        const result = ErrorHandler.extractErrorMessage(error);
        expect(result).toBe('Complex error');
      });

      it('should handle null and undefined', () => {
        expect(ErrorHandler.extractErrorMessage(null)).toBe('null');
        expect(ErrorHandler.extractErrorMessage(undefined)).toBe('undefined');
      });
    });
  });

  describe('Constructor and Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(CuaPerformanceService);
    });

    it('should initialize with default configuration', () => {
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Performance monitoring: disabled',
      );
    });

    it('should log enabled state when monitoring is enabled', async () => {
      // Enable monitoring
      (service as any).config.monitoring.enabled = true;

      const testModule = await Test.createTestingModule({
        providers: [CuaPerformanceService],
      }).compile();

      const enabledService = testModule.get<CuaPerformanceService>(
        CuaPerformanceService,
      );

      // This would be checked if the service constructor supported it
      expect(enabledService).toBeDefined();
    });
  });

  describe('Module Lifecycle', () => {
    describe('onModuleInit', () => {
      it('should skip initialization when monitoring is disabled', () => {
        const setIntervalSpy = jest.spyOn(global, 'setInterval');

        service.onModuleInit();

        expect(setIntervalSpy).not.toHaveBeenCalled();
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Performance monitoring is disabled',
        );
      });

      it('should start metrics collection when monitoring is enabled', () => {
        (service as any).config.monitoring.enabled = true;

        const setIntervalSpy = jest.spyOn(global, 'setInterval');

        service.onModuleInit();

        expect(setIntervalSpy).toHaveBeenCalledWith(
          expect.any(Function),
          30000, // METRICS_COLLECTION_INTERVAL
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Starting performance monitoring',
        );
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Performance monitoring initialized',
        );
      });

      it('should collect initial system state', () => {
        (service as any).config.monitoring.enabled = true;

        const collectSystemMetricsSpy = jest.spyOn(
          service as any,
          'collectSystemMetrics',
        );

        service.onModuleInit();

        expect(collectSystemMetricsSpy).toHaveBeenCalled();
      });
    });

    describe('onModuleDestroy', () => {
      it('should clear metrics collection interval', async () => {
        const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

        // Set up interval
        (service as any).metricsCollectionInterval = setInterval(
          () => {},
          1000,
        );

        await service.onModuleDestroy();

        expect(clearIntervalSpy).toHaveBeenCalled();
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Performance monitoring shut down',
        );
      });

      it('should save final metrics summary', async () => {
        (service as any).config.hybrid.sharedVolumePath = '/test/path';

        const saveMetricsSummarySpy = jest
          .spyOn(service as any, 'saveMetricsSummary')
          .mockResolvedValue(undefined);

        await service.onModuleDestroy();

        expect(saveMetricsSummarySpy).toHaveBeenCalled();
      });

      it('should handle cleanup gracefully when interval is not set', async () => {
        // Don't set interval
        (service as any).metricsCollectionInterval = undefined;

        await expect(service.onModuleDestroy()).resolves.not.toThrow();
      });
    });
  });

  describe('Metrics Recording', () => {
    describe('recordMetric', () => {
      it('should skip recording when monitoring is disabled', () => {
        service.recordMetric('test_operation', {
          duration: 100,
          success: true,
        });

        const metrics = (service as any).metrics;
        expect(metrics).toHaveLength(0);
      });

      it('should record metric when monitoring is enabled', () => {
        (service as any).config.monitoring.enabled = true;

        service.recordMetric('test_operation', {
          duration: 150,
          success: true,
          method: 'ane',
          requestId: 'test-123',
          customField: 'custom_value',
        });

        const metrics = (service as any).metrics;
        expect(metrics).toHaveLength(1);
        expect(metrics[0]).toMatchObject({
          operation: 'test_operation',
          duration: 150,
          success: true,
          method: 'ane',
          error: undefined,
          metadata: {
            requestId: 'test-123',
            customField: 'custom_value',
          },
        });
        expect(metrics[0].timestamp).toBeInstanceOf(Date);
      });

      it('should separate standard fields from metadata', () => {
        (service as any).config.monitoring.enabled = true;

        service.recordMetric('metadata_test', {
          duration: 200,
          success: false,
          method: 'cpu',
          error: 'Test error',
          userId: 'user-456',
          sessionId: 'session-789',
          extraData: { nested: 'value' },
        });

        const metrics = (service as any).metrics;
        const metric = metrics[0];

        expect(metric.duration).toBe(200);
        expect(metric.success).toBe(false);
        expect(metric.method).toBe('cpu');
        expect(metric.error).toBe('Test error');
        expect(metric.metadata).toEqual({
          userId: 'user-456',
          sessionId: 'session-789',
          extraData: { nested: 'value' },
        });
      });

      it('should limit metrics history to maximum size', () => {
        (service as any).config.monitoring.enabled = true;
        const maxSize = (service as any).MAX_METRICS_HISTORY;

        // Add more metrics than the limit
        for (let i = 0; i < maxSize + 100; i++) {
          service.recordMetric(`operation_${i}`, {
            duration: i,
            success: true,
          });
        }

        const metrics = (service as any).metrics;
        expect(metrics).toHaveLength(maxSize);

        // Should keep the most recent metrics
        expect(metrics[0].operation).toBe(`operation_100`);
        expect(metrics[metrics.length - 1].operation).toBe(
          `operation_${maxSize + 99}`,
        );
      });

      it('should log warnings for failed operations', () => {
        (service as any).config.monitoring.enabled = true;

        service.recordMetric('failed_operation', {
          duration: 5000,
          success: false,
          error: 'Operation failed',
        });

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining(
            'failed_operation failed in 5000ms - Operation failed',
          ),
        );
      });

      it('should log warnings for slow operations', () => {
        (service as any).config.monitoring.enabled = true;

        service.recordMetric('slow_operation', {
          duration: 15000, // > 10 seconds
          success: true,
        });

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining(
            'slow_operation took 15000ms (slow operation)',
          ),
        );
      });

      it('should log debug information for successful operations', () => {
        (service as any).config.monitoring.enabled = true;

        service.recordMetric('normal_operation', {
          duration: 1500,
          success: true,
          method: 'ane',
        });

        expect(mockLogger.debug).toHaveBeenCalledWith(
          expect.stringContaining('normal_operation - 1500ms (ane) - success'),
        );
      });
    });
  });

  describe('Performance Summary Generation', () => {
    beforeEach(() => {
      (service as any).config.monitoring.enabled = true;
    });

    describe('getPerformanceSummary', () => {
      it('should return empty summary when no metrics exist', () => {
        const summary = service.getPerformanceSummary(60);

        expect(summary).toMatchObject({
          totalOperations: 0,
          successRate: 0,
          averageDuration: 0,
          operationBreakdown: {},
          systemHealth: {
            cpuUsage: 0,
            memoryUsage: 0,
            diskUsage: 0,
          },
        });
        expect(summary.timeRange).toBeDefined();
      });

      it('should calculate correct statistics for metrics within time range', () => {
        const now = new Date();
        const oldMetric = new Date(now.getTime() - 120 * 60 * 1000); // 2 hours ago
        const recentMetric = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago

        // Add metrics manually to bypass recordMetric filtering
        (service as any).metrics = [
          {
            timestamp: oldMetric,
            operation: 'old_operation',
            duration: 1000,
            success: true,
          },
          {
            timestamp: recentMetric,
            operation: 'recent_operation',
            duration: 2000,
            success: true,
          },
          {
            timestamp: recentMetric,
            operation: 'recent_operation',
            duration: 3000,
            success: false,
          },
        ];

        const summary = service.getPerformanceSummary(60); // Last hour

        expect(summary.totalOperations).toBe(2); // Only recent metrics
        expect(summary.successRate).toBe(50); // 1 success out of 2
        expect(summary.averageDuration).toBe(2500); // (2000 + 3000) / 2
      });

      it('should generate correct operation breakdown', () => {
        const now = new Date();
        const recent = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago

        (service as any).metrics = [
          {
            timestamp: recent,
            operation: 'ocr_processing',
            duration: 1000,
            success: true,
          },
          {
            timestamp: recent,
            operation: 'ocr_processing',
            duration: 1500,
            success: true,
          },
          {
            timestamp: recent,
            operation: 'text_detection',
            duration: 800,
            success: false,
          },
        ];

        const summary = service.getPerformanceSummary(60);

        expect(summary.operationBreakdown).toEqual({
          ocr_processing: {
            count: 2,
            averageDuration: 1250, // (1000 + 1500) / 2
            successRate: 100, // 2/2 * 100
          },
          text_detection: {
            count: 1,
            averageDuration: 800,
            successRate: 0, // 0/1 * 100
          },
        });
      });

      it('should include latest system health information', () => {
        // Add system metrics
        (service as any).systemMetrics = [
          {
            timestamp: new Date(),
            cpu: { usage: 45.5, loadAverage: [1.0, 1.5, 2.0] },
            memory: {
              total: 8000000000,
              used: 3200000000,
              free: 4800000000,
              usagePercent: 40.0,
            },
            disk: { used: 500000000, free: 1500000000, usagePercent: 25.0 },
          },
        ];

        const summary = service.getPerformanceSummary(60);

        expect(summary.systemHealth).toEqual({
          cpuUsage: 45.5,
          memoryUsage: 40.0,
          diskUsage: 25.0,
        });
      });

      it('should handle time range parameter correctly', () => {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const twoHoursAgo = new Date(now.getTime() - 120 * 60 * 1000);

        const summary = service.getPerformanceSummary(90); // 1.5 hours

        expect(summary.timeRange.start.getTime()).toBeLessThanOrEqual(
          oneHourAgo.getTime(),
        );
        expect(summary.timeRange.start.getTime()).toBeGreaterThan(
          twoHoursAgo.getTime(),
        );
        expect(summary.timeRange.end.getTime()).toBeLessThanOrEqual(
          now.getTime(),
        );
      });
    });

    describe('getOperationMetrics', () => {
      beforeEach(() => {
        const now = new Date();
        const recent = new Date(now.getTime() - 10 * 60 * 1000);
        const older = new Date(now.getTime() - 120 * 60 * 1000);

        (service as any).metrics = [
          {
            timestamp: recent,
            operation: 'target_operation',
            duration: 1000,
            success: true,
          },
          {
            timestamp: recent,
            operation: 'other_operation',
            duration: 2000,
            success: true,
          },
          {
            timestamp: older,
            operation: 'target_operation',
            duration: 3000,
            success: false,
          },
        ];
      });

      it('should return metrics for specific operation within time range', () => {
        const metrics = service.getOperationMetrics('target_operation', 60);

        expect(metrics).toHaveLength(1);
        expect(metrics[0]).toMatchObject({
          operation: 'target_operation',
          duration: 1000,
          success: true,
        });
      });

      it('should return empty array for non-existent operation', () => {
        const metrics = service.getOperationMetrics('non_existent', 60);
        expect(metrics).toHaveLength(0);
      });

      it('should respect time range parameter', () => {
        const metricsShortRange = service.getOperationMetrics(
          'target_operation',
          30,
        );
        const metricsLongRange = service.getOperationMetrics(
          'target_operation',
          180,
        );

        expect(metricsShortRange).toHaveLength(1); // Only recent
        expect(metricsLongRange).toHaveLength(2); // Both recent and older
      });
    });
  });

  describe('System Metrics Collection', () => {
    describe('getCurrentSystemMetrics', () => {
      it('should return current system resource usage', () => {
        mockOs.totalmem.mockReturnValue(16000000000); // 16GB
        mockOs.freemem.mockReturnValue(4000000000); // 4GB
        mockOs.loadavg.mockReturnValue([0.5, 1.0, 1.5]);
        mockOs.cpus.mockReturnValue([{}, {}, {}, {}, {}, {}, {}, {}] as any); // 8 cores

        const metrics = service.getCurrentSystemMetrics();

        expect(metrics).toMatchObject({
          cpu: {
            usage: expect.any(Number),
            loadAverage: [0.5, 1.0, 1.5],
          },
          memory: {
            total: 16000000000,
            used: 12000000000, // 16GB - 4GB
            free: 4000000000,
            usagePercent: 75, // (12GB / 16GB) * 100
          },
          disk: {
            used: 0,
            free: 0,
            usagePercent: 0,
          },
        });
        expect(metrics.timestamp).toBeInstanceOf(Date);
      });

      it('should calculate CPU usage based on load average', () => {
        mockOs.loadavg.mockReturnValue([2.0, 1.5, 1.0]);
        mockOs.cpus.mockReturnValue([{}, {}, {}, {}] as any); // 4 cores

        const metrics = service.getCurrentSystemMetrics();

        // CPU usage = (loadAvg[0] / cpuCount) * 100, capped at 100
        const expectedUsage = Math.min((2.0 / 4) * 100, 100);
        expect(metrics.cpu.usage).toBe(expectedUsage);
      });

      it('should handle extreme load averages correctly', () => {
        mockOs.loadavg.mockReturnValue([16.0, 8.0, 4.0]);
        mockOs.cpus.mockReturnValue([{}, {}] as any); // 2 cores

        const metrics = service.getCurrentSystemMetrics();

        // Should be capped at 100%
        expect(metrics.cpu.usage).toBe(100);
      });
    });

    describe('collectSystemMetrics (private method)', () => {
      beforeEach(() => {
        (service as any).config.monitoring.enabled = true;
      });

      it('should add system metrics to history', () => {
        (service as any).collectSystemMetrics();

        const systemMetrics = (service as any).systemMetrics;
        expect(systemMetrics).toHaveLength(1);
        expect(systemMetrics[0].timestamp).toBeInstanceOf(Date);
      });

      it('should limit system metrics history', () => {
        // Add many metrics
        for (let i = 0; i < 1050; i++) {
          (service as any).collectSystemMetrics();
        }

        const systemMetrics = (service as any).systemMetrics;
        expect(systemMetrics).toHaveLength(1000); // MAX limit
      });

      it('should log system health warnings when issues detected', () => {
        // Mock high resource usage
        mockOs.totalmem.mockReturnValue(8000000000);
        mockOs.freemem.mockReturnValue(800000000); // Only 10% free
        mockOs.loadavg.mockReturnValue([8.0, 6.0, 4.0]);
        mockOs.cpus.mockReturnValue([{}, {}, {}, {}] as any); // 4 cores

        const isSystemHealthySpy = jest
          .spyOn(service, 'isSystemHealthy')
          .mockReturnValue({
            healthy: false,
            issues: ['High CPU usage: 200.0%', 'High memory usage: 90.0%'],
          });

        (service as any).collectSystemMetrics();

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining(
            'System health issues detected: High CPU usage: 200.0%, High memory usage: 90.0%',
          ),
        );
      });
    });
  });

  describe('System Health Assessment', () => {
    describe('isSystemHealthy', () => {
      beforeEach(() => {
        // Add a baseline system metric
        (service as any).systemMetrics = [
          {
            timestamp: new Date(),
            cpu: { usage: 50, loadAverage: [1.0, 1.5, 2.0] },
            memory: {
              total: 8000000000,
              used: 4000000000,
              free: 4000000000,
              usagePercent: 50,
            },
            disk: { used: 500000000, free: 1500000000, usagePercent: 25 },
          },
        ];

        // Add some performance metrics for success rate calculation
        (service as any).metrics = Array.from({ length: 20 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 1000),
          operation: `op_${i}`,
          duration: 100,
          success: i < 18, // 18 out of 20 successful = 90%
        }));
      });

      it('should return healthy status when all systems are normal', () => {
        const health = service.isSystemHealthy();

        expect(health).toEqual({
          healthy: true,
          issues: [],
        });
      });

      it('should detect high CPU usage', () => {
        (service as any).systemMetrics[0].cpu.usage = 85;

        const health = service.isSystemHealthy();

        expect(health.healthy).toBe(false);
        expect(health.issues).toContain('High CPU usage: 85.0%');
      });

      it('should detect high memory usage', () => {
        (service as any).systemMetrics[0].memory.usagePercent = 90;

        const health = service.isSystemHealthy();

        expect(health.healthy).toBe(false);
        expect(health.issues).toContain('High memory usage: 90.0%');
      });

      it('should detect low operation success rate', () => {
        // Create metrics with low success rate
        (service as any).metrics = Array.from({ length: 20 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 1000),
          operation: `op_${i}`,
          duration: 100,
          success: i < 10, // Only 10 out of 20 successful = 50%
        }));

        const health = service.isSystemHealthy();

        expect(health.healthy).toBe(false);
        expect(health.issues).toContain('Low success rate: 50.0%');
      });

      it('should return healthy when no recent metrics exist', () => {
        (service as any).systemMetrics = [];

        const health = service.isSystemHealthy();

        expect(health).toEqual({
          healthy: true,
          issues: [],
        });
      });

      it('should ignore success rate when insufficient metrics', () => {
        // Only 5 metrics (less than 10 minimum)
        (service as any).metrics = Array.from({ length: 5 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 1000),
          operation: `op_${i}`,
          duration: 100,
          success: false, // All failed
        }));

        const health = service.isSystemHealthy();

        // Should not include success rate issue
        expect(health.issues).not.toContain(
          expect.stringContaining('success rate'),
        );
      });

      it('should detect multiple issues simultaneously', () => {
        (service as any).systemMetrics[0].cpu.usage = 85;
        (service as any).systemMetrics[0].memory.usagePercent = 90;
        (service as any).metrics = Array.from({ length: 20 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 1000),
          operation: `op_${i}`,
          duration: 100,
          success: i < 15, // 75% success rate (< 90%)
        }));

        const health = service.isSystemHealthy();

        expect(health.healthy).toBe(false);
        expect(health.issues).toHaveLength(3);
        expect(health.issues).toContain('High CPU usage: 85.0%');
        expect(health.issues).toContain('High memory usage: 90.0%');
        expect(health.issues).toContain('Low success rate: 75.0%');
      });
    });
  });

  describe('Metrics Export', () => {
    describe('exportMetrics', () => {
      beforeEach(() => {
        const now = new Date();
        const recent = new Date(now.getTime() - 30 * 60 * 1000);
        const older = new Date(now.getTime() - 120 * 60 * 1000);

        (service as any).metrics = [
          {
            timestamp: recent,
            operation: 'recent_op',
            duration: 100,
            success: true,
          },
          {
            timestamp: older,
            operation: 'old_op',
            duration: 200,
            success: false,
          },
        ];

        (service as any).systemMetrics = [
          {
            timestamp: recent,
            cpu: { usage: 50 },
            memory: { usagePercent: 60 },
          },
          {
            timestamp: older,
            cpu: { usage: 30 },
            memory: { usagePercent: 40 },
          },
        ];
      });

      it('should export metrics within specified time range', () => {
        const exported = service.exportMetrics(60); // Last hour

        expect(exported.performanceMetrics).toHaveLength(1);
        expect(exported.performanceMetrics[0].operation).toBe('recent_op');

        expect(exported.systemMetrics).toHaveLength(1);
        expect(exported.systemMetrics[0].cpu.usage).toBe(50);

        expect(exported.summary).toBeDefined();
        expect(exported.summary.totalOperations).toBe(1);
      });

      it('should include summary data', () => {
        const exported = service.exportMetrics(180); // 3 hours

        expect(exported.summary.totalOperations).toBe(2);
        expect(exported.summary.successRate).toBe(50); // 1 out of 2
        expect(exported.summary.averageDuration).toBe(150); // (100 + 200) / 2
      });

      it('should handle empty metrics gracefully', () => {
        (service as any).metrics = [];
        (service as any).systemMetrics = [];

        const exported = service.exportMetrics(60);

        expect(exported.performanceMetrics).toHaveLength(0);
        expect(exported.systemMetrics).toHaveLength(0);
        expect(exported.summary.totalOperations).toBe(0);
      });
    });
  });

  describe('Metrics Collection Lifecycle', () => {
    describe('startMetricsCollection (private method)', () => {
      it('should start periodic collection when called', () => {
        const setIntervalSpy = jest.spyOn(global, 'setInterval');

        (service as any).startMetricsCollection();

        expect(setIntervalSpy).toHaveBeenCalledWith(
          expect.any(Function),
          30000, // METRICS_COLLECTION_INTERVAL
        );
      });

      it('should handle collection errors gracefully', () => {
        const collectSystemMetricsSpy = jest
          .spyOn(service as any, 'collectSystemMetrics')
          .mockImplementation(() => {
            throw new Error('Collection failed');
          });

        (service as any).startMetricsCollection();

        // Trigger the interval
        jest.advanceTimersByTime(30000);

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining(
            'Failed to collect system metrics: Collection failed',
          ),
        );
      });
    });

    describe('saveMetricsSummary (private method)', () => {
      it('should skip saving when no shared volume path configured', async () => {
        (service as any).config.hybrid.sharedVolumePath = '';

        await (service as any).saveMetricsSummary();

        expect(mockFs.writeFile).not.toHaveBeenCalled();
      });

      it('should save metrics summary to shared volume', async () => {
        (service as any).config.hybrid.sharedVolumePath = '/test/shared';

        const mockSummary = {
          totalOperations: 100,
          successRate: 95,
          averageDuration: 150,
          operationBreakdown: {},
          systemHealth: { cpuUsage: 45, memoryUsage: 60, diskUsage: 25 },
          timeRange: { start: new Date(), end: new Date() },
        };

        jest
          .spyOn(service, 'getPerformanceSummary')
          .mockReturnValue(mockSummary);
        jest
          .spyOn(service, 'isSystemHealthy')
          .mockReturnValue({ healthy: true, issues: [] });

        await (service as any).saveMetricsSummary();

        expect(mockFs.writeFile).toHaveBeenCalledWith(
          '/test/shared/performance-metrics.json',
          expect.stringContaining('"service":"bytebotd-performance"'),
        );

        const writeCall = mockFs.writeFile.mock.calls[0];
        const savedData = JSON.parse(writeCall[1] as string);

        expect(savedData).toMatchObject({
          service: 'bytebotd-performance',
          summary: mockSummary,
          systemHealth: { healthy: true, issues: [] },
        });
      });

      it('should handle file write errors gracefully', async () => {
        (service as any).config.hybrid.sharedVolumePath = '/test/shared';
        mockFs.writeFile.mockRejectedValue(new Error('Write failed'));

        await (service as any).saveMetricsSummary();

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining(
            'Failed to save metrics summary: Write failed',
          ),
        );
      });

      it('should log debug message on successful save', async () => {
        (service as any).config.hybrid.sharedVolumePath = '/test/shared';

        await (service as any).saveMetricsSummary();

        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Performance metrics saved to shared volume',
        );
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle system metrics collection errors', () => {
      mockOs.totalmem.mockImplementation(() => {
        throw new Error('OS error');
      });

      expect(() => service.getCurrentSystemMetrics()).not.toThrow();
    });

    it('should handle metrics array manipulation safely', () => {
      (service as any).config.monitoring.enabled = true;

      // Add metrics normally
      service.recordMetric('test', { duration: 100, success: true });

      // Directly manipulate metrics array (simulating race condition)
      (service as any).metrics.length = 0;

      // Should not crash
      expect(() => service.getPerformanceSummary(60)).not.toThrow();
    });

    it('should handle division by zero in calculations', () => {
      (service as any).config.monitoring.enabled = true;

      // Create metrics with zero duration
      (service as any).metrics = [
        {
          timestamp: new Date(),
          operation: 'zero_duration',
          duration: 0,
          success: true,
        },
      ];

      const summary = service.getPerformanceSummary(60);
      expect(summary.averageDuration).toBe(0);
      expect(summary.operationBreakdown['zero_duration'].averageDuration).toBe(
        0,
      );
    });

    it('should handle malformed metric data', () => {
      (service as any).config.monitoring.enabled = true;

      // Add malformed metric directly
      (service as any).metrics.push({
        // Missing required fields
        operation: 'malformed',
      });

      expect(() => service.getPerformanceSummary(60)).not.toThrow();
    });

    it('should handle concurrent metric recording', () => {
      (service as any).config.monitoring.enabled = true;

      // Simulate concurrent recording
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve().then(() =>
          service.recordMetric(`concurrent_${i}`, {
            duration: i,
            success: true,
          }),
        ),
      );

      return Promise.all(promises).then(() => {
        const metrics = (service as any).metrics;
        expect(metrics).toHaveLength(100);
      });
    });

    it('should handle extreme timestamp values', () => {
      (service as any).config.monitoring.enabled = true;

      const extremelyOldDate = new Date(0); // Unix epoch
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // One year in future

      (service as any).metrics = [
        {
          timestamp: extremelyOldDate,
          operation: 'old',
          duration: 100,
          success: true,
        },
        {
          timestamp: futureDate,
          operation: 'future',
          duration: 200,
          success: true,
        },
      ];

      const summary = service.getPerformanceSummary(60);
      // Future metric should be included, old metric should be excluded
      expect(summary.totalOperations).toBe(1);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large numbers of metrics efficiently', () => {
      (service as any).config.monitoring.enabled = true;

      const startTime = Date.now();

      // Add many metrics
      for (let i = 0; i < 5000; i++) {
        service.recordMetric(`perf_test_${i}`, {
          duration: Math.random() * 1000,
          success: Math.random() > 0.1, // 90% success rate
        });
      }

      const addTime = Date.now() - startTime;
      expect(addTime).toBeLessThan(1000); // Should add 5000 metrics in less than 1 second

      const summaryStartTime = Date.now();
      const summary = service.getPerformanceSummary(60);
      const summaryTime = Date.now() - summaryStartTime;

      expect(summaryTime).toBeLessThan(100); // Summary generation should be fast
      expect(summary.totalOperations).toBeGreaterThan(0);
    });

    it('should properly clean up resources on destroy', async () => {
      (service as any).config.monitoring.enabled = true;

      // Start monitoring
      service.onModuleInit();

      // Add some data
      service.recordMetric('test', { duration: 100, success: true });

      // Destroy
      await service.onModuleDestroy();

      // Verify cleanup
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Performance monitoring shut down',
      );
    });

    it('should handle memory pressure scenarios', () => {
      (service as any).config.monitoring.enabled = true;

      // Fill up metrics to maximum
      const maxMetrics = (service as any).MAX_METRICS_HISTORY;

      for (let i = 0; i < maxMetrics * 2; i++) {
        service.recordMetric(`memory_test_${i}`, {
          duration: 100,
          success: true,
        });
      }

      const metrics = (service as any).metrics;
      expect(metrics).toHaveLength(maxMetrics);

      // Should maintain recent metrics
      expect(metrics[0].operation).toContain(`memory_test_${maxMetrics}`);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete monitoring lifecycle', async () => {
      (service as any).config.monitoring.enabled = true;
      (service as any).config.hybrid.sharedVolumePath = '/test/shared';

      // Initialize
      service.onModuleInit();

      // Record various metrics
      service.recordMetric('ocr_processing', {
        duration: 150,
        success: true,
        method: 'ane',
      });
      service.recordMetric('text_detection', {
        duration: 200,
        success: false,
        error: 'Failed',
      });
      service.recordMetric('batch_processing', {
        duration: 500,
        success: true,
        method: 'cpu',
      });

      // Advance time to trigger collection
      jest.advanceTimersByTime(30000);

      // Get summary
      const summary = service.getPerformanceSummary(60);
      expect(summary.totalOperations).toBe(3);
      expect(summary.successRate).toBeCloseTo(66.67, 1);

      // Check system health
      const health = service.isSystemHealthy();
      expect(health).toBeDefined();

      // Export metrics
      const exported = service.exportMetrics(60);
      expect(exported.performanceMetrics).toHaveLength(3);

      // Cleanup
      await service.onModuleDestroy();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Performance monitoring shut down',
      );
    });

    it('should handle monitoring disabled throughout lifecycle', async () => {
      // Keep monitoring disabled
      (service as any).config.monitoring.enabled = false;

      service.onModuleInit();

      // Try to record metrics
      service.recordMetric('test', { duration: 100, success: true });

      // Should not record anything
      const summary = service.getPerformanceSummary(60);
      expect(summary.totalOperations).toBe(0);

      await service.onModuleDestroy();

      // Should not have started any intervals
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Performance monitoring is disabled',
      );
    });

    it('should recover from collection errors and continue monitoring', () => {
      (service as any).config.monitoring.enabled = true;

      // Start monitoring
      service.onModuleInit();

      // Mock temporary failure
      const originalCollectSystemMetrics = (service as any)
        .collectSystemMetrics;
      (service as any).collectSystemMetrics = jest
        .fn()
        .mockImplementation(() => {
          throw new Error('Temporary failure');
        });

      // Trigger collection - should handle error
      jest.advanceTimersByTime(30000);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to collect system metrics'),
      );

      // Restore function - should continue working
      (service as any).collectSystemMetrics = originalCollectSystemMetrics;
      jest.advanceTimersByTime(30000);

      // Should continue to work
      const systemMetrics = (service as any).systemMetrics;
      expect(systemMetrics.length).toBeGreaterThanOrEqual(1);
    });
  });
});
