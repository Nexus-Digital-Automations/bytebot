import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

/**
 * Bootstrap function for Digital Asset Management System
 * Enterprise-grade startup with comprehensive logging and validation
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('AssetManagementBootstrap');
  
  try {
    logger.log('Starting Digital Asset Management System...');
    
    // Create NestJS application
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Global validation pipe with strict validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      })
    );

    // CORS configuration for local-only architecture
    app.enableCors({
      origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });

    // OpenAPI/Swagger documentation setup
    const config = new DocumentBuilder()
      .setTitle('Digital Asset Management API')
      .setDescription('Enterprise-grade Digital Asset Management System with version control, collaboration, and AI-powered features')
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        'access-token'
      )
      .addTag('assets', 'Asset management operations')
      .addTag('versions', 'Version control operations')
      .addTag('collaboration', 'Real-time collaboration features')
      .addTag('search', 'Search and discovery operations')
      .addTag('analytics', 'Asset analytics and reporting')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Asset Management API',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    });

    // Health check endpoint
    app.getHttpAdapter().get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'digital-asset-management',
        version: '1.0.0',
        uptime: process.uptime(),
      });
    });

    // Start server
    const port = process.env.ASSET_MANAGEMENT_PORT || 3003;
    await app.listen(port);
    
    logger.log(`Digital Asset Management System started successfully on port ${port}`);
    logger.log(`API Documentation available at: http://localhost:${port}/api/docs`);
    logger.log(`Health check available at: http://localhost:${port}/health`);
    
  } catch (error) {
    logger.error('Failed to start Digital Asset Management System', error);
    process.exit(1);
  }
}

bootstrap();
