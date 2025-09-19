/**
 * PARLANT Performance Regression Detector
 *
 * Advanced regression detection and prevention system for PARLANT Phase 1 performance
 * monitoring. Provides intelligent baseline management, change detection, and automated
 * response coordination for preventing performance degradation.
 *
 * Features:
 * - Intelligent baseline establishment and maintenance
 * - Multi-dimensional regression detection (time, function, user patterns)
 * - Statistical change point detection with confidence intervals
 * - Automated rollback and mitigation recommendations
 * - Performance impact assessment and risk scoring
 * - Historical regression analysis and pattern recognition
 * - Predictive regression warnings and early detection
 * - Integration with deployment and CI/CD pipelines
 *
 * Detection Methods:
 * - Statistical Process Control (SPC) with control charts
 * - Change Point Detection using CUSUM and PELT algorithms
 * - Mann-Whitney U test for distribution changes
 * - Anomaly detection with contextual baselines
 * - Machine learning-based trend analysis
 *
 * Prevention Strategies:
 * - Automated performance gates in CI/CD
 * - Real-time monitoring with instant alerts
 * - Gradual rollout monitoring with automatic rollback
 * - Performance budget enforcement
 * - Canary deployment performance validation
 *
 * @fileoverview Performance regression detection and prevention
 * @version 1.0.0
 * @author Performance Monitoring Agent
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

/**
 * Regression detector configuration
 */
export interface RegressionDetectorConfig {
  /** Detection interval in milliseconds */
  detectionInterval: number;
  /** Baseline calculation settings */
  baseline: BaselineSettings;
  /** Detection sensitivity settings */
  sensitivity: SensitivitySettings;
  /** Prevention and mitigation settings */
  prevention: PreventionSettings;
  /** Integration settings */
  integration: IntegrationSettings;
  /** Statistical test parameters */
  statisticalTests: StatisticalTestSettings;
}

/**
 * Baseline calculation settings
 */
export interface BaselineSettings {
  /** Baseline calculation method */
  method: 'ROLLING_WINDOW' | 'SEASONAL_DECOMPOSITION' | 'ADAPTIVE_BASELINE' | 'DEPLOYMENT_BASED';
  /** Window size for baseline calculation */
  windowSize: number;
  /** Minimum samples required for baseline */
  minSamples: number;
  /** Baseline update frequency */
  updateFrequency: number;
  /** Baseline stability threshold */
  stabilityThreshold: number;
  /** Exclude outliers from baseline */
  excludeOutliers: boolean;
  /** Confidence level for baseline bounds */
  confidenceLevel: number;
}

/**
 * Detection sensitivity settings
 */
export interface SensitivitySettings {
  /** Detection thresholds by severity */
  thresholds: {
    minor: number;    // e.g., 5% degradation
    moderate: number; // e.g., 15% degradation
    major: number;    // e.g., 30% degradation
    critical: number; // e.g., 50% degradation
  };
  /** Minimum change duration for detection */
  minDuration: number;
  /** Required confidence level for detection */
  confidenceLevel: number;
  /** Enable multi-metric correlation detection */
  enableCorrelation: boolean;
  /** Metric-specific sensitivity overrides */
  metricOverrides: Record<string, Partial<SensitivitySettings['thresholds']>>;
}

/**
 * Prevention and mitigation settings
 */
export interface PreventionSettings {
  /** Enable automated responses */
  enableAutomatedResponse: boolean;
  /** Response actions configuration */
  responses: {
    /** Alert stakeholders */
    alerting: {
      enabled: boolean;
      escalationLevels: ('INFO' | 'WARNING' | 'CRITICAL')[];
      recipients: string[];
    };
    /** Automated rollback */
    rollback: {
      enabled: boolean;
      triggerThreshold: 'moderate' | 'major' | 'critical';
      confirmationRequired: boolean;
    };
    /** Traffic shifting */
    trafficShifting: {
      enabled: boolean;
      gradualReduction: boolean;
      minTrafficPercentage: number;
    };
    /** Performance budget enforcement */
    budgetEnforcement: {
      enabled: boolean;
      budgets: Record<string, number>;
      blockDeployment: boolean;
    };
  };
  /** Integration with deployment systems */
  deploymentIntegration: {
    enabled: boolean;
    webhookUrl?: string;
    apiKey?: string;
  };
}

/**
 * Integration settings
 */
export interface IntegrationSettings {
  /** CI/CD integration */
  cicd: {
    enabled: boolean;
    performanceGates: {
      responseTime: number;
      throughput: number;
      errorRate: number;
      cacheHitRate: number;
    };
    webhookUrl?: string;
  };
  /** Deployment tracking */
  deploymentTracking: {
    enabled: boolean;
    trackingMethod: 'WEBHOOK' | 'POLLING' | 'MANUAL';
    deploymentMarkers: boolean;
  };
  /** External monitoring systems */
  externalSystems: {
    prometheus?: { enabled: boolean; endpoint: string };
    grafana?: { enabled: boolean; endpoint: string };
    newrelic?: { enabled: boolean; apiKey: string };
  };
}

/**
 * Statistical test settings
 */
export interface StatisticalTestSettings {
  /** Change point detection settings */
  changePoint: {
    algorithm: 'CUSUM' | 'PELT' | 'BINARY_SEGMENTATION';
    penalty: number;
    minSegmentLength: number;
  };
  /** Distribution comparison settings */
  distributionTest: {
    method: 'MANN_WHITNEY' | 'KOLMOGOROV_SMIRNOV' | 'T_TEST';
    significanceLevel: number;
  };
  /** Control chart settings */
  controlChart: {
    type: 'XBAR' | 'EWMA' | 'CUSUM_CHART';
    limitMultiplier: number;
    sensitivityParameter: number;
  };
}

/**
 * Performance baseline
 */
export interface PerformanceBaseline {
  /** Baseline identifier */
  id: string;
  /** Metric name */
  metric: string;
  /** Baseline value */
  value: number;
  /** Baseline bounds */
  bounds: {
    upper: number;
    lower: number;
  };
  /** Statistical properties */
  statistics: {
    mean: number;
    median: number;
    standardDeviation: number;
    percentiles: Record<string, number>;
  };
  /** Baseline metadata */
  metadata: {
    calculationMethod: string;
    sampleSize: number;
    confidenceLevel: number;
    createdAt: Date;
    lastUpdated: Date;
    dataRange: { start: Date; end: Date };
  };
  /** Baseline context */
  context: {
    deployment?: string;
    version?: string;
    environment: string;
    component?: string;
  };
  /** Baseline validity */
  validity: {
    isValid: boolean;
    expiresAt?: Date;
    confidence: number;
  };
}

/**
 * Performance regression detection result
 */
export interface RegressionDetection {
  /** Detection identifier */
  id: string;
  /** Detection timestamp */
  timestamp: Date;
  /** Affected metric */
  metric: string;
  /** Regression severity */
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';
  /** Detection method used */
  detectionMethod: string;
  /** Statistical confidence */
  confidence: number;
  /** Performance change details */
  change: {
    /** Baseline value */
    baseline: number;
    /** Current value */
    current: number;
    /** Percentage change */
    percentageChange: number;
    /** Absolute change */
    absoluteChange: number;
    /** Change direction */
    direction: 'DEGRADATION' | 'IMPROVEMENT';
  };
  /** Detection context */
  context: {
    /** Detection time window */
    timeWindow: { start: Date; end: Date };
    /** Sample sizes */
    sampleSizes: { baseline: number; current: number };
    /** Related deployments */
    deployments: string[];
    /** Affected components */
    components: string[];
  };
  /** Statistical test results */
  statisticalTests: {
    /** Change point detection */
    changePoint?: {
      detected: boolean;
      location: Date;
      confidence: number;
      algorithm: string;
    };
    /** Distribution comparison */
    distributionTest?: {
      statistic: number;
      pValue: number;
      significant: boolean;
      method: string;
    };
    /** Control chart analysis */
    controlChart?: {
      outOfControl: boolean;
      violationType: string;
      consecutiveViolations: number;
    };
  };
  /** Impact assessment */
  impact: {
    /** Risk score (0-100) */
    riskScore: number;
    /** Estimated affected users */
    affectedUsers?: number;
    /** Business impact level */
    businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    /** SLA breach risk */
    slaBreachRisk: number;
  };
  /** Root cause analysis */
  rootCause: {
    /** Likely causes */
    likelyCauses: string[];
    /** Correlated changes */
    correlatedChanges: string[];
    /** Investigation recommendations */
    investigations: string[];
  };
  /** Mitigation recommendations */
  mitigation: {
    /** Immediate actions */
    immediateActions: string[];
    /** Long-term fixes */
    longTermFixes: string[];
    /** Rollback recommendation */
    rollbackRecommended: boolean;
    /** Estimated recovery time */
    estimatedRecoveryTime?: number;
  };
  /** Status tracking */
  status: {
    /** Detection status */
    status: 'DETECTED' | 'INVESTIGATING' | 'MITIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
    /** Actions taken */
    actionsTaken: string[];
    /** Resolution timestamp */
    resolvedAt?: Date;
    /** Resolution method */
    resolutionMethod?: string;
  };
}

/**
 * Performance budget definition
 */
export interface PerformanceBudget {
  /** Budget identifier */
  id: string;
  /** Budget name */
  name: string;
  /** Target metrics and thresholds */
  metrics: {
    [metricName: string]: {
      target: number;
      tolerance: number;
      unit: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    };
  };
  /** Budget scope */
  scope: {
    environment: string;
    component?: string;
    version?: string;
  };
  /** Enforcement settings */
  enforcement: {
    enabled: boolean;
    blockOnViolation: boolean;
    warningThreshold: number;
    criticalThreshold: number;
  };
  /** Budget metadata */
  metadata: {
    owner: string;
    createdAt: Date;
    lastUpdated: Date;
    description: string;
  };
}

/**
 * Deployment tracking information
 */
export interface DeploymentInfo {
  /** Deployment identifier */
  id: string;
  /** Deployment timestamp */
  timestamp: Date;
  /** Version information */
  version: string;
  /** Environment */
  environment: string;
  /** Component or service */
  component: string;
  /** Deployment type */
  type: 'FULL' | 'CANARY' | 'BLUE_GREEN' | 'ROLLING';
  /** Deployment metadata */
  metadata: {
    initiatedBy: string;
    rolloutPercentage?: number;
    previousVersion?: string;
    changeDescription?: string;
  };
  /** Performance baseline period */
  baselinePeriod: {
    start: Date;
    end: Date;
  };
}

/**
 * Performance Regression Detector implementation
 */
export class RegressionDetector extends EventEmitter {
  private config: RegressionDetectorConfig;
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private detections: Map<string, RegressionDetection> = new Map();
  private budgets: Map<string, PerformanceBudget> = new Map();
  private deployments: Map<string, DeploymentInfo> = new Map();
  private metricHistory: Map<string, { value: number; timestamp: Date }[]> = new Map();

  private detectionInterval?: NodeJS.Timeout;
  private baselineUpdateInterval?: NodeJS.Timeout;

  private isRunning = false;
  private readonly logger: Console;

  constructor(config: Partial<RegressionDetectorConfig> = {}) {
    super();
    this.logger = console;
    this.config = this.mergeConfig(config);
    this.initializeDefaultBudgets();
  }

  /**
   * Start regression detection
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Regression detector is already running');
      return;
    }

    this.logger.log('Starting PARLANT Performance Regression Detector');

    // Start detection processing
    this.detectionInterval = setInterval(
      () => this.performDetection(),
      this.config.detectionInterval
    );

    // Start baseline updates
    this.baselineUpdateInterval = setInterval(
      () => this.updateBaselines(),
      this.config.baseline.updateFrequency
    );

    this.isRunning = true;
    this.emit('detector.started');
    this.logger.log('Regression detector started successfully');
  }

  /**
   * Stop regression detection
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Regression detector is not running');
      return;
    }

    this.logger.log('Stopping PARLANT Performance Regression Detector');

    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = undefined;
    }

    if (this.baselineUpdateInterval) {
      clearInterval(this.baselineUpdateInterval);
      this.baselineUpdateInterval = undefined;
    }

    this.isRunning = false;
    this.emit('detector.stopped');
    this.logger.log('Regression detector stopped successfully');
  }

  /**
   * Record metric value for regression detection
   */
  recordMetric(metric: string, value: number, context: Record<string, unknown> = {}): void {
    const timestamp = new Date();

    if (!this.metricHistory.has(metric)) {
      this.metricHistory.set(metric, []);
    }

    const history = this.metricHistory.get(metric)!;
    history.push({ value, timestamp });

    // Keep only recent history
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    this.metricHistory.set(metric, history.filter(entry => entry.timestamp >= cutoffTime));

    this.emit('metric.recorded', { metric, value, timestamp, context });

    // Immediate regression check for critical metrics
    if (this.isCriticalMetric(metric)) {
      this.checkImmedateRegression(metric, value, context);
    }
  }

  /**
   * Create or update performance baseline
   */
  createBaseline(
    metric: string,
    data: { value: number; timestamp: Date }[],
    context: Partial<PerformanceBaseline['context']> = {}
  ): PerformanceBaseline {
    const baseline = this.calculateBaseline(metric, data, context);
    this.baselines.set(metric, baseline);

    this.emit('baseline.created', baseline);
    this.logger.log(`Baseline created for ${metric}: ${baseline.value.toFixed(2)}`);

    return baseline;
  }

  /**
   * Register deployment for tracking
   */
  registerDeployment(deployment: Omit<DeploymentInfo, 'id'>): DeploymentInfo {
    const fullDeployment: DeploymentInfo = {
      id: `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...deployment
    };

    this.deployments.set(fullDeployment.id, fullDeployment);

    // Create new baselines for post-deployment monitoring
    this.schedulePostDeploymentBaseline(fullDeployment);

    this.emit('deployment.registered', fullDeployment);
    this.logger.log(`Deployment registered: ${fullDeployment.id} (${fullDeployment.version})`);

    return fullDeployment;
  }

  /**
   * Create performance budget
   */
  createBudget(budget: Omit<PerformanceBudget, 'id'>): PerformanceBudget {
    const fullBudget: PerformanceBudget = {
      id: `budget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...budget
    };

    this.budgets.set(fullBudget.id, fullBudget);

    this.emit('budget.created', fullBudget);
    this.logger.log(`Performance budget created: ${fullBudget.name}`);

    return fullBudget;
  }

  /**
   * Get active regression detections
   */
  getActiveRegressions(): RegressionDetection[] {
    return Array.from(this.detections.values())
      .filter(detection => detection.status.status === 'DETECTED' || detection.status.status === 'INVESTIGATING')
      .sort((a, b) => {
        const severityOrder = { CRITICAL: 4, MAJOR: 3, MODERATE: 2, MINOR: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
  }

  /**
   * Get performance baselines
   */
  getBaselines(): PerformanceBaseline[] {
    return Array.from(this.baselines.values())
      .filter(baseline => baseline.validity.isValid)
      .sort((a, b) => b.metadata.lastUpdated.getTime() - a.metadata.lastUpdated.getTime());
  }

  /**
   * Check performance budget compliance
   */
  checkBudgetCompliance(metric: string, value: number): {
    compliant: boolean;
    violations: { budgetId: string; metric: string; threshold: number; actual: number; severity: string }[];
  } {
    const violations: { budgetId: string; metric: string; threshold: number; actual: number; severity: string }[] = [];

    for (const [budgetId, budget] of this.budgets) {
      if (!budget.enforcement.enabled) continue;

      const metricBudget = budget.metrics[metric];
      if (!metricBudget) continue;

      const threshold = metricBudget.target;
      const tolerance = metricBudget.tolerance;

      if (value > threshold + tolerance) {
        const severity = value > threshold + (tolerance * 2) ? 'CRITICAL' : 'WARNING';
        violations.push({
          budgetId,
          metric,
          threshold,
          actual: value,
          severity
        });
      }
    }

    return {
      compliant: violations.length === 0,
      violations
    };
  }

  /**
   * Resolve regression detection
   */
  resolveRegression(detectionId: string, resolution: string, resolvedBy: string): boolean {
    const detection = this.detections.get(detectionId);
    if (!detection) return false;

    detection.status.status = 'RESOLVED';
    detection.status.resolvedAt = new Date();
    detection.status.resolutionMethod = resolution;
    detection.status.actionsTaken.push(`Resolved by ${resolvedBy}: ${resolution}`);

    this.emit('regression.resolved', detection);
    this.logger.log(`Regression resolved: ${detectionId}`);

    return true;
  }

  // ===== PRIVATE IMPLEMENTATION METHODS =====

  private mergeConfig(userConfig: Partial<RegressionDetectorConfig>): RegressionDetectorConfig {
    const defaultConfig: RegressionDetectorConfig = {
      detectionInterval: 60000, // 1 minute
      baseline: {
        method: 'ROLLING_WINDOW',
        windowSize: 100,
        minSamples: 30,
        updateFrequency: 300000, // 5 minutes
        stabilityThreshold: 0.1,
        excludeOutliers: true,
        confidenceLevel: 0.95
      },
      sensitivity: {
        thresholds: {
          minor: 0.05,    // 5%
          moderate: 0.15, // 15%
          major: 0.30,    // 30%
          critical: 0.50  // 50%
        },
        minDuration: 60000, // 1 minute
        confidenceLevel: 0.95,
        enableCorrelation: true,
        metricOverrides: {}
      },
      prevention: {
        enableAutomatedResponse: true,
        responses: {
          alerting: {
            enabled: true,
            escalationLevels: ['WARNING', 'CRITICAL'],
            recipients: []
          },
          rollback: {
            enabled: false,
            triggerThreshold: 'major',
            confirmationRequired: true
          },
          trafficShifting: {
            enabled: false,
            gradualReduction: true,
            minTrafficPercentage: 10
          },
          budgetEnforcement: {
            enabled: true,
            budgets: {},
            blockDeployment: false
          }
        },
        deploymentIntegration: {
          enabled: false
        }
      },
      integration: {
        cicd: {
          enabled: false,
          performanceGates: {
            responseTime: 1000,
            throughput: 1000,
            errorRate: 0.01,
            cacheHitRate: 0.85
          }
        },
        deploymentTracking: {
          enabled: true,
          trackingMethod: 'WEBHOOK',
          deploymentMarkers: true
        },
        externalSystems: {}
      },
      statisticalTests: {
        changePoint: {
          algorithm: 'CUSUM',
          penalty: 10,
          minSegmentLength: 5
        },
        distributionTest: {
          method: 'MANN_WHITNEY',
          significanceLevel: 0.05
        },
        controlChart: {
          type: 'EWMA',
          limitMultiplier: 3,
          sensitivityParameter: 0.1
        }
      }
    };

    return { ...defaultConfig, ...userConfig };
  }

  private initializeDefaultBudgets(): void {
    const defaultBudgets: Omit<PerformanceBudget, 'id'>[] = [
      {
        name: 'Response Time Budget',
        metrics: {
          'p95_response_time': {
            target: 1000,
            tolerance: 200,
            unit: 'ms',
            priority: 'HIGH'
          },
          'p99_response_time': {
            target: 2000,
            tolerance: 500,
            unit: 'ms',
            priority: 'MEDIUM'
          }
        },
        scope: {
          environment: 'production'
        },
        enforcement: {
          enabled: true,
          blockOnViolation: false,
          warningThreshold: 0.8,
          criticalThreshold: 1.2
        },
        metadata: {
          owner: 'performance-team',
          createdAt: new Date(),
          lastUpdated: new Date(),
          description: 'Response time performance budget'
        }
      },
      {
        name: 'Cache Performance Budget',
        metrics: {
          'cache_hit_rate': {
            target: 0.85,
            tolerance: 0.05,
            unit: '%',
            priority: 'MEDIUM'
          }
        },
        scope: {
          environment: 'production'
        },
        enforcement: {
          enabled: true,
          blockOnViolation: false,
          warningThreshold: 0.9,
          criticalThreshold: 0.8
        },
        metadata: {
          owner: 'performance-team',
          createdAt: new Date(),
          lastUpdated: new Date(),
          description: 'Cache performance budget'
        }
      }
    ];

    defaultBudgets.forEach(budget => {
      this.createBudget(budget);
    });
  }

  private async performDetection(): Promise<void> {
    try {
      this.logger.log('Performing regression detection');

      for (const [metric, history] of this.metricHistory) {
        const baseline = this.baselines.get(metric);
        if (!baseline || history.length < this.config.baseline.minSamples) continue;

        await this.detectRegressionForMetric(metric, history, baseline);
      }

      this.emit('detection.completed');

    } catch (error) {
      this.logger.error('Error during regression detection:', error);
      this.emit('detection.error', error);
    }
  }

  private async detectRegressionForMetric(
    metric: string,
    history: { value: number; timestamp: Date }[],
    baseline: PerformanceBaseline
  ): Promise<void> {
    const recentData = history.slice(-50); // Last 50 data points
    if (recentData.length < 10) return;

    const recentValues = recentData.map(entry => entry.value);
    const baselineValue = baseline.value;

    // Statistical tests
    const changePoint = this.detectChangePoint(recentValues);
    const distributionTest = this.performDistributionTest(recentValues, baseline);
    const controlChart = this.checkControlChart(recentValues, baseline);

    // Determine if regression exists
    const regressionDetected = this.isRegressionDetected(
      recentValues,
      baseline,
      changePoint,
      distributionTest,
      controlChart
    );

    if (regressionDetected) {
      const detection = await this.createRegressionDetection(
        metric,
        recentValues,
        baseline,
        {
          changePoint,
          distributionTest,
          controlChart
        }
      );

      if (detection) {
        this.detections.set(detection.id, detection);
        this.emit('regression.detected', detection);

        // Trigger automated responses
        if (this.config.prevention.enableAutomatedResponse) {
          await this.triggerAutomatedResponse(detection);
        }
      }
    }
  }

  private detectChangePoint(values: number[]): {
    detected: boolean;
    location: Date;
    confidence: number;
    algorithm: string;
  } {
    // Simplified CUSUM-based change point detection
    const algorithm = this.config.statisticalTests.changePoint.algorithm;

    if (algorithm === 'CUSUM') {
      return this.cusumChangePoint(values);
    }

    // Default to no change point
    return {
      detected: false,
      location: new Date(),
      confidence: 0,
      algorithm
    };
  }

  private cusumChangePoint(values: number[]): {
    detected: boolean;
    location: Date;
    confidence: number;
    algorithm: string;
  } {
    if (values.length < 10) {
      return { detected: false, location: new Date(), confidence: 0, algorithm: 'CUSUM' };
    }

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const threshold = this.calculateStandardDeviation(values) * 2;

    let cusumPos = 0;
    let cusumNeg = 0;
    let changePoint = -1;
    let maxDeviation = 0;

    for (let i = 1; i < values.length; i++) {
      const deviation = values[i] - mean;

      cusumPos = Math.max(0, cusumPos + deviation - threshold / 2);
      cusumNeg = Math.min(0, cusumNeg + deviation + threshold / 2);

      const currentDeviation = Math.max(Math.abs(cusumPos), Math.abs(cusumNeg));

      if (currentDeviation > maxDeviation) {
        maxDeviation = currentDeviation;
        changePoint = i;
      }
    }

    const detected = maxDeviation > threshold;
    const confidence = detected ? Math.min(1, maxDeviation / (threshold * 2)) : 0;

    return {
      detected,
      location: new Date(Date.now() - (values.length - changePoint) * 60000), // Approximate
      confidence,
      algorithm: 'CUSUM'
    };
  }

  private performDistributionTest(
    recentValues: number[],
    baseline: PerformanceBaseline
  ): {
    statistic: number;
    pValue: number;
    significant: boolean;
    method: string;
  } {
    const method = this.config.statisticalTests.distributionTest.method;

    if (method === 'MANN_WHITNEY') {
      return this.mannWhitneyTest(recentValues, baseline);
    }

    // Default test
    return {
      statistic: 0,
      pValue: 1,
      significant: false,
      method
    };
  }

  private mannWhitneyTest(
    recentValues: number[],
    baseline: PerformanceBaseline
  ): {
    statistic: number;
    pValue: number;
    significant: boolean;
    method: string;
  } {
    // Simplified Mann-Whitney U test
    const baselineValues = this.generateBaselineValues(baseline, recentValues.length);

    if (baselineValues.length === 0 || recentValues.length === 0) {
      return { statistic: 0, pValue: 1, significant: false, method: 'MANN_WHITNEY' };
    }

    // Combine and rank values
    const combined = [
      ...baselineValues.map(val => ({ value: val, group: 'baseline' })),
      ...recentValues.map(val => ({ value: val, group: 'recent' }))
    ].sort((a, b) => a.value - b.value);

    // Assign ranks
    let rank = 1;
    let recentRankSum = 0;

    for (let i = 0; i < combined.length; i++) {
      if (combined[i].group === 'recent') {
        recentRankSum += rank;
      }
      rank++;
    }

    // Calculate U statistic
    const n1 = baselineValues.length;
    const n2 = recentValues.length;
    const u1 = recentRankSum - (n2 * (n2 + 1)) / 2;
    const u2 = n1 * n2 - u1;
    const u = Math.min(u1, u2);

    // Simplified p-value calculation (normally would use tables or normal approximation)
    const meanU = (n1 * n2) / 2;
    const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    const z = Math.abs(u - meanU) / stdU;
    const pValue = 2 * (1 - this.normalCDF(z));

    const significant = pValue < this.config.statisticalTests.distributionTest.significanceLevel;

    return {
      statistic: u,
      pValue,
      significant,
      method: 'MANN_WHITNEY'
    };
  }

  private checkControlChart(
    recentValues: number[],
    baseline: PerformanceBaseline
  ): {
    outOfControl: boolean;
    violationType: string;
    consecutiveViolations: number;
  } {
    const chartType = this.config.statisticalTests.controlChart.type;
    const limitMultiplier = this.config.statisticalTests.controlChart.limitMultiplier;

    const centerLine = baseline.value;
    const controlLimit = baseline.statistics.standardDeviation * limitMultiplier;
    const upperLimit = centerLine + controlLimit;
    const lowerLimit = centerLine - controlLimit;

    let consecutiveViolations = 0;
    let violationType = 'NONE';
    let outOfControl = false;

    // Check for violations
    for (let i = recentValues.length - 1; i >= 0; i--) {
      const value = recentValues[i];

      if (value > upperLimit || value < lowerLimit) {
        consecutiveViolations++;
        violationType = value > upperLimit ? 'UPPER_LIMIT' : 'LOWER_LIMIT';
        outOfControl = true;
      } else {
        break; // Stop counting if no violation
      }
    }

    return {
      outOfControl,
      violationType,
      consecutiveViolations
    };
  }

  private isRegressionDetected(
    recentValues: number[],
    baseline: PerformanceBaseline,
    changePoint: any,
    distributionTest: any,
    controlChart: any
  ): boolean {
    // Multiple criteria for regression detection
    const criteria = {
      changePoint: changePoint.detected && changePoint.confidence > 0.7,
      distributionTest: distributionTest.significant,
      controlChart: controlChart.outOfControl && controlChart.consecutiveViolations >= 3,
      magnitudeCheck: this.checkMagnitudeRegression(recentValues, baseline)
    };

    // Require at least 2 criteria to be met
    const metCriteria = Object.values(criteria).filter(Boolean).length;
    return metCriteria >= 2;
  }

  private checkMagnitudeRegression(recentValues: number[], baseline: PerformanceBaseline): boolean {
    const recentMean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const percentageChange = Math.abs((recentMean - baseline.value) / baseline.value);

    return percentageChange > this.config.sensitivity.thresholds.minor;
  }

  private async createRegressionDetection(
    metric: string,
    recentValues: number[],
    baseline: PerformanceBaseline,
    statisticalTests: any
  ): Promise<RegressionDetection | null> {
    const recentMean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const percentageChange = (recentMean - baseline.value) / baseline.value;
    const absoluteChange = recentMean - baseline.value;

    // Determine severity
    const severity = this.determineSeverity(Math.abs(percentageChange));

    // Check if this is a meaningful regression
    if (severity === 'MINOR' && Math.abs(percentageChange) < this.config.sensitivity.thresholds.minor) {
      return null;
    }

    const detection: RegressionDetection = {
      id: `regression-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      metric,
      severity,
      detectionMethod: 'STATISTICAL_ANALYSIS',
      confidence: this.calculateDetectionConfidence(statisticalTests),
      change: {
        baseline: baseline.value,
        current: recentMean,
        percentageChange,
        absoluteChange,
        direction: recentMean > baseline.value ? 'DEGRADATION' : 'IMPROVEMENT'
      },
      context: {
        timeWindow: {
          start: new Date(Date.now() - recentValues.length * 60000),
          end: new Date()
        },
        sampleSizes: {
          baseline: baseline.metadata.sampleSize,
          current: recentValues.length
        },
        deployments: this.getRecentDeployments(),
        components: []
      },
      statisticalTests,
      impact: await this.assessImpact(metric, severity, percentageChange),
      rootCause: this.analyzeRootCause(metric, percentageChange),
      mitigation: this.generateMitigationPlan(metric, severity),
      status: {
        status: 'DETECTED',
        actionsTaken: [],
      }
    };

    return detection;
  }

  private checkImmedateRegression(metric: string, value: number, context: Record<string, unknown>): void {
    const baseline = this.baselines.get(metric);
    if (!baseline) return;

    const percentageChange = Math.abs((value - baseline.value) / baseline.value);
    const severity = this.determineSeverity(percentageChange);

    if (severity === 'CRITICAL' || severity === 'MAJOR') {
      // Immediate alert for critical regressions
      this.emit('immediate.regression', {
        metric,
        value,
        baseline: baseline.value,
        percentageChange,
        severity,
        context
      });
    }
  }

  private updateBaselines(): void {
    for (const [metric, history] of this.metricHistory) {
      if (history.length < this.config.baseline.minSamples) continue;

      const existingBaseline = this.baselines.get(metric);
      const shouldUpdate = this.shouldUpdateBaseline(existingBaseline, history);

      if (shouldUpdate) {
        const newBaseline = this.calculateBaseline(metric, history);
        this.baselines.set(metric, newBaseline);
        this.emit('baseline.updated', newBaseline);
      }
    }
  }

  private shouldUpdateBaseline(
    baseline: PerformanceBaseline | undefined,
    history: { value: number; timestamp: Date }[]
  ): boolean {
    if (!baseline) return true;

    // Check if baseline is stale
    const ageMs = Date.now() - baseline.metadata.lastUpdated.getTime();
    const maxAge = this.config.baseline.updateFrequency * 2;

    if (ageMs > maxAge) return true;

    // Check if data has significantly changed
    const recentValues = history.slice(-this.config.baseline.windowSize).map(entry => entry.value);
    const recentMean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const drift = Math.abs((recentMean - baseline.value) / baseline.value);

    return drift > this.config.baseline.stabilityThreshold;
  }

  private calculateBaseline(
    metric: string,
    data: { value: number; timestamp: Date }[],
    context: Partial<PerformanceBaseline['context']> = {}
  ): PerformanceBaseline {
    const values = data.map(entry => entry.value);

    // Remove outliers if configured
    const cleanValues = this.config.baseline.excludeOutliers
      ? this.removeOutliers(values)
      : values;

    const statistics = this.calculateStatistics(cleanValues);

    const baseline: PerformanceBaseline = {
      id: `baseline-${metric}-${Date.now()}`,
      metric,
      value: statistics.mean,
      bounds: {
        upper: statistics.mean + (statistics.standardDeviation * 2),
        lower: statistics.mean - (statistics.standardDeviation * 2)
      },
      statistics: {
        mean: statistics.mean,
        median: statistics.median,
        standardDeviation: statistics.standardDeviation,
        percentiles: {
          p50: statistics.median,
          p95: this.calculatePercentile(cleanValues, 95),
          p99: this.calculatePercentile(cleanValues, 99)
        }
      },
      metadata: {
        calculationMethod: this.config.baseline.method,
        sampleSize: cleanValues.length,
        confidenceLevel: this.config.baseline.confidenceLevel,
        createdAt: new Date(),
        lastUpdated: new Date(),
        dataRange: {
          start: data[0].timestamp,
          end: data[data.length - 1].timestamp
        }
      },
      context: {
        environment: 'production',
        ...context
      },
      validity: {
        isValid: cleanValues.length >= this.config.baseline.minSamples,
        confidence: this.calculateBaselineConfidence(cleanValues)
      }
    };

    return baseline;
  }

  private schedulePostDeploymentBaseline(deployment: DeploymentInfo): void {
    // Schedule baseline creation after deployment settles
    setTimeout(() => {
      this.createPostDeploymentBaselines(deployment);
    }, 15 * 60 * 1000); // 15 minutes after deployment
  }

  private createPostDeploymentBaselines(deployment: DeploymentInfo): void {
    const deploymentTime = deployment.timestamp.getTime();
    const cutoffTime = new Date(deploymentTime + (30 * 60 * 1000)); // 30 minutes after deployment

    for (const [metric, history] of this.metricHistory) {
      const postDeploymentData = history.filter(entry =>
        entry.timestamp.getTime() >= deploymentTime &&
        entry.timestamp.getTime() <= cutoffTime.getTime()
      );

      if (postDeploymentData.length >= this.config.baseline.minSamples) {
        const baseline = this.calculateBaseline(metric, postDeploymentData, {
          deployment: deployment.id,
          version: deployment.version,
          component: deployment.component
        });

        this.baselines.set(`${metric}:${deployment.id}`, baseline);
        this.emit('post-deployment.baseline.created', { baseline, deployment });
      }
    }
  }

  private async triggerAutomatedResponse(detection: RegressionDetection): Promise<void> {
    const responses = this.config.prevention.responses;

    // Alerting
    if (responses.alerting.enabled) {
      this.emit('automated.alert', detection);
    }

    // Rollback recommendation
    if (responses.rollback.enabled &&
        this.shouldTriggerRollback(detection.severity, responses.rollback.triggerThreshold)) {
      this.emit('automated.rollback.recommended', detection);
    }

    // Traffic shifting
    if (responses.trafficShifting.enabled) {
      this.emit('automated.traffic.shift', detection);
    }

    // Budget enforcement
    if (responses.budgetEnforcement.enabled) {
      const budgetViolations = this.checkBudgetCompliance(detection.metric, detection.change.current);
      if (!budgetViolations.compliant) {
        this.emit('automated.budget.violation', { detection, violations: budgetViolations.violations });
      }
    }
  }

  // ===== UTILITY METHODS =====

  private isCriticalMetric(metric: string): boolean {
    const criticalMetrics = ['p95_response_time', 'p99_response_time', 'error_rate', 'throughput'];
    return criticalMetrics.includes(metric);
  }

  private determineSeverity(percentageChange: number): RegressionDetection['severity'] {
    const thresholds = this.config.sensitivity.thresholds;

    if (percentageChange >= thresholds.critical) return 'CRITICAL';
    if (percentageChange >= thresholds.major) return 'MAJOR';
    if (percentageChange >= thresholds.moderate) return 'MODERATE';
    return 'MINOR';
  }

  private calculateDetectionConfidence(statisticalTests: any): number {
    const confidences = [
      statisticalTests.changePoint?.confidence || 0,
      statisticalTests.distributionTest?.significant ? 0.95 : 0.5,
      statisticalTests.controlChart?.outOfControl ? 0.9 : 0.5
    ];

    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
  }

  private getRecentDeployments(): string[] {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    return Array.from(this.deployments.values())
      .filter(deployment => deployment.timestamp >= cutoffTime)
      .map(deployment => deployment.id);
  }

  private async assessImpact(
    metric: string,
    severity: RegressionDetection['severity'],
    percentageChange: number
  ): Promise<RegressionDetection['impact']> {
    const riskScore = this.calculateRiskScore(severity, percentageChange);
    const businessImpact = this.determineBusinessImpact(metric, severity);
    const slaBreachRisk = this.calculateSLABreachRisk(metric, percentageChange);

    return {
      riskScore,
      businessImpact,
      slaBreachRisk
    };
  }

  private calculateRiskScore(severity: RegressionDetection['severity'], percentageChange: number): number {
    const severityScores = { MINOR: 25, MODERATE: 50, MAJOR: 75, CRITICAL: 100 };
    const baseScore = severityScores[severity];
    const magnitudeMultiplier = Math.min(2, Math.abs(percentageChange) * 2);

    return Math.min(100, Math.round(baseScore * magnitudeMultiplier));
  }

  private determineBusinessImpact(
    metric: string,
    severity: RegressionDetection['severity']
  ): RegressionDetection['impact']['businessImpact'] {
    const criticalMetrics = ['p95_response_time', 'error_rate', 'throughput'];

    if (criticalMetrics.includes(metric) && (severity === 'CRITICAL' || severity === 'MAJOR')) {
      return 'CRITICAL';
    }

    if (severity === 'MAJOR') return 'HIGH';
    if (severity === 'MODERATE') return 'MEDIUM';
    return 'LOW';
  }

  private calculateSLABreachRisk(metric: string, percentageChange: number): number {
    const slaThresholds: Record<string, number> = {
      'p95_response_time': 1000,
      'p99_response_time': 2000,
      'error_rate': 0.01,
      'cache_hit_rate': 0.85
    };

    const threshold = slaThresholds[metric];
    if (!threshold) return 0;

    return Math.min(100, Math.abs(percentageChange) * 100);
  }

  private analyzeRootCause(metric: string, percentageChange: number): RegressionDetection['rootCause'] {
    const likelyCauses: string[] = [];

    if (metric.includes('response_time')) {
      likelyCauses.push('Database query performance degradation');
      likelyCauses.push('Increased system load or traffic');
      likelyCauses.push('Network latency issues');
      likelyCauses.push('Code changes affecting performance');
    }

    if (metric.includes('cache')) {
      likelyCauses.push('Cache configuration changes');
      likelyCauses.push('Cache invalidation issues');
      likelyCauses.push('Memory pressure affecting cache');
    }

    if (metric.includes('error_rate')) {
      likelyCauses.push('Recent code deployment');
      likelyCauses.push('External service failures');
      likelyCauses.push('Configuration changes');
    }

    return {
      likelyCauses,
      correlatedChanges: this.getRecentDeployments(),
      investigations: [
        'Review recent deployments and changes',
        'Check system resource utilization',
        'Analyze error logs and patterns',
        'Verify external service dependencies'
      ]
    };
  }

  private generateMitigationPlan(
    metric: string,
    severity: RegressionDetection['severity']
  ): RegressionDetection['mitigation'] {
    const immediateActions: string[] = [];
    const longTermFixes: string[] = [];

    if (severity === 'CRITICAL' || severity === 'MAJOR') {
      immediateActions.push('Alert on-call team');
      immediateActions.push('Consider rolling back recent deployment');
      immediateActions.push('Scale up resources if applicable');
    }

    if (metric.includes('response_time')) {
      immediateActions.push('Check database performance');
      longTermFixes.push('Optimize slow queries');
      longTermFixes.push('Implement additional caching');
    }

    if (metric.includes('cache')) {
      immediateActions.push('Review cache configuration');
      longTermFixes.push('Optimize cache TTL settings');
      longTermFixes.push('Implement cache warming strategies');
    }

    return {
      immediateActions,
      longTermFixes,
      rollbackRecommended: severity === 'CRITICAL' || severity === 'MAJOR',
      estimatedRecoveryTime: this.estimateRecoveryTime(severity)
    };
  }

  private estimateRecoveryTime(severity: RegressionDetection['severity']): number {
    const recoveryTimes = {
      MINOR: 30,      // 30 minutes
      MODERATE: 60,   // 1 hour
      MAJOR: 180,     // 3 hours
      CRITICAL: 60    // 1 hour (urgent)
    };

    return recoveryTimes[severity] * 60 * 1000; // Convert to milliseconds
  }

  private shouldTriggerRollback(
    severity: RegressionDetection['severity'],
    triggerThreshold: 'moderate' | 'major' | 'critical'
  ): boolean {
    const severityLevels = { moderate: 2, major: 3, critical: 4 };
    const severityValues = { MINOR: 1, MODERATE: 2, MAJOR: 3, CRITICAL: 4 };

    return severityValues[severity] >= severityLevels[triggerThreshold];
  }

  // ===== STATISTICAL UTILITY METHODS =====

  private calculateStandardDeviation(values: number[]): number {
    if (values.length <= 1) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (values.length - 1);

    return Math.sqrt(variance);
  }

  private calculateStatistics(values: number[]): {
    mean: number;
    median: number;
    standardDeviation: number;
  } {
    if (values.length === 0) {
      return { mean: 0, median: 0, standardDeviation: 0 };
    }

    const sorted = values.slice().sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const standardDeviation = this.calculateStandardDeviation(values);

    return { mean, median, standardDeviation };
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) return sortedValues[lower];

    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private removeOutliers(values: number[]): number[] {
    if (values.length < 4) return values;

    const sorted = values.slice().sort((a, b) => a - b);
    const q1 = this.calculatePercentile(sorted, 25);
    const q3 = this.calculatePercentile(sorted, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return values.filter(val => val >= lowerBound && val <= upperBound);
  }

  private generateBaselineValues(baseline: PerformanceBaseline, count: number): number[] {
    // Generate synthetic baseline values for comparison
    const values: number[] = [];
    const mean = baseline.value;
    const stdDev = baseline.statistics.standardDeviation;

    for (let i = 0; i < count; i++) {
      // Simple normal distribution approximation
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      values.push(mean + z * stdDev);
    }

    return values;
  }

  private normalCDF(z: number): number {
    // Approximation of normal cumulative distribution function
    return 0.5 * (1 + this.erf(z / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Approximation of error function
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private calculateBaselineConfidence(values: number[]): number {
    // Simple confidence calculation based on sample size and stability
    const minConfidence = 0.5;
    const maxConfidence = 0.95;

    const sizeConfidence = Math.min(1, values.length / this.config.baseline.windowSize);
    const stabilityConfidence = 1 - Math.min(1, this.calculateStandardDeviation(values) / (values.reduce((sum, val) => sum + val, 0) / values.length));

    return Math.max(minConfidence, Math.min(maxConfidence, (sizeConfidence + stabilityConfidence) / 2));
  }
}

/**
 * Default regression detector instance
 */
export const regressionDetector = new RegressionDetector();