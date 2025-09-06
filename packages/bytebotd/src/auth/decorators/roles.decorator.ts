/**
 * Authorization Decorators - ByteBotd Computer Control Security
 * Provides easy-to-use decorators for securing computer automation endpoints
 *
 * Features:
 * - Role-based access control decorators for computer control
 * - Fine-grained permission decorators for automation actions
 * - Public route decorator for bypassing authentication
 * - Current user decorator for accessing authenticated user
 * - Computer control specific convenience decorators
 *
 * @author Security Implementation Specialist
 * @version 1.0.0
 * @since ByteBotd Authentication Hardening
 */

import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { UserRole, Permission } from '@bytebot/shared';
import { AuthenticatedRequest, ByteBotdUser } from '../guards/jwt-auth.guard';

/**
 * Roles decorator - Specify required roles for route access
 * Use this decorator to protect computer control routes with specific user roles
 *
 * @param roles - Array of UserRole values required to access the route
 * @returns MethodDecorator - Decorator function
 *
 * @example
 * ```typescript
 * @Roles(UserRole.ADMIN, UserRole.OPERATOR)
 * @Post('/computer-use/action')
 * async executeComputerAction() {
 *   return this.computerUseService.executeAction();
 * }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);

/**
 * Permissions decorator - Specify required permissions for route access
 * Use this decorator to protect routes that require specific permissions
 *
 * @param permissions - Array of Permission values required to access the route
 * @returns MethodDecorator - Decorator function
 *
 * @example
 * ```typescript
 * @Permissions(Permission.COMPUTER_CONTROL)
 * @Post('/computer-use/action')
 * async executeComputerAction() {
 *   return this.computerUseService.executeAction();
 * }
 * ```
 */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata('permissions', permissions);

/**
 * Public decorator - Mark routes as publicly accessible (skip authentication)
 * Use this decorator for routes that don't require authentication
 *
 * @returns MethodDecorator - Decorator function
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('/health')
 * async healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const Public = () => SetMetadata('isPublic', true);

/**
 * CurrentUser decorator - Extract authenticated user from request
 * Use this parameter decorator to access the authenticated user object
 *
 * @param data - Optional property name to extract from user object
 * @returns ParameterDecorator - Decorator function that extracts user data
 *
 * @example
 * ```typescript
 * @Post('/computer-use/action')
 * async executeAction(@CurrentUser() user: ByteBotdUser) {
 *   return this.computerUseService.executeAction(user);
 * }
 *
 * @Post('/user-profile')
 * async getProfile(@CurrentUser('id') userId: string) {
 *   return { userId };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof ByteBotdUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // Return specific user property if requested
    if (data && user) {
      return user[data];
    }

    // Return full user object
    return user;
  },
);

/**
 * RequireRole decorator - Simplified role requirement decorator
 * Convenience decorator for protecting routes with a single role
 *
 * @param role - Single UserRole required to access the route
 * @returns MethodDecorator - Decorator function
 *
 * @example
 * ```typescript
 * @RequireRole(UserRole.ADMIN)
 * @Delete('/system/shutdown')
 * async shutdownSystem() {
 *   return this.systemService.shutdown();
 * }
 * ```
 */
export const RequireRole = (role: UserRole) => Roles(role);

/**
 * RequirePermission decorator - Simplified permission requirement decorator
 * Convenience decorator for protecting routes with a single permission
 *
 * @param permission - Single Permission required to access the route
 * @returns MethodDecorator - Decorator function
 *
 * @example
 * ```typescript
 * @RequirePermission(Permission.COMPUTER_CONTROL)
 * @Post('/computer-use/screenshot')
 * async takeScreenshot() {
 *   return this.computerUseService.takeScreenshot();
 * }
 * ```
 */
export const RequirePermission = (permission: Permission) =>
  Permissions(permission);

/**
 * AdminOnly decorator - Restrict access to admin users only
 * Convenience decorator for admin-only computer control routes
 *
 * @returns MethodDecorator - Decorator function
 *
 * @example
 * ```typescript
 * @AdminOnly()
 * @Get('/system/diagnostics')
 * async getSystemDiagnostics() {
 *   return this.systemService.getDiagnostics();
 * }
 * ```
 */
export const AdminOnly = () => RequireRole(UserRole.ADMIN);

/**
 * OperatorOrAdmin decorator - Restrict access to operators and admins
 * Convenience decorator for computer control operations
 *
 * @returns MethodDecorator - Decorator function
 *
 * @example
 * ```typescript
 * @OperatorOrAdmin()
 * @Post('/computer-use/action')
 * async executeComputerAction() {
 *   return this.computerUseService.executeAction();
 * }
 * ```
 */
export const OperatorOrAdmin = () => Roles(UserRole.OPERATOR, UserRole.ADMIN);

/**
 * ComputerControlRequired decorator - Require computer control permission
 * Specialized decorator for computer automation endpoints
 *
 * @returns MethodDecorator - Decorator function
 *
 * @example
 * ```typescript
 * @ComputerControlRequired()
 * @Post('/computer-use/click')
 * async clickMouse() {
 *   return this.computerUseService.click();
 * }
 * ```
 */
export const ComputerControlRequired = () => 
  RequirePermission(Permission.COMPUTER_CONTROL);

/**
 * ComputerViewRequired decorator - Require computer view permission
 * Specialized decorator for computer monitoring endpoints
 *
 * @returns MethodDecorator - Decorator function
 *
 * @example
 * ```typescript
 * @ComputerViewRequired()
 * @Get('/computer-use/screenshot')
 * async viewScreenshot() {
 *   return this.computerUseService.getScreenshot();
 * }
 * ```
 */
export const ComputerViewRequired = () => 
  RequirePermission(Permission.COMPUTER_VIEW);

/**
 * Authenticated decorator - Require any authenticated user (any role)
 * Convenience decorator for routes that just require authentication
 *
 * @returns MethodDecorator - Decorator function
 *
 * @example
 * ```typescript
 * @Authenticated()
 * @Get('/user/profile')
 * async getUserProfile(@CurrentUser() user: ByteBotdUser) {
 *   return this.userService.getProfile(user.id);
 * }
 * ```
 */
export const Authenticated = () =>
  Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER);

/**
 * Re-export ByteBotdUser type for convenience
 */
export type { ByteBotdUser } from '../guards/jwt-auth.guard';