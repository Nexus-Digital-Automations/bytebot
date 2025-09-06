/**
 * Authentication Service - Core JWT-based authentication and user management
 * Implements secure user authentication, password hashing, and JWT token management
 *
 * Features:
 * - JWT token generation and validation (access + refresh tokens)
 * - Secure password hashing with bcryptjs and salt rounds
 * - User registration with comprehensive validation
 * - Session management with automatic cleanup
 * - Comprehensive security logging and monitoring
 * - Password strength validation and change functionality
 *
 * @author Security Implementation Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import {
  JwtPayload,
  RefreshTokenPayload,
  TokenPair,
} from './types/jwt-payload.interface';
import { LoginDto, RegisterDto, ChangePasswordDto } from './dto/login.dto';
import { User, UserSession, UserRole } from '@prisma/client';
import { AppConfig } from '../config/configuration';

/**
 * Authentication service implementing enterprise-grade security features
 * Handles user authentication, registration, and JWT token management
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12; // High security salt rounds for bcrypt

  constructor(
    private readonly configService: ConfigService<AppConfig>,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
  ) {
    const operationId = `auth-service-init-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Authentication Service initializing...`, {
      operationId,
      saltRounds: this.SALT_ROUNDS,
    });

    const initTime = Date.now() - startTime;
    this.logger.log(`[${operationId}] Authentication Service initialized`, {
      operationId,
      initTimeMs: initTime,
    });
  }

  /**
   * Authenticate user with email and password
   * Validates credentials and returns JWT tokens
   *
   * @param loginDto - User login credentials
   * @param ipAddress - Client IP address for session tracking
   * @param userAgent - Client user agent for session tracking
   * @returns Promise<TokenPair> - JWT access and refresh tokens
   * @throws UnauthorizedException - When credentials are invalid
   */
  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const operationId = `auth-login-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] User login attempt`, {
      operationId,
      email: loginDto.email,
      ipAddress,
      userAgent: userAgent?.substring(0, 100), // Truncate for logging
      rememberMe: loginDto.rememberMe,
    });

    try {
      // Find user by email
      const user = await this.prismaService.user.findUnique({
        where: { email: loginDto.email },
        include: { permissions: true },
      });

      if (!user) {
        this.logger.warn(`[${operationId}] Login failed - user not found`, {
          operationId,
          email: loginDto.email,
          ipAddress,
        });
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user account is active
      if (!user.isActive) {
        this.logger.warn(`[${operationId}] Login failed - account inactive`, {
          operationId,
          userId: user.id,
          email: user.email,
          ipAddress,
        });
        throw new UnauthorizedException('Account is inactive');
      }

      // Verify password
      const passwordValid = await bcrypt.compare(
        loginDto.password,
        user.passwordHash,
      );

      if (!passwordValid) {
        this.logger.warn(`[${operationId}] Login failed - invalid password`, {
          operationId,
          userId: user.id,
          email: user.email,
          ipAddress,
        });
        throw new UnauthorizedException('Invalid credentials');
      }

      // Generate JWT tokens
      const tokens = await this.generateTokenPair(user, loginDto.rememberMe);

      // Create user session record
      await this.createUserSession(
        user.id,
        tokens.refreshToken,
        loginDto.rememberMe,
        ipAddress,
        userAgent,
      );

      // Update last login timestamp
      await this.prismaService.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const loginTime = Date.now() - startTime;
      this.logger.log(`[${operationId}] User login successful`, {
        operationId,
        userId: user.id,
        email: user.email,
        role: user.role,
        loginTimeMs: loginTime,
        rememberMe: loginDto.rememberMe,
        ipAddress,
      });

      return tokens;
    } catch (error) {
      const loginTime = Date.now() - startTime;

      if (error instanceof UnauthorizedException) {
        // Re-throw authorization errors without modification
        throw error;
      }

      // Log unexpected errors
      this.logger.error(`[${operationId}] Login failed with unexpected error`, {
        operationId,
        email: loginDto.email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        loginTimeMs: loginTime,
        ipAddress,
      });

      throw new UnauthorizedException('Login failed');
    }
  }

  /**
   * Register new user with comprehensive validation
   * Creates user account with secure password hashing
   *
   * @param registerDto - New user registration data
   * @returns Promise<User> - Created user object (without password hash)
   * @throws ConflictException - When email or username already exists
   * @throws BadRequestException - When passwords don't match
   */
  async register(
    registerDto: RegisterDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    const operationId = `auth-register-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] User registration attempt`, {
      operationId,
      email: registerDto.email,
      username: registerDto.username,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
    });

    try {
      // Validate password confirmation
      if (registerDto.password !== registerDto.confirmPassword) {
        this.logger.warn(
          `[${operationId}] Registration failed - password mismatch`,
          {
            operationId,
            email: registerDto.email,
            username: registerDto.username,
          },
        );
        throw new BadRequestException('Passwords do not match');
      }

      // Check if email already exists
      const existingEmailUser = await this.prismaService.user.findUnique({
        where: { email: registerDto.email },
      });

      if (existingEmailUser) {
        this.logger.warn(
          `[${operationId}] Registration failed - email exists`,
          {
            operationId,
            email: registerDto.email,
            username: registerDto.username,
          },
        );
        throw new ConflictException('Email address is already registered');
      }

      // Check if username already exists
      const existingUsernameUser = await this.prismaService.user.findUnique({
        where: { username: registerDto.username },
      });

      if (existingUsernameUser) {
        this.logger.warn(
          `[${operationId}] Registration failed - username exists`,
          {
            operationId,
            email: registerDto.email,
            username: registerDto.username,
          },
        );
        throw new ConflictException('Username is already taken');
      }

      // Hash password with high security salt rounds
      const hashStartTime = Date.now();
      const passwordHash = await bcrypt.hash(
        registerDto.password,
        this.SALT_ROUNDS,
      );
      const hashTime = Date.now() - hashStartTime;

      // Create new user
      const user = await this.prismaService.user.create({
        data: {
          email: registerDto.email,
          username: registerDto.username,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          passwordHash,
          role: UserRole.VIEWER, // Default role for new users
          isActive: true,
          emailVerified: false, // Email verification required
        },
      });

      const registrationTime = Date.now() - startTime;
      this.logger.log(`[${operationId}] User registration successful`, {
        operationId,
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        registrationTimeMs: registrationTime,
        passwordHashTimeMs: hashTime,
      });

      // Return user without password hash
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      const registrationTime = Date.now() - startTime;

      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        // Re-throw validation errors without modification
        throw error;
      }

      // Log unexpected errors
      this.logger.error(
        `[${operationId}] Registration failed with unexpected error`,
        {
          operationId,
          email: registerDto.email,
          username: registerDto.username,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          registrationTimeMs: registrationTime,
        },
      );

      throw new BadRequestException('Registration failed');
    }
  }

  /**
   * Refresh JWT tokens using valid refresh token
   * Validates refresh token and generates new access token
   *
   * @param refreshToken - Valid JWT refresh token
   * @returns Promise<TokenPair> - New JWT access and refresh tokens
   * @throws UnauthorizedException - When refresh token is invalid
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const operationId = `auth-refresh-${Date.now()}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Token refresh attempt`, {
      operationId,
    });

    try {
      // Verify refresh token
      const payload =
        await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken);

      // Validate token type
      if (payload.type !== 'refresh') {
        this.logger.warn(`[${operationId}] Invalid token type for refresh`, {
          operationId,
          tokenType: payload.type,
        });
        throw new UnauthorizedException('Invalid token type');
      }

      // Find and validate user session
      const session = await this.prismaService.userSession.findUnique({
        where: { refreshToken },
        include: { user: true },
      });

      if (!session || session.isRevoked || session.expiresAt < new Date()) {
        this.logger.warn(
          `[${operationId}] Invalid or expired refresh session`,
          {
            operationId,
            sessionFound: !!session,
            isRevoked: session?.isRevoked,
            isExpired: session?.expiresAt
              ? session.expiresAt < new Date()
              : false,
          },
        );
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if user is still active
      if (!session.user.isActive) {
        this.logger.warn(
          `[${operationId}] User account inactive during refresh`,
          {
            operationId,
            userId: session.user.id,
          },
        );
        throw new UnauthorizedException('Account is inactive');
      }

      // Generate new token pair
      const tokens = await this.generateTokenPair(session.user, false);

      // Update session with new refresh token
      await this.prismaService.userSession.update({
        where: { id: session.id },
        data: {
          refreshToken: tokens.refreshToken,
          updatedAt: new Date(),
        },
      });

      const refreshTime = Date.now() - startTime;
      this.logger.log(`[${operationId}] Token refresh successful`, {
        operationId,
        userId: session.user.id,
        sessionId: session.id,
        refreshTimeMs: refreshTime,
      });

      return tokens;
    } catch (error) {
      const refreshTime = Date.now() - startTime;

      if (error instanceof UnauthorizedException) {
        // Re-throw authorization errors without modification
        throw error;
      }

      // Log unexpected errors
      this.logger.error(
        `[${operationId}] Token refresh failed with unexpected error`,
        {
          operationId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          refreshTimeMs: refreshTime,
        },
      );

      throw new UnauthorizedException('Token refresh failed');
    }
  }

  /**
   * Logout user by revoking refresh token session
   * Invalidates user session and refresh token
   *
   * @param refreshToken - User's refresh token to revoke
   * @returns Promise<void>
   */
  async logout(refreshToken: string): Promise<void> {
    const operationId = `auth-logout-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] User logout attempt`, {
      operationId,
    });

    try {
      // Find and revoke session
      const session = await this.prismaService.userSession.findUnique({
        where: { refreshToken },
      });

      if (session) {
        await this.prismaService.userSession.update({
          where: { id: session.id },
          data: {
            isRevoked: true,
            updatedAt: new Date(),
          },
        });

        const logoutTime = Date.now() - startTime;
        this.logger.log(`[${operationId}] User logout successful`, {
          operationId,
          sessionId: session.id,
          userId: session.userId,
          logoutTimeMs: logoutTime,
        });
      } else {
        this.logger.warn(
          `[${operationId}] Logout attempted with invalid token`,
          {
            operationId,
          },
        );
      }
    } catch (error) {
      const logoutTime = Date.now() - startTime;

      this.logger.error(
        `[${operationId}] Logout failed with unexpected error`,
        {
          operationId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          logoutTimeMs: logoutTime,
        },
      );

      // Don't throw error for logout - just log it
    }
  }

  /**
   * Change user password with current password verification
   * Validates current password and updates to new password
   *
   * @param userId - User ID requesting password change
   * @param changePasswordDto - Password change data
   * @returns Promise<void>
   * @throws UnauthorizedException - When current password is invalid
   * @throws BadRequestException - When new passwords don't match
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const operationId = `auth-change-password-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Password change attempt`, {
      operationId,
      userId,
    });

    try {
      // Validate new password confirmation
      if (
        changePasswordDto.newPassword !== changePasswordDto.confirmNewPassword
      ) {
        this.logger.warn(
          `[${operationId}] Password change failed - password mismatch`,
          {
            operationId,
            userId,
          },
        );
        throw new BadRequestException('New passwords do not match');
      }

      // Find user
      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        this.logger.warn(
          `[${operationId}] Password change failed - user not found`,
          {
            operationId,
            userId,
          },
        );
        throw new NotFoundException('User not found');
      }

      // Verify current password
      const currentPasswordValid = await bcrypt.compare(
        changePasswordDto.currentPassword,
        user.passwordHash,
      );

      if (!currentPasswordValid) {
        this.logger.warn(
          `[${operationId}] Password change failed - invalid current password`,
          {
            operationId,
            userId,
          },
        );
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Hash new password
      const hashStartTime = Date.now();
      const newPasswordHash = await bcrypt.hash(
        changePasswordDto.newPassword,
        this.SALT_ROUNDS,
      );
      const hashTime = Date.now() - hashStartTime;

      // Update user password
      await this.prismaService.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        },
      });

      // Revoke all existing user sessions for security
      await this.prismaService.userSession.updateMany({
        where: { userId },
        data: {
          isRevoked: true,
          updatedAt: new Date(),
        },
      });

      const changeTime = Date.now() - startTime;
      this.logger.log(`[${operationId}] Password change successful`, {
        operationId,
        userId,
        changeTimeMs: changeTime,
        passwordHashTimeMs: hashTime,
        sessionsRevoked: true,
      });
    } catch (error) {
      const changeTime = Date.now() - startTime;

      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        // Re-throw validation errors without modification
        throw error;
      }

      // Log unexpected errors
      this.logger.error(
        `[${operationId}] Password change failed with unexpected error`,
        {
          operationId,
          userId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          changeTimeMs: changeTime,
        },
      );

      throw new BadRequestException('Password change failed');
    }
  }

  /**
   * Generate JWT token pair (access + refresh tokens)
   * Creates secure tokens with appropriate expiration times
   *
   * @param user - User object for token payload
   * @param rememberMe - Extend token lifetime flag
   * @returns Promise<TokenPair> - Generated JWT token pair
   * @private
   */
  private async generateTokenPair(
    user: User,
    rememberMe = false,
  ): Promise<TokenPair> {
    const operationId = `jwt-generate-${Date.now()}`;
    const startTime = Date.now();

    const securityConfig = this.configService.get('security', { infer: true });
    if (!securityConfig) {
      throw new Error('Security configuration not found');
    }

    const sessionId = randomBytes(16).toString('hex');

    // Create access token payload
    const accessPayload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      type: 'access',
      sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
      aud: 'bytebot-api',
      iss: 'bytebot-auth-service',
    };

    // Create refresh token payload with extended expiration if rememberMe
    const refreshExpirationTime = rememberMe
      ? 30 * 24 * 60 * 60 // 30 days
      : 7 * 24 * 60 * 60; // 7 days

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      sessionId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + refreshExpirationTime,
    };

    // Generate tokens
    const accessToken = await this.jwtService.signAsync(accessPayload, {
      expiresIn: securityConfig.jwtExpiresIn,
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      expiresIn: rememberMe ? '30d' : securityConfig.jwtRefreshExpiresIn,
    });

    const generateTime = Date.now() - startTime;
    this.logger.debug(`[${operationId}] JWT token pair generated`, {
      operationId,
      userId: user.id,
      sessionId,
      rememberMe,
      generateTimeMs: generateTime,
      accessTokenExpiry: accessPayload.exp,
      refreshTokenExpiry: refreshPayload.exp,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  /**
   * Create user session record for refresh token tracking
   * Stores session information for token management and security
   *
   * @param userId - User ID for the session
   * @param refreshToken - Generated refresh token
   * @param rememberMe - Extended session flag
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   * @returns Promise<UserSession> - Created session record
   * @private
   */
  private async createUserSession(
    userId: string,
    refreshToken: string,
    rememberMe = false,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserSession> {
    const operationId = `session-create-${Date.now()}`;

    // Calculate expiration time
    const expirationTime = rememberMe
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await this.prismaService.userSession.create({
      data: {
        userId,
        refreshToken,
        expiresAt: expirationTime,
        ipAddress,
        userAgent: userAgent?.substring(0, 500), // Truncate for database storage
      },
    });

    this.logger.debug(`[${operationId}] User session created`, {
      operationId,
      sessionId: session.id,
      userId,
      expiresAt: session.expiresAt,
      rememberMe,
      hasIpAddress: !!ipAddress,
      hasUserAgent: !!userAgent,
    });

    return session;
  }
}
