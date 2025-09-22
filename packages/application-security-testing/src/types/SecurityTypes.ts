/**
 * @fileoverview Security Testing Types and Interfaces
 * @description Comprehensive type definitions for security testing framework
 * @version 1.0.0
 * @author ByteBot Security Team
 */

// ========== Core Security Types ==========

export enum SecurityTestType {
  SAST = 'sast',
  DAST = 'dast',
  IAST = 'iast',
  OWASP_TOP10 = 'owasp-top10',
  DEPENDENCY_SCAN = 'dependency-scan',
  CODE_REVIEW = 'code-review',
  COMPLIANCE = 'compliance'
}

export enum SecurityTestStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum VulnerabilitySeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export enum VulnerabilityCategory {
  INJECTION = 'injection',
  BROKEN_AUTHENTICATION = 'broken-authentication',
  SENSITIVE_DATA_EXPOSURE = 'sensitive-data-exposure',
  XXE = 'xml-external-entities',
  BROKEN_ACCESS_CONTROL = 'broken-access-control',
  SECURITY_MISCONFIGURATION = 'security-misconfiguration',
  XSS = 'cross-site-scripting',
  INSECURE_DESERIALIZATION = 'insecure-deserialization',
  VULNERABLE_COMPONENTS = 'vulnerable-components',
  LOGGING_MONITORING_FAILURES = 'logging-monitoring-failures',
  SSRF = 'server-side-request-forgery',
  CRYPTOGRAPHIC_FAILURES = 'cryptographic-failures',
  INSECURE_DESIGN = 'insecure-design',
  INTEGRITY_FAILURES = 'integrity-failures'
}

export type OWASPCategory = string;

// ========== Base Interfaces ==========

export interface SecurityTestOptions {
  timeout?: number;
  parallel?: boolean;
  maxConcurrency?: number;
  severity?: VulnerabilitySeverity[];
  categories?: VulnerabilityCategory[];
  customRules?: SecurityRule[];
  excludePatterns?: string[];
  includePatterns?: string[];
  reportFormat?: 'summary' | 'detailed' | 'comprehensive';
  [key: string]: any;
}

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  category: VulnerabilityCategory;
  severity: VulnerabilitySeverity;
  pattern: string | RegExp;
  enabled: boolean;
  customPayloads?: string[];
  metadata?: Record<string, any>;
}

export interface Vulnerability {
  id: string;
  type: string;
  category: VulnerabilityCategory | string;
  severity: VulnerabilitySeverity | string;
  title: string;
  description: string;
  file?: string;
  line?: number;
  column?: number;
  url?: string;
  parameter?: string;
  method?: string;
  evidence?: string;
  recommendation: string;
  cwe?: string;
  cvss?: number;
  exploitability?: string;
  businessImpact?: string;
  remediation?: string;
  references?: string[];
  tags?: string[];
  confidence?: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SecurityMetrics {
  scanDuration: number;
  vulnerabilitiesFound?: number;
  falsePositiveRate?: number;
  coveragePercentage?: number;
  performanceImpact?: number;
  [key: string]: any;
}

export interface SecurityTestResult {
  id: string;
  type: SecurityTestType;
  target: string;
  status: SecurityTestStatus;
  startTime: Date;
  endTime?: Date;
  options: SecurityTestOptions;
  vulnerabilities: Vulnerability[];
  metrics: SecurityMetrics;
  summary?: SecurityTestSummary;
  error?: string;
  logs?: string[];
  artifacts?: string[];
  metadata?: Record<string, any>;
}

export interface SecurityTestSummary {
  totalVulnerabilities: number;
  severityBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  riskScore: number;
  recommendedActions: string[];
  complianceStatus?: Record<string, boolean>;
}

// ========== SAST Types ==========

export interface SASTScanOptions extends SecurityTestOptions {
  includeTests?: boolean;
  includeDependencies?: boolean;
  maxFileSize?: number;
  maxParallelJobs?: number;
  languageSpecific?: Record<string, any>;
  customAnalyzers?: string[];
  deepAnalysis?: boolean;
  performanceMode?: boolean;
}

export interface SASTScanResult {
  id: string;
  codebasePath: string;
  startTime: Date;
  endTime?: Date;
  status: string;
  options: SASTScanOptions;
  vulnerabilities: Vulnerability[];
  codeIssues: CodeSecurityIssue[];
  dependencyIssues: DependencyIssue[];
  metrics: SASTMetrics;
  error?: string;
}

export interface SASTMetrics extends SecurityMetrics {
  filesScanned: number;
  linesAnalyzed: number;
  rulesExecuted: number;
  languageBreakdown?: Record<string, number>;
  complexityScore?: number;
}

export interface CodeSecurityIssue {
  id: string;
  type: string;
  severity: VulnerabilitySeverity;
  file: string;
  line: number;
  column?: number;
  description: string;
  rule: string;
  fix?: string;
  context?: string;
  metadata?: Record<string, any>;
}

export interface DependencyIssue {
  id: string;
  packageName: string;
  version: string;
  vulnerability: Vulnerability;
  fixedVersion?: string;
  patchAvailable: boolean;
  upgradeComplexity: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

// ========== DAST Types ==========

export interface DASTScanOptions extends SecurityTestOptions {
  maxDepth?: number;
  maxRequests?: number;
  followRedirects?: boolean;
  testAuthentication?: boolean;
  testBusinessLogic?: boolean;
  testAPIs?: boolean;
  userAgent?: string;
  concurrent?: number;
  delay?: number;
  scope?: string[];
  excludeExtensions?: string[];
  includePaths?: string[];
  excludePaths?: string[];
  customHeaders?: Record<string, string>;
  authentication?: AuthenticationConfig;
  crawlConfig?: CrawlConfig;
}

export interface DASTScanResult {
  id: string;
  targetUrl: string;
  startTime: Date;
  endTime?: Date;
  status: string;
  options: DASTScanOptions;
  vulnerabilities: Vulnerability[];
  httpTests: HTTPSecurityTest[];
  webTests: WebSecurityTest[];
  metrics: DASTMetrics;
  error?: string;
}

export interface DASTMetrics extends SecurityMetrics {
  requestsSent: number;
  responsesCaptured: number;
  endpointsTested: number;
  averageResponseTime: number;
  crawlDepth?: number;
  pagesDiscovered?: number;
}

export interface HTTPSecurityTest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  response?: HTTPResponse;
  vulnerabilities: Vulnerability[];
  responseTime?: number;
  testType: string;
  metadata?: Record<string, any>;
}

export interface WebSecurityTest {
  id: string;
  url: string;
  testType: string;
  interactions: WebInteraction[];
  vulnerabilities: Vulnerability[];
  screenshots?: string[];
  metadata?: Record<string, any>;
}

export interface HTTPResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  size: number;
  time: number;
}

export interface WebInteraction {
  type: 'click' | 'input' | 'submit' | 'navigate';
  element?: string;
  value?: string;
  screenshot?: string;
  timestamp: Date;
}

export interface AuthenticationConfig {
  type: 'basic' | 'form' | 'oauth' | 'jwt' | 'custom';
  credentials: Record<string, string>;
  loginUrl?: string;
  logoutUrl?: string;
  sessionManagement?: SessionConfig;
}

export interface SessionConfig {
  sessionTimeout?: number;
  sessionToken?: string;
  cookieName?: string;
  refreshToken?: string;
}

export interface CrawlConfig {
  maxDepth: number;
  maxPages: number;
  respectRobotsTxt: boolean;
  followExternalLinks: boolean;
  crawlDelay: number;
  userAgent: string;
}

// ========== IAST Types ==========

export interface IASTScanOptions extends SecurityTestOptions {
  realTimeMonitoring?: boolean;
  dataFlowTracking?: boolean;
  runtimeInstrumentation?: boolean;
  feedbackEnabled?: boolean;
  continuousValidation?: boolean;
  monitoringDepth?: 'shallow' | 'medium' | 'deep';
  instrumentationLevel?: 'passive' | 'active' | 'aggressive';
  performanceImpactThreshold?: number;
  eventBufferSize?: number;
  analysisInterval?: number;
  vulnerabilityThreshold?: VulnerabilitySeverity;
}

export interface IASTScanResult {
  id: string;
  applicationEndpoint: string;
  startTime: Date;
  endTime?: Date;
  status: string;
  options: IASTScanOptions;
  vulnerabilities: Vulnerability[];
  runtimeEvents: RuntimeSecurityEvent[];
  dataFlows: DataFlowAnalysis[];
  securityInteractions: SecurityInteraction[];
  metrics: IASTMetrics;
  error?: string;
}

export interface IASTMetrics extends SecurityMetrics {
  interactionsMonitored: number;
  dataFlowsAnalyzed: number;
  runtimeEventsCapture: number;
  instrumentationOverhead?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface RuntimeSecurityEvent {
  id: string;
  scanId?: string;
  agentId?: string;
  timestamp: Date;
  type: string;
  severity: VulnerabilitySeverity;
  source: string;
  destination?: string;
  data?: any;
  context?: Record<string, any>;
  stackTrace?: string[];
  metadata?: Record<string, any>;
}

export interface DataFlowAnalysis {
  id: string;
  scanId?: string;
  agentId?: string;
  timestamp: Date;
  source: string;
  destination: string;
  data: any;
  line?: number;
  isTainted: boolean;
  containsSensitiveData: boolean;
  isEncrypted: boolean;
  reachesDatabase: boolean;
  reachesNetwork: boolean;
  transformations: string[];
  metadata?: Record<string, any>;
}

export interface SecurityInteraction {
  id: string;
  agentId?: string;
  timestamp: Date;
  type: string;
  description: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  automated: boolean;
  userInput?: any;
  systemResponse?: any;
  metadata?: Record<string, any>;
}

// ========== OWASP Types ==========

export interface OWASPTestOptions extends SecurityTestOptions {
  enabledCategories?: string[];
  thoroughness?: 'basic' | 'standard' | 'comprehensive';
  parallelExecution?: boolean;
  maxParallelTests?: number;
  skipLowSeverity?: boolean;
  includeExperimental?: boolean;
  customPayloads?: string[];
  testDepth?: 'shallow' | 'medium' | 'deep';
  performanceMode?: boolean;
}

export interface OWASPTestResult {
  id: string;
  target: string;
  startTime: Date;
  endTime?: Date;
  status: string;
  options: OWASPTestOptions;
  vulnerabilities: Vulnerability[];
  categoryResults: Map<string, any>;
  metrics: OWASPMetrics;
  error?: string;
}

export interface OWASPMetrics extends SecurityMetrics {
  testsExecuted: number;
  categoriesTestsed: number;
  vulnerabilitiesDetected: number;
  categoryBreakdown?: Record<string, number>;
  complianceScore?: number;
}

// ========== Configuration Types ==========

export interface SecurityTestConfig {
  sast?: Partial<SASTScanOptions>;
  dast?: Partial<DASTScanOptions>;
  iast?: Partial<IASTScanOptions>;
  owasp?: Partial<OWASPTestOptions>;
  general?: {
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    outputDirectory?: string;
    reportFormats?: string[];
    notifications?: NotificationConfig;
    performance?: PerformanceConfig;
    compliance?: ComplianceConfig;
  };
}

export interface NotificationConfig {
  email?: EmailConfig;
  slack?: SlackConfig;
  webhook?: WebhookConfig;
  enabled: boolean;
}

export interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  recipients: string[];
  templates?: Record<string, string>;
}

export interface SlackConfig {
  webhookUrl: string;
  channel: string;
  username?: string;
  iconEmoji?: string;
}

export interface WebhookConfig {
  url: string;
  method: string;
  headers?: Record<string, string>;
  payload?: Record<string, any>;
}

export interface PerformanceConfig {
  maxMemoryUsage: number;
  maxCpuUsage: number;
  timeoutLimits: Record<string, number>;
  concurrencyLimits: Record<string, number>;
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
}

export interface ComplianceConfig {
  frameworks: string[];
  standards: string[];
  customRequirements: ComplianceRequirement[];
  reportingFrequency: 'daily' | 'weekly' | 'monthly';
  auditTrail: boolean;
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  framework: string;
  mandatory: boolean;
  validationRules: ValidationRule[];
  evidence: string[];
}

export interface ValidationRule {
  type: string;
  condition: string;
  expectedValue: any;
  actualValue?: any;
  status?: 'pass' | 'fail' | 'skip';
}

// ========== Event Types ==========

export interface SecurityTestEvent {
  type: string;
  timestamp: Date;
  testId: string;
  data: any;
  metadata?: Record<string, any>;
}

export interface ProgressEvent extends SecurityTestEvent {
  type: 'progress';
  data: {
    phase: string;
    progress: number;
    message: string;
    eta?: number;
  };
}

export interface VulnerabilityEvent extends SecurityTestEvent {
  type: 'vulnerability';
  data: {
    vulnerability: Vulnerability;
    context: string;
    immediate: boolean;
  };
}

export interface ErrorEvent extends SecurityTestEvent {
  type: 'error';
  data: {
    error: Error | string;
    context: string;
    recoverable: boolean;
  };
}

// ========== Utility Types ==========

export type SecurityTestCallback<T = any> = (error: Error | null, result?: T) => void;

export type SecurityTestPromise<T = any> = Promise<T>;

export interface SecurityTestContext {
  testId: string;
  testType: SecurityTestType;
  target: string;
  options: SecurityTestOptions;
  startTime: Date;
  logger: any;
  emit: (event: string, data: any) => void;
}

export interface SecurityAnalysisResult {
  vulnerabilities: Vulnerability[];
  recommendations: string[];
  riskScore: number;
  complianceStatus: Record<string, boolean>;
  nextSteps: string[];
  metadata: Record<string, any>;
}

// ========== Export Collections ==========

export type AllSecurityTestOptions = 
  | SASTScanOptions 
  | DASTScanOptions 
  | IASTScanOptions 
  | OWASPTestOptions;

export type AllSecurityTestResults = 
  | SASTScanResult 
  | DASTScanResult 
  | IASTScanResult 
  | OWASPTestResult;

export type AllSecurityMetrics = 
  | SASTMetrics 
  | DASTMetrics 
  | IASTMetrics 
  | OWASPMetrics;

// ========== Constants ==========

export const SEVERITY_LEVELS = Object.values(VulnerabilitySeverity);
export const VULNERABILITY_CATEGORIES = Object.values(VulnerabilityCategory);
export const TEST_TYPES = Object.values(SecurityTestType);
export const TEST_STATUSES = Object.values(SecurityTestStatus);

// ========== Default Configurations ==========

export const DEFAULT_SECURITY_CONFIG: SecurityTestConfig = {
  general: {
    logLevel: 'info',
    outputDirectory: './security-reports',
    reportFormats: ['json', 'html', 'pdf'],
    notifications: {
      enabled: false
    },
    performance: {
      maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
      maxCpuUsage: 80, // 80%
      timeoutLimits: {
        sast: 900000, // 15 minutes
        dast: 1800000, // 30 minutes
        iast: 3600000, // 60 minutes
        owasp: 2700000 // 45 minutes
      },
      concurrencyLimits: {
        sast: 8,
        dast: 5,
        iast: 3,
        owasp: 5
      },
      caching: {
        enabled: true,
        ttl: 3600000, // 1 hour
        maxSize: 100 * 1024 * 1024 // 100MB
      }
    },
    compliance: {
      frameworks: ['OWASP', 'NIST', 'ISO-27001'],
      standards: ['PCI-DSS', 'GDPR', 'SOX'],
      customRequirements: [],
      reportingFrequency: 'weekly',
      auditTrail: true
    }
  }
};