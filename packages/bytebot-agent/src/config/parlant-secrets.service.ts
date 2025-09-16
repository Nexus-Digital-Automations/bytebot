/**
 * Parlant-Enhanced Secrets Service - MAXIMUM Integration with Conversational Validation
 * Wraps SecretsService operations with comprehensive Parlant conversational validation
 *
 * Features:
 * - CRITICAL risk level validation for all secrets operations
 * - Conversational approval for secrets access, modification, and rotation
 * - Enterprise-grade audit trails with conversational context
 * - Production safeguards with multi-layer approval
 * - Real-time security monitoring with conversational alerts
 * - Risk-based approval workflows for different operation types
 *
 * @author Configuration & Secrets Management Parlant Integration Agent
 * @version 1.0.0 - MAXIMUM Parlant Integration for Secrets Management
 * @since Phase 4: MAXIMUM Parlant Integration - Secrets Management
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretsService, LocalSecretMetadata } from './secrets.service';
import {
  ParlantConfigurationService,
  ParlantRiskLevel,
  ConfigurationOperationContext,
  ParlantValidationResponse,
} from './parlant-configuration.service';
import * as crypto from 'crypto';

/**
 * Secrets operation types for risk assessment
 */
export enum SecretsOperationType {
  GET_SECRET = 'get_secret',
  SET_SECRET = 'set_secret',
  ROTATE_SECRET = 'rotate_secret',
  DELETE_SECRET = 'delete_secret',
  LIST_SECRETS = 'list_secrets',
  HEALTH_CHECK = 'health_check',
}

/**
 * Enhanced secrets metadata with Parlant validation context
 */
export interface ParlantSecretsMetadata extends LocalSecretMetadata {
  parlantContext: {
    lastValidationId: string;
    approvalHistory: Array<{
      timestamp: Date;
      operation: SecretsOperationType;
      approved: boolean;
      approver?: string;
      riskLevel: ParlantRiskLevel;
    }>;
    riskProfile: {
      level: ParlantRiskLevel;
      factors: string[];
      lastAssessment: Date;
    };
  };
}

/**
 * Secrets operation result with Parlant validation
 */
export interface ParlantSecretsOperationResult<T = unknown> {
  success: boolean;
  result?: T;
  error?: string;
  validation: ParlantValidationResponse;
  auditId: string;
  executionTime: number;
}

/**
 * Production secrets validation configuration
 */
interface ProductionSecretsConfig {
  requireDualApproval: boolean;
  emergencyBypassEnabled: boolean;
  rotationIntervalHours: number;
  auditRetentionDays: number;
  complianceValidation: {
    enabled: boolean;
    standards: string[];
    automaticReporting: boolean;
  };
}

/**
 * Parlant-Enhanced Secrets Service
 * Provides MAXIMUM conversational validation for all secrets operations with CRITICAL risk level
 */
@Injectable()
export class ParlantSecretsService {
  private readonly logger = new Logger('ParlantSecretsService');
  private readonly productionConfig: ProductionSecretsConfig;

  constructor(
    private readonly secretsService: SecretsService,
    private readonly configService: ConfigService,
    private readonly parlantService: ParlantConfigurationService,
  ) {
    // Initialize production-grade configuration
    this.productionConfig = {
      requireDualApproval:
        this.configService.get<boolean>('app.secrets.requireDualApproval') ??
        true,
      emergencyBypassEnabled:
        this.configService.get<boolean>('app.secrets.emergencyBypass') ?? false,
      rotationIntervalHours:
        this.configService.get<number>('app.secrets.rotationInterval') ?? 24,
      auditRetentionDays:
        this.configService.get<number>('app.secrets.auditRetention') ?? 90,
      complianceValidation: {
        enabled:
          this.configService.get<boolean>('app.secrets.complianceValidation') ??
          true,
        standards: this.configService.get<string[]>(
          'app.secrets.complianceStandards',
        ) ?? ['SOC2', 'PCI-DSS'],
        automaticReporting:
          this.configService.get<boolean>('app.secrets.automaticReporting') ??
          true,
      },
    };

    this.logger.log(
      'Parlant Secrets Service initialized with MAXIMUM integration',
      {
        productionSafeguards: true,
        dualApprovalRequired: this.productionConfig.requireDualApproval,
        emergencyBypass: this.productionConfig.emergencyBypassEnabled,
        complianceEnabled: this.productionConfig.complianceValidation.enabled,
      },
    );
  }

  /**
   * Get secret with CRITICAL risk Parlant validation
   * ALL secret access operations require conversational validation
   */
  async getSecret(
    secretName: string,
    key?: string,
    encrypted = false,
    user = 'system',
    sessionId?: string,
  ): Promise<ParlantSecretsOperationResult<string | null>> {
    const startTime = Date.now();
    const operationId = `get-secret-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    this.logger.log(
      `[${operationId}] Parlant validation required for secret access`,
      {
        secretName,
        key,
        user,
        riskLevel: ParlantRiskLevel.CRITICAL,
      },
    );

    try {
      // Create operation context for Parlant validation
      const context: ConfigurationOperationContext = {
        operation: `Access secret: ${secretName}${key ? `:${key}` : ''}`,
        service: 'SecretsService',
        method: 'getSecret',
        parameters: { secretName, key, encrypted },
        environment:
          this.configService.get<string>('NODE_ENV') || 'development',
        user,
        riskLevel: ParlantRiskLevel.CRITICAL, // ALL secret access is CRITICAL
        requiresApproval: true,
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
      };

      // Perform Parlant conversational validation
      const validation =
        await this.parlantService.validateConfigurationOperation(context);

      if (!validation.approved) {
        const result: ParlantSecretsOperationResult<string | null> = {
          success: false,
          error: `Secret access denied: ${validation.rejectionReason}`,
          validation,
          auditId: operationId,
          executionTime: Date.now() - startTime,
        };

        await this.recordSecretsAudit(context, validation, result);
        return result;
      }

      // Execute the secret retrieval with enhanced monitoring
      this.logger.log(
        `[${operationId}] Parlant validation APPROVED - executing secret retrieval`,
        {
          conversationId: validation.conversationId,
          approvalReason: validation.approvalReason,
        },
      );

      const secretValue = this.secretsService.getSecret(
        secretName,
        key,
        encrypted,
      );

      const result: ParlantSecretsOperationResult<string | null> = {
        success: true,
        result: secretValue,
        validation,
        auditId: operationId,
        executionTime: Date.now() - startTime,
      };

      await this.recordSecretsAudit(context, validation, result);
      return result;
    } catch (error) {
      const result: ParlantSecretsOperationResult<string | null> = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        validation: {
          approved: false,
          conversationId: operationId,
          riskAssessment: {
            level: ParlantRiskLevel.CRITICAL,
            factors: ['operation_error', 'system_failure'],
            recommendations: [
              'Check system health',
              'Retry operation',
              'Contact administrator',
            ],
          },
          rejectionReason: 'Operation failed due to system error',
          auditTrail: {
            timestamp: new Date(),
            decision: 'rejected',
            justification: 'System error during secret retrieval',
          },
        },
        auditId: operationId,
        executionTime: Date.now() - startTime,
      };

      this.logger.error(`[${operationId}] Secret retrieval failed`, {
        error: error instanceof Error ? error.message : String(error),
        secretName,
        user,
      });

      return result;
    }
  }

  /**
   * Set secret with CRITICAL risk Parlant validation
   * ALL secret modification operations require conversational approval
   */
  async setSecret(
    secretName: string,
    value: string,
    key?: string,
    encrypted = true,
    user = 'system',
    sessionId?: string,
  ): Promise<ParlantSecretsOperationResult<boolean>> {
    const startTime = Date.now();
    const operationId = `set-secret-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    this.logger.warn(
      `[${operationId}] CRITICAL RISK: Secret modification requires Parlant approval`,
      {
        secretName,
        key,
        user,
        encrypted,
        productionEnvironment: this.isProductionEnvironment(),
      },
    );

    try {
      // Create operation context for CRITICAL risk validation
      const context: ConfigurationOperationContext = {
        operation: `Modify secret: ${secretName}${key ? `:${key}` : ''}`,
        service: 'SecretsService',
        method: 'setSecret',
        parameters: { secretName, key, encrypted, valueLength: value.length },
        environment:
          this.configService.get<string>('NODE_ENV') || 'development',
        user,
        riskLevel: ParlantRiskLevel.CRITICAL, // ALL secret modifications are CRITICAL
        requiresApproval: true,
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
      };

      // Perform enhanced Parlant validation for secret modification
      const validation =
        await this.parlantService.validateConfigurationOperation(context);

      if (!validation.approved) {
        const result: ParlantSecretsOperationResult<boolean> = {
          success: false,
          error: `Secret modification denied: ${validation.rejectionReason}`,
          validation,
          auditId: operationId,
          executionTime: Date.now() - startTime,
        };

        await this.recordSecretsAudit(context, validation, result);
        return result;
      }

      // Additional production safeguards for secret modification
      if (
        this.isProductionEnvironment() &&
        this.productionConfig.requireDualApproval
      ) {
        const dualApprovalResult = await this.performDualApprovalCheck(
          context,
          validation,
        );
        if (!dualApprovalResult.approved) {
          const result: ParlantSecretsOperationResult<boolean> = {
            success: false,
            error: 'Dual approval required for production secret modification',
            validation: dualApprovalResult,
            auditId: operationId,
            executionTime: Date.now() - startTime,
          };

          await this.recordSecretsAudit(context, dualApprovalResult, result);
          return result;
        }
      }

      // Execute the secret modification with comprehensive monitoring
      this.logger.warn(
        `[${operationId}] CRITICAL operation APPROVED - executing secret modification`,
        {
          conversationId: validation.conversationId,
          approvalReason: validation.approvalReason,
          productionSafeguards: validation.additionalSafeguards?.required,
        },
      );

      const success = this.secretsService.setSecret(
        secretName,
        value,
        key,
        encrypted,
      );

      const result: ParlantSecretsOperationResult<boolean> = {
        success,
        result: success,
        validation,
        auditId: operationId,
        executionTime: Date.now() - startTime,
      };

      await this.recordSecretsAudit(context, validation, result);

      // Emit security event for secret modification
      if (success) {
        this.parlantService.emit('criticalSecretModification', {
          secretName,
          user,
          timestamp: new Date(),
          conversationId: validation.conversationId,
          auditId: operationId,
        });
      }

      return result;
    } catch (error) {
      const result: ParlantSecretsOperationResult<boolean> = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        validation: {
          approved: false,
          conversationId: operationId,
          riskAssessment: {
            level: ParlantRiskLevel.CRITICAL,
            factors: [
              'operation_error',
              'system_failure',
              'potential_security_breach',
            ],
            recommendations: [
              'Immediate security review',
              'Check system integrity',
              'Alert security team',
            ],
          },
          rejectionReason: 'Critical error during secret modification',
          auditTrail: {
            timestamp: new Date(),
            decision: 'rejected',
            justification: 'System error prevented secret modification',
          },
        },
        auditId: operationId,
        executionTime: Date.now() - startTime,
      };

      this.logger.error(
        `[${operationId}] CRITICAL: Secret modification failed`,
        {
          error: error instanceof Error ? error.message : String(error),
          secretName,
          user,
        },
      );

      return result;
    }
  }

  /**
   * Rotate secret with CRITICAL risk Parlant validation
   * Secret rotation operations require comprehensive conversational approval
   */
  async rotateSecret(
    secretName: string,
    key?: string,
    user = 'system',
    sessionId?: string,
  ): Promise<ParlantSecretsOperationResult<void>> {
    const startTime = Date.now();
    const operationId = `rotate-secret-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    this.logger.warn(
      `[${operationId}] CRITICAL RISK: Secret rotation requires Parlant approval`,
      {
        secretName,
        key,
        user,
        environment: this.configService.get<string>('NODE_ENV'),
      },
    );

    try {
      // Create operation context for secret rotation
      const context: ConfigurationOperationContext = {
        operation: `Rotate secret: ${secretName}${key ? `:${key}` : ''}`,
        service: 'SecretsService',
        method: 'rotateSecret',
        parameters: { secretName, key },
        environment:
          this.configService.get<string>('NODE_ENV') || 'development',
        user,
        riskLevel: ParlantRiskLevel.CRITICAL, // Secret rotation is always CRITICAL
        requiresApproval: true,
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
      };

      // Perform Parlant conversational validation for rotation
      const validation =
        await this.parlantService.validateConfigurationOperation(context);

      if (!validation.approved) {
        const result: ParlantSecretsOperationResult<void> = {
          success: false,
          error: `Secret rotation denied: ${validation.rejectionReason}`,
          validation,
          auditId: operationId,
          executionTime: Date.now() - startTime,
        };

        await this.recordSecretsAudit(context, validation, result);
        return result;
      }

      // Execute secret rotation with comprehensive monitoring
      this.logger.warn(
        `[${operationId}] CRITICAL rotation APPROVED - executing secret rotation`,
        {
          conversationId: validation.conversationId,
          additionalSafeguards: validation.additionalSafeguards,
        },
      );

      this.secretsService.rotateSecret(secretName, key);

      const result: ParlantSecretsOperationResult<void> = {
        success: true,
        validation,
        auditId: operationId,
        executionTime: Date.now() - startTime,
      };

      await this.recordSecretsAudit(context, validation, result);

      // Emit security event for secret rotation
      this.parlantService.emit('criticalSecretRotation', {
        secretName,
        user,
        timestamp: new Date(),
        conversationId: validation.conversationId,
        auditId: operationId,
      });

      return result;
    } catch (error) {
      const result: ParlantSecretsOperationResult<void> = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        validation: {
          approved: false,
          conversationId: operationId,
          riskAssessment: {
            level: ParlantRiskLevel.CRITICAL,
            factors: ['rotation_failure', 'system_error', 'security_risk'],
            recommendations: [
              'Immediate investigation',
              'Check dependent services',
              'Alert operations team',
            ],
          },
          rejectionReason: 'Secret rotation failed due to system error',
          auditTrail: {
            timestamp: new Date(),
            decision: 'rejected',
            justification: 'System error prevented secret rotation',
          },
        },
        auditId: operationId,
        executionTime: Date.now() - startTime,
      };

      this.logger.error(`[${operationId}] CRITICAL: Secret rotation failed`, {
        error: error instanceof Error ? error.message : String(error),
        secretName,
        user,
      });

      return result;
    }
  }

  /**
   * Get secrets health with HIGH risk Parlant validation
   * Health checks may expose sensitive operational information
   */
  async getSecretsHealth(
    user = 'system',
    sessionId?: string,
  ): Promise<
    ParlantSecretsOperationResult<
      ReturnType<typeof this.secretsService.getSecretsHealth>
    >
  > {
    const startTime = Date.now();
    const operationId = `secrets-health-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    try {
      // Create operation context for health check
      const context: ConfigurationOperationContext = {
        operation: 'Get secrets health status',
        service: 'SecretsService',
        method: 'getSecretsHealth',
        parameters: {},
        environment:
          this.configService.get<string>('NODE_ENV') || 'development',
        user,
        riskLevel: ParlantRiskLevel.HIGH, // Health checks expose operational data
        requiresApproval: this.isProductionEnvironment(),
        auditRequired: true,
        productionSafeguards: this.isProductionEnvironment(),
      };

      // Perform Parlant validation for health check
      const validation =
        await this.parlantService.validateConfigurationOperation(context);

      if (!validation.approved) {
        const result: ParlantSecretsOperationResult<
          ReturnType<typeof this.secretsService.getSecretsHealth>
        > = {
          success: false,
          error: `Secrets health check denied: ${validation.rejectionReason}`,
          validation,
          auditId: operationId,
          executionTime: Date.now() - startTime,
        };

        await this.recordSecretsAudit(context, validation, result);
        return result;
      }

      // Execute health check
      const healthStatus = this.secretsService.getSecretsHealth();

      const result: ParlantSecretsOperationResult<
        ReturnType<typeof this.secretsService.getSecretsHealth>
      > = {
        success: true,
        result: healthStatus,
        validation,
        auditId: operationId,
        executionTime: Date.now() - startTime,
      };

      await this.recordSecretsAudit(context, validation, result);
      return result;
    } catch (error) {
      const result: ParlantSecretsOperationResult<
        ReturnType<typeof this.secretsService.getSecretsHealth>
      > = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        validation: {
          approved: false,
          conversationId: operationId,
          riskAssessment: {
            level: ParlantRiskLevel.HIGH,
            factors: ['health_check_failure', 'system_error'],
            recommendations: [
              'Check system status',
              'Review health monitoring',
              'Contact support',
            ],
          },
          rejectionReason: 'Health check failed due to system error',
          auditTrail: {
            timestamp: new Date(),
            decision: 'rejected',
            justification: 'System error during health check',
          },
        },
        auditId: operationId,
        executionTime: Date.now() - startTime,
      };

      return result;
    }
  }

  /**
   * Perform dual approval check for production environments
   */
  private async performDualApprovalCheck(
    context: ConfigurationOperationContext,
    initialValidation: ParlantValidationResponse,
  ): Promise<ParlantValidationResponse> {
    this.logger.warn('Dual approval required for production secret operation', {
      operation: context.operation,
      initialApprover: context.user,
    });

    // In real implementation, this would integrate with Parlant for dual approval workflow
    // For now, we simulate the dual approval requirement

    return {
      approved: false, // Requires manual dual approval in production
      conversationId: `dual-approval-${initialValidation.conversationId}`,
      riskAssessment: {
        ...initialValidation.riskAssessment,
        factors: [
          ...initialValidation.riskAssessment.factors,
          'dual_approval_required',
          'production_safeguards',
        ],
        recommendations: [
          ...initialValidation.riskAssessment.recommendations,
          'Obtain approval from second authorized administrator',
          'Document business justification for secret modification',
          'Schedule operation during maintenance window',
        ],
      },
      rejectionReason:
        'Production environment requires dual approval for CRITICAL secret operations',
      auditTrail: {
        timestamp: new Date(),
        decision: 'deferred',
        justification:
          'Dual approval workflow initiated for production secret modification',
      },
      additionalSafeguards: {
        required: true,
        safeguards: [
          'dual_approval_workflow',
          'business_justification_required',
          'maintenance_window_scheduling',
          'rollback_plan_preparation',
        ],
        timeout: 3600000, // 1 hour for dual approval
      },
    };
  }

  /**
   * Record comprehensive secrets audit
   */
  private async recordSecretsAudit(
    context: ConfigurationOperationContext,
    validation: ParlantValidationResponse,
    result: ParlantSecretsOperationResult<unknown>,
  ): Promise<void> {
    await this.parlantService.recordConfigurationAudit(context, validation, {
      success: result.success,
      result: result.result,
      error: result.error,
      executionTime: result.executionTime,
    });

    // Additional secrets-specific audit logging
    this.logger.log('Secrets operation audit recorded', {
      auditId: result.auditId,
      operation: context.operation,
      approved: validation.approved,
      riskLevel: context.riskLevel,
      environment: context.environment,
      user: context.user,
      conversationId: validation.conversationId,
      success: result.success,
    });
  }

  /**
   * Check if running in production environment
   */
  private isProductionEnvironment(): boolean {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    return nodeEnv === 'production' || nodeEnv === 'prod';
  }

  /**
   * Get Parlant-enhanced secrets metadata
   */
  getSecretsMetadata(): LocalSecretMetadata[] {
    return this.secretsService.getLocalSecretsMetadata();
  }

  /**
   * Get performance metrics including Parlant validation statistics
   */
  getPerformanceMetrics(): {
    secretsService: ReturnType<
      typeof this.secretsService.getLocalSecretsHealth
    >;
    parlantValidation: ReturnType<
      typeof this.parlantService.getPerformanceMetrics
    >;
  } {
    return {
      secretsService: this.secretsService.getLocalSecretsHealth(),
      parlantValidation: this.parlantService.getPerformanceMetrics(),
    };
  }
}
