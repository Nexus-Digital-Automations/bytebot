"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityManagementAccess = exports.APIAdminAccess = exports.TaskManagementAccess = exports.ComputerUseAccess = exports.AuditorAccess = exports.DeveloperAccess = exports.SystemAccess = exports.ModeratorAccess = exports.UserAccess = exports.SecureEndpoint = exports.AuditAccess = exports.IPBasedAccess = exports.TimeBasedAccess = exports.ConditionalAccess = exports.ResourceOwner = exports.CanExecute = exports.CanDelete = exports.CanWrite = exports.CanRead = exports.AdminOnly = exports.RequireAllPermissions = exports.RequireAnyRole = exports.RequirePermission = exports.RequireRole = exports.ADMIN_ONLY_KEY = exports.SECURE_ENDPOINT_KEY = exports.AUDIT_ACCESS_KEY = exports.IP_ACCESS_KEY = exports.TIME_ACCESS_KEY = exports.CONDITIONAL_ACCESS_KEY = exports.OWNERSHIP_KEY = exports.RESOURCE_KEY = exports.ALL_PERMISSIONS_KEY = exports.ANY_ROLE_KEY = exports.PERMISSIONS_KEY = exports.ROLES_KEY = void 0;
exports.extractRBACMetadata = extractRBACMetadata;
exports.hasRequiredRoles = hasRequiredRoles;
exports.hasRequiredPermissions = hasRequiredPermissions;
exports.validateTimeBasedAccess = validateTimeBasedAccess;
exports.validateIPBasedAccess = validateIPBasedAccess;
const common_1 = require("@nestjs/common");
require("reflect-metadata");
const rbac_types_1 = require("../types/rbac.types");
exports.ROLES_KEY = "roles";
exports.PERMISSIONS_KEY = "permissions";
exports.ANY_ROLE_KEY = "any_role";
exports.ALL_PERMISSIONS_KEY = "all_permissions";
exports.RESOURCE_KEY = "resource";
exports.OWNERSHIP_KEY = "ownership";
exports.CONDITIONAL_ACCESS_KEY = "conditional_access";
exports.TIME_ACCESS_KEY = "time_access";
exports.IP_ACCESS_KEY = "ip_access";
exports.AUDIT_ACCESS_KEY = "audit_access";
exports.SECURE_ENDPOINT_KEY = "secure_endpoint";
exports.ADMIN_ONLY_KEY = "admin_only";
const RequireRole = (roles) => {
    return (0, common_1.SetMetadata)(exports.ROLES_KEY, roles);
};
exports.RequireRole = RequireRole;
const RequirePermission = (permissions) => {
    return (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, permissions);
};
exports.RequirePermission = RequirePermission;
const RequireAnyRole = (roles) => {
    return (0, common_1.SetMetadata)(exports.ANY_ROLE_KEY, roles);
};
exports.RequireAnyRole = RequireAnyRole;
const RequireAllPermissions = (permissions) => {
    return (0, common_1.SetMetadata)(exports.ALL_PERMISSIONS_KEY, permissions);
};
exports.RequireAllPermissions = RequireAllPermissions;
const AdminOnly = () => {
    return (0, common_1.SetMetadata)(exports.ADMIN_ONLY_KEY, true);
};
exports.AdminOnly = AdminOnly;
const CanRead = (resource) => {
    return (0, common_1.SetMetadata)(exports.RESOURCE_KEY, { action: "read", resource });
};
exports.CanRead = CanRead;
const CanWrite = (resource) => {
    return (0, common_1.SetMetadata)(exports.RESOURCE_KEY, { action: "write", resource });
};
exports.CanWrite = CanWrite;
const CanDelete = (resource) => {
    return (0, common_1.SetMetadata)(exports.RESOURCE_KEY, { action: "delete", resource });
};
exports.CanDelete = CanDelete;
const CanExecute = (action) => {
    return (0, common_1.SetMetadata)(exports.RESOURCE_KEY, { action: "execute", resource: action });
};
exports.CanExecute = CanExecute;
const ResourceOwner = () => {
    return (0, common_1.SetMetadata)(exports.OWNERSHIP_KEY, true);
};
exports.ResourceOwner = ResourceOwner;
const ConditionalAccess = (config) => {
    return (0, common_1.SetMetadata)(exports.CONDITIONAL_ACCESS_KEY, config);
};
exports.ConditionalAccess = ConditionalAccess;
const TimeBasedAccess = (config) => {
    return (0, common_1.SetMetadata)(exports.TIME_ACCESS_KEY, config);
};
exports.TimeBasedAccess = TimeBasedAccess;
const IPBasedAccess = (config) => {
    return (0, common_1.SetMetadata)(exports.IP_ACCESS_KEY, config);
};
exports.IPBasedAccess = IPBasedAccess;
const AuditAccess = () => {
    return (0, common_1.SetMetadata)(exports.AUDIT_ACCESS_KEY, true);
};
exports.AuditAccess = AuditAccess;
const SecureEndpoint = (config) => {
    return (0, common_1.SetMetadata)(exports.SECURE_ENDPOINT_KEY, config);
};
exports.SecureEndpoint = SecureEndpoint;
const UserAccess = () => {
    return (0, common_1.SetMetadata)(exports.ROLES_KEY, [rbac_types_1.Role._USER, rbac_types_1.Role._ADMIN, rbac_types_1.Role._MODERATOR]);
};
exports.UserAccess = UserAccess;
const ModeratorAccess = () => {
    return (0, common_1.SetMetadata)(exports.ROLES_KEY, [rbac_types_1.Role._MODERATOR, rbac_types_1.Role._ADMIN]);
};
exports.ModeratorAccess = ModeratorAccess;
const SystemAccess = () => {
    return (0, common_1.SetMetadata)(exports.ROLES_KEY, [rbac_types_1.Role._SYSTEM, rbac_types_1.Role._ADMIN, rbac_types_1.Role._OPERATOR]);
};
exports.SystemAccess = SystemAccess;
const DeveloperAccess = () => {
    return (0, common_1.SetMetadata)(exports.ROLES_KEY, [rbac_types_1.Role._DEVELOPER, rbac_types_1.Role._ADMIN]);
};
exports.DeveloperAccess = DeveloperAccess;
const AuditorAccess = () => {
    return (0, common_1.SetMetadata)(exports.ROLES_KEY, [rbac_types_1.Role._AUDITOR, rbac_types_1.Role._ADMIN]);
};
exports.AuditorAccess = AuditorAccess;
const ComputerUseAccess = () => {
    return (target, propertyKey, descriptor) => {
        if (propertyKey !== undefined && descriptor !== undefined) {
            (0, common_1.SetMetadata)(exports.ROLES_KEY, [rbac_types_1.Role._USER, rbac_types_1.Role._ADMIN, rbac_types_1.Role._OPERATOR])(target, propertyKey, descriptor);
            (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, [rbac_types_1.Permission._COMPUTER_USE])(target, propertyKey, descriptor);
            (0, common_1.SetMetadata)(exports.AUDIT_ACCESS_KEY, true)(target, propertyKey, descriptor);
        }
    };
};
exports.ComputerUseAccess = ComputerUseAccess;
const TaskManagementAccess = () => {
    return (target, propertyKey, descriptor) => {
        if (propertyKey !== undefined && descriptor !== undefined) {
            (0, common_1.SetMetadata)(exports.ROLES_KEY, [rbac_types_1.Role._USER, rbac_types_1.Role._ADMIN, rbac_types_1.Role._OPERATOR])(target, propertyKey, descriptor);
            (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, [rbac_types_1.Permission._TASK_MANAGEMENT])(target, propertyKey, descriptor);
        }
    };
};
exports.TaskManagementAccess = TaskManagementAccess;
const APIAdminAccess = () => {
    return (target, propertyKey, descriptor) => {
        if (propertyKey !== undefined && descriptor !== undefined) {
            (0, common_1.SetMetadata)(exports.ROLES_KEY, [rbac_types_1.Role._ADMIN, rbac_types_1.Role._SUPER_ADMIN])(target, propertyKey, descriptor);
            (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, [rbac_types_1.Permission._API_ADMIN, rbac_types_1.Permission._ADMIN])(target, propertyKey, descriptor);
            (0, common_1.SetMetadata)(exports.AUDIT_ACCESS_KEY, true)(target, propertyKey, descriptor);
        }
    };
};
exports.APIAdminAccess = APIAdminAccess;
const SecurityManagementAccess = () => {
    return (target, propertyKey, descriptor) => {
        if (propertyKey !== undefined && descriptor !== undefined) {
            (0, common_1.SetMetadata)(exports.ROLES_KEY, [rbac_types_1.Role._ADMIN, rbac_types_1.Role._SUPER_ADMIN])(target, propertyKey, descriptor);
            (0, common_1.SetMetadata)(exports.PERMISSIONS_KEY, [
                rbac_types_1.Permission._SECURITY_MANAGEMENT,
                rbac_types_1.Permission._ADMIN,
            ])(target, propertyKey, descriptor);
            (0, common_1.SetMetadata)(exports.AUDIT_ACCESS_KEY, true)(target, propertyKey, descriptor);
            (0, common_1.SetMetadata)(exports.SECURE_ENDPOINT_KEY, {
                requireEncryption: true,
                httpsOnly: true,
                auditLogging: true,
            })(target, propertyKey, descriptor);
        }
    };
};
exports.SecurityManagementAccess = SecurityManagementAccess;
function extractRBACMetadata(target, propertyKey) {
    const metadata = {};
    if (propertyKey) {
        metadata.roles = Reflect.getMetadata(exports.ROLES_KEY, target, propertyKey);
        metadata.permissions = Reflect.getMetadata(exports.PERMISSIONS_KEY, target, propertyKey);
        metadata.anyRole = Reflect.getMetadata(exports.ANY_ROLE_KEY, target, propertyKey);
        metadata.allPermissions = Reflect.getMetadata(exports.ALL_PERMISSIONS_KEY, target, propertyKey);
        metadata.resource = Reflect.getMetadata(exports.RESOURCE_KEY, target, propertyKey);
        metadata.ownership = Reflect.getMetadata(exports.OWNERSHIP_KEY, target, propertyKey);
        metadata.conditionalAccess = Reflect.getMetadata(exports.CONDITIONAL_ACCESS_KEY, target, propertyKey);
        metadata.timeAccess = Reflect.getMetadata(exports.TIME_ACCESS_KEY, target, propertyKey);
        metadata.ipAccess = Reflect.getMetadata(exports.IP_ACCESS_KEY, target, propertyKey);
        metadata.auditAccess = Reflect.getMetadata(exports.AUDIT_ACCESS_KEY, target, propertyKey);
        metadata.secureEndpoint = Reflect.getMetadata(exports.SECURE_ENDPOINT_KEY, target, propertyKey);
        metadata.adminOnly = Reflect.getMetadata(exports.ADMIN_ONLY_KEY, target, propertyKey);
    }
    else {
        metadata.roles = Reflect.getMetadata(exports.ROLES_KEY, target);
        metadata.permissions = Reflect.getMetadata(exports.PERMISSIONS_KEY, target);
        metadata.anyRole = Reflect.getMetadata(exports.ANY_ROLE_KEY, target);
        metadata.allPermissions = Reflect.getMetadata(exports.ALL_PERMISSIONS_KEY, target);
        metadata.resource = Reflect.getMetadata(exports.RESOURCE_KEY, target);
        metadata.ownership = Reflect.getMetadata(exports.OWNERSHIP_KEY, target);
        metadata.conditionalAccess = Reflect.getMetadata(exports.CONDITIONAL_ACCESS_KEY, target);
        metadata.timeAccess = Reflect.getMetadata(exports.TIME_ACCESS_KEY, target);
        metadata.ipAccess = Reflect.getMetadata(exports.IP_ACCESS_KEY, target);
        metadata.auditAccess = Reflect.getMetadata(exports.AUDIT_ACCESS_KEY, target);
        metadata.secureEndpoint = Reflect.getMetadata(exports.SECURE_ENDPOINT_KEY, target);
        metadata.adminOnly = Reflect.getMetadata(exports.ADMIN_ONLY_KEY, target);
    }
    return metadata;
}
function hasRequiredRoles(userRoles, requiredRoles, requireAll = false) {
    if (!userRoles || !requiredRoles)
        return false;
    if (requireAll) {
        return requiredRoles.every((role) => userRoles.includes(role));
    }
    else {
        return requiredRoles.some((role) => userRoles.includes(role));
    }
}
function hasRequiredPermissions(userPermissions, requiredPermissions, requireAll = false) {
    if (!userPermissions || !requiredPermissions)
        return false;
    if (requireAll) {
        return requiredPermissions.every((permission) => userPermissions.includes(permission));
    }
    else {
        return requiredPermissions.some((permission) => userPermissions.includes(permission));
    }
}
function validateTimeBasedAccess(config, currentTime = new Date()) {
    try {
        if (!config || Object.keys(config).length === 0) {
            return true;
        }
        if (config.startDate) {
            try {
                const startDate = new Date(config.startDate);
                if (isNaN(startDate.getTime()) || currentTime < startDate) {
                    return false;
                }
            }
            catch {
                return false;
            }
        }
        if (config.endDate) {
            try {
                const endDate = new Date(config.endDate);
                if (isNaN(endDate.getTime()) || currentTime > endDate) {
                    return false;
                }
            }
            catch {
                return false;
            }
        }
        if (config.allowedHours && config.allowedHours.length > 0) {
            let currentHour;
            if (config.timezone && config.timezone !== "UTC") {
                try {
                    const timeInTimezone = new Date(currentTime.toLocaleString("en-US", { timeZone: config.timezone }));
                    currentHour = timeInTimezone.getHours();
                }
                catch {
                    currentHour = currentTime.getUTCHours();
                }
            }
            else {
                currentHour = currentTime.getUTCHours();
            }
            if (!config.allowedHours.includes(currentHour)) {
                return false;
            }
        }
        if (config.allowedDaysOfWeek && config.allowedDaysOfWeek.length > 0) {
            let currentDay;
            if (config.timezone && config.timezone !== "UTC") {
                try {
                    const timeInTimezone = new Date(currentTime.toLocaleString("en-US", { timeZone: config.timezone }));
                    currentDay = timeInTimezone.getDay();
                }
                catch {
                    currentDay = currentTime.getUTCDay();
                }
            }
            else {
                currentDay = currentTime.getUTCDay();
            }
            if (!config.allowedDaysOfWeek.includes(currentDay)) {
                return false;
            }
        }
        return true;
    }
    catch (_error) {
        return false;
    }
}
function validateIPBasedAccess(config, clientIP) {
    try {
        if (config.blockedIPs && config.blockedIPs.length > 0) {
            if (isIPInRanges(clientIP, config.blockedIPs)) {
                return false;
            }
        }
        if (config.allowedIPs && config.allowedIPs.length > 0) {
            if (!isIPInRanges(clientIP, config.allowedIPs)) {
                return false;
            }
        }
        if (config.allowPrivateNetworks === false && isPrivateIP(clientIP)) {
            return false;
        }
        return true;
    }
    catch (_error) {
        return false;
    }
}
function isIPInRanges(ip, ranges) {
    return ranges.includes(ip);
}
function isPrivateIP(ip) {
    const privateRanges = [
        /^10\./,
        /^172\.(1[6-9]|2\d|3[01])\./,
        /^192\.168\./,
        /^127\./,
        /^169\.254\./,
    ];
    return privateRanges.some((range) => range.test(ip));
}
exports.default = {
    RequireRole: exports.RequireRole,
    RequirePermission: exports.RequirePermission,
    RequireAnyRole: exports.RequireAnyRole,
    RequireAllPermissions: exports.RequireAllPermissions,
    AdminOnly: exports.AdminOnly,
    CanRead: exports.CanRead,
    CanWrite: exports.CanWrite,
    CanDelete: exports.CanDelete,
    CanExecute: exports.CanExecute,
    ResourceOwner: exports.ResourceOwner,
    ConditionalAccess: exports.ConditionalAccess,
    TimeBasedAccess: exports.TimeBasedAccess,
    IPBasedAccess: exports.IPBasedAccess,
    AuditAccess: exports.AuditAccess,
    SecureEndpoint: exports.SecureEndpoint,
    UserAccess: exports.UserAccess,
    ModeratorAccess: exports.ModeratorAccess,
    SystemAccess: exports.SystemAccess,
    DeveloperAccess: exports.DeveloperAccess,
    AuditorAccess: exports.AuditorAccess,
    ComputerUseAccess: exports.ComputerUseAccess,
    TaskManagementAccess: exports.TaskManagementAccess,
    APIAdminAccess: exports.APIAdminAccess,
    SecurityManagementAccess: exports.SecurityManagementAccess,
    extractRBACMetadata,
    hasRequiredRoles,
    hasRequiredPermissions,
    validateTimeBasedAccess,
    validateIPBasedAccess,
    Role: rbac_types_1.Role,
    Permission: rbac_types_1.Permission,
    ResourceType: rbac_types_1.ResourceType,
};
//# sourceMappingURL=rbac-authorization.decorators.js.map