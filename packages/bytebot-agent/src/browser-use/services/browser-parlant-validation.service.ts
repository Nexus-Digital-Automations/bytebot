/**
 * Enhanced Browser-Use PARLANT Validation Service
 *
 * Comprehensive conversational validation service for browser automation operations
 * that provides security validation, risk assessment, and approval workflows for
 * all browser operations including session management, navigation, DOM interactions,
 * form operations, screenshot capture, and data extraction.
 *
 * Security Features:
 * - URL navigation safety validation with domain whitelisting
 * - Form interaction approval workflows with data sensitivity detection
 * - Screenshot and data collection privacy validation
 * - Cross-origin request validation with security boundary checks
 * - Content Security Policy integration for browser security
 * - Real-time risk assessment with dynamic security levels
 *
 * Integration Features:
 * - Seamless integration with existing Browser-Use API endpoints
 * - Performance optimization with intelligent caching and batch validation
 * - Comprehensive audit trails for compliance and monitoring
 * - WebSocket support for real-time validation feedback
 *
 * @fileoverview Enhanced Browser-Use PARLANT validation service
 * @version 2.0.0
 * @author Browser Security Integration Team
 */

import { Injectable } from '@nestjs/common';
import {
  ParlantCritical,
  ParlantSecure,
  ParlantValidated,
  ValidationMode,
  ApprovalLevel,
  RiskLevel,
  ParticipantRole,
} from '@bytebot/shared/dist/index-server';
import {
  ParlantConversationContext,
  ConversationalValidationError,
} from '../../../shared/src/types/parlant-integration.types';
import { ParlantIntegrationService } from '../../../shared/src/services/parlant-integration.service';

// ===========================
// BROWSER OPERATION INTERFACES
// ===========================

/**
 * Browser operation context for validation
 */
export interface BrowserOperationContext {
  /** Unique operation identifier */
  operationId: string;

  /** Browser session ID */
  sessionId: string;

  /** Operation type */
  operationType: BrowserOperationType;

  /** Target URL if applicable */
  targetUrl?: string;

  /** User context */
  userContext: {
    userId: string;
    roles: string[];
    sessionId: string;
    ipAddress: string;
  };

  /** Browser state information */
  browserState: BrowserStateInfo;

  /** Operation parameters */
  operationParams: Record<string, unknown>;

  /** Conversation context for validation */
  conversationContext?: ParlantConversationContext;
}

/**
 * Browser operation types
 */
export enum BrowserOperationType {
  SESSION_CREATE = 'session_create',
  SESSION_CLOSE = 'session_close',
  NAVIGATE = 'navigate',
  CLICK = 'click',
  TYPE = 'type',
  SCROLL = 'scroll',
  SCREENSHOT = 'screenshot',
  FORM_FILL = 'form_fill',
  FORM_SUBMIT = 'form_submit',
  DATA_EXTRACT = 'data_extract',
  FILE_UPLOAD = 'file_upload',
  FILE_DOWNLOAD = 'file_download',
  SCRIPT_EXECUTE = 'script_execute',
}

/**
 * Browser state information for risk assessment
 */
export interface BrowserStateInfo {
  /** Active browser sessions count */
  activeSessionsCount: number;

  /** Current page URL */
  currentUrl?: string;

  /** Page domain classification */
  domainClassification: DomainClassification;

  /** Security headers present */
  securityHeaders: string[];

  /** Recent suspicious activity */
  suspiciousActivityDetected: boolean;

  /** Resource usage metrics */
  resourceUsage: {
    memoryMB: number;
    cpuPercent: number;
    networkConnections: number;
  };

  /** Content Security Policy status */
  cspStatus: CSPStatus;

  /** Last security scan timestamp */
  lastSecurityScan: Date;
}

/**
 * Domain classification levels
 */
export enum DomainClassification {
  INTERNAL = 'internal',
  TRUSTED_EXTERNAL = 'trusted_external',
  EXTERNAL = 'external',
  SUSPICIOUS = 'suspicious',
  BLOCKED = 'blocked',
}

/**
 * Content Security Policy status
 */
export interface CSPStatus {
  present: boolean;
  policies: string[];
  violations: CSPViolation[];
  riskLevel: RiskLevel;
}

/**
 * CSP violation information
 */
export interface CSPViolation {
  directive: string;
  blockedUri: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Browser operation risk assessment
 */
export interface BrowserOperationRisk {
  /** Overall risk level */
  riskLevel: RiskLevel;

  /** Risk factors identified */
  riskFactors: RiskFactor[];

  /** Risk score (0-100) */
  riskScore: number;

  /** Recommended security level */
  recommendedSecurityLevel: SecurityLevel;

  /** Required approval level */
  requiredApprovalLevel: ApprovalLevel;

  /** Mitigation strategies */
  mitigationStrategies: string[];

  /** Monitoring recommendations */
  monitoringLevel: MonitoringLevel;
}

/**
 * Risk factor information
 */
export interface RiskFactor {
  /** Factor type */
  type: RiskFactorType;

  /** Factor description */
  description: string;

  /** Risk weight contribution */
  weight: number;

  /** Mitigation available */
  mitigatable: boolean;

  /** Evidence/context */
  evidence?: Record<string, unknown>;
}

/**
 * Risk factor types
 */
export enum RiskFactorType {
  EXTERNAL_DOMAIN = 'external_domain',
  SENSITIVE_DATA = 'sensitive_data',
  FORM_SUBMISSION = 'form_submission',
  FILE_OPERATION = 'file_operation',
  SCRIPT_EXECUTION = 'script_execution',
  CROSS_ORIGIN = 'cross_origin',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  HIGH_PRIVILEGE = 'high_privilege',
  PII_ACCESS = 'pii_access',
  FINANCIAL_DATA = 'financial_data',
}

/**
 * Monitoring levels
 */
export enum MonitoringLevel {
  BASIC = 'basic',
  ENHANCED = 'enhanced',
  COMPREHENSIVE = 'comprehensive',
  REAL_TIME = 'real_time',
}

/**
 * Browser operation validation result
 */
export interface BrowserOperationValidationResult {
  /** Validation approved */
  approved: boolean;

  /** Risk assessment */
  riskAssessment: BrowserOperationRisk;

  /** Conversation ID for this validation */
  conversationId: string;

  /** Validation reasoning */
  reasoning: string;

  /** Alternative suggestions if denied */
  alternatives?: string[];

  /** Execution constraints if approved */
  executionConstraints?: ExecutionConstraints;

  /** Monitoring requirements */
  monitoringRequirements: MonitoringRequirements;

  /** Validation metadata */
  _metadata: ValidationMetadata;
}

/**
 * Execution constraints for approved operations
 */
export interface ExecutionConstraints {
  /** Maximum execution time */
  timeoutMs?: number;

  /** Required security headers */
  requiredHeaders?: string[];

  /** URL restrictions */
  urlRestrictions?: URLRestrictions;

  /** Data handling restrictions */
  dataRestrictions?: DataRestrictions;

  /** Real-time monitoring required */
  realTimeMonitoring: boolean;
}

/**
 * URL restrictions
 */
export interface URLRestrictions {
  /** Allowed domains */
  allowedDomains?: string[];

  /** Blocked domains */
  blockedDomains?: string[];

  /** Protocol restrictions */
  allowedProtocols?: string[];

  /** Port restrictions */
  allowedPorts?: number[];
}

/**
 * Data handling restrictions
 */
export interface DataRestrictions {
  /** Maximum data size */
  maxDataSize?: number;

  /** Sensitive field exclusions */
  excludeFields?: string[];

  /** Data classification requirements */
  classificationRequired: boolean;

  /** Encryption requirements */
  encryptionRequired: boolean;
}

/**
 * Monitoring requirements
 */
export interface MonitoringRequirements {
  /** Monitoring level */
  level: MonitoringLevel;

  /** Screenshot capture required */
  screenshotCapture: boolean;

  /** Network traffic monitoring */
  networkMonitoring: boolean;

  /** Real-time alerts */
  realTimeAlerts: boolean;

  /** Audit trail requirements */
  auditTrail: AuditTrailRequirements;
}

/**
 * Audit trail requirements
 */
export interface AuditTrailRequirements {
  /** Include request/response data */
  includeRequestResponse: boolean;

  /** Include screenshots */
  includeScreenshots: boolean;

  /** Include network logs */
  includeNetworkLogs: boolean;

  /** Retention period (days) */
  retentionDays: number;

  /** Compliance flags */
  complianceFlags: string[];
}

/**
 * Validation metadata
 */
export interface ValidationMetadata {
  /** Validation start time */
  startTime: Date;

  /** Validation end time */
  endTime: Date;

  /** Processing time in milliseconds */
  processingTimeMs: number;

  /** Validation method used */
  validationMethod: ValidationMethod;

  /** Cache status */
  cacheStatus: 'hit' | 'miss' | 'disabled';

  /** Risk calculation details */
  riskCalculation: RiskCalculationDetails;

  /** Conversation participants */
  participants: ConversationParticipant[];
}

/**
 * Validation method types
 */
export enum ValidationMethod {
  AUTOMATED = 'automated',
  HUMAN_APPROVAL = 'human_approval',
  AI_CONVERSATION = 'ai_conversation',
  RULE_BASED = 'rule_based',
  HYBRID = 'hybrid',
}

/**
 * Risk calculation details
 */
export interface RiskCalculationDetails {
  /** Base risk score */
  baseRiskScore: number;

  /** Risk factors applied */
  factorsApplied: RiskFactor[];

  /** Final risk score */
  finalRiskScore: number;

  /** Risk calculation method */
  calculationMethod: string;

  /** Risk thresholds used */
  thresholds: RiskThresholds;
}

/**
 * Risk thresholds configuration
 */
export interface RiskThresholds {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

/**
 * Conversation participant information
 */
export interface ConversationParticipant {
  /** Participant ID */
  id: string;

  /** Participant role */
  role: ParticipantRole;

  /** Participation status */
  status: 'active' | 'inactive' | 'pending';

  /** Join timestamp */
  joinedAt: Date;

  /** Contribution to validation */
  contribution?: string;
}

// ===========================
// ENHANCED PARLANT VALIDATION SERVICE
// ===========================

@Injectable()
export class BrowserParlantValidationService {
  private readonly logger = new Logger(BrowserParlantValidationService.name);

  /** Risk thresholds for security levels */
  private readonly riskThresholds: RiskThresholds = {
    low: 30,
    medium: 60,
    high: 80,
    critical: 95,
  };

  /** Domain whitelist for trusted operations */
  private readonly trustedDomains = new Set([
    'localhost',
    '127.0.0.1',
    '*.local.dev',
    '*.internal.company.com',
  ]);

  /** Blocked domains for security */
  private readonly blockedDomains = new Set([
    'malicious-site.com',
    '*.suspicious-domain.net',
  ]);

  /** Validation cache for performance */
  private readonly validationCache = new Map<
    string,
    BrowserOperationValidationResult
  >();

  /** Active validations tracking */
  private readonly activeValidations = new Map<string, Date>();

  constructor(
    private readonly parlantIntegrationService: ParlantIntegrationService,
  ) {
    this.logger.log(
      'Enhanced Browser-Use PARLANT Validation Service initialized',
    );

    // Start cache cleanup
    this.startCacheCleanup();
  }

  /**
   * Validate browser session creation with security assessment
   */
  @ParlantSecure('Create browser session with security profile validation')
  async validateSessionCreation(
    _context: BrowserOperationContext,
  ): Promise<BrowserOperationValidationResult> {
    return this.performValidation(context, {
      operationType: BrowserOperationType.SESSION_CREATE,
      baseRiskLevel: RiskLevel.LOW,
      validationMode: ValidationMode._INTERACTIVE,
      securityLevel: SecurityLevel._MEDIUM,
    });
  }

  /**
   * Validate URL navigation with domain safety checks
   */
  @ParlantCritical(
    'Navigate browser to URL with security validation and domain restrictions',
  )
  async validateNavigation(
    _context: BrowserOperationContext,
  ): Promise<BrowserOperationValidationResult> {
    const targetUrl = context.targetUrl;
    if (!targetUrl) {
      throw new Error('Target URL required for navigation validation');
    }

    // Enhanced risk assessment for navigation
    const navigationRisk = await this.assessNavigationRisk(targetUrl, context);

    return this.performValidation(context, {
      operationType: BrowserOperationType.NAVIGATE,
      baseRiskLevel: navigationRisk.riskLevel,
      validationMode: ValidationMode._INTERACTIVE,
      securityLevel: navigationRisk.recommendedSecurityLevel,
      customRiskFactors: navigationRisk.riskFactors,
    });
  }

  /**
   * Validate DOM interactions with element safety checks
   */
  @ParlantCritical(
    'Validate DOM element interaction with security validation to prevent malicious actions',
  )
  async validateDOMInteraction(
    _context: BrowserOperationContext,
  ): Promise<BrowserOperationValidationResult> {
    const interactionRisk = await this.assessDOMInteractionRisk(context);

    return this.performValidation(context, {
      operationType: context.operationType,
      baseRiskLevel: interactionRisk.riskLevel,
      validationMode: ValidationMode._INTERACTIVE,
      securityLevel: interactionRisk.recommendedSecurityLevel,
      customRiskFactors: interactionRisk.riskFactors,
    });
  }

  /**
   * Validate form operations with data sensitivity analysis
   */
  @ParlantCritical(
    'Validate form interaction and submission with data sensitivity and approval workflows',
  )
  async validateFormOperation(
    _context: BrowserOperationContext,
  ): Promise<BrowserOperationValidationResult> {
    const formRisk = await this.assessFormOperationRisk(context);

    return this.performValidation(context, {
      operationType: context.operationType,
      baseRiskLevel: formRisk.riskLevel,
      validationMode: ValidationMode._INTERACTIVE,
      securityLevel: SecurityLevel._HIGH,
      approvalLevel: ApprovalLevel._DUAL_APPROVAL,
      customRiskFactors: formRisk.riskFactors,
    });
  }

  /**
   * Validate screenshot capture with privacy protection
   */
  @ParlantValidated({
    description:
      'Capture browser screenshot with privacy validation and data protection',
    securityLevel: SecurityLevel._HIGH,
    cacheable: false,
    timeout: 10000,
  })
  async validateScreenshotCapture(
    _context: BrowserOperationContext,
  ): Promise<BrowserOperationValidationResult> {
    const screenshotRisk = await this.assessScreenshotRisk(context);

    return this.performValidation(context, {
      operationType: BrowserOperationType.SCREENSHOT,
      baseRiskLevel: screenshotRisk.riskLevel,
      validationMode: ValidationMode._INTERACTIVE,
      securityLevel: SecurityLevel._HIGH,
      customRiskFactors: screenshotRisk.riskFactors,
    });
  }

  /**
   * Validate data extraction with compliance checks
   */
  @ParlantSecure(
    'Extract data from browser with privacy validation and compliance checks',
  )
  async validateDataExtraction(
    _context: BrowserOperationContext,
  ): Promise<BrowserOperationValidationResult> {
    const extractionRisk = await this.assessDataExtractionRisk(context);

    return this.performValidation(context, {
      operationType: BrowserOperationType.DATA_EXTRACT,
      baseRiskLevel: extractionRisk.riskLevel,
      validationMode: ValidationMode._INTERACTIVE,
      securityLevel: extractionRisk.recommendedSecurityLevel,
      customRiskFactors: extractionRisk.riskFactors,
    });
  }

  /**
   * Validate file operations with security scanning
   */
  @ParlantCritical(
    'Validate file upload/download operations with security scanning and malware detection',
  )
  async validateFileOperation(
    _context: BrowserOperationContext,
  ): Promise<BrowserOperationValidationResult> {
    const fileRisk = await this.assessFileOperationRisk(context);

    return this.performValidation(context, {
      operationType: context.operationType,
      baseRiskLevel: RiskLevel.HIGH,
      validationMode: ValidationMode._INTERACTIVE,
      securityLevel: SecurityLevel._CRITICAL,
      approvalLevel: ApprovalLevel._DUAL_APPROVAL,
      customRiskFactors: fileRisk.riskFactors,
    });
  }

  // ===========================
  // RISK ASSESSMENT METHODS
  // ===========================

  /**
   * Assess navigation risk based on target URL
   */
  private async assessNavigationRisk(
    targetUrl: string,
    _context: BrowserOperationContext,
  ): Promise<BrowserOperationRisk> {
    const riskFactors: RiskFactor[] = [];
    let riskScore = 10; // Base score

    try {
      const url = new URL(targetUrl);

      // Domain classification risk
      const domainClassification = this.classifyDomain(url.hostname);
      switch (domainClassification) {
        case DomainClassification.BLOCKED:
          riskScore += 50;
          riskFactors.push({
            type: RiskFactorType.EXTERNAL_DOMAIN,
            description: 'Navigation to blocked domain',
            weight: 50,
            mitigatable: false,
            evidence: {
              domain: url.hostname,
              classification: domainClassification,
            },
          });
          break;
        case DomainClassification.SUSPICIOUS:
          riskScore += 40;
          riskFactors.push({
            type: RiskFactorType.SUSPICIOUS_ACTIVITY,
            description: 'Navigation to suspicious domain',
            weight: 40,
            mitigatable: true,
            evidence: {
              domain: url.hostname,
              classification: domainClassification,
            },
          });
          break;
        case DomainClassification.EXTERNAL:
          riskScore += 20;
          riskFactors.push({
            type: RiskFactorType.EXTERNAL_DOMAIN,
            description: 'Navigation to external domain',
            weight: 20,
            mitigatable: true,
            evidence: {
              domain: url.hostname,
              classification: domainClassification,
            },
          });
          break;
      }

      // Protocol security
      if (url.protocol === 'http:') {
        riskScore += 15;
        riskFactors.push({
          type: RiskFactorType.EXTERNAL_DOMAIN,
          description: 'Insecure HTTP protocol',
          weight: 15,
          mitigatable: true,
          evidence: { protocol: url.protocol },
        });
      }

      // Port analysis
      if (url.port && !['80', '443', '8080', '8443'].includes(url.port)) {
        riskScore += 10;
        riskFactors.push({
          type: RiskFactorType.EXTERNAL_DOMAIN,
          description: 'Non-standard port usage',
          weight: 10,
          mitigatable: true,
          evidence: { port: url.port },
        });
      }

      // Sensitive path detection
      if (this.containsSensitiveKeywords(url.pathname)) {
        riskScore += 25;
        riskFactors.push({
          type: RiskFactorType.SENSITIVE_DATA,
          description: 'URL contains sensitive keywords',
          weight: 25,
          mitigatable: true,
          evidence: { path: url.pathname },
        });
      }
    } catch (error) {
      riskScore += 30;
      riskFactors.push({
        type: RiskFactorType.SUSPICIOUS_ACTIVITY,
        description: 'Invalid URL format',
        weight: 30,
        mitigatable: false,
        evidence: {
          url: targetUrl,
          _error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    return this.buildRiskAssessment(riskScore, riskFactors, 'navigation');
  }

  /**
   * Assess DOM interaction risk
   */
  private async assessDOMInteractionRisk(
    _context: BrowserOperationContext,
  ): Promise<BrowserOperationRisk> {
    const riskFactors: RiskFactor[] = [];
    let riskScore = 5; // Base score for DOM interactions

    // Check interaction type
    switch (context.operationType) {
      case BrowserOperationType.TYPE:
        riskScore += 15;
        riskFactors.push({
          type: RiskFactorType.SENSITIVE_DATA,
          description: 'Text input operation',
          weight: 15,
          mitigatable: true,
          evidence: { operationType: context.operationType },
        });
        break;
      case BrowserOperationType.CLICK:
        riskScore += 10;
        riskFactors.push({
          type: RiskFactorType.HIGH_PRIVILEGE,
          description: 'Click interaction',
          weight: 10,
          mitigatable: true,
          evidence: { operationType: context.operationType },
        });
        break;
    }

    // Check for sensitive selectors in operation params
    if (this.containsSensitiveSelectors(context.operationParams)) {
      riskScore += 20;
      riskFactors.push({
        type: RiskFactorType.SENSITIVE_DATA,
        description: 'Interaction with sensitive elements',
        weight: 20,
        mitigatable: true,
        evidence: { selectors: context.operationParams },
      });
    }

    return this.buildRiskAssessment(riskScore, riskFactors, 'dom_interaction');
  }

  /**
   * Assess form operation risk
   */
  private async assessFormOperationRisk(
    _context: BrowserOperationContext,
  ): Promise<BrowserOperationRisk> {
    const riskFactors: RiskFactor[] = [];
    let riskScore = 20; // Higher base score for form operations

    // Form submission is inherently higher risk
    if (context.operationType === BrowserOperationType.FORM_SUBMIT) {
      riskScore += 25;
      riskFactors.push({
        type: RiskFactorType.FORM_SUBMISSION,
        description: 'Form submission operation',
        weight: 25,
        mitigatable: true,
        evidence: { operationType: context.operationType },
      });
    }

    // Check for sensitive form fields
    if (this.containsSensitiveFormFields(context.operationParams)) {
      riskScore += 30;
      riskFactors.push({
        type: RiskFactorType.SENSITIVE_DATA,
        description: 'Form contains sensitive fields',
        weight: 30,
        mitigatable: true,
        evidence: { formData: this.sanitizeFormData(context.operationParams) },
      });
    }

    // Check for PII data
    if (this.containsPIIData(context.operationParams)) {
      riskScore += 35;
      riskFactors.push({
        type: RiskFactorType.PII_ACCESS,
        description: 'Form contains PII data',
        weight: 35,
        mitigatable: true,
        evidence: { piiDetected: true },
      });
    }

    // Check for financial data
    if (this.containsFinancialData(context.operationParams)) {
      riskScore += 40;
      riskFactors.push({
        type: RiskFactorType.FINANCIAL_DATA,
        description: 'Form contains financial data',
        weight: 40,
        mitigatable: true,
        evidence: { financialDataDetected: true },
      });
    }

    return this.buildRiskAssessment(riskScore, riskFactors, 'form_operation');
  }

  /**
   * Assess screenshot capture risk
   */
  private async assessScreenshotRisk(
    _context: BrowserOperationContext,
  ): Promise<BrowserOperationRisk> {
    const riskFactors: RiskFactor[] = [];
    let riskScore = 15; // Base score for screenshot operations

    // Check current page for sensitive content
    if (context.browserState.currentUrl) {
      const url = new URL(context.browserState.currentUrl);

      if (this.containsSensitiveKeywords(url.pathname)) {
        riskScore += 25;
        riskFactors.push({
          type: RiskFactorType.SENSITIVE_DATA,
          description: 'Screenshot of page with sensitive content',
          weight: 25,
          mitigatable: true,
          evidence: { url: context.browserState.currentUrl },
        });
      }

      // External domain screenshot
      if (this.classifyDomain(url.hostname) === DomainClassification.EXTERNAL) {
        riskScore += 15;
        riskFactors.push({
          type: RiskFactorType.EXTERNAL_DOMAIN,
          description: 'Screenshot of external domain',
          weight: 15,
          mitigatable: true,
          evidence: { domain: url.hostname },
        });
      }
    }

    // Check for high-resolution capture
    const captureParams = context.operationParams as {
      fullPage?: boolean;
      quality?: number;
    };
    if (captureParams.fullPage) {
      riskScore += 10;
      riskFactors.push({
        type: RiskFactorType.SENSITIVE_DATA,
        description: 'Full page screenshot capture',
        weight: 10,
        mitigatable: true,
        evidence: { fullPage: true },
      });
    }

    return this.buildRiskAssessment(riskScore, riskFactors, 'screenshot');
  }

  /**
   * Assess data extraction risk
   */
  private async assessDataExtractionRisk(
    _context: BrowserOperationContext,
  ): Promise<BrowserOperationRisk> {
    const riskFactors: RiskFactor[] = [];
    let riskScore = 20; // Base score for data extraction

    // Check extraction scope
    const extractionParams = context.operationParams as {
      selectors?: string[];
      extractAll?: boolean;
    };

    if (extractionParams.extractAll) {
      riskScore += 30;
      riskFactors.push({
        type: RiskFactorType.SENSITIVE_DATA,
        description: 'Full page data extraction',
        weight: 30,
        mitigatable: true,
        evidence: { extractAll: true },
      });
    }

    // Check selectors for sensitive data
    if (
      extractionParams.selectors &&
      this.containsSensitiveSelectors({ selectors: extractionParams.selectors })
    ) {
      riskScore += 25;
      riskFactors.push({
        type: RiskFactorType.SENSITIVE_DATA,
        description: 'Extraction targeting sensitive elements',
        weight: 25,
        mitigatable: true,
        evidence: { selectorCount: extractionParams.selectors.length },
      });
    }

    // External domain extraction
    if (context.browserState.currentUrl) {
      const url = new URL(context.browserState.currentUrl);
      if (this.classifyDomain(url.hostname) === DomainClassification.EXTERNAL) {
        riskScore += 20;
        riskFactors.push({
          type: RiskFactorType.EXTERNAL_DOMAIN,
          description: 'Data extraction from external domain',
          weight: 20,
          mitigatable: true,
          evidence: { domain: url.hostname },
        });
      }
    }

    return this.buildRiskAssessment(riskScore, riskFactors, 'data_extraction');
  }

  /**
   * Assess file operation risk
   */
  private async assessFileOperationRisk(
    _context: BrowserOperationContext,
  ): Promise<BrowserOperationRisk> {
    const riskFactors: RiskFactor[] = [];
    let riskScore = 30; // High base score for file operations

    // File operations are inherently risky
    riskFactors.push({
      type: RiskFactorType.FILE_OPERATION,
      description: 'File upload/download operation',
      weight: 30,
      mitigatable: true,
      evidence: { operationType: context.operationType },
    });

    // Check file type and size
    const fileParams = context.operationParams as {
      fileName?: string;
      fileSize?: number;
      fileType?: string;
    };

    if (fileParams.fileName && this.isExecutableFile(fileParams.fileName)) {
      riskScore += 40;
      riskFactors.push({
        type: RiskFactorType.FILE_OPERATION,
        description: 'Executable file operation',
        weight: 40,
        mitigatable: false,
        evidence: { fileName: fileParams.fileName },
      });
    }

    if (fileParams.fileSize && fileParams.fileSize > 100 * 1024 * 1024) {
      // 100MB
      riskScore += 20;
      riskFactors.push({
        type: RiskFactorType.FILE_OPERATION,
        description: 'Large file operation',
        weight: 20,
        mitigatable: true,
        evidence: { fileSize: fileParams.fileSize },
      });
    }

    return this.buildRiskAssessment(riskScore, riskFactors, 'file_operation');
  }

  // ===========================
  // VALIDATION EXECUTION
  // ===========================

  /**
   * Perform the actual validation with PARLANT integration
   */
  private async performValidation(
    _context: BrowserOperationContext,
    validationConfig: {
      operationType: BrowserOperationType;
      baseRiskLevel: RiskLevel;
      validationMode: ValidationMode;
      securityLevel: SecurityLevel;
      approvalLevel?: ApprovalLevel;
      customRiskFactors?: RiskFactor[];
    },
  ): Promise<BrowserOperationValidationResult> {
    const startTime = new Date();
    const operationId = context.operationId;

    this.logger.log(
      `Starting browser operation validation: ${validationConfig.operationType}`,
      {
        operationId,
        securityLevel: validationConfig.securityLevel,
        userId: context.userContext.userId,
      },
    );

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(context, validationConfig);
      const cached = this.validationCache.get(cacheKey);
      if (cached) {
        this.logger.debug(`Using cached validation _result: ${operationId}`);
        return {
          ...cached,
          _metadata: {
            ...cached.metadata,
            cacheStatus: 'hit',
          },
        };
      }

      // Build comprehensive risk assessment
      const riskAssessment = await this.buildComprehensiveRiskAssessment(
        context,
        validationConfig,
      );

      // Create PARLANT validation request
      const parlantRequest: ParlantValidationRequest = {
        operationId,
        functionName: `BrowserUse.${validationConfig.operationType}`,
        packageName: 'browser-use-security',
        description: this.generateOperationDescription(
          context,
          validationConfig,
        ),
        parameters: this.sanitizeParametersForValidation(
          context.operationParams,
        ),
        userContext: {
          userId: context.userContext.userId,
          roles: context.userContext.roles,
          sessionId: context.userContext.sessionId,
          ipAddress: context.userContext.ipAddress,
          _metadata: {
            browserState: this.sanitizeBrowserState(context.browserState),
            riskAssessment: riskAssessment,
            operationType: validationConfig.operationType,
            timestamp: startTime.getTime(),
          },
        },
        securityLevel: validationConfig.securityLevel,
        timeout: this.calculateValidationTimeout(riskAssessment.riskLevel),
      };

      // Perform PARLANT validation
      const parlantResponse =
        await this.parlantIntegrationService.validateFunction(parlantRequest);

      // Build validation result
      const validationResult: BrowserOperationValidationResult = {
        approved: parlantResponse.approved,
        riskAssessment,
        conversationId: parlantResponse.conversationId,
        reasoning: parlantResponse.reason || 'Validation completed',
        alternatives: parlantResponse.suggestedAlternatives,
        executionConstraints: this.buildExecutionConstraints(
          riskAssessment,
          parlantResponse,
        ),
        monitoringRequirements:
          this.buildMonitoringRequirements(riskAssessment),
        _metadata: {
          startTime,
          endTime: new Date(),
          processingTimeMs: Date.now() - startTime.getTime(),
          validationMethod: this.determineValidationMethod(riskAssessment),
          cacheStatus: 'miss',
          riskCalculation: {
            baseRiskScore:
              validationConfig.customRiskFactors?.reduce(
                (sum, f) => sum + f.weight,
                0,
              ) || 0,
            factorsApplied: riskAssessment.riskFactors,
            finalRiskScore: riskAssessment.riskScore,
            calculationMethod: 'weighted_factor_analysis',
            thresholds: this.riskThresholds,
          },
          participants: [], // TODO: Extract from conversation context
        },
      };

      // Cache successful validations
      if (validationResult.approved && this.shouldCacheResult(riskAssessment)) {
        this.validationCache.set(cacheKey, validationResult);
      }

      this.logger.log(
        `Browser operation validation completed: ${validationResult.approved ? 'APPROVED' : 'DENIED'}`,
        {
          operationId,
          approved: validationResult.approved,
          riskLevel: riskAssessment.riskLevel,
          riskScore: riskAssessment.riskScore,
          processingTimeMs: validationResult.metadata.processingTimeMs,
        },
      );

      return validationResult;
    } catch (error) {
      this.logger.error(`Browser operation validation failed: ${operationId}`, {
        _error: error instanceof Error ? error.message : String(error),
        operationType: validationConfig.operationType,
      });

      throw new ConversationalValidationError(
        `validation_error_${operationId}`,
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
        [],
      );
    } finally {
      this.activeValidations.delete(operationId);
    }
  }

  // ===========================
  // HELPER METHODS
  // ===========================

  /**
   * Build comprehensive risk assessment
   */
  private async buildComprehensiveRiskAssessment(
    _context: BrowserOperationContext,
    validationConfig: {
      baseRiskLevel: RiskLevel;
      customRiskFactors?: RiskFactor[];
    },
  ): Promise<BrowserOperationRisk> {
    let riskScore = this.getRiskLevelScore(validationConfig.baseRiskLevel);
    const riskFactors = validationConfig.customRiskFactors || [];

    // Add context-based risk factors
    if (context.browserState.suspiciousActivityDetected) {
      riskScore += 30;
      riskFactors.push({
        type: RiskFactorType.SUSPICIOUS_ACTIVITY,
        description: 'Suspicious browser activity detected',
        weight: 30,
        mitigatable: false,
        evidence: { detected: true },
      });
    }

    // Resource usage risk
    if (context.browserState.resourceUsage.memoryMB > 1000) {
      riskScore += 15;
      riskFactors.push({
        type: RiskFactorType.HIGH_PRIVILEGE,
        description: 'High memory usage detected',
        weight: 15,
        mitigatable: true,
        evidence: { memoryMB: context.browserState.resourceUsage.memoryMB },
      });
    }

    // Multiple active sessions
    if (context.browserState.activeSessionsCount > 5) {
      riskScore += 10;
      riskFactors.push({
        type: RiskFactorType.HIGH_PRIVILEGE,
        description: 'Multiple active browser sessions',
        weight: 10,
        mitigatable: true,
        evidence: { sessionCount: context.browserState.activeSessionsCount },
      });
    }

    return this.buildRiskAssessment(riskScore, riskFactors, 'comprehensive');
  }

  /**
   * Build risk assessment from score and factors
   */
  private buildRiskAssessment(
    riskScore: number,
    riskFactors: RiskFactor[],
    _assessmentType: string,
  ): BrowserOperationRisk {
    // Ensure score is within bounds
    riskScore = Math.min(100, Math.max(0, riskScore));

    const riskLevel = this.determineRiskLevel(riskScore);
    const recommendedSecurityLevel =
      this.getRecommendedSecurityLevel(riskLevel);
    const requiredApprovalLevel = this.getRequiredApprovalLevel(riskLevel);
    const mitigationStrategies = this.generateMitigationStrategies(riskFactors);
    const monitoringLevel = this.getMonitoringLevel(riskLevel);

    return {
      riskLevel,
      riskFactors,
      riskScore,
      recommendedSecurityLevel,
      requiredApprovalLevel,
      mitigationStrategies,
      monitoringLevel,
    };
  }

  /**
   * Classify domain based on trust level
   */
  private classifyDomain(hostname: string): DomainClassification {
    // Check blocked list first
    if (this.isDomainInSet(hostname, this.blockedDomains)) {
      return DomainClassification.BLOCKED;
    }

    // Check trusted list
    if (this.isDomainInSet(hostname, this.trustedDomains)) {
      return DomainClassification.INTERNAL;
    }

    // Check for suspicious indicators
    if (this.hasSuspiciousIndicators(hostname)) {
      return DomainClassification.SUSPICIOUS;
    }

    // Default to external for unknown domains
    return DomainClassification.EXTERNAL;
  }

  /**
   * Check if domain is in a set (supports wildcards)
   */
  private isDomainInSet(hostname: string, domainSet: Set<string>): boolean {
    // Direct match
    if (domainSet.has(hostname)) {
      return true;
    }

    // Wildcard match
    for (const domain of domainSet) {
      if (domain.startsWith('*.')) {
        const suffix = domain.substring(2);
        if (hostname.endsWith(suffix)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check for suspicious domain indicators
   */
  private hasSuspiciousIndicators(hostname: string): boolean {
    const suspiciousPatterns = [
      /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IP addresses
      /[0-9]+\..*\..*/, // Domains starting with numbers
      /.*-.*-.*-.*/, // Multiple hyphens
      /.*\.tk$|.*\.ml$|.*\.ga$/, // Suspicious TLDs
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(hostname));
  }

  /**
   * Check if URL contains sensitive keywords
   */
  private containsSensitiveKeywords(path: string): boolean {
    const sensitiveKeywords = [
      'admin',
      'password',
      'auth',
      'login',
      'secret',
      'private',
      'api-key',
      'token',
      'credential',
      'config',
      'settings',
      'personal',
      'profile',
      'account',
      'payment',
      'billing',
    ];

    const lowerPath = path.toLowerCase();
    return sensitiveKeywords.some((keyword) => lowerPath.includes(keyword));
  }

  /**
   * Check for sensitive selectors
   */
  private containsSensitiveSelectors(params: Record<string, unknown>): boolean {
    const selectors =
      (params.selectors as string[]) || params.selector
        ? [params.selector as string]
        : [];
    const sensitiveSelectors = [
      'input[type="password"]',
      'input[type="email"]',
      '[data-sensitive]',
      '.password',
      '#password',
      '.credit-card',
      '.ssn',
      '.personal-info',
    ];

    return selectors.some((selector) =>
      sensitiveSelectors.some(
        (sensitive) =>
          typeof selector === 'string' && selector.includes(sensitive),
      ),
    );
  }

  /**
   * Check for sensitive form fields
   */
  private containsSensitiveFormFields(
    params: Record<string, unknown>,
  ): boolean {
    const formData = (params.formData as Record<string, unknown>) || {};
    const sensitiveFields = [
      'password',
      'creditcard',
      'ssn',
      'social',
      'email',
      'phone',
      'address',
      'name',
      'dob',
      'birthdate',
    ];

    return Object.keys(formData).some((field) =>
      sensitiveFields.some((sensitive) =>
        field.toLowerCase().includes(sensitive),
      ),
    );
  }

  /**
   * Check for PII data
   */
  private containsPIIData(params: Record<string, unknown>): boolean {
    const formData = (params.formData as Record<string, unknown>) || {};
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN pattern
      /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/, // Credit card pattern
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email pattern
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone pattern
    ];

    const dataString = JSON.stringify(formData);
    return piiPatterns.some((pattern) => pattern.test(dataString));
  }

  /**
   * Check for financial data
   */
  private containsFinancialData(params: Record<string, unknown>): boolean {
    const formData = (params.formData as Record<string, unknown>) || {};
    const financialKeywords = [
      'account',
      'routing',
      'bank',
      'credit',
      'debit',
      'card',
      'payment',
      'billing',
      'financial',
      'money',
    ];

    const dataString = JSON.stringify(formData).toLowerCase();
    return financialKeywords.some((keyword) => dataString.includes(keyword));
  }

  /**
   * Check if file is executable
   */
  private isExecutableFile(fileName: string): boolean {
    const executableExtensions = [
      '.exe',
      '.bat',
      '.cmd',
      '.com',
      '.scr',
      '.pif',
      '.sh',
      '.bash',
      '.zsh',
      '.ps1',
      '.vbs',
      '.js',
      '.jar',
      '.app',
      '.dmg',
      '.pkg',
    ];

    const extension = fileName
      .toLowerCase()
      .substring(fileName.lastIndexOf('.'));
    return executableExtensions.includes(extension);
  }

  /**
   * Sanitize form data for logging
   */
  private sanitizeFormData(
    params: Record<string, unknown>,
  ): Record<string, unknown> {
    const formData = (params.formData as Record<string, unknown>) || {};
    const sanitized: Record<string, unknown> = {};

    Object.entries(formData).forEach(([key, value]) => {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Check if field is sensitive
   */
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'creditcard',
      'ssn',
      'social',
      'cvv',
      'pin',
    ];

    return sensitiveFields.some((sensitive) =>
      fieldName.toLowerCase().includes(sensitive),
    );
  }

  /**
   * Get risk level score for calculation
   */
  private getRiskLevelScore(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case RiskLevel.MINIMAL:
        return 5;
      case RiskLevel.LOW:
        return 15;
      case RiskLevel.MEDIUM:
        return 35;
      case RiskLevel.HIGH:
        return 65;
      case RiskLevel.CRITICAL:
        return 85;
      default:
        return 25;
    }
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= this.riskThresholds.critical) return RiskLevel.CRITICAL;
    if (riskScore >= this.riskThresholds.high) return RiskLevel.HIGH;
    if (riskScore >= this.riskThresholds.medium) return RiskLevel.MEDIUM;
    if (riskScore >= this.riskThresholds.low) return RiskLevel.LOW;
    return RiskLevel.MINIMAL;
  }

  /**
   * Get recommended security level
   */
  private getRecommendedSecurityLevel(riskLevel: RiskLevel): SecurityLevel {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return SecurityLevel._CRITICAL;
      case RiskLevel.HIGH:
        return SecurityLevel._HIGH;
      case RiskLevel.MEDIUM:
        return SecurityLevel._MEDIUM;
      case RiskLevel.LOW:
        return SecurityLevel._LOW;
      default:
        return SecurityLevel._MEDIUM;
    }
  }

  /**
   * Get required approval level
   */
  private getRequiredApprovalLevel(riskLevel: RiskLevel): ApprovalLevel {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return ApprovalLevel._UNANIMOUS_APPROVAL;
      case RiskLevel.HIGH:
        return ApprovalLevel._DUAL_APPROVAL;
      case RiskLevel.MEDIUM:
        return ApprovalLevel._SINGLE_APPROVAL;
      default:
        return ApprovalLevel._AUTOMATIC;
    }
  }

  /**
   * Generate mitigation strategies
   */
  private generateMitigationStrategies(riskFactors: RiskFactor[]): string[] {
    const strategies = new Set<string>();

    riskFactors.forEach((factor) => {
      switch (factor.type) {
        case RiskFactorType.EXTERNAL_DOMAIN:
          strategies.add('domain_verification');
          strategies.add('ssl_certificate_validation');
          break;
        case RiskFactorType.SENSITIVE_DATA:
          strategies.add('data_encryption');
          strategies.add('access_logging');
          break;
        case RiskFactorType.FORM_SUBMISSION:
          strategies.add('input_validation');
          strategies.add('csrf_protection');
          break;
        case RiskFactorType.FILE_OPERATION:
          strategies.add('antivirus_scanning');
          strategies.add('file_type_validation');
          break;
        default:
          strategies.add('enhanced_monitoring');
      }
    });

    return Array.from(strategies);
  }

  /**
   * Get monitoring level for risk
   */
  private getMonitoringLevel(riskLevel: RiskLevel): MonitoringLevel {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return MonitoringLevel.REAL_TIME;
      case RiskLevel.HIGH:
        return MonitoringLevel.COMPREHENSIVE;
      case RiskLevel.MEDIUM:
        return MonitoringLevel.ENHANCED;
      default:
        return MonitoringLevel.BASIC;
    }
  }

  /**
   * Generate operation description for validation
   */
  private generateOperationDescription(
    _context: BrowserOperationContext,
    validationConfig: { operationType: BrowserOperationType },
  ): string {
    const operation = validationConfig.operationType;
    const url =
      context.targetUrl || context.browserState.currentUrl || 'unknown';

    switch (operation) {
      case BrowserOperationType.NAVIGATE:
        return `Navigate browser to ${url}`;
      case BrowserOperationType.CLICK:
        return `Click element on page ${url}`;
      case BrowserOperationType.TYPE:
        return `Type text into form field on ${url}`;
      case BrowserOperationType.FORM_SUBMIT:
        return `Submit form on page ${url}`;
      case BrowserOperationType.SCREENSHOT:
        return `Capture screenshot of page ${url}`;
      case BrowserOperationType.DATA_EXTRACT:
        return `Extract data from page ${url}`;
      default:
        return `Perform ${operation} operation on ${url}`;
    }
  }

  /**
   * Sanitize parameters for validation
   */
  private sanitizeParametersForValidation(
    params: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    Object.entries(params).forEach(([key, value]) => {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeParametersForValidation(
          value as Record<string, unknown>,
        );
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Sanitize browser state for validation
   */
  private sanitizeBrowserState(
    browserState: BrowserStateInfo,
  ): Record<string, unknown> {
    return {
      activeSessionsCount: browserState.activeSessionsCount,
      domainClassification: browserState.domainClassification,
      resourceUsage: browserState.resourceUsage,
      suspiciousActivityDetected: browserState.suspiciousActivityDetected,
      cspStatus: {
        present: browserState.cspStatus.present,
        riskLevel: browserState.cspStatus.riskLevel,
      },
    };
  }

  /**
   * Calculate validation timeout based on risk
   */
  private calculateValidationTimeout(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return 60000; // 60 seconds
      case RiskLevel.HIGH:
        return 30000; // 30 seconds
      case RiskLevel.MEDIUM:
        return 15000; // 15 seconds
      default:
        return 10000; // 10 seconds
    }
  }

  /**
   * Build execution constraints
   */
  private buildExecutionConstraints(
    riskAssessment: BrowserOperationRisk,
    _parlantResponse: ParlantValidationResponse,
  ): ExecutionConstraints {
    const constraints: ExecutionConstraints = {
      realTimeMonitoring:
        riskAssessment.riskLevel === RiskLevel.CRITICAL ||
        riskAssessment.riskLevel === RiskLevel.HIGH,
    };

    // Add timeout for high-risk operations
    if (
      riskAssessment.riskLevel === RiskLevel.HIGH ||
      riskAssessment.riskLevel === RiskLevel.CRITICAL
    ) {
      constraints.timeoutMs = 30000;
    }

    // Add URL restrictions for external domains
    if (
      riskAssessment.riskFactors.some(
        (f) => f.type === RiskFactorType.EXTERNAL_DOMAIN,
      )
    ) {
      constraints.urlRestrictions = {
        allowedProtocols: ['https'],
        allowedPorts: [443, 80],
      };
    }

    // Add data restrictions for sensitive operations
    if (
      riskAssessment.riskFactors.some(
        (f) => f.type === RiskFactorType.SENSITIVE_DATA,
      )
    ) {
      constraints.dataRestrictions = {
        maxDataSize: 10 * 1024 * 1024, // 10MB
        excludeFields: ['password', 'token', 'secret'],
        classificationRequired: true,
        encryptionRequired: true,
      };
    }

    return constraints;
  }

  /**
   * Build monitoring requirements
   */
  private buildMonitoringRequirements(
    riskAssessment: BrowserOperationRisk,
  ): MonitoringRequirements {
    const level = riskAssessment.monitoringLevel;

    return {
      level,
      screenshotCapture:
        level === MonitoringLevel.COMPREHENSIVE ||
        level === MonitoringLevel.REAL_TIME,
      networkMonitoring:
        level === MonitoringLevel.ENHANCED ||
        level === MonitoringLevel.COMPREHENSIVE ||
        level === MonitoringLevel.REAL_TIME,
      realTimeAlerts: level === MonitoringLevel.REAL_TIME,
      auditTrail: {
        includeRequestResponse: true,
        includeScreenshots:
          level === MonitoringLevel.COMPREHENSIVE ||
          level === MonitoringLevel.REAL_TIME,
        includeNetworkLogs: level === MonitoringLevel.REAL_TIME,
        retentionDays: this.getRetentionDays(riskAssessment.riskLevel),
        complianceFlags: this.generateComplianceFlags(riskAssessment),
      },
    };
  }

  /**
   * Get retention days based on risk level
   */
  private getRetentionDays(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return 2555; // 7 years
      case RiskLevel.HIGH:
        return 1825; // 5 years
      case RiskLevel.MEDIUM:
        return 1095; // 3 years
      default:
        return 365; // 1 year
    }
  }

  /**
   * Generate compliance flags
   */
  private generateComplianceFlags(
    riskAssessment: BrowserOperationRisk,
  ): string[] {
    const flags: string[] = [];

    if (
      riskAssessment.riskFactors.some(
        (f) => f.type === RiskFactorType.PII_ACCESS,
      )
    ) {
      flags.push('GDPR', 'CCPA', 'PII_PROCESSING');
    }

    if (
      riskAssessment.riskFactors.some(
        (f) => f.type === RiskFactorType.FINANCIAL_DATA,
      )
    ) {
      flags.push('PCI_DSS', 'SOX', 'FINANCIAL_DATA');
    }

    if (riskAssessment.riskLevel === RiskLevel.CRITICAL) {
      flags.push('HIGH_RISK_OPERATION', 'EXECUTIVE_REVIEW');
    }

    return flags;
  }

  /**
   * Determine validation method
   */
  private determineValidationMethod(
    riskAssessment: BrowserOperationRisk,
  ): ValidationMethod {
    if (riskAssessment.riskLevel === RiskLevel.CRITICAL) {
      return ValidationMethod.HUMAN_APPROVAL;
    }
    if (riskAssessment.riskLevel === RiskLevel.HIGH) {
      return ValidationMethod.AI_CONVERSATION;
    }
    if (riskAssessment.riskLevel === RiskLevel.MEDIUM) {
      return ValidationMethod.HYBRID;
    }
    if (riskAssessment.riskLevel === RiskLevel.LOW) {
      return ValidationMethod.RULE_BASED;
    }
    return ValidationMethod.AUTOMATED;
  }

  /**
   * Generate cache key for validation
   */
  private generateCacheKey(
    _context: BrowserOperationContext,
    validationConfig: any,
  ): string {
    const keyData = {
      operationType: validationConfig.operationType,
      userId: context.userContext.userId,
      targetUrl: context.targetUrl,
      securityLevel: validationConfig.securityLevel,
      // Include a hash of operation parameters (sanitized)
      paramsHash: this.hashObject(
        this.sanitizeParametersForValidation(context.operationParams),
      ),
    };

    return `browser_validation_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  /**
   * Hash object for cache key generation
   */
  private hashObject(obj: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64').substring(0, 16);
  }

  /**
   * Should cache validation result
   */
  private shouldCacheResult(riskAssessment: BrowserOperationRisk): boolean {
    // Don't cache high-risk operations
    return (
      riskAssessment.riskLevel === RiskLevel.LOW ||
      riskAssessment.riskLevel === RiskLevel.MINIMAL
    );
  }

  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = new Date();
      let cleaned = 0;

      for (const [key, result] of this.validationCache.entries()) {
        // Remove entries older than 5 minutes
        if (now.getTime() - result.metadata.startTime.getTime() > 300000) {
          this.validationCache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.debug(
          `Cleaned ${cleaned} expired validation cache entries`,
        );
      }
    }, 60000); // Run every minute
  }

  /**
   * Get validation statistics for monitoring
   */
  public getValidationStatistics() {
    return {
      cacheSize: this.validationCache.size,
      activeValidations: this.activeValidations.size,
      riskThresholds: this.riskThresholds,
      trustedDomainsCount: this.trustedDomains.size,
      blockedDomainsCount: this.blockedDomains.size,
    };
  }
}
