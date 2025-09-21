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
var ParlantEnhancedAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MFAMethod = exports.ParlantEnhancedAuthService = exports.RequiredActionType = exports.SecurityRestrictionType = exports.SecurityEventType = exports.RiskFactorType = exports.AuthenticationMethod = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cache_manager_1 = require("@nestjs/cache-manager");
const parlant_integration_types_1 = require("../types/parlant-integration.types");
const parlant_types_1 = require("../types/parlant.types");
const parlant_validation_decorators_1 = require("../decorators/parlant-validation.decorators");
const parlant_integration_service_1 = require("./parlant-integration.service");
var AuthenticationMethod;
(function (AuthenticationMethod) {
    AuthenticationMethod["PASSWORD"] = "password";
    AuthenticationMethod["MFA_SMS"] = "mfa_sms";
    AuthenticationMethod["MFA_TOTP"] = "mfa_totp";
    AuthenticationMethod["MFA_BIOMETRIC"] = "mfa_biometric";
    AuthenticationMethod["SSO"] = "sso";
    AuthenticationMethod["API_KEY"] = "api_key";
    AuthenticationMethod["CERTIFICATE"] = "certificate";
})(AuthenticationMethod || (exports.AuthenticationMethod = AuthenticationMethod = {}));
var RiskFactorType;
(function (RiskFactorType) {
    RiskFactorType["UNUSUAL_LOCATION"] = "unusual_location";
    RiskFactorType["UNUSUAL_TIME"] = "unusual_time";
    RiskFactorType["MULTIPLE_FAILED_ATTEMPTS"] = "multiple_failed_attempts";
    RiskFactorType["NEW_DEVICE"] = "new_device";
    RiskFactorType["PRIVILEGE_ESCALATION"] = "privilege_escalation";
    RiskFactorType["SUSPICIOUS_IP"] = "suspicious_ip";
    RiskFactorType["RAPID_REQUESTS"] = "rapid_requests";
    RiskFactorType["ACCOUNT_COMPROMISE"] = "account_compromise";
    RiskFactorType["POLICY_VIOLATION"] = "policy_violation";
})(RiskFactorType || (exports.RiskFactorType = RiskFactorType = {}));
var SecurityEventType;
(function (SecurityEventType) {
    SecurityEventType["LOGIN_FAILURE"] = "login_failure";
    SecurityEventType["PASSWORD_CHANGE"] = "password_change";
    SecurityEventType["ACCOUNT_LOCKOUT"] = "account_lockout";
    SecurityEventType["PRIVILEGE_CHANGE"] = "privilege_change";
    SecurityEventType["SUSPICIOUS_ACTIVITY"] = "suspicious_activity";
    SecurityEventType["POLICY_VIOLATION"] = "policy_violation";
})(SecurityEventType || (exports.SecurityEventType = SecurityEventType = {}));
var SecurityRestrictionType;
(function (SecurityRestrictionType) {
    SecurityRestrictionType["IP_RESTRICTION"] = "ip_restriction";
    SecurityRestrictionType["TIME_RESTRICTION"] = "time_restriction";
    SecurityRestrictionType["LOCATION_RESTRICTION"] = "location_restriction";
    SecurityRestrictionType["RATE_LIMIT"] = "rate_limit";
    SecurityRestrictionType["MFA_REQUIRED"] = "mfa_required";
})(SecurityRestrictionType || (exports.SecurityRestrictionType = SecurityRestrictionType = {}));
var RequiredActionType;
(function (RequiredActionType) {
    RequiredActionType["MFA_VERIFICATION"] = "mfa_verification";
    RequiredActionType["PASSWORD_CHANGE"] = "password_change";
    RequiredActionType["SECURITY_QUESTION"] = "security_question";
    RequiredActionType["EMAIL_VERIFICATION"] = "email_verification";
    RequiredActionType["TERMS_ACCEPTANCE"] = "terms_acceptance";
    RequiredActionType["SECURITY_ACKNOWLEDGMENT"] = "security_acknowledgment";
})(RequiredActionType || (exports.RequiredActionType = RequiredActionType = {}));
let ParlantEnhancedAuthService = ParlantEnhancedAuthService_1 = class ParlantEnhancedAuthService {
    constructor(configService, parlantService, cacheManager) {
        this.configService = configService;
        this.parlantService = parlantService;
        this.cacheManager = cacheManager;
        this.logger = new common_1.Logger(ParlantEnhancedAuthService_1.name);
        this.logger.log("Parlant Enhanced Authentication Service initialized", {
            service: "ParlantEnhancedAuthService",
            timestamp: new Date().toISOString(),
        });
    }
    async validateConversationalAuthentication(credentials, authContext) {
        const operationId = `conv-auth-${Date.now()}`;
        const startTime = Date.now();
        this.logger.log(`[${operationId}] Conversational authentication initiated`, {
            operationId,
            userId: authContext.userId,
            authMethod: authContext.authMethod,
            riskScore: authContext.riskAssessment.overallRiskScore,
            requiresConversation: authContext.riskAssessment.requiresConversation,
        });
        try {
            const requiresConversation = this.shouldRequireConversationalValidation(authContext);
            if (!requiresConversation) {
                return this.performStandardAuthentication(credentials, authContext);
            }
            const validationRequest = await this.createAuthenticationValidationRequest(operationId, credentials, authContext);
            const validationResponse = await this.parlantService.validateFunctionExecution(validationRequest);
            const authResult = this.processValidationResponse(validationResponse, credentials, authContext);
            const processingTime = Date.now() - startTime;
            this.logger.log(`[${operationId}] Conversational authentication completed`, {
                operationId,
                success: authResult.success,
                decision: validationResponse.approved ? "approved" : "denied",
                processingTime,
                conversationId: validationResponse.conversationId,
            });
            return authResult;
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            this.logger.error(`[${operationId}] Conversational authentication failed`, {
                operationId,
                error: error instanceof Error ? error.message : String(error),
                processingTime,
                authContext: {
                    userId: authContext.userId,
                    authMethod: authContext.authMethod,
                    riskScore: authContext.riskAssessment.overallRiskScore,
                },
            });
            return {
                success: false,
                error: "Conversational authentication failed",
                requiredActions: [],
                metadata: {
                    operationId,
                    processingTime,
                    errorMessage: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
    async validateHighRiskAuthentication(credentials, authContext) {
        const operationId = `high-risk-auth-${Date.now()}`;
        this.logger.warn(`[${operationId}] High-risk authentication initiated`, {
            operationId,
            userId: authContext.userId,
            riskScore: authContext.riskAssessment.overallRiskScore,
            riskFactors: authContext.riskAssessment.riskFactors.length,
            criticalFactors: authContext.riskAssessment.riskFactors.filter((f) => f.critical).length,
        });
        const validationRequest = await this.createHighRiskValidationRequest(operationId, credentials, authContext);
        const validationResponse = await this.parlantService.validateFunctionExecution(validationRequest);
        if (validationResponse.approved) {
            this.implementAdditionalSecurityMeasures(authContext);
        }
        return this.processValidationResponse(validationResponse, credentials, authContext);
    }
    async validateTokenOperation(tokenOperation, requestingUser) {
        const operationId = `token-op-${Date.now()}`;
        this.logger.log(`[${operationId}] Token operation validation`, {
            operationId,
            operationType: tokenOperation.type,
            targetUserId: tokenOperation.targetUserId,
            requestingUserId: requestingUser.userId,
        });
        const validationRequest = {
            operationId,
            functionName: "validateTokenOperation",
            packageName: "shared",
            description: `Token operation validation for ${tokenOperation.type}`,
            parameters: {
                tokenOperation,
                requestingUser,
            },
            userContext: {
                userId: requestingUser.userId,
                roles: requestingUser.roles,
                sessionId: operationId,
                ipAddress: "127.0.0.1",
                metadata: {},
            },
            securityLevel: parlant_integration_types_1.SecurityLevel._HIGH,
            timeout: 45000,
        };
        const response = await this.parlantService.validateFunctionExecution(validationRequest);
        return response.approved;
    }
    async createConversationalMFAChallenge(userId, mfaMethod, context) {
        const operationId = `mfa-challenge-${Date.now()}`;
        this.logger.log(`[${operationId}] Creating MFA challenge`, {
            operationId,
            userId,
            mfaMethod,
            riskScore: context.riskAssessment.overallRiskScore,
        });
        const conversation = await this.parlantService.createConversation(`MFA Challenge - ${mfaMethod}`, parlant_types_1.ConversationPriority._NORMAL);
        const challenge = {
            challengeId: `mfa-${operationId}`,
            userId,
            method: mfaMethod,
            conversationId: conversation,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            verified: false,
            attempts: 0,
            maxAttempts: 3,
        };
        await this.cacheManager.set(`mfa-challenge:${challenge.challengeId}`, challenge, 600000);
        return challenge;
    }
    async validateConversationalMFA(challengeId, response, context) {
        const operationId = `mfa-validate-${Date.now()}`;
        this.logger.log(`[${operationId}] Validating MFA response`, {
            operationId,
            challengeId,
            userId: context.userId,
        });
        const challenge = await this.cacheManager.get(`mfa-challenge:${challengeId}`);
        if (!challenge) {
            return {
                valid: false,
                error: "Invalid or expired MFA challenge",
                remainingAttempts: 0,
            };
        }
        if (challenge.expiresAt < new Date()) {
            return {
                valid: false,
                error: "MFA challenge has expired",
                remainingAttempts: 0,
            };
        }
        if (challenge.attempts >= challenge.maxAttempts) {
            return {
                valid: false,
                error: "Maximum MFA attempts exceeded",
                remainingAttempts: 0,
            };
        }
        const isValid = this.validateMFAResponse(challenge, response);
        challenge.attempts++;
        if (isValid) {
            challenge.verified = true;
        }
        await this.cacheManager.set(`mfa-challenge:${challengeId}`, challenge, 600000);
        return {
            valid: isValid,
            remainingAttempts: challenge.maxAttempts - challenge.attempts,
            conversationId: challenge.conversationId,
        };
    }
    assessAuthenticationRisk(authContext) {
        const riskFactors = [];
        let totalRiskScore = 0;
        if (this.isUnusualLocation(authContext.requestMetadata.ipAddress)) {
            riskFactors.push({
                type: RiskFactorType.UNUSUAL_LOCATION,
                score: 30,
                description: "Login from unusual geographic location",
                critical: false,
            });
        }
        if (this.isUnusualTime(authContext.requestMetadata.timestamp)) {
            riskFactors.push({
                type: RiskFactorType.UNUSUAL_TIME,
                score: 15,
                description: "Login at unusual time",
                critical: false,
            });
        }
        if (authContext.securityContext.isPrivilegedAccount) {
            riskFactors.push({
                type: RiskFactorType.PRIVILEGE_ESCALATION,
                score: 25,
                description: "Privileged account access",
                critical: false,
            });
        }
        totalRiskScore = riskFactors.reduce((sum, factor) => sum + factor.score, 0);
        let riskLevel;
        if (totalRiskScore >= 80) {
            riskLevel = parlant_types_1.RiskLevel._CRITICAL;
        }
        else if (totalRiskScore >= 60) {
            riskLevel = parlant_types_1.RiskLevel._HIGH;
        }
        else if (totalRiskScore >= 40) {
            riskLevel = parlant_types_1.RiskLevel._MODERATE;
        }
        else if (totalRiskScore >= 20) {
            riskLevel = parlant_types_1.RiskLevel._LOW;
        }
        else {
            riskLevel = parlant_types_1.RiskLevel._MINIMAL;
        }
        return {
            overallRiskScore: totalRiskScore,
            riskFactors,
            riskLevel,
            requiresConversation: totalRiskScore >= 40 || authContext.securityContext.isPrivilegedAccount,
            assessedAt: new Date(),
        };
    }
    shouldRequireConversationalValidation(authContext) {
        if (authContext.riskAssessment.overallRiskScore >= 60) {
            return true;
        }
        if (authContext.securityContext.isPrivilegedAccount) {
            return true;
        }
        const hasRecentCriticalEvents = authContext.securityContext.recentSecurityEvents.some((event) => event.severity === "critical" &&
            Date.now() - event.timestamp.getTime() < 24 * 60 * 60 * 1000);
        return hasRecentCriticalEvents;
    }
    async createAuthenticationValidationRequest(operationId, credentials, authContext) {
        const functionContext = {
            functionName: "authenticateUser",
            arguments: {
                userId: authContext.userId,
                authMethod: authContext.authMethod,
                riskAssessment: authContext.riskAssessment,
                credentialsProvided: Object.keys(credentials),
            },
            source: {
                filePath: __filename,
                methodName: "validateConversationalAuthentication",
                className: ParlantEnhancedAuthService_1.name,
            },
            securityLevel: authContext.securityContext.accountSecurityLevel,
            riskLevel: authContext.riskAssessment.riskLevel,
            executionContext: {
                environment: this.getExecutionEnvironment(),
                user: authContext.userId
                    ? {
                        userId: authContext.userId,
                        roles: [],
                        permissions: [],
                    }
                    : undefined,
                request: this.mapToRequestContext(authContext.requestMetadata),
                properties: {
                    authMethod: authContext.authMethod,
                    riskFactors: authContext.riskAssessment.riskFactors.length,
                },
            },
        };
        const validationParams = {
            mode: parlant_types_1.ValidationMode._INTERACTIVE,
            approvalLevel: this.determineApprovalLevel(authContext),
            timeout: 30000,
            cacheable: true,
            rules: [],
        };
        const conversationContext = await this.createAuthenticationConversation(authContext);
        return {
            operationId: operationId,
            functionName: functionContext.functionName,
            packageName: "shared",
            description: "Authentication validation request",
            parameters: functionContext.arguments,
            userContext: {
                userId: authContext.userId || "unknown",
                roles: [],
                sessionId: operationId,
                ipAddress: "127.0.0.1",
                metadata: {},
            },
            securityLevel: functionContext.securityLevel,
            timeout: validationParams.timeout,
        };
    }
    async createHighRiskValidationRequest(operationId, credentials, authContext) {
        const baseRequest = await this.createAuthenticationValidationRequest(operationId, credentials, authContext);
        const enhancedMetadata = {
            validationParams: {
                mode: parlant_types_1.ValidationMode._INTERACTIVE,
                approvalLevel: parlant_types_1.ApprovalLevel._DUAL_APPROVAL,
                timeout: 120000,
                cacheable: false,
            },
            conversationContext: {
                metadata: {
                    priority: parlant_types_1.ConversationPriority._CRITICAL,
                    properties: {
                        highRisk: true,
                        criticalRiskFactors: authContext.riskAssessment.riskFactors.filter((f) => f.critical),
                    },
                },
            },
        };
        baseRequest.userContext.metadata = {
            ...baseRequest.userContext.metadata,
            ...enhancedMetadata,
        };
        return baseRequest;
    }
    async createAuthenticationConversation(authContext) {
        const topic = `Authentication Request - ${authContext.authMethod} (Risk: ${authContext.riskAssessment.riskLevel})`;
        const priority = authContext.riskAssessment.riskLevel === parlant_types_1.RiskLevel._CRITICAL
            ? parlant_types_1.ConversationPriority._CRITICAL
            : parlant_types_1.ConversationPriority._HIGH;
        const conversationId = await this.parlantService.createConversation(topic, priority);
        return {
            conversationId,
            userId: authContext.userId,
            sessionId: `session-${Date.now()}`,
            state: parlant_types_1.ConversationState._INITIATED,
            metadata: {
                topic,
                priority,
                tags: [],
                properties: {},
                history: [],
            },
            participants: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    processValidationResponse(response, credentials, authContext) {
        const result = {
            success: false,
            conversationContext: undefined,
            requiredActions: [],
            metadata: {
                processingTime: 0,
                confidence: response.confidence,
                decision: response.approved
                    ? parlant_types_1.ValidationDecision._APPROVED
                    : parlant_types_1.ValidationDecision._DENIED,
            },
        };
        if (response.approved) {
            result.success = true;
            result.tokens = this.generateAuthenticationTokens(authContext);
        }
        else {
            result.error = response.reason;
        }
        return result;
    }
    performStandardAuthentication(credentials, authContext) {
        return {
            success: true,
            tokens: this.generateAuthenticationTokens(authContext),
            requiredActions: [],
            metadata: {
                standardAuth: true,
                riskScore: authContext.riskAssessment.overallRiskScore,
            },
        };
    }
    generateAuthenticationTokens(authContext) {
        return {
            accessToken: `access-token-${Date.now()}`,
            refreshToken: `refresh-token-${Date.now()}`,
            tokenType: "Bearer",
            expiresIn: 900,
        };
    }
    determineApprovalLevel(authContext) {
        if (authContext.riskAssessment.riskLevel === parlant_types_1.RiskLevel._CRITICAL) {
            return parlant_types_1.ApprovalLevel._DUAL_APPROVAL;
        }
        if (authContext.securityContext.isPrivilegedAccount) {
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
            case "local":
                return parlant_types_1.ExecutionEnvironment._LOCAL;
            default:
                return parlant_types_1.ExecutionEnvironment._DEVELOPMENT;
        }
    }
    mapToRequestContext(metadata) {
        return {
            requestId: metadata.requestId,
            clientIp: metadata.ipAddress,
            userAgent: metadata.userAgent,
            headers: {},
        };
    }
    isUnusualLocation(ipAddress) {
        return false;
    }
    isUnusualTime(timestamp) {
        const hour = timestamp.getHours();
        return hour >= 23 || hour <= 6;
    }
    assessTokenOperationRisk(operation) {
        switch (operation.type) {
            case "revoke_all":
                return parlant_types_1.RiskLevel._CRITICAL;
            case "revoke_user":
                return parlant_types_1.RiskLevel._HIGH;
            case "refresh":
                return parlant_types_1.RiskLevel._LOW;
            default:
                return parlant_types_1.RiskLevel._MODERATE;
        }
    }
    async createTokenOperationConversation(operation, user) {
        const topic = `Token Operation: ${operation.type}`;
        const conversationId = await this.parlantService.createConversation(topic, parlant_types_1.ConversationPriority._HIGH);
        return {
            conversationId,
            metadata: {
                topic,
                priority: parlant_types_1.ConversationPriority._HIGH,
                createdAt: new Date(),
                properties: {
                    operationType: operation.type,
                    targetUserId: operation.targetUserId,
                    requestingUserId: user.userId,
                },
            },
        };
    }
    implementAdditionalSecurityMeasures(authContext) {
        this.logger.log("Implementing additional security measures for high-risk authentication", {
            userId: authContext.userId,
            riskScore: authContext.riskAssessment.overallRiskScore,
        });
    }
    mapRecommendationsToActions(recommendations) {
        if (typeof recommendations === "string") {
            return [
                {
                    type: RequiredActionType.SECURITY_ACKNOWLEDGMENT,
                    description: recommendations,
                    parameters: {},
                    mandatory: false,
                },
            ];
        }
        return [];
    }
    validateMFAResponse(challenge, response) {
        return response.length > 0;
    }
};
exports.ParlantEnhancedAuthService = ParlantEnhancedAuthService;
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
        topic: "User Authentication Validation",
        priority: parlant_types_1.ConversationPriority._HIGH,
        requiredParticipants: [parlant_types_1.ParticipantRole._VALIDATOR],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ParlantEnhancedAuthService.prototype, "validateConversationalAuthentication", null);
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
        topic: "High-Risk Authentication Validation",
        priority: parlant_types_1.ConversationPriority._CRITICAL,
        requiredParticipants: [
            parlant_types_1.ParticipantRole._APPROVER,
            parlant_types_1.ParticipantRole._VALIDATOR,
        ],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ParlantEnhancedAuthService.prototype, "validateHighRiskAuthentication", null);
__decorate([
    (0, parlant_validation_decorators_1.ParlantValidation)({
        mode: parlant_types_1.ValidationMode._INTERACTIVE,
        approvalLevel: parlant_types_1.ApprovalLevel._SINGLE_APPROVAL,
        timeout: 45000,
    }),
    (0, parlant_validation_decorators_1.SecurityClassification)({
        securityLevel: parlant_types_1.FunctionSecurityLevel._RESTRICTED,
        riskLevel: parlant_types_1.RiskLevel._HIGH,
    }),
    (0, parlant_validation_decorators_1.ConversationContext)({
        topic: "Token Operation Validation",
        priority: parlant_types_1.ConversationPriority._HIGH,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ParlantEnhancedAuthService.prototype, "validateTokenOperation", null);
__decorate([
    (0, parlant_validation_decorators_1.ParlantValidation)({
        mode: parlant_types_1.ValidationMode._SYNCHRONOUS,
        approvalLevel: parlant_types_1.ApprovalLevel._AUTOMATIC,
        timeout: 15000,
    }),
    (0, parlant_validation_decorators_1.ConversationContext)({
        topic: "Multi-Factor Authentication Setup",
        priority: parlant_types_1.ConversationPriority._NORMAL,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ParlantEnhancedAuthService.prototype, "createConversationalMFAChallenge", null);
__decorate([
    (0, parlant_validation_decorators_1.ParlantValidation)({
        mode: parlant_types_1.ValidationMode._SYNCHRONOUS,
        approvalLevel: parlant_types_1.ApprovalLevel._AUTOMATIC,
        timeout: 10000,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ParlantEnhancedAuthService.prototype, "validateConversationalMFA", null);
exports.ParlantEnhancedAuthService = ParlantEnhancedAuthService = ParlantEnhancedAuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        parlant_integration_service_1.ParlantIntegrationService, Object])
], ParlantEnhancedAuthService);
var MFAMethod;
(function (MFAMethod) {
    MFAMethod["SMS"] = "sms";
    MFAMethod["EMAIL"] = "email";
    MFAMethod["TOTP"] = "totp";
    MFAMethod["BIOMETRIC"] = "biometric";
    MFAMethod["HARDWARE_TOKEN"] = "hardware_token";
})(MFAMethod || (exports.MFAMethod = MFAMethod = {}));
//# sourceMappingURL=parlant-enhanced-auth.service.js.map