/**
 * Security Configuration Deployment - Bytebot-UI Service
 *
 * This module provides the standardized security middleware deployment configuration
 * for Bytebot-UI (Frontend Service) with STANDARD SECURITY settings optimized for UI interactions.
 *
 * @fileoverview Bytebot-UI security middleware deployment configuration
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
 * Bytebot-UI Security Configuration Service
 * Provides STANDARD SECURITY configuration for frontend UI operations
 */
@Injectable()
export class BytebotUISecurityConfigService {
  constructor(private configService: ConfigService) {}

  /**
   * Create Bytebot-UI security middleware with standard security settings
   */
  createSecurityMiddleware(): StandardizedSecurityMiddleware {
    return StandardizedSecurityMiddleware.createBytebotUIMiddleware(
      this.configService,
    );
  }

  /**
   * Create Bytebot-UI validation pipe with standard security settings
   */
  createValidationPipe(): StandardizedValidationPipe {
    const environment = this.configService.get('NODE_ENV', 'development');

    // Use standard security pipe for Bytebot-UI
    return StandardizedValidationPipes.STANDARD_SECURITY(environment);
  }

  /**
   * Create Bytebot-UI rate limit guard with lenient rate limits for UI interactions
   */
  createRateLimitGuard(
    reflector: any,
    redisClient?: any,
  ): StandardizedRateLimitGuard {
    return StandardizedRateLimitGuard.createBytebotUIGuard(
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
      serviceType: ServiceType.BYTEBOT_UI,
      environment,
      securityLevel: 'STANDARD',
      description: 'Frontend UI Service - Standard Security Configuration',
      middleware: {
        enabled: true,
        csp: true, // Always enable CSP for UI
        hsts: environment === 'production',
        frameOptions: 'SAMEORIGIN', // Allow embedding for UI components
        corsOrigins:
          environment === 'production'
            ? ['https://app.bytebot.ai', 'https://bytebot.ai']
            : [
                'http://localhost:3000',
                'http://localhost:3001',
                'http://localhost:8080',
                'http://localhost:9990',
                'http://localhost:9991',
                'http://localhost:9992',
              ],
      },
      validation: {
        enableSanitization: true,
        enableThreatDetection: true,
        maxPayloadSize: '15mb', // Moderate size for UI uploads
        securityLevel: 'STANDARD',
        allowHtml: true, // UI may handle rich content
      },
      rateLimiting: {
        authRequests: 10, // Lenient for UI authentication
        computerOperations: 200, // High for UI interactions
        taskOperations: 200, // High for UI task interactions
        readOperations: 1000, // Very high for UI data fetching
        websocketConnections: 50, // High for real-time UI updates
      },
      features: {
        ui: true,
        nextjs: true, // Next.js specific features
        staticAssets: true,
        apiProxy: true, // UI may proxy API requests
        realTimeUpdates: true,
        fileUploads: environment !== 'production' || true, // Allow file uploads
        authentication: true,
        securityLogging: environment !== 'development',
      },
      nextjs: {
        // Next.js specific security configurations
        poweredByHeader: false, // Hide X-Powered-By header
        strictTransportSecurity: environment === 'production',
        contentSecurityPolicy: {
          enabled: true,
          reportOnly: environment === 'development',
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'", // Required for Next.js
              "'unsafe-eval'", // Required for development
              'https://cdn.jsdelivr.net',
              'https://unpkg.com',
            ],
            styleSrc: [
              "'self'",
              "'unsafe-inline'", // Required for CSS-in-JS
              'https://fonts.googleapis.com',
            ],
            fontSrc: [
              "'self'",
              'https://fonts.gstatic.com',
            ],
            imgSrc: [
              "'self'",
              'data:', // For inline images
              'blob:', // For generated images
              'https://images.unsplash.com', // If using external images
            ],
            connectSrc: [
              "'self'",
              'ws://localhost:*', // WebSocket in development
              'wss://app.bytebot.ai', // WebSocket in production
              'https://api.bytebot.ai', // API connections
            ],
            frameSrc: ["'self'"], // Allow same-origin framing
          },
        },
      },
    };
  }
}

/**
 * Bytebot-UI Security Configuration Module
 * Provides all security components for Bytebot-UI service
 */
@Module({
  imports: [ConfigModule],
  providers: [
    BytebotUISecurityConfigService,
    {
      provide: 'BYTEBOT_UI_SECURITY_MIDDLEWARE',
      useFactory: (configService: ConfigService) =>
        StandardizedSecurityMiddleware.createBytebotUIMiddleware(configService),
      inject: [ConfigService],
    },
    {
      provide: 'BYTEBOT_UI_VALIDATION_PIPE',
      useFactory: (configService: ConfigService) => {
        const environment = configService.get('NODE_ENV', 'development');
        return StandardizedValidationPipes.STANDARD_SECURITY(environment);
      },
      inject: [ConfigService],
    },
    {
      provide: 'BYTEBOT_UI_RATE_LIMIT_GUARD',
      useFactory: (
        reflector: any,
        configService: ConfigService,
        redisClient?: any,
      ) =>
        StandardizedRateLimitGuard.createBytebotUIGuard(
          reflector,
          configService,
          redisClient,
        ),
      inject: ['Reflector', ConfigService, 'REDIS_CLIENT'],
    },
  ],
  exports: [
    BytebotUISecurityConfigService,
    'BYTEBOT_UI_SECURITY_MIDDLEWARE',
    'BYTEBOT_UI_VALIDATION_PIPE',
    'BYTEBOT_UI_RATE_LIMIT_GUARD',
  ],
})
export class BytebotUISecurityModule implements NestModule {
  constructor(private configService: ConfigService) {}

  configure(consumer: MiddlewareConsumer) {
    // Apply Bytebot-UI security middleware to all routes
    const securityMiddleware =
      StandardizedSecurityMiddleware.createBytebotUIMiddleware(
        this.configService,
      );

    consumer
      .apply(securityMiddleware.use.bind(securityMiddleware))
      .forRoutes('*');
  }
}

/**
 * Bytebot-UI Security Deployment Helper
 * Utility functions for deploying Bytebot-UI security configuration
 */
export class BytebotUISecurityDeployment {
  /**
   * Apply Bytebot-UI security to NestJS application
   * @param app - NestJS application instance
   * @param configService - Configuration service
   */
  static async applySecurityToApp(app: any, configService: ConfigService) {
    const environment = configService.get('NODE_ENV', 'development');

    // Apply global validation pipe with standard security
    app.useGlobalPipes(StandardizedValidationPipes.STANDARD_SECURITY(environment));

    // Apply global rate limiting guard
    const reflector = app.get('Reflector');
    const redisClient = app.get('REDIS_CLIENT', null);
    const rateLimitGuard = StandardizedRateLimitGuard.createBytebotUIGuard(
      reflector,
      configService,
      redisClient,
    );

    app.useGlobalGuards(rateLimitGuard);

    // Log security deployment
    const logger = app.get('Logger');
    if (logger) {
      logger.log('Bytebot-UI security middleware deployed successfully', {
        service: 'Bytebot-UI',
        securityLevel: 'STANDARD',
        environment,
        features: {
          ui: true,
          nextjs: true,
          rateLimiting: !!redisClient,
          validation: true,
          staticAssets: true,
          realTimeUpdates: true,
        },
      });
    }
  }

  /**
   * Get security headers for Bytebot-UI with Next.js optimizations
   */
  static getSecurityHeaders(environment: string) {
    const isProd = environment === 'production';

    return {
      'X-Service': 'Bytebot-UI',
      'X-Security-Level': 'STANDARD',
      'X-UI-Version': '2.0',
      'X-Framework': 'Next.js',
      'X-Frame-Options': 'SAMEORIGIN', // Allow same-origin framing for UI
      'X-Powered-By': undefined, // Remove Next.js header
      ...(isProd && {
        'Strict-Transport-Security':
          'max-age=31536000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'same-origin',
      }),
      // UI-specific headers
      'Cache-Control': isProd 
        ? 'public, max-age=31536000, immutable' // Aggressive caching for static assets
        : 'no-cache, no-store, must-revalidate', // No caching in development
      'X-DNS-Prefetch-Control': 'on',
      'X-Download-Options': 'noopen',
    };
  }

  /**
   * Validate Bytebot-UI security configuration
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

    // Check Next.js configuration
    const nextConfig = configService.get('NEXT_CONFIG');
    if (!nextConfig && environment === 'production') {
      validationResults.warnings.push(
        'Next.js configuration not found - using defaults',
      );
    }

    // Check static file serving configuration
    const staticPath = configService.get('STATIC_FILES_PATH', './public');
    if (environment === 'production' && !staticPath) {
      validationResults.errors.push(
        'Static files path not configured for production',
      );
      validationResults.valid = false;
    }

    // Check Redis configuration for session storage
    const redisHost = configService.get('REDIS_HOST');
    if (!redisHost && environment === 'production') {
      validationResults.warnings.push(
        'Redis not configured - sessions and caching will use fallbacks',
      );
    }

    // Check API proxy configuration
    const apiProxyUrl = configService.get('API_PROXY_URL');
    if (!apiProxyUrl) {
      validationResults.warnings.push(
        'API proxy URL not configured - direct API calls will be used',
      );
    }

    // Check CSP configuration
    const cspEnabled = configService.get('security.csp.enabled', true);
    if (!cspEnabled && environment === 'production') {
      validationResults.errors.push(
        'Content Security Policy is disabled in production',
      );
      validationResults.valid = false;
    }

    return validationResults;
  }

  /**
   * Configure Next.js security middleware
   */
  static configureNextJsSecurity(configService: ConfigService) {
    const environment = configService.get('NODE_ENV', 'development');
    
    return {
      // Security headers for Next.js
      headers: {
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'same-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        ...(environment === 'production' && {
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        }),
      },

      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            ...(environment === 'development' ? ["'unsafe-eval'", "'unsafe-inline'"] : []),
          ],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: environment === 'production' ? [] : undefined,
        },
      },

      // HSTS configuration
      hsts: environment === 'production' ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      } : false,

      // Hide powered by header
      poweredByHeader: false,

      // Force HTTPS in production
      forceHTTPSRedirect: environment === 'production',
    };
  }

  /**
   * Setup UI-specific rate limiting presets
   */
  static getUIRateLimitPresets() {
    return {
      // Lenient limits for UI interactions
      uiInteraction: {
        max: 200,
        windowMs: 60 * 1000, // 1 minute
        message: 'UI interaction rate limit exceeded',
      },
      
      // High limits for data fetching
      dataFetching: {
        max: 1000,
        windowMs: 60 * 1000, // 1 minute
        message: 'Data fetching rate limit exceeded',
      },
      
      // Moderate limits for form submissions
      formSubmission: {
        max: 50,
        windowMs: 60 * 1000, // 1 minute
        message: 'Form submission rate limit exceeded',
      },
      
      // Strict limits for file uploads
      fileUpload: {
        max: 10,
        windowMs: 60 * 1000, // 1 minute
        message: 'File upload rate limit exceeded',
      },
      
      // High limits for WebSocket connections
      websocketConnection: {
        max: 50,
        windowMs: 60 * 1000, // 1 minute
        message: 'WebSocket connection rate limit exceeded',
      },
    };
  }
}

export default {
  BytebotUISecurityConfigService,
  BytebotUISecurityModule,
  BytebotUISecurityDeployment,
};