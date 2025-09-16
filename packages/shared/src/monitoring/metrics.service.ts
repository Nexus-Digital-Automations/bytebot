/**
 * Local Metrics Collection Service with Prometheus Integration
 * 
 * Comprehensive metrics collection service optimized for local deployment.
 * Provides Prometheus metrics endpoints, health check metrics, and 
 * performance monitoring for the Bytebot platform.
 * 
 * Features:
 * - Prometheus metrics collection and exposure
 * - Health check metrics aggregation
 * - Performance monitoring and alerting
 * - Security event tracking
 * - Local storage metrics monitoring
 * - Circuit breaker pattern implementation
 * - Real-time metrics dashboard support
 * 
 * @author Claude Code - Local Health Checks & Monitoring Integration Specialist
 * @version 1.0.0 - Local-Only Architecture Compliant
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PrometheusMetric,
  MetricType,
  HealthCheckResult,
  MonitoringEvent,
  AlertSeverity,
  SystemResourceMetrics,
  PerformanceMetrics,
  SecurityMetrics,
  CircuitBreakerStatus,
} from './types';

/**
 * Prometheus metric registry interface
 */
interface MetricRegistry {
  counters: Map<string, { value: number; labels: Record<string, string> }>;
  gauges: Map<string, { value: number; labels: Record<string, string> }>;
  histograms: Map<string, { buckets: Map<string, number>; sum: number; count: number }>;
  summaries: Map<string, { sum: number; count: number; quantiles: Map<string, number> }>;
}

/**
 * Circuit breaker state for monitoring reliability
 */
interface CircuitBreaker {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  threshold: number;
  timeout: number;
}

/**
 * Local metrics collection service with Prometheus integration
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly metrics: MetricRegistry;
  private readonly alertThresholds: Map<string, number>;
  private readonly circuitBreakers: Map<string, CircuitBreaker>;
  private readonly operationTimers: Map<string, number>;
  private readonly healthCheckHistory: Array<{
    timestamp: Date;
    result: HealthCheckResult;
    service: string;
  }>;

  private readonly maxHistorySize = 1000;
  private readonly defaultHistogramBuckets = [0.1, 0.5, 1, 2, 5, 10, 30, 60];

  constructor(
    private readonly _config: ConfigService,
    private readonly _eventEmitter: EventEmitter2,
  ) {
    this.metrics = {
      counters: new Map(),
      gauges: new Map(),
      histograms: new Map(),
      summaries: new Map(),
    };

    this.alertThresholds = new Map([
      ['cpu_usage_percent', 80],
      ['memory_usage_percent', 85],
      ['disk_usage_percent', 90],
      ['response_time_ms', 5000],
      ['error_rate_percent', 5],
      ['security_events_per_hour', 50],
    ]);

    this.circuitBreakers = new Map();
    this.operationTimers = new Map();
    this.healthCheckHistory = [];

    this.initializeDefaultMetrics();
    this.startMetricsCollection();

    this.logger.log('Local Metrics Service initialized with Prometheus integration', {
      metricsEnabled: this.config.get<boolean>('METRICS_ENABLED', true),
      prometheusPort: this.config.get<number>('PROMETHEUS_PORT', 9090),
      alertThresholds: Object.fromEntries(this.alertThresholds),
      histogramBuckets: this.defaultHistogramBuckets,
    });
  }

  /**
   * Initialize default system metrics
   */
  private initializeDefaultMetrics(): void {
    const operationId = this.generateOperationId();
    this.logger.debug(`[${operationId}] Initializing default system metrics`);

    try {
      // System resource metrics
      this.registerGauge('system_cpu_usage_percent', 'CPU usage percentage');
      this.registerGauge('system_memory_usage_percent', 'Memory usage percentage');
      this.registerGauge('system_disk_usage_percent', 'Disk usage percentage');
      this.registerGauge('system_uptime_seconds', 'System uptime in seconds');

      // Application metrics
      this.registerCounter('http_requests_total', 'Total HTTP requests');
      this.registerCounter('http_errors_total', 'Total HTTP errors');
      this.registerHistogram('http_request_duration_seconds', 'HTTP request duration');
      this.registerHistogram('database_query_duration_seconds', 'Database query duration');

      // Health check metrics
      this.registerGauge('health_check_status', 'Health check status (1=healthy, 0=unhealthy)');
      this.registerCounter('health_check_failures_total', 'Total health check failures');
      this.registerHistogram('health_check_duration_seconds', 'Health check duration');

      // Security metrics
      this.registerCounter('security_events_total', 'Total security events');
      this.registerCounter('authentication_attempts_total', 'Total authentication attempts');
      this.registerCounter('authorization_failures_total', 'Total authorization failures');
      this.registerGauge('active_sessions', 'Number of active user sessions');

      // Performance metrics
      this.registerGauge('task_processing_rate', 'Task processing rate per second');
      this.registerGauge('connection_pool_active', 'Active database connections');
      this.registerGauge('connection_pool_idle', 'Idle database connections');

      // Circuit breaker metrics
      this.registerGauge('circuit_breaker_state', 'Circuit breaker state (0=closed, 1=open, 2=half-open)');
      this.registerCounter('circuit_breaker_trips_total', 'Total circuit breaker trips');

      this.logger.debug(`[${operationId}] Default system metrics initialized successfully`, {
        counters: this.metrics.counters.size,
        gauges: this.metrics.gauges.size,
        histograms: this.metrics.histograms.size,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Failed to initialize default metrics: ${errorMessage}`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Start periodic metrics collection
   */
  private startMetricsCollection(): void {
    const operationId = this.generateOperationId();
    const collectInterval = this.config.get<number>('METRICS_COLLECT_INTERVAL', 30000);

    this.logger.debug(`[${operationId}] Starting periodic metrics collection`, {
      intervalMs: collectInterval,
    });

    setInterval(() => {
      this.collectSystemMetrics();
    }, collectInterval);
  }

  /**
   * Collect system resource metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    const operationId = this.generateOperationId();

    try {
      // Process metrics
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      this.setGauge('system_uptime_seconds', uptime);
      this.setGauge('process_memory_rss_bytes', memoryUsage.rss);
      this.setGauge('process_memory_heap_used_bytes', memoryUsage.heapUsed);
      this.setGauge('process_memory_heap_total_bytes', memoryUsage.heapTotal);

      // Emit monitoring event
      this.emitMonitoringEvent({
        type: 'metric_update',
        severity: 'low',
        source: 'metrics_service',
        message: 'System metrics collected successfully',
        metadata: {
          uptime,
          memoryUsageMB: Math.round(memoryUsage.rss / 1024 / 1024),
        },
        timestamp: new Date().toISOString(),
        operationId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Failed to collect system metrics: ${errorMessage}`, {
        error: errorMessage,
      });
    }
  }

  /**
   * Register a counter metric
   */
  registerCounter(name: string, help: string, labels: Record<string, string> = {}): void {
    this.metrics.counters.set(name, { value: 0, labels });
    this.logger.debug(`Registered counter metric: ${name}`, { help, labels });
  }

  /**
   * Register a gauge metric
   */
  registerGauge(name: string, help: string, labels: Record<string, string> = {}): void {
    this.metrics.gauges.set(name, { value: 0, labels });
    this.logger.debug(`Registered gauge metric: ${name}`, { help, labels });
  }

  /**
   * Register a histogram metric
   */
  registerHistogram(name: string, help: string, buckets?: number[]): void {
    const bucketMap = new Map<string, number>();
    const useBuckets = buckets || this.defaultHistogramBuckets;
    
    useBuckets.forEach(bucket => {
      bucketMap.set(bucket.toString(), 0);
    });
    bucketMap.set('+Inf', 0);

    this.metrics.histograms.set(name, {
      buckets: bucketMap,
      sum: 0,
      count: 0,
    });
    this.logger.debug(`Registered histogram metric: ${name}`, { help, buckets: useBuckets });
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, value = 1, labels: Record<string, string> = {}): void {
    const metric = this.metrics.counters.get(name);
    if (metric) {
      metric.value += value;
      Object.assign(metric.labels, labels);
    } else {
      this.logger.warn(`Counter metric not found: ${name}`);
    }
  }

  /**
   * Set a gauge metric value
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const metric = this.metrics.gauges.get(name);
    if (metric) {
      metric.value = value;
      Object.assign(metric.labels, labels);
      
      // Check alert thresholds
      this.checkAlertThreshold(name, value);
    } else {
      this.logger.warn(`Gauge metric not found: ${name}`);
    }
  }

  /**
   * Observe a histogram metric
   */
  observeHistogram(name: string, value: number): void {
    const histogram = this.metrics.histograms.get(name);
    if (histogram) {
      histogram.sum += value;
      histogram.count += 1;

      // Update buckets
      histogram.buckets.forEach((count, bucket) => {
        if (bucket === '+Inf' || value <= parseFloat(bucket)) {
          histogram.buckets.set(bucket, count + 1);
        }
      });
    } else {
      this.logger.warn(`Histogram metric not found: ${name}`);
    }
  }

  /**
   * Start timing an operation
   */
  startTimer(operationName: string): string {
    const timerId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.operationTimers.set(timerId, Date.now());
    return timerId;
  }

  /**
   * End timing an operation and record to histogram
   */
  endTimer(timerId: string, histogramName?: string): number {
    const startTime = this.operationTimers.get(timerId);
    if (!startTime) {
      this.logger.warn(`Timer not found: ${timerId}`);
      return 0;
    }

    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    this.operationTimers.delete(timerId);

    if (histogramName) {
      this.observeHistogram(histogramName, duration);
    }

    return duration;
  }

  /**
   * Record health check result
   */
  recordHealthCheck(serviceName: string, result: HealthCheckResult): void {
    const operationId = this.generateOperationId();
    
    try {
      // Record health check status
      this.setGauge('health_check_status', result.isHealthy ? 1 : 0, { service: serviceName });
      
      // Record failure if unhealthy
      if (!result.isHealthy) {
        this.incrementCounter('health_check_failures_total', 1, { service: serviceName });
      }

      // Record response time if available
      if (result.responseTime) {
        this.observeHistogram('health_check_duration_seconds', result.responseTime / 1000);
      }

      // Add to history
      this.healthCheckHistory.push({
        timestamp: new Date(),
        result,
        service: serviceName,
      });

      // Maintain history size
      if (this.healthCheckHistory.length > this.maxHistorySize) {
        this.healthCheckHistory.splice(0, this.healthCheckHistory.length - this.maxHistorySize);
      }

      this.logger.debug(`[${operationId}] Health check recorded for ${serviceName}`, {
        isHealthy: result.isHealthy,
        responseTime: result.responseTime,
        historySize: this.healthCheckHistory.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Failed to record health check: ${errorMessage}`, {
        serviceName,
        error: errorMessage,
      });
    }
  }

  /**
   * Record security event
   */
  recordSecurityEvent(eventType: string, severity: AlertSeverity, source: string): void {
    const operationId = this.generateOperationId();
    
    try {
      this.incrementCounter('security_events_total', 1, { 
        event_type: eventType, 
        severity, 
        source 
      });

      // Emit security monitoring event
      this.emitMonitoringEvent({
        type: 'system_event',
        severity,
        source,
        message: `Security event recorded: ${eventType}`,
        metadata: { eventType, severity, source },
        timestamp: new Date().toISOString(),
        operationId,
      });

      this.logger.debug(`[${operationId}] Security event recorded`, {
        eventType,
        severity,
        source,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Failed to record security event: ${errorMessage}`, {
        eventType,
        severity,
        source,
        error: errorMessage,
      });
    }
  }

  /**
   * Record alert triggered
   */
  recordAlertTriggered(alertName: string, severity: AlertSeverity, source: string): void {
    const operationId = this.generateOperationId();
    
    try {
      this.incrementCounter('alerts_triggered_total', 1, { 
        alert: alertName, 
        severity, 
        source 
      });

      this.emitMonitoringEvent({
        type: 'alert_triggered',
        severity,
        source,
        message: `Alert triggered: ${alertName}`,
        metadata: { alertName, severity, source },
        timestamp: new Date().toISOString(),
        operationId,
      });

      this.logger.warn(`[${operationId}] Alert triggered: ${alertName}`, {
        alertName,
        severity,
        source,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Failed to record alert: ${errorMessage}`, {
        alertName,
        severity,
        source,
        error: errorMessage,
      });
    }
  }

  /**
   * Record compliance check result
   */
  recordComplianceCheck(checkName: string, component: string, status: 'compliant' | 'non_compliant'): void {
    this.incrementCounter('compliance_checks_total', 1, { 
      check: checkName, 
      component, 
      status 
    });
  }

  /**
   * Record threat detection
   */
  recordThreatDetection(threatType: string, severity: AlertSeverity, source: string): void {
    this.incrementCounter('threats_detected_total', 1, { 
      threat_type: threatType, 
      severity, 
      source 
    });
  }

  /**
   * Update circuit breaker status
   */
  updateCircuitBreaker(name: string, status: CircuitBreakerStatus): void {
    const stateValue = status.state === 'CLOSED' ? 0 : status.state === 'OPEN' ? 1 : 2;
    this.setGauge('circuit_breaker_state', stateValue, { name });
    
    if (status.state === 'OPEN') {
      this.incrementCounter('circuit_breaker_trips_total', 1, { name });
    }
  }

  /**
   * Generate Prometheus metrics output
   */
  generatePrometheusMetrics(): string {
    const operationId = this.generateOperationId();
    
    try {
      const lines: string[] = [];

      // Export counters
      this.metrics.counters.forEach((metric, name) => {
        lines.push(`# TYPE ${name} counter`);
        const labelStr = Object.keys(metric.labels).length > 0 
          ? `{${Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',')}}` 
          : '';
        lines.push(`${name}${labelStr} ${metric.value}`);
      });

      // Export gauges
      this.metrics.gauges.forEach((metric, name) => {
        lines.push(`# TYPE ${name} gauge`);
        const labelStr = Object.keys(metric.labels).length > 0 
          ? `{${Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',')}}` 
          : '';
        lines.push(`${name}${labelStr} ${metric.value}`);
      });

      // Export histograms
      this.metrics.histograms.forEach((histogram, name) => {
        lines.push(`# TYPE ${name} histogram`);
        
        histogram.buckets.forEach((count, bucket) => {
          lines.push(`${name}_bucket{le="${bucket}"} ${count}`);
        });
        
        lines.push(`${name}_sum ${histogram.sum}`);
        lines.push(`${name}_count ${histogram.count}`);
      });

      const output = lines.join('\n') + '\n';
      
      this.logger.debug(`[${operationId}] Prometheus metrics generated`, {
        metricsCount: lines.length,
        outputSize: output.length,
      });

      return output;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Failed to generate Prometheus metrics: ${errorMessage}`, {
        error: errorMessage,
      });
      return '# Error generating metrics\n';
    }
  }

  /**
   * Get health check history
   */
  getHealthCheckHistory(serviceName?: string): Array<{ timestamp: Date; result: HealthCheckResult; service: string }> {
    if (serviceName) {
      return this.healthCheckHistory.filter(entry => entry.service === serviceName);
    }
    return [...this.healthCheckHistory];
  }

  /**
   * Check alert threshold and trigger if exceeded
   */
  private checkAlertThreshold(metricName: string, value: number): void {
    const threshold = this.alertThresholds.get(metricName);
    if (threshold && value > threshold) {
      this.recordAlertTriggered(`${metricName}_threshold_exceeded`, 'high', 'metrics_service');
    }
  }

  /**
   * Emit monitoring event
   */
  private emitMonitoringEvent(event: MonitoringEvent): void {
    try {
      this.eventEmitter.emit('monitoring.event', event);
    } catch (error) {
      this.logger.error('Failed to emit monitoring event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        event,
      });
    }
  }

  /**
   * Generate operation ID for correlation
   */
  private generateOperationId(): string {
    return `metrics_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Get current metrics summary
   */
  getMetricsSummary(): { counters: number; gauges: number; histograms: number; summaries: number } {
    return {
      counters: this.metrics.counters.size,
      gauges: this.metrics.gauges.size,
      histograms: this.metrics.histograms.size,
      summaries: this.metrics.summaries.size,
    };
  }

  /**
   * Reset all metrics (for testing)
   */
  resetMetrics(): void {
    this.metrics.counters.clear();
    this.metrics.gauges.clear();
    this.metrics.histograms.clear();
    this.metrics.summaries.clear();
    this.healthCheckHistory.length = 0;
    this.operationTimers.clear();
    
    this.initializeDefaultMetrics();
    this.logger.debug('All metrics reset and reinitialized');
  }
}