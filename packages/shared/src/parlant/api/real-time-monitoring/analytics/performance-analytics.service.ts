/**
 * @fileoverview Performance Analytics Service
 * PARLANT Phase 1 - Real-time performance tracking, bottleneck detection, and predictive analytics
 * Provides comprehensive monitoring with intelligent insights and optimization recommendations
 *
 * @version 1.0.0
 * @author AIgent PARLANT Team
 * @since 2025-09-22
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { performance } from 'perf_hooks';
import {
  PerformanceAnalytics,
  RealTimeMetrics,
  HistoricalTrend,
  AnomalyDetection,
  BottleneckAnalysis,
  PredictiveInsight,
  OptimizationSuggestion,
  LatencyMetrics,
  ThroughputMetrics,
  ErrorRateMetrics,
  ResourceUtilizationMetrics,
  BusinessMetrics,
  Bottleneck,
  PerformanceImpact,
  RootCauseAnalysis,
  ResolutionSuggestion,
  Anomaly,
  DataPoint,
  SeasonalityPattern,
  OptimizationBenefit,
  ImplementationGuide,
  PreventiveAction
} from '../interfaces/real-time-monitoring.interface';

/**
 * Performance Analytics Service
 *
 * Features:
 * - Real-time performance metrics collection and analysis
 * - Intelligent bottleneck detection with root cause analysis
 * - Predictive analytics for performance forecasting
 * - Anomaly detection with machine learning algorithms
 * - Optimization recommendations with impact assessment
 * - Historical trend analysis and seasonality detection
 * - Business impact correlation and KPI tracking
 * - Enterprise-grade performance insights and reporting
 */
@Injectable()
export class PerformanceAnalyticsService extends EventEmitter {
  private readonly logger = new Logger(PerformanceAnalyticsService.name);

  // Analytics engines and components
  private metricsCollectors = new Map<string, MetricsCollector>();
  private anomalyDetectors = new Map<string, AnomalyDetector>();
  private bottleneckAnalyzers = new Map<string, BottleneckAnalyzer>();
  private predictiveModels = new Map<string, PredictiveModel>();

  // Data storage and caching
  private realTimeMetricsCache = new Map<string, RealTimeMetrics>();
  private historicalDataCache = new Map<string, HistoricalDataSet>();
  private bottleneckCache = new Map<string, BottleneckAnalysis>();
  private predictionCache = new Map<string, PredictiveInsight[]>();

  // Performance monitoring
  private analysisIntervals = new Map<string, NodeJS.Timeout>();
  private performanceBaselines = new Map<string, PerformanceBaseline>();
  private alertThresholds = new Map<string, AlertThresholds>();

  // Analytics configuration
  private config: PerformanceAnalyticsConfig = {
    collection: {
      intervalMs: 1000, // 1 second for real-time
      batchSize: 100,
      retentionPeriodMs: 86400000, // 24 hours
      compressionEnabled: true
    },
    detection: {
      anomalyThreshold: 2.5, // Standard deviations
      bottleneckThreshold: 0.8, // 80% resource utilization
      trendAnalysisWindow: 3600000, // 1 hour
      seasonalityDetection: true
    },
    prediction: {
      forecastHorizonMs: 3600000, // 1 hour
      modelUpdateInterval: 300000, // 5 minutes
      confidenceThreshold: 0.7,
      enableMachineLearning: true
    },
    optimization: {
      maxSuggestions: 10,
      impactThreshold: 0.1, // 10% improvement
      priorityWeighting: {
        performance: 0.4,
        cost: 0.3,
        reliability: 0.3
      }
    }
  };

  constructor() {
    super();
    this.initializeAnalyticsEngines();
    this.setupEventHandlers();
  }

  /**
   * Initializes comprehensive performance analytics for an operation
   */
  async initializePerformanceAnalytics(operationId: string): Promise<PerformanceAnalytics> {
    const startTime = performance.now();

    try {
      // Create metrics collector
      const metricsCollector = await this.createMetricsCollector(operationId);
      this.metricsCollectors.set(operationId, metricsCollector);

      // Initialize anomaly detector
      const anomalyDetector = await this.createAnomalyDetector(operationId);
      this.anomalyDetectors.set(operationId, anomalyDetector);

      // Create bottleneck analyzer
      const bottleneckAnalyzer = await this.createBottleneckAnalyzer(operationId);
      this.bottleneckAnalyzers.set(operationId, bottleneckAnalyzer);

      // Initialize predictive model
      const predictiveModel = await this.createPredictiveModel(operationId);
      this.predictiveModels.set(operationId, predictiveModel);

      // Collect initial metrics
      const initialMetrics = await this.collectInitialMetrics(operationId);

      // Create performance analytics instance
      const analytics: PerformanceAnalytics = {
        operationId,
        realTimeMetrics: initialMetrics,
        historicalTrends: await this.getHistoricalTrends(operationId),
        anomalyDetection: await this.performAnomalyDetection(operationId, initialMetrics),
        bottleneckAnalysis: await this.analyzeBottlenecks(operationId, initialMetrics),
        predictiveInsights: await this.generatePredictiveInsights(operationId),
        optimizationSuggestions: await this.generateOptimizationSuggestions(operationId, initialMetrics)
      };

      // Start continuous monitoring
      await this.startContinuousMonitoring(operationId);

      const initTime = performance.now() - startTime;

      this.logger.log(`Performance analytics initialized in ${initTime.toFixed(2)}ms`, {
        operationId,
        metricsCollected: Object.keys(initialMetrics).length,
        anomaliesDetected: analytics.anomalyDetection.anomaliesDetected.length,
        bottlenecksFound: analytics.bottleneckAnalysis.detectedBottlenecks.length,
        initTime
      });

      return analytics;
    } catch (error) {
      const initTime = performance.now() - startTime;
      this.logger.error(`Performance analytics initialization failed after ${initTime.toFixed(2)}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        initTime
      });
      throw error;
    }
  }

  /**
   * Collects and analyzes real-time performance metrics
   */
  async collectRealTimeMetrics(operationId: string): Promise<RealTimeMetrics> {
    const startTime = performance.now();

    try {
      const collector = this.metricsCollectors.get(operationId);
      if (!collector) {
        throw new Error(`Metrics collector not found for operation: ${operationId}`);
      }

      // Collect metrics from multiple sources
      const [
        latencyMetrics,
        throughputMetrics,
        errorMetrics,
        resourceMetrics,
        businessMetrics
      ] = await Promise.all([
        this.collectLatencyMetrics(operationId),
        this.collectThroughputMetrics(operationId),
        this.collectErrorMetrics(operationId),
        this.collectResourceMetrics(operationId),
        this.collectBusinessMetrics(operationId)
      ]);

      // Aggregate custom metrics
      const customMetrics = await this.collectCustomMetrics(operationId);

      const metrics: RealTimeMetrics = {
        timestamp: new Date(),
        latency: latencyMetrics,
        throughput: throughputMetrics,
        errorRates: errorMetrics,
        resourceUtilization: resourceMetrics,
        businessMetrics: businessMetrics,
        customMetrics
      };

      // Cache metrics for quick access
      this.realTimeMetricsCache.set(operationId, metrics);

      // Trigger real-time analysis
      this.emit('metrics_collected', { operationId, metrics });

      const collectionTime = performance.now() - startTime;

      this.logger.debug(`Real-time metrics collected in ${collectionTime.toFixed(2)}ms`, {
        operationId,
        latencyP95: latencyMetrics.p95,
        throughput: throughputMetrics.requestsPerSecond,
        errorRate: errorMetrics.overall,
        collectionTime
      });

      return metrics;
    } catch (error) {
      const collectionTime = performance.now() - startTime;
      this.logger.error(`Metrics collection failed after ${collectionTime.toFixed(2)}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        collectionTime
      });
      throw error;
    }
  }

  /**
   * Performs intelligent bottleneck detection and analysis
   */
  async analyzeBottlenecks(
    operationId: string,
    metrics: RealTimeMetrics
  ): Promise<BottleneckAnalysis> {
    const startTime = performance.now();

    try {
      const analyzer = this.bottleneckAnalyzers.get(operationId);
      if (!analyzer) {
        throw new Error(`Bottleneck analyzer not found for operation: ${operationId}`);
      }

      // Detect bottlenecks using multiple algorithms
      const detectedBottlenecks = await this.detectBottlenecks(metrics, analyzer);

      // Assess performance impact
      const performanceImpact = await this.assessPerformanceImpact(detectedBottlenecks, metrics);

      // Perform root cause analysis
      const rootCauseAnalysis = await this.performRootCauseAnalysis(
        detectedBottlenecks,
        operationId
      );

      // Generate resolution suggestions
      const resolutionSuggestions = await this.generateResolutionSuggestions(
        detectedBottlenecks,
        performanceImpact
      );

      // Calculate priority and estimated resolution time
      const priorityLevel = this.calculateBottleneckPriority(performanceImpact);
      const estimatedResolutionTime = this.estimateResolutionTime(resolutionSuggestions);

      const analysis: BottleneckAnalysis = {
        detectedBottlenecks,
        performanceImpact,
        rootCauseAnalysis,
        resolutionSuggestions,
        estimatedResolutionTime,
        priorityLevel
      };

      // Cache analysis for quick access
      this.bottleneckCache.set(operationId, analysis);

      // Emit bottleneck detected event
      if (detectedBottlenecks.length > 0) {
        this.emit('bottlenecks_detected', { operationId, analysis });
      }

      const analysisTime = performance.now() - startTime;

      this.logger.log(`Bottleneck analysis completed in ${analysisTime.toFixed(2)}ms`, {
        operationId,
        bottlenecksDetected: detectedBottlenecks.length,
        priorityLevel,
        analysisTime
      });

      return analysis;
    } catch (error) {
      const analysisTime = performance.now() - startTime;
      this.logger.error(`Bottleneck analysis failed after ${analysisTime.toFixed(2)}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        analysisTime
      });
      throw error;
    }
  }

  /**
   * Performs advanced anomaly detection with machine learning
   */
  async performAnomalyDetection(
    operationId: string,
    metrics: RealTimeMetrics
  ): Promise<AnomalyDetection> {
    const startTime = performance.now();

    try {
      const detector = this.anomalyDetectors.get(operationId);
      if (!detector) {
        throw new Error(`Anomaly detector not found for operation: ${operationId}`);
      }

      // Get historical baseline
      const baseline = await this.getPerformanceBaseline(operationId);

      // Detect anomalies using multiple algorithms
      const anomalies = await this.detectAnomalies(metrics, baseline, detector);

      // Calculate detection confidence
      const confidence = this.calculateDetectionConfidence(anomalies, baseline);

      // Determine baseline range
      const baselineRange = this.calculateBaselineRange(baseline);

      const detection: AnomalyDetection = {
        anomaliesDetected: anomalies,
        detectionModel: detector.model,
        confidence,
        baselineRange,
        detectionSensitivity: detector.sensitivity
      };

      // Emit anomaly detected event
      if (anomalies.length > 0) {
        this.emit('anomalies_detected', { operationId, detection });
      }

      const detectionTime = performance.now() - startTime;

      this.logger.debug(`Anomaly detection completed in ${detectionTime.toFixed(2)}ms`, {
        operationId,
        anomaliesFound: anomalies.length,
        confidence,
        detectionTime
      });

      return detection;
    } catch (error) {
      const detectionTime = performance.now() - startTime;
      this.logger.error(`Anomaly detection failed after ${detectionTime.toFixed(2)}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        detectionTime
      });
      throw error;
    }
  }

  /**
   * Generates predictive insights for performance forecasting
   */
  async generatePredictiveInsights(operationId: string): Promise<PredictiveInsight[]> {
    const startTime = performance.now();

    try {
      const model = this.predictiveModels.get(operationId);
      if (!model) {
        throw new Error(`Predictive model not found for operation: ${operationId}`);
      }

      // Get historical data for prediction
      const historicalData = await this.getHistoricalData(operationId);

      // Generate predictions for different scenarios
      const insights = await Promise.all([
        this.predictPerformanceDegradation(operationId, historicalData, model),
        this.predictCapacityIssues(operationId, historicalData, model),
        this.predictSecurityRisks(operationId, historicalData, model),
        this.predictBusinessImpact(operationId, historicalData, model)
      ]);

      // Filter and sort insights by confidence and importance
      const filteredInsights = insights
        .flat()
        .filter(insight => insight.confidence >= this.config.prediction.confidenceThreshold)
        .sort((a, b) => b.confidence - a.confidence);

      // Cache predictions
      this.predictionCache.set(operationId, filteredInsights);

      // Emit predictions available event
      if (filteredInsights.length > 0) {
        this.emit('predictions_generated', { operationId, insights: filteredInsights });
      }

      const predictionTime = performance.now() - startTime;

      this.logger.log(`Predictive insights generated in ${predictionTime.toFixed(2)}ms`, {
        operationId,
        insightsGenerated: filteredInsights.length,
        highConfidenceInsights: filteredInsights.filter(i => i.confidence > 0.8).length,
        predictionTime
      });

      return filteredInsights;
    } catch (error) {
      const predictionTime = performance.now() - startTime;
      this.logger.error(`Predictive insights generation failed after ${predictionTime.toFixed(2)}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        predictionTime
      });
      return [];
    }
  }

  /**
   * Generates intelligent optimization suggestions
   */
  async generateOptimizationSuggestions(
    operationId: string,
    metrics: RealTimeMetrics
  ): Promise<OptimizationSuggestion[]> {
    const startTime = performance.now();

    try {
      // Analyze current performance characteristics
      const performanceProfile = await this.analyzePerformanceProfile(metrics);

      // Identify optimization opportunities
      const opportunities = await this.identifyOptimizationOpportunities(
        operationId,
        performanceProfile
      );

      // Generate suggestions with impact assessment
      const suggestions: OptimizationSuggestion[] = [];

      for (const opportunity of opportunities) {
        const suggestion = await this.createOptimizationSuggestion(
          opportunity,
          performanceProfile
        );
        suggestions.push(suggestion);
      }

      // Prioritize suggestions by estimated benefit
      const prioritizedSuggestions = this.prioritizeOptimizationSuggestions(suggestions);

      // Limit to configured maximum
      const finalSuggestions = prioritizedSuggestions.slice(0, this.config.optimization.maxSuggestions);

      const suggestionTime = performance.now() - startTime;

      this.logger.log(`Optimization suggestions generated in ${suggestionTime.toFixed(2)}ms`, {
        operationId,
        suggestionsGenerated: finalSuggestions.length,
        topSuggestionBenefit: finalSuggestions[0]?.estimatedBenefit?.overallImprovement || 0,
        suggestionTime
      });

      return finalSuggestions;
    } catch (error) {
      const suggestionTime = performance.now() - startTime;
      this.logger.error(`Optimization suggestions generation failed after ${suggestionTime.toFixed(2)}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        suggestionTime
      });
      return [];
    }
  }

  /**
   * Gets comprehensive historical trends and analysis
   */
  async getHistoricalTrends(operationId: string): Promise<HistoricalTrend[]> {
    const startTime = performance.now();

    try {
      const historicalData = await this.getHistoricalData(operationId);

      // Analyze trends for different metrics
      const trends = await Promise.all([
        this.analyzeTrend('latency', historicalData.latency),
        this.analyzeTrend('throughput', historicalData.throughput),
        this.analyzeTrend('error_rate', historicalData.errorRate),
        this.analyzeTrend('resource_utilization', historicalData.resourceUtilization)
      ]);

      const trendTime = performance.now() - startTime;

      this.logger.debug(`Historical trends analyzed in ${trendTime.toFixed(2)}ms`, {
        operationId,
        trendsAnalyzed: trends.length,
        trendTime
      });

      return trends;
    } catch (error) {
      const trendTime = performance.now() - startTime;
      this.logger.error(`Historical trend analysis failed after ${trendTime.toFixed(2)}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        trendTime
      });
      return [];
    }
  }

  /**
   * Private implementation methods
   */
  private initializeAnalyticsEngines(): void {
    // Initialize analytics components
  }

  private setupEventHandlers(): void {
    this.on('metrics_collected', this.handleMetricsCollected.bind(this));
    this.on('bottlenecks_detected', this.handleBottlenecksDetected.bind(this));
    this.on('anomalies_detected', this.handleAnomaliesDetected.bind(this));
    this.on('predictions_generated', this.handlePredictionsGenerated.bind(this));
  }

  private async handleMetricsCollected(event: { operationId: string; metrics: RealTimeMetrics }): Promise<void> {
    // Trigger real-time analysis based on new metrics
    await this.performRealTimeAnalysis(event.operationId, event.metrics);
  }

  private async handleBottlenecksDetected(event: { operationId: string; analysis: BottleneckAnalysis }): Promise<void> {
    // Handle bottleneck detection
    this.logger.warn(`Bottlenecks detected for operation ${event.operationId}`, {
      bottleneckCount: event.analysis.detectedBottlenecks.length,
      priority: event.analysis.priorityLevel
    });
  }

  private async handleAnomaliesDetected(event: { operationId: string; detection: AnomalyDetection }): Promise<void> {
    // Handle anomaly detection
    this.logger.warn(`Anomalies detected for operation ${event.operationId}`, {
      anomalyCount: event.detection.anomaliesDetected.length,
      confidence: event.detection.confidence
    });
  }

  private async handlePredictionsGenerated(event: { operationId: string; insights: PredictiveInsight[] }): Promise<void> {
    // Handle prediction generation
    this.logger.log(`Predictions generated for operation ${event.operationId}`, {
      predictionCount: event.insights.length
    });
  }

  // Placeholder implementations for complex methods
  private async createMetricsCollector(operationId: string): Promise<MetricsCollector> {
    return {
      operationId,
      collectionInterval: this.config.collection.intervalMs,
      sources: ['api', 'database', 'cache', 'external_services'],
      lastCollection: new Date()
    };
  }

  private async createAnomalyDetector(operationId: string): Promise<AnomalyDetector> {
    return {
      operationId,
      model: 'statistical_threshold',
      sensitivity: this.config.detection.anomalyThreshold,
      lastUpdate: new Date()
    };
  }

  private async createBottleneckAnalyzer(operationId: string): Promise<BottleneckAnalyzer> {
    return {
      operationId,
      algorithms: ['resource_utilization', 'response_time', 'queue_analysis'],
      threshold: this.config.detection.bottleneckThreshold,
      lastAnalysis: new Date()
    };
  }

  private async createPredictiveModel(operationId: string): Promise<PredictiveModel> {
    return {
      operationId,
      modelType: 'time_series_forecast',
      horizon: this.config.prediction.forecastHorizonMs,
      lastTraining: new Date(),
      accuracy: 0.85
    };
  }

  private async collectInitialMetrics(operationId: string): Promise<RealTimeMetrics> {
    return await this.collectRealTimeMetrics(operationId);
  }

  private async startContinuousMonitoring(operationId: string): Promise<void> {
    const interval = setInterval(async () => {
      try {
        await this.collectRealTimeMetrics(operationId);
      } catch (error) {
        this.logger.error(`Continuous monitoring error for operation ${operationId}`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, this.config.collection.intervalMs);

    this.analysisIntervals.set(operationId, interval);
  }

  // Additional placeholder methods for metric collection
  private async collectLatencyMetrics(operationId: string): Promise<LatencyMetrics> {
    // Mock implementation - replace with actual metric collection
    return {
      p50: 100 + Math.random() * 50,
      p95: 200 + Math.random() * 100,
      p99: 500 + Math.random() * 200,
      max: 1000 + Math.random() * 500,
      average: 150 + Math.random() * 75
    };
  }

  private async collectThroughputMetrics(operationId: string): Promise<ThroughputMetrics> {
    return {
      requestsPerSecond: 1000 + Math.random() * 500,
      peakThroughput: 1800 + Math.random() * 200,
      sustainedThroughput: 900 + Math.random() * 100,
      throughputTrend: (Math.random() - 0.5) * 0.1
    };
  }

  private async collectErrorMetrics(operationId: string): Promise<ErrorRateMetrics> {
    return {
      overall: Math.random() * 0.05, // 0-5% error rate
      byType: new Map([
        ['timeout', Math.random() * 0.02],
        ['validation', Math.random() * 0.01],
        ['system', Math.random() * 0.005]
      ]),
      trend: (Math.random() - 0.5) * 0.01,
      criticalErrors: Math.floor(Math.random() * 3)
    };
  }

  private async collectResourceMetrics(operationId: string): Promise<ResourceUtilizationMetrics> {
    return {
      cpu: 50 + Math.random() * 30,
      memory: 60 + Math.random() * 25,
      network: 40 + Math.random() * 20,
      storage: 70 + Math.random() * 15,
      connections: 100 + Math.random() * 50
    };
  }

  private async collectBusinessMetrics(operationId: string): Promise<BusinessMetrics> {
    return {
      userSatisfaction: 0.85 + Math.random() * 0.15,
      completionRate: 0.90 + Math.random() * 0.10,
      retryRate: Math.random() * 0.05,
      escalationRate: Math.random() * 0.02,
      customBusinessKPIs: new Map([
        ['conversion_rate', 0.15 + Math.random() * 0.10],
        ['customer_retention', 0.80 + Math.random() * 0.15]
      ])
    };
  }

  private async collectCustomMetrics(operationId: string): Promise<Map<string, number>> {
    return new Map([
      ['cache_hit_rate', 0.75 + Math.random() * 0.20],
      ['database_query_time', 50 + Math.random() * 30],
      ['external_api_latency', 200 + Math.random() * 100]
    ]);
  }

  // Additional method placeholders...
  private async detectBottlenecks(metrics: RealTimeMetrics, analyzer: BottleneckAnalyzer): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];

    // Check CPU bottleneck
    if (metrics.resourceUtilization.cpu > analyzer.threshold * 100) {
      bottlenecks.push({
        type: 'cpu',
        location: 'application_server',
        severity: (metrics.resourceUtilization.cpu - analyzer.threshold * 100) / 20,
        impact: await this.calculateBottleneckImpact('cpu', metrics),
        detectionTime: new Date(),
        estimatedDuration: 300000 // 5 minutes
      });
    }

    return bottlenecks;
  }

  private async calculateBottleneckImpact(type: string, metrics: RealTimeMetrics): Promise<PerformanceImpact> {
    return {
      userExperience: 0.7,
      businessMetrics: new Map([['response_time_impact', 0.3]]),
      systemStability: 0.8,
      costImplications: 0.1
    };
  }

  // More placeholder implementations continue...
  private async performRealTimeAnalysis(operationId: string, metrics: RealTimeMetrics): Promise<void> {
    // Perform real-time analysis triggers
  }

  // Additional complex method placeholders would continue here...
}

// Supporting interfaces and types
interface MetricsCollector {
  operationId: string;
  collectionInterval: number;
  sources: string[];
  lastCollection: Date;
}

interface AnomalyDetector {
  operationId: string;
  model: string;
  sensitivity: number;
  lastUpdate: Date;
}

interface BottleneckAnalyzer {
  operationId: string;
  algorithms: string[];
  threshold: number;
  lastAnalysis: Date;
}

interface PredictiveModel {
  operationId: string;
  modelType: string;
  horizon: number;
  lastTraining: Date;
  accuracy: number;
}

interface PerformanceAnalyticsConfig {
  collection: {
    intervalMs: number;
    batchSize: number;
    retentionPeriodMs: number;
    compressionEnabled: boolean;
  };
  detection: {
    anomalyThreshold: number;
    bottleneckThreshold: number;
    trendAnalysisWindow: number;
    seasonalityDetection: boolean;
  };
  prediction: {
    forecastHorizonMs: number;
    modelUpdateInterval: number;
    confidenceThreshold: number;
    enableMachineLearning: boolean;
  };
  optimization: {
    maxSuggestions: number;
    impactThreshold: number;
    priorityWeighting: {
      performance: number;
      cost: number;
      reliability: number;
    };
  };
}

interface PerformanceBaseline {
  operationId: string;
  baselineMetrics: RealTimeMetrics;
  calculatedAt: Date;
  confidence: number;
}

interface AlertThresholds {
  latencyMs: number;
  errorRatePercent: number;
  throughputDropPercent: number;
  resourceUtilizationPercent: number;
  businessMetricThresholds: Map<string, number>;
}

interface HistoricalDataSet {
  latency: DataPoint[];
  throughput: DataPoint[];
  errorRate: DataPoint[];
  resourceUtilization: DataPoint[];
}

interface NumberRange {
  min: number;
  max: number;
  mean: number;
  stdDev: number;
}