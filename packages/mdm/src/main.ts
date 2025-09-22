/**
 * MDM Platform Main Entry Point
 * Enterprise-grade Mobile Device Management Platform
 *
 * Agent 1: Core Platform Infrastructure & Main Application Bootstrap
 */

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { MdmModule } from './mdm.module';
import { MdmLogger } from './common/logger/mdm-logger.service';
import { MdmExceptionFilter } from './common/filters/mdm-exception.filter';
import { MdmSecurityInterceptor } from './common/interceptors/mdm-security.interceptor';
import { ParlantValidationMiddleware } from './common/middleware/parlant-validation.middleware';

/**
 * Bootstrap the MDM Platform Application
 * Implements enterprise-grade security, monitoring, and PARLANT integration
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('MDMBootstrap');
  logger.log('🚀 Starting Mobile Device Management Platform...');

  try {
    // Create NestJS application with CORS and security
    const app = await NestFactory.create(MdmModule, {
      logger: new MdmLogger(),
      cors: {
        origin: process.env.MDM_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      }
    });

    const configService = app.get(ConfigService);
    const port = configService.get<number>('MDM_PORT', 3003);
    const environment = configService.get<string>('NODE_ENV', 'development');

    // Enterprise security configuration
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    // Rate limiting for API protection
    app.use(rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later',
      standardHeaders: true,
      legacyHeaders: false
    }));

    // Global validation pipe for request validation
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true
      },
      validateCustomDecorators: true,
      errorHttpStatusCode: 422
    }));

    // Global exception filter for error handling
    app.useGlobalFilters(new MdmExceptionFilter());

    // Global security interceptor
    app.useGlobalInterceptors(new MdmSecurityInterceptor());

    // PARLANT validation middleware
    app.use('/api/v1', new ParlantValidationMiddleware().use);

    // Set global prefix for API versioning
    app.setGlobalPrefix('api/v1');

    // Swagger API documentation setup
    if (environment !== 'production') {
      const swaggerConfig = new DocumentBuilder()
        .setTitle('Mobile Device Management Platform API')
        .setDescription('Enterprise-grade MDM platform for device policy enforcement, app distribution, and security monitoring')
        .setVersion('1.0.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token',
            in: 'header'
          },
          'JWT-auth'
        )
        .addTag('Device Management', 'Device enrollment, registration, and lifecycle management')
        .addTag('Policy Management', 'Device policy configuration and enforcement')
        .addTag('Application Management', 'App distribution and enterprise app store')
        .addTag('Security Management', 'Security policies, remote wipe, and encryption')
        .addTag('Asset Tracking', 'Device inventory and asset lifecycle management')
        .addTag('Compliance', 'Compliance reporting and audit trails')
        .addTag('Mobile Security', 'Mobile app security scanning and vulnerability assessment')
        .addTag('Identity Integration', 'Identity provider and directory service integration')
        .build();

      const document = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          filter: true,
          showRequestHeaders: true,
          showCommonExtensions: true
        },
        customSiteTitle: 'MDM Platform API Documentation',
        customfavIcon: '/favicon.ico',
        customJs: [
          'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
          'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js'
        ],
        customCssUrl: [
          'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css'
        ]
      });

      logger.log(`📚 API Documentation available at: http://localhost:${port}/api/docs`);
    }

    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      logger.log('🛑 Received SIGINT, shutting down gracefully...');
      await app.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.log('🛑 Received SIGTERM, shutting down gracefully...');
      await app.close();
      process.exit(0);
    });

    // Start the application
    await app.listen(port, '0.0.0.0');

    logger.log(`🎯 MDM Platform running on port ${port} in ${environment} mode`);
    logger.log(`🔗 API Base URL: http://localhost:${port}/api/v1`);
    logger.log(`🛡️ Security features: Helmet, Rate Limiting, JWT Auth, RBAC`);
    logger.log(`🤖 PARLANT integration: Active conversational validation`);
    logger.log(`📊 Health check: http://localhost:${port}/api/v1/health`);

  } catch (error) {
    logger.error('❌ Failed to start MDM Platform:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('UnhandledRejection');
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  const logger = new Logger('UncaughtException');
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Bootstrap the application
bootstrap().catch((error) => {
  const logger = new Logger('BootstrapError');
  logger.error('Failed to bootstrap MDM Platform:', error);
  process.exit(1);
});