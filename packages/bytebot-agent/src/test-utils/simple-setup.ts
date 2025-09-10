/**
 * Simple Jest Setup Configuration - Bytebot-Agent
 *
 * This file provides comprehensive setup for Jest tests in the Bytebot Agent package.
 * Configures authentication, task processing, agent environment, and logging.
 *
 * Key Features:
 * - Test environment configuration with all required variables
 * - Console warning suppression for clean test output
 * - Jest timeout configuration for complex operations
 * - Database and Redis test configuration
 * - External service disabling for isolated testing
 *
 * @author Claude Code (Enhanced Professional Version)
 * @version 3.0.0
 * @lastUpdated September 10, 2025
 */

import 'reflect-metadata';

/**
 * Jest global declaration for TypeScript compatibility
 * This ensures jest.setTimeout and other Jest globals are properly typed
 * Note: Using namespace here is the correct TypeScript pattern for global augmentation
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      jest: typeof jest;
    }
  }
}

// Logging setup start
console.log('[TEST-SETUP] Initializing Bytebot Agent test environment...');

// Set test environment for Bytebot Agent
process.env.NODE_ENV = 'test';
process.env.BYTEBOT_TEST_MODE = 'true';
process.env.BYTEBOT_AGENT_TEST = 'true';
console.log('[TEST-SETUP] Core environment variables configured');

// Agent-specific test environment
process.env.JWT_SECRET =
  'test-jwt-secret-for-testing-only-must-be-at-least-32-characters-long';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
process.env.DATABASE_URL = 'file:./test.db';
process.env.REDIS_URL = 'redis://localhost:6379/1';
console.log('[TEST-SETUP] Authentication and database variables configured');

// Disable external services in tests
process.env.DISABLE_EXTERNAL_SERVICES = 'true';
process.env.DISABLE_DATABASE_LOGGING = 'true';
process.env.DISABLE_METRICS_COLLECTION = 'true';
console.log('[TEST-SETUP] External services disabled for isolated testing');

// Global test timeout
jest.setTimeout(30000);
console.log('[TEST-SETUP] Jest timeout configured to 30 seconds');

// Suppress console warnings in tests unless debugging
if (!process.env.DEBUG_TESTS) {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    // Allow specific test warnings through
    const message =
      typeof args[0] === 'string'
        ? args[0]
        : args[0] != null
          ? JSON.stringify(args[0])
          : '';
    if (
      message.includes('Slow test detected') ||
      message.includes('Memory leak detected')
    ) {
      originalWarn(...args);
    }
    // Suppress other console warnings in tests
  };
  console.log(
    '[TEST-SETUP] Console warning suppression enabled (use DEBUG_TESTS=true to disable)',
  );
} else {
  console.log(
    '[TEST-SETUP] Debug mode enabled - all console warnings will be shown',
  );
}

// Export for potential use in tests
export const testEnvironment = {
  isTest: true,
  timeout: 30000,
  isAgent: true,
  hasAuth: true,
  hasDatabase: true,
  hasRedis: true,
  setupVersion: '3.0.0',
  setupTimestamp: new Date().toISOString(),
} as const;

console.log('[TEST-SETUP] Test environment configuration complete');
console.log('[TEST-SETUP] Available exports:', Object.keys(testEnvironment));
