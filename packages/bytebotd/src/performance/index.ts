/**
 * PARLANT Phase 1 WebSocket Performance Benchmarking Framework - Main Export
 *
 * Comprehensive WebSocket performance testing and benchmarking framework
 * targeting 5000+ messages/second throughput and sub-50ms P95 latency.
 *
 * @module PerformanceBenchmarkingFramework
 * @version 1.0.0
 * @author PARLANT Performance Testing Team
 */

// Core performance testing services
export { WebSocketPerformanceBenchmarkingService } from './websocket-performance-benchmarking.service';export { ThroughputTestingService } from './throughput-testing.service';export { LatencyMeasurementService } from './latency-measurement.service';export { ResourceMonitoringService } from './resource-monitoring.service';export { ParlantValidationImpactAnalysisService } from './parlant-validation-impact-analysis.service';export { SustainedLoadTestingService } from './sustained-load-testing.service';export { PerformanceRegressionTestingService } from './performance-regression-testing.service';// Type exports for external usageexport type {
  // Core benchmarking types
  PerformanceTestType,
  PerformanceMetrics,
  BenchmarkResults,
  RealTimeMetrics,
} from './websocket-performance-benchmarking.service';export type {// Throughput testing types
  ThroughputTestScenario,
  ThroughputTestConfig,
  ThroughputTestResults,
  ThroughputMetrics,
} from './throughput-testing.service';export type {// Latency testing types
  LatencyTestType,
  LatencyMeasurementConfig,
  LatencyTestResults,
  LatencyStatistics,
  LatencyMeasurement,
} from './latency-measurement.service';export type {// Resource monitoring types
  ResourceMetrics,
  CPUMetrics,
  MemoryMetrics,
  NetworkMetrics,
  DiskMetrics,
  ResourceBottleneck,
} from './resource-monitoring.service';export type {// PARLANT validation impact types
  ValidationComplexity,
  ValidationCategory,
  ValidationPerformanceMeasurement,
  ValidationImpactComparison,
  ValidationImpactAnalysisResults,
} from './parlant-validation-impact-analysis.service';export type {// Sustained load testing types
  SustainedLoadTestType,
  LoadPattern,
  SustainedLoadTestConfig,
  SustainedLoadTestResults,
  PerformanceDegradationAnalysis,
  MemoryLeakAnalysis,
} from './sustained-load-testing.service';export type {// Regression testing types
  RegressionTestType,
  PerformanceBaseline,
  RegressionAnalysisResult,
  PerformanceTrendAnalysis,
  RegressionAlertConfig,
} from './performance-regression-testing.service';/*** Performance testing framework configuration
 */
export interface PerformanceFrameworkConfig {
  // Global settings
  enabled: boolean;
  environment: 'development' | 'staging' | 'production';// Target performance metricstargets: {
    throughput: number;              // Target: 5000+ messages/second
    latencyP95: number;             // Target: <50ms P95 latency
    latencyP99: number;             // Target: <100ms P99 latency
    reliabilityTarget: number;      // Target: 99% success rate
    resourceEfficiency: number;     // Target: <80% CPU usage
  };

  // Test execution settings
  testing: {
    enableAutomatedTesting: boolean;
    testSchedule: string;           // Cron expression
    baselineUpdateFrequency: string; // How often to update baselines
    retentionPeriod: number;        // Data retention period (days)
  };

  // Monitoring and alerting
  monitoring: {
    enableRealTimeMonitoring: boolean;
    metricsCollectionInterval: number; // Milliseconds
    enableRegressionDetection: boolean;
    enablePerformanceAlerting: boolean;
  };

  // Integration settings
  integration: {
    enableCIIntegration: boolean;
    webhookUrls: string[];
    slackIntegration?: {
      webhookUrl: string;
      channels: string[];
    };
    emailAlerts?: {
      enabled: boolean;
      recipients: string[];
    };
  };
}

/**
 * Performance framework summary and statistics
 */
export interface PerformanceFrameworkSummary {
  // Framework status
  status: {
    active: boolean;
    lastTestRun: Date;
    totalTestsExecuted: number;
    frameworkVersion: string;
  };

  // Current performance state
  currentPerformance: {
    throughput: {
      current: number;
      target: number;
      targetMet: boolean;
      trend: 'improving' | 'stable' | 'degrading';};latency: {
      currentP95: number;
      targetP95: number;
      targetMet: boolean;
      trend: 'improving' | 'stable' | 'degrading';};reliability: {
      current: number;
      target: number;
      targetMet: boolean;
    };
    resources: {
      cpuUsage: number;
      memoryUsage: number;
      efficient: boolean;
    };
  };

  // Recent test results summary
  recentTests: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageExecutionTime: number;
    lastFailureReason?: string;
  };

  // Performance trends
  trends: {
    performanceScore: number;      // Overall score (0-100)
    stabilityScore: number;        // Stability score (0-100)
    regressionCount: number;       // Active regressions
    improvementCount: number;      // Recent improvements
  };

  // Recommendations
  recommendations: {
    immediate: string[];           // Immediate actions needed
    optimization: string[];        // Performance optimizations
    infrastructure: string[];      // Infrastructure recommendations
    monitoring: string[];          // Monitoring improvements
  };
}

/**
 * Default performance framework configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceFrameworkConfig = {
  enabled: true,
  environment: 'development',targets: {throughput: 5000,              // 5000+ messages/second
    latencyP95: 50,               // <50ms P95 latency
    latencyP99: 100,              // <100ms P99 latency
    reliabilityTarget: 99,        // 99% success rate
    resourceEfficiency: 80,       // <80% CPU usage
  },

  testing: {
    enableAutomatedTesting: true,
    testSchedule: '0 2 * * *',     // Daily at 2 AMbaselineUpdateFrequency: '0 0 * * 0', // Weekly on SundayretentionPeriod: 90,           // 90 days},

  monitoring: {
    enableRealTimeMonitoring: true,
    metricsCollectionInterval: 30000, // 30 seconds
    enableRegressionDetection: true,
    enablePerformanceAlerting: true,
  },

  integration: {
    enableCIIntegration: true,
    webhookUrls: [],
  },
};

/**
 * Performance framework constants
 */
export const PERFORMANCE_CONSTANTS = {
  // Enterprise performance targets
  ENTERPRISE_TARGETS: {
    THROUGHPUT_MINIMUM: 5000,     // Minimum acceptable throughput
    THROUGHPUT_EXCELLENT: 10000,  // Excellent performance threshold
    LATENCY_P95_TARGET: 50,       // Primary P95 latency target (ms)
    LATENCY_P95_EXCELLENT: 25,    // Excellent P95 latency (ms)
    LATENCY_P99_TARGET: 100,      // P99 latency target (ms)
    RELIABILITY_TARGET: 99.0,     // Reliability target (%)
    CPU_EFFICIENCY_TARGET: 80,    // CPU usage target (%)
  },

  // Test durations
  TEST_DURATIONS: {
    QUICK_TEST: 30000,            // 30 seconds
    STANDARD_TEST: 120000,        // 2 minutes
    EXTENDED_TEST: 600000,        // 10 minutes
    ENDURANCE_TEST: 14400000,     // 4 hours
    STRESS_TEST: 1800000,         // 30 minutes
  },

  // Payload sizes for testing
  PAYLOAD_SIZES: {
    TINY: 64,                     // 64 bytes
    SMALL: 256,                   // 256 bytes
    MEDIUM: 1024,                 // 1 KB
    LARGE: 4096,                  // 4 KB
    VERY_LARGE: 16384,           // 16 KB
    HUGE: 65536,                 // 64 KB
  },

  // Connection counts for scaling tests
  CONNECTION_SCALES: {
    LIGHT: 10,                    // Light load
    MEDIUM: 50,                   // Medium load
    HEAVY: 200,                   // Heavy load
    STRESS: 500,                  // Stress load
    EXTREME: 1000,                // Extreme load
  },

  // Regression severity thresholds
  REGRESSION_THRESHOLDS: {
    MINOR: 10,                    // 10% performance change
    MODERATE: 20,                 // 20% performance change
    MAJOR: 35,                    // 35% performance change
    CRITICAL: 50,                 // 50% performance change
  },
} as const;

/**
 * Performance test result status
 */
export enum TestResultStatus {
  PASSED = 'passed',FAILED = 'failed',WARNING = 'warning',SKIPPED = 'skipped',ERROR = 'error',}/**
 * Performance grade classification
 */
export enum PerformanceGrade {
  EXCELLENT = 'A',               // Exceeds all targetsGOOD = 'B',                    // Meets all targetsACCEPTABLE = 'C',              // Meets most targetsPOOR = 'D',                    // Below targetsUNACCEPTABLE = 'F',            // Significantly below targets
}

/**
 * Performance metrics display interface
 */
export interface DisplayMetrics {
  throughput?: number;
  latencyP95?: number;
  latencyP99?: number;
  reliability?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  grade?: string;
}

/**
 * Performance test result interface
 */
export interface PerformanceTestResult {
  throughput?: number;
  latencyP95?: number;
  latencyP99?: number;
  reliability?: number;
  cpuUsage?: number;
  memoryUsage?: number;
}

/**
 * Aggregated performance summary
 */
export interface PerformanceSummary {
  totalTests: number;
  averageThroughput: number;
  averageLatencyP95: number;
  averageReliability: number;
  overallGrade: PerformanceGrade;
  targetsMet: {
    allTargetsMet: boolean;
    targetsStatus: Record<string, boolean>;
  };
}

/**
 * Utility functions for performance testing
 */
export class PerformanceUtils {
  /**
   * Calculate performance grade based on metrics
   */
  static calculatePerformanceGrade(
    throughput: number,
    latencyP95: number,
    reliability: number
  ): PerformanceGrade {
    const targets = PERFORMANCE_CONSTANTS.ENTERPRISE_TARGETS;

    let score = 0;

    // Throughput scoring (40% weight)
    if (throughput >= targets.THROUGHPUT_EXCELLENT) score += 40;
    else if (throughput >= targets.THROUGHPUT_MINIMUM) score += 30;
    else if (throughput >= targets.THROUGHPUT_MINIMUM * 0.8) score += 20;
    else if (throughput >= targets.THROUGHPUT_MINIMUM * 0.6) score += 10;

    // Latency scoring (40% weight)
    if (latencyP95 <= targets.LATENCY_P95_EXCELLENT) score += 40;
    else if (latencyP95 <= targets.LATENCY_P95_TARGET) score += 30;
    else if (latencyP95 <= targets.LATENCY_P95_TARGET * 1.5) score += 20;
    else if (latencyP95 <= targets.LATENCY_P95_TARGET * 2) score += 10;

    // Reliability scoring (20% weight)
    if (reliability >= targets.RELIABILITY_TARGET) score += 20;
    else if (reliability >= targets.RELIABILITY_TARGET * 0.95) score += 15;
    else if (reliability >= targets.RELIABILITY_TARGET * 0.9) score += 10;
    else if (reliability >= targets.RELIABILITY_TARGET * 0.85) score += 5;

    // Convert score to grade
    if (score >= 90) return PerformanceGrade.EXCELLENT;
    if (score >= 80) return PerformanceGrade.GOOD;
    if (score >= 60) return PerformanceGrade.ACCEPTABLE;
    if (score >= 40) return PerformanceGrade.POOR;
    return PerformanceGrade.UNACCEPTABLE;
  }

  /**
   * Format performance metrics for display
   */
  static formatMetrics(metrics: DisplayMetrics): string {
    return `
Performance Metrics Summary:
📊 Throughput: ${metrics.throughput?.toFixed(0) ?? 'N/A'} msg/sec⏱️  P95 Latency: ${metrics.latencyP95?.toFixed(2) ?? 'N/A'}ms⏱️  P99 Latency: ${metrics.latencyP99?.toFixed(2) ?? 'N/A'}ms✅ Success Rate: ${metrics.reliability?.toFixed(1) ?? 'N/A'}%💾 CPU Usage: ${metrics.cpuUsage?.toFixed(1) ?? 'N/A'}%🧠 Memory Usage: ${metrics.memoryUsage?.toFixed(1) ?? 'N/A'}MB📈 Performance Grade: ${metrics.grade ?? 'N/A'}
    `.trim();
  }

  /**
   * Check if performance targets are met
   */
  static checkTargets(metrics: DisplayMetrics): {
    allTargetsMet: boolean;
    targetsStatus: Record<string, boolean>;
  } {
    const targets = PERFORMANCE_CONSTANTS.ENTERPRISE_TARGETS;

    const targetsStatus = {
      throughput: (metrics.throughput ?? 0) >= targets.THROUGHPUT_MINIMUM,
      latencyP95: (metrics.latencyP95 ?? Infinity) <= targets.LATENCY_P95_TARGET,
      latencyP99: (metrics.latencyP99 ?? Infinity) <= targets.LATENCY_P99_TARGET,
      reliability: (metrics.reliability ?? 0) >= targets.RELIABILITY_TARGET,
      cpuEfficiency: (metrics.cpuUsage ?? 100) <= targets.CPU_EFFICIENCY_TARGET,
    };

    const allTargetsMet = Object.values(targetsStatus).every(met => met);

    return { allTargetsMet, targetsStatus };
  }

  /**
   * Generate performance recommendations
   */
  static generateRecommendations(metrics: DisplayMetrics): string[] {
    const recommendations: string[] = [];
    const targets = PERFORMANCE_CONSTANTS.ENTERPRISE_TARGETS;

    if ((metrics.throughput ?? 0) < targets.THROUGHPUT_MINIMUM) {
      recommendations.push('🚀 Optimize throughput: Consider connection pooling and message batching');}if ((metrics.latencyP95 ?? Infinity) > targets.LATENCY_P95_TARGET) {
      recommendations.push('⚡ Reduce latency: Implement caching and optimize processing pipeline');}if ((metrics.reliability ?? 0) < targets.RELIABILITY_TARGET) {
      recommendations.push('🔧 Improve reliability: Enhance error handling and connection stability');}if ((metrics.cpuUsage ?? 100) > targets.CPU_EFFICIENCY_TARGET) {
      recommendations.push('💪 Optimize CPU usage: Profile and optimize CPU-intensive operations');}if (recommendations.length === 0) {
      recommendations.push('✅ Performance targets met - continue monitoring for regressions');}return recommendations;
  }
}

/**
 * Performance testing result aggregator
 */
export class PerformanceResultsAggregator {
  /**
   * Aggregate results from multiple performance tests
   */
  static aggregateResults(results: PerformanceTestResult[]): {
    summary: PerformanceSummary;
    recommendations: string[];
    overallGrade: PerformanceGrade;
  } {
    if (results.length === 0) {
      return {
        summary: {
          totalTests: 0,
          averageThroughput: 0,
          averageLatencyP95: 0,
          averageReliability: 0,
          overallGrade: PerformanceGrade.UNACCEPTABLE,
          targetsMet: {
            allTargetsMet: false,
            targetsStatus: {},
          },
        },
        recommendations: ['Execute performance tests to gather metrics'],
        overallGrade: PerformanceGrade.UNACCEPTABLE,
      };
    }

    // Calculate aggregated metrics
    const throughputs = results.map(r => r.throughput).filter((t): t is number => t !== undefined);
    const latenciesP95 = results.map(r => r.latencyP95).filter((l): l is number => l !== undefined);
    const reliabilities = results.map(r => r.reliability).filter((r): r is number => r !== undefined);

    const avgThroughput = throughputs.length > 0
      ? throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length
      : 0;

    const avgLatencyP95 = latenciesP95.length > 0
      ? latenciesP95.reduce((sum, l) => sum + l, 0) / latenciesP95.length
      : Infinity;

    const avgReliability = reliabilities.length > 0
      ? reliabilities.reduce((sum, r) => sum + r, 0) / reliabilities.length
      : 0;

    // Calculate overall grade
    const overallGrade = PerformanceUtils.calculatePerformanceGrade(
      avgThroughput,
      avgLatencyP95,
      avgReliability
    );

    // Generate summary
    const summary = {
      totalTests: results.length,
      averageThroughput: Math.round(avgThroughput),
      averageLatencyP95: Math.round(avgLatencyP95 * 100) / 100,
      averageReliability: Math.round(avgReliability * 100) / 100,
      overallGrade,
      targetsMet: PerformanceUtils.checkTargets({
        throughput: avgThroughput,
        latencyP95: avgLatencyP95,
        reliability: avgReliability,
      }),
    };

    // Generate recommendations
    const recommendations = PerformanceUtils.generateRecommendations({
      throughput: avgThroughput,
      latencyP95: avgLatencyP95,
      reliability: avgReliability,
    });

    return {
      summary,
      recommendations,
      overallGrade,
    };
  }
}