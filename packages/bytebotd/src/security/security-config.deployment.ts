/**
 * Security Configuration Deployment - BytebotD Service
 *
 * This module provides the standardized security middleware deployment configuration
 * for BytebotD (Computer Control Service) with MAXIMUM SECURITY settings.
 *
 * @fileoverview BytebotD security middleware deployment configuration
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
import {
  StandardizedSecurityMiddleware,
  ServiceType,
  StandardizedValidationPipe,
  ValidationServiceType,
  StandardizedRateLimitGuard,
  RateLimitServiceType,
  StandardizedValidationPipes,
} from '@bytebot/shared';

/**
 * BytebotD Security Configuration Service
 * Provides MAXIMUM SECURITY configuration for computer control operations
 */
@Injectable()
export class BytebotDSecurityConfigService {
  constructor(private configService: ConfigService) {}

  /**
   * Create BytebotD security middleware with maximum security settings
   */
  createSecurityMiddleware(): StandardizedSecurityMiddleware {
    return StandardizedSecurityMiddleware.createBytebotDMiddleware(
      this.configService,
    );
  }

  /**
   * Create BytebotD validation pipe with maximum security settings
   */
  createValidationPipe(): StandardizedValidationPipe {
    const environment = this.configService.get('NODE_ENV', 'development');

    // Use maximum security pipe for BytebotD
    return StandardizedValidationPipes.MAXIMUM_SECURITY(environment);
  }

  /**
   * Create BytebotD rate limit guard with strict rate limits
   */
  createRateLimitGuard(
    reflector: any,
    redisClient?: any,
  ): StandardizedRateLimitGuard {
    return StandardizedRateLimitGuard.createBytebotDGuard(
      reflector,
      this.configService,
      redisClient,
    );
  }

  /**
   * Get security configuration for manual inspection
   */
  getSecurityConfig() {
    const environment = this.configService.get('NODE_ENV', 'development');

    return {
      serviceType: ServiceType.BYTEBOTD,
      environment,
      securityLevel: 'MAXIMUM',
      description: 'Computer Control Service - Maximum Security Configuration',
      middleware: {
        enabled: true,
        csp: environment === 'production',
        hsts: environment === 'production',
        frameOptions: 'SAMEORIGIN', // Allow VNC embedding
        corsOrigins:
          environment === 'production'
            ? ['https://app.bytebot.ai', 'https://bytebot.ai']
            : [
                'http://localhost:3000',
                'http://localhost:3001',
                'http://localhost:8080',
              ],
      },
      validation: {
        enableSanitization: true,
        enableThreatDetection: true,
        maxPayloadSize: '50mb',
        securityLevel: 'MAXIMUM',
      },
      rateLimiting: {
        authRequests: 3, // Very strict for computer control
        computerOperations: 50,
        taskOperations: 20,
        readOperations: 100,
        websocketConnections: 5,
      },
      features: {
        vnc: true, // BytebotD supports VNC
        computerControl: true,
        taskExecution: true,
        securityLogging: environment !== 'development',
      },
    };
  }
}

/**
 * BytebotD Security Configuration Module
 * Provides all security components for BytebotD service
 */
@Module({
  imports: [ConfigModule],
  providers: [
    BytebotDSecurityConfigService,
    {
      provide: 'BYTEBOT_D_SECURITY_MIDDLEWARE',
      useFactory: (configService: ConfigService) =>
        StandardizedSecurityMiddleware.createBytebotDMiddleware(configService),
      inject: [ConfigService],
    },
    {
      provide: 'BYTEBOT_D_VALIDATION_PIPE',
      useFactory: (configService: ConfigService) => {
        const environment = configService.get('NODE_ENV', 'development');
        return StandardizedValidationPipes.MAXIMUM_SECURITY(environment);
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    BytebotDSecurityConfigService,
    'BYTEBOT_D_SECURITY_MIDDLEWARE',
    'BYTEBOT_D_VALIDATION_PIPE',
  ],
})
export class BytebotDSecurityModule implements NestModule {
  constructor(private configService: ConfigService) {}

  configure(consumer: MiddlewareConsumer) {
    // Apply BytebotD security middleware to all routes
    const securityMiddleware =
      StandardizedSecurityMiddleware.createBytebotDMiddleware(
        this.configService,
      );

    consumer
      .apply(securityMiddleware.use.bind(securityMiddleware))
      .forRoutes('*');
  }
}

/**
 * BytebotD Security Deployment Helper
 * Utility functions for deploying BytebotD security configuration
 */
export class BytebotDSecurityDeployment {
  /**
   * Apply BytebotD security to NestJS application
   * @param app - NestJS application instance
   * @param configService - Configuration service
   */
  static async applySecurityToApp(app: any, configService: ConfigService) {
    const environment = configService.get('NODE_ENV', 'development');

    // Apply global validation pipe with maximum security
    app.useGlobalPipes(
      StandardizedValidationPipes.MAXIMUM_SECURITY(environment),
    );

    // Log security deployment
    const logger = app.get('Logger');
    if (logger) {
      logger.log('BytebotD security middleware deployed successfully', {
        service: 'BytebotD',
        securityLevel: 'MAXIMUM',
        environment,
        features: {
          vnc: true,
          computerControl: true,
          maximumSecurity: true,
        },
      });
    }
  }

  /**
   * Get security headers for BytebotD
   */
  static getSecurityHeaders(environment: string) {
    const isProd = environment === 'production';

    return {
      'X-Service': 'BytebotD',
      'X-Security-Level': 'MAXIMUM',
      'X-Computer-Control': 'true',
      'X-VNC-Enabled': 'true',
      'X-Frame-Options': 'SAMEORIGIN', // Allow VNC embedding
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
   * Validate BytebotD security configuration
   */
  static validateSecurityConfig(configService: ConfigService) {
    const environment = configService.get('NODE_ENV', 'development');
    const corsOrigins = configService.get('CORS_ORIGINS', []);

    const validationResults = {
      environment,
      valid: true,
      warnings: [] as string[],
      errors: [] as string[],
    };

    // Check CORS configuration
    if (environment === 'production' && corsOrigins.includes('*')) {
      validationResults.errors.push(
        'Wildcard CORS origins not allowed in production',
      );
      validationResults.valid = false;
    }

    // Check VNC configuration
    const vncUrl = configService.get('BYTEBOT_DESKTOP_VNC_URL');
    if (!vncUrl) {
      validationResults.warnings.push(
        'VNC URL not configured - computer control may not work',
      );
    }

    // Check Redis configuration for rate limiting
    const redisHost = configService.get('REDIS_HOST');
    if (!redisHost && environment !== 'development') {
      validationResults.warnings.push(
        'Redis not configured - rate limiting will use fallback',
      );
    }

    return validationResults;
  }
}

export default {
  BytebotDSecurityConfigService,
  BytebotDSecurityModule,
  BytebotDSecurityDeployment,
};
