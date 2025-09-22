/**
 * PARLANT Testing Framework - Core Type Definitions
 *
 * Comprehensive type definitions for the PARLANT testing framework
 * supporting automated testing of 1,520+ database functions with
 * 95%+ coverage and sub-1000ms performance requirements.
 *
 * @fileoverview Core type definitions for PARLANT testing framework
 * @version 1.0.0
 * @author PARLANT Testing Framework Agent
 * @created 2025-09-20
 */

/**
 * Test execution status enumeration
 */
export enum TestStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  PASSED = "PASSED",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED",
  CANCELLED = "CANCELLED",
  TIMEOUT = "TIMEOUT",
}

/**
 * Test category enumeration
 */
export enum TestCategory {
  UNIT = "UNIT",
  INTEGRATION = "INTEGRATION",
  PERFORMANCE = "PERFORMANCE",
  SECURITY = "SECURITY",
  REGRESSION = "REGRESSION",
  LOAD = "LOAD",
  STRESS = "STRESS",
  SMOKE = "SMOKE",
}

/**
 * Test priority levels
 */
export enum TestPriority {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

/**
 * Database function categories for testing
 */
export enum DatabaseFunctionCategory {
  QUERY = "QUERY",
  TRANSACTION = "TRANSACTION",
  HEALTH = "HEALTH",
  METRICS = "METRICS",
  BACKUP = "BACKUP",
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  VALIDATION = "VALIDATION",
}

/**
 * Database function metadata for testing
 */
export interface DatabaseFunction {
  readonly id: string;
  readonly name: string;
  readonly category: DatabaseFunctionCategory;
  readonly description: string;
  readonly packageName: string;
  readonly riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly expectedResponseTime: number; // milliseconds
  readonly parameters: DatabaseFunctionParameter[];
  readonly returnType: string;
  readonly dependencies: string[];
  readonly tags: string[];
}

/**
 * Database function parameter definition
 */
export interface DatabaseFunctionParameter {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly description: string;
  readonly validation?: ParameterValidation;
  readonly defaultValue?: unknown;
}

/**
 * Parameter validation rules
 */
export interface ParameterValidation {
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly allowedValues?: unknown[];
  readonly customValidator?: string;
}

/**
 * Individual test definition
 */
export interface Test {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: TestCategory;
  readonly priority: TestPriority;
  readonly function?: DatabaseFunction;
  readonly timeout: number;
  readonly retryAttempts: number;
  readonly tags: string[];
  readonly setup?: TestSetup;
  readonly teardown?: TestTeardown;
  readonly assertions: TestAssertion[];
  readonly dependencies: string[];
}

/**
 * Test setup configuration
 */
export interface TestSetup {
  readonly mockData?: Record<string, any>;
  readonly environment?: Record<string, any>;
  readonly prerequisites?: string[];
  readonly initializationScript?: string;
}

/**
 * Test teardown configuration
 */
export interface TestTeardown {
  readonly cleanupData?: boolean;
  readonly resetEnvironment?: boolean;
  readonly cleanupScript?: string;
}

/**
 * Test assertion definition
 */
export interface TestAssertion {
  readonly type:
    | "EQUALS"
    | "NOT_EQUALS"
    | "CONTAINS"
    | "NOT_CONTAINS"
    | "RESPONSE_TIME"
    | "STATUS_CODE"
    | "CUSTOM";
  readonly expected: unknown;
  readonly actual?: unknown;
  readonly description: string;
  readonly customAssertion?: string;
}

/**
 * Test suite definition
 */
export interface TestSuite {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: TestCategory;
  readonly tests: Test[];
  readonly setup?: TestSetup;
  readonly teardown?: TestTeardown;
  readonly parallel: boolean;
  readonly maxConcurrency: number;
  readonly tags: string[];
}

/**
 * Test execution plan
 */
export interface TestExecutionPlan {
  readonly categories: TestCategory[];
  readonly parallelExecution: boolean;
  readonly maxWorkers: number;
  readonly timeout: number;
  readonly retryAttempts: number;
  readonly functions: string[];
  readonly includePatterns: string[];
  readonly excludePatterns: string[];
}

/**
 * Test execution context
 */
export interface TestExecutionContext {
  readonly executionId: string;
  readonly startTime: number;
  readonly plan: TestExecutionPlan;
  readonly metrics: TestMetrics;
  status: TestStatus;
  readonly environment?: Record<string, any>;
}

/**
 * Test execution result
 */
export interface TestExecutionResult {
  readonly executionId: string;
  readonly startTime: number;
  endTime: number;
  totalDuration: number;
  status: TestStatus;
  readonly testResults: TestResult[];
  readonly metrics: TestMetrics;
  readonly coverage: CoverageReport | null;
  readonly error?: string;
  readonly warnings?: string[];
}

/**
 * Individual test result
 */
export interface TestResult {
  readonly testId: string;
  readonly name: string;
  readonly category: TestCategory;
  readonly status: TestStatus;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly assertions: AssertionResult[];
  readonly error?: string;
  readonly warnings?: string[];
  readonly metadata?: Record<string, any>;
}

/**
 * Test assertion result
 */
export interface AssertionResult {
  readonly description: string;
  readonly passed: boolean;
  readonly expected: unknown;
  readonly actual: unknown;
  readonly error?: string;
}

/**
 * Test execution metrics
 */
export interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalDuration: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  coveragePercentage: number;
  securityIssues: number;
  performanceIssues: number;
}

/**
 * Code coverage report
 */
export interface CoverageReport {
  readonly overall: number;
  readonly branches: number;
  readonly functions: number;
  readonly lines: number;
  readonly statements: number;
  readonly files: FileCoverage[];
  readonly uncoveredLines: UncoveredLine[];
}

/**
 * File coverage information
 */
export interface FileCoverage {
  readonly fileName: string;
  readonly coverage: number;
  readonly lines: number;
  readonly coveredLines: number;
  readonly branches: number;
  readonly coveredBranches: number;
  readonly functions: number;
  readonly coveredFunctions: number;
}

/**
 * Uncovered line information
 */
export interface UncoveredLine {
  readonly fileName: string;
  readonly lineNumber: number;
  readonly reason: string;
}

/**
 * Test framework configuration
 */
export interface TestFrameworkConfig {
  readonly coverage: CoverageConfig;
  readonly performance: PerformanceConfig;
  readonly parallel: ParallelConfig;
  readonly security: SecurityConfig;
  readonly database: DatabaseConfig;
  readonly reporting: ReportingConfig;
}

/**
 * Coverage configuration
 */
export interface CoverageConfig {
  readonly target: number;
  readonly threshold: CoverageThreshold;
  readonly excludePatterns: string[];
  readonly includePatterns: string[];
}

/**
 * Coverage threshold configuration
 */
export interface CoverageThreshold {
  readonly global: {
    readonly branches: number;
    readonly functions: number;
    readonly lines: number;
    readonly statements: number;
  };
  readonly perFile?: {
    readonly branches: number;
    readonly functions: number;
    readonly lines: number;
    readonly statements: number;
  };
}

/**
 * Performance testing configuration
 */
export interface PerformanceConfig {
  readonly maxResponseTime: number;
  readonly loadTestConcurrency: number;
  readonly benchmarkIterations: number;
  readonly performanceThresholds: PerformanceThresholds;
}

/**
 * Performance thresholds
 */
export interface PerformanceThresholds {
  readonly responseTime: number;
  readonly throughput: number;
  readonly errorRate: number;
  readonly cpuUsage: number;
  readonly memoryUsage: number;
}

/**
 * Parallel execution configuration
 */
export interface ParallelConfig {
  readonly maxWorkers: number;
  readonly batchSize: number;
  readonly timeout: number;
  readonly queueTimeout: number;
}

/**
 * Security testing configuration
 */
export interface SecurityConfig {
  readonly vulnerabilityScanning: boolean;
  readonly authenticationTesting: boolean;
  readonly authorizationTesting: boolean;
  readonly dataProtectionTesting: boolean;
  readonly securityThresholds: SecurityThresholds;
}

/**
 * Security testing thresholds
 */
export interface SecurityThresholds {
  readonly maxVulnerabilities: number;
  readonly maxCriticalVulnerabilities: number;
  readonly maxHighVulnerabilities: number;
  readonly minSecurityScore: number;
}

/**
 * Database testing configuration
 */
export interface DatabaseConfig {
  readonly mockDatabase: boolean;
  readonly testDatabase: string;
  readonly connectionPoolSize: number;
  readonly transactionTimeout: number;
  readonly cleanupAfterTests: boolean;
}

/**
 * Reporting configuration
 */
export interface ReportingConfig {
  readonly formats: ReportFormat[];
  readonly outputDirectory: string;
  readonly includeDetailedLogs: boolean;
  readonly includePerformanceGraphs: boolean;
  readonly includeCoverageGraphs: boolean;
}

/**
 * Report format enumeration
 */
export enum ReportFormat {
  HTML = "HTML",
  JSON = "JSON",
  XML = "XML",
  PDF = "PDF",
  CONSOLE = "CONSOLE",
}

/**
 * Test execution event types
 */
export type TestExecutionEvent =
  | "framework:initialized"
  | "execution:started"
  | "execution:completed"
  | "execution:failed"
  | "execution:stopped"
  | "suite:registered"
  | "test:started"
  | "test:completed"
  | "test:failed"
  | "coverage:calculated"
  | "performance:measured"
  | "security:scanned";

/**
 * Test execution event data
 */
export interface TestExecutionEventData {
  readonly eventType: TestExecutionEvent;
  readonly timestamp: number;
  readonly executionId?: string;
  readonly testId?: string;
  readonly data: Record<string, any>;
}

/**
 * Mock database configuration
 */
export interface MockDatabaseConfig {
  readonly type: "memory" | "file" | "docker";
  readonly connectionString?: string;
  readonly schema: DatabaseSchema;
  readonly seedData?: Record<string, any[]>;
  readonly responseDelay?: number;
}

/**
 * Database schema definition
 */
export interface DatabaseSchema {
  readonly tables: TableSchema[];
  readonly relationships: Relationship[];
  readonly indexes: Index[];
}

/**
 * Table schema definition
 */
export interface TableSchema {
  readonly name: string;
  readonly columns: ColumnSchema[];
  readonly constraints: Constraint[];
}

/**
 * Column schema definition
 */
export interface ColumnSchema {
  readonly name: string;
  readonly type: string;
  readonly nullable: boolean;
  readonly defaultValue?: unknown;
  readonly isPrimaryKey: boolean;
  readonly isForeignKey: boolean;
  readonly references?: string;
}

/**
 * Database relationship definition
 */
export interface Relationship {
  readonly name: string;
  readonly type: "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_MANY";
  readonly fromTable: string;
  readonly toTable: string;
  readonly fromColumn: string;
  readonly toColumn: string;
}

/**
 * Database index definition
 */
export interface Index {
  readonly name: string;
  readonly table: string;
  readonly columns: string[];
  readonly unique: boolean;
  readonly type: "BTREE" | "HASH" | "GIN" | "GIST";
}

/**
 * Database constraint definition
 */
export interface Constraint {
  readonly name: string;
  readonly type:
    | "PRIMARY_KEY"
    | "FOREIGN_KEY"
    | "UNIQUE"
    | "CHECK"
    | "NOT_NULL";
  readonly columns: string[];
  readonly references?: string;
  readonly condition?: string;
}

/**
 * Test data generation configuration
 */
export interface TestDataConfig {
  readonly generators: DataGenerator[];
  readonly relationships: DataRelationship[];
  readonly constraints: DataConstraint[];
  readonly volume: DataVolume;
}

/**
 * Data generator definition
 */
export interface DataGenerator {
  readonly name: string;
  readonly type: "FAKER" | "SEQUENCE" | "RANDOM" | "CUSTOM";
  readonly config: Record<string, any>;
  readonly output: DataGeneratorOutput;
}

/**
 * Data generator output configuration
 */
export interface DataGeneratorOutput {
  readonly table: string;
  readonly column: string;
  readonly format: string;
  readonly validation?: ParameterValidation;
}

/**
 * Data relationship for test generation
 */
export interface DataRelationship {
  readonly name: string;
  readonly parentTable: string;
  readonly childTable: string;
  readonly ratio: number; // children per parent
  readonly cascadeDelete: boolean;
}

/**
 * Data constraint for test generation
 */
export interface DataConstraint {
  readonly name: string;
  readonly table: string;
  readonly type: "UNIQUE" | "RANGE" | "PATTERN" | "CUSTOM";
  readonly config: Record<string, any>;
}

/**
 * Data volume configuration
 */
export interface DataVolume {
  readonly small: number; // ~100 records
  readonly medium: number; // ~1,000 records
  readonly large: number; // ~10,000 records
  readonly xlarge: number; // ~100,000 records
}

/**
 * Test runner configuration
 */
export interface TestRunnerConfig {
  readonly framework: "JEST" | "MOCHA" | "VITEST";
  readonly timeout: number;
  readonly retries: number;
  readonly bail: boolean;
  readonly verbose: boolean;
  readonly collectCoverage: boolean;
  readonly coverageThreshold: number;
}

/**
 * Utility type for test function signatures
 */
export type TestFunction<TArgs extends unknown[] = any[], TResult = any> = (
  ...args: TArgs
) => Promise<TResult> | TResult;

/**
 * Utility type for test assertions
 */
export type AssertionFunction<T = any> = (
  actual: T,
) => boolean | Promise<boolean>;

/**
 * Utility type for test mock functions
 */
export type MockFunction<
  TArgs extends unknown[] = any[],
  TResult = any,
> = TestFunction<TArgs, TResult> & {
  mockImplementation(fn: TestFunction<TArgs, TResult>): void;
  mockReturnValue(value: TResult): void;
  mockResolvedValue(value: TResult): void;
  mockRejectedValue(error: any): void;
  mockClear(): void;
  mockReset(): void;
};

/**
 * Utility type for partial test configuration
 */
export type PartialTestConfig<T> = {
  [P in keyof T]?: T[P] extends object ? PartialTestConfig<T[P]> : T[P];
};

/**
 * Test execution state
 */
export interface TestExecutionState {
  readonly isRunning: boolean;
  readonly currentTest?: string;
  readonly progress: number; // 0-100
  readonly estimatedTimeRemaining: number; // milliseconds
  readonly startTime: number;
  readonly elapsedTime: number;
}
