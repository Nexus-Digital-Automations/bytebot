import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as express from 'express';
import { json, urlencoded } from 'express';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
        serviceType: ServiceType.BYTEBOTD,
        environment,
        securityLevel: securityMiddleware.getSecurityConfig().securityLevel,
      },
    );

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
