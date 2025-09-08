/**
 * Jest After Environment Setup - Gold Standard Template
 *
 * Custom Jest matchers and test utilities that extend the testing framework.
 * This file runs after the test environment is set up and provides:
 * - Custom Jest matchers for domain-specific assertions
 * - Enhanced error reporting and debugging utilities
 * - Performance monitoring and profiling tools
 * - Test data validation helpers
 *
 * @author Claude Code (Extracted from BytebotD)
 * @version 2.0.0
 */

import { expect } from '@jest/globals';

// Custom Jest matchers - CUSTOMIZE THESE FOR YOUR DOMAIN
expect.extend({
  /**
   * Example: Validates operation ID format (action_timestamp_randomString)
   * REPLACE THIS with your domain-specific validation
   */
  toBeValidOperationId(received: unknown): jest.CustomMatcherResult {
    const pass =
      typeof received === 'string' &&
      /^[a-z_]+_\d{13}_[a-z0-9]{7}$/.test(received);

    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid operation ID`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected ${received} to be a valid operation ID (format: action_timestamp_randomString)`,
        pass: false,
      };
    }
  },

  /**
   * Validates base64 string format
   */
  toBeValidBase64(received: unknown): jest.CustomMatcherResult {
    if (typeof received !== 'string') {
      return {
        message: () => `Expected ${received} to be a string`,
        pass: false,
      };
    }

    try {
      // Test if string can be decoded as base64
      const decoded = Buffer.from(received, 'base64').toString('base64');
      const pass = decoded === received;

      if (pass) {
        return {
          message: () => `Expected ${received} not to be valid base64`,
          pass: true,
        };
      } else {
        return {
          message: () => `Expected ${received} to be valid base64`,
          pass: false,
        };
      }
    } catch (error) {
      return {
        message: () =>
          `Expected ${received} to be valid base64, but decoding failed: ${error}`,
        pass: false,
      };
    }
  },

  /**
   * Validates execution time is within reasonable bounds
   */
  toHaveReasonableExecutionTime(
    received: { processingTimeMs?: number; duration?: number } | number,
    maxMs: number,
  ): jest.CustomMatcherResult {
    let executionTime: number;

    if (typeof received === 'number') {
      executionTime = received;
    } else if (received && typeof received === 'object') {
      executionTime = received.processingTimeMs || received.duration || 0;
    } else {
      return {
        message: () =>
          `Expected ${received} to have processingTimeMs, duration property, or be a number`,
        pass: false,
      };
    }

    const pass = executionTime > 0 && executionTime <= maxMs;

    if (pass) {
      return {
        message: () =>
          `Expected execution time ${executionTime}ms not to be within reasonable bounds (0-${maxMs}ms)`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected execution time ${executionTime}ms to be within reasonable bounds (0-${maxMs}ms)`,
        pass: false,
      };
    }
  },

  /**
   * ADD YOUR CUSTOM MATCHERS HERE
   * Examples:
   * - toBeValidApiResponse
   * - toHaveValidStructure
   * - toBeWithinRange
   * - toMatchSchema
   */
});

// Performance monitoring utilities
const performanceMonitor = {
  slowTestThreshold: 5000, // 5 seconds
  memoryLeakThreshold: 50 * 1024 * 1024, // 50MB

  logSlowTest(testName: string, duration: number): void {
    if (duration > this.slowTestThreshold) {
      console.warn(`⚠️ Slow test detected: "${testName}" took ${duration}ms`);
    }
  },

  logMemoryUsage(
    testName: string,
    before: NodeJS.MemoryUsage,
    after: NodeJS.MemoryUsage,
  ): void {
    const heapDelta = after.heapUsed - before.heapUsed;
    if (heapDelta > this.memoryLeakThreshold) {
      console.warn(
        `⚠️ Memory leak detected in "${testName}": +${Math.round(heapDelta / 1024 / 1024)}MB heap`,
      );
    }
  },
};

// Global test hooks for performance monitoring
let testStartTime: number;
let testStartMemory: NodeJS.MemoryUsage;

beforeEach(() => {
  testStartTime = Date.now();
  testStartMemory = process.memoryUsage();
});

afterEach(() => {
  const testName = expect.getState().currentTestName || 'unknown';
  const duration = Date.now() - testStartTime;
  const endMemory = process.memoryUsage();

  performanceMonitor.logSlowTest(testName, duration);
  performanceMonitor.logMemoryUsage(testName, testStartMemory, endMemory);
});

// Test data factories for common test objects - CUSTOMIZE FOR YOUR DOMAIN
export const TestDataFactory = {
  /**
   * EXAMPLE: Creates a valid API response object
   * REPLACE WITH YOUR DOMAIN-SPECIFIC FACTORIES
   */
  createApiResponse(success = true, overrides: Partial<any> = {}): any {
    const base = {
      success,
      timestamp: new Date(),
      operationId: `api_call_${Date.now()}_abc1234`,
    };

    if (success) {
      return {
        ...base,
        message: 'Operation completed successfully',
        data: { result: 'test data' },
        ...overrides,
      };
    } else {
      return {
        ...base,
        message: 'Operation failed: Test error',
        error: { code: 'TEST_ERROR', details: 'Test error details' },
        ...overrides,
      };
    }
  },

  /**
   * ADD YOUR DOMAIN-SPECIFIC FACTORIES HERE
   * Examples:
   * - createUser
   * - createProduct
   * - createOrder
   * - createMessage
   */
};

// Export test utilities for use in test files
export const TestUtils = {
  performanceMonitor,
  TestDataFactory,

  /**
   * Waits for a condition to become true with timeout
   */
  async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeout = 5000,
    interval = 100,
  ): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  },

  /**
   * Creates a temporary test directory
   */
  async createTempDir(prefix = 'bytebot-test'): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');

    const tempDir = path.join(
      os.tmpdir(),
      `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    );
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  },

  /**
   * Cleans up test artifacts
   */
  async cleanup(paths: string[]): Promise<void> {
    const fs = await import('fs/promises');

    for (const path of paths) {
      try {
        await fs.rm(path, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to cleanup ${path}:`, error);
      }
    }
  },

  /**
   * ADD YOUR UTILITY FUNCTIONS HERE
   * Examples:
   * - mockApiCall
   * - createTestServer
   * - generateTestData
   * - validateSchema
   */
};

// Export test configuration for use in other files
export const testConfig = {
  slowTestThreshold: 5000,
  memoryLeakThreshold: 50 * 1024 * 1024,
  timeout: 30000,
};

/**
 * CUSTOMIZATION INSTRUCTIONS:
 *
 * 1. Replace example custom matchers with your domain-specific validations
 * 2. Add your test data factories in TestDataFactory
 * 3. Extend TestUtils with your utility functions
 * 4. Adjust performance thresholds in performanceMonitor
 * 5. Add any global test setup/teardown logic as needed
 *
 * USAGE:
 *
 * In your test files:
 * import { TestUtils, TestDataFactory } from '../test-utils/setupAfterEnv';
 *
 * Using custom matchers:
 * expect(operationId).toBeValidOperationId();
 * expect(base64String).toBeValidBase64();
 * expect(response).toHaveReasonableExecutionTime(1000);
 */
