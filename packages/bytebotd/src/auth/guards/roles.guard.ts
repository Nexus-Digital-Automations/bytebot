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
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, Permission } from '@bytebot/shared';
import { AuthenticatedRequest, ByteBotdUser } from './jwt-auth.guard';

/**
 * Role hierarchy definition for permission inheritance
 * Higher roles inherit permissions from lower roles
 */
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  [UserRole.ADMIN]: [UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER],
  [UserRole.OPERATOR]: [UserRole.OPERATOR, UserRole.VIEWER],
  [UserRole.VIEWER]: [UserRole.VIEWER],
};

/**
 * Default permissions for each role (focused on computer control)
 * Defines what each role can do by default in ByteBotd
 */
const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.TASK_READ,
    Permission.TASK_WRITE,
    Permission.TASK_DELETE,
    Permission.COMPUTER_CONTROL,
    Permission.COMPUTER_VIEW,
    Permission.SYSTEM_ADMIN,
    Permission.USER_MANAGE,
    Permission.METRICS_VIEW,
    Permission.LOGS_VIEW,
  ],
  [UserRole.OPERATOR]: [
    Permission.TASK_READ,
    Permission.TASK_WRITE,
    Permission.COMPUTER_CONTROL,
    Permission.COMPUTER_VIEW,
    Permission.METRICS_VIEW,
  ],
  [UserRole.VIEWER]: [
    Permission.TASK_READ,
    Permission.COMPUTER_VIEW,
    Permission.METRICS_VIEW,
  ],
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
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const operationId = `bytebotd-roles-guard-${Date.now()}`;
    const startTime = Date.now();

    // Get required roles from metadata
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    // Get required permissions from metadata
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    // If no roles or permissions specified, allow access
    if (!requiredRoles && !requiredPermissions) {
      this.logger.debug(
        `[${operationId}] No role/permission requirements for computer control endpoint`,
        {
          operationId,
          route: this.getRouteInfo(context),
          securityEvent: 'computer_control_no_auth_requirements',
        },
      );
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // User should be authenticated by JWT guard first
    if (!user) {
      this.logger.warn(`[${operationId}] No authenticated user found for computer control`, {
        operationId,
        route: this.getRouteInfo(context),
        url: request.url,
        method: request.method,
        securityEvent: 'computer_control_no_user',
        riskScore: 90, // Very high risk for unauthenticated computer control
      });
      throw new ForbiddenException('Authentication required for computer control');
    }

    this.logger.debug(`[${operationId}] Computer control authorization check started`, {
      operationId,
      userId: user.id,
      username: user.username,
      userRole: user.role,
      requiredRoles,
      requiredPermissions,
      route: this.getRouteInfo(context),
      url: request.url,
      method: request.method,
      securityEvent: 'computer_control_authz_started',
    });

    try {
      // Check role-based authorization
      const hasRequiredRole = await this.checkRoleAuthorization(
        user,
        requiredRoles,
        operationId,
      );

      // Check permission-based authorization
      const hasRequiredPermission = await this.checkPermissionAuthorization(
        user,
        requiredPermissions,
        operationId,
      );

      // User must have either required role OR required permission (OR logic)
      const authorized = hasRequiredRole || hasRequiredPermission;

      const authTime = Date.now() - startTime;

      if (authorized) {
        this.logger.log(`[${operationId}] Computer control authorization successful`, {
          operationId,
          userId: user.id,
          username: user.username,
          userRole: user.role,
          hasRequiredRole,
          hasRequiredPermission,
          route: this.getRouteInfo(context),
          authTimeMs: authTime,
          securityEvent: 'computer_control_authz_success',
          ipAddress: this.getClientIpAddress(request),
        });
      } else {
        this.logger.warn(
          `[${operationId}] Computer control authorization failed - insufficient permissions`,
          {
            operationId,
            userId: user.id,
            username: user.username,
            userRole: user.role,
            requiredRoles,
            requiredPermissions,
            hasRequiredRole,
            hasRequiredPermission,
            route: this.getRouteInfo(context),
            authTimeMs: authTime,
            ipAddress: this.getClientIpAddress(request),
            securityEvent: 'computer_control_authz_failed',
            riskScore: 95, // Extremely high risk for unauthorized computer control attempts
          },
        );

        throw new ForbiddenException(
          'Insufficient permissions for computer control operations',
        );
      }

      return true;
    } catch (error) {
      const authTime = Date.now() - startTime;

      if (error instanceof ForbiddenException) {
        // Re-throw authorization errors without modification
        throw error;
      }

      // Log unexpected errors
      this.logger.error(
        `[${operationId}] Computer control authorization failed with unexpected error`,
        {
          operationId,
          userId: user.id,
          username: user.username,
          userRole: user.role,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          authTimeMs: authTime,
          route: this.getRouteInfo(context),
          securityEvent: 'computer_control_authz_error',
        },
      );

      throw new ForbiddenException('Authorization failed for computer control');
    }
  }

  /**
   * Check if user has required role authorization
   * Validates user role against required roles with hierarchy support
   *
   * @param user - Authenticated user object
   * @param requiredRoles - Array of roles required for access
   * @param operationId - Operation ID for logging
   * @returns Promise<boolean> - Whether user has required role
   * @private
   */
  private async checkRoleAuthorization(
    user: ByteBotdUser,
    requiredRoles?: UserRole[],
    operationId?: string,
  ): Promise<boolean> {
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No role requirements
    }

    // Get user's effective roles (including inherited roles)
    const effectiveRoles = ROLE_HIERARCHY[user.role] || [user.role];

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => effectiveRoles.includes(role));

    this.logger.debug(`[${operationId}] Computer control role authorization check`, {
      operationId,
      userId: user.id,
      userRole: user.role,
      effectiveRoles,
      requiredRoles,
      hasRole,
      securityEvent: 'computer_control_role_check',
    });

    return hasRole;
  }

  /**
   * Check if user has required permission authorization
   * Validates user permissions against required permissions for computer control
   *
   * @param user - Authenticated user object with permissions
   * @param requiredPermissions - Array of permissions required for access
   * @param operationId - Operation ID for logging
   * @returns Promise<boolean> - Whether user has required permissions
   * @private
   */
  private async checkPermissionAuthorization(
    user: ByteBotdUser,
    requiredPermissions?: Permission[],
    operationId?: string,
  ): Promise<boolean> {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permission requirements
    }

    // Get user's effective permissions (role-based + custom permissions)
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];

    // In a production environment, you would also fetch custom permissions from database
    // For now, we'll use role-based permissions
    const effectivePermissions = rolePermissions;

    // Check if user has all required permissions (AND logic for permissions)
    const hasAllPermissions = requiredPermissions.every((permission) =>
      effectivePermissions.includes(permission),
    );

    this.logger.debug(`[${operationId}] Computer control permission authorization check`, {
      operationId,
      userId: user.id,
      userRole: user.role,
      rolePermissions,
      requiredPermissions,
      hasAllPermissions,
      securityEvent: 'computer_control_permission_check',
    });

    return hasAllPermissions;
  }

  /**
   * Extract client IP address from request
   * Handles various proxy configurations and headers
   *
   * @param request - HTTP request object
   * @returns string - Client IP address
   * @private
   */
  private getClientIpAddress(request: AuthenticatedRequest): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Get route information for logging
   * Extracts handler and controller information
   *
   * @param context - Execution context
   * @returns string - Route identifier
   * @private
   */
  private getRouteInfo(context: ExecutionContext): string {
    const handler = context.getHandler().name;
    const controller = context.getClass().name;
    return `${controller}.${handler}`;
  }
}