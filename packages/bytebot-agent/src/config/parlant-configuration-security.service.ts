/**
 * Parlant-Enhanced Configuration Security Service - PARLANT INTEGRATED
 *
 * Provides conversational validation for ALL configuration security operations
 * with MAXIMUM Parlant integration for security audit, validation, and
 * configuration integrity checks. Wraps the existing ConfigurationSecurityService
 * with risk-based conversational approval workflows to ensure secure
 * configuration management with enterprise-grade validation.
 *
 * Features:
 * - Conversational validation for ALL security audit operations
 * - Risk-based approval system (CRITICAL for security violations)
 * - Real-time security configuration validation with Parlant approval
 * - Security audit approval workflows with dual validation
 * - Production safeguards with enhanced security controls
 * - Comprehensive audit trails for all security operations
 * - Performance impact monitoring for validation overhead
 *
 * PARLANT INTEGRATION:
 * - Security audits: HIGH risk (comprehensive system security assessment)
 * - Security validation: HIGH risk (configuration security checks)
 * - Violation resolution: CRITICAL risk (security incident response)
 * - Configuration integrity: HIGH risk (system integrity verification)
 * - Security hash generation: MEDIUM risk (cryptographic operations)
 * - Emergency security operations: CRITICAL risk (security incident handling)
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
import { ConfigurationSecurityService } from './configuration-security.service';
import {
  ParlantConfigurationService,
  ConfigurationOperationContext,
  ParlantRiskLevel,
  ParlantValidationResponse,
} from './parlant-configuration.service';

/**
 * Parlant-enhanced security operation types
 */
export enum SecurityOperationType {
  SECURITY_AUDIT = 'security_audit',
  SECURITY_VALIDATION = 'security_validation',
  VIOLATION_RESOLUTION = 'violation_resolution',
  INTEGRITY_VERIFICATION = 'integrity_verification',
  HASH_GENERATION = 'hash_generation',
  EMERGENCY_SECURITY_OPERATION = 'emergency_security_operation',
  CRITICAL_VIOLATION_RESPONSE = 'critical_violation_response',
  SECURITY_STATUS_CHECK = 'security_status_check',
  AUDIT_HISTORY_ACCESS = 'audit_history_access',
}

/**
 * Security violation with Parlant context
 */
export interface ParlantSecurityViolation {
  type:
    | 'SECRET_EXPOSURE'
    | 'WEAK_CONFIGURATION'
    | 'INSECURE_DEFAULT'
    | 'VALIDATION_FAILURE';
  severity: 'low' | 'medium' | 'high' | 'critical';
  field: string;
  message: string;
  recommendation: string;
  detected: Date;
  parlantContext: {
    validationRequired: boolean;
    riskLevel: ParlantRiskLevel;
    requiresImmediateAction: boolean;
    conversationId?: string;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
  };
}

/**
 * Security status with Parlant validation
 */
export interface ParlantSecurityStatus {
  secure: boolean;
  score: number;
  violations: ParlantSecurityViolation[];
  lastAudit: Date;
  recommendations: string[];
  parlantValidation: {
    auditApproved: boolean;
    validationDuration: number;
    conversationId?: string;
    riskAssessment: ParlantRiskLevel;
    requiresFollowUp: boolean;
  };
}

/**
 * Security operation result with Parlant validation
 */
export interface ParlantSecurityOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  validationDetails: {
    approved: boolean;
    riskLevel: ParlantRiskLevel;
    conversationId?: string;
    reason?: string;
    validationDuration: number;
    cacheHit: boolean;
    requiresManualApproval: boolean;
  };
  operationContext: {
    operationType: SecurityOperationType;
    securityScope: string;
    emergencyOperation?: boolean;
    timestamp: Date;
    userId?: string;
    sessionId?: string;
  };
  auditTrail: {
    operationId: string;
    conversationContext?: string;
    approvalChain: string[];
    securityEvents: string[];
    performanceMetrics: {
      totalDuration: number;
      validationOverhead: number;
      securityAuditDuration?: number;
    };
  };
}

/**
 * Parlant-Enhanced Configuration Security Service
 * Adds conversational validation to all configuration security operations
 */
@Injectable()
export class ParlantConfigurationSecurityService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('ParlantConfigurationSecurityService');
  private isInitialized = false;
  private securityMetrics = {
    totalSecurityOperations: 0,
    approvedOperations: 0,
    rejectedOperations: 0,
    criticalViolationsFound: 0,
    emergencyOperations: 0,
    averageValidationTime: 0,
    cacheHitRate: 0,
  };

  constructor(
    private readonly securityService: ConfigurationSecurityService,
    private readonly parlantConfigService: ParlantConfigurationService,
  ) {
    super();
    this.logger.log(
      'Parlant-Enhanced Configuration Security Service initialized',
    );
    this.logger.log(
      'PARLANT INTEGRATION: Conversational validation active for ALL security operations',
    );
  }

  /**
   * Initialize Parlant security service
   */
  onModuleInit(): void {
    try {
      this.logger.log(
        'Initializing Parlant-Enhanced Configuration Security Service...',
      );

      // Set up event listeners for security service events
      this.setupSecurityEventListeners();

      // Initialize Parlant security monitoring
      this.initializeParlantSecurityMonitoring();

      this.isInitialized = true;
      this.logger.log(
        'Parlant-Enhanced Configuration Security Service initialized successfully',
      );
    } catch (error) {
      this.logger.error(
        'Parlant-Enhanced Configuration Security Service initialization failed',
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
    this.logger.log(
      'Destroying Parlant-Enhanced Configuration Security Service...',
    );

    try {
      // Remove event listeners
      this.removeAllListeners();

      this.isInitialized = false;
      this.logger.log(
        'Parlant-Enhanced Configuration Security Service destroyed successfully',
        {
          finalMetrics: this.getSecurityMetrics(),
        },
      );
    } catch (error) {
      this.logger.error(
        'Error during Parlant-Enhanced Configuration Security Service destruction',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Perform security audit with Parlant validation
   */
  async performSecurityAuditWithParlant(
    user = 'system',
    sessionId?: string,
    emergency = false,
  ): Promise<ParlantSecurityOperationResult<ParlantSecurityStatus>> {
    const operationId = `parlant-security-audit-${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] Security audit requested with Parlant validation`,
        {
          user,
          sessionId,
          emergency,
        },
      );

      // Determine risk level based on context
      const riskLevel = emergency
        ? ParlantRiskLevel.CRITICAL
        : ParlantRiskLevel.HIGH;

      // PARLANT VALIDATION: Security audit operations (HIGH/CRITICAL risk)
      const context: ConfigurationOperationContext = {
        riskLevel,
        requiresApproval: true, // ALL security audits require approval
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
        configurationScope: 'system-wide-security',
        changeImpact: emergency
          ? 'critical-security-emergency'
          : 'comprehensive-security-audit',
        emergencyOperation: emergency,
      };

      const validation =
        await this.parlantConfigService.validateConfigurationOperation(context);

      this.updateSecurityMetrics(validation);

      if (emergency) {
        this.securityMetrics.emergencyOperations++;
      }

      if (!validation.approved) {
        this.logger.warn(
          `[${operationId}] Security audit rejected by Parlant validation`,
          {
            reason: validation.reason,
            conversationId: validation.conversationId,
          },
        );

        return this.createSecurityOperationResult(
          false,
          undefined,
          'Security audit rejected by Parlant validation',
          validation,
          SecurityOperationType.SECURITY_AUDIT,
          operationId,
          { user, sessionId, emergency },
          Date.now() - startTime,
        );
      }

      // Execute security audit
      const auditStartTime = Date.now();
      const securityStatus = this.securityService.performSecurityAudit();
      const auditDuration = Date.now() - auditStartTime;

      // Enhance security status with Parlant context
      const parlantSecurityStatus: ParlantSecurityStatus = {
        ...securityStatus,
        violations: securityStatus.violations.map((violation) =>
          this.enhanceViolationWithParlant(violation),
        ),
        parlantValidation: {
          auditApproved: validation.approved,
          validationDuration: validation.performanceImpact.validationDuration,
          conversationId: validation.conversationId,
          riskAssessment: validation.riskLevel,
          requiresFollowUp: securityStatus.violations.some(
            (v) => v.severity === 'critical',
          ),
        },
      };

      // Check for critical violations and update metrics
      const criticalViolations = securityStatus.violations.filter(
        (v) => v.severity === 'critical',
      );
      this.securityMetrics.criticalViolationsFound += criticalViolations.length;

      this.logger.log(
        `[${operationId}] Security audit completed with Parlant approval`,
        {
          securityScore: securityStatus.score,
          violationsFound: securityStatus.violations.length,
          criticalViolations: criticalViolations.length,
          auditDuration,
          conversationId: validation.conversationId,
          emergency,
        },
      );

      // Emit critical violations if found
      if (criticalViolations.length > 0) {
        this.emit('criticalSecurityViolationsDetected', {
          violations: criticalViolations,
          parlantContext: validation,
          operationId,
        });
      }

      return this.createSecurityOperationResult(
        true,
        parlantSecurityStatus,
        undefined,
        validation,
        SecurityOperationType.SECURITY_AUDIT,
        operationId,
        { user, sessionId, emergency },
        Date.now() - startTime,
        auditDuration,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`[${operationId}] Security audit failed with error`, {
        error: errorMessage,
        user,
        emergency,
      });

      // Create dummy validation for error case
      const errorValidation: ParlantValidationResponse = {
        approved: false,
        reason: 'Security audit operation failed with error',
        riskLevel: ParlantRiskLevel.CRITICAL,
        performanceImpact: {
          validationDuration: Date.now() - startTime,
          cacheHit: false,
          optimization: 'none',
        },
      };

      return this.createSecurityOperationResult(
        false,
        undefined,
        errorMessage,
        errorValidation,
        SecurityOperationType.SECURITY_AUDIT,
        operationId,
        { user, sessionId, emergency },
        Date.now() - startTime,
      );
    }
  }

  /**
   * Validate configuration security with Parlant approval
   */
  async validateConfigurationSecurityWithParlant(
    field: string,
    value: unknown,
    user = 'system',
    sessionId?: string,
  ): Promise<
    ParlantSecurityOperationResult<{
      secure: boolean;
      violations: ParlantSecurityViolation[];
      recommendations: string[];
    }>
  > {
    const operationId = `parlant-security-validation-${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.debug(
        `[${operationId}] Configuration security validation requested with Parlant`,
        {
          field,
          user,
          sessionId,
        },
      );

      // PARLANT VALIDATION: Configuration security validation (HIGH risk)
      const context: ConfigurationOperationContext = {
        riskLevel: ParlantRiskLevel.HIGH, // Security validation is HIGH risk
        requiresApproval: this.isProductionEnvironment(), // Requires approval in production
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
        configurationScope: 'field-security-validation',
        changeImpact: 'security-validation-check',
        emergencyOperation: false,
      };

      const validation =
        await this.parlantConfigService.validateConfigurationOperation(context);

      this.updateSecurityMetrics(validation);

      if (!validation.approved) {
        this.logger.warn(
          `[${operationId}] Security validation rejected by Parlant`,
          {
            reason: validation.reason,
            conversationId: validation.conversationId,
            field,
          },
        );

        return this.createSecurityOperationResult(
          false,
          undefined,
          'Security validation rejected by Parlant validation',
          validation,
          SecurityOperationType.SECURITY_VALIDATION,
          operationId,
          { field, user, sessionId },
          Date.now() - startTime,
        );
      }

      // Execute security validation
      const validationStartTime = Date.now();
      const securityValidation =
        this.securityService.validateConfigurationSecurity(field, value);
      const validationDuration = Date.now() - validationStartTime;

      // Enhance violations with Parlant context
      const enhancedResult = {
        secure: securityValidation.secure,
        violations: securityValidation.violations.map((violation) =>
          this.enhanceViolationWithParlant(violation),
        ),
        recommendations: securityValidation.recommendations,
      };

      this.logger.debug(
        `[${operationId}] Security validation completed with Parlant approval`,
        {
          field,
          secure: securityValidation.secure,
          violationsFound: securityValidation.violations.length,
          validationDuration,
          conversationId: validation.conversationId,
        },
      );

      return this.createSecurityOperationResult(
        true,
        enhancedResult,
        undefined,
        validation,
        SecurityOperationType.SECURITY_VALIDATION,
        operationId,
        { field, user, sessionId },
        Date.now() - startTime,
        validationDuration,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[${operationId}] Security validation failed with error`,
        {
          error: errorMessage,
          field,
          user,
        },
      );

      // Create dummy validation for error case
      const errorValidation: ParlantValidationResponse = {
        approved: false,
        reason: 'Security validation operation failed with error',
        riskLevel: ParlantRiskLevel.HIGH,
        performanceImpact: {
          validationDuration: Date.now() - startTime,
          cacheHit: false,
          optimization: 'none',
        },
      };

      return this.createSecurityOperationResult(
        false,
        undefined,
        errorMessage,
        errorValidation,
        SecurityOperationType.SECURITY_VALIDATION,
        operationId,
        { field, user, sessionId },
        Date.now() - startTime,
      );
    }
  }

  /**
   * Verify configuration integrity with Parlant validation
   */
  async verifyConfigurationIntegrityWithParlant(
    config: Record<string, unknown>,
    expectedHash: string,
    user = 'system',
    sessionId?: string,
  ): Promise<ParlantSecurityOperationResult<boolean>> {
    const operationId = `parlant-integrity-verification-${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] Configuration integrity verification requested with Parlant`,
        {
          user,
          sessionId,
          configKeys: Object.keys(config).length,
        },
      );

      // PARLANT VALIDATION: Configuration integrity verification (HIGH risk)
      const context: ConfigurationOperationContext = {
        riskLevel: ParlantRiskLevel.HIGH, // Integrity verification is HIGH risk
        requiresApproval: true, // Always requires approval for integrity checks
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
        configurationScope: 'system-integrity-verification',
        changeImpact: 'configuration-integrity-check',
        emergencyOperation: false,
      };

      const validation =
        await this.parlantConfigService.validateConfigurationOperation(context);

      this.updateSecurityMetrics(validation);

      if (!validation.approved) {
        this.logger.warn(
          `[${operationId}] Configuration integrity verification rejected by Parlant`,
          {
            reason: validation.reason,
            conversationId: validation.conversationId,
          },
        );

        return this.createSecurityOperationResult(
          false,
          undefined,
          'Configuration integrity verification rejected by Parlant validation',
          validation,
          SecurityOperationType.INTEGRITY_VERIFICATION,
          operationId,
          { user, sessionId },
          Date.now() - startTime,
        );
      }

      // Execute integrity verification
      const verificationStartTime = Date.now();
      const integrityResult = this.securityService.verifyConfigurationIntegrity(
        config,
        expectedHash,
      );
      const verificationDuration = Date.now() - verificationStartTime;

      this.logger.log(
        `[${operationId}] Configuration integrity verification completed`,
        {
          integrityValid: integrityResult,
          verificationDuration,
          conversationId: validation.conversationId,
        },
      );

      return this.createSecurityOperationResult(
        true,
        integrityResult,
        undefined,
        validation,
        SecurityOperationType.INTEGRITY_VERIFICATION,
        operationId,
        { user, sessionId },
        Date.now() - startTime,
        verificationDuration,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[${operationId}] Configuration integrity verification failed`,
        {
          error: errorMessage,
          user,
        },
      );

      // Create dummy validation for error case
      const errorValidation: ParlantValidationResponse = {
        approved: false,
        reason: 'Integrity verification operation failed with error',
        riskLevel: ParlantRiskLevel.HIGH,
        performanceImpact: {
          validationDuration: Date.now() - startTime,
          cacheHit: false,
          optimization: 'none',
        },
      };

      return this.createSecurityOperationResult(
        false,
        undefined,
        errorMessage,
        errorValidation,
        SecurityOperationType.INTEGRITY_VERIFICATION,
        operationId,
        { user, sessionId },
        Date.now() - startTime,
      );
    }
  }

  /**
   * Get current security status with Parlant validation
   */
  async getCurrentSecurityStatusWithParlant(
    user = 'system',
    sessionId?: string,
  ): Promise<
    ParlantSecurityOperationResult<{
      score: number;
      lastAudit?: Date;
      requiresAudit: boolean;
    }>
  > {
    const operationId = `parlant-security-status-${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.debug(
        `[${operationId}] Security status check requested with Parlant validation`,
        {
          user,
          sessionId,
        },
      );

      // PARLANT VALIDATION: Security status check (MEDIUM risk)
      const context: ConfigurationOperationContext = {
        riskLevel: ParlantRiskLevel.MEDIUM, // Status checks are MEDIUM risk
        requiresApproval: false, // Status checks don't require approval
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
        configurationScope: 'security-status-monitoring',
        changeImpact: 'security-status-check',
        emergencyOperation: false,
      };

      const validation =
        await this.parlantConfigService.validateConfigurationOperation(context);

      this.updateSecurityMetrics(validation);

      if (!validation.approved) {
        this.logger.warn(
          `[${operationId}] Security status check rejected by Parlant validation`,
          {
            reason: validation.reason,
            conversationId: validation.conversationId,
          },
        );

        return this.createSecurityOperationResult(
          false,
          undefined,
          'Security status check rejected by Parlant validation',
          validation,
          SecurityOperationType.SECURITY_STATUS_CHECK,
          operationId,
          { user, sessionId },
          Date.now() - startTime,
        );
      }

      // Execute security status check
      const statusCheckStartTime = Date.now();
      const securityStatus = this.securityService.getCurrentSecurityStatus();
      const statusCheckDuration = Date.now() - statusCheckStartTime;

      this.logger.debug(
        `[${operationId}] Security status check completed with Parlant approval`,
        {
          securityScore: securityStatus.score,
          requiresAudit: securityStatus.requiresAudit,
          statusCheckDuration,
          conversationId: validation.conversationId,
        },
      );

      return this.createSecurityOperationResult(
        true,
        securityStatus,
        undefined,
        validation,
        SecurityOperationType.SECURITY_STATUS_CHECK,
        operationId,
        { user, sessionId },
        Date.now() - startTime,
        statusCheckDuration,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[${operationId}] Security status check failed with error`,
        {
          error: errorMessage,
          user,
        },
      );

      // Create dummy validation for error case
      const errorValidation: ParlantValidationResponse = {
        approved: false,
        reason: 'Security status check operation failed with error',
        riskLevel: ParlantRiskLevel.MEDIUM,
        performanceImpact: {
          validationDuration: Date.now() - startTime,
          cacheHit: false,
          optimization: 'none',
        },
      };

      return this.createSecurityOperationResult(
        false,
        undefined,
        errorMessage,
        errorValidation,
        SecurityOperationType.SECURITY_STATUS_CHECK,
        operationId,
        { user, sessionId },
        Date.now() - startTime,
      );
    }
  }

  /**
   * Get security metrics with Parlant validation data
   */
  getSecurityMetrics(): typeof this.securityMetrics {
    return { ...this.securityMetrics };
  }

  /**
   * Setup event listeners for security service events
   */
  private setupSecurityEventListeners(): void {
    // Listen for critical security violations
    this.securityService.on(
      'criticalSecurityViolations',
      (violations: any[]) => {
        this.handleCriticalSecurityViolationsWithParlant(violations);
      },
    );

    this.logger.debug(
      'Security event listeners configured for Parlant validation',
    );
  }

  /**
   * Initialize Parlant security monitoring
   */
  private initializeParlantSecurityMonitoring(): void {
    // Set up periodic metrics collection
    setInterval(() => {
      this.collectSecurityMetrics();
    }, 60000); // Collect metrics every minute

    this.logger.debug('Parlant security monitoring initialized');
  }

  /**
   * Handle critical security violations with Parlant validation
   */
  private async handleCriticalSecurityViolationsWithParlant(
    violations: any[],
  ): Promise<void> {
    const operationId = `parlant-critical-violations-${Date.now()}`;

    try {
      this.logger.warn(
        `[${operationId}] Critical security violations detected, requiring Parlant validation`,
        {
          violationsCount: violations.length,
        },
      );

      // CRITICAL risk validation for security violations
      const context: ConfigurationOperationContext = {
        riskLevel: ParlantRiskLevel.CRITICAL, // Critical violations are CRITICAL risk
        requiresApproval: true,
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
        configurationScope: 'critical-security-incident',
        changeImpact: 'critical-security-violation-response',
        emergencyOperation: true,
      };

      const validation =
        await this.parlantConfigService.validateConfigurationOperation(context);

      this.updateSecurityMetrics(validation);
      this.securityMetrics.emergencyOperations++;
      this.securityMetrics.criticalViolationsFound += violations.length;

      this.emit('parlantCriticalSecurityViolations', {
        violations: violations.map((v) => this.enhanceViolationWithParlant(v)),
        parlantValidation: validation,
        operationId,
      });

      this.logger.error(
        `[${operationId}] Critical security violations processed with Parlant validation`,
        {
          approved: validation.approved,
          conversationId: validation.conversationId,
          violationsCount: violations.length,
        },
      );
    } catch (error) {
      this.logger.error(
        `[${operationId}] Error processing critical security violations with Parlant`,
        {
          error: error instanceof Error ? error.message : String(error),
          violationsCount: violations.length,
        },
      );
    }
  }

  /**
   * Enhance security violation with Parlant context
   */
  private enhanceViolationWithParlant(
    violation: any,
  ): ParlantSecurityViolation {
    const riskLevel = this.mapSeverityToRiskLevel(violation.severity);

    return {
      ...violation,
      parlantContext: {
        validationRequired:
          violation.severity === 'critical' || violation.severity === 'high',
        riskLevel,
        requiresImmediateAction: violation.severity === 'critical',
        approvalStatus: 'pending',
      },
    };
  }

  /**
   * Map security violation severity to Parlant risk level
   */
  private mapSeverityToRiskLevel(severity: string): ParlantRiskLevel {
    switch (severity) {
      case 'critical':
        return ParlantRiskLevel.CRITICAL;
      case 'high':
        return ParlantRiskLevel.HIGH;
      case 'medium':
        return ParlantRiskLevel.MEDIUM;
      default:
        return ParlantRiskLevel.LOW;
    }
  }

  /**
   * Check if running in production environment
   */
  private isProductionEnvironment(): boolean {
    return (
      process.env.NODE_ENV === 'production' ||
      process.env.ENVIRONMENT === 'production'
    );
  }

  /**
   * Update security metrics
   */
  private updateSecurityMetrics(validation: ParlantValidationResponse): void {
    this.securityMetrics.totalSecurityOperations++;

    if (validation.approved) {
      this.securityMetrics.approvedOperations++;
    } else {
      this.securityMetrics.rejectedOperations++;
    }

    // Update average validation time
    const currentAvg = this.securityMetrics.averageValidationTime;
    const newTime = validation.performanceImpact.validationDuration;
    this.securityMetrics.averageValidationTime =
      (currentAvg * (this.securityMetrics.totalSecurityOperations - 1) +
        newTime) /
      this.securityMetrics.totalSecurityOperations;

    // Update cache hit rate
    if (validation.performanceImpact.cacheHit) {
      const hitCount =
        this.securityMetrics.cacheHitRate *
          (this.securityMetrics.totalSecurityOperations - 1) +
        1;
      this.securityMetrics.cacheHitRate =
        hitCount / this.securityMetrics.totalSecurityOperations;
    } else {
      const hitCount =
        this.securityMetrics.cacheHitRate *
        (this.securityMetrics.totalSecurityOperations - 1);
      this.securityMetrics.cacheHitRate =
        hitCount / this.securityMetrics.totalSecurityOperations;
    }
  }

  /**
   * Collect security metrics periodically
   */
  private collectSecurityMetrics(): void {
    this.logger.debug('Collecting Parlant security metrics', {
      metrics: this.securityMetrics,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Create security operation result object
   */
  private createSecurityOperationResult<T>(
    success: boolean,
    data?: T,
    error?: string,
    validation?: ParlantValidationResponse,
    operationType?: SecurityOperationType,
    operationId?: string,
    operationContext?: any,
    totalDuration?: number,
    securityOperationDuration?: number,
  ): ParlantSecurityOperationResult<T> {
    return {
      success,
      data,
      error,
      validationDetails: {
        approved: validation?.approved || false,
        riskLevel: validation?.riskLevel || ParlantRiskLevel.MEDIUM,
        conversationId: validation?.conversationId,
        reason: validation?.reason,
        validationDuration:
          validation?.performanceImpact.validationDuration || 0,
        cacheHit: validation?.performanceImpact.cacheHit || false,
        requiresManualApproval:
          validation?.riskLevel === ParlantRiskLevel.CRITICAL,
      },
      operationContext: {
        operationType: operationType || SecurityOperationType.SECURITY_AUDIT,
        securityScope: operationContext?.field || 'system-wide',
        emergencyOperation: operationContext?.emergency || false,
        timestamp: new Date(),
        userId: operationContext?.user,
        sessionId: operationContext?.sessionId,
      },
      auditTrail: {
        operationId: operationId || `security-operation-${Date.now()}`,
        conversationContext: validation?.conversationId,
        approvalChain: validation?.approved
          ? ['parlant-approved']
          : ['parlant-rejected'],
        securityEvents: [],
        performanceMetrics: {
          totalDuration: totalDuration || 0,
          validationOverhead:
            validation?.performanceImpact.validationDuration || 0,
          securityAuditDuration: securityOperationDuration,
        },
      },
    };
  }
}
