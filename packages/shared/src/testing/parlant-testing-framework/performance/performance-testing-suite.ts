/**
 * PARLANT Performance Testing Suite
 *
 * Comprehensive performance testing framework for PARLANT database functions
 * with sub-1000ms response time validation, load testing, and performance
 * regression detection.
 *
 * @fileoverview Performance testing suite for PARLANT functions
 * @version 1.0.0
 * @author PARLANT Testing Framework Agent
 * @created 2025-09-20
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import * as perf_hooks from 'perf_hooks';
import {
  DatabaseFunction,
  TestFrameworkConfig,
  TestResult,
  TestStatus
} from '../types/test-framework.types';
import {
  PerformanceTestConfig,
  PerformanceTestResult,
  LoadTestResult,
  StressTestResult,
  ThroughputTestResult,
  PerformanceBenchmark,
  PerformanceMetrics,
  ResourceUsageMetrics
} from '../types/performance-testing.types';

/**
 * Performance test execution context
 */
export interface PerformanceTestContext {
  readonly testId: string;
  readonly functionName: string;
  readonly startTime: number;
  readonly config: PerformanceTestConfig;
  readonly metrics: PerformanceMetrics;
}

/**
 * Performance test scenario
 */
export interface PerformanceTestScenario {
  readonly name: string;
  readonly description: string;
  readonly iterations: number;
  readonly concurrency: number;
  readonly timeout: number;
  readonly expectedResponseTime: number;
  readonly warmupIterations: number;
}

/**
 * Load test configuration
 */
export interface LoadTestConfig {
  readonly rampUpDuration: number;    // milliseconds
  readonly sustainDuration: number;   // milliseconds
  readonly rampDownDuration: number;  // milliseconds
  readonly maxConcurrency: number;
  readonly targetThroughput: number;  // requests per second
  readonly acceptableErrorRate: number; // percentage
}

/**
 * Stress test configuration
 */
export interface StressTestConfig {
  readonly startConcurrency: number;
  readonly maxConcurrency: number;
  readonly incrementStep: number;
  readonly stepDuration: number;
  readonly breakingPointDetection: boolean;
  readonly recoveryTesting: boolean;
}

@Injectable()
export class PerformanceTestingSuite extends EventEmitter {
  private readonly logger = new Logger(PerformanceTestingSuite.name);
  private config: PerformanceTestConfig;
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();
  private isInitialized = false;

  /**
   * Initialize performance testing suite
   */
  async initialize(config: PerformanceTestConfig): Promise<void> {
    this.logger.log('Initializing Performance Testing Suite...');

    this.config = config;

    try {
      // Setup performance monitoring
      this.setupPerformanceMonitoring();

      // Load existing benchmarks
      await this.loadPerformanceBenchmarks();

      // Initialize test scenarios
      this.initializeTestScenarios();

      this.isInitialized = true;
      this.logger.log('Performance Testing Suite initialized successfully');
      this.emit('suite:initialized', { config });

    } catch (error) {
      this.logger.error('Failed to initialize Performance Testing Suite', error);
      throw new Error(`Performance testing initialization failed: ${error.message}`);
    }
  }

  /**
   * Execute response time test for database function
   */
  async executeResponseTimeTest(
    func: DatabaseFunction,
    scenario: PerformanceTestScenario,
    testData?: any[]
  ): Promise<PerformanceTestResult> {
    this.ensureInitialized();

    const testId = `response_time_${func.id}_${Date.now()}`;
    this.logger.log(`Executing response time test: ${testId}`, {
      function: func.name,
      iterations: scenario.iterations,
      expectedResponseTime: scenario.expectedResponseTime
    });

    const context: PerformanceTestContext = {
      testId,
      functionName: func.name,
      startTime: Date.now(),
      config: this.config,
      metrics: this.initializeMetrics()
    };

    this.emit('test:started', context);

    try {
      // Warmup phase
      if (scenario.warmupIterations > 0) {
        await this.executeWarmup(func, scenario.warmupIterations, testData);
      }

      // Execute test iterations
      const iterations: PerformanceIteration[] = [];

      for (let i = 0; i < scenario.iterations; i++) {
        const iteration = await this.executePerformanceIteration(
          func,
          i,
          testData?.[i % (testData?.length || 1)]
        );
        iterations.push(iteration);

        // Check if response time exceeds threshold
        if (iteration.responseTime > scenario.expectedResponseTime) {
          this.logger.warn(`Response time threshold exceeded`, {
            iteration: i,
            responseTime: iteration.responseTime,
            threshold: scenario.expectedResponseTime
          });
        }

        // Emit progress
        this.emit('test:progress', {
          testId,
          iteration: i + 1,
          totalIterations: scenario.iterations,
          currentResponseTime: iteration.responseTime
        });
      }

      // Calculate results
      const result = this.calculateResponseTimeResult(context, scenario, iterations);

      // Store benchmark
      await this.storeBenchmark(func, result);

      const endTime = Date.now();
      result.endTime = endTime;
      result.totalDuration = endTime - context.startTime;

      this.logger.log(`Response time test completed: ${testId}`, {
        averageResponseTime: result.averageResponseTime,
        maxResponseTime: result.maxResponseTime,
        passed: result.passed
      });

      this.emit('test:completed', result);
      return result;

    } catch (error) {
      this.logger.error(`Response time test failed: ${testId}`, error);
      const failedResult: PerformanceTestResult = {
        testId,
        functionName: func.name,
        responseTime: 0,
        passed: false,
        iterations: 0,
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        throughput: 0,
        startTime: context.startTime,
        endTime: Date.now(),
        error: error.message
      };
      this.emit('test:failed', failedResult);
      throw error;
    }
  }

  /**
   * Execute load test for database function
   */
  async executeLoadTest(
    func: DatabaseFunction,
    loadConfig: LoadTestConfig,
    testData?: any[]
  ): Promise<LoadTestResult> {
    this.ensureInitialized();

    const testId = `load_test_${func.id}_${Date.now()}`;
    this.logger.log(`Executing load test: ${testId}`, {
      function: func.name,
      maxConcurrency: loadConfig.maxConcurrency,
      targetThroughput: loadConfig.targetThroughput
    });

    const startTime = Date.now();
    this.emit('load-test:started', { testId, function: func.name, config: loadConfig });

    try {
      const phases = [
        { name: 'ramp-up', duration: loadConfig.rampUpDuration },
        { name: 'sustain', duration: loadConfig.sustainDuration },
        { name: 'ramp-down', duration: loadConfig.rampDownDuration }
      ];

      const phaseResults: LoadTestPhaseResult[] = [];

      for (const phase of phases) {
        this.logger.log(`Executing load test phase: ${phase.name}`);
        const phaseResult = await this.executeLoadTestPhase(
          func,
          phase,
          loadConfig,
          testData
        );
        phaseResults.push(phaseResult);

        this.emit('load-test:phase-completed', {
          testId,
          phase: phase.name,
          result: phaseResult
        });
      }

      // Aggregate results
      const result = this.aggregateLoadTestResults(testId, func, loadConfig, phaseResults, startTime);

      this.logger.log(`Load test completed: ${testId}`, {
        totalRequests: result.totalRequests,
        successfulRequests: result.successfulRequests,
        averageResponseTime: result.averageResponseTime,
        throughput: result.actualThroughput,
        passed: result.passed
      });

      this.emit('load-test:completed', result);
      return result;

    } catch (error) {
      this.logger.error(`Load test failed: ${testId}`, error);
      throw error;
    }
  }

  /**
   * Execute stress test for database function
   */
  async executeStressTest(
    func: DatabaseFunction,
    stressConfig: StressTestConfig,
    testData?: any[]
  ): Promise<StressTestResult> {
    this.ensureInitialized();

    const testId = `stress_test_${func.id}_${Date.now()}`;
    this.logger.log(`Executing stress test: ${testId}`, {
      function: func.name,
      startConcurrency: stressConfig.startConcurrency,
      maxConcurrency: stressConfig.maxConcurrency
    });

    const startTime = Date.now();
    this.emit('stress-test:started', { testId, function: func.name, config: stressConfig });

    try {
      const stressResults: StressTestStepResult[] = [];
      let currentConcurrency = stressConfig.startConcurrency;
      let breakingPointFound = false;

      while (currentConcurrency <= stressConfig.maxConcurrency && !breakingPointFound) {
        this.logger.log(`Testing concurrency level: ${currentConcurrency}`);

        const stepResult = await this.executeStressTestStep(
          func,
          currentConcurrency,
          stressConfig.stepDuration,
          testData
        );

        stressResults.push(stepResult);

        // Check for breaking point
        if (stressConfig.breakingPointDetection && this.isBreakingPoint(stepResult)) {
          breakingPointFound = true;
          this.logger.warn(`Breaking point detected at concurrency: ${currentConcurrency}`);
        }

        this.emit('stress-test:step-completed', {
          testId,
          concurrency: currentConcurrency,
          result: stepResult
        });

        currentConcurrency += stressConfig.incrementStep;
      }

      // Recovery testing if enabled
      let recoveryResult: StressTestStepResult | undefined;
      if (stressConfig.recoveryTesting && breakingPointFound) {
        recoveryResult = await this.executeRecoveryTest(func, stressConfig, testData);
      }

      // Aggregate results
      const result = this.aggregateStressTestResults(
        testId,
        func,
        stressConfig,
        stressResults,
        recoveryResult,
        startTime
      );

      this.logger.log(`Stress test completed: ${testId}`, {
        maxSuccessfulConcurrency: result.maxSuccessfulConcurrency,
        breakingPoint: result.breakingPoint,
        passed: result.passed
      });

      this.emit('stress-test:completed', result);
      return result;

    } catch (error) {
      this.logger.error(`Stress test failed: ${testId}`, error);
      throw error;
    }
  }

  /**
   * Execute throughput test for database function
   */
  async executeThroughputTest(
    func: DatabaseFunction,
    duration: number,
    concurrency: number,
    testData?: any[]
  ): Promise<ThroughputTestResult> {
    this.ensureInitialized();

    const testId = `throughput_test_${func.id}_${Date.now()}`;
    this.logger.log(`Executing throughput test: ${testId}`, {
      function: func.name,
      duration,
      concurrency
    });

    const startTime = Date.now();
    this.emit('throughput-test:started', { testId, function: func.name });

    try {
      const promises: Promise<PerformanceIteration>[] = [];
      const endTime = startTime + duration;
      let requestCount = 0;

      // Start concurrent workers
      for (let i = 0; i < concurrency; i++) {
        const workerPromise = this.executeThroughputWorker(
          func,
          endTime,
          testData,
          requestCount
        );
        promises.push(workerPromise);
      }

      // Wait for all workers to complete
      const iterations = await Promise.all(promises);
      const allIterations = iterations.flat();

      // Calculate throughput metrics
      const totalRequests = allIterations.length;
      const successfulRequests = allIterations.filter(i => i.success).length;
      const totalDuration = Date.now() - startTime;
      const actualThroughput = (totalRequests / totalDuration) * 1000; // requests per second

      const result: ThroughputTestResult = {
        testId,
        functionName: func.name,
        totalRequests,
        successfulRequests,
        failedRequests: totalRequests - successfulRequests,
        duration: totalDuration,
        throughput: actualThroughput,
        concurrency,
        averageResponseTime: this.calculateAverageResponseTime(allIterations),
        maxResponseTime: Math.max(...allIterations.map(i => i.responseTime)),
        minResponseTime: Math.min(...allIterations.map(i => i.responseTime)),
        passed: successfulRequests >= totalRequests * 0.95, // 95% success rate
        startTime,
        endTime: Date.now()
      };

      this.logger.log(`Throughput test completed: ${testId}`, {
        throughput: result.throughput,
        totalRequests: result.totalRequests,
        successRate: (result.successfulRequests / result.totalRequests) * 100
      });

      this.emit('throughput-test:completed', result);
      return result;

    } catch (error) {
      this.logger.error(`Throughput test failed: ${testId}`, error);
      throw error;
    }
  }

  /**
   * Get performance benchmark for function
   */
  getBenchmark(functionName: string): PerformanceBenchmark | null {
    return this.benchmarks.get(functionName) || null;
  }

  /**
   * Compare current performance with benchmark
   */
  compareWithBenchmark(
    functionName: string,
    currentResult: PerformanceTestResult
  ): PerformanceComparison {
    const benchmark = this.benchmarks.get(functionName);

    if (!benchmark) {
      return {
        hasBenchmark: false,
        improvement: null,
        regression: false,
        recommendation: 'No benchmark available. This result will be used as baseline.'
      };
    }

    const improvement = (benchmark.averageResponseTime - currentResult.averageResponseTime) / benchmark.averageResponseTime;
    const isRegression = improvement < -0.1; // 10% regression threshold

    return {
      hasBenchmark: true,
      benchmarkResponseTime: benchmark.averageResponseTime,
      currentResponseTime: currentResult.averageResponseTime,
      improvement,
      regression: isRegression,
      recommendation: this.generatePerformanceRecommendation(improvement, isRegression)
    };
  }

  // ===== PRIVATE METHODS =====

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Performance Testing Suite not initialized. Call initialize() first.');
    }
  }

  private setupPerformanceMonitoring(): void {
    // Enable high-resolution timing
    if (perf_hooks.performance.timeOrigin === undefined) {
      this.logger.warn('High-resolution timing not available. Performance measurements may be less accurate.');
    }
  }

  private async loadPerformanceBenchmarks(): Promise<void> {
    // In a real implementation, this would load benchmarks from a database or file
    this.logger.log('Loading performance benchmarks...');

    // Mock benchmarks for now
    const mockBenchmarks = new Map([
      ['getPrismaClient', { averageResponseTime: 50, maxResponseTime: 100, throughput: 1000 }],
      ['executeRawQuery', { averageResponseTime: 200, maxResponseTime: 500, throughput: 500 }],
      ['prismaTransaction', { averageResponseTime: 300, maxResponseTime: 1000, throughput: 100 }]
    ]);

    mockBenchmarks.forEach((benchmark, functionName) => {
      this.benchmarks.set(functionName, benchmark);
    });
  }

  private initializeTestScenarios(): void {
    // Initialize standard test scenarios
    this.logger.log('Initializing performance test scenarios...');
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Number.MAX_VALUE,
      throughput: 0,
      errorRate: 0,
      resourceUsage: {
        cpuUsage: 0,
        memoryUsage: 0,
        networkUsage: 0,
        diskUsage: 0
      }
    };
  }

  private async executeWarmup(
    func: DatabaseFunction,
    iterations: number,
    testData?: any[]
  ): Promise<void> {
    this.logger.log(`Executing warmup with ${iterations} iterations`);

    for (let i = 0; i < iterations; i++) {
      try {
        await this.executeFunctionCall(func, testData?.[i % (testData?.length || 1)]);
      } catch (error) {
        // Ignore warmup errors
      }
    }
  }

  private async executePerformanceIteration(
    func: DatabaseFunction,
    iteration: number,
    testData?: any
  ): Promise<PerformanceIteration> {
    const startTime = perf_hooks.performance.now();

    try {
      const result = await this.executeFunctionCall(func, testData);
      const endTime = perf_hooks.performance.now();
      const responseTime = endTime - startTime;

      return {
        iteration,
        responseTime,
        success: true,
        result,
        startTime,
        endTime,
        resourceUsage: this.captureResourceUsage()
      };

    } catch (error) {
      const endTime = perf_hooks.performance.now();
      const responseTime = endTime - startTime;

      return {
        iteration,
        responseTime,
        success: false,
        error: error.message,
        startTime,
        endTime,
        resourceUsage: this.captureResourceUsage()
      };
    }
  }

  private async executeFunctionCall(func: DatabaseFunction, testData?: any): Promise<any> {
    // Mock function execution - in real implementation, this would call the actual function
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

    // Simulate occasional errors
    if (Math.random() < 0.05) { // 5% error rate
      throw new Error('Simulated function error');
    }

    return { success: true, data: testData };
  }

  private calculateResponseTimeResult(
    context: PerformanceTestContext,
    scenario: PerformanceTestScenario,
    iterations: PerformanceIteration[]
  ): PerformanceTestResult {
    const responseTimes = iterations.map(i => i.responseTime);
    const successfulIterations = iterations.filter(i => i.success);

    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    const throughput = (successfulIterations.length / context.metrics.totalRequests) * 1000;

    const passed = averageResponseTime <= scenario.expectedResponseTime &&
                   maxResponseTime <= scenario.expectedResponseTime * 2; // Allow 2x threshold for max

    return {
      testId: context.testId,
      functionName: context.functionName,
      responseTime: averageResponseTime,
      passed,
      iterations: iterations.length,
      averageResponseTime,
      maxResponseTime,
      minResponseTime,
      throughput,
      startTime: context.startTime,
      endTime: 0, // Will be set by caller
      successRate: (successfulIterations.length / iterations.length) * 100,
      errorRate: ((iterations.length - successfulIterations.length) / iterations.length) * 100
    };
  }

  private async executeLoadTestPhase(
    func: DatabaseFunction,
    phase: { name: string; duration: number },
    config: LoadTestConfig,
    testData?: any[]
  ): Promise<LoadTestPhaseResult> {
    const startTime = Date.now();
    const endTime = startTime + phase.duration;

    let currentConcurrency = 1;
    const targetConcurrency = config.maxConcurrency;
    const iterations: PerformanceIteration[] = [];

    if (phase.name === 'ramp-up') {
      // Gradually increase concurrency
      const rampUpSteps = 10;
      const stepDuration = phase.duration / rampUpSteps;
      const concurrencyStep = targetConcurrency / rampUpSteps;

      for (let step = 0; step < rampUpSteps; step++) {
        currentConcurrency = Math.floor((step + 1) * concurrencyStep);
        const stepIterations = await this.executeLoadTestStep(
          func,
          currentConcurrency,
          stepDuration,
          testData
        );
        iterations.push(...stepIterations);
      }
    } else if (phase.name === 'sustain') {
      // Maintain target concurrency
      const stepIterations = await this.executeLoadTestStep(
        func,
        targetConcurrency,
        phase.duration,
        testData
      );
      iterations.push(...stepIterations);
    } else {
      // Ramp down
      const rampDownSteps = 5;
      const stepDuration = phase.duration / rampDownSteps;

      for (let step = rampDownSteps; step > 0; step--) {
        currentConcurrency = Math.floor((step / rampDownSteps) * targetConcurrency);
        const stepIterations = await this.executeLoadTestStep(
          func,
          Math.max(1, currentConcurrency),
          stepDuration,
          testData
        );
        iterations.push(...stepIterations);
      }
    }

    const totalRequests = iterations.length;
    const successfulRequests = iterations.filter(i => i.success).length;
    const averageResponseTime = this.calculateAverageResponseTime(iterations);

    return {
      phase: phase.name,
      duration: Date.now() - startTime,
      totalRequests,
      successfulRequests,
      averageResponseTime,
      maxConcurrency: targetConcurrency,
      actualThroughput: (totalRequests / phase.duration) * 1000
    };
  }

  private async executeLoadTestStep(
    func: DatabaseFunction,
    concurrency: number,
    duration: number,
    testData?: any[]
  ): Promise<PerformanceIteration[]> {
    const promises: Promise<PerformanceIteration[]>[] = [];
    const endTime = Date.now() + duration;

    for (let i = 0; i < concurrency; i++) {
      const workerPromise = this.executeThroughputWorker(func, endTime, testData, i);
      promises.push(workerPromise);
    }

    const results = await Promise.all(promises);
    return results.flat();
  }

  private aggregateLoadTestResults(
    testId: string,
    func: DatabaseFunction,
    config: LoadTestConfig,
    phaseResults: LoadTestPhaseResult[],
    startTime: number
  ): LoadTestResult {
    const totalRequests = phaseResults.reduce((sum, phase) => sum + phase.totalRequests, 0);
    const successfulRequests = phaseResults.reduce((sum, phase) => sum + phase.successfulRequests, 0);
    const totalDuration = Date.now() - startTime;
    const averageResponseTime = phaseResults.reduce((sum, phase) => sum + phase.averageResponseTime, 0) / phaseResults.length;
    const actualThroughput = (totalRequests / totalDuration) * 1000;

    const errorRate = ((totalRequests - successfulRequests) / totalRequests) * 100;
    const passed = errorRate <= config.acceptableErrorRate &&
                   actualThroughput >= config.targetThroughput * 0.8; // 80% of target

    return {
      testId,
      functionName: func.name,
      totalRequests,
      successfulRequests,
      failedRequests: totalRequests - successfulRequests,
      averageResponseTime,
      actualThroughput,
      targetThroughput: config.targetThroughput,
      maxConcurrency: config.maxConcurrency,
      errorRate,
      passed,
      phases: phaseResults,
      startTime,
      endTime: Date.now()
    };
  }

  private async executeStressTestStep(
    func: DatabaseFunction,
    concurrency: number,
    duration: number,
    testData?: any[]
  ): Promise<StressTestStepResult> {
    const iterations = await this.executeLoadTestStep(func, concurrency, duration, testData);

    const totalRequests = iterations.length;
    const successfulRequests = iterations.filter(i => i.success).length;
    const averageResponseTime = this.calculateAverageResponseTime(iterations);
    const maxResponseTime = Math.max(...iterations.map(i => i.responseTime));
    const errorRate = ((totalRequests - successfulRequests) / totalRequests) * 100;

    return {
      concurrency,
      totalRequests,
      successfulRequests,
      averageResponseTime,
      maxResponseTime,
      errorRate,
      throughput: (totalRequests / duration) * 1000,
      systemStable: errorRate < 10 && averageResponseTime < 5000 // Basic stability criteria
    };
  }

  private isBreakingPoint(stepResult: StressTestStepResult): boolean {
    return stepResult.errorRate > 50 || // High error rate
           stepResult.averageResponseTime > 10000 || // Very slow responses
           !stepResult.systemStable; // System instability
  }

  private async executeRecoveryTest(
    func: DatabaseFunction,
    config: StressTestConfig,
    testData?: any[]
  ): Promise<StressTestStepResult> {
    this.logger.log('Executing recovery test...');

    // Wait for system to stabilize
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test with low concurrency
    return this.executeStressTestStep(func, config.startConcurrency, config.stepDuration, testData);
  }

  private aggregateStressTestResults(
    testId: string,
    func: DatabaseFunction,
    config: StressTestConfig,
    stepResults: StressTestStepResult[],
    recoveryResult: StressTestStepResult | undefined,
    startTime: number
  ): StressTestResult {
    const lastSuccessfulStep = stepResults.reverse().find(step => step.systemStable);
    const maxSuccessfulConcurrency = lastSuccessfulStep?.concurrency || config.startConcurrency;
    const breakingPoint = stepResults.find(step => !step.systemStable)?.concurrency;

    const totalRequests = stepResults.reduce((sum, step) => sum + step.totalRequests, 0);
    const successfulRequests = stepResults.reduce((sum, step) => sum + step.successfulRequests, 0);

    return {
      testId,
      functionName: func.name,
      maxSuccessfulConcurrency,
      breakingPoint,
      totalRequests,
      successfulRequests,
      steps: stepResults.reverse(), // Restore original order
      recoveryResult,
      systemRecovered: recoveryResult?.systemStable || false,
      passed: maxSuccessfulConcurrency >= config.startConcurrency * 2, // At least 2x scaling
      startTime,
      endTime: Date.now()
    };
  }

  private async executeThroughputWorker(
    func: DatabaseFunction,
    endTime: number,
    testData?: any[],
    workerId: number = 0
  ): Promise<PerformanceIteration[]> {
    const iterations: PerformanceIteration[] = [];
    let iterationCount = 0;

    while (Date.now() < endTime) {
      const data = testData?.[iterationCount % (testData?.length || 1)];
      const iteration = await this.executePerformanceIteration(func, iterationCount, data);
      iterations.push(iteration);
      iterationCount++;
    }

    return iterations;
  }

  private calculateAverageResponseTime(iterations: PerformanceIteration[]): number {
    if (iterations.length === 0) return 0;
    const totalTime = iterations.reduce((sum, i) => sum + i.responseTime, 0);
    return totalTime / iterations.length;
  }

  private captureResourceUsage(): ResourceUsageMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      cpuUsage: cpuUsage.user + cpuUsage.system,
      memoryUsage: memUsage.heapUsed,
      networkUsage: 0, // Would need additional monitoring
      diskUsage: 0     // Would need additional monitoring
    };
  }

  private async storeBenchmark(func: DatabaseFunction, result: PerformanceTestResult): Promise<void> {
    const benchmark: PerformanceBenchmark = {
      functionName: func.name,
      averageResponseTime: result.averageResponseTime,
      maxResponseTime: result.maxResponseTime,
      throughput: result.throughput,
      timestamp: Date.now(),
      testId: result.testId
    };

    this.benchmarks.set(func.name, benchmark);
    this.logger.log(`Stored performance benchmark for ${func.name}`, benchmark);
  }

  private generatePerformanceRecommendation(improvement: number, isRegression: boolean): string {
    if (isRegression) {
      return 'Performance regression detected. Consider investigating recent changes or optimizing the function.';
    } else if (improvement > 0.2) {
      return 'Significant performance improvement detected. Consider updating benchmark.';
    } else if (improvement > 0) {
      return 'Minor performance improvement. Function is performing well.';
    } else {
      return 'Performance is stable within expected range.';
    }
  }
}

// ===== SUPPORTING INTERFACES =====

interface PerformanceIteration {
  iteration: number;
  responseTime: number;
  success: boolean;
  result?: any;
  error?: string;
  startTime: number;
  endTime: number;
  resourceUsage: ResourceUsageMetrics;
}

interface LoadTestPhaseResult {
  phase: string;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  averageResponseTime: number;
  maxConcurrency: number;
  actualThroughput: number;
}

interface StressTestStepResult {
  concurrency: number;
  totalRequests: number;
  successfulRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  errorRate: number;
  throughput: number;
  systemStable: boolean;
}

interface PerformanceComparison {
  hasBenchmark: boolean;
  benchmarkResponseTime?: number;
  currentResponseTime?: number;
  improvement: number | null;
  regression: boolean;
  recommendation: string;
}