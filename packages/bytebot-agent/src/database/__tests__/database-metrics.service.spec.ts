/**
 * Database Metrics Service Comprehensive Test Suite
 * Tests performance monitoring, Prometheus integration, metrics collection,
 * and alerting for database operations and resource utilization
 *
 * Coverage:
 * - Metrics collection and aggregation
 * - Prometheus metrics formatting and exposition
 * - Performance trend analysis and calculations
 * - Alert generation and recommendations
 * - Historical data management
 * - Resource monitoring and system metrics
 * - Error handling and resilience patterns
 *
 * @author Database Testing Specialist
 * @version 1.0.0
 * @since Comprehensive Database Testing Phase
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import {
  DatabaseMetricsService,
  DatabaseMetricsSnapshot,
  PrometheusMetrics,
} from '../metrics/database-metrics.service';
import { DatabaseService } from '../database.service';
import { ConnectionPoolService } from '../connection-pool.service';
import { QueryLoggingInterceptor } from '../interceptors/query-logging.interceptor';

describe('DatabaseMetricsService Comprehensive Test Suite', () => {
  let service: DatabaseMetricsService;
  let configService: ConfigService;
  let databaseService: DatabaseService;
  let connectionPoolService: ConnectionPoolService;
  let queryLoggingInterceptor: QueryLoggingInterceptor;
  let module: TestingModule;

  // Mock data
  const mockHealthStatus = {
    isHealthy: true,
    uptime: 3600000, // 1 hour
    lastHealthCheck: new Date(),
    connectionStatus: 'connected',
  };

  const mockPoolMetrics = {
    active: 5,
    idle: 3,
    total: 8,
    waiting: 2,
    utilization: 62.5,
    exhausted: false,
    leakDetected: false,
    peakConnections: 8,
    waitTimeMs: 50,
    totalRequests: 1000,
    totalTimeouts: 5,
  };

  const mockQueryStatistics = {
    totalQueries: 500,
    successfulQueries: 475,
    failedQueries: 25,
    slowQueries: 12,
    averageDuration: 125,
    queriesPerMinute: 100,
    errorRate: 5,
  };

  const mockQueryMetrics = [
    { duration: 50, success: true, query: 'SELECT 1', timestamp: new Date() },
    { duration: 100, success: true, query: 'SELECT 2', timestamp: new Date() },
    { duration: 200, success: false, query: 'SELECT 3', timestamp: new Date() },
    { duration: 1500, success: true, query: 'SELECT 4', timestamp: new Date() },
    { duration: 75, success: true, query: 'SELECT 5', timestamp: new Date() },
  ];

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        DatabaseMetricsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                DB_METRICS_COLLECTION_INTERVAL: 60000,
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: DatabaseService,
          useValue: {
            getHealthStatus: jest.fn().mockReturnValue(mockHealthStatus),
          },
        },
        {
          provide: ConnectionPoolService,
          useValue: {
            getPoolMetrics: jest.fn().mockReturnValue(mockPoolMetrics),
          },
        },
        {
          provide: QueryLoggingInterceptor,
          useValue: {
            getQueryStatistics: jest.fn().mockReturnValue(mockQueryStatistics),
            getQueryMetrics: jest.fn().mockReturnValue(mockQueryMetrics),
          },
        },
      ],
    }).compile();

    service = module.get<DatabaseMetricsService>(DatabaseMetricsService);
    configService = module.get<ConfigService>(ConfigService);
    databaseService = module.get<DatabaseService>(DatabaseService);
    connectionPoolService = module.get<ConnectionPoolService>(
      ConnectionPoolService,
    );
    queryLoggingInterceptor = module.get<QueryLoggingInterceptor>(
      QueryLoggingInterceptor,
    );

    // Clear any existing timers
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(async () => {
    // Clean up intervals
    if ((service as any).metricsCollectionInterval) {
      clearInterval((service as any).metricsCollectionInterval);
    }
    jest.useRealTimers();
    await module.close();
  });

  describe('Service Initialization', () => {
    it('should initialize metrics service with default values', () => {
      expect(service).toBeDefined();

      const currentMetrics = service.getCurrentMetrics();
      expect(currentMetrics).toBeDefined();
      expect(currentMetrics.connectionPool.activeConnections).toBe(0);
      expect(currentMetrics.queryPerformance.totalQueries).toBe(0);
      expect(currentMetrics.health.isHealthy).toBe(true);
      expect(currentMetrics.timestamp).toBeInstanceOf(Date);
    });

    it('should initialize Prometheus metrics structure', () => {
      const prometheusMetrics = service.getPrometheusMetrics();

      expect(prometheusMetrics).toBeDefined();
      expect(prometheusMetrics.database_queries_total).toEqual({
        SELECT: 0,
        INSERT: 0,
        UPDATE: 0,
        DELETE: 0,
        UNKNOWN: 0,
      });
      expect(prometheusMetrics.database_connections_active).toBe(0);
      expect(prometheusMetrics.database_health_status).toBe(1);
    });

    it('should start metrics collection on module init', async () => {
      await service.onModuleInit();

      expect((service as any).metricsCollectionInterval).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith(
        'DB_METRICS_COLLECTION_INTERVAL',
        60000,
      );
    });

    it('should clean up resources on module destroy', () => {
      (service as any).metricsCollectionInterval = setInterval(() => {}, 1000);

      service.onModuleDestroy();

      expect((service as any).metricsCollectionInterval).toBeUndefined();
    });
  });

  describe('Metrics Collection', () => {
    it('should collect comprehensive database metrics', async () => {
      const metrics = await service.collectMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.connectionPool).toEqual({
        activeConnections: mockPoolMetrics.active,
        idleConnections: mockPoolMetrics.idle,
        totalConnections: mockPoolMetrics.total,
        waitingRequests: mockPoolMetrics.waiting,
        utilization: mockPoolMetrics.utilization,
        exhausted: mockPoolMetrics.exhausted,
        leakDetected: mockPoolMetrics.leakDetected,
        peakConnections: mockPoolMetrics.peakConnections,
        averageWaitTime: mockPoolMetrics.waitTimeMs,
        totalAcquisitions: mockPoolMetrics.totalRequests,
        totalTimeouts: mockPoolMetrics.totalTimeouts,
      });
    });

    it('should collect query performance metrics with quantiles', async () => {
      const metrics = await service.collectMetrics();

      expect(metrics.queryPerformance.totalQueries).toBe(
        mockQueryStatistics.totalQueries,
      );
      expect(metrics.queryPerformance.successfulQueries).toBe(
        mockQueryStatistics.successfulQueries,
      );
      expect(metrics.queryPerformance.failedQueries).toBe(
        mockQueryStatistics.failedQueries,
      );
      expect(metrics.queryPerformance.averageDuration).toBe(
        mockQueryStatistics.averageDuration,
      );
      expect(metrics.queryPerformance.medianDuration).toBeGreaterThan(0);
      expect(metrics.queryPerformance.p95Duration).toBeGreaterThan(0);
      expect(metrics.queryPerformance.p99Duration).toBeGreaterThan(0);
    });

    it('should calculate query duration quantiles correctly', async () => {
      // Mock specific query durations: [50, 75, 100, 200, 1500] (filtered for success, sorted)
      const metrics = await service.collectMetrics();

      // Expected: sorted successful queries [50, 75, 100, 1500]
      expect(metrics.queryPerformance.medianDuration).toBe(75); // Middle value of 4 items: (75 + 100) / 2 = 87.5, but we get index 2 = 100
      expect(metrics.queryPerformance.p95Duration).toBe(1500); // 95th percentile
      expect(metrics.queryPerformance.p99Duration).toBe(1500); // 99th percentile
    });

    it('should collect health metrics from database service', async () => {
      const metrics = await service.collectMetrics();

      expect(metrics.health.isHealthy).toBe(mockHealthStatus.isHealthy);
      expect(metrics.health.uptime).toBe(mockHealthStatus.uptime);
      expect(metrics.health.lastHealthCheck).toBe(
        mockHealthStatus.lastHealthCheck,
      );
    });

    it('should collect system resource metrics', async () => {
      const metrics = await service.collectMetrics();

      expect(metrics.resources.memoryUsage).toBeGreaterThan(0); // Process memory usage
      expect(metrics.resources.cpuUsage).toBe(0); // Placeholder implementation
      expect(metrics.resources.diskUsage).toBe(0); // Placeholder implementation
      expect(metrics.resources.networkLatency).toBe(0); // Placeholder implementation
    });

    it('should handle metrics collection errors gracefully', async () => {
      const collectionError = new Error('Metrics collection failed');
      databaseService.getHealthStatus = jest.fn().mockImplementation(() => {
        throw collectionError;
      });

      await expect(service.collectMetrics()).rejects.toThrow(
        'Metrics collection failed',
      );
    });

    it('should update current metrics and add to history', async () => {
      await service.collectMetrics();
      await service.collectMetrics();

      const currentMetrics = service.getCurrentMetrics();
      expect(currentMetrics.timestamp).toBeInstanceOf(Date);

      // History should contain the collected metrics
      const history = (service as any).metricsHistory;
      expect(history.length).toBe(2);
    });

    it('should limit metrics history size', async () => {
      // Override max history size for testing
      (service as any).maxHistorySize = 3;

      // Collect more metrics than the limit
      await service.collectMetrics();
      await service.collectMetrics();
      await service.collectMetrics();
      await service.collectMetrics();

      const history = (service as any).metricsHistory;
      expect(history.length).toBe(3); // Limited to max size
    });
  });

  describe('Prometheus Integration', () => {
    beforeEach(async () => {
      await service.collectMetrics(); // Ensure metrics are collected
    });

    it('should update Prometheus metrics from current snapshot', () => {
      const prometheusMetrics = service.getPrometheusMetrics();

      expect(prometheusMetrics.database_connections_active).toBe(
        mockPoolMetrics.active,
      );
      expect(prometheusMetrics.database_connections_idle).toBe(
        mockPoolMetrics.idle,
      );
      expect(prometheusMetrics.database_connections_waiting).toBe(
        mockPoolMetrics.waiting,
      );
      expect(prometheusMetrics.database_pool_utilization_percent).toBe(
        mockPoolMetrics.utilization,
      );
      expect(prometheusMetrics.database_health_status).toBe(1); // Healthy
    });

    it('should generate Prometheus exposition format', () => {
      const exposition = service.getPrometheusExposition();

      expect(exposition).toContain(
        '# HELP bytebot_database_connections_active',
      );
      expect(exposition).toContain(
        '# TYPE bytebot_database_connections_active gauge',
      );
      expect(exposition).toContain(
        `bytebot_database_connections_active ${mockPoolMetrics.active}`,
      );

      expect(exposition).toContain('bytebot_database_health_status 1');
      expect(exposition).toContain(
        '# HELP bytebot_database_query_duration_seconds',
      );
      expect(exposition).toContain(
        '# TYPE bytebot_database_query_duration_seconds histogram',
      );
    });

    it('should format query metrics with labels in Prometheus exposition', () => {
      const exposition = service.getPrometheusExposition();

      expect(exposition).toContain(
        'bytebot_database_queries_total{type="SELECT"}',
      );
      expect(exposition).toContain(
        'bytebot_database_queries_total{type="INSERT"}',
      );
      expect(exposition).toContain(
        'bytebot_database_errors_total{type="connection"}',
      );
      expect(exposition).toContain(
        'bytebot_database_errors_total{type="query"}',
      );
    });

    it('should include histogram buckets in Prometheus exposition', () => {
      const exposition = service.getPrometheusExposition();

      expect(exposition).toContain(
        'bytebot_database_query_duration_seconds_bucket{le="0.001"}',
      );
      expect(exposition).toContain(
        'bytebot_database_query_duration_seconds_bucket{le="1.0"}',
      );
      expect(exposition).toContain(
        'bytebot_database_query_duration_seconds_bucket{le="+Inf"}',
      );
      expect(exposition).toContain(
        'bytebot_database_query_duration_seconds_count',
      );
      expect(exposition).toContain(
        'bytebot_database_query_duration_seconds_sum',
      );
    });

    it('should include quantile metrics in Prometheus exposition', () => {
      const exposition = service.getPrometheusExposition();

      expect(exposition).toContain(
        'bytebot_database_query_duration_quantile{quantile="0.50"}',
      );
      expect(exposition).toContain(
        'bytebot_database_query_duration_quantile{quantile="0.95"}',
      );
      expect(exposition).toContain(
        'bytebot_database_query_duration_quantile{quantile="0.99"}',
      );
    });

    it('should handle unhealthy database status in Prometheus metrics', async () => {
      databaseService.getHealthStatus = jest.fn().mockReturnValue({
        ...mockHealthStatus,
        isHealthy: false,
      });

      await service.collectMetrics();
      const prometheusMetrics = service.getPrometheusMetrics();

      expect(prometheusMetrics.database_health_status).toBe(0); // Unhealthy
    });
  });

  describe('Performance Analysis and Trends', () => {
    beforeEach(async () => {
      // Collect initial metrics
      await service.collectMetrics();
    });

    it('should generate comprehensive performance report', () => {
      const report = service.getPerformanceReport();

      expect(report).toBeDefined();
      expect(report.current).toBeDefined();
      expect(report.trends).toBeNull(); // Not enough history
      expect(report.alerts).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.timestamp).toBeInstanceOf(Date);
    });

    it('should calculate performance trends with sufficient history', async () => {
      // Create historical data with different metrics
      connectionPoolService.getPoolMetrics = jest
        .fn()
        .mockReturnValueOnce({ ...mockPoolMetrics, utilization: 50 })
        .mockReturnValueOnce({ ...mockPoolMetrics, utilization: 75 });

      queryLoggingInterceptor.getQueryStatistics = jest
        .fn()
        .mockReturnValueOnce({ ...mockQueryStatistics, averageDuration: 100 })
        .mockReturnValueOnce({ ...mockQueryStatistics, averageDuration: 150 });

      // Collect metrics to build history
      await service.collectMetrics(); // First snapshot
      await service.collectMetrics(); // Second snapshot

      const report = service.getPerformanceReport();

      expect(report.trends).toBeDefined();
      expect(report.trends?.queryPerformance.averageDurationTrend).toBe('up'); // 100 -> 150 (50% increase)
      expect(report.trends?.connectionPool.utilizationTrend).toBe('up'); // 50 -> 75 (50% increase)
    });

    it('should calculate trend classifications correctly', () => {
      const calculateTrend = (service as any).calculateTrend;

      expect(calculateTrend(100, 110)).toBe('up'); // 10% increase
      expect(calculateTrend(100, 95)).toBe('down'); // 5% decrease
      expect(calculateTrend(100, 103)).toBe('stable'); // 3% increase (within threshold)
      expect(calculateTrend(0, 100)).toBe('stable'); // Handle zero previous value
    });

    it('should generate performance alerts for concerning metrics', async () => {
      // Set up concerning metrics
      connectionPoolService.getPoolMetrics = jest.fn().mockReturnValue({
        ...mockPoolMetrics,
        utilization: 90, // High utilization
      });

      queryLoggingInterceptor.getQueryStatistics = jest.fn().mockReturnValue({
        ...mockQueryStatistics,
        averageDuration: 1500, // Slow queries
        errorRate: 10, // High error rate
      });

      databaseService.getHealthStatus = jest.fn().mockReturnValue({
        ...mockHealthStatus,
        isHealthy: false, // Unhealthy
      });

      await service.collectMetrics();
      const report = service.getPerformanceReport();

      expect(report.alerts).toContain(
        'High connection pool utilization detected',
      );
      expect(report.alerts).toContain('High database error rate detected');
      expect(report.alerts).toContain('High average query duration detected');
      expect(report.alerts).toContain('Database health check failing');
    });

    it('should generate performance recommendations', async () => {
      // Set up metrics that warrant recommendations
      connectionPoolService.getPoolMetrics = jest.fn().mockReturnValue({
        ...mockPoolMetrics,
        utilization: 85, // High utilization
        leakDetected: true, // Connection leak
      });

      queryLoggingInterceptor.getQueryStatistics = jest.fn().mockReturnValue({
        ...mockQueryStatistics,
        slowQueries: 15, // Many slow queries
      });

      await service.collectMetrics();
      const report = service.getPerformanceReport();

      expect(report.recommendations).toContain(
        'Consider increasing connection pool size',
      );
      expect(report.recommendations).toContain(
        'Review and optimize slow queries',
      );
      expect(report.recommendations).toContain(
        'Investigate potential connection leaks',
      );
    });

    it('should not generate alerts for healthy metrics', async () => {
      // Ensure all metrics are healthy
      connectionPoolService.getPoolMetrics = jest.fn().mockReturnValue({
        ...mockPoolMetrics,
        utilization: 50, // Normal utilization
      });

      queryLoggingInterceptor.getQueryStatistics = jest.fn().mockReturnValue({
        ...mockQueryStatistics,
        averageDuration: 50, // Fast queries
        errorRate: 1, // Low error rate
      });

      await service.collectMetrics();
      const report = service.getPerformanceReport();

      expect(report.alerts).toHaveLength(0);
    });
  });

  describe('Periodic Collection and Monitoring', () => {
    it('should start periodic metrics collection', async () => {
      await service.onModuleInit();

      expect((service as any).metricsCollectionInterval).toBeDefined();
    });

    it('should collect metrics periodically', async () => {
      const collectMetricsSpy = jest
        .spyOn(service, 'collectMetrics')
        .mockResolvedValue({} as any);

      await service.onModuleInit();

      // Fast forward time to trigger collection
      jest.advanceTimersByTime(60000); // 1 minute

      expect(collectMetricsSpy).toHaveBeenCalledTimes(2); // Initial + periodic
    });

    it('should handle periodic collection errors gracefully', async () => {
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const collectError = new Error('Periodic collection failed');

      jest.spyOn(service, 'collectMetrics').mockRejectedValue(collectError);

      await service.onModuleInit();

      // Fast forward time to trigger collection
      jest.advanceTimersByTime(60000);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Scheduled metrics collection failed',
        collectError,
      );

      loggerErrorSpy.mockRestore();
    });

    it('should use configuration for collection interval', async () => {
      const customInterval = 30000;
      configService.get = jest.fn().mockReturnValue(customInterval);

      await service.onModuleInit();

      expect(configService.get).toHaveBeenCalledWith(
        'DB_METRICS_COLLECTION_INTERVAL',
        60000,
      );
    });
  });

  describe('Data Management and Utilities', () => {
    it('should handle empty query metrics gracefully', async () => {
      queryLoggingInterceptor.getQueryMetrics = jest.fn().mockReturnValue([]);

      const metrics = await service.collectMetrics();

      expect(metrics.queryPerformance.medianDuration).toBe(0);
      expect(metrics.queryPerformance.p95Duration).toBe(0);
      expect(metrics.queryPerformance.p99Duration).toBe(0);
    });

    it('should calculate median correctly for odd number of items', async () => {
      // Mock odd number of successful query durations: [10, 20, 30]
      queryLoggingInterceptor.getQueryMetrics = jest.fn().mockReturnValue([
        {
          duration: 20,
          success: true,
          query: 'SELECT 1',
          timestamp: new Date(),
        },
        {
          duration: 10,
          success: true,
          query: 'SELECT 2',
          timestamp: new Date(),
        },
        {
          duration: 30,
          success: true,
          query: 'SELECT 3',
          timestamp: new Date(),
        },
      ]);

      const metrics = await service.collectMetrics();

      // Sorted: [10, 20, 30], median index = floor(3/2) = 1, so median = 20
      expect(metrics.queryPerformance.medianDuration).toBe(20);
    });

    it('should calculate percentiles correctly', async () => {
      // Mock 100 query durations for accurate percentile calculation
      const queryMetrics = Array.from({ length: 100 }, (_, i) => ({
        duration: (i + 1) * 10, // 10, 20, 30, ..., 1000
        success: true,
        query: `SELECT ${i}`,
        timestamp: new Date(),
      }));

      queryLoggingInterceptor.getQueryMetrics = jest
        .fn()
        .mockReturnValue(queryMetrics);

      const metrics = await service.collectMetrics();

      // P95 should be 95th percentile: index = floor(100 * 0.95) = 95, value = 950
      expect(metrics.queryPerformance.p95Duration).toBe(950);
      // P99 should be 99th percentile: index = floor(100 * 0.99) = 99, value = 990
      expect(metrics.queryPerformance.p99Duration).toBe(990);
    });

    it('should generate unique operation IDs', () => {
      const operationIds = new Set();

      for (let i = 0; i < 50; i++) {
        const operationId = (service as any).generateOperationId();
        expect(operationId).toMatch(/^metrics_\d+_[a-z0-9]{6}$/);
        expect(operationIds.has(operationId)).toBe(false);
        operationIds.add(operationId);
      }

      expect(operationIds.size).toBe(50);
    });

    it('should maintain metrics history in chronological order', async () => {
      const baseTime = Date.now();

      // Mock different timestamps
      jest
        .spyOn(Date, 'now')
        .mockReturnValueOnce(baseTime)
        .mockReturnValueOnce(baseTime + 60000)
        .mockReturnValueOnce(baseTime + 120000);

      await service.collectMetrics();
      await service.collectMetrics();
      await service.collectMetrics();

      const history = (service as any).metricsHistory;
      expect(history.length).toBe(3);

      // Verify chronological order
      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          history[i - 1].timestamp.getTime(),
        );
      }
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle database service errors during health collection', async () => {
      const healthError = new Error('Health service unavailable');
      databaseService.getHealthStatus = jest.fn().mockImplementation(() => {
        throw healthError;
      });

      await expect(service.collectMetrics()).rejects.toThrow(
        'Health service unavailable',
      );
    });

    it('should handle connection pool service errors', async () => {
      const poolError = new Error('Pool service unavailable');
      connectionPoolService.getPoolMetrics = jest
        .fn()
        .mockImplementation(() => {
          throw poolError;
        });

      await expect(service.collectMetrics()).rejects.toThrow(
        'Pool service unavailable',
      );
    });

    it('should handle query interceptor errors', async () => {
      const queryError = new Error('Query interceptor unavailable');
      queryLoggingInterceptor.getQueryStatistics = jest
        .fn()
        .mockImplementation(() => {
          throw queryError;
        });

      await expect(service.collectMetrics()).rejects.toThrow(
        'Query interceptor unavailable',
      );
    });

    it('should log operation IDs for error tracking', async () => {
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();
      const metricsError = new Error('Metrics collection failed');

      databaseService.getHealthStatus = jest.fn().mockImplementation(() => {
        throw metricsError;
      });

      await expect(service.collectMetrics()).rejects.toThrow();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to collect database metrics'),
        expect.objectContaining({
          error: 'Metrics collection failed',
          operationId: expect.stringMatching(/^metrics_\d+_[a-z0-9]{6}$/),
        }),
      );

      loggerErrorSpy.mockRestore();
    });
  });

  describe('Integration with External Services', () => {
    it('should collect metrics from all required services', async () => {
      await service.collectMetrics();

      expect(databaseService.getHealthStatus).toHaveBeenCalled();
      expect(connectionPoolService.getPoolMetrics).toHaveBeenCalled();
      expect(queryLoggingInterceptor.getQueryStatistics).toHaveBeenCalled();
      expect(queryLoggingInterceptor.getQueryMetrics).toHaveBeenCalled();
    });

    it('should convert query statistics to performance metrics correctly', async () => {
      const metrics = await service.collectMetrics();

      expect(metrics.queryPerformance.queriesPerSecond).toBe(
        mockQueryStatistics.queriesPerMinute / 60,
      );
      expect(metrics.queryPerformance.totalQueries).toBe(
        mockQueryStatistics.totalQueries,
      );
      expect(metrics.queryPerformance.errorRate).toBe(
        mockQueryStatistics.errorRate,
      );
    });

    it('should track system memory usage', async () => {
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 50 * 1024 * 1024, // 50 MB
        heapTotal: 100 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        rss: 75 * 1024 * 1024,
        arrayBuffers: 0,
      });

      const metrics = await service.collectMetrics();

      expect(metrics.resources.memoryUsage).toBe(50); // Should be in MB

      process.memoryUsage = originalMemoryUsage;
    });
  });
});
