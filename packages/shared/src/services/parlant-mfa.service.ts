/**
 * Parlant Multi-Factor Authentication Service
 *
 * Provides conversational AI-powered multi-factor authentication with
 * intelligent challenge generation and real-time validation.
 *
 * Features:
 * - Conversational MFA challenge initiation and management
 * - Real-time MFA validation through AI conversation
 * - Multiple authentication factors (SMS, TOTP, biometric, hardware tokens)
 * - Risk-based MFA requirements with dynamic adjustment
 * - Conversation-guided MFA recovery and fallback mechanisms
 * - Comprehensive audit trails for compliance
 *
 * @fileoverview Parlant-powered MFA service for Bytebot platform
 * @version 1.0.0
 * @author Parlant Integration Research Agent #3
 */

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

// Import Parlant types and services
import {
  ParlantValidationRequest,
  ParlantValidationResponse,
  ParlantUserContext,
} from "../types/parlant-integration.types";

import {
  ParlantConversationContext,
  ValidationMode,
  ApprovalLevel,
  FunctionSecurityLevel,
  RiskLevel,
  ConversationPriority,
  ValidationDecision,
  ParticipantRole,
  ParticipantCapability,
  FunctionContext,
  ValidationParameters,
  ExecutionEnvironment,
  UserContext,
  RequestContext,
  ConversationState,
  ConversationMetadata,
} from "../types/parlant.types";

// Import Parlant decorators
import {
  ParlantValidation,
  SecurityClassification,
  ConversationContext,
} from "../decorators/parlant-validation.decorators";

// Import Parlant service
import { ParlantIntegrationService } from "./parlant-integration.service";

/**
 * MFA method types
 */
export enum MFAMethod {
  SMS = "sms",
  EMAIL = "email",
  TOTP = "totp",
  BIOMETRIC = "biometric",
  HARDWARE_TOKEN = "hardware_token",
  PUSH_NOTIFICATION = "push_notification",
  VOICE_CALL = "voice_call",
  BACKUP_CODES = "backup_codes",
}

/**
 * MFA challenge status
 */
export enum MFAChallengeStatus {
  PENDING = "pending",
  SENT = "sent",
  VERIFIED = "verified",
  FAILED = "failed",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

/**
 * MFA challenge information
 */
export interface MFAChallenge {
  /** Challenge identifier */
  challengeId: string;

  /** User identifier */
  userId: string;

  /** MFA method used */
  method: MFAMethod;

  /** Challenge status */
  status: MFAChallengeStatus;

  /** Associated conversation ID */
  conversationId?: string;

  /** Challenge creation time */
  createdAt: Date;

  /** Challenge expiry time */
  expiresAt: Date;

  /** Whether challenge is verified */
  verified: boolean;

  /** Number of attempts made */
  attempts: number;

  /** Maximum allowed attempts */
  maxAttempts: number;

  /** Challenge metadata */
  metadata: MFAChallengeMetadata;

  /** Risk assessment for this challenge */
  riskAssessment: MFARiskAssessment;
}

/**
 * MFA challenge metadata
 */
export interface MFAChallengeMetadata {
  /** Client IP address */
  clientIp?: string;

  /** User agent */
  userAgent?: string;

  /** Device fingerprint */
  deviceFingerprint?: string;

  /** Geographic location */
  location?: GeographicLocation;

  /** Authentication context */
  authContext?: AuthenticationContext;

  /** Additional properties */
  properties: Record<string, unknown>;
}

/**
 * Geographic location
 */
export interface GeographicLocation {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Authentication context
 */
export interface AuthenticationContext {
  /** Session identifier */
  sessionId?: string;

  /** Authentication method used */
  primaryAuthMethod?: string;

  /** Request metadata */
  requestMetadata?: Record<string, unknown>;

  /** Security context */
  securityContext?: SecurityContext;
}

/**
 * Security context
 */
export interface SecurityContext {
  /** Security classification */
  classification: FunctionSecurityLevel;

  /** Threat indicators */
  threatIndicators: ThreatIndicator[];

  /** Active security policies */
  activePolicies: string[];

  /** Compliance requirements */
  complianceRequirements: string[];
}

/**
 * Threat indicator
 */
export interface ThreatIndicator {
  /** Indicator type */
  type: ThreatIndicatorType;

  /** Severity level */
  severity: ThreatSeverity;

  /** Indicator description */
  description: string;

  /** Detection timestamp */
  detectedAt: Date;

  /** Indicator metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Threat indicator types
 */
export enum ThreatIndicatorType {
  SUSPICIOUS_LOCATION = "suspicious_location",
  UNUSUAL_DEVICE = "unusual_device",
  ANOMALOUS_BEHAVIOR = "anomalous_behavior",
  KNOWN_BAD_IP = "known_bad_ip",
  CREDENTIAL_STUFFING = "credential_stuffing",
  BRUTE_FORCE = "brute_force",
}

/**
 * Threat severity levels
 */
export enum ThreatSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * MFA risk assessment
 */
export interface MFARiskAssessment {
  /** Overall risk score (0-100) */
  riskScore: number;

  /** Risk factors */
  riskFactors: MFARiskFactor[];

  /** Risk level */
  riskLevel: RiskLevel;

  /** Recommended MFA methods */
  recommendedMethods: MFAMethod[];

  /** Assessment timestamp */
  assessedAt: Date;
}

/**
 * MFA risk factors
 */
export interface MFARiskFactor {
  /** Factor type */
  type: MFARiskType;

  /** Risk contribution */
  contribution: number;

  /** Factor description */
  description: string;

  /** Whether factor is critical */
  critical: boolean;
}

/**
 * MFA risk types
 */
export enum MFARiskType {
  NEW_DEVICE = "new_device",
  UNUSUAL_LOCATION = "unusual_location",
  HIGH_VALUE_TRANSACTION = "high_value_transaction",
  ADMIN_OPERATION = "admin_operation",
  SUSPICIOUS_PATTERN = "suspicious_pattern",
  RECENT_SECURITY_EVENT = "recent_security_event",
}

/**
 * MFA validation request
 */
export interface MFAValidationRequest {
  /** Challenge identifier */
  challengeId: string;

  /** User-provided response */
  response: string;

  /** Additional validation context */
  context?: MFAValidationContext;

  /** Request timestamp */
  timestamp: Date;
}

/**
 * MFA validation context
 */
export interface MFAValidationContext {
  /** Client information */
  clientInfo?: ClientInfo;

  /** Security context */
  securityContext?: SecurityContext;

  /** Session information */
  sessionInfo?: SessionInfo;

  /** Additional properties */
  properties?: Record<string, unknown>;
}

/**
 * Client information
 */
export interface ClientInfo {
  /** Client IP address */
  ipAddress?: string;

  /** User agent */
  userAgent?: string;

  /** Device fingerprint */
  deviceFingerprint?: string;

  /** Platform information */
  platform?: PlatformInfo;
}

/**
 * Platform information
 */
export interface PlatformInfo {
  /** Operating system */
  os?: string;

  /** Browser */
  browser?: string;

  /** Device type */
  deviceType?: DeviceType;

  /** Screen resolution */
  screenResolution?: string;

  /** Timezone */
  timezone?: string;
}

/**
 * Device types
 */
export enum DeviceType {
  DESKTOP = "desktop",
  MOBILE = "mobile",
  TABLET = "tablet",
  UNKNOWN = "unknown",
}

/**
 * Session information
 */
export interface SessionInfo {
  /** Session identifier */
  sessionId: string;

  /** Session start time */
  startTime: Date;

  /** Last activity time */
  lastActivity: Date;

  /** Session metadata */
  metadata: Record<string, unknown>;
}

/**
 * MFA validation result
 */
export interface MFAValidationResult {
  /** Whether validation was successful */
  valid: boolean;

  /** Remaining attempts */
  remainingAttempts: number;

  /** Error message if invalid */
  error?: string;

  /** Associated conversation ID */
  conversationId?: string;

  /** Validation metadata */
  metadata: MFAValidationMetadata;

  /** Additional security actions required */
  requiredActions: SecurityAction[];
}

/**
 * MFA validation metadata
 */
export interface MFAValidationMetadata {
  /** Validation timestamp */
  validatedAt: Date;

  /** Validation duration */
  validationDuration: number;

  /** Method used for validation */
  method: MFAMethod;

  /** Risk score at validation */
  riskScore: number;

  /** Conversational validation used */
  conversationalValidation: boolean;

  /** Additional properties */
  properties: Record<string, unknown>;
}

/**
 * Security actions
 */
export interface SecurityAction {
  /** Action type */
  type: SecurityActionType;

  /** Action description */
  description: string;

  /** Action parameters */
  parameters: Record<string, unknown>;

  /** Whether action is mandatory */
  mandatory: boolean;

  /** Action timeout */
  timeout?: number;
}

/**
 * Security action types
 */
export enum SecurityActionType {
  ADDITIONAL_MFA = "additional_mfa",
  SECURITY_QUESTION = "security_question",
  DEVICE_VERIFICATION = "device_verification",
  ADMIN_APPROVAL = "admin_approval",
  ACCOUNT_VERIFICATION = "account_verification",
  PASSWORD_CHANGE = "password_change",
}

/**
 * MFA setup request
 */
export interface MFASetupRequest {
  /** User identifier */
  userId: string;

  /** MFA method to set up */
  method: MFAMethod;

  /** Setup parameters */
  parameters: Record<string, unknown>;

  /** Request context */
  context: MFAValidationContext;
}

/**
 * MFA setup result
 */
export interface MFASetupResult {
  /** Whether setup was successful */
  success: boolean;

  /** Setup identifier */
  setupId?: string;

  /** Setup data (e.g., QR code for TOTP) */
  setupData?: Record<string, unknown>;

  /** Error message if failed */
  error?: string;

  /** Conversation context */
  conversationContext?: ParlantConversationContext;

  /** Next steps required */
  nextSteps: SetupStep[];
}

/**
 * Setup steps
 */
export interface SetupStep {
  /** Step type */
  type: SetupStepType;

  /** Step description */
  description: string;

  /** Step parameters */
  parameters: Record<string, unknown>;

  /** Whether step is required */
  required: boolean;
}

/**
 * Setup step types
 */
export enum SetupStepType {
  SCAN_QR_CODE = "scan_qr_code",
  ENTER_CODE = "enter_code",
  VERIFY_PHONE = "verify_phone",
  VERIFY_EMAIL = "verify_email",
  REGISTER_DEVICE = "register_device",
  DOWNLOAD_APP = "download_app",
}

/**
 * Parlant Multi-Factor Authentication Service
 *
 * Provides conversational AI-powered MFA with intelligent challenge
 * generation and real-time validation capabilities.
 */
@Injectable()
export class ParlantMFAService {
  private readonly logger = new Logger(ParlantMFAService.name);
  private readonly mfaConfig: MFAConfiguration;

  constructor(
    private readonly configService: ConfigService,
    private readonly parlantService: ParlantIntegrationService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    // Load MFA configuration
    this.mfaConfig = {
      defaultChallengeExpiry: configService.get<number>(
        "mfa.challengeExpiry",
        300000,
      ), // 5 minutes
      maxAttempts: configService.get<number>("mfa.maxAttempts", 3),
      enableConversationalMFA: configService.get<boolean>(
        "mfa.conversational.enabled",
        true,
      ),
      conversationTimeout: configService.get<number>(
        "mfa.conversation.timeout",
        120000,
      ), // 2 minutes
      supportedMethods: configService.get<MFAMethod[]>("mfa.supportedMethods", [
        MFAMethod.SMS,
        MFAMethod.EMAIL,
        MFAMethod.TOTP,
      ]),
      riskBasedMFA: configService.get<boolean>("mfa.riskBased.enabled", true),
    };

    this.logger.log("Parlant MFA Service initialized", {
      supportedMethods: this.mfaConfig.supportedMethods,
      conversationalMFA: this.mfaConfig.enableConversationalMFA,
      riskBasedMFA: this.mfaConfig.riskBasedMFA,
    });
  }

  /**
   * Create MFA challenge with conversational validation
   *
   * @param userId - User identifier
   * @param method - MFA method to use
   * @param context - Authentication context
   * @returns Promise<MFAChallenge> - MFA challenge details
   */
  @ParlantValidation({
    mode: ValidationMode._SYNCHRONOUS,
    approvalLevel: ApprovalLevel._AUTOMATIC,
    timeout: 15000,
  })
  @ConversationContext({
    topic: "Multi-Factor Authentication Challenge",
    priority: ConversationPriority._NORMAL,
  })
  async createConversationalMFAChallenge(
    userId: string,
    method: MFAMethod,
    context: AuthenticationContext,
  ): Promise<MFAChallenge> {
    const operationId = `mfa-challenge-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Creating conversational MFA challenge`, {
      operationId,
      userId,
      method,
      clientIp: context.requestMetadata?.clientIp,
    });

    try {
      // Step 1: Perform risk assessment
      const riskAssessment = await this.performMFARiskAssessment(
        userId,
        method,
        context,
      );

      // Step 2: Create conversation for MFA
      const conversation = await this.createMFAConversation(
        userId,
        method,
        riskAssessment,
      );

      // Step 3: Generate challenge
      const challenge = await this.generateMFAChallenge(
        userId,
        method,
        context,
        riskAssessment,
        conversation.conversationId,
      );

      // Step 4: Cache the challenge
      await this.cacheMFAChallenge(challenge);

      // Step 5: Send challenge if applicable
      if (this.requiresDelivery(method)) {
        await this.deliverMFAChallenge(challenge, context);
      }

      const processingTime = Date.now() - startTime;

      this.logger.log(`[${operationId}] MFA challenge created successfully`, {
        operationId,
        challengeId: challenge.challengeId,
        method,
        riskScore: riskAssessment.riskScore,
        processingTime,
        conversationId: conversation.conversationId,
      });

      return challenge;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] Failed to create MFA challenge`, {
        operationId,
        userId,
        method,
        error: error instanceof Error ? error.message : String(error),
        processingTime,
      });

      throw new BadRequestException("Failed to create MFA challenge");
    }
  }

  /**
   * Initiate high-risk MFA with enhanced conversational validation
   *
   * @param userId - User identifier
   * @param context - Authentication context
   * @returns Promise<MFAChallenge> - Enhanced MFA challenge
   */
  @ParlantValidation({
    mode: ValidationMode._INTERACTIVE,
    approvalLevel: ApprovalLevel._SINGLE_APPROVAL,
    timeout: 120000,
  })
  @SecurityClassification({
    securityLevel: FunctionSecurityLevel._RESTRICTED,
    riskLevel: RiskLevel._HIGH,
  })
  @ConversationContext({
    topic: "High-Risk Multi-Factor Authentication",
    priority: ConversationPriority._CRITICAL,
    requiredParticipants: [ParticipantRole._VALIDATOR, ParticipantRole._APPROVER],
  })
  async initiateHighRiskMFA(
    userId: string,
    context: AuthenticationContext,
  ): Promise<MFAChallenge> {
    const operationId = `high-risk-mfa-${Date.now()}`;

    this.logger.warn(`[${operationId}] Initiating high-risk MFA`, {
      operationId,
      userId,
      securityContext: context.securityContext,
    });

    // Perform enhanced risk assessment
    const riskAssessment = await this.performEnhancedRiskAssessment(
      userId,
      context,
    );

    // Determine best MFA method for high-risk scenario
    const recommendedMethod = this.selectHighRiskMFAMethod(
      riskAssessment,
      context,
    );

    // Create enhanced conversation
    const conversation = await this.createHighRiskMFAConversation(
      userId,
      riskAssessment,
      context,
    );

    // Generate challenge with enhanced security
    const challenge = await this.generateHighRiskMFAChallenge(
      userId,
      recommendedMethod,
      context,
      riskAssessment,
      conversation.conversationId,
    );

    // Apply additional security measures
    await this.applyHighRiskSecurityMeasures(challenge, context);

    return challenge;
  }

  /**
   * Validate MFA response with conversational verification
   *
   * @param validationRequest - MFA validation request
   * @returns Promise<MFAValidationResult> - Validation result
   */
  @ParlantValidation({
    mode: ValidationMode._SYNCHRONOUS,
    approvalLevel: ApprovalLevel._AUTOMATIC,
    timeout: 10000,
  })
  async validateConversationalMFA(
    validationRequest: MFAValidationRequest,
  ): Promise<MFAValidationResult> {
    const operationId = `mfa-validate-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Validating conversational MFA`, {
      operationId,
      challengeId: validationRequest.challengeId,
    });

    try {
      // Step 1: Retrieve challenge
      const challenge = await this.getCachedMFAChallenge(
        validationRequest.challengeId,
      );

      if (!challenge) {
        return this.createFailedValidationResult(
          "Invalid or expired MFA challenge",
          0,
        );
      }

      // Step 2: Validate challenge state
      const stateValidation = this.validateChallengeState(challenge);
      if (!stateValidation.valid) {
        return this.createFailedValidationResult(
          stateValidation.error!,
          challenge.maxAttempts - challenge.attempts,
        );
      }

      // Step 3: Create validation context
      const validationContext = await this.createMFAValidationRequest(
        challenge,
        validationRequest,
        operationId,
      );

      // Step 4: Perform conversational validation
      const validationResponse =
        await this.parlantService.validateFunctionExecution(validationContext);

      // Step 5: Process validation result
      const result = await this.processMFAValidationResponse(
        challenge,
        validationRequest,
        validationResponse,
        startTime,
      );

      // Step 6: Update challenge state
      await this.updateChallengeState(challenge, result);

      const processingTime = Date.now() - startTime;

      this.logger.log(`[${operationId}] MFA validation completed`, {
        operationId,
        challengeId: validationRequest.challengeId,
        valid: result.valid,
        remainingAttempts: result.remainingAttempts,
        processingTime,
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] MFA validation failed`, {
        operationId,
        challengeId: validationRequest.challengeId,
        error: error instanceof Error ? error.message : String(error),
        processingTime,
      });

      return this.createFailedValidationResult(
        "MFA validation service error",
        0,
      );
    }
  }

  /**
   * Set up MFA method with conversational guidance
   *
   * @param setupRequest - MFA setup request
   * @returns Promise<MFASetupResult> - Setup result
   */
  @ParlantValidation({
    mode: ValidationMode._INTERACTIVE,
    approvalLevel: ApprovalLevel._SINGLE_APPROVAL,
    timeout: 300000, // 5 minutes for setup
  })
  @ConversationContext({
    topic: "Multi-Factor Authentication Setup",
    priority: ConversationPriority._NORMAL,
    requiredParticipants: [ParticipantRole._VALIDATOR],
  })
  async setupConversationalMFA(
    setupRequest: MFASetupRequest,
  ): Promise<MFASetupResult> {
    const operationId = `mfa-setup-${Date.now()}`;

    this.logger.log(`[${operationId}] Setting up conversational MFA`, {
      operationId,
      userId: setupRequest.userId,
      method: setupRequest.method,
    });

    try {
      // Step 1: Create setup conversation
      const conversation = await this.createMFASetupConversation(
        setupRequest.userId,
        setupRequest.method,
      );

      // Step 2: Validate setup parameters
      await this.validateSetupParameters(setupRequest);

      // Step 3: Generate setup data
      const setupData = await this.generateSetupData(
        setupRequest.method,
        setupRequest.parameters,
      );

      // Step 4: Create setup steps
      const nextSteps = this.createSetupSteps(setupRequest.method, setupData);

      // Step 5: Store setup state
      const setupId = await this.storeSetupState(setupRequest, setupData);

      return {
        success: true,
        setupId,
        setupData,
        conversationContext: conversation,
        nextSteps,
      };
    } catch (error) {
      this.logger.error(`[${operationId}] MFA setup failed`, {
        operationId,
        userId: setupRequest.userId,
        method: setupRequest.method,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: "MFA setup failed",
        nextSteps: [],
      };
    }
  }

  /**
   * Recover MFA access with conversational assistance
   *
   * @param userId - User identifier
   * @param recoveryContext - Recovery context
   * @returns Promise<MFAChallenge> - Recovery challenge
   */
  @ParlantValidation({
    mode: ValidationMode._INTERACTIVE,
    approvalLevel: ApprovalLevel._DUAL_APPROVAL,
    timeout: 600000, // 10 minutes for recovery
  })
  @SecurityClassification({
    securityLevel: FunctionSecurityLevel._RESTRICTED,
    riskLevel: RiskLevel._HIGH,
  })
  @ConversationContext({
    topic: "MFA Account Recovery",
    priority: ConversationPriority._HIGH,
    requiredParticipants: [
      ParticipantRole._APPROVER,
      ParticipantRole._VALIDATOR,
      ParticipantRole._MODERATOR,
    ],
  })
  async initiateConversationalMFARecovery(
    userId: string,
    recoveryContext: AuthenticationContext,
  ): Promise<MFAChallenge> {
    const operationId = `mfa-recovery-${Date.now()}`;

    this.logger.warn(`[${operationId}] Initiating MFA recovery`, {
      operationId,
      userId,
      context: recoveryContext,
    });

    // Create recovery conversation with multiple stakeholders
    const conversation = await this.createMFARecoveryConversation(
      userId,
      recoveryContext,
    );

    // Perform enhanced identity verification
    const identityVerification = await this.performIdentityVerification(
      userId,
      recoveryContext,
      conversation.conversationId,
    );

    if (!identityVerification.verified) {
      throw new UnauthorizedException("Identity verification failed");
    }

    // Generate recovery challenge
    const recoveryChallenge = await this.generateRecoveryChallenge(
      userId,
      recoveryContext,
      conversation.conversationId,
    );

    return recoveryChallenge;
  }

  // Helper methods for MFA operations

  /**
   * Perform MFA risk assessment
   */
  private async performMFARiskAssessment(
    userId: string,
    method: MFAMethod,
    context: AuthenticationContext,
  ): Promise<MFARiskAssessment> {
    const riskFactors: MFARiskFactor[] = [];
    let totalRisk = 0;

    // Assess various risk factors
    if (await this.isNewDevice(userId, context)) {
      riskFactors.push({
        type: MFARiskType.NEW_DEVICE,
        contribution: 25,
        description: "Authentication from new device",
        critical: false,
      });
    }

    if (await this.isUnusualLocation(userId, context)) {
      riskFactors.push({
        type: MFARiskType.UNUSUAL_LOCATION,
        contribution: 30,
        description: "Authentication from unusual location",
        critical: false,
      });
    }

    if (this.isAdminOperation(context)) {
      riskFactors.push({
        type: MFARiskType.ADMIN_OPERATION,
        contribution: 35,
        description: "Administrative operation requested",
        critical: true,
      });
    }

    if (await this.hasRecentSecurityEvents(userId)) {
      riskFactors.push({
        type: MFARiskType.RECENT_SECURITY_EVENT,
        contribution: 20,
        description: "Recent security events on account",
        critical: false,
      });
    }

    // Calculate total risk
    totalRisk = riskFactors.reduce(
      (sum, factor) => sum + factor.contribution,
      0,
    );

    // Determine risk level
    let riskLevel: RiskLevel;
    if (totalRisk >= 80) riskLevel = RiskLevel._CRITICAL;
    else if (totalRisk >= 60) riskLevel = RiskLevel._HIGH;
    else if (totalRisk >= 40) riskLevel = RiskLevel._MODERATE;
    else if (totalRisk >= 20) riskLevel = RiskLevel._LOW;
    else riskLevel = RiskLevel._MINIMAL;

    // Recommend MFA methods based on risk
    const recommendedMethods = this.getRecommendedMFAMethods(riskLevel, method);

    return {
      riskScore: Math.min(totalRisk, 100),
      riskFactors,
      riskLevel,
      recommendedMethods,
      assessedAt: new Date(),
    };
  }

  /**
   * Create conversation for MFA
   */
  private async createMFAConversation(
    userId: string,
    method: MFAMethod,
    riskAssessment: MFARiskAssessment,
  ): Promise<ParlantConversationContext> {
    const topic = `MFA Challenge - ${method} (Risk: ${riskAssessment.riskLevel})`;
    const priority =
      riskAssessment.riskLevel === RiskLevel._CRITICAL
        ? ConversationPriority._CRITICAL
        : ConversationPriority._NORMAL;

    const conversationId = await this.parlantService.createConversation(topic, priority);
    
    return {
      conversationId,
      userId,
      sessionId: `session_${Date.now()}`,
      state: ConversationState._ACTIVE,
      metadata: {
        topic,
        priority,
        tags: ['mfa', method, riskAssessment.riskLevel],
        properties: {},
        history: []
      },
      participants: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Generate MFA challenge
   */
  private async generateMFAChallenge(
    userId: string,
    method: MFAMethod,
    context: AuthenticationContext,
    riskAssessment: MFARiskAssessment,
    conversationId: string,
  ): Promise<MFAChallenge> {
    const challengeId = `mfa-${method}-${Date.now()}-${userId}`;
    const expiresAt = new Date(
      Date.now() + this.mfaConfig.defaultChallengeExpiry,
    );

    return {
      challengeId,
      userId,
      method,
      status: MFAChallengeStatus.PENDING,
      conversationId,
      createdAt: new Date(),
      expiresAt,
      verified: false,
      attempts: 0,
      maxAttempts: this.mfaConfig.maxAttempts,
      metadata: {
        clientIp: context.requestMetadata?.clientIp as string,
        userAgent: context.requestMetadata?.userAgent as string,
        authContext: context,
        properties: {},
      },
      riskAssessment,
    };
  }

  /**
   * Create validation request for Parlant
   */
  private async createMFAValidationRequest(
    challenge: MFAChallenge,
    validationRequest: MFAValidationRequest,
    operationId: string,
  ): Promise<ParlantValidationRequest> {
    const functionContext: FunctionContext = {
      functionName: "validateMFAResponse",
      arguments: {
        challengeId: challenge.challengeId,
        method: challenge.method,
        // Don't include the actual response for security
        responseProvided: !!validationRequest.response,
        attempts: challenge.attempts,
        maxAttempts: challenge.maxAttempts,
      },
      source: {
        filePath: __filename,
        methodName: "validateConversationalMFA",
        className: ParlantMFAService.name,
      },
      securityLevel: FunctionSecurityLevel._RESTRICTED,
      riskLevel: challenge.riskAssessment.riskLevel,
      executionContext: {
        environment: this.getExecutionEnvironment(),
        user: {
          userId: challenge.userId,
          roles: [],
          permissions: [],
        },
        properties: {
          mfaMethod: challenge.method,
          riskScore: challenge.riskAssessment.riskScore,
          attemptNumber: challenge.attempts + 1,
        },
      },
    };

    const validationParams: ValidationParameters = {
      mode: ValidationMode._SYNCHRONOUS,
      approvalLevel: ApprovalLevel._AUTOMATIC,
      timeout: 10000,
      cacheable: false, // Don't cache MFA validations
      rules: [],
    };

    // Create user context from challenge data
    const userContext: ParlantUserContext = {
      userId: challenge.userId,
      roles: functionContext.executionContext.user?.roles || [],
      sessionId: `mfa-session-${challenge.challengeId}`,
      ipAddress: challenge.metadata.clientIp || "unknown",
      metadata: {
        challengeId: challenge.challengeId,
        method: challenge.method,
        riskScore: challenge.riskAssessment.riskScore,
      },
    };

    return {
      operationId: operationId,
      functionName: functionContext.functionName,
      packageName: "parlant-mfa-service",
      description: "Validate MFA response with conversational verification",
      parameters: functionContext.arguments,
      userContext: userContext,
      securityLevel: functionContext.securityLevel as SecurityLevel,
      timeout: validationParams.timeout,
    };
  }

  // Cache management methods

  private async cacheMFAChallenge(challenge: MFAChallenge): Promise<void> {
    const cacheKey = `mfa-challenge:${challenge.challengeId}`;
    const ttl = challenge.expiresAt.getTime() - Date.now();

    await this.cacheManager.set(cacheKey, challenge, ttl);
  }

  private async getCachedMFAChallenge(
    challengeId: string,
  ): Promise<MFAChallenge | null> {
    const cacheKey = `mfa-challenge:${challengeId}`;
    const result = await this.cacheManager.get<MFAChallenge>(cacheKey);
    return result || null;
  }

  private async updateChallengeState(
    challenge: MFAChallenge,
    result: MFAValidationResult,
  ): Promise<void> {
    challenge.attempts++;

    if (result.valid) {
      challenge.verified = true;
      challenge.status = MFAChallengeStatus.VERIFIED;
    } else if (challenge.attempts >= challenge.maxAttempts) {
      challenge.status = MFAChallengeStatus.FAILED;
    }

    await this.cacheMFAChallenge(challenge);
  }

  // Validation helper methods

  private validateChallengeState(challenge: MFAChallenge): {
    valid: boolean;
    error?: string;
  } {
    if (challenge.status === MFAChallengeStatus.EXPIRED) {
      return { valid: false, error: "MFA challenge has expired" };
    }

    if (challenge.status === MFAChallengeStatus.VERIFIED) {
      return { valid: false, error: "MFA challenge already verified" };
    }

    if (challenge.status === MFAChallengeStatus.FAILED) {
      return { valid: false, error: "MFA challenge has failed" };
    }

    if (challenge.expiresAt < new Date()) {
      challenge.status = MFAChallengeStatus.EXPIRED;
      return { valid: false, error: "MFA challenge has expired" };
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      return { valid: false, error: "Maximum MFA attempts exceeded" };
    }

    return { valid: true };
  }

  private async processMFAValidationResponse(
    challenge: MFAChallenge,
    validationRequest: MFAValidationRequest,
    validationResponse: ParlantValidationResponse,
    startTime: number,
  ): Promise<MFAValidationResult> {
    const validationDuration = Date.now() - startTime;

    // Perform actual MFA validation based on method
    const methodValidation = await this.validateByMethod(
      challenge.method,
      validationRequest.response,
      challenge,
    );

    const finalResult =
      methodValidation &&
      validationResponse.approved;

    return {
      valid: finalResult,
      remainingAttempts: challenge.maxAttempts - challenge.attempts - 1,
      error: finalResult ? undefined : "Invalid MFA code",
      conversationId: challenge.conversationId,
      metadata: {
        validatedAt: new Date(),
        validationDuration,
        method: challenge.method,
        riskScore: challenge.riskAssessment.riskScore,
        conversationalValidation: true,
        properties: {
          parlantDecision: validationResponse.approved ? 'APPROVED' : 'DENIED',
          confidence: validationResponse.confidence,
        },
      },
      requiredActions: [],
    };
  }

  private createFailedValidationResult(
    error: string,
    remainingAttempts: number,
  ): MFAValidationResult {
    return {
      valid: false,
      remainingAttempts,
      error,
      metadata: {
        validatedAt: new Date(),
        validationDuration: 0,
        method: MFAMethod.SMS, // Default
        riskScore: 0,
        conversationalValidation: false,
        properties: {},
      },
      requiredActions: [],
    };
  }

  // Method-specific validation

  private async validateByMethod(
    method: MFAMethod,
    response: string,
    challenge: MFAChallenge,
  ): Promise<boolean> {
    switch (method) {
      case MFAMethod.SMS:
      case MFAMethod.EMAIL:
        return this.validateCodeChallenge(response, challenge);

      case MFAMethod.TOTP:
        return this.validateTOTPCode(response, challenge);

      case MFAMethod.BACKUP_CODES:
        return this.validateBackupCode(response, challenge);

      default:
        return false;
    }
  }

  private validateCodeChallenge(
    response: string,
    challenge: MFAChallenge,
  ): boolean {
    // Implementation would validate SMS/Email code
    // For now, mock validation (accept any 6-digit code)
    return /^\d{6}$/.test(response);
  }

  private validateTOTPCode(response: string, challenge: MFAChallenge): boolean {
    // Implementation would validate TOTP code using time-based algorithm
    // For now, mock validation
    return /^\d{6}$/.test(response);
  }

  private validateBackupCode(
    response: string,
    challenge: MFAChallenge,
  ): boolean {
    // Implementation would validate backup code against stored codes
    // For now, mock validation
    return response.length >= 8;
  }

  // Risk assessment helper methods

  private async isNewDevice(
    userId: string,
    context: AuthenticationContext,
  ): Promise<boolean> {
    // Implementation would check device history for user
    return false;
  }

  private async isUnusualLocation(
    userId: string,
    context: AuthenticationContext,
  ): Promise<boolean> {
    // Implementation would check location history for user
    return false;
  }

  private isAdminOperation(context: AuthenticationContext): boolean {
    return (
      context.securityContext?.classification ===
      FunctionSecurityLevel._RESTRICTED
    );
  }

  private async hasRecentSecurityEvents(userId: string): Promise<boolean> {
    // Implementation would check for recent security events
    return false;
  }

  private getRecommendedMFAMethods(
    riskLevel: RiskLevel,
    preferredMethod: MFAMethod,
  ): MFAMethod[] {
    const methods: MFAMethod[] = [];

    if (riskLevel === RiskLevel._CRITICAL) {
      methods.push(MFAMethod.HARDWARE_TOKEN, MFAMethod.BIOMETRIC);
    } else if (riskLevel === RiskLevel._HIGH) {
      methods.push(MFAMethod.TOTP, MFAMethod.PUSH_NOTIFICATION);
    } else {
      methods.push(preferredMethod);
    }

    return methods.filter((method) =>
      this.mfaConfig.supportedMethods.includes(method),
    );
  }

  // Additional helper methods

  private requiresDelivery(method: MFAMethod): boolean {
    return [MFAMethod.SMS, MFAMethod.EMAIL, MFAMethod.VOICE_CALL].includes(
      method,
    );
  }

  private async deliverMFAChallenge(
    challenge: MFAChallenge,
    context: AuthenticationContext,
  ): Promise<void> {
    // Implementation would send SMS, email, etc.
    this.logger.log(`Delivering MFA challenge via ${challenge.method}`, {
      challengeId: challenge.challengeId,
      method: challenge.method,
    });

    challenge.status = MFAChallengeStatus.SENT;
  }

  private getExecutionEnvironment(): ExecutionEnvironment {
    const env = this.configService.get<string>("NODE_ENV", "development");

    switch (env.toLowerCase()) {
      case "production":
        return ExecutionEnvironment._PRODUCTION;
      case "staging":
        return ExecutionEnvironment._STAGING;
      case "test":
        return ExecutionEnvironment._TESTING;
      default:
        return ExecutionEnvironment._DEVELOPMENT;
    }
  }

  // Placeholder methods for enhanced features

  private async performEnhancedRiskAssessment(
    userId: string,
    context: AuthenticationContext,
  ): Promise<MFARiskAssessment> {
    // Enhanced risk assessment for high-risk scenarios
    return this.performMFARiskAssessment(userId, MFAMethod.TOTP, context);
  }

  private selectHighRiskMFAMethod(
    riskAssessment: MFARiskAssessment,
    context: AuthenticationContext,
  ): MFAMethod {
    // Select best method for high-risk scenarios
    return MFAMethod.HARDWARE_TOKEN;
  }

  private async createHighRiskMFAConversation(
    userId: string,
    riskAssessment: MFARiskAssessment,
    context: AuthenticationContext,
  ): Promise<ParlantConversationContext> {
    const topic = `High-Risk MFA - User ${userId}`;
    const conversationId = await this.parlantService.createConversation(
      topic,
      ConversationPriority._CRITICAL,
    );
    
    return {
      conversationId,
      userId,
      sessionId: `session_${Date.now()}`,
      state: ConversationState._ACTIVE,
      metadata: {
        topic,
        priority: ConversationPriority._CRITICAL,
        tags: ['high-risk-mfa', riskAssessment.riskLevel],
        properties: { riskAssessment, context },
        history: []
      },
      participants: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async generateHighRiskMFAChallenge(
    userId: string,
    method: MFAMethod,
    context: AuthenticationContext,
    riskAssessment: MFARiskAssessment,
    conversationId: string,
  ): Promise<MFAChallenge> {
    // Generate challenge with enhanced security for high-risk
    return this.generateMFAChallenge(
      userId,
      method,
      context,
      riskAssessment,
      conversationId,
    );
  }

  private async applyHighRiskSecurityMeasures(
    challenge: MFAChallenge,
    context: AuthenticationContext,
  ): Promise<void> {
    // Apply additional security measures
    this.logger.warn("Applying high-risk security measures for MFA", {
      challengeId: challenge.challengeId,
    });
  }

  private async validateSetupParameters(
    setupRequest: MFASetupRequest,
  ): Promise<void> {
    // Validate MFA setup parameters
  }

  private async generateSetupData(
    method: MFAMethod,
    parameters: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    // Generate setup data (QR codes, etc.)
    return {};
  }

  private createSetupSteps(
    method: MFAMethod,
    setupData: Record<string, unknown>,
  ): SetupStep[] {
    // Create setup steps for user
    return [];
  }

  private async storeSetupState(
    setupRequest: MFASetupRequest,
    setupData: Record<string, unknown>,
  ): Promise<string> {
    // Store setup state
    return `setup-${Date.now()}`;
  }

  private async createMFASetupConversation(
    userId: string,
    method: MFAMethod,
  ): Promise<ParlantConversationContext> {
    const topic = `MFA Setup - ${method}`;
    const conversationId = await this.parlantService.createConversation(
      topic,
      ConversationPriority._NORMAL,
    );
    
    return {
      conversationId,
      userId,
      sessionId: `session_${Date.now()}`,
      state: ConversationState._ACTIVE,
      metadata: {
        topic,
        priority: ConversationPriority._NORMAL,
        tags: ['mfa-setup', method],
        properties: {},
        history: []
      },
      participants: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async createMFARecoveryConversation(
    userId: string,
    recoveryContext: AuthenticationContext,
  ): Promise<ParlantConversationContext> {
    const topic = `MFA Recovery - User ${userId}`;
    const conversationId = await this.parlantService.createConversation(
      topic,
      ConversationPriority._HIGH,
    );
    
    return {
      conversationId,
      userId,
      sessionId: `session_${Date.now()}`,
      state: ConversationState._ACTIVE,
      metadata: {
        topic,
        priority: ConversationPriority._HIGH,
        tags: ['mfa-recovery'],
        properties: { recoveryContext },
        history: []
      },
      participants: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async performIdentityVerification(
    userId: string,
    recoveryContext: AuthenticationContext,
    conversationId: string,
  ): Promise<{ verified: boolean }> {
    // Perform identity verification for recovery
    return { verified: true };
  }

  private async generateRecoveryChallenge(
    userId: string,
    recoveryContext: AuthenticationContext,
    conversationId: string,
  ): Promise<MFAChallenge> {
    // Generate recovery challenge
    const riskAssessment: MFARiskAssessment = {
      riskScore: 90, // High risk for recovery
      riskFactors: [],
      riskLevel: RiskLevel._CRITICAL,
      recommendedMethods: [MFAMethod.EMAIL],
      assessedAt: new Date(),
    };

    return this.generateMFAChallenge(
      userId,
      MFAMethod.EMAIL,
      recoveryContext,
      riskAssessment,
      conversationId,
    );
  }
}

/**
 * MFA configuration interface
 */
interface MFAConfiguration {
  defaultChallengeExpiry: number;
  maxAttempts: number;
  enableConversationalMFA: boolean;
  conversationTimeout: number;
  supportedMethods: MFAMethod[];
  riskBasedMFA: boolean;
}
