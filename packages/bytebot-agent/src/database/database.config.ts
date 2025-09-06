/**
 * Database Configuration - Comprehensive Database Settings Management
 * Centralizes all database configuration for connection pooling, security,
 * monitoring, and performance optimization for the Bytebot API platform
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DatabaseConfiguration {
  // Connection settings
  connection: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    url: string;
    schema: string;
  };

  // Connection pool settings
  pool: {
    maxConnections: number;
    minConnections: number;
    acquireTimeoutMillis: number;
    idleTimeoutMillis: number;
    maxWaitingClients: number;
    connectionRetryAttempts: number;
    connectionRetryDelay: number;
    evictionRunIntervalMillis: number;
    testOnBorrow: boolean;
    testOnCreate: boolean;
    testWhileIdle: boolean;
  };

  // Performance settings
  performance: {
    queryTimeout: number;
    statementTimeout: number;
    preparedStatements: boolean;
    slowQueryThreshold: number;
    logQueries: boolean;
    logConnections: boolean;
  };

  // SSL/TLS security
  ssl: {
    enabled: boolean;
    mode: 'require' | 'prefer' | 'allow' | 'disable';
    rejectUnauthorized: boolean;
    certPath?: string;
    keyPath?: string;
    rootCertPath?: string;
  };

  // Health monitoring
  health: {
    enabled: boolean;
    checkInterval: number;
    timeout: number;
    unhealthyThreshold: number;
    degradedThreshold: number;
    recoveryThreshold: number;
    gracefulDegradation: boolean;
    blockOnUnhealthy: boolean;
  };

  // Metrics and monitoring
  metrics: {
    enabled: boolean;
    collectionInterval: number;
    prometheusExport: boolean;
    historySize: number;
    slowQueryReporting: boolean;
  };

  // Security settings
  security: {
    auditLogging: boolean;
    auditSensitiveOps: boolean;
    auditAllQueries: boolean;
    auditRetentionDays: number;
    restrictedOperations: string[];
    connectionStringObfuscation: boolean;
    maxConcurrentConnections: number;
  };

  // Environment-specific settings
  environment: {
    nodeEnv: string;
    isProduction: boolean;
    isDevelopment: boolean;
    debugMode: boolean;
  };
}

@Injectable()
export class DatabaseConfig {
  private readonly logger = new Logger(DatabaseConfig.name);
  private readonly configuration: DatabaseConfiguration;

  constructor(private readonly configService: ConfigService) {
    this.configuration = this.buildConfiguration();
    this.validateConfiguration();

    this.logger.log('Database configuration initialized', {
      environment: this.configuration.environment.nodeEnv,
      ssl: this.configuration.ssl.enabled,
      monitoring: this.configuration.health.enabled,
      metrics: this.configuration.metrics.enabled,
      security: this.configuration.security.auditLogging,
    });
  }

  /**
   * Get complete database configuration
   */
  getConfiguration(): DatabaseConfiguration {
    return { ...this.configuration };
  }

  /**
   * Get connection configuration
   */
  getConnectionConfig() {
    return { ...this.configuration.connection };
  }

  /**
   * Get connection pool configuration
   */
  getPoolConfig() {
    return { ...this.configuration.pool };
  }

  /**
   * Get performance configuration
   */
  getPerformanceConfig() {
    return { ...this.configuration.performance };
  }

  /**
   * Get SSL configuration
   */
  getSslConfig() {
    return { ...this.configuration.ssl };
  }

  /**
   * Get health monitoring configuration
   */
  getHealthConfig() {
    return { ...this.configuration.health };
  }

  /**
   * Get metrics configuration
   */
  getMetricsConfig() {
    return { ...this.configuration.metrics };
  }

  /**
   * Get security configuration
   */
  getSecurityConfig() {
    return { ...this.configuration.security };
  }

  /**
   * Get environment configuration
   */
  getEnvironmentConfig() {
    return { ...this.configuration.environment };
  }

  /**
   * Get optimized Prisma connection URL with all parameters
   */
  getPrismaConnectionUrl(): string {
    const base = this.configuration.connection.url;
    const url = new URL(base);
    const params = new URLSearchParams(url.search);

    // Connection pool parameters
    params.set(
      'connection_limit',
      this.configuration.pool.maxConnections.toString(),
    );
    params.set(
      'pool_timeout',
      Math.ceil(this.configuration.pool.acquireTimeoutMillis / 1000).toString(),
    );

    // SSL parameters
    if (this.configuration.ssl.enabled) {
      params.set('sslmode', this.configuration.ssl.mode);
      if (this.configuration.ssl.certPath) {
        params.set('sslcert', this.configuration.ssl.certPath);
      }
      if (this.configuration.ssl.keyPath) {
        params.set('sslkey', this.configuration.ssl.keyPath);
      }
      if (this.configuration.ssl.rootCertPath) {
        params.set('sslrootcert', this.configuration.ssl.rootCertPath);
      }
    } else {
      params.set('sslmode', 'disable');
    }

    // Performance parameters
    params.set('connect_timeout', '10');
    params.set(
      'statement_timeout',
      Math.ceil(
        this.configuration.performance.statementTimeout / 1000,
      ).toString(),
    );
    params.set(
      'query_timeout',
      Math.ceil(this.configuration.performance.queryTimeout / 1000).toString(),
    );

    // Application identification
    params.set('application_name', 'bytebot-agent');

    // Performance optimizations
    params.set(
      'prepared_statements',
      this.configuration.performance.preparedStatements ? 'true' : 'false',
    );
    params.set('pgbouncer', 'true');

    // Schema
    if (
      this.configuration.connection.schema &&
      this.configuration.connection.schema !== 'public'
    ) {
      params.set('schema', this.configuration.connection.schema);
    }

    url.search = params.toString();
    return url.toString();
  }

  /**
   * Get database configuration for Kubernetes deployment
   */
  getKubernetesConfig() {
    return {
      liveness: {
        enabled: this.configuration.health.enabled,
        path: '/database/health',
        initialDelaySeconds: 30,
        periodSeconds: 10,
        timeoutSeconds: 5,
        failureThreshold: 3,
      },
      readiness: {
        enabled: this.configuration.health.enabled,
        path: '/database/health',
        initialDelaySeconds: 5,
        periodSeconds: 5,
        timeoutSeconds: 3,
        failureThreshold: 2,
      },
      startup: {
        enabled: this.configuration.health.enabled,
        path: '/database/health',
        initialDelaySeconds: 10,
        periodSeconds: 5,
        timeoutSeconds: 5,
        failureThreshold: 10,
      },
    };
  }

  /**
   * Get environment-optimized configuration overrides
   */
  getEnvironmentOptimizations() {
    const env = this.configuration.environment;

    if (env.isProduction) {
      return {
        logging: {
          queries: false,
          connections: false,
          performance: true,
          errors: true,
        },
        monitoring: {
          detailed: true,
          sampling: 1.0,
        },
        security: {
          strict: true,
          auditAll: false,
        },
      };
    }

    if (env.isDevelopment) {
      return {
        logging: {
          queries: true,
          connections: true,
          performance: true,
          errors: true,
        },
        monitoring: {
          detailed: true,
          sampling: 1.0,
        },
        security: {
          strict: false,
          auditAll: true,
        },
      };
    }

    // Testing or other environments
    return {
      logging: {
        queries: false,
        connections: false,
        performance: false,
        errors: true,
      },
      monitoring: {
        detailed: false,
        sampling: 0.1,
      },
      security: {
        strict: true,
        auditAll: false,
      },
    };
  }

  /**
   * Build comprehensive configuration from environment variables
   */
  private buildConfiguration(): DatabaseConfiguration {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const isProduction = nodeEnv === 'production';
    const isDevelopment = nodeEnv === 'development';

    // Parse database URL for connection details
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    const parsedUrl = new URL(databaseUrl);

    return {
      connection: {
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port) || 5432,
        database: parsedUrl.pathname.slice(1), // Remove leading slash
        username: parsedUrl.username,
        password: parsedUrl.password,
        url: databaseUrl,
        schema: this.configService.get<string>('DATABASE_SCHEMA', 'public'),
      },

      pool: {
        maxConnections: this.configService.get<number>(
          'DB_MAX_CONNECTIONS',
          isProduction ? 50 : 10,
        ),
        minConnections: this.configService.get<number>(
          'DB_MIN_CONNECTIONS',
          isProduction ? 10 : 2,
        ),
        acquireTimeoutMillis: this.configService.get<number>(
          'DB_ACQUIRE_TIMEOUT_MS',
          30000,
        ),
        idleTimeoutMillis: this.configService.get<number>(
          'DB_IDLE_TIMEOUT_MS',
          600000,
        ), // 10 minutes
        maxWaitingClients: this.configService.get<number>(
          'DB_MAX_WAITING_CLIENTS',
          100,
        ),
        connectionRetryAttempts: this.configService.get<number>(
          'DB_RETRY_ATTEMPTS',
          3,
        ),
        connectionRetryDelay: this.configService.get<number>(
          'DB_RETRY_DELAY_MS',
          2000,
        ),
        evictionRunIntervalMillis: this.configService.get<number>(
          'DB_EVICTION_INTERVAL_MS',
          300000,
        ), // 5 minutes
        testOnBorrow: true,
        testOnCreate: true,
        testWhileIdle: true,
      },

      performance: {
        queryTimeout: this.configService.get<number>(
          'DB_QUERY_TIMEOUT_MS',
          30000,
        ),
        statementTimeout: this.configService.get<number>(
          'DB_STATEMENT_TIMEOUT_MS',
          60000,
        ),
        preparedStatements: isProduction,
        slowQueryThreshold: this.configService.get<number>(
          'DB_SLOW_QUERY_THRESHOLD_MS',
          1000,
        ),
        logQueries: this.configService.get<boolean>(
          'DB_LOG_QUERIES',
          !isProduction,
        ),
        logConnections: this.configService.get<boolean>(
          'DB_LOG_CONNECTIONS',
          !isProduction,
        ),
      },

      ssl: {
        enabled: this.configService.get<boolean>(
          'DB_SSL_ENABLED',
          isProduction,
        ),
        mode: this.configService.get<
          'require' | 'prefer' | 'allow' | 'disable'
        >('DB_SSL_MODE', isProduction ? 'require' : 'prefer'),
        rejectUnauthorized: this.configService.get<boolean>(
          'DB_SSL_REJECT_UNAUTHORIZED',
          isProduction,
        ),
        certPath: this.configService.get<string>('DB_SSL_CERT_PATH'),
        keyPath: this.configService.get<string>('DB_SSL_KEY_PATH'),
        rootCertPath: this.configService.get<string>('DB_SSL_ROOT_CERT_PATH'),
      },

      health: {
        enabled: this.configService.get<boolean>('DB_HEALTH_ENABLED', true),
        checkInterval: this.configService.get<number>(
          'DB_HEALTH_CHECK_INTERVAL',
          30000,
        ), // 30 seconds
        timeout: this.configService.get<number>('DB_HEALTH_TIMEOUT', 5000),
        unhealthyThreshold: this.configService.get<number>(
          'DB_HEALTH_UNHEALTHY_THRESHOLD',
          3,
        ),
        degradedThreshold: this.configService.get<number>(
          'DB_HEALTH_DEGRADED_THRESHOLD',
          2,
        ),
        recoveryThreshold: this.configService.get<number>(
          'DB_HEALTH_RECOVERY_THRESHOLD',
          3,
        ),
        gracefulDegradation: this.configService.get<boolean>(
          'DB_HEALTH_GRACEFUL_DEGRADATION',
          true,
        ),
        blockOnUnhealthy: this.configService.get<boolean>(
          'DB_HEALTH_BLOCK_ON_UNHEALTHY',
          true,
        ),
      },

      metrics: {
        enabled: this.configService.get<boolean>('DB_METRICS_ENABLED', true),
        collectionInterval: this.configService.get<number>(
          'DB_METRICS_INTERVAL',
          60000,
        ), // 1 minute
        prometheusExport: this.configService.get<boolean>(
          'DB_METRICS_PROMETHEUS',
          true,
        ),
        historySize: this.configService.get<number>(
          'DB_METRICS_HISTORY_SIZE',
          1000,
        ),
        slowQueryReporting: this.configService.get<boolean>(
          'DB_METRICS_SLOW_QUERIES',
          true,
        ),
      },

      security: {
        auditLogging: this.configService.get<boolean>(
          'DB_AUDIT_ENABLED',
          isProduction,
        ),
        auditSensitiveOps: this.configService.get<boolean>(
          'DB_AUDIT_SENSITIVE',
          true,
        ),
        auditAllQueries: this.configService.get<boolean>(
          'DB_AUDIT_ALL_QUERIES',
          !isProduction,
        ),
        auditRetentionDays: this.configService.get<number>(
          'DB_AUDIT_RETENTION_DAYS',
          30,
        ),
        restrictedOperations: this.configService
          .get<string>('DB_RESTRICTED_OPS', 'DROP,TRUNCATE,ALTER')
          .split(','),
        connectionStringObfuscation: this.configService.get<boolean>(
          'DB_OBFUSCATE_CONNECTION',
          true,
        ),
        maxConcurrentConnections: this.configService.get<number>(
          'DB_MAX_CONCURRENT_CONNECTIONS',
          1000,
        ),
      },

      environment: {
        nodeEnv,
        isProduction,
        isDevelopment,
        debugMode: this.configService.get<boolean>('DB_DEBUG', isDevelopment),
      },
    };
  }

  /**
   * Validate configuration for consistency and requirements
   */
  private validateConfiguration(): void {
    const config = this.configuration;
    const errors: string[] = [];

    // Connection validation
    if (!config.connection.url) {
      errors.push('Database URL is required');
    }

    if (!config.connection.host || !config.connection.database) {
      errors.push('Database host and database name are required');
    }

    // Pool validation
    if (config.pool.maxConnections < config.pool.minConnections) {
      errors.push(
        'Maximum connections must be greater than or equal to minimum connections',
      );
    }

    if (config.pool.maxConnections < 1) {
      errors.push('Maximum connections must be at least 1');
    }

    if (config.pool.acquireTimeoutMillis < 1000) {
      errors.push('Acquire timeout should be at least 1000ms for stability');
    }

    // Performance validation
    if (config.performance.queryTimeout > config.performance.statementTimeout) {
      errors.push(
        'Statement timeout should be greater than or equal to query timeout',
      );
    }

    if (config.performance.slowQueryThreshold < 0) {
      errors.push('Slow query threshold cannot be negative');
    }

    // SSL validation
    if (config.ssl.enabled && config.ssl.mode === 'disable') {
      errors.push('SSL cannot be both enabled and disabled');
    }

    if (config.environment.isProduction && config.ssl.mode === 'disable') {
      this.logger.warn('SSL is disabled in production environment');
    }

    // Health validation
    if (config.health.enabled) {
      if (config.health.timeout >= config.health.checkInterval) {
        errors.push('Health check timeout should be less than check interval');
      }

      if (config.health.unhealthyThreshold < config.health.degradedThreshold) {
        errors.push(
          'Unhealthy threshold should be greater than or equal to degraded threshold',
        );
      }
    }

    // Security validation
    if (config.security.auditRetentionDays < 1) {
      errors.push('Audit retention must be at least 1 day');
    }

    if (config.security.maxConcurrentConnections < config.pool.maxConnections) {
      errors.push(
        'Max concurrent connections should be greater than or equal to pool max connections',
      );
    }

    if (errors.length > 0) {
      const errorMessage = `Database configuration validation failed:\n${errors.join('\n')}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.log('Database configuration validation successful', {
      validatedSections: [
        'connection',
        'pool',
        'performance',
        'ssl',
        'health',
        'metrics',
        'security',
        'environment',
      ],
    });
  }
}
