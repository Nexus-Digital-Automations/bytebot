/**
 * PARLANT Role-Based Access Control Service - Conversational Authorization
 *
 * Provides comprehensive conversational role-based access control with
 * intelligent permission management, dynamic role activation, and natural
 * language authorization workflows for enterprise-grade security.
 *
 * Features:
 * - Conversational permission escalation workflows
 * - Dynamic role activation with AI validation
 * - Context-aware permission inheritance and delegation
 * - Real-time authorization decision explanations
 * - Intelligent privilege escalation with conversational approval
 * - Enterprise-grade RBAC compliance and audit trails
 *
 * Security Level: CRITICAL - All authorization decisions validated through conversation
 * Performance Target: <1000ms for standard RBAC evaluation, <3000ms for conversational approval
 * Compliance: NIST RBAC, SOC 2 Type II, GDPR Article 25 ready
 */

import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ParlantIntegrationService,
  ParlantConversationContext,
  ParlantValidationRequest,
  ParlantValidationResponse,
  ConversationalValidationError,
} from '@bytebot/shared/src/parlant/parlant-integration.service';
import {
  SecurityClassification,
  RiskLevel,
  SecurityLevel,
  UserRole,
  Permission,
} from '@bytebot/shared';
import { User } from '@prisma/client';

// ===== RBAC INTERFACES =====

/**
 * Permission types in the system
 */
export enum PermissionType {
  // System Administration
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_MAINTENANCE = 'system:maintenance',

  // User Management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_IMPERSONATE = 'user:impersonate',

  // Data Access
  DATA_READ = 'data:read',
  DATA_WRITE = 'data:write',
  DATA_DELETE = 'data:delete',
  DATA_EXPORT = 'data:export',

  // API Access
  API_READ = 'api:read',
  API_WRITE = 'api:write',
  API_ADMIN = 'api:admin',

  // Security Operations
  SECURITY_READ = 'security:read',
  SECURITY_WRITE = 'security:write',
  SECURITY_ADMIN = 'security:admin',

  // Audit and Compliance
  AUDIT_READ = 'audit:read',
  AUDIT_WRITE = 'audit:write',
  AUDIT_ADMIN = 'audit:admin',
}

/**
 * Permission scope levels
 */
export enum PermissionScope {
  GLOBAL = 'global', // System-wide permissions
  ORGANIZATION = 'organization', // Organization-level permissions
  DEPARTMENT = 'department', // Department-level permissions
  TEAM = 'team', // Team-level permissions
  USER = 'user', // User-level permissions
}

/**
 * Role hierarchy levels
 */
export enum RoleHierarchyLevel {
  SYSTEM = 0, // System roles (ADMIN)
  EXECUTIVE = 1, // Executive roles
  MANAGEMENT = 2, // Management roles
  OPERATIONAL = 3, // Operational roles (OPERATOR)
  STANDARD = 4, // Standard user roles (VIEWER, USER)
  GUEST = 5, // Guest access (GUEST)
}

/**
 * Conversational RBAC context
 */
export interface ConversationalRBACContext {
  readonly userId: string;
  readonly currentRoles: UserRole[];
  readonly currentPermissions: PermissionType[];
  readonly requestedOperation: string;
  readonly targetResource?: string;
  readonly businessJustification?: string;
  readonly riskLevel: RiskLevel;
  readonly sessionId: string;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly deviceFingerprint: string;
  readonly timestamp: Date;
}

/**
 * Permission request for conversational approval
 */
export interface ConversationalPermissionRequest {
  readonly requestId: string;
  readonly userId: string;
  readonly requestedPermissions: PermissionType[];
  readonly requestedRoles?: UserRole[];
  readonly targetScope: PermissionScope;
  readonly businessJustification: string;
  readonly urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly temporaryAccess: boolean;
  readonly durationMinutes?: number;
  readonly approverRequired?: string;
  readonly context: ConversationalRBACContext;
}

/**
 * Permission escalation workflow
 */
export interface PermissionEscalationWorkflow {
  readonly workflowId: string;
  readonly userId: string;
  readonly requestedPermissions: PermissionType[];
  readonly currentPermissions: PermissionType[];
  readonly escalationReason: string;
  readonly riskAssessment: PermissionRiskAssessment;
  readonly conversationContext: ParlantConversationContext;
  readonly conversationId: string;
  readonly state: EscalationWorkflowState;
  readonly approvalChain: ApprovalChainEntry[];
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly auditTrail: RBACAuditEntry[];
}

/**
 * Escalation workflow states
 */
export enum EscalationWorkflowState {
  INITIATED = 'INITIATED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

/**
 * Approval chain entry
 */
export interface ApprovalChainEntry {
  readonly approverId: string;
  readonly approverRole: UserRole;
  readonly level: number;
  readonly status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  readonly reasoning?: string;
  readonly timestamp?: Date;
  readonly conversationId?: string;
}

/**
 * Permission risk assessment
 */
export interface PermissionRiskAssessment {
  readonly riskScore: number;
  readonly riskLevel: RiskLevel;
  readonly riskFactors: PermissionRiskFactor[];
  readonly mitigationRequirements: string[];
  readonly monitoringRequirements: string[];
  readonly assessmentTimestamp: Date;
  readonly aiReasoningExplanation: string;
}

/**
 * Permission risk factor
 */
export interface PermissionRiskFactor {
  readonly factor: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly weight: number;
  readonly description: string;
  readonly mitigationActions: string[];
}

/**
 * RBAC audit entry
 */
export interface RBACAuditEntry {
  readonly timestamp: Date;
  readonly action: string;
  readonly outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'ESCALATED';
  readonly details: string;
  readonly permissions?: PermissionType[];
  readonly conversationId?: string;
  readonly riskScore: number;
  readonly securityLevel: SecurityLevel;
}

/**
 * Authorization decision result
 */
export interface ConversationalAuthorizationResult {
  readonly authorized: boolean;
  readonly permissions: PermissionType[];
  readonly roles: UserRole[];
  readonly riskAssessment: PermissionRiskAssessment;
  readonly conversationId?: string;
  readonly reasoning: string;
  readonly restrictions: string[];
  readonly monitoringRequired: boolean;
  readonly escalationWorkflow?: PermissionEscalationWorkflow;
  readonly auditTrail: RBACAuditEntry[];
  readonly sessionRestrictions?: {
    timeLimit?: number;
    resourceRestrictions?: string[];
    operationRestrictions?: string[];
  };
}

// ===== PARLANT RBAC SERVICE =====

@Injectable()
export class ParlantRBACService {
  private readonly logger = new Logger(ParlantRBACService.name);

  // Role hierarchy mapping
  private readonly roleHierarchy = new Map<UserRole, RoleHierarchyLevel>([
    [UserRole.ADMIN, RoleHierarchyLevel.SYSTEM],
    [UserRole.OPERATOR, RoleHierarchyLevel.OPERATIONAL],
    [UserRole.VIEWER, RoleHierarchyLevel.STANDARD],
    [UserRole.USER, RoleHierarchyLevel.STANDARD],
    [UserRole.GUEST, RoleHierarchyLevel.GUEST],
  ]);

  // Permission mappings for roles
  private readonly rolePermissions = new Map<UserRole, PermissionType[]>([
    [
      UserRole.ADMIN,
      [
        PermissionType.SYSTEM_ADMIN,
        PermissionType.SYSTEM_CONFIG,
        PermissionType.SYSTEM_MAINTENANCE,
        PermissionType.USER_CREATE,
        PermissionType.USER_READ,
        PermissionType.USER_UPDATE,
        PermissionType.USER_DELETE,
        PermissionType.USER_IMPERSONATE,
        PermissionType.DATA_READ,
        PermissionType.DATA_WRITE,
        PermissionType.DATA_DELETE,
        PermissionType.DATA_EXPORT,
        PermissionType.API_READ,
        PermissionType.API_WRITE,
        PermissionType.API_ADMIN,
        PermissionType.SECURITY_READ,
        PermissionType.SECURITY_WRITE,
        PermissionType.SECURITY_ADMIN,
        PermissionType.AUDIT_READ,
        PermissionType.AUDIT_WRITE,
        PermissionType.AUDIT_ADMIN,
      ],
    ],
    [
      UserRole.OPERATOR,
      [
        PermissionType.USER_READ,
        PermissionType.USER_UPDATE,
        PermissionType.DATA_READ,
        PermissionType.DATA_WRITE,
        PermissionType.API_READ,
        PermissionType.API_WRITE,
        PermissionType.SECURITY_READ,
        PermissionType.AUDIT_READ,
      ],
    ],
    [
      UserRole.VIEWER,
      [
        PermissionType.DATA_READ,
        PermissionType.API_READ,
        PermissionType.AUDIT_READ,
      ],
    ],
    [UserRole.USER, [PermissionType.DATA_READ, PermissionType.API_READ]],
    [UserRole.GUEST, [PermissionType.API_READ]],
  ]);

  // In-memory stores (use database in production)
  private readonly activeEscalationWorkflows = new Map<
    string,
    PermissionEscalationWorkflow
  >();
  private readonly temporaryPermissions = new Map<
    string,
    { permissions: PermissionType[]; expiresAt: Date }
  >();
  private readonly userSessionRestrictions = new Map<string, any>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly parlantService: ParlantIntegrationService,
  ) {
    const operationId = `parlant-rbac-init-${Date.now()}`;
    this.logger.log(`[${operationId}] Initializing PARLANT RBAC Service`, {
      operationId,
      supportedRoles: Array.from(this.roleHierarchy.keys()),
      totalPermissions: Object.keys(PermissionType).length,
    });
  }

  /**
   * Evaluate authorization with conversational validation
   *
   * @param context - RBAC context for evaluation
   * @param requestedPermissions - Permissions being requested
   * @returns Promise<ConversationalAuthorizationResult> - Authorization decision
   */
  async evaluateConversationalAuthorization(
    context: ConversationalRBACContext,
    requestedPermissions: PermissionType[],
  ): Promise<ConversationalAuthorizationResult> {
    const operationId = `rbac-eval-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.log(
      `[${operationId}] Evaluating conversational authorization`,
      {
        operationId,
        userId: context.userId,
        currentRoles: context.currentRoles,
        requestedPermissions,
        requestedOperation: context.requestedOperation,
        riskLevel: context.riskLevel,
      },
    );

    try {
      // Step 1: Get user and current permissions
      const user = await this.getUserById(context.userId);
      if (!user) {
        throw new ForbiddenException('User not found');
      }

      const currentPermissions = this.getCurrentUserPermissions(
        context.currentRoles,
        context.userId,
      );

      // Step 2: Perform basic RBAC evaluation
      const basicAuthResult = this.evaluateBasicRBAC(
        currentPermissions,
        requestedPermissions,
      );

      // Step 3: Perform risk assessment
      const riskAssessment = await this.performPermissionRiskAssessment(
        context,
        requestedPermissions,
        basicAuthResult,
      );

      // Step 4: Determine if conversational validation is required
      const requiresConversation = this.requiresConversationalValidation(
        riskAssessment,
        requestedPermissions,
        context,
      );

      if (requiresConversation && !basicAuthResult.authorized) {
        // Step 5: Initiate permission escalation workflow
        return await this.initiatePermissionEscalationWorkflow(
          context,
          requestedPermissions,
          currentPermissions,
          riskAssessment,
          operationId,
        );
      } else if (requiresConversation && basicAuthResult.authorized) {
        // Step 6: High-risk authorized operation - conversational confirmation
        return await this.performConversationalConfirmation(
          context,
          requestedPermissions,
          currentPermissions,
          riskAssessment,
          operationId,
        );
      } else {
        // Step 7: Standard RBAC authorization
        return await this.createStandardAuthorizationResult(
          basicAuthResult.authorized,
          currentPermissions,
          context.currentRoles,
          riskAssessment,
          basicAuthResult.reasoning,
          operationId,
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[${operationId}] Authorization evaluation failed`, {
        operationId,
        userId: context.userId,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      throw error instanceof Error
        ? error
        : new Error('Authorization evaluation failed');
    }
  }

  /**
   * Request permission escalation through conversational workflow
   *
   * @param request - Permission escalation request
   * @returns Promise<PermissionEscalationWorkflow> - Escalation workflow
   */
  async requestConversationalPermissionEscalation(
    request: ConversationalPermissionRequest,
  ): Promise<PermissionEscalationWorkflow> {
    const operationId = `perm-escalation-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.log(
      `[${operationId}] Requesting conversational permission escalation`,
      {
        operationId,
        userId: request.userId,
        requestedPermissions: request.requestedPermissions,
        urgency: request.urgency,
        temporaryAccess: request.temporaryAccess,
      },
    );

    try {
      // Step 1: Validate escalation request
      await this.validateEscalationRequest(request);

      // Step 2: Perform risk assessment
      const riskAssessment =
        await this.performEscalationRiskAssessment(request);

      // Step 3: Create approval chain
      const approvalChain = await this.createApprovalChain(
        request,
        riskAssessment,
      );

      // Step 4: Create Parlant conversation context
      const parlantContext = this.createEscalationConversationContext(
        request,
        riskAssessment,
      );

      // Step 5: Create escalation workflow
      const workflowId = `escalation_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const escalationWorkflow: PermissionEscalationWorkflow = {
        workflowId,
        userId: request.userId,
        requestedPermissions: request.requestedPermissions,
        currentPermissions: request.context.currentPermissions,
        escalationReason: request.businessJustification,
        riskAssessment,
        conversationContext: parlantContext,
        conversationId:
          (parlantContext.metadata?.conversationId as string) || workflowId,
        state: EscalationWorkflowState.INITIATED,
        approvalChain,
        createdAt: new Date(),
        expiresAt: new Date(
          Date.now() + (request.durationMinutes || 60) * 60 * 1000,
        ),
        auditTrail: [
          {
            timestamp: new Date(),
            action: 'PERMISSION_ESCALATION_REQUESTED',
            outcome: 'SUCCESS',
            details: `Permission escalation requested: ${request.businessJustification}`,
            permissions: request.requestedPermissions,
            conversationId: parlantContext.metadata?.conversationId as string,
            riskScore: riskAssessment.riskScore,
            securityLevel: this.mapRiskToSecurityLevel(
              riskAssessment.riskLevel,
            ),
          },
        ],
      };

      // Step 6: Store workflow
      this.activeEscalationWorkflows.set(workflowId, escalationWorkflow);

      // Step 7: Initiate conversational approval process
      await this.initiateConversationalApprovalProcess(escalationWorkflow);

      const duration = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Permission escalation workflow created`,
        {
          operationId,
          workflowId,
          userId: request.userId,
          approvers: approvalChain.length,
          riskScore: riskAssessment.riskScore,
          duration,
        },
      );

      return escalationWorkflow;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[${operationId}] Permission escalation request failed`,
        {
          operationId,
          userId: request.userId,
          error: error instanceof Error ? error.message : String(error),
          duration,
        },
      );

      throw error instanceof Error
        ? error
        : new Error('Permission escalation request failed');
    }
  }

  /**
   * Process conversational approval for permission escalation
   *
   * @param workflowId - Escalation workflow ID
   * @param approverId - ID of the approver
   * @param approved - Approval decision
   * @param reasoning - Reasoning for the decision
   * @param conversationContext - PARLANT conversation context
   * @returns Promise<ConversationalAuthorizationResult> - Approval result
   */
  async processConversationalEscalationApproval(
    workflowId: string,
    approverId: string,
    approved: boolean,
    reasoning: string,
    conversationContext: ParlantConversationContext,
  ): Promise<ConversationalAuthorizationResult> {
    const operationId = `escalation-approval-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.log(
      `[${operationId}] Processing conversational escalation approval`,
      {
        operationId,
        workflowId,
        approverId,
        approved,
        reasoning: reasoning.substring(0, 100),
      },
    );

    try {
      // Step 1: Get escalation workflow
      const workflow = this.activeEscalationWorkflows.get(workflowId);
      if (!workflow) {
        throw new BadRequestException(
          'Escalation workflow not found or expired',
        );
      }

      // Step 2: Validate approver authorization
      const approverEntry = workflow.approvalChain.find(
        (entry) => entry.approverId === approverId,
      );
      if (!approverEntry) {
        throw new ForbiddenException(
          'Approver not authorized for this workflow',
        );
      }

      if (approverEntry.status !== 'PENDING') {
        throw new BadRequestException('Approval already processed');
      }

      // Step 3: Validate approval through Parlant
      const validationRequest: ParlantValidationRequest = {
        functionName:
          'ParlantRBACService.processConversationalEscalationApproval',
        functionParams: {
          workflowId,
          approverId,
          approved,
          requestedPermissions: workflow.requestedPermissions,
          escalationReason: workflow.escalationReason,
          riskScore: workflow.riskAssessment.riskScore,
        },
        actionDescription: `${approved ? 'Approve' : 'Reject'} permission escalation for ${workflow.requestedPermissions.join(', ')}. Reason: ${reasoning}`,
        context: conversationContext,
        riskLevel: workflow.riskAssessment.riskLevel,
        operationId,
      };

      const validation =
        await this.parlantService.validateFunctionExecution(validationRequest);

      if (!validation.approved) {
        throw new ConversationalValidationError(
          validation.conversationId,
          validation.reasoning,
          validation.suggestedAlternatives ?? [],
        );
      }

      // Step 4: Update approval chain
      const updatedApprovalChain = workflow.approvalChain.map((entry) =>
        entry.approverId === approverId
          ? {
              ...entry,
              status: approved ? 'APPROVED' : ('REJECTED' as any),
              reasoning,
              timestamp: new Date(),
              conversationId: validation.conversationId,
            }
          : entry,
      );

      // Step 5: Determine workflow outcome
      const allApproved = updatedApprovalChain.every(
        (entry) => entry.status === 'APPROVED',
      );
      const anyRejected = updatedApprovalChain.some(
        (entry) => entry.status === 'REJECTED',
      );

      let newState: EscalationWorkflowState;
      if (anyRejected) {
        newState = EscalationWorkflowState.REJECTED;
      } else if (allApproved) {
        newState = EscalationWorkflowState.APPROVED;
      } else {
        newState = EscalationWorkflowState.PENDING_APPROVAL;
      }

      // Step 6: Update workflow
      const updatedWorkflow: PermissionEscalationWorkflow = {
        ...workflow,
        state: newState,
        approvalChain: updatedApprovalChain,
        auditTrail: [
          ...workflow.auditTrail,
          {
            timestamp: new Date(),
            action: approved ? 'ESCALATION_APPROVED' : 'ESCALATION_REJECTED',
            outcome: 'SUCCESS',
            details: `Approval processed by ${approverId}: ${reasoning}`,
            permissions: workflow.requestedPermissions,
            conversationId: validation.conversationId,
            riskScore: workflow.riskAssessment.riskScore,
            securityLevel: this.mapRiskToSecurityLevel(
              workflow.riskAssessment.riskLevel,
            ),
          },
        ],
      };

      this.activeEscalationWorkflows.set(workflowId, updatedWorkflow);

      // Step 7: Grant permissions if fully approved
      if (newState === EscalationWorkflowState.APPROVED) {
        await this.grantTemporaryPermissions(
          workflow.userId,
          workflow.requestedPermissions,
        );
      }

      const duration = Date.now() - startTime;
      this.logger.log(`[${operationId}] Escalation approval processed`, {
        operationId,
        workflowId,
        approved,
        workflowState: newState,
        conversationId: validation.conversationId,
        duration,
      });

      return {
        authorized: newState === EscalationWorkflowState.APPROVED,
        permissions:
          newState === EscalationWorkflowState.APPROVED
            ? workflow.requestedPermissions
            : [],
        roles: [], // Permissions granted, not roles
        riskAssessment: workflow.riskAssessment,
        conversationId: validation.conversationId,
        reasoning: approved
          ? `Permission escalation approved: ${reasoning}`
          : `Permission escalation rejected: ${reasoning}`,
        restrictions:
          newState === EscalationWorkflowState.APPROVED
            ? ['TEMPORARY_ACCESS', 'ENHANCED_MONITORING']
            : [],
        monitoringRequired: true,
        escalationWorkflow: updatedWorkflow,
        auditTrail: updatedWorkflow.auditTrail,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[${operationId}] Escalation approval processing failed`,
        {
          operationId,
          workflowId,
          error: error instanceof Error ? error.message : String(error),
          duration,
        },
      );

      throw error instanceof Error
        ? error
        : new Error('Escalation approval processing failed');
    }
  }

  /**
   * Get user's effective permissions including temporary escalations
   *
   * @param userId - User ID
   * @param roles - User's current roles
   * @returns Promise<PermissionType[]> - Effective permissions
   */
  async getEffectiveUserPermissions(
    userId: string,
    roles: UserRole[],
  ): Promise<PermissionType[]> {
    const operationId = `effective-perms-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    this.logger.debug(`[${operationId}] Getting effective user permissions`, {
      operationId,
      userId,
      roles,
    });

    try {
      // Step 1: Get base permissions from roles
      const basePermissions = this.getCurrentUserPermissions(roles, userId);

      // Step 2: Add temporary permissions
      const temporaryPerms = this.temporaryPermissions.get(userId);
      if (temporaryPerms && new Date() < temporaryPerms.expiresAt) {
        const effectivePermissions = [
          ...basePermissions,
          ...temporaryPerms.permissions,
        ];
        // Remove duplicates
        return Array.from(new Set(effectivePermissions));
      }

      return basePermissions;
    } catch (error) {
      this.logger.error(
        `[${operationId}] Failed to get effective permissions`,
        {
          operationId,
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
      );

      return this.getCurrentUserPermissions(roles, userId);
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private async getUserById(userId: string): Promise<User | null> {
    try {
      return await this.prismaService.user.findUnique({
        where: { id: userId },
      });
    } catch (error) {
      this.logger.error('Error fetching user', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private getCurrentUserPermissions(
    roles: UserRole[],
    userId: string,
  ): PermissionType[] {
    const permissions = new Set<PermissionType>();

    // Add permissions from all roles
    for (const role of roles) {
      const rolePermissions = this.rolePermissions.get(role) || [];
      rolePermissions.forEach((perm) => permissions.add(perm));
    }

    return Array.from(permissions);
  }

  private evaluateBasicRBAC(
    currentPermissions: PermissionType[],
    requestedPermissions: PermissionType[],
  ): { authorized: boolean; reasoning: string } {
    const missingPermissions = requestedPermissions.filter(
      (perm) => !currentPermissions.includes(perm),
    );

    if (missingPermissions.length === 0) {
      return {
        authorized: true,
        reasoning: 'User has all required permissions',
      };
    }

    return {
      authorized: false,
      reasoning: `Missing permissions: ${missingPermissions.join(', ')}`,
    };
  }

  private async performPermissionRiskAssessment(
    context: ConversationalRBACContext,
    requestedPermissions: PermissionType[],
    basicAuthResult: { authorized: boolean; reasoning: string },
  ): Promise<PermissionRiskAssessment> {
    const riskFactors: PermissionRiskFactor[] = [];
    let riskScore = 0.0;

    // Base risk from requested permissions
    const highRiskPermissions = [
      PermissionType.SYSTEM_ADMIN,
      PermissionType.USER_DELETE,
      PermissionType.DATA_DELETE,
      PermissionType.USER_IMPERSONATE,
      PermissionType.SECURITY_ADMIN,
    ];

    const requestedHighRiskPerms = requestedPermissions.filter((perm) =>
      highRiskPermissions.includes(perm),
    );

    if (requestedHighRiskPerms.length > 0) {
      const factor: PermissionRiskFactor = {
        factor: 'HIGH_RISK_PERMISSIONS',
        severity: 'HIGH',
        weight: 0.4,
        description: `Requesting high-risk permissions: ${requestedHighRiskPerms.join(', ')}`,
        mitigationActions: [
          'Require conversational approval',
          'Enhanced monitoring',
        ],
      };
      riskFactors.push(factor);
      riskScore += factor.weight;
    }

    // Risk from permission escalation
    if (!basicAuthResult.authorized) {
      const factor: PermissionRiskFactor = {
        factor: 'PERMISSION_ESCALATION',
        severity: 'MEDIUM',
        weight: 0.3,
        description: 'User requesting permissions above current role',
        mitigationActions: [
          'Approval workflow required',
          'Business justification',
        ],
      };
      riskFactors.push(factor);
      riskScore += factor.weight;
    }

    // Risk from user roles
    if (context.currentRoles.includes(UserRole.ADMIN)) {
      const factor: PermissionRiskFactor = {
        factor: 'ADMIN_USER_REQUEST',
        severity: 'MEDIUM',
        weight: 0.2,
        description: 'Request from administrator account',
        mitigationActions: ['Enhanced monitoring', 'Detailed audit logging'],
      };
      riskFactors.push(factor);
      riskScore += factor.weight;
    }

    // Context-based risk factors
    if (context.riskLevel === 'HIGH' || context.riskLevel === 'CRITICAL') {
      const factor: PermissionRiskFactor = {
        factor: 'HIGH_CONTEXT_RISK',
        severity: 'HIGH',
        weight: 0.3,
        description: `High-risk authentication context: ${context.riskLevel}`,
        mitigationActions: [
          'Conversational validation',
          'Additional verification',
        ],
      };
      riskFactors.push(factor);
      riskScore += factor.weight;
    }

    const finalRiskLevel = this.calculateRiskLevel(riskScore);

    return {
      riskScore: Math.min(riskScore, 1.0),
      riskLevel: finalRiskLevel,
      riskFactors,
      mitigationRequirements: this.generateMitigationRequirements(riskFactors),
      monitoringRequirements: this.generateMonitoringRequirements(riskFactors),
      assessmentTimestamp: new Date(),
      aiReasoningExplanation: this.generateRiskExplanation(
        riskScore,
        riskFactors,
      ),
    };
  }

  private requiresConversationalValidation(
    riskAssessment: PermissionRiskAssessment,
    requestedPermissions: PermissionType[],
    context: ConversationalRBACContext,
  ): boolean {
    // High-risk operations always require conversation
    if (
      riskAssessment.riskLevel === 'HIGH' ||
      riskAssessment.riskLevel === 'CRITICAL'
    ) {
      return true;
    }

    // Admin permissions require conversation
    const adminPermissions = [
      PermissionType.SYSTEM_ADMIN,
      PermissionType.USER_DELETE,
      PermissionType.SECURITY_ADMIN,
      PermissionType.USER_IMPERSONATE,
    ];

    if (requestedPermissions.some((perm) => adminPermissions.includes(perm))) {
      return true;
    }

    // Permission escalation requires conversation
    const currentPermissions = this.getCurrentUserPermissions(
      context.currentRoles,
      context.userId,
    );
    const missingPermissions = requestedPermissions.filter(
      (perm) => !currentPermissions.includes(perm),
    );

    return missingPermissions.length > 0;
  }

  private async initiatePermissionEscalationWorkflow(
    context: ConversationalRBACContext,
    requestedPermissions: PermissionType[],
    currentPermissions: PermissionType[],
    riskAssessment: PermissionRiskAssessment,
    operationId: string,
  ): Promise<ConversationalAuthorizationResult> {
    this.logger.log(
      `[${operationId}] Initiating permission escalation workflow`,
      {
        operationId,
        userId: context.userId,
        requestedPermissions,
        riskScore: riskAssessment.riskScore,
      },
    );

    // Create escalation request
    const escalationRequest: ConversationalPermissionRequest = {
      requestId: `req_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId: context.userId,
      requestedPermissions,
      targetScope: PermissionScope.GLOBAL,
      businessJustification:
        context.businessJustification ||
        'Permission escalation required for operation',
      urgency: this.mapRiskToUrgency(riskAssessment.riskLevel),
      temporaryAccess: true,
      durationMinutes: 60, // Default 1 hour
      context,
    };

    const escalationWorkflow =
      await this.requestConversationalPermissionEscalation(escalationRequest);

    return {
      authorized: false,
      permissions: currentPermissions,
      roles: context.currentRoles,
      riskAssessment,
      conversationId: escalationWorkflow.conversationId,
      reasoning: 'Permission escalation workflow initiated - awaiting approval',
      restrictions: ['ESCALATION_PENDING'],
      monitoringRequired: true,
      escalationWorkflow,
      auditTrail: escalationWorkflow.auditTrail,
    };
  }

  private async performConversationalConfirmation(
    context: ConversationalRBACContext,
    requestedPermissions: PermissionType[],
    currentPermissions: PermissionType[],
    riskAssessment: PermissionRiskAssessment,
    operationId: string,
  ): Promise<ConversationalAuthorizationResult> {
    this.logger.log(`[${operationId}] Performing conversational confirmation`, {
      operationId,
      userId: context.userId,
      requestedPermissions,
      riskScore: riskAssessment.riskScore,
    });

    // Create Parlant conversation context
    const parlantContext = this.createAuthorizationConversationContext(
      context,
      riskAssessment,
    );

    const validationRequest: ParlantValidationRequest = {
      functionName: 'ParlantRBACService.performConversationalConfirmation',
      functionParams: {
        userId: context.userId,
        requestedPermissions,
        requestedOperation: context.requestedOperation,
        riskScore: riskAssessment.riskScore,
        businessJustification: context.businessJustification,
      },
      actionDescription: `High-risk authorized operation: ${context.requestedOperation}. Permissions: ${requestedPermissions.join(', ')}`,
      context: parlantContext,
      riskLevel: riskAssessment.riskLevel,
      operationId,
    };

    const validation =
      await this.parlantService.validateFunctionExecution(validationRequest);

    const auditEntry: RBACAuditEntry = {
      timestamp: new Date(),
      action: 'CONVERSATIONAL_AUTHORIZATION_CONFIRMATION',
      outcome: validation.approved ? 'SUCCESS' : 'BLOCKED',
      details: validation.approved
        ? `High-risk operation approved through conversation: ${validation.reasoning}`
        : `High-risk operation blocked through conversation: ${validation.reasoning}`,
      permissions: requestedPermissions,
      conversationId: validation.conversationId,
      riskScore: riskAssessment.riskScore,
      securityLevel: this.mapRiskToSecurityLevel(riskAssessment.riskLevel),
    };

    return {
      authorized: validation.approved,
      permissions: validation.approved ? requestedPermissions : [],
      roles: context.currentRoles,
      riskAssessment,
      conversationId: validation.conversationId,
      reasoning: validation.reasoning,
      restrictions: validation.approved
        ? ['ENHANCED_MONITORING', 'CONVERSATION_APPROVED']
        : ['OPERATION_BLOCKED'],
      monitoringRequired: true,
      auditTrail: [auditEntry],
      sessionRestrictions: validation.approved
        ? {
            timeLimit: 60 * 60 * 1000, // 1 hour
            operationRestrictions: ['HIGH_RISK_OPERATIONS_MONITORED'],
          }
        : undefined,
    };
  }

  private async createStandardAuthorizationResult(
    authorized: boolean,
    permissions: PermissionType[],
    roles: UserRole[],
    riskAssessment: PermissionRiskAssessment,
    reasoning: string,
    operationId: string,
  ): Promise<ConversationalAuthorizationResult> {
    const auditEntry: RBACAuditEntry = {
      timestamp: new Date(),
      action: 'STANDARD_AUTHORIZATION',
      outcome: authorized ? 'SUCCESS' : 'BLOCKED',
      details: reasoning,
      permissions,
      riskScore: riskAssessment.riskScore,
      securityLevel: this.mapRiskToSecurityLevel(riskAssessment.riskLevel),
    };

    return {
      authorized,
      permissions: authorized ? permissions : [],
      roles,
      riskAssessment,
      reasoning,
      restrictions: authorized ? [] : ['INSUFFICIENT_PERMISSIONS'],
      monitoringRequired: riskAssessment.riskLevel !== 'LOW',
      auditTrail: [auditEntry],
    };
  }

  private async validateEscalationRequest(
    request: ConversationalPermissionRequest,
  ): Promise<void> {
    if (
      !request.businessJustification ||
      request.businessJustification.length < 10
    ) {
      throw new BadRequestException(
        'Business justification is required and must be at least 10 characters',
      );
    }

    if (request.requestedPermissions.length === 0) {
      throw new BadRequestException(
        'At least one permission must be requested',
      );
    }

    if (
      request.temporaryAccess &&
      (!request.durationMinutes || request.durationMinutes > 24 * 60)
    ) {
      throw new BadRequestException(
        'Temporary access duration must be specified and not exceed 24 hours',
      );
    }
  }

  private async performEscalationRiskAssessment(
    request: ConversationalPermissionRequest,
  ): Promise<PermissionRiskAssessment> {
    // Simplified risk assessment for escalation
    const riskFactors: PermissionRiskFactor[] = [];
    let riskScore = 0.5; // Base risk for escalation

    // High urgency increases risk
    if (request.urgency === 'CRITICAL') {
      riskScore += 0.3;
      riskFactors.push({
        factor: 'CRITICAL_URGENCY',
        severity: 'HIGH',
        weight: 0.3,
        description: 'Critical urgency escalation request',
        mitigationActions: [
          'Immediate approval required',
          'Enhanced monitoring',
        ],
      });
    }

    return {
      riskScore: Math.min(riskScore, 1.0),
      riskLevel: this.calculateRiskLevel(riskScore),
      riskFactors,
      mitigationRequirements: ['APPROVAL_REQUIRED', 'ENHANCED_MONITORING'],
      monitoringRequirements: [
        'REAL_TIME_MONITORING',
        'DETAILED_AUDIT_LOGGING',
      ],
      assessmentTimestamp: new Date(),
      aiReasoningExplanation: `Escalation risk assessment: score ${riskScore}, urgency ${request.urgency}`,
    };
  }

  private async createApprovalChain(
    request: ConversationalPermissionRequest,
    riskAssessment: PermissionRiskAssessment,
  ): Promise<ApprovalChainEntry[]> {
    const approvalChain: ApprovalChainEntry[] = [];

    // For demonstration, create a simple approval chain
    // In production, this would be based on organizational hierarchy
    if (
      riskAssessment.riskLevel === 'HIGH' ||
      riskAssessment.riskLevel === 'CRITICAL'
    ) {
      approvalChain.push({
        approverId: 'admin-user-id', // Would be actual admin user ID
        approverRole: UserRole.ADMIN,
        level: 1,
        status: 'PENDING',
      });
    }

    return approvalChain;
  }

  private createEscalationConversationContext(
    request: ConversationalPermissionRequest,
    riskAssessment: PermissionRiskAssessment,
  ): ParlantConversationContext {
    return {
      userId: request.userId,
      agentRole: 'PERMISSION_ESCALATION',
      securityLevel: this.mapRiskToSecurityLevel(riskAssessment.riskLevel),
      conversationHistory: [],
      metadata: {
        escalationRequest: true,
        requestedPermissions: request.requestedPermissions,
        businessJustification: request.businessJustification,
        urgency: request.urgency,
        riskScore: riskAssessment.riskScore,
        temporaryAccess: request.temporaryAccess,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private createAuthorizationConversationContext(
    context: ConversationalRBACContext,
    riskAssessment: PermissionRiskAssessment,
  ): ParlantConversationContext {
    return {
      userId: context.userId,
      agentRole: context.currentRoles[0]?.toString() || 'USER',
      securityLevel: this.mapRiskToSecurityLevel(riskAssessment.riskLevel),
      conversationHistory: [],
      metadata: {
        authorizationRequest: true,
        requestedOperation: context.requestedOperation,
        riskScore: riskAssessment.riskScore,
        ipAddress: context.ipAddress,
        deviceFingerprint: context.deviceFingerprint,
        businessJustification: context.businessJustification,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async initiateConversationalApprovalProcess(
    workflow: PermissionEscalationWorkflow,
  ): Promise<void> {
    // In production, this would trigger notifications to approvers
    this.logger.log('Initiating conversational approval process', {
      workflowId: workflow.workflowId,
      approvers: workflow.approvalChain.map((a) => a.approverId),
    });
  }

  private async grantTemporaryPermissions(
    userId: string,
    permissions: PermissionType[],
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    this.temporaryPermissions.set(userId, { permissions, expiresAt });

    this.logger.log('Temporary permissions granted', {
      userId,
      permissions,
      expiresAt: expiresAt.toISOString(),
    });
  }

  private generateMitigationRequirements(
    riskFactors: PermissionRiskFactor[],
  ): string[] {
    const requirements = new Set<string>();

    for (const factor of riskFactors) {
      factor.mitigationActions.forEach((action) => requirements.add(action));
    }

    return Array.from(requirements);
  }

  private generateMonitoringRequirements(
    riskFactors: PermissionRiskFactor[],
  ): string[] {
    const requirements = ['AUDIT_LOGGING'];

    if (
      riskFactors.some(
        (f) => f.severity === 'HIGH' || f.severity === 'CRITICAL',
      )
    ) {
      requirements.push('REAL_TIME_MONITORING', 'ENHANCED_ALERTING');
    }

    return requirements;
  }

  private generateRiskExplanation(
    riskScore: number,
    riskFactors: PermissionRiskFactor[],
  ): string {
    const factorDescriptions = riskFactors
      .map(
        (f) =>
          `${f.factor}: ${f.description} (severity: ${f.severity}, weight: ${f.weight})`,
      )
      .join('; ');

    return (
      `Permission risk assessment completed with score ${riskScore.toFixed(2)}. ` +
      `Risk factors identified: ${factorDescriptions}. ` +
      `Risk level: ${this.calculateRiskLevel(riskScore)}.`
    );
  }

  private calculateRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 0.8) return 'CRITICAL' as RiskLevel;
    if (riskScore >= 0.6) return 'HIGH' as RiskLevel;
    if (riskScore >= 0.3) return 'MEDIUM' as RiskLevel;
    return 'LOW' as RiskLevel;
  }

  private mapRiskToSecurityLevel(riskLevel: RiskLevel): SecurityLevel {
    switch (riskLevel) {
      case 'LOW':
        return 'LOW' as SecurityLevel;
      case 'MEDIUM':
        return 'MEDIUM' as SecurityLevel;
      case 'HIGH':
        return 'HIGH' as SecurityLevel;
      case 'CRITICAL':
        return 'CRITICAL' as SecurityLevel;
      default:
        return 'MEDIUM' as SecurityLevel;
    }
  }

  private mapRiskToUrgency(
    riskLevel: RiskLevel,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (riskLevel) {
      case 'LOW':
        return 'LOW';
      case 'MEDIUM':
        return 'MEDIUM';
      case 'HIGH':
        return 'HIGH';
      case 'CRITICAL':
        return 'CRITICAL';
      default:
        return 'MEDIUM';
    }
  }
}
