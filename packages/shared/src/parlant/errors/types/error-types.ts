/**
 * Enterprise Error Types - Comprehensive Type Definitions
 *
 * Complete type system for enterprise-grade error handling with intelligent
 * classification, recovery strategies, and comprehensive audit capabilities.
 */

import { RiskLevel, SecurityLevel } from '../parlant-validation.decorator';

// ===== CORE ERROR INTERFACES =====

/**
 * Enhanced error severity levels with enterprise classification
 */
export enum EnterpriseErrorSeverity {
  TRACE = 'TRACE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
  FATAL = 'FATAL'
}

/**
 * Comprehensive error categories for enterprise classification
 */
export enum EnterpriseErrorCategory {
  // Technical Categories
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  SYSTEM = 'SYSTEM',
  INTEGRATION = 'INTEGRATION',
  PERFORMANCE = 'PERFORMANCE',
  SECURITY = 'SECURITY',

  // Enterprise Categories
  COMPLIANCE = 'COMPLIANCE',
  DATA_GOVERNANCE = 'DATA_GOVERNANCE',
  AUDIT = 'AUDIT',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  MONITORING = 'MONITORING',
  BACKUP_RECOVERY = 'BACKUP_RECOVERY',
  CAPACITY = 'CAPACITY',
  CONFIGURATION = 'CONFIGURATION',
  DEPLOYMENT = 'DEPLOYMENT',
  THIRD_PARTY = 'THIRD_PARTY'
}

/**
 * Error impact assessment levels
 */
export enum ErrorImpactLevel {
  NO_IMPACT = 'NO_IMPACT',
  MINIMAL_IMPACT = 'MINIMAL_IMPACT',
  LOW_IMPACT = 'LOW_IMPACT',
  MODERATE_IMPACT = 'MODERATE_IMPACT',
  HIGH_IMPACT = 'HIGH_IMPACT',
  CRITICAL_IMPACT = 'CRITICAL_IMPACT',
  CATASTROPHIC_IMPACT = 'CATASTROPHIC_IMPACT'
}

/**
 * Error urgency levels for prioritization
 */
export enum ErrorUrgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY'
}

/**
 * Error resolution status tracking
 */
export enum ErrorResolutionStatus {
  UNRESOLVED = 'UNRESOLVED',
  INVESTIGATING = 'INVESTIGATING',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
  ESCALATED = 'ESCALATED'
}

/**
 * Enhanced recovery strategies for enterprise environments
 */
export enum EnterpriseRecoveryStrategy {
  // Basic Strategies
  RETRY = 'RETRY',
  FALLBACK = 'FALLBACK',
  ESCALATE = 'ESCALATE',
  IGNORE = 'IGNORE',
  MANUAL_INTERVENTION = 'MANUAL_INTERVENTION',

  // Advanced Strategies
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER',
  BULKHEAD = 'BULKHEAD',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITING = 'RATE_LIMITING',
  LOAD_SHEDDING = 'LOAD_SHEDDING',
  GRACEFUL_DEGRADATION = 'GRACEFUL_DEGRADATION',
  FAILOVER = 'FAILOVER',
  ROLLBACK = 'ROLLBACK',

  // Enterprise Strategies
  BUSINESS_CONTINUITY = 'BUSINESS_CONTINUITY',
  DISASTER_RECOVERY = 'DISASTER_RECOVERY',
  AUTO_SCALING = 'AUTO_SCALING',
  RESOURCE_REBALANCING = 'RESOURCE_REBALANCING'
}

/**
 * Error notification urgency levels
 */
export enum NotificationUrgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY'
}

// ===== CORE ERROR CONTEXT =====

/**
 * Comprehensive error context for enterprise environments
 */
export interface EnterpriseErrorContext {
  /** Unique error identifier */
  errorId: string;

  /** Error correlation ID for tracing */
  correlationId: string;

  /** Parent error ID for error chains */
  parentErrorId?: string;

  /** Error timestamp with high precision */
  timestamp: Date;

  /** Error classification */
  classification: {
    category: EnterpriseErrorCategory;
    severity: EnterpriseErrorSeverity;
    impact: ErrorImpactLevel;
    urgency: ErrorUrgency;
    priority: number; // 1-100 scale
  };

  /** Source information */
  source: {
    service: string;
    component: string;
    method: string;
    fileName?: string;
    lineNumber?: number;
    version: string;
  };

  /** Environment context */
  environment: {
    stage: 'development' | 'testing' | 'staging' | 'production';
    region: string;
    availability_zone?: string;
    instance_id?: string;
    container_id?: string;
    pod_name?: string;
  };

  /** Request context */
  request?: {
    method: string;
    path: string;
    headers: Record<string, string>;
    query: Record<string, any>;
    body?: any;
    userAgent: string;
    ipAddress: string;
    sessionId?: string;
    requestId: string;
  };

  /** User context */
  user?: {
    userId: string;
    userRole: string;
    permissions: string[];
    organization?: string;
    department?: string;
    location?: string;
  };

  /** System context */
  system: {
    hostname: string;
    platform: string;
    architecture: string;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency?: number;
    loadAverage?: number[];
  };

  /** Business context */
  business?: {
    tenant?: string;
    businessUnit?: string;
    costCenter?: string;
    project?: string;
    workflow?: string;
    transaction?: string;
  };

  /** Security context */
  security?: {
    securityLevel: SecurityLevel;
    riskLevel: RiskLevel;
    threatIndicators: string[];
    complianceFlags: string[];
    dataClassification?: string;
  };

  /** Performance context */
  performance?: {
    duration: number;
    cpuTime: number;
    memoryPeak: number;
    ioOperations: number;
    databaseQueries: number;
    cacheHits: number;
    cacheMisses: number;
  };
}

/**
 * Error evidence for forensic analysis
 */
export interface ErrorEvidence {
  /** Evidence type */
  type: 'LOG' | 'METRIC' | 'TRACE' | 'SCREENSHOT' | 'DOCUMENT' | 'DATABASE_DUMP' | 'MEMORY_DUMP';

  /** Evidence content or reference */
  content?: string;
  fileReference?: string;

  /** Evidence metadata */
  metadata: {
    collectedAt: Date;
    collector: string;
    integrity: {
      checksum: string;
      algorithm: string;
    };
    retention: {
      retainUntil: Date;
      legalHold: boolean;
    };
  };

  /** Evidence classification */
  classification: {
    confidentiality: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
    integrity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    availability: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

/**
 * Error pattern for machine learning analysis
 */
export interface ErrorPattern {
  /** Pattern identifier */
  patternId: string;

  /** Pattern name */
  name: string;

  /** Pattern description */
  description: string;

  /** Pattern conditions */
  conditions: {
    errorMessage?: RegExp;
    category?: EnterpriseErrorCategory;
    severity?: EnterpriseErrorSeverity;
    source?: string;
    timeWindow?: number; // milliseconds
    frequency?: number;
    userGroup?: string[];
  };

  /** Pattern actions */
  actions: {
    notification?: {
      urgency: NotificationUrgency;
      channels: string[];
      recipients: string[];
    };
    recovery?: {
      strategy: EnterpriseRecoveryStrategy;
      parameters: Record<string, any>;
      timeout: number;
    };
    escalation?: {
      level: number;
      recipients: string[];
      timeout: number;
    };
  };

  /** Pattern statistics */
  statistics: {
    occurrences: number;
    lastOccurrence: Date;
    averageResolutionTime: number;
    successRate: number;
  };
}

/**
 * Error resolution tracking
 */
export interface ErrorResolution {
  /** Resolution identifier */
  resolutionId: string;

  /** Error identifier */
  errorId: string;

  /** Resolution status */
  status: ErrorResolutionStatus;

  /** Resolution timeline */
  timeline: {
    reported: Date;
    acknowledged?: Date;
    investigating?: Date;
    resolved?: Date;
    closed?: Date;
  };

  /** Resolution actions */
  actions: Array<{
    timestamp: Date;
    action: string;
    performer: string;
    result: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
    notes?: string;
  }>;

  /** Root cause analysis */
  rootCause?: {
    category: string;
    description: string;
    preventionMeasures: string[];
    lessonsLearned: string[];
  };

  /** Resolution metrics */
  metrics: {
    timeToAcknowledge?: number;
    timeToResolve?: number;
    effortHours?: number;
    cost?: number;
    customerImpact?: string;
  };
}

// ===== ML & AI INTERFACES =====

/**
 * Machine learning model for error prediction
 */
export interface ErrorPredictionModel {
  /** Model identifier */
  modelId: string;

  /** Model type */
  type: 'CLASSIFICATION' | 'REGRESSION' | 'CLUSTERING' | 'ANOMALY_DETECTION';

  /** Model configuration */
  config: {
    algorithm: string;
    features: string[];
    hyperparameters: Record<string, any>;
    trainingData: string;
    validationData: string;
  };

  /** Model performance */
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc?: number;
    lastTraining: Date;
    nextTraining: Date;
  };

  /** Model deployment */
  deployment: {
    version: string;
    deployedAt: Date;
    endpoint?: string;
    scalingConfig?: Record<string, any>;
  };
}

/**
 * AI-powered error insights
 */
export interface ErrorInsights {
  /** Insight identifier */
  insightId: string;

  /** Insight type */
  type: 'PREDICTION' | 'RECOMMENDATION' | 'ANOMALY' | 'TREND' | 'ROOT_CAUSE';

  /** Insight content */
  content: {
    title: string;
    description: string;
    confidence: number;
    evidence: string[];
    recommendations: string[];
  };

  /** Insight metadata */
  metadata: {
    generatedAt: Date;
    model: string;
    version: string;
    processingTime: number;
  };

  /** Impact assessment */
  impact: {
    probability: number;
    severity: EnterpriseErrorSeverity;
    timeFrame: string;
    affectedSystems: string[];
    businessImpact: string;
  };
}

// ===== ENTERPRISE METRICS =====

/**
 * Comprehensive error metrics for enterprise monitoring
 */
export interface ErrorMetrics {
  /** Time period for metrics */
  period: {
    start: Date;
    end: Date;
    duration: number;
  };

  /** Error counts */
  counts: {
    total: number;
    bySeverity: Record<EnterpriseErrorSeverity, number>;
    byCategory: Record<EnterpriseErrorCategory, number>;
    byService: Record<string, number>;
    byUser: Record<string, number>;
  };

  /** Error rates */
  rates: {
    errorRate: number; // errors per minute
    errorRatio: number; // errors / total requests
    criticalErrorRate: number;
    newErrorRate: number;
    recurringErrorRate: number;
  };

  /** Resolution metrics */
  resolution: {
    averageResolutionTime: number;
    medianResolutionTime: number;
    resolutionRate: number; // percentage resolved
    escalationRate: number;
    reopenRate: number;
  };

  /** Performance metrics */
  performance: {
    averageProcessingTime: number;
    memoryUsage: number;
    cpuUsage: number;
    throughput: number;
  };

  /** Business metrics */
  business: {
    customerImpact: number; // affected customers
    revenueImpact: number;
    slaViolations: number;
    complianceIssues: number;
  };

  /** Trending data */
  trends: {
    errorTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
    severityTrend: 'ESCALATING' | 'IMPROVING' | 'STABLE';
    resolutionTrend: 'IMPROVING' | 'DEGRADING' | 'STABLE';
    predictions: Array<{
      metric: string;
      prediction: number;
      confidence: number;
      timeFrame: string;
    }>;
  };
}

// ===== EXPORT TYPES =====

export type ErrorContextFilter = Partial<Pick<EnterpriseErrorContext,
  'classification' | 'source' | 'environment' | 'user' | 'security'
>>;

export type ErrorMetricsQuery = {
  timeRange: { start: Date; end: Date };
  filters?: ErrorContextFilter;
  groupBy?: Array<keyof EnterpriseErrorContext>;
  aggregations?: Array<'COUNT' | 'RATE' | 'AVERAGE' | 'MEDIAN' | 'PERCENTILE'>;
};