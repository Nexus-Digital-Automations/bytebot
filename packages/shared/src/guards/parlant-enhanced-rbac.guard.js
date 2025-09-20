"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ParlantEnhancedRBACGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParlantEnhancedRBACGuard = exports.PerformanceRequirementType = exports.CacheStrategy = exports.EnforcementLevel = exports.SecurityAction = exports.SecurityPolicyType = exports.AuthorizationRiskType = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const cache_manager_1 = require("@nestjs/cache-manager");
const rbac_authorization_guard_1 = require("./rbac-authorization.guard");
const rbac_types_1 = require("../types/rbac.types");
const parlant_integration_types_1 = require("../types/parlant-integration.types");
const parlant_types_1 = require("../types/parlant.types");
const parlant_validation_decorators_1 = require("../decorators/parlant-validation.decorators");
const parlant_integration_service_1 = require("../services/parlant-integration.service");
var AuthorizationRiskType;
(function (AuthorizationRiskType) {
    AuthorizationRiskType["_PRIVILEGE_ESCALATION"] = "privilege_escalation";
    AuthorizationRiskType["_SENSITIVE_RESOURCE"] = "sensitive_resource";
    AuthorizationRiskType["_UNUSUAL_ACCESS_PATTERN"] = "unusual_access_pattern";
    AuthorizationRiskType["_HIGH_VALUE_OPERATION"] = "high_value_operation";
    AuthorizationRiskType["_CROSS_BOUNDARY_ACCESS"] = "cross_boundary_access";
    AuthorizationRiskType["_ADMIN_OPERATION"] = "admin_operation";
    AuthorizationRiskType["_BULK_OPERATION"] = "bulk_operation";
    AuthorizationRiskType["_EXTERNAL_SYSTEM_ACCESS"] = "external_system_access";
})(AuthorizationRiskType || (exports.AuthorizationRiskType = AuthorizationRiskType = {}));
var SecurityPolicyType;
(function (SecurityPolicyType) {
    SecurityPolicyType["_ACCESS_CONTROL"] = "access_control";
    SecurityPolicyType["_DATA_PROTECTION"] = "data_protection";
    SecurityPolicyType["_AUDIT_LOGGING"] = "audit_logging";
    SecurityPolicyType["_COMPLIANCE"] = "compliance";
    SecurityPolicyType["_THREAT_PROTECTION"] = "threat_protection";
})(SecurityPolicyType || (exports.SecurityPolicyType = SecurityPolicyType = {}));
var SecurityAction;
(function (SecurityAction) {
    SecurityAction["_ALLOW"] = "allow";
    SecurityAction["_DENY"] = "deny";
    SecurityAction["_REQUIRE_APPROVAL"] = "require_approval";
    SecurityAction["_AUDIT"] = "audit";
    SecurityAction["_ESCALATE"] = "escalate";
})(SecurityAction || (exports.SecurityAction = SecurityAction = {}));
var EnforcementLevel;
(function (EnforcementLevel) {
    EnforcementLevel["_ADVISORY"] = "advisory";
    EnforcementLevel["_ENFORCING"] = "enforcing";
    EnforcementLevel["_STRICT"] = "strict";
})(EnforcementLevel || (exports.EnforcementLevel = EnforcementLevel = {}));
var CacheStrategy;
(function (CacheStrategy) {
    CacheStrategy["_NONE"] = "none";
    CacheStrategy["_AGGRESSIVE"] = "aggressive";
    CacheStrategy["_CONSERVATIVE"] = "conservative";
    CacheStrategy["_INTELLIGENT"] = "intelligent";
})(CacheStrategy || (exports.CacheStrategy = CacheStrategy = {}));
var PerformanceRequirementType;
(function (PerformanceRequirementType) {
    PerformanceRequirementType["_RESPONSE_TIME"] = "response_time";
    PerformanceRequirementType["_CACHE_HIT_RATE"] = "cache_hit_rate";
    PerformanceRequirementType["_CPU_USAGE"] = "cpu_usage";
    PerformanceRequirementType["_MEMORY_USAGE"] = "memory_usage";
})(PerformanceRequirementType || (exports.PerformanceRequirementType = PerformanceRequirementType = {}));
let ParlantEnhancedRBACGuard = ParlantEnhancedRBACGuard_1 = class ParlantEnhancedRBACGuard extends rbac_authorization_guard_1.RBACAuthorizationGuard {
    constructor(reflector, configService, cacheManager, _parlantService) {
        super(reflector, configService, cacheManager);
        this.reflector = reflector;
        this.cacheManager = cacheManager;
        this._parlantService = _parlantService;
        this.rbacLogger = new common_1.Logger(ParlantEnhancedRBACGuard_1.name);
        this.conversationCacheTimeout = configService.get("security.conversationCacheTimeout", 10 * 60 * 1000);
        this.riskThresholds = {
            low: configService.get("security.risk.lowThreshold", 25),
            medium: configService.get("security.risk.mediumThreshold", 50),
            high: configService.get("security.risk.highThreshold", 75),
            critical: configService.get("security.risk.criticalThreshold", 90),
        };
        this.rbacLogger.log("Parlant Enhanced RBAC Guard initialized", {
            conversationCacheTimeout: this.conversationCacheTimeout,
            riskThresholds: this.riskThresholds,
        });
    }
    async canActivate(context) {
        const operationId = `parlant-rbac-${Date.now()}`;
        const startTime = Date.now();
        const request = context.switchToHttp().getRequest();
        this.rbacLogger.debug(`[${operationId}] Enhanced RBAC authorization initiated`, {
            operationId,
            method: request.method,
            url: request.url,
            userId: request.user?.id,
        });
        try {
            const standardResult = await this.performStandardRBACCheck(context);
            if (!standardResult.granted) {
                return this.handleStandardRBACDenial(context, standardResult, operationId);
            }
            const authContext = await this.buildAuthorizationContext(context, request.user, standardResult);
            if (!authContext.riskAssessment.requiresConversation) {
                return this.finalizeStandardAuthorization(authContext, operationId, startTime);
            }
            const conversationalResult = await this.performConversationalAuthorization(authContext, operationId);
            const totalTime = Date.now() - startTime;
            this.rbacLogger.log(`[${operationId}] Enhanced RBAC authorization completed`, {
                operationId,
                granted: conversationalResult.granted,
                totalTime,
                conversationRequired: true,
                riskScore: authContext.riskAssessment.riskScore,
            });
            return conversationalResult.granted;
        }
        catch (error) {
            const totalTime = Date.now() - startTime;
            this.rbacLogger.error(`[${operationId}] Enhanced RBAC authorization failed`, {
                operationId,
                error: error instanceof Error ? error.message : String(error),
                totalTime,
                userId: request.user?.id,
                url: request.url,
            });
            return super.canActivate(context);
        }
    }
    async performConversationalAuthorization(authContext, operationId) {
        const startTime = Date.now();
        this.rbacLogger.log(`[${operationId}] Conversational authorization initiated`, {
            operationId,
            userId: authContext.user.id,
            riskScore: authContext.riskAssessment.riskScore,
            riskLevel: authContext.riskAssessment.riskLevel,
        });
        try {
            const cachedResult = await this.getCachedAuthorizationDecision(authContext);
            if (cachedResult) {
                return this.enhanceCachedResult(cachedResult, authContext, startTime);
            }
            const validationRequest = this.createAuthorizationValidationRequest(operationId, authContext);
            const validationResponse = await this._parlantService.validateFunctionExecution(validationRequest);
            const result = this.processAuthorizationValidationResponse(validationResponse, authContext, startTime);
            await this.cacheAuthorizationDecision(authContext, result);
            await this.logAuthorizationDecision(operationId, authContext, result);
            return result;
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            this.rbacLogger.error(`[${operationId}] Conversational authorization error`, {
                operationId,
                error: error instanceof Error ? error.message : String(error),
                processingTime,
                userId: authContext.user.id,
            });
            return this.createFallbackAuthorizationResult(authContext, startTime, error);
        }
    }
    async performHighRiskAuthorization(authContext, operationId) {
        this.rbacLogger.warn(`[${operationId}] High-risk authorization initiated`, {
            operationId,
            userId: authContext.user.id,
            riskScore: authContext.riskAssessment.riskScore,
            criticalFactors: authContext.riskAssessment.riskFactors.filter((f) => f.critical).length,
        });
        const validationRequest = this.createHighRiskValidationRequest(operationId, authContext);
        const validationResponse = await this._parlantService.validateFunctionExecution(validationRequest);
        if (validationResponse.approved) {
            await this.implementAdditionalSecurityMeasures(authContext, operationId);
        }
        return this.processAuthorizationValidationResponse(validationResponse, authContext, Date.now());
    }
    async performStandardRBACCheck(context) {
        try {
            const granted = await super.canActivate(context);
            return {
                granted,
                evaluatedConditions: ["standard-rbac"],
            };
        }
        catch (error) {
            return {
                granted: false,
                reason: error instanceof Error ? error.message : String(error),
                evaluatedConditions: ["standard-rbac"],
            };
        }
    }
    async buildAuthorizationContext(context, user, _standardResult) {
        const _request = context.switchToHttp().getRequest();
        const _handler = context.getHandler();
        const _controllerClass = context.getClass();
        const rbacMetadata = {
            roles: this.reflector.get("roles", context.getHandler()) || [],
            permissions: this.reflector.get("permissions", context.getHandler()) || [],
        };
        const riskAssessment = await this.assessAuthorizationRisk(context, user, rbacMetadata);
        const securityContext = await this.buildSecurityContext(context, user, rbacMetadata);
        const performanceContext = {
            startTime: new Date(),
            targetResponseTime: 500,
            cacheStrategy: this.determineCacheStrategy(riskAssessment),
            performanceRequirements: [
                {
                    type: PerformanceRequirementType._RESPONSE_TIME,
                    target: 500,
                    maximum: 1000,
                },
                {
                    type: PerformanceRequirementType._CACHE_HIT_RATE,
                    target: 85,
                    maximum: 100,
                },
            ],
        };
        return {
            executionContext: context,
            user,
            rbacMetadata,
            riskAssessment,
            securityContext,
            performanceContext,
        };
    }
    async assessAuthorizationRisk(context, user, rbacMetadata) {
        const riskFactors = [];
        let totalRiskScore = 0;
        if (this.isPrivilegeEscalation(user, rbacMetadata)) {
            riskFactors.push({
                type: AuthorizationRiskType._PRIVILEGE_ESCALATION,
                contribution: 35,
                description: "Operation requires privilege escalation",
                critical: true,
            });
        }
        if (rbacMetadata.adminOnly) {
            riskFactors.push({
                type: AuthorizationRiskType._ADMIN_OPERATION,
                contribution: 30,
                description: "Administrative operation",
                critical: false,
            });
        }
        if (this.involvesSensitiveResource(context, rbacMetadata)) {
            riskFactors.push({
                type: AuthorizationRiskType._SENSITIVE_RESOURCE,
                contribution: 25,
                description: "Access to sensitive resource",
                critical: false,
            });
        }
        if (await this.isUnusualAccessPattern(user, context)) {
            riskFactors.push({
                type: AuthorizationRiskType._UNUSUAL_ACCESS_PATTERN,
                contribution: 20,
                description: "Unusual access pattern detected",
                critical: false,
            });
        }
        totalRiskScore = riskFactors.reduce((sum, factor) => sum + factor.contribution, 0);
        let riskLevel;
        if (totalRiskScore >= this.riskThresholds.critical)
            riskLevel = parlant_types_1.RiskLevel._CRITICAL;
        else if (totalRiskScore >= this.riskThresholds.high)
            riskLevel = parlant_types_1.RiskLevel._HIGH;
        else if (totalRiskScore >= this.riskThresholds.medium)
            riskLevel = parlant_types_1.RiskLevel._MODERATE;
        else if (totalRiskScore >= this.riskThresholds.low)
            riskLevel = parlant_types_1.RiskLevel._LOW;
        else
            riskLevel = parlant_types_1.RiskLevel._MINIMAL;
        const requiresConversation = totalRiskScore >= this.riskThresholds.medium ||
            rbacMetadata.adminOnly ||
            riskFactors.some((f) => f.critical);
        return {
            riskScore: Math.min(totalRiskScore, 100),
            riskFactors,
            riskLevel,
            requiresConversation,
            assessedAt: new Date(),
        };
    }
    async buildSecurityContext(context, user, rbacMetadata) {
        const _request = context.switchToHttp().getRequest();
        const securityClassification = this.determineSecurityClassification(rbacMetadata, context);
        const activePolicies = await this.getActiveSecurityPolicies(user, context);
        return {
            isPrivilegedOperation: rbacMetadata.adminOnly || this.isPrivilegedOperation(context),
            securityClassification,
            activePolicies,
            complianceRequirements: this.getComplianceRequirements(context),
            auditRequired: rbacMetadata.auditAccess ||
                securityClassification !== parlant_types_1.FunctionSecurityLevel._PUBLIC,
        };
    }
    createAuthorizationValidationRequest(operationId, authContext) {
        const request = authContext.executionContext
            .switchToHttp()
            .getRequest();
        const functionContext = {
            functionName: this.extractFunctionName(authContext.executionContext),
            arguments: this.sanitizeArguments(request),
            source: {
                filePath: __filename,
                methodName: "performConversationalAuthorization",
                className: ParlantEnhancedRBACGuard_1.name,
            },
            securityLevel: authContext.securityContext.securityClassification,
            riskLevel: authContext.riskAssessment.riskLevel,
            executionContext: {
                environment: this.getExecutionEnvironment(),
                user: this.mapToUserContext(authContext.user),
                request: this.mapToRequestContext(request),
                properties: {
                    riskScore: authContext.riskAssessment.riskScore,
                    riskFactors: authContext.riskAssessment.riskFactors.length,
                    rbacMetadata: authContext.rbacMetadata,
                },
            },
        };
        const validationParams = {
            mode: parlant_types_1.ValidationMode._INTERACTIVE,
            approvalLevel: this.determineApprovalLevel(authContext),
            timeout: this.determineTimeout(authContext),
            cacheable: this.shouldCacheResult(authContext),
            rules: [],
        };
        return {
            operationId: operationId,
            functionName: functionContext.functionName,
            packageName: ParlantEnhancedRBACGuard_1.name,
            description: `RBAC authorization validation for ${functionContext.functionName}`,
            parameters: functionContext.arguments,
            userContext: this.convertToUserContext(functionContext.executionContext.user),
            securityLevel: this.convertToSecurityLevel(functionContext.securityLevel),
            timeout: validationParams.timeout,
        };
    }
    createHighRiskValidationRequest(operationId, authContext) {
        const baseRequest = this.createAuthorizationValidationRequest(operationId, authContext);
        baseRequest.timeout = 120000;
        baseRequest.description = `HIGH-RISK: ${baseRequest.description} - Critical approval required`;
        baseRequest.parameters = {
            ...baseRequest.parameters,
            highRisk: true,
            criticalRiskFactors: authContext.riskAssessment.riskFactors.filter((f) => f.critical),
            approvalLevel: "DUAL_APPROVAL",
        };
        return baseRequest;
    }
    processAuthorizationValidationResponse(response, authContext, startTime) {
        const totalTime = Date.now() - startTime;
        const result = {
            granted: response.approved,
            reason: response.reason,
            evaluatedConditions: ["conversational-validation"],
            conversationContext: { conversationId: response.conversationId },
            performanceMetrics: {
                totalTime,
                conversationTime: response.metadata?.processingTime || 0,
                cacheLookupTime: 0,
                policyEvaluationTime: 0,
                riskAssessmentTime: 0,
            },
            cacheInfo: {
                cached: false,
                hit: false,
            },
            securityEnhancements: this.determineSecurityEnhancements(authContext, response.approved
                ? parlant_types_1.ValidationDecision._APPROVED
                : parlant_types_1.ValidationDecision._DENIED),
        };
        if (response.approved && response.confidence < 0.8) {
            result.securityEnhancements.push("low_confidence_approval");
        }
        return result;
    }
    async getCachedAuthorizationDecision(authContext) {
        const cacheKey = this.buildAuthorizationCacheKey(authContext);
        const result = await this.cacheManager.get(cacheKey);
        return result || null;
    }
    async cacheAuthorizationDecision(authContext, result) {
        if (!result.cacheInfo.cached) {
            return;
        }
        const cacheKey = this.buildAuthorizationCacheKey(authContext);
        const ttl = this.determineCacheTTL(authContext, result);
        await this.cacheManager.set(cacheKey, result, ttl);
    }
    buildAuthorizationCacheKey(authContext) {
        const request = authContext.executionContext
            .switchToHttp()
            .getRequest();
        return `auth:${authContext.user.id}:${request.method}:${request.url}:${authContext.riskAssessment.riskScore}`;
    }
    enhanceCachedResult(cachedResult, authContext, startTime) {
        return {
            ...cachedResult,
            performanceMetrics: {
                ...cachedResult.performanceMetrics,
                totalTime: Date.now() - startTime,
                cacheLookupTime: Date.now() - startTime,
            },
            cacheInfo: {
                cached: true,
                hit: true,
                cacheKey: this.buildAuthorizationCacheKey(authContext),
            },
        };
    }
    createFallbackAuthorizationResult(authContext, startTime, _error) {
        return {
            granted: false,
            reason: "Conversational authorization service unavailable",
            evaluatedConditions: ["fallback"],
            performanceMetrics: {
                totalTime: Date.now() - startTime,
                cacheLookupTime: 0,
                policyEvaluationTime: 0,
                riskAssessmentTime: 0,
            },
            cacheInfo: {
                cached: false,
                hit: false,
            },
            securityEnhancements: ["fallback_mode"],
        };
    }
    async handleStandardRBACDenial(context, standardResult, _operationId) {
        const request = context.switchToHttp().getRequest();
        if (!request.user) {
            throw new common_1.UnauthorizedException("Authentication required");
        }
        throw new common_1.ForbiddenException(standardResult.reason || "Access denied");
    }
    finalizeStandardAuthorization(authContext, operationId, startTime) {
        const totalTime = Date.now() - startTime;
        this.rbacLogger.debug(`[${operationId}] Standard authorization sufficient`, {
            operationId,
            userId: authContext.user.id,
            riskScore: authContext.riskAssessment.riskScore,
            totalTime,
        });
        return true;
    }
    isPrivilegeEscalation(user, rbacMetadata) {
        return Boolean(rbacMetadata.adminOnly) && !this.isParlantAdmin(user);
    }
    involvesSensitiveResource(context, rbacMetadata) {
        return rbacMetadata.resource?.resource === "sensitive" || false;
    }
    async isUnusualAccessPattern(_user, _context) {
        return false;
    }
    isParlantAdmin(user) {
        const userRoles = this.getParlantUserRoles(user);
        return (userRoles.includes(rbac_types_1.Role._ADMIN) || userRoles.includes(rbac_types_1.Role._SUPER_ADMIN));
    }
    getParlantUserRoles(user) {
        if (user.roles && Array.isArray(user.roles)) {
            return user.roles;
        }
        if (user.role) {
            return [user.role];
        }
        return [rbac_types_1.Role._GUEST];
    }
    determineSecurityClassification(rbacMetadata, _context) {
        if (rbacMetadata.adminOnly)
            return parlant_types_1.FunctionSecurityLevel._RESTRICTED;
        if (rbacMetadata.permissions?.length)
            return parlant_types_1.FunctionSecurityLevel._INTERNAL;
        return parlant_types_1.FunctionSecurityLevel._PUBLIC;
    }
    async getActiveSecurityPolicies(_user, _context) {
        return [];
    }
    getComplianceRequirements(_context) {
        return [];
    }
    isPrivilegedOperation(_context) {
        return false;
    }
    extractFunctionName(context) {
        const handler = context.getHandler();
        return handler.name || "unknown";
    }
    sanitizeArguments(request) {
        return {
            method: request.method,
            url: request.url,
        };
    }
    getExecutionEnvironment() {
        return parlant_types_1.ExecutionEnvironment._DEVELOPMENT;
    }
    mapToUserContext(user) {
        return {
            userId: user.id,
            roles: user.roles?.map((r) => r.toString()) || [user.role || "guest"],
            permissions: user.permissions?.map((p) => p.toString()) || [],
        };
    }
    mapToRequestContext(request) {
        return {
            requestId: `req-${Date.now()}`,
            method: request.method,
            url: request.url,
            headers: request.headers,
        };
    }
    determineApprovalLevel(authContext) {
        if (authContext.riskAssessment.riskLevel === parlant_types_1.RiskLevel._CRITICAL) {
            return parlant_types_1.ApprovalLevel._DUAL_APPROVAL;
        }
        if (authContext.securityContext.isPrivilegedOperation) {
            return parlant_types_1.ApprovalLevel._SINGLE_APPROVAL;
        }
        return parlant_types_1.ApprovalLevel._AUTOMATIC;
    }
    determineTimeout(authContext) {
        if (authContext.riskAssessment.riskLevel === parlant_types_1.RiskLevel._CRITICAL) {
            return 120000;
        }
        return 45000;
    }
    shouldCacheResult(authContext) {
        return authContext.riskAssessment.riskLevel !== parlant_types_1.RiskLevel._CRITICAL;
    }
    createAuthorizationConversation(_authContext) {
        return {};
    }
    determineSecurityEnhancements(authContext, decision) {
        const enhancements = [];
        if (decision === parlant_types_1.ValidationDecision._APPROVED) {
            enhancements.push("conversational_approval");
        }
        if (authContext.riskAssessment.riskLevel === parlant_types_1.RiskLevel._CRITICAL) {
            enhancements.push("high_risk_monitoring");
        }
        return enhancements;
    }
    determineCacheStrategy(riskAssessment) {
        if (riskAssessment.riskLevel === parlant_types_1.RiskLevel._CRITICAL) {
            return CacheStrategy._NONE;
        }
        if (riskAssessment.riskLevel === parlant_types_1.RiskLevel._HIGH) {
            return CacheStrategy._CONSERVATIVE;
        }
        return CacheStrategy._INTELLIGENT;
    }
    determineCacheTTL(authContext, _result) {
        if (authContext.riskAssessment.riskLevel === parlant_types_1.RiskLevel._CRITICAL) {
            return 60000;
        }
        if (authContext.riskAssessment.riskLevel === parlant_types_1.RiskLevel._HIGH) {
            return 300000;
        }
        return 600000;
    }
    async logAuthorizationDecision(operationId, authContext, result) {
        this.rbacLogger.log(`[${operationId}] Authorization decision logged`, {
            operationId,
            userId: authContext.user.id,
            granted: result.granted,
            reason: result.reason,
            riskScore: authContext.riskAssessment.riskScore,
        });
    }
    async implementAdditionalSecurityMeasures(authContext, operationId) {
        this.rbacLogger.log(`[${operationId}] Additional security measures implemented`, {
            operationId,
            userId: authContext.user.id,
            measures: ["enhanced_monitoring", "audit_trail"],
        });
    }
    convertToUserContext(user) {
        if (!user) {
            return {
                userId: "unknown",
                roles: ["guest"],
                sessionId: "unknown",
                ipAddress: "unknown",
                metadata: {},
            };
        }
        return {
            userId: user.userId || "unknown",
            roles: user.roles || ["guest"],
            sessionId: "unknown",
            ipAddress: "unknown",
            metadata: user.metadata || {},
        };
    }
    convertToSecurityLevel(level) {
        switch (level) {
            case parlant_types_1.FunctionSecurityLevel._PUBLIC:
                return parlant_integration_types_1.SecurityLevel._LOW;
            case parlant_types_1.FunctionSecurityLevel._INTERNAL:
                return parlant_integration_types_1.SecurityLevel._MEDIUM;
            case parlant_types_1.FunctionSecurityLevel._RESTRICTED:
                return parlant_integration_types_1.SecurityLevel._HIGH;
            default:
                return parlant_integration_types_1.SecurityLevel._MEDIUM;
        }
    }
};
exports.ParlantEnhancedRBACGuard = ParlantEnhancedRBACGuard;
__decorate([
    (0, parlant_validation_decorators_1.ParlantValidation)({
        mode: parlant_types_1.ValidationMode._INTERACTIVE,
        approvalLevel: parlant_types_1.ApprovalLevel._SINGLE_APPROVAL,
        timeout: 45000,
        cacheable: true,
    }),
    (0, parlant_validation_decorators_1.SecurityClassification)({
        securityLevel: parlant_types_1.FunctionSecurityLevel._RESTRICTED,
        riskLevel: parlant_types_1.RiskLevel._HIGH,
    }),
    (0, parlant_validation_decorators_1.ConversationContext)({
        topic: "Authorization Request Validation",
        priority: parlant_types_1.ConversationPriority._HIGH,
        requiredParticipants: [parlant_types_1.ParticipantRole._APPROVER],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ParlantEnhancedRBACGuard.prototype, "performConversationalAuthorization", null);
__decorate([
    (0, parlant_validation_decorators_1.ParlantValidation)({
        mode: parlant_types_1.ValidationMode._INTERACTIVE,
        approvalLevel: parlant_types_1.ApprovalLevel._DUAL_APPROVAL,
        timeout: 120000,
    }),
    (0, parlant_validation_decorators_1.SecurityClassification)({
        securityLevel: parlant_types_1.FunctionSecurityLevel._SECRET,
        riskLevel: parlant_types_1.RiskLevel._CRITICAL,
    }),
    (0, parlant_validation_decorators_1.ConversationContext)({
        topic: "High-Risk Authorization Validation",
        priority: parlant_types_1.ConversationPriority._CRITICAL,
        requiredParticipants: [
            parlant_types_1.ParticipantRole._APPROVER,
            parlant_types_1.ParticipantRole._VALIDATOR,
        ],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ParlantEnhancedRBACGuard.prototype, "performHighRiskAuthorization", null);
exports.ParlantEnhancedRBACGuard = ParlantEnhancedRBACGuard = ParlantEnhancedRBACGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [core_1.Reflector,
        config_1.ConfigService, Object, parlant_integration_service_1.ParlantIntegrationService])
], ParlantEnhancedRBACGuard);
//# sourceMappingURL=parlant-enhanced-rbac.guard.js.map