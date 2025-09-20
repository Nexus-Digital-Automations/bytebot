/**
 * Jest After Environment Setup - Bytebot-Agent
 *
 * Custom Jest matchers and test utilities for Bytebot Agent package:
 * - Authentication response validation
 * - Task processing matchers
 * - Agent workflow assertions
 * - API response validation
 * - Performance monitoring
 *
 * @author Claude Code (Based on Gold Standard Template)
 * @version 2.0.0
 */

import { expect } from '@jest/globals';

// Custom Jest matchers for Bytebot Agent domain
expect.extend({
  /**
   * Validates JWT token format for authentication
   */
  toBeValidJWT(received: unknown): jest.CustomMatcherResult {
    if (typeof received !== 'string') {
      return {
        message: () => {
          const receivedStr =
            typeof received === 'object' && received !== null
              ? JSON.stringify(received)
              : typeof received === 'string'
                ? received
                : typeof received === 'number' || typeof received === 'boolean'
                  ? received.toString()
                  : 'unknown';
          return `Expected ${receivedStr} to be a string`;
        },
        pass: false,
      };
    }

    // JWT pattern: header.payload.signature
    const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
    const pass = jwtPattern.test(received);

    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid JWT token`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected ${received} to be a valid JWT token (format: header.payload.signature)`,
        pass: false,
      };
    }
  },

  /**
   * Validates agent task structure
   */
  toBeValidAgentTask(received: unknown): jest.CustomMatcherResult {
    if (typeof received !== 'object' || received === null) {
      return {
        message: () => {
          const receivedStr =
            typeof received === 'object' && received !== null
              ? JSON.stringify(received)
              : typeof received === 'string'
                ? received
                : typeof received === 'number' || typeof received === 'boolean'
                  ? received.toString()
                  : 'unknown';
          return `Expected ${receivedStr} to be an object`;
        },
        pass: false,
      };
    }

    const task = received as Record<string, unknown>;
    const requiredFields = ['id', 'status', 'type', 'createdAt'];
    const missingFields = requiredFields.filter((field) => !(field in task));

    if (missingFields.length === 0) {
      return {
        message: () =>
          `Expected task not to have all required fields: ${requiredFields.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected task to have all required fields: ${requiredFields.join(', ')}, missing: ${missingFields.join(', ')}`,
        pass: false,
      };
    }
  },

  /**
   * Validates API response structure
   */
  toBeValidApiResponse(received: unknown): jest.CustomMatcherResult {
    if (typeof received !== 'object' || received === null) {
      return {
        message: () => {
          const receivedStr =
            typeof received === 'object' && received !== null
              ? JSON.stringify(received)
              : typeof received === 'string'
                ? received
                : typeof received === 'number' || typeof received === 'boolean'
                  ? received.toString()
                  : 'unknown';
          return `Expected ${receivedStr} to be an object`;
        },
        pass: false,
      };
    }

    const response = received as Record<string, unknown>;
    const hasSuccess =
      'success' in response && typeof response.success === 'boolean';
    const hasTimestamp = 'timestamp' in response;
    const hasData = (response.success as boolean)
      ? 'data' in _response
      : 'error' in response;

    const pass = hasSuccess && hasTimestamp && hasData;

    if (pass) {
      return {
        message: () => `Expected response not to be a valid API response`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected response to be a valid API response with success, timestamp, and data/error fields`,
        pass: false,
      };
    }
  },

  /**
   * Validates agent processing time is reasonable
   */
  toHaveReasonableProcessingTime(
    received: { processingTimeMs?: number; duration?: number } | number,
    maxMs: number = 5000,
  ): jest.CustomMatcherResult {
    let executionTime: number;

    if (typeof received === 'number') {
      executionTime = received;
    } else if (received && typeof received === 'object') {
      const typedReceived = received as {
        processingTimeMs?: number;
        duration?: number;
      };
      executionTime =
        typedReceived.processingTimeMs || typedReceived.duration || 0;
    } else {
      return {
        message: () => {
          const receivedStr = (() => {
            if (typeof received === 'object' && received !== null) {
              try {
                return JSON.stringify(received);
              } catch {
                return '[object Object]';
              }
            }
            if (typeof received === 'string') {
              return received;
            }
            if (typeof received === 'number' || typeof received === 'boolean') {
              return String(received);
            }
            return 'unknown';
          })();
          return `Expected ${receivedStr} to have processingTimeMs, duration property, or be a number`;
        },
        pass: false,
      };
    }

    const pass = executionTime > 0 && executionTime <= maxMs;

    if (pass) {
      return {
        message: () =>
          `Expected processing time ${executionTime}ms not to be within reasonable bounds (0-${maxMs}ms)`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected processing time ${executionTime}ms to be within reasonable bounds (0-${maxMs}ms)`,
        pass: false,
      };
    }
  },

  /**
   * Validates user ID format (UUID v4)
   */
  toBeValidUserId(received: unknown): jest.CustomMatcherResult {
    if (typeof received !== 'string') {
      return {
        message: () => {
          const receivedStr =
            typeof received === 'object' && received !== null
              ? JSON.stringify(received)
              : typeof received === 'string'
                ? received
                : typeof received === 'number' || typeof received === 'boolean'
                  ? received.toString()
                  : 'unknown';
          return `Expected ${receivedStr} to be a string`;
        },
        pass: false,
      };
    }

    const uuidV4Pattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidV4Pattern.test(received);

    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid UUID v4`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid UUID v4`,
        pass: false,
      };
    }
  },
});

// Performance monitoring utilities for Bytebot Agent
class PerformanceMonitor {
  readonly slowTestThreshold = 5000; // 5 seconds
  readonly memoryLeakThreshold = 50 * 1024 * 1024; // 50MB
  readonly agentTaskThreshold = 3000; // 3 seconds for agent tasks

  logSlowTest(testName: string, duration: number): void {
    if (duration > this.slowTestThreshold) {
      console.warn(`⚠️ Slow test detected: "${testName}" took ${duration}ms`);
    }
  }

  logSlowAgentTask(taskType: string, duration: number): void {
    if (duration > this.agentTaskThreshold) {
      console.warn(`⚠️ Slow agent task: "${taskType}" took ${duration}ms`);
    }
  }

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
  }
}

const performanceMonitor = new PerformanceMonitor();

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

// Test data factories for Bytebot Agent objects
export const TestDataFactory = {
  /**
   * Creates a valid authentication response
   */
  createAuthResponse(success = true, overrides: Partial<any> = {}): any {
    const base = {
      success,
      timestamp: new Date().toISOString(),
    };

    if (success) {
      return {
        ...base,
        data: {
          token:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
          user: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            email: 'test@example.com',
          },
          expiresIn: '1h',
        },
        ...overrides,
      };
    } else {
      return {
        ...base,
        error: {
          code: 'AUTH_FAILED',
          message: 'Authentication failed',
        },
        ...overrides,
      };
    }
  },

  /**
   * Creates a valid agent task
   */
  createAgentTask(overrides: Partial<any> = {}): any {
    return {
      id: '550e8400-e29b-41d4-a716-446655440001',
      status: 'pending',
      type: 'analysis',
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      payload: {
        action: 'analyze_document',
        parameters: { documentId: 'doc123' },
      },
      ...overrides,
    };
  },

  /**
   * Creates a valid API response
   */
  createApiResponse(success = true, overrides: Partial<any> = {}): any {
    const base = {
      success,
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
    };

    if (success) {
      return {
        ...base,
        data: { result: 'operation completed' },
        ...overrides,
      };
    } else {
      return {
        ...base,
        error: {
          code: 'OPERATION_FAILED',
          message: 'Operation failed',
          details: 'Test error details',
        },
        ...overrides,
      };
    }
  },

  /**
   * Creates a valid user object
   */
  createUser(overrides: Partial<any> = {}): any {
    return {
      id: '550e8400-e29b-41d4-a716-446655440002',
      email: 'testuser@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
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
      const result = condition();
      if (await Promise.resolve(result)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  },

  /**
   * Creates a temporary test directory
   */
  async createTempDir(prefix = 'bytebot-agent-test'): Promise<string> {
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
   * Mocks NestJS testing module
   */
  async createTestingModule(
    imports: unknown[] = [],
    providers: unknown[] = [],
  ): Promise<unknown> {
    const { Test } = await import('@nestjs/testing');

    return Test.createTestingModule({
      imports: imports as Parameters<
        typeof Test.createTestingModule
      >[0]['imports'],
      providers: providers as Parameters<
        typeof Test.createTestingModule
      >[0]['providers'],
    }).compile();
  },

  /**
   * Creates a mock JWT token for testing
   */
  createMockJWT(payload: any = {}): string {
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const payloadStr = Buffer.from(
      JSON.stringify({
        sub: '1234567890',
        name: 'John Doe',
        iat: 1516239022,
        ...payload,
      }),
    ).toString('base64url');
    const signature = 'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    return `${header}.${payloadStr}.${signature}`;
  },
};

// Export test configuration
export const testConfig = {
  slowTestThreshold: 5000,
  memoryLeakThreshold: 50 * 1024 * 1024,
  agentTaskThreshold: 3000,
  timeout: 30000,
};
