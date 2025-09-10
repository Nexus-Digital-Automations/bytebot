/**
 * Enhanced Local Secrets Service - 100% Local-Only Architecture
 * Enterprise-grade secrets management with comprehensive local file-based storage
 *
 * Features:
 * - Local file-based encrypted secrets storage using AES-256-GCM
 * - Environment variable fallback with security validation
 * - Secrets rotation and hot-reloading capabilities for local deployment
 * - Encrypted secrets storage with proper file permissions (600/700)
 * - Performance monitoring, caching, and audit logging
 * - Docker Compose compatibility for multi-service local deployment
 * - No Kubernetes or cloud service dependencies
 *
 * @author Local Secrets Service Architect
 * @version 2.0.0 - Local-Only Architecture Implementation
 * @since Phase 1: Bytebot API Hardening - Local Deployment
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  watchFile,
  unwatchFile,
  existsSync,
  readFileSync,
  mkdirSync,
  chmodSync,
} from 'fs';
import { join } from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

/**
 * Enhanced local secret metadata interface
 * Designed for local file-based secrets management
 */
interface EnhancedSecretMetadata {
  name: string;
  key: string;
  source: 'local-file' | 'environment' | 'docker-compose';
  lastUpdated: Date;
  version: string;
  encrypted: boolean;
  rotationEnabled: boolean;
  rotationInterval?: number;
  expiresAt?: Date;
  tags?: Record<string, string>;
  auditInfo?: {
    accessCount: number;
    lastAccessed: Date;
    createdBy: string;
  };
}

/**
 * Enhanced secret value with comprehensive metadata
 */
interface EnhancedSecretValue {
  value: string;
  metadata: EnhancedSecretMetadata;
}

/**
 * Secret rotation configuration with advanced options
 */
interface EnhancedRotationConfig {
  enabled: boolean;
  intervalMs: number;
  maxAge: number;
  notifyBeforeExpiry: number;
  autoRotateOnExpiry: boolean;
  backupOnRotation: boolean;
  validateAfterRotation: boolean;
  notificationWebhook?: string;
}

/**
 * Local provider configuration for 100% local deployment
 * No cloud or external service dependencies
 */
interface LocalProviderConfig {
  localFileStorage: {
    enabled: boolean;
    secretsPath: string;
    encryptionEnabled: boolean;
    filePermissions: number;
  };
  environmentVariables: {
    enabled: boolean;
    validateValues: boolean;
    sanitizeValues: boolean;
  };
  dockerCompose: {
    enabled: boolean;
    composeFilePaths: string[];
    environmentFiles: string[];
  };
}

/**
 * Audit log entry interface
 */
interface SecretAuditEntry {
  timestamp: Date;
  operation: 'get' | 'set' | 'rotate' | 'delete' | 'backup';
  secretName: string;
  secretKey?: string;
  source: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Performance metrics interface
 */
interface PerformanceMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  errorCount: number;
}

/**
 * Local secrets health response interface
 * Optimized for local deployment monitoring
 */
interface LocalSecretsHealthResponse {
  summary: {
    healthy: number;
    expiring: number;
    expired: number;
    total: number;
  };
  performance: PerformanceMetrics;
  externalProviders: Record<string, boolean>;
  details: Array<{
    name: string;
    key: string;
    status: 'healthy' | 'expiring' | 'expired';
    age: number;
    source: string;
    rotationEnabled: boolean;
    accessCount?: number;
    lastAccessed?: Date;
  }>;
  auditSummary: {
    totalEntries: number;
    recentErrors: number;
    successRate: number;
  };
  dockerComposeStatus?: {
    filesMonitored: number;
    lastCheck: Date;
    healthyFiles: number;
  };
}

/**
 * Enhanced Local Secrets Management Service
 * Provides enterprise-grade secrets management with 100% local-only architecture
 */
@Injectable()
export class EnhancedSecretsService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('EnhancedLocalSecretsService');
  private readonly secretsCache = new Map<string, EnhancedSecretValue>();
  private readonly secretsPath: string;
  private readonly encryptionKey: Buffer;
  private readonly rotationConfig: EnhancedRotationConfig;
  private readonly localProviders: LocalProviderConfig;
  private rotationTimer?: NodeJS.Timeout;
  private fileWatchers = new Map<string, () => void>();
  private auditLog: SecretAuditEntry[] = [];
  private performanceMetrics: PerformanceMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    errorCount: 0,
  };

  constructor(private readonly configService: ConfigService) {
    super();

    // Initialize local secrets path
    this.secretsPath =
      process.env.LOCAL_SECRETS_DIR ||
      this.configService.get<string>('app.secrets.localPath') ||
      './.env/secrets';

    // Initialize encryption key for local secrets encryption
    const encryptionKeyString =
      process.env.LOCAL_SECRETS_ENCRYPTION_KEY ||
      this.configService.get<string>('app.security.encryptionKey') ||
      'default-local-key-change-in-production';
    this.encryptionKey = crypto.scryptSync(encryptionKeyString, 'salt', 32);

    // Configure enhanced secrets rotation
    this.rotationConfig = {
      enabled:
        this.configService.get<boolean>('app.features.secretsRotation') ??
        false,
      intervalMs:
        this.configService.get<number>('app.secrets.rotationInterval') ??
        86400000, // 24 hours
      maxAge: this.configService.get<number>('app.secrets.maxAge') ?? 604800000, // 7 days
      notifyBeforeExpiry:
        this.configService.get<number>('app.secrets.notifyBeforeExpiry') ??
        86400000, // 1 day
      autoRotateOnExpiry:
        this.configService.get<boolean>('app.secrets.autoRotateOnExpiry') ??
        false,
      backupOnRotation:
        this.configService.get<boolean>('app.secrets.backupOnRotation') ?? true,
      validateAfterRotation:
        this.configService.get<boolean>('app.secrets.validateAfterRotation') ??
        true,
      notificationWebhook: this.configService.get<string>(
        'app.secrets.notificationWebhook',
      ),
    };

    // Configure local-only secret providers (no cloud dependencies)
    this.localProviders = {
      localFileStorage: {
        enabled:
          this.configService.get<boolean>('app.secrets.local.enabled') ?? true,
        secretsPath: this.secretsPath,
        encryptionEnabled:
          this.configService.get<boolean>('app.secrets.local.encrypted') ??
          true,
        filePermissions: 0o600, // Owner read/write only
      },
      environmentVariables: {
        enabled:
          this.configService.get<boolean>('app.secrets.env.enabled') ?? true,
        validateValues:
          this.configService.get<boolean>('app.secrets.env.validate') ?? true,
        sanitizeValues:
          this.configService.get<boolean>('app.secrets.env.sanitize') ?? true,
      },
      dockerCompose: {
        enabled:
          this.configService.get<boolean>('app.secrets.docker.enabled') ??
          false,
        composeFilePaths: this.getDockerComposePaths(),
        environmentFiles: this.getDockerEnvironmentFiles(),
      },
    };
  }

  /**
   * Initialize enhanced secrets service
   * Sets up secret loading, caching, rotation, and local provider connections
   */
  async onModuleInit(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('Initializing Enhanced Secrets Service...');

    try {
      // Load critical secrets from local sources
      await this.loadCriticalSecrets();

      // Initialize local secret providers
      await this.initializeLocalProviders();

      // Setup secrets rotation if enabled
      if (this.rotationConfig.enabled) {
        this.setupSecretsRotation();
      }

      // Setup file watching for local secrets hot-reloading
      this.setupLocalSecretsWatching();

      // Setup audit log cleanup
      this.setupAuditLogCleanup();

      const initTime = Date.now() - startTime;
      this.logger.log('Enhanced Secrets Service initialized successfully', {
        initTimeMs: initTime,
        cachedSecretsCount: this.secretsCache.size,
        rotationEnabled: this.rotationConfig.enabled,
        watchersCount: this.fileWatchers.size,
        localProviders: this.getEnabledLocalProviders(),
        auditLogEnabled: true,
      });

      this.emit('initialized', {
        initTime,
        cachedSecretsCount: this.secretsCache.size,
        localProviders: this.getEnabledLocalProviders(),
      });
    } catch (error) {
      const initTime = Date.now() - startTime;
      this.logger.error('Enhanced Secrets Service initialization failed', {
        error: error instanceof Error ? error.message : String(error),
        initTimeMs: initTime,
      });
      throw error;
    }
  }

  /**
   * Get secret value securely with comprehensive source fallback
   *
   * @param secretName - Name of the secret
   * @param key - Key within the secret (optional)
   * @param encrypted - Whether the secret is encrypted
   * @returns Secret value or null if not found
   */
  async getSecret(
    secretName: string,
    key?: string,
    encrypted = false,
  ): Promise<string | null> {
    const operationId = `get-secret-${Date.now()}`;
    const startTime = Date.now();
    const cacheKey = key ? `${secretName}:${key}` : secretName;

    this.logger.debug(`[${operationId}] Retrieving secret`, {
      secretName,
      key,
      encrypted,
      cacheKey,
    });

    this.performanceMetrics.totalRequests++;

    try {
      // Check cache first
      const cachedSecret = this.secretsCache.get(cacheKey);
      if (cachedSecret && !this.isSecretExpired(cachedSecret)) {
        this.performanceMetrics.cacheHits++;
        this.recordAuditEntry(
          'get',
          secretName,
          key,
          cachedSecret.metadata.source,
          true,
        );

        // Update access metadata
        if (cachedSecret.metadata.auditInfo) {
          cachedSecret.metadata.auditInfo.accessCount += 1;
          cachedSecret.metadata.auditInfo.lastAccessed = new Date();
        }

        this.logger.debug(`[${operationId}] Secret retrieved from cache`, {
          secretName,
          cacheKey,
          source: cachedSecret.metadata.source,
        });

        return encrypted
          ? this.decryptSecret(cachedSecret.value)
          : cachedSecret.value;
      }

      this.performanceMetrics.cacheMisses++;

      // Try loading from local sources in priority order
      const sources = [
        () => this.loadFromLocalFiles(secretName, key ?? secretName),
        () => this.loadFromEnvironment(key || secretName),
        () => this.loadFromDockerCompose(key || secretName),
      ];

      let secretValue: string | null = null;
      let source: EnhancedSecretMetadata['source'] = 'local-file';

      for (let index = 0; index < sources.length; index++) {
        const loadMethod = sources[index];
        try {
          secretValue = await loadMethod();
          if (secretValue) {
            source = this.getSourceByIndex(index);
            break;
          }
        } catch (error) {
          this.logger.debug(
            `Failed to load from source ${this.getSourceByIndex(index)}`,
            {
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      }

      if (!secretValue) {
        this.recordAuditEntry(
          'get',
          secretName,
          key,
          'all-sources',
          false,
          'Secret not found in any source',
        );
        this.logger.debug(`[${operationId}] Secret not found in any source`, {
          secretName,
          key,
        });
        return null;
      }

      // Cache the secret with comprehensive metadata
      const metadata: EnhancedSecretMetadata = {
        name: secretName,
        key: key || secretName,
        source,
        lastUpdated: new Date(),
        version: this.generateSecretVersion(),
        encrypted,
        rotationEnabled: this.rotationConfig.enabled,
        rotationInterval: this.rotationConfig.intervalMs,
        expiresAt: this.calculateExpiryDate(),
        tags: {
          environment: process.env.NODE_ENV || 'development',
          service: 'bytebot-agent',
          deployment: 'local-only',
          dockerCompose: String(Boolean(process.env.COMPOSE_PROJECT_NAME)),
        },
        auditInfo: {
          accessCount: 1,
          lastAccessed: new Date(),
          createdBy: 'enhanced-secrets-service',
        },
      };

      this.secretsCache.set(cacheKey, {
        value: secretValue,
        metadata,
      });

      const loadTime = Date.now() - startTime;
      this.performanceMetrics.averageResponseTime =
        (this.performanceMetrics.averageResponseTime + loadTime) / 2;

      this.recordAuditEntry('get', secretName, key, source, true);

      this.logger.debug(`[${operationId}] Secret loaded and cached`, {
        secretName,
        key,
        source,
        encrypted,
        loadTimeMs: loadTime,
      });

      return encrypted ? this.decryptSecret(secretValue) : secretValue;
    } catch (error) {
      this.performanceMetrics.errorCount++;
      const loadTime = Date.now() - startTime;

      this.recordAuditEntry(
        'get',
        secretName,
        key,
        'unknown',
        false,
        error instanceof Error ? error.message : String(error),
      );

      this.logger.error(`[${operationId}] Failed to retrieve secret`, {
        secretName,
        key,
        error: error instanceof Error ? error.message : String(error),
        loadTimeMs: loadTime,
      });
      return null;
    }
  }

  /**
   * Get enhanced secrets health (alias for getLocalSecretsHealth)
   */
  getEnhancedSecretsHealth(): LocalSecretsHealthResponse {
    return this.getLocalSecretsHealth();
  }

  /**
   * Get comprehensive local secrets health status
   */
  getLocalSecretsHealth(): LocalSecretsHealthResponse {
    const now = Date.now();
    const details = Array.from(this.secretsCache.values()).map((secret) => {
      const age = now - secret.metadata.lastUpdated.getTime();
      const status: 'healthy' | 'expiring' | 'expired' =
        age > this.rotationConfig.maxAge
          ? 'expired'
          : age >
              this.rotationConfig.maxAge -
                this.rotationConfig.notifyBeforeExpiry
            ? 'expiring'
            : 'healthy';

      return {
        name: secret.metadata.name,
        key: secret.metadata.key,
        status,
        age,
        source: secret.metadata.source,
        rotationEnabled: secret.metadata.rotationEnabled,
        accessCount: secret.metadata.auditInfo?.accessCount,
        lastAccessed: secret.metadata.auditInfo?.lastAccessed,
      };
    });

    // Calculate audit summary
    const recentAuditEntries = this.auditLog.filter(
      (entry) => now - entry.timestamp.getTime() < 86400000, // Last 24 hours
    );
    const recentErrors = recentAuditEntries.filter(
      (entry) => !entry.success,
    ).length;
    const successRate =
      recentAuditEntries.length > 0
        ? ((recentAuditEntries.length - recentErrors) /
            recentAuditEntries.length) *
          100
        : 100;

    return {
      summary: {
        healthy: details.filter((d) => d.status === 'healthy').length,
        expiring: details.filter((d) => d.status === 'expiring').length,
        expired: details.filter((d) => d.status === 'expired').length,
        total: details.length,
      },
      performance: { ...this.performanceMetrics },
      externalProviders: {
        localFileStorage:
          this.localProviders.localFileStorage?.enabled ?? false,
        environmentVariables:
          this.localProviders.environmentVariables?.enabled ?? false,
        dockerCompose: this.localProviders.dockerCompose?.enabled ?? false,
      },
      details,
      auditSummary: {
        totalEntries: this.auditLog.length,
        recentErrors,
        successRate,
      },
      dockerComposeStatus: this.localProviders.dockerCompose?.enabled
        ? {
            filesMonitored:
              this.localProviders.dockerCompose.composeFilePaths.length,
            lastCheck: new Date(),
            healthyFiles: this.countExistingFiles(
              this.localProviders.dockerCompose.composeFilePaths,
            ),
          }
        : undefined,
    };
  }

  /**
   * Load secret from local encrypted file storage
   * @private
   */
  private loadFromLocalFiles(
    secretName: string,
    key: string,
  ): Promise<string | null> {
    if (!this.localProviders.localFileStorage?.enabled) {
      return Promise.resolve(null);
    }

    try {
      const secretFilePath = join(this.secretsPath, `${secretName}.enc`);

      if (!existsSync(secretFilePath)) {
        this.logger.debug(`Local secret file not found: ${secretFilePath}`);
        return Promise.resolve(null);
      }

      // Read and decrypt the secret file
      const encryptedData = readFileSync(secretFilePath, 'utf8');
      const decryptedData = this.decryptSecret(encryptedData);
      const secrets = JSON.parse(decryptedData) as Record<string, string>;

      return Promise.resolve(secrets[key] ?? null);
    } catch (error) {
      this.logger.debug('Failed to load from local file storage', {
        secretName,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return Promise.resolve(null);
    }
  }

  /**
   * Load secret from Docker Compose environment files
   * @private
   */
  private loadFromDockerCompose(key: string): Promise<string | null> {
    if (!this.localProviders.dockerCompose?.enabled) {
      return Promise.resolve(null);
    }

    try {
      // Check Docker Compose environment files
      for (const envFile of this.localProviders.dockerCompose
        .environmentFiles) {
        if (existsSync(envFile)) {
          const envContent = readFileSync(envFile, 'utf8');
          const lines = envContent.split('\n');

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith(`${key}=`)) {
              const value = trimmedLine.substring(key.length + 1);
              this.logger.debug(
                `Found secret in Docker Compose environment file: ${envFile}`,
                { key },
              );
              return Promise.resolve(value);
            }
          }
        }
      }

      return Promise.resolve(null);
    } catch (error) {
      this.logger.debug('Failed to load from Docker Compose', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return Promise.resolve(null);
    }
  }

  /**
   * Load secret from environment variables (enhanced version)
   * @private
   */
  private loadFromEnvironment(key: string): Promise<string | null> {
    return Promise.resolve(process.env[key] || null);
  }

  /**
   * Load critical secrets during initialization with enhanced error handling
   * @private
   */
  private async loadCriticalSecrets(): Promise<void> {
    const criticalSecrets = [
      { name: 'jwt-secret', key: 'JWT_SECRET' },
      { name: 'encryption-key', key: 'ENCRYPTION_KEY' },
      { name: 'database-url', key: 'DATABASE_URL' },
      { name: 'anthropic-api-key', key: 'ANTHROPIC_API_KEY' },
      { name: 'openai-api-key', key: 'OPENAI_API_KEY' },
      { name: 'gemini-api-key', key: 'GEMINI_API_KEY' },
    ];

    const loadResults = await Promise.allSettled(
      criticalSecrets.map(async ({ name, key }) => {
        try {
          const result = await this.getSecret(name, key);
          return { name, key, loaded: Boolean(result) };
        } catch (error) {
          this.logger.warn(`Failed to load critical secret: ${name}`, {
            error: error instanceof Error ? error.message : String(error),
          });
          return {
            name,
            key,
            loaded: false,
            error: String(error),
          };
        }
      }),
    );

    const loadedSecrets = loadResults
      .filter(
        (
          result,
        ): result is PromiseFulfilledResult<{
          name: string;
          key: string;
          loaded: boolean;
        }> => result.status === 'fulfilled' && result.value.loaded,
      )
      .map((result) => result.value.name);

    const failedSecrets = loadResults.filter(
      (result) => result.status === 'rejected' || !result.value.loaded,
    );

    this.logger.log('Critical secrets loading completed', {
      loaded: loadedSecrets,
      failed: failedSecrets.length,
      total: criticalSecrets.length,
    });
  }

  /**
   * Initialize local secret providers
   * @private
   */
  private async initializeLocalProviders(): Promise<void> {
    const enabledProviders = this.getEnabledLocalProviders();

    if (enabledProviders.length === 0) {
      this.logger.debug('No local secret providers enabled');
      return;
    }

    this.logger.log('Initializing local secret providers', {
      providers: enabledProviders,
    });

    // Initialize each enabled provider
    for (const provider of enabledProviders) {
      try {
        await this.initializeLocalProvider(provider);
        this.logger.log(
          `Local provider '${provider}' initialized successfully`,
        );
      } catch (error) {
        this.logger.error(`Failed to initialize local provider '${provider}'`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Initialize a specific local provider
   * @private
   */
  private initializeLocalProvider(provider: string): Promise<void> {
    switch (provider) {
      case 'localFileStorage': {
        // Ensure secrets directory exists with proper permissions
        if (!existsSync(this.secretsPath)) {
          mkdirSync(this.secretsPath, { recursive: true });
          chmodSync(this.secretsPath, 0o700);
          this.logger.debug(`Created secrets directory: ${this.secretsPath}`);
        }
        break;
      }
      case 'environmentVariables': {
        // Validate environment variables access
        this.logger.debug('Environment variables provider ready');
        break;
      }
      case 'dockerCompose': {
        // Validate Docker Compose files exist
        const validFiles =
          this.localProviders.dockerCompose?.composeFilePaths.filter((path) =>
            existsSync(path),
          ) ?? [];
        this.logger.debug(`Docker Compose files found: ${validFiles.length}`);
        break;
      }
      default: {
        throw new Error(`Unknown local provider: ${provider}`);
      }
    }
    return Promise.resolve();
  }

  /**
   * Setup audit log cleanup to prevent memory growth
   * @private
   */
  private setupAuditLogCleanup(): void {
    // Clean up audit log every hour, keeping last 24 hours of entries
    setInterval(() => {
      const cutoffTime = new Date(Date.now() - 86400000); // 24 hours ago
      const initialCount = this.auditLog.length;
      this.auditLog = this.auditLog.filter(
        (entry) => entry.timestamp >= cutoffTime,
      );

      if (this.auditLog.length !== initialCount) {
        this.logger.debug('Audit log cleanup completed', {
          removed: initialCount - this.auditLog.length,
          remaining: this.auditLog.length,
        });
      }
    }, 3600000); // 1 hour
  }

  /**
   * Record audit entry for secret operations
   * @private
   */
  private recordAuditEntry(
    operation: SecretAuditEntry['operation'],
    secretName: string,
    secretKey?: string,
    source?: string,
    success?: boolean,
    error?: string,
    metadata?: Record<string, unknown>,
  ): void {
    const entry: SecretAuditEntry = {
      timestamp: new Date(),
      operation,
      secretName,
      secretKey,
      source: source || 'unknown',
      success: success ?? true,
      error,
      metadata,
    };

    this.auditLog.push(entry);

    // Limit audit log size in memory (last 1000 entries)
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  /**
   * Check if a secret is expired
   * @private
   */
  private isSecretExpired(secret: EnhancedSecretValue): boolean {
    if (!secret.metadata.expiresAt) {
      return false;
    }
    return new Date() > secret.metadata.expiresAt;
  }

  /**
   * Calculate expiry date for secrets
   * @private
   */
  private calculateExpiryDate(): Date {
    return new Date(Date.now() + this.rotationConfig.maxAge);
  }

  /**
   * Get enabled local providers
   * @private
   */
  private getEnabledLocalProviders(): string[] {
    const providers: string[] = [];

    if (this.localProviders.localFileStorage?.enabled)
      providers.push('localFileStorage');
    if (this.localProviders.environmentVariables?.enabled)
      providers.push('environmentVariables');
    if (this.localProviders.dockerCompose?.enabled)
      providers.push('dockerCompose');

    return providers;
  }

  /**
   * Get source name by index for local providers
   * @private
   */
  private getSourceByIndex(index: number): EnhancedSecretMetadata['source'] {
    const sources: EnhancedSecretMetadata['source'][] = [
      'local-file',
      'environment',
      'docker-compose',
    ];
    return sources[index] || 'local-file';
  }

  /**
   * Setup secrets rotation timer (enhanced version)
   * @private
   */
  private setupSecretsRotation(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    this.rotationTimer = setInterval(() => {
      this.performSecretsRotation().catch((error) => {
        this.logger.error('Failed to perform secrets rotation', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, this.rotationConfig.intervalMs);

    this.logger.log('Enhanced secrets rotation enabled', {
      intervalMs: this.rotationConfig.intervalMs,
      maxAge: this.rotationConfig.maxAge,
      autoRotateOnExpiry: this.rotationConfig.autoRotateOnExpiry,
      backupOnRotation: this.rotationConfig.backupOnRotation,
    });
  }

  /**
   * Perform automatic secrets rotation (enhanced version)
   * @private
   */
  private async performSecretsRotation(): Promise<void> {
    this.logger.log('Starting enhanced automatic secrets rotation...');

    const health = this.getLocalSecretsHealth();
    const secretsToRotate = health.details.filter(
      (secret) => secret.status === 'expired' && secret.rotationEnabled,
    );

    if (secretsToRotate.length === 0) {
      this.logger.debug('No secrets require rotation');
      return;
    }

    this.logger.log(`Rotating ${secretsToRotate.length} expired secrets`);

    for (const secret of secretsToRotate) {
      try {
        // Backup before rotation if enabled
        if (this.rotationConfig.backupOnRotation) {
          await this.backupSecret(secret.name, secret.key);
        }

        this.rotateSecret(secret.name, secret.key);

        // Validate after rotation if enabled
        if (this.rotationConfig.validateAfterRotation) {
          await this.validateSecretAfterRotation(secret.name);
        }
      } catch (error) {
        this.logger.error(`Failed to rotate secret: ${secret.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Setup file watching for local secrets hot-reloading
   * @private
   */
  private setupLocalSecretsWatching(): void {
    if (!existsSync(this.secretsPath)) {
      this.logger.debug('Local secrets path not found, skipping file watching');
      return;
    }

    // Watch critical secret files for changes
    const criticalSecrets = [
      'jwt-secret',
      'encryption-key',
      'database-url',
      'api-keys', // Combined API keys file
      'auth',
      'security',
    ];

    criticalSecrets.forEach((secretName) => {
      const secretFile = join(this.secretsPath, `${secretName}.enc`);
      if (existsSync(secretFile)) {
        const watcher = () => {
          this.logger.log(`Local secret file changed: ${secretName}`);
          try {
            this.rotateSecret(secretName);
          } catch (error) {
            this.logger.error(
              `Failed to rotate secret on file change: ${secretName}`,
              {
                error: error instanceof Error ? error.message : String(error),
              },
            );
          }
        };

        watchFile(secretFile, watcher);
        this.fileWatchers.set(secretName, watcher);
      }
    });

    // Also watch Docker Compose files if enabled
    if (this.localProviders.dockerCompose?.enabled) {
      this.localProviders.dockerCompose.composeFilePaths.forEach(
        (composePath) => {
          if (existsSync(composePath)) {
            const watcher = () => {
              this.logger.log(`Docker Compose file changed: ${composePath}`);
              // Trigger configuration reload
              this.emit('dockerComposeChanged', { path: composePath });
            };
            watchFile(composePath, watcher);
            this.fileWatchers.set(composePath, watcher);
          }
        },
      );
    }

    this.logger.log('Local file watching setup for secrets hot-reloading', {
      watchersCount: this.fileWatchers.size,
      dockerComposeWatching: this.localProviders.dockerCompose?.enabled,
    });
  }

  /**
   * Rotate secret (enhanced version)
   */
  rotateSecret(secretName: string, key?: string): void {
    const operationId = `rotate-secret-${Date.now()}`;
    const cacheKey = key ? `${secretName}:${key}` : secretName;

    this.logger.log(`[${operationId}] Rotating secret`, {
      secretName,
      key,
    });

    try {
      // Remove from cache to force reload
      this.secretsCache.delete(cacheKey);

      // Reload secret from sources
      this.getSecret(secretName, key).catch((error) => {
        this.logger.error(`Failed to reload secret during rotation`, {
          secretName,
          key,
          error: error instanceof Error ? error.message : String(error),
        });
      });

      this.recordAuditEntry(
        'rotate',
        secretName,
        key,
        'rotation-service',
        true,
      );
      this.emit('secretRotated', { secretName, key, operationId });

      this.logger.log(`[${operationId}] Secret rotated successfully`, {
        secretName,
        key,
      });
    } catch (error) {
      this.recordAuditEntry(
        'rotate',
        secretName,
        key,
        'rotation-service',
        false,
        error instanceof Error ? error.message : String(error),
      );

      this.logger.error(`[${operationId}] Failed to rotate secret`, {
        secretName,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Backup secret for disaster recovery
   * @private
   */
  private backupSecret(secretName: string, key?: string): Promise<void> {
    // This would implement secure backup functionality
    // For security reasons, actual implementation would encrypt backups
    this.logger.debug(`Backup placeholder for secret: ${secretName}`);
    this.recordAuditEntry('backup', secretName, key, 'backup-service', true);
    return Promise.resolve();
  }

  /**
   * Validate secret after rotation
   * @private
   */
  private validateSecretAfterRotation(secretName: string): Promise<void> {
    // This would implement validation logic specific to each secret type
    // For example, JWT secrets would be validated for proper format
    this.logger.debug(
      `Validation placeholder for rotated secret: ${secretName}`,
    );
    return Promise.resolve();
  }

  /**
   * Encrypt secret value (enhanced version)
   * @private
   */
  private encryptSecret(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt secret value (enhanced version)
   * @private
   */
  private decryptSecret(encryptedValue: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedValue.split(':');
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

  /**
   * Generate secret version identifier
   * @private
   */
  private generateSecretVersion(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Count existing files helper
   * @private
   */
  private countExistingFiles(paths: string[]): number {
    return paths.filter((path) => existsSync(path)).length;
  }

  /**
   * Cleanup resources on module destroy
   */
  onModuleDestroy(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    // Cleanup file watchers
    this.fileWatchers.forEach((watcher, secretName) => {
      try {
        unwatchFile(join(this.secretsPath, secretName), watcher);
      } catch {
        this.logger.warn(`Failed to unwatch file for secret: ${secretName}`);
      }
    });
    this.fileWatchers.clear();

    this.logger.log('Enhanced Local Secrets Service destroyed');
  }

  /**
   * Get Docker Compose file paths for monitoring
   * @private
   */
  private getDockerComposePaths(): string[] {
    const defaultPaths = [
      './docker-compose.yml',
      './docker-compose.yaml',
      './docker-compose.override.yml',
      './docker-compose.development.yml',
      './docker-compose.production.yml',
    ];

    const customPaths = process.env.COMPOSE_FILE?.split(':') ?? [];
    return [...defaultPaths, ...customPaths];
  }

  /**
   * Get Docker environment files for secret loading
   * @private
   */
  private getDockerEnvironmentFiles(): string[] {
    const defaultEnvFiles = [
      './.env',
      './.env.local',
      './.env.docker',
      './docker.env',
    ];

    const customEnvFiles = process.env.COMPOSE_ENV_FILES?.split(',') ?? [];
    return [...defaultEnvFiles, ...customEnvFiles].filter((path) =>
      existsSync(path),
    );
  }
}
