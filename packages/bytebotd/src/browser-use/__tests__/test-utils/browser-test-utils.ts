/**
 * Browser Automation Test Utilities
 *
 * Comprehensive test utilities for browser automation testing including:
 * - Mock service factories
 * - Test data generators
 * - Custom matchers and assertions
 * - Performance testing helpers
 * - Security testing utilities
 *
 * @author Testing & Quality Assurance Agent
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

// Test interfaces
export interface MockBrowserSession {
  sessionId: string;
  status: 'active' | 'inactive' | 'destroyed' | 'error';
  createdAt: Date;
  lastActivity: Date;
  config?: {
    headless?: boolean;
    width?: number;
    height?: number;
    timeout?: number;
    browser?: string;
  };
}

export interface MockBrowserTask {
  taskId: string;
  sessionId: string;
  type: string;
  instruction: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: any;
  error?: any;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TestPerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    delta: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
  };
}

/**
 * Mock factory for BrowserUseService
 */
export class MockBrowserUseServiceFactory {
  static create() {
    return {
      // Task management
      createTask: jest.fn(),
      getTask: jest.fn(),
      cancelTask: jest.fn(),
      getSessionTasks: jest.fn(),

      // Interaction execution
      executeInteraction: jest.fn(),

      // Script execution (legacy API support)
      executeScript: jest.fn(),
      navigate: jest.fn(),
      wait: jest.fn(),
      captureScreenshot: jest.fn(),

      // Health and status
      getHealthStatus: jest.fn(),
      getSystemHealth: jest.fn(),

      // Python framework methods
      executePythonCommand: jest.fn(),
      generateInteractionScript: jest.fn(),
      generateTaskScript: jest.fn(),
    };
  }

  static createWithDefaults() {
    const mock = this.create();

    // Default implementations
    mock.createTask.mockImplementation(async (taskDto) => ({
      success: true,
      taskId: uuidv4(),
      status: 'pending',
      metadata: { timestamp: new Date() },
    }));

    mock.getTask.mockImplementation(async (taskId) => ({
      success: true,
      data: {
        taskId,
        status: 'completed',
        result: { data: 'mock result' },
      },
    }));

    mock.executeInteraction.mockImplementation(async (sessionId, interaction) => ({
      success: true,
      data: { result: `${interaction.type} executed successfully` },
      screenshot: interaction.type === 'screenshot' ? 'base64screenshot' : undefined,
    }));

    mock.getHealthStatus.mockImplementation(() => ({
      success: true,
      data: {
        activeTasks: 0,
        runningProcesses: 0,
        totalTasks: 0,
        config: {
          maxConcurrentSessions: 5,
          taskTimeout: 60000,
          enableScreenshots: true,
        },
      },
      metadata: { timestamp: new Date(), version: '1.0.0' },
    }));

    return mock;
  }
}

/**
 * Mock factory for BrowserInteractionService
 */
export class MockBrowserInteractionServiceFactory {
  static create() {
    return {
      performInteraction: jest.fn(),
      click: jest.fn(),
      type: jest.fn(),
    };
  }

  static createWithDefaults() {
    const mock = this.create();

    mock.click.mockImplementation(async (selector) => ({
      success: true,
      message: `Element ${selector} clicked successfully`,
    }));

    mock.type.mockImplementation(async (selector, text) => ({
      success: true,
      message: `Text typed in ${selector} successfully`,
    }));

    mock.performInteraction.mockImplementation(async (type, selector, sessionId, options) => ({
      data: { success: true, result: `${type} interaction completed` },
      elementInfo: {
        tagName: 'BUTTON',
        id: selector.replace('#', ''),
        className: 'test-element',
      },
      screenshot: options?.captureScreenshot ? 'base64screenshot' : undefined,
    }));

    return mock;
  }
}

/**
 * Mock factory for BrowserSessionService
 */
export class MockBrowserSessionServiceFactory {
  static create() {
    return {
      createSession: jest.fn(),
      getSession: jest.fn(),
      destroySession: jest.fn(),
      getSessions: jest.fn(),
      getSessionHealth: jest.fn(),
      getSessionStatistics: jest.fn(),
      getSessionStatus: jest.fn(),
      getAllSessions: jest.fn(),
      pauseSession: jest.fn(),
      resumeSession: jest.fn(),
      updateSessionActivity: jest.fn(),
      recordTaskCompletion: jest.fn(),
      getServiceStatus: jest.fn(),
    };
  }

  static createWithDefaults() {
    const mock = this.create();

    mock.createSession.mockImplementation(async (sessionDto) => ({
      success: true,
      sessionId: sessionDto.sessionId || uuidv4(),
      metadata: {
        config: sessionDto.config,
        createdAt: new Date(),
      },
    }));

    mock.getSession.mockImplementation(async (sessionId) => ({
      success: true,
      data: {
        sessionId,
        status: 'active',
        createdAt: new Date(),
        lastActivity: new Date(),
        config: {
          headless: true,
          width: 1920,
          height: 1080,
        },
      },
    }));

    mock.destroySession.mockImplementation(async (sessionId) => ({
      success: true,
      sessionId,
      metadata: { destroyedAt: new Date() },
    }));

    mock.getSessionStatus.mockImplementation(async (sessionId) => ({
      sessionId,
      active: true,
      lastActivity: new Date(),
    }));

    mock.getAllSessions.mockImplementation(async () => [
      {
        sessionId: 'session-1',
        status: 'active',
        createdAt: new Date(),
      },
      {
        sessionId: 'session-2',
        status: 'active',
        createdAt: new Date(),
      },
    ]);

    return mock;
  }
}

/**
 * Test data generators
 */
export class BrowserTestDataGenerator {
  static generateBrowserExecuteDto(overrides: any = {}) {
    return {
      script: 'console.log("test script");',
      sessionId: 'test-session-123',
      parameters: { testParam: 'value' },
      captureScreenshots: true,
      ...overrides,
    };
  }

  static generateBrowserNavigateDto(overrides: any = {}) {
    return {
      url: 'https://example.com',
      sessionId: 'test-session-123',
      captureScreenshot: true,
      options: { waitUntil: 'load' },
      ...overrides,
    };
  }

  static generateBrowserWaitDto(overrides: any = {}) {
    return {
      type: 'element',
      selector: '#test-element',
      sessionId: 'test-session-123',
      timeout: 5000,
      condition: 'visible',
      options: {},
      ...overrides,
    };
  }

  static generateBrowserStatusDto(overrides: any = {}) {
    return {
      sessionId: 'test-session-123',
      ...overrides,
    };
  }

  static generateBrowserScreenshotDto(overrides: any = {}) {
    return {
      sessionId: 'test-session-123',
      selector: '#test-element',
      returnBase64: true,
      options: { fullPage: false },
      ...overrides,
    };
  }

  static generateBrowserInteractionDto(overrides: any = {}) {
    return {
      type: 'click',
      selector: '#test-button',
      sessionId: 'test-session-123',
      value: '',
      captureScreenshot: false,
      options: {},
      ...overrides,
    };
  }

  static generateCreateBrowserTaskDto(overrides: any = {}) {
    return {
      sessionId: 'test-session-123',
      type: 'automation',
      instruction: 'Test automation task',
      params: {},
      priority: 'medium' as const,
      ...overrides,
    };
  }

  static generateCreateBrowserSessionDto(overrides: any = {}) {
    return {
      sessionId: uuidv4(),
      config: {
        headless: true,
        width: 1920,
        height: 1080,
        timeout: 30000,
        browser: 'chrome',
      },
      options: {},
      ...overrides,
    };
  }

  static generateMockUser(overrides: any = {}) {
    return {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      roles: ['user'],
      ...overrides,
    };
  }

  static generateMockBrowserSession(overrides: Partial<MockBrowserSession> = {}): MockBrowserSession {
    return {
      sessionId: uuidv4(),
      status: 'active',
      createdAt: new Date(),
      lastActivity: new Date(),
      config: {
        headless: true,
        width: 1920,
        height: 1080,
        timeout: 30000,
        browser: 'chrome',
      },
      ...overrides,
    };
  }

  static generateMockBrowserTask(overrides: Partial<MockBrowserTask> = {}): MockBrowserTask {
    return {
      taskId: uuidv4(),
      sessionId: 'test-session-123',
      type: 'automation',
      instruction: 'Test automation task',
      status: 'pending',
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Generate malicious test data for security testing
   */
  static generateMaliciousInputs() {
    return {
      xssPayloads: [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')">',
        '"><script>alert("xss")</script>',
        "'><script>alert('xss')</script>",
      ],
      sqlInjectionPayloads: [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; DELETE FROM sessions; --",
        "' UNION SELECT * FROM passwords --",
        "admin'--",
      ],
      pathTraversalPayloads: [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2f',
        '....//....//....//etc/passwd',
      ],
      oversizeInputs: {
        longString: 'a'.repeat(10000),
        largeBinary: Buffer.alloc(1024 * 1024), // 1MB
        deepObject: this.createDeepObject(1000),
      },
    };
  }

  private static createDeepObject(depth: number): any {
    if (depth === 0) return 'leaf';
    return { nested: this.createDeepObject(depth - 1) };
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  /**
   * Measure execution time and memory usage
   */
  static async measurePerformance<T>(
    operation: () => Promise<T>,
    iterations: number = 1
  ): Promise<{ result: T; metrics: TestPerformanceMetrics }> {
    const memoryBefore = process.memoryUsage();
    const startTime = performance.now();

    let result: T;
    for (let i = 0; i < iterations; i++) {
      result = await operation();
    }

    const endTime = performance.now();
    const memoryAfter = process.memoryUsage();

    const metrics: TestPerformanceMetrics = {
      startTime,
      endTime,
      duration: endTime - startTime,
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        delta: {
          heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
          heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
          external: memoryAfter.external - memoryBefore.external,
          rss: memoryAfter.rss - memoryBefore.rss,
        },
      },
    };

    return { result: result!, metrics };
  }

  /**
   * Run concurrent operations and measure aggregate performance
   */
  static async measureConcurrentPerformance<T>(
    operation: () => Promise<T>,
    concurrency: number
  ): Promise<{
    results: T[];
    metrics: {
      totalDuration: number;
      averageDuration: number;
      minDuration: number;
      maxDuration: number;
      memoryDelta: number;
      successRate: number;
    };
  }> {
    const memoryBefore = process.memoryUsage();
    const startTime = performance.now();

    const operations = Array(concurrency).fill(null).map(async () => {
      const opStart = performance.now();
      try {
        const result = await operation();
        const opEnd = performance.now();
        return { success: true, result, duration: opEnd - opStart };
      } catch (error) {
        const opEnd = performance.now();
        return { success: false, error, duration: opEnd - opStart };
      }
    });

    const outcomes = await Promise.all(operations);
    const endTime = performance.now();
    const memoryAfter = process.memoryUsage();

    const successful = outcomes.filter(o => o.success);
    const durations = outcomes.map(o => o.duration);

    return {
      results: successful.map(o => o.result),
      metrics: {
        totalDuration: endTime - startTime,
        averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        memoryDelta: memoryAfter.heapUsed - memoryBefore.heapUsed,
        successRate: successful.length / outcomes.length,
      },
    };
  }

  /**
   * Assert performance requirements
   */
  static assertPerformanceRequirements(
    metrics: TestPerformanceMetrics,
    requirements: {
      maxDuration?: number;
      maxMemoryIncrease?: number;
    }
  ): void {
    if (requirements.maxDuration && metrics.duration > requirements.maxDuration) {
      throw new Error(
        `Performance requirement failed: Duration ${metrics.duration}ms exceeds limit ${requirements.maxDuration}ms`
      );
    }

    if (requirements.maxMemoryIncrease && metrics.memoryUsage.delta.heapUsed > requirements.maxMemoryIncrease) {
      throw new Error(
        `Performance requirement failed: Memory increase ${metrics.memoryUsage.delta.heapUsed} bytes exceeds limit ${requirements.maxMemoryIncrease} bytes`
      );
    }
  }
}

/**
 * Security testing utilities
 */
export class SecurityTestUtils {
  /**
   * Test input sanitization
   */
  static testInputSanitization(
    operation: (input: string) => Promise<any>,
    payloads: string[]
  ): Promise<{ payload: string; result: any; safe: boolean }[]> {
    return Promise.all(
      payloads.map(async (payload) => {
        try {
          const result = await operation(payload);
          // Determine if result indicates successful sanitization
          const safe = !this.containsMaliciousOutput(result, payload);
          return { payload, result, safe };
        } catch (error) {
          // Errors might indicate proper security measures
          return { payload, result: error, safe: true };
        }
      })
    );
  }

  /**
   * Check if output contains malicious content
   */
  private static containsMaliciousOutput(output: any, originalPayload: string): boolean {
    const outputStr = JSON.stringify(output).toLowerCase();
    const payloadLower = originalPayload.toLowerCase();

    // Basic checks for common injection patterns
    const dangerousPatterns = [
      'script',
      'alert(',
      'eval(',
      'drop table',
      'delete from',
      'union select',
      '../',
      '..\\',
    ];

    return dangerousPatterns.some(pattern =>
      payloadLower.includes(pattern) && outputStr.includes(pattern)
    );
  }

  /**
   * Test rate limiting
   */
  static async testRateLimit(
    operation: () => Promise<any>,
    requestCount: number,
    timeWindow: number
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    blockedRequests: number;
    rateLimitEffective: boolean;
  }> {
    const startTime = Date.now();
    const promises = Array(requestCount).fill(null).map(async () => {
      try {
        await operation();
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    });

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const actualDuration = endTime - startTime;

    const successful = results.filter(r => r.success).length;
    const blocked = results.length - successful;

    // Rate limiting is effective if some requests were blocked
    // or if execution took longer than expected (indicating throttling)
    const rateLimitEffective = blocked > 0 || actualDuration > timeWindow * 1.5;

    return {
      totalRequests: requestCount,
      successfulRequests: successful,
      blockedRequests: blocked,
      rateLimitEffective,
    };
  }
}

/**
 * Custom Jest matchers for browser automation testing
 */
export const browserTestMatchers = {
  toHaveValidSessionId(received: any) {
    const sessionId = received?.sessionId || received;
    const isValid = typeof sessionId === 'string' && sessionId.length > 0;

    return {
      message: () => `Expected ${received} to have a valid session ID`,
      pass: isValid,
    };
  },

  toHaveValidTiming(received: any) {
    const timing = received?.timing || received;
    const isValid = timing &&
      typeof timing.startTime === 'number' &&
      typeof timing.endTime === 'number' &&
      typeof timing.duration === 'number' &&
      timing.endTime >= timing.startTime &&
      timing.duration === timing.endTime - timing.startTime;

    return {
      message: () => `Expected ${JSON.stringify(received)} to have valid timing information`,
      pass: isValid,
    };
  },

  toBeWithinPerformanceThreshold(received: number, threshold: number) {
    const isWithin = received <= threshold;

    return {
      message: () => `Expected ${received}ms to be within performance threshold of ${threshold}ms`,
      pass: isWithin,
    };
  },

  toHaveSanitizedInput(received: any, originalInput: string) {
    const outputStr = JSON.stringify(received).toLowerCase();
    const inputLower = originalInput.toLowerCase();

    const dangerousPatterns = ['<script', 'javascript:', 'onerror='];
    const containsDangerous = dangerousPatterns.some(pattern =>
      inputLower.includes(pattern) && outputStr.includes(pattern)
    );

    return {
      message: () => `Expected output to not contain dangerous patterns from input: ${originalInput}`,
      pass: !containsDangerous,
    };
  },
};

/**
 * Test module builder with common configurations
 */
export class BrowserTestModuleBuilder {
  static async createTestModule(options: {
    mockBrowserUseService?: any;
    mockBrowserInteractionService?: any;
    mockBrowserSessionService?: any;
    enableLogging?: boolean;
  } = {}): Promise<TestingModule> {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: 'BrowserUseService',
          useValue: options.mockBrowserUseService || MockBrowserUseServiceFactory.createWithDefaults(),
        },
        {
          provide: 'BrowserInteractionService',
          useValue: options.mockBrowserInteractionService || MockBrowserInteractionServiceFactory.createWithDefaults(),
        },
        {
          provide: 'BrowserSessionService',
          useValue: options.mockBrowserSessionService || MockBrowserSessionServiceFactory.createWithDefaults(),
        },
      ],
    }).compile();

    if (!options.enableLogging) {
      // Suppress logging during tests
      jest.spyOn(Logger.prototype, 'log').mockImplementation();
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    }

    return module;
  }
}

/**
 * Test cleanup utilities
 */
export class TestCleanupUtils {
  static async cleanupTestModule(module: TestingModule): Promise<void> {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    await module.close();
  }

  static cleanupMemory(): void {
    if (global.gc) {
      global.gc();
    }
  }

  static async waitFor(condition: () => boolean, timeout: number = 5000, interval: number = 100): Promise<void> {
    const startTime = Date.now();

    while (!condition() && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    if (!condition()) {
      throw new Error(`Condition not met within ${timeout}ms timeout`);
    }
  }
}

// Export all utilities
export {
  MockBrowserUseServiceFactory,
  MockBrowserInteractionServiceFactory,
  MockBrowserSessionServiceFactory,
  BrowserTestDataGenerator,
  PerformanceTestUtils,
  SecurityTestUtils,
  BrowserTestModuleBuilder,
  TestCleanupUtils,
};