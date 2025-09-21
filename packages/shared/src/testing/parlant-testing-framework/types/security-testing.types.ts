/**
 * Security Testing Framework Type Definitions
 *
 * Comprehensive type definitions for enterprise-grade security testing framework
 * supporting authentication, authorization, data protection, and vulnerability scanning.
 *
 * Features:
 * - Authentication testing with multi-factor support
 * - Authorization testing with RBAC and ABAC models
 * - Data protection and encryption validation
 * - Vulnerability scanning and threat modeling
 * - OWASP compliance and security benchmarking
 * - Real-time security monitoring and alerting
 *
 * @module SecurityTestingTypes
 * @version 1.0.0
 * @author AIgent Testing Framework
 */

import { DatabaseFunction } from './framework.types';

// ============================================================================
// Core Security Testing Types
// ============================================================================

/**
 * Security test categories for comprehensive security validation
 */
export enum SecurityTestCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_PROTECTION = 'data_protection',
  INPUT_VALIDATION = 'input_validation',
  SESSION_MANAGEMENT = 'session_management',
  CRYPTOGRAPHY = 'cryptography',
  VULNERABILITY_SCANNING = 'vulnerability_scanning',
  THREAT_MODELING = 'threat_modeling',
  COMPLIANCE = 'compliance',
  PENETRATION_TESTING = 'penetration_testing'
}

/**
 * Security threat levels for risk assessment
 */
export enum SecurityThreatLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

/**
 * Security compliance frameworks
 */
export enum ComplianceFramework {
  OWASP_TOP_10 = 'owasp_top_10',
  NIST_CYBERSECURITY = 'nist_cybersecurity',
  ISO_27001 = 'iso_27001',
  SOC_2 = 'soc_2',
  GDPR = 'gdpr',
  HIPAA = 'hipaa',
  PCI_DSS = 'pci_dss'
}

/**
 * Authentication mechanisms for testing
 */
export enum AuthenticationMechanism {
  PASSWORD = 'password',
  MULTI_FACTOR = 'multi_factor',
  BIOMETRIC = 'biometric',
  TOKEN_BASED = 'token_based',
  CERTIFICATE = 'certificate',
  OAUTH = 'oauth',
  SAML = 'saml',
  LDAP = 'ldap'
}

/**
 * Authorization models for testing
 */
export enum AuthorizationModel {
  RBAC = 'rbac', // Role-Based Access Control
  ABAC = 'abac', // Attribute-Based Access Control
  DAC = 'dac',   // Discretionary Access Control
  MAC = 'mac'    // Mandatory Access Control
}

// ============================================================================
// Security Test Configuration
// ============================================================================

/**
 * Configuration for security test execution
 */
export interface SecurityTestConfig {
  /** Test categories to execute */
  categories: SecurityTestCategory[];

  /** Compliance frameworks to validate against */
  complianceFrameworks: ComplianceFramework[];

  /** Authentication mechanisms to test */
  authenticationMechanisms: AuthenticationMechanism[];

  /** Authorization models to validate */
  authorizationModels: AuthorizationModel[];

  /** Maximum acceptable threat level */
  maxAcceptableThreatLevel: SecurityThreatLevel;

  /** Enable vulnerability scanning */
  enableVulnerabilityScanning: boolean;

  /** Enable penetration testing */
  enablePenetrationTesting: boolean;

  /** Test execution timeout in milliseconds */
  executionTimeoutMs: number;

  /** Parallel execution settings */
  parallelExecution: {
    enabled: boolean;
    maxConcurrentTests: number;
    maxWorkers: number;
  };

  /** Security test data configuration */
  testData: {
    useRealData: boolean;
    anonymizeData: boolean;
    dataRetentionPolicy: 'delete_after_test' | 'archive' | 'retain';
  };

  /** Reporting configuration */
  reporting: {
    generateDetailedReports: boolean;
    includeRemediation: boolean;
    exportFormats: ('json' | 'xml' | 'pdf' | 'html')[];
  };
}

// ============================================================================
// Authentication Testing Types
// ============================================================================

/**
 * Authentication test scenarios
 */
export interface AuthenticationTestScenario {
  /** Scenario identifier */
  id: string;

  /** Scenario name */
  name: string;

  /** Authentication mechanism being tested */
  mechanism: AuthenticationMechanism;

  /** Test cases for this scenario */
  testCases: AuthenticationTestCase[];

  /** Expected security outcomes */
  expectedOutcomes: AuthenticationExpectedOutcome[];
}

/**
 * Individual authentication test case
 */
export interface AuthenticationTestCase {
  /** Test case identifier */
  id: string;

  /** Test case description */
  description: string;

  /** Test input data */
  input: {
    credentials: Record<string, any>;
    context: Record<string, any>;
  };

  /** Expected result */
  expectedResult: 'success' | 'failure' | 'error';

  /** Security assertions to validate */
  securityAssertions: SecurityAssertion[];
}

/**
 * Expected authentication outcomes for validation
 */
export interface AuthenticationExpectedOutcome {
  /** Outcome type */
  type: 'credential_validation' | 'session_creation' | 'audit_logging' | 'rate_limiting';

  /** Expected behavior */
  expectedBehavior: string;

  /** Validation criteria */
  validationCriteria: ValidationCriteria[];
}

// ============================================================================
// Authorization Testing Types
// ============================================================================

/**
 * Authorization test scenarios
 */
export interface AuthorizationTestScenario {
  /** Scenario identifier */
  id: string;

  /** Scenario name */
  name: string;

  /** Authorization model being tested */
  model: AuthorizationModel;

  /** Resource access patterns to test */
  resourceAccessPatterns: ResourceAccessPattern[];

  /** Permission matrices for validation */
  permissionMatrices: PermissionMatrix[];
}

/**
 * Resource access patterns for authorization testing
 */
export interface ResourceAccessPattern {
  /** Pattern identifier */
  id: string;

  /** Resource type */
  resourceType: string;

  /** Access operations to test */
  operations: ('create' | 'read' | 'update' | 'delete' | 'execute')[];

  /** User roles and permissions */
  userRolePermissions: UserRolePermission[];

  /** Access control policies */
  accessControlPolicies: AccessControlPolicy[];
}

/**
 * User role permissions for testing
 */
export interface UserRolePermission {
  /** User identifier */
  userId: string;

  /** User roles */
  roles: string[];

  /** User attributes */
  attributes: Record<string, any>;

  /** Expected access results */
  expectedAccess: Record<string, boolean>;
}

/**
 * Access control policies
 */
export interface AccessControlPolicy {
  /** Policy identifier */
  id: string;

  /** Policy name */
  name: string;

  /** Policy rules */
  rules: PolicyRule[];

  /** Policy evaluation logic */
  evaluationLogic: 'allow_by_default' | 'deny_by_default';
}

/**
 * Individual policy rules
 */
export interface PolicyRule {
  /** Rule identifier */
  id: string;

  /** Rule condition */
  condition: string;

  /** Rule action */
  action: 'allow' | 'deny';

  /** Rule priority */
  priority: number;
}

/**
 * Permission matrix for complex authorization scenarios
 */
export interface PermissionMatrix {
  /** Matrix identifier */
  id: string;

  /** Resource types */
  resourceTypes: string[];

  /** User roles */
  userRoles: string[];

  /** Operations */
  operations: string[];

  /** Permission mappings */
  permissions: PermissionMapping[][][]; // [resourceType][userRole][operation]
}

/**
 * Individual permission mapping
 */
export interface PermissionMapping {
  /** Whether permission is granted */
  granted: boolean;

  /** Conditions for permission */
  conditions?: Record<string, any>;

  /** Reason for permission decision */
  reason?: string;
}

// ============================================================================
// Data Protection Testing Types
// ============================================================================

/**
 * Data protection test scenarios
 */
export interface DataProtectionTestScenario {
  /** Scenario identifier */
  id: string;

  /** Scenario name */
  name: string;

  /** Data classification levels to test */
  dataClassifications: DataClassification[];

  /** Encryption requirements */
  encryptionRequirements: EncryptionRequirement[];

  /** Data privacy policies */
  privacyPolicies: DataPrivacyPolicy[];
}

/**
 * Data classification for protection testing
 */
export interface DataClassification {
  /** Classification level */
  level: 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';

  /** Data types in this classification */
  dataTypes: string[];

  /** Protection requirements */
  protectionRequirements: DataProtectionRequirement[];

  /** Compliance requirements */
  complianceRequirements: ComplianceRequirement[];
}

/**
 * Data protection requirements
 */
export interface DataProtectionRequirement {
  /** Requirement type */
  type: 'encryption' | 'masking' | 'anonymization' | 'pseudonymization' | 'deletion';

  /** Implementation details */
  implementation: Record<string, any>;

  /** Validation criteria */
  validationCriteria: ValidationCriteria[];
}

/**
 * Encryption requirements for testing
 */
export interface EncryptionRequirement {
  /** Encryption scope */
  scope: 'data_at_rest' | 'data_in_transit' | 'data_in_use';

  /** Encryption algorithms */
  algorithms: string[];

  /** Key management requirements */
  keyManagement: KeyManagementRequirement;

  /** Performance requirements */
  performanceRequirements: {
    maxEncryptionOverhead: number;
    maxDecryptionTime: number;
  };
}

/**
 * Key management requirements
 */
export interface KeyManagementRequirement {
  /** Key generation requirements */
  keyGeneration: {
    algorithm: string;
    keySize: number;
    randomnessSource: string;
  };

  /** Key storage requirements */
  keyStorage: {
    location: 'hsm' | 'kms' | 'secure_enclave' | 'software';
    accessControls: string[];
  };

  /** Key rotation requirements */
  keyRotation: {
    frequency: string;
    automaticRotation: boolean;
  };

  /** Key recovery requirements */
  keyRecovery: {
    escrowRequired: boolean;
    recoveryMechanisms: string[];
  };
}

/**
 * Data privacy policies for testing
 */
export interface DataPrivacyPolicy {
  /** Policy identifier */
  id: string;

  /** Policy name */
  name: string;

  /** Applicable regulations */
  regulations: ComplianceFramework[];

  /** Data subject rights */
  dataSubjectRights: DataSubjectRight[];

  /** Data processing purposes */
  processingPurposes: string[];

  /** Data retention policies */
  retentionPolicies: DataRetentionPolicy[];
}

/**
 * Data subject rights for privacy testing
 */
export interface DataSubjectRight {
  /** Right type */
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'objection';

  /** Implementation requirements */
  implementation: string[];

  /** Response time requirements */
  responseTimeRequirements: {
    acknowledgment: string;
    completion: string;
  };
}

/**
 * Data retention policies
 */
export interface DataRetentionPolicy {
  /** Data category */
  dataCategory: string;

  /** Retention period */
  retentionPeriod: string;

  /** Deletion requirements */
  deletionRequirements: {
    method: 'logical' | 'physical' | 'cryptographic';
    verification: boolean;
  };
}

// ============================================================================
// Vulnerability Scanning Types
// ============================================================================

/**
 * Vulnerability scanning configuration
 */
export interface VulnerabilityScanConfig {
  /** Scan types to perform */
  scanTypes: VulnerabilityScanType[];

  /** Scan targets */
  targets: ScanTarget[];

  /** Scan depth and intensity */
  scanDepth: 'surface' | 'intermediate' | 'deep';

  /** Vulnerability databases to check against */
  vulnerabilityDatabases: string[];

  /** Custom vulnerability rules */
  customRules: VulnerabilityRule[];
}

/**
 * Types of vulnerability scans
 */
export enum VulnerabilityScanType {
  STATIC_CODE_ANALYSIS = 'static_code_analysis',
  DYNAMIC_ANALYSIS = 'dynamic_analysis',
  DEPENDENCY_SCANNING = 'dependency_scanning',
  CONTAINER_SCANNING = 'container_scanning',
  INFRASTRUCTURE_SCANNING = 'infrastructure_scanning',
  WEB_APPLICATION_SCANNING = 'web_application_scanning'
}

/**
 * Scan targets for vulnerability testing
 */
export interface ScanTarget {
  /** Target identifier */
  id: string;

  /** Target type */
  type: 'database_function' | 'api_endpoint' | 'web_interface' | 'infrastructure';

  /** Target location/address */
  location: string;

  /** Scan parameters */
  scanParameters: Record<string, any>;
}

/**
 * Custom vulnerability rules
 */
export interface VulnerabilityRule {
  /** Rule identifier */
  id: string;

  /** Rule name */
  name: string;

  /** Rule description */
  description: string;

  /** Detection pattern */
  detectionPattern: string;

  /** Severity level */
  severity: SecurityThreatLevel;

  /** Remediation guidance */
  remediation: string;
}

/**
 * Vulnerability scan results
 */
export interface VulnerabilityScanResult {
  /** Scan identifier */
  scanId: string;

  /** Scan timestamp */
  timestamp: Date;

  /** Scan duration */
  duration: number;

  /** Scan status */
  status: 'completed' | 'failed' | 'partial';

  /** Discovered vulnerabilities */
  vulnerabilities: Vulnerability[];

  /** Scan statistics */
  statistics: VulnerabilityScanStatistics;
}

/**
 * Individual vulnerability finding
 */
export interface Vulnerability {
  /** Vulnerability identifier */
  id: string;

  /** Vulnerability name */
  name: string;

  /** Vulnerability description */
  description: string;

  /** Severity level */
  severity: SecurityThreatLevel;

  /** CVE identifier if applicable */
  cveId?: string;

  /** CVSS score */
  cvssScore?: number;

  /** Affected components */
  affectedComponents: string[];

  /** Vulnerability location */
  location: {
    file?: string;
    line?: number;
    function?: string;
    url?: string;
  };

  /** Remediation recommendations */
  remediation: {
    priority: 'immediate' | 'high' | 'medium' | 'low';
    steps: string[];
    estimatedEffort: string;
  };

  /** Evidence and proof of concept */
  evidence: {
    description: string;
    proofOfConcept?: string;
    references: string[];
  };
}

/**
 * Vulnerability scan statistics
 */
export interface VulnerabilityScanStatistics {
  /** Total vulnerabilities found */
  totalVulnerabilities: number;

  /** Vulnerabilities by severity */
  vulnerabilitiesBySeverity: Record<SecurityThreatLevel, number>;

  /** Vulnerabilities by type */
  vulnerabilitiesByType: Record<string, number>;

  /** Scan coverage statistics */
  coverage: {
    targetsScanned: number;
    totalTargets: number;
    coveragePercentage: number;
  };

  /** Performance statistics */
  performance: {
    scanRate: number; // targets per minute
    averageTimePerTarget: number;
  };
}

// ============================================================================
// Security Test Results and Reporting
// ============================================================================

/**
 * Comprehensive security test results
 */
export interface SecurityTestResult {
  /** Test identifier for compatibility */
  testId: string;

  /** Function name being tested */
  functionName: string;

  /** Security profile used for testing */
  securityProfile: SecurityProfile;

  /** Test start time */
  startTime: number;

  /** Test end time */
  endTime: number;

  /** Total test duration */
  totalDuration: number;

  /** Tests executed count */
  testsExecuted: number;

  /** Tests passed count */
  testsPassed: number;

  /** Tests failed count */
  testsFailed: number;

  /** Discovered vulnerabilities */
  vulnerabilities: SecurityVulnerability[];

  /** Overall security score */
  securityScore: number; // 0-100

  /** Risk assessment */
  riskAssessment: RiskAssessment;

  /** Security recommendations */
  recommendations: SecurityRecommendation[];

  /** Test execution identifier */
  executionId: string;

  /** Test execution timestamp */
  timestamp: Date;

  /** Test execution duration */
  duration: number;

  /** Overall security status */
  overallStatus: 'secure' | 'at_risk' | 'vulnerable' | 'critical';

  /** Test results by category */
  categoryResults: Record<SecurityTestCategory, SecurityCategoryResult>;

  /** Compliance assessment */
  complianceAssessment: ComplianceAssessment;

  /** Executive summary */
  executiveSummary: SecurityExecutiveSummary;

  /** Detailed findings */
  detailedFindings: SecurityFinding[];

  /** Remediation roadmap */
  remediationRoadmap: RemediationRoadmap;
}

/**
 * Security test results for specific category
 */
export interface SecurityCategoryResult {
  /** Category name */
  category: SecurityTestCategory;

  /** Category test status */
  status: 'passed' | 'failed' | 'warning' | 'error';

  /** Category score */
  score: number; // 0-100

  /** Tests executed in this category */
  testsExecuted: number;

  /** Tests passed */
  testsPassed: number;

  /** Tests failed */
  testsFailed: number;

  /** Category-specific findings */
  findings: SecurityFinding[];

  /** Performance metrics */
  performanceMetrics: {
    executionTime: number;
    averageTestTime: number;
  };
}

/**
 * Individual security finding
 */
export interface SecurityFinding {
  /** Finding identifier */
  id: string;

  /** Finding title */
  title: string;

  /** Finding description */
  description: string;

  /** Security category */
  category: SecurityTestCategory;

  /** Threat level */
  threatLevel: SecurityThreatLevel;

  /** Risk score */
  riskScore: number; // 0-100

  /** Affected functions */
  affectedFunctions: string[];

  /** Evidence */
  evidence: {
    testCase: string;
    actualResult: unknown;
    expectedResult: unknown;
    additionalData?: Record<string, unknown>;
  };

  /** Impact assessment */
  impact: {
    confidentiality: 'none' | 'low' | 'medium' | 'high';
    integrity: 'none' | 'low' | 'medium' | 'high';
    availability: 'none' | 'low' | 'medium' | 'high';
    businessImpact: string;
  };

  /** Remediation guidance */
  remediation: {
    shortTerm: string[];
    longTerm: string[];
    preventiveMeasures: string[];
    estimatedCost: string;
    estimatedTimeline: string;
  };
}

/**
 * Compliance assessment results
 */
export interface ComplianceAssessment {
  /** Overall compliance status */
  overallStatus: 'compliant' | 'non_compliant' | 'partially_compliant';

  /** Compliance by framework */
  frameworkCompliance: Record<ComplianceFramework, FrameworkComplianceResult>;

  /** Compliance score */
  complianceScore: number; // 0-100

  /** Compliance gaps */
  complianceGaps: ComplianceGap[];
}

/**
 * Framework-specific compliance results
 */
export interface FrameworkComplianceResult {
  /** Framework name */
  framework: ComplianceFramework;

  /** Compliance status */
  status: 'compliant' | 'non_compliant' | 'partially_compliant';

  /** Compliance percentage */
  compliancePercentage: number;

  /** Requirements assessed */
  requirementsAssessed: number;

  /** Requirements met */
  requirementsMet: number;

  /** Non-compliance issues */
  nonComplianceIssues: ComplianceIssue[];
}

/**
 * Compliance gaps identified
 */
export interface ComplianceGap {
  /** Gap identifier */
  id: string;

  /** Applicable framework */
  framework: ComplianceFramework;

  /** Requirement not met */
  requirement: string;

  /** Gap description */
  description: string;

  /** Severity of gap */
  severity: SecurityThreatLevel;

  /** Remediation actions */
  remediationActions: string[];
}

/**
 * Individual compliance issues
 */
export interface ComplianceIssue {
  /** Issue identifier */
  id: string;

  /** Issue description */
  description: string;

  /** Requirement violated */
  requirement: string;

  /** Severity level */
  severity: SecurityThreatLevel;

  /** Current implementation */
  currentImplementation: string;

  /** Required implementation */
  requiredImplementation: string;

  /** Remediation steps */
  remediationSteps: string[];
}

/**
 * Executive summary for security assessment
 */
export interface SecurityExecutiveSummary {
  /** Overall risk level */
  overallRiskLevel: SecurityThreatLevel;

  /** Key findings */
  keyFindings: string[];

  /** Business impact summary */
  businessImpact: string;

  /** Immediate actions required */
  immediateActions: string[];

  /** Investment recommendations */
  investmentRecommendations: string[];

  /** Timeline for remediation */
  remediationTimeline: string;
}

/**
 * Remediation roadmap
 */
export interface RemediationRoadmap {
  /** Immediate actions (0-30 days) */
  immediate: RemediationPhase;

  /** Short-term actions (1-3 months) */
  shortTerm: RemediationPhase;

  /** Medium-term actions (3-6 months) */
  mediumTerm: RemediationPhase;

  /** Long-term actions (6-12 months) */
  longTerm: RemediationPhase;

  /** Total estimated cost */
  totalEstimatedCost: string;

  /** Resource requirements */
  resourceRequirements: string[];
}

/**
 * Remediation phase details
 */
export interface RemediationPhase {
  /** Phase name */
  name: string;

  /** Phase duration */
  duration: string;

  /** Actions to take */
  actions: RemediationAction[];

  /** Expected outcomes */
  expectedOutcomes: string[];

  /** Success criteria */
  successCriteria: string[];

  /** Estimated cost */
  estimatedCost: string;
}

/**
 * Individual remediation action
 */
export interface RemediationAction {
  /** Action identifier */
  id: string;

  /** Action description */
  description: string;

  /** Priority level */
  priority: 'critical' | 'high' | 'medium' | 'low';

  /** Responsible party */
  responsibleParty: string;

  /** Estimated effort */
  estimatedEffort: string;

  /** Dependencies */
  dependencies: string[];

  /** Success metrics */
  successMetrics: string[];
}

// ============================================================================
// Common Supporting Types
// ============================================================================

/**
 * Security assertions for test validation
 */
export interface SecurityAssertion {
  /** Assertion type */
  type: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'matches_pattern' | 'custom';

  /** Expected value */
  expected: unknown;

  /** Actual value (populated during execution) */
  actual?: unknown;

  /** Custom validation function */
  customValidator?: (actual: unknown, expected: unknown) => boolean;

  /** Assertion description */
  description: string;
}

/**
 * Validation criteria for security requirements
 */
export interface ValidationCriteria {
  /** Criteria identifier */
  id: string;

  /** Criteria description */
  description: string;

  /** Validation method */
  validationMethod: 'automated' | 'manual' | 'hybrid';

  /** Pass/fail threshold */
  threshold: number | string | { min?: number; max?: number; percentage?: number };

  /** Measurement unit */
  unit?: string;
}

/**
 * Compliance requirements
 */
export interface ComplianceRequirement {
  /** Requirement identifier */
  id: string;

  /** Applicable framework */
  framework: ComplianceFramework;

  /** Requirement description */
  description: string;

  /** Mandatory or optional */
  mandatory: boolean;

  /** Implementation guidance */
  implementationGuidance: string[];
}

// ============================================================================
// Security Test Suite Configuration
// ============================================================================

/**
 * Complete security test suite configuration
 */
export interface SecurityTestSuite {
  /** Suite identifier */
  suiteId: string;

  /** Suite name */
  name: string;

  /** Suite description */
  description: string;

  /** Suite start time */
  startTime: number;

  /** Suite end time */
  endTime: number;

  /** Total suite duration */
  totalDuration: number;

  /** Functions tested count */
  functionsTestedCount: number;

  /** Total tests executed */
  totalTests: number;

  /** Tests passed count */
  passedTests: number;

  /** Tests failed count */
  failedTests: number;

  /** Vulnerabilities found count */
  vulnerabilitiesFound: number;

  /** Overall security score */
  overallSecurityScore: number;

  /** Test results */
  results: SecurityTestResult[];

  /** Security recommendations */
  recommendations: SecurityRecommendation[];

  /** Compliance status */
  complianceStatus: ComplianceStatus;

  /** Target functions for testing */
  targetFunctions: DatabaseFunction[];

  /** Security test configuration */
  config: SecurityTestConfig;

  /** Authentication test scenarios */
  authenticationScenarios: AuthenticationTestScenario[];

  /** Authorization test scenarios */
  authorizationScenarios: AuthorizationTestScenario[];

  /** Data protection test scenarios */
  dataProtectionScenarios: DataProtectionTestScenario[];

  /** Vulnerability scan configuration */
  vulnerabilityScanConfig: VulnerabilityScanConfig;

  /** Expected execution time */
  expectedExecutionTime: number;

  /** Resource requirements */
  resourceRequirements: {
    memory: string;
    cpu: string;
    storage: string;
    network: string;
  };
}

/**
 * Security test execution context
 */
export interface SecurityTestExecutionContext {
  /** Execution identifier */
  executionId: string;

  /** Test environment */
  environment: 'development' | 'staging' | 'production' | 'testing';

  /** Test data sources */
  testDataSources: string[];

  /** Mock configurations */
  mockConfigurations: Record<string, any>;

  /** Security tools configuration */
  securityToolsConfig: Record<string, any>;

  /** Execution metadata */
  metadata: {
    executor: string;
    timestamp: Date;
    version: string;
    platform: string;
  };
}

// ============================================================================
// Additional Required Types for Framework Implementation
// ============================================================================

/**
 * Vulnerability test result for individual vulnerability scans
 */
export interface VulnerabilityTestResult {
  /** Scan identifier */
  scanId: string;

  /** Function name tested */
  functionName: string;

  /** Scan start time */
  startTime: number;

  /** Scan end time */
  endTime: number;

  /** Total scan duration */
  totalDuration: number;

  /** Scan results */
  scanResults: VulnerabilityScanResult[];

  /** Discovered vulnerabilities */
  vulnerabilities: SecurityVulnerability[];

  /** Risk score (0-100) */
  riskScore: number;

  /** Critical vulnerabilities count */
  criticalVulnerabilities: number;

  /** High vulnerabilities count */
  highVulnerabilities: number;

  /** Security recommendations */
  recommendations: SecurityRecommendation[];
}

/**
 * Authentication test result for authentication scenarios
 */
export interface AuthenticationTestResult {
  /** Test identifier */
  testId: string;

  /** Function name tested */
  functionName: string;

  /** Test start time */
  startTime: number;

  /** Test end time */
  endTime: number;

  /** Total test duration */
  totalDuration: number;

  /** Scenario results */
  scenarioResults: AuthTestCaseResult[];

  /** Overall test result */
  overallResult: TestResult;

  /** Discovered vulnerabilities */
  vulnerabilities: SecurityVulnerability[];

  /** Security recommendations */
  recommendations: SecurityRecommendation[];
}

/**
 * Authorization test result for authorization scenarios
 */
export interface AuthorizationTestResult {
  /** Test identifier */
  testId: string;

  /** Function name tested */
  functionName: string;

  /** Test start time */
  startTime: number;

  /** Test end time */
  endTime: number;

  /** Total test duration */
  totalDuration: number;

  /** Role test results */
  roleResults: AuthzTestCaseResult[];

  /** Privilege escalation results */
  escalationResults: PrivilegeEscalationResult[];

  /** Overall test result */
  overallResult: TestResult;

  /** Discovered vulnerabilities */
  vulnerabilities: SecurityVulnerability[];

  /** Security recommendations */
  recommendations: SecurityRecommendation[];
}

/**
 * Data protection test result for data protection scenarios
 */
export interface DataProtectionTestResult {
  /** Test identifier */
  testId: string;

  /** Function name tested */
  functionName: string;

  /** Data classification tested */
  dataClassification: DataClassificationLevel;

  /** Test start time */
  startTime: number;

  /** Test end time */
  endTime: number;

  /** Total test duration */
  totalDuration: number;

  /** Test case results */
  testResults: DataProtectionTestCaseResult[];

  /** Overall test result */
  overallResult: TestResult;

  /** Discovered vulnerabilities */
  vulnerabilities: SecurityVulnerability[];

  /** Compliance status */
  complianceStatus: ComplianceStatus;

  /** Security recommendations */
  recommendations: SecurityRecommendation[];
}

/**
 * Security scan result wrapper
 */
export interface SecurityScanResult {
  /** Scan identifier */
  scanId: string;

  /** Scan type */
  scanType: string;

  /** Function name scanned */
  functionName: string;

  /** Scan status */
  status: 'completed' | 'failed' | 'partial';

  /** Scan duration */
  scanDuration: number;

  /** Discovered vulnerabilities */
  vulnerabilities: SecurityVulnerability[];

  /** Scan completion status */
  completed: boolean;

  /** Error message if failed */
  errorMessage?: string;
}

/**
 * Security vulnerability definition
 */
export interface SecurityVulnerability {
  /** Vulnerability identifier */
  id: string;

  /** Vulnerability name */
  name: string;

  /** Vulnerability description */
  description: string;

  /** Severity level */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  /** Vulnerability category */
  category: string;

  /** CWE identifier */
  cweId?: string;

  /** Mitigation guidance */
  mitigation: string;

  /** Affected function */
  affectedFunction: string;

  /** Discovery timestamp */
  discoveredAt: number;
}

/**
 * Security threat definition
 */
export interface SecurityThreat {
  /** Threat identifier */
  id: string;

  /** Threat name */
  name: string;

  /** Threat description */
  description: string;

  /** Likelihood level */
  likelihood: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  /** Impact level */
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  /** Threat category */
  category: string;

  /** Attack vectors */
  attackVectors: string[];
}

/**
 * Security control definition
 */
export interface SecurityControl {
  /** Control identifier */
  id: string;

  /** Control name */
  name: string;

  /** Control description */
  description: string;

  /** Control type */
  type: string;

  /** Whether control is mandatory */
  mandatory: boolean;

  /** Implementation details */
  implementation: string;
}

/**
 * Security recommendation definition
 */
export interface SecurityRecommendation {
  /** Recommendation identifier */
  id: string;

  /** Priority level */
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  /** Recommendation category */
  category: string;

  /** Recommendation title */
  title: string;

  /** Recommendation description */
  description: string;

  /** Implementation guidance */
  implementation: string;

  /** Implementation effort */
  effort: 'LOW' | 'MEDIUM' | 'HIGH';

  /** Expected impact */
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Test result enumeration
 */
export type TestResult = 'PASSED' | 'FAILED' | 'SKIPPED';

// DataClassification interface removed - using DataClassificationLevel enum instead

/**
 * Compliance status definition
 */
export interface ComplianceStatus {
  /** Overall compliance status */
  overall: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';

  /** Framework-specific compliance */
  frameworks: Record<string, 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL'>;
}

/**
 * Security profile for function testing
 */
export interface SecurityProfile {
  /** Risk level assessment */
  readonly riskLevel: SecurityRiskLevel;

  /** Whether authentication is required */
  readonly authenticationRequired: boolean;

  /** Required authorization roles */
  readonly authorizationRoles: string[];

  /** Data classification level */
  readonly dataClassification: DataClassificationLevel;

  /** Whether encryption is required */
  readonly encryptionRequired: boolean;

  /** Whether auditing is required */
  readonly auditingRequired: boolean;

  /** Applicable compliance frameworks */
  readonly complianceFrameworks: string[];
}

/**
 * Security risk levels for assessment
 */
export enum SecurityRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Data classification levels for security
 */
export enum DataClassificationLevel {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  TOP_SECRET = 'TOP_SECRET'
}

/**
 * Risk assessment definition
 */
export interface RiskAssessment {
  /** Overall risk level */
  riskLevel: SecurityRiskLevel;

  /** Numerical risk score */
  riskScore: number;

  /** Number of critical issues */
  criticalIssues: number;

  /** Number of high issues */
  highIssues: number;

  /** Number of medium issues */
  mediumIssues: number;

  /** Number of low issues */
  lowIssues: number;

  /** Mitigation priority */
  mitigationPriority: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Supporting type definitions for test results
 */
export interface AuthTestCaseResult {
  /** Test scenario name */
  scenario: string;

  /** Test credentials */
  credentials: any;

  /** Whether test passed */
  passed: boolean;

  /** Response time */
  responseTime: number;

  /** Error message if failed */
  errorMessage?: string;

  /** Security issues found */
  securityIssues: string[];
}

export interface AuthzTestCaseResult {
  /** User role tested */
  role: string;

  /** Expected access */
  expectedAccess: boolean;

  /** Actual access granted */
  actualAccess: boolean;

  /** Whether test passed */
  passed: boolean;

  /** Response time */
  responseTime: number;

  /** Error message if failed */
  errorMessage?: string;

  /** Security issues found */
  securityIssues: string[];
}

export interface PrivilegeEscalationResult {
  /** Source role */
  fromRole: string;

  /** Target role */
  toRole: string;

  /** Whether escalation was attempted */
  escalationAttempted: boolean;

  /** Whether escalation succeeded */
  escalationSucceeded: boolean;

  /** Whether vulnerability was found */
  vulnerabilityFound: boolean;

  /** Result description */
  description: string;
}

export interface DataProtectionTestCaseResult {
  /** Test name */
  testName: string;

  /** Test type */
  testType: 'ENCRYPTION' | 'MASKING' | 'SANITIZATION' | 'PII_HANDLING' | 'LEAKAGE_PREVENTION';

  /** Whether test passed */
  passed: boolean;

  /** Test description */
  description: string;

  /** Test findings */
  findings: string[];

  /** Test recommendations */
  recommendations: string[];
}

// ============================================================================
// Export All Types
// ============================================================================

// Types are already exported via 'export interface' declarations above