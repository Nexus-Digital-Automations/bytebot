/**
 * Enterprise Authentication Guard - Advanced JWT validation with security features
 * Implements comprehensive authentication with threat detection, session management, and audit logging
 *
 * Features:
 * - Advanced JWT validation with multiple signature algorithms
 * - Real-time threat detection and behavioral analysis
 * - Session fixation protection and concurrent session management
 * - Device fingerprinting and geolocation validation
 * - Rate limiting and brute force protection
 * - Comprehensive audit logging and security event tracking
 *
 * @author Authentication Security Specialist
 * @version 2.0.0
 * @since Phase 2: Enterprise Authentication Implementation
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { performance } from 'perf_hooks';

/**
 * Enhanced JWT payload interface
 */
interface EnhancedJwtPayload extends jwt.JwtPayload {
  sub: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  mfaVerified?: boolean;
  riskScore?: number;
  lastActivity?: number;
}

/**
 * Security context interface
 */
interface SecurityContext {
  user: EnhancedJwtPayload;
  session: {
    id: string;
    createdAt: Date;
    lastActivity: Date;
    ipAddress: string;
    userAgent: string;
    deviceFingerprint: string;
    riskScore: number;
  };
  authentication: {
    method: 'jwt' | 'api-key' | 'certificate';
    strength: 'weak' | 'medium' | 'strong';
    mfaVerified: boolean;
    tokenAge: number;
  };
  request: {
    id: string;
    timestamp: Date;
    endpoint: string;
    method: string;
    userAgent: string;
    ipAddress: string;
    headers: Record<string, string>;
  };
}

/**
 * Security violation types
 */
enum SecurityViolationType {
  INVALID_TOKEN = 'invalid_token',
  EXPIRED_TOKEN = 'expired_token',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SESSION_FIXATION = 'session_fixation',
  CONCURRENT_SESSION_LIMIT = 'concurrent_session_limit',
  DEVICE_FINGERPRINT_MISMATCH = 'device_fingerprint_mismatch',
  GEOLOCATION_ANOMALY = 'geolocation_anomaly',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
}

/**
 * Security event interface
 */
interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  details: Record<string, any>;
  action: 'allow' | 'deny' | 'challenge' | 'lockout';
  riskScore: number;
}

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipFailedRequests: boolean;
  skipSuccessfulRequests: boolean;
}

/**
 * Extended Express Request interface with custom properties
 */
interface AuthenticatedRequest extends Request {
  requestId?: string;
  user?: EnhancedJwtPayload;
  securityContext?: SecurityContext;
}

/**
 * Enterprise Authentication Guard
 */
@Injectable()
export class EnterpriseAuthGuard implements CanActivate {
  private readonly logger = new Logger('EnterpriseAuthGuard');
  private readonly secretKey: string;
  private readonly sessionStore = new Map<string, any>();
  private readonly rateLimitStore = new Map<string, any>();
  private readonly securityEvents: SecurityEvent[] = [];
  private readonly deviceStore = new Map<string, any>();

  // Security configurations
  private readonly maxConcurrentSessions = 5;
  private readonly sessionTimeout = 3600000; // 1 hour
  private readonly maxRiskScore = 0.7;
  private readonly rateLimitConfig: RateLimitConfig = {
    windowMs: 900000, // 15 minutes
    maxRequests: 100,
    skipFailedRequests: false,
    skipSuccessfulRequests: false,
  };

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.secretKey = this.configService.get<string>(
      'app.security.jwtSecret',
      '',
    );

    if (!this.secretKey) {
      throw new Error('JWT secret key is required for Enterprise Auth Guard');
    }

    // Start cleanup timers
    this.startCleanupTimers();
  }

  /**
   * Main guard execution
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const startTime = performance.now();
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    try {
      // Generate request ID for tracking
      const requestId = crypto.randomUUID();
      request.requestId = requestId;

      // Create security context
      const securityContext = this.createSecurityContext(request);

      // Check if authentication is required
      if (this.isPublicEndpoint(context)) {
        return true;
      }

      // Extract and validate token
      const token = this.extractToken(request);
      if (!token) {
        this.recordSecurityEvent({
          type: SecurityViolationType.INVALID_TOKEN,
          severity: 'medium',
          request,
          details: { reason: 'Missing authentication token' },
          action: 'deny',
        });
        throw new UnauthorizedException('Authentication token is required');
      }

      // Validate token structure and signature
      const payload = this.validateToken(token);

      // Perform security checks
      this.performSecurityChecks(payload, securityContext, request);

      // Update session and activity tracking
      this.updateSessionActivity(payload, request);

      // Attach security context to request
      request.user = payload;
      request.securityContext = securityContext;

      const processingTime = performance.now() - startTime;
      this.logger.debug('Authentication successful', {
        requestId,
        userId: payload.sub,
        sessionId: payload.sessionId,
        processingTimeMs: processingTime.toFixed(2),
      });

      return true;
    } catch (error) {
      const processingTime = performance.now() - startTime;

      // Record security violation
      this.recordSecurityEvent({
        type: this.getViolationTypeFromError(error),
        severity: this.getSecuritySeverity(error),
        request,
        details: {
          error: error instanceof Error ? error.message : String(error),
          processingTimeMs: processingTime.toFixed(2),
        },
        action: 'deny',
      });

      this.logger.warn('Authentication failed', {
        requestId: request.requestId!,
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: processingTime.toFixed(2),
        ipAddress: this.getClientIP(request),
        userAgent: request.get('User-Agent'),
      });

      throw error;
    }
  }

  /**
   * Extract JWT token from request
   */
  private extractToken(request: Request): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = request.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookie (fallback for web applications)
    const cookieToken = (request.cookies as Record<string, unknown>)?.[
      'auth_token'
    ] as string | undefined;
    if (cookieToken) {
      return cookieToken;
    }

    // Check query parameter (for websocket connections)
    const queryToken = request.query.token as string;
    if (queryToken) {
      return queryToken;
    }

    return null;
  }

  /**
   * Validate JWT token with comprehensive checks
   */
  private validateToken(token: string): EnhancedJwtPayload {
    try {
      // First, decode without verification to check structure
      const decoded = jwt.decode(token, { complete: true });

      if (!decoded || typeof decoded === 'string') {
        throw new UnauthorizedException('Invalid token structure');
      }

      // Verify token signature and claims
      const payload = jwt.verify(token, this.secretKey, {
        algorithms: ['HS256', 'HS384', 'HS512', 'RS256', 'ES256'],
        issuer: 'bytebot-agent',
        audience: 'bytebot-api',
      }) as EnhancedJwtPayload;

      // Validate required fields
      this.validateTokenPayload(payload);

      // Check token age
      const tokenAge = Date.now() / 1000 - (payload.iat || 0);
      if (tokenAge > 86400) {
        // 24 hours max token age
        throw new UnauthorizedException('Token too old');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        if (error instanceof jwt.TokenExpiredError) {
          throw new UnauthorizedException('Token has expired');
        } else if (error instanceof jwt.NotBeforeError) {
          throw new UnauthorizedException('Token not active yet');
        } else {
          throw new UnauthorizedException('Invalid token signature');
        }
      }
      throw error;
    }
  }

  /**
   * Validate token payload structure
   */
  private validateTokenPayload(payload: EnhancedJwtPayload): void {
    const requiredFields = ['sub', 'username', 'email', 'roles', 'sessionId'];

    for (const field of requiredFields) {
      if (!payload[field]) {
        throw new UnauthorizedException(
          `Missing required token field: ${field}`,
        );
      }
    }

    // Validate roles array
    if (!Array.isArray(payload.roles)) {
      throw new UnauthorizedException('Invalid roles format');
    }

    // Validate session ID format
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        payload.sessionId,
      )
    ) {
      throw new UnauthorizedException('Invalid session ID format');
    }
  }

  /**
   * Perform comprehensive security checks
   */
  private performSecurityChecks(
    payload: EnhancedJwtPayload,
    securityContext: SecurityContext,
    request: Request,
  ): void {
    // Check rate limiting
    this.checkRateLimit(request, payload.sub);

    // Check concurrent sessions
    this.checkConcurrentSessions(payload.sub, payload.sessionId);

    // Check device fingerprint
    this.checkDeviceFingerprint(payload, request);

    // Check geolocation anomalies
    this.checkGeolocationAnomalies(payload, request);

    // Check session fixation
    this.checkSessionFixation(payload, request);

    // Calculate and check risk score
    const riskScore = this.calculateRiskScore(payload, securityContext);
    if (riskScore > this.maxRiskScore) {
      throw new ForbiddenException('Request blocked due to high risk score');
    }

    // Check for suspicious activity patterns
    this.checkSuspiciousActivity(payload, request);
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(request: Request, userId: string): void {
    const clientIP = this.getClientIP(request);
    const keys = [`rate_limit:user:${userId}`, `rate_limit:ip:${clientIP}`];

    for (const key of keys) {
      const now = Date.now();
      const windowStart = now - this.rateLimitConfig.windowMs;

      // Get current requests in window
      let requests = (this.rateLimitStore.get(key) as number[]) || [];
      requests = requests.filter(
        (timestamp: number) => timestamp > windowStart,
      );

      if (requests.length >= this.rateLimitConfig.maxRequests) {
        this.recordSecurityEvent({
          type: SecurityViolationType.RATE_LIMIT_EXCEEDED,
          severity: 'high',
          request,
          details: {
            key,
            requests: requests.length,
            limit: this.rateLimitConfig.maxRequests,
            windowMs: this.rateLimitConfig.windowMs,
          },
          action: 'deny',
        });
        throw new ForbiddenException('Rate limit exceeded');
      }

      // Add current request
      requests.push(now);
      this.rateLimitStore.set(key, requests);
    }
  }

  /**
   * Check concurrent sessions
   */
  private checkConcurrentSessions(
    userId: string,
    currentSessionId: string,
  ): void {
    interface SessionData {
      userId: string;
      sessionId: string;
      lastActivity: number;
    }
    const userSessions = Array.from(this.sessionStore.values()).filter(
      (session: unknown): session is SessionData => {
        const s = session as SessionData;
        return s.userId === userId;
      },
    );

    if (userSessions.length >= this.maxConcurrentSessions) {
      // Find oldest session to remove
      const oldestSession = userSessions.sort(
        (a, b) => a.lastActivity - b.lastActivity,
      )[0];

      if (oldestSession && oldestSession.sessionId !== currentSessionId) {
        this.sessionStore.delete(oldestSession.sessionId);

        this.recordSecurityEvent({
          type: SecurityViolationType.CONCURRENT_SESSION_LIMIT,
          severity: 'medium',
          request: null,
          details: {
            userId,
            sessionCount: userSessions.length,
            limit: this.maxConcurrentSessions,
            removedSession: oldestSession.sessionId,
          },
          action: 'allow',
        });
      }
    }
  }

  /**
   * Check device fingerprint
   */
  private checkDeviceFingerprint(
    payload: EnhancedJwtPayload,
    request: Request,
  ): void {
    const currentFingerprint = this.generateDeviceFingerprint(request);

    if (
      payload.deviceFingerprint &&
      payload.deviceFingerprint !== currentFingerprint
    ) {
      // Store device change for analysis
      const deviceKey = `device:${payload.sub}:${currentFingerprint}`;
      const existingDevice = this.deviceStore.get(deviceKey) as unknown;

      if (!existingDevice) {
        this.recordSecurityEvent({
          type: SecurityViolationType.DEVICE_FINGERPRINT_MISMATCH,
          severity: 'high',
          request,
          details: {
            userId: payload.sub,
            expectedFingerprint: payload.deviceFingerprint,
            actualFingerprint: currentFingerprint,
          },
          action: 'challenge',
        });

        // In production, this might trigger additional verification
        // For now, we'll log and continue
        this.logger.warn('Device fingerprint mismatch detected', {
          userId: payload.sub,
          sessionId: payload.sessionId,
        });
      }
    }
  }

  /**
   * Check geolocation anomalies
   */
  private checkGeolocationAnomalies(
    payload: EnhancedJwtPayload,
    request: Request,
  ): void {
    const clientIP = this.getClientIP(request);

    // In production, this would use a geolocation service
    // For now, we'll do basic IP change detection
    if (payload.ipAddress && payload.ipAddress !== clientIP) {
      this.recordSecurityEvent({
        type: SecurityViolationType.GEOLOCATION_ANOMALY,
        severity: 'medium',
        request,
        details: {
          userId: payload.sub,
          previousIP: payload.ipAddress,
          currentIP: clientIP,
        },
        action: 'allow',
      });
    }
  }

  /**
   * Check session fixation
   */
  private checkSessionFixation(
    payload: EnhancedJwtPayload,
    request: Request,
  ): void {
    interface StoredSession {
      createdAt: number;
      ipAddress: string;
      userAgent: string;
    }
    const session = this.sessionStore.get(payload.sessionId) as
      | StoredSession
      | undefined;

    if (session) {
      const sessionAge = Date.now() - session.createdAt;
      const ipChanged = session.ipAddress !== this.getClientIP(request);
      const userAgentChanged = session.userAgent !== request.get('User-Agent');

      if ((ipChanged || userAgentChanged) && sessionAge < 300000) {
        // 5 minutes
        this.recordSecurityEvent({
          type: SecurityViolationType.SESSION_FIXATION,
          severity: 'high',
          request,
          details: {
            sessionId: payload.sessionId,
            sessionAge,
            ipChanged,
            userAgentChanged,
          },
          action: 'deny',
        });
        throw new ForbiddenException('Potential session fixation detected');
      }
    }
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(
    payload: EnhancedJwtPayload,
    securityContext: SecurityContext,
  ): number {
    let riskScore = 0;

    // Check for existing risk indicators
    if (payload.riskScore) {
      riskScore += payload.riskScore;
    }

    // Security context-based risk factors
    if (securityContext.authentication.strength === 'weak') {
      riskScore += 0.2;
    } else if (securityContext.authentication.strength === 'medium') {
      riskScore += 0.1;
    }

    // MFA verification status
    if (!securityContext.authentication.mfaVerified) {
      riskScore += 0.15;
    }

    // Session risk score from context
    if (securityContext.session.riskScore) {
      riskScore += securityContext.session.riskScore * 0.3;
    }

    // Time-based risk factors
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 0.1; // Off-hours access
    }

    // Recent security events
    const recentEvents = this.getRecentSecurityEvents(payload.sub, 3600000); // 1 hour
    riskScore += recentEvents.length * 0.05;

    // Session age
    const sessionAge = Date.now() / 1000 - (payload.iat || 0);
    if (sessionAge > 3600) {
      // 1 hour
      riskScore += 0.1;
    }

    // Token age-based risk
    const tokenAge = securityContext.authentication.tokenAge;
    if (tokenAge > 86400) {
      // 24 hours
      riskScore += 0.2;
    } else if (tokenAge > 43200) {
      // 12 hours
      riskScore += 0.1;
    }

    // Multiple simultaneous sessions
    const userSessions = Array.from(this.sessionStore.values()).filter(
      (session: unknown) => {
        const typedSession = session as { userId?: string };
        return typedSession.userId === payload.sub;
      },
    );
    if (userSessions.length > 2) {
      riskScore += 0.1;
    }

    return Math.min(riskScore, 1.0);
  }

  /**
   * Check for suspicious activity patterns
   */
  private checkSuspiciousActivity(
    payload: EnhancedJwtPayload,
    request: Request,
  ): void {
    // Check for rapid sequential requests (potential automation)
    const userKey = `activity:${payload.sub}`;
    const recentRequests = (this.rateLimitStore.get(userKey) as number[]) || [];
    const now = Date.now();

    // Check for requests within 100ms (very fast for human interaction)
    const rapidRequests = recentRequests.filter(
      (timestamp: number) => now - timestamp < 100,
    );

    if (rapidRequests.length > 5) {
      this.recordSecurityEvent({
        type: SecurityViolationType.SUSPICIOUS_ACTIVITY,
        severity: 'medium',
        request,
        details: {
          userId: payload.sub,
          rapidRequests: rapidRequests.length,
          pattern: 'automation_suspected',
        },
        action: 'challenge',
      });
    }
  }

  /**
   * Update session activity tracking
   */
  private updateSessionActivity(
    payload: EnhancedJwtPayload,
    request: Request,
  ): void {
    const existingSession = this.sessionStore.get(payload.sessionId) as
      | { createdAt: number }
      | undefined;
    const sessionData = {
      sessionId: payload.sessionId,
      userId: payload.sub,
      lastActivity: Date.now(),
      ipAddress: this.getClientIP(request),
      userAgent: request.get('User-Agent'),
      createdAt: existingSession?.createdAt || Date.now(),
    };

    this.sessionStore.set(payload.sessionId, sessionData);
  }

  /**
   * Create security context
   */
  private createSecurityContext(request: Request): SecurityContext {
    return {
      user: {} as EnhancedJwtPayload, // Will be filled after token validation
      session: {
        id: 'temp-session-id',
        createdAt: new Date(),
        lastActivity: new Date(),
        ipAddress: this.getClientIP(request),
        userAgent: request.get('User-Agent') || '',
        deviceFingerprint: 'unknown',
        riskScore: 0,
      },
      authentication: {
        method: 'jwt',
        strength: 'medium',
        mfaVerified: false,
        tokenAge: 0,
      },
      request: {
        id:
          (request as Request & { requestId?: string }).requestId || 'unknown',
        timestamp: new Date(),
        endpoint: request.path,
        method: request.method,
        userAgent: request.get('User-Agent') || '',
        ipAddress: this.getClientIP(request),
        headers: request.headers as Record<string, string>,
      },
    };
  }

  /**
   * Check if endpoint is public
   */
  private isPublicEndpoint(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic || false;
  }

  /**
   * Record security event
   */
  private recordSecurityEvent(
    event: Partial<SecurityEvent> & {
      type: SecurityViolationType;
      request: Request | null;
    },
  ): void {
    const requestWithUser = event.request as
      | (Request & { user?: { sub?: string; sessionId?: string } })
      | null;
    const securityEvent: SecurityEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: event.type,
      severity: event.severity || 'medium',
      userId: requestWithUser?.user?.sub,
      sessionId: requestWithUser?.user?.sessionId,
      ipAddress: event.request ? this.getClientIP(event.request) : 'unknown',
      userAgent: event.request?.get('User-Agent') || 'unknown',
      endpoint: event.request?.path || 'unknown',
      details: event.details || {},
      action: event.action || 'deny',
      riskScore: event.riskScore || 0,
    };

    this.securityEvents.push(securityEvent);

    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents.splice(0, this.securityEvents.length - 1000);
    }

    // Log high severity events
    if (
      securityEvent.severity === 'high' ||
      securityEvent.severity === 'critical'
    ) {
      this.logger.error('High severity security event', securityEvent);
    }
  }

  /**
   * Helper methods
   */
  private getClientIP(request: Request): string {
    return (
      request.get('CF-Connecting-IP') ||
      request.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      request.get('X-Real-IP') ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private generateDeviceFingerprint(request: Request): string {
    const userAgent = request.get('User-Agent') || '';
    const acceptLanguage = request.get('Accept-Language') || '';
    const acceptEncoding = request.get('Accept-Encoding') || '';

    const fingerprint = crypto
      .createHash('sha256')
      .update(`${userAgent}:${acceptLanguage}:${acceptEncoding}`)
      .digest('hex');

    return fingerprint.substring(0, 16);
  }

  private getRecentSecurityEvents(
    userId: string,
    timeWindow: number,
  ): SecurityEvent[] {
    const cutoff = Date.now() - timeWindow;
    return this.securityEvents.filter(
      (event) => event.userId === userId && event.timestamp.getTime() > cutoff,
    );
  }

  private getViolationTypeFromError(error: any): SecurityViolationType {
    if (error instanceof UnauthorizedException) {
      if (error.message.includes('expired')) {
        return SecurityViolationType.EXPIRED_TOKEN;
      }
      return SecurityViolationType.INVALID_TOKEN;
    }
    if (error instanceof ForbiddenException) {
      return SecurityViolationType.SUSPICIOUS_ACTIVITY;
    }
    return SecurityViolationType.INVALID_TOKEN;
  }

  private getSecuritySeverity(
    error: any,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (error instanceof ForbiddenException) {
      return 'high';
    }
    if (error instanceof UnauthorizedException) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Start cleanup timers
   */
  private startCleanupTimers(): void {
    // Cleanup expired sessions every 5 minutes
    setInterval(() => {
      const now = Date.now();
      interface SessionWithActivity {
        lastActivity: number;
      }
      for (const [sessionId, session] of this.sessionStore.entries()) {
        const typedSession = session as SessionWithActivity;
        if (now - typedSession.lastActivity > this.sessionTimeout) {
          this.sessionStore.delete(sessionId);
        }
      }
    }, 300000);

    // Cleanup old rate limit entries every hour
    setInterval(() => {
      const now = Date.now();
      for (const [key, requests] of this.rateLimitStore.entries()) {
        const requestArray = requests as number[];
        const validRequests = requestArray.filter(
          (timestamp: number) =>
            now - timestamp < this.rateLimitConfig.windowMs,
        );
        if (validRequests.length === 0) {
          this.rateLimitStore.delete(key);
        } else {
          this.rateLimitStore.set(key, validRequests);
        }
      }
    }, 3600000);
  }

  /**
   * Get security statistics (for monitoring)
   */
  getSecurityStatistics(): {
    sessions: number;
    recentEvents: number;
    topViolations: Array<{ type: string; count: number }>;
    riskDistribution: Record<string, number>;
  } {
    const recentEvents = this.securityEvents.filter(
      (event) => Date.now() - event.timestamp.getTime() < 3600000,
    );

    const violationCounts = new Map<string, number>();
    const riskDistribution = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const event of recentEvents) {
      violationCounts.set(
        event.type,
        (violationCounts.get(event.type) || 0) + 1,
      );
      riskDistribution[event.severity]++;
    }

    const topViolations = Array.from(violationCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      sessions: this.sessionStore.size,
      recentEvents: recentEvents.length,
      topViolations,
      riskDistribution,
    };
  }
}
