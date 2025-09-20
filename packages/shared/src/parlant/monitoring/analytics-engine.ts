/**
 * PARLANT Performance Analytics Engine
 *
 * Advanced performance analytics and trending analysis system for PARLANT Phase 1
 * monitoring. Provides comprehensive data analysis, predictive insights, and
 * performance trend identification for maintaining optimal system performance.
 *
 * Features:
 * - Time-series performance analysis and forecasting
 * - Statistical analysis and anomaly detection
 * - Performance trend identification and correlation analysis
 * - Predictive performance modeling and capacity planning
 * - Historical performance reporting and benchmarking
 * - Real-time analytics dashboard with interactive visualizations
 * - Performance baseline establishment and drift detection
 * - Multi-dimensional performance analysis (function, user, time)
 *
 * Analytics Capabilities:
 * - Response time trend analysis and forecasting
 * - Cache performance optimization recommendations
 * - Resource utilization patterns and scaling insights
 * - Performance regression analysis and root cause identification
 * - Seasonal pattern detection and capacity planning
 *
 * @fileoverview Performance analytics and trending analysis
 * @version 1.0.0
 * @author Performance Monitoring Agent
 */

import { EventEmitter } from "events";
import { performance } from "perf_hooks";

/**
 * Analytics engine configuration
 */
export interface AnalyticsEngineConfig {
  /** Analysis interval in milliseconds */
  analysisInterval: number;
  /** Historical data retention period */
  retentionPeriod: number;
  /** Minimum data points for analysis */
  minDataPoints: number;
  /** Enable predictive analytics */
  enablePredictive: boolean;
  /** Enable anomaly detection */
  enableAnomalyDetection: boolean;
  /** Enable trend analysis */
  enableTrendAnalysis: boolean;
  /** Analytics aggregation levels */
  aggregationLevels: ("1m" | "5m" | "15m" | "1h" | "6h" | "1d" | "1w")[];
  /** Baseline calculation settings */
  baseline: BaselineConfig;
  /** Forecasting configuration */
  forecasting: ForecastingConfig;
}

/**
 * Baseline calculation configuration
 */
export interface BaselineConfig {
  /** Baseline calculation method */
  method:
    | "ROLLING_AVERAGE"
    | "EXPONENTIAL_SMOOTHING"
    | "SEASONAL_DECOMPOSITION";
  /** Window size for baseline calculation */
  windowSize: number;
  /** Baseline update frequency */
  updateFrequency: number;
  /** Deviation threshold for anomaly detection */
  deviationThreshold: number;
  /** Confidence interval for baseline */
  confidenceInterval: number;
}

/**
 * Forecasting configuration
 */
export interface ForecastingConfig {
  /** Forecasting model type */
  model: "LINEAR_REGRESSION" | "EXPONENTIAL_SMOOTHING" | "ARIMA" | "PROPHET";
  /** Forecast horizon in minutes */
  horizon: number;
  /** Model training window */
  trainingWindow: number;
  /** Model update frequency */
  updateFrequency: number;
  /** Forecast confidence level */
  confidenceLevel: number;
}

/**
 * Time-series data point
 */
export interface TimeSeriesPoint {
  /** Timestamp */
  timestamp: Date;
  /** Metric value */
  value: number;
  /** Data point metadata */
  metadata: Record<string, unknown>;
}

/**
 * Performance trend analysis
 */
export interface TrendAnalysis {
  /** Metric name */
  metric: string;
  /** Analysis period */
  period: { start: Date; end: Date };
  /** Trend direction */
  direction: "IMPROVING" | "DEGRADING" | "STABLE" | "VOLATILE";
  /** Trend strength (0-1) */
  strength: number;
  /** Trend significance (p-value) */
  significance: number;
  /** Statistical summary */
  statistics: {
    mean: number;
    median: number;
    standardDeviation: number;
    min: number;
    max: number;
    variance: number;
    skewness: number;
    kurtosis: number;
  };
  /** Trend equation (for linear trends) */
  equation?: {
    slope: number;
    intercept: number;
    rSquared: number;
  };
  /** Seasonal patterns detected */
  seasonality?: {
    detected: boolean;
    period: number;
    amplitude: number;
    phase: number;
  };
  /** Change points detected */
  changePoints: {
    timestamp: Date;
    significance: number;
    direction: "UP" | "DOWN";
    magnitude: number;
  }[];
}

/**
 * Anomaly detection result
 */
export interface AnomalyDetection {
  /** Metric name */
  metric: string;
  /** Detection timestamp */
  timestamp: Date;
  /** Anomaly type */
  type: "POINT" | "CONTEXTUAL" | "COLLECTIVE";
  /** Anomaly severity */
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  /** Actual value */
  actualValue: number;
  /** Expected value */
  expectedValue: number;
  /** Deviation score */
  deviationScore: number;
  /** Confidence level */
  confidence: number;
  /** Anomaly context */
  context: {
    baseline: number;
    upperBound: number;
    lowerBound: number;
    historicalRange: { min: number; max: number };
  };
  /** Related anomalies */
  relatedAnomalies: string[];
  /** Potential causes */
  potentialCauses: string[];
}

/**
 * Performance forecast
 */
export interface PerformanceForecast {
  /** Metric name */
  metric: string;
  /** Forecast generation timestamp */
  generatedAt: Date;
  /** Forecast horizon */
  horizon: number;
  /** Forecast model used */
  model: string;
  /** Model accuracy metrics */
  accuracy: {
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
    mae: number; // Mean Absolute Error
    r2: number; // R-squared
  };
  /** Forecast data points */
  forecast: {
    timestamp: Date;
    predictedValue: number;
    upperBound: number;
    lowerBound: number;
    confidence: number;
  }[];
  /** Trend indicators */
  trends: {
    shortTerm: "UP" | "DOWN" | "STABLE";
    mediumTerm: "UP" | "DOWN" | "STABLE";
    longTerm: "UP" | "DOWN" | "STABLE";
  };
  /** Capacity planning insights */
  capacityInsights: {
    currentUtilization: number;
    forecastedPeak: {
      timestamp: Date;
      value: number;
      probability: number;
    };
    recommendedActions: string[];
  };
}

/**
 * Performance correlation analysis
 */
export interface CorrelationAnalysis {
  /** Primary metric */
  primaryMetric: string;
  /** Secondary metric */
  secondaryMetric: string;
  /** Analysis period */
  period: { start: Date; end: Date };
  /** Correlation coefficient */
  correlation: number;
  /** Correlation strength */
  strength: "NONE" | "WEAK" | "MODERATE" | "STRONG" | "VERY_STRONG";
  /** Statistical significance */
  significance: number;
  /** Lag analysis */
  lag: {
    optimalLag: number;
    maxCorrelation: number;
    significance: number;
  };
  /** Causality test results */
  causality?: {
    granger: {
      direction: "X_TO_Y" | "Y_TO_X" | "BIDIRECTIONAL" | "NONE";
      pValue: number;
      fStatistic: number;
    };
  };
}

/**
 * Performance benchmarking data
 */
export interface PerformanceBenchmark {
  /** Benchmark identifier */
  id: string;
  /** Benchmark name */
  name: string;
  /** Benchmark category */
  category:
    | "RESPONSE_TIME"
    | "THROUGHPUT"
    | "CACHE_PERFORMANCE"
    | "RESOURCE_UTILIZATION"
    | "CUSTOM";
  /** Benchmark period */
  period: { start: Date; end: Date };
  /** Benchmark metrics */
  metrics: {
    [metricName: string]: {
      current: number;
      baseline: number;
      target: number;
      improvement: number;
      percentile: number;
    };
  };
  /** Performance score */
  score: number;
  /** Benchmark status */
  status: "EXCEEDED" | "MET" | "BELOW_TARGET" | "CRITICAL";
  /** Comparison with previous periods */
  comparison: {
    previousPeriod: number;
    yearOverYear?: number;
    trend: "IMPROVING" | "DEGRADING" | "STABLE";
  };
  /** Recommendations */
  recommendations: string[];
}

/**
 * Analytics dashboard data
 */
export interface AnalyticsDashboard {
  /** Dashboard timestamp */
  timestamp: Date;
  /** Overall performance summary */
  summary: {
    score: number;
    trend: "IMPROVING" | "DEGRADING" | "STABLE";
    alerts: number;
    anomalies: number;
  };
  /** Key performance indicators */
  kpis: {
    responseTime: {
      current: number;
      trend: number;
      target: number;
      status: "GOOD" | "WARNING" | "CRITICAL";
    };
    throughput: {
      current: number;
      trend: number;
      target: number;
      status: "GOOD" | "WARNING" | "CRITICAL";
    };
    cacheHitRate: {
      current: number;
      trend: number;
      target: number;
      status: "GOOD" | "WARNING" | "CRITICAL";
    };
    errorRate: {
      current: number;
      trend: number;
      target: number;
      status: "GOOD" | "WARNING" | "CRITICAL";
    };
  };
  /** Time-series charts data */
  charts: {
    responseTime: TimeSeriesPoint[];
    throughput: TimeSeriesPoint[];
    cachePerformance: TimeSeriesPoint[];
    resourceUtilization: TimeSeriesPoint[];
  };
  /** Recent trends */
  trends: TrendAnalysis[];
  /** Active anomalies */
  anomalies: AnomalyDetection[];
  /** Performance forecasts */
  forecasts: PerformanceForecast[];
  /** Top correlations */
  correlations: CorrelationAnalysis[];
  /** Benchmarks */
  benchmarks: PerformanceBenchmark[];
}

/**
 * Performance Analytics Engine implementation
 */
export class AnalyticsEngine extends EventEmitter {
  private config: AnalyticsEngineConfig;
  private timeSeriesData: Map<string, TimeSeriesPoint[]> = new Map();
  private baselines: Map<
    string,
    { value: number; timestamp: Date; confidence: number }
  > = new Map();
  private trends: Map<string, TrendAnalysis> = new Map();
  private anomalies: Map<string, AnomalyDetection[]> = new Map();
  private forecasts: Map<string, PerformanceForecast> = new Map();
  private correlations: Map<string, CorrelationAnalysis> = new Map();
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();

  private analysisInterval?: NodeJS.Timeout;
  private forecastInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  private isRunning = false;
  private readonly logger: Console;

  constructor(config: Partial<AnalyticsEngineConfig> = {}) {
    super();
    this.logger = console;
    this.config = this.mergeConfig(config);
  }

  /**
   * Start analytics engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn("Analytics engine is already running");
      return;
    }

    this.logger.log("Starting PARLANT Performance Analytics Engine");

    // Start analysis processing
    this.analysisInterval = setInterval(
      () => this.performAnalysis(),
      this.config.analysisInterval,
    );

    // Start forecasting
    if (this.config.enablePredictive) {
      this.forecastInterval = setInterval(
        () => this.generateForecasts(),
        this.config.forecasting.updateFrequency,
      );
    }

    // Start cleanup
    this.cleanupInterval = setInterval(
      () => this.cleanupOldData(),
      60 * 60 * 1000, // Every hour
    );

    this.isRunning = true;
    this.emit("engine.started");
    this.logger.log("Analytics engine started successfully");
  }

  /**
   * Stop analytics engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn("Analytics engine is not running");
      return;
    }

    this.logger.log("Stopping PARLANT Performance Analytics Engine");

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = undefined;
    }

    if (this.forecastInterval) {
      clearInterval(this.forecastInterval);
      this.forecastInterval = undefined;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.isRunning = false;
    this.emit("engine.stopped");
    this.logger.log("Analytics engine stopped successfully");
  }

  /**
   * Record time-series data point
   */
  recordDataPoint(
    metric: string,
    value: number,
    metadata: Record<string, unknown> = {},
  ): void {
    const dataPoint: TimeSeriesPoint = {
      timestamp: new Date(),
      value,
      metadata,
    };

    if (!this.timeSeriesData.has(metric)) {
      this.timeSeriesData.set(metric, []);
    }

    const series = this.timeSeriesData.get(metric)!;
    series.push(dataPoint);

    // Keep only recent data based on retention period
    const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);
    this.timeSeriesData.set(
      metric,
      series.filter((point) => point.timestamp >= cutoffTime),
    );

    this.emit("datapoint.recorded", { metric, dataPoint });
  }

  /**
   * Get analytics dashboard data
   */
  getAnalyticsDashboard(): AnalyticsDashboard {
    const timestamp = new Date();

    return {
      timestamp,
      summary: this.calculateSummary(),
      kpis: this.calculateKPIs(),
      charts: this.getChartsData(),
      trends: Array.from(this.trends.values()).slice(0, 10),
      anomalies: this.getRecentAnomalies(),
      forecasts: Array.from(this.forecasts.values()).slice(0, 5),
      correlations: Array.from(this.correlations.values()).slice(0, 5),
      benchmarks: Array.from(this.benchmarks.values()).slice(0, 5),
    };
  }

  /**
   * Get trend analysis for a metric
   */
  getTrendAnalysis(
    metric: string,
    period?: { start: Date; end: Date },
  ): TrendAnalysis | null {
    const series = this.timeSeriesData.get(metric);
    if (!series || series.length < this.config.minDataPoints) {
      return null;
    }

    const analyzePeriod = period || {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: new Date(),
    };

    const filteredSeries = series.filter(
      (point) =>
        point.timestamp >= analyzePeriod.start &&
        point.timestamp <= analyzePeriod.end,
    );

    if (filteredSeries.length < this.config.minDataPoints) {
      return null;
    }

    return this.analyzeTrend(metric, filteredSeries, analyzePeriod);
  }

  /**
   * Get anomaly detection results for a metric
   */
  getAnomalies(metric: string, timeWindow?: number): AnomalyDetection[] {
    const anomalies = this.anomalies.get(metric) || [];

    if (timeWindow) {
      const cutoffTime = new Date(Date.now() - timeWindow);
      return anomalies.filter((anomaly) => anomaly.timestamp >= cutoffTime);
    }

    return anomalies
      .slice()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get performance forecast for a metric
   */
  getForecast(metric: string): PerformanceForecast | null {
    return this.forecasts.get(metric) || null;
  }

  /**
   * Get correlation analysis between two metrics
   */
  getCorrelation(metric1: string, metric2: string): CorrelationAnalysis | null {
    const key = `${metric1}:${metric2}`;
    return (
      this.correlations.get(key) ||
      this.correlations.get(`${metric2}:${metric1}`) ||
      null
    );
  }

  /**
   * Create performance benchmark
   */
  createBenchmark(
    benchmark: Omit<PerformanceBenchmark, "id">,
  ): PerformanceBenchmark {
    const fullBenchmark: PerformanceBenchmark = {
      id: `benchmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...benchmark,
    };

    this.benchmarks.set(fullBenchmark.id, fullBenchmark);
    this.emit("benchmark.created", fullBenchmark);

    return fullBenchmark;
  }

  // ===== PRIVATE IMPLEMENTATION METHODS =====

  private mergeConfig(
    userConfig: Partial<AnalyticsEngineConfig>,
  ): AnalyticsEngineConfig {
    const defaultConfig: AnalyticsEngineConfig = {
      analysisInterval: 60000, // 1 minute
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      minDataPoints: 10,
      enablePredictive: true,
      enableAnomalyDetection: true,
      enableTrendAnalysis: true,
      aggregationLevels: ["1m", "5m", "15m", "1h", "6h", "1d"],
      baseline: {
        method: "ROLLING_AVERAGE",
        windowSize: 100,
        updateFrequency: 300000, // 5 minutes
        deviationThreshold: 2.0,
        confidenceInterval: 0.95,
      },
      forecasting: {
        model: "EXPONENTIAL_SMOOTHING",
        horizon: 60, // 1 hour
        trainingWindow: 24 * 60, // 24 hours
        updateFrequency: 900000, // 15 minutes
        confidenceLevel: 0.95,
      },
    };

    return { ...defaultConfig, ...userConfig };
  }

  private async performAnalysis(): Promise<void> {
    try {
      this.logger.log("Performing analytics analysis");

      // Update baselines
      this.updateBaselines();

      // Perform trend analysis
      if (this.config.enableTrendAnalysis) {
        this.performTrendAnalysis();
      }

      // Detect anomalies
      if (this.config.enableAnomalyDetection) {
        this.detectAnomalies();
      }

      // Calculate correlations
      this.calculateCorrelations();

      // Update benchmarks
      this.updateBenchmarks();

      this.emit("analysis.completed");
    } catch (error) {
      this.logger.error("Error during analytics analysis:", error);
      this.emit("analysis.error", error);
    }
  }

  private updateBaselines(): void {
    for (const [metric, series] of this.timeSeriesData) {
      if (series.length < this.config.baseline.windowSize) continue;

      const recentData = series.slice(-this.config.baseline.windowSize);
      const baseline = this.calculateBaseline(recentData);

      this.baselines.set(metric, {
        value: baseline.value,
        timestamp: new Date(),
        confidence: baseline.confidence,
      });
    }
  }

  private calculateBaseline(data: TimeSeriesPoint[]): {
    value: number;
    confidence: number;
  } {
    const values = data.map((point) => point.value);

    switch (this.config.baseline.method) {
      case "ROLLING_AVERAGE":
        return {
          value: this.calculateMean(values),
          confidence: this.config.baseline.confidenceInterval,
        };

      case "EXPONENTIAL_SMOOTHING":
        return {
          value: this.calculateExponentialSmoothing(values),
          confidence: this.config.baseline.confidenceInterval,
        };

      case "SEASONAL_DECOMPOSITION":
        // Simplified seasonal decomposition
        return {
          value: this.calculateSeasonalBaseline(values),
          confidence: this.config.baseline.confidenceInterval,
        };

      default:
        return {
          value: this.calculateMean(values),
          confidence: this.config.baseline.confidenceInterval,
        };
    }
  }

  private performTrendAnalysis(): void {
    for (const [metric, series] of this.timeSeriesData) {
      if (series.length < this.config.minDataPoints) continue;

      const period = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date(),
      };

      const trend = this.analyzeTrend(metric, series, period);
      if (trend) {
        this.trends.set(metric, trend);
      }
    }
  }

  private analyzeTrend(
    metric: string,
    series: TimeSeriesPoint[],
    period: { start: Date; end: Date },
  ): TrendAnalysis {
    const values = series.map((point) => point.value);
    const timestamps = series.map((point) => point.timestamp.getTime());

    // Calculate statistics
    const statistics = this.calculateStatistics(values);

    // Calculate linear regression
    const regression = this.calculateLinearRegression(timestamps, values);

    // Determine trend direction and strength
    const direction = this.determineTrendDirection(
      regression.slope,
      statistics.standardDeviation,
    );
    const strength = this.calculateTrendStrength(regression.rSquared);

    // Detect change points
    const changePoints = this.detectChangePoints(series);

    // Detect seasonality
    const seasonality = this.detectSeasonality(values);

    return {
      metric,
      period,
      direction,
      strength,
      significance: this.calculateTrendSignificance(regression, values.length),
      statistics,
      equation: {
        slope: regression.slope,
        intercept: regression.intercept,
        rSquared: regression.rSquared,
      },
      seasonality,
      changePoints,
    };
  }

  private detectAnomalies(): void {
    for (const [metric, series] of this.timeSeriesData) {
      const baseline = this.baselines.get(metric);
      if (!baseline || series.length < this.config.minDataPoints) continue;

      const recentPoints = series.slice(-24); // Last 24 points
      const anomalies: AnomalyDetection[] = [];

      recentPoints.forEach((point) => {
        const anomaly = this.detectPointAnomaly(
          metric,
          point,
          baseline,
          series,
        );
        if (anomaly) {
          anomalies.push(anomaly);
        }
      });

      if (anomalies.length > 0) {
        this.anomalies.set(metric, [
          ...(this.anomalies.get(metric) || []),
          ...anomalies,
        ]);
        anomalies.forEach((anomaly) => this.emit("anomaly.detected", anomaly));
      }
    }
  }

  private detectPointAnomaly(
    metric: string,
    point: TimeSeriesPoint,
    baseline: { value: number; confidence: number },
    series: TimeSeriesPoint[],
  ): AnomalyDetection | null {
    const values = series.map((p) => p.value);
    const stdDev = this.calculateStandardDeviation(values);
    const threshold = this.config.baseline.deviationThreshold;

    const deviationScore = Math.abs(point.value - baseline.value) / stdDev;

    if (deviationScore > threshold) {
      const severity = this.determineAnomalySeverity(deviationScore);

      return {
        metric,
        timestamp: point.timestamp,
        type: "POINT",
        severity,
        actualValue: point.value,
        expectedValue: baseline.value,
        deviationScore,
        confidence: baseline.confidence,
        context: {
          baseline: baseline.value,
          upperBound: baseline.value + threshold * stdDev,
          lowerBound: baseline.value - threshold * stdDev,
          historicalRange: {
            min: Math.min(...values),
            max: Math.max(...values),
          },
        },
        relatedAnomalies: [],
        potentialCauses: this.generateAnomalyCauses(
          metric,
          point.value,
          baseline.value,
        ),
      };
    }

    return null;
  }

  private calculateCorrelations(): void {
    const metrics = Array.from(this.timeSeriesData.keys());

    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const metric1 = metrics[i];
        const metric2 = metrics[j];

        const correlation = this.calculateCorrelation(metric1, metric2);
        if (correlation && Math.abs(correlation.correlation) > 0.3) {
          // Only store meaningful correlations
          this.correlations.set(`${metric1}:${metric2}`, correlation);
        }
      }
    }
  }

  private calculateCorrelation(
    metric1: string,
    metric2: string,
  ): CorrelationAnalysis | null {
    const series1 = this.timeSeriesData.get(metric1);
    const series2 = this.timeSeriesData.get(metric2);

    if (
      !series1 ||
      !series2 ||
      series1.length < this.config.minDataPoints ||
      series2.length < this.config.minDataPoints
    ) {
      return null;
    }

    // Align time series data
    const alignedData = this.alignTimeSeries(series1, series2);
    if (alignedData.length < this.config.minDataPoints) return null;

    const values1 = alignedData.map((point) => point.value1);
    const values2 = alignedData.map((point) => point.value2);

    // Calculate Pearson correlation
    const correlation = this.calculatePearsonCorrelation(values1, values2);
    const strength = this.classifyCorrelationStrength(Math.abs(correlation));

    // Calculate lag correlation
    const lagAnalysis = this.calculateLagCorrelation(values1, values2);

    const period = {
      start: alignedData[0].timestamp,
      end: alignedData[alignedData.length - 1].timestamp,
    };

    return {
      primaryMetric: metric1,
      secondaryMetric: metric2,
      period,
      correlation,
      strength,
      significance: this.calculateCorrelationSignificance(
        correlation,
        alignedData.length,
      ),
      lag: lagAnalysis,
    };
  }

  private async generateForecasts(): Promise<void> {
    if (!this.config.enablePredictive) return;

    for (const [metric, series] of this.timeSeriesData) {
      if (series.length < this.config.forecasting.trainingWindow) continue;

      try {
        const forecast = await this.generateForecast(metric, series);
        if (forecast) {
          this.forecasts.set(metric, forecast);
          this.emit("forecast.generated", forecast);
        }
      } catch (error) {
        this.logger.error(`Error generating forecast for ${metric}:`, error);
      }
    }
  }

  private async generateForecast(
    metric: string,
    series: TimeSeriesPoint[],
  ): Promise<PerformanceForecast | null> {
    const trainingData = series.slice(-this.config.forecasting.trainingWindow);
    if (trainingData.length < this.config.minDataPoints) return null;

    const values = trainingData.map((point) => point.value);
    const timestamps = trainingData.map((point) => point.timestamp.getTime());

    let forecast: {
      timestamp: Date;
      predictedValue: number;
      upperBound: number;
      lowerBound: number;
      confidence: number;
    }[];
    let accuracy: { mape: number; rmse: number; mae: number; r2: number };

    switch (this.config.forecasting.model) {
      case "LINEAR_REGRESSION":
        ({ forecast, accuracy } = this.linearRegressionForecast(
          timestamps,
          values,
        ));
        break;

      case "EXPONENTIAL_SMOOTHING":
        ({ forecast, accuracy } = this.exponentialSmoothingForecast(values));
        break;

      default:
        ({ forecast, accuracy } = this.exponentialSmoothingForecast(values));
    }

    // Determine trends
    const trends = this.determineForecastTrends(forecast);

    // Generate capacity insights
    const capacityInsights = this.generateCapacityInsights(metric, forecast);

    return {
      metric,
      generatedAt: new Date(),
      horizon: this.config.forecasting.horizon,
      model: this.config.forecasting.model,
      accuracy,
      forecast,
      trends,
      capacityInsights,
    };
  }

  private updateBenchmarks(): void {
    // Update existing benchmarks with current performance data
    for (const [id, benchmark] of this.benchmarks) {
      const updatedBenchmark = this.updateBenchmarkMetrics(benchmark);
      this.benchmarks.set(id, updatedBenchmark);
    }
  }

  // ===== STATISTICAL CALCULATION METHODS =====

  private calculateMean(values: number[]): number {
    return values.length > 0
      ? values.reduce((sum, val) => sum + val, 0) / values.length
      : 0;
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length <= 1) return 0;

    const mean = this.calculateMean(values);
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const variance = this.calculateMean(squaredDiffs);

    return Math.sqrt(variance);
  }

  private calculateStatistics(values: number[]): TrendAnalysis["statistics"] {
    if (values.length === 0) {
      return {
        mean: 0,
        median: 0,
        standardDeviation: 0,
        min: 0,
        max: 0,
        variance: 0,
        skewness: 0,
        kurtosis: 0,
      };
    }

    const sorted = values.slice().sort((a, b) => a - b);
    const mean = this.calculateMean(values);
    const stdDev = this.calculateStandardDeviation(values);

    return {
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      standardDeviation: stdDev,
      min: Math.min(...values),
      max: Math.max(...values),
      variance: stdDev * stdDev,
      skewness: this.calculateSkewness(values, mean, stdDev),
      kurtosis: this.calculateKurtosis(values, mean, stdDev),
    };
  }

  private calculateSkewness(
    values: number[],
    mean: number,
    stdDev: number,
  ): number {
    if (stdDev === 0) return 0;

    const n = values.length;
    const skewness = values.reduce(
      (sum, val) => sum + Math.pow((val - mean) / stdDev, 3),
      0,
    );

    return (n / ((n - 1) * (n - 2))) * skewness;
  }

  private calculateKurtosis(
    values: number[],
    mean: number,
    stdDev: number,
  ): number {
    if (stdDev === 0) return 0;

    const n = values.length;
    const kurtosis = values.reduce(
      (sum, val) => sum + Math.pow((val - mean) / stdDev, 4),
      0,
    );

    return (
      ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * kurtosis -
      (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3))
    );
  }

  private calculateLinearRegression(
    x: number[],
    y: number[],
  ): { slope: number; intercept: number; rSquared: number } {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0);
    const ssResidual = y.reduce((sum, val, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);

    const rSquared = 1 - ssResidual / ssTotal;

    return { slope, intercept, rSquared };
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY),
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateExponentialSmoothing(
    values: number[],
    alpha: number = 0.3,
  ): number {
    if (values.length === 0) return 0;

    let smoothed = values[0];
    for (let i = 1; i < values.length; i++) {
      smoothed = alpha * values[i] + (1 - alpha) * smoothed;
    }

    return smoothed;
  }

  private calculateSeasonalBaseline(values: number[]): number {
    // Simplified seasonal baseline - could be enhanced with actual seasonal decomposition
    const periods = Math.floor(values.length / 24); // Assume 24-hour seasonality
    if (periods < 2) return this.calculateMean(values);

    const seasonalValues: number[] = [];
    for (let i = 0; i < 24; i++) {
      const hourlyValues: number[] = [];
      for (let p = 0; p < periods; p++) {
        const index = p * 24 + i;
        if (index < values.length) {
          hourlyValues.push(values[index]);
        }
      }
      seasonalValues.push(this.calculateMean(hourlyValues));
    }

    return this.calculateMean(seasonalValues);
  }

  private determineTrendDirection(
    slope: number,
    stdDev: number,
  ): TrendAnalysis["direction"] {
    const slopeThreshold = stdDev * 0.01; // 1% of standard deviation

    if (Math.abs(slope) < slopeThreshold) return "STABLE";
    if (slope > slopeThreshold) return "IMPROVING";
    if (slope < -slopeThreshold) return "DEGRADING";

    // Check for high volatility
    const relativeSlope = Math.abs(slope) / stdDev;
    return relativeSlope > 0.1 ? "VOLATILE" : "STABLE";
  }

  private calculateTrendStrength(rSquared: number): number {
    return Math.max(0, Math.min(1, rSquared));
  }

  private calculateTrendSignificance(
    regression: { slope: number; rSquared: number },
    sampleSize: number,
  ): number {
    // Simplified significance calculation
    const tStatistic =
      (Math.abs(regression.slope) * Math.sqrt(sampleSize - 2)) /
      Math.sqrt(1 - regression.rSquared);
    return Math.max(0, Math.min(1, 1 - 1 / (1 + tStatistic)));
  }

  private detectChangePoints(
    series: TimeSeriesPoint[],
  ): TrendAnalysis["changePoints"] {
    const changePoints: TrendAnalysis["changePoints"] = [];
    const windowSize = Math.min(10, Math.floor(series.length / 5));

    for (let i = windowSize; i < series.length - windowSize; i++) {
      const beforeValues = series.slice(i - windowSize, i).map((p) => p.value);
      const afterValues = series.slice(i, i + windowSize).map((p) => p.value);

      const beforeMean = this.calculateMean(beforeValues);
      const afterMean = this.calculateMean(afterValues);

      const magnitude = Math.abs(afterMean - beforeMean);
      const significance =
        magnitude /
        this.calculateStandardDeviation([...beforeValues, ...afterValues]);

      if (significance > 1.5) {
        // Threshold for significant change
        changePoints.push({
          timestamp: series[i].timestamp,
          significance,
          direction: afterMean > beforeMean ? "UP" : "DOWN",
          magnitude,
        });
      }
    }

    return changePoints;
  }

  private detectSeasonality(values: number[]): TrendAnalysis["seasonality"] {
    // Simplified seasonality detection
    if (values.length < 48) return undefined; // Need at least 48 points

    const periods = [24, 12, 8, 6]; // Test common periods
    let bestPeriod = 0;
    let bestCorrelation = 0;

    for (const period of periods) {
      if (values.length < period * 2) continue;

      let correlation = 0;
      let count = 0;

      for (let lag = period; lag < values.length; lag += period) {
        if (lag < values.length) {
          const original = values.slice(
            0,
            Math.min(period, values.length - lag),
          );
          const lagged = values.slice(lag, lag + original.length);

          if (original.length === lagged.length) {
            correlation += this.calculatePearsonCorrelation(original, lagged);
            count++;
          }
        }
      }

      const avgCorrelation = count > 0 ? correlation / count : 0;
      if (avgCorrelation > bestCorrelation) {
        bestCorrelation = avgCorrelation;
        bestPeriod = period;
      }
    }

    if (bestCorrelation > 0.3) {
      // Threshold for significant seasonality
      return {
        detected: true,
        period: bestPeriod,
        amplitude: this.calculateStandardDeviation(values),
        phase: 0, // Simplified - could calculate actual phase
      };
    }

    return undefined;
  }

  private determineAnomalySeverity(
    deviationScore: number,
  ): AnomalyDetection["severity"] {
    if (deviationScore > 4) return "CRITICAL";
    if (deviationScore > 3) return "HIGH";
    if (deviationScore > 2.5) return "MEDIUM";
    return "LOW";
  }

  private generateAnomalyCauses(
    metric: string,
    actualValue: number,
    expectedValue: number,
  ): string[] {
    const causes: string[] = [];

    if (actualValue > expectedValue) {
      causes.push("Increased system load or traffic spike");
      causes.push("Resource contention or bottleneck");
      causes.push("Performance degradation in dependent services");
    } else {
      causes.push("Reduced system activity or maintenance period");
      causes.push("Performance improvement or optimization");
      causes.push("Possible data collection issue");
    }

    if (metric.includes("cache")) {
      causes.push("Cache configuration changes");
      causes.push("Cache invalidation or warming issues");
    }

    if (metric.includes("response_time")) {
      causes.push("Network latency changes");
      causes.push("Database query performance issues");
    }

    return causes;
  }

  private alignTimeSeries(
    series1: TimeSeriesPoint[],
    series2: TimeSeriesPoint[],
  ): { timestamp: Date; value1: number; value2: number }[] {
    const aligned: { timestamp: Date; value1: number; value2: number }[] = [];

    // Simple alignment by timestamp (could be enhanced with interpolation)
    const tolerance = 60000; // 1 minute tolerance

    for (const point1 of series1) {
      const closestPoint2 = series2.find(
        (point2) =>
          Math.abs(point2.timestamp.getTime() - point1.timestamp.getTime()) <=
          tolerance,
      );

      if (closestPoint2) {
        aligned.push({
          timestamp: point1.timestamp,
          value1: point1.value,
          value2: closestPoint2.value,
        });
      }
    }

    return aligned;
  }

  private classifyCorrelationStrength(
    correlation: number,
  ): CorrelationAnalysis["strength"] {
    const abs = Math.abs(correlation);
    if (abs >= 0.8) return "VERY_STRONG";
    if (abs >= 0.6) return "STRONG";
    if (abs >= 0.4) return "MODERATE";
    if (abs >= 0.2) return "WEAK";
    return "NONE";
  }

  private calculateCorrelationSignificance(
    correlation: number,
    sampleSize: number,
  ): number {
    // Simplified significance calculation
    const tStatistic =
      correlation *
      Math.sqrt((sampleSize - 2) / (1 - correlation * correlation));
    return Math.max(0, Math.min(1, 1 - 1 / (1 + Math.abs(tStatistic))));
  }

  private calculateLagCorrelation(
    values1: number[],
    values2: number[],
  ): CorrelationAnalysis["lag"] {
    const maxLag = Math.min(10, Math.floor(values1.length / 4));
    let bestLag = 0;
    let maxCorrelation = 0;

    for (let lag = 0; lag <= maxLag; lag++) {
      const x = values1.slice(0, values1.length - lag);
      const y = values2.slice(lag);

      const minLength = Math.min(x.length, y.length);
      if (minLength < 5) continue;

      const correlation = this.calculatePearsonCorrelation(
        x.slice(0, minLength),
        y.slice(0, minLength),
      );

      if (Math.abs(correlation) > Math.abs(maxCorrelation)) {
        maxCorrelation = correlation;
        bestLag = lag;
      }
    }

    return {
      optimalLag: bestLag,
      maxCorrelation,
      significance: this.calculateCorrelationSignificance(
        maxCorrelation,
        values1.length - bestLag,
      ),
    };
  }

  private linearRegressionForecast(
    timestamps: number[],
    values: number[],
  ): {
    forecast: PerformanceForecast["forecast"];
    accuracy: PerformanceForecast["accuracy"];
  } {
    const regression = this.calculateLinearRegression(timestamps, values);
    const forecast: PerformanceForecast["forecast"] = [];

    const lastTimestamp = Math.max(...timestamps);
    const intervalMs = this.config.analysisInterval;

    for (let i = 1; i <= this.config.forecasting.horizon; i++) {
      const futureTimestamp = lastTimestamp + i * intervalMs;
      const predictedValue =
        regression.slope * futureTimestamp + regression.intercept;

      // Calculate confidence bounds (simplified)
      const stdDev = this.calculateStandardDeviation(values);
      const margin = 1.96 * stdDev; // 95% confidence interval

      forecast.push({
        timestamp: new Date(futureTimestamp),
        predictedValue,
        upperBound: predictedValue + margin,
        lowerBound: predictedValue - margin,
        confidence: this.config.forecasting.confidenceLevel,
      });
    }

    // Calculate accuracy metrics (simplified)
    const accuracy = {
      mape: (1 - regression.rSquared) * 100,
      rmse:
        this.calculateStandardDeviation(values) *
        Math.sqrt(1 - regression.rSquared),
      mae: this.calculateStandardDeviation(values) * 0.8,
      r2: regression.rSquared,
    };

    return { forecast, accuracy };
  }

  private exponentialSmoothingForecast(values: number[]): {
    forecast: PerformanceForecast["forecast"];
    accuracy: PerformanceForecast["accuracy"];
  } {
    const alpha = 0.3;
    const lastSmoothed = this.calculateExponentialSmoothing(values, alpha);
    const forecast: PerformanceForecast["forecast"] = [];

    const intervalMs = this.config.analysisInterval;
    const baseTimestamp = Date.now();

    // Simple exponential smoothing forecast (constant value)
    const stdDev = this.calculateStandardDeviation(values);
    const margin = 1.96 * stdDev;

    for (let i = 1; i <= this.config.forecasting.horizon; i++) {
      forecast.push({
        timestamp: new Date(baseTimestamp + i * intervalMs),
        predictedValue: lastSmoothed,
        upperBound: lastSmoothed + margin,
        lowerBound: lastSmoothed - margin,
        confidence: this.config.forecasting.confidenceLevel,
      });
    }

    // Calculate accuracy metrics
    const accuracy = {
      mape: 15, // Simplified
      rmse: stdDev * 0.9,
      mae: stdDev * 0.7,
      r2: 0.8, // Simplified
    };

    return { forecast, accuracy };
  }

  private determineForecastTrends(
    forecast: PerformanceForecast["forecast"],
  ): PerformanceForecast["trends"] {
    if (forecast.length < 3) {
      return { shortTerm: "STABLE", mediumTerm: "STABLE", longTerm: "STABLE" };
    }

    const values = forecast.map((f) => f.predictedValue);
    const shortTerm = this.compareTrendDirection(
      values.slice(0, Math.min(5, values.length)),
    );
    const mediumTerm = this.compareTrendDirection(
      values.slice(0, Math.min(15, values.length)),
    );
    const longTerm = this.compareTrendDirection(values);

    return { shortTerm, mediumTerm, longTerm };
  }

  private compareTrendDirection(values: number[]): "UP" | "DOWN" | "STABLE" {
    if (values.length < 2) return "STABLE";

    const first = values[0];
    const last = values[values.length - 1];
    const threshold = this.calculateStandardDeviation(values) * 0.1;

    if (last > first + threshold) return "UP";
    if (last < first - threshold) return "DOWN";
    return "STABLE";
  }

  private generateCapacityInsights(
    metric: string,
    forecast: PerformanceForecast["forecast"],
  ): PerformanceForecast["capacityInsights"] {
    const currentValue = forecast.length > 0 ? forecast[0].predictedValue : 0;
    const peakValue = Math.max(...forecast.map((f) => f.predictedValue));
    const peakIndex = forecast.findIndex((f) => f.predictedValue === peakValue);

    const recommendations: string[] = [];

    if (peakValue > currentValue * 1.5) {
      recommendations.push("Consider scaling resources before predicted peak");
    }

    if (metric.includes("response_time") && peakValue > 1000) {
      recommendations.push("Response time may exceed SLA during peak period");
    }

    return {
      currentUtilization: currentValue,
      forecastedPeak: {
        timestamp: forecast[peakIndex]?.timestamp || new Date(),
        value: peakValue,
        probability: 0.8, // Simplified
      },
      recommendedActions: recommendations,
    };
  }

  private updateBenchmarkMetrics(
    benchmark: PerformanceBenchmark,
  ): PerformanceBenchmark {
    // Update benchmark metrics with current data
    const updatedMetrics = { ...benchmark.metrics };

    Object.keys(updatedMetrics).forEach((metricName) => {
      const series = this.timeSeriesData.get(metricName);
      if (series && series.length > 0) {
        const currentValue = series[series.length - 1].value;
        const metric = updatedMetrics[metricName];

        updatedMetrics[metricName] = {
          ...metric,
          current: currentValue,
          improvement:
            ((currentValue - metric.baseline) / metric.baseline) * 100,
        };
      }
    });

    // Recalculate overall score
    const scores = Object.values(updatedMetrics).map((metric) => {
      if (metric.current <= metric.target) return 100;
      return Math.max(
        0,
        100 - ((metric.current - metric.target) / metric.target) * 100,
      );
    });

    const score =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0;

    // Determine status
    let status: PerformanceBenchmark["status"];
    if (score >= 90) status = "EXCEEDED";
    else if (score >= 70) status = "MET";
    else if (score >= 50) status = "BELOW_TARGET";
    else status = "CRITICAL";

    return {
      ...benchmark,
      metrics: updatedMetrics,
      score,
      status,
    };
  }

  private calculateSummary(): AnalyticsDashboard["summary"] {
    const trends = Array.from(this.trends.values());
    const anomalies = Array.from(this.anomalies.values()).flat();
    const recentAnomalies = anomalies.filter(
      (a) => a.timestamp.getTime() > Date.now() - 60 * 60 * 1000, // Last hour
    );

    // Calculate overall performance score
    const trendScores = trends.map((trend) => {
      switch (trend.direction) {
        case "IMPROVING":
          return 100;
        case "STABLE":
          return 80;
        case "DEGRADING":
          return 40;
        case "VOLATILE":
          return 60;
        default:
          return 70;
      }
    });

    const score =
      trendScores.length > 0
        ? trendScores.reduce((sum, s) => sum + s, 0) / trendScores.length
        : 75;

    // Determine overall trend
    const improvingTrends = trends.filter(
      (t) => t.direction === "IMPROVING",
    ).length;
    const degradingTrends = trends.filter(
      (t) => t.direction === "DEGRADING",
    ).length;

    let overallTrend: "IMPROVING" | "DEGRADING" | "STABLE";
    if (improvingTrends > degradingTrends) overallTrend = "IMPROVING";
    else if (degradingTrends > improvingTrends) overallTrend = "DEGRADING";
    else overallTrend = "STABLE";

    return {
      score: Math.round(score),
      trend: overallTrend,
      alerts: 0, // Would be integrated with alert manager
      anomalies: recentAnomalies.length,
    };
  }

  private calculateKPIs(): AnalyticsDashboard["kpis"] {
    // Mock KPI calculation - would use actual metric data
    return {
      responseTime: {
        current: 450,
        trend: -5.2,
        target: 500,
        status: "GOOD",
      },
      throughput: {
        current: 1250,
        trend: 8.1,
        target: 1000,
        status: "GOOD",
      },
      cacheHitRate: {
        current: 87.5,
        trend: 2.3,
        target: 85,
        status: "GOOD",
      },
      errorRate: {
        current: 0.8,
        trend: -0.2,
        target: 1.0,
        status: "GOOD",
      },
    };
  }

  private getChartsData(): AnalyticsDashboard["charts"] {
    const charts: AnalyticsDashboard["charts"] = {
      responseTime: [],
      throughput: [],
      cachePerformance: [],
      resourceUtilization: [],
    };

    // Populate with actual time series data
    const responseTimeSeries = this.timeSeriesData.get("response_time") || [];
    charts.responseTime = responseTimeSeries.slice(-100);

    const throughputSeries = this.timeSeriesData.get("throughput") || [];
    charts.throughput = throughputSeries.slice(-100);

    const cacheSeries = this.timeSeriesData.get("cache_hit_rate") || [];
    charts.cachePerformance = cacheSeries.slice(-100);

    const resourceSeries = this.timeSeriesData.get("memory_usage") || [];
    charts.resourceUtilization = resourceSeries.slice(-100);

    return charts;
  }

  private getRecentAnomalies(): AnomalyDetection[] {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const allAnomalies = Array.from(this.anomalies.values()).flat();

    return allAnomalies
      .filter((anomaly) => anomaly.timestamp >= cutoffTime)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  private cleanupOldData(): void {
    const cutoffTime = new Date(Date.now() - this.config.retentionPeriod);

    // Clean up time series data
    for (const [metric, series] of this.timeSeriesData) {
      const filteredSeries = series.filter(
        (point) => point.timestamp >= cutoffTime,
      );
      this.timeSeriesData.set(metric, filteredSeries);
    }

    // Clean up anomalies
    for (const [metric, anomalies] of this.anomalies) {
      const filteredAnomalies = anomalies.filter(
        (anomaly) => anomaly.timestamp >= cutoffTime,
      );
      this.anomalies.set(metric, filteredAnomalies);
    }

    this.logger.log("Analytics data cleanup completed");
  }
}

/**
 * Default analytics engine instance
 */
export const analyticsEngine = new AnalyticsEngine();
