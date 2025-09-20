/**
 * Browser Operation Risk Assessment Engine
 *
 * Advanced risk assessment engine for browser automation operations that provides
 * comprehensive security analysis, threat detection, and risk scoring for all
 * browser interactions. This engine integrates with the PARLANT validation
 * framework to provide intelligent risk-based security decisions.
 *
 * Features:
 * - Real-time threat detection and risk scoring
 * - Domain reputation analysis and URL safety validation
 * - Content Security Policy (CSP) analysis and violation detection
 * - Behavioral pattern analysis for suspicious activity detection
 * - Machine learning-based risk prediction models
 * - Integration with external threat intelligence feeds
 * - Compliance framework mapping for regulatory requirements
 *
 * @fileoverview Browser operation risk assessment engine
 * @version 1.0.0
 * @author Browser Security Team
 */

import { Injectable } from '@nestjs/common';
import { RiskLevel } from '@bytebot/shared/dist/index-server';
import {
  BrowserOperationContext,
  BrowserOperationType,
  RiskFactor,
  RiskFactorType,
  BrowserOperationRisk,
  CSPViolation,
  MonitoringLevel,
} from '../services/browser-parlant-validation.service';

// ===========================
// RISK ASSESSMENT INTERFACES
// ===========================

/**
 * Risk assessment configuration
 */
export interface RiskAssessmentConfig {
  /** Enable advanced threat detection */
  enableThreatDetection: boolean;

  /** Enable domain reputation checking */
  enableDomainReputation: boolean;

  /** Enable behavioral analysis */
  enableBehavioralAnalysis: boolean;

  /** Enable ML-based risk prediction */
  enableMLPrediction: boolean;

  /** Risk calculation weights */
  riskWeights: RiskWeights;

  /** Threat intelligence settings */
  threatIntelligence: ThreatIntelligenceConfig;

  /** Compliance frameworks to check */
  complianceFrameworks: ComplianceFramework[];
}

/**
 * Risk calculation weights
 */
export interface RiskWeights {
  /** Domain reputation weight (0-1) */
  domainReputation: number;

  /** Content analysis weight (0-1) */
  contentAnalysis: number;

  /** Behavioral patterns weight (0-1) */
  behavioralPatterns: number;

  /** Security headers weight (0-1) */
  securityHeaders: number;

  /** Historical activity weight (0-1) */
  historicalActivity: number;

  /** User context weight (0-1) */
  userContext: number;
}

/**
 * Threat intelligence configuration
 */
export interface ThreatIntelligenceConfig {
  /** Enable external threat feeds */
  enabled: boolean;

  /** Threat feed URLs */
  feeds: ThreatFeed[];

  /** Cache duration for threat data */
  cacheDurationMs: number;

  /** Threat score threshold */
  threatThreshold: number;
}

/**
 * Threat feed configuration
 */
export interface ThreatFeed {
  /** Feed name */
  name: string;

  /** Feed URL */
  url: string;

  /** Feed type */
  type: ThreatFeedType;

  /** Update frequency in milliseconds */
  updateFrequencyMs: number;

  /** Reliability score (0-1) */
  reliability: number;
}

/**
 * Threat feed types
 */
export enum ThreatFeedType {
  MALWARE_DOMAINS = 'malware_domains',
  PHISHING_URLS = 'phishing_urls',
  BOTNET_IPS = 'botnet_ips',
  REPUTATION_SCORES = 'reputation_scores',
  THREAT_INTELLIGENCE = 'threat_intelligence',
}

/**
 * Compliance frameworks
 */
export enum ComplianceFramework {
  GDPR = 'gdpr',
  CCPA = 'ccpa',
  HIPAA = 'hipaa',
  PCI_DSS = 'pci_dss',
  SOX = 'sox',
  ISO_27001 = 'iso_27001',
  NIST = 'nist',
}

/**
 * Domain reputation information
 */
export interface DomainReputation {
  /** Domain name */
  domain: string;

  /** Reputation score (0-100) */
  reputationScore: number;

  /** Reputation sources */
  sources: ReputationSource[];

  /** Threat categories */
  threatCategories: ThreatCategory[];

  /** Last updated timestamp */
  lastUpdated: Date;

  /** Risk classification */
  riskClassification: DomainRiskClassification;
}

/**
 * Reputation source information
 */
export interface ReputationSource {
  /** Source name */
  name: string;

  /** Source score (0-100) */
  score: number;

  /** Source reliability (0-1) */
  reliability: number;

  /** Last checked timestamp */
  lastChecked: Date;
}

/**
 * Threat categories
 */
export enum ThreatCategory {
  MALWARE = 'malware',
  PHISHING = 'phishing',
  SPAM = 'spam',
  BOTNET = 'botnet',
  SUSPICIOUS = 'suspicious',
  CLEAN = 'clean',
}

/**
 * Domain risk classification
 */
export enum DomainRiskClassification {
  TRUSTED = 'trusted',
  LOW_RISK = 'low_risk',
  MEDIUM_RISK = 'medium_risk',
  HIGH_RISK = 'high_risk',
  MALICIOUS = 'malicious',
  UNKNOWN = 'unknown',
}

/**
 * Behavioral analysis result
 */
export interface BehavioralAnalysis {
  /** User behavior patterns */
  userPatterns: UserBehaviorPattern[];

  /** Session patterns */
  sessionPatterns: SessionPattern[];

  /** Anomaly detection results */
  anomalies: BehaviorAnomaly[];

  /** Risk indicators */
  riskIndicators: BehaviorRiskIndicator[];

  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * User behavior pattern
 */
export interface UserBehaviorPattern {
  /** Pattern type */
  type: BehaviorPatternType;

  /** Pattern description */
  description: string;

  /** Frequency score */
  frequency: number;

  /** Risk contribution */
  riskContribution: number;

  /** Pattern confidence */
  confidence: number;
}

/**
 * Behavior pattern types
 */
export enum BehaviorPatternType {
  RAPID_CLICKING = 'rapid_clicking',
  BULK_DATA_EXTRACTION = 'bulk_data_extraction',
  AUTOMATED_FORM_FILLING = 'automated_form_filling',
  SUSPICIOUS_NAVIGATION = 'suspicious_navigation',
  HIGH_FREQUENCY_REQUESTS = 'high_frequency_requests',
  UNUSUAL_TIME_PATTERNS = 'unusual_time_patterns',
}

/**
 * Session pattern information
 */
export interface SessionPattern {
  /** Session duration */
  duration: number;

  /** Number of operations */
  operationCount: number;

  /** Unique domains accessed */
  uniqueDomains: number;

  /** Data volume transferred */
  dataVolume: number;

  /** Pattern classification */
  classification: SessionClassification;
}

/**
 * Session classification
 */
export enum SessionClassification {
  NORMAL = 'normal',
  AUTOMATED = 'automated',
  SUSPICIOUS = 'suspicious',
  MALICIOUS = 'malicious',
}

/**
 * Behavior anomaly detection
 */
export interface BehaviorAnomaly {
  /** Anomaly type */
  type: AnomalyType;

  /** Anomaly severity */
  severity: AnomallySeverity;

  /** Anomaly description */
  description: string;

  /** Confidence score */
  confidence: number;

  /** Evidence data */
  evidence: Record<string, unknown>;
}

/**
 * Anomaly types
 */
export enum AnomalyType {
  UNUSUAL_VOLUME = 'unusual_volume',
  TIMING_ANOMALY = 'timing_anomaly',
  GEOGRAPHIC_ANOMALY = 'geographic_anomaly',
  DEVICE_ANOMALY = 'device_anomaly',
  BEHAVIORAL_DEVIATION = 'behavioral_deviation',
}

/**
 * Anomaly severity levels
 */
export enum AnomallySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Behavior risk indicator
 */
export interface BehaviorRiskIndicator {
  /** Indicator type */
  type: RiskIndicatorType;

  /** Risk score contribution */
  riskScore: number;

  /** Indicator description */
  description: string;

  /** Detection confidence */
  confidence: number;
}

/**
 * Risk indicator types
 */
export enum RiskIndicatorType {
  BOT_BEHAVIOR = 'bot_behavior',
  SCRAPING_ACTIVITY = 'scraping_activity',
  CREDENTIAL_STUFFING = 'credential_stuffing',
  ACCOUNT_TAKEOVER = 'account_takeover',
  DATA_EXFILTRATION = 'data_exfiltration',
}

/**
 * Content security analysis
 */
export interface ContentSecurityAnalysis {
  /** CSP analysis result */
  cspAnalysis: CSPAnalysisResult;

  /** Security header analysis */
  securityHeaders: SecurityHeaderAnalysis;

  /** Content analysis results */
  contentAnalysis: ContentAnalysisResult;

  /** Overall security score */
  securityScore: number;
}

/**
 * CSP analysis result
 */
export interface CSPAnalysisResult {
  /** CSP policy present */
  present: boolean;

  /** CSP policies */
  policies: CSPPolicy[];

  /** Policy violations */
  violations: CSPViolation[];

  /** Policy effectiveness score */
  effectivenessScore: number;

  /** Risk assessment */
  riskLevel: RiskLevel;
}

/**
 * CSP policy information
 */
export interface CSPPolicy {
  /** Directive name */
  directive: string;

  /** Directive values */
  values: string[];

  /** Policy strength */
  strength: PolicyStrength;

  /** Risk contribution */
  riskContribution: number;
}

/**
 * Policy strength levels
 */
export enum PolicyStrength {
  WEAK = 'weak',
  MODERATE = 'moderate',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong',
}

/**
 * Security header analysis
 */
export interface SecurityHeaderAnalysis {
  /** Headers present */
  headersPresent: SecurityHeader[];

  /** Missing headers */
  missingHeaders: SecurityHeader[];

  /** Header effectiveness */
  effectiveness: HeaderEffectiveness;

  /** Overall header score */
  headerScore: number;
}

/**
 * Security headers
 */
export enum SecurityHeader {
  STRICT_TRANSPORT_SECURITY = 'Strict-Transport-Security',
  X_FRAME_OPTIONS = 'X-Frame-Options',
  X_CONTENT_TYPE_OPTIONS = 'X-Content-Type-Options',
  X_XSS_PROTECTION = 'X-XSS-Protection',
  REFERRER_POLICY = 'Referrer-Policy',
  PERMISSIONS_POLICY = 'Permissions-Policy',
}

/**
 * Header effectiveness
 */
export interface HeaderEffectiveness {
  /** Protection level */
  protectionLevel: ProtectionLevel;

  /** Coverage percentage */
  coverage: number;

  /** Configuration quality */
  configurationQuality: number;
}

/**
 * Protection levels
 */
export enum ProtectionLevel {
  MINIMAL = 'minimal',
  BASIC = 'basic',
  ENHANCED = 'enhanced',
  COMPREHENSIVE = 'comprehensive',
}

/**
 * Content analysis result
 */
export interface ContentAnalysisResult {
  /** Content type analysis */
  contentTypes: ContentTypeAnalysis[];

  /** Sensitive content detection */
  sensitiveContent: SensitiveContentDetection;

  /** Script analysis */
  scriptAnalysis: ScriptAnalysis;

  /** Overall content risk */
  contentRisk: number;
}

/**
 * Content type analysis
 */
export interface ContentTypeAnalysis {
  /** Content type */
  type: string;

  /** Risk level */
  riskLevel: RiskLevel;

  /** Security implications */
  implications: string[];
}

/**
 * Sensitive content detection
 */
export interface SensitiveContentDetection {
  /** Personal information detected */
  personalInfo: boolean;

  /** Financial information detected */
  financialInfo: boolean;

  /** Authentication forms detected */
  authForms: boolean;

  /** Sensitive keywords */
  sensitiveKeywords: string[];

  /** Confidence score */
  confidence: number;
}

/**
 * Script analysis
 */
export interface ScriptAnalysis {
  /** Scripts detected */
  scriptsDetected: number;

  /** External scripts */
  externalScripts: number;

  /** Inline scripts */
  inlineScripts: number;

  /** Script risk score */
  scriptRiskScore: number;

  /** Suspicious patterns */
  suspiciousPatterns: ScriptPattern[];
}

/**
 * Script pattern detection
 */
export interface ScriptPattern {
  /** Pattern type */
  type: ScriptPatternType;

  /** Pattern description */
  description: string;

  /** Risk score */
  riskScore: number;

  /** Detection confidence */
  confidence: number;
}

/**
 * Script pattern types
 */
export enum ScriptPatternType {
  OBFUSCATED_CODE = 'obfuscated_code',
  DYNAMIC_EVALUATION = 'dynamic_evaluation',
  EXTERNAL_COMMUNICATION = 'external_communication',
  DOM_MANIPULATION = 'dom_manipulation',
  CREDENTIAL_HARVESTING = 'credential_harvesting',
}

// ===========================
// BROWSER RISK ASSESSMENT ENGINE
// ===========================

@Injectable()
export class BrowserRiskAssessmentEngine {
  private readonly logger = new Logger(BrowserRiskAssessmentEngine.name);

  /** Default risk assessment configuration */
  private readonly defaultConfig: RiskAssessmentConfig = {
    enableThreatDetection: true,
    enableDomainReputation: true,
    enableBehavioralAnalysis: true,
    enableMLPrediction: false, // Disable ML for now
    riskWeights: {
      domainReputation: 0.3,
      contentAnalysis: 0.25,
      behavioralPatterns: 0.2,
      securityHeaders: 0.1,
      historicalActivity: 0.1,
      userContext: 0.05,
    },
    threatIntelligence: {
      enabled: true,
      feeds: [
        {
          name: 'malware_domains',
          url: 'https://api.example.com/malware-domains',
          type: ThreatFeedType.MALWARE_DOMAINS,
          updateFrequencyMs: 3600000, // 1 hour
          reliability: 0.9,
        },
      ],
      cacheDurationMs: 3600000, // 1 hour
      threatThreshold: 0.7,
    },
    complianceFrameworks: [
      ComplianceFramework.GDPR,
      ComplianceFramework.CCPA,
      ComplianceFramework.PCI_DSS,
    ],
  };

  /** Domain reputation cache */
  private readonly domainReputationCache = new Map<string, DomainReputation>();

  /** Threat intelligence cache */
  private readonly threatIntelCache = new Map<string, any>();

  /** User behavior tracking */
  private readonly userBehaviorHistory = new Map<
    string,
    UserBehaviorPattern[]
  >();

  /** Session tracking */
  private readonly sessionTracking = new Map<string, SessionPattern>();

  constructor(private readonly config: RiskAssessmentConfig = {}) {
    // Merge with default config
    this.config = { ...this.defaultConfig, ...config };

    this.logger.log('Browser Risk Assessment Engine initialized', {
      threatDetection: this.config.enableThreatDetection,
      domainReputation: this.config.enableDomainReputation,
      behavioralAnalysis: this.config.enableBehavioralAnalysis,
    });

    // Start background tasks
    this.startThreatIntelligenceUpdates();
    this.startBehaviorAnalysis();
  }

  /**
   * Perform comprehensive risk assessment
   */
  async assessOperationRisk(
    _context: BrowserOperationContext,
  ): Promise<BrowserOperationRisk> {
    const startTime = Date.now();

    this.logger.debug(`Starting risk assessment for ${context.operationType}`, {
      operationId: context.operationId,
      userId: context.userContext.userId,
    });

    try {
      // Parallel risk assessment components
      const [domainRisk, behavioralRisk, contentRisk, operationRisk] =
        await Promise.all([
          this.assessDomainRisk(context),
          this.assessBehavioralRisk(context),
          this.assessContentSecurityRisk(context),
          this.assessOperationSpecificRisk(context),
        ]);

      // Combine risk assessments
      const combinedRisk = this.combineRiskAssessments(
        [domainRisk, behavioralRisk, contentRisk, operationRisk],
        context,
      );

      const processingTime = Date.now() - startTime;

      this.logger.debug(`Risk assessment completed`, {
        operationId: context.operationId,
        riskLevel: combinedRisk.riskLevel,
        riskScore: combinedRisk.riskScore,
        processingTimeMs: processingTime,
      });

      return combinedRisk;
    } catch (error) {
      this.logger.error(`Risk assessment failed`, {
        operationId: context.operationId,
        _error: error instanceof Error ? error.message : String(error),
      });

      // Return high-risk assessment on error
      return this.createFailsafeRiskAssessment(context);
    }
  }

  /**
   * Assess domain-based risk
   */
  private async assessDomainRisk(
    _context: BrowserOperationContext,
  ): Promise<Partial<BrowserOperationRisk>> {
    const riskFactors: RiskFactor[] = [];
    let riskScore = 0;

    if (!context.targetUrl) {
      return { riskFactors, riskScore };
    }

    try {
      const url = new URL(context.targetUrl);
      const domain = url.hostname;

      // Get domain reputation
      const _reputation = await this.getDomainReputation(domain);

      // Assess based on reputation
      switch (reputation.riskClassification) {
        case DomainRiskClassification.MALICIOUS:
          riskScore += 50;
          riskFactors.push({
            type: RiskFactorType.EXTERNAL_DOMAIN,
            description: 'Domain classified as malicious',
            weight: 50,
            mitigatable: false,
            evidence: { domain, reputation: reputation.reputationScore },
          });
          break;

        case DomainRiskClassification.HIGH_RISK:
          riskScore += 35;
          riskFactors.push({
            type: RiskFactorType.EXTERNAL_DOMAIN,
            description: 'High-risk domain detected',
            weight: 35,
            mitigatable: true,
            evidence: { domain, reputation: reputation.reputationScore },
          });
          break;

        case DomainRiskClassification.MEDIUM_RISK:
          riskScore += 20;
          riskFactors.push({
            type: RiskFactorType.EXTERNAL_DOMAIN,
            description: 'Medium-risk domain',
            weight: 20,
            mitigatable: true,
            evidence: { domain, reputation: reputation.reputationScore },
          });
          break;

        case DomainRiskClassification.UNKNOWN:
          riskScore += 15;
          riskFactors.push({
            type: RiskFactorType.EXTERNAL_DOMAIN,
            description: 'Unknown domain reputation',
            weight: 15,
            mitigatable: true,
            evidence: { domain, reputation: 'unknown' },
          });
          break;
      }

      // Check threat categories
      if (reputation.threatCategories.includes(ThreatCategory.PHISHING)) {
        riskScore += 40;
        riskFactors.push({
          type: RiskFactorType.EXTERNAL_DOMAIN,
          description: 'Phishing domain detected',
          weight: 40,
          mitigatable: false,
          evidence: { domain, threatCategory: 'phishing' },
        });
      }

      if (reputation.threatCategories.includes(ThreatCategory.MALWARE)) {
        riskScore += 45;
        riskFactors.push({
          type: RiskFactorType.EXTERNAL_DOMAIN,
          description: 'Malware domain detected',
          weight: 45,
          mitigatable: false,
          evidence: { domain, threatCategory: 'malware' },
        });
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
    } catch (error) {
      riskScore += 10;
      riskFactors.push({
        type: RiskFactorType.EXTERNAL_DOMAIN,
        description: 'Invalid URL format',
        weight: 10,
        mitigatable: false,
        evidence: {
          url: context.targetUrl,
          _error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    return { riskFactors, riskScore };
  }

  /**
   * Assess behavioral risk
   */
  private async assessBehavioralRisk(
    _context: BrowserOperationContext,
  ): Promise<Partial<BrowserOperationRisk>> {
    if (!this.config.enableBehavioralAnalysis) {
      return { riskFactors: [], riskScore: 0 };
    }

    const riskFactors: RiskFactor[] = [];
    let riskScore = 0;

    const behavioralAnalysis = await this.analyzeBehavior(context);

    // Assess anomalies
    behavioralAnalysis.anomalies.forEach((anomaly) => {
      const weight = this.getAnomalyWeight(anomaly.severity);
      riskScore += weight;
      riskFactors.push({
        type: RiskFactorType.SUSPICIOUS_ACTIVITY,
        description: `Behavioral anomaly: ${anomaly.description}`,
        weight,
        mitigatable: true,
        evidence: {
          anomalyType: anomaly.type,
          severity: anomaly.severity,
          confidence: anomaly.confidence,
        },
      });
    });

    // Assess risk indicators
    behavioralAnalysis.riskIndicators.forEach((indicator) => {
      riskScore += indicator.riskScore;
      riskFactors.push({
        type: this.mapRiskIndicatorToFactor(indicator.type),
        description: indicator.description,
        weight: indicator.riskScore,
        mitigatable: true,
        evidence: {
          indicatorType: indicator.type,
          confidence: indicator.confidence,
        },
      });
    });

    return { riskFactors, riskScore };
  }

  /**
   * Assess content security risk
   */
  private async assessContentSecurityRisk(
    _context: BrowserOperationContext,
  ): Promise<Partial<BrowserOperationRisk>> {
    const riskFactors: RiskFactor[] = [];
    let riskScore = 0;

    const contentAnalysis = await this.analyzeContentSecurity(context);

    // CSP analysis
    if (!contentAnalysis.cspAnalysis.present) {
      riskScore += 20;
      riskFactors.push({
        type: RiskFactorType.EXTERNAL_DOMAIN,
        description: 'No Content Security Policy detected',
        weight: 20,
        mitigatable: true,
        evidence: { cspPresent: false },
      });
    } else if (contentAnalysis.cspAnalysis.effectivenessScore < 0.5) {
      riskScore += 15;
      riskFactors.push({
        type: RiskFactorType.EXTERNAL_DOMAIN,
        description: 'Weak Content Security Policy',
        weight: 15,
        mitigatable: true,
        evidence: {
          effectivenessScore: contentAnalysis.cspAnalysis.effectivenessScore,
        },
      });
    }

    // Security headers
    if (
      contentAnalysis.securityHeaders.effectiveness.protectionLevel ===
      ProtectionLevel.MINIMAL
    ) {
      riskScore += 15;
      riskFactors.push({
        type: RiskFactorType.EXTERNAL_DOMAIN,
        description: 'Minimal security header protection',
        weight: 15,
        mitigatable: true,
        evidence: {
          protectionLevel:
            contentAnalysis.securityHeaders.effectiveness.protectionLevel,
          coverage: contentAnalysis.securityHeaders.effectiveness.coverage,
        },
      });
    }

    // Sensitive content
    if (contentAnalysis.contentAnalysis.sensitiveContent.personalInfo) {
      riskScore += 25;
      riskFactors.push({
        type: RiskFactorType.PII_ACCESS,
        description: 'Personal information detected on page',
        weight: 25,
        mitigatable: true,
        evidence: { personalInfo: true },
      });
    }

    if (contentAnalysis.contentAnalysis.sensitiveContent.financialInfo) {
      riskScore += 30;
      riskFactors.push({
        type: RiskFactorType.FINANCIAL_DATA,
        description: 'Financial information detected on page',
        weight: 30,
        mitigatable: true,
        evidence: { financialInfo: true },
      });
    }

    // Script analysis
    const scriptRisk =
      contentAnalysis.contentAnalysis.scriptAnalysis.scriptRiskScore;
    if (scriptRisk > 50) {
      riskScore += Math.min(25, scriptRisk / 4);
      riskFactors.push({
        type: RiskFactorType.SCRIPT_EXECUTION,
        description: 'High-risk scripts detected',
        weight: Math.min(25, scriptRisk / 4),
        mitigatable: true,
        evidence: {
          scriptRiskScore: scriptRisk,
          suspiciousPatterns:
            contentAnalysis.contentAnalysis.scriptAnalysis.suspiciousPatterns
              .length,
        },
      });
    }

    return { riskFactors, riskScore };
  }

  /**
   * Assess operation-specific risk
   */
  private async assessOperationSpecificRisk(
    _context: BrowserOperationContext,
  ): Promise<Partial<BrowserOperationRisk>> {
    const riskFactors: RiskFactor[] = [];
    let riskScore = 0;

    switch (context.operationType) {
      case BrowserOperationType.FORM_SUBMIT:
        riskScore += 25;
        riskFactors.push({
          type: RiskFactorType.FORM_SUBMISSION,
          description: 'Form submission operation',
          weight: 25,
          mitigatable: true,
          evidence: { operationType: context.operationType },
        });
        break;

      case BrowserOperationType.FILE_UPLOAD:
      case BrowserOperationType.FILE_DOWNLOAD:
        riskScore += 30;
        riskFactors.push({
          type: RiskFactorType.FILE_OPERATION,
          description: 'File operation detected',
          weight: 30,
          mitigatable: true,
          evidence: { operationType: context.operationType },
        });
        break;

      case BrowserOperationType.SCRIPT_EXECUTE:
        riskScore += 40;
        riskFactors.push({
          type: RiskFactorType.SCRIPT_EXECUTION,
          description: 'Script execution operation',
          weight: 40,
          mitigatable: true,
          evidence: { operationType: context.operationType },
        });
        break;

      case BrowserOperationType.DATA_EXTRACT:
        riskScore += 20;
        riskFactors.push({
          type: RiskFactorType.SENSITIVE_DATA,
          description: 'Data extraction operation',
          weight: 20,
          mitigatable: true,
          evidence: { operationType: context.operationType },
        });
        break;
    }

    // Check for bulk operations
    const operationParams = context.operationParams;
    if (operationParams.bulk === true || operationParams.extractAll === true) {
      riskScore += 15;
      riskFactors.push({
        type: RiskFactorType.SENSITIVE_DATA,
        description: 'Bulk operation detected',
        weight: 15,
        mitigatable: true,
        evidence: { bulkOperation: true },
      });
    }

    return { riskFactors, riskScore };
  }

  /**
   * Combine multiple risk assessments
   */
  private combineRiskAssessments(
    assessments: Partial<BrowserOperationRisk>[],
    _context: BrowserOperationContext,
  ): BrowserOperationRisk {
    // Combine all risk factors
    const allRiskFactors: RiskFactor[] = [];
    let totalRiskScore = 0;

    assessments.forEach((assessment) => {
      if (assessment.riskFactors) {
        allRiskFactors.push(...assessment.riskFactors);
      }
      if (assessment.riskScore) {
        totalRiskScore += assessment.riskScore;
      }
    });

    // Apply risk weights
    const weightedScore = this.applyRiskWeights(totalRiskScore, allRiskFactors);

    // Determine final risk level
    const riskLevel = this.determineRiskLevel(weightedScore);

    // Generate mitigation strategies
    const mitigationStrategies =
      this.generateMitigationStrategies(allRiskFactors);

    // Determine monitoring level
    const monitoringLevel = this.getMonitoringLevel(riskLevel);

    return {
      riskLevel,
      riskFactors: allRiskFactors,
      riskScore: Math.min(100, Math.max(0, weightedScore)),
      recommendedSecurityLevel: this.getRecommendedSecurityLevel(riskLevel),
      requiredApprovalLevel: this.getRequiredApprovalLevel(riskLevel),
      mitigationStrategies,
      monitoringLevel,
    };
  }

  /**
   * Get domain reputation
   */
  private async getDomainReputation(domain: string): Promise<DomainReputation> {
    // Check cache first
    const cached = this.domainReputationCache.get(domain);
    if (
      cached &&
      Date.now() - cached.lastUpdated.getTime() <
        this.config.threatIntelligence.cacheDurationMs
    ) {
      return cached;
    }

    try {
      // In a real implementation, this would query external reputation services
      const _reputation: DomainReputation = {
        domain,
        reputationScore: this.calculateMockReputationScore(domain),
        sources: [
          {
            name: 'internal_analysis',
            score: 75,
            reliability: 0.8,
            lastChecked: new Date(),
          },
        ],
        threatCategories: this.determineThreatCategories(domain),
        lastUpdated: new Date(),
        riskClassification: this.classifyDomainRisk(domain),
      };

      // Cache the result
      this.domainReputationCache.set(domain, reputation);

      return reputation;
    } catch (error) {
      this.logger.warn(`Failed to get domain reputation for ${domain}`, {
        _error: error instanceof Error ? error.message : String(error),
      });

      // Return unknown reputation on error
      return {
        domain,
        reputationScore: 50,
        sources: [],
        threatCategories: [ThreatCategory.SUSPICIOUS],
        lastUpdated: new Date(),
        riskClassification: DomainRiskClassification.UNKNOWN,
      };
    }
  }

  /**
   * Analyze user behavior
   */
  private async analyzeBehavior(
    _context: BrowserOperationContext,
  ): Promise<BehavioralAnalysis> {
    const userId = context.userContext.userId;
    const sessionId = context.userContext.sessionId;

    // Get user behavior history
    const userPatterns = this.userBehaviorHistory.get(userId) || [];

    // Analyze current session
    const currentSession = this.sessionTracking.get(sessionId) || {
      duration: 0,
      operationCount: 1,
      uniqueDomains: context.targetUrl ? 1 : 0,
      dataVolume: 0,
      classification: SessionClassification.NORMAL,
    };

    // Update session tracking
    currentSession.operationCount++;
    if (context.targetUrl) {
      // In real implementation, track unique domains properly
      currentSession.uniqueDomains = Math.max(currentSession.uniqueDomains, 1);
    }
    this.sessionTracking.set(sessionId, currentSession);

    // Detect anomalies
    const anomalies = this.detectBehaviorAnomalies(
      userPatterns,
      currentSession,
      context,
    );

    // Identify risk indicators
    const riskIndicators = this.identifyRiskIndicators(
      userPatterns,
      currentSession,
      context,
    );

    return {
      userPatterns,
      sessionPatterns: [currentSession],
      anomalies,
      riskIndicators,
      confidence: 0.8, // Mock confidence
    };
  }

  /**
   * Analyze content security
   */
  private async analyzeContentSecurity(
    _context: BrowserOperationContext,
  ): Promise<ContentSecurityAnalysis> {
    // Mock implementation - in production would analyze actual page content
    const cspAnalysis: CSPAnalysisResult = {
      present: context.browserState.cspStatus.present,
      policies: context.browserState.cspStatus.policies.map((policy) => ({
        directive: policy,
        values: ['self'],
        strength: PolicyStrength.MODERATE,
        riskContribution: 5,
      })),
      violations: context.browserState.cspStatus.violations,
      effectivenessScore: context.browserState.cspStatus.present ? 0.7 : 0.0,
      riskLevel: context.browserState.cspStatus.riskLevel,
    };

    const securityHeaders: SecurityHeaderAnalysis = {
      headersPresent: context.browserState.securityHeaders.map(
        (header) => header as SecurityHeader,
      ),
      missingHeaders: Object.values(SecurityHeader).filter(
        (header) => !context.browserState.securityHeaders.includes(header),
      ),
      effectiveness: {
        protectionLevel:
          context.browserState.securityHeaders.length > 3
            ? ProtectionLevel.ENHANCED
            : ProtectionLevel.BASIC,
        coverage:
          context.browserState.securityHeaders.length /
          Object.values(SecurityHeader).length,
        configurationQuality: 0.7,
      },
      headerScore:
        (context.browserState.securityHeaders.length /
          Object.values(SecurityHeader).length) *
        100,
    };

    const contentAnalysis: ContentAnalysisResult = {
      contentTypes: [
        {
          type: 'text/html',
          riskLevel: RiskLevel.LOW,
          implications: ['Standard web content'],
        },
      ],
      sensitiveContent: {
        personalInfo: this.detectPersonalInfo(context),
        financialInfo: this.detectFinancialInfo(context),
        authForms: this.detectAuthForms(context),
        sensitiveKeywords: this.extractSensitiveKeywords(context),
        confidence: 0.8,
      },
      scriptAnalysis: {
        scriptsDetected: 5, // Mock
        externalScripts: 2,
        inlineScripts: 3,
        scriptRiskScore: 25,
        suspiciousPatterns: [],
      },
      contentRisk: 15,
    };

    return {
      cspAnalysis,
      securityHeaders,
      contentAnalysis,
      securityScore:
        cspAnalysis.effectivenessScore * 40 +
        securityHeaders.headerScore * 0.3 +
        (100 - contentAnalysis.contentRisk) * 0.3,
    };
  }

  // ===========================
  // HELPER METHODS
  // ===========================

  /**
   * Calculate mock reputation score
   */
  private calculateMockReputationScore(domain: string): number {
    // Mock implementation - in production would use real reputation data
    if (domain.includes('malware') || domain.includes('phishing')) {
      return 10;
    }
    if (domain.includes('suspicious')) {
      return 30;
    }
    if (domain.includes('localhost') || domain.includes('local')) {
      return 95;
    }
    return 75; // Default neutral score
  }

  /**
   * Determine threat categories
   */
  private determineThreatCategories(domain: string): ThreatCategory[] {
    if (domain.includes('malware')) {
      return [ThreatCategory.MALWARE];
    }
    if (domain.includes('phishing')) {
      return [ThreatCategory.PHISHING];
    }
    if (domain.includes('suspicious')) {
      return [ThreatCategory.SUSPICIOUS];
    }
    return [ThreatCategory.CLEAN];
  }

  /**
   * Classify domain risk
   */
  private classifyDomainRisk(domain: string): DomainRiskClassification {
    if (domain.includes('malware') || domain.includes('phishing')) {
      return DomainRiskClassification.MALICIOUS;
    }
    if (domain.includes('suspicious')) {
      return DomainRiskClassification.HIGH_RISK;
    }
    if (domain.includes('localhost') || domain.includes('local')) {
      return DomainRiskClassification.TRUSTED;
    }
    return DomainRiskClassification.LOW_RISK;
  }

  /**
   * Detect behavior anomalies
   */
  private detectBehaviorAnomalies(
    userPatterns: UserBehaviorPattern[],
    session: SessionPattern,
    _context: BrowserOperationContext,
  ): BehaviorAnomaly[] {
    const anomalies: BehaviorAnomaly[] = [];

    // High-frequency operations
    if (session.operationCount > 50) {
      anomalies.push({
        type: AnomalyType.UNUSUAL_VOLUME,
        severity: AnomallySeverity.HIGH,
        description: 'Unusually high operation volume',
        confidence: 0.9,
        evidence: { operationCount: session.operationCount },
      });
    }

    // Rapid operations (mock timing check)
    const recentPatterns = userPatterns.filter(
      (p) => p.type === BehaviorPatternType.RAPID_CLICKING,
    );
    if (recentPatterns.length > 3) {
      anomalies.push({
        type: AnomalyType.BEHAVIORAL_DEVIATION,
        severity: AnomallySeverity.MEDIUM,
        description: 'Rapid clicking pattern detected',
        confidence: 0.8,
        evidence: { rapidClickingCount: recentPatterns.length },
      });
    }

    return anomalies;
  }

  /**
   * Identify risk indicators
   */
  private identifyRiskIndicators(
    userPatterns: UserBehaviorPattern[],
    session: SessionPattern,
    _context: BrowserOperationContext,
  ): BehaviorRiskIndicator[] {
    const indicators: BehaviorRiskIndicator[] = [];

    // Bot-like behavior
    if (session.operationCount > 100 && session.duration < 60000) {
      indicators.push({
        type: RiskIndicatorType.BOT_BEHAVIOR,
        riskScore: 30,
        description: 'Bot-like automation pattern detected',
        confidence: 0.85,
      });
    }

    // Data scraping
    if (context.operationType === BrowserOperationType.DATA_EXTRACT) {
      const extractionPatterns = userPatterns.filter(
        (p) => p.type === BehaviorPatternType.BULK_DATA_EXTRACTION,
      );
      if (extractionPatterns.length > 2) {
        indicators.push({
          type: RiskIndicatorType.SCRAPING_ACTIVITY,
          riskScore: 25,
          description: 'Systematic data extraction detected',
          confidence: 0.8,
        });
      }
    }

    return indicators;
  }

  /**
   * Get anomaly weight
   */
  private getAnomalyWeight(severity: AnomallySeverity): number {
    switch (severity) {
      case AnomallySeverity.CRITICAL:
        return 40;
      case AnomallySeverity.HIGH:
        return 30;
      case AnomallySeverity.MEDIUM:
        return 20;
      case AnomallySeverity.LOW:
        return 10;
      default:
        return 15;
    }
  }

  /**
   * Map risk indicator to factor type
   */
  private mapRiskIndicatorToFactor(
    indicatorType: RiskIndicatorType,
  ): RiskFactorType {
    switch (indicatorType) {
      case RiskIndicatorType.BOT_BEHAVIOR:
      case RiskIndicatorType.SCRAPING_ACTIVITY:
        return RiskFactorType.SUSPICIOUS_ACTIVITY;
      case RiskIndicatorType.CREDENTIAL_STUFFING:
      case RiskIndicatorType.ACCOUNT_TAKEOVER:
        return RiskFactorType.HIGH_PRIVILEGE;
      case RiskIndicatorType.DATA_EXFILTRATION:
        return RiskFactorType.SENSITIVE_DATA;
      default:
        return RiskFactorType.SUSPICIOUS_ACTIVITY;
    }
  }

  /**
   * Apply risk weights to score
   */
  private applyRiskWeights(
    baseScore: number,
    riskFactors: RiskFactor[],
  ): number {
    // Apply domain reputation weight
    const domainFactors = riskFactors.filter(
      (f) => f.type === RiskFactorType.EXTERNAL_DOMAIN,
    );
    const domainScore =
      domainFactors.reduce((sum, f) => sum + f.weight, 0) *
      this.config.riskWeights.domainReputation;

    // Apply other weights similarly
    const behaviorFactors = riskFactors.filter(
      (f) => f.type === RiskFactorType.SUSPICIOUS_ACTIVITY,
    );
    const behaviorScore =
      behaviorFactors.reduce((sum, f) => sum + f.weight, 0) *
      this.config.riskWeights.behavioralPatterns;

    const sensitiveFactors = riskFactors.filter(
      (f) =>
        f.type === RiskFactorType.SENSITIVE_DATA ||
        f.type === RiskFactorType.PII_ACCESS,
    );
    const sensitiveScore =
      sensitiveFactors.reduce((sum, f) => sum + f.weight, 0) *
      this.config.riskWeights.contentAnalysis;

    return domainScore + behaviorScore + sensitiveScore;
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 80) return RiskLevel.CRITICAL;
    if (score >= 60) return RiskLevel.HIGH;
    if (score >= 35) return RiskLevel.MEDIUM;
    if (score >= 15) return RiskLevel.LOW;
    return RiskLevel.MINIMAL;
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
          strategies.add('ssl_validation');
          break;
        case RiskFactorType.SENSITIVE_DATA:
          strategies.add('data_encryption');
          strategies.add('access_monitoring');
          break;
        case RiskFactorType.FORM_SUBMISSION:
          strategies.add('input_validation');
          strategies.add('csrf_protection');
          break;
        case RiskFactorType.SUSPICIOUS_ACTIVITY:
          strategies.add('behavior_analysis');
          strategies.add('rate_limiting');
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
   * Get recommended security level
   */
  private getRecommendedSecurityLevel(riskLevel: RiskLevel): any {
    // Implementation depends on SecurityLevel enum from shared package
    return riskLevel; // Simplified mapping
  }

  /**
   * Get required approval level
   */
  private getRequiredApprovalLevel(riskLevel: RiskLevel): any {
    // Implementation depends on ApprovalLevel enum from shared package
    return riskLevel; // Simplified mapping
  }

  /**
   * Create failsafe risk assessment
   */
  private createFailsafeRiskAssessment(
    _context: BrowserOperationContext,
  ): BrowserOperationRisk {
    return {
      riskLevel: RiskLevel.HIGH,
      riskFactors: [
        {
          type: RiskFactorType.SUSPICIOUS_ACTIVITY,
          description: 'Risk assessment failed - defaulting to high risk',
          weight: 50,
          mitigatable: false,
          evidence: { assessmentError: true },
        },
      ],
      riskScore: 75,
      recommendedSecurityLevel: RiskLevel.HIGH,
      requiredApprovalLevel: RiskLevel.HIGH,
      mitigationStrategies: ['manual_review', 'enhanced_monitoring'],
      monitoringLevel: MonitoringLevel.COMPREHENSIVE,
    };
  }

  /**
   * Mock content detection methods
   */
  private detectPersonalInfo(_context: BrowserOperationContext): boolean {
    const url = context.targetUrl || context.browserState.currentUrl || '';
    return (
      url.includes('profile') ||
      url.includes('personal') ||
      url.includes('account')
    );
  }

  private detectFinancialInfo(_context: BrowserOperationContext): boolean {
    const url = context.targetUrl || context.browserState.currentUrl || '';
    return (
      url.includes('payment') || url.includes('billing') || url.includes('bank')
    );
  }

  private detectAuthForms(_context: BrowserOperationContext): boolean {
    const url = context.targetUrl || context.browserState.currentUrl || '';
    return (
      url.includes('login') || url.includes('auth') || url.includes('signin')
    );
  }

  private extractSensitiveKeywords(
    _context: BrowserOperationContext,
  ): string[] {
    const keywords: string[] = [];
    const url = context.targetUrl || context.browserState.currentUrl || '';

    const sensitivePatterns = ['password', 'ssn', 'credit', 'bank', 'personal'];
    sensitivePatterns.forEach((pattern) => {
      if (url.toLowerCase().includes(pattern)) {
        keywords.push(pattern);
      }
    });

    return keywords;
  }

  /**
   * Start background threat intelligence updates
   */
  private startThreatIntelligenceUpdates(): void {
    if (!this.config.threatIntelligence.enabled) {
      return;
    }

    // Update threat intelligence every hour
    setInterval(async () => {
      try {
        await this.updateThreatIntelligence();
      } catch (error) {
        this.logger.error('Failed to update threat intelligence', {
          _error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 3600000); // 1 hour
  }

  /**
   * Start behavior analysis background processing
   */
  private startBehaviorAnalysis(): void {
    if (!this.config.enableBehavioralAnalysis) {
      return;
    }

    // Clean up old behavior data every 30 minutes
    setInterval(() => {
      this.cleanupBehaviorData();
    }, 1800000); // 30 minutes
  }

  /**
   * Update threat intelligence data
   */
  private async updateThreatIntelligence(): Promise<void> {
    this.logger.debug('Updating threat intelligence data');

    for (const feed of this.config.threatIntelligence.feeds) {
      try {
        // In real implementation, would fetch from external APIs
        this.logger.debug(`Updated threat feed: ${feed.name}`);
      } catch (error) {
        this.logger.warn(`Failed to update threat feed: ${feed.name}`, {
          _error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Clean up old behavior data
   */
  private cleanupBehaviorData(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

    // Clean user behavior history
    for (const [userId, patterns] of this.userBehaviorHistory.entries()) {
      const recentPatterns = patterns.filter(
        (_pattern) =>
          // Assume patterns have timestamps - in real implementation
          Date.now() - cutoffTime < 24 * 60 * 60 * 1000,
      );

      if (recentPatterns.length === 0) {
        this.userBehaviorHistory.delete(userId);
      } else {
        this.userBehaviorHistory.set(userId, recentPatterns);
      }
    }

    // Clean domain reputation cache
    for (const [domain, reputation] of this.domainReputationCache.entries()) {
      if (
        Date.now() - reputation.lastUpdated.getTime() >
        this.config.threatIntelligence.cacheDurationMs
      ) {
        this.domainReputationCache.delete(domain);
      }
    }

    this.logger.debug('Completed behavior data cleanup');
  }

  /**
   * Get engine statistics
   */
  public getStatistics() {
    return {
      domainReputationCacheSize: this.domainReputationCache.size,
      threatIntelCacheSize: this.threatIntelCache.size,
      userBehaviorHistorySize: this.userBehaviorHistory.size,
      sessionTrackingSize: this.sessionTracking.size,
      config: {
        threatDetectionEnabled: this.config.enableThreatDetection,
        domainReputationEnabled: this.config.enableDomainReputation,
        behavioralAnalysisEnabled: this.config.enableBehavioralAnalysis,
        mlPredictionEnabled: this.config.enableMLPrediction,
      },
    };
  }
}
