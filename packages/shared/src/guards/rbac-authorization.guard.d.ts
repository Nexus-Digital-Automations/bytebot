import { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { Cache } from "cache-manager";
import { Request } from "express";
import { Role, Permission } from "../types/rbac.types";
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    roles?: Role[];
    permissions?: Permission[];
    isActive?: boolean;
    metadata?: Record<string, unknown>;
  };
  securityContext?: {
    sessionId?: string;
    tokenVersion?: number;
    riskScore?: number;
    lastActivity?: Date;
    deviceFingerprint?: string;
  };
}
export interface AuthorizationResult {
  granted: boolean;
  reason?: string;
  requiredRoles?: Role[];
  requiredPermissions?: Permission[];
  missingRoles?: Role[];
  missingPermissions?: Permission[];
  evaluatedConditions: string[];
}
export interface LocalAuditEvent {
  timestamp: Date;
  type: "ACCESS_GRANTED" | "ACCESS_DENIED" | "SECURITY_VIOLATION";
  userId?: string;
  username?: string;
  endpoint: string;
  method: string;
  ipAddress: string;
  userAgent?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}
export declare class RBACAuthorizationGuard implements CanActivate {
  private readonly _reflector;
  private readonly _configService;
  private readonly _cacheManager;
  private readonly logger;
  private readonly auditLogPath;
  private readonly enableDetailedLogging;
  private readonly permissionCacheTimeout;
  constructor(
    _reflector: Reflector,
    _configService: ConfigService,
    _cacheManager: Cache,
  );
  canActivate(context: ExecutionContext): Promise<boolean>;
  private extractUserFromRequest;
  private extractRBACMetadata;
  private isEmptyRBACMetadata;
  private performAuthorizationCheck;
  private isAdmin;
  private getUserRoles;
  private getUserPermissions;
  private derivePermissionsFromRoles;
  private validateConditionalAccess;
  private validateResourceOwnership;
  private extractResourceId;
  private getClientIP;
  private logSecurityEvent;
}
//# sourceMappingURL=rbac-authorization.guard.d.ts.map
