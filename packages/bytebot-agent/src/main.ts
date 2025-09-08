import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BytebotConfigService } from './config/config.service';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { webcrypto } from 'crypto';
import { json, urlencoded, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import {
  StandardizedSecurityMiddleware,
  ServiceType,
} from '@bytebot/shared/dist/index-server';
import { ConfigService } from '@nestjs/config';

// Polyfill for crypto global (required by @nestjs/schedule)
if (!globalThis.crypto) {
  // Type-safe assignment with proper crypto interface
  globalThis.crypto = webcrypto as unknown as Crypto;
}

/**
 * Bootstrap function - Initialize and configure the Bytebot Agent application
 * Uses enterprise-grade configuration management and security settings
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  logger.log(
    'Starting Bytebot Agent application with enterprise configuration...',
  );

  try {
    const app = await NestFactory.create(AppModule);

    // Get configuration service for typed configuration access
    const configService = app.get(BytebotConfigService);
    const standardConfigService = app.get(ConfigService);
    const config = configService.getAppConfig();
    const apiConfig = configService.getApiConfig();
    const featuresConfig = configService.getFeaturesConfig();
    const developmentConfig = configService.getDevelopmentConfig();

    // Deploy standardized security middleware for Bytebot-Agent - HIGH SECURITY
    const securityMiddleware =
      StandardizedSecurityMiddleware.createBytebotAgentMiddleware(
        standardConfigService,
      );
    app.use('/api', securityMiddleware.use.bind(securityMiddleware));

    logger.log(
      'Bytebot-Agent standardized security middleware deployed successfully',
      {
        serviceType: ServiceType.BYTEBOT_AGENT,
        environment: config.nodeEnv,
        securityLevel: securityMiddleware.getSecurityConfig().securityLevel,
      },
    );

    // Configure security headers with helmet - environment-aware
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              ...(developmentConfig.enableSwagger
                ? ["'unsafe-inline'", "'unsafe-eval'"]
                : []),
              'https://cdn.jsdelivr.net',
              'https://unpkg.com',
            ],
            styleSrc: [
              "'self'",
              ...(developmentConfig.enableSwagger ? ["'unsafe-inline'"] : []),
              'https://fonts.googleapis.com',
            ],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
            imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
            connectSrc: [
              "'self'",
              'ws:',
              'wss:',
              ...(config.nodeEnv === 'development'
                ? ['http://localhost:*', 'https://localhost:*']
                : []),
              'https://app.bytebot.ai',
              'https://api.bytebot.ai',
            ],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'", 'blob:'],
            frameSrc: (developmentConfig.enableSwagger
              ? ["'self'"]
              : ["'none'"]) as string[],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            ...(config.nodeEnv === 'production' && {
              upgradeInsecureRequests: [],
            }),
          },
          reportOnly: config.nodeEnv === 'development',
        },
        crossOriginEmbedderPolicy: false, // Disable for API compatibility
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        dnsPrefetchControl: { allow: false },
        frameguard: { action: 'deny' },
        hidePoweredBy: true,
        hsts:
          config.nodeEnv === 'production'
            ? {
                maxAge: 31536000, // 1 year
                includeSubDomains: true,
                preload: true,
              }
            : false,
        ieNoOpen: true,
        noSniff: true,
        originAgentCluster: true,
        permittedCrossDomainPolicies: false,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        xssFilter: true,
        // Note: expectCt has been removed from helmet v8 as Certificate Transparency
        // is now widely supported and the header is no longer needed
        // Note: permissionsPolicy has been removed from helmet v8.
        // Use a separate Permissions-Policy header middleware if needed
      }),
    );

    // Additional security headers
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Service', 'Bytebot-Agent');
      res.setHeader('X-API-Version', '1.0');

      if (config.nodeEnv === 'production') {
        res.removeHeader('X-Powered-By');
        res.removeHeader('Server');
      }

      next();
    });

    // Configure body parser with configuration-driven limits
    app.use(json({ limit: apiConfig.bodyParserLimit }));
    app.use(
      urlencoded({
        limit: apiConfig.bodyParserLimit,
        extended: true,
      }),
    );

    // Set global prefix for all routes
    app.setGlobalPrefix('api');

    // Configure CORS with production-grade origin validation
    const allowedOrigins = Array.isArray(apiConfig.corsOrigins)
      ? apiConfig.corsOrigins
      : [apiConfig.corsOrigins];

    // Add environment-specific origins
    const productionOrigins = [
      'https://app.bytebot.ai',
      'https://bytebot.ai',
      'https://api.bytebot.ai',
    ];

    const developmentOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:9990',
      'http://localhost:9991',
      'http://localhost:9992',
      'https://localhost:3000',
      'https://localhost:3001',
    ];

    const corsOrigins =
      config.nodeEnv === 'production'
        ? [...allowedOrigins, ...productionOrigins]
        : [...allowedOrigins, ...developmentOrigins];

    app.enableCors({
      origin: (
        origin: string | undefined,
        callback: (error: Error | null, allow?: boolean) => void,
      ) => {
        // Allow requests with no origin (mobile apps, curl, postman, etc.)
        if (!origin) {
          return callback(null, true);
        }

        // Check if origin is in allowed list
        if (corsOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Allow localhost with any port in development
        if (
          config.nodeEnv === 'development' &&
          (origin.startsWith('http://localhost:') ||
            origin.startsWith('https://localhost:'))
        ) {
          return callback(null, true);
        }

        // Support wildcard subdomains for bytebot.ai in production
        if (config.nodeEnv === 'production' && origin.endsWith('.bytebot.ai')) {
          return callback(null, true);
        }

        // Block unauthorized origins
        logger.warn(`CORS blocked unauthorized origin: ${origin}`, {
          blockedOrigin: origin,
          allowedOrigins: corsOrigins,
          environment: config.nodeEnv,
          timestamp: new Date().toISOString(),
        });

        return callback(
          new Error(`Origin ${origin} not allowed by CORS policy`),
          false,
        );
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control',
        'X-API-Key',
        'X-Service-ID',
      ],
      exposedHeaders: [
        'X-Request-ID',
        'X-Response-Time',
        'X-Rate-Limit-Remaining',
        'X-Total-Count',
      ],
      credentials: true,
      maxAge: config.nodeEnv === 'production' ? 86400 : 3600, // 24h prod, 1h dev
      preflightContinue: false,
      optionsSuccessStatus: 204, // Some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    // Add global validation pipe for request validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Strip unknown properties
        forbidNonWhitelisted: true, // Reject requests with unknown properties
        transform: true, // Transform payloads to match DTOs
        disableErrorMessages: config.nodeEnv === 'production', // Hide validation details in prod
      }),
    );

    // Configure Swagger API documentation
    if (developmentConfig.enableSwagger) {
      const swaggerConfig = new DocumentBuilder()
        .setTitle('Bytebot Agent API')
        .setDescription(
          'Enterprise-grade API for Bytebot Agent with JWT authentication and RBAC authorization',
        )
        .setVersion('1.0.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token',
            in: 'header',
          },
          'JWT-auth',
        )
        .addTag('Authentication', 'User authentication and session management')
        .addTag('Tasks', 'Task management and execution')
        .addTag('Messages', 'Message handling and communication')
        .addTag('Health', 'Application health and monitoring')
        .addServer('http://localhost:9991', 'Development server')
        .addServer('https://api.bytebot.ai', 'Production server')
        .build();

      const document = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup(developmentConfig.swaggerPath, app, document, {
        swaggerOptions: {
          persistAuthorization: true, // Keep auth tokens after page refresh
          tagsSorter: 'alpha',
          operationsSorter: 'alpha',
        },
        customSiteTitle: 'Bytebot Agent API Documentation',
        customCss: `
          .swagger-ui .topbar { display: none; }
          .swagger-ui .info .title { color: #1976d2; }
        `,
      });

      logger.log(
        `Swagger documentation available at ${developmentConfig.swaggerPath}`,
      );
    }

    // Configure application based on feature flags
    if (featuresConfig.authentication) {
      logger.log('Authentication enabled - JWT middleware will be active');
    }

    if (featuresConfig.rateLimiting) {
      logger.log('Rate limiting enabled - API requests will be throttled');
    }

    if (featuresConfig.metricsCollection) {
      logger.log('Metrics collection enabled - Prometheus metrics available');
    }

    // Enable graceful shutdown with enhanced reliability
    app.enableShutdownHooks();

    // Initialize shutdown service for enterprise-grade graceful shutdown
    const shutdownService: unknown = app.get('ShutdownService');
    if (shutdownService) {
      logger.log('Enterprise graceful shutdown service initialized');
    }

    // Start the application
    const port = config.port;
    await app.listen(port);

    // Log successful startup with configuration details
    logger.log(`Bytebot Agent started successfully on port ${port}`, {
      environment: config.nodeEnv,
      port: port,
      enabledFeatures: Object.entries(featuresConfig)
        .filter(([, enabled]) => enabled)
        .map(([feature]) => feature),
      corsOrigins: apiConfig.corsOrigins,
      bodyParserLimit: apiConfig.bodyParserLimit,
    });
  } catch (error) {
    logger.error('Failed to start Bytebot Agent application', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 * Ensures proper cleanup when the application receives termination signals
 */
function setupGracefulShutdown(): void {
  const logger = new Logger('Shutdown');

  const gracefulShutdown = (signal: string) => {
    logger.log(`Received ${signal}, shutting down gracefully...`);

    // Perform cleanup here if needed
    setTimeout(() => {
      logger.log('Graceful shutdown completed');
      process.exit(0);
    }, 100);
  };

  // Handle termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', {
      reason:
        reason instanceof Error
          ? reason.message
          : (() => {
              if (typeof reason === 'string') return reason;
              try {
                return JSON.stringify(reason);
              } catch {
                return '[Unserializable Reason]';
              }
            })(),
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: promise,
    });
    process.exit(1);
  });
}

// Set up graceful shutdown before starting the application
setupGracefulShutdown();

// Start the application with comprehensive error handling
bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Bootstrap failed:', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
