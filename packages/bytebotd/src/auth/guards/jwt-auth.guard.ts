/**
 * JWT Authentication Guard - ByteBotd Computer Control Service
 * Protects computer automation endpoints with JWT token validation
 *
 * Features:
 * - JWT token validation with automatic user extraction
 * - Comprehensive security logging for computer control access
 * - Request context enhancement with authenticated user
 * - Graceful error handling for authentication failures
 * - Integration with shared security types
 *
 * @author Security Implementation Specialist
 * @version 1.0.0
 * @since ByteBotd Authentication Hardening
 */

import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRole, Permission } from '@bytebot/shared';
import { ClientInfo } from '../../types';

/**
 * User interface for ByteBotd (subset of full User model)
 */
export interface ByteBotdUser {
  sub: string; // Required by shared interface compatibility
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  sessionId?: string;
  permissions?: Permission[];
  clientInfo?: ClientInfo;
}

/**
 * Extended Request interface with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: ByteBotdUser;
}

/**
 * JWT authentication error types for error handling
 */
interface JwtAuthError extends Error {
  message: string;
  name: string;
}

/**
 * JWT authentication info object containing validation details
 */
interface JwtAuthInfo {
  message?: string;
  name?: string;
  [key: string]: unknown;
}

/**
 * Standard JWT payload interface with standard claims
 */
interface StandardJwtPayload {
  /** Subject (usually user ID) */
  sub?: string;
  /** Issued at time (Unix timestamp) */
  iat?: number;
  /** Expiration time (Unix timestamp) */
  exp?: number;
  /** Not before time (Unix timestamp) */
  nbf?: number;
  /** JWT ID */
  jti?: string;
  /** Issuer */
  iss?: string;
  /** Audience */
  aud?: string | string[];
  [key: string]: unknown;
}

/**
 * JWT Authentication Guard for ByteBotd
 * Validates JWT tokens and protects computer control routes
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Enhanced JWT validation with comprehensive security checks
   * Validates JWT token, extracts authenticated user, and performs additional security validations
   *
   * @param context - Execution context containing request information
   * @returns Promise<boolean> - Whether the request is authorized
   * @throws UnauthorizedException - When authentication fails
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const operationId = `bytebotd-jwt-auth-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const startTime = Date.now();

    // Check if route is marked as public (skip authentication)
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug(
        `[${operationId}] Route marked as public, skipping authentication`,
        {
          operationId,
          route: this.getRouteInfo(context),
        },
      );
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const clientIp = this.getClientIpAddress(request);
    const userAgent = request.headers['user-agent']?.substring(0, 100);

    // Enhanced security logging with threat detection
    this.logger.debug(
      `[${operationId}] Enhanced JWT authentication attempt for computer control`,
      {
        operationId,
        method: request.method,
        url: request.url,
        userAgent,
        ipAddress: clientIp,
        timestamp: new Date().toISOString(),
        securityContext: 'computer_control_access',
      },
    );

    // Pre-authentication security checks
    if (!this.performPreAuthChecks(request, operationId)) {
      throw new UnauthorizedException(
        'Pre-authentication security check failed',
      );
    }

    try {
      // Call parent authentication logic (Passport JWT strategy)
      const result = await super.canActivate(context); // Note: const reassignment issue fixed

      if (result) {
        const authTime = Date.now() - startTime;
        const user = request.user;

        // Perform post-authentication security checks
        if (user && !this.performPostAuthChecks(user, operationId)) {
          throw new UnauthorizedException(
            'Post-authentication security check failed',
          );
        }

        this.logger.log(
          `[${operationId}] Enhanced JWT authentication successful for computer control`,
          {
            operationId,
            userId: user?.id,
            username: user?.username,
            role: user?.role,
            method: request.method,
            url: request.url,
            authTimeMs: authTime,
            ipAddress: clientIp,
            userAgent,
            securityLevel: 'enhanced',
            securityEvent: 'computer_control_auth_success',
            postAuthChecks: 'passed',
          },
        );
      }

      return result as boolean;
    } catch (_error) {
      const authTime = Date.now() - startTime;

      // Log authentication failure with enhanced security context
      this.logger.warn(
        `[${operationId}] JWT authentication failed for computer control access`,
        {
          operationId,
          method: request.method,
          url: request.url,
          error: _error instanceof Error ? _error.message : String(_error),
          authTimeMs: authTime,
          ipAddress: this.getClientIpAddress(request),
          userAgent: request.headers['user-agent']?.substring(0, 100),
          hasAuthHeader: !!request.headers.authorization,
          authHeaderFormat: this.analyzeAuthHeader(
            request.headers.authorization,
          ),
          securityEvent: 'computer_control_auth_failed',
          riskScore: 85, // High risk for computer control access attempts
        },
      );

      // Re-throw as UnauthorizedException for consistent error handling
      if (_error instanceof UnauthorizedException) {
        throw _error;
      }

      throw new UnauthorizedException(
        'Authentication required for computer control',
      );
    }
  }

  /**
   * Handle authentication request and provide detailed error information
   * Called by Passport strategy when authentication fails
   *
   * @param err - Authentication error
   * @param user - Authenticated user (if successful)
   * @param info - Additional authentication information
   * @param context - Execution context
   * @returns User object or throws UnauthorizedException
   */
  handleRequest<TUser = ByteBotdUser>(
    err: JwtAuthError | null,
    user: ByteBotdUser | false,
    info: JwtAuthInfo | null,
    context: ExecutionContext,
  ): TUser {
    const operationId = `bytebotd-jwt-handle-${Date.now()}`;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Handle authentication errors
    if (err) {
      this.logger.error(
        `[${operationId}] Computer control authentication error`,
        {
          operationId,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          url: request.url,
          method: request.method,
          ipAddress: this.getClientIpAddress(request),
          securityEvent: 'computer_control_auth_error',
        },
      );
      throw new UnauthorizedException(
        'Authentication failed for computer control',
      );
    }

    // Handle missing or invalid user
    if (!user) {
      const errorMessage = this.getAuthErrorMessage(info);

      this.logger.warn(
        `[${operationId}] Computer control authentication failed - no user`,
        {
          operationId,
          info: info?.message ?? info?.name ?? String(info),
          url: request.url,
          method: request.method,
          ipAddress: this.getClientIpAddress(request),
          errorMessage,
          securityEvent: 'computer_control_no_user',
        },
      );

      throw new UnauthorizedException(errorMessage);
    }

    // Successful authentication
    this.logger.debug(
      `[${operationId}] Computer control authentication request handled successfully`,
      {
        operationId,
        userId: (user as ByteBotdUser).id,
        username: (user as ByteBotdUser).username,
        role: (user as ByteBotdUser).role,
        url: request.url,
        method: request.method,
        securityEvent: 'computer_control_auth_handled',
      },
    );

    return user as TUser;
  }

  /**
   * Extract client IP address from request
   * Handles various proxy configurations and headers
   *
   * @param request - HTTP request object
   * @returns string - Client IP address
   * @private
   */
  private getClientIpAddress(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      (request.headers['x-real-ip'] as string) ??
      request.connection?.remoteAddress ??
      request.socket?.remoteAddress ??
      'unknown'
    );
  }

  /**
   * Get route information for logging
   * Extracts handler and controller information
   *
   * @param context - Execution context
   * @returns string - Route identifier
   * @private
   */
  private getRouteInfo(context: ExecutionContext): string {
    const handler = context.getHandler().name;
    const controller = context.getClass().name;
    return `${controller}.${handler}`;
  }

  /**
   * Analyze Authorization header format for debugging
   * Helps identify common authentication issues
   *
   * @param authHeader - Authorization header value
   * @returns string - Analysis result
   * @private
   */
  private analyzeAuthHeader(authHeader?: string): string {
    if (!authHeader) {
      return 'missing';
    }

    if (!authHeader.startsWith('Bearer ')) {
      return `invalid-format-${authHeader.split(' ')[0] ?? 'no-type'}`;
    }

    const token = authHeader.substring(7);
    if (!token) {
      return 'missing-token';
    }

    // Basic JWT format validation
    const parts = token.split('.');
    if (parts.length !== 3) {
      return `invalid-jwt-parts-${parts.length}`;
    }

    return 'valid-format';
  }

  /**
   * Extract message information from authentication info object with type safety
   * Safely accesses message and name properties from potentially untyped info object
   *
   * @param info - Passport authentication info object (potentially untyped)
   * @returns string - Extracted message or fallback string
   * @private
   */
  private extractMessageFromInfo(info: unknown): string {
    // Type guard for objects with message property
    if (info && typeof info === 'object' && 'message' in info) {
      const messageValue = (info as { message: unknown }).message;
      if (typeof messageValue === 'string') {
        return messageValue;
      }
    }

    // Type guard for objects with name property
    if (info && typeof info === 'object' && 'name' in info) {
      const nameValue = (info as { name: unknown }).name;
      if (typeof nameValue === 'string') {
        return nameValue;
      }
    }

    // Fallback to string conversion of the entire info object
    return String(info);
  }

  /**
   * Get user-friendly authentication error message
   * Provides clear error messages for common authentication failures
   *
   * @param info - Passport authentication info object
   * @returns string - User-friendly error message
   * @private
   */
  private getAuthErrorMessage(info: unknown): string {
    if (!info) {
      return 'Authentication required for computer control';
    }

    const message = String(this.extractMessageFromInfo(info));

    // Common JWT errors with user-friendly messages
    switch (message) {
      case 'TokenExpiredError':
      case 'jwt expired':
        return 'Access token has expired';

      case 'JsonWebTokenError':
      case 'invalid token':
        return 'Invalid access token';

      case 'NotBeforeError':
        return 'Token not active yet';

      case 'No auth token':
        return 'Access token required for computer control';

      default:
        return 'Authentication failed for computer control';
    }
  }

  /**
   * Enhanced pre-authentication security checks
   * Validates request headers, IP patterns, and potential security threats
   *
   * @param request - HTTP request object
   * @param operationId - Operation tracking ID
   * @returns boolean - Whether pre-auth checks passed
   * @private
   */
  private performPreAuthChecks(request: Request, operationId: string): boolean {
    // Check for suspicious user agent patterns
    const userAgent = request.headers['user-agent'];
    if (!userAgent || this.isSuspiciousUserAgent(userAgent)) {
      this.logger.warn(`[${operationId}] Suspicious user agent detected`, {
        operationId,
        userAgent,
        ipAddress: this.getClientIpAddress(request),
        securityEvent: 'suspicious_user_agent',
      });
      return false;
    }

    // Check for excessive header count (potential attack)
    const headerCount = Object.keys(request.headers).length;
    if (headerCount > 50) {
      this.logger.warn(`[${operationId}] Excessive headers detected`, {
        operationId,
        headerCount,
        ipAddress: this.getClientIpAddress(request),
        securityEvent: 'excessive_headers',
      });
      return false;
    }

    // Validate Authorization header format
    const authHeader = request.headers.authorization;
    if (authHeader && !this.isValidAuthHeaderFormat(authHeader)) {
      this.logger.warn(`[${operationId}] Invalid authorization header format`, {
        operationId,
        authHeaderFormat: this.analyzeAuthHeader(authHeader),
        ipAddress: this.getClientIpAddress(request),
        securityEvent: 'invalid_auth_header',
      });
      return false;
    }

    // Check for potential token replay attacks (basic timing check)
    if (authHeader && this.isPotentialReplayAttack(authHeader, operationId)) {
      this.logger.warn(
        `[${operationId}] Potential token replay attack detected`,
        {
          operationId,
          ipAddress: this.getClientIpAddress(request),
          securityEvent: 'potential_replay_attack',
        },
      );
      return false;
    }

    return true;
  }

  /**
   * Check if user agent indicates suspicious activity
   * Detects bots, scrapers, and automated tools
   *
   * @param userAgent - User agent string
   * @returns boolean - Whether user agent is suspicious
   * @private
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      // Common bots and scrapers
      /bot|crawler|spider|scraper/gi,

      // Automated tools
      /curl|wget|httpie|postman|insomnia/gi,

      // Security scanners
      /nmap|nikto|sqlmap|burp|zap|acunetix|nessus/gi,

      // Generic HTTP clients
      /^(python|java|go|rust|php|ruby|perl)-/gi,

      // Empty or very short user agents
      /^.{0,10}$/,

      // Common attack tools
      /metasploit|exploit|payload|shell/gi,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
  }

  /**
   * Validate authorization header format
   * Ensures proper Bearer token format
   *
   * @param authHeader - Authorization header value
   * @returns boolean - Whether format is valid
   * @private
   */
  private isValidAuthHeaderFormat(authHeader: string): boolean {
    // Must be Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);

    // Token must exist and be reasonable length
    if (!token || token.length < 20 || token.length > 2048) {
      return false;
    }

    // Basic JWT format check (3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Each part should be base64url encoded (basic check)
    return parts.every(
      (part) => /^[A-Za-z0-9_-]+$/.test(part) && part.length > 0,
    );
  }

  /**
   * Basic replay attack detection using timing analysis
   * This is a simplified approach - production systems should use nonces
   *
   * @param authHeader - Authorization header value
   * @param operationId - Operation tracking ID
   * @returns boolean - Whether this might be a replay attack
   * @private
   */
  private isPotentialReplayAttack(
    authHeader: string,
    operationId: string,
  ): boolean {
    try {
      const token = authHeader.substring(7);
      const tokenParts = token.split('.');

      if (tokenParts.length !== 3) {
        return false;
      }

      // Decode JWT payload (without verification - just for timing check)
      // Convert base64url to base64 and decode
      const payloadPart = tokenParts[1];
      if (!payloadPart) {
        return false;
      }
      const base64Payload = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(
        Buffer.from(base64Payload, 'base64').toString('utf8'),
      ) as StandardJwtPayload;

      const currentTime = Math.floor(Date.now() / 1000);
      const tokenIssuedAt = payload.iat;
      const tokenExpiry = payload.exp;

      // Check if token is very close to expiry (potential replay)
      if (tokenExpiry && currentTime > tokenExpiry - 60) {
        return true;
      }

      // Check if token was issued very recently (less than 1 second ago)
      // This could indicate rapid successive requests with the same token
      if (tokenIssuedAt && currentTime - tokenIssuedAt < 1) {
        return true;
      }
    } catch (_error) {
      // If we can't decode the token, let the main JWT validation handle it
      this.logger.debug(
        `[${operationId}] Could not decode JWT for replay check: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
    }

    return false;
  }

  /**
   * Enhanced post-authentication user validation
   * Performs additional security checks on authenticated user
   *
   * @param user - Authenticated user object
   * @param operationId - Operation tracking ID
   * @returns boolean - Whether user passed additional security checks
   * @private
   */
  private performPostAuthChecks(
    user: ByteBotdUser,
    operationId: string,
  ): boolean {
    // Check if user account is active
    if (!user.isActive) {
      this.logger.warn(`[${operationId}] Inactive user attempted access`, {
        operationId,
        userId: user.id,
        username: user.username,
        securityEvent: 'inactive_user_access',
      });
      return false;
    }

    // Check user role permissions for computer control
    const allowedRoles: UserRole[] = [UserRole._ADMIN, UserRole._OPERATOR];
    if (!allowedRoles.includes(user.role)) {
      this.logger.warn(
        `[${operationId}] Unauthorized role attempted computer control access`,
        {
          operationId,
          userId: user.id,
          username: user.username,
          role: user.role,
          securityEvent: 'unauthorized_role_access',
        },
      );
      return false;
    }

    // Additional security validations can be added here
    // - Account lockout checks
    // - Concurrent session limits
    // - Geographic location validation
    // - Time-based access controls

    return true;
  }
}
