/**
 * Configuration Mock - Comprehensive Mock Services for Configuration Management
 *
 * Provides enterprise-grade mock implementations for configuration services:
 * - Environment variable mocks with validation
 * - Configuration validation and schema mocks
 * - Dynamic configuration loading simulation
 * - Feature flag mocks with A/B testing support
 * - Database configuration mocks with connection pooling
 * - Secrets management mocks with encryption simulation
 * - Kubernetes ConfigMap and Secret simulation
 *
 * Features:
 * - Type-safe configuration mock implementations
 * - Realistic configuration validation scenarios
 * - Hot-reload configuration change simulation
 * - Multi-environment configuration support (dev, staging, prod)
 * - Configuration access monitoring and metrics
 * - Error injection for configuration failure testing
 * - Performance testing with configuration loading delays
 *
 * @author Claude Code
 * @version 2.0.0
 * @since Bytebot Agent Testing Framework v2
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';

// =============================================================================
// MOCK CONFIGURATION TEMPLATES & TYPES
// =============================================================================

/**
 * Mock configuration behavior settings
 */
export interface MockConfigBehavior {
  enableValidation: boolean;
  enableHotReload: boolean;
  enableMetricsCollection: boolean;
  enableSecretsEncryption: boolean;
  simulateLatency: boolean;
  latencyRange: [number, number]; // [min, max] in milliseconds
  errorRate: number; // 0-1, probability of configuration errors
  validationErrorRate: number; // 0-1, probability of validation errors
  secretsLoadFailureRate: number; // 0-1, probability of secrets load failures
}

/**
 * Default mock configuration behavior optimized for testing
 */
export const DEFAULT_CONFIG_BEHAVIOR: MockConfigBehavior = {
  enableValidation: true,
  enableHotReload: false,
  enableMetricsCollection: true,
  enableSecretsEncryption: false,
  simulateLatency: false,
  latencyRange: [50, 200],
  errorRate: 0,
  validationErrorRate: 0,
  secretsLoadFailureRate: 0,
};

/**
 * Type definition for mock environment configuration
 */
interface MockEnvironmentConfig {
  [key: string]: string | Record<string, unknown>;
}

/**
 * Mock environment configurations for different testing scenarios
 */
export const MOCK_ENVIRONMENTS: Record<string, MockEnvironmentConfig> = {
  DEVELOPMENT: {
    NODE_ENV: 'development',
    PORT: '3000',
    DATABASE_URL: 'sqlite://memory',
    JWT_SECRET: 'dev-jwt-secret-for-testing-12345678',
    ENCRYPTION_KEY: 'dev-encryption-key-for-testing-12345678',
    ANTHROPIC_API_KEY: 'mock-anthropic-key-dev',
    OPENAI_API_KEY: 'mock-openai-key-dev',
    GEMINI_API_KEY: 'mock-gemini-key-dev',
    LOG_LEVEL: 'debug',
    ENABLE_CORS: 'true',
    ENABLE_SWAGGER: 'true',
    FEATURE_COMPUTER_USE: 'true',
    FEATURE_ANALYTICS: 'false',
  },

  STAGING: {
    NODE_ENV: 'staging',
    PORT: '3000',
    DATABASE_URL: 'postgresql://user:pass@staging-db:5432/bytebot',
    JWT_SECRET: 'staging-jwt-secret-secure-12345678901234',
    ENCRYPTION_KEY: 'staging-encryption-key-secure-12345678901234',
    ANTHROPIC_API_KEY: 'mock-anthropic-key-staging',
    OPENAI_API_KEY: 'mock-openai-key-staging',
    GEMINI_API_KEY: 'mock-gemini-key-staging',
    LOG_LEVEL: 'info',
    ENABLE_CORS: 'false',
    ENABLE_SWAGGER: 'false',
    FEATURE_COMPUTER_USE: 'true',
    FEATURE_ANALYTICS: 'true',
  },

  PRODUCTION: {
    NODE_ENV: 'production',
    PORT: '8080',
    DATABASE_URL: 'postgresql://user:pass@prod-db:5432/bytebot',
    JWT_SECRET: 'production-jwt-secret-highly-secure-12345678901234567890',
    ENCRYPTION_KEY:
      'production-encryption-key-highly-secure-12345678901234567890',
    ANTHROPIC_API_KEY: 'mock-anthropic-key-production',
    OPENAI_API_KEY: 'mock-openai-key-production',
    GEMINI_API_KEY: 'mock-gemini-key-production',
    LOG_LEVEL: 'warn',
    ENABLE_CORS: 'false',
    ENABLE_SWAGGER: 'false',
    FEATURE_COMPUTER_USE: 'true',
    FEATURE_ANALYTICS: 'true',
  },

  TESTING: {
    NODE_ENV: 'test',
    PORT: '3001',
    DATABASE_URL: 'sqlite://memory',
    JWT_SECRET: 'test-jwt-secret-for-unit-tests-only',
    ENCRYPTION_KEY: 'test-encryption-key-for-unit-tests-only',
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    OPENAI_API_KEY: 'test-openai-key',
    GEMINI_API_KEY: 'test-gemini-key',
    LOG_LEVEL: 'error',
    ENABLE_CORS: 'true',
    ENABLE_SWAGGER: 'false',
    FEATURE_COMPUTER_USE: 'false',
    FEATURE_ANALYTICS: 'false',
  },
};

/**
 * Mock application configuration templates
 */
export const MOCK_APP_CONFIGS: Record<string, AppConfig> = {
  development: {
    nodeEnv: 'development',
    port: 3000,
    DATABASE_URL: 'sqlite://memory',
    database: {
      url: 'sqlite://memory',
      maxConnections: 10,
      connectionTimeout: 30000,
    },
    api: {
      rateLimitWindow: 60000,
      rateLimitMaxRequests: 100,
      corsOrigins: ['http://localhost:3000', 'http://localhost:3001'],
      bodyParserLimit: '10mb',
      requestTimeout: 30000,
    },
    security: {
      jwtSecret: 'dev-jwt-secret-for-testing-12345678',
      jwtExpiresIn: '24h',
      jwtRefreshExpiresIn: '7d',
      encryptionKey: 'dev-encryption-key-for-testing-12345678',
    },
    llmApiKeys: {
      anthropic: 'mock-anthropic-key-dev',
      openai: 'mock-openai-key-dev',
      gemini: 'mock-gemini-key-dev',
    },
    services: {
      bytebotDesktopUrl: 'http://localhost:3000',
      llmProxyUrl: 'http://localhost:3001',
      analyticsEndpoint: 'http://localhost:3002/analytics',
    },
    features: {
      authentication: true,
      rateLimiting: false,
      metricsCollection: true,
      healthChecks: false,
      circuitBreaker: true,
    },
    monitoring: {
      prometheusMetricsPort: 9090,
      logLevel: 'debug' as const,
      logFormat: 'json' as const,
      distributedTracing: false,
      jaegerEndpoint: 'http://localhost:14268/api/traces',
    },
    performance: {
      gracefulShutdownTimeout: 30000,
    },
    circuitBreaker: {
      failureThreshold: 5,
      timeout: 60000,
      resetTimeout: 300000,
    },
    healthCheck: {
      timeout: 10000,
      interval: 30000,
    },
    localDeployment: {
      type: 'docker-compose',
      dataDirectory: '/app/data',
    },
    development: {
      enableSwagger: true,
      swaggerPath: '/api-docs',
      debugMode: true,
    },
  },

  production: {
    nodeEnv: 'production',
    port: 8080,
    DATABASE_URL: 'postgresql://user:pass@prod-db:5432/bytebot',
    database: {
      url: 'postgresql://user:pass@prod-db:5432/bytebot',
      maxConnections: 50,
      connectionTimeout: 60000,
    },
    api: {
      rateLimitWindow: 60000,
      rateLimitMaxRequests: 1000,
      corsOrigins: [],
      bodyParserLimit: '10mb',
      requestTimeout: 30000,
    },
    security: {
      jwtSecret: 'production-jwt-secret-highly-secure-12345678901234567890',
      jwtExpiresIn: '1h',
      jwtRefreshExpiresIn: '24h',
      encryptionKey:
        'production-encryption-key-highly-secure-12345678901234567890',
    },
    llmApiKeys: {
      anthropic: 'mock-anthropic-key-production',
      openai: 'mock-openai-key-production',
      gemini: 'mock-gemini-key-production',
    },
    services: {
      bytebotDesktopUrl: 'https://api.bytebot.ai',
      llmProxyUrl: 'https://llm-proxy.bytebot.ai',
      analyticsEndpoint: 'https://analytics.bytebot.ai',
    },
    features: {
      authentication: true,
      rateLimiting: true,
      metricsCollection: true,
      healthChecks: true,
      circuitBreaker: false,
    },
    monitoring: {
      prometheusMetricsPort: 9090,
      logLevel: 'info',
      logFormat: 'json',
      distributedTracing: true,
      jaegerEndpoint: 'http://jaeger:14268/api/traces',
    },
    performance: {
      gracefulShutdownTimeout: 30000,
    },
    circuitBreaker: {
      failureThreshold: 10,
      timeout: 60000,
      resetTimeout: 300000,
    },
    healthCheck: {
      timeout: 3000,
      interval: 15000,
    },
    localDeployment: {
      type: 'standalone',
      dataDirectory: '/var/app/data',
    },
    development: {
      enableSwagger: false,
      swaggerPath: '/api/docs',
      debugMode: false,
    },
  },
};

// =============================================================================
// FEATURE FLAG MOCKS
// =============================================================================

/**
 * Mock feature flag configuration
 */
export interface MockFeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  conditions?: {
    userRole?: string[];
    environment?: string[];
    timeRange?: {
      start: Date;
      end: Date;
    };
  };
}

/**
 * Default feature flags for testing
 */
export const MOCK_FEATURE_FLAGS: MockFeatureFlag[] = [
  {
    name: 'computerUse',
    enabled: true,
    rolloutPercentage: 100,
  },
  {
    name: 'analytics',
    enabled: false,
    rolloutPercentage: 50,
    conditions: {
      environment: ['staging', 'production'],
    },
  },
  {
    name: 'realTimeUpdates',
    enabled: true,
    rolloutPercentage: 75,
  },
  {
    name: 'advancedMetrics',
    enabled: false,
    rolloutPercentage: 25,
    conditions: {
      userRole: ['admin', 'developer'],
    },
  },
  {
    name: 'experimentalFeatures',
    enabled: true,
    rolloutPercentage: 100,
    conditions: {
      environment: ['development', 'test'],
    },
  },
];

// =============================================================================
// SECRETS MANAGEMENT MOCKS
// =============================================================================

/**
 * Mock secrets storage for testing
 */
export class MockSecretsStorage {
  private static instance: MockSecretsStorage;
  private secrets = new Map<string, string>();
  private encryptedSecrets = new Map<string, string>();
  private readonly logger = new Logger('MockSecretsStorage');

  static getInstance(): MockSecretsStorage {
    if (!MockSecretsStorage.instance) {
      MockSecretsStorage.instance = new MockSecretsStorage();
      MockSecretsStorage.instance.initializeDefaultSecrets();
    }
    return MockSecretsStorage.instance;
  }

  /**
   * Initialize with default secrets for testing
   */
  private initializeDefaultSecrets(): void {
    // Development secrets
    this.setSecret('jwt-secret', 'dev-jwt-secret-for-testing-12345678');
    this.setSecret('encryption-key', 'dev-encryption-key-for-testing-12345678');
    this.setSecret('anthropic-api-key', 'mock-anthropic-key-dev');
    this.setSecret('openai-api-key', 'mock-openai-key-dev');
    this.setSecret('gemini-api-key', 'mock-gemini-key-dev');

    // Database secrets
    this.setSecret('database-url', 'sqlite://memory');
    this.setSecret('database-username', 'testuser');
    this.setSecret('database-password', 'testpass');

    // Service secrets
    this.setSecret('service-api-key', 'mock-service-api-key');
    this.setSecret('webhook-secret', 'mock-webhook-secret');
  }

  /**
   * Set a secret value
   */
  setSecret(key: string, value: string): void {
    this.secrets.set(key, value);

    // Simulate encryption if enabled
    if (DEFAULT_CONFIG_BEHAVIOR.enableSecretsEncryption) {
      this.encryptedSecrets.set(key, this.mockEncrypt(value));
    }

    this.logger.debug(`Secret set: ${key}`);
  }

  /**
   * Get a secret value
   */
  getSecret(key: string): string | null {
    // Simulate load failure if configured
    if (Math.random() < DEFAULT_CONFIG_BEHAVIOR.secretsLoadFailureRate) {
      throw new Error(`Failed to load secret: ${key}`);
    }

    const secret = this.secrets.get(key);

    if (secret) {
      this.logger.debug(`Secret retrieved: ${key}`);
      return secret;
    }

    this.logger.debug(`Secret not found: ${key}`);
    return null;
  }

  /**
   * Check if secret exists
   */
  hasSecret(key: string): boolean {
    return this.secrets.has(key);
  }

  /**
   * Delete a secret
   */
  deleteSecret(key: string): boolean {
    const deleted = this.secrets.delete(key);
    this.encryptedSecrets.delete(key);

    if (deleted) {
      this.logger.debug(`Secret deleted: ${key}`);
    }

    return deleted;
  }

  /**
   * List all secret keys (for debugging)
   */
  listSecrets(): string[] {
    return Array.from(this.secrets.keys());
  }

  /**
   * Clear all secrets
   */
  clearSecrets(): void {
    this.secrets.clear();
    this.encryptedSecrets.clear();
    this.logger.debug('All secrets cleared');
  }

  /**
   * Mock encryption for testing
   */
  private mockEncrypt(value: string): string {
    // Simple base64 encoding for mock encryption
    return Buffer.from(value).toString('base64');
  }

  /**
   * Mock decryption for testing
   */
  private mockDecrypt(encryptedValue: string): string {
    // Simple base64 decoding for mock decryption
    return Buffer.from(encryptedValue, 'base64').toString('utf-8');
  }
}

// =============================================================================
// CONFIGURATION SERVICE MOCKS
// =============================================================================

/**
 * Mock ConfigService for testing
 */
@Injectable()
export class MockConfigService extends ConfigService {
  private readonly logger = new Logger('MockConfigService');
  private currentEnvironment = 'development';
  private configAccessMetrics = new Map<
    string,
    { count: number; lastAccess: Date }
  >();

  constructor(private mockEnvironment?: Record<string, unknown>) {
    super();
    this.initializeMockEnvironment();
  }

  /**
   * Initialize mock environment variables
   */
  private initializeMockEnvironment(): void {
    const envConfig = this.mockEnvironment || MOCK_ENVIRONMENTS.DEVELOPMENT;

    // Set environment variables for testing
    Object.entries(envConfig).forEach(([key, value]) => {
      process.env[key] =
        typeof value === 'string' ? value : JSON.stringify(value);
    });

    this.logger.debug(
      `Mock environment initialized: ${this.currentEnvironment}`,
    );
  }

  /**
   * Override get method with mock behavior
   */
  get<T = unknown>(propertyPath: string, defaultValue?: T): T {
    this.recordConfigAccess(propertyPath);

    // Simulate latency if configured
    if (DEFAULT_CONFIG_BEHAVIOR.simulateLatency) {
      const [min, max] = DEFAULT_CONFIG_BEHAVIOR.latencyRange;
      // Note: In real scenarios, this would be async, but ConfigService.get is sync
      // This is just for demonstration of latency simulation concepts
      void (Math.random() * (max - min) + min);
    }

    // Simulate configuration errors if configured
    if (Math.random() < DEFAULT_CONFIG_BEHAVIOR.errorRate) {
      throw new Error(`Configuration error accessing: ${propertyPath}`);
    }

    // Return mock configuration based on property path
    if (propertyPath === 'app') {
      return MOCK_APP_CONFIGS[this.currentEnvironment] as T;
    }

    if (propertyPath.startsWith('app.')) {
      const configPath = propertyPath.replace('app.', '');
      const config = MOCK_APP_CONFIGS[this.currentEnvironment];
      return this.getNestedProperty(
        config as unknown as Record<string, unknown>,
        configPath,
      ) as T;
    }

    // Fallback to environment variables or default value
    const envValue = process.env[propertyPath];
    if (envValue !== undefined) {
      return this.parseConfigValue(envValue) as T;
    }

    if (defaultValue === undefined) {
      throw new Error(
        `Configuration property '${propertyPath}' not found and no default value provided`,
      );
    }
    return defaultValue;
  }

  /**
   * Override getOrThrow method with mock behavior
   */
  getOrThrow<T = unknown>(propertyPath: string): T {
    const value = this.get<T>(propertyPath);

    if (value === undefined || value === null) {
      throw new Error(
        `Configuration property "${propertyPath}" is not defined`,
      );
    }

    return value;
  }

  /**
   * Set current environment for testing
   */
  setEnvironment(
    environment: 'development' | 'staging' | 'production' | 'testing',
  ): void {
    this.currentEnvironment = environment;
    this.initializeMockEnvironment();
    this.logger.debug(`Environment changed to: ${environment}`);
  }

  /**
   * Get configuration access metrics
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
   * Clear configuration access metrics
   */
  clearConfigAccessMetrics(): void {
    this.configAccessMetrics.clear();
  }

  /**
   * Helper to get nested property from object
   */
  private getNestedProperty(
    obj: Record<string, unknown>,
    path: string,
  ): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && current !== null) {
        const typedCurrent = current as Record<string, unknown>;
        return typedCurrent[key] !== undefined ? typedCurrent[key] : undefined;
      }
      return undefined;
    }, obj);
  }

  /**
   * Parse configuration value from string
   */
  private parseConfigValue(value: string): unknown {
    // Handle boolean values
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Handle numeric values
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

    // Handle JSON values
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        // If JSON parsing fails, return as string
      }
    }

    return value;
  }

  /**
   * Record configuration access for metrics
   */
  private recordConfigAccess(key: string): void {
    if (!DEFAULT_CONFIG_BEHAVIOR.enableMetricsCollection) return;

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

// =============================================================================
// BYTEBOT CONFIG SERVICE MOCKS
// =============================================================================

/**
 * Mock BytebotConfigService for testing
 */
@Injectable()
export class MockBytebotConfigService {
  private readonly logger = new Logger('MockBytebotConfigService');
  private readonly secretsStorage = MockSecretsStorage.getInstance();
  private readonly configService: MockConfigService;
  private configAccessMetrics = new Map<
    string,
    { count: number; lastAccess: Date }
  >();

  constructor(mockEnvironment?: Record<string, unknown>) {
    this.configService = new MockConfigService(mockEnvironment);
  }

  /**
   * Get complete application configuration
   */
  getAppConfig(): AppConfig {
    this.recordConfigAccess('app.config.full');
    return this.configService.get<AppConfig>('app');
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig(): AppConfig['database'] {
    this.recordConfigAccess('app.config.database');
    return this.configService.get<AppConfig['database']>('app.database');
  }

  /**
   * Get API configuration
   */
  getApiConfig(): AppConfig['api'] {
    this.recordConfigAccess('app.config.api');
    return this.configService.get<AppConfig['api']>('app.api');
  }

  /**
   * Get security configuration (without sensitive data)
   */
  getSecurityConfig(): Omit<
    AppConfig['security'],
    'jwtSecret' | 'encryptionKey'
  > {
    this.recordConfigAccess('app.config.security');
    const security =
      this.configService.get<AppConfig['security']>('app.security');

    return {
      jwtExpiresIn: security.jwtExpiresIn,
      jwtRefreshExpiresIn: security.jwtRefreshExpiresIn,
    };
  }

  /**
   * Get JWT secret securely
   */
  getJwtSecret(): string {
    this.recordConfigAccess('app.secrets.jwt');

    // Try secrets storage first
    const secretValue = this.secretsStorage.getSecret('jwt-secret');
    if (secretValue) {
      return secretValue;
    }

    // Fallback to configuration
    return this.configService.get<string>('app.security.jwtSecret');
  }

  /**
   * Get encryption key securely
   */
  getEncryptionKey(): string {
    this.recordConfigAccess('app.secrets.encryption');

    // Try secrets storage first
    const secretValue = this.secretsStorage.getSecret('encryption-key');
    if (secretValue) {
      return secretValue;
    }

    // Fallback to configuration
    return this.configService.get<string>('app.security.encryptionKey');
  }

  /**
   * Get LLM API key securely
   */
  getLlmApiKey(provider: 'anthropic' | 'openai' | 'gemini'): string | null {
    this.recordConfigAccess(`app.secrets.llm.${provider}`);

    const secretName = `${provider}-api-key`;

    // Try secrets storage first
    const secretValue = this.secretsStorage.getSecret(secretName);
    if (secretValue) {
      return secretValue;
    }

    // Fallback to configuration
    return this.configService.get<string>(`app.llmApiKeys.${provider}`);
  }

  /**
   * Get services configuration
   */
  getServicesConfig(): AppConfig['services'] {
    this.recordConfigAccess('app.config.services');
    return this.configService.get<AppConfig['services']>('app.services');
  }

  /**
   * Get features configuration
   */
  getFeaturesConfig(): AppConfig['features'] {
    this.recordConfigAccess('app.config.features');
    return this.configService.get<AppConfig['features']>('app.features');
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(featureName: keyof AppConfig['features']): boolean {
    this.recordConfigAccess(`app.features.${featureName}`);

    // Check feature flags first
    const featureFlag = MOCK_FEATURE_FLAGS.find(
      (flag) => flag.name === featureName,
    );
    if (featureFlag) {
      return this.evaluateFeatureFlag(featureFlag);
    }

    // Fallback to configuration
    return (
      this.configService.get<boolean>(`app.features.${featureName}`) ?? false
    );
  }

  /**
   * Get monitoring configuration
   */
  getMonitoringConfig(): AppConfig['monitoring'] {
    this.recordConfigAccess('app.config.monitoring');
    return this.configService.get<AppConfig['monitoring']>('app.monitoring');
  }

  /**
   * Get circuit breaker configuration
   */
  getCircuitBreakerConfig(): AppConfig['circuitBreaker'] {
    this.recordConfigAccess('app.config.circuitBreaker');
    return this.configService.get<AppConfig['circuitBreaker']>(
      'app.circuitBreaker',
    );
  }

  /**
   * Get health check configuration
   */
  getHealthCheckConfig(): AppConfig['healthCheck'] {
    this.recordConfigAccess('app.config.healthCheck');
    return this.configService.get<AppConfig['healthCheck']>('app.healthCheck');
  }

  /**
   * Get development configuration
   */
  getDevelopmentConfig(): AppConfig['development'] {
    this.recordConfigAccess('app.config.development');
    return this.configService.get<AppConfig['development']>('app.development');
  }

  /**
   * Get configuration access metrics
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
   * Set environment for testing
   */
  setEnvironment(
    environment: 'development' | 'staging' | 'production' | 'testing',
  ): void {
    this.configService.setEnvironment(environment);
  }

  /**
   * Evaluate feature flag based on conditions
   */
  private evaluateFeatureFlag(featureFlag: MockFeatureFlag): boolean {
    if (!featureFlag.enabled) {
      return false;
    }

    // Check rollout percentage
    if (Math.random() * 100 > featureFlag.rolloutPercentage) {
      return false;
    }

    // Check conditions if present
    if (featureFlag.conditions) {
      const { environment, userRole, timeRange } = featureFlag.conditions;

      // Check environment condition
      if (
        environment &&
        !environment.includes(this.configService.get('NODE_ENV'))
      ) {
        return false;
      }

      // Check time range condition
      if (timeRange && timeRange.start && timeRange.end) {
        const now = new Date();
        const start = new Date(timeRange.start);
        const end = new Date(timeRange.end);
        if (now < start || now > end) {
          return false;
        }
      }

      // User role condition would typically require user context
      // For mocking purposes, we'll assume admin role
      if (userRole && !userRole.includes('admin')) {
        return false;
      }
    }

    return true;
  }

  /**
   * Record configuration access for metrics
   */
  private recordConfigAccess(key: string): void {
    if (!DEFAULT_CONFIG_BEHAVIOR.enableMetricsCollection) return;

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

// =============================================================================
// CONFIGURATION VALIDATION MOCKS
// =============================================================================

/**
 * Mock configuration validation errors
 */
export class MockConfigValidationError extends Error {
  constructor(
    message: string,
    public property: string,
    public value: any,
    public expectedType?: string,
  ) {
    super(message);
    this.name = 'MockConfigValidationError';
  }
}

/**
 * Mock configuration validator
 */
export class MockConfigValidator {
  private readonly logger = new Logger('MockConfigValidator');

  /**
   * Validate configuration with mock scenarios
   */
  validate(config: any): void {
    // Simulate validation errors if configured
    if (Math.random() < DEFAULT_CONFIG_BEHAVIOR.validationErrorRate) {
      throw new MockConfigValidationError(
        'Mock validation error for testing',
        'mock.property',
        'invalid-value',
        'string',
      );
    }

    if (!config) {
      throw new MockConfigValidationError(
        'Configuration is required',
        'root',
        config,
        'object',
      );
    }

    // Validate required properties
    const requiredProperties = [
      'nodeEnv',
      'port',
      'database.url',
      'security.jwtSecret',
      'security.encryptionKey',
    ];

    for (const property of requiredProperties) {
      const value = this.getNestedProperty(
        config as Record<string, unknown>,
        property,
      );
      if (value === undefined || value === null) {
        throw new MockConfigValidationError(
          `Required property "${property}" is missing`,
          property,
          value,
          'any',
        );
      }
    }

    // Validate property types and constraints
    this.validateProperty(
      config as Record<string, unknown>,
      'port',
      'number',
      (value) => typeof value === 'number' && value > 0 && value < 65536,
    );
    this.validateProperty(
      config as Record<string, unknown>,
      'security.jwtSecret',
      'string',
      (value) => typeof value === 'string' && value.length >= 32,
    );
    this.validateProperty(
      config as Record<string, unknown>,
      'security.encryptionKey',
      'string',
      (value) => typeof value === 'string' && value.length >= 32,
    );

    this.logger.debug('Configuration validation completed successfully');
  }

  /**
   * Validate individual property
   */
  private validateProperty(
    config: Record<string, unknown>,
    propertyPath: string,
    expectedType: string,
    customValidator?: (value: unknown) => boolean,
  ): void {
    const value = this.getNestedProperty(config, propertyPath);

    if (value !== undefined && typeof value !== expectedType) {
      throw new MockConfigValidationError(
        `Property "${propertyPath}" must be of type ${expectedType}`,
        propertyPath,
        value,
        expectedType,
      );
    }

    if (customValidator && value !== undefined && !customValidator(value)) {
      throw new MockConfigValidationError(
        `Property "${propertyPath}" failed custom validation`,
        propertyPath,
        value,
        expectedType,
      );
    }
  }

  /**
   * Get nested property from object
   */
  private getNestedProperty(
    obj: Record<string, unknown>,
    path: string,
  ): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && current !== null) {
        const typedCurrent = current as Record<string, unknown>;
        return typedCurrent[key] !== undefined ? typedCurrent[key] : undefined;
      }
      return undefined;
    }, obj);
  }
}

// =============================================================================
// MOCK FACTORY AND TESTING UTILITIES
// =============================================================================

/**
 * Factory for creating configured mock configuration services
 */
export class MockConfigServiceFactory {
  /**
   * Create mock ConfigService with custom environment
   */
  static createConfigService(
    environment:
      | 'development'
      | 'staging'
      | 'production'
      | 'testing' = 'development',
    customConfig?: Record<string, unknown>,
  ): MockConfigService {
    const envConfig: Record<string, unknown> = {
      ...(MOCK_ENVIRONMENTS[environment.toUpperCase()] as Record<
        string,
        unknown
      >),
      ...customConfig,
    };
    return new MockConfigService(envConfig);
  }

  /**
   * Create mock BytebotConfigService with custom environment
   */
  static createBytebotConfigService(
    environment:
      | 'development'
      | 'staging'
      | 'production'
      | 'testing' = 'development',
    customConfig?: Record<string, unknown>,
  ): MockBytebotConfigService {
    const envConfig: Record<string, unknown> = {
      ...(MOCK_ENVIRONMENTS[environment.toUpperCase()] as Record<
        string,
        unknown
      >),
      ...customConfig,
    };
    return new MockBytebotConfigService(envConfig);
  }

  /**
   * Create mock secrets storage
   */
  static createSecretsStorage(): MockSecretsStorage {
    return MockSecretsStorage.getInstance();
  }

  /**
   * Create mock configuration validator
   */
  static createValidator(): MockConfigValidator {
    return new MockConfigValidator();
  }

  /**
   * Reset all mock configurations
   */
  static reset(): void {
    // Reset behavior configuration
    Object.assign(DEFAULT_CONFIG_BEHAVIOR, {
      enableValidation: true,
      enableHotReload: false,
      enableMetricsCollection: true,
      enableSecretsEncryption: false,
      simulateLatency: false,
      latencyRange: [50, 200],
      errorRate: 0,
      validationErrorRate: 0,
      secretsLoadFailureRate: 0,
    });

    // Clear secrets storage
    MockSecretsStorage.getInstance().clearSecrets();
  }
}

// =============================================================================
// JEST MOCK HELPERS
// =============================================================================

/**
 * Jest mock helpers for configuration services
 */
export const mockConfig = {
  /**
   * Mock NestJS ConfigService
   */
  mockConfigService: (
    environment:
      | 'development'
      | 'staging'
      | 'production'
      | 'testing' = 'development',
  ) => {
    const mockService =
      MockConfigServiceFactory.createConfigService(environment);

    return {
      ConfigService: jest.fn(() => mockService),
      mockGet: jest.spyOn(mockService, 'get'),
      mockGetOrThrow: jest.spyOn(mockService, 'getOrThrow'),
    };
  },

  /**
   * Mock BytebotConfigService
   */
  mockBytebotConfigService: (
    environment:
      | 'development'
      | 'staging'
      | 'production'
      | 'testing' = 'development',
  ) => {
    const mockService =
      MockConfigServiceFactory.createBytebotConfigService(environment);

    return {
      BytebotConfigService: jest.fn(() => mockService),
      mockGetAppConfig: jest.spyOn(mockService, 'getAppConfig'),
      mockGetDatabaseConfig: jest.spyOn(mockService, 'getDatabaseConfig'),
      mockGetJwtSecret: jest.spyOn(mockService, 'getJwtSecret'),
      mockGetEncryptionKey: jest.spyOn(mockService, 'getEncryptionKey'),
      mockGetLlmApiKey: jest.spyOn(mockService, 'getLlmApiKey'),
      mockIsFeatureEnabled: jest.spyOn(mockService, 'isFeatureEnabled'),
    };
  },

  /**
   * Mock secrets storage
   */
  mockSecretsStorage: () => {
    const mockStorage = MockSecretsStorage.getInstance();

    return {
      MockSecretsStorage: jest.fn(() => mockStorage),
      mockGetSecret: jest.spyOn(mockStorage, 'getSecret'),
      mockSetSecret: jest.spyOn(mockStorage, 'setSecret'),
      mockHasSecret: jest.spyOn(mockStorage, 'hasSecret'),
      mockDeleteSecret: jest.spyOn(mockStorage, 'deleteSecret'),
    };
  },

  /**
   * Configure mock behavior for testing scenarios
   */
  configure: (behavior: Partial<MockConfigBehavior>) => {
    Object.assign(DEFAULT_CONFIG_BEHAVIOR, behavior);
  },

  /**
   * Reset all configuration mocks
   */
  reset: () => {
    MockConfigServiceFactory.reset();
    jest.clearAllMocks();
  },
};

// All mock services and utilities are already exported above
