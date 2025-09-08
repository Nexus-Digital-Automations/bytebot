/**
 * Local Configuration Service - 100% Local-Only Architecture
 * Centralized configuration access and management with comprehensive local file-based secrets management
 *
 * Features:
 * - Type-safe configuration access through typed getters
 * - Local file-based secrets encryption/decryption using AES-256-GCM
 * - Environment variables security with sanitization and validation
 * - Configuration validation and comprehensive error handling
 * - Performance monitoring for configuration access
 * - LOCAL file-based secrets storage with proper permissions (600/700)
 * - Docker Compose compatibility for multi-service local deployment
 * - No Kubernetes or cloud service dependencies
 *
 * @author Local Secrets Service Architect
 * @version 2.0.0 - Local-Only Architecture Implementation
 * @since Phase 1: Bytebot API Hardening - Local Deployment
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './configuration';
import {
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
  accessSync,
  constants,
  readdirSync,
} from 'fs';
import { join, dirname } from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';

/**
 * Local secrets loader interface for file-based secret sources
 * Replaces cloud-based secret management with local implementations
 */
interface LocalSecretsLoader {
  loadSecret(secretName: string, key: string): string | null;
  storeSecret(
    secretName: string,
    key: string,
    value: string,
  ): Promise<boolean> | boolean;
  deleteSecret(secretName: string, key: string): Promise<boolean> | boolean;
  listSecrets(): string[];
}

/**
 * Local file-based secrets loader implementation
 * Implements enterprise-grade secrets management using local encrypted file storage
 * Replaces Kubernetes secrets with secure local file system storage
 */
class LocalFileSecretsLoader implements LocalSecretsLoader {
  private readonly logger = new Logger('LocalFileSecretsLoader');
  private readonly secretsPath: string;
  private readonly encryptionKey: Buffer;

  constructor(secretsPath?: string, encryptionKey?: string) {
    // Local secrets directory with proper permissions
    this.secretsPath =
      secretsPath || process.env.LOCAL_SECRETS_DIR || './.env/secrets';

    // Initialize encryption key for local secrets encryption
    const keyString =
      encryptionKey ||
      process.env.LOCAL_SECRETS_ENCRYPTION_KEY ||
      'default-local-key-change-in-production';
    this.encryptionKey = crypto.scryptSync(keyString, 'salt', 32);

    // Ensure secrets directory exists with proper permissions
    this.initializeSecretsDirectory();
  }

  /**
   * Initialize local secrets directory with proper file permissions
   */
  private initializeSecretsDirectory(): void {
    try {
      if (!existsSync(this.secretsPath)) {
        mkdirSync(this.secretsPath, { recursive: true });
        // Set directory permissions to 700 (owner read/write/execute only)
        chmodSync(this.secretsPath, 0o700);
        this.logger.log(
          `Created secrets directory with secure permissions: ${this.secretsPath}`,
        );
      }

      // Verify directory permissions
      try {
        accessSync(this.secretsPath, constants.R_OK | constants.W_OK);
        this.logger.debug('Secrets directory access validated');
      } catch (error) {
        this.logger.error('Secrets directory access validation failed', {
          path: this.secretsPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      this.logger.error('Failed to initialize secrets directory', {
        path: this.secretsPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Load secret from local encrypted file storage
   * Replaces Kubernetes secret mounting with local file system access
   *
   * @param secretName - Name of the secret category
   * @param key - Specific key within the secret category
   * @returns Decrypted secret value or null if not found
   */
  loadSecret(secretName: string, key: string): string | null {
    const operationId = `load-local-secret-${Date.now()}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Loading local file-based secret`, {
      secretName,
      key,
      secretsPath: this.secretsPath,
    });

    try {
      const secretFile = join(this.secretsPath, `${secretName}.enc`);

      if (!existsSync(secretFile)) {
        this.logger.debug(`[${operationId}] Secret file not found`, {
          secretFile,
          secretName,
          key,
        });
        return null;
      }

      // Read and decrypt the secret file
      const encryptedData = readFileSync(secretFile, 'utf8');
      const decryptedData = this.decryptSecret(encryptedData);

      // Parse the secrets JSON
      const secrets = JSON.parse(decryptedData) as Record<string, string>;
      const secretValue = secrets[key] || null;

      const loadTime = Date.now() - startTime;

      this.logger.debug(`[${operationId}] Local secret loaded successfully`, {
        secretName,
        key,
        hasValue: !!secretValue,
        loadTimeMs: loadTime,
      });

      return secretValue;
    } catch (error) {
      const loadTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] Failed to load local secret`, {
        secretName,
        key,
        error: error instanceof Error ? error.message : String(error),
        loadTimeMs: loadTime,
      });
      return null;
    }
  }

  /**
   * Store secret in local encrypted file storage
   * Implements secure secret storage with encryption and proper file permissions
   *
   * @param secretName - Name of the secret category
   * @param key - Specific key within the secret category
   * @param value - Secret value to store
   * @returns Success status
   */
  storeSecret(secretName: string, key: string, value: string): boolean {
    const operationId = `store-local-secret-${Date.now()}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Storing local secret`, {
      secretName,
      key,
      hasValue: !!value,
    });

    try {
      const secretFile = join(this.secretsPath, `${secretName}.enc`);
      let secrets: Record<string, string> = {};

      // Load existing secrets if file exists
      if (existsSync(secretFile)) {
        try {
          const encryptedData = readFileSync(secretFile, 'utf8');
          const decryptedData = this.decryptSecret(encryptedData);
          secrets = JSON.parse(decryptedData) as Record<string, string>;
        } catch (error) {
          this.logger.warn(
            `[${operationId}] Could not load existing secrets, creating new`,
            {
              secretName,
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      }

      // Update the secret
      secrets[key] = value;

      // Encrypt and store
      const encryptedData = this.encryptSecret(JSON.stringify(secrets));
      writeFileSync(secretFile, encryptedData, { mode: 0o600 }); // Restrict to owner only

      const storeTime = Date.now() - startTime;

      this.logger.debug(`[${operationId}] Local secret stored successfully`, {
        secretName,
        key,
        storeTimeMs: storeTime,
      });

      return true;
    } catch (error) {
      const storeTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] Failed to store local secret`, {
        secretName,
        key,
        error: error instanceof Error ? error.message : String(error),
        storeTimeMs: storeTime,
      });
      return false;
    }
  }

  /**
   * Delete secret from local storage
   *
   * @param secretName - Name of the secret category
   * @param key - Specific key within the secret category
   * @returns Success status
   */
  async deleteSecret(secretName: string, key: string): Promise<boolean> {
    const operationId = `delete-local-secret-${Date.now()}`;

    try {
      const secretFile = join(this.secretsPath, `${secretName}.enc`);

      if (!existsSync(secretFile)) {
        this.logger.debug(
          `[${operationId}] Secret file not found for deletion`,
          {
            secretName,
            key,
          },
        );
        return true; // Consider non-existent as successfully deleted
      }

      // Load existing secrets
      const encryptedData = readFileSync(secretFile, 'utf8');
      const decryptedData = this.decryptSecret(encryptedData);
      const secrets = JSON.parse(decryptedData) as Record<string, string>;

      // Remove the specific key
      delete secrets[key];

      // If no secrets remain, we could delete the file, otherwise re-save
      if (Object.keys(secrets).length === 0) {
        // Delete the entire file if no secrets remain
        await fs.unlink(secretFile);
      } else {
        // Re-save the remaining secrets
        const newEncryptedData = this.encryptSecret(JSON.stringify(secrets));
        writeFileSync(secretFile, newEncryptedData, { mode: 0o600 });
      }

      this.logger.debug(`[${operationId}] Local secret deleted successfully`, {
        secretName,
        key,
      });

      return true;
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to delete local secret`, {
        secretName,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * List all available secrets
   * Returns list of secret categories available in local storage
   *
   * @returns Array of secret names
   */
  listSecrets(): string[] {
    try {
      const files = readdirSync(this.secretsPath);
      return files
        .filter((file: string) => file.endsWith('.enc'))
        .map((file: string) => file.replace('.enc', ''));
    } catch (error) {
      this.logger.error('Failed to list secrets', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Encrypt secret value using AES-256-GCM
   *
   * @param plaintext - Plain text secret to encrypt
   * @returns Encrypted secret string
   */
  private encryptSecret(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt secret value using AES-256-GCM
   *
   * @param encryptedData - Encrypted secret string
   * @returns Decrypted plain text secret
   */
  private decryptSecret(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      iv,
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

/**
 * Environment variables secrets loader implementation
 * Enhanced with security validation and sanitization for local deployment
 */
class EnvironmentSecretsLoader implements LocalSecretsLoader {
  private readonly logger = new Logger('EnvironmentSecretsLoader');

  /**
   * Load secret from environment variables with security validation
   * Enhanced with input sanitization and validation for local deployment
   *
   * @param secretName - Not used for env vars, but kept for interface compatibility
   * @param key - Environment variable name
   * @returns Environment variable value or null if not found
   */
  loadSecret(_secretName: string, key: string): string | null {
    const operationId = `load-env-secret-${Date.now()}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Loading environment variable`, {
      key,
      hasValue: !!process.env[key],
    });

    try {
      const envValue = process.env[key];

      if (!envValue) {
        this.logger.debug(`[${operationId}] Environment variable not found`, {
          key,
        });
        return null;
      }

      // Validate and sanitize environment variable value
      const sanitizedValue = this.sanitizeEnvValue(envValue);
      const loadTime = Date.now() - startTime;

      this.logger.debug(
        `[${operationId}] Environment variable loaded successfully`,
        {
          key,
          hasValue: !!sanitizedValue,
          loadTimeMs: loadTime,
        },
      );

      return sanitizedValue;
    } catch (error) {
      const loadTime = Date.now() - startTime;
      this.logger.error(
        `[${operationId}] Failed to load environment variable`,
        {
          key,
          error: error instanceof Error ? error.message : String(error),
          loadTimeMs: loadTime,
        },
      );
      return null;
    }
  }

  /**
   * Store environment variable (not implemented for security reasons)
   * Environment variables should be managed externally
   */
  storeSecret(_secretName: string, _key: string, _value: string): boolean {
    this.logger.warn(
      'Storing environment variables not supported for security reasons',
    );
    return false;
  }

  /**
   * Delete environment variable (not implemented for security reasons)
   */
  deleteSecret(_secretName: string, _key: string): boolean {
    this.logger.warn(
      'Deleting environment variables not supported for security reasons',
    );
    return false;
  }

  /**
   * List environment variables (returns empty for security reasons)
   */
  listSecrets(): string[] {
    return [];
  }

  /**
   * Sanitize environment variable value to prevent injection attacks
   *
   * @param value - Raw environment variable value
   * @returns Sanitized value
   */
  private sanitizeEnvValue(value: string): string {
    // Remove potentially dangerous control characters and limit length
    let sanitized = '';
    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i);
      // Skip control characters (ASCII 0-31 and 127-159)
      if (
        (charCode < 32 &&
          charCode !== 9 &&
          charCode !== 10 &&
          charCode !== 13) ||
        (charCode >= 127 && charCode <= 159)
      ) {
        continue;
      }
      sanitized += value.charAt(i);
    }

    sanitized = sanitized.trim().substring(0, 4096); // Limit to reasonable length

    if (sanitized !== value) {
      this.logger.warn('Environment variable value was sanitized', {
        originalLength: value.length,
        sanitizedLength: sanitized.length,
      });
    }

    return sanitized;
  }
}

/**
 * Enhanced Configuration Service with local-only architecture
 * Provides enterprise-grade configuration management without cloud dependencies
 */
@Injectable()
export class BytebotConfigService implements OnModuleInit {
  private readonly logger = new Logger('LocalConfigService');
  private readonly secretsLoaders: LocalSecretsLoader[];
  private readonly eventEmitter: EventEmitter;
  private performanceMetrics = {
    totalRequests: 0,
    totalResponseTime: 0,
    errorCount: 0,
  };

  constructor(private readonly nestConfigService: ConfigService<AppConfig>) {
    this.eventEmitter = new EventEmitter();

    // Initialize local-only secrets loaders (no cloud dependencies)
    this.secretsLoaders = [
      new LocalFileSecretsLoader(), // Primary: Local file-based encrypted storage
      new EnvironmentSecretsLoader(), // Fallback: Environment variables
    ];

    this.logger.log('Local Configuration Service initialized', {
      loadersCount: this.secretsLoaders.length,
      localFileBasedSecrets: true,
      cloudDependencies: false,
      dockerComposeCompatible: true,
    });
  }

  /**
   * Module initialization for local configuration setup
   */
  async onModuleInit(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('Initializing Local Configuration Service...');

    try {
      // Validate local configuration
      this.validateLocalConfiguration();

      // Initialize critical local secrets
      await this.initializeCriticalSecrets();

      const initTime = Date.now() - startTime;
      this.logger.log('Local Configuration Service initialized successfully', {
        initTimeMs: initTime,
        localSecretsReady: true,
        environmentValidated: true,
      });

      // Emit initialization complete event
      this.eventEmitter.emit('configService.initialized', {
        timestamp: new Date().toISOString(),
        initTime,
      });
    } catch (error) {
      const initTime = Date.now() - startTime;
      this.logger.error('Local Configuration Service initialization failed', {
        error: error instanceof Error ? error.message : String(error),
        initTimeMs: initTime,
      });
      throw error;
    }
  }

  /**
   * Get configuration value with type safety and performance monitoring
   *
   * @param key - Configuration key to retrieve
   * @param defaultValue - Default value if key not found
   * @returns Configuration value
   */
  get<T = any>(key: string, defaultValue?: T): T {
    const operationId = `config-get-${Date.now()}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Retrieving configuration`, { key });

    try {
      const value = (this.nestConfigService as any).get(key, defaultValue) as T;
      const responseTime = Date.now() - startTime;

      // Update performance metrics
      this.performanceMetrics.totalRequests++;
      this.performanceMetrics.totalResponseTime += responseTime;

      this.logger.debug(
        `[${operationId}] Configuration retrieved successfully`,
        {
          key,
          hasValue: value !== undefined,
          responseTimeMs: responseTime,
        },
      );

      return value;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.performanceMetrics.errorCount++;

      this.logger.error(`[${operationId}] Failed to retrieve configuration`, {
        key,
        error: error instanceof Error ? error.message : String(error),
        responseTimeMs: responseTime,
      });

      return defaultValue;
    }
  }

  /**
   * Get secret from local storage with fallback chain
   * Implements comprehensive local secrets management
   *
   * @param secretName - Name of the secret category
   * @param key - Specific key within the secret
   * @returns Secret value or null if not found
   */
  getSecret(secretName: string, key: string): string | null {
    const operationId = `get-secret-${Date.now()}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Retrieving local secret`, {
      secretName,
      key,
    });

    try {
      // Try each loader in sequence (local file first, env vars fallback)
      for (const loader of this.secretsLoaders) {
        const secretValue = loader.loadSecret(secretName, key);
        if (secretValue) {
          const responseTime = Date.now() - startTime;

          this.logger.debug(`[${operationId}] Secret retrieved successfully`, {
            secretName,
            key,
            loader: loader.constructor.name,
            responseTimeMs: responseTime,
          });

          return secretValue;
        }
      }

      const responseTime = Date.now() - startTime;
      this.logger.debug(`[${operationId}] Secret not found in any loader`, {
        secretName,
        key,
        loadersChecked: this.secretsLoaders.length,
        responseTimeMs: responseTime,
      });

      return null;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] Failed to retrieve secret`, {
        secretName,
        key,
        error: error instanceof Error ? error.message : String(error),
        responseTimeMs: responseTime,
      });
      return null;
    }
  }

  /**
   * Store secret in local storage
   * Provides secure local secret management capabilities
   *
   * @param secretName - Name of the secret category
   * @param key - Specific key within the secret
   * @param value - Secret value to store
   * @returns Success status
   */
  async storeSecret(
    secretName: string,
    key: string,
    value: string,
  ): Promise<boolean> {
    const operationId = `store-secret-${Date.now()}`;

    this.logger.debug(`[${operationId}] Storing local secret`, {
      secretName,
      key,
    });

    try {
      // Use the first loader (LocalFileSecretsLoader) for storing
      const primaryLoader = this.secretsLoaders[0];
      const result = await Promise.resolve(
        primaryLoader.storeSecret(secretName, key, value),
      );

      if (result) {
        this.logger.debug(`[${operationId}] Secret stored successfully`, {
          secretName,
          key,
        });

        // Emit secret updated event
        this.eventEmitter.emit('secret.updated', {
          secretName,
          key,
          timestamp: new Date().toISOString(),
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to store secret`, {
        secretName,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Delete secret from local storage
   *
   * @param secretName - Name of the secret category
   * @param key - Specific key within the secret
   * @returns Success status
   */
  async deleteSecret(secretName: string, key: string): Promise<boolean> {
    const operationId = `delete-secret-${Date.now()}`;

    this.logger.debug(`[${operationId}] Deleting local secret`, {
      secretName,
      key,
    });

    try {
      const primaryLoader = this.secretsLoaders[0];
      const result = await Promise.resolve(
        primaryLoader.deleteSecret(secretName, key),
      );

      if (result) {
        this.logger.debug(`[${operationId}] Secret deleted successfully`, {
          secretName,
          key,
        });

        // Emit secret deleted event
        this.eventEmitter.emit('secret.deleted', {
          secretName,
          key,
          timestamp: new Date().toISOString(),
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to delete secret`, {
        secretName,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * List all available secrets
   *
   * @returns Array of secret names
   */
  listSecrets(): string[] {
    try {
      // Get secrets from primary loader (local file storage)
      const primaryLoader = this.secretsLoaders[0];
      return primaryLoader.listSecrets();
    } catch (error) {
      this.logger.error('Failed to list secrets', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get performance metrics for monitoring
   *
   * @returns Performance metrics object
   */
  getPerformanceMetrics(): {
    totalRequests: number;
    averageResponseTime: number;
    errorCount: number;
    errorRate: number;
  } {
    const averageResponseTime =
      this.performanceMetrics.totalRequests > 0
        ? this.performanceMetrics.totalResponseTime /
          this.performanceMetrics.totalRequests
        : 0;

    const errorRate =
      this.performanceMetrics.totalRequests > 0
        ? (this.performanceMetrics.errorCount /
            this.performanceMetrics.totalRequests) *
          100
        : 0;

    return {
      totalRequests: this.performanceMetrics.totalRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      errorCount: this.performanceMetrics.errorCount,
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }

  /**
   * Register event listener for configuration events
   *
   * @param event - Event name
   * @param listener - Event handler function
   */
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Validate local configuration setup
   */
  private validateLocalConfiguration(): void {
    const validationErrors: string[] = [];

    // Validate database configuration for local deployment
    const databaseUrl = this.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      validationErrors.push('DATABASE_URL not configured for local deployment');
    } else if (
      databaseUrl.includes('amazonaws.com') ||
      databaseUrl.includes('googleapis.com')
    ) {
      validationErrors.push(
        'Cloud database detected - local-only architecture requires SQLite or local PostgreSQL',
      );
    }

    // Validate secrets directory
    const secretsDir = process.env.LOCAL_SECRETS_DIR || './.env/secrets';
    try {
      accessSync(dirname(secretsDir), constants.W_OK);
    } catch {
      validationErrors.push(
        `Secrets directory parent not writable: ${secretsDir}`,
      );
    }

    // Validate encryption key is set
    if (!process.env.LOCAL_SECRETS_ENCRYPTION_KEY) {
      this.logger.warn(
        'Using default encryption key - set LOCAL_SECRETS_ENCRYPTION_KEY for production',
      );
    }

    if (validationErrors.length > 0) {
      throw new Error(
        `Local configuration validation failed: ${validationErrors.join(', ')}`,
      );
    }

    this.logger.debug('Local configuration validation passed', {
      databaseConfigured: !!databaseUrl,
      secretsDirectoryValid: true,
      encryptionKeyConfigured: !!process.env.LOCAL_SECRETS_ENCRYPTION_KEY,
    });
  }

  /**
   * Initialize critical secrets for local deployment
   */
  private async initializeCriticalSecrets(): Promise<void> {
    const criticalSecrets = [
      { name: 'api-keys', key: 'ANTHROPIC_API_KEY' },
      { name: 'api-keys', key: 'OPENAI_API_KEY' },
      { name: 'api-keys', key: 'GEMINI_API_KEY' },
      { name: 'auth', key: 'JWT_SECRET' },
      { name: 'security', key: 'ENCRYPTION_KEY' },
    ];

    let initializedCount = 0;
    let fromEnvCount = 0;

    for (const { name, key } of criticalSecrets) {
      try {
        // Check if secret exists in local storage
        let secretValue = this.getSecret(name, key);

        // If not found, try to initialize from environment
        if (!secretValue) {
          const envValue = process.env[key];
          if (envValue) {
            await this.storeSecret(name, key, envValue);
            secretValue = envValue;
            fromEnvCount++;
            this.logger.debug(
              `Initialized secret from environment: ${name}:${key}`,
            );
          }
        }

        if (secretValue) {
          initializedCount++;
        } else {
          this.logger.warn(`Critical secret not found: ${name}:${key}`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to initialize critical secret: ${name}:${key}`,
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    this.logger.log('Critical secrets initialization completed', {
      total: criticalSecrets.length,
      initialized: initializedCount,
      fromEnvironment: fromEnvCount,
      missing: criticalSecrets.length - initializedCount,
    });
  }

  /**
   * Get features configuration
   *
   * @returns Features configuration object
   */
  getFeaturesConfig(): Record<string, boolean> {
    const features = (this.nestConfigService as any).get('app.features', {
      authentication: false,
      rateLimiting: false,
      metricsCollection: false,
      healthChecks: true,
      circuitBreaker: false,
    }) as Record<string, boolean>;

    return (
      features || {
        authentication: false,
        rateLimiting: false,
        metricsCollection: false,
        healthChecks: true,
        circuitBreaker: false,
      }
    );
  }

  /**
   * Get app configuration
   *
   * @returns App configuration object
   */
  getAppConfig(): AppConfig {
    return (this.nestConfigService as any).get(
      'app',
      {} as AppConfig,
    ) as AppConfig;
  }

  /**
   * Get API configuration
   *
   * @returns API configuration object
   */
  getApiConfig(): AppConfig['api'] {
    return this.nestConfigService.get<AppConfig['api']>('app.api', {
      rateLimitWindow: 900000,
      rateLimitMaxRequests: 100,
      corsOrigins: '*',
      bodyParserLimit: '50mb',
      requestTimeout: 30000,
    });
  }

  /**
   * Get development configuration
   *
   * @returns Development configuration object
   */
  getDevelopmentConfig(): AppConfig['development'] {
    return this.nestConfigService.get<AppConfig['development']>(
      'app.development',
      {
        enableSwagger: true,
        swaggerPath: '/api/docs',
        debugMode: false,
      },
    );
  }
}
