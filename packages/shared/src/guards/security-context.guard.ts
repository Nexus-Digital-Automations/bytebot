/**
 * Security Context Guard - Local-Only Architecture Compliant
 *
 * Manages security context and session state using local storage mechanisms.
 * Provides security context management with local SQLite storage, local file-based
 * session persistence, and Docker Compose compatibility for multi-service deployments.
 *
 * @fileoverview Local-only security context guard for Bytebot platform
 * @version 2.0.0
 * @author Local-Only Security Implementation Team
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { Request } from "express";
import * as fs from "fs/promises";
import * as path from "path";
import "reflect-metadata";

/**
 * Extended Request interface with security context
 * Provides type-safe access to user information and security context
 */
export interface SecurityContextRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    roles?: string[];
    permissions?: string[];
    isActive?: boolean;
    metadata?: Record<string, unknown>;
  };
  securityContext?: SecurityContext;
}

/**
 * Type guard to check if request has valid user
 */
export function hasValidUser(
  request: SecurityContextRequest,
): request is SecurityContextRequest & {
  user: NonNullable<SecurityContextRequest["user"]>;
} {
  return !!request.user && typeof request.user.id === "string";
}

/**
 * Security context interface with comprehensive session data
 * Provides complete security context for authenticated requests
 */
export interface SecurityContext {
  /** Unique session identifier */
  sessionId: string;
  /** User ID associated with this session */
  userId: string;
  /** Username for display and logging */
  username: string;
  /** Token version for rotation support */
  tokenVersion: number;
  /** Risk score (0-100) based on request characteristics */
  riskScore: number;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Device fingerprint for tracking */
  deviceFingerprint?: string;
  /** Client IP address */
  ipAddress: string;
  /** User agent string */
  userAgent?: string;
  /** User permissions array */
  permissions: string[];
  /** User roles array */
  roles: string[];
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Local session storage interface
 * Represents a complete session record for local file-based storage
 */
export interface LocalSession {
  /** Unique session identifier */
  sessionId: string;
  /** Associated user ID */
  userId: string;
  /** Username for this session */
  username: string;
  /** Session creation timestamp */
  createdAt: Date;
  /** Last access timestamp */
  lastAccessedAt: Date;
  /** Session expiration timestamp */
  expiresAt: Date;
  /** Whether session is currently active */
  isActive: boolean;
  /** Complete security context */
  securityContext: SecurityContext;
  /** Additional session metadata */
  metadata: Record<string, unknown>;
}

/**
 * Session validation result
 */
export interface SessionValidationResult {
  isValid: boolean;
  session?: LocalSession;
  reason?: string;
}

/**
 * Security Context Guard with Local-Only Architecture
 *
 * Manages security context using local storage mechanisms:
 * - Local file-based session persistence
 * - Local caching for performance
 * - Local audit logging
 * - Docker Compose volume-based context sharing
 */
@Injectable()
export class SecurityContextGuard implements CanActivate {
  private readonly logger = new Logger(SecurityContextGuard.name);
  private readonly sessionStoragePath: string;
  private readonly sessionTimeout: number;
  private readonly contextCacheTimeout: number;
  private readonly enableContextSharing: boolean;

  constructor(
    private readonly _configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly _cacheManager: Cache,
  ) {
    // Local configuration for file-based operations
    this.sessionStoragePath = this._configService.get(
      "security.sessionStoragePath",
      "./storage/sessions",
    );
    this.sessionTimeout = this._configService.get(
      "security.sessionTimeout",
      24 * 60 * 60 * 1000, // 24 hours
    );
    this.contextCacheTimeout = this._configService.get(
      "security.contextCacheTimeout",
      5 * 60 * 1000, // 5 minutes
    );
    this.enableContextSharing = this._configService.get(
      "security.enableContextSharing",
      true,
    );

    void this.initializeStorage();

    this.logger.log(
      "Security Context Guard initialized with local-only architecture",
      {
        sessionStoragePath: this.sessionStoragePath,
        sessionTimeout: this.sessionTimeout,
        contextCacheTimeout: this.contextCacheTimeout,
        enableContextSharing: this.enableContextSharing,
      },
    );
  }

  /**
   * Determine if the current request should be allowed with security context
   *
   * @param context - Execution context containing request information
   * @returns Promise<boolean> - Whether the request has valid security context
   * @throws UnauthorizedException - When security context is invalid
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const operationId = `security-context-${Date.now()}`;
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<SecurityContextRequest>();

    this.logger.debug(
      `[${operationId}] Security context validation initiated`,
      {
        operationId,
        method: request.method,
        url: request.url,
        hasUser: !!request.user,
      },
    );

    try {
      // Step 1: Extract user from request (should be set by authentication guard)
      if (!hasValidUser(request)) {
        throw new UnauthorizedException(
          "User authentication required for security context",
        );
      }

      // Step 2: Load or create security context
      const securityContext = await this.loadOrCreateSecurityContext(
        operationId,
        request,
      );

      // Step 3: Validate session and context
      const validationResult = await this.validateSecurityContext(
        operationId,
        securityContext,
      );

      if (!validationResult.isValid) {
        this.logger.warn(
          `[${operationId}] Security context validation failed`,
          {
            operationId,
            userId: request.user.id,
            reason: validationResult.reason,
          },
        );

        throw new UnauthorizedException(
          validationResult.reason || "Invalid security context",
        );
      }

      // Step 4: Set security context in request
      request.securityContext = securityContext;

      // Step 5: Update session activity
      await this.updateSessionActivity(operationId, securityContext);

      // Step 6: Log successful context validation
      const contextTime = Date.now() - startTime;
      this.logger.debug(
        `[${operationId}] Security context validated successfully`,
        {
          operationId,
          userId: request.user.id,
          sessionId: securityContext.sessionId,
          contextValidationTime: contextTime,
        },
      );

      return true;
    } catch (err) {
      const contextTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] Security context validation error`, {
        operationId,
        error: err instanceof Error ? err.message : String(err),
        contextValidationTime: contextTime,
        url: request.url,
        method: request.method,
        userId: request.user?.id,
      });

      if (err instanceof UnauthorizedException) {
        throw err;
      }

      throw new UnauthorizedException("Security context validation failed");
    }
  }

  /**
   * Initialize local storage directories
   *
   * @private
   */
  private async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.sessionStoragePath, { recursive: true });

      this.logger.log("Local session storage initialized", {
        path: this.sessionStoragePath,
      });
    } catch (err) {
      this.logger.error("Failed to initialize session storage", {
        error: err instanceof Error ? err.message : String(err),
        path: this.sessionStoragePath,
      });
    }
  }

  /**
   * Load existing security context or create new one
   *
   * @param operationId - Operation identifier
   * @param request - HTTP request
   * @returns Promise<SecurityContext> - Security context
   * @private
   */
  private async loadOrCreateSecurityContext(
    operationId: string,
    request: SecurityContextRequest,
  ): Promise<SecurityContext> {
    const user = request.user;

    try {
      // Check if session ID is provided in headers or existing context
      let sessionId = request.headers["x-session-id"] as string;

      if (!sessionId && request.securityContext?.sessionId) {
        sessionId = request.securityContext.sessionId;
      }

      // Try to load existing session
      if (sessionId) {
        const existingContext = await this.loadSecurityContext(
          operationId,
          sessionId,
        );
        if (existingContext && existingContext.userId === user!.id) {
          this.logger.debug(
            `[${operationId}] Loaded existing security context`,
            {
              operationId,
              sessionId,
              userId: user!.id,
            },
          );
          return existingContext;
        }
      }

      // Create new security context
      const newContext = await this.createSecurityContext(operationId, request);

      this.logger.debug(`[${operationId}] Created new security context`, {
        operationId,
        sessionId: newContext.sessionId,
        userId: user!.id,
      });

      return newContext;
    } catch (err) {
      this.logger.error(
        `[${operationId}] Error loading/creating security context`,
        {
          operationId,
          error: err instanceof Error ? err.message : String(err),
          userId: user!.id,
        },
      );

      // Create basic context as fallback
      return this.createBasicSecurityContext(request);
    }
  }

  /**
   * Load security context from local storage
   *
   * @param operationId - Operation identifier
   * @param sessionId - Session ID
   * @returns Promise<SecurityContext | null> - Security context or null if not found
   * @private
   */
  private async loadSecurityContext(
    operationId: string,
    sessionId: string,
  ): Promise<SecurityContext | null> {
    try {
      // Check cache first
      const cacheKey = `security_context:${sessionId}`;
      const cachedContext: SecurityContext | undefined =
        await this._cacheManager.get<SecurityContext>(cacheKey);

      if (cachedContext) {
        this.logger.debug(`[${operationId}] Using cached security context`, {
          operationId,
          sessionId,
        });
        return cachedContext;
      }

      // Load from local file storage
      const sessionFilePath = path.join(
        this.sessionStoragePath,
        `${sessionId}.json`,
      );

      try {
        const sessionData = await fs.readFile(sessionFilePath, "utf-8");
        const session: LocalSession = JSON.parse(sessionData) as LocalSession;

        // Convert date strings back to Date objects
        session.createdAt = new Date(session.createdAt);
        session.lastAccessedAt = new Date(session.lastAccessedAt);
        session.expiresAt = new Date(session.expiresAt);
        session.securityContext.lastActivity = new Date(
          session.securityContext.lastActivity,
        );

        // Cache the context for performance
        await this._cacheManager.set(
          cacheKey,
          session.securityContext,
          this.contextCacheTimeout,
        );

        this.logger.debug(
          `[${operationId}] Loaded security context from file storage`,
          {
            operationId,
            sessionId,
            userId: session.userId,
          },
        );

        return session.securityContext;
      } catch (_fileError) {
        // File doesn't exist or is corrupted
        this.logger.debug(
          `[${operationId}] Security context file not found or corrupted`,
          {
            operationId,
            sessionId,
            filePath: sessionFilePath,
            error:
              _fileError instanceof Error
                ? _fileError.message
                : String(_fileError),
          },
        );
        return null;
      }
    } catch (err) {
      this.logger.error(`[${operationId}] Error loading security context`, {
        operationId,
        error: err instanceof Error ? err.message : String(err),
        sessionId,
      });
      return null;
    }
  }

  /**
   * Create new security context
   *
   * @param operationId - Operation identifier
   * @param request - HTTP request
   * @returns Promise<SecurityContext> - New security context
   * @private
   */
  private async createSecurityContext(
    operationId: string,
    request: SecurityContextRequest,
  ): Promise<SecurityContext> {
    const user = request.user;
    const sessionId = this.generateSessionId();
    const now = new Date();

    const securityContext: SecurityContext = {
      sessionId,
      userId: user!.id,
      username: user!.username,
      tokenVersion: 1,
      riskScore: this.calculateRiskScore(request),
      lastActivity: now,
      deviceFingerprint: this.generateDeviceFingerprint(request),
      ipAddress: this.getClientIP(request),
      userAgent: request.headers["user-agent"],
      permissions: user!.permissions || [],
      roles: user!.roles || [user!.role],
      metadata: {
        createdAt: now,
        userAgent: request.headers["user-agent"],
        ipAddress: this.getClientIP(request),
        ...user!.metadata,
      },
    };

    // Create session record
    const session: LocalSession = {
      sessionId,
      userId: user!.id,
      username: user!.username,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: new Date(now.getTime() + this.sessionTimeout),
      isActive: true,
      securityContext,
      metadata: {
        operationId,
        createdByGuard: true,
      },
    };

    // Save to local storage
    await this.saveSession(operationId, session);

    // Cache the context
    const cacheKey = `security_context:${sessionId}`;
    await this._cacheManager.set(
      cacheKey,
      securityContext,
      this.contextCacheTimeout,
    );

    return securityContext;
  }

  /**
   * Create basic security context as fallback
   *
   * @param request - HTTP request
   * @returns SecurityContext - Basic security context
   * @private
   */
  private createBasicSecurityContext(
    request: SecurityContextRequest,
  ): SecurityContext {
    const user = request.user;
    const sessionId = this.generateSessionId();

    return {
      sessionId,
      userId: user!.id,
      username: user!.username,
      tokenVersion: 1,
      riskScore: 0,
      lastActivity: new Date(),
      ipAddress: this.getClientIP(request),
      userAgent: request.headers["user-agent"],
      permissions: user!.permissions || [],
      roles: user!.roles || [user!.role],
      metadata: {
        fallbackContext: true,
        createdAt: new Date(),
      },
    };
  }

  /**
   * Validate security context
   *
   * @param operationId - Operation identifier
   * @param context - Security context to validate
   * @returns Promise<SessionValidationResult> - Validation result
   * @private
   */
  private async validateSecurityContext(
    operationId: string,
    context: SecurityContext,
  ): Promise<SessionValidationResult> {
    try {
      // Load session from storage
      const sessionFilePath = path.join(
        this.sessionStoragePath,
        `${context.sessionId}.json`,
      );

      try {
        const sessionData = await fs.readFile(sessionFilePath, "utf-8");
        const session: LocalSession = JSON.parse(sessionData) as LocalSession;

        // Convert date strings back to Date objects
        session.expiresAt = new Date(session.expiresAt);

        // Check if session is expired
        if (session.expiresAt < new Date()) {
          return {
            isValid: false,
            reason: "Session expired",
          };
        }

        // Check if session is active
        if (!session.isActive) {
          return {
            isValid: false,
            reason: "Session inactive",
          };
        }

        // Check user ID consistency
        if (session.userId !== context.userId) {
          return {
            isValid: false,
            reason: "User ID mismatch",
          };
        }

        return {
          isValid: true,
          session,
        };
      } catch (_fileError) {
        // Session file doesn't exist, which is okay for new sessions
        return {
          isValid: true,
        };
      }
    } catch (err) {
      this.logger.error(`[${operationId}] Error validating security context`, {
        operationId,
        error: err instanceof Error ? err.message : String(err),
        sessionId: context.sessionId,
      });

      return {
        isValid: false,
        reason: "Context validation failed",
      };
    }
  }

  /**
   * Update session activity
   *
   * @param operationId - Operation identifier
   * @param context - Security context
   * @private
   */
  private async updateSessionActivity(
    operationId: string,
    context: SecurityContext,
  ): Promise<void> {
    try {
      const sessionFilePath = path.join(
        this.sessionStoragePath,
        `${context.sessionId}.json`,
      );

      try {
        const sessionData = await fs.readFile(sessionFilePath, "utf-8");
        const session: LocalSession = JSON.parse(sessionData) as LocalSession;

        // Update last activity
        const now = new Date();
        session.lastAccessedAt = now;
        session.securityContext.lastActivity = now;

        // Save updated session
        await fs.writeFile(sessionFilePath, JSON.stringify(session, null, 2));

        // Update cache
        const cacheKey = `security_context:${context.sessionId}`;
        await this._cacheManager.set(
          cacheKey,
          session.securityContext,
          this.contextCacheTimeout,
        );

        this.logger.debug(`[${operationId}] Session activity updated`, {
          operationId,
          sessionId: context.sessionId,
          userId: context.userId,
        });
      } catch (_fileError) {
        // Session file doesn't exist yet, which is normal for new sessions
        this.logger.debug(
          `[${operationId}] Session file not found for activity update`,
          {
            operationId,
            sessionId: context.sessionId,
          },
        );
      }
    } catch (err) {
      this.logger.error(`[${operationId}] Error updating session activity`, {
        operationId,
        error: err instanceof Error ? err.message : String(err),
        sessionId: context.sessionId,
      });
    }
  }

  /**
   * Save session to local storage
   *
   * @param operationId - Operation identifier
   * @param session - Session to save
   * @private
   */
  private async saveSession(
    operationId: string,
    session: LocalSession,
  ): Promise<void> {
    try {
      const sessionFilePath = path.join(
        this.sessionStoragePath,
        `${session.sessionId}.json`,
      );
      await fs.writeFile(sessionFilePath, JSON.stringify(session, null, 2));

      this.logger.debug(`[${operationId}] Session saved to local storage`, {
        operationId,
        sessionId: session.sessionId,
        userId: session.userId,
        filePath: sessionFilePath,
      });
    } catch (err) {
      this.logger.error(`[${operationId}] Error saving session`, {
        operationId,
        error: err instanceof Error ? err.message : String(err),
        sessionId: session.sessionId,
      });
    }
  }

  /**
   * Generate unique session ID
   *
   * @returns string - Unique session ID
   * @private
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Calculate risk score based on request characteristics
   *
   * @param request - HTTP request
   * @returns number - Risk score (0-100)
   * @private
   */
  private calculateRiskScore(request: SecurityContextRequest): number {
    let riskScore = 0;

    // Check for suspicious IP addresses
    const clientIP = this.getClientIP(request);
    if (clientIP === "unknown" || !this.isPrivateIP(clientIP)) {
      riskScore += 10;
    }

    // Check user agent
    const userAgent = request.headers["user-agent"];
    if (!userAgent || userAgent.length < 10) {
      riskScore += 20;
    }

    // Check for automation indicators
    if (
      userAgent &&
      (userAgent.includes("bot") ||
        userAgent.includes("crawler") ||
        userAgent.includes("automated"))
    ) {
      riskScore += 30;
    }

    return Math.min(riskScore, 100);
  }

  /**
   * Generate device fingerprint from request
   *
   * @param request - HTTP request
   * @returns string - Device fingerprint
   * @private
   */
  private generateDeviceFingerprint(request: SecurityContextRequest): string {
    const userAgent = request.headers["user-agent"] || "";
    const acceptLanguage = request.headers["accept-language"] || "";
    const acceptEncoding = request.headers["accept-encoding"] || "";

    // Simple hash-like fingerprint
    const fingerprint = Buffer.from(
      `${userAgent}${acceptLanguage}${acceptEncoding}`,
    )
      .toString("base64")
      .substring(0, 16);

    return fingerprint;
  }

  /**
   * Get client IP address from request
   *
   * @param request - HTTP request
   * @returns string - Client IP address
   * @private
   */
  private getClientIP(request: Request): string {
    return (
      (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (request.headers["x-real-ip"] as string) ||
      request.socket?.remoteAddress ||
      "unknown"
    );
  }

  /**
   * Check if IP is private/local
   *
   * @param ip - IP address
   * @returns boolean - True if IP is private
   * @private
   */
  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
      /^::1$/,
      /^fe80:/,
      /^localhost$/i,
    ];

    return privateRanges.some((range) => range.test(ip));
  }
}
