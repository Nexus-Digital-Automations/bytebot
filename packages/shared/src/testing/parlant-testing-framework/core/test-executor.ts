/**
 * PARLANT Test Executor
 *
 * Core test execution engine for PARLANT automated testing framework.
 * Handles individual test execution, result collection, and error handling.
 *
 * @fileoverview Test execution engine
 * @version 1.0.0
 * @author PARLANT Testing Framework Agent
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * Test execution result interface
 */
export interface TestExecutionResult {
  id: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped' | 'error';
  duration: number;
  error?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Test execution configuration
 */
export interface TestExecutorConfig {
  timeout: number;
  retries: number;
  failFast: boolean;
  parallel: boolean;
}

/**
 * Test case definition
 */
export interface TestCase {
  id: string;
  name: string;
  description: string;
  testFunction: () => Promise<void>;
  timeout?: number;
  retries?: number;
  tags?: string[];
}

/**
 * PARLANT Test Executor Service
 *
 * Executes individual test cases and collects results for the testing framework.
 */
@Injectable()
export class TestExecutor {
  private readonly logger = new Logger(TestExecutor.name);
  private readonly defaultConfig: TestExecutorConfig = {
    timeout: 30000,
    retries: 0,
    failFast: false,
    parallel: true
  };

  constructor(private readonly config: Partial<TestExecutorConfig> = {}) {
    this.logger.log('PARLANT Test Executor initialized');
  }

  /**
   * Execute a single test case
   */
  async executeTest(testCase: TestCase): Promise<TestExecutionResult> {
    const startTime = Date.now();
    const config = { ...this.defaultConfig, ...this.config };

    this.logger.debug(`Executing test: ${testCase.name}`);

    const result: TestExecutionResult = {
      id: testCase.id,
      testName: testCase.name,
      status: 'failed',
      duration: 0,
      timestamp: new Date()
    };

    try {
      // Set timeout for test execution
      const timeout = testCase.timeout || config.timeout;

      await Promise.race([
        testCase.testFunction(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout)
        )
      ]);

      result.status = 'passed';
      this.logger.debug(`Test passed: ${testCase.name}`);

    } catch (error) {
      result.status = 'error';
      result.error = error instanceof Error ? error.message : String(error);
      this.logger.error(`Test failed: ${testCase.name}`, error);

    } finally {
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute multiple test cases
   */
  async executeTests(testCases: TestCase[]): Promise<TestExecutionResult[]> {
    const config = { ...this.defaultConfig, ...this.config };
    const results: TestExecutionResult[] = [];

    this.logger.log(`Executing ${testCases.length} test cases`);

    if (config.parallel) {
      // Execute tests in parallel
      const promises = testCases.map(testCase => this.executeTest(testCase));
      const parallelResults = await Promise.all(promises);
      results.push(...parallelResults);
    } else {
      // Execute tests sequentially
      for (const testCase of testCases) {
        const result = await this.executeTest(testCase);
        results.push(result);

        // Fail fast if enabled and test failed
        if (config.failFast && (result.status === 'failed' || result.status === 'error')) {
          this.logger.warn(`Failing fast due to test failure: ${testCase.name}`);
          break;
        }
      }
    }

    this.logger.log(`Test execution completed. Results: ${results.length} tests`);
    return results;
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(results: TestExecutionResult[]): {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    skipped: number;
    totalDuration: number;
    averageDuration: number;
  } {
    const stats = {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      errors: results.filter(r => r.status === 'error').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      averageDuration: 0
    };

    stats.averageDuration = stats.total > 0 ? stats.totalDuration / stats.total : 0;

    return stats;
  }
}

/**
 * Default export
 */
export default TestExecutor;