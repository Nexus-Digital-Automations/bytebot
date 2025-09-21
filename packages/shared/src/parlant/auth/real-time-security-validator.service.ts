/**
 * PARLANT Real-Time Security Validation Interface
 *
 * Real-time security validation system through chat interface with live threat
 * detection, conversational security alerts, interactive security policy
 * enforcement, and adaptive security controls based on conversation context
 * and user behavior.
 *
 * @author Claude Code (Real-Time Security Specialist)
 * @version 1.0.0
 * @priority CRITICAL - Real-time security validation and threat detection
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

// Security Event Interfaces
export interface SecurityEvent {
  eventId: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: SecuritySeverity;
  source: string;
  details: SecurityEventDetails;
  conversationContext?: ConversationSecurityContext;
}

export type SecurityEventType =
  | 'authentication_attempt'
  | 'permission_escalation'
  | 'suspicious_activity'
  | 'policy_violation'
  | 'threat_detected'
  | 'access_anomaly'
  | 'conversation_security_breach';

export type SecuritySeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEventDetails {
  userId?: string;
  conversationId?: string;
  action: string;
  resource?: string;
  riskScore: number;
  indicators: string[];
  metadata: Record<string, any>;
}

export interface ConversationSecurityContext {
  conversationId: string;
  userId: string;
  sessionId: string;
  securityLevel: string;
  currentThreatLevel: SecuritySeverity;
  activeSecurityPolicies: string[];
  conversationalAlerts: ConversationalAlert[];
}

export interface ConversationalAlert {
  alertId: string;
  type: 'warning' | 'threat' | 'policy_violation' | 'anomaly';
  message: string;
  actionRequired: boolean;
  conversationalResponse?: string;
  autoResolutionAttempts: number;
  timestamp: Date;
}

export interface SecurityValidationRequest {
  conversationId: string;
  userId: string;
  action: string;
  resource?: string;
  context: {
    securityLevel: string;
    currentSession: any;
    requestMetadata: Record<string, any>;
  };
}

export interface SecurityValidationResult {
  allowed: boolean;
  riskScore: number;
  threats: ThreatDetection[];
  policyViolations: PolicyViolation[];
  conversationalInterventions: ConversationalIntervention[];
  adaptiveControls: AdaptiveSecurityControl[];
  auditTrail: SecurityAuditEntry[];
}

export interface ThreatDetection {
  threatId: string;
  type: string;
  confidence: number;
  description: string;
  riskLevel: SecuritySeverity;
  mitigationActions: string[];
  conversationalResponse: string;
}

export interface PolicyViolation {
  policyId: string;
  policyName: string;
  violationType: string;
  severity: SecuritySeverity;
  description: string;
  enforcementAction: 'warn' | 'block' | 'escalate';
  conversationalExplanation: string;
}

export interface ConversationalIntervention {
  interventionId: string;
  type: 'confirmation' | 'challenge' | 'explanation' | 'escalation';
  message: string;
  expectedResponses?: string[];
  timeout: number;
  escalationPath?: string[];
}

export interface AdaptiveSecurityControl {
  controlId: string;
  type: 'rate_limiting' | 'additional_auth' | 'session_restriction' | 'monitoring_increase';
  description: string;
  duration: number; // milliseconds
  parameters: Record<string, any>;
  conversationalNotification: string;
}

export interface SecurityAuditEntry {
  entryId: string;
  timestamp: Date;
  eventType: string;
  userId: string;
  action: string;
  result: 'allowed' | 'denied' | 'escalated';
  riskScore: number;
  conversationId?: string;
}

@Injectable()
export class RealTimeSecurityValidator extends EventEmitter {
  private readonly logger = new Logger(RealTimeSecurityValidator.name);

  // Real-time security state tracking
  private readonly activeSecuritySessions = new Map<string, ConversationSecurityContext>();
  private readonly securityEvents = new Map<string, SecurityEvent[]>();
  private readonly threatIntelligence = new Map<string, any>();
  private readonly securityPolicies = new Map<string, any>();

  // Performance and monitoring metrics
  private readonly securityMetrics = {
    totalValidations: 0,
    threatsDetected: 0,
    policyViolations: 0,
    conversationalInterventions: 0,
    averageValidationTime: 0,
    realTimeAlerts: 0
  };

  // Real-time monitoring intervals
  private monitoringInterval?: NodeJS.Timeout;
  private threatDetectionInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.initializeSecurityPolicies();
    this.startRealTimeMonitoring();
    this.logger.log('🛡️ Real-Time Security Validator initialized with conversational threat detection');
  }

  /**
   * Primary real-time security validation method
   */
  async validateSecurityInRealTime(
    request: SecurityValidationRequest
  ): Promise<SecurityValidationResult> {
    const startTime = performance.now();
    this.securityMetrics.totalValidations++;

    try {
      this.logger.debug(`Starting real-time security validation for conversation: ${request.conversationId}`);

      // Step 1: Update security context
      await this.updateSecurityContext(request);

      // Step 2: Real-time threat detection
      const threats = await this.performRealTimeThreatDetection(request);

      // Step 3: Policy validation
      const policyViolations = await this.validateSecurityPolicies(request);

      // Step 4: Risk score calculation
      const riskScore = await this.calculateRealTimeRiskScore(request, threats, policyViolations);

      // Step 5: Generate conversational interventions
      const conversationalInterventions = await this.generateConversationalInterventions(
        request, threats, policyViolations, riskScore
      );

      // Step 6: Apply adaptive security controls
      const adaptiveControls = await this.applyAdaptiveSecurityControls(
        request, riskScore, threats
      );

      // Step 7: Create audit trail
      const auditTrail = await this.createSecurityAuditTrail(
        request, riskScore, threats, policyViolations
      );

      // Step 8: Determine if action is allowed
      const allowed = this.determineActionAllowed(riskScore, threats, policyViolations);

      // Step 9: Emit real-time security events
      await this.emitRealTimeSecurityEvents(request, threats, policyViolations, allowed);

      const validationTime = performance.now() - startTime;
      this.updateSecurityMetrics(validationTime, threats, policyViolations, conversationalInterventions);

      const result: SecurityValidationResult = {
        allowed,
        riskScore,
        threats,
        policyViolations,
        conversationalInterventions,
        adaptiveControls,
        auditTrail
      };

      this.logger.log(`Security validation completed in ${validationTime.toFixed(2)}ms for conversation: ${request.conversationId}`);
      return result;

    } catch (error) {
      this.logger.error(`Security validation failed for conversation: ${request.conversationId}`, error);
      throw error;
    }
  }

  /**
   * Update security context for conversation
   */
  private async updateSecurityContext(request: SecurityValidationRequest): Promise<void> {
    const existingContext = this.activeSecuritySessions.get(request.conversationId);

    const updatedContext: ConversationSecurityContext = {
      conversationId: request.conversationId,
      userId: request.userId,
      sessionId: request.context.currentSession?.sessionId || 'unknown',
      securityLevel: request.context.securityLevel,
      currentThreatLevel: existingContext?.currentThreatLevel || 'info',
      activeSecurityPolicies: existingContext?.activeSecurityPolicies || ['default_policy'],
      conversationalAlerts: existingContext?.conversationalAlerts || []
    };

    this.activeSecuritySessions.set(request.conversationId, updatedContext);
  }

  /**
   * Perform real-time threat detection
   */
  private async performRealTimeThreatDetection(
    request: SecurityValidationRequest
  ): Promise<ThreatDetection[]> {
    const threats: ThreatDetection[] = [];

    // Threat pattern analysis
    const threatPatterns = [
      {
        pattern: /admin|root|system|sudo/i,
        type: 'privilege_escalation',
        riskLevel: 'high' as SecuritySeverity,
        confidence: 0.8
      },
      {
        pattern: /password|secret|token|key/i,
        type: 'credential_exposure',
        riskLevel: 'medium' as SecuritySeverity,
        confidence: 0.7
      },
      {
        pattern: /delete|remove|destroy|wipe/i,
        type: 'destructive_action',
        riskLevel: 'high' as SecuritySeverity,
        confidence: 0.75
      },
      {
        pattern: /bypass|override|skip|ignore/i,
        type: 'security_bypass',
        riskLevel: 'critical' as SecuritySeverity,
        confidence: 0.9
      }
    ];

    // Analyze request action for threat patterns
    for (const threatPattern of threatPatterns) {
      if (threatPattern.pattern.test(request.action)) {
        const threat: ThreatDetection = {
          threatId: `threat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: threatPattern.type,
          confidence: threatPattern.confidence,
          description: `Potential ${threatPattern.type} detected in action: ${request.action}`,
          riskLevel: threatPattern.riskLevel,
          mitigationActions: this.getMitigationActions(threatPattern.type),
          conversationalResponse: this.generateThreatResponse(threatPattern.type, threatPattern.riskLevel)
        };

        threats.push(threat);
        this.securityMetrics.threatsDetected++;
      }
    }

    // Behavioral anomaly detection
    const behavioralThreats = await this.detectBehavioralAnomalies(request);
    threats.push(...behavioralThreats);

    return threats;
  }

  /**
   * Validate security policies
   */
  private async validateSecurityPolicies(
    request: SecurityValidationRequest
  ): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];

    // Time-based policy validation
    const currentHour = new Date().getHours();
    if (currentHour < 6 || currentHour > 22) {
      if (request.context.securityLevel === 'CRITICAL' || request.context.securityLevel === 'HIGH') {
        violations.push({
          policyId: 'time_restriction',
          policyName: 'Off-Hours Access Policy',
          violationType: 'temporal_violation',
          severity: 'medium',
          description: 'High-security actions are restricted during off-hours (10 PM - 6 AM)',
          enforcementAction: 'escalate',
          conversationalExplanation: 'I notice you\'re trying to perform a high-security action outside of normal business hours. This requires additional approval.'
        });
        this.securityMetrics.policyViolations++;
      }
    }

    // Rate limiting policy
    const recentEvents = this.getRecentSecurityEvents(request.conversationId, 300000); // 5 minutes
    if (recentEvents.length > 10) {
      violations.push({
        policyId: 'rate_limiting',
        policyName: 'Request Rate Limiting',
        violationType: 'rate_limit_exceeded',
        severity: 'high',
        description: 'Too many security-sensitive requests in a short time period',
        enforcementAction: 'block',
        conversationalExplanation: 'You\'ve made many security requests recently. Please wait a moment before trying again for security reasons.'
      });
    }

    // Resource access policy
    if (request.resource && request.resource.includes('admin')) {
      const securityContext = this.activeSecuritySessions.get(request.conversationId);
      if (securityContext?.securityLevel !== 'CRITICAL') {
        violations.push({
          policyId: 'admin_access',
          policyName: 'Administrative Access Policy',
          violationType: 'insufficient_privileges',
          severity: 'high',
          description: 'Administrative resources require CRITICAL security level',
          enforcementAction: 'block',
          conversationalExplanation: 'Access to administrative resources requires the highest security clearance. Please escalate your request through proper channels.'
        });
      }
    }

    return violations;
  }

  /**
   * Calculate real-time risk score
   */
  private async calculateRealTimeRiskScore(
    request: SecurityValidationRequest,
    threats: ThreatDetection[],
    violations: PolicyViolation[]
  ): Promise<number> {
    let riskScore = 0.0;

    // Base risk from request context
    switch (request.context.securityLevel) {
      case 'CRITICAL':
        riskScore += 0.3;
        break;
      case 'HIGH':
        riskScore += 0.2;
        break;
      case 'MODERATE':
        riskScore += 0.1;
        break;
    }

    // Threat-based risk
    for (const threat of threats) {
      switch (threat.riskLevel) {
        case 'critical':
          riskScore += 0.4 * threat.confidence;
          break;
        case 'high':
          riskScore += 0.3 * threat.confidence;
          break;
        case 'medium':
          riskScore += 0.2 * threat.confidence;
          break;
        case 'low':
          riskScore += 0.1 * threat.confidence;
          break;
      }
    }

    // Policy violation risk
    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical':
          riskScore += 0.4;
          break;
        case 'high':
          riskScore += 0.3;
          break;
        case 'medium':
          riskScore += 0.2;
          break;
        case 'low':
          riskScore += 0.1;
          break;
      }
    }

    // Historical risk factors
    const recentEvents = this.getRecentSecurityEvents(request.conversationId, 3600000); // 1 hour
    const highRiskEvents = recentEvents.filter(event => event.details.riskScore > 0.7);
    if (highRiskEvents.length > 0) {
      riskScore += 0.1 * Math.min(highRiskEvents.length, 5) / 5; // Cap at 0.1
    }

    return Math.min(riskScore, 1.0); // Cap at 1.0
  }

  /**
   * Generate conversational interventions
   */
  private async generateConversationalInterventions(
    request: SecurityValidationRequest,
    threats: ThreatDetection[],
    violations: PolicyViolation[],
    riskScore: number
  ): Promise<ConversationalIntervention[]> {
    const interventions: ConversationalIntervention[] = [];

    // High-risk interventions
    if (riskScore > 0.8) {
      interventions.push({
        interventionId: `intervention-${Date.now()}-high-risk`,
        type: 'challenge',
        message: 'This action has been flagged as high-risk. Please provide additional verification by explaining why this action is necessary.',
        expectedResponses: ['business justification', 'emergency', 'routine maintenance'],
        timeout: 120000, // 2 minutes
        escalationPath: ['security_team', 'system_administrator']
      });
      this.securityMetrics.conversationalInterventions++;
    }

    // Threat-specific interventions
    for (const threat of threats) {
      if (threat.riskLevel === 'critical' || threat.riskLevel === 'high') {
        interventions.push({
          interventionId: `intervention-${threat.threatId}`,
          type: 'explanation',
          message: threat.conversationalResponse,
          timeout: 60000,
          escalationPath: ['security_team']
        });
      }
    }

    // Policy violation interventions
    for (const violation of violations) {
      if (violation.enforcementAction === 'escalate') {
        interventions.push({
          interventionId: `intervention-${violation.policyId}`,
          type: 'escalation',
          message: violation.conversationalExplanation,
          timeout: 300000, // 5 minutes
          escalationPath: ['manager', 'security_team']
        });
      }
    }

    return interventions;
  }

  /**
   * Apply adaptive security controls
   */
  private async applyAdaptiveSecurityControls(
    request: SecurityValidationRequest,
    riskScore: number,
    threats: ThreatDetection[]
  ): Promise<AdaptiveSecurityControl[]> {
    const controls: AdaptiveSecurityControl[] = [];

    // Risk-based controls
    if (riskScore > 0.6) {
      controls.push({
        controlId: `rate-limit-${request.conversationId}`,
        type: 'rate_limiting',
        description: 'Temporary rate limiting due to elevated risk',
        duration: 600000, // 10 minutes
        parameters: { maxRequests: 5, windowMs: 300000 },
        conversationalNotification: 'Due to security concerns, I\'m temporarily limiting the frequency of requests.'
      });
    }

    if (riskScore > 0.8) {
      controls.push({
        controlId: `enhanced-monitoring-${request.conversationId}`,
        type: 'monitoring_increase',
        description: 'Enhanced monitoring due to high risk score',
        duration: 3600000, // 1 hour
        parameters: { alertThreshold: 0.3, detailedLogging: true },
        conversationalNotification: 'Your session is under enhanced monitoring for security reasons.'
      });
    }

    // Threat-specific controls
    for (const threat of threats) {
      if (threat.type === 'privilege_escalation') {
        controls.push({
          controlId: `auth-challenge-${threat.threatId}`,
          type: 'additional_auth',
          description: 'Additional authentication required due to privilege escalation attempt',
          duration: 1800000, // 30 minutes
          parameters: { authLevel: 'enhanced', mfaRequired: true },
          conversationalNotification: 'Additional authentication is required due to the sensitive nature of your request.'
        });
      }
    }

    return controls;
  }

  /**
   * Create security audit trail
   */
  private async createSecurityAuditTrail(
    request: SecurityValidationRequest,
    riskScore: number,
    threats: ThreatDetection[],
    violations: PolicyViolation[]
  ): Promise<SecurityAuditEntry[]> {
    const auditEntries: SecurityAuditEntry[] = [];

    // Main validation entry
    auditEntries.push({
      entryId: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      eventType: 'security_validation',
      userId: request.userId,
      action: request.action,
      result: riskScore > 0.7 ? 'denied' : 'allowed',
      riskScore,
      conversationId: request.conversationId
    });

    // Threat detection entries
    for (const threat of threats) {
      auditEntries.push({
        entryId: `audit-threat-${threat.threatId}`,
        timestamp: new Date(),
        eventType: 'threat_detected',
        userId: request.userId,
        action: `Threat: ${threat.type}`,
        result: 'escalated',
        riskScore: threat.confidence,
        conversationId: request.conversationId
      });
    }

    return auditEntries;
  }

  /**
   * Determine if action should be allowed
   */
  private determineActionAllowed(
    riskScore: number,
    threats: ThreatDetection[],
    violations: PolicyViolation[]
  ): boolean {
    // High risk score blocks action
    if (riskScore > 0.8) return false;

    // Critical threats block action
    if (threats.some(threat => threat.riskLevel === 'critical' && threat.confidence > 0.8)) {
      return false;
    }

    // Policy violations with block enforcement
    if (violations.some(violation => violation.enforcementAction === 'block')) {
      return false;
    }

    return true;
  }

  /**
   * Emit real-time security events
   */
  private async emitRealTimeSecurityEvents(
    request: SecurityValidationRequest,
    threats: ThreatDetection[],
    violations: PolicyViolation[],
    allowed: boolean
  ): Promise<void> {
    const securityEvent: SecurityEvent = {
      eventId: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: allowed ? 'authentication_attempt' : 'suspicious_activity',
      severity: allowed ? 'info' : 'high',
      source: 'conversational_interface',
      details: {
        userId: request.userId,
        conversationId: request.conversationId,
        action: request.action,
        riskScore: this.calculateEventRiskScore(threats, violations),
        indicators: [...threats.map(t => t.type), ...violations.map(v => v.violationType)],
        metadata: { allowed, threatCount: threats.length, violationCount: violations.length }
      },
      conversationContext: this.activeSecuritySessions.get(request.conversationId)
    };

    // Store event
    const conversationEvents = this.securityEvents.get(request.conversationId) || [];
    conversationEvents.push(securityEvent);
    this.securityEvents.set(request.conversationId, conversationEvents);

    // Emit event for real-time processing
    this.emit('securityEvent', securityEvent);

    // Create conversational alert if needed
    if (!allowed || threats.length > 0 || violations.length > 0) {
      await this.createConversationalAlert(securityEvent);
    }
  }

  /**
   * Start real-time monitoring
   */
  private startRealTimeMonitoring(): void {
    // Real-time session monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.monitorActiveSessions();
    }, 30000); // Every 30 seconds

    // Threat intelligence updates
    this.threatDetectionInterval = setInterval(async () => {
      await this.updateThreatIntelligence();
    }, 300000); // Every 5 minutes
  }

  /**
   * Monitor active sessions for anomalies
   */
  private async monitorActiveSessions(): Promise<void> {
    for (const [conversationId, context] of this.activeSecuritySessions.entries()) {
      const recentEvents = this.getRecentSecurityEvents(conversationId, 600000); // 10 minutes

      // Check for anomalous patterns
      if (recentEvents.length > 20) {
        await this.escalateSecurityConcern(context, 'High activity volume detected');
      }

      // Check for escalating risk patterns
      const recentHighRiskEvents = recentEvents.filter(event => event.details.riskScore > 0.7);
      if (recentHighRiskEvents.length > 3) {
        await this.escalateSecurityConcern(context, 'Multiple high-risk events detected');
      }
    }
  }

  /**
   * Helper methods
   */
  private detectBehavioralAnomalies(request: SecurityValidationRequest): Promise<ThreatDetection[]> {
    // Simplified behavioral analysis
    return Promise.resolve([]);
  }

  private getMitigationActions(threatType: string): string[] {
    const mitigationMap: Record<string, string[]> = {
      privilege_escalation: ['Additional authentication', 'Manager approval', 'Activity logging'],
      credential_exposure: ['Immediate password reset', 'Session invalidation', 'Security notification'],
      destructive_action: ['Backup verification', 'Multi-factor confirmation', 'Change approval'],
      security_bypass: ['Immediate escalation', 'Session termination', 'Security review']
    };
    return mitigationMap[threatType] || ['Standard security review'];
  }

  private generateThreatResponse(threatType: string, riskLevel: SecuritySeverity): string {
    const responses: Record<string, Record<SecuritySeverity, string>> = {
      privilege_escalation: {
        info: 'I notice you\'re requesting elevated privileges.',
        low: 'This request requires elevated privileges. Additional verification may be needed.',
        medium: 'Elevated privilege request detected. Please provide justification.',
        high: 'High-privilege escalation detected. This requires immediate approval.',
        critical: 'CRITICAL: Unauthorized privilege escalation attempt. This incident will be escalated.'
      }
    };
    return responses[threatType]?.[riskLevel] || 'Security concern detected. Please contact support.';
  }

  private getRecentSecurityEvents(conversationId: string, timeWindowMs: number): SecurityEvent[] {
    const events = this.securityEvents.get(conversationId) || [];
    const cutoffTime = Date.now() - timeWindowMs;
    return events.filter(event => event.timestamp.getTime() > cutoffTime);
  }

  private calculateEventRiskScore(threats: ThreatDetection[], violations: PolicyViolation[]): number {
    let score = 0;
    threats.forEach(threat => {
      switch (threat.riskLevel) {
        case 'critical': score += 0.4; break;
        case 'high': score += 0.3; break;
        case 'medium': score += 0.2; break;
        case 'low': score += 0.1; break;
      }
    });
    violations.forEach(violation => {
      switch (violation.severity) {
        case 'critical': score += 0.4; break;
        case 'high': score += 0.3; break;
        case 'medium': score += 0.2; break;
        case 'low': score += 0.1; break;
      }
    });
    return Math.min(score, 1.0);
  }

  private async createConversationalAlert(securityEvent: SecurityEvent): Promise<void> {
    const alert: ConversationalAlert = {
      alertId: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: securityEvent.severity === 'critical' ? 'threat' : 'warning',
      message: `Security ${securityEvent.type} detected in conversation ${securityEvent.details.conversationId}`,
      actionRequired: securityEvent.severity === 'high' || securityEvent.severity === 'critical',
      conversationalResponse: this.generateAlertResponse(securityEvent),
      autoResolutionAttempts: 0,
      timestamp: new Date()
    };

    const context = this.activeSecuritySessions.get(securityEvent.details.conversationId!);
    if (context) {
      context.conversationalAlerts.push(alert);
      this.securityMetrics.realTimeAlerts++;
    }

    this.emit('conversationalAlert', alert);
  }

  private generateAlertResponse(securityEvent: SecurityEvent): string {
    switch (securityEvent.severity) {
      case 'critical':
        return 'SECURITY ALERT: Critical security event detected. Your session may be restricted.';
      case 'high':
        return 'Security warning: Suspicious activity detected. Please verify your actions.';
      case 'medium':
        return 'Security notice: Your recent activity is being monitored for security.';
      default:
        return 'Security information: Activity logged for security purposes.';
    }
  }

  private async escalateSecurityConcern(
    context: ConversationSecurityContext,
    reason: string
  ): Promise<void> {
    this.logger.warn(`Security escalation for conversation ${context.conversationId}: ${reason}`);
    this.emit('securityEscalation', { context, reason, timestamp: new Date() });
  }

  private async updateThreatIntelligence(): Promise<void> {
    // Update threat intelligence feeds (simplified)
    this.logger.debug('Updating threat intelligence feeds');
  }

  private initializeSecurityPolicies(): void {
    // Initialize default security policies
    this.securityPolicies.set('default_policy', {
      name: 'Default Security Policy',
      rules: ['time_restrictions', 'rate_limiting', 'privilege_checks']
    });
  }

  private updateSecurityMetrics(
    validationTime: number,
    threats: ThreatDetection[],
    violations: PolicyViolation[],
    interventions: ConversationalIntervention[]
  ): void {
    this.securityMetrics.averageValidationTime =
      (this.securityMetrics.averageValidationTime * (this.securityMetrics.totalValidations - 1) + validationTime) /
      this.securityMetrics.totalValidations;
  }

  /**
   * Public methods for external access
   */
  getSecurityMetrics() {
    return { ...this.securityMetrics };
  }

  getActiveSecuritySessions() {
    return Array.from(this.activeSecuritySessions.values());
  }

  async healthCheck(): Promise<{ status: string; metrics: any }> {
    return {
      status: 'healthy',
      metrics: this.getSecurityMetrics()
    };
  }
}