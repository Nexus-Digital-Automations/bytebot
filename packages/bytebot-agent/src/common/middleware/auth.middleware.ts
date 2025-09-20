/**
 * Authentication Middleware - ByteBot Agent Service
 * Validates JWT tokens and enforces authentication for protected routes
 *
 * Features:
 * - JWT token validation with proper TypeScript typing
 * - Request authentication state management
 * - Comprehensive error handling and logging
 * - Type-safe user context injection
 * - Security headers validation
 *
 * @author ByteBot Development Team
 * @version 1.0.0
 * @since Authentication System Implementation
 */

import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * User role enumeration for type safety
 */
export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  USER = 'user',
  GUEST = 'guest',
}

/**
 * JWT payload interface with strict typing
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  username: string;
  role: UserRole;
  iat: number; // Issued at
  exp: number; // Expiration
  jti?: string; // JWT ID for tracking
}

/**
 * Authenticated user interface
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
}

/**
 * Extended request interface with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  authenticationState?: {
    isAuthenticated: boolean;
    authToken?: string;
    authError?: string;
  };
}

/**
 * Authentication configuration interface
 */
interface AuthConfig {
  jwtSecret: string;
  jwtExpiration: string;
  skipRoutes: string[];
  requireAuth: boolean;
}

/**
 * Authentication middleware for ByteBot Agent
 * Handles JWT token validation and user context injection
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);
  private readonly authConfig: AuthConfig;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Initialize authentication configuration with proper typing
    this.authConfig = {
      jwtSecret: this.configService.get<string>('JWT_SECRET', 'default-secret'),
      jwtExpiration: this.configService.get<string>('JWT_EXPIRATION', '24h'),
      skipRoutes: this.configService.get<string[]>('AUTH_SKIP_ROUTES', [
        '/health',
        '/metrics',
        '/public',
      ]),
      requireAuth: this.configService.get<boolean>('REQUIRE_AUTH', true),
    };

    this.logger.log('Authentication middleware initialized', {
      requireAuth: this.authConfig.requireAuth,
      skipRoutes: this.authConfig.skipRoutes.length,
    });
  }

  /**
   * Middleware implementation with comprehensive authentication handling
   *
   * @param req - Enhanced request object with authentication context
   * @param res - HTTP response object
   * @param next - Next function in middleware chain
   */
  async use(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const operationId = `auth-middleware-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const startTime = Date.now();

    // Initialize request authentication state
    req.authenticationState = {
      isAuthenticated: false,
      authToken: undefined,
      authError: undefined,
    };
    req.user = undefined;

    try {
      // Check if route should skip authentication
      if (this.shouldSkipAuthentication(req.path)) {
        this.logger.debug(
          `[${operationId}] Skipping authentication for route: ${req.path}`,
        );
        return next();
      }

      // Perform authentication validation
      const authResult = await this.validateAuthentication(req, operationId);

      if (authResult.success && authResult.user) {
        // Set authenticated user context
        req.user = authResult.user;
        req.authenticationState = {
          isAuthenticated: true,
          authToken: authResult.token,
          authError: undefined,
        };

        this.logger.debug(`[${operationId}] Authentication successful`, {
          operationId,
          userId: authResult.user.id,
          username: authResult.user.username,
          role: authResult.user.role,
          path: req.path,
          method: req.method,
          authTimeMs: Date.now() - startTime,
        });

        // Set security headers for authenticated requests
        this.setSecurityHeaders(res, authResult.user);
      } else {
        // Authentication failed
        req.authenticationState = {
          isAuthenticated: false,
          authToken: undefined,
          authError: authResult.error || 'Authentication failed',
        };

        if (this.authConfig.requireAuth) {
          this.logger.warn(
            `[${operationId}] Authentication required but failed`,
            {
              operationId,
              path: req.path,
              method: req.method,
              _error: authResult.error,
              authTimeMs: Date.now() - startTime,
              clientIp: this.getClientIp(req),
              userAgent: req.get('User-Agent')?.substring(0, 100),
            },
          );

          throw new UnauthorizedException(
            authResult.error || 'Authentication required',
          );
        }
      }

      next();
    } catch (error) {
      const authTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`[${operationId}] Authentication middleware error`, {
        operationId,
        _error: errorMessage,
        path: req.path,
        method: req.method,
        authTimeMs: authTime,
        clientIp: this.getClientIp(req),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Set error context for downstream handlers
      if (!req.authenticationState) {
        req.authenticationState = {
          isAuthenticated: false,
          authToken: undefined,
          authError: errorMessage,
        };
      } else {
        req.authenticationState.authError = errorMessage;
      }

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Authentication middleware error');
    }
  }

  /**
   * Validate authentication token and extract user information
   *
   * @param req - Request object with authentication headers
   * @param operationId - Operation tracking identifier
   * @returns Promise<AuthResult> - Authentication result with user data
   */
  private async validateAuthentication(
    req: AuthenticatedRequest,
    operationId: string,
  ): Promise<AuthResult> {
    try {
      // Extract JWT token from authorization header
      const token = this.extractTokenFromHeader(req);
      if (!token) {
        return {
          success: false,
          _error: 'No authentication token provided',
        };
      }

      // Verify and decode JWT token
      const payload = await this.verifyJwtToken(token, operationId);
      if (!payload) {
        return {
          success: false,
          _error: 'Invalid authentication token',
        };
      }

      // Create authenticated user object from JWT payload
      const user = this.createUserFromPayload(payload);

      // Perform additional user validation
      const validationResult = this.validateUser(user, operationId);
      if (!validationResult.isValid) {
        return {
          success: false,
          _error: validationResult.error || 'User validation failed',
        };
      }

      return {
        success: true,
        user,
        token,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `[${operationId}] Token validation failed: ${errorMessage}`,
      );

      return {
        success: false,
        _error: this.getUserFriendlyErrorMessage(errorMessage),
      };
    }
  }

  /**
   * Extract JWT token from Authorization header
   *
   * @param req - Request object
   * @returns string | null - Extracted token or null if not found
   */
  private extractTokenFromHeader(req: Request): string | null {
    const authHeader = req.get('Authorization');
    if (!authHeader) {
      return null;
    }

    // Validate Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    return token && token.length > 0 ? token : null;
  }

  /**
   * Verify JWT token and decode payload with proper error handling
   *
   * @param token - JWT token string
   * @param operationId - Operation tracking identifier
   * @returns Promise<JwtPayload | null> - Decoded payload or null if invalid
   */
  private async verifyJwtToken(
    token: string,
    operationId: string,
  ): Promise<JwtPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.authConfig.jwtSecret,
      });

      // Validate required payload fields
      if (
        !payload.sub ||
        !payload.email ||
        !payload.username ||
        !payload.role
      ) {
        this.logger.warn(
          `[${operationId}] JWT payload missing required fields`,
          {
            operationId,
            hasSubject: !!payload.sub,
            hasEmail: !!payload.email,
            hasUsername: !!payload.username,
            hasRole: !!payload.role,
          },
        );
        return null;
      }

      return payload;
    } catch (error) {
      this.logger.debug(
        `[${operationId}] JWT verification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Create authenticated user object from JWT payload
   *
   * @param payload - Decoded JWT payload
   * @returns AuthenticatedUser - User object with proper typing
   */
  private createUserFromPayload(payload: JwtPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
      isActive: true, // Assumed active if token is valid
    };
  }

  /**
   * Validate authenticated user with business logic checks
   *
   * @param user - Authenticated user object
   * @param operationId - Operation tracking identifier
   * @returns UserValidationResult - Validation result
   */
  private validateUser(
    user: AuthenticatedUser,
    operationId: string,
  ): UserValidationResult {
    // Check if user account is active
    if (!user.isActive) {
      this.logger.warn(`[${operationId}] Inactive user attempted access`, {
        operationId,
        userId: user.id,
        username: user.username,
      });
      return {
        isValid: false,
        _error: 'User account is not active',
      };
    }

    // Validate user role
    if (!this.isValidUserRole(user.role)) {
      this.logger.warn(`[${operationId}] Invalid user role`, {
        operationId,
        userId: user.id,
        username: user.username,
        role: user.role,
      });
      return {
        isValid: false,
        _error: 'Invalid user role',
      };
    }

    // Additional validation logic can be added here:
    // - Account lockout checks
    // - Session limits
    // - Geographic restrictions
    // - Time-based access controls

    return {
      isValid: true,
    };
  }

  /**
   * Check if route should skip authentication
   *
   * @param path - Request path
   * @returns boolean - Whether to skip authentication
   */
  private shouldSkipAuthentication(path: string): boolean {
    return this.authConfig.skipRoutes.some((skipRoute) =>
      path.startsWith(skipRoute),
    );
  }

  /**
   * Validate user role enum value
   *
   * @param role - User role value
   * @returns boolean - Whether role is valid
   */
  private isValidUserRole(role: UserRole): boolean {
    return Object.values(UserRole).includes(role);
  }

  /**
   * Extract client IP address from request headers
   *
   * @param req - Request object
   * @returns string - Client IP address
   */
  private getClientIp(req: Request): string {
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
      return forwarded.split(',')[0]?.trim() ?? 'unknown';
    }

    return req.get('X-Real-IP') ?? req.socket?.remoteAddress ?? 'unknown';
  }

  /**
   * Set security headers for authenticated requests
   *
   * @param res - Response object
   * @param user - Authenticated user
   */
  private setSecurityHeaders(res: Response, user: AuthenticatedUser): void {
    res.set({
      'X-Authenticated': 'true',
      'X-User-Role': user.role,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    });
  }

  /**
   * Convert technical error messages to user-friendly messages
   *
   * @param error - Technical error message
   * @returns string - User-friendly error message
   */
  private getUserFriendlyErrorMessage(_error: string): string {
    if (error.includes('jwt expired')) {
      return 'Authentication token has expired';
    }

    if (error.includes('invalid token') || error.includes('jwt malformed')) {
      return 'Invalid authentication token';
    }

    if (error.includes('jwt not active')) {
      return 'Authentication token is not yet active';
    }

    return 'Authentication failed';
  }
}

/**
 * Authentication result interface
 */
interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  token?: string;
  error?: string;
}

/**
 * User validation result interface
 */
interface UserValidationResult {
  isValid: boolean;
  error?: string;
}
