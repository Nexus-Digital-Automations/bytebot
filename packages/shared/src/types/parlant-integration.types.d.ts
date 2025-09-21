export interface ParlantConfig {
    baseUrl: string;
    websocketUrl: string;
    apiKey: string;
    sessionTimeout: number;
    maxRetries: number;
    cacheTtl: number;
    debugMode: boolean;
}
export interface ParlantValidationRequest {
    operationId: string;
    functionName: string;
    packageName: string;
    description: string;
    parameters: Record<string, unknown>;
    userContext: ParlantUserContext;
    securityLevel: SecurityLevel;
    timeout?: number;
}
export interface ParlantValidationResponse {
    approved: boolean;
    conversationId: string;
    reason: string;
    confidence: number;
    executionContext?: ParlantExecutionContext;
    metadata: ParlantValidationMetadata;
    cacheKey?: string;
}
export interface ParlantUserContext {
    userId: string;
    roles: string[];
    sessionId: string;
    ipAddress: string;
    metadata: Record<string, unknown>;
}
export interface ParlantExecutionContext {
    constraints: Record<string, unknown>;
    resourceLimits: ParlantResourceLimits;
    securityRestrictions: string[];
    monitoring: ParlantMonitoringConfig;
}
export interface ParlantResourceLimits {
    maxExecutionTime: number;
    maxMemoryUsage: number;
    maxCpuUsage: number;
    fileSystemAccess: "none" | "read" | "write" | "full";
    networkAccess: "none" | "internal" | "external" | "full";
}
export interface ParlantMonitoringConfig {
    realTimeMonitoring: boolean;
    logAllOperations: boolean;
    alertOnViolations: boolean;
    auditTrail: boolean;
}
export interface ParlantValidationMetadata {
    startTime: Date;
    endTime: Date;
    processingTime: number;
    cacheStatus: "hit" | "miss" | "stale";
    source: "cache" | "parlant" | "fallback";
    riskAssessment: ParlantRiskAssessment;
}
export interface ParlantRiskAssessment {
    level: SecurityLevel;
    factors: string[];
    score: number;
    mitigations: string[];
}
export declare enum SecurityLevel {
    _MINIMAL = "minimal",
    _LOW = "low",
    _MEDIUM = "medium",
    _HIGH = "high",
    _CRITICAL = "critical"
}
export interface ParlantCacheEntry {
    response: ParlantValidationResponse;
    createdAt: Date;
    expiresAt: Date;
    hitCount: number;
    metadata: Record<string, unknown>;
}
export interface ParlantWebSocketMessage {
    type: ParlantMessageType;
    payload: Record<string, unknown>;
    messageId: string;
    timestamp: Date;
}
export declare enum ParlantMessageType {
    _VALIDATION_REQUEST = "validation_request",
    _VALIDATION_RESPONSE = "validation_response",
    _STATUS_UPDATE = "status_update",
    _ERROR = "error",
    _HEARTBEAT = "heartbeat",
    _AUTH_CHALLENGE = "auth_challenge",
    _AUTH_RESPONSE = "auth_response"
}
export interface ParlantFunctionWrapper {
    originalFunction: (..._args: unknown[]) => unknown;
    metadata: ParlantFunctionMetadata;
    validationConfig: ParlantValidationConfig;
    metrics: ParlantFunctionMetrics;
}
export interface ParlantFunctionMetadata {
    name: string;
    packageName: string;
    description: string;
    parameterSchemas: Record<string, unknown>;
    returnSchema: Record<string, unknown>;
    securityRequirements: string[];
    performanceSla: ParlantPerformanceSla;
}
export interface ParlantValidationConfig {
    enabled?: boolean;
    securityLevel?: SecurityLevel;
    cacheable?: boolean;
    cacheTtl?: number;
    timeout?: number;
    retryConfig?: ParlantRetryConfig;
    description?: string;
}
export interface ParlantRetryConfig {
    maxAttempts: number;
    baseDelay: number;
    backoffMultiplier: number;
    maxDelay: number;
}
export interface ParlantPerformanceSla {
    maxResponseTime: number;
    requiredUptime: number;
    maxErrorRate: number;
}
export interface ParlantFunctionMetrics {
    totalInvocations: number;
    successfulValidations: number;
    failedValidations: number;
    averageValidationTime: number;
    cacheHitRate: number;
    errorRate: number;
    lastUpdated: Date;
}
export interface ParlantAuditEntry {
    id: string;
    operationId: string;
    functionName: string;
    packageName: string;
    userContext: ParlantUserContext;
    validationRequest: ParlantValidationRequest;
    validationResponse: ParlantValidationResponse;
    executionResult?: unknown;
    executionError?: Error;
    timestamp: Date;
    metadata: Record<string, unknown>;
}
export interface ParlantHealthStatus {
    status: "healthy" | "degraded" | "unhealthy";
    apiConnection: boolean;
    websocketConnection: boolean;
    cacheStatus: boolean;
    lastCheck: Date;
    metrics: ParlantHealthMetrics;
}
export interface ParlantHealthMetrics {
    activeConnections: number;
    requestRate: number;
    averageResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
    memoryUsage: number;
}
export interface ParlantServiceConfig {
    connection: ParlantConfig;
    wrapper: ParlantValidationConfig;
    cache: ParlantCacheConfig;
    websocket: ParlantWebSocketConfig;
    authentication: ParlantAuthConfig;
    monitoring: ParlantMonitoringConfig;
}
export interface ParlantCacheConfig {
    enabled: boolean;
    type: "memory" | "redis" | "hybrid";
    defaultTtl: number;
    maxSize: number;
    evictionPolicy: "lru" | "fifo" | "ttl";
}
export interface ParlantWebSocketConfig {
    enabled: boolean;
    reconnectAttempts: number;
    heartbeatInterval: number;
    connectionTimeout: number;
}
export interface ParlantAuthConfig {
    jwtSecret: string;
    tokenExpiration: string;
    refreshTokenEnabled: boolean;
    sessionDuration: number;
}
export interface ParlantDecoratorOptions {
    description: string;
    intent?: string;
    securityLevel?: SecurityLevel;
    cacheable?: boolean;
    cacheTtl?: number;
    timeout?: number;
    customValidator?: (_request: ParlantValidationRequest) => Promise<boolean>;
}
export declare class ParlantIntegrationError extends Error {
    readonly _code: string;
    readonly _details?: Record<string, unknown> | undefined;
    constructor(message: string, _code: string, _details?: Record<string, unknown> | undefined);
}
export declare class ParlantValidationError extends ParlantIntegrationError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class ParlantConnectionError extends ParlantIntegrationError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class ParlantAuthenticationError extends ParlantIntegrationError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class ParlantTimeoutError extends ParlantIntegrationError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare enum FunctionSecurityLevel {
    _PUBLIC = "public",
    _INTERNAL = "internal",
    _RESTRICTED = "restricted",
    _CONFIDENTIAL = "confidential",
    _SECRET = "secret"
}
export declare enum SecurityConsiderationType {
    _AUTHENTICATION_BYPASS = "authentication_bypass",
    _PRIVILEGE_ESCALATION = "privilege_escalation",
    _DATA_EXPOSURE = "data_exposure",
    _INJECTION_VULNERABILITY = "injection_vulnerability",
    _DENIAL_OF_SERVICE = "denial_of_service",
    _CROSS_SITE_SCRIPTING = "cross_site_scripting",
    _SENSITIVE_DATA_ACCESS = "sensitive_data_access"
}
export declare enum SecuritySeverity {
    _LOW = "low",
    _MEDIUM = "medium",
    _HIGH = "high",
    _CRITICAL = "critical"
}
export interface SecurityConsideration {
    type: SecurityConsiderationType;
    description: string;
    severity: SecuritySeverity;
    mitigations: string[];
}
export interface SecurityConstraint {
    type: string;
    description: string;
    parameters: Record<string, unknown>;
    mandatory: boolean;
}
export interface FunctionSecurityAssessment {
    securityLevel: FunctionSecurityLevel;
    riskLevel: RiskLevel;
    considerations: SecurityConsideration[];
    constraints: SecurityConstraint[];
    assessedAt: Date;
    metadata: Record<string, unknown>;
}
export interface AuthorInfo {
    name: string;
    email?: string;
    team: string;
    createdAt: Date;
}
export declare enum RiskLevel {
    _LOW = "low",
    _MEDIUM = "medium",
    _HIGH = "high",
    _CRITICAL = "critical"
}
export declare enum ValidationMode {
    _STRICT = "strict",
    _PERMISSIVE = "permissive",
    _ADVISORY = "advisory"
}
export declare enum ApprovalLevel {
    _AUTOMATIC = "automatic",
    _MANUAL = "manual",
    _ESCALATED = "escalated"
}
//# sourceMappingURL=parlant-integration.types.d.ts.map