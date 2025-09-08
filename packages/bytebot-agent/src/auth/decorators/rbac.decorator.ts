/**
 * RBAC Decorators - Role-Based Access Control with advanced authorization
 * Implements comprehensive role and permission-based access control decorators
 *
 * Features:
 * - Hierarchical role-based access control with inheritance
 * - Fine-grained permission-based authorization
 * - Context-aware access control with conditions
 * - Dynamic permission evaluation with runtime context
 * - Audit logging and access tracking
 * - Resource-level access control with ownership checks
 *
 * @author RBAC Authorization Specialist
 * @version 2.0.0
 * @since Phase 2: Enterprise Authorization Implementation
 */

import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Role hierarchy definition
 */
export enum Role {
  // System roles
  SUPER_ADMIN = 'super_admin',
  SYSTEM_ADMIN = 'system_admin',

  // Administrative roles
  ADMIN = 'admin',
  MODERATOR = 'moderator',

  // Operational roles
  OPERATOR = 'operator',
  SUPERVISOR = 'supervisor',

  // User roles
  USER = 'user',
  GUEST = 'guest',

  // Service roles
  SERVICE_ACCOUNT = 'service_account',
  API_CLIENT = 'api_client',

  // Special roles
  READONLY = 'readonly',
  DEVELOPER = 'developer',
  AUDITOR = 'auditor',
}

/**
 * Permission categories and specific permissions
 */
export enum Permission {
  // System permissions
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_MAINTENANCE = 'system:maintenance',

  // User management permissions
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  USER_ADMIN = 'user:admin',

  // Task management permissions
  TASK_READ = 'task:read',
  TASK_WRITE = 'task:write',
  TASK_DELETE = 'task:delete',
  TASK_EXECUTE = 'task:execute',
  TASK_ADMIN = 'task:admin',

  // Computer control permissions
  COMPUTER_READ = 'computer:read',
  COMPUTER_CONTROL = 'computer:control',
  COMPUTER_ADMIN = 'computer:admin',

  // Agent management permissions
  AGENT_READ = 'agent:read',
  AGENT_WRITE = 'agent:write',
  AGENT_CONTROL = 'agent:control',
  AGENT_ADMIN = 'agent:admin',

  // Configuration permissions
  CONFIG_READ = 'config:read',
  CONFIG_WRITE = 'config:write',
  CONFIG_ADMIN = 'config:admin',

  // Monitoring permissions
  METRICS_READ = 'metrics:read',
  LOGS_READ = 'logs:read',
  HEALTH_READ = 'health:read',
  AUDIT_READ = 'audit:read',

  // API permissions
  API_READ = 'api:read',
  API_WRITE = 'api:write',
  API_ADMIN = 'api:admin',

  // Security permissions
  SECURITY_READ = 'security:read',
  SECURITY_WRITE = 'security:write',
  SECURITY_ADMIN = 'security:admin',
}

/**
 * Resource types for resource-based access control
 */
export enum ResourceType {
  USER = 'user',
  TASK = 'task',
  AGENT = 'agent',
  COMPUTER = 'computer',
  CONFIG = 'config',
  SYSTEM = 'system',
  API_KEY = 'api_key',
  SESSION = 'session',
}

/**
 * Access context interface for condition-based access control
 */
export interface AccessContext {
  user: {
    id: string;
    username: string;
    email: string;
    roles: string[];
    permissions: string[];
    department?: string;
    level?: number;
  };
  resource?: {
    type: ResourceType;
    id: string;
    ownerId?: string;
    departmentId?: string;
    level?: number;
    metadata?: Record<string, any>;
  };
  request: {
    method: string;
    path: string;
    ip: string;
    userAgent: string;
    timestamp: Date;
  };
  environment: {
    nodeEnv: string;
    time: Date;
    timezone: string;
    location?: string;
  };
}

/**
 * Condition function type for dynamic access control
 */
export type AccessCondition = (
  context: AccessContext,
) => boolean | Promise<boolean>;

/**
 * RBAC metadata interface
 */
export interface RBACMetadata {
  roles?: Role[];
  permissions?: Permission[];
  conditions?: AccessCondition[];
  requireAll?: boolean;
  allowOwner?: boolean;
  allowSameDepartment?: boolean;
  minimumLevel?: number;
  resourceType?: ResourceType;
  auditLevel?: 'none' | 'basic' | 'detailed';
}

/**
 * Metadata keys for decorators
 */
export const RBAC_METADATA_KEY = 'rbac_metadata';
export const PUBLIC_ENDPOINT_KEY = 'isPublic';
export const RESOURCE_OWNERSHIP_KEY = 'resourceOwnership';

/**
 * Role hierarchy mapping for inheritance
 */
export const ROLE_HIERARCHY = new Map<Role, Role[]>([
  // Super admin has all permissions
  [
    Role.SUPER_ADMIN,
    [
      Role.SYSTEM_ADMIN,
      Role.ADMIN,
      Role.MODERATOR,
      Role.OPERATOR,
      Role.SUPERVISOR,
      Role.USER,
      Role.DEVELOPER,
      Role.AUDITOR,
    ],
  ],

  // System admin has administrative permissions
  [Role.SYSTEM_ADMIN, [Role.ADMIN, Role.MODERATOR, Role.OPERATOR, Role.USER]],

  // Admin has moderator and user permissions
  [Role.ADMIN, [Role.MODERATOR, Role.OPERATOR, Role.USER]],

  // Moderator has operator permissions
  [Role.MODERATOR, [Role.OPERATOR, Role.USER]],

  // Supervisor has operator permissions
  [Role.SUPERVISOR, [Role.OPERATOR, Role.USER]],

  // Operator has user permissions
  [Role.OPERATOR, [Role.USER]],

  // Developer has user permissions plus development access
  [Role.DEVELOPER, [Role.USER]],

  // Auditor has readonly access
  [Role.AUDITOR, [Role.READONLY]],
]);

/**
 * Permission mappings for roles
 */
export const ROLE_PERMISSIONS = new Map<Role, Permission[]>([
  [Role.SUPER_ADMIN, Object.values(Permission)],
  [
    Role.SYSTEM_ADMIN,
    [
      Permission.SYSTEM_CONFIG,
      Permission.USER_ADMIN,
      Permission.TASK_ADMIN,
      Permission.AGENT_ADMIN,
      Permission.CONFIG_ADMIN,
      Permission.API_ADMIN,
      Permission.METRICS_READ,
      Permission.LOGS_READ,
      Permission.AUDIT_READ,
    ],
  ],
  [
    Role.ADMIN,
    [
      Permission.USER_READ,
      Permission.USER_WRITE,
      Permission.USER_DELETE,
      Permission.TASK_READ,
      Permission.TASK_WRITE,
      Permission.TASK_DELETE,
      Permission.AGENT_READ,
      Permission.AGENT_WRITE,
      Permission.AGENT_CONTROL,
      Permission.CONFIG_READ,
      Permission.CONFIG_WRITE,
      Permission.METRICS_READ,
      Permission.LOGS_READ,
    ],
  ],
  [
    Role.MODERATOR,
    [
      Permission.USER_READ,
      Permission.USER_WRITE,
      Permission.TASK_READ,
      Permission.TASK_WRITE,
      Permission.AGENT_READ,
      Permission.AGENT_WRITE,
      Permission.CONFIG_READ,
      Permission.METRICS_READ,
    ],
  ],
  [
    Role.OPERATOR,
    [
      Permission.TASK_READ,
      Permission.TASK_WRITE,
      Permission.TASK_EXECUTE,
      Permission.COMPUTER_READ,
      Permission.COMPUTER_CONTROL,
      Permission.AGENT_READ,
      Permission.AGENT_CONTROL,
      Permission.CONFIG_READ,
      Permission.METRICS_READ,
    ],
  ],
  [
    Role.SUPERVISOR,
    [
      Permission.TASK_READ,
      Permission.TASK_WRITE,
      Permission.COMPUTER_READ,
      Permission.COMPUTER_CONTROL,
      Permission.AGENT_READ,
      Permission.METRICS_READ,
    ],
  ],
  [
    Role.USER,
    [
      Permission.TASK_READ,
      Permission.COMPUTER_READ,
      Permission.AGENT_READ,
      Permission.API_READ,
    ],
  ],
  [
    Role.DEVELOPER,
    [
      Permission.TASK_READ,
      Permission.TASK_WRITE,
      Permission.CONFIG_READ,
      Permission.API_READ,
      Permission.API_WRITE,
      Permission.METRICS_READ,
      Permission.LOGS_READ,
    ],
  ],
  [
    Role.AUDITOR,
    [
      Permission.METRICS_READ,
      Permission.LOGS_READ,
      Permission.AUDIT_READ,
      Permission.USER_READ,
      Permission.TASK_READ,
      Permission.AGENT_READ,
    ],
  ],
  [
    Role.READONLY,
    [
      Permission.USER_READ,
      Permission.TASK_READ,
      Permission.AGENT_READ,
      Permission.CONFIG_READ,
      Permission.METRICS_READ,
    ],
  ],
  [
    Role.SERVICE_ACCOUNT,
    [
      Permission.API_READ,
      Permission.API_WRITE,
      Permission.TASK_READ,
      Permission.TASK_WRITE,
      Permission.TASK_EXECUTE,
      Permission.AGENT_READ,
      Permission.AGENT_CONTROL,
    ],
  ],
  [
    Role.API_CLIENT,
    [Permission.API_READ, Permission.TASK_READ, Permission.AGENT_READ],
  ],
]);

/**
 * Require specific roles decorator
 * @param roles - Required roles (user must have at least one)
 * @param requireAll - If true, user must have all roles
 */
export const Roles = (...roles: Role[]) => {
  const metadata: RBACMetadata = { roles, requireAll: false };
  return SetMetadata(RBAC_METADATA_KEY, metadata);
};

/**
 * Require all specified roles decorator
 * @param roles - Required roles (user must have all)
 */
export const RequireAllRoles = (...roles: Role[]) => {
  const metadata: RBACMetadata = { roles, requireAll: true };
  return SetMetadata(RBAC_METADATA_KEY, metadata);
};

/**
 * Require specific permissions decorator
 * @param permissions - Required permissions (user must have at least one)
 */
export const Permissions = (...permissions: Permission[]) => {
  const metadata: RBACMetadata = { permissions, requireAll: false };
  return SetMetadata(RBAC_METADATA_KEY, metadata);
};

/**
 * Require all specified permissions decorator
 * @param permissions - Required permissions (user must have all)
 */
export const RequireAllPermissions = (...permissions: Permission[]) => {
  const metadata: RBACMetadata = { permissions, requireAll: true };
  return SetMetadata(RBAC_METADATA_KEY, metadata);
};

/**
 * Combined role and permission decorator
 * @param options - RBAC configuration options
 */
export const RBAC = (options: RBACMetadata) => {
  return SetMetadata(RBAC_METADATA_KEY, options);
};

/**
 * Resource ownership decorator
 * @param resourceType - Type of resource to check ownership
 * @param allowSameDepartment - Allow access to resources in same department
 */
export const ResourceOwnership = (
  resourceType: ResourceType,
  allowSameDepartment: boolean = false,
) => {
  const metadata: RBACMetadata = {
    resourceType,
    allowOwner: true,
    allowSameDepartment,
  };
  return SetMetadata(RBAC_METADATA_KEY, metadata);
};

/**
 * Conditional access decorator with custom logic
 * @param conditions - Array of condition functions
 * @param auditLevel - Level of audit logging for this endpoint
 */
export const ConditionalAccess = (
  conditions: AccessCondition[],
  auditLevel: 'none' | 'basic' | 'detailed' = 'basic',
) => {
  const metadata: RBACMetadata = { conditions, auditLevel };
  return SetMetadata(RBAC_METADATA_KEY, metadata);
};

/**
 * Department-based access control decorator
 * @param allowSameDepartment - Allow access to users in same department
 * @param minimumLevel - Minimum level required within department
 */
export const DepartmentAccess = (
  allowSameDepartment: boolean = true,
  minimumLevel?: number,
) => {
  const metadata: RBACMetadata = { allowSameDepartment, minimumLevel };
  return SetMetadata(RBAC_METADATA_KEY, metadata);
};

/**
 * Level-based access control decorator
 * @param minimumLevel - Minimum user level required
 */
export const MinimumLevel = (minimumLevel: number) => {
  const metadata: RBACMetadata = { minimumLevel };
  return SetMetadata(RBAC_METADATA_KEY, metadata);
};

/**
 * Public endpoint decorator (bypasses all RBAC checks)
 */
export const Public = () => SetMetadata(PUBLIC_ENDPOINT_KEY, true);

/**
 * Admin only decorator (shorthand for admin roles)
 */
export const AdminOnly = () => {
  return Roles(Role.SUPER_ADMIN, Role.SYSTEM_ADMIN, Role.ADMIN);
};

/**
 * System admin only decorator (shorthand for system admin roles)
 */
export const SystemAdminOnly = () => {
  return Roles(Role.SUPER_ADMIN, Role.SYSTEM_ADMIN);
};

/**
 * Operator or above decorator
 */
export const OperatorOrAbove = () => {
  return Roles(
    Role.SUPER_ADMIN,
    Role.SYSTEM_ADMIN,
    Role.ADMIN,
    Role.MODERATOR,
    Role.SUPERVISOR,
    Role.OPERATOR,
  );
};

/**
 * User parameter decorator to get current user from request
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, context: ExecutionContext): unknown => {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request['user'] as Record<string, unknown> | undefined;

    return data && user ? user[data] : user;
  },
);

/**
 * Security context parameter decorator
 */
export const SecurityContext = createParamDecorator(
  (data: string | undefined, context: ExecutionContext): unknown => {
    const request = context.switchToHttp().getRequest<Request>();
    const securityContext = request['securityContext'] as
      | Record<string, unknown>
      | undefined;

    return data && securityContext ? securityContext[data] : securityContext;
  },
);

/**
 * Resource parameter decorator for resource-based access control
 */
export const Resource = createParamDecorator(
  (
    data: { type: ResourceType; idParam?: string },
    context: ExecutionContext,
  ) => {
    const request = context.switchToHttp().getRequest<Request>();
    const resourceId = request.params[data.idParam || 'id'];

    return {
      type: data.type,
      id: resourceId,
      // Additional resource metadata would be loaded here in production
    };
  },
);

/**
 * Audit decorator for logging access attempts
 * @param level - Audit detail level
 * @param includeRequestBody - Whether to include request body in audit log
 */
export const Audit = (
  level: 'basic' | 'detailed' = 'basic',
  includeRequestBody: boolean = false,
) => {
  const metadata: RBACMetadata = {
    auditLevel: level,
    // Store additional audit options in metadata
    ...(includeRequestBody && { includeRequestBody: true }),
  };
  return SetMetadata(RBAC_METADATA_KEY, metadata);
};

/**
 * Time-based access decorator
 * @param allowedHours - Array of allowed hours (0-23)
 * @param timezone - Timezone for time check
 */
export const TimeBasedAccess = (
  allowedHours: number[],
  timezone: string = 'UTC',
) => {
  const condition: AccessCondition = (_context: AccessContext) => {
    const now = new Date();
    const hour = new Date(
      now.toLocaleString('en-US', { timeZone: timezone }),
    ).getHours();
    return allowedHours.includes(hour);
  };

  return ConditionalAccess([condition], 'detailed');
};

/**
 * IP-based access decorator
 * @param allowedIPs - Array of allowed IP addresses or CIDR blocks
 */
export const IPBasedAccess = (allowedIPs: string[]) => {
  const condition: AccessCondition = (context: AccessContext) => {
    const clientIP = context.request.ip;

    // Simple IP check (in production, would use proper CIDR matching)
    return allowedIPs.some((allowedIP) => {
      if (allowedIP.includes('/')) {
        // CIDR block check would go here
        return false;
      }
      return clientIP === allowedIP;
    });
  };

  return ConditionalAccess([condition], 'detailed');
};

/**
 * Rate limit decorator (works with RBAC for enhanced security)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 */
export const RateLimit = (_maxRequests: number, _windowMs: number) => {
  const condition: AccessCondition = (_context: AccessContext) => {
    // Rate limiting logic would be implemented here
    // This is a placeholder that always returns true
    return true;
  };

  return ConditionalAccess([condition], 'basic');
};

/**
 * Environment-based access decorator
 * @param allowedEnvironments - Allowed environments (development, staging, production)
 */
export const EnvironmentAccess = (allowedEnvironments: string[]) => {
  const condition: AccessCondition = (context: AccessContext) => {
    return allowedEnvironments.includes(context.environment.nodeEnv);
  };

  return ConditionalAccess([condition]);
};

/**
 * Utility function to check if user has role (including hierarchy)
 */
export function hasRole(userRoles: string[], requiredRole: Role): boolean {
  // Direct role match
  if (userRoles.includes(requiredRole)) {
    return true;
  }

  // Check role hierarchy
  for (const userRole of userRoles) {
    const inheritedRoles = ROLE_HIERARCHY.get(userRole as Role) || [];
    if (inheritedRoles.includes(requiredRole)) {
      return true;
    }
  }

  return false;
}

/**
 * Utility function to get all permissions for user roles
 */
export function getUserPermissions(userRoles: string[]): Permission[] {
  const permissions = new Set<Permission>();

  for (const role of userRoles) {
    const rolePermissions = ROLE_PERMISSIONS.get(role as Role) || [];
    rolePermissions.forEach((permission) => permissions.add(permission));

    // Add permissions from inherited roles
    const inheritedRoles = ROLE_HIERARCHY.get(role as Role) || [];
    for (const inheritedRole of inheritedRoles) {
      const inheritedPermissions = ROLE_PERMISSIONS.get(inheritedRole) || [];
      inheritedPermissions.forEach((permission) => permissions.add(permission));
    }
  }

  return Array.from(permissions);
}

/**
 * Utility function to check if user has permission
 */
export function hasPermission(
  userRoles: string[],
  requiredPermission: Permission,
): boolean {
  const userPermissions = getUserPermissions(userRoles);
  return userPermissions.includes(requiredPermission);
}

/**
 * Utility function to check resource ownership
 */
export function checkResourceOwnership(
  userId: string,
  resource: { ownerId?: string; departmentId?: string },
  allowSameDepartment: boolean = false,
  userDepartment?: string,
): boolean {
  // Direct ownership
  if (resource.ownerId === userId) {
    return true;
  }

  // Same department access
  if (
    allowSameDepartment &&
    userDepartment &&
    resource.departmentId === userDepartment
  ) {
    return true;
  }

  return false;
}

/**
 * Predefined common access conditions
 */
export const CommonConditions = {
  /**
   * Business hours only (9 AM - 5 PM)
   */
  businessHoursOnly: (context: AccessContext): boolean => {
    const hour = context.environment.time.getHours();
    return hour >= 9 && hour < 17;
  },

  /**
   * Weekdays only
   */
  weekdaysOnly: (context: AccessContext): boolean => {
    const day = context.environment.time.getDay();
    return day >= 1 && day <= 5; // Monday to Friday
  },

  /**
   * Same user or admin
   */
  sameUserOrAdmin: (context: AccessContext): boolean => {
    const userRoles = context.user.roles;
    const isAdmin = hasRole(userRoles, Role.ADMIN);
    const isSameUser = context.resource?.ownerId === context.user.id;

    return isAdmin || isSameUser;
  },

  /**
   * Production environment only
   */
  productionOnly: (context: AccessContext): boolean => {
    return context.environment.nodeEnv === 'production';
  },

  /**
   * Non-production environments only
   */
  nonProductionOnly: (context: AccessContext): boolean => {
    return context.environment.nodeEnv !== 'production';
  },
};
