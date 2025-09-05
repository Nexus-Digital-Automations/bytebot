/**
 * Jest After Environment Setup
 *
 * Custom Jest matchers and test utilities that extend the testing framework.
 * This file runs after the test environment is set up and provides:
 * - Custom Jest matchers for domain-specific assertions
 * - Enhanced error reporting and debugging utilities
 * - Performance monitoring and profiling tools
 * - Test data validation helpers
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { expect } from '@jest/globals';

// Custom Jest matchers for BytebotD testing
expect.extend({
  /**
   * Validates operation ID format (action_timestamp_randomString)
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
   * Validates screenshot result structure
   */
  toBeValidScreenshotResult(received: unknown): jest.CustomMatcherResult {
    if (!received || typeof received !== 'object') {
      return {
        message: () => `Expected ${received} to be an object`,
        pass: false,
      };
    }

    const result = received as any;
    const hasImage = typeof result.image === 'string';
    const hasMetadata = result.metadata && typeof result.metadata === 'object';
    const hasValidTimestamp =
      hasMetadata && result.metadata.captureTime instanceof Date;
    const hasOperationId =
      hasMetadata && typeof result.metadata.operationId === 'string';

    const pass = hasImage && hasMetadata && hasValidTimestamp && hasOperationId;

    if (pass) {
      return {
        message: () =>
          `Expected ${received} not to be a valid screenshot result`,
        pass: true,
      };
    } else {
      const issues = [];
      if (!hasImage) issues.push('missing or invalid image');
      if (!hasMetadata) issues.push('missing metadata');
      if (!hasValidTimestamp) issues.push('missing or invalid captureTime');
      if (!hasOperationId) issues.push('missing or invalid operationId');

      return {
        message: () =>
          `Expected ${received} to be a valid screenshot result. Issues: ${issues.join(', ')}`,
        pass: false,
      };
    }
  },

  /**
   * Validates file operation result structure
   */
  toBeValidFileResult(
    received: unknown,
    operation: 'read' | 'write',
  ): jest.CustomMatcherResult {
    if (!received || typeof received !== 'object') {
      return {
        message: () => `Expected ${received} to be an object`,
        pass: false,
      };
    }

    const result = received as any;
    const hasSuccess = typeof result.success === 'boolean';
    const hasOperationId = typeof result.operationId === 'string';
    const hasTimestamp = result.timestamp instanceof Date;
    const hasMessage = typeof result.message === 'string';

    let operationSpecificChecks = true;
    const issues = [];

    if (operation === 'read') {
      const hasValidReadData = result.success
        ? typeof result.data === 'string' && typeof result.name === 'string'
        : true;
      operationSpecificChecks = hasValidReadData;
      if (!hasValidReadData) issues.push('missing read-specific data');
    } else if (operation === 'write') {
      const hasValidWriteData = result.success
        ? typeof result.path === 'string' && typeof result.size === 'number'
        : true;
      operationSpecificChecks = hasValidWriteData;
      if (!hasValidWriteData) issues.push('missing write-specific data');
    }

    const pass =
      hasSuccess &&
      hasOperationId &&
      hasTimestamp &&
      (result.success || hasMessage) &&
      operationSpecificChecks;

    if (pass) {
      return {
        message: () =>
          `Expected ${received} not to be a valid ${operation} file result`,
        pass: true,
      };
    } else {
      if (!hasSuccess) issues.push('missing or invalid success');
      if (!hasOperationId) issues.push('missing or invalid operationId');
      if (!hasTimestamp) issues.push('missing or invalid timestamp');
      if (!result.success && !hasMessage) issues.push('missing error message');

      return {
        message: () =>
          `Expected ${received} to be a valid ${operation} file result. Issues: ${issues.join(', ')}`,
        pass: false,
      };
    }
  },

  /**
   * Validates OCR operation result structure
   */
  toBeValidOcrResult(received: unknown): jest.CustomMatcherResult {
    if (!received || typeof received !== 'object') {
      return {
        message: () => `Expected ${received} to be an object`,
        pass: false,
      };
    }

    const result = received as any;
    const hasText = typeof result.text === 'string';
    const hasConfidence =
      typeof result.confidence === 'number' &&
      result.confidence >= 0 &&
      result.confidence <= 1;
    const hasProcessingTime =
      typeof result.processingTimeMs === 'number' &&
      result.processingTimeMs > 0;
    const hasMethod = typeof result.method === 'string';
    const hasOperationId = typeof result.operationId === 'string';
    const hasBoundingBoxes =
      !result.boundingBoxes || Array.isArray(result.boundingBoxes);

    const pass =
      hasText &&
      hasConfidence &&
      hasProcessingTime &&
      hasMethod &&
      hasOperationId &&
      hasBoundingBoxes;

    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid OCR result`,
        pass: true,
      };
    } else {
      const issues = [];
      if (!hasText) issues.push('missing or invalid text');
      if (!hasConfidence) issues.push('missing or invalid confidence');
      if (!hasProcessingTime)
        issues.push('missing or invalid processingTimeMs');
      if (!hasMethod) issues.push('missing or invalid method');
      if (!hasOperationId) issues.push('missing or invalid operationId');
      if (!hasBoundingBoxes) issues.push('invalid boundingBoxes format');

      return {
        message: () =>
          `Expected ${received} to be a valid OCR result. Issues: ${issues.join(', ')}`,
        pass: false,
      };
    }
  },
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

// Test data factories for common test objects
export const TestDataFactory = {
  /**
   * Creates a valid screenshot result object
   */
  createScreenshotResult(overrides: Partial<any> = {}): any {
    return {
      image: Buffer.from('fake-screenshot-data').toString('base64'),
      metadata: {
        captureTime: new Date(),
        operationId: `screenshot_${Date.now()}_abc1234`,
        format: 'png',
        width: 1920,
        height: 1080,
      },
      ...overrides,
    };
  },

  /**
   * Creates a valid file write result object
   */
  createFileWriteResult(success = true, overrides: Partial<any> = {}): any {
    const base = {
      success,
      operationId: `write_file_${Date.now()}_def5678`,
      timestamp: new Date(),
    };

    if (success) {
      return {
        ...base,
        message: 'File written successfully',
        path: '/tmp/test-file.txt',
        size: 1024,
        ...overrides,
      };
    } else {
      return {
        ...base,
        message: 'File write failed: Test error',
        ...overrides,
      };
    }
  },

  /**
   * Creates a valid file read result object
   */
  createFileReadResult(success = true, overrides: Partial<any> = {}): any {
    const base = {
      success,
      operationId: `read_file_${Date.now()}_ghi9012`,
      timestamp: new Date(),
    };

    if (success) {
      return {
        ...base,
        data: Buffer.from('test file content').toString('base64'),
        name: 'test-file.txt',
        size: 17,
        mediaType: 'text/plain',
        lastModified: new Date(Date.now() - 86400000), // 1 day ago
        ...overrides,
      };
    } else {
      return {
        ...base,
        message: 'File read failed: Test error',
        ...overrides,
      };
    }
  },

  /**
   * Creates a valid OCR result object
   */
  createOcrResult(overrides: Partial<any> = {}): any {
    return {
      text: 'Sample OCR extracted text',
      confidence: 0.95,
      processingTimeMs: 250,
      method: 'ANE',
      operationId: `ocr_${Date.now()}_jkl3456`,
      language: 'en',
      boundingBoxes: [
        {
          text: 'Sample',
          x: 100,
          y: 200,
          width: 80,
          height: 25,
          confidence: 0.98,
        },
        {
          text: 'OCR',
          x: 185,
          y: 200,
          width: 45,
          height: 25,
          confidence: 0.96,
        },
      ],
      ...overrides,
    };
  },

  /**
   * Creates a valid find text result object
   */
  createFindTextResult(found = true, overrides: Partial<any> = {}): any {
    const base = {
      found,
      processingTimeMs: 150,
      operationId: `find_text_${Date.now()}_mno7890`,
      searchCriteria: {
        text: 'search term',
        caseSensitive: false,
        wholeWord: false,
      },
    };

    if (found) {
      return {
        ...base,
        matches: [
          {
            text: 'search term',
            x: 300,
            y: 400,
            width: 120,
            height: 20,
            confidence: 0.92,
          },
        ],
        ...overrides,
      };
    } else {
      return {
        ...base,
        matches: [],
        ...overrides,
      };
    }
  },

  /**
   * Creates a valid enhanced screenshot result object
   */
  createEnhancedScreenshotResult(overrides: Partial<any> = {}): any {
    return {
      image: Buffer.from('fake-enhanced-screenshot-data').toString('base64'),
      processingTimeMs: 450,
      enhancementsApplied: ['screenshot', 'ocr', 'text_detection'],
      operationId: `enhanced_screenshot_${Date.now()}_pqr4567`,
      ocr: this.createOcrResult(),
      textDetection: {
        regions: [
          {
            text: 'detected text',
            x: 50,
            y: 75,
            width: 200,
            height: 30,
            confidence: 0.89,
          },
        ],
      },
      ...overrides,
    };
  },
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
};

// Export test configuration for use in other files
export const testConfig = {
  slowTestThreshold: 5000,
  memoryLeakThreshold: 50 * 1024 * 1024,
  timeout: 30000,
};
