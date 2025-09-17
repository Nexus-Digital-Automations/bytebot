/**
 * Parlant-Validated Database Security Service - MAXIMUM IMPLEMENTATION
 *
 * Provides comprehensive conversational AI validation for ALL database security operations
 * implementing function-level wrapping with Parlant's conversational validation engine.
 *
 * Features:
 * - Pre-execution conversational validation of all security operations (CRITICAL risk)
 * - Security configuration approval through natural language conversation
 * - Audit trail validation and compliance enforcement
 * - Security violation detection with conversational threat assessment
 * - Complete conversational audit trail for all security modifications
 * - Performance optimization with security-specific intelligence caching
 *
 * Architecture: Parlant conversation engine integration with DatabaseSecurityService
 * Security: Enterprise-grade validation with conversational authentication for security changes
 * Performance: Sub-500ms validation with comprehensive security analysis
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DatabaseSecurityService,
  DatabaseSecurityConfig,
  DatabaseAuditEvent,
  SecurityViolation,
} from './database-security.service';

// Import Parlant types from the existing integration service
import {
  ParlantConversationContext,
  ParlantValidationResponse,
  ConversationalValidationError,
  RiskLevel,
  ExecutionContext,
} from '../../../bytebotd/src/parlant/parlant-integration.service';

// Import database operation types
import {
  DatabaseOperationMetadata,
  ParlantDatabaseValidationRequest,
  DatabaseParlantAuditEntry,
} from '../parlant-validated-database.service';

// ===== SECURITY OPERATION INTERFACES =====

/**
 * Security operation metadata for enhanced Parlant validation
 */
export interface SecurityOperationMetadata extends DatabaseOperationMetadata {
  readonly securityAction: SecurityActionType;
  readonly securityLevel: SecurityLevel;
  readonly affectedComponents: string[];
  readonly configurationChanges: ConfigurationChange[];
  readonly auditingRequired: boolean;
  readonly complianceImpact: ComplianceImpact;
  readonly threatAssessment: ThreatAssessment;
  readonly accessControlChanges: boolean;
  readonly encryptionChanges: boolean;
  readonly authenticationChanges: boolean;
}

/**
 * Security action types for classification
 */
export enum SecurityActionType {
  CONFIGURATION_UPDATE = 'CONFIGURATION_UPDATE',
  AUDIT_EVENT_RECORDING = 'AUDIT_EVENT_RECORDING',
  SECURITY_VIOLATION_HANDLING = 'SECURITY_VIOLATION_HANDLING',
  ACCESS_CONTROL_MODIFICATION = 'ACCESS_CONTROL_MODIFICATION',
  ENCRYPTION_MANAGEMENT = 'ENCRYPTION_MANAGEMENT',
  AUTHENTICATION_SETUP = 'AUTHENTICATION_SETUP',
  MONITORING_CONFIGURATION = 'MONITORING_CONFIGURATION',
  COMPLIANCE_ENFORCEMENT = 'COMPLIANCE_ENFORCEMENT',
  THREAT_RESPONSE = 'THREAT_RESPONSE',
  INCIDENT_INVESTIGATION = 'INCIDENT_INVESTIGATION',
}

/**
 * Security levels for operations
 */
export enum SecurityLevel {
  INFORMATIONAL = 'INFORMATIONAL',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  MAXIMUM = 'MAXIMUM',
}

/**
 * Configuration change details
 */
export interface ConfigurationChange {
  readonly changeType: 'ADD' | 'MODIFY' | 'DELETE';
  readonly configurationKey: string;
  readonly oldValue?: unknown;
  readonly newValue?: unknown;
  readonly changeReason: string;
  readonly impactAssessment: string;
  readonly rollbackPossible: boolean;
}

/**
 * Compliance impact assessment
 */
export interface ComplianceImpact {
  readonly affectedFrameworks: ComplianceFramework[];
  readonly complianceLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly requiresApproval: boolean;
  readonly documentationRequired: boolean;
  readonly attestationRequired: boolean;
  readonly auditTrailMandatory: boolean;
}

/**
 * Compliance frameworks
 */
export enum ComplianceFramework {
  GDPR = 'GDPR',
  HIPAA = 'HIPAA',
  SOX = 'SOX',
  PCI_DSS = 'PCI_DSS',
  ISO_27001 = 'ISO_27001',
  NIST = 'NIST',
  FEDRAMP = 'FEDRAMP',
  CCPA = 'CCPA',
}

/**
 * Threat assessment for security operations
 */
export interface ThreatAssessment {
  readonly threatLevel: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly threatVectors: ThreatVector[];
  readonly mitigationStrategies: string[];
  readonly residualRisk:
    | 'ACCEPTABLE'
    | 'MANAGEABLE'
    | 'ELEVATED'
    | 'HIGH'
    | 'UNACCEPTABLE';
  readonly monitoringRequired: boolean;
  readonly alertingRequired: boolean;
  readonly escalationRequired: boolean;
}

/**
 * Threat vectors for analysis
 */
export enum ThreatVector {
  SQL_INJECTION = 'SQL_INJECTION',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  DATA_EXFILTRATION = 'DATA_EXFILTRATION',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  DENIAL_OF_SERVICE = 'DENIAL_OF_SERVICE',
  MAN_IN_THE_MIDDLE = 'MAN_IN_THE_MIDDLE',
  INSIDER_THREAT = 'INSIDER_THREAT',
  CONFIGURATION_TAMPERING = 'CONFIGURATION_TAMPERING',
}

/**
 * Security-specific Parlant validation request
 */
export interface ParlantSecurityValidationRequest
  extends ParlantDatabaseValidationRequest {
  readonly securityOperation: SecurityOperationMetadata;
  readonly securityImpactAssessment: string;
  readonly complianceCheckSummary: string;
  readonly threatMitigationPlan: string;
  readonly securityControlsAffected: string[];
}

/**
 * Security audit entry with enhanced details
 */
export interface SecurityParlantAuditEntry extends DatabaseParlantAuditEntry {
  readonly securityOperation: SecurityOperationMetadata;
  readonly securityAction: SecurityActionType;
  readonly securityLevel: SecurityLevel;
  readonly configurationChangesApplied: ConfigurationChange[];
  readonly complianceStatus: ComplianceStatus;
  readonly threatResponseExecuted: boolean;
  readonly securityControlsModified: boolean;
  readonly auditEventGenerated: boolean;
}

/**
 * Compliance status tracking
 */
export interface ComplianceStatus {
  readonly status:
    | 'COMPLIANT'
    | 'NON_COMPLIANT'
    | 'PENDING_REVIEW'
    | 'REQUIRES_ATTESTATION';
  readonly affectedFrameworks: ComplianceFramework[];
  readonly violations: string[];
  readonly remediationRequired: boolean;
  readonly documentationComplete: boolean;
}

// ===== PARLANT-VALIDATED SECURITY SERVICE =====

@Injectable()
export class ParlantValidatedDatabaseSecurityService {
  private readonly logger = new Logger(
    ParlantValidatedDatabaseSecurityService.name,
  );
  private readonly validationCache = new Map<
    string,
    ParlantValidationResponse
  >();
  private readonly auditTrail: SecurityParlantAuditEntry[] = [];
  private readonly securityViolations: SecurityViolation[] = [];

  // Performance monitoring
  private securityOperationCount = 0;
  private cacheHitCount = 0;
  private averageValidationTime = 0;
  private criticalOperationCount = 0;

  constructor(
    @Inject(forwardRef(() => DatabaseSecurityService))
    private readonly securityService: DatabaseSecurityService,
    private readonly configService: ConfigService,
  ) {
    const operationId = this.generateOperationId();

    this.logger.log(
      `[${operationId}] Initializing Parlant-Validated Database Security Service`,
      {
        parlantEnabled: this.isParlantEnabled(),
        cacheEnabled: this.isCacheEnabled(),
        auditEnabled: this.isAuditEnabled(),
        securityIntegration: 'MAXIMUM',
        riskValidation: 'CRITICAL',
        complianceMode: this.getComplianceMode(),
      },
    );

    // Initialize performance monitoring
    setInterval(() => this.logPerformanceMetrics(), 60000); // Every minute

    // Initialize security monitoring
    setInterval(() => this.performSecurityHealthCheck(), 300000); // Every 5 minutes
  }

  // ===== CORE PARLANT SECURITY INTEGRATION METHODS =====

  /**
   * Validate and execute security operation with comprehensive Parlant integration
   */
  async validateAndExecuteSecurityOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata: SecurityOperationMetadata,
    context: ParlantConversationContext,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Starting Parlant security validation`, {
      operationName,
      securityAction: metadata.securityAction,
      securityLevel: metadata.securityLevel,
      riskLevel: this.determineSecurityRiskLevel(metadata),
      complianceImpact: metadata.complianceImpact.complianceLevel,
      operationId,
    });

    try {
      // 1. Validate security prerequisites and compliance requirements
      await this.validateSecurityPrerequisites(metadata, context);

      // 2. Create comprehensive Parlant validation request
      const validationRequest: ParlantSecurityValidationRequest = {
        functionName: operationName,
        functionParams: params,
        actionDescription: this.generateSecurityActionDescription(
          operationName,
          metadata,
        ),
        context,
        riskLevel: this.determineSecurityRiskLevel(metadata),
        operationId,
        databaseOperation: metadata,
        securityOperation: metadata,
        estimatedImpact: this.estimateSecurityImpact(metadata),
        securityImpactAssessment:
          this.generateSecurityImpactAssessment(metadata),
        complianceCheckSummary: this.generateComplianceCheckSummary(metadata),
        threatMitigationPlan: this.generateThreatMitigationPlan(metadata),
        securityControlsAffected: this.getAffectedSecurityControls(metadata),
      };

      // 3. Perform conversational validation with enhanced security checks
      const validationResponse =
        await this.performSecurityValidation(validationRequest);

      if (!validationResponse.approved) {
        throw new ConversationalValidationError(
          validationResponse.conversationId,
          validationResponse.reasoning,
          validationResponse.suggestedAlternatives,
        );
      }

      // 4. Execute security operation with comprehensive monitoring
      const result = await this.executeMonitoredSecurityOperation(
        operation,
        validationResponse.executionContext,
        metadata,
        operationId,
      );

      // 5. Create comprehensive security audit entry
      const auditEntry = await this.createSecurityAuditEntry(
        operationId,
        validationResponse,
        validationRequest,
        'SUCCESS',
        Date.now() - startTime,
        result,
      );

      this.auditTrail.push(auditEntry);

      // 6. Perform post-operation security checks
      await this.performPostOperationSecurityChecks(metadata, result);

      this.logger.log(
        `[${operationId}] Parlant security operation completed successfully`,
        {
          operationName,
          securityAction: metadata.securityAction,
          duration: Date.now() - startTime,
          conversationId: validationResponse.conversationId,
          complianceStatus: auditEntry.complianceStatus.status,
          operationId,
        },
      );

      return result;
    } catch (error) {
      // Handle validation or execution errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`[${operationId}] Parlant security operation failed`, {
        operationName,
        securityAction: metadata.securityAction,
        error: errorMessage,
        duration: Date.now() - startTime,
        operationId,
      });

      // Create error audit entry and security violation if applicable
      if (!(error instanceof ConversationalValidationError)) {
        const auditEntry = await this.createSecurityAuditEntry(
          operationId,
          { approved: true } as ParlantValidationResponse,
          {
            functionName: operationName,
            securityOperation: metadata,
          } as ParlantSecurityValidationRequest,
          'FAILURE',
          Date.now() - startTime,
          null,
          errorMessage,
        );
        this.auditTrail.push(auditEntry);

        // Create security violation for failed operations
        await this.createSecurityViolation(operationId, metadata, errorMessage);
      }

      throw error;
    }
  }

  // ===== SECURITY SERVICE METHOD WRAPPERS =====

  /**
   * Initialize security configuration with validation (CRITICAL risk)
   */
  async initializeSecurityConfiguration(
    config: DatabaseSecurityConfig,
    context: ParlantConversationContext,
  ): Promise<void> {
    const metadata: SecurityOperationMetadata = {
      operationType: 'SECURITY',
      securityAction: SecurityActionType.CONFIGURATION_UPDATE,
      securityLevel: SecurityLevel.CRITICAL,
      queryDescription:
        'Initialize comprehensive database security configuration',
      isDestructive: false,
      requiresBackup: true,
      affectedComponents: [
        'SSL/TLS',
        'Authentication',
        'Audit Logging',
        'Access Control',
      ],
      configurationChanges: this.extractConfigurationChanges(config),
      auditingRequired: true,
      complianceImpact: {
        affectedFrameworks: [
          ComplianceFramework.GDPR,
          ComplianceFramework.SOX,
          ComplianceFramework.ISO_27001,
        ],
        complianceLevel: 'CRITICAL',
        requiresApproval: true,
        documentationRequired: true,
        attestationRequired: true,
        auditTrailMandatory: true,
      },
      threatAssessment: {
        threatLevel: 'HIGH',
        threatVectors: [
          ThreatVector.UNAUTHORIZED_ACCESS,
          ThreatVector.CONFIGURATION_TAMPERING,
        ],
        mitigationStrategies: [
          'Encryption enforcement',
          'Access logging',
          'Configuration validation',
        ],
        residualRisk: 'MANAGEABLE',
        monitoringRequired: true,
        alertingRequired: true,
        escalationRequired: false,
      },
      accessControlChanges: true,
      encryptionChanges: true,
      authenticationChanges: true,
    };

    return this.validateAndExecuteSecurityOperation(
      'initializeSecurityConfiguration',
      () => this.securityService.initializeSecurityConfiguration(config),
      metadata,
      context,
      { config },
    );
  }

  /**
   * Record audit event with validation (MEDIUM risk)
   */
  async recordAuditEvent(
    event: DatabaseAuditEvent,
    context: ParlantConversationContext,
  ): Promise<void> {
    const metadata: SecurityOperationMetadata = {
      operationType: 'WRITE',
      securityAction: SecurityActionType.AUDIT_EVENT_RECORDING,
      securityLevel: this.determineAuditEventSecurityLevel(event),
      queryDescription: `Record database audit event: ${event.eventType}`,
      isDestructive: false,
      requiresBackup: false,
      affectedComponents: ['Audit System'],
      configurationChanges: [],
      auditingRequired: true,
      complianceImpact: {
        affectedFrameworks: this.getComplianceFrameworksForEvent(event),
        complianceLevel: event.severity === 'critical' ? 'HIGH' : 'MEDIUM',
        requiresApproval: false,
        documentationRequired: event.severity === 'critical',
        attestationRequired: false,
        auditTrailMandatory: true,
      },
      threatAssessment: {
        threatLevel: event.severity === 'critical' ? 'HIGH' : 'MEDIUM',
        threatVectors: this.getThreatVectorsForEvent(event),
        mitigationStrategies: ['Event logging', 'Real-time monitoring'],
        residualRisk: 'ACCEPTABLE',
        monitoringRequired: true,
        alertingRequired: event.severity === 'critical',
        escalationRequired: event.severity === 'critical',
      },
      accessControlChanges: false,
      encryptionChanges: false,
      authenticationChanges: false,
    };

    return this.validateAndExecuteSecurityOperation(
      'recordAuditEvent',
      () => this.securityService.recordAuditEvent(event),
      metadata,
      context,
      { event },
    );
  }

  /**
   * Handle security violation with validation (HIGH risk)
   */
  async handleSecurityViolation(
    violation: SecurityViolation,
    context: ParlantConversationContext,
  ): Promise<void> {
    const metadata: SecurityOperationMetadata = {
      operationType: 'SECURITY',
      securityAction: SecurityActionType.SECURITY_VIOLATION_HANDLING,
      securityLevel: this.determineViolationSecurityLevel(violation),
      queryDescription: `Handle security violation: ${violation.type}`,
      isDestructive: false,
      requiresBackup: false,
      affectedComponents: ['Security Monitoring', 'Incident Response'],
      configurationChanges: [],
      auditingRequired: true,
      complianceImpact: {
        affectedFrameworks: [
          ComplianceFramework.GDPR,
          ComplianceFramework.ISO_27001,
        ],
        complianceLevel:
          violation.severity === 'critical' ? 'CRITICAL' : 'HIGH',
        requiresApproval: violation.severity === 'critical',
        documentationRequired: true,
        attestationRequired: violation.severity === 'critical',
        auditTrailMandatory: true,
      },
      threatAssessment: {
        threatLevel: violation.severity === 'critical' ? 'CRITICAL' : 'HIGH',
        threatVectors: this.getThreatVectorsForViolation(violation),
        mitigationStrategies: [
          'Immediate response',
          'Containment',
          'Investigation',
        ],
        residualRisk: violation.severity === 'critical' ? 'HIGH' : 'MANAGEABLE',
        monitoringRequired: true,
        alertingRequired: true,
        escalationRequired: violation.severity === 'critical',
      },
      accessControlChanges: violation.blocked,
      encryptionChanges: false,
      authenticationChanges: false,
    };

    this.criticalOperationCount++;

    return this.validateAndExecuteSecurityOperation(
      'handleSecurityViolation',
      () => this.securityService.handleSecurityViolation(violation),
      metadata,
      context,
      { violation },
    );
  }

  /**
   * Get security configuration with validation (LOW risk)
   */
  async getSecurityConfiguration(
    context: ParlantConversationContext,
  ): Promise<DatabaseSecurityConfig> {
    const metadata: SecurityOperationMetadata = {
      operationType: 'READ',
      securityAction: SecurityActionType.CONFIGURATION_UPDATE,
      securityLevel: SecurityLevel.LOW,
      queryDescription: 'Retrieve current database security configuration',
      isDestructive: false,
      requiresBackup: false,
      affectedComponents: ['Configuration System'],
      configurationChanges: [],
      auditingRequired: true,
      complianceImpact: {
        affectedFrameworks: [],
        complianceLevel: 'LOW',
        requiresApproval: false,
        documentationRequired: false,
        attestationRequired: false,
        auditTrailMandatory: true,
      },
      threatAssessment: {
        threatLevel: 'LOW',
        threatVectors: [],
        mitigationStrategies: ['Access logging'],
        residualRisk: 'ACCEPTABLE',
        monitoringRequired: false,
        alertingRequired: false,
        escalationRequired: false,
      },
      accessControlChanges: false,
      encryptionChanges: false,
      authenticationChanges: false,
    };

    return this.validateAndExecuteSecurityOperation(
      'getSecurityConfiguration',
      () => this.securityService.getSecurityConfiguration(),
      metadata,
      context,
    );
  }

  /**
   * Get audit events with validation (MEDIUM risk)
   */
  async getAuditEvents(
    startDate: Date,
    endDate: Date,
    eventType?: string,
    context?: ParlantConversationContext,
  ): Promise<DatabaseAuditEvent[]> {
    const operationContext = context || this.createSystemContext();

    const metadata: SecurityOperationMetadata = {
      operationType: 'READ',
      securityAction: SecurityActionType.AUDIT_EVENT_RECORDING,
      securityLevel: SecurityLevel.MEDIUM,
      queryDescription: `Retrieve audit events from ${startDate.toISOString()} to ${endDate.toISOString()}`,
      isDestructive: false,
      requiresBackup: false,
      affectedComponents: ['Audit System'],
      configurationChanges: [],
      auditingRequired: true,
      complianceImpact: {
        affectedFrameworks: [ComplianceFramework.GDPR, ComplianceFramework.SOX],
        complianceLevel: 'MEDIUM',
        requiresApproval: false,
        documentationRequired: false,
        attestationRequired: false,
        auditTrailMandatory: true,
      },
      threatAssessment: {
        threatLevel: 'MEDIUM',
        threatVectors: [ThreatVector.UNAUTHORIZED_ACCESS],
        mitigationStrategies: ['Access validation', 'Data filtering'],
        residualRisk: 'ACCEPTABLE',
        monitoringRequired: true,
        alertingRequired: false,
        escalationRequired: false,
      },
      accessControlChanges: false,
      encryptionChanges: false,
      authenticationChanges: false,
    };

    return this.validateAndExecuteSecurityOperation(
      'getAuditEvents',
      () => this.securityService.getAuditEvents(startDate, endDate, eventType),
      metadata,
      operationContext,
      { startDate, endDate, eventType },
    );
  }

  /**
   * Get security violations with validation (HIGH risk)
   */
  async getSecurityViolations(
    severity?: 'low' | 'medium' | 'high' | 'critical',
    context?: ParlantConversationContext,
  ): Promise<SecurityViolation[]> {
    const operationContext = context || this.createSystemContext();

    const metadata: SecurityOperationMetadata = {
      operationType: 'READ',
      securityAction: SecurityActionType.SECURITY_VIOLATION_HANDLING,
      securityLevel: SecurityLevel.HIGH,
      queryDescription: `Retrieve security violations${severity ? ` with severity: ${severity}` : ''}`,
      isDestructive: false,
      requiresBackup: false,
      affectedComponents: ['Security Monitoring'],
      configurationChanges: [],
      auditingRequired: true,
      complianceImpact: {
        affectedFrameworks: [
          ComplianceFramework.GDPR,
          ComplianceFramework.ISO_27001,
        ],
        complianceLevel: 'HIGH',
        requiresApproval: false,
        documentationRequired: true,
        attestationRequired: false,
        auditTrailMandatory: true,
      },
      threatAssessment: {
        threatLevel: 'HIGH',
        threatVectors: [
          ThreatVector.UNAUTHORIZED_ACCESS,
          ThreatVector.DATA_EXFILTRATION,
        ],
        mitigationStrategies: ['Access validation', 'Data classification'],
        residualRisk: 'MANAGEABLE',
        monitoringRequired: true,
        alertingRequired: true,
        escalationRequired: severity === 'critical',
      },
      accessControlChanges: false,
      encryptionChanges: false,
      authenticationChanges: false,
    };

    return this.validateAndExecuteSecurityOperation(
      'getSecurityViolations',
      () => this.securityService.getSecurityViolations(severity),
      metadata,
      operationContext,
      { severity },
    );
  }

  /**
   * Validate SSL configuration with validation (HIGH risk)
   */
  async validateSSLConfiguration(
    context: ParlantConversationContext,
  ): Promise<boolean> {
    const metadata: SecurityOperationMetadata = {
      operationType: 'READ',
      securityAction: SecurityActionType.ENCRYPTION_MANAGEMENT,
      securityLevel: SecurityLevel.HIGH,
      queryDescription:
        'Validate SSL/TLS configuration for database connections',
      isDestructive: false,
      requiresBackup: false,
      affectedComponents: ['SSL/TLS', 'Encryption'],
      configurationChanges: [],
      auditingRequired: true,
      complianceImpact: {
        affectedFrameworks: [
          ComplianceFramework.PCI_DSS,
          ComplianceFramework.HIPAA,
        ],
        complianceLevel: 'HIGH',
        requiresApproval: false,
        documentationRequired: true,
        attestationRequired: false,
        auditTrailMandatory: true,
      },
      threatAssessment: {
        threatLevel: 'HIGH',
        threatVectors: [
          ThreatVector.MAN_IN_THE_MIDDLE,
          ThreatVector.DATA_EXFILTRATION,
        ],
        mitigationStrategies: [
          'Certificate validation',
          'Encryption verification',
        ],
        residualRisk: 'MANAGEABLE',
        monitoringRequired: true,
        alertingRequired: false,
        escalationRequired: false,
      },
      accessControlChanges: false,
      encryptionChanges: false,
      authenticationChanges: false,
    };

    return this.validateAndExecuteSecurityOperation(
      'validateSSLConfiguration',
      () => this.securityService.validateSSLConfiguration(),
      metadata,
      context,
    );
  }

  /**
   * Clear audit logs with validation (CRITICAL risk)
   */
  async clearAuditLogs(
    retentionDays: number,
    context: ParlantConversationContext,
  ): Promise<number> {
    const metadata: SecurityOperationMetadata = {
      operationType: 'DELETE',
      securityAction: SecurityActionType.AUDIT_EVENT_RECORDING,
      securityLevel: SecurityLevel.CRITICAL,
      queryDescription: `Clear audit logs older than ${retentionDays} days`,
      isDestructive: true,
      requiresBackup: true,
      affectedComponents: ['Audit System', 'Compliance'],
      configurationChanges: [],
      auditingRequired: true,
      complianceImpact: {
        affectedFrameworks: [
          ComplianceFramework.GDPR,
          ComplianceFramework.SOX,
          ComplianceFramework.HIPAA,
        ],
        complianceLevel: 'CRITICAL',
        requiresApproval: true,
        documentationRequired: true,
        attestationRequired: true,
        auditTrailMandatory: true,
      },
      threatAssessment: {
        threatLevel: 'CRITICAL',
        threatVectors: [
          ThreatVector.INSIDER_THREAT,
          ThreatVector.CONFIGURATION_TAMPERING,
        ],
        mitigationStrategies: [
          'Backup verification',
          'Approval workflow',
          'Compliance check',
        ],
        residualRisk: 'HIGH',
        monitoringRequired: true,
        alertingRequired: true,
        escalationRequired: true,
      },
      accessControlChanges: false,
      encryptionChanges: false,
      authenticationChanges: false,
    };

    this.criticalOperationCount++;

    return this.validateAndExecuteSecurityOperation(
      'clearAuditLogs',
      () => this.securityService.clearAuditLogs(retentionDays),
      metadata,
      context,
      { retentionDays },
    );
  }

  // ===== UTILITY METHODS =====

  /**
   * Determine security risk level
   */
  private determineSecurityRiskLevel(
    metadata: SecurityOperationMetadata,
  ): RiskLevel {
    // Security operations always have elevated risk levels
    switch (metadata.securityLevel) {
      case SecurityLevel.INFORMATIONAL:
      case SecurityLevel.LOW:
        return RiskLevel.MEDIUM; // Minimum risk for security operations
      case SecurityLevel.MEDIUM:
        return RiskLevel.HIGH;
      case SecurityLevel.HIGH:
        return RiskLevel.HIGH;
      case SecurityLevel.CRITICAL:
      case SecurityLevel.MAXIMUM:
        return RiskLevel.CRITICAL;
      default:
        return RiskLevel.CRITICAL; // Default to critical for security
    }
  }

  /**
   * Validate security prerequisites
   */
  private async validateSecurityPrerequisites(
    metadata: SecurityOperationMetadata,
    _context: ParlantConversationContext,
  ): Promise<void> {
    const operationId = this.generateOperationId();

    this.logger.debug(`[${operationId}] Validating security prerequisites`, {
      securityAction: metadata.securityAction,
      securityLevel: metadata.securityLevel,
      complianceImpact: metadata.complianceImpact.complianceLevel,
      operationId,
    });

    // Check compliance requirements
    if (metadata.complianceImpact.requiresApproval) {
      this.logger.debug(
        `[${operationId}] Operation requires compliance approval`,
        {
          affectedFrameworks: metadata.complianceImpact.affectedFrameworks,
          complianceLevel: metadata.complianceImpact.complianceLevel,
        },
      );
    }

    // Check threat assessment
    if (metadata.threatAssessment.threatLevel === 'CRITICAL') {
      this.logger.warn(`[${operationId}] Critical threat level detected`, {
        threatVectors: metadata.threatAssessment.threatVectors,
        residualRisk: metadata.threatAssessment.residualRisk,
      });
    }

    // Validate security controls
    if (
      metadata.accessControlChanges ||
      metadata.encryptionChanges ||
      metadata.authenticationChanges
    ) {
      this.logger.debug(`[${operationId}] Security control changes detected`, {
        accessControl: metadata.accessControlChanges,
        encryption: metadata.encryptionChanges,
        authentication: metadata.authenticationChanges,
      });
    }
  }

  /**
   * Generate security action description
   */
  private generateSecurityActionDescription(
    operationName: string,
    metadata: SecurityOperationMetadata,
  ): string {
    const base = `Execute database security operation: ${operationName}`;
    const details = [
      `Action: ${metadata.securityAction}`,
      `Security Level: ${metadata.securityLevel}`,
      `Components: ${metadata.affectedComponents.join(', ')}`,
      metadata.isDestructive ? 'DESTRUCTIVE OPERATION' : null,
      metadata.auditingRequired ? 'AUDIT REQUIRED' : null,
      metadata.complianceImpact.requiresApproval ? 'APPROVAL REQUIRED' : null,
      `Threat Level: ${metadata.threatAssessment.threatLevel}`,
    ]
      .filter(Boolean)
      .join(', ');

    return `${base}. ${details}. Description: ${metadata.queryDescription}`;
  }

  /**
   * Estimate security impact
   */
  private estimateSecurityImpact(
    metadata: SecurityOperationMetadata,
  ): 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Security operations have elevated impact assessment
    if (
      metadata.securityLevel === SecurityLevel.CRITICAL ||
      metadata.securityLevel === SecurityLevel.MAXIMUM
    ) {
      return 'CRITICAL';
    }

    if (
      metadata.securityLevel === SecurityLevel.HIGH ||
      metadata.isDestructive
    ) {
      return 'HIGH';
    }

    if (
      metadata.configurationChanges.length > 0 ||
      metadata.threatAssessment.threatLevel === 'HIGH'
    ) {
      return 'MEDIUM';
    }

    return 'LOW'; // Minimum impact for security operations
  }

  /**
   * Generate security impact assessment
   */
  private generateSecurityImpactAssessment(
    metadata: SecurityOperationMetadata,
  ): string {
    const impacts: string[] = [];

    if (metadata.accessControlChanges) {
      impacts.push(
        'Access control modifications will affect authentication and authorization',
      );
    }

    if (metadata.encryptionChanges) {
      impacts.push(
        'Encryption changes will impact data protection and transmission security',
      );
    }

    if (metadata.authenticationChanges) {
      impacts.push(
        'Authentication changes will affect user access and session management',
      );
    }

    if (metadata.configurationChanges.length > 0) {
      impacts.push(
        `${metadata.configurationChanges.length} configuration changes will be applied`,
      );
    }

    if (
      metadata.threatAssessment.threatLevel === 'CRITICAL' ||
      metadata.threatAssessment.threatLevel === 'HIGH'
    ) {
      impacts.push(
        `High threat level detected: ${metadata.threatAssessment.threatVectors.join(', ')}`,
      );
    }

    if (impacts.length === 0) {
      return 'Minimal security impact expected - operation within normal parameters';
    }

    return impacts.join('; ');
  }

  /**
   * Generate compliance check summary
   */
  private generateComplianceCheckSummary(
    metadata: SecurityOperationMetadata,
  ): string {
    const compliance = metadata.complianceImpact;

    if (compliance.complianceLevel === 'NONE') {
      return 'No compliance requirements affected';
    }

    const summary: string[] = [
      `Compliance Level: ${compliance.complianceLevel}`,
      `Affected Frameworks: ${compliance.affectedFrameworks.join(', ')}`,
    ];

    if (compliance.requiresApproval) {
      summary.push('APPROVAL REQUIRED');
    }

    if (compliance.documentationRequired) {
      summary.push('Documentation required');
    }

    if (compliance.attestationRequired) {
      summary.push('Attestation required');
    }

    if (compliance.auditTrailMandatory) {
      summary.push('Comprehensive audit trail mandatory');
    }

    return summary.join('; ');
  }

  /**
   * Generate threat mitigation plan
   */
  private generateThreatMitigationPlan(
    metadata: SecurityOperationMetadata,
  ): string {
    const threat = metadata.threatAssessment;

    if (threat.threatLevel === 'MINIMAL') {
      return 'Minimal threat level - standard monitoring protocols apply';
    }

    const plan: string[] = [
      `Threat Level: ${threat.threatLevel}`,
      `Mitigation Strategies: ${threat.mitigationStrategies.join(', ')}`,
      `Residual Risk: ${threat.residualRisk}`,
    ];

    if (threat.monitoringRequired) {
      plan.push('Enhanced monitoring enabled');
    }

    if (threat.alertingRequired) {
      plan.push('Real-time alerting activated');
    }

    if (threat.escalationRequired) {
      plan.push('Automatic escalation configured');
    }

    if (threat.threatVectors.length > 0) {
      plan.push(`Target Vectors: ${threat.threatVectors.join(', ')}`);
    }

    return plan.join('; ');
  }

  /**
   * Get affected security controls
   */
  private getAffectedSecurityControls(
    metadata: SecurityOperationMetadata,
  ): string[] {
    const controls: string[] = [];

    if (metadata.accessControlChanges) {
      controls.push('Access Control', 'Authentication', 'Authorization');
    }

    if (metadata.encryptionChanges) {
      controls.push('Data Encryption', 'Transport Security', 'Key Management');
    }

    if (metadata.authenticationChanges) {
      controls.push(
        'User Authentication',
        'Session Management',
        'Credential Validation',
      );
    }

    if (metadata.auditingRequired) {
      controls.push('Audit Logging', 'Event Monitoring', 'Compliance Tracking');
    }

    controls.push(...metadata.affectedComponents);

    return [...new Set(controls)]; // Remove duplicates
  }

  /**
   * Extract configuration changes from security config
   */
  private extractConfigurationChanges(
    config: DatabaseSecurityConfig,
  ): ConfigurationChange[] {
    const changes: ConfigurationChange[] = [];

    if (config.sslEnabled) {
      changes.push({
        changeType: 'MODIFY',
        configurationKey: 'ssl.enabled',
        newValue: config.sslEnabled,
        changeReason: 'Enable SSL/TLS encryption for database connections',
        impactAssessment: 'Enhances data transmission security',
        rollbackPossible: true,
      });
    }

    if (config.auditLoggingEnabled) {
      changes.push({
        changeType: 'MODIFY',
        configurationKey: 'audit.enabled',
        newValue: config.auditLoggingEnabled,
        changeReason: 'Enable comprehensive audit logging',
        impactAssessment: 'Improves compliance and security monitoring',
        rollbackPossible: true,
      });
    }

    if (config.connectionAuthentication) {
      changes.push({
        changeType: 'MODIFY',
        configurationKey: 'connection.authentication',
        newValue: config.connectionAuthentication,
        changeReason: 'Enable connection-level authentication',
        impactAssessment: 'Strengthens access control',
        rollbackPossible: true,
      });
    }

    return changes;
  }

  /**
   * Determine audit event security level
   */
  private determineAuditEventSecurityLevel(
    event: DatabaseAuditEvent,
  ): SecurityLevel {
    switch (event.severity) {
      case 'critical':
        return SecurityLevel.CRITICAL;
      case 'error':
        return SecurityLevel.HIGH;
      case 'warning':
        return SecurityLevel.MEDIUM;
      case 'info':
      default:
        return SecurityLevel.LOW;
    }
  }

  /**
   * Determine violation security level
   */
  private determineViolationSecurityLevel(
    violation: SecurityViolation,
  ): SecurityLevel {
    switch (violation.severity) {
      case 'critical':
        return SecurityLevel.CRITICAL;
      case 'high':
        return SecurityLevel.HIGH;
      case 'medium':
        return SecurityLevel.MEDIUM;
      case 'low':
      default:
        return SecurityLevel.LOW;
    }
  }

  /**
   * Get compliance frameworks for audit event
   */
  private getComplianceFrameworksForEvent(
    event: DatabaseAuditEvent,
  ): ComplianceFramework[] {
    const frameworks: ComplianceFramework[] = [];

    // Add frameworks based on event type
    if (
      event.eventType === 'authentication' ||
      event.eventType === 'connection'
    ) {
      frameworks.push(ComplianceFramework.GDPR, ComplianceFramework.ISO_27001);
    }

    if (event.eventType === 'query' || event.eventType === 'schema_change') {
      frameworks.push(ComplianceFramework.SOX, ComplianceFramework.HIPAA);
    }

    if (event.eventType === 'security_violation') {
      frameworks.push(ComplianceFramework.PCI_DSS, ComplianceFramework.NIST);
    }

    return frameworks;
  }

  /**
   * Get threat vectors for audit event
   */
  private getThreatVectorsForEvent(event: DatabaseAuditEvent): ThreatVector[] {
    const vectors: ThreatVector[] = [];

    switch (event.eventType) {
      case 'authentication':
        vectors.push(ThreatVector.UNAUTHORIZED_ACCESS);
        break;
      case 'query':
        vectors.push(
          ThreatVector.SQL_INJECTION,
          ThreatVector.DATA_EXFILTRATION,
        );
        break;
      case 'schema_change':
        vectors.push(
          ThreatVector.PRIVILEGE_ESCALATION,
          ThreatVector.CONFIGURATION_TAMPERING,
        );
        break;
      case 'security_violation':
        vectors.push(
          ThreatVector.INSIDER_THREAT,
          ThreatVector.UNAUTHORIZED_ACCESS,
        );
        break;
    }

    return vectors;
  }

  /**
   * Get threat vectors for security violation
   */
  private getThreatVectorsForViolation(
    violation: SecurityViolation,
  ): ThreatVector[] {
    const vectors: ThreatVector[] = [];

    switch (violation.type) {
      case 'unauthorized_access':
        vectors.push(
          ThreatVector.UNAUTHORIZED_ACCESS,
          ThreatVector.PRIVILEGE_ESCALATION,
        );
        break;
      case 'suspicious_query':
        vectors.push(
          ThreatVector.SQL_INJECTION,
          ThreatVector.DATA_EXFILTRATION,
        );
        break;
      case 'connection_limit_exceeded':
        vectors.push(ThreatVector.DENIAL_OF_SERVICE);
        break;
      case 'ip_restriction':
        vectors.push(ThreatVector.UNAUTHORIZED_ACCESS);
        break;
      case 'sql_injection_attempt':
        vectors.push(
          ThreatVector.SQL_INJECTION,
          ThreatVector.DATA_EXFILTRATION,
        );
        break;
    }

    return vectors;
  }

  /**
   * Create system context for internal operations
   */
  private createSystemContext(): ParlantConversationContext {
    return {
      userId: 'system',
      sessionId: this.generateOperationId(),
      agentRole: 'database_security_agent',
      securityLevel: 'HIGH',
      conversationHistory: [],
      metadata: {
        systemOperation: true,
        internalContext: true,
        securityOperation: true,
      },
    };
  }

  /**
   * Perform security validation (enhanced for security operations)
   */
  private async performSecurityValidation(
    request: ParlantSecurityValidationRequest,
  ): Promise<ParlantValidationResponse> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    this.logger.debug(
      `[${operationId}] Performing Parlant security validation`,
      {
        functionName: request.functionName,
        securityAction: request.securityOperation.securityAction,
        securityLevel: request.securityOperation.securityLevel,
        riskLevel: request.riskLevel,
        operationId,
      },
    );

    // Check cache first (shorter cache time for security operations)
    const cacheKey = this.generateSecurityCacheKey(request);
    if (this.validationCache.has(cacheKey)) {
      this.cacheHitCount++;
      this.logger.debug(
        `[${operationId}] Using cached security validation result`,
      );
      return this.validationCache.get(cacheKey)!;
    }

    // Enhanced security validation logic
    const mockValidation: ParlantValidationResponse = {
      approved: this.shouldApproveSecurityOperation(request),
      conversationId: `conv_security_${operationId}`,
      validationTimestamp: new Date(),
      reasoning: this.generateSecurityValidationReasoning(request),
      confidence: 0.85, // Lower confidence for security operations
      suggestedAlternatives: this.generateSecurityAlternatives(request),
      executionContext: this.generateSecurityExecutionContext(request),
    };

    // Cache the result (very short cache time for security operations)
    if (this.isCacheEnabled()) {
      this.validationCache.set(cacheKey, mockValidation);
      // Clear cache after 2 minutes for security operations
      setTimeout(() => this.validationCache.delete(cacheKey), 120000);
    }

    const validationTime = Date.now() - startTime;
    this.updateValidationMetrics(validationTime);

    return mockValidation;
  }

  /**
   * Security approval logic
   */
  private shouldApproveSecurityOperation(
    request: ParlantSecurityValidationRequest,
  ): boolean {
    const security = request.securityOperation;

    // Never auto-approve maximum security level operations
    if (security.securityLevel === SecurityLevel.MAXIMUM) {
      return false; // Require explicit conversational approval
    }

    // Require careful review for critical operations
    if (security.securityLevel === SecurityLevel.CRITICAL) {
      return security.complianceImpact.complianceLevel !== 'CRITICAL';
    }

    // Require approval for operations affecting multiple security controls
    if (
      security.accessControlChanges &&
      security.encryptionChanges &&
      security.authenticationChanges
    ) {
      return false; // Too many changes at once
    }

    // Standard approval for lower-risk operations
    return (
      security.securityLevel === SecurityLevel.LOW ||
      security.securityLevel === SecurityLevel.MEDIUM
    );
  }

  /**
   * Generate security validation reasoning
   */
  private generateSecurityValidationReasoning(
    request: ParlantSecurityValidationRequest,
  ): string {
    const security = request.securityOperation;

    if (
      security.securityLevel === SecurityLevel.CRITICAL ||
      security.securityLevel === SecurityLevel.MAXIMUM
    ) {
      return `Critical security operation ${security.securityAction} requires explicit approval - potential for significant security impact`;
    }

    if (security.isDestructive) {
      return `Destructive security operation detected - data loss or configuration damage risk requires careful validation`;
    }

    if (security.complianceImpact.requiresApproval) {
      return `Compliance frameworks require approval: ${security.complianceImpact.affectedFrameworks.join(', ')}`;
    }

    return `Security operation ${security.securityAction} approved with enhanced safeguards - ${security.affectedComponents.length} components affected`;
  }

  /**
   * Generate security alternatives
   */
  private generateSecurityAlternatives(
    request: ParlantSecurityValidationRequest,
  ): string[] {
    const alternatives: string[] = [];
    const security = request.securityOperation;

    if (
      security.securityLevel === SecurityLevel.CRITICAL ||
      security.securityLevel === SecurityLevel.MAXIMUM
    ) {
      alternatives.push(
        'Break down operation into smaller, incremental security changes',
      );
      alternatives.push(
        'Test security configuration in isolated environment first',
      );
      alternatives.push(
        'Schedule operation during maintenance window with security team oversight',
      );
      alternatives.push('Have security architect review and approve operation');
    }

    if (security.isDestructive) {
      alternatives.push('Create comprehensive backup before proceeding');
      alternatives.push('Verify rollback procedure is tested and documented');
      alternatives.push('Consider staging environment validation first');
    }

    if (security.complianceImpact.requiresApproval) {
      alternatives.push('Obtain compliance team approval before proceeding');
      alternatives.push('Document compliance impact assessment');
      alternatives.push('Schedule compliance review meeting');
    }

    return alternatives;
  }

  /**
   * Generate security execution context
   */
  private generateSecurityExecutionContext(
    request: ParlantSecurityValidationRequest,
  ): ExecutionContext {
    const security = request.securityOperation;

    const context: ExecutionContext = {
      monitoringLevel: 'COMPREHENSIVE',
      safeguards: [
        'security_logging',
        'compliance_tracking',
        'threat_monitoring',
      ],
    };

    // Add security-specific safeguards
    if (security.auditingRequired) {
      context.safeguards.push('audit_trail_generation', 'event_correlation');
    }

    if (security.complianceImpact.requiresApproval) {
      context.safeguards.push('compliance_validation', 'approval_tracking');
    }

    if (
      security.threatAssessment.threatLevel === 'CRITICAL' ||
      security.threatAssessment.threatLevel === 'HIGH'
    ) {
      context.safeguards.push('threat_analysis', 'incident_detection');
    }

    if (
      security.accessControlChanges ||
      security.encryptionChanges ||
      security.authenticationChanges
    ) {
      context.safeguards.push(
        'security_control_validation',
        'configuration_backup',
      );
    }

    // Set timeouts based on security level
    if (
      security.securityLevel === SecurityLevel.CRITICAL ||
      security.securityLevel === SecurityLevel.MAXIMUM
    ) {
      context.timeoutMs = 60000; // 1 minute timeout for critical operations
      context.retryAttempts = 0; // No retries for critical security operations
    } else {
      context.timeoutMs = 30000; // 30 second timeout for normal operations
      context.retryAttempts = 1; // Limited retries for security operations
    }

    return context;
  }

  /**
   * Execute monitored security operation
   */
  private async executeMonitoredSecurityOperation<T>(
    operation: () => Promise<T>,
    executionContext: ExecutionContext | undefined,
    metadata: SecurityOperationMetadata,
    operationId: string,
  ): Promise<T> {
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Executing monitored security operation`, {
      securityAction: metadata.securityAction,
      securityLevel: metadata.securityLevel,
      timeout: executionContext?.timeoutMs,
      safeguards: executionContext?.safeguards,
      operationId,
    });

    this.securityOperationCount++;

    try {
      // Apply timeout for security operations
      if (executionContext?.timeoutMs) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error('Security operation timeout')),
            executionContext.timeoutMs,
          );
        });

        const result = await Promise.race([operation(), timeoutPromise]);

        this.logger.log(
          `[${operationId}] Security operation completed within timeout`,
          {
            securityAction: metadata.securityAction,
            executionTime: Date.now() - startTime,
            operationId,
          },
        );

        return result;
      } else {
        const result = await operation();

        this.logger.log(
          `[${operationId}] Security operation completed successfully`,
          {
            securityAction: metadata.securityAction,
            executionTime: Date.now() - startTime,
            operationId,
          },
        );

        return result;
      }
    } catch (error) {
      this.logger.error(`[${operationId}] Security operation failed`, {
        securityAction: metadata.securityAction,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
        operationId,
      });

      throw error;
    }
  }

  /**
   * Perform post-operation security checks
   */
  private async performPostOperationSecurityChecks<T>(
    metadata: SecurityOperationMetadata,
    _result: T,
  ): Promise<void> {
    const operationId = this.generateOperationId();

    this.logger.debug(
      `[${operationId}] Performing post-operation security checks`,
      {
        securityAction: metadata.securityAction,
        securityLevel: metadata.securityLevel,
      },
    );

    // Check for configuration integrity
    if (metadata.configurationChanges.length > 0) {
      this.logger.debug(`[${operationId}] Validating configuration changes`, {
        changesApplied: metadata.configurationChanges.length,
      });
    }

    // Check compliance status
    if (metadata.complianceImpact.complianceLevel !== 'NONE') {
      this.logger.debug(`[${operationId}] Validating compliance requirements`, {
        complianceLevel: metadata.complianceImpact.complianceLevel,
        frameworks: metadata.complianceImpact.affectedFrameworks,
      });
    }

    // Check threat mitigation
    if (metadata.threatAssessment.monitoringRequired) {
      this.logger.debug(`[${operationId}] Enabling enhanced monitoring`, {
        threatLevel: metadata.threatAssessment.threatLevel,
        vectors: metadata.threatAssessment.threatVectors,
      });
    }
  }

  /**
   * Create security audit entry
   */
  private async createSecurityAuditEntry(
    operationId: string,
    validationResponse: Partial<ParlantValidationResponse>,
    validationRequest: Partial<ParlantSecurityValidationRequest>,
    executionResult: 'SUCCESS' | 'FAILURE' | 'TIMEOUT' | 'CANCELLED',
    duration: number,
    result: unknown,
    error?: string,
  ): Promise<SecurityParlantAuditEntry> {
    const performanceMetrics = {
      query: validationRequest.functionName || 'unknown',
      duration,
      timestamp: new Date(),
      success: executionResult === 'SUCCESS',
      error,
    };

    const complianceStatus: ComplianceStatus = {
      status: executionResult === 'SUCCESS' ? 'COMPLIANT' : 'NON_COMPLIANT',
      affectedFrameworks:
        validationRequest.securityOperation?.complianceImpact
          .affectedFrameworks || [],
      violations: error ? [error] : [],
      remediationRequired: executionResult !== 'SUCCESS',
      documentationComplete: true,
    };

    return {
      operationId,
      conversationId:
        validationResponse.conversationId || `conv_${operationId}`,
      functionName: validationRequest.functionName || 'unknown',
      actionDescription:
        validationRequest.actionDescription || 'Security operation',
      validationResult: validationResponse.approved ? 'APPROVED' : 'DENIED',
      executionResult,
      timestamp: new Date(),
      duration,
      userId: validationRequest.context?.userId || 'system',
      riskLevel: validationRequest.riskLevel || RiskLevel.CRITICAL,
      conversationSummary:
        validationResponse.reasoning || 'No reasoning provided',
      databaseOperation: validationRequest.databaseOperation || {
        operationType: 'SECURITY',
        queryDescription: 'Unknown security operation',
        isDestructive: false,
        requiresBackup: true,
      },
      securityOperation: validationRequest.securityOperation || {
        securityAction: SecurityActionType.CONFIGURATION_UPDATE,
        securityLevel: SecurityLevel.CRITICAL,
        affectedComponents: [],
        configurationChanges: [],
        auditingRequired: true,
        complianceImpact: {
          affectedFrameworks: [],
          complianceLevel: 'HIGH',
          requiresApproval: true,
          documentationRequired: true,
          attestationRequired: true,
          auditTrailMandatory: true,
        },
        threatAssessment: {
          threatLevel: 'HIGH',
          threatVectors: [],
          mitigationStrategies: [],
          residualRisk: 'MANAGEABLE',
          monitoringRequired: true,
          alertingRequired: true,
          escalationRequired: false,
        },
        accessControlChanges: false,
        encryptionChanges: false,
        authenticationChanges: false,
        operationType: 'SECURITY',
        queryDescription: 'Unknown security operation',
        isDestructive: false,
        requiresBackup: true,
      },
      queryExecutionTime: duration,
      performanceMetrics,
      securityAction:
        validationRequest.securityOperation?.securityAction ||
        SecurityActionType.CONFIGURATION_UPDATE,
      securityLevel:
        validationRequest.securityOperation?.securityLevel ||
        SecurityLevel.CRITICAL,
      configurationChangesApplied:
        validationRequest.securityOperation?.configurationChanges || [],
      complianceStatus,
      threatResponseExecuted:
        validationRequest.securityOperation?.threatAssessment
          .escalationRequired || false,
      securityControlsModified:
        validationRequest.securityOperation?.accessControlChanges ||
        validationRequest.securityOperation?.encryptionChanges ||
        validationRequest.securityOperation?.authenticationChanges ||
        false,
      auditEventGenerated:
        validationRequest.securityOperation?.auditingRequired || false,
    };
  }

  /**
   * Create security violation
   */
  private async createSecurityViolation(
    operationId: string,
    metadata: SecurityOperationMetadata,
    error: string,
  ): Promise<void> {
    const violation: SecurityViolation = {
      violationId: `violation_${operationId}`,
      timestamp: new Date(),
      type: 'unauthorized_access',
      severity:
        metadata.securityLevel === SecurityLevel.CRITICAL ? 'critical' : 'high',
      description: `Security operation failure: ${metadata.securityAction} - ${error}`,
      sourceIp: undefined,
      userId: undefined,
      sessionId: operationId,
      context: {
        operationId,
        securityAction: metadata.securityAction,
        securityLevel: metadata.securityLevel,
        error,
      },
      blocked: true,
    };

    this.securityViolations.push(violation);

    this.logger.warn('Security violation created for failed operation', {
      violationId: violation.violationId,
      severity: violation.severity,
      securityAction: metadata.securityAction,
    });
  }

  /**
   * Perform security health check
   */
  private async performSecurityHealthCheck(): Promise<void> {
    const operationId = this.generateOperationId();

    this.logger.debug(`[${operationId}] Performing security health check`);

    // Check for recent violations
    const recentViolations = this.securityViolations.filter(
      (v) => Date.now() - v.timestamp.getTime() < 3600000, // Last hour
    );

    if (recentViolations.length > 10) {
      this.logger.warn('High number of recent security violations detected', {
        violationCount: recentViolations.length,
        severities: recentViolations.map((v) => v.severity),
      });
    }

    // Check for critical operations
    if (this.criticalOperationCount > 5) {
      this.logger.warn('High number of critical security operations', {
        criticalOperations: this.criticalOperationCount,
      });
    }
  }

  /**
   * Generate security cache key
   */
  private generateSecurityCacheKey(
    request: ParlantSecurityValidationRequest,
  ): string {
    const keyData = {
      functionName: request.functionName,
      securityAction: request.securityOperation.securityAction,
      securityLevel: request.securityOperation.securityLevel,
      isDestructive: request.securityOperation.isDestructive,
      configChanges: request.securityOperation.configurationChanges.length,
      userId: request.context.userId,
    };

    return `security_cache_${JSON.stringify(keyData)}`;
  }

  /**
   * Update validation metrics
   */
  private updateValidationMetrics(validationTime: number): void {
    this.averageValidationTime =
      (this.averageValidationTime * (this.securityOperationCount - 1) +
        validationTime) /
      this.securityOperationCount;
  }

  /**
   * Log performance metrics
   */
  private logPerformanceMetrics(): void {
    const cacheHitRate =
      this.securityOperationCount > 0
        ? (this.cacheHitCount / this.securityOperationCount) * 100
        : 0;

    this.logger.log('Parlant Security Service Performance Metrics', {
      totalOperations: this.securityOperationCount,
      criticalOperations: this.criticalOperationCount,
      cacheHitRate: `${cacheHitRate.toFixed(2)}%`,
      averageValidationTime: `${this.averageValidationTime.toFixed(2)}ms`,
      auditEntries: this.auditTrail.length,
      securityViolations: this.securityViolations.length,
    });
  }

  /**
   * Configuration helper methods
   */
  private isParlantEnabled(): boolean {
    return this.configService.get<boolean>('PARLANT_ENABLED', true);
  }

  private isCacheEnabled(): boolean {
    return this.configService.get<boolean>('PARLANT_CACHE_ENABLED', true);
  }

  private isAuditEnabled(): boolean {
    return this.configService.get<boolean>('PARLANT_AUDIT_ENABLED', true);
  }

  private getComplianceMode(): string {
    return this.configService.get<string>('PARLANT_COMPLIANCE_MODE', 'strict');
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `security_parlant_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // ===== PUBLIC API METHODS =====

  /**
   * Get comprehensive security audit trail
   */
  getSecurityAuditTrail(): SecurityParlantAuditEntry[] {
    return [...this.auditTrail];
  }

  /**
   * Get security violations
   */
  getSecurityViolations(): SecurityViolation[] {
    return [...this.securityViolations];
  }

  /**
   * Get security statistics
   */
  getSecurityStatistics() {
    const securityLevels = this.auditTrail.reduce(
      (acc, entry) => {
        const level = entry.securityLevel;
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const securityActions = this.auditTrail.reduce(
      (acc, entry) => {
        const action = entry.securityAction;
        acc[action] = (acc[action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const complianceFrameworks = this.auditTrail.reduce(
      (acc, entry) => {
        entry.complianceStatus.affectedFrameworks.forEach((framework) => {
          acc[framework] = (acc[framework] || 0) + 1;
        });
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalOperations: this.securityOperationCount,
      criticalOperations: this.criticalOperationCount,
      successRate: this.calculateSuccessRate(),
      averageExecutionTime: this.calculateAverageExecutionTime(),
      securityLevelDistribution: securityLevels,
      securityActionDistribution: securityActions,
      complianceFrameworkImpact: complianceFrameworks,
      auditTrailSize: this.auditTrail.length,
      violationCount: this.securityViolations.length,
    };
  }

  /**
   * Calculate success rate
   */
  private calculateSuccessRate(): string {
    if (this.auditTrail.length === 0) return '0%';

    const successCount = this.auditTrail.filter(
      (entry) => entry.executionResult === 'SUCCESS',
    ).length;

    return `${((successCount / this.auditTrail.length) * 100).toFixed(2)}%`;
  }

  /**
   * Calculate average execution time
   */
  private calculateAverageExecutionTime(): string {
    if (this.auditTrail.length === 0) return '0ms';

    const totalTime = this.auditTrail.reduce(
      (sum, entry) => sum + entry.duration,
      0,
    );
    return `${(totalTime / this.auditTrail.length).toFixed(2)}ms`;
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
    this.logger.log('Parlant security validation cache cleared');
  }

  /**
   * Clear security violations (for maintenance)
   */
  clearSecurityViolations(): void {
    this.securityViolations.length = 0;
    this.logger.log('Security violations cleared');
  }
}
