import { ConfigService } from "@nestjs/config";
import { Cache } from "cache-manager";
import { ParlantConversationContext, FunctionSecurityLevel, RiskLevel, UserContext } from "../types/parlant.types";
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    tokenType?: string;
    expiresIn?: number;
}
export interface RefreshTokenPayload {
    userId: string;
    sessionId: string;
    iat: number;
    exp: number;
}
import { ParlantIntegrationService } from "./parlant-integration.service";
export interface ConversationalAuthContext {
    userId?: string;
    authMethod: AuthenticationMethod;
    riskAssessment: RiskAssessment;
    requestMetadata: AuthRequestMetadata;
    securityContext: AuthSecurityContext;
}
export declare enum AuthenticationMethod {
    PASSWORD = "password",
    MFA_SMS = "mfa_sms",
    MFA_TOTP = "mfa_totp",
    MFA_BIOMETRIC = "mfa_biometric",
    SSO = "sso",
    API_KEY = "api_key",
    CERTIFICATE = "certificate"
}
export interface RiskAssessment {
    overallRiskScore: number;
    riskFactors: RiskFactor[];
    riskLevel: RiskLevel;
    requiresConversation: boolean;
    assessedAt: Date;
}
export interface RiskFactor {
    type: RiskFactorType;
    score: number;
    description: string;
    critical: boolean;
    metadata?: Record<string, unknown>;
}
export declare enum RiskFactorType {
    UNUSUAL_LOCATION = "unusual_location",
    UNUSUAL_TIME = "unusual_time",
    MULTIPLE_FAILED_ATTEMPTS = "multiple_failed_attempts",
    NEW_DEVICE = "new_device",
    PRIVILEGE_ESCALATION = "privilege_escalation",
    SUSPICIOUS_IP = "suspicious_ip",
    RAPID_REQUESTS = "rapid_requests",
    ACCOUNT_COMPROMISE = "account_compromise",
    POLICY_VIOLATION = "policy_violation"
}
export interface AuthRequestMetadata {
    requestId: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
    location?: GeographicLocation;
    deviceFingerprint?: string;
    sessionId?: string;
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
export interface AuthSecurityContext {
    isPrivilegedAccount: boolean;
    accountSecurityLevel: FunctionSecurityLevel;
    recentSecurityEvents: SecurityEvent[];
    securityRestrictions: SecurityRestriction[];
    complianceRequirements: string[];
}
export interface SecurityEvent {
    type: SecurityEventType;
    timestamp: Date;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    metadata?: Record<string, unknown>;
}
export declare enum SecurityEventType {
    LOGIN_FAILURE = "login_failure",
    PASSWORD_CHANGE = "password_change",
    ACCOUNT_LOCKOUT = "account_lockout",
    PRIVILEGE_CHANGE = "privilege_change",
    SUSPICIOUS_ACTIVITY = "suspicious_activity",
    POLICY_VIOLATION = "policy_violation"
}
export interface SecurityRestriction {
    type: SecurityRestrictionType;
    parameters: Record<string, unknown>;
    expiresAt?: Date;
    active: boolean;
}
export declare enum SecurityRestrictionType {
    IP_RESTRICTION = "ip_restriction",
    TIME_RESTRICTION = "time_restriction",
    LOCATION_RESTRICTION = "location_restriction",
    RATE_LIMIT = "rate_limit",
    MFA_REQUIRED = "mfa_required"
}
export interface ConversationalAuthResult {
    success: boolean;
    tokens?: TokenPair;
    conversationContext?: ParlantConversationContext;
    error?: string;
    requiredActions: RequiredAction[];
    metadata: Record<string, unknown>;
}
export interface RequiredAction {
    type: RequiredActionType;
    description: string;
    parameters: Record<string, unknown>;
    timeout?: number;
    mandatory: boolean;
}
export declare enum RequiredActionType {
    MFA_VERIFICATION = "mfa_verification",
    PASSWORD_CHANGE = "password_change",
    SECURITY_QUESTION = "security_question",
    EMAIL_VERIFICATION = "email_verification",
    TERMS_ACCEPTANCE = "terms_acceptance",
    SECURITY_ACKNOWLEDGMENT = "security_acknowledgment"
}
export declare class ParlantEnhancedAuthService {
    private readonly configService;
    private readonly parlantService;
    private readonly cacheManager;
    private readonly logger;
    constructor(configService: ConfigService, parlantService: ParlantIntegrationService, cacheManager: Cache);
    validateConversationalAuthentication(credentials: Record<string, unknown>, authContext: ConversationalAuthContext): Promise<ConversationalAuthResult>;
    validateHighRiskAuthentication(credentials: Record<string, unknown>, authContext: ConversationalAuthContext): Promise<ConversationalAuthResult>;
    validateTokenOperation(tokenOperation: TokenOperation, requestingUser: UserContext): Promise<boolean>;
    createConversationalMFAChallenge(userId: string, mfaMethod: MFAMethod, context: ConversationalAuthContext): Promise<MFAChallenge>;
    validateConversationalMFA(challengeId: string, response: string, context: ConversationalAuthContext): Promise<MFAValidationResult>;
    private assessAuthenticationRisk;
    private shouldRequireConversationalValidation;
    private createAuthenticationValidationRequest;
    private createHighRiskValidationRequest;
    private createAuthenticationConversation;
    private processValidationResponse;
    private performStandardAuthentication;
    private generateAuthenticationTokens;
    private determineApprovalLevel;
    private getExecutionEnvironment;
    private mapToRequestContext;
    private isUnusualLocation;
    private isUnusualTime;
    private assessTokenOperationRisk;
    private createTokenOperationConversation;
    private implementAdditionalSecurityMeasures;
    private mapRecommendationsToActions;
    private validateMFAResponse;
}
export interface TokenOperation {
    type: "refresh" | "revoke" | "revoke_user" | "revoke_all";
    targetUserId?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
}
export declare enum MFAMethod {
    SMS = "sms",
    EMAIL = "email",
    TOTP = "totp",
    BIOMETRIC = "biometric",
    HARDWARE_TOKEN = "hardware_token"
}
export interface MFAChallenge {
    challengeId: string;
    userId: string;
    method: MFAMethod;
    conversationId?: string;
    createdAt: Date;
    expiresAt: Date;
    verified: boolean;
    attempts: number;
    maxAttempts: number;
}
export interface MFAValidationResult {
    valid: boolean;
    remainingAttempts: number;
    error?: string;
    conversationId?: string;
}
//# sourceMappingURL=parlant-enhanced-auth.service.d.ts.map