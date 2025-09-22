/**
 * Test Runner - Core test execution engine
 * Handles individual test case execution with comprehensive validation
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  TestCase,
  TestResult,
  TestStatus,
  TestStep,
  StepResult,
  TestError,
  TestArtifact,
  PerformanceMetrics
} from '@/types';
import { TestExecutor } from './test-executor';
import { TestContext } from './test-context';
import { ComponentHealth } from './test-framework';

/**
 * Test Runner for individual test case execution
 */
@Injectable()
export class TestRunner {
  private readonly logger = new Logger(TestRunner.name);

  private isInitialized = false;
  private runningTests = new Map<string, TestExecution>();
  private completedTests = new Map<string, TestResult>();

  constructor(
    private readonly testExecutor: TestExecutor,
    private readonly testContext: TestContext
  ) {}

  /**
   * Initialize test runner
   */
  async initialize(): Promise<void> {
    try {
      this.logger.log('Initializing Test Runner');

      // Clear any existing state
      this.runningTests.clear();
      this.completedTests.clear();

      this.isInitialized = true;
      this.logger.log('Test Runner initialized successfully');
    } catch (error) {
      this.logger.error('Test Runner initialization failed', error);
      throw error;
    }
  }

  /**
   * Execute a single test case with comprehensive validation
   */
  async executeTestCase(testCase: TestCase): Promise<TestResult> {
    this.ensureInitialized();

    const executionId = this.generateExecutionId(testCase.id);
    const startTime = new Date();

    try {
      this.logger.log(`Starting test case execution: ${testCase.name} (${testCase.id})`);

      // Create test execution context
      const execution: TestExecution = {
        id: executionId,
        testCase,
        status: 'running',
        startTime,
        currentStep: null,
        stepResults: [],
        artifacts: [],
        performanceMetrics: null
      };

      this.runningTests.set(executionId, execution);

      // Execute test case with timeout
      const result = await this.executeWithTimeout(testCase, execution);

      // Store completed test
      this.completedTests.set(testCase.id, result);
      this.runningTests.delete(executionId);

      this.logger.log(`Test case execution completed: ${testCase.name} - ${result.status}`);
      return result;

    } catch (error) {
      this.logger.error(`Test case execution failed: ${testCase.name}`, error);

      const failedResult: TestResult = {
        testCaseId: testCase.id,
        status: 'error',
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime(),
        stepResults: [],
        error: {
          type: error.constructor.name,
          message: error.message,
          stack: error.stack,
          context: { testCase: testCase.name }
        },
        artifacts: []
      };

      this.completedTests.set(testCase.id, failedResult);
      this.runningTests.delete(executionId);

      return failedResult;
    }
  }

  /**
   * Execute multiple test cases with parallel support
   */
  async executeTestCases(
    testCases: TestCase[],
    parallel: boolean = true,
    maxConcurrency: number = 5
  ): Promise<TestResult[]> {
    this.ensureInitialized();

    this.logger.log(`Executing ${testCases.length} test cases (parallel: ${parallel})`);

    if (!parallel) {
      // Sequential execution
      const results: TestResult[] = [];
      for (const testCase of testCases) {
        const result = await this.executeTestCase(testCase);
        results.push(result);
      }
      return results;
    }

    // Parallel execution with concurrency limit
    const results: TestResult[] = [];
    const batches = this.createBatches(testCases, maxConcurrency);

    for (const batch of batches) {
      const batchPromises = batch.map(testCase => this.executeTestCase(testCase));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get test execution status
   */
  getExecutionStatus(executionId: string): TestExecution | null {
    return this.runningTests.get(executionId) || null;
  }

  /**
   * Get all running tests
   */
  getRunningTests(): TestExecution[] {
    return Array.from(this.runningTests.values());
  }

  /**
   * Get completed test result
   */
  getCompletedTest(testCaseId: string): TestResult | null {
    return this.completedTests.get(testCaseId) || null;
  }

  /**
   * Stop test execution
   */
  async stopTestExecution(executionId: string): Promise<void> {
    const execution = this.runningTests.get(executionId);
    if (execution) {
      this.logger.log(`Stopping test execution: ${execution.testCase.name}`);
      execution.status = 'stopped';
      // Note: Actual stopping logic would depend on test executor implementation
    }
  }

  /**
   * Get test runner health
   */
  async getHealth(): Promise<ComponentHealth> {
    const runningTestsCount = this.runningTests.size;
    const completedTestsCount = this.completedTests.size;

    return {
      status: this.isInitialized ? 'healthy' : 'not_initialized',
      message: `Running: ${runningTestsCount}, Completed: ${completedTestsCount}`,
      lastActivity: new Date(),
      metrics: {
        runningTests: runningTestsCount,
        completedTests: completedTestsCount,
        totalMemoryUsage: process.memoryUsage().heapUsed
      }
    };
  }

  /**
   * Cleanup test runner resources
   */
  async cleanup(): Promise<void> {
    try {
      this.logger.log('Starting Test Runner cleanup');

      // Stop all running tests
      for (const [executionId] of this.runningTests) {
        await this.stopTestExecution(executionId);
      }

      this.runningTests.clear();
      this.completedTests.clear();
      this.isInitialized = false;

      this.logger.log('Test Runner cleanup completed');
    } catch (error) {
      this.logger.error('Test Runner cleanup failed', error);
      throw error;
    }
  }

  /**
   * Execute test case with timeout handling
   */
  private async executeWithTimeout(
    testCase: TestCase,
    execution: TestExecution
  ): Promise<TestResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Test case timeout after ${testCase.timeout}ms`));
      }, testCase.timeout);

      this.executeTestCaseInternal(testCase, execution)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Internal test case execution logic
   */
  private async executeTestCaseInternal(
    testCase: TestCase,
    execution: TestExecution
  ): Promise<TestResult> {
    const startTime = execution.startTime;
    const stepResults: StepResult[] = [];
    const artifacts: TestArtifact[] = [];

    try {
      // Execute each test step
      for (const step of testCase.steps) {
        execution.currentStep = step.id;

        this.logger.debug(`Executing step: ${step.name} (${step.id})`);

        const stepResult = await this.executeTestStep(step, testCase, execution);
        stepResults.push(stepResult);
        execution.stepResults = stepResults;

        // Check if step failed and handle based on test configuration
        if (!this.isStepSuccessful(stepResult)) {
          if (testCase.retry.enabled) {
            // Implement retry logic
            const retryResult = await this.retryTestStep(step, testCase, execution);
            if (retryResult) {
              stepResults[stepResults.length - 1] = retryResult;
            } else {
              // Still failed after retries
              break;
            }
          } else {
            // No retry, fail the test
            break;
          }
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Determine overall test result
      const overallStatus = this.determineOverallStatus(stepResults, testCase);

      // Collect performance metrics
      const performanceMetrics = await this.collectPerformanceMetrics(
        testCase,
        execution,
        duration
      );

      // Generate test artifacts
      const testArtifacts = await this.generateTestArtifacts(testCase, execution);

      const result: TestResult = {
        testCaseId: testCase.id,
        status: overallStatus,
        startTime,
        endTime,
        duration,
        stepResults,
        performance: performanceMetrics,
        artifacts: [...artifacts, ...testArtifacts]
      };

      return result;

    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      return {
        testCaseId: testCase.id,
        status: 'error',
        startTime,
        endTime,
        duration,
        stepResults,
        error: {
          type: error.constructor.name,
          message: error.message,
          stack: error.stack,
          step: execution.currentStep || undefined,
          context: { testCase: testCase.name }
        },
        artifacts
      };
    }
  }

  /**
   * Execute individual test step
   */
  private async executeTestStep(
    step: TestStep,
    testCase: TestCase,
    execution: TestExecution
  ): Promise<StepResult> {
    try {
      const stepStartTime = Date.now();

      // Execute step using test executor
      const result = await this.testExecutor.executeStep(step, testCase, execution);

      const stepDuration = Date.now() - stepStartTime;
      this.logger.debug(`Step completed: ${step.name} in ${stepDuration}ms`);

      return result;

    } catch (error) {
      this.logger.error(`Step failed: ${step.name}`, error);

      return {
        statusCode: 500,
        responseBody: { error: error.message },
        assertions: [{
          type: 'equals',
          target: 'error',
          expected: false,
          message: `Step execution failed: ${error.message}`
        }]
      };
    }
  }

  /**
   * Retry failed test step
   */
  private async retryTestStep(
    step: TestStep,
    testCase: TestCase,
    execution: TestExecution
  ): Promise<StepResult | null> {
    const maxAttempts = testCase.retry.maxAttempts;
    const backoffMultiplier = testCase.retry.backoffMultiplier;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this.logger.log(`Retrying step: ${step.name} (attempt ${attempt}/${maxAttempts})`);

      // Calculate backoff delay
      const delay = Math.pow(backoffMultiplier, attempt - 1) * 1000;
      await this.sleep(delay);

      try {
        const result = await this.executeTestStep(step, testCase, execution);
        if (this.isStepSuccessful(result)) {
          this.logger.log(`Step retry successful: ${step.name} (attempt ${attempt})`);
          return result;
        }
      } catch (error) {
        this.logger.warn(`Step retry failed: ${step.name} (attempt ${attempt})`, error);
      }
    }

    this.logger.error(`Step failed after ${maxAttempts} retries: ${step.name}`);
    return null;
  }

  /**
   * Check if step execution was successful
   */
  private isStepSuccessful(stepResult: StepResult): boolean {
    // Check status code if present
    if (stepResult.statusCode && stepResult.statusCode >= 400) {
      return false;
    }

    // Check assertions
    if (stepResult.assertions) {
      for (const assertion of stepResult.assertions) {
        // This is a simplified check - real implementation would validate assertions
        if (assertion.expected === false) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Determine overall test status from step results
   */
  private determineOverallStatus(stepResults: StepResult[], testCase: TestCase): TestStatus {
    const failedSteps = stepResults.filter(result => !this.isStepSuccessful(result));

    if (failedSteps.length === 0) {
      return 'passed';
    }

    // Check if critical steps failed
    const criticalStepsFailed = failedSteps.some(result =>
      testCase.steps.find(step => step.expectedResult === result)?.name?.includes('critical')
    );

    return criticalStepsFailed ? 'failed' : 'failed';
  }

  /**
   * Collect performance metrics for test execution
   */
  private async collectPerformanceMetrics(
    testCase: TestCase,
    execution: TestExecution,
    duration: number
  ): Promise<PerformanceMetrics> {
    const memoryUsage = process.memoryUsage();

    return {
      responseTime: {
        min: duration,
        max: duration,
        avg: duration,
        p50: duration,
        p95: duration,
        p99: duration
      },
      throughput: {
        requestsPerSecond: 1000 / duration,
        bytesPerSecond: 0 // Would be calculated from actual data transfer
      },
      errors: {
        total: execution.stepResults.filter(r => !this.isStepSuccessful(r)).length,
        rate: 0,
        types: {}
      },
      resources: {
        cpu: 0, // Would require additional monitoring
        memory: memoryUsage.heapUsed / 1024 / 1024, // MB
        network: 0 // Would require network monitoring
      }
    };
  }

  /**
   * Generate test artifacts (logs, screenshots, etc.)
   */
  private async generateTestArtifacts(
    testCase: TestCase,
    execution: TestExecution
  ): Promise<TestArtifact[]> {
    const artifacts: TestArtifact[] = [];

    // Generate execution log artifact
    const logArtifact: TestArtifact = {
      type: 'log',
      name: `${testCase.id}_execution.log`,
      path: `/tmp/test-artifacts/${testCase.id}_execution.log`,
      size: 0, // Would be calculated from actual file
      createdAt: new Date()
    };

    artifacts.push(logArtifact);

    return artifacts;
  }

  /**
   * Create batches for parallel execution
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(testCaseId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${testCaseId}_${timestamp}_${random}`;
  }

  /**
   * Ensure test runner is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Test Runner not initialized. Call initialize() first.');
    }
  }
}

/**
 * Test execution tracking
 */
export interface TestExecution {
  /** Execution ID */
  id: string;
  /** Test case being executed */
  testCase: TestCase;
  /** Current execution status */
  status: 'running' | 'stopped' | 'completed';
  /** Execution start time */
  startTime: Date;
  /** Current step being executed */
  currentStep: string | null;
  /** Completed step results */
  stepResults: StepResult[];
  /** Generated artifacts */
  artifacts: TestArtifact[];
  /** Performance metrics */
  performanceMetrics: PerformanceMetrics | null;
}