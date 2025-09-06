/**
 * Configuration Module - Enterprise-grade configuration management for Bytebot API Platform
 * Implements secure configuration loading with validation, type safety, and environment separation
 *
 * Features:
 * - Environment-specific configurations (development, staging, production)
 * - Type-safe configuration validation with Joi schemas
 * - Secrets management integration with Kubernetes secrets
 * - Feature flags for gradual rollout
 * - Performance monitoring and logging configuration
 *
 * @author Configuration & Secrets Management Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { registerAs } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { completeConfigSchema } from './validation.schema';

const logger = new Logger('Configuration');

/**
 * Configuration interface defining the structure of validated configuration
 * Provides type safety for configuration access throughout the application
 */
export interface AppConfig {
  nodeEnv: 'development' | 'staging' | 'production' | 'test';
  port: number;

  database: {
    url: string;
    maxConnections: number;
    connectionTimeout: number;
  };

  api: {
    rateLimitWindow: number;
    rateLimitMaxRequests: number;
    corsOrigins: string | string[];
    bodyParserLimit: string;
    requestTimeout: number;
  };

  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    jwtRefreshExpiresIn: string;
    encryptionKey: string;
  };

  llmApiKeys: {
    anthropic?: string;
    openai?: string;
    gemini?: string;
  };

  services: {
    bytebotDesktopUrl: string;
    llmProxyUrl?: string;
    analyticsEndpoint?: string;
  };

  features: {
    authentication: boolean;
    rateLimiting: boolean;
    metricsCollection: boolean;
    healthChecks: boolean;
    circuitBreaker: boolean;
  };

  monitoring: {
    prometheusMetricsPort: number;
    logLevel: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
    logFormat: 'json' | 'text';
    distributedTracing: boolean;
    jaegerEndpoint?: string;
  };

  performance: {
    gracefulShutdownTimeout: number;
  };

  circuitBreaker: {
    failureThreshold: number;
    timeout: number;
    resetTimeout: number;
  };

  healthCheck: {
    timeout: number;
    interval: number;
  };

  kubernetes: {
    namespace: string;
    serviceName: string;
  };

  development: {
    enableSwagger: boolean;
    swaggerPath: string;
    debugMode: boolean;
  };
}

/**
 * Load and validate configuration from environment variables
 * Applies environment-specific overrides and validates against schema
 *
 * @returns Validated configuration object
 * @throws Error if configuration validation fails
 */
function loadConfiguration(): AppConfig {
  const startTime = Date.now();
  logger.log('Starting configuration loading and validation...');

  try {
    // Load environment variables
    const envVars = {
      ...process.env,
      // Apply environment-specific defaults
      ...getEnvironmentDefaults(),
    };

    // Validate configuration against schema
    const { error, value: validatedConfig } = completeConfigSchema.validate(
      envVars,
      {
        allowUnknown: true, // Allow extra environment variables
        stripUnknown: false, // Keep extra variables for debugging
        abortEarly: false, // Get all validation errors
      },
    );

    if (error) {
      const errorDetails = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      logger.error('Configuration validation failed:', {
        errors: errorDetails,
        errorCount: error.details.length,
      });

      throw new Error(`Configuration validation failed: ${error.message}`);
    }

    // Transform validated configuration to typed structure
    const config: AppConfig = {
      nodeEnv: validatedConfig.NODE_ENV,
      port: validatedConfig.PORT,

      database: {
        url: validatedConfig.DATABASE_URL,
        maxConnections: validatedConfig.DATABASE_MAX_CONNECTIONS,
        connectionTimeout: validatedConfig.DATABASE_CONNECTION_TIMEOUT,
      },

      api: {
        rateLimitWindow: validatedConfig.API_RATE_LIMIT_WINDOW,
        rateLimitMaxRequests: validatedConfig.API_RATE_LIMIT_MAX_REQUESTS,
        corsOrigins: validatedConfig.API_CORS_ORIGINS,
        bodyParserLimit: validatedConfig.BODY_PARSER_LIMIT,
        requestTimeout: validatedConfig.REQUEST_TIMEOUT,
      },

      security: {
        jwtSecret: validatedConfig.JWT_SECRET,
        jwtExpiresIn: validatedConfig.JWT_EXPIRES_IN,
        jwtRefreshExpiresIn: validatedConfig.JWT_REFRESH_EXPIRES_IN,
        encryptionKey: validatedConfig.ENCRYPTION_KEY,
      },

      llmApiKeys: {
        anthropic: validatedConfig.ANTHROPIC_API_KEY,
        openai: validatedConfig.OPENAI_API_KEY,
        gemini: validatedConfig.GEMINI_API_KEY,
      },

      services: {
        bytebotDesktopUrl: validatedConfig.BYTEBOT_DESKTOP_BASE_URL,
        llmProxyUrl: validatedConfig.BYTEBOT_LLM_PROXY_URL,
        analyticsEndpoint: validatedConfig.BYTEBOT_ANALYTICS_ENDPOINT,
      },

      features: {
        authentication: validatedConfig.ENABLE_AUTHENTICATION,
        rateLimiting: validatedConfig.ENABLE_RATE_LIMITING,
        metricsCollection: validatedConfig.ENABLE_METRICS_COLLECTION,
        healthChecks: validatedConfig.ENABLE_HEALTH_CHECKS,
        circuitBreaker: validatedConfig.ENABLE_CIRCUIT_BREAKER,
      },

      monitoring: {
        prometheusMetricsPort: validatedConfig.PROMETHEUS_METRICS_PORT,
        logLevel: validatedConfig.LOG_LEVEL,
        logFormat: validatedConfig.LOG_FORMAT,
        distributedTracing: validatedConfig.ENABLE_DISTRIBUTED_TRACING,
        jaegerEndpoint: validatedConfig.JAEGER_ENDPOINT,
      },

      performance: {
        gracefulShutdownTimeout: validatedConfig.GRACEFUL_SHUTDOWN_TIMEOUT,
      },

      circuitBreaker: {
        failureThreshold: validatedConfig.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
        timeout: validatedConfig.CIRCUIT_BREAKER_TIMEOUT,
        resetTimeout: validatedConfig.CIRCUIT_BREAKER_RESET_TIMEOUT,
      },

      healthCheck: {
        timeout: validatedConfig.HEALTH_CHECK_TIMEOUT,
        interval: validatedConfig.HEALTH_CHECK_INTERVAL,
      },

      kubernetes: {
        namespace: validatedConfig.KUBERNETES_NAMESPACE,
        serviceName: validatedConfig.KUBERNETES_SERVICE_NAME,
      },

      development: {
        enableSwagger: validatedConfig.ENABLE_SWAGGER,
        swaggerPath: validatedConfig.SWAGGER_PATH,
        debugMode: validatedConfig.DEBUG_MODE,
      },
    };

    const loadTime = Date.now() - startTime;
    logger.log('Configuration loaded and validated successfully', {
      environment: config.nodeEnv,
      loadTimeMs: loadTime,
      featuresEnabled: Object.entries(config.features)
        .filter(([, enabled]) => enabled)
        .map(([feature]) => feature),
    });

    // Log configuration summary (without secrets)
    logConfigurationSummary(config);

    return config;
  } catch (error) {
    const loadTime = Date.now() - startTime;
    logger.error('Configuration loading failed', {
      error: error instanceof Error ? error.message : String(error),
      loadTimeMs: loadTime,
    });
    throw error;
  }
}

/**
 * Get environment-specific default values
 * Provides different defaults based on NODE_ENV
 *
 * @returns Environment-specific default configuration
 */
function getEnvironmentDefaults(): Record<string, any> {
  const nodeEnv = process.env.NODE_ENV || 'development';

  const baseDefaults = {};

  switch (nodeEnv) {
    case 'production':
      return {
        ...baseDefaults,
        LOG_LEVEL: 'warn',
        LOG_FORMAT: 'json',
        ENABLE_SWAGGER: 'false',
        DEBUG_MODE: 'false',
        ENABLE_AUTHENTICATION: 'true',
        ENABLE_RATE_LIMITING: 'true',
        ENABLE_METRICS_COLLECTION: 'true',
        ENABLE_HEALTH_CHECKS: 'true',
        ENABLE_CIRCUIT_BREAKER: 'true',
        ENABLE_DISTRIBUTED_TRACING: 'true',
      };

    case 'staging':
      return {
        ...baseDefaults,
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'json',
        ENABLE_SWAGGER: 'true',
        DEBUG_MODE: 'false',
        ENABLE_AUTHENTICATION: 'true',
        ENABLE_RATE_LIMITING: 'true',
        ENABLE_METRICS_COLLECTION: 'true',
        ENABLE_HEALTH_CHECKS: 'true',
        ENABLE_CIRCUIT_BREAKER: 'false',
        ENABLE_DISTRIBUTED_TRACING: 'false',
      };

    case 'development':
    case 'test':
    default:
      return {
        ...baseDefaults,
        LOG_LEVEL: 'debug',
        LOG_FORMAT: 'text',
        ENABLE_SWAGGER: 'true',
        DEBUG_MODE: 'true',
        ENABLE_AUTHENTICATION: 'false',
        ENABLE_RATE_LIMITING: 'false',
        ENABLE_METRICS_COLLECTION: 'false',
        ENABLE_HEALTH_CHECKS: 'true',
        ENABLE_CIRCUIT_BREAKER: 'false',
        ENABLE_DISTRIBUTED_TRACING: 'false',
      };
  }
}

/**
 * Log configuration summary without exposing sensitive information
 * Provides visibility into configuration while maintaining security
 *
 * @param config - Validated configuration object
 */
function logConfigurationSummary(config: AppConfig): void {
  const summary = {
    environment: config.nodeEnv,
    port: config.port,
    database: {
      hasUrl: !!config.database.url,
      maxConnections: config.database.maxConnections,
    },
    security: {
      hasJwtSecret: !!config.security.jwtSecret,
      hasEncryptionKey: !!config.security.encryptionKey,
      jwtExpiresIn: config.security.jwtExpiresIn,
    },
    llmApiKeys: {
      anthropic: !!config.llmApiKeys.anthropic,
      openai: !!config.llmApiKeys.openai,
      gemini: !!config.llmApiKeys.gemini,
    },
    features: config.features,
    monitoring: {
      logLevel: config.monitoring.logLevel,
      logFormat: config.monitoring.logFormat,
      metricsPort: config.monitoring.prometheusMetricsPort,
    },
  };

  logger.log('Configuration Summary:', summary);
}

/**
 * Register configuration with NestJS config system
 * Provides typed configuration access throughout the application
 */
export default registerAs('app', loadConfiguration);
