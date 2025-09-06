import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as express from 'express';
import { json, urlencoded } from 'express';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
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

    // Configure security headers with helmet - SECURITY CRITICAL
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"], // Required for VNC viewer
          styleSrc: ["'self'", "'unsafe-inline'"],  // Required for VNC viewer
          imgSrc: ["'self'", "data:", "blob:"],     // Allow data URLs and blobs
          connectSrc: ["'self'", "ws:", "wss:"],    // WebSocket connections
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Disabled for WebSocket compatibility
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: "no-referrer" },
      xssFilter: true,
    }));

    // Configure body parser with increased payload size limit (50MB)
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ limit: '50mb', extended: true }));

    // Enable CORS with strict origin validation - SECURITY CRITICAL
    const allowedOrigins = [
      'http://localhost:3000',     // Development frontend
      'http://localhost:3001',     // Alternative dev port
      'http://localhost:9991',     // Bytebot agent
      'https://app.bytebot.ai',    // Production frontend
      'https://bytebot.ai',        // Production domain
      'https://localhost:3000',    // HTTPS development
    ];

    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, postman, etc.)
        if (!origin) {
          return callback(null, true);
        }

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Block unauthorized origins
        logger.warn(`CORS blocked unauthorized origin: ${origin}`, {
          blockedOrigin: origin,
          allowedOrigins,
          timestamp: new Date().toISOString(),
        });
        
        return callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
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
      ],
      credentials: true,
      maxAge: 86400, // 24 hours preflight cache
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

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
