export declare enum ResourceType {
    _USER = "user",
    _TASK = "task",
    _SYSTEM = "system",
    _FILE = "file",
    _API = "api",
    _COMPUTER = "computer",
    _AUDIT = "audit",
    _SECURITY = "security"
}
export declare enum Role {
    _ADMIN = "admin",
    _USER = "user",
    _MODERATOR = "moderator",
    _SYSTEM = "system",
    _GUEST = "guest",
    _DEVELOPER = "developer",
    _OPERATOR = "operator",
    _ANALYST = "analyst",
    _AUDITOR = "auditor",
    _SUPER_ADMIN = "super_admin"
}
export declare enum Permission {
    _READ = "read",
    _WRITE = "write",
    _DELETE = "delete",
    _UPDATE = "update",
    _CREATE = "create",
    _TASK_READ = "task:read",
    _TASK_WRITE = "task:write",
    _TASK_DELETE = "task:delete",
    _EXECUTE = "execute",
    _ADMIN = "admin",
    _CONFIGURE = "configure",
    _MONITOR = "monitor",
    _USER_MANAGEMENT = "user_management",
    _TASK_MANAGEMENT = "task_management",
    _SYSTEM_MANAGEMENT = "system_management",
    _AUDIT_ACCESS = "audit_access",
    _SECURITY_MANAGEMENT = "security_management",
    _API_ACCESS = "api_access",
    _API_WRITE = "api_write",
    _API_ADMIN = "api_admin",
    _COMPUTER_USE = "computer_use",
    _COMPUTER_ADMIN = "computer_admin",
    _SCREEN_CAPTURE = "screen_capture",
    _FILE_ACCESS = "file_access"
}
export interface UserContext {
    id: string;
    username: string;
    roles: Role[];
    permissions: Permission[];
    metadata: {
        department?: string;
        title?: string;
        attributes?: Record<string, unknown>;
        mfaEnabled?: boolean;
        lastAuthTime?: Date;
        sessionCreatedAt?: Date;
        sessionExpiresAt?: Date;
        timezone?: string;
        country?: string;
    };
}
export interface RequestContext {
    user: UserContext;
    clientIP: string;
    headers: Record<string, string>;
    userAgent?: string;
    timestamp: Date;
    requestId: string;
    session: {
        id: string;
        data?: Record<string, unknown>;
        ageMinutes: number;
    };
    geo?: {
        country: string;
        region?: string;
        city?: string;
        timezone?: string;
    };
}
export interface SecurityContext {
    user: UserContext;
    resource: {
        type: ResourceType;
        id?: string;
        ownerId?: string;
        metadata?: Record<string, unknown>;
    };
    action: {
        type: string;
        method?: string;
        path?: string;
        metadata?: Record<string, unknown>;
    };
    environment: {
        currentTime: Date;
        clientIP: string;
        headers: Record<string, string>;
        securityLevel: "low" | "medium" | "high" | "critical";
    };
}
export interface PermissionMatrix {
    [role: string]: {
        permissions: Permission[];
        resources: {
            [resourceType: string]: {
                actions: string[];
                conditions?: {
                    requireOwnership?: boolean;
                    timeRestrictions?: {
                        allowedHours?: number[];
                        allowedDaysOfWeek?: number[];
                    };
                    customConditions?: string[];
                };
            };
        };
        metadata?: {
            description?: string;
            level?: number;
            inheritsFrom?: Role[];
            autoPermissions?: Permission[];
        };
    };
}
export interface AccessControlEntry {
    subject: {
        type: "user" | "role" | "group";
        id: string;
    };
    resource: {
        type: ResourceType;
        id?: string;
        pattern?: string;
    };
    permissions: Permission[];
    conditions?: {
        timeBasedAccess?: {
            startDate?: Date;
            endDate?: Date;
            allowedHours?: number[];
            allowedDaysOfWeek?: number[];
            timezone?: string;
        };
        ipBasedAccess?: {
            allowedIPs?: string[];
            blockedIPs?: string[];
            allowPrivateNetworks?: boolean;
            allowedCountries?: string[];
            blockedCountries?: string[];
        };
        attributeBasedAccess?: {
            requiredAttributes?: Record<string, unknown>;
            excludedAttributes?: Record<string, unknown>;
        };
        customConditions?: {
            conditionFunction: string;
            parameters?: Record<string, unknown>;
        }[];
    };
    metadata: {
        description?: string;
        createdAt: Date;
        createdBy: string;
        modifiedAt?: Date;
        modifiedBy?: string;
        expiresAt?: Date;
        tags?: string[];
    };
}
export interface AuthorizationResult {
    granted: boolean;
    reason: string;
    context: {
        matchedRules?: string[];
        failedConditions?: string[];
        requiredPermissions?: Permission[];
        userPermissions?: Permission[];
        requiredRoles?: Role[];
        userRoles?: Role[];
    };
    security: {
        riskLevel: "low" | "medium" | "high" | "critical";
        flags?: string[];
        auditRequired: boolean;
        requiresMonitoring: boolean;
    };
    timing: {
        startTime: Date;
        endTime: Date;
        durationMs: number;
    };
}
export interface BatchAuthorizationResult {
    results: {
        [requestId: string]: AuthorizationResult;
    };
    summary: {
        totalRequests: number;
        grantedRequests: number;
        deniedRequests: number;
        errorRequests: number;
        averageProcessingTimeMs: number;
    };
}
export interface RBACMetadata {
    roles?: Role[];
    permissions?: Permission[];
    anyRole?: Role[];
    allPermissions?: Permission[];
    resource?: {
        action: string;
        resource: string;
    };
    ownership?: boolean;
    conditionalAccess?: {
        requiredAttributes?: Record<string, unknown>;
        conditionFunction?: string;
        requireMFA?: boolean;
        minSessionAge?: number;
        maxSessionAge?: number;
    };
    timeAccess?: {
        allowedHours?: number[];
        allowedDaysOfWeek?: number[];
        timezone?: string;
        startDate?: string;
        endDate?: string;
    };
    ipAccess?: {
        allowedIPs?: string[];
        blockedIPs?: string[];
        allowPrivateNetworks?: boolean;
        allowedCountries?: string[];
        blockedCountries?: string[];
    };
    auditAccess?: boolean;
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
    adminOnly?: boolean;
}
export interface RBACGuardConfig {
    enableRoleAuthorization: boolean;
    enablePermissionAuthorization: boolean;
    enableResourceAuthorization: boolean;
    enableTimeBasedAuthorization: boolean;
    enableIPBasedAuthorization: boolean;
    enableConditionalAuthorization: boolean;
    defaultDeny: boolean;
    auditConfig: {
        enabled: boolean;
        logSuccessfulAccess: boolean;
        logDeniedAccess: boolean;
        logErrors: boolean;
        includeSensitiveData: boolean;
    };
    performanceConfig: {
        enableCaching: boolean;
        cacheTTL: number;
        maxCacheSize: number;
        enablePerformanceMonitoring: boolean;
    };
}
export interface AuthorizationCacheEntry {
    key: string;
    result: AuthorizationResult;
    createdAt: Date;
    expiresAt: Date;
    accessCount: number;
    lastAccessed: Date;
}
export interface AuthorizationEvent {
    id: string;
    type: "access_granted" | "access_denied" | "authorization_error" | "policy_violation";
    timestamp: Date;
    user: UserContext;
    resource: {
        type: ResourceType;
        id?: string;
        action: string;
    };
    result: AuthorizationResult;
    request: {
        ip: string;
        userAgent?: string;
        headers: Record<string, string>;
        method: string;
        path: string;
    };
    metadata: {
        severity: "low" | "medium" | "high" | "critical";
        category: string;
        additionalContext?: Record<string, unknown>;
    };
}
export interface IRBACService {
    hasRoles(_userRoles: Role[], _requiredRoles: Role[], _requireAll?: boolean): boolean;
    hasPermissions(_userPermissions: Permission[], _requiredPermissions: Permission[], _requireAll?: boolean): boolean;
    isResourceOwner(_userId: string, _resourceOwnerId: string): boolean;
    validateTimeBasedAccess(_config: RBACMetadata["timeAccess"], _currentTime?: Date): boolean;
    validateIPBasedAccess(_config: RBACMetadata["ipAccess"], _clientIP: string): boolean;
    validateConditionalAccess(_config: RBACMetadata["conditionalAccess"], _context: SecurityContext): Promise<boolean>;
    authorize(_metadata: RBACMetadata, _context: SecurityContext): Promise<AuthorizationResult>;
    batchAuthorize(_requests: Array<{
        metadata: RBACMetadata;
        context: SecurityContext;
    }>): Promise<BatchAuthorizationResult>;
}
export interface IPermissionService {
    getUserPermissions(_userId: string): Promise<Permission[]>;
    getRolePermissions(_role: Role): Promise<Permission[]>;
    grantPermissionToUser(_userId: string, _permission: Permission): Promise<void>;
    revokePermissionFromUser(_userId: string, _permission: Permission): Promise<void>;
    getEffectivePermissions(_userId: string): Promise<Permission[]>;
}
//# sourceMappingURL=rbac.types.d.ts.map