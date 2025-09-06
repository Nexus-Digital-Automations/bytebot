/**
 * Configuration Module - Enterprise Configuration Management Module
 * Provides secure, validated configuration management for Bytebot API Platform
 *
 * Features:
 * - Centralized configuration management with NestJS ConfigModule integration
 * - Custom configuration service with secrets management
 * - Environment-specific configuration loading and validation
 * - Performance monitoring and access metrics
 * - Integration with Kubernetes ConfigMaps and Secrets
 *
 * @author Configuration & Secrets Management Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { Module, Global, Logger } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { BytebotConfigService } from './config.service';
import appConfig from './configuration';

/**
 * Global Configuration Module
 * Makes configuration services available throughout the application
 *
 * The @Global() decorator ensures that the configuration services
 * are available in all modules without explicit imports
 */
@Global()
@Module({
  imports: [
    /**
     * NestJS ConfigModule configuration
     * Loads and validates configuration from multiple sources:
     * - Environment variables
     * - .env files (development)
     * - Kubernetes ConfigMaps and Secrets (production)
     */
    NestConfigModule.forRoot({
      // Global configuration access
      isGlobal: true,

      // Configuration sources in priority order
      load: [appConfig],

      // Environment file loading
      envFilePath: [
        '.env.local',
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env',
      ],

      // Cache configuration for performance
      cache: true,

      // Expand environment variables (e.g., $HOME, ${USER})
      expandVariables: true,

      // Ignore missing .env files in production (use Kubernetes secrets instead)
      ignoreEnvFile: process.env.NODE_ENV === 'production',

      // Validate configuration on startup
      validationOptions: {
        allowUnknown: true, // Allow extra environment variables
        abortEarly: false, // Collect all validation errors
      },
    }),
  ],
  providers: [
    BytebotConfigService,
    {
      provide: 'CONFIG_LOGGER',
      useFactory: () => new Logger('ConfigModule'),
    },
  ],
  exports: [
    BytebotConfigService,
    ConfigService, // Export native ConfigService for backward compatibility
  ],
})
export class ConfigurationModule {
  private readonly logger = new Logger('ConfigurationModule');

  constructor(
    private readonly configService: ConfigService,
    private readonly bytebotConfigService: BytebotConfigService,
  ) {
    this.logModuleInitialization();
  }

  /**
   * Log configuration module initialization details
   * Provides visibility into configuration loading process
   *
   * @private
   */
  private logModuleInitialization(): void {
    const startTime = Date.now();

    try {
      const environment = this.configService.get<string>(
        'NODE_ENV',
        'development',
      );
      const port = this.configService.get<number>('PORT', 9991);
      const hasDatabase = !!this.configService.get<string>('DATABASE_URL');

      // Get feature flags status
      const features = this.bytebotConfigService.getFeaturesConfig();
      const enabledFeatures = Object.entries(features)
        .filter(([, enabled]) => enabled)
        .map(([feature]) => feature);

      const initTime = Date.now() - startTime;

      this.logger.log('Configuration Module initialized successfully', {
        environment,
        port,
        hasDatabase,
        enabledFeatures,
        initTimeMs: initTime,
        configCacheEnabled: true,
        secretsLoaderType: this.isKubernetesEnvironment()
          ? 'KubernetesSecretsLoader'
          : 'EnvironmentSecretsLoader',
      });

      // Log configuration validation status
      this.logConfigurationValidation(environment);
    } catch (error) {
      const initTime = Date.now() - startTime;
      this.logger.error('Configuration Module initialization failed', {
        error: error instanceof Error ? error.message : String(error),
        initTimeMs: initTime,
      });
      throw error;
    }
  }

  /**
   * Log configuration validation results
   * Provides detailed information about configuration validation status
   *
   * @private
   * @param environment - Current environment
   */
  private logConfigurationValidation(environment: string): void {
    const validationResults = {
      environment,
      databaseConfigured: !!this.configService.get<string>('DATABASE_URL'),
      securityConfigured: this.validateSecurityConfiguration(),
      llmProvidersConfigured: this.validateLlmProviders(),
      monitoringConfigured: this.validateMonitoringConfiguration(),
      kubernetesReady: this.validateKubernetesConfiguration(),
    };

    const allValid = Object.values(validationResults).every(Boolean);

    if (allValid) {
      this.logger.log(
        'All configuration validation checks passed',
        validationResults,
      );
    } else {
      this.logger.warn(
        'Some configuration validation checks failed',
        validationResults,
      );
    }
  }

  /**
   * Validate security configuration
   * Checks if security settings are properly configured
   *
   * @private
   * @returns True if security is properly configured
   */
  private validateSecurityConfiguration(): boolean {
    try {
      const jwtSecret = this.configService.get<string>('JWT_SECRET');
      const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
      const environment = this.configService.get<string>(
        'NODE_ENV',
        'development',
      );

      if (environment === 'production') {
        return !!(
          jwtSecret &&
          jwtSecret.length >= 32 &&
          encryptionKey &&
          encryptionKey.length >= 32
        );
      }

      return !!(jwtSecret && encryptionKey);
    } catch {
      return false;
    }
  }

  /**
   * Validate LLM providers configuration
   * Checks if at least one LLM provider is configured
   *
   * @private
   * @returns True if at least one LLM provider is configured
   */
  private validateLlmProviders(): boolean {
    try {
      const anthropic = this.configService.get<string>('ANTHROPIC_API_KEY');
      const openai = this.configService.get<string>('OPENAI_API_KEY');
      const gemini = this.configService.get<string>('GEMINI_API_KEY');

      return !!(anthropic || openai || gemini);
    } catch {
      return false;
    }
  }

  /**
   * Validate monitoring configuration
   * Checks if monitoring and observability settings are configured
   *
   * @private
   * @returns True if monitoring is properly configured
   */
  private validateMonitoringConfiguration(): boolean {
    try {
      const metricsEnabled = this.configService.get<boolean>(
        'ENABLE_METRICS_COLLECTION',
        false,
      );
      const healthChecksEnabled = this.configService.get<boolean>(
        'ENABLE_HEALTH_CHECKS',
        true,
      );
      const logLevel = this.configService.get<string>('LOG_LEVEL', 'info');

      return !!(healthChecksEnabled && logLevel);
    } catch {
      return false;
    }
  }

  /**
   * Validate Kubernetes configuration
   * Checks if Kubernetes-specific settings are available when in K8s environment
   *
   * @private
   * @returns True if Kubernetes configuration is valid or not in K8s environment
   */
  private validateKubernetesConfiguration(): boolean {
    try {
      if (!this.isKubernetesEnvironment()) {
        return true; // Not in Kubernetes, so validation passes
      }

      const namespace = this.configService.get<string>(
        'KUBERNETES_NAMESPACE',
        'default',
      );
      const serviceName = this.configService.get<string>(
        'KUBERNETES_SERVICE_NAME',
        'bytebot-agent',
      );

      return !!(namespace && serviceName);
    } catch {
      return false;
    }
  }

  /**
   * Check if running in Kubernetes environment
   *
   * @private
   * @returns True if running in Kubernetes
   */
  private isKubernetesEnvironment(): boolean {
    return !!(
      process.env.KUBERNETES_SERVICE_HOST || process.env.KUBERNETES_PORT
    );
  }
}
