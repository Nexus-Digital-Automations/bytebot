/**
 * Security Configuration Deployment - Bytebot-Agent Service
 *
 * This module provides the standardized security middleware deployment configuration
 * for Bytebot-Agent (Task Management Service) with HIGH SECURITY settings.
 *
 * @fileoverview Bytebot-Agent security middleware deployment configuration
 * @version 1.0.0
 * @author Security Configuration Deployment Specialist
 */

import {
  Injectable,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestApplication } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import {
  StandardizedSecurityMiddleware,
  ServiceType,
  StandardizedValidationPipe,
  StandardizedRateLimitGuard,
  StandardizedValidationPipes,
} from '@bytebot/shared/server';

/**
 * Bytebot-Agent Security Configuration Service
 * Provides HIGH SECURITY configuration for task management and API operations
 */
@Injectable()
export class BytebotAgentSecurityConfigService {
  constructor(private configService: ConfigService) {}

  /**
   * Create Bytebot-Agent security middleware with high security settings
   */
  createSecurityMiddleware(): StandardizedSecurityMiddleware {
    try {
      return StandardizedSecurityMiddleware.createBytebotAgentMiddleware(
        this.configService,
      );
    } catch {
      throw new Error('Failed to create security middleware');
    }
  }

  /**
   * Create Bytebot-Agent validation pipe with high security settings
   */
  createValidationPipe(): StandardizedValidationPipe {
    const environment = this.configService.get<string>(
      'NODE_ENV',
      'development',
    );

    try {
      // Use high security pipe for Bytebot-Agent

      return StandardizedValidationPipes.HIGH_SECURITY(environment);
    } catch {
      throw new Error('Failed to create validation pipe');
    }
  }

  /**
   * Create Bytebot-Agent rate limit guard with moderate rate limits
   */
  createRateLimitGuard(
    _reflector: Reflector,
    _redisClient?: unknown,
  ): StandardizedRateLimitGuard {
    try {
      const environment = this.configService.get<string>(
        'NODE_ENV',
        'development',
      );
      return StandardizedRateLimitGuard.createBytebotAgentGuard(environment);
    } catch {
      throw new Error('Failed to create rate limit guard');
    }
  }

  /**
   * Get security configuration for manual inspection
   */
  getSecurityConfig(): {
    serviceType: ServiceType;
    environment: string;
    securityLevel: string;
    description: string;
    middleware: Record<string, unknown>;
    validation: Record<string, unknown>;
    rateLimiting: Record<string, unknown>;
    features: Record<string, unknown>;
  } {
    const environment = this.configService.get<string>(
      'NODE_ENV',
      'development',
    );

    return {
      serviceType: ServiceType._BYTEBOT_AGENT,
      environment,
      securityLevel: 'HIGH',
      description: 'Task Management API Service - High Security Configuration',
      middleware: {
        enabled: true,
        csp: environment === 'production',
        hsts: environment === 'production',
        frameOptions: 'DENY', // No framing for API service
        corsOrigins:
          environment === 'production'
            ? ['https://app.bytebot.ai', 'https://bytebot.ai']
            : [
                'http://localhost:3000',
                'http://localhost:3001',
                'http://localhost:9990',
                'http://localhost:9992',
              ],
      },
      validation: {
        enableSanitization: true,
        enableThreatDetection: true,
        maxPayloadSize: '25mb',
        securityLevel: 'HIGH',
        allowHtml: true, // API may handle rich content
      },
      rateLimiting: {
        authRequests: 5, // Standard for API service
        computerOperations: 100, // Higher for API proxy
        taskOperations: 100,
        readOperations: 500,
        websocketConnections: 20,
      },
      features: {
        api: true,
        taskManagement: true,
        computerProxy: true,
        authentication: true,
        swaggerDocs: environment !== 'production',
        securityLogging: environment !== 'development',
      },
    };
  }
}

/**
 * Bytebot-Agent Security Configuration Module
 * Provides all security components for Bytebot-Agent service
 */
@Module({
  imports: [ConfigModule],
  providers: [
    BytebotAgentSecurityConfigService,
    {
      provide: 'BYTEBOT_AGENT_SECURITY_MIDDLEWARE',
      useFactory: (configService: ConfigService) =>
        StandardizedSecurityMiddleware.createBytebotAgentMiddleware(
          configService,
        ),
      inject: [ConfigService],
    },
    {
      provide: 'BYTEBOT_AGENT_VALIDATION_PIPE',
      useFactory: (configService: ConfigService) => {
        const environment = configService.get<string>(
          'NODE_ENV',
          'development',
        );

        return StandardizedValidationPipes.HIGH_SECURITY(environment);
      },
      inject: [ConfigService],
    },
    {
      provide: 'BYTEBOT_AGENT_RATE_LIMIT_GUARD',
      useFactory: (
        reflector: Reflector,
        configService: ConfigService,
        _redisClient?: unknown,
      ) => {
        const environment = configService.get<string>(
          'NODE_ENV',
          'development',
        );
        return StandardizedRateLimitGuard.createBytebotAgentGuard(environment);
      },
      inject: ['Reflector', ConfigService, 'REDIS_CLIENT'],
    },
  ],
  exports: [
    BytebotAgentSecurityConfigService,
    'BYTEBOT_AGENT_SECURITY_MIDDLEWARE',
    'BYTEBOT_AGENT_VALIDATION_PIPE',
    'BYTEBOT_AGENT_RATE_LIMIT_GUARD',
  ],
})
export class BytebotAgentSecurityModule implements NestModule {
  constructor(private configService: ConfigService) {}

  configure(consumer: MiddlewareConsumer) {
    try {
      // Apply Bytebot-Agent security middleware to all routes

      const securityMiddleware =
        StandardizedSecurityMiddleware.createBytebotAgentMiddleware(
          this.configService,
        );

      consumer
        .apply(
          securityMiddleware.use.bind(securityMiddleware) as Parameters<
            MiddlewareConsumer['apply']
          >[0],
        )
        .forRoutes('*');
    } catch {
      throw new Error('Failed to configure security middleware');
    }
  }
}

/**
 * Bytebot-Agent Security Deployment Helper
 * Utility functions for deploying Bytebot-Agent security configuration
 */
export class BytebotAgentSecurityDeployment {
  /**
   * Apply Bytebot-Agent security to NestJS application
   * @param app - NestJS application instance
   * @param configService - Configuration service
   */
  static applySecurityToApp(
    app: NestApplication,
    configService: ConfigService,
  ): void {
    try {
      const environment = configService.get<string>('NODE_ENV', 'development');

      // Apply global validation pipe with high security

      app.useGlobalPipes(
        StandardizedValidationPipes.HIGH_SECURITY(environment),
      );

      // Apply global rate limiting guard

      const redisClient: unknown = app.get('REDIS_CLIENT', { strict: false });

      const rateLimitGuard =
        StandardizedRateLimitGuard.createBytebotAgentGuard(environment);

      app.useGlobalGuards(rateLimitGuard);

      // Log security deployment

      const logger: unknown = app.get('Logger', { strict: false });
      if (
        logger &&
        typeof logger === 'object' &&
        logger !== null &&
        'log' in logger
      ) {
        (logger as { log: (message: string, meta?: unknown) => void }).log(
          'Bytebot-Agent security middleware deployed successfully',
          {
            service: 'Bytebot-Agent',
            securityLevel: 'HIGH',
            environment,
            features: {
              api: true,
              taskManagement: true,

              rateLimiting: !!redisClient,
              validation: true,
              authentication: true,
            },
          },
        );
      }
    } catch {
      throw new Error('Failed to apply security configuration');
    }
  }

  /**
   * Get security headers for Bytebot-Agent
   */
  static getSecurityHeaders(environment: string) {
    const isProd = environment === 'production';

    return {
      'X-Service': 'Bytebot-Agent',
      'X-Security-Level': 'HIGH',
      'X-API-Version': '2.0',
      'X-Task-Management': 'true',
      'X-Frame-Options': 'DENY', // No framing for API
      ...(isProd && {
        'Strict-Transport-Security':
          'max-age=31536000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'same-origin',
      }),
    };
  }

  /**
   * Validate Bytebot-Agent security configuration
   */
  static validateSecurityConfig(configService: ConfigService): {
    environment: string;
    valid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const environment = configService.get<string>('NODE_ENV', 'development');
    const corsOrigins = configService.get<string[]>('CORS_ORIGINS', []);

    const validationResults = {
      environment,
      valid: true,
      warnings: [] as string[],
      errors: [] as string[],
    };

    // Check CORS configuration
    if (
      environment === 'production' &&
      Array.isArray(corsOrigins) &&
      corsOrigins.includes('*')
    ) {
      validationResults.errors.push(
        'Wildcard CORS origins not allowed in production',
      );
      validationResults.valid = false;
    }

    // Check JWT configuration
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      validationResults.errors.push(
        'JWT_SECRET not configured - authentication will fail',
      );
      validationResults.valid = false;
    }

    // Check database configuration
    const databaseUrl = configService.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      validationResults.errors.push(
        'DATABASE_URL not configured - application will fail',
      );
      validationResults.valid = false;
    }

    // Check Redis configuration for rate limiting and caching
    const redisHost = configService.get<string>('REDIS_HOST');
    if (!redisHost && environment !== 'development') {
      validationResults.warnings.push(
        'Redis not configured - rate limiting and caching will use fallbacks',
      );
    }

    // Check Swagger configuration
    const enableSwagger = configService.get<boolean>('features.swagger', true);
    if (enableSwagger && environment === 'production') {
      validationResults.warnings.push(
        'Swagger is enabled in production - consider disabling for security',
      );
    }

    return validationResults;
  }

  /**
   * Configure Swagger with security settings
   */
  static configureSwagger(
    app: NestApplication,
    configService: ConfigService,
  ): Record<string, unknown> | null {
    const environment = configService.get<string>('NODE_ENV', 'development');
    const enableSwagger = configService.get<boolean>(
      'features.swagger',
      environment !== 'production',
    );

    if (!enableSwagger) {
      return null;
    }

    const swaggerConfig = {
      title: 'Bytebot Agent API',
      description:
        'Enterprise-grade API for Bytebot Agent with JWT authentication and RBAC authorization',
      version: '2.0.0',
      security: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      servers: [
        ...(environment === 'development'
          ? [
              {
                url: 'http://localhost:9991',
                description: 'Development server',
              },
            ]
          : []),
        ...(environment === 'production'
          ? [
              {
                url: 'https://api.bytebot.ai',
                description: 'Production server',
              },
            ]
          : []),
      ],
      tags: [
        {
          name: 'Authentication',
          description: 'User authentication and session management',
        },
        { name: 'Tasks', description: 'Task management and execution' },
        { name: 'Messages', description: 'Message handling and communication' },
        { name: 'Health', description: 'Application health and monitoring' },
        { name: 'Metrics', description: 'Performance and usage metrics' },
      ],
    };

    return swaggerConfig;
  }
}

export default {
  BytebotAgentSecurityConfigService,
  BytebotAgentSecurityModule,
  BytebotAgentSecurityDeployment,
};
