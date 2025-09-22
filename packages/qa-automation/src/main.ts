/**
 * QA Automation Platform - Main Application Entry Point
 *
 * Bootstrap configuration for the comprehensive QA automation platform
 * with enterprise-grade security, monitoring, and documentation.
 *
 * @fileoverview Main application bootstrap for QA automation platform
 * @author Bytebot Team
 * @version 1.0.0
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { QAPlatformModule } from './core/qa-platform.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const logger = new Logger('QAPlatformBootstrap');

  try {
    // Create NestJS application
    const app = await NestFactory.create(QAPlatformModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Global configuration
    app.setGlobalPrefix('api/v1');

    // Enable CORS for local-only architecture
    app.enableCors({
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:8080',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        disableErrorMessages: process.env.NODE_ENV === 'production',
        validationError: {
          target: false,
          value: false,
        },
      })
    );

    // Swagger documentation configuration
    const config = new DocumentBuilder()
      .setTitle('QA Automation Platform API')
      .setDescription(`
# QA Automation Platform API

Comprehensive enterprise-grade QA automation platform providing:

## 🎯 Core Capabilities
- **Intelligent Test Generation**: AI-powered test creation from user stories and specifications
- **Cross-Platform Execution**: Web, mobile, desktop, and API testing across multiple platforms
- **Visual Regression Testing**: Pixel-perfect comparison with intelligent difference detection
- **Performance Testing**: Load simulation, bottleneck detection, and performance profiling
- **Accessibility Testing**: WCAG compliance validation and accessibility scoring
- **Quality Metrics**: Real-time quality monitoring and predictive analytics

## 🏗️ Architecture
- **Local-Only Deployment**: 100% local architecture with no cloud dependencies
- **Enterprise Security**: JWT authentication, RBAC authorization, and audit logging
- **Scalable Execution**: Parallel test execution with intelligent resource management
- **Comprehensive Reporting**: Multi-format reports with executive and technical views

## 🚀 Getting Started
1. **Authentication**: Obtain JWT token via authentication endpoints
2. **Test Generation**: Generate test suites from requirements and specifications
3. **Execution**: Run tests across platforms with quality gate validation
4. **Monitoring**: Track quality metrics and trends via dashboard endpoints
5. **Reporting**: Access comprehensive execution reports and analytics

## 📊 Quality Gates
Configure automated quality gates to ensure:
- Test coverage thresholds
- Performance benchmarks
- Accessibility standards
- Security compliance
- Defect density limits

## 🔧 Integration
- **CI/CD Pipelines**: Seamless integration with build systems
- **Local Development**: Docker Compose for local deployment
- **Monitoring**: Real-time metrics and alerting
- **APIs**: RESTful APIs with comprehensive documentation
      `)
      .setVersion('1.0.0')
      .setContact(
        'Bytebot QA Team',
        'https://bytebot.ai/qa-automation',
        'qa-support@bytebot.ai'
      )
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addTag('QA Automation Platform', 'Main QA workflow orchestration')
      .addTag('Test Generation', 'AI-powered test creation and validation')
      .addTag('Cross-Platform Testing', 'Multi-platform test execution')
      .addTag('Visual Regression', 'Screenshot comparison and visual testing')
      .addTag('Performance Testing', 'Load testing and performance analysis')
      .addTag('Quality Metrics', 'Quality monitoring and analytics')
      .addTag('Reporting', 'Comprehensive test reporting and dashboards')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for API authentication',
        },
        'JWT-auth'
      )
      .addServer('http://localhost:3000', 'Local Development Server')
      .addServer('http://localhost:8080', 'Local Testing Server')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    });

    // Enhanced Swagger UI configuration
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'QA Automation Platform API Documentation',
      customfavIcon: '/favicon.ico',
      customCss: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info .title { color: #1976d2; }
        .swagger-ui .info .description p { line-height: 1.6; }
        .swagger-ui .scheme-container { background: #f5f5f5; padding: 20px; border-radius: 8px; }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        docExpansion: 'list',
        defaultModelsExpandDepth: 3,
        defaultModelExpandDepth: 3,
        tryItOutEnabled: true,
      },
    });

    // Export OpenAPI specification
    await ensureDirectoryExists('./docs');
    fs.writeFileSync(
      './docs/openapi.json',
      JSON.stringify(document, null, 2)
    );

    // Health check endpoint
    app.getHttpAdapter().get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'qa-automation-platform',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    });

    // Graceful shutdown handling
    process.on('SIGTERM', async () => {
      logger.log('SIGTERM received, shutting down gracefully');
      await app.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.log('SIGINT received, shutting down gracefully');
      await app.close();
      process.exit(0);
    });

    // Start the application
    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 QA Automation Platform started successfully`);
    logger.log(`📖 API Documentation: http://localhost:${port}/api/docs`);
    logger.log(`🏥 Health Check: http://localhost:${port}/health`);
    logger.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`🎯 API Base URL: http://localhost:${port}/api/v1`);

    // Log available endpoints
    const routes = app.getHttpAdapter().getHttpServer()._events?.request?.router?.stack || [];
    const endpoints = routes
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        method: Object.keys(layer.route.methods)[0].toUpperCase(),
        path: layer.route.path,
      }));

    if (endpoints.length > 0) {
      logger.log(`📡 Available endpoints:`);
      endpoints.forEach((endpoint: any) => {
        logger.log(`   ${endpoint.method} /api/v1${endpoint.path}`);
      });
    }

    // Log feature capabilities
    logger.log(`✨ Platform Capabilities:`);
    logger.log(`   🧠 Intelligent Test Generation`);
    logger.log(`   🌐 Cross-Platform Execution`);
    logger.log(`   👁️  Visual Regression Testing`);
    logger.log(`   ⚡ Performance Testing`);
    logger.log(`   ♿ Accessibility Testing`);
    logger.log(`   📊 Quality Metrics & Analytics`);
    logger.log(`   🏠 100% Local Architecture`);

  } catch (error) {
    logger.error('Failed to start QA Automation Platform', error);
    process.exit(1);
  }
}

/**
 * Ensure directory exists, create if it doesn't
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.promises.access(dirPath);
  } catch {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Display startup banner
 */
function displayStartupBanner(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                          QA AUTOMATION PLATFORM                             ║
║                         Enterprise Testing Suite                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  🎯 Intelligent Test Generation     📊 Quality Metrics & Analytics          ║
║  🌐 Cross-Platform Execution        🏥 Health Monitoring                    ║
║  👁️  Visual Regression Testing      🔒 Enterprise Security                  ║
║  ⚡ Performance Testing             🏠 Local-Only Architecture              ║
║  ♿ Accessibility Validation        📖 Comprehensive Documentation          ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);
}

// Display banner and start application
displayStartupBanner();
bootstrap();