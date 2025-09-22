/**
 * Comprehensive Job Monitoring Service - Enterprise Real-time Monitoring
 *
 * Provides enterprise-grade real-time monitoring, alerting, and analytics for
 * the job management system with advanced metrics collection and trend analysis.
 *
 * Features:
 * - Real-time job status tracking with WebSocket support
 * - Advanced metrics collection and aggregation
 * - Performance trend analysis and forecasting
 * - Automated alerting and threshold monitoring
 * - Resource utilization tracking and optimization
 * - Custom dashboard data for monitoring tools
 * - Historical data retention and reporting
 * - SLA monitoring and compliance tracking
 *
 * @author Claude Code - Agent 8 Job Management Specialist
 * @version 3.0.0
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { ComprehensiveJobStorageService, JobStatus, JobPriority, JobAnalytics } from './comprehensive-job-storage.service';

/**
 * Real-time job status update
 */
export interface JobStatusUpdate {
  jobId: string;
  status: JobStatus;
  progress: number;
  currentStep?: string;
  estimatedCompletion?: Date;
  resourceUsage?: ResourceUsage;
  executionTimeMs?: number;
  errorMessage?: string;
  timestamp: Date;
  workerId?: string;
}

/**
 * Resource usage metrics
 */
export interface ResourceUsage {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage?: number;
  networkUsage?: number;
  activeConnections?: number;
}

/**
 * System performance metrics
 */
export interface SystemMetrics {
  timestamp: Date;
  totalJobs: number;
  activeJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageExecutionTime: number;
  throughputPerMinute: number;
  errorRate: number;
  resourceUtilization: ResourceUsage;
  workerMetrics: {
    totalWorkers: number;
    activeWorkers: number;
    idleWorkers: number;
    unhealthyWorkers: number;
    averageWorkerLoad: number;
  };
  queueMetrics: {
    averageWaitTime: number;
    priorityDistribution: Record<JobPriority, number>;
    oldestJobAge: number;
  };
}

/**
 * Performance alert configuration
 */
export interface AlertThreshold {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownPeriod: number; // seconds
  lastTriggered?: Date;
}

/**
 * Performance alert instance
 */
export interface PerformanceAlert {
  id: string;
  thresholdId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

/**
 * SLA configuration and tracking
 */
export interface SLAMetrics {
  targetResponseTime: number; // milliseconds
  targetSuccessRate: number; // percentage
  targetThroughput: number; // jobs per hour
  currentResponseTime: number;
  currentSuccessRate: number;
  currentThroughput: number;
  slaCompliance: number; // percentage
  breachCount: number;
  lastBreach?: Date;
}

/**
 * Dashboard data for monitoring interfaces
 */
export interface DashboardData {
  overview: {
    totalJobs: number;
    activeJobs: number;
    completedToday: number;
    failureRate: number;
    averageExecutionTime: number;
    systemUptime: number;
  };
  realTimeMetrics: SystemMetrics;
  performanceChart: Array<{
    timestamp: Date;
    throughput: number;
    errorRate: number;
    averageExecutionTime: number;
  }>;
  alerts: PerformanceAlert[];
  sla: SLAMetrics;
  topPerformingActions: Array<{
    actionType: string;
    count: number;
    averageExecutionTime: number;
    successRate: number;
  }>;
  workerStatus: Array<{
    workerId: string;
    status: 'active' | 'idle' | 'unhealthy';
    currentJob?: string;
    performance: number;
  }>;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/job-monitoring',
})
export class ComprehensiveJobMonitoringService implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(ComprehensiveJobMonitoringService.name);
  private readonly connectedClients = new Map<string, Socket>();
  private readonly metricsHistory: SystemMetrics[] = [];
  private readonly alertThresholds: Map<string, AlertThreshold> = new Map();
  private readonly activeAlerts: Map<string, PerformanceAlert> = new Map();

  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertCheckInterval: NodeJS.Timeout | null = null;
  private historyCleanupInterval: NodeJS.Timeout | null = null;

  private readonly maxHistoryRetention = 24 * 60; // 24 hours in minutes
  private readonly metricsCollectionInterval = 10000; // 10 seconds
  private readonly alertCheckInterval_ms = 30000; // 30 seconds

  private systemStartTime = new Date();
  private currentMetrics: SystemMetrics | null = null;

  constructor(
    private readonly jobStorage: ComprehensiveJobStorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultAlertThresholds();
  }

  /**
   * Initialize monitoring service
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Comprehensive Job Monitoring Service');

    this.startMetricsCollection();
    this.startAlertMonitoring();
    this.startHistoryCleanup();

    this.isMonitoring = true;
    this.logger.log('Comprehensive Job Monitoring Service initialized successfully');
  }

  /**
   * Cleanup monitoring service
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Comprehensive Job Monitoring Service');

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
    }
    if (this.historyCleanupInterval) {
      clearInterval(this.historyCleanupInterval);
    }

    // Disconnect all clients
    for (const [clientId, socket] of this.connectedClients) {
      socket.disconnect();
    }
    this.connectedClients.clear();

    this.logger.log('Comprehensive Job Monitoring Service shutdown completed');
  }

  /**
   * Handle client connections
   */
  handleConnection(client: Socket): void {
    const clientId = uuidv4();
    this.connectedClients.set(clientId, client);

    this.logger.debug(`Monitoring client connected: ${clientId}`);

    // Send current metrics to new client
    if (this.currentMetrics) {
      client.emit('metrics_update', this.currentMetrics);
    }

    // Send current alerts
    const alerts = Array.from(this.activeAlerts.values());
    if (alerts.length > 0) {
      client.emit('alerts_update', alerts);
    }

    client.on('disconnect', () => {
      this.connectedClients.delete(clientId);
      this.logger.debug(`Monitoring client disconnected: ${clientId}`);
    });
  }

  /**
   * Handle client requests for dashboard data
   */
  @SubscribeMessage('get_dashboard_data')
  async handleGetDashboardData(client: Socket): Promise<DashboardData> {
    return await this.getDashboardData();
  }

  /**
   * Handle client requests for historical metrics
   */
  @SubscribeMessage('get_historical_metrics')
  handleGetHistoricalMetrics(
    client: Socket,
    payload: { timeframe: number; granularity: string }
  ): SystemMetrics[] {
    const { timeframe, granularity } = payload;
    const now = Date.now();
    const cutoff = now - timeframe * 60 * 1000; // timeframe in minutes

    return this.metricsHistory
      .filter(metric => metric.timestamp.getTime() > cutoff)
      .filter((_, index) => {
        // Apply granularity filtering
        switch (granularity) {
          case 'minute': return true;
          case '5minute': return index % 30 === 0; // Every 30th metric (5 min intervals)
          case 'hour': return index % 360 === 0; // Every 360th metric (1 hour intervals)
          default: return true;
        }
      });
  }

  /**
   * Handle alert acknowledgment
   */
  @SubscribeMessage('acknowledge_alert')
  handleAcknowledgeAlert(client: Socket, payload: { alertId: string }): boolean {
    const alert = this.activeAlerts.get(payload.alertId);
    if (alert) {
      alert.acknowledged = true;
      this.broadcastToClients('alert_acknowledged', { alertId: payload.alertId });
      return true;
    }
    return false;
  }

  /**
   * Handle alert resolution
   */
  @SubscribeMessage('resolve_alert')
  handleResolveAlert(client: Socket, payload: { alertId: string }): boolean {
    const alert = this.activeAlerts.get(payload.alertId);
    if (alert) {
      alert.resolvedAt = new Date();
      this.activeAlerts.delete(payload.alertId);
      this.broadcastToClients('alert_resolved', { alertId: payload.alertId });
      return true;
    }
    return false;
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    const analytics = await this.jobStorage.getJobAnalytics(24);
    const currentTime = new Date();
    const todayStart = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());

    // Get today's job counts
    const todayJobs = await this.jobStorage.searchJobs({
      submittedAfter: todayStart,
      submittedBefore: currentTime,
    });

    const completedToday = todayJobs.filter(job => job.status === JobStatus.COMPLETED).length;

    // Get performance chart data (last 4 hours)
    const performanceChart = this.metricsHistory
      .slice(-240) // Last 4 hours worth of metrics (assuming 10s intervals)
      .map(metric => ({
        timestamp: metric.timestamp,
        throughput: metric.throughputPerMinute,
        errorRate: metric.errorRate,
        averageExecutionTime: metric.averageExecutionTime,
      }));

    // Get top performing actions
    const actionTypes = Object.keys(analytics.jobsByActionType);
    const topPerformingActions = await Promise.all(
      actionTypes.map(async (actionType) => {
        const actionJobs = await this.jobStorage.searchJobs({
          actionTypes: [actionType],
          submittedAfter: new Date(Date.now() - 24 * 60 * 60 * 1000),
        });

        const completedJobs = actionJobs.filter(job => job.status === JobStatus.COMPLETED);
        const averageExecutionTime = completedJobs.length > 0 ?
          completedJobs.reduce((sum, job) => sum + (job.executionTimeMs || 0), 0) / completedJobs.length : 0;

        return {
          actionType,
          count: actionJobs.length,
          averageExecutionTime,
          successRate: actionJobs.length > 0 ? (completedJobs.length / actionJobs.length) * 100 : 0,
        };
      })
    );

    // Sort by count and take top 10
    topPerformingActions.sort((a, b) => b.count - a.count);

    return {
      overview: {
        totalJobs: analytics.totalJobs,
        activeJobs: this.currentMetrics?.activeJobs || 0,
        completedToday,
        failureRate: analytics.totalJobs > 0 ? ((analytics.totalJobs - analytics.totalJobs * analytics.successRate / 100) / analytics.totalJobs) * 100 : 0,
        averageExecutionTime: analytics.averageExecutionTime,
        systemUptime: Date.now() - this.systemStartTime.getTime(),
      },
      realTimeMetrics: this.currentMetrics || this.createEmptyMetrics(),
      performanceChart,
      alerts: Array.from(this.activeAlerts.values()),
      sla: await this.calculateSLAMetrics(),
      topPerformingActions: topPerformingActions.slice(0, 10),
      workerStatus: [], // This would be populated from worker service
    };
  }

  /**
   * Listen for job events and update real-time status
   */
  @OnEvent('job.queued')
  handleJobQueued(payload: { jobId: string; priority: JobPriority }): void {
    this.broadcastJobUpdate({
      jobId: payload.jobId,
      status: JobStatus.QUEUED,
      progress: 0,
      timestamp: new Date(),
    });
  }

  @OnEvent('job.started')
  handleJobStarted(payload: { jobId: string; workerId: string }): void {
    this.broadcastJobUpdate({
      jobId: payload.jobId,
      status: JobStatus.RUNNING,
      progress: 0,
      timestamp: new Date(),
      workerId: payload.workerId,
    });
  }

  @OnEvent('job.progress')
  handleJobProgress(payload: { jobId: string; progress: number; currentStep: string }): void {
    this.broadcastJobUpdate({
      jobId: payload.jobId,
      status: JobStatus.RUNNING,
      progress: payload.progress,
      currentStep: payload.currentStep,
      timestamp: new Date(),
    });
  }

  @OnEvent('job.completed')
  handleJobCompleted(payload: { jobId: string; workerId: string; executionTime: number; resourceUsage: any }): void {
    this.broadcastJobUpdate({
      jobId: payload.jobId,
      status: JobStatus.COMPLETED,
      progress: 100,
      executionTimeMs: payload.executionTime,
      resourceUsage: payload.resourceUsage,
      timestamp: new Date(),
      workerId: payload.workerId,
    });
  }

  @OnEvent('job.failed')
  handleJobFailed(payload: { jobId: string; error: string; retryCount: number }): void {
    this.broadcastJobUpdate({
      jobId: payload.jobId,
      status: JobStatus.FAILED,
      progress: 0,
      errorMessage: payload.error,
      timestamp: new Date(),
    });
  }

  @OnEvent('job.cancelled')
  handleJobCancelled(payload: { jobId: string; reason: string }): void {
    this.broadcastJobUpdate({
      jobId: payload.jobId,
      status: JobStatus.CANCELLED,
      progress: 0,
      timestamp: new Date(),
    });
  }

  @OnEvent('job.retry')
  handleJobRetry(payload: { jobId: string; retryCount: number; error: string }): void {
    this.broadcastJobUpdate({
      jobId: payload.jobId,
      status: JobStatus.RETRY,
      progress: 0,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast job status update to all connected clients
   */
  private broadcastJobUpdate(update: JobStatusUpdate): void {
    this.broadcastToClients('job_status_update', update);
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcastToClients(event: string, data: any): void {
    for (const [clientId, socket] of this.connectedClients) {
      try {
        socket.emit(event, data);
      } catch (error) {
        this.logger.warn(`Failed to send ${event} to client ${clientId}:`, error);
        this.connectedClients.delete(clientId);
      }
    }
  }

  /**
   * Start metrics collection loop
   */
  private startMetricsCollection(): void {
    this.monitoringInterval = setInterval(async () => {
      if (!this.isMonitoring) return;

      try {
        const metrics = await this.collectSystemMetrics();
        this.currentMetrics = metrics;
        this.metricsHistory.push(metrics);

        // Broadcast to connected clients
        this.broadcastToClients('metrics_update', metrics);

        // Check for performance issues
        await this.checkPerformanceThresholds(metrics);

      } catch (error) {
        this.logger.error('Error collecting system metrics:', error);
      }
    }, this.metricsCollectionInterval);
  }

  /**
   * Collect current system metrics
   */
  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const analytics = await this.jobStorage.getJobAnalytics(1); // Last hour

    // Get current job status counts
    const recentJobs = await this.jobStorage.searchJobs({
      submittedAfter: new Date(Date.now() - 60 * 60 * 1000), // Last hour
    });

    const activeJobs = recentJobs.filter(job =>
      job.status === JobStatus.RUNNING || job.status === JobStatus.QUEUED
    ).length;

    const queuedJobs = recentJobs.filter(job => job.status === JobStatus.QUEUED).length;

    // Calculate throughput (jobs per minute in last 10 minutes)
    const last10Min = new Date(Date.now() - 10 * 60 * 1000);
    const recentCompletedJobs = await this.jobStorage.searchJobs({
      statuses: [JobStatus.COMPLETED],
      completedAfter: last10Min,
    });

    const throughputPerMinute = recentCompletedJobs.length / 10;

    // Calculate average wait time
    const queuedJobsData = await this.jobStorage.searchJobs({
      statuses: [JobStatus.QUEUED],
      sortBy: 'submittedAt',
      sortOrder: 'ASC',
      limit: 100,
    });

    const averageWaitTime = queuedJobsData.length > 0 ?
      queuedJobsData.reduce((sum, job) => sum + (Date.now() - job.submittedAt.getTime()), 0) / queuedJobsData.length : 0;

    const oldestJobAge = queuedJobsData.length > 0 ?
      Date.now() - queuedJobsData[0].submittedAt.getTime() : 0;

    // Get priority distribution
    const priorityDistribution: Record<JobPriority, number> = {
      [JobPriority.LOW]: 0,
      [JobPriority.NORMAL]: 0,
      [JobPriority.HIGH]: 0,
      [JobPriority.CRITICAL]: 0,
      [JobPriority.EMERGENCY]: 0,
    };

    queuedJobsData.forEach(job => {
      priorityDistribution[job.priority]++;
    });

    return {
      timestamp: new Date(),
      totalJobs: analytics.totalJobs,
      activeJobs,
      queuedJobs,
      completedJobs: analytics.jobsByStatus[JobStatus.COMPLETED] || 0,
      failedJobs: analytics.jobsByStatus[JobStatus.FAILED] || 0,
      averageExecutionTime: analytics.averageExecutionTime,
      throughputPerMinute,
      errorRate: 100 - analytics.successRate,
      resourceUtilization: {
        cpuUsage: 0, // Would be populated from worker metrics
        memoryUsage: 0, // Would be populated from worker metrics
      },
      workerMetrics: {
        totalWorkers: 0, // Would be populated from worker service
        activeWorkers: 0, // Would be populated from worker service
        idleWorkers: 0, // Would be populated from worker service
        unhealthyWorkers: 0, // Would be populated from worker service
        averageWorkerLoad: 0, // Would be populated from worker service
      },
      queueMetrics: {
        averageWaitTime,
        priorityDistribution,
        oldestJobAge,
      },
    };
  }

  /**
   * Initialize default alert thresholds
   */
  private initializeDefaultAlertThresholds(): void {
    const defaultThresholds: AlertThreshold[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        metric: 'errorRate',
        condition: 'greater_than',
        threshold: 10, // 10%
        severity: 'high',
        enabled: true,
        cooldownPeriod: 300, // 5 minutes
      },
      {
        id: 'high_queue_length',
        name: 'High Queue Length',
        metric: 'queuedJobs',
        condition: 'greater_than',
        threshold: 100,
        severity: 'medium',
        enabled: true,
        cooldownPeriod: 600, // 10 minutes
      },
      {
        id: 'slow_execution_time',
        name: 'Slow Average Execution Time',
        metric: 'averageExecutionTime',
        condition: 'greater_than',
        threshold: 30000, // 30 seconds
        severity: 'medium',
        enabled: true,
        cooldownPeriod: 300, // 5 minutes
      },
      {
        id: 'low_throughput',
        name: 'Low Throughput',
        metric: 'throughputPerMinute',
        condition: 'less_than',
        threshold: 1, // Less than 1 job per minute
        severity: 'medium',
        enabled: true,
        cooldownPeriod: 600, // 10 minutes
      },
      {
        id: 'old_queued_jobs',
        name: 'Old Queued Jobs',
        metric: 'oldestJobAge',
        condition: 'greater_than',
        threshold: 600000, // 10 minutes
        severity: 'high',
        enabled: true,
        cooldownPeriod: 300, // 5 minutes
      },
    ];

    defaultThresholds.forEach(threshold => {
      this.alertThresholds.set(threshold.id, threshold);
    });
  }

  /**
   * Start alert monitoring loop
   */
  private startAlertMonitoring(): void {
    this.alertCheckInterval = setInterval(() => {
      if (!this.isMonitoring || !this.currentMetrics) return;

      this.checkAlertThresholds(this.currentMetrics);
    }, this.alertCheckInterval_ms);
  }

  /**
   * Check performance thresholds and generate alerts
   */
  private async checkPerformanceThresholds(metrics: SystemMetrics): Promise<void> {
    this.checkAlertThresholds(metrics);
  }

  /**
   * Check alert thresholds against current metrics
   */
  private checkAlertThresholds(metrics: SystemMetrics): void {
    for (const threshold of this.alertThresholds.values()) {
      if (!threshold.enabled) continue;

      // Check cooldown period
      if (threshold.lastTriggered &&
          Date.now() - threshold.lastTriggered.getTime() < threshold.cooldownPeriod * 1000) {
        continue;
      }

      const currentValue = this.getMetricValue(metrics, threshold.metric);
      if (currentValue === null) continue;

      const isTriggered = this.evaluateThreshold(currentValue, threshold);

      if (isTriggered) {
        this.triggerAlert(threshold, currentValue);
      }
    }
  }

  /**
   * Get metric value from metrics object
   */
  private getMetricValue(metrics: SystemMetrics, metricPath: string): number | null {
    const parts = metricPath.split('.');
    let current: any = metrics;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }

    return typeof current === 'number' ? current : null;
  }

  /**
   * Evaluate if threshold condition is met
   */
  private evaluateThreshold(value: number, threshold: AlertThreshold): boolean {
    switch (threshold.condition) {
      case 'greater_than':
        return value > threshold.threshold;
      case 'less_than':
        return value < threshold.threshold;
      case 'equals':
        return value === threshold.threshold;
      case 'not_equals':
        return value !== threshold.threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger performance alert
   */
  private triggerAlert(threshold: AlertThreshold, currentValue: number): void {
    const alertId = uuidv4();
    const alert: PerformanceAlert = {
      id: alertId,
      thresholdId: threshold.id,
      severity: threshold.severity,
      message: `${threshold.name}: ${threshold.metric} is ${currentValue} (threshold: ${threshold.threshold})`,
      metric: threshold.metric,
      currentValue,
      threshold: threshold.threshold,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.activeAlerts.set(alertId, alert);
    threshold.lastTriggered = new Date();

    // Broadcast alert to connected clients
    this.broadcastToClients('new_alert', alert);

    this.logger.warn(`Performance alert triggered: ${alert.message}`);

    // Emit event for other services
    this.eventEmitter.emit('monitoring.alert', alert);
  }

  /**
   * Start history cleanup loop
   */
  private startHistoryCleanup(): void {
    this.historyCleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Clean up old metrics data
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.maxHistoryRetention * 60 * 1000;

    // Remove old metrics
    const initialLength = this.metricsHistory.length;
    for (let i = this.metricsHistory.length - 1; i >= 0; i--) {
      if (this.metricsHistory[i].timestamp.getTime() < cutoffTime) {
        this.metricsHistory.splice(i, 1);
      }
    }

    const removedCount = initialLength - this.metricsHistory.length;
    if (removedCount > 0) {
      this.logger.debug(`Cleaned up ${removedCount} old metrics entries`);
    }

    // Clean up resolved alerts older than 24 hours
    const alertCutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [alertId, alert] of this.activeAlerts) {
      if (alert.resolvedAt && alert.resolvedAt.getTime() < alertCutoff) {
        this.activeAlerts.delete(alertId);
      }
    }
  }

  /**
   * Calculate SLA metrics
   */
  private async calculateSLAMetrics(): Promise<SLAMetrics> {
    const analytics = await this.jobStorage.getJobAnalytics(24);

    // Define SLA targets (these could be configurable)
    const targetResponseTime = 10000; // 10 seconds
    const targetSuccessRate = 95; // 95%
    const targetThroughput = 60; // 60 jobs per hour

    const currentThroughput = this.currentMetrics?.throughputPerMinute * 60 || 0;

    // Calculate SLA compliance
    const responseTimeCompliance = analytics.averageExecutionTime <= targetResponseTime ? 100 : 0;
    const successRateCompliance = analytics.successRate >= targetSuccessRate ? 100 : 0;
    const throughputCompliance = currentThroughput >= targetThroughput ? 100 : 0;

    const overallCompliance = (responseTimeCompliance + successRateCompliance + throughputCompliance) / 3;

    return {
      targetResponseTime,
      targetSuccessRate,
      targetThroughput,
      currentResponseTime: analytics.averageExecutionTime,
      currentSuccessRate: analytics.successRate,
      currentThroughput,
      slaCompliance: overallCompliance,
      breachCount: 0, // This would be tracked over time
      lastBreach: undefined, // This would be the last time SLA was breached
    };
  }

  /**
   * Create empty metrics object for initialization
   */
  private createEmptyMetrics(): SystemMetrics {
    return {
      timestamp: new Date(),
      totalJobs: 0,
      activeJobs: 0,
      queuedJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageExecutionTime: 0,
      throughputPerMinute: 0,
      errorRate: 0,
      resourceUtilization: {
        cpuUsage: 0,
        memoryUsage: 0,
      },
      workerMetrics: {
        totalWorkers: 0,
        activeWorkers: 0,
        idleWorkers: 0,
        unhealthyWorkers: 0,
        averageWorkerLoad: 0,
      },
      queueMetrics: {
        averageWaitTime: 0,
        priorityDistribution: {
          [JobPriority.LOW]: 0,
          [JobPriority.NORMAL]: 0,
          [JobPriority.HIGH]: 0,
          [JobPriority.CRITICAL]: 0,
          [JobPriority.EMERGENCY]: 0,
        },
        oldestJobAge: 0,
      },
    };
  }
}