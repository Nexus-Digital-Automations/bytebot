import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as express from 'express';
import { json, urlencoded } from 'express';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import {
  StandardizedSecurityMiddleware,
  ServiceType,
} from '@bytebot/shared/dist/index-server';
import type { Server, IncomingMessage } from 'http';
import type { Socket } from 'net';

/**
 * Application bootstrap function
 * Initializes NestJS application with proxy middleware and WebSocket handling
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    // Get configuration service for standardized security
    const configService = app.get(ConfigService);
    const environment = process.env.NODE_ENV ?? 'development';

    // Deploy standardized security middleware for BytebotD - MAXIMUM SECURITY
    const securityMiddleware =
      StandardizedSecurityMiddleware.createBytebotDMiddleware(configService);
    app.use('/api', securityMiddleware.use.bind(securityMiddleware));

    logger.log(
      'BytebotD standardized security middleware deployed successfully',
      {
        serviceType: ServiceType.BYTEBOTD as string,
        environment,
        securityLevel: securityMiddleware.getSecurityConfig().securityLevel,
      },
    );

    // Enable global validation pipes for comprehensive input validation
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        validateCustomDecorators: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Configure comprehensive OpenAPI documentation for all automation APIs
    const config = new DocumentBuilder()
      .setTitle('BytebotD Automation API')
      .setDescription(`
# BytebotD Comprehensive Form Automation & Data Extraction API

**Enterprise-grade browser automation and data extraction platform with comprehensive security and monitoring capabilities.**

## 🚀 Core Automation Capabilities

### Form Automation
- **Intelligent Form Detection**: Automatically detect and analyze web forms
- **Smart Auto-filling**: Fill forms with validation and error handling
- **Multi-step Form Support**: Handle complex, dynamic, and conditional forms
- **File Upload Automation**: Automate file uploads with validation
- **Form Validation**: Real-time validation with custom rules

### Data Extraction
- **Structured Data Extraction**: Extract tables, lists, and structured content
- **Pattern-based Extraction**: Configurable extraction patterns with regex support
- **Multi-format Output**: JSON, CSV, XML, YAML export capabilities
- **Real-time Processing**: Live data extraction with change monitoring
- **Custom Selectors**: Advanced CSS and XPath selector support

### Workflow Automation
- **Multi-step Workflows**: Complex browser automation with conditional logic
- **Error Recovery**: Intelligent retry and error handling mechanisms
- **Parallel Execution**: Concurrent workflow execution for performance
- **Loop Support**: Dynamic loops with break conditions
- **API Integration**: Seamless integration with external APIs

### File Management
- **Automated Uploads**: Smart file upload with form detection
- **Download Management**: Organized file downloads with validation
- **File Processing**: Compression, extraction, and transformation
- **Security Scanning**: Comprehensive file validation and virus scanning
- **Bulk Operations**: Efficient handling of multiple files

### Content Monitoring
- **Real-time Monitoring**: Continuous page content monitoring
- **Change Detection**: Multiple algorithms for detecting content changes
- **Alert Systems**: Multi-channel notifications (email, webhook, SMS, Slack)
- **Historical Tracking**: Complete change history with analytics
- **Performance Monitoring**: Monitor page load times and availability

## 🔐 Enterprise Security Features

- **JWT Authentication**: Secure API access with role-based permissions
- **Rate Limiting**: Protection against abuse and DDoS attacks
- **Input Sanitization**: Comprehensive validation and sanitization
- **Audit Logging**: Complete operation tracking for compliance
- **Data Encryption**: End-to-end encryption for sensitive data
- **CORS Protection**: Strict origin validation and secure headers

## 📊 Monitoring & Analytics

- **Performance Metrics**: Comprehensive operation timing and success rates
- **Error Tracking**: Detailed error logging with root cause analysis
- **Usage Analytics**: API usage patterns and optimization insights
- **Health Monitoring**: System health checks and alerting
- **Prometheus Integration**: Enterprise metrics collection

## 🛠️ Integration Examples

### Create a Form Automation
\`\`\`json
POST /form-automation/actions
{
  "actionType": "fill_form",
  "url": "https://example.com/contact",
  "formData": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "configuration": {
    "waitForLoad": 3000,
    "validateFields": true
  }
}
\`\`\`

### Extract Structured Data
\`\`\`json
POST /data-extraction/extract
{
  "url": "https://example.com/products",
  "extractionType": "table_data",
  "selector": ".products-table",
  "outputFormat": "json",
  "configuration": {
    "includeHeaders": true,
    "pagination": true
  }
}
\`\`\`

### Monitor Content Changes
\`\`\`json
POST /content-monitoring/monitors
{
  "id": "price-monitor-123",
  "name": "Product Price Monitor",
  "url": "https://store.example.com/product/123",
  "type": "text_change",
  "selector": ".price",
  "frequency": { "interval": 300000 },
  "notifications": [
    { "method": "email", "target": "alerts@company.com" }
  ]
}
\`\`\`

## 📚 Additional Resources

- **API Reference**: Complete endpoint documentation with examples
- **Integration Guides**: Step-by-step integration tutorials
- **Best Practices**: Performance optimization and security guidelines
- **Troubleshooting**: Common issues and solutions
- **SDK Documentation**: Client libraries for popular languages
      `)
      .setVersion('1.0.0')
      .setContact(
        'BytebotD API Support',
        'https://docs.bytebot.ai',
        'api-support@bytebot.ai'
      )
      .setLicense('Commercial', 'https://bytebot.ai/license')
      .addServer('http://localhost:9990', 'Development Server')
      .addServer('https://api.bytebot.ai', 'Production Server')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token for authentication',
          in: 'header',
        },
        'bearer'
      )
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'API key for additional authentication'
        },
        'apikey'
      )
      .addTag('Form Automation', 'Comprehensive form interaction and automation APIs')
      .addTag('Data Extraction', 'Structured data extraction from web pages')
      .addTag('Workflow Automation', 'Multi-step browser workflows with conditional logic')
      .addTag('File Management', 'File upload, download, and management automation')
      .addTag('Content Monitoring', 'Real-time content monitoring and change detection')
      .addTag('System Health', 'System monitoring, health checks, and diagnostics')
      .addTag('Authentication', 'API authentication and authorization')
      .addTag('Metrics', 'Performance metrics and analytics')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      ignoreGlobalPrefix: false,
      deepScanRoutes: true,
      operationIdFactory: (controllerKey: string, methodKey: string) => {
        return `${controllerKey}_${methodKey}`;
      },
    });

    // Enhanced OpenAPI document with additional metadata
    document.info.termsOfService = 'https://bytebot.ai/terms';
    document.externalDocs = {
      description: 'Complete API Documentation and Guides',
      url: 'https://docs.bytebot.ai/automation-api'
    };

    // Add custom extensions for API metadata
    document.info['x-api-id'] = 'bytebot-automation-api';
    document.info['x-audience'] = 'external';
    document.info['x-category'] = 'automation';

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        docExpansion: 'list',
        filter: true,
        showRequestHeaders: true,
        tryItOutEnabled: true,
        validatorUrl: null,
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        onComplete: () => {
          console.log('OpenAPI documentation loaded successfully');
        },
      },
      customSiteTitle: 'BytebotD Automation API Documentation',
      customfavIcon: '/favicon.ico',
      customJs: [
        'https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js',
      ],
      customCssUrl: '/api-docs/custom.css',
    });

    logger.log('OpenAPI documentation configured successfully at /api/docs', {
      title: document.info.title,
      version: document.info.version,
      paths: Object.keys(document.paths).length,
      tags: document.tags?.length || 0,
    });

    // Configure security headers with helmet - SECURITY CRITICAL
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'", // Required for VNC viewer
              "'unsafe-eval'", // Required for noVNC client
              'https://cdn.jsdelivr.net',
            ],
            styleSrc: ["'self'", "'unsafe-inline'"], // Required for VNC viewer
            fontSrc: ["'self'", 'data:'],
            imgSrc: ["'self'", 'data:', 'blob:', 'http://localhost:*'],
            connectSrc: [
              "'self'",
              'ws:',
              'wss:',
              'http://localhost:*',
              'https://localhost:*',
              ...(environment === 'production'
                ? ['wss://app.bytebot.ai', 'https://api.bytebot.ai']
                : []),
            ],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'", 'blob:'],
            frameSrc: ["'self'", 'http://localhost:*'], // Allow framing for VNC
            frameAncestors: [
              "'self'",
              'http://localhost:*',
              'https://localhost:*',
            ],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: environment === 'production' ? [] : null,
          },
          reportOnly: environment === 'development',
        },
        crossOriginEmbedderPolicy: false, // Disabled for WebSocket compatibility
        crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        dnsPrefetchControl: { allow: false },
        frameguard: { action: 'sameorigin' }, // Allow framing for VNC viewer
        hidePoweredBy: true,
        hsts:
          environment === 'production'
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
        // Note: expectCt has been removed in helmet v8.1.0
        // Note: permissionsPolicy is not directly supported by helmet v8.1.0
      }),
    );

    // Configure body parser with increased payload size limit (50MB)
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ limit: '50mb', extended: true }));

    // Enable CORS with strict origin validation - SECURITY CRITICAL
    const baseAllowedOrigins = [
      'http://localhost:3000', // Development frontend
      'http://localhost:3001', // Alternative dev port
      'http://localhost:9990', // BytebotD itself
      'http://localhost:9991', // Bytebot agent
      'http://localhost:9992', // Bytebot UI
      'https://localhost:3000', // HTTPS development
      'https://localhost:3001', // HTTPS alternative dev port
    ];

    const productionOrigins = [
      'https://app.bytebot.ai', // Production frontend
      'https://bytebot.ai', // Production domain
      'https://api.bytebot.ai', // Production API
    ];

    const allowedOrigins =
      environment === 'production'
        ? [...baseAllowedOrigins, ...productionOrigins]
        : baseAllowedOrigins;

    app.enableCors({
      origin: (
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ): void => {
        // Allow requests with no origin (mobile apps, curl, postman, etc.)
        if (!origin) {
          callback(null, true);
          return;
        }

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        // Allow any localhost in development
        if (
          environment === 'development' &&
          (origin.startsWith('http://localhost:') ||
            origin.startsWith('https://localhost:'))
        ) {
          callback(null, true);
          return;
        }

        // Support wildcard subdomains for bytebot.ai in production
        if (environment === 'production' && origin.endsWith('.bytebot.ai')) {
          callback(null, true);
          return;
        }

        // Block unauthorized origins with detailed logging
        logger.warn(`CORS blocked unauthorized origin: ${origin}`, {
          blockedOrigin: origin,
          allowedOrigins,
          environment,
          userAgent: '',
          timestamp: new Date().toISOString(),
        });

        callback(
          new Error(`Origin ${origin} not allowed by CORS policy`),
          false,
        );
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
        'Accept',
        'Origin',
        'Cache-Control',
      ],
      exposedHeaders: [
        'X-Request-ID',
        'X-Response-Time',
        'X-Rate-Limit-Remaining',
        'X-Total-Count',
        'X-Service-ID',
      ],
      credentials: true,
      maxAge: environment === 'production' ? 86400 : 3600, // 24h prod, 1h dev
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

    // Additional security headers for BytebotD
    app.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ): void => {
        res.setHeader('X-Service', 'BytebotD');
        res.setHeader('X-API-Version', '1.0');
        res.setHeader('X-Service-ID', 'computer-use-service');

        if (environment === 'production') {
          res.removeHeader('X-Powered-By');
          res.removeHeader('Server');
        }

        next();
      },
    );

    const wsProxy = createProxyMiddleware({
      target: 'http://localhost:6080',
      ws: true,
      changeOrigin: true,
      pathRewrite: { '^/websockify': '/' },
    });

    app.use('/websockify', express.raw({ type: '*/*' }), wsProxy);
    const server = (await app.listen(9990)) as Server;

    // Selective upgrade routing with proper typing
    server.on(
      'upgrade',
      (req: IncomingMessage, socket: Socket, head: Buffer) => {
        if (req.url?.startsWith('/websockify')) {
          // Type-safe upgrade handling - http-proxy-middleware expects a Socket from 'net'
          if (wsProxy && typeof wsProxy.upgrade === 'function') {
            // Safe type assertion: socket parameter is guaranteed to be Socket from 'net' module
            wsProxy.upgrade(req, socket, head);
          } else {
            logger.warn('WebSocket proxy upgrade method not available');
          }
        }
        // else let Socket.IO/Nest handle it by not hijacking the socket
      },
    );

    logger.log('Application bootstrap completed successfully');
    logger.log('Server listening on port 9990');
  } catch (error) {
    logger.error(
      'Failed to bootstrap application',
      error instanceof Error ? error.stack : String(error),
    );
    process.exit(1);
  }
}

// Start application with proper error handling
void bootstrap();
