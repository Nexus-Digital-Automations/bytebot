/**
 * Browser Automation Security Guard
 *
 * Comprehensive security guard for browser automation endpoints that integrates
 * authentication, authorization, validation, rate limiting, and security monitoring.
 *
 * Features:
 * - JWT authentication validation
 * - Role-based access control
 * - Permission-based authorization
 * - Rate limiting enforcement
 * - Security level validation
 * - Risk level assessment
 * - Session security validation
 * - Comprehensive security logging
 *
 * @author API Security Specialist
 * @version 1.0.0
 * @since Browser Automation Security Implementation
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  TooManyRequestsException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { UserRole, Permission } from '@bytebot/shared';
import { ApiSecurityService } from '../../security/api-security.service';
import { BrowserValidationService } from '../validation.service';
import { ParlantIntegrationService, ParlantConversationContext, RiskLevel } from '../../parlant/parlant-integration.service';
import {BROWSER_AUTH_REQUIRED_KEY,
  BROWSER_ROLES_KEY,
  BROWSER_PERMISSIONS_KEY,
  BROWSER_SECURITY_LEVEL_KEY,
  BROWSER_RISK_LEVEL_KEY,
  BROWSER_RATE_LIMIT_KEY,
  BROWSER_VALIDATION_KEY,
  BROWSER_PUBLIC_KEY,
  BROWSER_SESSION_REQUIRED_KEY,
  BROWSER_AUDIT_LOG_KEY,
  BrowserSecurityLevel,
  BrowserRiskLevel,
  RateLimitConfig,
  SecurityValidationConfig,
} from '../decorators/security.decorators';

/**
 * Authenticated user interface for browser automation
 */
interface BrowserUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  sessionId?: string;
}

/**
 * Extended request interface with browser security context
 */
interface BrowserSecurityRequest extends Request {
  user: BrowserUser;
  securityContext: BrowserSecurityContext;
}

/**
 * Browser security context
 */
interface BrowserSecurityContext {
  requestId: string;
  userId: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  method: string;
  timestamp: Date;
  securityLevel: BrowserSecurityLevel;
  riskLevel: BrowserRiskLevel;
  requiresValidation: boolean;
  requiresSession: boolean;
  rateLimit?: RateLimitConfig;
  validationConfig?: SecurityValidationConfig;
}

/**
 * Rate limiting tracker per user/IP combination
 */
interface RateLimitTracker {
  requests: number;
  windowStart: number;
  blocked: boolean;
  lastRequest: Date;
}

/**
 * Security validation result
 */
interface SecurityValidationResult {
  allowed: boolean;
  reason?: string;
  riskScore: number;
  violations: string[];
  recommendedAction: 'allow' | 'block' | 'monitor' | 'warn';
}

/**
 * Browser Automation Security Guard
 */
@Injectable()
export class BrowserSecurityGuard implements CanActivate {
  private readonly logger = new Logger(BrowserSecurityGuard.name);
  private readonly rateLimitTrackers = new Map<string, RateLimitTracker>();

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly apiSecurityService: ApiSecurityService,
    private readonly validationService: BrowserValidationService,
    private readonly parlantService: ParlantIntegrationService,
  ) {
    // Initialize rate limit cleanup
    setInterval(() => this.cleanupRateLimitTrackers(), 300000); // Every 5 minutes

    this.logger.log('Browser Security Guard initialized', {rateLimitCleanupInterval: '5 minutes',securityIntegration: 'enabled',
    });
  }

  /**
   * Main guard function - validates all browser automation requests
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<BrowserSecurityRequest>();
    const response = context.switchToHttp().getResponse<Response>();
    const handler = context.getHandler();
    const controller = context.getClass();

    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Build security context
      const securityContext = await this.buildSecurityContext(
        request,
        requestId,
        handler,
        controller,
      );

      request.securityContext = securityContext;

      this.logger.debug(`[${requestId}] Browser security validation started`, {requestId,endpoint: securityContext.endpoint,
        method: securityContext.method,
        securityLevel: securityContext.securityLevel,
        riskLevel: securityContext.riskLevel,
        userId: securityContext.userId,
      });

      // 1. Check if endpoint is public
      if (this.isPublicEndpoint(handler, controller)) {
        this.logger.debug(`[${requestId}] Public endpoint - skipping authentication`, {
          requestId,
          endpoint: securityContext.endpoint,
        });
        return true;
      }

      // 2. Authenticate user
      const user = await this.authenticateUser(request, securityContext);
      request.user = user;
      securityContext.userId = user.id;
      securityContext.sessionId = user.sessionId;

      // 3. Authorize user (roles and permissions)
      await this.authorizeUser(user, securityContext, handler, controller);

      // 4. Rate limiting validation
      await this.validateRateLimit(securityContext, handler, controller);

      // 5. Input validation (if required)
      if (securityContext.requiresValidation) {
        await this.validateRequest(request, securityContext);
      }

      // 6. Session validation (if required)
      if (securityContext.requiresSession) {
        await this.validateBrowserSession(request, securityContext);
      }

      // 7. Security risk assessment
      const securityResult = await this.assessSecurityRisk(request, securityContext);

      // 8. Apply security response
      await this.applySecurityResponse(securityResult, securityContext, response);

      // 9. Log security event
      const duration = Date.now() - startTime;
      this.logSecurityEvent('browser_security_validation_success', securityContext, {
        duration,
        riskScore: securityResult.riskScore,
        recommendedAction: securityResult.recommendedAction,
      });

      return securityResult.allowed;

    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(`[${requestId}] Browser security validation failed`, {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration,
        endpoint: request.path,
        method: request.method,
        ipAddress: this.extractClientIp(request),
      });

      // Log security failure
      this.logSecurityEvent('browser_security_validation_failed', {requestId,endpoint: request.path,
        method: request.method,
        ipAddress: this.extractClientIp(request),
        userAgent: request.headers['user-agent'],timestamp: new Date(),} as BrowserSecurityContext, {
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      // Re-throw specific security exceptions
      if (error instanceof UnauthorizedException ||
          error instanceof ForbiddenException ||
          error instanceof TooManyRequestsException ||
          error instanceof BadRequestException) {
        throw error;
      }

      // Generic security failure
      throw new ForbiddenException('Security validation failed');
    }
  }

  // ===== PRIVATE METHODS =====

  private async buildSecurityContext(
    request: Request,
    requestId: string,
    handler: Function,
    controller: Record<string, unknown>,
  ): Promise<BrowserSecurityContext> {
    // Extract metadata from decorators
    const securityLevel = this.reflector.getAllAndOverride<BrowserSecurityLevel>(
      BROWSER_SECURITY_LEVEL_KEY,
      [handler, controller],
    ) || BrowserSecurityLevel.MEDIUM;

    const riskLevel = this.reflector.getAllAndOverride<BrowserRiskLevel>(
      BROWSER_RISK_LEVEL_KEY,
      [handler, controller],
    ) || BrowserRiskLevel._MODERATE;

    const rateLimit = this.reflector.getAllAndOverride<RateLimitConfig>(
      BROWSER_RATE_LIMIT_KEY,
      [handler, controller],
    );

    const validationConfig = this.reflector.getAllAndOverride<SecurityValidationConfig>(
      BROWSER_VALIDATION_KEY,
      [handler, controller],
    );

    const requiresSession = this.reflector.getAllAndOverride<boolean>(
      BROWSER_SESSION_REQUIRED_KEY,
      [handler, controller],
    ) || false;

    return {
      requestId,
      userId: '', // Will be set after authentication
      ipAddress: this.extractClientIp(request),
      userAgent: request.headers['user-agent'] || '',
      endpoint: request.path,
      method: request.method,
      timestamp: new Date(),
      securityLevel,
      riskLevel,
      requiresValidation: !!validationConfig,
      requiresSession,
      rateLimit,
      validationConfig,
    };
  }

  private isPublicEndpoint(handler: Function, controller: Record<string, unknown>): boolean {
    return this.reflector.getAllAndOverride<boolean>(BROWSER_PUBLIC_KEY, [
      handler,
      controller,
    ]) || false;
  }

  private async authenticateUser(
    request: Request,
    context: BrowserSecurityContext,
  ): Promise<BrowserUser> {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        message: 'Authentication required for browser automation',
        type: 'missing_token',
        requestId: context.requestId,
      });
    }

    const token = authHeader.substring(7);

    try {
      // Verify JWT token
      const payload = this.jwtService.verify(token);

      // Extract user information
      const user: BrowserUser = {
        id: payload.sub || payload.id,
        email: payload.email,
        username: payload.username,
        role: payload.role,
        permissions: payload.permissions || [],
        isActive: payload.isActive !== false,
        sessionId: payload.sessionId,
      };

      // Validate user is active
      if (!user.isActive) {
        throw new UnauthorizedException({
          message: 'User account is inactive',
          type: 'inactive_user',
          requestId: context.requestId,
        });
      }

      this.logger.debug(`[${context.requestId}] User authenticated`, {
        requestId: context.requestId,
        userId: user.id,
        username: user.username,
        role: user.role,
      });

      return user;

    } catch (error) {
      this.logger.warn(`[${context.requestId}] Authentication failed`, {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent?.substring(0, 100),
      });

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException({
        message: 'Invalid authentication token',
        type: 'invalid_token',
        requestId: context.requestId,
      });
    }
  }

  private async authorizeUser(
    user: BrowserUser,
    context: BrowserSecurityContext,
    handler: Function,
    controller: Record<string, unknown>,
  ): Promise<void> {
    // Check required roles
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      BROWSER_ROLES_KEY,
      [handler, controller],
    );

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role)) {
        this.logger.warn(`[${context.requestId}] Role authorization failed`, {
          requestId: context.requestId,
          userId: user.id,
          userRole: user.role,
          requiredRoles,
          endpoint: context.endpoint,
        });

        throw new ForbiddenException({
          message: 'Insufficient role permissions for browser automation',
          type: 'role_authorization_failed',
          userRole: user.role,
          requiredRoles,
          requestId: context.requestId,
        });
      }
    }

    // Check required permissions
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      BROWSER_PERMISSIONS_KEY,
      [handler, controller],
    );

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every(permission =>
        user.permissions.includes(permission)
      );

      if (!hasAllPermissions) {
        const missingPermissions = requiredPermissions.filter(permission =>
          !user.permissions.includes(permission)
        );

        this.logger.warn(`[${context.requestId}] Permission authorization failed`, {
          requestId: context.requestId,
          userId: user.id,
          userPermissions: user.permissions,
          requiredPermissions,
          missingPermissions,
          endpoint: context.endpoint,
        });

        throw new ForbiddenException({
          message: 'Insufficient permissions for browser automation',
          type: 'permission_authorization_failed',
          missingPermissions,
          requestId: context.requestId,
        });
      }
    }

    this.logger.debug(`[${context.requestId}] User authorized`, {
      requestId: context.requestId,
      userId: user.id,
      role: user.role,
      permissions: user.permissions.length,
    });
  }

  private async validateRateLimit(
    context: BrowserSecurityContext,
    handler: Function,
    controller: Record<string, unknown>,
  ): Promise<void> {
    const rateLimitConfig = context.rateLimit;

    if (!rateLimitConfig) {
      return; // No rate limiting configured
    }

    const key = `${context.userId}:${context.ipAddress}:${context.endpoint}`;
    const now = Date.now();
    const windowStart = now - rateLimitConfig.windowMs;

    let tracker = this.rateLimitTrackers.get(key);

    if (!tracker || tracker.windowStart < windowStart) {
      // Create new or reset tracker
      tracker = {
        requests: 1,
        windowStart: now,
        blocked: false,
        lastRequest: new Date(),
      };
      this.rateLimitTrackers.set(key, tracker);
      return;
    }

    // Increment request count
    tracker.requests++;
    tracker.lastRequest = new Date();

    // Check if rate limit exceeded
    if (tracker.requests > rateLimitConfig.max) {
      tracker.blocked = true;

      this.logger.warn(`[${context.requestId}] Rate limit exceeded`, {
        requestId: context.requestId,
        userId: context.userId,
        ipAddress: context.ipAddress,
        endpoint: context.endpoint,
        requests: tracker.requests,
        limit: rateLimitConfig.max,
        windowMs: rateLimitConfig.windowMs,
      });

      throw new TooManyRequestsException({
        message: rateLimitConfig.message || 'Rate limit exceeded',
        type: 'rate_limit_exceeded',
        limit: rateLimitConfig.max,
        windowMs: rateLimitConfig.windowMs,
        retryAfter: Math.ceil((tracker.windowStart + rateLimitConfig.windowMs - now) / 1000),
        requestId: context.requestId,
      });
    }

    this.logger.debug(`[${context.requestId}] Rate limit check passed`, {
      requestId: context.requestId,
      requests: tracker.requests,
      limit: rateLimitConfig.max,
    });
  }

  private async validateRequest(
    request: BrowserSecurityRequest,
    context: BrowserSecurityContext,
  ): Promise<void> {
    const validationConfig = context.validationConfig;

    if (!validationConfig || !validationConfig.validateInput) {
      return;
    }

    try {
      const validationContext = {
        userId: context.userId,
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
        endpoint: context.endpoint,
        method: context.method,
        timestamp: context.timestamp,
      };

      // Determine validation type based on endpoint
      let validationResult;

      if (context.endpoint.includes('/tasks')) {
        validationResult = await this.validationService.validateBrowserTask(
          request.body,
          validationContext,
        );
      } else if (context.endpoint.includes('/sessions')) {
        validationResult = await this.validationService.validateBrowserSession(
          request.body,
          validationContext,
        );
      } else if (context.endpoint.includes('/extract')) {
        validationResult = await this.validationService.validateDataExtraction(
          request.body,
          validationContext,
        );
      } else {
        // Generic validation for other endpoints
        return;
      }

      if (!validationResult.isValid) {
        this.logger.warn(`[${context.requestId}] Input validation failed`, {
          requestId: context.requestId,
          userId: context.userId,
          endpoint: context.endpoint,
          errors: validationResult.errors.length,
          warnings: validationResult.warnings.length,
        });

        throw new BadRequestException({
          message: 'Input validation failed',
          type: 'validation_failed',
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          requestId: context.requestId,
        });
      }

      // Replace request body with sanitized data
      if (validationResult.sanitizedData) {
        request.body = validationResult.sanitizedData;
      }

      this.logger.debug(`[${context.requestId}] Input validation passed`, {
        requestId: context.requestId,
        warnings: validationResult.warnings.length,
        validationTime: validationResult.validationTime,
      });

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`[${context.requestId}] Validation processing failed`, {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new BadRequestException({
        message: 'Validation processing failed',
        type: 'validation_error',
        requestId: context.requestId,
      });
    }
  }

  private async validateBrowserSession(
    request: BrowserSecurityRequest,
    context: BrowserSecurityContext,
  ): Promise<void> {
    // Extract session ID from request
    let sessionId = context.sessionId;

    if (!sessionId && request.params.sessionId) {
      sessionId = request.params.sessionId;
    }

    if (!sessionId && request.body?.sessionId) {
      sessionId = request.body.sessionId;
    }

    if (!sessionId) {
      throw new BadRequestException({
        message: 'Valid browser session is required',
        type: 'missing_session',
        requestId: context.requestId,
      });
    }

    // Validate session exists and belongs to user
    // This would integrate with your session service
    const sessionValid = await this.validateSessionOwnership(sessionId, context.userId);

    if (!sessionValid) {
      throw new ForbiddenException({
        message: 'Invalid or unauthorized browser session',
        type: 'invalid_session',
        sessionId,
        requestId: context.requestId,
      });
    }

    this.logger.debug(`[${context.requestId}] Browser session validated`, {
      requestId: context.requestId,
      sessionId,
      userId: context.userId,
    });
  }

  private async assessSecurityRisk(
    request: BrowserSecurityRequest,
    context: BrowserSecurityContext,
  ): Promise<SecurityValidationResult> {
    let riskScore = 0;
    const violations: string[] = [];

    // Base risk based on security level
    switch (context.securityLevel) {
      case BrowserSecurityLevel.CRITICAL:
        riskScore += 40;
        break;
      case BrowserSecurityLevel.HIGH:
        riskScore += 30;
        break;
      case BrowserSecurityLevel.MEDIUM:
        riskScore += 20;
        break;
      case BrowserSecurityLevel.LOW:
        riskScore += 10;
        break;
    }

    // Additional risk based on risk level
    switch (context.riskLevel) {
      case BrowserRiskLevel._CRITICAL:
        riskScore += 30;
        break;
      case BrowserRiskLevel._HIGH:
        riskScore += 20;
        break;
      case BrowserRiskLevel.ELEVATED:
        riskScore += 15;
        break;
      case BrowserRiskLevel._MODERATE:
        riskScore += 10;
        break;
      case BrowserRiskLevel.SAFE:
        riskScore += 5;
        break;
    }

    // Risk based on user behavior
    const userRisk = await this.assessUserRisk(request.user, context);
    riskScore += userRisk.score;
    violations.push(...userRisk.violations);

    // Risk based on request content
    const contentRisk = await this.assessContentRisk(request, context);
    riskScore += contentRisk.score;
    violations.push(...contentRisk.violations);

    // Determine recommended action
    let recommendedAction: 'allow' | 'block' | 'monitor' | 'warn' = 'allow';
    if (riskScore >= 80) {
      recommendedAction = 'block';
    } else if (riskScore >= 60) {
      recommendedAction = 'warn';
    } else if (riskScore >= 40) {
      recommendedAction = 'monitor';
    }

    return {
      allowed: recommendedAction !== 'block',
      riskScore,
      violations,
      recommendedAction,
      reason: recommendedAction === 'block' ? 'High security risk detected' : undefined,
    };
  }

  private async applySecurityResponse(
    result: SecurityValidationResult,
    context: BrowserSecurityContext,
    response: Response,
  ): Promise<void> {
    // Add security headers
    response.setHeader('X-Security-Level', context.securityLevel);
    response.setHeader('X-Risk-Level', context.riskLevel);
    response.setHeader('X-Risk-Score', result.riskScore.toString());
    response.setHeader('X-Security-Action', result.recommendedAction);

    // Handle security response
    if (!result.allowed) {
      throw new ForbiddenException({
        message: result.reason || 'Security policy violation',
        type: 'security_policy_violation',
        riskScore: result.riskScore,
        violations: result.violations,
        requestId: context.requestId,
      });
    }

    if (result.recommendedAction === 'warn') {
      this.logger.warn(`[${context.requestId}] High-risk request approved with warning`, {
        requestId: context.requestId,
        riskScore: result.riskScore,
        violations: result.violations,
        userId: context.userId,
      });
    }
  }

  // ===== HELPER METHODS =====

  private async validateSessionOwnership(sessionId: string, userId: string): Promise<boolean> {
    // Mock implementation - in production, integrate with session service
    return true;
  }

  private async assessUserRisk(user: BrowserUser, context: BrowserSecurityContext): Promise<{ score: number; violations: string[] }> {
    const violations: string[] = [];
    let score = 0;

    // Check user role risk
    switch (user.role) {
      case UserRole._ADMIN:
        score += 5; // Admins are trusted but higher stakes
        break;
      case UserRole._USER:
        score += 10; // Regular users have higher risk
        break;
    }

    // Check for suspicious timing patterns
    const now = new Date();
    const hour = now.getHours();

    if (hour < 6 || hour > 22) {
      score += 5;
      violations.push('unusual_time_access');
    }

    return { score, violations };
  }

  private async assessContentRisk(request: BrowserSecurityRequest, context: BrowserSecurityContext): Promise<{ score: number; violations: string[] }> {
    const violations: string[] = [];
    let score = 0;

    // Assess payload size risk
    const payloadSize = JSON.stringify(request.body || {}).length;
    if (payloadSize > 100000) { // > 100KB
      score += 10;
      violations.push('large_payload');
    }

    // Check for sensitive operations
    const body = request.body || {};
    const bodyString = JSON.stringify(body).toLowerCase();

    const sensitivePatterns = [
      'password', 'secret', 'token', 'key', 'credential',
      'admin', 'root', 'system', 'config'
    ];

    sensitivePatterns.forEach(pattern => {
      if (bodyString.includes(pattern)) {
        score += 5;
        violations.push(`sensitive_content_${pattern}`);
      }
    });

    return { score, violations };
  }

  private extractClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  private generateRequestId(): string {
    return `browser_sec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private cleanupRateLimitTrackers(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    let removedCount = 0;

    for (const [key, tracker] of this.rateLimitTrackers.entries()) {
      if (now - tracker.lastRequest.getTime() > maxAge) {
        this.rateLimitTrackers.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.debug(`Cleaned up ${removedCount} expired rate limit trackers`, {
        remainingTrackers: this.rateLimitTrackers.size,
      });
    }
  }

  private logSecurityEvent(eventType: string, context: BrowserSecurityContext, metadata: Record<string, unknown>): void {
    this.logger.log(`Browser Security Event: ${eventType}`, {
      eventType,
      requestId: context.requestId,
      timestamp: context.timestamp.toISOString(),
      security: {
        userId: context.userId,
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent?.substring(0, 100),
        endpoint: context.endpoint,
        method: context.method,
        securityLevel: context.securityLevel,
        riskLevel: context.riskLevel,
      },
      ...metadata,
    });
  }
}