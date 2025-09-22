/**
 * Core type definitions for the Integration Testing Framework
 * Enterprise-grade TypeScript interfaces and types for comprehensive testing
 */

export interface TestConfiguration {
  /** Test environment configuration */
  environment: TestEnvironment;
  /** Database configuration for testing */
  database: DatabaseConfig;
  /** Service endpoints configuration */
  services: ServiceConfig[];
  /** Security configuration for testing */
  security: SecurityConfig;
  /** Performance testing thresholds */
  performance: PerformanceConfig;
  /** Test data management configuration */
  testData: TestDataConfig;
}

export interface TestEnvironment {
  /** Environment name (development, staging, production) */
  name: string;
  /** Base URL for API testing */
  baseUrl: string;
  /** Database connection string */
  databaseUrl: string;
  /** Service discovery configuration */
  services: Record<string, ServiceEndpoint>;
  /** Environment-specific variables */
  variables: Record<string, string>;
}

export interface DatabaseConfig {
  /** Database type (sqlite, postgresql) */
  type: 'sqlite' | 'postgresql';
  /** Connection configuration */
  connection: {
    host?: string;
    port?: number;
    database: string;
    username?: string;
    password?: string;
    ssl?: boolean;
  };
  /** Test database schema management */
  schema: {
    /** Whether to auto-migrate schema */
    autoMigrate: boolean;
    /** Whether to seed test data */
    seedData: boolean;
    /** Whether to clean up after tests */
    cleanup: boolean;
  };
}

export interface ServiceConfig {
  /** Service name */
  name: string;
  /** Service type (api, microservice, websocket) */
  type: 'api' | 'microservice' | 'websocket';
  /** Service endpoint configuration */
  endpoint: ServiceEndpoint;
  /** Health check configuration */
  healthCheck: HealthCheckConfig;
  /** Authentication requirements */
  authentication: AuthenticationConfig;
  /** Contract testing configuration */
  contracts: ContractConfig[];
}

export interface ServiceEndpoint {
  /** Service URL */
  url: string;
  /** Service port */
  port: number;
  /** Protocol (http, https, ws, wss) */
  protocol: 'http' | 'https' | 'ws' | 'wss';
  /** API version */
  version?: string;
  /** Base path for API endpoints */
  basePath?: string;
}

export interface HealthCheckConfig {
  /** Health check endpoint */
  endpoint: string;
  /** Expected response status */
  expectedStatus: number;
  /** Timeout for health check */
  timeout: number;
  /** Number of retries */
  retries: number;
  /** Interval between retries */
  retryInterval: number;
}

export interface AuthenticationConfig {
  /** Authentication type */
  type: 'jwt' | 'basic' | 'oauth' | 'none';
  /** Authentication credentials */
  credentials: {
    username?: string;
    password?: string;
    token?: string;
    clientId?: string;
    clientSecret?: string;
  };
  /** Token refresh configuration */
  refresh?: {
    enabled: boolean;
    endpoint: string;
    interval: number;
  };
}

export interface ContractConfig {
  /** Contract name */
  name: string;
  /** Contract specification file path */
  specPath: string;
  /** Provider service name */
  provider: string;
  /** Consumer service name */
  consumer: string;
  /** Contract verification settings */
  verification: {
    /** Provider verification URL */
    providerBaseUrl: string;
    /** Consumer verification settings */
    consumerSettings: Record<string, unknown>;
  };
}

export interface SecurityConfig {
  /** JWT secret for testing */
  jwtSecret: string;
  /** Test user credentials */
  testUsers: TestUser[];
  /** Security testing configuration */
  testing: {
    /** Enable penetration testing */
    penetrationTesting: boolean;
    /** Enable vulnerability scanning */
    vulnerabilityScanning: boolean;
    /** Enable authentication testing */
    authenticationTesting: boolean;
    /** Enable authorization testing */
    authorizationTesting: boolean;
  };
}

export interface TestUser {
  /** User identifier */
  id: string;
  /** Username */
  username: string;
  /** User email */
  email: string;
  /** User password */
  password: string;
  /** User roles */
  roles: string[];
  /** User permissions */
  permissions: string[];
  /** JWT token for testing */
  token?: string;
}

export interface PerformanceConfig {
  /** Load testing configuration */
  loadTesting: {
    /** Number of concurrent users */
    concurrentUsers: number;
    /** Test duration in seconds */
    duration: number;
    /** Ramp-up time in seconds */
    rampUpTime: number;
    /** Request rate per second */
    requestRate: number;
  };
  /** Performance thresholds */
  thresholds: {
    /** Maximum response time in milliseconds */
    maxResponseTime: number;
    /** Minimum throughput (requests per second) */
    minThroughput: number;
    /** Maximum error rate percentage */
    maxErrorRate: number;
    /** Maximum memory usage in MB */
    maxMemoryUsage: number;
    /** Maximum CPU usage percentage */
    maxCpuUsage: number;
  };
  /** Benchmark configuration */
  benchmarks: {
    /** Baseline performance metrics */
    baseline: PerformanceMetrics;
    /** Performance regression tolerance */
    regressionTolerance: number;
  };
}

export interface PerformanceMetrics {
  /** Response time statistics */
  responseTime: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  /** Throughput metrics */
  throughput: {
    requestsPerSecond: number;
    bytesPerSecond: number;
  };
  /** Error metrics */
  errors: {
    total: number;
    rate: number;
    types: Record<string, number>;
  };
  /** Resource usage metrics */
  resources: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export interface TestDataConfig {
  /** Test data generation strategy */
  generation: {
    /** Strategy type (static, dynamic, hybrid) */
    strategy: 'static' | 'dynamic' | 'hybrid';
    /** Data generation seed for reproducibility */
    seed: number;
    /** Number of records to generate */
    recordCount: number;
  };
  /** Test data fixtures */
  fixtures: {
    /** Directory containing static fixtures */
    directory: string;
    /** Fixture file format (json, yaml, sql) */
    format: 'json' | 'yaml' | 'sql';
    /** Whether to load fixtures automatically */
    autoLoad: boolean;
  };
  /** Test data cleanup configuration */
  cleanup: {
    /** Whether to clean up test data after tests */
    enabled: boolean;
    /** Cleanup strategy (truncate, delete, recreate) */
    strategy: 'truncate' | 'delete' | 'recreate';
    /** Tables/collections to preserve */
    preserve: string[];
  };
}

export interface TestSuite {
  /** Test suite name */
  name: string;
  /** Test suite description */
  description: string;
  /** Test suite configuration */
  configuration: TestConfiguration;
  /** Test cases in the suite */
  testCases: TestCase[];
  /** Setup hooks */
  setup: TestHook[];
  /** Teardown hooks */
  teardown: TestHook[];
  /** Test suite metadata */
  metadata: TestSuiteMetadata;
}

export interface TestCase {
  /** Test case ID */
  id: string;
  /** Test case name */
  name: string;
  /** Test case description */
  description: string;
  /** Test case type */
  type: TestCaseType;
  /** Test case priority */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Test case tags */
  tags: string[];
  /** Test case steps */
  steps: TestStep[];
  /** Expected result */
  expectedResult: TestResult;
  /** Test case timeout */
  timeout: number;
  /** Test case retry configuration */
  retry: {
    enabled: boolean;
    maxAttempts: number;
    backoffMultiplier: number;
  };
}

export type TestCaseType =
  | 'unit'
  | 'integration'
  | 'e2e'
  | 'api'
  | 'database'
  | 'security'
  | 'performance'
  | 'contract'
  | 'smoke'
  | 'regression';

export interface TestStep {
  /** Step ID */
  id: string;
  /** Step name */
  name: string;
  /** Step description */
  description: string;
  /** Step action */
  action: TestAction;
  /** Step data */
  data: Record<string, unknown>;
  /** Expected step result */
  expectedResult: StepResult;
  /** Step dependencies */
  dependencies: string[];
}

export interface TestAction {
  /** Action type */
  type: ActionType;
  /** Target endpoint or service */
  target: string;
  /** HTTP method for API actions */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Request headers */
  headers?: Record<string, string>;
  /** Request payload */
  payload?: Record<string, unknown>;
  /** Query parameters */
  queryParams?: Record<string, string>;
  /** Database query for DB actions */
  query?: string;
  /** WebSocket message for WS actions */
  message?: Record<string, unknown>;
}

export type ActionType =
  | 'http_request'
  | 'database_query'
  | 'websocket_message'
  | 'authentication'
  | 'wait'
  | 'assertion'
  | 'data_setup'
  | 'data_cleanup';

export interface StepResult {
  /** Expected status code */
  statusCode?: number;
  /** Expected response body */
  responseBody?: Record<string, unknown>;
  /** Expected response headers */
  responseHeaders?: Record<string, string>;
  /** Expected database state */
  databaseState?: Record<string, unknown>;
  /** Custom assertions */
  assertions?: Assertion[];
}

export interface Assertion {
  /** Assertion type */
  type: 'equals' | 'contains' | 'matches' | 'exists' | 'greater_than' | 'less_than';
  /** Target field or path */
  target: string;
  /** Expected value */
  expected: unknown;
  /** Optional assertion message */
  message?: string;
}

export interface TestResult {
  /** Test case ID */
  testCaseId: string;
  /** Test execution status */
  status: TestStatus;
  /** Test start time */
  startTime: Date;
  /** Test end time */
  endTime: Date;
  /** Test duration in milliseconds */
  duration: number;
  /** Test step results */
  stepResults: StepResult[];
  /** Test error information */
  error?: TestError;
  /** Performance metrics for the test */
  performance?: PerformanceMetrics;
  /** Test artifacts (screenshots, logs, etc.) */
  artifacts: TestArtifact[];
}

export type TestStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'timeout'
  | 'error';

export interface TestError {
  /** Error type */
  type: string;
  /** Error message */
  message: string;
  /** Error stack trace */
  stack?: string;
  /** Step where error occurred */
  step?: string;
  /** Additional error context */
  context?: Record<string, unknown>;
}

export interface TestArtifact {
  /** Artifact type */
  type: 'screenshot' | 'log' | 'report' | 'video' | 'trace';
  /** Artifact name */
  name: string;
  /** Artifact file path */
  path: string;
  /** Artifact size in bytes */
  size: number;
  /** Artifact creation time */
  createdAt: Date;
}

export interface TestHook {
  /** Hook name */
  name: string;
  /** Hook type */
  type: 'before_all' | 'after_all' | 'before_each' | 'after_each';
  /** Hook function */
  action: TestAction;
  /** Hook timeout */
  timeout: number;
}

export interface TestSuiteMetadata {
  /** Test suite author */
  author: string;
  /** Creation date */
  createdAt: Date;
  /** Last modification date */
  updatedAt: Date;
  /** Test suite version */
  version: string;
  /** Test suite tags */
  tags: string[];
  /** Associated requirements */
  requirements: string[];
}

export interface TestGenerationConfig {
  /** API specification source */
  apiSpec: {
    /** Specification format (openapi, swagger, raml) */
    format: 'openapi' | 'swagger' | 'raml';
    /** Specification file path */
    path: string;
    /** API version */
    version: string;
  };
  /** Test generation strategy */
  strategy: {
    /** Coverage strategy (full, selective, critical) */
    coverage: 'full' | 'selective' | 'critical';
    /** Test case priority distribution */
    priorityDistribution: Record<string, number>;
    /** Include negative test cases */
    includeNegativeTests: boolean;
    /** Include edge case tests */
    includeEdgeCases: boolean;
  };
  /** Generated test customization */
  customization: {
    /** Custom test templates */
    templates: string[];
    /** Custom assertion generators */
    assertionGenerators: string[];
    /** Custom data generators */
    dataGenerators: string[];
  };
}

export interface ContractTestConfig {
  /** Pact broker configuration */
  pactBroker: {
    /** Broker URL */
    url: string;
    /** Authentication token */
    token?: string;
    /** Participant name */
    participant: string;
  };
  /** Contract specifications */
  contracts: Contract[];
  /** Verification settings */
  verification: {
    /** Provider verification timeout */
    timeout: number;
    /** Provider state setup */
    providerStates: ProviderState[];
  };
}

export interface Contract {
  /** Consumer service name */
  consumer: string;
  /** Provider service name */
  provider: string;
  /** Contract specification */
  specification: {
    /** Pact file path */
    pactFile: string;
    /** Contract version */
    version: string;
    /** Contract interactions */
    interactions: ContractInteraction[];
  };
}

export interface ContractInteraction {
  /** Interaction description */
  description: string;
  /** Provider state */
  providerState?: string;
  /** Request specification */
  request: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  };
  /** Response specification */
  response: {
    status: number;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  };
}

export interface ProviderState {
  /** State name */
  name: string;
  /** State setup action */
  setup: TestAction;
  /** State teardown action */
  teardown?: TestAction;
}

export interface TestReportConfig {
  /** Report format */
  format: 'html' | 'json' | 'xml' | 'junit' | 'allure';
  /** Output directory */
  outputDir: string;
  /** Report title */
  title: string;
  /** Include performance metrics */
  includePerformance: boolean;
  /** Include security scan results */
  includeSecurity: boolean;
  /** Include test artifacts */
  includeArtifacts: boolean;
  /** Report customization options */
  customization: {
    /** Custom CSS styles */
    styles?: string;
    /** Custom JavaScript */
    scripts?: string;
    /** Custom report templates */
    templates?: string[];
  };
}

export interface TestExecutionConfig {
  /** Parallel execution settings */
  parallel: {
    /** Enable parallel execution */
    enabled: boolean;
    /** Number of parallel workers */
    workers: number;
    /** Worker allocation strategy */
    strategy: 'test_suite' | 'test_case' | 'balanced';
  };
  /** Test isolation settings */
  isolation: {
    /** Database isolation level */
    database: 'none' | 'transaction' | 'truncate' | 'recreate';
    /** Service isolation */
    services: boolean;
    /** File system isolation */
    filesystem: boolean;
  };
  /** Retry configuration */
  retry: {
    /** Global retry settings */
    global: {
      enabled: boolean;
      maxAttempts: number;
      backoffMultiplier: number;
    };
    /** Test-specific retry overrides */
    testSpecific: Record<string, { maxAttempts: number; backoffMultiplier: number }>;
  };
}