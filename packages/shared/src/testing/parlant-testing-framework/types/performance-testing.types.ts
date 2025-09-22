/**
 * PARLANT Performance Testing - Type Definitions
 *
 * Comprehensive type definitions for performance testing framework
 * supporting sub-1000ms validation, load testing, and benchmarking.
 *
 * @fileoverview Performance testing type definitions
 * @version 1.0.0
 * @author PARLANT Testing Framework Agent
 * @created 2025-09-20
 */

/**
 * Performance test configuration
 */
export interface PerformanceTestConfig {
  readonly maxResponseTime: number;
  readonly loadTestConcurrency: number;
  readonly benchmarkIterations: number;
  readonly performanceThresholds: PerformanceThresholds;
  readonly resourceMonitoring: ResourceMonitoringConfig;
  readonly benchmarkStorage: BenchmarkStorageConfig;
}

/**
 * Performance thresholds for validation
 */
export interface PerformanceThresholds {
  readonly responseTime: number; // milliseconds
  readonly throughput: number; // requests per second
  readonly errorRate: number; // percentage
  readonly cpuUsage: number; // percentage
  readonly memoryUsage: number; // bytes
  readonly networkLatency: number; // milliseconds
  readonly diskIO: number; // operations per second
}

/**
 * Resource monitoring configuration
 */
export interface ResourceMonitoringConfig {
  readonly enabled: boolean;
  readonly interval: number; // milliseconds
  readonly metrics: ResourceMetric[];
  readonly alerts: ResourceAlert[];
}

/**
 * Resource metrics to monitor
 */
export enum ResourceMetric {
  CPU_USAGE = "CPU_USAGE",
  MEMORY_USAGE = "MEMORY_USAGE",
  DISK_IO = "DISK_IO",
  NETWORK_IO = "NETWORK_IO",
  DATABASE_CONNECTIONS = "DATABASE_CONNECTIONS",
  THREAD_COUNT = "THREAD_COUNT",
  HEAP_SIZE = "HEAP_SIZE",
  GC_TIME = "GC_TIME",
}

/**
 * Resource alert configuration
 */
export interface ResourceAlert {
  readonly metric: ResourceMetric;
  readonly threshold: number;
  readonly action: "LOG" | "STOP_TEST" | "SCALE_DOWN";
  readonly severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

/**
 * Benchmark storage configuration
 */
export interface BenchmarkStorageConfig {
  readonly enabled: boolean;
  readonly storage: "MEMORY" | "FILE" | "DATABASE";
  readonly retentionDays: number;
  readonly compressionEnabled: boolean;
}

/**
 * Performance test result
 */
export interface PerformanceTestResult {
  readonly testId: string;
  readonly functionName: string;
  readonly responseTime: number;
  readonly passed: boolean;
  readonly iterations: number;
  readonly averageResponseTime: number;
  readonly maxResponseTime: number;
  readonly minResponseTime: number;
  readonly throughput: number;
  readonly startTime: number;
  endTime: number;
  totalDuration?: number;
  readonly successRate?: number;
  readonly errorRate?: number;
  readonly error?: string;
  readonly percentiles?: ResponseTimePercentiles;
  readonly resourceUsage?: ResourceUsageMetrics;
}

/**
 * Response time percentiles
 */
export interface ResponseTimePercentiles {
  readonly p50: number; // median
  readonly p75: number;
  readonly p90: number;
  readonly p95: number;
  readonly p99: number;
  readonly p99_9: number;
}

/**
 * Resource usage metrics
 */
export interface ResourceUsageMetrics {
  readonly cpuUsage: number; // percentage
  readonly memoryUsage: number; // bytes
  readonly networkUsage: number; // bytes per second
  readonly diskUsage: number; // bytes per second
  readonly heapSize?: number; // bytes
  readonly gcTime?: number; // milliseconds
  readonly threadCount?: number;
}

/**
 * Load test result
 */
export interface LoadTestResult {
  readonly testId: string;
  readonly functionName: string;
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly averageResponseTime: number;
  readonly actualThroughput: number;
  readonly targetThroughput: number;
  readonly maxConcurrency: number;
  readonly errorRate: number;
  readonly passed: boolean;
  readonly phases: LoadTestPhaseResult[];
  readonly startTime: number;
  readonly endTime: number;
  readonly resourcePeaks?: ResourceUsageMetrics;
}

/**
 * Load test phase result
 */
export interface LoadTestPhaseResult {
  readonly phase: string;
  readonly duration: number;
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly averageResponseTime: number;
  readonly maxConcurrency: number;
  readonly actualThroughput: number;
}

/**
 * Stress test result
 */
export interface StressTestResult {
  readonly testId: string;
  readonly functionName: string;
  readonly maxSuccessfulConcurrency: number;
  readonly breakingPoint?: number;
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly steps: StressTestStepResult[];
  readonly recoveryResult?: StressTestStepResult;
  readonly systemRecovered: boolean;
  readonly passed: boolean;
  readonly startTime: number;
  readonly endTime: number;
}

/**
 * Stress test step result
 */
export interface StressTestStepResult {
  readonly concurrency: number;
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly averageResponseTime: number;
  readonly maxResponseTime: number;
  readonly errorRate: number;
  readonly throughput: number;
  readonly systemStable: boolean;
  readonly resourceUsage?: ResourceUsageMetrics;
}

/**
 * Throughput test result
 */
export interface ThroughputTestResult {
  readonly testId: string;
  readonly functionName: string;
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly duration: number;
  readonly throughput: number;
  readonly concurrency: number;
  readonly averageResponseTime: number;
  readonly maxResponseTime: number;
  readonly minResponseTime: number;
  readonly passed: boolean;
  readonly startTime: number;
  readonly endTime: number;
  readonly percentiles?: ResponseTimePercentiles;
}

/**
 * Performance benchmark
 */
export interface PerformanceBenchmark {
  readonly functionName: string;
  readonly averageResponseTime: number;
  readonly maxResponseTime: number;
  readonly throughput: number;
  readonly timestamp: number;
  readonly testId: string;
  readonly version?: string;
  readonly environment?: string;
  readonly metadata?: Record<string, any>;
}

/**
 * Performance metrics aggregation
 */
export interface PerformanceMetrics {
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly averageResponseTime: number;
  readonly maxResponseTime: number;
  readonly minResponseTime: number;
  readonly throughput: number;
  readonly errorRate: number;
  readonly resourceUsage: ResourceUsageMetrics;
}

/**
 * Performance regression detection
 */
export interface PerformanceRegression {
  readonly functionName: string;
  readonly currentResult: PerformanceTestResult;
  readonly benchmarkResult: PerformanceBenchmark;
  readonly regression: RegressionAnalysis;
  readonly severity: RegressionSeverity;
  readonly recommendation: string;
}

/**
 * Regression analysis
 */
export interface RegressionAnalysis {
  readonly responseTimeRegression: number; // percentage change
  readonly throughputRegression: number; // percentage change
  readonly errorRateIncrease: number; // percentage increase
  readonly isSignificantRegression: boolean;
  readonly confidence: number; // 0-1
}

/**
 * Regression severity levels
 */
export enum RegressionSeverity {
  NONE = "NONE",
  MINOR = "MINOR",
  MODERATE = "MODERATE",
  MAJOR = "MAJOR",
  CRITICAL = "CRITICAL",
}

/**
 * Performance trend analysis
 */
export interface PerformanceTrend {
  readonly functionName: string;
  readonly timeRange: DateRange;
  readonly dataPoints: PerformanceDataPoint[];
  readonly trend: TrendDirection;
  readonly correlation: number; // -1 to 1
  readonly prediction: PerformancePrediction;
}

/**
 * Date range for trend analysis
 */
export interface DateRange {
  readonly startDate: Date;
  readonly endDate: Date;
}

/**
 * Performance data point for trend analysis
 */
export interface PerformanceDataPoint {
  readonly timestamp: number;
  readonly responseTime: number;
  readonly throughput: number;
  readonly errorRate: number;
  readonly testId: string;
}

/**
 * Trend direction
 */
export enum TrendDirection {
  IMPROVING = "IMPROVING",
  STABLE = "STABLE",
  DEGRADING = "DEGRADING",
  VOLATILE = "VOLATILE",
}

/**
 * Performance prediction
 */
export interface PerformancePrediction {
  readonly predictedResponseTime: number;
  readonly predictedThroughput: number;
  readonly confidence: number;
  readonly timeHorizon: number; // days
  readonly assumptions: string[];
}

/**
 * Performance comparison
 */
export interface PerformanceComparison {
  readonly baselineResult: PerformanceTestResult;
  readonly currentResult: PerformanceTestResult;
  readonly comparison: ComparisonMetrics;
  readonly verdict: ComparisonVerdict;
}

/**
 * Comparison metrics
 */
export interface ComparisonMetrics {
  readonly responseTimeChange: number; // percentage
  readonly throughputChange: number; // percentage
  readonly errorRateChange: number; // percentage
  readonly stabilityChange: number; // coefficient of variation change
}

/**
 * Comparison verdict
 */
export enum ComparisonVerdict {
  BETTER = "BETTER",
  SIMILAR = "SIMILAR",
  WORSE = "WORSE",
  INCONCLUSIVE = "INCONCLUSIVE",
}

/**
 * Performance optimization suggestion
 */
export interface PerformanceOptimization {
  readonly category: OptimizationCategory;
  readonly priority: OptimizationPriority;
  readonly description: string;
  readonly implementation: string;
  readonly expectedImprovement: number; // percentage
  readonly effort: OptimizationEffort;
  readonly risks: string[];
}

/**
 * Optimization categories
 */
export enum OptimizationCategory {
  DATABASE = "DATABASE",
  CACHING = "CACHING",
  ALGORITHM = "ALGORITHM",
  CONCURRENCY = "CONCURRENCY",
  MEMORY = "MEMORY",
  NETWORK = "NETWORK",
  CONFIGURATION = "CONFIGURATION",
}

/**
 * Optimization priority levels
 */
export enum OptimizationPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * Optimization effort levels
 */
export enum OptimizationEffort {
  LOW = "LOW", // < 1 day
  MEDIUM = "MEDIUM", // 1-5 days
  HIGH = "HIGH", // 1-2 weeks
  VERY_HIGH = "VERY_HIGH", // > 2 weeks
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  readonly alertId: string;
  readonly functionName: string;
  readonly alertType: AlertType;
  readonly severity: AlertSeverity;
  readonly message: string;
  readonly threshold: number;
  readonly actualValue: number;
  readonly timestamp: number;
  readonly resolved: boolean;
  readonly resolvedAt?: number;
}

/**
 * Alert types
 */
export enum AlertType {
  RESPONSE_TIME_THRESHOLD = "RESPONSE_TIME_THRESHOLD",
  THROUGHPUT_DEGRADATION = "THROUGHPUT_DEGRADATION",
  ERROR_RATE_SPIKE = "ERROR_RATE_SPIKE",
  RESOURCE_EXHAUSTION = "RESOURCE_EXHAUSTION",
  REGRESSION_DETECTED = "REGRESSION_DETECTED",
  ANOMALY_DETECTED = "ANOMALY_DETECTED",
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR",
  CRITICAL = "CRITICAL",
}

/**
 * Performance test plan
 */
export interface PerformanceTestPlan {
  readonly planId: string;
  readonly name: string;
  readonly description: string;
  readonly functions: string[];
  readonly scenarios: PerformanceTestScenario[];
  readonly schedule: TestSchedule;
  readonly notifications: NotificationConfig;
}

/**
 * Performance test scenario
 */
export interface PerformanceTestScenario {
  readonly scenarioId: string;
  readonly name: string;
  readonly type: PerformanceTestType;
  readonly config: ScenarioConfig;
  readonly expectedResults: ExpectedResults;
}

/**
 * Performance test types
 */
export enum PerformanceTestType {
  RESPONSE_TIME = "RESPONSE_TIME",
  LOAD = "LOAD",
  STRESS = "STRESS",
  THROUGHPUT = "THROUGHPUT",
  ENDURANCE = "ENDURANCE",
  SPIKE = "SPIKE",
  VOLUME = "VOLUME",
}

/**
 * Scenario configuration
 */
export interface ScenarioConfig {
  readonly duration?: number;
  readonly concurrency?: number;
  readonly iterations?: number;
  readonly rampUpTime?: number;
  readonly sustainTime?: number;
  readonly rampDownTime?: number;
  readonly dataVolume?: DataVolumeLevel;
  readonly customParameters?: Record<string, any>;
}

/**
 * Data volume levels
 */
export enum DataVolumeLevel {
  SMALL = "SMALL", // < 1K records
  MEDIUM = "MEDIUM", // 1K - 10K records
  LARGE = "LARGE", // 10K - 100K records
  XLARGE = "XLARGE", // > 100K records
}

/**
 * Expected test results
 */
export interface ExpectedResults {
  readonly maxResponseTime: number;
  readonly minThroughput: number;
  readonly maxErrorRate: number;
  readonly resourceLimits: ResourceLimits;
}

/**
 * Resource limits
 */
export interface ResourceLimits {
  readonly maxCpuUsage: number; // percentage
  readonly maxMemoryUsage: number; // bytes
  readonly maxDiskIO: number; // operations per second
  readonly maxNetworkIO: number; // bytes per second
}

/**
 * Test schedule configuration
 */
export interface TestSchedule {
  readonly enabled: boolean;
  readonly frequency: ScheduleFrequency;
  readonly time?: string; // HH:MM format
  readonly timezone?: string;
  readonly conditions?: ScheduleCondition[];
}

/**
 * Schedule frequency
 */
export enum ScheduleFrequency {
  CONTINUOUS = "CONTINUOUS",
  HOURLY = "HOURLY",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  ON_DEMAND = "ON_DEMAND",
}

/**
 * Schedule conditions
 */
export interface ScheduleCondition {
  readonly type: ConditionType;
  readonly value: unknown;
  readonly operator: ConditionOperator;
}

/**
 * Condition types
 */
export enum ConditionType {
  CODE_CHANGE = "CODE_CHANGE",
  DEPLOYMENT = "DEPLOYMENT",
  TIME_BASED = "TIME_BASED",
  METRIC_THRESHOLD = "METRIC_THRESHOLD",
}

/**
 * Condition operators
 */
export enum ConditionOperator {
  EQUALS = "EQUALS",
  NOT_EQUALS = "NOT_EQUALS",
  GREATER_THAN = "GREATER_THAN",
  LESS_THAN = "LESS_THAN",
  CONTAINS = "CONTAINS",
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  readonly enabled: boolean;
  readonly channels: NotificationChannel[];
  readonly triggers: NotificationTrigger[];
  readonly templates: NotificationTemplate[];
}

/**
 * Notification channels
 */
export interface NotificationChannel {
  readonly type: ChannelType;
  readonly config: Record<string, any>;
  readonly enabled: boolean;
}

/**
 * Channel types
 */
export enum ChannelType {
  EMAIL = "EMAIL",
  SLACK = "SLACK",
  WEBHOOK = "WEBHOOK",
  SMS = "SMS",
  PAGER_DUTY = "PAGER_DUTY",
}

/**
 * Notification triggers
 */
export interface NotificationTrigger {
  readonly event: TriggerEvent;
  readonly conditions: TriggerCondition[];
  readonly channels: string[];
  readonly template: string;
}

/**
 * Trigger events
 */
export enum TriggerEvent {
  TEST_STARTED = "TEST_STARTED",
  TEST_COMPLETED = "TEST_COMPLETED",
  TEST_FAILED = "TEST_FAILED",
  THRESHOLD_EXCEEDED = "THRESHOLD_EXCEEDED",
  REGRESSION_DETECTED = "REGRESSION_DETECTED",
  PERFORMANCE_IMPROVED = "PERFORMANCE_IMPROVED",
}

/**
 * Trigger conditions
 */
export interface TriggerCondition {
  readonly field: string;
  readonly operator: ConditionOperator;
  readonly value: unknown;
}

/**
 * Notification templates
 */
export interface NotificationTemplate {
  readonly name: string;
  readonly subject: string;
  readonly body: string;
  readonly format: TemplateFormat;
}

/**
 * Template formats
 */
export enum TemplateFormat {
  TEXT = "TEXT",
  HTML = "HTML",
  MARKDOWN = "MARKDOWN",
  JSON = "JSON",
}

/**
 * Performance dashboard configuration
 */
export interface PerformanceDashboard {
  readonly dashboardId: string;
  readonly name: string;
  readonly widgets: DashboardWidget[];
  readonly filters: DashboardFilter[];
  readonly refresh: RefreshConfig;
}

/**
 * Dashboard widgets
 */
export interface DashboardWidget {
  readonly widgetId: string;
  readonly type: WidgetType;
  readonly title: string;
  readonly config: WidgetConfig;
  readonly position: WidgetPosition;
}

/**
 * Widget types
 */
export enum WidgetType {
  LINE_CHART = "LINE_CHART",
  BAR_CHART = "BAR_CHART",
  PIE_CHART = "PIE_CHART",
  TABLE = "TABLE",
  METRIC = "METRIC",
  GAUGE = "GAUGE",
  HEATMAP = "HEATMAP",
}

/**
 * Widget configuration
 */
export interface WidgetConfig {
  readonly metrics: string[];
  readonly timeRange: DateRange;
  readonly aggregation: AggregationType;
  readonly groupBy?: string[];
  readonly filters?: Record<string, any>;
}

/**
 * Aggregation types
 */
export enum AggregationType {
  AVERAGE = "AVERAGE",
  SUM = "SUM",
  MIN = "MIN",
  MAX = "MAX",
  COUNT = "COUNT",
  PERCENTILE = "PERCENTILE",
}

/**
 * Widget position
 */
export interface WidgetPosition {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Dashboard filters
 */
export interface DashboardFilter {
  readonly field: string;
  readonly type: FilterType;
  readonly values: unknown[];
  readonly defaultValue?: unknown;
}

/**
 * Filter types
 */
export enum FilterType {
  DROPDOWN = "DROPDOWN",
  MULTI_SELECT = "MULTI_SELECT",
  DATE_RANGE = "DATE_RANGE",
  TEXT_INPUT = "TEXT_INPUT",
  SLIDER = "SLIDER",
}

/**
 * Refresh configuration
 */
export interface RefreshConfig {
  readonly enabled: boolean;
  readonly interval: number; // seconds
  readonly autoRefresh: boolean;
}

/**
 * Performance export configuration
 */
export interface PerformanceExport {
  readonly format: ExportFormat;
  readonly includeRawData: boolean;
  readonly includeCharts: boolean;
  readonly timeRange: DateRange;
  readonly functions: string[];
  readonly compression: boolean;
}

/**
 * Export formats
 */
export enum ExportFormat {
  JSON = "JSON",
  CSV = "CSV",
  XLSX = "XLSX",
  PDF = "PDF",
  HTML = "HTML",
}

/**
 * Performance analysis result
 */
export interface PerformanceAnalysisResult {
  readonly analysisId: string;
  readonly functionName: string;
  readonly timeRange: DateRange;
  readonly summary: PerformanceSummary;
  readonly trends: PerformanceTrend[];
  readonly regressions: PerformanceRegression[];
  readonly optimizations: PerformanceOptimization[];
  readonly predictions: PerformancePrediction[];
}

/**
 * Performance summary
 */
export interface PerformanceSummary {
  readonly totalTests: number;
  readonly averageResponseTime: number;
  readonly averageThroughput: number;
  readonly averageErrorRate: number;
  readonly bestPerformance: PerformanceTestResult;
  readonly worstPerformance: PerformanceTestResult;
  readonly reliability: number; // 0-1
  readonly stability: number; // coefficient of variation
}

/**
 * Performance test execution state
 */
export interface PerformanceTestExecutionState {
  readonly testId: string;
  readonly functionName: string;
  readonly status: ExecutionStatus;
  readonly progress: number; // 0-100
  readonly currentPhase: string;
  readonly startTime: number;
  readonly estimatedEndTime: number;
  readonly metrics: PerformanceMetrics;
}

/**
 * Execution status
 */
export enum ExecutionStatus {
  PENDING = "PENDING",
  INITIALIZING = "INITIALIZING",
  WARMING_UP = "WARMING_UP",
  RUNNING = "RUNNING",
  COMPLETING = "COMPLETING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}
