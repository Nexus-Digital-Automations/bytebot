/**
 * Configuration Schema Validation - Runtime configuration validation with detailed error reporting
 * Provides JSON Schema validation for configuration objects with environment-specific rules
 *
 * Features:
 * - JSON Schema-based validation for better IDE support and documentation
 * - Environment-specific validation rules and constraints
 * - Detailed error messages with fix suggestions
 * - Production security validation requirements
 * - Configuration migration and upgrade support
 *
 * @author Infrastructure & Configuration Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

// Using basic JSON Schema type definition instead of AJV for compatibility
interface JSONSchemaType<T> {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: any;
}
import { AppConfig } from './configuration';

/**
 * Complete application configuration JSON Schema
 * Defines the structure and validation rules for all configuration
 */
export const appConfigSchema: JSONSchemaType<AppConfig> = {
  type: 'object',
  properties: {
    nodeEnv: {
      type: 'string',
      enum: ['development', 'staging', 'production', 'test'],
      description: 'Application environment mode',
    },

    port: {
      type: 'integer',
      minimum: 1,
      maximum: 65535,
      description: 'HTTP server port number',
    },

    database: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          pattern: '^postgresql://.*',
          description: 'PostgreSQL connection string',
        },
        maxConnections: {
          type: 'integer',
          minimum: 1,
          maximum: 1000,
          description: 'Maximum database connections in pool',
        },
        connectionTimeout: {
          type: 'integer',
          minimum: 1000,
          maximum: 300000,
          description: 'Database connection timeout in milliseconds',
        },
      },
      required: ['url', 'maxConnections', 'connectionTimeout'],
      additionalProperties: false,
    },

    api: {
      type: 'object',
      properties: {
        rateLimitWindow: {
          type: 'integer',
          minimum: 1000,
          maximum: 3600000,
          description: 'Rate limiting window in milliseconds',
        },
        rateLimitMaxRequests: {
          type: 'integer',
          minimum: 1,
          maximum: 10000,
          description: 'Maximum requests per rate limit window',
        },
        corsOrigins: {
          oneOf: [
            { type: 'string' },
            {
              type: 'array',
              items: { type: 'string', format: 'uri' },
            },
          ],
          description: 'CORS allowed origins',
        },
        bodyParserLimit: {
          type: 'string',
          pattern: '^\\d+(kb|mb|gb)$',
          description: 'Request body size limit',
        },
        requestTimeout: {
          type: 'integer',
          minimum: 1000,
          maximum: 300000,
          description: 'Request timeout in milliseconds',
        },
      },
      required: [
        'rateLimitWindow',
        'rateLimitMaxRequests',
        'corsOrigins',
        'bodyParserLimit',
        'requestTimeout',
      ],
      additionalProperties: false,
    },

    security: {
      type: 'object',
      properties: {
        jwtSecret: {
          type: 'string',
          minLength: 32,
          description: 'JWT signing secret (minimum 32 characters)',
        },
        jwtExpiresIn: {
          type: 'string',
          pattern: '^\\d+(s|m|h|d)$',
          description: 'JWT token expiration time',
        },
        jwtRefreshExpiresIn: {
          type: 'string',
          pattern: '^\\d+(s|m|h|d)$',
          description: 'JWT refresh token expiration time',
        },
        encryptionKey: {
          type: 'string',
          minLength: 32,
          description: 'Data encryption key (minimum 32 characters)',
        },
      },
      required: [
        'jwtSecret',
        'jwtExpiresIn',
        'jwtRefreshExpiresIn',
        'encryptionKey',
      ],
      additionalProperties: false,
    },

    llmApiKeys: {
      type: 'object',
      properties: {
        anthropic: {
          type: 'string',
          nullable: true,
          pattern: '^sk-ant-',
          description: 'Anthropic API key',
        },
        openai: {
          type: 'string',
          nullable: true,
          pattern: '^sk-',
          description: 'OpenAI API key',
        },
        gemini: {
          type: 'string',
          nullable: true,
          description: 'Google Gemini API key',
        },
      },
      additionalProperties: false,
    },

    services: {
      type: 'object',
      properties: {
        bytebotDesktopUrl: {
          type: 'string',
          format: 'uri',
          description: 'Bytebot Desktop service URL',
        },
        llmProxyUrl: {
          type: 'string',
          nullable: true,
          format: 'uri',
          description: 'LLM Proxy service URL',
        },
        analyticsEndpoint: {
          type: 'string',
          nullable: true,
          format: 'uri',
          description: 'Analytics service endpoint URL',
        },
      },
      required: ['bytebotDesktopUrl'],
      additionalProperties: false,
    },

    features: {
      type: 'object',
      properties: {
        authentication: {
          type: 'boolean',
          description: 'Enable JWT authentication',
        },
        rateLimiting: {
          type: 'boolean',
          description: 'Enable API rate limiting',
        },
        metricsCollection: {
          type: 'boolean',
          description: 'Enable Prometheus metrics collection',
        },
        healthChecks: {
          type: 'boolean',
          description: 'Enable health check endpoints',
        },
        circuitBreaker: {
          type: 'boolean',
          description: 'Enable circuit breaker pattern',
        },
      },
      required: [
        'authentication',
        'rateLimiting',
        'metricsCollection',
        'healthChecks',
        'circuitBreaker',
      ],
      additionalProperties: false,
    },

    monitoring: {
      type: 'object',
      properties: {
        prometheusMetricsPort: {
          type: 'integer',
          minimum: 1,
          maximum: 65535,
          description: 'Prometheus metrics server port',
        },
        logLevel: {
          type: 'string',
          enum: ['error', 'warn', 'info', 'debug', 'verbose'],
          description: 'Application log level',
        },
        logFormat: {
          type: 'string',
          enum: ['json', 'text'],
          description: 'Log output format',
        },
        distributedTracing: {
          type: 'boolean',
          description: 'Enable distributed tracing',
        },
        jaegerEndpoint: {
          type: 'string',
          nullable: true,
          format: 'uri',
          description: 'Jaeger tracing endpoint URL',
        },
      },
      required: [
        'prometheusMetricsPort',
        'logLevel',
        'logFormat',
        'distributedTracing',
      ],
      additionalProperties: false,
    },

    performance: {
      type: 'object',
      properties: {
        gracefulShutdownTimeout: {
          type: 'integer',
          minimum: 1000,
          maximum: 300000,
          description: 'Graceful shutdown timeout in milliseconds',
        },
      },
      required: ['gracefulShutdownTimeout'],
      additionalProperties: false,
    },

    circuitBreaker: {
      type: 'object',
      properties: {
        failureThreshold: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          description: 'Failure percentage threshold for circuit breaker',
        },
        timeout: {
          type: 'integer',
          minimum: 1000,
          maximum: 300000,
          description: 'Circuit breaker timeout in milliseconds',
        },
        resetTimeout: {
          type: 'integer',
          minimum: 1000,
          maximum: 300000,
          description: 'Circuit breaker reset timeout in milliseconds',
        },
      },
      required: ['failureThreshold', 'timeout', 'resetTimeout'],
      additionalProperties: false,
    },

    healthCheck: {
      type: 'object',
      properties: {
        timeout: {
          type: 'integer',
          minimum: 1000,
          maximum: 60000,
          description: 'Health check timeout in milliseconds',
        },
        interval: {
          type: 'integer',
          minimum: 5000,
          maximum: 300000,
          description: 'Health check interval in milliseconds',
        },
      },
      required: ['timeout', 'interval'],
      additionalProperties: false,
    },

    kubernetes: {
      type: 'object',
      properties: {
        namespace: {
          type: 'string',
          pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
          description: 'Kubernetes namespace',
        },
        serviceName: {
          type: 'string',
          pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$',
          description: 'Kubernetes service name',
        },
      },
      required: ['namespace', 'serviceName'],
      additionalProperties: false,
    },

    development: {
      type: 'object',
      properties: {
        enableSwagger: {
          type: 'boolean',
          description: 'Enable Swagger API documentation',
        },
        swaggerPath: {
          type: 'string',
          pattern: '^/.*',
          description: 'Swagger documentation path',
        },
        debugMode: {
          type: 'boolean',
          description: 'Enable debug features and verbose logging',
        },
      },
      required: ['enableSwagger', 'swaggerPath', 'debugMode'],
      additionalProperties: false,
    },
  },
  required: [
    'nodeEnv',
    'port',
    'database',
    'api',
    'security',
    'llmApiKeys',
    'services',
    'features',
    'monitoring',
    'performance',
    'circuitBreaker',
    'healthCheck',
    'kubernetes',
    'development',
  ],
  additionalProperties: false,
};

/**
 * Production-specific configuration schema
 * Applies stricter validation rules for production environments
 */
export const productionConfigSchema: JSONSchemaType<AppConfig> = {
  ...appConfigSchema,
  properties: {
    ...appConfigSchema.properties,

    nodeEnv: {
      type: 'string',
      const: 'production',
      description: 'Must be production environment',
    },

    security: {
      ...appConfigSchema.properties.security,
      properties: {
        ...appConfigSchema.properties.security.properties,
        jwtSecret: {
          ...appConfigSchema.properties.security.properties.jwtSecret,
          minLength: 64,
          description:
            'JWT signing secret (minimum 64 characters in production)',
        },
        encryptionKey: {
          ...appConfigSchema.properties.security.properties.encryptionKey,
          minLength: 64,
          description:
            'Data encryption key (minimum 64 characters in production)',
        },
        jwtExpiresIn: {
          ...appConfigSchema.properties.security.properties.jwtExpiresIn,
          pattern: '^(15m|30m|1h)$',
          description:
            'JWT expiration must be short in production (15m, 30m, or 1h)',
        },
      },
    },

    features: {
      ...appConfigSchema.properties.features,
      properties: {
        ...appConfigSchema.properties.features.properties,
        authentication: {
          ...appConfigSchema.properties.features.properties.authentication,
          const: true,
          description: 'Authentication must be enabled in production',
        },
        rateLimiting: {
          ...appConfigSchema.properties.features.properties.rateLimiting,
          const: true,
          description: 'Rate limiting must be enabled in production',
        },
        metricsCollection: {
          ...appConfigSchema.properties.features.properties.metricsCollection,
          const: true,
          description: 'Metrics collection must be enabled in production',
        },
        healthChecks: {
          ...appConfigSchema.properties.features.properties.healthChecks,
          const: true,
          description: 'Health checks must be enabled in production',
        },
      },
    },

    development: {
      ...appConfigSchema.properties.development,
      properties: {
        ...appConfigSchema.properties.development.properties,
        enableSwagger: {
          ...appConfigSchema.properties.development.properties.enableSwagger,
          const: false,
          description: 'Swagger must be disabled in production',
        },
        debugMode: {
          ...appConfigSchema.properties.development.properties.debugMode,
          const: false,
          description: 'Debug mode must be disabled in production',
        },
      },
    },

    monitoring: {
      ...appConfigSchema.properties.monitoring,
      properties: {
        ...appConfigSchema.properties.monitoring.properties,
        logLevel: {
          ...appConfigSchema.properties.monitoring.properties.logLevel,
          enum: ['error', 'warn'],
          description: 'Log level must be error or warn in production',
        },
        logFormat: {
          ...appConfigSchema.properties.monitoring.properties.logFormat,
          const: 'json',
          description: 'Log format must be JSON in production',
        },
      },
    },
  },

  // Custom validation for production
  if: {
    properties: {
      features: {
        properties: {
          authentication: { const: true },
        },
      },
    },
  },
  then: {
    anyOf: [
      {
        properties: {
          llmApiKeys: {
            properties: {
              anthropic: { type: 'string', minLength: 1 },
            },
            required: ['anthropic'],
          },
        },
      },
      {
        properties: {
          llmApiKeys: {
            properties: {
              openai: { type: 'string', minLength: 1 },
            },
            required: ['openai'],
          },
        },
      },
      {
        properties: {
          llmApiKeys: {
            properties: {
              gemini: { type: 'string', minLength: 1 },
            },
            required: ['gemini'],
          },
        },
      },
    ],
    errorMessage: 'At least one LLM API key must be configured in production',
  },
};

/**
 * Development-specific configuration schema
 * Applies relaxed validation rules for development environments
 */
export const developmentConfigSchema: JSONSchemaType<AppConfig> = {
  ...appConfigSchema,
  properties: {
    ...appConfigSchema.properties,

    security: {
      ...appConfigSchema.properties.security,
      properties: {
        ...appConfigSchema.properties.security.properties,
        jwtSecret: {
          ...appConfigSchema.properties.security.properties.jwtSecret,
          minLength: 16,
          description:
            'JWT signing secret (minimum 16 characters in development)',
        },
        encryptionKey: {
          ...appConfigSchema.properties.security.properties.encryptionKey,
          minLength: 16,
          description:
            'Data encryption key (minimum 16 characters in development)',
        },
      },
    },

    llmApiKeys: {
      type: 'object',
      properties: {
        anthropic: {
          type: 'string',
          nullable: true,
          description: 'Anthropic API key (optional in development)',
        },
        openai: {
          type: 'string',
          nullable: true,
          description: 'OpenAI API key (optional in development)',
        },
        gemini: {
          type: 'string',
          nullable: true,
          description: 'Google Gemini API key (optional in development)',
        },
      },
      additionalProperties: false,
    },
  },
};

/**
 * Configuration validation error types
 */
export interface ConfigValidationError {
  field: string;
  message: string;
  value?: any;
  suggestion?: string;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationError[];
  config?: AppConfig;
}

/**
 * Environment-specific schema mapping
 */
export const environmentSchemas = {
  development: developmentConfigSchema,
  staging: appConfigSchema,
  production: productionConfigSchema,
  test: developmentConfigSchema,
} as const;

/**
 * Configuration migration rules for version upgrades
 */
export interface ConfigMigration {
  fromVersion: string;
  toVersion: string;
  migrations: Array<{
    path: string;
    action: 'rename' | 'move' | 'transform' | 'add' | 'remove';
    from?: string;
    to?: string;
    defaultValue?: any;
    transformer?: (value: any) => any;
  }>;
}

/**
 * Configuration migrations for version compatibility
 */
export const configMigrations: ConfigMigration[] = [
  {
    fromVersion: '1.0.0',
    toVersion: '1.1.0',
    migrations: [
      {
        path: 'monitoring.prometheusPort',
        action: 'rename',
        to: 'monitoring.prometheusMetricsPort',
      },
      {
        path: 'security.sessionSecret',
        action: 'rename',
        to: 'security.jwtSecret',
      },
      {
        path: 'features.healthChecks',
        action: 'add',
        defaultValue: true,
      },
    ],
  },
  {
    fromVersion: '1.1.0',
    toVersion: '1.2.0',
    migrations: [
      {
        path: 'circuitBreaker',
        action: 'add',
        defaultValue: {
          failureThreshold: 50,
          timeout: 60000,
          resetTimeout: 30000,
        },
      },
      {
        path: 'kubernetes',
        action: 'add',
        defaultValue: {
          namespace: 'default',
          serviceName: 'bytebot-agent',
        },
      },
    ],
  },
];

/**
 * Security validation rules for sensitive configuration
 */
export const securityValidationRules = {
  jwtSecret: {
    minLength: 32,
    productionMinLength: 64,
    mustNotContain: ['password', 'secret', 'key', '123'],
    entropyCheck: true,
  },
  encryptionKey: {
    minLength: 32,
    productionMinLength: 64,
    mustBeHex: false,
    entropyCheck: true,
  },
  databaseUrl: {
    mustUseSSL: true,
    allowedHosts: [],
    forbiddenHosts: ['localhost', '127.0.0.1'],
  },
} as const;

/**
 * Performance validation rules
 */
export const performanceValidationRules = {
  database: {
    maxConnections: {
      development: 10,
      staging: 25,
      production: 50,
      warning: 100,
    },
    connectionTimeout: {
      minimum: 5000,
      maximum: 60000,
      recommended: 30000,
    },
  },
  api: {
    requestTimeout: {
      minimum: 5000,
      maximum: 300000,
      recommended: 30000,
    },
    rateLimitMaxRequests: {
      development: 1000,
      staging: 200,
      production: 100,
    },
  },
} as const;
