/**
 * Database Metrics Service - Comprehensive Database Performance Monitoring
 * Provides Prometheus-compatible metrics for database operations, connection pooling,
 * and performance monitoring in the Bytebot API platform
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database.service';
import { ConnectionPoolService } from '../connection-pool.service';
import { QueryLoggingInterceptor } from '../interceptors/query-logging.interceptor';

export interface DatabaseMetricsSnapshot {
  // Connection Pool Metrics
  connectionPool: {
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
    waitingRequests: number;
    utilization: number;
    exhausted: boolean;
    leakDetected: boolean;
    peakConnections: number;
    averageWaitTime: number;
    totalAcquisitions: number;
    totalTimeouts: number;
  };

  // Query Performance Metrics
  queryPerformance: {
    totalQueries: number;
    successfulQueries: number;
    failedQueries: number;
    slowQueries: number;
    averageDuration: number;
    medianDuration: number;
    p95Duration: number;
    p99Duration: number;
    queriesPerSecond: number;
    errorRate: number;
  };

  // Database Health Metrics
  health: {
    isHealthy: boolean;
    uptime: number;
    lastHealthCheck: Date;
    consecutiveFailures: number;
    healthCheckDuration: number;
    errorRate: number;
  };

  // Database Transaction Metrics
  transactions: {
    activeTransactions: number;
    totalTransactions: number;
    completedTransactions: number;
    rolledBackTransactions: number;
    averageTransactionDuration: number;
    longestTransaction: number;
  };

  // System Resource Metrics
  resources: {
    memoryUsage: number; // MB
    cpuUsage: number; // Percentage
    diskUsage: number; // Percentage
    networkLatency: number; // ms
  };

  timestamp: Date;
}

export interface PrometheusMetrics {
  // Counter metrics (always increasing)
  database_queries_total: Record<string, number>;
  database_errors_total: Record<string, number>;
  database_connections_created_total: number;
  database_transactions_total: Record<string, number>;

  // Gauge metrics (can go up or down)
  database_connections_active: number;
  database_connections_idle: number;
  database_connections_waiting: number;
  database_pool_utilization_percent: number;
  database_health_status: number; // 1 = healthy, 0 = unhealthy

  // Histogram metrics (duration distributions)
  database_query_duration_seconds: {
    buckets: Record<string, number>;
    count: number;
    sum: number;
  };
  database_connection_wait_duration_seconds: {
    buckets: Record<string, number>;
    count: number;
    sum: number;
  };

  // Summary metrics (quantiles)
  database_query_duration_quantiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

@Injectable()
export class DatabaseMetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseMetricsService.name);
  private metricsCollectionInterval: NodeJS.Timeout;
  private currentMetrics: DatabaseMetricsSnapshot;
  private prometheusMetrics: PrometheusMetrics;
  private metricsHistory: DatabaseMetricsSnapshot[] = [];
  private readonly maxHistorySize: number = 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly connectionPoolService: ConnectionPoolService,
    private readonly queryLoggingInterceptor: QueryLoggingInterceptor,
  ) {
    this.initializeMetrics();

    this.logger.log('Database metrics service initialized', {
      metricsEnabled: true,
      prometheusExportEnabled: true,
    });
  }

  async onModuleInit() {
    this.logger.log('Starting database metrics collection');

    // Start periodic metrics collection
    this.startMetricsCollection();

    // Perform initial metrics collection
    await this.collectMetrics();

    this.logger.log('Database metrics service fully operational');
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down database metrics service');

    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }

    this.logger.log('Database metrics service shutdown complete');
  }

  /**
   * Get current database metrics snapshot
   */
  getCurrentMetrics(): DatabaseMetricsSnapshot {
    return { ...this.currentMetrics };
  }

  /**
   * Get Prometheus-compatible metrics
   */
  getPrometheusMetrics(): PrometheusMetrics {
    return { ...this.prometheusMetrics };
  }

  /**
   * Get metrics formatted for Prometheus exposition
   */
  getPrometheusExposition(): string {
    const metrics = this.prometheusMetrics;
    const lines: string[] = [];

    // Helper function to add metric
    const addMetric = (name: string, value: number, labels = '', help = '') => {
      if (help) {
        lines.push(`# HELP ${name} ${help}`);
        lines.push(`# TYPE ${name} gauge`);
      }
      lines.push(`${name}${labels} ${value}`);
    };

    // Connection pool metrics
    addMetric(
      'bytebot_database_connections_active',
      metrics.database_connections_active,
      '',
      'Currently active database connections',
    );

    addMetric(
      'bytebot_database_connections_idle',
      metrics.database_connections_idle,
      '',
      'Currently idle database connections',
    );

    addMetric(
      'bytebot_database_connections_waiting',
      metrics.database_connections_waiting,
      '',
      'Number of connection requests waiting',
    );

    addMetric(
      'bytebot_database_pool_utilization_percent',
      metrics.database_pool_utilization_percent,
      '',
      'Database connection pool utilization percentage',
    );

    // Query metrics
    Object.entries(metrics.database_queries_total).forEach(([type, count]) => {
      addMetric(
        'bytebot_database_queries_total',
        count,
        `{type="${type}"}`,
        type === 'SELECT' ? 'Total database queries executed by type' : '',
      );
    });

    Object.entries(metrics.database_errors_total).forEach(([type, count]) => {
      addMetric(
        'bytebot_database_errors_total',
        count,
        `{type="${type}"}`,
        type === 'connection' ? 'Total database errors by type' : '',
      );
    });

    // Health metrics
    addMetric(
      'bytebot_database_health_status',
      metrics.database_health_status,
      '',
      'Database health status (1 = healthy, 0 = unhealthy)',
    );

    // Query duration histogram
    const queryDuration = metrics.database_query_duration_seconds;
    lines.push(
      '# HELP bytebot_database_query_duration_seconds Database query execution time',
    );
    lines.push('# TYPE bytebot_database_query_duration_seconds histogram');

    Object.entries(queryDuration.buckets).forEach(([le, count]) => {
      lines.push(
        `bytebot_database_query_duration_seconds_bucket{le="${le}"} ${count}`,
      );
    });
    lines.push(
      `bytebot_database_query_duration_seconds_count ${queryDuration.count}`,
    );
    lines.push(
      `bytebot_database_query_duration_seconds_sum ${queryDuration.sum}`,
    );

    // Query duration quantiles
    Object.entries(metrics.database_query_duration_quantiles).forEach(
      ([quantile, value]) => {
        const q = quantile.replace('p', '0.');
        addMetric(
          'bytebot_database_query_duration_quantile',
          value,
          `{quantile="${q}"}`,
          quantile === 'p50' ? 'Database query duration quantiles' : '',
        );
      },
    );

    return lines.join('\n') + '\n';
  }

  /**
   * Get detailed performance report
   */
  getPerformanceReport() {
    const current = this.currentMetrics;
    const historical = this.metricsHistory.slice(-60); // Last hour (1 minute intervals)

    return {
      current: current,
      trends: this.calculateTrends(historical),
      alerts: this.generatePerformanceAlerts(current),
      recommendations: this.generateRecommendations(current),
      timestamp: new Date(),
    };
  }

  /**
   * Force metrics collection
   */
  async collectMetrics(): Promise<DatabaseMetricsSnapshot> {
    const operationId = this.generateOperationId();

    try {
      this.logger.debug(`[${operationId}] Collecting database metrics`);

      // Collect metrics from all sources
      const [databaseHealth, poolMetrics, queryStats, systemResources] =
        await Promise.all([
          this.collectHealthMetrics(),
          this.collectConnectionPoolMetrics(),
          this.collectQueryMetrics(),
          this.collectSystemResourceMetrics(),
        ]);

      // Combine all metrics
      this.currentMetrics = {
        connectionPool: poolMetrics,
        queryPerformance: queryStats,
        health: databaseHealth,
        transactions: await this.collectTransactionMetrics(),
        resources: systemResources,
        timestamp: new Date(),
      };

      // Update Prometheus metrics
      this.updatePrometheusMetrics();

      // Add to history
      this.addToHistory(this.currentMetrics);

      this.logger.debug(
        `[${operationId}] Database metrics collected successfully`,
      );

      return this.currentMetrics;
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to collect database metrics`, {
        error: error instanceof Error ? error.message : String(error),
        operationId,
      });

      throw error;
    }
  }

  /**
   * Initialize metrics structures
   */
  private initializeMetrics() {
    this.currentMetrics = {
      connectionPool: {
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0,
        waitingRequests: 0,
        utilization: 0,
        exhausted: false,
        leakDetected: false,
        peakConnections: 0,
        averageWaitTime: 0,
        totalAcquisitions: 0,
        totalTimeouts: 0,
      },
      queryPerformance: {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        slowQueries: 0,
        averageDuration: 0,
        medianDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        queriesPerSecond: 0,
        errorRate: 0,
      },
      health: {
        isHealthy: true,
        uptime: 0,
        lastHealthCheck: new Date(),
        consecutiveFailures: 0,
        healthCheckDuration: 0,
        errorRate: 0,
      },
      transactions: {
        activeTransactions: 0,
        totalTransactions: 0,
        completedTransactions: 0,
        rolledBackTransactions: 0,
        averageTransactionDuration: 0,
        longestTransaction: 0,
      },
      resources: {
        memoryUsage: 0,
        cpuUsage: 0,
        diskUsage: 0,
        networkLatency: 0,
      },
      timestamp: new Date(),
    };

    this.initializePrometheusMetrics();
  }

  /**
   * Initialize Prometheus metrics structure
   */
  private initializePrometheusMetrics() {
    this.prometheusMetrics = {
      database_queries_total: {
        SELECT: 0,
        INSERT: 0,
        UPDATE: 0,
        DELETE: 0,
        UNKNOWN: 0,
      },
      database_errors_total: {
        connection: 0,
        query: 0,
        timeout: 0,
        transaction: 0,
      },
      database_connections_created_total: 0,
      database_transactions_total: {
        committed: 0,
        rolled_back: 0,
      },
      database_connections_active: 0,
      database_connections_idle: 0,
      database_connections_waiting: 0,
      database_pool_utilization_percent: 0,
      database_health_status: 1,
      database_query_duration_seconds: {
        buckets: {
          '0.001': 0, // 1ms
          '0.005': 0, // 5ms
          '0.01': 0, // 10ms
          '0.05': 0, // 50ms
          '0.1': 0, // 100ms
          '0.5': 0, // 500ms
          '1.0': 0, // 1s
          '2.5': 0, // 2.5s
          '5.0': 0, // 5s
          '10.0': 0, // 10s
          '+Inf': 0,
        },
        count: 0,
        sum: 0,
      },
      database_connection_wait_duration_seconds: {
        buckets: {
          '0.001': 0,
          '0.01': 0,
          '0.1': 0,
          '1.0': 0,
          '5.0': 0,
          '+Inf': 0,
        },
        count: 0,
        sum: 0,
      },
      database_query_duration_quantiles: {
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
      },
    };
  }

  /**
   * Start periodic metrics collection
   */
  private startMetricsCollection() {
    const interval = this.configService.get<number>(
      'DB_METRICS_COLLECTION_INTERVAL',
      60000, // 1 minute
    );

    this.metricsCollectionInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        this.logger.error('Scheduled metrics collection failed', error);
      }
    }, interval);

    this.logger.debug('Metrics collection started', { interval });
  }

  /**
   * Collect database health metrics
   */
  private async collectHealthMetrics() {
    const healthStatus = await this.databaseService.getHealthStatus();

    return {
      isHealthy: healthStatus.isHealthy,
      uptime: healthStatus.uptime,
      lastHealthCheck: healthStatus.lastHealthCheck,
      consecutiveFailures: 0, // Would need to track this
      healthCheckDuration: 0, // Would need to measure this
      errorRate: 0, // Would calculate from error history
    };
  }

  /**
   * Collect connection pool metrics
   */
  private async collectConnectionPoolMetrics() {
    const poolMetrics = this.connectionPoolService.getPoolMetrics();

    return {
      activeConnections: poolMetrics.active,
      idleConnections: poolMetrics.idle,
      totalConnections: poolMetrics.total,
      waitingRequests: poolMetrics.waiting,
      utilization: poolMetrics.utilization,
      exhausted: poolMetrics.exhausted,
      leakDetected: poolMetrics.leakDetected,
      peakConnections: poolMetrics.peakConnections,
      averageWaitTime: poolMetrics.waitTimeMs,
      totalAcquisitions: poolMetrics.totalRequests,
      totalTimeouts: poolMetrics.totalTimeouts,
    };
  }

  /**
   * Collect query performance metrics
   */
  private async collectQueryMetrics() {
    const queryStats = this.queryLoggingInterceptor.getQueryStatistics();

    // Calculate additional metrics
    const queryMetrics = this.queryLoggingInterceptor.getQueryMetrics();
    const durations = queryMetrics
      .filter((m) => m.success)
      .map((m) => m.duration)
      .sort((a, b) => a - b);

    const medianDuration =
      durations.length > 0 ? durations[Math.floor(durations.length / 2)] : 0;

    const p95Duration =
      durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0;

    const p99Duration =
      durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0;

    return {
      totalQueries: queryStats.totalQueries,
      successfulQueries: queryStats.successfulQueries,
      failedQueries: queryStats.failedQueries,
      slowQueries: queryStats.slowQueries,
      averageDuration: queryStats.averageDuration,
      medianDuration,
      p95Duration,
      p99Duration,
      queriesPerSecond: queryStats.queriesPerMinute / 60,
      errorRate: queryStats.errorRate,
    };
  }

  /**
   * Collect transaction metrics (placeholder implementation)
   */
  private async collectTransactionMetrics() {
    // This would require integration with database transaction monitoring
    return {
      activeTransactions: 0,
      totalTransactions: 0,
      completedTransactions: 0,
      rolledBackTransactions: 0,
      averageTransactionDuration: 0,
      longestTransaction: 0,
    };
  }

  /**
   * Collect system resource metrics
   */
  private async collectSystemResourceMetrics() {
    // This would require system monitoring integration
    return {
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      cpuUsage: 0, // Would need process CPU monitoring
      diskUsage: 0, // Would need disk space monitoring
      networkLatency: 0, // Would measure network latency to database
    };
  }

  /**
   * Update Prometheus metrics from current snapshot
   */
  private updatePrometheusMetrics() {
    const current = this.currentMetrics;

    // Update gauge metrics
    this.prometheusMetrics.database_connections_active =
      current.connectionPool.activeConnections;
    this.prometheusMetrics.database_connections_idle =
      current.connectionPool.idleConnections;
    this.prometheusMetrics.database_connections_waiting =
      current.connectionPool.waitingRequests;
    this.prometheusMetrics.database_pool_utilization_percent =
      current.connectionPool.utilization;
    this.prometheusMetrics.database_health_status = current.health.isHealthy
      ? 1
      : 0;

    // Update query duration quantiles
    this.prometheusMetrics.database_query_duration_quantiles = {
      p50: current.queryPerformance.medianDuration / 1000, // Convert to seconds
      p90: current.queryPerformance.medianDuration / 1000, // Would calculate from actual data
      p95: current.queryPerformance.p95Duration / 1000,
      p99: current.queryPerformance.p99Duration / 1000,
    };
  }

  /**
   * Add metrics to historical data
   */
  private addToHistory(metrics: DatabaseMetricsSnapshot) {
    this.metricsHistory.push(metrics);

    // Maintain history size
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(historical: DatabaseMetricsSnapshot[]) {
    if (historical.length < 2) return null;

    const latest = historical[historical.length - 1];
    const previous = historical[0];

    return {
      queryPerformance: {
        averageDurationTrend: this.calculateTrend(
          previous.queryPerformance.averageDuration,
          latest.queryPerformance.averageDuration,
        ),
        errorRateTrend: this.calculateTrend(
          previous.queryPerformance.errorRate,
          latest.queryPerformance.errorRate,
        ),
        throughputTrend: this.calculateTrend(
          previous.queryPerformance.queriesPerSecond,
          latest.queryPerformance.queriesPerSecond,
        ),
      },
      connectionPool: {
        utilizationTrend: this.calculateTrend(
          previous.connectionPool.utilization,
          latest.connectionPool.utilization,
        ),
      },
    };
  }

  /**
   * Calculate trend between two values
   */
  private calculateTrend(
    previous: number,
    current: number,
  ): 'up' | 'down' | 'stable' {
    const threshold = 0.05; // 5% threshold
    const change = previous > 0 ? (current - previous) / previous : 0;

    if (change > threshold) return 'up';
    if (change < -threshold) return 'down';
    return 'stable';
  }

  /**
   * Generate performance alerts
   */
  private generatePerformanceAlerts(
    metrics: DatabaseMetricsSnapshot,
  ): string[] {
    const alerts: string[] = [];

    if (metrics.connectionPool.utilization > 85) {
      alerts.push('High connection pool utilization detected');
    }

    if (metrics.queryPerformance.errorRate > 5) {
      alerts.push('High database error rate detected');
    }

    if (metrics.queryPerformance.averageDuration > 1000) {
      alerts.push('High average query duration detected');
    }

    if (!metrics.health.isHealthy) {
      alerts.push('Database health check failing');
    }

    return alerts;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: DatabaseMetricsSnapshot): string[] {
    const recommendations: string[] = [];

    if (metrics.connectionPool.utilization > 80) {
      recommendations.push('Consider increasing connection pool size');
    }

    if (metrics.queryPerformance.slowQueries > 10) {
      recommendations.push('Review and optimize slow queries');
    }

    if (metrics.connectionPool.leakDetected) {
      recommendations.push('Investigate potential connection leaks');
    }

    return recommendations;
  }

  /**
   * Generate unique operation ID for tracking
   */
  private generateOperationId(): string {
    return `metrics_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
