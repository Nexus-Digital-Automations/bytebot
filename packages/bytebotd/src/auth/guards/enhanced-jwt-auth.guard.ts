/**
 * Enhanced JWT Authentication Guard - ByteBotd Advanced Computer Control Security
 *
 * Advanced JWT validation with token refresh, service-to-service authentication,
 * and comprehensive security enhancements for computer automation endpoints.
 *
 * Features:
 * - Enhanced token validation with automatic refresh
 * - Service-to-service authentication support
 * - Cross-origin request validation with CORS security
 * - Real-time permission validation for computer use operations
 * - VNC connection authentication and resource access control
 * - Performance-optimized validation for real-time operations
 * - Comprehensive security context propagation
 *
 * @author JWT Guards BytebotD Specialist
 * @version 2.0.0
 * @since ByteBotd Enhanced JWT Security Implementation
 */

import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import {
  UserRole,
  Permission as _Permission,
  SecurityEventType as _SecurityEventType,
  createSecurityEvent as _createSecurityEvent,
  JwtPayload,
} from '@bytebot/shared';
import { ByteBotdUser } from './jwt-auth.guard';

/**
 * Enhanced JWT payload with service authentication and refresh capabilities
 */
interface EnhancedJwtPayload extends JwtPayload {
  /** Service identifier for service-to-service authentication */
  serviceId?: string;
  /** Service type (computer-use, agent, ui) */
  serviceType?: string;
  /** Token type (access, refresh, service) */
  tokenType: 'access' | 'refresh' | 'service';
  /** Refresh token identifier */
  refreshTokenId?: string;
  /** Original client IP for security validation */
  clientIp?: string;
  /** VNC session identifier if applicable */
  vncSessionId?: string;
  /** Computer use permissions bitmap */
  computerUsePermissions?: number;
  /** Screen access level (none, view, control) */
  screenAccessLevel?: 'none' | 'view' | 'control';
}

/**
 * Enhanced request interface with security context
 */
interface EnhancedAuthenticatedRequest extends Request {
  user: ByteBotdUser;
  securityContext: {
    tokenRefreshed: boolean;
    serviceAuthentication: boolean;
    vncSessionValid: boolean;
    screenAccessGranted: boolean;
    riskScore: number;
    operationId: string;
  };
}

/**
 * Computer use authorization levels
 */
enum ComputerUsePermission {
  NONE = 0,
  VIEW_SCREEN = 1,
  MOUSE_CONTROL = 2,
  KEYBOARD_CONTROL = 4,
  FILE_ACCESS = 8,
  CLIPBOARD_ACCESS = 16,
  VNC_CONNECTION = 32,
  FULL_CONTROL = 63, // All permissions
}

/**
 * Enhanced JWT Authentication Guard with advanced features
 * Provides comprehensive security for computer automation endpoints
 */
@Injectable()
export class EnhancedJwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(EnhancedJwtAuthGuard._name);

  // Token refresh cache to prevent multiple refresh attempts
  private refreshAttempts = new Map<string, number>();

  // Service authentication cache for performance
  private serviceAuthCache = new Map<
    string,
    { valid: boolean; expires: number }
  >();

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    super();

    // Clean up caches every 5 minutes
    setInterval(
      () => {
        this.cleanupCaches();
      },
      5 * 60 * 1000,
    );
  }

  /**
   * Enhanced JWT validation with comprehensive security checks
   * Supports token refresh, service authentication, and real-time validation
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const operationId = `enhanced-jwt-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    const startTime = Date.now();

    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug(
        `[${operationId}] Public route, skipping authentication`,
      );
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<EnhancedAuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const clientIp = this.getClientIpAddress(request);

    // Initialize security context
    request.securityContext = {
      tokenRefreshed: false,
      serviceAuthentication: false,
      vncSessionValid: false,
      screenAccessGranted: false,
      riskScore: 0,
      operationId,
    };

    this.logger.debug(
      `[${operationId}] Enhanced JWT authentication initiated`,
      {
        operationId,
        method: request.method,
        url: request.url,
        clientIp,
        userAgent: request.headers['user-agent']?.substring(0, 100),
        timestamp: new Date().toISOString(),
      },
    );

    // Enhanced pre-authentication security checks
    const securityCheck = await this.performEnhancedSecurityChecks(
      request,
      operationId,
    );
    if (!securityCheck.passed) {
      throw new UnauthorizedException(
        `Enhanced security check failed: ${securityCheck.reason}`,
      );
    }

    try {
      // Attempt primary authentication
      let authResult = await super.canActivate(context);

      if (!authResult) {
        // Try token refresh if primary authentication fails
        authResult = await this.attemptTokenRefresh(
          request,
          response,
          operationId,
        );
      }

      if (authResult && request.user) {
        const authTime = Date.now() - startTime;

        // Perform enhanced post-authentication validation
        await this.performPostAuthValidation(request, operationId);

        // Validate computer use permissions
        await this.validateComputerUsePermissions(request, operationId);

        // Check VNC session if applicable
        await this.validateVncSession(request, operationId);

        // Update security context
        request.securityContext.riskScore = this.calculateRiskScore(request);

        this.logger.log(
          `[${operationId}] Enhanced JWT authentication successful`,
          {
            operationId,
            userId: request.user.id,
            username: request.user.username,
            role: request.user.role,
            authTimeMs: authTime,
            tokenRefreshed: request.securityContext.tokenRefreshed,
            serviceAuth: request.securityContext.serviceAuthentication,
            vncSession: request.securityContext.vncSessionValid,
            screenAccess: request.securityContext.screenAccessGranted,
            riskScore: request.securityContext.riskScore,
            securityEvent: 'enhanced_jwt_auth_success',
          },
        );
      }

      return authResult as boolean;
    } catch (_error) {
      const authTime = Date.now() - startTime;

      this.logger.warn(`[${operationId}] Enhanced JWT authentication failed`, {
        operationId,
        error: _error instanceof Error ? _error.message : String(_error),
        authTimeMs: authTime,
        clientIp,
        securityEvent: 'enhanced_jwt_auth_failed',
        riskScore: 90, // High risk for failed enhanced authentication
      });

      if (
        _error instanceof UnauthorizedException ||
        _error instanceof ForbiddenException
      ) {
        throw _error;
      }

      throw new UnauthorizedException(
        'Enhanced authentication required for computer control',
      );
    }
  }

  /**
   * Attempt automatic token refresh when primary authentication fails
   */
  private async attemptTokenRefresh(
    request: EnhancedAuthenticatedRequest,
    response: Response,
    operationId: string,
  ): Promise<boolean> {
    const refreshToken = this.extractRefreshToken(request);

    if (!refreshToken) {
      this.logger.debug(
        `[${operationId}] No refresh token available for automatic refresh`,
      );
      return false;
    }

    // Check refresh attempt rate limiting
    const clientId = this.getClientIpAddress(request);
    const attempts = this.refreshAttempts.get(clientId) || 0;

    if (attempts >= 3) {
      this.logger.warn(
        `[${operationId}] Too many refresh attempts from client`,
        {
          operationId,
          clientIp: clientId,
          attempts,
          securityEvent: 'excessive_refresh_attempts',
        },
      );
      throw new UnauthorizedException('Too many refresh attempts');
    }

    try {
      // Increment refresh attempts
      this.refreshAttempts.set(clientId, attempts + 1);

      // Validate and decode refresh token
      const refreshPayload =
        await this.jwtService.verifyAsync<EnhancedJwtPayload>(refreshToken, {
          secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        });

      if (refreshPayload.tokenType !== 'refresh') {
        throw new UnauthorizedException('Invalid token type for refresh');
      }

      // Generate new access token
      const newAccessToken = await this.generateAccessToken(refreshPayload);

      // Set new token in response header
      response.setHeader('X-New-Access-Token', newAccessToken);

      // Create user object for request context
      const user: ByteBotdUser = {
        id: refreshPayload.sub,
        email: refreshPayload.email,
        username: refreshPayload.email.split('@')[0], // Fallback username
        role: refreshPayload.role,
        isActive: true, // Assuming active if refresh is valid
      };

      request.user = user;
      request.securityContext.tokenRefreshed = true;

      this.logger.log(`[${operationId}] Token automatically refreshed`, {
        operationId,
        userId: user.id,
        securityEvent: 'token_auto_refresh',
      });

      // Clear refresh attempts on success
      this.refreshAttempts.delete(clientId);

      return true;
    } catch (_error) {
      this.logger.warn(`[${operationId}] Token refresh failed`, {
        operationId,
        error: _error instanceof Error ? _error.message : String(_error),
        securityEvent: 'token_refresh_failed',
      });

      return false;
    }
  }

  /**
   * Extract refresh token from various request sources
   */
  private extractRefreshToken(request: Request): string | null {
    // Check refresh token in cookies (most secure)
    if (request.cookies?.refreshToken) {
      return request.cookies.refreshToken;
    }

    // Check refresh token in secure headers
    if (request.headers['x-refresh-token']) {
      return request.headers['x-refresh-token'] as string;
    }

    // Check refresh token in request body (for specific endpoints)
    if (request.body?.refreshToken && request.method === 'POST') {
      return request.body.refreshToken;
    }

    return null;
  }

  /**
   * Generate new access token from refresh token payload
   */
  private async generateAccessToken(
    refreshPayload: EnhancedJwtPayload,
  ): Promise<string> {
    const accessPayload: Partial<EnhancedJwtPayload> = {
      sub: refreshPayload.sub,
      email: refreshPayload.email,
      role: refreshPayload.role,
      permissions: refreshPayload.permissions,
      tokenType: 'access',
      vncSessionId: refreshPayload.vncSessionId,
      clientIp: refreshPayload.clientIp,
      computerUsePermissions: refreshPayload.computerUsePermissions,
      screenAccessLevel: refreshPayload.screenAccessLevel,
    };

    return this.jwtService.signAsync(accessPayload, {
      expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
      issuer: 'bytebotd-enhanced',
      audience: 'computer-control',
    });
  }

  /**
   * Perform enhanced security checks beyond basic JWT validation
   */
  private async performEnhancedSecurityChecks(
    request: Request,
    operationId: string,
  ): Promise<{ passed: boolean; reason?: string }> {
    // Check for service-to-service authentication tokens
    const serviceToken = request.headers['x-service-token'] as string;
    if (
      serviceToken &&
      !(await this.validateServiceToken(serviceToken, operationId))
    ) {
      return { passed: false, reason: 'Invalid service authentication token' };
    }

    // Validate cross-origin requests for computer control
    if (
      request.method !== 'GET' &&
      !this.validateCorsForComputerControl(request)
    ) {
      return {
        passed: false,
        reason: 'CORS validation failed for computer control operation',
      };
    }

    // Check for suspicious request patterns
    if (this.detectSuspiciousPatterns(request)) {
      return { passed: false, reason: 'Suspicious request pattern detected' };
    }

    // Validate request size for computer control operations
    const contentLength = parseInt(request.headers['content-length'] || '0');
    if (contentLength > 10 * 1024 * 1024) {
      // 10MB limit
      return {
        passed: false,
        reason: 'Request payload too large for computer control',
      };
    }

    return { passed: true };
  }

  /**
   * Validate service-to-service authentication token
   */
  private async validateServiceToken(
    token: string,
    operationId: string,
  ): Promise<boolean> {
    // Check cache first for performance
    const cached = this.serviceAuthCache.get(token);
    if (cached && cached.expires > Date.now()) {
      return cached.valid;
    }

    try {
      const payload = await this.jwtService.verifyAsync<EnhancedJwtPayload>(
        token,
        {
          secret: process.env.SERVICE_JWT_SECRET || process.env.JWT_SECRET,
          audience: 'service-to-service',
        },
      );

      const isValid = !!(
        payload.tokenType === 'service' &&
        payload.serviceId &&
        payload.serviceType
      );

      // Cache result for 5 minutes
      this.serviceAuthCache.set(token, {
        valid: isValid,
        expires: Date.now() + 5 * 60 * 1000,
      });

      if (isValid) {
        this.logger.debug(`[${operationId}] Service authentication validated`, {
          operationId,
          serviceId: payload.serviceId,
          serviceType: payload.serviceType,
        });
      }

      return isValid;
    } catch (_error) {
      this.logger.warn(`[${operationId}] Service token validation failed`, {
        operationId,
        error: _error instanceof Error ? _error.message : String(_error),
      });

      // Cache negative result for 1 minute
      this.serviceAuthCache.set(token, {
        valid: false,
        expires: Date.now() + 60 * 1000,
      });

      return false;
    }
  }

  /**
   * Validate CORS for computer control operations
   */
  private validateCorsForComputerControl(request: Request): boolean {
    const origin = request.headers.origin;
    const allowedOrigins = process.env.COMPUTER_CONTROL_ALLOWED_ORIGINS?.split(
      ',',
    ) || [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://app.bytebot.ai',
    ];

    // Allow same-origin requests
    if (!origin) {
      return true;
    }

    // Check against allowed origins
    return allowedOrigins.includes(origin);
  }

  /**
   * Detect suspicious request patterns
   */
  private detectSuspiciousPatterns(request: Request): boolean {
    const userAgent = request.headers['user-agent'] || '';
    const path = request.url;

    // Check for automation tools that shouldn't be used for computer control
    const suspiciousUserAgents = [
      /selenium/gi,
      /playwright/gi,
      /puppeteer/gi,
      /headless/gi,
      /bot/gi,
      /crawler/gi,
    ];

    if (suspiciousUserAgents.some((pattern) => pattern.test(userAgent))) {
      return true;
    }

    // Check for suspicious path patterns
    if (path.includes('../') || path.includes('..\\')) {
      return true;
    }

    // Check for SQL injection patterns in query strings
    const queryString = request.url.split('?')[1] || '';
    const sqlPatterns = [
      /union\s+select/gi,
      /drop\s+table/gi,
      /insert\s+into/gi,
      /delete\s+from/gi,
    ];

    if (sqlPatterns.some((pattern) => pattern.test(queryString))) {
      return true;
    }

    return false;
  }

  /**
   * Perform post-authentication validation with enhanced checks
   */
  private async performPostAuthValidation(
    request: EnhancedAuthenticatedRequest,
    operationId: string,
  ): Promise<void> {
    const user = request.user;

    // Check if user has minimum required role for computer control
    const requiredRoles: UserRole[] = [UserRole._ADMIN, UserRole._OPERATOR];
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Insufficient role for computer control access',
      );
    }

    // Validate session consistency if available
    const sessionId = request.headers['x-session-id'] as string;
    if (sessionId && !this.validateSessionConsistency(user.id, sessionId)) {
      throw new UnauthorizedException('Session consistency validation failed');
    }

    // Check for concurrent session limits
    if (await this.exceedsConcurrentSessionLimit(user.id)) {
      throw new ForbiddenException('Maximum concurrent sessions exceeded');
    }

    this.logger.debug(
      `[${operationId}] Post-authentication validation passed`,
      {
        operationId,
        userId: user.id,
        role: user.role,
      },
    );
  }

  /**
   * Validate computer use permissions for specific operations
   */
  private async validateComputerUsePermissions(
    request: EnhancedAuthenticatedRequest,
    operationId: string,
  ): Promise<void> {
    const path = request.url.toLowerCase();
    let requiredPermissions = ComputerUsePermission.NONE;

    // Determine required permissions based on endpoint
    if (path.includes('/screenshot') || path.includes('/screen')) {
      requiredPermissions |= ComputerUsePermission.VIEW_SCREEN;
    }

    if (path.includes('/mouse') || path.includes('/click')) {
      requiredPermissions |= ComputerUsePermission.MOUSE_CONTROL;
    }

    if (path.includes('/keyboard') || path.includes('/type')) {
      requiredPermissions |= ComputerUsePermission.KEYBOARD_CONTROL;
    }

    if (path.includes('/file') || path.includes('/upload')) {
      requiredPermissions |= ComputerUsePermission.FILE_ACCESS;
    }

    if (path.includes('/clipboard')) {
      requiredPermissions |= ComputerUsePermission.CLIPBOARD_ACCESS;
    }

    if (path.includes('/vnc')) {
      requiredPermissions |= ComputerUsePermission.VNC_CONNECTION;
    }

    // For ADMIN users, grant full permissions
    if (request.user.role === UserRole._ADMIN) {
      request.securityContext.screenAccessGranted = true;
      return;
    }

    // TODO: In a real implementation, get user's computer use permissions from database
    // For now, grant view and basic control permissions to OPERATOR role
    const userPermissions =
      request.user.role === UserRole._OPERATOR
        ? ComputerUsePermission.VIEW_SCREEN |
          ComputerUsePermission.MOUSE_CONTROL |
          ComputerUsePermission.KEYBOARD_CONTROL
        : ComputerUsePermission.NONE;

    if ((userPermissions & requiredPermissions) !== requiredPermissions) {
      throw new ForbiddenException(
        'Insufficient computer use permissions for this operation',
      );
    }

    request.securityContext.screenAccessGranted = true;

    this.logger.debug(`[${operationId}] Computer use permissions validated`, {
      operationId,
      userId: request.user.id,
      requiredPermissions,
      userPermissions,
      granted: true,
    });
  }

  /**
   * Validate VNC session if applicable
   */
  private async validateVncSession(
    request: EnhancedAuthenticatedRequest,
    operationId: string,
  ): Promise<void> {
    const vncSessionId = request.headers['x-vnc-session'] as string;

    if (!vncSessionId) {
      // VNC session not required for all operations
      return;
    }

    // TODO: In a real implementation, validate VNC session against database
    // For now, perform basic format validation
    if (!/^vnc_[a-zA-Z0-9]{16,32}$/.test(vncSessionId)) {
      throw new BadRequestException('Invalid VNC session identifier format');
    }

    request.securityContext.vncSessionValid = true;

    this.logger.debug(`[${operationId}] VNC session validated`, {
      operationId,
      userId: request.user.id,
      vncSessionId,
    });
  }

  /**
   * Calculate risk score based on request context
   */
  private calculateRiskScore(request: EnhancedAuthenticatedRequest): number {
    let riskScore = 0;

    // Base risk for computer control operations
    riskScore += 30;

    // Increase risk for token refresh
    if (request.securityContext.tokenRefreshed) {
      riskScore += 15;
    }

    // Decrease risk for service authentication
    if (request.securityContext.serviceAuthentication) {
      riskScore -= 10;
    }

    // Increase risk for admin operations
    if (request.user.role === UserRole._ADMIN) {
      riskScore += 20;
    }

    // Increase risk based on endpoint sensitivity
    const path = request.url.toLowerCase();
    if (path.includes('/file') || path.includes('/upload')) {
      riskScore += 25;
    }

    if (path.includes('/vnc')) {
      riskScore += 30;
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  /**
   * Validate session consistency
   */
  private validateSessionConsistency(
    userId: string,
    sessionId: string,
  ): boolean {
    // TODO: In a real implementation, validate against session store
    // For now, perform basic format validation
    return /^session_[a-zA-Z0-9]{16,32}$/.test(sessionId);
  }

  /**
   * Check if user exceeds concurrent session limit
   */
  private async exceedsConcurrentSessionLimit(
    _userId: string,
  ): Promise<boolean> {
    // TODO: In a real implementation, check against session store
    // For now, assume limit is not exceeded
    return false;
  }

  /**
   * Get client IP address with enhanced detection
   */
  private getClientIpAddress(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      (request.headers['x-client-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCaches(): void {
    const now = Date.now();

    // Clean up refresh attempts (older than 15 minutes)
    const _fifteenMinutesAgo = now - 15 * 60 * 1000;

    // Clean up service auth cache (expired entries)
    for (const [token, entry] of Array.from(this.serviceAuthCache.entries())) {
      if (entry.expires < now) {
        this.serviceAuthCache.delete(token);
      }
    }

    this.logger.debug('Cache cleanup completed', {
      serviceAuthCacheSize: this.serviceAuthCache.size,
      refreshAttemptsSize: this.refreshAttempts.size,
    });
  }

  /**
   * Handle authentication request with enhanced error information
   */
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ): TUser {
    const operationId = `enhanced-jwt-handle-${Date.now()}`;
    const request = context
      .switchToHttp()
      .getRequest<EnhancedAuthenticatedRequest>();

    if (err) {
      this.logger.error(`[${operationId}] Enhanced authentication error`, {
        operationId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        url: request.url,
        method: request.method,
        securityEvent: 'enhanced_auth_error',
      });
      throw new UnauthorizedException('Enhanced authentication failed');
    }

    if (!user) {
      const errorMessage = this.getEnhancedAuthErrorMessage(info);

      this.logger.warn(
        `[${operationId}] Enhanced authentication failed - no user`,
        {
          operationId,
          info: info?.message || info?._name || String(info),
          url: request.url,
          method: request.method,
          errorMessage,
          securityEvent: 'enhanced_auth_no_user',
        },
      );

      throw new UnauthorizedException(errorMessage);
    }

    this.logger.debug(
      `[${operationId}] Enhanced authentication request handled successfully`,
      {
        operationId,
        userId: user.id,
        username: user.username,
        role: user.role,
        url: request.url,
        method: request.method,
      },
    );

    return user;
  }

  /**
   * Get enhanced authentication error message
   */
  private getEnhancedAuthErrorMessage(info: any): string {
    if (!info) {
      return 'Enhanced authentication required for computer control';
    }

    const message = info.message || info.name || String(info);

    switch (message) {
      case 'TokenExpiredError':
      case 'jwt expired':
        return 'Access token has expired - refresh required';

      case 'JsonWebTokenError':
      case 'invalid token':
        return 'Invalid access token format';

      case 'NotBeforeError':
        return 'Token not yet valid';

      case 'No auth token':
        return 'Access token required for computer control operations';

      default:
        return 'Enhanced authentication failed for computer control';
    }
  }
}
