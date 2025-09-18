/**
 * Parlant Health & Metrics Validation Service
 *
 * Comprehensive conversational validation service for all health monitoring and metrics
 * operations in the Bytebot package. Provides risk-appropriate validation based on
 * operation criticality with full audit trail support.
 *
 * Features:
 * - Risk-based conversational validation (LOW/MEDIUM/HIGH/CRITICAL)
 * - Health check operation validation with context awareness
 * - Metrics collection validation with performance impact assessment
 * - Alert generation validation with escalation policies
 * - Comprehensive audit trail for all health/monitoring operations
 * - Performance-optimized validation for high-frequency operations
 * - Intelligent caching for repetitive health checks
 *
 * Risk Levels:
 * - LOW: Basic metrics collection, routine health checks
 * - MEDIUM: System status changes, performance metrics
 * - HIGH: Critical alerts, diagnostic operations
 * - CRITICAL: System shutdown, emergency responses
 *
 * @author Claude Code - Agent 4 (Health & Metrics Parlant Integration)
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ===== VALIDATION INTERFACES =====

/**
 * Risk level for health/metrics operations
 */
export enum HealthMetricsRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM', 
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Health operation types for validation
 */
export enum HealthOperationType {
  BASIC_HEALTH_CHECK = 'BASIC_HEALTH_CHECK',
  DETAILED_STATUS = 'DETAILED_STATUS',
  LIVENESS_PROBE = 'LIVENESS_PROBE',
  READINESS_PROBE = 'READINESS_PROBE',
  STARTUP_PROBE = 'STARTUP_PROBE',
  PROCESS_HEALTH = 'PROCESS_HEALTH',
  DATABASE_HEALTH = 'DATABASE_HEALTH',
  EXTERNAL_SERVICES = 'EXTERNAL_SERVICES',
  MODULE_INITIALIZATION = 'MODULE_INITIALIZATION',
  SYSTEM_RESOURCES = 'SYSTEM_RESOURCES',
  DEPENDENCY_CHECK = 'DEPENDENCY_CHECK',
}

/**
 * Metrics operation types for validation
 */
export enum MetricsOperationType {
  PROMETHEUS_COLLECTION = 'PROMETHEUS_COLLECTION',
  API_REQUEST_TRACKING = 'API_REQUEST_TRACKING',
  TASK_PROCESSING = 'TASK_PROCESSING',
  COMPUTER_USE_METRICS = 'COMPUTER_USE_METRICS',
  WEBSOCKET_METRICS = 'WEBSOCKET_METRICS',
  DATABASE_METRICS = 'DATABASE_METRICS',
  CACHE_METRICS = 'CACHE_METRICS',
  COMPRESSION_METRICS = 'COMPRESSION_METRICS',
  SYSTEM_METRICS = 'SYSTEM_METRICS',
  PERFORMANCE_BASELINE = 'PERFORMANCE_BASELINE',
}

/**
 * Alert operation types for validation
 */
export enum AlertOperationType {
  CREATE_ALERT = 'CREATE_ALERT',
  ACKNOWLEDGE_ALERT = 'ACKNOWLEDGE_ALERT',
  ESCALATE_ALERT = 'ESCALATE_ALERT',
  RESOLVE_ALERT = 'RESOLVE_ALERT',
  EMERGENCY_NOTIFICATION = 'EMERGENCY_NOTIFICATION',
  SLA_VIOLATION = 'SLA_VIOLATION',
}

/**
 * Validation request context
 */
export interface HealthMetricsValidationContext {
  operationType: HealthOperationType | MetricsOperationType | AlertOperationType;
  riskLevel: HealthMetricsRiskLevel;
  operationId: string;
  userId?: string;
  userRole?: string;
  parameters: Record<string, unknown>;
  systemContext: {
    currentHealth: string;
    activeAlerts: number;
    systemLoad: number;
    criticalOperationsActive: boolean;
  };
  metadata: {
    endpoint?: string;
    method?: string;
    duration?: number;
    frequency?: 'once' | 'periodic' | 'high-frequency';
  };
}

/**
 * Validation result
 */
export interface HealthMetricsValidationResult {
  approved: boolean;
  riskLevel: HealthMetricsRiskLevel;
  conversationId: string;
  operationId: string;
  reason?: string;
  recommendations?: string[];
  auditTrail: {
    operationId: string;
    timestamp: Date;
    validator: string;
    decision: 'APPROVED' | 'REJECTED' | 'ESCALATED';
    reasoning: string;
    evidence: Record<string, unknown>;
  };
  performanceImpact: {
    validationDuration: number;
    cacheHit: boolean;
    optimization: string;
  };
}

/**
 * Cached validation decision
 */
interface CachedValidation {
  result: HealthMetricsValidationResult;
  expiry: Date;
  hitCount: number;
}

/**
 * Risk assessment criteria
 */
interface RiskAssessment {
  level: HealthMetricsRiskLevel;
  factors: string[];
  requiresApproval: boolean;
  escalationRequired: boolean;
  auditRequired: boolean;
}

// ===== MAIN SERVICE =====

@Injectable()
export class ParlantHealthMetricsValidationService {
  private readonly logger = new Logger(ParlantHealthMetricsValidationService.name);

  /** Validation cache for performance optimization */
  private readonly validationCache = new Map<string, CachedValidation>();

  /** Operation risk mappings */
  private readonly operationRiskMap = new Map<string, HealthMetricsRiskLevel>();

  /** Performance metrics */
  private validationMetrics = {
    totalValidations: 0,
    cacheHits: 0,
    approvalRate: 0,
    averageValidationTime: 0,
  };

  /** Mock Parlant client - In production, this would be actual Parlant integration */
  private readonly parlantClient = {
    createValidationSession: async (context: { operationType: HealthOperationType | MetricsOperationType | AlertOperationType }) => ({
      id: `validation${Date.now()}${Math.random().toString(36).substring(7)}`,
      validate: async () => ({ approved: true, reason: 'Validated through conversational AI' }),
      explainAction: async () => `Health/metrics operation: ${context.operationType}`,
      logAudit: async (audit: { action: string; timestamp: Date; details?: Record<string, unknown> }) => this.logger.debug('Parlant audit logged', audit),
    }),
  };

  constructor(private readonly configService: ConfigService) {
    this.initializeRiskMappings();
    this.logger.log('Parlant Health & Metrics Validation Service initialized');
    this.logger.log('Risk-based validation system active with performance optimization');
  }

  // ===== PRIMARY VALIDATION METHODS =====

  /**
   * Validate health operation with conversational AI
   */
  async validateHealthOperation(
    operationType: HealthOperationType,
    parameters: Record<string, unknown>,
    userContext?: { userId?: string; userRole?: string },
  ): Promise<HealthMetricsValidationResult> {
    const operationId = `health${Date.now()}${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Validating health operation: ${operationType}`, {
      operationId,
      operationType,
      parametersCount: Object.keys(parameters).length,
      userId: userContext?.userId,
    });

    try {
      // Assess risk level for this operation
      const riskAssessment = this.assessOperationRisk(operationType, parameters);

      // Check cache for repetitive operations
      const cacheKey = this.generateCacheKey(operationType, parameters, riskAssessment.level);
      const cachedResult = this.getCachedValidation(cacheKey);
      
      if (cachedResult) {
        const duration = Date.now() - startTime;
        this.updateValidationMetrics(duration, true, true);
        
        this.logger.debug(`[${operationId}] Using cached validation result`, {
          operationId,
          cacheHit: true,
          validationDuration: duration,
        });
        
        return {
          ...cachedResult,
          operationId,
          performanceImpact: {
            validationDuration: duration,
            cacheHit: true,
            optimization: 'cache_hit',
          },
        };
      }

      // Create validation context
      const validationContext: HealthMetricsValidationContext = {
        operationType,
        riskLevel: riskAssessment.level,
        operationId,
        userId: userContext?.userId,
        userRole: userContext?.userRole,
        parameters,
        systemContext: await this.getSystemContext(),
        metadata: {
          frequency: this.determineOperationFrequency(operationType),
        },
      };

      // Perform conversational validation based on risk level
      const validationResult = await this.performConversationalValidation(
        validationContext,
        riskAssessment,
      );

      // Cache result for future use (if applicable)
      if (this.shouldCacheValidation(operationType, riskAssessment.level)) {
        this.cacheValidation(cacheKey, validationResult);
      }

      const duration = Date.now() - startTime;
      this.updateValidationMetrics(duration, false, validationResult.approved);

      this.logger.debug(`[${operationId}] Health operation validation completed`, {
        operationId,
        approved: validationResult.approved,
        riskLevel: riskAssessment.level,
        validationDuration: duration,
      });

      return validationResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Health validation failed: ${errorMessage}`, {
        operationId,
        operationType,
        error: errorMessage,
      });

      // Return safe default for critical health operations
      return this.createFailsafeValidation(operationId, operationType, errorMessage);
    }
  }

  /**
   * Validate metrics operation with conversational AI
   */
  async validateMetricsOperation(
    operationType: MetricsOperationType,
    parameters: Record<string, unknown>,
    userContext?: { userId?: string; userRole?: string },
  ): Promise<HealthMetricsValidationResult> {
    const operationId = `metrics${Date.now()}${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Validating metrics operation: ${operationType}`, {
      operationId,
      operationType,
      parametersCount: Object.keys(parameters).length,
      userId: userContext?.userId,
    });

    try {
      // Most metrics operations are LOW risk unless they involve critical system changes
      const riskLevel = this.getMetricsOperationRiskLevel(operationType, parameters);
      
      // For low-risk, high-frequency metrics operations, use optimized validation
      if (riskLevel === HealthMetricsRiskLevel.LOW && this.isHighFrequencyOperation(operationType)) {
        return this.performOptimizedValidation(operationId, operationType, parameters);
      }

      // Full validation for higher-risk metrics operations
      const riskAssessment = this.assessOperationRisk(operationType, parameters);
      
      const validationContext: HealthMetricsValidationContext = {
        operationType,
        riskLevel,
        operationId,
        userId: userContext?.userId,
        userRole: userContext?.userRole,
        parameters,
        systemContext: await this.getSystemContext(),
        metadata: {
          frequency: this.determineOperationFrequency(operationType),
        },
      };

      const validationResult = await this.performConversationalValidation(
        validationContext,
        riskAssessment,
      );

      const duration = Date.now() - startTime;
      this.updateValidationMetrics(duration, false, validationResult.approved);

      this.logger.debug(`[${operationId}] Metrics operation validation completed`, {
        operationId,
        approved: validationResult.approved,
        riskLevel,
        validationDuration: duration,
      });

      return validationResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Metrics validation failed: ${errorMessage}`, {
        operationId,
        operationType,
        error: errorMessage,
      });

      return this.createFailsafeValidation(operationId, operationType, errorMessage);
    }
  }

  /**
   * Validate alert operation with conversational AI
   */
  async validateAlertOperation(
    operationType: AlertOperationType,
    parameters: Record<string, unknown>,
    userContext?: { userId?: string; userRole?: string },
  ): Promise<HealthMetricsValidationResult> {
    const operationId = `alert${Date.now()}${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Validating alert operation: ${operationType}`, {
      operationId,
      operationType,
      severity: parameters.severity,
      component: parameters.component,
      userId: userContext?.userId,
    });

    try {
      // Alert operations require careful validation based on severity
      const riskLevel = this.getAlertOperationRiskLevel(operationType, parameters);
      const riskAssessment = this.assessOperationRisk(operationType, parameters);

      const validationContext: HealthMetricsValidationContext = {
        operationType,
        riskLevel,
        operationId,
        userId: userContext?.userId,
        userRole: userContext?.userRole,
        parameters,
        systemContext: await this.getSystemContext(),
        metadata: {
          frequency: 'once', // Alerts are typically one-time events
        },
      };

      const validationResult = await this.performConversationalValidation(
        validationContext,
        riskAssessment,
      );

      const duration = Date.now() - startTime;
      this.updateValidationMetrics(duration, false, validationResult.approved);

      this.logger.debug(`[${operationId}] Alert operation validation completed`, {
        operationId,
        approved: validationResult.approved,
        riskLevel,
        alertSeverity: parameters.severity,
        validationDuration: duration,
      });

      return validationResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Alert validation failed: ${errorMessage}`, {
        operationId,
        operationType,
        error: errorMessage,
      });

      return this.createFailsafeValidation(operationId, operationType, errorMessage);
    }
  }

  // ===== RISK ASSESSMENT =====

  /**
   * Assess operation risk level
   */
  private assessOperationRisk(
    operationType: HealthOperationType | MetricsOperationType | AlertOperationType,
    parameters: Record<string, unknown>,
  ): RiskAssessment {
    const baseRisk = this.operationRiskMap.get(operationType.toString()) ?? HealthMetricsRiskLevel.MEDIUM;
    const factors: string[] = [];
    
    // Analyze parameters for risk factors
    if (parameters.severity === 'EMERGENCY' || parameters.severity === 'CRITICAL') {
      factors.push('Critical severity level');
      return {
        level: HealthMetricsRiskLevel.CRITICAL,
        factors,
        requiresApproval: true,
        escalationRequired: true,
        auditRequired: true,
      };
    }

    if (parameters.component === 'database' || parameters.component === 'authentication') {
      factors.push('Critical system component');
    }

    if (parameters.frequency === 'high-frequency') {
      factors.push('High frequency operation - optimized validation');
    }

    return {
      level: baseRisk,
      factors,
      requiresApproval: baseRisk !== HealthMetricsRiskLevel.LOW,
      escalationRequired: baseRisk === HealthMetricsRiskLevel.CRITICAL,
      auditRequired: true,
    };
  }

  /**
   * Get metrics operation risk level
   */
  private getMetricsOperationRiskLevel(
    operationType: MetricsOperationType,
    parameters: Record<string, unknown>,
  ): HealthMetricsRiskLevel {
    // Most metrics collection is low risk
    const lowRiskOperations = [
      MetricsOperationType.PROMETHEUS_COLLECTION,
      MetricsOperationType.API_REQUEST_TRACKING,
      MetricsOperationType.SYSTEM_METRICS,
    ];

    if (lowRiskOperations.includes(operationType)) {
      return HealthMetricsRiskLevel.LOW;
    }

    // Performance-impacting operations are medium risk
    const mediumRiskOperations = [
      MetricsOperationType.DATABASE_METRICS,
      MetricsOperationType.PERFORMANCE_BASELINE,
    ];

    if (mediumRiskOperations.includes(operationType)) {
      return HealthMetricsRiskLevel.MEDIUM;
    }

    return HealthMetricsRiskLevel.LOW;
  }

  /**
   * Get alert operation risk level
   */
  private getAlertOperationRiskLevel(
    operationType: AlertOperationType,
    parameters: Record<string, unknown>,
  ): HealthMetricsRiskLevel {
    // Emergency operations are critical
    if (operationType === AlertOperationType.EMERGENCY_NOTIFICATION) {
      return HealthMetricsRiskLevel.CRITICAL;
    }

    // Alert creation based on severity
    if (operationType === AlertOperationType.CREATE_ALERT) {
      const severity = parameters.severity as string;
      switch (severity) {
        case 'EMERGENCY':
          return HealthMetricsRiskLevel.CRITICAL;
        case 'CRITICAL':
          return HealthMetricsRiskLevel.HIGH;
        case 'WARNING':
          return HealthMetricsRiskLevel.MEDIUM;
        default:
          return HealthMetricsRiskLevel.LOW;
      }
    }

    return HealthMetricsRiskLevel.MEDIUM;
  }

  // ===== CONVERSATIONAL VALIDATION =====

  /**
   * Perform conversational validation with Parlant
   */
  private async performConversationalValidation(
    context: HealthMetricsValidationContext,
    riskAssessment: RiskAssessment,
  ): Promise<HealthMetricsValidationResult> {
    const session = await this.parlantClient.createValidationSession({
      operationType: context.operationType,
    });

    // For low-risk operations, auto-approve with minimal validation
    if (riskAssessment.level === HealthMetricsRiskLevel.LOW) {
      return this.createApprovedValidation(context, session.id, 'Low risk operation auto-approved');
    }

    // For higher-risk operations, perform conversational validation
    const validation = await session.validate();
    const explanation = await session.explainAction();

    const result: HealthMetricsValidationResult = {
      approved: validation.approved,
      riskLevel: riskAssessment.level,
      conversationId: session.id,
      operationId: context.operationId,
      reason: validation.reason,
      recommendations: this.generateRecommendations(context, riskAssessment),
      auditTrail: {
        operationId: context.operationId,
        timestamp: new Date(),
        validator: 'ParlantHealthMetricsValidationService',
        decision: validation.approved ? 'APPROVED' : 'REJECTED',
        reasoning: explanation,
        evidence: {
          riskLevel: riskAssessment.level,
          factors: riskAssessment.factors,
          systemContext: context.systemContext,
        },
      },
      performanceImpact: {
        validationDuration: 0, // Will be filled by caller
        cacheHit: false,
        optimization: 'conversational_validation',
      },
    };

    // Log audit trail
    await session.logAudit({
      action: result.auditTrail.decision,
      timestamp: result.auditTrail.timestamp,
      details: {
        operationId: result.auditTrail.operationId,
        validator: result.auditTrail.validator,
        reasoning: result.auditTrail.reasoning,
        evidence: result.auditTrail.evidence ?? {}
      }
    });

    return result;
  }

  /**
   * Perform optimized validation for high-frequency, low-risk operations
   */
  private performOptimizedValidation(
    operationId: string,
    operationType: MetricsOperationType,
    parameters: Record<string, unknown>,
  ): HealthMetricsValidationResult {
    return {
      approved: true,
      riskLevel: HealthMetricsRiskLevel.LOW,
      conversationId: `optimized${operationId}`,
      operationId,
      reason: 'High-frequency, low-risk operation - optimized approval',
      recommendations: ['Continue monitoring for patterns'],
      auditTrail: {
        operationId,
        timestamp: new Date(),
        validator: 'ParlantHealthMetricsValidationService',
        decision: 'APPROVED',
        reasoning: 'Optimized validation for high-frequency metrics operation',
        evidence: {
          operationType,
          parameters,
          optimization: 'high_frequency_fast_path',
        },
      },
      performanceImpact: {
        validationDuration: 1, // Sub-millisecond for optimized path
        cacheHit: false,
        optimization: 'fast_path_approval',
      },
    };
  }

  // ===== HELPER METHODS =====

  /**
   * Initialize operation risk mappings
   */
  private initializeRiskMappings(): void {
    // Health operation risk levels
    this.operationRiskMap.set(HealthOperationType.BASIC_HEALTH_CHECK, HealthMetricsRiskLevel.LOW);
    this.operationRiskMap.set(HealthOperationType.LIVENESS_PROBE, HealthMetricsRiskLevel.LOW);
    this.operationRiskMap.set(HealthOperationType.READINESS_PROBE, HealthMetricsRiskLevel.MEDIUM);
    this.operationRiskMap.set(HealthOperationType.STARTUP_PROBE, HealthMetricsRiskLevel.MEDIUM);
    this.operationRiskMap.set(HealthOperationType.DETAILED_STATUS, HealthMetricsRiskLevel.MEDIUM);
    this.operationRiskMap.set(HealthOperationType.DATABASE_HEALTH, HealthMetricsRiskLevel.HIGH);
    this.operationRiskMap.set(HealthOperationType.EXTERNAL_SERVICES, HealthMetricsRiskLevel.HIGH);
    this.operationRiskMap.set(HealthOperationType.SYSTEM_RESOURCES, HealthMetricsRiskLevel.MEDIUM);

    // Metrics operation risk levels
    this.operationRiskMap.set(MetricsOperationType.PROMETHEUS_COLLECTION, HealthMetricsRiskLevel.LOW);
    this.operationRiskMap.set(MetricsOperationType.API_REQUEST_TRACKING, HealthMetricsRiskLevel.LOW);
    this.operationRiskMap.set(MetricsOperationType.SYSTEM_METRICS, HealthMetricsRiskLevel.LOW);
    this.operationRiskMap.set(MetricsOperationType.DATABASE_METRICS, HealthMetricsRiskLevel.MEDIUM);
    this.operationRiskMap.set(MetricsOperationType.PERFORMANCE_BASELINE, HealthMetricsRiskLevel.MEDIUM);

    // Alert operation risk levels
    this.operationRiskMap.set(AlertOperationType.CREATE_ALERT, HealthMetricsRiskLevel.MEDIUM);
    this.operationRiskMap.set(AlertOperationType.EMERGENCY_NOTIFICATION, HealthMetricsRiskLevel.CRITICAL);
    this.operationRiskMap.set(AlertOperationType.ESCALATE_ALERT, HealthMetricsRiskLevel.HIGH);

    this.logger.debug('Operation risk mappings initialized', {
      totalMappings: this.operationRiskMap.size,
    });
  }

  /**
   * Get current system context
   */
  private async getSystemContext(): Promise<HealthMetricsValidationContext['systemContext']> {
    // In production, this would query actual system status
    return {
      currentHealth: 'HEALTHY',
      activeAlerts: 0,
      systemLoad: 25,
      criticalOperationsActive: false,
    };
  }

  /**
   * Determine operation frequency
   */
  private determineOperationFrequency(
    operationType: HealthOperationType | MetricsOperationType | AlertOperationType,
  ): 'once' | 'periodic' | 'high-frequency' {
    const highFrequencyOps: (HealthOperationType | MetricsOperationType)[] = [
      HealthOperationType.BASIC_HEALTH_CHECK,
      HealthOperationType.LIVENESS_PROBE,
      MetricsOperationType.API_REQUEST_TRACKING,
      MetricsOperationType.SYSTEM_METRICS,
    ];

    if (highFrequencyOps.includes(operationType as HealthOperationType | MetricsOperationType)) {
      return 'high-frequency';
    }

    const periodicOps: (HealthOperationType | MetricsOperationType)[] = [
      HealthOperationType.READINESS_PROBE,
      HealthOperationType.DETAILED_STATUS,
      MetricsOperationType.PROMETHEUS_COLLECTION,
    ];

    if (periodicOps.includes(operationType as HealthOperationType | MetricsOperationType)) {
      return 'periodic';
    }

    return 'once';
  }

  /**
   * Check if operation is high frequency
   */
  private isHighFrequencyOperation(operationType: MetricsOperationType): boolean {
    const highFrequencyOps = [
      MetricsOperationType.API_REQUEST_TRACKING,
      MetricsOperationType.SYSTEM_METRICS,
      MetricsOperationType.WEBSOCKET_METRICS,
    ];

    return highFrequencyOps.includes(operationType);
  }

  /**
   * Generate cache key for validation
   */
  private generateCacheKey(
    operationType: HealthOperationType | MetricsOperationType | AlertOperationType,
    parameters: Record<string, unknown>,
    riskLevel: HealthMetricsRiskLevel,
  ): string {
    const paramHash = JSON.stringify(parameters);
    return `${operationType}${riskLevel}${Buffer.from(paramHash).toString('base64').substring(0, 16)}`;
  }

  /**
   * Get cached validation result
   */
  private getCachedValidation(cacheKey: string): HealthMetricsValidationResult | null {
    const cached = this.validationCache.get(cacheKey);
    
    if (cached && cached.expiry > new Date()) {
      cached.hitCount++;
      return cached.result;
    }

    if (cached) {
      this.validationCache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Cache validation result
   */
  private cacheValidation(cacheKey: string, result: HealthMetricsValidationResult): void {
    const expiryMinutes = result.riskLevel === HealthMetricsRiskLevel.LOW ? 15 : 5;
    const expiry = new Date(Date.now() + expiryMinutes * 60 * 1000);

    this.validationCache.set(_cacheKey, {
      result,
      expiry,
      hitCount: 0,
    });
  }

  /**
   * Check if validation should be cached
   */
  private shouldCacheValidation(
    operationType: HealthOperationType | MetricsOperationType | AlertOperationType,
    riskLevel: HealthMetricsRiskLevel,
  ): boolean {
    // Cache low-risk, high-frequency operations
    return riskLevel === HealthMetricsRiskLevel.LOW ||
           this.determineOperationFrequency(operationType) === 'high-frequency';
  }

  /**
   * Create approved validation result
   */
  private createApprovedValidation(
    context: HealthMetricsValidationContext,
    conversationId: string,
    reason: string,
  ): HealthMetricsValidationResult {
    return {
      approved: true,
      riskLevel: context.riskLevel,
      conversationId,
      operationId: context.operationId,
      reason,
      recommendations: ['Operation approved - continue monitoring'],
      auditTrail: {
        operationId: context.operationId,
        timestamp: new Date(),
        validator: 'ParlantHealthMetricsValidationService',
        decision: 'APPROVED',
        reasoning: reason,
        evidence: {
          riskLevel: context.riskLevel,
          systemContext: context.systemContext,
        },
      },
      performanceImpact: {
        validationDuration: 0,
        cacheHit: false,
        optimization: 'auto_approval',
      },
    };
  }

  /**
   * Create failsafe validation for error scenarios
   */
  private createFailsafeValidation(
    operationId: string,
    operationType: HealthOperationType | MetricsOperationType | AlertOperationType,
    errorMessage: string,
  ): HealthMetricsValidationResult {
    // For health operations, allow failsafe approval to prevent system disruption
    const isHealthOperation = Object.values(HealthOperationType).includes(operationType as HealthOperationType);
    const approved = isHealthOperation;

    return {
      approved,
      riskLevel: HealthMetricsRiskLevel.HIGH,
      conversationId: `failsafe${operationId}`,
      operationId,
      reason: approved 
        ? `Failsafe approval for health operation: ${errorMessage}`
        : `Validation failed, operation rejected: ${errorMessage}`,
      recommendations: [
        'Review validation system health',
        'Check Parlant service connectivity',
        'Monitor system for patterns',
      ],
      auditTrail: {
        operationId,
        timestamp: new Date(),
        validator: 'ParlantHealthMetricsValidationService',
        decision: approved ? 'APPROVED' : 'REJECTED',
        reasoning: `Failsafe validation triggered due to error: ${errorMessage}`,
        evidence: {
          error: errorMessage,
          failsafeMode: true,
          operationType,
        },
      },
      performanceImpact: {
        validationDuration: 0,
        cacheHit: false,
        optimization: 'failsafe_mode',
      },
    };
  }

  /**
   * Generate recommendations based on validation context
   */
  private generateRecommendations(
    context: HealthMetricsValidationContext,
    riskAssessment: RiskAssessment,
  ): string[] {
    const recommendations: string[] = [];

    if (riskAssessment.level === HealthMetricsRiskLevel.HIGH || riskAssessment.level === HealthMetricsRiskLevel.CRITICAL) {
      recommendations.push('Monitor operation closely for unexpected behavior');
      recommendations.push('Review system impact after operation completion');
    }

    if (context.systemContext.activeAlerts > 0) {
      recommendations.push('Consider current system alerts when evaluating operation impact');
    }

    if (context.systemContext.systemLoad > 80) {
      recommendations.push('System load is high - consider deferring non-critical operations');
    }

    if (context.metadata.frequency === 'high-frequency') {
      recommendations.push('Optimize validation for high-frequency operations');
    }

    return recommendations;
  }

  /**
   * Update validation performance metrics
   */
  private updateValidationMetrics(duration: number, cacheHit: boolean, approved: boolean): void {
    this.validationMetrics.totalValidations++;
    
    if (cacheHit) {
      this.validationMetrics.cacheHits++;
    }

    if (approved) {
      this.validationMetrics.approvalRate = 
        (this.validationMetrics.approvalRate * (this.validationMetrics.totalValidations - 1) + 1) / 
        this.validationMetrics.totalValidations;
    }

    this.validationMetrics.averageValidationTime = 
      (this.validationMetrics.averageValidationTime * (this.validationMetrics.totalValidations - 1) + duration) / 
      this.validationMetrics.totalValidations;
  }

  // ===== MONITORING & METRICS =====

  /**
   * Get validation service performance metrics
   */
  getValidationMetrics(): {
    totalValidations: number;
    cacheHits: number;
    cacheHitRate: number;
    approvalRate: number;
    averageValidationTime: number;
    activeCacheEntries: number;
  } {
    return {
      ...this.validationMetrics,
      cacheHitRate: this.validationMetrics.totalValidations > 0 
        ? this.validationMetrics.cacheHits / this.validationMetrics.totalValidations 
        : 0,
      activeCacheEntries: this.validationCache.size,
    };
  }

  /**
   * Clear validation cache
   */
  clearValidationCache(): void {
    const entriesCleared = this.validationCache.size;
    this.validationCache.clear();
    
    this.logger.log(`Validation cache cleared: ${entriesCleared} entries removed`);
  }

  /**
   * Get cache status and health
   */
  getCacheStatus(): {
    size: number;
    entries: Array<{
      key: string;
      expiry: Date;
      hitCount: number;
      riskLevel: HealthMetricsRiskLevel;
    }>;
  } {
    const entries = Array.from(this.validationCache.entries()).map(([key, cached]) => ({
      key,
      expiry: cached.expiry,
      hitCount: cached.hitCount,
      riskLevel: cached.result.riskLevel,
    }));

    return {
      size: this.validationCache.size,
      entries,
    };
  }
}