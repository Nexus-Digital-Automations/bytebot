/**
 * PARLANT Coverage Reporting - Type Definitions
 *
 * Comprehensive type definitions for coverage reporting and analysis
 * supporting 95%+ coverage targets and detailed analytics.
 *
 * @fileoverview Coverage reporting type definitions
 * @version 1.0.0
 * @author PARLANT Testing Framework Agent
 * @created 2025-09-20
 */

/**
 * Coverage analysis configuration
 */
export interface CoverageAnalysisConfig {
  readonly dataSources: CoverageDataSource[];
  readonly thresholds: CoverageThreshold;
  readonly reportFormats: CoverageReportFormat[];
  readonly historicalAnalysis: HistoricalAnalysisConfig;
  readonly realTimeTracking: RealTimeTrackingConfig;
}

/**
 * Coverage data source configuration
 */
export interface CoverageDataSource {
  readonly type: CoverageToolType;
  readonly path: string;
  readonly format: CoverageDataFormat;
  readonly includePatterns: string[];
  readonly excludePatterns: string[];
  readonly priority: number;
  readonly enabled: boolean;
}

/**
 * Coverage tool types
 */
export enum CoverageToolType {
  JEST = 'JEST',
  NYC = 'NYC',
  ISTANBUL = 'ISTANBUL',
  C8 = 'C8',
  LCOV = 'LCOV',
  JACOCO = 'JACOCO',
  CUSTOM = 'CUSTOM'
}

/**
 * Coverage data formats
 */
export enum CoverageDataFormat {
  JSON = 'JSON',
  LCOV = 'LCOV',
  XML = 'XML',
  HTML = 'HTML',
  TEXT = 'TEXT'
}

/**
 * Coverage thresholds
 */
export interface CoverageThreshold {
  readonly overall: number;        // percentage
  readonly functions: number;      // percentage
  readonly branches: number;       // percentage
  readonly lines: number;          // percentage
  readonly statements: number;     // percentage
  readonly perFile?: CoverageThreshold;
  readonly perFunction?: CoverageThreshold;
}

/**
 * Coverage report formats
 */
export enum CoverageReportFormat {
  HTML = 'HTML',
  JSON = 'JSON',
  LCOV = 'LCOV',
  XML = 'XML',
  CONSOLE = 'CONSOLE',
  PDF = 'PDF',
  EXCEL = 'EXCEL'
}

/**
 * Historical analysis configuration
 */
export interface HistoricalAnalysisConfig {
  readonly enabled: boolean;
  readonly retentionDays: number;
  readonly trendAnalysis: boolean;
  readonly regressionDetection: boolean;
  readonly baselineComparison: boolean;
}

/**
 * Real-time tracking configuration
 */
export interface RealTimeTrackingConfig {
  readonly enabled: boolean;
  readonly updateInterval: number;    // milliseconds
  readonly alertThresholds: AlertThreshold[];
  readonly dashboardEnabled: boolean;
}

/**
 * Alert threshold configuration
 */
export interface AlertThreshold {
  readonly metric: CoverageMetricType;
  readonly threshold: number;
  readonly direction: ThresholdDirection;
  readonly severity: AlertSeverity;
  readonly action: AlertAction;
}

/**
 * Coverage metric types
 */
export enum CoverageMetricType {
  OVERALL_PERCENTAGE = 'OVERALL_PERCENTAGE',
  FUNCTION_PERCENTAGE = 'FUNCTION_PERCENTAGE',
  BRANCH_PERCENTAGE = 'BRANCH_PERCENTAGE',
  LINE_PERCENTAGE = 'LINE_PERCENTAGE',
  UNCOVERED_LINES = 'UNCOVERED_LINES',
  UNCOVERED_FUNCTIONS = 'UNCOVERED_FUNCTIONS'
}

/**
 * Threshold directions
 */
export enum ThresholdDirection {
  ABOVE = 'ABOVE',
  BELOW = 'BELOW',
  EQUALS = 'EQUALS'
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * Alert actions
 */
export enum AlertAction {
  LOG = 'LOG',
  EMAIL = 'EMAIL',
  SLACK = 'SLACK',
  WEBHOOK = 'WEBHOOK',
  STOP_BUILD = 'STOP_BUILD'
}

/**
 * Coverage report
 */
export interface CoverageReport {
  readonly reportId: string;
  readonly timestamp: number;
  readonly overall: CoverageOverall;
  readonly files: FileCoverage[];
  readonly uncoveredLines: UncoveredElement[];
  readonly summary: string;
  readonly metadata?: CoverageMetadata;
}

/**
 * Overall coverage metrics
 */
export interface CoverageOverall {
  readonly percentage: number;
  readonly total: number;
  readonly covered: number;
  readonly threshold?: number;
  readonly passed?: boolean;
}

/**
 * File coverage information
 */
export interface FileCoverage {
  readonly fileName: string;
  readonly functions: FunctionCoverage[];
  readonly lines: LineCoverage;
  readonly branches: BranchCoverage;
  readonly overall: number;
  readonly uncoveredLines: number[];
  readonly metadata?: FileCoverageMetadata;
}

/**
 * Function coverage information
 */
export interface FunctionCoverage {
  readonly functionName: string;
  readonly linesCovered: number;
  readonly totalLines: number;
  readonly branchesCovered: number;
  readonly totalBranches: number;
  readonly covered: boolean;
  readonly percentage: number;
  readonly complexity?: number;
  readonly testCount?: number;
}

/**
 * Line coverage information
 */
export interface LineCoverage {
  readonly total: number;
  readonly covered: number;
  readonly percentage: number;
  readonly uncoveredRanges: LineRange[];
  readonly executable?: number;
  readonly nonExecutable?: number;
}

/**
 * Line range for uncovered code
 */
export interface LineRange {
  readonly start: number;
  readonly end: number;
  readonly reason?: string;
}

/**
 * Branch coverage information
 */
export interface BranchCoverage {
  readonly total: number;
  readonly covered: number;
  readonly percentage: number;
  readonly uncoveredBranches: UncoveredBranch[];
}

/**
 * Uncovered branch information
 */
export interface UncoveredBranch {
  readonly id: string;
  readonly line: number;
  readonly condition: string;
  readonly type: BranchType;
  readonly reason: string;
}

/**
 * Branch types
 */
export enum BranchType {
  IF = 'IF',
  ELSE = 'ELSE',
  SWITCH = 'SWITCH',
  TERNARY = 'TERNARY',
  LOGICAL_AND = 'LOGICAL_AND',
  LOGICAL_OR = 'LOGICAL_OR',
  WHILE = 'WHILE',
  FOR = 'FOR'
}

/**
 * Uncovered element (line, function, branch)
 */
export interface UncoveredElement {
  readonly type: UncoveredElementType;
  readonly fileName: string;
  readonly lineNumber?: number;
  readonly functionName?: string;
  readonly branchId?: string;
  readonly reason: string;
  readonly priority?: UncoveredPriority;
}

/**
 * Uncovered element types
 */
export enum UncoveredElementType {
  LINE = 'LINE',
  FUNCTION = 'FUNCTION',
  BRANCH = 'BRANCH',
  STATEMENT = 'STATEMENT'
}

/**
 * Priority levels for uncovered elements
 */
export enum UncoveredPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Coverage analysis result
 */
export interface CoverageAnalysisResult {
  readonly analysisId: string;
  readonly executionId?: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly totalDuration: number;
  readonly functions: number;
  readonly coverageReport: CoverageReport;
  readonly metrics: CoverageMetrics;
  readonly uncoveredElements: UncoveredElement[];
  readonly insights: CoverageInsight[];
  readonly thresholdsPassed: boolean;
  readonly recommendations: CoverageRecommendation[];
}

/**
 * Coverage metrics
 */
export interface CoverageMetrics {
  readonly overall: CoverageOverall;
  readonly functions: CoverageMetric;
  readonly branches: CoverageMetric;
  readonly lines: CoverageMetric;
  readonly statements?: CoverageMetric;
}

/**
 * Individual coverage metric
 */
export interface CoverageMetric {
  readonly total: number;
  readonly covered: number;
  readonly percentage: number;
  readonly threshold?: number;
  readonly passed?: boolean;
}

/**
 * Coverage insight
 */
export interface CoverageInsight {
  readonly type: CoverageInsightType;
  readonly severity: InsightSeverity;
  readonly message: string;
  readonly recommendation: string;
  readonly impact?: InsightImpact;
  readonly effort?: InsightEffort;
}

/**
 * Coverage insight types
 */
export enum CoverageInsightType {
  THRESHOLD_NOT_MET = 'THRESHOLD_NOT_MET',
  LOW_FUNCTION_COVERAGE = 'LOW_FUNCTION_COVERAGE',
  LOW_BRANCH_COVERAGE = 'LOW_BRANCH_COVERAGE',
  HIGH_COMPLEXITY_UNCOVERED = 'HIGH_COMPLEXITY_UNCOVERED',
  REGRESSION_DETECTED = 'REGRESSION_DETECTED',
  IMPROVEMENT_OPPORTUNITY = 'IMPROVEMENT_OPPORTUNITY'
}

/**
 * Insight severity levels
 */
export enum InsightSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Insight impact levels
 */
export enum InsightImpact {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

/**
 * Insight effort levels
 */
export enum InsightEffort {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

/**
 * Coverage recommendation
 */
export interface CoverageRecommendation {
  readonly priority: RecommendationPriority;
  readonly category: RecommendationCategory;
  readonly description: string;
  readonly action: string;
  readonly estimatedEffort: EffortLevel;
  readonly expectedImpact: ImpactLevel;
  readonly resources?: string[];
}

/**
 * Recommendation priorities
 */
export enum RecommendationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Recommendation categories
 */
export enum RecommendationCategory {
  FUNCTION_COVERAGE = 'FUNCTION_COVERAGE',
  BRANCH_COVERAGE = 'BRANCH_COVERAGE',
  LINE_COVERAGE = 'LINE_COVERAGE',
  FILE_COVERAGE = 'FILE_COVERAGE',
  INTEGRATION_TESTING = 'INTEGRATION_TESTING',
  EDGE_CASE_TESTING = 'EDGE_CASE_TESTING'
}

/**
 * Effort levels
 */
export enum EffortLevel {
  MINIMAL = 'MINIMAL',      // < 1 hour
  LOW = 'LOW',              // 1-4 hours
  MEDIUM = 'MEDIUM',        // 1-2 days
  HIGH = 'HIGH',            // 3-5 days
  VERY_HIGH = 'VERY_HIGH'   // > 1 week
}

/**
 * Impact levels
 */
export enum ImpactLevel {
  LOW = 'LOW',              // < 5% improvement
  MEDIUM = 'MEDIUM',        // 5-15% improvement
  HIGH = 'HIGH',            // 15-30% improvement
  VERY_HIGH = 'VERY_HIGH'   // > 30% improvement
}

/**
 * Coverage metadata
 */
export interface CoverageMetadata {
  readonly testExecutionId?: string;
  readonly commitHash?: string;
  readonly branch?: string;
  readonly buildNumber?: string;
  readonly environment?: string;
  readonly testDuration?: number;
  readonly testCount?: number;
  readonly toolVersion?: string;
}

/**
 * File coverage metadata
 */
export interface FileCoverageMetadata {
  readonly lastModified?: number;
  readonly author?: string;
  readonly complexity?: number;
  readonly dependencies?: string[];
  readonly testFiles?: string[];
}

/**
 * Coverage dashboard configuration
 */
export interface CoverageDashboardConfig {
  readonly enabled: boolean;
  readonly refreshInterval: number;
  readonly widgets: CoverageWidget[];
  readonly filters: CoverageFilter[];
  readonly thresholdIndicators: boolean;
  readonly historicalCharts: boolean;
}

/**
 * Coverage dashboard widget
 */
export interface CoverageWidget {
  readonly id: string;
  readonly type: WidgetType;
  readonly title: string;
  readonly config: WidgetConfig;
  readonly position: WidgetPosition;
  readonly refreshInterval?: number;
}

/**
 * Widget types for coverage dashboard
 */
export enum WidgetType {
  COVERAGE_GAUGE = 'COVERAGE_GAUGE',
  TREND_CHART = 'TREND_CHART',
  FILE_LIST = 'FILE_LIST',
  FUNCTION_LIST = 'FUNCTION_LIST',
  UNCOVERED_ELEMENTS = 'UNCOVERED_ELEMENTS',
  THRESHOLD_STATUS = 'THRESHOLD_STATUS',
  HEATMAP = 'HEATMAP'
}

/**
 * Widget configuration
 */
export interface WidgetConfig {
  readonly metrics: CoverageMetricType[];
  readonly timeRange?: TimeRange;
  readonly filters?: Record<string, any>;
  readonly sortBy?: string;
  readonly limit?: number;
  readonly showThresholds?: boolean;
}

/**
 * Widget position on dashboard
 */
export interface WidgetPosition {
  readonly row: number;
  readonly column: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Time range for historical data
 */
export interface TimeRange {
  readonly start: Date;
  readonly end: Date;
  readonly granularity: TimeGranularity;
}

/**
 * Time granularity options
 */
export enum TimeGranularity {
  HOUR = 'HOUR',
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH'
}

/**
 * Coverage filter for dashboard
 */
export interface CoverageFilter {
  readonly field: string;
  readonly type: FilterType;
  readonly values: string[];
  readonly defaultValue?: string;
}

/**
 * Filter types
 */
export enum FilterType {
  DROPDOWN = 'DROPDOWN',
  MULTI_SELECT = 'MULTI_SELECT',
  DATE_RANGE = 'DATE_RANGE',
  SEARCH = 'SEARCH',
  THRESHOLD = 'THRESHOLD'
}

/**
 * Coverage export configuration
 */
export interface CoverageExportConfig {
  readonly formats: CoverageReportFormat[];
  readonly includeRawData: boolean;
  readonly includeAnalysis: boolean;
  readonly includeRecommendations: boolean;
  readonly compression: boolean;
  readonly encryption?: EncryptionConfig;
}

/**
 * Encryption configuration for exports
 */
export interface EncryptionConfig {
  readonly enabled: boolean;
  readonly algorithm: string;
  readonly keySize: number;
}

/**
 * Coverage trend analysis
 */
export interface CoverageTrendAnalysis {
  readonly analysisId: string;
  readonly timeRange: TimeRange;
  readonly functionName?: string;
  readonly dataPoints: CoverageDataPoint[];
  readonly trend: TrendDirection;
  readonly correlation: number;           // -1 to 1
  readonly volatility: number;            // standard deviation
  readonly prediction: CoveragePrediction;
  readonly anomalies: CoverageAnomaly[];
}

/**
 * Coverage data point for trend analysis
 */
export interface CoverageDataPoint {
  readonly timestamp: number;
  readonly overall: number;
  readonly functions: number;
  readonly branches: number;
  readonly lines: number;
  readonly executionId: string;
  readonly metadata?: Record<string, any>;
}

/**
 * Trend directions
 */
export enum TrendDirection {
  STRONGLY_IMPROVING = 'STRONGLY_IMPROVING',
  IMPROVING = 'IMPROVING',
  STABLE = 'STABLE',
  DECLINING = 'DECLINING',
  STRONGLY_DECLINING = 'STRONGLY_DECLINING',
  VOLATILE = 'VOLATILE'
}

/**
 * Coverage prediction
 */
export interface CoveragePrediction {
  readonly predictedCoverage: number;
  readonly confidence: number;            // 0-1
  readonly timeHorizon: number;          // days
  readonly methodology: string;
  readonly assumptions: string[];
}

/**
 * Coverage anomaly detection
 */
export interface CoverageAnomaly {
  readonly timestamp: number;
  readonly type: AnomalyType;
  readonly severity: AnomalySeverity;
  readonly description: string;
  readonly expectedValue: number;
  readonly actualValue: number;
  readonly deviation: number;
}

/**
 * Anomaly types
 */
export enum AnomalyType {
  SUDDEN_DROP = 'SUDDEN_DROP',
  SUDDEN_SPIKE = 'SUDDEN_SPIKE',
  GRADUAL_DECLINE = 'GRADUAL_DECLINE',
  UNUSUAL_VOLATILITY = 'UNUSUAL_VOLATILITY',
  BASELINE_SHIFT = 'BASELINE_SHIFT'
}

/**
 * Anomaly severity levels
 */
export enum AnomalySeverity {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL'
}

/**
 * Coverage comparison result
 */
export interface CoverageComparisonResult {
  readonly comparisonId: string;
  readonly baseline: CoverageSnapshot;
  readonly current: CoverageSnapshot;
  readonly changes: CoverageChanges;
  readonly analysis: ComparisonAnalysis;
  readonly verdict: ComparisonVerdict;
  readonly recommendations: CoverageRecommendation[];
}

/**
 * Coverage snapshot for comparison
 */
export interface CoverageSnapshot {
  readonly reportId: string;
  readonly timestamp: number;
  readonly commitHash?: string;
  readonly branch?: string;
  readonly overall: number;
  readonly functions: number;
  readonly branches: number;
  readonly lines: number;
}

/**
 * Coverage changes between snapshots
 */
export interface CoverageChanges {
  readonly overall: ChangeMetric;
  readonly functions: ChangeMetric;
  readonly branches: ChangeMetric;
  readonly lines: ChangeMetric;
  readonly newFiles: string[];
  readonly removedFiles: string[];
  readonly modifiedFiles: FileChange[];
}

/**
 * Change metric
 */
export interface ChangeMetric {
  readonly absolute: number;
  readonly percentage: number;
  readonly direction: ChangeDirection;
  readonly significance: ChangeSignificance;
}

/**
 * Change directions
 */
export enum ChangeDirection {
  INCREASED = 'INCREASED',
  DECREASED = 'DECREASED',
  UNCHANGED = 'UNCHANGED'
}

/**
 * Change significance levels
 */
export enum ChangeSignificance {
  NEGLIGIBLE = 'NEGLIGIBLE',    // < 1%
  MINOR = 'MINOR',              // 1-5%
  MODERATE = 'MODERATE',        // 5-15%
  MAJOR = 'MAJOR',              // 15-30%
  CRITICAL = 'CRITICAL'         // > 30%
}

/**
 * File change information
 */
export interface FileChange {
  readonly fileName: string;
  readonly coverageChange: number;
  readonly linesAdded: number;
  readonly linesRemoved: number;
  readonly functionsAdded: number;
  readonly functionsRemoved: number;
}

/**
 * Comparison analysis
 */
export interface ComparisonAnalysis {
  readonly regression: boolean;
  readonly improvement: boolean;
  readonly significantChanges: string[];
  readonly riskAssessment: RiskLevel;
  readonly qualityImpact: QualityImpact;
}

/**
 * Risk levels
 */
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Quality impact assessment
 */
export interface QualityImpact {
  readonly overall: ImpactLevel;
  readonly maintainability: ImpactLevel;
  readonly reliability: ImpactLevel;
  readonly testability: ImpactLevel;
}

/**
 * Comparison verdict
 */
export enum ComparisonVerdict {
  SIGNIFICANTLY_BETTER = 'SIGNIFICANTLY_BETTER',
  BETTER = 'BETTER',
  SIMILAR = 'SIMILAR',
  WORSE = 'WORSE',
  SIGNIFICANTLY_WORSE = 'SIGNIFICANTLY_WORSE'
}

/**
 * Coverage alert
 */
export interface CoverageAlert {
  readonly alertId: string;
  readonly timestamp: number;
  readonly type: CoverageAlertType;
  readonly severity: AlertSeverity;
  readonly message: string;
  readonly threshold: number;
  readonly actualValue: number;
  readonly functionName?: string;
  readonly fileName?: string;
  readonly resolved: boolean;
  readonly resolvedAt?: number;
  readonly actions: AlertAction[];
}

/**
 * Coverage alert types
 */
export enum CoverageAlertType {
  THRESHOLD_VIOLATION = 'THRESHOLD_VIOLATION',
  REGRESSION_DETECTED = 'REGRESSION_DETECTED',
  ANOMALY_DETECTED = 'ANOMALY_DETECTED',
  SIGNIFICANT_DECLINE = 'SIGNIFICANT_DECLINE',
  NEW_UNCOVERED_CODE = 'NEW_UNCOVERED_CODE'
}

/**
 * Coverage optimization suggestion
 */
export interface CoverageOptimization {
  readonly id: string;
  readonly type: OptimizationType;
  readonly target: OptimizationTarget;
  readonly description: string;
  readonly implementation: string;
  readonly expectedImprovement: number;   // percentage points
  readonly effort: EffortLevel;
  readonly priority: RecommendationPriority;
  readonly dependencies: string[];
  readonly risks: string[];
}

/**
 * Optimization types
 */
export enum OptimizationType {
  TEST_ADDITION = 'TEST_ADDITION',
  TEST_IMPROVEMENT = 'TEST_IMPROVEMENT',
  CODE_REFACTORING = 'CODE_REFACTORING',
  DEAD_CODE_REMOVAL = 'DEAD_CODE_REMOVAL',
  EDGE_CASE_TESTING = 'EDGE_CASE_TESTING',
  INTEGRATION_TESTING = 'INTEGRATION_TESTING'
}

/**
 * Optimization targets
 */
export enum OptimizationTarget {
  OVERALL_COVERAGE = 'OVERALL_COVERAGE',
  FUNCTION_COVERAGE = 'FUNCTION_COVERAGE',
  BRANCH_COVERAGE = 'BRANCH_COVERAGE',
  LINE_COVERAGE = 'LINE_COVERAGE',
  SPECIFIC_FILE = 'SPECIFIC_FILE',
  SPECIFIC_FUNCTION = 'SPECIFIC_FUNCTION'
}

/**
 * Coverage health score
 */
export interface CoverageHealthScore {
  readonly score: number;              // 0-100
  readonly grade: HealthGrade;
  readonly factors: HealthFactor[];
  readonly trend: TrendDirection;
  readonly recommendations: string[];
}

/**
 * Health grades
 */
export enum HealthGrade {
  EXCELLENT = 'EXCELLENT',    // 90-100
  GOOD = 'GOOD',              // 80-89
  FAIR = 'FAIR',              // 70-79
  POOR = 'POOR',              // 50-69
  CRITICAL = 'CRITICAL'       // 0-49
}

/**
 * Health factors contributing to score
 */
export interface HealthFactor {
  readonly name: string;
  readonly weight: number;        // 0-1
  readonly score: number;         // 0-100
  readonly description: string;
}