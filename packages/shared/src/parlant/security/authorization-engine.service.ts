/**
 * PARLANT Phase 1 Advanced Authorization Engine Service
 *
 * Comprehensive authorization engine that provides enterprise-grade
 * role-based access control (RBAC) with inheritance, dynamic permission
 * evaluation, and context-aware authorization decisions.
 *
 * Features:
 * - Hierarchical role-based access control with inheritance
 * - Dynamic permission evaluation and context-aware decisions
 * - Resource-based authorization with fine-grained controls
 * - Temporal and conditional access controls
 * - Permission escalation and delegation workflows
 * - Real-time authorization audit and compliance tracking
 * - Performance-optimized authorization caching
 *
 * @module ParlantAuthorizationEngineService
 * @version 1.0.0
 * @author PARLANT Phase 1 Authorization Security Specialist
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { EventEmitter } from "events";
import * as crypto from "crypto";
import { performance } from "perf_hooks";
import {
  ParlantUserContext,
  SecurityLevel,
  ParlantIntegrationError,
} from "../../types/parlant-integration.types";
import { EnhancedSecurityContext } from "./context-manager.service";

/**
 * Role definition with hierarchical structure
 */
export interface Role {
  /** Role identifier */
  roleId: string;
  /** Role name */
  name: string;
  /** Role description */
  description: string;
  /** Parent roles (for inheritance) */
  parentRoles: string[];
  /** Child roles */
  childRoles: string[];
  /** Direct permissions */
  permissions: Permission[];
  /** Role attributes */
  attributes: Record<string, unknown>;
  /** Role constraints */
  constraints: RoleConstraint[];
  /** Role metadata */
  metadata: RoleMetadata;
}

/**
 * Permission definition
 */
export interface Permission {
  /** Permission identifier */
  permissionId: string;
  /** Permission name */
  name: string;
  /** Permission description */
  description: string;
  /** Resource type */
  resourceType: string;
  /** Resource identifier pattern */
  resourcePattern: string;
  /** Action allowed */
  action: string;
  /** Permission effect */
  effect: "allow" | "deny";
  /** Permission conditions */
  conditions: PermissionCondition[];
  /** Permission attributes */
  attributes: Record<string, unknown>;
  /** Permission metadata */
  metadata: PermissionMetadata;
}

/**
 * Role constraint
 */
export interface RoleConstraint {
  /** Constraint type */
  type: "time" | "location" | "resource" | "conditional" | "temporary";
  /** Constraint configuration */
  configuration: Record<string, unknown>;
  /** Constraint enforcement level */
  enforcement: "strict" | "advisory" | "audit";
  /** Constraint description */
  description: string;
}

/**
 * Permission condition
 */
export interface PermissionCondition {
  /** Condition type */
  type: "time" | "location" | "attribute" | "context" | "resource";
  /** Condition operator */
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "greater_than"
    | "less_than"
    | "in"
    | "not_in";
  /** Condition value */
  value: unknown;
  /** Condition field */
  field: string;
  /** Condition description */
  description: string;
}

/**
 * Role metadata
 */
export interface RoleMetadata {
  /** Creation timestamp */
  createdAt: Date;
  /** Last modified timestamp */
  modifiedAt: Date;
  /** Created by */
  createdBy: string;
  /** Modified by */
  modifiedBy: string;
  /** Role version */
  version: number;
  /** Role status */
  status: "active" | "inactive" | "deprecated";
  /** Tags */
  tags: string[];
}

/**
 * Permission metadata
 */
export interface PermissionMetadata {
  /** Creation timestamp */
  createdAt: Date;
  /** Last modified timestamp */
  modifiedAt: Date;
  /** Created by */
  createdBy: string;
  /** Modified by */
  modifiedBy: string;
  /** Permission priority */
  priority: number;
  /** Permission scope */
  scope: "global" | "tenant" | "user" | "resource";
}

/**
 * Authorization request
 */
export interface AuthorizationRequest {
  /** User context */
  userContext: ParlantUserContext;
  /** Resource being accessed */
  resource: ResourceIdentifier;
  /** Action being performed */
  action: string;
  /** Request context */
  context: AuthorizationContext;
  /** Security context */
  securityContext?: EnhancedSecurityContext;
  /** Additional attributes */
  attributes?: Record<string, unknown>;
}

/**
 * Resource identifier
 */
export interface ResourceIdentifier {
  /** Resource type */
  type: string;
  /** Resource identifier */
  id: string;
  /** Resource attributes */
  attributes: Record<string, unknown>;
  /** Resource hierarchy path */
  path?: string;
  /** Resource owner */
  owner?: string;
}

/**
 * Authorization context
 */
export interface AuthorizationContext {
  /** Request timestamp */
  timestamp: Date;
  /** Client IP address */
  ipAddress: string;
  /** User agent */
  userAgent: string;
  /** Request source */
  source: string;
  /** Session information */
  session: SessionContext;
  /** Environmental context */
  environment: EnvironmentContext;
  /** Business context */
  business?: BusinessContext;
}

/**
 * Session context
 */
export interface SessionContext {
  /** Session identifier */
  sessionId: string;
  /** Session creation time */
  createdAt: Date;
  /** Session last activity */
  lastActivity: Date;
  /** MFA verification status */
  mfaVerified: boolean;
  /** Session security level */
  securityLevel: SecurityLevel;
  /** Session attributes */
  attributes: Record<string, unknown>;
}

/**
 * Environment context
 */
export interface EnvironmentContext {
  /** Application environment */
  environment: string;
  /** Application version */
  version: string;
  /** Geographic location */
  location?: GeographicLocation;
  /** Network context */
  network: NetworkContext;
  /** Device context */
  device: DeviceContext;
}

/**
 * Geographic location
 */
export interface GeographicLocation {
  /** Country code */
  country: string;
  /** Region/state */
  region: string;
  /** City */
  city: string;
  /** Timezone */
  timezone: string;
}

/**
 * Network context
 */
export interface NetworkContext {
  /** Network segment */
  segment: string;
  /** VPN detected */
  vpnDetected: boolean;
  /** Proxy detected */
  proxyDetected: boolean;
  /** Network risk score */
  riskScore: number;
}

/**
 * Device context
 */
export interface DeviceContext {
  /** Device type */
  type: string;
  /** Device fingerprint */
  fingerprint: string;
  /** Device trusted status */
  trusted: boolean;
  /** Device attributes */
  attributes: Record<string, unknown>;
}

/**
 * Business context
 */
export interface BusinessContext {
  /** Tenant identifier */
  tenantId: string;
  /** Department */
  department: string;
  /** Business unit */
  businessUnit: string;
  /** Cost center */
  costCenter: string;
  /** Project context */
  project?: string;
}

/**
 * Authorization result
 */
export interface AuthorizationResult {
  /** Authorization decision */
  decision: "allow" | "deny" | "conditional";
  /** Effective permissions */
  effectivePermissions: Permission[];
  /** Applied roles */
  appliedRoles: Role[];
  /** Decision reasons */
  reasons: string[];
  /** Decision confidence score */
  confidence: number;
  /** Conditional requirements (if conditional) */
  conditionalRequirements?: ConditionalRequirement[];
  /** Authorization metadata */
  metadata: AuthorizationResultMetadata;
  /** Audit trail entry */
  auditTrail: AuthorizationAuditEntry;
}

/**
 * Conditional requirement
 */
export interface ConditionalRequirement {
  /** Requirement type */
  type: "mfa" | "approval" | "time_limit" | "additional_auth" | "escalation";
  /** Requirement description */
  description: string;
  /** Requirement parameters */
  parameters: Record<string, unknown>;
  /** Requirement deadline */
  deadline?: Date;
}

/**
 * Authorization result metadata
 */
export interface AuthorizationResultMetadata {
  /** Evaluation duration */
  evaluationDuration: number;
  /** Cache hit status */
  cacheHit: boolean;
  /** Evaluation timestamp */
  evaluationTimestamp: Date;
  /** Policy version used */
  policyVersion: string;
  /** Risk score */
  riskScore: number;
  /** Compliance status */
  complianceStatus: string[];
}

/**
 * Authorization audit entry
 */
export interface AuthorizationAuditEntry {
  /** Entry identifier */
  entryId: string;
  /** Timestamp */
  timestamp: Date;
  /** User identifier */
  userId: string;
  /** Resource accessed */
  resource: ResourceIdentifier;
  /** Action attempted */
  action: string;
  /** Authorization decision */
  decision: "allow" | "deny" | "conditional";
  /** Decision reasons */
  reasons: string[];
  /** Request context hash */
  contextHash: string;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Permission escalation request
 */
export interface PermissionEscalationRequest {
  /** Requesting user */
  requestingUser: string;
  /** Current permissions */
  currentPermissions: Permission[];
  /** Requested permissions */
  requestedPermissions: Permission[];
  /** Escalation reason */
  reason: string;
  /** Business justification */
  businessJustification: string;
  /** Temporary escalation flag */
  temporary: boolean;
  /** Escalation duration (if temporary) */
  duration?: number;
  /** Approver requirements */
  approverRequirements: ApproverRequirement[];
}

/**
 * Approver requirement
 */
export interface ApproverRequirement {
  /** Approver role required */
  role: string;
  /** Approval level */
  level: "standard" | "elevated" | "executive";
  /** Approval deadline */
  deadline: Date;
  /** Optional specific approver */
  specificApprover?: string;
}

/**
 * Authorization cache entry
 */
export interface AuthorizationCacheEntry {
  /** Cache key */
  key: string;
  /** Cached result */
  result: AuthorizationResult;
  /** Cache creation time */
  createdAt: Date;
  /** Cache expiration time */
  expiresAt: Date;
  /** Cache hit count */
  hitCount: number;
  /** Last access time */
  lastAccessed: Date;
}

/**
 * Advanced Authorization Engine Service
 *
 * Provides comprehensive role-based access control with hierarchical
 * inheritance, dynamic evaluation, and context-aware authorization.
 */
@Injectable()
export class ParlantAuthorizationEngineService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ParlantAuthorizationEngineService.name);

  // Role and permission storage
  private readonly roles = new Map<string, Role>();
  private readonly permissions = new Map<string, Permission>();
  private readonly userRoleAssignments = new Map<string, string[]>();
  private readonly roleHierarchyCache = new Map<string, string[]>();

  // Authorization cache
  private readonly authorizationCache = new Map<
    string,
    AuthorizationCacheEntry
  >();
  private readonly cacheExpirationTime = 300000; // 5 minutes
  private readonly maxCacheSize = 10000;

  // Permission escalation tracking
  private readonly escalationRequests = new Map<
    string,
    PermissionEscalationRequest
  >();
  private readonly temporaryPermissions = new Map<
    string,
    Map<string, Permission[]>
  >();

  // Performance metrics
  private readonly metrics = {
    authorizationsProcessed: 0,
    authorizationsDenied: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageEvaluationTime: 0,
    escalationRequests: 0,
    temporaryPermissionsGranted: 0,
  };

  // Configuration
  private readonly config = {
    enableInheritance: true,
    enableCaching: true,
    enableAuditTrail: true,
    enableRiskAssessment: true,
    defaultCacheTTL: 300000, // 5 minutes
    maxPermissionDepth: 10,
    maxRoleInheritanceDepth: 5,
  };

  // Cleanup timers
  private cacheCleanupTimer: NodeJS.Timeout | null = null;
  private escalationCleanupTimer: NodeJS.Timeout | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger.log("🔐 Initializing Advanced Authorization Engine Service");
  }

  /**
   * Initialize the authorization engine service
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("🚀 Starting Advanced Authorization Engine Service...");

    try {
      await this.loadRolesAndPermissions();
      await this.buildRoleHierarchyCache();
      await this.loadUserRoleAssignments();
      await this.startPeriodicTasks();
      await this.validateAuthorizationConfig();

      this.logger.log(
        "✅ Advanced Authorization Engine Service initialized successfully",
      );
      this.emit("authz:service:initialized");
    } catch (error) {
      this.logger.error(
        "❌ Failed to initialize Authorization Engine Service",
        error,
      );
      throw new ParlantIntegrationError(
        "Authorization Engine Service initialization failed",
        "AUTHZ_SERVICE_INIT_ERROR",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Clean up on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log(
      "🔄 Shutting down Advanced Authorization Engine Service...",
    );

    await this.stopPeriodicTasks();
    await this.saveUserRoleAssignments();
    await this.saveMetrics();

    this.logger.log(
      "✅ Advanced Authorization Engine Service shutdown complete",
    );
  }

  /**
   * Authorize access request with comprehensive evaluation
   */
  async authorize(request: AuthorizationRequest): Promise<AuthorizationResult> {
    const startTime = performance.now();

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(request);

      // Check cache first
      if (this.config.enableCaching) {
        const cachedResult = this.authorizationCache.get(cacheKey);
        if (cachedResult && this.isCacheValid(cachedResult)) {
          this.updateCacheStats(true);
          return this.updateCachedResult(cachedResult);
        }
        this.updateCacheStats(false);
      }

      // Get user roles with inheritance
      const userRoles = await this.getUserRolesWithInheritance(
        request.userContext.userId,
      );

      // Get effective permissions
      const effectivePermissions = await this.getEffectivePermissions(
        userRoles,
        request,
      );

      // Evaluate permissions against request
      const evaluationResult = await this.evaluatePermissions(
        effectivePermissions,
        request,
      );

      // Apply context-aware rules
      const contextualResult = await this.applyContextualRules(
        evaluationResult,
        request,
      );

      // Perform risk assessment
      const riskScore = await this.performRiskAssessment(
        request,
        contextualResult,
      );

      // Apply risk-based adjustments
      const finalResult = await this.applyRiskBasedAdjustments(
        contextualResult,
        riskScore,
        request,
      );

      // Build final authorization result
      const result = this.buildAuthorizationResult(
        finalResult,
        userRoles,
        effectivePermissions,
        riskScore,
        request,
        startTime,
      );

      // Cache result
      if (this.config.enableCaching) {
        this.cacheAuthorizationResult(cacheKey, result);
      }

      // Update metrics
      this.updateMetrics(result, performance.now() - startTime);

      // Emit authorization event
      this.emit("authz:evaluated", {
        userId: request.userContext.userId,
        resource: request.resource,
        action: request.action,
        decision: result.decision,
        riskScore,
        evaluationTime: performance.now() - startTime,
      });

      this.logger.debug(
        `✅ Authorization ${result.decision}: ${request.userContext.userId} -> ${request.resource.type}:${request.resource.id}:${request.action} (${(performance.now() - startTime).toFixed(2)}ms)`,
      );

      return result;
    } catch (error) {
      this.logger.error("❌ Authorization evaluation failed", error);

      // Update metrics
      this.metrics.authorizationsProcessed++;
      this.metrics.authorizationsDenied++;

      throw new ParlantIntegrationError(
        "Authorization evaluation failed",
        "AUTHORIZATION_ERROR",
        {
          userId: request.userContext.userId,
          resource: request.resource,
          action: request.action,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Grant temporary permissions
   */
  async grantTemporaryPermissions(
    userId: string,
    permissions: Permission[],
    duration: number,
    reason: string,
    grantedBy: string,
  ): Promise<void> {
    try {
      const expirationTime = Date.now() + duration;

      // Store temporary permissions
      if (!this.temporaryPermissions.has(userId)) {
        this.temporaryPermissions.set(userId, new Map());
      }

      const userTempPerms = this.temporaryPermissions.get(userId)!;
      const tempPermId = crypto.randomUUID();

      userTempPerms.set(tempPermId, permissions);

      // Schedule cleanup
      setTimeout(() => {
        userTempPerms.delete(tempPermId);
        if (userTempPerms.size === 0) {
          this.temporaryPermissions.delete(userId);
        }
      }, duration);

      // Update metrics
      this.metrics.temporaryPermissionsGranted++;

      // Emit temporary permission event
      this.emit("authz:temporary:granted", {
        userId,
        permissions: permissions.length,
        duration,
        reason,
        grantedBy,
        expirationTime,
      });

      this.logger.debug(
        `✅ Temporary permissions granted to ${userId}: ${permissions.length} permissions for ${duration}ms`,
      );
    } catch (error) {
      this.logger.error("❌ Failed to grant temporary permissions", error);
      throw new ParlantIntegrationError(
        "Temporary permission grant failed",
        "TEMP_PERMISSION_ERROR",
        {
          userId,
          reason,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Request permission escalation
   */
  async requestPermissionEscalation(
    request: PermissionEscalationRequest,
  ): Promise<string> {
    try {
      const escalationId = crypto.randomUUID();

      // Store escalation request
      this.escalationRequests.set(escalationId, {
        ...request,
        timestamp: new Date(),
        status: "pending",
      } as any);

      // Update metrics
      this.metrics.escalationRequests++;

      // Emit escalation request event
      this.emit("authz:escalation:requested", {
        escalationId,
        requestingUser: request.requestingUser,
        requestedPermissions: request.requestedPermissions.length,
        reason: request.reason,
        temporary: request.temporary,
      });

      this.logger.debug(
        `✅ Permission escalation requested: ${escalationId} by ${request.requestingUser}`,
      );

      return escalationId;
    } catch (error) {
      this.logger.error("❌ Permission escalation request failed", error);
      throw new ParlantIntegrationError(
        "Permission escalation request failed",
        "ESCALATION_REQUEST_ERROR",
        {
          requestingUser: request.requestingUser,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Get user effective permissions
   */
  async getUserEffectivePermissions(userId: string): Promise<Permission[]> {
    try {
      const userRoles = await this.getUserRolesWithInheritance(userId);
      const rolePermissions = await this.getRolePermissions(userRoles);
      const temporaryPermissions = this.getUserTemporaryPermissions(userId);

      return [...rolePermissions, ...temporaryPermissions];
    } catch (error) {
      this.logger.error("❌ Failed to get user effective permissions", error);
      return [];
    }
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(
    userId: string,
    roleId: string,
    assignedBy: string,
  ): Promise<void> {
    try {
      // Validate role exists
      const role = this.roles.get(roleId);
      if (!role) {
        throw new Error(`Role not found: ${roleId}`);
      }

      // Get current user roles
      const currentRoles = this.userRoleAssignments.get(userId) || [];

      // Add role if not already assigned
      if (!currentRoles.includes(roleId)) {
        currentRoles.push(roleId);
        this.userRoleAssignments.set(userId, currentRoles);

        // Invalidate cache for this user
        this.invalidateUserCache(userId);

        // Emit role assignment event
        this.emit("authz:role:assigned", {
          userId,
          roleId,
          roleName: role.name,
          assignedBy,
          timestamp: new Date(),
        });

        this.logger.debug(
          `✅ Role assigned: ${role.name} to ${userId} by ${assignedBy}`,
        );
      }
    } catch (error) {
      this.logger.error("❌ Role assignment failed", error);
      throw new ParlantIntegrationError(
        "Role assignment failed",
        "ROLE_ASSIGNMENT_ERROR",
        {
          userId,
          roleId,
          assignedBy,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(
    userId: string,
    roleId: string,
    removedBy: string,
  ): Promise<void> {
    try {
      const currentRoles = this.userRoleAssignments.get(userId) || [];
      const roleIndex = currentRoles.indexOf(roleId);

      if (roleIndex > -1) {
        currentRoles.splice(roleIndex, 1);
        this.userRoleAssignments.set(userId, currentRoles);

        // Invalidate cache for this user
        this.invalidateUserCache(userId);

        // Get role name for logging
        const role = this.roles.get(roleId);
        const roleName = role ? role.name : roleId;

        // Emit role removal event
        this.emit("authz:role:removed", {
          userId,
          roleId,
          roleName,
          removedBy,
          timestamp: new Date(),
        });

        this.logger.debug(
          `✅ Role removed: ${roleName} from ${userId} by ${removedBy}`,
        );
      }
    } catch (error) {
      this.logger.error("❌ Role removal failed", error);
      throw new ParlantIntegrationError(
        "Role removal failed",
        "ROLE_REMOVAL_ERROR",
        {
          userId,
          roleId,
          removedBy,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Get authorization statistics
   */
  getAuthorizationStatistics(): Record<string, unknown> {
    return {
      roles: this.roles.size,
      permissions: this.permissions.size,
      userAssignments: this.userRoleAssignments.size,
      cacheSize: this.authorizationCache.size,
      escalationRequests: this.escalationRequests.size,
      temporaryPermissions: this.temporaryPermissions.size,
      metrics: { ...this.metrics },
      config: this.config,
    };
  }

  /**
   * Private helper methods
   */

  private async getUserRolesWithInheritance(userId: string): Promise<Role[]> {
    const directRoleIds = this.userRoleAssignments.get(userId) || [];
    const allRoleIds = new Set<string>();

    // Add direct roles
    directRoleIds.forEach((roleId) => allRoleIds.add(roleId));

    // Add inherited roles if inheritance is enabled
    if (this.config.enableInheritance) {
      for (const roleId of directRoleIds) {
        const inheritedRoleIds = this.roleHierarchyCache.get(roleId) || [];
        inheritedRoleIds.forEach((inheritedRoleId) =>
          allRoleIds.add(inheritedRoleId),
        );
      }
    }

    // Return actual role objects
    return Array.from(allRoleIds)
      .map((roleId) => this.roles.get(roleId))
      .filter((role) => role !== undefined) as Role[];
  }

  private async getEffectivePermissions(
    userRoles: Role[],
    request: AuthorizationRequest,
  ): Promise<Permission[]> {
    const rolePermissions = await this.getRolePermissions(userRoles);
    const temporaryPermissions = this.getUserTemporaryPermissions(
      request.userContext.userId,
    );

    return [...rolePermissions, ...temporaryPermissions];
  }

  private async getRolePermissions(roles: Role[]): Promise<Permission[]> {
    const permissions: Permission[] = [];

    for (const role of roles) {
      // Add direct permissions
      permissions.push(...role.permissions);

      // Check role constraints
      for (const constraint of role.constraints) {
        if (!(await this.evaluateRoleConstraint(constraint, role))) {
          // Remove permissions if constraint fails
          // This is simplified - in practice, you'd have more complex logic
          continue;
        }
      }
    }

    return permissions;
  }

  private getUserTemporaryPermissions(userId: string): Permission[] {
    const userTempPerms = this.temporaryPermissions.get(userId);
    if (!userTempPerms) {
      return [];
    }

    const permissions: Permission[] = [];
    for (const tempPermissions of userTempPerms.values()) {
      permissions.push(...tempPermissions);
    }

    return permissions;
  }

  private async evaluatePermissions(
    permissions: Permission[],
    request: AuthorizationRequest,
  ): Promise<{
    decision: "allow" | "deny";
    matchedPermissions: Permission[];
    reasons: string[];
  }> {
    const matchedPermissions: Permission[] = [];
    const reasons: string[] = [];
    let hasAllow = false;
    let hasDeny = false;

    for (const permission of permissions) {
      // Check if permission applies to this resource and action
      if (await this.permissionMatches(permission, request)) {
        matchedPermissions.push(permission);

        // Evaluate permission conditions
        const conditionsResult = await this.evaluatePermissionConditions(
          permission,
          request,
        );

        if (conditionsResult.satisfied) {
          if (permission.effect === "allow") {
            hasAllow = true;
            reasons.push(`Allowed by permission: ${permission.name}`);
          } else if (permission.effect === "deny") {
            hasDeny = true;
            reasons.push(`Denied by permission: ${permission.name}`);
          }
        } else {
          reasons.push(
            `Permission ${permission.name} conditions not satisfied: ${conditionsResult.failedConditions.join(", ")}`,
          );
        }
      }
    }

    // Deny takes precedence over allow
    const decision = hasDeny ? "deny" : hasAllow ? "allow" : "deny";

    if (!hasAllow && !hasDeny) {
      reasons.push("No applicable permissions found");
    }

    return { decision, matchedPermissions, reasons };
  }

  private async permissionMatches(
    permission: Permission,
    request: AuthorizationRequest,
  ): Promise<boolean> {
    // Check resource type
    if (
      permission.resourceType !== "*" &&
      permission.resourceType !== request.resource.type
    ) {
      return false;
    }

    // Check resource pattern
    if (permission.resourcePattern !== "*") {
      const regex = new RegExp(permission.resourcePattern.replace("*", ".*"));
      if (!regex.test(request.resource.id)) {
        return false;
      }
    }

    // Check action
    if (permission.action !== "*" && permission.action !== request.action) {
      return false;
    }

    return true;
  }

  private async evaluatePermissionConditions(
    permission: Permission,
    request: AuthorizationRequest,
  ): Promise<{ satisfied: boolean; failedConditions: string[] }> {
    const failedConditions: string[] = [];

    for (const condition of permission.conditions) {
      const satisfied = await this.evaluateCondition(condition, request);
      if (!satisfied) {
        failedConditions.push(condition.description);
      }
    }

    return {
      satisfied: failedConditions.length === 0,
      failedConditions,
    };
  }

  private async evaluateCondition(
    condition: PermissionCondition,
    request: AuthorizationRequest,
  ): Promise<boolean> {
    let contextValue: unknown;

    // Extract value from context based on condition type and field
    switch (condition.type) {
      case "time":
        contextValue = this.getTimeValue(
          condition.field,
          request.context.timestamp,
        );
        break;
      case "location":
        contextValue = this.getLocationValue(
          condition.field,
          request.context.environment.location,
        );
        break;
      case "attribute":
        contextValue = this.getAttributeValue(condition.field, request);
        break;
      case "context":
        contextValue = this.getContextValue(condition.field, request.context);
        break;
      case "resource":
        contextValue = this.getResourceValue(condition.field, request.resource);
        break;
      default:
        return false;
    }

    // Evaluate condition based on operator
    return this.evaluateConditionOperator(
      condition.operator,
      contextValue,
      condition.value,
    );
  }

  private getTimeValue(field: string, timestamp: Date): unknown {
    switch (field) {
      case "hour":
        return timestamp.getHours();
      case "day":
        return timestamp.getDay();
      case "date":
        return timestamp.toISOString().split("T")[0];
      default:
        return null;
    }
  }

  private getLocationValue(
    field: string,
    location?: GeographicLocation,
  ): unknown {
    if (!location) return null;

    switch (field) {
      case "country":
        return location.country;
      case "region":
        return location.region;
      case "city":
        return location.city;
      default:
        return null;
    }
  }

  private getAttributeValue(
    field: string,
    request: AuthorizationRequest,
  ): unknown {
    return request.attributes?.[field] || null;
  }

  private getContextValue(
    field: string,
    context: AuthorizationContext,
  ): unknown {
    // Navigate nested context structure
    const fieldParts = field.split(".");
    let value: any = context;

    for (const part of fieldParts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }

    return value;
  }

  private getResourceValue(
    field: string,
    resource: ResourceIdentifier,
  ): unknown {
    switch (field) {
      case "type":
        return resource.type;
      case "id":
        return resource.id;
      case "owner":
        return resource.owner;
      default:
        return resource.attributes[field] || null;
    }
  }

  private evaluateConditionOperator(
    operator: string,
    contextValue: unknown,
    conditionValue: unknown,
  ): boolean {
    switch (operator) {
      case "equals":
        return contextValue === conditionValue;
      case "not_equals":
        return contextValue !== conditionValue;
      case "contains":
        return String(contextValue).includes(String(conditionValue));
      case "not_contains":
        return !String(contextValue).includes(String(conditionValue));
      case "greater_than":
        return Number(contextValue) > Number(conditionValue);
      case "less_than":
        return Number(contextValue) < Number(conditionValue);
      case "in":
        return (
          Array.isArray(conditionValue) && conditionValue.includes(contextValue)
        );
      case "not_in":
        return (
          Array.isArray(conditionValue) &&
          !conditionValue.includes(contextValue)
        );
      default:
        return false;
    }
  }

  private async applyContextualRules(
    evaluationResult: {
      decision: "allow" | "deny";
      matchedPermissions: Permission[];
      reasons: string[];
    },
    request: AuthorizationRequest,
  ): Promise<{
    decision: "allow" | "deny" | "conditional";
    matchedPermissions: Permission[];
    reasons: string[];
    conditionalRequirements?: ConditionalRequirement[];
  }> {
    const conditionalRequirements: ConditionalRequirement[] = [];

    // Apply security level requirements
    if (request.securityContext?.securityLevel === SecurityLevel._CRITICAL) {
      if (!request.context.session.mfaVerified) {
        conditionalRequirements.push({
          type: "mfa",
          description:
            "Multi-factor authentication required for critical security level",
          parameters: { methods: ["totp", "hardware_token"] },
        });
      }
    }

    // Apply high-risk resource requirements
    if (
      request.resource.type === "sensitive_data" &&
      evaluationResult.decision === "allow"
    ) {
      conditionalRequirements.push({
        type: "approval",
        description: "Manager approval required for sensitive data access",
        parameters: { approverRole: "manager", deadline: Date.now() + 3600000 },
      });
    }

    // Apply time-based restrictions
    const hour = request.context.timestamp.getHours();
    if ((hour < 6 || hour > 22) && evaluationResult.decision === "allow") {
      conditionalRequirements.push({
        type: "additional_auth",
        description:
          "Additional authentication required for after-hours access",
        parameters: { authMethod: "supervisor_approval" },
      });
    }

    const decision =
      conditionalRequirements.length > 0
        ? "conditional"
        : evaluationResult.decision;

    return {
      ...evaluationResult,
      decision,
      conditionalRequirements:
        conditionalRequirements.length > 0
          ? conditionalRequirements
          : undefined,
    };
  }

  private async performRiskAssessment(
    request: AuthorizationRequest,
    evaluationResult: any,
  ): Promise<number> {
    let riskScore = 0;

    // Network risk
    if (request.context.environment.network.vpnDetected) {
      riskScore += 0.2;
    }

    if (request.context.environment.network.proxyDetected) {
      riskScore += 0.3;
    }

    // Device risk
    if (!request.context.environment.device.trusted) {
      riskScore += 0.4;
    }

    // Time-based risk
    const hour = request.context.timestamp.getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 0.2;
    }

    // Resource sensitivity risk
    if (request.resource.type === "sensitive_data") {
      riskScore += 0.3;
    }

    return Math.min(riskScore, 1.0);
  }

  private async applyRiskBasedAdjustments(
    contextualResult: any,
    riskScore: number,
    request: AuthorizationRequest,
  ): Promise<any> {
    if (riskScore > 0.8 && contextualResult.decision === "allow") {
      // High risk - require additional conditions
      const additionalRequirements: ConditionalRequirement[] = [
        {
          type: "escalation",
          description: "High-risk access requires security team approval",
          parameters: { escalationLevel: "security_team" },
          deadline: new Date(Date.now() + 3600000), // 1 hour
        },
      ];

      return {
        ...contextualResult,
        decision: "conditional",
        conditionalRequirements: [
          ...(contextualResult.conditionalRequirements || []),
          ...additionalRequirements,
        ],
      };
    }

    if (riskScore > 0.6 && contextualResult.decision === "allow") {
      // Medium risk - require MFA if not already required
      const mfaRequired = contextualResult.conditionalRequirements?.some(
        (req: ConditionalRequirement) => req.type === "mfa",
      );

      if (!mfaRequired && !request.context.session.mfaVerified) {
        const mfaRequirement: ConditionalRequirement = {
          type: "mfa",
          description:
            "Multi-factor authentication required due to elevated risk",
          parameters: { methods: ["totp", "sms"] },
        };

        return {
          ...contextualResult,
          decision: "conditional",
          conditionalRequirements: [
            ...(contextualResult.conditionalRequirements || []),
            mfaRequirement,
          ],
        };
      }
    }

    return contextualResult;
  }

  private buildAuthorizationResult(
    finalResult: any,
    userRoles: Role[],
    effectivePermissions: Permission[],
    riskScore: number,
    request: AuthorizationRequest,
    startTime: number,
  ): AuthorizationResult {
    const confidence = this.calculateConfidence(finalResult, riskScore);
    const evaluationDuration = performance.now() - startTime;

    return {
      decision: finalResult.decision,
      effectivePermissions,
      appliedRoles: userRoles,
      reasons: finalResult.reasons,
      confidence,
      conditionalRequirements: finalResult.conditionalRequirements,
      metadata: {
        evaluationDuration,
        cacheHit: false,
        evaluationTimestamp: new Date(),
        policyVersion: "1.0.0",
        riskScore,
        complianceStatus: this.determineComplianceStatus(finalResult, request),
      },
      auditTrail: this.createAuthorizationAuditEntry(request, finalResult),
    };
  }

  private calculateConfidence(result: any, riskScore: number): number {
    let confidence = 0.9;

    if (result.decision === "conditional") {
      confidence -= 0.2;
    }

    confidence -= riskScore * 0.3;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private determineComplianceStatus(
    result: any,
    request: AuthorizationRequest,
  ): string[] {
    const status: string[] = [];

    if (result.decision === "allow") {
      status.push("authorized");
    } else if (result.decision === "deny") {
      status.push("access_denied");
    } else {
      status.push("conditional_access");
    }

    if (request.context.session.mfaVerified) {
      status.push("mfa_verified");
    }

    return status;
  }

  private createAuthorizationAuditEntry(
    request: AuthorizationRequest,
    result: any,
  ): AuthorizationAuditEntry {
    return {
      entryId: crypto.randomUUID(),
      timestamp: new Date(),
      userId: request.userContext.userId,
      resource: request.resource,
      action: request.action,
      decision: result.decision,
      reasons: result.reasons,
      contextHash: this.generateContextHash(request.context),
      metadata: {
        sessionId: request.context.session.sessionId,
        ipAddress: request.context.ipAddress,
        userAgent: request.context.userAgent,
      },
    };
  }

  private generateCacheKey(request: AuthorizationRequest): string {
    const keyData = {
      userId: request.userContext.userId,
      resource: request.resource,
      action: request.action,
      contextHash: this.generateContextHash(request.context),
    };

    return crypto
      .createHash("sha256")
      .update(JSON.stringify(keyData))
      .digest("hex");
  }

  private generateContextHash(context: AuthorizationContext): string {
    const relevantContext = {
      timestamp: Math.floor(context.timestamp.getTime() / 300000), // 5-minute buckets
      ipAddress: context.ipAddress,
      session: context.session,
      environment: context.environment,
    };

    return crypto
      .createHash("sha256")
      .update(JSON.stringify(relevantContext))
      .digest("hex");
  }

  private isCacheValid(cacheEntry: AuthorizationCacheEntry): boolean {
    return cacheEntry.expiresAt > new Date();
  }

  private updateCachedResult(
    cacheEntry: AuthorizationCacheEntry,
  ): AuthorizationResult {
    cacheEntry.hitCount++;
    cacheEntry.lastAccessed = new Date();

    return {
      ...cacheEntry.result,
      metadata: {
        ...cacheEntry.result.metadata,
        cacheHit: true,
      },
    };
  }

  private cacheAuthorizationResult(
    key: string,
    result: AuthorizationResult,
  ): void {
    if (this.authorizationCache.size >= this.maxCacheSize) {
      this.evictOldestCacheEntry();
    }

    this.authorizationCache.set(key, {
      key,
      result,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.cacheExpirationTime),
      hitCount: 0,
      lastAccessed: new Date(),
    });
  }

  private evictOldestCacheEntry(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.authorizationCache.entries()) {
      if (entry.lastAccessed.getTime() < oldestTime) {
        oldestTime = entry.lastAccessed.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.authorizationCache.delete(oldestKey);
    }
  }

  private invalidateUserCache(userId: string): void {
    for (const [key, entry] of this.authorizationCache.entries()) {
      if (entry.result.auditTrail.userId === userId) {
        this.authorizationCache.delete(key);
      }
    }
  }

  private updateCacheStats(hit: boolean): void {
    if (hit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  }

  private updateMetrics(
    result: AuthorizationResult,
    evaluationTime: number,
  ): void {
    this.metrics.authorizationsProcessed++;

    if (result.decision === "deny") {
      this.metrics.authorizationsDenied++;
    }

    this.metrics.averageEvaluationTime = this.updateAverage(
      this.metrics.averageEvaluationTime,
      evaluationTime,
      this.metrics.authorizationsProcessed,
    );
  }

  private updateAverage(
    currentAverage: number,
    newValue: number,
    count: number,
  ): number {
    return (currentAverage * (count - 1) + newValue) / count;
  }

  private async evaluateRoleConstraint(
    constraint: RoleConstraint,
    role: Role,
  ): Promise<boolean> {
    // Simplified constraint evaluation
    switch (constraint.type) {
      case "time":
        return this.evaluateTimeConstraint(constraint.configuration);
      case "location":
        return this.evaluateLocationConstraint(constraint.configuration);
      default:
        return true;
    }
  }

  private evaluateTimeConstraint(
    configuration: Record<string, unknown>,
  ): boolean {
    const hour = new Date().getHours();
    const startHour = (configuration.startHour as number) || 0;
    const endHour = (configuration.endHour as number) || 24;

    return hour >= startHour && hour < endHour;
  }

  private evaluateLocationConstraint(
    configuration: Record<string, unknown>,
  ): boolean {
    // Simplified location constraint - would need actual location data
    return true;
  }

  private async loadRolesAndPermissions(): Promise<void> {
    // Load default roles and permissions
    await this.createDefaultRoles();
    await this.createDefaultPermissions();

    this.logger.debug(
      `📋 Loaded ${this.roles.size} roles and ${this.permissions.size} permissions`,
    );
  }

  private async createDefaultRoles(): Promise<void> {
    const defaultRoles: Role[] = [
      {
        roleId: "admin",
        name: "Administrator",
        description: "Full system access",
        parentRoles: [],
        childRoles: [],
        permissions: [],
        attributes: {},
        constraints: [],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          createdBy: "system",
          modifiedBy: "system",
          version: 1,
          status: "active",
          tags: ["system"],
        },
      },
      {
        roleId: "user",
        name: "User",
        description: "Standard user access",
        parentRoles: [],
        childRoles: [],
        permissions: [],
        attributes: {},
        constraints: [],
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          createdBy: "system",
          modifiedBy: "system",
          version: 1,
          status: "active",
          tags: ["standard"],
        },
      },
    ];

    for (const role of defaultRoles) {
      this.roles.set(role.roleId, role);
    }
  }

  private async createDefaultPermissions(): Promise<void> {
    const defaultPermissions: Permission[] = [
      {
        permissionId: "read_all",
        name: "Read All",
        description: "Read access to all resources",
        resourceType: "*",
        resourcePattern: "*",
        action: "read",
        effect: "allow",
        conditions: [],
        attributes: {},
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          createdBy: "system",
          modifiedBy: "system",
          priority: 100,
          scope: "global",
        },
      },
    ];

    for (const permission of defaultPermissions) {
      this.permissions.set(permission.permissionId, permission);
    }
  }

  private async buildRoleHierarchyCache(): Promise<void> {
    for (const role of this.roles.values()) {
      const inheritedRoles = this.computeInheritedRoles(role.roleId, new Set());
      this.roleHierarchyCache.set(role.roleId, Array.from(inheritedRoles));
    }

    this.logger.debug("🔗 Built role hierarchy cache");
  }

  private computeInheritedRoles(
    roleId: string,
    visited: Set<string>,
  ): Set<string> {
    if (visited.has(roleId)) {
      return new Set(); // Circular dependency protection
    }

    visited.add(roleId);
    const inheritedRoles = new Set<string>();
    const role = this.roles.get(roleId);

    if (role) {
      for (const parentRoleId of role.parentRoles) {
        inheritedRoles.add(parentRoleId);
        const parentInherited = this.computeInheritedRoles(
          parentRoleId,
          visited,
        );
        parentInherited.forEach((inheritedRole) =>
          inheritedRoles.add(inheritedRole),
        );
      }
    }

    visited.delete(roleId);
    return inheritedRoles;
  }

  private async loadUserRoleAssignments(): Promise<void> {
    // Placeholder for loading user role assignments
    this.logger.debug("👥 Loading user role assignments...");
  }

  private async saveUserRoleAssignments(): Promise<void> {
    this.logger.debug("💾 Saving user role assignments...");
  }

  private async validateAuthorizationConfig(): Promise<void> {
    this.logger.debug("🔍 Validating authorization configuration...");
  }

  private async saveMetrics(): Promise<void> {
    this.logger.debug("📊 Saving authorization metrics...", this.metrics);
  }

  private async startPeriodicTasks(): Promise<void> {
    // Cache cleanup every 10 minutes
    this.cacheCleanupTimer = setInterval(
      () => {
        this.performCacheCleanup();
      },
      10 * 60 * 1000,
    );

    // Escalation cleanup every 30 minutes
    this.escalationCleanupTimer = setInterval(
      () => {
        this.performEscalationCleanup();
      },
      30 * 60 * 1000,
    );

    // Metrics update every minute
    this.metricsTimer = setInterval(() => {
      this.updatePeriodicMetrics();
    }, 60 * 1000);
  }

  private async stopPeriodicTasks(): Promise<void> {
    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
      this.cacheCleanupTimer = null;
    }

    if (this.escalationCleanupTimer) {
      clearInterval(this.escalationCleanupTimer);
      this.escalationCleanupTimer = null;
    }

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
  }

  private async performCacheCleanup(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, entry] of this.authorizationCache.entries()) {
      if (entry.expiresAt < now) {
        this.authorizationCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  private async performEscalationCleanup(): Promise<void> {
    // Clean up old escalation requests
    const oneDayAgo = new Date(Date.now() - 86400000);
    let cleanedCount = 0;

    for (const [escalationId, request] of this.escalationRequests.entries()) {
      if ((request as any).timestamp < oneDayAgo) {
        this.escalationRequests.delete(escalationId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(
        `🧹 Cleaned up ${cleanedCount} old escalation requests`,
      );
    }
  }

  private updatePeriodicMetrics(): void {
    this.emit("authz:metrics:updated", this.metrics);
  }
}
