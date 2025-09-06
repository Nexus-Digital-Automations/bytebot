/**
 * JWT Strategy - ByteBotd JWT Token Validation
 * Implements Passport JWT strategy for computer control authentication
 *
 * Features:
 * - JWT token validation with shared secret
 * - User payload extraction and validation
 * - Integration with shared security types
 * - Computer control specific security context
 *
 * @author Security Implementation Specialist
 * @version 1.0.0
 * @since ByteBotd Authentication Hardening
 */

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '@bytebot/shared';
import { ByteBotdUser } from '../guards/jwt-auth.guard';

/**
 * JWT payload interface for ByteBotd authentication
 */
interface JwtPayload {
  sub: string; // User ID
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  iat: number; // Issued at
  exp: number; // Expires at
}

/**
 * JWT Strategy for ByteBotd computer control authentication
 * Validates JWT tokens and extracts user information
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'bytebot-default-secret-change-in-production',
      algorithms: ['HS256'],
    });
  }

  /**
   * Validate JWT payload and extract user information
   * Called by Passport JWT strategy after token validation
   *
   * @param payload - Validated JWT payload
   * @returns Promise<ByteBotdUser> - User object for request context
   * @throws UnauthorizedException - When user is invalid or inactive
   */
  async validate(payload: JwtPayload): Promise<ByteBotdUser> {
    const operationId = `bytebotd-jwt-validate-${Date.now()}`;
    
    this.logger.debug(`[${operationId}] JWT payload validation for computer control`, {
      operationId,
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      isActive: payload.isActive,
      tokenIssuedAt: new Date(payload.iat * 1000),
      tokenExpiresAt: new Date(payload.exp * 1000),
      securityEvent: 'computer_control_jwt_validation',
    });

    // Validate required payload fields
    if (!payload.sub || !payload.email || !payload.username || !payload.role) {
      this.logger.warn(`[${operationId}] Invalid JWT payload - missing required fields`, {
        operationId,
        userId: payload.sub,
        hasEmail: !!payload.email,
        hasUsername: !!payload.username,
        hasRole: !!payload.role,
        securityEvent: 'computer_control_invalid_jwt_payload',
      });
      throw new UnauthorizedException('Invalid token payload');
    }

    // Check if user is active
    if (!payload.isActive) {
      this.logger.warn(`[${operationId}] Inactive user attempting computer control access`, {
        operationId,
        userId: payload.sub,
        username: payload.username,
        role: payload.role,
        securityEvent: 'computer_control_inactive_user_access',
        riskScore: 75,
      });
      throw new UnauthorizedException('Account is inactive');
    }

    // Create user object for request context
    const user: ByteBotdUser = {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role,
      isActive: payload.isActive,
    };

    this.logger.debug(`[${operationId}] JWT validation successful for computer control`, {
      operationId,
      userId: user.id,
      username: user.username,
      role: user.role,
      securityEvent: 'computer_control_jwt_validated',
    });

    return user;
  }
}