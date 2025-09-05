/**
 * Jest Setup Configuration
 *
 * Global test environment setup for BytebotD test suite.
 * This file runs before any test files are executed and configures:
 * - Environment variables
 * - Global test utilities
 * - Mock configurations
 * - Performance optimizations
 * - Resource management
 *
 * @author Claude Code
 * @version 1.0.0
 */

// Global type declarations
declare global {
  var testUtils: {
    performanceMetrics: any;
    createTestBuffer: (content: string) => Buffer;
    createMockDate: (offset?: number) => Date;
    waitFor: (condition: () => boolean, timeout?: number) => Promise<void>;
  };
}

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
process.env.JEST_WORKER_ID = process.env.JEST_WORKER_ID || '1';

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Configure global test utilities
global.console = {
  ...console,
  // Suppress console output during tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn, // Keep warnings visible
  error: console.error, // Keep errors visible
};

// Mock external dependencies that should not run in test environment
jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn(() => ({
    unref: jest.fn(),
    on: jest.fn(),
    kill: jest.fn(),
  })),
  execSync: jest.fn(),
  spawnSync: jest.fn(),
}));

// Mock file system operations with safe test behavior
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('test file content')),
  unlink: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({
    isFile: () => true,
    isDirectory: () => false,
    size: 1024,
    mtime: new Date(),
  }),
  access: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
}));

// Mock util promisify for exec operations
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: jest.fn(() =>
    jest.fn().mockResolvedValue({
      stdout: 'mocked command output',
      stderr: '',
    }),
  ),
}));

// Mock @nut-tree-fork/nut-js library for computer automation
jest.mock('@nut-tree-fork/nut-js', () => ({
  keyboard: {
    pressKey: jest.fn().mockResolvedValue(undefined),
    releaseKey: jest.fn().mockResolvedValue(undefined),
    config: { autoDelayMs: 100 },
  },
  mouse: {
    setPosition: jest.fn().mockResolvedValue(undefined),
    click: jest.fn().mockResolvedValue(undefined),
    pressButton: jest.fn().mockResolvedValue(undefined),
    releaseButton: jest.fn().mockResolvedValue(undefined),
    scrollUp: jest.fn().mockResolvedValue(undefined),
    scrollDown: jest.fn().mockResolvedValue(undefined),
    scrollLeft: jest.fn().mockResolvedValue(undefined),
    scrollRight: jest.fn().mockResolvedValue(undefined),
    getPosition: jest.fn().mockResolvedValue({ x: 100, y: 200 }),
    config: { autoDelayMs: 100 },
  },
  screen: {
    capture: jest.fn().mockResolvedValue(undefined),
  },
  Point: jest.fn().mockImplementation((x: number, y: number) => ({ x, y })),
  Key: {
    // Essential keys for testing
    A: 'A',
    B: 'B',
    C: 'C',
    D: 'D',
    E: 'E',
    F: 'F',
    G: 'G',
    H: 'H',
    I: 'I',
    J: 'J',
    K: 'K',
    L: 'L',
    M: 'M',
    N: 'N',
    O: 'O',
    P: 'P',
    Q: 'Q',
    R: 'R',
    S: 'S',
    T: 'T',
    U: 'U',
    V: 'V',
    W: 'W',
    X: 'X',
    Y: 'Y',
    Z: 'Z',
    Num0: 'Num0',
    Num1: 'Num1',
    Num2: 'Num2',
    Num3: 'Num3',
    Num4: 'Num4',
    Num5: 'Num5',
    Num6: 'Num6',
    Num7: 'Num7',
    Num8: 'Num8',
    Num9: 'Num9',
    Space: 'Space',
    Enter: 'Enter',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Tab: 'Tab',
    Escape: 'Escape',
    LeftShift: 'LeftShift',
    RightShift: 'RightShift',
    LeftControl: 'LeftControl',
    RightControl: 'RightControl',
    LeftAlt: 'LeftAlt',
    RightAlt: 'RightAlt',
  },
  Button: {
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
    MIDDLE: 'MIDDLE',
  },
  FileType: {
    PNG: 'PNG',
  },
}));

// Performance monitoring setup
const performanceMetrics = {
  testStartTime: Date.now(),
  slowTests: new Map<string, number>(),
  memoryUsage: new Map<string, NodeJS.MemoryUsage>(),
};

// Global performance tracking
beforeEach(() => {
  const testName = expect.getState().currentTestName || 'unknown';
  performanceMetrics.memoryUsage.set(testName, process.memoryUsage());
});

afterEach(() => {
  const testName = expect.getState().currentTestName || 'unknown';
  const startMemory = performanceMetrics.memoryUsage.get(testName);

  if (startMemory) {
    const endMemory = process.memoryUsage();
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    // Log memory leaks exceeding 10MB
    if (memoryDelta > 10 * 1024 * 1024) {
      console.warn(
        `Potential memory leak detected in test "${testName}": ${Math.round(memoryDelta / 1024 / 1024)}MB`,
      );
    }
  }
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Test utilities for global access
global.testUtils = {
  performanceMetrics,

  // Utility to create test files
  createTestBuffer: (content: string): Buffer => Buffer.from(content, 'utf8'),

  // Utility to create mock timestamps
  createMockDate: (offset = 0): Date => new Date(Date.now() + offset),

  // Utility to wait for async operations
  waitFor: async (condition: () => boolean, timeout = 5000): Promise<void> => {
    const start = Date.now();
    while (!condition() && Date.now() - start < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!condition()) {
      throw new Error(`Timeout waiting for condition after ${timeout}ms`);
    }
  },
};

// Extend Jest matchers with custom assertions

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidOperationId(): R;
      toBeValidBase64(): R;
      toHaveReasonableExecutionTime(_maxMs: number): R;
      toBeValidScreenshotResult(): R;
      toBeValidFileResult(_operation: 'read' | 'write'): R;
      toBeValidOcrResult(): R;
    }
  }
}

// Export TestUtils for use in other files
export const TestUtils = global.testUtils;

export {};
