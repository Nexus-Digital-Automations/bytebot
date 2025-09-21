/**
 * PARLANT Parallel Test Execution Manager
 *
 * High-performance parallel execution engine for running thousands of PARLANT
 * database function tests concurrently. Optimizes throughput while maintaining
 * resource constraints and test isolation.
 *
 * @fileoverview Parallel execution manager for PARLANT testing framework
 * @version 1.0.0
 * @author PARLANT Testing Framework Agent
 * @created 2025-09-20
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import * as cluster from 'cluster';
import * as os from 'os';
import {
  Test,
  TestSuite,
  TestResult,
  TestStatus,
  TestCategory,
  ParallelConfig
} from '../types/framework.types';

/**
 * Parallel execution configuration
 */
export interface ParallelExecutionConfig extends ParallelConfig {
  readonly isolationMode: 'process' | 'worker' | 'thread';
  readonly resourceLimits: ResourceLimits;
  readonly failureHandling: FailureHandling;
  readonly loadBalancing: LoadBalancingStrategy;
}

/**
 * Resource limits for parallel execution
 */
export interface ResourceLimits {
  readonly maxMemoryMB: number;
  readonly maxCpuPercent: number;
  readonly maxExecutionTime: number;
  readonly maxConcurrentConnections: number;
}

/**
 * Failure handling configuration
 */
export interface FailureHandling {
  readonly retryOnFailure: boolean;
  readonly maxRetries: number;
  readonly retryDelay: number;
  readonly failFast: boolean;
  readonly isolateFailures: boolean;
}

/**
 * Load balancing strategy
 */
export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'ROUND_ROBIN',
  LEAST_LOADED = 'LEAST_LOADED',
  FASTEST_RESPONSE = 'FASTEST_RESPONSE',
  CATEGORY_BASED = 'CATEGORY_BASED'
}

/**
 * Execution batch for parallel processing
 */
export interface ExecutionBatch {
  readonly batchId: string;
  readonly tests: Test[];
  readonly workerId: number;
  readonly priority: number;
  readonly estimatedDuration: number;
}

/**
 * Worker status information
 */
export interface WorkerStatus {
  readonly workerId: number;
  readonly status: 'idle' | 'busy' | 'error' | 'terminated';
  readonly currentTest?: string;
  readonly testsCompleted: number;
  readonly averageExecutionTime: number;
  readonly memoryUsage: number;
  readonly cpuUsage: number;
  readonly lastHeartbeat: number;
}

/**
 * Parallel execution metrics
 */
export interface ParallelExecutionMetrics {
  readonly totalWorkers: number;
  readonly activeWorkers: number;
  readonly totalTests: number;
  readonly completedTests: number;
  readonly failedTests: number;
  readonly averageExecutionTime: number;
  readonly throughput: number; // tests per second
  readonly efficiency: number; // percentage
  readonly resourceUtilization: ResourceUtilization;
}

/**
 * Resource utilization metrics
 */
export interface ResourceUtilization {
  readonly cpuUsage: number;
  readonly memoryUsage: number;
  readonly networkUsage: number;
  readonly diskUsage: number;
}

/**
 * Parallel execution result
 */
export interface ParallelExecutionResult {
  readonly executionId: string;
  readonly totalTests: number;
  readonly completedTests: number;
  readonly successfulTests: number;
  readonly failedTests: number;
  readonly skippedTests: number;
  readonly totalDuration: number;
  readonly averageExecutionTime: number;
  readonly throughput: number;
  readonly workerResults: WorkerExecutionResult[];
  readonly metrics: ParallelExecutionMetrics;
}

/**
 * Worker execution result
 */
export interface WorkerExecutionResult {
  readonly workerId: number;
  readonly testsExecuted: number;
  readonly successfulTests: number;
  readonly failedTests: number;
  readonly totalDuration: number;
  readonly averageExecutionTime: number;
  readonly memoryPeak: number;
  readonly cpuPeak: number;
}

@Injectable()
export class ParallelExecutionManager extends EventEmitter {
  private readonly logger = new Logger(ParallelExecutionManager.name);
  private config!: ParallelExecutionConfig;
  private workers: Map<number, Worker> = new Map();
  private workerStatus: Map<number, WorkerStatus> = new Map();
  private executionQueue: ExecutionBatch[] = [];
  private currentExecution: string | null = null;
  private metrics!: ParallelExecutionMetrics;
  private isInitialized = false;

  constructor() {
    super();
    this.initializeMetrics();
  }

  /**
   * Initialize parallel execution manager
   */
  async initialize(config: ParallelExecutionConfig): Promise<void> {
    this.logger.log('Initializing Parallel Execution Manager...');

    this.config = {
      ...config,
      maxWorkers: Math.min(config.maxWorkers, os.cpus().length)
    };

    try {
      // Setup event handlers
      this.setupEventHandlers();

      // Initialize worker pool
      await this.initializeWorkerPool();

      // Setup resource monitoring
      this.setupResourceMonitoring();

      // Setup health checks
      this.setupHealthChecks();

      this.isInitialized = true;
      this.logger.log(`Parallel Execution Manager initialized with ${this.config.maxWorkers} workers`);
      this.emit('manager:initialized', { config: this.config });

    } catch (error) {
      this.logger.error('Failed to initialize Parallel Execution Manager', error);
      throw new Error(`Parallel execution initialization failed: ${error.message}`);
    }
  }

  /**
   * Execute tests in parallel across multiple workers
   */
  async executeTestsInParallel(
    tests: Test[],
    executionId: string = `parallel_${Date.now()}`
  ): Promise<ParallelExecutionResult> {
    this.ensureInitialized();

    if (tests.length === 0) {
      throw new Error('No tests provided for parallel execution');
    }

    this.logger.log(`Starting parallel execution: ${executionId}`, {
      totalTests: tests.length,
      workers: this.config.maxWorkers
    });

    this.currentExecution = executionId;
    const startTime = Date.now();

    try {
      // Create execution batches
      const batches = await this.createExecutionBatches(tests);

      // Distribute batches to workers
      const workerPromises = await this.distributeBatchesToWorkers(batches, executionId);

      // Wait for all workers to complete
      const workerResults = await Promise.allSettled(workerPromises);

      // Aggregate results
      const result = await this.aggregateParallelResults(
        executionId,
        tests,
        workerResults,
        startTime
      );

      this.currentExecution = null;
      this.logger.log(`Parallel execution completed: ${executionId}`, {
        totalTests: result.totalTests,
        successful: result.successfulTests,
        failed: result.failedTests,
        duration: result.totalDuration,
        throughput: result.throughput
      });

      this.emit('execution:completed', result);
      return result;

    } catch (error) {
      this.currentExecution = null;
      this.logger.error(`Parallel execution failed: ${executionId}`, error);
      this.emit('execution:failed', { executionId, error: error.message });
      throw error;
    }
  }

  /**
   * Execute test suites in parallel
   */
  async executeTestSuitesInParallel(
    suites: TestSuite[],
    executionId: string = `suites_${Date.now()}`
  ): Promise<ParallelExecutionResult> {
    const allTests = suites.flatMap(suite => suite.tests);
    return this.executeTestsInParallel(allTests, executionId);
  }

  /**
   * Execute tests by category in parallel
   */
  async executeTestCategoryInParallel(
    tests: Test[],
    category: TestCategory,
    executionId: string = `category_${category.toLowerCase()}_${Date.now()}`
  ): Promise<ParallelExecutionResult> {
    const categoryTests = tests.filter(test => test.category === category);
    return this.executeTestsInParallel(categoryTests, executionId);
  }

  /**
   * Get current execution status
   */
  getCurrentExecutionStatus(): {
    executionId: string | null;
    isRunning: boolean;
    progress: number;
    metrics: ParallelExecutionMetrics;
  } {
    return {
      executionId: this.currentExecution,
      isRunning: this.currentExecution !== null,
      progress: this.calculateProgress(),
      metrics: this.metrics
    };
  }

  /**
   * Get worker status information
   */
  getWorkerStatus(): WorkerStatus[] {
    return Array.from(this.workerStatus.values());
  }

  /**
   * Scale worker pool up or down
   */
  async scaleWorkers(targetWorkerCount: number): Promise<void> {
    this.ensureInitialized();

    const currentWorkerCount = this.workers.size;
    const maxWorkers = os.cpus().length;

    targetWorkerCount = Math.min(targetWorkerCount, maxWorkers);

    if (targetWorkerCount === currentWorkerCount) {
      this.logger.log(`Worker count already at target: ${targetWorkerCount}`);
      return;
    }

    this.logger.log(`Scaling workers from ${currentWorkerCount} to ${targetWorkerCount}`);

    if (targetWorkerCount > currentWorkerCount) {
      // Scale up
      const workersToAdd = targetWorkerCount - currentWorkerCount;
      await this.addWorkers(workersToAdd);
    } else {
      // Scale down
      const workersToRemove = currentWorkerCount - targetWorkerCount;
      await this.removeWorkers(workersToRemove);
    }

    this.config = { ...this.config, maxWorkers: targetWorkerCount };
    this.emit('workers:scaled', { targetWorkerCount, currentWorkerCount: this.workers.size });
  }

  /**
   * Stop current execution and shutdown workers
   */
  async shutdown(): Promise<void> {
    this.logger.log('Shutting down Parallel Execution Manager...');

    // Stop current execution
    if (this.currentExecution) {
      this.emit('execution:stopping', { executionId: this.currentExecution });
      this.currentExecution = null;
    }

    // Terminate all workers
    const shutdownPromises = Array.from(this.workers.values()).map(worker =>
      this.terminateWorker(worker.id)
    );

    await Promise.allSettled(shutdownPromises);

    this.workers.clear();
    this.workerStatus.clear();
    this.executionQueue = [];

    this.isInitialized = false;
    this.logger.log('Parallel Execution Manager shutdown complete');
    this.emit('manager:shutdown');
  }

  // ===== PRIVATE METHODS =====

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Parallel Execution Manager not initialized. Call initialize() first.');
    }
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalWorkers: 0,
      activeWorkers: 0,
      totalTests: 0,
      completedTests: 0,
      failedTests: 0,
      averageExecutionTime: 0,
      throughput: 0,
      efficiency: 0,
      resourceUtilization: {
        cpuUsage: 0,
        memoryUsage: 0,
        networkUsage: 0,
        diskUsage: 0
      }
    };
  }

  private setupEventHandlers(): void {
    // Handle worker messages
    this.on('worker:message', (workerId, message) => {
      this.handleWorkerMessage(workerId, message);
    });

    // Handle worker errors
    this.on('worker:error', (workerId, error) => {
      this.handleWorkerError(workerId, error);
    });

    // Handle worker exit
    this.on('worker:exit', (workerId, code) => {
      this.handleWorkerExit(workerId, code);
    });
  }

  private async initializeWorkerPool(): Promise<void> {
    this.logger.log(`Initializing worker pool with ${this.config.maxWorkers} workers`);

    const workerPromises: Promise<void>[] = [];

    for (let i = 0; i < this.config.maxWorkers; i++) {
      workerPromises.push(this.createWorker(i));
    }

    await Promise.all(workerPromises);
    this.logger.log(`Worker pool initialized with ${this.workers.size} workers`);
  }

  private async createWorker(workerId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = cluster.fork({
        WORKER_ID: workerId.toString(),
        WORKER_TYPE: 'test-executor'
      });

      worker.on('online', () => {
        this.workers.set(workerId, worker);
        this.workerStatus.set(workerId, {
          workerId,
          status: 'idle',
          testsCompleted: 0,
          averageExecutionTime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          lastHeartbeat: Date.now()
        });

        this.logger.debug(`Worker ${workerId} created and online`);
        resolve();
      });

      worker.on('message', (message) => {
        this.emit('worker:message', workerId, message);
      });

      worker.on('error', (error) => {
        this.emit('worker:error', workerId, error);
        reject(error);
      });

      worker.on('exit', (code, signal) => {
        this.emit('worker:exit', workerId, code);
      });

      // Set timeout for worker creation
      setTimeout(() => {
        if (!this.workers.has(workerId)) {
          reject(new Error(`Worker ${workerId} failed to start within timeout`));
        }
      }, 10000);
    });
  }

  private async createExecutionBatches(tests: Test[]): Promise<ExecutionBatch[]> {
    const batches: ExecutionBatch[] = [];
    const batchSize = this.config.batchSize;

    // Sort tests by category and priority for optimal distribution
    const sortedTests = this.sortTestsForOptimalExecution(tests);

    for (let i = 0; i < sortedTests.length; i += batchSize) {
      const batchTests = sortedTests.slice(i, i + batchSize);
      const estimatedDuration = this.estimateBatchDuration(batchTests);
      const priority = this.calculateBatchPriority(batchTests);

      batches.push({
        batchId: `batch_${i / batchSize}_${Date.now()}`,
        tests: batchTests,
        workerId: -1, // Will be assigned later
        priority,
        estimatedDuration
      });
    }

    this.logger.log(`Created ${batches.length} execution batches for ${tests.length} tests`);
    return batches;
  }

  private sortTestsForOptimalExecution(tests: Test[]): Test[] {
    return tests.sort((a, b) => {
      // Sort by priority first (critical tests first)
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by category (performance tests last due to resource intensity)
      const categoryOrder = { UNIT: 0, INTEGRATION: 1, SECURITY: 2, REGRESSION: 3, PERFORMANCE: 4 };
      const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category];
      if (categoryDiff !== 0) return categoryDiff;

      // Finally by estimated execution time (shorter tests first)
      return a.timeout - b.timeout;
    });
  }

  private estimateBatchDuration(tests: Test[]): number {
    return tests.reduce((total, test) => total + test.timeout, 0);
  }

  private calculateBatchPriority(tests: Test[]): number {
    const priorityWeights = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const totalWeight = tests.reduce((sum, test) => sum + priorityWeights[test.priority], 0);
    return totalWeight / tests.length;
  }

  private async distributeBatchesToWorkers(
    batches: ExecutionBatch[],
    executionId: string
  ): Promise<Promise<WorkerExecutionResult>[]> {
    const workerPromises: Promise<WorkerExecutionResult>[] = [];

    // Sort batches by priority (highest first)
    const sortedBatches = batches.sort((a, b) => b.priority - a.priority);

    // Distribute batches using configured load balancing strategy
    const workerAssignments = this.assignBatchesToWorkers(sortedBatches);

    for (const [workerId, workerBatches] of workerAssignments) {
      const workerPromise = this.executeWorkerBatches(workerId, workerBatches, executionId);
      workerPromises.push(workerPromise);
    }

    return workerPromises;
  }

  private assignBatchesToWorkers(batches: ExecutionBatch[]): Map<number, ExecutionBatch[]> {
    const assignments = new Map<number, ExecutionBatch[]>();
    const workerLoads = new Map<number, number>();

    // Initialize worker assignments
    for (const workerId of this.workers.keys()) {
      assignments.set(workerId, []);
      workerLoads.set(workerId, 0);
    }

    // Assign batches based on load balancing strategy
    for (const batch of batches) {
      const workerId = this.selectWorkerForBatch(batch, workerLoads);

      assignments.get(workerId)!.push(batch);
      workerLoads.set(workerId, workerLoads.get(workerId)! + batch.estimatedDuration);
    }

    return assignments;
  }

  private selectWorkerForBatch(batch: ExecutionBatch, workerLoads: Map<number, number>): number {
    switch (this.config.loadBalancing) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        return this.selectRoundRobinWorker();

      case LoadBalancingStrategy.LEAST_LOADED:
        return this.selectLeastLoadedWorker(workerLoads);

      case LoadBalancingStrategy.FASTEST_RESPONSE:
        return this.selectFastestWorker();

      case LoadBalancingStrategy.CATEGORY_BASED:
        return this.selectCategoryBasedWorker(batch);

      default:
        return this.selectLeastLoadedWorker(workerLoads);
    }
  }

  private selectRoundRobinWorker(): number {
    const workerIds = Array.from(this.workers.keys());
    return workerIds[Math.floor(Math.random() * workerIds.length)];
  }

  private selectLeastLoadedWorker(workerLoads: Map<number, number>): number {
    let minLoad = Number.MAX_VALUE;
    let selectedWorker = -1;

    for (const [workerId, load] of workerLoads) {
      if (load < minLoad) {
        minLoad = load;
        selectedWorker = workerId;
      }
    }

    return selectedWorker;
  }

  private selectFastestWorker(): number {
    let fastestWorker = -1;
    let bestAverageTime = Number.MAX_VALUE;

    for (const [workerId, status] of this.workerStatus) {
      if (status.averageExecutionTime < bestAverageTime && status.status === 'idle') {
        bestAverageTime = status.averageExecutionTime;
        fastestWorker = workerId;
      }
    }

    return fastestWorker !== -1 ? fastestWorker : this.selectRoundRobinWorker();
  }

  private selectCategoryBasedWorker(batch: ExecutionBatch): number {
    // Assign performance tests to workers with lower load
    const hasPerformanceTests = batch.tests.some(test => test.category === TestCategory.PERFORMANCE);

    if (hasPerformanceTests) {
      const workerLoads = new Map<number, number>();
      for (const workerId of this.workers.keys()) {
        workerLoads.set(workerId, this.workerStatus.get(workerId)?.testsCompleted || 0);
      }
      return this.selectLeastLoadedWorker(workerLoads);
    }

    return this.selectRoundRobinWorker();
  }

  private async executeWorkerBatches(
    workerId: number,
    batches: ExecutionBatch[],
    executionId: string
  ): Promise<WorkerExecutionResult> {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let testsExecuted = 0;
      let successfulTests = 0;
      let failedTests = 0;
      let memoryPeak = 0;
      let cpuPeak = 0;

      const timeoutId = setTimeout(() => {
        reject(new Error(`Worker ${workerId} execution timeout`));
      }, this.config.timeout);

      const messageHandler = (message: any) => {
        if (message.type === 'batch-complete') {
          testsExecuted += message.testsExecuted;
          successfulTests += message.successfulTests;
          failedTests += message.failedTests;
          memoryPeak = Math.max(memoryPeak, message.memoryPeak || 0);
          cpuPeak = Math.max(cpuPeak, message.cpuPeak || 0);

          // Check if all batches are complete
          if (message.batchIndex === batches.length - 1) {
            clearTimeout(timeoutId);
            worker.off('message', messageHandler);

            const endTime = Date.now();
            const totalDuration = endTime - startTime;
            const averageExecutionTime = testsExecuted > 0 ? totalDuration / testsExecuted : 0;

            resolve({
              workerId,
              testsExecuted,
              successfulTests,
              failedTests,
              totalDuration,
              averageExecutionTime,
              memoryPeak,
              cpuPeak
            });
          }
        } else if (message.type === 'error') {
          clearTimeout(timeoutId);
          worker.off('message', messageHandler);
          reject(new Error(`Worker ${workerId} error: ${message.error}`));
        }
      };

      worker.on('message', messageHandler);

      // Send batches to worker
      worker.send({
        type: 'execute-batches',
        executionId,
        batches: batches.map((batch, index) => ({ ...batch, batchIndex: index })),
        config: this.config
      });

      // Update worker status
      this.updateWorkerStatus(workerId, 'busy');
    });
  }

  private async aggregateParallelResults(
    executionId: string,
    originalTests: Test[],
    workerResults: PromiseSettledResult<WorkerExecutionResult>[],
    startTime: number
  ): Promise<ParallelExecutionResult> {
    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    const successfulWorkerResults = workerResults
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<WorkerExecutionResult>).value);

    const totalTests = originalTests.length;
    const completedTests = successfulWorkerResults.reduce((sum, result) => sum + result.testsExecuted, 0);
    const successfulTests = successfulWorkerResults.reduce((sum, result) => sum + result.successfulTests, 0);
    const failedTests = successfulWorkerResults.reduce((sum, result) => sum + result.failedTests, 0);
    const skippedTests = totalTests - completedTests;

    const averageExecutionTime = successfulWorkerResults.length > 0
      ? successfulWorkerResults.reduce((sum, result) => sum + result.averageExecutionTime, 0) / successfulWorkerResults.length
      : 0;

    const throughput = totalDuration > 0 ? (completedTests / totalDuration) * 1000 : 0; // tests per second

    // Update metrics
    this.updateMetrics({
      totalTests: completedTests,
      successfulTests,
      failedTests,
      averageExecutionTime,
      throughput
    });

    return {
      executionId,
      totalTests,
      completedTests,
      successfulTests,
      failedTests,
      skippedTests,
      totalDuration,
      averageExecutionTime,
      throughput,
      workerResults: successfulWorkerResults,
      metrics: { ...this.metrics }
    };
  }

  private updateWorkerStatus(workerId: number, status: WorkerStatus['status'], additionalData?: Partial<WorkerStatus>): void {
    const currentStatus = this.workerStatus.get(workerId);
    if (currentStatus) {
      this.workerStatus.set(workerId, {
        ...currentStatus,
        status,
        lastHeartbeat: Date.now(),
        ...additionalData
      });
    }
  }

  private updateMetrics(data: Partial<ParallelExecutionMetrics>): void {
    this.metrics = { ...this.metrics, ...data };
  }

  private calculateProgress(): number {
    if (!this.currentExecution || this.metrics.totalTests === 0) {
      return 0;
    }
    return (this.metrics.completedTests / this.metrics.totalTests) * 100;
  }

  private setupResourceMonitoring(): void {
    // Monitor system resources every 5 seconds
    setInterval(() => {
      this.collectResourceMetrics();
    }, 5000);
  }

  private collectResourceMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.metrics = {
      ...this.metrics,
      resourceUtilization: {
        cpuUsage: cpuUsage.user + cpuUsage.system,
        memoryUsage: memUsage.heapUsed,
        networkUsage: 0, // Would need additional monitoring
        diskUsage: 0     // Would need additional monitoring
      }
    };

    this.emit('metrics:updated', this.metrics);
  }

  private setupHealthChecks(): void {
    // Health check every 30 seconds
    setInterval(() => {
      this.performHealthCheck();
    }, 30000);
  }

  private performHealthCheck(): void {
    const unhealthyWorkers: number[] = [];
    const currentTime = Date.now();

    for (const [workerId, status] of this.workerStatus) {
      // Check if worker hasn't sent heartbeat in last 60 seconds
      if (currentTime - status.lastHeartbeat > 60000) {
        unhealthyWorkers.push(workerId);
      }
    }

    if (unhealthyWorkers.length > 0) {
      this.logger.warn(`Found ${unhealthyWorkers.length} unhealthy workers`, { unhealthyWorkers });
      this.emit('workers:unhealthy', unhealthyWorkers);

      // Restart unhealthy workers
      for (const workerId of unhealthyWorkers) {
        this.restartWorker(workerId);
      }
    }
  }

  private async restartWorker(workerId: number): Promise<void> {
    this.logger.log(`Restarting worker ${workerId}`);

    try {
      await this.terminateWorker(workerId);
      await this.createWorker(workerId);
      this.logger.log(`Worker ${workerId} restarted successfully`);
    } catch (error) {
      this.logger.error(`Failed to restart worker ${workerId}`, error);
    }
  }

  private async addWorkers(count: number): Promise<void> {
    const currentMaxId = Math.max(...this.workers.keys(), -1);
    const promises: Promise<void>[] = [];

    for (let i = 1; i <= count; i++) {
      const workerId = currentMaxId + i;
      promises.push(this.createWorker(workerId));
    }

    await Promise.all(promises);
    this.logger.log(`Added ${count} workers`);
  }

  private async removeWorkers(count: number): Promise<void> {
    const workerIds = Array.from(this.workers.keys()).slice(-count);
    const promises = workerIds.map(workerId => this.terminateWorker(workerId));

    await Promise.allSettled(promises);
    this.logger.log(`Removed ${count} workers`);
  }

  private async terminateWorker(workerId: number): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        worker.kill('SIGKILL');
        resolve();
      }, 5000);

      worker.on('exit', () => {
        clearTimeout(timeout);
        this.workers.delete(workerId);
        this.workerStatus.delete(workerId);
        resolve();
      });

      worker.kill('SIGTERM');
    });
  }

  private handleWorkerMessage(workerId: number, message: any): void {
    switch (message.type) {
      case 'heartbeat':
        this.updateWorkerStatus(workerId, 'idle', {
          memoryUsage: message.memoryUsage,
          cpuUsage: message.cpuUsage
        });
        break;

      case 'test-start':
        this.updateWorkerStatus(workerId, 'busy', {
          currentTest: message.testId
        });
        break;

      case 'test-complete':
        this.updateWorkerStatus(workerId, 'idle', {
          testsCompleted: this.workerStatus.get(workerId)!.testsCompleted + 1,
          currentTest: undefined
        });
        break;

      default:
        this.logger.debug(`Unknown message from worker ${workerId}:`, message);
    }
  }

  private handleWorkerError(workerId: number, error: Error): void {
    this.logger.error(`Worker ${workerId} error:`, error);
    this.updateWorkerStatus(workerId, 'error');
    this.emit('worker:failed', { workerId, error: error.message });

    // Restart worker if execution is still running
    if (this.currentExecution) {
      this.restartWorker(workerId);
    }
  }

  private handleWorkerExit(workerId: number, code: number): void {
    this.logger.warn(`Worker ${workerId} exited with code ${code}`);
    this.workers.delete(workerId);
    this.workerStatus.delete(workerId);
    this.emit('worker:exited', { workerId, code });

    // Restart worker if execution is still running and exit was unexpected
    if (this.currentExecution && code !== 0) {
      this.createWorker(workerId);
    }
  }
}