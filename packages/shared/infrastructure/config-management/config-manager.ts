/**
 * PARLANT Database Function Wrapping System - Configuration Management
 * Enterprise-grade configuration management with secret handling and environment-specific settings
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
  CreateSecretCommand,
  UpdateSecretCommand
} from '@aws-sdk/client-secrets-manager';
import {
  SSMClient,
  GetParameterCommand,
  PutParameterCommand,
  GetParametersByPathCommand
} from '@aws-sdk/client-ssm';
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';
import { createHash, createCipher, createDecipher } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface ParlantEnvironmentConfig {
  environment: 'development' | 'staging' | 'production' | 'dr';
  region: string;
  functionCount: number;
  complianceLevel: 'basic' | 'enterprise' | 'regulated';

  // Database configuration
  database: {
    host: string;
    port: number;
    name: string;
    maxConnections: number;
    poolSize: number;
    timeout: number;
    ssl: boolean;
    replication: {
      enabled: boolean;
      readReplicas: number;
    };
  };

  // Redis configuration
  redis: {
    host: string;
    port: number;
    cluster: boolean;
    maxMemory: string;
    evictionPolicy: string;
    persistence: boolean;
  };

  // Kubernetes configuration
  kubernetes: {
    namespace: string;
    replicas: {
      min: number;
      max: number;
      target: number;
    };
    resources: {
      cpu: {
        request: string;
        limit: string;
      };
      memory: {
        request: string;
        limit: string;
      };
    };
    scaling: {
      cpuThreshold: number;
      memoryThreshold: number;
      scaleUpCooldown: number;
      scaleDownCooldown: number;
    };
  };

  // Security configuration
  security: {
    enableWAF: boolean;
    enableGuardDuty: boolean;
    enableShield: boolean;
    encryptionAtRest: boolean;
    encryptionInTransit: boolean;
    auditLogging: boolean;
    complianceMonitoring: boolean;
  };

  // Monitoring configuration
  monitoring: {
    metricsRetentionDays: number;
    logRetentionDays: number;
    enableDetailedMonitoring: boolean;
    alertChannels: string[];
    anomalyDetection: boolean;
    predictiveScaling: boolean;
  };

  // Performance configuration
  performance: {
    maxResponseTimeMs: number;
    minThroughputRps: number;
    maxErrorRate: number;
    minAvailability: number;
    caching: {
      l1CacheTtl: number;
      l2CacheTtl: number;
      l3CacheTtl: number;
      hitRateTarget: number;
    };
  };

  // Feature flags
  features: {
    enableExperimentalFeatures: boolean;
    enableBetaApis: boolean;
    enableDebugEndpoints: boolean;
    enableMockServices: boolean;
    enableHotReload: boolean;
  };
}

export interface SecretConfiguration {
  name: string;
  value: string;
  encrypted: boolean;
  version: string;
  lastRotated: Date;
  rotationInterval: number; // days
  classification: 'public' | 'internal' | 'confidential' | 'restricted' | 'classified';
}

export class ParlantConfigManager {
  private secretsClient: SecretsManagerClient;
  private ssmClient: SSMClient;
  private kmsClient: KMSClient;
  private environment: string;
  private region: string;
  private encryptionKey: string;

  private configCache: Map<string, any> = new Map();
  private secretCache: Map<string, SecretConfiguration> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 300000; // 5 minutes

  constructor(environment: string, region: string = 'us-east-1') {
    this.environment = environment;
    this.region = region;

    this.secretsClient = new SecretsManagerClient({ region });
    this.ssmClient = new SSMClient({ region });
    this.kmsClient = new KMSClient({ region });

    this.encryptionKey = process.env.PARLANT_ENCRYPTION_KEY || this.generateEncryptionKey();
  }

  /**
   * Load environment-specific configuration with hot reloading support
   */
  async loadConfiguration(): Promise<ParlantEnvironmentConfig> {
    const cacheKey = `config-${this.environment}`;

    // Check cache first
    if (this.isCacheValid() && this.configCache.has(cacheKey)) {
      return this.configCache.get(cacheKey);
    }

    try {
      // Load base configuration
      const baseConfig = await this.loadBaseConfiguration();

      // Load environment-specific overrides
      const envConfig = await this.loadEnvironmentConfiguration();

      // Load secrets and inject into configuration
      const secrets = await this.loadSecretsForEnvironment();

      // Merge configurations with priority: secrets > env-specific > base
      const finalConfig = this.mergeConfigurations(baseConfig, envConfig, secrets);

      // Validate configuration
      this.validateConfiguration(finalConfig);

      // Cache the configuration
      this.configCache.set(cacheKey, finalConfig);
      this.cacheTimestamp = Date.now();

      return finalConfig;
    } catch (error) {
      console.error(`Failed to load configuration for environment ${this.environment}:`, error);
      throw new Error(`Configuration loading failed: ${error.message}`);
    }
  }

  /**
   * Load base configuration from file system
   */
  private async loadBaseConfiguration(): Promise<Partial<ParlantEnvironmentConfig>> {
    const configPath = path.join(__dirname, 'configs', 'base.yaml');

    if (!fs.existsSync(configPath)) {
      throw new Error(`Base configuration file not found: ${configPath}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    return yaml.load(configContent) as Partial<ParlantEnvironmentConfig>;
  }

  /**
   * Load environment-specific configuration
   */
  private async loadEnvironmentConfiguration(): Promise<Partial<ParlantEnvironmentConfig>> {
    const configPath = path.join(__dirname, 'configs', `${this.environment}.yaml`);

    if (!fs.existsSync(configPath)) {
      console.warn(`Environment configuration file not found: ${configPath}. Using base configuration only.`);
      return {};
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    return yaml.load(configContent) as Partial<ParlantEnvironmentConfig>;
  }

  /**
   * Load secrets from AWS Secrets Manager for the current environment
   */
  private async loadSecretsForEnvironment(): Promise<Record<string, any>> {
    const secretName = `parlant/${this.environment}/config`;

    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.secretsClient.send(command);

      if (response.SecretString) {
        return JSON.parse(response.SecretString);
      }

      return {};
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        console.warn(`Secrets not found for environment ${this.environment}. Proceeding without secrets.`);
        return {};
      }

      console.error(`Failed to load secrets for environment ${this.environment}:`, error);
      throw error;
    }
  }

  /**
   * Store secret in AWS Secrets Manager with encryption
   */
  async storeSecret(name: string, value: string, classification: string): Promise<void> {
    const secretName = `parlant/${this.environment}/${name}`;

    // Encrypt sensitive values
    const encryptedValue = classification === 'classified' || classification === 'restricted'
      ? await this.encryptValue(value)
      : value;

    const secretConfig: SecretConfiguration = {
      name,
      value: encryptedValue,
      encrypted: classification === 'classified' || classification === 'restricted',
      version: '1',
      lastRotated: new Date(),
      rotationInterval: this.getRotationInterval(classification),
      classification: classification as any
    };

    try {
      // Try to update existing secret first
      const updateCommand = new UpdateSecretCommand({
        SecretId: secretName,
        SecretString: JSON.stringify(secretConfig)
      });

      await this.secretsClient.send(updateCommand);
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        // Create new secret if it doesn't exist
        const createCommand = new CreateSecretCommand({
          Name: secretName,
          SecretString: JSON.stringify(secretConfig),
          Description: `PARLANT ${classification} secret for ${this.environment} environment`
        });

        await this.secretsClient.send(createCommand);
      } else {
        throw error;
      }
    }

    // Update cache
    this.secretCache.set(name, secretConfig);
  }

  /**
   * Retrieve and decrypt secret
   */
  async getSecret(name: string): Promise<string> {
    // Check cache first
    if (this.secretCache.has(name)) {
      const secret = this.secretCache.get(name)!;
      return secret.encrypted ? await this.decryptValue(secret.value) : secret.value;
    }

    const secretName = `parlant/${this.environment}/${name}`;

    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.secretsClient.send(command);

      if (response.SecretString) {
        const secretConfig: SecretConfiguration = JSON.parse(response.SecretString);
        this.secretCache.set(name, secretConfig);

        return secretConfig.encrypted
          ? await this.decryptValue(secretConfig.value)
          : secretConfig.value;
      }

      throw new Error(`Secret value not found for ${name}`);
    } catch (error) {
      console.error(`Failed to retrieve secret ${name}:`, error);
      throw error;
    }
  }

  /**
   * Hot reload configuration changes
   */
  async reloadConfiguration(): Promise<ParlantEnvironmentConfig> {
    // Clear cache to force reload
    this.configCache.clear();
    this.secretCache.clear();
    this.cacheTimestamp = 0;

    return await this.loadConfiguration();
  }

  /**
   * Watch for configuration changes and trigger hot reload
   */
  async watchConfigurationChanges(callback: (config: ParlantEnvironmentConfig) => void): Promise<void> {
    const configDir = path.join(__dirname, 'configs');

    // Watch file system changes
    fs.watch(configDir, { recursive: true }, async (eventType, filename) => {
      if (filename && (filename.includes(this.environment) || filename.includes('base'))) {
        console.log(`Configuration file changed: ${filename}. Reloading...`);

        try {
          const newConfig = await this.reloadConfiguration();
          callback(newConfig);
        } catch (error) {
          console.error('Failed to reload configuration:', error);
        }
      }
    });

    // Watch for secrets changes (polling-based)
    setInterval(async () => {
      try {
        const newConfig = await this.reloadConfiguration();
        callback(newConfig);
      } catch (error) {
        // Silent fail for polling - avoid spam logs
      }
    }, 300000); // Check every 5 minutes
  }

  /**
   * Validate configuration completeness and correctness
   */
  private validateConfiguration(config: ParlantEnvironmentConfig): void {
    const requiredFields = [
      'environment',
      'region',
      'functionCount',
      'database.host',
      'database.port',
      'redis.host',
      'kubernetes.namespace'
    ];

    for (const field of requiredFields) {
      if (!this.getNestedValue(config, field)) {
        throw new Error(`Required configuration field missing: ${field}`);
      }
    }

    // Environment-specific validations
    if (config.environment === 'production') {
      if (!config.security.encryptionAtRest || !config.security.encryptionInTransit) {
        throw new Error('Production environment requires encryption at rest and in transit');
      }

      if (!config.security.auditLogging) {
        throw new Error('Production environment requires audit logging');
      }

      if (config.functionCount < 1000) {
        throw new Error('Production environment should support at least 1000 functions');
      }
    }

    // Performance validations
    if (config.performance.maxResponseTimeMs > 2000) {
      console.warn('Response time target exceeds 2 seconds - consider optimization');
    }

    if (config.performance.minAvailability < 99.0) {
      console.warn('Availability target below 99% - consider infrastructure improvements');
    }
  }

  /**
   * Merge multiple configuration sources with proper precedence
   */
  private mergeConfigurations(
    base: Partial<ParlantEnvironmentConfig>,
    environment: Partial<ParlantEnvironmentConfig>,
    secrets: Record<string, any>
  ): ParlantEnvironmentConfig {
    const merged = { ...base };

    // Deep merge environment-specific config
    this.deepMerge(merged, environment);

    // Inject secrets into appropriate configuration paths
    this.injectSecrets(merged, secrets);

    return merged as ParlantEnvironmentConfig;
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  /**
   * Inject secrets into configuration at appropriate paths
   */
  private injectSecrets(config: any, secrets: Record<string, any>): void {
    for (const [secretKey, secretValue] of Object.entries(secrets)) {
      // Map secret keys to configuration paths
      const configPath = this.mapSecretToConfigPath(secretKey);
      if (configPath) {
        this.setNestedValue(config, configPath, secretValue);
      }
    }
  }

  /**
   * Map secret keys to configuration paths
   */
  private mapSecretToConfigPath(secretKey: string): string | null {
    const secretMappings: Record<string, string> = {
      'database_password': 'database.password',
      'database_username': 'database.username',
      'redis_auth_token': 'redis.authToken',
      'jwt_secret': 'security.jwtSecret',
      'encryption_key': 'security.encryptionKey',
      'api_key': 'security.apiKey'
    };

    return secretMappings[secretKey] || null;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  /**
   * Encrypt sensitive values using KMS
   */
  private async encryptValue(value: string): Promise<string> {
    try {
      const command = new EncryptCommand({
        KeyId: `alias/parlant-${this.environment}-secrets`,
        Plaintext: Buffer.from(value, 'utf8')
      });

      const response = await this.kmsClient.send(command);
      return Buffer.from(response.CiphertextBlob!).toString('base64');
    } catch (error) {
      // Fallback to local encryption if KMS is not available
      console.warn('KMS encryption failed, using local encryption:', error.message);
      return this.encryptValueLocally(value);
    }
  }

  /**
   * Decrypt sensitive values using KMS
   */
  private async decryptValue(encryptedValue: string): Promise<string> {
    try {
      const command = new DecryptCommand({
        CiphertextBlob: Buffer.from(encryptedValue, 'base64')
      });

      const response = await this.kmsClient.send(command);
      return Buffer.from(response.Plaintext!).toString('utf8');
    } catch (error) {
      // Fallback to local decryption if KMS is not available
      console.warn('KMS decryption failed, using local decryption:', error.message);
      return this.decryptValueLocally(encryptedValue);
    }
  }

  /**
   * Local encryption fallback
   */
  private encryptValueLocally(value: string): string {
    const cipher = createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Local decryption fallback
   */
  private decryptValueLocally(encryptedValue: string): string {
    const decipher = createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Generate encryption key if not provided
   */
  private generateEncryptionKey(): string {
    const hash = createHash('sha256');
    hash.update(`parlant-${this.environment}-${Date.now()}`);
    return hash.digest('hex');
  }

  /**
   * Get rotation interval based on classification
   */
  private getRotationInterval(classification: string): number {
    const intervals: Record<string, number> = {
      'public': 365,      // 1 year
      'internal': 180,    // 6 months
      'confidential': 90, // 3 months
      'restricted': 30,   // 1 month
      'classified': 7     // 1 week
    };

    return intervals[classification] || 90;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_TTL;
  }

  /**
   * Get configuration for specific function deployment
   */
  async getFunctionConfiguration(functionId: string): Promise<any> {
    const baseConfig = await this.loadConfiguration();

    // Load function-specific overrides if they exist
    try {
      const functionConfigPath = path.join(__dirname, 'configs', 'functions', `${functionId}.yaml`);

      if (fs.existsSync(functionConfigPath)) {
        const functionConfig = yaml.load(fs.readFileSync(functionConfigPath, 'utf8'));
        return { ...baseConfig, function: functionConfig };
      }
    } catch (error) {
      console.warn(`Failed to load function-specific config for ${functionId}:`, error.message);
    }

    return baseConfig;
  }

  /**
   * Export configuration for external systems
   */
  async exportConfiguration(format: 'json' | 'yaml' | 'env'): Promise<string> {
    const config = await this.loadConfiguration();

    switch (format) {
      case 'json':
        return JSON.stringify(config, null, 2);

      case 'yaml':
        return yaml.dump(config, { indent: 2 });

      case 'env':
        return this.convertToEnvFormat(config);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Convert configuration to environment variables format
   */
  private convertToEnvFormat(config: any, prefix: string = 'PARLANT'): string {
    const envVars: string[] = [];

    const flatten = (obj: any, path: string = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const envKey = path ? `${path}_${key.toUpperCase()}` : key.toUpperCase();

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, envKey);
        } else {
          envVars.push(`${prefix}_${envKey}=${value}`);
        }
      }
    };

    flatten(config);
    return envVars.join('\n');
  }
}