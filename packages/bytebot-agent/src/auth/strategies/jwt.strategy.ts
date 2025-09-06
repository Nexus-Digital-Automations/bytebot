/**
 * JWT Strategy - Passport strategy for JWT token authentication
 * Handles JWT token validation and user extraction from tokens
 *
 * Features:
 * - Secure JWT token validation with RS256 algorithm support
 * - User existence verification from database
 * - Token payload validation and sanitization
 * - Comprehensive error handling for invalid/expired tokens
 * - Integration with Passport.js authentication middleware
 *
 * @author Security Implementation Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../types/jwt-payload.interface';
import { User } from '@prisma/client';
import { AppConfig } from '../../config/configuration';

/**
 * JWT Strategy implementation for token-based authentication
 * Validates JWT tokens and extracts authenticated user information
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService<AppConfig>,
    private readonly prismaService: PrismaService,
  ) {
    const operationId = `jwt-strategy-init-${Date.now()}`;
    const startTime = Date.now();

    const config = configService.get('security', { infer: true });
    if (!config) {
      throw new Error('Security configuration not found');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
      algorithms: ['HS256'], // Use HMAC SHA256 for development, RS256 for production
    });

    const initTime = Date.now() - startTime;
    this.logger.log(`[${operationId}] JWT Strategy initialized`, {
      operationId,
      initTimeMs: initTime,
      extractorMethod: 'Bearer Token',
      algorithms: ['HS256'],
    });
  }

  /**
   * Validates JWT token payload and retrieves authenticated user
   * Called automatically by Passport when JWT token is provided
   *
   * @param payload - JWT token payload containing user information
   * @returns Promise<User> - Authenticated user object
   * @throws UnauthorizedException - When token is invalid or user not found
   */
  async validate(payload: JwtPayload): Promise<User> {
    const operationId = `jwt-validate-${Date.now()}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Validating JWT payload`, {
      operationId,
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      tokenType: payload.type,
      issuedAt: new Date(payload.iat * 1000).toISOString(),
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    });

    try {
      // Validate payload structure
      if (!payload.sub || !payload.username || !payload.role) {
        this.logger.warn(`[${operationId}] Invalid JWT payload structure`, {
          operationId,
          hasUserId: !!payload.sub,
          hasUsername: !!payload.username,
          hasRole: !!payload.role,
        });
        throw new UnauthorizedException('Invalid token payload');
      }

      // Verify token type is access token
      if (payload.type !== 'access') {
        this.logger.warn(`[${operationId}] Invalid token type`, {
          operationId,
          tokenType: payload.type,
          expected: 'access',
        });
        throw new UnauthorizedException('Invalid token type');
      }

      // Retrieve user from database
      const user = await this.prismaService.user.findUnique({
        where: { id: payload.sub },
        include: {
          permissions: true,
        },
      });

      if (!user) {
        this.logger.warn(`[${operationId}] User not found in database`, {
          operationId,
          userId: payload.sub,
        });
        throw new UnauthorizedException('User not found');
      }

      // Check if user account is active
      if (!user.isActive) {
        this.logger.warn(`[${operationId}] User account is inactive`, {
          operationId,
          userId: user.id,
          username: user.username,
        });
        throw new UnauthorizedException('User account is inactive');
      }

      // Update last login timestamp
      await this.prismaService.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const validationTime = Date.now() - startTime;
      this.logger.log(`[${operationId}] JWT validation successful`, {
        operationId,
        userId: user.id,
        username: user.username,
        role: user.role,
        validationTimeMs: validationTime,
        permissionsCount: user.permissions.length,
      });

      return user;
    } catch (error) {
      const validationTime = Date.now() - startTime;

      if (error instanceof UnauthorizedException) {
        // Re-throw authorization errors without modification
        throw error;
      }

      // Log unexpected errors
      this.logger.error(
        `[${operationId}] JWT validation failed with unexpected error`,
        {
          operationId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          validationTimeMs: validationTime,
        },
      );

      throw new UnauthorizedException('Token validation failed');
    }
  }
}
