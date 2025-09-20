/**
 * Performance Regression Testing and Alerting Service - Phase 1 Implementation
 *
 * Comprehensive performance regression detection, analysis, and alerting system
 * for WebSocket performance monitoring with automated baseline tracking.
 *
 * Features:
 * - Automated baseline performance tracking and management
 * - Multi-dimensional regression analysis (latency, throughput, resource usage)
 * - Statistical significance testing for performance changes
 * - Real-time regression detection and alerting
 * - Performance trend analysis and forecasting
 * - Automated performance testing pipeline integration
 * - Custom regression severity classification
 * - Performance anomaly detection and correlation analysis
 * - Historical performance comparison and reporting
 * - Automated remediation recommendations
 *
 * @module PerformanceRegressionTestingService
 * @version 1.0.0
 * @author PARLANT Performance Testing Team
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';import { ConfigService } from '@nestjs/config';import { EventEmitter } from 'events';import { performance } from 'perf_hooks';// ===== PERFORMANCE REGRESSION TYPES =====/**
 * Types of performance regression analysis
 */
export enum RegressionTestType {
  BASELINE_COMPARISON = 'baseline_comparison',     // Compare against established baselineHISTORICAL_COMPARISON = 'historical_comparison', // Compare against historical dataSLIDING_WINDOW = 'sliding_window',               // Compare against recent performance windowSTATISTICAL_ANALYSIS = 'statistical_analysis',   // Statistical significance testingANOMALY_DETECTION = 'anomaly_detection',         // Detect performance anomaliesTREND_ANALYSIS = 'trend_analysis',               // Analyze performance trendsCI_CD_INTEGRATION = 'ci_cd_integration',         // CI/CD pipeline integration}/**
 * Performance metrics for regression analysis
 */
export interface PerformanceMetrics {
  timestamp: number;
  testId: string;
  buildVersion?: string;
  commitHash?: string;

  // Core performance metrics
  throughput: {
    messagesPerSecond: number;
    peakThroughput: number;
    sustainedThroughput: number;
    averageThroughput: number;
  };

  latency: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    p999: number;
    mean: number;
    max: number;
    min: number;
  };

  resourceUsage: {
    cpu: {
      average: number;
      peak: number;
      variance: number;
    };
    memory: {
      average: number;
      peak: number;
      growthRate: number;
      heapUsage: number;
    };
    network: {
      bandwidth: number;
      utilization: number;
      packetLoss: number;
    };
  };

  reliability: {
    successRate: number;
    errorRate: number;
    timeoutRate: number;
    connectionStability: number;
  };

  // Test context
  testConditions: {
    loadLevel: string;           // 'light', 'medium', 'heavy', 'stress'duration: number;            // Test duration in millisecondsconcurrentUsers: number;
    messageSize: number;
    testEnvironment: string;     // 'development', 'staging', 'production'};}

/**
 * Performance baseline definition
 */
export interface PerformanceBaseline {
  baselineId: string;
  name: string;
  description: string;
  createdAt: Date;
  lastUpdated: Date;

  // Baseline metrics
  metrics: PerformanceMetrics;

  // Statistical bounds
  statisticalBounds: {
    throughput: { lower: number; upper: number; confidence: number };
    latency: {
      p50: { lower: number; upper: number; confidence: number };
      p95: { lower: number; upper: number; confidence: number };
      p99: { lower: number; upper: number; confidence: number };
    };
    resourceUsage: {
      cpu: { lower: number; upper: number; confidence: number };
      memory: { lower: number; upper: number; confidence: number };
    };
  };

  // Baseline validation
  validation: {
    isValid: boolean;
    validationDate: Date;
    samplesUsed: number;
    confidenceLevel: number;
    standardDeviations: number;
  };

  // Metadata
  metadata: {
    testType: string;
    environment: string;
    buildVersion: string;
    tags: string[];
  };
}

/**
 * Regression analysis results
 */
export interface RegressionAnalysisResult {
  analysisId: string;
  timestamp: Date;
  testType: RegressionTestType;

  // Comparison data
  baseline: PerformanceMetrics;
  current: PerformanceMetrics;

  // Regression detection
  regression: {
    detected: boolean;
    severity: 'none' | 'minor' | 'moderate' | 'major' | 'critical';confidence: number;           // Statistical confidence (0-1)significance: number;         // Statistical significance level
  };

  // Detailed analysis
  analysis: {
    throughputRegression: {
      detected: boolean;
      change: number;              // Percentage change
      severity: 'none' | 'minor' | 'moderate' | 'major' | 'critical';significance: number;};
    latencyRegression: {
      detected: boolean;
      p95Change: number;           // Change in P95 latency
      p99Change: number;           // Change in P99 latency
      severity: 'none' | 'minor' | 'moderate' | 'major' | 'critical';significance: number;};
    resourceRegression: {
      detected: boolean;
      cpuChange: number;
      memoryChange: number;
      severity: 'none' | 'minor' | 'moderate' | 'major' | 'critical';};reliabilityRegression: {
      detected: boolean;
      errorRateChange: number;
      successRateChange: number;
      severity: 'none' | 'minor' | 'moderate' | 'major' | 'critical';};};

  // Root cause analysis
  rootCause: {
    likelyCauses: string[];
    evidenceStrength: number;
    correlations: {
      metric: string;
      correlation: number;
      description: string;
    }[];
  };

  // Recommendations
  recommendations: {
    immediate: string[];          // Immediate actions
    investigation: string[];      // Investigation steps
    remediation: string[];        // Remediation strategies
    prevention: string[];         // Prevention measures
  };

  // Alert details
  alert: {
    shouldAlert: boolean;
    alertLevel: 'info' | 'warning' | 'error' | 'critical';recipients: string[];message: string;
    escalation?: {
      escalate: boolean;
      escalationDelay: number;
      escalationLevel: string;
    };
  };
}

/**
 * Performance trend analysis
 */
export interface PerformanceTrendAnalysis {
  timeframe: string;            // e.g., '7d', '30d', '90d'trends: {throughput: {
      direction: 'improving' | 'stable' | 'degrading';changeRate: number;        // Rate of change per dayvolatility: number;        // Trend volatility
      seasonality: boolean;      // Seasonal patterns detected
    };
    latency: {
      direction: 'improving' | 'stable' | 'degrading';changeRate: number;volatility: number;
      seasonality: boolean;
    };
    resourceUsage: {
      direction: 'improving' | 'stable' | 'degrading';changeRate: number;volatility: number;
      growthProjection: number;  // Projected growth
    };
  };

  forecasting: {
    nextWeek: {
      expectedThroughput: number;
      expectedLatency: number;
      expectedResourceUsage: number;
      confidence: number;
    };
    nextMonth: {
      expectedThroughput: number;
      expectedLatency: number;
      expectedResourceUsage: number;
      confidence: number;
    };
  };

  anomalies: {
    detected: boolean;
    anomalies: {
      timestamp: number;
      metric: string;
      value: number;
      expected: number;
      deviation: number;
      severity: 'low' | 'medium' | 'high';}[];};
}

/**
 * Alert configuration for regression testing
 */
export interface RegressionAlertConfig {
  enabled: boolean;

  // Alert thresholds
  thresholds: {
    throughput: {
      minorDecrease: number;     // % decrease for minor alert
      moderateDecrease: number;  // % decrease for moderate alert
      majorDecrease: number;     // % decrease for major alert
      criticalDecrease: number;  // % decrease for critical alert
    };
    latency: {
      minorIncrease: number;     // % increase for minor alert
      moderateIncrease: number;  // % increase for moderate alert
      majorIncrease: number;     // % increase for major alert
      criticalIncrease: number;  // % increase for critical alert
    };
    resourceUsage: {
      minorIncrease: number;
      moderateIncrease: number;
      majorIncrease: number;
      criticalIncrease: number;
    };
    errorRate: {
      minorIncrease: number;
      moderateIncrease: number;
      majorIncrease: number;
      criticalIncrease: number;
    };
  };

  // Alert delivery
  delivery: {
    email: {
      enabled: boolean;
      recipients: string[];
      templates: Map<string, string>;
    };
    slack: {
      enabled: boolean;
      webhookUrl: string;
      channels: string[];
    };
    webhook: {
      enabled: boolean;
      urls: string[];
      headers: Record<string, string>;
    };
  };

  // Alert suppression
  suppression: {
    duplicateWindow: number;     // Suppress duplicate alerts (ms)
    maxAlertsPerHour: number;
    quietHours?: {
      start: string;             // HH:mm format
      end: string;               // HH:mm format
      timezone: string;
    };
  };
}

// ===== PERFORMANCE REGRESSION TESTING SERVICE =====

@Injectable()
export class PerformanceRegressionTestingService
  implements OnModuleInit, OnModuleDestroy {

  private readonly logger = new Logger(PerformanceRegressionTestingService.name);
  private readonly eventEmitter = new EventEmitter();

  // Baseline management
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private currentBaseline?: PerformanceBaseline;

  // Historical data
  private performanceHistory: PerformanceMetrics[] = [];
  private regressionResults: Map<string, RegressionAnalysisResult> = new Map();

  // Real-time monitoring
  private monitoringInterval?: NodeJS.Timeout;
  private alertConfig: RegressionAlertConfig;

  // Statistical analysis
  private readonly STATISTICAL_CONFIG = {
    confidenceLevel: 0.95,       // 95% confidence level
    significanceLevel: 0.05,     // 5% significance level
    minSampleSize: 30,           // Minimum samples for statistical analysis
    outlierThreshold: 3,         // Standard deviations for outlier detection
    trendWindowSize: 50,         // Data points for trend analysis
  };

  // Performance regression thresholds
  private readonly REGRESSION_THRESHOLDS = {
    throughput: {
      minorDecrease: 5,          // 5% decrease
      moderateDecrease: 10,      // 10% decrease
      majorDecrease: 20,         // 20% decrease
      criticalDecrease: 35,      // 35% decrease
    },
    latency: {
      minorIncrease: 10,         // 10% increase
      moderateIncrease: 20,      // 20% increase
      majorIncrease: 40,         // 40% increase
      criticalIncrease: 70,      // 70% increase
    },
    resourceUsage: {
      minorIncrease: 15,         // 15% increase
      moderateIncrease: 25,      // 25% increase
      majorIncrease: 50,         // 50% increase
      criticalIncrease: 80,      // 80% increase
    },
    errorRate: {
      minorIncrease: 1,          // 1% increase
      moderateIncrease: 3,       // 3% increase
      majorIncrease: 5,          // 5% increase
      criticalIncrease: 10,      // 10% increase
    },
  };

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.logger.log('🚀 Performance Regression Testing Service initializing...');// Initialize alert configurationthis.alertConfig = this.initializeAlertConfig();
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Performance Regression Testing Framework');// Load existing baselines and historical dataawait this.loadBaselines();
    await this.loadPerformanceHistory();

    // Start real-time monitoring
    this.startRealTimeMonitoring();

    this.logger.log('✅ Performance Regression Testing Framework ready');}async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Performance Regression Testing Framework');// Stop monitoringthis.stopRealTimeMonitoring();

    // Save state
    await this.saveBaselines();
    await this.savePerformanceHistory();

    this.logger.log('✅ Performance Regression Testing Framework shutdown complete');
  }

  // ===== BASELINE MANAGEMENT =====

  /**
   * Create new performance baseline from current metrics
   */
  async createBaseline(
    name: string,
    description: string,
    metrics: PerformanceMetrics,
    metadata: any = {}
  ): Promise<PerformanceBaseline> {
    this.logger.log(`📊 Creating new performance baseline: ${name}`);

    const baselineId = this.generateBaselineId(name);

    // Calculate statistical bounds
    const statisticalBounds = await this.calculateStatisticalBounds(metrics);

    const baseline: PerformanceBaseline = {
      baselineId,
      name,
      description,
      createdAt: new Date(),
      lastUpdated: new Date(),
      metrics,
      statisticalBounds,
      validation: {
        isValid: true,
        validationDate: new Date(),
        samplesUsed: 1,
        confidenceLevel: this.STATISTICAL_CONFIG.confidenceLevel,
        standardDeviations: 2,
      },
      metadata: {
        testType: metadata.testType || 'unknown',environment: metadata.environment || 'unknown',buildVersion: metadata.buildVersion || 'unknown',
        tags: metadata.tags || [],
      },
    };

    this.baselines.set(baselineId, baseline);
    this.currentBaseline = baseline;

    this.logger.log(`✅ Baseline created: ${baselineId}`);return baseline;}

  /**
   * Update existing baseline with new data
   */
  async updateBaseline(
    baselineId: string,
    newMetrics: PerformanceMetrics
  ): Promise<PerformanceBaseline> {
    const baseline = this.baselines.get(baselineId);
    if (!baseline) {
      throw new Error(`Baseline not found: ${baselineId}`);}this.logger.log(`📈 Updating baseline: ${baselineId}`);// Calculate updated statistical boundsconst statisticalBounds = await this.calculateStatisticalBounds(newMetrics, baseline.metrics);

    const updatedBaseline: PerformanceBaseline = {
      ...baseline,
      metrics: this.mergeMetrics(baseline.metrics, newMetrics),
      statisticalBounds,
      lastUpdated: new Date(),
      validation: {
        ...baseline.validation,
        samplesUsed: baseline.validation.samplesUsed + 1,
      },
    };

    this.baselines.set(baselineId, updatedBaseline);

    if (this.currentBaseline?.baselineId === baselineId) {
      this.currentBaseline = updatedBaseline;
    }

    return updatedBaseline;
  }

  /**
   * Set active baseline for regression testing
   */
  setActiveBaseline(baselineId: string): void {
    const baseline = this.baselines.get(baselineId);
    if (!baseline) {
      throw new Error(`Baseline not found: ${baselineId}`);}this.currentBaseline = baseline;
    this.logger.log(`🎯 Active baseline set to: ${baselineId}`);
  }

  // ===== REGRESSION ANALYSIS =====

  /**
   * Execute comprehensive regression analysis
   */
  async executeRegressionAnalysis(
    currentMetrics: PerformanceMetrics,
    testType: RegressionTestType = RegressionTestType.BASELINE_COMPARISON
  ): Promise<RegressionAnalysisResult> {
    this.logger.log('🔍 Executing performance regression analysis');const analysisId = this.generateAnalysisId();try {
      let baseline: PerformanceMetrics;

      // Select comparison baseline based on test type
      switch (testType) {
        case RegressionTestType.BASELINE_COMPARISON:
          if (!this.currentBaseline) {
            throw new Error('No active baseline available for comparison');}baseline = this.currentBaseline.metrics;
          break;

        case RegressionTestType.HISTORICAL_COMPARISON:
          baseline = await this.getHistoricalComparison(currentMetrics);
          break;

        case RegressionTestType.SLIDING_WINDOW:
          baseline = await this.getSlidingWindowBaseline();
          break;

        default:
          if (!this.currentBaseline) {
            throw new Error('No active baseline available for comparison');
          }
          baseline = this.currentBaseline.metrics;
      }

      // Perform detailed regression analysis
      const analysis = await this.performDetailedAnalysis(baseline, currentMetrics);

      // Assess overall regression
      const regression = this.assessOverallRegression(analysis);

      // Perform root cause analysis
      const rootCause = await this.performRootCauseAnalysis(baseline, currentMetrics, analysis);

      // Generate recommendations
      const recommendations = this.generateRegressionRecommendations(analysis, regression);

      // Determine alert requirements
      const alert = this.determineAlertRequirements(regression, analysis);

      const result: RegressionAnalysisResult = {
        analysisId,
        timestamp: new Date(),
        testType,
        baseline,
        current: currentMetrics,
        regression,
        analysis,
        rootCause,
        recommendations,
        alert,
      };

      // Store result
      this.regressionResults.set(analysisId, result);

      // Add to performance history
      this.performanceHistory.push(currentMetrics);

      // Trigger alerts if necessary
      if (alert.shouldAlert) {
        await this.sendRegressionAlert(result);
      }

      this.logRegressionResults(result);
      return result;

    } catch (error) {
      this.logger.error(`Regression analysis failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Perform detailed performance analysis
   */
  private async performDetailedAnalysis(
    baseline: PerformanceMetrics,
    current: PerformanceMetrics
  ): Promise<RegressionAnalysisResult['analysis']> {// Throughput analysisconst throughputChange = ((baseline.throughput.averageThroughput - current.throughput.averageThroughput) / baseline.throughput.averageThroughput) * 100;
    const throughputRegression = {
      detected: throughputChange > this.REGRESSION_THRESHOLDS.throughput.minor,
      change: throughputChange,
      severity: this.classifySeverity(throughputChange, this.REGRESSION_THRESHOLDS.throughput),
      significance: await this.calculateStatisticalSignificance(
        [baseline.throughput.averageThroughput],
        [current.throughput.averageThroughput]
      ),
    };

    // Latency analysis
    const p95LatencyChange = ((current.latency.p95 - baseline.latency.p95) / baseline.latency.p95) * 100;
    const p99LatencyChange = ((current.latency.p99 - baseline.latency.p99) / baseline.latency.p99) * 100;
    const latencyRegression = {
      detected: p95LatencyChange > this.REGRESSION_THRESHOLDS.latency.minor,
      p95Change: p95LatencyChange,
      p99Change: p99LatencyChange,
      severity: this.classifySeverity(Math.max(p95LatencyChange, p99LatencyChange), this.REGRESSION_THRESHOLDS.latency),
      significance: await this.calculateStatisticalSignificance(
        [baseline.latency.p95, baseline.latency.p99],
        [current.latency.p95, current.latency.p99]
      ),
    };

    // Resource usage analysis
    const cpuChange = ((current.resourceUsage.cpu.average - baseline.resourceUsage.cpu.average) / baseline.resourceUsage.cpu.average) * 100;
    const memoryChange = ((current.resourceUsage.memory.average - baseline.resourceUsage.memory.average) / baseline.resourceUsage.memory.average) * 100;
    const resourceRegression = {
      detected: cpuChange > this.REGRESSION_THRESHOLDS.resourceUsage.minor || memoryChange > this.REGRESSION_THRESHOLDS.resourceUsage.minor,
      cpuChange,
      memoryChange,
      severity: this.classifySeverity(Math.max(cpuChange, memoryChange), this.REGRESSION_THRESHOLDS.resourceUsage),
    };

    // Reliability analysis
    const errorRateChange = current.reliability.errorRate - baseline.reliability.errorRate;
    const successRateChange = baseline.reliability.successRate - current.reliability.successRate;
    const reliabilityRegression = {
      detected: errorRateChange > this.REGRESSION_THRESHOLDS.errorRate.minor,
      errorRateChange,
      successRateChange,
      severity: this.classifySeverity(errorRateChange, this.REGRESSION_THRESHOLDS.errorRate),
    };

    return {
      throughputRegression,
      latencyRegression,
      resourceRegression,
      reliabilityRegression,
    };
  }

  /**
   * Assess overall regression severity
   */
  private assessOverallRegression(analysis: any): RegressionAnalysisResult['regression'] {const regressions = [analysis.throughputRegression,
      analysis.latencyRegression,
      analysis.resourceRegression,
      analysis.reliabilityRegression,
    ];

    const detected = regressions.some(r => r.detected);

    if (!detected) {
      return {
        detected: false,
        severity: 'none',confidence: 1.0,significance: 0,
      };
    }

    // Determine overall severity
    const severities = regressions.map(r => r.severity).filter(s => s !== 'none');const overallSeverity = this.determineOverallSeverity(severities);// Calculate confidence
    const significances = regressions.map(r => r.significance || 0);
    const averageSignificance = significances.reduce((sum, sig) => sum + sig, 0) / significances.length;

    return {
      detected: true,
      severity: overallSeverity,
      confidence: 1 - averageSignificance,
      significance: averageSignificance,
    };
  }

  // ===== TREND ANALYSIS =====

  /**
   * Analyze performance trends over time
   */
  async analyzePerformanceTrends(timeframe: string = '30d'): Promise<PerformanceTrendAnalysis> {
    this.logger.log(`📈 Analyzing performance trends (${timeframe})`);const timeframeMs = this.parseTimeframe(timeframe);const cutoffTime = Date.now() - timeframeMs;

    const relevantData = this.performanceHistory.filter(
      metrics => metrics.timestamp >= cutoffTime
    );

    if (relevantData.length < this.STATISTICAL_CONFIG.minSampleSize) {
      throw new Error(`Insufficient data for trend analysis. Need at least ${this.STATISTICAL_CONFIG.minSampleSize} samples.`);
    }

    // Analyze trends
    const trends = {
      throughput: this.analyzeTrend(relevantData.map(d => d.throughput.averageThroughput)),
      latency: this.analyzeTrend(relevantData.map(d => d.latency.p95)),
      resourceUsage: this.analyzeTrend(relevantData.map(d => d.resourceUsage.cpu.average)),
    };

    // Generate forecasts
    const forecasting = {
      nextWeek: this.forecastPerformance(relevantData, 7),
      nextMonth: this.forecastPerformance(relevantData, 30),
    };

    // Detect anomalies
    const anomalies = this.detectAnomalies(relevantData);

    return {
      timeframe,
      trends,
      forecasting,
      anomalies,
    };
  }

  /**
   * Analyze trend for a single metric
   */
  private analyzeTrend(values: number[]): any {
    if (values.length < 2) {
      return {
        direction: 'stable' as const,changeRate: 0,volatility: 0,
        seasonality: false,
      };
    }

    // Calculate linear regression
    const { slope, volatility } = this.calculateLinearRegression(values);

    // Determine direction
    const changeThreshold = 0.01; // 1% change threshold
    let direction: 'improving' | 'stable' | 'degrading';if (Math.abs(slope) < changeThreshold) {direction = 'stable';} else if (slope > 0) {direction = 'improving'; // Assuming higher values are better for throughput} else {direction = 'degrading';
    }

    // Check for seasonality (simplified)
    const seasonality = this.detectSeasonality(values);

    return {
      direction,
      changeRate: slope,
      volatility,
      seasonality,
    };
  }

  // ===== ALERT MANAGEMENT =====

  /**
   * Send regression alert
   */
  private async sendRegressionAlert(result: RegressionAnalysisResult): Promise<void> {
    this.logger.log(`🚨 Sending regression alert: ${result.alert.alertLevel}`);

    const alert = result.alert;

    try {
      // Email alerts
      if (this.alertConfig.delivery.email.enabled) {
        await this.sendEmailAlert(result);
      }

      // Slack alerts
      if (this.alertConfig.delivery.slack.enabled) {
        await this.sendSlackAlert(result);
      }

      // Webhook alerts
      if (this.alertConfig.delivery.webhook.enabled) {
        await this.sendWebhookAlert(result);
      }

      // Emit event for other services
      this.eventEmitter.emit('regression_alert', {analysisId: result.analysisId,severity: result.regression.severity,
        alertLevel: alert.alertLevel,
        message: alert.message,
      });

    } catch (error) {
      this.logger.error('Failed to send regression alert', error.stack);}}

  /**
   * Determine alert requirements
   */
  private determineAlertRequirements(
    regression: RegressionAnalysisResult['regression'],analysis: RegressionAnalysisResult['analysis']): RegressionAnalysisResult['alert'] {const shouldAlert = regression.detected && regression.severity !== 'none';let alertLevel: 'info' | 'warning' | 'error' | 'critical';switch (regression.severity) {case 'critical':alertLevel = 'critical';break;case 'major':alertLevel = 'error';break;case 'moderate':alertLevel = 'warning';break;default:
        alertLevel = 'info';}const message = this.generateAlertMessage(regression, analysis);

    return {
      shouldAlert,
      alertLevel,
      recipients: this.alertConfig.delivery.email.recipients,
      message,
      escalation: regression.severity === 'critical' ? {escalate: true,escalationDelay: 15 * 60 * 1000, // 15 minutes
        escalationLevel: 'manager',} : undefined,};
  }

  // ===== UTILITY METHODS =====

  /**
   * Calculate statistical bounds for baseline
   */
  private async calculateStatisticalBounds(
    metrics: PerformanceMetrics,
    previousMetrics?: PerformanceMetrics
  ): Promise<PerformanceBaseline['statisticalBounds']> {const confidence = this.STATISTICAL_CONFIG.confidenceLevel;const stdDevMultiplier = 2; // 2 standard deviations

    // For initial baseline, use simple bounds
    if (!previousMetrics) {
      return {
        throughput: {
          lower: metrics.throughput.averageThroughput * 0.8,
          upper: metrics.throughput.averageThroughput * 1.2,
          confidence,
        },
        latency: {
          p50: {
            lower: metrics.latency.p50 * 0.8,
            upper: metrics.latency.p50 * 1.2,
            confidence,
          },
          p95: {
            lower: metrics.latency.p95 * 0.8,
            upper: metrics.latency.p95 * 1.2,
            confidence,
          },
          p99: {
            lower: metrics.latency.p99 * 0.8,
            upper: metrics.latency.p99 * 1.2,
            confidence,
          },
        },
        resourceUsage: {
          cpu: {
            lower: metrics.resourceUsage.cpu.average * 0.7,
            upper: metrics.resourceUsage.cpu.average * 1.3,
            confidence,
          },
          memory: {
            lower: metrics.resourceUsage.memory.average * 0.8,
            upper: metrics.resourceUsage.memory.average * 1.2,
            confidence,
          },
        },
      };
    }

    // For updated baselines, calculate proper statistical bounds
    // This would implement proper statistical calculations
    return this.calculateStatisticalBounds(metrics);
  }

  /**
   * Classify severity based on thresholds
   */
  private classifySeverity(
    change: number,
    thresholds: any
  ): 'none' | 'minor' | 'moderate' | 'major' | 'critical' {if (change < thresholds.minor) return 'none';if (change < thresholds.moderate) return 'minor';if (change < thresholds.major) return 'moderate';if (change < thresholds.critical) return 'major';return 'critical';}/**
   * Calculate statistical significance
   */
  private async calculateStatisticalSignificance(
    baseline: number[],
    current: number[]
  ): Promise<number> {
    // Simplified t-test implementation
    if (baseline.length === 0 || current.length === 0) return 1.0;

    const baselineMean = baseline.reduce((sum, val) => sum + val, 0) / baseline.length;
    const currentMean = current.reduce((sum, val) => sum + val, 0) / current.length;

    const difference = Math.abs(currentMean - baselineMean);
    const pooledStdDev = this.calculatePooledStandardDeviation(baseline, current);

    if (pooledStdDev === 0) return difference === 0 ? 1.0 : 0.0;

    const tStatistic = difference / pooledStdDev;

    // Convert t-statistic to p-value (simplified)
    const pValue = Math.max(0, 1 - (tStatistic / 5)); // Simplified mapping

    return pValue;
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(
    regression: RegressionAnalysisResult['regression'],analysis: RegressionAnalysisResult['analysis']): string {const severityIcon = {
      'none': '✅','minor': '⚠️','moderate': '🔶','major': '🔴','critical': '🚨',
    };

    let message = `${severityIcon[regression.severity]} Performance Regression Detected (${regression.severity.toUpperCase()})\n\n`;if (analysis.throughputRegression.detected) {message += `📉 Throughput: ${analysis.throughputRegression.change.toFixed(1)}% decrease\n`;}if (analysis.latencyRegression.detected) {
      message += `⏱️ P95 Latency: ${analysis.latencyRegression.p95Change.toFixed(1)}% increase\n`;}if (analysis.resourceRegression.detected) {
      message += `💾 Resource Usage: CPU ${analysis.resourceRegression.cpuChange.toFixed(1)}%, Memory ${analysis.resourceRegression.memoryChange.toFixed(1)}%\n`;}if (analysis.reliabilityRegression.detected) {
      message += `❌ Error Rate: ${analysis.reliabilityRegression.errorRateChange.toFixed(1)}% increase\n`;}message += `
Confidence: ${(regression.confidence * 100).toFixed(1)}%`;

    return message;
  }

  // ===== HELPER METHODS =====

  private mergeMetrics(baseline: PerformanceMetrics, newMetrics: PerformanceMetrics): PerformanceMetrics {
    // Simple average merge - would implement proper statistical merging
    return {
      ...newMetrics,
      throughput: {
        messagesPerSecond: (baseline.throughput.messagesPerSecond + newMetrics.throughput.messagesPerSecond) / 2,
        peakThroughput: Math.max(baseline.throughput.peakThroughput, newMetrics.throughput.peakThroughput),
        sustainedThroughput: (baseline.throughput.sustainedThroughput + newMetrics.throughput.sustainedThroughput) / 2,
        averageThroughput: (baseline.throughput.averageThroughput + newMetrics.throughput.averageThroughput) / 2,
      },
    };
  }

  private calculatePooledStandardDeviation(baseline: number[], current: number[]): number {
    const baselineMean = baseline.reduce((sum, val) => sum + val, 0) / baseline.length;
    const currentMean = current.reduce((sum, val) => sum + val, 0) / current.length;

    const baselineVariance = baseline.reduce((sum, val) => sum + Math.pow(val - baselineMean, 2), 0) / baseline.length;
    const currentVariance = current.reduce((sum, val) => sum + Math.pow(val - currentMean, 2), 0) / current.length;

    return Math.sqrt((baselineVariance + currentVariance) / 2);
  }

  private determineOverallSeverity(severities: string[]): 'none' | 'minor' | 'moderate' | 'major' | 'critical' {if (severities.includes('critical')) return 'critical';if (severities.includes('major')) return 'major';if (severities.includes('moderate')) return 'moderate';if (severities.includes('minor')) return 'minor';return 'none';}private calculateLinearRegression(values: number[]): { slope: number; volatility: number } {
    if (values.length < 2) return { slope: 0, volatility: 0 };

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Calculate volatility as standard deviation
    const mean = sumY / n;
    const variance = y.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const volatility = Math.sqrt(variance) / mean; // Coefficient of variation

    return { slope, volatility };
  }

  private detectSeasonality(values: number[]): boolean {
    // Simplified seasonality detection
    return values.length > 24 && this.calculateCoefficientOfVariation(values) > 0.1;
  }

  private calculateCoefficientOfVariation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return mean === 0 ? 0 : stdDev / mean;
  }

  private parseTimeframe(timeframe: string): number {
    const value = parseInt(timeframe);
    const unit = timeframe.slice(-1);

    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;case 'd': return value * 24 * 60 * 60 * 1000;case 'w': return value * 7 * 24 * 60 * 60 * 1000;default: return 30 * 24 * 60 * 60 * 1000; // Default 30 days}
  }

  // ===== INFRASTRUCTURE METHODS =====

  private initializeAlertConfig(): RegressionAlertConfig {
    return {
      enabled: true,
      thresholds: this.REGRESSION_THRESHOLDS,
      delivery: {
        email: {
          enabled: false,
          recipients: [],
          templates: new Map(),
        },
        slack: {
          enabled: false,
          webhookUrl: '',
          channels: [],
        },
        webhook: {
          enabled: false,
          urls: [],
          headers: {},
        },
      },
      suppression: {
        duplicateWindow: 60 * 60 * 1000, // 1 hour
        maxAlertsPerHour: 5,
      },
    };
  }

  private startRealTimeMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      // Real-time monitoring logic would be implemented here
    }, 60000); // Every minute
  }

  private stopRealTimeMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  private generateBaselineId(name: string): string {
    return `baseline_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}';}

  private generateAnalysisId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logRegressionResults(result: RegressionAnalysisResult): void {
    this.logger.log('📊 Regression Analysis Results:');
    this.logger.log(`   Analysis ID: ${result.analysisId}`);this.logger.log(`   Regression Detected: ${result.regression.detected ? '❌' : '✅'}`);if (result.regression.detected) {this.logger.log(`   Severity: ${result.regression.severity.toUpperCase()}`);this.logger.log(`   Confidence: ${(result.regression.confidence * 100).toFixed(1)}%`);if (result.analysis.throughputRegression.detected) {this.logger.log(`   Throughput Regression: ${result.analysis.throughputRegression.change.toFixed(1)}%`);}if (result.analysis.latencyRegression.detected) {
        this.logger.log(`   Latency Regression: P95 +${result.analysis.latencyRegression.p95Change.toFixed(1)}%`);
      }
    }
  }

  // ===== PLACEHOLDER METHODS (to be implemented) =====

  private async loadBaselines(): Promise<void> { /* Implementation */ }
  private async loadPerformanceHistory(): Promise<void> { /* Implementation */ }
  private async saveBaselines(): Promise<void> { /* Implementation */ }
  private async savePerformanceHistory(): Promise<void> { /* Implementation */ }
  private async getHistoricalComparison(metrics: PerformanceMetrics): Promise<PerformanceMetrics> { return metrics; }
  private async getSlidingWindowBaseline(): Promise<PerformanceMetrics> { return {} as PerformanceMetrics; }
  private async performRootCauseAnalysis(baseline: PerformanceMetrics, current: PerformanceMetrics, analysis: any): Promise<any> {
    return {
      likelyCauses: ['Performance test variance'],evidenceStrength: 0.5,correlations: [],
    };
  }
  private generateRegressionRecommendations(analysis: any, regression: any): any {
    return {
      immediate: ['Monitor performance closely'],investigation: ['Review recent code changes'],remediation: ['Consider performance optimization'],prevention: ['Implement performance monitoring'],};}
  private async sendEmailAlert(result: RegressionAnalysisResult): Promise<void> { /* Implementation */ }
  private async sendSlackAlert(result: RegressionAnalysisResult): Promise<void> { /* Implementation */ }
  private async sendWebhookAlert(result: RegressionAnalysisResult): Promise<void> { /* Implementation */ }
  private forecastPerformance(data: PerformanceMetrics[], days: number): any {
    return {
      expectedThroughput: 1000,
      expectedLatency: 50,
      expectedResourceUsage: 60,
      confidence: 0.8,
    };
  }
  private detectAnomalies(data: PerformanceMetrics[]): any {
    return {
      detected: false,
      anomalies: [],
    };
  }

  // ===== PUBLIC API METHODS =====

  /**
   * Get regression analysis results
   */
  getRegressionResults(analysisId: string): RegressionAnalysisResult | undefined {
    return this.regressionResults.get(analysisId);
  }

  /**
   * Get all regression results
   */
  getAllRegressionResults(): RegressionAnalysisResult[] {
    return Array.from(this.regressionResults.values());
  }

  /**
   * Get current baseline
   */
  getCurrentBaseline(): PerformanceBaseline | undefined {
    return this.currentBaseline;
  }

  /**
   * Get all baselines
   */
  getAllBaselines(): PerformanceBaseline[] {
    return Array.from(this.baselines.values());
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * Update alert configuration
   */
  updateAlertConfig(config: Partial<RegressionAlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
    this.logger.log('Alert configuration updated');
  }

  /**
   * Get current alert configuration
   */
  getAlertConfig(): RegressionAlertConfig {
    return { ...this.alertConfig };
  }
}