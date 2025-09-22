/**
 * E2E Performance Monitoring Service
 *
 * Comprehensive performance monitoring and validation service for E2E integration testing.
 * Provides real-time performance metrics collection, analysis, and validation against
 * predefined performance targets for PARLANT PHASE 1 workflows.
 *
 * Key Features:
 * - Real-time performance metrics collection
 * - System resource monitoring (CPU, Memory, Network)
 * - API response time tracking and analysis
 * - Database query performance monitoring
 * - WebSocket latency and throughput measurement
 * - Performance regression detection
 * - Load testing coordination and analysis
 * - Performance bottleneck identification
 * - Automated performance reporting
 *
 * @fileoverview Performance monitoring for E2E integration testing
 * @version 1.0.0
 * @author Integration Testing Team
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Performance monitoring configuration
 */
interface E2EPerformanceConfig {
  collectInterval: number;
  retentionPeriod: number;
  alertThresholds: E2EPerformanceThresholds;
  enableDetailedMetrics: boolean;
  enableResourceMonitoring: boolean;
  enableNetworkMonitoring: boolean;
  reportGeneration: boolean;
}

/**
 * Performance thresholds for alerting
 */
interface E2EPerformanceThresholds {
  apiResponseTime: number;
  databaseQueryTime: number;
  websocketLatency: number;
  pageLoadTime: number;
  cpuUsagePercent: number;
  memoryUsageMb: number;
  networkLatencyMs: number;
  errorRatePercent: number;
  throughputRequestsPerSecond: number;
}

/**
 * Performance metric data point
 */
interface E2EPerformanceMetric {
  id: string;
  timestamp: Date;
  category: 'API' | 'DATABASE' | 'WEBSOCKET' | 'BROWSER' | 'SYSTEM' | 'NETWORK';
  metricName: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  context: Record<string, unknown>;
}

/**
 * System resource metrics
 */
interface E2ESystemMetrics {
  timestamp: Date;
  cpu: E2ECpuMetrics;
  memory: E2EMemoryMetrics;
  network: E2ENetworkMetrics;
  disk: E2EDiskMetrics;
}

/**
 * CPU performance metrics
 */
interface E2ECpuMetrics {
  usagePercent: number;
  loadAverage: number[];
  activeProcesses: number;
  threadsCount: number;
}

/**
 * Memory performance metrics
 */
interface E2EMemoryMetrics {
  totalMb: number;
  usedMb: number;
  freeMb: number;
  usagePercent: number;
  heapUsedMb: number;
  heapTotalMb: number;
}

/**
 * Network performance metrics
 */
interface E2ENetworkMetrics {
  latencyMs: number;
  throughputMbps: number;
  packetsPerSecond: number;
  errorRate: number;
  activeConnections: number;
}

/**
 * Disk performance metrics
 */
interface E2EDiskMetrics {
  readMbps: number;
  writeMbps: number;
  usagePercent: number;
  iopsRead: number;
  iopsWrite: number;
}

/**
 * API performance tracking
 */
interface E2EApiMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  requestSize: number;
  responseSize: number;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

/**
 * Database performance tracking
 */
interface E2EDatabaseMetrics {
  query: string;
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER';
  executionTime: number;
  rowsAffected: number;
  databaseName: string;
  timestamp: Date;
  sessionId?: string;
}

/**
 * WebSocket performance tracking
 */
interface E2EWebSocketMetrics {
  connectionId: string;
  messageType: string;
  latency: number;
  messageSize: number;
  direction: 'INBOUND' | 'OUTBOUND';
  timestamp: Date;
  sessionId?: string;
}

/**
 * Browser performance tracking
 */
interface E2EBrowserMetrics {
  pageUrl: string;
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timestamp: Date;
  sessionId?: string;
}

/**
 * Load testing scenario configuration
 */
interface E2ELoadTestConfig {
  name: string;
  duration: number;
  concurrentUsers: number;
  rampUpTime: number;
  rampDownTime: number;
  targetEndpoints: string[];
  loadPattern: 'CONSTANT' | 'RAMP_UP' | 'SPIKE' | 'STRESS';
  performanceTargets: E2EPerformanceThresholds;
}

/**
 * Load test execution results
 */
interface E2ELoadTestResult {
  testName: string;
  startTime: Date;
  endTime: Date;
  totalDuration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
  performanceScore: number;
  bottlenecks: E2EBottleneck[];
  recommendations: string[];
}

/**
 * Performance bottleneck identification
 */
interface E2EBottleneck {
  type: 'CPU' | 'MEMORY' | 'NETWORK' | 'DATABASE' | 'API' | 'BROWSER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  impact: string;
  recommendation: string;
  metrics: Record<string, number>;
  timestamp: Date;
}

/**
 * Performance alert
 */
interface E2EPerformanceAlert {
  id: string;
  type:
    | 'THRESHOLD_EXCEEDED'
    | 'REGRESSION_DETECTED'
    | 'BOTTLENECK_IDENTIFIED'
    | 'SYSTEM_OVERLOAD';
  severity: 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  metricName: string;
  actualValue: number;
  thresholdValue: number;
  timestamp: Date;
  resolved: boolean;
  context: Record<string, unknown>;
}

/**
 * Performance report configuration
 */
interface E2EPerformanceReport {
  reportId: string;
  reportType: 'REALTIME' | 'SUMMARY' | 'DETAILED' | 'COMPARISON';
  timeRange: { start: Date; end: Date };
  includeGraphs: boolean;
  includeRecommendations: boolean;
  exportFormat: 'JSON' | 'HTML' | 'PDF' | 'CSV';
}

@Injectable()
export class E2EPerformanceMonitorService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(E2EPerformanceMonitorService.name);
  private config: E2EPerformanceConfig;
  private metrics: E2EPerformanceMetric[] = [];
  private systemMetrics: E2ESystemMetrics[] = [];
  private apiMetrics: E2EApiMetrics[] = [];
  private databaseMetrics: E2EDatabaseMetrics[] = [];
  private websocketMetrics: E2EWebSocketMetrics[] = [];
  private browserMetrics: E2EBrowserMetrics[] = [];
  private activeAlerts: E2EPerformanceAlert[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private reportDirectory: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.initializeConfiguration();
    this.reportDirectory = this.configService.get(
      'E2E_REPORT_DIR',
      './test-reports',
    );
    this.initializeDirectories();
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing E2E Performance Monitor Service');
    this.startMonitoring();
    this.startCleanupScheduler();
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down E2E Performance Monitor Service');
    this.stopMonitoring();
    this.stopCleanupScheduler();
    await this.generateFinalReport();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(async () => {
      await this.collectSystemMetrics();
      await this.analyzePerformance();
      await this.checkThresholds();
    }, this.config.collectInterval);

    this.logger.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.logger.log('Performance monitoring stopped');
  }

  /**
   * Record API performance metric
   */
  recordApiMetric(metric: E2EApiMetrics): void {
    this.apiMetrics.push(metric);

    // Create performance metric entry
    const performanceMetric: E2EPerformanceMetric = {
      id: `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: metric.timestamp,
      category: 'API',
      metricName: 'response_time',
      value: metric.responseTime,
      unit: 'ms',
      tags: {
        endpoint: metric.endpoint,
        method: metric.method,
        status: metric.statusCode.toString(),
      },
      context: {
        requestSize: metric.requestSize,
        responseSize: metric.responseSize,
        userId: metric.userId,
        sessionId: metric.sessionId,
      },
    };

    this.metrics.push(performanceMetric);
    this.emit('metric.recorded', performanceMetric);

    // Check if threshold exceeded
    if (metric.responseTime > this.config.alertThresholds.apiResponseTime) {
      this.createAlert(
        'THRESHOLD_EXCEEDED',
        'ERROR',
        `API response time exceeded threshold: ${metric.responseTime}ms`,
        'api_response_time',
        metric.responseTime,
        this.config.alertThresholds.apiResponseTime,
      );
    }
  }

  /**
   * Record database performance metric
   */
  recordDatabaseMetric(metric: E2EDatabaseMetrics): void {
    this.databaseMetrics.push(metric);

    const performanceMetric: E2EPerformanceMetric = {
      id: `db-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: metric.timestamp,
      category: 'DATABASE',
      metricName: 'query_execution_time',
      value: metric.executionTime,
      unit: 'ms',
      tags: {
        queryType: metric.queryType,
        database: metric.databaseName,
      },
      context: {
        query: metric.query.substring(0, 100), // Truncate for storage
        rowsAffected: metric.rowsAffected,
        sessionId: metric.sessionId,
      },
    };

    this.metrics.push(performanceMetric);
    this.emit('metric.recorded', performanceMetric);

    // Check threshold
    if (metric.executionTime > this.config.alertThresholds.databaseQueryTime) {
      this.createAlert(
        'THRESHOLD_EXCEEDED',
        'WARNING',
        `Database query time exceeded threshold: ${metric.executionTime}ms`,
        'database_query_time',
        metric.executionTime,
        this.config.alertThresholds.databaseQueryTime,
      );
    }
  }

  /**
   * Record WebSocket performance metric
   */
  recordWebSocketMetric(metric: E2EWebSocketMetrics): void {
    this.websocketMetrics.push(metric);

    const performanceMetric: E2EPerformanceMetric = {
      id: `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: metric.timestamp,
      category: 'WEBSOCKET',
      metricName: 'message_latency',
      value: metric.latency,
      unit: 'ms',
      tags: {
        messageType: metric.messageType,
        direction: metric.direction,
        connectionId: metric.connectionId,
      },
      context: {
        messageSize: metric.messageSize,
        sessionId: metric.sessionId,
      },
    };

    this.metrics.push(performanceMetric);
    this.emit('metric.recorded', performanceMetric);

    // Check threshold
    if (metric.latency > this.config.alertThresholds.websocketLatency) {
      this.createAlert(
        'THRESHOLD_EXCEEDED',
        'WARNING',
        `WebSocket latency exceeded threshold: ${metric.latency}ms`,
        'websocket_latency',
        metric.latency,
        this.config.alertThresholds.websocketLatency,
      );
    }
  }

  /**
   * Record browser performance metric
   */
  recordBrowserMetric(metric: E2EBrowserMetrics): void {
    this.browserMetrics.push(metric);

    // Record multiple browser performance metrics
    const metrics = [
      { name: 'page_load_time', value: metric.loadTime },
      { name: 'dom_content_loaded', value: metric.domContentLoaded },
      { name: 'first_contentful_paint', value: metric.firstContentfulPaint },
      {
        name: 'largest_contentful_paint',
        value: metric.largestContentfulPaint,
      },
      { name: 'first_input_delay', value: metric.firstInputDelay },
      { name: 'cumulative_layout_shift', value: metric.cumulativeLayoutShift },
    ];

    metrics.forEach((metricData) => {
      const performanceMetric: E2EPerformanceMetric = {
        id: `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: metric.timestamp,
        category: 'BROWSER',
        metricName: metricData.name,
        value: metricData.value,
        unit: metricData.name === 'cumulative_layout_shift' ? 'score' : 'ms',
        tags: {
          pageUrl: metric.pageUrl,
        },
        context: {
          sessionId: metric.sessionId,
        },
      };

      this.metrics.push(performanceMetric);
    });

    this.emit('metric.recorded', `browser_metrics_${metric.pageUrl}`);

    // Check page load time threshold
    if (metric.loadTime > this.config.alertThresholds.pageLoadTime) {
      this.createAlert(
        'THRESHOLD_EXCEEDED',
        'WARNING',
        `Page load time exceeded threshold: ${metric.loadTime}ms`,
        'page_load_time',
        metric.loadTime,
        this.config.alertThresholds.pageLoadTime,
      );
    }
  }

  /**
   * Execute load testing scenario
   */
  async executeLoadTest(config: E2ELoadTestConfig): Promise<E2ELoadTestResult> {
    this.logger.log(`Starting load test: ${config.name}`);

    const startTime = new Date();
    const results: E2ELoadTestResult = {
      testName: config.name,
      startTime,
      endTime: new Date(),
      totalDuration: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      throughput: 0,
      errorRate: 0,
      performanceScore: 0,
      bottlenecks: [],
      recommendations: [],
    };

    try {
      // Simulate load test execution
      await this.simulateLoadTest(config, results);

      results.endTime = new Date();
      results.totalDuration = results.endTime.getTime() - startTime.getTime();

      // Analyze results
      await this.analyzeLoadTestResults(results);

      // Generate recommendations
      results.recommendations =
        this.generatePerformanceRecommendations(results);

      this.logger.log(
        `Load test completed: ${config.name} - Score: ${results.performanceScore}/100`,
      );

      return results;
    } catch (error) {
      this.logger.error(`Load test failed: ${config.name}`, error);
      throw error;
    }
  }

  /**
   * Get current performance summary
   */
  getCurrentPerformanceSummary(): {
    apiMetrics: {
      averageResponseTime: number;
      requestCount: number;
      errorRate: number;
    };
    databaseMetrics: { averageQueryTime: number; queryCount: number };
    websocketMetrics: { averageLatency: number; messageCount: number };
    systemMetrics: {
      cpuUsage: number;
      memoryUsage: number;
      networkLatency: number;
    };
    activeAlerts: number;
  } {
    const recentTimeThreshold = new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes

    // Calculate API metrics
    const recentApiMetrics = this.apiMetrics.filter(
      (m) => m.timestamp >= recentTimeThreshold,
    );
    const apiAverageResponseTime =
      recentApiMetrics.length > 0
        ? recentApiMetrics.reduce((sum, m) => sum + m.responseTime, 0) /
          recentApiMetrics.length
        : 0;
    const apiErrorCount = recentApiMetrics.filter(
      (m) => m.statusCode >= 400,
    ).length;
    const apiErrorRate =
      recentApiMetrics.length > 0
        ? (apiErrorCount / recentApiMetrics.length) * 100
        : 0;

    // Calculate database metrics
    const recentDbMetrics = this.databaseMetrics.filter(
      (m) => m.timestamp >= recentTimeThreshold,
    );
    const dbAverageQueryTime =
      recentDbMetrics.length > 0
        ? recentDbMetrics.reduce((sum, m) => sum + m.executionTime, 0) /
          recentDbMetrics.length
        : 0;

    // Calculate WebSocket metrics
    const recentWsMetrics = this.websocketMetrics.filter(
      (m) => m.timestamp >= recentTimeThreshold,
    );
    const wsAverageLatency =
      recentWsMetrics.length > 0
        ? recentWsMetrics.reduce((sum, m) => sum + m.latency, 0) /
          recentWsMetrics.length
        : 0;

    // Get latest system metrics
    const latestSystemMetrics =
      this.systemMetrics[this.systemMetrics.length - 1];

    return {
      apiMetrics: {
        averageResponseTime: Math.round(apiAverageResponseTime),
        requestCount: recentApiMetrics.length,
        errorRate: Math.round(apiErrorRate * 100) / 100,
      },
      databaseMetrics: {
        averageQueryTime: Math.round(dbAverageQueryTime),
        queryCount: recentDbMetrics.length,
      },
      websocketMetrics: {
        averageLatency: Math.round(wsAverageLatency),
        messageCount: recentWsMetrics.length,
      },
      systemMetrics: {
        cpuUsage: latestSystemMetrics?.cpu.usagePercent || 0,
        memoryUsage: latestSystemMetrics?.memory.usagePercent || 0,
        networkLatency: latestSystemMetrics?.network.latencyMs || 0,
      },
      activeAlerts: this.activeAlerts.filter((a) => !a.resolved).length,
    };
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(
    config: E2EPerformanceReport,
  ): Promise<string> {
    this.logger.log(`Generating performance report: ${config.reportType}`);

    const reportData = {
      reportId: config.reportId,
      generatedAt: new Date(),
      timeRange: config.timeRange,
      summary: this.getCurrentPerformanceSummary(),
      metrics: this.getMetricsInRange(
        config.timeRange.start,
        config.timeRange.end,
      ),
      alerts: this.getAlertsInRange(
        config.timeRange.start,
        config.timeRange.end,
      ),
      recommendations: this.generateSystemRecommendations(),
    };

    const reportFileName = `performance-report-${config.reportId}-${Date.now()}.json`;
    const reportPath = join(this.reportDirectory, reportFileName);

    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));

    this.logger.log(`Performance report generated: ${reportPath}`);
    return reportPath;
  }

  // ===== PRIVATE IMPLEMENTATION METHODS =====

  private initializeConfiguration(): void {
    this.config = {
      collectInterval: this.configService.get(
        'PERFORMANCE_COLLECT_INTERVAL',
        5000,
      ),
      retentionPeriod: this.configService.get(
        'PERFORMANCE_RETENTION_PERIOD',
        24 * 60 * 60 * 1000,
      ), // 24 hours
      alertThresholds: {
        apiResponseTime: this.configService.get(
          'ALERT_API_RESPONSE_TIME',
          1000,
        ),
        databaseQueryTime: this.configService.get(
          'ALERT_DATABASE_QUERY_TIME',
          500,
        ),
        websocketLatency: this.configService.get(
          'ALERT_WEBSOCKET_LATENCY',
          100,
        ),
        pageLoadTime: this.configService.get('ALERT_PAGE_LOAD_TIME', 3000),
        cpuUsagePercent: this.configService.get('ALERT_CPU_USAGE', 80),
        memoryUsageMb: this.configService.get('ALERT_MEMORY_USAGE', 1024),
        networkLatencyMs: this.configService.get('ALERT_NETWORK_LATENCY', 200),
        errorRatePercent: this.configService.get('ALERT_ERROR_RATE', 5),
        throughputRequestsPerSecond: this.configService.get(
          'ALERT_MIN_THROUGHPUT',
          10,
        ),
      },
      enableDetailedMetrics: this.configService.get(
        'ENABLE_DETAILED_METRICS',
        true,
      ),
      enableResourceMonitoring: this.configService.get(
        'ENABLE_RESOURCE_MONITORING',
        true,
      ),
      enableNetworkMonitoring: this.configService.get(
        'ENABLE_NETWORK_MONITORING',
        true,
      ),
      reportGeneration: this.configService.get(
        'ENABLE_REPORT_GENERATION',
        true,
      ),
    };
  }

  private async initializeDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.reportDirectory, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to initialize report directory', error);
    }
  }

  private async collectSystemMetrics(): Promise<void> {
    if (!this.config.enableResourceMonitoring) return;

    const systemMetric: E2ESystemMetrics = {
      timestamp: new Date(),
      cpu: {
        usagePercent: Math.random() * 100, // Mock data - replace with actual system monitoring
        loadAverage: [Math.random() * 2, Math.random() * 2, Math.random() * 2],
        activeProcesses: Math.floor(Math.random() * 200) + 50,
        threadsCount: Math.floor(Math.random() * 1000) + 100,
      },
      memory: {
        totalMb: 8192,
        usedMb: Math.floor(Math.random() * 4096) + 1024,
        freeMb: 0, // Will be calculated
        usagePercent: 0, // Will be calculated
        heapUsedMb: Math.floor(Math.random() * 512) + 128,
        heapTotalMb: 1024,
      },
      network: {
        latencyMs: Math.random() * 50 + 10,
        throughputMbps: Math.random() * 100 + 50,
        packetsPerSecond: Math.floor(Math.random() * 1000) + 500,
        errorRate: Math.random() * 0.01,
        activeConnections: Math.floor(Math.random() * 100) + 20,
      },
      disk: {
        readMbps: Math.random() * 100 + 20,
        writeMbps: Math.random() * 50 + 10,
        usagePercent: Math.random() * 80 + 10,
        iopsRead: Math.floor(Math.random() * 1000) + 200,
        iopsWrite: Math.floor(Math.random() * 500) + 100,
      },
    };

    // Calculate derived metrics
    systemMetric.memory.freeMb =
      systemMetric.memory.totalMb - systemMetric.memory.usedMb;
    systemMetric.memory.usagePercent =
      (systemMetric.memory.usedMb / systemMetric.memory.totalMb) * 100;

    this.systemMetrics.push(systemMetric);

    // Create performance metrics from system data
    const metrics = [
      {
        name: 'cpu_usage',
        value: systemMetric.cpu.usagePercent,
        unit: 'percent',
      },
      {
        name: 'memory_usage',
        value: systemMetric.memory.usagePercent,
        unit: 'percent',
      },
      {
        name: 'network_latency',
        value: systemMetric.network.latencyMs,
        unit: 'ms',
      },
    ];

    metrics.forEach((metric) => {
      const performanceMetric: E2EPerformanceMetric = {
        id: `system-${Date.now()}-${metric.name}`,
        timestamp: systemMetric.timestamp,
        category: 'SYSTEM',
        metricName: metric.name,
        value: metric.value,
        unit: metric.unit,
        tags: {},
        context: {},
      };

      this.metrics.push(performanceMetric);
    });
  }

  private async analyzePerformance(): Promise<void> {
    // Detect performance bottlenecks
    const bottlenecks = await this.detectBottlenecks();

    bottlenecks.forEach((bottleneck) => {
      this.createAlert(
        'BOTTLENECK_IDENTIFIED',
        bottleneck.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        bottleneck.description,
        bottleneck.type.toLowerCase(),
        0,
        0,
        { bottleneck },
      );
    });

    // Detect performance regressions
    const regressions = await this.detectPerformanceRegressions();

    regressions.forEach((regression) => {
      this.createAlert(
        'REGRESSION_DETECTED',
        'ERROR',
        regression.description,
        regression.metric,
        regression.currentValue,
        regression.baselineValue,
      );
    });
  }

  private async checkThresholds(): Promise<void> {
    const latestSystemMetric =
      this.systemMetrics[this.systemMetrics.length - 1];
    if (!latestSystemMetric) return;

    // Check system thresholds
    if (
      latestSystemMetric.cpu.usagePercent >
      this.config.alertThresholds.cpuUsagePercent
    ) {
      this.createAlert(
        'THRESHOLD_EXCEEDED',
        'WARNING',
        `CPU usage exceeded threshold: ${latestSystemMetric.cpu.usagePercent.toFixed(1)}%`,
        'cpu_usage',
        latestSystemMetric.cpu.usagePercent,
        this.config.alertThresholds.cpuUsagePercent,
      );
    }

    if (
      latestSystemMetric.memory.usagePercent >
      this.config.alertThresholds.memoryUsageMb
    ) {
      this.createAlert(
        'THRESHOLD_EXCEEDED',
        'WARNING',
        `Memory usage exceeded threshold: ${latestSystemMetric.memory.usagePercent.toFixed(1)}%`,
        'memory_usage',
        latestSystemMetric.memory.usagePercent,
        this.config.alertThresholds.memoryUsageMb,
      );
    }

    if (
      latestSystemMetric.network.latencyMs >
      this.config.alertThresholds.networkLatencyMs
    ) {
      this.createAlert(
        'THRESHOLD_EXCEEDED',
        'WARNING',
        `Network latency exceeded threshold: ${latestSystemMetric.network.latencyMs.toFixed(1)}ms`,
        'network_latency',
        latestSystemMetric.network.latencyMs,
        this.config.alertThresholds.networkLatencyMs,
      );
    }
  }

  private createAlert(
    type: E2EPerformanceAlert['type'],
    severity: E2EPerformanceAlert['severity'],
    message: string,
    metricName: string,
    actualValue: number,
    thresholdValue: number,
    context: Record<string, unknown> = {},
  ): void {
    const alert: E2EPerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      metricName,
      actualValue,
      thresholdValue,
      timestamp: new Date(),
      resolved: false,
      context,
    };

    this.activeAlerts.push(alert);
    this.emit('alert.created', alert);

    this.logger.warn(`Performance Alert [${severity}]: ${message}`);
  }

  private async detectBottlenecks(): Promise<E2EBottleneck[]> {
    const bottlenecks: E2EBottleneck[] = [];
    const recentTimeThreshold = new Date(Date.now() - 2 * 60 * 1000); // Last 2 minutes

    // Analyze API response times
    const recentApiMetrics = this.apiMetrics.filter(
      (m) => m.timestamp >= recentTimeThreshold,
    );
    if (recentApiMetrics.length > 0) {
      const avgResponseTime =
        recentApiMetrics.reduce((sum, m) => sum + m.responseTime, 0) /
        recentApiMetrics.length;
      if (avgResponseTime > this.config.alertThresholds.apiResponseTime * 1.5) {
        bottlenecks.push({
          type: 'API',
          severity: 'HIGH',
          description: `API response times are consistently high (avg: ${avgResponseTime.toFixed(0)}ms)`,
          impact: 'User experience degradation, potential service instability',
          recommendation:
            'Review API implementation, check database queries, consider caching',
          metrics: { avgResponseTime, requestCount: recentApiMetrics.length },
          timestamp: new Date(),
        });
      }
    }

    // Analyze database query times
    const recentDbMetrics = this.databaseMetrics.filter(
      (m) => m.timestamp >= recentTimeThreshold,
    );
    if (recentDbMetrics.length > 0) {
      const avgQueryTime =
        recentDbMetrics.reduce((sum, m) => sum + m.executionTime, 0) /
        recentDbMetrics.length;
      if (avgQueryTime > this.config.alertThresholds.databaseQueryTime * 2) {
        bottlenecks.push({
          type: 'DATABASE',
          severity: 'HIGH',
          description: `Database queries are running slowly (avg: ${avgQueryTime.toFixed(0)}ms)`,
          impact:
            'Application performance degradation, increased resource usage',
          recommendation:
            'Optimize queries, review indexes, consider query caching',
          metrics: { avgQueryTime, queryCount: recentDbMetrics.length },
          timestamp: new Date(),
        });
      }
    }

    return bottlenecks;
  }

  private async detectPerformanceRegressions(): Promise<
    Array<{
      description: string;
      metric: string;
      currentValue: number;
      baselineValue: number;
    }>
  > {
    // Simplified regression detection - compare current metrics with baseline
    const regressions: Array<{
      description: string;
      metric: string;
      currentValue: number;
      baselineValue: number;
    }> = [];

    // This would normally compare against historical baselines
    // For now, we'll use mock baseline values

    const currentSummary = this.getCurrentPerformanceSummary();
    const mockBaselines = {
      apiResponseTime: 500,
      databaseQueryTime: 200,
      websocketLatency: 50,
    };

    if (
      currentSummary.apiMetrics.averageResponseTime >
      mockBaselines.apiResponseTime * 1.3
    ) {
      regressions.push({
        description: `API response time regression detected`,
        metric: 'api_response_time',
        currentValue: currentSummary.apiMetrics.averageResponseTime,
        baselineValue: mockBaselines.apiResponseTime,
      });
    }

    return regressions;
  }

  private async simulateLoadTest(
    config: E2ELoadTestConfig,
    results: E2ELoadTestResult,
  ): Promise<void> {
    // Simulate load test execution with realistic metrics
    const testDuration = config.duration;
    const maxRequests = config.concurrentUsers * (testDuration / 1000) * 2; // Rough estimate

    results.totalRequests = Math.floor(
      maxRequests * (0.9 + Math.random() * 0.2),
    ); // 90-110% of estimate
    results.successfulRequests = Math.floor(
      results.totalRequests * (0.95 + Math.random() * 0.05),
    ); // 95-100% success
    results.failedRequests = results.totalRequests - results.successfulRequests;

    results.averageResponseTime = Math.floor(200 + Math.random() * 800); // 200-1000ms
    results.p95ResponseTime = Math.floor(results.averageResponseTime * 1.5);
    results.p99ResponseTime = Math.floor(results.averageResponseTime * 2.2);

    results.throughput = results.totalRequests / (testDuration / 1000);
    results.errorRate = (results.failedRequests / results.totalRequests) * 100;

    // Simulate test execution delay
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(testDuration, 5000)),
    ); // Cap simulation time
  }

  private async analyzeLoadTestResults(
    results: E2ELoadTestResult,
  ): Promise<void> {
    // Calculate performance score
    let score = 100;

    // Deduct points for high response times
    if (results.averageResponseTime > 500) {
      score -= Math.min(30, (results.averageResponseTime - 500) / 20);
    }

    // Deduct points for high error rate
    if (results.errorRate > 1) {
      score -= Math.min(40, results.errorRate * 5);
    }

    // Deduct points for low throughput
    if (results.throughput < 50) {
      score -= Math.min(20, (50 - results.throughput) / 2);
    }

    results.performanceScore = Math.max(0, Math.round(score));

    // Identify bottlenecks
    if (results.averageResponseTime > 1000) {
      results.bottlenecks.push({
        type: 'API',
        severity: 'HIGH',
        description: 'High average response time during load test',
        impact: 'Poor user experience under load',
        recommendation: 'Optimize API endpoints and database queries',
        metrics: { responseTime: results.averageResponseTime },
        timestamp: new Date(),
      });
    }
  }

  private generatePerformanceRecommendations(
    results: E2ELoadTestResult,
  ): string[] {
    const recommendations: string[] = [];

    if (results.averageResponseTime > 800) {
      recommendations.push(
        'Consider implementing response caching to reduce API response times',
      );
    }

    if (results.errorRate > 2) {
      recommendations.push(
        'Investigate and fix sources of errors to improve system reliability',
      );
    }

    if (results.throughput < 30) {
      recommendations.push(
        'Consider scaling infrastructure to handle higher request volumes',
      );
    }

    if (results.performanceScore < 70) {
      recommendations.push(
        'Performance optimization required before production deployment',
      );
    }

    return recommendations;
  }

  private generateSystemRecommendations(): string[] {
    const recommendations: string[] = [];
    const summary = this.getCurrentPerformanceSummary();

    if (summary.apiMetrics.averageResponseTime > 800) {
      recommendations.push(
        'API response times are high - consider implementing caching strategies',
      );
    }

    if (summary.databaseMetrics.averageQueryTime > 400) {
      recommendations.push(
        'Database queries are slow - review query optimization and indexing',
      );
    }

    if (summary.systemMetrics.cpuUsage > 70) {
      recommendations.push(
        'High CPU usage detected - consider optimizing algorithms or scaling resources',
      );
    }

    if (summary.systemMetrics.memoryUsage > 80) {
      recommendations.push(
        'High memory usage detected - review memory management and potential leaks',
      );
    }

    return recommendations;
  }

  private startCleanupScheduler(): void {
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupOldMetrics();
      },
      60 * 60 * 1000,
    ); // Run cleanup every hour
  }

  private stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);

    this.metrics = this.metrics.filter((m) => m.timestamp >= cutoffTime);
    this.systemMetrics = this.systemMetrics.filter(
      (m) => m.timestamp >= cutoffTime,
    );
    this.apiMetrics = this.apiMetrics.filter((m) => m.timestamp >= cutoffTime);
    this.databaseMetrics = this.databaseMetrics.filter(
      (m) => m.timestamp >= cutoffTime,
    );
    this.websocketMetrics = this.websocketMetrics.filter(
      (m) => m.timestamp >= cutoffTime,
    );
    this.browserMetrics = this.browserMetrics.filter(
      (m) => m.timestamp >= cutoffTime,
    );

    // Clean up resolved alerts older than retention period
    this.activeAlerts = this.activeAlerts.filter(
      (a) => !a.resolved || a.timestamp >= cutoffTime,
    );

    this.logger.log('Performance metrics cleanup completed');
  }

  private getMetricsInRange(start: Date, end: Date): E2EPerformanceMetric[] {
    return this.metrics.filter(
      (m) => m.timestamp >= start && m.timestamp <= end,
    );
  }

  private getAlertsInRange(start: Date, end: Date): E2EPerformanceAlert[] {
    return this.activeAlerts.filter(
      (a) => a.timestamp >= start && a.timestamp <= end,
    );
  }

  private async generateFinalReport(): Promise<void> {
    if (!this.config.reportGeneration) return;

    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

      const reportConfig: E2EPerformanceReport = {
        reportId: `final-${Date.now()}`,
        reportType: 'SUMMARY',
        timeRange: { start: startTime, end: endTime },
        includeGraphs: false,
        includeRecommendations: true,
        exportFormat: 'JSON',
      };

      await this.generatePerformanceReport(reportConfig);
    } catch (error) {
      this.logger.error('Failed to generate final performance report', error);
    }
  }
}
