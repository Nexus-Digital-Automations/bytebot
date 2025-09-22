import { NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { ConfigService } from "@nestjs/config";
import { Cache } from "cache-manager";
import {
  FunctionSecurityLevel,
  RiskLevel,
  ParlantConversationContext,
} from "../types/parlant.types";
import { ParlantIntegrationService } from "../services/parlant-integration.service";
export interface ParlantAuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  authenticationState?: EnhancedAuthenticationState;
  securityContext?: SecurityContext;
  riskAssessment?: RequestRiskAssessment;
  conversationContext?: ParlantConversationContext;
  sessionId?: string;
}
export interface EnhancedAuthenticationState {
  isAuthenticated: boolean;
  authToken?: string;
  authError?: string;
  authMethod?: AuthMethod;
  conversationalValidation: boolean;
  riskScore: number;
  securityMeasures: string[];
  authenticatedAt?: Date;
  sessionInfo?: SessionInfo;
}
export declare enum AuthMethod {
  JWT_TOKEN = "jwt_token",
  API_KEY = "api_key",
  CERTIFICATE = "certificate",
  SSO = "sso",
  CONVERSATIONAL = "conversational",
}
export interface SessionInfo {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  metadata: Record<string, unknown>;
}
export interface AuthenticatedUser {
  id: string;
  userId?: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  metadata?: Record<string, unknown>;
}
export interface SecurityContext {
  classification: FunctionSecurityLevel;
  threatLevel: ThreatLevel;
  appliedPolicies: string[];
  activeMeasures: SecurityMeasure[];
  complianceRequirements: string[];
}
export declare enum ThreatLevel {
  NONE = "none",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}
export interface SecurityMeasure {
  type: SecurityMeasureType;
  parameters: Record<string, unknown>;
  appliedAt: Date;
  expiresAt?: Date;
}
export declare enum SecurityMeasureType {
  RATE_LIMITING = "rate_limiting",
  IP_FILTERING = "ip_filtering",
  ENHANCED_LOGGING = "enhanced_logging",
  SESSION_MONITORING = "session_monitoring",
  MFA_REQUIRED = "mfa_required",
  CONVERSATION_REQUIRED = "conversation_required",
}
export interface RequestRiskAssessment {
  overallRisk: number;
  riskFactors: RequestRiskFactor[];
  riskLevel: RiskLevel;
  assessedAt: Date;
  metadata: Record<string, unknown>;
}
export interface RequestRiskFactor {
  type: RequestRiskType;
  contribution: number;
  description: string;
  critical: boolean;
}
export declare enum RequestRiskType {
  UNUSUAL_IP = "unusual_ip",
  SUSPICIOUS_USER_AGENT = "suspicious_user_agent",
  HIGH_REQUEST_RATE = "high_request_rate",
  PRIVILEGE_ESCALATION = "privilege_escalation",
  SENSITIVE_ENDPOINT = "sensitive_endpoint",
  ANOMALOUS_PATTERN = "anomalous_pattern",
  GEOGRAPHIC_ANOMALY = "geographic_anomaly",
  TIME_ANOMALY = "time_anomaly",
}
export interface ConversationalAuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  conversationContext?: ParlantConversationContext;
  requiredMeasures: SecurityMeasure[];
  metadata: Record<string, unknown>;
}
export declare class ParlantEnhancedAuthMiddleware implements NestMiddleware {
  private readonly configService;
  private readonly _parlantService;
  private readonly _cacheManager;
  private readonly logger;
  private readonly riskThresholds;
  private readonly securityConfig;
  constructor(
    configService: ConfigService,
    _parlantService: ParlantIntegrationService,
    _cacheManager: Cache,
  );
  use(
    req: ParlantAuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void>;
  performConversationalAuthentication(
    req: ParlantAuthenticatedRequest,
    operationId: string,
  ): Promise<void>;
  performHighRiskAuthentication(
    req: ParlantAuthenticatedRequest,
    operationId: string,
  ): Promise<void>;
  private performRequestRiskAssessment;
  private shouldPerformConversationalAuth;
  private initializeRequestState;
  private createAuthenticationValidationRequest;
  private createHighRiskValidationRequest;
  private processAuthenticationValidationResponse;
  private mapExecutionContextToMeasures;
  private createSecurityMeasure;
  private applyAuthenticationResult;
  private applySecurityMeasures;
  private setEnhancedSecurityHeaders;
  private assessIPRisk;
  private assessUserAgentRisk;
  private assessRequestRateRisk;
  private assessEndpointRisk;
  private assessTimeRisk;
  private assessGeographicRisk;
  private getClientIP;
  private isSensitiveEndpoint;
  private isAdministrativeOperation;
  private determineSecurityLevel;
  private mapToSecurityLevel;
  private determineApprovalLevel;
  private getExecutionEnvironment;
  private sanitizeRequestArguments;
  private mapToRequestContext;
  private createAuthenticationConversation;
  private performStandardAuthentication;
  private extractUserFromToken;
  private mapRecommendationsToMeasures;
  private getCachedAuthenticationDecision;
  private applyCachedAuthentication;
  private cacheAuthenticationDecision;
  private applyCriticalSecurityMeasures;
  private applyHighSecurityMeasures;
  private applyModerateSecurityMeasures;
  private applyLowSecurityMeasures;
  private implementHighRiskSecurityMeasures;
}
//# sourceMappingURL=parlant-enhanced-auth.middleware.d.ts.map
