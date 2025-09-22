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
var ParlantIntegrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParlantIntegrationService = exports.ConversationalValidationError = exports.SecurityLevel = exports.RiskLevel = void 0;
const common_1 = require("@nestjs/common");
const parlant_types_1 = require("../../types/parlant.types");
const parlant_integration_types_1 = require("../../types/parlant-integration.types");
var parlant_types_2 = require("../../types/parlant.types");
Object.defineProperty(exports, "RiskLevel", { enumerable: true, get: function () { return parlant_types_2.RiskLevel; } });
var parlant_integration_types_2 = require("../../types/parlant-integration.types");
Object.defineProperty(exports, "SecurityLevel", { enumerable: true, get: function () { return parlant_integration_types_2.SecurityLevel; } });
class ConversationalValidationError extends Error {
    constructor(conversationId, reasoning, suggestedAlternatives = [], confidence = 0.0, riskLevel = parlant_types_1.RiskLevel._MODERATE, code = 'VALIDATION_FAILED', details = {}) {
        super(reasoning);
        this.name = 'ConversationalValidationError';
        this.code = code;
        this.details = details;
        this.conversationId = conversationId;
        this.riskLevel = riskLevel;
        this.timestamp = new Date();
        this.reasoning = reasoning;
        this.suggestedAlternatives = suggestedAlternatives;
        this.confidence = confidence;
        Object.setPrototypeOf(this, ConversationalValidationError.prototype);
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details,
            conversationId: this.conversationId,
            riskLevel: this.riskLevel,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
    static fromValidationResponse(response, message) {
        return new ConversationalValidationError(response.conversationId, message || `Validation failed: ${response.reason}`, [], response.confidence, parlant_types_1.RiskLevel._MODERATE, 'PARLANT_VALIDATION_FAILED', {
            confidence: response.confidence,
            reason: response.reason,
            metadata: response.metadata
        });
    }
}
exports.ConversationalValidationError = ConversationalValidationError;
let ParlantIntegrationService = ParlantIntegrationService_1 = class ParlantIntegrationService {
    constructor() {
        this.logger = new common_1.Logger(ParlantIntegrationService_1.name);
        this.cache = new Map();
        this.conversations = new Map();
        this.logger.log('PARLANT Integration Service initialized');
    }
    async validateFunction(request) {
        const startTime = Date.now();
        this.logger.debug(`Validating function: ${request.functionName}`, {
            operationId: request.operationId,
            securityLevel: request.securityLevel
        });
        try {
            const cacheKey = this.generateCacheKey(request);
            const cachedResponse = await this.getCachedValidation(cacheKey);
            if (cachedResponse) {
                this.logger.debug(`Cache hit for validation: ${request.operationId}`);
                return cachedResponse;
            }
            const response = await this.performParlantValidation(request);
            if (response.approved && response.cacheKey) {
                this.cache.set(response.cacheKey, response);
            }
            const processingTime = Date.now() - startTime;
            this.logger.debug(`Validation completed: ${request.operationId}`, {
                approved: response.approved,
                confidence: response.confidence,
                processingTime
            });
            return response;
        }
        catch (error) {
            this.logger.error(`Validation failed for ${request.operationId}:`, error);
            if (error instanceof ConversationalValidationError) {
                throw error;
            }
            throw new ConversationalValidationError(undefined, `PARLANT validation service error: ${error instanceof Error ? error.message : String(error)}`, ['Check service connectivity', 'Retry operation', 'Contact system administrator'], 0.0, parlant_types_1.RiskLevel._HIGH, 'SERVICE_ERROR', { originalError: error, request });
        }
    }
    async validateFunctionExecution(request) {
        const internalRequest = {
            operationId: request.operationId,
            functionName: request.functionName,
            packageName: 'shared',
            description: request.actionDescription,
            parameters: request.functionParams,
            userContext: {
                userId: request.context.userId || 'anonymous',
                roles: [],
                sessionId: request.context.sessionId || '',
                ipAddress: 'unknown',
                metadata: {}
            },
            securityLevel: this.mapRiskLevelToSecurityLevel(request.riskLevel)
        };
        try {
            const internalResponse = await this.validateFunction(internalRequest);
            return {
                approved: internalResponse.approved,
                conversationId: internalResponse.conversationId,
                reason: internalResponse.reason,
                reasoning: internalResponse.reason,
                confidence: internalResponse.confidence,
                suggestedAlternatives: [],
                metadata: {
                    ...internalResponse.metadata,
                    cacheStatus: internalResponse.metadata.cacheStatus
                },
                cacheKey: internalResponse.cacheKey
            };
        }
        catch (error) {
            if (error instanceof ConversationalValidationError) {
                throw error;
            }
            throw new ConversationalValidationError(undefined, `Validation execution failed: ${error instanceof Error ? error.message : String(error)}`, ['Retry operation', 'Check system status'], 0.0, request.riskLevel, 'EXECUTION_ERROR', { originalError: error });
        }
    }
    mapRiskLevelToSecurityLevel(riskLevel) {
        switch (riskLevel) {
            case parlant_types_1.RiskLevel._MINIMAL: return parlant_integration_types_1.SecurityLevel._MINIMAL;
            case parlant_types_1.RiskLevel._LOW: return parlant_integration_types_1.SecurityLevel._LOW;
            case parlant_types_1.RiskLevel._MODERATE: return parlant_integration_types_1.SecurityLevel._MEDIUM;
            case parlant_types_1.RiskLevel._HIGH: return parlant_integration_types_1.SecurityLevel._HIGH;
            case parlant_types_1.RiskLevel._CRITICAL: return parlant_integration_types_1.SecurityLevel._CRITICAL;
            default: return parlant_integration_types_1.SecurityLevel._MEDIUM;
        }
    }
    async getCachedValidation(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (!cached) {
            return null;
        }
        const now = Date.now();
        const cacheAge = now - cached.metadata.startTime.getTime();
        const maxAge = 5 * 60 * 1000;
        if (cacheAge > maxAge) {
            this.cache.delete(cacheKey);
            return null;
        }
        return cached;
    }
    async createConversationContext(userId, sessionId) {
        const conversationId = this.generateConversationId();
        const now = new Date();
        const context = {
            conversationId,
            userId,
            sessionId,
            state: parlant_types_1.ConversationState._ACTIVE,
            metadata: {
                priority: parlant_types_1.ConversationPriority._NORMAL,
                tags: ['function-validation'],
                properties: {
                    createdBy: userId || 'system'
                },
                history: []
            },
            participants: userId ? [{
                    id: userId,
                    type: parlant_types_1.ParticipantType._HUMAN,
                    name: `User ${userId}`,
                    role: parlant_types_1.ParticipantRole._REQUESTOR,
                    capabilities: [parlant_types_1.ParticipantCapability._VALIDATE_FUNCTIONS],
                    joinedAt: now
                }] : [],
            createdAt: now,
            updatedAt: now
        };
        this.conversations.set(conversationId, context);
        this.logger.debug(`Created conversation context: ${conversationId}`);
        return context;
    }
    async healthCheck() {
        try {
            const cacheSize = this.cache.size;
            const conversationCount = this.conversations.size;
            const status = cacheSize < 1000 && conversationCount < 100 ? 'healthy' : 'degraded';
            return {
                status,
                details: {
                    cacheSize,
                    conversationCount,
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage(),
                    timestamp: new Date()
                }
            };
        }
        catch (error) {
            this.logger.error('Health check failed:', error);
            return {
                status: 'unhealthy',
                details: {
                    error: error instanceof Error ? error.message : String(error),
                    timestamp: new Date()
                }
            };
        }
    }
    generateCacheKey(request) {
        const keyComponents = [
            request.functionName,
            request.packageName,
            request.securityLevel,
            JSON.stringify(request.parameters)
        ];
        return Buffer.from(keyComponents.join('|')).toString('base64').substring(0, 32);
    }
    generateConversationId() {
        return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }
    async performParlantValidation(request) {
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
        const conversationId = this.generateConversationId();
        const now = new Date();
        const riskScore = this.calculateRiskScore(request);
        const approved = riskScore < 70;
        const confidence = Math.max(0.6, 1 - (riskScore / 100));
        const response = {
            approved,
            conversationId,
            reason: approved
                ? `Function ${request.functionName} approved with ${confidence.toFixed(2)} confidence`
                : `Function ${request.functionName} rejected due to high risk score: ${riskScore}`,
            confidence,
            metadata: {
                startTime: now,
                endTime: new Date(),
                processingTime: 100,
                cacheStatus: 'miss',
                source: 'parlant',
                riskAssessment: {
                    level: this.mapRiskScore(riskScore),
                    factors: this.identifyRiskFactors(request),
                    score: riskScore,
                    mitigations: approved ? [] : ['Require manual approval', 'Additional authentication']
                }
            },
            cacheKey: approved ? this.generateCacheKey(request) : undefined
        };
        if (!approved) {
            throw ConversationalValidationError.fromValidationResponse(response);
        }
        return response;
    }
    calculateRiskScore(request) {
        let score = 0;
        switch (request.securityLevel) {
            case parlant_integration_types_1.SecurityLevel._MINIMAL:
                score += 10;
                break;
            case parlant_integration_types_1.SecurityLevel._LOW:
                score += 20;
                break;
            case parlant_integration_types_1.SecurityLevel._MEDIUM:
                score += 40;
                break;
            case parlant_integration_types_1.SecurityLevel._HIGH:
                score += 60;
                break;
            case parlant_integration_types_1.SecurityLevel._CRITICAL:
                score += 80;
                break;
        }
        if (request.functionName.includes('delete') || request.functionName.includes('remove')) {
            score += 20;
        }
        if (request.functionName.includes('admin') || request.functionName.includes('root')) {
            score += 30;
        }
        const paramCount = Object.keys(request.parameters || {}).length;
        score += Math.min(paramCount * 2, 20);
        return Math.min(score, 100);
    }
    mapRiskScore(score) {
        if (score < 20)
            return parlant_integration_types_1.SecurityLevel._MINIMAL;
        if (score < 40)
            return parlant_integration_types_1.SecurityLevel._LOW;
        if (score < 60)
            return parlant_integration_types_1.SecurityLevel._MEDIUM;
        if (score < 80)
            return parlant_integration_types_1.SecurityLevel._HIGH;
        return parlant_integration_types_1.SecurityLevel._CRITICAL;
    }
    identifyRiskFactors(request) {
        const factors = [];
        if (request.securityLevel === parlant_integration_types_1.SecurityLevel._HIGH || request.securityLevel === parlant_integration_types_1.SecurityLevel._CRITICAL) {
            factors.push('High security classification');
        }
        if (request.functionName.includes('delete') || request.functionName.includes('remove')) {
            factors.push('Destructive operation');
        }
        if (request.functionName.includes('admin')) {
            factors.push('Administrative function');
        }
        if (Object.keys(request.parameters || {}).length > 10) {
            factors.push('Complex parameter set');
        }
        return factors;
    }
};
exports.ParlantIntegrationService = ParlantIntegrationService;
exports.ParlantIntegrationService = ParlantIntegrationService = ParlantIntegrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ParlantIntegrationService);
exports.default = ParlantIntegrationService;
//# sourceMappingURL=parlant-integration.service.js.map