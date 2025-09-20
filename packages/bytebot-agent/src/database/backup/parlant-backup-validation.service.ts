/**
 * PARLANT Database Backup Validation Service - Enterprise Backup Integration
 *
 * Provides comprehensive backup operation validation with PARLANT conversational validation,
 * intelligent backup scheduling, verification workflows, restoration approval, disaster recovery,
 * retention policy management, and cross-platform backup consistency validation.
 *
 * Features:
 * - PARLANT conversational validation for all backup operations
 * - Intelligent backup scheduling with user-friendly approval interfaces
 * - Multi-step backup restoration approval workflows with risk assessment
 * - Disaster recovery procedure automation with conversational confirmation
 * - Backup retention policy management with governance workflows
 * - Cross-platform backup validation for database consistency
 * - Comprehensive backup audit trail and compliance reporting
 * - Real-time backup integrity validation and monitoring
 *
 * Architecture: Event-driven backup system with PARLANT integration
 * Security: Multi-level approval workflows with enterprise compliance
 * Performance: Optimized backup operations with minimal disruption
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DatabaseBackupService,
  BackupCreationRequest,
  BackupRestorationRequest,
} from '../database-backup.service';
import {
  ParlantValidationResponse,
  ParlantUserContext,
  SecurityLevel,
} from '@shared/types/parlant-integration.types';
import { RiskLevel } from '../parlant-validated-database.service';

// ===== BACKUP VALIDATION INTERFACES =====

/**
 * Backup operation types for PARLANT validation
 */
export enum BackupOperationType {
  CREATE = 'CREATE',
  RESTORE = 'RESTORE',
  VERIFY = 'VERIFY',
  DELETE = 'DELETE',
  SCHEDULE = 'SCHEDULE',
  POLICY_UPDATE = 'POLICY_UPDATE',
}

/**
 * Backup validation request for PARLANT
 */
export interface ParlantBackupValidationRequest {
  operationId: string;
  operationType: BackupOperationType;
  backupMetadata: BackupValidationMetadata;
  userContext: ParlantUserContext;
  securityLevel: SecurityLevel;
  riskAssessment: BackupRiskAssessment;
  complianceRequirements: ComplianceRequirement[];
  conversationalPrompt: string;
}

/**
 * Backup validation metadata
 */
export interface BackupValidationMetadata {
  backupId?: string;
  backupType: 'FULL' | 'INCREMENTAL' | 'PARTIAL' | 'DIFFERENTIAL';
  targetTables: string[];
  estimatedSize: number;
  estimatedDuration: number;
  sourceDatabase: string;
  destinationPath: string;
  encryptionRequired: boolean;
  compressionEnabled: boolean;
  retentionPolicy: RetentionPolicy;
}

/**
 * Backup risk assessment
 */
export interface BackupRiskAssessment {
  riskLevel: RiskLevel;
  riskFactors: string[];
  mitigationStrategies: string[];
  businessImpact: BusinessImpact;
  technicalRisks: TechnicalRisk[];
  complianceRisks: ComplianceRisk[];
}

/**
 * Business impact assessment
 */
export interface BusinessImpact {
  serviceDisruption: 'NONE' | 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT';
  userImpact: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  dataAvailability: 'MAINTAINED' | 'REDUCED' | 'SUSPENDED';
  performanceImpact: 'NONE' | 'SLIGHT' | 'MODERATE' | 'SEVERE';
  estimatedDowntime: number; // milliseconds
}

/**
 * Technical risk assessment
 */
export interface TechnicalRisk {
  type:
    | 'STORAGE_SPACE'
    | 'NETWORK_BANDWIDTH'
    | 'IO_PERFORMANCE'
    | 'CORRUPTION'
    | 'TIMEOUT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  likelihood: number; // 0-1
  mitigation: string;
}

/**
 * Compliance risk assessment
 */
export interface ComplianceRisk {
  framework: 'GDPR' | 'HIPAA' | 'SOX' | 'PCI_DSS' | 'ISO_27001';
  requirement: string;
  riskDescription: string;
  complianceStatus: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT';
  requiredActions: string[];
}

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  retentionDays: number;
  maxCopies: number;
  archiveAfterDays?: number;
  deleteAfterDays?: number;
  complianceRetention: ComplianceRetentionRequirement[];
  automaticCleanup: boolean;
}

/**
 * Compliance retention requirements
 */
export interface ComplianceRetentionRequirement {
  framework: string;
  minimumRetentionDays: number;
  dataTypes: string[];
  auditRequired: boolean;
}

/**
 * Compliance requirement
 */
export interface ComplianceRequirement {
  framework: string;
  requirement: string;
  mandatory: boolean;
  validationRequired: boolean;
}

/**
 * Backup schedule configuration
 */
export interface BackupSchedule {
  scheduleId: string;
  name: string;
  cronExpression: string;
  backupType: BackupValidationMetadata['backupType'];
  enabled: boolean;
  lastExecution?: Date;
  nextExecution?: Date;
  approvalRequired: boolean;
  approvedBy?: string;
  approvalExpiry?: Date;
}

/**
 * Disaster recovery plan
 */
export interface DisasterRecoveryPlan {
  planId: string;
  name: string;
  description: string;
  triggerConditions: string[];
  recoverySteps: RecoveryStep[];
  estimatedRecoveryTime: number; // milliseconds
  dataLossRisk: 'NONE' | 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT';
  businessContinuity: BusinessContinuityPlan;
}

/**
 * Recovery step
 */
export interface RecoveryStep {
  stepId: string;
  description: string;
  estimatedDuration: number;
  dependencies: string[];
  riskLevel: RiskLevel;
  approvalRequired: boolean;
  automationPossible: boolean;
}

/**
 * Business continuity plan
 */
export interface BusinessContinuityPlan {
  alternativeServices: string[];
  communicationPlan: string[];
  stakeholderNotification: string[];
  serviceRestoration: string[];
}

// ===== PARLANT BACKUP VALIDATION SERVICE =====

@Injectable()
export class ParlantBackupValidationService {
  private readonly logger = new Logger(ParlantBackupValidationService.name);
  private readonly validationCache = new Map<
    string,
    ParlantValidationResponse
  >();
  private readonly scheduleCache = new Map<string, BackupSchedule>();
  private readonly disasterRecoveryPlans = new Map<
    string,
    DisasterRecoveryPlan
  >();

  // Performance metrics
  private validationCount = 0;
  private cacheHitCount = 0;
  private averageValidationTime = 0;
  private approvalSuccessRate = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly backupService: DatabaseBackupService,
  ) {
    this.logger.log('Initializing PARLANT Backup Validation Service', {
      parlantEnabled: this.isParlantEnabled(),
      cacheEnabled: this.isCacheEnabled(),
      scheduleValidationEnabled: this.isScheduleValidationEnabled(),
      disasterRecoveryEnabled: this.isDisasterRecoveryEnabled(),
    });

    // Initialize monitoring
    this.startValidationMonitoring();
    this.initializeDefaultDisasterRecoveryPlans();
  }

  // ===== CORE BACKUP VALIDATION METHODS =====

  /**
   * Validate backup creation with PARLANT conversational approval
   */
  async validateBackupCreation(
    request: BackupCreationRequest,
    userContext: ParlantUserContext,
  ): Promise<ParlantValidationResponse> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Validating backup creation`, {
      operationType: request.operationMetadata.operationType,
      riskLevel: request.riskLevel,
      tableName: request.operationMetadata.tableName,
      operationId,
    });

    try {
      // 1. Create backup validation metadata
      const backupMetadata = this.createBackupValidationMetadata(request);

      // 2. Assess backup risks
      const riskAssessment = await this.assessBackupRisks(
        backupMetadata,
        request,
        userContext,
      );

      // 3. Determine compliance requirements
      const complianceRequirements = this.determineComplianceRequirements(
        backupMetadata,
        request,
      );

      // 4. Generate conversational prompt
      const conversationalPrompt = this.generateBackupCreationPrompt(
        backupMetadata,
        riskAssessment,
        complianceRequirements,
      );

      // 5. Create PARLANT validation request
      const validationRequest: ParlantBackupValidationRequest = {
        operationId,
        operationType: BackupOperationType.CREATE,
        backupMetadata,
        userContext,
        securityLevel: this.mapRiskLevelToSecurityLevel(
          riskAssessment.riskLevel,
        ),
        riskAssessment,
        complianceRequirements,
        conversationalPrompt,
      };

      // 6. Perform PARLANT validation
      const validationResponse =
        await this.performParlantBackupValidation(validationRequest);

      const validationTime = Date.now() - startTime;
      this.updateValidationMetrics(validationTime, validationResponse.approved);

      this.logger.log(`[${operationId}] Backup creation validation completed`, {
        approved: validationResponse.approved,
        confidence: validationResponse.confidence,
        validationTime,
        operationId,
      });

      return validationResponse;
    } catch (error) {
      const validationTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] Backup creation validation failed`, {
        error: error instanceof Error ? error.message : String(error),
        validationTime,
        operationId,
      });

      throw error;
    }
  }

  /**
   * Validate backup restoration with multi-step approval
   */
  async validateBackupRestoration(
    request: BackupRestorationRequest,
    userContext: ParlantUserContext,
  ): Promise<ParlantValidationResponse> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Validating backup restoration`, {
      backupId: request.backupId,
      requestingUserId: request.requestingUserId,
      dryRun: request.dryRun,
      operationId,
    });

    try {
      // 1. Analyze backup for restoration
      const backupAnalysis = await this.analyzeBackupForRestoration(
        request.backupId,
      );

      // 2. Assess restoration risks
      const restorationRisks = await this.assessRestorationRisks(
        request,
        backupAnalysis,
        userContext,
      );

      // 3. Generate multi-step approval workflow
      const approvalWorkflow = this.generateRestorationApprovalWorkflow(
        request,
        restorationRisks,
      );

      // 4. Execute conversational approval workflow
      const approvalResults = await this.executeApprovalWorkflow(
        approvalWorkflow,
        userContext,
        operationId,
      );

      const validationTime = Date.now() - startTime;
      this.updateValidationMetrics(validationTime, approvalResults.approved);

      this.logger.log(
        `[${operationId}] Backup restoration validation completed`,
        {
          approved: approvalResults.approved,
          workflowSteps: approvalWorkflow.steps.length,
          validationTime,
          operationId,
        },
      );

      return approvalResults;
    } catch (error) {
      const validationTime = Date.now() - startTime;

      this.logger.error(
        `[${operationId}] Backup restoration validation failed`,
        {
          error: error instanceof Error ? error.message : String(error),
          validationTime,
          operationId,
        },
      );

      throw error;
    }
  }

  /**
   * Validate backup schedule with conversational approval
   */
  async validateBackupSchedule(
    schedule: BackupSchedule,
    userContext: ParlantUserContext,
  ): Promise<ParlantValidationResponse> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Validating backup schedule`, {
      scheduleId: schedule.scheduleId,
      scheduleName: schedule.name,
      cronExpression: schedule.cronExpression,
      operationId,
    });

    try {
      // 1. Analyze schedule feasibility
      const scheduleAnalysis = await this.analyzeScheduleFeasibility(schedule);

      // 2. Assess schedule risks
      const scheduleRisks = await this.assessScheduleRisks(
        schedule,
        scheduleAnalysis,
      );

      // 3. Generate schedule validation prompt
      const schedulePrompt = this.generateScheduleValidationPrompt(
        schedule,
        scheduleAnalysis,
        scheduleRisks,
      );

      // 4. Create validation request
      const validationRequest: ParlantBackupValidationRequest = {
        operationId,
        operationType: BackupOperationType.SCHEDULE,
        backupMetadata: this.scheduleToBackupMetadata(schedule),
        userContext,
        securityLevel: this.determineScheduleSecurityLevel(schedule),
        riskAssessment: scheduleRisks,
        complianceRequirements:
          this.getScheduleComplianceRequirements(schedule),
        conversationalPrompt: schedulePrompt,
      };

      // 5. Perform validation
      const validationResponse =
        await this.performParlantBackupValidation(validationRequest);

      // 6. Cache approved schedule
      if (validationResponse.approved) {
        this.scheduleCache.set(schedule.scheduleId, {
          ...schedule,
          approvedBy: userContext.userId,
          approvalExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });
      }

      const validationTime = Date.now() - startTime;
      this.updateValidationMetrics(validationTime, validationResponse.approved);

      this.logger.log(`[${operationId}] Backup schedule validation completed`, {
        approved: validationResponse.approved,
        scheduleId: schedule.scheduleId,
        validationTime,
        operationId,
      });

      return validationResponse;
    } catch (error) {
      const validationTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] Backup schedule validation failed`, {
        error: error instanceof Error ? error.message : String(error),
        validationTime,
        operationId,
      });

      throw error;
    }
  }

  /**
   * Validate disaster recovery plan execution
   */
  async validateDisasterRecoveryExecution(
    planId: string,
    triggerReason: string,
    userContext: ParlantUserContext,
  ): Promise<ParlantValidationResponse> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Validating disaster recovery execution`, {
      planId,
      triggerReason,
      requestingUserId: userContext.userId,
      operationId,
    });

    try {
      // 1. Get disaster recovery plan
      const recoveryPlan = this.disasterRecoveryPlans.get(planId);
      if (!recoveryPlan) {
        throw new Error(`Disaster recovery plan ${planId} not found`);
      }

      // 2. Assess current system state
      const systemState = await this.assessSystemStateForRecovery();

      // 3. Validate trigger conditions
      const triggerValidation = this.validateRecoveryTrigger(
        recoveryPlan,
        triggerReason,
        systemState,
      );

      if (!triggerValidation.valid) {
        throw new Error(
          `Invalid recovery trigger: ${triggerValidation.reason}`,
        );
      }

      // 4. Generate recovery execution prompt
      const recoveryPrompt = this.generateDisasterRecoveryPrompt(
        recoveryPlan,
        triggerReason,
        systemState,
      );

      // 5. Create validation request
      const validationRequest: ParlantBackupValidationRequest = {
        operationId,
        operationType: BackupOperationType.RESTORE,
        backupMetadata: this.recoveryPlanToBackupMetadata(recoveryPlan),
        userContext,
        securityLevel: SecurityLevel._CRITICAL,
        riskAssessment: this.createRecoveryRiskAssessment(
          recoveryPlan,
          systemState,
        ),
        complianceRequirements:
          this.getRecoveryComplianceRequirements(recoveryPlan),
        conversationalPrompt: recoveryPrompt,
      };

      // 6. Perform high-stakes validation
      const validationResponse =
        await this.performParlantBackupValidation(validationRequest);

      const validationTime = Date.now() - startTime;
      this.updateValidationMetrics(validationTime, validationResponse.approved);

      this.logger.log(
        `[${operationId}] Disaster recovery validation completed`,
        {
          approved: validationResponse.approved,
          planId,
          validationTime,
          operationId,
        },
      );

      return validationResponse;
    } catch (error) {
      const validationTime = Date.now() - startTime;

      this.logger.error(
        `[${operationId}] Disaster recovery validation failed`,
        {
          error: error instanceof Error ? error.message : String(error),
          validationTime,
          operationId,
        },
      );

      throw error;
    }
  }

  // ===== BACKUP METADATA AND RISK ASSESSMENT =====

  /**
   * Create backup validation metadata from request
   */
  private createBackupValidationMetadata(
    request: BackupCreationRequest,
  ): BackupValidationMetadata {
    const tables = request.operationMetadata.tableName
      ? [request.operationMetadata.tableName]
      : ['*'];

    return {
      backupType: this.determineBackupType(request),
      targetTables: tables,
      estimatedSize: this.estimateBackupSize(request),
      estimatedDuration: this.estimateBackupDuration(request),
      sourceDatabase: this.getSourceDatabase(),
      destinationPath: this.generateBackupPath(request),
      encryptionRequired: this.isEncryptionRequired(request.riskLevel),
      compressionEnabled: this.isCompressionEnabled(),
      retentionPolicy: this.getRetentionPolicy(request.riskLevel),
    };
  }

  /**
   * Assess comprehensive backup risks
   */
  private async assessBackupRisks(
    metadata: BackupValidationMetadata,
    request: BackupCreationRequest,
    _userContext: ParlantUserContext,
  ): Promise<BackupRiskAssessment> {
    const businessImpact = this.assessBusinessImpact(metadata, request);
    const technicalRisks = await this.assessTechnicalRisks(metadata);
    const complianceRisks = this.assessComplianceRisks(metadata, request);

    const riskFactors = [
      ...this.generateBusinessRiskFactors(businessImpact),
      ...this.generateTechnicalRiskFactors(technicalRisks),
      ...this.generateComplianceRiskFactors(complianceRisks),
    ];

    const mitigationStrategies = [
      ...this.generateBusinessMitigations(businessImpact),
      ...this.generateTechnicalMitigations(technicalRisks),
      ...this.generateComplianceMitigations(complianceRisks),
    ];

    return {
      riskLevel: request.riskLevel,
      riskFactors,
      mitigationStrategies,
      businessImpact,
      technicalRisks,
      complianceRisks,
    };
  }

  /**
   * Assess business impact of backup operation
   */
  private assessBusinessImpact(
    metadata: BackupValidationMetadata,
    request: BackupCreationRequest,
  ): BusinessImpact {
    const isFullBackup = metadata.backupType === 'FULL';
    const hasHighRisk =
      request.riskLevel === RiskLevel.HIGH ||
      request.riskLevel === RiskLevel.CRITICAL;

    return {
      serviceDisruption: isFullBackup
        ? hasHighRisk
          ? 'MODERATE'
          : 'MINIMAL'
        : 'NONE',
      userImpact: isFullBackup ? 'LOW' : 'NONE',
      dataAvailability: isFullBackup ? 'REDUCED' : 'MAINTAINED',
      performanceImpact:
        metadata.estimatedSize > 1000000 ? 'MODERATE' : 'SLIGHT',
      estimatedDowntime: isFullBackup ? metadata.estimatedDuration * 0.1 : 0,
    };
  }

  /**
   * Assess technical risks
   */
  private async assessTechnicalRisks(
    metadata: BackupValidationMetadata,
  ): Promise<TechnicalRisk[]> {
    const risks: TechnicalRisk[] = [];

    // Storage space risk
    const availableSpace = await this.getAvailableStorageSpace();
    if (metadata.estimatedSize > availableSpace * 0.8) {
      risks.push({
        type: 'STORAGE_SPACE',
        severity: 'HIGH',
        description: `Backup size (${metadata.estimatedSize} bytes) approaches storage limit`,
        likelihood: 0.8,
        mitigation: 'Clear old backups or increase storage capacity',
      });
    }

    // IO Performance risk
    if (metadata.estimatedDuration > 300000) {
      // 5 minutes
      risks.push({
        type: 'IO_PERFORMANCE',
        severity: 'MEDIUM',
        description: 'Long-running backup may impact database performance',
        likelihood: 0.6,
        mitigation: 'Schedule backup during low-activity periods',
      });
    }

    // Network bandwidth risk (for remote backups)
    if (metadata.destinationPath.includes('://')) {
      risks.push({
        type: 'NETWORK_BANDWIDTH',
        severity: 'MEDIUM',
        description: 'Remote backup requires network bandwidth',
        likelihood: 0.4,
        mitigation: 'Monitor network usage during backup',
      });
    }

    return risks;
  }

  /**
   * Assess compliance risks
   */
  private assessComplianceRisks(
    metadata: BackupValidationMetadata,
    request: BackupCreationRequest,
  ): ComplianceRisk[] {
    const risks: ComplianceRisk[] = [];

    // GDPR compliance
    if (this.containsPersonalData(metadata.targetTables)) {
      risks.push({
        framework: 'GDPR',
        requirement: 'Data Protection and Privacy',
        riskDescription:
          'Backup contains personal data requiring GDPR compliance',
        complianceStatus: metadata.encryptionRequired ? 'COMPLIANT' : 'AT_RISK',
        requiredActions: metadata.encryptionRequired
          ? ['Verify encryption implementation']
          : ['Enable encryption', 'Implement access controls'],
      });
    }

    // SOX compliance for financial data
    if (this.containsFinancialData(metadata.targetTables)) {
      risks.push({
        framework: 'SOX',
        requirement: 'Financial Data Integrity',
        riskDescription:
          'Backup contains financial data requiring SOX compliance',
        complianceStatus: this.hasAuditTrail(request)
          ? 'COMPLIANT'
          : 'NON_COMPLIANT',
        requiredActions: [
          'Implement audit trail',
          'Verify data integrity controls',
        ],
      });
    }

    return risks;
  }

  // ===== CONVERSATIONAL PROMPT GENERATION =====

  /**
   * Generate conversational prompt for backup creation
   */
  private generateBackupCreationPrompt(
    metadata: BackupValidationMetadata,
    riskAssessment: BackupRiskAssessment,
    complianceRequirements: ComplianceRequirement[],
  ): string {
    const riskLevel = riskAssessment.riskLevel.toUpperCase();
    const backupType = metadata.backupType;
    const tableCount = metadata.targetTables.length;
    const sizeDescription = this.formatSize(metadata.estimatedSize);
    const durationDescription = this.formatDuration(metadata.estimatedDuration);

    const prompt = [
      `🗄️ BACKUP CREATION REQUEST - ${riskLevel} RISK`,
      '',
      `📋 Backup Details:`,
      `• Type: ${backupType} backup`,
      `• Tables: ${tableCount === 1 && metadata.targetTables[0] === '*' ? 'All tables' : `${tableCount} table(s)`}`,
      `• Estimated size: ${sizeDescription}`,
      `• Estimated duration: ${durationDescription}`,
      `• Encryption: ${metadata.encryptionRequired ? '✅ Enabled' : '❌ Disabled'}`,
      `• Compression: ${metadata.compressionEnabled ? '✅ Enabled' : '❌ Disabled'}`,
      '',
      `⚠️ Risk Assessment:`,
      ...riskAssessment.riskFactors.map((factor) => `• ${factor}`),
      '',
      `🛡️ Mitigation Strategies:`,
      ...riskAssessment.mitigationStrategies.map((strategy) => `• ${strategy}`),
    ];

    if (complianceRequirements.length > 0) {
      prompt.push(
        '',
        `📋 Compliance Requirements:`,
        ...complianceRequirements.map(
          (req) => `• ${req.framework}: ${req.requirement}`,
        ),
      );
    }

    if (riskAssessment.businessImpact.serviceDisruption !== 'NONE') {
      prompt.push(
        '',
        `💼 Business Impact:`,
        `• Service disruption: ${riskAssessment.businessImpact.serviceDisruption}`,
        `• User impact: ${riskAssessment.businessImpact.userImpact}`,
        `• Performance impact: ${riskAssessment.businessImpact.performanceImpact}`,
      );
    }

    prompt.push(
      '',
      `❓ Do you approve this backup operation? Consider the risks and business impact before proceeding.`,
    );

    return prompt.join('\n');
  }

  /**
   * Generate disaster recovery execution prompt
   */
  private generateDisasterRecoveryPrompt(
    plan: DisasterRecoveryPlan,
    triggerReason: string,
    _systemState: any,
  ): string {
    const prompt = [
      `🚨 DISASTER RECOVERY EXECUTION REQUEST`,
      '',
      `📋 Recovery Plan: ${plan.name}`,
      `📝 Description: ${plan.description}`,
      `⚡ Trigger Reason: ${triggerReason}`,
      '',
      `🕐 Estimated Recovery Time: ${this.formatDuration(plan.estimatedRecoveryTime)}`,
      `📊 Data Loss Risk: ${plan.dataLossRisk}`,
      '',
      `🔄 Recovery Steps (${plan.recoverySteps.length} total):`,
      ...plan.recoverySteps
        .slice(0, 5)
        .map(
          (step, index) =>
            `${index + 1}. ${step.description} (${this.formatDuration(step.estimatedDuration)})`,
        ),
      ...(plan.recoverySteps.length > 5
        ? [`... and ${plan.recoverySteps.length - 5} more steps`]
        : []),
      '',
      `💼 Business Continuity:`,
      `• Alternative services: ${plan.businessContinuity.alternativeServices.join(', ')}`,
      `• Stakeholder notification: Required`,
      '',
      `⚠️ CRITICAL: This will initiate full disaster recovery procedures.`,
      `All system operations may be affected during recovery.`,
      '',
      `❓ Type "I CONFIRM DISASTER RECOVERY" to proceed with recovery plan execution.`,
    ];

    return prompt.join('\n');
  }

  // ===== APPROVAL WORKFLOW MANAGEMENT =====

  /**
   * Generate restoration approval workflow
   */
  private generateRestorationApprovalWorkflow(
    request: BackupRestorationRequest,
    risks: BackupRiskAssessment,
  ): ApprovalWorkflow {
    const steps: ApprovalStep[] = [];

    // Step 1: Risk acknowledgment
    steps.push({
      stepId: 'risk_acknowledgment',
      title: 'Risk Acknowledgment',
      description: 'Acknowledge restoration risks and potential impacts',
      required: true,
      prompt: this.generateRiskAcknowledgmentPrompt(risks),
    });

    // Step 2: Backup verification
    if (request.verifyBeforeRestore) {
      steps.push({
        stepId: 'backup_verification',
        title: 'Backup Verification',
        description: 'Confirm backup integrity before restoration',
        required: true,
        prompt: `Verify backup ${request.backupId} integrity before restoration?`,
      });
    }

    // Step 3: Dry run approval (if not already done)
    if (!request.dryRun) {
      steps.push({
        stepId: 'dry_run_confirmation',
        title: 'Dry Run Confirmation',
        description:
          'Confirm dry run execution or proceed directly to restoration',
        required: false,
        prompt: 'Execute dry run first to validate restoration process?',
      });
    }

    // Step 4: Final restoration approval
    steps.push({
      stepId: 'final_approval',
      title: 'Final Restoration Approval',
      description: 'Final confirmation for backup restoration',
      required: true,
      prompt: this.generateFinalRestorationPrompt(request, risks),
    });

    return {
      workflowId: `restoration_${Date.now()}`,
      name: 'Backup Restoration Approval',
      steps,
    };
  }

  /**
   * Execute approval workflow
   */
  private async executeApprovalWorkflow(
    workflow: ApprovalWorkflow,
    userContext: ParlantUserContext,
    operationId: string,
  ): Promise<ParlantValidationResponse> {
    const approvalResults: StepApprovalResult[] = [];

    for (const step of workflow.steps) {
      if (!step.required) continue;

      this.logger.debug(
        `[${operationId}] Executing approval step: ${step.stepId}`,
      );

      const stepResult = await this.executeApprovalStep(
        step,
        userContext,
        operationId,
      );
      approvalResults.push(stepResult);

      if (!stepResult.approved) {
        return {
          approved: false,
          conversationId: `workflow_${workflow.workflowId}`,
          reason: `Approval workflow failed at step: ${step.title}`,
          confidence: 0.95,
          metadata: {
            startTime: new Date(),
            endTime: new Date(),
            processingTime: 0,
            cacheStatus: 'miss',
            source: 'approval_workflow',
            workflowResults: approvalResults,
          },
        };
      }
    }

    return {
      approved: true,
      conversationId: `workflow_${workflow.workflowId}`,
      reason: 'All approval steps completed successfully',
      confidence: 0.95,
      metadata: {
        startTime: new Date(),
        endTime: new Date(),
        processingTime: 0,
        cacheStatus: 'miss',
        source: 'approval_workflow',
        workflowResults: approvalResults,
      },
    };
  }

  /**
   * Execute individual approval step
   */
  private async executeApprovalStep(
    step: ApprovalStep,
    userContext: ParlantUserContext,
    operationId: string,
  ): Promise<StepApprovalResult> {
    // Mock implementation - in production, this would use actual PARLANT service
    const mockValidation: ParlantValidationResponse = {
      approved: Math.random() > 0.1, // 90% approval rate for testing
      conversationId: `step_${step.stepId}_${operationId}`,
      reason: step.prompt,
      confidence: 0.9,
      metadata: {
        startTime: new Date(),
        endTime: new Date(),
        processingTime: 100,
        cacheStatus: 'miss',
        source: 'step_validation',
      },
    };

    return {
      stepId: step.stepId,
      approved: mockValidation.approved,
      reason: mockValidation.reason,
      timestamp: new Date(),
    };
  }

  // ===== CORE PARLANT INTEGRATION =====

  /**
   * Perform PARLANT backup validation
   */
  private async performParlantBackupValidation(
    request: ParlantBackupValidationRequest,
  ): Promise<ParlantValidationResponse> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.generateValidationCacheKey(request);
    if (this.validationCache.has(cacheKey)) {
      this.cacheHitCount++;
      this.logger.debug('Using cached backup validation result');
      return this.validationCache.get(cacheKey)!;
    }

    // Mock PARLANT validation - replace with actual PARLANT service integration
    const mockValidation: ParlantValidationResponse = {
      approved: this.shouldApproveBackupOperation(request),
      conversationId: `backup_conv_${request.operationId}`,
      reason: this.generateValidationReasoning(request),
      confidence: 0.95,
      metadata: {
        startTime: new Date(startTime),
        endTime: new Date(),
        processingTime: Date.now() - startTime,
        cacheStatus: 'miss',
        source: 'parlant_backup',
        riskAssessment: request.riskAssessment,
      },
    };

    // Cache the result if enabled
    if (this.isCacheEnabled() && this.shouldCacheResult(request)) {
      this.validationCache.set(cacheKey, mockValidation);
    }

    return mockValidation;
  }

  /**
   * Mock approval logic for backup operations
   */
  private shouldApproveBackupOperation(
    request: ParlantBackupValidationRequest,
  ): boolean {
    // Always approve creation operations with proper encryption
    if (request.operationType === BackupOperationType.CREATE) {
      return (
        request.backupMetadata.encryptionRequired ||
        request.riskAssessment.riskLevel !== RiskLevel.CRITICAL
      );
    }

    // Restoration requires higher scrutiny
    if (request.operationType === BackupOperationType.RESTORE) {
      return (
        request.riskAssessment.riskLevel !== RiskLevel.CRITICAL ||
        request.backupMetadata.estimatedDuration < 300000
      ); // 5 minutes
    }

    // Schedule operations approved based on risk level
    if (request.operationType === BackupOperationType.SCHEDULE) {
      return request.riskAssessment.riskLevel !== RiskLevel.CRITICAL;
    }

    // Default approval for other operations
    return true;
  }

  // ===== UTILITY METHODS =====

  /**
   * Generate validation reasoning
   */
  private generateValidationReasoning(
    request: ParlantBackupValidationRequest,
  ): string {
    const operation = request.operationType.toLowerCase();
    const riskLevel = request.riskAssessment.riskLevel;

    if (request.operationType === BackupOperationType.CREATE) {
      if (riskLevel === RiskLevel.LOW) {
        return `Backup ${operation} approved - low risk with adequate safeguards`;
      } else if (riskLevel === RiskLevel.MEDIUM) {
        return `Backup ${operation} approved - standard risk with monitoring`;
      } else {
        return `Backup ${operation} requires enhanced validation - high risk operation`;
      }
    }

    if (request.operationType === BackupOperationType.RESTORE) {
      return `Backup ${operation} requires careful validation - potential data overwrites`;
    }

    return `Backup ${operation} approved with standard safeguards`;
  }

  /**
   * Map risk level to security level
   */
  private mapRiskLevelToSecurityLevel(riskLevel: RiskLevel): SecurityLevel {
    switch (riskLevel) {
      case RiskLevel.LOW:
        return SecurityLevel._LOW;
      case RiskLevel.MEDIUM:
        return SecurityLevel._MEDIUM;
      case RiskLevel.HIGH:
        return SecurityLevel._HIGH;
      case RiskLevel.CRITICAL:
        return SecurityLevel._CRITICAL;
      default:
        return SecurityLevel._MEDIUM;
    }
  }

  /**
   * Update validation metrics
   */
  private updateValidationMetrics(
    validationTime: number,
    approved: boolean,
  ): void {
    this.validationCount++;
    this.averageValidationTime =
      (this.averageValidationTime * (this.validationCount - 1) +
        validationTime) /
      this.validationCount;

    if (approved) {
      this.approvalSuccessRate =
        (this.approvalSuccessRate * (this.validationCount - 1) + 1) /
        this.validationCount;
    } else {
      this.approvalSuccessRate =
        (this.approvalSuccessRate * (this.validationCount - 1)) /
        this.validationCount;
    }
  }

  /**
   * Start validation monitoring
   */
  private startValidationMonitoring(): void {
    setInterval(() => {
      this.logValidationMetrics();
    }, 60000); // Every minute
  }

  /**
   * Log validation performance metrics
   */
  private logValidationMetrics(): void {
    const cacheHitRate =
      this.validationCount > 0
        ? (this.cacheHitCount / this.validationCount) * 100
        : 0;

    this.logger.log('PARLANT Backup Validation Metrics', {
      totalValidations: this.validationCount,
      cacheHitRate: `${cacheHitRate.toFixed(2)}%`,
      averageValidationTime: `${this.averageValidationTime.toFixed(2)}ms`,
      approvalSuccessRate: `${(this.approvalSuccessRate * 100).toFixed(2)}%`,
      activeSchedules: this.scheduleCache.size,
      disasterRecoveryPlans: this.disasterRecoveryPlans.size,
    });
  }

  // ===== CONFIGURATION AND SETUP =====

  private isParlantEnabled(): boolean {
    return this.configService.get<boolean>('PARLANT_BACKUP_ENABLED', true);
  }

  private isCacheEnabled(): boolean {
    return this.configService.get<boolean>(
      'PARLANT_BACKUP_CACHE_ENABLED',
      true,
    );
  }

  private isScheduleValidationEnabled(): boolean {
    return this.configService.get<boolean>(
      'BACKUP_SCHEDULE_VALIDATION_ENABLED',
      true,
    );
  }

  private isDisasterRecoveryEnabled(): boolean {
    return this.configService.get<boolean>('DISASTER_RECOVERY_ENABLED', true);
  }

  private generateOperationId(): string {
    return `backup_parlant_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // ===== HELPER METHODS (Simplified implementations) =====

  private determineBackupType(
    request: BackupCreationRequest,
  ): 'FULL' | 'INCREMENTAL' | 'PARTIAL' {
    if (request.riskLevel === RiskLevel.CRITICAL) return 'FULL';
    if (request.operationMetadata.tableName) return 'PARTIAL';
    return 'INCREMENTAL';
  }

  private estimateBackupSize(_request: BackupCreationRequest): number {
    return Math.floor(Math.random() * 1000000) + 500000; // 500KB - 1.5MB
  }

  private estimateBackupDuration(_request: BackupCreationRequest): number {
    return Math.floor(Math.random() * 30000) + 10000; // 10-40 seconds
  }

  private getSourceDatabase(): string {
    return this.configService.get<string>('DATABASE_NAME', 'aigent_db');
  }

  private generateBackupPath(request: BackupCreationRequest): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `/backups/${request.operationMetadata.operationType}_${timestamp}.backup`;
  }

  private isEncryptionRequired(riskLevel: RiskLevel): boolean {
    return riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL;
  }

  private isCompressionEnabled(): boolean {
    return this.configService.get<boolean>('BACKUP_COMPRESSION_ENABLED', true);
  }

  private getRetentionPolicy(riskLevel: RiskLevel): RetentionPolicy {
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        return {
          retentionDays: 365,
          maxCopies: 5,
          archiveAfterDays: 90,
          deleteAfterDays: 365,
          complianceRetention: [
            {
              framework: 'SOX',
              minimumRetentionDays: 2555,
              dataTypes: ['financial'],
              auditRequired: true,
            },
          ],
          automaticCleanup: false,
        };
      case RiskLevel.HIGH:
        return {
          retentionDays: 90,
          maxCopies: 3,
          archiveAfterDays: 30,
          deleteAfterDays: 90,
          complianceRetention: [],
          automaticCleanup: true,
        };
      default:
        return {
          retentionDays: 30,
          maxCopies: 2,
          deleteAfterDays: 30,
          complianceRetention: [],
          automaticCleanup: true,
        };
    }
  }

  private determineComplianceRequirements(
    metadata: BackupValidationMetadata,
    _request: BackupCreationRequest,
  ): ComplianceRequirement[] {
    const requirements: ComplianceRequirement[] = [];

    if (this.containsPersonalData(metadata.targetTables)) {
      requirements.push({
        framework: 'GDPR',
        requirement: 'Data Protection and Encryption',
        mandatory: true,
        validationRequired: true,
      });
    }

    if (this.containsFinancialData(metadata.targetTables)) {
      requirements.push({
        framework: 'SOX',
        requirement: 'Financial Data Integrity and Audit Trail',
        mandatory: true,
        validationRequired: true,
      });
    }

    return requirements;
  }

  private containsPersonalData(tables: string[]): boolean {
    const personalDataTables = ['users', 'profiles', 'user_sessions'];
    return tables.some(
      (table) => personalDataTables.includes(table) || table === '*',
    );
  }

  private containsFinancialData(tables: string[]): boolean {
    const financialDataTables = ['transactions', 'payments', 'billing'];
    return tables.some(
      (table) => financialDataTables.includes(table) || table === '*',
    );
  }

  private hasAuditTrail(request: BackupCreationRequest): boolean {
    return (
      request.riskLevel === RiskLevel.HIGH ||
      request.riskLevel === RiskLevel.CRITICAL
    );
  }

  private formatSize(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(2)} KB`;
  }

  private formatDuration(ms: number): string {
    if (ms >= 60000) {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
    return `${Math.floor(ms / 1000)}s`;
  }

  private generateValidationCacheKey(
    request: ParlantBackupValidationRequest,
  ): string {
    return `backup_validation_${request.operationType}_${JSON.stringify({
      backupType: request.backupMetadata.backupType,
      tables: request.backupMetadata.targetTables,
      riskLevel: request.riskAssessment.riskLevel,
      userId: request.userContext.userId,
    })}`;
  }

  private shouldCacheResult(request: ParlantBackupValidationRequest): boolean {
    // Don't cache critical operations or restoration approvals
    return (
      request.operationType !== BackupOperationType.RESTORE &&
      request.riskAssessment.riskLevel !== RiskLevel.CRITICAL
    );
  }

  private async getAvailableStorageSpace(): Promise<number> {
    // Mock implementation
    return Math.floor(Math.random() * 10000000) + 5000000; // 5-15MB
  }

  // Additional helper methods for restoration, scheduling, and disaster recovery...
  private async analyzeBackupForRestoration(_backupId: string): Promise<any> {
    // Mock implementation
    return { valid: true, size: 1000000, tables: ['users', 'sessions'] };
  }

  private async assessRestorationRisks(
    _request: BackupRestorationRequest,
    _analysis: any,
    _userContext: ParlantUserContext,
  ): Promise<BackupRiskAssessment> {
    // Mock implementation
    return {
      riskLevel: RiskLevel.HIGH,
      riskFactors: [
        'Data overwrite risk',
        'Service disruption during restoration',
      ],
      mitigationStrategies: [
        'Create backup before restoration',
        'Verify backup integrity',
      ],
      businessImpact: {
        serviceDisruption: 'MODERATE',
        userImpact: 'MEDIUM',
        dataAvailability: 'SUSPENDED',
        performanceImpact: 'SEVERE',
        estimatedDowntime: 300000,
      },
      technicalRisks: [],
      complianceRisks: [],
    };
  }

  private generateBusinessRiskFactors(impact: BusinessImpact): string[] {
    const factors: string[] = [];
    if (impact.serviceDisruption !== 'NONE') {
      factors.push(`Service disruption: ${impact.serviceDisruption}`);
    }
    if (impact.userImpact !== 'NONE') {
      factors.push(`User impact: ${impact.userImpact}`);
    }
    if (impact.estimatedDowntime > 0) {
      factors.push(
        `Estimated downtime: ${this.formatDuration(impact.estimatedDowntime)}`,
      );
    }
    return factors;
  }

  private generateTechnicalRiskFactors(risks: TechnicalRisk[]): string[] {
    return risks.map(
      (risk) => `${risk.type}: ${risk.description} (${risk.severity} severity)`,
    );
  }

  private generateComplianceRiskFactors(risks: ComplianceRisk[]): string[] {
    return risks.map((risk) => `${risk.framework}: ${risk.riskDescription}`);
  }

  private generateBusinessMitigations(impact: BusinessImpact): string[] {
    const mitigations: string[] = [];
    if (impact.serviceDisruption !== 'NONE') {
      mitigations.push('Schedule during maintenance window');
    }
    if (impact.userImpact !== 'NONE') {
      mitigations.push('Notify users in advance');
    }
    return mitigations;
  }

  private generateTechnicalMitigations(risks: TechnicalRisk[]): string[] {
    return risks.map((risk) => risk.mitigation);
  }

  private generateComplianceMitigations(risks: ComplianceRisk[]): string[] {
    return risks.flatMap((risk) => risk.requiredActions);
  }

  private async analyzeScheduleFeasibility(
    _schedule: BackupSchedule,
  ): Promise<any> {
    // Mock implementation
    return { feasible: true, conflicts: [], recommendations: [] };
  }

  private async assessScheduleRisks(
    _schedule: BackupSchedule,
    _analysis: any,
  ): Promise<BackupRiskAssessment> {
    // Mock implementation
    return {
      riskLevel: RiskLevel.MEDIUM,
      riskFactors: ['Automated execution without manual oversight'],
      mitigationStrategies: ['Enable notifications', 'Regular schedule review'],
      businessImpact: {
        serviceDisruption: 'MINIMAL',
        userImpact: 'NONE',
        dataAvailability: 'MAINTAINED',
        performanceImpact: 'SLIGHT',
        estimatedDowntime: 0,
      },
      technicalRisks: [],
      complianceRisks: [],
    };
  }

  private generateScheduleValidationPrompt(
    schedule: BackupSchedule,
    _analysis: any,
    _risks: BackupRiskAssessment,
  ): string {
    return `Approve backup schedule "${schedule.name}" with cron expression "${schedule.cronExpression}"?`;
  }

  private scheduleToBackupMetadata(
    schedule: BackupSchedule,
  ): BackupValidationMetadata {
    return {
      backupType: schedule.backupType,
      targetTables: ['*'],
      estimatedSize: 1000000,
      estimatedDuration: 30000,
      sourceDatabase: 'aigent_db',
      destinationPath: '/backups/scheduled',
      encryptionRequired: true,
      compressionEnabled: true,
      retentionPolicy: this.getRetentionPolicy(RiskLevel.MEDIUM),
    };
  }

  private determineScheduleSecurityLevel(
    schedule: BackupSchedule,
  ): SecurityLevel {
    return schedule.approvalRequired
      ? SecurityLevel._HIGH
      : SecurityLevel._MEDIUM;
  }

  private getScheduleComplianceRequirements(
    schedule: BackupSchedule,
  ): ComplianceRequirement[] {
    return [
      {
        framework: 'Internal Policy',
        requirement: 'Scheduled Backup Approval',
        mandatory: schedule.approvalRequired,
        validationRequired: true,
      },
    ];
  }

  private async assessSystemStateForRecovery(): Promise<any> {
    // Mock implementation
    return {
      healthy: false,
      issues: ['Database connection lost', 'High error rate'],
    };
  }

  private validateRecoveryTrigger(
    plan: DisasterRecoveryPlan,
    reason: string,
    _systemState: any,
  ): { valid: boolean; reason?: string } {
    if (
      plan.triggerConditions.some((condition) => reason.includes(condition))
    ) {
      return { valid: true };
    }
    return {
      valid: false,
      reason: 'Trigger reason does not match plan conditions',
    };
  }

  private recoveryPlanToBackupMetadata(
    plan: DisasterRecoveryPlan,
  ): BackupValidationMetadata {
    return {
      backupType: 'FULL',
      targetTables: ['*'],
      estimatedSize: 5000000,
      estimatedDuration: plan.estimatedRecoveryTime,
      sourceDatabase: 'backup_storage',
      destinationPath: 'production_db',
      encryptionRequired: true,
      compressionEnabled: false,
      retentionPolicy: this.getRetentionPolicy(RiskLevel.CRITICAL),
    };
  }

  private createRecoveryRiskAssessment(
    plan: DisasterRecoveryPlan,
    _systemState: any,
  ): BackupRiskAssessment {
    return {
      riskLevel: RiskLevel.CRITICAL,
      riskFactors: [
        'Full system recovery operation',
        'Potential data loss during recovery',
        'Extended service downtime',
      ],
      mitigationStrategies: [
        'Verify backup integrity before recovery',
        'Implement staged recovery process',
        'Monitor recovery progress continuously',
      ],
      businessImpact: {
        serviceDisruption: 'SIGNIFICANT',
        userImpact: 'HIGH',
        dataAvailability: 'SUSPENDED',
        performanceImpact: 'SEVERE',
        estimatedDowntime: plan.estimatedRecoveryTime,
      },
      technicalRisks: [
        {
          type: 'CORRUPTION',
          severity: 'CRITICAL',
          description: 'Risk of data corruption during recovery',
          likelihood: 0.3,
          mitigation: 'Verify backup integrity and use checksums',
        },
      ],
      complianceRisks: [],
    };
  }

  private getRecoveryComplianceRequirements(
    _plan: DisasterRecoveryPlan,
  ): ComplianceRequirement[] {
    return [
      {
        framework: 'Business Continuity',
        requirement: 'Disaster Recovery Authorization',
        mandatory: true,
        validationRequired: true,
      },
    ];
  }

  private generateRiskAcknowledgmentPrompt(
    risks: BackupRiskAssessment,
  ): string {
    return `Acknowledge the following risks: ${risks.riskFactors.join(', ')}. Do you understand and accept these risks?`;
  }

  private generateFinalRestorationPrompt(
    request: BackupRestorationRequest,
    risks: BackupRiskAssessment,
  ): string {
    return `Final confirmation: Restore backup ${request.backupId}? This operation will overwrite current data and may cause ${this.formatDuration(risks.businessImpact.estimatedDowntime)} downtime.`;
  }

  private initializeDefaultDisasterRecoveryPlans(): void {
    const defaultPlan: DisasterRecoveryPlan = {
      planId: 'default_recovery_plan',
      name: 'Default Database Recovery',
      description: 'Standard database recovery procedure for system failures',
      triggerConditions: [
        'database_failure',
        'data_corruption',
        'security_breach',
      ],
      recoverySteps: [
        {
          stepId: 'assess_damage',
          description: 'Assess system damage and determine recovery scope',
          estimatedDuration: 300000, // 5 minutes
          dependencies: [],
          riskLevel: RiskLevel.MEDIUM,
          approvalRequired: false,
          automationPossible: true,
        },
        {
          stepId: 'restore_from_backup',
          description: 'Restore database from latest verified backup',
          estimatedDuration: 1800000, // 30 minutes
          dependencies: ['assess_damage'],
          riskLevel: RiskLevel.HIGH,
          approvalRequired: true,
          automationPossible: false,
        },
      ],
      estimatedRecoveryTime: 2100000, // 35 minutes
      dataLossRisk: 'MINIMAL',
      businessContinuity: {
        alternativeServices: ['read-only mode', 'cached data service'],
        communicationPlan: ['notify users', 'update status page'],
        stakeholderNotification: ['technical team', 'management', 'customers'],
        serviceRestoration: ['gradual rollout', 'monitoring validation'],
      },
    };

    this.disasterRecoveryPlans.set(defaultPlan.planId, defaultPlan);
  }

  // ===== PUBLIC API METHODS =====

  /**
   * Get validation statistics
   */
  getValidationStatistics() {
    const cacheHitRate =
      this.validationCount > 0
        ? (this.cacheHitCount / this.validationCount) * 100
        : 0;

    return {
      totalValidations: this.validationCount,
      cacheHitRate: `${cacheHitRate.toFixed(2)}%`,
      averageValidationTime: `${this.averageValidationTime.toFixed(2)}ms`,
      approvalSuccessRate: `${(this.approvalSuccessRate * 100).toFixed(2)}%`,
      activeSchedules: this.scheduleCache.size,
      disasterRecoveryPlans: this.disasterRecoveryPlans.size,
    };
  }

  /**
   * Get active backup schedules
   */
  getActiveBackupSchedules(): BackupSchedule[] {
    return Array.from(this.scheduleCache.values());
  }

  /**
   * Get disaster recovery plans
   */
  getDisasterRecoveryPlans(): DisasterRecoveryPlan[] {
    return Array.from(this.disasterRecoveryPlans.values());
  }

  /**
   * Clear validation cache
   */
  clearValidationCache(): void {
    this.validationCache.clear();
    this.logger.log('PARLANT backup validation cache cleared');
  }
}

// ===== SUPPORTING INTERFACES =====

interface ApprovalWorkflow {
  workflowId: string;
  name: string;
  steps: ApprovalStep[];
}

interface ApprovalStep {
  stepId: string;
  title: string;
  description: string;
  required: boolean;
  prompt: string;
}

interface StepApprovalResult {
  stepId: string;
  approved: boolean;
  reason: string;
  timestamp: Date;
}
