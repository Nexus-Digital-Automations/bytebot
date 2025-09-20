import { CustomDecorator } from "@nestjs/common";
import "reflect-metadata";
import { Role, Permission, ResourceType } from "../types/rbac.types";
export interface TimeBasedAccessConfig {
    allowedHours?: number[];
    allowedDaysOfWeek?: number[];
    timezone?: string;
    startDate?: string;
    endDate?: string;
}
export interface IPBasedAccessConfig {
    allowedIPs?: string[];
    blockedIPs?: string[];
    allowPrivateNetworks?: boolean;
    allowedCountries?: string[];
    blockedCountries?: string[];
}
export interface ConditionalAccessConfig {
    requiredAttributes?: Record<string, unknown>;
    conditionFunction?: string;
    requireMFA?: boolean;
    minSessionAge?: number;
    maxSessionAge?: number;
}
export interface SecureEndpointConfig {
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
}
export declare const ROLES_KEY = "roles";
export declare const PERMISSIONS_KEY = "permissions";
export declare const ANY_ROLE_KEY = "any_role";
export declare const ALL_PERMISSIONS_KEY = "all_permissions";
export declare const RESOURCE_KEY = "resource";
export declare const OWNERSHIP_KEY = "ownership";
export declare const CONDITIONAL_ACCESS_KEY = "conditional_access";
export declare const TIME_ACCESS_KEY = "time_access";
export declare const IP_ACCESS_KEY = "ip_access";
export declare const AUDIT_ACCESS_KEY = "audit_access";
export declare const SECURE_ENDPOINT_KEY = "secure_endpoint";
export declare const ADMIN_ONLY_KEY = "admin_only";
export declare const RequireRole: (roles: Role[]) => CustomDecorator<string>;
export declare const RequirePermission: (permissions: Permission[]) => CustomDecorator<string>;
export declare const RequireAnyRole: (roles: Role[]) => CustomDecorator<string>;
export declare const RequireAllPermissions: (permissions: Permission[]) => CustomDecorator<string>;
export declare const AdminOnly: () => CustomDecorator<string>;
export declare const CanRead: (resource: string) => CustomDecorator<string>;
export declare const CanWrite: (resource: string) => CustomDecorator<string>;
export declare const CanDelete: (resource: string) => CustomDecorator<string>;
export declare const CanExecute: (action: string) => CustomDecorator<string>;
export declare const ResourceOwner: () => CustomDecorator<string>;
export declare const ConditionalAccess: (config: ConditionalAccessConfig) => CustomDecorator<string>;
export declare const TimeBasedAccess: (config: TimeBasedAccessConfig) => CustomDecorator<string>;
export declare const IPBasedAccess: (config: IPBasedAccessConfig) => CustomDecorator<string>;
export declare const AuditAccess: () => CustomDecorator<string>;
export declare const SecureEndpoint: (config: SecureEndpointConfig) => CustomDecorator<string>;
export declare const UserAccess: () => CustomDecorator<string>;
export declare const ModeratorAccess: () => CustomDecorator<string>;
export declare const SystemAccess: () => CustomDecorator<string>;
export declare const DeveloperAccess: () => CustomDecorator<string>;
export declare const AuditorAccess: () => CustomDecorator<string>;
export declare const ComputerUseAccess: () => (target: abstract new (..._args: unknown[]) => unknown, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare const TaskManagementAccess: () => (target: abstract new (..._args: unknown[]) => unknown, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare const APIAdminAccess: () => (target: abstract new (..._args: unknown[]) => unknown, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare const SecurityManagementAccess: () => (target: abstract new (..._args: unknown[]) => unknown, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare function extractRBACMetadata(target: object, propertyKey?: string | symbol): {
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
};
export declare function hasRequiredRoles(userRoles: Role[], requiredRoles: Role[], requireAll?: boolean): boolean;
export declare function hasRequiredPermissions(userPermissions: Permission[], requiredPermissions: Permission[], requireAll?: boolean): boolean;
export declare function validateTimeBasedAccess(config: TimeBasedAccessConfig, currentTime?: Date): boolean;
export declare function validateIPBasedAccess(config: IPBasedAccessConfig, clientIP: string): boolean;
declare const _default: {
    RequireRole: (roles: Role[]) => CustomDecorator<string>;
    RequirePermission: (permissions: Permission[]) => CustomDecorator<string>;
    RequireAnyRole: (roles: Role[]) => CustomDecorator<string>;
    RequireAllPermissions: (permissions: Permission[]) => CustomDecorator<string>;
    AdminOnly: () => CustomDecorator<string>;
    CanRead: (resource: string) => CustomDecorator<string>;
    CanWrite: (resource: string) => CustomDecorator<string>;
    CanDelete: (resource: string) => CustomDecorator<string>;
    CanExecute: (action: string) => CustomDecorator<string>;
    ResourceOwner: () => CustomDecorator<string>;
    ConditionalAccess: (config: ConditionalAccessConfig) => CustomDecorator<string>;
    TimeBasedAccess: (config: TimeBasedAccessConfig) => CustomDecorator<string>;
    IPBasedAccess: (config: IPBasedAccessConfig) => CustomDecorator<string>;
    AuditAccess: () => CustomDecorator<string>;
    SecureEndpoint: (config: SecureEndpointConfig) => CustomDecorator<string>;
    UserAccess: () => CustomDecorator<string>;
    ModeratorAccess: () => CustomDecorator<string>;
    SystemAccess: () => CustomDecorator<string>;
    DeveloperAccess: () => CustomDecorator<string>;
    AuditorAccess: () => CustomDecorator<string>;
    ComputerUseAccess: () => (target: abstract new (..._args: unknown[]) => unknown, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => void;
    TaskManagementAccess: () => (target: abstract new (..._args: unknown[]) => unknown, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => void;
    APIAdminAccess: () => (target: abstract new (..._args: unknown[]) => unknown, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => void;
    SecurityManagementAccess: () => (target: abstract new (..._args: unknown[]) => unknown, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => void;
    extractRBACMetadata: typeof extractRBACMetadata;
    hasRequiredRoles: typeof hasRequiredRoles;
    hasRequiredPermissions: typeof hasRequiredPermissions;
    validateTimeBasedAccess: typeof validateTimeBasedAccess;
    validateIPBasedAccess: typeof validateIPBasedAccess;
    Role: typeof Role;
    Permission: typeof Permission;
    ResourceType: typeof ResourceType;
};
export default _default;
//# sourceMappingURL=rbac-authorization.decorators.d.ts.map