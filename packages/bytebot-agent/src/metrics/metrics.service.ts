/**
 * Prometheus Metrics Collection Service
 *
 * Core service for collecting and exposing application metrics using Prometheus
 * client library. Provides comprehensive observability for the Bytebot Agent
 * with custom business metrics and performance tracking.
 *
 * Features:
 * - Prometheus metrics collection and export
 * - Custom application metrics (task processing, API performance)
 * - Computer-use operation metrics with timing
 * - WebSocket connection tracking
 * - Database performance metrics
 * - System resource monitoring
 * - Authentication and security metrics
 * - Error tracking and alerting metrics
 *
 * @author Claude Code - Monitoring & Observability Specialist
 * @version 2.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  register,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
  Summary,
  Registry,
} from 'prom-client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Metrics collection service for Prometheus integration
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly registry: Registry;

  // API Request Metrics
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly httpRequestsInFlight: Gauge<string>;

  // Task Processing Metrics
  private readonly taskProcessingDuration: Histogram<string>;
  private readonly taskProcessingTotal: Counter<string>;
  private readonly tasksInProgress: Gauge<string>;
  private readonly taskQueueSize: Gauge<string>;

  // Computer-use Operation Metrics
  private readonly computerUseOperationsTotal: Counter<string>;
  private readonly computerUseOperationDuration: Histogram<string>;
  private readonly computerUseErrors: Counter<string>;
  private readonly aneProcessingDuration: Histogram<string>;

  // WebSocket Connection Metrics
  private readonly websocketConnections: Gauge<string>;
  private readonly websocketMessages: Counter<string>;
  private readonly websocketErrors: Counter<string>;

  // Database Metrics
  private readonly databaseConnections: Gauge<string>;
  private readonly databaseQueryDuration: Histogram<string>;
  private readonly databaseErrors: Counter<string>;

  // Authentication Metrics
  private readonly authenticationAttempts: Counter<string>;
  private readonly authenticationDuration: Histogram<string>;
  private readonly activeUserSessions: Gauge<string>;

  // System Metrics
  private readonly memoryUsage: Gauge<string>;
  private readonly cpuUsage: Gauge<string>;
  private readonly diskUsage: Gauge<string>;

  // Error Metrics
  private readonly applicationErrors: Counter<string>;
  private readonly errorsByCategory: Counter<string>;

  // Business Metrics
  private readonly apiRequestsRate: Gauge<string>;
  private readonly taskSuccessRate: Gauge<string>;
  private readonly systemHealth: Gauge<string>;

  constructor() {
    this.logger.log('Prometheus Metrics Service initializing');

    // Create dedicated registry for better control
    this.registry = register;

    // Enable default system metrics collection
    collectDefaultMetrics({
      prefix: 'bytebot_agent_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
      register: this.registry,
    });

    // Initialize API Request Metrics
    this.httpRequestsTotal = new Counter({
      name: 'bytebot_agent_http_requests_total',
      help: 'Total number of HTTP requests processed',
      labelNames: ['method', 'route', 'status_code', 'user_id'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'bytebot_agent_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestsInFlight = new Gauge({
      name: 'bytebot_agent_http_requests_in_flight',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['method', 'route'],
      registers: [this.registry],
    });

    // Initialize Task Processing Metrics
    this.taskProcessingDuration = new Histogram({
      name: 'bytebot_agent_task_processing_duration_seconds',
      help: 'Task processing duration in seconds',
      labelNames: ['task_type', 'status', 'user_id'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 300, 600],
      registers: [this.registry],
    });

    this.taskProcessingTotal = new Counter({
      name: 'bytebot_agent_tasks_total',
      help: 'Total number of processed tasks',
      labelNames: ['task_type', 'status', 'user_id'],
      registers: [this.registry],
    });

    this.tasksInProgress = new Gauge({
      name: 'bytebot_agent_tasks_in_progress',
      help: 'Number of tasks currently being processed',
      labelNames: ['task_type', 'user_id'],
      registers: [this.registry],
    });

    this.taskQueueSize = new Gauge({
      name: 'bytebot_agent_task_queue_size',
      help: 'Number of tasks waiting in queue',
      labelNames: ['priority'],
      registers: [this.registry],
    });

    // Initialize Computer-use Operation Metrics
    this.computerUseOperationsTotal = new Counter({
      name: 'bytebot_agent_computer_operations_total',
      help: 'Total number of computer-use operations',
      labelNames: ['operation_type', 'status', 'user_id'],
      registers: [this.registry],
    });

    this.computerUseOperationDuration = new Histogram({
      name: 'bytebot_agent_computer_operations_duration_seconds',
      help: 'Computer-use operation duration in seconds',
      labelNames: ['operation_type', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
      registers: [this.registry],
    });

    this.computerUseErrors = new Counter({
      name: 'bytebot_agent_computer_use_errors_total',
      help: 'Total number of computer-use operation errors',
      labelNames: ['operation_type', 'error_type'],
      registers: [this.registry],
    });

    this.aneProcessingDuration = new Histogram({
      name: 'bytebot_agent_ane_processing_duration_seconds',
      help: 'Apple Neural Engine processing duration in seconds',
      labelNames: ['operation_type', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 1],
      registers: [this.registry],
    });

    // Initialize WebSocket Metrics
    this.websocketConnections = new Gauge({
      name: 'bytebot_agent_websocket_connections_active',
      help: 'Number of active WebSocket connections',
      labelNames: ['connection_type', 'user_id'],
      registers: [this.registry],
    });

    this.websocketMessages = new Counter({
      name: 'bytebot_agent_websocket_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['direction', 'message_type', 'user_id'],
      registers: [this.registry],
    });

    this.websocketErrors = new Counter({
      name: 'bytebot_agent_websocket_errors_total',
      help: 'Total number of WebSocket errors',
      labelNames: ['error_type', 'connection_type'],
      registers: [this.registry],
    });

    // Initialize Database Metrics
    this.databaseConnections = new Gauge({
      name: 'bytebot_agent_database_connections',
      help: 'Number of database connections',
      labelNames: ['database', 'state'],
      registers: [this.registry],
    });

    this.databaseQueryDuration = new Histogram({
      name: 'bytebot_agent_database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.databaseErrors = new Counter({
      name: 'bytebot_agent_database_errors_total',
      help: 'Total number of database errors',
      labelNames: ['operation', 'error_type', 'table'],
      registers: [this.registry],
    });

    // Initialize Authentication Metrics
    this.authenticationAttempts = new Counter({
      name: 'bytebot_agent_auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['method', 'status', 'user_agent'],
      registers: [this.registry],
    });

    this.authenticationDuration = new Histogram({
      name: 'bytebot_agent_auth_duration_seconds',
      help: 'Authentication operation duration in seconds',
      labelNames: ['method', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.activeUserSessions = new Gauge({
      name: 'bytebot_agent_active_user_sessions',
      help: 'Number of active user sessions',
      labelNames: ['session_type'],
      registers: [this.registry],
    });

    // Initialize System Metrics
    this.memoryUsage = new Gauge({
      name: 'bytebot_agent_memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.cpuUsage = new Gauge({
      name: 'bytebot_agent_cpu_usage_percent',
      help: 'CPU usage percentage',
      registers: [this.registry],
    });

    this.diskUsage = new Gauge({
      name: 'bytebot_agent_disk_usage_bytes',
      help: 'Disk usage in bytes',
      labelNames: ['mount_point'],
      registers: [this.registry],
    });

    // Initialize Error Metrics
    this.applicationErrors = new Counter({
      name: 'bytebot_agent_errors_total',
      help: 'Total number of application errors',
      labelNames: ['error_type', 'severity', 'component'],
      registers: [this.registry],
    });

    this.errorsByCategory = new Counter({
      name: 'bytebot_agent_errors_by_category_total',
      help: 'Total number of errors by category',
      labelNames: ['category', 'subcategory'],
      registers: [this.registry],
    });

    // Initialize Business Metrics
    this.apiRequestsRate = new Gauge({
      name: 'bytebot_agent_api_requests_per_second',
      help: 'API requests per second',
      registers: [this.registry],
    });

    this.taskSuccessRate = new Gauge({
      name: 'bytebot_agent_task_success_rate',
      help: 'Task success rate percentage',
      labelNames: ['task_type'],
      registers: [this.registry],
    });

    this.systemHealth = new Gauge({
      name: 'bytebot_agent_system_health_score',
      help: 'Overall system health score (0-1)',
      registers: [this.registry],
    });

    // Start periodic metrics collection
    this.startPeriodicCollection();

    this.logger.log(
      'Prometheus Metrics Service initialized - All metrics registered',
    );
    this.logger.log('📊 Metrics available at: /metrics endpoint');
  }

  /**
   * Get Prometheus-formatted metrics
   */
  async getPrometheusMetrics(): Promise<string> {
    const operationId = `metrics_${Date.now()}_${uuidv4().substring(0, 8)}`;
    this.logger.debug(`[${operationId}] Collecting Prometheus metrics`);

    try {
      // Update system metrics before export
      this.updateSystemMetrics();

      const metrics = await this.registry.metrics();
      this.logger.debug(
        `[${operationId}] Prometheus metrics collected successfully`,
        {
          metricsLength: metrics.length,
        },
      );
      return metrics;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[${operationId}] Failed to collect Prometheus metrics: ${errorMessage}`,
        {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      throw error;
    }
  }

  /**
   * Record API request metrics
   */
  recordApiRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    userId?: string,
  ): void {
    const durationSeconds = duration / 1000;

    this.httpRequestsTotal
      .labels(method, route, statusCode.toString(), userId || 'anonymous')
      .inc();

    this.httpRequestDuration
      .labels(method, route, statusCode.toString())
      .observe(durationSeconds);

    this.logger.debug('API request metrics recorded', {
      method,
      route,
      statusCode,
      durationMs: duration,
      userId,
    });
  }

  /**
   * Record request start (in-flight tracking)
   */
  recordRequestStart(method: string, route: string): void {
    this.httpRequestsInFlight.labels(method, route).inc();
  }

  /**
   * Record request end (in-flight tracking)
   */
  recordRequestEnd(method: string, route: string): void {
    this.httpRequestsInFlight.labels(method, route).dec();
  }

  /**
   * Record task processing metrics
   */
  recordTaskProcessing(
    taskType: string,
    status: 'completed' | 'failed' | 'cancelled',
    duration: number,
    userId?: string,
  ): void {
    const durationSeconds = duration / 1000;

    this.taskProcessingTotal.labels(taskType, status, userId || 'system').inc();

    this.taskProcessingDuration
      .labels(taskType, status, userId || 'system')
      .observe(durationSeconds);

    this.logger.debug('Task processing metrics recorded', {
      taskType,
      status,
      durationMs: duration,
      userId,
    });
  }

  /**
   * Update task queue metrics
   */
  setTasksInProgress(taskType: string, count: number, userId?: string): void {
    this.tasksInProgress.labels(taskType, userId || 'system').set(count);
  }

  /**
   * Update task queue size
   */
  setTaskQueueSize(priority: string, size: number): void {
    this.taskQueueSize.labels(priority).set(size);
  }

  /**
   * Record computer-use operation metrics
   */
  recordComputerUseOperation(
    operationType: string,
    status: 'success' | 'error',
    duration: number,
    userId?: string,
  ): void {
    const durationSeconds = duration / 1000;

    this.computerUseOperationsTotal
      .labels(operationType, status, userId || 'system')
      .inc();

    this.computerUseOperationDuration
      .labels(operationType, status)
      .observe(durationSeconds);

    this.logger.debug('Computer-use operation metrics recorded', {
      operationType,
      status,
      durationMs: duration,
      userId,
    });
  }

  /**
   * Record Apple Neural Engine processing metrics
   */
  recordANEProcessing(
    operationType: string,
    status: 'success' | 'error',
    duration: number,
  ): void {
    const durationSeconds = duration / 1000;

    this.aneProcessingDuration
      .labels(operationType, status)
      .observe(durationSeconds);

    this.logger.debug('ANE processing metrics recorded', {
      operationType,
      status,
      durationMs: duration,
    });
  }

  /**
   * Record computer-use error
   */
  recordComputerUseError(operationType: string, errorType: string): void {
    this.computerUseErrors.labels(operationType, errorType).inc();

    this.logger.debug('Computer-use error recorded', {
      operationType,
      errorType,
    });
  }

  /**
   * Update WebSocket connection metrics
   */
  setWebSocketConnections(
    connectionType: string,
    count: number,
    userId?: string,
  ): void {
    this.websocketConnections
      .labels(connectionType, userId || 'anonymous')
      .set(count);
  }

  /**
   * Record WebSocket message
   */
  recordWebSocketMessage(
    direction: 'incoming' | 'outgoing',
    messageType: string,
    userId?: string,
  ): void {
    this.websocketMessages
      .labels(direction, messageType, userId || 'anonymous')
      .inc();
  }

  /**
   * Record WebSocket error
   */
  recordWebSocketError(errorType: string, connectionType: string): void {
    this.websocketErrors.labels(errorType, connectionType).inc();
  }

  /**
   * Update database connection metrics
   */
  setDatabaseConnections(database: string, state: string, count: number): void {
    this.databaseConnections.labels(database, state).set(count);
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(
    operation: string,
    table: string,
    duration: number,
    status: 'success' | 'error' = 'success',
  ): void {
    const durationSeconds = duration / 1000;

    this.databaseQueryDuration
      .labels(operation, table, status)
      .observe(durationSeconds);

    this.logger.debug('Database query metrics recorded', {
      operation,
      table,
      durationMs: duration,
      status,
    });
  }

  /**
   * Record database error
   */
  recordDatabaseError(
    operation: string,
    errorType: string,
    table?: string,
  ): void {
    this.databaseErrors.labels(operation, errorType, table || 'unknown').inc();

    this.logger.debug('Database error recorded', {
      operation,
      errorType,
      table,
    });
  }

  /**
   * Record authentication metrics
   */
  recordAuthAttempt(
    method: string,
    status: 'success' | 'failure',
    duration: number,
    userAgent?: string,
  ): void {
    const durationSeconds = duration / 1000;

    this.authenticationAttempts
      .labels(method, status, userAgent || 'unknown')
      .inc();

    this.authenticationDuration.labels(method, status).observe(durationSeconds);

    this.logger.debug('Authentication metrics recorded', {
      method,
      status,
      durationMs: duration,
    });
  }

  /**
   * Update active user sessions
   */
  setActiveUserSessions(sessionType: string, count: number): void {
    this.activeUserSessions.labels(sessionType).set(count);
  }

  /**
   * Record application error
   */
  recordApplicationError(
    errorType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    component: string,
  ): void {
    this.applicationErrors.labels(errorType, severity, component).inc();

    this.logger.debug('Application error recorded', {
      errorType,
      severity,
      component,
    });
  }

  /**
   * Record error by category
   */
  recordErrorByCategory(category: string, subcategory: string): void {
    this.errorsByCategory.labels(category, subcategory).inc();
  }

  /**
   * Update business metrics
   */
  updateBusinessMetrics(
    requestsPerSecond: number,
    taskSuccessRates: Record<string, number>,
  ): void {
    this.apiRequestsRate.set(requestsPerSecond);

    Object.entries(taskSuccessRates).forEach(([taskType, rate]) => {
      this.taskSuccessRate.labels(taskType).set(rate);
    });
  }

  /**
   * Update system health score
   */
  setSystemHealthScore(score: number): void {
    this.systemHealth.set(Math.max(0, Math.min(1, score)));
  }

  /**
   * Start periodic system metrics collection
   */
  private startPeriodicCollection(): void {
    this.logger.debug('Starting periodic system metrics collection');

    // Update system metrics every 30 seconds
    setInterval(() => {
      this.updateSystemMetrics();
    }, 30000);

    // Update business metrics every 60 seconds
    setInterval(() => {
      this.updateBusinessMetrics(0, {}); // Would calculate actual rates
    }, 60000);
  }

  /**
   * Update system metrics (memory, CPU)
   */
  private updateSystemMetrics(): void {
    try {
      const memoryUsage = process.memoryUsage();

      this.memoryUsage.labels('rss').set(memoryUsage.rss);
      this.memoryUsage.labels('heapTotal').set(memoryUsage.heapTotal);
      this.memoryUsage.labels('heapUsed').set(memoryUsage.heapUsed);
      this.memoryUsage.labels('external').set(memoryUsage.external);

      // CPU usage would require additional system monitoring
      // For now, we'll skip CPU metrics to avoid complexity
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update system metrics: ${errorMessage}`);
    }
  }

  /**
   * Clear all metrics (for testing)
   */
  clearMetrics(): void {
    this.registry.clear();
    this.logger.debug('All metrics cleared');
  }

  /**
   * Get metrics registry
   */
  getRegistry(): Registry {
    return this.registry;
  }
}
