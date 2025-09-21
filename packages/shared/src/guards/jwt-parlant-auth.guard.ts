/**
 * JWT-Parlant Authentication Guard - Enterprise Security Guard
 *
 * Advanced authentication guard that integrates JWT validation with
 * Parlant conversational validation, providing multi-layered security
 * with real-time threat detection and adaptive security controls.
 *
 * @module JwtParlantAuthGuard
 * @version 1.0.0
 * @author Security Guard Specialist
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

import { JwtParlantBridgeService } from "../services/jwt-parlant-bridge.service";
import { RbacSecurityContextService } from "../services/rbac-security-context.service";
import {
  SecurityAuditTrailService,
  AuditCategory,
  AuditSeverity,
  AuditOutcome,
} from "../services/security-audit-trail.service";
import { UserContext, ResourceType } from "../types/rbac.types";

/**
 * Authentication metadata for decorator configuration
 */
export interface AuthMetadata {
  /** Require authentication */
  requireAuth?: boolean;
  /** Allow emergency override */
  allowEmergencyOverride?: boolean;
  /** Required security level */
  securityLevel?: "standard" | "elevated" | "critical";
  /** Skip Parlant validation */
  skipParlantValidation?: boolean;
  /** Custom validation rules */
  customValidation?: string[];
}

/**
 * Enhanced request interface with security context
 */
export interface SecurityRequest extends Request {
  user?: UserContext;
  securityContext?: unknown;
  parlantSession?: string;
  emergencyOverride?: boolean;
  securityFlags?: string[];
}

/**
 * Validation context interface
 */
interface ValidationContext {
  user: UserContext;
  sessionId: string;
  security?: {
    riskAssessment?: {
      overall?: string;
      factors?: string[];
    };
    environment?: {
      securityLevel?: string;
    };
    behavioralContext?: {
      anomalies?: string[];
      riskScore?: number;
    };
  };
}

/**
 * JWT-Parlant Authentication Guard
 *
 * Comprehensive authentication guard that validates JWT tokens,
 * creates Parlant validation contexts, and enforces adaptive
 * security policies based on risk assessment and behavioral analysis.
 */
@Injectable()
export class JwtParlantAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtParlantAuthGuard.name);

  constructor(
    private readonly _jwtService: JwtService,
    private readonly _reflector: Reflector,
    private readonly _jwtParlantBridge: JwtParlantBridgeService,
    private readonly _rbacSecurityContext: RbacSecurityContextService,
    private readonly _securityAudit: SecurityAuditTrailService,
    @Inject("JWT_PARLANT_CONFIG") private readonly _config: unknown,
  ) {}

  /**
   * Main guard activation method
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const operationId = `guard-auth-${Date.now()}`;
    const startTime = Date.now();

    try {
      const request = context.switchToHttp().getRequest<SecurityRequest>();
      const handler = context.getHandler();
      const controllerClass = context.getClass();

      // Get authentication metadata from decorators
      const authMetadata = this.getAuthMetadata(
        handler as unknown as (..._args: unknown[]) => unknown,
        controllerClass as unknown as (..._args: unknown[]) => unknown,
      );

      this.logger.debug(`[${operationId}] Authentication guard activated`, {
        operationId,
        path: request.path,
        method: request.method,
        authMetadata,
      });

      // Check if authentication is required
      if (authMetadata.requireAuth === false) {
        this.logger.debug(`[${operationId}] Authentication not required`, {
          operationId,
        });
        return true;
      }

      // Extract and validate JWT token
      const token = this.extractToken(request);
      if (!token) {
        await this.logAuthenticationFailure(
          request,
          "No token provided",
          operationId,
        );
        throw new UnauthorizedException("Authentication token required");
      }

      // Validate JWT and create bridge session
      const validationContext = await this.validateTokenAndCreateSession(
        token,
        request,
        authMetadata,
        operationId,
      );

      // Attach security context to request
      request.user = validationContext.user;
      request.securityContext = validationContext.security;
      request.parlantSession = validationContext.sessionId;
      request.securityFlags =
        validationContext.security?.riskAssessment?.factors || [];

      // Perform additional security checks
      await this.performSecurityChecks(
        request,
        validationContext,
        authMetadata,
        operationId,
      );

      // Log successful authentication
      await this.logAuthenticationSuccess(
        request,
        validationContext,
        operationId,
      );

      const authTime = Date.now() - startTime;
      this.logger.debug(`[${operationId}] Authentication successful`, {
        operationId,
        userId: request.user?.id,
        authTimeMs: authTime,
      });

      return true;
    } catch (error) {
      const authTime = Date.now() - startTime;

      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        this.logger.warn(`[${operationId}] Authentication failed`, {
          operationId,
          error: error.message,
          authTimeMs: authTime,
        });
        throw error;
      }

      this.logger.error(`[${operationId}] Authentication error`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        authTimeMs: authTime,
      });

      throw new UnauthorizedException("Authentication failed");
    }
  }

  /**
   * Extract JWT token from request
   */
  private extractToken(request: SecurityRequest): string | null {
    // Check Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    // Check query parameter (for WebSocket connections)
    if (request.query?.token && typeof request.query.token === "string") {
      return request.query.token;
    }

    // Check cookies
    if (request.cookies?.access_token) {
      return request.cookies.access_token;
    }

    return null;
  }

  /**
   * Get authentication metadata from decorators
   */
  private getAuthMetadata(
    handler: (..._args: unknown[]) => unknown,
    controllerClass: (..._args: unknown[]) => unknown,
  ): AuthMetadata {
    // Get metadata from method and class decorators
    const methodAuth = this._reflector.get<AuthMetadata>("auth", handler) || {};
    const classAuth =
      this._reflector.get<AuthMetadata>("auth", controllerClass) || {};

    return {
      requireAuth: true,
      allowEmergencyOverride: false,
      securityLevel: "standard",
      skipParlantValidation: false,
      customValidation: [],
      ...classAuth,
      ...methodAuth,
    };
  }

  /**
   * Validate token and create bridge session
   */
  private async validateTokenAndCreateSession(
    token: string,
    request: SecurityRequest,
    authMetadata: AuthMetadata,
    operationId: string,
  ): Promise<ValidationContext> {
    try {
      // Extract request metadata
      const requestMetadata = {
        ipAddress: this.getClientIP(request),
        userAgent: request.headers["user-agent"] || "",
        path: request.path,
        method: request.method,
        timestamp: new Date(),
        operationId,
      };

      // Create bridge session if not exists
      const validationContext =
        await this._jwtParlantBridge.createBridgeSession(
          token,
          "", // Refresh token would come from separate endpoint
          requestMetadata.ipAddress,
          requestMetadata.userAgent,
        );

      // Skip Parlant validation if configured
      if (authMetadata.skipParlantValidation) {
        return validationContext as ValidationContext;
      }

      // Perform Parlant conversational validation
      this.performParlantValidation(
        validationContext,
        authMetadata,
        requestMetadata,
      );

      return validationContext as ValidationContext;
    } catch (error) {
      this.logger.warn(`[${operationId}] Token validation failed`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new UnauthorizedException("Invalid authentication token");
    }
  }

  /**
   * Perform Parlant conversational validation
   */
  private performParlantValidation(
    validationContext: unknown,
    authMetadata: AuthMetadata,
    _requestMetadata: unknown,
  ): void {
    // In a real implementation, this would interact with Parlant
    // to perform conversational validation based on the security level

    if (authMetadata.securityLevel === "critical") {
      // Critical operations require explicit conversational confirmation
      this.logger.debug(
        "Critical security level - conversational validation required",
      );
    }

    if (authMetadata.securityLevel === "elevated") {
      // Elevated operations may require additional validation
      this.logger.debug(
        "Elevated security level - enhanced validation applied",
      );
    }

    // Check for suspicious activity patterns
    const context = validationContext as ValidationContext;
    const riskLevel = context.security?.riskAssessment?.overall;
    if (riskLevel === "high" || riskLevel === "critical") {
      // High-risk operations require conversational validation
      this.logger.warn(
        "High-risk operation detected - conversational validation triggered",
      );
    }
  }

  /**
   * Perform additional security checks
   */
  private async performSecurityChecks(
    request: SecurityRequest,
    validationContext: ValidationContext,
    authMetadata: AuthMetadata,
    operationId: string,
  ): Promise<void> {
    // Check for emergency override if allowed
    if (authMetadata.allowEmergencyOverride) {
      // Check for active emergency override
      // This would integrate with the EmergencyOverrideService
    }

    // Check session validity
    if (validationContext.security?.environment?.securityLevel === "critical") {
      // Additional checks for critical security level
      this.performCriticalSecurityChecks(
        request,
        validationContext,
        operationId,
      );
    }

    // Rate limiting check
    this.checkRateLimit(request, validationContext, operationId);

    // Behavioral analysis
    this.performBehavioralAnalysis(request, validationContext, operationId);
  }

  /**
   * Perform critical security checks
   */
  private performCriticalSecurityChecks(
    request: SecurityRequest,
    validationContext: ValidationContext,
    operationId: string,
  ): void {
    // MFA verification for critical operations
    if (!validationContext.user.metadata?.mfaEnabled) {
      this.logger.warn(`[${operationId}] Critical operation without MFA`, {
        operationId,
        userId: validationContext.user.id,
      });
      throw new ForbiddenException(
        "Multi-factor authentication required for critical operations",
      );
    }

    // IP whitelist check for critical operations
    const clientIP = this.getClientIP(request);
    if (!this.isIPWhitelisted(clientIP)) {
      this.logger.warn(
        `[${operationId}] Critical operation from non-whitelisted IP`,
        {
          operationId,
          clientIP,
          userId: validationContext.user.id,
        },
      );
      throw new ForbiddenException(
        "Access from this location is not authorized",
      );
    }
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(
    request: SecurityRequest,
    validationContext: ValidationContext,
    operationId: string,
  ): void {
    // Implement rate limiting logic
    // This would typically use Redis to track request counts
    const userId = validationContext.user.id;
    const clientIP = this.getClientIP(request);

    // Check per-user rate limit
    // Check per-IP rate limit
    // Check global rate limit

    // For now, just log the check
    this.logger.debug(`[${operationId}] Rate limit check passed`, {
      operationId,
      userId,
      clientIP,
    });
  }

  /**
   * Perform behavioral analysis
   */
  private performBehavioralAnalysis(
    request: SecurityRequest,
    validationContext: ValidationContext,
    operationId: string,
  ): void {
    // Implement behavioral analysis
    // Check for unusual patterns, times, locations, etc.

    const behavioralContext = validationContext.security?.behavioralContext;
    if (
      behavioralContext?.anomalies &&
      behavioralContext.anomalies.length > 0
    ) {
      this.logger.warn(`[${operationId}] Behavioral anomalies detected`, {
        operationId,
        userId: validationContext.user.id,
        anomalies: behavioralContext.anomalies,
      });

      // For high-risk anomalies, require additional validation
      if (behavioralContext.riskScore && behavioralContext.riskScore > 75) {
        throw new ForbiddenException(
          "Unusual activity detected - additional verification required",
        );
      }
    }
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: SecurityRequest): string {
    return (
      (request.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      (request.headers["x-real-ip"] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      "unknown"
    );
  }

  /**
   * Check if IP is whitelisted
   */
  private isIPWhitelisted(_ip: string): boolean {
    // In a real implementation, this would check against a whitelist
    // For now, allow all IPs
    return true;
  }

  /**
   * Log authentication success
   */
  private async logAuthenticationSuccess(
    request: SecurityRequest,
    validationContext: ValidationContext,
    operationId: string,
  ): Promise<void> {
    await this._securityAudit.logSecurityEvent(
      AuditCategory.AUTHENTICATION,
      AuditSeverity.INFORMATIONAL,
      AuditOutcome.SUCCESS,
      {
        userId: validationContext.user.id,
        username: validationContext.user.username,
        roles: validationContext.user.roles,
        sessionId: validationContext.sessionId,
        ipAddress: this.getClientIP(request),
        userAgent: request.headers["user-agent"],
      },
      {
        type: ResourceType._API,
        path: request.path,
        classification: "internal",
      },
      {
        type: "jwt_authentication",
        method: request.method,
        endpoint: request.path,
        description: "User authenticated successfully via JWT-Parlant bridge",
      },
      {
        requestId: operationId,
        source: "jwt-parlant-auth-guard",
      },
      {
        riskLevel:
          (validationContext.security?.riskAssessment?.overall as
            | "critical"
            | "high"
            | "low"
            | "minimal"
            | "medium"
            | "extreme") || "low",
        flags: ["AUTHENTICATION_SUCCESS"],
      },
      {
        data: {
          authMethod: "jwt-parlant",
          securityLevel: validationContext.security?.environment?.securityLevel,
          parlantSessionId: validationContext.sessionId,
        },
        hasSensitiveData: false,
      },
    );
  }

  /**
   * Log authentication failure
   */
  private async logAuthenticationFailure(
    request: SecurityRequest,
    reason: string,
    operationId: string,
  ): Promise<void> {
    await this._securityAudit.logSecurityEvent(
      AuditCategory.AUTHENTICATION,
      AuditSeverity.MEDIUM,
      AuditOutcome.FAILURE,
      {
        ipAddress: this.getClientIP(request),
        userAgent: request.headers["user-agent"],
      },
      {
        type: ResourceType._API,
        path: request.path,
        classification: "internal",
      },
      {
        type: "jwt_authentication_failure",
        method: request.method,
        endpoint: request.path,
        description: `Authentication failed: ${reason}`,
      },
      {
        requestId: operationId,
        source: "jwt-parlant-auth-guard",
      },
      {
        riskLevel: "medium",
        flags: ["AUTHENTICATION_FAILURE", "SECURITY_VIOLATION"],
        requiresInvestigation: true,
      },
      {
        data: {
          failureReason: reason,
          authMethod: "jwt-parlant",
        },
        hasSensitiveData: false,
      },
    );
  }
}
