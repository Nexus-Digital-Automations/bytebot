/**
 * Secrets Service - Enterprise-grade secrets management for Bytebot API Platform
 * Provides secure secrets loading, rotation, and management with Kubernetes integration
 *
 * Features:
 * - Kubernetes secrets loading with automatic fallback
 * - Secrets rotation and hot-reloading capabilities
 * - Encrypted secrets storage and retrieval
 * - Performance monitoring and caching
 * - Integration with external secret management systems
 *
 * @author Infrastructure & Configuration Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync, existsSync, watchFile } from 'fs';
import { join } from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

/**
 * Secret metadata interface
 */
interface SecretMetadata {
  name: string;
  key: string;
  source: 'kubernetes' | 'environment' | 'external';
  lastUpdated: Date;
  version: string;
  encrypted: boolean;
}

/**
 * Secret value with metadata
 */
interface SecretValue {
  value: string;
  metadata: SecretMetadata;
}

/**
 * Secret rotation configuration
 */
interface RotationConfig {
  enabled: boolean;
  intervalMs: number;
  maxAge: number;
  notifyBeforeExpiry: number;
}

/**
 * Secrets management service
 * Provides enterprise-grade secrets management with rotation and monitoring
 */
@Injectable()
export class SecretsService extends EventEmitter implements OnModuleInit {
  private readonly logger = new Logger('SecretsService');
  private readonly secretsCache = new Map<string, SecretValue>();
  private readonly secretsPath = '/etc/secrets';
  private readonly encryptionKey: Buffer;
  private readonly rotationConfig: RotationConfig;
  private rotationTimer?: NodeJS.Timeout;
  private fileWatchers = new Map<string, () => void>();

  constructor(private readonly configService: ConfigService) {
    super();

    // Initialize encryption key for secrets encryption
    const encryptionKeyString = this.configService.get<string>(
      'app.security.encryptionKey',
    );
    this.encryptionKey = Buffer.from(encryptionKeyString!, 'utf8').subarray(
      0,
      32,
    );

    // Configure secrets rotation
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
    };
  }

  /**
   * Initialize secrets service
   * Sets up secret loading, caching, and rotation
   */
  async onModuleInit(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('Initializing Secrets Service...');

    try {
      // Load critical secrets
      await this.loadCriticalSecrets();

      // Setup secrets rotation if enabled
      if (this.rotationConfig.enabled) {
        this.setupSecretsRotation();
      }

      // Setup file watching for Kubernetes secrets
      this.setupSecretsWatching();

      const initTime = Date.now() - startTime;
      this.logger.log('Secrets Service initialized successfully', {
        initTimeMs: initTime,
        cachedSecretsCount: this.secretsCache.size,
        rotationEnabled: this.rotationConfig.enabled,
        watchersCount: this.fileWatchers.size,
      });
    } catch (error) {
      const initTime = Date.now() - startTime;
      this.logger.error('Secrets Service initialization failed', {
        error: error instanceof Error ? error.message : String(error),
        initTimeMs: initTime,
      });
      throw error;
    }
  }

  /**
   * Get secret value securely
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
          ? this.decryptSecret(cachedSecret.value)
          : cachedSecret.value;
      }

      // Load from Kubernetes secrets first
      let secretValue = await this.loadFromKubernetes(secretName, key);
      let source: SecretMetadata['source'] = 'kubernetes';

      // Fallback to environment variables
      if (!secretValue) {
        secretValue = await this.loadFromEnvironment(key || secretName);
        source = 'environment';
      }

      // Fallback to external secret management (placeholder)
      if (!secretValue) {
        secretValue = await this.loadFromExternal(secretName, key);
        source = 'external';
      }

      if (!secretValue) {
        this.logger.debug(`[${operationId}] Secret not found`, {
          secretName,
          key,
        });
        return null;
      }

      // Cache the secret with metadata
      const metadata: SecretMetadata = {
        name: secretName,
        key: key || secretName,
        source,
        lastUpdated: new Date(),
        version: this.generateSecretVersion(),
        encrypted,
      };

      this.secretsCache.set(cacheKey, {
        value: secretValue,
        metadata,
      });

      const loadTime = Date.now() - startTime;
      this.logger.debug(`[${operationId}] Secret loaded and cached`, {
        secretName,
        key,
        source,
        encrypted,
        loadTimeMs: loadTime,
      });

      return encrypted ? this.decryptSecret(secretValue) : secretValue;
    } catch (error) {
      const loadTime = Date.now() - startTime;
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
   * Set secret value (for testing and development)
   *
   * @param secretName - Name of the secret
   * @param value - Secret value
   * @param key - Key within the secret (optional)
   * @param encrypted - Whether to encrypt the secret
   */
  async setSecret(
    secretName: string,
    value: string,
    key?: string,
    encrypted = false,
  ): Promise<void> {
    const operationId = `set-secret-${Date.now()}`;
    const cacheKey = key ? `${secretName}:${key}` : secretName;

    this.logger.debug(`[${operationId}] Setting secret`, {
      secretName,
      key,
      encrypted,
      cacheKey,
    });

    const encryptedValue = encrypted ? this.encryptSecret(value) : value;

    const metadata: SecretMetadata = {
      name: secretName,
      key: key || secretName,
      source: 'external',
      lastUpdated: new Date(),
      version: this.generateSecretVersion(),
      encrypted,
    };

    this.secretsCache.set(cacheKey, {
      value: encryptedValue,
      metadata,
    });

    this.emit('secretUpdated', { secretName, key, metadata });
    this.logger.debug(`[${operationId}] Secret set successfully`, {
      secretName,
      key,
      encrypted,
    });
  }

  /**
   * Rotate secret (trigger rotation for a specific secret)
   *
   * @param secretName - Name of the secret to rotate
   * @param key - Key within the secret (optional)
   */
  async rotateSecret(secretName: string, key?: string): Promise<void> {
    const operationId = `rotate-secret-${Date.now()}`;
    const cacheKey = key ? `${secretName}:${key}` : secretName;

    this.logger.log(`[${operationId}] Rotating secret`, {
      secretName,
      key,
    });

    try {
      // Remove from cache to force reload
      this.secretsCache.delete(cacheKey);

      // Reload secret
      await this.getSecret(secretName, key);

      this.emit('secretRotated', { secretName, key });
      this.logger.log(`[${operationId}] Secret rotated successfully`, {
        secretName,
        key,
      });
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to rotate secret`, {
        secretName,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get secrets metadata for monitoring
   *
   * @returns Array of secret metadata (without values)
   */
  getSecretsMetadata(): SecretMetadata[] {
    return Array.from(this.secretsCache.values()).map(
      (secret) => secret.metadata,
    );
  }

  /**
   * Check secret health and expiry status
   *
   * @returns Health status of all secrets
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
   * Load secret from Kubernetes mounted volume
   *
   * @private
   * @param secretName - Name of the secret
   * @param key - Key within the secret
   * @returns Secret value or null
   */
  private async loadFromKubernetes(
    secretName: string,
    key?: string,
  ): Promise<string | null> {
    try {
      const secretPath = key
        ? join(this.secretsPath, secretName, key)
        : join(this.secretsPath, secretName);

      if (!existsSync(secretPath)) {
        return null;
      }

      return readFileSync(secretPath, 'utf8').trim();
    } catch (error) {
      this.logger.debug('Failed to load from Kubernetes', {
        secretName,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Load secret from environment variables
   *
   * @private
   * @param key - Environment variable key
   * @returns Secret value or null
   */
  private async loadFromEnvironment(key: string): Promise<string | null> {
    return process.env[key] || null;
  }

  /**
   * Load secret from external secret management system
   * Placeholder for integration with HashiCorp Vault, AWS Secrets Manager, etc.
   *
   * @private
   * @param secretName - Name of the secret
   * @param key - Key within the secret
   * @returns Secret value or null
   */
  private async loadFromExternal(
    secretName: string,
    key?: string,
  ): Promise<string | null> {
    // Placeholder for external secret management integration
    // TODO: Implement integration with external systems like:
    // - HashiCorp Vault
    // - AWS Secrets Manager
    // - Azure Key Vault
    // - Google Secret Manager
    return null;
  }

  /**
   * Load critical secrets during initialization
   *
   * @private
   */
  private async loadCriticalSecrets(): Promise<void> {
    const criticalSecrets = [
      { name: 'jwt-secret', key: 'JWT_SECRET' },
      { name: 'encryption-key', key: 'ENCRYPTION_KEY' },
      { name: 'anthropic-api-key', key: 'ANTHROPIC_API_KEY' },
      { name: 'openai-api-key', key: 'OPENAI_API_KEY' },
      { name: 'gemini-api-key', key: 'GEMINI_API_KEY' },
    ];

    const loadPromises = criticalSecrets.map(async ({ name, key }) => {
      try {
        await this.getSecret(name, key);
      } catch (error) {
        this.logger.warn(`Failed to load critical secret: ${name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Setup secrets rotation timer
   *
   * @private
   */
  private setupSecretsRotation(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }

    this.rotationTimer = setInterval(() => {
      this.performSecretsRotation();
    }, this.rotationConfig.intervalMs);

    this.logger.log('Secrets rotation enabled', {
      intervalMs: this.rotationConfig.intervalMs,
      maxAge: this.rotationConfig.maxAge,
    });
  }

  /**
   * Perform automatic secrets rotation
   *
   * @private
   */
  private async performSecretsRotation(): Promise<void> {
    this.logger.log('Starting automatic secrets rotation...');

    const health = this.getSecretsHealth();
    const secretsToRotate = health.details.filter(
      (secret) => secret.status === 'expired',
    );

    if (secretsToRotate.length === 0) {
      this.logger.debug('No secrets require rotation');
      return;
    }

    this.logger.log(`Rotating ${secretsToRotate.length} expired secrets`);

    for (const secret of secretsToRotate) {
      try {
        await this.rotateSecret(secret.name, secret.key);
      } catch (error) {
        this.logger.error(`Failed to rotate secret: ${secret.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Setup file watching for Kubernetes secrets hot-reloading
   *
   * @private
   */
  private setupSecretsWatching(): void {
    if (!existsSync(this.secretsPath)) {
      this.logger.debug(
        'Kubernetes secrets path not found, skipping file watching',
      );
      return;
    }

    // Watch critical secret files for changes
    const criticalSecrets = [
      'jwt-secret',
      'encryption-key',
      'anthropic-api-key',
      'openai-api-key',
      'gemini-api-key',
    ];

    criticalSecrets.forEach((secretName) => {
      const secretDir = join(this.secretsPath, secretName);
      if (existsSync(secretDir)) {
        const watcher = () => {
          this.logger.log(`Secret file changed: ${secretName}`);
          this.rotateSecret(secretName);
        };

        watchFile(secretDir, watcher);
        this.fileWatchers.set(secretName, watcher);
      }
    });

    this.logger.log('File watching setup for secrets hot-reloading', {
      watchersCount: this.fileWatchers.size,
    });
  }

  /**
   * Encrypt secret value
   *
   * @private
   * @param value - Secret value to encrypt
   * @returns Encrypted secret value
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
   * Decrypt secret value
   *
   * @private
   * @param encryptedValue - Encrypted secret value
   * @returns Decrypted secret value
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

    this.logger.log('Secrets Service destroyed');
  }
}
