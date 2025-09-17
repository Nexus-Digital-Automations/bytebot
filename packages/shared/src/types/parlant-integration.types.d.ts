/**
 * Parlant Integration Types and Interfaces
 *
 * Comprehensive type definitions for Maximum Parlant Integration with AIgent ecosystem.
 * Supports function-level wrapping across ALL 1,520+ functions with enterprise-grade
 * validation, authentication, and performance optimization.
 *
 * @module ParlantIntegrationTypes
 * @version 1.0.0
 * @author AIgent Integration Team
 */
export interface ParlantConfig {
    /** Parlant API base URL */
    baseUrl: string;
    /** WebSocket endpoint for real-time communication */
    websocketUrl: string;
    /** API key for Parlant authentication */
    apiKey: string;
    /** Session timeout in milliseconds */
    sessionTimeout: number;
    /** Maximum retry attempts for failed validations */
    maxRetries: number;
    /** Cache TTL in milliseconds */
    cacheTtl: number;
    /** Enable debug logging */
    debugMode: boolean;
}
export interface ParlantValidationRequest {
    /** Unique operation identifier */
    operationId: string;
    /** Function name being validated */
    functionName: string;
    /** Package/service name */
    packageName: string;
    /** Function description in natural language */
    description: string;
    /** Function parameters */
    parameters: Record<string, unknown>;
    /** User context for validation */
    userContext: ParlantUserContext;
    /** Security level required */
    securityLevel: SecurityLevel;
    /** Validation timeout in milliseconds */
    timeout?: number;
}
export interface ParlantValidationResponse {
    /** Whether the operation is approved */
    approved: boolean;
    /** Parlant conversation ID */
    conversationId: string;
    /** Validation reasoning */
    reason: string;
    /** Confidence score (0-1) */
    confidence: number;
    /** Execution context if approved */
    executionContext?: ParlantExecutionContext;
    /** Validation metadata */
    metadata: ParlantValidationMetadata;
    /** Cache key for future requests */
    cacheKey?: string;
}
export interface ParlantUserContext {
    /** User ID from AIgent authentication */
    userId: string;
    /** User roles and permissions */
    roles: string[];
    /** Session ID */
    sessionId: string;
    /** IP address for security tracking */
    ipAddress: string;
    /** Additional context data */
    metadata: Record<string, unknown>;
}
export interface ParlantExecutionContext {
    /** Execution constraints */
    constraints: Record<string, unknown>;
    /** Resource limits */
    resourceLimits: ParlantResourceLimits;
    /** Security restrictions */
    securityRestrictions: string[];
    /** Monitoring requirements */
    monitoring: ParlantMonitoringConfig;
}
export interface ParlantResourceLimits {
    /** Maximum execution time in milliseconds */
    maxExecutionTime: number;
    /** Maximum memory usage in MB */
    maxMemoryUsage: number;
    /** Maximum CPU percentage */
    maxCpuUsage: number;
    /** File system access restrictions */
    fileSystemAccess: "none" | "read" | "write" | "full";
    /** Network access restrictions */
    networkAccess: "none" | "internal" | "external" | "full";
}
export interface ParlantMonitoringConfig {
    /** Enable real-time monitoring */
    realTimeMonitoring: boolean;
    /** Log all operations */
    logAllOperations: boolean;
    /** Alert on security violations */
    alertOnViolations: boolean;
    /** Audit trail requirements */
    auditTrail: boolean;
}
export interface ParlantValidationMetadata {
    /** Validation start time */
    startTime: Date;
    /** Validation end time */
    endTime: Date;
    /** Processing time in milliseconds */
    processingTime: number;
    /** Cache hit/miss status */
    cacheStatus: "hit" | "miss" | "stale";
    /** Validation source */
    source: "cache" | "parlant" | "fallback";
    /** Risk assessment */
    riskAssessment: ParlantRiskAssessment;
}
export interface ParlantRiskAssessment {
    /** Overall risk level */
    level: SecurityLevel;
    /** Risk factors identified */
    factors: string[];
    /** Risk score (0-100) */
    score: number;
    /** Mitigation recommendations */
    mitigations: string[];
}
export declare enum SecurityLevel {
    _LOW = "low",
    _MEDIUM = "medium",
    _HIGH = "high",
    _CRITICAL = "critical"
}
export interface ParlantCacheEntry {
    /** Cached validation response */
    response: ParlantValidationResponse;
    /** Cache creation time */
    createdAt: Date;
    /** Cache expiration time */
    expiresAt: Date;
    /** Cache hit count */
    hitCount: number;
    /** Cache metadata */
    metadata: Record<string, unknown>;
}
export interface ParlantWebSocketMessage {
    /** Message type */
    type: ParlantMessageType;
    /** Message payload */
    payload: Record<string, unknown>;
    /** Message ID for correlation */
    messageId: string;
    /** Timestamp */
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
    /** Original function reference */
    originalFunction: (..._args: unknown[]) => unknown;
    /** Function metadata */
    metadata: ParlantFunctionMetadata;
    /** Validation configuration */
    validationConfig: ParlantValidationConfig;
    /** Performance metrics */
    metrics: ParlantFunctionMetrics;
}
export interface ParlantFunctionMetadata {
    /** Function name */
    name: string;
    /** Package/module name */
    packageName: string;
    /** Function description */
    description: string;
    /** Parameter schemas */
    parameterSchemas: Record<string, unknown>;
    /** Return type schema */
    returnSchema: Record<string, unknown>;
    /** Security requirements */
    securityRequirements: string[];
    /** Performance SLA */
    performanceSla: ParlantPerformanceSla;
}
export interface ParlantValidationConfig {
    /** Enable validation for this function */
    enabled?: boolean;
    /** Required security level */
    securityLevel?: SecurityLevel;
    /** Cache validation results */
    cacheable?: boolean;
    /** Cache TTL in milliseconds */
    cacheTtl?: number;
    /** Validation timeout */
    timeout?: number;
    /** Retry configuration */
    retryConfig?: ParlantRetryConfig;
    /** Operation description */
    description?: string;
}
export interface ParlantRetryConfig {
    /** Maximum retry attempts */
    maxAttempts: number;
    /** Base delay in milliseconds */
    baseDelay: number;
    /** Exponential backoff multiplier */
    backoffMultiplier: number;
    /** Maximum delay in milliseconds */
    maxDelay: number;
}
export interface ParlantPerformanceSla {
    /** Maximum response time in milliseconds */
    maxResponseTime: number;
    /** Required uptime percentage */
    requiredUptime: number;
    /** Maximum error rate percentage */
    maxErrorRate: number;
}
export interface ParlantFunctionMetrics {
    /** Total invocation count */
    totalInvocations: number;
    /** Successful validations */
    successfulValidations: number;
    /** Failed validations */
    failedValidations: number;
    /** Average validation time */
    averageValidationTime: number;
    /** Cache hit rate */
    cacheHitRate: number;
    /** Error rate */
    errorRate: number;
    /** Last updated timestamp */
    lastUpdated: Date;
}
export interface ParlantAuditEntry {
    /** Audit entry ID */
    id: string;
    /** Operation ID being audited */
    operationId: string;
    /** Function name */
    functionName: string;
    /** Package name */
    packageName: string;
    /** User context */
    userContext: ParlantUserContext;
    /** Validation request */
    validationRequest: ParlantValidationRequest;
    /** Validation response */
    validationResponse: ParlantValidationResponse;
    /** Execution result */
    executionResult?: unknown;
    /** Execution error if any */
    executionError?: Error;
    /** Audit timestamp */
    timestamp: Date;
    /** Additional metadata */
    metadata: Record<string, unknown>;
}
export interface ParlantHealthStatus {
    /** Service health status */
    status: "healthy" | "degraded" | "unhealthy";
    /** Connection to Parlant API */
    apiConnection: boolean;
    /** WebSocket connection status */
    websocketConnection: boolean;
    /** Cache system status */
    cacheStatus: boolean;
    /** Last health check */
    lastCheck: Date;
    /** Health metrics */
    metrics: ParlantHealthMetrics;
}
export interface ParlantHealthMetrics {
    /** Active connections count */
    activeConnections: number;
    /** Request rate per minute */
    requestRate: number;
    /** Average response time */
    averageResponseTime: number;
    /** Error rate percentage */
    errorRate: number;
    /** Cache hit rate percentage */
    cacheHitRate: number;
    /** Memory usage in MB */
    memoryUsage: number;
}
export interface ParlantServiceConfig {
    /** Parlant connection configuration */
    connection: ParlantConfig;
    /** Function wrapper configuration */
    wrapper: ParlantValidationConfig;
    /** Caching configuration */
    cache: ParlantCacheConfig;
    /** WebSocket configuration */
    websocket: ParlantWebSocketConfig;
    /** Authentication configuration */
    authentication: ParlantAuthConfig;
    /** Monitoring configuration */
    monitoring: ParlantMonitoringConfig;
}
export interface ParlantCacheConfig {
    /** Enable caching */
    enabled: boolean;
    /** Cache type */
    type: "memory" | "redis" | "hybrid";
    /** Default TTL in milliseconds */
    defaultTtl: number;
    /** Maximum cache size */
    maxSize: number;
    /** Cache eviction policy */
    evictionPolicy: "lru" | "fifo" | "ttl";
}
export interface ParlantWebSocketConfig {
    /** Enable WebSocket communication */
    enabled: boolean;
    /** Reconnection attempts */
    reconnectAttempts: number;
    /** Heartbeat interval in milliseconds */
    heartbeatInterval: number;
    /** Connection timeout in milliseconds */
    connectionTimeout: number;
}
export interface ParlantAuthConfig {
    /** JWT secret for token validation */
    jwtSecret: string;
    /** Token expiration time */
    tokenExpiration: string;
    /** Refresh token enabled */
    refreshTokenEnabled: boolean;
    /** Session duration in milliseconds */
    sessionDuration: number;
}
/**
 * Parlant Function Validation Decorator Configuration
 */
export interface ParlantDecoratorOptions {
    /** Human-readable description of the function */
    description: string;
    /** Required security level */
    securityLevel?: SecurityLevel;
    /** Enable caching for this function */
    cacheable?: boolean;
    /** Cache TTL override */
    cacheTtl?: number;
    /** Validation timeout override */
    timeout?: number;
    /** Custom validation logic */
    customValidator?: (_request: ParlantValidationRequest) => Promise<boolean>;
}
/**
 * Error types for Parlant Integration
 */
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
//# sourceMappingURL=parlant-integration.types.d.ts.map