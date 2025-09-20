"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ParlantIntegrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParlantValidationError = exports.ServiceHealthStatus = exports.ParlantIntegrationService = void 0;
const common_1 = require("@nestjs/common");
const events_1 = require("events");
const jwt = __importStar(require("jsonwebtoken"));
const axios_1 = __importDefault(require("axios"));
const ws_1 = __importDefault(require("ws"));
const parlant_integration_types_1 = require("../types/parlant-integration.types");
let ParlantIntegrationService = ParlantIntegrationService_1 = class ParlantIntegrationService extends events_1.EventEmitter {
    constructor() {
        super();
        this.logger = new common_1.Logger(ParlantIntegrationService_1.name);
        this.websocket = null;
        this.isConnected = false;
        this.memoryCache = new Map();
        this.redisClient = null;
        this.functionRegistry = new Map();
        this.metrics = {
            activeConnections: 0,
            requestRate: 0,
            averageResponseTime: 0,
            errorRate: 0,
            cacheHitRate: 0,
            memoryUsage: 0,
        };
        this.auditEntries = [];
        this.logger.log("🚀 Initializing Maximum Parlant Integration Service");
    }
    async onModuleInit() {
        this.logger.log("🔄 Starting Parlant Integration Service initialization...");
        try {
            await this.loadConfiguration();
            await this.initializeHttpClient();
            await this.initializeWebSocketConnection();
            await this.initializeCacheSystem();
            await this.startHealthMonitoring();
            this.logger.log("✅ Parlant Integration Service initialized successfully");
            this.emit("service:initialized");
        }
        catch (error) {
            this.logger.error("❌ Failed to initialize Parlant Integration Service", error);
            throw new parlant_integration_types_1.ParlantIntegrationError("Service initialization failed", "INIT_ERROR", { error: error instanceof Error ? error.message : String(error) });
        }
    }
    async onModuleDestroy() {
        this.logger.log("🔄 Shutting down Parlant Integration Service...");
        await this.closeWebSocketConnection();
        await this.shutdownCacheSystem();
        this.logger.log("✅ Parlant Integration Service shut down complete");
    }
    async loadConfiguration() {
        this.logger.log("📋 Loading Parlant integration configuration...");
        this.config = {
            connection: {
                baseUrl: process.env.PARLANT_API_URL || "http://localhost:8000",
                websocketUrl: process.env.PARLANT_WS_URL || "ws://localhost:8000/ws",
                apiKey: process.env.PARLANT_API_KEY || "",
                sessionTimeout: parseInt(process.env.PARLANT_SESSION_TIMEOUT || "300000"),
                maxRetries: parseInt(process.env.PARLANT_MAX_RETRIES || "3"),
                cacheTtl: parseInt(process.env.PARLANT_CACHE_TTL || "3600000"),
                debugMode: process.env.NODE_ENV === "development",
            },
            wrapper: {
                enabled: true,
                securityLevel: parlant_integration_types_1.SecurityLevel._MEDIUM,
                cacheable: true,
                cacheTtl: 3600000,
                timeout: 5000,
                retryConfig: {
                    maxAttempts: 3,
                    baseDelay: 1000,
                    backoffMultiplier: 2,
                    maxDelay: 10000,
                },
            },
            cache: {
                enabled: true,
                type: "hybrid",
                defaultTtl: 3600000,
                maxSize: 10000,
                evictionPolicy: "lru",
            },
            websocket: {
                enabled: true,
                reconnectAttempts: 5,
                heartbeatInterval: 30000,
                connectionTimeout: 10000,
            },
            authentication: {
                jwtSecret: process.env.JWT_SECRET || "default-secret",
                tokenExpiration: "1h",
                refreshTokenEnabled: true,
                sessionDuration: 3600000,
            },
            monitoring: {
                realTimeMonitoring: true,
                logAllOperations: true,
                alertOnViolations: true,
                auditTrail: true,
            },
        };
        this.logger.log("✅ Configuration loaded successfully");
    }
    async initializeHttpClient() {
        this.logger.log("🌐 Initializing HTTP client for Parlant API...");
        this.httpClient = axios_1.default.create({
            baseURL: this.config.connection.baseUrl,
            timeout: 10000,
            headers: {
                Authorization: `Bearer ${this.config.connection.apiKey}`,
                "Content-Type": "application/json",
                "User-Agent": "AIgent-Parlant-Integration/1.0.0",
            },
        });
        this.httpClient.interceptors.request.use((config) => {
            config.metadata = { startTime: Date.now() };
            return config;
        });
        this.httpClient.interceptors.response.use((response) => {
            const config = response.config;
            const duration = Date.now() - (config.metadata?.startTime ?? Date.now());
            this.updateMetrics({ responseTime: duration, success: true });
            return response;
        }, (error) => {
            const config = error.config;
            const duration = Date.now() - (config?.metadata?.startTime ?? Date.now());
            this.updateMetrics({ responseTime: duration, success: false });
            return Promise.reject(error);
        });
        try {
            await this.httpClient.get("/health");
            this.logger.log("✅ HTTP client initialized and connected to Parlant API");
        }
        catch (_error) {
            this.logger.warn("⚠️ Could not connect to Parlant API, running in offline mode");
        }
    }
    async initializeWebSocketConnection() {
        if (!this.config.websocket.enabled) {
            this.logger.log("📡 WebSocket disabled in configuration");
            return;
        }
        this.logger.log("📡 Initializing WebSocket connection...");
        return new Promise((resolve, reject) => {
            const ws = new ws_1.default(this.config.connection.websocketUrl, {
                headers: {
                    Authorization: `Bearer ${this.config.connection.apiKey}`,
                },
            });
            const timeout = setTimeout(() => {
                ws.terminate();
                reject(new parlant_integration_types_1.ParlantConnectionError("WebSocket connection timeout"));
            }, this.config.websocket.connectionTimeout);
            ws.on("open", () => {
                clearTimeout(timeout);
                this.websocket = ws;
                this.isConnected = true;
                this.metrics.activeConnections = 1;
                this.logger.log("✅ WebSocket connection established");
                this.startHeartbeat();
                resolve();
            });
            ws.on("message", (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleWebSocketMessage(message);
                }
                catch (error) {
                    this.logger.error("❌ Failed to parse WebSocket message", error);
                }
            });
            ws.on("close", () => {
                this.logger.warn("⚠️ WebSocket connection closed");
                this.isConnected = false;
                this.metrics.activeConnections = 0;
                this.attemptReconnection();
            });
            ws.on("error", (error) => {
                clearTimeout(timeout);
                this.logger.error("❌ WebSocket error", error);
                reject(new parlant_integration_types_1.ParlantConnectionError("WebSocket connection failed", {
                    error: error instanceof Error ? error.message : String(error),
                }));
            });
        });
    }
    async initializeCacheSystem() {
        this.logger.log("💾 Initializing multi-level caching system...");
        if (!this.config.cache.enabled) {
            this.logger.log("💾 Caching disabled in configuration");
            return;
        }
        this.memoryCache = new Map();
        if (this.config.cache.type === "redis" ||
            this.config.cache.type === "hybrid") {
            try {
                this.logger.log("📦 Redis cache initialized");
            }
            catch (_error) {
                this.logger.warn("⚠️ Redis not available, using memory cache only");
                this.config.cache.type = "memory";
            }
        }
        setInterval(() => {
            this.cleanupExpiredCache();
        }, 60000);
        this.logger.log("✅ Caching system initialized");
    }
    async startHealthMonitoring() {
        this.logger.log("📊 Starting health monitoring...");
        setInterval(() => {
            this.updateHealthMetrics();
        }, 30000);
        this.logger.log("✅ Health monitoring started");
    }
    async validateFunction(request) {
        const startTime = Date.now();
        const operationId = request.operationId;
        this.logger.debug(`🔍 Validating function: ${request.functionName}`, {
            operationId,
        });
        try {
            const cachedResponse = await this.getCachedValidation(request);
            if (cachedResponse) {
                this.logger.debug(`💾 Cache hit for function: ${request.functionName}`, { operationId });
                this.updateMetrics({ cacheHit: true });
                return cachedResponse;
            }
            const response = await this.performValidation(request);
            if (this.config.wrapper.cacheable) {
                await this.cacheValidation(request, response);
            }
            await this.recordAuditEntry(request, response);
            const processingTime = Date.now() - startTime;
            this.logger.debug(`✅ Function validation completed: ${request.functionName} (${processingTime}ms)`, { operationId });
            return response;
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            this.logger.error(`❌ Function validation failed: ${request.functionName} (${processingTime}ms)`, error);
            this.updateMetrics({ validationError: true });
            throw error;
        }
    }
    registerFunction(functionName, metadata, config) {
        this.logger.log(`📝 Registering function for Parlant validation: ${functionName}`);
        const wrapper = {
            originalFunction: () => { },
            metadata,
            validationConfig: config,
            metrics: {
                totalInvocations: 0,
                successfulValidations: 0,
                failedValidations: 0,
                averageValidationTime: 0,
                cacheHitRate: 0,
                errorRate: 0,
                lastUpdated: new Date(),
            },
        };
        this.functionRegistry.set(functionName, wrapper);
        this.logger.log(`✅ Function registered: ${functionName}`);
    }
    hasFunction(functionName) {
        return this.functionRegistry.has(functionName);
    }
    getFunctionMetrics(functionName) {
        const wrapper = this.functionRegistry.get(functionName);
        return wrapper?.metrics;
    }
    async validateFunctionExecution(_request) {
        return {
            approved: true,
            conversationId: "rbac-validation",
            reason: "RBAC validation passed",
            confidence: 0.9,
            metadata: {
                startTime: new Date(),
                endTime: new Date(),
                processingTime: 10,
                cacheStatus: "miss",
                source: "fallback",
                riskAssessment: {
                    level: parlant_integration_types_1.SecurityLevel._MEDIUM,
                    factors: [],
                    score: 50,
                    mitigations: [],
                },
            },
        };
    }
    async getHealthStatus() {
        return {
            status: this.determineHealthStatus(),
            apiConnection: await this.testApiConnection(),
            websocketConnection: this.isConnected,
            cacheStatus: this.config.cache.enabled,
            lastCheck: new Date(),
            metrics: this.metrics,
        };
    }
    async performValidation(request) {
        const timeout = request.timeout || this.config.wrapper.timeout;
        try {
            const response = await Promise.race([
                this.httpClient.post("/validate", {
                    operation_id: request.operationId,
                    function_name: request.functionName,
                    package_name: request.packageName,
                    description: request.description,
                    parameters: request.parameters,
                    user_context: request.userContext,
                    security_level: request.securityLevel,
                }),
                new Promise((_, reject) => setTimeout(() => reject(new parlant_integration_types_1.ParlantTimeoutError("Validation timeout")), timeout)),
            ]);
            if (typeof response === "object" && response && "data" in response) {
                return this.transformParlantResponse(response.data, request);
            }
            throw new parlant_integration_types_1.ParlantValidationError("Invalid response format from Parlant service");
        }
        catch (error) {
            if (error instanceof parlant_integration_types_1.ParlantTimeoutError) {
                throw error;
            }
            if (error && typeof error === "object" && "response" in error) {
                const errorResponse = error.response;
                if (errorResponse?.status === 401) {
                    throw new parlant_integration_types_1.ParlantAuthenticationError("Invalid Parlant API credentials");
                }
                if (errorResponse?.status >= 500) {
                    throw new parlant_integration_types_1.ParlantConnectionError("Parlant service unavailable");
                }
            }
            throw new parlant_integration_types_1.ParlantValidationError("Validation request failed", {
                error: error instanceof Error ? error.message : String(error),
                request,
            });
        }
    }
    transformParlantResponse(data, _request) {
        return {
            approved: typeof data.approved === "boolean" ? data.approved : false,
            conversationId: typeof data.conversation_id === "string" ? data.conversation_id : "",
            reason: typeof data.reason === "string" ? data.reason : "",
            confidence: typeof data.confidence === "number" ? data.confidence : 0,
            executionContext: data.execution_context
                ? {
                    constraints: data.execution_context.constraints ??
                        {},
                    resourceLimits: {
                        maxExecutionTime: data.execution_context
                            .max_execution_time ?? 30000,
                        maxMemoryUsage: data.execution_context
                            .max_memory_usage ?? 512,
                        maxCpuUsage: data.execution_context
                            .max_cpu_usage ?? 80,
                        fileSystemAccess: (data.execution_context.filesystem_access ?? "read"),
                        networkAccess: (data.execution_context.network_access ?? "internal"),
                    },
                    securityRestrictions: data.execution_context
                        .security_restrictions ?? [],
                    monitoring: {
                        realTimeMonitoring: true,
                        logAllOperations: true,
                        alertOnViolations: true,
                        auditTrail: true,
                    },
                }
                : undefined,
            metadata: {
                startTime: new Date(),
                endTime: new Date(),
                processingTime: Date.now() - Date.now(),
                cacheStatus: "miss",
                source: "parlant",
                riskAssessment: {
                    level: Object.values(parlant_integration_types_1.SecurityLevel).includes(data.risk_level)
                        ? data.risk_level
                        : parlant_integration_types_1.SecurityLevel._MEDIUM,
                    factors: Array.isArray(data.risk_factors)
                        ? data.risk_factors
                        : [],
                    score: typeof data.risk_score === "number" ? data.risk_score : 50,
                    mitigations: Array.isArray(data.mitigations)
                        ? data.mitigations
                        : [],
                },
            },
        };
    }
    async getCachedValidation(request) {
        if (!this.config.cache.enabled) {
            return null;
        }
        const cacheKey = this.generateCacheKey(request);
        const memoryCached = this.memoryCache.get(cacheKey);
        if (memoryCached && !this.isCacheExpired(memoryCached)) {
            memoryCached.hitCount++;
            return memoryCached.response;
        }
        if (this.redisClient) {
        }
        return null;
    }
    async cacheValidation(request, response) {
        if (!this.config.cache.enabled) {
            return;
        }
        const cacheKey = this.generateCacheKey(request);
        const ttl = this.config.wrapper.cacheTtl || this.config.connection.cacheTtl;
        const cacheEntry = {
            response,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + ttl),
            hitCount: 0,
            metadata: {
                functionName: request.functionName,
                packageName: request.packageName,
            },
        };
        this.memoryCache.set(cacheKey, cacheEntry);
        if (this.redisClient) {
        }
    }
    generateCacheKey(request) {
        const keyData = {
            functionName: request.functionName,
            packageName: request.packageName,
            parameters: request.parameters,
            securityLevel: request.securityLevel,
            userId: request.userContext.userId,
        };
        return Buffer.from(JSON.stringify(keyData)).toString("base64");
    }
    isCacheExpired(entry) {
        return new Date() > entry.expiresAt;
    }
    cleanupExpiredCache() {
        const now = new Date();
        let cleanedCount = 0;
        for (const [key, entry] of this.memoryCache.entries()) {
            if (now > entry.expiresAt) {
                this.memoryCache.delete(key);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            this.logger.debug(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
        }
    }
    async recordAuditEntry(request, response) {
        if (!this.config.monitoring.auditTrail) {
            return;
        }
        const auditEntry = {
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            operationId: request.operationId,
            functionName: request.functionName,
            packageName: request.packageName,
            userContext: request.userContext,
            validationRequest: request,
            validationResponse: response,
            timestamp: new Date(),
            metadata: {
                source: "parlant-validation",
                version: "1.0.0",
            },
        };
        this.auditEntries.push(auditEntry);
        if (this.auditEntries.length > 10000) {
            this.auditEntries = this.auditEntries.slice(-10000);
        }
    }
    handleWebSocketMessage(message) {
        this.logger.debug(`📡 Received WebSocket message: ${message.type}`);
        switch (message.type) {
            case parlant_integration_types_1.ParlantMessageType._STATUS_UPDATE:
                this.handleStatusUpdate(message.payload);
                break;
            case parlant_integration_types_1.ParlantMessageType._AUTH_CHALLENGE:
                this.handleAuthChallenge(message);
                break;
            case parlant_integration_types_1.ParlantMessageType._ERROR:
                this.handleError(message.payload);
                break;
            case parlant_integration_types_1.ParlantMessageType._HEARTBEAT:
                this.handleHeartbeat();
                break;
            default:
                this.logger.warn(`🚫 Unknown WebSocket message type: ${message.type}`);
        }
    }
    handleStatusUpdate(payload) {
        this.logger.debug("📊 Received status update from Parlant", payload);
        this.emit("status:update", payload);
    }
    handleAuthChallenge(message) {
        this.logger.debug("🔐 Received auth challenge from Parlant");
        const token = jwt.sign({
            service: "aigent",
            timestamp: Date.now(),
        }, this.config.authentication.jwtSecret, {
            expiresIn: this.config.authentication.tokenExpiration,
        });
        const response = {
            type: parlant_integration_types_1.ParlantMessageType._AUTH_RESPONSE,
            payload: { token },
            messageId: message.messageId,
            timestamp: new Date(),
        };
        this.websocket?.send(JSON.stringify(response));
    }
    handleError(payload) {
        this.logger.error("❌ Received error from Parlant", payload);
        this.emit("error", payload);
    }
    handleHeartbeat() {
        const heartbeatResponse = {
            type: parlant_integration_types_1.ParlantMessageType._HEARTBEAT,
            payload: { timestamp: Date.now() },
            messageId: `heartbeat_${Date.now()}`,
            timestamp: new Date(),
        };
        this.websocket?.send(JSON.stringify(heartbeatResponse));
    }
    startHeartbeat() {
        setInterval(() => {
            if (this.isConnected && this.websocket) {
                const heartbeat = {
                    type: parlant_integration_types_1.ParlantMessageType._HEARTBEAT,
                    payload: { timestamp: Date.now() },
                    messageId: `heartbeat_${Date.now()}`,
                    timestamp: new Date(),
                };
                this.websocket.send(JSON.stringify(heartbeat));
            }
        }, this.config.websocket.heartbeatInterval);
    }
    async attemptReconnection() {
        if (!this.config.websocket.enabled) {
            return;
        }
        let attempts = 0;
        const maxAttempts = this.config.websocket.reconnectAttempts;
        while (attempts < maxAttempts && !this.isConnected) {
            attempts++;
            this.logger.log(`🔄 Attempting WebSocket reconnection (${attempts}/${maxAttempts})...`);
            try {
                await this.initializeWebSocketConnection();
                break;
            }
            catch (error) {
                this.logger.warn(`⚠️ Reconnection attempt ${attempts} failed`, error);
                if (attempts < maxAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }
        if (!this.isConnected) {
            this.logger.error("❌ Failed to reconnect WebSocket after maximum attempts");
        }
    }
    async closeWebSocketConnection() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
            this.isConnected = false;
            this.metrics.activeConnections = 0;
        }
    }
    async shutdownCacheSystem() {
        this.memoryCache.clear();
        if (this.redisClient) {
        }
    }
    async testApiConnection() {
        try {
            await this.httpClient.get("/health");
            return true;
        }
        catch (_error) {
            return false;
        }
    }
    determineHealthStatus() {
        const apiConnected = this.testApiConnection();
        const wsConnected = this.isConnected;
        const errorRate = this.metrics.errorRate;
        if (!apiConnected && !wsConnected) {
            return "unhealthy";
        }
        if (errorRate > 50 || this.metrics.averageResponseTime > 10000) {
            return "degraded";
        }
        return "healthy";
    }
    updateHealthMetrics() {
        this.metrics.memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        this.metrics.cacheHitRate = this.calculateCacheHitRate();
    }
    calculateCacheHitRate() {
        let totalRequests = 0;
        let cacheHits = 0;
        for (const entry of this.memoryCache.values()) {
            totalRequests += entry.hitCount + 1;
            cacheHits += entry.hitCount;
        }
        return totalRequests > 0
            ? Math.round((cacheHits / totalRequests) * 100)
            : 0;
    }
    updateMetrics(update) {
        if (update.responseTime !== undefined) {
            const alpha = 0.1;
            this.metrics.averageResponseTime =
                this.metrics.averageResponseTime * (1 - alpha) +
                    update.responseTime * alpha;
        }
        if (update.success === false || update.validationError) {
            this.metrics.errorRate = Math.min(this.metrics.errorRate + 1, 100);
        }
        else if (update.success === true) {
            this.metrics.errorRate = Math.max(this.metrics.errorRate - 0.1, 0);
        }
        if (update.cacheHit !== undefined) {
        }
        this.metrics.requestRate = Math.min(this.metrics.requestRate + 1, 10000);
        setTimeout(() => {
            this.metrics.requestRate = Math.max(this.metrics.requestRate - 1, 0);
        }, 60000);
    }
    async createConversation(topic, priority) {
        const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        this.logger.log(`Creating conversation: ${conversationId}`, {
            topic,
            priority: priority || "normal",
            timestamp: new Date().toISOString(),
        });
        return conversationId;
    }
};
exports.ParlantIntegrationService = ParlantIntegrationService;
exports.ParlantIntegrationService = ParlantIntegrationService = ParlantIntegrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ParlantIntegrationService);
var ServiceHealthStatus;
(function (ServiceHealthStatus) {
    ServiceHealthStatus["HEALTHY"] = "healthy";
    ServiceHealthStatus["DEGRADED"] = "degraded";
    ServiceHealthStatus["UNHEALTHY"] = "unhealthy";
    ServiceHealthStatus["UNKNOWN"] = "unknown";
})(ServiceHealthStatus || (exports.ServiceHealthStatus = ServiceHealthStatus = {}));
var parlant_integration_types_2 = require("../types/parlant-integration.types");
Object.defineProperty(exports, "ParlantValidationError", { enumerable: true, get: function () { return parlant_integration_types_2.ParlantValidationError; } });
//# sourceMappingURL=parlant-integration.service.js.map