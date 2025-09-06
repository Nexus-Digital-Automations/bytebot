/**
 * Authentication Controller - HTTP endpoints for user authentication and authorization
 * Implements secure REST API endpoints for authentication operations
 *
 * Features:
 * - User login with JWT token generation
 * - User registration with comprehensive validation
 * - JWT token refresh functionality
 * - Secure logout with session invalidation
 * - Password change with current password verification
 * - Comprehensive request/response logging
 * - OpenAPI/Swagger documentation
 *
 * @author Security Implementation Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Logger,
  ValidationPipe,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RateLimitGuard, RateLimit } from '../common/guards/rate-limit.guard';
import { RateLimitPreset } from '@bytebot/shared';
import { AuthService } from './auth.service';
import { JwtAuthGuard, AuthenticatedRequest } from './guards/jwt-auth.guard';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
} from './dto/login.dto';
import { TokenPair } from './types/jwt-payload.interface';
import { Public, CurrentUser } from './decorators/roles.decorator';
import { User } from '@prisma/client';

/**
 * Authentication Controller
 * Handles all authentication-related HTTP endpoints
 */
@ApiTags('Authentication')
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * User login endpoint
   * Authenticates user credentials and returns JWT tokens
   *
   * @param loginDto - User login credentials
   * @param request - HTTP request object for IP/User-Agent extraction
   * @returns Promise<TokenPair> - JWT access and refresh tokens
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RateLimitPreset.AUTH) // Strict rate limiting for authentication
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user credentials and return JWT tokens',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful, JWT tokens returned',
    type: 'object',
    schema: {
      properties: {
        accessToken: { type: 'string', description: 'JWT access token' },
        refreshToken: { type: 'string', description: 'JWT refresh token' },
        tokenType: { type: 'string', example: 'Bearer' },
        expiresIn: {
          type: 'number',
          description: 'Token expiration in seconds',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or inactive account',
    schema: {
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid credentials' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
    @Request() request: AuthenticatedRequest,
  ): Promise<TokenPair> {
    const operationId = `auth-login-controller-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Login request received`, {
      operationId,
      email: loginDto.email,
      rememberMe: loginDto.rememberMe,
      ipAddress: this.getClientIpAddress(request),
      userAgent: request.headers['user-agent']?.substring(0, 100),
    });

    try {
      const tokens = await this.authService.login(
        loginDto,
        this.getClientIpAddress(request),
        request.headers['user-agent'],
      );

      const loginTime = Date.now() - startTime;
      this.logger.log(`[${operationId}] Login successful`, {
        operationId,
        email: loginDto.email,
        loginTimeMs: loginTime,
        ipAddress: this.getClientIpAddress(request),
      });

      return tokens;
    } catch (error) {
      const loginTime = Date.now() - startTime;
      this.logger.warn(`[${operationId}] Login failed`, {
        operationId,
        email: loginDto.email,
        error: error instanceof Error ? error.message : String(error),
        loginTimeMs: loginTime,
        ipAddress: this.getClientIpAddress(request),
      });

      throw error;
    }
  }

  /**
   * User registration endpoint
   * Creates new user account with secure password hashing
   *
   * @param registerDto - New user registration data
   * @returns Promise<object> - Success message with user info (no password)
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit(RateLimitPreset.AUTH) // Strict rate limiting for registration
  @ApiOperation({
    summary: 'User registration',
    description: 'Create new user account with secure password hashing',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'User registered successfully' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            username: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string' },
            isActive: { type: 'boolean' },
            emailVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or passwords do not match',
  })
  @ApiResponse({
    status: 409,
    description: 'Email or username already exists',
  })
  async register(
    @Body(ValidationPipe) registerDto: RegisterDto,
  ): Promise<{ message: string; user: Omit<User, 'passwordHash'> }> {
    const operationId = `auth-register-controller-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Registration request received`, {
      operationId,
      email: registerDto.email,
      username: registerDto.username,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
    });

    try {
      const user = await this.authService.register(registerDto);

      const registrationTime = Date.now() - startTime;
      this.logger.log(`[${operationId}] Registration successful`, {
        operationId,
        userId: user.id,
        email: user.email,
        username: user.username,
        registrationTimeMs: registrationTime,
      });

      return {
        message: 'User registered successfully',
        user,
      };
    } catch (error) {
      const registrationTime = Date.now() - startTime;
      this.logger.warn(`[${operationId}] Registration failed`, {
        operationId,
        email: registerDto.email,
        username: registerDto.username,
        error: error instanceof Error ? error.message : String(error),
        registrationTimeMs: registrationTime,
      });

      throw error;
    }
  }

  /**
   * Token refresh endpoint
   * Generates new access token using valid refresh token
   *
   * @param refreshTokenDto - Refresh token data
   * @returns Promise<TokenPair> - New JWT access and refresh tokens
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RateLimitPreset.AUTH) // Rate limiting for token refresh
  @ApiOperation({
    summary: 'Refresh JWT tokens',
    description: 'Generate new access token using valid refresh token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    type: 'object',
    schema: {
      properties: {
        accessToken: { type: 'string', description: 'New JWT access token' },
        refreshToken: { type: 'string', description: 'New JWT refresh token' },
        tokenType: { type: 'string', example: 'Bearer' },
        expiresIn: {
          type: 'number',
          description: 'Token expiration in seconds',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refresh(
    @Body(ValidationPipe) refreshTokenDto: RefreshTokenDto,
  ): Promise<TokenPair> {
    const operationId = `auth-refresh-controller-${Date.now()}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Token refresh request received`, {
      operationId,
    });

    try {
      const tokens = await this.authService.refreshTokens(
        refreshTokenDto.refreshToken,
      );

      const refreshTime = Date.now() - startTime;
      this.logger.log(`[${operationId}] Token refresh successful`, {
        operationId,
        refreshTimeMs: refreshTime,
      });

      return tokens;
    } catch (error) {
      const refreshTime = Date.now() - startTime;
      this.logger.warn(`[${operationId}] Token refresh failed`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        refreshTimeMs: refreshTime,
      });

      throw error;
    }
  }

  /**
   * User logout endpoint
   * Invalidates refresh token and logs out user
   *
   * @param refreshTokenDto - Refresh token to invalidate
   * @returns Promise<object> - Success message
   */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User logout',
    description: 'Invalidate refresh token and log out user',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      properties: {
        message: { type: 'string', example: 'Logout successful' },
      },
    },
  })
  async logout(
    @Body(ValidationPipe) refreshTokenDto: RefreshTokenDto,
  ): Promise<{ message: string }> {
    const operationId = `auth-logout-controller-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Logout request received`, {
      operationId,
    });

    try {
      await this.authService.logout(refreshTokenDto.refreshToken);

      const logoutTime = Date.now() - startTime;
      this.logger.log(`[${operationId}] Logout successful`, {
        operationId,
        logoutTimeMs: logoutTime,
      });

      return { message: 'Logout successful' };
    } catch (error) {
      const logoutTime = Date.now() - startTime;
      this.logger.warn(
        `[${operationId}] Logout processing completed with issues`,
        {
          operationId,
          error: error instanceof Error ? error.message : String(error),
          logoutTimeMs: logoutTime,
        },
      );

      // Always return success for logout to avoid information disclosure
      return { message: 'Logout successful' };
    }
  }

  /**
   * Change password endpoint
   * Updates user password with current password verification
   *
   * @param changePasswordDto - Password change data
   * @param user - Authenticated user from JWT token
   * @returns Promise<object> - Success message
   */
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change user password',
    description: 'Update user password with current password verification',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      properties: {
        message: { type: 'string', example: 'Password changed successfully' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid current password or authentication required',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or new passwords do not match',
  })
  async changePassword(
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    const operationId = `auth-change-password-controller-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Password change request received`, {
      operationId,
      userId: user.id,
      username: user.username,
    });

    try {
      await this.authService.changePassword(user.id, changePasswordDto);

      const changeTime = Date.now() - startTime;
      this.logger.log(`[${operationId}] Password change successful`, {
        operationId,
        userId: user.id,
        username: user.username,
        changeTimeMs: changeTime,
      });

      return { message: 'Password changed successfully' };
    } catch (error) {
      const changeTime = Date.now() - startTime;
      this.logger.warn(`[${operationId}] Password change failed`, {
        operationId,
        userId: user.id,
        username: user.username,
        error: error instanceof Error ? error.message : String(error),
        changeTimeMs: changeTime,
      });

      throw error;
    }
  }

  /**
   * Get current user profile endpoint
   * Returns authenticated user information
   *
   * @param user - Authenticated user from JWT token
   * @returns Promise<object> - User profile information
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns authenticated user profile information',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        username: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        role: { type: 'string' },
        isActive: { type: 'boolean' },
        emailVerified: { type: 'boolean' },
        lastLoginAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  async getProfile(
    @CurrentUser() user: User,
  ): Promise<Omit<User, 'passwordHash'>> {
    const operationId = `auth-profile-controller-${Date.now()}`;

    this.logger.debug(`[${operationId}] Profile request received`, {
      operationId,
      userId: user.id,
      username: user.username,
    });

    // Remove password hash from response
    const { passwordHash: _, ...userProfile } = user;
    return userProfile;
  }

  /**
   * Extract client IP address from request
   * Handles various proxy configurations and headers
   *
   * @param request - HTTP request object
   * @returns string - Client IP address
   * @private
   */
  private getClientIpAddress(request: AuthenticatedRequest): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}
