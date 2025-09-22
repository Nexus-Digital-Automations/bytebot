/**
 * Regression Testing Framework Type Definitions
 *
 * Comprehensive type definitions for enterprise-grade regression testing framework
 * supporting automated testing of 1,520+ database functions with baseline comparison
 * and change detection capabilities.
 *
 * @module RegressionTestingTypes
 * @version 1.0.0
 * @author PARLANT Testing Framework Agent
 */

import { DatabaseFunction } from "./framework.types";

// ============================================================================
// Core Regression Testing Types
// ============================================================================

/**
 * Regression test execution status
 */
export enum RegressionTestStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  PASSED = "PASSED",
  FAILED = "FAILED",
  WARNING = "WARNING",
  ERROR = "ERROR",
  SKIPPED = "SKIPPED",
  TIMEOUT = "TIMEOUT",
}

/**
 * Change detection severity levels
 */
export enum ChangeSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * Regression alert types
 */
export enum RegressionAlertType {
  FUNCTIONAL_REGRESSION = "FUNCTIONAL_REGRESSION",
  PERFORMANCE_REGRESSION = "PERFORMANCE_REGRESSION",
  COMPATIBILITY_ISSUE = "COMPATIBILITY_ISSUE",
  BASELINE_DEVIATION = "BASELINE_DEVIATION",
  STABILITY_CONCERN = "STABILITY_CONCERN",
  NEW_FAILURE = "NEW_FAILURE",
}

/**
 * Change detection types
 */
export enum ChangeType {
  FUNCTIONAL = "FUNCTIONAL",
  PERFORMANCE = "PERFORMANCE",
  BEHAVIOR = "BEHAVIOR",
  OUTPUT = "OUTPUT",
  SIDE_EFFECTS = "SIDE_EFFECTS",
  ERROR_HANDLING = "ERROR_HANDLING",
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Comprehensive regression test configuration
 */
export interface RegressionTestConfig {
  /** Test execution settings */
  execution: {
    /** Enable parallel test execution */
    parallelExecution: boolean;

    /** Maximum concurrent test workers */
    maxConcurrency: number;

    /** Test batch size for parallel execution */
    batchSize: number;

    /** Stop execution on first failure */
    failFast: boolean;

    /** Test timeout in milliseconds */
    testTimeout: number;

    /** Maximum retry attempts for failed tests */
    maxRetries: number;
  };

  /** Baseline management settings */
  baseline: {
    /** Automatically update baseline on successful runs */
    autoUpdateBaseline: boolean;

    /** Minimum compatibility score required */
    minCompatibilityScore: number;

    /** Maximum age of baseline in days */
    maxBaselineAge: number;

    /** Backup baselines before updates */
    backupOnUpdate: boolean;
  };

  /** Change detection sensitivity */
  changeDetection: {
    /** Enable functional change detection */
    functionalChanges: boolean;

    /** Enable performance change detection */
    performanceChanges: boolean;

    /** Enable behavior change detection */
    behaviorChanges: boolean;

    /** Maximum allowed performance deviation percentage */
    maxPerformanceDeviation: number;

    /** Result comparison tolerance */
    resultTolerance: number;
  };

  /** Alert configuration */
  alerts: {
    /** Enable regression alerts */
    enabled: boolean;

    /** Minimum severity level for alerts */
    minSeverity: ChangeSeverity;

    /** Alert notification channels */
    notificationChannels: ("EMAIL" | "SLACK" | "WEBHOOK")[];

    /** Alert throttling settings */
    throttling: {
      enabled: boolean;
      maxAlertsPerHour: number;
      suppressDuplicates: boolean;
    };
  };

  /** Reporting configuration */
  reporting: {
    /** Generate detailed regression reports */
    detailedReports: boolean;

    /** Include baseline comparison in reports */
    includeBaselineComparison: boolean;

    /** Include change detection analysis */
    includeChangeAnalysis: boolean;

    /** Export formats for reports */
    exportFormats: ("JSON" | "HTML" | "PDF" | "XML")[];
  };

  /** Storage and retention */
  storage: {
    /** Maximum number of execution results to retain */
    maxHistorySize: number;

    /** Baseline storage location */
    baselineStoragePath: string;

    /** Compress stored data */
    compression: boolean;

    /** Archive old executions */
    archiveOldExecutions: boolean;
  };

  /** Performance thresholds */
  performance: {
    /** Maximum response time in milliseconds */
    maxResponseTimeMs: number;

    /** Maximum memory usage in MB */
    maxMemoryUsageMB: number;

    /** Maximum CPU usage percentage */
    maxCpuUsagePercent: number;
  };

  // Flattened properties for backward compatibility
  /** Enable parallel test execution */
  parallelExecution: boolean;

  /** Maximum concurrent test workers */
  maxConcurrency: number;

  /** Test batch size for parallel execution */
  batchSize: number;

  /** Stop execution on first failure */
  failFast: boolean;

  /** Test timeout in milliseconds */
  testTimeout: number;

  /** Maximum retry attempts for failed tests */
  maxRetries: number;

  /** Automatically update baseline on successful runs */
  autoUpdateBaseline: boolean;

  /** Minimum compatibility score required */
  minCompatibilityScore: number;

  /** Maximum allowed performance deviation percentage */
  maxPerformanceDeviation: number;

  /** Maximum response time in milliseconds */
  maxResponseTimeMs: number;

  /** Maximum number of execution results to retain */
  maxHistorySize: number;
}

// ============================================================================
// Baseline Types
// ============================================================================

/**
 * Regression testing baseline
 */
export interface RegressionBaseline {
  /** Unique baseline identifier */
  baselineId: string;

  /** Baseline name */
  name: string;

  /** Baseline description */
  description: string;

  /** Baseline version */
  version: string;

  /** Creation timestamp */
  timestamp: Date;

  /** Function test definitions */
  functionTests: FunctionBaselineTest[];

  /** Baseline metadata */
  metadata: {
    /** Total number of functions */
    totalFunctions: number;

    /** Test environment */
    environment: string;

    /** Created by */
    createdBy: string;

    /** Tags for categorization */
    tags: string[];

    /** Baseline statistics */
    statistics: {
      /** Average response time */
      averageResponseTime: number;

      /** Total test cases */
      totalTestCases: number;

      /** Coverage percentage */
      coveragePercentage: number;
    };
  };

  /** Creation time in milliseconds */
  creationTime: number;
}

/**
 * Function baseline test definition
 */
export interface FunctionBaselineTest {
  /** Function name */
  functionName: string;

  /** Expected test result */
  expectedResult: unknown;

  /** Expected performance metrics */
  expectedPerformance: {
    /** Response time in milliseconds */
    responseTime: number;

    /** Memory usage in bytes */
    memoryUsage?: number;

    /** CPU time in milliseconds */
    cpuTime?: number;
  };

  /** Test scenarios */
  testScenarios: FunctionTestScenario[];

  /** Validation rules */
  validationRules: ValidationRule[];

  /** Test metadata */
  metadata: {
    /** Last updated timestamp */
    lastUpdated: Date;

    /** Number of times tested */
    testCount: number;

    /** Success rate percentage */
    successRate: number;
  };
}

/**
 * Function test scenario
 */
export interface FunctionTestScenario {
  /** Scenario identifier */
  scenarioId: string;

  /** Scenario description */
  description: string;

  /** Test input parameters */
  input: Record<string, any>;

  /** Expected output */
  expectedOutput: unknown;

  /** Test conditions */
  conditions: TestCondition[];

  /** Scenario metadata */
  metadata: {
    /** Scenario type */
    type: "HAPPY_PATH" | "EDGE_CASE" | "ERROR_CASE" | "BOUNDARY" | "LOAD";

    /** Priority level */
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

    /** Execution weight */
    weight: number;
  };
}

/**
 * Test condition
 */
export interface TestCondition {
  /** Condition type */
  type: "PRE_CONDITION" | "POST_CONDITION" | "INVARIANT";

  /** Condition description */
  description: string;

  /** Validation expression */
  expression: string;

  /** Error message if condition fails */
  errorMessage: string;
}

/**
 * Validation rule
 */
export interface ValidationRule {
  /** Rule identifier */
  ruleId: string;

  /** Rule type */
  type:
    | "RESULT_VALIDATION"
    | "PERFORMANCE_VALIDATION"
    | "BEHAVIOR_VALIDATION"
    | "STATE_VALIDATION";

  /** Rule description */
  description: string;

  /** Validation criteria */
  criteria: {
    /** Comparison operator */
    operator:
      | "EQUALS"
      | "NOT_EQUALS"
      | "GREATER_THAN"
      | "LESS_THAN"
      | "CONTAINS"
      | "MATCHES_PATTERN";

    /** Expected value */
    expectedValue: unknown;

    /** Tolerance for numeric comparisons */
    tolerance?: number;

    /** Custom validation function */
    customValidator?: string;
  };

  /** Rule severity */
  severity: ChangeSeverity;
}

// ============================================================================
// Test Execution Types
// ============================================================================

/**
 * Regression test suite
 */
export interface RegressionTestSuite {
  /** Suite identifier */
  suiteId: string;

  /** Suite name */
  name: string;

  /** Suite description */
  description: string;

  /** Associated baseline ID */
  baselineId: string;

  /** Regression tests */
  regressionTests: FunctionRegressionTest[];

  /** Execution configuration */
  executionConfig: {
    /** Enable parallel execution */
    parallelExecution: boolean;

    /** Maximum concurrency */
    maxConcurrency: number;

    /** Batch size */
    batchSize: number;

    /** Fail fast on errors */
    failFast: boolean;
  };

  /** Suite generation time */
  generationTime: number;
}

/**
 * Function regression test
 */
export interface FunctionRegressionTest {
  /** Function name */
  functionName: string;

  /** Test type */
  testType: "REGRESSION" | "SMOKE" | "SANITY" | "CRITICAL_PATH";

  /** Baseline result reference */
  baselineResult: unknown;

  /** Test scenarios */
  testScenarios: FunctionTestScenario[];

  /** Validation criteria */
  validationCriteria: ValidationCriteria;

  /** Change detectors */
  changeDetectors: ChangeDetector[];

  /** Execution configuration */
  executionConfig: {
    /** Test timeout */
    timeout: number;

    /** Retry count */
    retryCount: number;

    /** Parallel execution */
    parallelExecution: boolean;
  };
}

/**
 * Validation criteria
 */
export interface ValidationCriteria {
  /** Result validation */
  resultValidation: {
    /** Validation type */
    type: "EXACT_MATCH" | "FUZZY_MATCH" | "PATTERN_MATCH" | "CUSTOM";

    /** Tolerance for fuzzy matching */
    tolerance: number;

    /** Custom validation logic */
    customValidator?: string;
  };

  /** Performance validation */
  performanceValidation: {
    /** Maximum response time */
    maxResponseTime: number;

    /** Maximum deviation percentage */
    maxDeviationPercent: number;

    /** Memory usage limits */
    memoryLimits?: {
      maxUsage: number;
      maxIncrease: number;
    };
  };

  /** Behavior validation */
  behaviorValidation: {
    /** Check for side effects */
    checkSideEffects: boolean;

    /** Validate system state */
    validateState: boolean;

    /** Check error handling */
    checkErrorHandling: boolean;
  };
}

/**
 * Change detector
 */
export interface ChangeDetector {
  /** Detector type */
  type:
    | "RESULT_CHANGE"
    | "PERFORMANCE_CHANGE"
    | "BEHAVIOR_CHANGE"
    | "STATE_CHANGE";

  /** Detection sensitivity */
  sensitivity: "LOW" | "MEDIUM" | "HIGH";

  /** Detection threshold */
  threshold: number;

  /** Detector configuration */
  config: {
    /** Enable deep comparison */
    deepComparison: boolean;

    /** Ignore fields */
    ignoreFields: string[];

    /** Comparison options */
    comparisonOptions: Record<string, any>;
  };
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Comprehensive regression test result
 */
export interface RegressionTestResult {
  /** Execution identifier */
  executionId: string;

  /** Execution timestamp */
  timestamp: Date;

  /** Execution duration in milliseconds */
  duration: number;

  /** Overall execution status */
  status: RegressionTestStatus;

  /** Number of functions tested */
  functionsTestested: number;

  /** Total tests executed */
  testsExecuted: number;

  /** Tests passed */
  testsPassed: number;

  /** Tests failed */
  testsFailed: number;

  /** Tests skipped */
  testsSkipped: number;

  /** Baseline comparison result */
  baselineComparison: BaselineComparison | null;

  /** Change detection result */
  changeDetection: ChangeDetectionResult | null;

  /** Regression alerts */
  regressionAlerts: RegressionAlert[];

  /** Individual test results */
  testResults: FunctionTestResult[];

  /** Execution summary */
  summary: string;

  /** Execution metadata */
  metadata: {
    /** Triggered by */
    triggeredBy: "MANUAL" | "AUTOMATED" | "CI_CD" | "SCHEDULED";

    /** Commit hash */
    commitHash?: string;

    /** Branch name */
    branch?: string;

    /** Timestamp */
    timestamp: Date;
  };

  /** Error message if execution failed */
  error?: string;
}

/**
 * Function test result
 */
export interface FunctionTestResult {
  /** Function name */
  functionName: string;

  /** Test status */
  status: RegressionTestStatus;

  /** Test duration */
  duration: number;

  /** Test result */
  result: unknown;

  /** Performance metrics */
  performance: {
    /** Response time */
    responseTime: number;

    /** Memory usage */
    memoryUsage?: number;

    /** CPU time */
    cpuTime?: number;
  };

  /** Test scenarios executed */
  scenarios: FunctionTestScenario[];

  /** Validation results */
  validation: ValidationResult[];

  /** Changes detected */
  changesDetected: DetectedChange[];

  /** Error details if test failed */
  error?: {
    /** Error message */
    message: string;

    /** Error stack trace */
    stack?: string;

    /** Error type */
    type: string;
  };
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Validation rule ID */
  ruleId: string;

  /** Validation status */
  status: "PASSED" | "FAILED" | "SKIPPED";

  /** Expected value */
  expected: unknown;

  /** Actual value */
  actual: unknown;

  /** Error message if validation failed */
  message?: string;

  /** Validation details */
  details: {
    /** Comparison result */
    comparisonResult: boolean;

    /** Tolerance applied */
    tolerance?: number;

    /** Deviation amount */
    deviation?: number;
  };
}

// ============================================================================
// Change Detection Types
// ============================================================================

/**
 * Change detection result
 */
export interface ChangeDetectionResult {
  /** Analysis identifier */
  analysisId: string;

  /** Analysis timestamp */
  timestamp: Date;

  /** Analysis time in milliseconds */
  analysisTime: number;

  /** Changes detected */
  changesDetected: DetectedChange[];

  /** Stability analysis */
  stabilityAnalysis: StabilityAnalysis[];

  /** Overall stability score */
  overallStability: number;

  /** Change categories */
  changeCategories: Record<string, number>;

  /** Risk assessment */
  riskAssessment: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

/**
 * Detected change
 */
export interface DetectedChange {
  /** Change type */
  type: ChangeType;

  /** Function name */
  functionName: string;

  /** Change details */
  changes: ChangeDetail[];

  /** Change severity */
  severity: ChangeSeverity;

  /** Change impact assessment */
  impact: string;

  /** Change timestamp */
  timestamp: Date;
}

/**
 * Change detail
 */
export interface ChangeDetail {
  /** Change description */
  description: string;

  /** Current value */
  current: unknown;

  /** Baseline value */
  baseline: unknown;

  /** Change type */
  changeType: "ADDITION" | "REMOVAL" | "MODIFICATION" | "REORDERING";

  /** Change location */
  location?: string;

  /** Change severity */
  severity: ChangeSeverity;

  /** Deviation amount (for numeric changes) */
  deviation?: number;
}

/**
 * Stability analysis
 */
export interface StabilityAnalysis {
  /** Function name */
  functionName: string;

  /** Stability score (0-100) */
  stabilityScore: number;

  /** Stability factors */
  factors: string[];

  /** Stability recommendation */
  recommendation: "STABLE" | "MONITOR" | "INVESTIGATE" | "CRITICAL";

  /** Historical stability trend */
  trend: {
    /** Trend direction */
    direction: "IMPROVING" | "STABLE" | "DEGRADING";

    /** Trend confidence */
    confidence: number;

    /** Data points used */
    dataPoints: number;
  };
}

// ============================================================================
// Baseline Comparison Types
// ============================================================================

/**
 * Baseline comparison result
 */
export interface BaselineComparison {
  /** Comparison identifier */
  comparisonId: string;

  /** Comparison timestamp */
  timestamp: Date;

  /** Comparison time in milliseconds */
  comparisonTime: number;

  /** Baseline identifier */
  baselineId: string;

  /** Baseline timestamp */
  baselineTimestamp: Date;

  /** Current execution identifier */
  currentExecutionId: string;

  /** Function comparisons */
  functionComparisons: FunctionComparison[];

  /** Comparison summary */
  summary: {
    /** Total functions compared */
    totalFunctions: number;

    /** Matching results */
    matchingResults: number;

    /** Different results */
    differentResults: number;

    /** New functions */
    newFunctions: number;

    /** Missing functions */
    missingFunctions: number;

    /** Compatibility score */
    compatibilityScore: number;
  };

  /** Regression detected flag */
  regressionDetected: boolean;

  /** Significant changes count */
  significantChanges: number;

  /** Overall assessment */
  overallAssessment:
    | "FULLY_COMPATIBLE"
    | "MOSTLY_COMPATIBLE"
    | "PARTIALLY_COMPATIBLE"
    | "INCOMPATIBLE";
}

/**
 * Function comparison result
 */
export interface FunctionComparison {
  /** Function name */
  functionName: string;

  /** Comparison status */
  status: "MATCH" | "DIFFERENT" | "NEW_FUNCTION" | "MISSING_FUNCTION" | "ERROR";

  /** Functions match baseline */
  matches: boolean;

  /** List of differences found */
  differences: string[];

  /** Current test result */
  current: unknown;

  /** Baseline test result */
  baseline: unknown;

  /** Change significance */
  significance: "LOW" | "MEDIUM" | "HIGH";

  /** Compatibility score */
  compatibilityScore: number;

  /** Detailed comparison */
  detailedComparison: {
    /** Result comparison */
    resultComparison: ComparisonDetail;

    /** Performance comparison */
    performanceComparison: ComparisonDetail;

    /** Behavior comparison */
    behaviorComparison: ComparisonDetail;
  };
}

/**
 * Comparison detail
 */
export interface ComparisonDetail {
  /** Comparison type */
  type: "RESULT" | "PERFORMANCE" | "BEHAVIOR";

  /** Comparison status */
  status: "IDENTICAL" | "SIMILAR" | "DIFFERENT" | "INCOMPARABLE";

  /** Current value */
  current: unknown;

  /** Baseline value */
  baseline: unknown;

  /** Difference description */
  difference?: string;

  /** Similarity score (0-100) */
  similarityScore: number;

  /** Deviation amount */
  deviation?: number;
}

// ============================================================================
// Alert Types
// ============================================================================

/**
 * Regression alert
 */
export interface RegressionAlert {
  /** Alert identifier */
  alertId: string;

  /** Alert type */
  type: RegressionAlertType;

  /** Alert severity */
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  /** Function name (or MULTIPLE for system-wide alerts) */
  functionName: string;

  /** Alert title */
  title: string;

  /** Alert description */
  description: string;

  /** Impact assessment */
  impact: string;

  /** Recommended action */
  recommendation: string;

  /** Alert timestamp */
  timestamp: Date;

  /** Supporting evidence */
  evidence: {
    /** Change type */
    changeType?: ChangeType;

    /** Changes detected */
    changes?: ChangeDetail[];

    /** Severity */
    severity?: ChangeSeverity;

    /** Additional data */
    additionalData?: Record<string, any>;
  };

  /** Alert status */
  status?: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED" | "SUPPRESSED";

  /** Resolution details */
  resolution?: {
    /** Resolved by */
    resolvedBy: string;

    /** Resolution timestamp */
    timestamp: Date;

    /** Resolution notes */
    notes: string;
  };
}

// ============================================================================
// Execution Tracking Types
// ============================================================================

/**
 * Regression test execution record
 */
export interface RegressionTestExecution {
  /** Execution identifier */
  executionId: string;

  /** Execution timestamp */
  timestamp: Date;

  /** Execution status */
  status: RegressionTestStatus;

  /** Execution duration */
  duration: number;

  /** Functions tested */
  functionsTestested: number;

  /** Full execution result */
  result: RegressionTestResult;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Test execution statistics
 */
export interface ExecutionStatistics {
  /** Total executions */
  totalExecutions: number;

  /** Successful executions */
  successfulExecutions: number;

  /** Failed executions */
  failedExecutions: number;

  /** Average execution time */
  averageExecutionTime: number;

  /** Success rate percentage */
  successRate: number;

  /** Most common failure reasons */
  commonFailures: Record<string, number>;
}

/**
 * Trend analysis data
 */
export interface TrendAnalysis {
  /** Trend period */
  period: string;

  /** Data points */
  dataPoints: {
    /** Timestamp */
    timestamp: Date;

    /** Success rate */
    successRate: number;

    /** Execution time */
    executionTime: number;

    /** Alert count */
    alertCount: number;
  }[];

  /** Trend direction */
  trend: "IMPROVING" | "STABLE" | "DEGRADING";

  /** Trend confidence */
  confidence: number;
}

/**
 * Performance baseline
 */
export interface PerformanceBaseline {
  /** Function name */
  functionName: string;

  /** Baseline metrics */
  baseline: {
    /** Response time percentiles */
    responseTime: {
      p50: number;
      p95: number;
      p99: number;
      mean: number;
    };

    /** Memory usage */
    memoryUsage: {
      average: number;
      peak: number;
    };

    /** CPU usage */
    cpuUsage: {
      average: number;
      peak: number;
    };
  };

  /** Acceptable deviation thresholds */
  thresholds: {
    /** Response time deviation */
    responseTimeDeviation: number;

    /** Memory usage deviation */
    memoryUsageDeviation: number;

    /** CPU usage deviation */
    cpuUsageDeviation: number;
  };
}

// ============================================================================
// Export All Types
// ============================================================================

// Types are already exported via 'export interface' declarations above
