/**
 * Test Utils Index - Centralized Export for BytebotD Testing Utilities
 *
 * This file provides a single import point for all testing utilities:
 * - Setup and configuration helpers
 * - Mock implementations and factories
 * - Custom Jest matchers and assertions
 * - NestJS testing utilities
 * - Performance and debugging tools
 *
 * Usage:
 * ```typescript
 * import { TestUtils, createMockService, mockDecorators } from '@/test-utils';
 * ```
 *
 * @author Claude Code
 * @version 1.0.0
 */

// Import utilities from setup files
import { TestUtils as SetupTestUtils } from './setup';
import { TestUtils as AfterEnvTestUtils, TestDataFactory } from './setupAfterEnv';
import { testUtils } from './nestjs-mocks';

// Re-export setup utilities (use SetupTestUtils as the primary TestUtils export)
export { TestUtils } from './setup';
export { TestDataFactory } from './setupAfterEnv';

// Re-export NestJS mocking utilities
export {
  MockTestingModuleBuilder,
  createMockService,
  createMockRepository,
  createMockLogger,
  createMockWebSocketServer,
  createMockWebSocketClient,
  createMockHttpContext,
  createMockExecutionContext,
  createMockGuard,
  createMockInterceptor,
  createMockPipe,
  createMockFilter,
  createMockApplication,
  testUtils,
  mockDecorators,
} from './nestjs-mocks';

// TestDataFactory is exported from setupAfterEnv.ts to avoid duplication

/**
 * Assertion helpers for common test patterns
 */
export const AssertionHelpers = {
  /**
   * Assert that an operation result has required fields
   */
  expectValidOperationResult: (result: any, expectedFields: string[] = []) => {
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');

    // Check common fields
    if (result.operationId) {
      // Use custom matcher if available, otherwise use regex
      const operationIdPattern = /^[a-z_]+_\d{13}_[a-z0-9]{7}$/;
      expect(result.operationId).toMatch(operationIdPattern);
    }
    if (result.timestamp) {
      expect(result.timestamp).toBeInstanceOf(Date);
    }

    // Check custom fields
    expectedFields.forEach((field) => {
      expect(result).toHaveProperty(field);
    });
  },

  /**
   * Assert that a mock service method was called correctly
   */
  expectServiceMethodCall: (
    mockMethod: jest.MockedFunction<any>,
    expectedCallCount: number = 1,
    expectedArgs?: any[],
  ) => {
    expect(mockMethod).toHaveBeenCalledTimes(expectedCallCount);
    if (expectedArgs) {
      expect(mockMethod).toHaveBeenCalledWith(...expectedArgs);
    }
  },

  /**
   * Assert that an error has expected structure
   */
  expectValidError: (
    error: any,
    expectedMessage?: string,
    expectedCode?: string,
  ) => {
    expect(error).toBeInstanceOf(Error);
    if (expectedMessage) {
      expect(error.message).toContain(expectedMessage);
    }
    if (expectedCode) {
      expect(error.code).toBe(expectedCode);
    }
  },

  /**
   * Assert that coordinates are valid
   */
  expectValidCoordinates: (coords: any) => {
    expect(coords).toBeDefined();
    expect(typeof coords).toBe('object');
    expect(coords).toHaveProperty('x');
    expect(coords).toHaveProperty('y');
    expect(coords.x).toBeGreaterThanOrEqual(0);
    expect(coords.y).toBeGreaterThanOrEqual(0);
  },

  /**
   * Assert that screenshot result is valid
   */
  expectValidScreenshot: (screenshot: any) => {
    expect(screenshot).toBeDefined();
    expect(typeof screenshot).toBe('object');
    expect(screenshot).toHaveProperty('image');
    expect(screenshot).toHaveProperty('metadata');
    expect(screenshot.image).toBeDefined();
    expect(typeof screenshot.image).toBe('string');
    // Validate base64 format
    expect(screenshot.image).toMatch(/^[A-Za-z0-9+/=]+$/);
  },

  /**
   * Assert performance metrics are within acceptable ranges
   */
  expectPerformanceWithinLimits: (
    metrics: any,
    maxDurationMs: number = 5000,
    minSuccessRate: number = 0.95,
  ) => {
    expect(metrics.duration).toBeLessThanOrEqual(maxDurationMs);
    if (metrics.successRate !== undefined) {
      expect(metrics.successRate).toBeGreaterThanOrEqual(minSuccessRate);
    }
  },
};

/**
 * Mock data providers for different test scenarios
 */
export const MockDataProviders = {
  /**
   * Provide mock data for mouse operations
   */
  mouseOperations: {
    move: () => ({ action: 'move_mouse', coordinates: { x: 100, y: 200 } }),
    click: () => ({ action: 'click_mouse', button: 'left', clickCount: 1 }),
    drag: () => ({
      action: 'drag_mouse',
      path: [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ],
      button: 'left',
    }),
    scroll: () => ({ action: 'scroll', direction: 'up', scrollCount: 3 }),
  },

  /**
   * Provide mock data for keyboard operations
   */
  keyboardOperations: {
    typeText: () => ({ action: 'type_text', text: 'Hello World' }),
    pressKeys: () => ({
      action: 'press_keys',
      keys: ['ctrl', 'c'],
      press: 'down',
    }),
    typeKeys: () => ({ action: 'type_keys', keys: ['a', 'b', 'c'] }),
  },

  /**
   * Provide mock data for file operations
   */
  fileOperations: {
    read: () => ({
      action: 'read_file',
      path: '/home/user/test.txt',
    }),
    write: () => ({
      action: 'write_file',
      path: '/home/user/output.txt',
      data: Buffer.from('test content').toString('base64'),
    }),
  },

  /**
   * Provide mock data for CUA operations
   */
  cuaOperations: {
    ocr: () => ({ action: 'ocr', language: 'en' }),
    findText: () => ({ action: 'find_text', text: 'search term' }),
    enhancedScreenshot: () => ({
      action: 'enhanced_screenshot',
      includeOcr: true,
      includeTextDetection: false,
    }),
  },
};

/**
 * Test environment helpers
 */
export const TestEnvironment = {
  /**
   * Check if running in CI environment
   */
  isCI: () =>
    Boolean(
      process.env.CI || process.env.GITHUB_ACTIONS || process.env.JENKINS_URL,
    ),

  /**
   * Check if running in debug mode
   */
  isDebug: () => Boolean(process.env.DEBUG || process.env.NODE_ENV === 'debug'),

  /**
   * Get test worker ID
   */
  getWorkerId: () => process.env.JEST_WORKER_ID || '1',

  /**
   * Check if running in parallel mode
   */
  isParallel: () => parseInt(process.env.JEST_WORKER_ID || '1', 10) > 1,

  /**
   * Get memory constraints for current test environment
   */
  getMemoryLimits: () => ({
    maxHeapUsed:
      process.env.NODE_ENV === 'ci' ? 512 * 1024 * 1024 : 1024 * 1024 * 1024, // 512MB in CI, 1GB local
    maxRSS:
      process.env.NODE_ENV === 'ci' ? 1024 * 1024 * 1024 : 2048 * 1024 * 1024, // 1GB in CI, 2GB local
  }),
};

/**
 * Default export with all utilities
 */
export default {
  TestUtils: SetupTestUtils,
  TestDataFactory,
  AssertionHelpers,
  MockDataProviders,
  TestEnvironment,
  testUtils,
};
