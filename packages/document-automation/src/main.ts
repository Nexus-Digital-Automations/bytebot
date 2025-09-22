/**
 * Document Automation Service - Main Application Bootstrap
 * Standalone NestJS application for document automation microservice
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DocumentAutomationModule } from './document-automation.module';

async function bootstrap() {
  const logger = new Logger('DocumentAutomationBootstrap');

  try {
    // Create NestJS application
    const app = await NestFactory.create(DocumentAutomationModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    // Enable CORS for cross-origin requests
    app.enableCors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // API documentation with Swagger
    const config = new DocumentBuilder()
      .setTitle('Document Automation API')
      .setDescription('Enterprise document automation system with template management, dynamic generation, and workflow integration')
      .setVersion('1.0.0')
      .addBearerAuth()
      .addTag('Document Generation', 'Core document generation operations')
      .addTag('Template Management', 'Template CRUD and lifecycle management')
      .addTag('Workflow Management', 'Approval workflows and process automation')
      .addTag('Batch Processing', 'Bulk document generation operations')
      .addTag('Document Assembly', 'Document manipulation and assembly operations')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    // Start the application
    const port = process.env.PORT || 3004;
    await app.listen(port);

    logger.log(`🚀 Document Automation Service is running on: http://localhost:${port}`);
    logger.log(`📚 API Documentation available at: http://localhost:${port}/api/docs`);
    logger.log(`🏥 Health check available at: http://localhost:${port}/health`);

  } catch (error) {
    logger.error('Failed to start Document Automation Service:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  const logger = new Logger('UncaughtException');
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('UnhandledRejection');
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  const logger = new Logger('SIGTERM');
  logger.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

bootstrap();