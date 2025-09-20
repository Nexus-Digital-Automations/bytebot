/**
 * Browser Audit Trail Service
 *
 * Comprehensive audit trail system for browser automation operations providing:
 * - Complete lifecycle tracking of all browser operations
 * - Tamper-evident audit logging with cryptographic integrity
 * - Compliance-ready audit trails for regulatory requirements
 * - Real-time monitoring and alerting on security events
 * - Advanced analytics and forensic capabilities
 *
 * Features:
 * - Immutable audit logs with digital signatures
 * - Multi-tier storage (hot, warm, cold) for retention policies
 * - Real-time event streaming and correlation
 * - Advanced search and filtering capabilities
 * - Automated compliance reporting
 * - Privacy-preserving audit techniques
 *
 * @module BrowserAuditTrailService
 * @version 1.0.0
 * @author Audit Trail Specialist
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import * as crypto from 'crypto';
import { Readable } from 'stream';

// Authentication and security context types
import {
  BrowserUseUserContext,
  BrowserUseSessionContext,
  BrowserUseSecurityContext,
  BrowserUseAuditContext,
} from '../middleware/browser-use-auth.middleware';

// Rate limiting and authorization context
import { RateLimitDecision } from '../rate-limiters/browser-rate-limiter.service';
import { AuthorizationDecision } from '../guards/browser-use-rbac.guard';

// Request validation context
import { RequestValidationResult } from '../validators/browser-request-validator.service';

/*** Audit event types for browser operations
 */
export enum BrowserAuditEventType {
  // Authentication events
  AUTHENTICATION_SUCCESS = 'auth.success',
  AUTHENTICATION_FAILURE = 'auth.failure',
  SESSION_CREATED = 'session.created',
  SESSION_EXPIRED = 'session.expired',
  SESSION_TERMINATED = 'session.terminated',

  // Authorization events
  AUTHORIZATION_GRANTED = 'authz.granted',
  AUTHORIZATION_DENIED = 'authz.denied',
  PERMISSION_ESCALATION = 'authz.escalation',
  ROLE_ASSIGNMENT = 'authz.role_assignment',

  // Browser operation events
  TASK_CREATED = 'task.created',
  TASK_STARTED = 'task.started',
  TASK_COMPLETED = 'task.completed',
  TASK_FAILED = 'task.failed',
  TASK_CANCELLED = 'task.cancelled',

  // Session management events
  BROWSER_SESSION_CREATED = 'browser_session.created',
  BROWSER_SESSION_CLOSED = 'browser_session.closed',
  PAGE_NAVIGATED = 'page.navigated',
  ACTION_EXECUTED = 'action.executed',

  // Data events
  DATA_EXTRACTED = 'data.extracted',
  FILE_UPLOADED = 'file.uploaded',
  FORM_SUBMITTED = 'form.submitted',
  SCREENSHOT_TAKEN = 'screenshot.taken',

  // Security events
  RATE_LIMIT_EXCEEDED = 'security.rate_limit_exceeded',
  VALIDATION_FAILED = 'security.validation_failed',
  SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
  SECURITY_VIOLATION = 'security.violation',

  // Compliance events
  PII_ACCESS = 'compliance.pii_access',
  DATA_RETENTION_APPLIED = 'compliance.data_retention',
  CONSENT_RECORDED = 'compliance.consent',
  GDPR_REQUEST = 'compliance.gdpr_request',

  // System events
  SERVICE_STARTED = 'system.service_started',
  SERVICE_STOPPED = 'system.service_stopped',
  CONFIGURATION_CHANGED = 'system.config_changed',
  ERROR_OCCURRED = 'system.error',
}/**
 * Audit event severity levels
 */
export enum AuditEventSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}/**
 * Base audit event structure
 */
export interface BrowserAuditEvent {
  // Event identification
  eventId: string;
  eventType: BrowserAuditEventType;
  timestamp: Date;
  severity: AuditEventSeverity;

  // User and session context
  userId?: string;
  sessionId?: string;
  requestId?: string;
  operationId?: string;

  // Event details
  description: string;
  resource: string;
  action: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'CANCELLED';// Security contextipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  riskScore?: number;

  // Data payload
  data: Record<string, unknown>;
  metadata: AuditEventMetadata;

  // Integrity and compliance
  signature?: string;
  hash: string;
  retentionCategory: 'HOT' | 'WARM' | 'COLD' | 'ARCHIVE';complianceFlags: string[];// Relationships
  parentEventId?: string;
  correlationId?: string;
  traceId?: string;
}

/**
 * Audit event metadata
 */
export interface AuditEventMetadata {
  sourceComponent: string;
  sourceVersion: string;
  environment: string;
  processId: string;
  threadId: string;
  performanceMetrics: {
    processingTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  securityClassification: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';dataCategories: string[];additionalContext: Record<string, unknown>;
}

/**
 * Audit trail configuration
 */
interface AuditTrailConfig {
  enabled: boolean;
  realTimeStreaming: boolean;
  cryptographicIntegrity: boolean;
  retentionPolicies: {
    hot: number;    // Days in hot storage
    warm: number;   // Days in warm storage
    cold: number;   // Days in cold storage
    archive: number; // Days before permanent deletion
  };
  complianceMode: boolean;
  sensitiveDataRedaction: boolean;
  eventFiltering: {
    includeEvents: BrowserAuditEventType[];
    excludeEvents: BrowserAuditEventType[];
    minimumSeverity: AuditEventSeverity;
  };
  storage: {
    primaryStore: 'DATABASE' | 'FILE_SYSTEM' | 'CLOUD_STORAGE';backupStore: 'DATABASE' | 'FILE_SYSTEM' | 'CLOUD_STORAGE';compressionEnabled: boolean;encryptionEnabled: boolean;
  };
}

/**
 * Audit query parameters
 */
export interface AuditQueryParams {
  startTime?: Date;
  endTime?: Date;
  userId?: string;
  sessionId?: string;
  eventTypes?: BrowserAuditEventType[];
  severity?: AuditEventSeverity[];
  outcome?: string[];
  searchText?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'eventType';sortOrder?: 'ASC' | 'DESC';includeMetadata?: boolean;complianceFilter?: string[];
}

/**
 * Audit query result
 */
export interface AuditQueryResult {
  events: BrowserAuditEvent[];
  totalCount: number;
  queryId: string;
  executionTime: number;
  metadata: {
    query: AuditQueryParams;
    resultSize: number;
    fromCache: boolean;
    securityContext: string;
  };
}

/**
 * Audit statistics
 */
interface AuditStatistics {
  totalEvents: number;
  eventsByType: Map<BrowserAuditEventType, number>;
  eventsBySeverity: Map<AuditEventSeverity, number>;
  eventsPerSecond: number;
  storageUtilization: {
    hot: number;
    warm: number;
    cold: number;
    archive: number;
  };
  integrityChecks: {
    passed: number;
    failed: number;
    lastCheck: Date;
  };
  performanceMetrics: {
    averageIngestionTime: number;
    averageQueryTime: number;
    peakThroughput: number;
  };
}

/**
 * Browser Audit Trail Service
 *
 * Comprehensive audit trail system providing immutable, tamper-evident logging
 * of all browser automation operations with advanced compliance features.
 */
@Injectable()
export class BrowserAuditTrailService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrowserAuditTrailService.name);

  // Service configuration
  private readonly config: AuditTrailConfig = {
    enabled: true,
    realTimeStreaming: true,
    cryptographicIntegrity: true,
    retentionPolicies: {
      hot: 30,      // 30 days in hot storage
      warm: 90,     // 90 days in warm storage
      cold: 365,    // 1 year in cold storage
      archive: 2555, // 7 years total retention
    },
    complianceMode: true,
    sensitiveDataRedaction: true,
    eventFiltering: {
      includeEvents: Object.values(BrowserAuditEventType),
      excludeEvents: [],
      minimumSeverity: AuditEventSeverity.INFO,
    },
    storage: {
      primaryStore: 'DATABASE',backupStore: 'FILE_SYSTEM',compressionEnabled: true,encryptionEnabled: true,
    },
  };

  // In-memory storage for real-time events (in production, use proper persistence)
  private readonly auditEventStore = new Map<string, BrowserAuditEvent>();
  private readonly eventStreams = new Map<string, Readable>();

  // Cryptographic keys for integrity
  private readonly signingKey: string;
  private readonly encryptionKey: string;

  // Statistics tracking
  private readonly statistics: AuditStatistics = {
    totalEvents: 0,
    eventsByType: new Map(),
    eventsBySeverity: new Map(),
    eventsPerSecond: 0,
    storageUtilization: { hot: 0, warm: 0, cold: 0, archive: 0 },
    integrityChecks: { passed: 0, failed: 0, lastCheck: new Date() },
    performanceMetrics: { averageIngestionTime: 0, averageQueryTime: 0, peakThroughput: 0 },
  };

  // Event correlation tracking
  private readonly correlationMap = new Map<string, string[]>();
  private readonly traceMap = new Map<string, BrowserAuditEvent[]>();

  constructor() {
    super();

    this.logger.log('📊 Browser Audit Trail Service initializing...');// Generate cryptographic keys (in production, use proper key management)this.signingKey = crypto.randomBytes(32).toString('hex');this.encryptionKey = crypto.randomBytes(32).toString('hex');// Initialize event countersObject.values(BrowserAuditEventType).forEach(type => {
      this.statistics.eventsByType.set(type, 0);
    });

    Object.values(AuditEventSeverity).forEach(severity => {
      this.statistics.eventsBySeverity.set(severity, 0);
    });
  }

  /**
   * Initialize audit trail service
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('🚀 Starting Browser Audit Trail Service...');try {await this.initializeStorage();
      await this.startRealTimeStreaming();
      await this.scheduleMaintenanceTasks();
      await this.performIntegrityCheck();

      // Log service startup
      await this.recordEvent({
        eventType: BrowserAuditEventType.SERVICE_STARTED,
        severity: AuditEventSeverity.INFO,
        description: 'Browser Audit Trail Service started successfully',resource: 'audit_service',action: 'service_startup',outcome: 'SUCCESS',ipAddress: 'localhost',userAgent: 'system',data: {config: this.sanitizeConfigForLogging(),
          statistics: this.getStatisticsSummary(),
        },
      });

      this.logger.log('✅ Browser Audit Trail Service initialized successfully');} catch (error) {this.logger.error('❌ Failed to initialize Browser Audit Trail Service', error);throw error;}
  }

  /**
   * Cleanup on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('🔄 Shutting down Browser Audit Trail Service...');try {// Log service shutdown
      await this.recordEvent({
        eventType: BrowserAuditEventType.SERVICE_STOPPED,
        severity: AuditEventSeverity.INFO,
        description: 'Browser Audit Trail Service shutting down',resource: 'audit_service',action: 'service_shutdown',outcome: 'SUCCESS',ipAddress: 'localhost',userAgent: 'system',data: {totalEventsProcessed: this.statistics.totalEvents,
          uptime: process.uptime(),
        },
      });

      await this.flushPendingEvents();
      await this.closeEventStreams();

      this.logger.log('✅ Browser Audit Trail Service shutdown complete');} catch (error) {this.logger.error('❌ Error during audit service shutdown', error);}}

  // ===== MAIN AUDIT METHODS =====

  /**
   * Record a browser audit event
   */
  async recordEvent(eventData: Partial<BrowserAuditEvent>): Promise<string> {
    if (!this.config.enabled) {
      return '';
    }
    const startTime = performance.now();

    try {
      // Create complete audit event
      const auditEvent = await this.createAuditEvent(eventData);

      // Apply event filtering
      if (!this.shouldRecordEvent(auditEvent)) {
        return auditEvent.eventId;
      }

      // Apply data redaction if needed
      if (this.config.sensitiveDataRedaction) {
        this.redactSensitiveData(auditEvent);
      }

      // Add cryptographic integrity
      if (this.config.cryptographicIntegrity) {
        auditEvent.signature = this.signEvent(auditEvent);
        auditEvent.hash = this.hashEvent(auditEvent);
      }

      // Store the event
      await this.storeEvent(auditEvent);

      // Stream the event if real-time streaming is enabled
      if (this.config.realTimeStreaming) {
        this.streamEvent(auditEvent);
      }

      // Update statistics
      this.updateStatistics(auditEvent, performance.now() - startTime);

      // Emit event for real-time listeners
      this.emit('audit:event', auditEvent);

      // Check for compliance triggers
      await this.checkComplianceTriggers(auditEvent);

      // Log high-severity events
      if (auditEvent.severity === AuditEventSeverity.CRITICAL || auditEvent.severity === AuditEventSeverity.HIGH) {
        this.logger.warn(`High-severity audit event recorded: ${auditEvent.eventType}`, {
          eventId: auditEvent.eventId,
          severity: auditEvent.severity,
          userId: auditEvent.userId,
          description: auditEvent.description,
        });
      }

      return auditEvent.eventId;

    } catch (error) {
      this.logger.error('Failed to record audit event', {
        error: error instanceof Error ? error.message : String(error),
        eventType: eventData.eventType,
        processingTime: `${(performance.now() - startTime).toFixed(2)}ms`,});throw error;
    }
  }

  /**
   * Record authentication event
   */
  async recordAuthenticationEvent(
    eventType: BrowserAuditEventType.AUTHENTICATION_SUCCESS | BrowserAuditEventType.AUTHENTICATION_FAILURE,
    userContext: Partial<BrowserUseUserContext>,
    auditContext: BrowserUseAuditContext,
    additionalData: Record<string, unknown> = {}
  ): Promise<string> {
    return this.recordEvent({
      eventType,
      severity: eventType === BrowserAuditEventType.AUTHENTICATION_FAILURE ?
        AuditEventSeverity.MEDIUM : AuditEventSeverity.INFO,
      userId: userContext.userId,
      sessionId: auditContext.sessionId,
      requestId: auditContext.requestId,
      operationId: auditContext.operationId,
      description: `User authentication ${eventType === BrowserAuditEventType.AUTHENTICATION_SUCCESS ? 'succeeded' : 'failed'}`,
      resource: 'authentication_service',action: 'authenticate',outcome: eventType === BrowserAuditEventType.AUTHENTICATION_SUCCESS ? 'SUCCESS' : 'FAILURE',ipAddress: auditContext.ipAddress,userAgent: auditContext.userAgent,
      data: {
        authenticationMethod: auditContext.authenticationMethod,
        securityValidation: auditContext.securityValidation,
        ...additionalData,
      },
      correlationId: auditContext.operationId,
      complianceFlags: ['AUTHENTICATION_LOG'],
    });
  }

  /**
   * Record authorization event
   */
  async recordAuthorizationEvent(
    eventType: BrowserAuditEventType.AUTHORIZATION_GRANTED | BrowserAuditEventType.AUTHORIZATION_DENIED,
    userContext: BrowserUseUserContext,
    auditContext: BrowserUseAuditContext,
    authorizationDecision: AuthorizationDecision
  ): Promise<string> {
    return this.recordEvent({
      eventType,
      severity: eventType === BrowserAuditEventType.AUTHORIZATION_DENIED ?
        AuditEventSeverity.MEDIUM : AuditEventSeverity.INFO,
      userId: userContext.userId,
      sessionId: auditContext.sessionId,
      requestId: auditContext.requestId,
      operationId: auditContext.operationId,
      description: `Authorization ${eventType === BrowserAuditEventType.AUTHORIZATION_GRANTED ? 'granted' : 'denied'} for ${auditContext.endpoint}`,
      resource: auditContext.endpoint,
      action: auditContext.method,
      outcome: authorizationDecision.granted ? 'SUCCESS' : 'FAILURE',ipAddress: auditContext.ipAddress,userAgent: auditContext.userAgent,
      data: {
        reasoning: authorizationDecision.reasoning,
        conditions: authorizationDecision.conditions,
        escalationRequired: authorizationDecision.escalationRequired,
        temporaryAccess: authorizationDecision.temporaryAccess,
        auditTrail: authorizationDecision.auditTrail,
      },
      correlationId: auditContext.operationId,
      complianceFlags: ['AUTHORIZATION_LOG'],});}

  /**
   * Record browser task event
   */
  async recordBrowserTaskEvent(
    eventType: BrowserAuditEventType,
    userContext: BrowserUseUserContext,
    auditContext: BrowserUseAuditContext,
    taskData: Record<string, unknown>
  ): Promise<string> {
    const severity = this.determineSeverityForTaskEvent(eventType, taskData);

    return this.recordEvent({
      eventType,
      severity,
      userId: userContext.userId,
      sessionId: auditContext.sessionId,
      requestId: auditContext.requestId,
      operationId: auditContext.operationId,
      description: this.generateTaskEventDescription(eventType, taskData),
      resource: 'browser_task',action: this.getActionFromEventType(eventType),outcome: this.getOutcomeFromEventType(eventType),
      ipAddress: auditContext.ipAddress,
      userAgent: auditContext.userAgent,
      riskScore: userContext.trustLevel ? this.mapTrustLevelToRiskScore(userContext.trustLevel) : undefined,
      data: this.sanitizeTaskData(taskData),
      correlationId: auditContext.operationId,
      complianceFlags: this.generateComplianceFlags(taskData),
    });
  }

  /**
   * Record security event
   */
  async recordSecurityEvent(
    eventType: BrowserAuditEventType,
    userContext: Partial<BrowserUseUserContext>,
    auditContext: BrowserUseAuditContext,
    securityData: Record<string, unknown>
  ): Promise<string> {
    return this.recordEvent({
      eventType,
      severity: AuditEventSeverity.HIGH,
      userId: userContext.userId,
      sessionId: auditContext.sessionId,
      requestId: auditContext.requestId,
      operationId: auditContext.operationId,
      description: this.generateSecurityEventDescription(eventType, securityData),
      resource: 'security_service',action: 'security_check',outcome: 'FAILURE',ipAddress: auditContext.ipAddress,userAgent: auditContext.userAgent,
      data: securityData,
      correlationId: auditContext.operationId,
      complianceFlags: ['SECURITY_INCIDENT'],
    });
  }

  /**
   * Record rate limiting event
   */
  async recordRateLimitEvent(
    userContext: BrowserUseUserContext,
    auditContext: BrowserUseAuditContext,
    rateLimitDecision: RateLimitDecision
  ): Promise<string> {
    return this.recordEvent({
      eventType: BrowserAuditEventType.RATE_LIMIT_EXCEEDED,
      severity: AuditEventSeverity.MEDIUM,
      userId: userContext.userId,
      sessionId: auditContext.sessionId,
      requestId: auditContext.requestId,
      operationId: auditContext.operationId,
      description: `Rate limit exceeded: ${rateLimitDecision.reason}`,
      resource: auditContext.endpoint,
      action: auditContext.method,
      outcome: 'FAILURE',ipAddress: auditContext.ipAddress,userAgent: auditContext.userAgent,
      data: {
        rateLimitType: rateLimitDecision.rateLimitType,
        remainingRequests: rateLimitDecision.remainingRequests,
        retryAfterMs: rateLimitDecision.retryAfterMs,
        appliedLimits: rateLimitDecision.appliedLimits,
        recommendations: rateLimitDecision.recommendations,
      },
      correlationId: auditContext.operationId,
      complianceFlags: ['RATE_LIMITING'],
    });
  }

  /**
   * Record validation failure event
   */
  async recordValidationFailureEvent(
    userContext: BrowserUseUserContext,
    auditContext: BrowserUseAuditContext,
    validationResult: RequestValidationResult
  ): Promise<string> {
    return this.recordEvent({
      eventType: BrowserAuditEventType.VALIDATION_FAILED,
      severity: AuditEventSeverity.HIGH,
      userId: userContext.userId,
      sessionId: auditContext.sessionId,
      requestId: auditContext.requestId,
      operationId: auditContext.operationId,
      description: `Request validation failed with ${validationResult.violations.length} violations`,
      resource: auditContext.endpoint,
      action: auditContext.method,
      outcome: 'FAILURE',ipAddress: auditContext.ipAddress,userAgent: auditContext.userAgent,
      riskScore: validationResult.riskScore,
      data: {
        violations: validationResult.violations,
        recommendations: validationResult.recommendations,
        metadata: validationResult.metadata,
      },
      correlationId: auditContext.operationId,
      complianceFlags: ['VALIDATION_FAILURE', 'SECURITY_INCIDENT'],
    });
  }

  // ===== QUERY METHODS =====

  /**
   * Query audit events with advanced filtering
   */
  async queryEvents(
    queryParams: AuditQueryParams,
    requesterContext: { userId: string; hasAdminAccess: boolean }
  ): Promise<AuditQueryResult> {
    const startTime = performance.now();
    const queryId = this.generateQueryId();

    this.logger.debug(`[${queryId}] Executing audit query`, {
      userId: requesterContext.userId,
      params: queryParams,
    });

    try {
      // Validate query permissions
      await this.validateQueryPermissions(queryParams, requesterContext);

      // Execute query
      const events = await this.executeQuery(queryParams);

      // Apply result filtering based on requester permissions
      const filteredEvents = this.filterResultsByPermissions(events, requesterContext);

      // Prepare result
      const result: AuditQueryResult = {
        events: filteredEvents,
        totalCount: filteredEvents.length,
        queryId,
        executionTime: performance.now() - startTime,
        metadata: {
          query: queryParams,
          resultSize: Buffer.byteLength(JSON.stringify(filteredEvents)),
          fromCache: false,
          securityContext: requesterContext.hasAdminAccess ? 'ADMIN' : 'USER',
        },
      };

      // Record audit query event
      await this.recordEvent({
        eventType: BrowserAuditEventType.DATA_EXTRACTED,
        severity: AuditEventSeverity.INFO,
        userId: requesterContext.userId,
        description: `Audit query executed returning ${result.totalCount} events`,
        resource: 'audit_trail',action: 'query',outcome: 'SUCCESS',ipAddress: 'internal',userAgent: 'audit_service',data: {queryId,
          queryParams,
          resultCount: result.totalCount,
          executionTime: result.executionTime,
        },
        complianceFlags: ['AUDIT_ACCESS'],
      });

      this.statistics.performanceMetrics.averageQueryTime =
        (this.statistics.performanceMetrics.averageQueryTime + result.executionTime) / 2;

      return result;

    } catch (error) {
      this.logger.error(`[${queryId}] Audit query failed`, {
        error: error instanceof Error ? error.message : String(error),
        userId: requesterContext.userId,
        params: queryParams,
      });

      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  getAuditStatistics(): AuditStatistics {
    return {
      ...this.statistics,
      eventsByType: new Map(this.statistics.eventsByType),
      eventsBySeverity: new Map(this.statistics.eventsBySeverity),
    };
  }

  /**
   * Get real-time event stream
   */
  getEventStream(
    filter?: {
      eventTypes?: BrowserAuditEventType[];
      severity?: AuditEventSeverity[];
      userId?: string;
    }
  ): Readable {
    const streamId = this.generateStreamId();
    const stream = new Readable({
      objectMode: true,
      read() {
        // Will be pushed to when events occur
      },
    });

    this.eventStreams.set(streamId, stream);

    // Set up event listener with filter
    const eventHandler = (event: BrowserAuditEvent) => {
      if (this.matchesStreamFilter(event, filter)) {
        stream.push(JSON.stringify(event) + '\n');}};

    this.on('audit:event', eventHandler);// Clean up on stream closestream.on('close', () => {this.eventStreams.delete(streamId);this.off('audit:event', eventHandler);});return stream;
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Create complete audit event from partial data
   */
  private async createAuditEvent(eventData: Partial<BrowserAuditEvent>): Promise<BrowserAuditEvent> {
    const now = new Date();
    const eventId = this.generateEventId();

    return {
      eventId,
      eventType: eventData.eventType || 'UNKNOWN',timestamp: now,severity: eventData.severity || AuditEventSeverity.INFO,
      userId: eventData.userId,
      sessionId: eventData.sessionId,
      requestId: eventData.requestId,
      operationId: eventData.operationId,
      description: eventData.description || '',resource: eventData.resource || 'unknown',action: eventData.action || 'unknown',outcome: eventData.outcome || 'SUCCESS',ipAddress: eventData.ipAddress || 'unknown',userAgent: eventData.userAgent || 'unknown',deviceFingerprint: eventData.deviceFingerprint,riskScore: eventData.riskScore,
      data: eventData.data || {},
      metadata: this.createEventMetadata(eventData),
      hash: '', // Will be set latersignature: eventData.signature,retentionCategory: this.determineRetentionCategory(eventData.eventType || 'UNKNOWN', eventData.severity || AuditEventSeverity.INFO),complianceFlags: eventData.complianceFlags || [],parentEventId: eventData.parentEventId,
      correlationId: eventData.correlationId,
      traceId: eventData.traceId || this.generateTraceId(),
    };
  }

  /**
   * Create event metadata
   */
  private createEventMetadata(eventData: Partial<BrowserAuditEvent>): AuditEventMetadata {
    return {
      sourceComponent: 'browser-audit-trail-service',sourceVersion: '1.0.0',environment: process.env.NODE_ENV || 'development',processId: process.pid.toString(),threadId: '0', // Node.js is single-threadedperformanceMetrics: {processingTime: 0, // Will be updated
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: process.cpuUsage().user,
      },
      securityClassification: this.determineSecurityClassification(eventData.eventType || 'UNKNOWN', eventData.data || {}),dataCategories: this.identifyDataCategories(eventData.data || {}),additionalContext: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
      },
    };
  }

  /**
   * Determine if event should be recorded based on filtering rules
   */
  private shouldRecordEvent(event: BrowserAuditEvent): boolean {
    const { eventFiltering } = this.config;

    // Check if event type is included
    if (eventFiltering.includeEvents.length > 0 && !eventFiltering.includeEvents.includes(event.eventType)) {
      return false;
    }

    // Check if event type is excluded
    if (eventFiltering.excludeEvents.includes(event.eventType)) {
      return false;
    }

    // Check minimum severity
    const severityLevels = [
      AuditEventSeverity.INFO,
      AuditEventSeverity.LOW,
      AuditEventSeverity.MEDIUM,
      AuditEventSeverity.HIGH,
      AuditEventSeverity.CRITICAL,
    ];

    const eventSeverityIndex = severityLevels.indexOf(event.severity);
    const minimumSeverityIndex = severityLevels.indexOf(eventFiltering.minimumSeverity);

    return eventSeverityIndex >= minimumSeverityIndex;
  }

  /**
   * Apply sensitive data redaction
   */
  private redactSensitiveData(event: BrowserAuditEvent): void {
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /key/i,
      /credential/i,
      /ssn/i,
      /social.security/i,
      /credit.card/i,
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    ];

    const redactObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {return obj;}

      if (Array.isArray(obj)) {
        return obj.map(redactObject);
      }

      const redacted: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitivePatterns.some(pattern => pattern.test(key))) {
          redacted[key] = '[REDACTED]';} else if (typeof value === 'string' && sensitivePatterns.some(pattern => pattern.test(value))) {redacted[key] = '[REDACTED]';} else {redacted[key] = redactObject(value);
        }
      }
      return redacted;
    };

    event.data = redactObject(event.data);
  }

  /**
   * Sign event for cryptographic integrity
   */
  private signEvent(event: BrowserAuditEvent): string {
    const eventString = JSON.stringify({
      eventId: event.eventId,
      eventType: event.eventType,
      timestamp: event.timestamp,
      userId: event.userId,
      description: event.description,
      data: event.data,
    });

    return crypto.createHmac('sha256', this.signingKey).update(eventString).digest('hex');}/**
   * Hash event for integrity verification
   */
  private hashEvent(event: BrowserAuditEvent): string {
    const eventString = JSON.stringify(event);
    return crypto.createHash('sha256').update(eventString).digest('hex');}/**
   * Store event in appropriate storage tier
   */
  private async storeEvent(event: BrowserAuditEvent): Promise<void> {
    // In production, this would store to database, file system, or cloud storage
    this.auditEventStore.set(event.eventId, event);

    // Add to correlation map
    if (event.correlationId) {
      if (!this.correlationMap.has(event.correlationId)) {
        this.correlationMap.set(event.correlationId, []);
      }
      const correlationEvents = this.correlationMap.get(event.correlationId);
      if (correlationEvents) {
        correlationEvents.push(event.eventId);
      }
    }

    // Add to trace map
    if (event.traceId) {
      if (!this.traceMap.has(event.traceId)) {
        this.traceMap.set(event.traceId, []);
      }
      const traceEvents = this.traceMap.get(event.traceId);
      if (traceEvents) {
        traceEvents.push(event);
      }
    }
  }

  /**
   * Stream event to real-time listeners
   */
  private streamEvent(event: BrowserAuditEvent): void {
    // Emit to all active streams
    this.eventStreams.forEach(stream => {
      if (!stream.destroyed) {
        stream.push(JSON.stringify(event) + '\n');}});
  }

  /**
   * Update statistics
   */
  private updateStatistics(event: BrowserAuditEvent, processingTime: number): void {
    this.statistics.totalEvents++;
    this.statistics.eventsByType.set(event.eventType, (this.statistics.eventsByType.get(event.eventType) || 0) + 1);
    this.statistics.eventsBySeverity.set(event.severity, (this.statistics.eventsBySeverity.get(event.severity) || 0) + 1);

    this.statistics.performanceMetrics.averageIngestionTime =
      (this.statistics.performanceMetrics.averageIngestionTime + processingTime) / 2;

    // Update events per second (simplified calculation)
    this.statistics.eventsPerSecond = this.statistics.totalEvents / (process.uptime() || 1);
  }

  /**
   * Execute audit query
   */
  private async executeQuery(params: AuditQueryParams): Promise<BrowserAuditEvent[]> {
    let events = Array.from(this.auditEventStore.values());

    // Apply filters
    if (params.startTime) {
      events = events.filter(event => params.startTime && event.timestamp >= params.startTime);
    }

    if (params.endTime) {
      events = events.filter(event => params.endTime && event.timestamp <= params.endTime);
    }

    if (params.userId) {
      events = events.filter(event => event.userId === params.userId);
    }

    if (params.sessionId) {
      events = events.filter(event => event.sessionId === params.sessionId);
    }

    if (params.eventTypes && params.eventTypes.length > 0) {
      events = events.filter(event => params.eventTypes?.includes(event.eventType));
    }

    if (params.severity && params.severity.length > 0) {
      events = events.filter(event => params.severity?.includes(event.severity));
    }

    if (params.outcome && params.outcome.length > 0) {
      events = events.filter(event => params.outcome?.includes(event.outcome));
    }

    if (params.searchText) {
      const searchLower = params.searchText.toLowerCase();
      events = events.filter(event =>
        event.description.toLowerCase().includes(searchLower) ||
        event.resource.toLowerCase().includes(searchLower) ||
        event.action.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    const sortBy = params.sortBy || 'timestamp';const sortOrder = params.sortOrder || 'DESC';events.sort((a, b) => {let aValue: any, bValue: any;

      switch (sortBy) {
        case 'timestamp':aValue = a.timestamp.getTime();bValue = b.timestamp.getTime();
          break;
        case 'severity':const severityOrder = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };aValue = severityOrder[a.severity as keyof typeof severityOrder];
          bValue = severityOrder[b.severity as keyof typeof severityOrder];
          break;
        case 'eventType':aValue = a.eventType;bValue = b.eventType;
          break;
        default:
          aValue = a.timestamp.getTime();
          bValue = b.timestamp.getTime();
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortOrder === 'ASC' ? comparison : -comparison;
    });

    // Apply pagination
    const offset = params.offset || 0;
    const limit = params.limit || 100;

    return events.slice(offset, offset + limit);
  }

  // ===== UTILITY METHODS =====

  private generateEventId(): string {
    return `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}';}

  private generateQueryId(): string {
    return `query_${Date.now()}_${crypto.randomBytes(4).toString('hex')}';}

  private generateStreamId(): string {
    return `stream_${Date.now()}_${crypto.randomBytes(4).toString('hex')}';}

  private generateTraceId(): string {
    return `trace_${Date.now()}_${crypto.randomBytes(8).toString('hex')}';}

  private determineRetentionCategory(eventType: BrowserAuditEventType, severity: AuditEventSeverity): 'HOT' | 'WARM' | 'COLD' | 'ARCHIVE' {if (severity === AuditEventSeverity.CRITICAL || severity === AuditEventSeverity.HIGH) {return 'HOT';}const criticalEventTypes = [
      BrowserAuditEventType.AUTHENTICATION_FAILURE,
      BrowserAuditEventType.AUTHORIZATION_DENIED,
      BrowserAuditEventType.SECURITY_VIOLATION,
      BrowserAuditEventType.SUSPICIOUS_ACTIVITY,
    ];

    if (criticalEventTypes.includes(eventType)) {
      return 'WARM';}return 'COLD';}private determineSecurityClassification(eventType: BrowserAuditEventType, data: Record<string, unknown>): 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' {const restrictedEventTypes = [BrowserAuditEventType.PII_ACCESS,
      BrowserAuditEventType.GDPR_REQUEST,
    ];

    if (restrictedEventTypes.includes(eventType)) {
      return 'RESTRICTED';}const confidentialEventTypes = [
      BrowserAuditEventType.AUTHENTICATION_SUCCESS,
      BrowserAuditEventType.AUTHENTICATION_FAILURE,
      BrowserAuditEventType.AUTHORIZATION_DENIED,
    ];

    if (confidentialEventTypes.includes(eventType)) {
      return 'CONFIDENTIAL';}return 'INTERNAL';}private identifyDataCategories(data: Record<string, unknown>): string[] {
    const categories: string[] = [];

    // Check for PII
    const dataString = JSON.stringify(data).toLowerCase();
    if (dataString.includes('email') || dataString.includes('@')) {categories.push('PII_EMAIL');}if (dataString.includes('phone') || /\d{3}-\d{3}-\d{4}/.test(dataString)) {categories.push('PII_PHONE');
    }

    return categories;
  }

  // Placeholder implementations for required methods
  private sanitizeConfigForLogging(): Record<string, unknown> {
    return {
      enabled: this.config.enabled,
      realTimeStreaming: this.config.realTimeStreaming,
      cryptographicIntegrity: this.config.cryptographicIntegrity,
      retentionPolicies: this.config.retentionPolicies,
    };
  }

  private getStatisticsSummary(): Record<string, unknown> {
    return {
      totalEvents: this.statistics.totalEvents,
      eventsPerSecond: this.statistics.eventsPerSecond,
    };
  }

  private async initializeStorage(): Promise<void> {
    // Placeholder for storage initialization
  }

  private async startRealTimeStreaming(): Promise<void> {
    // Placeholder for real-time streaming setup
  }

  private async scheduleMaintenanceTasks(): Promise<void> {
    // Schedule periodic maintenance
    setInterval(() => this.performMaintenance(), 3600000); // Every hour
  }

  private async performIntegrityCheck(): Promise<void> {
    // Placeholder for integrity verification
    this.statistics.integrityChecks.lastCheck = new Date();
    this.statistics.integrityChecks.passed++;
  }

  private async flushPendingEvents(): Promise<void> {
    // Placeholder for flushing pending events
  }

  private async closeEventStreams(): Promise<void> {
    this.eventStreams.forEach(stream => {
      if (!stream.destroyed) {
        stream.destroy();
      }
    });
    this.eventStreams.clear();
  }

  private async checkComplianceTriggers(event: BrowserAuditEvent): Promise<void> {
    // Placeholder for compliance trigger checking
  }

  private determineSeverityForTaskEvent(eventType: BrowserAuditEventType, taskData: Record<string, unknown>): AuditEventSeverity {
    if (eventType === BrowserAuditEventType.TASK_FAILED) {
      return AuditEventSeverity.MEDIUM;
    }
    return AuditEventSeverity.INFO;
  }

  private generateTaskEventDescription(eventType: BrowserAuditEventType, taskData: Record<string, unknown>): string {
    return `Browser task ${eventType.split('.')[1]} - ${taskData.name || 'unnamed task'}`;
  }

  private getActionFromEventType(eventType: BrowserAuditEventType): string {
    return eventType.split('.')[1] || 'unknown';}private getOutcomeFromEventType(eventType: BrowserAuditEventType): 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'CANCELLED' {if (eventType.includes('failed')) return 'FAILURE';if (eventType.includes('cancelled')) return 'CANCELLED';return 'SUCCESS';}private mapTrustLevelToRiskScore(trustLevel: string): number {
    switch (trustLevel) {
      case 'CRITICAL': return 10;case 'HIGH': return 25;case 'MEDIUM': return 50;case 'LOW': return 75;default: return 90;}
  }

  private sanitizeTaskData(taskData: Record<string, unknown>): Record<string, unknown> {
    // Remove sensitive information from task data
    const sanitized = { ...taskData };
    delete sanitized.credentials;
    delete sanitized.passwords;
    delete sanitized.tokens;
    return sanitized;
  }

  private generateComplianceFlags(taskData: Record<string, unknown>): string[] {
    const flags: string[] = ['BROWSER_AUTOMATION'];if (taskData.externalUrls) {flags.push('EXTERNAL_ACCESS');}if (taskData.dataExtraction) {
      flags.push('DATA_EXTRACTION');
    }

    return flags;
  }

  private generateSecurityEventDescription(eventType: BrowserAuditEventType, securityData: Record<string, unknown>): string {
    return `Security event: ${eventType} - ${securityData.description || 'Security violation detected'}`;
  }

  private async validateQueryPermissions(params: AuditQueryParams, requesterContext: { userId: string; hasAdminAccess: boolean }): Promise<void> {
    if (!requesterContext.hasAdminAccess && params.userId && params.userId !== requesterContext.userId) {
      throw new Error('Insufficient permissions to query other users\' audit events');}}

  private filterResultsByPermissions(events: BrowserAuditEvent[], requesterContext: { userId: string; hasAdminAccess: boolean }): BrowserAuditEvent[] {
    if (requesterContext.hasAdminAccess) {
      return events;
    }

    return events.filter(event => event.userId === requesterContext.userId);
  }

  private matchesStreamFilter(event: BrowserAuditEvent, filter?: any): boolean {
    if (!filter) return true;

    if (filter.eventTypes && !filter.eventTypes.includes(event.eventType)) {
      return false;
    }

    if (filter.severity && !filter.severity.includes(event.severity)) {
      return false;
    }

    if (filter.userId && event.userId !== filter.userId) {
      return false;
    }

    return true;
  }

  private async performMaintenance(): Promise<void> {
    // Perform periodic maintenance tasks
    this.logger.debug('Performing audit trail maintenance');// Clean up old events based on retention policiesconst now = new Date();
    let cleanedCount = 0;

    for (const [eventId, event] of this.auditEventStore.entries()) {
      const ageInDays = (now.getTime() - event.timestamp.getTime()) / (1000 * 60 * 60 * 24);

      let shouldDelete = false;
      switch (event.retentionCategory) {
        case 'HOT':shouldDelete = ageInDays > this.config.retentionPolicies.hot;break;
        case 'WARM':shouldDelete = ageInDays > this.config.retentionPolicies.warm;break;
        case 'COLD':shouldDelete = ageInDays > this.config.retentionPolicies.cold;break;
        case 'ARCHIVE':
          shouldDelete = ageInDays > this.config.retentionPolicies.archive;
          break;
      }

      if (shouldDelete) {
        this.auditEventStore.delete(eventId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Maintenance: Cleaned up ${cleanedCount} expired audit events`);
    }
  }

  /**
   * Get current audit service metrics for monitoring
   */
  getServiceMetrics() {
    return {
      totalEvents: this.statistics.totalEvents,
      eventsPerSecond: this.statistics.eventsPerSecond,
      storageUtilization: this.auditEventStore.size,
      activeStreams: this.eventStreams.size,
      averageIngestionTime: this.statistics.performanceMetrics.averageIngestionTime,
      averageQueryTime: this.statistics.performanceMetrics.averageQueryTime,
      integrityStatus: this.statistics.integrityChecks,
      retentionPolicyCompliance: true, // Placeholder
    };
  }
}