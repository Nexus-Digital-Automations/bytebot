import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { webcrypto } from 'crypto';
import { json, urlencoded } from 'express';

// Polyfill for crypto global (required by @nestjs/schedule)
if (!globalThis.crypto) {
  // Type-safe assignment with proper crypto interface
  globalThis.crypto = webcrypto as unknown as Crypto;
}

async function bootstrap(): Promise<void> {
  console.log('Starting bytebot-agent application...');

  try {
    const app = await NestFactory.create(AppModule);

    // Configure body parser with increased payload size limit (50MB)
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ limit: '50mb', extended: true }));

    // Set global prefix for all routes
    app.setGlobalPrefix('api');

    // Enable CORS
    app.enableCors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    });

    const port = process.env.PORT ?? 9991;
    await app.listen(port);
    console.log(`Application successfully started on port ${port}`);
  } catch (error) {
    console.error('Error starting application:', error);
    process.exit(1);
  }
}

// Properly handle bootstrap promise with error handling
bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
});
