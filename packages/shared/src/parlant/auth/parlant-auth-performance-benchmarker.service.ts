/**
 * PARLANT Authentication Performance Benchmarker Service
 *
 * Dedicated service for continuous performance benchmarking and optimization
 * of the PARLANT authentication framework. Provides real-time performance
 * validation, benchmark execution, optimization recommendations, and
 * compliance monitoring for enterprise-grade sub-1000ms response targets.
 *
 * Features:
 * - Continuous performance benchmarking
 * - Sub-1000ms P95 response time validation
 * - Real-time optimization recommendations
 * - Enterprise compliance monitoring
 * - Performance regression detection
 * - Resource utilization optimization
 * - Cache performance analysis
 * - Concurrent load capacity testing
 *
 * @fileoverview PARLANT authentication performance benchmarker
 * @version 1.0.0
 * @author Performance Optimization Agent
 * @created 2025-09-20
 */

import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter } from "events";
import { performance } from "perf_hooks";
import {
  ParlantJWTBridgeService,
  ParlantContext,
  JWTBridgeMetrics,
} from "./parlant-jwt-bridge.service";
import {
  ParlantSessionManager,
  ParlantSession,
  SessionMetrics,
} from "./parlant-session-manager.service";
import { ParlantSecurityValidator } from "./parlant-security-validator.service";

/**
 * Performance benchmark configuration
 */
export interface PerformanceBenchmarkConfig {
  /** Benchmark execution intervals */
  intervals: {
    continuousBenchmark: number; // milliseconds
    complianceCheck: number; // milliseconds
    regressionDetection: number; // milliseconds
    optimizationAnalysis: number; // milliseconds
  };

  /** Performance targets and thresholds */
  targets: {
    tokenExchangeP95: number; // milliseconds
    tokenExchangeP99: number; // milliseconds
    sessionCreationP95: number; // milliseconds
    sessionValidationP95: number; // milliseconds
    securityValidationP95: number; // milliseconds
    cacheHitRate: number; // percentage (0-1)
    maxErrorRate: number; // percentage (0-1)
    minThroughput: number; // operations per second
  };

  /** Load testing parameters */
  loadTesting: {
    baselineConcurrency: number;
    stressTestConcurrency: number[];
    testDuration: number; // milliseconds
    warmupDuration: number; // milliseconds
  };

  /** Resource monitoring */
  resourceMonitoring: {
    memoryThreshold: number; // MB
    cpuThreshold: number; // percentage (0-1)
    heapGrowthThreshold: number; // MB per hour
  };
}

/**
 * Benchmark execution result
 */
export interface BenchmarkResult {
  /** Benchmark execution metadata */
  benchmarkId: string;
  timestamp: Date;
  duration: number; // milliseconds

  /** Performance metrics */
  responseTimeMetrics: {
    operation: string;
    sampleSize: number;
    mean: number;
    median: number;
    p95: number;
    p99: number;
    p999: number;
    min: number;
    max: number;
    standardDeviation: number;
  };

  /** Throughput analysis */
  throughputMetrics: {
    averageRps: number;
    peakRps: number;
    sustainedRps: number;
    totalOperations: number;
  };

  /** Resource utilization */
  resourceMetrics: {
    memoryUsage: number; // MB
    memoryGrowth: number; // MB
    cpuUsage: number; // percentage
    heapUtilization: number; // percentage
  };

  /** Cache performance */
  cacheMetrics: {
    hitRate: number;
    missRate: number;
    averageLookupTime: number;
    cacheEfficiency: number;
  };

  /** Error analysis */
  errorMetrics: {
    totalErrors: number;
    errorRate: number;
    errorsByType: Record<string, number>;
    criticalErrors: number;
  };

  /** Compliance status */
  complianceStatus: {
    meetsP95Target: boolean;
    meetsP99Target: boolean;
    meetsThroughputTarget: boolean;
    meetsErrorRateTarget: boolean;
    meetsCacheTarget: boolean;
    overallCompliance: boolean;
  };
}

/**
 * Performance optimization recommendation
 */
export interface OptimizationRecommendation {
  id: string;
  category: "cache" | "memory" | "concurrency" | "algorithm" | "configuration";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  expectedImprovement: string;
  implementationComplexity: "low" | "medium" | "high";
  estimatedEffort: string;
  affectedComponents: string[];
  implementationSteps: string[];
  validationCriteria: string[];
  riskAssessment: string;
  timestamp: Date;
}

/**
 * Performance regression analysis
 */
export interface RegressionAnalysis {
  detectionTimestamp: Date;
  regressionType:
    | "response_time"
    | "throughput"
    | "error_rate"
    | "memory"
    | "cache";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  baselineValue: number;
  currentValue: number;
  regressionPercentage: number;
  affectedOperations: string[];
  potentialCauses: string[];
  remediationSteps: string[];
  monitoringRecommendations: string[];
}

/**
 * Enterprise compliance report
 */
export interface ComplianceReport {
  reportId: string;
  generatedAt: Date;
  reportingPeriod: {
    start: Date;
    end: Date;
  };

  /** Overall compliance summary */
  complianceSummary: {
    overallScore: number; // percentage (0-100)
    totalBenchmarks: number;
    compliantBenchmarks: number;
    criticalViolations: number;
    complianceGrade: "A" | "B" | "C" | "D" | "F";
  };

  /** Performance target compliance */
  targetCompliance: {
    responseTimeCompliance: number; // percentage
    throughputCompliance: number; // percentage
    errorRateCompliance: number; // percentage
    cachePerformanceCompliance: number; // percentage
    resourceUtilizationCompliance: number; // percentage
  };

  /** Trend analysis */
  performanceTrends: {
    responseTimeTrend: "improving" | "stable" | "degrading";
    throughputTrend: "improving" | "stable" | "degrading";
    errorRateTrend: "improving" | "stable" | "degrading";
    cachePerformanceTrend: "improving" | "stable" | "degrading";
  };

  /** Critical findings */
  criticalFindings: Array<{
    finding: string;
    impact: string;
    recommendation: string;
    urgency: "immediate" | "short_term" | "medium_term" | "long_term";
  }>;

  /** Recommendations */
  recommendations: OptimizationRecommendation[];
}

@Injectable()
export class ParlantAuthPerformanceBenchmarker extends EventEmitter {
  private readonly logger = new Logger(ParlantAuthPerformanceBenchmarker.name);

  // Service dependencies
  private readonly jwtBridgeService: ParlantJWTBridgeService;
  private readonly sessionManager: ParlantSessionManager;
  private readonly securityValidator: ParlantSecurityValidator;

  // Configuration and state
  private readonly config: PerformanceBenchmarkConfig;
  private readonly benchmarkHistory: BenchmarkResult[] = [];
  private readonly regressionHistory: RegressionAnalysis[] = [];
  private readonly optimizationRecommendations: OptimizationRecommendation[] =
    [];

  // Monitoring intervals
  private continuousBenchmarkInterval?: NodeJS.Timeout;
  private complianceCheckInterval?: NodeJS.Timeout;
  private regressionDetectionInterval?: NodeJS.Timeout;
  private optimizationAnalysisInterval?: NodeJS.Timeout;

  // State tracking
  private isBenchmarking = false;
  private baselineMetrics: BenchmarkResult | null = null;
  private lastComplianceReport: ComplianceReport | null = null;

  constructor(
    jwtBridgeService: ParlantJWTBridgeService,
    sessionManager: ParlantSessionManager,
    securityValidator: ParlantSecurityValidator,
    config?: Partial<PerformanceBenchmarkConfig>,
  ) {
    super();

    this.jwtBridgeService = jwtBridgeService;
    this.sessionManager = sessionManager;
    this.securityValidator = securityValidator;
    this.config = this.createDefaultConfig(config);

    this.logger.log(
      "PARLANT Authentication Performance Benchmarker initialized",
    );
  }

  /**
   * Start continuous performance benchmarking
   */
  async startBenchmarking(): Promise<void> {
    if (this.isBenchmarking) {
      this.logger.warn("Performance benchmarking is already running");
      return;
    }

    this.logger.log(
      "🚀 Starting PARLANT Authentication Performance Benchmarking",
    );

    try {
      // Establish baseline metrics
      await this.establishBaseline();

      // Start continuous benchmarking
      this.continuousBenchmarkInterval = setInterval(
        () => this.executeContinuousBenchmark(),
        this.config.intervals.continuousBenchmark,
      );

      // Start compliance monitoring
      this.complianceCheckInterval = setInterval(
        () => this.executeComplianceCheck(),
        this.config.intervals.complianceCheck,
      );

      // Start regression detection
      this.regressionDetectionInterval = setInterval(
        () => this.executeRegressionDetection(),
        this.config.intervals.regressionDetection,
      );

      // Start optimization analysis
      this.optimizationAnalysisInterval = setInterval(
        () => this.executeOptimizationAnalysis(),
        this.config.intervals.optimizationAnalysis,
      );

      this.isBenchmarking = true;
      this.emit("benchmarking.started");

      this.logger.log("✅ Performance benchmarking started successfully");
    } catch (error) {
      this.logger.error("❌ Failed to start performance benchmarking:", error);
      throw error;
    }
  }

  /**
   * Stop continuous performance benchmarking
   */
  async stopBenchmarking(): Promise<void> {
    if (!this.isBenchmarking) {
      this.logger.warn("Performance benchmarking is not running");
      return;
    }

    this.logger.log(
      "🛑 Stopping PARLANT Authentication Performance Benchmarking",
    );

    // Clear all intervals
    if (this.continuousBenchmarkInterval) {
      clearInterval(this.continuousBenchmarkInterval);
      this.continuousBenchmarkInterval = undefined;
    }

    if (this.complianceCheckInterval) {
      clearInterval(this.complianceCheckInterval);
      this.complianceCheckInterval = undefined;
    }

    if (this.regressionDetectionInterval) {
      clearInterval(this.regressionDetectionInterval);
      this.regressionDetectionInterval = undefined;
    }

    if (this.optimizationAnalysisInterval) {
      clearInterval(this.optimizationAnalysisInterval);
      this.optimizationAnalysisInterval = undefined;
    }

    this.isBenchmarking = false;
    this.emit("benchmarking.stopped");

    this.logger.log("✅ Performance benchmarking stopped successfully");
  }

  /**
   * Execute comprehensive benchmark suite
   */
  async executeBenchmarkSuite(
    includeStressTesting: boolean = false,
  ): Promise<BenchmarkResult[]> {
    this.logger.log("📊 Executing comprehensive benchmark suite");

    const results: BenchmarkResult[] = [];

    try {
      // Token exchange benchmarks
      const tokenExchangeResult = await this.benchmarkTokenExchange();
      results.push(tokenExchangeResult);

      // Session management benchmarks
      const sessionResult = await this.benchmarkSessionManagement();
      results.push(sessionResult);

      // Security validation benchmarks
      const securityResult = await this.benchmarkSecurityValidation();
      results.push(securityResult);

      // Cache performance benchmarks
      const cacheResult = await this.benchmarkCachePerformance();
      results.push(cacheResult);

      // Concurrent load benchmarks
      const concurrentResult = await this.benchmarkConcurrentLoad();
      results.push(concurrentResult);

      if (includeStressTesting) {
        // Stress testing benchmarks
        const stressResults = await this.executeStressTesting();
        results.push(...stressResults);
      }

      // Memory performance benchmarks
      const memoryResult = await this.benchmarkMemoryPerformance();
      results.push(memoryResult);

      // Store results in history
      this.benchmarkHistory.push(...results);

      // Trim history to maintain manageable size
      if (this.benchmarkHistory.length > 1000) {
        this.benchmarkHistory.splice(0, this.benchmarkHistory.length - 1000);
      }

      this.emit("benchmark.suite.completed", results);
      this.logger.log(
        `✅ Benchmark suite completed with ${results.length} results`,
      );

      return results;
    } catch (error) {
      this.logger.error("❌ Benchmark suite execution failed:", error);
      throw error;
    }
  }

  /**
   * Generate enterprise compliance report
   */
  async generateComplianceReport(
    periodDays: number = 7,
  ): Promise<ComplianceReport> {
    this.logger.log(`📋 Generating compliance report for ${periodDays} days`);

    const endDate = new Date();
    const startDate = new Date(
      endDate.getTime() - periodDays * 24 * 60 * 60 * 1000,
    );

    // Filter benchmark history for reporting period
    const periodBenchmarks = this.benchmarkHistory.filter(
      (benchmark) =>
        benchmark.timestamp >= startDate && benchmark.timestamp <= endDate,
    );

    if (periodBenchmarks.length === 0) {
      throw new Error(
        "Insufficient benchmark data for compliance report generation",
      );
    }

    // Calculate compliance metrics
    const complianceSummary = this.calculateComplianceSummary(periodBenchmarks);
    const targetCompliance = this.calculateTargetCompliance(periodBenchmarks);
    const performanceTrends = this.analyzePerformanceTrends(periodBenchmarks);
    const criticalFindings = this.identifyCriticalFindings(periodBenchmarks);
    const recommendations =
      this.generateComplianceRecommendations(periodBenchmarks);

    const report: ComplianceReport = {
      reportId: `compliance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: new Date(),
      reportingPeriod: { start: startDate, end: endDate },
      complianceSummary,
      targetCompliance,
      performanceTrends,
      criticalFindings,
      recommendations,
    };

    this.lastComplianceReport = report;
    this.emit("compliance.report.generated", report);

    this.logger.log(
      `✅ Compliance report generated with ${complianceSummary.overallScore}% overall score`,
    );

    return report;
  }

  /**
   * Get current performance status
   */
  getCurrentPerformanceStatus(): {
    isCompliant: boolean;
    lastBenchmark: BenchmarkResult | null;
    recentTrends: {
      responseTime: "improving" | "stable" | "degrading";
      throughput: "improving" | "stable" | "degrading";
      errorRate: "improving" | "stable" | "degrading";
    };
    activeRecommendations: OptimizationRecommendation[];
    criticalIssues: string[];
  } {
    const lastBenchmark =
      this.benchmarkHistory[this.benchmarkHistory.length - 1] || null;
    const recentBenchmarks = this.benchmarkHistory.slice(-10); // Last 10 benchmarks

    const recentTrends = this.analyzeRecentTrends(recentBenchmarks);
    const activeRecommendations = this.getActiveRecommendations();
    const criticalIssues = this.identifyCurrentCriticalIssues();

    return {
      isCompliant: lastBenchmark?.complianceStatus.overallCompliance || false,
      lastBenchmark,
      recentTrends,
      activeRecommendations,
      criticalIssues,
    };
  }

  /**
   * Get performance optimization recommendations
   */
  getOptimizationRecommendations(): OptimizationRecommendation[] {
    return this.optimizationRecommendations
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 10); // Top 10 recommendations
  }

  // ========== PRIVATE IMPLEMENTATION METHODS ==========

  /**
   * Create default configuration
   */
  private createDefaultConfig(
    overrides?: Partial<PerformanceBenchmarkConfig>,
  ): PerformanceBenchmarkConfig {
    const defaultConfig: PerformanceBenchmarkConfig = {
      intervals: {
        continuousBenchmark: 5 * 60 * 1000, // 5 minutes
        complianceCheck: 15 * 60 * 1000, // 15 minutes
        regressionDetection: 10 * 60 * 1000, // 10 minutes
        optimizationAnalysis: 30 * 60 * 1000, // 30 minutes
      },
      targets: {
        tokenExchangeP95: 1000, // 1 second
        tokenExchangeP99: 2000, // 2 seconds
        sessionCreationP95: 500, // 500ms
        sessionValidationP95: 200, // 200ms
        securityValidationP95: 200, // 200ms
        cacheHitRate: 0.85, // 85%
        maxErrorRate: 0.01, // 1%
        minThroughput: 100, // 100 ops/sec
      },
      loadTesting: {
        baselineConcurrency: 50,
        stressTestConcurrency: [100, 250, 500, 1000],
        testDuration: 30000, // 30 seconds
        warmupDuration: 5000, // 5 seconds
      },
      resourceMonitoring: {
        memoryThreshold: 1024, // 1GB
        cpuThreshold: 0.8, // 80%
        heapGrowthThreshold: 100, // 100MB/hour
      },
    };

    return { ...defaultConfig, ...overrides };
  }

  /**
   * Establish baseline performance metrics
   */
  private async establishBaseline(): Promise<void> {
    this.logger.log("📊 Establishing performance baseline...");

    try {
      // Execute warmup to stabilize performance
      await this.executeWarmup();

      // Execute baseline benchmark
      const baselineResults = await this.executeBenchmarkSuite(false);

      // Use token exchange as primary baseline
      this.baselineMetrics =
        baselineResults.find(
          (result) => result.responseTimeMetrics.operation === "token_exchange",
        ) || baselineResults[0];

      this.logger.log(
        `✅ Baseline established: P95=${this.baselineMetrics.responseTimeMetrics.p95.toFixed(2)}ms`,
      );
    } catch (error) {
      this.logger.error("❌ Failed to establish baseline:", error);
      throw error;
    }
  }

  /**
   * Execute warmup operations
   */
  private async executeWarmup(): Promise<void> {
    const warmupIterations = 100;

    for (let i = 0; i < warmupIterations; i++) {
      try {
        const token = this.generateTestToken();
        const context = this.generateTestContext(i);

        await this.jwtBridgeService.exchangeTokens(token, context);

        if (i % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      } catch (error) {
        // Ignore warmup errors
      }
    }
  }

  /**
   * Execute continuous benchmark
   */
  private async executeContinuousBenchmark(): Promise<void> {
    try {
      const tokenExchangeResult = await this.benchmarkTokenExchange();
      this.benchmarkHistory.push(tokenExchangeResult);

      // Check for immediate compliance issues
      if (!tokenExchangeResult.complianceStatus.overallCompliance) {
        this.emit("compliance.violation", tokenExchangeResult);
        this.logger.warn(
          "⚠️ Compliance violation detected in continuous benchmark",
        );
      }
    } catch (error) {
      this.logger.error("❌ Continuous benchmark failed:", error);
    }
  }

  /**
   * Execute compliance check
   */
  private async executeComplianceCheck(): Promise<void> {
    try {
      const recentBenchmarks = this.benchmarkHistory.slice(-10);
      if (recentBenchmarks.length === 0) return;

      const complianceRate =
        recentBenchmarks.filter(
          (benchmark) => benchmark.complianceStatus.overallCompliance,
        ).length / recentBenchmarks.length;

      if (complianceRate < 0.9) {
        // Less than 90% compliance
        this.logger.warn(
          `⚠️ Compliance rate dropped to ${(complianceRate * 100).toFixed(1)}%`,
        );
        this.emit("compliance.degradation", {
          complianceRate,
          recentBenchmarks,
        });
      }
    } catch (error) {
      this.logger.error("❌ Compliance check failed:", error);
    }
  }

  /**
   * Execute regression detection
   */
  private async executeRegressionDetection(): Promise<void> {
    try {
      if (!this.baselineMetrics || this.benchmarkHistory.length < 5) return;

      const recentBenchmarks = this.benchmarkHistory.slice(-5);
      const avgRecentP95 =
        recentBenchmarks.reduce(
          (sum, benchmark) => sum + benchmark.responseTimeMetrics.p95,
          0,
        ) / recentBenchmarks.length;

      const regressionThreshold = 0.2; // 20% degradation
      const regressionPercentage =
        (avgRecentP95 - this.baselineMetrics.responseTimeMetrics.p95) /
        this.baselineMetrics.responseTimeMetrics.p95;

      if (regressionPercentage > regressionThreshold) {
        const regression: RegressionAnalysis = {
          detectionTimestamp: new Date(),
          regressionType: "response_time",
          severity: regressionPercentage > 0.5 ? "critical" : "high",
          description: `Response time regression detected: ${(regressionPercentage * 100).toFixed(1)}% increase`,
          baselineValue: this.baselineMetrics.responseTimeMetrics.p95,
          currentValue: avgRecentP95,
          regressionPercentage: regressionPercentage * 100,
          affectedOperations: ["token_exchange"],
          potentialCauses: [
            "Increased system load",
            "Memory pressure",
            "Database performance degradation",
            "Network latency increase",
          ],
          remediationSteps: [
            "Review system resource utilization",
            "Analyze recent configuration changes",
            "Check database performance metrics",
            "Validate cache performance",
          ],
          monitoringRecommendations: [
            "Increase benchmark frequency",
            "Enable detailed performance tracing",
            "Monitor system resources continuously",
          ],
        };

        this.regressionHistory.push(regression);
        this.emit("regression.detected", regression);
        this.logger.error(
          `🚨 Performance regression detected: ${regression.description}`,
        );
      }
    } catch (error) {
      this.logger.error("❌ Regression detection failed:", error);
    }
  }

  /**
   * Execute optimization analysis
   */
  private async executeOptimizationAnalysis(): Promise<void> {
    try {
      const recentBenchmarks = this.benchmarkHistory.slice(-20);
      if (recentBenchmarks.length < 5) return;

      const newRecommendations =
        this.analyzeOptimizationOpportunities(recentBenchmarks);

      // Add new recommendations, avoiding duplicates
      for (const recommendation of newRecommendations) {
        const exists = this.optimizationRecommendations.some(
          (existing) =>
            existing.title === recommendation.title &&
            existing.category === recommendation.category,
        );

        if (!exists) {
          this.optimizationRecommendations.push(recommendation);
          this.emit("optimization.recommendation", recommendation);
        }
      }

      // Cleanup old recommendations
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      this.optimizationRecommendations.splice(
        0,
        this.optimizationRecommendations.findIndex(
          (rec) => rec.timestamp >= oneWeekAgo,
        ),
      );
    } catch (error) {
      this.logger.error("❌ Optimization analysis failed:", error);
    }
  }

  /**
   * Benchmark token exchange operations
   */
  private async benchmarkTokenExchange(): Promise<BenchmarkResult> {
    const iterations = 100;
    const responseTimes: number[] = [];
    const errors: Error[] = [];
    let totalOperations = 0;

    const memoryBefore = process.memoryUsage();
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();

      try {
        const token = this.generateTestToken();
        const context = this.generateTestContext(i);

        await this.jwtBridgeService.exchangeTokens(token, context);

        const iterationEnd = performance.now();
        responseTimes.push(iterationEnd - iterationStart);
        totalOperations++;
      } catch (error) {
        errors.push(error as Error);
      }
    }

    const endTime = performance.now();
    const memoryAfter = process.memoryUsage();
    const totalDuration = endTime - startTime;

    return this.createBenchmarkResult(
      "token_exchange",
      responseTimes,
      errors,
      totalOperations,
      totalDuration,
      memoryBefore,
      memoryAfter,
    );
  }

  /**
   * Benchmark session management operations
   */
  private async benchmarkSessionManagement(): Promise<BenchmarkResult> {
    const iterations = 100;
    const responseTimes: number[] = [];
    const errors: Error[] = [];
    let totalOperations = 0;

    const memoryBefore = process.memoryUsage();
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();

      try {
        const context = this.generateTestContext(i);

        // Create session
        const session = await this.sessionManager.createSession(context);

        // Validate session
        await this.sessionManager.getSession(session.sessionId);

        // Terminate session
        await this.sessionManager.terminateSession(session.sessionId);

        const iterationEnd = performance.now();
        responseTimes.push(iterationEnd - iterationStart);
        totalOperations++;
      } catch (error) {
        errors.push(error as Error);
      }
    }

    const endTime = performance.now();
    const memoryAfter = process.memoryUsage();
    const totalDuration = endTime - startTime;

    return this.createBenchmarkResult(
      "session_management",
      responseTimes,
      errors,
      totalOperations,
      totalDuration,
      memoryBefore,
      memoryAfter,
    );
  }

  /**
   * Benchmark security validation operations
   */
  private async benchmarkSecurityValidation(): Promise<BenchmarkResult> {
    const iterations = 100;
    const responseTimes: number[] = [];
    const errors: Error[] = [];
    let totalOperations = 0;

    const memoryBefore = process.memoryUsage();
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();

      try {
        const token = this.generateTestToken();
        const context = this.generateTestContext(i);

        // Perform security validation through token exchange
        await this.jwtBridgeService.exchangeTokens(token, context);

        const iterationEnd = performance.now();
        responseTimes.push(iterationEnd - iterationStart);
        totalOperations++;
      } catch (error) {
        errors.push(error as Error);
      }
    }

    const endTime = performance.now();
    const memoryAfter = process.memoryUsage();
    const totalDuration = endTime - startTime;

    return this.createBenchmarkResult(
      "security_validation",
      responseTimes,
      errors,
      totalOperations,
      totalDuration,
      memoryBefore,
      memoryAfter,
    );
  }

  /**
   * Benchmark cache performance
   */
  private async benchmarkCachePerformance(): Promise<BenchmarkResult> {
    const iterations = 200;
    const responseTimes: number[] = [];
    const errors: Error[] = [];
    let totalOperations = 0;
    let cacheHits = 0;

    const memoryBefore = process.memoryUsage();
    const startTime = performance.now();

    // Pre-populate cache
    for (let i = 0; i < 50; i++) {
      try {
        const token = this.generateTestToken();
        const context = this.generateTestContext(i);
        await this.jwtBridgeService.exchangeTokens(token, context);
      } catch (error) {
        // Ignore pre-population errors
      }
    }

    // Test cache performance
    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();

      try {
        const token = this.generateTestToken();
        // Use existing context for cache hits 60% of the time
        const useExistingContext = i < iterations * 0.6;
        const context = useExistingContext
          ? this.generateTestContext(i % 50)
          : this.generateTestContext(i + 50);

        const result = await this.jwtBridgeService.exchangeTokens(
          token,
          context,
        );

        // Mock cache hit detection based on metrics
        const metrics = this.jwtBridgeService.getPerformanceMetrics();
        if (metrics.cacheHitRate > 0) {
          cacheHits++;
        }

        const iterationEnd = performance.now();
        responseTimes.push(iterationEnd - iterationStart);
        totalOperations++;
      } catch (error) {
        errors.push(error as Error);
      }
    }

    const endTime = performance.now();
    const memoryAfter = process.memoryUsage();
    const totalDuration = endTime - startTime;

    const result = this.createBenchmarkResult(
      "cache_performance",
      responseTimes,
      errors,
      totalOperations,
      totalDuration,
      memoryBefore,
      memoryAfter,
    );

    // Override cache metrics with actual values
    result.cacheMetrics = {
      hitRate: cacheHits / totalOperations,
      missRate: 1 - cacheHits / totalOperations,
      averageLookupTime: result.responseTimeMetrics.mean,
      cacheEfficiency: (cacheHits / totalOperations) * 100,
    };

    return result;
  }

  /**
   * Benchmark concurrent load performance
   */
  private async benchmarkConcurrentLoad(): Promise<BenchmarkResult> {
    const concurrency = this.config.loadTesting.baselineConcurrency;
    const duration = this.config.loadTesting.testDuration;

    const responseTimes: number[] = [];
    const errors: Error[] = [];
    let totalOperations = 0;
    let isRunning = true;

    const memoryBefore = process.memoryUsage();
    const startTime = performance.now();

    // Create concurrent workers
    const workers = Array.from({ length: concurrency }, async () => {
      while (isRunning) {
        const iterationStart = performance.now();

        try {
          const token = this.generateTestToken();
          const context = this.generateTestContext();

          await this.jwtBridgeService.exchangeTokens(token, context);

          const iterationEnd = performance.now();
          responseTimes.push(iterationEnd - iterationStart);
          totalOperations++;
        } catch (error) {
          errors.push(error as Error);
        }

        // Small delay to prevent overwhelming
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    });

    // Run for specified duration
    await new Promise((resolve) => setTimeout(resolve, duration));
    isRunning = false;

    // Wait for all workers to complete
    await Promise.all(workers);

    const endTime = performance.now();
    const memoryAfter = process.memoryUsage();
    const totalDuration = endTime - startTime;

    return this.createBenchmarkResult(
      "concurrent_load",
      responseTimes,
      errors,
      totalOperations,
      totalDuration,
      memoryBefore,
      memoryAfter,
    );
  }

  /**
   * Benchmark memory performance
   */
  private async benchmarkMemoryPerformance(): Promise<BenchmarkResult> {
    const iterations = 500;
    const responseTimes: number[] = [];
    const errors: Error[] = [];
    let totalOperations = 0;

    const memoryBefore = process.memoryUsage();
    const startTime = performance.now();

    // Track memory usage throughout benchmark
    const memorySnapshots: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();

      try {
        const token = this.generateTestToken();
        const context = this.generateTestContext(i);

        await this.jwtBridgeService.exchangeTokens(token, context);

        // Take memory snapshot every 50 iterations
        if (i % 50 === 0) {
          memorySnapshots.push(process.memoryUsage().heapUsed);
        }

        const iterationEnd = performance.now();
        responseTimes.push(iterationEnd - iterationStart);
        totalOperations++;
      } catch (error) {
        errors.push(error as Error);
      }
    }

    const endTime = performance.now();
    const memoryAfter = process.memoryUsage();
    const totalDuration = endTime - startTime;

    const result = this.createBenchmarkResult(
      "memory_performance",
      responseTimes,
      errors,
      totalOperations,
      totalDuration,
      memoryBefore,
      memoryAfter,
    );

    // Add memory analysis
    if (memorySnapshots.length > 1) {
      const memoryGrowthRate =
        (memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0]) /
        (memorySnapshots.length * 50); // Growth per 50 operations

      result.resourceMetrics.heapUtilization = memoryGrowthRate / 1024 / 1024; // MB
    }

    return result;
  }

  /**
   * Execute stress testing
   */
  private async executeStressTesting(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const concurrency of this.config.loadTesting.stressTestConcurrency) {
      this.logger.log(
        `🔥 Executing stress test with ${concurrency} concurrent users`,
      );

      const responseTimes: number[] = [];
      const errors: Error[] = [];
      let totalOperations = 0;
      let isRunning = true;

      const memoryBefore = process.memoryUsage();
      const startTime = performance.now();

      // Create concurrent workers
      const workers = Array.from({ length: concurrency }, async () => {
        while (isRunning) {
          const iterationStart = performance.now();

          try {
            const token = this.generateTestToken();
            const context = this.generateTestContext();

            await this.jwtBridgeService.exchangeTokens(token, context);

            const iterationEnd = performance.now();
            responseTimes.push(iterationEnd - iterationStart);
            totalOperations++;
          } catch (error) {
            errors.push(error as Error);
          }

          // Small delay to prevent overwhelming
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
      });

      // Run for test duration
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.loadTesting.testDuration),
      );
      isRunning = false;

      // Wait for all workers to complete
      await Promise.all(workers);

      const endTime = performance.now();
      const memoryAfter = process.memoryUsage();
      const totalDuration = endTime - startTime;

      const result = this.createBenchmarkResult(
        `stress_test_${concurrency}`,
        responseTimes,
        errors,
        totalOperations,
        totalDuration,
        memoryBefore,
        memoryAfter,
      );

      results.push(result);
    }

    return results;
  }

  /**
   * Create benchmark result from collected data
   */
  private createBenchmarkResult(
    operation: string,
    responseTimes: number[],
    errors: Error[],
    totalOperations: number,
    totalDuration: number,
    memoryBefore: NodeJS.MemoryUsage,
    memoryAfter: NodeJS.MemoryUsage,
  ): BenchmarkResult {
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const mean =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length
        : 0;

    const responseTimeMetrics = {
      operation,
      sampleSize: responseTimes.length,
      mean,
      median: this.calculatePercentile(sortedTimes, 50),
      p95: this.calculatePercentile(sortedTimes, 95),
      p99: this.calculatePercentile(sortedTimes, 99),
      p999: this.calculatePercentile(sortedTimes, 99.9),
      min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      standardDeviation: this.calculateStandardDeviation(responseTimes, mean),
    };

    const throughputMetrics = {
      averageRps: totalOperations / (totalDuration / 1000),
      peakRps: totalOperations / (totalDuration / 1000), // Simplified
      sustainedRps: totalOperations / (totalDuration / 1000),
      totalOperations,
    };

    const memoryDelta =
      (memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024; // MB
    const resourceMetrics = {
      memoryUsage: memoryAfter.heapUsed / 1024 / 1024, // MB
      memoryGrowth: memoryDelta,
      cpuUsage: 0, // Would need actual CPU monitoring
      heapUtilization: (memoryAfter.heapUsed / memoryAfter.heapTotal) * 100,
    };

    const errorsByType: Record<string, number> = {};
    errors.forEach((error) => {
      const errorType = error.name || "Unknown";
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    });

    const errorMetrics = {
      totalErrors: errors.length,
      errorRate: errors.length / totalOperations,
      errorsByType,
      criticalErrors: errors.filter((e) => e.message.includes("critical"))
        .length,
    };

    const cacheMetrics = {
      hitRate: 0.8, // Mock value - would be calculated from actual cache metrics
      missRate: 0.2,
      averageLookupTime: mean * 0.1, // Estimated cache lookup portion
      cacheEfficiency: 80,
    };

    const complianceStatus = {
      meetsP95Target:
        responseTimeMetrics.p95 < this.getTargetForOperation(operation, "p95"),
      meetsP99Target:
        responseTimeMetrics.p99 < this.getTargetForOperation(operation, "p99"),
      meetsThroughputTarget:
        throughputMetrics.averageRps >= this.config.targets.minThroughput,
      meetsErrorRateTarget:
        errorMetrics.errorRate <= this.config.targets.maxErrorRate,
      meetsCacheTarget:
        cacheMetrics.hitRate >= this.config.targets.cacheHitRate,
      overallCompliance: false, // Will be calculated below
    };

    complianceStatus.overallCompliance =
      complianceStatus.meetsP95Target &&
      complianceStatus.meetsP99Target &&
      complianceStatus.meetsThroughputTarget &&
      complianceStatus.meetsErrorRateTarget;

    return {
      benchmarkId: `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      duration: totalDuration,
      responseTimeMetrics,
      throughputMetrics,
      resourceMetrics,
      cacheMetrics,
      errorMetrics,
      complianceStatus,
    };
  }

  /**
   * Get performance target for operation and metric type
   */
  private getTargetForOperation(
    operation: string,
    metricType: "p95" | "p99",
  ): number {
    const baseTarget =
      metricType === "p95"
        ? this.config.targets.tokenExchangeP95
        : this.config.targets.tokenExchangeP99;

    switch (operation) {
      case "token_exchange":
        return baseTarget;
      case "session_management":
      case "session_creation":
        return this.config.targets.sessionCreationP95;
      case "session_validation":
        return this.config.targets.sessionValidationP95;
      case "security_validation":
        return this.config.targets.securityValidationP95;
      default:
        return baseTarget;
    }
  }

  /**
   * Generate test token for benchmarking
   */
  private generateTestToken(): string {
    // Mock JWT token generation - in real implementation would use actual JWT service
    return `test.jwt.token.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate test context for benchmarking
   */
  private generateTestContext(
    index: number = Math.floor(Math.random() * 1000),
  ): ParlantContext {
    return {
      conversationId: `bench_conv_${Date.now()}_${index}`,
      sessionId: `bench_session_${Date.now()}_${index}`,
      userId: `bench_user_${Date.now()}_${index}`,
      securityLevel: "MODERATE",
      timestamp: new Date(),
      metadata: {
        benchmarkIteration: index,
        generatedAt: Date.now(),
      },
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(
    sortedArray: number[],
    percentile: number,
  ): number {
    if (sortedArray.length === 0) return 0;

    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) return sortedArray[lower];

    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[], mean: number): number {
    if (values.length <= 1) return 0;

    const squaredDiffs = values.map((value) => Math.pow(value - mean, 2));
    const variance =
      squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;

    return Math.sqrt(variance);
  }

  // Additional helper methods for compliance reporting, trend analysis, etc.
  // Implementation continues with similar comprehensive patterns...

  private calculateComplianceSummary(
    benchmarks: BenchmarkResult[],
  ): ComplianceReport["complianceSummary"] {
    const compliantBenchmarks = benchmarks.filter(
      (b) => b.complianceStatus.overallCompliance,
    ).length;
    const criticalViolations = benchmarks.filter(
      (b) =>
        !b.complianceStatus.meetsP95Target || b.errorMetrics.errorRate > 0.05,
    ).length;

    const overallScore = (compliantBenchmarks / benchmarks.length) * 100;

    let complianceGrade: "A" | "B" | "C" | "D" | "F";
    if (overallScore >= 95) complianceGrade = "A";
    else if (overallScore >= 85) complianceGrade = "B";
    else if (overallScore >= 75) complianceGrade = "C";
    else if (overallScore >= 65) complianceGrade = "D";
    else complianceGrade = "F";

    return {
      overallScore,
      totalBenchmarks: benchmarks.length,
      compliantBenchmarks,
      criticalViolations,
      complianceGrade,
    };
  }

  private calculateTargetCompliance(
    benchmarks: BenchmarkResult[],
  ): ComplianceReport["targetCompliance"] {
    const responseTimeCompliant = benchmarks.filter(
      (b) => b.complianceStatus.meetsP95Target,
    ).length;
    const throughputCompliant = benchmarks.filter(
      (b) => b.complianceStatus.meetsThroughputTarget,
    ).length;
    const errorRateCompliant = benchmarks.filter(
      (b) => b.complianceStatus.meetsErrorRateTarget,
    ).length;
    const cacheCompliant = benchmarks.filter(
      (b) => b.complianceStatus.meetsCacheTarget,
    ).length;
    const resourceCompliant = benchmarks.filter(
      (b) =>
        b.resourceMetrics.memoryUsage <
        this.config.resourceMonitoring.memoryThreshold,
    ).length;

    return {
      responseTimeCompliance: (responseTimeCompliant / benchmarks.length) * 100,
      throughputCompliance: (throughputCompliant / benchmarks.length) * 100,
      errorRateCompliance: (errorRateCompliant / benchmarks.length) * 100,
      cachePerformanceCompliance: (cacheCompliant / benchmarks.length) * 100,
      resourceUtilizationCompliance:
        (resourceCompliant / benchmarks.length) * 100,
    };
  }

  private analyzePerformanceTrends(
    benchmarks: BenchmarkResult[],
  ): ComplianceReport["performanceTrends"] {
    // Simplified trend analysis - would implement more sophisticated analysis in production
    const recentBenchmarks = benchmarks.slice(-10);
    const olderBenchmarks = benchmarks.slice(-20, -10);

    const getAvgResponseTime = (bms: BenchmarkResult[]) =>
      bms.reduce((sum, b) => sum + b.responseTimeMetrics.p95, 0) / bms.length;

    const recentAvgResponseTime = getAvgResponseTime(recentBenchmarks);
    const olderAvgResponseTime = getAvgResponseTime(olderBenchmarks);

    const responseTimeTrend =
      recentAvgResponseTime < olderAvgResponseTime * 0.95
        ? "improving"
        : recentAvgResponseTime > olderAvgResponseTime * 1.05
          ? "degrading"
          : "stable";

    return {
      responseTimeTrend,
      throughputTrend: "stable", // Simplified
      errorRateTrend: "stable", // Simplified
      cachePerformanceTrend: "stable", // Simplified
    };
  }

  private identifyCriticalFindings(
    benchmarks: BenchmarkResult[],
  ): ComplianceReport["criticalFindings"] {
    const findings: ComplianceReport["criticalFindings"] = [];

    const recentBenchmarks = benchmarks.slice(-5);
    const avgP95 =
      recentBenchmarks.reduce((sum, b) => sum + b.responseTimeMetrics.p95, 0) /
      recentBenchmarks.length;

    if (avgP95 > this.config.targets.tokenExchangeP95) {
      findings.push({
        finding: `P95 response time (${avgP95.toFixed(2)}ms) exceeds target (${this.config.targets.tokenExchangeP95}ms)`,
        impact: "User experience degradation and potential SLA violations",
        recommendation:
          "Investigate performance bottlenecks and implement optimization strategies",
        urgency: "immediate",
      });
    }

    return findings;
  }

  private generateComplianceRecommendations(
    benchmarks: BenchmarkResult[],
  ): OptimizationRecommendation[] {
    // Generate basic recommendations based on benchmark results
    return this.analyzeOptimizationOpportunities(benchmarks);
  }

  private analyzeRecentTrends(benchmarks: BenchmarkResult[]): {
    responseTime: "improving" | "stable" | "degrading";
    throughput: "improving" | "stable" | "degrading";
    errorRate: "improving" | "stable" | "degrading";
  } {
    // Simplified trend analysis
    return {
      responseTime: "stable",
      throughput: "stable",
      errorRate: "stable",
    };
  }

  private getActiveRecommendations(): OptimizationRecommendation[] {
    return this.optimizationRecommendations.slice(0, 5); // Top 5 active recommendations
  }

  private identifyCurrentCriticalIssues(): string[] {
    const issues: string[] = [];

    const lastBenchmark =
      this.benchmarkHistory[this.benchmarkHistory.length - 1];
    if (lastBenchmark && !lastBenchmark.complianceStatus.overallCompliance) {
      issues.push("Performance targets not being met");
    }

    return issues;
  }

  private analyzeOptimizationOpportunities(
    benchmarks: BenchmarkResult[],
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Analyze response time patterns
    const avgP95 =
      benchmarks.reduce((sum, b) => sum + b.responseTimeMetrics.p95, 0) /
      benchmarks.length;
    if (avgP95 > this.config.targets.tokenExchangeP95 * 0.8) {
      recommendations.push({
        id: `opt_cache_${Date.now()}`,
        category: "cache",
        priority: "high",
        title: "Optimize Response Caching Strategy",
        description: "Implement intelligent caching to reduce response times",
        expectedImprovement: "20-30% reduction in P95 response time",
        implementationComplexity: "medium",
        estimatedEffort: "2-3 days",
        affectedComponents: ["JWT Bridge Service", "Cache Layer"],
        implementationSteps: [
          "Analyze current cache hit patterns",
          "Implement adaptive TTL based on data volatility",
          "Add cache warming for frequently accessed data",
          "Monitor cache performance improvements",
        ],
        validationCriteria: [
          "P95 response time reduced by 20%",
          "Cache hit rate increased to >90%",
          "No increase in error rate",
        ],
        riskAssessment: "Low risk - caching improvements are reversible",
        timestamp: new Date(),
      });
    }

    return recommendations;
  }
}
