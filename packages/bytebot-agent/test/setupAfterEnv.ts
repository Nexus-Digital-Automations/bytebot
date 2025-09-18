/**
 * Jest Setup After Environment
 *
 * Global test environment setup that runs after the test environment is set up.
 * Configures global test utilities, mocks, and testing infrastructure.
 *
 * @fileoverview Test environment setup for bytebot-agent package
 */

// Global test timeout for async operations
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise during testing

// Global test utilities - Extend Jest matchers interface
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Expect {
      toBeValidUuid(): any;
      toBeValidEmail(): any;
      toBeValidDate(): any;
    }
    interface Matchers<R> {
      toBeValidUuid(): R;
      toBeValidEmail(): R;
      toBeValidDate(): R;
    }
    interface InverseAsymmetricMatchers {
      toBeValidUuid(): any;
      toBeValidEmail(): any;
      toBeValidDate(): any;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidUuid(received: string) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);

    return {
      message: () =>
        `expected ${received} ${pass ? 'not ' : ''}to be a valid UUID`,
      pass,
    };
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = typeof received === 'string' && emailRegex.test(received);

    return {
      message: () =>
        `expected ${received} ${pass ? 'not ' : ''}to be a valid email`,
      pass,
    };
  },

  toBeValidDate(received: string | Date) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime());

    return {
      message: () =>
        `expected ${received} ${pass ? 'not ' : ''}to be a valid date`,
      pass,
    };
  },
});

// Global test cleanup
afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();

  // Reset modules to prevent state leakage between tests
  jest.resetModules();
});

// Global error handling for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optionally fail the test
  throw new Error(`Unhandled rejection: ${reason}`);
});

// Console override for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress noisy console output during tests unless explicitly needed
  console.error = jest.fn((message, ...args) => {
    // Only show errors that aren't expected test errors
    if (
      typeof message === 'string' &&
      !message.includes('Warning:') &&
      !message.includes('deprecated')
    ) {
      originalConsoleError(message, ...args);
    }
  });

  console.warn = jest.fn((message, ...args) => {
    // Suppress warnings during tests unless they're critical
    if (typeof message === 'string' && message.includes('CRITICAL')) {
      originalConsoleWarn(message, ...args);
    }
  });
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Database cleanup utilities (if applicable)
export const testUtils = {
  /**
   * Clean up test data after tests
   */
  async cleanup() {
    // Add any necessary cleanup logic here
  },

  /**
   * Create test fixtures
   */
  async createFixtures() {
    // Add any necessary fixture creation logic here
  },

  /**
   * Wait for async operations to complete
   */
  async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout = 5000,
  ): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const result = await condition();
      if (result) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  },
};

// Export for use in individual test files
export default testUtils;
