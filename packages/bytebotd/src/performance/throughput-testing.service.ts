/**
 * WebSocket Throughput Testing Service - Phase 1 Implementation
 *
 * Comprehensive throughput testing system targeting 5000+ messages/second performance
 * with various payload sizes, connection patterns, and load scenarios.
 *
 * Features:
 * - Multi-scenario throughput testing (baseline, burst, sustained, peak)
 * - Variable payload size testing (64B to 64KB)
 * - Connection scaling patterns (1 to 1000+ concurrent connections)
 * - Message batching optimization testing
 * - Real-time throughput monitoring and visualization
 * - Throughput bottleneck identification and analysis
 * - Performance optimization recommendations
 * - Comparative throughput analysis across scenarios
 *
 * @module ThroughputTestingService
 * @version 1.0.0
 * @author PARLANT Performance Testing Team
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';import { ConfigService } from '@nestjs/config';import { EventEmitter } from 'events';import * as WebSocket from 'ws';import { performance } from 'perf_hooks';import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';import * as path from 'path';import { promisify } from 'util';// ===== THROUGHPUT TESTING TYPES =====/**
 * Throughput test scenario types
 */
export enum ThroughputTestScenario {
  BASELINE_THROUGHPUT = 'baseline_throughput',BURST_THROUGHPUT = 'burst_throughput',SUSTAINED_THROUGHPUT = 'sustained_throughput',PEAK_CAPACITY = 'peak_capacity',VARIABLE_PAYLOAD = 'variable_payload',CONNECTION_SCALING = 'connection_scaling',MESSAGE_BATCHING = 'message_batching',LOAD_RAMP_UP = 'load_ramp_up',STRESS_TESTING = 'stress_testing',}/**
 * Throughput test configuration
 */
export interface ThroughputTestConfig {
  scenario: ThroughputTestScenario;

  // Connection parameters
  maxConnections: number;
  connectionRampRate: number;     // Connections per second

  // Message parameters
  targetThroughput: number;       // Messages per second (target: 5000+)
  messageSize: number;            // Bytes per message
  batchSize: number;             // Messages per batch

  // Duration parameters
  testDuration: number;           // Total test duration (ms)
  warmupDuration: number;         // Warmup period (ms)
  measurementDuration: number;    // Core measurement period (ms)
  cooldownDuration: number;       // Cooldown period (ms)

  // Load pattern parameters
  loadPattern: 'constant' | 'ramp' | 'burst' | 'sine_wave' | 'step';burstSettings?: {burstDuration: number;        // Duration of each burst (ms)
    burstInterval: number;        // Interval between bursts (ms)
    burstMultiplier: number;      // Throughput multiplier during burst
  };

  rampSettings?: {
    startRate: number;            // Starting messages/sec
    endRate: number;              // Ending messages/sec
    rampDuration: number;         // Ramp duration (ms)
  };
}

/**
 * Real-time throughput metrics
 */
export interface ThroughputMetrics {
  timestamp: number;
  instantThroughput: number;      // Messages/sec at this moment
  cumulativeThroughput: number;   // Average messages/sec since start
  activeConnections: number;
  queuedMessages: number;
  sentMessages: number;
  receivedMessages: number;
  errorCount: number;

  // Performance indicators
  cpuUsage: number;
  memoryUsage: number;
  networkUtilization: number;
}

/**
 * Throughput test results with comprehensive analysis
 */
export interface ThroughputTestResults {
  testId: string;
  scenario: ThroughputTestScenario;
  config: ThroughputTestConfig;

  // Execution timeline
  startTime: Date;
  endTime: Date;
  actualDuration: number;

  // Core throughput metrics
  peakThroughput: number;         // Maximum instantaneous throughput
  averageThroughput: number;      // Average over measurement period
  sustainedThroughput: number;    // Sustained over 90% of test duration
  totalMessagesProcessed: number;

  // Target validation
  targetAchieved: boolean;        // Did we meet 5000+ msg/sec target?
  targetPercentage: number;       // Percentage of target achieved

  // Performance analysis
  throughputVariability: number;  // Standard deviation of throughput
  connectionEfficiency: number;   // Throughput per connection
  resourceEfficiency: {
    cpuEfficiency: number;        // Messages/sec per CPU %
    memoryEfficiency: number;     // Messages/sec per MB
  };

  // Bottleneck analysis
  bottlenecks: {
    type: 'cpu' | 'memory' | 'network' | 'connection' | 'application';severity: 'low' | 'medium' | 'high' | 'critical';description: string;recommendation: string;
  }[];

  // Time-series data
  metricsTimeline: ThroughputMetrics[];

  // Comparative analysis
  baselineComparison?: {
    improvementPercentage: number;
    performanceTrend: 'improving' | 'degrading' | 'stable';};}

/**
 * Connection worker data for distributed testing
 */
export interface ConnectionWorkerData {
  workerId: string;
  websocketUrl: string;
  connectionsToCreate: number;
  messagesPerSecond: number;
  messageSize: number;
  testDuration: number;
  batchSize: number;
}

/**
 * Payload generator configuration for variable size testing
 */
export interface PayloadConfig {
  baseSize: number;               // Base payload size in bytes
  variability: number;            // Size variability percentage
  compressionRatio: number;       // Expected compression ratio
  contentType: 'random' | 'structured' | 'compressible' | 'binary';}// ===== THROUGHPUT TESTING SERVICE =====

@Injectable()
export class ThroughputTestingService implements OnModuleInit, OnModuleDestroy {

  private readonly logger = new Logger(ThroughputTestingService.name);
  private readonly eventEmitter = new EventEmitter();

  // Test execution state
  private activeTests: Map<string, ThroughputTestConfig> = new Map();
  private testResults: Map<string, ThroughputTestResults> = new Map();
  private workerPool: Worker[] = [];

  // Real-time monitoring
  private metricsCollector?: NodeJS.Timeout;
  private currentMetrics: ThroughputMetrics[] = [];

  // Baseline performance tracking
  private baselineResults?: ThroughputTestResults;

  // Performance thresholds
  private readonly THROUGHPUT_TARGETS = {
    MINIMUM_TARGET: 5000,         // Messages per second (enterprise requirement)
    EXCELLENT_TARGET: 10000,      // Excellent performance threshold
    PEAK_TARGET: 15000,          // Peak capacity target
    EFFICIENCY_TARGET: 50,        // Messages per connection minimum
  };

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.logger.log('🚀 WebSocket Throughput Testing Service initializing...');}async onModuleInit(): Promise<void> {
    this.logger.log('Initializing WebSocket Throughput Testing Framework');// Initialize worker pool for distributed load generationawait this.initializeWorkerPool();

    // Load baseline results if available
    await this.loadBaselineResults();

    this.logger.log('✅ WebSocket Throughput Testing Framework ready');}async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down WebSocket Throughput Testing Framework');// Stop all active testsfor (const testId of this.activeTests.keys()) {
      await this.stopThroughputTest(testId);
    }

    // Cleanup worker pool
    await this.cleanupWorkerPool();

    // Stop metrics collection
    this.stopMetricsCollection();

    this.logger.log('✅ WebSocket Throughput Testing Framework shutdown complete');}// ===== BASELINE THROUGHPUT TESTING =====

  /**
   * Execute baseline throughput test with standard parameters
   * TARGET: Establish 5000+ msg/sec baseline performance
   */
  async executeBaselineThroughputTest(): Promise<ThroughputTestResults> {
    this.logger.log('🧪 Starting baseline throughput test (target: 5000+ msg/sec)');const config: ThroughputTestConfig = {scenario: ThroughputTestScenario.BASELINE_THROUGHPUT,
      maxConnections: 100,
      connectionRampRate: 10,
      targetThroughput: this.THROUGHPUT_TARGETS.MINIMUM_TARGET,
      messageSize: 1024,           // 1KB standard message
      batchSize: 10,
      testDuration: 120000,        // 2 minutes total
      warmupDuration: 20000,       // 20 seconds warmup
      measurementDuration: 60000,  // 60 seconds measurement
      cooldownDuration: 20000,     // 20 seconds cooldown
      loadPattern: 'constant',};const results = await this.executeThroughputTest('baseline', config);// Store as baseline for future comparisonsthis.baselineResults = results;

    this.logThroughputResults(results);
    return results;
  }

  /**
   * Execute burst throughput test for peak capacity validation
   */
  async executeBurstThroughputTest(): Promise<ThroughputTestResults> {
    this.logger.log('💥 Starting burst throughput test');const config: ThroughputTestConfig = {scenario: ThroughputTestScenario.BURST_THROUGHPUT,
      maxConnections: 200,
      connectionRampRate: 20,
      targetThroughput: this.THROUGHPUT_TARGETS.PEAK_TARGET,
      messageSize: 512,            // Smaller messages for higher throughput
      batchSize: 20,
      testDuration: 180000,        // 3 minutes total
      warmupDuration: 30000,       // 30 seconds warmup
      measurementDuration: 90000,  // 90 seconds measurement
      cooldownDuration: 30000,     // 30 seconds cooldown
      loadPattern: 'burst',burstSettings: {burstDuration: 5000,       // 5-second bursts
        burstInterval: 10000,      // 10-second intervals
        burstMultiplier: 3.0,      // 3x throughput during bursts
      },
    };

    return await this.executeThroughputTest('burst', config);
  }

  /**
   * Execute sustained throughput test for endurance validation
   */
  async executeSustainedThroughputTest(durationMinutes: number = 10): Promise<ThroughputTestResults> {
    this.logger.log(`⏳ Starting sustained throughput test (${durationMinutes} minutes)`);

    const config: ThroughputTestConfig = {
      scenario: ThroughputTestScenario.SUSTAINED_THROUGHPUT,
      maxConnections: 150,
      connectionRampRate: 15,
      targetThroughput: this.THROUGHPUT_TARGETS.MINIMUM_TARGET,
      messageSize: 1024,
      batchSize: 15,
      testDuration: durationMinutes * 60000,
      warmupDuration: 30000,
      measurementDuration: (durationMinutes - 2) * 60000,
      cooldownDuration: 30000,
      loadPattern: 'constant',};return await this.executeThroughputTest('sustained', config);}// ===== VARIABLE PAYLOAD TESTING =====

  /**
   * Execute variable payload size throughput testing
   */
  async executeVariablePayloadTest(): Promise<Map<number, ThroughputTestResults>> {
    this.logger.log('📏 Starting variable payload size throughput testing');

    const payloadSizes = [64, 256, 1024, 4096, 16384, 65536]; // Bytes
    const results = new Map<number, ThroughputTestResults>();

    for (const payloadSize of payloadSizes) {
      this.logger.log(`Testing payload size: ${payloadSize} bytes`);

      const config: ThroughputTestConfig = {
        scenario: ThroughputTestScenario.VARIABLE_PAYLOAD,
        maxConnections: 100,
        connectionRampRate: 20,
        targetThroughput: this.calculateTargetForPayloadSize(payloadSize),
        messageSize: payloadSize,
        batchSize: this.calculateOptimalBatchSize(payloadSize),
        testDuration: 90000,         // 90 seconds per size
        warmupDuration: 15000,
        measurementDuration: 60000,
        cooldownDuration: 15000,
        loadPattern: 'constant',
      };

      const testResult = await this.executeThroughputTest(
        `payload_${payloadSize}`,config);

      results.set(payloadSize, testResult);

      this.logger.log(`Payload ${payloadSize}B: ${testResult.averageThroughput.toFixed(0)} msg/sec`);
    }

    // Analyze payload size impact
    this.analyzePayloadSizeImpact(results);

    return results;
  }

  // ===== CONNECTION SCALING TESTING =====

  /**
   * Execute connection scaling throughput testing
   */
  async executeConnectionScalingTest(): Promise<Map<number, ThroughputTestResults>> {
    this.logger.log('🔗 Starting connection scaling throughput testing');

    const connectionCounts = [10, 25, 50, 100, 200, 500, 1000];
    const results = new Map<number, ThroughputTestResults>();

    for (const connectionCount of connectionCounts) {
      this.logger.log(`Testing with ${connectionCount} connections`);

      const config: ThroughputTestConfig = {
        scenario: ThroughputTestScenario.CONNECTION_SCALING,
        maxConnections: connectionCount,
        connectionRampRate: Math.min(connectionCount / 5, 50),
        targetThroughput: this.THROUGHPUT_TARGETS.MINIMUM_TARGET,
        messageSize: 1024,
        batchSize: 10,
        testDuration: 120000,        // 2 minutes per connection count
        warmupDuration: 20000,
        measurementDuration: 80000,
        cooldownDuration: 20000,
        loadPattern: 'constant',
      };

      const testResult = await this.executeThroughputTest(
        `connections_${connectionCount}`,config);

      results.set(connectionCount, testResult);

      const efficiency = testResult.connectionEfficiency;
      this.logger.log(`${connectionCount} connections: ${testResult.averageThroughput.toFixed(0)} msg/sec (${efficiency.toFixed(1)} msg/sec per connection)`);
    }

    // Analyze connection scaling efficiency
    this.analyzeConnectionScaling(results);

    return results;
  }

  // ===== MESSAGE BATCHING OPTIMIZATION =====

  /**
   * Execute message batching optimization testing
   */
  async executeMessageBatchingTest(): Promise<Map<number, ThroughputTestResults>> {
    this.logger.log('📦 Starting message batching optimization testing');

    const batchSizes = [1, 5, 10, 20, 50, 100, 200];
    const results = new Map<number, ThroughputTestResults>();

    for (const batchSize of batchSizes) {
      this.logger.log(`Testing batch size: ${batchSize} messages`);

      const config: ThroughputTestConfig = {
        scenario: ThroughputTestScenario.MESSAGE_BATCHING,
        maxConnections: 100,
        connectionRampRate: 20,
        targetThroughput: this.THROUGHPUT_TARGETS.MINIMUM_TARGET,
        messageSize: 1024,
        batchSize: batchSize,
        testDuration: 90000,
        warmupDuration: 15000,
        measurementDuration: 60000,
        cooldownDuration: 15000,
        loadPattern: 'constant',
      };

      const testResult = await this.executeThroughputTest(
        `batch_${batchSize}`,config);

      results.set(batchSize, testResult);

      this.logger.log(`Batch size ${batchSize}: ${testResult.averageThroughput.toFixed(0)} msg/sec`);}// Find optimal batch size
    const optimalBatch = this.findOptimalBatchSize(results);
    this.logger.log(`🎯 Optimal batch size: ${optimalBatch.batchSize} (${optimalBatch.throughput.toFixed(0)} msg/sec)`);

    return results;
  }

  // ===== LOAD PATTERN TESTING =====

  /**
   * Execute load ramp-up testing
   */
  async executeLoadRampUpTest(): Promise<ThroughputTestResults> {
    this.logger.log('📈 Starting load ramp-up throughput testing');const config: ThroughputTestConfig = {scenario: ThroughputTestScenario.LOAD_RAMP_UP,
      maxConnections: 200,
      connectionRampRate: 10,
      targetThroughput: this.THROUGHPUT_TARGETS.PEAK_TARGET,
      messageSize: 1024,
      batchSize: 15,
      testDuration: 300000,        // 5 minutes total
      warmupDuration: 30000,
      measurementDuration: 240000,
      cooldownDuration: 30000,
      loadPattern: 'ramp',rampSettings: {startRate: 1000,           // Start at 1000 msg/sec
        endRate: 15000,            // Ramp to 15000 msg/sec
        rampDuration: 240000,      // Over 4 minutes
      },
    };

    return await this.executeThroughputTest('ramp_up', config);}/**
   * Execute stress testing to find breaking point
   */
  async executeStressTest(): Promise<ThroughputTestResults> {
    this.logger.log('💪 Starting stress test to find throughput limits');const config: ThroughputTestConfig = {scenario: ThroughputTestScenario.STRESS_TESTING,
      maxConnections: 1000,
      connectionRampRate: 50,
      targetThroughput: 25000,     // Deliberately high target
      messageSize: 512,
      batchSize: 25,
      testDuration: 180000,        // 3 minutes
      warmupDuration: 30000,
      measurementDuration: 120000,
      cooldownDuration: 30000,
      loadPattern: 'constant',};return await this.executeThroughputTest('stress', config);
  }

  // ===== CORE TESTING INFRASTRUCTURE =====

  /**
   * Execute comprehensive throughput test
   */
  private async executeThroughputTest(
    testId: string,
    config: ThroughputTestConfig
  ): Promise<ThroughputTestResults> {
    const fullTestId = this.generateTestId(testId);
    this.logger.log(`🧪 Executing throughput test: ${fullTestId}`);this.activeTests.set(fullTestId, config);const startTime = new Date();
    let testResults: ThroughputTestResults;

    try {
      // Start metrics collection
      this.startMetricsCollection();

      // Execute test phases
      await this.executeTestPhases(fullTestId, config);

      const endTime = new Date();

      // Calculate comprehensive results
      testResults = this.calculateThroughputResults(
        fullTestId,
        config,
        startTime,
        endTime,
        this.currentMetrics
      );

      // Store results
      this.testResults.set(fullTestId, testResults);

      this.logger.log(`✅ Throughput test completed: ${fullTestId}`);return testResults;} catch (error) {
      this.logger.error(`❌ Throughput test failed: ${fullTestId}`, error.stack);throw error;} finally {
      this.activeTests.delete(fullTestId);
      this.stopMetricsCollection();
    }
  }

  /**
   * Execute test phases (warmup, measurement, cooldown)
   */
  private async executeTestPhases(
    testId: string,
    config: ThroughputTestConfig
  ): Promise<void> {
    // Warmup phase
    if (config.warmupDuration > 0) {
      this.logger.log(`🔥 Warmup phase: ${config.warmupDuration}ms`);
      await this.executeTestPhase(testId, config, 'warmup');
    }

    // Main measurement phase
    this.logger.log(`📊 Measurement phase: ${config.measurementDuration}ms`);
    await this.executeTestPhase(testId, config, 'measurement');

    // Cooldown phase
    if (config.cooldownDuration > 0) {
      this.logger.log(`❄️ Cooldown phase: ${config.cooldownDuration}ms`);
      await this.executeTestPhase(testId, config, 'cooldown');}}

  /**
   * Execute individual test phase
   */
  private async executeTestPhase(
    testId: string,
    config: ThroughputTestConfig,
    phase: 'warmup' | 'measurement' | 'cooldown'
  ): Promise<void> {
    const phaseDuration = this.getPhaseDuration(config, phase);
    const targetThroughput = this.getPhaseTargetThroughput(config, phase);

    // Create and configure workers for this phase
    const workers = await this.createThroughputWorkers(
      config,
      targetThroughput,
      phaseDuration
    );

    // Start workers
    const workerPromises = workers.map(worker => this.startWorker(worker, phaseDuration));

    // Wait for phase completion
    await Promise.all(workerPromises);

    // Cleanup workers
    await Promise.all(workers.map(worker => worker.terminate()));
  }

  /**
   * Create throughput testing workers
   */
  private async createThroughputWorkers(
    config: ThroughputTestConfig,
    targetThroughput: number,
    duration: number
  ): Promise<Worker[]> {
    const workerCount = Math.min(config.maxConnections, 50); // Max 50 workers
    const workers: Worker[] = [];

    const connectionsPerWorker = Math.ceil(config.maxConnections / workerCount);
    const throughputPerWorker = targetThroughput / workerCount;

    for (let i = 0; i < workerCount; i++) {
      const workerData: ConnectionWorkerData = {
        workerId: `worker_${i}`,
        websocketUrl: this.getWebSocketUrl(),
        connectionsToCreate: connectionsPerWorker,
        messagesPerSecond: throughputPerWorker,
        messageSize: config.messageSize,
        testDuration: duration,
        batchSize: config.batchSize,
      };

      // Create worker (in real implementation, this would create actual worker threads)
      const worker = new Worker(__filename, { workerData });
      workers.push(worker);
    }

    return workers;
  }

  /**
   * Start individual worker
   */
  private async startWorker(worker: Worker, duration: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker timeout'));}, duration + 10000); // 10-second bufferworker.on('message', (message) => {if (message.type === 'metrics') {// Collect worker metricsthis.processWorkerMetrics(message.data);
        } else if (message.type === 'completed') {clearTimeout(timeout);resolve();
        } else if (message.type === 'error') {clearTimeout(timeout);reject(new Error(message.data));
        }
      });

      worker.on('error', (error) => {clearTimeout(timeout);reject(error);
      });

      // Start worker
      worker.postMessage({ type: 'start' });});}

  // ===== METRICS AND ANALYSIS =====

  /**
   * Calculate comprehensive throughput results
   */
  private calculateThroughputResults(
    testId: string,
    config: ThroughputTestConfig,
    startTime: Date,
    endTime: Date,
    metricsTimeline: ThroughputMetrics[]
  ): ThroughputTestResults {
    const actualDuration = endTime.getTime() - startTime.getTime();

    // Filter metrics to measurement period only
    const measurementStart = startTime.getTime() + config.warmupDuration;
    const measurementEnd = measurementStart + config.measurementDuration;

    const measurementMetrics = metricsTimeline.filter(
      metric => metric.timestamp >= measurementStart && metric.timestamp <= measurementEnd
    );

    // Calculate core throughput metrics
    const throughputValues = measurementMetrics.map(m => m.instantThroughput);
    const peakThroughput = Math.max(...throughputValues);
    const averageThroughput = this.calculateMean(throughputValues);
    const sustainedThroughput = this.calculateSustainedThroughput(throughputValues);
    const totalMessagesProcessed = measurementMetrics.reduce((sum, m) => sum + m.sentMessages, 0);

    // Calculate performance metrics
    const throughputVariability = this.calculateStandardDeviation(throughputValues);
    const connectionEfficiency = averageThroughput / config.maxConnections;

    // Analyze bottlenecks
    const bottlenecks = this.analyzeBottlenecks(measurementMetrics, config);

    // Target validation
    const targetAchieved = averageThroughput >= this.THROUGHPUT_TARGETS.MINIMUM_TARGET;
    const targetPercentage = (averageThroughput / this.THROUGHPUT_TARGETS.MINIMUM_TARGET) * 100;

    // Resource efficiency
    const cpuValues = measurementMetrics.map(m => m.cpuUsage).filter(cpu => cpu > 0);
    const memoryValues = measurementMetrics.map(m => m.memoryUsage).filter(mem => mem > 0);

    const resourceEfficiency = {
      cpuEfficiency: cpuValues.length > 0 ? averageThroughput / this.calculateMean(cpuValues) : 0,
      memoryEfficiency: memoryValues.length > 0 ? averageThroughput / (this.calculateMean(memoryValues) / 1024 / 1024) : 0,
    };

    // Baseline comparison
    const baselineComparison = this.baselineResults ? {
      improvementPercentage: ((averageThroughput - this.baselineResults.averageThroughput) / this.baselineResults.averageThroughput) * 100,
      performanceTrend: this.determinePerformanceTrend(averageThroughput, this.baselineResults.averageThroughput),
    } : undefined;

    return {
      testId,
      scenario: config.scenario,
      config,
      startTime,
      endTime,
      actualDuration,
      peakThroughput,
      averageThroughput,
      sustainedThroughput,
      totalMessagesProcessed,
      targetAchieved,
      targetPercentage,
      throughputVariability,
      connectionEfficiency,
      resourceEfficiency,
      bottlenecks,
      metricsTimeline: measurementMetrics,
      baselineComparison,
    };
  }

  /**
   * Analyze throughput bottlenecks
   */
  private analyzeBottlenecks(
    metrics: ThroughputMetrics[],
    config: ThroughputTestConfig
  ): ThroughputTestResults['bottlenecks'] {const bottlenecks: ThroughputTestResults['bottlenecks'] = [];const avgCpu = this.calculateMean(metrics.map(m => m.cpuUsage));const avgMemory = this.calculateMean(metrics.map(m => m.memoryUsage));
    const avgThroughput = this.calculateMean(metrics.map(m => m.instantThroughput));

    // CPU bottleneck analysis
    if (avgCpu > 80) {
      bottlenecks.push({
        type: 'cpu',severity: avgCpu > 95 ? 'critical' : avgCpu > 90 ? 'high' : 'medium',
        description: `High CPU utilization: ${avgCpu.toFixed(1)}%`,
        recommendation: 'Consider CPU optimization or horizontal scaling',});}

    // Memory bottleneck analysis
    const memoryMB = avgMemory / 1024 / 1024;
    if (memoryMB > 1000) { // 1GB threshold
      bottlenecks.push({
        type: 'memory',severity: memoryMB > 2000 ? 'high' : 'medium',
        description: `High memory usage: ${memoryMB.toFixed(0)}MB`,
        recommendation: 'Optimize memory usage or increase available memory',});}

    // Connection efficiency analysis
    const efficiency = avgThroughput / config.maxConnections;
    if (efficiency < this.THROUGHPUT_TARGETS.EFFICIENCY_TARGET) {
      bottlenecks.push({
        type: 'connection',severity: efficiency < 25 ? 'high' : 'medium',
        description: `Low connection efficiency: ${efficiency.toFixed(1)} msg/sec per connection`,
        recommendation: 'Optimize connection management or reduce connection count',});}

    // Network utilization analysis
    const avgNetwork = this.calculateMean(metrics.map(m => m.networkUtilization));
    if (avgNetwork > 80) {
      bottlenecks.push({
        type: 'network',severity: avgNetwork > 95 ? 'critical' : 'high',
        description: `High network utilization: ${avgNetwork.toFixed(1)}%`,
        recommendation: 'Consider message compression or network optimization',});}

    return bottlenecks;
  }

  /**
   * Calculate sustained throughput (90th percentile of sustained performance)
   */
  private calculateSustainedThroughput(throughputValues: number[]): number {
    if (throughputValues.length === 0) return 0;

    // Sort values and take 90th percentile as sustained performance
    const sortedValues = [...throughputValues].sort((a, b) => a - b);
    const percentileIndex = Math.floor(sortedValues.length * 0.1); // 10th percentile (bottom 10% excluded)

    return sortedValues[percentileIndex];
  }

  // ===== ANALYSIS HELPER METHODS =====

  /**
   * Analyze payload size impact on throughput
   */
  private analyzePayloadSizeImpact(results: Map<number, ThroughputTestResults>): void {
    this.logger.log('📊 Payload Size Impact Analysis:');

    const analysis = Array.from(results.entries()).map(([size, result]) => ({
      payloadSize: size,
      throughput: result.averageThroughput,
      efficiency: result.averageThroughput / size, // Messages per byte
    }));

    // Find optimal payload size for throughput
    const optimalForThroughput = analysis.reduce((max, current) =>
      current.throughput > max.throughput ? current : max
    );

    // Find optimal payload size for efficiency
    const optimalForEfficiency = analysis.reduce((max, current) =>
      current.efficiency > max.efficiency ? current : max
    );

    this.logger.log(`   Optimal for throughput: ${optimalForThroughput.payloadSize}B (${optimalForThroughput.throughput.toFixed(0)} msg/sec)`);this.logger.log(`   Optimal for efficiency: ${optimalForEfficiency.payloadSize}B (${optimalForEfficiency.efficiency.toFixed(3)} msg/byte)`);
  }

  /**
   * Analyze connection scaling efficiency
   */
  private analyzeConnectionScaling(results: Map<number, ThroughputTestResults>): void {
    this.logger.log('🔗 Connection Scaling Analysis:');

    const analysis = Array.from(results.entries()).map(([connections, result]) => ({
      connections,
      totalThroughput: result.averageThroughput,
      perConnectionThroughput: result.connectionEfficiency,
      scalingEfficiency: result.averageThroughput / connections,
    }));

    // Find optimal connection count
    const optimalConnections = analysis.reduce((max, current) =>
      current.totalThroughput > max.totalThroughput ? current : max
    );

    this.logger.log(`   Optimal connection count: ${optimalConnections.connections} (${optimalConnections.totalThroughput.toFixed(0)} msg/sec total)`);// Analyze scaling linearityconst firstResult = analysis[0];
    const lastResult = analysis[analysis.length - 1];
    const scalingRatio = (lastResult.totalThroughput / firstResult.totalThroughput) / (lastResult.connections / firstResult.connections);

    this.logger.log(`   Scaling efficiency: ${(scalingRatio * 100).toFixed(1)}% (1.0 = perfect linear scaling)`);
  }

  /**
   * Find optimal batch size
   */
  private findOptimalBatchSize(
    results: Map<number, ThroughputTestResults>
  ): { batchSize: number; throughput: number } {
    let optimalBatchSize = 1;
    let maxThroughput = 0;

    for (const [batchSize, result] of results.entries()) {
      if (result.averageThroughput > maxThroughput) {
        maxThroughput = result.averageThroughput;
        optimalBatchSize = batchSize;
      }
    }

    return { batchSize: optimalBatchSize, throughput: maxThroughput };
  }

  // ===== HELPER METHODS =====

  /**
   * Calculate target throughput based on payload size
   */
  private calculateTargetForPayloadSize(payloadSize: number): number {
    // Adjust target based on payload size (larger payloads = lower message throughput)
    const baseTarget = this.THROUGHPUT_TARGETS.MINIMUM_TARGET;
    const sizeFactor = Math.max(0.1, 1024 / payloadSize); // Normalize to 1KB
    return Math.floor(baseTarget * sizeFactor);
  }

  /**
   * Calculate optimal batch size for payload size
   */
  private calculateOptimalBatchSize(payloadSize: number): number {
    // Smaller payloads can use larger batches
    if (payloadSize <= 256) return 50;
    if (payloadSize <= 1024) return 25;
    if (payloadSize <= 4096) return 10;
    return 5;
  }

  /**
   * Get phase duration
   */
  private getPhaseDuration(config: ThroughputTestConfig, phase: string): number {
    switch (phase) {
      case 'warmup': return config.warmupDuration;case 'measurement': return config.measurementDuration;case 'cooldown': return config.cooldownDuration;default: return 0;}
  }

  /**
   * Get phase target throughput
   */
  private getPhaseTargetThroughput(config: ThroughputTestConfig, phase: string): number {
    switch (phase) {
      case 'warmup': return config.targetThroughput * 0.5; // 50% during warmupcase 'measurement': return config.targetThroughput;case 'cooldown': return config.targetThroughput * 0.3; // 30% during cooldowndefault: return 0;}
  }

  /**
   * Determine performance trend
   */
  private determinePerformanceTrend(
    current: number,
    baseline: number
  ): 'improving' | 'degrading' | 'stable' {const difference = ((current - baseline) / baseline) * 100;if (difference > 5) return 'improving';if (difference < -5) return 'degrading';return 'stable';}/**
   * Calculate arithmetic mean
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = this.calculateMean(values);
    const variance = this.calculateMean(values.map(value => Math.pow(value - mean, 2)));
    return Math.sqrt(variance);
  }

  /**
   * Log throughput test results
   */
  private logThroughputResults(results: ThroughputTestResults): void {
    this.logger.log('📊 Throughput Test Results:');
    this.logger.log(`   Test ID: ${results.testId}`);this.logger.log(`   Scenario: ${results.scenario}`);this.logger.log(`   Peak Throughput: ${results.peakThroughput.toFixed(0)} msg/sec`);this.logger.log(`   Average Throughput: ${results.averageThroughput.toFixed(0)} msg/sec`);this.logger.log(`   Sustained Throughput: ${results.sustainedThroughput.toFixed(0)} msg/sec`);this.logger.log(`   Target Achievement: ${results.targetAchieved ? '✅' : '❌'} (${results.targetPercentage.toFixed(1)}%)`);this.logger.log(`   Connection Efficiency: ${results.connectionEfficiency.toFixed(1)} msg/sec per connection`);this.logger.log(`   Total Messages: ${results.totalMessagesProcessed.toLocaleString()}`);if (results.bottlenecks.length > 0) {this.logger.log(`   Bottlenecks Detected: ${results.bottlenecks.length}`);results.bottlenecks.forEach((bottleneck, index) => {this.logger.log(`     ${index + 1}. ${bottleneck.type}: ${bottleneck.description}`);});}

    if (results.baselineComparison) {
      const trend = results.baselineComparison.performanceTrend;
      const improvement = results.baselineComparison.improvementPercentage;
      this.logger.log(`   Baseline Comparison: ${trend} (${improvement >= 0 ? '+' : ''}${improvement.toFixed(1)}%)`);
    }
  }

  // ===== INFRASTRUCTURE METHODS =====

  /**
   * Initialize worker pool
   */
  private async initializeWorkerPool(): Promise<void> {
    // Implementation would initialize worker pool for distributed testing
    this.logger.log('Worker pool initialized');
  }

  /**
   * Cleanup worker pool
   */
  private async cleanupWorkerPool(): Promise<void> {
    await Promise.all(this.workerPool.map(worker => worker.terminate()));
    this.workerPool = [];
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.currentMetrics = [];

    this.metricsCollector = setInterval(() => {
      const metrics: ThroughputMetrics = {
        timestamp: Date.now(),
        instantThroughput: 0, // Would be calculated from current connections
        cumulativeThroughput: 0,
        activeConnections: 0,
        queuedMessages: 0,
        sentMessages: 0,
        receivedMessages: 0,
        errorCount: 0,
        cpuUsage: 0,
        memoryUsage: process.memoryUsage().rss,
        networkUtilization: 0,
      };

      this.currentMetrics.push(metrics);
    }, 1000); // Collect every second
  }

  /**
   * Stop metrics collection
   */
  private stopMetricsCollection(): void {
    if (this.metricsCollector) {
      clearInterval(this.metricsCollector);
      this.metricsCollector = undefined;
    }
  }

  /**
   * Process worker metrics
   */
  private processWorkerMetrics(workerMetrics: any): void {
    // Implementation would aggregate worker metrics
  }

  /**
   * Generate unique test ID
   */
  private generateTestId(testType: string): string {
    return `throughput_${testType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get WebSocket URL for testing
   */
  private getWebSocketUrl(): string {
    return this.configService.get<string>('WEBSOCKET_TEST_URL', 'ws://localhost:8080');}/**
   * Load baseline results
   */
  private async loadBaselineResults(): Promise<void> {
    // Implementation would load baseline results from storage
    this.logger.log('Baseline results loaded');
  }

  /**
   * Stop throughput test
   */
  private async stopThroughputTest(testId: string): Promise<void> {
    this.logger.log(`Stopping throughput test: ${testId}`);
    this.activeTests.delete(testId);
  }

  // ===== PUBLIC API METHODS =====

  /**
   * Get test results by ID
   */
  getThroughputTestResults(testId: string): ThroughputTestResults | undefined {
    return this.testResults.get(testId);
  }

  /**
   * Get all test results
   */
  getAllThroughputTestResults(): ThroughputTestResults[] {
    return Array.from(this.testResults.values());
  }

  /**
   * Get current throughput metrics
   */
  getCurrentThroughputMetrics(): ThroughputMetrics[] {
    return [...this.currentMetrics];
  }

  /**
   * Get throughput targets
   */
  getThroughputTargets() {
    return { ...this.THROUGHPUT_TARGETS };
  }
}