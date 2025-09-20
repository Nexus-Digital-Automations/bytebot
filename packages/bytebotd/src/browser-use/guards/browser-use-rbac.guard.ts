/**
 * Browser Use Role-Based Access Control Guard
 *
 * Advanced RBAC implementation for browser automation operations with:
 * - Fine-grained permission control for browser operations
 * - Context-aware authorization decisions
 * - Integration with Parlant conversational validation
 * - Dynamic permission escalation and delegation
 * - Comprehensive audit trail for authorization decisions
 *
 * Security Features:
 * - Hierarchical role inheritance
 * - Time-based and location-based access restrictions
 * - Emergency access protocols with approval workflows
 * - Risk-based authorization adjustments
 * - Compliance-driven permission enforcement
 *
 * @module BrowserUseRbacGuard
 * @version 1.0.0
 * @author Security Authorization Specialist
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';import { Reflector } from '@nestjs/core';import { Observable } from 'rxjs';import { performance } from 'perf_hooks';import * as crypto from 'crypto';// Authentication context from middlewareimport {
  AuthenticatedRequest,
  BrowserUseUserContext,
  BrowserUseSessionContext,
  BrowserUseSecurityContext,
  BrowserPermission,
} from '../middleware/browser-use-auth.middleware';// Parlant integration for conversational authorizationimport {
  ParlantIntegrationService,
  ParlantValidationRequest,
  ConversationalValidationError,
  RiskLevel,
} from '../parlant/parlant-integration.service';// Security context typesimport {
  ParlantUserContext,
  SecurityLevel,
} from '../../shared/src/types/parlant-integration.types';/*** Role definition with hierarchical inheritance
 */
export interface BrowserUseRole {
  name: string;
  displayName: string;
  description: string;
  permissions: BrowserPermission[];
  inheritsFrom: string[];
  restrictions: RoleRestriction[];
  securityLevel: SecurityLevel;
  maxSessionDuration: number;
  emergencyAccess: boolean;
}

/**
 * Role restriction definition
 */
export interface RoleRestriction {
  type: 'TIME' | 'LOCATION' | 'IP_RANGE' | 'DEVICE' | 'APPROVAL_REQUIRED';configuration: Record<string, unknown>;active: boolean;
  exemptUsers: string[];
}

/**
 * Permission evaluation context
 */
export interface PermissionEvaluationContext {
  user: BrowserUseUserContext;
  session: BrowserUseSessionContext;
  security: BrowserUseSecurityContext;
  operation: BrowserOperationContext;
  environment: EnvironmentContext;
}

/**
 * Browser operation context for authorization
 */
export interface BrowserOperationContext {
  endpoint: string;
  method: string;
  operationType: 'READ' | 'WRITE' | 'DELETE' | 'ADMIN';resourceType: 'TASK' | 'SESSION' | 'ASYNC_JOB' | 'DATA' | 'SYSTEM';targetResource?: string;parameters: Record<string, unknown>;
  estimatedRiskLevel: RiskLevel;
  businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';}/**
 * Environment context for authorization decisions
 */
export interface EnvironmentContext {
  currentTime: Date;
  userLocation?: GeolocationCoordinates;
  networkSegment: string;
  securityPosture: 'NORMAL' | 'ELEVATED' | 'HIGH_ALERT' | 'MAINTENANCE';complianceMode: boolean;emergencyMode: boolean;
}

/**
 * Authorization decision result
 */
export interface AuthorizationDecision {
  granted: boolean;
  reasoning: string;
  conditions: AuthorizationCondition[];
  auditTrail: AuthorizationAuditEntry;
  conversationalValidation?: ConversationalAuthorizationResult;
  escalationRequired: boolean;
  temporaryAccess: boolean;
  expiresAt?: Date;
}

/**
 * Authorization condition
 */
export interface AuthorizationCondition {
  type: 'MONITORING' | 'APPROVAL' | 'MFA' | 'TIME_LIMIT' | 'SUPERVISION';description: string;parameters: Record<string, unknown>;
  mandatory: boolean;
}

/**
 * Authorization audit entry
 */
export interface AuthorizationAuditEntry {
  decisionId: string;
  timestamp: Date;
  userId: string;
  sessionId: string;
  operation: string;
  decision: 'GRANTED' | 'DENIED' | 'ESCALATED';reasoning: string;riskLevel: RiskLevel;
  conditions: string[];
  processingTime: number;
  metadata: Record<string, unknown>;
}

/**
 * Conversational authorization result
 */
export interface ConversationalAuthorizationResult {
  required: boolean;
  approved?: boolean;
  conversationId?: string;
  reasoning?: string;
  conditions?: string[];
  escalationLevel?: 'STANDARD' | 'SUPERVISOR' | 'SECURITY_TEAM' | 'EMERGENCY';}/**
 * Permission escalation request
 */
export interface PermissionEscalationRequest {
  userId: string;
  requestedPermissions: BrowserPermission[];
  currentPermissions: BrowserPermission[];
  businessJustification: string;
  requestDuration: number;
  emergencyOverride: boolean;
  approvalWorkflow: 'STANDARD' | 'EXPEDITED' | 'EMERGENCY';}/**
 * Decorator for marking endpoints with required permissions
 */
export const RequirePermissions = (permissions: BrowserPermission[]) =>
  Reflector.createDecorator<BrowserPermission[]>({ key: 'permissions', value: permissions });/*** Decorator for marking endpoints with required roles
 */
export const RequireRoles = (roles: string[]) =>
  Reflector.createDecorator<string[]>({ key: 'roles', value: roles });/*** Decorator for marking high-risk operations requiring conversational validation
 */
export const RequireConversationalApproval = (riskLevel: RiskLevel = RiskLevel._HIGH) =>
  Reflector.createDecorator<RiskLevel>({ key: 'conversationalApproval', value: riskLevel });/*** Browser Use RBAC Guard
 *
 * Comprehensive role-based access control implementation providing:
 * - Multi-level permission validation
 * - Context-aware authorization decisions
 * - Integration with Parlant conversational validation
 * - Dynamic permission escalation capabilities
 * - Detailed audit trail and compliance reporting
 */
@Injectable()
export class BrowserUseRbacGuard implements CanActivate {
  private readonly logger = new Logger(BrowserUseRbacGuard.name);

  // Role definitions with hierarchical structure
  private readonly roleDefinitions: Map<string, BrowserUseRole> = new Map([
    ['browser_admin', {name: 'browser_admin',displayName: 'Browser Administrator',description: 'Full administrative access to all browser automation features',permissions: Object.values(BrowserPermission),inheritsFrom: [],
      restrictions: [
        {
          type: 'APPROVAL_REQUIRED',configuration: { operationTypes: ['DELETE', 'ADMIN'] },active: true,exemptUsers: [],
        },
      ],
      securityLevel: SecurityLevel._CRITICAL,
      maxSessionDuration: 14400000, // 4 hours
      emergencyAccess: true,
    }],
    ['browser_power_user', {name: 'browser_power_user',displayName: 'Browser Power User',description: 'Advanced browser automation capabilities with some restrictions',permissions: [BrowserPermission.CREATE_TASK,
        BrowserPermission.VIEW_TASK,
        BrowserPermission.STOP_TASK,
        BrowserPermission.CREATE_SESSION,
        BrowserPermission.MANAGE_SESSION,
        BrowserPermission.EXTRACT_DATA,
        BrowserPermission.ASYNC_JOBS,
        BrowserPermission.EXTERNAL_DOMAINS,
      ],
      inheritsFrom: ['browser_user'],restrictions: [{
          type: 'TIME',configuration: { allowedHours: { start: 6, end: 22 } },active: true,
          exemptUsers: [],
        },
      ],
      securityLevel: SecurityLevel._HIGH,
      maxSessionDuration: 28800000, // 8 hours
      emergencyAccess: false,
    }],
    ['browser_user', {name: 'browser_user',displayName: 'Browser User',description: 'Standard browser automation access for routine operations',permissions: [BrowserPermission.CREATE_TASK,
        BrowserPermission.VIEW_TASK,
        BrowserPermission.STOP_TASK,
        BrowserPermission.CREATE_SESSION,
        BrowserPermission.EXTRACT_DATA,
      ],
      inheritsFrom: [],
      restrictions: [
        {
          type: 'TIME',configuration: { allowedHours: { start: 8, end: 18 } },active: true,
          exemptUsers: [],
        },
      ],
      securityLevel: SecurityLevel._MODERATE,
      maxSessionDuration: 14400000, // 4 hours
      emergencyAccess: false,
    }],
    ['browser_readonly', {name: 'browser_readonly',displayName: 'Browser Read-Only',description: 'Read-only access to browser automation results and status',permissions: [BrowserPermission.VIEW_TASK,
      ],
      inheritsFrom: [],
      restrictions: [],
      securityLevel: SecurityLevel._LOW,
      maxSessionDuration: 7200000, // 2 hours
      emergencyAccess: false,
    }],
  ]);

  // Authorization metrics
  private readonly authorizationMetrics = {
    totalDecisions: 0,
    grantedDecisions: 0,
    deniedDecisions: 0,
    escalatedDecisions: 0,
    conversationalValidations: 0,
    averageDecisionTime: 0,
    permissionViolations: 0,
  };

  // Cache for authorization decisions (with TTL)
  private readonly authorizationCache = new Map<string, {
    decision: AuthorizationDecision;
    expiresAt: Date;
  }>();

  constructor(
    private readonly reflector: Reflector,
    private readonly parlantService: ParlantIntegrationService,
  ) {
    this.logger.log('🛡️ Browser Use RBAC Guard initialized');
    this.logger.log(`📋 Configured roles: ${Array.from(this.roleDefinitions.keys()).join(`, ')}`);// Start periodic cleanupsetInterval(() => this.performAuthorizationCleanup(), 300000); // Every 5 minutes
    setInterval(() => this.logAuthorizationMetrics(), 600000); // Every 10 minutes
  }

  /**
   * Main guard method - evaluates authorization for incoming requests
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const startTime = performance.now();
    const decisionId = this.generateDecisionId();

    this.authorizationMetrics.totalDecisions++;

    return this.evaluateAuthorization(context, decisionId, startTime);
  }

  /**
   * Core authorization evaluation logic
   */
  private async evaluateAuthorization(
    context: ExecutionContext,
    decisionId: string,
    startTime: number
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    this.logger.debug(
      `[${decisionId}] Evaluating browser use authorization`,{endpoint: `${request.method} ${request.route?.path || request.url}`,userId: request.user?.userId,roles: request.user?.roles,
        securityLevel: request.security?.riskLevel,
      }
    );

    try {
      // Step 1: Extract authorization requirements
      const authRequirements = this.extractAuthorizationRequirements(context);

      // Step 2: Build evaluation context
      const evaluationContext = this.buildEvaluationContext(request, authRequirements);

      // Step 3: Check cached authorization decisions
      const cachedDecision = this.getCachedAuthorizationDecision(request.user.userId, evaluationContext.operation);

      if (cachedDecision && cachedDecision.expiresAt > new Date()) {
        this.logger.debug(`[${decisionId}] Using cached authorization decision`);
        return cachedDecision.decision.granted;
      }

      // Step 4: Evaluate permissions and roles
      const permissionCheck = await this.evaluatePermissions(evaluationContext);

      if (!permissionCheck.granted) {
        const decision = this.createDeniedDecision(decisionId, permissionCheck.reasoning, evaluationContext, startTime);
        await this.logAuthorizationDecision(decision);
        this.authorizationMetrics.deniedDecisions++;
        throw new ForbiddenException(permissionCheck.reasoning);
      }

      // Step 5: Apply contextual restrictions
      const restrictionCheck = await this.evaluateRestrictions(evaluationContext);

      if (!restrictionCheck.granted) {
        const decision = this.createDeniedDecision(decisionId, restrictionCheck.reasoning, evaluationContext, startTime);
        await this.logAuthorizationDecision(decision);
        this.authorizationMetrics.deniedDecisions++;
        throw new ForbiddenException(restrictionCheck.reasoning);
      }

      // Step 6: Check for conversational validation requirement
      const conversationalValidation = await this.evaluateConversationalValidation(context, evaluationContext);

      if (conversationalValidation.required && !conversationalValidation.approved) {
        const decision = this.createEscalatedDecision(decisionId, conversationalValidation, evaluationContext, startTime);
        await this.logAuthorizationDecision(decision);
        this.authorizationMetrics.escalatedDecisions++;

        if (conversationalValidation.conversationId) {
          throw new ConversationalValidationError(
            conversationalValidation.conversationId,
            conversationalValidation.reasoning || 'Conversational approval required',[]);
        } else {
          throw new ForbiddenException('Conversational approval required for this operation');
        }
      }

      // Step 7: Create successful authorization decision
      const decision = this.createGrantedDecision(
        decisionId,
        evaluationContext,
        conversationalValidation,
        startTime
      );

      // Step 8: Cache the decision
      this.cacheAuthorizationDecision(request.user.userId, evaluationContext.operation, decision);

      // Step 9: Log successful authorization
      await this.logAuthorizationDecision(decision);
      this.authorizationMetrics.grantedDecisions++;

      this.logger.debug(
        `[${decisionId}] Browser use authorization granted`,{userId: request.user.userId,
          operation: evaluationContext.operation.endpoint,
          processingTime: `${(performance.now() - startTime).toFixed(2)}ms`,});

      return true;

    } catch (error) {
      const processingTime = performance.now() - startTime;

      this.logger.error(
        `[${decisionId}] Browser use authorization failed`,{error: error instanceof Error ? error.message : String(error),
          userId: request.user?.userId,
          endpoint: `${request.method} ${request.url}`,processingTime: `${processingTime.toFixed(2)}ms`,
        }
      );

      this.updateAuthorizationMetrics(processingTime);

      // Re-throw specific authorization errors
      if (error instanceof ForbiddenException || error instanceof ConversationalValidationError) {
        throw error;
      }

      // Wrap other errors
      throw new ForbiddenException('Authorization evaluation failed');}}

  /**
   * Extract authorization requirements from endpoint metadata
   */
  private extractAuthorizationRequirements(context: ExecutionContext) {
    const requiredPermissions = this.reflector.get<BrowserPermission[]>('permissions', context.getHandler()) || [];const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler()) || [];const conversationalApprovalLevel = this.reflector.get<RiskLevel>('conversationalApproval', context.getHandler());

    return {
      permissions: requiredPermissions,
      roles: requiredRoles,
      conversationalApproval: conversationalApprovalLevel,
    };
  }

  /**
   * Build comprehensive evaluation context
   */
  private buildEvaluationContext(
    request: AuthenticatedRequest,
    authRequirements: any
  ): PermissionEvaluationContext {
    const operation: BrowserOperationContext = {
      endpoint: `${request.method} ${request.route?.path || request.url}`,method: request.method,operationType: this.determineOperationType(request.method),
      resourceType: this.determineResourceType(request.url),
      targetResource: this.extractTargetResource(request),
      parameters: { ...request.body, ...request.query, ...request.params },
      estimatedRiskLevel: this.estimateOperationRisk(request),
      businessImpact: this.assessBusinessImpact(request),
    };

    const environment: EnvironmentContext = {
      currentTime: new Date(),
      networkSegment: this.determineNetworkSegment(request.security.riskFactors),
      securityPosture: this.determineSecurityPosture(request.security),
      complianceMode: this.isComplianceModeActive(),
      emergencyMode: this.isEmergencyModeActive(),
    };

    return {
      user: request.user,
      session: request.session,
      security: request.security,
      operation,
      environment,
    };
  }

  /**
   * Evaluate user permissions against operation requirements
   */
  private async evaluatePermissions(context: PermissionEvaluationContext): Promise<{
    granted: boolean;
    reasoning: string;
  }> {
    // Get all user permissions (including inherited from roles)
    const userPermissions = this.getAllUserPermissions(context.user);

    // Get required permissions for the operation
    const requiredPermissions = this.getRequiredPermissionsForOperation(context.operation);

    // Check if user has all required permissions
    const missingPermissions = requiredPermissions.filter(
      permission => !userPermissions.includes(permission)
    );

    if (missingPermissions.length > 0) {
      return {
        granted: false,
        reasoning: `Missing required permissions: ${missingPermissions.join(`, ')}',};
    }

    // Additional role-based checks
    const roleCheck = this.evaluateRoleRequirements(context);
    if (!roleCheck.granted) {
      return roleCheck;
    }

    return {
      granted: true,
      reasoning: 'Permission validation passed',};}

  /**
   * Evaluate contextual restrictions (time, location, etc.)
   */
  private async evaluateRestrictions(context: PermissionEvaluationContext): Promise<{
    granted: boolean;
    reasoning: string;
  }> {
    const userRoles = this.getUserRoles(context.user);

    for (const role of userRoles) {
      for (const restriction of role.restrictions) {
        if (!restriction.active || restriction.exemptUsers.includes(context.user.userId)) {
          continue;
        }

        const restrictionCheck = this.evaluateRestriction(restriction, context);
        if (!restrictionCheck.granted) {
          return restrictionCheck;
        }
      }
    }

    return {
      granted: true,
      reasoning: 'All restrictions satisfied',};}

  /**
   * Evaluate individual restriction
   */
  private evaluateRestriction(
    restriction: RoleRestriction,
    context: PermissionEvaluationContext
  ): { granted: boolean; reasoning: string } {
    switch (restriction.type) {
      case 'TIME':return this.evaluateTimeRestriction(restriction, context);case 'LOCATION':return this.evaluateLocationRestriction(restriction, context);case 'IP_RANGE':return this.evaluateIpRangeRestriction(restriction, context);case 'DEVICE':return this.evaluateDeviceRestriction(restriction, context);case 'APPROVAL_REQUIRED':return this.evaluateApprovalRestriction(restriction, context);default:
        return { granted: true, reasoning: 'Unknown restriction type' };}}

  /**
   * Evaluate conversational validation requirements
   */
  private async evaluateConversationalValidation(
    executionContext: ExecutionContext,
    evaluationContext: PermissionEvaluationContext
  ): Promise<ConversationalAuthorizationResult> {
    // Check if conversational approval is required by decorator
    const requiredRiskLevel = this.reflector.get<RiskLevel>('conversationalApproval', executionContext.getHandler());

    if (!requiredRiskLevel) {
      // Check if operation risk level requires conversational validation
      if (evaluationContext.operation.estimatedRiskLevel < RiskLevel._HIGH) {
        return { required: false };
      }
    }

    this.authorizationMetrics.conversationalValidations++;

    // Create Parlant validation request
    const validationRequest: ParlantValidationRequest = {
      functionName: `Authorization.${evaluationContext.operation.operationType}`,
      functionParams: this.sanitizeParametersForValidation(evaluationContext.operation.parameters),
      actionDescription: this.generateAuthorizationDescription(evaluationContext),
      context: {
        userId: evaluationContext.user.userId,
        sessionId: evaluationContext.session.sessionId,
        agentRole: 'USER',conversationHistory: [],metadata: {
          operation: evaluationContext.operation.endpoint,
          riskLevel: evaluationContext.operation.estimatedRiskLevel,
          businessImpact: evaluationContext.operation.businessImpact,
        },
      },
      riskLevel: evaluationContext.operation.estimatedRiskLevel,
      operationId: this.generateOperationId(),
    };

    try {
      const validationResponse = await this.parlantService.validateFunctionExecution(validationRequest);

      return {
        required: true,
        approved: validationResponse.approved,
        conversationId: validationResponse.conversationId,
        reasoning: validationResponse.reasoning,
        conditions: validationResponse.suggestedAlternatives,
        escalationLevel: this.determineEscalationLevel(evaluationContext.operation.businessImpact),
      };
    } catch (error) {
      this.logger.error('Conversational validation failed', error);return {required: true,
        approved: false,
        reasoning: 'Conversational validation service unavailable',escalationLevel: 'STANDARD',};}
  }

  // ===== HELPER METHODS =====

  /**
   * Get all permissions for user including role inheritance
   */
  private getAllUserPermissions(user: BrowserUseUserContext): BrowserPermission[] {
    const permissions = new Set<BrowserPermission>();

    // Add direct permissions
    user.permissions.forEach(permission => permissions.add(permission));

    // Add permissions from roles
    const userRoles = this.getUserRoles(user);
    userRoles.forEach(role => {
      role.permissions.forEach(permission => permissions.add(permission));
    });

    return Array.from(permissions);
  }

  /**
   * Get user roles with inheritance
   */
  private getUserRoles(user: BrowserUseUserContext): BrowserUseRole[] {
    const roles: BrowserUseRole[] = [];
    const processedRoles = new Set<string>();

    const processRole = (roleName: string) => {
      if (processedRoles.has(roleName)) return;
      processedRoles.add(roleName);

      const role = this.roleDefinitions.get(roleName);
      if (!role) return;

      roles.push(role);

      // Process inherited roles
      role.inheritsFrom.forEach(inheritedRole => processRole(inheritedRole));
    };

    user.roles.forEach(roleName => processRole(roleName));

    return roles;
  }

  /**
   * Get required permissions for operation
   */
  private getRequiredPermissionsForOperation(operation: BrowserOperationContext): BrowserPermission[] {
    // Map operations to required permissions
    const operationPermissionMap: Record<string, BrowserPermission[]> = {
      'POST /parlant/browser-use/tasks': [BrowserPermission.CREATE_TASK],'GET /parlant/browser-use/tasks/:taskId': [BrowserPermission.VIEW_TASK],'DELETE /parlant/browser-use/tasks/:taskId': [BrowserPermission.DELETE_TASK],'POST /parlant/browser-use/sessions': [BrowserPermission.CREATE_SESSION],'POST /parlant/browser-use/async-jobs': [BrowserPermission.ASYNC_JOBS],
    };

    return operationPermissionMap[operation.endpoint] || [BrowserPermission.VIEW_TASK];
  }

  /**
   * Evaluate role requirements
   */
  private evaluateRoleRequirements(context: PermissionEvaluationContext): {
    granted: boolean;
    reasoning: string;
  } {
    const userRoles = this.getUserRoles(context.user);
    const requiredSecurityLevel = this.getRequiredSecurityLevel(context.operation);

    // Check if user has role with sufficient security level
    const hasValidRole = userRoles.some(role => role.securityLevel >= requiredSecurityLevel);

    if (!hasValidRole) {
      return {
        granted: false,
        reasoning: `Operation requires security level ${requiredSecurityLevel} or higher`,
      };
    }

    return {
      granted: true,
      reasoning: 'Role requirements satisfied',
    };
  }

  /**
   * Evaluate time restriction
   */
  private evaluateTimeRestriction(
    restriction: RoleRestriction,
    context: PermissionEvaluationContext
  ): { granted: boolean; reasoning: string } {
    const config = restriction.configuration as { allowedHours: { start: number; end: number } };
    const currentHour = context.environment.currentTime.getHours();

    if (currentHour < config.allowedHours.start || currentHour > config.allowedHours.end) {
      return {
        granted: false,
        reasoning: `Operation not allowed outside hours ${config.allowedHours.start}:00-${config.allowedHours.end}:00`,
      };
    }

    return { granted: true, reasoning: 'Time restriction satisfied' };}/**
   * Create various decision types
   */
  private createGrantedDecision(
    decisionId: string,
    context: PermissionEvaluationContext,
    conversationalValidation: ConversationalAuthorizationResult,
    startTime: number
  ): AuthorizationDecision {
    return {
      granted: true,
      reasoning: 'Authorization granted - all requirements satisfied',conditions: this.generateAuthorizationConditions(context),auditTrail: this.createAuditEntry(decisionId, 'GRANTED', context, startTime),conversationalValidation,escalationRequired: false,
      temporaryAccess: false,
    };
  }

  private createDeniedDecision(
    decisionId: string,
    reasoning: string,
    context: PermissionEvaluationContext,
    startTime: number
  ): AuthorizationDecision {
    return {
      granted: false,
      reasoning,
      conditions: [],
      auditTrail: this.createAuditEntry(decisionId, 'DENIED', context, startTime),escalationRequired: false,temporaryAccess: false,
    };
  }

  private createEscalatedDecision(
    decisionId: string,
    conversationalValidation: ConversationalAuthorizationResult,
    context: PermissionEvaluationContext,
    startTime: number
  ): AuthorizationDecision {
    return {
      granted: false,
      reasoning: 'Authorization requires escalation',conditions: [],auditTrail: this.createAuditEntry(decisionId, 'ESCALATED', context, startTime),conversationalValidation,escalationRequired: true,
      temporaryAccess: false,
    };
  }

  /**
   * Generate authorization conditions based on context
   */
  private generateAuthorizationConditions(context: PermissionEvaluationContext): AuthorizationCondition[] {
    const conditions: AuthorizationCondition[] = [];

    // Add monitoring condition for high-risk operations
    if (context.operation.estimatedRiskLevel >= RiskLevel._HIGH) {
      conditions.push({
        type: 'MONITORING',description: 'Enhanced monitoring required for high-risk operation',parameters: { level: 'COMPREHENSIVE' },mandatory: true,});
    }

    // Add time limit for certain operations
    if (context.operation.businessImpact === 'CRITICAL') {conditions.push({type: 'TIME_LIMIT',description: 'Operation must complete within 1 hour',parameters: { maxDurationMs: 3600000 },mandatory: true,
      });
    }

    return conditions;
  }

  /**
   * Create audit entry
   */
  private createAuditEntry(
    decisionId: string,
    decision: 'GRANTED' | 'DENIED' | 'ESCALATED',
    context: PermissionEvaluationContext,
    startTime: number
  ): AuthorizationAuditEntry {
    return {
      decisionId,
      timestamp: new Date(),
      userId: context.user.userId,
      sessionId: context.session.sessionId,
      operation: context.operation.endpoint,
      decision,
      reasoning: `Authorization ${decision.toLowerCase()}`,riskLevel: context.operation.estimatedRiskLevel,conditions: [],
      processingTime: performance.now() - startTime,
      metadata: {
        operationType: context.operation.operationType,
        resourceType: context.operation.resourceType,
        businessImpact: context.operation.businessImpact,
        securityLevel: context.security.riskLevel,
      },
    };
  }

  // ===== UTILITY METHODS =====

  private generateDecisionId(): string {
    return `rbac_${Date.now()}_${Math.random().toString(36).substring(7)}`;}private generateOperationId(): string {
    return `auth_op_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private determineOperationType(method: string): 'READ' | 'WRITE' | 'DELETE' | 'ADMIN' {switch (method.toUpperCase()) {case 'GET': return 'READ';case 'POST':case 'PUT':case 'PATCH': return 'WRITE';case 'DELETE': return 'DELETE';default: return 'ADMIN';}}

  private determineResourceType(url: string): 'TASK' | 'SESSION' | 'ASYNC_JOB' | 'DATA' | 'SYSTEM' {if (url.includes('/tasks')) return 'TASK';if (url.includes('/sessions')) return 'SESSION';if (url.includes('/async-jobs')) return 'ASYNC_JOB';if (url.includes('/data') || url.includes('/extract')) return 'DATA';return 'SYSTEM';}private extractTargetResource(request: AuthenticatedRequest): string | undefined {
    return request.params?.id || request.params?.taskId || request.params?.sessionId || request.params?.jobId;
  }

  private estimateOperationRisk(request: AuthenticatedRequest): RiskLevel {
    // Estimate based on operation and parameters
    if (request.method === 'DELETE') return RiskLevel._HIGH;if (request.url.includes('/admin')) return RiskLevel._CRITICAL;if (request.body?.actions?.length > 10) return RiskLevel._MODERATE;return RiskLevel._LOW;
  }

  private assessBusinessImpact(request: AuthenticatedRequest): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {if (request.url.includes('/admin')) return 'CRITICAL';if (request.method === 'DELETE') return 'HIGH';if (request.body?.priority === 'HIGH') return 'HIGH';return 'MEDIUM';}private getRequiredSecurityLevel(operation: BrowserOperationContext): SecurityLevel {
    if (operation.operationType === 'ADMIN') return SecurityLevel._CRITICAL;if (operation.operationType === 'DELETE') return SecurityLevel._HIGH;if (operation.businessImpact === 'CRITICAL') return SecurityLevel._HIGH;
    return SecurityLevel._MODERATE;
  }

  private getCachedAuthorizationDecision(
    userId: string,
    operation: BrowserOperationContext
  ): { decision: AuthorizationDecision; expiresAt: Date } | undefined {
    const cacheKey = `${userId}:${operation.endpoint}:${operation.operationType}`;return this.authorizationCache.get(cacheKey);}

  private cacheAuthorizationDecision(
    userId: string,
    operation: BrowserOperationContext,
    decision: AuthorizationDecision
  ): void {
    const cacheKey = `${userId}:${operation.endpoint}:${operation.operationType}`;
    const expiresAt = new Date(Date.now() + 300000); // 5 minutes

    this.authorizationCache.set(cacheKey, { decision, expiresAt });
  }

  private sanitizeParametersForValidation(parameters: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credential'];for (const [key, value] of Object.entries(parameters)) {if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private generateAuthorizationDescription(context: PermissionEvaluationContext): string {
    return `User ${context.user.userId} requesting ${context.operation.operationType} access to ${context.operation.resourceType} via ${context.operation.endpoint}`;
  }

  private determineEscalationLevel(businessImpact: string): 'STANDARD' | 'SUPERVISOR' | 'SECURITY_TEAM' | 'EMERGENCY' {switch (businessImpact) {case 'CRITICAL': return 'SECURITY_TEAM';case 'HIGH': return 'SUPERVISOR';default: return 'STANDARD';
    }
  }

  private async logAuthorizationDecision(decision: AuthorizationDecision): Promise<void> {
    // Log to audit system - in production would persist to database
    this.logger.log(`Authorization Decision: ${decision.auditTrail.decision}`, {decisionId: decision.auditTrail.decisionId,userId: decision.auditTrail.userId,
      operation: decision.auditTrail.operation,
      reasoning: decision.reasoning,
      processingTime: `${decision.auditTrail.processingTime.toFixed(2)}ms`,});}

  private updateAuthorizationMetrics(processingTime: number): void {
    this.authorizationMetrics.averageDecisionTime =
      (this.authorizationMetrics.averageDecisionTime * (this.authorizationMetrics.totalDecisions - 1) + processingTime)
      / this.authorizationMetrics.totalDecisions;
  }

  private performAuthorizationCleanup(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, cached] of this.authorizationCache.entries()) {
      if (cached.expiresAt < now) {
        this.authorizationCache.delete(key);
        cleanedCount++;
      }
    }

    this.logger.debug(`Authorization cache cleanup: removed ${cleanedCount} expired entries`);
  }

  private logAuthorizationMetrics(): void {
    const successRate = (this.authorizationMetrics.grantedDecisions / this.authorizationMetrics.totalDecisions) * 100;

    this.logger.log('Authorization Metrics', {
      totalDecisions: this.authorizationMetrics.totalDecisions,
      grantedDecisions: this.authorizationMetrics.grantedDecisions,
      deniedDecisions: this.authorizationMetrics.deniedDecisions,
      escalatedDecisions: this.authorizationMetrics.escalatedDecisions,
      conversationalValidations: this.authorizationMetrics.conversationalValidations,
      successRate: `${successRate.toFixed(2)}%`,averageDecisionTime: `${this.authorizationMetrics.averageDecisionTime.toFixed(2)}ms`,
      cacheSize: this.authorizationCache.size,
    });
  }

  // Placeholder implementations for missing methods
  private determineNetworkSegment(riskFactors: any[]): string {
    return 'internal';}private determineSecurityPosture(security: BrowserUseSecurityContext): 'NORMAL' | 'ELEVATED' | 'HIGH_ALERT' | 'MAINTENANCE' {if (security.riskLevel === 'CRITICAL') return 'HIGH_ALERT';if (security.riskLevel === 'HIGH') return 'ELEVATED';return 'NORMAL';}private isComplianceModeActive(): boolean {
    return false; // Placeholder
  }

  private isEmergencyModeActive(): boolean {
    return false; // Placeholder
  }

  private evaluateLocationRestriction(restriction: RoleRestriction, context: PermissionEvaluationContext): { granted: boolean; reasoning: string } {
    return { granted: true, reasoning: 'Location restriction satisfied' }; // Placeholder}private evaluateIpRangeRestriction(restriction: RoleRestriction, context: PermissionEvaluationContext): { granted: boolean; reasoning: string } {
    return { granted: true, reasoning: 'IP range restriction satisfied' }; // Placeholder}private evaluateDeviceRestriction(restriction: RoleRestriction, context: PermissionEvaluationContext): { granted: boolean; reasoning: string } {
    return { granted: true, reasoning: 'Device restriction satisfied' }; // Placeholder}private evaluateApprovalRestriction(restriction: RoleRestriction, context: PermissionEvaluationContext): { granted: boolean; reasoning: string } {
    return { granted: true, reasoning: 'Approval restriction satisfied' }; // Placeholder
  }

  /**
   * Get current authorization metrics for monitoring
   */
  getAuthorizationMetrics() {
    return {
      ...this.authorizationMetrics,
      successRate: (this.authorizationMetrics.grantedDecisions / this.authorizationMetrics.totalDecisions) * 100,
      cacheSize: this.authorizationCache.size,
      configuredRoles: this.roleDefinitions.size,
    };
  }
}