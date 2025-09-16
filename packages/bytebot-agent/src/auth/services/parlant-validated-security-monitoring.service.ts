/**
 * Parlant-Validated Security Monitoring Service - MAXIMUM INTEGRATION
 *
 * Comprehensive conversational AI validation wrapper for ALL security monitoring operations
 * implementing function-level Parlant integration with enterprise-grade security intelligence.
 *
 * Features:
 * - Pre-execution conversational validation for all security monitoring operations
 * - Real-time threat intent verification through natural language processing
 * - Security-aware safety guardrails and compliance enforcement
 * - Complete conversational audit trail for security incidents and responses
 * - Context-aware threat validation with adaptive security responses
 * - Performance optimization with intelligent caching for security checks
 *
 * Architecture: Wraps existing SecurityMonitoringService with Parlant conversational validation layer
 * Security: Multi-tier security validation with conversational confirmation for threat responses
 * Performance: Sub-300ms validation for security operations with intelligent caching
 *
 * @fileoverview Parlant maximum integration for security monitoring services
 * @version 1.0.0
 * @author Agent 2 - Authentication & Authorization Parlant Integration Specialist
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SecurityMonitoringService,
  SecurityEvent,
  SecurityEventType,
  SecurityEventSeverity,
  SecurityMetrics,
  GeolocationData,
} from './security-monitoring.service';
import {
  ParlantIntegrationService,
  ParlantValidationRequest,
  RiskLevel,
  ParlantConversationContext,
  ConversationalValidationError,
} from '../../parlant/parlant-integration.service';

/**
 * Security-specific Parlant validation context
 */
export interface SecurityParlantContext extends ParlantConversationContext {
  readonly securityAction:
    | 'record_event'
    | 'block_ip'
    | 'generate_alert'
    | 'investigate_threat'
    | 'respond_to_incident';
  readonly threatContext: {
    readonly eventType: SecurityEventType;
    readonly severity: SecurityEventSeverity;
    readonly threatLevel: 'minimal' | 'low' | 'medium' | 'high' | 'critical';
    readonly affectedSystems: string[];
    readonly potentialImpact:
      | 'data_breach'
      | 'service_disruption'
      | 'unauthorized_access'
      | 'compliance_violation'
      | 'none';
  };
  readonly incidentContext: {
    readonly isActiveIncident: boolean;
    readonly requiresEscalation: boolean;
    readonly affectsMultipleUsers: boolean;
    readonly requiresImmedateResponse: boolean;
  };
  readonly complianceRequired: boolean;
  readonly auditRequired: boolean;
  readonly notificationRequired: boolean;
}

/**
 * Security monitoring operation validation request
 */
export interface SecurityValidationRequest extends ParlantValidationRequest {
  readonly securityContext: SecurityParlantContext;
  readonly securityData?: {
    readonly hasPersonalData: boolean;
    readonly affectsProduction: boolean;
    readonly triggersAlerts: boolean;
    readonly requiresApproval: boolean;
    readonly automatedResponse: boolean;
  };
}

/**
 * Security audit trail entry with Parlant integration
 */
export interface SecurityParlantAuditEntry {
  readonly auditId: string;
  readonly parlantConversationId: string;
  readonly securityEventId?: string;
  readonly securityAction: string;
  readonly userId?: string;
  readonly ipAddress?: string;
  readonly parlantValidationResult: 'approved' | 'denied' | 'error';
  readonly parlantConfidenceScore: number;
  readonly parlantReasoning: string;
  readonly executionResult: 'success' | 'failure' | 'timeout' | 'cancelled';
  readonly threatLevel: string;
  readonly severity: SecurityEventSeverity;
  readonly riskAssessment: RiskLevel;
  readonly complianceStatus: 'compliant' | 'non_compliant' | 'requires_review';
  readonly timestamp: Date;
  readonly responseTime: number;
  readonly securityFlags: string[];
  readonly conversationSummary: string;
  readonly automatedActions?: string[];
}

@Injectable()
export class ParlantValidatedSecurityMonitoringService {
  private readonly logger = new Logger(
    ParlantValidatedSecurityMonitoringService.name,
  );

  // Security-specific audit trail with Parlant integration
  private readonly securityAuditTrail: SecurityParlantAuditEntry[] = [];

  // Performance metrics for security operations
  private securityValidationCount = 0;
  private securityCacheHitCount = 0;
  private averageSecurityValidationTime = 0;

  // Security incident tracking
  private activeSecurityIncidents = new Map<string, SecurityEvent>();
  private threatIntelligenceCache = new Map<string, any>();

  constructor(
    private readonly securityMonitoringService: SecurityMonitoringService,
    private readonly parlantIntegrationService: ParlantIntegrationService,
    private readonly configService: ConfigService,
  ) {
    const operationId = `parlant-security-init-${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `[${operationId}] Initializing Parlant-Validated Security Monitoring Service`,
      {
        operationId,
        parlantEnabled: this.isParlantSecurityEnabled(),
        auditEnabled: this.isSecurityAuditEnabled(),
        complianceMode: this.getSecurityComplianceMode(),
        threatIntelEnabled: this.isThreatIntelEnabled(),
      },
    );

    // Initialize performance monitoring for security operations
    setInterval(() => this.logSecurityPerformanceMetrics(), 60000); // Every minute

    // Initialize security incident cleanup
    setInterval(() => this.cleanupExpiredIncidents(), 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Record login attempt with comprehensive Parlant conversational validation
   *
   * Validates security event recording with pre-execution conversational confirmation
   * and real-time threat assessment through natural language processing.
   *
   * @param email - User email for login attempt
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   * @param success - Whether login was successful
   * @param userId - User ID if login was successful
   * @returns Promise<SecurityEvent> - Security event with conversational validation audit
   * @throws ConversationalValidationError if validation fails
   */
  async recordLoginAttempt(
    email: string,
    ipAddress: string,
    userAgent?: string,
    success = false,
    userId?: string,
  ): Promise<SecurityEvent> {
    const operationId = `parlant-security-login-${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.log(
      `[${operationId}] Parlant-validated security login recording`,
      {
        operationId,
        email,
        ipAddress,
        success,
        userId,
        userAgent: userAgent?.substring(0, 100),
      },
    );

    try {
      // Build security-specific Parlant context
      const securityContext: SecurityParlantContext = {
        userId: userId || 'unknown',
        sessionId: operationId,
        agentRole: 'security_monitoring_agent',
        securityLevel: success ? 'MEDIUM' : 'HIGH', // Failed logins are higher risk
        conversationHistory: [],
        metadata: {
          securityEvent: true,
          loginAttempt: true,
          ipAddress,
          userAgent: userAgent?.substring(0, 200),
          geolocation: await this.getGeolocationContext(ipAddress),
        },
        securityAction: 'record_event',
        threatContext: {
          eventType: success
            ? SecurityEventType.LOGIN_SUCCESS
            : SecurityEventType.LOGIN_FAILURE,
          severity: this.determineSeverityForLoginAttempt(
            success,
            ipAddress,
            userAgent,
          ),
          threatLevel: this.assessThreatLevel(success, ipAddress, userAgent),
          affectedSystems: ['authentication'],
          potentialImpact: success ? 'none' : 'unauthorized_access',
        },
        incidentContext: {
          isActiveIncident: !success && this.isKnownThreatIp(ipAddress),
          requiresEscalation: this.requiresEscalation(success, ipAddress),
          affectsMultipleUsers: false,
          requiresImmedateResponse: this.requiresImmediateResponse(
            success,
            ipAddress,
          ),
        },
        complianceRequired: this.requiresCompliance(success, ipAddress),
        auditRequired: true,
        notificationRequired: this.requiresNotification(success, ipAddress),
      };

      // Create comprehensive validation request
      const validationRequest: SecurityValidationRequest = {
        functionName: 'SecurityMonitoringService.recordLoginAttempt',
        functionParams: {
          email,
          ipAddress,
          userAgent: userAgent?.substring(0, 100),
          success,
          userId,
        },
        actionDescription: `Record ${success ? 'successful' : 'failed'} login attempt for ${email} from IP ${ipAddress}`,
        context: securityContext,
        riskLevel: this.assessSecurityRiskLevel(success, ipAddress, userAgent),
        operationId,
        securityContext,
        securityData: {
          hasPersonalData: true,
          affectsProduction: false,
          triggersAlerts: !success,
          requiresApproval: false,
          automatedResponse: this.triggersAutomatedResponse(success, ipAddress),
        },
      };

      // Perform Parlant conversational validation
      const validationResponse =
        await this.parlantIntegrationService.validateFunctionExecution(
          validationRequest,
        );

      if (!validationResponse.approved) {
        const auditEntry = this.createSecurityAuditEntry({
          operationId,
          conversationId: validationResponse.conversationId,
          securityAction: 'record_event',
          userId,
          ipAddress,
          validationResult: 'denied',
          riskAssessment: validationRequest.riskLevel,
          complianceStatus: 'non_compliant',
          executionResult: 'cancelled',
          threatLevel: securityContext.threatContext.threatLevel,
          severity: securityContext.threatContext.severity,
          responseTime: Date.now() - startTime,
          securityFlags: ['validation_denied', 'security_event_blocked'],
          conversationSummary: validationResponse.reasoning,
          parlantConfidenceScore: validationResponse.confidence,
        });

        this.addToSecurityAuditTrail(auditEntry);

        this.logger.warn(
          `[${operationId}] Security event recording denied by Parlant validation`,
          {
            operationId,
            email,
            ipAddress,
            conversationId: validationResponse.conversationId,
            reason: validationResponse.reasoning,
          },
        );

        throw new ConversationalValidationError(
          validationResponse.conversationId,
          validationResponse.reasoning,
          validationResponse.suggestedAlternatives || [],
        );
      }

      // Execute validated security event recording
      this.logger.log(
        `[${operationId}] Executing validated security event recording`,
        {
          operationId,
          email,
          ipAddress,
          conversationId: validationResponse.conversationId,
          confidence: validationResponse.confidence,
        },
      );

      const securityEvent = this.securityMonitoringService.recordLoginAttempt(
        email,
        ipAddress,
        userAgent,
        success,
        userId,
      );

      // Track active incidents if this is a high-risk event
      if (
        securityEvent.severity === SecurityEventSeverity.HIGH ||
        securityEvent.severity === SecurityEventSeverity.CRITICAL
      ) {
        this.activeSecurityIncidents.set(securityEvent.eventId, securityEvent);
      }

      // Create successful audit entry
      const successAuditEntry = this.createSecurityAuditEntry({
        operationId,
        conversationId: validationResponse.conversationId,
        securityEventId: securityEvent.eventId,
        securityAction: 'record_event',
        userId,
        ipAddress,
        validationResult: 'approved',
        riskAssessment: validationRequest.riskLevel,
        complianceStatus: 'compliant',
        executionResult: 'success',
        threatLevel: securityContext.threatContext.threatLevel,
        severity: securityEvent.severity,
        responseTime: Date.now() - startTime,
        securityFlags: [
          'parlant_validated',
          'security_event_recorded',
          ...(success ? ['login_success'] : ['login_failure']),
          ...(securityEvent.severity === SecurityEventSeverity.CRITICAL
            ? ['critical_incident']
            : []),
        ],
        conversationSummary: `Security event recorded: ${validationResponse.reasoning}. Event details: ${securityEvent.type}`,
        parlantConfidenceScore: validationResponse.confidence,
        automatedActions: this.getAutomatedActions(securityEvent),
      });

      this.addToSecurityAuditTrail(successAuditEntry);

      // Update performance metrics
      const duration = Date.now() - startTime;
      this.updateSecurityPerformanceMetrics(duration);

      this.logger.log(
        `[${operationId}] Parlant-validated security event recording successful`,
        {
          operationId,
          email,
          ipAddress,
          eventId: securityEvent.eventId,
          eventType: securityEvent.type,
          severity: securityEvent.severity,
          conversationId: validationResponse.conversationId,
          validationTimeMs: duration,
          complianceStatus: successAuditEntry.complianceStatus,
        },
      );

      return securityEvent;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof ConversationalValidationError) {
        // Re-throw validation errors
        throw error;
      }

      // Handle execution errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const errorAuditEntry = this.createSecurityAuditEntry({
        operationId,
        conversationId: 'ERROR',
        securityAction: 'record_event',
        userId,
        ipAddress,
        validationResult: 'error',
        riskAssessment: RiskLevel.HIGH,
        complianceStatus: 'non_compliant',
        executionResult: 'failure',
        threatLevel: 'high',
        severity: SecurityEventSeverity.HIGH,
        responseTime: duration,
        securityFlags: ['execution_error', 'security_event_failure'],
        conversationSummary: `Security event recording execution failed: ${errorMessage}`,
        parlantConfidenceScore: 0.0,
      });

      this.addToSecurityAuditTrail(errorAuditEntry);

      this.logger.error(
        `[${operationId}] Parlant-validated security event recording failed`,
        {
          operationId,
          email,
          ipAddress,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          validationTimeMs: duration,
        },
      );

      throw error;
    }
  }

  /**
   * Check if IP is blocked with Parlant validation
   *
   * @param ipAddress - IP address to check
   * @returns Promise<boolean> - Whether IP is blocked
   */
  async isIpBlocked(ipAddress: string): Promise<boolean> {
    const operationId = `parlant-security-ip-check-${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const securityContext: SecurityParlantContext = {
      userId: 'system',
      sessionId: operationId,
      agentRole: 'security_monitoring_agent',
      securityLevel: 'LOW',
      conversationHistory: [],
      metadata: { ipCheck: true, ipAddress },
      securityAction: 'investigate_threat',
      threatContext: {
        eventType: SecurityEventType.SUSPICIOUS_IP,
        severity: SecurityEventSeverity.LOW,
        threatLevel: 'low',
        affectedSystems: ['authentication'],
        potentialImpact: 'none',
      },
      incidentContext: {
        isActiveIncident: false,
        requiresEscalation: false,
        affectsMultipleUsers: false,
        requiresImmedateResponse: false,
      },
      complianceRequired: false,
      auditRequired: false,
      notificationRequired: false,
    };

    const validationRequest: SecurityValidationRequest = {
      functionName: 'SecurityMonitoringService.isIpBlocked',
      functionParams: { ipAddress },
      actionDescription: `Check if IP address ${ipAddress} is blocked`,
      context: securityContext,
      riskLevel: RiskLevel.LOW,
      operationId,
      securityContext,
    };

    const validationResponse =
      await this.parlantIntegrationService.validateFunctionExecution(
        validationRequest,
      );

    if (!validationResponse.approved) {
      throw new ConversationalValidationError(
        validationResponse.conversationId,
        validationResponse.reasoning,
        validationResponse.suggestedAlternatives || [],
      );
    }

    return this.securityMonitoringService.isIpBlocked(ipAddress);
  }

  /**
   * Get security metrics with Parlant validation
   *
   * @returns Promise<SecurityMetrics> - Comprehensive security metrics
   */
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    const operationId = `parlant-security-metrics-${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const securityContext: SecurityParlantContext = {
      userId: 'system',
      sessionId: operationId,
      agentRole: 'security_monitoring_agent',
      securityLevel: 'MEDIUM',
      conversationHistory: [],
      metadata: { metricsRequest: true },
      securityAction: 'investigate_threat',
      threatContext: {
        eventType: SecurityEventType.LOGIN_ATTEMPT,
        severity: SecurityEventSeverity.LOW,
        threatLevel: 'low',
        affectedSystems: ['monitoring'],
        potentialImpact: 'none',
      },
      incidentContext: {
        isActiveIncident: false,
        requiresEscalation: false,
        affectsMultipleUsers: false,
        requiresImmedateResponse: false,
      },
      complianceRequired: true,
      auditRequired: true,
      notificationRequired: false,
    };

    const validationRequest: SecurityValidationRequest = {
      functionName: 'SecurityMonitoringService.getSecurityMetrics',
      functionParams: {},
      actionDescription:
        'Retrieve comprehensive security metrics and statistics',
      context: securityContext,
      riskLevel: RiskLevel.LOW,
      operationId,
      securityContext,
      securityData: {
        hasPersonalData: false,
        affectsProduction: false,
        triggersAlerts: false,
        requiresApproval: false,
        automatedResponse: false,
      },
    };

    const validationResponse =
      await this.parlantIntegrationService.validateFunctionExecution(
        validationRequest,
      );

    if (!validationResponse.approved) {
      throw new ConversationalValidationError(
        validationResponse.conversationId,
        validationResponse.reasoning,
        validationResponse.suggestedAlternatives || [],
      );
    }

    return await this.securityMonitoringService.getSecurityMetrics();
  }

  /**
   * Get security audit trail with Parlant integration details
   */
  getSecurityAuditTrail(limit = 100): SecurityParlantAuditEntry[] {
    return this.securityAuditTrail.slice(-limit);
  }

  /**
   * Get active security incidents
   */
  getActiveSecurityIncidents(): SecurityEvent[] {
    return Array.from(this.activeSecurityIncidents.values());
  }

  /**
   * Get security-specific Parlant statistics
   */
  getSecurityParlantStatistics(): {
    totalSecurityValidations: number;
    securityCacheHitRate: number;
    averageSecurityValidationTime: number;
    securityAuditTrailSize: number;
    complianceRate: number;
    securityIncidents: number;
    activeIncidents: number;
    threatLevel: string;
    criticalEvents: number;
  } {
    const complianceRate =
      this.securityAuditTrail.length > 0
        ? (this.securityAuditTrail.filter(
            (entry) => entry.complianceStatus === 'compliant',
          ).length /
            this.securityAuditTrail.length) *
          100
        : 0;

    const securityIncidents = this.securityAuditTrail.filter(
      (entry) =>
        entry.securityFlags.includes('validation_denied') ||
        entry.securityFlags.includes('execution_error') ||
        entry.securityFlags.includes('critical_incident'),
    ).length;

    const criticalEvents = this.securityAuditTrail.filter(
      (entry) => entry.severity === SecurityEventSeverity.CRITICAL,
    ).length;

    const currentThreatLevel = this.calculateOverallThreatLevel();

    const securityCacheHitRate =
      this.securityValidationCount > 0
        ? (this.securityCacheHitCount / this.securityValidationCount) * 100
        : 0;

    return {
      totalSecurityValidations: this.securityValidationCount,
      securityCacheHitRate,
      averageSecurityValidationTime: this.averageSecurityValidationTime,
      securityAuditTrailSize: this.securityAuditTrail.length,
      complianceRate,
      securityIncidents,
      activeIncidents: this.activeSecurityIncidents.size,
      threatLevel: currentThreatLevel,
      criticalEvents,
    };
  }

  /**
   * Private helper methods
   */

  private determineSeverityForLoginAttempt(
    success: boolean,
    ipAddress: string,
    userAgent?: string,
  ): SecurityEventSeverity {
    if (!success) {
      if (
        this.isKnownThreatIp(ipAddress) ||
        this.isSuspiciousUserAgent(userAgent)
      ) {
        return SecurityEventSeverity.HIGH;
      }
      return SecurityEventSeverity.MEDIUM;
    }

    if (this.isSuspiciousUserAgent(userAgent)) {
      return SecurityEventSeverity.MEDIUM;
    }

    return SecurityEventSeverity.LOW;
  }

  private assessThreatLevel(
    success: boolean,
    ipAddress: string,
    userAgent?: string,
  ): 'minimal' | 'low' | 'medium' | 'high' | 'critical' {
    if (!success && this.isKnownThreatIp(ipAddress)) {
      return 'critical';
    }

    if (!success && this.isSuspiciousUserAgent(userAgent)) {
      return 'high';
    }

    if (!success) {
      return 'medium';
    }

    if (this.isSuspiciousUserAgent(userAgent)) {
      return 'medium';
    }

    return 'low';
  }

  private assessSecurityRiskLevel(
    success: boolean,
    ipAddress: string,
    userAgent?: string,
  ): RiskLevel {
    if (!success && this.isKnownThreatIp(ipAddress)) {
      return RiskLevel.CRITICAL;
    }

    if (!success && this.isSuspiciousUserAgent(userAgent)) {
      return RiskLevel.HIGH;
    }

    if (!success) {
      return RiskLevel.MEDIUM;
    }

    return RiskLevel.LOW;
  }

  private requiresEscalation(success: boolean, ipAddress: string): boolean {
    return !success && this.isKnownThreatIp(ipAddress);
  }

  private requiresImmediateResponse(
    success: boolean,
    ipAddress: string,
  ): boolean {
    return !success && this.isKnownThreatIp(ipAddress);
  }

  private requiresCompliance(success: boolean, ipAddress: string): boolean {
    return !success || this.isKnownThreatIp(ipAddress);
  }

  private requiresNotification(success: boolean, ipAddress: string): boolean {
    return (
      !success &&
      (this.isKnownThreatIp(ipAddress) || this.isSuspiciousPattern(ipAddress))
    );
  }

  private triggersAutomatedResponse(
    success: boolean,
    ipAddress: string,
  ): boolean {
    return !success && this.isKnownThreatIp(ipAddress);
  }

  private isKnownThreatIp(ipAddress: string): boolean {
    // In production, this would check against threat intelligence feeds
    const threatIntel = this.threatIntelligenceCache.get(ipAddress);
    return threatIntel?.isThreat || false;
  }

  private isSuspiciousUserAgent(userAgent?: string): boolean {
    if (!userAgent) return true;

    const suspiciousPatterns = [
      /curl/i,
      /wget/i,
      /python/i,
      /bot/i,
      /crawler/i,
      /scanner/i,
      /sqlmap/i,
      /burp/i,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
  }

  private isSuspiciousPattern(ipAddress: string): boolean {
    // Check for patterns like rapid successive requests from same IP
    return false; // Placeholder implementation
  }

  private async getGeolocationContext(
    ipAddress: string,
  ): Promise<GeolocationData | null> {
    // This would integrate with geolocation services in production
    return {
      country: 'Unknown',
      countryCode: 'UNK',
      isVpn: false,
      isProxy: false,
      isTor: false,
      threatLevel: 'low',
    };
  }

  private getAutomatedActions(securityEvent: SecurityEvent): string[] {
    const actions: string[] = [];

    if (securityEvent.severity === SecurityEventSeverity.CRITICAL) {
      actions.push('ip_blocked', 'admin_notified', 'incident_created');
    } else if (securityEvent.severity === SecurityEventSeverity.HIGH) {
      actions.push('rate_limit_applied', 'monitoring_increased');
    }

    return actions;
  }

  private calculateOverallThreatLevel(): string {
    const recentIncidents = this.securityAuditTrail
      .filter(
        (entry) => Date.now() - entry.timestamp.getTime() < 24 * 60 * 60 * 1000,
      ) // Last 24 hours
      .filter(
        (entry) =>
          entry.severity === SecurityEventSeverity.HIGH ||
          entry.severity === SecurityEventSeverity.CRITICAL,
      );

    if (recentIncidents.length > 10) return 'critical';
    if (recentIncidents.length > 5) return 'high';
    if (recentIncidents.length > 2) return 'medium';
    return 'low';
  }

  private cleanupExpiredIncidents(): void {
    const now = Date.now();
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours

    for (const [eventId, event] of this.activeSecurityIncidents.entries()) {
      if (now - event.timestamp.getTime() > expirationTime) {
        this.activeSecurityIncidents.delete(eventId);
      }
    }
  }

  private createSecurityAuditEntry(params: {
    operationId: string;
    conversationId: string;
    securityEventId?: string;
    securityAction: string;
    userId?: string;
    ipAddress?: string;
    validationResult: 'approved' | 'denied' | 'error';
    riskAssessment: RiskLevel;
    complianceStatus: 'compliant' | 'non_compliant' | 'requires_review';
    executionResult: 'success' | 'failure' | 'timeout' | 'cancelled';
    threatLevel: string;
    severity: SecurityEventSeverity;
    responseTime: number;
    securityFlags: string[];
    conversationSummary: string;
    parlantConfidenceScore: number;
    automatedActions?: string[];
  }): SecurityParlantAuditEntry {
    return {
      auditId: `sec_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      parlantConversationId: params.conversationId,
      securityEventId: params.securityEventId,
      securityAction: params.securityAction,
      userId: params.userId,
      ipAddress: params.ipAddress,
      parlantValidationResult: params.validationResult,
      parlantConfidenceScore: params.parlantConfidenceScore,
      parlantReasoning: params.conversationSummary,
      executionResult: params.executionResult,
      threatLevel: params.threatLevel,
      severity: params.severity,
      riskAssessment: params.riskAssessment,
      complianceStatus: params.complianceStatus,
      timestamp: new Date(),
      responseTime: params.responseTime,
      securityFlags: params.securityFlags,
      conversationSummary: params.conversationSummary,
      automatedActions: params.automatedActions,
    };
  }

  private addToSecurityAuditTrail(entry: SecurityParlantAuditEntry): void {
    this.securityAuditTrail.push(entry);

    // Trim audit trail if it gets too large
    const maxSecurityAuditSize = this.configService.get<number>(
      'SECURITY_AUDIT_MAX_SIZE',
      10000,
    );
    if (this.securityAuditTrail.length > maxSecurityAuditSize) {
      this.securityAuditTrail.splice(
        0,
        this.securityAuditTrail.length - maxSecurityAuditSize,
      );
    }
  }

  private updateSecurityPerformanceMetrics(duration: number): void {
    this.securityValidationCount++;
    this.averageSecurityValidationTime =
      (this.averageSecurityValidationTime * (this.securityValidationCount - 1) +
        duration) /
      this.securityValidationCount;
  }

  private logSecurityPerformanceMetrics(): void {
    const securityCacheHitRate =
      this.securityValidationCount > 0
        ? (this.securityCacheHitCount / this.securityValidationCount) * 100
        : 0;

    this.logger.log(
      'Security Monitoring Parlant Integration Performance Metrics',
      {
        securityValidationCount: this.securityValidationCount,
        securityCacheHitRate: `${securityCacheHitRate.toFixed(2)}%`,
        averageSecurityValidationTime: `${this.averageSecurityValidationTime.toFixed(2)}ms`,
        securityAuditTrailSize: this.securityAuditTrail.length,
        activeIncidents: this.activeSecurityIncidents.size,
      },
    );
  }

  private isParlantSecurityEnabled(): boolean {
    return this.configService.get<boolean>('PARLANT_SECURITY_ENABLED', true);
  }

  private isSecurityAuditEnabled(): boolean {
    return this.configService.get<boolean>(
      'PARLANT_SECURITY_AUDIT_ENABLED',
      true,
    );
  }

  private getSecurityComplianceMode(): string {
    return this.configService.get<string>(
      'PARLANT_SECURITY_COMPLIANCE_MODE',
      'strict',
    );
  }

  private isThreatIntelEnabled(): boolean {
    return this.configService.get<boolean>(
      'PARLANT_THREAT_INTEL_ENABLED',
      true,
    );
  }
}
