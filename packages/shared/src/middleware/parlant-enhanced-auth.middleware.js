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
var ParlantEnhancedAuthMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParlantEnhancedAuthMiddleware = exports.RequestRiskType = exports.SecurityMeasureType = exports.ThreatLevel = exports.AuthMethod = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cache_manager_1 = require("@nestjs/cache-manager");
const parlant_integration_types_1 = require("../types/parlant-integration.types");
const parlant_types_1 = require("../types/parlant.types");
const parlant_validation_decorators_1 = require("../decorators/parlant-validation.decorators");
const parlant_integration_service_1 = require("../services/parlant-integration.service");
var AuthMethod;
(function (AuthMethod) {
    AuthMethod["JWT_TOKEN"] = "jwt_token";
    AuthMethod["API_KEY"] = "api_key";
    AuthMethod["CERTIFICATE"] = "certificate";
    AuthMethod["SSO"] = "sso";
    AuthMethod["CONVERSATIONAL"] = "conversational";
})(AuthMethod || (exports.AuthMethod = AuthMethod = {}));
var ThreatLevel;
(function (ThreatLevel) {
    ThreatLevel["NONE"] = "none";
    ThreatLevel["LOW"] = "low";
    ThreatLevel["MEDIUM"] = "medium";
    ThreatLevel["HIGH"] = "high";
    ThreatLevel["CRITICAL"] = "critical";
})(ThreatLevel || (exports.ThreatLevel = ThreatLevel = {}));
var SecurityMeasureType;
(function (SecurityMeasureType) {
    SecurityMeasureType["RATE_LIMITING"] = "rate_limiting";
    SecurityMeasureType["IP_FILTERING"] = "ip_filtering";
    SecurityMeasureType["ENHANCED_LOGGING"] = "enhanced_logging";
    SecurityMeasureType["SESSION_MONITORING"] = "session_monitoring";
    SecurityMeasureType["MFA_REQUIRED"] = "mfa_required";
    SecurityMeasureType["CONVERSATION_REQUIRED"] = "conversation_required";
})(SecurityMeasureType || (exports.SecurityMeasureType = SecurityMeasureType = {}));
var RequestRiskType;
(function (RequestRiskType) {
    RequestRiskType["UNUSUAL_IP"] = "unusual_ip";
    RequestRiskType["SUSPICIOUS_USER_AGENT"] = "suspicious_user_agent";
    RequestRiskType["HIGH_REQUEST_RATE"] = "high_request_rate";
    RequestRiskType["PRIVILEGE_ESCALATION"] = "privilege_escalation";
    RequestRiskType["SENSITIVE_ENDPOINT"] = "sensitive_endpoint";
    RequestRiskType["ANOMALOUS_PATTERN"] = "anomalous_pattern";
    RequestRiskType["GEOGRAPHIC_ANOMALY"] = "geographic_anomaly";
    RequestRiskType["TIME_ANOMALY"] = "time_anomaly";
})(RequestRiskType || (exports.RequestRiskType = RequestRiskType = {}));
let ParlantEnhancedAuthMiddleware = ParlantEnhancedAuthMiddleware_1 = class ParlantEnhancedAuthMiddleware {
    constructor(configService, _parlantService, _cacheManager) {
        this.configService = configService;
        this._parlantService = _parlantService;
        this._cacheManager = _cacheManager;
        this.logger = new common_1.Logger(ParlantEnhancedAuthMiddleware_1.name);
        this.riskThresholds = {
            low: configService.get("security.risk.lowThreshold", 25),
            medium: configService.get("security.risk.mediumThreshold", 50),
            high: configService.get("security.risk.highThreshold", 75),
            critical: configService.get("security.risk.criticalThreshold", 90),
        };
        this.securityConfig = {
            enableConversationalAuth: configService.get("security.conversationalAuth.enabled", true),
            riskAssessmentTimeout: configService.get("security.riskAssessment.timeout", 5000),
            conversationTimeout: configService.get("security.conversation.timeout", 30000),
            cacheTTL: configService.get("security.cache.ttl", 300000),
            fallbackToStandardAuth: configService.get("security.fallback.enabled", true),
        };
        this.logger.log("Parlant Enhanced Authentication Middleware initialized", {
            riskThresholds: this.riskThresholds,
            conversationalAuthEnabled: this.securityConfig.enableConversationalAuth,
        });
    }
    async use(req, res, next) {
        const operationId = `parlant-auth-middleware-${Date.now()}`;
        const startTime = Date.now();
        this.initializeRequestState(req);
        this.logger.debug(`[${operationId}] Enhanced authentication middleware initiated`, {
            operationId,
            method: req.method,
            url: req.url,
            clientIp: this.getClientIP(req),
        });
        try {
            const riskAssessment = await this.performRequestRiskAssessment(req, operationId);
            req.riskAssessment = riskAssessment;
            const requiresConversation = await this.shouldPerformConversationalAuth(req, riskAssessment);
            if (!requiresConversation) {
                await this.performStandardAuthentication(req, operationId);
            }
            else {
                await this.performConversationalAuthentication(req, operationId);
            }
            await this.applySecurityMeasures(req, res, operationId);
            this.setEnhancedSecurityHeaders(req, res);
            const processingTime = Date.now() - startTime;
            this.logger.log(`[${operationId}] Enhanced authentication completed`, {
                operationId,
                authenticated: req.authenticationState?.isAuthenticated,
                conversationalValidation: req.authenticationState?.conversationalValidation,
                riskScore: riskAssessment.overallRisk,
                processingTime,
            });
            next();
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            this.logger.error(`[${operationId}] Enhanced authentication failed`, {
                operationId,
                error: error instanceof Error ? error.message : String(error),
                processingTime,
                url: req.url,
                clientIp: this.getClientIP(req),
            });
            if (req.authenticationState) {
                req.authenticationState.authError =
                    error instanceof Error ? error.message : String(error);
            }
            if (this.securityConfig.fallbackToStandardAuth) {
                this.logger.log(`[${operationId}] Falling back to standard authentication`);
                try {
                    await this.performStandardAuthentication(req, operationId);
                    next();
                }
                catch (_fallbackError) {
                    throw new common_1.UnauthorizedException("Authentication failed");
                }
            }
            else {
                throw new common_1.UnauthorizedException("Enhanced authentication required");
            }
        }
    }
    async performConversationalAuthentication(req, operationId) {
        const startTime = Date.now();
        this.logger.log(`[${operationId}] Conversational authentication initiated`, {
            operationId,
            riskScore: req.riskAssessment?.overallRisk,
            url: req.url,
            clientIp: this.getClientIP(req),
        });
        try {
            const cachedResult = await this.getCachedAuthenticationDecision(req);
            if (cachedResult) {
                this.applyCachedAuthentication(req, cachedResult);
                return;
            }
            const validationRequest = this.createAuthenticationValidationRequest(req, operationId);
            const validationResponse = await this._parlantService.validateFunctionExecution(validationRequest);
            const authResult = this.processAuthenticationValidationResponse(req, validationResponse);
            this.applyAuthenticationResult(req, authResult);
            await this.cacheAuthenticationDecision(req, authResult);
            const processingTime = Date.now() - startTime;
            this.logger.log(`[${operationId}] Conversational authentication completed`, {
                operationId,
                success: authResult.success,
                processingTime,
                conversationId: authResult.conversationContext?.conversationId,
            });
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            this.logger.error(`[${operationId}] Conversational authentication error`, {
                operationId,
                error: error instanceof Error ? error.message : String(error),
                processingTime,
            });
            req.authenticationState.authError =
                "Conversational authentication failed";
            req.authenticationState.conversationalValidation = false;
            throw error;
        }
    }
    async performHighRiskAuthentication(req, operationId) {
        this.logger.warn(`[${operationId}] High-risk authentication initiated`, {
            operationId,
            riskScore: req.riskAssessment?.overallRisk,
            criticalFactors: req.riskAssessment?.riskFactors.filter((f) => f.critical)
                .length,
            url: req.url,
            clientIp: this.getClientIP(req),
        });
        const validationRequest = this.createHighRiskValidationRequest(req, operationId);
        const validationResponse = await this._parlantService.validateFunctionExecution(validationRequest);
        const authResult = this.processAuthenticationValidationResponse(req, validationResponse);
        if (authResult.success) {
            await this.implementHighRiskSecurityMeasures(req, operationId);
        }
        this.applyAuthenticationResult(req, authResult);
    }
    async performRequestRiskAssessment(req, operationId) {
        const startTime = Date.now();
        const riskFactors = [];
        let totalRisk = 0;
        const ipRisk = await this.assessIPRisk(req);
        if (ipRisk.contribution > 0) {
            riskFactors.push(ipRisk);
            totalRisk += ipRisk.contribution;
        }
        const userAgentRisk = this.assessUserAgentRisk(req);
        if (userAgentRisk.contribution > 0) {
            riskFactors.push(userAgentRisk);
            totalRisk += userAgentRisk.contribution;
        }
        const requestRateRisk = await this.assessRequestRateRisk(req);
        if (requestRateRisk.contribution > 0) {
            riskFactors.push(requestRateRisk);
            totalRisk += requestRateRisk.contribution;
        }
        const endpointRisk = this.assessEndpointRisk(req);
        if (endpointRisk.contribution > 0) {
            riskFactors.push(endpointRisk);
            totalRisk += endpointRisk.contribution;
        }
        const timeRisk = this.assessTimeRisk(req);
        if (timeRisk.contribution > 0) {
            riskFactors.push(timeRisk);
            totalRisk += timeRisk.contribution;
        }
        const geographicRisk = await this.assessGeographicRisk(req);
        if (geographicRisk.contribution > 0) {
            riskFactors.push(geographicRisk);
            totalRisk += geographicRisk.contribution;
        }
        let riskLevel;
        if (totalRisk >= this.riskThresholds.critical)
            riskLevel = parlant_types_1.RiskLevel._CRITICAL;
        else if (totalRisk >= this.riskThresholds.high)
            riskLevel = parlant_types_1.RiskLevel._HIGH;
        else if (totalRisk >= this.riskThresholds.medium)
            riskLevel = parlant_types_1.RiskLevel._MODERATE;
        else if (totalRisk >= this.riskThresholds.low)
            riskLevel = parlant_types_1.RiskLevel._LOW;
        else
            riskLevel = parlant_types_1.RiskLevel._MINIMAL;
        const assessmentTime = Date.now() - startTime;
        this.logger.debug(`[${operationId}] Risk assessment completed`, {
            operationId,
            totalRisk: Math.min(totalRisk, 100),
            riskLevel,
            factorCount: riskFactors.length,
            assessmentTime,
        });
        return {
            overallRisk: Math.min(totalRisk, 100),
            riskFactors,
            riskLevel,
            assessedAt: new Date(),
            metadata: {
                assessmentTime,
                operationId,
            },
        };
    }
    async shouldPerformConversationalAuth(req, riskAssessment) {
        if (!this.securityConfig.enableConversationalAuth) {
            return false;
        }
        if (riskAssessment.overallRisk >= this.riskThresholds.high) {
            return true;
        }
        const hasCriticalFactors = riskAssessment.riskFactors.some((f) => f.critical);
        if (hasCriticalFactors) {
            return true;
        }
        if (this.isSensitiveEndpoint(req)) {
            return true;
        }
        if (this.isAdministrativeOperation(req)) {
            return true;
        }
        return false;
    }
    initializeRequestState(req) {
        req.authenticationState = {
            isAuthenticated: false,
            conversationalValidation: false,
            riskScore: 0,
            securityMeasures: [],
        };
        req.securityContext = {
            classification: parlant_types_1.FunctionSecurityLevel._PUBLIC,
            threatLevel: ThreatLevel.NONE,
            appliedPolicies: [],
            activeMeasures: [],
            complianceRequirements: [],
        };
    }
    createAuthenticationValidationRequest(req, operationId) {
        return {
            operationId,
            functionName: "authenticateRequest",
            packageName: "@bytebot/shared/middleware",
            description: "Enhanced conversational authentication middleware validation",
            parameters: this.sanitizeRequestArguments(req),
            userContext: {
                userId: req.user?.userId || req.user?.id || "anonymous",
                roles: req.user?.roles || [],
                sessionId: req.sessionId || operationId,
                ipAddress: req.ip || "unknown",
                metadata: {
                    riskScore: req.riskAssessment?.overallRisk || 0,
                    riskFactors: req.riskAssessment?.riskFactors?.length || 0,
                    criticalFactors: req.riskAssessment?.riskFactors?.filter((f) => f.critical).length ||
                        0,
                },
            },
            securityLevel: this.mapToSecurityLevel(this.determineSecurityLevel(req)),
            timeout: this.securityConfig.conversationTimeout,
        };
    }
    createHighRiskValidationRequest(req, operationId) {
        const baseRequest = this.createAuthenticationValidationRequest(req, operationId);
        return {
            ...baseRequest,
            description: "HIGH-RISK Enhanced conversational authentication middleware validation",
            securityLevel: parlant_integration_types_1.SecurityLevel._CRITICAL,
            timeout: 60000,
            userContext: {
                ...baseRequest.userContext,
                metadata: {
                    ...baseRequest.userContext.metadata,
                    highRisk: true,
                    criticalFactors: req.riskAssessment?.riskFactors?.filter((f) => f.critical).length ||
                        0,
                    priority: "critical",
                },
            },
        };
    }
    processAuthenticationValidationResponse(req, response) {
        const conversationContext = {
            conversationId: response.conversationId,
            userId: req.user?.userId || req.user?.id,
            sessionId: req.sessionId,
            state: response.approved
                ? parlant_types_1.ConversationState._APPROVED
                : parlant_types_1.ConversationState._DENIED,
            metadata: {
                priority: parlant_types_1.ConversationPriority._NORMAL,
                tags: ["authentication", "middleware"],
                properties: {
                    reason: response.reason,
                    confidence: response.confidence,
                },
                history: [],
            },
            participants: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const result = {
            success: response.approved,
            conversationContext: conversationContext,
            requiredMeasures: [],
            metadata: {
                processingTime: response.metadata.processingTime,
                confidence: response.confidence,
                decision: response.approved ? "approved" : "denied",
            },
        };
        if (response.approved) {
            result.user = this.extractUserFromToken(req);
            if (response.executionContext) {
                result.requiredMeasures = this.mapExecutionContextToMeasures(response.executionContext);
            }
        }
        else {
            result.error = response.reason;
        }
        return result;
    }
    mapExecutionContextToMeasures(executionContext) {
        const measures = [];
        const now = new Date();
        if (executionContext.resourceLimits) {
            if (executionContext.resourceLimits.maxExecutionTime < 30000) {
                measures.push(this.createSecurityMeasure(SecurityMeasureType.SESSION_MONITORING, { timeLimit: 30000, type: "time_limit_30s" }, now));
            }
            if (executionContext.resourceLimits.fileSystemAccess === "none") {
                measures.push(this.createSecurityMeasure(SecurityMeasureType.ENHANCED_LOGGING, { restriction: "no_file_access", level: "strict" }, now));
            }
            if (executionContext.resourceLimits.networkAccess === "none") {
                measures.push(this.createSecurityMeasure(SecurityMeasureType.ENHANCED_LOGGING, { restriction: "no_network_access", level: "strict" }, now));
            }
        }
        if (executionContext.monitoring?.realTimeMonitoring) {
            measures.push(this.createSecurityMeasure(SecurityMeasureType.SESSION_MONITORING, { realTimeMonitoring: true }, now));
        }
        if (executionContext.monitoring?.auditTrail) {
            measures.push(this.createSecurityMeasure(SecurityMeasureType.ENHANCED_LOGGING, { auditTrail: true, level: "comprehensive" }, now));
        }
        return measures;
    }
    createSecurityMeasure(type, parameters, appliedAt, expiresAt) {
        return {
            type,
            parameters,
            appliedAt,
            expiresAt,
        };
    }
    applyAuthenticationResult(req, result) {
        req.authenticationState.isAuthenticated = result.success;
        req.authenticationState.conversationalValidation = true;
        req.authenticationState.authenticatedAt = new Date();
        if (result.success && result.user) {
            req.user = result.user;
            req.authenticationState.authMethod = AuthMethod.CONVERSATIONAL;
        }
        else if (result.error) {
            req.authenticationState.authError = result.error;
        }
        if (result.conversationContext) {
            req.conversationContext = result.conversationContext;
        }
        for (const measure of result.requiredMeasures) {
            req.authenticationState.securityMeasures.push(measure.type);
            req.securityContext.activeMeasures.push(measure);
        }
    }
    async applySecurityMeasures(req, res, operationId) {
        const riskLevel = req.riskAssessment?.riskLevel;
        if (!riskLevel) {
            return;
        }
        switch (riskLevel) {
            case parlant_types_1.RiskLevel._CRITICAL:
                await this.applyCriticalSecurityMeasures(req, res, operationId);
                break;
            case parlant_types_1.RiskLevel._HIGH:
                await this.applyHighSecurityMeasures(req, res, operationId);
                break;
            case parlant_types_1.RiskLevel._MODERATE:
                await this.applyModerateSecurityMeasures(req, res, operationId);
                break;
            case parlant_types_1.RiskLevel._LOW:
                await this.applyLowSecurityMeasures(req, res, operationId);
                break;
        }
    }
    setEnhancedSecurityHeaders(req, res) {
        const headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        };
        if (req.authenticationState?.isAuthenticated) {
            headers["X-Authenticated"] = "true";
            headers["X-Auth-Method"] =
                req.authenticationState.authMethod || "unknown";
            headers["X-Risk-Score"] =
                req.riskAssessment?.overallRisk.toString() || "0";
        }
        if (req.authenticationState?.conversationalValidation) {
            headers["X-Conversational-Auth"] = "true";
        }
        if (req.conversationContext?.conversationId) {
            headers["X-Conversation-ID"] = req.conversationContext.conversationId;
        }
        res.set(headers);
    }
    async assessIPRisk(req) {
        const clientIP = this.getClientIP(req);
        return {
            type: RequestRiskType.UNUSUAL_IP,
            contribution: 0,
            description: `IP assessment for ${clientIP}`,
            critical: false,
        };
    }
    assessUserAgentRisk(req) {
        const userAgent = req.get("User-Agent") || "";
        return {
            type: RequestRiskType.SUSPICIOUS_USER_AGENT,
            contribution: 0,
            description: `User agent analysis: ${userAgent.substring(0, 50)}...`,
            critical: false,
        };
    }
    async assessRequestRateRisk(req) {
        const clientIP = this.getClientIP(req);
        return {
            type: RequestRiskType.HIGH_REQUEST_RATE,
            contribution: 0,
            description: `Request rate analysis for ${clientIP}`,
            critical: false,
        };
    }
    assessEndpointRisk(req) {
        const isSensitive = this.isSensitiveEndpoint(req);
        return {
            type: RequestRiskType.SENSITIVE_ENDPOINT,
            contribution: isSensitive ? 30 : 0,
            description: `Endpoint sensitivity analysis for ${req.url}`,
            critical: isSensitive && req.method !== "GET",
        };
    }
    assessTimeRisk(_req) {
        const hour = new Date().getHours();
        const isUnusualTime = hour >= 23 || hour <= 6;
        return {
            type: RequestRiskType.TIME_ANOMALY,
            contribution: isUnusualTime ? 15 : 0,
            description: "Time-based risk analysis",
            critical: false,
        };
    }
    async assessGeographicRisk(_req) {
        return {
            type: RequestRiskType.GEOGRAPHIC_ANOMALY,
            contribution: 0,
            description: "Geographic location analysis",
            critical: false,
        };
    }
    getClientIP(req) {
        const forwarded = req.get("X-Forwarded-For");
        if (forwarded) {
            return forwarded.split(",")[0]?.trim() ?? "unknown";
        }
        return req.get("X-Real-IP") ?? req.socket?.remoteAddress ?? "unknown";
    }
    isSensitiveEndpoint(req) {
        const sensitivePatterns = [
            "/admin",
            "/api/admin",
            "/users",
            "/auth",
            "/config",
            "/system",
        ];
        return sensitivePatterns.some((pattern) => req.url?.startsWith(pattern));
    }
    isAdministrativeOperation(req) {
        return req.url?.includes("/admin") || false;
    }
    determineSecurityLevel(req) {
        if (req.riskAssessment?.riskLevel === parlant_types_1.RiskLevel._CRITICAL) {
            return parlant_types_1.FunctionSecurityLevel._SECRET;
        }
        if (this.isSensitiveEndpoint(req)) {
            return parlant_types_1.FunctionSecurityLevel._RESTRICTED;
        }
        return parlant_types_1.FunctionSecurityLevel._INTERNAL;
    }
    mapToSecurityLevel(securityLevel) {
        switch (securityLevel) {
            case parlant_types_1.FunctionSecurityLevel._SECRET:
            case parlant_types_1.FunctionSecurityLevel._CONFIDENTIAL:
                return parlant_integration_types_1.SecurityLevel._CRITICAL;
            case parlant_types_1.FunctionSecurityLevel._RESTRICTED:
                return parlant_integration_types_1.SecurityLevel._HIGH;
            case parlant_types_1.FunctionSecurityLevel._INTERNAL:
                return parlant_integration_types_1.SecurityLevel._MEDIUM;
            case parlant_types_1.FunctionSecurityLevel._PUBLIC:
            default:
                return parlant_integration_types_1.SecurityLevel._LOW;
        }
    }
    determineApprovalLevel(req) {
        if (req.riskAssessment?.riskLevel === parlant_types_1.RiskLevel._CRITICAL) {
            return parlant_types_1.ApprovalLevel._DUAL_APPROVAL;
        }
        if (req.riskAssessment?.riskLevel === parlant_types_1.RiskLevel._HIGH) {
            return parlant_types_1.ApprovalLevel._SINGLE_APPROVAL;
        }
        return parlant_types_1.ApprovalLevel._AUTOMATIC;
    }
    getExecutionEnvironment() {
        const env = this.configService.get("NODE_ENV", "development");
        switch (env.toLowerCase()) {
            case "production":
                return parlant_types_1.ExecutionEnvironment._PRODUCTION;
            case "staging":
                return parlant_types_1.ExecutionEnvironment._STAGING;
            case "test":
                return parlant_types_1.ExecutionEnvironment._TESTING;
            default:
                return parlant_types_1.ExecutionEnvironment._DEVELOPMENT;
        }
    }
    sanitizeRequestArguments(req) {
        return {
            method: req.method,
            url: req.url,
        };
    }
    mapToRequestContext(req) {
        return {
            requestId: `req-${Date.now()}`,
            method: req.method,
            url: req.url,
            headers: req.headers,
            clientIp: this.getClientIP(req),
            userAgent: req.get("User-Agent"),
        };
    }
    createAuthenticationConversation(req) {
        return {
            conversationId: `auth-conv-${Date.now()}`,
            metadata: {
                topic: "Request Authentication Validation",
                priority: parlant_types_1.ConversationPriority._HIGH,
                properties: {
                    url: req.url,
                    method: req.method,
                    riskScore: req.riskAssessment?.overallRisk,
                },
            },
        };
    }
    async performStandardAuthentication(req, _operationId) {
        req.authenticationState.isAuthenticated = false;
        req.authenticationState.conversationalValidation = false;
        req.authenticationState.authMethod = AuthMethod.JWT_TOKEN;
    }
    extractUserFromToken(_req) {
        return undefined;
    }
    mapRecommendationsToMeasures(_recommendations) {
        return [];
    }
    async getCachedAuthenticationDecision(_req) {
        return null;
    }
    applyCachedAuthentication(req, cachedResult) {
        this.applyAuthenticationResult(req, cachedResult);
        req.authenticationState.conversationalValidation = true;
    }
    async cacheAuthenticationDecision(_req, _result) {
    }
    async applyCriticalSecurityMeasures(_req, _res, operationId) {
        this.logger.warn(`[${operationId}] Applying critical security measures`);
    }
    async applyHighSecurityMeasures(_req, _res, operationId) {
        this.logger.log(`[${operationId}] Applying high security measures`);
    }
    async applyModerateSecurityMeasures(_req, _res, _operationId) {
    }
    async applyLowSecurityMeasures(_req, _res, _operationId) {
    }
    async implementHighRiskSecurityMeasures(req, operationId) {
        this.logger.warn(`[${operationId}] Implementing high-risk security measures`);
    }
};
exports.ParlantEnhancedAuthMiddleware = ParlantEnhancedAuthMiddleware;
__decorate([
    (0, parlant_validation_decorators_1.ParlantValidation)({
        mode: parlant_types_1.ValidationMode._INTERACTIVE,
        approvalLevel: parlant_types_1.ApprovalLevel._SINGLE_APPROVAL,
        timeout: 30000,
        cacheable: true,
    }),
    (0, parlant_validation_decorators_1.SecurityClassification)({
        securityLevel: parlant_types_1.FunctionSecurityLevel._RESTRICTED,
        riskLevel: parlant_types_1.RiskLevel._HIGH,
    }),
    (0, parlant_validation_decorators_1.ConversationContext)({
        topic: "Authentication Security Validation",
        priority: parlant_types_1.ConversationPriority._HIGH,
        requiredParticipants: [parlant_types_1.ParticipantRole._VALIDATOR],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ParlantEnhancedAuthMiddleware.prototype, "performConversationalAuthentication", null);
__decorate([
    (0, parlant_validation_decorators_1.ParlantValidation)({
        mode: parlant_types_1.ValidationMode._INTERACTIVE,
        approvalLevel: parlant_types_1.ApprovalLevel._DUAL_APPROVAL,
        timeout: 60000,
    }),
    (0, parlant_validation_decorators_1.SecurityClassification)({
        securityLevel: parlant_types_1.FunctionSecurityLevel._SECRET,
        riskLevel: parlant_types_1.RiskLevel._CRITICAL,
    }),
    (0, parlant_validation_decorators_1.ConversationContext)({
        topic: "High-Risk Authentication Validation",
        priority: parlant_types_1.ConversationPriority._CRITICAL,
        requiredParticipants: [
            parlant_types_1.ParticipantRole._APPROVER,
            parlant_types_1.ParticipantRole._VALIDATOR,
        ],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ParlantEnhancedAuthMiddleware.prototype, "performHighRiskAuthentication", null);
exports.ParlantEnhancedAuthMiddleware = ParlantEnhancedAuthMiddleware = ParlantEnhancedAuthMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        parlant_integration_service_1.ParlantIntegrationService, Object])
], ParlantEnhancedAuthMiddleware);
//# sourceMappingURL=parlant-enhanced-auth.middleware.js.map