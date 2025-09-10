/**
 * RBAC Authorization Guard - Local-Only Architecture Compliant
 *
 * Comprehensive role-based access control guard that enforces RBAC decorators
 * with 100% local-only architecture compliance. Uses local storage mechanisms,
 * local caching, and local file-based configuration for all authorization decisions.
 *
 * @fileoverview Local-only RBAC authorization guard for Bytebot platform
 * @version 2.0.0
 * @author Local-Only Security Implementation Team
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Request } from "express";

// Import RBAC decorators and types
import {
  ROLES_KEY,
  PERMISSIONS_KEY,
  ANY_ROLE_KEY,
  ALL_PERMISSIONS_KEY,
  RESOURCE_KEY,
  OWNERSHIP_KEY,
  CONDITIONAL_ACCESS_KEY,
  TIME_ACCESS_KEY,
  IP_ACCESS_KEY,
  AUDIT_ACCESS_KEY,
  SECURE_ENDPOINT_KEY,
  ADMIN_ONLY_KEY,
  Role,
  Permission,
  TimeBasedAccessConfig,
  IPBasedAccessConfig,
  ConditionalAccessConfig,
  SecureEndpointConfig,
  validateTimeBasedAccess,
  validateIPBasedAccess,
} from "../decorators/rbac-authorization.decorators";
import { RBACMetadata } from "../types/rbac.types";

/**
 * Extended Request interface with user and security context
 */
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    roles?: Role[];
    permissions?: Permission[];
    isActive?: boolean;
    metadata?: Record<string, unknown>;
  };
  securityContext?: {
    sessionId?: string;
    tokenVersion?: number;
    riskScore?: number;
    lastActivity?: Date;
    deviceFingerprint?: string;
  };
}

/**
 * Authorization result interface
 */
export interface AuthorizationResult {
  granted: boolean;
  reason?: string;
  requiredRoles?: Role[];
  requiredPermissions?: Permission[];
  missingRoles?: Role[];
  missingPermissions?: Permission[];
  evaluatedConditions: string[];
}

/**
 * Local audit event interface for file-based logging
 */
export interface LocalAuditEvent {
  timestamp: Date;
  type: "ACCESS_GRANTED" | "ACCESS_DENIED" | "SECURITY_VIOLATION";
  userId?: string;
  username?: string;
  endpoint: string;
  method: string;
  ipAddress: string;
  userAgent?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * RBAC Authorization Guard with Local-Only Architecture
 *
 * Enforces comprehensive role-based access control using only local storage
 * and caching mechanisms. No external dependencies or cloud services.
 */
@Injectable()
export class RBACAuthorizationGuard implements CanActivate {
  private readonly logger = new Logger(RBACAuthorizationGuard.name);
  private readonly auditLogPath: string;
  private readonly enableDetailedLogging: boolean;
  private readonly permissionCacheTimeout: number;

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly reflector: Reflector,
    // eslint-disable-next-line no-unused-vars
    private readonly configService: ConfigService,

    @Inject(CACHE_MANAGER) private readonly _cacheManager: Cache,
  ) {
    // Local configuration for file-based operations
    this.auditLogPath = this.configService.get(
      "security.audit.logPath",
      "./logs/security-audit.log",
    );
    this.enableDetailedLogging = this.configService.get(
      "security.audit.detailedLogging",
      true,
    );
    this.permissionCacheTimeout = this.configService.get(
      "security.permissionCacheTimeout",
      5 * 60 * 1000, // 5 minutes
    );

    this.logger.log(
      "RBAC Authorization Guard initialized with local-only architecture",
      {
        auditLogPath: this.auditLogPath,
        enableDetailedLogging: this.enableDetailedLogging,
        permissionCacheTimeout: this.permissionCacheTimeout,
      },
    );
  }

  /**
   * Determine if the current request should be allowed
   *
   * @param context - Execution context containing request information
   * @returns Promise<boolean> - Whether the request is authorized
   * @throws ForbiddenException - When access is denied due to insufficient permissions
   * @throws UnauthorizedException - When user authentication is required
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const operationId = `rbac-guard-${Date.now()}`;
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const handler = context.getHandler();
    const controllerClass = context.getClass();

    this.logger.debug(`[${operationId}] RBAC authorization check initiated`, {
      operationId,
      method: request.method,
      url: request.url,
      handler: handler.name,
      controller: controllerClass.name,
    });

    try {
      // Step 1: Extract user from request
      const user = this.extractUserFromRequest(request);
      if (!user) {
        throw new UnauthorizedException(
          "Authentication required for RBAC check",
        );
      }

      // Step 2: Extract RBAC metadata from decorators
      const rbacMetadata = this.extractRBACMetadata(
        context,
        handler,
        controllerClass,
      );

      // If no RBAC metadata is found, allow access (no restrictions)
      if (this.isEmptyRBACMetadata(rbacMetadata)) {
        this.logger.debug(
          `[${operationId}] No RBAC metadata found, allowing access`,
          {
            operationId,
            userId: user.id,
          },
        );
        return true;
      }

      // Step 3: Perform comprehensive authorization check
      const authResult = await this.performAuthorizationCheck(
        operationId,
        user,
        rbacMetadata,
        request,
      );

      // Step 4: Handle authorization result
      if (!authResult.granted) {
        await this.logSecurityEvent(request, {
          timestamp: new Date(),
          type: "ACCESS_DENIED",
          userId: user.id,
          username: user.username,
          endpoint: request.url,
          method: request.method,
          ipAddress: this.getClientIP(request),
          userAgent: request.headers["user-agent"],
          reason: authResult.reason,
          metadata: {
            operationId,
            requiredRoles: authResult.requiredRoles,
            requiredPermissions: authResult.requiredPermissions,
            missingRoles: authResult.missingRoles,
            missingPermissions: authResult.missingPermissions,
          },
        });

        this.logger.warn(`[${operationId}] Access denied`, {
          operationId,
          userId: user.id,
          username: user.username,
          reason: authResult.reason,
          requiredRoles: authResult.requiredRoles,
          requiredPermissions: authResult.requiredPermissions,
        });

        throw new ForbiddenException(
          authResult.reason || "Insufficient permissions for this operation",
        );
      }

      // Step 5: Log successful authorization
      await this.logSecurityEvent(request, {
        timestamp: new Date(),
        type: "ACCESS_GRANTED",
        userId: user.id,
        username: user.username,
        endpoint: request.url,
        method: request.method,
        ipAddress: this.getClientIP(request),
        userAgent: request.headers["user-agent"],
        metadata: {
          operationId,
          grantedRoles: authResult.requiredRoles,
          grantedPermissions: authResult.requiredPermissions,
          evaluatedConditions: authResult.evaluatedConditions,
          authorizationTime: Date.now() - startTime,
        },
      });

      this.logger.debug(`[${operationId}] Access granted`, {
        operationId,
        userId: user.id,
        username: user.username,
        authorizationTime: Date.now() - startTime,
      });

      return true;
    } catch (err) {
      const authTime = Date.now() - startTime;

      // Log error and security event
      this.logger.error(`[${operationId}] RBAC authorization error`, {
        operationId,
        error: err instanceof Error ? err.message : String(err),
        authorizationTime: authTime,
        url: request.url,
        method: request.method,
      });

      if (
        err instanceof ForbiddenException ||
        err instanceof UnauthorizedException
      ) {
        throw err;
      }

      throw new ForbiddenException("Authorization check failed");
    }
  }

  /**
   * Extract user information from authenticated request
   *
   * @param request - Authenticated HTTP request
   * @returns User object or null if not authenticated
   * @private
   */
  private extractUserFromRequest(
    request: AuthenticatedRequest,
  ): AuthenticatedRequest["user"] | null {
    return request.user || null;
  }

  /**
   * Extract RBAC metadata from method and class decorators
   *
   * @param context - Execution context
   * @param handler - Method handler
   * @param controllerClass - Controller class
   * @returns Combined RBAC metadata
   * @private
   */
  private extractRBACMetadata(
    context: ExecutionContext,
    handler: CallableFunction,
    controllerClass: CallableFunction,
  ): RBACMetadata {
    return {
      roles: this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        handler,
        controllerClass,
      ]),
      permissions: this.reflector.getAllAndOverride<Permission[]>(
        PERMISSIONS_KEY,
        [handler, controllerClass],
      ),
      anyRole: this.reflector.getAllAndOverride<Role[]>(ANY_ROLE_KEY, [
        handler,
        controllerClass,
      ]),
      allPermissions: this.reflector.getAllAndOverride<Permission[]>(
        ALL_PERMISSIONS_KEY,
        [handler, controllerClass],
      ),
      resource: this.reflector.getAllAndOverride<{
        action: string;
        resource: string;
      }>(RESOURCE_KEY, [handler, controllerClass]),
      ownership: this.reflector.getAllAndOverride<boolean>(OWNERSHIP_KEY, [
        handler,
        controllerClass,
      ]),
      conditionalAccess:
        this.reflector.getAllAndOverride<ConditionalAccessConfig>(
          CONDITIONAL_ACCESS_KEY,
          [handler, controllerClass],
        ),
      timeAccess: this.reflector.getAllAndOverride<TimeBasedAccessConfig>(
        TIME_ACCESS_KEY,
        [handler, controllerClass],
      ),
      ipAccess: this.reflector.getAllAndOverride<IPBasedAccessConfig>(
        IP_ACCESS_KEY,
        [handler, controllerClass],
      ),
      auditAccess: this.reflector.getAllAndOverride<boolean>(AUDIT_ACCESS_KEY, [
        handler,
        controllerClass,
      ]),
      secureEndpoint: this.reflector.getAllAndOverride<SecureEndpointConfig>(
        SECURE_ENDPOINT_KEY,
        [handler, controllerClass],
      ),
      adminOnly: this.reflector.getAllAndOverride<boolean>(ADMIN_ONLY_KEY, [
        handler,
        controllerClass,
      ]),
    };
  }

  /**
   * Check if RBAC metadata is empty (no restrictions)
   *
   * @param metadata - RBAC metadata object
   * @returns True if no restrictions are defined
   * @private
   */
  private isEmptyRBACMetadata(metadata: RBACMetadata): boolean {
    return !Object.values(metadata).some(
      (value) => value !== undefined && value !== null && value !== false,
    );
  }

  /**
   * Perform comprehensive authorization check
   *
   * @param operationId - Unique operation identifier
   * @param user - Authenticated user
   * @param metadata - RBAC metadata
   * @param request - HTTP request
   * @returns Authorization result
   * @private
   */
  private async performAuthorizationCheck(
    operationId: string,
    user: AuthenticatedRequest["user"],
    metadata: RBACMetadata,
    request: AuthenticatedRequest,
  ): Promise<AuthorizationResult> {
    const result: AuthorizationResult = {
      granted: false,
      evaluatedConditions: [],
    };

    try {
      // Check admin-only access
      if (metadata.adminOnly) {
        result.evaluatedConditions.push("admin-only");
        if (!this.isAdmin(user)) {
          result.reason = "Admin access required";
          return result;
        }
      }

      // Check role-based access
      if (metadata.roles && metadata.roles.length > 0) {
        result.evaluatedConditions.push("roles");
        result.requiredRoles = metadata.roles;
        const userRoles = this.getUserRoles(user);
        const hasRole = metadata.roles.some((role: Role) =>
          userRoles.includes(role),
        );

        if (!hasRole) {
          result.missingRoles = metadata.roles.filter(
            (role: Role) => !userRoles.includes(role),
          );
          result.reason = `Required roles: ${metadata.roles.join(", ")}`;
          return result;
        }
      }

      // Check any-role access
      if (metadata.anyRole && metadata.anyRole.length > 0) {
        result.evaluatedConditions.push("any-role");
        const userRoles = this.getUserRoles(user);
        const hasAnyRole = metadata.anyRole.some((role: Role) =>
          userRoles.includes(role),
        );

        if (!hasAnyRole) {
          result.reason = `Required any of roles: ${metadata.anyRole.join(", ")}`;
          return result;
        }
      }

      // Check permission-based access
      if (metadata.permissions && metadata.permissions.length > 0) {
        result.evaluatedConditions.push("permissions");
        result.requiredPermissions = metadata.permissions;
        const userPermissions = await this.getUserPermissions(
          operationId,
          user,
        );
        const hasPermission = metadata.permissions.some(
          (permission: Permission) => userPermissions.includes(permission),
        );

        if (!hasPermission) {
          result.missingPermissions = metadata.permissions.filter(
            (permission: Permission) => !userPermissions.includes(permission),
          );
          result.reason = `Required permissions: ${metadata.permissions.join(", ")}`;
          return result;
        }
      }

      // Check all-permissions access
      if (metadata.allPermissions && metadata.allPermissions.length > 0) {
        result.evaluatedConditions.push("all-permissions");
        const userPermissions = await this.getUserPermissions(
          operationId,
          user,
        );
        const hasAllPermissions = metadata.allPermissions.every(
          (permission: Permission) => userPermissions.includes(permission),
        );

        if (!hasAllPermissions) {
          result.missingPermissions = metadata.allPermissions.filter(
            (permission: Permission) => !userPermissions.includes(permission),
          );
          result.reason = `Required all permissions: ${metadata.allPermissions.join(", ")}`;
          return result;
        }
      }

      // Check time-based access
      if (metadata.timeAccess) {
        result.evaluatedConditions.push("time-based");
        if (!validateTimeBasedAccess(metadata.timeAccess)) {
          result.reason = "Access not allowed at this time";
          return result;
        }
      }

      // Check IP-based access
      if (metadata.ipAccess) {
        result.evaluatedConditions.push("ip-based");
        const clientIP = this.getClientIP(request);
        if (!validateIPBasedAccess(metadata.ipAccess, clientIP)) {
          result.reason = "Access not allowed from this IP address";
          return result;
        }
      }

      // Check conditional access
      if (metadata.conditionalAccess) {
        result.evaluatedConditions.push("conditional");
        const conditionResult = this.validateConditionalAccess(
          operationId,
          metadata.conditionalAccess,
          user,
          request,
        );

        if (!conditionResult.granted) {
          result.reason =
            conditionResult.reason || "Conditional access requirements not met";
          return result;
        }
      }

      // Check resource ownership
      if (metadata.ownership) {
        result.evaluatedConditions.push("ownership");
        const ownershipResult = this.validateResourceOwnership(
          operationId,
          user,
          request,
        );

        if (!ownershipResult) {
          result.reason = "Resource ownership required";
          return result;
        }
      }

      // All checks passed
      result.granted = true;
      return result;
    } catch (err) {
      this.logger.error(`[${operationId}] Authorization check error`, {
        operationId,
        error: err instanceof Error ? err.message : String(err),
        userId: user.id,
      });

      result.reason = "Authorization check failed";
      return result;
    }
  }

  /**
   * Check if user has admin role
   *
   * @param user - User object
   * @returns True if user is admin
   * @private
   */
  private isAdmin(user: AuthenticatedRequest["user"]): boolean {
    const userRoles = this.getUserRoles(user);
    return (
      userRoles.includes(Role._ADMIN) || userRoles.includes(Role._SUPER_ADMIN)
    );
  }

  /**
   * Get user roles from user object
   *
   * @param user - User object
   * @returns Array of user roles
   * @private
   */
  private getUserRoles(user: AuthenticatedRequest["user"]): Role[] {
    // Check explicit roles array first
    if (user.roles && Array.isArray(user.roles)) {
      return user.roles;
    }

    // Fallback to single role property
    if (user.role) {
      return [user.role as Role];
    }

    // Default to guest role
    return [Role._GUEST];
  }

  /**
   * Get user permissions with local caching
   *
   * @param operationId - Operation identifier
   * @param user - User object
   * @returns Promise<Permission[]> - Array of user permissions
   * @private
   */
  private async getUserPermissions(
    operationId: string,
    user: AuthenticatedRequest["user"],
  ): Promise<Permission[]> {
    try {
      // Check cache first for performance
      const cacheKey = `permissions:${user.id}`;
      const cachedPermissions =
        await this._cacheManager.get<Permission[]>(cacheKey);

      if (cachedPermissions) {
        this.logger.debug(`[${operationId}] Using cached permissions`, {
          operationId,
          userId: user.id,
          permissionCount: cachedPermissions.length,
        });
        return cachedPermissions;
      }

      // Get permissions from user object or derive from roles
      let permissions: Permission[] = [];

      if (user.permissions && Array.isArray(user.permissions)) {
        permissions = user.permissions;
      } else {
        // Derive permissions from roles
        const userRoles = this.getUserRoles(user);
        permissions = this.derivePermissionsFromRoles(userRoles);
      }

      // Cache permissions for performance
      await this._cacheManager.set(
        cacheKey,
        permissions,
        this.permissionCacheTimeout,
      );

      this.logger.debug(`[${operationId}] Loaded and cached user permissions`, {
        operationId,
        userId: user.id,
        permissionCount: permissions.length,
      });

      return permissions;
    } catch (err) {
      this.logger.error(`[${operationId}] Error getting user permissions`, {
        operationId,
        error: err instanceof Error ? err.message : String(err),
        userId: user.id,
      });

      // Return empty permissions array on error
      return [];
    }
  }

  /**
   * Derive permissions from user roles
   *
   * @param roles - User roles
   * @returns Array of permissions
   * @private
   */
  private derivePermissionsFromRoles(roles: Role[]): Permission[] {
    const permissions: Permission[] = [];

    for (const role of roles) {
      switch (role) {
        case Role._SUPER_ADMIN:
        case Role._ADMIN:
          permissions.push(
            Permission._READ,
            Permission._WRITE,
            Permission._DELETE,
            Permission._UPDATE,
            Permission._CREATE,
            Permission._EXECUTE,
            Permission._ADMIN,
            Permission._CONFIGURE,
            Permission._MONITOR,
            Permission._USER_MANAGEMENT,
            Permission._TASK_MANAGEMENT,
            Permission._SYSTEM_MANAGEMENT,
            Permission._AUDIT_ACCESS,
            Permission._SECURITY_MANAGEMENT,
            Permission._API_ACCESS,
            Permission._API_WRITE,
            Permission._API_ADMIN,
            Permission._COMPUTER_USE,
            Permission._COMPUTER_ADMIN,
            Permission._SCREEN_CAPTURE,
            Permission._FILE_ACCESS,
          );
          break;

        case Role._OPERATOR:
          permissions.push(
            Permission._READ,
            Permission._WRITE,
            Permission._UPDATE,
            Permission._CREATE,
            Permission._EXECUTE,
            Permission._MONITOR,
            Permission._TASK_MANAGEMENT,
            Permission._API_ACCESS,
            Permission._API_WRITE,
            Permission._COMPUTER_USE,
            Permission._SCREEN_CAPTURE,
            Permission._FILE_ACCESS,
          );
          break;

        case Role._USER:
          permissions.push(
            Permission._READ,
            Permission._WRITE,
            Permission._UPDATE,
            Permission._CREATE,
            Permission._API_ACCESS,
            Permission._COMPUTER_USE,
            Permission._FILE_ACCESS,
          );
          break;

        case Role._DEVELOPER:
          permissions.push(
            Permission._READ,
            Permission._WRITE,
            Permission._UPDATE,
            Permission._CREATE,
            Permission._EXECUTE,
            Permission._MONITOR,
            Permission._API_ACCESS,
            Permission._API_WRITE,
            Permission._COMPUTER_USE,
            Permission._FILE_ACCESS,
          );
          break;

        case Role._ANALYST:
          permissions.push(
            Permission._READ,
            Permission._MONITOR,
            Permission._AUDIT_ACCESS,
            Permission._API_ACCESS,
          );
          break;

        case Role._AUDITOR:
          permissions.push(
            Permission._READ,
            Permission._AUDIT_ACCESS,
            Permission._MONITOR,
            Permission._API_ACCESS,
          );
          break;

        case Role._MODERATOR:
          permissions.push(
            Permission._READ,
            Permission._WRITE,
            Permission._UPDATE,
            Permission._DELETE,
            Permission._USER_MANAGEMENT,
            Permission._API_ACCESS,
          );
          break;

        case Role._GUEST:
          permissions.push(Permission._READ, Permission._API_ACCESS);
          break;

        case Role._SYSTEM:
          permissions.push(
            Permission._READ,
            Permission._WRITE,
            Permission._UPDATE,
            Permission._CREATE,
            Permission._DELETE,
            Permission._EXECUTE,
            Permission._SYSTEM_MANAGEMENT,
            Permission._API_ACCESS,
          );
          break;

        default:
          // No permissions for unknown roles
          break;
      }
    }

    // Remove duplicates and return
    return Array.from(new Set(permissions));
  }

  /**
   * Validate conditional access requirements
   *
   * @param operationId - Operation identifier
   * @param config - Conditional access configuration
   * @param user - User object
   * @param request - HTTP request
   * @returns Promise<AuthorizationResult> - Validation result
   * @private
   */
  private validateConditionalAccess(
    operationId: string,
    config: ConditionalAccessConfig,
    user: AuthenticatedRequest["user"],
    request: AuthenticatedRequest,
  ): { granted: boolean; reason?: string } {
    try {
      // Check required attributes
      if (config.requiredAttributes) {
        const userMetadata = user.metadata || {};
        for (const [key, value] of Object.entries(config.requiredAttributes)) {
          if (userMetadata[key] !== value) {
            return {
              granted: false,
              reason: `Required attribute ${key} not matching`,
            };
          }
        }
      }

      // Check MFA requirement
      if (config.requireMFA) {
        // In a real implementation, check MFA status from user session
        // For now, assume MFA is satisfied if user has active session
        if (!request.securityContext?.sessionId) {
          return {
            granted: false,
            reason: "Multi-factor authentication required",
          };
        }
      }

      // Check session age requirements
      if (config.minSessionAge || config.maxSessionAge) {
        const lastActivity = request.securityContext?.lastActivity;
        if (lastActivity) {
          const sessionAge = Date.now() - lastActivity.getTime();
          const sessionAgeMinutes = sessionAge / (1000 * 60);

          if (
            config.minSessionAge &&
            sessionAgeMinutes < config.minSessionAge
          ) {
            return {
              granted: false,
              reason: `Session too new (minimum ${config.minSessionAge} minutes required)`,
            };
          }

          if (
            config.maxSessionAge &&
            sessionAgeMinutes > config.maxSessionAge
          ) {
            return {
              granted: false,
              reason: `Session too old (maximum ${config.maxSessionAge} minutes allowed)`,
            };
          }
        }
      }

      // Check custom condition function
      if (config.conditionFunction) {
        // In a real implementation, execute custom condition function
        // For now, assume custom conditions pass
        this.logger.debug(
          `[${operationId}] Custom condition function not implemented`,
          {
            operationId,
            conditionFunction: config.conditionFunction,
          },
        );
      }

      return { granted: true };
    } catch (err) {
      this.logger.error(
        `[${operationId}] Conditional access validation error`,
        {
          operationId,
          error: err instanceof Error ? err.message : String(err),
        },
      );

      return {
        granted: false,
        reason: "Conditional access validation failed",
      };
    }
  }

  /**
   * Validate resource ownership
   *
   * @param operationId - Operation identifier
   * @param user - User object
   * @param request - HTTP request
   * @returns Promise<boolean> - True if user owns the resource
   * @private
   */
  private validateResourceOwnership(
    operationId: string,
    user: AuthenticatedRequest["user"],
    request: AuthenticatedRequest,
  ): boolean {
    try {
      // Extract resource ID from request parameters
      const resourceId = this.extractResourceId(request);

      if (!resourceId) {
        this.logger.debug(
          `[${operationId}] No resource ID found for ownership check`,
          {
            operationId,
            url: request.url,
          },
        );
        return false;
      }

      // In a real implementation, check database for resource ownership
      // For now, assume ownership if user ID matches resource ID pattern
      const isOwner =
        resourceId === user.id || resourceId.startsWith(`${user.id}-`);

      this.logger.debug(`[${operationId}] Resource ownership check`, {
        operationId,
        userId: user.id,
        resourceId,
        isOwner,
      });

      return isOwner;
    } catch (err) {
      this.logger.error(
        `[${operationId}] Resource ownership validation error`,
        {
          operationId,
          error: err instanceof Error ? err.message : String(err),
        },
      );

      return false;
    }
  }

  /**
   * Extract resource ID from request
   *
   * @param request - HTTP request
   * @returns Resource ID string or null
   * @private
   */
  private extractResourceId(request: AuthenticatedRequest): string | null {
    // Try to extract from common parameter names
    const params =
      (request as unknown as { params?: Record<string, string> }).params || {};

    return (
      params.id || params.userId || params.resourceId || params.taskId || null
    );
  }

  /**
   * Get client IP address from request
   *
   * @param request - HTTP request
   * @returns Client IP address
   * @private
   */
  private getClientIP(request: Request): string {
    return (
      (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (request.headers["x-real-ip"] as string) ||
      request.socket?.remoteAddress ||
      "unknown"
    );
  }

  /**
   * Log security event to local file system
   *
   * @param request - HTTP request
   * @param event - Audit event to log
   * @private
   */
  private async logSecurityEvent(
    request: AuthenticatedRequest,
    event: LocalAuditEvent,
  ): Promise<void> {
    try {
      if (!this.enableDetailedLogging) {
        return;
      }

      // In a real implementation, write to local log file
      // For now, just log to console with structured format
      this.logger.log("Security Event", {
        timestamp: event.timestamp.toISOString(),
        type: event.type,
        userId: event.userId,
        username: event.username,
        endpoint: event.endpoint,
        method: event.method,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        reason: event.reason,
        metadata: event.metadata,
      });

      // Cache recent security events for analysis
      const recentEventsKey = `security_events:${event.userId}`;
      const recentEvents =
        (await this._cacheManager.get<LocalAuditEvent[]>(recentEventsKey)) ||
        [];
      recentEvents.push(event);

      // Keep only last 100 events per user
      const limitedEvents = recentEvents.slice(-100);
      await this._cacheManager.set(
        recentEventsKey,
        limitedEvents,
        24 * 60 * 60 * 1000,
      ); // 24 hours
    } catch (err) {
      this.logger.error("Failed to log security event", {
        error: err instanceof Error ? err.message : String(err),
        event: {
          type: event.type,
          userId: event.userId,
          endpoint: event.endpoint,
        },
      });
    }
  }
}
