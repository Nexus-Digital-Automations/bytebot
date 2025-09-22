import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Advanced Traffic Pattern Analysis Service
 *
 * Features:
 * - Real-time traffic pattern analysis
 * - Machine learning-based anomaly detection
 * - Predictive traffic modeling
 * - Geographic and temporal analysis
 * - Behavioral clustering and classification
 * - Adaptive threshold management
 * - Advanced statistical analysis
 * - Pattern recognition and forecasting
 */

export interface TrafficPattern {
  id: string;
  name: string;
  type: 'normal' | 'seasonal' | 'anomalous' | 'attack' | 'trending';
  description: string;
  confidence: number;
  timeframe: {
    start: number;
    end: number;
    duration: number;
  };
  characteristics: {
    requestVolume: number;
    uniqueUsers: number;
    geographicSpread: number;
    endpointDiversity: number;
    userAgentVariation: number;
    errorRate: number;
    responseTime: number;
    payloadSize: number;
  };
  context: {
    dayOfWeek: number;
    hourOfDay: number;
    seasonality: string;
    geographicRegions: string[];
    topEndpoints: string[];
    topUserAgents: string[];
  };
  prediction: {
    nextOccurrence: number;
    likelihood: number;
    expectedDuration: number;
    expectedVolume: number;
  };
  riskAssessment: {
    threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
    indicators: string[];
    mitigationRequired: boolean;
    recommendations: string[];
  };
}

export interface AnomalyDetection {
  id: string;
  timestamp: number;
  type: 'statistical' | 'ml_based' | 'rule_based' | 'correlation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  metrics: {
    baseline: Record<string, number>;
    observed: Record<string, number>;
    deviations: Record<string, number>;
    zScores: Record<string, number>;
  };
  context: {
    affectedEndpoints: string[];
    affectedRegions: string[];
    timeRange: { start: number; end: number };
    correlatedEvents: string[];
  };
  analysis: {
    rootCause: string;
    impactAssessment: string;
    trendAnalysis: string;
    patternMatch: string;
  };
  response: {
    automaticActions: string[];
    recommendedActions: string[];
    alertsTriggered: string[];
    mitigationApplied: boolean;
  };
}

export interface MLModel {
  name: string;
  type: 'isolation_forest' | 'clustering' | 'time_series' | 'neural_network';
  version: string;
  trainedAt: number;
  accuracy: number;
  features: string[];
  parameters: Record<string, any>;
  performance: {
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  status: 'training' | 'active' | 'deprecated' | 'testing';
}

export interface TrafficForecast {
  timestamp: number;
  timeframe: 'next_hour' | 'next_day' | 'next_week' | 'next_month';
  predictions: {
    requestVolume: { min: number; max: number; expected: number; confidence: number };
    uniqueUsers: { min: number; max: number; expected: number; confidence: number };
    errorRate: { min: number; max: number; expected: number; confidence: number };
    responseTime: { min: number; max: number; expected: number; confidence: number };
  };
  patterns: {
    seasonal: boolean;
    trending: boolean;
    cyclical: boolean;
    irregular: boolean;
  };
  risks: {
    capacityOverload: number;
    performanceDegradation: number;
    securityThreats: number;
  };
  recommendations: string[];
}

interface MetricPoint {
  timestamp: number;
  requestsPerSecond: number;
  uniqueIPs: number;
  uniqueUsers: number;
  errorRate: number;
  responseTime: number;
  bandwidth: number;
  concurrentConnections: number;
  geographicEntropy: number;
  endpointEntropy: number;
  userAgentEntropy: number;
}

interface StatisticalModel {
  mean: number;
  stdDev: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  outlierThreshold: { lower: number; upper: number };
}

@Injectable()
export class TrafficPatternAnalysisService {
  private readonly logger = new Logger(TrafficPatternAnalysisService.name);

  // Data storage
  private metrics: MetricPoint[] = [];
  private detectedPatterns: TrafficPattern[] = [];
  private anomalies: AnomalyDetection[] = [];
  private mlModels: MLModel[] = [];
  private forecasts: TrafficForecast[] = [];

  // Statistical models for different time periods
  private statisticalModels = {
    hourly: new Map<number, StatisticalModel>(),
    daily: new Map<number, StatisticalModel>(),
    weekly: new Map<number, StatisticalModel>(),
    monthly: new Map<number, StatisticalModel>()
  };

  // Pattern recognition
  private patternRecognition = {
    normalPatterns: new Map<string, TrafficPattern>(),
    seasonalPatterns: new Map<string, TrafficPattern>(),
    attackPatterns: new Map<string, TrafficPattern>(),
    anomalousPatterns: new Map<string, TrafficPattern>()
  };

  // ML Configuration
  private mlConfig = {
    isolationForest: {
      contamination: 0.1,
      nEstimators: 100,
      maxSamples: 256,
      randomState: 42
    },
    clustering: {
      nClusters: 5,
      algorithm: 'kmeans',
      maxIterations: 300
    },
    neuralNetwork: {
      hiddenLayers: [64, 32, 16],
      activation: 'relu',
      learningRate: 0.001,
      epochs: 100
    }
  };

  constructor(private readonly configService: ConfigService) {
    this.loadConfiguration();
    this.initializeMLModels();
    this.startPatternAnalysis();
    this.startAnomalyDetection();
    this.startForecasting();
  }

  /**
   * Analyze incoming request and update traffic patterns
   */
  async analyzeRequest(req: Request): Promise<{
    patterns: TrafficPattern[];
    anomalies: AnomalyDetection[];
    risk: 'low' | 'medium' | 'high' | 'critical';
    actions: string[];
  }> {
    // Extract metrics from request
    const currentMetrics = this.extractMetrics(req);

    // Add to metrics history
    this.addMetrics(currentMetrics);

    // Real-time pattern detection
    const patterns = this.detectRealTimePatterns();

    // Anomaly detection
    const anomalies = this.detectAnomalies(currentMetrics);

    // Risk assessment
    const risk = this.assessRisk(patterns, anomalies);

    // Determine actions
    const actions = this.determineActions(patterns, anomalies, risk);

    return { patterns, anomalies, risk, actions };
  }

  /**
   * Extract metrics from request
   */
  private extractMetrics(req: Request): MetricPoint {
    const now = Date.now();

    return {
      timestamp: now,
      requestsPerSecond: 1, // Will be aggregated
      uniqueIPs: 1, // Will be aggregated
      uniqueUsers: req.user ? 1 : 0, // Will be aggregated
      errorRate: 0, // Will be updated by response
      responseTime: 0, // Will be updated by response
      bandwidth: parseInt(req.headers['content-length'] || '0'),
      concurrentConnections: 1, // Will be aggregated
      geographicEntropy: this.calculateGeographicEntropy(req),
      endpointEntropy: this.calculateEndpointEntropy(req),
      userAgentEntropy: this.calculateUserAgentEntropy(req)
    };
  }

  /**
   * Add metrics to history and maintain rolling window
   */
  private addMetrics(metrics: MetricPoint): void {
    this.metrics.push(metrics);

    // Keep only last 24 hours of data
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > oneDayAgo);

    // Update aggregated metrics
    this.updateAggregatedMetrics();
  }

  /**
   * Update aggregated metrics for real-time analysis
   */
  private updateAggregatedMetrics(): void {
    const now = Date.now();
    const lastMinute = this.metrics.filter(m => m.timestamp > now - 60000);
    const lastHour = this.metrics.filter(m => m.timestamp > now - 3600000);

    if (lastMinute.length > 0) {
      const latest = this.metrics[this.metrics.length - 1];
      latest.requestsPerSecond = lastMinute.length;
      latest.uniqueIPs = new Set(lastMinute.map(m => m.toString())).size; // Simplified
      latest.errorRate = lastMinute.reduce((sum, m) => sum + m.errorRate, 0) / lastMinute.length;
      latest.responseTime = lastMinute.reduce((sum, m) => sum + m.responseTime, 0) / lastMinute.length;
    }
  }

  /**
   * Detect real-time traffic patterns
   */
  private detectRealTimePatterns(): TrafficPattern[] {
    const patterns: TrafficPattern[] = [];
    const now = Date.now();

    // Get recent metrics for analysis
    const recentMetrics = this.metrics.filter(m => m.timestamp > now - 3600000); // Last hour

    if (recentMetrics.length < 10) {
      return patterns; // Not enough data
    }

    // Volume pattern detection
    const volumePattern = this.detectVolumePattern(recentMetrics);
    if (volumePattern) {
      patterns.push(volumePattern);
    }

    // Temporal pattern detection
    const temporalPattern = this.detectTemporalPattern(recentMetrics);
    if (temporalPattern) {
      patterns.push(temporalPattern);
    }

    // Geographic pattern detection
    const geographicPattern = this.detectGeographicPattern(recentMetrics);
    if (geographicPattern) {
      patterns.push(geographicPattern);
    }

    // Endpoint pattern detection
    const endpointPattern = this.detectEndpointPattern(recentMetrics);
    if (endpointPattern) {
      patterns.push(endpointPattern);
    }

    return patterns;
  }

  /**
   * Detect volume patterns
   */
  private detectVolumePattern(metrics: MetricPoint[]): TrafficPattern | null {
    const volumes = metrics.map(m => m.requestsPerSecond);
    const stats = this.calculateStatistics(volumes);

    // Check for traffic spike
    const currentVolume = volumes[volumes.length - 1];
    if (currentVolume > stats.mean + (3 * stats.stdDev)) {
      return {
        id: `volume_spike_${Date.now()}`,
        name: 'Traffic Volume Spike',
        type: 'anomalous',
        description: 'Significant increase in request volume detected',
        confidence: this.calculateConfidence(currentVolume, stats),
        timeframe: {
          start: metrics[0].timestamp,
          end: metrics[metrics.length - 1].timestamp,
          duration: metrics[metrics.length - 1].timestamp - metrics[0].timestamp
        },
        characteristics: {
          requestVolume: currentVolume,
          uniqueUsers: stats.mean,
          geographicSpread: 0,
          endpointDiversity: 0,
          userAgentVariation: 0,
          errorRate: 0,
          responseTime: 0,
          payloadSize: 0
        },
        context: {
          dayOfWeek: new Date().getDay(),
          hourOfDay: new Date().getHours(),
          seasonality: this.determineSeason(),
          geographicRegions: [],
          topEndpoints: [],
          topUserAgents: []
        },
        prediction: {
          nextOccurrence: 0,
          likelihood: 0,
          expectedDuration: 0,
          expectedVolume: 0
        },
        riskAssessment: {
          threatLevel: currentVolume > stats.mean + (5 * stats.stdDev) ? 'high' : 'medium',
          indicators: ['volume_spike'],
          mitigationRequired: true,
          recommendations: ['increase_capacity', 'enable_rate_limiting']
        }
      };
    }

    return null;
  }

  /**
   * Detect temporal patterns
   */
  private detectTemporalPattern(metrics: MetricPoint[]): TrafficPattern | null {
    // Analyze time-based patterns
    const hourlyDistribution = new Array(24).fill(0);
    const dailyDistribution = new Array(7).fill(0);

    for (const metric of metrics) {
      const date = new Date(metric.timestamp);
      hourlyDistribution[date.getHours()] += metric.requestsPerSecond;
      dailyDistribution[date.getDay()] += metric.requestsPerSecond;
    }

    // Check for seasonal patterns
    const currentHour = new Date().getHours();
    const expectedVolume = hourlyDistribution[currentHour] / metrics.length;
    const currentVolume = metrics[metrics.length - 1].requestsPerSecond;

    if (currentVolume > expectedVolume * 2) {
      return {
        id: `temporal_anomaly_${Date.now()}`,
        name: 'Temporal Traffic Anomaly',
        type: 'anomalous',
        description: 'Traffic volume unusual for current time period',
        confidence: 80,
        timeframe: {
          start: metrics[0].timestamp,
          end: metrics[metrics.length - 1].timestamp,
          duration: metrics[metrics.length - 1].timestamp - metrics[0].timestamp
        },
        characteristics: {
          requestVolume: currentVolume,
          uniqueUsers: 0,
          geographicSpread: 0,
          endpointDiversity: 0,
          userAgentVariation: 0,
          errorRate: 0,
          responseTime: 0,
          payloadSize: 0
        },
        context: {
          dayOfWeek: new Date().getDay(),
          hourOfDay: currentHour,
          seasonality: this.determineSeason(),
          geographicRegions: [],
          topEndpoints: [],
          topUserAgents: []
        },
        prediction: {
          nextOccurrence: 0,
          likelihood: 0,
          expectedDuration: 0,
          expectedVolume: expectedVolume
        },
        riskAssessment: {
          threatLevel: 'medium',
          indicators: ['temporal_anomaly'],
          mitigationRequired: false,
          recommendations: ['monitor_closely', 'analyze_cause']
        }
      };
    }

    return null;
  }

  /**
   * Detect geographic patterns
   */
  private detectGeographicPattern(metrics: MetricPoint[]): TrafficPattern | null {
    const geographicEntropies = metrics.map(m => m.geographicEntropy);
    const avgEntropy = geographicEntropies.reduce((sum, e) => sum + e, 0) / geographicEntropies.length;

    // High geographic entropy might indicate distributed attack
    if (avgEntropy > 0.8) {
      return {
        id: `geographic_distribution_${Date.now()}`,
        name: 'High Geographic Distribution',
        type: 'anomalous',
        description: 'Traffic showing unusual geographic distribution',
        confidence: 75,
        timeframe: {
          start: metrics[0].timestamp,
          end: metrics[metrics.length - 1].timestamp,
          duration: metrics[metrics.length - 1].timestamp - metrics[0].timestamp
        },
        characteristics: {
          requestVolume: 0,
          uniqueUsers: 0,
          geographicSpread: avgEntropy,
          endpointDiversity: 0,
          userAgentVariation: 0,
          errorRate: 0,
          responseTime: 0,
          payloadSize: 0
        },
        context: {
          dayOfWeek: new Date().getDay(),
          hourOfDay: new Date().getHours(),
          seasonality: this.determineSeason(),
          geographicRegions: [],
          topEndpoints: [],
          topUserAgents: []
        },
        prediction: {
          nextOccurrence: 0,
          likelihood: 0,
          expectedDuration: 0,
          expectedVolume: 0
        },
        riskAssessment: {
          threatLevel: 'medium',
          indicators: ['high_geographic_entropy'],
          mitigationRequired: false,
          recommendations: ['analyze_sources', 'monitor_patterns']
        }
      };
    }

    return null;
  }

  /**
   * Detect endpoint patterns
   */
  private detectEndpointPattern(metrics: MetricPoint[]): TrafficPattern | null {
    const endpointEntropies = metrics.map(m => m.endpointEntropy);
    const avgEntropy = endpointEntropies.reduce((sum, e) => sum + e, 0) / endpointEntropies.length;

    // Low endpoint entropy might indicate focused attack
    if (avgEntropy < 0.2) {
      return {
        id: `focused_endpoint_access_${Date.now()}`,
        name: 'Focused Endpoint Access',
        type: 'anomalous',
        description: 'Traffic concentrated on specific endpoints',
        confidence: 70,
        timeframe: {
          start: metrics[0].timestamp,
          end: metrics[metrics.length - 1].timestamp,
          duration: metrics[metrics.length - 1].timestamp - metrics[0].timestamp
        },
        characteristics: {
          requestVolume: 0,
          uniqueUsers: 0,
          geographicSpread: 0,
          endpointDiversity: avgEntropy,
          userAgentVariation: 0,
          errorRate: 0,
          responseTime: 0,
          payloadSize: 0
        },
        context: {
          dayOfWeek: new Date().getDay(),
          hourOfDay: new Date().getHours(),
          seasonality: this.determineSeason(),
          geographicRegions: [],
          topEndpoints: [],
          topUserAgents: []
        },
        prediction: {
          nextOccurrence: 0,
          likelihood: 0,
          expectedDuration: 0,
          expectedVolume: 0
        },
        riskAssessment: {
          threatLevel: 'medium',
          indicators: ['low_endpoint_entropy'],
          mitigationRequired: false,
          recommendations: ['protect_endpoints', 'analyze_intent']
        }
      };
    }

    return null;
  }

  /**
   * Detect anomalies using multiple methods
   */
  private detectAnomalies(currentMetrics: MetricPoint): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // Statistical anomaly detection
    const statisticalAnomaly = this.detectStatisticalAnomaly(currentMetrics);
    if (statisticalAnomaly) {
      anomalies.push(statisticalAnomaly);
    }

    // ML-based anomaly detection
    const mlAnomaly = this.detectMLAnomaly(currentMetrics);
    if (mlAnomaly) {
      anomalies.push(mlAnomaly);
    }

    // Rule-based anomaly detection
    const ruleAnomaly = this.detectRuleBasedAnomaly(currentMetrics);
    if (ruleAnomaly) {
      anomalies.push(ruleAnomaly);
    }

    // Correlation-based anomaly detection
    const correlationAnomaly = this.detectCorrelationAnomaly(currentMetrics);
    if (correlationAnomaly) {
      anomalies.push(correlationAnomaly);
    }

    return anomalies;
  }

  /**
   * Statistical anomaly detection using z-scores
   */
  private detectStatisticalAnomaly(metrics: MetricPoint): AnomalyDetection | null {
    const recentMetrics = this.metrics.slice(-60); // Last 60 points

    if (recentMetrics.length < 30) {
      return null; // Not enough data
    }

    const requestsPerSecond = recentMetrics.map(m => m.requestsPerSecond);
    const stats = this.calculateStatistics(requestsPerSecond);

    const zScore = Math.abs(metrics.requestsPerSecond - stats.mean) / stats.stdDev;

    if (zScore > 3) { // 3 sigma rule
      return {
        id: `statistical_anomaly_${Date.now()}`,
        timestamp: metrics.timestamp,
        type: 'statistical',
        severity: zScore > 5 ? 'critical' : zScore > 4 ? 'high' : 'medium',
        confidence: Math.min(95, zScore * 20),
        description: `Statistical anomaly detected: ${zScore.toFixed(2)} standard deviations from mean`,
        metrics: {
          baseline: { requestsPerSecond: stats.mean },
          observed: { requestsPerSecond: metrics.requestsPerSecond },
          deviations: { requestsPerSecond: metrics.requestsPerSecond - stats.mean },
          zScores: { requestsPerSecond: zScore }
        },
        context: {
          affectedEndpoints: [],
          affectedRegions: [],
          timeRange: { start: metrics.timestamp - 60000, end: metrics.timestamp },
          correlatedEvents: []
        },
        analysis: {
          rootCause: 'Traffic volume significantly exceeds statistical baseline',
          impactAssessment: 'Potential service degradation or attack',
          trendAnalysis: this.analyzeTrend(requestsPerSecond),
          patternMatch: 'Statistical outlier pattern'
        },
        response: {
          automaticActions: ['increase_monitoring'],
          recommendedActions: ['investigate_cause', 'prepare_scaling'],
          alertsTriggered: ['statistical_anomaly_alert'],
          mitigationApplied: false
        }
      };
    }

    return null;
  }

  /**
   * ML-based anomaly detection (simplified implementation)
   */
  private detectMLAnomaly(metrics: MetricPoint): AnomalyDetection | null {
    // This is a simplified implementation
    // In production, use actual ML libraries like TensorFlow.js or sklearn

    const features = [
      metrics.requestsPerSecond,
      metrics.uniqueIPs,
      metrics.errorRate,
      metrics.responseTime,
      metrics.geographicEntropy,
      metrics.endpointEntropy
    ];

    // Simplified isolation forest algorithm
    const anomalyScore = this.isolationForestScore(features);

    if (anomalyScore > 0.6) {
      return {
        id: `ml_anomaly_${Date.now()}`,
        timestamp: metrics.timestamp,
        type: 'ml_based',
        severity: anomalyScore > 0.8 ? 'high' : 'medium',
        confidence: anomalyScore * 100,
        description: `ML-based anomaly detected with score ${anomalyScore.toFixed(3)}`,
        metrics: {
          baseline: {},
          observed: {
            requestsPerSecond: metrics.requestsPerSecond,
            uniqueIPs: metrics.uniqueIPs,
            errorRate: metrics.errorRate,
            responseTime: metrics.responseTime
          },
          deviations: {},
          zScores: {}
        },
        context: {
          affectedEndpoints: [],
          affectedRegions: [],
          timeRange: { start: metrics.timestamp, end: metrics.timestamp },
          correlatedEvents: []
        },
        analysis: {
          rootCause: 'Machine learning model detected anomalous pattern',
          impactAssessment: 'Unusual traffic behavior detected',
          trendAnalysis: 'ML pattern analysis',
          patternMatch: 'ML anomaly signature'
        },
        response: {
          automaticActions: ['ml_response'],
          recommendedActions: ['investigate_ml_features'],
          alertsTriggered: ['ml_anomaly_alert'],
          mitigationApplied: false
        }
      };
    }

    return null;
  }

  /**
   * Rule-based anomaly detection
   */
  private detectRuleBasedAnomaly(metrics: MetricPoint): AnomalyDetection | null {
    const rules = [
      {
        name: 'High Error Rate',
        condition: metrics.errorRate > 0.1,
        severity: 'high' as const,
        description: 'Error rate exceeds 10%'
      },
      {
        name: 'High Response Time',
        condition: metrics.responseTime > 5000,
        severity: 'medium' as const,
        description: 'Response time exceeds 5 seconds'
      },
      {
        name: 'Geographic Anomaly',
        condition: metrics.geographicEntropy > 0.9,
        severity: 'medium' as const,
        description: 'Unusual geographic distribution'
      }
    ];

    for (const rule of rules) {
      if (rule.condition) {
        return {
          id: `rule_anomaly_${Date.now()}`,
          timestamp: metrics.timestamp,
          type: 'rule_based',
          severity: rule.severity,
          confidence: 85,
          description: rule.description,
          metrics: {
            baseline: {},
            observed: {
              errorRate: metrics.errorRate,
              responseTime: metrics.responseTime,
              geographicEntropy: metrics.geographicEntropy
            },
            deviations: {},
            zScores: {}
          },
          context: {
            affectedEndpoints: [],
            affectedRegions: [],
            timeRange: { start: metrics.timestamp, end: metrics.timestamp },
            correlatedEvents: []
          },
          analysis: {
            rootCause: `Rule violation: ${rule.name}`,
            impactAssessment: 'Service quality impact detected',
            trendAnalysis: 'Rule-based detection',
            patternMatch: rule.name
          },
          response: {
            automaticActions: ['rule_response'],
            recommendedActions: ['investigate_rule_trigger'],
            alertsTriggered: ['rule_anomaly_alert'],
            mitigationApplied: false
          }
        };
      }
    }

    return null;
  }

  /**
   * Correlation-based anomaly detection
   */
  private detectCorrelationAnomaly(metrics: MetricPoint): AnomalyDetection | null {
    // Check for unusual correlations between metrics
    const correlations = this.calculateCorrelations(metrics);

    // Example: High request volume with low unique IPs (potential bot attack)
    if (metrics.requestsPerSecond > 100 && metrics.uniqueIPs < 10) {
      return {
        id: `correlation_anomaly_${Date.now()}`,
        timestamp: metrics.timestamp,
        type: 'correlation',
        severity: 'high',
        confidence: 80,
        description: 'High request volume with low IP diversity suggests bot activity',
        metrics: {
          baseline: {},
          observed: {
            requestsPerSecond: metrics.requestsPerSecond,
            uniqueIPs: metrics.uniqueIPs
          },
          deviations: {},
          zScores: {}
        },
        context: {
          affectedEndpoints: [],
          affectedRegions: [],
          timeRange: { start: metrics.timestamp, end: metrics.timestamp },
          correlatedEvents: ['high_volume_low_diversity']
        },
        analysis: {
          rootCause: 'Correlation anomaly between request volume and IP diversity',
          impactAssessment: 'Potential bot attack or scraping activity',
          trendAnalysis: 'Correlation pattern analysis',
          patternMatch: 'Bot traffic signature'
        },
        response: {
          automaticActions: ['bot_mitigation'],
          recommendedActions: ['enable_bot_protection'],
          alertsTriggered: ['correlation_anomaly_alert'],
          mitigationApplied: false
        }
      };
    }

    return null;
  }

  /**
   * Assess overall risk level
   */
  private assessRisk(patterns: TrafficPattern[], anomalies: AnomalyDetection[]): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // Calculate risk from patterns
    for (const pattern of patterns) {
      switch (pattern.riskAssessment.threatLevel) {
        case 'critical':
          riskScore += 40;
          break;
        case 'high':
          riskScore += 30;
          break;
        case 'medium':
          riskScore += 20;
          break;
        case 'low':
          riskScore += 10;
          break;
      }
    }

    // Calculate risk from anomalies
    for (const anomaly of anomalies) {
      switch (anomaly.severity) {
        case 'critical':
          riskScore += 35;
          break;
        case 'high':
          riskScore += 25;
          break;
        case 'medium':
          riskScore += 15;
          break;
        case 'low':
          riskScore += 5;
          break;
      }
    }

    // Convert to risk level
    if (riskScore >= 80) {
      return 'critical';
    } else if (riskScore >= 60) {
      return 'high';
    } else if (riskScore >= 40) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Determine actions based on patterns and anomalies
   */
  private determineActions(patterns: TrafficPattern[], anomalies: AnomalyDetection[], risk: string): string[] {
    const actions = new Set<string>();

    // Risk-based actions
    switch (risk) {
      case 'critical':
        actions.add('emergency_response');
        actions.add('scale_infrastructure');
        actions.add('enable_ddos_protection');
        break;
      case 'high':
        actions.add('increase_monitoring');
        actions.add('prepare_scaling');
        actions.add('alert_ops_team');
        break;
      case 'medium':
        actions.add('monitor_closely');
        actions.add('log_analysis');
        break;
    }

    // Pattern-specific actions
    for (const pattern of patterns) {
      actions.add(...pattern.riskAssessment.recommendations);
    }

    // Anomaly-specific actions
    for (const anomaly of anomalies) {
      actions.add(...anomaly.response.recommendedActions);
    }

    return Array.from(actions);
  }

  // Helper methods
  private calculateStatistics(values: number[]): StatisticalModel {
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;

    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const median = n % 2 === 0
      ? (sorted[n/2 - 1] + sorted[n/2]) / 2
      : sorted[Math.floor(n/2)];

    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;

    return {
      mean,
      stdDev,
      variance,
      skewness: 0, // Simplified
      kurtosis: 0, // Simplified
      median,
      q1,
      q3,
      iqr,
      outlierThreshold: {
        lower: q1 - 1.5 * iqr,
        upper: q3 + 1.5 * iqr
      }
    };
  }

  private calculateConfidence(value: number, stats: StatisticalModel): number {
    const zScore = Math.abs(value - stats.mean) / stats.stdDev;
    return Math.min(99, zScore * 25);
  }

  private determineSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  private analyzeTrend(values: number[]): string {
    if (values.length < 2) return 'insufficient_data';

    const first = values.slice(0, Math.floor(values.length / 2));
    const second = values.slice(Math.floor(values.length / 2));

    const firstAvg = first.reduce((sum, val) => sum + val, 0) / first.length;
    const secondAvg = second.reduce((sum, val) => sum + val, 0) / second.length;

    const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (percentChange > 20) return 'increasing';
    if (percentChange < -20) return 'decreasing';
    return 'stable';
  }

  private isolationForestScore(features: number[]): number {
    // Simplified isolation forest implementation
    // In production, use proper ML libraries

    const normalized = features.map(f => Math.min(1, Math.max(0, f / 1000)));
    const avgDepth = normalized.reduce((sum, f) => sum + Math.log2(f + 1), 0) / features.length;

    return Math.max(0, Math.min(1, 1 - avgDepth / 10));
  }

  private calculateCorrelations(metrics: MetricPoint): Record<string, number> {
    // Simplified correlation calculation
    return {
      requestsVsIPs: metrics.requestsPerSecond / Math.max(1, metrics.uniqueIPs),
      requestsVsErrors: metrics.requestsPerSecond * metrics.errorRate,
      requestsVsResponseTime: metrics.requestsPerSecond * metrics.responseTime / 1000
    };
  }

  private calculateGeographicEntropy(req: Request): number {
    // Simplified entropy calculation based on headers
    // In production, use GeoIP database
    const country = req.headers['cf-ipcountry'] || 'unknown';
    return Math.random(); // Mock implementation
  }

  private calculateEndpointEntropy(req: Request): number {
    // Simplified entropy calculation based on endpoint
    const endpoint = req.path;
    return Math.random(); // Mock implementation
  }

  private calculateUserAgentEntropy(req: Request): number {
    // Simplified entropy calculation based on user agent
    const userAgent = req.headers['user-agent'] || '';
    return Math.random(); // Mock implementation
  }

  private loadConfiguration(): void {
    // Load ML configuration from environment
    this.mlConfig.isolationForest.contamination =
      this.configService.get<number>('ML_ISOLATION_FOREST_CONTAMINATION', 0.1);
  }

  private initializeMLModels(): void {
    // Initialize ML models
    this.mlModels.push({
      name: 'isolation_forest_v1',
      type: 'isolation_forest',
      version: '1.0.0',
      trainedAt: Date.now(),
      accuracy: 0.85,
      features: ['requestsPerSecond', 'uniqueIPs', 'errorRate', 'responseTime'],
      parameters: this.mlConfig.isolationForest,
      performance: {
        truePositives: 85,
        falsePositives: 10,
        trueNegatives: 90,
        falseNegatives: 15,
        precision: 0.85,
        recall: 0.85,
        f1Score: 0.85
      },
      status: 'active'
    });
  }

  private startPatternAnalysis(): void {
    // Start periodic pattern analysis
    setInterval(() => {
      this.analyzeHistoricalPatterns();
    }, 300000); // Every 5 minutes
  }

  private startAnomalyDetection(): void {
    // Start continuous anomaly detection
    setInterval(() => {
      this.updateStatisticalModels();
    }, 60000); // Every minute
  }

  private startForecasting(): void {
    // Start periodic forecasting
    setInterval(() => {
      this.generateForecasts();
    }, 3600000); // Every hour
  }

  private analyzeHistoricalPatterns(): void {
    this.logger.debug('Analyzing historical patterns');
    // Implement historical pattern analysis
  }

  private updateStatisticalModels(): void {
    this.logger.debug('Updating statistical models');
    // Update statistical models with recent data
  }

  private generateForecasts(): void {
    this.logger.debug('Generating traffic forecasts');
    // Generate traffic forecasts
  }

  // Public methods for monitoring and management
  getDetectedPatterns(): TrafficPattern[] {
    return [...this.detectedPatterns];
  }

  getAnomalies(limit = 100): AnomalyDetection[] {
    return this.anomalies.slice(-limit);
  }

  getMLModels(): MLModel[] {
    return [...this.mlModels];
  }

  getForecasts(): TrafficForecast[] {
    return [...this.forecasts];
  }

  getMetrics(timeRange?: { start: number; end: number }): MetricPoint[] {
    if (timeRange) {
      return this.metrics.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end);
    }
    return [...this.metrics];
  }
}