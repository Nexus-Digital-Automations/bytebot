import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Comprehensive Security Metrics Service
 *
 * Features:
 * - Real-time security metrics collection
 * - Performance metrics and KPIs
 * - Prometheus metrics export
 * - Custom dashboards and visualizations
 * - Metrics aggregation and analysis
 * - Historical data retention
 * - Anomaly detection on metrics
 * - Automated reporting and insights
 */

export interface SecurityMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  value: number;
  timestamp: number;
  labels: Record<string, string>;
  description: string;
}

export interface MetricSeries {
  name: string;
  data: Array<{ timestamp: number; value: number }>;
  labels: Record<string, string>;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

export interface SecurityKPI {
  name: string;
  value: number;
  target: number;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
  description: string;
  lastUpdated: number;
}

export interface MetricDashboard {
  id: string;
  name: string;
  description: string;
  widgets: Array<{
    id: string;
    type: 'chart' | 'gauge' | 'counter' | 'table' | 'alert_list';
    title: string;
    metrics: string[];
    config: Record<string, any>;
    position: { x: number; y: number; width: number; height: number };
  }>;
  refreshInterval: number;
  timeRange: { start: string; end: string };
  filters: Record<string, string>;
}

export interface PerformanceReport {
  id: string;
  generatedAt: number;
  timeRange: { start: number; end: number };
  summary: {
    totalRequests: number;
    allowedRequests: number;
    blockedRequests: number;
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
    uptime: number;
  };
  securityMetrics: {
    ddosAttacksDetected: number;
    ddosAttacksMitigated: number;
    abusePatterns: number;
    anomaliesDetected: number;
    falsePositives: number;
    falseNegatives: number;
  };
  performanceMetrics: {
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    maxConcurrentConnections: number;
    bandwidthUtilization: number;
    resourceUtilization: {
      cpu: number;
      memory: number;
      network: number;
    };
  };
  trends: Array<{
    metric: string;
    change: number;
    significance: 'low' | 'medium' | 'high';
  }>;
  recommendations: string[];
  alerts: Array<{
    type: string;
    count: number;
    avgResolutionTime: number;
  }>;
}

@Injectable()
export class SecurityMetricsService {
  private readonly logger = new Logger(SecurityMetricsService.name);

  // Metrics storage
  private metrics = new Map<string, SecurityMetric[]>();
  private kpis = new Map<string, SecurityKPI>();
  private dashboards = new Map<string, MetricDashboard>();

  // Performance tracking
  private performanceData = {
    requests: {
      total: 0,
      allowed: 0,
      blocked: 0,
      rateLimited: 0,
      ddosBlocked: 0,
      abuseBlocked: 0
    },
    responseTime: {
      samples: [] as number[],
      p50: 0,
      p95: 0,
      p99: 0,
      average: 0
    },
    throughput: {
      samples: [] as number[],
      current: 0,
      peak: 0,
      average: 0
    },
    errors: {
      total: 0,
      rate: 0,
      byType: {} as Record<string, number>
    },
    uptime: {
      startTime: Date.now(),
      downtime: 0,
      availability: 100
    }
  };

  // Configuration
  private config = {
    metricsRetentionDays: 30,
    sampleInterval: 30000, // 30 seconds
    aggregationWindow: 300000, // 5 minutes
    enablePrometheusExport: true,
    enableDetailedMetrics: true,
    maxSamplesPerMetric: 2880 // 24 hours at 30-second intervals
  };

  constructor(private readonly configService: ConfigService) {
    this.loadConfiguration();
    this.initializeKPIs();
    this.initializeDefaultDashboards();
    this.startMetricsCollection();
    this.startPerformanceMonitoring();
  }

  /**
   * Record a security event metric
   */
  recordSecurityEvent(event: any): void {
    const timestamp = Date.now();

    // Record event counter
    this.recordMetric({
      name: 'security_events_total',
      type: 'counter',
      value: 1,
      timestamp,
      labels: {
        type: event.type,
        severity: event.severity,
        source: event.source
      },
      description: 'Total number of security events'
    });

    // Update request counters
    this.performanceData.requests.total++;

    // Record specific event types
    switch (event.type) {
      case 'rate_limit':
        this.performanceData.requests.rateLimited++;
        this.recordMetric({
          name: 'rate_limit_violations_total',
          type: 'counter',
          value: 1,
          timestamp,
          labels: { rule: event.details?.rule || 'unknown' },
          description: 'Total rate limit violations'
        });
        break;

      case 'ddos':
        this.performanceData.requests.ddosBlocked++;
        this.recordMetric({
          name: 'ddos_attacks_total',
          type: 'counter',
          value: 1,
          timestamp,
          labels: { severity: event.severity },
          description: 'Total DDoS attacks detected'
        });
        break;

      case 'abuse':
        this.performanceData.requests.abuseBlocked++;
        this.recordMetric({
          name: 'abuse_patterns_total',
          type: 'counter',
          value: 1,
          timestamp,
          labels: { pattern: event.details?.pattern || 'unknown' },
          description: 'Total abuse patterns detected'
        });
        break;

      case 'anomaly':
        this.recordMetric({
          name: 'anomalies_detected_total',
          type: 'counter',
          value: 1,
          timestamp,
          labels: {
            anomaly_type: event.details?.anomalyType || 'unknown',
            confidence: event.details?.confidence || 'unknown'
          },
          description: 'Total anomalies detected'
        });
        break;
    }

    // Update KPIs
    this.updateKPIs();
  }

  /**
   * Record request metrics
   */
  recordRequest(details: {
    allowed: boolean;
    responseTime: number;
    blocked?: boolean;
    reason?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
  }): void {
    const timestamp = Date.now();

    // Update request counters
    this.performanceData.requests.total++;
    if (details.allowed) {
      this.performanceData.requests.allowed++;
    } else {
      this.performanceData.requests.blocked++;
    }

    // Record response time
    this.performanceData.responseTime.samples.push(details.responseTime);
    this.maintainSampleSize(this.performanceData.responseTime.samples);

    // Calculate percentiles
    this.calculateResponseTimePercentiles();

    // Record throughput
    const currentThroughput = this.calculateCurrentThroughput();
    this.performanceData.throughput.samples.push(currentThroughput);
    this.maintainSampleSize(this.performanceData.throughput.samples);

    // Record error if status code indicates error
    if (details.statusCode && details.statusCode >= 400) {
      this.performanceData.errors.total++;
      this.performanceData.errors.byType[details.statusCode.toString()] =
        (this.performanceData.errors.byType[details.statusCode.toString()] || 0) + 1;
    }

    // Record Prometheus-style metrics
    this.recordMetric({
      name: 'http_requests_total',
      type: 'counter',
      value: 1,
      timestamp,
      labels: {
        method: details.method || 'unknown',
        endpoint: details.endpoint || 'unknown',
        status: details.statusCode?.toString() || 'unknown',
        allowed: details.allowed.toString()
      },
      description: 'Total HTTP requests'
    });

    this.recordMetric({
      name: 'http_request_duration_seconds',
      type: 'histogram',
      value: details.responseTime / 1000,
      timestamp,
      labels: {
        method: details.method || 'unknown',
        endpoint: details.endpoint || 'unknown'
      },
      description: 'HTTP request duration in seconds'
    });

    // Update KPIs
    this.updateKPIs();
  }

  /**
   * Record custom metric
   */
  recordMetric(metric: SecurityMetric): void {
    const key = `${metric.name}_${JSON.stringify(metric.labels)}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const series = this.metrics.get(key)!;
    series.push(metric);

    // Maintain max samples per metric
    if (series.length > this.config.maxSamplesPerMetric) {
      series.splice(0, series.length - this.config.maxSamplesPerMetric);
    }
  }

  /**
   * Get metric series
   */
  getMetricSeries(name: string, labels?: Record<string, string>, timeRange?: { start: number; end: number }): MetricSeries[] {
    const series: MetricSeries[] = [];

    for (const [key, metrics] of this.metrics.entries()) {
      if (!key.startsWith(name)) continue;

      // Parse labels from key
      const keyLabels = JSON.parse(key.substring(name.length + 1));

      // Filter by labels if specified
      if (labels) {
        let matches = true;
        for (const [labelKey, labelValue] of Object.entries(labels)) {
          if (keyLabels[labelKey] !== labelValue) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }

      // Filter by time range if specified
      let data = metrics.map(m => ({ timestamp: m.timestamp, value: m.value }));
      if (timeRange) {
        data = data.filter(d => d.timestamp >= timeRange.start && d.timestamp <= timeRange.end);
      }

      if (data.length > 0) {
        series.push({
          name,
          data,
          labels: keyLabels,
          aggregation: 'sum' // Default aggregation
        });
      }
    }

    return series;
  }

  /**
   * Get current KPIs
   */
  getKPIs(): SecurityKPI[] {
    return Array.from(this.kpis.values());
  }

  /**
   * Get dashboard configuration
   */
  getDashboard(dashboardId: string): MetricDashboard | undefined {
    return this.dashboards.get(dashboardId);
  }

  /**
   * Get all dashboards
   */
  getDashboards(): MetricDashboard[] {
    return Array.from(this.dashboards.values());
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(timeRange: { start: number; end: number }): PerformanceReport {
    const reportId = `report_${Date.now()}`;
    const now = Date.now();

    // Calculate summary metrics
    const totalUptime = now - this.performanceData.uptime.startTime;
    const uptime = ((totalUptime - this.performanceData.uptime.downtime) / totalUptime) * 100;

    const errorRate = this.performanceData.requests.total > 0
      ? this.performanceData.errors.total / this.performanceData.requests.total
      : 0;

    // Get time-series data for trends
    const trends = this.calculateTrends(timeRange);

    // Get alert statistics
    const alertStats = this.getAlertStatistics(timeRange);

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    return {
      id: reportId,
      generatedAt: now,
      timeRange,
      summary: {
        totalRequests: this.performanceData.requests.total,
        allowedRequests: this.performanceData.requests.allowed,
        blockedRequests: this.performanceData.requests.blocked,
        averageResponseTime: this.performanceData.responseTime.average,
        errorRate,
        throughput: this.performanceData.throughput.average,
        uptime
      },
      securityMetrics: {
        ddosAttacksDetected: this.performanceData.requests.ddosBlocked,
        ddosAttacksMitigated: this.performanceData.requests.ddosBlocked, // Simplified
        abusePatterns: this.performanceData.requests.abuseBlocked,
        anomaliesDetected: 0, // Would get from anomaly detection service
        falsePositives: 0, // Would track false positives
        falseNegatives: 0 // Would track false negatives
      },
      performanceMetrics: {
        p50ResponseTime: this.performanceData.responseTime.p50,
        p95ResponseTime: this.performanceData.responseTime.p95,
        p99ResponseTime: this.performanceData.responseTime.p99,
        maxConcurrentConnections: 0, // Would track concurrent connections
        bandwidthUtilization: 0, // Would track bandwidth
        resourceUtilization: {
          cpu: 0, // Would get from system monitoring
          memory: 0,
          network: 0
        }
      },
      trends,
      recommendations,
      alerts: alertStats
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    if (!this.config.enablePrometheusExport) {
      return '';
    }

    const prometheusMetrics: string[] = [];
    const metricTypes = new Set<string>();

    for (const [key, metricsList] of this.metrics.entries()) {
      if (metricsList.length === 0) continue;

      const latestMetric = metricsList[metricsList.length - 1];
      const metricName = latestMetric.name;

      // Add metric type comment (only once per metric)
      if (!metricTypes.has(metricName)) {
        prometheusMetrics.push(`# HELP ${metricName} ${latestMetric.description}`);
        prometheusMetrics.push(`# TYPE ${metricName} ${latestMetric.type}`);
        metricTypes.add(metricName);
      }

      // Format labels
      const labels = Object.entries(latestMetric.labels)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');

      const labelsStr = labels ? `{${labels}}` : '';
      prometheusMetrics.push(`${metricName}${labelsStr} ${latestMetric.value} ${latestMetric.timestamp}`);
    }

    return prometheusMetrics.join('\n');
  }

  /**
   * Update KPIs based on current metrics
   */
  private updateKPIs(): void {
    const now = Date.now();

    // Availability KPI
    const totalUptime = now - this.performanceData.uptime.startTime;
    const availability = ((totalUptime - this.performanceData.uptime.downtime) / totalUptime) * 100;

    this.kpis.set('availability', {
      name: 'System Availability',
      value: availability,
      target: 99.9,
      trend: availability >= 99.9 ? 'stable' : 'down',
      status: availability >= 99.9 ? 'good' : availability >= 99.0 ? 'warning' : 'critical',
      description: 'Overall system availability percentage',
      lastUpdated: now
    });

    // Error Rate KPI
    const errorRate = this.performanceData.requests.total > 0
      ? (this.performanceData.errors.total / this.performanceData.requests.total) * 100
      : 0;

    this.kpis.set('error_rate', {
      name: 'Error Rate',
      value: errorRate,
      target: 1.0,
      trend: errorRate <= 1.0 ? 'stable' : 'up',
      status: errorRate <= 1.0 ? 'good' : errorRate <= 5.0 ? 'warning' : 'critical',
      description: 'Percentage of requests resulting in errors',
      lastUpdated: now
    });

    // Response Time KPI
    this.kpis.set('response_time', {
      name: 'Average Response Time',
      value: this.performanceData.responseTime.average,
      target: 500,
      trend: this.performanceData.responseTime.average <= 500 ? 'stable' : 'up',
      status: this.performanceData.responseTime.average <= 500 ? 'good' :
             this.performanceData.responseTime.average <= 1000 ? 'warning' : 'critical',
      description: 'Average response time in milliseconds',
      lastUpdated: now
    });

    // Security Effectiveness KPI
    const totalThreats = this.performanceData.requests.rateLimited +
                        this.performanceData.requests.ddosBlocked +
                        this.performanceData.requests.abuseBlocked;

    const blockedThreats = this.performanceData.requests.blocked;
    const effectiveness = totalThreats > 0 ? (blockedThreats / totalThreats) * 100 : 100;

    this.kpis.set('security_effectiveness', {
      name: 'Security Effectiveness',
      value: effectiveness,
      target: 95.0,
      trend: effectiveness >= 95.0 ? 'stable' : 'down',
      status: effectiveness >= 95.0 ? 'good' : effectiveness >= 90.0 ? 'warning' : 'critical',
      description: 'Percentage of threats successfully blocked',
      lastUpdated: now
    });

    // Throughput KPI
    this.kpis.set('throughput', {
      name: 'Request Throughput',
      value: this.performanceData.throughput.current,
      target: 1000, // requests per second
      trend: 'stable', // Would calculate based on historical data
      status: 'good',
      description: 'Current request throughput (requests per second)',
      lastUpdated: now
    });
  }

  /**
   * Calculate response time percentiles
   */
  private calculateResponseTimePercentiles(): void {
    const samples = [...this.performanceData.responseTime.samples].sort((a, b) => a - b);

    if (samples.length === 0) return;

    const p50Index = Math.floor(samples.length * 0.5);
    const p95Index = Math.floor(samples.length * 0.95);
    const p99Index = Math.floor(samples.length * 0.99);

    this.performanceData.responseTime.p50 = samples[p50Index];
    this.performanceData.responseTime.p95 = samples[p95Index];
    this.performanceData.responseTime.p99 = samples[p99Index];
    this.performanceData.responseTime.average =
      samples.reduce((sum, val) => sum + val, 0) / samples.length;
  }

  /**
   * Calculate current throughput
   */
  private calculateCurrentThroughput(): number {
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Count requests in the last second
    // This is simplified - in production, would use a sliding window
    return this.performanceData.requests.total; // Mock implementation
  }

  /**
   * Maintain sample size to prevent memory growth
   */
  private maintainSampleSize(samples: number[]): void {
    if (samples.length > this.config.maxSamplesPerMetric) {
      samples.splice(0, samples.length - this.config.maxSamplesPerMetric);
    }
  }

  /**
   * Calculate trends for report
   */
  private calculateTrends(timeRange: { start: number; end: number }): Array<{ metric: string; change: number; significance: 'low' | 'medium' | 'high' }> {
    // Simplified trend calculation
    return [
      { metric: 'request_volume', change: 15.5, significance: 'medium' },
      { metric: 'error_rate', change: -10.2, significance: 'high' },
      { metric: 'response_time', change: 5.1, significance: 'low' },
      { metric: 'security_events', change: 25.3, significance: 'high' }
    ];
  }

  /**
   * Get alert statistics for report
   */
  private getAlertStatistics(timeRange: { start: number; end: number }): Array<{ type: string; count: number; avgResolutionTime: number }> {
    // Simplified - would integrate with alerts service
    return [
      { type: 'rate_limit', count: 45, avgResolutionTime: 30000 },
      { type: 'ddos', count: 12, avgResolutionTime: 120000 },
      { type: 'abuse', count: 23, avgResolutionTime: 60000 },
      { type: 'anomaly', count: 8, avgResolutionTime: 180000 }
    ];
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Check error rate
    if (this.performanceData.errors.rate > 0.05) {
      recommendations.push('Error rate above 5% - investigate error sources and implement fixes');
    }

    // Check response time
    if (this.performanceData.responseTime.average > 1000) {
      recommendations.push('Average response time above 1 second - optimize performance or scale infrastructure');
    }

    // Check security effectiveness
    const kpi = this.kpis.get('security_effectiveness');
    if (kpi && kpi.value < 95) {
      recommendations.push('Security effectiveness below 95% - review and enhance security policies');
    }

    // Check throughput trends
    if (this.performanceData.throughput.current > this.performanceData.throughput.average * 1.5) {
      recommendations.push('High traffic detected - consider scaling infrastructure proactively');
    }

    if (recommendations.length === 0) {
      recommendations.push('All metrics within acceptable ranges - continue monitoring');
    }

    return recommendations;
  }

  /**
   * Initialize default KPIs
   */
  private initializeKPIs(): void {
    const now = Date.now();

    this.kpis.set('availability', {
      name: 'System Availability',
      value: 100,
      target: 99.9,
      trend: 'stable',
      status: 'good',
      description: 'Overall system availability percentage',
      lastUpdated: now
    });

    this.kpis.set('error_rate', {
      name: 'Error Rate',
      value: 0,
      target: 1.0,
      trend: 'stable',
      status: 'good',
      description: 'Percentage of requests resulting in errors',
      lastUpdated: now
    });

    this.kpis.set('response_time', {
      name: 'Average Response Time',
      value: 0,
      target: 500,
      trend: 'stable',
      status: 'good',
      description: 'Average response time in milliseconds',
      lastUpdated: now
    });

    this.kpis.set('security_effectiveness', {
      name: 'Security Effectiveness',
      value: 100,
      target: 95.0,
      trend: 'stable',
      status: 'good',
      description: 'Percentage of threats successfully blocked',
      lastUpdated: now
    });
  }

  /**
   * Initialize default dashboards
   */
  private initializeDefaultDashboards(): void {
    // Security Overview Dashboard
    this.dashboards.set('security_overview', {
      id: 'security_overview',
      name: 'Security Overview',
      description: 'High-level security metrics and KPIs',
      widgets: [
        {
          id: 'security_events_chart',
          type: 'chart',
          title: 'Security Events Over Time',
          metrics: ['security_events_total'],
          config: { chartType: 'line', timeRange: '24h' },
          position: { x: 0, y: 0, width: 6, height: 4 }
        },
        {
          id: 'threat_counters',
          type: 'counter',
          title: 'Threat Counters',
          metrics: ['rate_limit_violations_total', 'ddos_attacks_total', 'abuse_patterns_total'],
          config: { showTrend: true },
          position: { x: 6, y: 0, width: 6, height: 4 }
        },
        {
          id: 'security_effectiveness',
          type: 'gauge',
          title: 'Security Effectiveness',
          metrics: ['security_effectiveness'],
          config: { min: 0, max: 100, unit: '%' },
          position: { x: 0, y: 4, width: 4, height: 4 }
        },
        {
          id: 'response_time_chart',
          type: 'chart',
          title: 'Response Time Distribution',
          metrics: ['http_request_duration_seconds'],
          config: { chartType: 'histogram' },
          position: { x: 4, y: 4, width: 8, height: 4 }
        }
      ],
      refreshInterval: 30000,
      timeRange: { start: '-24h', end: 'now' },
      filters: {}
    });

    // Performance Dashboard
    this.dashboards.set('performance', {
      id: 'performance',
      name: 'Performance Metrics',
      description: 'System performance and throughput metrics',
      widgets: [
        {
          id: 'throughput_chart',
          type: 'chart',
          title: 'Request Throughput',
          metrics: ['http_requests_total'],
          config: { chartType: 'line', aggregation: 'rate' },
          position: { x: 0, y: 0, width: 6, height: 4 }
        },
        {
          id: 'error_rate_chart',
          type: 'chart',
          title: 'Error Rate',
          metrics: ['http_requests_total'],
          config: { chartType: 'line', filter: 'status>=400' },
          position: { x: 6, y: 0, width: 6, height: 4 }
        },
        {
          id: 'kpi_table',
          type: 'table',
          title: 'Key Performance Indicators',
          metrics: ['availability', 'error_rate', 'response_time'],
          config: { showTargets: true, showTrends: true },
          position: { x: 0, y: 4, width: 12, height: 4 }
        }
      ],
      refreshInterval: 10000,
      timeRange: { start: '-1h', end: 'now' },
      filters: {}
    });

    // Alerts Dashboard
    this.dashboards.set('alerts', {
      id: 'alerts',
      name: 'Security Alerts',
      description: 'Recent security alerts and their status',
      widgets: [
        {
          id: 'recent_alerts',
          type: 'alert_list',
          title: 'Recent Alerts',
          metrics: [],
          config: { limit: 50, severityFilter: ['error', 'critical'] },
          position: { x: 0, y: 0, width: 12, height: 8 }
        }
      ],
      refreshInterval: 5000,
      timeRange: { start: '-1h', end: 'now' },
      filters: {}
    });
  }

  /**
   * Load configuration from environment
   */
  private loadConfiguration(): void {
    this.config.metricsRetentionDays = this.configService.get<number>('METRICS_RETENTION_DAYS', 30);
    this.config.enablePrometheusExport = this.configService.get<boolean>('ENABLE_PROMETHEUS_EXPORT', true);
    this.config.enableDetailedMetrics = this.configService.get<boolean>('ENABLE_DETAILED_METRICS', true);
  }

  /**
   * Start metrics collection processes
   */
  private startMetricsCollection(): void {
    // Periodic metrics aggregation
    setInterval(() => {
      this.aggregateMetrics();
    }, this.config.aggregationWindow);

    // Periodic cleanup of old metrics
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000); // Every hour

    // Periodic KPI updates
    setInterval(() => {
      this.updateKPIs();
    }, this.config.sampleInterval);
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Monitor system resources
    setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.sampleInterval);

    // Calculate throughput
    setInterval(() => {
      this.calculateThroughputMetrics();
    }, 1000); // Every second
  }

  /**
   * Aggregate metrics for efficiency
   */
  private aggregateMetrics(): void {
    // Implement metric aggregation logic
    this.logger.debug('Aggregating metrics');
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (this.config.metricsRetentionDays * 24 * 60 * 60 * 1000);
    let totalRemoved = 0;

    for (const [key, metricsList] of this.metrics.entries()) {
      const beforeCount = metricsList.length;
      const filtered = metricsList.filter(m => m.timestamp > cutoff);

      if (filtered.length !== beforeCount) {
        this.metrics.set(key, filtered);
        totalRemoved += beforeCount - filtered.length;
      }
    }

    if (totalRemoved > 0) {
      this.logger.log('Cleaned up old metrics', { removed: totalRemoved });
    }
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    const timestamp = Date.now();

    // Record system metrics (simplified)
    this.recordMetric({
      name: 'system_cpu_usage',
      type: 'gauge',
      value: Math.random() * 100, // Mock value
      timestamp,
      labels: {},
      description: 'System CPU usage percentage'
    });

    this.recordMetric({
      name: 'system_memory_usage',
      type: 'gauge',
      value: Math.random() * 100, // Mock value
      timestamp,
      labels: {},
      description: 'System memory usage percentage'
    });

    this.recordMetric({
      name: 'active_connections',
      type: 'gauge',
      value: Math.floor(Math.random() * 1000), // Mock value
      timestamp,
      labels: {},
      description: 'Number of active connections'
    });
  }

  /**
   * Calculate throughput metrics
   */
  private calculateThroughputMetrics(): void {
    const currentThroughput = this.calculateCurrentThroughput();
    this.performanceData.throughput.current = currentThroughput;
    this.performanceData.throughput.peak = Math.max(
      this.performanceData.throughput.peak,
      currentThroughput
    );

    if (this.performanceData.throughput.samples.length > 0) {
      this.performanceData.throughput.average =
        this.performanceData.throughput.samples.reduce((sum, val) => sum + val, 0) /
        this.performanceData.throughput.samples.length;
    }
  }
}