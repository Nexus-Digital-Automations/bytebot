import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as express from 'express';
import { json, urlencoded } from 'express';
import { Logger } from '@nestjs/common';
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

    // Configure body parser with increased payload size limit (50MB)
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ limit: '50mb', extended: true }));

    // Enable CORS
    app.enableCors({
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
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
