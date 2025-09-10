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
  Registry,
  // Summary, // unused for now
} from 'prom-client';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

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
  private readonly authenticationFailures: Counter<string>;
  private readonly sessionDuration: Histogram<string>;

  // Authorization Metrics
  private readonly authorizationChecks: Counter<string>;
  private readonly authorizationDuration: Histogram<string>;
  private readonly accessDenials: Counter<string>;
  private readonly privilegeEscalations: Counter<string>;

  // Rate Limiting Metrics
  private readonly rateLimitHits: Counter<string>;
  private readonly rateLimitBypass: Counter<string>;
  private readonly throttledRequests: Counter<string>;
  private readonly rateLimitWindowUtilization: Gauge<string>;

  // Security Event Metrics
  private readonly securityEvents: Counter<string>;
  private readonly threatDetections: Counter<string>;
  private readonly vulnerabilityScans: Counter<string>;
  private readonly complianceChecks: Counter<string>;

  // Observability Metrics
  private readonly tracingSpans: Counter<string>;
  private readonly tracingErrors: Counter<string>;
  private readonly logEvents: Counter<string>;
  private readonly alertsTriggered: Counter<string>;

  // Custom Business Metrics
  private readonly userInteractions: Counter<string>;
  private readonly featureUsage: Counter<string>;
  private readonly businessProcessDuration: Histogram<string>;
  private readonly revenueMetrics: Gauge<string>;

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

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly config: ConfigService,
  ) {
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

    this.authenticationFailures = new Counter({
      name: 'bytebot_agent_auth_failures_total',
      help: 'Total number of authentication failures',
      labelNames: ['method', 'reason', 'user_agent'],
      registers: [this.registry],
    });

    this.sessionDuration = new Histogram({
      name: 'bytebot_agent_session_duration_seconds',
      help: 'User session duration in seconds',
      labelNames: ['session_type', 'termination_reason'],
      buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800],
      registers: [this.registry],
    });

    // Initialize Authorization Metrics
    this.authorizationChecks = new Counter({
      name: 'bytebot_agent_authorization_checks_total',
      help: 'Total number of authorization checks',
      labelNames: ['resource', 'action', 'result'],
      registers: [this.registry],
    });

    this.authorizationDuration = new Histogram({
      name: 'bytebot_agent_authorization_duration_seconds',
      help: 'Authorization check duration in seconds',
      labelNames: ['resource', 'action'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    this.accessDenials = new Counter({
      name: 'bytebot_agent_access_denials_total',
      help: 'Total number of access denials',
      labelNames: ['resource', 'reason', 'user_role'],
      registers: [this.registry],
    });

    this.privilegeEscalations = new Counter({
      name: 'bytebot_agent_privilege_escalations_total',
      help: 'Total number of privilege escalation attempts',
      labelNames: ['user_role', 'target_role', 'result'],
      registers: [this.registry],
    });

    // Initialize Rate Limiting Metrics
    this.rateLimitHits = new Counter({
      name: 'bytebot_agent_rate_limit_hits_total',
      help: 'Total number of rate limit hits',
      labelNames: ['endpoint', 'limit_type', 'user_id'],
      registers: [this.registry],
    });

    this.rateLimitBypass = new Counter({
      name: 'bytebot_agent_rate_limit_bypass_total',
      help: 'Total number of rate limit bypass attempts',
      labelNames: ['endpoint', 'method', 'source_ip'],
      registers: [this.registry],
    });

    this.throttledRequests = new Counter({
      name: 'bytebot_agent_throttled_requests_total',
      help: 'Total number of throttled requests',
      labelNames: ['endpoint', 'throttle_type'],
      registers: [this.registry],
    });

    this.rateLimitWindowUtilization = new Gauge({
      name: 'bytebot_agent_rate_limit_window_utilization',
      help: 'Current rate limit window utilization percentage',
      labelNames: ['endpoint', 'window_duration'],
      registers: [this.registry],
    });

    // Initialize Security Event Metrics
    this.securityEvents = new Counter({
      name: 'bytebot_agent_security_events_total',
      help: 'Total number of security events',
      labelNames: ['event_type', 'severity', 'source'],
      registers: [this.registry],
    });

    this.threatDetections = new Counter({
      name: 'bytebot_agent_threat_detections_total',
      help: 'Total number of threat detections',
      labelNames: ['threat_type', 'confidence', 'mitigation'],
      registers: [this.registry],
    });

    this.vulnerabilityScans = new Counter({
      name: 'bytebot_agent_vulnerability_scans_total',
      help: 'Total number of vulnerability scans',
      labelNames: ['scan_type', 'result', 'severity'],
      registers: [this.registry],
    });

    this.complianceChecks = new Counter({
      name: 'bytebot_agent_compliance_checks_total',
      help: 'Total number of compliance checks',
      labelNames: ['framework', 'control', 'result'],
      registers: [this.registry],
    });

    // Initialize Observability Metrics
    this.tracingSpans = new Counter({
      name: 'bytebot_agent_tracing_spans_total',
      help: 'Total number of tracing spans',
      labelNames: ['service', 'operation', 'status'],
      registers: [this.registry],
    });

    this.tracingErrors = new Counter({
      name: 'bytebot_agent_tracing_errors_total',
      help: 'Total number of tracing errors',
      labelNames: ['service', 'error_type'],
      registers: [this.registry],
    });

    this.logEvents = new Counter({
      name: 'bytebot_agent_log_events_total',
      help: 'Total number of log events',
      labelNames: ['level', 'component', 'correlation_id'],
      registers: [this.registry],
    });

    this.alertsTriggered = new Counter({
      name: 'bytebot_agent_alerts_triggered_total',
      help: 'Total number of alerts triggered',
      labelNames: ['alert_type', 'severity', 'channel'],
      registers: [this.registry],
    });

    // Initialize Custom Business Metrics
    this.userInteractions = new Counter({
      name: 'bytebot_agent_user_interactions_total',
      help: 'Total number of user interactions',
      labelNames: ['interaction_type', 'feature', 'user_segment'],
      registers: [this.registry],
    });

    this.featureUsage = new Counter({
      name: 'bytebot_agent_feature_usage_total',
      help: 'Total feature usage count',
      labelNames: ['feature', 'version', 'user_type'],
      registers: [this.registry],
    });

    this.businessProcessDuration = new Histogram({
      name: 'bytebot_agent_business_process_duration_seconds',
      help: 'Business process completion time in seconds',
      labelNames: ['process_name', 'process_version', 'result'],
      buckets: [0.5, 1, 2, 5, 10, 30, 60, 300, 600, 1800],
      registers: [this.registry],
    });

    this.revenueMetrics = new Gauge({
      name: 'bytebot_agent_revenue_metrics',
      help: 'Revenue-related metrics',
      labelNames: ['metric_type', 'currency', 'period'],
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
   * Record authentication failure
   */
  recordAuthFailure(method: string, reason: string, userAgent?: string): void {
    this.authenticationFailures
      .labels(method, reason, userAgent || 'unknown')
      .inc();

    this.logger.debug('Authentication failure recorded', {
      method,
      reason,
      userAgent,
    });
  }

  /**
   * Record user session duration
   */
  recordSessionDuration(
    sessionType: string,
    duration: number,
    terminationReason: string,
  ): void {
    const durationSeconds = duration / 1000;
    this.sessionDuration
      .labels(sessionType, terminationReason)
      .observe(durationSeconds);

    this.logger.debug('Session duration recorded', {
      sessionType,
      durationMs: duration,
      terminationReason,
    });
  }

  /**
   * Record authorization check
   */
  recordAuthorizationCheck(
    resource: string,
    action: string,
    result: 'allowed' | 'denied',
    duration: number,
  ): void {
    const durationSeconds = duration / 1000;

    this.authorizationChecks.labels(resource, action, result).inc();
    this.authorizationDuration
      .labels(resource, action)
      .observe(durationSeconds);

    this.logger.debug('Authorization check recorded', {
      resource,
      action,
      result,
      durationMs: duration,
    });
  }

  /**
   * Record access denial
   */
  recordAccessDenial(resource: string, reason: string, userRole: string): void {
    this.accessDenials.labels(resource, reason, userRole).inc();

    this.logger.debug('Access denial recorded', {
      resource,
      reason,
      userRole,
    });
  }

  /**
   * Record privilege escalation attempt
   */
  recordPrivilegeEscalation(
    userRole: string,
    targetRole: string,
    result: 'success' | 'failure',
  ): void {
    this.privilegeEscalations.labels(userRole, targetRole, result).inc();

    this.logger.warn('Privilege escalation attempt recorded', {
      userRole,
      targetRole,
      result,
    });
  }

  /**
   * Record rate limit hit
   */
  recordRateLimitHit(
    endpoint: string,
    limitType: string,
    userId?: string,
  ): void {
    this.rateLimitHits.labels(endpoint, limitType, userId || 'anonymous').inc();

    this.logger.debug('Rate limit hit recorded', {
      endpoint,
      limitType,
      userId,
    });
  }

  /**
   * Record rate limit bypass attempt
   */
  recordRateLimitBypass(
    endpoint: string,
    method: string,
    sourceIp: string,
  ): void {
    this.rateLimitBypass.labels(endpoint, method, sourceIp).inc();

    this.logger.warn('Rate limit bypass attempt recorded', {
      endpoint,
      method,
      sourceIp,
    });
  }

  /**
   * Record throttled request
   */
  recordThrottledRequest(endpoint: string, throttleType: string): void {
    this.throttledRequests.labels(endpoint, throttleType).inc();

    this.logger.debug('Throttled request recorded', {
      endpoint,
      throttleType,
    });
  }

  /**
   * Update rate limit window utilization
   */
  updateRateLimitUtilization(
    endpoint: string,
    windowDuration: string,
    utilizationPercent: number,
  ): void {
    this.rateLimitWindowUtilization
      .labels(endpoint, windowDuration)
      .set(utilizationPercent);
  }

  /**
   * Record security event
   */
  recordSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    source: string,
  ): void {
    this.securityEvents.labels(eventType, severity, source).inc();

    this.logger.debug('Security event recorded', {
      eventType,
      severity,
      source,
    });

    // Emit event for real-time alerting
    this.eventEmitter.emit('security.event', {
      type: eventType,
      severity,
      source,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Record threat detection
   */
  recordThreatDetection(
    threatType: string,
    confidence: 'low' | 'medium' | 'high',
    mitigation: string,
  ): void {
    this.threatDetections.labels(threatType, confidence, mitigation).inc();

    this.logger.warn('Threat detection recorded', {
      threatType,
      confidence,
      mitigation,
    });

    // Emit high-priority event for immediate response
    this.eventEmitter.emit('security.threat', {
      type: threatType,
      confidence,
      mitigation,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Record vulnerability scan
   */
  recordVulnerabilityScan(
    scanType: string,
    result: 'clean' | 'vulnerabilities_found',
    severity?: 'low' | 'medium' | 'high' | 'critical',
  ): void {
    this.vulnerabilityScans.labels(scanType, result, severity || 'none').inc();

    this.logger.debug('Vulnerability scan recorded', {
      scanType,
      result,
      severity,
    });
  }

  /**
   * Record compliance check
   */
  recordComplianceCheck(
    framework: string,
    control: string,
    result: 'compliant' | 'non_compliant',
  ): void {
    this.complianceChecks.labels(framework, control, result).inc();

    this.logger.debug('Compliance check recorded', {
      framework,
      control,
      result,
    });
  }

  /**
   * Record tracing span
   */
  recordTracingSpan(
    service: string,
    operation: string,
    status: 'success' | 'error',
  ): void {
    this.tracingSpans.labels(service, operation, status).inc();

    this.logger.debug('Tracing span recorded', {
      service,
      operation,
      status,
    });
  }

  /**
   * Record tracing error
   */
  recordTracingError(service: string, errorType: string): void {
    this.tracingErrors.labels(service, errorType).inc();

    this.logger.debug('Tracing error recorded', {
      service,
      errorType,
    });
  }

  /**
   * Record log event
   */
  recordLogEvent(
    level: string,
    component: string,
    correlationId?: string,
  ): void {
    this.logEvents.labels(level, component, correlationId || 'none').inc();
  }

  /**
   * Record alert triggered
   */
  recordAlertTriggered(
    alertType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    channel: string,
  ): void {
    this.alertsTriggered.labels(alertType, severity, channel).inc();

    this.logger.debug('Alert triggered recorded', {
      alertType,
      severity,
      channel,
    });

    // Emit alert event
    this.eventEmitter.emit('alert.triggered', {
      type: alertType,
      severity,
      channel,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Record user interaction
   */
  recordUserInteraction(
    interactionType: string,
    feature: string,
    userSegment: string,
  ): void {
    this.userInteractions.labels(interactionType, feature, userSegment).inc();

    this.logger.debug('User interaction recorded', {
      interactionType,
      feature,
      userSegment,
    });
  }

  /**
   * Record feature usage
   */
  recordFeatureUsage(feature: string, version: string, userType: string): void {
    this.featureUsage.labels(feature, version, userType).inc();

    this.logger.debug('Feature usage recorded', {
      feature,
      version,
      userType,
    });
  }

  /**
   * Record business process duration
   */
  recordBusinessProcess(
    processName: string,
    processVersion: string,
    result: 'success' | 'failure',
    duration: number,
  ): void {
    const durationSeconds = duration / 1000;

    this.businessProcessDuration
      .labels(processName, processVersion, result)
      .observe(durationSeconds);

    this.logger.debug('Business process recorded', {
      processName,
      processVersion,
      result,
      durationMs: duration,
    });
  }

  /**
   * Update revenue metrics
   */
  updateRevenueMetrics(
    metricType: string,
    value: number,
    currency: string,
    period: string,
  ): void {
    this.revenueMetrics.labels(metricType, currency, period).set(value);

    this.logger.debug('Revenue metrics updated', {
      metricType,
      value,
      currency,
      period,
    });
  }

  /**
   * Get comprehensive metrics summary
   */
  async getMetricsSummary(): Promise<{
    security: any;
    performance: any;
    business: any;
    observability: any;
  }> {
    const operationId = `metrics_summary_${Date.now()}_${uuidv4().substring(0, 8)}`;
    this.logger.debug(`[${operationId}] Generating metrics summary`);

    try {
      const metricsString = await this.getPrometheusMetrics();
      const lines = metricsString.split('\n');

      const categorizeMetric = (line: string) => {
        if (
          line.includes('security_') ||
          line.includes('auth_') ||
          line.includes('rate_limit_') ||
          line.includes('threat_')
        ) {
          return 'security';
        }
        if (
          line.includes('duration') ||
          line.includes('latency') ||
          line.includes('response_time')
        ) {
          return 'performance';
        }
        if (
          line.includes('user_') ||
          line.includes('feature_') ||
          line.includes('business_') ||
          line.includes('revenue_')
        ) {
          return 'business';
        }
        if (
          line.includes('tracing_') ||
          line.includes('log_') ||
          line.includes('alert_')
        ) {
          return 'observability';
        }
        return 'other';
      };

      const summary = {
        security: { total: 0, categories: [] },
        performance: { total: 0, categories: [] },
        business: { total: 0, categories: [] },
        observability: { total: 0, categories: [] },
      };

      lines.forEach((line) => {
        if (line.startsWith('bytebot_agent_')) {
          const category = categorizeMetric(line);
          if (category !== 'other' && summary[category]) {
            summary[category].total++;
          }
        }
      });

      this.logger.debug(`[${operationId}] Metrics summary generated`, {
        security: summary.security.total,
        performance: summary.performance.total,
        business: summary.business.total,
        observability: summary.observability.total,
      });

      return summary;
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to generate metrics summary`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
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

  /**
   * Record health check metric
   */
  recordHealthCheck(
    service: string,
    isHealthy: boolean,
    timestamp: number,
  ): void {
    try {
      // Record using the existing API metrics with health-specific labels
      this.httpRequestsTotal.inc({
        method: 'GET',
        route: '/health/' + service,
        status_code: isHealthy ? '200' : '500',
      });

      this.logger.debug('Health check metric recorded', {
        service,
        isHealthy,
        timestamp,
      });
    } catch (error) {
      this.logger.warn('Failed to record health check metric', {
        service,
        isHealthy,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Record dashboard access metric
   */
  recordDashboardAccess(operationId: string): void {
    try {
      // Record using existing API metrics with dashboard-specific labels
      this.httpRequestsTotal.inc({
        method: 'GET',
        route: '/health/dashboard',
        status_code: '200',
      });

      this.logger.debug('Dashboard access metric recorded', { operationId });
    } catch (error) {
      this.logger.warn('Failed to record dashboard access metric', {
        operationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
