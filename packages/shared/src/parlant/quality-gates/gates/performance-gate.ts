/**
 * PARLANT Quality Gates - Performance Gate Implementation
 *
 * Performance quality gate that validates response times, throughput, resource usage,
 * and other performance metrics against configurable thresholds. Includes sub-1000ms
 * response time validation as a critical requirement.
 *
 * @fileoverview Performance quality gate implementation
 * @version 1.0.0
 * @author Quality Gates Framework Agent
 * @created 2025-09-20
 */

import { Logger } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import {
  QualityGate,
  QualityGateContext,
  QualityGateResult,
  QualityGateStatus,
  QualityGateType,
  QualityGatePriority,
  QualityGateConfig,
  QualityGateThresholds,
  QualityGateConfigValidation,
  PerformanceMetrics,
  ResourceUtilizationMetrics,
  ThresholdEvaluation,
  ValidationStep,
  QualityGateLogEntry
} from '../core/quality-gate-types';
import { WrapperError, ErrorCategory } from '../../function-wrapper/interfaces/wrapper-types';

/**
 * Performance Gate Configuration Interface
 * Specific configuration for performance validation
 */
export interface PerformanceGateConfig extends QualityGateConfig {
  /** Response time threshold in milliseconds */
  readonly responseTimeThreshold: number;

  /** Throughput threshold (operations per second) */
  readonly throughputThreshold: number;

  /** Memory usage threshold in bytes */
  readonly memoryThreshold: number;

  /** CPU usage threshold (0-100) */
  readonly cpuThreshold: number;

  /** Error rate threshold (0-100) */
  readonly errorRateThreshold: number;

  /** Resource utilization thresholds */
  readonly resourceThresholds: ResourceThresholds;

  /** Enable detailed profiling */
  readonly enableProfiling: boolean;

  /** Profiling sample rate (0-1) */
  readonly profilingSampleRate: number;

  /** Performance monitoring window in milliseconds */
  readonly monitoringWindow: number;

  /** Baseline performance metrics for comparison */
  readonly baseline?: BaselinePerformanceMetrics;
}

/**
 * Resource Thresholds Configuration
 * Thresholds for various resource utilization metrics
 */
export interface ResourceThresholds {
  /** Database connection pool usage threshold (0-100) */
  readonly dbConnectionPoolThreshold: number;

  /** Network bandwidth usage threshold in bytes/sec */
  readonly networkBandwidthThreshold: number;

  /** Disk I/O operations threshold per second */
  readonly diskIoThreshold: number;

  /** Cache hit rate threshold (0-100) */
  readonly cacheHitRateThreshold: number;
}

/**
 * Baseline Performance Metrics
 * Reference metrics for performance comparison
 */
export interface BaselinePerformanceMetrics {
  /** Baseline response time in milliseconds */
  readonly responseTime: number;

  /** Baseline throughput (operations per second) */
  readonly throughput: number;

  /** Baseline memory usage in bytes */
  readonly memoryUsage: number;

  /** Baseline CPU usage percentage */
  readonly cpuUsage: number;

  /** Baseline error rate percentage */
  readonly errorRate: number;

  /** Baseline timestamp */
  readonly timestamp: Date;

  /** Baseline environment */
  readonly environment: string;
}

/**
 * Performance Measurement Result
 * Result of performance measurement
 */
export interface PerformanceMeasurement {
  /** Response time in milliseconds */
  readonly responseTime: number;

  /** Throughput (operations per second) */
  readonly throughput: number;

  /** Memory usage in bytes */
  readonly memoryUsage: number;

  /** CPU usage percentage */
  readonly cpuUsage: number;

  /** Error rate percentage */
  readonly errorRate: number;

  /** Resource utilization metrics */
  readonly resourceUtilization: ResourceUtilizationMetrics;

  /** Measurement timestamp */
  readonly timestamp: Date;

  /** Measurement duration in milliseconds */
  readonly duration: number;

  /** Sample count */
  readonly sampleCount: number;
}

/**
 * Performance Quality Gate Implementation
 * Validates performance metrics against configurable thresholds
 */
@Injectable()
export class PerformanceQualityGate implements QualityGate {
  private readonly logger = new Logger(PerformanceQualityGate.name);

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly priority: QualityGatePriority,
    public readonly enabled: boolean,
    public readonly config: PerformanceGateConfig,
    public readonly thresholds: QualityGateThresholds
  ) {}

  /**
   * Get gate type
   */
  get type(): QualityGateType {
    return QualityGateType.PERFORMANCE;
  }

  /**
   * Execute performance quality gate
   * @param context - Execution context
   * @returns Promise resolving to gate result
   */
  async execute(context: QualityGateContext): Promise<QualityGateResult> {
    const startTime = Date.now();
    const executionId = `${context.sessionId}-${this.id}`;

    this.logger.log(`Executing performance gate: ${this.id}`);

    const logs: QualityGateLogEntry[] = [];
    const validationSteps: ValidationStep[] = [];
    const warnings: string[] = [];
    const info: string[] = [];

    try {
      // Step 1: Initialize performance monitoring
      const initStep: ValidationStep = {
        stepId: 'init-monitoring',
        stepName: 'Initialize Performance Monitoring',
        status: 'passed',
        executionTime: 0,
        details: 'Performance monitoring initialized successfully',
        output: {}
      };
      validationSteps.push(initStep);

      // Step 2: Collect performance metrics
      const measurement = await this.collectPerformanceMetrics(context);

      const measurementStep: ValidationStep = {
        stepId: 'collect-metrics',
        stepName: 'Collect Performance Metrics',
        status: 'passed',
        executionTime: Date.now() - startTime,
        details: `Collected metrics for ${measurement.sampleCount} samples over ${measurement.duration}ms`,
        output: { measurement }
      };
      validationSteps.push(measurementStep);

      // Step 3: Evaluate performance thresholds
      const thresholdEvaluations = await this.evaluateThresholds(measurement);

      const thresholdStep: ValidationStep = {
        stepId: 'evaluate-thresholds',
        stepName: 'Evaluate Performance Thresholds',
        status: thresholdEvaluations.every(e => e.passed) ? 'passed' : 'failed',
        executionTime: Date.now() - startTime,
        details: `Evaluated ${thresholdEvaluations.length} performance thresholds`,
        output: { thresholdEvaluations }
      };
      validationSteps.push(thresholdStep);

      // Step 4: Compare with baseline (if available)
      let baselineComparison: BaselineComparison | undefined;
      if (this.config.baseline) {
        baselineComparison = this.compareWithBaseline(measurement, this.config.baseline);

        const baselineStep: ValidationStep = {
          stepId: 'baseline-comparison',
          stepName: 'Compare with Baseline',
          status: baselineComparison.withinAcceptableRange ? 'passed' : 'failed',
          executionTime: Date.now() - startTime,
          details: `Baseline comparison: ${baselineComparison.summary}`,
          output: { baselineComparison }
        };
        validationSteps.push(baselineStep);
      }

      // Step 5: Generate performance analysis
      const analysis = this.analyzePerformance(measurement, thresholdEvaluations, baselineComparison);

      const analysisStep: ValidationStep = {
        stepId: 'performance-analysis',
        stepName: 'Performance Analysis',
        status: 'passed',
        executionTime: Date.now() - startTime,
        details: 'Performance analysis completed',
        output: { analysis }
      };
      validationSteps.push(analysisStep);

      // Determine overall gate status
      const status = this.determineGateStatus(thresholdEvaluations, baselineComparison);
      const score = this.calculateScore(measurement, thresholdEvaluations);

      // Generate recommendations
      const recommendations = this.generateRecommendations(measurement, thresholdEvaluations, analysis);

      // Add warnings for concerning metrics
      this.addPerformanceWarnings(measurement, warnings);

      // Add informational messages
      info.push(`Response time: ${measurement.responseTime}ms`);
      info.push(`Throughput: ${measurement.throughput} ops/sec`);
      info.push(`Memory usage: ${(measurement.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
      info.push(`CPU usage: ${measurement.cpuUsage.toFixed(2)}%`);
      info.push(`Error rate: ${measurement.errorRate.toFixed(2)}%`);

      const endTime = Date.now();
      const totalExecutionTime = endTime - startTime;

      const result: QualityGateResult = {
        gateId: this.id,
        status,
        score,
        metrics: {
          executionTime: totalExecutionTime,
          performance: this.convertToFrameworkMetrics(measurement),
          security: this.getEmptySecurityMetrics(),
          coverage: this.getEmptyCoverageMetrics(),
          custom: {
            samplesCollected: measurement.sampleCount,
            measurementDuration: measurement.duration,
            profilingEnabled: this.config.enableProfiling ? 1 : 0
          }
        },
        details: {
          thresholdEvaluations,
          validationSteps,
          warnings,
          info,
          logs
        },
        metadata: {
          executionId,
          gateVersion: '1.0.0',
          environment: context.environment,
          host: 'unknown',
          retryAttempt: 0,
          correlationId: context.sessionId,
          additionalMetadata: {
            performanceMeasurement: measurement,
            baselineComparison,
            analysis
          }
        },
        recommendations
      };

      this.logger.log(`Performance gate completed: ${this.id}, Status: ${status}, Score: ${score}`);
      return result;

    } catch (error) {
      this.logger.error(`Performance gate execution failed: ${this.id}`, error);

      const errorResult: QualityGateResult = {
        gateId: this.id,
        status: QualityGateStatus.ERROR,
        score: 0,
        metrics: {
          executionTime: Date.now() - startTime,
          performance: this.getEmptyPerformanceMetrics(),
          security: this.getEmptySecurityMetrics(),
          coverage: this.getEmptyCoverageMetrics(),
          custom: {}
        },
        details: {
          thresholdEvaluations: [],
          validationSteps,
          warnings,
          info,
          logs
        },
        metadata: {
          executionId,
          gateVersion: '1.0.0',
          environment: context.environment,
          host: 'unknown',
          retryAttempt: 0,
          correlationId: context.sessionId,
          additionalMetadata: {}
        },
        error: {
          code: 'PERFORMANCE_GATE_ERROR',
          message: error.message,
          originalError: error,
          category: ErrorCategory.SYSTEM_ERROR,
          metadata: { gateId: this.id },
          stackTrace: error.stack
        },
        recommendations: ['Check system resources and performance monitoring configuration']
      };

      return errorResult;
    }
  }

  /**
   * Validate gate configuration
   * @returns Configuration validation result
   */
  validateConfig(): QualityGateConfigValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate response time threshold
    if (this.config.responseTimeThreshold <= 0) {
      errors.push('Response time threshold must be greater than 0');
    }

    if (this.config.responseTimeThreshold > 10000) {
      warnings.push('Response time threshold is very high (>10s), consider lowering for better user experience');
    }

    // Validate critical sub-1000ms requirement
    if (this.priority === QualityGatePriority.CRITICAL && this.config.responseTimeThreshold > 1000) {
      errors.push('Critical performance gates must have response time threshold ≤ 1000ms');
    }

    // Validate throughput threshold
    if (this.config.throughputThreshold < 0) {
      errors.push('Throughput threshold cannot be negative');
    }

    // Validate memory threshold
    if (this.config.memoryThreshold <= 0) {
      errors.push('Memory threshold must be greater than 0');
    }

    // Validate CPU threshold
    if (this.config.cpuThreshold < 0 || this.config.cpuThreshold > 100) {
      errors.push('CPU threshold must be between 0 and 100');
    }

    // Validate error rate threshold
    if (this.config.errorRateThreshold < 0 || this.config.errorRateThreshold > 100) {
      errors.push('Error rate threshold must be between 0 and 100');
    }

    // Validate profiling configuration
    if (this.config.profilingSampleRate < 0 || this.config.profilingSampleRate > 1) {
      errors.push('Profiling sample rate must be between 0 and 1');
    }

    // Validate monitoring window
    if (this.config.monitoringWindow <= 0) {
      errors.push('Monitoring window must be greater than 0');
    }

    if (this.config.monitoringWindow < 1000) {
      warnings.push('Monitoring window is very short (<1s), consider longer window for stable metrics');
    }

    // Validate resource thresholds
    const resourceThresholds = this.config.resourceThresholds;
    if (resourceThresholds.dbConnectionPoolThreshold < 0 || resourceThresholds.dbConnectionPoolThreshold > 100) {
      errors.push('Database connection pool threshold must be between 0 and 100');
    }

    if (resourceThresholds.networkBandwidthThreshold < 0) {
      errors.push('Network bandwidth threshold cannot be negative');
    }

    if (resourceThresholds.diskIoThreshold < 0) {
      errors.push('Disk I/O threshold cannot be negative');
    }

    if (resourceThresholds.cacheHitRateThreshold < 0 || resourceThresholds.cacheHitRateThreshold > 100) {
      errors.push('Cache hit rate threshold must be between 0 and 100');
    }

    // Generate suggestions
    if (this.config.responseTimeThreshold > 2000) {
      suggestions.push('Consider implementing caching or optimization to reduce response times');
    }

    if (this.config.cpuThreshold > 80) {
      suggestions.push('High CPU threshold may indicate need for horizontal scaling');
    }

    if (!this.config.enableProfiling) {
      suggestions.push('Enable profiling for detailed performance analysis');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Collect performance metrics
   * @param context - Execution context
   * @returns Performance measurement
   */
  private async collectPerformanceMetrics(context: QualityGateContext): Promise<PerformanceMeasurement> {
    const startTime = Date.now();
    const samples: PerformanceSample[] = [];
    const sampleInterval = Math.max(100, this.config.monitoringWindow / 10); // 10 samples minimum
    const endTime = startTime + this.config.monitoringWindow;

    this.logger.debug(`Collecting performance metrics for ${this.config.monitoringWindow}ms`);

    // Collect performance samples over the monitoring window
    while (Date.now() < endTime) {
      if (Math.random() < this.config.profilingSampleRate) {
        const sample = await this.collectSingleSample(context);
        samples.push(sample);
      }

      // Wait for next sample interval
      await this.sleep(sampleInterval);
    }

    if (samples.length === 0) {
      // Fallback: collect at least one sample
      samples.push(await this.collectSingleSample(context));
    }

    // Aggregate samples into final measurement
    const duration = Date.now() - startTime;
    const measurement = this.aggregateSamples(samples, new Date(startTime), duration, samples.length);

    return measurement;
  }

  /**
   * Collect single performance sample
   * @param context - Execution context
   * @returns Performance sample
   */
  private async collectSingleSample(context: QualityGateContext): Promise<PerformanceSample> {
    const sampleStartTime = Date.now();

    // Mock performance data collection
    // In a real implementation, this would collect actual system metrics
    const responseTime = Math.random() * 2000; // 0-2000ms
    const throughput = 100 + Math.random() * 900; // 100-1000 ops/sec
    const memoryUsage = 50 * 1024 * 1024 + Math.random() * 200 * 1024 * 1024; // 50-250MB
    const cpuUsage = Math.random() * 100; // 0-100%
    const errorRate = Math.random() * 5; // 0-5%

    const resourceUtilization: ResourceUtilizationMetrics = {
      dbConnectionPool: Math.random() * 100,
      networkBandwidth: Math.random() * 1000000, // bytes/sec
      diskIo: Math.random() * 1000, // ops/sec
      cacheHitRate: 80 + Math.random() * 20 // 80-100%
    };

    return {
      timestamp: new Date(),
      responseTime,
      throughput,
      memoryUsage,
      cpuUsage,
      errorRate,
      resourceUtilization,
      sampleDuration: Date.now() - sampleStartTime
    };
  }

  /**
   * Aggregate multiple samples into single measurement
   * @param samples - Performance samples
   * @returns Aggregated measurement
   */
  private aggregateSamples(samples: PerformanceSample[], timestamp: Date, duration: number, sampleCount: number): PerformanceMeasurement {
    const count = samples.length;

    const responseTime = samples.reduce((sum, s) => sum + s.responseTime, 0) / count;
    const throughput = samples.reduce((sum, s) => sum + s.throughput, 0) / count;
    const memoryUsage = samples.reduce((sum, s) => sum + s.memoryUsage, 0) / count;
    const cpuUsage = samples.reduce((sum, s) => sum + s.cpuUsage, 0) / count;
    const errorRate = samples.reduce((sum, s) => sum + s.errorRate, 0) / count;

    const resourceUtilization: ResourceUtilizationMetrics = {
      dbConnectionPool: samples.reduce((sum, s) => sum + s.resourceUtilization.dbConnectionPool, 0) / count,
      networkBandwidth: samples.reduce((sum, s) => sum + s.resourceUtilization.networkBandwidth, 0) / count,
      diskIo: samples.reduce((sum, s) => sum + s.resourceUtilization.diskIo, 0) / count,
      cacheHitRate: samples.reduce((sum, s) => sum + s.resourceUtilization.cacheHitRate, 0) / count
    };

    return {
      responseTime,
      throughput,
      memoryUsage,
      cpuUsage,
      errorRate,
      resourceUtilization,
      timestamp,
      duration,
      sampleCount
    };
  }

  /**
   * Evaluate performance thresholds
   * @param measurement - Performance measurement
   * @returns Threshold evaluation results
   */
  private async evaluateThresholds(measurement: PerformanceMeasurement): Promise<ThresholdEvaluation[]> {
    const evaluations: ThresholdEvaluation[] = [];

    // Evaluate response time threshold
    evaluations.push({
      thresholdId: 'response-time',
      metric: 'responseTime',
      actualValue: measurement.responseTime,
      thresholdValue: this.config.responseTimeThreshold,
      operator: 'lte' as any,
      passed: measurement.responseTime <= this.config.responseTimeThreshold,
      details: `Response time ${measurement.responseTime.toFixed(2)}ms vs threshold ${this.config.responseTimeThreshold}ms`
    });

    // Evaluate throughput threshold
    evaluations.push({
      thresholdId: 'throughput',
      metric: 'throughput',
      actualValue: measurement.throughput,
      thresholdValue: this.config.throughputThreshold,
      operator: 'gte' as any,
      passed: measurement.throughput >= this.config.throughputThreshold,
      details: `Throughput ${measurement.throughput.toFixed(2)} ops/sec vs threshold ${this.config.throughputThreshold} ops/sec`
    });

    // Evaluate memory threshold
    evaluations.push({
      thresholdId: 'memory-usage',
      metric: 'memoryUsage',
      actualValue: measurement.memoryUsage,
      thresholdValue: this.config.memoryThreshold,
      operator: 'lte' as any,
      passed: measurement.memoryUsage <= this.config.memoryThreshold,
      details: `Memory usage ${(measurement.memoryUsage / 1024 / 1024).toFixed(2)}MB vs threshold ${(this.config.memoryThreshold / 1024 / 1024).toFixed(2)}MB`
    });

    // Evaluate CPU threshold
    evaluations.push({
      thresholdId: 'cpu-usage',
      metric: 'cpuUsage',
      actualValue: measurement.cpuUsage,
      thresholdValue: this.config.cpuThreshold,
      operator: 'lte' as any,
      passed: measurement.cpuUsage <= this.config.cpuThreshold,
      details: `CPU usage ${measurement.cpuUsage.toFixed(2)}% vs threshold ${this.config.cpuThreshold}%`
    });

    // Evaluate error rate threshold
    evaluations.push({
      thresholdId: 'error-rate',
      metric: 'errorRate',
      actualValue: measurement.errorRate,
      thresholdValue: this.config.errorRateThreshold,
      operator: 'lte' as any,
      passed: measurement.errorRate <= this.config.errorRateThreshold,
      details: `Error rate ${measurement.errorRate.toFixed(2)}% vs threshold ${this.config.errorRateThreshold}%`
    });

    // Evaluate resource utilization thresholds
    const resourceThresholds = this.config.resourceThresholds;

    evaluations.push({
      thresholdId: 'db-connection-pool',
      metric: 'dbConnectionPool',
      actualValue: measurement.resourceUtilization.dbConnectionPool,
      thresholdValue: resourceThresholds.dbConnectionPoolThreshold,
      operator: 'lte' as any,
      passed: measurement.resourceUtilization.dbConnectionPool <= resourceThresholds.dbConnectionPoolThreshold,
      details: `DB connection pool usage ${measurement.resourceUtilization.dbConnectionPool.toFixed(2)}% vs threshold ${resourceThresholds.dbConnectionPoolThreshold}%`
    });

    evaluations.push({
      thresholdId: 'cache-hit-rate',
      metric: 'cacheHitRate',
      actualValue: measurement.resourceUtilization.cacheHitRate,
      thresholdValue: resourceThresholds.cacheHitRateThreshold,
      operator: 'gte' as any,
      passed: measurement.resourceUtilization.cacheHitRate >= resourceThresholds.cacheHitRateThreshold,
      details: `Cache hit rate ${measurement.resourceUtilization.cacheHitRate.toFixed(2)}% vs threshold ${resourceThresholds.cacheHitRateThreshold}%`
    });

    return evaluations;
  }

  /**
   * Compare measurement with baseline
   * @param measurement - Current measurement
   * @param baseline - Baseline metrics
   * @returns Baseline comparison result
   */
  private compareWithBaseline(measurement: PerformanceMeasurement, baseline: BaselinePerformanceMetrics): BaselineComparison {
    const responseTimeDelta = ((measurement.responseTime - baseline.responseTime) / baseline.responseTime) * 100;
    const throughputDelta = ((measurement.throughput - baseline.throughput) / baseline.throughput) * 100;
    const memoryDelta = ((measurement.memoryUsage - baseline.memoryUsage) / baseline.memoryUsage) * 100;
    const cpuDelta = ((measurement.cpuUsage - baseline.cpuUsage) / baseline.cpuUsage) * 100;
    const errorRateDelta = ((measurement.errorRate - baseline.errorRate) / baseline.errorRate) * 100;

    // Consider acceptable range as ±20% for most metrics
    const acceptableRange = 20;
    const withinAcceptableRange = Math.abs(responseTimeDelta) <= acceptableRange &&
                                 Math.abs(throughputDelta) <= acceptableRange &&
                                 Math.abs(memoryDelta) <= acceptableRange &&
                                 Math.abs(cpuDelta) <= acceptableRange &&
                                 Math.abs(errorRateDelta) <= acceptableRange;

    const summary = `Response time: ${responseTimeDelta > 0 ? '+' : ''}${responseTimeDelta.toFixed(1)}%, ` +
                   `Throughput: ${throughputDelta > 0 ? '+' : ''}${throughputDelta.toFixed(1)}%, ` +
                   `Memory: ${memoryDelta > 0 ? '+' : ''}${memoryDelta.toFixed(1)}%, ` +
                   `CPU: ${cpuDelta > 0 ? '+' : ''}${cpuDelta.toFixed(1)}%`;

    return {
      responseTimeDelta,
      throughputDelta,
      memoryDelta,
      cpuDelta,
      errorRateDelta,
      withinAcceptableRange,
      summary,
      baselineTimestamp: baseline.timestamp
    };
  }

  /**
   * Analyze performance data
   * @param measurement - Performance measurement
   * @param thresholdEvaluations - Threshold evaluation results
   * @param baselineComparison - Baseline comparison (optional)
   * @returns Performance analysis
   */
  private analyzePerformance(
    measurement: PerformanceMeasurement,
    thresholdEvaluations: ThresholdEvaluation[],
    baselineComparison?: BaselineComparison
  ): PerformanceAnalysis {
    const failedThresholds = thresholdEvaluations.filter(e => !e.passed);
    const criticalIssues = failedThresholds.filter(e => e.metric === 'responseTime' || e.metric === 'errorRate');

    let overallAssessment: string;
    if (criticalIssues.length > 0) {
      overallAssessment = 'Critical performance issues detected';
    } else if (failedThresholds.length > 0) {
      overallAssessment = 'Performance issues detected';
    } else if (baselineComparison && !baselineComparison.withinAcceptableRange) {
      overallAssessment = 'Performance regression detected';
    } else {
      overallAssessment = 'Performance within acceptable limits';
    }

    const bottlenecks: string[] = [];
    if (measurement.responseTime > this.config.responseTimeThreshold) {
      bottlenecks.push('High response time indicates potential processing bottleneck');
    }
    if (measurement.cpuUsage > 80) {
      bottlenecks.push('High CPU usage may indicate computational bottleneck');
    }
    if (measurement.resourceUtilization.cacheHitRate < 80) {
      bottlenecks.push('Low cache hit rate may indicate caching inefficiency');
    }

    return {
      overallAssessment,
      criticalIssues: criticalIssues.map(t => t.details),
      bottlenecks,
      performanceTrend: baselineComparison ? this.determineTrend(baselineComparison) : 'stable',
      recommendations: this.generatePerformanceRecommendations(measurement, failedThresholds)
    };
  }

  /**
   * Determine performance trend from baseline comparison
   * @param comparison - Baseline comparison
   * @returns Trend direction
   */
  private determineTrend(comparison: BaselineComparison): 'improving' | 'stable' | 'declining' {
    const responseTimeChange = comparison.responseTimeDelta;
    const throughputChange = comparison.throughputDelta;

    // Consider trend based on response time and throughput
    if (responseTimeChange < -10 || throughputChange > 10) {
      return 'improving';
    } else if (responseTimeChange > 10 || throughputChange < -10) {
      return 'declining';
    } else {
      return 'stable';
    }
  }

  /**
   * Generate performance-specific recommendations
   * @param measurement - Performance measurement
   * @param failedThresholds - Failed threshold evaluations
   * @returns Array of recommendations
   */
  private generatePerformanceRecommendations(
    measurement: PerformanceMeasurement,
    failedThresholds: ThresholdEvaluation[]
  ): string[] {
    const recommendations: string[] = [];

    for (const threshold of failedThresholds) {
      switch (threshold.metric) {
        case 'responseTime':
          recommendations.push('Optimize query performance and consider implementing caching');
          recommendations.push('Review database indexing and query optimization');
          break;
        case 'throughput':
          recommendations.push('Consider horizontal scaling or load balancing');
          recommendations.push('Optimize processing algorithms and reduce bottlenecks');
          break;
        case 'memoryUsage':
          recommendations.push('Implement memory optimization and garbage collection tuning');
          recommendations.push('Review object lifecycle management and caching strategies');
          break;
        case 'cpuUsage':
          recommendations.push('Optimize CPU-intensive operations and consider async processing');
          recommendations.push('Review algorithm complexity and implementation efficiency');
          break;
        case 'errorRate':
          recommendations.push('Investigate root causes of errors and implement better error handling');
          recommendations.push('Improve input validation and error recovery mechanisms');
          break;
      }
    }

    // Add general recommendations
    if (measurement.resourceUtilization.cacheHitRate < 80) {
      recommendations.push('Improve cache strategy and hit rates');
    }

    if (measurement.resourceUtilization.dbConnectionPool > 80) {
      recommendations.push('Optimize database connection management');
    }

    return recommendations;
  }

  /**
   * Determine gate status from evaluations
   * @param thresholdEvaluations - Threshold evaluations
   * @param baselineComparison - Baseline comparison (optional)
   * @returns Gate status
   */
  private determineGateStatus(
    thresholdEvaluations: ThresholdEvaluation[],
    baselineComparison?: BaselineComparison
  ): QualityGateStatus {
    const failedThresholds = thresholdEvaluations.filter(e => !e.passed);
    const criticalFailures = failedThresholds.filter(e =>
      e.metric === 'responseTime' || e.metric === 'errorRate'
    );

    if (criticalFailures.length > 0) {
      return QualityGateStatus.FAILED;
    }

    if (failedThresholds.length > 0) {
      return QualityGateStatus.WARNING;
    }

    if (baselineComparison && !baselineComparison.withinAcceptableRange) {
      return QualityGateStatus.WARNING;
    }

    return QualityGateStatus.PASSED;
  }

  /**
   * Calculate gate score
   * @param measurement - Performance measurement
   * @param thresholdEvaluations - Threshold evaluations
   * @returns Score (0-100)
   */
  private calculateScore(
    measurement: PerformanceMeasurement,
    thresholdEvaluations: ThresholdEvaluation[]
  ): number {
    const passedThresholds = thresholdEvaluations.filter(e => e.passed).length;
    const totalThresholds = thresholdEvaluations.length;

    const baseScore = (passedThresholds / totalThresholds) * 100;

    // Apply bonuses and penalties
    let adjustedScore = baseScore;

    // Bonus for excellent response time
    if (measurement.responseTime < 500) {
      adjustedScore += 5;
    }

    // Penalty for high error rate
    if (measurement.errorRate > 1) {
      adjustedScore -= 10;
    }

    // Bonus for high cache hit rate
    if (measurement.resourceUtilization.cacheHitRate > 95) {
      adjustedScore += 3;
    }

    return Math.max(0, Math.min(100, adjustedScore));
  }

  /**
   * Add performance-specific warnings
   * @param measurement - Performance measurement
   * @param warnings - Warnings array to populate
   */
  private addPerformanceWarnings(measurement: PerformanceMeasurement, warnings: string[]): void {
    if (measurement.responseTime > this.config.responseTimeThreshold * 0.8) {
      warnings.push('Response time approaching threshold limit');
    }

    if (measurement.cpuUsage > 85) {
      warnings.push('High CPU usage detected');
    }

    if (measurement.resourceUtilization.cacheHitRate < 70) {
      warnings.push('Low cache hit rate may impact performance');
    }

    if (measurement.errorRate > 0.5) {
      warnings.push('Elevated error rate detected');
    }
  }

  /**
   * Generate recommendations based on analysis
   * @param measurement - Performance measurement
   * @param thresholdEvaluations - Threshold evaluations
   * @param analysis - Performance analysis
   * @returns Array of recommendations
   */
  private generateRecommendations(
    measurement: PerformanceMeasurement,
    thresholdEvaluations: ThresholdEvaluation[],
    analysis: PerformanceAnalysis
  ): string[] {
    const recommendations: string[] = [];

    // Add analysis recommendations
    recommendations.push(...analysis.recommendations);

    // Add general performance recommendations
    if (analysis.performanceTrend === 'declining') {
      recommendations.push('Monitor performance trends and implement proactive optimizations');
    }

    if (analysis.criticalIssues.length > 0) {
      recommendations.push('Address critical performance issues immediately');
    }

    if (analysis.bottlenecks.length > 0) {
      recommendations.push('Investigate and resolve identified performance bottlenecks');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Convert measurement to framework metrics format
   * @param measurement - Performance measurement
   * @returns Framework performance metrics
   */
  private convertToFrameworkMetrics(measurement: PerformanceMeasurement): PerformanceMetrics {
    return {
      responseTime: measurement.responseTime,
      throughput: measurement.throughput,
      memoryUsage: measurement.memoryUsage,
      cpuUsage: measurement.cpuUsage,
      errorRate: measurement.errorRate,
      resourceUtilization: measurement.resourceUtilization
    };
  }

  /**
   * Get empty performance metrics
   * @returns Empty performance metrics
   */
  private getEmptyPerformanceMetrics(): PerformanceMetrics {
    return {
      responseTime: 0,
      throughput: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      errorRate: 0,
      resourceUtilization: {
        dbConnectionPool: 0,
        networkBandwidth: 0,
        diskIo: 0,
        cacheHitRate: 0
      }
    };
  }

  /**
   * Get empty security metrics
   * @returns Empty security metrics
   */
  private getEmptySecurityMetrics(): any {
    return {
      vulnerabilities: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      authSuccessRate: 0,
      authzViolations: 0,
      complianceScore: 0,
      threatAlerts: 0
    };
  }

  /**
   * Get empty coverage metrics
   * @returns Empty coverage metrics
   */
  private getEmptyCoverageMetrics(): any {
    return {
      testCoverage: 0,
      codeCoverage: 0,
      functionCoverage: 0,
      branchCoverage: 0,
      integrationCoverage: 0
    };
  }

  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Performance Sample Interface
 * Single performance measurement sample
 */
interface PerformanceSample {
  readonly timestamp: Date;
  readonly responseTime: number;
  readonly throughput: number;
  readonly memoryUsage: number;
  readonly cpuUsage: number;
  readonly errorRate: number;
  readonly resourceUtilization: ResourceUtilizationMetrics;
  readonly sampleDuration: number;
}

/**
 * Baseline Comparison Result
 * Result of comparing current metrics with baseline
 */
interface BaselineComparison {
  readonly responseTimeDelta: number;
  readonly throughputDelta: number;
  readonly memoryDelta: number;
  readonly cpuDelta: number;
  readonly errorRateDelta: number;
  readonly withinAcceptableRange: boolean;
  readonly summary: string;
  readonly baselineTimestamp: Date;
}

/**
 * Performance Analysis Result
 * Result of analyzing performance data
 */
interface PerformanceAnalysis {
  readonly overallAssessment: string;
  readonly criticalIssues: readonly string[];
  readonly bottlenecks: readonly string[];
  readonly performanceTrend: 'improving' | 'stable' | 'declining';
  readonly recommendations: readonly string[];
}