/**
 * Security Context Builder - Bytebot Platform Security Context Construction
 *
 * This utility provides methods to build comprehensive security contexts
 * for authorization and audit purposes.
 *
 * @fileoverview Security context builder utility
 * @version 1.0.0
 * @author Security Module Specialist
 */

import { Injectable, Logger } from "@nestjs/common";
import { Request } from "express";

// Extended Express Request interface for security context
interface SecurityRequest extends Request {
  user?: {
    id?: string;
    sub?: string;
    username?: string;
    email?: string;
    roles?: string[];
    permissions?: string[];
    department?: string;
    title?: string;
    attributes?: Record<string, unknown>;
    mfaEnabled?: boolean;
    lastAuthTime?: unknown;
    sessionCreatedAt?: unknown;
    sessionExpiresAt?: unknown;
    timezone?: string;
    country?: string;
    iat?: number;
    [key: string]: unknown;
  };
  session?: {
    id?: string;
    sessionID?: string;
    [key: string]: unknown;
  };
  sessionID?: string;
}
import {
  SecurityContext,
  UserContext,
  RequestContext,
  Role,
  Permission,
  ResourceType,
} from "../types/rbac.types";

/**
 * Security context building options
 */
export interface SecurityContextOptions {
  /** Include geographical information */
  includeGeoInfo?: boolean;

  /** Include device fingerprinting */
  includeDeviceInfo?: boolean;

  /** Include session analysis */
  includeSessionAnalysis?: boolean;

  /** Security level override */
  securityLevelOverride?: "low" | "medium" | "high" | "critical";
}

@Injectable()
export class SecurityContextBuilder {
  private readonly logger = new Logger(SecurityContextBuilder.name);

  /**
   * Build comprehensive security context from request
   */
  async buildSecurityContext(
    request: Request,
    resourceType: ResourceType,
    action: string,
    options: SecurityContextOptions = {},
  ): Promise<SecurityContext> {
    try {
      const userContext = this.extractUserContext(request);
      const _requestContext = this.buildRequestContext(request);

      const securityContext: SecurityContext = {
        user: userContext,
        resource: {
          type: resourceType,
          id: this.extractResourceId(request),
          ownerId: this.extractResourceOwnerId(request),
          metadata: this.extractResourceMetadata(request),
        },
        action: {
          type: action,
          method: request.method,
          path: request.path,
          metadata: this.extractActionMetadata(request),
        },
        environment: {
          currentTime: new Date(),
          clientIP: this.getClientIP(request),
          headers: this.sanitizeHeaders(
            request.headers as Record<string, string>,
          ),
          securityLevel:
            options.securityLevelOverride ||
            this.calculateSecurityLevel(request),
        },
      };

      // Enhance with optional information
      if (options.includeGeoInfo) {
        await this.enhanceWithGeoInfo(securityContext, request);
      }

      if (options.includeSessionAnalysis) {
        await this.enhanceWithSessionAnalysis(securityContext, request);
      }

      return securityContext;
    } catch (error) {
      this.logger.error("Failed to build security context:", error);
      throw new Error("Security context construction failed");
    }
  }

  /**
   * Build request context from HTTP request
   */
  buildRequestContext(request: Request): RequestContext {
    const userContext = this.extractUserContext(request);

    return {
      user: userContext,
      clientIP: this.getClientIP(request),
      headers: this.sanitizeHeaders(request.headers as Record<string, string>),
      userAgent: request.headers["user-agent"],
      timestamp: new Date(),
      requestId: this.generateRequestId(),
      session: {
        id: this.extractSessionId(request),
        data: this.extractSessionData(request),
        ageMinutes: this.calculateSessionAge(request),
      },
      geo: this.extractGeoInfo(request),
    };
  }

  /**
   * Extract user context from request
   */
  private extractUserContext(request: Request): UserContext {
    const user = (request as SecurityRequest).user;

    if (!user) {
      // Return anonymous user context
      return {
        id: "anonymous",
        username: "anonymous",
        roles: [Role._GUEST],
        permissions: [],
        metadata: {
          sessionCreatedAt: new Date(),
          sessionExpiresAt: new Date(Date.now() + 3600000), // 1 hour
        },
      };
    }

    return {
      id: (user.id as string) || (user.sub as string) || "unknown",
      username:
        (user.username as string) || (user.email as string) || "unknown",
      roles: (user.roles as Role[]) || [Role._USER],
      permissions: (user.permissions as Permission[]) || [],
      metadata: {
        department: user.department as string | undefined,
        title: user.title as string | undefined,
        attributes: (user.attributes as Record<string, unknown>) || {},
        mfaEnabled: (user.mfaEnabled as boolean) || false,
        lastAuthTime: user.lastAuthTime
          ? new Date(user.lastAuthTime as string | number | Date)
          : undefined,
        sessionCreatedAt: user.sessionCreatedAt
          ? new Date(user.sessionCreatedAt as string | number | Date)
          : new Date(),
        sessionExpiresAt: user.sessionExpiresAt
          ? new Date(user.sessionExpiresAt as string | number | Date)
          : undefined,
        timezone: user.timezone as string | undefined,
        country: user.country as string | undefined,
      },
    };
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: Request): string {
    return (
      (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (request.headers["x-real-ip"] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      "unknown"
    );
  }

  /**
   * Sanitize request headers for security context
   */
  private sanitizeHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const sensitiveHeaders = [
      "authorization",
      "cookie",
      "x-api-key",
      "x-auth-token",
      "x-access-token",
    ];

    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Calculate security level based on request characteristics
   */
  private calculateSecurityLevel(
    request: Request,
  ): "low" | "medium" | "high" | "critical" {
    const user = (request as SecurityRequest).user;
    const isAdmin =
      user?.roles?.includes(Role._ADMIN) ||
      user?.roles?.includes(Role._SUPER_ADMIN);
    const isSystemOperation =
      request.path.includes("/system/") || request.path.includes("/admin/");
    const isCriticalOperation =
      request.method === "DELETE" || request.path.includes("/critical/");

    if (isAdmin && (isSystemOperation || isCriticalOperation)) {
      return "critical";
    }

    if (isAdmin || isSystemOperation) {
      return "high";
    }

    if (user && user.id !== "anonymous") {
      return "medium";
    }

    return "low";
  }

  /**
   * Extract resource ID from request
   */
  private extractResourceId(request: Request): string | undefined {
    const params = request.params;
    return params?.id || params?.resourceId || undefined;
  }

  /**
   * Extract resource owner ID from request
   */
  private extractResourceOwnerId(request: Request): string | undefined {
    const body = request.body;
    const user = (request as SecurityRequest).user;

    return body?.ownerId || body?.userId || user?.id || undefined;
  }

  /**
   * Extract resource metadata from request
   */
  private extractResourceMetadata(request: Request): Record<string, unknown> {
    const body = request.body;
    const query = request.query;

    return {
      body: body || {},
      query: query || {},
      contentType: request.headers["content-type"],
      contentLength: request.headers["content-length"],
    };
  }

  /**
   * Extract action metadata from request
   */
  private extractActionMetadata(request: Request): Record<string, unknown> {
    return {
      protocol: request.protocol,
      originalUrl: request.originalUrl,
      baseUrl: request.baseUrl,
      secure: request.secure,
      xhr: request.xhr,
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract session ID from request
   */
  private extractSessionId(request: Request): string {
    const sessionId =
      (request as SecurityRequest).session?.id ||
      (request as SecurityRequest).sessionID ||
      (request.headers["x-session-id"] as string);

    return sessionId || `session_${Date.now()}`;
  }

  /**
   * Extract session data from request
   */
  private extractSessionData(request: Request): Record<string, unknown> {
    const session = (request as SecurityRequest).session;
    if (!session) return {};

    // Return safe session data (excluding sensitive information)
    const { id: _id, cookie: _cookie, ...safeData } = session;
    return safeData;
  }

  /**
   * Calculate session age in minutes
   */
  private calculateSessionAge(request: Request): number {
    const user = (request as SecurityRequest).user;
    const sessionCreatedAt = user?.sessionCreatedAt || user?.iat;

    if (!sessionCreatedAt) return 0;

    const createdTime =
      typeof sessionCreatedAt === "number"
        ? new Date(sessionCreatedAt * 1000)
        : new Date(sessionCreatedAt as string | number | Date);

    const ageMs = Date.now() - createdTime.getTime();
    return Math.floor(ageMs / (1000 * 60)); // Convert to minutes
  }

  /**
   * Extract geographical information from request
   */
  private extractGeoInfo(request: Request): RequestContext["geo"] {
    const countryHeader =
      (request.headers["cf-ipcountry"] as string) ||
      (request.headers["x-country"] as string);

    if (!countryHeader) return undefined;

    return {
      country: countryHeader,
      region: request.headers["cf-region"] as string,
      city: request.headers["cf-ipcity"] as string,
      timezone: request.headers["cf-timezone"] as string,
    };
  }

  /**
   * Enhance security context with geographical information
   */
  private async enhanceWithGeoInfo(
    context: SecurityContext,
    request: Request,
  ): Promise<void> {
    // This could integrate with GeoIP services in production
    const geoInfo = this.extractGeoInfo(request);
    if (geoInfo) {
      (context as unknown as Record<string, unknown>).geo = geoInfo;
    }
  }

  /**
   * Enhance security context with session analysis
   */
  private async enhanceWithSessionAnalysis(
    context: SecurityContext,
    request: Request,
  ): Promise<void> {
    const sessionAnalysis = {
      sessionAge: this.calculateSessionAge(request),
      requestCount: 1, // This would be tracked in a real implementation
      riskScore: this.calculateRiskScore(context),
      anomalies: this.detectAnomalies(context, request),
    };

    (context as unknown as Record<string, unknown>).sessionAnalysis =
      sessionAnalysis;
  }

  /**
   * Calculate risk score for the request
   */
  private calculateRiskScore(context: SecurityContext): number {
    let risk = 0;

    // IP-based risk
    if (context.environment.clientIP === "unknown") risk += 20;

    // Time-based risk
    const hour = context.environment.currentTime.getHours();
    if (hour < 6 || hour > 22) risk += 10; // Outside business hours

    // Action-based risk
    if (context.action.method === "DELETE") risk += 15;
    if (context.action.path?.includes("/admin/")) risk += 20;

    // User-based risk
    if (context.user.id === "anonymous") risk += 30;
    if (!context.user.metadata.mfaEnabled) risk += 10;

    return Math.min(risk, 100); // Cap at 100
  }

  /**
   * Detect potential anomalies in the request
   */
  private detectAnomalies(
    context: SecurityContext,
    request: Request,
  ): string[] {
    const anomalies: string[] = [];

    // Unusual timing
    const hour = context.environment.currentTime.getHours();
    if (hour < 5 || hour > 23) {
      anomalies.push("unusual_time");
    }

    // Missing user agent
    if (!request.headers["user-agent"]) {
      anomalies.push("missing_user_agent");
    }

    // High privilege operation
    if (context.user.roles.includes(Role._SUPER_ADMIN)) {
      anomalies.push("super_admin_access");
    }

    return anomalies;
  }
}
