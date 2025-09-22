/**
 * Jest After Environment Setup - Shared Package
 *
 * Custom Jest matchers and test utilities for Shared package:
 * - Security validation matchers
 * - Sanitization testing utilities
 * - Cross-package type validation
 * - Crypto utility testing
 * - Performance monitoring for utilities
 *
 * @author Claude Code (Based on Gold Standard Template)
 * @version 2.0.0
 */

import { expect, jest } from "@jest/globals";

// Global test hooks
declare const beforeEach: (fn: () => void) => void;
declare const afterEach: (fn: () => void) => void;

// Type declarations for Jest custom matchers
interface CustomMatcherResult {
  pass: boolean;
  message: () => string;
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeSanitized(): R;
      toBeValidSecurityResult(): R;
      toBeValidEncryption(): R;
      toBeValidTypeDefinition(): R;
      toExecuteWithinTime(maxMs?: number): R;
    }
  }
}

// Custom Jest matchers for Shared utilities domain
expect.extend({
  /**
   * Validates that input has been properly sanitized
   */
  toBeSanitized(received: unknown): CustomMatcherResult {
    if (typeof received !== "string") {
      return {
        message: () => `Expected ${received} to be a string`,
        pass: false,
      };
    }

    // Check for common XSS patterns that should be sanitized
    const dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi,
    ];

    const hasDangerousContent = dangerousPatterns.some((pattern) =>
      pattern.test(received),
    );

    if (!hasDangerousContent) {
      return {
        message: () => `Expected "${received}" not to be properly sanitized`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected "${received}" to be sanitized (contains dangerous patterns)`,
        pass: false,
      };
    }
  },

  /**
   * Validates security validation result structure
   */
  toBeValidSecurityResult(received: unknown): CustomMatcherResult {
    if (typeof received !== "object" || received === null) {
      return {
        message: () => `Expected ${received} to be an object`,
        pass: false,
      };
    }

    const result = received as Record<string, unknown>;
    const hasIsValid =
      "isValid" in result && typeof result.isValid === "boolean";
    const hasThreats = "threats" in result && Array.isArray(result.threats);
    const hasSeverity =
      "severity" in result && typeof result.severity === "string";

    const pass = hasIsValid && hasThreats && hasSeverity;

    if (pass) {
      return {
        message: () => `Expected security result not to be valid`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected security result to have isValid (boolean), threats (array), and severity (string)`,
        pass: false,
      };
    }
  },

  /**
   * Validates encryption/decryption operations
   */
  toBeValidEncryption(received: unknown): CustomMatcherResult {
    if (typeof received !== "string") {
      return {
        message: () => `Expected ${received} to be a string`,
        pass: false,
      };
    }

    // Check if it looks like encrypted data (base64 or hex)
    const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
    const hexPattern = /^[0-9a-fA-F]+$/;
    const isEncrypted =
      base64Pattern.test(received) || hexPattern.test(received);

    // Should not contain obvious plaintext patterns
    const containsPlaintext =
      /^[a-zA-Z0-9\s.]+$/.test(received) && received.length < 50;

    const pass = isEncrypted && !containsPlaintext;

    if (pass) {
      return {
        message: () => `Expected "${received}" not to be valid encryption`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected "${received}" to be valid encryption (base64 or hex, not plaintext)`,
        pass: false,
      };
    }
  },

  /**
   * Validates type definition structure
   */
  toBeValidTypeDefinition(received: unknown): CustomMatcherResult {
    if (typeof received !== "object" || received === null) {
      return {
        message: () => `Expected ${received} to be an object`,
        pass: false,
      };
    }

    // Check if it has typical type definition properties
    const hasProperties = Object.keys(received).length > 0;
    const hasValidPropertyTypes = Object.values(received).every(
      (value) =>
        typeof value === "string" ||
        typeof value === "function" ||
        typeof value === "object" ||
        value === null ||
        value === undefined,
    );

    const pass = hasProperties && hasValidPropertyTypes;

    if (pass) {
      return {
        message: () => `Expected type definition not to be valid`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected valid type definition with properties and valid types`,
        pass: false,
      };
    }
  },

  /**
   * Validates utility function performance
   */
  toExecuteWithinTime(
    received: () => unknown,
    maxMs: number = 10,
  ): CustomMatcherResult {
    const startTime = performance.now();

    try {
      received();
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      const pass = executionTime <= maxMs;

      if (pass) {
        return {
          message: () =>
            `Expected function not to execute within ${maxMs}ms (took ${executionTime.toFixed(2)}ms)`,
          pass: true,
        };
      } else {
        return {
          message: () =>
            `Expected function to execute within ${maxMs}ms, but took ${executionTime.toFixed(2)}ms`,
          pass: false,
        };
      }
    } catch (err) {
      return {
        message: () =>
          `Expected function to execute successfully, but threw error: ${err}`,
        pass: false,
      };
    }
  },
});

// Performance monitoring utilities for shared utilities
const performanceMonitor = {
  slowUtilityThreshold: 10, // 10ms for utility functions
  memoryLeakThreshold: 10 * 1024 * 1024, // 10MB for utilities
  cryptoOperationThreshold: 50, // 50ms for crypto operations

  logSlowUtility(utilityName: string, duration: number): void {
    if (duration > this.slowUtilityThreshold) {
      console.warn(
        `⚠️ Slow utility detected: "${utilityName}" took ${duration.toFixed(2)}ms`,
      );
    }
  },

  logSlowCryptoOperation(operationType: string, duration: number): void {
    if (duration > this.cryptoOperationThreshold) {
      console.warn(
        `⚠️ Slow crypto operation: "${operationType}" took ${duration.toFixed(2)}ms`,
      );
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
  const testName = expect.getState().currentTestName || "unknown";
  const duration = Date.now() - testStartTime;
  const endMemory = process.memoryUsage();

  performanceMonitor.logSlowUtility(testName, duration);
  performanceMonitor.logMemoryUsage(testName, testStartMemory, endMemory);
});

// Test data factories for Shared utilities
// Type definitions for test data
interface SecurityTestData {
  maliciousInputs: string[];
  cleanInputs: string[];
  [key: string]: unknown;
}

interface CryptoTestData {
  plaintext: string;
  key: string;
  keys?: {
    valid: string[];
    invalid: string[];
  };
  algorithms?: string[];
  invalidKeys: string[];
  sensitiveData: {
    password: string;
    token: string;
    apiKey: string;
  };
  [key: string]: unknown;
}

interface ValidationTestData {
  validEmails: string[];
  invalidEmails: string[];
  validUUIDs: string[];
  invalidUUIDs: string[];
  [key: string]: unknown;
}

interface TypeTestData {
  validTypes: Record<string, unknown>;
  invalidTypes: Record<string, unknown>;
  [key: string]: unknown;
}

export const TestDataFactory = {
  /**
   * Creates test data for security validation
   */
  createSecurityTestData(
    overrides: Partial<SecurityTestData> = {},
  ): SecurityTestData {
    return {
      maliciousInputs: [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')">',
        '"><script>alert("xss")</script>',
        "'; DROP TABLE users; --",
        '{{constructor.constructor("alert(1)")()}}',
      ],
      cleanInputs: [
        "Hello, World!",
        "user@example.com",
        "123-456-7890",
        "This is a normal message.",
        "Product Name #123",
      ],
      ...overrides,
    };
  },

  /**
   * Creates test encryption data
   */
  createCryptoTestData(
    overrides: Partial<CryptoTestData> = {},
  ): CryptoTestData {
    return {
      plaintext: "This is a test message for encryption",
      key: "test-encryption-key-32-chars-long",
      invalidKeys: ["short", "", "12345678901234567890123456789012345"], // too short, empty, too long
      sensitiveData: {
        password: "super-secret-password",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
        apiKey: "sk-1234567890abcdef",
      },
      ...overrides,
    };
  },

  /**
   * Creates validation test cases
   */
  createValidationTestData(
    overrides: Partial<ValidationTestData> = {},
  ): ValidationTestData {
    return {
      validEmails: [
        "user@example.com",
        "test.email+tag@domain.co.uk",
        "valid.email@subdomain.example.org",
      ],
      invalidEmails: [
        "invalid-email",
        "@missing-username.com",
        "user@",
        "user@@double-at.com",
        "user@.invalid",
      ],
      validUUIDs: [
        "550e8400-e29b-41d4-a716-446655440000",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
      ],
      invalidUUIDs: [
        "550e8400-e29b-41d4-a716-44665544000", // too short
        "550e8400-e29b-41d4-a716-446655440000-extra", // too long
        "not-a-uuid-at-all",
        "550e8400_e29b_41d4_a716_446655440000", // wrong format
      ],
      ...overrides,
    };
  },

  /**
   * Creates type definition test data
   */
  createTypeTestData(overrides: Partial<TypeTestData> = {}): TypeTestData {
    return {
      validTypes: {
        string: "test string",
        number: 42,
        boolean: true,
        object: { key: "value" },
        array: [1, 2, 3],
        null: null,
        undefined: undefined,
      },
      invalidTypes: {
        stringAsNumber: "42",
        numberAsString: 42,
        booleanAsString: "true",
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
   * Measures execution time of a function
   */
  measureExecutionTime: <T>(fn: () => T): { result: T; duration: number } => {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    return { result, duration };
  },

  /**
   * Tests function with multiple inputs
   */
  testWithInputs: <T, U = unknown>(
    fn: (input: U) => T,
    inputs: U[],
  ): Array<{ input: U; result: T | null; error?: Error }> => {
    return inputs.map((input) => {
      try {
        const result = fn(input);
        return { input, result };
      } catch (err) {
        return { input, result: null, error: err as Error };
      }
    });
  },

  /**
   * Creates a mock implementation
   */
  createMock: <T extends Record<string, unknown>>(obj: T): T => {
    const mock = {} as T;

    for (const key in obj) {
      if (typeof obj[key] === "function") {
        (mock as any)[key] = jest.fn();
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        (mock as any)[key] = TestUtils.createMock(obj[key] as Record<string, unknown>);
      } else {
        (mock as any)[key] = obj[key];
      }
    }

    return mock;
  },

  /**
   * Validates security of input/output pairs
   */
  validateSecurityTransformation: (input: string, output: string): boolean => {
    // Check if dangerous patterns were removed
    const dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ];

    const inputHasDangerous = dangerousPatterns.some((pattern) =>
      pattern.test(input),
    );
    const outputHasDangerous = dangerousPatterns.some((pattern) =>
      pattern.test(output),
    );

    return !inputHasDangerous || (inputHasDangerous && !outputHasDangerous);
  },

  /**
   * Generates random test data
   */
  generateRandomString: (length: number = 10): string => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
};

// Export test configuration
export const testConfig = {
  slowUtilityThreshold: 10,
  memoryLeakThreshold: 10 * 1024 * 1024,
  cryptoOperationThreshold: 50,
  timeout: 30000,
};
