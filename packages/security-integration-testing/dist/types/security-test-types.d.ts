/**
 * Security Test Types and Interfaces
 *
 * Comprehensive type definitions for the security integration testing framework
 * including test suites, cases, results, and validation structures.
 *
 * @author Bytebot Security Team
 * @version 1.0.0
 */
/**
 * Security test severity levels
 */
export declare enum SecurityTestSeverity {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low",
    INFO = "info"
}
/**
 * Security test categories
 */
export declare enum SecurityTestCategory {
    AUTHENTICATION = "authentication",
    AUTHORIZATION = "authorization",
    INPUT_VALIDATION = "input_validation",
    ENCRYPTION = "encryption",
    SESSION_MANAGEMENT = "session_management",
    ERROR_HANDLING = "error_handling",
    LOGGING_MONITORING = "logging_monitoring",
    NETWORK_SECURITY = "network_security",
    API_SECURITY = "api_security",
    DATA_PROTECTION = "data_protection",
    COMPLIANCE = "compliance",
    INFRASTRUCTURE = "infrastructure"
}
/**
 * Security test status
 */
export declare enum SecurityTestStatus {
    PENDING = "pending",
    RUNNING = "running",
    PASSED = "passed",
    FAILED = "failed",
    SKIPPED = "skipped",
    ERROR = "error"
}
/**
 * Security vulnerability information
 */
export interface SecurityVulnerability {
    id: string;
    type: string;
    severity: SecurityTestSeverity;
    description: string;
    location: string;
    cveId?: string;
    cweId?: string;
    recommendation: string;
    evidence: any[];
    exploitability: number;
    impact: number;
    timestamp: Date;
}
/**
 * Security test case definition
 */
export interface SecurityTestCase {
    id: string;
    name: string;
    description: string;
    category: SecurityTestCategory;
    severity: SecurityTestSeverity;
    tags: string[];
    preconditions: string[];
    steps: SecurityTestStep[];
    expectedResult: string;
    timeout: number;
    retries: number;
    dependencies: string[];
    metadata: Record<string, any>;
}
/**
 * Security test step
 */
export interface SecurityTestStep {
    id: string;
    action: string;
    parameters: Record<string, any>;
    expectedOutcome: string;
    validations: SecurityValidation[];
    timeout: number;
}
/**
 * Security validation rule
 */
export interface SecurityValidation {
    type: 'response_code' | 'response_body' | 'headers' | 'cookies' | 'timing' | 'custom';
    rule: string;
    expected: any;
    operator: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than' | 'exists';
    message: string;
}
/**
 * Security test result
 */
export interface SecurityTestResult {
    testCaseId: string;
    status: SecurityTestStatus;
    startTime: Date;
    endTime: Date;
    duration: number;
    passed: boolean;
    vulnerabilities: SecurityVulnerability[];
    stepResults: SecurityTestStepResult[];
    logs: SecurityTestLog[];
    metrics: SecurityTestMetrics;
    evidence: SecurityTestEvidence[];
    error?: Error;
}
/**
 * Security test step result
 */
export interface SecurityTestStepResult {
    stepId: string;
    status: SecurityTestStatus;
    startTime: Date;
    endTime: Date;
    duration: number;
    validationResults: SecurityValidationResult[];
    actualOutcome: any;
    error?: Error;
}
/**
 * Security validation result
 */
export interface SecurityValidationResult {
    validationType: string;
    passed: boolean;
    expected: any;
    actual: any;
    message: string;
    severity: SecurityTestSeverity;
}
/**
 * Security test log entry
 */
export interface SecurityTestLog {
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    data?: any;
    component: string;
}
/**
 * Security test metrics
 */
export interface SecurityTestMetrics {
    executionTime: number;
    memoryUsage: number;
    networkCalls: number;
    databaseQueries: number;
    vulnerabilitiesFound: number;
    securityScore: number;
    complianceScore: number;
}
/**
 * Security test evidence
 */
export interface SecurityTestEvidence {
    type: 'screenshot' | 'network_trace' | 'response_data' | 'log_entry' | 'file';
    timestamp: Date;
    data: any;
    description: string;
    metadata: Record<string, any>;
}
/**
 * Security test suite
 */
export interface SecurityTestSuite {
    id: string;
    name: string;
    description: string;
    category: SecurityTestCategory;
    testCases: SecurityTestCase[];
    setupScripts: string[];
    teardownScripts: string[];
    environment: string;
    configuration: Record<string, any>;
    metadata: Record<string, any>;
}
/**
 * Security test report
 */
export interface SecurityTestReport {
    id: string;
    timestamp: Date;
    environment: string;
    suiteResults: SecurityTestSuiteResult[];
    summary: SecurityTestSummary;
    vulnerabilities: SecurityVulnerability[];
    compliance: SecurityComplianceResult;
    performance: SecurityPerformanceMetrics;
    recommendations: SecurityRecommendation[];
    metadata: Record<string, any>;
}
/**
 * Security test suite result
 */
export interface SecurityTestSuiteResult {
    suiteId: string;
    suiteName: string;
    status: SecurityTestStatus;
    startTime: Date;
    endTime: Date;
    duration: number;
    testResults: SecurityTestResult[];
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
}
/**
 * Security test summary
 */
export interface SecurityTestSummary {
    totalTests: number;
    totalSuites: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    passRate: number;
    totalVulnerabilities: number;
    criticalVulnerabilities: number;
    highVulnerabilities: number;
    mediumVulnerabilities: number;
    lowVulnerabilities: number;
    overallSecurityScore: number;
    complianceScore: number;
    executionTime: number;
}
/**
 * Security compliance result
 */
export interface SecurityComplianceResult {
    framework: string;
    version: string;
    score: number;
    passed: number;
    failed: number;
    total: number;
    requirements: SecurityComplianceRequirement[];
    timestamp: Date;
}
/**
 * Security compliance requirement
 */
export interface SecurityComplianceRequirement {
    id: string;
    name: string;
    description: string;
    category: string;
    status: 'compliant' | 'non_compliant' | 'not_applicable';
    evidence: string[];
    recommendations: string[];
}
/**
 * Security performance metrics
 */
export interface SecurityPerformanceMetrics {
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    throughput: number;
    errorRate: number;
    securityOverhead: number;
    resourceUtilization: ResourceUtilization;
}
/**
 * Resource utilization metrics
 */
export interface ResourceUtilization {
    cpu: number;
    memory: number;
    network: number;
    disk: number;
}
/**
 * Security recommendation
 */
export interface SecurityRecommendation {
    id: string;
    title: string;
    description: string;
    priority: SecurityTestSeverity;
    category: SecurityTestCategory;
    impact: string;
    effort: 'low' | 'medium' | 'high';
    implementation: string[];
    references: string[];
}
/**
 * Security test configuration
 */
export interface SecurityTestConfiguration {
    environment: SecurityEnvironmentConfig;
    authentication: SecurityAuthConfig;
    network: SecurityNetworkConfig;
    data: SecurityDataConfig;
    reporting: SecurityReportingConfig;
    compliance: SecurityComplianceConfig;
}
/**
 * Security environment configuration
 */
export interface SecurityEnvironmentConfig {
    baseUrl: string;
    apiEndpoints: Record<string, string>;
    testDataPath: string;
    outputPath: string;
    browser: 'chromium' | 'firefox' | 'webkit';
    headless: boolean;
    timeout: number;
    retries: number;
}
/**
 * Security authentication configuration
 */
export interface SecurityAuthConfig {
    type: 'jwt' | 'oauth2' | 'basic' | 'api_key' | 'custom';
    credentials: Record<string, string>;
    endpoints: {
        login: string;
        logout: string;
        refresh: string;
    };
    tokenStorage: 'memory' | 'file' | 'database';
    expiryHandling: boolean;
}
/**
 * Security network configuration
 */
export interface SecurityNetworkConfig {
    proxy?: string;
    ssl: {
        verify: boolean;
        certificates?: string[];
    };
    rateLimit: {
        enabled: boolean;
        requests: number;
        window: number;
    };
    retries: {
        enabled: boolean;
        maxAttempts: number;
        backoff: 'linear' | 'exponential';
    };
}
/**
 * Security data configuration
 */
export interface SecurityDataConfig {
    synthetic: {
        enabled: boolean;
        profiles: string[];
    };
    masking: {
        enabled: boolean;
        rules: Record<string, string>;
    };
    cleanup: {
        enabled: boolean;
        retention: number;
    };
}
/**
 * Security reporting configuration
 */
export interface SecurityReportingConfig {
    formats: ('json' | 'html' | 'pdf' | 'xml')[];
    destinations: string[];
    realtime: boolean;
    screenshots: boolean;
    networkLogs: boolean;
    performanceMetrics: boolean;
}
/**
 * Security compliance configuration
 */
export interface SecurityComplianceConfig {
    frameworks: ('OWASP' | 'NIST' | 'ISO27001' | 'SOC2' | 'PCI_DSS')[];
    customRules: SecurityComplianceRule[];
    reporting: {
        enabled: boolean;
        format: 'json' | 'xml' | 'html';
        destination: string;
    };
}
/**
 * Security compliance rule
 */
export interface SecurityComplianceRule {
    id: string;
    name: string;
    description: string;
    category: string;
    severity: SecurityTestSeverity;
    implementation: string;
    validation: string;
    documentation: string;
}
/**
 * Security test context
 */
export interface SecurityTestContext {
    environment: string;
    user?: any;
    session?: any;
    configuration: SecurityTestConfiguration;
    state: Record<string, any>;
    metadata: Record<string, any>;
}
/**
 * Security test execution options
 */
export interface SecurityTestExecutionOptions {
    parallel: boolean;
    maxConcurrency: number;
    failFast: boolean;
    continueOnError: boolean;
    retryFailures: boolean;
    generateReport: boolean;
    captureEvidence: boolean;
    validateCompliance: boolean;
}
//# sourceMappingURL=security-test-types.d.ts.map