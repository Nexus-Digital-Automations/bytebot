/**
 * Simple Jest Setup Configuration - Bytebot-Agent
 *
 * This file provides basic setup for Jest tests in the Bytebot Agent package.
 * Configures authentication, task processing, and agent environment.
 *
 * @author Claude Code (Based on Gold Standard Template)
 * @version 2.0.0
 */

import 'reflect-metadata';

// Set test environment for Bytebot Agent
process.env.NODE_ENV = 'test';
process.env.BYTEBOT_TEST_MODE = 'true';
process.env.BYTEBOT_AGENT_TEST = 'true';

// Agent-specific test environment
process.env.JWT_SECRET =
  'test-jwt-secret-for-testing-only-must-be-at-least-32-characters-long';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
process.env.DATABASE_URL = 'file:./test.db';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// Disable external services in tests
process.env.DISABLE_EXTERNAL_SERVICES = 'true';
process.env.DISABLE_DATABASE_LOGGING = 'true';
process.env.DISABLE_METRICS_COLLECTION = 'true';

// Global test timeout
jest.setTimeout(30000);

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
}

// Export for potential use in tests
export const testEnvironment = {
  isTest: true,
  timeout: 30000,
  isAgent: true,
  hasAuth: true,
  hasDatabase: true,
  hasRedis: true,
};
