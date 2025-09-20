/**
 * PARLANT Phase 1 Performance Monitoring System
 *
 * Comprehensive performance monitoring, optimization, and alerting system for
 * database function wrapping with sub-1000ms P95 response times and enterprise-grade
 * performance analytics.
 *
 * Features:
 * - Real-time performance metrics collection
 * - Response time optimization and bottleneck identification
 * - Caching performance analysis and optimization
 * - Performance alerting and threshold management
 * - Performance analytics and trending analysis
 * - Performance regression detection and prevention
 *
 * Performance Targets:
 * - P95 response times under 1000ms for all wrapped functions
 * - Cache hit rates above 85% for validation decisions
 * - Function execution overhead under 10ms per wrap
 * - PARLANT communication latency under 200ms
 * - Memory usage optimization and leak detection
 * - Throughput optimization for concurrent operations
 *
 * @fileoverview PARLANT performance monitoring core module
 * @version 1.0.0
 * @author Performance Monitoring Agent
 */

import { EventEmitter } from "events";
import { performance } from "perf_hooks";

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitorConfig {
  /** Metrics collection interval in milliseconds */
  collectInterval: number;
  /** Data retention period in milliseconds */
  retentionPeriod: number;
  /** Performance alert thresholds */
  alertThresholds: PerformanceThresholds;
  /** Enable detailed performance metrics */
  enableDetailedMetrics: boolean;
  /** Enable cache performance monitoring */
  enableCacheMonitoring: boolean;
  /** Enable regression detection */
  enableRegressionDetection: boolean;
  /** Enable auto-optimization */
  enableAutoOptimization: boolean;
  /** Metrics buffer size */
  bufferSize: number;
  /** Performance baseline configuration */
  baseline: PerformanceBaseline;
}

/**
 * Performance thresholds for alerting and optimization
 */
export interface PerformanceThresholds {
  /** P95 response time threshold in milliseconds */
  p95ResponseTime: number;
  /** P99 response time threshold in milliseconds */
  p99ResponseTime: number;
  /** Function execution overhead threshold in milliseconds */
  functionOverhead: number;
  /** PARLANT communication latency threshold in milliseconds */
  parlantLatency: number;
  /** Cache hit rate threshold (0-1) */
  cacheHitRate: number;
  /** Memory usage threshold in MB */
  memoryUsage: number;
  /** Throughput threshold in operations per second */
  throughput: number;
  /** Error rate threshold (0-1) */
  errorRate: number;
  /** CPU usage threshold (0-1) */
  cpuUsage: number;
  /** Concurrent operations threshold */
  concurrentOps: number;
}

/**
 * Performance baseline for regression detection
 */
export interface PerformanceBaseline {
  /** Baseline P95 response time */
  p95ResponseTime: number;
  /** Baseline cache hit rate */
  cacheHitRate: number;
  /** Baseline throughput */
  throughput: number;
  /** Baseline error rate */
  errorRate: number;
  /** Baseline established timestamp */
  timestamp: Date;
  /** Baseline sample size */
  sampleSize: number;
}

/**
 * Performance metric data point
 */
export interface PerformanceMetric {
  /** Unique metric identifier */
  id: string;
  /** Metric timestamp */
  timestamp: Date;
  /** Metric category */
  category:
    | "FUNCTION_EXECUTION"
    | "CACHE_PERFORMANCE"
    | "PARLANT_COMMUNICATION"
    | "SYSTEM_RESOURCE"
    | "THROUGHPUT"
    | "ERROR_TRACKING";
  /** Metric name */
  metricName: string;
  /** Metric value */
  value: number;
  /** Metric unit */
  unit: string;
  /** Metric tags for filtering and grouping */
  tags: Record<string, string>;
  /** Additional metric context */
  context: Record<string, unknown>;
  /** Performance tier (P50, P95, P99, etc.) */
  tier?: string;
}

/**
 * Function execution performance data
 */
export interface FunctionPerformanceData {
  /** Function name */
  functionName: string;
  /** Execution start time */
  startTime: number;
  /** Execution end time */
  endTime: number;
  /** Total execution time in milliseconds */
  executionTime: number;
  /** PARLANT validation time in milliseconds */
  parlantTime: number;
  /** Function overhead time in milliseconds */
  overheadTime: number;
  /** Whether result was cached */
  cached: boolean;
  /** Cache hit/miss */
  cacheHit: boolean;
  /** Execution success status */
  success: boolean;
  /** Error information if failed */
  error?: string;
  /** Function parameters hash for caching analysis */
  parametersHash: string;
  /** User context identifier */
  userId?: string;
  /** Session identifier */
  sessionId?: string;
  /** Memory usage delta in MB */
  memoryDelta: number;
  /** CPU usage during execution */
  cpuUsage: number;
}

/**
 * Cache performance metrics
 */
export interface CachePerformanceData {
  /** Cache level (L1, L2, L3) */
  level: "L1" | "L2" | "L3";
  /** Cache operation type */
  operation: "GET" | "SET" | "DELETE" | "INVALIDATE";
  /** Cache key */
  key: string;
  /** Operation duration in milliseconds */
  duration: number;
  /** Whether operation was successful */
  success: boolean;
  /** Cache hit status for GET operations */
  hit?: boolean;
  /** Data size in bytes */
  dataSize: number;
  /** TTL value for SET operations */
  ttl?: number;
  /** Timestamp */
  timestamp: Date;
  /** Function name associated with cache operation */
  functionName?: string;
}

/**
 * PARLANT communication performance data
 */
export interface ParlantPerformanceData {
  /** Operation type */
  operation: "VALIDATE" | "AUDIT" | "STREAM" | "BATCH";
  /** Communication latency in milliseconds */
  latency: number;
  /** Message size in bytes */
  messageSize: number;
  /** Response size in bytes */
  responseSize: number;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Session identifier */
  sessionId?: string;
  /** Timestamp */
  timestamp: Date;
  /** Additional context */
  context: Record<string, unknown>;
}

/**
 * System resource metrics
 */
export interface SystemResourceData {
  /** CPU usage percentage (0-100) */
  cpuUsage: number;
  /** Memory usage in MB */
  memoryUsage: number;
  /** Available memory in MB */
  availableMemory: number;
  /** Active connections count */
  activeConnections: number;
  /** Event loop lag in milliseconds */
  eventLoopLag: number;
  /** Garbage collection metrics */
  gcMetrics: {
    /** Total GC time in milliseconds */
    totalTime: number;
    /** GC frequency per minute */
    frequency: number;
    /** Heap size before GC in MB */
    heapBefore: number;
    /** Heap size after GC in MB */
    heapAfter: number;
  };
  /** Timestamp */
  timestamp: Date;
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  /** Alert identifier */
  id: string;
  /** Alert type */
  type:
    | "THRESHOLD_EXCEEDED"
    | "REGRESSION_DETECTED"
    | "BOTTLENECK_IDENTIFIED"
    | "CACHE_PERFORMANCE"
    | "SYSTEM_OVERLOAD";
  /** Alert severity */
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  /** Alert message */
  message: string;
  /** Metric that triggered the alert */
  metricName: string;
  /** Current metric value */
  currentValue: number;
  /** Threshold value */
  thresholdValue: number;
  /** Alert timestamp */
  timestamp: Date;
  /** Alert resolution status */
  resolved: boolean;
  /** Resolution timestamp */
  resolvedAt?: Date;
  /** Alert context */
  context: Record<string, unknown>;
  /** Recommended actions */
  recommendations: string[];
}

/**
 * Performance optimization suggestion
 */
export interface PerformanceOptimization {
  /** Optimization identifier */
  id: string;
  /** Optimization type */
  type:
    | "CACHE_TTL_ADJUSTMENT"
    | "BATCH_SIZE_OPTIMIZATION"
    | "MEMORY_OPTIMIZATION"
    | "CONCURRENCY_TUNING"
    | "QUERY_OPTIMIZATION";
  /** Priority level */
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  /** Optimization description */
  description: string;
  /** Expected performance improvement */
  expectedImprovement: string;
  /** Implementation complexity */
  complexity: "LOW" | "MEDIUM" | "HIGH";
  /** Affected components */
  affectedComponents: string[];
  /** Implementation steps */
  implementationSteps: string[];
  /** Metrics to monitor post-implementation */
  monitoringMetrics: string[];
  /** Timestamp */
  timestamp: Date;
}

/**
 * Performance statistics calculation
 */
export interface PerformanceStats {
  /** Statistical period start */
  periodStart: Date;
  /** Statistical period end */
  periodEnd: Date;
  /** Sample count */
  sampleCount: number;
  /** Mean value */
  mean: number;
  /** Median value (P50) */
  median: number;
  /** P95 percentile */
  p95: number;
  /** P99 percentile */
  p99: number;
  /** P99.9 percentile */
  p999: number;
  /** Standard deviation */
  standardDeviation: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Throughput (operations per second) */
  throughput: number;
  /** Error rate (0-1) */
  errorRate: number;
}

/**
 * Core Performance Monitor implementation
 */
export class PerformanceMonitor extends EventEmitter {
  private config: PerformanceMonitorConfig;
  private metrics: PerformanceMetric[] = [];
  private functionMetrics: FunctionPerformanceData[] = [];
  private cacheMetrics: CachePerformanceData[] = [];
  private parlantMetrics: ParlantPerformanceData[] = [];
  private systemMetrics: SystemResourceData[] = [];
  private alerts: PerformanceAlert[] = [];
  private optimizations: PerformanceOptimization[] = [];

  private monitoringInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private gcMonitoringInterval?: NodeJS.Timeout;

  private isMonitoring = false;
  private readonly logger: Console;

  constructor(config: Partial<PerformanceMonitorConfig> = {}) {
    super();
    this.logger = console;
    this.config = this.mergeConfig(config);
    this.initializeBaseline();
  }

  /**
   * Start performance monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      this.logger.warn("Performance monitoring is already running");
      return;
    }

    this.logger.log("Starting PARLANT Phase 1 Performance Monitoring System");

    // Start metrics collection
    this.monitoringInterval = setInterval(
      () => this.collectMetrics(),
      this.config.collectInterval,
    );

    // Start cleanup scheduler
    this.cleanupInterval = setInterval(
      () => this.cleanupOldMetrics(),
      60 * 60 * 1000, // Every hour
    );

    // Start GC monitoring
    this.gcMonitoringInterval = setInterval(
      () => this.collectGCMetrics(),
      30 * 1000, // Every 30 seconds
    );

    this.isMonitoring = true;
    this.emit("monitoring.started");
    this.logger.log("Performance monitoring started successfully");
  }

  /**
   * Stop performance monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      this.logger.warn("Performance monitoring is not running");
      return;
    }

    this.logger.log("Stopping PARLANT Phase 1 Performance Monitoring System");

    // Clear intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    if (this.gcMonitoringInterval) {
      clearInterval(this.gcMonitoringInterval);
      this.gcMonitoringInterval = undefined;
    }

    this.isMonitoring = false;
    this.emit("monitoring.stopped");
    this.logger.log("Performance monitoring stopped successfully");
  }

  /**
   * Record function execution performance
   */
  recordFunctionExecution(data: FunctionPerformanceData): void {
    const startTime = performance.now();

    // Store function metrics
    this.functionMetrics.push(data);

    // Create performance metrics
    const metrics: PerformanceMetric[] = [
      {
        id: `func-exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        category: "FUNCTION_EXECUTION",
        metricName: "execution_time",
        value: data.executionTime,
        unit: "ms",
        tags: {
          functionName: data.functionName,
          cached: data.cached.toString(),
          success: data.success.toString(),
        },
        context: {
          parlantTime: data.parlantTime,
          overheadTime: data.overheadTime,
          parametersHash: data.parametersHash,
          memoryDelta: data.memoryDelta,
        },
      },
      {
        id: `func-overhead-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        category: "FUNCTION_EXECUTION",
        metricName: "overhead_time",
        value: data.overheadTime,
        unit: "ms",
        tags: {
          functionName: data.functionName,
        },
        context: {
          executionTime: data.executionTime,
          overheadPercentage: (data.overheadTime / data.executionTime) * 100,
        },
      },
    ];

    // Add metrics to collection
    this.metrics.push(...metrics);

    // Check thresholds
    this.checkFunctionThresholds(data);

    // Emit event
    this.emit("function.executed", data);

    const recordingTime = performance.now() - startTime;
    if (recordingTime > 5) {
      // Alert if recording takes more than 5ms
      this.logger.warn(
        `Performance recording took ${recordingTime.toFixed(2)}ms`,
      );
    }
  }

  /**
   * Record cache performance
   */
  recordCacheOperation(data: CachePerformanceData): void {
    this.cacheMetrics.push(data);

    const metric: PerformanceMetric = {
      id: `cache-${data.operation.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: data.timestamp,
      category: "CACHE_PERFORMANCE",
      metricName: `cache_${data.operation.toLowerCase()}_time`,
      value: data.duration,
      unit: "ms",
      tags: {
        level: data.level,
        operation: data.operation,
        success: data.success.toString(),
        hit: data.hit?.toString() || "n/a",
      },
      context: {
        key: data.key,
        dataSize: data.dataSize,
        ttl: data.ttl,
        functionName: data.functionName,
      },
    };

    this.metrics.push(metric);

    // Check cache performance thresholds
    this.checkCacheThresholds(data);

    this.emit("cache.operation", data);
  }

  /**
   * Record PARLANT communication performance
   */
  recordParlantCommunication(data: ParlantPerformanceData): void {
    this.parlantMetrics.push(data);

    const metric: PerformanceMetric = {
      id: `parlant-${data.operation.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: data.timestamp,
      category: "PARLANT_COMMUNICATION",
      metricName: "parlant_latency",
      value: data.latency,
      unit: "ms",
      tags: {
        operation: data.operation,
        success: data.success.toString(),
      },
      context: {
        messageSize: data.messageSize,
        responseSize: data.responseSize,
        sessionId: data.sessionId,
        ...data.context,
      },
    };

    this.metrics.push(metric);

    // Check PARLANT thresholds
    this.checkParlantThresholds(data);

    this.emit("parlant.communication", data);
  }

  /**
   * Get current performance statistics
   */
  getCurrentStats(timeWindow: number = 5 * 60 * 1000): PerformanceStats | null {
    const cutoffTime = new Date(Date.now() - timeWindow);
    const recentMetrics = this.functionMetrics.filter(
      (m) => new Date(m.startTime) >= cutoffTime,
    );

    if (recentMetrics.length === 0) {
      return null;
    }

    const executionTimes = recentMetrics
      .map((m) => m.executionTime)
      .sort((a, b) => a - b);
    const errorCount = recentMetrics.filter((m) => !m.success).length;

    return {
      periodStart: cutoffTime,
      periodEnd: new Date(),
      sampleCount: executionTimes.length,
      mean: this.calculateMean(executionTimes),
      median: this.calculatePercentile(executionTimes, 50),
      p95: this.calculatePercentile(executionTimes, 95),
      p99: this.calculatePercentile(executionTimes, 99),
      p999: this.calculatePercentile(executionTimes, 99.9),
      standardDeviation: this.calculateStandardDeviation(executionTimes),
      min: Math.min(...executionTimes),
      max: Math.max(...executionTimes),
      throughput: executionTimes.length / (timeWindow / 1000),
      errorRate: errorCount / executionTimes.length,
    };
  }

  /**
   * Get cache performance statistics
   */
  getCacheStats(
    timeWindow: number = 5 * 60 * 1000,
  ): Record<
    string,
    { hitRate: number; avgDuration: number; operations: number }
  > {
    const cutoffTime = new Date(Date.now() - timeWindow);
    const recentCacheMetrics = this.cacheMetrics.filter(
      (m) => m.timestamp >= cutoffTime,
    );

    const stats: Record<
      string,
      { hitRate: number; avgDuration: number; operations: number }
    > = {};

    ["L1", "L2", "L3"].forEach((level) => {
      const levelMetrics = recentCacheMetrics.filter((m) => m.level === level);
      const getOperations = levelMetrics.filter((m) => m.operation === "GET");
      const hits = getOperations.filter((m) => m.hit === true).length;
      const avgDuration =
        levelMetrics.length > 0
          ? levelMetrics.reduce((sum, m) => sum + m.duration, 0) /
            levelMetrics.length
          : 0;

      stats[level] = {
        hitRate: getOperations.length > 0 ? hits / getOperations.length : 0,
        avgDuration,
        operations: levelMetrics.length,
      };
    });

    return stats;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter((alert) => !alert.resolved);
  }

  /**
   * Get performance optimizations
   */
  getOptimizations(): PerformanceOptimization[] {
    return this.optimizations.slice().sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate performance report
   */
  generateReport(timeWindow: number = 60 * 60 * 1000): {
    summary: PerformanceStats | null;
    cacheStats: Record<
      string,
      { hitRate: number; avgDuration: number; operations: number }
    >;
    alerts: PerformanceAlert[];
    optimizations: PerformanceOptimization[];
    recommendations: string[];
  } {
    const summary = this.getCurrentStats(timeWindow);
    const cacheStats = this.getCacheStats(timeWindow);
    const alerts = this.getActiveAlerts();
    const optimizations = this.getOptimizations();
    const recommendations = this.generateRecommendations(summary, cacheStats);

    return {
      summary,
      cacheStats,
      alerts,
      optimizations,
      recommendations,
    };
  }

  // ===== PRIVATE IMPLEMENTATION METHODS =====

  private mergeConfig(
    userConfig: Partial<PerformanceMonitorConfig>,
  ): PerformanceMonitorConfig {
    const defaultConfig: PerformanceMonitorConfig = {
      collectInterval: 5000, // 5 seconds
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: {
        p95ResponseTime: 1000, // 1 second
        p99ResponseTime: 2000, // 2 seconds
        functionOverhead: 10, // 10ms
        parlantLatency: 200, // 200ms
        cacheHitRate: 0.85, // 85%
        memoryUsage: 1024, // 1GB
        throughput: 1000, // 1000 ops/sec
        errorRate: 0.01, // 1%
        cpuUsage: 0.8, // 80%
        concurrentOps: 100, // 100 concurrent operations
      },
      enableDetailedMetrics: true,
      enableCacheMonitoring: true,
      enableRegressionDetection: true,
      enableAutoOptimization: true,
      bufferSize: 10000,
      baseline: {
        p95ResponseTime: 500,
        cacheHitRate: 0.9,
        throughput: 1500,
        errorRate: 0.005,
        timestamp: new Date(),
        sampleSize: 1000,
      },
    };

    return { ...defaultConfig, ...userConfig };
  }

  private initializeBaseline(): void {
    // Initialize baseline values from config
    this.logger.log("Performance baseline initialized", this.config.baseline);
  }

  private async collectMetrics(): Promise<void> {
    try {
      // Collect system metrics
      await this.collectSystemMetrics();

      // Analyze performance patterns
      if (this.config.enableRegressionDetection) {
        await this.detectRegressions();
      }

      // Generate optimizations
      if (this.config.enableAutoOptimization) {
        await this.generateOptimizations();
      }

      this.emit("metrics.collected");
    } catch (error) {
      this.logger.error("Error collecting performance metrics:", error);
    }
  }

  private async collectSystemMetrics(): Promise<void> {
    const memUsage = process.memoryUsage();

    const systemData: SystemResourceData = {
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to milliseconds
      memoryUsage: memUsage.heapUsed / 1024 / 1024, // Convert to MB
      availableMemory: (memUsage.heapTotal - memUsage.heapUsed) / 1024 / 1024,
      activeConnections: 0, // Would need to track actual connections
      eventLoopLag: 0, // Would need to measure actual event loop lag
      gcMetrics: {
        totalTime: 0,
        frequency: 0,
        heapBefore: memUsage.heapUsed / 1024 / 1024,
        heapAfter: memUsage.heapUsed / 1024 / 1024,
      },
      timestamp: new Date(),
    };

    this.systemMetrics.push(systemData);

    // Create system performance metrics
    const systemMetrics: PerformanceMetric[] = [
      {
        id: `sys-memory-${Date.now()}`,
        timestamp: systemData.timestamp,
        category: "SYSTEM_RESOURCE",
        metricName: "memory_usage",
        value: systemData.memoryUsage,
        unit: "MB",
        tags: { type: "heap" },
        context: { available: systemData.availableMemory },
      },
      {
        id: `sys-cpu-${Date.now()}`,
        timestamp: systemData.timestamp,
        category: "SYSTEM_RESOURCE",
        metricName: "cpu_usage",
        value: systemData.cpuUsage,
        unit: "ms",
        tags: { type: "user" },
        context: {},
      },
    ];

    this.metrics.push(...systemMetrics);

    // Check system thresholds
    this.checkSystemThresholds(systemData);
  }

  private async collectGCMetrics(): Promise<void> {
    // GC metrics collection would be implemented here
    // This is a placeholder for actual GC monitoring
  }

  private checkFunctionThresholds(data: FunctionPerformanceData): void {
    // Check execution time threshold
    if (data.executionTime > this.config.alertThresholds.p95ResponseTime) {
      this.createAlert(
        "THRESHOLD_EXCEEDED",
        "HIGH",
        `Function execution time exceeded P95 threshold: ${data.executionTime}ms`,
        "execution_time",
        data.executionTime,
        this.config.alertThresholds.p95ResponseTime,
        { functionName: data.functionName },
      );
    }

    // Check overhead threshold
    if (data.overheadTime > this.config.alertThresholds.functionOverhead) {
      this.createAlert(
        "THRESHOLD_EXCEEDED",
        "MEDIUM",
        `Function overhead exceeded threshold: ${data.overheadTime}ms`,
        "overhead_time",
        data.overheadTime,
        this.config.alertThresholds.functionOverhead,
        { functionName: data.functionName },
      );
    }

    // Check PARLANT latency threshold
    if (data.parlantTime > this.config.alertThresholds.parlantLatency) {
      this.createAlert(
        "THRESHOLD_EXCEEDED",
        "MEDIUM",
        `PARLANT communication latency exceeded threshold: ${data.parlantTime}ms`,
        "parlant_latency",
        data.parlantTime,
        this.config.alertThresholds.parlantLatency,
        { functionName: data.functionName },
      );
    }
  }

  private checkCacheThresholds(data: CachePerformanceData): void {
    // Calculate recent cache hit rate
    const recentCacheOps = this.cacheMetrics
      .filter((m) => m.level === data.level && m.operation === "GET")
      .slice(-100); // Last 100 operations

    if (recentCacheOps.length >= 10) {
      const hits = recentCacheOps.filter((m) => m.hit).length;
      const hitRate = hits / recentCacheOps.length;

      if (hitRate < this.config.alertThresholds.cacheHitRate) {
        this.createAlert(
          "CACHE_PERFORMANCE",
          "MEDIUM",
          `Cache hit rate below threshold: ${(hitRate * 100).toFixed(1)}%`,
          "cache_hit_rate",
          hitRate,
          this.config.alertThresholds.cacheHitRate,
          { level: data.level },
        );
      }
    }
  }

  private checkParlantThresholds(data: ParlantPerformanceData): void {
    if (data.latency > this.config.alertThresholds.parlantLatency) {
      this.createAlert(
        "THRESHOLD_EXCEEDED",
        "MEDIUM",
        `PARLANT communication latency exceeded threshold: ${data.latency}ms`,
        "parlant_latency",
        data.latency,
        this.config.alertThresholds.parlantLatency,
        { operation: data.operation },
      );
    }
  }

  private checkSystemThresholds(data: SystemResourceData): void {
    if (data.memoryUsage > this.config.alertThresholds.memoryUsage) {
      this.createAlert(
        "SYSTEM_OVERLOAD",
        "HIGH",
        `Memory usage exceeded threshold: ${data.memoryUsage.toFixed(1)}MB`,
        "memory_usage",
        data.memoryUsage,
        this.config.alertThresholds.memoryUsage,
        {},
      );
    }

    if (data.cpuUsage > this.config.alertThresholds.cpuUsage * 1000) {
      // Convert to ms for comparison
      this.createAlert(
        "SYSTEM_OVERLOAD",
        "HIGH",
        `CPU usage exceeded threshold: ${(data.cpuUsage / 1000).toFixed(1)}ms`,
        "cpu_usage",
        data.cpuUsage,
        this.config.alertThresholds.cpuUsage * 1000,
        {},
      );
    }
  }

  private createAlert(
    type: PerformanceAlert["type"],
    severity: PerformanceAlert["severity"],
    message: string,
    metricName: string,
    currentValue: number,
    thresholdValue: number,
    context: Record<string, unknown>,
  ): void {
    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      metricName,
      currentValue,
      thresholdValue,
      timestamp: new Date(),
      resolved: false,
      context,
      recommendations: this.generateAlertRecommendations(
        type,
        metricName,
        currentValue,
        thresholdValue,
      ),
    };

    this.alerts.push(alert);
    this.emit("alert.created", alert);

    this.logger.warn(`Performance Alert [${severity}]: ${message}`);
  }

  private generateAlertRecommendations(
    type: PerformanceAlert["type"],
    metricName: string,
    currentValue: number,
    thresholdValue: number,
  ): string[] {
    const recommendations: string[] = [];

    switch (type) {
      case "THRESHOLD_EXCEEDED":
        if (metricName === "execution_time") {
          recommendations.push(
            "Review function implementation for optimization opportunities",
            "Consider implementing response caching",
            "Analyze database queries for performance bottlenecks",
            "Check for memory leaks or excessive object creation",
          );
        } else if (metricName === "parlant_latency") {
          recommendations.push(
            "Review PARLANT server configuration and connectivity",
            "Consider implementing request batching",
            "Check network latency and bandwidth",
            "Optimize PARLANT request payload size",
          );
        }
        break;

      case "CACHE_PERFORMANCE":
        recommendations.push(
          "Review cache TTL settings for optimal hit rates",
          "Analyze cache key patterns for better distribution",
          "Consider increasing cache size if memory allows",
          "Review cache invalidation strategy",
        );
        break;

      case "SYSTEM_OVERLOAD":
        recommendations.push(
          "Monitor resource usage trends",
          "Consider scaling infrastructure",
          "Review memory management and garbage collection",
          "Analyze system bottlenecks and optimize accordingly",
        );
        break;
    }

    return recommendations;
  }

  private async detectRegressions(): Promise<void> {
    const currentStats = this.getCurrentStats();
    if (!currentStats || !this.config.baseline) return;

    const baseline = this.config.baseline;

    // Check for performance regressions
    if (currentStats.p95 > baseline.p95ResponseTime * 1.2) {
      // 20% regression threshold
      this.createAlert(
        "REGRESSION_DETECTED",
        "HIGH",
        `P95 response time regression detected: ${currentStats.p95.toFixed(0)}ms vs baseline ${baseline.p95ResponseTime.toFixed(0)}ms`,
        "p95_response_time",
        currentStats.p95,
        baseline.p95ResponseTime,
        {
          regressionPercentage: (
            (currentStats.p95 / baseline.p95ResponseTime - 1) *
            100
          ).toFixed(1),
        },
      );
    }

    // Check cache hit rate regression
    const cacheStats = this.getCacheStats();
    const avgHitRate =
      Object.values(cacheStats).reduce((sum, stats) => sum + stats.hitRate, 0) /
      Object.keys(cacheStats).length;

    if (avgHitRate < baseline.cacheHitRate * 0.9) {
      // 10% degradation threshold
      this.createAlert(
        "REGRESSION_DETECTED",
        "MEDIUM",
        `Cache hit rate regression detected: ${(avgHitRate * 100).toFixed(1)}% vs baseline ${(baseline.cacheHitRate * 100).toFixed(1)}%`,
        "cache_hit_rate",
        avgHitRate,
        baseline.cacheHitRate,
        {
          regressionPercentage: (
            (avgHitRate / baseline.cacheHitRate - 1) *
            100
          ).toFixed(1),
        },
      );
    }
  }

  private async generateOptimizations(): Promise<void> {
    const currentStats = this.getCurrentStats();
    const cacheStats = this.getCacheStats();

    if (!currentStats) return;

    // Generate optimizations based on current performance
    if (currentStats.p95 > this.config.alertThresholds.p95ResponseTime * 0.8) {
      this.addOptimization({
        id: `opt-response-time-${Date.now()}`,
        type: "CACHE_TTL_ADJUSTMENT",
        priority: "HIGH",
        description: "Optimize cache TTL settings to improve response times",
        expectedImprovement: "15-25% reduction in P95 response time",
        complexity: "LOW",
        affectedComponents: ["Cache Layer", "Function Wrappers"],
        implementationSteps: [
          "Analyze cache hit patterns by function type",
          "Increase TTL for frequently accessed, stable data",
          "Implement adaptive TTL based on data volatility",
          "Monitor cache performance after changes",
        ],
        monitoringMetrics: [
          "cache_hit_rate",
          "p95_response_time",
          "cache_memory_usage",
        ],
        timestamp: new Date(),
      });
    }

    // Cache-specific optimizations
    Object.entries(cacheStats).forEach(([level, stats]) => {
      if (
        stats.hitRate < this.config.alertThresholds.cacheHitRate &&
        stats.operations > 100
      ) {
        this.addOptimization({
          id: `opt-cache-${level.toLowerCase()}-${Date.now()}`,
          type: "CACHE_TTL_ADJUSTMENT",
          priority: "MEDIUM",
          description: `Optimize ${level} cache configuration to improve hit rate`,
          expectedImprovement: `10-20% improvement in ${level} cache hit rate`,
          complexity: "MEDIUM",
          affectedComponents: [`${level} Cache`],
          implementationSteps: [
            `Analyze ${level} cache access patterns`,
            "Adjust cache size and TTL settings",
            "Implement intelligent cache warming",
            "Monitor performance improvements",
          ],
          monitoringMetrics: [
            `${level.toLowerCase()}_cache_hit_rate`,
            "cache_operation_latency",
          ],
          timestamp: new Date(),
        });
      }
    });
  }

  private addOptimization(optimization: PerformanceOptimization): void {
    // Check if similar optimization already exists
    const exists = this.optimizations.some(
      (opt) =>
        opt.type === optimization.type &&
        JSON.stringify(opt.affectedComponents) ===
          JSON.stringify(optimization.affectedComponents),
    );

    if (!exists) {
      this.optimizations.push(optimization);
      this.emit("optimization.generated", optimization);
    }
  }

  private generateRecommendations(
    stats: PerformanceStats | null,
    cacheStats: Record<
      string,
      { hitRate: number; avgDuration: number; operations: number }
    >,
  ): string[] {
    const recommendations: string[] = [];

    if (!stats) {
      recommendations.push(
        "Insufficient data for performance analysis. Continue monitoring to gather baseline metrics.",
      );
      return recommendations;
    }

    // Response time recommendations
    if (stats.p95 > this.config.alertThresholds.p95ResponseTime) {
      recommendations.push(
        `P95 response time (${stats.p95.toFixed(0)}ms) exceeds target. Consider function optimization and caching improvements.`,
      );
    }

    if (stats.p99 > this.config.alertThresholds.p99ResponseTime) {
      recommendations.push(
        `P99 response time (${stats.p99.toFixed(0)}ms) indicates performance outliers. Investigate edge cases and error handling.`,
      );
    }

    // Error rate recommendations
    if (stats.errorRate > this.config.alertThresholds.errorRate) {
      recommendations.push(
        `Error rate (${(stats.errorRate * 100).toFixed(2)}%) is above threshold. Focus on improving system reliability and error handling.`,
      );
    }

    // Throughput recommendations
    if (stats.throughput < this.config.alertThresholds.throughput * 0.8) {
      recommendations.push(
        `Throughput (${stats.throughput.toFixed(0)} ops/sec) is below optimal levels. Consider performance optimization and scaling.`,
      );
    }

    // Cache recommendations
    Object.entries(cacheStats).forEach(([level, levelStats]) => {
      if (levelStats.hitRate < this.config.alertThresholds.cacheHitRate) {
        recommendations.push(
          `${level} cache hit rate (${(levelStats.hitRate * 100).toFixed(1)}%) is below target. Review caching strategy and TTL settings.`,
        );
      }
    });

    // General performance recommendations
    if (stats.standardDeviation > stats.mean * 0.5) {
      recommendations.push(
        "High performance variability detected. Investigate inconsistent execution patterns and system load fluctuations.",
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Performance metrics are within acceptable ranges. Continue monitoring for optimization opportunities.",
      );
    }

    return recommendations;
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);

    const initialCount = {
      metrics: this.metrics.length,
      functionMetrics: this.functionMetrics.length,
      cacheMetrics: this.cacheMetrics.length,
      parlantMetrics: this.parlantMetrics.length,
      systemMetrics: this.systemMetrics.length,
    };

    // Clean up old metrics
    this.metrics = this.metrics.filter((m) => m.timestamp >= cutoffTime);
    this.functionMetrics = this.functionMetrics.filter(
      (m) => new Date(m.startTime) >= cutoffTime,
    );
    this.cacheMetrics = this.cacheMetrics.filter(
      (m) => m.timestamp >= cutoffTime,
    );
    this.parlantMetrics = this.parlantMetrics.filter(
      (m) => m.timestamp >= cutoffTime,
    );
    this.systemMetrics = this.systemMetrics.filter(
      (m) => m.timestamp >= cutoffTime,
    );

    // Clean up resolved alerts
    this.alerts = this.alerts.filter(
      (a) => !a.resolved || a.timestamp >= cutoffTime,
    );

    const finalCount = {
      metrics: this.metrics.length,
      functionMetrics: this.functionMetrics.length,
      cacheMetrics: this.cacheMetrics.length,
      parlantMetrics: this.parlantMetrics.length,
      systemMetrics: this.systemMetrics.length,
    };

    this.logger.log("Performance metrics cleanup completed", {
      removed: {
        metrics: initialCount.metrics - finalCount.metrics,
        functionMetrics:
          initialCount.functionMetrics - finalCount.functionMetrics,
        cacheMetrics: initialCount.cacheMetrics - finalCount.cacheMetrics,
        parlantMetrics: initialCount.parlantMetrics - finalCount.parlantMetrics,
        systemMetrics: initialCount.systemMetrics - finalCount.systemMetrics,
      },
      remaining: finalCount,
    });
  }

  // ===== STATISTICAL CALCULATION METHODS =====

  private calculateMean(values: number[]): number {
    return values.length > 0
      ? values.reduce((sum, val) => sum + val, 0) / values.length
      : 0;
  }

  private calculatePercentile(
    sortedValues: number[],
    percentile: number,
  ): number {
    if (sortedValues.length === 0) return 0;

    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) return sortedValues[lower];

    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length <= 1) return 0;

    const mean = this.calculateMean(values);
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const variance = this.calculateMean(squaredDiffs);

    return Math.sqrt(variance);
  }
}

/**
 * Default performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Performance monitoring decorator for functions
 */
export function monitorPerformance(functionName?: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    const name = functionName || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      const memoryBefore = process.memoryUsage().heapUsed;

      let success = true;
      let error: string | undefined;
      let result: any;

      try {
        result = await method.apply(this, args);
        return result;
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : String(err);
        throw err;
      } finally {
        const endTime = performance.now();
        const memoryAfter = process.memoryUsage().heapUsed;

        const perfData: FunctionPerformanceData = {
          functionName: name,
          startTime,
          endTime,
          executionTime: endTime - startTime,
          parlantTime: 0, // Would be measured separately
          overheadTime: 0, // Would be calculated based on baseline
          cached: false, // Would be determined by caching layer
          cacheHit: false,
          success,
          error,
          parametersHash: JSON.stringify(args).substring(0, 100),
          memoryDelta: (memoryAfter - memoryBefore) / 1024 / 1024, // Convert to MB
          cpuUsage: 0, // Would need actual CPU monitoring
        };

        performanceMonitor.recordFunctionExecution(perfData);
      }
    };

    return descriptor;
  };
}
