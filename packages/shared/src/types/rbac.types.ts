/**
 * RBAC Type Definitions - Bytebot Platform Role-Based Access Control Types
 *
 * This module provides comprehensive type definitions for the RBAC authorization system
 * including user contexts, security contexts, permission matrices, and metadata types.
 *
 * @fileoverview Type definitions for Bytebot RBAC authorization system
 * @version 2.0.0
 * @author RBAC Decorators Specialist
 */

import {
  Role,
  Permission,
  ResourceType,
} from "../decorators/rbac-authorization.decorators";

// ===========================
// USER CONTEXT TYPES
// ===========================

/**
 * User authentication context
 */
export interface UserContext {
  /** Unique user identifier */
  id: string;

  /** Username or email */
  username: string;

  /** User's assigned roles */
  roles: Role[];

  /** User's granted permissions */
  permissions: Permission[];

  /** User metadata */
  metadata: {
    /** User's department or organization unit */
    department?: string;

    /** User's job title */
    title?: string;

    /** User attributes for conditional access */
    attributes?: Record<string, unknown>;

    /** Multi-factor authentication status */
    mfaEnabled?: boolean;

    /** Last authentication time */
    lastAuthTime?: Date;

    /** Session creation time */
    sessionCreatedAt?: Date;

    /** Session expiration time */
    sessionExpiresAt?: Date;

    /** User's preferred timezone */
    timezone?: string;

    /** User's country code */
    country?: string;
  };
}

/**
 * Request context with authentication and authorization information
 */
export interface RequestContext {
  /** Authenticated user context */
  user: UserContext;

  /** Client IP address */
  clientIP: string;

  /** Request headers */
  headers: Record<string, string>;

  /** User agent information */
  userAgent?: string;

  /** Request timestamp */
  timestamp: Date;

  /** Request ID for tracking */
  requestId: string;

  /** Session information */
  session: {
    /** Session ID */
    id: string;

    /** Session data */
    data?: Record<string, unknown>;

    /** Session age in minutes */
    ageMinutes: number;
  };

  /** Geographic information */
  geo?: {
    /** Country code */
    country: string;

    /** Region/state */
    region?: string;

    /** City */
    city?: string;

    /** Timezone */
    timezone?: string;
  };
}

// ===========================
// SECURITY CONTEXT TYPES
// ===========================

/**
 * Security context for authorization decisions
 */
export interface SecurityContext {
  /** User context */
  user: UserContext;

  /** Resource being accessed */
  resource: {
    /** Resource type */
    type: ResourceType;

    /** Resource identifier */
    id?: string;

    /** Resource owner ID */
    ownerId?: string;

    /** Resource metadata */
    metadata?: Record<string, unknown>;
  };

  /** Action being performed */
  action: {
    /** Action type */
    type: string;

    /** HTTP method */
    method?: string;

    /** Endpoint path */
    path?: string;

    /** Action metadata */
    metadata?: Record<string, unknown>;
  };

  /** Environment context */
  environment: {
    /** Current time */
    currentTime: Date;

    /** Client IP */
    clientIP: string;

    /** Request headers */
    headers: Record<string, string>;

    /** Security level */
    securityLevel: "low" | "medium" | "high" | "critical";
  };
}

// ===========================
// PERMISSION MATRIX TYPES
// ===========================

/**
 * Permission matrix for role-based permissions
 */
export interface PermissionMatrix {
  [role: string]: {
    /** Permissions granted to this role */
    permissions: Permission[];

    /** Resources accessible by this role */
    resources: {
      [resourceType: string]: {
        /** Actions allowed on this resource type */
        actions: string[];

        /** Conditions for access */
        conditions?: {
          /** Ownership required */
          requireOwnership?: boolean;

          /** Time-based restrictions */
          timeRestrictions?: {
            allowedHours?: number[];
            allowedDaysOfWeek?: number[];
          };

          /** Custom conditions */
          customConditions?: string[];
        };
      };
    };

    /** Role metadata */
    metadata?: {
      /** Role description */
      description?: string;

      /** Role hierarchy level */
      level?: number;

      /** Parent roles */
      inheritsFrom?: Role[];

      /** Automatic permissions */
      autoPermissions?: Permission[];
    };
  };
}

/**
 * Access control entry
 */
export interface AccessControlEntry {
  /** Subject (user, role, or group) */
  subject: {
    type: "user" | "role" | "group";
    id: string;
  };

  /** Resource being controlled */
  resource: {
    type: ResourceType;
    id?: string;
    pattern?: string;
  };

  /** Permissions granted */
  permissions: Permission[];

  /** Access conditions */
  conditions?: {
    /** Time-based conditions */
    timeBasedAccess?: {
      startDate?: Date;
      endDate?: Date;
      allowedHours?: number[];
      allowedDaysOfWeek?: number[];
      timezone?: string;
    };

    /** IP-based conditions */
    ipBasedAccess?: {
      allowedIPs?: string[];
      blockedIPs?: string[];
      allowPrivateNetworks?: boolean;
      allowedCountries?: string[];
      blockedCountries?: string[];
    };

    /** Attribute-based conditions */
    attributeBasedAccess?: {
      requiredAttributes?: Record<string, unknown>;
      excludedAttributes?: Record<string, unknown>;
    };

    /** Custom conditions */
    customConditions?: {
      conditionFunction: string;
      parameters?: Record<string, unknown>;
    }[];
  };

  /** ACE metadata */
  metadata: {
    /** ACE description */
    description?: string;

    /** Creation timestamp */
    createdAt: Date;

    /** Created by user ID */
    createdBy: string;

    /** Last modified timestamp */
    modifiedAt?: Date;

    /** Modified by user ID */
    modifiedBy?: string;

    /** Expiration date */
    expiresAt?: Date;

    /** Tags for categorization */
    tags?: string[];
  };
}

// ===========================
// AUTHORIZATION RESULT TYPES
// ===========================

/**
 * Authorization decision result
 */
export interface AuthorizationResult {
  /** Access granted or denied */
  granted: boolean;

  /** Reason for the decision */
  reason: string;

  /** Additional context */
  context: {
    /** Matched rules */
    matchedRules?: string[];

    /** Failed conditions */
    failedConditions?: string[];

    /** Required permissions */
    requiredPermissions?: Permission[];

    /** User's permissions */
    userPermissions?: Permission[];

    /** Required roles */
    requiredRoles?: Role[];

    /** User's roles */
    userRoles?: Role[];
  };

  /** Security metadata */
  security: {
    /** Risk level of the request */
    riskLevel: "low" | "medium" | "high" | "critical";

    /** Security flags */
    flags?: string[];

    /** Audit required */
    auditRequired: boolean;

    /** Additional monitoring */
    requiresMonitoring: boolean;
  };

  /** Timing information */
  timing: {
    /** Authorization check start time */
    startTime: Date;

    /** Authorization check end time */
    endTime: Date;

    /** Duration in milliseconds */
    durationMs: number;
  };
}

/**
 * Batch authorization result
 */
export interface BatchAuthorizationResult {
  /** Individual results */
  results: {
    [requestId: string]: AuthorizationResult;
  };

  /** Overall summary */
  summary: {
    /** Total requests processed */
    totalRequests: number;

    /** Granted requests */
    grantedRequests: number;

    /** Denied requests */
    deniedRequests: number;

    /** Error requests */
    errorRequests: number;

    /** Average processing time */
    averageProcessingTimeMs: number;
  };
}

// ===========================
// METADATA TYPES
// ===========================

/**
 * RBAC metadata extracted from decorators
 */
export interface RBACMetadata {
  /** Required roles */
  roles?: Role[];

  /** Required permissions */
  permissions?: Permission[];

  /** Any role requirement */
  anyRole?: Role[];

  /** All permissions requirement */
  allPermissions?: Permission[];

  /** Resource access configuration */
  resource?: {
    action: string;
    resource: string;
  };

  /** Ownership requirement */
  ownership?: boolean;

  /** Conditional access configuration */
  conditionalAccess?: {
    requiredAttributes?: Record<string, unknown>;
    conditionFunction?: string;
    requireMFA?: boolean;
    minSessionAge?: number;
    maxSessionAge?: number;
  };

  /** Time-based access configuration */
  timeAccess?: {
    allowedHours?: number[];
    allowedDaysOfWeek?: number[];
    timezone?: string;
    startDate?: string;
    endDate?: string;
  };

  /** IP-based access configuration */
  ipAccess?: {
    allowedIPs?: string[];
    blockedIPs?: string[];
    allowPrivateNetworks?: boolean;
    allowedCountries?: string[];
    blockedCountries?: string[];
  };

  /** Audit access requirement */
  auditAccess?: boolean;

  /** Secure endpoint configuration */
  secureEndpoint?: {
    roles?: Role[];
    permissions?: Permission[];
    resourceTypes?: ResourceType[];
    auditLogging?: boolean;
    rateLimit?: {
      requests: number;
      windowMs: number;
    };
    requireEncryption?: boolean;
    httpsOnly?: boolean;
  };

  /** Admin-only requirement */
  adminOnly?: boolean;
}

// ===========================
// GUARD TYPES
// ===========================

/**
 * RBAC guard configuration
 */
export interface RBACGuardConfig {
  /** Enable role-based authorization */
  enableRoleAuthorization: boolean;

  /** Enable permission-based authorization */
  enablePermissionAuthorization: boolean;

  /** Enable resource-based authorization */
  enableResourceAuthorization: boolean;

  /** Enable time-based authorization */
  enableTimeBasedAuthorization: boolean;

  /** Enable IP-based authorization */
  enableIPBasedAuthorization: boolean;

  /** Enable conditional authorization */
  enableConditionalAuthorization: boolean;

  /** Default deny behavior */
  defaultDeny: boolean;

  /** Audit configuration */
  auditConfig: {
    /** Enable audit logging */
    enabled: boolean;

    /** Log successful access */
    logSuccessfulAccess: boolean;

    /** Log denied access */
    logDeniedAccess: boolean;

    /** Log errors */
    logErrors: boolean;

    /** Include sensitive data in logs */
    includeSensitiveData: boolean;
  };

  /** Performance configuration */
  performanceConfig: {
    /** Cache authorization results */
    enableCaching: boolean;

    /** Cache TTL in seconds */
    cacheTTL: number;

    /** Maximum cache size */
    maxCacheSize: number;

    /** Enable performance monitoring */
    enablePerformanceMonitoring: boolean;
  };
}

/**
 * Authorization cache entry
 */
export interface AuthorizationCacheEntry {
  /** Cache key */
  key: string;

  /** Authorization result */
  result: AuthorizationResult;

  /** Cache creation time */
  createdAt: Date;

  /** Cache expiration time */
  expiresAt: Date;

  /** Access count */
  accessCount: number;

  /** Last access time */
  lastAccessed: Date;
}

// ===========================
// EVENT TYPES
// ===========================

/**
 * Authorization event
 */
export interface AuthorizationEvent {
  /** Event ID */
  id: string;

  /** Event type */
  type:
    | "access_granted"
    | "access_denied"
    | "authorization_error"
    | "policy_violation";

  /** Event timestamp */
  timestamp: Date;

  /** User context */
  user: UserContext;

  /** Resource context */
  resource: {
    type: ResourceType;
    id?: string;
    action: string;
  };

  /** Authorization result */
  result: AuthorizationResult;

  /** Request context */
  request: {
    ip: string;
    userAgent?: string;
    headers: Record<string, string>;
    method: string;
    path: string;
  };

  /** Event metadata */
  metadata: {
    /** Event severity */
    severity: "low" | "medium" | "high" | "critical";

    /** Event category */
    category: string;

    /** Additional context */
    additionalContext?: Record<string, unknown>;
  };
}

// ===========================
// SERVICE INTERFACE TYPES
// ===========================

/**
 * RBAC service interface
 */
export interface IRBACService {
  /**
   * Check if user has required roles
   */
  hasRoles(
    _userRoles: Role[],
    _requiredRoles: Role[],
    _requireAll?: boolean,
  ): boolean;

  /**
   * Check if user has required permissions
   */
  hasPermissions(
    _userPermissions: Permission[],
    _requiredPermissions: Permission[],
    _requireAll?: boolean,
  ): boolean;

  /**
   * Check resource ownership
   */
  isResourceOwner(_userId: string, _resourceOwnerId: string): boolean;

  /**
   * Validate time-based access
   */
  validateTimeBasedAccess(
    _config: RBACMetadata["timeAccess"],
    _currentTime?: Date,
  ): boolean;

  /**
   * Validate IP-based access
   */
  validateIPBasedAccess(
    _config: RBACMetadata["ipAccess"],
    _clientIP: string,
  ): boolean;

  /**
   * Validate conditional access
   */
  validateConditionalAccess(
    _config: RBACMetadata["conditionalAccess"],
    _context: SecurityContext,
  ): Promise<boolean>;

  /**
   * Perform comprehensive authorization check
   */
  authorize(
    _metadata: RBACMetadata,
    _context: SecurityContext,
  ): Promise<AuthorizationResult>;

  /**
   * Batch authorization check
   */
  batchAuthorize(
    _requests: Array<{ metadata: RBACMetadata; context: SecurityContext }>,
  ): Promise<BatchAuthorizationResult>;
}

/**
 * Permission service interface
 */
export interface IPermissionService {
  /**
   * Get user permissions
   */
  getUserPermissions(_userId: string): Promise<Permission[]>;

  /**
   * Get role permissions
   */
  getRolePermissions(_role: Role): Promise<Permission[]>;

  /**
   * Grant permission to user
   */
  grantPermissionToUser(
    _userId: string,
    _permission: Permission,
  ): Promise<void>;

  /**
   * Revoke permission from user
   */
  revokePermissionFromUser(
    _userId: string,
    _permission: Permission,
  ): Promise<void>;

  /**
   * Check effective permissions (includes role-based and direct permissions)
   */
  getEffectivePermissions(_userId: string): Promise<Permission[]>;
}

// ===========================
// NOTE: Types are exported automatically by TypeScript
// No need for explicit re-exports to avoid conflicts
// ===========================
