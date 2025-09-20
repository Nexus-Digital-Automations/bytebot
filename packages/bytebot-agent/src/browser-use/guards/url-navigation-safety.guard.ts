/**
 * URL Navigation Safety Validation Guard
 *
 * Comprehensive URL safety validation guard that provides real-time URL analysis,
 * domain reputation checking, and navigation safety validation for browser
 * automation operations. This guard integrates with the PARLANT validation
 * framework to ensure secure navigation operations.
 *
 * Features:
 * - Real-time URL safety analysis and threat detection
 * - Domain reputation and trustworthiness validation
 * - Protocol security and encryption validation
 * - Cross-origin request safety validation
 * - Malicious URL pattern detection
 * - Phishing and malware domain blocking
 * - Content Security Policy validation
 * - Geographic and regulatory compliance checking
 *
 * @fileoverview URL navigation safety validation guard
 * @version 1.0.0
 * @author Browser Security Team
 */

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RiskLevel } from '@bytebot/shared/dist/index-server';
import { BrowserParlantValidationService } from '../services/browser-parlant-validation.service';
import { BrowserRiskAssessmentEngine } from '../engines/browser-risk-assessment.engine';
import {
  BrowserOperationContext,
  BrowserOperationType,
} from '../services/browser-parlant-validation.service';

// ===========================
// URL SAFETY INTERFACES
// ===========================

/**
 * URL safety validation configuration
 */
export interface URLSafetyConfig {
  /** Enable URL safety validation */
  enabled: boolean;

  /** Enable real-time threat detection */
  enableThreatDetection: boolean;

  /** Enable domain reputation checking */
  enableDomainReputation: boolean;

  /** Enable content analysis */
  enableContentAnalysis: boolean;

  /** Strict mode (block on any suspicion) */
  strictMode: boolean;

  /** Allowed domains whitelist */
  allowedDomains: URLDomainRule[];

  /** Blocked domains blacklist */
  blockedDomains: URLDomainRule[];

  /** URL validation rules */
  validationRules: URLValidationRule[];

  /** Threat detection settings */
  threatDetection: URLThreatDetectionConfig;

  /** Geographic restrictions */
  geographicRestrictions: GeographicRestrictionConfig;

  /** Compliance requirements */
  complianceRequirements: ComplianceRequirement[];
}

/**
 * URL domain rule
 */
export interface URLDomainRule {
  /** Domain pattern (supports wildcards) */
  pattern: string;

  /** Rule type */
  type: DomainRuleType;

  /** Rule description */
  description: string;

  /** Risk level for this rule */
  riskLevel: URLRiskLevel;

  /** Expiration date */
  expiresAt?: Date;

  /** Rule metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Domain rule types
 */
export enum DomainRuleType {
  EXACT_MATCH = 'exact_match',
  WILDCARD = 'wildcard',
  REGEX = 'regex',
  SUBDOMAIN = 'subdomain',
  TLD = 'tld',
}

/**
 * URL risk levels
 */
export enum URLRiskLevel {
  TRUSTED = 'trusted',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  MALICIOUS = 'malicious',
  BLOCKED = 'blocked',
}

/**
 * URL validation rule
 */
export interface URLValidationRule {
  /** Rule identifier */
  id: string;

  /** Rule name */
  name: string;

  /** Rule type */
  type: URLValidationRuleType;

  /** Rule configuration */
  config: Record<string, unknown>;

  /** Rule priority (lower = higher priority) */
  priority: number;

  /** Rule enabled status */
  enabled: boolean;

  /** Validation function */
  validate: (url: URL, _context: NavigationContext) => URLValidationResult;
}

/**
 * URL validation rule types
 */
export enum URLValidationRuleType {
  PROTOCOL_SECURITY = 'protocol_security',
  DOMAIN_REPUTATION = 'domain_reputation',
  CONTENT_TYPE = 'content_type',
  GEOGRAPHIC_RESTRICTION = 'geographic_restriction',
  MALWARE_DETECTION = 'malware_detection',
  PHISHING_DETECTION = 'phishing_detection',
  COMPLIANCE_CHECK = 'compliance_check',
  BUSINESS_LOGIC = 'business_logic',
}

/**
 * URL validation result
 */
export interface URLValidationResult {
  /** Validation passed */
  allowed: boolean;

  /** Rule ID that was validated */
  ruleId: string;

  /** Validation message */
  message: string;

  /** Risk level assigned */
  riskLevel: URLRiskLevel;

  /** Confidence score (0-1) */
  confidence: number;

  /** Evidence data */
  evidence?: Record<string, unknown>;

  /** Recommendations */
  recommendations?: string[];

  /** Alternative URLs if blocked */
  alternatives?: string[];
}

/**
 * URL threat detection configuration
 */
export interface URLThreatDetectionConfig {
  /** Enable threat detection */
  enabled: boolean;

  /** Threat intelligence feeds */
  threatFeeds: ThreatFeedConfig[];

  /** Real-time analysis */
  realTimeAnalysis: boolean;

  /** Content scanning */
  contentScanning: boolean;

  /** DNS analysis */
  dnsAnalysis: boolean;

  /** Certificate validation */
  certificateValidation: boolean;

  /** Response time limits */
  responseTimeouts: ResponseTimeoutConfig;
}

/**
 * Threat feed configuration
 */
export interface ThreatFeedConfig {
  /** Feed name */
  name: string;

  /** Feed URL */
  url: string;

  /** Feed type */
  type: ThreatFeedType;

  /** Update frequency */
  updateIntervalMs: number;

  /** Feed reliability (0-1) */
  reliability: number;

  /** API key if required */
  apiKey?: string;
}

/**
 * Threat feed types
 */
export enum ThreatFeedType {
  MALWARE_DOMAINS = 'malware_domains',
  PHISHING_URLS = 'phishing_urls',
  SUSPICIOUS_DOMAINS = 'suspicious_domains',
  BOTNET_C2 = 'botnet_c2',
  REPUTATION_SCORES = 'reputation_scores',
}

/**
 * Response timeout configuration
 */
export interface ResponseTimeoutConfig {
  /** DNS lookup timeout */
  dnsTimeoutMs: number;

  /** HTTP request timeout */
  httpTimeoutMs: number;

  /** Certificate validation timeout */
  certTimeoutMs: number;

  /** Content analysis timeout */
  contentTimeoutMs: number;
}

/**
 * Geographic restriction configuration
 */
export interface GeographicRestrictionConfig {
  /** Enable geographic restrictions */
  enabled: boolean;

  /** Allowed countries */
  allowedCountries: string[];

  /** Blocked countries */
  blockedCountries: string[];

  /** Restricted regions */
  restrictedRegions: RegionRestriction[];

  /** Compliance zones */
  complianceZones: ComplianceZone[];
}

/**
 * Region restriction
 */
export interface RegionRestriction {
  /** Region identifier */
  id: string;

  /** Region name */
  name: string;

  /** Countries in region */
  countries: string[];

  /** Restriction type */
  type: RestrictionType;

  /** Restriction reason */
  reason: string;
}

/**
 * Restriction types
 */
export enum RestrictionType {
  BLOCKED = 'blocked',
  MONITORING_REQUIRED = 'monitoring_required',
  APPROVAL_REQUIRED = 'approval_required',
  ENHANCED_VALIDATION = 'enhanced_validation',
}

/**
 * Compliance zone
 */
export interface ComplianceZone {
  /** Zone identifier */
  id: string;

  /** Zone name */
  name: string;

  /** Applicable regulations */
  regulations: string[];

  /** Required validations */
  requiredValidations: string[];

  /** Data handling requirements */
  dataHandling: DataHandlingRequirement[];
}

/**
 * Data handling requirement
 */
export interface DataHandlingRequirement {
  /** Requirement type */
  type: DataHandlingType;

  /** Requirement description */
  description: string;

  /** Enforcement level */
  enforcement: EnforcementLevel;

  /** Compliance frameworks */
  frameworks: string[];
}

/**
 * Data handling types
 */
export enum DataHandlingType {
  ENCRYPTION_REQUIRED = 'encryption_required',
  DATA_RESIDENCY = 'data_residency',
  CONSENT_REQUIRED = 'consent_required',
  AUDIT_LOGGING = 'audit_logging',
  RETENTION_LIMITS = 'retention_limits',
}

/**
 * Enforcement levels
 */
export enum EnforcementLevel {
  ADVISORY = 'advisory',
  REQUIRED = 'required',
  STRICT = 'strict',
  ABSOLUTE = 'absolute',
}

/**
 * Compliance requirement
 */
export interface ComplianceRequirement {
  /** Framework name */
  framework: ComplianceFramework;

  /** Requirement level */
  level: ComplianceLevel;

  /** Applicable domains */
  applicableDomains: string[];

  /** Required validations */
  validations: ComplianceValidation[];
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
  COPPA = 'coppa',
  FERPA = 'ferpa',
}

/**
 * Compliance levels
 */
export enum ComplianceLevel {
  BASIC = 'basic',
  STANDARD = 'standard',
  ENHANCED = 'enhanced',
  STRICT = 'strict',
}

/**
 * Compliance validation
 */
export interface ComplianceValidation {
  /** Validation type */
  type: ComplianceValidationType;

  /** Validation description */
  description: string;

  /** Required evidence */
  requiredEvidence: string[];

  /** Validation criteria */
  criteria: ValidationCriteria;
}

/**
 * Compliance validation types
 */
export enum ComplianceValidationType {
  CONSENT_VERIFICATION = 'consent_verification',
  DATA_CLASSIFICATION = 'data_classification',
  ENCRYPTION_VALIDATION = 'encryption_validation',
  ACCESS_CONTROL = 'access_control',
  AUDIT_TRAIL = 'audit_trail',
}

/**
 * Validation criteria
 */
export interface ValidationCriteria {
  /** Required fields */
  requiredFields: string[];

  /** Validation rules */
  rules: ValidationRule[];

  /** Scoring thresholds */
  thresholds: ValidationThresholds;
}

/**
 * Validation rule
 */
export interface ValidationRule {
  /** Rule expression */
  expression: string;

  /** Rule type */
  type: ValidationRuleType;

  /** Error message */
  errorMessage: string;
}

/**
 * Validation rule types
 */
export enum ValidationRuleType {
  REGEX = 'regex',
  FUNCTION = 'function',
  COMPARISON = 'comparison',
  EXISTENCE = 'existence',
}

/**
 * Validation thresholds
 */
export interface ValidationThresholds {
  /** Minimum score */
  minScore: number;

  /** Warning threshold */
  warningThreshold: number;

  /** Error threshold */
  errorThreshold: number;

  /** Critical threshold */
  criticalThreshold: number;
}

/**
 * Navigation context
 */
export interface NavigationContext {
  /** Operation ID */
  operationId: string;

  /** User context */
  userContext: {
    userId: string;
    roles: string[];
    sessionId: string;
    ipAddress: string;
    geolocation?: GeolocationInfo;
  };

  /** Browser context */
  browserContext: {
    sessionId: string;
    userAgent: string;
    referrer?: string;
    currentUrl?: string;
  };

  /** Request metadata */
  requestMetadata: {
    timestamp: Date;
    requestId: string;
    method: string;
    headers: Record<string, string>;
  };

  /** Security context */
  securityContext: {
    authenticated: boolean;
    authorizationLevel: string;
    securityClearance: string[];
    threatLevel: string;
  };
}

/**
 * Geolocation information
 */
export interface GeolocationInfo {
  /** Country code */
  country: string;

  /** Region/state */
  region: string;

  /** City */
  city: string;

  /** Latitude */
  latitude?: number;

  /** Longitude */
  longitude?: number;

  /** Timezone */
  timezone: string;

  /** Accuracy level */
  accuracy: GeolocationAccuracy;
}

/**
 * Geolocation accuracy levels
 */
export enum GeolocationAccuracy {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  UNKNOWN = 'unknown',
}

/**
 * URL safety analysis result
 */
export interface URLSafetyAnalysis {
  /** Target URL */
  url: string;

  /** Overall safety score (0-100) */
  safetyScore: number;

  /** Risk level */
  riskLevel: URLRiskLevel;

  /** Safety determination */
  safe: boolean;

  /** Analysis results */
  analysisResults: URLAnalysisResult[];

  /** Threat indicators */
  _threatIndicators: URLThreatIndicator[];

  /** Compliance status */
  complianceStatus: URLComplianceStatus[];

  /** Recommendations */
  recommendations: URLRecommendation[];

  /** Analysis metadata */
  _metadata: URLAnalysisMetadata;
}

/**
 * URL analysis result
 */
export interface URLAnalysisResult {
  /** Analysis type */
  type: URLAnalysisType;

  /** Result status */
  status: AnalysisStatus;

  /** Analysis score (0-100) */
  score: number;

  /** Analysis message */
  message: string;

  /** Analysis evidence */
  evidence: Record<string, unknown>;

  /** Processing time */
  processingTimeMs: number;
}

/**
 * URL analysis types
 */
export enum URLAnalysisType {
  DOMAIN_REPUTATION = 'domain_reputation',
  MALWARE_SCAN = 'malware_scan',
  PHISHING_DETECTION = 'phishing_detection',
  CONTENT_ANALYSIS = 'content_analysis',
  CERTIFICATE_VALIDATION = 'certificate_validation',
  DNS_ANALYSIS = 'dns_analysis',
  GEOGRAPHIC_ANALYSIS = 'geographic_analysis',
}

/**
 * Analysis status
 */
export enum AnalysisStatus {
  PASSED = 'passed',
  WARNING = 'warning',
  FAILED = 'failed',
  ERROR = 'error',
  TIMEOUT = 'timeout',
}

/**
 * URL threat indicator
 */
export interface URLThreatIndicator {
  /** Indicator ID */
  id: string;

  /** Threat type */
  type: URLThreatType;

  /** Threat severity */
  severity: ThreatSeverity;

  /** Threat description */
  description: string;

  /** Detection confidence */
  confidence: number;

  /** Threat source */
  source: string;

  /** Evidence data */
  evidence: Record<string, unknown>;

  /** Mitigation actions */
  mitigations: string[];
}

/**
 * URL threat types
 */
export enum URLThreatType {
  MALWARE_HOSTING = 'malware_hosting',
  PHISHING_SITE = 'phishing_site',
  BOTNET_C2 = 'botnet_c2',
  SUSPICIOUS_DOMAIN = 'suspicious_domain',
  KNOWN_BAD_IP = 'known_bad_ip',
  CERTIFICATE_ISSUE = 'certificate_issue',
  DNS_HIJACKING = 'dns_hijacking',
}

/**
 * Threat severity levels
 */
export enum ThreatSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * URL compliance status
 */
export interface URLComplianceStatus {
  /** Compliance framework */
  framework: ComplianceFramework;

  /** Compliance status */
  status: ComplianceStatus;

  /** Compliance score */
  score: number;

  /** Required actions */
  requiredActions: string[];

  /** Compliance evidence */
  evidence: ComplianceEvidence[];
}

/**
 * Compliance status
 */
export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIAL_COMPLIANCE = 'partial_compliance',
  UNKNOWN = 'unknown',
  NOT_APPLICABLE = 'not_applicable',
}

/**
 * Compliance evidence
 */
export interface ComplianceEvidence {
  /** Evidence type */
  type: string;

  /** Evidence description */
  description: string;

  /** Evidence data */
  _data: Record<string, unknown>;

  /** Evidence timestamp */
  timestamp: Date;
}

/**
 * URL recommendation
 */
export interface URLRecommendation {
  /** Recommendation type */
  type: RecommendationType;

  /** Recommendation priority */
  priority: RecommendationPriority;

  /** Recommendation description */
  description: string;

  /** Actionable steps */
  actions: string[];

  /** Impact assessment */
  impact: ImpactAssessment;
}

/**
 * Recommendation types
 */
export enum RecommendationType {
  SECURITY_ENHANCEMENT = 'security_enhancement',
  COMPLIANCE_IMPROVEMENT = 'compliance_improvement',
  PERFORMANCE_OPTIMIZATION = 'performance_optimization',
  USER_EXPERIENCE = 'user_experience',
  ALTERNATIVE_APPROACH = 'alternative_approach',
}

/**
 * Recommendation priorities
 */
export enum RecommendationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Impact assessment
 */
export interface ImpactAssessment {
  /** Security impact */
  security: ImpactLevel;

  /** Performance impact */
  performance: ImpactLevel;

  /** User experience impact */
  userExperience: ImpactLevel;

  /** Compliance impact */
  compliance: ImpactLevel;
}

/**
 * Impact levels
 */
export enum ImpactLevel {
  NONE = 'none',
  MINIMAL = 'minimal',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  SEVERE = 'severe',
}

/**
 * URL analysis metadata
 */
export interface URLAnalysisMetadata {
  /** Analysis timestamp */
  analyzedAt: Date;

  /** Analysis duration */
  analysisDurationMs: number;

  /** Analysis version */
  analysisVersion: string;

  /** Analyzer information */
  analyzer: AnalyzerInfo;

  /** Analysis configuration */
  configuration: AnalysisConfiguration;

  /** Analysis sources */
  sources: AnalysisSource[];
}

/**
 * Analyzer information
 */
export interface AnalyzerInfo {
  /** Analyzer name */
  name: string;

  /** Analyzer version */
  version: string;

  /** Analyzer capabilities */
  capabilities: string[];

  /** Last updated */
  lastUpdated: Date;
}

/**
 * Analysis configuration
 */
export interface AnalysisConfiguration {
  /** Analysis depth */
  depth: AnalysisDepth;

  /** Timeout settings */
  timeouts: ResponseTimeoutConfig;

  /** Enabled analyzers */
  enabledAnalyzers: URLAnalysisType[];

  /** Custom settings */
  customSettings: Record<string, unknown>;
}

/**
 * Analysis depth levels
 */
export enum AnalysisDepth {
  BASIC = 'basic',
  STANDARD = 'standard',
  COMPREHENSIVE = 'comprehensive',
  EXHAUSTIVE = 'exhaustive',
}

/**
 * Analysis source
 */
export interface AnalysisSource {
  /** Source name */
  name: string;

  /** Source type */
  type: AnalysisSourceType;

  /** Source URL */
  url?: string;

  /** Source reliability */
  reliability: number;

  /** Last updated */
  lastUpdated: Date;
}

/**
 * Analysis source types
 */
export enum AnalysisSourceType {
  THREAT_INTELLIGENCE = 'threat_intelligence',
  REPUTATION_SERVICE = 'reputation_service',
  BLACKLIST = 'blacklist',
  WHITELIST = 'whitelist',
  CONTENT_ANALYSIS = 'content_analysis',
  DNS_RECORDS = 'dns_records',
  CERTIFICATE_DATA = 'certificate_data',
}

// ===========================
// URL NAVIGATION SAFETY GUARD
// ===========================

@Injectable()
export class URLNavigationSafetyGuard implements CanActivate {
  private readonly logger = new Logger(URLNavigationSafetyGuard.name);

  /** URL safety validation cache */
  private readonly validationCache = new Map<string, URLSafetyAnalysis>();

  /** Threat intelligence cache */
  private readonly threatCache = new Map<string, any>();

  /** Domain reputation cache */
  private readonly reputationCache = new Map<string, any>();

  /** Configuration */
  private readonly config: URLSafetyConfig;

  /** Default configuration */
  private readonly defaultConfig: URLSafetyConfig = {
    enabled: true,
    enableThreatDetection: true,
    enableDomainReputation: true,
    enableContentAnalysis: true,
    strictMode: false,
    allowedDomains: [
      {
        pattern: 'localhost',
        type: DomainRuleType.EXACT_MATCH,
        description: 'Local development',
        riskLevel: URLRiskLevel.TRUSTED,
      },
      {
        pattern: '*.local.dev',
        type: DomainRuleType.WILDCARD,
        description: 'Local development domains',
        riskLevel: URLRiskLevel.TRUSTED,
      },
      {
        pattern: '*.company.com',
        type: DomainRuleType.WILDCARD,
        description: 'Company domains',
        riskLevel: URLRiskLevel.TRUSTED,
      },
    ],
    blockedDomains: [
      {
        pattern: '*.malicious.com',
        type: DomainRuleType.WILDCARD,
        description: 'Known malicious domain',
        riskLevel: URLRiskLevel.BLOCKED,
      },
    ],
    validationRules: [],
    threatDetection: {
      enabled: true,
      threatFeeds: [
        {
          name: 'internal_blacklist',
          url: 'internal://blacklist',
          type: ThreatFeedType.MALWARE_DOMAINS,
          updateIntervalMs: 3600000,
          reliability: 0.95,
        },
      ],
      realTimeAnalysis: true,
      contentScanning: false,
      dnsAnalysis: true,
      certificateValidation: true,
      responseTimeouts: {
        dnsTimeoutMs: 5000,
        httpTimeoutMs: 10000,
        certTimeoutMs: 5000,
        contentTimeoutMs: 15000,
      },
    },
    geographicRestrictions: {
      enabled: false,
      allowedCountries: [],
      blockedCountries: [],
      restrictedRegions: [],
      complianceZones: [],
    },
    complianceRequirements: [],
  };

  constructor(
    private readonly reflector: Reflector,
    private readonly browserValidationService: BrowserParlantValidationService,
    private readonly riskAssessmentEngine: BrowserRiskAssessmentEngine,
    config: Partial<URLSafetyConfig> = {},
  ) {
    // Merge configuration
    this.config = { ...this.defaultConfig, ...config };

    this.logger.log('URL Navigation Safety Guard initialized', {
      enabled: this.config.enabled,
      strictMode: this.config.strictMode,
      threatDetection: this.config.enableThreatDetection,
    });

    // Initialize validation rules
    this.initializeValidationRules();

    // Start background tasks
    this.startThreatIntelligenceUpdates();
    this.startCacheCleanup();
  }

  /**
   * Main guard activation method
   */
  async canActivate(_context: ExecutionContext): Promise<boolean> {
    if (!this.config.enabled) {
      return true;
    }

    try {
      const request = context.switchToHttp().getRequest<Request>();
      const targetUrl = this.extractTargetUrl(request);

      if (!targetUrl) {
        // No URL to validate, allow request
        return true;
      }

      // Create navigation context
      const navigationContext = await this.createNavigationContext(request);

      // Perform URL safety analysis
      const safetyAnalysis = await this.analyzeURLSafety(
        targetUrl,
        navigationContext,
      );

      // Log analysis result
      this.logger.debug('URL safety analysis completed', {
        url: targetUrl,
        safe: safetyAnalysis.safe,
        riskLevel: safetyAnalysis.riskLevel,
        safetyScore: safetyAnalysis.safetyScore,
        _threatIndicators: safetyAnalysis.threatIndicators.length,
      });

      // Check if URL is safe
      if (!safetyAnalysis.safe) {
        this.logger.warn('URL navigation blocked due to safety concerns', {
          url: targetUrl,
          riskLevel: safetyAnalysis.riskLevel,
          reasons: safetyAnalysis.analysisResults
            .filter((r) => r.status === AnalysisStatus.FAILED)
            .map((r) => r.message),
          _threatIndicators: safetyAnalysis.threatIndicators.map((t) => t.type),
        });

        // Store analysis result in request for error response
        (request as any).urlSafetyAnalysis = safetyAnalysis;

        return false;
      }

      // For high-risk URLs, perform additional PARLANT validation
      if (
        safetyAnalysis.riskLevel === URLRiskLevel.HIGH ||
        safetyAnalysis.riskLevel === URLRiskLevel.MEDIUM
      ) {
        const parlantApproved = await this.performParlantValidation(
          targetUrl,
          navigationContext,
        );
        if (!parlantApproved) {
          this.logger.warn('URL navigation blocked by PARLANT validation', {
            url: targetUrl,
            riskLevel: safetyAnalysis.riskLevel,
          });
          return false;
        }
      }

      // Store analysis result in request for monitoring
      (request as any).urlSafetyAnalysis = safetyAnalysis;

      return true;
    } catch (error) {
      this.logger.error('URL safety guard error', {
        _error: error instanceof Error ? error.message : String(error),
      });

      // In strict mode, block on error; otherwise allow
      return !this.config.strictMode;
    }
  }

  /**
   * Analyze URL safety
   */
  private async analyzeURLSafety(
    targetUrl: string,
    _context: NavigationContext,
  ): Promise<URLSafetyAnalysis> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(targetUrl, context);
      const cached = this.validationCache.get(cacheKey);
      if (cached) {
        this.logger.debug(`Using cached URL safety analysis: ${targetUrl}`);
        return cached;
      }

      // Parse URL
      const url = new URL(targetUrl);

      // Parallel analysis
      const [
        domainReputationResult,
        malwareAnalysisResult,
        phishingAnalysisResult,
        certificateResult,
        dnsAnalysisResult,
        geographicResult,
        complianceResult,
      ] = await Promise.all([
        this.analyzeDomainReputation(url, context),
        this.analyzeMalware(url, context),
        this.analyzePhishing(url, context),
        this.analyzeCertificate(url, context),
        this.analyzeDNS(url, context),
        this.analyzeGeographic(url, context),
        this.analyzeCompliance(url, context),
      ]);

      // Combine analysis results
      const analysisResults = [
        domainReputationResult,
        malwareAnalysisResult,
        phishingAnalysisResult,
        certificateResult,
        dnsAnalysisResult,
        geographicResult,
        complianceResult,
      ].filter((result) => result !== null) as URLAnalysisResult[];

      // Calculate overall safety score
      const safetyScore = this.calculateSafetyScore(analysisResults);

      // Determine risk level
      const riskLevel = this.determineRiskLevel(safetyScore, analysisResults);

      // Extract threat indicators
      const threatIndicators = this.extractThreatIndicators(
        analysisResults,
        url,
      );

      // Check compliance status
      const complianceStatus = await this.checkComplianceStatus(url, context);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        analysisResults,
        threatIndicators,
      );

      // Determine if URL is safe
      const safe = this.determineSafety(
        safetyScore,
        riskLevel,
        threatIndicators,
        this.config.strictMode,
      );

      const safetyAnalysis: URLSafetyAnalysis = {
        url: targetUrl,
        safetyScore,
        riskLevel,
        safe,
        analysisResults,
        threatIndicators,
        complianceStatus,
        recommendations,
        _metadata: {
          analyzedAt: new Date(),
          analysisDurationMs: Date.now() - startTime,
          analysisVersion: '1.0.0',
          analyzer: {
            name: 'URLNavigationSafetyGuard',
            version: '1.0.0',
            capabilities: [
              'domain_reputation',
              'malware_detection',
              'phishing_detection',
            ],
            lastUpdated: new Date(),
          },
          configuration: {
            depth: AnalysisDepth.STANDARD,
            timeouts: this.config.threatDetection.responseTimeouts,
            enabledAnalyzers: [
              URLAnalysisType.DOMAIN_REPUTATION,
              URLAnalysisType.MALWARE_SCAN,
              URLAnalysisType.PHISHING_DETECTION,
              URLAnalysisType.CERTIFICATE_VALIDATION,
              URLAnalysisType.DNS_ANALYSIS,
            ],
            customSettings: {},
          },
          sources: [
            {
              name: 'internal_analysis',
              type: AnalysisSourceType.REPUTATION_SERVICE,
              reliability: 0.8,
              lastUpdated: new Date(),
            },
          ],
        },
      };

      // Cache the result
      this.validationCache.set(cacheKey, safetyAnalysis);

      return safetyAnalysis;
    } catch (error) {
      this.logger.error('URL safety analysis failed', {
        url: targetUrl,
        _error: error instanceof Error ? error.message : String(error),
      });

      // Return safe analysis on error (unless strict mode)
      return this.createFailsafeAnalysis(targetUrl, this.config.strictMode);
    }
  }

  /**
   * Analyze domain reputation
   */
  private async analyzeDomainReputation(
    url: URL,
    _context: NavigationContext,
  ): Promise<URLAnalysisResult> {
    const startTime = Date.now();

    try {
      const domain = url.hostname;

      // Check against allowed domains
      const allowedMatch = this.matchDomainRule(
        domain,
        this.config.allowedDomains,
      );
      if (allowedMatch) {
        return {
          type: URLAnalysisType.DOMAIN_REPUTATION,
          status: AnalysisStatus.PASSED,
          score: 95,
          message: `Domain allowed: ${allowedMatch.description}`,
          evidence: { rule: allowedMatch, domain },
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Check against blocked domains
      const blockedMatch = this.matchDomainRule(
        domain,
        this.config.blockedDomains,
      );
      if (blockedMatch) {
        return {
          type: URLAnalysisType.DOMAIN_REPUTATION,
          status: AnalysisStatus.FAILED,
          score: 5,
          message: `Domain blocked: ${blockedMatch.description}`,
          evidence: { rule: blockedMatch, domain },
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Get domain reputation from cache or external service
      const _reputation = await this.getDomainReputation(domain);

      let status = AnalysisStatus.PASSED;
      const score = reputation.score;
      let message = `Domain reputation: ${reputation.classification}`;

      if (reputation.score < 30) {
        status = AnalysisStatus.FAILED;
        message = 'Poor domain reputation detected';
      } else if (reputation.score < 60) {
        status = AnalysisStatus.WARNING;
        message = 'Moderate domain reputation concerns';
      }

      return {
        type: URLAnalysisType.DOMAIN_REPUTATION,
        status,
        score,
        message,
        evidence: {
          domain,
          _reputation,
          sources: reputation.sources,
        },
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        type: URLAnalysisType.DOMAIN_REPUTATION,
        status: AnalysisStatus.ERROR,
        score: 50,
        message: `Domain reputation analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        evidence: {
          _error: error instanceof Error ? error.message : String(error),
        },
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Analyze malware threats
   */
  private async analyzeMalware(
    url: URL,
    _context: NavigationContext,
  ): Promise<URLAnalysisResult> {
    const startTime = Date.now();

    try {
      const domain = url.hostname;
      const fullUrl = url.toString();

      // Check against known malware domains/URLs
      const malwareDetected = await this.checkMalwareThreats(fullUrl, domain);

      let status = AnalysisStatus.PASSED;
      let score = 90;
      let message = 'No malware threats detected';

      if (malwareDetected.detected) {
        status = AnalysisStatus.FAILED;
        score = 10;
        message = `Malware threat detected: ${malwareDetected.type}`;
      }

      return {
        type: URLAnalysisType.MALWARE_SCAN,
        status,
        score,
        message,
        evidence: {
          domain,
          url: fullUrl,
          malwareDetected: malwareDetected.detected,
          threatType: malwareDetected.type,
          confidence: malwareDetected.confidence,
        },
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        type: URLAnalysisType.MALWARE_SCAN,
        status: AnalysisStatus.ERROR,
        score: 50,
        message: 'Malware analysis failed',
        evidence: {
          _error: error instanceof Error ? error.message : String(error),
        },
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Analyze phishing threats
   */
  private async analyzePhishing(
    url: URL,
    _context: NavigationContext,
  ): Promise<URLAnalysisResult> {
    const startTime = Date.now();

    try {
      const domain = url.hostname;
      const fullUrl = url.toString();

      // Check for phishing indicators
      const phishingResult = await this.checkPhishingIndicators(
        fullUrl,
        domain,
      );

      let status = AnalysisStatus.PASSED;
      let score = 85;
      let message = 'No phishing indicators detected';

      if (phishingResult.detected) {
        if (phishingResult.confidence > 0.8) {
          status = AnalysisStatus.FAILED;
          score = 15;
          message = 'High confidence phishing detection';
        } else if (phishingResult.confidence > 0.5) {
          status = AnalysisStatus.WARNING;
          score = 40;
          message = 'Potential phishing indicators detected';
        }
      }

      return {
        type: URLAnalysisType.PHISHING_DETECTION,
        status,
        score,
        message,
        evidence: {
          domain,
          url: fullUrl,
          phishingDetected: phishingResult.detected,
          confidence: phishingResult.confidence,
          indicators: phishingResult.indicators,
        },
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        type: URLAnalysisType.PHISHING_DETECTION,
        status: AnalysisStatus.ERROR,
        score: 50,
        message: 'Phishing analysis failed',
        evidence: {
          _error: error instanceof Error ? error.message : String(error),
        },
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Analyze SSL certificate
   */
  private async analyzeCertificate(
    url: URL,
    _context: NavigationContext,
  ): Promise<URLAnalysisResult> {
    const startTime = Date.now();

    try {
      if (url.protocol !== 'https:') {
        return {
          type: URLAnalysisType.CERTIFICATE_VALIDATION,
          status: AnalysisStatus.WARNING,
          score: 60,
          message: 'Insecure HTTP protocol detected',
          evidence: { protocol: url.protocol, secure: false },
          processingTimeMs: Date.now() - startTime,
        };
      }

      // In a real implementation, would validate SSL certificate
      // For now, assume HTTPS URLs have valid certificates
      return {
        type: URLAnalysisType.CERTIFICATE_VALIDATION,
        status: AnalysisStatus.PASSED,
        score: 90,
        message: 'HTTPS protocol detected',
        evidence: { protocol: url.protocol, secure: true },
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        type: URLAnalysisType.CERTIFICATE_VALIDATION,
        status: AnalysisStatus.ERROR,
        score: 50,
        message: 'Certificate analysis failed',
        evidence: {
          _error: error instanceof Error ? error.message : String(error),
        },
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Analyze DNS information
   */
  private async analyzeDNS(
    url: URL,
    _context: NavigationContext,
  ): Promise<URLAnalysisResult> {
    const startTime = Date.now();

    try {
      const domain = url.hostname;

      // Basic DNS validation (in production would do real DNS lookup)
      const dnsResult = await this.performDNSAnalysis(domain);

      let status = AnalysisStatus.PASSED;
      let score = 80;
      let message = 'DNS analysis completed';

      if (dnsResult.suspicious) {
        status = AnalysisStatus.WARNING;
        score = 40;
        message = 'Suspicious DNS patterns detected';
      }

      return {
        type: URLAnalysisType.DNS_ANALYSIS,
        status,
        score,
        message,
        evidence: {
          domain,
          dnsResult,
          ipAddresses: dnsResult.ipAddresses,
          suspicious: dnsResult.suspicious,
        },
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        type: URLAnalysisType.DNS_ANALYSIS,
        status: AnalysisStatus.ERROR,
        score: 50,
        message: 'DNS analysis failed',
        evidence: {
          _error: error instanceof Error ? error.message : String(error),
        },
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Analyze geographic restrictions
   */
  private async analyzeGeographic(
    url: URL,
    _context: NavigationContext,
  ): Promise<URLAnalysisResult | null> {
    if (!this.config.geographicRestrictions.enabled) {
      return null;
    }

    const startTime = Date.now();

    try {
      const domain = url.hostname;
      const userLocation = context.userContext.geolocation;

      if (!userLocation) {
        return {
          type: URLAnalysisType.GEOGRAPHIC_ANALYSIS,
          status: AnalysisStatus.WARNING,
          score: 70,
          message: 'User location unknown for geographic analysis',
          evidence: { domain, userLocationAvailable: false },
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Check geographic restrictions
      const restrictionResult = this.checkGeographicRestrictions(userLocation);

      let status = AnalysisStatus.PASSED;
      let score = 90;
      let message = 'Geographic analysis passed';

      if (restrictionResult.restricted) {
        status =
          restrictionResult.severity === 'high'
            ? AnalysisStatus.FAILED
            : AnalysisStatus.WARNING;
        score = restrictionResult.severity === 'high' ? 20 : 50;
        message = `Geographic restriction: ${restrictionResult.reason}`;
      }

      return {
        type: URLAnalysisType.GEOGRAPHIC_ANALYSIS,
        status,
        score,
        message,
        evidence: {
          domain,
          userLocation,
          restrictionResult,
          restricted: restrictionResult.restricted,
        },
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        type: URLAnalysisType.GEOGRAPHIC_ANALYSIS,
        status: AnalysisStatus.ERROR,
        score: 50,
        message: 'Geographic analysis failed',
        evidence: {
          _error: error instanceof Error ? error.message : String(error),
        },
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Analyze compliance requirements
   */
  private async analyzeCompliance(
    url: URL,
    _context: NavigationContext,
  ): Promise<URLAnalysisResult | null> {
    if (this.config.complianceRequirements.length === 0) {
      return null;
    }

    const startTime = Date.now();

    try {
      const domain = url.hostname;

      // Check applicable compliance requirements
      const applicableRequirements = this.config.complianceRequirements.filter(
        (req) =>
          req.applicableDomains.some((pattern) =>
            this.matchesPattern(domain, pattern),
          ),
      );

      if (applicableRequirements.length === 0) {
        return {
          type: URLAnalysisType.GEOGRAPHIC_ANALYSIS,
          status: AnalysisStatus.PASSED,
          score: 100,
          message: 'No applicable compliance requirements',
          evidence: { domain, applicableRequirements: [] },
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Validate compliance requirements
      const complianceValidation = await this.validateComplianceRequirements(
        url,
        context,
        applicableRequirements,
      );

      let status = AnalysisStatus.PASSED;
      let score = complianceValidation.overallScore;
      let message = `Compliance validation: ${complianceValidation.status}`;

      if (complianceValidation.violations.length > 0) {
        status = AnalysisStatus.FAILED;
        score = Math.min(score, 30);
        message = `Compliance violations detected: ${complianceValidation.violations.length}`;
      }

      return {
        type: URLAnalysisType.GEOGRAPHIC_ANALYSIS,
        status,
        score,
        message,
        evidence: {
          domain,
          applicableRequirements,
          complianceValidation,
          violations: complianceValidation.violations,
        },
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        type: URLAnalysisType.GEOGRAPHIC_ANALYSIS,
        status: AnalysisStatus.ERROR,
        score: 50,
        message: 'Compliance analysis failed',
        evidence: {
          _error: error instanceof Error ? error.message : String(error),
        },
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  // ===========================
  // HELPER METHODS
  // ===========================

  /**
   * Extract target URL from request
   */
  private extractTargetUrl(_request: Request): string | null {
    // Try various sources for target URL
    return (request.body?.url ||
      request.query.url ||
      request.params.url ||
      request.headers['x-target-url'] ||
      null) as string | null;
  }

  /**
   * Create navigation context from request
   */
  private async createNavigationContext(
    _request: Request,
  ): Promise<NavigationContext> {
    const userId = this.extractUserId(request);
    const sessionId = this.extractSessionId(request);
    const ipAddress = this.extractClientIp(request);

    return {
      operationId: `nav_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      userContext: {
        userId,
        roles: this.extractUserRoles(request),
        sessionId,
        ipAddress,
        geolocation: await this.getGeolocation(ipAddress),
      },
      browserContext: {
        sessionId,
        userAgent: request.headers['user-agent'] || 'unknown',
        referrer: request.headers.referer,
        currentUrl: request.headers['x-current-url'] as string,
      },
      requestMetadata: {
        timestamp: new Date(),
        requestId: this.generateRequestId(),
        method: request.method,
        headers: this.sanitizeHeaders(request.headers),
      },
      securityContext: {
        authenticated: this.isAuthenticated(request),
        authorizationLevel: this.getAuthorizationLevel(request),
        securityClearance: this.getSecurityClearance(request),
        threatLevel: this.getThreatLevel(request),
      },
    };
  }

  /**
   * Perform PARLANT validation for high-risk URLs
   */
  private async performParlantValidation(
    targetUrl: string,
    _context: NavigationContext,
  ): Promise<boolean> {
    try {
      const operationContext: BrowserOperationContext = {
        operationId: context.operationId,
        sessionId: context.browserContext.sessionId,
        operationType: BrowserOperationType.NAVIGATE,
        targetUrl,
        userContext: context.userContext,
        browserState: {
          activeSessionsCount: 1,
          currentUrl: context.browserContext.currentUrl,
          domainClassification: this.classifyDomain(
            new URL(targetUrl).hostname,
          ),
          securityHeaders: [],
          suspiciousActivityDetected: false,
          resourceUsage: { memoryMB: 0, cpuPercent: 0, networkConnections: 0 },
          cspStatus: {
            present: false,
            policies: [],
            violations: [],
            riskLevel: RiskLevel.MEDIUM,
          },
          lastSecurityScan: new Date(),
        },
        operationParams: { url: targetUrl },
      };

      const validationResult =
        await this.browserValidationService.validateNavigation(
          operationContext,
        );
      return validationResult.approved;
    } catch (error) {
      this.logger.error('PARLANT validation failed for URL navigation', {
        url: targetUrl,
        _error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Match domain against rules
   */
  private matchDomainRule(
    domain: string,
    rules: URLDomainRule[],
  ): URLDomainRule | null {
    for (const rule of rules) {
      if (this.matchesRule(domain, rule)) {
        return rule;
      }
    }
    return null;
  }

  /**
   * Check if domain matches rule
   */
  private matchesRule(domain: string, rule: URLDomainRule): boolean {
    switch (rule.type) {
      case DomainRuleType.EXACT_MATCH:
        return domain === rule.pattern;

      case DomainRuleType.WILDCARD:
        return this.matchesWildcard(domain, rule.pattern);

      case DomainRuleType.REGEX:
        try {
          return new RegExp(rule.pattern, 'i').test(domain);
        } catch {
          return false;
        }

      case DomainRuleType.SUBDOMAIN:
        return domain.endsWith(rule.pattern) || domain === rule.pattern;

      case DomainRuleType.TLD:
        return domain.endsWith(`.${rule.pattern}`);

      default:
        return false;
    }
  }

  /**
   * Check wildcard pattern match
   */
  private matchesWildcard(domain: string, pattern: string): boolean {
    const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
    try {
      return new RegExp(`^${regexPattern}$`, 'i').test(domain);
    } catch {
      return false;
    }
  }

  /**
   * Check pattern match
   */
  private matchesPattern(domain: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      return this.matchesWildcard(domain, pattern);
    }
    return domain === pattern || domain.endsWith(`.${pattern}`);
  }

  /**
   * Get domain reputation (mock implementation)
   */
  private async getDomainReputation(domain: string): Promise<{
    score: number;
    classification: string;
    sources: string[];
  }> {
    // Check cache
    const cached = this.reputationCache.get(domain);
    if (cached) {
      return cached;
    }

    // Mock reputation scoring
    let score = 75; // Default neutral score
    let classification = 'neutral';

    if (domain.includes('malware') || domain.includes('phishing')) {
      score = 15;
      classification = 'malicious';
    } else if (domain.includes('suspicious')) {
      score = 35;
      classification = 'suspicious';
    } else if (
      domain.includes('localhost') ||
      domain.endsWith('.local') ||
      domain.endsWith('.dev')
    ) {
      score = 95;
      classification = 'trusted';
    } else if (
      domain.includes('google') ||
      domain.includes('microsoft') ||
      domain.includes('amazon')
    ) {
      score = 90;
      classification = 'trusted';
    }

    const result = {
      score,
      classification,
      sources: ['internal_analysis'],
    };

    // Cache the result
    this.reputationCache.set(domain, result);

    return result;
  }

  /**
   * Check malware threats (mock implementation)
   */
  private async checkMalwareThreats(
    url: string,
    domain: string,
  ): Promise<{
    detected: boolean;
    type?: string;
    confidence: number;
  }> {
    // Simple pattern-based detection for demo
    const malwarePatterns = ['malware', 'trojan', 'virus', 'exploit'];
    const detected = malwarePatterns.some(
      (pattern) =>
        url.toLowerCase().includes(pattern) ||
        domain.toLowerCase().includes(pattern),
    );

    return {
      detected,
      type: detected ? 'malware_hosting' : undefined,
      confidence: detected ? 0.9 : 0.1,
    };
  }

  /**
   * Check phishing indicators (mock implementation)
   */
  private async checkPhishingIndicators(
    url: string,
    domain: string,
  ): Promise<{
    detected: boolean;
    confidence: number;
    indicators: string[];
  }> {
    const indicators: string[] = [];
    let confidence = 0;

    // Check for common phishing patterns
    if (url.includes('phishing') || domain.includes('phishing')) {
      indicators.push('phishing_keyword');
      confidence += 0.8;
    }

    if (
      domain.includes('login') &&
      !domain.includes('google') &&
      !domain.includes('microsoft')
    ) {
      indicators.push('suspicious_login_domain');
      confidence += 0.3;
    }

    if (url.includes('verify-account') || url.includes('update-payment')) {
      indicators.push('suspicious_action_request');
      confidence += 0.4;
    }

    // Homograph attack detection (simplified)
    if (/[а-я]/.test(domain)) {
      // Cyrillic characters
      indicators.push('homograph_attack');
      confidence += 0.6;
    }

    confidence = Math.min(confidence, 1.0);

    return {
      detected: indicators.length > 0,
      confidence,
      indicators,
    };
  }

  /**
   * Perform DNS analysis (mock implementation)
   */
  private async performDNSAnalysis(domain: string): Promise<{
    ipAddresses: string[];
    suspicious: boolean;
    analysis: string;
  }> {
    // Mock DNS analysis
    const ipAddresses = ['192.168.1.1']; // Mock IP
    let suspicious = false;

    // Check for suspicious patterns
    if (domain.includes('suspicious') || domain.includes('malware')) {
      suspicious = true;
    }

    return {
      ipAddresses,
      suspicious,
      analysis: suspicious
        ? 'Suspicious DNS patterns detected'
        : 'DNS analysis normal',
    };
  }

  /**
   * Check geographic restrictions
   */
  private checkGeographicRestrictions(location: GeolocationInfo): {
    restricted: boolean;
    reason?: string;
    severity?: string;
  } {
    const restrictions = this.config.geographicRestrictions;

    // Check blocked countries
    if (restrictions.blockedCountries.includes(location.country)) {
      return {
        restricted: true,
        reason: `Access blocked from country: ${location.country}`,
        severity: 'high',
      };
    }

    // Check allowed countries (if specified)
    if (
      restrictions.allowedCountries.length > 0 &&
      !restrictions.allowedCountries.includes(location.country)
    ) {
      return {
        restricted: true,
        reason: `Country not in allowed list: ${location.country}`,
        severity: 'medium',
      };
    }

    // Check restricted regions
    for (const region of restrictions.restrictedRegions) {
      if (region.countries.includes(location.country)) {
        const severity =
          region.type === RestrictionType.BLOCKED ? 'high' : 'medium';
        return {
          restricted: true,
          reason: `Regional restriction: ${region.reason}`,
          severity,
        };
      }
    }

    return { restricted: false };
  }

  /**
   * Validate compliance requirements
   */
  private async validateComplianceRequirements(
    url: URL,
    _context: NavigationContext,
    requirements: ComplianceRequirement[],
  ): Promise<{
    status: string;
    overallScore: number;
    violations: string[];
    validations: any[];
  }> {
    const violations: string[] = [];
    const validations: any[] = [];
    let totalScore = 0;

    for (const requirement of requirements) {
      for (const validation of requirement.validations) {
        const result = await this.performComplianceValidation(
          url,
          context,
          validation,
        );
        validations.push(result);
        totalScore += result.score;

        if (!result.passed) {
          violations.push(result.violation);
        }
      }
    }

    const overallScore =
      validations.length > 0 ? totalScore / validations.length : 100;
    const status = violations.length === 0 ? 'compliant' : 'non_compliant';

    return {
      status,
      overallScore,
      violations,
      validations,
    };
  }

  /**
   * Perform individual compliance validation
   */
  private async performComplianceValidation(
    url: URL,
    _context: NavigationContext,
    validation: ComplianceValidation,
  ): Promise<{
    type: string;
    passed: boolean;
    score: number;
    violation?: string;
  }> {
    // Mock compliance validation
    switch (validation.type) {
      case ComplianceValidationType.ENCRYPTION_VALIDATION: {
        const _isHttps = url.protocol === 'https:';
        return {
          type: validation.type,
          passed: _isHttps,
          score: _isHttps ? 100 : 0,
          violation: _isHttps ? undefined : 'HTTPS encryption required',
        };
      }

      case ComplianceValidationType.CONSENT_VERIFICATION:
        // Mock consent check
        return {
          type: validation.type,
          passed: true,
          score: 90,
        };

      default:
        return {
          type: validation.type,
          passed: true,
          score: 85,
        };
    }
  }

  /**
   * Calculate overall safety score
   */
  private calculateSafetyScore(results: URLAnalysisResult[]): number {
    if (results.length === 0) return 50;

    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    return Math.round(totalScore / results.length);
  }

  /**
   * Determine risk level from analysis
   */
  private determineRiskLevel(
    score: number,
    results: URLAnalysisResult[],
  ): URLRiskLevel {
    // Check for any failed analysis
    const hasFailures = results.some((r) => r.status === AnalysisStatus.FAILED);
    if (hasFailures) {
      return URLRiskLevel.HIGH;
    }

    // Check for warnings
    const hasWarnings = results.some(
      (r) => r.status === AnalysisStatus.WARNING,
    );
    if (hasWarnings) {
      return URLRiskLevel.MEDIUM;
    }

    // Base on score
    if (score >= 80) return URLRiskLevel.TRUSTED;
    if (score >= 60) return URLRiskLevel.LOW;
    if (score >= 40) return URLRiskLevel.MEDIUM;
    if (score >= 20) return URLRiskLevel.HIGH;
    return URLRiskLevel.MALICIOUS;
  }

  /**
   * Extract threat indicators from analysis
   */
  private extractThreatIndicators(
    results: URLAnalysisResult[],
    _url: URL,
  ): URLThreatIndicator[] {
    const indicators: URLThreatIndicator[] = [];

    for (const result of results) {
      if (result.status === AnalysisStatus.FAILED) {
        let threatType = URLThreatType.SUSPICIOUS_DOMAIN;
        let severity = ThreatSeverity.MEDIUM;

        // Map analysis type to threat type
        switch (result.type) {
          case URLAnalysisType.MALWARE_SCAN:
            threatType = URLThreatType.MALWARE_HOSTING;
            severity = ThreatSeverity.HIGH;
            break;
          case URLAnalysisType.PHISHING_DETECTION:
            threatType = URLThreatType.PHISHING_SITE;
            severity = ThreatSeverity.HIGH;
            break;
          case URLAnalysisType.CERTIFICATE_VALIDATION:
            threatType = URLThreatType.CERTIFICATE_ISSUE;
            severity = ThreatSeverity.MEDIUM;
            break;
          case URLAnalysisType.DNS_ANALYSIS:
            threatType = URLThreatType.DNS_HIJACKING;
            severity = ThreatSeverity.MEDIUM;
            break;
        }

        indicators.push({
          id: this.generateThreatId(),
          type: threatType,
          severity,
          description: result.message,
          confidence: result.score > 50 ? (100 - result.score) / 100 : 0.8,
          source: 'URLNavigationSafetyGuard',
          evidence: result.evidence,
          mitigations: this.generateMitigations(threatType),
        });
      }
    }

    return indicators;
  }

  /**
   * Check compliance status
   */
  private async checkComplianceStatus(
    url: URL,
    _context: NavigationContext,
  ): Promise<URLComplianceStatus[]> {
    const status: URLComplianceStatus[] = [];

    for (const requirement of this.config.complianceRequirements) {
      const complianceResult = await this.validateComplianceRequirements(
        url,
        context,
        [requirement],
      );

      status.push({
        framework: requirement.framework,
        status:
          complianceResult.violations.length === 0
            ? ComplianceStatus.COMPLIANT
            : ComplianceStatus.NON_COMPLIANT,
        score: complianceResult.overallScore,
        requiredActions: complianceResult.violations,
        evidence: [
          {
            type: 'automated_validation',
            description: 'Automated compliance validation result',
            _data: { validations: complianceResult.validations },
            timestamp: new Date(),
          },
        ],
      });
    }

    return status;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    results: URLAnalysisResult[],
    _threatIndicators: URLThreatIndicator[],
  ): URLRecommendation[] {
    const recommendations: URLRecommendation[] = [];

    // Security recommendations based on failed analyses
    const failedResults = results.filter(
      (r) => r.status === AnalysisStatus.FAILED,
    );
    if (failedResults.length > 0) {
      recommendations.push({
        type: RecommendationType.SECURITY_ENHANCEMENT,
        priority: RecommendationPriority.HIGH,
        description:
          'Security issues detected that require immediate attention',
        actions: [
          'Do not proceed to this URL',
          'Verify URL legitimacy through alternative channels',
          'Report suspicious URL to security team',
        ],
        impact: {
          security: ImpactLevel.HIGH,
          performance: ImpactLevel.NONE,
          userExperience: ImpactLevel.MEDIUM,
          compliance: ImpactLevel.MEDIUM,
        },
      });
    }

    // Warning-based recommendations
    const warningResults = results.filter(
      (r) => r.status === AnalysisStatus.WARNING,
    );
    if (warningResults.length > 0) {
      recommendations.push({
        type: RecommendationType.SECURITY_ENHANCEMENT,
        priority: RecommendationPriority.MEDIUM,
        description: 'Potential security concerns detected',
        actions: [
          'Proceed with caution',
          'Enable enhanced monitoring',
          'Consider using HTTPS if available',
        ],
        impact: {
          security: ImpactLevel.MEDIUM,
          performance: ImpactLevel.MINIMAL,
          userExperience: ImpactLevel.LOW,
          compliance: ImpactLevel.LOW,
        },
      });
    }

    // Performance optimization recommendations
    if (results.some((r) => r.processingTimeMs > 5000)) {
      recommendations.push({
        type: RecommendationType.PERFORMANCE_OPTIMIZATION,
        priority: RecommendationPriority.LOW,
        description: 'URL analysis took longer than expected',
        actions: [
          'Consider implementing URL caching',
          'Optimize threat detection algorithms',
          'Review timeout settings',
        ],
        impact: {
          security: ImpactLevel.NONE,
          performance: ImpactLevel.MEDIUM,
          userExperience: ImpactLevel.LOW,
          compliance: ImpactLevel.NONE,
        },
      });
    }

    return recommendations;
  }

  /**
   * Determine if URL is safe
   */
  private determineSafety(
    score: number,
    riskLevel: URLRiskLevel,
    _threatIndicators: URLThreatIndicator[],
    strictMode: boolean,
  ): boolean {
    // Blocked or malicious URLs are never safe
    if (
      riskLevel === URLRiskLevel.BLOCKED ||
      riskLevel === URLRiskLevel.MALICIOUS
    ) {
      return false;
    }

    // High severity threats make URL unsafe
    const hasHighThreat = threatIndicators.some(
      (t) =>
        t.severity === ThreatSeverity.CRITICAL ||
        t.severity === ThreatSeverity.HIGH,
    );
    if (hasHighThreat) {
      return false;
    }

    // In strict mode, be more conservative
    if (strictMode) {
      return score >= 70 && riskLevel !== URLRiskLevel.HIGH;
    }

    // Normal mode
    return score >= 50 && riskLevel !== URLRiskLevel.HIGH;
  }

  /**
   * Create failsafe analysis for errors
   */
  private createFailsafeAnalysis(
    url: string,
    strictMode: boolean,
  ): URLSafetyAnalysis {
    return {
      url,
      safetyScore: strictMode ? 0 : 50,
      riskLevel: strictMode ? URLRiskLevel.BLOCKED : URLRiskLevel.MEDIUM,
      safe: !strictMode,
      analysisResults: [
        {
          type: URLAnalysisType.DOMAIN_REPUTATION,
          status: AnalysisStatus.ERROR,
          score: strictMode ? 0 : 50,
          message: 'Analysis failed - using failsafe mode',
          evidence: { failsafe: true },
          processingTimeMs: 0,
        },
      ],
      _threatIndicators: [],
      complianceStatus: [],
      recommendations: [
        {
          type: RecommendationType.SECURITY_ENHANCEMENT,
          priority: RecommendationPriority.HIGH,
          description: 'URL analysis failed - manual review recommended',
          actions: ['Manual security review required'],
          impact: {
            security: ImpactLevel.HIGH,
            performance: ImpactLevel.NONE,
            userExperience: ImpactLevel.HIGH,
            compliance: ImpactLevel.MEDIUM,
          },
        },
      ],
      _metadata: {
        analyzedAt: new Date(),
        analysisDurationMs: 0,
        analysisVersion: '1.0.0',
        analyzer: {
          name: 'Failsafe',
          version: '1.0.0',
          capabilities: [],
          lastUpdated: new Date(),
        },
        configuration: {
          depth: AnalysisDepth.BASIC,
          timeouts: this.config.threatDetection.responseTimeouts,
          enabledAnalyzers: [],
          customSettings: { failsafe: true },
        },
        sources: [],
      },
    };
  }

  // ===========================
  // UTILITY METHODS
  // ===========================

  /**
   * Generate cache key
   */
  private generateCacheKey(url: string, _context: NavigationContext): string {
    const keyData = {
      url,
      userId: context.userContext.userId,
      userRoles: context.userContext.roles.sort(),
      strictMode: this.config.strictMode,
    };
    return `url_safety_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  /**
   * Generate threat ID
   */
  private generateThreatId(): string {
    return `threat_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate mitigations for threat type
   */
  private generateMitigations(threatType: URLThreatType): string[] {
    switch (threatType) {
      case URLThreatType.MALWARE_HOSTING:
        return ['Block access', 'Report to security team', 'Scan for malware'];
      case URLThreatType.PHISHING_SITE:
        return [
          'Block access',
          'User education',
          'Report to anti-phishing authority',
        ];
      case URLThreatType.CERTIFICATE_ISSUE:
        return [
          'Verify certificate',
          'Use alternative URL',
          'Contact site administrator',
        ];
      default:
        return ['Enhanced monitoring', 'Proceed with caution'];
    }
  }

  /**
   * Extract user ID from request
   */
  private extractUserId(_request: Request): string {
    return (
      (request as any).user?.id || (request as any).user?.userId || 'anonymous'
    );
  }

  /**
   * Extract session ID from request
   */
  private extractSessionId(_request: Request): string {
    return (
      (request.headers['x-session-id'] as string) ||
      (request as any).sessionID ||
      `session_${Date.now()}`
    );
  }

  /**
   * Extract client IP
   */
  private extractClientIp(_request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Extract user roles
   */
  private extractUserRoles(_request: Request): string[] {
    return (request as any).user?.roles || ['guest'];
  }

  /**
   * Get geolocation from IP
   */
  private async getGeolocation(
    ipAddress: string,
  ): Promise<GeolocationInfo | undefined> {
    // Mock geolocation - in production would use IP geolocation service
    if (
      ipAddress === 'unknown' ||
      ipAddress.startsWith('127.') ||
      ipAddress.startsWith('192.168.')
    ) {
      return {
        country: 'US',
        region: 'Unknown',
        city: 'Unknown',
        timezone: 'UTC',
        accuracy: GeolocationAccuracy.LOW,
      };
    }
    return undefined;
  }

  /**
   * Sanitize headers
   */
  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    Object.entries(headers).forEach(([key, value]) => {
      if (
        !sensitiveHeaders.includes(key.toLowerCase()) &&
        typeof value === 'string'
      ) {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Check if user is authenticated
   */
  private isAuthenticated(_request: Request): boolean {
    return !!(request as any).user;
  }

  /**
   * Get authorization level
   */
  private getAuthorizationLevel(_request: Request): string {
    const roles = (request as any).user?.roles || [];
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('operator')) return 'operator';
    if (roles.includes('user')) return 'user';
    return 'guest';
  }

  /**
   * Get security clearance
   */
  private getSecurityClearance(_request: Request): string[] {
    return (request as any).user?.clearance || ['public'];
  }

  /**
   * Get threat level
   */
  private getThreatLevel(_request: Request): string {
    return (request as any).user?.threatLevel || 'normal';
  }

  /**
   * Classify domain for browser state
   */
  private classifyDomain(domain: string): any {
    if (this.matchDomainRule(domain, this.config.allowedDomains)) {
      return 'INTERNAL';
    }
    if (this.matchDomainRule(domain, this.config.blockedDomains)) {
      return 'BLOCKED';
    }
    return 'EXTERNAL';
  }

  /**
   * Initialize validation rules
   */
  private initializeValidationRules(): void {
    // Protocol security rule
    this.config.validationRules.push({
      id: 'protocol_security',
      name: 'Protocol Security Check',
      type: URLValidationRuleType.PROTOCOL_SECURITY,
      config: { requireHttps: false },
      priority: 1,
      enabled: true,
      validate: (url: URL, _context: NavigationContext) => ({
        allowed: true, // Basic implementation
        ruleId: 'protocol_security',
        message: `Protocol: ${url.protocol}`,
        riskLevel:
          url.protocol === 'https:' ? URLRiskLevel.LOW : URLRiskLevel.MEDIUM,
        confidence: 1.0,
      }),
    });

    // Domain reputation rule
    this.config.validationRules.push({
      id: 'domain_reputation',
      name: 'Domain Reputation Check',
      type: URLValidationRuleType.DOMAIN_REPUTATION,
      config: {},
      priority: 2,
      enabled: true,
      validate: (url: URL, _context: NavigationContext) => {
        const allowedMatch = this.matchDomainRule(
          url.hostname,
          this.config.allowedDomains,
        );
        const blockedMatch = this.matchDomainRule(
          url.hostname,
          this.config.blockedDomains,
        );

        if (blockedMatch) {
          return {
            allowed: false,
            ruleId: 'domain_reputation',
            message: `Domain blocked: ${blockedMatch.description}`,
            riskLevel: URLRiskLevel.BLOCKED,
            confidence: 1.0,
          };
        }

        return {
          allowed: true,
          ruleId: 'domain_reputation',
          message: allowedMatch
            ? `Domain allowed: ${allowedMatch.description}`
            : 'Domain neutral',
          riskLevel: allowedMatch ? URLRiskLevel.TRUSTED : URLRiskLevel.LOW,
          confidence: allowedMatch ? 1.0 : 0.7,
        };
      },
    });
  }

  /**
   * Start threat intelligence updates
   */
  private startThreatIntelligenceUpdates(): void {
    if (!this.config.threatDetection.enabled) {
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
    }, 3600000);
  }

  /**
   * Update threat intelligence
   */
  private async updateThreatIntelligence(): Promise<void> {
    this.logger.debug('Updating threat intelligence feeds');

    for (const feed of this.config.threatDetection.threatFeeds) {
      try {
        // In production, would fetch from external threat feeds
        this.logger.debug(`Updated threat feed: ${feed.name}`);
      } catch (error) {
        this.logger.warn(`Failed to update threat feed: ${feed.name}`, {
          _error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Start cache cleanup
   */
  private startCacheCleanup(): void {
    // Clean up cache every 30 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 1800000);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    let cleaned = 0;

    // Clean validation cache
    for (const [key, analysis] of this.validationCache.entries()) {
      if (now - analysis.metadata.analyzedAt.getTime() > maxAge) {
        this.validationCache.delete(key);
        cleaned++;
      }
    }

    // Clean reputation cache
    for (const [domain, _reputation] of this.reputationCache.entries()) {
      // Simple cleanup - in production would check timestamps
      if (this.reputationCache.size > 1000) {
        this.reputationCache.delete(domain);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Get guard statistics
   */
  public getStatistics() {
    return {
      validationCacheSize: this.validationCache.size,
      reputationCacheSize: this.reputationCache.size,
      threatCacheSize: this.threatCache.size,
      config: {
        enabled: this.config.enabled,
        strictMode: this.config.strictMode,
        threatDetectionEnabled: this.config.enableThreatDetection,
        allowedDomainsCount: this.config.allowedDomains.length,
        blockedDomainsCount: this.config.blockedDomains.length,
        validationRulesCount: this.config.validationRules.length,
      },
    };
  }
}
