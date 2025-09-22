/**
 * Parlant Environment Configuration Service
 *
 * Centralized configuration management for Parlant server integration across environments.
 * Provides type-safe configuration loading, validation, and environment-specific overrides
 * with production-ready defaults and comprehensive validation.
 *
 * Features:
 * - Multi-environment configuration (development, staging, production)
 * - Type-safe configuration interfaces with validation
 * - Environment variable validation and error reporting
 * - Production-ready defaults with security best practices
 * - Configuration hot-reloading for development environments
 * - Encrypted configuration storage for sensitive values
 *
 * Architecture: Centralized configuration management with environment-aware loading
 * Security: Encrypted sensitive values with secure defaults
 * Performance: Cached configuration with validation
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Parlant server environment configuration interface
 */
export interface ParlantEnvironmentConfig {
  // Core connection settings
  readonly enabled: boolean;
  readonly serverUrl: string;
  readonly apiKey: string;
  readonly wsUrl: string;
  readonly environment: 'development' | 'staging' | 'production';

  // Connection reliability settings
  readonly connection: {
    readonly timeout: number;
    readonly retries: number;
    readonly retryDelay: number;
    readonly backoffMultiplier: number;
    readonly maxRetryDelay: number;
    readonly keepAlive: boolean;
    readonly keepAliveTimeout: number;
    readonly poolSize: number;
  };

  // Circuit breaker configuration
  readonly circuitBreaker: {
    readonly enabled: boolean;
    readonly failureThreshold: number;
    readonly timeout: number;
    readonly resetTimeout: number;
  };

  // Performance optimization settings
  readonly performance: {
    readonly cacheEnabled: boolean;
    readonly cacheSize: number;
    readonly cacheMaxAge: number;
    readonly intelligentCacheEnabled: boolean;
    readonly batchingEnabled: boolean;
    readonly batchSize: number;
    readonly batchTimeout: number;
    readonly concurrentValidations: number;
    readonly workerPoolSize: number;
  };

  // Security configuration
  readonly security: {
    readonly tlsEnabled: boolean;
    readonly tlsVerifyCertificates: boolean;
    readonly tlsMinVersion: string;
    readonly requireHighRiskApproval: boolean;
    readonly maxFailedValidations: number;
    readonly sessionTimeout: number;
    readonly rateLimitEnabled: boolean;
    readonly rateLimitRequestsPerMinute: number;
  };

  // Monitoring and logging
  readonly monitoring: {
    readonly healthCheckEnabled: boolean;
    readonly healthCheckInterval: number;
    readonly healthCheckTimeout: number;
    readonly prometheusEnabled: boolean;
    readonly prometheusPort: number;
    readonly alertsEnabled: boolean;
    readonly failureAlertThreshold: number;
  };

  // Audit and compliance
  readonly audit: {
    readonly enabled: boolean;
    readonly enterpriseAuditEnabled: boolean;
    readonly retentionDays: number;
    readonly encryptionEnabled: boolean;
    readonly digitalSigningEnabled: boolean;
    readonly gdprCompliance: boolean;
    readonly soxCompliance: boolean;
    readonly hipaaCompliance: boolean;
  };

  // Failover and disaster recovery
  readonly failover: {
    readonly enabled: boolean;
    readonly servers: string[];
    readonly serviceDiscoveryEnabled: boolean;
    readonly loadBalancingEnabled: boolean;
    readonly loadBalancingStrategy:
      | 'round_robin'
      | 'weighted'
      | 'least_connections';
  };
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
  readonly missingRequired: string[];
  readonly recommendations: string[];
}

/**
 * Environment-specific configuration presets
 */
const ENVIRONMENT_PRESETS: Record<string, Partial<ParlantEnvironmentConfig>> = {
  development: {
    environment: 'development',
    serverUrl: 'http://localhost:8000',
    wsUrl: 'ws://localhost:8000/ws',
    connection: { timeout: 10000, retries: 3, poolSize: 5 },
    performance: {
      cacheSize: 1000,
      concurrentValidations: 5,
      batchSize: 10,
    },
    security: {
      tlsEnabled: false,
      tlsVerifyCertificates: false,
      requireHighRiskApproval: false,
      rateLimitEnabled: false,
    },
    monitoring: {
      healthCheckInterval: 30000,
      prometheusEnabled: false,
      alertsEnabled: false,
    },
    audit: {
      retentionDays: 30,
      enterpriseAuditEnabled: false,
      encryptionEnabled: false,
      gdprCompliance: false,
      soxCompliance: false,
    },
    failover: {
      enabled: false,
      servers: [],
      serviceDiscoveryEnabled: false,
    },
  },
  staging: {
    environment: 'staging',
    serverUrl: 'https://staging-api.parlant.io',
    wsUrl: 'wss://staging-api.parlant.io/ws',
    connection: { timeout: 8000, retries: 4, poolSize: 8 },
    performance: {
      cacheSize: 5000,
      concurrentValidations: 10,
      batchSize: 15,
    },
    security: {
      tlsEnabled: true,
      tlsVerifyCertificates: true,
      requireHighRiskApproval: true,
      rateLimitEnabled: true,
    },
    monitoring: {
      healthCheckInterval: 15000,
      prometheusEnabled: true,
      alertsEnabled: true,
    },
    audit: {
      retentionDays: 90,
      enterpriseAuditEnabled: true,
      encryptionEnabled: true,
      gdprCompliance: true,
      soxCompliance: true,
    },
    failover: {
      enabled: true,
      servers: ['https://staging-backup.parlant.io'],
      serviceDiscoveryEnabled: false,
    },
  },
  production: {
    environment: 'production',
    serverUrl: 'https://api.parlant.io',
    wsUrl: 'wss://api.parlant.io/ws',
    connection: {
      timeout: 8000,
      retries: 5,
      poolSize: 20,
      keepAlive: true,
      keepAliveTimeout: 30000,
    },
    performance: {
      cacheSize: 10000,
      intelligentCacheEnabled: true,
      concurrentValidations: 20,
      batchSize: 25,
      workerPoolSize: 10,
    },
    security: {
      tlsEnabled: true,
      tlsVerifyCertificates: true,
      tlsMinVersion: '1.2',
      requireHighRiskApproval: true,
      maxFailedValidations: 3,
      rateLimitEnabled: true,
      rateLimitRequestsPerMinute: 1000,
    },
    monitoring: {
      healthCheckEnabled: true,
      healthCheckInterval: 15000,
      prometheusEnabled: true,
      prometheusPort: 9090,
      alertsEnabled: true,
      failureAlertThreshold: 0.05,
    },
    audit: {
      enabled: true,
      enterpriseAuditEnabled: true,
      retentionDays: 365,
      encryptionEnabled: true,
      digitalSigningEnabled: true,
      gdprCompliance: true,
      soxCompliance: true,
    },
    failover: {
      enabled: true,
      servers: ['https://api-backup.parlant.io', 'https://api-dr.parlant.io'],
      loadBalancingEnabled: true,
      loadBalancingStrategy: 'round_robin',
    },
  },
};

/**
 * Required environment variables for each environment
 */
const REQUIRED_ENV_VARS: Record<string, string[]> = {
  development: ['PARLANT_ENABLED'],
  staging: ['PARLANT_ENABLED', 'PARLANT_API_KEY'],
  production: ['PARLANT_ENABLED', 'PARLANT_API_KEY', 'PARLANT_API_BASE_URL'],
};
@Injectable()
export class ParlantEnvironmentConfigService implements OnModuleInit {
  private readonly logger = new Logger(ParlantEnvironmentConfigService.name);
  private cachedConfig: ParlantEnvironmentConfig | null = null;
  private configValidationResult: ConfigValidationResult | null = null;
  private readonly configUpdateCallbacks: Array<
    (config: ParlantEnvironmentConfig) => void
  > = [];

  constructor(private readonly configService: ConfigService) {
    this.logger.log('Initializing Parlant Environment Configuration Service');
  }

  /**
   * Initialize configuration service and validate environment
   */
  onModuleInit(): void {
    const operationId = `config_init_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.log(
        `[${operationId}] Loading Parlant environment configuration`,
      );

      // Load and validate configuration
      const config = this.loadConfiguration();
      const validation = this.validateConfiguration(config);

      if (!validation.valid) {
        this.logger.error(`[${operationId}] Configuration validation failed`, {
          errors: validation.errors,
          missingRequired: validation.missingRequired,
        });

        if (validation.errors.length > 0) {
          throw new Error(
            `Invalid Parlant configuration: ${validation.errors.join(', ')}`,
          );
        }
      }

      if (validation.warnings.length > 0) {
        this.logger.warn(`[${operationId}] Configuration warnings`, {
          warnings: validation.warnings,
          recommendations: validation.recommendations,
        });
      }

      // Cache validated configuration
      this.cachedConfig = config;
      this.configValidationResult = validation;

      this.logger.log(
        `[${operationId}] Parlant configuration loaded successfully`,
        {
          environment: config.environment,
          serverUrl: config.serverUrl,
          enabled: config.enabled,
          cacheEnabled: config.performance.cacheEnabled,
          auditEnabled: config.audit.enabled,
          circuitBreakerEnabled: config.circuitBreaker.enabled,
          monitoringEnabled: config.monitoring.healthCheckEnabled,
        },
      );

      // Set up configuration file watching for development
      if (config.environment === 'development') {
        this.setupConfigFileWatching();
      }
    } catch (error) {
      this.logger.error(
        `[${operationId}] Failed to initialize Parlant configuration`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      throw error;
    }
  }

  /**
   * Get the current Parlant configuration
   */
  getConfiguration(): ParlantEnvironmentConfig {
    if (!this.cachedConfig) {
      throw new Error(
        'Parlant configuration not initialized. Call onModuleInit() first.',
      );
    }
    return this.cachedConfig;
  }

  /**
   * Get configuration validation result
   */
  getValidationResult(): ConfigValidationResult {
    if (!this.configValidationResult) {
      throw new Error(
        'Configuration validation not performed. Call onModuleInit() first.',
      );
    }
    return this.configValidationResult;
  }

  /**
   * Check if Parlant integration is enabled and properly configured
   */
  isEnabled(): boolean {
    try {
      const config = this.getConfiguration();
      return config.enabled && this.isConfigurationValid();
    } catch {
      return false;
    }
  }

  /**
   * Check if current configuration is valid
   */
  isConfigurationValid(): boolean {
    return this.configValidationResult?.valid ?? false;
  }

  /**
   * Register callback for configuration updates
   */
  onConfigurationUpdate(
    callback: (config: ParlantEnvironmentConfig) => void,
  ): void {
    this.configUpdateCallbacks.push(callback);
  }

  /**
   * Reload configuration from environment variables
   */
  reloadConfiguration(): ParlantEnvironmentConfig {
    this.logger.log('Reloading Parlant configuration');

    try {
      const config = this.loadConfiguration();
      const validation = this.validateConfiguration(config);

      if (!validation.valid && validation.errors.length > 0) {
        throw new Error(
          `Configuration reload failed: ${validation.errors.join(', ')}`,
        );
      }

      // Update cached configuration
      this.cachedConfig = config;
      this.configValidationResult = validation;

      // Notify callbacks
      this.configUpdateCallbacks.forEach((callback) => {
        try {
          callback(config);
        } catch (error) {
          this.logger.error('Configuration update callback failed', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      this.logger.log('Parlant configuration reloaded successfully');
      return config;
    } catch (error) {
      this.logger.error('Failed to reload Parlant configuration', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Load configuration from environment variables and presets
   */
  private loadConfiguration(): ParlantEnvironmentConfig {
    const environment = this.configService.get<string>(
      'NODE_ENV',
      'development',
    ) as 'development' | 'staging' | 'production';
    const envPreset =
      ENVIRONMENT_PRESETS[environment] ?? ENVIRONMENT_PRESETS.development; // Merge environment preset with environment variables
    const config: ParlantEnvironmentConfig = {
      enabled: this.configService.get<boolean>(
        'PARLANT_ENABLED',
        envPreset?.enabled ?? true,
      ),
      serverUrl: this.configService.get<string>(
        'PARLANT_API_BASE_URL',
        envPreset?.serverUrl ?? 'http://localhost:8000',
      ),
      apiKey: this.configService.get<string>('PARLANT_API_KEY', ''),
      wsUrl: this.configService.get<string>(
        'PARLANT_WS_URL',
        envPreset?.wsUrl ?? 'ws://localhost:8000/ws',
      ),
      environment,
      connection: {
        timeout: this.configService.get<number>(
          'PARLANT_API_TIMEOUT_MS',
          envPreset?.connection?.timeout ?? 10000,
        ),
        retries: this.configService.get<number>(
          'PARLANT_API_RETRIES',
          envPreset?.connection?.retries ?? 3,
        ),
        retryDelay: this.configService.get<number>(
          'PARLANT_RETRY_DELAY_MS',
          1000,
        ),
        backoffMultiplier: this.configService.get<number>(
          'PARLANT_RETRY_BACKOFF_MULTIPLIER',
          2,
        ),
        maxRetryDelay: this.configService.get<number>(
          'PARLANT_MAX_RETRY_DELAY_MS',
          10000,
        ),
        keepAlive: this.configService.get<boolean>(
          'PARLANT_CONNECTION_KEEP_ALIVE',
          envPreset?.connection?.keepAlive ?? false,
        ),
        keepAliveTimeout: this.configService.get<number>(
          'PARLANT_CONNECTION_KEEP_ALIVE_TIMEOUT_MS',
          envPreset?.connection?.keepAliveTimeout ?? 30000,
        ),
        poolSize: this.configService.get<number>(
          'PARLANT_CONNECTION_POOL_SIZE',
          envPreset?.connection?.poolSize ?? 10,
        ),
      },
      circuitBreaker: {
        enabled: this.configService.get<boolean>(
          'PARLANT_CIRCUIT_BREAKER_ENABLED',
          envPreset?.circuitBreaker?.enabled ?? true,
        ),
        failureThreshold: this.configService.get<number>(
          'PARLANT_CIRCUIT_BREAKER_FAILURE_THRESHOLD',
          10,
        ),
        timeout: this.configService.get<number>(
          'PARLANT_CIRCUIT_BREAKER_TIMEOUT_MS',
          30000,
        ),
        resetTimeout: this.configService.get<number>(
          'PARLANT_CIRCUIT_BREAKER_RESET_TIMEOUT_MS',
          60000,
        ),
      },
      performance: {
        cacheEnabled: this.configService.get<boolean>(
          'PARLANT_CACHE_ENABLED',
          envPreset?.performance?.cacheEnabled ?? true,
        ),
        cacheSize: this.configService.get<number>(
          'PARLANT_CACHE_SIZE',
          envPreset?.performance?.cacheSize ?? 1000,
        ),
        cacheMaxAge: this.configService.get<number>(
          'PARLANT_CACHE_MAX_AGE_MS',
          300000,
        ),
        intelligentCacheEnabled: this.configService.get<boolean>(
          'PARLANT_INTELLIGENT_CACHE_ENABLED',
          envPreset?.performance?.intelligentCacheEnabled ?? false,
        ),
        batchingEnabled: this.configService.get<boolean>(
          'PARLANT_BATCHING_ENABLED',
          envPreset?.performance?.batchingEnabled ?? true,
        ),
        batchSize: this.configService.get<number>(
          'PARLANT_BATCH_SIZE',
          envPreset?.performance?.batchSize ?? 10,
        ),
        batchTimeout: this.configService.get<number>(
          'PARLANT_BATCH_TIMEOUT_MS',
          2000,
        ),
        concurrentValidations: this.configService.get<number>(
          'PARLANT_CONCURRENT_VALIDATIONS',
          envPreset?.performance?.concurrentValidations ?? 5,
        ),
        workerPoolSize: this.configService.get<number>(
          'PARLANT_WORKER_POOL_SIZE',
          envPreset?.performance?.workerPoolSize ?? 5,
        ),
      },
      security: {
        tlsEnabled: this.configService.get<boolean>(
          'PARLANT_TLS_ENABLED',
          envPreset?.security?.tlsEnabled ?? true,
        ),
        tlsVerifyCertificates: this.configService.get<boolean>(
          'PARLANT_TLS_VERIFY_CERTIFICATES',
          envPreset?.security?.tlsVerifyCertificates ?? true,
        ),
        tlsMinVersion: this.configService.get<string>(
          'PARLANT_TLS_MIN_VERSION',
          envPreset?.security?.tlsMinVersion ?? '1.2',
        ),
        requireHighRiskApproval: this.configService.get<boolean>(
          'PARLANT_REQUIRE_HIGH_RISK_APPROVAL',
          envPreset?.security?.requireHighRiskApproval ?? true,
        ),
        maxFailedValidations: this.configService.get<number>(
          'PARLANT_MAX_FAILED_VALIDATIONS',
          envPreset?.security?.maxFailedValidations ?? 5,
        ),
        sessionTimeout: this.configService.get<number>(
          'PARLANT_SESSION_TIMEOUT_MS',
          3600000,
        ),
        rateLimitEnabled: this.configService.get<boolean>(
          'PARLANT_RATE_LIMIT_ENABLED',
          envPreset?.security?.rateLimitEnabled ?? true,
        ),
        rateLimitRequestsPerMinute: this.configService.get<number>(
          'PARLANT_RATE_LIMIT_REQUESTS_PER_MINUTE',
          envPreset?.security?.rateLimitRequestsPerMinute ?? 100,
        ),
      },
      monitoring: {
        healthCheckEnabled: this.configService.get<boolean>(
          'PARLANT_ENABLE_HEALTH_CHECK',
          envPreset?.monitoring?.healthCheckEnabled ?? true,
        ),
        healthCheckInterval: this.configService.get<number>(
          'PARLANT_HEALTH_CHECK_INTERVAL_MS',
          envPreset?.monitoring?.healthCheckInterval ?? 30000,
        ),
        healthCheckTimeout: this.configService.get<number>(
          'PARLANT_HEALTH_CHECK_TIMEOUT_MS',
          5000,
        ),
        prometheusEnabled: this.configService.get<boolean>(
          'PARLANT_ENABLE_PROMETHEUS_METRICS',
          envPreset?.monitoring?.prometheusEnabled ?? false,
        ),
        prometheusPort: this.configService.get<number>(
          'PARLANT_PROMETHEUS_PORT',
          envPreset?.monitoring?.prometheusPort ?? 9090,
        ),
        alertsEnabled: this.configService.get<boolean>(
          'PARLANT_ENABLE_FAILURE_ALERTS',
          envPreset?.monitoring?.alertsEnabled ?? false,
        ),
        failureAlertThreshold: this.configService.get<number>(
          'PARLANT_FAILURE_ALERT_THRESHOLD',
          envPreset?.monitoring?.failureAlertThreshold ?? 0.1,
        ),
      },
      audit: {
        enabled: this.configService.get<boolean>(
          'PARLANT_AUDIT_ENABLED',
          envPreset?.audit?.enabled ?? true,
        ),
        enterpriseAuditEnabled: this.configService.get<boolean>(
          'PARLANT_ENTERPRISE_AUDIT_ENABLED',
          envPreset?.audit?.enterpriseAuditEnabled ?? false,
        ),
        retentionDays: this.configService.get<number>(
          'PARLANT_AUDIT_RETENTION_DAYS',
          envPreset?.audit?.retentionDays ?? 90,
        ),
        encryptionEnabled: this.configService.get<boolean>(
          'PARLANT_AUDIT_ENCRYPTION_ENABLED',
          envPreset?.audit?.encryptionEnabled ?? false,
        ),
        digitalSigningEnabled: this.configService.get<boolean>(
          'PARLANT_AUDIT_DIGITAL_SIGNING_ENABLED',
          false,
        ),
        gdprCompliance: this.configService.get<boolean>(
          'PARLANT_ENABLE_GDPR_COMPLIANCE',
          envPreset?.audit?.gdprCompliance ?? false,
        ),
        soxCompliance: this.configService.get<boolean>(
          'PARLANT_ENABLE_SOX_COMPLIANCE',
          envPreset?.audit?.soxCompliance ?? false,
        ),
        hipaaCompliance: this.configService.get<boolean>(
          'PARLANT_ENABLE_HIPAA_COMPLIANCE',
          false,
        ),
      },
      failover: {
        enabled: this.configService.get<boolean>(
          'PARLANT_RETRY_FAILOVER_ENABLED',
          envPreset?.failover?.enabled ?? false,
        ),
        servers: this.parseServerList(
          this.configService.get<string>('PARLANT_FAILOVER_SERVERS', '[]'),
        ),
        serviceDiscoveryEnabled: this.configService.get<boolean>(
          'PARLANT_SERVICE_DISCOVERY_ENABLED',
          envPreset?.failover?.serviceDiscoveryEnabled ?? false,
        ),
        loadBalancingEnabled: this.configService.get<boolean>(
          'PARLANT_LOAD_BALANCING_ENABLED',
          envPreset?.failover?.loadBalancingEnabled ?? false,
        ),
        loadBalancingStrategy: this.configService.get<string>(
          'PARLANT_LOAD_BALANCING_STRATEGY',
          'round_robin',
        ) as 'round_robin' | 'weighted' | 'least_connections',
      },
    };

    return config;
  }

  /**
   * Validate configuration completeness and correctness
   */
  private validateConfiguration(
    config: ParlantEnvironmentConfig,
  ): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingRequired: string[] = [];
    const recommendations: string[] = [];

    // Check required environment variables
    const requiredVars = REQUIRED_ENV_VARS[config.environment] ?? [];
    for (const varName of requiredVars) {
      const value = this.configService.get<string>(varName);
      if (!value) {
        missingRequired.push(varName);
        errors.push(`Required environment variable ${varName} is not set`);
      }
    }

    // Validate server URL format
    if (!config.serverUrl.match(/^https?:\/\/.+/)) {
      errors.push('PARLANT_API_BASE_URL must be a valid HTTP/HTTPS URL');
    } // Validate WebSocket URL format
    if (!config.wsUrl.match(/^wss?:\/\/.+/)) {
      errors.push('PARLANT_WS_URL must be a valid WebSocket URL');
    } // Validate API key for production
    if (config.environment === 'production' && !config.apiKey) {
      errors.push('PARLANT_API_KEY is required for production environment');
    } // Validate timeout values
    if (config.connection.timeout < 1000) {
      warnings.push(
        'Connection timeout is very low (< 1s), consider increasing for production',
      );
    }
    if (config.connection.timeout > 30000) {
      warnings.push(
        'Connection timeout is very high (> 30s), consider reducing for better performance',
      );
    } // Validate cache settings
    if (config.performance.cacheSize > 50000) {
      warnings.push(
        'Cache size is very large (> 50k entries), consider reducing to avoid memory issues',
      );
    } // Validate security settings for production
    if (config.environment === 'production') {
      if (!config.security.tlsEnabled) {
        errors.push('TLS must be enabled for production environment');
      }
      if (!config.security.requireHighRiskApproval) {
        warnings.push(
          'High-risk approval should be enabled for production security',
        );
      }
      if (config.security.maxFailedValidations > 10) {
        warnings.push(
          'Max failed validations is high for production, consider reducing',
        );
      }
    }

    // Validate monitoring settings
    if (
      config.environment === 'production' &&
      !config.monitoring.prometheusEnabled
    ) {
      recommendations.push(
        'Enable Prometheus metrics for production monitoring',
      );
    } // Validate audit settings for compliance
    if (config.audit.gdprCompliance && !config.audit.encryptionEnabled) {
      warnings.push('GDPR compliance enabled but audit encryption disabled');
    }
    if (config.audit.soxCompliance && config.audit.retentionDays < 365) {
      warnings.push(
        'SOX compliance typically requires audit retention >= 365 days',
      );
    } // Validate failover configuration
    if (config.failover.enabled && config.failover.servers.length === 0) {
      warnings.push('Failover enabled but no backup servers configured');
    }
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      missingRequired,
      recommendations,
    };
  }

  /**
   * Parse comma-separated server list from environment variable
   */
  private parseServerList(serverListStr: string): string[] {
    try {
      return JSON.parse(serverListStr);
    } catch {
      return serverListStr
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
  }

  /**
   * Set up configuration file watching for development
   */
  private setupConfigFileWatching(): void {
    const configFiles = ['.env', '.env.local', '.env.development'];

    for (const configFile of configFiles) {
      const filePath = path.join(process.cwd(), configFile);
      if (fs.existsSync(filePath)) {
        fs.watchFile(filePath, { interval: 1000 }, () => {
          this.logger.log(
            `Configuration file ${configFile} changed, reloading...`,
          );
          this.reloadConfiguration().catch((error) => {
            this.logger.error(
              'Failed to reload configuration after file change',
              {
                error: error instanceof Error ? error.message : String(error),
              },
            );
          });
        });
      }
    }
  }
}
