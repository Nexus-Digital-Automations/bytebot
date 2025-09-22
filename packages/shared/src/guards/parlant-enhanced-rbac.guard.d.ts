import { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { Cache } from "cache-manager";
import {
  RBACAuthorizationGuard,
  AuthenticatedRequest,
  AuthorizationResult,
} from "./rbac-authorization.guard";
import { RBACMetadata } from "../types/rbac.types";
import { FunctionSecurityLevel, RiskLevel } from "../types/parlant.types";
import { ParlantIntegrationService } from "../services/parlant-integration.service";
export interface ConversationalAuthorizationContext {
  executionContext: ExecutionContext;
  user: AuthenticatedRequest["user"];
  rbacMetadata: RBACMetadata;
  riskAssessment: AuthorizationRiskAssessment;
  securityContext: AuthorizationSecurityContext;
  performanceContext: PerformanceContext;
}
export interface AuthorizationRiskAssessment {
  riskScore: number;
  riskFactors: AuthorizationRiskFactor[];
  riskLevel: RiskLevel;
  requiresConversation: boolean;
  assessedAt: Date;
}
export interface AuthorizationRiskFactor {
  type: AuthorizationRiskType;
  contribution: number;
  description: string;
  critical: boolean;
  metadata?: Record<string, unknown>;
}
export declare enum AuthorizationRiskType {
  _PRIVILEGE_ESCALATION = "privilege_escalation",
  _SENSITIVE_RESOURCE = "sensitive_resource",
  _UNUSUAL_ACCESS_PATTERN = "unusual_access_pattern",
  _HIGH_VALUE_OPERATION = "high_value_operation",
  _CROSS_BOUNDARY_ACCESS = "cross_boundary_access",
  _ADMIN_OPERATION = "admin_operation",
  _BULK_OPERATION = "bulk_operation",
  _EXTERNAL_SYSTEM_ACCESS = "external_system_access",
}
export interface AuthorizationSecurityContext {
  isPrivilegedOperation: boolean;
  securityClassification: FunctionSecurityLevel;
  requiredClearance?: string[];
  activePolicies: SecurityPolicy[];
  complianceRequirements: string[];
  auditRequired: boolean;
}
export interface SecurityPolicy {
  id: string;
  name: string;
  type: SecurityPolicyType;
  rules: SecurityRule[];
  enforcementLevel: EnforcementLevel;
}
export declare enum SecurityPolicyType {
  _ACCESS_CONTROL = "access_control",
  _DATA_PROTECTION = "data_protection",
  _AUDIT_LOGGING = "audit_logging",
  _COMPLIANCE = "compliance",
  _THREAT_PROTECTION = "threat_protection",
}
export interface SecurityRule {
  id: string;
  condition: string;
  action: SecurityAction;
  priority: number;
}
export declare enum SecurityAction {
  _ALLOW = "allow",
  _DENY = "deny",
  _REQUIRE_APPROVAL = "require_approval",
  _AUDIT = "audit",
  _ESCALATE = "escalate",
}
export declare enum EnforcementLevel {
  _ADVISORY = "advisory",
  _ENFORCING = "enforcing",
  _STRICT = "strict",
}
export interface PerformanceContext {
  startTime: Date;
  targetResponseTime: number;
  cacheStrategy: CacheStrategy;
  performanceRequirements: PerformanceRequirement[];
}
export declare enum CacheStrategy {
  _NONE = "none",
  _AGGRESSIVE = "aggressive",
  _CONSERVATIVE = "conservative",
  _INTELLIGENT = "intelligent",
}
export interface PerformanceRequirement {
  type: PerformanceRequirementType;
  target: number;
  maximum: number;
}
export declare enum PerformanceRequirementType {
  _RESPONSE_TIME = "response_time",
  _CACHE_HIT_RATE = "cache_hit_rate",
  _CPU_USAGE = "cpu_usage",
  _MEMORY_USAGE = "memory_usage",
}
export interface ConversationalAuthorizationResult extends AuthorizationResult {
  conversationContext?: Record<string, unknown>;
  performanceMetrics: AuthorizationPerformanceMetrics;
  cacheInfo: CacheInfo;
  securityEnhancements: string[];
}
export interface AuthorizationPerformanceMetrics {
  totalTime: number;
  conversationTime?: number;
  cacheLookupTime: number;
  policyEvaluationTime: number;
  riskAssessmentTime: number;
}
export interface CacheInfo {
  cached: boolean;
  cacheKey?: string;
  ttl?: number;
  hit: boolean;
}
export declare class ParlantEnhancedRBACGuard
  extends RBACAuthorizationGuard
  implements CanActivate
{
  private readonly reflector;
  private readonly cacheManager;
  private readonly _parlantService;
  private readonly rbacLogger;
  private readonly conversationCacheTimeout;
  private readonly riskThresholds;
  constructor(
    reflector: Reflector,
    configService: ConfigService,
    cacheManager: Cache,
    _parlantService: ParlantIntegrationService,
  );
  canActivate(context: ExecutionContext): Promise<boolean>;
  performConversationalAuthorization(
    authContext: ConversationalAuthorizationContext,
    operationId: string,
  ): Promise<ConversationalAuthorizationResult>;
  performHighRiskAuthorization(
    authContext: ConversationalAuthorizationContext,
    operationId: string,
  ): Promise<ConversationalAuthorizationResult>;
  private performStandardRBACCheck;
  private buildAuthorizationContext;
  private assessAuthorizationRisk;
  private buildSecurityContext;
  private createAuthorizationValidationRequest;
  private createHighRiskValidationRequest;
  private processAuthorizationValidationResponse;
  private getCachedAuthorizationDecision;
  private cacheAuthorizationDecision;
  private buildAuthorizationCacheKey;
  private enhanceCachedResult;
  private createFallbackAuthorizationResult;
  private handleStandardRBACDenial;
  private finalizeStandardAuthorization;
  private isPrivilegeEscalation;
  private involvesSensitiveResource;
  private isUnusualAccessPattern;
  private isParlantAdmin;
  private getParlantUserRoles;
  private determineSecurityClassification;
  private getActiveSecurityPolicies;
  private getComplianceRequirements;
  private isPrivilegedOperation;
  private extractFunctionName;
  private sanitizeArguments;
  private getExecutionEnvironment;
  private mapToUserContext;
  private mapToRequestContext;
  private determineApprovalLevel;
  private determineTimeout;
  private shouldCacheResult;
  private createAuthorizationConversation;
  private determineSecurityEnhancements;
  private determineCacheStrategy;
  private determineCacheTTL;
  private logAuthorizationDecision;
  private implementAdditionalSecurityMeasures;
  private convertToUserContext;
  private convertToSecurityLevel;
}
//# sourceMappingURL=parlant-enhanced-rbac.guard.d.ts.map
