/**
 * Simple Jest Setup Configuration
 *
 * This file provides basic setup for Jest tests without complex dependencies.
 * Used as fallback when the full setup.ts causes issues.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import 'reflect-metadata';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.BYTEBOT_TEST_MODE = 'true';

// Global test timeout
jest.setTimeout(30000);

// Export for potential use in tests
export const testEnvironment = {
  isTest: true,
  timeout: 30000,
};
