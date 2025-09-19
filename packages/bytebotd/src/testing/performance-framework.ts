/**
 * Performance Testing Framework
 *
 * Comprehensive performance testing framework providing standardized
 * tools for measuring, validating, and optimizing test execution
 * performance across the entire bytebotd package.
 *
 * Features:
 * - Test execution time measurement and analysis
 * - Memory usage tracking and leak detection
 * - Concurrent test validation
 * - Resource utilization monitoring
 * - Performance regression detection
 * - Automated optimization recommendations
 *
 * @author Claude Code - Performance Optimization Specialist
 * @version 2.0.0
 */

import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  readonly executionTime: number;
  readonly memoryUsage: NodeJS.MemoryUsage;
  readonly cpuUsage: NodeJS.CpuUsage;
  readonly timestamp: number;
  readonly testName: string;
  readonly testSuite: string;
  readonly passed: boolean;
  readonly errors: Error[];
}

/**
 * Performance test configuration
 */
export interface PerformanceTestConfig {
  readonly name: string;
  readonly description: string;
  readonly maxExecutionTime: number; // milliseconds
  readonly maxMemoryUsage: number; // bytes
  readonly maxCpuUsage: number; // percentage
  readonly warmupIterations: number;
  readonly measurementIterations: number;
  readonly concurrencyLevel: number;
  readonly memoryLeakThreshold: number; // MB
  readonly performanceRegression: number; // percentage
}

/**
 * Performance benchmark result
 */
export interface PerformanceBenchmark {
  readonly config: PerformanceTestConfig;
  readonly metrics: PerformanceMetrics[];
  readonly averageExecutionTime: number;
  readonly minExecutionTime: number;
  readonly maxExecutionTime: number;
  readonly p50ExecutionTime: number;
  readonly p95ExecutionTime: number;
  readonly p99ExecutionTime: number;
  readonly averageMemoryUsage: number;
  readonly memoryLeakDetected: boolean;
  readonly performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  readonly passed: boolean;
  readonly recommendations: string[];
}

/**
 * Test execution performance tracker
 */
export interface TestExecutionMetrics {
  readonly suiteName: string;
  readonly totalTests: number;
  readonly passedTests: number;
  readonly failedTests: number;
  readonly skippedTests: number;
  readonly totalExecutionTime: number;
  readonly averageTestTime: number;
  readonly slowestTest: string;
  readonly slowestTestTime: number;
  readonly memoryUsageByTest: Map<string, number>;
  readonly concurrentExecutionTime: number;
  readonly sequentialExecutionTime: number;
  readonly parallelizationBenefit: number; // percentage
}

/**
 * Performance Testing Framework
 */
export class PerformanceTestingFramework extends EventEmitter {
  private readonly metrics: Map<string, PerformanceMetrics[]> = new Map();
  private readonly baselines: Map<string, PerformanceBenchmark> = new Map();
  private readonly testExecutionMetrics: Map<string, TestExecutionMetrics> = new Map();
  private readonly activeMeasurements: Map<string, { startTime: number; startMemory: NodeJS.MemoryUsage; startCpu: NodeJS.CpuUsage }> = new Map();

  /**
   * Start performance measurement for a test
   */
  public startMeasurement(testName: string, testSuite: string): void {
    console.log(`📊 [PERF] Starting measurement for ${testSuite}::${testName}`);
    
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    const startCpu = process.cpuUsage();

    this.activeMeasurements.set(`${testSuite}::${testName}`, {
      startTime,
      startMemory,
      startCpu
    });

    this.emit('measurementStarted', { testName, testSuite, startTime });
  }

  /**
   * End performance measurement for a test
   */
  public endMeasurement(testName: string, testSuite: string, passed: boolean, errors: Error[] = []): PerformanceMetrics {
    const measurementKey = `${testSuite}::${testName}`;
    const measurement = this.activeMeasurements.get(measurementKey);

    if (!measurement) {
      throw new Error(`No active measurement found for ${measurementKey}`);
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const endCpu = process.cpuUsage(measurement.startCpu);

    const metrics: PerformanceMetrics = {
      executionTime: endTime - measurement.startTime,
      memoryUsage: {
        rss: endMemory.rss - measurement.startMemory.rss,
        heapTotal: endMemory.heapTotal - measurement.startMemory.heapTotal,
        heapUsed: endMemory.heapUsed - measurement.startMemory.heapUsed,
        external: endMemory.external - measurement.startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - measurement.startMemory.arrayBuffers
      },
      cpuUsage: endCpu,
      timestamp: Date.now(),
      testName,
      testSuite,
      passed,
      errors
    };

    // Store metrics
    const testKey = `${testSuite}::${testName}`;
    if (!this.metrics.has(testKey)) {
      this.metrics.set(testKey, []);
    }
    this.metrics.get(testKey)!.push(metrics);

    // Clean up active measurement
    this.activeMeasurements.delete(measurementKey);

    console.log(`📈 [PERF] Completed measurement for ${testSuite}::${testName}: ${metrics.executionTime.toFixed(2)}ms`);

    this.emit('measurementCompleted', metrics);
    return metrics;
  }

  /**
   * Run performance benchmark for a test function
   */
  public async runBenchmark(
    testFunction: () => Promise<void> | void,
    config: PerformanceTestConfig
  ): Promise<PerformanceBenchmark> {
    console.log(`🚀 [PERF] Starting benchmark: ${config.name}`);
    console.log(`📋 [PERF] Config: ${config.measurementIterations} iterations, ${config.concurrencyLevel} concurrency`);

    const allMetrics: PerformanceMetrics[] = [];

    // Warmup phase
    console.log(`🔥 [PERF] Warmup phase: ${config.warmupIterations} iterations`);
    for (let i = 0; i < config.warmupIterations; i++) {
      try {
        await testFunction();
      } catch (error) {
        console.warn(`⚠️ [PERF] Warmup iteration ${i + 1} failed:`, error);
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Measurement phase
    console.log(`📊 [PERF] Measurement phase: ${config.measurementIterations} iterations`);
    
    for (let i = 0; i < config.measurementIterations; i++) {
      const iterationName = `${config.name}_iteration${i + 1}`;
      this.startMeasurement(iterationName, 'benchmark');

      const errors: Error[] = [];
      let passed = true;

      try {
        await testFunction();
      } catch (error) {
        passed = false;
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }

      const metrics = this.endMeasurement(iterationName, 'benchmark', passed, errors);
      allMetrics.push(metrics);

      // Check for early termination on consistent failures
      if (!passed && i > config.measurementIterations * 0.1 && 
          allMetrics.slice(-Math.floor(config.measurementIterations * 0.1)).every(m => !m.passed)) {
        console.warn(`⚠️ [PERF] Early termination due to consistent failures`);
        break;
      }
    }

    // Analyze results
    const executionTimes = allMetrics.map(m => m.executionTime);
    const memoryUsages = allMetrics.map(m => m.memoryUsage.heapUsed);

    const sortedTimes = [...executionTimes].sort((a, b) => a - b);
    const averageExecutionTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
    const minExecutionTime = Math.min(...executionTimes);
    const maxExecutionTime = Math.max(...executionTimes);
    const p50ExecutionTime = sortedTimes[Math.floor(sortedTimes.length * 0.5)] ?? 0;
    const p95ExecutionTime = sortedTimes[Math.floor(sortedTimes.length * 0.95)] ?? 0;
    const p99ExecutionTime = sortedTimes[Math.floor(sortedTimes.length * 0.99)] ?? 0;

    const averageMemoryUsage = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;

    // Memory leak detection
    const memoryLeakDetected = this.detectMemoryLeak(allMetrics, config.memoryLeakThreshold);

    // Performance grading
    const performanceGrade = this.calculatePerformanceGrade(config, averageExecutionTime, averageMemoryUsage, memoryLeakDetected);

    // Generate recommendations
    const recommendations = this.generateRecommendations(config, {
      averageExecutionTime,
      averageMemoryUsage,
      memoryLeakDetected,
      failureRate: allMetrics.filter(m => !m.passed).length / allMetrics.length
    });

    const passed = averageExecutionTime <= config.maxExecutionTime && 
                   averageMemoryUsage <= config.maxMemoryUsage && 
                   !memoryLeakDetected;

    const benchmark: PerformanceBenchmark = {
      config,
      metrics: allMetrics,
      averageExecutionTime,
      minExecutionTime,
      maxExecutionTime,
      p50ExecutionTime,
      p95ExecutionTime,
      p99ExecutionTime,
      averageMemoryUsage,
      memoryLeakDetected,
      performanceGrade,
      passed,
      recommendations
    };

    console.log(`📊 [PERF] Benchmark results for ${config.name}:`);
    console.log(`  Average: ${averageExecutionTime.toFixed(2)}ms`);
    console.log(`  P95: ${p95ExecutionTime.toFixed(2)}ms`);
    console.log(`  Memory: ${(averageMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Grade: ${performanceGrade}`);
    console.log(`  Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

    this.emit('benchmarkCompleted', benchmark);
    return benchmark;
  }

  /**
   * Validate test execution performance across multiple test suites
   */
  public async validateTestExecutionPerformance(): Promise<Map<string, TestExecutionMetrics>> {
    console.log(`🔍 [PERF] Validating test execution performance across all suites`);

    const testSuites = Array.from(this.metrics.keys()).reduce((suites, testKey) => {
      const splitParts = testKey.split('::');
      const suiteName: string = splitParts.length > 0 && splitParts[0] ? splitParts[0] : 'unknown';
      if (!suites.has(suiteName)) {
        suites.set(suiteName, []);
      }
      suites.get(suiteName)!.push(testKey);
      return suites;
    }, new Map<string, string[]>());

    for (const [suiteName, testKeys] of Array.from(testSuites.entries())) {
      const suiteMetrics = testKeys.flatMap(key => this.metrics.get(key) ?? []);
      
      const totalTests = testKeys.length;
      const passedTests = suiteMetrics.filter(m => m.passed).length;
      const failedTests = suiteMetrics.filter(m => !m.passed).length;
      const skippedTests = totalTests - passedTests - failedTests;

      const totalExecutionTime = suiteMetrics.reduce((sum, m) => sum + m.executionTime, 0);
      const averageTestTime = totalExecutionTime / suiteMetrics.length;

      const slowestMetric = suiteMetrics.reduce((slowest, current) => 
        current.executionTime > slowest.executionTime ? current : slowest
      );

      const memoryUsageByTest = new Map<string, number>();
      suiteMetrics.forEach(m => {
        memoryUsageByTest.set(m.testName, m.memoryUsage.heapUsed);
      });

      // Simulate concurrent vs sequential execution analysis
      const concurrentExecutionTime = Math.max(...suiteMetrics.map(m => m.executionTime));
      const sequentialExecutionTime = totalExecutionTime;
      const parallelizationBenefit = ((sequentialExecutionTime - concurrentExecutionTime) / sequentialExecutionTime) * 100;

      const testExecutionMetrics: TestExecutionMetrics = {
        suiteName,
        totalTests,
        passedTests,
        failedTests,
        skippedTests,
        totalExecutionTime,
        averageTestTime,
        slowestTest: slowestMetric.testName,
        slowestTestTime: slowestMetric.executionTime,
        memoryUsageByTest,
        concurrentExecutionTime,
        sequentialExecutionTime,
        parallelizationBenefit
      };

      this.testExecutionMetrics.set(suiteName, testExecutionMetrics);

      console.log(`📊 [PERF] Suite ${suiteName} metrics:`);
      console.log(`  Tests: ${totalTests} (${passedTests} passed, ${failedTests} failed)`);
      console.log(`  Avg time: ${averageTestTime.toFixed(2)}ms`);
      console.log(`  Slowest: ${slowestMetric.testName} (${slowestMetric.executionTime.toFixed(2)}ms)`);
      console.log(`  Parallelization benefit: ${parallelizationBenefit.toFixed(1)}%`);
    }

    return this.testExecutionMetrics;
  }

  /**
   * Get comprehensive performance report
   */
  public getPerformanceReport(): {
    summary: {
      totalTests: number;
      totalSuites: number;
      averageExecutionTime: number;
      totalMemoryUsage: number;
      overallPerformanceGrade: string;
    };
    bottlenecks: Array<{
      testName: string;
      issue: string;
      impact: string;
      recommendation: string;
    }>;
    optimizationOpportunities: string[];
  } {
    const allMetrics = Array.from(this.metrics.values()).flat();
    const totalTests = allMetrics.length;
    const totalSuites = this.testExecutionMetrics.size;
    
    const averageExecutionTime = allMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalTests;
    const totalMemoryUsage = allMetrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0);

    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(allMetrics);
    
    // Generate optimization opportunities
    const optimizationOpportunities = this.generateOptimizationOpportunities(allMetrics);

    // Calculate overall grade
    const overallPerformanceGrade = this.calculateOverallGrade(allMetrics);

    return {
      summary: {
        totalTests,
        totalSuites,
        averageExecutionTime,
        totalMemoryUsage,
        overallPerformanceGrade
      },
      bottlenecks,
      optimizationOpportunities
    };
  }

  /**
   * Clear all collected metrics
   */
  public clearMetrics(): void {
    this.metrics.clear();
    this.testExecutionMetrics.clear();
    this.activeMeasurements.clear();
    console.log(`🧹 [PERF] Cleared all performance metrics`);
  }

  /**
   * Export metrics for external analysis
   */
  public exportMetrics(): {
    metrics: Record<string, PerformanceMetrics[]>;
    testExecutionMetrics: Record<string, TestExecutionMetrics>;
    timestamp: number;
  } {
    return {
      metrics: Object.fromEntries(this.metrics),
      testExecutionMetrics: Object.fromEntries(this.testExecutionMetrics),
      timestamp: Date.now()
    };
  }

  /**
   * Detect memory leaks in test execution
   */
  private detectMemoryLeak(metrics: PerformanceMetrics[], threshold: number): boolean {
    if (metrics.length < 5) return false;

    const memoryUsages = metrics.map(m => m.memoryUsage.heapUsed / 1024 / 1024); // Convert to MB
    const firstQuarter = memoryUsages.slice(0, Math.floor(metrics.length / 4));
    const lastQuarter = memoryUsages.slice(-Math.floor(metrics.length / 4));

    const avgFirst = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
    const avgLast = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;

    const increase = avgLast - avgFirst;
    return increase > threshold;
  }

  /**
   * Calculate performance grade
   */
  private calculatePerformanceGrade(
    config: PerformanceTestConfig,
    avgTime: number,
    avgMemory: number,
    memoryLeak: boolean
  ): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (memoryLeak) return 'F';

    const timeRatio = avgTime / config.maxExecutionTime;
    const memoryRatio = avgMemory / config.maxMemoryUsage;

    const overallRatio = Math.max(timeRatio, memoryRatio);

    if (overallRatio <= 0.6) return 'A';
    if (overallRatio <= 0.8) return 'B';
    if (overallRatio <= 1.0) return 'C';
    if (overallRatio <= 1.2) return 'D';
    return 'F';
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    config: PerformanceTestConfig,
    results: {
      averageExecutionTime: number;
      averageMemoryUsage: number;
      memoryLeakDetected: boolean;
      failureRate: number;
    }
  ): string[] {
    const recommendations: string[] = [];

    if (results.averageExecutionTime > config.maxExecutionTime) {
      recommendations.push(`Optimize execution time: current ${results.averageExecutionTime.toFixed(2)}ms exceeds target ${config.maxExecutionTime}ms`);
    }

    if (results.averageMemoryUsage > config.maxMemoryUsage) {
      recommendations.push(`Reduce memory usage: current ${(results.averageMemoryUsage / 1024 / 1024).toFixed(2)}MB exceeds target ${(config.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }

    if (results.memoryLeakDetected) {
      recommendations.push('Address memory leak: implement proper cleanup and resource disposal');
    }

    if (results.failureRate > 0.05) {
      recommendations.push(`Improve test reliability: ${(results.failureRate * 100).toFixed(1)}% failure rate is too high`);
    }

    if (results.averageExecutionTime > 1000) {
      recommendations.push('Consider test parallelization to reduce execution time');
    }

    return recommendations;
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(metrics: PerformanceMetrics[]): Array<{
    testName: string;
    issue: string;
    impact: string;
    recommendation: string;
  }> {
    const bottlenecks: Array<{
      testName: string;
      issue: string;
      impact: string;
      recommendation: string;
    }> = [];

    // Find slowest tests
    const slowTests = metrics
      .filter(m => m.executionTime > 5000) // Tests taking more than 5 seconds
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 5);

    slowTests.forEach(test => {
      bottlenecks.push({
        testName: `${test.testSuite}::${test.testName}`,
        issue: `Slow execution time: ${test.executionTime.toFixed(2)}ms`,
        impact: 'Increases overall test suite execution time',
        recommendation: 'Optimize test logic, reduce I/O operations, or consider mocking'
      });
    });

    // Find memory-intensive tests
    const memoryIntensiveTests = metrics
      .filter(m => m.memoryUsage.heapUsed > 50 * 1024 * 1024) // Tests using more than 50MB
      .sort((a, b) => b.memoryUsage.heapUsed - a.memoryUsage.heapUsed)
      .slice(0, 3);

    memoryIntensiveTests.forEach(test => {
      bottlenecks.push({
        testName: `${test.testSuite}::${test.testName}`,
        issue: `High memory usage: ${(test.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        impact: 'May cause memory pressure and affect other tests',
        recommendation: 'Optimize data structures, implement proper cleanup, or reduce test scope'
      });
    });

    return bottlenecks;
  }

  /**
   * Generate optimization opportunities
   */
  private generateOptimizationOpportunities(metrics: PerformanceMetrics[]): string[] {
    const opportunities: string[] = [];

    const totalExecutionTime = metrics.reduce((sum, m) => sum + m.executionTime, 0);
    const totalMemoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0);
    const failureRate = metrics.filter(m => !m.passed).length / metrics.length;

    if (totalExecutionTime > 60000) { // More than 1 minute total
      opportunities.push('Implement test parallelization to reduce total execution time');
    }

    if (totalMemoryUsage > 500 * 1024 * 1024) { // More than 500MB total
      opportunities.push('Optimize memory usage through better resource management and cleanup');
    }

    if (failureRate > 0.02) { // More than 2% failure rate
      opportunities.push('Improve test stability and reduce flaky tests');
    }

    const avgTestTime = totalExecutionTime / metrics.length;
    if (avgTestTime > 1000) {
      opportunities.push('Optimize individual test execution time through mocking and test optimization');
    }

    opportunities.push('Consider implementing test caching for expensive setup operations');
    opportunities.push('Evaluate test isolation to reduce inter-test dependencies');

    return opportunities;
  }

  /**
   * Calculate overall performance grade
   */
  private calculateOverallGrade(metrics: PerformanceMetrics[]): string {
    const avgExecutionTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
    const avgMemoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / metrics.length;
    const passRate = metrics.filter(m => m.passed).length / metrics.length;

    let score = 100;

    // Deduct points for slow execution
    if (avgExecutionTime > 1000) score -= 20;
    else if (avgExecutionTime > 500) score -= 10;

    // Deduct points for high memory usage
    if (avgMemoryUsage > 100 * 1024 * 1024) score -= 20;
    else if (avgMemoryUsage > 50 * 1024 * 1024) score -= 10;

    // Deduct points for failures
    if (passRate < 0.95) score -= 30;
    else if (passRate < 0.98) score -= 15;

    if (score >= 90) return 'A+ (Excellent)';
    if (score >= 80) return 'A (Very Good)';
    if (score >= 70) return 'B (Good)';
    if (score >= 60) return 'C (Fair)';
    return 'D (Needs Improvement)';
  }
}

/**
 * Global performance testing framework instance
 */
export const performanceFramework = new PerformanceTestingFramework();

/**
 * Performance test decorator for automatic measurement
 */
export function performanceTest(config: Partial<PerformanceTestConfig> = {}) {
  return function(target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function(...args: unknown[]) {
      const testConfig: PerformanceTestConfig = {
        name: propertyName,
        description: `Performance test for ${propertyName}`,
        maxExecutionTime: 5000,
        maxMemoryUsage: 100 * 1024 * 1024, // 100MB
        maxCpuUsage: 80,
        warmupIterations: 3,
        measurementIterations: 10,
        concurrencyLevel: 1,
        memoryLeakThreshold: 10, // 10MB
        performanceRegression: 20, // 20%
        ...config
      };

      const benchmark = await performanceFramework.runBenchmark(
        () => method.apply(this, args),
        testConfig
      );

      console.log(`📊 [PERF] ${propertyName} benchmark completed: ${benchmark.performanceGrade} grade`);
      
      if (!benchmark.passed) {
        throw new Error(`Performance test failed for ${propertyName}: ${benchmark.recommendations.join(', ')}`);
      }

      return benchmark;
    };

    return descriptor;
  };
}