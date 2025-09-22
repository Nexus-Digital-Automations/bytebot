/**
 * Health Diagnostic Interfaces - Parlant Enhanced
 *
 * Comprehensive interfaces for health monitoring diagnostics with conversational
 * AI validation. Provides structured data models for health assessment, system
 * diagnostics, and conversational validation workflows.
 *
 * Features:
 * - Comprehensive diagnostic data structures with Parlant validation context
 * - Performance baseline tracking with conversational approval
 * - System resource monitoring with AI-driven threshold management
 * - Diagnostic reporting with conversational insights
 * - Alert classification with risk-based validation
 * - Recovery recommendations through conversational AI
 *
 * @author Claude Code - Health & Metrics Parlant Integration
 * @version 1.0.0
 */

// ===== DIAGNOSTIC OPERATIONS =====

/**
 * Comprehensive system diagnostic request
 */
export interface SystemDiagnosticRequest {
  /** Unique identifier for the diagnostic operation */
  operationId: string;

  /** Type of diagnostic to perform */
  diagnosticType: DiagnosticType;

  /** Scope of the diagnostic check */
  scope: DiagnosticScope;

  /** User context for Parlant validation */
  userContext: {
    userId: string;
    userRole: string;
    securityClearance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  } /** Diagnostic parameters */;
  parameters: {
    includePerformanceAnalysis: boolean;
    includeResourceUsage: boolean;
    includeNetworkDiagnostics: boolean;
    includeDependencyChecks: boolean;
    generateRecommendations: boolean;
    deepAnalysis: boolean;
  };

  /** Parlant validation preferences */
  parlantPreferences: {
    requireValidation: boolean;
    autoApproveRoutine: boolean;
    escalateOnCritical: boolean;
    generateConversationalReport: boolean;
  };
}

/**
 * Diagnostic operation types
 */
export enum DiagnosticType {
  QUICK_HEALTH_CHECK = 'QUICK_HEALTH_CHECK',
  COMPREHENSIVE_ANALYSIS = 'COMPREHENSIVE_ANALYSIS',
  PERFORMANCE_BENCHMARK = 'PERFORMANCE_BENCHMARK',
  SECURITY_ASSESSMENT = 'SECURITY_ASSESSMENT',
  DEPENDENCY_VALIDATION = 'DEPENDENCY_VALIDATION',
  RESOURCE_UTILIZATION = 'RESOURCE_UTILIZATION',
  ERROR_INVESTIGATION = 'ERROR_INVESTIGATION',
  COMPLIANCE_AUDIT = 'COMPLIANCE_AUDIT',
} /**
 * Diagnostic scope levels
 */
export enum DiagnosticScope {
  COMPONENT_LEVEL = 'COMPONENT_LEVEL',
  SERVICE_LEVEL = 'SERVICE_LEVEL',
  SYSTEM_LEVEL = 'SYSTEM_LEVEL',
  INFRASTRUCTURE_LEVEL = 'INFRASTRUCTURE_LEVEL',
  BUSINESS_LEVEL = 'BUSINESS_LEVEL',
} // ===== DIAGNOSTIC RESULTS =====

/**
 * Comprehensive diagnostic result with Parlant insights
 */
export interface SystemDiagnosticResult {
  /** Operation metadata */
  metadata: {
    operationId: string;
    diagnosticType: DiagnosticType;
    scope: DiagnosticScope;
    executionTime: number;
    timestamp: Date;
    executor: string;
  };

  /** Overall diagnostic status */
  status: DiagnosticStatus;

  /** Overall health score (0-100) */
  healthScore: number;

  /** Component-level results */
  componentResults: Map<string, ComponentDiagnosticResult>;

  /** Performance analysis results */
  performanceAnalysis: PerformanceDiagnosticResult;

  /** Resource utilization analysis */
  resourceAnalysis: ResourceDiagnosticResult;

  /** Network diagnostics */
  networkDiagnostics: NetworkDiagnosticResult;

  /** Dependency health results */
  dependencyResults: DependencyDiagnosticResult[];

  /** Security assessment results */
  securityAssessment: SecurityDiagnosticResult;

  /** Identified issues and anomalies */
  issues: DiagnosticIssue[];

  /** Recovery recommendations */
  recommendations: DiagnosticRecommendation[];

  /** Parlant conversational context */
  parlantContext: {
    conversationId: string;
    validationApproved: boolean;
    conversationalInsights: string[];
    riskAssessment: ConversationalRiskAssessment;
    aiRecommendations: string[];
    followUpActions: ConversationalAction[];
  };

  /** Trends and historical comparison */
  trends: {
    healthScoreTrend: TrendAnalysis;
    performanceTrend: TrendAnalysis;
    resourceTrend: TrendAnalysis;
    reliability: ReliabilityMetrics;
  };
}

/**
 * Diagnostic status levels
 */
export enum DiagnosticStatus {
  OPTIMAL = 'OPTIMAL',
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  AT_RISK = 'AT_RISK',
  CRITICAL = 'CRITICAL',
  FAILED = 'FAILED',
  UNKNOWN = 'UNKNOWN',
} // ===== COMPONENT DIAGNOSTICS =====

/**
 * Individual component diagnostic result
 */
export interface ComponentDiagnosticResult {
  /** Component identification */
  componentName: string;
  componentType: ComponentType;

  /** Health status */
  status: DiagnosticStatus;
  healthScore: number;

  /** Performance metrics */
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    uptime: number;
    availability: number;
  };

  /** Resource usage */
  resourceUsage: {
    cpu: number;
    memory: number;
    storage: number;
    network: number;
  };

  /** Error analysis */
  errorAnalysis: {
    totalErrors: number;
    criticalErrors: number;
    errorTypes: Map<string, number>;
    recentErrors: DiagnosticError[];
  };

  /** Configuration validation */
  configurationStatus: {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  };

  /** Dependencies */
  dependencies: {
    internal: ComponentDependency[];
    external: ComponentDependency[];
    healthyDependencies: number;
    totalDependencies: number;
  };
}

/**
 * Component types for classification
 */
export enum ComponentType {
  API_SERVICE = 'API_SERVICE',
  DATABASE = 'DATABASE',
  CACHE = 'CACHE',
  MESSAGE_QUEUE = 'MESSAGE_QUEUE',
  AUTH_SERVICE = 'AUTH_SERVICE',
  MONITORING_SERVICE = 'MONITORING_SERVICE',
  PARLANT_SERVICE = 'PARLANT_SERVICE',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
} /**
 * Component dependency information
 */
export interface ComponentDependency {
  name: string;
  type: ComponentType;
  status: DiagnosticStatus;
  responseTime: number;
  lastChecked: Date;
  criticalForOperation: boolean;
  fallbackAvailable: boolean;
}

// ===== SPECIALIZED DIAGNOSTIC RESULTS =====

/**
 * Performance diagnostic analysis
 */
export interface PerformanceDiagnosticResult {
  /** Overall performance score */
  overallScore: number;

  /** Response time analysis */
  responseTime: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
    trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  } /** Throughput analysis */;
  throughput: {
    requestsPerSecond: number;
    peakThroughput: number;
    sustainedThroughput: number;
    capacity: number;
    utilizationPercentage: number;
  };

  /** Error rate analysis */
  errorRate: {
    overall: number;
    byEndpoint: Map<string, number>;
    byErrorType: Map<string, number>;
    trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  } /** Performance bottlenecks */;
  bottlenecks: PerformanceBottleneck[];

  /** Optimization opportunities */
  optimizations: PerformanceOptimization[];
}

/**
 * Resource utilization diagnostic result
 */
export interface ResourceDiagnosticResult {
  /** CPU analysis */
  cpu: {
    currentUsage: number;
    averageUsage: number;
    peakUsage: number;
    cores: number;
    processes: ProcessResourceUsage[];
    recommendations: string[];
  };

  /** Memory analysis */
  memory: {
    totalMemory: number;
    usedMemory: number;
    availableMemory: number;
    cacheMemory: number;
    swapUsage: number;
    memoryLeaks: MemoryLeakDetection[];
    recommendations: string[];
  };

  /** Storage analysis */
  storage: {
    totalSpace: number;
    usedSpace: number;
    availableSpace: number;
    iops: number;
    throughput: number;
    hotspots: StorageHotspot[];
    recommendations: string[];
  };

  /** Network analysis */
  network: {
    bandwidth: number;
    latency: number;
    packetLoss: number;
    connections: number;
    throughput: number;
    recommendations: string[];
  };
}

/**
 * Network diagnostic result
 */
export interface NetworkDiagnosticResult {
  /** Connectivity tests */
  connectivity: {
    internalConnectivity: boolean;
    externalConnectivity: boolean;
    dnsResolution: boolean;
    internetAccess: boolean;
  };

  /** Latency measurements */
  latency: {
    internal: number;
    external: number;
    dns: number;
    averageRoundTrip: number;
  };

  /** Bandwidth measurements */
  bandwidth: {
    download: number;
    upload: number;
    utilization: number;
    capacity: number;
  };

  /** Network security */
  security: {
    openPorts: number[];
    firewall: boolean;
    encryption: boolean;
    vulnerabilities: string[];
  };
}

/**
 * Dependency diagnostic result
 */
export interface DependencyDiagnosticResult {
  /** Dependency identification */
  name: string;
  type: ComponentType;
  endpoint: string;

  /** Health status */
  status: DiagnosticStatus;
  responseTime: number;

  /** Availability metrics */
  availability: {
    uptime: number;
    downtime: number;
    mtbf: number;
    mttr: number;
  };

  /** Version compatibility */
  version: {
    current: string;
    required: string;
    compatible: boolean;
    updateAvailable: boolean;
  };

  /** Connection pool status */
  connectionPool?: {
    active: number;
    idle: number;
    maximum: number;
    utilization: number;
  };
}

/**
 * Security assessment result
 */
export interface SecurityDiagnosticResult {
  /** Overall security score */
  securityScore: number;

  /** Vulnerability assessment */
  vulnerabilities: {
    critical: SecurityVulnerability[];
    high: SecurityVulnerability[];
    medium: SecurityVulnerability[];
    low: SecurityVulnerability[];
  };

  /** Access control */
  accessControl: {
    authenticationEnabled: boolean;
    authorizationEnabled: boolean;
    sessionManagement: boolean;
    rateLimiting: boolean;
  };

  /** Encryption status */
  encryption: {
    dataAtRest: boolean;
    dataInTransit: boolean;
    certificateStatus: 'VALID' | 'EXPIRING' | 'EXPIRED' | 'INVALID';
    tlsVersion: string;
  };

  /** Compliance status */
  compliance: {
    gdprCompliant: boolean;
    hipaaCompliant: boolean;
    soc2Compliant: boolean;
    issues: string[];
  };
}

// ===== DIAGNOSTIC ISSUES =====

/**
 * Identified diagnostic issue
 */
export interface DiagnosticIssue {
  /** Issue identification */
  id: string;
  type: IssueType;
  severity: IssueSeverity;

  /** Issue details */
  title: string;
  description: string;
  affectedComponents: string[];

  /** Impact assessment */
  impact: {
    businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    userImpact: 'NONE' | 'MINIMAL' | 'MODERATE' | 'SEVERE';
    performanceImpact: number; // 0-100 scaleavailabilityImpact: number; // 0-100 scale
  };

  /** Timeline */
  detected: Date;
  estimatedResolution: Date;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Resolution information */ resolution: {
    status: 'IDENTIFIED' | 'INVESTIGATING' | 'FIXING' | 'RESOLVED';
    steps: string[];
    owner: string;
    estimatedEffort: number; // hours
  };

  /** Parlant conversation context */
  parlantContext?: {
    conversationId: string;
    aiAnalysis: string;
    recommendedActions: string[];
    riskAssessment: string;
  };
}

/**
 * Issue type classification
 */
export enum IssueType {
  PERFORMANCE_DEGRADATION = 'PERFORMANCE_DEGRADATION',
  RESOURCE_EXHAUSTION = 'RESOURCE_EXHAUSTION',
  SERVICE_UNAVAILABILITY = 'SERVICE_UNAVAILABILITY',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  SECURITY_VULNERABILITY = 'SECURITY_VULNERABILITY',
  DEPENDENCY_FAILURE = 'DEPENDENCY_FAILURE',
  DATA_INCONSISTENCY = 'DATA_INCONSISTENCY',
  CAPACITY_SHORTAGE = 'CAPACITY_SHORTAGE',
  NETWORK_CONNECTIVITY = 'NETWORK_CONNECTIVITY',
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
} /**
 * Issue severity levels
 */
export enum IssueSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY',
} // ===== RECOMMENDATIONS =====

/**
 * Diagnostic recommendation with Parlant insights
 */
export interface DiagnosticRecommendation {
  /** Recommendation identification */
  id: string;
  type: RecommendationType;
  priority: RecommendationPriority;

  /** Recommendation details */
  title: string;
  description: string;
  reasoning: string;

  /** Implementation details */
  implementation: {
    effort: 'LOW' | 'MEDIUM' | 'HIGH';
    timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
    complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
    cost: 'LOW' | 'MEDIUM' | 'HIGH';
  } /** Expected benefits */;
  benefits: {
    performanceImprovement: number; // percentage
    reliabilityImprovement: number; // percentage
    costSavings: number; // percentage
    riskReduction: number; // percentage
  };

  /** Action items */
  actionItems: string[];

  /** Prerequisites */
  prerequisites: string[];

  /** Risk assessment */
  risks: string[];

  /** Parlant conversational context */
  parlantContext: {
    conversationId: string;
    aiReasoning: string;
    alternativeOptions: string[];
    businessJustification: string;
    implementationGuidance: string[];
  };
}

/**
 * Recommendation types
 */
export enum RecommendationType {
  PERFORMANCE_OPTIMIZATION = 'PERFORMANCE_OPTIMIZATION',
  RESOURCE_SCALING = 'RESOURCE_SCALING',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  INFRASTRUCTURE_UPGRADE = 'INFRASTRUCTURE_UPGRADE',
  SECURITY_ENHANCEMENT = 'SECURITY_ENHANCEMENT',
  MONITORING_IMPROVEMENT = 'MONITORING_IMPROVEMENT',
  PROCESS_IMPROVEMENT = 'PROCESS_IMPROVEMENT',
  COST_OPTIMIZATION = 'COST_OPTIMIZATION',
} /**
 * Recommendation priority levels
 */
export enum RecommendationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  IMMEDIATE = 'IMMEDIATE',
} // ===== PARLANT CONVERSATIONAL CONTEXT =====

/**
 * Conversational risk assessment with AI insights
 */
export interface ConversationalRiskAssessment {
  /** Overall risk level */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Risk factors identified by AI */ riskFactors: string[];

  /** Business impact assessment */
  businessImpact: {
    revenue: 'NO_IMPACT' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    operations: 'NO_IMPACT' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reputation: 'NO_IMPACT' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    compliance: 'NO_IMPACT' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  } /** Mitigation strategies */;
  mitigationStrategies: string[];

  /** AI confidence level */
  confidenceLevel: number; // 0-100
}

/**
 * Conversational action with AI context
 */
export interface ConversationalAction {
  /** Action identification */
  id: string;
  type: 'IMMEDIATE' | 'SCHEDULED' | 'CONDITIONAL';
  /** Action details */ description: string;
  reasoning: string;

  /** Execution context */
  execution: {
    when: 'NOW' | 'SCHEDULE' | 'ON_CONDITION';
    condition?: string;
    scheduledTime?: Date;
    executor: string;
  };

  /** Validation requirements */
  validation: {
    requiresApproval: boolean;
    approvalLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    validators: string[];
  };

  /** Success criteria */
  successCriteria: string[];

  /** Rollback plan */
  rollbackPlan?: string[];
}

// ===== SUPPORTING TYPES =====

/**
 * Performance bottleneck identification
 */
export interface PerformanceBottleneck {
  location: string;
  type: 'CPU' | 'MEMORY' | 'IO' | 'NETWORK' | 'DATABASE' | 'CACHE';
  severity: number; // 0-100impact: string;
  recommendations: string[];
}

/**
 * Performance optimization opportunity
 */
export interface PerformanceOptimization {
  area: string;
  type: 'CACHING' | 'INDEXING' | 'COMPRESSION' | 'BATCHING' | 'ASYNC';
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  expectedGain: number; // percentage improvementdescription: string;
}

/**
 * Process resource usage
 */
export interface ProcessResourceUsage {
  processName: string;
  pid: number;
  cpuUsage: number;
  memoryUsage: number;
  priority: number;
}

/**
 * Memory leak detection
 */
export interface MemoryLeakDetection {
  process: string;
  growthRate: number; // MB per hour
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedAt: Date;
}

/**
 * Storage hotspot identification
 */
export interface StorageHotspot {
  path: string;
  usage: number;
  growth: number;
  type: 'LOGS' | 'CACHE' | 'DATA' | 'TEMP';
  cleanupRecommended: boolean;
}

/**
 * Security vulnerability information
 */
export interface SecurityVulnerability {
  id: string;
  type: string;
  description: string;
  cveId?: string;
  score: number; // CVSS score
  exploitability: 'LOW' | 'MEDIUM' | 'HIGH';
  remediation: string[];
}

/**
 * Trend analysis data
 */
export interface TrendAnalysis {
  direction: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  rate: number; // rate of change
  confidence: number; // 0-100
  dataPoints: number;
  timespan: string;
}

/**
 * Reliability metrics
 */
export interface ReliabilityMetrics {
  mtbf: number; // mean time between failures
  mttr: number; // mean time to recovery
  availability: number; // percentage
  errorBudget: number; // remaining error budget
  slaCompliance: number; // percentage
}

/**
 * Diagnostic error information
 */
export interface DiagnosticError {
  id: string;
  timestamp: Date;
  type: string;
  message: string;
  stack?: string;
  context: Record<string, unknown>;
  resolved: boolean;
}
