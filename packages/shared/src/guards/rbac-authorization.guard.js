"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RBACAuthorizationGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBACAuthorizationGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const cache_manager_1 = require("@nestjs/cache-manager");
const rbac_authorization_decorators_1 = require("../decorators/rbac-authorization.decorators");
const rbac_types_1 = require("../types/rbac.types");
let RBACAuthorizationGuard = RBACAuthorizationGuard_1 = class RBACAuthorizationGuard {
    constructor(_reflector, _configService, _cacheManager) {
        this._reflector = _reflector;
        this._configService = _configService;
        this._cacheManager = _cacheManager;
        this.logger = new common_1.Logger(RBACAuthorizationGuard_1.name);
        this.auditLogPath = this._configService.get("security.audit.logPath", "./logs/security-audit.log");
        this.enableDetailedLogging = this._configService.get("security.audit.detailedLogging", true);
        this.permissionCacheTimeout = this._configService.get("security.permissionCacheTimeout", 5 * 60 * 1000);
        this.logger.log("RBAC Authorization Guard initialized with local-only architecture", {
            auditLogPath: this.auditLogPath,
            enableDetailedLogging: this.enableDetailedLogging,
            permissionCacheTimeout: this.permissionCacheTimeout,
        });
    }
    async canActivate(context) {
        const operationId = `rbac-guard-${Date.now()}`;
        const startTime = Date.now();
        const request = context.switchToHttp().getRequest();
        const handler = context.getHandler();
        const controllerClass = context.getClass();
        this.logger.debug(`[${operationId}] RBAC authorization check initiated`, {
            operationId,
            method: request.method,
            url: request.url,
            handler: handler.name,
            controller: controllerClass.name,
        });
        try {
            const user = this.extractUserFromRequest(request);
            if (!user) {
                throw new common_1.UnauthorizedException("Authentication required for RBAC check");
            }
            const rbacMetadata = this.extractRBACMetadata(context, handler, controllerClass);
            if (this.isEmptyRBACMetadata(rbacMetadata)) {
                this.logger.debug(`[${operationId}] No RBAC metadata found, allowing access`, {
                    operationId,
                    userId: user.id,
                });
                return true;
            }
            const authResult = await this.performAuthorizationCheck(operationId, user, rbacMetadata, request);
            if (!authResult.granted) {
                await this.logSecurityEvent(request, {
                    timestamp: new Date(),
                    type: "ACCESS_DENIED",
                    userId: user.id,
                    username: user.username,
                    endpoint: request.url,
                    method: request.method,
                    ipAddress: this.getClientIP(request),
                    userAgent: request.headers["user-agent"],
                    reason: authResult.reason,
                    metadata: {
                        operationId,
                        requiredRoles: authResult.requiredRoles,
                        requiredPermissions: authResult.requiredPermissions,
                        missingRoles: authResult.missingRoles,
                        missingPermissions: authResult.missingPermissions,
                    },
                });
                this.logger.warn(`[${operationId}] Access denied`, {
                    operationId,
                    userId: user.id,
                    username: user.username,
                    reason: authResult.reason,
                    requiredRoles: authResult.requiredRoles,
                    requiredPermissions: authResult.requiredPermissions,
                });
                throw new common_1.ForbiddenException(authResult.reason || "Insufficient permissions for this operation");
            }
            await this.logSecurityEvent(request, {
                timestamp: new Date(),
                type: "ACCESS_GRANTED",
                userId: user.id,
                username: user.username,
                endpoint: request.url,
                method: request.method,
                ipAddress: this.getClientIP(request),
                userAgent: request.headers["user-agent"],
                metadata: {
                    operationId,
                    grantedRoles: authResult.requiredRoles,
                    grantedPermissions: authResult.requiredPermissions,
                    evaluatedConditions: authResult.evaluatedConditions,
                    authorizationTime: Date.now() - startTime,
                },
            });
            this.logger.debug(`[${operationId}] Access granted`, {
                operationId,
                userId: user.id,
                username: user.username,
                authorizationTime: Date.now() - startTime,
            });
            return true;
        }
        catch (err) {
            const authTime = Date.now() - startTime;
            this.logger.error(`[${operationId}] RBAC authorization error`, {
                operationId,
                error: err instanceof Error ? err.message : String(err),
                authorizationTime: authTime,
                url: request.url,
                method: request.method,
            });
            if (err instanceof common_1.ForbiddenException ||
                err instanceof common_1.UnauthorizedException) {
                throw err;
            }
            throw new common_1.ForbiddenException("Authorization check failed");
        }
    }
    extractUserFromRequest(request) {
        return request.user || null;
    }
    extractRBACMetadata(context, handler, controllerClass) {
        return {
            roles: this._reflector.getAllAndOverride(rbac_authorization_decorators_1.ROLES_KEY, [
                handler,
                controllerClass,
            ]),
            permissions: this._reflector.getAllAndOverride(rbac_authorization_decorators_1.PERMISSIONS_KEY, [handler, controllerClass]),
            anyRole: this._reflector.getAllAndOverride(rbac_authorization_decorators_1.ANY_ROLE_KEY, [
                handler,
                controllerClass,
            ]),
            allPermissions: this._reflector.getAllAndOverride(rbac_authorization_decorators_1.ALL_PERMISSIONS_KEY, [handler, controllerClass]),
            resource: this._reflector.getAllAndOverride(rbac_authorization_decorators_1.RESOURCE_KEY, [handler, controllerClass]),
            ownership: this._reflector.getAllAndOverride(rbac_authorization_decorators_1.OWNERSHIP_KEY, [
                handler,
                controllerClass,
            ]),
            conditionalAccess: this._reflector.getAllAndOverride(rbac_authorization_decorators_1.CONDITIONAL_ACCESS_KEY, [handler, controllerClass]),
            timeAccess: this._reflector.getAllAndOverride(rbac_authorization_decorators_1.TIME_ACCESS_KEY, [handler, controllerClass]),
            ipAccess: this._reflector.getAllAndOverride(rbac_authorization_decorators_1.IP_ACCESS_KEY, [handler, controllerClass]),
            auditAccess: this._reflector.getAllAndOverride(rbac_authorization_decorators_1.AUDIT_ACCESS_KEY, [handler, controllerClass]),
            secureEndpoint: this._reflector.getAllAndOverride(rbac_authorization_decorators_1.SECURE_ENDPOINT_KEY, [handler, controllerClass]),
            adminOnly: this._reflector.getAllAndOverride(rbac_authorization_decorators_1.ADMIN_ONLY_KEY, [
                handler,
                controllerClass,
            ]),
        };
    }
    isEmptyRBACMetadata(metadata) {
        return !Object.values(metadata).some((value) => value !== undefined && value !== null && value !== false);
    }
    async performAuthorizationCheck(operationId, user, metadata, request) {
        const result = {
            granted: false,
            evaluatedConditions: [],
        };
        try {
            if (metadata.adminOnly) {
                result.evaluatedConditions.push("admin-only");
                if (!this.isAdmin(user)) {
                    result.reason = "Admin access required";
                    return result;
                }
            }
            if (metadata.roles && metadata.roles.length > 0) {
                result.evaluatedConditions.push("roles");
                result.requiredRoles = metadata.roles;
                const userRoles = this.getUserRoles(user);
                const hasRole = metadata.roles.some((role) => userRoles.includes(role));
                if (!hasRole) {
                    result.missingRoles = metadata.roles.filter((role) => !userRoles.includes(role));
                    result.reason = `Required roles: ${metadata.roles.join(", ")}`;
                    return result;
                }
            }
            if (metadata.anyRole && metadata.anyRole.length > 0) {
                result.evaluatedConditions.push("any-role");
                const userRoles = this.getUserRoles(user);
                const hasAnyRole = metadata.anyRole.some((role) => userRoles.includes(role));
                if (!hasAnyRole) {
                    result.reason = `Required any of roles: ${metadata.anyRole.join(", ")}`;
                    return result;
                }
            }
            if (metadata.permissions && metadata.permissions.length > 0) {
                result.evaluatedConditions.push("permissions");
                result.requiredPermissions = metadata.permissions;
                const userPermissions = await this.getUserPermissions(operationId, user);
                const hasPermission = metadata.permissions.some((permission) => userPermissions.includes(permission));
                if (!hasPermission) {
                    result.missingPermissions = metadata.permissions.filter((permission) => !userPermissions.includes(permission));
                    result.reason = `Required permissions: ${metadata.permissions.join(", ")}`;
                    return result;
                }
            }
            if (metadata.allPermissions && metadata.allPermissions.length > 0) {
                result.evaluatedConditions.push("all-permissions");
                const userPermissions = await this.getUserPermissions(operationId, user);
                const hasAllPermissions = metadata.allPermissions.every((permission) => userPermissions.includes(permission));
                if (!hasAllPermissions) {
                    result.missingPermissions = metadata.allPermissions.filter((permission) => !userPermissions.includes(permission));
                    result.reason = `Required all permissions: ${metadata.allPermissions.join(", ")}`;
                    return result;
                }
            }
            if (metadata.timeAccess) {
                result.evaluatedConditions.push("time-based");
                if (!(0, rbac_authorization_decorators_1.validateTimeBasedAccess)(metadata.timeAccess)) {
                    result.reason = "Access not allowed at this time";
                    return result;
                }
            }
            if (metadata.ipAccess) {
                result.evaluatedConditions.push("ip-based");
                const clientIP = this.getClientIP(request);
                if (!(0, rbac_authorization_decorators_1.validateIPBasedAccess)(metadata.ipAccess, clientIP)) {
                    result.reason = "Access not allowed from this IP address";
                    return result;
                }
            }
            if (metadata.conditionalAccess) {
                result.evaluatedConditions.push("conditional");
                const conditionResult = this.validateConditionalAccess(operationId, metadata.conditionalAccess, user, request);
                if (!conditionResult.granted) {
                    result.reason =
                        conditionResult.reason || "Conditional access requirements not met";
                    return result;
                }
            }
            if (metadata.ownership) {
                result.evaluatedConditions.push("ownership");
                const ownershipResult = this.validateResourceOwnership(operationId, user, request);
                if (!ownershipResult) {
                    result.reason = "Resource ownership required";
                    return result;
                }
            }
            result.granted = true;
            return result;
        }
        catch (err) {
            this.logger.error(`[${operationId}] Authorization check error`, {
                operationId,
                error: err instanceof Error ? err.message : String(err),
                userId: user.id,
            });
            result.reason = "Authorization check failed";
            return result;
        }
    }
    isAdmin(user) {
        const userRoles = this.getUserRoles(user);
        return (userRoles.includes(rbac_types_1.Role._ADMIN) || userRoles.includes(rbac_types_1.Role._SUPER_ADMIN));
    }
    getUserRoles(user) {
        if (user.roles && Array.isArray(user.roles)) {
            return user.roles;
        }
        if (user.role) {
            return [user.role];
        }
        return [rbac_types_1.Role._GUEST];
    }
    async getUserPermissions(operationId, user) {
        try {
            const cacheKey = `permissions:${user.id}`;
            const cachedPermissions = await this._cacheManager.get(cacheKey);
            if (cachedPermissions) {
                this.logger.debug(`[${operationId}] Using cached permissions`, {
                    operationId,
                    userId: user.id,
                    permissionCount: cachedPermissions.length,
                });
                return cachedPermissions;
            }
            let permissions = [];
            if (user.permissions && Array.isArray(user.permissions)) {
                permissions = user.permissions;
            }
            else {
                const userRoles = this.getUserRoles(user);
                permissions = this.derivePermissionsFromRoles(userRoles);
            }
            await this._cacheManager.set(cacheKey, permissions, this.permissionCacheTimeout);
            this.logger.debug(`[${operationId}] Loaded and cached user permissions`, {
                operationId,
                userId: user.id,
                permissionCount: permissions.length,
            });
            return permissions;
        }
        catch (err) {
            this.logger.error(`[${operationId}] Error getting user permissions`, {
                operationId,
                error: err instanceof Error ? err.message : String(err),
                userId: user.id,
            });
            return [];
        }
    }
    derivePermissionsFromRoles(roles) {
        const permissions = [];
        for (const role of roles) {
            switch (role) {
                case rbac_types_1.Role._SUPER_ADMIN:
                case rbac_types_1.Role._ADMIN:
                    permissions.push(rbac_types_1.Permission._READ, rbac_types_1.Permission._WRITE, rbac_types_1.Permission._DELETE, rbac_types_1.Permission._UPDATE, rbac_types_1.Permission._CREATE, rbac_types_1.Permission._EXECUTE, rbac_types_1.Permission._ADMIN, rbac_types_1.Permission._CONFIGURE, rbac_types_1.Permission._MONITOR, rbac_types_1.Permission._USER_MANAGEMENT, rbac_types_1.Permission._TASK_MANAGEMENT, rbac_types_1.Permission._SYSTEM_MANAGEMENT, rbac_types_1.Permission._AUDIT_ACCESS, rbac_types_1.Permission._SECURITY_MANAGEMENT, rbac_types_1.Permission._API_ACCESS, rbac_types_1.Permission._API_WRITE, rbac_types_1.Permission._API_ADMIN, rbac_types_1.Permission._COMPUTER_USE, rbac_types_1.Permission._COMPUTER_ADMIN, rbac_types_1.Permission._SCREEN_CAPTURE, rbac_types_1.Permission._FILE_ACCESS);
                    break;
                case rbac_types_1.Role._OPERATOR:
                    permissions.push(rbac_types_1.Permission._READ, rbac_types_1.Permission._WRITE, rbac_types_1.Permission._UPDATE, rbac_types_1.Permission._CREATE, rbac_types_1.Permission._EXECUTE, rbac_types_1.Permission._MONITOR, rbac_types_1.Permission._TASK_MANAGEMENT, rbac_types_1.Permission._API_ACCESS, rbac_types_1.Permission._API_WRITE, rbac_types_1.Permission._COMPUTER_USE, rbac_types_1.Permission._SCREEN_CAPTURE, rbac_types_1.Permission._FILE_ACCESS);
                    break;
                case rbac_types_1.Role._USER:
                    permissions.push(rbac_types_1.Permission._READ, rbac_types_1.Permission._WRITE, rbac_types_1.Permission._UPDATE, rbac_types_1.Permission._CREATE, rbac_types_1.Permission._API_ACCESS, rbac_types_1.Permission._COMPUTER_USE, rbac_types_1.Permission._FILE_ACCESS);
                    break;
                case rbac_types_1.Role._DEVELOPER:
                    permissions.push(rbac_types_1.Permission._READ, rbac_types_1.Permission._WRITE, rbac_types_1.Permission._UPDATE, rbac_types_1.Permission._CREATE, rbac_types_1.Permission._EXECUTE, rbac_types_1.Permission._MONITOR, rbac_types_1.Permission._API_ACCESS, rbac_types_1.Permission._API_WRITE, rbac_types_1.Permission._COMPUTER_USE, rbac_types_1.Permission._FILE_ACCESS);
                    break;
                case rbac_types_1.Role._ANALYST:
                    permissions.push(rbac_types_1.Permission._READ, rbac_types_1.Permission._MONITOR, rbac_types_1.Permission._AUDIT_ACCESS, rbac_types_1.Permission._API_ACCESS);
                    break;
                case rbac_types_1.Role._AUDITOR:
                    permissions.push(rbac_types_1.Permission._READ, rbac_types_1.Permission._AUDIT_ACCESS, rbac_types_1.Permission._MONITOR, rbac_types_1.Permission._API_ACCESS);
                    break;
                case rbac_types_1.Role._MODERATOR:
                    permissions.push(rbac_types_1.Permission._READ, rbac_types_1.Permission._WRITE, rbac_types_1.Permission._UPDATE, rbac_types_1.Permission._DELETE, rbac_types_1.Permission._USER_MANAGEMENT, rbac_types_1.Permission._API_ACCESS);
                    break;
                case rbac_types_1.Role._GUEST:
                    permissions.push(rbac_types_1.Permission._READ, rbac_types_1.Permission._API_ACCESS);
                    break;
                case rbac_types_1.Role._SYSTEM:
                    permissions.push(rbac_types_1.Permission._READ, rbac_types_1.Permission._WRITE, rbac_types_1.Permission._UPDATE, rbac_types_1.Permission._CREATE, rbac_types_1.Permission._DELETE, rbac_types_1.Permission._EXECUTE, rbac_types_1.Permission._SYSTEM_MANAGEMENT, rbac_types_1.Permission._API_ACCESS);
                    break;
                default:
                    break;
            }
        }
        return Array.from(new Set(permissions));
    }
    validateConditionalAccess(operationId, config, user, request) {
        try {
            if (config.requiredAttributes) {
                const userMetadata = user.metadata || {};
                for (const [key, value] of Object.entries(config.requiredAttributes)) {
                    if (userMetadata[key] !== value) {
                        return {
                            granted: false,
                            reason: `Required attribute ${key} not matching`,
                        };
                    }
                }
            }
            if (config.requireMFA) {
                if (!request.securityContext?.sessionId) {
                    return {
                        granted: false,
                        reason: "Multi-factor authentication required",
                    };
                }
            }
            if (config.minSessionAge || config.maxSessionAge) {
                const lastActivity = request.securityContext?.lastActivity;
                if (lastActivity) {
                    const sessionAge = Date.now() - lastActivity.getTime();
                    const sessionAgeMinutes = sessionAge / (1000 * 60);
                    if (config.minSessionAge &&
                        sessionAgeMinutes < config.minSessionAge) {
                        return {
                            granted: false,
                            reason: `Session too new (minimum ${config.minSessionAge} minutes required)`,
                        };
                    }
                    if (config.maxSessionAge &&
                        sessionAgeMinutes > config.maxSessionAge) {
                        return {
                            granted: false,
                            reason: `Session too old (maximum ${config.maxSessionAge} minutes allowed)`,
                        };
                    }
                }
            }
            if (config.conditionFunction) {
                this.logger.debug(`[${operationId}] Custom condition function not implemented`, {
                    operationId,
                    conditionFunction: config.conditionFunction,
                });
            }
            return { granted: true };
        }
        catch (err) {
            this.logger.error(`[${operationId}] Conditional access validation error`, {
                operationId,
                error: err instanceof Error ? err.message : String(err),
            });
            return {
                granted: false,
                reason: "Conditional access validation failed",
            };
        }
    }
    validateResourceOwnership(operationId, user, request) {
        try {
            const resourceId = this.extractResourceId(request);
            if (!resourceId) {
                this.logger.debug(`[${operationId}] No resource ID found for ownership check`, {
                    operationId,
                    url: request.url,
                });
                return false;
            }
            const isOwner = resourceId === user.id || resourceId.startsWith(`${user.id}-`);
            this.logger.debug(`[${operationId}] Resource ownership check`, {
                operationId,
                userId: user.id,
                resourceId,
                isOwner,
            });
            return isOwner;
        }
        catch (err) {
            this.logger.error(`[${operationId}] Resource ownership validation error`, {
                operationId,
                error: err instanceof Error ? err.message : String(err),
            });
            return false;
        }
    }
    extractResourceId(request) {
        const params = request.params || {};
        return (params.id || params.userId || params.resourceId || params.taskId || null);
    }
    getClientIP(request) {
        return (request.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
            request.headers["x-real-ip"] ||
            request.socket?.remoteAddress ||
            "unknown");
    }
    async logSecurityEvent(request, event) {
        try {
            if (!this.enableDetailedLogging) {
                return;
            }
            this.logger.log("Security Event", {
                timestamp: event.timestamp.toISOString(),
                type: event.type,
                userId: event.userId,
                username: event.username,
                endpoint: event.endpoint,
                method: event.method,
                ipAddress: event.ipAddress,
                userAgent: event.userAgent,
                reason: event.reason,
                metadata: event.metadata,
            });
            const recentEventsKey = `security_events:${event.userId}`;
            const recentEvents = (await this._cacheManager.get(recentEventsKey)) ||
                [];
            recentEvents.push(event);
            const limitedEvents = recentEvents.slice(-100);
            await this._cacheManager.set(recentEventsKey, limitedEvents, 24 * 60 * 60 * 1000);
        }
        catch (err) {
            this.logger.error("Failed to log security event", {
                error: err instanceof Error ? err.message : String(err),
                event: {
                    type: event.type,
                    userId: event.userId,
                    endpoint: event.endpoint,
                },
            });
        }
    }
};
exports.RBACAuthorizationGuard = RBACAuthorizationGuard;
exports.RBACAuthorizationGuard = RBACAuthorizationGuard = RBACAuthorizationGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [core_1.Reflector,
        config_1.ConfigService, Object])
], RBACAuthorizationGuard);
//# sourceMappingURL=rbac-authorization.guard.js.map