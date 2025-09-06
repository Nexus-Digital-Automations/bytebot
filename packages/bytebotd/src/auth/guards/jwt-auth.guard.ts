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
import { UserRole } from '@bytebot/shared';

/**
 * User interface for ByteBotd (subset of full User model)
 */
export interface ByteBotdUser {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
}

/**
 * Extended Request interface with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: ByteBotdUser;
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
   * Determine if request can activate the route
   * Validates JWT token and extracts authenticated user
   *
   * @param context - Execution context containing request information
   * @returns Promise<boolean> - Whether the request is authorized
   * @throws UnauthorizedException - When authentication fails
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const operationId = `bytebotd-jwt-auth-${Date.now()}`;
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

    this.logger.debug(`[${operationId}] JWT authentication attempt for computer control`, {
      operationId,
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent']?.substring(0, 100),
      ipAddress: this.getClientIpAddress(request),
    });

    try {
      // Call parent authentication logic (Passport JWT strategy)
      const result = await super.canActivate(context);

      if (result) {
        const authTime = Date.now() - startTime;
        const user = request.user;

        this.logger.log(`[${operationId}] JWT authentication successful for computer control`, {
          operationId,
          userId: user?.id,
          username: user?.username,
          role: user?.role,
          method: request.method,
          url: request.url,
          authTimeMs: authTime,
          ipAddress: this.getClientIpAddress(request),
          securityEvent: 'computer_control_auth_success',
        });
      }

      return result as boolean;
    } catch (error) {
      const authTime = Date.now() - startTime;

      // Log authentication failure with enhanced security context
      this.logger.warn(`[${operationId}] JWT authentication failed for computer control access`, {
        operationId,
        method: request.method,
        url: request.url,
        error: error instanceof Error ? error.message : String(error),
        authTimeMs: authTime,
        ipAddress: this.getClientIpAddress(request),
        userAgent: request.headers['user-agent']?.substring(0, 100),
        hasAuthHeader: !!request.headers.authorization,
        authHeaderFormat: this.analyzeAuthHeader(request.headers.authorization),
        securityEvent: 'computer_control_auth_failed',
        riskScore: 85, // High risk for computer control access attempts
      });

      // Re-throw as UnauthorizedException for consistent error handling
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Authentication required for computer control');
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
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ): TUser {
    const operationId = `bytebotd-jwt-handle-${Date.now()}`;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Handle authentication errors
    if (err) {
      this.logger.error(`[${operationId}] Computer control authentication error`, {
        operationId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        url: request.url,
        method: request.method,
        ipAddress: this.getClientIpAddress(request),
        securityEvent: 'computer_control_auth_error',
      });
      throw new UnauthorizedException('Authentication failed for computer control');
    }

    // Handle missing or invalid user
    if (!user) {
      const errorMessage = this.getAuthErrorMessage(info);

      this.logger.warn(`[${operationId}] Computer control authentication failed - no user`, {
        operationId,
        info: info?.message || info?.name || String(info),
        url: request.url,
        method: request.method,
        ipAddress: this.getClientIpAddress(request),
        errorMessage,
        securityEvent: 'computer_control_no_user',
      });

      throw new UnauthorizedException(errorMessage);
    }

    // Successful authentication
    this.logger.debug(
      `[${operationId}] Computer control authentication request handled successfully`,
      {
        operationId,
        userId: user.id,
        username: user.username,
        role: user.role,
        url: request.url,
        method: request.method,
        securityEvent: 'computer_control_auth_handled',
      },
    );

    return user;
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
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
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
      return `invalid-format-${authHeader.split(' ')[0] || 'no-type'}`;
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
   * Get user-friendly authentication error message
   * Provides clear error messages for common authentication failures
   *
   * @param info - Passport authentication info object
   * @returns string - User-friendly error message
   * @private
   */
  private getAuthErrorMessage(info: any): string {
    if (!info) {
      return 'Authentication required for computer control';
    }

    const message = info.message || info.name || String(info);

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
}