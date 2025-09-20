/**
 * Browser Automation Monitoring Service
 *
 * Comprehensive monitoring integration with error tracking, metrics collection,
 * and alerting systems for browser automation performance monitoring.
 *
 * Features:
 * - Real-time error tracking and aggregation
 * - Performance metrics collection and analysis
 * - Alert management and notification systems
 * - Health check and uptime monitoring
 * - Custom metric dashboards and reporting
 * - Trend analysis and anomaly detection
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BrowserAutomationErrorCategory,
  BrowserAutomationErrorSeverity,
  BrowserAutomationErrorClassifier,
} from '../errors/browser-automation-error-classification';
import { RecoveryResult } from '../recovery/browser-automation-recovery-manager';
import { BrowserAutomationOperationType } from '../response/browser-automation-response-formatter';

export interface MonitoringEvent {
  type: 'error' | 'success' | 'warning' | 'info' | 'performance' | 'recovery';
  timestamp: Date;
  correlationId: string;
  operationType: BrowserAutomationOperationType;
  sessionId?: string;
  taskId?: string;
  data: Record<string, unknown>;
  tags: string[];
}

export interface ErrorMetrics {
  errorCode: string;
  category: BrowserAutomationErrorCategory;
  severity: BrowserAutomationErrorSeverity;
  count: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  averageDurationMs: number;
  recoverySuccessRate: number;
  affectedSessions: Set<string>;
  affectedTasks: Set<string>;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
}

export interface PerformanceMetrics {
  operationType: BrowserAutomationOperationType;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageDurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  throughputPerMinute: number;
  errorRate: number;
  memoryUsageMB: number;
  cpuUsagePercent: number;
  networkLatencyMs: number;
  cacheHitRatio: number;
}

export interface SystemHealthMetrics {
  browserProcesses: {
    active: number;
    crashed: number;
    memory: number;
    cpu: number;
  };
  sessions: {
    active: number;
    expired: number;
    total: number;
  };
  tasks: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  resources: {
    memoryUsagePercent: number;
    cpuUsagePercent: number;
    diskUsagePercent: number;
    networkUtilization: number;
  };
  uptime: number;
  lastHealthCheck: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    timeWindowMinutes: number;
  }[];
  actions: Array<{
    type: 'email' | 'webhook' | 'log' | 'sms';
    target: string;
    template?: string;
  }>;
  cooldownMinutes: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  lastTriggered?: Date;
}

/**
 * Browser Automation Monitoring Service
 */
@Injectable()
export class BrowserAutomationMonitoringService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(BrowserAutomationMonitoringService.name);
  private readonly eventBuffer: MonitoringEvent[] = [];
  private readonly errorMetrics = new Map<string, ErrorMetrics>();
  private readonly performanceMetrics = new Map<
    BrowserAutomationOperationType,
    PerformanceMetrics
  >();
  private readonly alertRules = new Map<string, AlertRule>();
  private readonly activeAlerts = new Map<
    string,
    { triggeredAt: Date; count: number }
  >();

  private metricsCollectionInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private alertProcessingInterval?: NodeJS.Timeout;

  private systemHealthMetrics: SystemHealthMetrics = {
    browserProcesses: { active: 0, crashed: 0, memory: 0, cpu: 0 },
    sessions: { active: 0, expired: 0, total: 0 },
    tasks: { pending: 0, running: 0, completed: 0, failed: 0 },
    resources: {
      memoryUsagePercent: 0,
      cpuUsagePercent: 0,
      diskUsagePercent: 0,
      networkUtilization: 0,
    },
    uptime: 0,
    lastHealthCheck: new Date(),
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultAlertRules();
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Browser Automation Monitoring Service');

    // Start metrics collection
    this.startMetricsCollection();

    // Start health checks
    this.startHealthChecks();

    // Start alert processing
    this.startAlertProcessing();

    // Set up event listeners
    this.setupEventListeners();

    this.logger.log('Browser Automation Monitoring Service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Browser Automation Monitoring Service');

    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.alertProcessingInterval) {
      clearInterval(this.alertProcessingInterval);
    }

    // Flush remaining events
    await this.flushEventBuffer();

    this.logger.log('Browser Automation Monitoring Service shutdown complete');
  }

  /**
   * Record an error event
   */
  recordError(
    error: Error,
    context: {
      correlationId: string;
      operationType: BrowserAutomationOperationType;
      sessionId?: string;
      taskId?: string;
      durationMs: number;
      recoveryAttempt?: RecoveryResult;
      additionalContext?: Record<string, unknown>;
    },
  ): void {
    const errorClassification = BrowserAutomationErrorClassifier.classifyError(
      error,
      context.additionalContext,
    );
    const monitoringTags = BrowserAutomationErrorClassifier.getMonitoringTags(
      errorClassification.code,
    );

    // Create monitoring event
    const event: MonitoringEvent = {
      type: 'error',
      timestamp: new Date(),
      correlationId: context.correlationId,
      operationType: context.operationType,
      sessionId: context.sessionId,
      taskId: context.taskId,
      data: {
        errorCode: errorClassification.code,
        errorMessage: error.message,
        errorCategory: errorClassification.category,
        errorSeverity: errorClassification.severity,
        durationMs: context.durationMs,
        stackTrace: error.stack,
        recoveryAttempted: !!context.recoveryAttempt,
        recoverySuccess: context.recoveryAttempt?.success,
        recoveryStrategy: context.recoveryAttempt?.strategy,
        ...context.additionalContext,
      },
      tags: ['error', ...monitoringTags],
    };

    this.addEvent(event);

    // Update error metrics
    this.updateErrorMetrics(
      errorClassification.code,
      errorClassification,
      context,
    );

    // Update performance metrics
    this.updatePerformanceMetrics(
      context.operationType,
      false,
      context.durationMs,
    );

    this.logger.error(
      `Browser automation error recorded: ${errorClassification.code}`,
      {
        correlationId: context.correlationId,
        errorCode: errorClassification.code,
        operationType: context.operationType,
      },
    );
  }

  /**
   * Record a successful operation
   */
  recordSuccess(context: {
    correlationId: string;
    operationType: BrowserAutomationOperationType;
    sessionId?: string;
    taskId?: string;
    durationMs: number;
    dataSize?: number;
    cacheHit?: boolean;
    additionalContext?: Record<string, unknown>;
  }): void {
    const event: MonitoringEvent = {
      type: 'success',
      timestamp: new Date(),
      correlationId: context.correlationId,
      operationType: context.operationType,
      sessionId: context.sessionId,
      taskId: context.taskId,
      data: {
        durationMs: context.durationMs,
        dataSize: context.dataSize,
        cacheHit: context.cacheHit,
        ...context.additionalContext,
      },
      tags: ['success', context.operationType.toLowerCase()],
    };

    this.addEvent(event);

    // Update performance metrics
    this.updatePerformanceMetrics(
      context.operationType,
      true,
      context.durationMs,
    );
  }

  /**
   * Record performance metrics
   */
  recordPerformanceMetrics(
    operationType: BrowserAutomationOperationType,
    metrics: {
      durationMs: number;
      memoryUsageMB?: number;
      cpuUsagePercent?: number;
      networkLatencyMs?: number;
      cacheHitRatio?: number;
      throughput?: number;
    },
  ): void {
    const event: MonitoringEvent = {
      type: 'performance',
      timestamp: new Date(),
      correlationId: `perf_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      operationType,
      data: metrics,
      tags: ['performance', operationType.toLowerCase()],
    };

    this.addEvent(event);
  }

  /**
   * Record recovery event
   */
  recordRecovery(
    recoveryResult: RecoveryResult,
    context: {
      correlationId: string;
      operationType: BrowserAutomationOperationType;
      sessionId?: string;
      taskId?: string;
      originalError: string;
    },
  ): void {
    const event: MonitoringEvent = {
      type: 'recovery',
      timestamp: new Date(),
      correlationId: context.correlationId,
      operationType: context.operationType,
      sessionId: context.sessionId,
      taskId: context.taskId,
      data: {
        recoveryStrategy: recoveryResult.strategy,
        recoverySuccess: recoveryResult.success,
        attemptNumber: recoveryResult.attemptNumber,
        durationMs: recoveryResult.durationMs,
        nextAction: recoveryResult.nextAction,
        originalError: context.originalError,
        ...recoveryResult.metadata,
      },
      tags: [
        'recovery',
        recoveryResult.strategy,
        recoveryResult.success ? 'success' : 'failure',
      ],
    };

    this.addEvent(event);
  }

  /**
   * Get current error metrics
   */
  getErrorMetrics(): Map<string, ErrorMetrics> {
    return new Map(this.errorMetrics);
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): Map<
    BrowserAutomationOperationType,
    PerformanceMetrics
  > {
    return new Map(this.performanceMetrics);
  }

  /**
   * Get system health metrics
   */
  getSystemHealthMetrics(): SystemHealthMetrics {
    return { ...this.systemHealthMetrics };
  }

  /**
   * Get error trends over time
   */
  getErrorTrends(timeWindowHours: number = 24): Array<{
    timestamp: Date;
    errorCode: string;
    count: number;
    severity: BrowserAutomationErrorSeverity;
  }> {
    const cutoffTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    return this.eventBuffer
      .filter(
        (event) => event.type === 'error' && event.timestamp >= cutoffTime,
      )
      .map((event) => ({
        timestamp: event.timestamp,
        errorCode: event.data.errorCode as string,
        count: 1,
        severity: event.data.errorSeverity as BrowserAutomationErrorSeverity,
      }));
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrends(
    operationType: BrowserAutomationOperationType,
    timeWindowHours: number = 24,
  ): Array<{
    timestamp: Date;
    durationMs: number;
    success: boolean;
  }> {
    const cutoffTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    return this.eventBuffer
      .filter(
        (event) =>
          (event.type === 'success' || event.type === 'error') &&
          event.operationType === operationType &&
          event.timestamp >= cutoffTime,
      )
      .map((event) => ({
        timestamp: event.timestamp,
        durationMs: event.data.durationMs as number,
        success: event.type === 'success',
      }));
  }

  /**
   * Create custom alert rule
   */
  createAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const ruleId = `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.alertRules.set(ruleId, {
      id: ruleId,
      ...rule,
    });

    this.logger.log(`Created alert rule: ${rule.name} (${ruleId})`);
    return ruleId;
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const existingRule = this.alertRules.get(ruleId);
    if (!existingRule) {
      return false;
    }

    this.alertRules.set(ruleId, {
      ...existingRule,
      ...updates,
    });

    this.logger.log(`Updated alert rule: ${ruleId}`);
    return true;
  }

  /**
   * Delete alert rule
   */
  deleteAlertRule(ruleId: string): boolean {
    const deleted = this.alertRules.delete(ruleId);
    if (deleted) {
      this.logger.log(`Deleted alert rule: ${ruleId}`);
    }
    return deleted;
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Array<{
    ruleId: string;
    ruleName: string;
    triggeredAt: Date;
    count: number;
    severity: string;
  }> {
    const activeAlerts: Array<{
      ruleId: string;
      ruleName: string;
      triggeredAt: Date;
      count: number;
      severity: string;
    }> = [];

    for (const [ruleId, alertInfo] of this.activeAlerts) {
      const rule = this.alertRules.get(ruleId);
      if (rule) {
        activeAlerts.push({
          ruleId,
          ruleName: rule.name,
          triggeredAt: alertInfo.triggeredAt,
          count: alertInfo.count,
          severity: rule.severity,
        });
      }
    }

    return activeAlerts;
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(format: 'prometheus' | 'json' | 'csv' = 'json'): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      errorMetrics: Object.fromEntries(this.errorMetrics),
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      systemHealth: this.systemHealthMetrics,
      activeAlerts: this.getActiveAlerts(),
    };

    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      case 'prometheus':
        return this.convertToPrometheusFormat(exportData);
      case 'csv':
        return this.convertToCsvFormat(exportData);
      default:
        return JSON.stringify(exportData, null, 2);
    }
  }

  /**
   * Private method implementations
   */

  private addEvent(event: MonitoringEvent): void {
    this.eventBuffer.push(event);

    // Emit event for real-time processing
    this.eventEmitter.emit('monitoring.event', event);

    // Keep buffer size manageable
    if (this.eventBuffer.length > 10000) {
      this.eventBuffer.splice(0, 5000); // Remove oldest 5000 events
    }
  }

  private updateErrorMetrics(
    errorCode: string,
    classification: any,
    context: any,
  ): void {
    let metrics = this.errorMetrics.get(errorCode);

    if (!metrics) {
      metrics = {
        errorCode,
        category: classification.category,
        severity: classification.severity,
        count: 0,
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        averageDurationMs: 0,
        recoverySuccessRate: 0,
        affectedSessions: new Set(),
        affectedTasks: new Set(),
        trendDirection: 'stable',
      };
      this.errorMetrics.set(errorCode, metrics);
    }

    metrics.count++;
    metrics.lastOccurrence = new Date();
    metrics.averageDurationMs =
      (metrics.averageDurationMs + context.durationMs) / 2;

    if (context.sessionId) {
      metrics.affectedSessions.add(context.sessionId);
    }

    if (context.taskId) {
      metrics.affectedTasks.add(context.taskId);
    }

    // Calculate recovery success rate
    if (context.recoveryAttempt) {
      const totalRecoveries = Array.from(this.eventBuffer).filter(
        (e) => e.type === 'recovery' && e.data.originalError === errorCode,
      ).length;
      const successfulRecoveries = Array.from(this.eventBuffer).filter(
        (e) =>
          e.type === 'recovery' &&
          e.data.originalError === errorCode &&
          e.data.recoverySuccess,
      ).length;

      metrics.recoverySuccessRate =
        totalRecoveries > 0 ? successfulRecoveries / totalRecoveries : 0;
    }
  }

  private updatePerformanceMetrics(
    operationType: BrowserAutomationOperationType,
    success: boolean,
    durationMs: number,
  ): void {
    let metrics = this.performanceMetrics.get(operationType);

    if (!metrics) {
      metrics = {
        operationType,
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        averageDurationMs: 0,
        p95DurationMs: 0,
        p99DurationMs: 0,
        throughputPerMinute: 0,
        errorRate: 0,
        memoryUsageMB: 0,
        cpuUsagePercent: 0,
        networkLatencyMs: 0,
        cacheHitRatio: 0,
      };
      this.performanceMetrics.set(operationType, metrics);
    }

    metrics.totalOperations++;
    if (success) {
      metrics.successfulOperations++;
    } else {
      metrics.failedOperations++;
    }

    metrics.averageDurationMs = (metrics.averageDurationMs + durationMs) / 2;
    metrics.errorRate = metrics.failedOperations / metrics.totalOperations;

    // Calculate percentiles (simplified)
    const recentDurations = this.eventBuffer
      .filter(
        (e) =>
          (e.type === 'success' || e.type === 'error') &&
          e.operationType === operationType &&
          e.timestamp > new Date(Date.now() - 3600000), // Last hour
      )
      .map((e) => e.data.durationMs as number)
      .sort((a, b) => a - b);

    if (recentDurations.length > 0) {
      metrics.p95DurationMs =
        recentDurations[Math.floor(recentDurations.length * 0.95)];
      metrics.p99DurationMs =
        recentDurations[Math.floor(recentDurations.length * 0.99)];
    }
  }

  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 60000); // Every minute
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  private startAlertProcessing(): void {
    this.alertProcessingInterval = setInterval(() => {
      this.processAlerts();
    }, 60000); // Every minute
  }

  private setupEventListeners(): void {
    this.eventEmitter.on('monitoring.event', (event: MonitoringEvent) => {
      // Additional real-time processing can be added here
      this.logger.debug(`Monitoring event: ${event.type}`, {
        correlationId: event.correlationId,
        operationType: event.operationType,
      });
    });
  }

  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length > 0) {
      this.logger.log(`Flushing ${this.eventBuffer.length} monitoring events`);
      // In a real implementation, this would persist events to a database or external system
      this.eventBuffer.length = 0;
    }
  }

  private collectSystemMetrics(): void {
    // Simulate system metrics collection
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.systemHealthMetrics.resources.memoryUsagePercent =
      (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    this.systemHealthMetrics.uptime = process.uptime();
    this.systemHealthMetrics.lastHealthCheck = new Date();

    // Emit performance metrics
    this.recordPerformanceMetrics(BrowserAutomationOperationType.SYSTEM_INFO, {
      durationMs: 0,
      memoryUsageMB: memoryUsage.heapUsed / 1024 / 1024,
      cpuUsagePercent: ((cpuUsage.user + cpuUsage.system) / 1000 / 1000) * 100,
    });
  }

  private performHealthCheck(): void {
    // Simulate health check logic
    const isHealthy = Math.random() > 0.05; // 95% healthy

    if (!isHealthy) {
      this.recordError(new Error('Health check failed'), {
        correlationId: `health_${Date.now()}`,
        operationType: BrowserAutomationOperationType.HEALTH_CHECK,
        durationMs: 1000,
      });
    }
  }

  private processAlerts(): void {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) {
        continue;
      }

      // Check if rule is in cooldown
      const activeAlert = this.activeAlerts.get(ruleId);
      if (activeAlert && rule.lastTriggered) {
        const cooldownEnd = new Date(
          rule.lastTriggered.getTime() + rule.cooldownMinutes * 60000,
        );
        if (new Date() < cooldownEnd) {
          continue;
        }
      }

      // Evaluate rule conditions
      const shouldTrigger = this.evaluateAlertRule(rule);

      if (shouldTrigger) {
        this.triggerAlert(rule);
      }
    }
  }

  private evaluateAlertRule(rule: AlertRule): boolean {
    // Simplified alert rule evaluation
    // In a real implementation, this would evaluate complex conditions

    for (const condition of rule.conditions) {
      const metricValue = this.getMetricValue(condition.metric);

      if (
        !this.evaluateCondition(
          metricValue,
          condition.operator,
          condition.threshold,
        )
      ) {
        return false;
      }
    }

    return true;
  }

  private getMetricValue(metricName: string): number {
    // Return metric values based on metric name
    switch (metricName) {
      case 'error_rate': {
        const totalOps = Array.from(this.performanceMetrics.values()).reduce(
          (sum, m) => sum + m.totalOperations,
          0,
        );
        const totalErrors = Array.from(this.performanceMetrics.values()).reduce(
          (sum, m) => sum + m.failedOperations,
          0,
        );
        return totalOps > 0 ? totalErrors / totalOps : 0;
      }

      case 'memory_usage':
        return this.systemHealthMetrics.resources.memoryUsagePercent;

      case 'cpu_usage':
        return this.systemHealthMetrics.resources.cpuUsagePercent;

      default:
        return 0;
    }
  }

  private evaluateCondition(
    value: number,
    operator: string,
    threshold: number,
  ): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'eq':
        return value === threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      default:
        return false;
    }
  }

  private triggerAlert(rule: AlertRule): void {
    this.logger.warn(`Alert triggered: ${rule.name}`, { ruleId: rule.id });

    // Update alert state
    rule.lastTriggered = new Date();
    this.alertRules.set(rule.id, rule);

    const activeAlert = this.activeAlerts.get(rule.id);
    if (activeAlert) {
      activeAlert.count++;
    } else {
      this.activeAlerts.set(rule.id, {
        triggeredAt: new Date(),
        count: 1,
      });
    }

    // Execute alert actions
    for (const action of rule.actions) {
      this.executeAlertAction(rule, action);
    }

    // Emit alert event
    this.eventEmitter.emit('monitoring.alert', {
      rule,
      triggeredAt: new Date(),
    });
  }

  private executeAlertAction(
    rule: AlertRule,
    action: AlertRule['actions'][0],
  ): void {
    this.logger.log(
      `Executing alert action: ${action.type} for rule: ${rule.name}`,
    );

    // In a real implementation, this would send emails, webhooks, etc.
    switch (action.type) {
      case 'log':
        this.logger.warn(`ALERT: ${rule.name} - ${rule.description}`);
        break;
      case 'webhook':
        // Send webhook notification
        break;
      case 'email':
        // Send email notification
        break;
      case 'sms':
        // Send SMS notification
        break;
    }
  }

  private initializeDefaultAlertRules(): void {
    // High error rate alert
    this.createAlertRule({
      name: 'High Error Rate',
      description: 'Triggers when error rate exceeds 10%',
      enabled: true,
      conditions: [
        {
          metric: 'error_rate',
          operator: 'gt',
          threshold: 0.1,
          timeWindowMinutes: 5,
        },
      ],
      actions: [
        {
          type: 'log',
          target: 'system',
        },
      ],
      cooldownMinutes: 15,
      severity: 'HIGH',
    });

    // High memory usage alert
    this.createAlertRule({
      name: 'High Memory Usage',
      description: 'Triggers when memory usage exceeds 90%',
      enabled: true,
      conditions: [
        {
          metric: 'memory_usage',
          operator: 'gt',
          threshold: 90,
          timeWindowMinutes: 5,
        },
      ],
      actions: [
        {
          type: 'log',
          target: 'system',
        },
      ],
      cooldownMinutes: 10,
      severity: 'MEDIUM',
    });
  }

  private convertToPrometheusFormat(data: any): string {
    // Convert metrics to Prometheus format
    let prometheus = '';

    // Add error metrics
    for (const [code, metrics] of Object.entries(data.errorMetrics as any)) {
      prometheus += `browser_automation_errors_total{error_code="${code}"} ${metrics.count}\n`;
    }

    // Add performance metrics
    for (const [type, metrics] of Object.entries(
      data.performanceMetrics as any,
    )) {
      prometheus += `browser_automation_operations_total{operation_type="${type}"} ${metrics.totalOperations}\n`;
      prometheus += `browser_automation_operation_duration_seconds{operation_type="${type}"} ${metrics.averageDurationMs / 1000}\n`;
    }

    return prometheus;
  }

  private convertToCsvFormat(data: any): string {
    // Convert metrics to CSV format
    let csv = 'metric_name,value,timestamp\n';

    for (const [code, metrics] of Object.entries(data.errorMetrics as any)) {
      csv += `error_count_${code},${(metrics as any).count},${data.timestamp}\n`;
    }

    return csv;
  }
}
