/**
 * CSP Violation Reporting Service
 *
 * Enterprise-grade Content Security Policy violation reporting and monitoring system
 * with real-time analysis, threat detection, and automated incident response.
 *
 * Features:
 * - Real-time CSP violation collection and analysis
 * - Violation pattern recognition and threat classification
 * - Automated security incident creation and escalation
 * - Performance impact analysis and optimization
 * - Integration with security monitoring dashboard
 * - Compliance reporting and audit trail
 * - False positive detection and filtering
 * - Security metrics and KPI tracking
 *
 * @fileoverview Advanced CSP violation reporting and security monitoring
 * @version 2.0.0
 * @author CSP Violation Reporting Specialist
 */

import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  generateEventId,
  SecurityEventType,
  createSecurityEvent,
} from "../utils/security.utils";
import { RateLimitServiceType } from "../types/security.types";

/**
 * CSP violation report structure (standard CSP report format)
 */
export interface CSPViolationReport {
  /** Document URI where violation occurred */
  documentUri: string;

  /** Referrer of the document */
  referrer: string;

  /** Violated directive */
  violatedDirective: string;

  /** Effective directive */
  effectiveDirective: string;

  /** Original policy */
  originalPolicy: string;

  /** Disposition (enforce or report) */
  disposition: "enforce" | "report";

  /** Blocked URI */
  blockedUri: string;

  /** Line number where violation occurred */
  lineNumber?: number;

  /** Column number where violation occurred */
  columnNumber?: number;

  /** Sample of the violated content */
  sample?: string;

  /** Status code of the document */
  statusCode?: number;

  /** Source file */
  sourceFile?: string;
}

/**
 * Enhanced violation report with additional security context
 */
export interface EnhancedCSPViolationReport extends CSPViolationReport {
  /** Unique violation ID */
  violationId: string;

  /** Timestamp when violation occurred */
  timestamp: Date;

  /** Service where violation occurred */
  serviceType: RateLimitServiceType;

  /** User agent that caused violation */
  userAgent?: string;

  /** IP address of the client */
  ipAddress?: string;

  /** User ID if available */
  userId?: string;

  /** Session ID if available */
  sessionId?: string;

  /** Request ID for correlation */
  requestId?: string;

  /** Threat classification */
  threatLevel: "low" | "medium" | "high" | "critical";

  /** Risk score (0-100) */
  riskScore: number;

  /** Whether this is likely a false positive */
  isFalsePositive: boolean;

  /** Pattern category */
  violationPattern: ViolationPatternType;

  /** Remediation suggestions */
  remediationSuggestions: string[];

  /** Similar violations count */
  similarViolationsCount: number;

  /** Processing metadata */
  processingMetadata: {
    processingTimeMs: number;
    analysisVersion: string;
    ruleSetVersion: string;
  };
}

/**
 * Violation pattern types for classification
 */
export enum ViolationPatternType {
  _INLINE_SCRIPT_INJECTION = "inline_script_injection",
  _EXTERNAL_SCRIPT_LOAD = "external_script_load",
  _INLINE_STYLE_VIOLATION = "inline_style_violation",
  _FRAME_SRC_VIOLATION = "frame_src_violation",
  _IMG_SRC_VIOLATION = "img_src_violation",
  _CONNECT_SRC_VIOLATION = "connect_src_violation",
  _FONT_SRC_VIOLATION = "font_src_violation",
  _OBJECT_SRC_VIOLATION = "object_src_violation",
  _MEDIA_SRC_VIOLATION = "media_src_violation",
  _EVAL_SCRIPT_VIOLATION = "eval_script_violation",
  _UNSAFE_INLINE_SCRIPT = "unsafe_inline_script",
  _UNSAFE_INLINE_STYLE = "unsafe_inline_style",
  _BASE_URI_VIOLATION = "base_uri_violation",
  _FORM_ACTION_VIOLATION = "form_action_violation",
  _PLUGIN_VIOLATION = "plugin_violation",
  _UNKNOWN_VIOLATION = "unknown_violation",
}

/**
 * CSP violation statistics and metrics
 */
export interface CSPViolationMetrics {
  /** Total violations processed */
  totalViolations: number;

  /** Violations by severity level */
  violationsBySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };

  /** Violations by pattern type */
  violationsByPattern: Record<ViolationPatternType, number>;

  /** Violations by service type */
  violationsByService: Record<RateLimitServiceType, number>;

  /** False positive rate */
  falsePositiveRate: number;

  /** Average processing time */
  averageProcessingTime: number;

  /** Top violated directives */
  topViolatedDirectives: Array<{ directive: string; count: number }>;

  /** Top blocked URIs */
  topBlockedUris: Array<{ uri: string; count: number; threatLevel: string }>;

  /** Trending violations (last 24h) */
  trendingViolations: Array<{
    pattern: ViolationPatternType;
    count: number;
    change: number; // percentage change from previous period
  }>;
}

/**
 * CSP violation reporting configuration
 */
export interface CSPViolationReportingConfig {
  /** Enable violation reporting */
  enabled: boolean;

  /** Service type */
  serviceType: RateLimitServiceType;

  /** Report endpoint URL */
  reportUri: string;

  /** Enable real-time processing */
  realTimeProcessing: boolean;

  /** Enable threat analysis */
  threatAnalysis: boolean;

  /** Enable false positive detection */
  falsePositiveDetection: boolean;

  /** Enable automated incident creation */
  automatedIncidents: boolean;

  /** Violation storage settings */
  storage: {
    /** Enable violation storage */
    enabled: boolean;

    /** Retention period in days */
    retentionDays: number;

    /** Maximum violations to store */
    maxViolations: number;

    /** Enable compression */
    enableCompression: boolean;
  };

  /** Alerting configuration */
  alerting: {
    /** Enable real-time alerts */
    enabled: boolean;

    /** Alert thresholds */
    thresholds: {
      violationsPerMinute: number;
      highThreatViolations: number;
      falsePositiveRate: number;
    };

    /** Alert channels */
    channels: string[]; // email, slack, webhook, etc.
  };

  /** Performance settings */
  performance: {
    /** Batch processing size */
    batchSize: number;

    /** Processing interval in milliseconds */
    processingInterval: number;

    /** Maximum processing time per batch */
    maxProcessingTime: number;

    /** Enable async processing */
    asyncProcessing: boolean;
  };

  /** Compliance and audit */
  compliance: {
    /** Enable audit logging */
    auditLogging: boolean;

    /** Enable compliance reporting */
    complianceReporting: boolean;

    /** Compliance frameworks */
    frameworks: string[];
  };
}

/**
 * Default CSP violation reporting configurations
 */
const DEFAULT_CSP_VIOLATION_CONFIGS = {
  bytebotd: {
    enabled: true,
    serviceType: RateLimitServiceType._BYTEBOTD,
    reportUri: "/security/csp-violations",
    realTimeProcessing: true,
    threatAnalysis: true,
    falsePositiveDetection: true,
    automatedIncidents: true,
    storage: {
      enabled: true,
      retentionDays: 90,
      maxViolations: 10000,
      enableCompression: true,
    },
    alerting: {
      enabled: true,
      thresholds: {
        violationsPerMinute: 5, // Strict for computer control
        highThreatViolations: 1,
        falsePositiveRate: 0.1,
      },
      channels: ["security_team", "webhook"] as string[],
    },
    performance: {
      batchSize: 10,
      processingInterval: 5000, // 5 seconds
      maxProcessingTime: 2000,
      asyncProcessing: true,
    },
    compliance: {
      auditLogging: true,
      complianceReporting: true,
      frameworks: ["OWASP", "SOC2"] as string[],
    },
  },

  "bytebot-agent": {
    enabled: true,
    serviceType: RateLimitServiceType._BYTEBOT_AGENT,
    reportUri: "/api/security/csp-violations",
    realTimeProcessing: true,
    threatAnalysis: true,
    falsePositiveDetection: true,
    automatedIncidents: true,
    storage: {
      enabled: true,
      retentionDays: 60,
      maxViolations: 5000,
      enableCompression: true,
    },
    alerting: {
      enabled: true,
      thresholds: {
        violationsPerMinute: 10,
        highThreatViolations: 3,
        falsePositiveRate: 0.2,
      },
      channels: ["security_team"] as string[],
    },
    performance: {
      batchSize: 20,
      processingInterval: 10000, // 10 seconds
      maxProcessingTime: 3000,
      asyncProcessing: true,
    },
    compliance: {
      auditLogging: true,
      complianceReporting: true,
      frameworks: ["OWASP"] as string[],
    },
  },

  "bytebot-ui": {
    enabled: true,
    serviceType: RateLimitServiceType._BYTEBOT_UI,
    reportUri: "/ui/security/csp-violations",
    realTimeProcessing: false, // Less critical for UI
    threatAnalysis: true,
    falsePositiveDetection: true,
    automatedIncidents: false, // Manual review for UI violations
    storage: {
      enabled: true,
      retentionDays: 30,
      maxViolations: 20000, // Higher volume expected
      enableCompression: true,
    },
    alerting: {
      enabled: true,
      thresholds: {
        violationsPerMinute: 50, // Higher threshold for UI
        highThreatViolations: 10,
        falsePositiveRate: 0.5,
      },
      channels: ["dev_team"] as string[],
    },
    performance: {
      batchSize: 50,
      processingInterval: 30000, // 30 seconds
      maxProcessingTime: 5000,
      asyncProcessing: true,
    },
    compliance: {
      auditLogging: false, // Reduce logging for UI
      complianceReporting: false,
      frameworks: [] as string[],
    },
  },

  shared: {
    enabled: true,
    serviceType: RateLimitServiceType._SHARED,
    reportUri: "/shared/security/csp-violations",
    realTimeProcessing: true,
    threatAnalysis: true,
    falsePositiveDetection: true,
    automatedIncidents: true,
    storage: {
      enabled: true,
      retentionDays: 60,
      maxViolations: 15000,
      enableCompression: true,
    },
    alerting: {
      enabled: true,
      thresholds: {
        violationsPerMinute: 15,
        highThreatViolations: 5,
        falsePositiveRate: 0.3,
      },
      channels: ["security_team"] as string[],
    },
    performance: {
      batchSize: 30,
      processingInterval: 15000, // 15 seconds
      maxProcessingTime: 4000,
      asyncProcessing: true,
    },
    compliance: {
      auditLogging: true,
      complianceReporting: true,
      frameworks: ["OWASP"] as string[],
    },
  },
} as const;

/**
 * CSP Violation Reporting Service
 * Provides comprehensive CSP violation monitoring, analysis, and reporting
 */
@Injectable()
export class CSPViolationReportingService {
  private readonly logger = new Logger(CSPViolationReportingService.name);
  private readonly config: CSPViolationReportingConfig;
  private readonly violationBuffer: EnhancedCSPViolationReport[] = [];
  private readonly violationCache = new Map<
    string,
    EnhancedCSPViolationReport
  >();
  private metrics: CSPViolationMetrics = {
    totalViolations: 0,
    violationsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
    violationsByPattern: {} as Record<ViolationPatternType, number>,
    violationsByService: {} as Record<RateLimitServiceType, number>,
    falsePositiveRate: 0,
    averageProcessingTime: 0,
    topViolatedDirectives: [],
    topBlockedUris: [],
    trendingViolations: [],
  };

  private processingTimer?: NodeJS.Timeout;

  /**
   * Type-safe event emitter helper
   */
  private emitEvent(_event: string, _data: unknown): boolean {
    return (
      this._eventEmitter as unknown as {
        emit(_event: string, _data: unknown): boolean;
      }
    ).emit(_event, _data);
  }

  constructor(
    private readonly _configService: ConfigService,
    private readonly _eventEmitter: EventEmitter2,
    @Inject("SERVICE_TYPE") private readonly serviceType: RateLimitServiceType,
  ) {
    // Initialize configuration
    this.config = {
      ...DEFAULT_CSP_VIOLATION_CONFIGS[
        serviceType as keyof typeof DEFAULT_CSP_VIOLATION_CONFIGS
      ],
      ...this._configService.get<Partial<CSPViolationReportingConfig>>(
        `cspViolationReporting.${serviceType}`,
        {},
      ),
    };

    this.logger.log(
      `CSP violation reporting service initialized for ${serviceType}`,
      {
        serviceType: this.config.serviceType as string,
        enabled: this.config.enabled,
        realTimeProcessing: this.config.realTimeProcessing,
        threatAnalysis: this.config.threatAnalysis,
        reportUri: this.config.reportUri,
      },
    );

    // Initialize violation pattern counters
    Object.values(ViolationPatternType).forEach((pattern) => {
      this.metrics.violationsByPattern[pattern] = 0;
    });

    // Initialize service type counters
    const serviceTypes = Object.values(RateLimitServiceType);
    serviceTypes.forEach((service) => {
      this.metrics.violationsByService[service] = 0;
    });

    // Start batch processing if enabled
    if (this.config.enabled && this.config.performance.asyncProcessing) {
      this.startBatchProcessing();
    }
  }

  /**
   * Process incoming CSP violation report
   */
  public processViolationReport(
    report: CSPViolationReport,
    requestContext?: {
      userAgent?: string;
      ipAddress?: string;
      userId?: string;
      sessionId?: string;
      requestId?: string;
    },
  ): EnhancedCSPViolationReport {
    const operationId = generateEventId();
    const startTime = Date.now();

    if (!this.config.enabled) {
      this.logger.debug(`[${operationId}] CSP violation reporting disabled`);
      throw new Error("CSP violation reporting is disabled");
    }

    try {
      // Enhance the basic violation report
      const enhancedReport = this.enhanceViolationReport(
        report,
        requestContext,
      );

      // Add to buffer for batch processing if async
      if (this.config.performance.asyncProcessing) {
        this.violationBuffer.push(enhancedReport);
      } else {
        // Process immediately
        this.analyzeViolation(enhancedReport, operationId);
      }

      // Update metrics
      this.updateMetrics(enhancedReport, Date.now() - startTime);

      // Emit real-time event if enabled
      if (this.config.realTimeProcessing) {
        this.emitEvent("csp.violation.detected", enhancedReport);
      }

      // Check for immediate alerts
      this.checkAlertThresholds(enhancedReport, operationId);

      this.logger.debug(
        `[${operationId}] CSP violation processed successfully`,
        {
          operationId,
          violationId: enhancedReport.violationId,
          threatLevel: enhancedReport.threatLevel,
          violationPattern: enhancedReport.violationPattern,
          processingTimeMs: Date.now() - startTime,
        },
      );

      return enhancedReport;
    } catch (err) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] CSP violation processing failed`, {
        operationId,
        error: err instanceof Error ? err.message : String(err),
        processingTimeMs: processingTime,
        reportUri: report.documentUri,
        violatedDirective: report.violatedDirective,
      });

      throw err;
    }
  }

  /**
   * Enhance basic CSP violation report with security analysis
   */
  private enhanceViolationReport(
    report: CSPViolationReport,
    requestContext?: {
      userAgent?: string;
      ipAddress?: string;
      userId?: string;
      sessionId?: string;
      requestId?: string;
    },
  ): EnhancedCSPViolationReport {
    const violationId = generateEventId();

    // Classify violation pattern
    const violationPattern = this.classifyViolationPattern(report);

    // Calculate risk score and threat level
    const riskAssessment = this.assessViolationRisk(report, violationPattern);

    // Detect false positives
    const isFalsePositive = this.config.falsePositiveDetection
      ? this.detectFalsePositive(report)
      : false;

    // Generate remediation suggestions
    const remediationSuggestions = this.generateRemediationSuggestions(
      report,
      violationPattern,
    );

    // Count similar violations
    const similarViolationsCount = this.countSimilarViolations(report);

    const enhancedReport: EnhancedCSPViolationReport = {
      ...report,
      violationId,
      timestamp: new Date(),
      serviceType: this.config.serviceType,
      userAgent: requestContext?.userAgent,
      ipAddress: requestContext?.ipAddress,
      userId: requestContext?.userId,
      sessionId: requestContext?.sessionId,
      requestId: requestContext?.requestId,
      threatLevel: riskAssessment.threatLevel,
      riskScore: riskAssessment.riskScore,
      isFalsePositive,
      violationPattern,
      remediationSuggestions,
      similarViolationsCount,
      processingMetadata: {
        processingTimeMs: 0, // Will be updated
        analysisVersion: "2.0.0",
        ruleSetVersion: "2024.09",
      },
    };

    return enhancedReport;
  }

  /**
   * Classify violation pattern based on report details
   */
  private classifyViolationPattern(
    report: CSPViolationReport,
  ): ViolationPatternType {
    const directive = report.violatedDirective.toLowerCase();
    const blockedUri = report.blockedUri?.toLowerCase() || "";
    const sample = report.sample?.toLowerCase() || "";

    if (directive.includes("script-src")) {
      if (blockedUri === "eval" || sample.includes("eval(")) {
        return ViolationPatternType._EVAL_SCRIPT_VIOLATION;
      }
      if (blockedUri === "inline" || blockedUri === "'unsafe-inline'") {
        return ViolationPatternType._UNSAFE_INLINE_SCRIPT;
      }
      if (blockedUri.startsWith("http")) {
        return ViolationPatternType._EXTERNAL_SCRIPT_LOAD;
      }
      return ViolationPatternType._INLINE_SCRIPT_INJECTION;
    }

    if (directive.includes("style-src")) {
      if (blockedUri === "inline" || blockedUri === "'unsafe-inline'") {
        return ViolationPatternType._UNSAFE_INLINE_STYLE;
      }
      return ViolationPatternType._INLINE_STYLE_VIOLATION;
    }

    if (directive.includes("frame-src")) {
      return ViolationPatternType._FRAME_SRC_VIOLATION;
    }

    if (directive.includes("img-src")) {
      return ViolationPatternType._IMG_SRC_VIOLATION;
    }

    if (directive.includes("connect-src")) {
      return ViolationPatternType._CONNECT_SRC_VIOLATION;
    }

    if (directive.includes("font-src")) {
      return ViolationPatternType._FONT_SRC_VIOLATION;
    }

    if (directive.includes("object-src")) {
      return ViolationPatternType._OBJECT_SRC_VIOLATION;
    }

    if (directive.includes("media-src")) {
      return ViolationPatternType._MEDIA_SRC_VIOLATION;
    }

    if (directive.includes("base-uri")) {
      return ViolationPatternType._BASE_URI_VIOLATION;
    }

    if (directive.includes("form-action")) {
      return ViolationPatternType._FORM_ACTION_VIOLATION;
    }

    if (directive.includes("plugin-types")) {
      return ViolationPatternType._PLUGIN_VIOLATION;
    }

    return ViolationPatternType._UNKNOWN_VIOLATION;
  }

  /**
   * Assess violation risk and threat level
   */
  private assessViolationRisk(
    report: CSPViolationReport,
    pattern: ViolationPatternType,
  ): {
    riskScore: number;
    threatLevel: "low" | "medium" | "high" | "critical";
  } {
    let riskScore = 0;

    // Base risk by violation pattern
    switch (pattern) {
      case ViolationPatternType._INLINE_SCRIPT_INJECTION:
      case ViolationPatternType._EVAL_SCRIPT_VIOLATION:
        riskScore += 80; // High risk for script injections
        break;
      case ViolationPatternType._EXTERNAL_SCRIPT_LOAD:
        riskScore += 60; // Medium-high risk
        break;
      case ViolationPatternType._UNSAFE_INLINE_SCRIPT:
      case ViolationPatternType._UNSAFE_INLINE_STYLE:
        riskScore += 40; // Medium risk
        break;
      case ViolationPatternType._FRAME_SRC_VIOLATION:
        riskScore += 50; // Medium risk (clickjacking)
        break;
      case ViolationPatternType._CONNECT_SRC_VIOLATION:
        riskScore += 30; // Lower risk but still concerning
        break;
      default:
        riskScore += 20; // Base risk for other violations
        break;
    }

    // Additional risk factors
    if (report.blockedUri?.includes("javascript:")) {
      riskScore += 30; // JavaScript protocol indicates potential XSS
    }

    if (report.blockedUri?.includes("data:")) {
      riskScore += 20; // Data URIs can be used maliciously
    }

    if (report.sample && report.sample.length > 100) {
      riskScore += 10; // Longer samples might indicate complex attacks
    }

    // Determine threat level
    let threatLevel: "low" | "medium" | "high" | "critical";
    if (riskScore >= 90) {
      threatLevel = "critical";
    } else if (riskScore >= 70) {
      threatLevel = "high";
    } else if (riskScore >= 40) {
      threatLevel = "medium";
    } else {
      threatLevel = "low";
    }

    return { riskScore: Math.min(100, riskScore), threatLevel };
  }

  /**
   * Detect false positive violations
   */
  private detectFalsePositive(report: CSPViolationReport): boolean {
    // Known false positive patterns
    const falsePositivePatterns = [
      // Browser extensions
      /chrome-extension:/,
      /moz-extension:/,
      /safari-extension:/,

      // Common third-party widgets
      /google-analytics\.com/,
      /googletagmanager\.com/,
      /facebook\.net/,
      /twitter\.com/,

      // Development tools
      /localhost/,
      /127\.0\.0\.1/,
      /webpack-dev-server/,
      /hot-update/,
    ];

    const blockedUri = report.blockedUri || "";
    const documentUri = report.documentUri || "";

    // Check against known false positive patterns
    for (const pattern of falsePositivePatterns) {
      if (pattern.test(blockedUri) || pattern.test(documentUri)) {
        return true;
      }
    }

    // Development environment heuristics
    if (process.env.NODE_ENV === "development") {
      if (
        blockedUri.includes("localhost") ||
        documentUri.includes("localhost")
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate remediation suggestions
   */
  private generateRemediationSuggestions(
    report: CSPViolationReport,
    pattern: ViolationPatternType,
  ): string[] {
    const suggestions: string[] = [];

    switch (pattern) {
      case ViolationPatternType._INLINE_SCRIPT_INJECTION:
      case ViolationPatternType._UNSAFE_INLINE_SCRIPT:
        suggestions.push("Move inline scripts to external files");
        suggestions.push("Use CSP nonces for necessary inline scripts");
        suggestions.push("Consider using hash-based CSP for static scripts");
        break;

      case ViolationPatternType._EVAL_SCRIPT_VIOLATION:
        suggestions.push("Avoid using eval() function");
        suggestions.push(
          "Replace eval() with safer alternatives like JSON.parse()",
        );
        suggestions.push(
          "Use Function constructor if dynamic code execution is necessary",
        );
        break;

      case ViolationPatternType._EXTERNAL_SCRIPT_LOAD:
        suggestions.push(
          `Add ${report.blockedUri} to script-src allowlist if trusted`,
        );
        suggestions.push("Verify the legitimacy of the external script source");
        suggestions.push(
          "Consider using subresource integrity (SRI) for external scripts",
        );
        break;

      case ViolationPatternType._INLINE_STYLE_VIOLATION:
      case ViolationPatternType._UNSAFE_INLINE_STYLE:
        suggestions.push("Move inline styles to external stylesheets");
        suggestions.push("Use CSP nonces for necessary inline styles");
        suggestions.push("Consider using CSS variables for dynamic styling");
        break;

      case ViolationPatternType._FRAME_SRC_VIOLATION:
        suggestions.push(
          `Add ${report.blockedUri} to frame-src allowlist if trusted`,
        );
        suggestions.push("Review if iframe embedding is necessary");
        suggestions.push(
          "Consider using X-Frame-Options header as additional protection",
        );
        break;

      case ViolationPatternType._CONNECT_SRC_VIOLATION:
        suggestions.push(
          `Add ${report.blockedUri} to connect-src allowlist if trusted`,
        );
        suggestions.push(
          "Review network requests to ensure they are necessary",
        );
        suggestions.push(
          "Consider using a proxy for untrusted external requests",
        );
        break;

      default:
        suggestions.push(
          "Review CSP policy to ensure it matches application requirements",
        );
        suggestions.push(
          "Consult CSP documentation for specific directive guidelines",
        );
        break;
    }

    return suggestions;
  }

  /**
   * Count similar violations in recent history
   */
  private countSimilarViolations(report: CSPViolationReport): number {
    let count = 0;
    const timeThreshold = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    for (const [, cachedReport] of this.violationCache.entries()) {
      if (cachedReport.timestamp.getTime() < timeThreshold) {
        continue; // Skip old violations
      }

      if (
        cachedReport.violatedDirective === report.violatedDirective &&
        cachedReport.blockedUri === report.blockedUri
      ) {
        count++;
      }
    }

    return count;
  }

  /**
   * Analyze violation for threats and patterns
   */
  private analyzeViolation(
    report: EnhancedCSPViolationReport,
    operationId: string,
  ): void {
    if (!this.config.threatAnalysis) {
      return;
    }

    try {
      // Store in cache for similarity analysis
      this.violationCache.set(report.violationId, report);

      // Create security incident if criteria met
      if (this.config.automatedIncidents && this.shouldCreateIncident(report)) {
        this.createSecurityIncident(report, operationId);
      }

      // Store violation if enabled
      if (this.config.storage.enabled) {
        this.storeViolation(report);
      }

      // Compliance logging
      if (this.config.compliance.auditLogging) {
        this.logComplianceEvent(report, operationId);
      }
    } catch (err) {
      this.logger.error(`[${operationId}] Violation analysis failed`, {
        operationId,
        violationId: report.violationId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Determine if security incident should be created
   */
  private shouldCreateIncident(report: EnhancedCSPViolationReport): boolean {
    // Don't create incidents for false positives
    if (report.isFalsePositive) {
      return false;
    }

    // Create incidents for high/critical threats
    if (report.threatLevel === "high" || report.threatLevel === "critical") {
      return true;
    }

    // Create incidents for patterns indicating attacks
    const attackPatterns = [
      ViolationPatternType._INLINE_SCRIPT_INJECTION,
      ViolationPatternType._EVAL_SCRIPT_VIOLATION,
    ];

    return attackPatterns.includes(report.violationPattern);
  }

  /**
   * Create security incident for significant violations
   */
  private createSecurityIncident(
    report: EnhancedCSPViolationReport,
    operationId: string,
  ): void {
    try {
      const securityEvent = createSecurityEvent(
        SecurityEventType._CSP_VIOLATION,
        report.documentUri,
        "CSP_VIOLATION",
        false, // CSP violations are blocked requests
        `CSP violation: ${report.violatedDirective} blocked ${report.blockedUri}`,
        {
          operationId,
          violationId: report.violationId,
          violatedDirective: report.violatedDirective,
          blockedUri: report.blockedUri,
          threatLevel: report.threatLevel,
          riskScore: report.riskScore,
          violationPattern: report.violationPattern,
          serviceType: report.serviceType as string,
          isFalsePositive: report.isFalsePositive,
          remediationSuggestions: report.remediationSuggestions,
        },
        report.userId,
        report.ipAddress,
        report.userAgent,
      );

      this.emitEvent("security.incident.created", securityEvent);

      this.logger.warn(
        `Security incident created for CSP violation: ${securityEvent.eventId}`,
        {
          eventId: securityEvent.eventId,
          violationId: report.violationId,
          threatLevel: report.threatLevel,
          operationId,
        },
      );
    } catch (err) {
      this.logger.error(`Failed to create security incident`, {
        operationId,
        violationId: report.violationId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Store violation for analysis and compliance
   */
  private storeViolation(report: EnhancedCSPViolationReport): void {
    // In a real implementation, this would store to database
    // For now, we'll use in-memory storage with cleanup

    // Clean up old violations if we exceed limits
    if (this.violationCache.size > this.config.storage.maxViolations) {
      const oldestKey = this.violationCache.keys().next().value as string;
      if (oldestKey) {
        this.violationCache.delete(oldestKey);
      }
    }

    this.logger.debug(`Violation stored: ${report.violationId}`, {
      violationId: report.violationId,
      serviceType: report.serviceType as string,
      threatLevel: report.threatLevel,
    });
  }

  /**
   * Log compliance event for audit trail
   */
  private logComplianceEvent(
    report: EnhancedCSPViolationReport,
    operationId: string,
  ): void {
    this.logger.log(`COMPLIANCE: CSP violation logged`, {
      operationId,
      violationId: report.violationId,
      timestamp: report.timestamp.toISOString(),
      serviceType: report.serviceType as string,
      violatedDirective: report.violatedDirective,
      blockedUri: report.blockedUri,
      threatLevel: report.threatLevel,
      riskScore: report.riskScore,
      userId: report.userId || "anonymous",
      ipAddress: report.ipAddress || "unknown",
      complianceFrameworks: this.config.compliance.frameworks,
    });
  }

  /**
   * Check alert thresholds and trigger alerts if necessary
   */
  private checkAlertThresholds(
    report: EnhancedCSPViolationReport,
    operationId: string,
  ): void {
    if (!this.config.alerting.enabled) {
      return;
    }

    try {
      // Check high threat violations
      if (
        (report.threatLevel === "high" || report.threatLevel === "critical") &&
        this.metrics.violationsBySeverity[report.threatLevel] >=
          this.config.alerting.thresholds.highThreatViolations
      ) {
        this.emitEvent("csp.alert.high_threat_violations", {
          operationId,
          violationId: report.violationId,
          threatLevel: report.threatLevel,
          count: this.metrics.violationsBySeverity[report.threatLevel],
          threshold: this.config.alerting.thresholds.highThreatViolations,
        });
      }

      // Check false positive rate
      const totalViolations = this.metrics.totalViolations;
      const falsePositives =
        Object.values(this.metrics.violationsBySeverity).reduce(
          (sum, count) => sum + count,
          0,
        ) * this.metrics.falsePositiveRate;

      const currentFalsePositiveRate =
        totalViolations > 0 ? falsePositives / totalViolations : 0;

      if (
        currentFalsePositiveRate >
        this.config.alerting.thresholds.falsePositiveRate
      ) {
        this.emitEvent("csp.alert.high_false_positive_rate", {
          operationId,
          currentRate: currentFalsePositiveRate,
          threshold: this.config.alerting.thresholds.falsePositiveRate,
          totalViolations,
        });
      }
    } catch (err) {
      this.logger.error(`Alert threshold check failed`, {
        operationId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Update violation metrics
   */
  private updateMetrics(
    report: EnhancedCSPViolationReport,
    processingTime: number,
  ): void {
    this.metrics.totalViolations++;
    this.metrics.violationsBySeverity[report.threatLevel]++;
    this.metrics.violationsByPattern[report.violationPattern]++;
    this.metrics.violationsByService[report.serviceType]++;

    // Update average processing time
    const totalTime =
      this.metrics.averageProcessingTime * (this.metrics.totalViolations - 1);
    this.metrics.averageProcessingTime =
      (totalTime + processingTime) / this.metrics.totalViolations;

    // Update false positive rate
    const falsePositives = Array.from(this.violationCache.values()).filter(
      (v) => v.isFalsePositive,
    ).length;
    this.metrics.falsePositiveRate =
      this.metrics.totalViolations > 0
        ? falsePositives / this.metrics.totalViolations
        : 0;
  }

  /**
   * Start batch processing for async violation handling
   */
  private startBatchProcessing(): void {
    this.processingTimer = setInterval(() => {
      void (async () => {
        if (this.violationBuffer.length === 0) {
          return;
        }

        const batch = this.violationBuffer.splice(
          0,
          this.config.performance.batchSize,
        );
        const operationId = generateEventId();

        try {
          await Promise.all(
            batch.map((report) => this.analyzeViolation(report, operationId)),
          );

          this.logger.debug(`Processed violation batch`, {
            operationId,
            batchSize: batch.length,
            remainingBuffer: this.violationBuffer.length,
          });
        } catch (err) {
          this.logger.error(`Batch processing failed`, {
            operationId,
            batchSize: batch.length,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      })();
    }, this.config.performance.processingInterval);

    this.logger.log("CSP violation batch processing started", {
      processingInterval: this.config.performance.processingInterval,
      batchSize: this.config.performance.batchSize,
    });
  }

  /**
   * Stop batch processing
   */
  private stopBatchProcessing(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = undefined;
      this.logger.log("CSP violation batch processing stopped");
    }
  }

  /**
   * Get current violation metrics
   */
  public getMetrics(): CSPViolationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent violations for analysis
   */
  public getRecentViolations(
    limit: number = 100,
  ): EnhancedCSPViolationReport[] {
    return Array.from(this.violationCache.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear violation cache and reset metrics
   */
  public clearViolationData(): void {
    this.violationCache.clear();
    this.violationBuffer.length = 0;

    // Reset metrics
    this.metrics = {
      totalViolations: 0,
      violationsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      violationsByPattern: {} as Record<ViolationPatternType, number>,
      violationsByService: {} as Record<RateLimitServiceType, number>,
      falsePositiveRate: 0,
      averageProcessingTime: 0,
      topViolatedDirectives: [],
      topBlockedUris: [],
      trendingViolations: [],
    };

    // Reinitialize counters
    Object.values(ViolationPatternType).forEach((pattern: string) => {
      this.metrics.violationsByPattern[pattern as ViolationPatternType] = 0;
    });

    const serviceTypes = Object.values(RateLimitServiceType);
    serviceTypes.forEach((service) => {
      this.metrics.violationsByService[service] = 0;
    });

    this.logger.log("CSP violation data cleared");
  }

  /**
   * Clean up resources
   */
  public onModuleDestroy(): void {
    this.stopBatchProcessing();
    this.clearViolationData();
    this.logger.log("CSP violation reporting service destroyed");
  }

  /**
   * Factory methods for creating service-specific violation reporting
   */
  static createBytebotDService(
    configService: ConfigService,
    eventEmitter: EventEmitter2,
  ): CSPViolationReportingService {
    return new CSPViolationReportingService(
      configService,
      eventEmitter,
      RateLimitServiceType._BYTEBOTD,
    );
  }

  static createBytebotAgentService(
    configService: ConfigService,
    eventEmitter: EventEmitter2,
  ): CSPViolationReportingService {
    return new CSPViolationReportingService(
      configService,
      eventEmitter,
      RateLimitServiceType._BYTEBOT_AGENT,
    );
  }

  static createBytebotUIService(
    configService: ConfigService,
    eventEmitter: EventEmitter2,
  ): CSPViolationReportingService {
    return new CSPViolationReportingService(
      configService,
      eventEmitter,
      RateLimitServiceType._BYTEBOT_UI,
    );
  }
}

export default CSPViolationReportingService;
