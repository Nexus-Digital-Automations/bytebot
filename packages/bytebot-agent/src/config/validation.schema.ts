/**
 * Configuration Validation Schema - Enterprise-grade validation rules for Bytebot configuration
 * Provides comprehensive validation schemas using Joi for all configuration options
 *
 * Features:
 * - Environment-specific validation rules
 * - Security-focused validation for production environments
 * - Performance optimizations for development environments
 * - Custom validation messages for better debugging
 *
 * @author Configuration & Secrets Management Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import * as Joi from 'joi';

/**
 * Environment validation schema
 * Validates NODE_ENV and applies environment-specific rules
 */
export const environmentSchema = Joi.string()
  .valid('development', 'staging', 'production', 'test')
  .default('development')
  .messages({
    'any.only':
      'NODE_ENV must be one of: development, staging, production, test',
  });

/**
 * Database configuration validation schema
 * Validates database connection parameters and security settings
 */
export const databaseSchema = Joi.object({
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required()
    .messages({
      'string.uri': 'DATABASE_URL must be a valid PostgreSQL connection string',
      'any.required': 'DATABASE_URL is required for database connectivity',
    }),

  DATABASE_MAX_CONNECTIONS: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.min': 'DATABASE_MAX_CONNECTIONS must be at least 1',
      'number.max':
        'DATABASE_MAX_CONNECTIONS must not exceed 100 for stability',
    }),

  DATABASE_CONNECTION_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .max(60000)
    .default(30000)
    .messages({
      'number.min': 'DATABASE_CONNECTION_TIMEOUT must be at least 1000ms',
      'number.max': 'DATABASE_CONNECTION_TIMEOUT must not exceed 60000ms',
    }),
});

/**
 * API configuration validation schema
 * Validates API server settings, rate limiting, and CORS configuration
 */
export const apiSchema = Joi.object({
  PORT: Joi.number().port().default(9991).messages({
    'number.port': 'PORT must be a valid port number (1-65535)',
  }),

  API_RATE_LIMIT_WINDOW: Joi.number()
    .integer()
    .min(1000)
    .max(3600000) // 1 hour max
    .default(900000) // 15 minutes
    .messages({
      'number.min': 'API_RATE_LIMIT_WINDOW must be at least 1000ms (1 second)',
      'number.max': 'API_RATE_LIMIT_WINDOW must not exceed 3600000ms (1 hour)',
    }),

  API_RATE_LIMIT_MAX_REQUESTS: Joi.number()
    .integer()
    .min(1)
    .max(10000)
    .default(100)
    .messages({
      'number.min': 'API_RATE_LIMIT_MAX_REQUESTS must be at least 1',
      'number.max':
        'API_RATE_LIMIT_MAX_REQUESTS must not exceed 10000 for performance',
    }),

  API_CORS_ORIGINS: Joi.alternatives()
    .try(Joi.string(), Joi.array().items(Joi.string().uri()))
    .default('*'),

  BODY_PARSER_LIMIT: Joi.string()
    .pattern(/^\d+(mb|kb|gb)$/i)
    .default('50mb')
    .messages({
      'string.pattern.base':
        'BODY_PARSER_LIMIT must be in format like "50mb", "1gb", etc.',
    }),

  REQUEST_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .max(300000) // 5 minutes max
    .default(30000)
    .messages({
      'number.min': 'REQUEST_TIMEOUT must be at least 1000ms',
      'number.max': 'REQUEST_TIMEOUT must not exceed 300000ms (5 minutes)',
    }),
});

/**
 * Security configuration validation schema
 * Enforces strict security requirements especially for production environments
 */
export const securitySchema = Joi.object({
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET must be at least 32 characters long for security',
    'any.required': 'JWT_SECRET is required for authentication',
  }),

  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+(s|m|h|d)$/)
    .default('15m')
    .messages({
      'string.pattern.base':
        'JWT_EXPIRES_IN must be in format like "15m", "1h", "7d"',
    }),

  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .pattern(/^\d+(s|m|h|d)$/)
    .default('7d')
    .messages({
      'string.pattern.base':
        'JWT_REFRESH_EXPIRES_IN must be in format like "15m", "1h", "7d"',
    }),

  ENCRYPTION_KEY: Joi.string().min(32).required().messages({
    'string.min':
      'ENCRYPTION_KEY must be at least 32 characters long for security',
    'any.required': 'ENCRYPTION_KEY is required for data encryption',
  }),
});

/**
 * LLM API keys validation schema
 * Validates API keys for different LLM providers with optional configuration
 */
export const llmApiKeysSchema = Joi.object({
  ANTHROPIC_API_KEY: Joi.string()
    .pattern(/^sk-ant-/)
    .optional()
    .messages({
      'string.pattern.base': 'ANTHROPIC_API_KEY must start with "sk-ant-"',
    }),

  OPENAI_API_KEY: Joi.string().pattern(/^sk-/).optional().messages({
    'string.pattern.base': 'OPENAI_API_KEY must start with "sk-"',
  }),

  GEMINI_API_KEY: Joi.string().optional(),
});

/**
 * Services configuration validation schema
 * Validates external service URLs and endpoints
 */
export const servicesSchema = Joi.object({
  BYTEBOT_DESKTOP_BASE_URL: Joi.string()
    .uri()
    .default('http://localhost:9990')
    .messages({
      'string.uri': 'BYTEBOT_DESKTOP_BASE_URL must be a valid URL',
    }),

  BYTEBOT_LLM_PROXY_URL: Joi.string().uri().optional().messages({
    'string.uri': 'BYTEBOT_LLM_PROXY_URL must be a valid URL',
  }),

  BYTEBOT_ANALYTICS_ENDPOINT: Joi.string().uri().optional().messages({
    'string.uri': 'BYTEBOT_ANALYTICS_ENDPOINT must be a valid URL',
  }),
});

/**
 * Feature flags validation schema
 * Validates boolean feature flags with appropriate defaults per environment
 */
export const featureFlagsSchema = Joi.object({
  ENABLE_AUTHENTICATION: Joi.boolean()
    .default(false)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.boolean().default(true),
      otherwise: Joi.boolean().default(false),
    }),

  ENABLE_RATE_LIMITING: Joi.boolean()
    .default(true)
    .when('NODE_ENV', {
      is: 'development',
      then: Joi.boolean().default(false),
      otherwise: Joi.boolean().default(true),
    }),

  ENABLE_METRICS_COLLECTION: Joi.boolean()
    .default(true)
    .when('NODE_ENV', {
      is: 'development',
      then: Joi.boolean().default(false),
      otherwise: Joi.boolean().default(true),
    }),

  ENABLE_HEALTH_CHECKS: Joi.boolean().default(true),

  ENABLE_CIRCUIT_BREAKER: Joi.boolean()
    .default(false)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.boolean().default(true),
      otherwise: Joi.boolean().default(false),
    }),
});

/**
 * Monitoring and observability validation schema
 * Validates monitoring configuration for Prometheus, logging, and tracing
 */
export const monitoringSchema = Joi.object({
  PROMETHEUS_METRICS_PORT: Joi.number().port().default(9464).messages({
    'number.port': 'PROMETHEUS_METRICS_PORT must be a valid port number',
  }),

  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info')
    .when('NODE_ENV', {
      is: 'development',
      then: Joi.string().default('debug'),
      otherwise: Joi.when('NODE_ENV', {
        is: 'production',
        then: Joi.string().default('warn'),
        otherwise: Joi.string().default('info'),
      }),
    })
    .messages({
      'any.only': 'LOG_LEVEL must be one of: error, warn, info, debug, verbose',
    }),

  LOG_FORMAT: Joi.string()
    .valid('json', 'text')
    .default('json')
    .when('NODE_ENV', {
      is: 'development',
      then: Joi.string().default('text'),
      otherwise: Joi.string().default('json'),
    })
    .messages({
      'any.only': 'LOG_FORMAT must be either "json" or "text"',
    }),

  ENABLE_DISTRIBUTED_TRACING: Joi.boolean()
    .default(false)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.boolean().default(true),
      otherwise: Joi.boolean().default(false),
    }),

  JAEGER_ENDPOINT: Joi.string()
    .uri()
    .optional()
    .when('ENABLE_DISTRIBUTED_TRACING', {
      is: true,
      then: Joi.string().uri().required(),
      otherwise: Joi.string().uri().optional(),
    })
    .messages({
      'string.uri': 'JAEGER_ENDPOINT must be a valid URL',
      'any.required':
        'JAEGER_ENDPOINT is required when distributed tracing is enabled',
    }),
});

/**
 * Performance configuration validation schema
 * Validates performance-related settings and timeouts
 */
export const performanceSchema = Joi.object({
  GRACEFUL_SHUTDOWN_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .max(60000)
    .default(10000)
    .messages({
      'number.min': 'GRACEFUL_SHUTDOWN_TIMEOUT must be at least 1000ms',
      'number.max': 'GRACEFUL_SHUTDOWN_TIMEOUT must not exceed 60000ms',
    }),
});

/**
 * Circuit breaker configuration validation schema
 * Validates circuit breaker settings for external service resilience
 */
export const circuitBreakerSchema = Joi.object({
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50)
    .messages({
      'number.min': 'CIRCUIT_BREAKER_FAILURE_THRESHOLD must be at least 1',
      'number.max': 'CIRCUIT_BREAKER_FAILURE_THRESHOLD must not exceed 100',
    }),

  CIRCUIT_BREAKER_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .max(300000)
    .default(60000)
    .messages({
      'number.min': 'CIRCUIT_BREAKER_TIMEOUT must be at least 1000ms',
      'number.max':
        'CIRCUIT_BREAKER_TIMEOUT must not exceed 300000ms (5 minutes)',
    }),

  CIRCUIT_BREAKER_RESET_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .max(300000)
    .default(30000)
    .messages({
      'number.min': 'CIRCUIT_BREAKER_RESET_TIMEOUT must be at least 1000ms',
      'number.max':
        'CIRCUIT_BREAKER_RESET_TIMEOUT must not exceed 300000ms (5 minutes)',
    }),
});

/**
 * Health check configuration validation schema
 * Validates health check intervals and timeouts
 */
export const healthCheckSchema = Joi.object({
  HEALTH_CHECK_TIMEOUT: Joi.number()
    .integer()
    .min(1000)
    .max(30000)
    .default(5000)
    .messages({
      'number.min': 'HEALTH_CHECK_TIMEOUT must be at least 1000ms',
      'number.max': 'HEALTH_CHECK_TIMEOUT must not exceed 30000ms',
    }),

  HEALTH_CHECK_INTERVAL: Joi.number()
    .integer()
    .min(5000)
    .max(300000)
    .default(30000)
    .messages({
      'number.min': 'HEALTH_CHECK_INTERVAL must be at least 5000ms',
      'number.max':
        'HEALTH_CHECK_INTERVAL must not exceed 300000ms (5 minutes)',
    }),
});

/**
 * Kubernetes configuration validation schema
 * Validates Kubernetes-specific settings for deployment
 */
export const kubernetesSchema = Joi.object({
  KUBERNETES_NAMESPACE: Joi.string()
    .pattern(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/)
    .default('default')
    .messages({
      'string.pattern.base':
        'KUBERNETES_NAMESPACE must be a valid Kubernetes namespace name',
    }),

  KUBERNETES_SERVICE_NAME: Joi.string()
    .pattern(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/)
    .default('bytebot-agent')
    .messages({
      'string.pattern.base':
        'KUBERNETES_SERVICE_NAME must be a valid Kubernetes service name',
    }),
});

/**
 * Development configuration validation schema
 * Validates development and debugging settings
 */
export const developmentSchema = Joi.object({
  ENABLE_SWAGGER: Joi.boolean()
    .default(false)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.boolean().default(false),
      otherwise: Joi.boolean().default(true),
    }),

  SWAGGER_PATH: Joi.string()
    .pattern(/^\/[a-zA-Z0-9\/\-_]*$/)
    .default('/api/docs')
    .messages({
      'string.pattern.base':
        'SWAGGER_PATH must be a valid API path starting with /',
    }),

  DEBUG_MODE: Joi.boolean()
    .default(false)
    .when('NODE_ENV', {
      is: 'development',
      then: Joi.boolean().default(true),
      otherwise: Joi.boolean().default(false),
    }),
});

/**
 * Complete configuration validation schema
 * Combines all sub-schemas with environment-specific overrides
 */
export const completeConfigSchema = Joi.object({
  NODE_ENV: environmentSchema,
})
  .concat(databaseSchema)
  .concat(apiSchema)
  .concat(securitySchema)
  .concat(llmApiKeysSchema)
  .concat(servicesSchema)
  .concat(featureFlagsSchema)
  .concat(monitoringSchema)
  .concat(performanceSchema)
  .concat(circuitBreakerSchema)
  .concat(healthCheckSchema)
  .concat(kubernetesSchema)
  .concat(developmentSchema);

/**
 * Production-specific validation schema
 * Applies stricter validation rules for production environments
 */
export const productionConfigSchema = completeConfigSchema.concat(
  Joi.object({
    // Stricter security requirements for production
    JWT_SECRET: Joi.string().min(64).required(),
    ENCRYPTION_KEY: Joi.string().min(64).required(),

    // Require at least one LLM API key in production
    [Joi.expression('||')]: [
      Joi.object({ ANTHROPIC_API_KEY: Joi.string().required() }),
      Joi.object({ OPENAI_API_KEY: Joi.string().required() }),
      Joi.object({ GEMINI_API_KEY: Joi.string().required() }),
    ],

    // Require monitoring endpoints in production
    JAEGER_ENDPOINT: Joi.when('ENABLE_DISTRIBUTED_TRACING', {
      is: true,
      then: Joi.string().uri().required(),
    }),

    // Disable debug features in production
    DEBUG_MODE: Joi.boolean().valid(false),
    ENABLE_SWAGGER: Joi.boolean().valid(false),
  }),
);

/**
 * Development-specific validation schema
 * Applies relaxed validation rules for development environments
 */
export const developmentConfigSchema = completeConfigSchema.concat(
  Joi.object({
    // Allow shorter secrets in development
    JWT_SECRET: Joi.string().min(16),
    ENCRYPTION_KEY: Joi.string().min(16),

    // Allow missing LLM keys in development
    ANTHROPIC_API_KEY: Joi.string().optional(),
    OPENAI_API_KEY: Joi.string().optional(),
    GEMINI_API_KEY: Joi.string().optional(),

    // Allow debug features in development
    DEBUG_MODE: Joi.boolean().default(true),
    ENABLE_SWAGGER: Joi.boolean().default(true),
  }),
);

/**
 * Validate configuration against appropriate schema based on environment
 *
 * @param config - Configuration object to validate
 * @param environment - Target environment (development, staging, production)
 * @returns Validation result with validated config or error details
 */
export function validateConfig(
  config: Record<string, any>,
  environment?: string,
): {
  error?: Joi.ValidationError;
  value?: any;
} {
  const env = environment || config.NODE_ENV || 'development';

  let schema: Joi.ObjectSchema;

  switch (env) {
    case 'production':
      schema = productionConfigSchema;
      break;
    case 'development':
    case 'test':
      schema = developmentConfigSchema;
      break;
    default:
      schema = completeConfigSchema;
  }

  return schema.validate(config, {
    allowUnknown: true,
    stripUnknown: false,
    abortEarly: false,
  });
}

/**
 * Validate secrets configuration separately
 * Provides focused validation for sensitive configuration values
 *
 * @param secrets - Secrets object to validate
 * @param environment - Target environment
 * @returns Validation result for secrets
 */
export function validateSecrets(
  secrets: Record<string, any>,
  environment?: string,
): {
  error?: Joi.ValidationError;
  value?: any;
} {
  const secretsValidationSchema = securitySchema.concat(llmApiKeysSchema);

  if (environment === 'production') {
    return secretsValidationSchema
      .concat(
        Joi.object({
          JWT_SECRET: Joi.string().min(64).required(),
          ENCRYPTION_KEY: Joi.string().min(64).required(),
        }),
      )
      .validate(secrets, {
        allowUnknown: true,
        abortEarly: false,
      });
  }

  return secretsValidationSchema.validate(secrets, {
    allowUnknown: true,
    abortEarly: false,
  });
}
