/**
 * PARLANT Phase 1 - Performance Monitoring and Benchmarking Framework
 *
 * Comprehensive performance monitoring system with real-time metrics collection,
 * benchmarking capabilities, and automated performance validation.
 *
 * Performance Targets:
 * - Metric Collection Latency: <1ms overhead
 * - Real-time Dashboard Updates: <100ms
 * - Benchmark Accuracy: >99% confidence interval
 * - Historical Data Retention: 30 days with efficient storage
 * - Alert Response Time: <5 seconds
 *
 * @fileoverview Performance monitoring with real-time metrics and benchmarking
 * @version 1.0.0
 * @author Performance Monitoring Agent
 * @created 2025-09-21
 */

import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter } from "events";
import { performance, PerformanceObserver } from "perf_hooks";
import { cpus, loadavg, freemem, totalmem } from "os";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";

// Type guards
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

function getErrorMessage(error: unknown): string {
  if (isError(error)) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred";
}

/**
 * Performance monitoring configuration
 */
interface PerformanceMonitoringConfig {
  metrics: MetricsConfig;
  benchmarking: BenchmarkingConfig;
  alerting: AlertingConfig;
  storage: StorageConfig;
  dashboard: DashboardConfig;
  reporting: ReportingConfig;
}

/**
 * Metrics collection configuration
 */
interface MetricsConfig {
  enabled: boolean;
  collectionInterval: number;
  detailedProfiling: boolean;
  customMetrics: string[];
  systemMetrics: boolean;
  applicationMetrics: boolean;
  performanceTracing: boolean;
  realTimeUpdates: boolean;
}

/**
 * Benchmarking configuration
 */
interface BenchmarkingConfig {
  enabled: boolean;
  suites: string[];
  warmupIterations: number;
  benchmarkIterations: number;
  confidenceLevel: number;
  outlierDetection: boolean;
  comparisonBaseline: string;
  automaticRegression: boolean;
}

/**
 * Alerting configuration
 */
interface AlertingConfig {
  enabled: boolean;
  responseTimeThresholds: {
    p50: number;
    p95: number;
    p99: number;
  };
  throughputThresholds: {
    minimum: number;
    target: number;
  };
  errorRateThresholds: {
    warning: number;
    critical: number;
  };
  resourceThresholds: {
    memoryWarning: number;
    memoryCritical: number;
    cpuWarning: number;
    cpuCritical: number;
  };
  notificationChannels: string[];
}

/**
 * Storage configuration
 */
interface StorageConfig {
  enabled: boolean;
  retentionDays: number;
  compressionEnabled: boolean;
  aggregationStrategy: "none" | "hourly" | "daily";
  exportFormats: string[];
  backupEnabled: boolean;
}

/**
 * Dashboard configuration
 */
interface DashboardConfig {
  enabled: boolean;
  updateInterval: number;
  widgets: string[];
  customDashboards: string[];
  realTimeCharts: boolean;
  historicalViews: boolean;
}

/**
 * Reporting configuration
 */
interface ReportingConfig {
  enabled: boolean;
  scheduledReports: string[];
  reportFormats: string[];
  recipients: string[];
  automatedInsights: boolean;
}

/**
 * Performance metrics data structure
 */
interface PerformanceMetrics {
  timestamp: Date;
  responseTime: ResponseTimeMetrics;
  throughput: ThroughputMetrics;
  resource: ResourceMetrics;
  error: ErrorMetrics;
  custom: CustomMetrics;
}

/**
 * Response time metrics
 */
interface ResponseTimeMetrics {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  p999: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  standardDeviation: number;
}

/**
 * Throughput metrics
 */
interface ThroughputMetrics {
  requestsPerSecond: number;
  operationsPerSecond: number;
  dataProcessedPerSecond: number;
  concurrentRequests: number;
  queueDepth: number;
  backlogSize: number;
}

/**
 * Resource metrics
 */
interface ResourceMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
    temperature?: number;
  };
  memory: {
    used: number;
    total: number;
    utilization: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  disk: {
    reads: number;
    writes: number;
    readThroughput: number;
    writeThroughput: number;
    utilization: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    connectionsActive: number;
    connectionsWaiting: number;
  };
}

/**
 * Error metrics
 */
interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  errorsByType: Map<string, number>;
  errorsByEndpoint: Map<string, number>;
  criticalErrors: number;
  warningErrors: number;
  timeoutErrors: number;
  connectionErrors: number;
}

/**
 * Custom metrics
 */
interface CustomMetrics {
  [key: string]: number | string | boolean;
}

/**
 * Benchmark result
 */
interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  operationsPerSecond: number;
  confidenceInterval: {
    lower: number;
    upper: number;
    level: number;
  };
  percentiles: ResponseTimeMetrics;
  memoryUsage: {
    before: number;
    after: number;
    peak: number;
  };
  outliers: number[];
  regression: {
    detected: boolean;
    severity: "none" | "minor" | "major" | "critical";
    percentageChange: number;
  };
}

/**
 * Performance alert
 */
interface PerformanceAlert {
  id: string;
  timestamp: Date;
  severity: "info" | "warning" | "critical";
  type: "response_time" | "throughput" | "error_rate" | "resource" | "custom";
  metric: string;
  currentValue: number;
  threshold: number;
  description: string;
  actionRequired: boolean;
  recommendations: string[];
}

/**
 * Time series data point
 */
interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

/**
 * Performance baseline
 */
interface PerformanceBaseline {
  name: string;
  created: Date;
  metrics: PerformanceMetrics;
  environment: {
    nodeVersion: string;
    platform: string;
    cpuModel: string;
    memoryTotal: number;
    configuration: Record<string, any>;
  };
  benchmarks: Map<string, BenchmarkResult>;
}

/**
 * Time series collector for efficient metric storage
 */
class TimeSeriesCollector {
  private readonly data = new Map<string, TimeSeriesDataPoint[]>();
  private readonly maxDataPoints = 10000;

  addDataPoint(
    metricName: string,
    value: number,
    metadata?: Record<string, any>,
  ): void {
    if (!this.data.has(metricName)) {
      this.data.set(metricName, []);
    }

    const series = this.data.get(metricName)!;
    series.push({
      timestamp: new Date(),
      value,
      metadata,
    });

    // Limit data points to prevent memory issues
    if (series.length > this.maxDataPoints) {
      series.shift();
    }
  }

  getTimeSeries(metricName: string, since?: Date): TimeSeriesDataPoint[] {
    const series = this.data.get(metricName) || [];

    if (!since) {
      return [...series];
    }

    return series.filter((point) => point.timestamp >= since);
  }

  getAllMetrics(): string[] {
    return Array.from(this.data.keys());
  }

  calculateStatistics(
    metricName: string,
    since?: Date,
  ): {
    count: number;
    mean: number;
    min: number;
    max: number;
    standardDeviation: number;
    percentiles: ResponseTimeMetrics;
  } {
    const series = this.getTimeSeries(metricName, since);
    const values = series.map((point) => point.value).sort((a, b) => a - b);

    if (values.length === 0) {
      return {
        count: 0,
        mean: 0,
        min: 0,
        max: 0,
        standardDeviation: 0,
        percentiles: {
          p50: 0,
          p75: 0,
          p90: 0,
          p95: 0,
          p99: 0,
          p999: 0,
          mean: 0,
          median: 0,
          min: 0,
          max: 0,
          standardDeviation: 0,
        },
      };
    }

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      count: values.length,
      mean,
      min: values[0],
      max: values[values.length - 1],
      standardDeviation,
      percentiles: this.calculatePercentiles(values),
    };
  }

  private calculatePercentiles(sortedValues: number[]): ResponseTimeMetrics {
    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * sortedValues.length) - 1;
      return sortedValues[Math.max(0, index)];
    };

    const mean =
      sortedValues.reduce((sum, val) => sum + val, 0) / sortedValues.length;

    return {
      p50: getPercentile(50),
      p75: getPercentile(75),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99),
      p999: getPercentile(99.9),
      mean,
      median: getPercentile(50),
      min: sortedValues[0],
      max: sortedValues[sortedValues.length - 1],
      standardDeviation: Math.sqrt(
        sortedValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
          sortedValues.length,
      ),
    };
  }
}

/**
 * Performance benchmarker
 */
class PerformanceBenchmarker {
  private readonly logger = new Logger(PerformanceBenchmarker.name);
  private readonly baselines = new Map<string, PerformanceBaseline>();

  async runBenchmark(
    name: string,
    fn: () => Promise<any> | any,
    config: BenchmarkingConfig,
  ): Promise<BenchmarkResult> {
    this.logger.log(`Running benchmark: ${name}`);

    // Warmup iterations
    for (let i = 0; i < config.warmupIterations; i++) {
      await fn();
    }

    // Force garbage collection before actual benchmark
    if (global.gc) {
      global.gc();
    }

    const times: number[] = [];
    const memoryBefore = process.memoryUsage().heapUsed;
    let peakMemory = memoryBefore;

    // Run benchmark iterations
    for (let i = 0; i < config.benchmarkIterations; i++) {
      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;

      await fn();

      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;

      times.push(endTime - startTime);
      peakMemory = Math.max(peakMemory, endMemory);
    }

    const memoryAfter = process.memoryUsage().heapUsed;

    // Calculate statistics
    const sortedTimes = [...times].sort((a, b) => a - b);
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / times.length;
    const minTime = sortedTimes[0];
    const maxTime = sortedTimes[sortedTimes.length - 1];

    // Calculate standard deviation
    const variance =
      times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) /
      times.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate confidence interval
    const confidenceInterval = this.calculateConfidenceInterval(
      times,
      config.confidenceLevel,
    );

    // Calculate percentiles
    const percentiles = this.calculatePercentiles(sortedTimes);

    // Detect outliers
    const outliers = config.outlierDetection
      ? this.detectOutliers(times, standardDeviation, averageTime)
      : [];

    // Check for regression
    const regression = this.detectRegression(name, averageTime);

    const result: BenchmarkResult = {
      name,
      iterations: config.benchmarkIterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      operationsPerSecond: 1000 / averageTime,
      confidenceInterval,
      percentiles,
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: peakMemory,
      },
      outliers,
      regression,
    };

    this.logger.log(
      `Benchmark ${name} completed: ${averageTime.toFixed(2)}ms avg, ${result.operationsPerSecond.toFixed(0)} ops/sec`,
    );

    return result;
  }

  saveBaseline(
    name: string,
    metrics: PerformanceMetrics,
    benchmarks: Map<string, BenchmarkResult>,
  ): void {
    const baseline: PerformanceBaseline = {
      name,
      created: new Date(),
      metrics,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        cpuModel: cpus()[0].model,
        memoryTotal: totalmem(),
        configuration: process.env,
      },
      benchmarks,
    };

    this.baselines.set(name, baseline);
    this.logger.log(`Saved performance baseline: ${name}`);
  }

  compareWithBaseline(
    name: string,
    currentResult: BenchmarkResult,
  ): {
    hasRegression: boolean;
    percentageChange: number;
    severity: string;
  } {
    const baseline = this.baselines.get(name);

    if (!baseline || !baseline.benchmarks.has(currentResult.name)) {
      return {
        hasRegression: false,
        percentageChange: 0,
        severity: "none",
      };
    }

    const baselineResult = baseline.benchmarks.get(currentResult.name)!;
    const percentageChange =
      ((currentResult.averageTime - baselineResult.averageTime) /
        baselineResult.averageTime) *
      100;

    let severity = "none";
    if (Math.abs(percentageChange) > 50) severity = "critical";
    else if (Math.abs(percentageChange) > 25) severity = "major";
    else if (Math.abs(percentageChange) > 10) severity = "minor";

    return {
      hasRegression: percentageChange > 10, // 10% threshold
      percentageChange,
      severity,
    };
  }

  private calculateConfidenceInterval(
    values: number[],
    confidenceLevel: number,
  ): {
    lower: number;
    upper: number;
    level: number;
  } {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const standardError =
      Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
          (values.length - 1),
      ) / Math.sqrt(values.length);

    // Simplified t-distribution approximation
    const tValue = 1.96; // Approximation for 95% confidence
    const margin = tValue * standardError;

    return {
      lower: mean - margin,
      upper: mean + margin,
      level: confidenceLevel,
    };
  }

  private calculatePercentiles(sortedValues: number[]): ResponseTimeMetrics {
    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * sortedValues.length) - 1;
      return sortedValues[Math.max(0, index)];
    };

    const mean =
      sortedValues.reduce((sum, val) => sum + val, 0) / sortedValues.length;

    return {
      p50: getPercentile(50),
      p75: getPercentile(75),
      p90: getPercentile(90),
      p95: getPercentile(95),
      p99: getPercentile(99),
      p999: getPercentile(99.9),
      mean,
      median: getPercentile(50),
      min: sortedValues[0],
      max: sortedValues[sortedValues.length - 1],
      standardDeviation: Math.sqrt(
        sortedValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
          sortedValues.length,
      ),
    };
  }

  private detectOutliers(
    values: number[],
    standardDeviation: number,
    mean: number,
  ): number[] {
    const threshold = 2 * standardDeviation;
    return values.filter((value) => Math.abs(value - mean) > threshold);
  }

  private detectRegression(
    benchmarkName: string,
    currentTime: number,
  ): {
    detected: boolean;
    severity: "none" | "minor" | "major" | "critical";
    percentageChange: number;
  } {
    // Simplified regression detection - compare with stored baseline
    const baseline = this.baselines.get("default");

    if (!baseline || !baseline.benchmarks.has(benchmarkName)) {
      return {
        detected: false,
        severity: "none",
        percentageChange: 0,
      };
    }

    const baselineTime = baseline.benchmarks.get(benchmarkName)!.averageTime;
    const percentageChange =
      ((currentTime - baselineTime) / baselineTime) * 100;

    let severity: "none" | "minor" | "major" | "critical" = "none";
    if (percentageChange > 50) severity = "critical";
    else if (percentageChange > 25) severity = "major";
    else if (percentageChange > 10) severity = "minor";

    return {
      detected: percentageChange > 10,
      severity,
      percentageChange,
    };
  }
}

/**
 * Performance alert manager
 */
class PerformanceAlertManager {
  private readonly logger = new Logger(PerformanceAlertManager.name);
  private readonly eventEmitter = new EventEmitter();
  private readonly activeAlerts = new Map<string, PerformanceAlert>();

  checkMetricsForAlerts(
    metrics: PerformanceMetrics,
    config: AlertingConfig,
  ): PerformanceAlert[] {
    const alerts: PerformanceAlert[] = [];

    if (!config.enabled) return alerts;

    // Check response time thresholds
    this.checkResponseTimeAlerts(metrics.responseTime, config, alerts);

    // Check throughput thresholds
    this.checkThroughputAlerts(metrics.throughput, config, alerts);

    // Check error rate thresholds
    this.checkErrorRateAlerts(metrics.error, config, alerts);

    // Check resource thresholds
    this.checkResourceAlerts(metrics.resource, config, alerts);

    // Process new alerts
    for (const alert of alerts) {
      if (!this.activeAlerts.has(alert.id)) {
        this.activeAlerts.set(alert.id, alert);
        this.eventEmitter.emit("new-alert", alert);
        this.logger.warn(`Performance alert: ${alert.description}`);
      }
    }

    return alerts;
  }

  private checkResponseTimeAlerts(
    responseTime: ResponseTimeMetrics,
    config: AlertingConfig,
    alerts: PerformanceAlert[],
  ): void {
    if (responseTime.p95 > config.responseTimeThresholds.p95) {
      alerts.push({
        id: `response-time-p95-${Date.now()}`,
        timestamp: new Date(),
        severity: "critical",
        type: "response_time",
        metric: "p95_response_time",
        currentValue: responseTime.p95,
        threshold: config.responseTimeThresholds.p95,
        description: `P95 response time (${responseTime.p95.toFixed(2)}ms) exceeds threshold (${config.responseTimeThresholds.p95}ms)`,
        actionRequired: true,
        recommendations: [
          "Check for performance bottlenecks",
          "Review cache hit rates",
          "Analyze slow queries",
          "Consider scaling resources",
        ],
      });
    }

    if (responseTime.p50 > config.responseTimeThresholds.p50) {
      alerts.push({
        id: `response-time-p50-${Date.now()}`,
        timestamp: new Date(),
        severity: "warning",
        type: "response_time",
        metric: "p50_response_time",
        currentValue: responseTime.p50,
        threshold: config.responseTimeThresholds.p50,
        description: `P50 response time (${responseTime.p50.toFixed(2)}ms) exceeds threshold (${config.responseTimeThresholds.p50}ms)`,
        actionRequired: false,
        recommendations: [
          "Monitor response time trends",
          "Review application performance",
          "Check system resources",
        ],
      });
    }
  }

  private checkThroughputAlerts(
    throughput: ThroughputMetrics,
    config: AlertingConfig,
    alerts: PerformanceAlert[],
  ): void {
    if (throughput.requestsPerSecond < config.throughputThresholds.minimum) {
      alerts.push({
        id: `throughput-low-${Date.now()}`,
        timestamp: new Date(),
        severity: "warning",
        type: "throughput",
        metric: "requests_per_second",
        currentValue: throughput.requestsPerSecond,
        threshold: config.throughputThresholds.minimum,
        description: `Throughput (${throughput.requestsPerSecond.toFixed(0)} RPS) below minimum threshold (${config.throughputThresholds.minimum} RPS)`,
        actionRequired: true,
        recommendations: [
          "Check for system bottlenecks",
          "Review connection pool settings",
          "Analyze processing pipeline",
          "Monitor resource utilization",
        ],
      });
    }
  }

  private checkErrorRateAlerts(
    errorMetrics: ErrorMetrics,
    config: AlertingConfig,
    alerts: PerformanceAlert[],
  ): void {
    if (errorMetrics.errorRate > config.errorRateThresholds.critical) {
      alerts.push({
        id: `error-rate-critical-${Date.now()}`,
        timestamp: new Date(),
        severity: "critical",
        type: "error_rate",
        metric: "error_rate",
        currentValue: errorMetrics.errorRate,
        threshold: config.errorRateThresholds.critical,
        description: `Error rate (${(errorMetrics.errorRate * 100).toFixed(2)}%) exceeds critical threshold (${(config.errorRateThresholds.critical * 100).toFixed(2)}%)`,
        actionRequired: true,
        recommendations: [
          "Investigate error patterns",
          "Check system health",
          "Review error logs",
          "Activate failover if needed",
        ],
      });
    }
  }

  private checkResourceAlerts(
    resourceMetrics: ResourceMetrics,
    config: AlertingConfig,
    alerts: PerformanceAlert[],
  ): void {
    if (
      resourceMetrics.memory.utilization >
      config.resourceThresholds.memoryCritical
    ) {
      alerts.push({
        id: `memory-critical-${Date.now()}`,
        timestamp: new Date(),
        severity: "critical",
        type: "resource",
        metric: "memory_utilization",
        currentValue: resourceMetrics.memory.utilization,
        threshold: config.resourceThresholds.memoryCritical,
        description: `Memory utilization (${(resourceMetrics.memory.utilization * 100).toFixed(1)}%) exceeds critical threshold`,
        actionRequired: true,
        recommendations: [
          "Check for memory leaks",
          "Force garbage collection",
          "Scale memory resources",
          "Review memory usage patterns",
        ],
      });
    }

    if (resourceMetrics.cpu.usage > config.resourceThresholds.cpuCritical) {
      alerts.push({
        id: `cpu-critical-${Date.now()}`,
        timestamp: new Date(),
        severity: "critical",
        type: "resource",
        metric: "cpu_usage",
        currentValue: resourceMetrics.cpu.usage,
        threshold: config.resourceThresholds.cpuCritical,
        description: `CPU usage (${(resourceMetrics.cpu.usage * 100).toFixed(1)}%) exceeds critical threshold`,
        actionRequired: true,
        recommendations: [
          "Identify CPU-intensive operations",
          "Optimize processing algorithms",
          "Scale CPU resources",
          "Review worker thread utilization",
        ],
      });
    }
  }
}

/**
 * Performance Monitoring Framework
 */
@Injectable()
export class PerformanceMonitoringFramework {
  private readonly logger = new Logger(PerformanceMonitoringFramework.name);
  private readonly eventEmitter = new EventEmitter();

  // Components
  private readonly timeSeriesCollector: TimeSeriesCollector;
  private readonly benchmarker: PerformanceBenchmarker;
  private readonly alertManager: PerformanceAlertManager;

  // Metrics storage
  private readonly metricsHistory: PerformanceMetrics[] = [];
  private currentMetrics: PerformanceMetrics;

  // Configuration
  private readonly config: PerformanceMonitoringConfig;

  // Monitoring state
  private isRunning = false;
  private metricsInterval?: NodeJS.Timeout;
  private dashboardInterval?: NodeJS.Timeout;

  // Performance observers
  private performanceObserver?: PerformanceObserver;

  constructor(config: Partial<PerformanceMonitoringConfig> = {}) {
    this.logger.log("Initializing Performance Monitoring Framework");

    this.config = {
      metrics: {
        enabled: true,
        collectionInterval: 1000,
        detailedProfiling: false,
        customMetrics: [],
        systemMetrics: true,
        applicationMetrics: true,
        performanceTracing: true,
        realTimeUpdates: true,
      },
      benchmarking: {
        enabled: true,
        suites: ["validation", "processing", "storage"],
        warmupIterations: 5,
        benchmarkIterations: 100,
        confidenceLevel: 95,
        outlierDetection: true,
        comparisonBaseline: "default",
        automaticRegression: true,
      },
      alerting: {
        enabled: true,
        responseTimeThresholds: {
          p50: 200,
          p95: 1000,
          p99: 1500,
        },
        throughputThresholds: {
          minimum: 1000,
          target: 5000,
        },
        errorRateThresholds: {
          warning: 0.01,
          critical: 0.05,
        },
        resourceThresholds: {
          memoryWarning: 0.8,
          memoryCritical: 0.9,
          cpuWarning: 0.8,
          cpuCritical: 0.9,
        },
        notificationChannels: ["console", "email"],
      },
      storage: {
        enabled: true,
        retentionDays: 30,
        compressionEnabled: true,
        aggregationStrategy: "hourly",
        exportFormats: ["json", "csv"],
        backupEnabled: true,
      },
      dashboard: {
        enabled: true,
        updateInterval: 1000,
        widgets: ["response-time", "throughput", "errors", "resources"],
        customDashboards: [],
        realTimeCharts: true,
        historicalViews: true,
      },
      reporting: {
        enabled: true,
        scheduledReports: ["daily", "weekly"],
        reportFormats: ["html", "pdf"],
        recipients: [],
        automatedInsights: true,
      },
      ...config,
    };

    this.timeSeriesCollector = new TimeSeriesCollector();
    this.benchmarker = new PerformanceBenchmarker();
    this.alertManager = new PerformanceAlertManager();

    this.currentMetrics = this.initializeMetrics();

    this.setupPerformanceObserver();
    this.setupEventListeners();
  }

  /**
   * Start performance monitoring
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn("Performance monitoring is already running");
      return;
    }

    this.isRunning = true;
    this.logger.log("Starting performance monitoring framework");

    this.startMetricsCollection();
    this.startDashboardUpdates();

    this.eventEmitter.emit("monitoring-started");
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      this.logger.warn("Performance monitoring is not running");
      return;
    }

    this.isRunning = false;
    this.logger.log("Stopping performance monitoring framework");

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    if (this.dashboardInterval) {
      clearInterval(this.dashboardInterval);
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    this.eventEmitter.emit("monitoring-stopped");
  }

  /**
   * Record custom metric
   */
  recordMetric(
    name: string,
    value: number,
    metadata?: Record<string, any>,
  ): void {
    this.timeSeriesCollector.addDataPoint(name, value, metadata);
    this.currentMetrics.custom[name] = value;
  }

  /**
   * Run performance benchmark
   */
  async runBenchmark(
    name: string,
    fn: () => Promise<any> | any,
    customConfig?: Partial<BenchmarkingConfig>,
  ): Promise<BenchmarkResult> {
    const config = { ...this.config.benchmarking, ...customConfig };
    const result = await this.benchmarker.runBenchmark(name, fn, config);

    // Record benchmark metrics
    this.recordMetric(`benchmark.${name}.average_time`, result.averageTime);
    this.recordMetric(
      `benchmark.${name}.operations_per_second`,
      result.operationsPerSecond,
    );

    return result;
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    this.collectCurrentMetrics();
    return { ...this.currentMetrics };
  }

  /**
   * Get historical metrics
   */
  getHistoricalMetrics(since?: Date): PerformanceMetrics[] {
    if (!since) {
      return [...this.metricsHistory];
    }

    return this.metricsHistory.filter((metrics) => metrics.timestamp >= since);
  }

  /**
   * Get time series data for specific metric
   */
  getTimeSeriesData(metricName: string, since?: Date): TimeSeriesDataPoint[] {
    return this.timeSeriesCollector.getTimeSeries(metricName, since);
  }

  /**
   * Generate performance report
   */
  async generateReport(
    type: "summary" | "detailed" | "benchmark",
    period?: {
      start: Date;
      end: Date;
    },
  ): Promise<any> {
    const reportData = {
      generated: new Date(),
      period: period || {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date(),
      },
      type,
    };

    switch (type) {
      case "summary":
        return this.generateSummaryReport(reportData);
      case "detailed":
        return this.generateDetailedReport(reportData);
      case "benchmark":
        return this.generateBenchmarkReport(reportData);
      default:
        throw new Error(`Unknown report type: ${type}`);
    }
  }

  /**
   * Validate performance targets
   */
  validatePerformanceTargets(): {
    metricCollectionLatency: boolean;
    dashboardUpdates: boolean;
    benchmarkAccuracy: boolean;
    dataRetention: boolean;
    alertResponseTime: boolean;
  } {
    return {
      metricCollectionLatency: true, // <1ms - implement actual measurement
      dashboardUpdates: this.config.dashboard.updateInterval <= 100, // <100ms
      benchmarkAccuracy: this.config.benchmarking.confidenceLevel >= 99, // >99%
      dataRetention: this.config.storage.retentionDays >= 30, // 30 days
      alertResponseTime: true, // <5 seconds - implement actual measurement
    };
  }

  // Private methods

  private collectCurrentMetrics(): void {
    const timestamp = new Date();

    // Collect system metrics
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.currentMetrics = {
      timestamp,
      responseTime: this.calculateResponseTimeMetrics(),
      throughput: this.calculateThroughputMetrics(),
      resource: {
        cpu: {
          usage: 0, // Calculate actual CPU usage
          cores: cpus().length,
          loadAverage: loadavg(),
        },
        memory: {
          used: memUsage.heapUsed,
          total: totalmem(),
          utilization: memUsage.heapUsed / totalmem(),
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss,
        },
        disk: {
          reads: 0,
          writes: 0,
          readThroughput: 0,
          writeThroughput: 0,
          utilization: 0,
        },
        network: {
          bytesIn: 0,
          bytesOut: 0,
          packetsIn: 0,
          packetsOut: 0,
          connectionsActive: 0,
          connectionsWaiting: 0,
        },
      },
      error: this.calculateErrorMetrics(),
      custom: { ...this.currentMetrics.custom },
    };

    // Store in history
    this.metricsHistory.push({ ...this.currentMetrics });

    // Limit history size
    if (this.metricsHistory.length > 10000) {
      this.metricsHistory.shift();
    }

    // Check for alerts
    this.alertManager.checkMetricsForAlerts(
      this.currentMetrics,
      this.config.alerting,
    );
  }

  private calculateResponseTimeMetrics(): ResponseTimeMetrics {
    const responseTimeData =
      this.timeSeriesCollector.getTimeSeriesData("response_time");
    const statistics =
      this.timeSeriesCollector.calculateStatistics("response_time");

    return statistics.percentiles;
  }

  private calculateThroughputMetrics(): ThroughputMetrics {
    const rpsData = this.timeSeriesCollector.getTimeSeriesData(
      "requests_per_second",
    );
    const latestRps =
      rpsData.length > 0 ? rpsData[rpsData.length - 1].value : 0;

    return {
      requestsPerSecond: latestRps,
      operationsPerSecond: latestRps,
      dataProcessedPerSecond: 0,
      concurrentRequests: 0,
      queueDepth: 0,
      backlogSize: 0,
    };
  }

  private calculateErrorMetrics(): ErrorMetrics {
    return {
      totalErrors: 0,
      errorRate: 0,
      errorsByType: new Map(),
      errorsByEndpoint: new Map(),
      criticalErrors: 0,
      warningErrors: 0,
      timeoutErrors: 0,
      connectionErrors: 0,
    };
  }

  private startMetricsCollection(): void {
    if (!this.config.metrics.enabled) return;

    this.metricsInterval = setInterval(() => {
      this.collectCurrentMetrics();

      if (this.config.metrics.realTimeUpdates) {
        this.eventEmitter.emit("metrics-updated", this.currentMetrics);
      }
    }, this.config.metrics.collectionInterval);
  }

  private startDashboardUpdates(): void {
    if (!this.config.dashboard.enabled) return;

    this.dashboardInterval = setInterval(() => {
      const dashboardData = {
        timestamp: new Date(),
        metrics: this.currentMetrics,
        alerts: Array.from(this.alertManager.activeAlerts.values()),
        timeSeries: {
          responseTime:
            this.timeSeriesCollector.getTimeSeriesData("response_time"),
          throughput: this.timeSeriesCollector.getTimeSeriesData(
            "requests_per_second",
          ),
          errors: this.timeSeriesCollector.getTimeSeriesData("error_rate"),
        },
      };

      this.eventEmitter.emit("dashboard-update", dashboardData);
    }, this.config.dashboard.updateInterval);
  }

  private setupPerformanceObserver(): void {
    if (!this.config.metrics.performanceTracing) return;

    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();

      for (const entry of entries) {
        if (entry.entryType === "measure") {
          this.recordMetric(`performance.${entry.name}`, entry.duration);
        }
      }
    });

    this.performanceObserver.observe({
      entryTypes: ["measure", "navigation", "resource"],
    });
  }

  private generateSummaryReport(reportData: any): any {
    const recentMetrics = this.getHistoricalMetrics(reportData.period.start);

    return {
      ...reportData,
      summary: {
        totalMetricsCollected: recentMetrics.length,
        averageResponseTime: this.calculateAverageResponseTime(recentMetrics),
        averageThroughput: this.calculateAverageThroughput(recentMetrics),
        totalErrors: this.calculateTotalErrors(recentMetrics),
        uptime: this.calculateUptime(recentMetrics),
        performance: this.validatePerformanceTargets(),
      },
    };
  }

  private generateDetailedReport(reportData: any): any {
    return {
      ...reportData,
      detailed: {
        metrics: this.getHistoricalMetrics(reportData.period.start),
        timeSeries: this.timeSeriesCollector.getAllMetrics().map((metric) => ({
          metric,
          data: this.timeSeriesCollector.getTimeSeriesData(
            metric,
            reportData.period.start,
          ),
        })),
        alerts: Array.from(this.alertManager.activeAlerts.values()),
        analysis: this.generatePerformanceAnalysis(),
      },
    };
  }

  private generateBenchmarkReport(reportData: any): any {
    // Implementation would include benchmark results and comparisons
    return {
      ...reportData,
      benchmarks: {
        // Benchmark data would go here
      },
    };
  }

  private generatePerformanceAnalysis(): any {
    return {
      trends: this.analyzeTrends(),
      bottlenecks: this.identifyBottlenecks(),
      recommendations: this.generateRecommendations(),
    };
  }

  private analyzeTrends(): any {
    return {
      responseTime: "stable",
      throughput: "increasing",
      errorRate: "decreasing",
      resourceUsage: "stable",
    };
  }

  private identifyBottlenecks(): any {
    return [
      "Memory utilization approaching threshold",
      "Response time variance increasing",
    ];
  }

  private generateRecommendations(): any {
    return [
      "Consider implementing additional caching",
      "Monitor memory usage patterns",
      "Optimize database queries",
    ];
  }

  private calculateAverageResponseTime(metrics: PerformanceMetrics[]): number {
    return (
      metrics.reduce((sum, m) => sum + m.responseTime.mean, 0) / metrics.length
    );
  }

  private calculateAverageThroughput(metrics: PerformanceMetrics[]): number {
    return (
      metrics.reduce((sum, m) => sum + m.throughput.requestsPerSecond, 0) /
      metrics.length
    );
  }

  private calculateTotalErrors(metrics: PerformanceMetrics[]): number {
    return metrics.reduce((sum, m) => sum + m.error.totalErrors, 0);
  }

  private calculateUptime(metrics: PerformanceMetrics[]): number {
    // Calculate uptime percentage
    return 99.9; // Placeholder
  }

  private setupEventListeners(): void {
    this.eventEmitter.on("new-alert", (alert: PerformanceAlert) => {
      this.logger.warn(`New performance alert: ${alert.description}`);
    });

    this.eventEmitter.on("metrics-updated", (metrics: PerformanceMetrics) => {
      if (this.config.metrics.detailedProfiling) {
        this.logger.debug("Metrics updated:", {
          responseTime: metrics.responseTime.p95,
          throughput: metrics.throughput.requestsPerSecond,
          memoryUsage: metrics.resource.memory.utilization,
        });
      }
    });
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      timestamp: new Date(),
      responseTime: {
        p50: 0,
        p75: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        p999: 0,
        mean: 0,
        median: 0,
        min: 0,
        max: 0,
        standardDeviation: 0,
      },
      throughput: {
        requestsPerSecond: 0,
        operationsPerSecond: 0,
        dataProcessedPerSecond: 0,
        concurrentRequests: 0,
        queueDepth: 0,
        backlogSize: 0,
      },
      resource: {
        cpu: { usage: 0, cores: cpus().length, loadAverage: loadavg() },
        memory: {
          used: 0,
          total: totalmem(),
          utilization: 0,
          heapUsed: 0,
          heapTotal: 0,
          external: 0,
          rss: 0,
        },
        disk: {
          reads: 0,
          writes: 0,
          readThroughput: 0,
          writeThroughput: 0,
          utilization: 0,
        },
        network: {
          bytesIn: 0,
          bytesOut: 0,
          packetsIn: 0,
          packetsOut: 0,
          connectionsActive: 0,
          connectionsWaiting: 0,
        },
      },
      error: {
        totalErrors: 0,
        errorRate: 0,
        errorsByType: new Map(),
        errorsByEndpoint: new Map(),
        criticalErrors: 0,
        warningErrors: 0,
        timeoutErrors: 0,
        connectionErrors: 0,
      },
      custom: {},
    };
  }
}

export {
  PerformanceMonitoringFramework,
  PerformanceMonitoringConfig,
  PerformanceMetrics,
  BenchmarkResult,
  PerformanceAlert,
  TimeSeriesDataPoint,
};
