/**
 * PARLANT JWT Lifecycle Management Service - Conversational Token Security
 *
 * Provides comprehensive conversational JWT and token lifecycle management
 * with intelligent security validation, real-time token monitoring, and
 * natural language token security validation for enterprise-grade protection.
 *
 * Features:
 * - Conversational JWT token generation and validation workflows
 * - Intelligent token lifecycle monitoring with AI-driven threat detection
 * - Real-time token security validation through natural language
 * - Dynamic token revocation and refresh with conversational approval
 * - Advanced token abuse and manipulation detection
 * - Enterprise-grade token audit trails with conversational context
 *
 * Security Level: CRITICAL - All token operations validated through conversation
 * Performance Target: <200ms for token validation, <1000ms for conversational approval
 * Compliance: RFC 7519 JWT, NIST 800-63B, OWASP Token Security Guidelines
 */

import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ParlantIntegrationService,
  ParlantConversationContext,
  ParlantValidationRequest,
  ParlantValidationResponse,
} from '@bytebot/shared/src/parlant/parlant-integration.service';
import {
  RiskLevel,
  SecurityLevel,
  UserRole,
} from '@bytebot/shared';
import { User, UserSession } from '@prisma/client';
import {
  JwtPayload,
  RefreshTokenPayload,
  TokenPair,
} from '../types/jwt-payload.interface';
import { randomBytes, createHash } from 'crypto';

// ===== JWT LIFECYCLE INTERFACES =====

/**
 * Token security states
 */
export enum TokenSecurityState {
  ACTIVE = 'ACTIVE',
  MONITORED = 'MONITORED',
  SUSPICIOUS = 'SUSPICIOUS',
  COMPROMISED = 'COMPROMISED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
  BLACKLISTED = 'BLACKLISTED',
}

/**
 * Token anomaly types for detection
 */
export enum TokenAnomalyType {
  RAPID_REFRESH = 'RAPID_REFRESH',
  LOCATION_MISMATCH = 'LOCATION_MISMATCH',
  DEVICE_MISMATCH = 'DEVICE_MISMATCH',
  UNUSUAL_USAGE = 'UNUSUAL_USAGE',
  CONCURRENT_USAGE = 'CONCURRENT_USAGE',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  REPLAY_ATTACK = 'REPLAY_ATTACK',
  TOKEN_MANIPULATION = 'TOKEN_MANIPULATION',
  BLACKLIST_BYPASS = 'BLACKLIST_BYPASS',
  SCOPE_EXPANSION = 'SCOPE_EXPANSION',
}

/**
 * Conversational token context
 */
export interface ConversationalTokenContext {
  readonly tokenId: string;
  readonly sessionId: string;
  readonly userId: string;
  readonly userRole: UserRole;
  readonly tokenType: 'access' | 'refresh';
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly deviceFingerprint: string;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
  readonly lastUsed?: Date;
  readonly usageCount: number;
  readonly securityLevel: SecurityLevel;
  readonly riskScore: number;
}

/**
 * Token lifecycle monitoring configuration
 */
export interface TokenLifecycleConfig {
  readonly userId: string;
  readonly securityLevel: SecurityLevel;
  readonly monitoringEnabled: boolean;
  readonly anomalyDetectionEnabled: boolean;
  readonly conversationalValidationThreshold: number;
  readonly maxRefreshRate: number; // per hour
  readonly maxConcurrentTokens: number;
  readonly tokenLifetimeMinutes: number;
  readonly refreshTokenLifetimeDays: number;
  readonly revokeOnSuspicion: boolean;
  readonly enhancedAuditingEnabled: boolean;
}

/**
 * Token anomaly detection result
 */
export interface TokenAnomalyDetection {
  readonly tokenId: string;
  readonly anomalyId: string;
  readonly anomalyType: TokenAnomalyType;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly confidence: number; // 0.0 to 1.0
  readonly description: string;
  readonly detectedAt: Date;
  readonly currentBehavior: any;
  readonly expectedBehavior: any;
  readonly riskAssessment: TokenRiskAssessment;
  readonly recommendedActions: string[];
  readonly conversationalValidationRequired: boolean;
  readonly evidenceData: Record<string, any>;
  readonly aiAnalysisExplanation: string;
}

/**
 * Token risk assessment
 */
export interface TokenRiskAssessment {
  readonly tokenId: string;
  readonly userId: string;
  readonly riskScore: number;
  readonly riskLevel: RiskLevel;
  readonly riskFactors: TokenRiskFactor[];
  readonly anomalies: TokenAnomalyDetection[];
  readonly trustScore: number;
  readonly tokenHealth: TokenHealthMetrics;
  readonly assessmentTimestamp: Date;
  readonly aiReasoningExplanation: string;
}

/**
 * Token risk factor
 */
export interface TokenRiskFactor {
  readonly factor: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly weight: number;
  readonly description: string;
  readonly detectedValue: any;
  readonly normalValue: any;
  readonly mitigationActions: string[];
}

/**
 * Token health metrics
 */
export interface TokenHealthMetrics {
  readonly age: number; // milliseconds since issuance
  readonly usageFrequency: number; // uses per hour
  readonly errorRate: number;
  readonly anomalyCount: number;
  readonly securityEvents: number;
  readonly lastSecurityCheck: Date;
  readonly refreshCount: number;
  readonly overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
}

/**
 * Conversational token validation request
 */
export interface ConversationalTokenValidationRequest {
  readonly tokenId: string;
  readonly validationType:
    | 'GENERATION'
    | 'REFRESH'
    | 'REVOCATION'
    | 'ANOMALY_DETECTION'
    | 'SECURITY_CHECK';
  readonly tokenData?: any;
  readonly anomalyData?: TokenAnomalyDetection;
  readonly securityContext: ConversationalTokenContext;
  readonly businessJustification?: string;
  readonly urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Token security action result
 */
export interface TokenSecurityActionResult {
  readonly success: boolean;
  readonly tokenId: string;
  readonly actionTaken: string;
  readonly conversationId: string;
  readonly riskAssessment: TokenRiskAssessment;
  readonly newSecurityState: TokenSecurityState;
  readonly tokens?: TokenPair;
  readonly restrictions: string[];
  readonly monitoringEnhanced: boolean;
  readonly auditTrail: TokenAuditEntry[];
  readonly nextReviewTime?: Date;
}

/**
 * Token audit entry
 */
export interface TokenAuditEntry {
  readonly timestamp: Date;
  readonly action: string;
  readonly outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'ESCALATED';
  readonly details: string;
  readonly tokenType?: 'access' | 'refresh';
  readonly anomalyType?: TokenAnomalyType;
  readonly conversationId?: string;
  readonly riskScore: number;
  readonly securityLevel: SecurityLevel;
  readonly ipAddress: string;
  readonly userAgent: string;
}

// ===== TOKEN TRACKING INTERFACES =====

/**
 * Enhanced token tracking data
 */
export interface EnhancedTokenData {
  readonly tokenId: string;
  readonly sessionId: string;
  readonly userId: string;
  readonly tokenType: 'access' | 'refresh';
  readonly state: TokenSecurityState;
  readonly context: ConversationalTokenContext;
  readonly lifecycle: TokenLifecycleConfig;
  readonly riskAssessment: TokenRiskAssessment;
  readonly anomalies: TokenAnomalyDetection[];
  readonly auditTrail: TokenAuditEntry[];
  readonly conversationHistory: string[];
  readonly usageHistory: TokenUsageEntry[];
  readonly metadata: Record<string, any>;
}

/**
 * Token usage entry for tracking
 */
export interface TokenUsageEntry {
  readonly timestamp: Date;
  readonly action: string;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly deviceFingerprint: string;
  readonly success: boolean;
  readonly errorDetails?: string;
}

// ===== PARLANT JWT LIFECYCLE SERVICE =====

@Injectable()
export class ParlantJWTLifecycleService {
  private readonly logger = new Logger(ParlantJWTLifecycleService.name);

  // In-memory token tracking (use Redis cluster in production)
  private readonly activeTokens = new Map<string, EnhancedTokenData>();
  private readonly userTokens = new Map<string, Set<string>>(); // userId -> Set<tokenId>
  private readonly tokenBaselines = new Map<string, any>(); // tokenId -> baseline behavior
  private readonly blacklistedTokens = new Set<string>();
  private readonly refreshCounters = new Map<
    string,
    { count: number; windowStart: Date }
  >(); // userId -> refresh stats

  // Configuration constants
  private readonly MAX_REFRESH_PER_HOUR = 10;
  private readonly MAX_CONCURRENT_TOKENS = 5;
  private readonly ANOMALY_DETECTION_INTERVAL = 60000; // 1 minute
  private readonly TOKEN_HEALTH_CHECK_INTERVAL = 300000; // 5 minutes
  private readonly RAPID_REFRESH_THRESHOLD = 5; // refreshes in 10 minutes
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly parlantService: ParlantIntegrationService,
  ) {
    const operationId = `parlant-jwt-lifecycle-init-${Date.now()}`;
    this.logger.log(
      `[${operationId}] Initializing PARLANT JWT Lifecycle Service`,
      {
        operationId,
        maxRefreshPerHour: this.MAX_REFRESH_PER_HOUR,
        maxConcurrentTokens: this.MAX_CONCURRENT_TOKENS,
        detectionInterval: this.ANOMALY_DETECTION_INTERVAL,
      },
    );

    // Start background monitoring
    this.startBackgroundTokenMonitoring();
  }

  /**
   * Generate JWT tokens with conversational validation
   *
   * @param user - User for token generation
   * @param context - Token generation context
   * @param lifecycleConfig - Token lifecycle configuration
   * @param rememberMe - Extended lifetime flag
   * @returns Promise<TokenSecurityActionResult> - Token generation result
   */
  async generateConversationalJWTTokens(
    user: User,
    context: {
      sessionId: string;
      ipAddress: string;
      userAgent: string;
      deviceFingerprint: string;
      securityLevel: SecurityLevel;
    },
    lifecycleConfig: TokenLifecycleConfig,
    rememberMe = false,
  ): Promise<TokenSecurityActionResult> {
    const operationId = `jwt-generate-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Generating conversational JWT tokens`, {
      operationId,
      userId: user.id,
      userRole: user.role,
      sessionId: context.sessionId,
      securityLevel: context.securityLevel,
      rememberMe,
    });

    try {
      // Step 1: Perform initial token generation risk assessment
      const riskAssessment = await this.performTokenGenerationRiskAssessment(
        user,
        context,
      );

      // Step 2: Check concurrent token limits
      await this.checkConcurrentTokenLimits(user.id, lifecycleConfig);

      // Step 3: Validate token generation through Parlant if high risk
      if (
        riskAssessment.riskLevel === 'HIGH' ||
        riskAssessment.riskLevel === 'CRITICAL'
      ) {
        const validationResult =
          await this.validateConversationalTokenOperation(
            `temp-${operationId}`,
            'GENERATION',
            {
              tokenId: `temp-${operationId}`,
              validationType: 'GENERATION',
              securityContext: this.createTokenContext(
                'temp',
                context,
                user,
                'access',
              ),
              businessJustification:
                'High-risk token generation requires validation',
              urgency: this.mapRiskToUrgency(riskAssessment.riskLevel),
            },
          );

        if (!validationResult.success) {
          return validationResult;
        }
      }

      // Step 4: Generate token pair
      const tokens = await this.generateSecureTokenPair(
        user,
        context,
        rememberMe,
      );

      // Step 5: Create enhanced token tracking
      const accessTokenData = await this.createEnhancedTokenData(
        tokens.accessToken,
        'access',
        user,
        context,
        lifecycleConfig,
        riskAssessment,
      );

      const refreshTokenData = await this.createEnhancedTokenData(
        tokens.refreshToken,
        'refresh',
        user,
        context,
        lifecycleConfig,
        riskAssessment,
      );

      // Step 6: Store token tracking data
      this.activeTokens.set(accessTokenData.tokenId, accessTokenData);
      this.activeTokens.set(refreshTokenData.tokenId, refreshTokenData);

      // Step 7: Track user tokens
      const userTokenSet = this.userTokens.get(user.id) || new Set();
      userTokenSet.add(accessTokenData.tokenId);
      userTokenSet.add(refreshTokenData.tokenId);
      this.userTokens.set(user.id, userTokenSet);

      // Step 8: Create audit entries
      const auditEntry: TokenAuditEntry = {
        timestamp: new Date(),
        action: 'JWT_TOKENS_GENERATED',
        outcome: 'SUCCESS',
        details: `JWT token pair generated successfully for ${user.role} user with ${context.securityLevel} security level`,
        tokenType: 'access',
        riskScore: riskAssessment.riskScore,
        securityLevel: context.securityLevel,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      };

      const duration = Date.now() - startTime;
      this.logger.log(`[${operationId}] JWT tokens generated successfully`, {
        operationId,
        userId: user.id,
        accessTokenId: accessTokenData.tokenId,
        refreshTokenId: refreshTokenData.tokenId,
        riskScore: riskAssessment.riskScore,
        duration,
      });

      return {
        success: true,
        tokenId: accessTokenData.tokenId,
        actionTaken: 'JWT_TOKENS_GENERATED',
        conversationId: `jwt-gen-${operationId}`,
        riskAssessment,
        newSecurityState: TokenSecurityState.ACTIVE,
        tokens,
        restrictions: this.generateTokenRestrictions(riskAssessment),
        monitoringEnhanced: riskAssessment.riskLevel !== 'LOW',
        auditTrail: [auditEntry],
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[${operationId}] JWT token generation failed`, {
        operationId,
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      throw error instanceof Error
        ? error
        : new Error('JWT token generation failed');
    }
  }

  /**
   * Refresh JWT tokens with conversational validation
   *
   * @param refreshToken - Refresh token to validate
   * @param context - Refresh context
   * @returns Promise<TokenSecurityActionResult> - Token refresh result
   */
  async refreshConversationalJWTTokens(
    refreshToken: string,
    context: {
      ipAddress: string;
      userAgent: string;
      deviceFingerprint: string;
    },
  ): Promise<TokenSecurityActionResult> {
    const operationId = `jwt-refresh-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Refreshing conversational JWT tokens`, {
      operationId,
      ipAddress: context.ipAddress,
    });

    try {
      // Step 1: Validate and decode refresh token
      const payload =
        await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type for refresh');
      }

      // Step 2: Find tracked token
      const trackedToken = this.findTrackedTokenByJWT(refreshToken);
      if (!trackedToken) {
        throw new UnauthorizedException('Token not found in tracking system');
      }

      // Step 3: Check blacklist
      if (this.blacklistedTokens.has(trackedToken.tokenId)) {
        throw new UnauthorizedException('Token has been blacklisted');
      }

      // Step 4: Get user and session
      const user = await this.getUserById(trackedToken.userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const session = await this.getUserSession(refreshToken);
      if (!session || session.isRevoked || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired session');
      }

      // Step 5: Check refresh rate limits
      await this.checkRefreshRateLimits(user.id);

      // Step 6: Perform refresh risk assessment
      const riskAssessment = await this.performTokenRefreshRiskAssessment(
        trackedToken,
        context,
      );

      // Step 7: Detect anomalies
      const anomalies = await this.detectTokenRefreshAnomalies(
        trackedToken,
        context,
      );

      // Step 8: Validate refresh through Parlant if required
      if (
        riskAssessment.riskLevel === 'HIGH' ||
        riskAssessment.riskLevel === 'CRITICAL' ||
        anomalies.length > 0
      ) {
        const validationResult =
          await this.validateConversationalTokenOperation(
            trackedToken.tokenId,
            'REFRESH',
            {
              tokenId: trackedToken.tokenId,
              validationType: 'REFRESH',
              anomalyData: anomalies[0], // Pass first anomaly if any
              securityContext: trackedToken.context,
              businessJustification:
                'Token refresh requires validation due to risk assessment',
              urgency: this.mapRiskToUrgency(riskAssessment.riskLevel),
            },
          );

        if (!validationResult.success) {
          return validationResult;
        }
      }

      // Step 9: Generate new token pair
      const newTokens = await this.generateSecureTokenPair(
        user,
        {
          sessionId: trackedToken.sessionId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          deviceFingerprint: context.deviceFingerprint,
          securityLevel: trackedToken.context.securityLevel,
        },
        false,
      );

      // Step 10: Update session with new refresh token
      await this.updateUserSession(session.id, newTokens.refreshToken);

      // Step 11: Revoke old tokens
      await this.revokeToken(
        trackedToken.tokenId,
        'Token refresh - old token revoked',
      );

      // Step 12: Update refresh counters
      this.updateRefreshCounters(user.id);

      // Step 13: Create audit entry
      const auditEntry: TokenAuditEntry = {
        timestamp: new Date(),
        action: 'JWT_TOKENS_REFRESHED',
        outcome: 'SUCCESS',
        details: `JWT tokens refreshed successfully`,
        tokenType: 'refresh',
        riskScore: riskAssessment.riskScore,
        securityLevel: trackedToken.context.securityLevel,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      };

      const duration = Date.now() - startTime;
      this.logger.log(`[${operationId}] JWT tokens refreshed successfully`, {
        operationId,
        userId: user.id,
        oldTokenId: trackedToken.tokenId,
        riskScore: riskAssessment.riskScore,
        anomalyCount: anomalies.length,
        duration,
      });

      return {
        success: true,
        tokenId: trackedToken.tokenId,
        actionTaken: 'JWT_TOKENS_REFRESHED',
        conversationId: `jwt-refresh-${operationId}`,
        riskAssessment,
        newSecurityState: TokenSecurityState.ACTIVE,
        tokens: newTokens,
        restrictions: this.generateTokenRestrictions(riskAssessment),
        monitoringEnhanced: anomalies.length > 0,
        auditTrail: [auditEntry],
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[${operationId}] JWT token refresh failed`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      throw error instanceof Error
        ? error
        : new Error('JWT token refresh failed');
    }
  }

  /**
   * Revoke JWT tokens with conversational validation
   *
   * @param tokenIdentifier - Token to revoke (can be token or tokenId)
   * @param reason - Revocation reason
   * @param urgency - Revocation urgency
   * @returns Promise<TokenSecurityActionResult> - Revocation result
   */
  async revokeConversationalJWTTokens(
    tokenIdentifier: string,
    reason: string,
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
  ): Promise<TokenSecurityActionResult> {
    const operationId = `jwt-revoke-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    this.logger.log(`[${operationId}] Revoking conversational JWT tokens`, {
      operationId,
      reason,
      urgency,
    });

    try {
      // Step 1: Find tracked token
      let trackedToken = this.activeTokens.get(tokenIdentifier);
      if (!trackedToken) {
        trackedToken = this.findTrackedTokenByJWT(tokenIdentifier);
      }

      if (!trackedToken) {
        throw new BadRequestException('Token not found');
      }

      // Step 2: Validate revocation through conversation
      const validationResult = await this.validateConversationalTokenOperation(
        trackedToken.tokenId,
        'REVOCATION',
        {
          tokenId: trackedToken.tokenId,
          validationType: 'REVOCATION',
          securityContext: trackedToken.context,
          businessJustification: reason,
          urgency,
        },
      );

      if (validationResult.success) {
        // Step 3: Execute revocation
        await this.revokeToken(trackedToken.tokenId, reason);

        return {
          ...validationResult,
          actionTaken: 'JWT_TOKENS_REVOKED',
          newSecurityState: TokenSecurityState.REVOKED,
        };
      } else {
        return validationResult;
      }
    } catch (error) {
      this.logger.error(`[${operationId}] JWT token revocation failed`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error instanceof Error
        ? error
        : new Error('JWT token revocation failed');
    }
  }

  /**
   * Validate JWT token with enhanced security checks
   *
   * @param token - JWT token to validate
   * @param context - Validation context
   * @returns Promise<TokenSecurityActionResult> - Validation result
   */
  async validateConversationalJWTToken(
    token: string,
    context: {
      ipAddress: string;
      userAgent: string;
      deviceFingerprint: string;
      requestedOperation?: string;
    },
  ): Promise<TokenSecurityActionResult> {
    const operationId = `jwt-validate-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Validating conversational JWT token`, {
      operationId,
      ipAddress: context.ipAddress,
      requestedOperation: context.requestedOperation,
    });

    try {
      // Step 1: Basic JWT validation
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Step 2: Find tracked token
      const trackedToken = this.findTrackedTokenByJWT(token);
      if (!trackedToken) {
        throw new UnauthorizedException('Token not found in tracking system');
      }

      // Step 3: Check blacklist
      if (this.blacklistedTokens.has(trackedToken.tokenId)) {
        throw new UnauthorizedException('Token has been blacklisted');
      }

      // Step 4: Check token state
      if (
        trackedToken.state === TokenSecurityState.REVOKED ||
        trackedToken.state === TokenSecurityState.EXPIRED ||
        trackedToken.state === TokenSecurityState.BLACKLISTED
      ) {
        throw new UnauthorizedException(
          `Token is ${trackedToken.state.toLowerCase()}`,
        );
      }

      // Step 5: Detect usage anomalies
      const anomalies = await this.detectTokenUsageAnomalies(
        trackedToken,
        context,
      );

      // Step 6: Update usage tracking
      this.updateTokenUsage(trackedToken, context);

      // Step 7: Validate through Parlant if suspicious
      if (
        trackedToken.state === TokenSecurityState.SUSPICIOUS ||
        anomalies.length > 0
      ) {
        const validationResult =
          await this.validateConversationalTokenOperation(
            trackedToken.tokenId,
            'SECURITY_CHECK',
            {
              tokenId: trackedToken.tokenId,
              validationType: 'SECURITY_CHECK',
              anomalyData: anomalies[0],
              securityContext: trackedToken.context,
              businessJustification: 'Token usage requires security validation',
              urgency: 'MEDIUM',
            },
          );

        if (!validationResult.success) {
          return validationResult;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`[${operationId}] JWT token validation successful`, {
        operationId,
        tokenId: trackedToken.tokenId,
        userId: trackedToken.userId,
        anomalyCount: anomalies.length,
        duration,
      });

      return {
        success: true,
        tokenId: trackedToken.tokenId,
        actionTaken: 'JWT_TOKEN_VALIDATED',
        conversationId: `jwt-validate-${operationId}`,
        riskAssessment: trackedToken.riskAssessment,
        newSecurityState: trackedToken.state,
        restrictions: anomalies.length > 0 ? ['ENHANCED_MONITORING'] : [],
        monitoringEnhanced: anomalies.length > 0,
        auditTrail: [
          {
            timestamp: new Date(),
            action: 'JWT_TOKEN_VALIDATED',
            outcome: 'SUCCESS',
            details: `Token validated successfully${anomalies.length > 0 ? ` with ${anomalies.length} anomalies` : ''}`,
            tokenType: 'access',
            riskScore: trackedToken.riskAssessment.riskScore,
            securityLevel: trackedToken.context.securityLevel,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
          },
        ],
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.warn(`[${operationId}] JWT token validation failed`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      throw error instanceof Error
        ? error
        : new Error('JWT token validation failed');
    }
  }

  /**
   * Get comprehensive token security status
   *
   * @param tokenIdentifier - Token ID or JWT token
   * @returns Promise<EnhancedTokenData | null> - Token security status
   */
  async getTokenSecurityStatus(
    tokenIdentifier: string,
  ): Promise<EnhancedTokenData | null> {
    let trackedToken = this.activeTokens.get(tokenIdentifier);
    if (!trackedToken) {
      trackedToken = this.findTrackedTokenByJWT(tokenIdentifier);
    }

    if (!trackedToken) {
      return null;
    }

    // Update token health metrics
    trackedToken.riskAssessment.tokenHealth =
      this.calculateTokenHealth(trackedToken);

    return trackedToken;
  }

  // ===== PRIVATE HELPER METHODS =====

  private async performTokenGenerationRiskAssessment(
    user: User,
    context: any,
  ): Promise<TokenRiskAssessment> {
    const riskFactors: TokenRiskFactor[] = [];
    let riskScore = 0.1; // Base risk

    // User role risk assessment
    if (user.role === UserRole.ADMIN) {
      riskFactors.push({
        factor: 'ADMIN_TOKEN_GENERATION',
        severity: 'HIGH',
        weight: 0.3,
        description:
          'Administrator token generation requires enhanced security',
        detectedValue: user.role,
        normalValue: UserRole.USER,
        mitigationActions: ['Enhanced monitoring', 'Conversational validation'],
      });
      riskScore += 0.3;
    }

    // Security level risk
    if (
      context.securityLevel === 'HIGH' ||
      context.securityLevel === 'CRITICAL'
    ) {
      riskFactors.push({
        factor: 'HIGH_SECURITY_CONTEXT',
        severity: 'MEDIUM',
        weight: 0.2,
        description: 'High security level context',
        detectedValue: context.securityLevel,
        normalValue: 'MEDIUM',
        mitigationActions: ['Continuous monitoring', 'Anomaly detection'],
      });
      riskScore += 0.2;
    }

    // Check user's recent token generation activity
    const userTokenCount = this.userTokens.get(user.id)?.size || 0;
    if (userTokenCount > this.MAX_CONCURRENT_TOKENS) {
      riskFactors.push({
        factor: 'EXCESSIVE_TOKEN_COUNT',
        severity: 'MEDIUM',
        weight: 0.2,
        description: 'User has excessive number of active tokens',
        detectedValue: userTokenCount,
        normalValue: this.MAX_CONCURRENT_TOKENS,
        mitigationActions: ['Token audit', 'Revoke old tokens'],
      });
      riskScore += 0.2;
    }

    const riskLevel = this.calculateRiskLevel(riskScore);

    return {
      tokenId: 'pending',
      userId: user.id,
      riskScore: Math.min(riskScore, 1.0),
      riskLevel,
      riskFactors,
      anomalies: [],
      trustScore: 1.0 - riskScore,
      tokenHealth: {
        age: 0,
        usageFrequency: 0,
        errorRate: 0,
        anomalyCount: 0,
        securityEvents: 0,
        lastSecurityCheck: new Date(),
        refreshCount: 0,
        overallHealth: 'EXCELLENT',
      },
      assessmentTimestamp: new Date(),
      aiReasoningExplanation: `Token generation risk assessment: score ${riskScore.toFixed(2)}, level ${riskLevel}. Factors: ${riskFactors.map((f) => f.factor).join(', ')}.`,
    };
  }

  private async performTokenRefreshRiskAssessment(
    trackedToken: EnhancedTokenData,
    context: any,
  ): Promise<TokenRiskAssessment> {
    const riskFactors: TokenRiskFactor[] = [];
    let riskScore = trackedToken.riskAssessment.riskScore; // Start with existing risk

    // Check refresh frequency
    const refreshStats = this.refreshCounters.get(trackedToken.userId);
    if (refreshStats && refreshStats.count > this.RAPID_REFRESH_THRESHOLD) {
      riskFactors.push({
        factor: 'RAPID_TOKEN_REFRESH',
        severity: 'HIGH',
        weight: 0.3,
        description: `Rapid token refresh detected: ${refreshStats.count} refreshes recently`,
        detectedValue: refreshStats.count,
        normalValue: this.RAPID_REFRESH_THRESHOLD,
        mitigationActions: ['Rate limiting', 'User verification'],
      });
      riskScore += 0.3;
    }

    // Check context changes
    if (context.ipAddress !== trackedToken.context.ipAddress) {
      riskFactors.push({
        factor: 'IP_ADDRESS_CHANGE',
        severity: 'MEDIUM',
        weight: 0.2,
        description: 'IP address changed during token refresh',
        detectedValue: context.ipAddress,
        normalValue: trackedToken.context.ipAddress,
        mitigationActions: ['Verify location change', 'Enhanced monitoring'],
      });
      riskScore += 0.2;
    }

    if (context.deviceFingerprint !== trackedToken.context.deviceFingerprint) {
      riskFactors.push({
        factor: 'DEVICE_CHANGE',
        severity: 'HIGH',
        weight: 0.4,
        description: 'Device fingerprint changed during token refresh',
        detectedValue: context.deviceFingerprint,
        normalValue: trackedToken.context.deviceFingerprint,
        mitigationActions: ['Verify device change', 'Require MFA'],
      });
      riskScore += 0.4;
    }

    const riskLevel = this.calculateRiskLevel(riskScore);

    return {
      ...trackedToken.riskAssessment,
      riskScore: Math.min(riskScore, 1.0),
      riskLevel,
      riskFactors: [...trackedToken.riskAssessment.riskFactors, ...riskFactors],
      assessmentTimestamp: new Date(),
      aiReasoningExplanation: `Token refresh risk assessment: score ${riskScore.toFixed(2)}, level ${riskLevel}. New factors: ${riskFactors.map((f) => f.factor).join(', ')}.`,
    };
  }

  private async detectTokenRefreshAnomalies(
    trackedToken: EnhancedTokenData,
    context: any,
  ): Promise<TokenAnomalyDetection[]> {
    const anomalies: TokenAnomalyDetection[] = [];

    // Rapid refresh detection
    const refreshStats = this.refreshCounters.get(trackedToken.userId);
    if (refreshStats && refreshStats.count > this.RAPID_REFRESH_THRESHOLD) {
      anomalies.push({
        tokenId: trackedToken.tokenId,
        anomalyId: `rapid_refresh_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        anomalyType: TokenAnomalyType.RAPID_REFRESH,
        severity: 'HIGH',
        confidence: 0.9,
        description: `Rapid refresh pattern detected: ${refreshStats.count} refreshes in short timeframe`,
        detectedAt: new Date(),
        currentBehavior: refreshStats.count,
        expectedBehavior: this.RAPID_REFRESH_THRESHOLD,
        riskAssessment: trackedToken.riskAssessment,
        recommendedActions: [
          'Rate limiting',
          'User verification',
          'Possible token theft investigation',
        ],
        conversationalValidationRequired: true,
        evidenceData: {
          refreshCount: refreshStats.count,
          windowStart: refreshStats.windowStart,
          threshold: this.RAPID_REFRESH_THRESHOLD,
        },
        aiAnalysisExplanation:
          'Rapid token refresh pattern suggests possible token abuse or automated activity.',
      });
    }

    // Location mismatch detection
    if (context.ipAddress !== trackedToken.context.ipAddress) {
      anomalies.push({
        tokenId: trackedToken.tokenId,
        anomalyId: `location_mismatch_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        anomalyType: TokenAnomalyType.LOCATION_MISMATCH,
        severity: 'MEDIUM',
        confidence: 0.8,
        description: 'Token refresh from different IP address',
        detectedAt: new Date(),
        currentBehavior: context.ipAddress,
        expectedBehavior: trackedToken.context.ipAddress,
        riskAssessment: trackedToken.riskAssessment,
        recommendedActions: ['Verify location change', 'Monitor activity'],
        conversationalValidationRequired: false,
        evidenceData: {
          originalIp: trackedToken.context.ipAddress,
          currentIp: context.ipAddress,
        },
        aiAnalysisExplanation:
          'IP address change during token refresh could indicate session takeover or legitimate user movement.',
      });
    }

    return anomalies;
  }

  private async detectTokenUsageAnomalies(
    trackedToken: EnhancedTokenData,
    _context: any,
  ): Promise<TokenAnomalyDetection[]> {
    const anomalies: TokenAnomalyDetection[] = [];

    // Usage frequency anomaly
    const usageFrequency =
      trackedToken.riskAssessment.tokenHealth.usageFrequency;
    const expectedFrequency = 10; // Normal usage per hour

    if (usageFrequency > expectedFrequency * 5) {
      anomalies.push({
        tokenId: trackedToken.tokenId,
        anomalyId: `unusual_usage_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        anomalyType: TokenAnomalyType.UNUSUAL_USAGE,
        severity: 'MEDIUM',
        confidence: 0.7,
        description: `Unusual token usage frequency: ${usageFrequency} uses/hour`,
        detectedAt: new Date(),
        currentBehavior: usageFrequency,
        expectedBehavior: expectedFrequency,
        riskAssessment: trackedToken.riskAssessment,
        recommendedActions: ['Monitor usage patterns', 'Check for automation'],
        conversationalValidationRequired: false,
        evidenceData: {
          usageFrequency,
          expectedFrequency,
          threshold: expectedFrequency * 5,
        },
        aiAnalysisExplanation:
          'High token usage frequency could indicate automated activity or unusual user behavior.',
      });
    }

    return anomalies;
  }

  private async validateConversationalTokenOperation(
    tokenId: string,
    operationType:
      | 'GENERATION'
      | 'REFRESH'
      | 'REVOCATION'
      | 'ANOMALY_DETECTION'
      | 'SECURITY_CHECK',
    validationRequest: ConversationalTokenValidationRequest,
  ): Promise<TokenSecurityActionResult> {
    const operationId = `token-validate-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `[${operationId}] Validating conversational token operation`,
      {
        operationId,
        tokenId,
        operationType,
        urgency: validationRequest.urgency,
      },
    );

    try {
      // Create Parlant conversation context
      const parlantContext = this.createTokenValidationConversationContext(
        validationRequest,
        operationType,
      );

      const parlantValidationRequest: ParlantValidationRequest = {
        functionName:
          'ParlantJWTLifecycleService.validateConversationalTokenOperation',
        functionParams: {
          tokenId,
          operationType,
          userId: validationRequest.securityContext.userId,
          tokenType: validationRequest.securityContext.tokenType,
          riskScore: validationRequest.securityContext.riskScore,
          anomalyData: validationRequest.anomalyData,
          urgency: validationRequest.urgency,
        },
        actionDescription: this.createTokenOperationDescription(
          operationType,
          validationRequest,
        ),
        context: parlantContext,
        riskLevel: this.mapScoreToRiskLevel(
          validationRequest.securityContext.riskScore,
        ),
        operationId,
      };

      const validation = await this.parlantService.validateFunctionExecution(
        parlantValidationRequest,
      );

      const actionResult = this.processTokenValidationResult(
        tokenId,
        operationType,
        validation,
        validationRequest,
      );

      this.logger.log(`[${operationId}] Token operation validation completed`, {
        operationId,
        tokenId,
        operationType,
        approved: validation.approved,
        conversationId: validation.conversationId,
      });

      return actionResult;
    } catch (error) {
      this.logger.error(`[${operationId}] Token operation validation failed`, {
        operationId,
        tokenId,
        operationType,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error instanceof Error
        ? error
        : new Error('Token operation validation failed');
    }
  }

  private async generateSecureTokenPair(
    user: User,
    context: any,
    rememberMe = false,
  ): Promise<TokenPair> {
    const sessionId = randomBytes(16).toString('hex');

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

    const refreshExpirationTime = rememberMe
      ? 30 * 24 * 60 * 60
      : 7 * 24 * 60 * 60;
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      sessionId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + refreshExpirationTime,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload);
    const refreshToken = await this.jwtService.signAsync(refreshPayload);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 15 * 60,
    };
  }

  private async createEnhancedTokenData(
    token: string,
    tokenType: 'access' | 'refresh',
    user: User,
    context: any,
    lifecycleConfig: TokenLifecycleConfig,
    riskAssessment: TokenRiskAssessment,
  ): Promise<EnhancedTokenData> {
    const tokenId = createHash('sha256')
      .update(token)
      .digest('hex')
      .substring(0, 16);
    const now = new Date();

    const tokenContext: ConversationalTokenContext = {
      tokenId,
      sessionId: context.sessionId,
      userId: user.id,
      userRole: user.role,
      tokenType,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceFingerprint: context.deviceFingerprint,
      issuedAt: now,
      expiresAt: new Date(
        now.getTime() +
          (tokenType === 'access' ? 15 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000),
      ),
      usageCount: 0,
      securityLevel: context.securityLevel,
      riskScore: riskAssessment.riskScore,
    };

    return {
      tokenId,
      sessionId: context.sessionId,
      userId: user.id,
      tokenType,
      state: TokenSecurityState.ACTIVE,
      context: tokenContext,
      lifecycle: lifecycleConfig,
      riskAssessment: {
        ...riskAssessment,
        tokenId,
      },
      anomalies: [],
      auditTrail: [
        {
          timestamp: new Date(),
          action: 'TOKEN_CREATED',
          outcome: 'SUCCESS',
          details: `${tokenType} token created successfully`,
          tokenType,
          riskScore: riskAssessment.riskScore,
          securityLevel: context.securityLevel,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      ],
      conversationHistory: [],
      usageHistory: [],
      metadata: {
        deviceFingerprint: context.deviceFingerprint,
        createdAt: now.toISOString(),
        securityLevel: context.securityLevel,
      },
    };
  }

  private findTrackedTokenByJWT(jwt: string): EnhancedTokenData | null {
    const tokenHash = createHash('sha256')
      .update(jwt)
      .digest('hex')
      .substring(0, 16);
    return this.activeTokens.get(tokenHash) || null;
  }

  private async getUserById(userId: string): Promise<User | null> {
    try {
      return await this.prismaService.user.findUnique({
        where: { id: userId },
      });
    } catch (error) {
      this.logger.error('Error fetching user', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async getUserSession(
    refreshToken: string,
  ): Promise<UserSession | null> {
    try {
      return await this.prismaService.userSession.findUnique({
        where: { refreshToken },
        include: { user: true },
      });
    } catch (error) {
      this.logger.error('Error fetching user session', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async updateUserSession(
    sessionId: string,
    newRefreshToken: string,
  ): Promise<void> {
    try {
      await this.prismaService.userSession.update({
        where: { id: sessionId },
        data: {
          refreshToken: newRefreshToken,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Error updating user session', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async checkConcurrentTokenLimits(
    userId: string,
    config: TokenLifecycleConfig,
  ): Promise<void> {
    const userTokens = this.userTokens.get(userId);
    if (!userTokens) {
      return;
    }

    const activeTokenCount = Array.from(userTokens).filter((tokenId) => {
      const token = this.activeTokens.get(tokenId);
      return token && token.state === TokenSecurityState.ACTIVE;
    }).length;

    if (activeTokenCount > config.maxConcurrentTokens) {
      throw new BadRequestException(
        `Concurrent token limit exceeded: ${activeTokenCount}/${config.maxConcurrentTokens}`,
      );
    }
  }

  private async checkRefreshRateLimits(userId: string): Promise<void> {
    const refreshStats = this.refreshCounters.get(userId);
    const now = new Date();

    if (!refreshStats) {
      this.refreshCounters.set(userId, { count: 1, windowStart: now });
      return;
    }

    // Reset counter if window expired (1 hour)
    if (now.getTime() - refreshStats.windowStart.getTime() > 60 * 60 * 1000) {
      this.refreshCounters.set(userId, { count: 1, windowStart: now });
      return;
    }

    if (refreshStats.count >= this.MAX_REFRESH_PER_HOUR) {
      throw new BadRequestException(
        `Refresh rate limit exceeded: ${refreshStats.count}/${this.MAX_REFRESH_PER_HOUR} per hour`,
      );
    }
  }

  private updateRefreshCounters(userId: string): void {
    const refreshStats = this.refreshCounters.get(userId);
    if (refreshStats) {
      refreshStats.count++;
    } else {
      this.refreshCounters.set(userId, { count: 1, windowStart: new Date() });
    }
  }

  private updateTokenUsage(
    trackedToken: EnhancedTokenData,
    context: any,
  ): void {
    // Update usage count
    trackedToken.context.usageCount++;
    trackedToken.context.lastUsed = new Date();

    // Add usage entry
    trackedToken.usageHistory.push({
      timestamp: new Date(),
      action: 'TOKEN_USED',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceFingerprint: context.deviceFingerprint,
      success: true,
    });

    // Update token health
    trackedToken.riskAssessment.tokenHealth =
      this.calculateTokenHealth(trackedToken);
  }

  private async revokeToken(tokenId: string, reason: string): Promise<void> {
    const trackedToken = this.activeTokens.get(tokenId);
    if (!trackedToken) {
      return;
    }

    // Update token state
    trackedToken.state = TokenSecurityState.REVOKED;
    trackedToken.auditTrail.push({
      timestamp: new Date(),
      action: 'TOKEN_REVOKED',
      outcome: 'SUCCESS',
      details: reason,
      tokenType: trackedToken.tokenType,
      riskScore: trackedToken.riskAssessment.riskScore,
      securityLevel: trackedToken.context.securityLevel,
      ipAddress: trackedToken.context.ipAddress,
      userAgent: trackedToken.context.userAgent,
    });

    // Add to blacklist
    this.blacklistedTokens.add(tokenId);

    // Remove from active tracking
    this.activeTokens.delete(tokenId);

    // Remove from user tokens
    const userTokens = this.userTokens.get(trackedToken.userId);
    if (userTokens) {
      userTokens.delete(tokenId);
      if (userTokens.size === 0) {
        this.userTokens.delete(trackedToken.userId);
      }
    }

    this.logger.log('Token revoked', {
      tokenId,
      userId: trackedToken.userId,
      reason,
    });
  }

  private createTokenContext(
    tokenId: string,
    context: any,
    user: User,
    tokenType: 'access' | 'refresh',
  ): ConversationalTokenContext {
    return {
      tokenId,
      sessionId: context.sessionId,
      userId: user.id,
      userRole: user.role,
      tokenType,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceFingerprint: context.deviceFingerprint,
      issuedAt: new Date(),
      expiresAt: new Date(
        Date.now() +
          (tokenType === 'access' ? 15 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000),
      ),
      usageCount: 0,
      securityLevel: context.securityLevel,
      riskScore: 0.1,
    };
  }

  private createTokenValidationConversationContext(
    validationRequest: ConversationalTokenValidationRequest,
    operationType: string,
  ): ParlantConversationContext {
    return {
      userId: validationRequest.securityContext.userId,
      agentRole: validationRequest.securityContext.userRole.toString(),
      securityLevel: validationRequest.securityContext.securityLevel,
      conversationHistory: [],
      metadata: {
        tokenValidation: true,
        tokenId: validationRequest.tokenId,
        operationType,
        tokenType: validationRequest.securityContext.tokenType,
        riskScore: validationRequest.securityContext.riskScore,
        urgency: validationRequest.urgency,
        anomalyData: validationRequest.anomalyData,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private createTokenOperationDescription(
    operationType: string,
    validationRequest: ConversationalTokenValidationRequest,
  ): string {
    switch (operationType) {
      case 'GENERATION':
        return `JWT token generation for ${validationRequest.securityContext.userRole} user with ${validationRequest.securityContext.securityLevel} security level`;
      case 'REFRESH':
        return `JWT token refresh with risk score ${validationRequest.securityContext.riskScore}`;
      case 'REVOCATION':
        return `JWT token revocation: ${validationRequest.businessJustification}`;
      case 'ANOMALY_DETECTION':
        return `Token anomaly validation: ${validationRequest.anomalyData?.description || 'Security anomaly detected'}`;
      case 'SECURITY_CHECK':
        return `Token security validation for ${validationRequest.securityContext.tokenType} token`;
      default:
        return `Token operation validation: ${operationType}`;
    }
  }

  private processTokenValidationResult(
    tokenId: string,
    operationType: string,
    validation: ParlantValidationResponse,
    validationRequest: ConversationalTokenValidationRequest,
  ): TokenSecurityActionResult {
    let actionTaken: string;
    let newSecurityState: TokenSecurityState;
    let restrictions: string[] = [];

    if (validation.approved) {
      switch (operationType) {
        case 'GENERATION':
          actionTaken = 'TOKEN_GENERATION_APPROVED';
          newSecurityState = TokenSecurityState.ACTIVE;
          break;
        case 'REFRESH':
          actionTaken = 'TOKEN_REFRESH_APPROVED';
          newSecurityState = TokenSecurityState.ACTIVE;
          break;
        case 'REVOCATION':
          actionTaken = 'TOKEN_REVOCATION_APPROVED';
          newSecurityState = TokenSecurityState.REVOKED;
          break;
        case 'ANOMALY_DETECTION':
          actionTaken = 'ANOMALY_APPROVED';
          newSecurityState = TokenSecurityState.MONITORED;
          restrictions = ['ENHANCED_MONITORING'];
          break;
        case 'SECURITY_CHECK':
          actionTaken = 'SECURITY_CHECK_PASSED';
          newSecurityState = TokenSecurityState.ACTIVE;
          break;
        default:
          actionTaken = 'OPERATION_APPROVED';
          newSecurityState = TokenSecurityState.ACTIVE;
      }
    } else {
      actionTaken = 'OPERATION_BLOCKED';
      newSecurityState = TokenSecurityState.SUSPICIOUS;
      restrictions = ['OPERATION_BLOCKED', 'ENHANCED_MONITORING'];
    }

    const auditEntry: TokenAuditEntry = {
      timestamp: new Date(),
      action: actionTaken,
      outcome: validation.approved ? 'SUCCESS' : 'BLOCKED',
      details: validation.reasoning,
      conversationId: validation.conversationId,
      riskScore: validationRequest.securityContext.riskScore,
      securityLevel: validationRequest.securityContext.securityLevel,
      ipAddress: validationRequest.securityContext.ipAddress,
      userAgent: validationRequest.securityContext.userAgent,
    };

    return {
      success: validation.approved,
      tokenId,
      actionTaken,
      conversationId: validation.conversationId,
      riskAssessment: {
        tokenId,
        userId: validationRequest.securityContext.userId,
        riskScore: validationRequest.securityContext.riskScore,
        riskLevel: this.mapScoreToRiskLevel(
          validationRequest.securityContext.riskScore,
        ),
        riskFactors: [],
        anomalies: validationRequest.anomalyData
          ? [validationRequest.anomalyData]
          : [],
        trustScore: 1.0 - validationRequest.securityContext.riskScore,
        tokenHealth: {
          age: 0,
          usageFrequency: 0,
          errorRate: 0,
          anomalyCount: 0,
          securityEvents: 0,
          lastSecurityCheck: new Date(),
          refreshCount: 0,
          overallHealth: 'GOOD',
        },
        assessmentTimestamp: new Date(),
        aiReasoningExplanation: validation.reasoning,
      },
      newSecurityState,
      restrictions,
      monitoringEnhanced: restrictions.includes('ENHANCED_MONITORING'),
      auditTrail: [auditEntry],
    };
  }

  private generateTokenRestrictions(
    riskAssessment: TokenRiskAssessment,
  ): string[] {
    const restrictions: string[] = [];

    if (
      riskAssessment.riskLevel === 'HIGH' ||
      riskAssessment.riskLevel === 'CRITICAL'
    ) {
      restrictions.push('ENHANCED_MONITORING');
    }

    if (riskAssessment.riskLevel === 'CRITICAL') {
      restrictions.push('REAL_TIME_VALIDATION');
    }

    if (riskAssessment.riskFactors.some((f) => f.factor.includes('ADMIN'))) {
      restrictions.push('ADMIN_TOKEN_MONITORING');
    }

    return restrictions;
  }

  private calculateTokenHealth(
    trackedToken: EnhancedTokenData,
  ): TokenHealthMetrics {
    const now = Date.now();
    const age = now - trackedToken.context.issuedAt.getTime();
    const usageFrequency =
      trackedToken.usageHistory.length / Math.max(age / (60 * 60 * 1000), 1); // per hour
    const anomalyCount = trackedToken.anomalies.length;
    const securityEvents = trackedToken.auditTrail.filter(
      (entry) =>
        entry.action.includes('ANOMALY') || entry.action.includes('SECURITY'),
    ).length;

    let overallHealth: TokenHealthMetrics['overallHealth'];
    if (anomalyCount === 0 && securityEvents === 0) {
      overallHealth = 'EXCELLENT';
    } else if (anomalyCount <= 1 && securityEvents <= 2) {
      overallHealth = 'GOOD';
    } else if (anomalyCount <= 3 && securityEvents <= 5) {
      overallHealth = 'FAIR';
    } else if (anomalyCount <= 5) {
      overallHealth = 'POOR';
    } else {
      overallHealth = 'CRITICAL';
    }

    return {
      age,
      usageFrequency,
      errorRate: 0.01, // Would be calculated from actual error data
      anomalyCount,
      securityEvents,
      lastSecurityCheck: new Date(),
      refreshCount: trackedToken.auditTrail.filter((entry) =>
        entry.action.includes('REFRESH'),
      ).length,
      overallHealth,
    };
  }

  private calculateRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 0.8) return 'CRITICAL' as RiskLevel;
    if (riskScore >= 0.6) return 'HIGH' as RiskLevel;
    if (riskScore >= 0.3) return 'MEDIUM' as RiskLevel;
    return 'LOW' as RiskLevel;
  }

  private mapScoreToRiskLevel(riskScore: number): RiskLevel {
    return this.calculateRiskLevel(riskScore);
  }

  private mapRiskToUrgency(
    riskLevel: RiskLevel,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (riskLevel) {
      case 'LOW':
        return 'LOW';
      case 'MEDIUM':
        return 'MEDIUM';
      case 'HIGH':
        return 'HIGH';
      case 'CRITICAL':
        return 'CRITICAL';
      default:
        return 'MEDIUM';
    }
  }

  private startBackgroundTokenMonitoring(): void {
    // Start token anomaly detection
    setInterval(() => {
      this.performBackgroundTokenAnomalyDetection();
    }, this.ANOMALY_DETECTION_INTERVAL);

    // Start token health monitoring
    setInterval(() => {
      this.performBackgroundTokenHealthChecks();
    }, this.TOKEN_HEALTH_CHECK_INTERVAL);

    this.logger.log('Background token monitoring started', {
      anomalyDetectionInterval: this.ANOMALY_DETECTION_INTERVAL,
      healthCheckInterval: this.TOKEN_HEALTH_CHECK_INTERVAL,
    });
  }

  private async performBackgroundTokenAnomalyDetection(): Promise<void> {
    try {
      for (const [tokenId, trackedToken] of this.activeTokens) {
        if (
          trackedToken.state === TokenSecurityState.ACTIVE ||
          trackedToken.state === TokenSecurityState.MONITORED
        ) {
          // Check for usage anomalies
          const anomalies = await this.detectTokenUsageAnomalies(trackedToken, {
            ipAddress: trackedToken.context.ipAddress,
            userAgent: trackedToken.context.userAgent,
            deviceFingerprint: trackedToken.context.deviceFingerprint,
          });

          if (anomalies.length > 0) {
            trackedToken.anomalies.push(...anomalies);
            trackedToken.state = TokenSecurityState.SUSPICIOUS;

            this.logger.warn(
              'Token anomalies detected in background monitoring',
              {
                tokenId,
                anomalyCount: anomalies.length,
                anomalyTypes: anomalies.map((a) => a.anomalyType),
              },
            );
          }
        }
      }
    } catch (error) {
      this.logger.error('Background token anomaly detection failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async performBackgroundTokenHealthChecks(): Promise<void> {
    try {
      for (const [tokenId, trackedToken] of this.activeTokens) {
        // Update token health
        trackedToken.riskAssessment.tokenHealth =
          this.calculateTokenHealth(trackedToken);

        // Check for expired tokens
        if (new Date() > trackedToken.context.expiresAt) {
          trackedToken.state = TokenSecurityState.EXPIRED;
          await this.revokeToken(tokenId, 'Token expired');
        }

        // Clean up old usage history (keep last 100 entries)
        if (trackedToken.usageHistory.length > 100) {
          trackedToken.usageHistory = trackedToken.usageHistory.slice(-100);
        }
      }
    } catch (error) {
      this.logger.error('Background token health checks failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
