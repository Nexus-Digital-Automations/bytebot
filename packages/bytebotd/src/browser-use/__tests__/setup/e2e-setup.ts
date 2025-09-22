/**
 * E2E Test Setup and Global Configuration
 *
 * This file configures the global test environment for browser automation E2E tests,
 * including browser management, resource cleanup, performance monitoring, and
 * comprehensive error handling.
 *
 * Setup Features:
 * - Global test lifecycle management
 * - Browser resource cleanup and monitoring
 * - Performance metrics collection
 * - Error tracking and reporting
 * - Network condition simulation
 * - Test data generation and cleanup
 * - Security testing utilities
 * - Custom Jest matchers for browser automation
 */

import { performance } from 'perf_hooks';

// Global test configuration
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeBrowserAutomationResponse(): R;
      toBeValidSessionId(): R;
      toHaveExecutedWithinTime(maxTime: number): R;
      toHaveValidScreenshot(): R;
      toHaveCleanedUpResources(): R;
    }
  }

  var testMetrics: {
    startTime: number;
    sessionIds: Set<string>;
    requestCounts: Map<string, number>;
    errorCounts: Map<string, number>;
    performanceMarks: Array<{
      name: string;
      timestamp: number;
      duration?: number;
    }>;
  };
}

// Initialize global test metrics
global.testMetrics = {
  startTime: performance.now(),
  sessionIds: new Set(),
  requestCounts: new Map(),
  errorCounts: new Map(),
  performanceMarks: []
};

/**
 * Custom Jest Matchers for Browser Automation
 */

// Matcher for browser automation API responses
expect.extend({
  toBeBrowserAutomationResponse(received: any) {
    const pass = received &&
      typeof received === 'object' &&
      (received.success !== undefined || received.error !== undefined);

    if (pass) {
      return {
        message: () => `Expected response not to be a browser automation response`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected response to be a browser automation response with 'success' or 'error' property`,
        pass: false,
      };
    }
  },

  toBeValidSessionId(received: string) {
    const sessionIdPattern = /^[a-zA-Z0-9\-_]{8,64}$/;
    const pass = typeof received === 'string' && sessionIdPattern.test(received);

    if (pass) {
      return {
        message: () => `Expected "${received}" not to be a valid session ID`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected "${received}" to be a valid session ID (8-64 alphanumeric characters)`,
        pass: false,
      };
    }
  },

  toHaveExecutedWithinTime(received: any, maxTime: number) {
    const executionTime = received?.executionTime || received?.loadTime || received?.duration;
    const pass = typeof executionTime === 'number' && executionTime <= maxTime;

    if (pass) {
      return {
        message: () => `Expected execution time ${executionTime}ms to exceed ${maxTime}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected execution time ${executionTime}ms to be within ${maxTime}ms`,
        pass: false,
      };
    }
  },

  toHaveValidScreenshot(received: any) {
    const screenshot = received?.screenshot || received?.image;
    const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
    const pass = typeof screenshot === 'string' &&
      screenshot.length > 100 &&
      base64Pattern.test(screenshot);

    if (pass) {
      return {
        message: () => `Expected screenshot not to be valid base64 data`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected screenshot to be valid base64 encoded image data`,
        pass: false,
      };
    }
  },

  toHaveCleanedUpResources(received: any) {
    const resourceMetrics = received?.resources || received?.cleanup;
    const pass = resourceMetrics &&
      resourceMetrics.sessionsDestroyed >= 0 &&
      resourceMetrics.memoryFreed >= 0;

    if (pass) {
      return {
        message: () => `Expected resources not to be cleaned up`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected resources to be properly cleaned up with valid metrics`,
        pass: false,
      };
    }
  },
});

/**
 * Global Test Setup
 */
beforeAll(async () => {
  console.log('🚀 Starting Browser Automation E2E Test Suite');

  // Record test suite start time
  global.testMetrics.performanceMarks.push({
    name: 'test-suite-start',
    timestamp: performance.now()
  });

  // Set extended timeout for E2E tests
  jest.setTimeout(120000); // 2 minutes for complex scenarios

  // Configure console logging for better test debugging
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Filter out known non-critical warnings
    const message = args.join(' ');
    if (!message.includes('ExperimentalWarning') &&
        !message.includes('DeprecationWarning')) {
      originalConsoleError.apply(console, args);
    }
  };

  console.log('✅ E2E Test Environment Configured');
});

/**
 * Global Test Cleanup
 */
afterAll(async () => {
  console.log('🧹 Cleaning up E2E Test Environment');

  // Record test suite end time
  const endTime = performance.now();
  global.testMetrics.performanceMarks.push({
    name: 'test-suite-end',
    timestamp: endTime,
    duration: endTime - global.testMetrics.startTime
  });

  // Generate test metrics report
  const totalDuration = endTime - global.testMetrics.startTime;
  const totalSessions = global.testMetrics.sessionIds.size;
  const totalRequests = Array.from(global.testMetrics.requestCounts.values())
    .reduce((sum, count) => sum + count, 0);
  const totalErrors = Array.from(global.testMetrics.errorCounts.values())
    .reduce((sum, count) => sum + count, 0);

  console.log('\n📊 E2E Test Suite Metrics:');
  console.log(`   Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`   Sessions Created: ${totalSessions}`);
  console.log(`   Total Requests: ${totalRequests}`);
  console.log(`   Total Errors: ${totalErrors}`);
  console.log(`   Success Rate: ${((totalRequests - totalErrors) / totalRequests * 100).toFixed(1)}%`);

  // Log performance marks
  if (global.testMetrics.performanceMarks.length > 2) {
    console.log('\n⏱️  Performance Marks:');
    global.testMetrics.performanceMarks.forEach(mark => {
      if (mark.duration) {
        console.log(`   ${mark.name}: ${(mark.duration / 1000).toFixed(2)}s`);
      }
    });
  }

  console.log('✅ E2E Test Environment Cleanup Complete\n');

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

/**
 * Individual Test Setup and Cleanup
 */
beforeEach(async () => {
  // Record test start time
  const testName = expect.getState().currentTestName || 'unknown-test';
  global.testMetrics.performanceMarks.push({
    name: `test-start-${testName}`,
    timestamp: performance.now()
  });
});

afterEach(async () => {
  // Record test end time and cleanup
  const testName = expect.getState().currentTestName || 'unknown-test';
  const endTime = performance.now();

  const startMark = global.testMetrics.performanceMarks
    .find(mark => mark.name === `test-start-${testName}`);

  if (startMark) {
    global.testMetrics.performanceMarks.push({
      name: `test-end-${testName}`,
      timestamp: endTime,
      duration: endTime - startMark.timestamp
    });
  }

  // Allow some time for async cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
});

/**
 * Utility Functions for E2E Tests
 */

/**
 * Track session creation for cleanup monitoring
 */
export function trackSession(sessionId: string): void {
  global.testMetrics.sessionIds.add(sessionId);
}

/**
 * Track API request for metrics
 */
export function trackRequest(endpoint: string): void {
  const current = global.testMetrics.requestCounts.get(endpoint) || 0;
  global.testMetrics.requestCounts.set(endpoint, current + 1);
}

/**
 * Track error occurrence
 */
export function trackError(errorType: string): void {
  const current = global.testMetrics.errorCounts.get(errorType) || 0;
  global.testMetrics.errorCounts.set(errorType, current + 1);
}

/**
 * Generate test data for various scenarios
 */
export const TestDataGenerators = {
  /**
   * Generate browser session options for different scenarios
   */
  sessionOptions: {
    basic: () => ({
      headless: true,
      viewport: { width: 1280, height: 720 }
    }),

    mobile: () => ({
      headless: true,
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
    }),

    highRes: () => ({
      headless: true,
      viewport: { width: 1920, height: 1080 }
    }),

    slowNetwork: () => ({
      headless: true,
      networkConditions: {
        downloadThroughput: 100 * 1024, // 100 KB/s
        uploadThroughput: 50 * 1024,    // 50 KB/s
        latency: 200 // 200ms
      }
    })
  },

  /**
   * Generate random test data
   */
  randomText: (length: number = 10): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Generate test URLs for different scenarios
   */
  testUrls: {
    static: 'https://example.com',
    dynamic: 'https://jsonplaceholder.typicode.com',
    forms: 'https://httpbin.org/forms/post',
    slow: 'https://httpbin.org/delay/2',
    error: 'https://httpbin.org/status/404',
    large: 'https://httpbin.org/base64/SFRUUEJJTiBpcyBhd2Vzb21l' // Large base64 response
  }
};

/**
 * Performance assertion helpers
 */
export const PerformanceAssertions = {
  /**
   * Assert operation completed within time limit
   */
  assertExecutionTime: (startTime: number, maxMs: number, operation: string) => {
    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(maxMs);
    console.log(`✓ ${operation} completed in ${duration.toFixed(2)}ms (limit: ${maxMs}ms)`);
  },

  /**
   * Assert memory usage is within acceptable range
   */
  assertMemoryUsage: (beforeMB: number, afterMB: number, maxIncreaseMB: number) => {
    const increase = afterMB - beforeMB;
    expect(increase).toBeLessThan(maxIncreaseMB);
    console.log(`✓ Memory usage increased by ${increase.toFixed(2)}MB (limit: ${maxIncreaseMB}MB)`);
  }
};

/**
 * Security test helpers
 */
export const SecurityTestHelpers = {
  /**
   * Generate malicious payloads for input validation testing
   */
  maliciousPayloads: {
    xss: [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      'onload="alert(\'XSS\')"'
    ],

    sqlInjection: [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; SELECT * FROM users WHERE 't' = 't",
      "admin'--"
    ],

    pathTraversal: [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
      '/etc/shadow',
      '../../../../../../../../var/log/apache/access.log'
    ]
  },

  /**
   * Validate security response format
   */
  assertSecurityError: (response: any, expectedCode: string) => {
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body).toMatchObject({
      error: expect.objectContaining({
        type: 'SecurityError',
        code: expectedCode
      })
    });
  }
};

console.log('✅ Browser Automation E2E Test Setup Loaded');