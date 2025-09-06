/**
 * Metrics Collection Service
 *
 * Core service for collecting and exposing application metrics using Prometheus
 * client library. Provides comprehensive observability for the Bytebot platform
 * with custom business metrics and performance tracking.
 *
 * Features:
 * - Prometheus metrics collection and export
 * - Custom application metrics (task processing, API performance)
 * - Computer-use operation metrics
 * - WebSocket connection tracking
 * - Database performance metrics
 * - System resource monitoring
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  register,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
  Summary,
} from 'prom-client';

/**
 * Metrics collection service for Prometheus integration
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  // API Request Metrics
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly httpRequestsInFlight: Gauge<string>;

  // Task Processing Metrics
  private readonly taskProcessingDuration: Histogram<string>;
  private readonly taskProcessingTotal: Counter<string>;
  private readonly tasksInProgress: Gauge<string>;

  // Computer-use Operation Metrics
  private readonly computerUseOperationsTotal: Counter<string>;
  private readonly computerUseOperationDuration: Histogram<string>;
  private readonly computerUseErrors: Counter<string>;

  // WebSocket Connection Metrics
  private readonly websocketConnections: Gauge<string>;
  private readonly websocketMessages: Counter<string>;

  // Database Metrics
  private readonly databaseConnections: Gauge<string>;
  private readonly databaseQueryDuration: Histogram<string>;
  private readonly databaseErrors: Counter<string>;

  // Cache Metrics
  private readonly cacheOperationsTotal: Counter<string>;
  private readonly cacheOperationDuration: Histogram<string>;
  private readonly cacheHitRate: Gauge<string>;

  // Compression Metrics
  private readonly compressionOperationsTotal: Counter<string>;
  private readonly compressionRatio: Histogram<string>;
  private readonly compressionDuration: Histogram<string>;

  // System Metrics
  private readonly memoryUsage: Gauge<string>;
  private readonly cpuUsage: Gauge<string>;

  constructor() {
    this.logger.log('Metrics Service initializing with Prometheus client');

    // Enable default system metrics collection
    collectDefaultMetrics({
      prefix: 'bytebot_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });

    // Initialize API Request Metrics
    this.httpRequestsTotal = new Counter({
      name: 'bytebot_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'bytebot_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    });

    this.httpRequestsInFlight = new Gauge({
      name: 'bytebot_http_requests_in_flight',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['method', 'route'],
    });

    // Initialize Task Processing Metrics
    this.taskProcessingDuration = new Histogram({
      name: 'bytebot_task_processing_duration_seconds',
      help: 'Task processing duration in seconds',
      labelNames: ['task_type', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 300],
    });

    this.taskProcessingTotal = new Counter({
      name: 'bytebot_task_processing_total',
      help: 'Total number of processed tasks',
      labelNames: ['task_type', 'status'],
    });

    this.tasksInProgress = new Gauge({
      name: 'bytebot_tasks_in_progress',
      help: 'Number of tasks currently being processed',
      labelNames: ['task_type'],
    });

    // Initialize Computer-use Operation Metrics
    this.computerUseOperationsTotal = new Counter({
      name: 'bytebot_computer_use_operations_total',
      help: 'Total number of computer-use operations',
      labelNames: ['operation_type', 'status'],
    });

    this.computerUseOperationDuration = new Histogram({
      name: 'bytebot_computer_use_operation_duration_seconds',
      help: 'Computer-use operation duration in seconds',
      labelNames: ['operation_type', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
    });

    this.computerUseErrors = new Counter({
      name: 'bytebot_computer_use_errors_total',
      help: 'Total number of computer-use operation errors',
      labelNames: ['operation_type', 'error_type'],
    });

    // Initialize WebSocket Metrics
    this.websocketConnections = new Gauge({
      name: 'bytebot_websocket_connections',
      help: 'Number of active WebSocket connections',
      labelNames: ['connection_type'],
    });

    this.websocketMessages = new Counter({
      name: 'bytebot_websocket_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['direction', 'message_type'],
    });

    // Initialize Database Metrics
    this.databaseConnections = new Gauge({
      name: 'bytebot_database_connections',
      help: 'Number of active database connections',
      labelNames: ['database', 'state'],
    });

    this.databaseQueryDuration = new Histogram({
      name: 'bytebot_database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    this.databaseErrors = new Counter({
      name: 'bytebot_database_errors_total',
      help: 'Total number of database errors',
      labelNames: ['operation', 'error_type'],
    });

    // Initialize Cache Metrics
    this.cacheOperationsTotal = new Counter({
      name: 'bytebot_cache_operations_total',
      help: 'Total number of cache operations',
      labelNames: ['operation', 'result'],
    });

    this.cacheOperationDuration = new Histogram({
      name: 'bytebot_cache_operation_duration_seconds',
      help: 'Cache operation duration in seconds',
      labelNames: ['operation', 'result'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    });

    this.cacheHitRate = new Gauge({
      name: 'bytebot_cache_hit_rate',
      help: 'Cache hit rate percentage',
      labelNames: ['namespace'],
    });

    // Initialize Compression Metrics
    this.compressionOperationsTotal = new Counter({
      name: 'bytebot_compression_operations_total',
      help: 'Total number of compression operations',
      labelNames: ['algorithm', 'result'],
    });

    this.compressionRatio = new Histogram({
      name: 'bytebot_compression_ratio',
      help: 'Compression ratio (compressed_size / original_size)',
      labelNames: ['algorithm'],
      buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    });

    this.compressionDuration = new Histogram({
      name: 'bytebot_compression_duration_seconds',
      help: 'Compression operation duration in seconds',
      labelNames: ['algorithm'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    });

    // Initialize System Metrics
    this.memoryUsage = new Gauge({
      name: 'bytebot_memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
    });

    this.cpuUsage = new Gauge({
      name: 'bytebot_cpu_usage_percent',
      help: 'CPU usage percentage',
    });

    // Start periodic system metrics collection
    this.startSystemMetricsCollection();

    this.logger.log('Metrics Service initialized - All metrics registered');
  }

  /**
   * Get Prometheus-formatted metrics
   *
   * @returns Prometheus metrics string
   */
  async getPrometheusMetrics(): Promise<string> {
    const operationId = `prometheus_${Date.now()}`;
    this.logger.debug(`[${operationId}] Collecting Prometheus metrics`);

    try {
      // Update system metrics before export
      this.updateSystemMetrics();

      const metrics = await register.metrics();
      this.logger.debug(
        `[${operationId}] Prometheus metrics collected successfully`,
      );
      return metrics;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[${operationId}] Failed to collect Prometheus metrics: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Record API request metrics
   *
   * @param method HTTP method
   * @param route Request route
   * @param statusCode HTTP status code
   * @param duration Request duration in milliseconds
   */
  recordApiRequestDuration(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ): void {
    const durationSeconds = duration / 1000;

    this.httpRequestsTotal.labels(method, route, statusCode.toString()).inc();

    this.httpRequestDuration
      .labels(method, route, statusCode.toString())
      .observe(durationSeconds);

    this.logger.debug('API request metrics recorded', {
      method,
      route,
      statusCode,
      durationMs: duration,
    });
  }

  /**
   * Record request in flight (start of request)
   *
   * @param method HTTP method
   * @param route Request route
   */
  recordRequestStart(method: string, route: string): void {
    this.httpRequestsInFlight.labels(method, route).inc();
  }

  /**
   * Record request completion (end of request)
   *
   * @param method HTTP method
   * @param route Request route
   */
  recordRequestEnd(method: string, route: string): void {
    this.httpRequestsInFlight.labels(method, route).dec();
  }

  /**
   * Record task processing metrics
   *
   * @param taskType Type of task being processed
   * @param status Task completion status
   * @param duration Processing duration in milliseconds
   */
  recordTaskProcessing(
    taskType: string,
    status: 'completed' | 'failed' | 'cancelled',
    duration: number,
  ): void {
    const durationSeconds = duration / 1000;

    this.taskProcessingTotal.labels(taskType, status).inc();
    this.taskProcessingDuration
      .labels(taskType, status)
      .observe(durationSeconds);

    this.logger.debug('Task processing metrics recorded', {
      taskType,
      status,
      durationMs: duration,
    });
  }

  /**
   * Update task in progress count
   *
   * @param taskType Type of task
   * @param count Current count of tasks in progress
   */
  setTasksInProgress(taskType: string, count: number): void {
    this.tasksInProgress.labels(taskType).set(count);
  }

  /**
   * Record computer-use operation metrics
   *
   * @param operationType Type of computer operation
   * @param status Operation completion status
   * @param duration Operation duration in milliseconds
   */
  recordComputerUseOperation(
    operationType: string,
    status: 'success' | 'error',
    duration: number,
  ): void {
    const durationSeconds = duration / 1000;

    this.computerUseOperationsTotal.labels(operationType, status).inc();
    this.computerUseOperationDuration
      .labels(operationType, status)
      .observe(durationSeconds);

    this.logger.debug('Computer-use operation metrics recorded', {
      operationType,
      status,
      durationMs: duration,
    });
  }

  /**
   * Record computer-use error
   *
   * @param operationType Type of computer operation
   * @param errorType Type of error encountered
   */
  recordComputerUseError(operationType: string, errorType: string): void {
    this.computerUseErrors.labels(operationType, errorType).inc();

    this.logger.debug('Computer-use error recorded', {
      operationType,
      errorType,
    });
  }

  /**
   * Update WebSocket connection count
   *
   * @param connectionType Type of WebSocket connection
   * @param count Current number of connections
   */
  setWebSocketConnections(connectionType: string, count: number): void {
    this.websocketConnections.labels(connectionType).set(count);
  }

  /**
   * Record WebSocket message
   *
   * @param direction Message direction (incoming/outgoing)
   * @param messageType Type of message
   */
  recordWebSocketMessage(
    direction: 'incoming' | 'outgoing',
    messageType: string,
  ): void {
    this.websocketMessages.labels(direction, messageType).inc();
  }

  /**
   * Update database connection metrics
   *
   * @param database Database name
   * @param state Connection state (active/idle/waiting)
   * @param count Number of connections
   */
  setDatabaseConnections(database: string, state: string, count: number): void {
    this.databaseConnections.labels(database, state).set(count);
  }

  /**
   * Record database query metrics
   *
   * @param operation Database operation type
   * @param table Database table name
   * @param duration Query duration in milliseconds
   */
  recordDatabaseQuery(
    operation: string,
    table: string,
    duration: number,
  ): void {
    const durationSeconds = duration / 1000;

    this.databaseQueryDuration
      .labels(operation, table)
      .observe(durationSeconds);

    this.logger.debug('Database query metrics recorded', {
      operation,
      table,
      durationMs: duration,
    });
  }

  /**
   * Record database error
   *
   * @param operation Database operation type
   * @param errorType Type of database error
   */
  recordDatabaseError(operation: string, errorType: string): void {
    this.databaseErrors.labels(operation, errorType).inc();

    this.logger.debug('Database error recorded', {
      operation,
      errorType,
    });
  }

  /**
   * Record cache operation metrics
   *
   * @param operation Cache operation type (get, set, del, etc.)
   * @param result Operation result (hit, miss, success, error)
   * @param duration Operation duration in milliseconds
   */
  recordCacheOperation(
    operation: string,
    result: 'hit' | 'miss' | 'success' | 'error',
    duration: number,
  ): void {
    const durationSeconds = duration / 1000;

    this.cacheOperationsTotal.labels(operation, result).inc();
    this.cacheOperationDuration
      .labels(operation, result)
      .observe(durationSeconds);

    this.logger.debug('Cache operation metrics recorded', {
      operation,
      result,
      durationMs: duration,
    });
  }

  /**
   * Update cache hit rate
   *
   * @param namespace Cache namespace
   * @param hitRate Hit rate percentage (0-100)
   */
  setCacheHitRate(namespace: string, hitRate: number): void {
    this.cacheHitRate.labels(namespace).set(hitRate);
  }

  /**
   * Record compression operation metrics
   *
   * @param algorithm Compression algorithm used
   * @param originalSize Original size in bytes
   * @param compressedSize Compressed size in bytes
   * @param duration Compression duration in milliseconds
   */
  recordCompressionMetrics(
    algorithm: string,
    originalSize: number,
    compressedSize: number,
    duration: number,
  ): void {
    const durationSeconds = duration / 1000;
    const ratio = originalSize > 0 ? compressedSize / originalSize : 1;
    const result = ratio < 1 ? 'success' : 'skipped';

    this.compressionOperationsTotal.labels(algorithm, result).inc();
    this.compressionRatio.labels(algorithm).observe(ratio);
    this.compressionDuration.labels(algorithm).observe(durationSeconds);

    this.logger.debug('Compression metrics recorded', {
      algorithm,
      originalSize,
      compressedSize,
      ratio: ratio.toFixed(3),
      durationMs: duration,
    });
  }

  /**
   * Start periodic system metrics collection
   */
  private startSystemMetricsCollection(): void {
    this.logger.debug('Starting periodic system metrics collection');

    // Update system metrics every 15 seconds
    setInterval(() => {
      this.updateSystemMetrics();
    }, 15000);
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
    register.clear();
    this.logger.debug('All metrics cleared');
  }
}
