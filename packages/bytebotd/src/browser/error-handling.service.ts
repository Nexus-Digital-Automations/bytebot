/**
 * Browser Automation Error Handling Service
 *
 * Provides comprehensive error handling, security monitoring, and incident
 * response for browser automation endpoints.
 *
 * Features:
 * - Structured error classification
 * - Security incident detection
 * - Error recovery strategies
 * - Comprehensive error logging
 * - Error metrics and analytics
 * - Automatic error reporting
 * - Security alert generation
 * - Error pattern analysis
 *
 * @author API Security Specialist
 * @version 1.0.0
 * @since Browser Automation Security Implementation
 */

import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ParlantIntegrationService, ParlantConversationContext, RiskLevel } from '../parlant/parlant-integration.service';

/*** Error categories for classification
 */
export enum BrowserErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  RATE_LIMITING = 'rate_limiting',
  SECURITY_VIOLATION = 'security_violation',
  BUSINESS_LOGIC = 'business_logic',
  TECHNICAL = 'technical',
  EXTERNAL_SERVICE = 'external_service',
  BROWSER_ENGINE = 'browser_engine',
  TIMEOUT = 'timeout',
  RESOURCE_EXHAUSTION = 'resource_exhaustion',
  CONFIGURATION = 'configuration',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Security incident types
 */
export enum SecurityIncidentType {
  BRUTE_FORCE_ATTACK = 'brute_force_attack',
  INJECTION_ATTEMPT = 'injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  DATA_EXFILTRATION = 'data_exfiltration',
  SUSPICIOUS_BEHAVIOR = 'suspicious_behavior',
  MALICIOUS_PAYLOAD = 'malicious_payload',
  RATE_LIMIT_ABUSE = 'rate_limit_abuse',
  SESSION_HIJACKING = 'session_hijacking',
}

/**
 * Error context for comprehensive tracking
 */
interface BrowserErrorContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  method: string;
  timestamp: Date;
  stackTrace?: string;
  requestData?: unknown;
  responseData?: unknown;
  securityLevel?: string;
  riskLevel?: string;
}

/**
 * Structured error information
 */
interface BrowserErrorInfo {
  id: string;
  category: BrowserErrorCategory;
  severity: ErrorSeverity;
  code: string;
  message: string;
  userMessage: string;
  details: Record<string, unknown>;
  context: BrowserErrorContext;
  securityIncident?: SecurityIncident;
  recoveryAction?: string;
  preventionStrategy?: string;
}

/**
 * Security incident information
 */
interface SecurityIncident {
  id: string;
  type: SecurityIncidentType;
  severity: ErrorSeverity;
  description: string;
  indicators: string[];
  attackVector?: string;
  potentialImpact: string;
  recommendedActions: string[];
  automaticResponse: boolean;
  escalated: boolean;
}

/**
 * Error metrics for monitoring
 */
interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<BrowserErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  securityIncidents: number;
  averageErrorRate: number;
  topErrorCodes: Array<{ code: string; count: number }>;
  errorTrends: Array<{ timestamp: Date; count: number }>;
}

/**
 * Error recovery strategy
 */
interface ErrorRecoveryStrategy {
  automatic: boolean;
  retryable: boolean;
  maxRetries?: number;
  backoffStrategy?: 'linear' | 'exponential' | 'fixed';
  fallbackAction?: string;
  userNotification: boolean;
  escalationRequired: boolean;
}

/**
 * Browser Automation Error Handling Service
 */
@Injectable()
export class BrowserErrorHandlingService {
  private readonly logger = new Logger(BrowserErrorHandlingService.name);
  private readonly errorHistory: BrowserErrorInfo[] = [];
  private readonly securityIncidents: SecurityIncident[] = [];

  // Error metrics tracking
  private totalErrors = 0;
  private readonly errorCountsByCategory = new Map<BrowserErrorCategory, number>();
  private readonly errorCountsBySeverity = new Map<ErrorSeverity, number>();
  private readonly errorPatterns = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService,
    private readonly parlantService: ParlantIntegrationService,
  ) {
    // Initialize error tracking
    Object.values(BrowserErrorCategory).forEach(category => {
      this.errorCountsByCategory.set(category, 0);
    });
    Object.values(ErrorSeverity).forEach(severity => {
      this.errorCountsBySeverity.set(severity, 0);
    });

    // Setup cleanup intervals
    setInterval(() => this.cleanupOldErrors(), 3600000); // Every hour
    setInterval(() => this.analyzeErrorPatterns(), 600000); // Every 10 minutes

    this.logger.log('Browser Error Handling Service initialized', {errorHistorySize: this.errorHistory.length,securityIncidentsCount: this.securityIncidents.length,
      cleanupInterval: '1 hour',analysisInterval: '10 minutes',
    });
  }

  /**
   * Handle and process browser automation error
   */
  async handleError(
    error: Error | HttpException,
    context: BrowserErrorContext,
  ): Promise<BrowserErrorInfo> {
    const operationId = `error_handle_${Date.now()}_${Math.random().toString(36).substring(7)}`;const startTime = Date.now();this.logger.debug(`[${operationId}] Processing browser automation error`, {operationId,errorType: error.constructor.name,
      message: error.message,
      requestId: context.requestId,
      userId: context.userId,
      endpoint: context.endpoint,
    });

    try {
      this.totalErrors++;

      // Classify error
      const errorInfo = await this.classifyError(error, context);

      // Check for security incidents
      await this.detectSecurityIncident(errorInfo);

      // Determine recovery strategy
      const recoveryStrategy = this.determineRecoveryStrategy(errorInfo);

      // Update error metrics
      this.updateErrorMetrics(errorInfo);

      // Store error history
      this.errorHistory.push(errorInfo);

      // Log comprehensive error information
      await this.logError(errorInfo, recoveryStrategy);

      // Send security alerts if needed
      if (errorInfo.securityIncident) {
        await this.sendSecurityAlert(errorInfo.securityIncident, context);
      }

      // Apply automatic recovery if possible
      if (recoveryStrategy.automatic) {
        await this.applyAutomaticRecovery(errorInfo, recoveryStrategy);
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`[${operationId}] Error processing completed`, {operationId,errorId: errorInfo.id,
        category: errorInfo.category,
        severity: errorInfo.severity,
        securityIncident: !!errorInfo.securityIncident,
        duration,
      });

      return errorInfo;

    } catch (processingError) {
      const duration = Date.now() - startTime;

      this.logger.error(`[${operationId}] Error processing failed`, {operationId,originalError: error.message,
        processingError: processingError instanceof Error ? processingError.message : String(processingError),
        duration,
      });

      // Return minimal error info if processing fails
      return {
        id: `error_${Date.now()}`,
        category: BrowserErrorCategory.TECHNICAL,
        severity: ErrorSeverity.HIGH,
        code: 'ERROR_PROCESSING_FAILED',message: 'Failed to process error information',userMessage: 'An unexpected error occurred',
        details: { originalError: error.message },
        context,
      };
    }
  }

  /**
   * Report security incident
   */
  async reportSecurityIncident(
    type: SecurityIncidentType,
    description: string,
    context: BrowserErrorContext,
    indicators: string[] = [],
  ): Promise<SecurityIncident> {
    const incident: SecurityIncident = {
      id: `incident_${Date.now()}_${Math.random().toString(36).substring(7)}`,type,severity: this.getIncidentSeverity(type),
      description,
      indicators,
      attackVector: this.determineAttackVector(type, context),
      potentialImpact: this.assessPotentialImpact(type),
      recommendedActions: this.getRecommendedActions(type),
      automaticResponse: this.shouldAutoRespond(type),
      escalated: false,
    };

    this.securityIncidents.push(incident);

    this.logger.warn(`Security incident reported`, {incidentId: incident.id,type: incident.type,
      severity: incident.severity,
      description: incident.description,
      userId: context.userId,
      ipAddress: context.ipAddress,
      endpoint: context.endpoint,
    });

    // Apply automatic response if configured
    if (incident.automaticResponse) {
      await this.executeAutomaticIncidentResponse(incident, context);
    }

    // Send security alerts
    await this.sendSecurityAlert(incident, context);

    return incident;
  }

  /**
   * Get error metrics and statistics
   */
  getErrorMetrics(): ErrorMetrics {
    const errorsByCategory = {} as Record<BrowserErrorCategory, number>;
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;

    // Convert maps to objects
    Object.values(BrowserErrorCategory).forEach(category => {
      errorsByCategory[category] = this.errorCountsByCategory.get(category) || 0;
    });

    Object.values(ErrorSeverity).forEach(severity => {
      errorsBySeverity[severity] = this.errorCountsBySeverity.get(severity) || 0;
    });

    // Calculate top error codes
    const topErrorCodes = Array.from(this.errorPatterns.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate error trends (simplified)
    const errorTrends = this.calculateErrorTrends();

    return {
      totalErrors: this.totalErrors,
      errorsByCategory,
      errorsBySeverity,
      securityIncidents: this.securityIncidents.length,
      averageErrorRate: this.calculateAverageErrorRate(),
      topErrorCodes,
      errorTrends,
    };
  }

  /**
   * Search error history
   */
  searchErrors(query: {
    category?: BrowserErrorCategory;
    severity?: ErrorSeverity;
    userId?: string;
    ipAddress?: string;
    timeRange?: { start: Date; end: Date };
  }): BrowserErrorInfo[] {
    return this.errorHistory.filter(error => {
      if (query.category && error.category !== query.category) return false;
      if (query.severity && error.severity !== query.severity) return false;
      if (query.userId && error.context.userId !== query.userId) return false;
      if (query.ipAddress && error.context.ipAddress !== query.ipAddress) return false;
      if (query.timeRange) {
        const errorTime = error.context.timestamp;
        if (errorTime < query.timeRange.start || errorTime > query.timeRange.end) return false;
      }
      return true;
    });
  }

  /**
   * Get security incidents
   */
  getSecurityIncidents(filter?: {
    type?: SecurityIncidentType;
    severity?: ErrorSeverity;
    timeRange?: { start: Date; end: Date };
  }): SecurityIncident[] {
    if (!filter) return [...this.securityIncidents];

    return this.securityIncidents.filter(incident => {
      if (filter.type && incident.type !== filter.type) return false;
      if (filter.severity && incident.severity !== filter.severity) return false;
      // Note: timeRange filtering would require adding timestamp to SecurityIncident
      return true;
    });
  }

  // ===== PRIVATE METHODS =====

  private async classifyError(
    error: Error | HttpException,
    context: BrowserErrorContext,
  ): Promise<BrowserErrorInfo> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    let category = BrowserErrorCategory.TECHNICAL;
    let severity = ErrorSeverity.MEDIUM;
    let code = 'UNKNOWN_ERROR';let userMessage = 'An unexpected error occurred';const details: Record<string, unknown> = {};// Classify by error type and message
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const response = error.getResponse();

      switch (status) {
        case HttpStatus.UNAUTHORIZED:
          category = BrowserErrorCategory.AUTHENTICATION;
          severity = ErrorSeverity.HIGH;
          code = 'AUTHENTICATION_FAILED';userMessage = 'Authentication failed';break;case HttpStatus.FORBIDDEN:
          category = BrowserErrorCategory.AUTHORIZATION;
          severity = ErrorSeverity.HIGH;
          code = 'AUTHORIZATION_FAILED';userMessage = 'Access denied';break;case HttpStatus.BAD_REQUEST:
          category = BrowserErrorCategory.VALIDATION;
          severity = ErrorSeverity.MEDIUM;
          code = 'VALIDATION_FAILED';userMessage = 'Invalid request data';break;case HttpStatus.TOO_MANY_REQUESTS:
          category = BrowserErrorCategory.RATE_LIMITING;
          severity = ErrorSeverity.MEDIUM;
          code = 'RATE_LIMIT_EXCEEDED';userMessage = 'Too many requests';break;case HttpStatus.REQUEST_TIMEOUT:
          category = BrowserErrorCategory.TIMEOUT;
          severity = ErrorSeverity.MEDIUM;
          code = 'REQUEST_TIMEOUT';userMessage = 'Request timeout';break;case HttpStatus.INTERNAL_SERVER_ERROR:
          category = BrowserErrorCategory.TECHNICAL;
          severity = ErrorSeverity.HIGH;
          code = 'INTERNAL_SERVER_ERROR';userMessage = 'Internal server error';break;}

      details.httpStatus = status;
      details.httpResponse = response;
    }

    // Check error message for specific patterns
    const message = error.message.toLowerCase();

    if (message.includes('browser') || message.includes('selenium') || message.includes('chromium')) {category = BrowserErrorCategory.BROWSER_ENGINE;code = 'BROWSER_ENGINE_ERROR';} else if (message.includes('timeout')) {category = BrowserErrorCategory.TIMEOUT;code = 'OPERATION_TIMEOUT';} else if (message.includes('memory') || message.includes('resource')) {category = BrowserErrorCategory.RESOURCE_EXHAUSTION;severity = ErrorSeverity.HIGH;
      code = 'RESOURCE_EXHAUSTED';} else if (message.includes('permission') || message.includes('unauthorized')) {category = BrowserErrorCategory.AUTHORIZATION;severity = ErrorSeverity.HIGH;
      code = 'PERMISSION_DENIED';} else if (message.includes('validation') || message.includes('invalid')) {category = BrowserErrorCategory.VALIDATION;code = 'VALIDATION_ERROR';}// Check for security-related errors
    if (this.isSecurityRelatedError(error, context)) {
      category = BrowserErrorCategory.SECURITY_VIOLATION;
      severity = ErrorSeverity.CRITICAL;
      code = 'SECURITY_VIOLATION';userMessage = 'Security policy violation';}return {
      id: errorId,
      category,
      severity,
      code,
      message: error.message,
      userMessage,
      details: {
        ...details,
        errorType: error.constructor.name,
        stackTrace: error.stack,
      },
      context,
    };
  }

  private async detectSecurityIncident(errorInfo: BrowserErrorInfo): Promise<void> {
    const indicators: string[] = [];
    let incidentType: SecurityIncidentType | null = null;

    // Analyze error patterns for security incidents
    if (errorInfo.category === BrowserErrorCategory.SECURITY_VIOLATION) {
      incidentType = SecurityIncidentType.SUSPICIOUS_BEHAVIOR;
      indicators.push('security_policy_violation');
    }

    if (errorInfo.category === BrowserErrorCategory.AUTHENTICATION) {
      // Check for brute force patterns
      const recentAuthErrors = this.errorHistory
        .filter(e => e.category === BrowserErrorCategory.AUTHENTICATION &&
                    e.context.ipAddress === errorInfo.context.ipAddress &&
                    Date.now() - e.context.timestamp.getTime() < 300000) // Last 5 minutes
        .length;

      if (recentAuthErrors >= 5) {
        incidentType = SecurityIncidentType.BRUTE_FORCE_ATTACK;
        indicators.push(`${recentAuthErrors}_auth_failures_in_5_minutes`);
      }
    }

    if (errorInfo.category === BrowserErrorCategory.VALIDATION) {
      // Check for injection attempts
      const errorMessage = errorInfo.message.toLowerCase();
      const payload = JSON.stringify(errorInfo.context.requestData || {}).toLowerCase();

      const injectionPatterns = [
        'script', 'javascript:', 'vbscript:', 'onload', 'onerror','union select', 'drop table', 'insert into', '--', '/*','../', '..\\', '/etc/passwd', 'cmd.exe', 'powershell'];const foundPatterns = injectionPatterns.filter(pattern =>
        errorMessage.includes(pattern) || payload.includes(pattern)
      );

      if (foundPatterns.length > 0) {
        if (foundPatterns.some(p => ['script', 'javascript:', 'onload'].includes(p))) {incidentType = SecurityIncidentType.XSS_ATTEMPT;} else if (foundPatterns.some(p => ['union select', 'drop table'].includes(p))) {
          incidentType = SecurityIncidentType.INJECTION_ATTEMPT;
        } else {
          incidentType = SecurityIncidentType.MALICIOUS_PAYLOAD;
        }
        indicators.push(...foundPatterns.map(p => `injection_pattern_${p}`));}}

    if (errorInfo.category === BrowserErrorCategory.RATE_LIMITING) {
      // Check for rate limit abuse
      const recentRateLimitErrors = this.errorHistory
        .filter(e => e.category === BrowserErrorCategory.RATE_LIMITING &&
                    e.context.ipAddress === errorInfo.context.ipAddress &&
                    Date.now() - e.context.timestamp.getTime() < 600000) // Last 10 minutes
        .length;

      if (recentRateLimitErrors >= 3) {
        incidentType = SecurityIncidentType.RATE_LIMIT_ABUSE;
        indicators.push(`${recentRateLimitErrors}_rate_limit_violations_in_10_minutes`);}}

    // Create security incident if detected
    if (incidentType) {
      const incident = await this.reportSecurityIncident(
        incidentType,
        `Security incident detected from error: ${errorInfo.message}`,
        errorInfo.context,
        indicators,
      );

      errorInfo.securityIncident = incident;
    }
  }

  private isSecurityRelatedError(error: Error | HttpException, context: BrowserErrorContext): boolean {
    const message = error.message.toLowerCase();
    const securityKeywords = [
      'security', 'violation', 'unauthorized', 'forbidden','injection', 'xss', 'script', 'malicious', 'attack','suspicious', 'threat', 'breach', 'compromise'];return securityKeywords.some(keyword => message.includes(keyword));
  }

  private determineRecoveryStrategy(errorInfo: BrowserErrorInfo): ErrorRecoveryStrategy {
    const strategy: ErrorRecoveryStrategy = {
      automatic: false,
      retryable: false,
      userNotification: true,
      escalationRequired: false,
    };

    // Configure strategy based on error category and severity
    switch (errorInfo.category) {
      case BrowserErrorCategory.TIMEOUT:
        strategy.automatic = true;
        strategy.retryable = true;
        strategy.maxRetries = 3;
        strategy.backoffStrategy = 'exponential';break;case BrowserErrorCategory.RATE_LIMITING:
        strategy.retryable = true;
        strategy.maxRetries = 1;
        strategy.backoffStrategy = 'fixed';strategy.userNotification = false;break;

      case BrowserErrorCategory.BROWSER_ENGINE:
        strategy.automatic = true;
        strategy.retryable = true;
        strategy.maxRetries = 2;
        strategy.fallbackAction = 'restart_browser_session';break;case BrowserErrorCategory.SECURITY_VIOLATION:
        strategy.escalationRequired = true;
        strategy.userNotification = false;
        break;

      case BrowserErrorCategory.RESOURCE_EXHAUSTION:
        strategy.escalationRequired = true;
        strategy.fallbackAction = 'reduce_resource_usage';break;}

    // Adjust based on severity
    if (errorInfo.severity === ErrorSeverity.CRITICAL) {
      strategy.escalationRequired = true;
      strategy.automatic = false;
    }

    return strategy;
  }

  private updateErrorMetrics(errorInfo: BrowserErrorInfo): void {
    // Update category counts
    const currentCategoryCount = this.errorCountsByCategory.get(errorInfo.category) || 0;
    this.errorCountsByCategory.set(errorInfo.category, currentCategoryCount + 1);

    // Update severity counts
    const currentSeverityCount = this.errorCountsBySeverity.get(errorInfo.severity) || 0;
    this.errorCountsBySeverity.set(errorInfo.severity, currentSeverityCount + 1);

    // Update error pattern counts
    const currentPatternCount = this.errorPatterns.get(errorInfo.code) || 0;
    this.errorPatterns.set(errorInfo.code, currentPatternCount + 1);
  }

  private async logError(errorInfo: BrowserErrorInfo, recoveryStrategy: ErrorRecoveryStrategy): Promise<void> {
    const logLevel = this.getLogLevel(errorInfo.severity);
    const logData = {
      errorId: errorInfo.id,
      category: errorInfo.category,
      severity: errorInfo.severity,
      code: errorInfo.code,
      message: errorInfo.message,
      userId: errorInfo.context.userId,
      sessionId: errorInfo.context.sessionId,
      ipAddress: errorInfo.context.ipAddress,
      endpoint: errorInfo.context.endpoint,
      method: errorInfo.context.method,
      requestId: errorInfo.context.requestId,
      securityIncident: !!errorInfo.securityIncident,
      incidentType: errorInfo.securityIncident?.type,
      recoveryStrategy: {
        automatic: recoveryStrategy.automatic,
        retryable: recoveryStrategy.retryable,
        escalationRequired: recoveryStrategy.escalationRequired,
      },
      details: errorInfo.details,
    };

    switch (logLevel) {
      case 'error':
        this.logger.error(`Browser Automation Error: ${errorInfo.message}`, logData);
        break;
      case 'warn':
        this.logger.warn(`Browser Automation Warning: ${errorInfo.message}`, logData);break;default:
        this.logger.log(`Browser Automation Error: ${errorInfo.message}`, logData);
        break;
    }
  }

  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'log' {switch (severity) {case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';case ErrorSeverity.MEDIUM:return 'warn';default:return 'log';
    }
  }

  private async sendSecurityAlert(incident: SecurityIncident, context: BrowserErrorContext): Promise<void> {
    this.logger.warn(`🚨 SECURITY ALERT: ${incident.type}`, {incidentId: incident.id,type: incident.type,
      severity: incident.severity,
      description: incident.description,
      indicators: incident.indicators,
      userId: context.userId,
      ipAddress: context.ipAddress,
      endpoint: context.endpoint,
      recommendedActions: incident.recommendedActions,
    });

    // In production, this would integrate with alerting systems
    // Examples: Slack, PagerDuty, email notifications, SIEM systems
  }

  private async applyAutomaticRecovery(errorInfo: BrowserErrorInfo, strategy: ErrorRecoveryStrategy): Promise<void> {
    this.logger.log(`Applying automatic recovery for error ${errorInfo.id}`, {errorId: errorInfo.id,strategy: strategy.fallbackAction,
      retryable: strategy.retryable,
      maxRetries: strategy.maxRetries,
    });

    // Implementation would include actual recovery actions
    // Examples: retry requests, restart services, clear caches, etc.
  }

  private async executeAutomaticIncidentResponse(incident: SecurityIncident, context: BrowserErrorContext): Promise<void> {
    this.logger.warn(`Executing automatic incident response for ${incident.id}`, {
      incidentId: incident.id,
      type: incident.type,
      actions: incident.recommendedActions,
    });

    // Implementation would include automatic responses
    // Examples: block IP, disable user, rate limit, notify admins
  }

  private getIncidentSeverity(type: SecurityIncidentType): ErrorSeverity {
    switch (type) {
      case SecurityIncidentType.BRUTE_FORCE_ATTACK:
      case SecurityIncidentType.INJECTION_ATTEMPT:
      case SecurityIncidentType.PRIVILEGE_ESCALATION:
      case SecurityIncidentType.DATA_EXFILTRATION:
        return ErrorSeverity.CRITICAL;

      case SecurityIncidentType.XSS_ATTEMPT:
      case SecurityIncidentType.UNAUTHORIZED_ACCESS:
      case SecurityIncidentType.SESSION_HIJACKING:
        return ErrorSeverity.HIGH;

      case SecurityIncidentType.SUSPICIOUS_BEHAVIOR:
      case SecurityIncidentType.MALICIOUS_PAYLOAD:
      case SecurityIncidentType.RATE_LIMIT_ABUSE:
        return ErrorSeverity.MEDIUM;

      default:
        return ErrorSeverity.LOW;
    }
  }

  private determineAttackVector(type: SecurityIncidentType, context: BrowserErrorContext): string {
    switch (type) {
      case SecurityIncidentType.BRUTE_FORCE_ATTACK:
        return 'Authentication endpoint';case SecurityIncidentType.INJECTION_ATTEMPT:return 'Input validation bypass';case SecurityIncidentType.XSS_ATTEMPT:return 'Client-side injection';case SecurityIncidentType.RATE_LIMIT_ABUSE:return 'API endpoint flooding';default:return 'Unknown';}}

  private assessPotentialImpact(type: SecurityIncidentType): string {
    switch (type) {
      case SecurityIncidentType.BRUTE_FORCE_ATTACK:
        return 'Account compromise, unauthorized access';case SecurityIncidentType.INJECTION_ATTEMPT:return 'Data breach, system compromise';case SecurityIncidentType.XSS_ATTEMPT:return 'Session hijacking, data theft';case SecurityIncidentType.PRIVILEGE_ESCALATION:return 'Administrative access, system control';case SecurityIncidentType.DATA_EXFILTRATION:return 'Sensitive data theft, privacy violation';default:return 'Service disruption, security policy violation';}}

  private getRecommendedActions(type: SecurityIncidentType): string[] {
    switch (type) {
      case SecurityIncidentType.BRUTE_FORCE_ATTACK:
        return ['Block IP address', 'Implement account lockout', 'Require MFA', 'Review logs'];case SecurityIncidentType.INJECTION_ATTEMPT:return ['Block malicious requests', 'Review input validation', 'Audit database access', 'Update WAF rules'];case SecurityIncidentType.XSS_ATTEMPT:return ['Sanitize input', 'Review CSP headers', 'Update XSS protection', 'Audit client-side code'];case SecurityIncidentType.RATE_LIMIT_ABUSE:return ['Implement stricter rate limits', 'Block abusive IPs', 'Review API usage patterns'];default:return ['Monitor closely', 'Review security policies', 'Consider additional protections'];}}

  private shouldAutoRespond(type: SecurityIncidentType): boolean {
    return [
      SecurityIncidentType.BRUTE_FORCE_ATTACK,
      SecurityIncidentType.RATE_LIMIT_ABUSE,
      SecurityIncidentType.INJECTION_ATTEMPT,
    ].includes(type);
  }

  private calculateAverageErrorRate(): number {
    const uptimeMinutes = Math.max(1, process.uptime() / 60);
    return Math.round(this.totalErrors / uptimeMinutes * 100) / 100;
  }

  private calculateErrorTrends(): Array<{ timestamp: Date; count: number }> {
    // Simplified trend calculation - in production, use time-series data
    const now = new Date();
    const trends = [];

    for (let i = 11; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 3600000); // Last 12 hours
      const count = this.errorHistory.filter(error =>
        error.context.timestamp >= timestamp && error.context.timestamp < new Date(timestamp.getTime() + 3600000)
      ).length;

      trends.push({ timestamp, count });
    }

    return trends;
  }

  private analyzeErrorPatterns(): void {
    // Analyze error patterns for anomalies
    const recentErrors = this.errorHistory.filter(error =>
      Date.now() - error.context.timestamp.getTime() < 3600000 // Last hour
    );

    if (recentErrors.length > 100) {
      this.logger.warn('High error rate detected', {errorsInLastHour: recentErrors.length,totalErrors: this.totalErrors,
      });
    }

    // Check for suspicious patterns
    const ipErrorCounts = new Map<string, number>();
    recentErrors.forEach(error => {
      const ip = error.context.ipAddress;
      ipErrorCounts.set(ip, (ipErrorCounts.get(ip) || 0) + 1);
    });

    ipErrorCounts.forEach((count, ip) => {
      if (count > 20) {
        this.logger.warn('Suspicious error pattern detected', {ipAddress: ip,errorCount: count,
          timeWindow: '1 hour',
        });
      }
    });
  }

  private cleanupOldErrors(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoffTime = Date.now() - maxAge;

    const initialCount = this.errorHistory.length;
    const indicesToRemove = [];

    for (let i = 0; i < this.errorHistory.length; i++) {
      if (this.errorHistory[i].context.timestamp.getTime() < cutoffTime) {
        indicesToRemove.push(i);
      }
    }

    // Remove old errors in reverse order to maintain indices
    for (let i = indicesToRemove.length - 1; i >= 0; i--) {
      this.errorHistory.splice(indicesToRemove[i], 1);
    }

    // Cleanup old security incidents
    const incidentCutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    const incidentsToRemove = [];

    for (let i = 0; i < this.securityIncidents.length; i++) {
      // Note: would need timestamp on SecurityIncident to implement this properly
    }

    if (initialCount > this.errorHistory.length) {
      this.logger.debug(`Cleaned up ${initialCount - this.errorHistory.length} old error records`, {
        remainingErrors: this.errorHistory.length,
        remainingIncidents: this.securityIncidents.length,
      });
    }
  }
}