/**
 * Parlant Real-Time Performance Dashboard Service
 *
 * Provides comprehensive real-time performance monitoring dashboard for tracking
 * sub-1000ms P95 response time optimization progress and system health.
 *
 * Features:
 * - Real-time P95 response time tracking with trend analysis
 * - Cache hit rate monitoring across L1/L2/L3 levels
 * - Batch processing efficiency visualization
 * - Throughput and concurrency metrics
 * - Performance target achievement tracking
 * - Automated alerting for performance degradation
 * - Historical performance trend analysis
 *
 * Dashboard Components:
 * 1. Live Performance Metrics (30-second updates)
 * 2. Historical Trend Analysis (1-hour rolling window)
 * 3. Performance Target Status (real-time)
 * 4. Optimization Recommendations (auto-generated)
 * 5. System Health Indicators (resource usage)
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

// ===== PERFORMANCE DASHBOARD INTERFACES =====

/**
 * Real-time dashboard metrics for performance monitoring
 */
interface PerformanceDashboardMetrics {
  timestamp: Date;
  responseTime: {
    current: number;
    p50: number;
    p95: number;                    // Primary target: <1000ms
    p99: number;
    trend: {
      direction: 'up' | 'down' | 'stable';
      magnitude: number;            // Percentage change
      timeframe: string;
    };
    targetStatus: 'achieved' | 'approaching' | 'missed';
  };
  cache: {
    l1: { hitRate: number; avgLatency: number; size: number };
    l2: { hitRate: number; avgLatency: number; connections: number };
    l3: { hitRate: number; avgLatency: number; entries: number };
    overall: {
      hitRate: number;              // Target: >85%
      avgLatency: number;
      efficiency: number;
    };
  };
  batching: {
    currentBatchSize: number;
    avgBatchSize: number;
    efficiency: number;             // Target: >90%
    queueDepth: number;
    processingRate: number;
    successRate: number;
  };
  throughput: {
    current: number;                // req/s
    peak: number;                   // Peak in last hour
    average: number;                // Average in last hour
    target: number;                 // Target: 25+ req/s
    concurrency: number;            // Concurrent validations
  };
  resources: {
    memory: { used: number; percentage: number; trend: string };
    cpu: { usage: number; trend: string };
    network: { latency: number; bandwidth: number };
    connections: { active: number; pooled: number; utilization: number };
  };
  alerts: DashboardAlert[];
  targets: PerformanceTargetStatus;
}

/**
 * Performance target tracking
 */
interface PerformanceTargetStatus {
  p95ResponseTime: {
    target: number;                 // 1000ms
    current: number;
    achieved: boolean;
    timeToTarget: number;           // Estimated time in minutes
    improvement: number;            // Percentage improvement needed
  };
  cacheHitRate: {
    target: number;                 // 85%
    current: number;
    achieved: boolean;
    improvement: number;
  };
  batchEfficiency: {
    target: number;                 // 90%
    current: number;
    achieved: boolean;
    improvement: number;
  };
  throughput: {
    target: number;                 // 25 req/s
    current: number;
    achieved: boolean;
    improvement: number;
  };
  overall: {
    score: number;                  // 0-100 performance score
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    targetsAchieved: number;        // Count of targets met
    totalTargets: number;
  };
}

/**
 * Dashboard alert for performance issues
 */
interface DashboardAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'performance' | 'cache' | 'batching' | 'resources' | 'targets';
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  thresholdValue: number;
  recommendation: string;
  timestamp: Date;
  acknowledged: boolean;
  autoResolvable: boolean;
}

/**
 * Performance optimization insight
 */
interface OptimizationInsight {
  category: 'cache' | 'batch' | 'connection' | 'circuit_breaker';
  priority: 'critical' | 'high' | 'medium' | 'low';
  insight: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  expectedGain: number;             // Percentage improvement
  implementationTime: string;
  autoApplicable: boolean;
}

// ===== PERFORMANCE DASHBOARD SERVICE =====

@Injectable()
export class ParlantRealTimePerformanceDashboardService {
  private readonly logger = new Logger(ParlantRealTimePerformanceDashboardService.name);

  // Dashboard state
  private currentMetrics: PerformanceDashboardMetrics;
  private activeAlerts: Map<string, DashboardAlert> = new Map();
  private optimizationInsights: OptimizationInsight[] = [];

  // Performance tracking
  private readonly performanceHistory: Array<{
    timestamp: Date;
    p95: number;
    hitRate: number;
    throughput: number;
    efficiency: number;
  }> = [];

  // Alert thresholds
  private readonly alertThresholds = {
    p95ResponseTime: { warning: 800, critical: 1200 },
    cacheHitRate: { warning: 0.80, critical: 0.70 },
    batchEfficiency: { warning: 0.85, critical: 0.75 },
    throughput: { warning: 20, critical: 15 },
    memoryUsage: { warning: 0.80, critical: 0.90 },
    cpuUsage: { warning: 0.75, critical: 0.85 }
  };

  // Dashboard configuration
  private readonly dashboardConfig = {
    updateInterval: 30000,          // 30 seconds
    historyRetention: 24 * 60 * 60 * 1000, // 24 hours
    alertRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
    trendAnalysisWindow: 60 * 60 * 1000     // 1 hour
  };

  constructor(private readonly eventEmitter: EventEmitter2) {
    this.initializeDashboard();
    this.startDashboardUpdates();

    this.logger.log('Parlant Performance Dashboard initialized with real-time monitoring', {
      updateInterval: this.dashboardConfig.updateInterval,
      p95Target: 1000,
      cacheTarget: 85,
      throughputTarget: 25,
      alerting: 'enabled'
    });
  }

  // ===== DASHBOARD INITIALIZATION =====

  private initializeDashboard(): void {
    this.currentMetrics = {
      timestamp: new Date(),
      responseTime: {
        current: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        trend: { direction: 'stable', magnitude: 0, timeframe: '5min' },
        targetStatus: 'missed'
      },
      cache: {
        l1: { hitRate: 0, avgLatency: 0, size: 0 },
        l2: { hitRate: 0, avgLatency: 0, connections: 0 },
        l3: { hitRate: 0, avgLatency: 0, entries: 0 },
        overall: { hitRate: 0, avgLatency: 0, efficiency: 0 }
      },
      batching: {
        currentBatchSize: 0,
        avgBatchSize: 0,
        efficiency: 0,
        queueDepth: 0,
        processingRate: 0,
        successRate: 0
      },
      throughput: {
        current: 0,
        peak: 0,
        average: 0,
        target: 25,
        concurrency: 0
      },
      resources: {
        memory: { used: 0, percentage: 0, trend: 'stable' },
        cpu: { usage: 0, trend: 'stable' },
        network: { latency: 0, bandwidth: 0 },
        connections: { active: 0, pooled: 0, utilization: 0 }
      },
      alerts: [],
      targets: this.initializeTargetStatus()
    };
  }

  private initializeTargetStatus(): PerformanceTargetStatus {
    return {
      p95ResponseTime: {
        target: 1000,
        current: 0,
        achieved: false,
        timeToTarget: Infinity,
        improvement: 0
      },
      cacheHitRate: {
        target: 0.85,
        current: 0,
        achieved: false,
        improvement: 0
      },
      batchEfficiency: {
        target: 0.90,
        current: 0,
        achieved: false,
        improvement: 0
      },
      throughput: {
        target: 25,
        current: 0,
        achieved: false,
        improvement: 0
      },
      overall: {
        score: 0,
        grade: 'F',
        targetsAchieved: 0,
        totalTargets: 4
      }
    };
  }

  // ===== REAL-TIME METRIC UPDATES =====

  @OnEvent('performance.metrics.updated')
  private handlePerformanceUpdate(metrics: any): void {
    this.updateDashboardMetrics(metrics);
    this.updateHistoricalData();
    this.analyzePerformanceTrends();
    this.checkAlertConditions();
    this.generateOptimizationInsights();
    this.emitDashboardUpdate();
  }

  private updateDashboardMetrics(optimizerMetrics: any): void {
    const now = new Date();

    // Update response time metrics
    this.currentMetrics.responseTime.current = optimizerMetrics.responseTime?.current ?? 0;
    this.currentMetrics.responseTime.p50 = optimizerMetrics.responseTime?.p50 ?? 0;
    this.currentMetrics.responseTime.p95 = optimizerMetrics.responseTime?.p95 ?? 0;
    this.currentMetrics.responseTime.p99 = optimizerMetrics.responseTime?.p99 ?? 0;

    // Update target status
    this.currentMetrics.responseTime.targetStatus =
      this.currentMetrics.responseTime.p95 < 1000 ? 'achieved' :
      this.currentMetrics.responseTime.p95 < 1200 ? 'approaching' : 'missed';

    // Update cache metrics
    this.currentMetrics.cache.overall.hitRate = optimizerMetrics.caching?.overallHitRate ?? 0;
    this.currentMetrics.cache.overall.avgLatency = optimizerMetrics.caching?.avgAccessTime ?? 0;

    // Update batching metrics
    this.currentMetrics.batching.efficiency = optimizerMetrics.batching?.efficiency ?? 0;
    this.currentMetrics.batching.avgBatchSize = optimizerMetrics.batching?.avgBatchSize ?? 0;
    this.currentMetrics.batching.queueDepth = optimizerMetrics.batching?.queueDepth ?? 0;

    // Update throughput metrics
    this.currentMetrics.throughput.current = optimizerMetrics.throughput?.requestsPerSecond ?? 0;
    this.currentMetrics.throughput.concurrency = optimizerMetrics.throughput?.concurrentValidations ?? 0;

    // Update resource metrics
    this.currentMetrics.resources.memory.used = optimizerMetrics.resources?.memoryUsageMB ?? 0;
    this.currentMetrics.resources.cpu.usage = optimizerMetrics.resources?.cpuUtilization ?? 0;
    this.currentMetrics.resources.connections.utilization = optimizerMetrics.resources?.connectionPoolUtilization ?? 0;

    // Update timestamp
    this.currentMetrics.timestamp = now;

    // Update performance targets
    this.updateTargetStatus();
  }

  private updateTargetStatus(): void {
    const targets = this.currentMetrics.targets;

    // P95 Response Time
    targets.p95ResponseTime.current = this.currentMetrics.responseTime.p95;
    targets.p95ResponseTime.achieved = targets.p95ResponseTime.current < targets.p95ResponseTime.target;
    targets.p95ResponseTime.improvement = targets.p95ResponseTime.achieved ? 0 :
      ((targets.p95ResponseTime.current - targets.p95ResponseTime.target) / targets.p95ResponseTime.target) * 100;

    // Cache Hit Rate
    targets.cacheHitRate.current = this.currentMetrics.cache.overall.hitRate;
    targets.cacheHitRate.achieved = targets.cacheHitRate.current >= targets.cacheHitRate.target;
    targets.cacheHitRate.improvement = targets.cacheHitRate.achieved ? 0 :
      ((targets.cacheHitRate.target - targets.cacheHitRate.current) / targets.cacheHitRate.target) * 100;

    // Batch Efficiency
    targets.batchEfficiency.current = this.currentMetrics.batching.efficiency;
    targets.batchEfficiency.achieved = targets.batchEfficiency.current >= targets.batchEfficiency.target;
    targets.batchEfficiency.improvement = targets.batchEfficiency.achieved ? 0 :
      ((targets.batchEfficiency.target - targets.batchEfficiency.current) / targets.batchEfficiency.target) * 100;

    // Throughput
    targets.throughput.current = this.currentMetrics.throughput.current;
    targets.throughput.achieved = targets.throughput.current >= targets.throughput.target;
    targets.throughput.improvement = targets.throughput.achieved ? 0 :
      ((targets.throughput.target - targets.throughput.current) / targets.throughput.target) * 100;

    // Overall Score
    const achievedTargets = [
      targets.p95ResponseTime.achieved,
      targets.cacheHitRate.achieved,
      targets.batchEfficiency.achieved,
      targets.throughput.achieved
    ].filter(Boolean).length;

    targets.overall.targetsAchieved = achievedTargets;
    targets.overall.score = (achievedTargets / targets.overall.totalTargets) * 100;
    targets.overall.grade = this.calculatePerformanceGrade(targets.overall.score);

    // Estimate time to target for P95
    if (!targets.p95ResponseTime.achieved) {
      targets.p95ResponseTime.timeToTarget = this.estimateTimeToTarget();
    }
  }

  private calculatePerformanceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private estimateTimeToTarget(): number {
    if (this.performanceHistory.length < 10) return Infinity;

    // Analyze recent improvement rate
    const recent = this.performanceHistory.slice(-10);
    const improvementRate = this.calculateImprovementRate(recent);

    if (improvementRate <= 0) return Infinity;

    const currentP95 = this.currentMetrics.responseTime.p95;
    const target = 1000;
    const improvementNeeded = currentP95 - target;

    return Math.ceil(improvementNeeded / improvementRate); // Minutes
  }

  private calculateImprovementRate(dataPoints: any[]): number {
    if (dataPoints.length < 2) return 0;

    const first = dataPoints[0];
    const last = dataPoints[dataPoints.length - 1];
    const timeSpan = (last.timestamp.getTime() - first.timestamp.getTime()) / (1000 * 60); // Minutes

    return (first.p95 - last.p95) / timeSpan; // Improvement per minute
  }

  // ===== HISTORICAL DATA MANAGEMENT =====

  private updateHistoricalData(): void {
    const dataPoint = {
      timestamp: new Date(),
      p95: this.currentMetrics.responseTime.p95,
      hitRate: this.currentMetrics.cache.overall.hitRate,
      throughput: this.currentMetrics.throughput.current,
      efficiency: this.currentMetrics.batching.efficiency
    };

    this.performanceHistory.push(dataPoint);

    // Maintain rolling window
    const cutoff = Date.now() - this.dashboardConfig.historyRetention;
    while (this.performanceHistory.length > 0 &&
           this.performanceHistory[0].timestamp.getTime() < cutoff) {
      this.performanceHistory.shift();
    }
  }

  // ===== ALERT MANAGEMENT =====

  private checkAlertConditions(): void {
    this.checkResponseTimeAlerts();
    this.checkCacheAlerts();
    this.checkThroughputAlerts();
    this.checkResourceAlerts();
    this.checkTargetAlerts();

    // Update alerts in current metrics
    this.currentMetrics.alerts = Array.from(this.activeAlerts.values());
  }

  private checkResponseTimeAlerts(): void {
    const p95 = this.currentMetrics.responseTime.p95;
    const thresholds = this.alertThresholds.p95ResponseTime;

    if (p95 > thresholds.critical) {
      this.createAlert('response-time-critical', 'critical', 'performance',
        'Critical P95 Response Time',
        `P95 response time ${p95.toFixed(1)}ms exceeds critical threshold`,
        'p95_response_time', p95, thresholds.critical,
        'Immediate optimization required: reduce batch sizes, increase cache TTL'
      );
    } else if (p95 > thresholds.warning) {
      this.createAlert('response-time-warning', 'high', 'performance',
        'High P95 Response Time',
        `P95 response time ${p95.toFixed(1)}ms approaching target`,
        'p95_response_time', p95, thresholds.warning,
        'Consider cache optimization and batch tuning'
      );
    } else {
      this.resolveAlert('response-time-critical');
      this.resolveAlert('response-time-warning');
    }
  }

  private checkCacheAlerts(): void {
    const hitRate = this.currentMetrics.cache.overall.hitRate;
    const thresholds = this.alertThresholds.cacheHitRate;

    if (hitRate < thresholds.critical) {
      this.createAlert('cache-critical', 'critical', 'cache',
        'Critical Cache Hit Rate',
        `Cache hit rate ${(hitRate * 100).toFixed(1)}% below critical threshold`,
        'cache_hit_rate', hitRate, thresholds.critical,
        'Increase cache sizes and TTL values immediately'
      );
    } else if (hitRate < thresholds.warning) {
      this.createAlert('cache-warning', 'medium', 'cache',
        'Low Cache Hit Rate',
        `Cache hit rate ${(hitRate * 100).toFixed(1)}% below target`,
        'cache_hit_rate', hitRate, thresholds.warning,
        'Review cache sizing and warming strategies'
      );
    } else {
      this.resolveAlert('cache-critical');
      this.resolveAlert('cache-warning');
    }
  }

  private checkThroughputAlerts(): void {
    const throughput = this.currentMetrics.throughput.current;
    const thresholds = this.alertThresholds.throughput;

    if (throughput < thresholds.critical) {
      this.createAlert('throughput-critical', 'critical', 'performance',
        'Critical Throughput Drop',
        `Throughput ${throughput.toFixed(1)} req/s below critical level`,
        'throughput', throughput, thresholds.critical,
        'Scale up worker pool and optimize batch processing'
      );
    } else if (throughput < thresholds.warning) {
      this.createAlert('throughput-warning', 'medium', 'performance',
        'Low Throughput',
        `Throughput ${throughput.toFixed(1)} req/s below target`,
        'throughput', throughput, thresholds.warning,
        'Consider worker pool scaling'
      );
    } else {
      this.resolveAlert('throughput-critical');
      this.resolveAlert('throughput-warning');
    }
  }

  private checkResourceAlerts(): void {
    const memoryUsage = this.currentMetrics.resources.memory.percentage;
    const cpuUsage = this.currentMetrics.resources.cpu.usage;

    // Memory alerts
    if (memoryUsage > this.alertThresholds.memoryUsage.critical) {
      this.createAlert('memory-critical', 'critical', 'resources',
        'Critical Memory Usage',
        `Memory usage ${(memoryUsage * 100).toFixed(1)}% exceeds critical threshold`,
        'memory_usage', memoryUsage, this.alertThresholds.memoryUsage.critical,
        'Reduce cache sizes and clean up memory leaks'
      );
    }

    // CPU alerts
    if (cpuUsage > this.alertThresholds.cpuUsage.critical) {
      this.createAlert('cpu-critical', 'critical', 'resources',
        'Critical CPU Usage',
        `CPU usage ${(cpuUsage * 100).toFixed(1)}% exceeds critical threshold`,
        'cpu_usage', cpuUsage, this.alertThresholds.cpuUsage.critical,
        'Scale horizontally or optimize algorithms'
      );
    }
  }

  private checkTargetAlerts(): void {
    const targets = this.currentMetrics.targets;
    const score = targets.overall.score;

    if (score < 50) {
      this.createAlert('targets-critical', 'critical', 'targets',
        'Performance Targets Not Met',
        `Only ${targets.overall.targetsAchieved}/${targets.overall.totalTargets} targets achieved`,
        'performance_score', score, 75,
        'Immediate comprehensive optimization required'
      );
    } else if (score < 75) {
      this.createAlert('targets-warning', 'medium', 'targets',
        'Performance Below Target',
        `Performance score ${score.toFixed(1)}% needs improvement`,
        'performance_score', score, 85,
        'Focus on primary bottlenecks for improvement'
      );
    } else {
      this.resolveAlert('targets-critical');
      this.resolveAlert('targets-warning');
    }
  }

  private createAlert(id: string, severity: DashboardAlert['severity'],
                     category: DashboardAlert['category'], title: string,
                     description: string, metric: string, currentValue: number,
                     thresholdValue: number, recommendation: string): void {
    const alert: DashboardAlert = {
      id,
      severity,
      category,
      title,
      description,
      metric,
      currentValue,
      thresholdValue,
      recommendation,
      timestamp: new Date(),
      acknowledged: false,
      autoResolvable: false
    };

    this.activeAlerts.set(id, alert);

    // Emit alert event
    this.eventEmitter.emit('dashboard.alert.created', alert);

    this.logger.warn(`Performance Alert: ${title}`, {
      severity,
      category,
      metric,
      currentValue,
      thresholdValue,
      recommendation
    });
  }

  private resolveAlert(id: string): void {
    if (this.activeAlerts.has(id)) {
      const alert = this.activeAlerts.get(id)!;
      this.activeAlerts.delete(id);
      this.eventEmitter.emit('dashboard.alert.resolved', alert);
    }
  }

  // ===== TREND ANALYSIS =====

  private analyzePerformanceTrends(): void {
    this.currentMetrics.responseTime.trend = this.calculateResponseTimeTrend();
    this.currentMetrics.resources.memory.trend = this.calculateResourceTrend('memory');
    this.currentMetrics.resources.cpu.trend = this.calculateResourceTrend('cpu');
  }

  private calculateResponseTimeTrend(): { direction: 'up' | 'down' | 'stable'; magnitude: number; timeframe: string } {
    if (this.performanceHistory.length < 5) {
      return { direction: 'stable', magnitude: 0, timeframe: '5min' };
    }

    const recent = this.performanceHistory.slice(-5);
    const older = this.performanceHistory.slice(-10, -5);

    if (older.length === 0) {
      return { direction: 'stable', magnitude: 0, timeframe: '5min' };
    }

    const recentAvg = recent.reduce((sum, p) => sum + p.p95, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.p95, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (Math.abs(change) < 5) {
      return { direction: 'stable', magnitude: Math.abs(change), timeframe: '5min' };
    }

    return {
      direction: change > 0 ? 'up' : 'down',
      magnitude: Math.abs(change),
      timeframe: '5min'
    };
  }

  private calculateResourceTrend(resource: 'memory' | 'cpu'): string {
    // Simplified trend calculation
    return 'stable';
  }

  // ===== OPTIMIZATION INSIGHTS =====

  private generateOptimizationInsights(): void {
    this.optimizationInsights = [];

    // P95 Response Time Insights
    if (this.currentMetrics.responseTime.p95 > 1000) {
      this.optimizationInsights.push({
        category: 'cache',
        priority: 'critical',
        insight: 'P95 response time exceeds 1000ms target',
        impact: 'Direct impact on user experience and system efficiency',
        effort: 'medium',
        expectedGain: 30,
        implementationTime: '2-4 hours',
        autoApplicable: true
      });
    }

    // Cache Hit Rate Insights
    if (this.currentMetrics.cache.overall.hitRate < 0.85) {
      this.optimizationInsights.push({
        category: 'cache',
        priority: 'high',
        insight: 'Cache hit rate below 85% target reduces performance',
        impact: 'Increased latency and resource usage',
        effort: 'low',
        expectedGain: 20,
        implementationTime: '1-2 hours',
        autoApplicable: true
      });
    }

    // Batch Efficiency Insights
    if (this.currentMetrics.batching.efficiency < 0.90) {
      this.optimizationInsights.push({
        category: 'batch',
        priority: 'medium',
        insight: 'Batch processing efficiency below optimal level',
        impact: 'Reduced throughput and resource efficiency',
        effort: 'medium',
        expectedGain: 15,
        implementationTime: '3-6 hours',
        autoApplicable: false
      });
    }
  }

  // ===== DASHBOARD UPDATES =====

  @Cron(CronExpression.EVERY_30_SECONDS)
  private updateDashboard(): void {
    this.emitDashboardUpdate();
  }

  private emitDashboardUpdate(): void {
    this.eventEmitter.emit('dashboard.metrics.updated', {
      metrics: this.currentMetrics,
      insights: this.optimizationInsights
    });
  }

  private startDashboardUpdates(): void {
    this.logger.log('Performance dashboard updates started', {
      updateInterval: this.dashboardConfig.updateInterval,
      historyRetention: this.dashboardConfig.historyRetention,
      alerting: 'enabled'
    });
  }

  // ===== PUBLIC API =====

  /**
   * Get current dashboard metrics
   */
  getCurrentMetrics(): PerformanceDashboardMetrics {
    return { ...this.currentMetrics };
  }

  /**
   * Get performance target status
   */
  getTargetStatus(): PerformanceTargetStatus {
    return { ...this.currentMetrics.targets };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): DashboardAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get optimization insights
   */
  getOptimizationInsights(): OptimizationInsight[] {
    return [...this.optimizationInsights];
  }

  /**
   * Get historical performance data
   */
  getHistoricalData(timeframe: '5min' | '15min' | '1hour' | '6hours' | '24hours' = '1hour'): any[] {
    const now = Date.now();
    const timeframes = {
      '5min': 5 * 60 * 1000,
      '15min': 15 * 60 * 1000,
      '1hour': 60 * 60 * 1000,
      '6hours': 6 * 60 * 60 * 1000,
      '24hours': 24 * 60 * 60 * 1000
    };

    const cutoff = now - timeframes[timeframe];
    return this.performanceHistory.filter(point => point.timestamp.getTime() > cutoff);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.eventEmitter.emit('dashboard.alert.acknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Get performance summary for external monitoring
   */
  getPerformanceSummary(): {
    status: 'excellent' | 'good' | 'needs_attention' | 'critical';
    score: number;
    targetsAchieved: number;
    criticalAlerts: number;
    keyMetrics: {
      p95ResponseTime: number;
      cacheHitRate: number;
      throughput: number;
      batchEfficiency: number;
    };
  } {
    const targets = this.currentMetrics.targets;
    const criticalAlerts = Array.from(this.activeAlerts.values())
      .filter(alert => alert.severity === 'critical').length;

    let status: 'excellent' | 'good' | 'needs_attention' | 'critical';
    if (criticalAlerts > 0) status = 'critical';
    else if (targets.overall.score >= 90) status = 'excellent';
    else if (targets.overall.score >= 75) status = 'good';
    else status = 'needs_attention';

    return {
      status,
      score: targets.overall.score,
      targetsAchieved: targets.overall.targetsAchieved,
      criticalAlerts,
      keyMetrics: {
        p95ResponseTime: this.currentMetrics.responseTime.p95,
        cacheHitRate: this.currentMetrics.cache.overall.hitRate,
        throughput: this.currentMetrics.throughput.current,
        batchEfficiency: this.currentMetrics.batching.efficiency
      }
    };
  }
}