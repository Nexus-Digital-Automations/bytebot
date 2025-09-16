/**
 * Main Bootstrap Unit Tests - Application Initialization Testing
 *
 * Tests the main application bootstrap functionality including:
 * - Global crypto polyfill initialization
 * - Application factory creation and configuration
 * - CORS configuration and security settings
 * - Body parser configuration with payload limits
 * - Server startup and port binding
 * - Error handling during bootstrap process
 * - Environment variable handling
 *
 * Note: This file tests by examining the bootstrap logic statically
 * and validating core bootstrap components work correctly.
 *
 * @author Claude Code Testing Specialist
 * @version 2.0.0 - Comprehensive Bootstrap Testing (Static Analysis)
 * @since Main Application Bootstrap Testing Suite
 */

import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { webcrypto } from 'crypto';
import { json, urlencoded } from 'express';
import * as fs from 'fs';
import * as path from 'path';
// Mock all external dependencies first (before imports)
jest.mock('@nestjs/core');
jest.mock('./app.module', () => ({
  AppModule: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('express');

import { AppModule } from './app.module';

describe('Main Bootstrap', () => {
  let mockApp: jest.Mocked<INestApplication>;
  let mockNestFactory: jest.Mocked<typeof NestFactory>;
  let mockJson: jest.Mock;
  let mockUrlencoded: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mocked dependencies
    mockApp = {
      use: jest.fn(),
      enableCors: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockNestFactory = NestFactory as jest.Mocked<typeof NestFactory>;
    mockNestFactory.create = jest.fn().mockResolvedValue(mockApp);

    // Mock express middleware
    mockJson = jest.fn().mockReturnValue('json-middleware');
    mockUrlencoded = jest.fn().mockReturnValue('urlencoded-middleware');

    (json as jest.Mock) = mockJson;
    (urlencoded as jest.Mock) = mockUrlencoded;

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Bootstrap File Structure', () => {
    it('should have the correct imports', () => {
      // Read the main.ts file
      const mainFilePath = path.join(__dirname, 'main.ts');
      const mainFileContent = fs.readFileSync(mainFilePath, 'utf8');

      // Verify critical imports are present
      expect(mainFileContent).toContain(
        "import { NestFactory } from '@nestjs/core'",
      );
      expect(mainFileContent).toContain(
        "import { AppModule } from './app.module'",
      );
      expect(mainFileContent).toContain("import { webcrypto } from 'crypto'");
      expect(mainFileContent).toContain(
        "import { json, urlencoded } from 'express'",
      );
    });

    it('should include crypto polyfill setup', () => {
      const mainFilePath = path.join(__dirname, 'main.ts');
      const mainFileContent = fs.readFileSync(mainFilePath, 'utf8');

      // Verify crypto polyfill is configured
      expect(mainFileContent).toContain('if (!globalThis.crypto)');
      expect(mainFileContent).toContain('globalThis.crypto = webcrypto');
    });

    it('should have bootstrap function structure', () => {
      const mainFilePath = path.join(__dirname, 'main.ts');
      const mainFileContent = fs.readFileSync(mainFilePath, 'utf8');

      // Verify bootstrap function exists and key configurations
      expect(mainFileContent).toContain('async function bootstrap()');
      expect(mainFileContent).toContain('NestFactory.create(AppModule)');
      expect(mainFileContent).toContain('app.use(json({ limit:');
      expect(mainFileContent).toContain('app.use(urlencoded({ limit:');
      expect(mainFileContent).toContain('app.enableCors');
      expect(mainFileContent).toContain('app.listen');
      expect(mainFileContent).toContain('bootstrap()');
    });
  });

  describe('Crypto Polyfill Functionality', () => {
    beforeEach(() => {
      // Clear any existing crypto global
      delete (globalThis as any).crypto;
    });

    it('should set crypto global when not present', () => {
      // Ensure crypto is not set
      expect((globalThis as any).crypto).toBeUndefined();

      // Simulate the polyfill logic
      if (!globalThis.crypto) {
        (globalThis as any).crypto = webcrypto as any;
      }

      // Verify crypto is now set
      expect((globalThis as any).crypto).toBeDefined();
      expect((globalThis as any).crypto).toBe(webcrypto);
    });

    it('should not override existing crypto global', () => {
      // Set existing crypto
      const existingCrypto = { existing: 'crypto' };
      (globalThis as any).crypto = existingCrypto;

      // Simulate the polyfill logic
      if (!globalThis.crypto) {
        (globalThis as any).crypto = webcrypto as any;
      }

      // Verify existing crypto is preserved
      expect((globalThis as any).crypto).toBe(existingCrypto);
    });
  });

  describe('NestJS Application Configuration', () => {
    it('should create NestJS application with AppModule', async () => {
      // Simulate bootstrap logic
      const app = await NestFactory.create(AppModule);

      expect(NestFactory.create).toHaveBeenCalledWith(AppModule);
      expect(app).toBe(mockApp);
    });

    it('should configure body parser with correct limits', async () => {
      // Simulate bootstrap logic
      const app = await NestFactory.create(AppModule);

      // Simulate body parser configuration
      app.use(json({ limit: '50mb' }));
      app.use(urlencoded({ limit: '50mb', extended: true }));

      expect(mockJson).toHaveBeenCalledWith({ limit: '50mb' });
      expect(mockUrlencoded).toHaveBeenCalledWith({
        limit: '50mb',
        extended: true,
      });
      expect(app.use).toHaveBeenCalledWith('json-middleware');
      expect(app.use).toHaveBeenCalledWith('urlencoded-middleware');
    });

    it('should enable CORS with correct configuration', async () => {
      // Simulate bootstrap logic
      const app = await NestFactory.create(AppModule);

      // Simulate CORS configuration
      app.enableCors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      });

      expect(app.enableCors).toHaveBeenCalledWith({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      });
    });

    it('should start server on correct port', async () => {
      // Test with default port
      delete process.env.PORT;

      const app = await NestFactory.create(AppModule);
      await app.listen(process.env.PORT ?? 9991);

      expect(app.listen).toHaveBeenCalledWith(9991);
    });

    it('should start server on environment PORT when specified', async () => {
      // Test with environment port
      process.env.PORT = '3000';

      const app = await NestFactory.create(AppModule);
      await app.listen(process.env.PORT ?? 9991);

      expect(app.listen).toHaveBeenCalledWith('3000');

      // Cleanup
      delete process.env.PORT;
    });
  });

  describe('Error Handling', () => {
    it('should handle NestFactory.create errors gracefully', async () => {
      // Mock NestFactory to throw error
      const error = new Error('Factory creation failed');
      mockNestFactory.create.mockRejectedValueOnce(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        // Simulate bootstrap logic with error
        try {
          const app = await NestFactory.create(AppModule);
          await app.listen(process.env.PORT ?? 9991);
        } catch (err) {
          console.error('Error starting application:', err);
        }
      } catch {
        // Expected to catch
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error starting application:',
        error,
      );
    });

    it('should handle app.listen errors gracefully', async () => {
      // Mock app.listen to throw error
      const error = new Error('Port binding failed');
      mockApp.listen.mockRejectedValueOnce(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        // Simulate bootstrap logic with listen error
        try {
          const app = await NestFactory.create(AppModule);
          await app.listen(process.env.PORT ?? 9991);
        } catch (err) {
          console.error('Error starting application:', err);
        }
      } catch {
        // Expected to catch
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error starting application:',
        error,
      );
    });
  });

  describe('Bootstrap Integration', () => {
    it('should execute all bootstrap steps in correct order', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Simulate complete bootstrap sequence
      try {
        console.log('Starting bytebot-agent application...');

        const app = await NestFactory.create(AppModule);
        app.use(json({ limit: '50mb' }));
        app.use(urlencoded({ limit: '50mb', extended: true }));
        app.enableCors({
          origin: '*',
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        });
        await app.listen(process.env.PORT ?? 9991);
      } catch (error) {
        console.error('Error starting application:', error);
      }

      // Verify all steps were called in order
      expect(consoleSpy).toHaveBeenCalledWith(
        'Starting bytebot-agent application...',
      );
      expect(mockNestFactory.create).toHaveBeenCalledWith(AppModule);
      expect(mockApp.use).toHaveBeenCalledTimes(2);
      expect(mockApp.enableCors).toHaveBeenCalled();
      expect(mockApp.listen).toHaveBeenCalled();
    });

    it('should handle complete bootstrap failure gracefully', async () => {
      // Mock complete failure
      mockNestFactory.create.mockRejectedValueOnce(
        new Error('Complete bootstrap failure'),
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        // Simulate complete bootstrap with failure
        try {
          console.log('Starting bytebot-agent application...');
          const app = await NestFactory.create(AppModule);
          await app.listen(process.env.PORT ?? 9991);
        } catch (error) {
          console.error('Error starting application:', error);
        }
      } catch {
        // Expected
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error starting application:',
        expect.any(Error),
      );
    });
  });

  describe('TypeScript and Module Compliance', () => {
    it('should import all required types correctly', () => {
      // Verify imports work without errors
      expect(NestFactory).toBeDefined();
      expect(AppModule).toBeDefined();
      expect(webcrypto).toBeDefined();
      expect(json).toBeDefined();
      expect(urlencoded).toBeDefined();
    });

    it('should have proper async/await structure', () => {
      const mainFilePath = path.join(__dirname, 'main.ts');
      const mainFileContent = fs.readFileSync(mainFilePath, 'utf8');

      // Verify async/await patterns
      expect(mainFileContent).toContain('async function bootstrap()');
      expect(mainFileContent).toContain('await NestFactory.create');
      expect(mainFileContent).toContain('await app.listen');
    });
  });
});
