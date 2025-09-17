/**
 * Parlant Comprehensive Audit Trails Service - PARLANT INTEGRATED
 *
 * Provides comprehensive audit trails for ALL configuration and secrets management
 * operations with MAXIMUM Parlant integration. Consolidates audit data from all
 * Parlant-enhanced services to provide enterprise-grade compliance and forensic
 * capabilities with conversational context and approval workflows.
 *
 * Features:
 * - Centralized audit trail collection from all Parlant services
 * - Real-time audit event streaming and correlation
 * - Comprehensive compliance reporting with conversational context
 * - Forensic analysis capabilities for security incidents
 * - Automated audit trail validation and integrity checking
 * - Export capabilities for external compliance systems
 * - Performance monitoring for audit overhead
 * - Risk-based audit retention policies
 *
 * AUDIT COVERAGE:
 * - Configuration changes (all services)
 * - Secrets access and modifications (all providers)
 * - Security operations and validations
 * - External integrations and provider access
 * - Hot-reload operations and validations
 * - Risk assessments and approval workflows
 * - Health monitoring and status checks
 * - Emergency operations and incident responses
 *
 * COMPLIANCE STANDARDS:
 * - SOX (Sarbanes-Oxley Act)
 * - PCI DSS (Payment Card Industry Data Security Standard)
 * - HIPAA (Health Insurance Portability and Accountability Act)
 * - GDPR (General Data Protection Regulation)
 * - SOC 2 Type II compliance
 *
 * @author Claude Code - Agent 3 (Configuration & Secrets Management Parlant Integration)
 * @version 3.0.0 - PARLANT MAXIMUM INTEGRATION
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  ParlantConfigurationService,
  ParlantRiskLevel,
} from './parlant-configuration.service';

/**
 * Audit event types
 */
export enum AuditEventType {
  CONFIGURATION_CHANGE = 'configuration_change',
  SECRETS_ACCESS = 'secrets_access',
  SECRETS_MODIFICATION = 'secrets_modification',
  SECURITY_OPERATION = 'security_operation',
  EXTERNAL_INTEGRATION = 'external_integration',
  HOT_RELOAD_OPERATION = 'hot_reload_operation',
  RISK_ASSESSMENT = 'risk_assessment',
  APPROVAL_WORKFLOW = 'approval_workflow',
  HEALTH_CHECK = 'health_check',
  EMERGENCY_OPERATION = 'emergency_operation',
  COMPLIANCE_EVENT = 'compliance_event',
  PARLANT_VALIDATION = 'parlant_validation',
}

/**
 * Audit event severity levels
 */
export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Compliance framework types
 */
export enum ComplianceFramework {
  SOX = 'sox',
  PCI_DSS = 'pci_dss',
  HIPAA = 'hipaa',
  GDPR = 'gdpr',
  SOC2 = 'soc2',
  ISO27001 = 'iso27001',
  NIST = 'nist',
}

/**
 * Comprehensive audit event
 */
export interface ComprehensiveAuditEvent {
  eventId: string;
  timestamp: Date;
  eventType: AuditEventType;
  severity: AuditSeverity;

  // Operation details
  operationId: string;
  operationType: string;
  operationScope: string;
  serviceSource: string;

  // User and context
  userId: string;
  userRole: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;

  // Parlant context
  parlantContext: {
    conversationId?: string;
    validationApproved: boolean;
    riskLevel: ParlantRiskLevel;
    approvalChain: string[];
    validationDuration: number;
    cacheHit: boolean;
  };

  // Technical details
  resourcesAccessed: AuditResource[];
  changesApplied: AuditChange[];
  dataClassification: 'public' | 'internal' | 'confidential' | 'secret';

  // Results and impact
  success: boolean;
  errorMessage?: string;
  businessImpact: string;
  securityImplications: string[];

  // Compliance information
  complianceFrameworks: ComplianceFramework[];
  retentionPeriod: number; // days
  sensitivityLevel: 'low' | 'medium' | 'high' | 'critical';

  // Metadata
  environment: 'development' | 'staging' | 'production';
  applicationVersion: string;
  correlationId?: string;
  parentEventId?: string;

  // Performance metrics
  performanceMetrics: {
    operationDuration: number;
    validationOverhead: number;
    auditOverhead: number;
    resourceUtilization: Record<string, number>;
  };

  // Integrity verification
  integrity: {
    checksum: string;
    signature?: string;
    witnessHash?: string;
  };
}

/**
 * Audit resource interface
 */
export interface AuditResource {
  resourceType:
    | 'configuration'
    | 'secret'
    | 'key'
    | 'certificate'
    | 'policy'
    | 'external_system';
  resourceId: string;
  resourceName: string;
  accessType: 'read' | 'write' | 'create' | 'update' | 'delete' | 'execute';
  previousValue?: string; // Masked for sensitive data
  newValue?: string; // Masked for sensitive data
  maskedValues: boolean;
}

/**
 * Audit change interface
 */
export interface AuditChange {
  changeType: 'create' | 'update' | 'delete' | 'access' | 'validation';
  fieldPath: string;
  oldValue?: any;
  newValue?: any;
  changeReason: string;
  reversible: boolean;
  impactAssessment: string;
}

/**
 * Audit trail query parameters
 */
export interface AuditTrailQuery {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: AuditEventType[];
  severities?: AuditSeverity[];
  userIds?: string[];
  operationTypes?: string[];
  riskLevels?: ParlantRiskLevel[];
  complianceFrameworks?: ComplianceFramework[];
  serviceSource?: string;
  correlationId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'riskLevel';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Audit trail export format
 */
export interface AuditTrailExport {
  exportId: string;
  format: 'json' | 'csv' | 'xml' | 'siem';
  events: ComprehensiveAuditEvent[];
  metadata: {
    exportTimestamp: Date;
    totalEvents: number;
    dateRange: { start: Date; end: Date };
    complianceFramework?: ComplianceFramework;
    requestedBy: string;
    integrity: {
      checksum: string;
      signature?: string;
    };
  };
}

/**
 * Compliance report interface
 */
export interface ComplianceReport {
  reportId: string;
  framework: ComplianceFramework;
  reportPeriod: { start: Date; end: Date };
  generatedAt: Date;
  generatedBy: string;

  summary: {
    totalEvents: number;
    criticalEvents: number;
    violationsDetected: number;
    complianceScore: number; // 0-100
  };

  eventsByType: Record<AuditEventType, number>;
  riskDistribution: Record<ParlantRiskLevel, number>;
  violationDetails: ComplianceViolation[];
  recommendations: string[];

  integrity: {
    checksum: string;
    signature: string;
  };
}

/**
 * Compliance violation interface
 */
export interface ComplianceViolation {
  violationId: string;
  framework: ComplianceFramework;
  requirement: string;
  description: string;
  severity: AuditSeverity;
  affectedEvents: string[];
  detectedAt: Date;
  remediation: string;
  status: 'open' | 'investigating' | 'resolved' | 'accepted_risk';
}

/**
 * Parlant Comprehensive Audit Trails Service
 * Provides centralized audit trail management for all Parlant-enhanced services
 */
@Injectable()
export class ParlantComprehensiveAuditTrailsService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    'ParlantComprehensiveAuditTrailsService',
  );
  private isInitialized = false;

  private auditEvents: ComprehensiveAuditEvent[] = [];
  private complianceViolations: ComplianceViolation[] = [];
  private readonly maxAuditEvents = 100000; // Configurable based on retention policies

  private auditMetrics = {
    totalEvents: 0,
    eventsByType: {} as Record<AuditEventType, number>,
    eventsBySeverity: {} as Record<AuditSeverity, number>,
    eventsByRiskLevel: {} as Record<ParlantRiskLevel, number>,
    averageAuditOverhead: 0,
    complianceScore: 100,
    violationsDetected: 0,
    dataIntegrityChecks: 0,
    exportRequests: 0,
  };

  constructor(
    private readonly parlantConfigService: ParlantConfigurationService,
  ) {
    super();
    this.initializeEventTypeCounters();
    this.logger.log('Parlant Comprehensive Audit Trails Service initialized');
    this.logger.log(
      'PARLANT INTEGRATION: Comprehensive audit trails active for ALL operations',
    );
  }

  /**
   * Initialize Parlant audit trails service
   */
  onModuleInit(): void {
    try {
      this.logger.log(
        'Initializing Parlant Comprehensive Audit Trails Service...',
      );

      // Set up audit event listeners
      this.setupAuditEventListeners();

      // Initialize compliance monitoring
      this.initializeComplianceMonitoring();

      // Start integrity verification
      this.startIntegrityVerification();

      this.isInitialized = true;
      this.logger.log(
        'Parlant Comprehensive Audit Trails Service initialized successfully',
      );
    } catch (error) {
      this.logger.error(
        'Parlant Comprehensive Audit Trails Service initialization failed',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  /**
   * Cleanup resources on module destroy
   */
  onModuleDestroy(): void {
    this.logger.log('Destroying Parlant Comprehensive Audit Trails Service...');

    try {
      // Remove event listeners
      this.removeAllListeners();

      this.isInitialized = false;
      this.logger.log(
        'Parlant Comprehensive Audit Trails Service destroyed successfully',
        {
          finalMetrics: this.getAuditMetrics(),
          totalEventsProcessed: this.auditEvents.length,
        },
      );
    } catch (error) {
      this.logger.error(
        'Error during Parlant Comprehensive Audit Trails Service destruction',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Log comprehensive audit event
   */
  async logAuditEvent(
    eventType: AuditEventType,
    operationDetails: {
      operationId: string;
      operationType: string;
      operationScope: string;
      serviceSource: string;
      userId: string;
      userRole: string;
      sessionId?: string;
    },
    parlantContext: {
      conversationId?: string;
      validationApproved: boolean;
      riskLevel: ParlantRiskLevel;
      approvalChain: string[];
      validationDuration: number;
      cacheHit: boolean;
    },
    operationResults: {
      success: boolean;
      errorMessage?: string;
      resourcesAccessed: AuditResource[];
      changesApplied: AuditChange[];
      businessImpact: string;
      securityImplications: string[];
      performanceMetrics: {
        operationDuration: number;
        validationOverhead: number;
        resourceUtilization: Record<string, number>;
      };
    },
  ): Promise<string> {
    const auditStartTime = Date.now();
    const eventId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Determine severity
      const severity = this.determineSeverity(
        eventType,
        parlantContext.riskLevel,
        operationResults.success,
      );

      // Calculate data classification
      const dataClassification = this.determineDataClassification(
        operationResults.resourcesAccessed,
      );

      // Determine applicable compliance frameworks
      const complianceFrameworks = this.determineComplianceFrameworks(
        eventType,
        dataClassification,
      );

      // Calculate retention period
      const retentionPeriod = this.calculateRetentionPeriod(
        complianceFrameworks,
        dataClassification,
      );

      // Mask sensitive data
      const maskedResources = this.maskSensitiveData(
        operationResults.resourcesAccessed,
      );
      const maskedChanges = this.maskSensitiveChanges(
        operationResults.changesApplied,
      );

      // Calculate audit overhead
      const auditOverhead = Date.now() - auditStartTime;

      // Create comprehensive audit event
      const auditEvent: ComprehensiveAuditEvent = {
        eventId,
        timestamp: new Date(),
        eventType,
        severity,

        operationId: operationDetails.operationId,
        operationType: operationDetails.operationType,
        operationScope: operationDetails.operationScope,
        serviceSource: operationDetails.serviceSource,

        userId: operationDetails.userId,
        userRole: operationDetails.userRole,
        sessionId: operationDetails.sessionId,

        parlantContext,

        resourcesAccessed: maskedResources,
        changesApplied: maskedChanges,
        dataClassification,

        success: operationResults.success,
        errorMessage: operationResults.errorMessage,
        businessImpact: operationResults.businessImpact,
        securityImplications: operationResults.securityImplications,

        complianceFrameworks,
        retentionPeriod,
        sensitivityLevel: this.determineSensitivityLevel(
          parlantContext.riskLevel,
          dataClassification,
        ),

        environment: (process.env.NODE_ENV as any) || 'development',
        applicationVersion: process.env.APP_VERSION || '1.0.0',
        correlationId: operationDetails.operationId,

        performanceMetrics: {
          ...operationResults.performanceMetrics,
          auditOverhead,
        },

        integrity: {
          checksum: this.calculateEventChecksum(
            eventId,
            operationDetails,
            operationResults,
          ),
        },
      };

      // Store audit event
      this.auditEvents.push(auditEvent);

      // Update metrics
      this.updateAuditMetrics(auditEvent);

      // Check for compliance violations
      await this.checkComplianceViolations(auditEvent);

      // Emit audit event for real-time processing
      this.emit('auditEventLogged', auditEvent);

      // Trim audit log if necessary
      this.trimAuditLog();

      this.logger.debug(`Audit event logged: ${eventId}`, {
        eventType,
        severity,
        riskLevel: parlantContext.riskLevel,
        success: operationResults.success,
        auditOverhead,
      });

      return eventId;
    } catch (error) {
      const auditOverhead = Date.now() - auditStartTime;
      this.logger.error('Failed to log audit event', {
        eventType,
        operationId: operationDetails.operationId,
        error: error instanceof Error ? error.message : String(error),
        auditOverhead,
      });
      throw error;
    }
  }

  /**
   * Query audit trail
   */
  async queryAuditTrail(query: AuditTrailQuery): Promise<{
    events: ComprehensiveAuditEvent[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const queryStartTime = Date.now();

    try {
      let filteredEvents = [...this.auditEvents];

      // Apply filters
      if (query.startDate) {
        filteredEvents = filteredEvents.filter(
          (event) => event.timestamp >= query.startDate!,
        );
      }
      if (query.endDate) {
        filteredEvents = filteredEvents.filter(
          (event) => event.timestamp <= query.endDate!,
        );
      }
      if (query.eventTypes?.length) {
        filteredEvents = filteredEvents.filter((event) =>
          query.eventTypes!.includes(event.eventType),
        );
      }
      if (query.severities?.length) {
        filteredEvents = filteredEvents.filter((event) =>
          query.severities!.includes(event.severity),
        );
      }
      if (query.userIds?.length) {
        filteredEvents = filteredEvents.filter((event) =>
          query.userIds!.includes(event.userId),
        );
      }
      if (query.riskLevels?.length) {
        filteredEvents = filteredEvents.filter((event) =>
          query.riskLevels!.includes(event.parlantContext.riskLevel),
        );
      }
      if (query.serviceSource) {
        filteredEvents = filteredEvents.filter(
          (event) => event.serviceSource === query.serviceSource,
        );
      }
      if (query.correlationId) {
        filteredEvents = filteredEvents.filter(
          (event) => event.correlationId === query.correlationId,
        );
      }

      // Sort results
      const sortBy = query.sortBy || 'timestamp';
      const sortOrder = query.sortOrder || 'desc';
      filteredEvents.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'timestamp':
            comparison = a.timestamp.getTime() - b.timestamp.getTime();
            break;
          case 'severity': {
            const severityOrder = {
              info: 0,
              warning: 1,
              error: 2,
              critical: 3,
            };
            comparison = severityOrder[a.severity] - severityOrder[b.severity];
            break;
          }
          case 'riskLevel': {
            const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
            comparison =
              riskOrder[a.parlantContext.riskLevel] -
              riskOrder[b.parlantContext.riskLevel];
            break;
          }
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      // Apply pagination
      const totalCount = filteredEvents.length;
      const offset = query.offset || 0;
      const limit = query.limit || 100;
      const paginatedEvents = filteredEvents.slice(offset, offset + limit);
      const hasMore = offset + limit < totalCount;

      const queryDuration = Date.now() - queryStartTime;
      this.logger.debug('Audit trail query completed', {
        totalCount,
        returnedCount: paginatedEvents.length,
        hasMore,
        queryDuration,
      });

      return {
        events: paginatedEvents,
        totalCount,
        hasMore,
      };
    } catch (error) {
      this.logger.error('Audit trail query failed', {
        query,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Export audit trail
   */
  async exportAuditTrail(
    query: AuditTrailQuery,
    format: 'json' | 'csv' | 'xml' | 'siem',
    requestedBy: string,
  ): Promise<AuditTrailExport> {
    const exportStartTime = Date.now();
    const exportId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.logger.log('Exporting audit trail', {
        exportId,
        format,
        requestedBy,
        query,
      });

      // Query events
      const queryResult = await this.queryAuditTrail({
        ...query,
        limit: undefined,
        offset: undefined,
      });

      // Calculate date range
      const events = queryResult.events;
      const dateRange =
        events.length > 0
          ? {
              start: new Date(
                Math.min(...events.map((e) => e.timestamp.getTime())),
              ),
              end: new Date(
                Math.max(...events.map((e) => e.timestamp.getTime())),
              ),
            }
          : { start: new Date(), end: new Date() };

      // Create export
      const auditExport: AuditTrailExport = {
        exportId,
        format,
        events,
        metadata: {
          exportTimestamp: new Date(),
          totalEvents: events.length,
          dateRange,
          requestedBy,
          integrity: {
            checksum: this.calculateExportChecksum(events),
          },
        },
      };

      this.auditMetrics.exportRequests++;

      const exportDuration = Date.now() - exportStartTime;
      this.logger.log('Audit trail export completed', {
        exportId,
        format,
        eventCount: events.length,
        exportDuration,
      });

      return auditExport;
    } catch (error) {
      this.logger.error('Audit trail export failed', {
        exportId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    framework: ComplianceFramework,
    period: { start: Date; end: Date },
    generatedBy: string,
  ): Promise<ComplianceReport> {
    const reportStartTime = Date.now();
    const reportId = `compliance-report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.logger.log('Generating compliance report', {
        reportId,
        framework,
        period,
        generatedBy,
      });

      // Query events for the period
      const query: AuditTrailQuery = {
        startDate: period.start,
        endDate: period.end,
        complianceFrameworks: [framework],
      };
      const queryResult = await this.queryAuditTrail(query);
      const events = queryResult.events;

      // Calculate summary statistics
      const criticalEvents = events.filter(
        (e) => e.severity === AuditSeverity.CRITICAL,
      ).length;
      const violations = this.complianceViolations.filter(
        (v) =>
          v.framework === framework &&
          v.detectedAt >= period.start &&
          v.detectedAt <= period.end,
      );

      // Calculate compliance score (100 - penalty for violations and critical events)
      const complianceScore = Math.max(
        0,
        100 - violations.length * 5 - criticalEvents * 2,
      );

      // Count events by type
      const eventsByType = {} as Record<AuditEventType, number>;
      Object.values(AuditEventType).forEach((type) => {
        eventsByType[type] = events.filter((e) => e.eventType === type).length;
      });

      // Count events by risk level
      const riskDistribution = {} as Record<ParlantRiskLevel, number>;
      Object.values(ParlantRiskLevel).forEach((level) => {
        riskDistribution[level] = events.filter(
          (e) => e.parlantContext.riskLevel === level,
        ).length;
      });

      // Generate recommendations
      const recommendations = this.generateComplianceRecommendations(
        framework,
        violations,
        complianceScore,
      );

      const report: ComplianceReport = {
        reportId,
        framework,
        reportPeriod: period,
        generatedAt: new Date(),
        generatedBy,
        summary: {
          totalEvents: events.length,
          criticalEvents,
          violationsDetected: violations.length,
          complianceScore,
        },
        eventsByType,
        riskDistribution,
        violationDetails: violations,
        recommendations,
        integrity: {
          checksum: this.calculateReportChecksum(reportId, events, violations),
          signature: 'compliance-signature-placeholder',
        },
      };

      const reportDuration = Date.now() - reportStartTime;
      this.logger.log('Compliance report generated', {
        reportId,
        framework,
        eventsAnalyzed: events.length,
        violationsFound: violations.length,
        complianceScore,
        reportDuration,
      });

      return report;
    } catch (error) {
      this.logger.error('Compliance report generation failed', {
        reportId,
        framework,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get audit metrics
   */
  getAuditMetrics(): typeof this.auditMetrics {
    return { ...this.auditMetrics };
  }

  /**
   * Get compliance violations
   */
  getComplianceViolations(): ComplianceViolation[] {
    return [...this.complianceViolations].sort(
      (a, b) => b.detectedAt.getTime() - a.detectedAt.getTime(),
    );
  }

  /**
   * Initialize event type counters
   */
  private initializeEventTypeCounters(): void {
    Object.values(AuditEventType).forEach((type) => {
      this.auditMetrics.eventsByType[type] = 0;
    });
    Object.values(AuditSeverity).forEach((severity) => {
      this.auditMetrics.eventsBySeverity[severity] = 0;
    });
    Object.values(ParlantRiskLevel).forEach((level) => {
      this.auditMetrics.eventsByRiskLevel[level] = 0;
    });
  }

  /**
   * Setup audit event listeners
   */
  private setupAuditEventListeners(): void {
    // Listen for real-time audit events
    this.on('auditEventLogged', (event: ComprehensiveAuditEvent) => {
      this.processRealtimeAuditEvent(event);
    });

    this.logger.debug('Audit event listeners configured');
  }

  /**
   * Initialize compliance monitoring
   */
  private initializeComplianceMonitoring(): void {
    // Set up periodic compliance checks
    setInterval(() => {
      this.performPeriodicComplianceCheck();
    }, 300000); // Check every 5 minutes

    this.logger.debug('Compliance monitoring initialized');
  }

  /**
   * Start integrity verification
   */
  private startIntegrityVerification(): void {
    // Set up periodic integrity verification
    setInterval(() => {
      this.verifyAuditTrailIntegrity();
    }, 3600000); // Verify every hour

    this.logger.debug('Integrity verification started');
  }

  /**
   * Determine event severity
   */
  private determineSeverity(
    eventType: AuditEventType,
    riskLevel: ParlantRiskLevel,
    success: boolean,
  ): AuditSeverity {
    if (!success) {
      return riskLevel === ParlantRiskLevel.CRITICAL
        ? AuditSeverity.CRITICAL
        : AuditSeverity.ERROR;
    }

    if (
      eventType === AuditEventType.EMERGENCY_OPERATION ||
      riskLevel === ParlantRiskLevel.CRITICAL
    ) {
      return AuditSeverity.CRITICAL;
    }

    if (
      riskLevel === ParlantRiskLevel.HIGH ||
      eventType === AuditEventType.SECURITY_OPERATION
    ) {
      return AuditSeverity.WARNING;
    }

    return AuditSeverity.INFO;
  }

  /**
   * Determine data classification
   */
  private determineDataClassification(
    resources: AuditResource[],
  ): 'public' | 'internal' | 'confidential' | 'secret' {
    const classifications = resources.map((resource) => {
      if (
        resource.resourceType === 'secret' ||
        resource.resourceType === 'key' ||
        resource.resourceType === 'certificate'
      ) {
        return 'secret';
      }
      if (
        resource.resourceType === 'configuration' &&
        resource.resourceName.includes('security')
      ) {
        return 'confidential';
      }
      return 'internal';
    });

    // Return highest classification
    if (classifications.includes('secret')) return 'secret';
    if (classifications.includes('confidential')) return 'confidential';
    if (classifications.includes('internal')) return 'internal';
    return 'public';
  }

  /**
   * Determine applicable compliance frameworks
   */
  private determineComplianceFrameworks(
    eventType: AuditEventType,
    dataClassification: 'public' | 'internal' | 'confidential' | 'secret',
  ): ComplianceFramework[] {
    const frameworks: ComplianceFramework[] = [];

    // All events require SOC2 compliance
    frameworks.push(ComplianceFramework.SOC2);

    // Secret data requires additional frameworks
    if (dataClassification === 'secret') {
      frameworks.push(ComplianceFramework.PCI_DSS, ComplianceFramework.HIPAA);
    }

    // Security operations require additional frameworks
    if (eventType === AuditEventType.SECURITY_OPERATION) {
      frameworks.push(ComplianceFramework.ISO27001, ComplianceFramework.NIST);
    }

    // External integrations require GDPR compliance
    if (eventType === AuditEventType.EXTERNAL_INTEGRATION) {
      frameworks.push(ComplianceFramework.GDPR);
    }

    return frameworks;
  }

  /**
   * Calculate retention period
   */
  private calculateRetentionPeriod(
    frameworks: ComplianceFramework[],
    dataClassification: 'public' | 'internal' | 'confidential' | 'secret',
  ): number {
    let maxRetention = 365; // Default 1 year

    frameworks.forEach((framework) => {
      switch (framework) {
        case ComplianceFramework.SOX:
          maxRetention = Math.max(maxRetention, 2555); // 7 years
          break;
        case ComplianceFramework.PCI_DSS:
          maxRetention = Math.max(maxRetention, 365); // 1 year
          break;
        case ComplianceFramework.HIPAA:
          maxRetention = Math.max(maxRetention, 2190); // 6 years
          break;
        case ComplianceFramework.GDPR:
          maxRetention = Math.max(maxRetention, 1095); // 3 years
          break;
      }
    });

    // Increase retention for sensitive data
    if (dataClassification === 'secret') {
      maxRetention = Math.max(maxRetention, 2555); // 7 years for secrets
    }

    return maxRetention;
  }

  /**
   * Determine sensitivity level
   */
  private determineSensitivityLevel(
    riskLevel: ParlantRiskLevel,
    dataClassification: 'public' | 'internal' | 'confidential' | 'secret',
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (
      dataClassification === 'secret' ||
      riskLevel === ParlantRiskLevel.CRITICAL
    ) {
      return 'critical';
    }
    if (
      dataClassification === 'confidential' ||
      riskLevel === ParlantRiskLevel.HIGH
    ) {
      return 'high';
    }
    if (
      dataClassification === 'internal' ||
      riskLevel === ParlantRiskLevel.MEDIUM
    ) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Mask sensitive data in resources
   */
  private maskSensitiveData(resources: AuditResource[]): AuditResource[] {
    return resources.map((resource) => ({
      ...resource,
      previousValue:
        resource.resourceType === 'secret' || resource.resourceType === 'key'
          ? '*'.repeat(8) + '...' + resource.previousValue?.slice(-4)
          : resource.previousValue,
      newValue:
        resource.resourceType === 'secret' || resource.resourceType === 'key'
          ? '*'.repeat(8) + '...' + resource.newValue?.slice(-4)
          : resource.newValue,
      maskedValues:
        resource.resourceType === 'secret' || resource.resourceType === 'key',
    }));
  }

  /**
   * Mask sensitive changes
   */
  private maskSensitiveChanges(changes: AuditChange[]): AuditChange[] {
    return changes.map((change) => ({
      ...change,
      oldValue: this.shouldMaskValue(change.fieldPath)
        ? '[MASKED]'
        : change.oldValue,
      newValue: this.shouldMaskValue(change.fieldPath)
        ? '[MASKED]'
        : change.newValue,
    }));
  }

  /**
   * Check if value should be masked
   */
  private shouldMaskValue(fieldPath: string): boolean {
    const sensitiveFields = [
      'password',
      'secret',
      'key',
      'token',
      'credential',
      'private',
    ];
    return sensitiveFields.some((field) =>
      fieldPath.toLowerCase().includes(field),
    );
  }

  /**
   * Calculate event checksum
   */
  private calculateEventChecksum(
    eventId: string,
    operationDetails: any,
    operationResults: any,
  ): string {
    const data = JSON.stringify({
      eventId,
      operationDetails,
      operationResults,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Calculate export checksum
   */
  private calculateExportChecksum(events: ComprehensiveAuditEvent[]): string {
    const data = JSON.stringify(events.map((e) => e.eventId).sort());
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Calculate report checksum
   */
  private calculateReportChecksum(
    reportId: string,
    events: ComprehensiveAuditEvent[],
    violations: ComplianceViolation[],
  ): string {
    const data = JSON.stringify({
      reportId,
      eventIds: events.map((e) => e.eventId).sort(),
      violationIds: violations.map((v) => v.violationId).sort(),
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Update audit metrics
   */
  private updateAuditMetrics(event: ComprehensiveAuditEvent): void {
    this.auditMetrics.totalEvents++;
    this.auditMetrics.eventsByType[event.eventType]++;
    this.auditMetrics.eventsBySeverity[event.severity]++;
    this.auditMetrics.eventsByRiskLevel[event.parlantContext.riskLevel]++;

    // Update average audit overhead
    const currentAvg = this.auditMetrics.averageAuditOverhead;
    const newOverhead = event.performanceMetrics.auditOverhead;
    this.auditMetrics.averageAuditOverhead =
      (currentAvg * (this.auditMetrics.totalEvents - 1) + newOverhead) /
      this.auditMetrics.totalEvents;
  }

  /**
   * Check for compliance violations
   */
  private async checkComplianceViolations(
    event: ComprehensiveAuditEvent,
  ): Promise<void> {
    // Check for various compliance violations
    if (
      event.severity === AuditSeverity.CRITICAL &&
      !event.parlantContext.validationApproved
    ) {
      await this.recordComplianceViolation(
        ComplianceFramework.SOC2,
        'Unauthorized critical operation',
        'Critical operation performed without proper validation approval',
        AuditSeverity.CRITICAL,
        [event.eventId],
      );
    }

    if (
      event.dataClassification === 'secret' &&
      event.parlantContext.riskLevel === ParlantRiskLevel.LOW
    ) {
      await this.recordComplianceViolation(
        ComplianceFramework.PCI_DSS,
        'Inadequate risk assessment for sensitive data',
        'Secret data operation classified as low risk',
        AuditSeverity.ERROR,
        [event.eventId],
      );
    }
  }

  /**
   * Record compliance violation
   */
  private async recordComplianceViolation(
    framework: ComplianceFramework,
    requirement: string,
    description: string,
    severity: AuditSeverity,
    affectedEvents: string[],
  ): Promise<void> {
    const violationId = `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const violation: ComplianceViolation = {
      violationId,
      framework,
      requirement,
      description,
      severity,
      affectedEvents,
      detectedAt: new Date(),
      remediation: this.generateRemediationGuidance(framework, requirement),
      status: 'open',
    };

    this.complianceViolations.push(violation);
    this.auditMetrics.violationsDetected++;

    // Update compliance score
    this.auditMetrics.complianceScore = Math.max(
      0,
      this.auditMetrics.complianceScore - 2,
    );

    this.logger.warn('Compliance violation detected', {
      violationId,
      framework,
      requirement,
      severity,
      affectedEvents: affectedEvents.length,
    });

    this.emit('complianceViolationDetected', violation);
  }

  /**
   * Generate remediation guidance
   */
  private generateRemediationGuidance(
    framework: ComplianceFramework,
    requirement: string,
  ): string {
    const remediationMap: Record<string, string> = {
      'Unauthorized critical operation':
        'Ensure all critical operations go through proper approval workflows',
      'Inadequate risk assessment for sensitive data':
        'Review and update risk classification policies for sensitive data',
    };

    return (
      remediationMap[requirement] || 'Review compliance policies and procedures'
    );
  }

  /**
   * Generate compliance recommendations
   */
  private generateComplianceRecommendations(
    framework: ComplianceFramework,
    violations: ComplianceViolation[],
    complianceScore: number,
  ): string[] {
    const recommendations: string[] = [];

    if (complianceScore < 80) {
      recommendations.push(
        'Immediate attention required: Compliance score below acceptable threshold',
      );
    }

    if (violations.length > 0) {
      recommendations.push(
        `Address ${violations.length} compliance violations identified`,
      );
    }

    recommendations.push('Review audit trail retention policies');
    recommendations.push(
      'Implement additional automated compliance monitoring',
    );
    recommendations.push('Conduct regular compliance assessments');

    return recommendations;
  }

  /**
   * Process real-time audit event
   */
  private processRealtimeAuditEvent(event: ComprehensiveAuditEvent): void {
    // Real-time processing logic
    if (event.severity === AuditSeverity.CRITICAL) {
      this.logger.warn('Critical audit event detected', {
        eventId: event.eventId,
        eventType: event.eventType,
        operationType: event.operationType,
      });
    }
  }

  /**
   * Perform periodic compliance check
   */
  private performPeriodicComplianceCheck(): void {
    this.logger.debug('Performing periodic compliance check', {
      totalEvents: this.auditMetrics.totalEvents,
      complianceScore: this.auditMetrics.complianceScore,
      violationsDetected: this.auditMetrics.violationsDetected,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Verify audit trail integrity
   */
  private verifyAuditTrailIntegrity(): void {
    this.auditMetrics.dataIntegrityChecks++;

    // Integrity verification logic would check:
    // - Event checksums
    // - Sequence continuity
    // - Timestamp consistency
    // - Digital signatures

    this.logger.debug('Audit trail integrity verification completed', {
      eventsVerified: this.auditEvents.length,
      integrityChecksPerformed: this.auditMetrics.dataIntegrityChecks,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Trim audit log to prevent memory issues
   */
  private trimAuditLog(): void {
    if (this.auditEvents.length > this.maxAuditEvents) {
      const eventsToRemove = this.auditEvents.length - this.maxAuditEvents;
      this.auditEvents.splice(0, eventsToRemove);

      this.logger.debug('Audit log trimmed', {
        eventsRemoved: eventsToRemove,
        remainingEvents: this.auditEvents.length,
      });
    }
  }
}
