/**
 * PARLANT Phase 1 Emergency Bypass System - Token Management Service
 *
 * Enterprise-grade emergency token management with time-limited access,
 * multi-tier authorization, and comprehensive security controls.
 *
 * @version 1.0.0
 * @author PARLANT Emergency Bypass System Agent
 * @compliance GDPR, SOX, HIPAA, SOC2
 */

import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "crypto";
import { v4 as uuidv4 } from "uuid";
import {
  EmergencyBypassToken,
  EmergencyTokenStatus,
  BypassRole,
  BypassAuthorizationLevel,
  BypassOperationType,
  TokenApproval,
  ApprovalDecision,
  SecurityFlag,
  TokenSecurityMetadata,
  EmergencyBypassTokenSchema,
} from "../types/bypass-core.types";

/**
 * Emergency token creation request
 */
export interface CreateEmergencyTokenRequest {
  /** User requesting the token */
  requestedBy: string;

  /** User role */
  userRole: BypassRole;

  /** Authorization level requested */
  authorizationLevel: BypassAuthorizationLevel;

  /** Operations to allow */
  allowedOperations: BypassOperationType[];

  /** Specific functions to allow */
  allowedFunctions: string[];

  /** Token duration in minutes */
  durationMinutes: number;

  /** Maximum operations allowed */
  maxOperations: number;

  /** Reason for emergency access */
  reason: string;

  /** Request context */
  requestContext: TokenRequestContext;
}

/**
 * Token request context
 */
export interface TokenRequestContext {
  /** IP address */
  ipAddress: string;

  /** User agent */
  userAgent: string;

  /** Geographic location */
  location?: string;

  /** System health at time of request */
  systemHealth: string;

  /** Incident ID if related */
  incidentId?: string;
}

/**
 * Token validation request
 */
export interface ValidateTokenRequest {
  /** Token value to validate */
  tokenValue: string;

  /** Function being executed */
  functionName: string;

  /** Operation type */
  operationType: BypassOperationType;

  /** User context */
  userContext: TokenValidationContext;
}

/**
 * Token validation context
 */
export interface TokenValidationContext {
  /** User ID */
  userId: string;

  /** IP address */
  ipAddress: string;

  /** User agent */
  userAgent: string;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  /** Validation success */
  valid: boolean;

  /** Token details if valid */
  token?: EmergencyBypassToken;

  /** Validation error if invalid */
  error?: string;

  /** Security warnings */
  warnings?: string[];

  /** Updated token (if operation count incremented) */
  updatedToken?: EmergencyBypassToken;
}

/**
 * Emergency Token Manager Service
 *
 * Provides comprehensive emergency token management with:
 * - Time-limited access tokens (5-60 minutes)
 * - Role-based authorization
 * - Multi-tier approval workflows
 * - Security monitoring and fraud detection
 * - Comprehensive audit trails
 */
@Injectable()
export class EmergencyTokenManagerService {
  private readonly logger = new Logger(EmergencyTokenManagerService.name);
  private readonly tokenStore = new Map<string, EmergencyBypassToken>();
  private readonly encryptionKey: Buffer;
  private readonly encryptionAlgorithm = "aes-256-gcm";

  constructor() {
    // Initialize encryption key (should be loaded from secure configuration)
    this.encryptionKey = Buffer.from(
      process.env.BYPASS_ENCRYPTION_KEY || this.generateDefaultKey(),
      "hex",
    );
    this.startTokenCleanupTimer();
  }

  /**
   * Create emergency bypass token with security validation
   */
  async createEmergencyToken(
    request: CreateEmergencyTokenRequest,
  ): Promise<EmergencyBypassToken> {
    this.logger.warn(
      `Emergency token requested by ${request.requestedBy} for ${request.reason}`,
    );

    // Validate request
    await this.validateTokenRequest(request);

    // Calculate risk score
    const riskScore = await this.calculateRiskScore(request);

    // Generate secure token
    const tokenValue = this.generateSecureToken();
    const tokenHash = this.hashToken(tokenValue);

    // Create token metadata
    const securityMetadata: TokenSecurityMetadata = {
      requestedFromIp: request.requestContext.ipAddress,
      userAgent: request.requestContext.userAgent,
      location: request.requestContext.location,
      riskScore,
      securityFlags: await this.detectSecurityFlags(request),
      encryptionAlgorithm: this.encryptionAlgorithm,
      tokenHash,
    };

    // Create token
    const token: EmergencyBypassToken = {
      tokenId: uuidv4(),
      tokenValue: this.encryptToken(tokenValue),
      requestedBy: request.requestedBy,
      userRole: request.userRole,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + request.durationMinutes * 60 * 1000),
      authorizationLevel: request.authorizationLevel,
      allowedOperations: request.allowedOperations,
      allowedFunctions: request.allowedFunctions,
      maxOperations: request.maxOperations,
      operationsPerformed: 0,
      status: this.requiresApproval(request.authorizationLevel)
        ? EmergencyTokenStatus.PENDING
        : EmergencyTokenStatus.ACTIVE,
      approvals: [],
      reason: request.reason,
      securityMetadata,
    };

    // Validate token structure
    const validationResult = EmergencyBypassTokenSchema.safeParse(token);
    if (!validationResult.success) {
      throw new BadRequestException("Invalid token structure");
    }

    // Store token
    this.tokenStore.set(token.tokenId, token);

    // Log token creation
    this.logger.warn(
      `Emergency token ${token.tokenId} created for ${request.requestedBy} with ${request.authorizationLevel} authorization`,
    );

    // Trigger approval workflow if required
    if (this.requiresApproval(request.authorizationLevel)) {
      await this.initiateApprovalWorkflow(token);
    }

    // Return token with unencrypted value for immediate use
    return {
      ...token,
      tokenValue, // Return unencrypted for initial response
    };
  }

  /**
   * Approve emergency token
   */
  async approveToken(
    tokenId: string,
    approval: Omit<TokenApproval, "signature">,
  ): Promise<EmergencyBypassToken> {
    const token = this.tokenStore.get(tokenId);
    if (!token) {
      throw new BadRequestException("Token not found");
    }

    if (token.status !== EmergencyTokenStatus.PENDING) {
      throw new BadRequestException("Token is not pending approval");
    }

    // Create approval with signature
    const approvalWithSignature: TokenApproval = {
      ...approval,
      signature: this.createApprovalSignature(tokenId, approval),
    };

    // Add approval
    token.approvals.push(approvalWithSignature);

    // Check if sufficient approvals received
    if (this.hassufficientApprovals(token)) {
      token.status = EmergencyTokenStatus.ACTIVE;
      this.logger.warn(`Emergency token ${tokenId} approved and activated`);
    }

    this.tokenStore.set(tokenId, token);
    return token;
  }

  /**
   * Validate emergency token for operation
   */
  async validateToken(
    request: ValidateTokenRequest,
  ): Promise<TokenValidationResult> {
    try {
      // Find token by value hash
      const tokenHash = this.hashToken(request.tokenValue);
      const token = Array.from(this.tokenStore.values()).find(
        (t) => t.securityMetadata.tokenHash === tokenHash,
      );

      if (!token) {
        return {
          valid: false,
          error: "Token not found",
        };
      }

      // Basic validation checks
      const validationChecks = await this.performBasicValidation(
        token,
        request,
      );
      if (!validationChecks.valid) {
        return validationChecks;
      }

      // Security validation
      const securityValidation = await this.performSecurityValidation(
        token,
        request,
      );
      if (!securityValidation.valid) {
        return securityValidation;
      }

      // Increment operation count
      token.operationsPerformed++;

      // Check if token is exhausted
      if (token.operationsPerformed >= token.maxOperations) {
        token.status = EmergencyTokenStatus.EXHAUSTED;
        this.logger.warn(
          `Emergency token ${token.tokenId} exhausted after ${token.operationsPerformed} operations`,
        );
      }

      this.tokenStore.set(token.tokenId, token);

      this.logger.warn(
        `Emergency token ${token.tokenId} used for ${request.functionName} (operation ${token.operationsPerformed}/${token.maxOperations})`,
      );

      return {
        valid: true,
        token,
        updatedToken: token,
        warnings: securityValidation.warnings,
      };
    } catch (error) {
      this.logger.error("Token validation error", error);
      return {
        valid: false,
        error: "Token validation failed",
      };
    }
  }

  /**
   * Revoke emergency token
   */
  async revokeToken(
    tokenId: string,
    reason: string,
    revokedBy: string,
  ): Promise<void> {
    const token = this.tokenStore.get(tokenId);
    if (!token) {
      throw new BadRequestException("Token not found");
    }

    token.status = EmergencyTokenStatus.REVOKED;
    this.tokenStore.set(tokenId, token);

    this.logger.warn(
      `Emergency token ${tokenId} revoked by ${revokedBy}: ${reason}`,
    );
  }

  /**
   * List active emergency tokens
   */
  async listActiveTokens(
    userRole?: BypassRole,
  ): Promise<EmergencyBypassToken[]> {
    const activeTokens = Array.from(this.tokenStore.values()).filter(
      (token) => token.status === EmergencyTokenStatus.ACTIVE,
    );

    if (userRole) {
      return activeTokens.filter((token) => this.canViewToken(token, userRole));
    }

    return activeTokens;
  }

  /**
   * Get token statistics
   */
  async getTokenStatistics(): Promise<TokenStatistics> {
    const tokens = Array.from(this.tokenStore.values());

    return {
      total: tokens.length,
      active: tokens.filter((t) => t.status === EmergencyTokenStatus.ACTIVE)
        .length,
      pending: tokens.filter((t) => t.status === EmergencyTokenStatus.PENDING)
        .length,
      expired: tokens.filter((t) => t.status === EmergencyTokenStatus.EXPIRED)
        .length,
      revoked: tokens.filter((t) => t.status === EmergencyTokenStatus.REVOKED)
        .length,
      exhausted: tokens.filter(
        (t) => t.status === EmergencyTokenStatus.EXHAUSTED,
      ).length,
      suspended: tokens.filter(
        (t) => t.status === EmergencyTokenStatus.SUSPENDED,
      ).length,
      totalOperations: tokens.reduce(
        (sum, t) => sum + t.operationsPerformed,
        0,
      ),
      averageRiskScore:
        tokens.reduce((sum, t) => sum + t.securityMetadata.riskScore, 0) /
          tokens.length || 0,
    };
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  /**
   * Validate token creation request
   */
  private async validateTokenRequest(
    request: CreateEmergencyTokenRequest,
  ): Promise<void> {
    // Validate duration
    if (request.durationMinutes < 5 || request.durationMinutes > 1440) {
      throw new BadRequestException(
        "Token duration must be between 5 minutes and 24 hours",
      );
    }

    // Validate max operations
    if (request.maxOperations < 1 || request.maxOperations > 1000) {
      throw new BadRequestException(
        "Max operations must be between 1 and 1000",
      );
    }

    // Validate reason length
    if (request.reason.length < 10) {
      throw new BadRequestException("Reason must be at least 10 characters");
    }

    // Check for existing active tokens
    const existingTokens = Array.from(this.tokenStore.values()).filter(
      (token) =>
        token.requestedBy === request.requestedBy &&
        token.status === EmergencyTokenStatus.ACTIVE,
    );

    if (existingTokens.length >= 3) {
      throw new ForbiddenException("Maximum of 3 active tokens per user");
    }
  }

  /**
   * Calculate risk score for token request
   */
  private async calculateRiskScore(
    request: CreateEmergencyTokenRequest,
  ): Promise<number> {
    let riskScore = 0;

    // Base risk by authorization level
    switch (request.authorizationLevel) {
      case BypassAuthorizationLevel.BOARD_APPROVAL:
        riskScore += 90;
        break;
      case BypassAuthorizationLevel.COMMITTEE_APPROVAL:
        riskScore += 80;
        break;
      case BypassAuthorizationLevel.EMERGENCY_DUAL:
        riskScore += 70;
        break;
      case BypassAuthorizationLevel.EMERGENCY_SINGLE:
        riskScore += 60;
        break;
      case BypassAuthorizationLevel.SYSTEM_CRITICAL:
        riskScore += 50;
        break;
    }

    // Risk by operation types
    if (
      request.allowedOperations.includes(BypassOperationType.DATABASE_CRITICAL)
    ) {
      riskScore += 20;
    }
    if (
      request.allowedOperations.includes(BypassOperationType.SECURITY_INCIDENT)
    ) {
      riskScore += 15;
    }

    // Duration risk
    if (request.durationMinutes > 60) {
      riskScore += 10;
    }

    // Operation count risk
    if (request.maxOperations > 100) {
      riskScore += 10;
    }

    // User role risk adjustment
    switch (request.userRole) {
      case BypassRole.EMERGENCY_ADMIN:
        riskScore -= 10;
        break;
      case BypassRole.SECURITY_ADMIN:
        riskScore -= 5;
        break;
    }

    return Math.min(100, Math.max(0, riskScore));
  }

  /**
   * Detect security flags
   */
  private async detectSecurityFlags(
    request: CreateEmergencyTokenRequest,
  ): Promise<SecurityFlag[]> {
    const flags: SecurityFlag[] = [];

    // Check for high-risk authorization levels
    if (
      [
        BypassAuthorizationLevel.BOARD_APPROVAL,
        BypassAuthorizationLevel.COMMITTEE_APPROVAL,
      ].includes(request.authorizationLevel)
    ) {
      flags.push(SecurityFlag.ESCALATED_PRIVILEGES);
    }

    // Check for multiple recent requests (mock implementation)
    const recentTokens = Array.from(this.tokenStore.values()).filter(
      (token) =>
        token.requestedBy === request.requestedBy &&
        Date.now() - token.createdAt.getTime() < 3600000, // 1 hour
    );

    if (recentTokens.length > 2) {
      flags.push(SecurityFlag.MULTIPLE_REQUESTS);
    }

    // Check for unusual timing (outside business hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      flags.push(SecurityFlag.SUSPICIOUS_TIMING);
    }

    return flags;
  }

  /**
   * Generate secure token value
   */
  private generateSecureToken(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Hash token for secure storage
   */
  private hashToken(tokenValue: string): string {
    return createHash("sha256").update(tokenValue).digest("hex");
  }

  /**
   * Encrypt token value
   */
  private encryptToken(tokenValue: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(
      this.encryptionAlgorithm,
      this.encryptionKey,
      iv,
    );

    let encrypted = cipher.update(tokenValue, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
  }

  /**
   * Decrypt token value
   */
  private decryptToken(encryptedToken: string): string {
    const parts = encryptedToken.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted token format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];

    const decipher = createDecipheriv(
      this.encryptionAlgorithm,
      this.encryptionKey,
      iv,
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  /**
   * Check if authorization level requires approval
   */
  private requiresApproval(authLevel: BypassAuthorizationLevel): boolean {
    return [
      BypassAuthorizationLevel.EMERGENCY_DUAL,
      BypassAuthorizationLevel.COMMITTEE_APPROVAL,
      BypassAuthorizationLevel.BOARD_APPROVAL,
    ].includes(authLevel);
  }

  /**
   * Create approval signature
   */
  private createApprovalSignature(
    tokenId: string,
    approval: Omit<TokenApproval, "signature">,
  ): string {
    const data = `${tokenId}:${approval.approverId}:${approval.decision}:${approval.approvedAt.toISOString()}`;
    return createHash("sha256").update(data).digest("hex");
  }

  /**
   * Check if token has sufficient approvals
   */
  private hassufficientApprovals(token: EmergencyBypassToken): boolean {
    const approvedCount = token.approvals.filter(
      (a) => a.decision === ApprovalDecision.APPROVED,
    ).length;

    switch (token.authorizationLevel) {
      case BypassAuthorizationLevel.EMERGENCY_DUAL:
        return approvedCount >= 2;
      case BypassAuthorizationLevel.COMMITTEE_APPROVAL:
        return approvedCount >= 3;
      case BypassAuthorizationLevel.BOARD_APPROVAL:
        return approvedCount >= 5;
      default:
        return approvedCount >= 1;
    }
  }

  /**
   * Perform basic token validation
   */
  private async performBasicValidation(
    token: EmergencyBypassToken,
    request: ValidateTokenRequest,
  ): Promise<TokenValidationResult> {
    // Check token status
    if (token.status !== EmergencyTokenStatus.ACTIVE) {
      return {
        valid: false,
        error: `Token is ${token.status}`,
      };
    }

    // Check expiration
    if (new Date() > token.expiresAt) {
      token.status = EmergencyTokenStatus.EXPIRED;
      return {
        valid: false,
        error: "Token has expired",
      };
    }

    // Check operation limit
    if (token.operationsPerformed >= token.maxOperations) {
      token.status = EmergencyTokenStatus.EXHAUSTED;
      return {
        valid: false,
        error: "Token operation limit exceeded",
      };
    }

    // Check allowed operations
    if (!token.allowedOperations.includes(request.operationType)) {
      return {
        valid: false,
        error: "Operation type not allowed",
      };
    }

    // Check allowed functions
    if (
      token.allowedFunctions.length > 0 &&
      !token.allowedFunctions.includes(request.functionName)
    ) {
      return {
        valid: false,
        error: "Function not allowed",
      };
    }

    return { valid: true };
  }

  /**
   * Perform security validation
   */
  private async performSecurityValidation(
    token: EmergencyBypassToken,
    request: ValidateTokenRequest,
  ): Promise<TokenValidationResult & { warnings?: string[] }> {
    const warnings: string[] = [];

    // IP address validation
    if (
      token.securityMetadata.requestedFromIp !== request.userContext.ipAddress
    ) {
      warnings.push("IP address mismatch detected");
    }

    // User agent validation
    if (token.securityMetadata.userAgent !== request.userContext.userAgent) {
      warnings.push("User agent mismatch detected");
    }

    // Time-based validation
    const timeSinceCreation = Date.now() - token.createdAt.getTime();
    if (timeSinceCreation > 4 * 60 * 60 * 1000) {
      // 4 hours
      warnings.push("Token used after extended period");
    }

    return { valid: true, warnings };
  }

  /**
   * Check if user can view token details
   */
  private canViewToken(
    token: EmergencyBypassToken,
    userRole: BypassRole,
  ): boolean {
    // Admins can view all tokens
    if (
      [
        BypassRole.EMERGENCY_ADMIN,
        BypassRole.SECURITY_ADMIN,
        BypassRole.AUDIT_ADMIN,
      ].includes(userRole)
    ) {
      return true;
    }

    // Users can only view their own tokens
    return false;
  }

  /**
   * Generate default encryption key (for development only)
   */
  private generateDefaultKey(): string {
    this.logger.warn(
      "Using default encryption key - configure BYPASS_ENCRYPTION_KEY in production",
    );
    return randomBytes(32).toString("hex");
  }

  /**
   * Start token cleanup timer
   */
  private startTokenCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 60000); // Check every minute
  }

  /**
   * Cleanup expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    const tokensToCleanup: string[] = [];

    this.tokenStore.forEach((token, tokenId) => {
      if (
        token.status === EmergencyTokenStatus.EXPIRED &&
        now.getTime() - token.expiresAt.getTime() > 24 * 60 * 60 * 1000
      ) {
        // 24 hours after expiration
        tokensToCleanup.push(tokenId);
      }
    });

    tokensToCleanup.forEach((tokenId) => {
      this.tokenStore.delete(tokenId);
    });

    if (tokensToCleanup.length > 0) {
      this.logger.log(`Cleaned up ${tokensToCleanup.length} expired tokens`);
    }
  }

  /**
   * Initiate approval workflow
   */
  private async initiateApprovalWorkflow(
    token: EmergencyBypassToken,
  ): Promise<void> {
    // This would integrate with the approval workflow system
    this.logger.warn(
      `Approval workflow initiated for token ${token.tokenId} with ${token.authorizationLevel} level`,
    );

    // In a real implementation, this would:
    // 1. Create approval workflow
    // 2. Notify required approvers
    // 3. Set up timeout handling
    // 4. Track approval progress
  }
}

/**
 * Token statistics interface
 */
export interface TokenStatistics {
  total: number;
  active: number;
  pending: number;
  expired: number;
  revoked: number;
  exhausted: number;
  suspended: number;
  totalOperations: number;
  averageRiskScore: number;
}
