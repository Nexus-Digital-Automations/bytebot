/**
 * Test Scheduler - Manages test execution scheduling and prioritization
 * Handles parallel execution, resource allocation, and test orchestration
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  TestSuite,
  TestCase,
  TestResult,
  TestExecutionConfig
} from '@/types';
import { TestRunner } from './test-runner';
import { TestContext } from './test-context';
import { ComponentHealth } from './test-framework';

/**
 * Test Scheduler for managing test execution order and parallelization
 */
@Injectable()
export class TestScheduler {
  private readonly logger = new Logger(TestScheduler.name);

  private isInitialized = false;
  private scheduledExecutions = new Map<string, ScheduledExecution>();
  private executionQueue: QueuedExecution[] = [];
  private runningExecutions = new Set<string>();

  constructor(
    private readonly testRunner: TestRunner,
    private readonly testContext: TestContext
  ) {}

  /**
   * Initialize test scheduler
   */
  async initialize(): Promise<void> {
    try {
      this.logger.log('Initializing Test Scheduler');

      this.scheduledExecutions.clear();
      this.executionQueue = [];
      this.runningExecutions.clear();

      this.isInitialized = true;
      this.logger.log('Test Scheduler initialized successfully');
    } catch (error) {
      this.logger.error('Test Scheduler initialization failed', error);
      throw error;
    }
  }

  /**
   * Schedule test suite execution
   */
  async scheduleTestSuite(
    testSuite: TestSuite,
    executionConfig: TestExecutionConfig,
    executionId: string
  ): Promise<void> {
    this.ensureInitialized();

    try {
      this.logger.log(`Scheduling test suite: ${testSuite.name}`);

      const scheduled: ScheduledExecution = {
        id: executionId,
        testSuite,
        executionConfig,
        status: 'scheduled',
        scheduledAt: new Date(),
        testCases: this.prioritizeTestCases(testSuite.testCases),
        dependencies: this.resolveDependencies(testSuite.testCases)
      };

      this.scheduledExecutions.set(executionId, scheduled);

      // Add to execution queue
      this.addToExecutionQueue(scheduled);

      this.logger.log(`Test suite scheduled: ${testSuite.name} (${executionId})`);
    } catch (error) {
      this.logger.error(`Test suite scheduling failed: ${testSuite.name}`, error);
      throw error;
    }
  }

  /**
   * Execute scheduled test suites
   */
  async executeScheduled(): Promise<Map<string, TestResult[]>> {
    this.ensureInitialized();

    const results = new Map<string, TestResult[]>();

    try {
      this.logger.log('Starting scheduled test execution');

      while (this.executionQueue.length > 0 || this.runningExecutions.size > 0) {
        // Start new executions if possible
        await this.startPendingExecutions();

        // Wait for running executions to complete
        await this.waitForRunningExecutions();

        // Process completed executions
        const completedExecutions = await this.processCompletedExecutions();

        for (const [executionId, result] of completedExecutions) {
          results.set(executionId, result);
        }
      }

      this.logger.log('Scheduled test execution completed');
      return results;

    } catch (error) {
      this.logger.error('Scheduled test execution failed', error);
      throw error;
    }
  }

  /**
   * Execute test suite with specific scheduling strategy
   */
  async executeTestSuiteWithScheduling(
    testSuite: TestSuite,
    executionConfig: TestExecutionConfig,
    executionId: string
  ): Promise<TestResult[]> {
    this.ensureInitialized();

    try {
      this.logger.log(`Executing test suite with scheduling: ${testSuite.name}`);

      // Schedule the test suite
      await this.scheduleTestSuite(testSuite, executionConfig, executionId);

      // Execute based on configuration
      if (executionConfig.parallel.enabled) {
        return await this.executeParallel(executionId);
      } else {
        return await this.executeSequential(executionId);
      }

    } catch (error) {
      this.logger.error(`Scheduled test suite execution failed: ${testSuite.name}`, error);
      throw error;
    }
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): ExecutionStatus | null {
    const scheduled = this.scheduledExecutions.get(executionId);
    if (!scheduled) {
      return null;
    }

    return {
      id: executionId,
      status: scheduled.status,
      progress: this.calculateProgress(scheduled),
      startTime: scheduled.startedAt,
      endTime: scheduled.completedAt,
      testCasesCompleted: scheduled.completedTestCases?.length || 0,
      testCasesTotal: scheduled.testCases.length,
      currentPhase: this.getCurrentPhase(scheduled)
    };
  }

  /**
   * Cancel execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    const scheduled = this.scheduledExecutions.get(executionId);
    if (scheduled) {
      scheduled.status = 'cancelled';
      this.runningExecutions.delete(executionId);

      // Remove from queue if not started
      this.executionQueue = this.executionQueue.filter(q => q.executionId !== executionId);

      this.logger.log(`Execution cancelled: ${executionId}`);
    }
  }

  /**
   * Get scheduler health
   */
  async getHealth(): Promise<ComponentHealth> {
    const queueSize = this.executionQueue.length;
    const runningCount = this.runningExecutions.size;
    const scheduledCount = this.scheduledExecutions.size;

    return {
      status: this.isInitialized ? 'healthy' : 'not_initialized',
      message: `Queue: ${queueSize}, Running: ${runningCount}, Scheduled: ${scheduledCount}`,
      lastActivity: new Date(),
      metrics: {
        queueSize,
        runningExecutions: runningCount,
        scheduledExecutions: scheduledCount,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
      }
    };
  }

  /**
   * Cleanup scheduler resources
   */
  async cleanup(): Promise<void> {
    try {
      this.logger.log('Starting Test Scheduler cleanup');

      // Cancel all running executions
      for (const executionId of this.runningExecutions) {
        await this.cancelExecution(executionId);
      }

      this.scheduledExecutions.clear();
      this.executionQueue = [];
      this.runningExecutions.clear();

      this.isInitialized = false;
      this.logger.log('Test Scheduler cleanup completed');
    } catch (error) {
      this.logger.error('Test Scheduler cleanup failed', error);
      throw error;
    }
  }

  /**
   * Prioritize test cases based on various factors
   */
  private prioritizeTestCases(testCases: TestCase[]): TestCase[] {
    return testCases.sort((a, b) => {
      // Priority order: critical > high > medium > low
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      // Secondary sort by test type (smoke tests first)
      if (a.type === 'smoke' && b.type !== 'smoke') return -1;
      if (b.type === 'smoke' && a.type !== 'smoke') return 1;

      // Tertiary sort by expected duration (shorter first)
      return (a.timeout || 0) - (b.timeout || 0);
    });
  }

  /**
   * Resolve test case dependencies
   */
  private resolveDependencies(testCases: TestCase[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();

    for (const testCase of testCases) {
      const testDependencies: string[] = [];

      // Extract dependencies from test steps
      for (const step of testCase.steps) {
        testDependencies.push(...step.dependencies);
      }

      if (testDependencies.length > 0) {
        dependencies.set(testCase.id, testDependencies);
      }
    }

    return dependencies;
  }

  /**
   * Add execution to queue
   */
  private addToExecutionQueue(scheduled: ScheduledExecution): void {
    const queuedExecution: QueuedExecution = {
      executionId: scheduled.id,
      priority: this.calculateExecutionPriority(scheduled),
      dependencies: scheduled.dependencies,
      queuedAt: new Date()
    };

    // Insert in priority order
    let insertIndex = 0;
    while (
      insertIndex < this.executionQueue.length &&
      this.executionQueue[insertIndex].priority >= queuedExecution.priority
    ) {
      insertIndex++;
    }

    this.executionQueue.splice(insertIndex, 0, queuedExecution);
  }

  /**
   * Calculate execution priority
   */
  private calculateExecutionPriority(scheduled: ScheduledExecution): number {
    let priority = 0;

    // Base priority on critical test cases
    const criticalTests = scheduled.testCases.filter(tc => tc.priority === 'critical');
    priority += criticalTests.length * 10;

    // Add priority for smoke tests
    const smokeTests = scheduled.testCases.filter(tc => tc.type === 'smoke');
    priority += smokeTests.length * 5;

    return priority;
  }

  /**
   * Start pending executions
   */
  private async startPendingExecutions(): Promise<void> {
    const maxConcurrent = 5; // Configurable limit

    while (
      this.executionQueue.length > 0 &&
      this.runningExecutions.size < maxConcurrent
    ) {
      const next = this.executionQueue[0];

      // Check if dependencies are satisfied
      if (this.areDependenciesSatisfied(next)) {
        this.executionQueue.shift();
        await this.startExecution(next.executionId);
      } else {
        // Can't start this one, try next
        break;
      }
    }
  }

  /**
   * Check if dependencies are satisfied
   */
  private areDependenciesSatisfied(queued: QueuedExecution): boolean {
    for (const [testCaseId, deps] of queued.dependencies) {
      for (const dep of deps) {
        // Check if dependency is completed
        if (!this.isDependencyCompleted(dep)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Check if dependency is completed
   */
  private isDependencyCompleted(dependency: string): boolean {
    // This would check if the dependency test case has completed successfully
    // For now, assume all dependencies are satisfied
    return true;
  }

  /**
   * Start execution
   */
  private async startExecution(executionId: string): Promise<void> {
    const scheduled = this.scheduledExecutions.get(executionId);
    if (!scheduled) {
      return;
    }

    scheduled.status = 'running';
    scheduled.startedAt = new Date();
    this.runningExecutions.add(executionId);

    this.logger.log(`Starting execution: ${executionId}`);

    // Start async execution
    this.executeInBackground(scheduled).catch(error => {
      this.logger.error(`Background execution failed: ${executionId}`, error);
      scheduled.status = 'failed';
      scheduled.error = error.message;
      this.runningExecutions.delete(executionId);
    });
  }

  /**
   * Execute in background
   */
  private async executeInBackground(scheduled: ScheduledExecution): Promise<void> {
    try {
      const results: TestResult[] = [];

      for (const testCase of scheduled.testCases) {
        if (scheduled.status === 'cancelled') {
          break;
        }

        const result = await this.testRunner.executeTestCase(testCase);
        results.push(result);

        scheduled.completedTestCases = scheduled.completedTestCases || [];
        scheduled.completedTestCases.push(result);
      }

      scheduled.results = results;
      scheduled.status = 'completed';
      scheduled.completedAt = new Date();
      this.runningExecutions.delete(scheduled.id);

    } catch (error) {
      scheduled.status = 'failed';
      scheduled.error = error.message;
      scheduled.completedAt = new Date();
      this.runningExecutions.delete(scheduled.id);
      throw error;
    }
  }

  /**
   * Wait for running executions
   */
  private async waitForRunningExecutions(): Promise<void> {
    if (this.runningExecutions.size === 0) {
      return;
    }

    // Wait for at least one execution to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Process completed executions
   */
  private async processCompletedExecutions(): Promise<Map<string, TestResult[]>> {
    const completed = new Map<string, TestResult[]>();

    for (const [executionId, scheduled] of this.scheduledExecutions) {
      if (scheduled.status === 'completed' && scheduled.results) {
        completed.set(executionId, scheduled.results);
        this.scheduledExecutions.delete(executionId);
      }
    }

    return completed;
  }

  /**
   * Execute parallel
   */
  private async executeParallel(executionId: string): Promise<TestResult[]> {
    const scheduled = this.scheduledExecutions.get(executionId);
    if (!scheduled) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    // Wait for execution to complete
    while (scheduled.status === 'running' || scheduled.status === 'scheduled') {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (scheduled.status === 'failed') {
      throw new Error(`Execution failed: ${scheduled.error}`);
    }

    return scheduled.results || [];
  }

  /**
   * Execute sequential
   */
  private async executeSequential(executionId: string): Promise<TestResult[]> {
    // For sequential execution, the background execution already handles this
    return await this.executeParallel(executionId);
  }

  /**
   * Calculate execution progress
   */
  private calculateProgress(scheduled: ScheduledExecution): number {
    const totalTests = scheduled.testCases.length;
    const completedTests = scheduled.completedTestCases?.length || 0;
    return totalTests > 0 ? (completedTests / totalTests) * 100 : 0;
  }

  /**
   * Get current execution phase
   */
  private getCurrentPhase(scheduled: ScheduledExecution): string {
    switch (scheduled.status) {
      case 'scheduled':
        return 'Scheduled';
      case 'running':
        return 'Running Tests';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  /**
   * Ensure scheduler is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Test Scheduler not initialized. Call initialize() first.');
    }
  }
}

/**
 * Scheduled execution tracking
 */
interface ScheduledExecution {
  id: string;
  testSuite: TestSuite;
  executionConfig: TestExecutionConfig;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  testCases: TestCase[];
  dependencies: Map<string, string[]>;
  completedTestCases?: TestResult[];
  results?: TestResult[];
  error?: string;
}

/**
 * Queued execution
 */
interface QueuedExecution {
  executionId: string;
  priority: number;
  dependencies: Map<string, string[]>;
  queuedAt: Date;
}

/**
 * Execution status
 */
interface ExecutionStatus {
  id: string;
  status: string;
  progress: number;
  startTime?: Date;
  endTime?: Date;
  testCasesCompleted: number;
  testCasesTotal: number;
  currentPhase: string;
}