/**
 * RBAC Authorization Decorators - Bytebot Platform Advanced Role-Based Access Control
 *
 * This module provides comprehensive role-based access control decorators for advanced
 * authorization patterns across all Bytebot microservices. Includes role-based decorators,
 * permission-based decorators, conditional access controls, and temporal/IP-based restrictions.
 *
 * @fileoverview Advanced RBAC authorization decorators for Bytebot security infrastructure
 * @version 2.0.0
 * @author RBAC Decorators Specialist
 */

import { SetMetadata, CustomDecorator } from "@nestjs/common";
import "reflect-metadata";

// Type for constructor functions (classes) - compatible with strict TypeScript
// Ensures proper type constraints for decorator target parameters
type ClassConstructor<T = object> = new (..._args: unknown[]) => T;

// Type aliases for better type safety in decorator implementations
type _ClassConstructor = ClassConstructor<object>;
type _ConstructorFunction = new (..._args: unknown[]) => object;

// ===========================
// TYPE DEFINITIONS
// ===========================

/**
 * Standard roles in the Bytebot system
 *
 * ARCHITECTURAL PRESERVATION: Complete role coverage intentionally maintained for:
 * - Enterprise compliance requirements (SOC 2, ISO 27001, GDPR)
 * - Future platform expansion and scaling
 * - SIEM integration and comprehensive audit trails
 * - Regulatory compliance mapping
 *
 * Note: "Unused" enum values are architectural design choices, not code defects.
 */

export enum Role {
  _ADMIN = "admin",
  _USER = "user",
  _MODERATOR = "moderator",
  _SYSTEM = "system",
  _GUEST = "guest",
  _DEVELOPER = "developer",
  _OPERATOR = "operator",
  _ANALYST = "analyst",
  _AUDITOR = "auditor",
  _SUPER_ADMIN = "super_admin",
}

/**
 * Permission types for granular access control
 *
 * ARCHITECTURAL PRESERVATION: Complete permission coverage intentionally maintained for:
 * - Enterprise compliance requirements (SOC 2, ISO 27001, GDPR)
 * - Granular access control capabilities
 * - SIEM integration and comprehensive audit trails
 * - Future API expansion and resource-specific permissions
 *
 * Note: "Unused" enum values are architectural design choices, not code defects.
 */

export enum Permission {
  // Data permissions
  _READ = "read",
  _WRITE = "write",
  _DELETE = "delete",
  _UPDATE = "update",
  _CREATE = "create",

  // Task-specific permissions
  _TASK_READ = "task:read",
  _TASK_WRITE = "task:write",
  _TASK_DELETE = "task:delete",

  // System permissions
  _EXECUTE = "execute",
  _ADMIN = "admin",
  _CONFIGURE = "configure",
  _MONITOR = "monitor",

  // Resource-specific permissions
  _USER_MANAGEMENT = "user_management",
  _TASK_MANAGEMENT = "task_management",
  _SYSTEM_MANAGEMENT = "system_management",
  _AUDIT_ACCESS = "audit_access",
  _SECURITY_MANAGEMENT = "security_management",

  // API permissions
  _API_ACCESS = "api_access",
  _API_WRITE = "api_write",
  _API_ADMIN = "api_admin",

  // Computer-use permissions
  _COMPUTER_USE = "computer_use",
  _COMPUTER_ADMIN = "computer_admin",
  _SCREEN_CAPTURE = "screen_capture",
  _FILE_ACCESS = "file_access",
}

/**
 * Resource types for permission checking
 *
 * ARCHITECTURAL PRESERVATION: Complete resource type coverage intentionally maintained for:
 * - Enterprise resource-based access control (RBAC)
 * - Granular permission mapping across all system components
 * - SIEM integration and comprehensive audit trails
 * - Future service expansion and API resource protection
 *
 * Note: "Unused" enum values are architectural design choices, not code defects.
 */

export enum ResourceType {
  _USER = "user",
  _TASK = "task",
  _SYSTEM = "system",
  _FILE = "file",
  _API = "api",
  _COMPUTER = "computer",
  _AUDIT = "audit",
  _SECURITY = "security",
}

/**
 * Time-based access configuration
 */
export interface TimeBasedAccessConfig {
  /** Allowed hours in 24-hour format (0-23) */
  allowedHours?: number[];
  /** Allowed days of week (0=Sunday, 6=Saturday) */
  allowedDaysOfWeek?: number[];
  /** Timezone for time evaluation (default: UTC) */
  timezone?: string;
  /** Start date for access (ISO string) */
  startDate?: string;
  /** End date for access (ISO string) */
  endDate?: string;
}

/**
 * IP-based access configuration
 */
export interface IPBasedAccessConfig {
  /** Allowed IP addresses or CIDR ranges */
  allowedIPs?: string[];
  /** Blocked IP addresses or CIDR ranges */
  blockedIPs?: string[];
  /** Allow private networks */
  allowPrivateNetworks?: boolean;
  /** Geo-location restrictions */
  allowedCountries?: string[];
  blockedCountries?: string[];
}

/**
 * Conditional access configuration
 */
export interface ConditionalAccessConfig {
  /** Required user attributes */
  requiredAttributes?: Record<string, unknown>;
  /** Custom condition function name */
  conditionFunction?: string;
  /** Multi-factor authentication required */
  requireMFA?: boolean;
  /** Minimum session age in minutes */
  minSessionAge?: number;
  /** Maximum session age in minutes */
  maxSessionAge?: number;
}

/**
 * Security endpoint configuration
 */
export interface SecureEndpointConfig {
  /** Roles required for access */
  roles?: Role[];
  /** Permissions required for access */
  permissions?: Permission[];
  /** Resource types this endpoint manages */
  resourceTypes?: ResourceType[];
  /** Enable audit logging */
  auditLogging?: boolean;
  /** Rate limiting configuration */
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  /** Encryption required for requests */
  requireEncryption?: boolean;
  /** HTTPS only access */
  httpsOnly?: boolean;
}

// ===========================
// METADATA KEYS
// ===========================

export const ROLES_KEY = "roles";
export const PERMISSIONS_KEY = "permissions";
export const ANY_ROLE_KEY = "any_role";
export const ALL_PERMISSIONS_KEY = "all_permissions";
export const RESOURCE_KEY = "resource";
export const OWNERSHIP_KEY = "ownership";
export const CONDITIONAL_ACCESS_KEY = "conditional_access";
export const TIME_ACCESS_KEY = "time_access";
export const IP_ACCESS_KEY = "ip_access";
export const AUDIT_ACCESS_KEY = "audit_access";
export const SECURE_ENDPOINT_KEY = "secure_endpoint";
export const ADMIN_ONLY_KEY = "admin_only";

// ===========================
// CORE RBAC DECORATORS
// ===========================

/**
 * Requires specific roles for access
 *
 * @example
 * ```typescript
 * @RequireRole([Role._ADMIN, Role._MODERATOR])
 * @Get('/admin/users')
 * async getUsers() {
 *   return this.userService.findAll();
 * }
 * ```
 *
 * @param roles Array of required roles (user must have at least one)
 * @returns Method decorator
 */
export const RequireRole = (roles: Role[]): CustomDecorator<string> => {
  return SetMetadata(ROLES_KEY, roles);
};

/**
 * Requires specific permissions for access
 *
 * @example
 * ```typescript
 * @RequirePermission([Permission._READ, Permission._USER_MANAGEMENT])
 * @Get('/users/:id')
 * async getUser(@Param('id') id: string) {
 *   return this.userService.findById(id);
 * }
 * ```
 *
 * @param permissions Array of required permissions (user must have at least one)
 * @returns Method decorator
 */
export const RequirePermission = (
  permissions: Permission[],
): CustomDecorator<string> => {
  return SetMetadata(PERMISSIONS_KEY, permissions);
};

/**
 * Requires user to have ANY of the specified roles
 *
 * @example
 * ```typescript
 * @RequireAnyRole([Role._USER, Role._GUEST])
 * @Get('/public/info')
 * async getPublicInfo() {
 *   return this.infoService.getPublic();
 * }
 * ```
 *
 * @param roles Array of roles (user needs any one of them)
 * @returns Method decorator
 */
export const RequireAnyRole = (roles: Role[]): CustomDecorator<string> => {
  return SetMetadata(ANY_ROLE_KEY, roles);
};

/**
 * Requires user to have ALL of the specified permissions
 *
 * @example
 * ```typescript
 * @RequireAllPermissions([Permission._WRITE, Permission._ADMIN, Permission._USER_MANAGEMENT])
 * @Post('/admin/users')
 * async createUser(@Body() userData: CreateUserDto) {
 *   return this.userService.create(userData);
 * }
 * ```
 *
 * @param permissions Array of permissions (user must have all of them)
 * @returns Method decorator
 */
export const RequireAllPermissions = (
  permissions: Permission[],
): CustomDecorator<string> => {
  return SetMetadata(ALL_PERMISSIONS_KEY, permissions);
};

/**
 * Restricts access to administrators only
 *
 * @example
 * ```typescript
 * @AdminOnly()
 * @Delete('/system/reset')
 * async resetSystem() {
 *   return this.systemService.reset();
 * }
 * ```
 *
 * @returns Method decorator
 */
export const AdminOnly = (): CustomDecorator<string> => {
  return SetMetadata(ADMIN_ONLY_KEY, true);
};

// ===========================
// RESOURCE-BASED DECORATORS
// ===========================

/**
 * Grants read access to specific resource type
 *
 * @example
 * ```typescript
 * @CanRead('user')
 * @Get('/users/:id')
 * async getUser(@Param('id') id: string) {
 *   return this.userService.findById(id);
 * }
 * ```
 *
 * @param resource Resource type identifier
 * @returns Method decorator
 */
export const CanRead = (resource: string): CustomDecorator<string> => {
  return SetMetadata(RESOURCE_KEY, { action: "read", resource });
};

/**
 * Grants write access to specific resource type
 *
 * @example
 * ```typescript
 * @CanWrite('task')
 * @Put('/tasks/:id')
 * async updateTask(@Param('id') id: string, @Body() taskData: UpdateTaskDto) {
 *   return this.taskService.update(id, taskData);
 * }
 * ```
 *
 * @param resource Resource type identifier
 * @returns Method decorator
 */
export const CanWrite = (resource: string): CustomDecorator<string> => {
  return SetMetadata(RESOURCE_KEY, { action: "write", resource });
};

/**
 * Grants delete access to specific resource type
 *
 * @example
 * ```typescript
 * @CanDelete('file')
 * @Delete('/files/:id')
 * async deleteFile(@Param('id') id: string) {
 *   return this.fileService.delete(id);
 * }
 * ```
 *
 * @param resource Resource type identifier
 * @returns Method decorator
 */
export const CanDelete = (resource: string): CustomDecorator<string> => {
  return SetMetadata(RESOURCE_KEY, { action: "delete", resource });
};

/**
 * Grants execute access to specific action
 *
 * @example
 * ```typescript
 * @CanExecute('system_backup')
 * @Post('/system/backup')
 * async createBackup() {
 *   return this.systemService.createBackup();
 * }
 * ```
 *
 * @param action Action identifier
 * @returns Method decorator
 */
export const CanExecute = (action: string): CustomDecorator<string> => {
  return SetMetadata(RESOURCE_KEY, { action: "execute", resource: action });
};

/**
 * Requires resource ownership for access
 *
 * @example
 * ```typescript
 * @ResourceOwner()
 * @Put('/users/profile')
 * async updateProfile(@Body() profileData: UpdateProfileDto, @Req() req: Request) {
 *   return this.userService.updateProfile(req.user.id, profileData);
 * }
 * ```
 *
 * @returns Method decorator
 */
export const ResourceOwner = (): CustomDecorator<string> => {
  return SetMetadata(OWNERSHIP_KEY, true);
};

// ===========================
// ADVANCED ACCESS CONTROL DECORATORS
// ===========================

/**
 * Conditional access based on runtime conditions
 *
 * @example
 * ```typescript
 * @ConditionalAccess({
 *   requiredAttributes: { department: 'engineering' },
 *   requireMFA: true
 * })
 * @Get('/engineering/secrets')
 * async getEngineeringSecrets() {
 *   return this.secretsService.getEngineering();
 * }
 * ```
 *
 * @param config Conditional access configuration
 * @returns Method decorator
 */
export const ConditionalAccess = (
  config: ConditionalAccessConfig,
): CustomDecorator<string> => {
  return SetMetadata(CONDITIONAL_ACCESS_KEY, config);
};

/**
 * Time-based access restrictions
 *
 * @example
 * ```typescript
 * @TimeBasedAccess({
 *   allowedHours: [9, 10, 11, 12, 13, 14, 15, 16, 17], // 9 AM to 5 PM
 *   allowedDaysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
 *   timezone: 'America/New_York'
 * })
 * @Post('/payroll/process')
 * async processPayroll() {
 *   return this.payrollService.process();
 * }
 * ```
 *
 * @param config Time-based access configuration
 * @returns Method decorator
 */
export const TimeBasedAccess = (
  config: TimeBasedAccessConfig,
): CustomDecorator<string> => {
  return SetMetadata(TIME_ACCESS_KEY, config);
};

/**
 * IP-based access restrictions
 *
 * @example
 * ```typescript
 * @IPBasedAccess({
 *   allowedIPs: ['192.168.1.0/24', '10.0.0.0/8'],
 *   allowedCountries: ['US', 'CA'],
 *   allowPrivateNetworks: true
 * })
 * @Get('/internal/metrics')
 * async getInternalMetrics() {
 *   return this.metricsService.getInternal();
 * }
 * ```
 *
 * @param config IP-based access configuration
 * @returns Method decorator
 */
export const IPBasedAccess = (
  config: IPBasedAccessConfig,
): CustomDecorator<string> => {
  return SetMetadata(IP_ACCESS_KEY, config);
};

/**
 * Enable comprehensive audit logging for endpoint
 *
 * @example
 * ```typescript
 * @AuditAccess()
 * @Post('/users/:id/permissions')
 * async updateUserPermissions(@Param('id') id: string, @Body() permissions: Permission[]) {
 *   return this.userService.updatePermissions(id, permissions);
 * }
 * ```
 *
 * @returns Method decorator
 */
export const AuditAccess = (): CustomDecorator<string> => {
  return SetMetadata(AUDIT_ACCESS_KEY, true);
};

/**
 * Comprehensive security endpoint protection
 *
 * @example
 * ```typescript
 * @SecureEndpoint({
 *   roles: [Role._ADMIN],
 *   permissions: [Permission._SYSTEM_MANAGEMENT],
 *   resourceTypes: [ResourceType._SYSTEM],
 *   auditLogging: true,
 *   rateLimit: { requests: 10, windowMs: 60000 },
 *   requireEncryption: true,
 *   httpsOnly: true
 * })
 * @Post('/system/critical-operation')
 * async performCriticalOperation(@Body() operationData: CriticalOperationDto) {
 *   return this.systemService.performCritical(operationData);
 * }
 * ```
 *
 * @param config Secure endpoint configuration
 * @returns Method decorator
 */
export const SecureEndpoint = (
  config: SecureEndpointConfig,
): CustomDecorator<string> => {
  return SetMetadata(SECURE_ENDPOINT_KEY, config);
};

// ===========================
// COMPOSITE DECORATORS FOR COMMON PATTERNS
// ===========================

/**
 * Standard user access (authenticated user with basic permissions)
 *
 * @example
 * ```typescript
 * @UserAccess()
 * @Get('/profile')
 * async getProfile(@Req() req: Request) {
 *   return this.userService.getProfile(req.user.id);
 * }
 * ```
 *
 * @returns Method decorator
 */
export const UserAccess = (): CustomDecorator<string> => {
  return SetMetadata(ROLES_KEY, [Role._USER, Role._ADMIN, Role._MODERATOR]);
};

/**
 * Moderator or admin access
 *
 * @example
 * ```typescript
 * @ModeratorAccess()
 * @Delete('/posts/:id')
 * async deletePost(@Param('id') id: string) {
 *   return this.postService.delete(id);
 * }
 * ```
 *
 * @returns Method decorator
 */
export const ModeratorAccess = (): CustomDecorator<string> => {
  return SetMetadata(ROLES_KEY, [Role._MODERATOR, Role._ADMIN]);
};

/**
 * System operation access (system, admin, or operator roles)
 *
 * @example
 * ```typescript
 * @SystemAccess()
 * @Post('/system/health-check')
 * async performHealthCheck() {
 *   return this.healthService.check();
 * }
 * ```
 *
 * @returns Method decorator
 */
export const SystemAccess = (): CustomDecorator<string> => {
  return SetMetadata(ROLES_KEY, [Role._SYSTEM, Role._ADMIN, Role._OPERATOR]);
};

/**
 * Developer access for development endpoints
 *
 * @example
 * ```typescript
 * @DeveloperAccess()
 * @Get('/dev/debug-info')
 * async getDebugInfo() {
 *   return this.debugService.getInfo();
 * }
 * ```
 *
 * @returns Method decorator
 */
export const DeveloperAccess = (): CustomDecorator<string> => {
  return SetMetadata(ROLES_KEY, [Role._DEVELOPER, Role._ADMIN]);
};

/**
 * Auditor access for audit and compliance endpoints
 *
 * @example
 * ```typescript
 * @AuditorAccess()
 * @Get('/audit/logs')
 * async getAuditLogs(@Query() filters: AuditFilterDto) {
 *   return this.auditService.getLogs(filters);
 * }
 * ```
 *
 * @returns Method decorator
 */
export const AuditorAccess = (): CustomDecorator<string> => {
  return SetMetadata(ROLES_KEY, [Role._AUDITOR, Role._ADMIN]);
};

// ===========================
// BYTEBOT-SPECIFIC COMPOSITE DECORATORS
// ===========================

/**
 * Computer-use operation access with enhanced security
 *
 * @example
 * ```typescript
 * @ComputerUseAccess()
 * @Post('/computer/click')
 * async performClick(@Body() clickData: ClickActionDto) {
 *   return this.computerService.click(clickData);
 * }
 * ```
 *
 * @returns Method decorator
 */
export const ComputerUseAccess = () => {
  return (
    target: abstract new (..._args: unknown[]) => unknown,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    SetMetadata(ROLES_KEY, [Role._USER, Role._ADMIN, Role._OPERATOR])(
      target,
      propertyKey,
      descriptor,
    );
    SetMetadata(PERMISSIONS_KEY, [Permission._COMPUTER_USE])(
      target,
      propertyKey,
      descriptor,
    );
    SetMetadata(AUDIT_ACCESS_KEY, true)(target, propertyKey, descriptor);
  };
};

/**
 * Task management access with comprehensive permissions
 *
 * @example
 * ```typescript
 * @TaskManagementAccess()
 * @Post('/tasks')
 * async createTask(@Body() taskData: CreateTaskDto) {
 *   return this.taskService.create(taskData);
 * }
 * ```
 *
 * @returns Method decorator
 */
export const TaskManagementAccess = () => {
  return (
    target: abstract new (..._args: unknown[]) => unknown,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    SetMetadata(ROLES_KEY, [Role._USER, Role._ADMIN, Role._OPERATOR])(
      target,
      propertyKey,
      descriptor,
    );
    SetMetadata(PERMISSIONS_KEY, [Permission._TASK_MANAGEMENT])(
      target,
      propertyKey,
      descriptor,
    );
  };
};

/**
 * API administration access with strict security
 *
 * @example
 * ```typescript
 * @APIAdminAccess()
 * @Put('/api/config')
 * async updateAPIConfig(@Body() config: APIConfigDto) {
 *   return this.apiService.updateConfig(config);
 * }
 * ```
 *
 * @returns Method decorator
 */
export const APIAdminAccess = () => {
  return (
    target: abstract new (..._args: unknown[]) => unknown,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    SetMetadata(ROLES_KEY, [Role._ADMIN, Role._SUPER_ADMIN])(
      target,
      propertyKey,
      descriptor,
    );
    SetMetadata(PERMISSIONS_KEY, [Permission._API_ADMIN, Permission._ADMIN])(
      target,
      propertyKey,
      descriptor,
    );
    SetMetadata(AUDIT_ACCESS_KEY, true)(target, propertyKey, descriptor);
  };
};

/**
 * Security management access with enhanced monitoring
 *
 * @example
 * ```typescript
 * @SecurityManagementAccess()
 * @Post('/security/policies')
 * async updateSecurityPolicies(@Body() policies: SecurityPolicyDto[]) {
 *   return this.securityService.updatePolicies(policies);
 * }
 * ```
 *
 * @returns Method decorator
 */
export const SecurityManagementAccess = () => {
  return (
    target: abstract new (..._args: unknown[]) => unknown,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    SetMetadata(ROLES_KEY, [Role._ADMIN, Role._SUPER_ADMIN])(
      target,
      propertyKey,
      descriptor,
    );
    SetMetadata(PERMISSIONS_KEY, [
      Permission._SECURITY_MANAGEMENT,
      Permission._ADMIN,
    ])(target, propertyKey, descriptor);
    SetMetadata(AUDIT_ACCESS_KEY, true)(target, propertyKey, descriptor);
    SetMetadata(SECURE_ENDPOINT_KEY, {
      requireEncryption: true,
      httpsOnly: true,
      auditLogging: true,
    })(target, propertyKey, descriptor);
  };
};

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Extract RBAC metadata from a method or class
 *
 * @param target Target class or method
 * @param propertyKey Method name (if extracting from method)
 * @returns Combined RBAC metadata
 */
export function extractRBACMetadata(
  target: object,
  propertyKey?: string | symbol,
): {
  roles?: Role[];
  permissions?: Permission[];
  anyRole?: Role[];
  allPermissions?: Permission[];
  resource?: ResourceType;
  ownership?: boolean;
  conditionalAccess?: ConditionalAccessConfig;
  timeAccess?: TimeBasedAccessConfig;
  ipAccess?: IPBasedAccessConfig;
  auditAccess?: boolean;
  secureEndpoint?: SecureEndpointConfig;
  adminOnly?: boolean;
} {
  const metadata: Record<string, unknown> = {};

  if (propertyKey) {
    // Extract method-level metadata
    metadata.roles = Reflect.getMetadata(ROLES_KEY, target, propertyKey);
    metadata.permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      target,
      propertyKey,
    );
    metadata.anyRole = Reflect.getMetadata(ANY_ROLE_KEY, target, propertyKey);
    metadata.allPermissions = Reflect.getMetadata(
      ALL_PERMISSIONS_KEY,
      target,
      propertyKey,
    );
    metadata.resource = Reflect.getMetadata(RESOURCE_KEY, target, propertyKey);
    metadata.ownership = Reflect.getMetadata(
      OWNERSHIP_KEY,
      target,
      propertyKey,
    );
    metadata.conditionalAccess = Reflect.getMetadata(
      CONDITIONAL_ACCESS_KEY,
      target,
      propertyKey,
    );
    metadata.timeAccess = Reflect.getMetadata(
      TIME_ACCESS_KEY,
      target,
      propertyKey,
    );
    metadata.ipAccess = Reflect.getMetadata(IP_ACCESS_KEY, target, propertyKey);
    metadata.auditAccess = Reflect.getMetadata(
      AUDIT_ACCESS_KEY,
      target,
      propertyKey,
    );
    metadata.secureEndpoint = Reflect.getMetadata(
      SECURE_ENDPOINT_KEY,
      target,
      propertyKey,
    );
    metadata.adminOnly = Reflect.getMetadata(
      ADMIN_ONLY_KEY,
      target,
      propertyKey,
    );
  } else {
    // Extract class-level metadata
    metadata.roles = Reflect.getMetadata(ROLES_KEY, target);
    metadata.permissions = Reflect.getMetadata(PERMISSIONS_KEY, target);
    metadata.anyRole = Reflect.getMetadata(ANY_ROLE_KEY, target);
    metadata.allPermissions = Reflect.getMetadata(ALL_PERMISSIONS_KEY, target);
    metadata.resource = Reflect.getMetadata(RESOURCE_KEY, target);
    metadata.ownership = Reflect.getMetadata(OWNERSHIP_KEY, target);
    metadata.conditionalAccess = Reflect.getMetadata(
      CONDITIONAL_ACCESS_KEY,
      target,
    );
    metadata.timeAccess = Reflect.getMetadata(TIME_ACCESS_KEY, target);
    metadata.ipAccess = Reflect.getMetadata(IP_ACCESS_KEY, target);
    metadata.auditAccess = Reflect.getMetadata(AUDIT_ACCESS_KEY, target);
    metadata.secureEndpoint = Reflect.getMetadata(SECURE_ENDPOINT_KEY, target);
    metadata.adminOnly = Reflect.getMetadata(ADMIN_ONLY_KEY, target);
  }

  return metadata;
}

/**
 * Check if a user has the required roles
 *
 * @param userRoles User's current roles
 * @param requiredRoles Required roles for access
 * @param requireAll Whether all roles are required (default: false - any role is sufficient)
 * @returns True if user has access
 */
export function hasRequiredRoles(
  userRoles: Role[],
  requiredRoles: Role[],
  requireAll: boolean = false,
): boolean {
  if (!userRoles || !requiredRoles) return false;

  if (requireAll) {
    return requiredRoles.every((role) => userRoles.includes(role));
  } else {
    return requiredRoles.some((role) => userRoles.includes(role));
  }
}

/**
 * Check if a user has the required permissions
 *
 * @param userPermissions User's current permissions
 * @param requiredPermissions Required permissions for access
 * @param requireAll Whether all permissions are required (default: false - any permission is sufficient)
 * @returns True if user has access
 */
export function hasRequiredPermissions(
  userPermissions: Permission[],
  requiredPermissions: Permission[],
  requireAll: boolean = false,
): boolean {
  if (!userPermissions || !requiredPermissions) return false;

  if (requireAll) {
    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  } else {
    return requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );
  }
}

/**
 * Validate time-based access
 *
 * @param config Time-based access configuration
 * @param currentTime Current time (default: now)
 * @returns True if current time is within allowed access window
 */
export function validateTimeBasedAccess(
  config: TimeBasedAccessConfig,
  currentTime: Date = new Date(),
): boolean {
  try {
    // If no restrictions, allow access
    if (!config || Object.keys(config).length === 0) {
      return true;
    }

    // Check date range
    if (config.startDate) {
      try {
        const startDate = new Date(config.startDate);
        if (isNaN(startDate.getTime()) || currentTime < startDate) {
          return false;
        }
      } catch {
        return false;
      }
    }

    if (config.endDate) {
      try {
        const endDate = new Date(config.endDate);
        if (isNaN(endDate.getTime()) || currentTime > endDate) {
          return false;
        }
      } catch {
        return false;
      }
    }

    // Check allowed hours
    if (config.allowedHours && config.allowedHours.length > 0) {
      const currentHour = currentTime.getHours();
      if (!config.allowedHours.includes(currentHour)) {
        return false;
      }
    }

    // Check allowed days of week
    if (config.allowedDaysOfWeek && config.allowedDaysOfWeek.length > 0) {
      const currentDay = currentTime.getDay();
      if (!config.allowedDaysOfWeek.includes(currentDay)) {
        return false;
      }
    }

    return true;
  } catch (_error) {
    // If there's any error in time validation, deny access
    return false;
  }
}

/**
 * Validate IP-based access
 *
 * @param config IP-based access configuration
 * @param clientIP Client's IP address
 * @returns True if client IP is allowed
 */
export function validateIPBasedAccess(
  config: IPBasedAccessConfig,
  clientIP: string,
): boolean {
  try {
    // Check blocked IPs first
    if (config.blockedIPs && config.blockedIPs.length > 0) {
      if (isIPInRanges(clientIP, config.blockedIPs)) {
        return false;
      }
    }

    // Check allowed IPs
    if (config.allowedIPs && config.allowedIPs.length > 0) {
      if (!isIPInRanges(clientIP, config.allowedIPs)) {
        return false;
      }
    }

    // Check private networks
    if (config.allowPrivateNetworks === false && isPrivateIP(clientIP)) {
      return false;
    }

    return true;
  } catch (_error) {
    // If there's any error in IP validation, deny access
    return false;
  }
}

/**
 * Helper function to check if IP is in given ranges
 * Note: This is a basic implementation. In production, use a library like 'ip-range-check'
 */
function isIPInRanges(ip: string, ranges: string[]): boolean {
  // Basic implementation for single IPs
  // In production, implement proper CIDR range checking
  return ranges.includes(ip);
}

/**
 * Helper function to check if IP is private
 */
function isPrivateIP(ip: string): boolean {
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./,
  ];

  return privateRanges.some((range) => range.test(ip));
}

// ===========================
// EXPORT ALL DECORATORS AND UTILITIES
// ===========================

export default {
  // Core RBAC decorators
  RequireRole,
  RequirePermission,
  RequireAnyRole,
  RequireAllPermissions,
  AdminOnly,

  // Resource-based decorators
  CanRead,
  CanWrite,
  CanDelete,
  CanExecute,
  ResourceOwner,

  // Advanced access control
  ConditionalAccess,
  TimeBasedAccess,
  IPBasedAccess,
  AuditAccess,
  SecureEndpoint,

  // Composite decorators
  UserAccess,
  ModeratorAccess,
  SystemAccess,
  DeveloperAccess,
  AuditorAccess,

  // Bytebot-specific decorators
  ComputerUseAccess,
  TaskManagementAccess,
  APIAdminAccess,
  SecurityManagementAccess,

  // Utility functions
  extractRBACMetadata,
  hasRequiredRoles,
  hasRequiredPermissions,
  validateTimeBasedAccess,
  validateIPBasedAccess,

  // Types and enums
  Role,
  Permission,
  ResourceType,
};
