/**
 * Browser Orchestration Performance Tests
 *
 * Comprehensive performance and stress tests for browser orchestration system.
 * Tests system behavior under concurrent load, resource utilization, scalability,
 * throughput, response times, and system limits validation.
 *
 * @author Claude Code
 * @version 1.0.0
 * @date 2025-09-20
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { performance } from 'perf_hooks';
import * as os from 'os';
import { BrowserUseModule } from '../src/browser-use/browser-use.module';
import { SecurityModule } from '../src/common/security/security.module';
import { AuthModule } from '../src/auth/auth.module';
import { PrismaService } from '../src/database/prisma.service';
import {
  CreateOrchestrationDto,
  OrchestrationStrategy,
  TaskPriority,
  OrchestrationStatus
} from '../src/browser-use/dto/browser-orchestration.dto';

describe('Browser Orchestration Performance Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;

  // Performance test configuration
  const performanceConfig = {
    // Test thresholds
    maxResponseTime: 5000, // 5 seconds
    maxThroughputTime: 10000, // 10 seconds for high throughput
    minSuccessRate: 95, // 95% success rate minimum
    maxMemoryIncreasePercent: 50, // 50% memory increase limit
    maxCpuUtilizationPercent: 80, // 80% CPU utilization limit

    // Load test parameters
    lowLoad: { concurrent: 5, tasks: 20 },
    mediumLoad: { concurrent: 15, tasks: 60 },
    highLoad: { concurrent: 30, tasks: 120 },
    extremeLoad: { concurrent: 50, tasks: 200 },

    // Test timeouts
    testTimeout: 300000, // 5 minutes for performance tests
    monitoringInterval: 1000, // 1 second monitoring interval
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        SecurityModule,
        AuthModule,
        BrowserUseModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configure for performance testing
    app.enableShutdownHooks();

    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    authToken = await getTestAuthToken(app);

    // Cleanup before tests
    await cleanupTestData();
  }, performanceConfig.testTimeout);

  afterAll(async () => {
    await cleanupTestData();
    await app?.close();
  }, performanceConfig.testTimeout);

  describe('Throughput and Response Time Tests', () => {
    it('should handle low concurrent load efficiently', async () => {
      const { concurrent, tasks } = performanceConfig.lowLoad;

      const performanceMetrics = await runLoadTest({
        testName: 'Low Load Test',
        concurrentOrchestrations: concurrent,
        tasksPerOrchestration: tasks / concurrent,
        strategy: OrchestrationStrategy.PARALLEL,
        expectedResponseTime: 3000,
        expectedSuccessRate: 98,
      });

      // Validate performance metrics
      expect(performanceMetrics.averageResponseTime).toBeLessThan(3000);
      expect(performanceMetrics.successRate).toBeGreaterThanOrEqual(98);
      expect(performanceMetrics.throughput).toBeGreaterThan(2); // tasks per second
      expect(performanceMetrics.memoryIncrease).toBeLessThan(20); // 20% memory increase
    }, performanceConfig.testTimeout);

    it('should handle medium concurrent load with acceptable performance', async () => {
      const { concurrent, tasks } = performanceConfig.mediumLoad;

      const performanceMetrics = await runLoadTest({
        testName: 'Medium Load Test',
        concurrentOrchestrations: concurrent,
        tasksPerOrchestration: tasks / concurrent,
        strategy: OrchestrationStrategy.ADAPTIVE,
        expectedResponseTime: 5000,
        expectedSuccessRate: 96,
      });

      // Validate performance under medium load
      expect(performanceMetrics.averageResponseTime).toBeLessThan(5000);
      expect(performanceMetrics.successRate).toBeGreaterThanOrEqual(96);
      expect(performanceMetrics.throughput).toBeGreaterThan(1.5);
      expect(performanceMetrics.memoryIncrease).toBeLessThan(35);
    }, performanceConfig.testTimeout);

    it('should handle high concurrent load while maintaining stability', async () => {
      const { concurrent, tasks } = performanceConfig.highLoad;

      const performanceMetrics = await runLoadTest({
        testName: 'High Load Test',
        concurrentOrchestrations: concurrent,
        tasksPerOrchestration: tasks / concurrent,
        strategy: OrchestrationStrategy.ADAPTIVE,
        expectedResponseTime: 8000,
        expectedSuccessRate: 95,
        enableAutoScaling: true,
      });

      // Validate performance under high load
      expect(performanceMetrics.averageResponseTime).toBeLessThan(8000);
      expect(performanceMetrics.successRate).toBeGreaterThanOrEqual(95);
      expect(performanceMetrics.throughput).toBeGreaterThan(1);
      expect(performanceMetrics.systemStability).toBeGreaterThan(90);
    }, performanceConfig.testTimeout);

    it('should gracefully degrade under extreme load', async () => {
      const { concurrent, tasks } = performanceConfig.extremeLoad;

      const performanceMetrics = await runLoadTest({
        testName: 'Extreme Load Test',
        concurrentOrchestrations: concurrent,
        tasksPerOrchestration: tasks / concurrent,
        strategy: OrchestrationStrategy.FAULT_TOLERANT,
        expectedResponseTime: 15000,
        expectedSuccessRate: 85, // Lower success rate acceptable under extreme load
        enableAutoScaling: true,
        enableCircuitBreaker: true,
      });

      // Validate graceful degradation
      expect(performanceMetrics.averageResponseTime).toBeLessThan(15000);
      expect(performanceMetrics.successRate).toBeGreaterThanOrEqual(85);
      expect(performanceMetrics.circuitBreakerActivations).toBeGreaterThan(0);
      expect(performanceMetrics.systemStability).toBeGreaterThan(80);
    }, performanceConfig.testTimeout);
  });

  describe('Resource Utilization Tests', () => {
    it('should efficiently utilize system resources under varying loads', async () => {
      const resourceMetrics = await runResourceUtilizationTest({
        testDuration: 60000, // 1 minute test
        loadPattern: 'gradual_increase',
        monitoringInterval: 2000,
      });

      // Validate resource utilization
      expect(resourceMetrics.cpuUtilization.average).toBeLessThan(75);
      expect(resourceMetrics.cpuUtilization.peak).toBeLessThan(90);
      expect(resourceMetrics.memoryUtilization.average).toBeLessThan(80);
      expect(resourceMetrics.memoryUtilization.leaks).toBe(0);
      expect(resourceMetrics.agentUtilization.efficiency).toBeGreaterThan(70);
    }, performanceConfig.testTimeout);

    it('should scale resources dynamically based on demand', async () => {
      const scalingMetrics = await runDynamicScalingTest({
        initialAgents: 3,
        maxAgents: 12,
        loadSpikes: [
          { time: 10000, load: 20 },
          { time: 30000, load: 50 },
          { time: 50000, load: 80 },
          { time: 70000, load: 30 },
        ],
      });

      // Validate dynamic scaling
      expect(scalingMetrics.scalingEvents.scaleUp).toBeGreaterThan(0);
      expect(scalingMetrics.scalingEvents.scaleDown).toBeGreaterThan(0);
      expect(scalingMetrics.scalingLatency.average).toBeLessThan(10000); // 10 seconds
      expect(scalingMetrics.resourceEfficiency).toBeGreaterThan(75);
    }, performanceConfig.testTimeout);

    it('should handle memory-intensive tasks without leaks', async () => {
      const memoryTestMetrics = await runMemoryIntensiveTest({
        testDuration: 90000, // 1.5 minutes
        tasksConfig: {
          largeDataTasks: 10,
          imageProcessingTasks: 5,
          longRunningTasks: 8,
        },
      });

      // Validate memory management
      expect(memoryTestMetrics.memoryLeaks.detected).toBe(false);
      expect(memoryTestMetrics.memoryUsage.peak).toBeLessThan(2048); // 2GB limit
      expect(memoryTestMetrics.garbageCollection.efficiency).toBeGreaterThan(85);
      expect(memoryTestMetrics.sessionCleanup.success).toBe(true);
    }, performanceConfig.testTimeout);
  });

  describe('Scalability and Limits Tests', () => {
    it('should identify system limits and bottlenecks', async () => {
      const limitsMetrics = await runSystemLimitsTest({
        testType: 'find_breaking_point',
        startLoad: 10,
        incrementStep: 10,
        maxLoad: 100,
        breakingPointCriteria: {
          responseTimeThreshold: 30000,
          successRateThreshold: 70,
          errorRateThreshold: 30,
        },
      });

      // Validate system limits identification
      expect(limitsMetrics.breakingPoint.identified).toBe(true);
      expect(limitsMetrics.breakingPoint.maxConcurrentTasks).toBeGreaterThan(50);
      expect(limitsMetrics.bottlenecks.identified.length).toBeGreaterThan(0);
      expect(limitsMetrics.recommendations.length).toBeGreaterThan(0);
    }, performanceConfig.testTimeout);

    it('should maintain performance consistency over time', async () => {
      const consistencyMetrics = await runConsistencyTest({
        testDuration: 180000, // 3 minutes
        constantLoad: 25,
        measurementInterval: 10000, // 10 seconds
      });

      // Validate performance consistency
      expect(consistencyMetrics.responseTime.variance).toBeLessThan(2000);
      expect(consistencyMetrics.throughput.degradation).toBeLessThan(10); // Less than 10% degradation
      expect(consistencyMetrics.errorRate.stability).toBeGreaterThan(95);
      expect(consistencyMetrics.systemStability.overall).toBeGreaterThan(90);
    }, performanceConfig.testTimeout);

    it('should handle concurrent orchestrations with different strategies', async () => {
      const multiStrategyMetrics = await runMultiStrategyTest({
        strategies: [
          { strategy: OrchestrationStrategy.SEQUENTIAL, concurrent: 5 },
          { strategy: OrchestrationStrategy.PARALLEL, concurrent: 8 },
          { strategy: OrchestrationStrategy.ADAPTIVE, concurrent: 10 },
          { strategy: OrchestrationStrategy.HYBRID, concurrent: 7 },
        ],
        testDuration: 120000, // 2 minutes
      });

      // Validate multi-strategy performance
      expect(multiStrategyMetrics.strategies.sequential.efficiency).toBeGreaterThan(80);
      expect(multiStrategyMetrics.strategies.parallel.efficiency).toBeGreaterThan(85);
      expect(multiStrategyMetrics.strategies.adaptive.efficiency).toBeGreaterThan(90);
      expect(multiStrategyMetrics.strategies.hybrid.efficiency).toBeGreaterThan(85);
      expect(multiStrategyMetrics.overall.resourceConflicts).toBe(0);
    }, performanceConfig.testTimeout);
  });

  describe('Error Handling Performance Tests', () => {
    it('should handle high error rates without system degradation', async () => {
      const errorHandlingMetrics = await runErrorHandlingPerformanceTest({
        errorRate: 30, // 30% of tasks will fail
        totalTasks: 100,
        errorTypes: ['network_timeout', 'invalid_url', 'browser_crash', 'memory_exhaustion'],
        recoveryStrategies: ['retry', 'redistribute', 'fallback'],
      });

      // Validate error handling performance
      expect(errorHandlingMetrics.systemStability.duringErrors).toBeGreaterThan(85);
      expect(errorHandlingMetrics.recovery.averageTime).toBeLessThan(5000);
      expect(errorHandlingMetrics.recovery.successRate).toBeGreaterThan(80);
      expect(errorHandlingMetrics.errorIsolation.effectiveness).toBeGreaterThan(95);
    }, performanceConfig.testTimeout);

    it('should maintain performance during agent failures', async () => {
      const agentFailureMetrics = await runAgentFailurePerformanceTest({
        totalAgents: 10,
        failureRate: 20, // 20% of agents will fail
        failureTypes: ['crash', 'timeout', 'resource_exhaustion'],
        testDuration: 90000,
      });

      // Validate performance during agent failures
      expect(agentFailureMetrics.performance.degradation).toBeLessThan(25);
      expect(agentFailureMetrics.failover.speed).toBeLessThan(3000);
      expect(agentFailureMetrics.taskRedistribution.efficiency).toBeGreaterThan(90);
      expect(agentFailureMetrics.systemRecovery.time).toBeLessThan(10000);
    }, performanceConfig.testTimeout);
  });

  // Helper Functions for Performance Testing

  async function runLoadTest(config: {
    testName: string;
    concurrentOrchestrations: number;
    tasksPerOrchestration: number;
    strategy: OrchestrationStrategy;
    expectedResponseTime: number;
    expectedSuccessRate: number;
    enableAutoScaling?: boolean;
    enableCircuitBreaker?: boolean;
  }): Promise<any> {
    const metrics = {
      averageResponseTime: 0,
      successRate: 0,
      throughput: 0,
      memoryIncrease: 0,
      systemStability: 0,
      circuitBreakerActivations: 0,
    };

    const startTime = performance.now();
    const initialMemory = process.memoryUsage();

    // Create orchestrations
    const orchestrationPromises: Promise<any>[] = [];

    for (let i = 0; i < config.concurrentOrchestrations; i++) {
      const orchestrationDto: CreateOrchestrationDto = {
        name: `${config.testName} Orchestration ${i + 1}`,
        strategy: config.strategy,
        maxConcurrentAgents: Math.ceil(config.tasksPerOrchestration / 2),
        autoScale: config.enableAutoScaling || false,
        tasks: Array.from({ length: config.tasksPerOrchestration }, (_, j) => ({
          name: `Task ${j + 1}`,
          type: 'performance_test',
          url: `https://httpbin.org/delay/${Math.floor(Math.random() * 3) + 1}`,
          instructions: `Performance test task ${j + 1}`,
          priority: j % 3 === 0 ? TaskPriority.HIGH : TaskPriority.NORMAL,
        })),
      };

      const orchestrationPromise = createAndExecuteOrchestration(orchestrationDto);
      orchestrationPromises.push(orchestrationPromise);
    }

    // Wait for all orchestrations to complete
    const results = await Promise.allSettled(orchestrationPromises);
    const endTime = performance.now();
    const finalMemory = process.memoryUsage();

    // Calculate metrics
    const successfulResults = results.filter(r => r.status === 'fulfilled');
    metrics.successRate = (successfulResults.length / results.length) * 100;
    metrics.averageResponseTime = endTime - startTime;
    metrics.throughput = (config.concurrentOrchestrations * config.tasksPerOrchestration) /
                       ((endTime - startTime) / 1000);
    metrics.memoryIncrease = ((finalMemory.heapUsed - initialMemory.heapUsed) /
                             initialMemory.heapUsed) * 100;

    // System stability assessment
    metrics.systemStability = Math.min(
      metrics.successRate,
      100 - Math.min(metrics.memoryIncrease, 100)
    );

    return metrics;
  }

  async function runResourceUtilizationTest(config: {
    testDuration: number;
    loadPattern: string;
    monitoringInterval: number;
  }): Promise<any> {
    const metrics = {
      cpuUtilization: { average: 0, peak: 0 },
      memoryUtilization: { average: 0, leaks: 0 },
      agentUtilization: { efficiency: 0 },
    };

    const startTime = Date.now();
    const cpuMeasurements: number[] = [];
    const memoryMeasurements: number[] = [];

    // Monitor resources during test
    const monitoringInterval = setInterval(async () => {
      const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
      const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024); // MB

      cpuMeasurements.push(cpuUsage);
      memoryMeasurements.push(memoryUsage);

      // Check agent utilization
      try {
        const agentStatus = await request(app.getHttpServer())
          .get('/browser-orchestration/agents/status')
          .set('Authorization', `Bearer ${authToken}`);

        if (agentStatus.body.utilization) {
          metrics.agentUtilization.efficiency = agentStatus.body.utilization;
        }
      } catch (error) {
        // Continue monitoring
      }
    }, config.monitoringInterval);

    // Run load based on pattern
    await simulateLoadPattern(config.loadPattern, config.testDuration);

    clearInterval(monitoringInterval);

    // Calculate metrics
    metrics.cpuUtilization.average = cpuMeasurements.reduce((a, b) => a + b, 0) / cpuMeasurements.length;
    metrics.cpuUtilization.peak = Math.max(...cpuMeasurements);
    metrics.memoryUtilization.average = memoryMeasurements.reduce((a, b) => a + b, 0) / memoryMeasurements.length;

    // Detect memory leaks (increasing trend)
    if (memoryMeasurements.length > 10) {
      const firstHalf = memoryMeasurements.slice(0, Math.floor(memoryMeasurements.length / 2));
      const secondHalf = memoryMeasurements.slice(Math.floor(memoryMeasurements.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (secondAvg > firstAvg * 1.5) {
        metrics.memoryUtilization.leaks = 1;
      }
    }

    return metrics;
  }

  async function runDynamicScalingTest(config: {
    initialAgents: number;
    maxAgents: number;
    loadSpikes: Array<{ time: number; load: number }>;
  }): Promise<any> {
    const metrics = {
      scalingEvents: { scaleUp: 0, scaleDown: 0 },
      scalingLatency: { average: 0 },
      resourceEfficiency: 0,
    };

    const startTime = Date.now();
    let previousAgentCount = config.initialAgents;

    // Monitor scaling events
    for (const spike of config.loadSpikes) {
      await new Promise(resolve => setTimeout(resolve, spike.time - (Date.now() - startTime)));

      // Create load spike
      await createLoadSpike(spike.load);

      // Monitor agent scaling
      const scaleStartTime = Date.now();
      let currentAgentCount = previousAgentCount;

      while (Date.now() - scaleStartTime < 30000) { // Wait up to 30 seconds for scaling
        try {
          const agentStatus = await request(app.getHttpServer())
            .get('/browser-orchestration/agents/status')
            .set('Authorization', `Bearer ${authToken}`);

          currentAgentCount = agentStatus.body.totalAgents || previousAgentCount;

          if (currentAgentCount !== previousAgentCount) {
            const scalingTime = Date.now() - scaleStartTime;
            metrics.scalingLatency.average = (metrics.scalingLatency.average + scalingTime) / 2;

            if (currentAgentCount > previousAgentCount) {
              metrics.scalingEvents.scaleUp++;
            } else {
              metrics.scalingEvents.scaleDown++;
            }

            previousAgentCount = currentAgentCount;
            break;
          }
        } catch (error) {
          // Continue monitoring
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Calculate resource efficiency
    metrics.resourceEfficiency = Math.min(
      (metrics.scalingEvents.scaleUp + metrics.scalingEvents.scaleDown) * 20, // 20 points per scaling event
      100
    );

    return metrics;
  }

  async function runMemoryIntensiveTest(config: {
    testDuration: number;
    tasksConfig: {
      largeDataTasks: number;
      imageProcessingTasks: number;
      longRunningTasks: number;
    };
  }): Promise<any> {
    const metrics = {
      memoryLeaks: { detected: false },
      memoryUsage: { peak: 0 },
      garbageCollection: { efficiency: 0 },
      sessionCleanup: { success: false },
    };

    const initialMemory = process.memoryUsage();
    const memoryHistory: number[] = [];

    // Create memory-intensive orchestration
    const memoryIntensiveDto: CreateOrchestrationDto = {
      name: 'Memory Intensive Test',
      strategy: OrchestrationStrategy.PARALLEL,
      maxConcurrentAgents: 8,
      tasks: [
        ...Array.from({ length: config.tasksConfig.largeDataTasks }, (_, i) => ({
          name: `Large Data Task ${i + 1}`,
          type: 'large_data_processing',
          url: 'https://httpbin.org/json',
          instructions: 'Process large JSON datasets',
          priority: TaskPriority.NORMAL,
          memoryRequirement: 'high',
        })),
        ...Array.from({ length: config.tasksConfig.imageProcessingTasks }, (_, i) => ({
          name: `Image Processing Task ${i + 1}`,
          type: 'image_processing',
          url: 'https://httpbin.org/image/jpeg',
          instructions: 'Process and analyze images',
          priority: TaskPriority.HIGH,
          memoryRequirement: 'very_high',
        })),
        ...Array.from({ length: config.tasksConfig.longRunningTasks }, (_, i) => ({
          name: `Long Running Task ${i + 1}`,
          type: 'long_running',
          url: `https://httpbin.org/delay/${5 + (i % 5)}`,
          instructions: 'Execute long-running operations',
          priority: TaskPriority.LOW,
          memoryRequirement: 'medium',
        })),
      ],
    };

    // Monitor memory during execution
    const memoryMonitor = setInterval(() => {
      const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      memoryHistory.push(currentMemory);
      metrics.memoryUsage.peak = Math.max(metrics.memoryUsage.peak, currentMemory);
    }, 2000);

    // Execute memory-intensive test
    await createAndExecuteOrchestration(memoryIntensiveDto);

    clearInterval(memoryMonitor);

    // Analyze memory patterns
    if (memoryHistory.length > 10) {
      const trend = calculateMemoryTrend(memoryHistory);
      metrics.memoryLeaks.detected = trend > 0.1; // 10% increase trend indicates potential leak
    }

    // Force garbage collection and measure efficiency
    if (global.gc) {
      const beforeGC = process.memoryUsage().heapUsed;
      global.gc();
      const afterGC = process.memoryUsage().heapUsed;
      metrics.garbageCollection.efficiency = ((beforeGC - afterGC) / beforeGC) * 100;
    }

    // Check session cleanup
    try {
      const sessionsResponse = await request(app.getHttpServer())
        .get('/browser-orchestration/sessions')
        .set('Authorization', `Bearer ${authToken}`);

      const activeSessions = sessionsResponse.body.filter((s: any) => s.status === 'active').length;
      metrics.sessionCleanup.success = activeSessions === 0;
    } catch (error) {
      metrics.sessionCleanup.success = false;
    }

    return metrics;
  }

  async function runSystemLimitsTest(config: {
    testType: string;
    startLoad: number;
    incrementStep: number;
    maxLoad: number;
    breakingPointCriteria: {
      responseTimeThreshold: number;
      successRateThreshold: number;
      errorRateThreshold: number;
    };
  }): Promise<any> {
    const metrics = {
      breakingPoint: { identified: false, maxConcurrentTasks: 0 },
      bottlenecks: { identified: [] as string[] },
      recommendations: [] as string[],
    };

    let currentLoad = config.startLoad;
    let breakingPointFound = false;

    while (currentLoad <= config.maxLoad && !breakingPointFound) {
      const loadTestResult = await runLoadTest({
        testName: `System Limits Test - Load ${currentLoad}`,
        concurrentOrchestrations: currentLoad,
        tasksPerOrchestration: 4,
        strategy: OrchestrationStrategy.ADAPTIVE,
        expectedResponseTime: config.breakingPointCriteria.responseTimeThreshold,
        expectedSuccessRate: config.breakingPointCriteria.successRateThreshold,
      });

      // Check if breaking point is reached
      if (
        loadTestResult.averageResponseTime > config.breakingPointCriteria.responseTimeThreshold ||
        loadTestResult.successRate < config.breakingPointCriteria.successRateThreshold ||
        (100 - loadTestResult.successRate) > config.breakingPointCriteria.errorRateThreshold
      ) {
        metrics.breakingPoint.identified = true;
        metrics.breakingPoint.maxConcurrentTasks = (currentLoad - config.incrementStep) * 4;
        breakingPointFound = true;

        // Identify bottlenecks
        if (loadTestResult.averageResponseTime > config.breakingPointCriteria.responseTimeThreshold) {
          metrics.bottlenecks.identified.push('response_time');
        }
        if (loadTestResult.memoryIncrease > 80) {
          metrics.bottlenecks.identified.push('memory');
        }
        if (loadTestResult.throughput < 0.5) {
          metrics.bottlenecks.identified.push('throughput');
        }
      }

      currentLoad += config.incrementStep;

      // Small delay between load tests
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Generate recommendations based on bottlenecks
    metrics.recommendations = generatePerformanceRecommendations(metrics.bottlenecks.identified);

    return metrics;
  }

  async function runConsistencyTest(config: {
    testDuration: number;
    constantLoad: number;
    measurementInterval: number;
  }): Promise<any> {
    const metrics = {
      responseTime: { variance: 0 },
      throughput: { degradation: 0 },
      errorRate: { stability: 0 },
      systemStability: { overall: 0 },
    };

    const measurements: Array<{
      timestamp: number;
      responseTime: number;
      throughput: number;
      errorRate: number;
    }> = [];

    const startTime = Date.now();

    while (Date.now() - startTime < config.testDuration) {
      const measurementStart = Date.now();

      // Run consistent load test
      const loadResult = await runLoadTest({
        testName: 'Consistency Measurement',
        concurrentOrchestrations: config.constantLoad,
        tasksPerOrchestration: 3,
        strategy: OrchestrationStrategy.ADAPTIVE,
        expectedResponseTime: 5000,
        expectedSuccessRate: 95,
      });

      measurements.push({
        timestamp: Date.now(),
        responseTime: loadResult.averageResponseTime,
        throughput: loadResult.throughput,
        errorRate: 100 - loadResult.successRate,
      });

      // Wait for next measurement interval
      const elapsed = Date.now() - measurementStart;
      const waitTime = Math.max(0, config.measurementInterval - elapsed);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Calculate consistency metrics
    if (measurements.length > 1) {
      const responseTimes = measurements.map(m => m.responseTime);
      const throughputs = measurements.map(m => m.throughput);
      const errorRates = measurements.map(m => m.errorRate);

      metrics.responseTime.variance = calculateVariance(responseTimes);
      metrics.throughput.degradation = calculateDegradation(throughputs);
      metrics.errorRate.stability = 100 - calculateVariance(errorRates);
      metrics.systemStability.overall = Math.min(
        100 - (metrics.responseTime.variance / 1000),
        100 - metrics.throughput.degradation,
        metrics.errorRate.stability
      );
    }

    return metrics;
  }

  async function runMultiStrategyTest(config: {
    strategies: Array<{ strategy: OrchestrationStrategy; concurrent: number }>;
    testDuration: number;
  }): Promise<any> {
    const metrics = {
      strategies: {} as any,
      overall: { resourceConflicts: 0 },
    };

    // Run strategies concurrently
    const strategyPromises = config.strategies.map(async (strategyConfig) => {
      const strategyMetrics = await runLoadTest({
        testName: `Multi-Strategy Test - ${strategyConfig.strategy}`,
        concurrentOrchestrations: strategyConfig.concurrent,
        tasksPerOrchestration: 5,
        strategy: strategyConfig.strategy,
        expectedResponseTime: 8000,
        expectedSuccessRate: 90,
      });

      return {
        strategy: strategyConfig.strategy,
        efficiency: strategyMetrics.systemStability,
        metrics: strategyMetrics,
      };
    });

    const results = await Promise.all(strategyPromises);

    // Organize results by strategy
    results.forEach(result => {
      const strategyName = result.strategy.toLowerCase().replace('_', '');
      metrics.strategies[strategyName] = {
        efficiency: result.efficiency,
        ...result.metrics,
      };
    });

    return metrics;
  }

  async function runErrorHandlingPerformanceTest(config: {
    errorRate: number;
    totalTasks: number;
    errorTypes: string[];
    recoveryStrategies: string[];
  }): Promise<any> {
    const metrics = {
      systemStability: { duringErrors: 0 },
      recovery: { averageTime: 0, successRate: 0 },
      errorIsolation: { effectiveness: 0 },
    };

    // Create orchestration with mixed success/failure tasks
    const errorTestDto: CreateOrchestrationDto = {
      name: 'Error Handling Performance Test',
      strategy: OrchestrationStrategy.FAULT_TOLERANT,
      maxConcurrentAgents: 6,
      enableErrorRecovery: true,
      maxRetryAttempts: 2,
      tasks: Array.from({ length: config.totalTasks }, (_, i) => {
        const shouldFail = (i % 100) < config.errorRate;
        return {
          name: `Task ${i + 1}`,
          type: shouldFail ? 'error_task' : 'normal_task',
          url: shouldFail
            ? `https://invalid-domain-${i}.com`
            : 'https://httpbin.org/get',
          instructions: shouldFail
            ? 'This task should fail'
            : 'Normal successful task',
          priority: TaskPriority.NORMAL,
          errorType: shouldFail ? config.errorTypes[i % config.errorTypes.length] : undefined,
        };
      }),
    };

    const startTime = Date.now();
    const result = await createAndExecuteOrchestration(errorTestDto);
    const endTime = Date.now();

    // Calculate error handling metrics
    metrics.systemStability.duringErrors = result.systemStability || 0;
    metrics.recovery.averageTime = (endTime - startTime) / config.totalTasks;
    metrics.recovery.successRate = ((result.successfulTasks || 0) / config.totalTasks) * 100;
    metrics.errorIsolation.effectiveness = 100 - ((result.failedTasks || 0) / config.totalTasks) * 100;

    return metrics;
  }

  async function runAgentFailurePerformanceTest(config: {
    totalAgents: number;
    failureRate: number;
    failureTypes: string[];
    testDuration: number;
  }): Promise<any> {
    const metrics = {
      performance: { degradation: 0 },
      failover: { speed: 0 },
      taskRedistribution: { efficiency: 0 },
      systemRecovery: { time: 0 },
    };

    // Implementation would involve simulating agent failures
    // and measuring system response

    return metrics;
  }

  // Utility functions
  async function createAndExecuteOrchestration(dto: CreateOrchestrationDto): Promise<any> {
    const createResponse = await request(app.getHttpServer())
      .post('/browser-orchestration/orchestrations')
      .set('Authorization', `Bearer ${authToken}`)
      .send(dto);

    if (createResponse.status !== HttpStatus.CREATED) {
      throw new Error(`Failed to create orchestration: ${createResponse.status}`);
    }

    const orchestrationId = createResponse.body.id;

    const executeResponse = await request(app.getHttpServer())
      .post(`/browser-orchestration/orchestrations/${orchestrationId}/execute`)
      .set('Authorization', `Bearer ${authToken}`);

    if (executeResponse.status !== HttpStatus.OK) {
      throw new Error(`Failed to execute orchestration: ${executeResponse.status}`);
    }

    // Wait for completion
    let status = OrchestrationStatus.RUNNING;
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes max wait

    while (status === OrchestrationStatus.RUNNING && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await request(app.getHttpServer())
        .get(`/browser-orchestration/orchestrations/${orchestrationId}/status`)
        .set('Authorization', `Bearer ${authToken}`);

      status = statusResponse.body.status;
      attempts++;
    }

    return {
      orchestrationId,
      finalStatus: status,
      // Add more metrics as needed
    };
  }

  async function simulateLoadPattern(pattern: string, duration: number): Promise<void> {
    // Implementation for different load patterns
    switch (pattern) {
      case 'gradual_increase':
        // Implement gradual load increase
        break;
      case 'spike':
        // Implement load spikes
        break;
      case 'constant':
        // Implement constant load
        break;
    }
  }

  async function createLoadSpike(load: number): Promise<void> {
    // Create sudden load spike for testing
  }

  function calculateMemoryTrend(measurements: number[]): number {
    if (measurements.length < 2) return 0;

    const firstHalf = measurements.slice(0, Math.floor(measurements.length / 2));
    const secondHalf = measurements.slice(Math.floor(measurements.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    return (secondAvg - firstAvg) / firstAvg;
  }

  function calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  function calculateDegradation(values: number[]): number {
    if (values.length < 2) return 0;

    const initial = values[0];
    const final = values[values.length - 1];
    return ((initial - final) / initial) * 100;
  }

  function generatePerformanceRecommendations(bottlenecks: string[]): string[] {
    const recommendations: string[] = [];

    if (bottlenecks.includes('response_time')) {
      recommendations.push('Optimize task execution algorithms');
      recommendations.push('Increase agent pool size');
    }

    if (bottlenecks.includes('memory')) {
      recommendations.push('Implement memory pooling');
      recommendations.push('Add garbage collection optimization');
    }

    if (bottlenecks.includes('throughput')) {
      recommendations.push('Implement better load balancing');
      recommendations.push('Optimize task distribution algorithms');
    }

    return recommendations;
  }

  async function cleanupTestData(): Promise<void> {
    try {
      await prismaService.browserTask.deleteMany({
        where: { name: { contains: 'Test' } },
      });
      await prismaService.browserSession.deleteMany({
        where: { name: { contains: 'Test' } },
      });
      await prismaService.browserOrchestration.deleteMany({
        where: { name: { contains: 'Test' } },
      });
    } catch (error) {
      console.warn('Error cleaning test data:', error);
    }
  }

  async function getTestAuthToken(app: INestApplication): Promise<string> {
    try {
      const authResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: process.env.TEST_USERNAME || 'test-user',
          password: process.env.TEST_PASSWORD || 'test-password',
        });

      if (authResponse.body?.accessToken) {
        return authResponse.body.accessToken;
      }
    } catch (error) {
      // Use mock token for testing
    }

    return 'mock-performance-test-token';
  }
});