/**
 * Simple Jest Setup Configuration - Gold Standard Template
 *
 * This file provides basic setup for Jest tests without complex dependencies.
 * Used as the primary setup file for all Bytebot packages.
 *
 * @author Claude Code (Extracted from BytebotD)
 * @version 2.0.0
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

/**
 * USAGE INSTRUCTIONS:
 *
 * 1. Place this file at: src/test-utils/simple-setup.ts
 * 2. Reference in jest.config.js: setupFiles: ['<rootDir>/src/test-utils/simple-setup.ts']
 * 3. Customize environment variables as needed for your package
 */
