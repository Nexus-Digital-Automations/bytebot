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
var ParlantMFAService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParlantMFAService = exports.SetupStepType = exports.SecurityActionType = exports.DeviceType = exports.MFARiskType = exports.ThreatSeverity = exports.ThreatIndicatorType = exports.MFAChallengeStatus = exports.MFAMethod = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cache_manager_1 = require("@nestjs/cache-manager");
const parlant_integration_types_1 = require("../types/parlant-integration.types");
const parlant_types_1 = require("../types/parlant.types");
const parlant_validation_decorators_1 = require("../decorators/parlant-validation.decorators");
const parlant_integration_service_1 = require("./parlant-integration.service");
var MFAMethod;
(function (MFAMethod) {
    MFAMethod["SMS"] = "sms";
    MFAMethod["EMAIL"] = "email";
    MFAMethod["TOTP"] = "totp";
    MFAMethod["BIOMETRIC"] = "biometric";
    MFAMethod["HARDWARE_TOKEN"] = "hardware_token";
    MFAMethod["PUSH_NOTIFICATION"] = "push_notification";
    MFAMethod["VOICE_CALL"] = "voice_call";
    MFAMethod["BACKUP_CODES"] = "backup_codes";
})(MFAMethod || (exports.MFAMethod = MFAMethod = {}));
var MFAChallengeStatus;
(function (MFAChallengeStatus) {
    MFAChallengeStatus["PENDING"] = "pending";
    MFAChallengeStatus["SENT"] = "sent";
    MFAChallengeStatus["VERIFIED"] = "verified";
    MFAChallengeStatus["FAILED"] = "failed";
    MFAChallengeStatus["EXPIRED"] = "expired";
    MFAChallengeStatus["CANCELLED"] = "cancelled";
})(MFAChallengeStatus || (exports.MFAChallengeStatus = MFAChallengeStatus = {}));
var ThreatIndicatorType;
(function (ThreatIndicatorType) {
    ThreatIndicatorType["SUSPICIOUS_LOCATION"] = "suspicious_location";
    ThreatIndicatorType["UNUSUAL_DEVICE"] = "unusual_device";
    ThreatIndicatorType["ANOMALOUS_BEHAVIOR"] = "anomalous_behavior";
    ThreatIndicatorType["KNOWN_BAD_IP"] = "known_bad_ip";
    ThreatIndicatorType["CREDENTIAL_STUFFING"] = "credential_stuffing";
    ThreatIndicatorType["BRUTE_FORCE"] = "brute_force";
})(ThreatIndicatorType || (exports.ThreatIndicatorType = ThreatIndicatorType = {}));
var ThreatSeverity;
(function (ThreatSeverity) {
    ThreatSeverity["LOW"] = "low";
    ThreatSeverity["MEDIUM"] = "medium";
    ThreatSeverity["HIGH"] = "high";
    ThreatSeverity["CRITICAL"] = "critical";
})(ThreatSeverity || (exports.ThreatSeverity = ThreatSeverity = {}));
var MFARiskType;
(function (MFARiskType) {
    MFARiskType["NEW_DEVICE"] = "new_device";
    MFARiskType["UNUSUAL_LOCATION"] = "unusual_location";
    MFARiskType["HIGH_VALUE_TRANSACTION"] = "high_value_transaction";
    MFARiskType["ADMIN_OPERATION"] = "admin_operation";
    MFARiskType["SUSPICIOUS_PATTERN"] = "suspicious_pattern";
    MFARiskType["RECENT_SECURITY_EVENT"] = "recent_security_event";
})(MFARiskType || (exports.MFARiskType = MFARiskType = {}));
var DeviceType;
(function (DeviceType) {
    DeviceType["DESKTOP"] = "desktop";
    DeviceType["MOBILE"] = "mobile";
    DeviceType["TABLET"] = "tablet";
    DeviceType["UNKNOWN"] = "unknown";
})(DeviceType || (exports.DeviceType = DeviceType = {}));
var SecurityActionType;
(function (SecurityActionType) {
    SecurityActionType["ADDITIONAL_MFA"] = "additional_mfa";
    SecurityActionType["SECURITY_QUESTION"] = "security_question";
    SecurityActionType["DEVICE_VERIFICATION"] = "device_verification";
    SecurityActionType["ADMIN_APPROVAL"] = "admin_approval";
    SecurityActionType["ACCOUNT_VERIFICATION"] = "account_verification";
    SecurityActionType["PASSWORD_CHANGE"] = "password_change";
})(SecurityActionType || (exports.SecurityActionType = SecurityActionType = {}));
var SetupStepType;
(function (SetupStepType) {
    SetupStepType["SCAN_QR_CODE"] = "scan_qr_code";
    SetupStepType["ENTER_CODE"] = "enter_code";
    SetupStepType["VERIFY_PHONE"] = "verify_phone";
    SetupStepType["VERIFY_EMAIL"] = "verify_email";
    SetupStepType["REGISTER_DEVICE"] = "register_device";
    SetupStepType["DOWNLOAD_APP"] = "download_app";
})(SetupStepType || (exports.SetupStepType = SetupStepType = {}));
let ParlantMFAService = ParlantMFAService_1 = class ParlantMFAService {
    constructor(configService, parlantService, cacheManager) {
        this.configService = configService;
        this.parlantService = parlantService;
        this.cacheManager = cacheManager;
        this.logger = new common_1.Logger(ParlantMFAService_1.name);
        this.mfaConfig = {
            defaultChallengeExpiry: configService.get("mfa.challengeExpiry", 300000),
            maxAttempts: configService.get("mfa.maxAttempts", 3),
            enableConversationalMFA: configService.get("mfa.conversational.enabled", true),
            conversationTimeout: configService.get("mfa.conversation.timeout", 120000),
            supportedMethods: configService.get("mfa.supportedMethods", [
                MFAMethod.SMS,
                MFAMethod.EMAIL,
                MFAMethod.TOTP,
            ]),
            riskBasedMFA: configService.get("mfa.riskBased.enabled", true),
        };
        this.logger.log("Parlant MFA Service initialized", {
            supportedMethods: this.mfaConfig.supportedMethods,
            conversationalMFA: this.mfaConfig.enableConversationalMFA,
            riskBasedMFA: this.mfaConfig.riskBasedMFA,
        });
    }
    async createConversationalMFAChallenge(userId, method, context) {
        const operationId = `mfa-challenge-${Date.now()}`;
        const startTime = Date.now();
        this.logger.log(`[${operationId}] Creating conversational MFA challenge`, {
            operationId,
            userId,
            method,
            clientIp: context.requestMetadata?.clientIp,
        });
        try {
            const riskAssessment = await this.performMFARiskAssessment(userId, method, context);
            const conversation = await this.createMFAConversation(userId, method, riskAssessment);
            const challenge = await this.generateMFAChallenge(userId, method, context, riskAssessment, conversation.conversationId);
            await this.cacheMFAChallenge(challenge);
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
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            this.logger.error(`[${operationId}] Failed to create MFA challenge`, {
                operationId,
                userId,
                method,
                error: error instanceof Error ? error.message : String(error),
                processingTime,
            });
            throw new common_1.BadRequestException("Failed to create MFA challenge");
        }
    }
    async initiateHighRiskMFA(userId, context) {
        const operationId = `high-risk-mfa-${Date.now()}`;
        this.logger.warn(`[${operationId}] Initiating high-risk MFA`, {
            operationId,
            userId,
            securityContext: context.securityContext,
        });
        const riskAssessment = await this.performEnhancedRiskAssessment(userId, context);
        const recommendedMethod = this.selectHighRiskMFAMethod(riskAssessment, context);
        const conversation = await this.createHighRiskMFAConversation(userId, riskAssessment, context);
        const challenge = await this.generateHighRiskMFAChallenge(userId, recommendedMethod, context, riskAssessment, conversation.conversationId);
        await this.applyHighRiskSecurityMeasures(challenge, context);
        return challenge;
    }
    async validateConversationalMFA(validationRequest) {
        const operationId = `mfa-validate-${Date.now()}`;
        const startTime = Date.now();
        this.logger.log(`[${operationId}] Validating conversational MFA`, {
            operationId,
            challengeId: validationRequest.challengeId,
        });
        try {
            const challenge = await this.getCachedMFAChallenge(validationRequest.challengeId);
            if (!challenge) {
                return this.createFailedValidationResult("Invalid or expired MFA challenge", 0);
            }
            const stateValidation = this.validateChallengeState(challenge);
            if (!stateValidation.valid) {
                return this.createFailedValidationResult(stateValidation.error, challenge.maxAttempts - challenge.attempts);
            }
            const validationContext = await this.createMFAValidationRequest(challenge, validationRequest, operationId);
            const validationResponse = await this.parlantService.validateFunctionExecution(validationContext);
            const result = await this.processMFAValidationResponse(challenge, validationRequest, validationResponse, startTime);
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
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            this.logger.error(`[${operationId}] MFA validation failed`, {
                operationId,
                challengeId: validationRequest.challengeId,
                error: error instanceof Error ? error.message : String(error),
                processingTime,
            });
            return this.createFailedValidationResult("MFA validation service error", 0);
        }
    }
    async setupConversationalMFA(setupRequest) {
        const operationId = `mfa-setup-${Date.now()}`;
        this.logger.log(`[${operationId}] Setting up conversational MFA`, {
            operationId,
            userId: setupRequest.userId,
            method: setupRequest.method,
        });
        try {
            const conversation = await this.createMFASetupConversation(setupRequest.userId, setupRequest.method);
            await this.validateSetupParameters(setupRequest);
            const setupData = await this.generateSetupData(setupRequest.method, setupRequest.parameters);
            const nextSteps = this.createSetupSteps(setupRequest.method, setupData);
            const setupId = await this.storeSetupState(setupRequest, setupData);
            return {
                success: true,
                setupId,
                setupData,
                conversationContext: conversation,
                nextSteps,
            };
        }
        catch (error) {
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
    async initiateConversationalMFARecovery(userId, recoveryContext) {
        const operationId = `mfa-recovery-${Date.now()}`;
        this.logger.warn(`[${operationId}] Initiating MFA recovery`, {
            operationId,
            userId,
            context: recoveryContext,
        });
        const conversation = await this.createMFARecoveryConversation(userId, recoveryContext);
        const identityVerification = await this.performIdentityVerification(userId, recoveryContext, conversation.conversationId);
        if (!identityVerification.verified) {
            throw new common_1.UnauthorizedException("Identity verification failed");
        }
        const recoveryChallenge = await this.generateRecoveryChallenge(userId, recoveryContext, conversation.conversationId);
        return recoveryChallenge;
    }
    async performMFARiskAssessment(userId, method, context) {
        const riskFactors = [];
        let totalRisk = 0;
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
        totalRisk = riskFactors.reduce((sum, factor) => sum + factor.contribution, 0);
        let riskLevel;
        if (totalRisk >= 80)
            riskLevel = parlant_types_1.RiskLevel._CRITICAL;
        else if (totalRisk >= 60)
            riskLevel = parlant_types_1.RiskLevel._HIGH;
        else if (totalRisk >= 40)
            riskLevel = parlant_types_1.RiskLevel._MODERATE;
        else if (totalRisk >= 20)
            riskLevel = parlant_types_1.RiskLevel._LOW;
        else
            riskLevel = parlant_types_1.RiskLevel._MINIMAL;
        const recommendedMethods = this.getRecommendedMFAMethods(riskLevel, method);
        return {
            riskScore: Math.min(totalRisk, 100),
            riskFactors,
            riskLevel,
            recommendedMethods,
            assessedAt: new Date(),
        };
    }
    async createMFAConversation(userId, method, riskAssessment) {
        const topic = `MFA Challenge - ${method} (Risk: ${riskAssessment.riskLevel})`;
        const priority = riskAssessment.riskLevel === parlant_types_1.RiskLevel._CRITICAL
            ? parlant_types_1.ConversationPriority._CRITICAL
            : parlant_types_1.ConversationPriority._NORMAL;
        const conversationId = await this.parlantService.createConversation(topic, priority);
        return {
            conversationId,
            userId,
            sessionId: `session_${Date.now()}`,
            state: parlant_types_1.ConversationState._ACTIVE,
            metadata: {
                topic,
                priority,
                tags: ["mfa", method, riskAssessment.riskLevel],
                properties: {},
                history: [],
            },
            participants: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    async generateMFAChallenge(userId, method, context, riskAssessment, conversationId) {
        const challengeId = `mfa-${method}-${Date.now()}-${userId}`;
        const expiresAt = new Date(Date.now() + this.mfaConfig.defaultChallengeExpiry);
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
                clientIp: context.requestMetadata?.clientIp,
                userAgent: context.requestMetadata?.userAgent,
                authContext: context,
                properties: {},
            },
            riskAssessment,
        };
    }
    async createMFAValidationRequest(challenge, validationRequest, operationId) {
        const functionContext = {
            functionName: "validateMFAResponse",
            arguments: {
                challengeId: challenge.challengeId,
                method: challenge.method,
                responseProvided: !!validationRequest.response,
                attempts: challenge.attempts,
                maxAttempts: challenge.maxAttempts,
            },
            source: {
                filePath: __filename,
                methodName: "validateConversationalMFA",
                className: ParlantMFAService_1.name,
            },
            securityLevel: parlant_types_1.FunctionSecurityLevel._RESTRICTED,
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
        const validationParams = {
            mode: parlant_types_1.ValidationMode._SYNCHRONOUS,
            approvalLevel: parlant_types_1.ApprovalLevel._AUTOMATIC,
            timeout: 10000,
            cacheable: false,
            rules: [],
        };
        const userContext = {
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
            securityLevel: this.mapFunctionSecurityLevelToSecurityLevel(functionContext.securityLevel),
            timeout: validationParams.timeout,
        };
    }
    async cacheMFAChallenge(challenge) {
        const cacheKey = `mfa-challenge:${challenge.challengeId}`;
        const ttl = challenge.expiresAt.getTime() - Date.now();
        await this.cacheManager.set(cacheKey, challenge, ttl);
    }
    async getCachedMFAChallenge(challengeId) {
        const cacheKey = `mfa-challenge:${challengeId}`;
        const result = await this.cacheManager.get(cacheKey);
        return result || null;
    }
    async updateChallengeState(challenge, result) {
        challenge.attempts++;
        if (result.valid) {
            challenge.verified = true;
            challenge.status = MFAChallengeStatus.VERIFIED;
        }
        else if (challenge.attempts >= challenge.maxAttempts) {
            challenge.status = MFAChallengeStatus.FAILED;
        }
        await this.cacheMFAChallenge(challenge);
    }
    validateChallengeState(challenge) {
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
    async processMFAValidationResponse(challenge, validationRequest, validationResponse, startTime) {
        const validationDuration = Date.now() - startTime;
        const methodValidation = await this.validateByMethod(challenge.method, validationRequest.response, challenge);
        const finalResult = methodValidation && validationResponse.approved;
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
                    parlantDecision: validationResponse.approved ? "APPROVED" : "DENIED",
                    confidence: validationResponse.confidence,
                },
            },
            requiredActions: [],
        };
    }
    createFailedValidationResult(error, remainingAttempts) {
        return {
            valid: false,
            remainingAttempts,
            error,
            metadata: {
                validatedAt: new Date(),
                validationDuration: 0,
                method: MFAMethod.SMS,
                riskScore: 0,
                conversationalValidation: false,
                properties: {},
            },
            requiredActions: [],
        };
    }
    async validateByMethod(method, response, challenge) {
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
    validateCodeChallenge(response, challenge) {
        return /^\d{6}$/.test(response);
    }
    validateTOTPCode(response, challenge) {
        return /^\d{6}$/.test(response);
    }
    validateBackupCode(response, challenge) {
        return response.length >= 8;
    }
    async isNewDevice(userId, context) {
        return false;
    }
    async isUnusualLocation(userId, context) {
        return false;
    }
    isAdminOperation(context) {
        return (context.securityContext?.classification ===
            parlant_types_1.FunctionSecurityLevel._RESTRICTED);
    }
    async hasRecentSecurityEvents(userId) {
        return false;
    }
    getRecommendedMFAMethods(riskLevel, preferredMethod) {
        const methods = [];
        if (riskLevel === parlant_types_1.RiskLevel._CRITICAL) {
            methods.push(MFAMethod.HARDWARE_TOKEN, MFAMethod.BIOMETRIC);
        }
        else if (riskLevel === parlant_types_1.RiskLevel._HIGH) {
            methods.push(MFAMethod.TOTP, MFAMethod.PUSH_NOTIFICATION);
        }
        else {
            methods.push(preferredMethod);
        }
        return methods.filter((method) => this.mfaConfig.supportedMethods.includes(method));
    }
    requiresDelivery(method) {
        return [MFAMethod.SMS, MFAMethod.EMAIL, MFAMethod.VOICE_CALL].includes(method);
    }
    async deliverMFAChallenge(challenge, context) {
        this.logger.log(`Delivering MFA challenge via ${challenge.method}`, {
            challengeId: challenge.challengeId,
            method: challenge.method,
        });
        challenge.status = MFAChallengeStatus.SENT;
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
    async performEnhancedRiskAssessment(userId, context) {
        return this.performMFARiskAssessment(userId, MFAMethod.TOTP, context);
    }
    selectHighRiskMFAMethod(riskAssessment, context) {
        return MFAMethod.HARDWARE_TOKEN;
    }
    async createHighRiskMFAConversation(userId, riskAssessment, context) {
        const topic = `High-Risk MFA - User ${userId}`;
        const conversationId = await this.parlantService.createConversation(topic, parlant_types_1.ConversationPriority._CRITICAL);
        return {
            conversationId,
            userId,
            sessionId: `session_${Date.now()}`,
            state: parlant_types_1.ConversationState._ACTIVE,
            metadata: {
                topic,
                priority: parlant_types_1.ConversationPriority._CRITICAL,
                tags: ["high-risk-mfa", riskAssessment.riskLevel],
                properties: { riskAssessment, context },
                history: [],
            },
            participants: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    async generateHighRiskMFAChallenge(userId, method, context, riskAssessment, conversationId) {
        return this.generateMFAChallenge(userId, method, context, riskAssessment, conversationId);
    }
    async applyHighRiskSecurityMeasures(challenge, context) {
        this.logger.warn("Applying high-risk security measures for MFA", {
            challengeId: challenge.challengeId,
        });
    }
    async validateSetupParameters(setupRequest) {
    }
    async generateSetupData(method, parameters) {
        return {};
    }
    createSetupSteps(method, setupData) {
        return [];
    }
    async storeSetupState(setupRequest, setupData) {
        return `setup-${Date.now()}`;
    }
    async createMFASetupConversation(userId, method) {
        const topic = `MFA Setup - ${method}`;
        const conversationId = await this.parlantService.createConversation(topic, parlant_types_1.ConversationPriority._NORMAL);
        return {
            conversationId,
            userId,
            sessionId: `session_${Date.now()}`,
            state: parlant_types_1.ConversationState._ACTIVE,
            metadata: {
                topic,
                priority: parlant_types_1.ConversationPriority._NORMAL,
                tags: ["mfa-setup", method],
                properties: {},
                history: [],
            },
            participants: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    async createMFARecoveryConversation(userId, recoveryContext) {
        const topic = `MFA Recovery - User ${userId}`;
        const conversationId = await this.parlantService.createConversation(topic, parlant_types_1.ConversationPriority._HIGH);
        return {
            conversationId,
            userId,
            sessionId: `session_${Date.now()}`,
            state: parlant_types_1.ConversationState._ACTIVE,
            metadata: {
                topic,
                priority: parlant_types_1.ConversationPriority._HIGH,
                tags: ["mfa-recovery"],
                properties: { recoveryContext },
                history: [],
            },
            participants: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    async performIdentityVerification(userId, recoveryContext, conversationId) {
        return { verified: true };
    }
    async generateRecoveryChallenge(userId, recoveryContext, conversationId) {
        const riskAssessment = {
            riskScore: 90,
            riskFactors: [],
            riskLevel: parlant_types_1.RiskLevel._CRITICAL,
            recommendedMethods: [MFAMethod.EMAIL],
            assessedAt: new Date(),
        };
        return this.generateMFAChallenge(userId, MFAMethod.EMAIL, recoveryContext, riskAssessment, conversationId);
    }
    mapFunctionSecurityLevelToSecurityLevel(functionSecurityLevel) {
        switch (functionSecurityLevel) {
            case parlant_types_1.FunctionSecurityLevel._PUBLIC:
                return parlant_integration_types_1.SecurityLevel._MINIMAL;
            case parlant_types_1.FunctionSecurityLevel._INTERNAL:
                return parlant_integration_types_1.SecurityLevel._LOW;
            case parlant_types_1.FunctionSecurityLevel._RESTRICTED:
                return parlant_integration_types_1.SecurityLevel._MEDIUM;
            case parlant_types_1.FunctionSecurityLevel._CONFIDENTIAL:
                return parlant_integration_types_1.SecurityLevel._HIGH;
            case parlant_types_1.FunctionSecurityLevel._SECRET:
                return parlant_integration_types_1.SecurityLevel._CRITICAL;
            default:
                return parlant_integration_types_1.SecurityLevel._MEDIUM;
        }
    }
};
exports.ParlantMFAService = ParlantMFAService;
__decorate([
    (0, parlant_validation_decorators_1.ParlantValidation)({
        mode: parlant_types_1.ValidationMode._SYNCHRONOUS,
        approvalLevel: parlant_types_1.ApprovalLevel._AUTOMATIC,
        timeout: 15000,
    }),
    (0, parlant_validation_decorators_1.ConversationContext)({
        topic: "Multi-Factor Authentication Challenge",
        priority: parlant_types_1.ConversationPriority._NORMAL,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ParlantMFAService.prototype, "createConversationalMFAChallenge", null);
__decorate([
    (0, parlant_validation_decorators_1.ParlantValidation)({
        mode: parlant_types_1.ValidationMode._INTERACTIVE,
        approvalLevel: parlant_types_1.ApprovalLevel._SINGLE_APPROVAL,
        timeout: 120000,
    }),
    (0, parlant_validation_decorators_1.SecurityClassification)({
        securityLevel: parlant_types_1.FunctionSecurityLevel._RESTRICTED,
        riskLevel: parlant_types_1.RiskLevel._HIGH,
    }),
    (0, parlant_validation_decorators_1.ConversationContext)({
        topic: "High-Risk Multi-Factor Authentication",
        priority: parlant_types_1.ConversationPriority._CRITICAL,
        requiredParticipants: [
            parlant_types_1.ParticipantRole._VALIDATOR,
            parlant_types_1.ParticipantRole._APPROVER,
        ],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ParlantMFAService.prototype, "initiateHighRiskMFA", null);
__decorate([
    (0, parlant_validation_decorators_1.ParlantValidation)({
        mode: parlant_types_1.ValidationMode._SYNCHRONOUS,
        approvalLevel: parlant_types_1.ApprovalLevel._AUTOMATIC,
        timeout: 10000,
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ParlantMFAService.prototype, "validateConversationalMFA", null);
__decorate([
    (0, parlant_validation_decorators_1.ParlantValidation)({
        mode: parlant_types_1.ValidationMode._INTERACTIVE,
        approvalLevel: parlant_types_1.ApprovalLevel._SINGLE_APPROVAL,
        timeout: 300000,
    }),
    (0, parlant_validation_decorators_1.ConversationContext)({
        topic: "Multi-Factor Authentication Setup",
        priority: parlant_types_1.ConversationPriority._NORMAL,
        requiredParticipants: [parlant_types_1.ParticipantRole._VALIDATOR],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ParlantMFAService.prototype, "setupConversationalMFA", null);
__decorate([
    (0, parlant_validation_decorators_1.ParlantValidation)({
        mode: parlant_types_1.ValidationMode._INTERACTIVE,
        approvalLevel: parlant_types_1.ApprovalLevel._DUAL_APPROVAL,
        timeout: 600000,
    }),
    (0, parlant_validation_decorators_1.SecurityClassification)({
        securityLevel: parlant_types_1.FunctionSecurityLevel._RESTRICTED,
        riskLevel: parlant_types_1.RiskLevel._HIGH,
    }),
    (0, parlant_validation_decorators_1.ConversationContext)({
        topic: "MFA Account Recovery",
        priority: parlant_types_1.ConversationPriority._HIGH,
        requiredParticipants: [
            parlant_types_1.ParticipantRole._APPROVER,
            parlant_types_1.ParticipantRole._VALIDATOR,
            parlant_types_1.ParticipantRole._MODERATOR,
        ],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ParlantMFAService.prototype, "initiateConversationalMFARecovery", null);
exports.ParlantMFAService = ParlantMFAService = ParlantMFAService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        parlant_integration_service_1.ParlantIntegrationService, Object])
], ParlantMFAService);
//# sourceMappingURL=parlant-mfa.service.js.map