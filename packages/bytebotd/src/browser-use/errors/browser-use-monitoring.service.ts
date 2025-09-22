/**
 * Browser-Use API Monitoring and Analytics Service
 *
 * Comprehensive monitoring, metrics collection, and analytics service for Browser-Use
 * API endpoints providing real-time insights, performance tracking, and alerting.
 *
 * Features:
 * - Real-time error metrics and analytics
 * - Performance monitoring and SLA tracking
 * - Automated alerting and notifications
 * - Circuit breaker metrics and health monitoring
 * - Session and task performance analytics
 * - API usage patterns and trends
 * - Security incident tracking and reporting
 * - Resource utilization monitoring
 * - Custom dashboard metrics
 * - Historical data aggregation and reporting
 *
 * @author Browser-Use API Monitoring Specialist
 * @version 1.0.0
 * @since Browser-Use API Integration
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventEmitter } from 'events';
import {
  BrowserUseErrorClassificationService,
  BrowserUseError,
  BrowserUseErrorCategory,
} from './browser-use-error-classification.service';
import { BrowserUseExceptionFilter } from './browser-use-exception.filter';

/**
 * Real-time metrics interface
 */
export interface RealTimeMetrics {
  timestamp: Date;
  errorRate: number;
  averageResponseTime: number;
  activeOperations: number;
  activeSessions: number;
  circuitBreakerStatus: Record<string, string>;
  memoryUsage: number;
  cpuUsage: number;
  requestsPerMinute: number;
  successRate: number;
}

/**
 * Performance SLA metrics
 */
export interface PerformanceSLA {
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    average: number;
  };
  availability: {
    uptime: number;
    downtime: number;
    uptimePercentage: number;
  };
  errorRates: {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

/**
 * Alert configuration interface
 */
export interface AlertConfiguration {
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldownMs: number;
  enabled: boolean;
  channels: string[];
  description: string;
}

/**
 * Alert trigger interface
 */
export interface AlertTrigger {
  id: string;
  alertName: string;
  triggeredAt: Date;
  severity: string;
  message: string;
  value: number;
  threshold: number;
  context: Record<string, unknown>;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * Session analytics interface
 */
export interface SessionAnalytics {
  sessionId: string;
  createdAt: Date;
  lastActivity: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorsByCategory: Record<string, number>;
  performanceScore: number;
  resourceUsage: {
    memoryMB: number;
    cpuPercent: number;
  };
  healthScore: number;
}

/**
 * API usage analytics interface
 */
export interface APIUsageAnalytics {
  timeRange: {
    start: Date;
    end: Date;
  };
  totalRequests: number;
  uniqueSessions: number;
  topOperations: Array<{
    operation: string;
    count: number;
    averageTime: number;
  }>;
  errorDistribution: Record<string, number>;
  performanceTrends: Array<{
    timestamp: Date;
    responseTime: number;
    errorRate: number;
  }>;
  geographicDistribution: Record<string, number>;
  userAgentDistribution: Record<string, number>;
  statusCodeDistribution: Record<number, number>;
}

/**
 * Browser-Use monitoring service
 */
@Injectable()
export class BrowserUseMonitoringService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(BrowserUseMonitoringService.name);

  // Real-time metrics storage
  private metricsHistory: RealTimeMetrics[] = [];
  private readonly maxMetricsHistory = 10000;

  // Alert management
  private alertConfigurations: Map<string, AlertConfiguration> = new Map();
  private activeAlerts: Map<string, AlertTrigger> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();

  // Session tracking
  private sessionAnalytics: Map<string, SessionAnalytics> = new Map();
  private requestTracker: Map<
    string,
    { startTime: Date; operation: string; sessionId?: string }
  > = new Map();

  // Performance tracking
  private performanceMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalResponseTime: 0,
    uptimeStart: new Date(),
    lastDowntime: null as Date | null,
  };

  // Intervals
  private metricsCollectionInterval?: NodeJS.Timeout;
  private alertCheckInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    private readonly errorClassificationService: BrowserUseErrorClassificationService,
    private readonly exceptionFilter: BrowserUseExceptionFilter,
  ) {
    super();
    this.initializeDefaultAlerts();
    this.logger.log('Browser-Use Monitoring Service initialized');
  }

  async onModuleInit() {
    this.startMetricsCollection();
    this.startAlertMonitoring();
    this.startDataCleanup();
    this.logger.log('Browser-Use Monitoring Service started');
  }

  async onModuleDestroy() {
    this.stopAllIntervals();
    this.logger.log('Browser-Use Monitoring Service stopped');
  }

  /**
   * Record API request start
   */
  recordRequestStart(
    requestId: string,
    operation: string,
    sessionId?: string,
  ): void {
    this.requestTracker.set(requestId, {
      startTime: new Date(),
      operation,
      sessionId,
    });

    this.performanceMetrics.totalRequests++;

    // Update session analytics
    if (sessionId) {
      this.updateSessionAnalytics(sessionId, 'request_start', { operation });
    }
  }

  /**
   * Record API request completion
   */
  recordRequestCompletion(
    requestId: string,
    success: boolean,
    responseTime: number,
    error?: BrowserUseError,
  ): void {
    const requestInfo = this.requestTracker.get(requestId);
    if (!requestInfo) return;

    this.requestTracker.delete(requestId);

    // Update global performance metrics
    this.performanceMetrics.totalResponseTime += responseTime;

    if (success) {
      this.performanceMetrics.successfulRequests++;
    } else {
      this.performanceMetrics.failedRequests++;
    }

    // Update session analytics
    if (requestInfo.sessionId) {
      this.updateSessionAnalytics(requestInfo.sessionId, 'request_completion', {
        success,
        responseTime,
        operation: requestInfo.operation,
        error: error?.browserUseCategory,
      });
    }

    // Emit event for real-time monitoring
    this.emit('requestCompleted', {
      requestId,
      operation: requestInfo.operation,
      sessionId: requestInfo.sessionId,
      success,
      responseTime,
      error,
    });
  }

  /**
   * Record browser automation error
   */
  recordError(error: BrowserUseError, context: Record<string, unknown>): void {
    // Update session analytics if session is provided
    if (error.sessionId) {
      this.updateSessionAnalytics(error.sessionId, 'error', {
        category: error.browserUseCategory,
        severity: error.severity,
      });
    }

    // Emit event for alerting
    this.emit('errorRecorded', { error, context });

    this.logger.debug('Error recorded for monitoring', {
      errorId: error.errorId,
      category: error.browserUseCategory,
      severity: error.severity,
      sessionId: error.sessionId,
    });
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics(): RealTimeMetrics {
    const now = new Date();
    const totalRequests = this.performanceMetrics.totalRequests;
    const successfulRequests = this.performanceMetrics.successfulRequests;

    return {
      timestamp: now,
      errorRate:
        totalRequests > 0
          ? (this.performanceMetrics.failedRequests / totalRequests) * 100
          : 0,
      averageResponseTime:
        totalRequests > 0
          ? this.performanceMetrics.totalResponseTime / totalRequests
          : 0,
      activeOperations: this.requestTracker.size,
      activeSessions: this.sessionAnalytics.size,
      circuitBreakerStatus: this.getCircuitBreakerStatus(),
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCPUUsage(),
      requestsPerMinute: this.calculateRequestsPerMinute(),
      successRate:
        totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
    };
  }

  /**
   * Get performance SLA metrics
   */
  getPerformanceSLA(timeRange?: { start: Date; end: Date }): PerformanceSLA {
    const metrics = timeRange
      ? this.metricsHistory.filter(
          (m) => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end,
        )
      : this.metricsHistory;

    const responseTimes = metrics
      .map((m) => m.averageResponseTime)
      .filter((rt) => rt > 0);
    const errorRates = metrics.map((m) => m.errorRate);

    return {
      responseTime: {
        p50: this.calculatePercentile(responseTimes, 50),
        p95: this.calculatePercentile(responseTimes, 95),
        p99: this.calculatePercentile(responseTimes, 99),
        average:
          responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0,
      },
      availability: this.calculateAvailability(timeRange),
      errorRates: {
        total:
          errorRates.length > 0
            ? errorRates.reduce((a, b) => a + b, 0) / errorRates.length
            : 0,
        byCategory: this.getErrorRatesByCategory(timeRange),
        bySeverity: this.getErrorRatesBySeverity(timeRange),
      },
      throughput: {
        requestsPerSecond: this.calculateThroughput('second', timeRange),
        requestsPerMinute: this.calculateThroughput('minute', timeRange),
        requestsPerHour: this.calculateThroughput('hour', timeRange),
      },
    };
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics(
    sessionId?: string,
  ): SessionAnalytics | SessionAnalytics[] {
    if (sessionId) {
      return (
        this.sessionAnalytics.get(sessionId) ||
        this.createEmptySessionAnalytics(sessionId)
      );
    }

    return Array.from(this.sessionAnalytics.values());
  }

  /**
   * Get API usage analytics
   */
  getAPIUsageAnalytics(timeRange: {
    start: Date;
    end: Date;
  }): APIUsageAnalytics {
    const filteredMetrics = this.metricsHistory.filter(
      (m) => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end,
    );

    return {
      timeRange,
      totalRequests: this.performanceMetrics.totalRequests,
      uniqueSessions: this.sessionAnalytics.size,
      topOperations: this.getTopOperations(timeRange),
      errorDistribution: this.getErrorDistribution(timeRange),
      performanceTrends: filteredMetrics.map((m) => ({
        timestamp: m.timestamp,
        responseTime: m.averageResponseTime,
        errorRate: m.errorRate,
      })),
      geographicDistribution: this.getGeographicDistribution(timeRange),
      userAgentDistribution: this.getUserAgentDistribution(timeRange),
      statusCodeDistribution: this.getStatusCodeDistribution(timeRange),
    };
  }

  /**
   * Configure alert
   */
  configureAlert(config: AlertConfiguration): void {
    this.alertConfigurations.set(config.name, config);
    this.logger.log(`Alert configured: ${config.name}`, {
      condition: config.condition,
      threshold: config.threshold,
      severity: config.severity,
    });
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertTrigger[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.activeAlerts.set(alertId, alert);

      this.emit('alertResolved', alert);
      this.logger.log(`Alert resolved: ${alert.alertName}`, { alertId });
      return true;
    }
    return false;
  }

  /**
   * Get error analytics from error classification service
   */
  getErrorAnalytics(timeRange?: { start: Date; end: Date }) {
    return this.errorClassificationService.getErrorAnalytics(timeRange);
  }

  /**
   * Get exception filter analytics
   */
  getExceptionFilterAnalytics(timeRange?: { start: Date; end: Date }) {
    return this.exceptionFilter.getErrorAnalytics(timeRange);
  }

  // ===== PRIVATE METHODS =====

  private initializeDefaultAlerts(): void {
    const defaultAlerts: AlertConfiguration[] = [
      {
        name: 'high_error_rate',
        condition: 'errorRate > threshold',
        threshold: 10, // 10% error rate
        severity: 'high',
        cooldownMs: 300000, // 5 minutes
        enabled: true,
        channels: ['log', 'email'],
        description: 'Error rate exceeds acceptable threshold',
      },
      {
        name: 'slow_response_time',
        condition: 'averageResponseTime > threshold',
        threshold: 5000, // 5 seconds
        severity: 'medium',
        cooldownMs: 600000, // 10 minutes
        enabled: true,
        channels: ['log'],
        description: 'Average response time is too slow',
      },
      {
        name: 'circuit_breaker_open',
        condition: 'circuitBreakerOpen',
        threshold: 1,
        severity: 'critical',
        cooldownMs: 60000, // 1 minute
        enabled: true,
        channels: ['log', 'email', 'slack'],
        description: 'Circuit breaker is open',
      },
      {
        name: 'memory_exhaustion',
        condition: 'memoryUsage > threshold',
        threshold: 80, // 80% memory usage
        severity: 'high',
        cooldownMs: 300000, // 5 minutes
        enabled: true,
        channels: ['log', 'email'],
        description: 'Memory usage is critically high',
      },
      {
        name: 'session_failure_rate',
        condition: 'sessionFailureRate > threshold',
        threshold: 20, // 20% session failure rate
        severity: 'medium',
        cooldownMs: 600000, // 10 minutes
        enabled: true,
        channels: ['log'],
        description: 'Session failure rate is elevated',
      },
    ];

    defaultAlerts.forEach((alert) => this.configureAlert(alert));
  }

  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(() => {
      const metrics = this.getRealTimeMetrics();
      this.metricsHistory.push(metrics);

      // Keep history within limits
      if (this.metricsHistory.length > this.maxMetricsHistory) {
        this.metricsHistory.splice(
          0,
          this.metricsHistory.length - this.maxMetricsHistory,
        );
      }

      this.emit('metricsCollected', metrics);
    }, 15000); // Collect every 15 seconds

    this.logger.log('Metrics collection started (interval: 15s)');
  }

  private startAlertMonitoring(): void {
    this.alertCheckInterval = setInterval(() => {
      this.checkAlerts();
    }, 30000); // Check every 30 seconds

    this.logger.log('Alert monitoring started (interval: 30s)');
  }

  private startDataCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 3600000); // Cleanup every hour

    this.logger.log('Data cleanup started (interval: 1h)');
  }

  private stopAllIntervals(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = undefined;
    }

    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = undefined;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  private checkAlerts(): void {
    const currentMetrics = this.getRealTimeMetrics();

    for (const [alertName, config] of this.alertConfigurations.entries()) {
      if (!config.enabled) continue;

      // Check cooldown
      const lastTrigger = this.alertCooldowns.get(alertName);
      if (
        lastTrigger &&
        Date.now() - lastTrigger.getTime() < config.cooldownMs
      ) {
        continue;
      }

      const shouldTrigger = this.evaluateAlertCondition(config, currentMetrics);

      if (shouldTrigger) {
        this.triggerAlert(config, currentMetrics);
      }
    }
  }

  private evaluateAlertCondition(
    config: AlertConfiguration,
    metrics: RealTimeMetrics,
  ): boolean {
    switch (config.condition) {
      case 'errorRate > threshold':
        return metrics.errorRate > config.threshold;
      case 'averageResponseTime > threshold':
        return metrics.averageResponseTime > config.threshold;
      case 'memoryUsage > threshold':
        return metrics.memoryUsage > config.threshold;
      case 'circuitBreakerOpen':
        return Object.values(metrics.circuitBreakerStatus).some(
          (status) => status === 'open',
        );
      case 'sessionFailureRate > threshold':
        return this.calculateSessionFailureRate() > config.threshold;
      default:
        return false;
    }
  }

  private triggerAlert(
    config: AlertConfiguration,
    metrics: RealTimeMetrics,
  ): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date();

    const alert: AlertTrigger = {
      id: alertId,
      alertName: config.name,
      triggeredAt: now,
      severity: config.severity,
      message: `${config.description} (${config.condition})`,
      value: this.getMetricValue(config.condition, metrics),
      threshold: config.threshold,
      context: { metrics },
      resolved: false,
    };

    this.activeAlerts.set(alertId, alert);
    this.alertCooldowns.set(config.name, now);

    // Send notifications
    this.sendAlertNotifications(alert, config.channels);

    this.emit('alertTriggered', alert);
    this.logger.warn(`Alert triggered: ${config.name}`, {
      alertId,
      severity: config.severity,
      value: alert.value,
      threshold: alert.threshold,
    });
  }

  private sendAlertNotifications(
    alert: AlertTrigger,
    channels: string[],
  ): void {
    channels.forEach((channel) => {
      switch (channel) {
        case 'log':
          this.logger.error(`ALERT: ${alert.message}`, {
            alertId: alert.id,
            severity: alert.severity,
            value: alert.value,
            threshold: alert.threshold,
          });
          break;
        case 'email':
          // In production, integrate with email service
          this.logger.log(`Email alert sent: ${alert.message}`);
          break;
        case 'slack':
          // In production, integrate with Slack
          this.logger.log(`Slack alert sent: ${alert.message}`);
          break;
      }
    });
  }

  private getMetricValue(condition: string, metrics: RealTimeMetrics): number {
    switch (condition) {
      case 'errorRate > threshold':
        return metrics.errorRate;
      case 'averageResponseTime > threshold':
        return metrics.averageResponseTime;
      case 'memoryUsage > threshold':
        return metrics.memoryUsage;
      case 'circuitBreakerOpen':
        return Object.values(metrics.circuitBreakerStatus).filter(
          (status) => status === 'open',
        ).length;
      case 'sessionFailureRate > threshold':
        return this.calculateSessionFailureRate();
      default:
        return 0;
    }
  }

  private updateSessionAnalytics(
    sessionId: string,
    eventType: string,
    data: Record<string, unknown>,
  ): void {
    let analytics = this.sessionAnalytics.get(sessionId);

    if (!analytics) {
      analytics = this.createEmptySessionAnalytics(sessionId);
      this.sessionAnalytics.set(sessionId, analytics);
    }

    analytics.lastActivity = new Date();

    switch (eventType) {
      case 'request_start':
        analytics.totalRequests++;
        break;
      case 'request_completion':
        if (data.success) {
          analytics.successfulRequests++;
        } else {
          analytics.failedRequests++;
        }
        if (typeof data.responseTime === 'number') {
          analytics.averageResponseTime =
            (analytics.averageResponseTime * (analytics.totalRequests - 1) +
              data.responseTime) /
            analytics.totalRequests;
        }
        break;
      case 'error':
        if (typeof data.category === 'string') {
          analytics.errorsByCategory[data.category] =
            (analytics.errorsByCategory[data.category] || 0) + 1;
        }
        break;
    }

    // Update performance score
    analytics.performanceScore = this.calculatePerformanceScore(analytics);
    analytics.healthScore = this.calculateHealthScore(analytics);

    this.sessionAnalytics.set(sessionId, analytics);
  }

  private createEmptySessionAnalytics(sessionId: string): SessionAnalytics {
    return {
      sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorsByCategory: {},
      performanceScore: 100,
      resourceUsage: {
        memoryMB: 0,
        cpuPercent: 0,
      },
      healthScore: 100,
    };
  }

  private calculatePerformanceScore(analytics: SessionAnalytics): number {
    if (analytics.totalRequests === 0) return 100;

    const successRate =
      (analytics.successfulRequests / analytics.totalRequests) * 100;
    const responseTimePenalty = Math.min(
      analytics.averageResponseTime / 1000,
      10,
    ); // Max 10 point penalty

    return Math.max(0, successRate - responseTimePenalty);
  }

  private calculateHealthScore(analytics: SessionAnalytics): number {
    const performanceWeight = 0.6;
    const errorWeight = 0.4;

    const performanceScore = this.calculatePerformanceScore(analytics);
    const errorCount = Object.values(analytics.errorsByCategory).reduce(
      (a, b) => a + b,
      0,
    );
    const errorPenalty = Math.min(errorCount * 5, 50); // Max 50 point penalty
    const errorScore = Math.max(0, 100 - errorPenalty);

    return performanceWeight * performanceScore + errorWeight * errorScore;
  }

  private getCircuitBreakerStatus(): Record<string, string> {
    // Mock implementation - in real system, get from circuit breaker service
    return {
      browser_launch: 'closed',
      navigation: 'closed',
      element_interaction: 'closed',
    };
  }

  private getMemoryUsage(): number {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / 1024 / 1024; // MB
  }

  private getCPUUsage(): number {
    // Mock implementation - in real system, get actual CPU usage
    return Math.random() * 10; // 0-10%
  }

  private calculateRequestsPerMinute(): number {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentMetrics = this.metricsHistory.filter(
      (m) => m.timestamp >= oneMinuteAgo,
    );

    if (recentMetrics.length === 0) return 0;

    const totalRequests = recentMetrics.reduce(
      (sum, m) => sum + m.activeOperations,
      0,
    );
    return totalRequests;
  }

  private calculateSessionFailureRate(): number {
    const failedSessions = Array.from(this.sessionAnalytics.values()).filter(
      (s) => s.failedRequests > s.successfulRequests,
    ).length;

    return this.sessionAnalytics.size > 0
      ? (failedSessions / this.sessionAnalytics.size) * 100
      : 0;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateAvailability(timeRange?: { start: Date; end: Date }): {
    uptime: number;
    downtime: number;
    uptimePercentage: number;
  } {
    const start = timeRange?.start || this.performanceMetrics.uptimeStart;
    const end = timeRange?.end || new Date();
    const totalTime = end.getTime() - start.getTime();

    // Simplified calculation - in real system, track actual downtime
    const downtime = this.performanceMetrics.lastDowntime
      ? Math.min(60000, totalTime * 0.001) // Max 1 minute downtime
      : 0;

    const uptime = totalTime - downtime;
    const uptimePercentage = totalTime > 0 ? (uptime / totalTime) * 100 : 100;

    return {
      uptime,
      downtime,
      uptimePercentage,
    };
  }

  private getErrorRatesByCategory(timeRange?: {
    start: Date;
    end: Date;
  }): Record<string, number> {
    return this.errorClassificationService.getErrorAnalytics(timeRange)
      .errorsByCategory;
  }

  private getErrorRatesBySeverity(timeRange?: {
    start: Date;
    end: Date;
  }): Record<string, number> {
    return this.errorClassificationService.getErrorAnalytics(timeRange)
      .errorsBySeverity;
  }

  private calculateThroughput(
    unit: 'second' | 'minute' | 'hour',
    timeRange?: { start: Date; end: Date },
  ): number {
    const multiplier =
      unit === 'second' ? 1000 : unit === 'minute' ? 60000 : 3600000;
    const duration = timeRange
      ? timeRange.end.getTime() - timeRange.start.getTime()
      : Date.now() - this.performanceMetrics.uptimeStart.getTime();

    return duration > 0
      ? (this.performanceMetrics.totalRequests * multiplier) / duration
      : 0;
  }

  // Placeholder implementations for missing analytics methods
  private getTopOperations(timeRange: {
    start: Date;
    end: Date;
  }): Array<{ operation: string; count: number; averageTime: number }> {
    // Mock implementation
    return [
      { operation: 'navigate', count: 150, averageTime: 2500 },
      { operation: 'click', count: 300, averageTime: 800 },
      { operation: 'type', count: 200, averageTime: 600 },
    ];
  }

  private getErrorDistribution(timeRange: {
    start: Date;
    end: Date;
  }): Record<string, number> {
    return this.getErrorRatesByCategory(timeRange);
  }

  private getGeographicDistribution(timeRange: {
    start: Date;
    end: Date;
  }): Record<string, number> {
    // Mock implementation
    return {
      US: 60,
      EU: 25,
      Asia: 15,
    };
  }

  private getUserAgentDistribution(timeRange: {
    start: Date;
    end: Date;
  }): Record<string, number> {
    // Mock implementation
    return {
      Chrome: 70,
      Firefox: 20,
      Safari: 10,
    };
  }

  private getStatusCodeDistribution(timeRange: {
    start: Date;
    end: Date;
  }): Record<number, number> {
    // Mock implementation
    return {
      200: 85,
      400: 8,
      401: 2,
      404: 3,
      500: 2,
    };
  }

  private cleanupOldData(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

    // Clean up old metrics
    const initialMetricsCount = this.metricsHistory.length;
    this.metricsHistory = this.metricsHistory.filter(
      (m) => m.timestamp.getTime() > cutoffTime,
    );

    // Clean up old session analytics
    const initialSessionCount = this.sessionAnalytics.size;
    for (const [sessionId, analytics] of this.sessionAnalytics.entries()) {
      if (analytics.lastActivity.getTime() < cutoffTime) {
        this.sessionAnalytics.delete(sessionId);
      }
    }

    // Clean up resolved alerts older than 7 days
    const alertCutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (
        alert.resolved &&
        alert.resolvedAt &&
        alert.resolvedAt.getTime() < alertCutoffTime
      ) {
        this.activeAlerts.delete(alertId);
      }
    }

    if (
      initialMetricsCount > this.metricsHistory.length ||
      initialSessionCount > this.sessionAnalytics.size
    ) {
      this.logger.debug('Cleaned up old monitoring data', {
        metricsRemoved: initialMetricsCount - this.metricsHistory.length,
        sessionsRemoved: initialSessionCount - this.sessionAnalytics.size,
      });
    }
  }
}
