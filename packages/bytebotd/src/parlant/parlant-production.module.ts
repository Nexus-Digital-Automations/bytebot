/**
 * Parlant Production Module
 *
 * Comprehensive production-ready module for Parlant server integration that replaces
 * all mock implementations with real server connections. Provides enterprise-grade
 * reliability, monitoring, and failover capabilities for production deployments.
 *
 * Features:
 * - Real Parlant server integration with production client
 * - Enterprise-grade configuration management
 * - Advanced health monitoring with circuit breaker patterns
 * - Multi-server failover with intelligent load balancing
 * - Comprehensive logging and metrics collection
 * - Production-ready error handling and recovery
 * - Security and compliance features for enterprise use
 *
 * Architecture: Production module with enterprise reliability patterns
 * Security: Enterprise-grade security with authentication and encryption
 * Performance: Optimized for high-throughput production environments
 */

import { Module, DynamicModule, Logger } from '@nestjs/common';import { ConfigModule, ConfigService } from '@nestjs/config';// Configuration and Environmentimport { ParlantEnvironmentConfigService } from './config/parlant-environment.config';// Core Production Servicesimport { ParlantProductionClientService } from './client/parlant-production-client.service';import { ParlantProductionIntegrationService } from './parlant-production-integration.service';// Monitoring and Healthimport { ParlantHealthMonitorService } from './monitoring/parlant-health-monitor.service';// Failover and Reliabilityimport { ParlantFailoverManagerService } from './failover/parlant-failover-manager.service';// Legacy compatibility (for gradual migration)import { ParlantIntegrationService } from './parlant-integration.service';/*** Production module configuration options
 */
export interface ParlantProductionModuleOptions {
  // Core configuration
  readonly enabled?: boolean;
  readonly environment?: 'development' | 'staging' | 'production';
  readonly serverUrl?: string;
  readonly apiKey?: string;
  readonly wsUrl?: string;

  // Feature toggles
  readonly enableHealthMonitoring?: boolean;
  readonly enableFailover?: boolean;
  readonly enableCircuitBreaker?: boolean;
  readonly enableMetrics?: boolean;
  readonly enableAudit?: boolean;

  // Performance settings
  readonly connectionTimeout?: number;
  readonly maxRetries?: number;
  readonly cacheEnabled?: boolean;
  readonly batchingEnabled?: boolean;

  // Security settings
  readonly tlsEnabled?: boolean;
  readonly authenticationRequired?: boolean;
  readonly encryptionEnabled?: boolean;

  // Monitoring settings
  readonly healthCheckInterval?: number;
  readonly metricsInterval?: number;
  readonly alertsEnabled?: boolean;

  // Custom configuration override
  readonly configOverrides?: Record<string, unknown>;
}

/**
 * Async configuration factory for production module
 */
export interface ParlantProductionModuleAsyncOptions {
  imports?: any[];
  useFactory?: (...args: any[]) => Promise<ParlantProductionModuleOptions> | ParlantProductionModuleOptions;
  inject?: any[];
}

@Module({})
export class ParlantProductionModule {
  private static readonly logger = new Logger(ParlantProductionModule.name);

  /**
   * Register module with synchronous configuration
   */
  static forRoot(options: ParlantProductionModuleOptions = {}): DynamicModule {
    return {
      module: ParlantProductionModule,
      imports: [ConfigModule],
      providers: [
        // Configuration services
        {
          provide: 'PARLANT_PRODUCTION_OPTIONS',useValue: options,},
        ParlantEnvironmentConfigService,

        // Core production services
        ParlantProductionClientService,
        ParlantProductionIntegrationService,

        // Monitoring and health services
        ParlantHealthMonitorService,

        // Failover and reliability services
        ParlantFailoverManagerService,

        // Legacy compatibility alias
        {
          provide: ParlantIntegrationService,
          useExisting: ParlantProductionIntegrationService,
        },

        // Module initialization service
        {
          provide: 'PARLANT_PRODUCTION_INITIALIZER',useFactory: (configService: ParlantEnvironmentConfigService,
            integrationService: ParlantProductionIntegrationService,
            healthMonitor: ParlantHealthMonitorService,
            failoverManager: ParlantFailoverManagerService
          ) => {
            return this.initializeProductionModule(
              options,
              configService,
              integrationService,
              healthMonitor,
              failoverManager
            );
          },
          inject: [
            ParlantEnvironmentConfigService,
            ParlantProductionIntegrationService,
            ParlantHealthMonitorService,
            ParlantFailoverManagerService,
          ],
        },
      ],
      exports: [
        ParlantEnvironmentConfigService,
        ParlantProductionClientService,
        ParlantProductionIntegrationService,
        ParlantHealthMonitorService,
        ParlantFailoverManagerService,
        ParlantIntegrationService, // Legacy compatibility
      ],
      global: true,
    };
  }

  /**
   * Register module with asynchronous configuration
   */
  static forRootAsync(options: ParlantProductionModuleAsyncOptions): DynamicModule {
    return {
      module: ParlantProductionModule,
      imports: [ConfigModule, ...(options.imports || [])],
      providers: [
        // Async configuration provider
        {
          provide: 'PARLANT_PRODUCTION_OPTIONS',useFactory: options.useFactory,inject: options.inject || [],
        },
        ParlantEnvironmentConfigService,

        // Core production services
        ParlantProductionClientService,
        ParlantProductionIntegrationService,

        // Monitoring and health services
        ParlantHealthMonitorService,

        // Failover and reliability services
        ParlantFailoverManagerService,

        // Legacy compatibility alias
        {
          provide: ParlantIntegrationService,
          useExisting: ParlantProductionIntegrationService,
        },

        // Module initialization service
        {
          provide: 'PARLANT_PRODUCTION_INITIALIZER',useFactory: async (moduleOptions: ParlantProductionModuleOptions,
            configService: ParlantEnvironmentConfigService,
            integrationService: ParlantProductionIntegrationService,
            healthMonitor: ParlantHealthMonitorService,
            failoverManager: ParlantFailoverManagerService
          ) => {
            return this.initializeProductionModule(
              moduleOptions,
              configService,
              integrationService,
              healthMonitor,
              failoverManager
            );
          },
          inject: [
            'PARLANT_PRODUCTION_OPTIONS',ParlantEnvironmentConfigService,ParlantProductionIntegrationService,
            ParlantHealthMonitorService,
            ParlantFailoverManagerService,
          ],
        },
      ],
      exports: [
        ParlantEnvironmentConfigService,
        ParlantProductionClientService,
        ParlantProductionIntegrationService,
        ParlantHealthMonitorService,
        ParlantFailoverManagerService,
        ParlantIntegrationService, // Legacy compatibility
      ],
      global: true,
    };
  }

  /**
   * Create feature module for specific production features
   */
  static forFeature(features: Array<'health' | 'failover' | 'metrics' | 'audit'>): DynamicModule {const providers: any[] = [];if (features.includes('health')) {providers.push(ParlantHealthMonitorService);}

    if (features.includes('failover')) {
      providers.push(ParlantFailoverManagerService);
    }

    // Add other feature-specific providers as needed

    return {
      module: ParlantProductionModule,
      providers,
      exports: providers,
    };
  }

  /**
   * Initialize production module with comprehensive setup
   */
  private static async initializeProductionModule(
    options: ParlantProductionModuleOptions,
    configService: ParlantEnvironmentConfigService,
    integrationService: ParlantProductionIntegrationService,
    healthMonitor: ParlantHealthMonitorService,
    failoverManager: ParlantFailoverManagerService
  ): Promise<void> {
    const operationId = `prod_module_init_${Date.now()}_${Math.random().toString(36).substring(7)}`;try {this.logger.log(`[${operationId}] Initializing Parlant Production Module`, {
        enabled: options.enabled ?? true,
        environment: options.environment ?? 'production',
        serverUrl: options.serverUrl,
        features: {
          healthMonitoring: options.enableHealthMonitoring ?? true,
          failover: options.enableFailover ?? true,
          circuitBreaker: options.enableCircuitBreaker ?? true,
          metrics: options.enableMetrics ?? true,
          audit: options.enableAudit ?? true,
        },
      });

      // Validate configuration
      if (!configService.isEnabled()) {
        this.logger.warn(`[${operationId}] Parlant integration is disabled, skipping initialization`);return;}

      const validationResult = configService.getValidationResult();
      if (!validationResult.valid) {
        this.logger.error(`[${operationId}] Configuration validation failed`, {errors: validationResult.errors,missingRequired: validationResult.missingRequired,
        });
        throw new Error(`Invalid Parlant configuration: ${validationResult.errors.join(`, ')}`);}if (validationResult.warnings.length > 0) {
        this.logger.warn(`[${operationId}] Configuration warnings detected`, {
          warnings: validationResult.warnings,
          recommendations: validationResult.recommendations,
        });
      }

      // Set up health monitoring integration
      if (options.enableHealthMonitoring ?? true) {
        healthMonitor.on('health-status-update', (status) => {this.logger.debug('Health status updated', {overall: status.overall,connectivity: status.connectivity.success,
            api: status.api.success,
            websocket: status.websocket.success,
            performance: status.performance.success,
          });
        });

        healthMonitor.on('health-alert', (alert) => {this.logger.warn('Health alert triggered', {id: alert.id,severity: alert.severity,
            type: alert.type,
            message: alert.message,
          });
        });

        healthMonitor.on('health-alert-resolved', (alert) => {this.logger.log('Health alert resolved', {id: alert.id,resolvedAt: alert.resolvedAt,
          });
        });
      }

      // Set up failover integration
      if (options.enableFailover ?? true) {
        failoverManager.on('server-degraded', (event) => {this.logger.warn('Server degraded', {serverId: event.serverId,consecutiveFailures: event.consecutiveFailures,
            error: event.error,
          });
        });

        failoverManager.on('circuit-breaker-state-change', (newState) => {this.logger.warn('Circuit breaker state changed', {newState,timestamp: new Date(),
          });
        });
      }

      // Set up integration service monitoring
      integrationService.on?.('validation-completed', (result) => {this.logger.debug('Validation completed', {operationId: result.operationId,approved: result.approved,
          confidence: result.confidence,
          source: result.source,
        });
      });

      // Set up configuration change monitoring
      configService.onConfigurationUpdate((newConfig) => {
        this.logger.log('Configuration updated', {serverUrl: newConfig.serverUrl,environment: newConfig.environment,
          enabled: newConfig.enabled,
        });
      });

      // Perform initial system health check
      const initialHealthCheck = await healthMonitor.performComprehensiveHealthCheck();

      if (!initialHealthCheck.overall || initialHealthCheck.overall === 'unhealthy') {
        this.logger.warn(`[${operationId}] Initial health check failed`, {overall: initialHealthCheck.overall,connectivity: initialHealthCheck.connectivity.success,
          errors: [
            ...initialHealthCheck.connectivity.errors || [],
            ...initialHealthCheck.api.errors || [],
            ...initialHealthCheck.websocket.errors || [],
            ...initialHealthCheck.performance.errors || [],
          ],
        });
      } else {
        this.logger.log(`[${operationId}] Initial health check passed`, {overall: initialHealthCheck.overall,serverVersion: initialHealthCheck.serverInfo.version,
          averageResponseTime: initialHealthCheck.metrics.averageResponseTime,
        });
      }

      // Log successful initialization
      this.logger.log(`[${operationId}] Parlant Production Module initialized successfully`, {serverUrl: configService.getConfiguration().serverUrl,environment: configService.getConfiguration().environment,
        healthStatus: initialHealthCheck.overall,
        failoverServers: configService.getConfiguration().failover.servers.length,
        cacheEnabled: configService.getConfiguration().performance.cacheEnabled,
        auditEnabled: configService.getConfiguration().audit.enabled,
      });

    } catch (error) {
      this.logger.error(`[${operationId}] Failed to initialize Parlant Production Module`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        options: {
          enabled: options.enabled,
          environment: options.environment,
          serverUrl: options.serverUrl,
        },
      });
      throw error;
    }
  }
}

/**
 * Convenience function to create production configuration from environment
 */
export function createProductionConfigFromEnv(): ParlantProductionModuleOptions {
  return {
    enabled: process.env.PARLANT_ENABLED !== 'false',environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'production',serverUrl: process.env.PARLANT_API_BASE_URL,apiKey: process.env.PARLANT_API_KEY,
    wsUrl: process.env.PARLANT_WS_URL,

    enableHealthMonitoring: process.env.PARLANT_ENABLE_HEALTH_CHECK !== 'false',enableFailover: process.env.PARLANT_RETRY_FAILOVER_ENABLED !== 'false',enableCircuitBreaker: process.env.PARLANT_CIRCUIT_BREAKER_ENABLED !== 'false',enableMetrics: process.env.PARLANT_ENABLE_PROMETHEUS_METRICS !== 'false',enableAudit: process.env.PARLANT_AUDIT_ENABLED !== 'false',connectionTimeout: parseInt(process.env.PARLANT_API_TIMEOUT_MS || '8000', 10),maxRetries: parseInt(process.env.PARLANT_API_RETRIES || '5', 10),cacheEnabled: process.env.PARLANT_CACHE_ENABLED !== 'false',batchingEnabled: process.env.PARLANT_BATCHING_ENABLED !== 'false',tlsEnabled: process.env.PARLANT_TLS_ENABLED !== 'false',authenticationRequired: !!process.env.PARLANT_API_KEY,encryptionEnabled: process.env.PARLANT_AUDIT_ENCRYPTION_ENABLED === 'true',healthCheckInterval: parseInt(process.env.PARLANT_HEALTH_CHECK_INTERVAL_MS || '15000', 10),metricsInterval: parseInt(process.env.PARLANT_METRICS_INTERVAL_MS || '60000', 10),alertsEnabled: process.env.PARLANT_ENABLE_FAILURE_ALERTS !== 'false',};}

/**
 * Example usage configurations for different environments
 */
export const PRODUCTION_CONFIGURATIONS = {
  /**
   * Development configuration with local Parlant server
   */
  development: (): ParlantProductionModuleOptions => ({
    enabled: true,
    environment: 'development',serverUrl: 'http://localhost:8000',enableHealthMonitoring: true,enableFailover: false,
    enableCircuitBreaker: false,
    enableMetrics: false,
    enableAudit: false,
    connectionTimeout: 10000,
    maxRetries: 3,
    cacheEnabled: true,
    tlsEnabled: false,
    authenticationRequired: false,
    healthCheckInterval: 30000,
  }),

  /**
   * Staging configuration with staging Parlant server
   */
  staging: (): ParlantProductionModuleOptions => ({
    enabled: true,
    environment: 'staging',serverUrl: 'https://staging-api.parlant.io',enableHealthMonitoring: true,enableFailover: true,
    enableCircuitBreaker: true,
    enableMetrics: true,
    enableAudit: true,
    connectionTimeout: 8000,
    maxRetries: 4,
    cacheEnabled: true,
    batchingEnabled: true,
    tlsEnabled: true,
    authenticationRequired: true,
    encryptionEnabled: true,
    healthCheckInterval: 15000,
    alertsEnabled: true,
  }),

  /**
   * Production configuration with full enterprise features
   */
  production: (): ParlantProductionModuleOptions => ({
    enabled: true,
    environment: 'production',serverUrl: 'https://api.parlant.io',
    enableHealthMonitoring: true,
    enableFailover: true,
    enableCircuitBreaker: true,
    enableMetrics: true,
    enableAudit: true,
    connectionTimeout: 8000,
    maxRetries: 5,
    cacheEnabled: true,
    batchingEnabled: true,
    tlsEnabled: true,
    authenticationRequired: true,
    encryptionEnabled: true,
    healthCheckInterval: 15000,
    metricsInterval: 60000,
    alertsEnabled: true,
  }),
};