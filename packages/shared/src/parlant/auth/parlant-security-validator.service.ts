/**
 * PARLANT Security Validator Service
 *
 * Comprehensive security validation framework for Parlant Phase 1 integration
 * including risk assessment, conversational validation requirements, and
 * enterprise-grade security monitoring with sub-1000ms performance targets.
 *
 * @author Claude Code (AIgent Integration Specialist)
 * @version 1.0.0
 * @priority HIGH - Security validation for Parlant operations
 */

import { Injectable, Logger } from '@nestjs/common';
import { ParlantContext, RiskAssessment } from './parlant-jwt-bridge.service';

export interface SecurityValidationRequest {
  operation: string;
  userId: string;
  sessionId: string;
  conversationId: string;
  parameters?: Record<string, any>;
  context: ParlantContext;
  timestamp: Date;
}

export interface SecurityValidationResult {
  approved: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  validationMethod: 'automatic' | 'conversational' | 'manual';
  confidence: number;
  reason?: string;
  additionalChecks?: string[];
  validationTime: number; // milliseconds
  auditTrail: SecurityAuditEntry[];
}

export interface SecurityAuditEntry {
  timestamp: Date;
  action: string;
  userId: string;
  sessionId: string;
  conversationId: string;
  riskLevel: string;
  decision: 'approved' | 'denied' | 'escalated';
  reason: string;
  validationTime: number;
  metadata?: Record<string, any>;
}

export interface SecurityPolicy {
  operation: string;
  minimumSecurityLevel: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  requiresConversationalValidation: boolean;
  requiresMFA: boolean;
  allowedTimeWindows?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
  }[];
  allowedRoles?: string[];
  riskFactors: {
    weight: number;
    factor: string;
    threshold?: number;
  }[];
}

@Injectable()
export class ParlantSecurityValidator {
  private readonly logger = new Logger(ParlantSecurityValidator.name);
  private readonly auditTrail: SecurityAuditEntry[] = [];
  private readonly validationCache = new Map<string, SecurityValidationResult>();

  // Security policies for different operations
  private readonly securityPolicies: Map<string, SecurityPolicy> = new Map([
    ['database.write', {
      operation: 'database.write',
      minimumSecurityLevel: 'MODERATE',
      requiresConversationalValidation: true,
      requiresMFA: true,
      allowedRoles: ['admin', 'user', 'operator'],
      riskFactors: [
        { weight: 0.3, factor: 'off_hours_access' },
        { weight: 0.4, factor: 'administrative_operation' },
        { weight: 0.2, factor: 'bulk_operation' },
        { weight: 0.1, factor: 'new_device' }
      ]
    }],
    ['database.read', {
      operation: 'database.read',
      minimumSecurityLevel: 'LOW',
      requiresConversationalValidation: false,
      requiresMFA: false,
      allowedRoles: ['admin', 'user', 'operator', 'viewer'],
      riskFactors: [
        { weight: 0.2, factor: 'sensitive_data_access' },
        { weight: 0.1, factor: 'bulk_operation' }
      ]
    }],
    ['system.admin', {
      operation: 'system.admin',
      minimumSecurityLevel: 'CRITICAL',
      requiresConversationalValidation: true,
      requiresMFA: true,
      allowedTimeWindows: [
        { start: '08:00', end: '18:00' }
      ],
      allowedRoles: ['admin'],
      riskFactors: [
        { weight: 0.5, factor: 'administrative_operation' },
        { weight: 0.3, factor: 'system_modification' },
        { weight: 0.2, factor: 'off_hours_access' }
      ]
    }],
    ['parlant.conversation', {
      operation: 'parlant.conversation',
      minimumSecurityLevel: 'LOW',
      requiresConversationalValidation: false,
      requiresMFA: false,
      allowedRoles: ['admin', 'user', 'operator', 'viewer'],
      riskFactors: [
        { weight: 0.1, factor: 'bulk_operation' }
      ]
    }]
  ]);

  constructor() {
    this.logger.log('PARLANT Security Validator initialized with enterprise policies');
  }

  /**
   * Primary security validation method
   */
  async validateOperation(request: SecurityValidationRequest): Promise<SecurityValidationResult> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Validating operation: ${request.operation} for user: ${request.userId}`);

      // Step 1: Get security policy for operation
      const policy = this.getSecurityPolicy(request.operation);

      // Step 2: Perform risk assessment
      const riskAssessment = await this.assessOperationRisk(request, policy);

      // Step 3: Apply security validations
      const validationResult = await this.applySecurityValidations(request, riskAssessment, policy);

      // Step 4: Create audit trail entry
      const auditEntry = this.createAuditEntry(request, validationResult, Date.now() - startTime);
      this.auditTrail.push(auditEntry);

      // Step 5: Cache result for performance
      const cacheKey = this.generateCacheKey(request);
      this.validationCache.set(cacheKey, validationResult);

      this.logger.debug(`Validation completed in ${validationResult.validationTime}ms: ${validationResult.approved ? 'APPROVED' : 'DENIED'}`);

      return validationResult;

    } catch (error) {
      this.logger.error(`Security validation failed for operation: ${request.operation}`, error);

      const failureResult: SecurityValidationResult = {
        approved: false,
        riskLevel: 'CRITICAL',
        validationMethod: 'automatic',
        confidence: 0,
        reason: 'Validation system error',
        validationTime: Date.now() - startTime,
        auditTrail: []
      };

      return failureResult;
    }
  }

  /**
   * Get security policy for operation (with fallback to default)
   */
  private getSecurityPolicy(operation: string): SecurityPolicy {
    const policy = this.securityPolicies.get(operation);

    if (policy) {
      return policy;
    }

    // Return default restrictive policy for unknown operations
    return {
      operation,
      minimumSecurityLevel: 'HIGH',
      requiresConversationalValidation: true,
      requiresMFA: true,
      allowedRoles: ['admin'],
      riskFactors: [
        { weight: 0.5, factor: 'unknown_operation' },
        { weight: 0.3, factor: 'administrative_operation' },
        { weight: 0.2, factor: 'system_modification' }
      ]
    };
  }

  /**
   * Assess risk level for the operation
   */
  private async assessOperationRisk(
    request: SecurityValidationRequest,
    policy: SecurityPolicy
  ): Promise<RiskAssessment> {
    let riskScore = 0;
    const factors: string[] = [];

    // Calculate risk based on policy factors
    for (const riskFactor of policy.riskFactors) {
      const factorValue = await this.evaluateRiskFactor(riskFactor.factor, request);
      riskScore += factorValue * riskFactor.weight;

      if (factorValue > 0.5) {
        factors.push(riskFactor.factor);
      }
    }

    // Determine risk level
    let riskLevel: RiskAssessment['riskLevel'];
    if (riskScore >= 0.8) {
      riskLevel = 'CRITICAL';
    } else if (riskScore >= 0.6) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 0.4) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    const requiresConversation = policy.requiresConversationalValidation || riskLevel === 'HIGH' || riskLevel === 'CRITICAL';

    return {
      riskLevel,
      requiresConversation,
      confidence: Math.min(1.0, 0.7 + (0.3 * factors.length / policy.riskFactors.length)),
      factors
    };
  }

  /**
   * Evaluate individual risk factor
   */
  private async evaluateRiskFactor(factor: string, request: SecurityValidationRequest): Promise<number> {
    switch (factor) {
      case 'off_hours_access':
        return this.evaluateOffHoursAccess();

      case 'administrative_operation':
        return this.evaluateAdministrativeOperation(request);

      case 'bulk_operation':
        return this.evaluateBulkOperation(request);

      case 'new_device':
        return this.evaluateNewDevice(request);

      case 'sensitive_data_access':
        return this.evaluateSensitiveDataAccess(request);

      case 'system_modification':
        return this.evaluateSystemModification(request);

      case 'unknown_operation':
        return 0.8; // High risk for unknown operations

      default:
        this.logger.warn(`Unknown risk factor: ${factor}`);
        return 0.3; // Moderate risk for unknown factors
    }
  }

  /**
   * Risk factor evaluation methods
   */
  private evaluateOffHoursAccess(): number {
    const hour = new Date().getHours();
    return (hour < 8 || hour > 18) ? 0.7 : 0.1;
  }

  private evaluateAdministrativeOperation(request: SecurityValidationRequest): number {
    const adminOperations = ['system.admin', 'database.admin', 'user.admin'];
    return adminOperations.some(op => request.operation.includes(op)) ? 0.8 : 0.2;
  }

  private evaluateBulkOperation(request: SecurityValidationRequest): number {
    const params = request.parameters || {};
    const isBulk = params.batch || params.bulk || (params.limit && params.limit > 100);
    return isBulk ? 0.6 : 0.1;
  }

  private evaluateNewDevice(request: SecurityValidationRequest): number {
    // In production, this would check device fingerprinting data
    return 0.3; // Moderate risk assumption
  }

  private evaluateSensitiveDataAccess(request: SecurityValidationRequest): number {
    const sensitiveOperations = ['user.personal', 'payment', 'credential'];
    return sensitiveOperations.some(op => request.operation.includes(op)) ? 0.7 : 0.2;
  }

  private evaluateSystemModification(request: SecurityValidationRequest): number {
    const systemOps = ['config.update', 'system.restart', 'database.migrate'];
    return systemOps.some(op => request.operation.includes(op)) ? 0.9 : 0.1;
  }

  /**
   * Apply security validations based on risk assessment
   */
  private async applySecurityValidations(
    request: SecurityValidationRequest,
    riskAssessment: RiskAssessment,
    policy: SecurityPolicy
  ): Promise<SecurityValidationResult> {
    const additionalChecks: string[] = [];
    let approved = true;
    let reason = '';
    let validationMethod: SecurityValidationResult['validationMethod'] = 'automatic';

    // Check time windows
    if (policy.allowedTimeWindows && !this.isWithinAllowedTimeWindow(policy.allowedTimeWindows)) {
      approved = false;
      reason = 'Operation not allowed during current time window';
      additionalChecks.push('time_window_check');
    }

    // Check role permissions
    if (policy.allowedRoles && !this.hasAllowedRole(request, policy.allowedRoles)) {
      approved = false;
      reason = 'Insufficient role permissions';
      additionalChecks.push('role_permission_check');
    }

    // Check if conversational validation is needed
    if (riskAssessment.requiresConversation && approved) {
      validationMethod = 'conversational';
      additionalChecks.push('conversational_validation');

      // Simulate conversational validation for Phase 1
      const conversationalResult = await this.simulateConversationalValidation(request, riskAssessment);
      approved = conversationalResult.approved;
      reason = conversationalResult.reason || '';
    }

    return {
      approved,
      riskLevel: riskAssessment.riskLevel,
      validationMethod,
      confidence: riskAssessment.confidence,
      reason,
      additionalChecks,
      validationTime: Date.now() - request.timestamp.getTime(),
      auditTrail: []
    };
  }

  /**
   * Check if current time is within allowed windows
   */
  private isWithinAllowedTimeWindow(allowedWindows: { start: string; end: string }[]): boolean {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return allowedWindows.some(window => currentTime >= window.start && currentTime <= window.end);
  }

  /**
   * Check if user has allowed role
   */
  private hasAllowedRole(request: SecurityValidationRequest, allowedRoles: string[]): boolean {
    // In production, this would extract role from JWT token or session
    // For Phase 1, we assume user role from context
    const userRole = request.context.metadata?.role || 'user';
    return allowedRoles.includes(userRole);
  }

  /**
   * Simulate conversational validation (Phase 1 implementation)
   */
  private async simulateConversationalValidation(
    request: SecurityValidationRequest,
    riskAssessment: RiskAssessment
  ): Promise<{ approved: boolean; reason?: string }> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    // For Phase 1, approve with logging
    this.logger.debug(`Conversational validation simulated for ${request.operation} with ${riskAssessment.riskLevel} risk`);

    return {
      approved: true,
      reason: 'Conversational validation completed (Phase 1 simulation)'
    };
  }

  /**
   * Create audit trail entry
   */
  private createAuditEntry(
    request: SecurityValidationRequest,
    result: SecurityValidationResult,
    validationTime: number
  ): SecurityAuditEntry {
    return {
      timestamp: new Date(),
      action: request.operation,
      userId: request.userId,
      sessionId: request.sessionId,
      conversationId: request.conversationId,
      riskLevel: result.riskLevel,
      decision: result.approved ? 'approved' : 'denied',
      reason: result.reason || `${result.validationMethod} validation`,
      validationTime,
      metadata: {
        confidence: result.confidence,
        additionalChecks: result.additionalChecks,
        parameters: request.parameters
      }
    };
  }

  /**
   * Generate cache key for validation result
   */
  private generateCacheKey(request: SecurityValidationRequest): string {
    const params = JSON.stringify(request.parameters || {});
    return `${request.operation}:${request.userId}:${Buffer.from(params).toString('base64')}`;
  }

  /**
   * Get audit trail (filtered by user/operation if specified)
   */
  getAuditTrail(filters?: {
    userId?: string;
    operation?: string;
    startDate?: Date;
    endDate?: Date;
  }): SecurityAuditEntry[] {
    let filteredTrail = [...this.auditTrail];

    if (filters?.userId) {
      filteredTrail = filteredTrail.filter(entry => entry.userId === filters.userId);
    }

    if (filters?.operation) {
      filteredTrail = filteredTrail.filter(entry => entry.action === filters.operation);
    }

    if (filters?.startDate) {
      filteredTrail = filteredTrail.filter(entry => entry.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      filteredTrail = filteredTrail.filter(entry => entry.timestamp <= filters.endDate!);
    }

    return filteredTrail.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Health check for security validator
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: {
      totalValidations: number;
      approvalRate: number;
      averageValidationTime: number;
      cacheSize: number;
      auditTrailSize: number;
    }
  }> {
    try {
      const totalValidations = this.auditTrail.length;
      const approvals = this.auditTrail.filter(entry => entry.decision === 'approved').length;
      const approvalRate = totalValidations > 0 ? approvals / totalValidations : 0;
      const avgValidationTime = totalValidations > 0
        ? this.auditTrail.reduce((sum, entry) => sum + entry.validationTime, 0) / totalValidations
        : 0;

      return {
        status: 'healthy',
        metrics: {
          totalValidations,
          approvalRate,
          averageValidationTime: avgValidationTime,
          cacheSize: this.validationCache.size,
          auditTrailSize: this.auditTrail.length
        }
      };
    } catch (error) {
      this.logger.error('Security Validator health check failed', error);
      return {
        status: 'unhealthy',
        metrics: {
          totalValidations: 0,
          approvalRate: 0,
          averageValidationTime: 0,
          cacheSize: 0,
          auditTrailSize: 0
        }
      };
    }
  }
}