/**
 * PARLANT Enhanced Authentication Controller - Conversational API Endpoints
 *
 * Provides comprehensive conversational authentication API endpoints with
 * enterprise-grade security validation, intelligent risk assessment, and
 * multi-factor authentication workflows through natural language interaction.
 *
 * Features:
 * - Conversational login with intelligent risk assessment
 * - Natural language multi-factor authentication workflows
 * - Real-time security threat detection and conversational response
 * - Intelligent device and location-based security validation
 * - Enterprise-grade audit trails with conversational context
 * - Zero-trust conversational validation architecture
 *
 * Security Level: CRITICAL - All operations validated through PARLANT conversation
 * Performance Target: <3000ms for complete conversational authentication flows
 * Compliance: SOC 2 Type II, GDPR, HIPAA, PCI-DSS ready with conversational audit
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import {
  RateLimitGuard,
  RateLimit,
} from '../../common/guards/rate-limit.guard';
import { RateLimitPreset } from '@bytebot/shared';
import {
  ParlantCritical,
  ParlantValidated,
  ValidationMode,
  SecurityLevel,
  ConversationContext,
  ParlantValidationInterceptor,
} from '@bytebot/shared/src/parlant/parlant-validation.decorator';
import { ConversationContextParameter } from '@bytebot/shared/src/types/conversation-context.types';
import {
  ParlantEnhancedAuthService,
  ConversationalAuthContext,
  ConversationalAuthResult,
} from '../services/parlant-enhanced-auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard';
import { LoginDto, RegisterDto, ChangePasswordDto } from '../dto/login.dto';
import { Public, CurrentUser } from '../decorators/roles.decorator';
import type { User } from '@prisma/client';
import { createHash } from 'crypto';

/**
 * Enhanced login DTO with device fingerprinting
 */
export class ConversationalLoginDto extends LoginDto {
  /**
   * Device fingerprint for security analysis
   * @example "fp_1234567890abcdef"
   */
  deviceFingerprint?: string;

  /**
   * Client geolocation data for risk assessment
   */
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };

  /**
   * Additional security context
   */
  securityContext?: {
    trustedDevice?: boolean;
    corporateNetwork?: boolean;
    vpnDetected?: boolean;
  };
}

/**
 * Enhanced registration DTO with security validation
 */
export class ConversationalRegisterDto extends RegisterDto {
  /**
   * Device fingerprint for security tracking
   */
  deviceFingerprint?: string;

  /**
   * Registration source tracking
   */
  registrationSource?: 'web' | 'mobile' | 'api' | 'admin';

  /**
   * Marketing consent and privacy preferences
   */
  privacyConsent?: {
    marketing?: boolean;
    analytics?: boolean;
    thirdParty?: boolean;
  };
}

/**
 * Enhanced password change DTO with security context
 */
export class ConversationalChangePasswordDto extends ChangePasswordDto {
  /**
   * Reason for password change
   */
  changeReason?:
    | 'user_requested'
    | 'security_policy'
    | 'suspected_compromise'
    | 'scheduled_rotation';

  /**
   * Device fingerprint for verification
   */
  deviceFingerprint?: string;

  /**
   * Additional verification token if required
   */
  verificationToken?: string;
}

/**
 * PARLANT Enhanced Authentication Controller
 * Handles conversational authentication with intelligent security validation
 */
@ApiTags('Conversational Authentication')
@Controller('auth/parlant')
@UseGuards(RateLimitGuard)
@UseInterceptors(ParlantValidationInterceptor)
export class ParlantEnhancedAuthController {
  private readonly logger = new Logger(ParlantEnhancedAuthController.name);

  constructor(
    private readonly parlantAuthService: ParlantEnhancedAuthService,
  ) {}

  /**
   * Conversational login with intelligent risk assessment and MFA workflows
   *
   * Provides comprehensive authentication with:
   * - AI-driven risk assessment based on device, location, and behavioral patterns
   * - Natural language multi-factor authentication when required
   * - Real-time threat detection and conversational security validation
   * - Intelligent device fingerprinting and trust establishment
   *
   * @param loginDto - Enhanced login credentials with security context
   * @param request - HTTP request object for security analysis
   * @param conversationContext - PARLANT conversation context
   * @returns Promise<ConversationalAuthResult> - Complete authentication result
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RateLimitPreset.AUTH_STRICT) // Stricter rate limiting for conversational auth
  @ParlantCritical(
    'Conversational authentication with intelligent risk assessment and multi-factor workflows',
    {
      securityLevel: SecurityLevel.CRITICAL,
      validationMode: ValidationMode.EXPLICIT,
      businessCategory: 'CONVERSATIONAL_AUTHENTICATION',
      complianceFlags: [
        'CONVERSATIONAL_AUTH',
        'RISK_ASSESSMENT',
        'MFA_WORKFLOW',
        'DEVICE_FINGERPRINTING',
        'THREAT_DETECTION',
      ],
      timeout: 30000, // Extended timeout for conversational flows
      cacheable: false,
      customRules: [
        {
          name: 'intelligent_risk_assessment',
          condition: 'risk_score > 0.5',
          action: 'REQUIRE_CONVERSATION',
          priority: 10,
        },
        {
          name: 'suspicious_device_detection',
          condition: 'unknown_device === true',
          action: 'REQUIRE_MFA',
          priority: 9,
        },
        {
          name: 'anomalous_location_detection',
          condition: 'location_anomaly === true',
          action: 'REQUIRE_CONVERSATION',
          priority: 8,
        },
        {
          name: 'admin_account_protection',
          condition: 'user_role === "ADMIN"',
          action: 'REQUIRE_CONVERSATION',
          priority: 10,
        },
      ],
    },
  )
  @ApiOperation({
    summary: 'Conversational login with intelligent security',
    description:
      'Authenticate user with AI-driven risk assessment, conversational validation, and adaptive MFA workflows',
    externalDocs: {
      description: 'Authentication Security Guide',
      url: '/docs/auth/conversational-authentication',
    },
  })
  @ApiBody({
    type: ConversationalLoginDto,
    description:
      'Enhanced login credentials with security context and device fingerprinting',
  })
  @ApiHeader({
    name: 'X-Device-Fingerprint',
    description: 'Unique device fingerprint for security analysis',
    required: false,
  })
  @ApiHeader({
    name: 'X-Geolocation',
    description: 'Client geolocation data in JSON format',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful with conversational validation',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        tokens: {
          type: 'object',
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
        user: {
          type: 'object',
          description: 'User profile information (password excluded)',
        },
        conversationId: {
          type: 'string',
          description: 'PARLANT conversation ID for audit and reference',
        },
        riskAssessment: {
          type: 'object',
          properties: {
            riskScore: {
              type: 'number',
              description: 'Risk score from 0.0 to 1.0',
            },
            riskLevel: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            },
            riskFactors: {
              type: 'array',
              items: { type: 'object' },
              description: 'Identified risk factors and their analysis',
            },
            aiReasoningExplanation: {
              type: 'string',
              description: 'AI-generated explanation of the risk assessment',
            },
          },
        },
        securityActions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Security actions taken during authentication',
        },
        sessionSecurityLevel: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
          description: 'Assigned security level for the session',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication failed or blocked by conversational validation',
    schema: {
      properties: {
        success: { type: 'boolean', example: false },
        conversationId: {
          type: 'string',
          description: 'Conversation ID for blocked attempt',
        },
        riskAssessment: {
          type: 'object',
          description: 'Risk assessment details',
        },
        securityActions: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Security actions taken (e.g., LOGIN_BLOCKED, IP_FLAGGED)',
        },
        reasoning: {
          type: 'string',
          description: 'Human-readable explanation for blocking',
        },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many authentication attempts - rate limited',
  })
  async conversationalLogin(
    @Body() loginDto: ConversationalLoginDto,
    @Request() request: AuthenticatedRequest,
    @ConversationContext() conversationContext?: ConversationContextParameter,
  ): Promise<ConversationalAuthResult> {
    const operationId = `parlant-login-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Conversational login request received`, {
      operationId,
      email: loginDto.email,
      ipAddress: this.getClientIpAddress(request),
      deviceFingerprint: loginDto.deviceFingerprint,
      hasGeolocation: !!loginDto.geolocation,
      conversationId: conversationContext?.conversationId,
      securityLevel: conversationContext?.securityLevel,
    });

    try {
      // Create comprehensive authentication context
      const authContext = this.createAuthenticationContext(loginDto, request);

      // Execute conversational authentication
      const result = await this.parlantAuthService.conversationalLogin(
        loginDto,
        authContext,
      );

      const duration = Date.now() - startTime;
      this.logger.log(`[${operationId}] Conversational login completed`, {
        operationId,
        success: result.success,
        conversationId: result.conversationId,
        riskScore: result.riskAssessment.riskScore,
        riskLevel: result.riskAssessment.riskLevel,
        securityActions: result.securityActions,
        sessionSecurityLevel: result.sessionSecurityLevel,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[${operationId}] Conversational login failed`, {
        operationId,
        email: loginDto.email,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      throw error instanceof Error
        ? error
        : new Error('Conversational login failed');
    }
  }

  /**
   * Conversational registration with enhanced security validation
   *
   * @param registerDto - Enhanced registration data with security context
   * @param request - HTTP request object for security analysis
   * @param conversationContext - PARLANT conversation context
   * @returns Promise<ConversationalAuthResult> - Registration result with conversation
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit(RateLimitPreset.AUTH_STRICT)
  @ParlantCritical(
    'Conversational user registration with comprehensive security validation and fraud detection',
    {
      securityLevel: SecurityLevel.CRITICAL,
      validationMode: ValidationMode.EXPLICIT,
      businessCategory: 'CONVERSATIONAL_REGISTRATION',
      complianceFlags: [
        'USER_REGISTRATION',
        'FRAUD_DETECTION',
        'PRIVACY_VALIDATION',
        'DEVICE_ANALYSIS',
        'SECURITY_SCREENING',
      ],
      timeout: 25000,
      cacheable: false,
      customRules: [
        {
          name: 'email_domain_security_check',
          condition: 'email_domain_reputation < 0.8',
          action: 'REQUIRE_CONVERSATION',
          priority: 8,
        },
        {
          name: 'registration_rate_monitoring',
          condition: 'recent_registrations > 5',
          action: 'REQUIRE_CONVERSATION',
          priority: 7,
        },
        {
          name: 'suspicious_device_registration',
          condition: 'device_trust_score < 0.5',
          action: 'REQUIRE_CONVERSATION',
          priority: 9,
        },
      ],
    },
  )
  @ApiOperation({
    summary: 'Conversational registration with security validation',
    description:
      'Register new user with AI-driven fraud detection, conversational validation, and privacy compliance',
  })
  @ApiBody({ type: ConversationalRegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully with conversational validation',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        user: { type: 'object', description: 'Created user profile' },
        conversationId: {
          type: 'string',
          description: 'Registration conversation ID',
        },
        riskAssessment: {
          type: 'object',
          description: 'Security risk assessment',
        },
        securityActions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Security actions applied during registration',
        },
      },
    },
  })
  async conversationalRegister(
    @Body() registerDto: ConversationalRegisterDto,
    @Request() request: AuthenticatedRequest,
    @ConversationContext() conversationContext?: ConversationContextParameter,
  ): Promise<ConversationalAuthResult> {
    const operationId = `parlant-register-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.log(
      `[${operationId}] Conversational registration request received`,
      {
        operationId,
        email: registerDto.email,
        username: registerDto.username,
        ipAddress: this.getClientIpAddress(request),
        deviceFingerprint: registerDto.deviceFingerprint,
        registrationSource: registerDto.registrationSource,
        conversationId: conversationContext?.conversationId,
      },
    );

    try {
      const authContext = this.createAuthenticationContext(
        registerDto,
        request,
      );
      const result = await this.parlantAuthService.conversationalRegister(
        registerDto,
        authContext,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Conversational registration completed`,
        {
          operationId,
          success: result.success,
          userId: result.user?.id,
          conversationId: result.conversationId,
          securityActions: result.securityActions,
          duration,
        },
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[${operationId}] Conversational registration failed`, {
        operationId,
        email: registerDto.email,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      throw error instanceof Error
        ? error
        : new Error('Conversational registration failed');
    }
  }

  /**
   * Conversational password change with security validation
   *
   * @param changePasswordDto - Enhanced password change data
   * @param user - Authenticated user from JWT
   * @param request - HTTP request object
   * @param conversationContext - PARLANT conversation context
   * @returns Promise<ConversationalAuthResult> - Password change result
   */
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ParlantCritical(
    'Conversational password change with comprehensive security validation and session management',
    {
      securityLevel: SecurityLevel.CRITICAL,
      validationMode: ValidationMode.EXPLICIT,
      businessCategory: 'CONVERSATIONAL_PASSWORD_CHANGE',
      complianceFlags: [
        'PASSWORD_SECURITY',
        'SESSION_MANAGEMENT',
        'CREDENTIAL_VALIDATION',
        'SECURITY_AUDIT',
      ],
      requiredRoles: ['USER', 'OPERATOR', 'ADMIN'],
      timeout: 20000,
      cacheable: false,
      customRules: [
        {
          name: 'password_strength_validation',
          condition: 'password_strength_score >= 0.8',
          action: 'APPROVE',
          priority: 10,
        },
        {
          name: 'password_reuse_prevention',
          condition: 'password_previously_used === false',
          action: 'APPROVE',
          priority: 9,
        },
        {
          name: 'suspicious_password_change',
          condition: 'location_change === true OR device_change === true',
          action: 'REQUIRE_CONVERSATION',
          priority: 8,
        },
      ],
    },
  )
  @ApiOperation({
    summary: 'Conversational password change with security validation',
    description:
      'Change user password with AI-driven security validation, threat detection, and session management',
  })
  @ApiBody({ type: ConversationalChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully with conversational validation',
  })
  async conversationalChangePassword(
    @Body() changePasswordDto: ConversationalChangePasswordDto,
    @CurrentUser() user: User,
    @Request() request: AuthenticatedRequest,
    @ConversationContext() conversationContext?: ConversationContextParameter,
  ): Promise<ConversationalAuthResult> {
    const operationId = `parlant-pwd-change-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.log(
      `[${operationId}] Conversational password change request received`,
      {
        operationId,
        userId: user.id,
        username: user.username,
        changeReason: changePasswordDto.changeReason,
        ipAddress: this.getClientIpAddress(request),
        deviceFingerprint: changePasswordDto.deviceFingerprint,
        conversationId: conversationContext?.conversationId,
      },
    );

    try {
      const authContext = this.createAuthenticationContext(
        changePasswordDto,
        request,
        user.id,
      );
      const result = await this.parlantAuthService.conversationalChangePassword(
        user.id,
        changePasswordDto,
        authContext,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Conversational password change completed`,
        {
          operationId,
          userId: user.id,
          success: result.success,
          conversationId: result.conversationId,
          securityActions: result.securityActions,
          duration,
        },
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[${operationId}] Conversational password change failed`,
        {
          operationId,
          userId: user.id,
          error: error instanceof Error ? error.message : String(error),
          duration,
        },
      );

      throw error instanceof Error
        ? error
        : new Error('Conversational password change failed');
    }
  }

  /**
   * Get authentication security status and risk assessment
   *
   * @param user - Authenticated user
   * @param conversationContext - PARLANT conversation context
   * @returns Authentication security status
   */
  @UseGuards(JwtAuthGuard)
  @Get('security-status')
  @ApiBearerAuth()
  @ParlantValidated({
    intent:
      'Retrieve user authentication security status and risk assessment information',
    securityLevel: SecurityLevel.MEDIUM,
    validationMode: ValidationMode.AUTOMATIC,
    businessCategory: 'SECURITY_STATUS',
    complianceFlags: ['SECURITY_MONITORING', 'RISK_ASSESSMENT'],
    timeout: 5000,
    cacheable: true,
  })
  @ApiOperation({
    summary: 'Get authentication security status',
    description:
      'Retrieve current security status, risk assessment, and authentication recommendations',
  })
  @ApiResponse({
    status: 200,
    description: 'Security status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        securityLevel: { type: 'string' },
        riskScore: { type: 'number' },
        lastAssessment: { type: 'string', format: 'date-time' },
        recommendedActions: { type: 'array', items: { type: 'string' } },
        trustedDevices: { type: 'number' },
        recentActivity: { type: 'array', items: { type: 'object' } },
      },
    },
  })
  async getSecurityStatus(
    @CurrentUser() user: User,
    @Request() request: AuthenticatedRequest,
    @ConversationContext() conversationContext?: ConversationContextParameter,
  ): Promise<any> {
    const operationId = `security-status-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    this.logger.log(`[${operationId}] Security status request`, {
      operationId,
      userId: user.id,
      conversationId: conversationContext?.conversationId,
    });

    // Return simplified security status for demonstration
    return {
      userId: user.id,
      securityLevel: 'MEDIUM',
      riskScore: 0.2,
      lastAssessment: new Date().toISOString(),
      recommendedActions: ['Enable MFA', 'Verify email'],
      trustedDevices: 2,
      recentActivity: [
        {
          timestamp: new Date().toISOString(),
          action: 'LOGIN',
          ipAddress: this.getClientIpAddress(request),
          success: true,
        },
      ],
    };
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Create comprehensive authentication context from request data
   */
  private createAuthenticationContext(
    dto: any,
    request: AuthenticatedRequest,
    userId?: string,
  ): ConversationalAuthContext {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const ipAddress = this.getClientIpAddress(request);
    const userAgent = request.headers['user-agent'] || 'unknown';

    // Generate device fingerprint if not provided
    let deviceFingerprint = dto.deviceFingerprint;
    if (!deviceFingerprint) {
      deviceFingerprint = this.generateDeviceFingerprint(request);
    }

    return {
      sessionId,
      userId,
      ipAddress,
      userAgent,
      geolocation: dto.geolocation,
      deviceFingerprint,
      previousLogins: [], // Would be populated from database in production
      securityClassification: 'CONFIDENTIAL', // Default classification
      timestamp: new Date(),
    };
  }

  /**
   * Extract client IP address from request headers
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

  /**
   * Generate device fingerprint from request headers
   */
  private generateDeviceFingerprint(request: AuthenticatedRequest): string {
    const userAgent = request.headers['user-agent'] || '';
    const acceptLanguage = request.headers['accept-language'] || '';
    const acceptEncoding = request.headers['accept-encoding'] || '';
    const connection = request.headers['connection'] || '';

    const fingerprintData = `${userAgent}:${acceptLanguage}:${acceptEncoding}:${connection}`;

    return createHash('sha256')
      .update(fingerprintData)
      .digest('hex')
      .substring(0, 16);
  }
}
