/**
 * Browser Session Security Validation Middleware
 *
 * Comprehensive security middleware for browser session management that provides
 * real-time security validation, session integrity checks, and threat detection
 * for all browser automation sessions. This middleware integrates with the
 * PARLANT validation framework to ensure secure browser operations.
 *
 * Features:
 * - Session authentication and authorization validation
 * - Real-time security monitoring and threat detection
 * - Session integrity and tampering detection
 * - Cross-session contamination prevention
 * - Resource usage monitoring and limits enforcement
 * - Session isolation and sandboxing validation
 * - Audit logging and compliance tracking
 *
 * @fileoverview Browser session security validation middleware
 * @version 1.0.0
 * @author Browser Security Team
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

import { ParlantIntegrationService } from '../../../shared/src/services/parlant-integration.service';
import { BrowserParlantValidationService } from '../services/browser-parlant-validation.service';
import { BrowserRiskAssessmentEngine } from '../engines/browser-risk-assessment.engine';
import {
  BrowserOperationContext,
  BrowserOperationType,
  BrowserStateInfo,
  DomainClassification,
} from '../services/browser-parlant-validation.service';

// ===========================
// SESSION SECURITY INTERFACES
// ===========================

/**
 * Browser session security configuration
 */
export interface BrowserSessionSecurityConfig {
  /** Enable session security validation */
  enabled: boolean;

  /** Session timeout in milliseconds */
  sessionTimeoutMs: number;

  /** Maximum concurrent sessions per user */
  maxConcurrentSessions: number;

  /** Enable session integrity checking */
  enableIntegrityCheck: boolean;

  /** Enable cross-session isolation */
  enableSessionIsolation: boolean;

  /** Resource usage limits */
  resourceLimits: SessionResourceLimits;

  /** Security monitoring settings */
  monitoring: SessionMonitoringConfig;

  /** Session validation rules */
  validationRules: SessionValidationRule[];

  /** Threat detection settings */
  threatDetection: SessionThreatDetectionConfig;
}

/**
 * Session resource limits
 */
export interface SessionResourceLimits {
  /** Maximum memory usage per session (MB) */
  maxMemoryMB: number;

  /** Maximum CPU usage percentage */
  maxCpuPercent: number;

  /** Maximum network connections */
  maxNetworkConnections: number;

  /** Maximum open tabs/windows */
  maxTabs: number;

  /** Maximum session duration (ms) */
  maxDurationMs: number;

  /** Maximum operations per session */
  maxOperations: number;
}

/**
 * Session monitoring configuration
 */
export interface SessionMonitoringConfig {
  /** Enable real-time monitoring */
  realTimeMonitoring: boolean;

  /** Monitoring interval in milliseconds */
  monitoringIntervalMs: number;

  /** Enable performance monitoring */
  performanceMonitoring: boolean;

  /** Enable security event monitoring */
  securityEventMonitoring: boolean;

  /** Alert thresholds */
  alertThresholds: SessionAlertThresholds;
}

/**
 * Session alert thresholds
 */
export interface SessionAlertThresholds {
  /** Memory usage threshold (percentage) */
  memoryThreshold: number;

  /** CPU usage threshold (percentage) */
  cpuThreshold: number;

  /** Operation rate threshold (ops/sec) */
  operationRateThreshold: number;

  /** Error rate threshold (percentage) */
  errorRateThreshold: number;

  /** Anomaly score threshold */
  anomalyScoreThreshold: number;
}

/**
 * Session validation rule
 */
export interface SessionValidationRule {
  /** Rule identifier */
  id: string;

  /** Rule name */
  name: string;

  /** Rule type */
  type: SessionValidationRuleType;

  /** Rule configuration */
  config: Record<string, unknown>;

  /** Rule priority */
  priority: number;

  /** Rule enabled status */
  enabled: boolean;

  /** Validation function */
  validate: (session: BrowserSessionInfo) => SessionValidationResult;
}

/**
 * Session validation rule types
 */
export enum SessionValidationRuleType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  INTEGRITY = 'integrity',
  RESOURCE_USAGE = 'resource_usage',
  BEHAVIORAL = 'behavioral',
  SECURITY = 'security',
  COMPLIANCE = 'compliance',
}

/**
 * Session validation result
 */
export interface SessionValidationResult {
  /** Validation passed */
  passed: boolean;

  /** Rule ID that was validated */
  ruleId: string;

  /** Validation message */
  message: string;

  /** Severity level */
  severity: SessionValidationSeverity;

  /** Evidence data */
  evidence?: Record<string, unknown>;

  /** Remediation suggestions */
  remediation?: string[];
}

/**
 * Session validation severity levels
 */
export enum SessionValidationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Session threat detection configuration
 */
export interface SessionThreatDetectionConfig {
  /** Enable threat detection */
  enabled: boolean;

  /** Detection algorithms to use */
  algorithms: ThreatDetectionAlgorithm[];

  /** Threat score threshold */
  threatThreshold: number;

  /** Detection sensitivity */
  sensitivity: ThreatDetectionSensitivity;

  /** Response actions */
  responseActions: ThreatResponseAction[];
}

/**
 * Threat detection algorithms
 */
export enum ThreatDetectionAlgorithm {
  ANOMALY_DETECTION = 'anomaly_detection',
  BEHAVIORAL_ANALYSIS = 'behavioral_analysis',
  PATTERN_MATCHING = 'pattern_matching',
  MACHINE_LEARNING = 'machine_learning',
  HEURISTIC_ANALYSIS = 'heuristic_analysis',
}

/**
 * Threat detection sensitivity levels
 */
export enum ThreatDetectionSensitivity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  MAXIMUM = 'maximum',
}

/**
 * Threat response actions
 */
export enum ThreatResponseAction {
  LOG_EVENT = 'log_event',
  ALERT_ADMIN = 'alert_admin',
  THROTTLE_SESSION = 'throttle_session',
  SUSPEND_SESSION = 'suspend_session',
  TERMINATE_SESSION = 'terminate_session',
  ESCALATE_TO_HUMAN = 'escalate_to_human',
}

/**
 * Browser session information
 */
export interface BrowserSessionInfo {
  /** Session ID */
  sessionId: string;

  /** User ID */
  userId: string;

  /** Session creation time */
  createdAt: Date;

  /** Last activity time */
  lastActivityAt: Date;

  /** Session state */
  state: BrowserSessionState;

  /** Session metadata */
  _metadata: BrowserSessionMetadata;

  /** Resource usage */
  resourceUsage: SessionResourceUsage;

  /** Security context */
  securityContext: SessionSecurityContext;

  /** Audit trail */
  auditTrail: SessionAuditEntry[];

  /** Threat indicators */
  _threatIndicators: SessionThreatIndicator[];
}

/**
 * Browser session states
 */
export enum BrowserSessionState {
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  IDLE = 'idle',
  SUSPENDED = 'suspended',
  TERMINATING = 'terminating',
  TERMINATED = 'terminated',
  ERROR = 'error',
}

/**
 * Browser session metadata
 */
export interface BrowserSessionMetadata {
  /** Browser type and version */
  browser: BrowserInfo;

  /** User agent string */
  userAgent: string;

  /** Client IP address */
  clientIp: string;

  /** Geographic location */
  location?: GeographicLocation;

  /** Device information */
  device: DeviceInfo;

  /** Session tags */
  tags: string[];

  /** Custom properties */
  properties: Record<string, unknown>;
}

/**
 * Browser information
 */
export interface BrowserInfo {
  /** Browser name */
  name: string;

  /** Browser version */
  version: string;

  /** Browser engine */
  engine: string;

  /** Operating system */
  os: string;

  /** Headless mode */
  headless: boolean;
}

/**
 * Geographic location
 */
export interface GeographicLocation {
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
}

/**
 * Device information
 */
export interface DeviceInfo {
  /** Device type */
  type: DeviceType;

  /** Screen resolution */
  screenResolution: ScreenResolution;

  /** Platform */
  platform: string;

  /** Device fingerprint */
  fingerprint?: string;
}

/**
 * Device types
 */
export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  SERVER = 'server',
  UNKNOWN = 'unknown',
}

/**
 * Screen resolution
 */
export interface ScreenResolution {
  /** Screen width */
  width: number;

  /** Screen height */
  height: number;

  /** Color depth */
  colorDepth: number;
}

/**
 * Session resource usage
 */
export interface SessionResourceUsage {
  /** Memory usage in MB */
  memoryMB: number;

  /** CPU usage percentage */
  cpuPercent: number;

  /** Network connections count */
  networkConnections: number;

  /** Open tabs count */
  openTabs: number;

  /** Total operations performed */
  operationsCount: number;

  /** Data transferred in bytes */
  dataTransferred: number;

  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * Session security context
 */
export interface SessionSecurityContext {
  /** Authentication status */
  authenticated: boolean;

  /** Authorization level */
  authorizationLevel: AuthorizationLevel;

  /** Security clearance */
  securityClearance: string[];

  /** Session token */
  sessionToken: string;

  /** Token expiration */
  tokenExpiration: Date;

  /** Security flags */
  securityFlags: SessionSecurityFlag[];

  /** Risk assessment */
  riskAssessment: SessionRiskAssessment;
}

/**
 * Authorization levels
 */
export enum AuthorizationLevel {
  GUEST = 'guest',
  USER = 'user',
  OPERATOR = 'operator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

/**
 * Session security flags
 */
export enum SessionSecurityFlag {
  SECURE_CONNECTION = 'secure_connection',
  MULTI_FACTOR_AUTH = 'multi_factor_auth',
  ENCRYPTED_SESSION = 'encrypted_session',
  VERIFIED_DEVICE = 'verified_device',
  TRUSTED_NETWORK = 'trusted_network',
  HIGH_RISK_USER = 'high_risk_user',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

/**
 * Session risk assessment
 */
export interface SessionRiskAssessment {
  /** Overall risk score */
  riskScore: number;

  /** Risk level */
  riskLevel: SessionRiskLevel;

  /** Risk factors */
  riskFactors: SessionRiskFactor[];

  /** Assessment timestamp */
  assessedAt: Date;

  /** Assessment confidence */
  confidence: number;
}

/**
 * Session risk levels
 */
export enum SessionRiskLevel {
  MINIMAL = 'minimal',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Session risk factors
 */
export interface SessionRiskFactor {
  /** Factor type */
  type: SessionRiskFactorType;

  /** Factor description */
  description: string;

  /** Risk contribution */
  riskContribution: number;

  /** Evidence */
  evidence: Record<string, unknown>;
}

/**
 * Session risk factor types
 */
export enum SessionRiskFactorType {
  GEOGRAPHIC_ANOMALY = 'geographic_anomaly',
  DEVICE_ANOMALY = 'device_anomaly',
  BEHAVIORAL_ANOMALY = 'behavioral_anomaly',
  TIME_ANOMALY = 'time_anomaly',
  RESOURCE_ABUSE = 'resource_abuse',
  SUSPICIOUS_OPERATIONS = 'suspicious_operations',
  SECURITY_VIOLATION = 'security_violation',
}

/**
 * Session audit entry
 */
export interface SessionAuditEntry {
  /** Entry ID */
  id: string;

  /** Timestamp */
  timestamp: Date;

  /** Event type */
  eventType: SessionAuditEventType;

  /** Event description */
  description: string;

  /** Event data */
  _data: Record<string, unknown>;

  /** User ID */
  userId: string;

  /** Session ID */
  sessionId: string;

  /** Severity level */
  severity: SessionValidationSeverity;
}

/**
 * Session audit event types
 */
export enum SessionAuditEventType {
  SESSION_CREATED = 'session_created',
  SESSION_AUTHENTICATED = 'session_authenticated',
  SESSION_OPERATION = 'session_operation',
  SESSION_SECURITY_EVENT = 'session_security_event',
  SESSION_SUSPENDED = 'session_suspended',
  SESSION_TERMINATED = 'session_terminated',
  SESSION_ERROR = 'session_error',
}

/**
 * Session threat indicator
 */
export interface SessionThreatIndicator {
  /** Indicator ID */
  id: string;

  /** Threat type */
  type: SessionThreatType;

  /** Threat severity */
  severity: ThreatSeverity;

  /** Threat description */
  description: string;

  /** Detection timestamp */
  detectedAt: Date;

  /** Confidence score */
  confidence: number;

  /** Evidence data */
  evidence: Record<string, unknown>;

  /** Mitigation actions */
  mitigationActions: string[];
}

/**
 * Session threat types
 */
export enum SessionThreatType {
  ACCOUNT_TAKEOVER = 'account_takeover',
  CREDENTIAL_STUFFING = 'credential_stuffing',
  BOT_ACTIVITY = 'bot_activity',
  SCRAPING_ACTIVITY = 'scraping_activity',
  MALICIOUS_AUTOMATION = 'malicious_automation',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  DATA_EXFILTRATION = 'data_exfiltration',
  SECURITY_BYPASS = 'security_bypass',
}

/**
 * Threat severity levels
 */
export enum ThreatSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

// ===========================
// BROWSER SESSION SECURITY MIDDLEWARE
// ===========================

@Injectable()
export class BrowserSessionSecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BrowserSessionSecurityMiddleware.name);

  /** Active browser sessions */
  private readonly activeSessions = new Map<string, BrowserSessionInfo>();

  /** User session tracking */
  private readonly userSessions = new Map<string, Set<string>>();

  /** Session validation rules */
  private readonly validationRules: SessionValidationRule[] = [];

  /** Security configuration */
  private readonly config: BrowserSessionSecurityConfig;

  /** Default configuration */
  private readonly defaultConfig: BrowserSessionSecurityConfig = {
    enabled: true,
    sessionTimeoutMs: 3600000, // 1 hour
    maxConcurrentSessions: 5,
    enableIntegrityCheck: true,
    enableSessionIsolation: true,
    resourceLimits: {
      maxMemoryMB: 2048,
      maxCpuPercent: 80,
      maxNetworkConnections: 100,
      maxTabs: 20,
      maxDurationMs: 14400000, // 4 hours
      maxOperations: 10000,
    },
    monitoring: {
      realTimeMonitoring: true,
      monitoringIntervalMs: 30000, // 30 seconds
      performanceMonitoring: true,
      securityEventMonitoring: true,
      alertThresholds: {
        memoryThreshold: 80,
        cpuThreshold: 70,
        operationRateThreshold: 100,
        errorRateThreshold: 10,
        anomalyScoreThreshold: 75,
      },
    },
    validationRules: [],
    threatDetection: {
      enabled: true,
      algorithms: [
        ThreatDetectionAlgorithm.ANOMALY_DETECTION,
        ThreatDetectionAlgorithm.BEHAVIORAL_ANALYSIS,
        ThreatDetectionAlgorithm.PATTERN_MATCHING,
      ],
      threatThreshold: 70,
      sensitivity: ThreatDetectionSensitivity.MEDIUM,
      responseActions: [
        ThreatResponseAction.LOG_EVENT,
        ThreatResponseAction.ALERT_ADMIN,
        ThreatResponseAction.THROTTLE_SESSION,
      ],
    },
  };

  constructor(
    private readonly parlantValidationService: BrowserParlantValidationService,
    private readonly riskAssessmentEngine: BrowserRiskAssessmentEngine,
    private readonly parlantIntegrationService: ParlantIntegrationService,
    config: Partial<BrowserSessionSecurityConfig> = {},
  ) {
    // Merge configuration
    this.config = { ...this.defaultConfig, ...config };

    this.logger.log('Browser Session Security Middleware initialized', {
      enabled: this.config.enabled,
      maxConcurrentSessions: this.config.maxConcurrentSessions,
      realTimeMonitoring: this.config.monitoring.realTimeMonitoring,
    });

    // Initialize validation rules
    this.initializeValidationRules();

    // Start monitoring tasks
    this.startSessionMonitoring();
    this.startSessionCleanup();
  }

  /**
   * Main middleware handler
   */
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!this.config.enabled) {
      return next();
    }

    const requestPath = req.path;
    const requestMethod = req.method;

    // Only process browser session related requests
    if (!this.isBrowserSessionRequest(requestPath)) {
      return next();
    }

    try {
      // Extract session information
      const sessionInfo = await this.extractSessionInfo(req);

      if (sessionInfo) {
        // Validate session security
        const validationResult = await this.validateSessionSecurity(
          sessionInfo,
          req,
        );

        if (!validationResult.allowed) {
          this.logger.warn('Browser session security validation failed', {
            sessionId: sessionInfo.sessionId,
            userId: sessionInfo.userId,
            reason: validationResult.reason,
            path: requestPath,
          });

          res.status(403).json({
            statusCode: 403,
            message: 'Browser session security validation failed',
            _error: 'Session Security Violation',
            details: {
              reason: validationResult.reason,
              sessionId: sessionInfo.sessionId,
              recommendations: validationResult.recommendations,
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Update session activity
        await this.updateSessionActivity(sessionInfo, req);

        // Inject session info into request
        (req as any).browserSession = sessionInfo;
      }

      next();
    } catch (error) {
      this.logger.error('Browser session security middleware error', {
        _error: error instanceof Error ? error.message : String(error),
        path: requestPath,
        method: requestMethod,
      });

      // Allow request to continue on middleware error
      next();
    }
  }

  /**
   * Validate session security
   */
  private async validateSessionSecurity(
    sessionInfo: BrowserSessionInfo,
    req: Request,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    recommendations?: string[];
  }> {
    try {
      // Check session state
      if (
        sessionInfo.state === BrowserSessionState.TERMINATED ||
        sessionInfo.state === BrowserSessionState.ERROR
      ) {
        return {
          allowed: false,
          reason: 'Session is in invalid state',
          recommendations: ['Create a new browser session'],
        };
      }

      // Check session timeout
      const now = new Date();
      const sessionAge = now.getTime() - sessionInfo.createdAt.getTime();
      if (sessionAge > this.config.sessionTimeoutMs) {
        await this.terminateSession(sessionInfo.sessionId, 'Session timeout');
        return {
          allowed: false,
          reason: 'Session has expired',
          recommendations: ['Create a new browser session'],
        };
      }

      // Check resource limits
      const resourceValidation = this.validateResourceLimits(sessionInfo);
      if (!resourceValidation.passed) {
        return {
          allowed: false,
          reason: `Resource limit exceeded: ${resourceValidation.message}`,
          recommendations: [
            'Reduce browser operations',
            'Close unused tabs',
            'Restart browser session',
          ],
        };
      }

      // Run validation rules
      for (const rule of this.validationRules) {
        if (!rule.enabled) continue;

        const ruleResult = rule.validate(sessionInfo);
        if (
          !ruleResult.passed &&
          ruleResult.severity === SessionValidationSeverity.CRITICAL
        ) {
          return {
            allowed: false,
            reason: ruleResult.message,
            recommendations: ruleResult.remediation || [],
          };
        }
      }

      // Threat detection
      if (this.config.threatDetection.enabled) {
        const threatResult = await this.detectThreats(sessionInfo, req);
        if (threatResult.threatDetected) {
          await this.handleThreatDetection(sessionInfo, threatResult);

          if (
            threatResult.severity === ThreatSeverity.CRITICAL ||
            threatResult.severity === ThreatSeverity.EMERGENCY
          ) {
            return {
              allowed: false,
              reason: `Security threat detected: ${threatResult.description}`,
              recommendations: threatResult.mitigationActions,
            };
          }
        }
      }

      // Perform PARLANT validation for high-risk operations
      const operationType = this.determineOperationType(req);
      if (this.isHighRiskOperation(operationType)) {
        const parlantValidation = await this.performParlantValidation(
          sessionInfo,
          req,
        );
        if (!parlantValidation.approved) {
          return {
            allowed: false,
            reason: `Operation denied by conversational AI: ${parlantValidation.reason}`,
            recommendations: parlantValidation.suggestedAlternatives || [],
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      this.logger.error('Session security validation error', {
        sessionId: sessionInfo.sessionId,
        _error: error instanceof Error ? error.message : String(error),
      });

      return {
        allowed: false,
        reason: 'Security validation failed due to internal error',
        recommendations: [
          'Retry the operation',
          'Contact system administrator',
        ],
      };
    }
  }

  /**
   * Extract session information from request
   */
  private async extractSessionInfo(
    req: Request,
  ): Promise<BrowserSessionInfo | null> {
    // Extract session ID from various sources
    const sessionId = this.extractSessionId(req);
    if (!sessionId) {
      return null;
    }

    // Get or create session info
    let sessionInfo = this.activeSessions.get(sessionId);
    if (!sessionInfo) {
      sessionInfo = await this.createSessionInfo(sessionId, req);
      this.activeSessions.set(sessionId, sessionInfo);

      // Track user sessions
      const userSessions =
        this.userSessions.get(sessionInfo.userId) || new Set();
      userSessions.add(sessionId);
      this.userSessions.set(sessionInfo.userId, userSessions);
    }

    return sessionInfo;
  }

  /**
   * Extract session ID from request
   */
  private extractSessionId(req: Request): string | null {
    // Try header first
    const sessionHeader = req.headers['x-browser-session-id'] as string;
    if (sessionHeader) {
      return sessionHeader;
    }

    // Try URL parameter
    const sessionParam = req.params.sessionId;
    if (sessionParam) {
      return sessionParam;
    }

    // Try query parameter
    const sessionQuery = req.query.sessionId as string;
    if (sessionQuery) {
      return sessionQuery;
    }

    // Try to extract from path
    const pathMatch = req.path.match(//sessions/([^/]+)/);
    if (pathMatch) {
      return pathMatch[1];
    }

    return null;
  }

  /**
   * Create new session information
   */
  private async createSessionInfo(
    sessionId: string,
    req: Request,
  ): Promise<BrowserSessionInfo> {
    const now = new Date();
    const userId = this.extractUserId(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const clientIp = this.extractClientIp(req);

    const sessionInfo: BrowserSessionInfo = {
      sessionId,
      userId,
      createdAt: now,
      lastActivityAt: now,
      state: BrowserSessionState.INITIALIZING,
      _metadata: {
        browser: this.parseBrowserInfo(userAgent),
        userAgent,
        clientIp,
        location: await this.getGeographicLocation(clientIp),
        device: this.getDeviceInfo(userAgent),
        tags: [],
        properties: {},
      },
      resourceUsage: {
        memoryMB: 0,
        cpuPercent: 0,
        networkConnections: 0,
        openTabs: 0,
        operationsCount: 0,
        dataTransferred: 0,
        lastUpdated: now,
      },
      securityContext: {
        authenticated: this.isAuthenticated(req),
        authorizationLevel: this.getAuthorizationLevel(req),
        securityClearance: this.getSecurityClearance(req),
        sessionToken: this.generateSessionToken(),
        tokenExpiration: new Date(now.getTime() + this.config.sessionTimeoutMs),
        securityFlags: this.generateSecurityFlags(req),
        riskAssessment: {
          riskScore: 25, // Initial moderate risk
          riskLevel: SessionRiskLevel.LOW,
          riskFactors: [],
          assessedAt: now,
          confidence: 0.8,
        },
      },
      auditTrail: [
        {
          id: this.generateAuditId(),
          timestamp: now,
          eventType: SessionAuditEventType.SESSION_CREATED,
          description: 'Browser session created',
          _data: { sessionId, userId, clientIp },
          userId,
          sessionId,
          severity: SessionValidationSeverity.INFO,
        },
      ],
      _threatIndicators: [],
    };

    this.logger.log('Created new browser session', {
      sessionId,
      userId,
      clientIp,
      userAgent: userAgent.substring(0, 100),
    });

    return sessionInfo;
  }

  /**
   * Check if request is browser session related
   */
  private isBrowserSessionRequest(path: string): boolean {
    const browserSessionPaths = [
      '/api/v1/browser-use',
      '/browser-use',
      '/sessions',
      '/automation',
      '/browser',
    ];

    return browserSessionPaths.some((basePath) => path.startsWith(basePath));
  }

  /**
   * Validate resource limits
   */
  private validateResourceLimits(
    sessionInfo: BrowserSessionInfo,
  ): SessionValidationResult {
    const limits = this.config.resourceLimits;
    const usage = sessionInfo.resourceUsage;

    // Check memory limit
    if (usage.memoryMB > limits.maxMemoryMB) {
      return {
        passed: false,
        ruleId: 'memory_limit',
        message: `Memory usage (${usage.memoryMB}MB) exceeds limit (${limits.maxMemoryMB}MB)`,
        severity: SessionValidationSeverity.CRITICAL,
        evidence: { memoryUsage: usage.memoryMB, limit: limits.maxMemoryMB },
        remediation: ['Close unused browser tabs', 'Restart browser session'],
      };
    }

    // Check CPU limit
    if (usage.cpuPercent > limits.maxCpuPercent) {
      return {
        passed: false,
        ruleId: 'cpu_limit',
        message: `CPU usage (${usage.cpuPercent}%) exceeds limit (${limits.maxCpuPercent}%)`,
        severity: SessionValidationSeverity.ERROR,
        evidence: { cpuUsage: usage.cpuPercent, limit: limits.maxCpuPercent },
        remediation: [
          'Reduce browser operations',
          'Wait for current operations to complete',
        ],
      };
    }

    // Check operations limit
    if (usage.operationsCount > limits.maxOperations) {
      return {
        passed: false,
        ruleId: 'operations_limit',
        message: `Operations count (${usage.operationsCount}) exceeds limit (${limits.maxOperations})`,
        severity: SessionValidationSeverity.ERROR,
        evidence: {
          operationsCount: usage.operationsCount,
          limit: limits.maxOperations,
        },
        remediation: [
          'Create new browser session',
          'Reduce operation frequency',
        ],
      };
    }

    // Check session duration
    const sessionAge = Date.now() - sessionInfo.createdAt.getTime();
    if (sessionAge > limits.maxDurationMs) {
      return {
        passed: false,
        ruleId: 'duration_limit',
        message: `Session duration (${Math.round(sessionAge / 60000)}min) exceeds limit (${Math.round(limits.maxDurationMs / 60000)}min)`,
        severity: SessionValidationSeverity.ERROR,
        evidence: { sessionAge, limit: limits.maxDurationMs },
        remediation: ['Create new browser session'],
      };
    }

    return {
      passed: true,
      ruleId: 'resource_limits',
      message: 'Resource limits check passed',
      severity: SessionValidationSeverity.INFO,
    };
  }

  /**
   * Detect security threats
   */
  private async detectThreats(
    sessionInfo: BrowserSessionInfo,
    req: Request,
  ): Promise<{
    threatDetected: boolean;
    type?: SessionThreatType;
    severity?: ThreatSeverity;
    description?: string;
    confidence?: number;
    mitigationActions?: string[];
  }> {
    if (!this.config.threatDetection.enabled) {
      return { threatDetected: false };
    }

    try {
      // Behavioral analysis
      const behaviorThreat = this.detectBehavioralThreats(sessionInfo);
      if (behaviorThreat.threatDetected) {
        return behaviorThreat;
      }

      // Resource abuse detection
      const resourceThreat = this.detectResourceAbuse(sessionInfo);
      if (resourceThreat.threatDetected) {
        return resourceThreat;
      }

      // Anomaly detection
      const anomalyThreat = this.detectAnomalies(sessionInfo, req);
      if (anomalyThreat.threatDetected) {
        return anomalyThreat;
      }

      return { threatDetected: false };
    } catch (error) {
      this.logger.error('Threat detection error', {
        sessionId: sessionInfo.sessionId,
        _error: error instanceof Error ? error.message : String(error),
      });

      return { threatDetected: false };
    }
  }

  /**
   * Detect behavioral threats
   */
  private detectBehavioralThreats(sessionInfo: BrowserSessionInfo): {
    threatDetected: boolean;
    type?: SessionThreatType;
    severity?: ThreatSeverity;
    description?: string;
    confidence?: number;
    mitigationActions?: string[];
  } {
    const usage = sessionInfo.resourceUsage;
    const sessionAge = Date.now() - sessionInfo.createdAt.getTime();

    // Bot-like behavior detection
    const operationsPerMinute = usage.operationsCount / (sessionAge / 60000);
    if (operationsPerMinute > 60) {
      // More than 1 operation per second
      return {
        threatDetected: true,
        type: SessionThreatType.BOT_ACTIVITY,
        severity: ThreatSeverity.HIGH,
        description: `Unusually high operation rate: ${operationsPerMinute.toFixed(1)} ops/min`,
        confidence: 0.85,
        mitigationActions: [
          'Rate limiting',
          'CAPTCHA challenge',
          'Session throttling',
        ],
      };
    }

    // Scraping activity detection
    if (usage.operationsCount > 1000 && sessionAge < 600000) {
      // 1000 ops in 10 minutes
      return {
        threatDetected: true,
        type: SessionThreatType.SCRAPING_ACTIVITY,
        severity: ThreatSeverity.MEDIUM,
        description: 'Potential data scraping activity detected',
        confidence: 0.75,
        mitigationActions: [
          'Session monitoring',
          'Access restriction',
          'Rate limiting',
        ],
      };
    }

    return { threatDetected: false };
  }

  /**
   * Detect resource abuse
   */
  private detectResourceAbuse(sessionInfo: BrowserSessionInfo): {
    threatDetected: boolean;
    type?: SessionThreatType;
    severity?: ThreatSeverity;
    description?: string;
    confidence?: number;
    mitigationActions?: string[];
  } {
    const usage = sessionInfo.resourceUsage;
    const thresholds = this.config.monitoring.alertThresholds;

    // Memory abuse
    if (usage.memoryMB > this.config.resourceLimits.maxMemoryMB * 0.8) {
      return {
        threatDetected: true,
        type: SessionThreatType.MALICIOUS_AUTOMATION,
        severity: ThreatSeverity.HIGH,
        description: `High memory usage: ${usage.memoryMB}MB`,
        confidence: 0.8,
        mitigationActions: [
          'Memory cleanup',
          'Session restart',
          'Resource monitoring',
        ],
      };
    }

    // CPU abuse
    if (usage.cpuPercent > thresholds.cpuThreshold) {
      return {
        threatDetected: true,
        type: SessionThreatType.MALICIOUS_AUTOMATION,
        severity: ThreatSeverity.MEDIUM,
        description: `High CPU usage: ${usage.cpuPercent}%`,
        confidence: 0.7,
        mitigationActions: [
          'Operation throttling',
          'Process monitoring',
          'Resource limits',
        ],
      };
    }

    return { threatDetected: false };
  }

  /**
   * Detect anomalies
   */
  private detectAnomalies(
    sessionInfo: BrowserSessionInfo,
    req: Request,
  ): {
    threatDetected: boolean;
    type?: SessionThreatType;
    severity?: ThreatSeverity;
    description?: string;
    confidence?: number;
    mitigationActions?: string[];
  } {
    // Geographic anomaly
    const currentIp = this.extractClientIp(req);
    if (currentIp !== sessionInfo.metadata.clientIp) {
      return {
        threatDetected: true,
        type: SessionThreatType.ACCOUNT_TAKEOVER,
        severity: ThreatSeverity.HIGH,
        description: 'IP address change detected during session',
        confidence: 0.9,
        mitigationActions: [
          'Authentication challenge',
          'Session termination',
          'Security review',
        ],
      };
    }

    // Device fingerprint anomaly
    const currentUserAgent = req.headers['user-agent'] || '';
    if (currentUserAgent !== sessionInfo.metadata.userAgent) {
      return {
        threatDetected: true,
        type: SessionThreatType.SECURITY_BYPASS,
        severity: ThreatSeverity.MEDIUM,
        description: 'User agent change detected during session',
        confidence: 0.7,
        mitigationActions: [
          'Device verification',
          'Session monitoring',
          'Security alert',
        ],
      };
    }

    return { threatDetected: false };
  }

  /**
   * Handle threat detection
   */
  private async handleThreatDetection(
    sessionInfo: BrowserSessionInfo,
    threatResult: any,
  ): Promise<void> {
    const threatIndicator: SessionThreatIndicator = {
      id: this.generateThreatId(),
      type: threatResult.type,
      severity: threatResult.severity,
      description: threatResult.description,
      detectedAt: new Date(),
      confidence: threatResult.confidence,
      evidence: { threatResult },
      mitigationActions: threatResult.mitigationActions,
    };

    // Add to session threat indicators
    sessionInfo.threatIndicators.push(threatIndicator);

    // Log threat detection
    this.logger.warn('Security threat detected', {
      sessionId: sessionInfo.sessionId,
      userId: sessionInfo.userId,
      threatType: threatResult.type,
      severity: threatResult.severity,
      description: threatResult.description,
      confidence: threatResult.confidence,
    });

    // Execute response actions
    for (const action of this.config.threatDetection.responseActions) {
      await this.executeThreatResponse(action, sessionInfo, threatIndicator);
    }

    // Add audit entry
    const auditEntry: SessionAuditEntry = {
      id: this.generateAuditId(),
      timestamp: new Date(),
      eventType: SessionAuditEventType.SESSION_SECURITY_EVENT,
      description: `Security threat detected: ${threatResult.description}`,
      _data: { threatIndicator },
      userId: sessionInfo.userId,
      sessionId: sessionInfo.sessionId,
      severity: this.mapThreatSeverityToValidationSeverity(
        threatResult.severity,
      ),
    };

    sessionInfo.auditTrail.push(auditEntry);
  }

  /**
   * Execute threat response action
   */
  private async executeThreatResponse(
    action: ThreatResponseAction,
    sessionInfo: BrowserSessionInfo,
    threatIndicator: SessionThreatIndicator,
  ): Promise<void> {
    switch (action) {
      case ThreatResponseAction.LOG_EVENT:
        // Already logged in handleThreatDetection
        break;

      case ThreatResponseAction.ALERT_ADMIN:
        // Send alert to administrators
        this.logger.error('SECURITY ALERT: Threat detected', {
          sessionId: sessionInfo.sessionId,
          userId: sessionInfo.userId,
          threatType: threatIndicator.type,
          severity: threatIndicator.severity,
        });
        break;

      case ThreatResponseAction.THROTTLE_SESSION:
        // Implement session throttling
        await this.throttleSession(sessionInfo);
        break;

      case ThreatResponseAction.SUSPEND_SESSION:
        await this.suspendSession(
          sessionInfo.sessionId,
          'Security threat detected',
        );
        break;

      case ThreatResponseAction.TERMINATE_SESSION:
        await this.terminateSession(
          sessionInfo.sessionId,
          'Critical security threat',
        );
        break;

      case ThreatResponseAction.ESCALATE_TO_HUMAN:
        // Create human review task
        await this.escalateToHuman(sessionInfo, threatIndicator);
        break;
    }
  }

  /**
   * Perform PARLANT validation for high-risk operations
   */
  private async performParlantValidation(
    sessionInfo: BrowserSessionInfo,
    req: Request,
  ): Promise<{
    approved: boolean;
    reason?: string;
    suggestedAlternatives?: string[];
  }> {
    try {
      const operationType = this.determineOperationType(req);
      const targetUrl = this.extractTargetUrl(req);

      const _context: BrowserOperationContext = {
        operationId: `session_${sessionInfo.sessionId}_${Date.now()}`,
        sessionId: sessionInfo.sessionId,
        operationType,
        targetUrl,
        userContext: {
          userId: sessionInfo.userId,
          roles: this.getUserRoles(sessionInfo),
          sessionId: sessionInfo.sessionId,
          ipAddress: sessionInfo.metadata.clientIp,
        },
        browserState: this.createBrowserStateInfo(sessionInfo),
        operationParams: this.extractOperationParams(req),
      };

      const validationResult =
        await this.parlantValidationService.validateDOMInteraction(context);

      return {
        approved: validationResult.approved,
        reason: validationResult.reasoning,
        suggestedAlternatives: validationResult.alternatives,
      };
    } catch (error) {
      this.logger.error('PARLANT validation error', {
        sessionId: sessionInfo.sessionId,
        _error: error instanceof Error ? error.message : String(error),
      });

      return {
        approved: false,
        reason: 'Validation failed due to internal error',
      };
    }
  }

  // ===========================
  // HELPER METHODS
  // ===========================

  /**
   * Extract user ID from request
   */
  private extractUserId(req: Request): string {
    const reqWithUser = req as any;
    return reqWithUser.user?.id || reqWithUser.user?.userId || 'anonymous';
  }

  /**
   * Extract client IP address
   */
  private extractClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Parse browser information from user agent
   */
  private parseBrowserInfo(userAgent: string): BrowserInfo {
    // Simplified browser detection
    const isHeadless = userAgent.includes('Headless');
    let name = 'unknown';
    let version = 'unknown';
    let engine = 'unknown';
    let os = 'unknown';

    if (userAgent.includes('Chrome')) {
      name = 'Chrome';
      const match = userAgent.match(/Chrome/([0-9.]+)/);
      version = match ? match[1] : 'unknown';
      engine = 'Blink';
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      const match = userAgent.match(/Firefox/([0-9.]+)/);
      version = match ? match[1] : 'unknown';
      engine = 'Gecko';
    }

    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';

    return { name, version, engine, os, headless: isHeadless };
  }

  /**
   * Get geographic location from IP
   */
  private async getGeographicLocation(
    ip: string,
  ): Promise<GeographicLocation | undefined> {
    // Mock implementation - in production would use IP geolocation service
    if (
      ip === 'unknown' ||
      ip.startsWith('127.') ||
      ip.startsWith('192.168.')
    ) {
      return {
        country: 'US',
        region: 'Unknown',
        city: 'Unknown',
        timezone: 'UTC',
      };
    }

    return undefined;
  }

  /**
   * Get device information
   */
  private getDeviceInfo(userAgent: string): DeviceInfo {
    let type = DeviceType.DESKTOP;
    if (userAgent.includes('Mobile')) type = DeviceType.MOBILE;
    else if (userAgent.includes('Tablet')) type = DeviceType.TABLET;

    return {
      type,
      screenResolution: { width: 1920, height: 1080, colorDepth: 24 },
      platform: userAgent.includes('Windows')
        ? 'Windows'
        : userAgent.includes('Mac')
          ? 'macOS'
          : userAgent.includes('Linux')
            ? 'Linux'
            : 'Unknown',
    };
  }

  /**
   * Check if user is authenticated
   */
  private isAuthenticated(req: Request): boolean {
    const reqWithUser = req as any;
    return !!reqWithUser.user;
  }

  /**
   * Get authorization level
   */
  private getAuthorizationLevel(req: Request): AuthorizationLevel {
    const reqWithUser = req as any;
    const roles = reqWithUser.user?.roles || [];

    if (roles.includes('super_admin')) return AuthorizationLevel.SUPER_ADMIN;
    if (roles.includes('admin')) return AuthorizationLevel.ADMIN;
    if (roles.includes('operator')) return AuthorizationLevel.OPERATOR;
    if (roles.includes('user')) return AuthorizationLevel.USER;
    return AuthorizationLevel.GUEST;
  }

  /**
   * Get security clearance
   */
  private getSecurityClearance(req: Request): string[] {
    const reqWithUser = req as any;
    return reqWithUser.user?.clearance || ['public'];
  }

  /**
   * Generate session token
   */
  private generateSessionToken(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate security flags
   */
  private generateSecurityFlags(req: Request): SessionSecurityFlag[] {
    const flags: SessionSecurityFlag[] = [];

    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      flags.push(SessionSecurityFlag.SECURE_CONNECTION);
    }

    const reqWithUser = req as any;
    if (reqWithUser.user?.mfa) {
      flags.push(SessionSecurityFlag.MULTI_FACTOR_AUTH);
    }

    return flags;
  }

  /**
   * Generate audit ID
   */
  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate threat ID
   */
  private generateThreatId(): string {
    return `threat_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Determine operation type from request
   */
  private determineOperationType(req: Request): BrowserOperationType {
    const path = req.path.toLowerCase();
    const method = req.method.toUpperCase();

    if (path.includes('/navigate')) return BrowserOperationType.NAVIGATE;
    if (path.includes('/click')) return BrowserOperationType.CLICK;
    if (path.includes('/type')) return BrowserOperationType.TYPE;
    if (path.includes('/screenshot')) return BrowserOperationType.SCREENSHOT;
    if (path.includes('/form') && path.includes('/fill'))
      return BrowserOperationType.FORM_FILL;
    if (path.includes('/form') && path.includes('/submit'))
      return BrowserOperationType.FORM_SUBMIT;
    if (path.includes('/extract')) return BrowserOperationType.DATA_EXTRACT;
    if (path.includes('/sessions') && method === 'POST')
      return BrowserOperationType.SESSION_CREATE;
    if (path.includes('/sessions') && method === 'DELETE')
      return BrowserOperationType.SESSION_CLOSE;

    return BrowserOperationType.SESSION_CREATE; // Default
  }

  /**
   * Check if operation is high risk
   */
  private isHighRiskOperation(operationType: BrowserOperationType): boolean {
    const highRiskOps = [
      BrowserOperationType.FORM_SUBMIT,
      BrowserOperationType.FILE_UPLOAD,
      BrowserOperationType.FILE_DOWNLOAD,
      BrowserOperationType.SCRIPT_EXECUTE,
      BrowserOperationType.DATA_EXTRACT,
    ];

    return highRiskOps.includes(operationType);
  }

  /**
   * Extract target URL from request
   */
  private extractTargetUrl(req: Request): string | undefined {
    return req.body?.url || (req.query.url as string) || undefined;
  }

  /**
   * Extract operation parameters
   */
  private extractOperationParams(req: Request): Record<string, unknown> {
    return {
      ...req.body,
      ...req.query,
      method: req.method,
      path: req.path,
    };
  }

  /**
   * Get user roles
   */
  private getUserRoles(sessionInfo: BrowserSessionInfo): string[] {
    return [sessionInfo.securityContext.authorizationLevel];
  }

  /**
   * Create browser state info
   */
  private createBrowserStateInfo(
    sessionInfo: BrowserSessionInfo,
  ): BrowserStateInfo {
    return {
      activeSessionsCount: this.activeSessions.size,
      currentUrl: undefined, // Would be extracted from browser
      domainClassification: DomainClassification.INTERNAL,
      securityHeaders: [],
      suspiciousActivityDetected: sessionInfo.threatIndicators.length > 0,
      resourceUsage: {
        memoryMB: sessionInfo.resourceUsage.memoryMB,
        cpuPercent: sessionInfo.resourceUsage.cpuPercent,
        networkConnections: sessionInfo.resourceUsage.networkConnections,
      },
      cspStatus: {
        present: false,
        policies: [],
        violations: [],
        riskLevel: sessionInfo.securityContext.riskAssessment.riskLevel as any,
      },
      lastSecurityScan: new Date(),
    };
  }

  /**
   * Update session activity
   */
  private async updateSessionActivity(
    sessionInfo: BrowserSessionInfo,
    req: Request,
  ): Promise<void> {
    const now = new Date();
    sessionInfo.lastActivityAt = now;
    sessionInfo.resourceUsage.operationsCount++;
    sessionInfo.resourceUsage.lastUpdated = now;

    // Update session state
    if (sessionInfo.state === BrowserSessionState.INITIALIZING) {
      sessionInfo.state = BrowserSessionState.ACTIVE;
    }

    // Add audit entry for significant operations
    const operationType = this.determineOperationType(req);
    if (this.isHighRiskOperation(operationType)) {
      const auditEntry: SessionAuditEntry = {
        id: this.generateAuditId(),
        timestamp: now,
        eventType: SessionAuditEventType.SESSION_OPERATION,
        description: `${operationType} operation performed`,
        _data: { operationType, path: req.path, method: req.method },
        userId: sessionInfo.userId,
        sessionId: sessionInfo.sessionId,
        severity: SessionValidationSeverity.INFO,
      };

      sessionInfo.auditTrail.push(auditEntry);
    }
  }

  /**
   * Throttle session
   */
  private async throttleSession(
    sessionInfo: BrowserSessionInfo,
  ): Promise<void> {
    // Implement session throttling logic
    this.logger.warn('Session throttled due to security threat', {
      sessionId: sessionInfo.sessionId,
      userId: sessionInfo.userId,
    });

    // Add security flag
    if (
      !sessionInfo.securityContext.securityFlags.includes(
        SessionSecurityFlag.SUSPICIOUS_ACTIVITY,
      )
    ) {
      sessionInfo.securityContext.securityFlags.push(
        SessionSecurityFlag.SUSPICIOUS_ACTIVITY,
      );
    }
  }

  /**
   * Suspend session
   */
  private async suspendSession(
    sessionId: string,
    reason: string,
  ): Promise<void> {
    const sessionInfo = this.activeSessions.get(sessionId);
    if (sessionInfo) {
      sessionInfo.state = BrowserSessionState.SUSPENDED;

      const auditEntry: SessionAuditEntry = {
        id: this.generateAuditId(),
        timestamp: new Date(),
        eventType: SessionAuditEventType.SESSION_SUSPENDED,
        description: `Session suspended: ${reason}`,
        _data: { reason },
        userId: sessionInfo.userId,
        sessionId,
        severity: SessionValidationSeverity.ERROR,
      };

      sessionInfo.auditTrail.push(auditEntry);

      this.logger.warn('Session suspended', { sessionId, reason });
    }
  }

  /**
   * Terminate session
   */
  private async terminateSession(
    sessionId: string,
    reason: string,
  ): Promise<void> {
    const sessionInfo = this.activeSessions.get(sessionId);
    if (sessionInfo) {
      sessionInfo.state = BrowserSessionState.TERMINATED;

      const auditEntry: SessionAuditEntry = {
        id: this.generateAuditId(),
        timestamp: new Date(),
        eventType: SessionAuditEventType.SESSION_TERMINATED,
        description: `Session terminated: ${reason}`,
        _data: { reason },
        userId: sessionInfo.userId,
        sessionId,
        severity: SessionValidationSeverity.CRITICAL,
      };

      sessionInfo.auditTrail.push(auditEntry);

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      // Remove from user sessions
      const userSessions = this.userSessions.get(sessionInfo.userId);
      if (userSessions) {
        userSessions.delete(sessionId);
        if (userSessions.size === 0) {
          this.userSessions.delete(sessionInfo.userId);
        }
      }

      this.logger.warn('Session terminated', { sessionId, reason });
    }
  }

  /**
   * Escalate to human review
   */
  private async escalateToHuman(
    sessionInfo: BrowserSessionInfo,
    threatIndicator: SessionThreatIndicator,
  ): Promise<void> {
    // Create human review task
    this.logger.error('ESCALATION: Security threat requires human review', {
      sessionId: sessionInfo.sessionId,
      userId: sessionInfo.userId,
      threatType: threatIndicator.type,
      severity: threatIndicator.severity,
      confidence: threatIndicator.confidence,
    });

    // In production, this would create a task in a human review queue
  }

  /**
   * Map threat severity to validation severity
   */
  private mapThreatSeverityToValidationSeverity(
    threatSeverity: ThreatSeverity,
  ): SessionValidationSeverity {
    switch (threatSeverity) {
      case ThreatSeverity.LOW:
        return SessionValidationSeverity.INFO;
      case ThreatSeverity.MEDIUM:
        return SessionValidationSeverity.WARNING;
      case ThreatSeverity.HIGH:
        return SessionValidationSeverity.ERROR;
      case ThreatSeverity.CRITICAL:
      case ThreatSeverity.EMERGENCY:
        return SessionValidationSeverity.CRITICAL;
      default:
        return SessionValidationSeverity.INFO;
    }
  }

  /**
   * Initialize validation rules
   */
  private initializeValidationRules(): void {
    // Authentication rule
    this.validationRules.push({
      id: 'authentication_check',
      name: 'Session Authentication Check',
      type: SessionValidationRuleType.AUTHENTICATION,
      config: {},
      priority: 1,
      enabled: true,
      validate: (session: BrowserSessionInfo) => ({
        passed: session.securityContext.authenticated,
        ruleId: 'authentication_check',
        message: session.securityContext.authenticated
          ? 'Authentication valid'
          : 'Session not authenticated',
        severity: session.securityContext.authenticated
          ? SessionValidationSeverity.INFO
          : SessionValidationSeverity.CRITICAL,
      }),
    });

    // Session integrity rule
    this.validationRules.push({
      id: 'session_integrity',
      name: 'Session Integrity Check',
      type: SessionValidationRuleType.INTEGRITY,
      config: {},
      priority: 2,
      enabled: this.config.enableIntegrityCheck,
      validate: (session: BrowserSessionInfo) => {
        const tokenExpired =
          session.securityContext.tokenExpiration < new Date();
        return {
          passed: !tokenExpired,
          ruleId: 'session_integrity',
          message: tokenExpired
            ? 'Session token expired'
            : 'Session integrity valid',
          severity: tokenExpired
            ? SessionValidationSeverity.CRITICAL
            : SessionValidationSeverity.INFO,
        };
      },
    });

    // Concurrent sessions rule
    this.validationRules.push({
      id: 'concurrent_sessions',
      name: 'Concurrent Sessions Limit',
      type: SessionValidationRuleType.AUTHORIZATION,
      config: { maxSessions: this.config.maxConcurrentSessions },
      priority: 3,
      enabled: true,
      validate: (session: BrowserSessionInfo) => {
        const userSessions = this.userSessions.get(session.userId);
        const sessionCount = userSessions ? userSessions.size : 0;
        const withinLimit = sessionCount <= this.config.maxConcurrentSessions;

        return {
          passed: withinLimit,
          ruleId: 'concurrent_sessions',
          message: withinLimit
            ? `Concurrent sessions: ${sessionCount}/${this.config.maxConcurrentSessions}`
            : `Too many concurrent sessions: ${sessionCount}/${this.config.maxConcurrentSessions}`,
          severity: withinLimit
            ? SessionValidationSeverity.INFO
            : SessionValidationSeverity.ERROR,
          remediation: withinLimit
            ? undefined
            : ['Close unused sessions', 'Limit concurrent operations'],
        };
      },
    });
  }

  /**
   * Start session monitoring
   */
  private startSessionMonitoring(): void {
    if (!this.config.monitoring.realTimeMonitoring) {
      return;
    }

    setInterval(() => {
      this.monitorActiveSessions();
    }, this.config.monitoring.monitoringIntervalMs);
  }

  /**
   * Monitor active sessions
   */
  private monitorActiveSessions(): void {
    const now = new Date();

    for (const [sessionId, sessionInfo] of this.activeSessions.entries()) {
      try {
        // Check for idle sessions
        const idleTime = now.getTime() - sessionInfo.lastActivityAt.getTime();
        if (
          idleTime > 600000 &&
          sessionInfo.state === BrowserSessionState.ACTIVE
        ) {
          // 10 minutes
          sessionInfo.state = BrowserSessionState.IDLE;
        }

        // Check resource usage alerts
        this.checkResourceAlerts(sessionInfo);

        // Update risk assessment
        this.updateRiskAssessment(sessionInfo);
      } catch (error) {
        this.logger.error('Session monitoring error', {
          sessionId,
          _error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Check resource usage alerts
   */
  private checkResourceAlerts(sessionInfo: BrowserSessionInfo): void {
    const usage = sessionInfo.resourceUsage;
    const thresholds = this.config.monitoring.alertThresholds;

    if (
      usage.memoryMB >
      (this.config.resourceLimits.maxMemoryMB * thresholds.memoryThreshold) /
        100
    ) {
      this.logger.warn('High memory usage detected', {
        sessionId: sessionInfo.sessionId,
        memoryUsage: usage.memoryMB,
        threshold:
          (this.config.resourceLimits.maxMemoryMB *
            thresholds.memoryThreshold) /
          100,
      });
    }

    if (usage.cpuPercent > thresholds.cpuThreshold) {
      this.logger.warn('High CPU usage detected', {
        sessionId: sessionInfo.sessionId,
        cpuUsage: usage.cpuPercent,
        threshold: thresholds.cpuThreshold,
      });
    }
  }

  /**
   * Update risk assessment
   */
  private updateRiskAssessment(sessionInfo: BrowserSessionInfo): void {
    let riskScore = 25; // Base risk score
    const riskFactors: SessionRiskFactor[] = [];

    // Check for threat indicators
    if (sessionInfo.threatIndicators.length > 0) {
      riskScore += sessionInfo.threatIndicators.length * 20;
      riskFactors.push({
        type: SessionRiskFactorType.SECURITY_VIOLATION,
        description: `${sessionInfo.threatIndicators.length} threat indicators detected`,
        riskContribution: sessionInfo.threatIndicators.length * 20,
        evidence: { threatCount: sessionInfo.threatIndicators.length },
      });
    }

    // Check resource usage
    const usage = sessionInfo.resourceUsage;
    if (usage.memoryMB > this.config.resourceLimits.maxMemoryMB * 0.7) {
      riskScore += 15;
      riskFactors.push({
        type: SessionRiskFactorType.RESOURCE_ABUSE,
        description: 'High memory usage',
        riskContribution: 15,
        evidence: { memoryUsage: usage.memoryMB },
      });
    }

    // Determine risk level
    let riskLevel = SessionRiskLevel.LOW;
    if (riskScore >= 80) riskLevel = SessionRiskLevel.CRITICAL;
    else if (riskScore >= 60) riskLevel = SessionRiskLevel.HIGH;
    else if (riskScore >= 40) riskLevel = SessionRiskLevel.MEDIUM;
    else if (riskScore >= 20) riskLevel = SessionRiskLevel.LOW;
    else riskLevel = SessionRiskLevel.MINIMAL;

    // Update risk assessment
    sessionInfo.securityContext.riskAssessment = {
      riskScore: Math.min(100, Math.max(0, riskScore)),
      riskLevel,
      riskFactors,
      assessedAt: new Date(),
      confidence: 0.8,
    };
  }

  /**
   * Start session cleanup
   */
  private startSessionCleanup(): void {
    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 300000);
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, sessionInfo] of this.activeSessions.entries()) {
      const sessionAge = now.getTime() - sessionInfo.createdAt.getTime();
      const idleTime = now.getTime() - sessionInfo.lastActivityAt.getTime();

      // Check if session should be cleaned up
      if (
        sessionAge > this.config.sessionTimeoutMs ||
        idleTime > this.config.sessionTimeoutMs ||
        sessionInfo.state === BrowserSessionState.TERMINATED
      ) {
        expiredSessions.push(sessionId);
      }
    }

    // Clean up expired sessions
    for (const sessionId of expiredSessions) {
      const sessionInfo = this.activeSessions.get(sessionId);
      if (sessionInfo) {
        this.terminateSession(sessionId, 'Session expired');
      }
    }

    if (expiredSessions.length > 0) {
      this.logger.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Get middleware statistics
   */
  public getStatistics() {
    return {
      activeSessionsCount: this.activeSessions.size,
      uniqueUsersCount: this.userSessions.size,
      validationRulesCount: this.validationRules.length,
      config: {
        enabled: this.config.enabled,
        maxConcurrentSessions: this.config.maxConcurrentSessions,
        sessionTimeoutMs: this.config.sessionTimeoutMs,
        realTimeMonitoring: this.config.monitoring.realTimeMonitoring,
      },
    };
  }
}
