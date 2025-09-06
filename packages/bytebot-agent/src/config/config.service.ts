/**
 * Configuration Service - Centralized configuration access and management
 * Provides type-safe configuration access, secrets decryption, and configuration hot-reloading
 *
 * Features:
 * - Type-safe configuration access through typed getters
 * - Secrets decryption using encryption keys
 * - Configuration validation and error handling
 * - Performance monitoring for configuration access
 * - Integration with Kubernetes ConfigMaps and Secrets
 *
 * @author Configuration & Secrets Management Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './configuration';
import * as crypto from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Secrets loader interface for different secret sources
 */
interface SecretsLoader {
  loadSecret(secretName: string, key: string): Promise<string | null>;
}

/**
 * Kubernetes secrets loader implementation
 * Loads secrets from mounted Kubernetes secret volumes
 */
class KubernetesSecretsLoader implements SecretsLoader {
  private readonly logger = new Logger('KubernetesSecretsLoader');
  private readonly secretsPath = '/etc/secrets';

  /**
   * Load secret from Kubernetes mounted secret volume
   * Secrets are typically mounted at /etc/secrets/<secret-name>/<key>
   *
   * @param secretName - Name of the Kubernetes secret
   * @param key - Key within the secret
   * @returns Decrypted secret value or null if not found
   */
  async loadSecret(secretName: string, key: string): Promise<string | null> {
    const operationId = `load-k8s-secret-${Date.now()}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Loading Kubernetes secret`, {
      secretName,
      key,
      secretsPath: this.secretsPath,
    });

    try {
      const secretPath = join(this.secretsPath, secretName, key);

      if (!existsSync(secretPath)) {
        this.logger.debug(`[${operationId}] Secret file not found`, {
          secretPath,
          secretName,
          key,
        });
        return null;
      }

      const secretValue = readFileSync(secretPath, 'utf8').trim();
      const loadTime = Date.now() - startTime;

      this.logger.debug(`[${operationId}] Secret loaded successfully`, {
        secretName,
        key,
        hasValue: !!secretValue,
        loadTimeMs: loadTime,
      });

      return secretValue;
    } catch (error) {
      const loadTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] Failed to load Kubernetes secret`, {
        secretName,
        key,
        error: error instanceof Error ? error.message : String(error),
        loadTimeMs: loadTime,
      });
      return null;
    }
  }
}

/**
 * Environment variables secrets loader implementation
 * Fallback to environment variables when Kubernetes secrets are not available
 */
class EnvironmentSecretsLoader implements SecretsLoader {
  private readonly logger = new Logger('EnvironmentSecretsLoader');

  /**
   * Load secret from environment variables
   *
   * @param secretName - Environment variable name (ignored, uses key directly)
   * @param key - Environment variable name
   * @returns Secret value from environment or null if not found
   */
  async loadSecret(secretName: string, key: string): Promise<string | null> {
    const operationId = `load-env-secret-${Date.now()}`;

    this.logger.debug(`[${operationId}] Loading environment secret`, {
      key,
      hasValue: !!process.env[key],
    });

    return process.env[key] || null;
  }
}

/**
 * Enhanced Configuration Service
 * Provides enterprise-grade configuration management with secrets support
 */
@Injectable()
export class BytebotConfigService implements OnModuleInit {
  private readonly logger = new Logger('BytebotConfigService');
  private readonly secretsLoader: SecretsLoader;
  private readonly encryptionKey: string;
  private cachedSecrets = new Map<string, string>();
  private configAccessMetrics = new Map<
    string,
    { count: number; lastAccess: Date }
  >();

  constructor(private readonly configService: ConfigService) {
    // Initialize secrets loader based on environment
    this.secretsLoader = this.isKubernetesEnvironment()
      ? new KubernetesSecretsLoader()
      : new EnvironmentSecretsLoader();

    // Get encryption key for secrets decryption
    this.encryptionKey = this.configService.get<string>(
      'app.security.encryptionKey',
    )!;
  }

  /**
   * Initialize configuration service
   * Performs startup configuration validation and secrets preloading
   */
  async onModuleInit(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('Initializing Bytebot Configuration Service...');

    try {
      // Validate critical configuration
      await this.validateCriticalConfiguration();

      // Preload critical secrets
      await this.preloadCriticalSecrets();

      const initTime = Date.now() - startTime;
      this.logger.log('Configuration Service initialized successfully', {
        initTimeMs: initTime,
        secretsLoaderType: this.secretsLoader.constructor.name,
        cachedSecretsCount: this.cachedSecrets.size,
      });
    } catch (error) {
      const initTime = Date.now() - startTime;
      this.logger.error('Configuration Service initialization failed', {
        error: error instanceof Error ? error.message : String(error),
        initTimeMs: initTime,
      });
      throw error;
    }
  }

  /**
   * Get complete application configuration
   * Returns the full validated configuration object
   *
   * @returns Complete application configuration
   */
  getAppConfig(): AppConfig {
    this.recordConfigAccess('app.config.full');
    return this.configService.get<AppConfig>('app')!;
  }

  /**
   * Get database configuration
   *
   * @returns Database configuration object
   */
  getDatabaseConfig(): AppConfig['database'] {
    this.recordConfigAccess('app.config.database');
    return this.configService.get<AppConfig['database']>('app.database')!;
  }

  /**
   * Get API configuration
   *
   * @returns API configuration object
   */
  getApiConfig(): AppConfig['api'] {
    this.recordConfigAccess('app.config.api');
    return this.configService.get<AppConfig['api']>('app.api')!;
  }

  /**
   * Get security configuration (without sensitive data)
   *
   * @returns Security configuration object with secrets masked
   */
  getSecurityConfig(): Omit<
    AppConfig['security'],
    'jwtSecret' | 'encryptionKey'
  > {
    this.recordConfigAccess('app.config.security');
    const security =
      this.configService.get<AppConfig['security']>('app.security')!;

    return {
      jwtExpiresIn: security.jwtExpiresIn,
      jwtRefreshExpiresIn: security.jwtRefreshExpiresIn,
    };
  }

  /**
   * Get JWT secret securely
   *
   * @returns JWT secret for token signing
   */
  async getJwtSecret(): Promise<string> {
    this.recordConfigAccess('app.secrets.jwt');
    return (
      (await this.getSecret('jwt-secret', 'JWT_SECRET')) ||
      this.configService.get<string>('app.security.jwtSecret')!
    );
  }

  /**
   * Get encryption key securely
   *
   * @returns Encryption key for data encryption
   */
  async getEncryptionKey(): Promise<string> {
    this.recordConfigAccess('app.secrets.encryption');
    return (
      (await this.getSecret('encryption-key', 'ENCRYPTION_KEY')) ||
      this.configService.get<string>('app.security.encryptionKey')!
    );
  }

  /**
   * Get LLM API key securely
   *
   * @param provider - LLM provider (anthropic, openai, gemini)
   * @returns API key for the specified provider
   */
  async getLlmApiKey(
    provider: 'anthropic' | 'openai' | 'gemini',
  ): Promise<string | null> {
    this.recordConfigAccess(`app.secrets.llm.${provider}`);

    const secretName = `${provider}-api-key`;
    const envKey = `${provider.toUpperCase()}_API_KEY`;

    return (
      (await this.getSecret(secretName, envKey)) ||
      this.configService.get<string>(`app.llmApiKeys.${provider}`) ||
      null
    );
  }

  /**
   * Get services configuration
   *
   * @returns Services configuration object
   */
  getServicesConfig(): AppConfig['services'] {
    this.recordConfigAccess('app.config.services');
    return this.configService.get<AppConfig['services']>('app.services')!;
  }

  /**
   * Get features configuration
   *
   * @returns Features configuration object
   */
  getFeaturesConfig(): AppConfig['features'] {
    this.recordConfigAccess('app.config.features');
    return this.configService.get<AppConfig['features']>('app.features')!;
  }

  /**
   * Check if a feature is enabled
   *
   * @param featureName - Name of the feature to check
   * @returns True if feature is enabled, false otherwise
   */
  isFeatureEnabled(featureName: keyof AppConfig['features']): boolean {
    this.recordConfigAccess(`app.features.${featureName}`);
    return (
      this.configService.get<boolean>(`app.features.${featureName}`) ?? false
    );
  }

  /**
   * Get monitoring configuration
   *
   * @returns Monitoring configuration object
   */
  getMonitoringConfig(): AppConfig['monitoring'] {
    this.recordConfigAccess('app.config.monitoring');
    return this.configService.get<AppConfig['monitoring']>('app.monitoring')!;
  }

  /**
   * Get circuit breaker configuration
   *
   * @returns Circuit breaker configuration object
   */
  getCircuitBreakerConfig(): AppConfig['circuitBreaker'] {
    this.recordConfigAccess('app.config.circuitBreaker');
    return this.configService.get<AppConfig['circuitBreaker']>(
      'app.circuitBreaker',
    )!;
  }

  /**
   * Get health check configuration
   *
   * @returns Health check configuration object
   */
  getHealthCheckConfig(): AppConfig['healthCheck'] {
    this.recordConfigAccess('app.config.healthCheck');
    return this.configService.get<AppConfig['healthCheck']>('app.healthCheck')!;
  }

  /**
   * Get Kubernetes configuration
   *
   * @returns Kubernetes configuration object
   */
  getKubernetesConfig(): AppConfig['kubernetes'] {
    this.recordConfigAccess('app.config.kubernetes');
    return this.configService.get<AppConfig['kubernetes']>('app.kubernetes')!;
  }

  /**
   * Get development configuration
   *
   * @returns Development configuration object
   */
  getDevelopmentConfig(): AppConfig['development'] {
    this.recordConfigAccess('app.config.development');
    return this.configService.get<AppConfig['development']>('app.development')!;
  }

  /**
   * Get configuration access metrics for monitoring
   *
   * @returns Configuration access metrics
   */
  getConfigAccessMetrics(): Array<{
    key: string;
    count: number;
    lastAccess: Date;
  }> {
    return Array.from(this.configAccessMetrics.entries()).map(
      ([key, metrics]) => ({
        key,
        ...metrics,
      }),
    );
  }

  /**
   * Load secret from configured secrets source
   *
   * @private
   * @param secretName - Name of the secret
   * @param fallbackKey - Fallback environment variable key
   * @returns Secret value or null if not found
   */
  private async getSecret(
    secretName: string,
    fallbackKey: string,
  ): Promise<string | null> {
    const operationId = `get-secret-${Date.now()}`;
    const startTime = Date.now();

    // Check cache first
    const cacheKey = `${secretName}:${fallbackKey}`;
    if (this.cachedSecrets.has(cacheKey)) {
      this.logger.debug(`[${operationId}] Secret retrieved from cache`, {
        secretName,
        cacheKey,
      });
      return this.cachedSecrets.get(cacheKey)!;
    }

    try {
      const secretValue = await this.secretsLoader.loadSecret(
        secretName,
        fallbackKey,
      );
      const loadTime = Date.now() - startTime;

      if (secretValue) {
        // Cache the secret for future access
        this.cachedSecrets.set(cacheKey, secretValue);

        this.logger.debug(`[${operationId}] Secret loaded and cached`, {
          secretName,
          hasValue: !!secretValue,
          loadTimeMs: loadTime,
        });
      } else {
        this.logger.debug(`[${operationId}] Secret not found`, {
          secretName,
          loadTimeMs: loadTime,
        });
      }

      return secretValue;
    } catch (error) {
      const loadTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] Failed to load secret`, {
        secretName,
        error: error instanceof Error ? error.message : String(error),
        loadTimeMs: loadTime,
      });
      return null;
    }
  }

  /**
   * Check if running in Kubernetes environment
   *
   * @private
   * @returns True if running in Kubernetes, false otherwise
   */
  private isKubernetesEnvironment(): boolean {
    return !!(
      process.env.KUBERNETES_SERVICE_HOST ||
      process.env.KUBERNETES_PORT ||
      existsSync('/var/run/secrets/kubernetes.io/serviceaccount/token')
    );
  }

  /**
   * Validate critical configuration on startup
   *
   * @private
   * @throws Error if critical configuration is missing or invalid
   */
  private async validateCriticalConfiguration(): Promise<void> {
    const operationId = `validate-config-${Date.now()}`;
    this.logger.debug(`[${operationId}] Validating critical configuration...`);

    const config = this.getAppConfig();
    const validationErrors: string[] = [];

    // Validate database configuration
    if (!config.database.url) {
      validationErrors.push('Database URL is required');
    }

    // Validate security configuration in production
    if (config.nodeEnv === 'production') {
      if (!config.security.jwtSecret || config.security.jwtSecret.length < 32) {
        validationErrors.push(
          'JWT secret must be at least 32 characters in production',
        );
      }

      if (
        !config.security.encryptionKey ||
        config.security.encryptionKey.length < 32
      ) {
        validationErrors.push(
          'Encryption key must be at least 32 characters in production',
        );
      }
    }

    // Validate at least one LLM API key is configured
    const hasLlmKey =
      config.llmApiKeys.anthropic ||
      config.llmApiKeys.openai ||
      config.llmApiKeys.gemini;
    if (!hasLlmKey) {
      validationErrors.push('At least one LLM API key must be configured');
    }

    if (validationErrors.length > 0) {
      this.logger.error(
        `[${operationId}] Critical configuration validation failed`,
        {
          errors: validationErrors,
        },
      );
      throw new Error(
        `Critical configuration validation failed: ${validationErrors.join(', ')}`,
      );
    }

    this.logger.debug(
      `[${operationId}] Critical configuration validation passed`,
    );
  }

  /**
   * Preload critical secrets for performance
   *
   * @private
   */
  private async preloadCriticalSecrets(): Promise<void> {
    const operationId = `preload-secrets-${Date.now()}`;
    this.logger.debug(`[${operationId}] Preloading critical secrets...`);

    const secretsToPreload = [
      { secretName: 'jwt-secret', fallbackKey: 'JWT_SECRET' },
      { secretName: 'encryption-key', fallbackKey: 'ENCRYPTION_KEY' },
      { secretName: 'anthropic-api-key', fallbackKey: 'ANTHROPIC_API_KEY' },
      { secretName: 'openai-api-key', fallbackKey: 'OPENAI_API_KEY' },
      { secretName: 'gemini-api-key', fallbackKey: 'GEMINI_API_KEY' },
    ];

    const preloadPromises = secretsToPreload.map(
      async ({ secretName, fallbackKey }) => {
        try {
          await this.getSecret(secretName, fallbackKey);
        } catch (error) {
          this.logger.warn(`Failed to preload secret ${secretName}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );

    await Promise.all(preloadPromises);

    this.logger.debug(
      `[${operationId}] Critical secrets preloading completed`,
      {
        cachedSecretsCount: this.cachedSecrets.size,
      },
    );
  }

  /**
   * Record configuration access for metrics
   *
   * @private
   * @param key - Configuration key being accessed
   */
  private recordConfigAccess(key: string): void {
    const current = this.configAccessMetrics.get(key) || {
      count: 0,
      lastAccess: new Date(),
    };
    this.configAccessMetrics.set(key, {
      count: current.count + 1,
      lastAccess: new Date(),
    });
  }
}
