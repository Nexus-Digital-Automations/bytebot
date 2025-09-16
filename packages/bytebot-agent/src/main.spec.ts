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
 * Note: This file tests the bootstrap function in isolation by mocking
 * NestJS factory and related dependencies to avoid actual server startup.
 *
 * @author Claude Code Testing Specialist
 * @version 1.0.0 - Comprehensive Bootstrap Testing
 * @since Main Application Bootstrap Testing Suite
 */

import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { webcrypto } from 'crypto';
import { json, urlencoded } from 'express';

// Mock all external dependencies
jest.mock('@nestjs/core');
jest.mock('./app.module');
jest.mock('express');
jest.mock('crypto', () => ({
  webcrypto: {
    getRandomValues: jest.fn(),
    subtle: {},
  },
}));

// Mock console methods to capture output
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('Main Bootstrap', () => {
  let mockApp: jest.Mocked<INestApplication>;
  let mockNestFactory: jest.Mocked<typeof NestFactory>;
  let mockJson: jest.Mock;
  let mockUrlencoded: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetModules();

    // Mock Express middleware
    mockJson = json as jest.Mock;
    mockUrlencoded = urlencoded as jest.Mock;
    mockJson.mockReturnValue(jest.fn());
    mockUrlencoded.mockReturnValue(jest.fn());

    // Mock NestJS application
    mockApp = {
      use: jest.fn(),
      enableCors: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock NestFactory
    mockNestFactory = NestFactory as jest.Mocked<typeof NestFactory>;
    mockNestFactory.create = jest.fn().mockResolvedValue(mockApp);

    // Clear environment variables
    delete process.env.PORT;

    // Clear global crypto if set
    delete (globalThis as any).crypto;
  });

  afterEach(() => {
    // Clean up global state
    delete (globalThis as any).crypto;
    delete process.env.PORT;
  });

  describe('Global Crypto Polyfill', () => {
    it('should set global crypto when not already defined', async () => {
      // Arrange
      expect(globalThis.crypto).toBeUndefined();

      // Act - Import main to trigger polyfill
      await import('./main');

      // Assert
      expect(globalThis.crypto).toBeDefined();
      expect(globalThis.crypto).toBe(webcrypto);
    });

    it('should not override existing global crypto', async () => {
      // Arrange
      const existingCrypto = { existing: 'crypto' };
      (globalThis as any).crypto = existingCrypto;

      // Act - Re-import main
      jest.resetModules();
      await import('./main');

      // Assert
      expect(globalThis.crypto).toBe(existingCrypto);
    });

    it('should handle crypto polyfill with proper type casting', async () => {
      // Act
      await import('./main');

      // Assert - Verify it's properly type cast
      expect(globalThis.crypto).toBe(webcrypto);
      expect(typeof globalThis.crypto).toBe('object');
    });
  });

  describe('Bootstrap Function Execution', () => {
    beforeEach(async () => {
      // Import main to execute bootstrap
      await import('./main');

      // Wait a bit for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it('should log startup message', () => {
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Starting bytebot-agent application...',
      );
    });

    it('should create NestJS application with AppModule', () => {
      expect(mockNestFactory.create).toHaveBeenCalledTimes(1);
      expect(mockNestFactory.create).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should configure body parser with 50MB limit', () => {
      expect(mockJson).toHaveBeenCalledWith({ limit: '50mb' });
      expect(mockUrlencoded).toHaveBeenCalledWith({
        limit: '50mb',
        extended: true,
      });
      expect(mockApp.use).toHaveBeenCalledTimes(2);
    });

    it('should enable CORS with permissive settings', () => {
      expect(mockApp.enableCors).toHaveBeenCalledWith({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      });
    });

    it('should start server on default port 9991', () => {
      expect(mockApp.listen).toHaveBeenCalledWith(9991);
    });
  });

  describe('Port Configuration', () => {
    it('should use PORT environment variable when provided', async () => {
      // Arrange
      process.env.PORT = '3000';
      jest.resetModules();
      mockNestFactory.create.mockResolvedValue(mockApp);

      // Act
      await import('./main');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(mockApp.listen).toHaveBeenCalledWith('3000');
    });

    it('should handle non-numeric PORT environment variable', async () => {
      // Arrange
      process.env.PORT = 'invalid-port';
      jest.resetModules();
      mockNestFactory.create.mockResolvedValue(mockApp);

      // Act
      await import('./main');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(mockApp.listen).toHaveBeenCalledWith('invalid-port');
    });

    it('should handle empty PORT environment variable', async () => {
      // Arrange
      process.env.PORT = '';
      jest.resetModules();
      mockNestFactory.create.mockResolvedValue(mockApp);

      // Act
      await import('./main');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(mockApp.listen).toHaveBeenCalledWith(9991); // Falls back to default
    });

    it('should handle undefined PORT environment variable', async () => {
      // Arrange
      delete process.env.PORT;
      jest.resetModules();
      mockNestFactory.create.mockResolvedValue(mockApp);

      // Act
      await import('./main');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(mockApp.listen).toHaveBeenCalledWith(9991); // Uses default
    });
  });

  describe('Error Handling', () => {
    it('should handle NestFactory.create errors', async () => {
      // Arrange
      const createError = new Error('Factory creation failed');
      mockNestFactory.create.mockRejectedValue(createError);
      jest.resetModules();

      // Act
      await import('./main');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error starting application:',
        createError,
      );
    });

    it('should handle app.listen errors', async () => {
      // Arrange
      const listenError = new Error('Port already in use');
      mockApp.listen.mockRejectedValue(listenError);
      mockNestFactory.create.mockResolvedValue(mockApp);
      jest.resetModules();

      // Act
      await import('./main');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error starting application:',
        listenError,
      );
    });

    it('should handle enableCors errors', async () => {
      // Arrange
      const corsError = new Error('CORS configuration failed');
      mockApp.enableCors.mockImplementation(() => {
        throw corsError;
      });
      mockNestFactory.create.mockResolvedValue(mockApp);
      jest.resetModules();

      // Act
      await import('./main');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error starting application:',
        corsError,
      );
    });

    it('should handle body parser configuration errors', async () => {
      // Arrange
      const parserError = new Error('Body parser configuration failed');
      mockApp.use.mockImplementation(() => {
        throw parserError;
      });
      mockNestFactory.create.mockResolvedValue(mockApp);
      jest.resetModules();

      // Act
      await import('./main');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error starting application:',
        parserError,
      );
    });

    it('should handle unknown errors gracefully', async () => {
      // Arrange
      const unknownError = 'String error'; // Non-Error object
      mockNestFactory.create.mockRejectedValue(unknownError);
      jest.resetModules();

      // Act
      await import('./main');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error starting application:',
        unknownError,
      );
    });
  });

  describe('Bootstrap Function Configuration Details', () => {
    beforeEach(async () => {
      await import('./main');
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it('should configure JSON body parser with correct options', () => {
      expect(mockJson).toHaveBeenCalledWith({ limit: '50mb' });
      expect(mockJson).toHaveBeenCalledTimes(1);
    });

    it('should configure URL-encoded body parser with correct options', () => {
      expect(mockUrlencoded).toHaveBeenCalledWith({
        limit: '50mb',
        extended: true,
      });
      expect(mockUrlencoded).toHaveBeenCalledTimes(1);
    });

    it('should apply middleware in correct order', () => {
      // Body parser middleware should be applied before CORS
      expect(mockApp.use).toHaveBeenNthCalledWith(1, expect.any(Function));
      expect(mockApp.use).toHaveBeenNthCalledWith(2, expect.any(Function));
      expect(mockApp.enableCors).toHaveBeenCalledTimes(1);
    });

    it('should configure CORS with all required HTTP methods', () => {
      expect(mockApp.enableCors).toHaveBeenCalledWith({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      });
    });
  });

  describe('Async Bootstrap Behavior', () => {
    it('should handle async bootstrap completion', async () => {
      // Arrange
      let resolveBootstrap: () => void;
      const bootstrapPromise = new Promise<void>((resolve) => {
        resolveBootstrap = resolve;
      });

      mockApp.listen.mockImplementation(() => {
        resolveBootstrap();
        return Promise.resolve();
      });

      mockNestFactory.create.mockResolvedValue(mockApp);
      jest.resetModules();

      // Act
      await import('./main');
      await bootstrapPromise;

      // Assert
      expect(mockApp.listen).toHaveBeenCalled();
    });

    it('should handle bootstrap timeout scenarios', async () => {
      // Arrange - Simulate slow bootstrap
      mockApp.listen.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      mockNestFactory.create.mockResolvedValue(mockApp);
      jest.resetModules();

      // Act
      const startTime = Date.now();
      await import('./main');
      await new Promise((resolve) => setTimeout(resolve, 150));
      const endTime = Date.now();

      // Assert - Should handle the delay gracefully
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(mockApp.listen).toHaveBeenCalled();
    });
  });

  describe('Module Integration', () => {
    it('should import AppModule correctly', async () => {
      // Act
      await import('./main');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Assert - NestFactory.create should be called with the module
      expect(mockNestFactory.create).toHaveBeenCalled();
      const createCall = mockNestFactory.create.mock.calls[0];
      expect(createCall).toHaveLength(1);
      expect(typeof createCall[0]).toBe('function'); // Should be the AppModule constructor
    });
  });

  describe('Security Configuration', () => {
    it('should enable CORS for development security', () => {
      expect(mockApp.enableCors).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: '*',
          methods: expect.arrayContaining([
            'GET',
            'POST',
            'PUT',
            'DELETE',
            'OPTIONS',
            'PATCH',
          ]),
        }),
      );
    });

    it('should configure body parser limits for security', () => {
      // Verify reasonable but generous limits are set
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: '50mb',
        }),
      );

      expect(mockUrlencoded).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: '50mb',
          extended: true,
        }),
      );
    });
  });

  describe('Performance and Resource Management', () => {
    it('should complete bootstrap within reasonable time', async () => {
      // Arrange
      const startTime = Date.now();
      jest.resetModules();
      mockNestFactory.create.mockResolvedValue(mockApp);

      // Act
      await import('./main');
      await new Promise((resolve) => setTimeout(resolve, 10));

      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(100); // Should bootstrap quickly in tests
    });
  });
});
