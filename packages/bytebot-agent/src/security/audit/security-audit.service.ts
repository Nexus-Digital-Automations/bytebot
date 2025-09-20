/**
 * Security Audit Service - Comprehensive security event logging and audit trail management
 * Implements enterprise-grade audit logging for all security events across Bytebot services
 *
 * Features:
 * - Real-time security event tracking and logging
 * - Comprehensive audit trail management with retention policies
 * - Security metrics collection and analysis
 * - Compliance reporting and alerting systems
 * - Structured logging with correlation IDs and context
 * - Performance-optimized event processing with batching
 *
 * @author Audit Logging and Monitoring Specialist
 * @version 2.0.0
 * @since Phase 2: Enterprise Security Implementation
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { MetricsService } from '../../metrics/metrics.service';
import * as crypto from 'crypto';
import { performance } from 'perf_hooks';

/**
 * Base event interface for type safety
 */
interface BaseSecurityEvent {
  type?: string;
  name?: string;
  userId?: string;
  username?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  endpoint?: string;
  method?: string;
  [key: string]: unknown;
}

/**
 * Security event types for comprehensive tracking
 */
export enum SecurityEventType {
  // Authentication events
  AUTH_SUCCESS = 'auth.success',
  AUTH_FAILURE = 'auth.failure',
  AUTH_LOCKOUT = 'auth.lockout',
  AUTH_PASSWORD_CHANGE = 'auth.password_change',
  AUTH_MFA_ENABLED = 'auth.mfa_enabled',
  AUTH_MFA_DISABLED = 'auth.mfa_disabled',

  // Authorization events
  AUTHZ_GRANTED = 'authz.granted',
  AUTHZ_DENIED = 'authz.denied',
  AUTHZ_PRIVILEGE_ESCALATION = 'authz.privilege_escalation',
  AUTHZ_ROLE_CHANGE = 'authz.role_change',

  // Session events
  SESSION_CREATED = 'session.created',
  SESSION_EXPIRED = 'session.expired',
  SESSION_TERMINATED = 'session.terminated',
  SESSION_HIJACKING_DETECTED = 'session.hijacking_detected',

  // API security events
  API_RATE_LIMIT_HIT = 'api.rate_limit_hit',
  API_RATE_LIMIT_EXCEEDED = 'api.rate_limit_exceeded',
  API_SUSPICIOUS_REQUEST = 'api.suspicious_request',
  API_MALFORMED_REQUEST = 'api.malformed_request',

  // Input validation events
  INPUT_VALIDATION_FAILURE = 'input.validation_failure',
  INPUT_XSS_DETECTED = 'input.xss_detected',
  INPUT_SQL_INJECTION_DETECTED = 'input.sql_injection_detected',
  INPUT_COMMAND_INJECTION_DETECTED = 'input.command_injection_detected',

  // System security events
  SYSTEM_CONFIG_CHANGE = 'system.config_change',
  SYSTEM_SECRET_ACCESS = 'system.secret_access',
  SYSTEM_SECRET_ROTATION = 'system.secret_rotation',
  SYSTEM_VULNERABILITY_SCAN = 'system.vulnerability_scan',

  // Data access events
  DATA_ACCESS_SENSITIVE = 'data.access_sensitive',
  DATA_EXPORT_LARGE = 'data.export_large',
  DATA_MODIFICATION = 'data.modification',
  DATA_DELETION = 'data.deletion',

  // Threat detection events
  THREAT_DETECTED = 'threat.detected',
  THREAT_MITIGATED = 'threat.mitigated',
  THREAT_ESCALATED = 'threat.escalated',
  THREAT_FALSE_POSITIVE = 'threat.false_positive',

  // Compliance events
  COMPLIANCE_VIOLATION = 'compliance.violation',
  COMPLIANCE_AUDIT_START = 'compliance.audit_start',
  COMPLIANCE_AUDIT_COMPLETE = 'compliance.audit_complete',
  COMPLIANCE_REPORT_GENERATED = 'compliance.report_generated',
}

/**
 * Security event severity levels
 */
export enum SecurityEventSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Security event outcome
 */
export enum SecurityEventOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  BLOCKED = 'blocked',
  ALLOWED = 'allowed',
  PENDING = 'pending',
}

/**
 * Security event interface
 */
export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  outcome: SecurityEventOutcome;
  source: {
    service: string;
    component: string;
    version: string;
    environment: string;
  };
  actor: {
    userId?: string;
    username?: string;
    sessionId?: string;
    roles?: string[];
    ipAddress: string;
    userAgent?: string;
    deviceFingerprint?: string;
  };
  target: {
    resourceType?: string;
    resourceId?: string;
    resourceOwner?: string;
    endpoint?: string;
    operation?: string;
  };
  _context: {
    correlationId: string;
    requestId?: string;
    transactionId?: string;
    operationDurationMs?: number;
    additionalData: Record<string, unknown>;
  };
  security: {
    riskScore?: number;
    threatLevel?: string;
    mitigationApplied?: string;
    complianceFramework?: string[];
    detectionMethod?: string;
  };
  _metadata: {
    createdBy: string;
    processingTime: number;
    dataClassification?: string;
    retentionPolicy?: string;
    tags?: string[];
  };
}

/**
 * Audit configuration interface
 */
interface AuditConfiguration {
  enabled: boolean;
  logLevel: string;
  retentionDays: number;
  batchSize: number;
  batchTimeoutMs: number;
  enableRealTimeAlerts: boolean;
  alertThresholds: {
    criticalEventsPerMinute: number;
    highRiskScoreThreshold: number;
    authFailuresPerMinute: number;
    suspiciousActivitiesPerMinute: number;
  };
  compliance: {
    frameworks: string[];
    enableAutoReporting: boolean;
    reportingIntervalHours: number;
  };
}

/**
 * Audit statistics interface
 */
export interface AuditStatistics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsByOutcome: Record<string, number>;
  topUsers: Array<{ userId: string; eventCount: number }>;
  topEndpoints: Array<{ endpoint: string; eventCount: number }>;
  riskScoreDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  timeRange: {
    startTime: Date;
    endTime: Date;
  };
}

/**
 * Security Audit Service
 */
@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);
  private readonly config: AuditConfiguration;
  private readonly eventQueue: SecurityEvent[] = [];
  private readonly eventStore: SecurityEvent[] = [];
  private processingBatch = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly metricsService: MetricsService,
  ) {
    this.logger.log('Security Audit Service initializing...');

    // Load audit configuration
    this.config = this.loadAuditConfiguration();

    // Start batch processing
    this.startBatchProcessing();

    // Start retention cleanup
    this.startRetentionCleanup();

    this.logger.log('Security Audit Service initialized successfully', {
      configuration: {
        enabled: this.config.enabled,
        retentionDays: this.config.retentionDays,
        batchSize: this.config.batchSize,
        realTimeAlertsEnabled: this.config.enableRealTimeAlerts,
      },
    });
  }

  /**
   * Record a security event
   * @param eventData - Security event data
   * @returns Promise<void>
   */
  async recordSecurityEvent(
    eventData: Partial<SecurityEvent> & {
      type: SecurityEventType;
      severity: SecurityEventSeverity;
      outcome: SecurityEventOutcome;
    },
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const startTime = performance.now();
    const eventId = crypto.randomUUID();

    try {
      // Create complete security event
      const securityEvent: SecurityEvent = {
        id: eventId,
        timestamp: new Date(),
        type: eventData.type,
        severity: eventData.severity,
        outcome: eventData.outcome,
        source: {
          service: eventData.source?.service || 'bytebot-agent',
          component: eventData.source?.component || 'unknown',
          version: eventData.source?.version || '1.0.0',
          environment:
            eventData.source?.environment ||
            this.configService.get('app.environment', 'development'),
        },
        actor: {
          userId: eventData.actor?.userId,
          username: eventData.actor?.username,
          sessionId: eventData.actor?.sessionId,
          roles: eventData.actor?.roles || [],
          ipAddress: eventData.actor?.ipAddress || 'unknown',
          userAgent: eventData.actor?.userAgent,
          deviceFingerprint: eventData.actor?.deviceFingerprint,
        },
        target: {
          resourceType: eventData.target?.resourceType,
          resourceId: eventData.target?.resourceId,
          resourceOwner: eventData.target?.resourceOwner,
          endpoint: eventData.target?.endpoint,
          operation: eventData.target?.operation,
        },
        _context: {
          correlationId:
            eventData.context?.correlationId || crypto.randomUUID(),
          requestId: eventData.context?.requestId,
          transactionId: eventData.context?.transactionId,
          operationDurationMs: eventData.context?.operationDurationMs,
          additionalData: eventData.context?.additionalData || {},
        },
        security: {
          riskScore: eventData.security?.riskScore,
          threatLevel: eventData.security?.threatLevel,
          mitigationApplied: eventData.security?.mitigationApplied,
          complianceFramework: eventData.security?.complianceFramework || [],
          detectionMethod: eventData.security?.detectionMethod,
        },
        _metadata: {
          createdBy: 'SecurityAuditService',
          processingTime: performance.now() - startTime,
          dataClassification:
            eventData.metadata?.dataClassification || 'internal',
          retentionPolicy: eventData.metadata?.retentionPolicy || 'standard',
          tags: eventData.metadata?.tags || [],
        },
      };

      // Add to processing queue
      this.eventQueue.push(securityEvent);

      // Update metrics
      this.updateSecurityMetrics(securityEvent);

      // Check for real-time alerts
      if (this.config.enableRealTimeAlerts) {
        await this.checkRealTimeAlerts(securityEvent);
      }

      // Emit event for other services
      this.eventEmitter.emit('security.event.recorded', securityEvent);

      this.logger.debug('Security event recorded', {
        eventId,
        type: eventData.type,
        severity: eventData.severity,
        processingTimeMs: securityEvent.metadata.processingTime.toFixed(2),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to record security event', {
        eventId,
        type: eventData.type,
        _error: errorMessage,
        processingTimeMs: (performance.now() - startTime).toFixed(2),
      });

      // Record audit failure as a security event
      if (eventData.type !== SecurityEventType.SYSTEM_CONFIG_CHANGE) {
        // Prevent infinite recursion
        void this.recordSecurityEvent({
          type: SecurityEventType.SYSTEM_CONFIG_CHANGE,
          severity: SecurityEventSeverity.HIGH,
          outcome: SecurityEventOutcome.FAILURE,
          _context: {
            correlationId: crypto.randomUUID(),
            additionalData: {
              originalEventType: eventData.type,
              _error: errorMessage,
            },
          },
        });
      }
    }
  }

  /**
   * Query security events with filters
   * @param filters - Query filters
   * @returns Promise<SecurityEvent[]>
   */
  querySecurityEvents(filters: {
    startTime?: Date;
    endTime?: Date;
    types?: SecurityEventType[];
    severities?: SecurityEventSeverity[];
    outcomes?: SecurityEventOutcome[];
    userId?: string;
    sessionId?: string;
    endpoint?: string;
    riskScoreMin?: number;
    riskScoreMax?: number;
    limit?: number;
    offset?: number;
  }): SecurityEvent[] {
    const startTime = performance.now();

    try {
      let filteredEvents = [...this.eventStore];

      // Apply time range filter
      if (filters.startTime || filters.endTime) {
        filteredEvents = filteredEvents.filter((event) => {
          const eventTime = event.timestamp;
          if (filters.startTime && eventTime < filters.startTime) {
            return false;
          }
          if (filters.endTime && eventTime > filters.endTime) {
            return false;
          }
          return true;
        });
      }

      // Apply type filter
      if (filters.types && filters.types.length > 0) {
        filteredEvents = filteredEvents.filter((event) =>
          filters.types?.includes(event.type),
        );
      }

      // Apply severity filter
      if (filters.severities && filters.severities.length > 0) {
        filteredEvents = filteredEvents.filter((event) =>
          filters.severities?.includes(event.severity),
        );
      }

      // Apply outcome filter
      if (filters.outcomes && filters.outcomes.length > 0) {
        filteredEvents = filteredEvents.filter((event) =>
          filters.outcomes?.includes(event.outcome),
        );
      }

      // Apply user ID filter
      if (filters.userId) {
        filteredEvents = filteredEvents.filter(
          (event) => event.actor.userId === filters.userId,
        );
      }

      // Apply session ID filter
      if (filters.sessionId) {
        filteredEvents = filteredEvents.filter(
          (event) => event.actor.sessionId === filters.sessionId,
        );
      }

      // Apply endpoint filter
      if (filters.endpoint) {
        filteredEvents = filteredEvents.filter(
          (event) => event.target.endpoint === filters.endpoint,
        );
      }

      // Apply risk score filters
      if (
        filters.riskScoreMin !== undefined ||
        filters.riskScoreMax !== undefined
      ) {
        filteredEvents = filteredEvents.filter((event) => {
          const riskScore = event.security.riskScore || 0;
          if (
            filters.riskScoreMin !== undefined &&
            riskScore < filters.riskScoreMin
          ) {
            return false;
          }
          if (
            filters.riskScoreMax !== undefined &&
            riskScore > filters.riskScoreMax
          ) {
            return false;
          }
          return true;
        });
      }

      // Sort by timestamp (newest first)
      filteredEvents.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 100;
      filteredEvents = filteredEvents.slice(offset, offset + limit);

      const processingTime = performance.now() - startTime;
      this.logger.debug('Security events queried', {
        totalFiltered: filteredEvents.length,
        processingTimeMs: processingTime.toFixed(2),
        filters,
      });

      return filteredEvents;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to query security events', {
        _error: errorMessage,
        filters,
      });
      throw error;
    }
  }

  /**
   * Generate audit statistics
   * @param timeRange - Time range for statistics
   * @returns Promise<AuditStatistics>
   */
  generateAuditStatistics(timeRange?: {
    startTime: Date;
    endTime: Date;
  }): AuditStatistics {
    const startTime = performance.now();

    try {
      // Use provided time range or default to last 24 hours
      const defaultEndTime = new Date();
      const defaultStartTime = new Date(
        defaultEndTime.getTime() - 24 * 60 * 60 * 1000,
      );

      const actualTimeRange = {
        startTime: timeRange?.startTime || defaultStartTime,
        endTime: timeRange?.endTime || defaultEndTime,
      };

      // Filter events by time range
      const events = this.querySecurityEvents({
        startTime: actualTimeRange.startTime,
        endTime: actualTimeRange.endTime,
        limit: 10000, // Get more events for statistics
      });

      // Calculate statistics
      const eventsByType: Record<string, number> = {};
      const eventsBySeverity: Record<string, number> = {};
      const eventsByOutcome: Record<string, number> = {};
      const userCounts: Record<string, number> = {};
      const endpointCounts: Record<string, number> = {};
      const riskScoreDistribution = { low: 0, medium: 0, high: 0, critical: 0 };

      for (const event of events) {
        // Event type counts
        eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

        // Severity counts
        eventsBySeverity[event.severity] =
          (eventsBySeverity[event.severity] || 0) + 1;

        // Outcome counts
        eventsByOutcome[event.outcome] =
          (eventsByOutcome[event.outcome] || 0) + 1;

        // User counts
        if (event.actor.userId) {
          userCounts[event.actor.userId] =
            (userCounts[event.actor.userId] || 0) + 1;
        }

        // Endpoint counts
        if (event.target.endpoint) {
          endpointCounts[event.target.endpoint] =
            (endpointCounts[event.target.endpoint] || 0) + 1;
        }

        // Risk score distribution
        const riskScore = event.security.riskScore || 0;
        if (riskScore >= 0.8) {
          riskScoreDistribution.critical++;
        } else if (riskScore >= 0.6) {
          riskScoreDistribution.high++;
        } else if (riskScore >= 0.3) {
          riskScoreDistribution.medium++;
        } else {
          riskScoreDistribution.low++;
        }
      }

      // Get top users and endpoints
      const topUsers = Object.entries(userCounts)
        .map(([userId, eventCount]) => ({ userId, eventCount }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      const topEndpoints = Object.entries(endpointCounts)
        .map(([endpoint, eventCount]) => ({ endpoint, eventCount }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      const statistics: AuditStatistics = {
        totalEvents: events.length,
        eventsByType,
        eventsBySeverity,
        eventsByOutcome,
        topUsers,
        topEndpoints,
        riskScoreDistribution,
        timeRange: actualTimeRange,
      };

      const processingTime = performance.now() - startTime;
      this.logger.debug('Audit statistics generated', {
        totalEvents: statistics.totalEvents,
        timeRange: actualTimeRange,
        processingTimeMs: processingTime.toFixed(2),
      });

      return statistics;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to generate audit statistics', {
        _error: errorMessage,
        timeRange,
      });
      throw error;
    }
  }

  /**
   * Event listeners for automatic audit logging
   */
  @OnEvent('auth.**')
  async handleAuthEvent(_event: BaseSecurityEvent): Promise<void> {
    let eventType: SecurityEventType;
    let severity: SecurityEventSeverity = SecurityEventSeverity.INFO;
    let outcome: SecurityEventOutcome = SecurityEventOutcome.SUCCESS;

    // Map event names to security event types
    const eventKey = event.type || event.name;
    switch (eventKey) {
      case 'auth.login.success':
        eventType = SecurityEventType.AUTH_SUCCESS;
        break;
      case 'auth.login.failure':
        eventType = SecurityEventType.AUTH_FAILURE;
        severity = SecurityEventSeverity.MEDIUM;
        outcome = SecurityEventOutcome.FAILURE;
        break;
      case 'auth.lockout':
        eventType = SecurityEventType.AUTH_LOCKOUT;
        severity = SecurityEventSeverity.HIGH;
        outcome = SecurityEventOutcome.BLOCKED;
        break;
      default:
        return; // Unknown auth event
    }

    await this.recordSecurityEvent({
      type: eventType,
      severity,
      outcome,
      actor: {
        userId: event.userId,
        username: event.username,
        sessionId: event.sessionId,
        ipAddress: event.ipAddress || 'unknown',
        userAgent: event.userAgent,
      },
      _context: {
        correlationId: event.correlationId || crypto.randomUUID(),
        additionalData: event,
      },
    });
  }

  @OnEvent('api.**')
  async handleApiEvent(_event: BaseSecurityEvent): Promise<void> {
    let eventType: SecurityEventType;
    let severity: SecurityEventSeverity = SecurityEventSeverity.INFO;

    switch (event.type || event.name) {
      case 'api.rate_limit.hit':
        eventType = SecurityEventType.API_RATE_LIMIT_HIT;
        severity = SecurityEventSeverity.MEDIUM;
        break;
      case 'api.rate_limit.exceeded':
        eventType = SecurityEventType.API_RATE_LIMIT_EXCEEDED;
        severity = SecurityEventSeverity.HIGH;
        break;
      default:
        return;
    }

    await this.recordSecurityEvent({
      type: eventType,
      severity,
      outcome: SecurityEventOutcome.BLOCKED,
      actor: {
        userId: event.userId,
        ipAddress: event.ipAddress || 'unknown',
        userAgent: event.userAgent,
      },
      target: {
        endpoint: event.endpoint,
        operation: event.method,
      },
      _context: {
        correlationId: event.correlationId || crypto.randomUUID(),
        additionalData: event,
      },
    });
  }

  /**
   * Private helper methods
   */
  private loadAuditConfiguration(): AuditConfiguration {
    return {
      enabled: this.configService.get('audit.enabled', true),
      logLevel: this.configService.get('audit.logLevel', 'info'),
      retentionDays: this.configService.get('audit.retentionDays', 90),
      batchSize: this.configService.get('audit.batchSize', 100),
      batchTimeoutMs: this.configService.get('audit.batchTimeoutMs', 10000),
      enableRealTimeAlerts: this.configService.get(
        'audit.enableRealTimeAlerts',
        true,
      ),
      alertThresholds: {
        criticalEventsPerMinute: this.configService.get(
          'audit.alertThresholds.criticalEventsPerMinute',
          5,
        ),
        highRiskScoreThreshold: this.configService.get(
          'audit.alertThresholds.highRiskScoreThreshold',
          0.8,
        ),
        authFailuresPerMinute: this.configService.get(
          'audit.alertThresholds.authFailuresPerMinute',
          10,
        ),
        suspiciousActivitiesPerMinute: this.configService.get(
          'audit.alertThresholds.suspiciousActivitiesPerMinute',
          3,
        ),
      },
      compliance: {
        frameworks: this.configService.get('audit.compliance.frameworks', [
          'SOC2',
          'ISO27001',
        ]),
        enableAutoReporting: this.configService.get(
          'audit.compliance.enableAutoReporting',
          false,
        ),
        reportingIntervalHours: this.configService.get(
          'audit.compliance.reportingIntervalHours',
          24,
        ),
      },
    };
  }

  private updateSecurityMetrics(_event: SecurityEvent): void {
    try {
      // Record security event metrics
      this.metricsService.recordApplicationError(
        'security_event',
        event.severity as 'low' | 'medium' | 'high' | 'critical',
        'security_audit',
      );

      // Record authentication metrics
      if (event.type.startsWith('auth.')) {
        const status =
          event.outcome === SecurityEventOutcome.SUCCESS
            ? 'success'
            : 'failure';
        this.metricsService.recordAuthAttempt(
          'jwt',
          status,
          event.metadata.processingTime,
        );
      }

      // Record authorization metrics
      if (event.type.startsWith('authz.')) {
        const result =
          event.outcome === SecurityEventOutcome.ALLOWED ? 'granted' : 'denied';
        // Log authorization metrics for future enhancement
        this.logger.debug('Authorization event recorded', {
          eventId: event.id,
          result,
          resourceType: event.target.resourceType,
          operation: event.target.operation,
        });
        // This would call a hypothetical authorization metrics method when implemented
        // this.metricsService.recordAuthorizationCheck(event.target.resourceType, event.target.operation, result);
      }
    } catch (error) {
      this.logger.warn('Failed to update security metrics', {
        eventId: event.id,
        _error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async checkRealTimeAlerts(_event: SecurityEvent): Promise<void> {
    try {
      // Check for critical severity events
      if (event.severity === SecurityEventSeverity.CRITICAL) {
        await new Promise((resolve) => {
          this.eventEmitter.emit('security.alert.critical', {
            event,
            message: `Critical security event detected: ${event.type}`,
          });
          resolve(true);
        });
      }

      // Check for high risk score
      if (
        event.security.riskScore &&
        event.security.riskScore >=
          this.config.alertThresholds.highRiskScoreThreshold
      ) {
        await new Promise((resolve) => {
          this.eventEmitter.emit('security.alert.high_risk', {
            event,
            riskScore: event.security.riskScore,
            message: `High risk security event detected: ${event.type}`,
          });
          resolve(true);
        });
      }

      // Check for authentication failures
      if (event.type === SecurityEventType.AUTH_FAILURE) {
        // Count recent auth failures from same source
        const recentFailures = this.eventStore.filter(
          (e) =>
            e.type === SecurityEventType.AUTH_FAILURE &&
            e.actor.ipAddress === event.actor.ipAddress &&
            Date.now() - e.timestamp.getTime() < 60000, // Last minute
        ).length;

        if (
          recentFailures >= this.config.alertThresholds.authFailuresPerMinute
        ) {
          this.eventEmitter.emit('security.alert.brute_force', {
            event,
            failureCount: recentFailures,
            ipAddress: event.actor.ipAddress,
            message: `Potential brute force attack detected from ${event.actor.ipAddress}`,
          });
        }
      }
    } catch (error) {
      this.logger.warn('Failed to check real-time alerts', {
        eventId: event.id,
        _error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private startBatchProcessing(): void {
    setInterval(() => {
      void this.processBatch();
    }, this.config.batchTimeoutMs);
  }

  private async processBatch(): Promise<void> {
    if (this.processingBatch || this.eventQueue.length === 0) {
      return;
    }

    this.processingBatch = true;
    const batchSize = Math.min(this.config.batchSize, this.eventQueue.length);
    const batch = this.eventQueue.splice(0, batchSize);

    try {
      // Process batch (in production, this would write to persistent storage)
      for (const event of batch) {
        this.eventStore.push(event);
      }

      this.logger.debug(`Processed security event batch`, {
        batchSize,
        queueSize: this.eventQueue.length,
        storeSize: this.eventStore.length,
      });

      await Promise.resolve(); // Ensure this is properly async
    } catch (error) {
      this.logger.error('Failed to process security event batch', {
        batchSize,
        _error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Re-queue events on failure
      this.eventQueue.unshift(...batch);
    } finally {
      this.processingBatch = false;
    }
  }

  private startRetentionCleanup(): void {
    // Run cleanup every hour
    setInterval(() => {
      const cutoffTime = new Date();
      cutoffTime.setDate(cutoffTime.getDate() - this.config.retentionDays);

      const beforeCount = this.eventStore.length;
      const retainedEvents = this.eventStore.filter(
        (event) => event.timestamp > cutoffTime,
      );

      // Update store with retained events
      this.eventStore.length = 0;
      this.eventStore.push(...retainedEvents);

      const removedCount = beforeCount - this.eventStore.length;
      if (removedCount > 0) {
        this.logger.log('Security audit retention cleanup completed', {
          removedEvents: removedCount,
          retainedEvents: this.eventStore.length,
          cutoffTime,
        });
      }
    }, 3600000); // 1 hour
  }

  /**
   * Get audit service health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    queueSize: number;
    storeSize: number;
    processingBatch: boolean;
    lastBatchTime?: Date;
    configuration: AuditConfiguration;
  } {
    return {
      status: this.config.enabled ? 'healthy' : 'degraded',
      queueSize: this.eventQueue.length,
      storeSize: this.eventStore.length,
      processingBatch: this.processingBatch,
      configuration: this.config,
    };
  }
}

export default SecurityAuditService;
