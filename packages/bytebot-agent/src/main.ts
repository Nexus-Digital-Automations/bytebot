import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BytebotConfigService } from './config/config.service';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { webcrypto } from 'crypto';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

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
    const config = configService.getAppConfig();
    const apiConfig = configService.getApiConfig();
    const featuresConfig = configService.getFeaturesConfig();

    // Configure security headers with helmet
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for Swagger UI
            styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger UI
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: false, // Disable for development compatibility
      }),
    );

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

    // Configure CORS with environment-specific origins
    app.enableCors({
      origin: apiConfig.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      credentials: true,
      optionsSuccessStatus: 200, // For legacy browser support
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
    const developmentConfig = configService.getDevelopmentConfig();
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
    const shutdownService = app.get('ShutdownService');
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
      reason: reason instanceof Error ? reason.message : String(reason),
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
