import { ConfigService } from "@nestjs/config";
import { Cache } from "cache-manager";
import { ParlantConversationContext, FunctionSecurityLevel, RiskLevel } from "../types/parlant.types";
import { ParlantIntegrationService } from "./parlant-integration.service";
export declare enum MFAMethod {
    SMS = "sms",
    EMAIL = "email",
    TOTP = "totp",
    BIOMETRIC = "biometric",
    HARDWARE_TOKEN = "hardware_token",
    PUSH_NOTIFICATION = "push_notification",
    VOICE_CALL = "voice_call",
    BACKUP_CODES = "backup_codes"
}
export declare enum MFAChallengeStatus {
    PENDING = "pending",
    SENT = "sent",
    VERIFIED = "verified",
    FAILED = "failed",
    EXPIRED = "expired",
    CANCELLED = "cancelled"
}
export interface MFAChallenge {
    challengeId: string;
    userId: string;
    method: MFAMethod;
    status: MFAChallengeStatus;
    conversationId?: string;
    createdAt: Date;
    expiresAt: Date;
    verified: boolean;
    attempts: number;
    maxAttempts: number;
    metadata: MFAChallengeMetadata;
    riskAssessment: MFARiskAssessment;
}
export interface MFAChallengeMetadata {
    clientIp?: string;
    userAgent?: string;
    deviceFingerprint?: string;
    location?: GeographicLocation;
    authContext?: AuthenticationContext;
    properties: Record<string, unknown>;
}
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
export interface AuthenticationContext {
    sessionId?: string;
    primaryAuthMethod?: string;
    requestMetadata?: Record<string, unknown>;
    securityContext?: SecurityContext;
}
export interface SecurityContext {
    classification: FunctionSecurityLevel;
    threatIndicators: ThreatIndicator[];
    activePolicies: string[];
    complianceRequirements: string[];
}
export interface ThreatIndicator {
    type: ThreatIndicatorType;
    severity: ThreatSeverity;
    description: string;
    detectedAt: Date;
    metadata?: Record<string, unknown>;
}
export declare enum ThreatIndicatorType {
    SUSPICIOUS_LOCATION = "suspicious_location",
    UNUSUAL_DEVICE = "unusual_device",
    ANOMALOUS_BEHAVIOR = "anomalous_behavior",
    KNOWN_BAD_IP = "known_bad_ip",
    CREDENTIAL_STUFFING = "credential_stuffing",
    BRUTE_FORCE = "brute_force"
}
export declare enum ThreatSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export interface MFARiskAssessment {
    riskScore: number;
    riskFactors: MFARiskFactor[];
    riskLevel: RiskLevel;
    recommendedMethods: MFAMethod[];
    assessedAt: Date;
}
export interface MFARiskFactor {
    type: MFARiskType;
    contribution: number;
    description: string;
    critical: boolean;
}
export declare enum MFARiskType {
    NEW_DEVICE = "new_device",
    UNUSUAL_LOCATION = "unusual_location",
    HIGH_VALUE_TRANSACTION = "high_value_transaction",
    ADMIN_OPERATION = "admin_operation",
    SUSPICIOUS_PATTERN = "suspicious_pattern",
    RECENT_SECURITY_EVENT = "recent_security_event"
}
export interface MFAValidationRequest {
    challengeId: string;
    response: string;
    context?: MFAValidationContext;
    timestamp: Date;
}
export interface MFAValidationContext {
    clientInfo?: ClientInfo;
    securityContext?: SecurityContext;
    sessionInfo?: SessionInfo;
    properties?: Record<string, unknown>;
}
export interface ClientInfo {
    ipAddress?: string;
    userAgent?: string;
    deviceFingerprint?: string;
    platform?: PlatformInfo;
}
export interface PlatformInfo {
    os?: string;
    browser?: string;
    deviceType?: DeviceType;
    screenResolution?: string;
    timezone?: string;
}
export declare enum DeviceType {
    DESKTOP = "desktop",
    MOBILE = "mobile",
    TABLET = "tablet",
    UNKNOWN = "unknown"
}
export interface SessionInfo {
    sessionId: string;
    startTime: Date;
    lastActivity: Date;
    metadata: Record<string, unknown>;
}
export interface MFAValidationResult {
    valid: boolean;
    remainingAttempts: number;
    error?: string;
    conversationId?: string;
    metadata: MFAValidationMetadata;
    requiredActions: SecurityAction[];
}
export interface MFAValidationMetadata {
    validatedAt: Date;
    validationDuration: number;
    method: MFAMethod;
    riskScore: number;
    conversationalValidation: boolean;
    properties: Record<string, unknown>;
}
export interface SecurityAction {
    type: SecurityActionType;
    description: string;
    parameters: Record<string, unknown>;
    mandatory: boolean;
    timeout?: number;
}
export declare enum SecurityActionType {
    ADDITIONAL_MFA = "additional_mfa",
    SECURITY_QUESTION = "security_question",
    DEVICE_VERIFICATION = "device_verification",
    ADMIN_APPROVAL = "admin_approval",
    ACCOUNT_VERIFICATION = "account_verification",
    PASSWORD_CHANGE = "password_change"
}
export interface MFASetupRequest {
    userId: string;
    method: MFAMethod;
    parameters: Record<string, unknown>;
    context: MFAValidationContext;
}
export interface MFASetupResult {
    success: boolean;
    setupId?: string;
    setupData?: Record<string, unknown>;
    error?: string;
    conversationContext?: ParlantConversationContext;
    nextSteps: SetupStep[];
}
export interface SetupStep {
    type: SetupStepType;
    description: string;
    parameters: Record<string, unknown>;
    required: boolean;
}
export declare enum SetupStepType {
    SCAN_QR_CODE = "scan_qr_code",
    ENTER_CODE = "enter_code",
    VERIFY_PHONE = "verify_phone",
    VERIFY_EMAIL = "verify_email",
    REGISTER_DEVICE = "register_device",
    DOWNLOAD_APP = "download_app"
}
export declare class ParlantMFAService {
    private readonly configService;
    private readonly parlantService;
    private readonly cacheManager;
    private readonly logger;
    private readonly mfaConfig;
    constructor(configService: ConfigService, parlantService: ParlantIntegrationService, cacheManager: Cache);
    createConversationalMFAChallenge(userId: string, method: MFAMethod, context: AuthenticationContext): Promise<MFAChallenge>;
    initiateHighRiskMFA(userId: string, context: AuthenticationContext): Promise<MFAChallenge>;
    validateConversationalMFA(validationRequest: MFAValidationRequest): Promise<MFAValidationResult>;
    setupConversationalMFA(setupRequest: MFASetupRequest): Promise<MFASetupResult>;
    initiateConversationalMFARecovery(userId: string, recoveryContext: AuthenticationContext): Promise<MFAChallenge>;
    private performMFARiskAssessment;
    private createMFAConversation;
    private generateMFAChallenge;
    private createMFAValidationRequest;
    private cacheMFAChallenge;
    private getCachedMFAChallenge;
    private updateChallengeState;
    private validateChallengeState;
    private processMFAValidationResponse;
    private createFailedValidationResult;
    private validateByMethod;
    private validateCodeChallenge;
    private validateTOTPCode;
    private validateBackupCode;
    private isNewDevice;
    private isUnusualLocation;
    private isAdminOperation;
    private hasRecentSecurityEvents;
    private getRecommendedMFAMethods;
    private requiresDelivery;
    private deliverMFAChallenge;
    private getExecutionEnvironment;
    private performEnhancedRiskAssessment;
    private selectHighRiskMFAMethod;
    private createHighRiskMFAConversation;
    private generateHighRiskMFAChallenge;
    private applyHighRiskSecurityMeasures;
    private validateSetupParameters;
    private generateSetupData;
    private createSetupSteps;
    private storeSetupState;
    private createMFASetupConversation;
    private createMFARecoveryConversation;
    private performIdentityVerification;
    private generateRecoveryChallenge;
    private mapFunctionSecurityLevelToSecurityLevel;
}
//# sourceMappingURL=parlant-mfa.service.d.ts.map