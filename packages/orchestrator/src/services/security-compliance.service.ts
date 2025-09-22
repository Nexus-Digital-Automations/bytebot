/**
 * Security Compliance Integration Service
 *
 * Comprehensive security compliance service integrating with PARLANT
 * validation for audit trails, access control, and regulatory compliance
 * across all orchestration operations.
 *
 * Features:
 * - Real-time security compliance validation
 * - Comprehensive audit trail generation
 * - Multi-tier access control with RBAC/ABAC
 * - Regulatory framework compliance (GDPR, HIPAA, SOX, PCI-DSS)
 * - Security incident detection and response
 * - Risk-based authentication and authorization
 *
 * @module SecurityComplianceService
 * @version 1.0.0
 * @author AIgent Orchestrator Team
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

// Import types
import {
  SecurityLevel,
  ParlantUserContext,
  ComplianceValidationResult,
  ComplianceViolation,
  _ValidationAuditEntry
} from '../types/parlant-shared.types';
import {
  OrchestrationTask,
  OrchestrationExecutionContext,
  OrchestrationUserContext,
  _WorkflowStep
} from '../types/orchestrator.types';

// ===== SECURITY INTERFACES =====

/**
 * Security compliance request
 */
export interface SecurityComplianceRequest {
  /** Unique compliance check ID */
  readonly complianceId: string;
  /** Orchestration task to validate */
  readonly task: OrchestrationTask;
  /** User context for access control */
  readonly userContext: OrchestrationUserContext;
  /** Parlant conversation context */
  readonly conversationContext: ParlantUserContext;
  /** Required security classification */
  readonly requiredSecurityLevel: SecurityLevel;
  /** Compliance frameworks to check */
  readonly frameworks: ComplianceFramework[];
  /** Request timestamp */
  readonly timestamp: Date;
}

/**
 * Compliance framework definition
 */
export interface ComplianceFramework {
  /** Framework name (GDPR, HIPAA, SOX, etc.) */
  readonly name: string;
  /** Framework version */
  readonly version: string;
  /** Compliance level (basic, enhanced, strict) */
  readonly level: 'basic' | 'enhanced' | 'strict';
  /** Framework requirements */
  readonly requirements: ComplianceRequirement[];
  /** Audit retention period in days */
  readonly auditRetentionDays: number;
}

/**
 * Individual compliance requirement
 */
export interface ComplianceRequirement {
  /** Requirement ID */
  readonly id: string;
  /** Requirement description */
  readonly description: string;
  /** Severity level */
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Validation function */
  readonly validator: string;
  /** Remediation steps */
  readonly remediation: string[];
}

/**
 * Security access control context
 */
export interface SecurityAccessContext {
  /** User identity verification */
  readonly identity: UserIdentity;
  /** Access control evaluation */
  readonly accessControl: AccessControlEvaluation;
  /** Risk assessment results */
  readonly riskAssessment: RiskAssessment;
  /** Session security attributes */
  readonly sessionSecurity: SessionSecurity;
}

/**
 * User identity information
 */
export interface UserIdentity {
  /** User ID */
  readonly userId: string;
  /** Authentication method used */
  readonly authMethod: AuthenticationMethod;
  /** Identity verification level */
  readonly verificationLevel: IdentityVerificationLevel;
  /** User roles and permissions */
  readonly roles: string[];
  /** Group memberships */
  readonly groups: string[];
  /** Identity attributes */
  readonly attributes: Record<string, string>;
}

/**
 * Authentication methods
 */
export enum AuthenticationMethod {
  PASSWORD = 'password',
  MFA = 'mfa',
  CERTIFICATE = 'certificate',
  BIOMETRIC = 'biometric',
  SSO = 'sso',
  API_KEY = 'api_key'
}

/**
 * Identity verification levels
 */
export enum IdentityVerificationLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Access control evaluation result
 */
export interface AccessControlEvaluation {
  /** Whether access is granted */
  readonly granted: boolean;
  /** Access control model used */
  readonly model: 'RBAC' | 'ABAC' | 'HYBRID';
  /** Permissions granted */
  readonly permissions: Permission[];
  /** Access restrictions */
  readonly restrictions: AccessRestriction[];
  /** Evaluation time */
  readonly evaluationTime: Date;
}

/**
 * Permission definition
 */
export interface Permission {
  /** Permission ID */
  readonly id: string;
  /** Permission name */
  readonly name: string;
  /** Resource type */
  readonly resource: string;
  /** Allowed actions */
  readonly actions: string[];
  /** Permission scope */
  readonly scope: string;
  /** Expiration time */
  readonly expiresAt?: Date;
}

/**
 * Access restriction
 */
export interface AccessRestriction {
  /** Restriction type */
  readonly type: string;
  /** Restriction description */
  readonly description: string;
  /** Restriction severity */
  readonly severity: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  /** Restriction conditions */
  readonly conditions: Record<string, unknown>;
}

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  /** Overall risk score (0-100) */
  readonly riskScore: number;
  /** Risk level */
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Risk factors identified */
  readonly riskFactors: RiskFactor[];
  /** Mitigation requirements */
  readonly mitigationRequired: boolean;
  /** Assessment timestamp */
  readonly assessmentTime: Date;
}

/**
 * Risk factor
 */
export interface RiskFactor {
  /** Factor type */
  readonly type: string;
  /** Factor description */
  readonly description: string;
  /** Factor weight (0-1) */
  readonly weight: number;
  /** Factor value */
  readonly value: number;
  /** Mitigation strategies */
  readonly mitigation: string[];
}

/**
 * Session security attributes
 */
export interface SessionSecurity {
  /** Session ID */
  readonly sessionId: string;
  /** Session creation time */
  readonly createdAt: Date;
  /** Last activity time */
  readonly lastActivity: Date;
  /** IP address */
  readonly ipAddress: string;
  /** Geographic location */
  readonly location?: GeoLocation;
  /** Device information */
  readonly device?: DeviceInfo;
  /** Security flags */
  readonly securityFlags: SecurityFlag[];
}

/**
 * Geographic location
 */
export interface GeoLocation {
  readonly country: string;
  readonly region: string;
  readonly city: string;
  readonly coordinates?: { lat: number; lon: number };
}

/**
 * Device information
 */
export interface DeviceInfo {
  readonly deviceId: string;
  readonly deviceType: string;
  readonly os: string;
  readonly browser?: string;
  readonly trusted: boolean;
}

/**
 * Security flag
 */
export interface SecurityFlag {
  readonly flag: string;
  readonly severity: string;
  readonly description: string;
  readonly timestamp: Date;
}

/**
 * Comprehensive audit entry
 */
export interface SecurityAuditEntry {
  /** Audit entry ID */
  readonly auditId: string;
  /** Event timestamp */
  readonly timestamp: Date;
  /** Event type */
  readonly eventType: SecurityEventType;
  /** Event description */
  readonly description: string;
  /** User who performed the action */
  readonly actor: SecurityActor;
  /** Resources affected */
  readonly resources: SecurityResource[];
  /** Event outcome */
  readonly outcome: EventOutcome;
  /** Security classification */
  readonly classification: SecurityLevel;
  /** Compliance requirements met */
  readonly complianceRequirements: string[];
  /** Event metadata */
  readonly metadata: Record<string, unknown>;
  /** Digital signature for integrity */
  readonly signature?: string;
}

/**
 * Security event types
 */
export enum SecurityEventType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  ACCESS_GRANTED = 'access_granted',
  ACCESS_DENIED = 'access_denied',
  ORCHESTRATION_START = 'orchestration_start',
  ORCHESTRATION_END = 'orchestration_end',
  VALIDATION_SUCCESS = 'validation_success',
  VALIDATION_FAILURE = 'validation_failure',
  COMPLIANCE_CHECK = 'compliance_check',
  SECURITY_VIOLATION = 'security_violation',
  INCIDENT_DETECTED = 'incident_detected',
  ADMIN_ACTION = 'admin_action'
}

/**
 * Security actor (user, system, service)
 */
export interface SecurityActor {
  readonly actorType: 'USER' | 'SYSTEM' | 'SERVICE';
  readonly actorId: string;
  readonly actorName: string;
  readonly roles: string[];
  readonly sessionId?: string;
}

/**
 * Security resource
 */
export interface SecurityResource {
  readonly resourceType: string;
  readonly resourceId: string;
  readonly resourceName: string;
  readonly classification: SecurityLevel;
}

/**
 * Event outcome
 */
export enum EventOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PARTIAL = 'partial',
  BLOCKED = 'blocked'
}

// ===== MAIN SERVICE =====

@Injectable()
export class SecurityComplianceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SecurityComplianceService.name);

  // Configuration
  private readonly defaultAuditRetention = 2555; // 7 years in days
  private readonly maxConcurrentChecks = 1000;

  // State management
  private readonly activeComplianceChecks = new Map<string, SecurityComplianceRequest>();
  private readonly auditTrail = new Map<string, SecurityAuditEntry[]>();
  private readonly securityIncidents = new Map<string, SecurityIncident>();

  // Performance tracking
  private metrics = {
    totalComplianceChecks: 0,
    successfulChecks: 0,
    failedChecks: 0,
    violationsDetected: 0,
    incidentsCreated: 0,
    averageCheckTime: 0
  };

  // Cleanup timer
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Security Compliance Service...');

    // Start periodic cleanup
    this.startCleanupTimer();

    this.logger.log('Security Compliance Service initialized successfully');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Archive active compliance checks
    await this.archiveActiveChecks();
  }

  // ===== PRIMARY COMPLIANCE INTERFACE =====

  /**
   * Perform comprehensive security compliance validation
   */
  async validateSecurityCompliance(
    request: SecurityComplianceRequest
  ): Promise<ComplianceValidationResult> {
    const startTime = Date.now();

    this.logger.log(`Starting security compliance validation`, {
      complianceId: request.complianceId,
      taskId: request.task.taskId,
      frameworks: request.frameworks.map(f => f.name)
    });

    try {
      // Register active compliance check
      this.activeComplianceChecks.set(request.complianceId, request);

      // 1. Security access control validation
      const accessContext = await this.validateSecurityAccess(request);

      // 2. Framework compliance validation
      const frameworkResults = await this.validateComplianceFrameworks(
        request.frameworks,
        request,
        accessContext
      );

      // 3. Risk-based compliance assessment
      const riskCompliance = await this.assessRiskBasedCompliance(
        request,
        accessContext
      );

      // 4. Generate comprehensive audit trail
      const auditEntries = await this.generateSecurityAuditTrail(
        request,
        accessContext,
        frameworkResults,
        riskCompliance
      );

      // 5. Consolidate compliance results
      const consolidatedResult = this.consolidateComplianceResults(
        frameworkResults,
        riskCompliance,
        auditEntries
      );

      // Store audit trail
      await this.storeAuditTrail(request.complianceId, auditEntries);

      // Check for security incidents
      await this.checkForSecurityIncidents(request, consolidatedResult);

      const validationTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(validationTime, consolidatedResult.compliant);

      // Emit compliance event
      this.eventEmitter.emit('security.compliance.validated', {
        complianceId: request.complianceId,
        result: consolidatedResult,
        validationTime
      });

      this.logger.log(`Security compliance validation completed`, {
        complianceId: request.complianceId,
        compliant: consolidatedResult.compliant,
        violations: consolidatedResult.violations.length,
        validationTime
      });

      return consolidatedResult;

    } catch (error) {
      const validationTime = Date.now() - startTime;
      this.updateMetrics(validationTime, false);

      this.logger.error(`Security compliance validation failed`, {
        complianceId: request.complianceId,
        error: error instanceof Error ? error.message : String(error),
        validationTime
      });

      // Create security incident for validation failure
      await this.createSecurityIncident({
        incidentId: uuidv4(),
        type: 'COMPLIANCE_VALIDATION_FAILURE',
        severity: 'HIGH',
        description: `Security compliance validation failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
        relatedRequest: request,
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });

      // Return failure result
      return {
        compliant: false,
        violations: [{
          rule: 'COMPLIANCE_VALIDATION_FAILURE',
          severity: 'HIGH',
          description: `Security compliance validation system failure: ${error instanceof Error ? error.message : String(error)}`
        }],
        auditRequired: true,
        frameworksChecked: request.frameworks.map(f => f.name),
        timestamp: new Date(),
        error: error instanceof Error ? error : new Error(String(error))
      };

    } finally {
      // Cleanup active compliance check
      this.activeComplianceChecks.delete(request.complianceId);
    }
  }

  /**
   * Generate audit trail for orchestration operation
   */
  async generateAuditTrail(
    operation: OrchestrationExecutionContext,
    userContext: OrchestrationUserContext
  ): Promise<SecurityAuditEntry[]> {
    const auditEntries: SecurityAuditEntry[] = [];

    try {
      // Create orchestration start audit entry
      auditEntries.push({
        auditId: uuidv4(),
        timestamp: operation.state.startTime,
        eventType: SecurityEventType.ORCHESTRATION_START,
        description: `Orchestration started: ${operation.task.taskId}`,
        actor: {
          actorType: 'USER',
          actorId: userContext.userId,
          actorName: userContext.userId,
          roles: userContext.roles,
          sessionId: userContext.sessionId
        },
        resources: [{
          resourceType: 'ORCHESTRATION',
          resourceId: operation.executionId,
          resourceName: operation.task.taskId,
          classification: SecurityLevel.INTERNAL
        }],
        outcome: EventOutcome.SUCCESS,
        classification: SecurityLevel.INTERNAL,
        complianceRequirements: [],
        metadata: {
          taskPriority: operation.task.priority,
          workflowSteps: operation.task.workflow.length
        }
      });

      // Create audit entries for each workflow step
      for (const stepId of operation.state.completedSteps) {
        const stepResult = operation.stepResults.get(stepId);
        if (stepResult) {
          auditEntries.push({
            auditId: uuidv4(),
            timestamp: stepResult.endTime || new Date(),
            eventType: SecurityEventType.ORCHESTRATION_END,
            description: `Workflow step completed: ${stepId}`,
            actor: {
              actorType: 'SYSTEM',
              actorId: 'orchestrator',
              actorName: 'Orchestrator Service',
              roles: ['system']
            },
            resources: [{
              resourceType: 'WORKFLOW_STEP',
              resourceId: stepId,
              resourceName: stepId,
              classification: SecurityLevel.INTERNAL
            }],
            outcome: EventOutcome.SUCCESS,
            classification: SecurityLevel.INTERNAL,
            complianceRequirements: [],
            metadata: {
              stepResult: stepResult.result,
              duration: stepResult.durationMs
            }
          });
        }
      }

      // Create audit entries for failed steps
      for (const stepId of operation.state.failedSteps) {
        const stepResult = operation.stepResults.get(stepId);
        if (stepResult) {
          auditEntries.push({
            auditId: uuidv4(),
            timestamp: stepResult.endTime || new Date(),
            eventType: SecurityEventType.ORCHESTRATION_END,
            description: `Workflow step failed: ${stepId}`,
            actor: {
              actorType: 'SYSTEM',
              actorId: 'orchestrator',
              actorName: 'Orchestrator Service',
              roles: ['system']
            },
            resources: [{
              resourceType: 'WORKFLOW_STEP',
              resourceId: stepId,
              resourceName: stepId,
              classification: SecurityLevel.INTERNAL
            }],
            outcome: EventOutcome.FAILURE,
            classification: SecurityLevel.CONFIDENTIAL,
            complianceRequirements: [],
            metadata: {
              error: stepResult.error,
              duration: stepResult.durationMs
            }
          });
        }
      }

      return auditEntries;

    } catch (error) {
      this.logger.error('Failed to generate audit trail', error);
      return [];
    }
  }

  /**
   * Validate user access control
   */
  async validateUserAccess(
    userContext: OrchestrationUserContext,
    task: OrchestrationTask,
    requiredSecurityLevel: SecurityLevel
  ): Promise<AccessControlEvaluation> {
    try {
      // Evaluate RBAC permissions
      const rbacResult = await this.evaluateRBAC(userContext, task);

      // Evaluate ABAC policies if enabled
      const abacResult = await this.evaluateABAC(userContext, task);

      // Combine RBAC and ABAC results
      const permissions = [...rbacResult.permissions, ...abacResult.permissions];
      const restrictions = [...rbacResult.restrictions, ...abacResult.restrictions];

      // Check security level requirements
      const securityLevelMet = await this.checkSecurityLevelRequirements(
        userContext,
        requiredSecurityLevel
      );

      const granted = rbacResult.granted && abacResult.granted && securityLevelMet;

      return {
        granted,
        model: 'HYBRID',
        permissions,
        restrictions,
        evaluationTime: new Date()
      };

    } catch (error) {
      this.logger.error('User access validation failed', error);

      return {
        granted: false,
        model: 'HYBRID',
        permissions: [],
        restrictions: [{
          type: 'ACCESS_VALIDATION_ERROR',
          description: `Access validation failed: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'CRITICAL',
          conditions: {}
        }],
        evaluationTime: new Date()
      };
    }
  }

  /**
   * Get audit trail for a resource
   */
  getAuditTrail(resourceId: string): SecurityAuditEntry[] {
    return this.auditTrail.get(resourceId) || [];
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): typeof this.metrics {
    return {
      ...this.metrics,
      activeComplianceChecks: this.activeComplianceChecks.size,
      activeIncidents: this.securityIncidents.size
    };
  }

  // ===== PRIVATE IMPLEMENTATION METHODS =====

  /**
   * Validate security access context
   */
  private async validateSecurityAccess(
    request: SecurityComplianceRequest
  ): Promise<SecurityAccessContext> {
    // Extract user identity
    const identity = await this.extractUserIdentity(request.userContext);

    // Perform access control evaluation
    const accessControl = await this.validateUserAccess(
      request.userContext,
      request.task,
      request.requiredSecurityLevel
    );

    // Assess risk
    const riskAssessment = await this.assessUserRisk(
      request.userContext,
      request.task
    );

    // Evaluate session security
    const sessionSecurity = await this.evaluateSessionSecurity(
      request.userContext,
      request.conversationContext
    );

    return {
      identity,
      accessControl,
      riskAssessment,
      sessionSecurity
    };
  }

  /**
   * Extract user identity information
   */
  private async extractUserIdentity(
    userContext: OrchestrationUserContext
  ): Promise<UserIdentity> {
    // In a real implementation, this would integrate with identity providers
    return {
      userId: userContext.userId,
      authMethod: AuthenticationMethod.MFA, // Default assumption
      verificationLevel: IdentityVerificationLevel.MEDIUM,
      roles: userContext.roles,
      groups: [], // Would be populated from identity provider
      attributes: {
        sessionId: userContext.sessionId,
        ipAddress: userContext.ipAddress
      }
    };
  }

  /**
   * Assess user risk
   */
  private async assessUserRisk(
    userContext: OrchestrationUserContext,
    task: OrchestrationTask
  ): Promise<RiskAssessment> {
    const riskFactors: RiskFactor[] = [];
    let totalRiskScore = 0;

    // Role-based risk
    const hasHighRiskRoles = userContext.roles.some(role =>
      ['admin', 'superuser', 'root'].includes(role.toLowerCase())
    );
    if (hasHighRiskRoles) {
      const factor: RiskFactor = {
        type: 'HIGH_PRIVILEGE_ROLE',
        description: 'User has high-privilege roles',
        weight: 0.3,
        value: 80,
        mitigation: ['Require additional approval', 'Enhanced monitoring']
      };
      riskFactors.push(factor);
      totalRiskScore += factor.weight * factor.value;
    }

    // Task complexity risk
    const taskComplexity = task.workflow.length;
    if (taskComplexity > 10) {
      const factor: RiskFactor = {
        type: 'COMPLEX_TASK',
        description: 'Task has high complexity',
        weight: 0.2,
        value: Math.min(taskComplexity * 5, 100),
        mitigation: ['Step-by-step validation', 'Intermediate approvals']
      };
      riskFactors.push(factor);
      totalRiskScore += factor.weight * factor.value;
    }

    // Session-based risk (simplified)
    const sessionAge = Date.now() - new Date(userContext.sessionId).getTime();
    if (sessionAge > 8 * 60 * 60 * 1000) { // 8 hours
      const factor: RiskFactor = {
        type: 'LONG_SESSION',
        description: 'User session is unusually long',
        weight: 0.1,
        value: 60,
        mitigation: ['Re-authentication required']
      };
      riskFactors.push(factor);
      totalRiskScore += factor.weight * factor.value;
    }

    const riskScore = Math.min(totalRiskScore, 100);
    const riskLevel = this.calculateRiskLevel(riskScore);

    return {
      riskScore,
      riskLevel,
      riskFactors,
      mitigationRequired: riskLevel === 'HIGH' || riskLevel === 'CRITICAL',
      assessmentTime: new Date()
    };
  }

  /**
   * Calculate risk level from score
   */
  private calculateRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Evaluate session security
   */
  private async evaluateSessionSecurity(
    userContext: OrchestrationUserContext,
    conversationContext: ParlantUserContext
  ): Promise<SessionSecurity> {
    const securityFlags: SecurityFlag[] = [];

    // Check for suspicious IP
    if (userContext.ipAddress !== conversationContext.ipAddress) {
      securityFlags.push({
        flag: 'IP_MISMATCH',
        severity: 'MEDIUM',
        description: 'IP address mismatch between user context and conversation',
        timestamp: new Date()
      });
    }

    return {
      sessionId: userContext.sessionId,
      createdAt: new Date(), // Would be tracked in session store
      lastActivity: new Date(),
      ipAddress: userContext.ipAddress,
      securityFlags
    };
  }

  /**
   * Validate compliance frameworks
   */
  private async validateComplianceFrameworks(
    frameworks: ComplianceFramework[],
    request: SecurityComplianceRequest,
    accessContext: SecurityAccessContext
  ): Promise<ComplianceValidationResult[]> {
    const results: ComplianceValidationResult[] = [];

    for (const framework of frameworks) {
      const result = await this.validateSingleFramework(
        framework,
        request,
        accessContext
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Validate single compliance framework
   */
  private async validateSingleFramework(
    framework: ComplianceFramework,
    request: SecurityComplianceRequest,
    accessContext: SecurityAccessContext
  ): Promise<ComplianceValidationResult> {
    const violations: ComplianceViolation[] = [];

    try {
      // Validate each requirement in the framework
      for (const requirement of framework.requirements) {
        const violation = await this.validateRequirement(
          requirement,
          request,
          accessContext
        );
        if (violation) {
          violations.push(violation);
        }
      }

      return {
        compliant: violations.length === 0,
        violations,
        auditRequired: framework.level === 'strict' || violations.some(v => v.severity === 'HIGH'),
        frameworksChecked: [framework.name],
        timestamp: new Date()
      };

    } catch (error) {
      return {
        compliant: false,
        violations: [{
          rule: `${framework.name}_VALIDATION_ERROR`,
          severity: 'HIGH',
          description: `Framework validation failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        auditRequired: true,
        frameworksChecked: [framework.name],
        timestamp: new Date(),
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Validate individual requirement
   */
  private async validateRequirement(
    requirement: ComplianceRequirement,
    request: SecurityComplianceRequest,
    accessContext: SecurityAccessContext
  ): Promise<ComplianceViolation | null> {
    try {
      // Route to specific validator based on requirement type
      switch (requirement.validator) {
        case 'gdpr_consent':
          return await this.validateGDPRConsent(requirement, request, accessContext);
        case 'hipaa_encryption':
          return await this.validateHIPAAEncryption(requirement, request, accessContext);
        case 'sox_audit_trail':
          return await this.validateSOXAuditTrail(requirement, request, accessContext);
        case 'pci_data_protection':
          return await this.validatePCIDataProtection(requirement, request, accessContext);
        case 'access_control':
          return await this.validateAccessControl(requirement, request, accessContext);
        case 'data_classification':
          return await this.validateDataClassification(requirement, request, accessContext);
        default:
          return await this.validateGenericRequirement(requirement, request, accessContext);
      }
    } catch (error) {
      return {
        rule: requirement.id,
        severity: requirement.severity,
        description: `Requirement validation failed: ${error instanceof Error ? error.message : String(error)}`,
        remediation: requirement.remediation
      };
    }
  }

  /**
   * Validate GDPR consent requirement
   */
  private async validateGDPRConsent(
    requirement: ComplianceRequirement,
    request: SecurityComplianceRequest,
    _accessContext: SecurityAccessContext
  ): Promise<ComplianceViolation | null> {
    // Check if task involves personal data processing
    const hasPersonalData = request.task.workflow.some(step =>
      step.parameters?.personalData || step.parameters?.userData
    );

    if (hasPersonalData) {
      // Check for consent validation step
      const hasConsentValidation = request.task.workflow.some(step =>
        step.parameters?.validationType === 'consent'
      );

      if (!hasConsentValidation) {
        return {
          rule: requirement.id,
          severity: requirement.severity,
          description: 'Personal data processing requires explicit consent validation',
          remediation: requirement.remediation
        };
      }
    }

    return null; // No violation
  }

  /**
   * Validate HIPAA encryption requirement
   */
  private async validateHIPAAEncryption(
    requirement: ComplianceRequirement,
    request: SecurityComplianceRequest,
    _accessContext: SecurityAccessContext
  ): Promise<ComplianceViolation | null> {
    // Check if task involves health data
    const hasHealthData = request.task.workflow.some(step =>
      step.parameters?.healthData || step.parameters?.medicalData
    );

    if (hasHealthData) {
      // Check for encryption requirements
      const hasEncryption = request.task.workflow.every(step =>
        !step.parameters?.healthData || step.parameters?.encrypted === true
      );

      if (!hasEncryption) {
        return {
          rule: requirement.id,
          severity: requirement.severity,
          description: 'Health data processing requires encryption',
          remediation: requirement.remediation
        };
      }
    }

    return null;
  }

  /**
   * Validate SOX audit trail requirement
   */
  private async validateSOXAuditTrail(
    requirement: ComplianceRequirement,
    request: SecurityComplianceRequest,
    _accessContext: SecurityAccessContext
  ): Promise<ComplianceViolation | null> {
    // Check if task involves financial data
    const hasFinancialData = request.task.workflow.some(step =>
      step.parameters?.financialData || step.parameters?.accounting
    );

    if (hasFinancialData) {
      // Check for audit trail requirements
      const hasAuditTrail = request.task.complianceRequirements?.auditRequired === true;

      if (!hasAuditTrail) {
        return {
          rule: requirement.id,
          severity: requirement.severity,
          description: 'Financial data operations require audit trails',
          remediation: requirement.remediation
        };
      }
    }

    return null;
  }

  /**
   * Validate PCI data protection requirement
   */
  private async validatePCIDataProtection(
    requirement: ComplianceRequirement,
    request: SecurityComplianceRequest,
    _accessContext: SecurityAccessContext
  ): Promise<ComplianceViolation | null> {
    // Check if task involves payment data
    const hasPaymentData = request.task.workflow.some(step =>
      step.parameters?.paymentData || step.parameters?.cardData
    );

    if (hasPaymentData) {
      // PCI data should be processed in specialized secure environment
      return {
        rule: requirement.id,
        severity: requirement.severity,
        description: 'Payment card data requires specialized secure processing environment',
        remediation: requirement.remediation
      };
    }

    return null;
  }

  /**
   * Validate access control requirement
   */
  private async validateAccessControl(
    requirement: ComplianceRequirement,
    _request: SecurityComplianceRequest,
    accessContext: SecurityAccessContext
  ): Promise<ComplianceViolation | null> {
    if (!accessContext.accessControl.granted) {
      return {
        rule: requirement.id,
        severity: requirement.severity,
        description: 'Access control validation failed',
        remediation: requirement.remediation
      };
    }

    return null;
  }

  /**
   * Validate data classification requirement
   */
  private async validateDataClassification(
    requirement: ComplianceRequirement,
    request: SecurityComplianceRequest,
    accessContext: SecurityAccessContext
  ): Promise<ComplianceViolation | null> {
    // Check if user has appropriate clearance for security level
    const userClearanceLevel = this.getUserClearanceLevel(accessContext.identity);
    const requiredLevel = request.requiredSecurityLevel;

    if (!this.checkSecurityClearance(userClearanceLevel, requiredLevel)) {
      return {
        rule: requirement.id,
        severity: requirement.severity,
        description: `Insufficient security clearance for ${requiredLevel} operations`,
        remediation: requirement.remediation
      };
    }

    return null;
  }

  /**
   * Validate generic requirement
   */
  private async validateGenericRequirement(
    requirement: ComplianceRequirement,
    request: SecurityComplianceRequest,
    _accessContext: SecurityAccessContext
  ): Promise<ComplianceViolation | null> {
    // Generic validation based on requirement severity
    if (requirement.severity === 'CRITICAL') {
      // Critical requirements always need special attention
      const hasSpecialHandling = request.task.workflow.some(step =>
        step.parameters?.specialHandling === true
      );

      if (!hasSpecialHandling) {
        return {
          rule: requirement.id,
          severity: requirement.severity,
          description: 'Critical operations require special handling',
          remediation: requirement.remediation
        };
      }
    }

    return null;
  }

  /**
   * Get user clearance level
   */
  private getUserClearanceLevel(identity: UserIdentity): SecurityLevel {
    // Determine clearance based on roles
    if (identity.roles.includes('classified-admin')) {
      return SecurityLevel.CLASSIFIED;
    }
    if (identity.roles.includes('restricted-admin')) {
      return SecurityLevel.RESTRICTED;
    }
    if (identity.roles.includes('confidential-user')) {
      return SecurityLevel.CONFIDENTIAL;
    }
    return SecurityLevel.INTERNAL;
  }

  /**
   * Check security clearance
   */
  private checkSecurityClearance(
    userLevel: SecurityLevel,
    requiredLevel: SecurityLevel
  ): boolean {
    const levels = [
      SecurityLevel.INTERNAL,
      SecurityLevel.CONFIDENTIAL,
      SecurityLevel.RESTRICTED,
      SecurityLevel.CLASSIFIED
    ];

    const userIndex = levels.indexOf(userLevel);
    const requiredIndex = levels.indexOf(requiredLevel);

    return userIndex >= requiredIndex;
  }

  /**
   * Assess risk-based compliance
   */
  private async assessRiskBasedCompliance(
    request: SecurityComplianceRequest,
    accessContext: SecurityAccessContext
  ): Promise<ComplianceValidationResult> {
    const violations: ComplianceViolation[] = [];

    // High-risk operations require additional controls
    if (accessContext.riskAssessment.riskLevel === 'HIGH' ||
        accessContext.riskAssessment.riskLevel === 'CRITICAL') {

      // Check for required additional controls
      const hasAdditionalControls = request.task.workflow.some(step =>
        step.parameters?.additionalControls === true
      );

      if (!hasAdditionalControls) {
        violations.push({
          rule: 'HIGH_RISK_ADDITIONAL_CONTROLS',
          severity: 'HIGH',
          description: 'High-risk operations require additional security controls',
          remediation: ['Implement additional approval steps', 'Enhanced monitoring']
        });
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      auditRequired: violations.length > 0,
      frameworksChecked: ['RISK_BASED'],
      timestamp: new Date()
    };
  }

  /**
   * Generate security audit trail
   */
  private async generateSecurityAuditTrail(
    request: SecurityComplianceRequest,
    accessContext: SecurityAccessContext,
    frameworkResults: ComplianceValidationResult[],
    _riskCompliance: ComplianceValidationResult
  ): Promise<SecurityAuditEntry[]> {
    const auditEntries: SecurityAuditEntry[] = [];

    // Compliance check start
    auditEntries.push({
      auditId: uuidv4(),
      timestamp: request.timestamp,
      eventType: SecurityEventType.COMPLIANCE_CHECK,
      description: `Security compliance validation started`,
      actor: {
        actorType: 'SYSTEM',
        actorId: 'security-compliance-service',
        actorName: 'Security Compliance Service',
        roles: ['system', 'compliance']
      },
      resources: [{
        resourceType: 'ORCHESTRATION_TASK',
        resourceId: request.task.taskId,
        resourceName: request.task.taskId,
        classification: request.requiredSecurityLevel
      }],
      outcome: EventOutcome.SUCCESS,
      classification: SecurityLevel.CONFIDENTIAL,
      complianceRequirements: request.frameworks.map(f => f.name),
      metadata: {
        frameworkCount: request.frameworks.length,
        riskLevel: accessContext.riskAssessment.riskLevel
      }
    });

    // Framework validation results
    for (const [index, result] of frameworkResults.entries()) {
      auditEntries.push({
        auditId: uuidv4(),
        timestamp: result.timestamp,
        eventType: result.compliant ? SecurityEventType.VALIDATION_SUCCESS : SecurityEventType.VALIDATION_FAILURE,
        description: `Framework compliance validation: ${request.frameworks[index].name}`,
        actor: {
          actorType: 'SYSTEM',
          actorId: 'security-compliance-service',
          actorName: 'Security Compliance Service',
          roles: ['system', 'compliance']
        },
        resources: [{
          resourceType: 'COMPLIANCE_FRAMEWORK',
          resourceId: request.frameworks[index].name,
          resourceName: request.frameworks[index].name,
          classification: SecurityLevel.CONFIDENTIAL
        }],
        outcome: result.compliant ? EventOutcome.SUCCESS : EventOutcome.FAILURE,
        classification: SecurityLevel.CONFIDENTIAL,
        complianceRequirements: [request.frameworks[index].name],
        metadata: {
          violations: result.violations,
          auditRequired: result.auditRequired
        }
      });
    }

    return auditEntries;
  }

  /**
   * Consolidate compliance results
   */
  private consolidateComplianceResults(
    frameworkResults: ComplianceValidationResult[],
    riskCompliance: ComplianceValidationResult,
    _auditEntries: SecurityAuditEntry[]
  ): ComplianceValidationResult {
    const allResults = [...frameworkResults, riskCompliance];

    const allViolations = allResults.flatMap(result => result.violations);
    const overallCompliant = allResults.every(result => result.compliant);
    const auditRequired = allResults.some(result => result.auditRequired);
    const frameworksChecked = allResults.flatMap(result => result.frameworksChecked);

    return {
      compliant: overallCompliant,
      violations: allViolations,
      auditRequired,
      frameworksChecked,
      timestamp: new Date()
    };
  }

  /**
   * Store audit trail
   */
  private async storeAuditTrail(
    complianceId: string,
    auditEntries: SecurityAuditEntry[]
  ): Promise<void> {
    try {
      this.auditTrail.set(complianceId, auditEntries);

      // Emit audit events
      for (const entry of auditEntries) {
        this.eventEmitter.emit('security.audit.entry', entry);
      }

      this.logger.debug(`Stored ${auditEntries.length} audit entries`, {
        complianceId
      });
    } catch (error) {
      this.logger.error('Failed to store audit trail', error);
    }
  }

  /**
   * Check for security incidents
   */
  private async checkForSecurityIncidents(
    request: SecurityComplianceRequest,
    result: ComplianceValidationResult
  ): Promise<void> {
    // Check for high-severity violations
    const criticalViolations = result.violations.filter(v => v.severity === 'HIGH');

    if (criticalViolations.length > 0) {
      await this.createSecurityIncident({
        incidentId: uuidv4(),
        type: 'COMPLIANCE_VIOLATION',
        severity: 'HIGH',
        description: `Critical compliance violations detected: ${criticalViolations.length} violations`,
        timestamp: new Date(),
        relatedRequest: request,
        metadata: {
          violations: criticalViolations,
          frameworksAffected: result.frameworksChecked
        }
      });
    }
  }

  /**
   * Create security incident
   */
  private async createSecurityIncident(incident: SecurityIncident): Promise<void> {
    try {
      this.securityIncidents.set(incident.incidentId, incident);
      this.metrics.incidentsCreated++;

      // Emit incident event
      this.eventEmitter.emit('security.incident.created', incident);

      this.logger.warn(`Security incident created`, {
        incidentId: incident.incidentId,
        type: incident.type,
        severity: incident.severity
      });
    } catch (error) {
      this.logger.error('Failed to create security incident', error);
    }
  }

  /**
   * Evaluate RBAC permissions
   */
  private async evaluateRBAC(
    userContext: OrchestrationUserContext,
    task: OrchestrationTask
  ): Promise<{ granted: boolean; permissions: Permission[]; restrictions: AccessRestriction[] }> {
    // Simplified RBAC evaluation
    const permissions: Permission[] = [];
    const restrictions: AccessRestriction[] = [];

    // Check role-based permissions
    const hasRequiredRoles = userContext.roles.some(role =>
      ['user', 'operator', 'admin'].includes(role.toLowerCase())
    );

    if (hasRequiredRoles) {
      permissions.push({
        id: 'orchestration-execute',
        name: 'Execute Orchestration',
        resource: 'orchestration',
        actions: ['execute', 'monitor'],
        scope: 'user-owned'
      });
    }

    // Add restrictions for high-risk tasks
    if (task.priority === 'CRITICAL') {
      restrictions.push({
        type: 'APPROVAL_REQUIRED',
        description: 'Critical tasks require additional approval',
        severity: 'INFO',
        conditions: { taskPriority: 'CRITICAL' }
      });
    }

    return {
      granted: hasRequiredRoles,
      permissions,
      restrictions
    };
  }

  /**
   * Evaluate ABAC policies
   */
  private async evaluateABAC(
    userContext: OrchestrationUserContext,
    task: OrchestrationTask
  ): Promise<{ granted: boolean; permissions: Permission[]; restrictions: AccessRestriction[] }> {
    // Simplified ABAC evaluation
    const permissions: Permission[] = [];
    const restrictions: AccessRestriction[] = [];

    // Attribute-based access decision
    const userAttributes = {
      department: userContext.metadata.department,
      location: userContext.metadata.location,
      clearanceLevel: userContext.metadata.clearanceLevel
    };

    // Example policy: users from finance department can access financial tasks
    if (userAttributes.department === 'finance') {
      const hasFinancialData = task.workflow.some(step =>
        step.parameters?.financialData === true
      );

      if (hasFinancialData) {
        permissions.push({
          id: 'financial-data-access',
          name: 'Financial Data Access',
          resource: 'financial-data',
          actions: ['read', 'process'],
          scope: 'department'
        });
      }
    }

    return {
      granted: true, // Simplified - would have complex policy evaluation
      permissions,
      restrictions
    };
  }

  /**
   * Check security level requirements
   */
  private async checkSecurityLevelRequirements(
    userContext: OrchestrationUserContext,
    requiredLevel: SecurityLevel
  ): Promise<boolean> {
    // Get user's security clearance from context or external service
    const userClearance = userContext.metadata.securityClearance as string || 'internal';

    // Map string to SecurityLevel enum
    const clearanceMap: Record<string, SecurityLevel> = {
      'internal': SecurityLevel.INTERNAL,
      'confidential': SecurityLevel.CONFIDENTIAL,
      'restricted': SecurityLevel.RESTRICTED,
      'classified': SecurityLevel.CLASSIFIED
    };

    const userLevel = clearanceMap[userClearance] || SecurityLevel.INTERNAL;
    return this.checkSecurityClearance(userLevel, requiredLevel);
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(durationMs: number, success: boolean): void {
    this.metrics.totalComplianceChecks++;

    if (success) {
      this.metrics.successfulChecks++;
    } else {
      this.metrics.failedChecks++;
    }

    // Update average check time
    const totalTime = this.metrics.averageCheckTime * (this.metrics.totalComplianceChecks - 1) + durationMs;
    this.metrics.averageCheckTime = Math.round(totalTime / this.metrics.totalComplianceChecks);
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredAuditEntries();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Clean up expired audit entries
   */
  private cleanupExpiredAuditEntries(): void {
    const now = Date.now();
    const retentionMs = this.defaultAuditRetention * 24 * 60 * 60 * 1000;

    for (const [complianceId, entries] of this.auditTrail) {
      const filteredEntries = entries.filter(entry =>
        now - entry.timestamp.getTime() < retentionMs
      );

      if (filteredEntries.length !== entries.length) {
        this.auditTrail.set(complianceId, filteredEntries);
        this.logger.debug(`Cleaned up audit entries for compliance: ${complianceId}`);
      }
    }
  }

  /**
   * Archive active compliance checks
   */
  private async archiveActiveChecks(): Promise<void> {
    const activeChecks = Array.from(this.activeComplianceChecks.keys());
    this.logger.log(`Archiving ${activeChecks.length} active compliance checks...`);

    for (const checkId of activeChecks) {
      this.activeComplianceChecks.delete(checkId);
    }
  }
}

// ===== ADDITIONAL INTERFACES =====

/**
 * Security incident
 */
interface SecurityIncident {
  readonly incidentId: string;
  readonly type: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly description: string;
  readonly timestamp: Date;
  readonly relatedRequest: SecurityComplianceRequest;
  readonly metadata: Record<string, unknown>;
}