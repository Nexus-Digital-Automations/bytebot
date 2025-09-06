/**
 * Enhanced Security Middleware - Real-time Threat Detection & Response
 * 
 * Advanced security middleware with comprehensive threat detection, real-time monitoring,
 * and automated incident response capabilities for Bytebot services.
 * 
 * Features:
 * - Real-time threat detection and pattern analysis
 * - Automated security response and blocking
 * - Comprehensive security event logging
 * - IP reputation and geo-location tracking  
 * - Advanced attack pattern recognition
 * - Security metrics collection and alerting
 * 
 * @author Enhanced Security Middleware Specialist
 * @version 2.0.0
 * @since Bytebot Security Enhancement Phase
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SecurityEvent,
  SecurityEventType,
  createSecurityEvent,
  SecurityErrorCode,
} from '../types/security.types';

/**
 * Threat severity levels
 */
export enum ThreatSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Security action types for automated response
 */
export enum SecurityAction {
  LOG_ONLY = 'log_only',
  RATE_LIMIT = 'rate_limit',
  TEMPORARY_BLOCK = 'temporary_block',
  PERMANENT_BLOCK = 'permanent_block',
  ALERT_SECURITY_TEAM = 'alert_security_team',
  EMERGENCY_LOCKDOWN = 'emergency_lockdown',
}

/**
 * Threat detection rule configuration
 */
interface ThreatDetectionRule {
  ruleId: string;
  name: string;
  description: string;
  pattern: RegExp | string;
  severity: ThreatSeverity;
  action: SecurityAction;
  enabled: boolean;
  metadata?: Record<string, any>;
}

/**
 * Security event with enhanced metadata
 */
interface EnhancedSecurityEvent extends SecurityEvent {
  threatSeverity: ThreatSeverity;
  geoLocation?: {
    country: string;
    region: string;
    city: string;
  };
  deviceFingerprint?: string;
  rulesTrigggered: string[];
  responseActions: SecurityAction[];
  correlationData?: {
    relatedEvents: string[];
    attackPatterns: string[];
    riskFactors: string[];
  };
}

/**
 * IP tracking and reputation data
 */
interface IPTrackingData {
  ip: string;
  firstSeen: Date;
  lastSeen: Date;
  requestCount: number;
  securityEvents: number;
  reputation: number; // -100 to 100
  blockedUntil?: Date;
  geoLocation?: {
    country: string;
    region: string;
    city: string;
  };
  userAgents: Set<string>;
  endpoints: Set<string>;
}

/**
 * Security metrics for monitoring
 */
interface SecurityMetrics {
  totalRequests: number;
  securityEvents: number;
  eventsBySeverity: Map<ThreatSeverity, number>;
  eventsByType: Map<SecurityEventType, number>;
  blockedRequests: number;
  uniqueIPs: number;
  suspiciousIPs: number;
  responseActionsTriggered: Map<SecurityAction, number>;
}

@Injectable()
export class EnhancedSecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(EnhancedSecurityMiddleware.name);

  /** Threat detection rules */
  private threatDetectionRules: ThreatDetectionRule[] = [];

  /** IP tracking data for reputation and behavior analysis */
  private ipTrackingData = new Map<string, IPTrackingData>();

  /** Recent security events for correlation analysis */
  private recentSecurityEvents: EnhancedSecurityEvent[] = [];

  /** Security metrics collection */
  private securityMetrics: SecurityMetrics = {
    totalRequests: 0,
    securityEvents: 0,
    eventsBySeverity: new Map(),
    eventsByType: new Map(),
    blockedRequests: 0,
    uniqueIPs: 0,
    suspiciousIPs: 0,
    responseActionsTriggered: new Map(),
  };

  /** Blocked IPs cache */
  private blockedIPs = new Map<string, { until: Date; reason: string }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeThreatDetectionRules();
    this.startCleanupTasks();
    
    this.logger.log('Enhanced Security Middleware initialized with threat detection');
  }

  /**
   * Main middleware handler with comprehensive security checks
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const operationId = `enhanced-security-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Set correlation ID
    (req as any).correlationId = operationId;
    (req as any).securityContext = {};

    // Update request metrics
    this.securityMetrics.totalRequests++;

    const clientIP = this.extractClientIP(req);
    const userAgent = req.get('User-Agent') || 'unknown';

    this.logger.debug(`[${operationId}] Processing security checks`, {
      operationId,
      method: req.method,
      url: req.url,
      ip: clientIP,
      userAgent: userAgent.substring(0, 100),
    });

    try {
      // 1. Check if IP is blocked
      if (this.isIPBlocked(clientIP)) {
        return this.handleBlockedRequest(req, res, clientIP, operationId);
      }

      // 2. Update IP tracking data
      this.updateIPTracking(clientIP, userAgent, req.url);

      // 3. Perform threat detection analysis
      const threatAnalysis = this.performThreatDetection(req, clientIP, operationId);

      // 4. Process security events if threats detected
      if (threatAnalysis.threatsDetected.length > 0) {
        const securityEvent = this.createEnhancedSecurityEvent(
          req,
          clientIP,
          userAgent,
          threatAnalysis,
          operationId
        );

        // Log security event
        this.logSecurityEvent(securityEvent);

        // Execute automated response
        const responseActions = this.executeAutomatedResponse(
          securityEvent,
          clientIP,
          operationId
        );

        // Block request if critical threat detected
        if (responseActions.includes(SecurityAction.TEMPORARY_BLOCK) || 
            responseActions.includes(SecurityAction.PERMANENT_BLOCK)) {
          return this.handleThreatResponse(req, res, securityEvent, operationId);
        }
      }

      // 5. Set security response headers
      this.setSecurityHeaders(res, operationId);

      const processingTime = Date.now() - startTime;
      
      this.logger.debug(`[${operationId}] Security checks completed`, {
        operationId,
        processingTimeMs: processingTime,
        threatsDetected: threatAnalysis.threatsDetected.length,
        ipReputation: this.getIPReputation(clientIP),
      });

      next();

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.logger.error(`[${operationId}] Security middleware error`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: processingTime,
      });

      // Log security event for middleware error
      const errorEvent = this.createSecurityEvent(
        req,
        clientIP,
        userAgent,
        SecurityEventType.SECURITY_CONFIG_CHANGED,
        false,
        `Security middleware error: ${error.message}`,
        operationId
      );
      
      this.logSecurityEvent(errorEvent);

      next(error);
    }
  }

  /**
   * Initialize threat detection rules
   */
  private initializeThreatDetectionRules(): void {
    this.threatDetectionRules = [
      {
        ruleId: 'sql-injection-detection',
        name: 'SQL Injection Attack Detection',
        description: 'Detects SQL injection attempts in URL parameters and request body',
        pattern: /(union\s+select|select\s+.*from|insert\s+into|delete\s+from|update\s+.*set|drop\s+table|exec\s*\(|script\s*:|<script|javascript:|vbscript:)/i,
        severity: ThreatSeverity.CRITICAL,
        action: SecurityAction.PERMANENT_BLOCK,
        enabled: true,
      },
      {
        ruleId: 'xss-attack-detection',
        name: 'Cross-Site Scripting Detection',
        description: 'Detects XSS attack attempts',
        pattern: /(<script[^>]*>.*?<\/script>|javascript:|vbscript:|onload=|onerror=|onclick=|onmouseover=)/i,
        severity: ThreatSeverity.HIGH,
        action: SecurityAction.TEMPORARY_BLOCK,
        enabled: true,
      },
      {
        ruleId: 'path-traversal-detection',
        name: 'Path Traversal Attack Detection',
        description: 'Detects directory traversal attempts',
        pattern: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\|\.\.%2f|\.\.%5c)/i,
        severity: ThreatSeverity.HIGH,
        action: SecurityAction.TEMPORARY_BLOCK,
        enabled: true,
      },
      {
        ruleId: 'command-injection-detection',
        name: 'Command Injection Detection',
        description: 'Detects command injection attempts',
        pattern: /(;|&&|\|\||`|\$\(|system\s*\(|exec\s*\(|eval\s*\(|passthru\s*\()/i,
        severity: ThreatSeverity.CRITICAL,
        action: SecurityAction.PERMANENT_BLOCK,
        enabled: true,
      },
      {
        ruleId: 'suspicious-user-agent',
        name: 'Suspicious User Agent Detection',
        description: 'Detects known malicious user agents',
        pattern: /(sqlmap|nmap|nikto|dirb|gobuster|masscan|zap|burpsuite|acunetix)/i,
        severity: ThreatSeverity.MEDIUM,
        action: SecurityAction.RATE_LIMIT,
        enabled: true,
      },
      {
        ruleId: 'high-request-rate',
        name: 'High Request Rate Detection',
        description: 'Detects unusually high request rates from single IP',
        pattern: '', // Handled by behavior analysis
        severity: ThreatSeverity.MEDIUM,
        action: SecurityAction.RATE_LIMIT,
        enabled: true,
      },
      {
        ruleId: 'sensitive-file-access',
        name: 'Sensitive File Access Attempt',
        description: 'Detects attempts to access sensitive files',
        pattern: /(\/etc\/passwd|\/etc\/shadow|web\.config|\.env|config\.php|wp-config\.php)/i,
        severity: ThreatSeverity.HIGH,
        action: SecurityAction.TEMPORARY_BLOCK,
        enabled: true,
      },
    ];

    this.logger.log(`Initialized ${this.threatDetectionRules.length} threat detection rules`);
  }

  /**
   * Extract client IP address with proxy support
   */
  private extractClientIP(req: Request): string {
    const xForwardedFor = req.headers['x-forwarded-for'];
    const xRealIP = req.headers['x-real-ip'];
    const cfConnectingIP = req.headers['cf-connecting-ip'];
    
    if (cfConnectingIP && typeof cfConnectingIP === 'string') {
      return cfConnectingIP.split(',')[0].trim();
    }
    
    if (xRealIP && typeof xRealIP === 'string') {
      return xRealIP;
    }
    
    if (xForwardedFor && typeof xForwardedFor === 'string') {
      return xForwardedFor.split(',')[0].trim();
    }
    
    return req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Check if IP is currently blocked
   */
  private isIPBlocked(ip: string): boolean {
    const blockInfo = this.blockedIPs.get(ip);
    if (!blockInfo) return false;

    if (new Date() > blockInfo.until) {
      this.blockedIPs.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Update IP tracking data for behavior analysis
   */
  private updateIPTracking(ip: string, userAgent: string, endpoint: string): void {
    const now = new Date();
    let ipData = this.ipTrackingData.get(ip);

    if (!ipData) {
      ipData = {
        ip,
        firstSeen: now,
        lastSeen: now,
        requestCount: 0,
        securityEvents: 0,
        reputation: 0,
        userAgents: new Set(),
        endpoints: new Set(),
      };
      this.ipTrackingData.set(ip, ipData);
      this.securityMetrics.uniqueIPs++;
    }

    ipData.lastSeen = now;
    ipData.requestCount++;
    ipData.userAgents.add(userAgent);
    ipData.endpoints.add(endpoint);

    // Update reputation based on behavior patterns
    this.updateIPReputation(ip, ipData);
  }

  /**
   * Update IP reputation based on behavior analysis
   */
  private updateIPReputation(ip: string, ipData: IPTrackingData): void {
    let reputationAdjustment = 0;

    // Penalize high request rates
    const timeSpan = (ipData.lastSeen.getTime() - ipData.firstSeen.getTime()) / 1000; // seconds
    if (timeSpan > 0) {
      const requestRate = ipData.requestCount / timeSpan;
      if (requestRate > 10) { // More than 10 requests per second
        reputationAdjustment -= 10;
      }
    }

    // Penalize multiple user agents (potential bot behavior)
    if (ipData.userAgents.size > 5) {
      reputationAdjustment -= 5;
    }

    // Penalize security events
    reputationAdjustment -= ipData.securityEvents * 10;

    // Apply reputation adjustment
    ipData.reputation = Math.max(-100, Math.min(100, ipData.reputation + reputationAdjustment));

    // Mark as suspicious if reputation is low
    if (ipData.reputation < -20 && !this.blockedIPs.has(ip)) {
      this.securityMetrics.suspiciousIPs++;
    }
  }

  /**
   * Get current IP reputation score
   */
  private getIPReputation(ip: string): number {
    const ipData = this.ipTrackingData.get(ip);
    return ipData?.reputation || 0;
  }

  /**
   * Perform comprehensive threat detection analysis
   */
  private performThreatDetection(req: Request, clientIP: string, operationId: string): {
    threatsDetected: ThreatDetectionRule[];
    riskScore: number;
    analysisData: Record<string, any>;
  } {
    const threatsDetected: ThreatDetectionRule[] = [];
    let riskScore = 0;
    const analysisData: Record<string, any> = {};

    // Get request data for analysis
    const requestData = {
      url: req.url,
      query: JSON.stringify(req.query),
      headers: JSON.stringify(req.headers),
      body: req.body ? JSON.stringify(req.body) : '',
      userAgent: req.get('User-Agent') || '',
    };

    // Check each threat detection rule
    for (const rule of this.threatDetectionRules) {
      if (!rule.enabled) continue;

      let isMatch = false;
      const ruleName = rule.ruleId;

      try {
        if (rule.pattern instanceof RegExp) {
          // Pattern-based detection
          isMatch = Object.values(requestData).some(data => 
            typeof data === 'string' && rule.pattern.test(data)
          );
        } else if (rule.ruleId === 'high-request-rate') {
          // Behavior-based detection for high request rates
          const ipData = this.ipTrackingData.get(clientIP);
          if (ipData) {
            const recentRequests = this.countRecentRequests(clientIP, 60); // Last minute
            isMatch = recentRequests > 100; // More than 100 requests per minute
            analysisData[ruleName] = { recentRequests };
          }
        }

        if (isMatch) {
          threatsDetected.push(rule);
          
          // Calculate risk score based on severity
          const severityScore = {
            [ThreatSeverity.LOW]: 10,
            [ThreatSeverity.MEDIUM]: 25,
            [ThreatSeverity.HIGH]: 50,
            [ThreatSeverity.CRITICAL]: 75,
          };
          
          riskScore += severityScore[rule.severity];
          analysisData[ruleName] = { matched: true, severity: rule.severity };

          this.logger.warn(`[${operationId}] Threat detected: ${rule.name}`, {
            operationId,
            ruleId: rule.ruleId,
            severity: rule.severity,
            clientIP,
            url: req.url,
          });
        }

      } catch (error) {
        this.logger.error(`[${operationId}] Error in threat detection rule: ${rule.ruleId}`, {
          operationId,
          ruleId: rule.ruleId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Cap risk score at 100
    riskScore = Math.min(100, riskScore);

    return { threatsDetected, riskScore, analysisData };
  }

  /**
   * Count recent requests from IP for rate limiting analysis
   */
  private countRecentRequests(ip: string, seconds: number): number {
    const cutoffTime = new Date(Date.now() - (seconds * 1000));
    return this.recentSecurityEvents.filter(event => 
      event.ipAddress === ip && event.timestamp > cutoffTime
    ).length;
  }

  /**
   * Create enhanced security event with threat analysis data
   */
  private createEnhancedSecurityEvent(
    req: Request,
    clientIP: string,
    userAgent: string,
    threatAnalysis: any,
    operationId: string
  ): EnhancedSecurityEvent {
    const baseEvent = this.createSecurityEvent(
      req,
      clientIP,
      userAgent,
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      false,
      `Threat detected: ${threatAnalysis.threatsDetected.map(t => t.name).join(', ')}`,
      operationId
    );

    const enhancedEvent: EnhancedSecurityEvent = {
      ...baseEvent,
      threatSeverity: this.calculateOverallThreatSeverity(threatAnalysis.threatsDetected),
      rulesTrigggered: threatAnalysis.threatsDetected.map(r => r.ruleId),
      responseActions: [],
      correlationData: {
        relatedEvents: this.findCorrelatedEvents(clientIP),
        attackPatterns: this.identifyAttackPatterns(threatAnalysis.threatsDetected),
        riskFactors: this.identifyRiskFactors(clientIP, threatAnalysis),
      },
    };

    return enhancedEvent;
  }

  /**
   * Calculate overall threat severity from multiple detections
   */
  private calculateOverallThreatSeverity(threats: ThreatDetectionRule[]): ThreatSeverity {
    if (threats.some(t => t.severity === ThreatSeverity.CRITICAL)) {
      return ThreatSeverity.CRITICAL;
    }
    if (threats.some(t => t.severity === ThreatSeverity.HIGH)) {
      return ThreatSeverity.HIGH;
    }
    if (threats.some(t => t.severity === ThreatSeverity.MEDIUM)) {
      return ThreatSeverity.MEDIUM;
    }
    return ThreatSeverity.LOW;
  }

  /**
   * Find correlated security events for the same IP
   */
  private findCorrelatedEvents(ip: string): string[] {
    const recentCutoff = new Date(Date.now() - (24 * 60 * 60 * 1000)); // Last 24 hours
    return this.recentSecurityEvents
      .filter(event => event.ipAddress === ip && event.timestamp > recentCutoff)
      .map(event => event.eventId)
      .slice(0, 10); // Limit to last 10 events
  }

  /**
   * Identify attack patterns from threat detections
   */
  private identifyAttackPatterns(threats: ThreatDetectionRule[]): string[] {
    const patterns = new Set<string>();
    
    threats.forEach(threat => {
      if (threat.ruleId.includes('sql-injection')) patterns.add('SQL_INJECTION_CAMPAIGN');
      if (threat.ruleId.includes('xss')) patterns.add('XSS_CAMPAIGN');
      if (threat.ruleId.includes('path-traversal')) patterns.add('DIRECTORY_TRAVERSAL');
      if (threat.ruleId.includes('command-injection')) patterns.add('COMMAND_INJECTION');
    });

    if (threats.length > 2) patterns.add('MULTI_VECTOR_ATTACK');
    
    return Array.from(patterns);
  }

  /**
   * Identify risk factors for enhanced analysis
   */
  private identifyRiskFactors(ip: string, threatAnalysis: any): string[] {
    const riskFactors: string[] = [];
    
    const ipData = this.ipTrackingData.get(ip);
    if (ipData) {
      if (ipData.reputation < -50) riskFactors.push('LOW_REPUTATION_IP');
      if (ipData.userAgents.size > 5) riskFactors.push('MULTIPLE_USER_AGENTS');
      if (ipData.requestCount > 1000) riskFactors.push('HIGH_REQUEST_VOLUME');
      if (ipData.securityEvents > 5) riskFactors.push('REPEAT_OFFENDER');
    }

    if (threatAnalysis.riskScore > 75) riskFactors.push('HIGH_RISK_SCORE');
    if (threatAnalysis.threatsDetected.length > 2) riskFactors.push('MULTIPLE_THREATS');

    return riskFactors;
  }

  /**
   * Create basic security event
   */
  private createSecurityEvent(
    req: Request,
    clientIP: string,
    userAgent: string,
    eventType: SecurityEventType,
    success: boolean,
    message: string,
    operationId: string
  ): EnhancedSecurityEvent {
    const event = createSecurityEvent(
      eventType,
      req.url,
      req.method,
      success,
      message,
      {
        operationId,
        correlationId: (req as any).correlationId,
        requestHeaders: this.sanitizeHeaders(req.headers),
        requestQuery: req.query,
        middleware: 'enhanced-security',
      },
      undefined, // userId not available at middleware level
      clientIP,
      userAgent
    ) as EnhancedSecurityEvent;

    // Add enhanced properties
    event.threatSeverity = ThreatSeverity.LOW;
    event.rulesTrigggered = [];
    event.responseActions = [];

    return event;
  }

  /**
   * Log security event and update metrics
   */
  private logSecurityEvent(event: EnhancedSecurityEvent): void {
    // Add to recent events for correlation
    this.recentSecurityEvents.push(event);
    
    // Keep only recent events (last 24 hours)
    const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000));
    this.recentSecurityEvents = this.recentSecurityEvents.filter(e => e.timestamp > cutoffTime);

    // Update metrics
    this.securityMetrics.securityEvents++;
    
    const severityCount = this.securityMetrics.eventsBySeverity.get(event.threatSeverity) || 0;
    this.securityMetrics.eventsBySeverity.set(event.threatSeverity, severityCount + 1);
    
    const typeCount = this.securityMetrics.eventsByType.get(event.type) || 0;
    this.securityMetrics.eventsByType.set(event.type, typeCount + 1);

    // Update IP tracking
    const ipData = this.ipTrackingData.get(event.ipAddress);
    if (ipData) {
      ipData.securityEvents++;
    }

    // Emit event for external processing
    this.eventEmitter.emit('security.threat.detected', event);

    // Log based on severity
    const logData = {
      eventId: event.eventId,
      threatSeverity: event.threatSeverity,
      rulesTrigggered: event.rulesTrigggered,
      riskScore: event.riskScore,
      ipAddress: event.ipAddress,
      endpoint: event.resource,
    };

    switch (event.threatSeverity) {
      case ThreatSeverity.CRITICAL:
        this.logger.error(`CRITICAL SECURITY THREAT: ${event.message}`, logData);
        break;
      case ThreatSeverity.HIGH:
        this.logger.error(`HIGH SECURITY THREAT: ${event.message}`, logData);
        break;
      case ThreatSeverity.MEDIUM:
        this.logger.warn(`MEDIUM SECURITY THREAT: ${event.message}`, logData);
        break;
      case ThreatSeverity.LOW:
      default:
        this.logger.log(`LOW SECURITY THREAT: ${event.message}`, logData);
        break;
    }
  }

  /**
   * Execute automated response based on threat analysis
   */
  private executeAutomatedResponse(
    event: EnhancedSecurityEvent,
    clientIP: string,
    operationId: string
  ): SecurityAction[] {
    const actions: SecurityAction[] = [];

    // Determine actions based on threat severity and rules triggered
    for (const ruleId of event.rulesTrigggered) {
      const rule = this.threatDetectionRules.find(r => r.ruleId === ruleId);
      if (rule && rule.enabled) {
        actions.push(rule.action);
      }
    }

    // Execute each action
    for (const action of actions) {
      this.executeSecurityAction(action, clientIP, event, operationId);
      
      // Update metrics
      const actionCount = this.securityMetrics.responseActionsTriggered.get(action) || 0;
      this.securityMetrics.responseActionsTriggered.set(action, actionCount + 1);
    }

    event.responseActions = actions;
    return actions;
  }

  /**
   * Execute individual security action
   */
  private executeSecurityAction(
    action: SecurityAction,
    clientIP: string,
    event: EnhancedSecurityEvent,
    operationId: string
  ): void {
    switch (action) {
      case SecurityAction.LOG_ONLY:
        // Already logged above
        break;

      case SecurityAction.RATE_LIMIT:
        this.applyRateLimit(clientIP, 5 * 60 * 1000); // 5 minutes
        this.logger.warn(`[${operationId}] Applied rate limiting to ${clientIP}`);
        break;

      case SecurityAction.TEMPORARY_BLOCK:
        this.blockIP(clientIP, 15 * 60 * 1000, 'Temporary block due to security threat'); // 15 minutes
        this.logger.error(`[${operationId}] Temporarily blocked IP: ${clientIP}`);
        break;

      case SecurityAction.PERMANENT_BLOCK:
        this.blockIP(clientIP, 24 * 60 * 60 * 1000, 'Permanent block due to critical security threat'); // 24 hours
        this.logger.error(`[${operationId}] Permanently blocked IP: ${clientIP}`);
        break;

      case SecurityAction.ALERT_SECURITY_TEAM:
        this.alertSecurityTeam(event, operationId);
        this.logger.error(`[${operationId}] Security team alerted for critical threat`);
        break;

      case SecurityAction.EMERGENCY_LOCKDOWN:
        this.triggerEmergencyLockdown(event, operationId);
        this.logger.fatal(`[${operationId}] EMERGENCY LOCKDOWN TRIGGERED`);
        break;

      default:
        this.logger.warn(`[${operationId}] Unknown security action: ${action}`);
    }
  }

  /**
   * Block IP address for specified duration
   */
  private blockIP(ip: string, durationMs: number, reason: string): void {
    const until = new Date(Date.now() + durationMs);
    this.blockedIPs.set(ip, { until, reason });
    this.securityMetrics.blockedRequests++;
  }

  /**
   * Apply rate limiting to IP
   */
  private applyRateLimit(ip: string, durationMs: number): void {
    // In a production environment, this would integrate with Redis or similar
    // For now, we'll use the blocking mechanism with shorter duration
    const until = new Date(Date.now() + durationMs);
    this.blockedIPs.set(ip, { until, reason: 'Rate limited' });
  }

  /**
   * Alert security team of critical threats
   */
  private alertSecurityTeam(event: EnhancedSecurityEvent, operationId: string): void {
    // Emit high-priority security alert event
    this.eventEmitter.emit('security.alert.critical', {
      event,
      operationId,
      alertType: 'SECURITY_TEAM_ALERT',
      priority: 'HIGH',
    });
  }

  /**
   * Trigger emergency lockdown procedures
   */
  private triggerEmergencyLockdown(event: EnhancedSecurityEvent, operationId: string): void {
    // Emit emergency lockdown event
    this.eventEmitter.emit('security.emergency.lockdown', {
      event,
      operationId,
      alertType: 'EMERGENCY_LOCKDOWN',
      priority: 'CRITICAL',
    });
  }

  /**
   * Handle blocked request responses
   */
  private handleBlockedRequest(
    req: Request,
    res: Response,
    clientIP: string,
    operationId: string
  ): void {
    const blockInfo = this.blockedIPs.get(clientIP);
    
    this.logger.warn(`[${operationId}] Blocked request from ${clientIP}`, {
      operationId,
      clientIP,
      reason: blockInfo?.reason,
      blockedUntil: blockInfo?.until,
      url: req.url,
      method: req.method,
    });

    res.status(403).json({
      error: 'Access Denied',
      code: SecurityErrorCode.ACCESS_DENIED,
      message: 'Your IP address has been blocked due to security concerns',
      timestamp: new Date().toISOString(),
      correlationId: operationId,
    });
  }

  /**
   * Handle threat response by blocking request
   */
  private handleThreatResponse(
    req: Request,
    res: Response,
    event: EnhancedSecurityEvent,
    operationId: string
  ): void {
    this.logger.error(`[${operationId}] Threat response - blocking request`, {
      operationId,
      eventId: event.eventId,
      threatSeverity: event.threatSeverity,
      clientIP: event.ipAddress,
      rulesTrigggered: event.rulesTrigggered,
    });

    res.status(403).json({
      error: 'Security Threat Detected',
      code: SecurityErrorCode.ACCESS_DENIED,
      message: 'Request blocked due to security threat detection',
      timestamp: new Date().toISOString(),
      correlationId: operationId,
      eventId: event.eventId,
    });
  }

  /**
   * Set security response headers
   */
  private setSecurityHeaders(res: Response, operationId: string): void {
    res.setHeader('X-Security-Check', 'PASSED');
    res.setHeader('X-Correlation-ID', operationId);
    res.setHeader('X-Security-Middleware', 'enhanced-security-v2.0');
  }

  /**
   * Sanitize headers for logging
   */
  private sanitizeHeaders(headers: any): Record<string, any> {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];

    const sanitized: Record<string, any> = {};
    Object.keys(headers).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (sensitiveHeaders.includes(lowerKey)) {
        sanitized[key] = '***';
      } else {
        sanitized[key] = headers[key];
      }
    });

    return sanitized;
  }

  /**
   * Start periodic cleanup tasks
   */
  private startCleanupTasks(): void {
    // Cleanup old data every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Cleanup old tracking data and events
   */
  private cleanupOldData(): void {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago

    // Cleanup old security events
    this.recentSecurityEvents = this.recentSecurityEvents.filter(
      event => event.timestamp > cutoffTime
    );

    // Cleanup expired IP blocks
    for (const [ip, blockInfo] of this.blockedIPs.entries()) {
      if (now > blockInfo.until) {
        this.blockedIPs.delete(ip);
      }
    }

    // Cleanup old IP tracking data (keep data for 7 days)
    const ipCutoffTime = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    for (const [ip, ipData] of this.ipTrackingData.entries()) {
      if (ipData.lastSeen < ipCutoffTime) {
        this.ipTrackingData.delete(ip);
      }
    }

    this.logger.debug('Security data cleanup completed', {
      recentEvents: this.recentSecurityEvents.length,
      blockedIPs: this.blockedIPs.size,
      trackedIPs: this.ipTrackingData.size,
    });
  }

  /**
   * Get current security metrics for monitoring
   */
  getSecurityMetrics(): SecurityMetrics & {
    eventsBySeverity: Record<string, number>;
    eventsByType: Record<string, number>;
    responseActionsTriggered: Record<string, number>;
  } {
    return {
      ...this.securityMetrics,
      eventsBySeverity: Object.fromEntries(this.securityMetrics.eventsBySeverity),
      eventsByType: Object.fromEntries(this.securityMetrics.eventsByType),
      responseActionsTriggered: Object.fromEntries(this.securityMetrics.responseActionsTriggered),
    };
  }

  /**
   * Get IP tracking data for analysis
   */
  getIPTrackingData(): Record<string, Omit<IPTrackingData, 'userAgents' | 'endpoints'> & {
    userAgents: string[];
    endpoints: string[];
  }> {
    const result: any = {};
    
    for (const [ip, data] of this.ipTrackingData.entries()) {
      result[ip] = {
        ...data,
        userAgents: Array.from(data.userAgents),
        endpoints: Array.from(data.endpoints),
      };
    }

    return result;
  }

  /**
   * Get recent security events for analysis
   */
  getRecentSecurityEvents(): EnhancedSecurityEvent[] {
    return [...this.recentSecurityEvents];
  }

  /**
   * Get blocked IPs list
   */
  getBlockedIPs(): Record<string, { until: string; reason: string }> {
    const result: any = {};
    
    for (const [ip, blockInfo] of this.blockedIPs.entries()) {
      result[ip] = {
        until: blockInfo.until.toISOString(),
        reason: blockInfo.reason,
      };
    }

    return result;
  }
}