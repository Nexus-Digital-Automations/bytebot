/**
 * Simple Jest Setup Configuration - Shared Package
 *
 * This file provides basic setup for Jest tests in the Shared utilities package.
 * Configures security utilities, validation pipelines, and cross-package testing.
 *
 * @author Claude Code (Based on Gold Standard Template)
 * @version 2.0.0
 */

import "reflect-metadata";
import { jest } from "@jest/globals";

// Set test environment for Shared utilities
process.env.NODE_ENV = "test";
process.env.BYTEBOT_TEST_MODE = "true";
process.env.BYTEBOT_SHARED_TEST = "true";

// Security and validation test environment
process.env.SECURITY_TEST_MODE = "true";
process.env.VALIDATION_STRICT_MODE = "true";
process.env.SANITIZATION_LEVEL = "high";

// Crypto-related test environment
process.env.TEST_ENCRYPTION_KEY =
  "test-encryption-key-for-crypto-testing-only-32-chars";
process.env.TEST_JWT_SECRET =
  "test-jwt-secret-for-shared-utilities-testing-only";

// Global test timeout
jest.setTimeout(30000);

// Export for potential use in tests
export const testEnvironment = {
  isTest: true,
  timeout: 30000,
  isShared: true,
  hasSecurityUtils: true,
  hasValidation: true,
  hasCrypto: true,
  hassanitization: true,
};
