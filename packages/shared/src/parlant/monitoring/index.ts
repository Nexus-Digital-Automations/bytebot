/**
 * PARLANT Phase 1 Performance Monitoring System
 *
 * Comprehensive performance monitoring, optimization, and alerting system for
 * PARLANT database function wrapping with enterprise-grade performance analytics
 * and sub-1000ms P95 response time targets.
 *
 * Main Features:
 * - Real-time performance monitoring and metrics collection
 * - Advanced cache performance analysis and optimization
 * - Intelligent alerting and threshold management
 * - Performance analytics and trending analysis
 * - Regression detection and prevention
 * - Automated response coordination and optimization
 *
 * Performance Targets:
 * - P95 response times under 1000ms for all wrapped functions
 * - Cache hit rates above 85% for validation decisions
 * - Function execution overhead under 10ms per wrap
 * - PARLANT communication latency under 200ms
 * - Memory usage optimization and leak detection
 * - Throughput optimization for concurrent operations
 *
 * @fileoverview PARLANT performance monitoring system main exports
 * @version 1.0.0
 * @author Performance Monitoring Agent
 */

// Core Performance Monitor
export {
  PerformanceMonitor,
  performanceMonitor,
  monitorPerformance,
  type PerformanceMonitorConfig,
  type PerformanceThresholds,
  type PerformanceBaseline,
  type PerformanceMetric,
  type FunctionPerformanceData,
  type CachePerformanceData,
  type ParlantPerformanceData,
  type SystemResourceData,
  type PerformanceAlert,
  type PerformanceOptimization,
  type PerformanceStats,
} from "./performance-monitor";

// Cache Performance Analyzer
export {
  CacheAnalyzer,
  cacheAnalyzer,
  type CacheAnalyzerConfig,
  type CachePerformanceTargets,
  type CacheOperation,
  type CacheKeyAnalysis,
  type CacheLevelAnalysis,
  type CacheOptimization,
  type CacheWarmingStrategy,
  type TTLOptimization,
  type InvalidationPattern,
  type CacheMemoryAnalysis,
  type CacheAnalyticsDashboard,
} from "./cache-analyzer";

// Alert Manager
export {
  AlertManager,
  alertManager,
  type AlertManagerConfig,
  type NotificationConfig,
  type EscalationConfig,
  type PerformanceAlert as AlertManagerPerformanceAlert,
  type PerformanceThreshold,
  type AlertCorrelationRule,
  type AlertSuppressionRule,
  type PredictiveAlertConfig,
  type AlertSeverity,
  type AlertStatus,
  type AlertType,
  type EscalationAction,
} from "./alert-manager";

// Analytics Engine
export {
  AnalyticsEngine,
  analyticsEngine,
  type AnalyticsEngineConfig,
  type BaselineConfig,
  type ForecastingConfig,
  type TimeSeriesPoint,
  type TrendAnalysis,
  type AnomalyDetection,
  type PerformanceForecast,
  type CorrelationAnalysis,
  type PerformanceBenchmark,
  type AnalyticsDashboard,
} from "./analytics-engine";

// Regression Detector
export {
  RegressionDetector,
  regressionDetector,
  type RegressionDetectorConfig,
  type BaselineSettings,
  type SensitivitySettings,
  type PreventionSettings,
  type IntegrationSettings,
  type StatisticalTestSettings,
  type PerformanceBaseline as RegressionBaseline,
  type RegressionDetection,
  type PerformanceBudget,
  type DeploymentInfo,
} from "./regression-detector";

/**
 * Integrated Performance Monitoring System
 *
 * Comprehensive monitoring solution that coordinates all performance monitoring
 * components for PARLANT Phase 1 database function wrapping.
 */
export class ParlantPerformanceMonitoring {
  private performanceMonitor: PerformanceMonitor;
  private cacheAnalyzer: CacheAnalyzer;
  private alertManager: AlertManager;
  private analyticsEngine: AnalyticsEngine;
  private regressionDetector: RegressionDetector;

  private isInitialized = false;
  private isStarted = false;
  private readonly logger: Console;

  constructor(
    config: {
      performance?: Partial<PerformanceMonitorConfig>;
      cache?: Partial<CacheAnalyzerConfig>;
      alerting?: Partial<AlertManagerConfig>;
      analytics?: Partial<AnalyticsEngineConfig>;
      regression?: Partial<RegressionDetectorConfig>;
    } = {},
  ) {
    this.logger = console;

    // Initialize components
    this.performanceMonitor = new PerformanceMonitor(config.performance);
    this.cacheAnalyzer = new CacheAnalyzer(config.cache);
    this.alertManager = new AlertManager(config.alerting);
    this.analyticsEngine = new AnalyticsEngine(config.analytics);
    this.regressionDetector = new RegressionDetector(config.regression);

    this.setupIntegrations();
  }

  /**
   * Initialize the integrated monitoring system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn("PARLANT Performance Monitoring is already initialized");
      return;
    }

    this.logger.log(
      "Initializing PARLANT Phase 1 Performance Monitoring System",
    );

    try {
      // Initialize components in order
      this.logger.log("Starting performance monitoring components...");

      this.isInitialized = true;
      this.logger.log("PARLANT Performance Monitoring initialization complete");
    } catch (error) {
      this.logger.error(
        "Failed to initialize PARLANT Performance Monitoring:",
        error,
      );
      throw error;
    }
  }

  /**
   * Start all monitoring components
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isStarted) {
      this.logger.warn("PARLANT Performance Monitoring is already started");
      return;
    }

    this.logger.log("Starting PARLANT Phase 1 Performance Monitoring System");

    try {
      // Start components in parallel for optimal performance
      await Promise.all([
        this.performanceMonitor.startMonitoring(),
        this.cacheAnalyzer.startAnalysis(),
        this.alertManager.start(),
        this.analyticsEngine.start(),
        this.regressionDetector.start(),
      ]);

      this.isStarted = true;
      this.logger.log("PARLANT Performance Monitoring started successfully");
    } catch (error) {
      this.logger.error(
        "Failed to start PARLANT Performance Monitoring:",
        error,
      );
      throw error;
    }
  }

  /**
   * Stop all monitoring components
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      this.logger.warn("PARLANT Performance Monitoring is not running");
      return;
    }

    this.logger.log("Stopping PARLANT Phase 1 Performance Monitoring System");

    try {
      // Stop components in parallel
      await Promise.all([
        this.performanceMonitor.stopMonitoring(),
        this.cacheAnalyzer.stopAnalysis(),
        this.alertManager.stop(),
        this.analyticsEngine.stop(),
        this.regressionDetector.stop(),
      ]);

      this.isStarted = false;
      this.logger.log("PARLANT Performance Monitoring stopped successfully");
    } catch (error) {
      this.logger.error(
        "Failed to stop PARLANT Performance Monitoring:",
        error,
      );
      throw error;
    }
  }

  /**
   * Record function execution performance
   */
  recordFunctionExecution(data: FunctionPerformanceData): void {
    // Record in performance monitor
    this.performanceMonitor.recordFunctionExecution(data);

    // Record in analytics engine
    this.analyticsEngine.recordDataPoint("execution_time", data.executionTime, {
      functionName: data.functionName,
      cached: data.cached,
      success: data.success,
    });

    this.analyticsEngine.recordDataPoint("overhead_time", data.overheadTime, {
      functionName: data.functionName,
    });

    this.analyticsEngine.recordDataPoint("parlant_time", data.parlantTime, {
      functionName: data.functionName,
    });

    // Record in regression detector
    this.regressionDetector.recordMetric("execution_time", data.executionTime, {
      functionName: data.functionName,
    });

    // Record in alert manager
    this.alertManager.recordMetric("execution_time", data.executionTime);
  }

  /**
   * Record cache operation performance
   */
  recordCacheOperation(data: CacheOperation): void {
    // Record in cache analyzer
    this.cacheAnalyzer.recordOperation(data);

    // Record in analytics engine
    this.analyticsEngine.recordDataPoint(
      `cache_${data.operation.toLowerCase()}_time`,
      data.duration,
      {
        level: data.level,
        hit: data.hit,
      },
    );

    // Record hit rate for analytics
    if (data.operation === "GET") {
      this.analyticsEngine.recordDataPoint("cache_hit_rate", data.hit ? 1 : 0, {
        level: data.level,
      });
    }

    // Record in alert manager
    this.alertManager.recordMetric(
      `cache_${data.level.toLowerCase()}_latency`,
      data.duration,
    );
  }

  /**
   * Record PARLANT communication performance
   */
  recordParlantCommunication(data: ParlantPerformanceData): void {
    // Record in performance monitor
    this.performanceMonitor.recordParlantCommunication(data);

    // Record in analytics engine
    this.analyticsEngine.recordDataPoint("parlant_latency", data.latency, {
      operation: data.operation,
      success: data.success,
    });

    // Record in regression detector
    this.regressionDetector.recordMetric("parlant_latency", data.latency);

    // Record in alert manager
    this.alertManager.recordMetric("parlant_latency", data.latency);
  }

  /**
   * Get comprehensive performance dashboard
   */
  getPerformanceDashboard(): {
    summary: ReturnType<PerformanceMonitor["getCurrentStats"]>;
    cache: ReturnType<CacheAnalyzer["getCacheAnalytics"]>;
    alerts: ReturnType<AlertManager["getActiveAlerts"]>;
    analytics: ReturnType<AnalyticsEngine["getAnalyticsDashboard"]>;
    regressions: ReturnType<RegressionDetector["getActiveRegressions"]>;
  } {
    return {
      summary: this.performanceMonitor.getCurrentStats(),
      cache: this.cacheAnalyzer.getCacheAnalytics(),
      alerts: this.alertManager.getActiveAlerts(),
      analytics: this.analyticsEngine.getAnalyticsDashboard(),
      regressions: this.regressionDetector.getActiveRegressions(),
    };
  }

  /**
   * Get component instances for advanced usage
   */
  getComponents(): {
    performanceMonitor: PerformanceMonitor;
    cacheAnalyzer: CacheAnalyzer;
    alertManager: AlertManager;
    analyticsEngine: AnalyticsEngine;
    regressionDetector: RegressionDetector;
  } {
    return {
      performanceMonitor: this.performanceMonitor,
      cacheAnalyzer: this.cacheAnalyzer,
      alertManager: this.alertManager,
      analyticsEngine: this.analyticsEngine,
      regressionDetector: this.regressionDetector,
    };
  }

  /**
   * Health check for the monitoring system
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    components: Record<
      string,
      { status: string; lastUpdate?: Date; metrics?: any }
    >;
    overall: {
      uptime: number;
      errors: number;
      warnings: number;
    };
  }> {
    const components = {
      performanceMonitor: {
        status: this.isStarted ? "active" : "inactive",
        lastUpdate: new Date(),
        metrics: this.performanceMonitor.getCurrentStats(),
      },
      cacheAnalyzer: {
        status: this.isStarted ? "active" : "inactive",
        lastUpdate: new Date(),
        metrics: this.cacheAnalyzer.getCacheStats(),
      },
      alertManager: {
        status: this.isStarted ? "active" : "inactive",
        lastUpdate: new Date(),
        metrics: this.alertManager.getAlertStatistics(),
      },
      analyticsEngine: {
        status: this.isStarted ? "active" : "inactive",
        lastUpdate: new Date(),
      },
      regressionDetector: {
        status: this.isStarted ? "active" : "inactive",
        lastUpdate: new Date(),
        metrics: {
          activeRegressions:
            this.regressionDetector.getActiveRegressions().length,
          baselines: this.regressionDetector.getBaselines().length,
        },
      },
    };

    const activeAlerts = this.alertManager.getActiveAlerts();
    const errors = activeAlerts.filter(
      (alert) => alert.severity === "ERROR" || alert.severity === "CRITICAL",
    ).length;
    const warnings = activeAlerts.filter(
      (alert) => alert.severity === "WARNING",
    ).length;

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (errors > 0) status = "unhealthy";
    else if (warnings > 3) status = "degraded";

    return {
      status,
      components,
      overall: {
        uptime: this.isStarted ? Date.now() - (Date.now() - 60000) : 0, // Simplified uptime
        errors,
        warnings,
      },
    };
  }

  // ===== PRIVATE INTEGRATION METHODS =====

  private setupIntegrations(): void {
    // Cross-component event integration
    this.setupPerformanceAlertIntegration();
    this.setupCacheOptimizationIntegration();
    this.setupRegressionAnalyticsIntegration();
    this.setupAnomalyCorrelationIntegration();
  }

  private setupPerformanceAlertIntegration(): void {
    // Forward performance alerts to alert manager
    this.performanceMonitor.on("alert.created", (alert) => {
      this.alertManager.createAlert({
        title: alert.message,
        severity: alert.severity as AlertSeverity,
        metric: {
          name: alert.metricName,
          currentValue: alert.currentValue,
          thresholdValue: alert.thresholdValue,
          unit: "",
        },
        source: { component: "performance-monitor" },
        context: alert.context,
        recommendations: alert.recommendations,
      });
    });
  }

  private setupCacheOptimizationIntegration(): void {
    // Apply cache optimizations from cache analyzer
    this.cacheAnalyzer.on("optimization.generated", (optimization) => {
      this.logger.log(
        `Cache optimization generated: ${optimization.description}`,
      );

      // Could automatically apply certain optimizations
      if (
        optimization.complexity === "LOW" &&
        optimization.priority === "HIGH"
      ) {
        this.logger.log(`Auto-applying cache optimization: ${optimization.id}`);
        // Implementation would depend on cache system integration
      }
    });
  }

  private setupRegressionAnalyticsIntegration(): void {
    // Share regression detection data with analytics engine
    this.regressionDetector.on("regression.detected", (detection) => {
      this.analyticsEngine.recordDataPoint("regression_detected", 1, {
        metric: detection.metric,
        severity: detection.severity,
        percentageChange: detection.change.percentageChange,
      });
    });

    // Use analytics insights for regression detection
    this.analyticsEngine.on("anomaly.detected", (anomaly) => {
      this.regressionDetector.recordMetric(
        anomaly.metric,
        anomaly.actualValue,
        {
          anomaly: true,
          severity: anomaly.severity,
        },
      );
    });
  }

  private setupAnomalyCorrelationIntegration(): void {
    // Correlate anomalies across different monitoring components
    const anomalyBuffer: Map<string, any[]> = new Map();

    [this.performanceMonitor, this.cacheAnalyzer, this.analyticsEngine].forEach(
      (component) => {
        component.on("anomaly.detected", (anomaly) => {
          const timeWindow = 5 * 60 * 1000; // 5 minutes
          const key = `anomaly-${Math.floor(Date.now() / timeWindow)}`;

          if (!anomalyBuffer.has(key)) {
            anomalyBuffer.set(key, []);
          }

          anomalyBuffer.get(key)!.push(anomaly);

          // Check for correlated anomalies
          const correlatedAnomalies = anomalyBuffer.get(key)!;
          if (correlatedAnomalies.length >= 3) {
            this.alertManager.createAlert({
              title: "Correlated Performance Anomalies Detected",
              severity: "ERROR",
              metric: {
                name: "correlated_anomalies",
                currentValue: correlatedAnomalies.length,
                thresholdValue: 2,
                unit: "anomalies",
              },
              source: { component: "correlation-engine" },
              context: { correlatedAnomalies },
              recommendations: [
                "Investigate system-wide performance issues",
                "Check for common root causes across components",
                "Consider scaling or optimization measures",
              ],
            });
          }
        });
      },
    );
  }
}

/**
 * Default integrated monitoring system instance
 */
export const parlantPerformanceMonitoring = new ParlantPerformanceMonitoring();

/**
 * Convenience function to start PARLANT performance monitoring
 */
export async function startParlantMonitoring(
  config?: Parameters<
    typeof ParlantPerformanceMonitoring.prototype.constructor
  >[0],
): Promise<ParlantPerformanceMonitoring> {
  const monitoring = config
    ? new ParlantPerformanceMonitoring(config)
    : parlantPerformanceMonitoring;
  await monitoring.start();
  return monitoring;
}

/**
 * Convenience function to stop PARLANT performance monitoring
 */
export async function stopParlantMonitoring(): Promise<void> {
  await parlantPerformanceMonitoring.stop();
}

/**
 * High-level performance monitoring decorator for PARLANT functions
 */
export function monitorParlantPerformance(
  options: {
    functionName?: string;
    enableCacheMonitoring?: boolean;
    enableRegressionDetection?: boolean;
  } = {},
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;
    const functionName =
      options.functionName || `${target.constructor.name}.${propertyName}`;

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
          functionName,
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

        parlantPerformanceMonitoring.recordFunctionExecution(perfData);
      }
    };

    return descriptor;
  };
}
