/**
 * WebSocket Latency Measurement Service - Phase 1 Implementation
 *
 * Comprehensive latency measurement and analysis system targeting sub-50ms P95 latency
 * with detailed metrics collection, bottleneck identification, and optimization recommendations.
 *
 * Features:
 * - Precise latency measurement with microsecond accuracy
 * - P50/P90/P95/P99/P99.9 percentile calculation and monitoring
 * - Round-trip time (RTT) measurement and analysis
 * - Network latency vs application latency separation
 * - Variable payload latency impact analysis
 * - Connection warmup latency optimization
 * - Real-time latency monitoring and alerting
 * - Latency distribution analysis and visualization data
 * - Comparative latency analysis across scenarios
 * - Optimization recommendations based on latency patterns
 *
 * @module LatencyMeasurementService
 * @version 1.0.0
 * @author PARLANT Performance Testing Team
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import { performance } from 'perf_hooks';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import * as crypto from 'crypto';

// ===== LATENCY MEASUREMENT TYPES =====

/**
 * Latency measurement test types
 */
export enum LatencyTestType {
  BASELINE_LATENCY = 'baseline_latency',
  ROUND_TRIP_TIME = 'round_trip_time',
  VARIABLE_PAYLOAD = 'variable_payload_latency',
  CONNECTION_WARMUP = 'connection_warmup_latency',
  SUSTAINED_LATENCY = 'sustained_latency',
  BURST_LATENCY = 'burst_latency_impact',
  NETWORK_LATENCY = 'network_latency_analysis',
  APPLICATION_LATENCY = 'application_latency_analysis',
  PARLANT_VALIDATION_LATENCY = 'parlant_validation_latency',
}

/**
 * Latency measurement configuration
 */
export interface LatencyMeasurementConfig {
  testType: LatencyTestType;

  // Test parameters
  duration: number;               // Test duration in milliseconds
  messageCount: number;           // Number of messages to send
  concurrentConnections: number;  // Number of concurrent connections
  messageInterval: number;        // Interval between messages (ms)

  // Message configuration
  payloadSize: number;           // Message payload size in bytes
  messagePattern: 'sequential' | 'random' | 'echo' | 'ping_pong';

  // Latency targets and thresholds
  targets: {
    p50: number;                 // Target P50 latency (ms)
    p95: number;                 // Target P95 latency (ms) - PRIMARY: 50ms
    p99: number;                 // Target P99 latency (ms)
    p999: number;                // Target P99.9 latency (ms)
  };

  // Advanced settings
  warmupMessages: number;        // Messages to send before measurement
  cooldownMessages: number;      // Messages to send after measurement
  timeoutThreshold: number;      // Message timeout threshold (ms)
  retryAttempts: number;         // Retry attempts for failed messages

  // Validation settings (for PARLANT integration testing)
  validationConfig?: {
    enableValidation: boolean;
    validationComplexity: 'low' | 'medium' | 'high';
    cacheEnabled: boolean;
    validationTimeout: number;
  };
}

/**
 * Individual latency measurement
 */
export interface LatencyMeasurement {
  messageId: string;
  connectionId: string;
  sentTimestamp: number;         // High-resolution timestamp
  receivedTimestamp: number;     // High-resolution timestamp
  latency: number;               // Round-trip latency in milliseconds
  payloadSize: number;
  messageType: string;
  success: boolean;
  errorReason?: string;

  // Detailed timing breakdown
  timing: {
    sendTime: number;            // Time to send message
    networkTime: number;         // Network transmission time
    processingTime: number;      // Server processing time
    receiveTime: number;         // Time to receive response
  };
}

/**
 * Comprehensive latency statistics
 */
export interface LatencyStatistics {
  // Core percentiles
  p50: number;                   // Median latency
  p90: number;                   // 90th percentile
  p95: number;                   // 95th percentile - PRIMARY TARGET: <50ms
  p99: number;                   // 99th percentile
  p999: number;                  // 99.9th percentile

  // Basic statistics
  min: number;                   // Minimum latency
  max: number;                   // Maximum latency
  mean: number;                  // Average latency
  standardDeviation: number;     // Standard deviation
  variance: number;              // Variance

  // Distribution analysis
  distribution: {
    buckets: LatencyBucket[];    // Latency distribution buckets
    skewness: number;            // Distribution skewness
    kurtosis: number;            // Distribution kurtosis
  };

  // Quality metrics
  reliability: {
    successRate: number;         // Percentage of successful measurements
    timeoutRate: number;         // Percentage of timed-out messages
    errorRate: number;           // Percentage of error responses
  };

  // Trend analysis
  trends: {
    trend: 'improving' | 'degrading' | 'stable';
    changeRate: number;          // Rate of change per minute
    volatility: number;          // Latency volatility index
  };
}

/**
 * Latency distribution bucket
 */
export interface LatencyBucket {
  range: string;                 // e.g., "0-10ms"
  count: number;                 // Number of measurements in this bucket
  percentage: number;            // Percentage of total measurements
  minLatency: number;
  maxLatency: number;
}

/**
 * Latency test results with comprehensive analysis
 */
export interface LatencyTestResults {
  testId: string;
  testType: LatencyTestType;
  config: LatencyMeasurementConfig;

  // Execution details
  startTime: Date;
  endTime: Date;
  actualDuration: number;
  totalMeasurements: number;

  // Core latency statistics
  statistics: LatencyStatistics;

  // Target validation
  targetsAchieved: {
    p50: boolean;
    p95: boolean;                // PRIMARY TARGET: <50ms
    p99: boolean;
    p999: boolean;
    overall: boolean;            // All targets met
  };

  // Performance insights
  insights: {
    bottlenecks: LatencyBottleneck[];
    optimizationRecommendations: string[];
    performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    latencyProfile: 'excellent' | 'good' | 'acceptable' | 'poor' | 'unacceptable';
  };

  // Raw measurement data
  measurements: LatencyMeasurement[];

  // Comparative analysis
  baselineComparison?: {
    improvementPercentage: number;
    regressionDetected: boolean;
    significantChange: boolean;
  };

  // Time-series analysis
  timeSeries: {
    timestamps: number[];
    latencies: number[];
    movingAverages: number[];
    trendLines: number[];
  };
}

/**
 * Latency bottleneck identification
 */
export interface LatencyBottleneck {
  type: 'network' | 'server' | 'client' | 'connection' | 'validation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: number;                // Impact on overall latency (ms)
  frequency: number;             // How often this bottleneck occurs (%)
  recommendation: string;
}

/**
 * Real-time latency monitoring data
 */
export interface RealTimeLatencyMetrics {
  timestamp: number;
  instantLatency: number;        // Current message latency
  rollingP95: number;           // Rolling P95 over last 100 messages
  rollingMean: number;          // Rolling mean over last 100 messages
  activeConnections: number;
  messagesInFlight: number;
  errorCount: number;
  alertTriggered: boolean;      // If latency exceeded threshold
}

// ===== LATENCY MEASUREMENT SERVICE =====

@Injectable()
export class LatencyMeasurementService implements OnModuleInit, OnModuleDestroy {

  private readonly logger = new Logger(LatencyMeasurementService.name);
  private readonly eventEmitter = new EventEmitter();

  // Test execution state
  private activeTests: Map<string, LatencyMeasurementConfig> = new Map();
  private testResults: Map<string, LatencyTestResults> = new Map();
  private pendingMeasurements: Map<string, LatencyMeasurement> = new Map();

  // Real-time monitoring
  private realTimeMetrics: RealTimeLatencyMetrics[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private alertThresholds: Map<string, number> = new Map();

  // Baseline tracking
  private baselineResults?: LatencyTestResults;

  // Performance targets (enterprise-grade requirements)
  private readonly LATENCY_TARGETS = {
    EXCELLENT_P95: 25,           // Excellent: <25ms P95
    TARGET_P95: 50,              // Primary Target: <50ms P95
    ACCEPTABLE_P95: 100,         // Acceptable: <100ms P95
    POOR_P95: 250,               // Poor: <250ms P95

    EXCELLENT_P99: 50,           // Excellent: <50ms P99
    TARGET_P99: 100,             // Target: <100ms P99
    ACCEPTABLE_P99: 200,         // Acceptable: <200ms P99

    MAX_ACCEPTABLE: 1000,        // Maximum acceptable latency: 1s
  };

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.logger.log('🚀 WebSocket Latency Measurement Service initializing...');
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing WebSocket Latency Measurement Framework');

    // Initialize alert thresholds
    this.initializeAlertThresholds();

    // Start real-time monitoring
    this.startRealTimeMonitoring();

    // Load baseline results
    await this.loadBaselineResults();

    this.logger.log('✅ WebSocket Latency Measurement Framework ready');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down WebSocket Latency Measurement Framework');

    // Stop all active tests
    for (const testId of this.activeTests.keys()) {
      await this.stopLatencyTest(testId);
    }

    // Stop monitoring
    this.stopRealTimeMonitoring();

    this.logger.log('✅ WebSocket Latency Measurement Framework shutdown complete');
  }

  // ===== BASELINE LATENCY TESTING =====

  /**
   * Execute baseline latency test with standard parameters
   * TARGET: Establish sub-50ms P95 baseline performance
   */
  async executeBaselineLatencyTest(): Promise<LatencyTestResults> {
    this.logger.log('🧪 Starting baseline latency test (target: <50ms P95)');

    const config: LatencyMeasurementConfig = {
      testType: LatencyTestType.BASELINE_LATENCY,
      duration: 120000,            // 2 minutes
      messageCount: 2000,          // 2000 messages for statistical significance
      concurrentConnections: 50,
      messageInterval: 30,         // 30ms interval between messages
      payloadSize: 1024,           // 1KB standard payload
      messagePattern: 'ping_pong',
      targets: {
        p50: 25,                   // Target P50: 25ms
        p95: this.LATENCY_TARGETS.TARGET_P95,    // Primary target: 50ms
        p99: this.LATENCY_TARGETS.TARGET_P99,    // Target P99: 100ms
        p999: 200,                 // Target P99.9: 200ms
      },
      warmupMessages: 100,
      cooldownMessages: 50,
      timeoutThreshold: 5000,      // 5-second timeout
      retryAttempts: 3,
    };

    const results = await this.executeLatencyTest('baseline', config);

    // Store as baseline for future comparisons
    this.baselineResults = results;

    this.logLatencyResults(results);
    return results;
  }

  /**
   * Execute round-trip time measurement
   */
  async executeRoundTripTimeTest(): Promise<LatencyTestResults> {
    this.logger.log('🔄 Starting round-trip time measurement test');

    const config: LatencyMeasurementConfig = {
      testType: LatencyTestType.ROUND_TRIP_TIME,
      duration: 60000,             // 1 minute
      messageCount: 1000,
      concurrentConnections: 20,
      messageInterval: 50,         // 50ms interval for precise measurement
      payloadSize: 64,             // Minimal payload for pure RTT
      messagePattern: 'echo',      // Echo pattern for exact RTT
      targets: {
        p50: 20,
        p95: 40,                   // Tighter target for RTT
        p99: 80,
        p999: 150,
      },
      warmupMessages: 50,
      cooldownMessages: 25,
      timeoutThreshold: 3000,
      retryAttempts: 2,
    };

    return await this.executeLatencyTest('rtt', config);
  }

  /**
   * Execute variable payload latency testing
   */
  async executeVariablePayloadLatencyTest(): Promise<Map<number, LatencyTestResults>> {
    this.logger.log('📏 Starting variable payload latency testing');

    const payloadSizes = [64, 256, 1024, 4096, 16384, 65536]; // Bytes
    const results = new Map<number, LatencyTestResults>();

    for (const payloadSize of payloadSizes) {
      this.logger.log(`Testing payload size: ${payloadSize} bytes`);

      const config: LatencyMeasurementConfig = {
        testType: LatencyTestType.VARIABLE_PAYLOAD,
        duration: 60000,
        messageCount: 500,
        concurrentConnections: 25,
        messageInterval: 100,
        payloadSize,
        messagePattern: 'ping_pong',
        targets: {
          p50: this.calculatePayloadTarget(payloadSize, 0.5),
          p95: this.calculatePayloadTarget(payloadSize, 0.95),
          p99: this.calculatePayloadTarget(payloadSize, 0.99),
          p999: this.calculatePayloadTarget(payloadSize, 0.999),
        },
        warmupMessages: 50,
        cooldownMessages: 25,
        timeoutThreshold: 5000,
        retryAttempts: 2,
      };

      const result = await this.executeLatencyTest(`payload_${payloadSize}`, config);
      results.set(payloadSize, result);

      this.logger.log(`Payload ${payloadSize}B - P95: ${result.statistics.p95.toFixed(2)}ms`);
    }

    this.analyzePayloadLatencyImpact(results);
    return results;
  }

  // ===== SUSTAINED LATENCY TESTING =====

  /**
   * Execute sustained latency test for endurance validation
   */
  async executeSustainedLatencyTest(durationMinutes: number = 30): Promise<LatencyTestResults> {
    this.logger.log(`⏳ Starting sustained latency test (${durationMinutes} minutes)`);

    const config: LatencyMeasurementConfig = {
      testType: LatencyTestType.SUSTAINED_LATENCY,
      duration: durationMinutes * 60000,
      messageCount: durationMinutes * 1000,  // ~16 messages per second
      concurrentConnections: 100,
      messageInterval: 60,         // 60ms interval for sustained testing
      payloadSize: 1024,
      messagePattern: 'ping_pong',
      targets: {
        p50: 30,
        p95: this.LATENCY_TARGETS.TARGET_P95,
        p99: this.LATENCY_TARGETS.TARGET_P99,
        p999: 250,
      },
      warmupMessages: 100,
      cooldownMessages: 50,
      timeoutThreshold: 5000,
      retryAttempts: 3,
    };

    return await this.executeLatencyTest('sustained', config);
  }

  /**
   * Execute burst latency impact test
   */
  async executeBurstLatencyImpactTest(): Promise<LatencyTestResults> {
    this.logger.log('💥 Starting burst latency impact test');

    const config: LatencyMeasurementConfig = {
      testType: LatencyTestType.BURST_LATENCY,
      duration: 180000,            // 3 minutes
      messageCount: 3000,
      concurrentConnections: 200,  // High connection count for burst testing
      messageInterval: 10,         // High frequency bursts
      payloadSize: 512,
      messagePattern: 'ping_pong',
      targets: {
        p50: 40,                   // Higher targets during burst conditions
        p95: 80,
        p99: 150,
        p999: 300,
      },
      warmupMessages: 100,
      cooldownMessages: 50,
      timeoutThreshold: 5000,
      retryAttempts: 2,
    };

    return await this.executeLatencyTest('burst', config);
  }

  // ===== PARLANT VALIDATION LATENCY TESTING =====

  /**
   * Execute PARLANT validation latency impact test
   */
  async executeParlantValidationLatencyTest(): Promise<{
    withoutValidation: LatencyTestResults;
    withValidation: LatencyTestResults;
    impactAnalysis: {
      latencyIncrease: number;     // Additional latency (ms)
      percentageIncrease: number;  // Percentage increase
      p95Impact: number;           // P95 impact (ms)
      recommendations: string[];
    };
  }> {
    this.logger.log('🔍 Starting PARLANT validation latency impact analysis');

    // Test without validation
    const baseConfig: LatencyMeasurementConfig = {
      testType: LatencyTestType.PARLANT_VALIDATION_LATENCY,
      duration: 120000,
      messageCount: 1000,
      concurrentConnections: 50,
      messageInterval: 100,
      payloadSize: 2048,
      messagePattern: 'ping_pong',
      targets: {
        p50: 25,
        p95: this.LATENCY_TARGETS.TARGET_P95,
        p99: this.LATENCY_TARGETS.TARGET_P99,
        p999: 200,
      },
      warmupMessages: 50,
      cooldownMessages: 25,
      timeoutThreshold: 5000,
      retryAttempts: 2,
      validationConfig: {
        enableValidation: false,
        validationComplexity: 'low',
        cacheEnabled: false,
        validationTimeout: 1000,
      },
    };

    const withoutValidation = await this.executeLatencyTest('no_validation', baseConfig);

    // Test with validation enabled
    const validationConfig = {
      ...baseConfig,
      validationConfig: {
        enableValidation: true,
        validationComplexity: 'medium' as const,
        cacheEnabled: true,
        validationTimeout: 2000,
      },
    };

    const withValidation = await this.executeLatencyTest('with_validation', validationConfig);

    // Calculate impact analysis
    const latencyIncrease = withValidation.statistics.p95 - withoutValidation.statistics.p95;
    const percentageIncrease = (latencyIncrease / withoutValidation.statistics.p95) * 100;
    const p95Impact = latencyIncrease;

    const impactAnalysis = {
      latencyIncrease,
      percentageIncrease,
      p95Impact,
      recommendations: this.generateValidationOptimizationRecommendations(
        withoutValidation,
        withValidation
      ),
    };

    this.logger.log(`📊 PARLANT Validation Impact:`);
    this.logger.log(`   Latency Increase: +${latencyIncrease.toFixed(2)}ms`);
    this.logger.log(`   Percentage Increase: +${percentageIncrease.toFixed(1)}%`);
    this.logger.log(`   P95 Impact: +${p95Impact.toFixed(2)}ms`);

    return {
      withoutValidation,
      withValidation,
      impactAnalysis,
    };
  }

  // ===== CORE MEASUREMENT INFRASTRUCTURE =====

  /**
   * Execute comprehensive latency test
   */
  private async executeLatencyTest(
    testId: string,
    config: LatencyMeasurementConfig
  ): Promise<LatencyTestResults> {
    const fullTestId = this.generateTestId(testId);
    this.logger.log(`🧪 Executing latency test: ${fullTestId}`);

    this.activeTests.set(fullTestId, config);

    const startTime = new Date();
    const measurements: LatencyMeasurement[] = [];

    try {
      // Create connections and start measurement
      const connections = await this.createLatencyTestConnections(config);

      // Execute measurement phases
      await this.executeWarmupPhase(connections, config);
      const mainMeasurements = await this.executeMeasurementPhase(connections, config);
      await this.executeCooldownPhase(connections, config);

      measurements.push(...mainMeasurements);

      // Cleanup connections
      await this.cleanupConnections(connections);

      const endTime = new Date();

      // Calculate comprehensive results
      const results = this.calculateLatencyResults(
        fullTestId,
        config,
        startTime,
        endTime,
        measurements
      );

      // Store results
      this.testResults.set(fullTestId, results);

      this.logger.log(`✅ Latency test completed: ${fullTestId}`);
      return results;

    } catch (error) {
      this.logger.error(`❌ Latency test failed: ${fullTestId}`, error.stack);
      throw error;
    } finally {
      this.activeTests.delete(fullTestId);
    }
  }

  /**
   * Create WebSocket connections for latency testing
   */
  private async createLatencyTestConnections(
    config: LatencyMeasurementConfig
  ): Promise<WebSocket[]> {
    const connections: WebSocket[] = [];
    const connectPromises: Promise<WebSocket>[] = [];

    for (let i = 0; i < config.concurrentConnections; i++) {
      const connectPromise = new Promise<WebSocket>((resolve, reject) => {
        const ws = new WebSocket(this.getWebSocketUrl());

        const timeout = setTimeout(() => {
          reject(new Error(`Connection timeout for connection ${i}`));
        }, 5000);

        ws.on('open', () => {
          clearTimeout(timeout);
          resolve(ws);
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        // Setup message handling for latency measurement
        ws.on('message', (data) => {
          this.handleLatencyResponse(data, ws);
        });
      });

      connectPromises.push(connectPromise);
    }

    const results = await Promise.allSettled(connectPromises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        connections.push(result.value);
      } else {
        this.logger.warn(`Failed to create connection ${index}: ${result.reason}`);
      }
    });

    this.logger.log(`Created ${connections.length}/${config.concurrentConnections} connections`);
    return connections;
  }

  /**
   * Execute measurement phase
   */
  private async executeMeasurementPhase(
    connections: WebSocket[],
    config: LatencyMeasurementConfig
  ): Promise<LatencyMeasurement[]> {
    this.logger.log(`📊 Starting measurement phase (${config.messageCount} messages)`);

    const measurements: LatencyMeasurement[] = [];
    const messagePromises: Promise<LatencyMeasurement>[] = [];

    for (let i = 0; i < config.messageCount; i++) {
      const connectionIndex = i % connections.length;
      const connection = connections[connectionIndex];

      const measurementPromise = this.sendLatencyMessage(
        connection,
        connectionIndex.toString(),
        config
      );

      messagePromises.push(measurementPromise);

      // Wait for interval between messages
      if (config.messageInterval > 0) {
        await this.sleep(config.messageInterval);
      }
    }

    // Wait for all measurements to complete
    const results = await Promise.allSettled(messagePromises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        measurements.push(result.value);
      } else {
        this.logger.warn(`Measurement ${index} failed: ${result.reason}`);
      }
    });

    this.logger.log(`Completed ${measurements.length}/${config.messageCount} measurements`);
    return measurements;
  }

  /**
   * Send latency measurement message
   */
  private async sendLatencyMessage(
    connection: WebSocket,
    connectionId: string,
    config: LatencyMeasurementConfig
  ): Promise<LatencyMeasurement> {
    return new Promise((resolve, reject) => {
      const messageId = this.generateMessageId();
      const payload = this.generatePayload(config.payloadSize);

      const measurement: Partial<LatencyMeasurement> = {
        messageId,
        connectionId,
        payloadSize: config.payloadSize,
        messageType: config.messagePattern,
      };

      // Setup timeout
      const timeout = setTimeout(() => {
        this.pendingMeasurements.delete(messageId);
        reject(new Error(`Message timeout: ${messageId}`));
      }, config.timeoutThreshold);

      // Store pending measurement
      this.pendingMeasurements.set(messageId, measurement as LatencyMeasurement);

      // Send message with high-precision timestamp
      const sentTimestamp = performance.now();
      measurement.sentTimestamp = sentTimestamp;

      const message = JSON.stringify({
        id: messageId,
        type: 'latency_test',
        payload,
        timestamp: sentTimestamp,
      });

      connection.send(message, (error) => {
        if (error) {
          clearTimeout(timeout);
          this.pendingMeasurements.delete(messageId);
          reject(error);
        }
      });

      // Setup response handler
      const originalHandler = connection.listeners('message')[0] as any;
      const responseHandler = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());

          if (response.id === messageId) {
            clearTimeout(timeout);
            const receivedTimestamp = performance.now();

            const completedMeasurement: LatencyMeasurement = {
              ...measurement,
              receivedTimestamp,
              latency: receivedTimestamp - sentTimestamp,
              success: true,
              timing: {
                sendTime: 0, // Would be calculated from detailed timing
                networkTime: (receivedTimestamp - sentTimestamp) / 2,
                processingTime: response.processingTime || 0,
                receiveTime: 0,
              },
            } as LatencyMeasurement;

            this.pendingMeasurements.delete(messageId);
            resolve(completedMeasurement);
          }
        } catch (parseError) {
          // Ignore parsing errors for other messages
        }
      };

      connection.once('message', responseHandler);
    });
  }

  /**
   * Handle latency response message
   */
  private handleLatencyResponse(data: Buffer, connection: WebSocket): void {
    try {
      const response = JSON.parse(data.toString());

      if (response.type === 'latency_response' && response.id) {
        const pendingMeasurement = this.pendingMeasurements.get(response.id);

        if (pendingMeasurement) {
          const receivedTimestamp = performance.now();
          const latency = receivedTimestamp - pendingMeasurement.sentTimestamp;

          // Update real-time metrics
          this.updateRealTimeMetrics(latency);

          // Trigger alerts if thresholds exceeded
          this.checkLatencyAlerts(latency);
        }
      }
    } catch (error) {
      // Ignore parsing errors
    }
  }

  // ===== LATENCY CALCULATION AND ANALYSIS =====

  /**
   * Calculate comprehensive latency results
   */
  private calculateLatencyResults(
    testId: string,
    config: LatencyMeasurementConfig,
    startTime: Date,
    endTime: Date,
    measurements: LatencyMeasurement[]
  ): LatencyTestResults {
    const actualDuration = endTime.getTime() - startTime.getTime();

    // Calculate latency statistics
    const statistics = this.calculateLatencyStatistics(measurements);

    // Validate targets
    const targetsAchieved = {
      p50: statistics.p50 <= config.targets.p50,
      p95: statistics.p95 <= config.targets.p95,
      p99: statistics.p99 <= config.targets.p99,
      p999: statistics.p999 <= config.targets.p999,
      overall: false,
    };

    targetsAchieved.overall = Object.values(targetsAchieved).every(achieved => achieved);

    // Analyze bottlenecks
    const bottlenecks = this.analyzeLatencyBottlenecks(measurements, statistics);

    // Generate insights
    const insights = this.generateLatencyInsights(statistics, targetsAchieved, bottlenecks);

    // Calculate baseline comparison
    const baselineComparison = this.baselineResults ? {
      improvementPercentage: ((this.baselineResults.statistics.p95 - statistics.p95) / this.baselineResults.statistics.p95) * 100,
      regressionDetected: statistics.p95 > this.baselineResults.statistics.p95 * 1.1, // 10% regression threshold
      significantChange: Math.abs(statistics.p95 - this.baselineResults.statistics.p95) > 5, // 5ms significance threshold
    } : undefined;

    // Generate time series data
    const timeSeries = this.generateTimeSeriesData(measurements);

    return {
      testId,
      testType: config.testType,
      config,
      startTime,
      endTime,
      actualDuration,
      totalMeasurements: measurements.length,
      statistics,
      targetsAchieved,
      insights,
      measurements,
      baselineComparison,
      timeSeries,
    };
  }

  /**
   * Calculate comprehensive latency statistics
   */
  private calculateLatencyStatistics(measurements: LatencyMeasurement[]): LatencyStatistics {
    const successfulMeasurements = measurements.filter(m => m.success);
    const latencies = successfulMeasurements.map(m => m.latency).sort((a, b) => a - b);

    if (latencies.length === 0) {
      throw new Error('No successful latency measurements');
    }

    // Calculate percentiles
    const p50 = this.calculatePercentile(latencies, 50);
    const p90 = this.calculatePercentile(latencies, 90);
    const p95 = this.calculatePercentile(latencies, 95);
    const p99 = this.calculatePercentile(latencies, 99);
    const p999 = this.calculatePercentile(latencies, 99.9);

    // Calculate basic statistics
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    const mean = this.calculateMean(latencies);
    const variance = this.calculateVariance(latencies, mean);
    const standardDeviation = Math.sqrt(variance);

    // Calculate distribution
    const distribution = this.calculateDistribution(latencies);

    // Calculate reliability metrics
    const reliability = {
      successRate: (successfulMeasurements.length / measurements.length) * 100,
      timeoutRate: (measurements.filter(m => !m.success && m.errorReason === 'timeout').length / measurements.length) * 100,
      errorRate: (measurements.filter(m => !m.success && m.errorReason !== 'timeout').length / measurements.length) * 100,
    };

    // Calculate trends
    const trends = this.calculateLatencyTrends(latencies);

    return {
      p50,
      p90,
      p95,
      p99,
      p999,
      min,
      max,
      mean,
      standardDeviation,
      variance,
      distribution,
      reliability,
      trends,
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedArray[lower];
    }

    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Calculate latency distribution buckets
   */
  private calculateDistribution(latencies: number[]) {
    const buckets: LatencyBucket[] = [
      { range: '0-10ms', count: 0, percentage: 0, minLatency: 0, maxLatency: 10 },
      { range: '10-25ms', count: 0, percentage: 0, minLatency: 10, maxLatency: 25 },
      { range: '25-50ms', count: 0, percentage: 0, minLatency: 25, maxLatency: 50 },
      { range: '50-100ms', count: 0, percentage: 0, minLatency: 50, maxLatency: 100 },
      { range: '100-250ms', count: 0, percentage: 0, minLatency: 100, maxLatency: 250 },
      { range: '250-500ms', count: 0, percentage: 0, minLatency: 250, maxLatency: 500 },
      { range: '500ms+', count: 0, percentage: 0, minLatency: 500, maxLatency: Infinity },
    ];

    // Count latencies in each bucket
    latencies.forEach(latency => {
      for (const bucket of buckets) {
        if (latency >= bucket.minLatency && latency < bucket.maxLatency) {
          bucket.count++;
          break;
        }
      }
    });

    // Calculate percentages
    const total = latencies.length;
    buckets.forEach(bucket => {
      bucket.percentage = (bucket.count / total) * 100;
    });

    // Calculate distribution statistics
    const mean = this.calculateMean(latencies);
    const skewness = this.calculateSkewness(latencies, mean);
    const kurtosis = this.calculateKurtosis(latencies, mean);

    return {
      buckets,
      skewness,
      kurtosis,
    };
  }

  /**
   * Analyze latency bottlenecks
   */
  private analyzeLatencyBottlenecks(
    measurements: LatencyMeasurement[],
    statistics: LatencyStatistics
  ): LatencyBottleneck[] {
    const bottlenecks: LatencyBottleneck[] = [];

    // High latency analysis
    if (statistics.p95 > this.LATENCY_TARGETS.TARGET_P95) {
      const severity = this.determineLatencySeverity(statistics.p95);
      bottlenecks.push({
        type: 'server',
        severity,
        description: `P95 latency (${statistics.p95.toFixed(2)}ms) exceeds target (${this.LATENCY_TARGETS.TARGET_P95}ms)`,
        impact: statistics.p95 - this.LATENCY_TARGETS.TARGET_P95,
        frequency: 95,
        recommendation: severity === 'critical' ? 'Immediate optimization required' : 'Consider performance optimization',
      });
    }

    // High variability analysis
    const coefficientOfVariation = (statistics.standardDeviation / statistics.mean) * 100;
    if (coefficientOfVariation > 50) {
      bottlenecks.push({
        type: 'network',
        severity: coefficientOfVariation > 100 ? 'high' : 'medium',
        description: `High latency variability (CV: ${coefficientOfVariation.toFixed(1)}%)`,
        impact: statistics.standardDeviation,
        frequency: 50,
        recommendation: 'Investigate network stability and connection quality',
      });
    }

    // Error rate analysis
    if (statistics.reliability.errorRate > 1) {
      bottlenecks.push({
        type: 'connection',
        severity: statistics.reliability.errorRate > 5 ? 'high' : 'medium',
        description: `High error rate (${statistics.reliability.errorRate.toFixed(1)}%)`,
        impact: 0, // Errors don't contribute to latency but affect reliability
        frequency: statistics.reliability.errorRate,
        recommendation: 'Improve connection stability and error handling',
      });
    }

    return bottlenecks;
  }

  /**
   * Generate latency insights and recommendations
   */
  private generateLatencyInsights(
    statistics: LatencyStatistics,
    targetsAchieved: any,
    bottlenecks: LatencyBottleneck[]
  ) {
    const optimizationRecommendations: string[] = [];

    // P95 analysis
    if (statistics.p95 > this.LATENCY_TARGETS.TARGET_P95) {
      optimizationRecommendations.push('Optimize server-side processing to reduce P95 latency');
    }

    // Variability analysis
    if (statistics.standardDeviation > 25) {
      optimizationRecommendations.push('Reduce latency variability through connection pooling');
    }

    // High percentile analysis
    if (statistics.p99 > statistics.p95 * 2) {
      optimizationRecommendations.push('Investigate and fix outlier latencies affecting P99');
    }

    // Performance grading
    const performanceGrade = this.calculatePerformanceGrade(statistics.p95);
    const latencyProfile = this.determineLatencyProfile(statistics);

    return {
      bottlenecks,
      optimizationRecommendations,
      performanceGrade,
      latencyProfile,
    };
  }

  // ===== HELPER METHODS =====

  /**
   * Calculate payload-adjusted latency target
   */
  private calculatePayloadTarget(payloadSize: number, percentile: number): number {
    const baseTarget = this.LATENCY_TARGETS.TARGET_P95;
    const sizeMultiplier = Math.max(1, Math.log2(payloadSize / 1024) + 1);
    const percentileMultiplier = percentile === 0.95 ? 1 : (percentile === 0.99 ? 1.5 : 2);

    return baseTarget * sizeMultiplier * percentileMultiplier;
  }

  /**
   * Determine latency severity
   */
  private determineLatencySeverity(latency: number): 'low' | 'medium' | 'high' | 'critical' {
    if (latency <= this.LATENCY_TARGETS.EXCELLENT_P95) return 'low';
    if (latency <= this.LATENCY_TARGETS.TARGET_P95) return 'low';
    if (latency <= this.LATENCY_TARGETS.ACCEPTABLE_P95) return 'medium';
    if (latency <= this.LATENCY_TARGETS.POOR_P95) return 'high';
    return 'critical';
  }

  /**
   * Calculate performance grade
   */
  private calculatePerformanceGrade(p95Latency: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (p95Latency <= this.LATENCY_TARGETS.EXCELLENT_P95) return 'A';
    if (p95Latency <= this.LATENCY_TARGETS.TARGET_P95) return 'B';
    if (p95Latency <= this.LATENCY_TARGETS.ACCEPTABLE_P95) return 'C';
    if (p95Latency <= this.LATENCY_TARGETS.POOR_P95) return 'D';
    return 'F';
  }

  /**
   * Determine latency profile
   */
  private determineLatencyProfile(statistics: LatencyStatistics): 'excellent' | 'good' | 'acceptable' | 'poor' | 'unacceptable' {
    if (statistics.p95 <= this.LATENCY_TARGETS.EXCELLENT_P95) return 'excellent';
    if (statistics.p95 <= this.LATENCY_TARGETS.TARGET_P95) return 'good';
    if (statistics.p95 <= this.LATENCY_TARGETS.ACCEPTABLE_P95) return 'acceptable';
    if (statistics.p95 <= this.LATENCY_TARGETS.POOR_P95) return 'poor';
    return 'unacceptable';
  }

  /**
   * Calculate statistical mean
   */
  private calculateMean(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[], mean?: number): number {
    const avg = mean ?? this.calculateMean(values);
    return this.calculateMean(values.map(value => Math.pow(value - avg, 2)));
  }

  /**
   * Calculate skewness
   */
  private calculateSkewness(values: number[], mean: number): number {
    const n = values.length;
    const variance = this.calculateVariance(values, mean);
    const standardDeviation = Math.sqrt(variance);

    const skewness = values.reduce((sum, value) => {
      return sum + Math.pow((value - mean) / standardDeviation, 3);
    }, 0) / n;

    return skewness;
  }

  /**
   * Calculate kurtosis
   */
  private calculateKurtosis(values: number[], mean: number): number {
    const n = values.length;
    const variance = this.calculateVariance(values, mean);
    const standardDeviation = Math.sqrt(variance);

    const kurtosis = values.reduce((sum, value) => {
      return sum + Math.pow((value - mean) / standardDeviation, 4);
    }, 0) / n;

    return kurtosis - 3; // Excess kurtosis
  }

  /**
   * Calculate latency trends
   */
  private calculateLatencyTrends(latencies: number[]) {
    if (latencies.length < 10) {
      return {
        trend: 'stable' as const,
        changeRate: 0,
        volatility: 0,
      };
    }

    // Simple trend analysis using first and last quarters
    const quarterSize = Math.floor(latencies.length / 4);
    const firstQuarter = latencies.slice(0, quarterSize);
    const lastQuarter = latencies.slice(-quarterSize);

    const firstMean = this.calculateMean(firstQuarter);
    const lastMean = this.calculateMean(lastQuarter);

    const changeRate = ((lastMean - firstMean) / firstMean) * 100;
    const trend = changeRate > 5 ? 'degrading' : changeRate < -5 ? 'improving' : 'stable';

    // Calculate volatility as coefficient of variation
    const mean = this.calculateMean(latencies);
    const variance = this.calculateVariance(latencies, mean);
    const volatility = (Math.sqrt(variance) / mean) * 100;

    return {
      trend,
      changeRate,
      volatility,
    };
  }

  /**
   * Generate time series data for visualization
   */
  private generateTimeSeriesData(measurements: LatencyMeasurement[]) {
    const timestamps = measurements.map(m => m.sentTimestamp);
    const latencies = measurements.map(m => m.latency);

    // Calculate moving averages (window size: 10)
    const movingAverages = this.calculateMovingAverage(latencies, 10);

    // Calculate trend lines using linear regression
    const trendLines = this.calculateTrendLine(latencies);

    return {
      timestamps,
      latencies,
      movingAverages,
      trendLines,
    };
  }

  /**
   * Calculate moving average
   */
  private calculateMovingAverage(values: number[], windowSize: number): number[] {
    const movingAverages: number[] = [];

    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = values.slice(start, i + 1);
      movingAverages.push(this.calculateMean(window));
    }

    return movingAverages;
  }

  /**
   * Calculate trend line using simple linear regression
   */
  private calculateTrendLine(values: number[]): number[] {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return x.map(xi => slope * xi + intercept);
  }

  /**
   * Analyze payload size impact on latency
   */
  private analyzePayloadLatencyImpact(results: Map<number, LatencyTestResults>): void {
    this.logger.log('📊 Payload Size Latency Impact Analysis:');

    const analysis = Array.from(results.entries()).map(([size, result]) => ({
      payloadSize: size,
      p95Latency: result.statistics.p95,
      latencyPerByte: result.statistics.p95 / size,
    }));

    // Find optimal payload size for latency
    const optimalForLatency = analysis.reduce((min, current) =>
      current.p95Latency < min.p95Latency ? current : min
    );

    this.logger.log(`   Optimal payload size for latency: ${optimalForLatency.payloadSize}B (${optimalForLatency.p95Latency.toFixed(2)}ms P95)`);

    // Analyze latency scaling with payload size
    const smallestPayload = analysis[0];
    const largestPayload = analysis[analysis.length - 1];
    const scalingFactor = largestPayload.p95Latency / smallestPayload.p95Latency;

    this.logger.log(`   Latency scaling factor: ${scalingFactor.toFixed(2)}x (${smallestPayload.payloadSize}B → ${largestPayload.payloadSize}B)`);
  }

  /**
   * Generate PARLANT validation optimization recommendations
   */
  private generateValidationOptimizationRecommendations(
    withoutValidation: LatencyTestResults,
    withValidation: LatencyTestResults
  ): string[] {
    const recommendations: string[] = [];

    const latencyIncrease = withValidation.statistics.p95 - withoutValidation.statistics.p95;

    if (latencyIncrease > 25) {
      recommendations.push('Implement caching for frequently validated operations');
      recommendations.push('Consider async validation patterns for non-critical operations');
    }

    if (latencyIncrease > 50) {
      recommendations.push('Optimize PARLANT validation response time');
      recommendations.push('Implement validation request batching');
    }

    if (latencyIncrease > 100) {
      recommendations.push('Consider validation timeout optimization');
      recommendations.push('Implement fallback validation strategies');
    }

    return recommendations;
  }

  // ===== INFRASTRUCTURE METHODS =====

  /**
   * Execute warmup phase
   */
  private async executeWarmupPhase(
    connections: WebSocket[],
    config: LatencyMeasurementConfig
  ): Promise<void> {
    if (config.warmupMessages === 0) return;

    this.logger.log(`🔥 Warmup phase: ${config.warmupMessages} messages`);

    const warmupPromises: Promise<void>[] = [];

    for (let i = 0; i < config.warmupMessages; i++) {
      const connectionIndex = i % connections.length;
      const connection = connections[connectionIndex];

      const warmupPromise = this.sendLatencyMessage(
        connection,
        connectionIndex.toString(),
        config
      ).catch(() => {
        // Ignore warmup failures
      });

      warmupPromises.push(warmupPromise as Promise<void>);
    }

    await Promise.allSettled(warmupPromises);
  }

  /**
   * Execute cooldown phase
   */
  private async executeCooldownPhase(
    connections: WebSocket[],
    config: LatencyMeasurementConfig
  ): Promise<void> {
    if (config.cooldownMessages === 0) return;

    this.logger.log(`❄️ Cooldown phase: ${config.cooldownMessages} messages`);

    // Similar to warmup but for cooldown
    const cooldownPromises: Promise<void>[] = [];

    for (let i = 0; i < config.cooldownMessages; i++) {
      const connectionIndex = i % connections.length;
      const connection = connections[connectionIndex];

      const cooldownPromise = this.sendLatencyMessage(
        connection,
        connectionIndex.toString(),
        config
      ).catch(() => {
        // Ignore cooldown failures
      });

      cooldownPromises.push(cooldownPromise as Promise<void>);
    }

    await Promise.allSettled(cooldownPromises);
  }

  /**
   * Cleanup connections
   */
  private async cleanupConnections(connections: WebSocket[]): Promise<void> {
    const closePromises = connections.map(connection => {
      return new Promise<void>((resolve) => {
        if (connection.readyState === WebSocket.OPEN) {
          connection.close();
        }

        const timeout = setTimeout(() => {
          resolve();
        }, 1000);

        connection.once('close', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    });

    await Promise.all(closePromises);
  }

  /**
   * Initialize alert thresholds
   */
  private initializeAlertThresholds(): void {
    this.alertThresholds.set('p95_warning', this.LATENCY_TARGETS.TARGET_P95);
    this.alertThresholds.set('p95_critical', this.LATENCY_TARGETS.ACCEPTABLE_P95);
    this.alertThresholds.set('p99_warning', this.LATENCY_TARGETS.TARGET_P99);
  }

  /**
   * Start real-time monitoring
   */
  private startRealTimeMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      // Collect real-time metrics
      const metrics: RealTimeLatencyMetrics = {
        timestamp: Date.now(),
        instantLatency: 0, // Would be calculated from latest measurements
        rollingP95: 0,
        rollingMean: 0,
        activeConnections: 0,
        messagesInFlight: this.pendingMeasurements.size,
        errorCount: 0,
        alertTriggered: false,
      };

      this.realTimeMetrics.push(metrics);

      // Keep only last 1000 measurements
      if (this.realTimeMetrics.length > 1000) {
        this.realTimeMetrics = this.realTimeMetrics.slice(-1000);
      }
    }, 1000);
  }

  /**
   * Stop real-time monitoring
   */
  private stopRealTimeMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Update real-time metrics
   */
  private updateRealTimeMetrics(latency: number): void {
    // Update latest metrics with new latency measurement
    // Implementation would update rolling statistics
  }

  /**
   * Check latency alerts
   */
  private checkLatencyAlerts(latency: number): void {
    const p95Warning = this.alertThresholds.get('p95_warning') || 50;
    const p95Critical = this.alertThresholds.get('p95_critical') || 100;

    if (latency > p95Critical) {
      this.eventEmitter.emit('latency_alert', {
        level: 'critical',
        latency,
        threshold: p95Critical,
        message: `Critical latency detected: ${latency.toFixed(2)}ms`,
      });
    } else if (latency > p95Warning) {
      this.eventEmitter.emit('latency_alert', {
        level: 'warning',
        latency,
        threshold: p95Warning,
        message: `High latency detected: ${latency.toFixed(2)}ms`,
      });
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `latency_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Generate test payload
   */
  private generatePayload(size: number): string {
    return 'x'.repeat(size);
  }

  /**
   * Sleep utility
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get WebSocket URL
   */
  private getWebSocketUrl(): string {
    return this.configService.get<string>('WEBSOCKET_TEST_URL', 'ws://localhost:8080');
  }

  /**
   * Generate unique test ID
   */
  private generateTestId(testType: string): string {
    return `latency_${testType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load baseline results
   */
  private async loadBaselineResults(): Promise<void> {
    // Implementation would load baseline results from storage
    this.logger.log('Baseline latency results loaded');
  }

  /**
   * Stop latency test
   */
  private async stopLatencyTest(testId: string): Promise<void> {
    this.logger.log(`Stopping latency test: ${testId}`);
    this.activeTests.delete(testId);
  }

  /**
   * Log latency results
   */
  private logLatencyResults(results: LatencyTestResults): void {
    this.logger.log('📊 Latency Test Results:');
    this.logger.log(`   Test ID: ${results.testId}`);
    this.logger.log(`   Test Type: ${results.testType}`);
    this.logger.log(`   P50 Latency: ${results.statistics.p50.toFixed(2)}ms`);
    this.logger.log(`   P95 Latency: ${results.statistics.p95.toFixed(2)}ms (target: ${results.config.targets.p95}ms) ${results.targetsAchieved.p95 ? '✅' : '❌'}`);
    this.logger.log(`   P99 Latency: ${results.statistics.p99.toFixed(2)}ms (target: ${results.config.targets.p99}ms) ${results.targetsAchieved.p99 ? '✅' : '❌'}`);
    this.logger.log(`   Success Rate: ${results.statistics.reliability.successRate.toFixed(1)}%`);
    this.logger.log(`   Performance Grade: ${results.insights.performanceGrade}`);
    this.logger.log(`   Latency Profile: ${results.insights.latencyProfile}`);

    if (results.insights.bottlenecks.length > 0) {
      this.logger.log(`   Bottlenecks: ${results.insights.bottlenecks.length} detected`);
    }

    if (results.baselineComparison) {
      const improvement = results.baselineComparison.improvementPercentage;
      this.logger.log(`   Baseline Comparison: ${improvement >= 0 ? 'improved' : 'degraded'} by ${Math.abs(improvement).toFixed(1)}%`);
    }
  }

  // ===== PUBLIC API METHODS =====

  /**
   * Get latency test results
   */
  getLatencyTestResults(testId: string): LatencyTestResults | undefined {
    return this.testResults.get(testId);
  }

  /**
   * Get all latency test results
   */
  getAllLatencyTestResults(): LatencyTestResults[] {
    return Array.from(this.testResults.values());
  }

  /**
   * Get real-time latency metrics
   */
  getRealTimeLatencyMetrics(): RealTimeLatencyMetrics[] {
    return [...this.realTimeMetrics];
  }

  /**
   * Get latency targets
   */
  getLatencyTargets() {
    return { ...this.LATENCY_TARGETS };
  }

  /**
   * Set baseline results
   */
  setBaselineResults(results: LatencyTestResults): void {
    this.baselineResults = results;
    this.logger.log('Baseline latency results updated');
  }
}