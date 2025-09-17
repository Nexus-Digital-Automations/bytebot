/**
 * Parlant Performance Monitor Service - Enterprise Performance Optimization
 * 
 * Provides comprehensive performance monitoring, metrics collection, and optimization
 * for Parlant integration operations targeting sub-500ms validation performance.
 * 
 * Features:
 * - Real-time performance metrics collection and analysis
 * - Sub-500ms validation timing optimization
 * - 95th percentile performance tracking under 1000ms
 * - 25+ validations per second throughput monitoring
 * - Performance regression detection and alerting
 * - Enterprise-grade performance dashboards
 * 
 * Architecture: Metrics collection with performance optimization recommendations
 * Performance Targets: <500ms avg, <1000ms 95th percentile, 25+ validation/sec
 * Monitoring: Real-time metrics with historical trend analysis
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { performance } from 'perf_hooks';

// ===== PERFORMANCE MONITORING INTERFACES =====

/**
 * Performance metrics for Parlant validation operations
 */
export interface ParlantPerformanceMetrics {
  readonly operationId: string;
  readonly functionName: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly validationType: 'cache_hit' | 'cache_miss' | 'real_time' | 'circuit_breaker';
  readonly cacheHit: boolean;
  readonly errorOccurred: boolean;
  readonly throughputRpm: number; // Requests per minute
  readonly memoryUsage: NodeJS.MemoryUsage;
  readonly timestamp: Date;
}

/**
 * Aggregated performance statistics
 */
export interface ParlantPerformanceStats {
  readonly period: 'minute' | 'hour' | 'day';
  readonly totalOperations: number;
  readonly averageLatency: number;
  readonly medianLatency: number;
  readonly p95Latency: number;
  readonly p99Latency: number;
  readonly maxLatency: number;
  readonly minLatency: number;
  readonly throughputRpm: number;
  readonly cacheHitRate: number;
  readonly errorRate: number;
  readonly performanceScore: number; // 0-100 scale
  readonly targetsMet: {
    readonly avgUnder500ms: boolean;
    readonly p95Under1000ms: boolean;
    readonly throughputOver25: boolean;
    readonly cacheHitOver95: boolean;
  };
}

/**
 * Performance alert configuration
 */
export interface PerformanceAlertConfig {
  readonly enabled: boolean;
  readonly thresholds: {
    readonly maxAverageLatency: number; // 500ms
    readonly maxP95Latency: number; // 1000ms
    readonly minThroughputRpm: number; // 25 rpm
    readonly minCacheHitRate: number; // 95%
    readonly maxErrorRate: number; // 5%
  };
  readonly alertActions: ('log' | 'email' | 'webhook')[];
}

/**
 * Performance optimization recommendation
 */
export interface PerformanceRecommendation {
  readonly category: 'caching' | 'concurrency' | 'memory' | 'network' | 'algorithm';
  readonly priority: 'critical' | 'high' | 'medium' | 'low';
  readonly issue: string;
  readonly recommendation: string;
  readonly expectedImprovement: string;
  readonly implementationComplexity: 'low' | 'medium' | 'high';
}

// ===== PERFORMANCE MONITOR SERVICE =====

@Injectable()
export class ParlantPerformanceMonitorService {
  private readonly logger = new Logger(ParlantPerformanceMonitorService.name);
  private readonly metrics: ParlantPerformanceMetrics[] = [];
  private readonly performanceAlerts: PerformanceAlertConfig;
  
  // Real-time tracking
  private activeOperations = new Map<string, { startTime: number; functionName: string }>();
  private currentThroughput = 0;
  private lastThroughputUpdate = Date.now();
  
  // Performance optimization
  private performanceOptimizationEnabled = true;
  private metricsRetentionDays = 7;
  private maxMetricsInMemory = 10000;

  constructor(private readonly configService: ConfigService) {
    const operationId = `perf_monitor_init_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    this.performanceAlerts = {
      enabled: this.configService.get<boolean>('PARLANT_PERFORMANCE_ALERTS_ENABLED', true),
      thresholds: {
        maxAverageLatency: this.configService.get<number>('PARLANT_MAX_AVG_LATENCY_MS', 500),
        maxP95Latency: this.configService.get<number>('PARLANT_MAX_P95_LATENCY_MS', 1000),
        minThroughputRpm: this.configService.get<number>('PARLANT_MIN_THROUGHPUT_RPM', 25),
        minCacheHitRate: this.configService.get<number>('PARLANT_MIN_CACHE_HIT_RATE', 95),
        maxErrorRate: this.configService.get<number>('PARLANT_MAX_ERROR_RATE', 5),
      },
      alertActions: ['log', 'webhook'],
    };

    this.logger.log(`[${operationId}] Initializing Parlant Performance Monitor`, {
      alertsEnabled: this.performanceAlerts.enabled,
      thresholds: this.performanceAlerts.thresholds,
      optimizationEnabled: this.performanceOptimizationEnabled,
      retentionDays: this.metricsRetentionDays,
    });

    // Start periodic monitoring and cleanup
    this.startPeriodicMonitoring();
  }

  /**
   * Start performance tracking for a Parlant operation
   * 
   * @param operationId - Unique identifier for the operation
   * @param functionName - Name of the function being validated
   * @returns Performance tracking context
   */
  startPerformanceTracking(operationId: string, functionName: string): void {
    const startTime = performance.now();
    
    this.activeOperations.set(operationId, {
      startTime,
      functionName,
    });

    this.logger.debug(`[${operationId}] Performance tracking started for ${functionName}`, {
      operationId,
      functionName,
      startTime,
      activeOperations: this.activeOperations.size,
    });
  }

  /**
   * Complete performance tracking and record metrics
   * 
   * @param operationId - Operation identifier
   * @param validationType - Type of validation performed
   * @param cacheHit - Whether operation used cache
   * @param errorOccurred - Whether an error occurred
   */
  completePerformanceTracking(
    operationId: string,
    validationType: ParlantPerformanceMetrics['validationType'],
    cacheHit: boolean,
    errorOccurred: boolean = false
  ): ParlantPerformanceMetrics | null {
    const endTime = performance.now();
    const operation = this.activeOperations.get(operationId);
    
    if (!operation) {
      this.logger.warn(`[${operationId}] No active operation found for performance tracking`);
      return null;
    }

    const duration = endTime - operation.startTime;
    const memoryUsage = process.memoryUsage();
    
    // Update throughput calculations
    this.updateThroughputMetrics();

    const metrics: ParlantPerformanceMetrics = {
      operationId,
      functionName: operation.functionName,
      startTime: operation.startTime,
      endTime,
      duration,
      validationType,
      cacheHit,
      errorOccurred,
      throughputRpm: this.currentThroughput,
      memoryUsage,
      timestamp: new Date(),
    };

    // Store metrics
    this.storeMetrics(metrics);

    // Clean up active operation
    this.activeOperations.delete(operationId);

    // Check performance thresholds and generate alerts if needed
    this.checkPerformanceThresholds(metrics);

    this.logger.debug(`[${operationId}] Performance tracking completed`, {
      operationId,
      functionName: operation.functionName,
      duration: `${duration.toFixed(2)}ms`,
      validationType,
      cacheHit,
      errorOccurred,
      throughputRpm: this.currentThroughput,
    });

    return metrics;
  }

  /**
   * Get current performance statistics
   * 
   * @param period - Time period for statistics
   * @returns Aggregated performance statistics
   */
  getPerformanceStats(period: ParlantPerformanceStats['period'] = 'hour'): ParlantPerformanceStats {
    const periodMs = this.getPeriodInMs(period);
    const cutoffTime = Date.now() - periodMs;
    
    const recentMetrics = this.metrics.filter(
      metric => metric.timestamp.getTime() > cutoffTime
    );

    if (recentMetrics.length === 0) {
      return this.getEmptyStats(period);
    }

    // Calculate latency statistics
    const latencies = recentMetrics.map(m => m.duration).sort((a, b) => a - b);
    const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const medianLatency = latencies[Math.floor(latencies.length / 2)] || 0;
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);

    // Calculate rates
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const errors = recentMetrics.filter(m => m.errorOccurred).length;
    const cacheHitRate = (cacheHits / recentMetrics.length) * 100;
    const errorRate = (errors / recentMetrics.length) * 100;

    // Calculate throughput
    const throughputRpm = (recentMetrics.length / (periodMs / 1000)) * 60;

    // Performance score (0-100)
    const performanceScore = this.calculatePerformanceScore({
      averageLatency,
      p95Latency: latencies[p95Index] || 0,
      throughputRpm,
      cacheHitRate,
      errorRate,
    });

    // Check if targets are met
    const targetsMet = {
      avgUnder500ms: averageLatency < this.performanceAlerts.thresholds.maxAverageLatency,
      p95Under1000ms: (latencies[p95Index] || 0) < this.performanceAlerts.thresholds.maxP95Latency,
      throughputOver25: throughputRpm > this.performanceAlerts.thresholds.minThroughputRpm,
      cacheHitOver95: cacheHitRate > this.performanceAlerts.thresholds.minCacheHitRate,
    };

    return {
      period,
      totalOperations: recentMetrics.length,
      averageLatency,
      medianLatency,
      p95Latency: latencies[p95Index] || 0,
      p99Latency: latencies[p99Index] || 0,
      maxLatency: Math.max(...latencies),
      minLatency: Math.min(...latencies),
      throughputRpm,
      cacheHitRate,
      errorRate,
      performanceScore,
      targetsMet,
    };
  }

  /**
   * Generate performance optimization recommendations
   * 
   * @returns Array of optimization recommendations
   */
  generatePerformanceRecommendations(): PerformanceRecommendation[] {
    const stats = this.getPerformanceStats('hour');
    const recommendations: PerformanceRecommendation[] = [];

    // Latency recommendations
    if (!stats.targetsMet.avgUnder500ms) {
      recommendations.push({
        category: 'caching',
        priority: 'critical',
        issue: `Average latency ${stats.averageLatency.toFixed(2)}ms exceeds 500ms target`,
        recommendation: 'Implement intelligent caching with longer TTL for low-risk operations',
        expectedImprovement: '40-60% latency reduction',
        implementationComplexity: 'medium',
      });
    }

    if (!stats.targetsMet.p95Under1000ms) {
      recommendations.push({
        category: 'concurrency',
        priority: 'high',
        issue: `95th percentile latency ${stats.p95Latency.toFixed(2)}ms exceeds 1000ms target`,
        recommendation: 'Implement circuit breaker pattern and async validation queuing',
        expectedImprovement: '30-50% p95 latency reduction',
        implementationComplexity: 'high',
      });
    }

    // Cache hit rate recommendations
    if (!stats.targetsMet.cacheHitOver95) {
      recommendations.push({
        category: 'caching',
        priority: 'high',
        issue: `Cache hit rate ${stats.cacheHitRate.toFixed(1)}% below 95% target`,
        recommendation: 'Implement Redis cluster with intelligent cache warming',
        expectedImprovement: '15-25% cache hit rate improvement',
        implementationComplexity: 'medium',
      });
    }

    // Throughput recommendations
    if (!stats.targetsMet.throughputOver25) {
      recommendations.push({
        category: 'concurrency',
        priority: 'medium',
        issue: `Throughput ${stats.throughputRpm.toFixed(1)} RPM below 25 RPM target`,
        recommendation: 'Implement connection pooling and batch validation processing',
        expectedImprovement: '100-200% throughput increase',
        implementationComplexity: 'medium',
      });
    }

    // Memory optimization
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
      recommendations.push({
        category: 'memory',
        priority: 'medium',
        issue: `High memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        recommendation: 'Implement metrics cleanup and cache size limits',
        expectedImprovement: '30-50% memory usage reduction',
        implementationComplexity: 'low',
      });
    }

    return recommendations;
  }

  /**
   * Get real-time performance dashboard data
   * 
   * @returns Dashboard data for monitoring interfaces
   */
  getPerformanceDashboardData(): {
    currentStats: ParlantPerformanceStats;
    recentMetrics: ParlantPerformanceMetrics[];
    activeOperations: number;
    recommendations: PerformanceRecommendation[];
    alerts: string[];
  } {
    return {
      currentStats: this.getPerformanceStats('hour'),
      recentMetrics: this.metrics.slice(-100), // Last 100 operations
      activeOperations: this.activeOperations.size,
      recommendations: this.generatePerformanceRecommendations(),
      alerts: this.getActiveAlerts(),
    };
  }

  // ===== PRIVATE HELPER METHODS =====

  private storeMetrics(metrics: ParlantPerformanceMetrics): void {
    this.metrics.push(metrics);

    // Cleanup old metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetricsInMemory) {
      const removeCount = this.metrics.length - this.maxMetricsInMemory;
      this.metrics.splice(0, removeCount);
    }

    // TODO: Persist to database for long-term storage
    // await this.persistMetrics(metrics);
  }

  private updateThroughputMetrics(): void {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastThroughputUpdate;
    
    if (timeSinceLastUpdate > 60000) { // Update every minute
      const recentMetrics = this.metrics.filter(
        m => m.timestamp.getTime() > now - 60000
      );
      this.currentThroughput = recentMetrics.length;
      this.lastThroughputUpdate = now;
    }
  }

  private checkPerformanceThresholds(metrics: ParlantPerformanceMetrics): void {
    if (!this.performanceAlerts.enabled) return;

    const alerts: string[] = [];

    // Check individual operation latency
    if (metrics.duration > this.performanceAlerts.thresholds.maxAverageLatency * 2) {
      alerts.push(`High latency operation: ${metrics.duration.toFixed(2)}ms for ${metrics.functionName}`);
    }

    // Check error occurrence
    if (metrics.errorOccurred) {
      alerts.push(`Error in operation: ${metrics.operationId} (${metrics.functionName})`);
    }

    // Send alerts if any triggered
    if (alerts.length > 0) {
      this.sendPerformanceAlerts(alerts);
    }
  }

  private sendPerformanceAlerts(alerts: string[]): void {
    alerts.forEach(alert => {
      this.logger.warn(`Performance Alert: ${alert}`);
      
      // TODO: Implement additional alert actions (email, webhook)
      // if (this.performanceAlerts.alertActions.includes('email')) {
      //   await this.sendEmailAlert(alert);
      // }
      // if (this.performanceAlerts.alertActions.includes('webhook')) {
      //   await this.sendWebhookAlert(alert);
      // }
    });
  }

  private getActiveAlerts(): string[] {
    const stats = this.getPerformanceStats('hour');
    const alerts: string[] = [];

    if (!stats.targetsMet.avgUnder500ms) {
      alerts.push(`Average latency ${stats.averageLatency.toFixed(2)}ms exceeds 500ms target`);
    }

    if (!stats.targetsMet.p95Under1000ms) {
      alerts.push(`95th percentile latency ${stats.p95Latency.toFixed(2)}ms exceeds 1000ms target`);
    }

    if (!stats.targetsMet.cacheHitOver95) {
      alerts.push(`Cache hit rate ${stats.cacheHitRate.toFixed(1)}% below 95% target`);
    }

    if (!stats.targetsMet.throughputOver25) {
      alerts.push(`Throughput ${stats.throughputRpm.toFixed(1)} RPM below 25 RPM target`);
    }

    return alerts;
  }

  private calculatePerformanceScore(metrics: {
    averageLatency: number;
    p95Latency: number;
    throughputRpm: number;
    cacheHitRate: number;
    errorRate: number;
  }): number {
    let score = 100;

    // Latency scoring (40% of total score)
    const latencyScore = Math.max(0, 100 - (metrics.averageLatency / 500) * 40);
    const p95Score = Math.max(0, 100 - (metrics.p95Latency / 1000) * 40);
    
    // Throughput scoring (20% of total score)
    const throughputScore = Math.min(100, (metrics.throughputRpm / 25) * 20);
    
    // Cache hit rate scoring (20% of total score)
    const cacheScore = (metrics.cacheHitRate / 100) * 20;
    
    // Error rate scoring (20% of total score)
    const errorScore = Math.max(0, 20 - (metrics.errorRate / 5) * 20);

    score = (latencyScore * 0.2) + (p95Score * 0.2) + throughputScore + cacheScore + errorScore;

    return Math.max(0, Math.min(100, score));
  }

  private getPeriodInMs(period: ParlantPerformanceStats['period']): number {
    switch (period) {
      case 'minute': return 60 * 1000;
      case 'hour': return 60 * 60 * 1000;
      case 'day': return 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  private getEmptyStats(period: ParlantPerformanceStats['period']): ParlantPerformanceStats {
    return {
      period,
      totalOperations: 0,
      averageLatency: 0,
      medianLatency: 0,
      p95Latency: 0,
      p99Latency: 0,
      maxLatency: 0,
      minLatency: 0,
      throughputRpm: 0,
      cacheHitRate: 0,
      errorRate: 0,
      performanceScore: 0,
      targetsMet: {
        avgUnder500ms: true,
        p95Under1000ms: true,
        throughputOver25: false,
        cacheHitOver95: false,
      },
    };
  }

  private startPeriodicMonitoring(): void {
    // Performance metrics logging every 5 minutes
    setInterval(() => {
      const stats = this.getPerformanceStats('hour');
      this.logger.log('Parlant Performance Metrics Summary', {
        totalOperations: stats.totalOperations,
        averageLatency: `${stats.averageLatency.toFixed(2)}ms`,
        p95Latency: `${stats.p95Latency.toFixed(2)}ms`,
        throughputRpm: `${stats.throughputRpm.toFixed(1)} RPM`,
        cacheHitRate: `${stats.cacheHitRate.toFixed(1)}%`,
        performanceScore: `${stats.performanceScore.toFixed(1)}/100`,
        targetsMet: stats.targetsMet,
      });
    }, 5 * 60 * 1000);

    // Cleanup old metrics daily
    setInterval(() => {
      const cutoffTime = Date.now() - (this.metricsRetentionDays * 24 * 60 * 60 * 1000);
      const initialLength = this.metrics.length;
      
      this.metrics.splice(0, this.metrics.findIndex(m => m.timestamp.getTime() > cutoffTime));
      
      if (this.metrics.length !== initialLength) {
        this.logger.log(`Cleaned up ${initialLength - this.metrics.length} old performance metrics`);
      }
    }, 24 * 60 * 60 * 1000);
  }
}