/**
 * Local Parlant types to avoid rootDir issues in monorepo setup
 */

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

export enum SecurityLevel {
  _MINIMAL = "minimal",
  _LOW = "low",
  _MEDIUM = "medium",
  _HIGH = "high",
  _CRITICAL = "critical",
}

export class ParlantIntegrationError extends Error {
  constructor(
    message: string,
    public readonly _code: string,
    public readonly _details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ParlantIntegrationError";
  }
}

export class ParlantValidationError extends ParlantIntegrationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ParlantValidationError";
  }
}

export class ParlantTimeoutError extends ParlantIntegrationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "TIMEOUT_ERROR", details);
    this.name = "ParlantTimeoutError";
  }
}