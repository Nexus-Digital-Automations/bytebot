import { OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { EventEmitter } from "events";
import { ParlantValidationRequest, ParlantValidationResponse, ParlantHealthStatus, ParlantAuditEntry, ParlantFunctionWrapper, ParlantFunctionMetadata, ParlantValidationConfig } from "../types/parlant-integration.types";
export declare class ParlantIntegrationService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private httpClient;
    private websocket;
    private isConnected;
    private memoryCache;
    private redisClient;
    private functionRegistry;
    private metrics;
    private auditEntries;
    private config;
    constructor();
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private loadConfiguration;
    private initializeHttpClient;
    private initializeWebSocketConnection;
    private initializeCacheSystem;
    private startHealthMonitoring;
    validateFunction(request: ParlantValidationRequest): Promise<ParlantValidationResponse>;
    registerFunction(functionName: string, metadata: ParlantFunctionMetadata, config: ParlantValidationConfig): void;
    hasFunction(functionName: string): boolean;
    getFunctionMetrics(functionName: string): ParlantFunctionWrapper["metrics"] | undefined;
    validateFunctionExecution(_request: ParlantValidationRequest): Promise<ParlantValidationResponse>;
    getHealthStatus(): Promise<ParlantHealthStatus>;
    private performValidation;
    private transformParlantResponse;
    private getCachedValidation;
    private cacheValidation;
    private generateCacheKey;
    private isCacheExpired;
    private cleanupExpiredCache;
    private recordAuditEntry;
    private handleWebSocketMessage;
    private handleStatusUpdate;
    private handleAuthChallenge;
    private handleError;
    private handleHeartbeat;
    private startHeartbeat;
    private attemptReconnection;
    private closeWebSocketConnection;
    private shutdownCacheSystem;
    private testApiConnection;
    private determineHealthStatus;
    private updateHealthMetrics;
    private calculateCacheHitRate;
    private updateMetrics;
    createConversation(topic: string, priority?: string): Promise<string>;
}
export interface ParlantIntegrationConfig {
    serviceUrl: string;
    apiKey: string;
    timeout?: number;
    retryAttempts?: number;
    enableWebSocket?: boolean;
    enableCaching?: boolean;
}
export interface ConversationManager {
    createConversation(context: any): Promise<string>;
    getConversation(id: string): Promise<any>;
    updateConversation(id: string, update: any): Promise<void>;
    closeConversation(id: string): Promise<void>;
}
export interface ValidationEngine {
    validateFunction(request: ParlantValidationRequest): Promise<ParlantValidationResponse>;
    createValidationContext(context: any): any;
    processValidationResult(result: any): any;
}
export interface AuditService {
    logValidationEvent(event: ParlantAuditEntry): Promise<void>;
    getValidationHistory(context: any): Promise<ParlantAuditEntry[]>;
    exportAuditLog(options: any): Promise<string>;
}
export declare enum ServiceHealthStatus {
    HEALTHY = "healthy",
    DEGRADED = "degraded",
    UNHEALTHY = "unhealthy",
    UNKNOWN = "unknown"
}
export { ParlantValidationError } from "../types/parlant-integration.types";
//# sourceMappingURL=parlant-integration.service.d.ts.map