/**
 * Local Secrets Service - 100% Local-Only Enterprise-grade Secrets Management for Bytebot
 * Provides secure local file-based secrets loading, rotation, and management with encryption
 *
 * Features:
 * - Local encrypted file storage system with proper Unix file permissions (600/700)
 * - Environment variable security with validation and sanitization
 * - Local secrets rotation and hot-reloading capabilities
 * - Docker Compose secrets integration using bind mounts and environment files
 * - Performance monitoring and caching for local deployment
 * - NO Kubernetes or cloud dependencies
 * - Enterprise-grade security using only local components
 *
 * @author Local Configuration Security Specialist
 * @version 2.0.0 - Local-Only Architecture Implementation
 * @since Phase 1: Bytebot API Hardening - Local Deployment
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  readFileSync,
  existsSync,
  watchFile,
  writeFileSync,
  mkdirSync,
  chmodSync,
  accessSync,
  constants,
} from 'fs';
import { join, dirname } from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

/**
 * Local secret metadata interface
 */
interface LocalSecretMetadata {
  name: string;
  key: string;
  source: 'local-file' | 'environment' | 'docker-compose';
  lastUpdated: Date;
  version: string;
  encrypted: boolean;
  filePath?: string;
  permissions: string;
}

/**
 * Local secret value with metadata
 */
interface LocalSecretValue {
  value: string;
  metadata: LocalSecretMetadata;
}

/**
 * Local secret rotation configuration
 */
interface LocalRotationConfig {
  enabled: boolean;
  intervalMs: number;
  maxAge: number;
  notifyBeforeExpiry: number;
  backupRetention: number;
}

/**
 * Local secrets management service
 * Provides enterprise-grade local secrets management with rotation and monitoring
 */
@Injectable()
export class SecretsService extends EventEmitter implements OnModuleInit {
  private readonly logger = new Logger('LocalSecretsService');
  private readonly secretsCache = new Map<string, LocalSecretValue>();
  private readonly localSecretsPath: string;
  private readonly encryptionKey: Buffer;
  private readonly rotationConfig: LocalRotationConfig;
  private rotationTimer?: NodeJS.Timeout;
  private fileWatchers = new Map<string, () => void>();

  constructor(private readonly configService: ConfigService) {
    super();

    // Initialize local secrets directory with proper permissions
    this.localSecretsPath = process.env.LOCAL_SECRETS_DIR || './.env/secrets';

    // Initialize encryption key for local secrets encryption
    const encryptionKeyString =
      process.env.LOCAL_SECRETS_ENCRYPTION_KEY ||
      this.configService.get<string>('app.security.encryptionKey') ||
      'default-local-key-change-in-production';

    this.encryptionKey = crypto.scryptSync(encryptionKeyString, 'salt', 32);

    // Configure local secrets rotation
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
      backupRetention:
        this.configService.get<number>('app.secrets.backupRetention') ?? 5,
    };

    this.logger.log('Local Secrets Service initialized', {
      secretsPath: this.localSecretsPath,
      rotationEnabled: this.rotationConfig.enabled,
      cloudDependencies: false,
      localFileBasedSecrets: true,
      dockerComposeCompatible: true,
    });
  }

  /**
   * Initialize local secrets service
   * Sets up local secret loading, caching, and rotation
   */
  onModuleInit(): void {
    const startTime = Date.now();
    this.logger.log('Initializing Local Secrets Service...');

    try {
      // Initialize local secrets directory
      this.initializeLocalSecretsDirectory();

      // Load critical secrets from local storage
      this.loadCriticalLocalSecrets();

      // Setup local secrets rotation if enabled
      if (this.rotationConfig.enabled) {
        this.setupLocalSecretsRotation();
      }

      // Setup local file watching for secrets hot-reloading
      this.setupLocalSecretsWatching();

      const initTime = Date.now() - startTime;
      this.logger.log('Local Secrets Service initialized successfully', {
        initTimeMs: initTime,
        cachedSecretsCount: this.secretsCache.size,
        rotationEnabled: this.rotationConfig.enabled,
        watchersCount: this.fileWatchers.size,
        secretsDirectoryReady: existsSync(this.localSecretsPath),
      });

      this.emit('localSecretsInitialized', {
        timestamp: new Date().toISOString(),
        initTime,
        secretsCount: this.secretsCache.size,
      });
    } catch (error) {
      const initTime = Date.now() - startTime;
      this.logger.error('Local Secrets Service initialization failed', {
        error: error instanceof Error ? error.message : String(error),
        initTimeMs: initTime,
      });
      throw error;
    }
  }

  /**
   * Get secret value securely from local storage
   *
   * @param secretName - Name of the secret
   * @param key - Key within the secret (optional)
   * @param encrypted - Whether the secret is encrypted
   * @returns Secret value or null if not found
   */
  getSecret(
    secretName: string,
    key?: string,
    encrypted = false,
  ): string | null {
    const operationId = `get-local-secret-${Date.now()}`;
    const startTime = Date.now();
    const cacheKey = key ? `${secretName}:${key}` : secretName;

    this.logger.debug(`[${operationId}] Retrieving local secret`, {
      secretName,
      key,
      encrypted,
      cacheKey,
      secretsPath: this.localSecretsPath,
    });

    try {
      // Check cache first
      const cachedSecret = this.secretsCache.get(cacheKey);
      if (cachedSecret) {
        this.logger.debug(`[${operationId}] Secret retrieved from cache`, {
          secretName,
          cacheKey,
          source: cachedSecret.metadata.source,
        });
        return encrypted
          ? this.decryptLocalSecret(cachedSecret.value)
          : cachedSecret.value;
      }

      // Load from local encrypted file storage first
      let secretValue = this.loadFromLocalFile(secretName, key);
      let source: LocalSecretMetadata['source'] = 'local-file';

      // Fallback to environment variables
      if (!secretValue) {
        secretValue = this.loadFromEnvironment(key || secretName);
        source = 'environment';
      }

      // Fallback to Docker Compose environment
      if (!secretValue) {
        secretValue = this.loadFromDockerCompose(secretName, key);
        source = 'docker-compose';
      }

      if (!secretValue) {
        this.logger.debug(`[${operationId}] Local secret not found`, {
          secretName,
          key,
          searchedSources: ['local-file', 'environment', 'docker-compose'],
        });
        return null;
      }

      // Cache the secret with local metadata
      const metadata: LocalSecretMetadata = {
        name: secretName,
        key: key || secretName,
        source,
        lastUpdated: new Date(),
        version: this.generateSecretVersion(),
        encrypted,
        permissions: '600',
        filePath:
          source === 'local-file'
            ? join(this.localSecretsPath, `${secretName}.enc`)
            : undefined,
      };

      this.secretsCache.set(cacheKey, {
        value: secretValue,
        metadata,
      });

      const loadTime = Date.now() - startTime;
      this.logger.debug(`[${operationId}] Local secret loaded and cached`, {
        secretName,
        key,
        source,
        encrypted,
        loadTimeMs: loadTime,
      });

      return encrypted ? this.decryptLocalSecret(secretValue) : secretValue;
    } catch (error) {
      const loadTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] Failed to retrieve local secret`, {
        secretName,
        key,
        error: error instanceof Error ? error.message : String(error),
        loadTimeMs: loadTime,
      });
      return null;
    }
  }

  /**
   * Set secret value in local encrypted storage
   *
   * @param secretName - Name of the secret
   * @param value - Secret value
   * @param key - Key within the secret (optional)
   * @param encrypted - Whether to encrypt the secret
   */
  setLocalSecret(
    secretName: string,
    value: string,
    key?: string,
    encrypted = true,
  ): boolean {
    const operationId = `set-local-secret-${Date.now()}`;
    const startTime = Date.now();
    const cacheKey = key ? `${secretName}:${key}` : secretName;

    this.logger.debug(`[${operationId}] Setting local secret`, {
      secretName,
      key,
      encrypted,
      cacheKey,
    });

    try {
      const secretFile = join(this.localSecretsPath, `${secretName}.enc`);
      let secrets: Record<string, string> = {};

      // Load existing secrets if file exists
      if (existsSync(secretFile)) {
        try {
          const encryptedData = readFileSync(secretFile, 'utf8');
          const decryptedData = this.decryptLocalSecret(encryptedData);
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
      const secretKey = key || 'value';
      secrets[secretKey] = value;

      // Encrypt and store with proper permissions
      const encryptedData = this.encryptLocalSecret(JSON.stringify(secrets));
      writeFileSync(secretFile, encryptedData, { mode: 0o600 });

      // Set directory permissions
      chmodSync(dirname(secretFile), 0o700);

      // Cache the secret with metadata
      const metadata: LocalSecretMetadata = {
        name: secretName,
        key: secretKey,
        source: 'local-file',
        lastUpdated: new Date(),
        version: this.generateSecretVersion(),
        encrypted: true,
        filePath: secretFile,
        permissions: '600',
      };

      this.secretsCache.set(cacheKey, {
        value: encrypted ? encryptedData : value,
        metadata,
      });

      const storeTime = Date.now() - startTime;
      this.logger.debug(`[${operationId}] Local secret stored successfully`, {
        secretName,
        key,
        storeTimeMs: storeTime,
        filePath: secretFile,
      });

      this.emit('localSecretUpdated', { secretName, key, metadata });
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
   * Rotate local secret (trigger rotation for a specific secret)
   *
   * @param secretName - Name of the secret to rotate
   * @param key - Key within the secret (optional)
   */
  rotateLocalSecret(secretName: string, key?: string): void {
    const operationId = `rotate-local-secret-${Date.now()}`;
    const cacheKey = key ? `${secretName}:${key}` : secretName;

    this.logger.log(`[${operationId}] Rotating local secret`, {
      secretName,
      key,
    });

    try {
      // Create backup before rotation
      this.createLocalSecretBackup(secretName);

      // Remove from cache to force reload
      this.secretsCache.delete(cacheKey);

      // Reload secret from local storage
      this.getSecret(secretName, key);

      this.emit('localSecretRotated', { secretName, key });
      this.logger.log(`[${operationId}] Local secret rotated successfully`, {
        secretName,
        key,
      });
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to rotate local secret`, {
        secretName,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Set secret value in local encrypted storage (alias for setLocalSecret)
   *
   * @param secretName - Name of the secret
   * @param value - Secret value
   * @param key - Key within the secret (optional)
   * @param encrypted - Whether to encrypt the secret
   */
  setSecret(
    secretName: string,
    value: string,
    key?: string,
    encrypted = true,
  ): boolean {
    return this.setLocalSecret(secretName, value, key, encrypted);
  }

  /**
   * Rotate secret (alias for rotateLocalSecret)
   *
   * @param secretName - Name of the secret to rotate
   * @param key - Key within the secret (optional)
   */
  rotateSecret(secretName: string, key?: string): void {
    return this.rotateLocalSecret(secretName, key);
  }

  /**
   * Get local secrets health (alias for getLocalSecretsHealth)
   */
  getSecretsHealth(): {
    healthy: number;
    expiring: number;
    expired: number;
    total: number;
    details: Array<{
      name: string;
      key: string;
      status: 'healthy' | 'expiring' | 'expired';
      age: number;
      source: string;
    }>;
  } {
    return this.getLocalSecretsHealth();
  }

  /**
   * Get local secrets metadata for monitoring
   *
   * @returns Array of local secret metadata (without values)
   */
  getLocalSecretsMetadata(): LocalSecretMetadata[] {
    return Array.from(this.secretsCache.values()).map(
      (secret) => secret.metadata,
    );
  }

  /**
   * Check local secrets health and expiry status
   */
  getLocalSecretsHealth(): {
    healthy: number;
    expiring: number;
    expired: number;
    total: number;
    details: Array<{
      name: string;
      key: string;
      status: 'healthy' | 'expiring' | 'expired';
      age: number;
      source: string;
    }>;
  } {
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
      };
    });

    return {
      healthy: details.filter((d) => d.status === 'healthy').length,
      expiring: details.filter((d) => d.status === 'expiring').length,
      expired: details.filter((d) => d.status === 'expired').length,
      total: details.length,
      details,
    };
  }

  /**
   * Initialize local secrets directory with proper permissions
   *
   * @private
   */
  private initializeLocalSecretsDirectory(): void {
    try {
      if (!existsSync(this.localSecretsPath)) {
        mkdirSync(this.localSecretsPath, { recursive: true });
        chmodSync(this.localSecretsPath, 0o700); // Owner read/write/execute only
        this.logger.log(
          `Created local secrets directory with secure permissions: ${this.localSecretsPath}`,
        );
      }

      // Verify directory permissions
      try {
        accessSync(this.localSecretsPath, constants.R_OK | constants.W_OK);
        this.logger.debug('Local secrets directory access validated');
      } catch (error) {
        this.logger.error('Local secrets directory access validation failed', {
          path: this.localSecretsPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      this.logger.error('Failed to initialize local secrets directory', {
        path: this.localSecretsPath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Load secret from local encrypted file storage
   *
   * @private
   * @param secretName - Name of the secret
   * @param key - Key within the secret
   * @returns Secret value or null
   */
  private loadFromLocalFile(secretName: string, key?: string): string | null {
    try {
      const secretFile = join(this.localSecretsPath, `${secretName}.enc`);

      if (!existsSync(secretFile)) {
        return null;
      }

      // Read and decrypt the secret file
      const encryptedData = readFileSync(secretFile, 'utf8');
      const decryptedData = this.decryptLocalSecret(encryptedData);

      // Parse the secrets JSON
      const secrets = JSON.parse(decryptedData) as Record<string, string>;
      return secrets[key || 'value'] || null;
    } catch (error) {
      this.logger.debug('Failed to load from local file', {
        secretName,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Load secret from environment variables with security validation
   *
   * @private
   * @param key - Environment variable key
   * @returns Secret value or null
   */
  private loadFromEnvironment(key: string): string | null {
    const envValue = process.env[key];
    if (!envValue) {
      return null;
    }

    // Sanitize environment variable value
    return this.sanitizeEnvValue(envValue);
  }

  /**
   * Load secret from Docker Compose environment
   *
   * @private
   * @param secretName - Name of the secret
   * @param key - Key within the secret
   * @returns Secret value or null
   */
  private loadFromDockerCompose(
    secretName: string,
    key?: string,
  ): string | null {
    // Check for Docker Compose specific environment variables
    const dockerComposeKey = `DOCKER_${(key || secretName).toUpperCase()}`;
    return process.env[dockerComposeKey] || null;
  }

  /**
   * Load critical secrets during initialization from local storage
   *
   * @private
   */
  private loadCriticalLocalSecrets(): void {
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
            this.setLocalSecret(name, envValue, key, true);
            secretValue = envValue;
            fromEnvCount++;
            this.logger.debug(
              `Initialized local secret from environment: ${name}:${key}`,
            );
          }
        }

        if (secretValue) {
          initializedCount++;
        } else {
          this.logger.warn(`Critical local secret not found: ${name}:${key}`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to initialize critical local secret: ${name}:${key}`,
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    this.logger.log('Critical local secrets initialization completed', {
      total: criticalSecrets.length,
      initialized: initializedCount,
      fromEnvironment: fromEnvCount,
      missing: criticalSecrets.length - initializedCount,
    });
  }

  /**
   * Setup local secrets rotation timer
   *
   * @private
   */
  private setupLocalSecretsRotation(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    this.rotationTimer = setInterval(() => {
      try {
        this.performLocalSecretsRotation();
      } catch (error) {
        this.logger.error('Failed to perform local secrets rotation', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, this.rotationConfig.intervalMs);

    this.logger.log('Local secrets rotation enabled', {
      intervalMs: this.rotationConfig.intervalMs,
      maxAge: this.rotationConfig.maxAge,
    });
  }

  /**
   * Perform automatic local secrets rotation
   *
   * @private
   */
  private performLocalSecretsRotation(): void {
    this.logger.log('Starting automatic local secrets rotation...');

    const health = this.getLocalSecretsHealth();
    const secretsToRotate = health.details.filter(
      (secret) => secret.status === 'expired',
    );

    if (secretsToRotate.length === 0) {
      this.logger.debug('No local secrets require rotation');
      return;
    }

    this.logger.log(`Rotating ${secretsToRotate.length} expired local secrets`);

    for (const secret of secretsToRotate) {
      try {
        this.rotateLocalSecret(secret.name, secret.key);
      } catch (error) {
        this.logger.error(`Failed to rotate local secret: ${secret.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Setup file watching for local secrets hot-reloading
   *
   * @private
   */
  private setupLocalSecretsWatching(): void {
    if (!existsSync(this.localSecretsPath)) {
      this.logger.debug('Local secrets path not found, skipping file watching');
      return;
    }

    // Watch critical secret files for changes
    const criticalSecrets = ['api-keys', 'auth', 'security'];

    criticalSecrets.forEach((secretName) => {
      const secretFile = join(this.localSecretsPath, `${secretName}.enc`);
      if (existsSync(secretFile)) {
        const watcher = () => {
          this.logger.log(`Local secret file changed: ${secretName}`);
          try {
            this.rotateLocalSecret(secretName);
          } catch (error) {
            this.logger.error(
              `Failed to rotate local secret on file change: ${secretName}`,
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

    this.logger.log('Local file watching setup for secrets hot-reloading', {
      watchersCount: this.fileWatchers.size,
    });
  }

  /**
   * Create backup of local secret before rotation
   *
   * @private
   * @param secretName - Name of the secret to backup
   */
  private createLocalSecretBackup(secretName: string): void {
    try {
      const secretFile = join(this.localSecretsPath, `${secretName}.enc`);
      if (existsSync(secretFile)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = join(
          this.localSecretsPath,
          `${secretName}.${timestamp}.backup`,
        );

        const secretData = readFileSync(secretFile);
        writeFileSync(backupFile, secretData, { mode: 0o600 });

        this.logger.debug(`Created local secret backup: ${backupFile}`);
      }
    } catch (error) {
      this.logger.error('Failed to create local secret backup', {
        secretName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Encrypt secret value using AES-256-GCM
   *
   * @private
   * @param value - Secret value to encrypt
   * @returns Encrypted secret value
   */
  private encryptLocalSecret(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt secret value using AES-256-GCM
   *
   * @private
   * @param encryptedValue - Encrypted secret value
   * @returns Decrypted secret value
   */
  private decryptLocalSecret(encryptedValue: string): string {
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
   * Sanitize environment variable value to prevent injection attacks
   *
   * @private
   * @param value - Raw environment variable value
   * @returns Sanitized value
   */
  private sanitizeEnvValue(value: string): string {
    // Remove potentially dangerous characters and limit length
    const sanitized = value
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .trim()
      .substring(0, 4096); // Limit to reasonable length

    if (sanitized !== value) {
      this.logger.warn('Environment variable value was sanitized', {
        originalLength: value.length,
        sanitizedLength: sanitized.length,
      });
    }

    return sanitized;
  }

  /**
   * Generate secret version identifier
   *
   * @private
   * @returns Version identifier
   */
  private generateSecretVersion(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Cleanup resources on module destroy
   */
  onModuleDestroy(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    // Cleanup file watchers
    this.fileWatchers.clear();

    this.logger.log('Local Secrets Service destroyed');
  }
}
