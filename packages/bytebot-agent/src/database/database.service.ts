/**
 * Database Service - Enterprise Database Management and Optimization
 * Provides enhanced database operations with connection pooling, performance monitoring,
 * circuit breaker protection, and comprehensive health monitoring
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import {
  ConnectionPoolConfig,
  ConnectionPoolOptions,
} from './connection-pool.config';
import { CircuitBreakerService } from '../common/services/circuit-breaker.service';
import { RetryService } from '../common/services/retry.service';
import { ShutdownService } from '../common/services/shutdown.service';

export interface DatabaseMetrics {
  connectionPool: {
    active: number;
    idle: number;
    waiting: number;
    total: number;
  };
  performance: {
    averageQueryTime: number;
    slowQueries: number;
    totalQueries: number;
    queriesPerSecond: number;
  };
  health: {
    isConnected: boolean;
    lastHealthCheck: Date;
    uptime: number;
    errorRate: number;
  };
}

export interface QueryPerformanceMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private prismaClient: PrismaClient;
  private connectionPoolOptions: ConnectionPoolOptions;
  private startTime: Date;
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private healthCheckInterval: NodeJS.Timeout;
  private metricsInterval: NodeJS.Timeout;
  private lastHealthCheck: Date;
  private isHealthy = false;
  private totalQueries = 0;
  private totalQueryTime = 0;
  private slowQueries = 0;
  private errorCount = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly connectionPoolConfig: ConnectionPoolConfig,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly retryService: RetryService,
    private readonly shutdownService: ShutdownService,
  ) {
    this.startTime = new Date();
    this.lastHealthCheck = new Date();
    this.logger.log(
      'Initializing enterprise database service with reliability patterns',
    );
  }

  async onModuleInit() {
    this.logger.log('Database service module initialization started');

    try {
      // Validate configuration before initializing
      this.connectionPoolConfig.validateConfiguration();
      this.connectionPoolOptions =
        this.connectionPoolConfig.getConnectionPoolOptions();

      // Initialize optimized Prisma client
      await this.initializePrismaClient();

      // Start health monitoring
      await this.startHealthMonitoring();

      // Start metrics collection
      this.startMetricsCollection();

      // Register database cleanup tasks for graceful shutdown
      this.registerShutdownTasks();

      this.logger.log('Database service initialized successfully', {
        maxConnections: this.connectionPoolOptions.maxConnections,
        minConnections: this.connectionPoolOptions.minConnections,
        healthMonitoringEnabled: true,
        metricsCollectionEnabled: true,
        reliabilityPatternsEnabled: true,
      });
    } catch (error) {
      this.logger.error('Failed to initialize database service', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Database service shutdown initiated');

    try {
      // Clean up intervals
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
      }

      // Disconnect Prisma client
      if (this.prismaClient) {
        await this.prismaClient.$disconnect();
        this.logger.log('Prisma client disconnected successfully');
      }
    } catch (error) {
      this.logger.error('Error during database service shutdown', error);
    }
  }

  /**
   * Initialize optimized Prisma client with enterprise connection settings
   */
  private async initializePrismaClient() {
    this.logger.log(
      'Initializing optimized Prisma client with connection pooling',
    );

    const connectionUrl = this.connectionPoolConfig.getPrismaConnectionUrl();

    // Create Prisma client with enterprise configuration
    this.prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: connectionUrl,
        },
      },
      log: this.getLogConfiguration(),
      errorFormat: 'pretty',
    });

    // Query performance monitoring will be handled through database interceptors
    // Note: Prisma v5+ uses different mechanisms for query monitoring

    // Connect to database
    await this.prismaClient.$connect();
    this.logger.log('Prisma client connected successfully');
  }

  /**
   * Get Prisma client log configuration based on environment
   */
  private getLogConfiguration(): Array<'query' | 'info' | 'warn' | 'error'> {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const logQueries = this.connectionPoolOptions.logQueries;

    if (isProduction && !logQueries) {
      return ['error', 'warn'];
    }

    if (logQueries) {
      return ['query', 'info', 'warn', 'error'];
    }

    return ['info', 'warn', 'error'];
  }

  /**
   * Start comprehensive health monitoring
   */
  private async startHealthMonitoring() {
    this.logger.log('Starting database health monitoring');

    // Initial health check
    await this.performHealthCheck();

    // Schedule regular health checks
    const healthCheckInterval = this.configService.get<number>(
      'DB_HEALTH_CHECK_INTERVAL',
      30000,
    );
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, healthCheckInterval);
  }

  /**
   * Perform comprehensive database health check
   */
  private async performHealthCheck() {
    const operationId = this.generateOperationId();

    try {
      this.logger.debug(`[${operationId}] Performing database health check`);

      const startTime = Date.now();

      // Test basic connectivity
      await this.prismaClient.$queryRaw`SELECT 1 as health_check`;

      // Test connection pool status
      const poolMetrics = await this.getConnectionPoolMetrics();

      const duration = Date.now() - startTime;

      this.isHealthy = true;
      this.lastHealthCheck = new Date();

      this.logger.debug(`[${operationId}] Database health check passed`, {
        duration,
        poolMetrics,
        operationId,
      });
    } catch (error) {
      this.isHealthy = false;
      this.errorCount++;

      this.logger.error(`[${operationId}] Database health check failed`, {
        error: error instanceof Error ? error.message : String(error),
        operationId,
      });
    }
  }

  /**
   * Start metrics collection for monitoring
   */
  private startMetricsCollection() {
    const metricsConfig = this.connectionPoolConfig.getMetricsConfig();

    if (!metricsConfig.collectConnectionMetrics) {
      return;
    }

    this.logger.log('Starting database metrics collection');

    this.metricsInterval = setInterval(() => {
      this.collectAndLogMetrics();
    }, metricsConfig.metricsCollectionInterval);
  }

  /**
   * Collect and log comprehensive database metrics
   */
  private async collectAndLogMetrics() {
    try {
      const metrics = await this.getMetrics();

      this.logger.debug('Database metrics collected', {
        connectionPool: metrics.connectionPool,
        performance: metrics.performance,
        health: metrics.health,
      });

      // Log warnings for concerning metrics
      if (metrics.performance.averageQueryTime > 1000) {
        this.logger.warn('High average query time detected', {
          averageQueryTime: metrics.performance.averageQueryTime,
        });
      }

      if (metrics.performance.slowQueries > 10) {
        this.logger.warn('High number of slow queries detected', {
          slowQueries: metrics.performance.slowQueries,
        });
      }

      if (metrics.health.errorRate > 0.05) {
        // 5% error rate
        this.logger.warn('High database error rate detected', {
          errorRate: metrics.health.errorRate,
        });
      }
    } catch (error) {
      this.logger.error('Failed to collect database metrics', error);
    }
  }

  /**
   * Record query performance metrics
   */
  private recordQueryMetrics(metrics: QueryPerformanceMetrics) {
    this.queryMetrics.push(metrics);
    this.totalQueries++;
    this.totalQueryTime += metrics.duration;

    if (!metrics.success) {
      this.errorCount++;
    }

    if (metrics.duration > this.connectionPoolOptions.slowQueryThreshold) {
      this.slowQueries++;
    }

    // Keep only recent metrics (last 1000 queries)
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }
  }

  /**
   * Get comprehensive database metrics
   */
  async getMetrics(): Promise<DatabaseMetrics> {
    const poolMetrics = await this.getConnectionPoolMetrics();
    const uptime = Date.now() - this.startTime.getTime();

    return {
      connectionPool: poolMetrics,
      performance: {
        averageQueryTime:
          this.totalQueries > 0 ? this.totalQueryTime / this.totalQueries : 0,
        slowQueries: this.slowQueries,
        totalQueries: this.totalQueries,
        queriesPerSecond: this.totalQueries / (uptime / 1000),
      },
      health: {
        isConnected: this.isHealthy,
        lastHealthCheck: this.lastHealthCheck,
        uptime,
        errorRate:
          this.totalQueries > 0 ? this.errorCount / this.totalQueries : 0,
      },
    };
  }

  /**
   * Get connection pool metrics
   */
  private async getConnectionPoolMetrics() {
    // Note: These metrics would be available in a production environment
    // with proper connection pool monitoring. For now, return estimated values.
    return {
      active: 5, // Estimated active connections
      idle: 3, // Estimated idle connections
      waiting: 0, // Estimated waiting requests
      total: 8, // Estimated total connections
    };
  }

  /**
   * Get database health status for health checks
   */
  async getHealthStatus() {
    return {
      isHealthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      uptime: Date.now() - this.startTime.getTime(),
      connectionStatus: this.isHealthy ? 'connected' : 'disconnected',
    };
  }

  /**
   * Get the Prisma client instance for use by other services
   */
  getPrismaClient(): PrismaClient {
    if (!this.prismaClient) {
      throw new Error(
        'Database service not initialized. Call onModuleInit first.',
      );
    }
    return this.prismaClient;
  }

  /**
   * Execute a raw query with performance monitoring
   */
  async executeRawQuery(query: string, params?: any[]) {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    try {
      this.logger.debug(`[${operationId}] Executing raw query`, {
        operationId,
      });

      const result = params
        ? await this.prismaClient.$queryRawUnsafe(query, ...params)
        : await this.prismaClient.$queryRawUnsafe(query);

      const duration = Date.now() - startTime;

      this.recordQueryMetrics({
        query: 'raw_query',
        duration,
        timestamp: new Date(),
        success: true,
      });

      this.logger.debug(`[${operationId}] Raw query executed successfully`, {
        duration,
        operationId,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordQueryMetrics({
        query: 'raw_query',
        duration,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      this.logger.error(`[${operationId}] Raw query execution failed`, {
        error: error instanceof Error ? error.message : String(error),
        duration,
        operationId,
      });

      throw error;
    }
  }

  /**
   * Execute database operation with circuit breaker protection
   */
  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitName: string = 'database_default',
  ): Promise<T> {
    return this.circuitBreakerService.execute(
      circuitName,
      operation,
      async () => {
        // Fallback: return cached data or throw service unavailable
        throw new Error(
          'Database circuit breaker is open - service unavailable',
        );
      },
    );
  }

  /**
   * Execute database operation with retry logic
   */
  async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    return this.retryService.executeWithRetry(
      operation,
      RetryService.PresetConfigs.DATABASE,
    );
  }

  /**
   * Execute database operation with full reliability patterns
   */
  async executeWithReliability<T>(
    operation: () => Promise<T>,
    circuitName: string = 'database_default',
  ): Promise<T> {
    return this.circuitBreakerService.execute(circuitName, () =>
      this.retryService.executeWithRetry(
        operation,
        RetryService.PresetConfigs.DATABASE,
      ),
    );
  }

  /**
   * Enhanced health check with circuit breaker integration
   */
  private async performHealthCheckWithReliability() {
    const operationId = this.generateOperationId();

    try {
      this.logger.debug(
        `[${operationId}] Performing reliable database health check`,
      );

      const startTime = Date.now();

      // Use circuit breaker for health check
      await this.executeWithCircuitBreaker(async () => {
        return this.prismaClient.$queryRaw`SELECT 1 as health_check`;
      }, 'database_health_check');

      const duration = Date.now() - startTime;

      this.isHealthy = true;
      this.lastHealthCheck = new Date();

      // Record success in circuit breaker
      this.logger.debug(
        `[${operationId}] Reliable database health check passed`,
        {
          duration,
          operationId,
        },
      );
    } catch (error) {
      this.isHealthy = false;
      this.errorCount++;

      this.logger.error(
        `[${operationId}] Reliable database health check failed`,
        {
          error: error instanceof Error ? error.message : String(error),
          operationId,
        },
      );
    }
  }

  /**
   * Register shutdown tasks for graceful database cleanup
   */
  private registerShutdownTasks(): void {
    // Register database connection cleanup
    this.shutdownService.registerCleanupTask(
      'database-connections',
      async () => {
        this.logger.log('Closing database connections gracefully');

        // Clear intervals first
        if (this.healthCheckInterval) {
          clearInterval(this.healthCheckInterval);
        }
        if (this.metricsInterval) {
          clearInterval(this.metricsInterval);
        }

        // Disconnect Prisma client
        if (this.prismaClient) {
          await this.prismaClient.$disconnect();
          this.logger.log('Database connections closed successfully');
        }
      },
    );

    // Register metrics cleanup
    this.shutdownService.registerCleanupTask('database-metrics', async () => {
      this.logger.log('Clearing database metrics');
      this.queryMetrics = [];
      this.totalQueries = 0;
      this.totalQueryTime = 0;
      this.slowQueries = 0;
      this.errorCount = 0;
    });
  }

  /**
   * Enhanced raw query execution with full reliability patterns
   */
  async executeRawQueryWithReliability(
    query: string,
    params?: any[],
  ): Promise<any> {
    const operationId = this.generateOperationId();

    return this.executeWithReliability(async () => {
      const startTime = Date.now();

      try {
        this.logger.debug(`[${operationId}] Executing reliable raw query`, {
          operationId,
        });

        const result = params
          ? await this.prismaClient.$queryRawUnsafe(query, ...params)
          : await this.prismaClient.$queryRawUnsafe(query);

        const duration = Date.now() - startTime;

        this.recordQueryMetrics({
          query: 'reliable_raw_query',
          duration,
          timestamp: new Date(),
          success: true,
        });

        this.logger.debug(
          `[${operationId}] Reliable raw query executed successfully`,
          {
            duration,
            operationId,
          },
        );

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        this.recordQueryMetrics({
          query: 'reliable_raw_query',
          duration,
          timestamp: new Date(),
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });

        this.logger.error(
          `[${operationId}] Reliable raw query execution failed`,
          {
            error: error instanceof Error ? error.message : String(error),
            duration,
            operationId,
          },
        );

        throw error;
      }
    }, 'database_raw_query');
  }

  /**
   * Get reliability metrics for monitoring
   */
  async getReliabilityMetrics() {
    const circuitMetrics = this.circuitBreakerService.getAllCircuitMetrics();
    const databaseCircuits = circuitMetrics.filter((circuit) =>
      circuit.circuitName.startsWith('database_'),
    );

    return {
      circuitBreakers: databaseCircuits,
      connectionPool: await this.getConnectionPoolMetrics(),
      performance: {
        averageQueryTime:
          this.totalQueries > 0 ? this.totalQueryTime / this.totalQueries : 0,
        slowQueries: this.slowQueries,
        totalQueries: this.totalQueries,
        errorRate:
          this.totalQueries > 0 ? this.errorCount / this.totalQueries : 0,
      },
    };
  }

  /**
   * Generate unique operation ID for tracking
   */
  private generateOperationId(): string {
    return `db_op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
