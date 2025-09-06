/**
 * Connection Pool Configuration - Enterprise PostgreSQL Connection Optimization
 * Implements high-performance connection pooling for enterprise workloads
 * Based on PostgreSQL best practices and enterprise scaling patterns
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ConnectionPoolOptions {
  // Primary connection pool settings
  maxConnections: number;
  minConnections: number;
  acquireTimeoutMillis: number;
  idleTimeoutMillis: number;

  // Health and monitoring
  testOnBorrow: boolean;
  testOnCreate: boolean;
  testWhileIdle: boolean;

  // Advanced performance settings
  maxWaitingClients: number;
  preparedStatements: boolean;
  statementTimeout: number;
  queryTimeout: number;

  // Reliability settings
  connectionRetryAttempts: number;
  connectionRetryDelay: number;
  evictionRunIntervalMillis: number;

  // Monitoring and logging
  logQueries: boolean;
  logConnections: boolean;
  slowQueryThreshold: number;
}

@Injectable()
export class ConnectionPoolConfig {
  private readonly logger = new Logger(ConnectionPoolConfig.name);

  constructor(private readonly configService: ConfigService) {
    this.logger.log('Initializing enterprise connection pool configuration');
  }

  /**
   * Get optimized connection pool configuration based on environment
   * Production settings prioritize stability and performance
   * Development settings enable debugging and monitoring
   */
  getConnectionPoolOptions(): ConnectionPoolOptions {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const isProduction = nodeEnv === 'production';
    const maxConcurrentRequests = this.configService.get<number>(
      'MAX_CONCURRENT_REQUESTS',
      100,
    );

    // Calculate optimal pool sizes based on workload expectations
    const basePoolSize = Math.max(5, Math.ceil(maxConcurrentRequests * 0.1));
    const maxPoolSize = Math.max(20, Math.ceil(maxConcurrentRequests * 0.5));

    const config: ConnectionPoolOptions = {
      // Connection pool sizing - optimized for enterprise workloads
      maxConnections: this.configService.get<number>(
        'DB_MAX_CONNECTIONS',
        maxPoolSize,
      ),
      minConnections: this.configService.get<number>(
        'DB_MIN_CONNECTIONS',
        basePoolSize,
      ),
      maxWaitingClients: this.configService.get<number>(
        'DB_MAX_WAITING_CLIENTS',
        maxConcurrentRequests,
      ),

      // Timeout configurations - balance performance with reliability
      acquireTimeoutMillis: this.configService.get<number>(
        'DB_ACQUIRE_TIMEOUT_MS',
        30000,
      ),
      idleTimeoutMillis: this.configService.get<number>(
        'DB_IDLE_TIMEOUT_MS',
        600000,
      ), // 10 minutes
      queryTimeout: this.configService.get<number>(
        'DB_QUERY_TIMEOUT_MS',
        30000,
      ),
      statementTimeout: this.configService.get<number>(
        'DB_STATEMENT_TIMEOUT_MS',
        60000,
      ),

      // Health monitoring - essential for production reliability
      testOnBorrow: true,
      testOnCreate: true,
      testWhileIdle: true,
      evictionRunIntervalMillis: this.configService.get<number>(
        'DB_EVICTION_INTERVAL_MS',
        300000,
      ), // 5 minutes

      // Performance optimizations
      preparedStatements: isProduction,

      // Connection reliability
      connectionRetryAttempts: this.configService.get<number>(
        'DB_RETRY_ATTEMPTS',
        3,
      ),
      connectionRetryDelay: this.configService.get<number>(
        'DB_RETRY_DELAY_MS',
        2000,
      ),

      // Monitoring and debugging
      logQueries:
        !isProduction ||
        this.configService.get<boolean>('DB_LOG_QUERIES', false),
      logConnections:
        !isProduction ||
        this.configService.get<boolean>('DB_LOG_CONNECTIONS', false),
      slowQueryThreshold: this.configService.get<number>(
        'DB_SLOW_QUERY_THRESHOLD_MS',
        1000,
      ),
    };

    this.logger.log('Connection pool configuration initialized', {
      environment: nodeEnv,
      maxConnections: config.maxConnections,
      minConnections: config.minConnections,
      maxWaitingClients: config.maxWaitingClients,
      acquireTimeoutMs: config.acquireTimeoutMillis,
      queryTimeoutMs: config.queryTimeout,
    });

    return config;
  }

  /**
   * Get Prisma datasource URL with connection pool parameters
   * Includes all PostgreSQL-specific optimizations for enterprise use
   */
  getPrismaConnectionUrl(): string {
    const baseUrl = this.configService.get<string>('DATABASE_URL');
    if (!baseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    const config = this.getConnectionPoolOptions();

    // Parse base URL to add connection parameters
    const url = new URL(baseUrl);
    const params = new URLSearchParams(url.search);

    // Add connection pool parameters
    params.set('connection_limit', config.maxConnections.toString());
    params.set(
      'pool_timeout',
      Math.ceil(config.acquireTimeoutMillis / 1000).toString(),
    );
    params.set('connect_timeout', '10');
    params.set(
      'statement_timeout',
      Math.ceil(config.statementTimeout / 1000).toString(),
    );
    params.set(
      'query_timeout',
      Math.ceil(config.queryTimeout / 1000).toString(),
    );

    // PostgreSQL-specific optimizations
    params.set('application_name', 'bytebot-agent');
    params.set(
      'sslmode',
      this.configService.get<string>('DB_SSL_MODE', 'prefer'),
    );

    // Performance optimizations
    params.set(
      'prepared_statements',
      config.preparedStatements ? 'true' : 'false',
    );
    params.set('pgbouncer', 'true'); // Enable PgBouncer compatibility mode

    url.search = params.toString();

    const connectionUrl = url.toString();
    this.logger.debug(
      'Generated optimized Prisma connection URL with pool parameters',
    );

    return connectionUrl;
  }

  /**
   * Validate database connection configuration
   * Ensures all critical parameters are properly set
   */
  validateConfiguration(): boolean {
    try {
      const config = this.getConnectionPoolOptions();
      const connectionUrl = this.getPrismaConnectionUrl();

      // Validate critical configuration values
      if (config.maxConnections < config.minConnections) {
        throw new Error(
          'maxConnections must be greater than or equal to minConnections',
        );
      }

      if (config.acquireTimeoutMillis < 1000) {
        throw new Error(
          'acquireTimeoutMillis should be at least 1000ms for stability',
        );
      }

      if (!connectionUrl || !connectionUrl.startsWith('postgresql://')) {
        throw new Error('Invalid PostgreSQL connection URL format');
      }

      this.logger.log(
        'Database connection configuration validation successful',
      );
      return true;
    } catch (error) {
      this.logger.error(
        'Database connection configuration validation failed',
        error,
      );
      throw error;
    }
  }

  /**
   * Get connection pool metrics configuration
   * Defines what metrics should be collected for monitoring
   */
  getMetricsConfig() {
    return {
      collectConnectionMetrics: true,
      collectQueryMetrics: true,
      collectPerformanceMetrics: true,
      metricsCollectionInterval: 30000, // 30 seconds
      enablePrometheusExport: true,
      enableHealthChecks: true,
    };
  }
}
