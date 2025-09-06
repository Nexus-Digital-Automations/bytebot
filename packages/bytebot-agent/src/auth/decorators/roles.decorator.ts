/**
 * Authorization Decorators - Decorators for role and permission-based route protection
 * Provides easy-to-use decorators for securing API endpoints
 *
 * Features:
 * - Role-based access control decorators
 * - Fine-grained permission decorators
 * - Public route decorator for bypassing authentication
 * - Current user decorator for accessing authenticated user
 * - Type-safe decorator implementations
 *
 * @author Security Implementation Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { UserRole, Permission, User } from '@prisma/client';
import { AuthenticatedRequest } from '../guards/jwt-auth.guard';

/**
 * Roles decorator - Specify required roles for route access
 * Use this decorator to protect routes that require specific user roles
 *
 * @param roles - Array of UserRole values required to access the route
 * @returns MethodDecorator - Decorator function
 *
 * @example
 * ```typescript
 * @Roles(UserRole.ADMIN, UserRole.OPERATOR)
 * @Get('/sensitive-data')
 * async getSensitiveData() {
 *   return this.dataService.getSensitiveData();
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
 * @Permissions(Permission.TASK_WRITE, Permission.COMPUTER_CONTROL)
 * @Post('/tasks')
 * async createTask(@Body() taskDto: CreateTaskDto) {
 *   return this.tasksService.create(taskDto);
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
 * @Get('/profile')
 * async getProfile(@CurrentUser() user: User) {
 *   return this.userService.getProfile(user.id);
 * }
 *
 * @Get('/user-id')
 * async getCurrentUserId(@CurrentUser('id') userId: string) {
 *   return { userId };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
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
 * @Delete('/users/:id')
 * async deleteUser(@Param('id') id: string) {
 *   return this.userService.delete(id);
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
 * @RequirePermission(Permission.SYSTEM_ADMIN)
 * @Post('/system/restart')
 * async restartSystem() {
 *   return this.systemService.restart();
 * }
 * ```
 */
export const RequirePermission = (permission: Permission) =>
  Permissions(permission);

/**
 * AdminOnly decorator - Restrict access to admin users only
 * Convenience decorator for admin-only routes
 *
 * @returns MethodDecorator - Decorator function
 *
 * @example
 * ```typescript
 * @AdminOnly()
 * @Get('/admin/stats')
 * async getAdminStats() {
 *   return this.adminService.getSystemStats();
 * }
 * ```
 */
export const AdminOnly = () => RequireRole(UserRole.ADMIN);

/**
 * OperatorOrAdmin decorator - Restrict access to operators and admins
 * Convenience decorator for operator-level routes
 *
 * @returns MethodDecorator - Decorator function
 *
 * @example
 * ```typescript
 * @OperatorOrAdmin()
 * @Post('/tasks/execute')
 * async executeTask(@Body() taskDto: ExecuteTaskDto) {
 *   return this.tasksService.execute(taskDto);
 * }
 * ```
 */
export const OperatorOrAdmin = () => Roles(UserRole.OPERATOR, UserRole.ADMIN);

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
 * async getUserProfile(@CurrentUser() user: User) {
 *   return this.userService.getProfile(user.id);
 * }
 * ```
 */
export const Authenticated = () =>
  Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER);
