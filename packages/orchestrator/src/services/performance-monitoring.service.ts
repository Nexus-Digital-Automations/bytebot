/**
 * Performance Monitoring Service
 * 
 * Advanced performance monitoring and analytics for orchestration services
 * with real-time metrics, alerting, and optimization recommendations.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface PerformanceMetrics {
  timestamp: Date;
  metrics: {
    responseTime: {
      avg: number;
      p50: number;
      p95: number;
      p99: number;
      max: number;
    };
    throughput: {
      requestsPerSecond: number;
      tasksPerMinute: number;
      successRate: number;
    };
    resources: {
      cpuUsage: number;
      memoryUsage: number;
      diskUsage: number;
      networkIO: number;
    };
    errors: {
      totalErrors: number;
      errorRate: number;
      errorsByType: Record<string, number>;
    };
    cache: {
      hitRate: number;
      missRate: number;
      evictionRate: number;
      avgResponseTime: number;
    };
  };
  targets: {
    p95ResponseTime: { target: number; actual: number; met: boolean };
    throughput: { target: number; actual: number; met: boolean };
    errorRate: { target: number; actual: number; met: boolean };
    availability: { target: number; actual: number; met: boolean };
  };
}

export interface PerformanceAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  threshold: number;
  currentValue: number;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

@Injectable()
export class PerformanceMonitoringService {
  private readonly logger = new Logger(PerformanceMonitoringService.name);
  private readonly metricsHistory: PerformanceMetrics[] = [];
  private readonly activeAlerts: Map<string, PerformanceAlert> = new Map();
  private metricsTimer: NodeJS.Timeout | null = null;

  onModuleInit() {
    this.startMetricsCollection();
  }

  onModuleDestroy() {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }
  }

  async recordMetric(metricName: string, value: number, tags?: Record<string, string>): Promise<void> {
    // Record individual metric point
    this.logger.debug(`Recording metric: ${metricName} = ${value}`, tags);
    
    // Would integrate with metrics backend (Prometheus, DataDog, etc.)
  }

  async getDetailedMetrics(
    hours: number = 1,
    granularity: 'minute' | 'hour' | 'day' = 'minute',
    includeBreakdown: boolean = false
  ): Promise<{ period: { start: Date; end: Date }; granularity: string; dataPoints: number; summary: unknown; timeSeries: unknown[]; targets: unknown; alerts: PerformanceAlert[]; breakdown?: unknown }> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));

    // Filter metrics within time range
    const relevantMetrics = this.metricsHistory.filter(m => 
      m.timestamp >= startTime && m.timestamp <= endTime
    );

    if (relevantMetrics.length === 0) {
      return this.getEmptyMetricsResponse(startTime, endTime, granularity);
    }

    // Aggregate metrics based on granularity
    const aggregatedMetrics = this.aggregateMetrics(relevantMetrics, granularity);

    const response = {
      period: { start: startTime, end: endTime },
      granularity,
      dataPoints: aggregatedMetrics.length,
      summary: this.calculateSummaryStats(relevantMetrics),
      timeSeries: aggregatedMetrics,
      targets: this.evaluateTargetCompliance(relevantMetrics),
      alerts: this.getActiveAlerts()
    };

    if (includeBreakdown) {
      (response as typeof response & { breakdown: unknown }).breakdown = this.generateMetricsBreakdown(relevantMetrics);
    }

    return response;
  }

  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.collectCurrentMetrics();
    }, 60000); // Collect every minute

    this.logger.log('Performance metrics collection started');
  }

  private collectCurrentMetrics(): void {
    // Mock implementation - would collect actual system metrics
    const currentMetrics: PerformanceMetrics = {
      timestamp: new Date(),
      metrics: {
        responseTime: {
          avg: 250 + (Math.random() * 100),
          p50: 200 + (Math.random() * 50),
          p95: 400 + (Math.random() * 200),
          p99: 800 + (Math.random() * 400),
          max: 1500 + (Math.random() * 500)
        },
        throughput: {
          requestsPerSecond: 100 + (Math.random() * 50),
          tasksPerMinute: 500 + (Math.random() * 200),
          successRate: 0.95 + (Math.random() * 0.04)
        },
        resources: {
          cpuUsage: 30 + (Math.random() * 40),
          memoryUsage: 512 + (Math.random() * 256),
          diskUsage: 1024 + (Math.random() * 512),
          networkIO: 10 + (Math.random() * 20)
        },
        errors: {
          totalErrors: Math.floor(Math.random() * 10),
          errorRate: Math.random() * 0.05,
          errorsByType: {
            'timeout': Math.floor(Math.random() * 3),
            'validation': Math.floor(Math.random() * 2),
            'service_unavailable': Math.floor(Math.random() * 2)
          }
        },
        cache: {
          hitRate: 0.8 + (Math.random() * 0.15),
          missRate: 0.05 + (Math.random() * 0.1),
          evictionRate: Math.random() * 0.05,
          avgResponseTime: 5 + (Math.random() * 10)
        }
      },
      targets: {
        p95ResponseTime: { 
          target: 500, 
          actual: 400 + (Math.random() * 200),
          met: false // Will be calculated
        },
        throughput: { 
          target: 1000, 
          actual: 500 + (Math.random() * 200),
          met: false // Will be calculated
        },
        errorRate: { 
          target: 0.01, 
          actual: Math.random() * 0.05,
          met: false // Will be calculated
        },
        availability: { 
          target: 0.9999, 
          actual: 0.995 + (Math.random() * 0.004),
          met: false // Will be calculated
        }
      }
    };

    // Calculate target compliance
    currentMetrics.targets.p95ResponseTime.met = 
      currentMetrics.targets.p95ResponseTime.actual <= currentMetrics.targets.p95ResponseTime.target;
    currentMetrics.targets.throughput.met = 
      currentMetrics.targets.throughput.actual >= currentMetrics.targets.throughput.target;
    currentMetrics.targets.errorRate.met = 
      currentMetrics.targets.errorRate.actual <= currentMetrics.targets.errorRate.target;
    currentMetrics.targets.availability.met = 
      currentMetrics.targets.availability.actual >= currentMetrics.targets.availability.target;

    // Store metrics
    this.metricsHistory.push(currentMetrics);

    // Keep only last 24 hours of data
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    while (this.metricsHistory.length > 0 && this.metricsHistory[0].timestamp < cutoffTime) {
      this.metricsHistory.shift();
    }

    // Check for alerts
    this.checkPerformanceThresholds(currentMetrics);
  }

  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    const checks = [
      {
        id: 'p95_response_time',
        metric: 'P95 Response Time',
        threshold: 500,
        current: metrics.metrics.responseTime.p95,
        severity: 'high' as const
      },
      {
        id: 'error_rate',
        metric: 'Error Rate',
        threshold: 0.05,
        current: metrics.metrics.errors.errorRate,
        severity: 'medium' as const
      },
      {
        id: 'cpu_usage',
        metric: 'CPU Usage',
        threshold: 80,
        current: metrics.metrics.resources.cpuUsage,
        severity: 'medium' as const
      },
      {
        id: 'memory_usage',
        metric: 'Memory Usage',
        threshold: 1024,
        current: metrics.metrics.resources.memoryUsage,
        severity: 'high' as const
      }
    ];

    for (const check of checks) {
      const isViolation = check.current > check.threshold;
      const existingAlert = this.activeAlerts.get(check.id);

      if (isViolation && !existingAlert) {
        // Create new alert
        const alert: PerformanceAlert = {
          id: check.id,
          severity: check.severity,
          metric: check.metric,
          threshold: check.threshold,
          currentValue: check.current,
          message: `${check.metric} (${check.current.toFixed(2)}) exceeds threshold (${check.threshold})`,
          timestamp: new Date(),
          resolved: false
        };

        this.activeAlerts.set(check.id, alert);
        this.logger.warn(`Performance alert: ${alert.message}`);
        
      } else if (!isViolation && existingAlert && !existingAlert.resolved) {
        // Resolve existing alert
        existingAlert.resolved = true;
        this.logger.log(`Performance alert resolved: ${existingAlert.message}`);
      }
    }
  }

  private aggregateMetrics(
    metrics: PerformanceMetrics[],
    granularity: 'minute' | 'hour' | 'day'
  ): Array<{ timestamp: string; responseTime: { avg: number; p95: number; p99: number }; throughput: { avg: number; successRate: number }; errorRate: number; cacheHitRate: number }> {
    // Group metrics by time buckets based on granularity
    const buckets = new Map<string, PerformanceMetrics[]>();
    
    for (const metric of metrics) {
      const bucketKey = this.getBucketKey(metric.timestamp, granularity);
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(metric);
    }

    // Aggregate each bucket
    const aggregated = [];
    for (const [bucketKey, bucketMetrics] of buckets) {
      aggregated.push({
        timestamp: bucketKey,
        responseTime: {
          avg: this.average(bucketMetrics.map(m => m.metrics.responseTime.avg)),
          p95: this.percentile(bucketMetrics.map(m => m.metrics.responseTime.p95), 95),
          p99: this.percentile(bucketMetrics.map(m => m.metrics.responseTime.p99), 99)
        },
        throughput: {
          avg: this.average(bucketMetrics.map(m => m.metrics.throughput.requestsPerSecond)),
          successRate: this.average(bucketMetrics.map(m => m.metrics.throughput.successRate))
        },
        errorRate: this.average(bucketMetrics.map(m => m.metrics.errors.errorRate)),
        cacheHitRate: this.average(bucketMetrics.map(m => m.metrics.cache.hitRate))
      });
    }

    return aggregated.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  private getBucketKey(timestamp: Date, granularity: 'minute' | 'hour' | 'day'): string {
    switch (granularity) {
      case 'minute':
        return timestamp.toISOString().substring(0, 16); // YYYY-MM-DDTHH:mm
      case 'hour':
        return timestamp.toISOString().substring(0, 13); // YYYY-MM-DDTHH
      case 'day':
        return timestamp.toISOString().substring(0, 10); // YYYY-MM-DD
      default:
        return timestamp.toISOString();
    }
  }

  private calculateSummaryStats(metrics: PerformanceMetrics[]): { responseTime: { min: number; max: number; avg: number }; throughput: { min: number; max: number; avg: number }; errorRate: { min: number; max: number; avg: number }; totalDataPoints: number } | null {
    if (metrics.length === 0) return null;

    const responseTimes = metrics.map(m => m.metrics.responseTime.avg);
    const throughputs = metrics.map(m => m.metrics.throughput.requestsPerSecond);
    const errorRates = metrics.map(m => m.metrics.errors.errorRate);

    return {
      responseTime: {
        min: Math.min(...responseTimes),
        max: Math.max(...responseTimes),
        avg: this.average(responseTimes)
      },
      throughput: {
        min: Math.min(...throughputs),
        max: Math.max(...throughputs),
        avg: this.average(throughputs)
      },
      errorRate: {
        min: Math.min(...errorRates),
        max: Math.max(...errorRates),
        avg: this.average(errorRates)
      },
      totalDataPoints: metrics.length
    };
  }

  private evaluateTargetCompliance(metrics: PerformanceMetrics[]): { p95ResponseTime: { complianceRate: number; target: number; status: string }; throughput: { complianceRate: number; target: number; status: string }; errorRate: { complianceRate: number; target: number; status: string }; availability: { complianceRate: number; target: number; status: string } } | null {
    if (metrics.length === 0) return null;

    const p95Compliance = metrics.filter(m => m.targets.p95ResponseTime.met).length / metrics.length;
    const throughputCompliance = metrics.filter(m => m.targets.throughput.met).length / metrics.length;
    const errorRateCompliance = metrics.filter(m => m.targets.errorRate.met).length / metrics.length;
    const availabilityCompliance = metrics.filter(m => m.targets.availability.met).length / metrics.length;

    return {
      p95ResponseTime: {
        complianceRate: p95Compliance,
        target: 500,
        status: p95Compliance >= 0.95 ? 'meeting' : 'not_meeting'
      },
      throughput: {
        complianceRate: throughputCompliance,
        target: 1000,
        status: throughputCompliance >= 0.95 ? 'meeting' : 'not_meeting'
      },
      errorRate: {
        complianceRate: errorRateCompliance,
        target: 0.01,
        status: errorRateCompliance >= 0.95 ? 'meeting' : 'not_meeting'
      },
      availability: {
        complianceRate: availabilityCompliance,
        target: 0.9999,
        status: availabilityCompliance >= 0.95 ? 'meeting' : 'not_meeting'
      }
    };
  }

  private generateMetricsBreakdown(metrics: PerformanceMetrics[]): { byHour: unknown[]; errorBreakdown: Record<string, number>; resourceTrends: unknown; cachePerformance: unknown } {
    // Generate detailed breakdown by different dimensions
    return {
      byHour: this.aggregateMetrics(metrics, 'hour'),
      errorBreakdown: this.aggregateErrorsByType(metrics),
      resourceTrends: this.aggregateResourceUsage(metrics),
      cachePerformance: this.aggregateCacheMetrics(metrics)
    };
  }

  private aggregateErrorsByType(metrics: PerformanceMetrics[]): Record<string, number> {
    const errorTypes = new Map<string, number>();
    
    for (const metric of metrics) {
      for (const [type, count] of Object.entries(metric.metrics.errors.errorsByType)) {
        errorTypes.set(type, (errorTypes.get(type) || 0) + count);
      }
    }

    return Object.fromEntries(errorTypes);
  }

  private aggregateResourceUsage(metrics: PerformanceMetrics[]): { cpu: { min: number; max: number; avg: number }; memory: { min: number; max: number; avg: number } } {
    return {
      cpu: {
        min: Math.min(...metrics.map(m => m.metrics.resources.cpuUsage)),
        max: Math.max(...metrics.map(m => m.metrics.resources.cpuUsage)),
        avg: this.average(metrics.map(m => m.metrics.resources.cpuUsage))
      },
      memory: {
        min: Math.min(...metrics.map(m => m.metrics.resources.memoryUsage)),
        max: Math.max(...metrics.map(m => m.metrics.resources.memoryUsage)),
        avg: this.average(metrics.map(m => m.metrics.resources.memoryUsage))
      }
    };
  }

  private aggregateCacheMetrics(metrics: PerformanceMetrics[]): { avgHitRate: number; avgMissRate: number; avgResponseTime: number } {
    return {
      avgHitRate: this.average(metrics.map(m => m.metrics.cache.hitRate)),
      avgMissRate: this.average(metrics.map(m => m.metrics.cache.missRate)),
      avgResponseTime: this.average(metrics.map(m => m.metrics.cache.avgResponseTime))
    };
  }

  private getEmptyMetricsResponse(startTime: Date, endTime: Date, granularity: string): { period: { start: Date; end: Date }; granularity: string; dataPoints: number; summary: null; timeSeries: unknown[]; targets: null; alerts: PerformanceAlert[]; message: string } {
    return {
      period: { start: startTime, end: endTime },
      granularity,
      dataPoints: 0,
      summary: null,
      timeSeries: [],
      targets: null,
      alerts: this.getActiveAlerts(),
      message: 'No metrics data available for the specified time period'
    };
  }

  private getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private percentile(numbers: number[], p: number): number {
    if (numbers.length === 0) return 0;
    const sorted = numbers.sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // Public API methods
  
  async createAlert(alert: Omit<PerformanceAlert, 'timestamp' | 'resolved'>): Promise<string> {
    const fullAlert: PerformanceAlert = {
      ...alert,
      timestamp: new Date(),
      resolved: false
    };

    this.activeAlerts.set(alert.id, fullAlert);
    this.logger.warn(`Manual alert created: ${alert.message}`);
    
    return alert.id;
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.logger.log(`Alert resolved: ${alertId}`);
      return true;
    }
    return false;
  }

  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metricsHistory.length > 0 ? 
      this.metricsHistory[this.metricsHistory.length - 1] : null;
  }

  getMetricsStats(): { totalDataPoints: number; activeAlerts: number; timeRange: { oldest: Date; newest: Date } | null; collectionStatus: string } {
    return {
      totalDataPoints: this.metricsHistory.length,
      activeAlerts: this.getActiveAlerts().length,
      timeRange: this.metricsHistory.length > 0 ? {
        oldest: this.metricsHistory[0].timestamp,
        newest: this.metricsHistory[this.metricsHistory.length - 1].timestamp
      } : null,
      collectionStatus: this.metricsTimer ? 'active' : 'stopped'
    };
  }
}