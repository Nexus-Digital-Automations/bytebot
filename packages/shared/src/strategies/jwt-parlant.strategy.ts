/**
 * JWT-Parlant Strategy - Passport Authentication Strategy
 *
 * Advanced Passport strategy for JWT-Parlant authentication integration.
 * Handles multi-algorithm JWT validation, Parlant session creation,
 * and comprehensive security context building.
 *
 * @module JwtParlantStrategy
 * @version 1.0.0
 * @author Authentication Strategy Specialist
 */

import {
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
} from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Request } from "express";
import * as jwt from "jsonwebtoken";

import {
  JwtParlantBridgeService,
  ParlantJwtPayload,
} from "../services/jwt-parlant-bridge.service";
import { RbacSecurityContextService } from "../services/rbac-security-context.service";
import {
  SecurityAuditTrailService,
  AuditCategory,
  AuditSeverity,
  AuditOutcome,
} from "../services/security-audit-trail.service";
import { UserContext, ResourceType } from "../types/rbac.types";

/**
 * JWT validation result
 */
export interface JwtValidationResult {
  /** User context */
  user: UserContext;
  /** Security context */
  securityContext: any;
  /** Parlant session information */
  parlantSession: {
    sessionId: string;
    validationLevel: string;
    conversationPreferences: any;
  };
  /** Session metadata */
  sessionMetadata: {
    createdAt: Date;
    expiresAt: Date;
    securityLevel: string;
    mfaVerified: boolean;
  };
}

/**
 * JWT-Parlant Passport Strategy
 *
 * Comprehensive Passport strategy that validates JWT tokens using
 * multiple algorithms, creates Parlant validation sessions, and
 * builds comprehensive security contexts for authorization decisions.
 */
@Injectable()
export class JwtParlantStrategy extends PassportStrategy(
  Strategy,
  "jwt-parlant",
) {
  private readonly logger = new Logger(JwtParlantStrategy.name);

  constructor(
    private readonly jwtParlantBridge: JwtParlantBridgeService,
    private readonly rbacSecurityContext: RbacSecurityContextService,
    private readonly securityAudit: SecurityAuditTrailService,
    @Inject("JWT_PARLANT_CONFIG") private readonly config: any,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter("token"),
        ExtractJwt.fromBodyField("token"),
        (request: Request) => {
          // Extract from cookies
          return request.cookies?.access_token || null;
        },
      ]),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKeyProvider: (
        request: Request,
        rawJwtToken: string,
        done: any,
      ) => {
        this.getSecretOrKey(rawJwtToken)
          .then((secretOrKey) => done(null, secretOrKey))
          .catch((error) => done(error, null));
      },
      algorithms: config.jwt?.algorithms || [
        "HS256",
        "RS256",
        "ES256",
        "EdDSA",
      ],
    });

    this.logger.log("JWT-Parlant Strategy initialized", {
      algorithms: config.jwt?.algorithms || [
        "HS256",
        "RS256",
        "ES256",
        "EdDSA",
      ],
      extractors: ["bearer", "query", "body", "cookie"],
    });
  }

  /**
   * Validate JWT payload and create user context
   */
  async validate(
    request: Request,
    payload: ParlantJwtPayload,
  ): Promise<JwtValidationResult> {
    const operationId = `jwt-strategy-${Date.now()}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Validating JWT payload`, {
      operationId,
      userId: payload.sub,
      username: payload.username,
      tokenType: payload.type,
      securityLevel: payload.securityLevel,
    });

    try {
      // Validate payload structure
      this.validatePayloadStructure(payload);

      // Extract request metadata
      const requestMetadata = this.extractRequestMetadata(request, operationId);

      // Check for existing bridge session
      let validationContext;
      const existingSession = await this.jwtParlantBridge.validateSession(
        payload.sessionId,
      );

      if (existingSession) {
        this.logger.debug(`[${operationId}] Using existing bridge session`, {
          operationId,
          sessionId: payload.sessionId,
        });
        validationContext = existingSession;
      } else {
        // Create new bridge session
        this.logger.debug(`[${operationId}] Creating new bridge session`, {
          operationId,
          userId: payload.sub,
        });

        validationContext = await this.jwtParlantBridge.createBridgeSession(
          this.extractToken(request)!,
          "", // Refresh token not available in strategy
          requestMetadata.ipAddress,
          requestMetadata.userAgent,
        );
      }

      // Build comprehensive security context
      const securityContext =
        await this.rbacSecurityContext.buildSecurityContext(
          validationContext.user,
          ResourceType.API_ENDPOINT,
          "authenticate",
          requestMetadata,
        );

      // Perform security validation
      await this.performSecurityValidation(
        payload,
        securityContext,
        requestMetadata,
        operationId,
      );

      // Create validation result
      const result: JwtValidationResult = {
        user: validationContext.user,
        securityContext,
        parlantSession: {
          sessionId: validationContext.sessionId,
          validationLevel: validationContext.validationLevel,
          conversationPreferences: validationContext.conversationPreferences,
        },
        sessionMetadata: {
          createdAt: new Date(payload.iat! * 1000),
          expiresAt: new Date(payload.exp! * 1000),
          securityLevel: payload.securityLevel,
          mfaVerified: payload.mfaVerified,
        },
      };

      // Log successful validation
      await this.logValidationSuccess(
        payload,
        result,
        requestMetadata,
        operationId,
      );

      const validationTime = Date.now() - startTime;
      this.logger.debug(`[${operationId}] JWT validation successful`, {
        operationId,
        userId: payload.sub,
        sessionId: validationContext.sessionId,
        securityLevel: payload.securityLevel,
        validationTimeMs: validationTime,
      });

      return result;
    } catch (error) {
      const validationTime = Date.now() - startTime;

      // Log validation failure
      await this.logValidationFailure(payload, error, request, operationId);

      this.logger.warn(`[${operationId}] JWT validation failed`, {
        operationId,
        userId: payload.sub,
        error: error instanceof Error ? error.message : String(error),
        validationTimeMs: validationTime,
      });

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("JWT validation failed");
    }
  }

  /**
   * Get secret or key for JWT verification based on algorithm
   */
  private async getSecretOrKey(rawJwtToken: string): Promise<string | Buffer> {
    try {
      // Decode header to determine algorithm
      const decoded = jwt.decode(rawJwtToken, { complete: true });
      if (!decoded || typeof decoded === "string") {
        throw new UnauthorizedException("Invalid JWT format");
      }

      const algorithm = decoded.header.alg;
      const supportedAlgorithms = this.config.jwt?.algorithms || ["HS256"];

      if (!supportedAlgorithms.includes(algorithm)) {
        throw new UnauthorizedException(
          `Unsupported JWT algorithm: ${algorithm}`,
        );
      }

      // Return appropriate secret/key based on algorithm
      switch (algorithm) {
        case "HS256":
          return (
            this.config.jwt?.hmacSecret ||
            process.env.JWT_SECRET ||
            "default-secret"
          );

        case "RS256":
          const rsaKey =
            this.config.jwt?.rsaPrivateKey || process.env.JWT_RSA_PRIVATE_KEY;
          if (!rsaKey) {
            throw new UnauthorizedException("RSA private key not configured");
          }
          return Buffer.from(rsaKey, "base64");

        case "ES256":
          const ecKey =
            this.config.jwt?.ecPrivateKey || process.env.JWT_EC_PRIVATE_KEY;
          if (!ecKey) {
            throw new UnauthorizedException("EC private key not configured");
          }
          return Buffer.from(ecKey, "base64");

        case "EdDSA":
          const eddsaKey =
            this.config.jwt?.eddsaPrivateKey ||
            process.env.JWT_EDDSA_PRIVATE_KEY;
          if (!eddsaKey) {
            throw new UnauthorizedException("EdDSA private key not configured");
          }
          return Buffer.from(eddsaKey, "base64");

        default:
          throw new UnauthorizedException(
            `Unsupported algorithm: ${algorithm}`,
          );
      }
    } catch (error) {
      this.logger.error("Failed to get JWT secret/key", error);
      throw new UnauthorizedException("JWT validation configuration error");
    }
  }

  /**
   * Validate JWT payload structure
   */
  private validatePayloadStructure(
    payload: any,
  ): asserts payload is ParlantJwtPayload {
    const required = [
      "sub",
      "username",
      "email",
      "roles",
      "permissions",
      "sessionId",
      "type",
      "securityLevel",
      "mfaVerified",
    ];

    for (const field of required) {
      if (!(field in payload)) {
        throw new UnauthorizedException(`Missing required JWT field: ${field}`);
      }
    }

    // Validate token type
    if (payload.type !== "access") {
      throw new UnauthorizedException(`Invalid token type: ${payload.type}`);
    }

    // Validate security level
    const validSecurityLevels = ["standard", "elevated", "critical"];
    if (!validSecurityLevels.includes(payload.securityLevel)) {
      throw new UnauthorizedException(
        `Invalid security level: ${payload.securityLevel}`,
      );
    }

    // Validate roles array
    if (!Array.isArray(payload.roles)) {
      throw new UnauthorizedException("Roles must be an array");
    }

    // Validate permissions array
    if (!Array.isArray(payload.permissions)) {
      throw new UnauthorizedException("Permissions must be an array");
    }

    // Validate MFA status
    if (typeof payload.mfaVerified !== "boolean") {
      throw new UnauthorizedException(
        "MFA verification status must be boolean",
      );
    }
  }

  /**
   * Extract request metadata
   */
  private extractRequestMetadata(request: Request, operationId: string): any {
    const clientIP = this.getClientIP(request);
    const userAgent = request.headers["user-agent"] || "";

    return {
      operationId,
      ipAddress: clientIP,
      userAgent,
      path: request.path,
      method: request.method,
      headers: this.sanitizeHeaders(request.headers),
      timestamp: new Date(),
      clientIP, // For backward compatibility
    };
  }

  /**
   * Extract JWT token from request
   */
  private extractToken(request: Request): string | null {
    // Check Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    // Check query parameter
    if (request.query?.token && typeof request.query.token === "string") {
      return request.query.token;
    }

    // Check body
    if (request.body?.token && typeof request.body.token === "string") {
      return request.body.token;
    }

    // Check cookies
    if (request.cookies?.access_token) {
      return request.cookies.access_token;
    }

    return null;
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: Request): string {
    return (
      (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (request.headers["x-real-ip"] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      "unknown"
    );
  }

  /**
   * Sanitize headers for logging
   */
  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const allowedHeaders = [
      "user-agent",
      "accept",
      "accept-language",
      "accept-encoding",
      "content-type",
      "content-length",
      "host",
      "origin",
      "referer",
      "x-forwarded-for",
      "x-real-ip",
    ];

    for (const [key, value] of Object.entries(headers)) {
      if (
        allowedHeaders.includes(key.toLowerCase()) &&
        typeof value === "string"
      ) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Perform additional security validation
   */
  private async performSecurityValidation(
    payload: ParlantJwtPayload,
    securityContext: any,
    requestMetadata: any,
    operationId: string,
  ): Promise<void> {
    // Check for token expiration with buffer
    const now = Math.floor(Date.now() / 1000);
    const expirationBuffer = 30; // 30 seconds buffer

    if (payload.exp && payload.exp - now < expirationBuffer) {
      this.logger.warn(`[${operationId}] Token near expiration`, {
        operationId,
        userId: payload.sub,
        expiresAt: new Date(payload.exp * 1000),
        remainingSeconds: payload.exp - now,
      });
    }

    // Check for elevated security requirements
    if (payload.securityLevel === "critical") {
      await this.validateCriticalSecurity(
        payload,
        requestMetadata,
        operationId,
      );
    }

    // Check behavioral patterns
    const behavioralContext = securityContext.behavioralContext;
    if (behavioralContext?.riskScore > 75) {
      this.logger.warn(`[${operationId}] High behavioral risk detected`, {
        operationId,
        userId: payload.sub,
        riskScore: behavioralContext.riskScore,
        anomalies: behavioralContext.anomalies,
      });

      if (behavioralContext.riskScore > 90) {
        throw new UnauthorizedException(
          "Suspicious activity detected - authentication blocked",
        );
      }
    }

    // Check for emergency context
    const emergencyContext = securityContext.emergencyContext;
    if (emergencyContext?.isEmergency && !emergencyContext.overrideActive) {
      this.logger.warn(
        `[${operationId}] Emergency context without active override`,
        {
          operationId,
          userId: payload.sub,
        },
      );
    }
  }

  /**
   * Validate critical security requirements
   */
  private async validateCriticalSecurity(
    payload: ParlantJwtPayload,
    requestMetadata: any,
    operationId: string,
  ): Promise<void> {
    // Require MFA for critical security level
    if (!payload.mfaVerified) {
      this.logger.warn(`[${operationId}] Critical security level without MFA`, {
        operationId,
        userId: payload.sub,
      });
      throw new UnauthorizedException(
        "Multi-factor authentication required for critical operations",
      );
    }

    // Additional IP validation for critical operations
    const clientIP = requestMetadata.ipAddress;
    if (clientIP === "unknown" || this.isPrivateIP(clientIP)) {
      this.logger.warn(
        `[${operationId}] Critical operation from unknown/private IP`,
        {
          operationId,
          userId: payload.sub,
          clientIP,
        },
      );
    }

    // Check session age for critical operations
    const sessionAge = Date.now() - payload.iat! * 1000;
    const maxCriticalSessionAge = 3600000; // 1 hour

    if (sessionAge > maxCriticalSessionAge) {
      this.logger.warn(`[${operationId}] Critical operation with old session`, {
        operationId,
        userId: payload.sub,
        sessionAgeMs: sessionAge,
      });
      throw new UnauthorizedException(
        "Session too old for critical operations - please re-authenticate",
      );
    }
  }

  /**
   * Check if IP is private
   */
  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
    ];

    return privateRanges.some((range) => range.test(ip));
  }

  /**
   * Log successful validation
   */
  private async logValidationSuccess(
    payload: ParlantJwtPayload,
    result: JwtValidationResult,
    requestMetadata: any,
    operationId: string,
  ): Promise<void> {
    await this.securityAudit.logSecurityEvent(
      AuditCategory.AUTHENTICATION,
      AuditSeverity.INFORMATIONAL,
      AuditOutcome.SUCCESS,
      {
        userId: payload.sub,
        username: payload.username,
        roles: payload.roles,
        sessionId: payload.sessionId,
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
      },
      {
        type: ResourceType.AUTHENTICATION_TOKEN,
        classification: "internal",
      },
      {
        type: "jwt_token_validation",
        method: requestMetadata.method,
        endpoint: requestMetadata.path,
        description: "JWT token validated successfully via Parlant strategy",
      },
      {
        requestId: operationId,
        source: "jwt-parlant-strategy",
      },
      {
        riskLevel: result.securityContext.riskAssessment?.overall || "low",
        flags: ["TOKEN_VALIDATION_SUCCESS"],
      },
      {
        data: {
          tokenType: payload.type,
          securityLevel: payload.securityLevel,
          mfaVerified: payload.mfaVerified,
          parlantSessionId: result.parlantSession.sessionId,
          validationLevel: result.parlantSession.validationLevel,
        },
        hasSensitiveData: false,
      },
    );
  }

  /**
   * Log validation failure
   */
  private async logValidationFailure(
    payload: any,
    error: any,
    request: Request,
    operationId: string,
  ): Promise<void> {
    const requestMetadata = this.extractRequestMetadata(request, operationId);

    await this.securityAudit.logSecurityEvent(
      AuditCategory.AUTHENTICATION,
      AuditSeverity.MEDIUM,
      AuditOutcome.FAILURE,
      {
        userId: payload?.sub,
        username: payload?.username,
        ipAddress: requestMetadata.ipAddress,
        userAgent: requestMetadata.userAgent,
      },
      {
        type: ResourceType.AUTHENTICATION_TOKEN,
        classification: "internal",
      },
      {
        type: "jwt_token_validation_failure",
        method: requestMetadata.method,
        endpoint: requestMetadata.path,
        description: `JWT token validation failed: ${error instanceof Error ? error.message : String(error)}`,
      },
      {
        requestId: operationId,
        source: "jwt-parlant-strategy",
      },
      {
        riskLevel: "medium",
        flags: ["TOKEN_VALIDATION_FAILURE", "SECURITY_VIOLATION"],
        requiresInvestigation: true,
      },
      {
        data: {
          errorType: error.constructor.name,
          errorMessage: error instanceof Error ? error.message : String(error),
          tokenType: payload?.type,
          securityLevel: payload?.securityLevel,
        },
        hasSensitiveData: false,
      },
    );
  }
}
