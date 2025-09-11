/**
 * ML Accuracy Metrics Types - Comprehensive Performance Tracking
 *
 * Enterprise-grade type definitions for ML accuracy tracking, false positive
 * rate monitoring, real-time dashboards, and comprehensive analytics.
 *
 * @fileoverview ML Performance Metrics Types - Production Ready
 * @version 1.0.0
 * @author ML Performance Specialist - Advanced Analytics Framework
 */

// ===========================
// CORE ACCURACY METRICS
// ===========================

export interface AccuracyMetric {
  readonly id: string;
  readonly timestamp: Date;
  readonly modelId: string;
  readonly datasetVersion: string;
  readonly accuracy: number; // 0-1
  readonly precision: number; // 0-1
  readonly recall: number; // 0-1
  readonly f1Score: number; // 0-1
  readonly specificity: number; // 0-1
  readonly sensitivity: number; // 0-1
  readonly auc: number; // Area Under Curve 0-1
  readonly truePositives: number;
  readonly falsePositives: number;
  readonly trueNegatives: number;
  readonly falseNegatives: number;
  readonly totalSamples: number;
  readonly processingTimeMs: number;
  readonly memoryUsageMB: number;
  readonly cpuUsagePercent: number;
}

export interface FalsePositiveMetric {
  readonly id: string;
  readonly timestamp: Date;
  readonly modelId: string;
  readonly category: SecurityThreatCategory;
  readonly severity: SecuritySeverity;
  readonly falsePositiveRate: number; // 0-1
  readonly expectedPositives: number;
  readonly actualPositives: number;
  readonly falsePositives: number;
  readonly confidenceScore: number;
  readonly pattern: string;
  readonly context: Record<string, unknown>;
  readonly correctionApplied: boolean;
  readonly validationSource: ValidationSource;
}

export interface PerformanceMetric {
  readonly id: string;
  readonly timestamp: Date;
  readonly operation: MLOperation;
  readonly latencyMs: number;
  readonly throughputPerSecond: number;
  readonly errorRate: number; // 0-1
  readonly successRate: number; // 0-1
  readonly concurrentUsers: number;
  readonly resourceUtilization: ResourceUtilization;
  readonly bottlenecks: PerformanceBottleneck[];
}

// ===========================
// REAL-TIME MONITORING
// ===========================

export interface RealTimeMetrics {
  readonly timestamp: Date;
  readonly windowSizeMs: number;
  readonly currentAccuracy: number;
  readonly trendDirection: TrendDirection;
  readonly alertLevel: AlertLevel;
  readonly activeModels: number;
  readonly queuedPredictions: number;
  readonly processingRate: number;
  readonly errorRate: number;
  readonly systemHealth: SystemHealthStatus;
}

export interface DashboardMetrics {
  readonly overview: OverviewMetrics;
  readonly accuracy: AccuracyTrends;
  readonly performance: PerformanceTrends;
  readonly alerts: ActiveAlert[];
  readonly models: ModelStatus[];
  readonly predictions: PredictionStats;
  readonly usage: UsageStatistics;
}

// ===========================
// ANALYTICS & REPORTING
// ===========================

export interface AnalyticsReport {
  readonly id: string;
  readonly generatedAt: Date;
  readonly reportType: ReportType;
  readonly timeRange: TimeRange;
  readonly metrics: ComprehensiveMetrics;
  readonly insights: AnalyticsInsight[];
  readonly recommendations: Recommendation[];
  readonly trends: TrendAnalysis[];
  readonly comparisons: ModelComparison[];
  readonly exportFormats: ExportFormat[];
}

export interface ABTestResult {
  readonly testId: string;
  readonly modelA: string;
  readonly modelB: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly sampleSize: number;
  readonly confidenceLevel: number; // 0.95, 0.99, etc.
  readonly statisticalSignificance: boolean;
  readonly winningModel: string | null;
  readonly accuracyDifference: number;
  readonly performanceDifference: number;
  readonly recommendations: string[];
}

export interface TrendAnalysis {
  readonly metricType: MetricType;
  readonly timeWindow: TimeWindow;
  readonly trend: TrendDirection;
  readonly changeRate: number; // Percentage change
  readonly significance: StatisticalSignificance;
  readonly seasonality: SeasonalityPattern | null;
  readonly anomalies: AnomalyDetection[];
  readonly forecast: ForecastData[];
}

// ===========================
// SUPPORTING TYPES
// ===========================

export type SecurityThreatCategory =
  | "sql_injection"
  | "xss"
  | "csrf"
  | "authentication"
  | "authorization"
  | "data_exposure"
  | "malware"
  | "phishing"
  | "network_intrusion";

export type SecuritySeverity = "critical" | "high" | "medium" | "low" | "info";

export type ValidationSource =
  | "manual"
  | "automated"
  | "expert"
  | "crowdsourced";

export type MLOperation =
  | "training"
  | "prediction"
  | "validation"
  | "preprocessing"
  | "feature_extraction"
  | "model_update";

export interface ResourceUtilization {
  readonly cpu: number; // 0-100
  readonly memory: number; // 0-100
  readonly disk: number; // 0-100
  readonly network: number; // 0-100
  readonly gpu?: number; // 0-100
}

export interface PerformanceBottleneck {
  readonly component: string;
  readonly severity: "minor" | "moderate" | "major" | "critical";
  readonly description: string;
  readonly recommendation: string;
  readonly estimatedImpact: number; // 0-100
}

export type TrendDirection =
  | "increasing"
  | "decreasing"
  | "stable"
  | "volatile";

export type AlertLevel = "info" | "warning" | "error" | "critical";

export type SystemHealthStatus =
  | "healthy"
  | "degraded"
  | "unhealthy"
  | "critical";

export interface OverviewMetrics {
  readonly totalPredictions: number;
  readonly averageAccuracy: number;
  readonly currentErrorRate: number;
  readonly uptime: number; // seconds
  readonly activeUsers: number;
}

export interface AccuracyTrends {
  readonly current: number;
  readonly previous: number;
  readonly change: number;
  readonly changePercent: number;
  readonly trend: TrendDirection;
  readonly history: HistoricalDataPoint[];
}

export interface PerformanceTrends {
  readonly averageLatency: number;
  readonly throughput: number;
  readonly errorRate: number;
  readonly resourceUsage: ResourceUtilization;
  readonly history: PerformanceHistoryPoint[];
}

export interface ActiveAlert {
  readonly id: string;
  readonly level: AlertLevel;
  readonly message: string;
  readonly timestamp: Date;
  readonly acknowledged: boolean;
  readonly source: string;
}

export interface ModelStatus {
  readonly modelId: string;
  readonly name: string;
  readonly version: string;
  readonly status: "active" | "training" | "inactive" | "error";
  readonly accuracy: number;
  readonly lastUpdated: Date;
  readonly predictionsToday: number;
}

export interface PredictionStats {
  readonly total: number;
  readonly successful: number;
  readonly failed: number;
  readonly averageConfidence: number;
  readonly distributionByCategory: Record<SecurityThreatCategory, number>;
}

export interface UsageStatistics {
  readonly dailyPredictions: number;
  readonly weeklyPredictions: number;
  readonly monthlyPredictions: number;
  readonly peakUsageHour: number;
  readonly averageResponseTime: number;
}

export type ReportType =
  | "daily"
  | "weekly"
  | "monthly"
  | "custom"
  | "real_time"
  | "comparative"
  | "predictive";

export interface TimeRange {
  readonly start: Date;
  readonly end: Date;
  readonly duration: number; // milliseconds
  readonly granularity: "minute" | "hour" | "day" | "week" | "month";
}

export interface ComprehensiveMetrics {
  readonly accuracy: AccuracyMetric[];
  readonly performance: PerformanceMetric[];
  readonly falsePositives: FalsePositiveMetric[];
  readonly trends: TrendAnalysis[];
  readonly alerts: ActiveAlert[];
}

export interface AnalyticsInsight {
  readonly type: "improvement" | "degradation" | "anomaly" | "opportunity";
  readonly severity: "low" | "medium" | "high";
  readonly description: string;
  readonly evidence: Record<string, unknown>;
  readonly confidence: number; // 0-1
}

export interface Recommendation {
  readonly id: string;
  readonly category: "performance" | "accuracy" | "efficiency" | "maintenance";
  readonly priority: "low" | "medium" | "high" | "urgent";
  readonly title: string;
  readonly description: string;
  readonly implementation: string[];
  readonly estimatedImpact: number; // 0-100
  readonly estimatedEffort: "low" | "medium" | "high";
}

export interface ModelComparison {
  readonly modelA: string;
  readonly modelB: string;
  readonly metrics: ComparisonMetrics;
  readonly winner: string | "tie";
  readonly confidence: number; // 0-1
}

export interface ComparisonMetrics {
  readonly accuracy: ComparisonValue;
  readonly performance: ComparisonValue;
  readonly reliability: ComparisonValue;
  readonly resourceUsage: ComparisonValue;
}

export interface ComparisonValue {
  readonly modelA: number;
  readonly modelB: number;
  readonly difference: number;
  readonly percentageDifference: number;
}

export type ExportFormat = "json" | "csv" | "pdf" | "html" | "xml";

export type MetricType =
  | "accuracy"
  | "precision"
  | "recall"
  | "f1"
  | "latency"
  | "throughput"
  | "error_rate";

export type TimeWindow = "1h" | "24h" | "7d" | "30d" | "90d" | "1y";

export type StatisticalSignificance =
  | "none"
  | "weak"
  | "moderate"
  | "strong"
  | "very_strong";

export interface SeasonalityPattern {
  readonly type: "hourly" | "daily" | "weekly" | "monthly";
  readonly strength: number; // 0-1
  readonly period: number;
  readonly phase: number;
}

export interface AnomalyDetection {
  readonly timestamp: Date;
  readonly value: number;
  readonly expected: number;
  readonly deviation: number;
  readonly severity: "minor" | "moderate" | "major";
  readonly confidence: number; // 0-1
}

export interface ForecastData {
  readonly timestamp: Date;
  readonly predicted: number;
  readonly confidenceInterval: {
    readonly lower: number;
    readonly upper: number;
  };
  readonly accuracy: number; // 0-1
}

export interface HistoricalDataPoint {
  readonly timestamp: Date;
  readonly value: number;
  readonly context?: Record<string, unknown>;
}

export interface PerformanceHistoryPoint {
  readonly timestamp: Date;
  readonly latency: number;
  readonly throughput: number;
  readonly errorRate: number;
  readonly resourceUsage: ResourceUtilization;
}

// ===========================
// EVENT STREAMING TYPES
// ===========================

export interface MetricEvent {
  readonly eventId: string;
  readonly timestamp: Date;
  readonly type: MetricEventType;
  readonly payload: MetricEventPayload;
  readonly source: string;
  readonly priority: EventPriority;
}

export type MetricEventType =
  | "accuracy_updated"
  | "performance_degraded"
  | "false_positive_detected"
  | "model_retrained"
  | "alert_triggered"
  | "threshold_breached"
  | "detection_processed"
  | "detection_processing_error"
  | "validation_feedback_processed"
  | "adaptation_cycle_completed"
  | "validation_requested";

export type EventPriority = "low" | "normal" | "high" | "urgent";

export interface MetricEventPayload {
  readonly data: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
}

// ===========================
// CONFIGURATION TYPES
// ===========================

export interface MetricsConfig {
  readonly collection: CollectionConfig;
  readonly storage: StorageConfig;
  readonly alerts: AlertConfig;
  readonly reporting: ReportingConfig;
  readonly performance: PerformanceConfig;
}

export interface CollectionConfig {
  readonly enabled: boolean;
  readonly intervalMs: number;
  readonly batchSize: number;
  readonly retentionDays: number;
  readonly metricTypes: MetricType[];
}

export interface StorageConfig {
  readonly provider: "memory" | "file" | "database" | "cloud";
  readonly connectionString?: string;
  readonly compression: boolean;
  readonly encryption: boolean;
  readonly backupEnabled: boolean;
}

export interface AlertConfig {
  readonly enabled: boolean;
  readonly thresholds: Record<MetricType, ThresholdConfig>;
  readonly notifications: NotificationConfig[];
  readonly escalation: EscalationConfig;
}

export interface ThresholdConfig {
  readonly warning: number;
  readonly error: number;
  readonly critical: number;
}

export interface NotificationConfig {
  readonly type: "email" | "slack" | "webhook" | "sms";
  readonly endpoint: string;
  readonly enabled: boolean;
}

export interface EscalationConfig {
  readonly enabled: boolean;
  readonly timeoutMinutes: number;
  readonly levels: string[];
}

export interface ReportingConfig {
  readonly enabled: boolean;
  readonly schedule: ScheduleConfig[];
  readonly formats: ExportFormat[];
  readonly recipients: string[];
  readonly templates: ReportTemplate[];
}

export interface ScheduleConfig {
  readonly type: ReportType;
  readonly cron: string;
  readonly enabled: boolean;
}

export interface ReportTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly template: string;
  readonly parameters: Record<string, unknown>;
}

export interface PerformanceConfig {
  readonly maxConcurrentOperations: number;
  readonly timeoutMs: number;
  readonly retryAttempts: number;
  readonly cachingEnabled: boolean;
  readonly compressionEnabled: boolean;
}
