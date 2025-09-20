/**
 * Roles Guard - ByteBotd Role-Based Access Control (RBAC) system
 * Implements fine-grained permission checking for computer control endpoints
 *
 * Features:
 * - Role-based route protection with computer control focus
 * - Fine-grained permission validation for automation actions
 * - Hierarchical permission model with role inheritance
 * - Comprehensive security audit logging for computer control
 * - Performance-optimized permission checking
 *
 * @author Security Implementation Specialist
 * @version 1.0.0
 * @since ByteBotd Authentication Hardening
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';import { Reflector } from '@nestjs/core';import { UserRole, Permission } from '@bytebot/shared';import { AuthenticatedRequest, ByteBotdUser } from './jwt-auth.guard';

/**
 * Role hierarchy definition for permission inheritance
 * Higher roles inherit permissions from lower roles
 */
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  [UserRole._ADMIN]: [UserRole._ADMIN, UserRole._OPERATOR, UserRole._VIEWER],
  [UserRole._OPERATOR]: [UserRole._OPERATOR, UserRole._VIEWER],
  [UserRole._VIEWER]: [UserRole._VIEWER],
  [UserRole._USER]: [UserRole._USER],
  [UserRole._GUEST]: [UserRole._GUEST],
};

/**
 * Default permissions for each role (focused on computer control)
 * Defines what each role can do by default in ByteBotd
 */
const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole._ADMIN]: [
    Permission._TASK_READ,
    Permission._TASK_WRITE,
    Permission._TASK_DELETE,
    Permission._COMPUTER_CONTROL,
    Permission._COMPUTER_VIEW,
    Permission._SYSTEM_ADMIN,
    Permission._USER_MANAGEMENT,
    Permission._METRICS_VIEW,
    Permission._LOGS_VIEW,
    Permission._API_ADMIN,
    Permission._SECURITY_MANAGEMENT,
    Permission._SYSTEM_MANAGEMENT,
  ],
  [UserRole._OPERATOR]: [
    Permission._TASK_READ,
    Permission._TASK_WRITE,
    Permission._COMPUTER_CONTROL,
    Permission._COMPUTER_VIEW,
    Permission._METRICS_VIEW,
    Permission._API_ACCESS,
    Permission._EXECUTE,
  ],
  [UserRole._VIEWER]: [
    Permission._TASK_READ,
    Permission._COMPUTER_VIEW,
    Permission._METRICS_VIEW,
    Permission._API_ACCESS,
  ],
  [UserRole._USER]: [Permission._TASK_READ, Permission._VIEW_OWN_PROFILE],
  [UserRole._GUEST]: [Permission._VIEW_PUBLIC_CONTENT],
};

/**
 * Roles Guard implementation for ByteBotd
 * Validates user permissions against required roles and permissions
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  /**
   * Determine if request can activate the route based on user roles/permissions
   * Validates user has required roles or permissions for computer control
   *
   * @param context - Execution context containing request and user information
   * @returns Promise<boolean> - Whether the request is authorized
   * @throws ForbiddenException - When user lacks required permissions
   */
  canActivate(context: ExecutionContext): boolean {
    const operationId = `bytebotd-roles-guard-${Date.now()}`;
    const startTime = Date.now();

    // Get required roles from metadata
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',[context.getHandler(), context.getClass()],);

    // Get required permissions from metadata
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    // If no roles or permissions required, allow access
    if (!requiredRoles?.length && !requiredPermissions?.length) {
      this.logger.debug(
        `[${operationId}] No RBAC requirements, allowing access`,);return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user: ByteBotdUser = request.user;

    if (!user) {
      this.logger.warn(
        `[${operationId}] No authenticated user for RBAC check`,
        {
          operationId,
          url: request.url,
          method: request.method,
          requiredRoles: requiredRoles?.map((r) => r.toString()),
          requiredPermissions: requiredPermissions?.map((p) => p.toString()),
        },
      );
      throw new ForbiddenException(
        'Authentication required for this operation',
      );
    }

    const authTime = Date.now() - startTime;

    try {
      // Check role requirements
      if (requiredRoles?.length > 0) {
        const hasRequiredRole = this.validateUserRoles(
          user,
          requiredRoles,
          operationId,
        );
        if (!hasRequiredRole) {
          this.logger.warn(`[${operationId}] Role authorization failed`, {
            operationId,
            userId: user.id,
            userRole: user.role,
            requiredRoles: requiredRoles.map((r) => r.toString()),
            authTimeMs: authTime,
            securityEvent: 'role_authorization_failed',});throw new ForbiddenException('Insufficient role for this operation');
        }
      }

      // Check permission requirements
      if (requiredPermissions?.length > 0) {
        const hasRequiredPermissions = this.validateUserPermissions(
          user,
          requiredPermissions,
          operationId,
        );
        if (!hasRequiredPermissions) {
          this.logger.warn(`[${operationId}] Permission authorization failed`, {
            operationId,
            userId: user.id,
            userRole: user.role,
            requiredPermissions: requiredPermissions.map((p) => p.toString()),
            authTimeMs: authTime,
            securityEvent: 'permission_authorization_failed',});throw new ForbiddenException(
            'Insufficient permissions for this operation',
          );
        }
      }

      this.logger.log(`[${operationId}] RBAC authorization successful`, {
        operationId,
        userId: user.id,
        userRole: user.role,
        requiredRoles: requiredRoles?.map((r) => r.toString()) ?? [],
        requiredPermissions:
          requiredPermissions?.map((p) => p.toString()) ?? [],
        authTimeMs: authTime,
        securityEvent: 'rbac_authorization_success',
      });

      return true;
    } catch (_error) {
      const errorMessage =
        _error instanceof Error ? _error.message : String(_error);

      if (_error instanceof ForbiddenException) {
        throw _error;
      }

      this.logger.error(`[${operationId}] RBAC authorization error`, {
        operationId,
        userId: user.id,
        error: errorMessage,
        authTimeMs: authTime,
        securityEvent: 'rbac_authorization_error',});throw new ForbiddenException(
        'Authorization failed for computer control operation',);}
  }

  /**
   * Validate user has required roles (with hierarchy support)
   *
   * @param user - Authenticated user
   * @param requiredRoles - Array of required roles (ANY match required)
   * @param operationId - Operation ID for logging
   * @returns boolean - Whether user has unknown of the required roles
   */
  private validateUserRoles(
    user: ByteBotdUser,
    requiredRoles: UserRole[],
    operationId: string,
  ): boolean {
    const userRole = user.role;
    const userHierarchyRoles = ROLE_HIERARCHY[userRole] ?? [userRole];

    // Check if user's role (or any inherited roles) match any required role
    const hasRole = requiredRoles.some((requiredRole) =>
      userHierarchyRoles.includes(requiredRole),
    );

    this.logger.debug(`[${operationId}] Role validation`, {
      operationId,
      userId: user.id,
      userRole: userRole.toString(),
      userHierarchyRoles: userHierarchyRoles.map((r) => r.toString()),
      requiredRoles: requiredRoles.map((r) => r.toString()),
      hasRole,
    });

    return hasRole;
  }

  /**
   * Validate user has required permissions (with role-based defaults)
   *
   * @param user - Authenticated user
   * @param requiredPermissions - Array of required permissions (ALL must match)
   * @param operationId - Operation ID for logging
   * @returns boolean - Whether user has all required permissions
   */
  private validateUserPermissions(
    user: ByteBotdUser,
    requiredPermissions: Permission[],
    operationId: string,
  ): boolean {
    // Get user's default permissions based on role
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] ?? [];

    // TODO: In a real implementation, also get user-specific permissions from database
    // For now, use role-based permissions only
    const userPermissions = rolePermissions;

    // Check if user has ALL required permissions
    const hasAllPermissions = requiredPermissions.every((requiredPermission) =>
      userPermissions.includes(requiredPermission),
    );

    this.logger.debug(`[${operationId}] Permission validation`, {
      operationId,
      userId: user.id,
      userRole: user.role.toString(),
      userPermissions: userPermissions.map((p) => p.toString()),
      requiredPermissions: requiredPermissions.map((p) => p.toString()),
      hasAllPermissions,
    });

    return hasAllPermissions;
  }

  /**
   * Check if user has specific role
   *
   * @param user - User to check
   * @param role - Role to check for
   * @returns boolean - Whether user has the role (including hierarchy)
   */
  static hasRole(user: ByteBotdUser, role: UserRole): boolean {
    const userHierarchyRoles = ROLE_HIERARCHY[user.role] ?? [user.role];
    return userHierarchyRoles.includes(role);
  }

  /**
   * Check if user has specific permission
   *
   * @param user - User to check
   * @param permission - Permission to check for
   * @returns boolean - Whether user has the permission
   */
  static hasPermission(user: ByteBotdUser, permission: Permission): boolean {
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] ?? [];
    return rolePermissions.includes(permission);
  }

  /**
   * Get all permissions for a user based on their role
   *
   * @param user - User to get permissions for
   * @returns Permission[] - Array of permissions
   */
  static getUserPermissions(user: ByteBotdUser): Permission[] {
    return DEFAULT_ROLE_PERMISSIONS[user.role] ?? [];
  }
}
