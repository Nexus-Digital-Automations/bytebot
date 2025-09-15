import { ArgumentMetadata } from "@nestjs/common";
import {
  ValidationServiceType,
  ValidationSecurityLevel,
} from "../../pipes/validation.standardized";
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors?: readonly string[];
  readonly sanitizedData?: unknown;
  readonly timestamp: Date;
}
export type TypedRecord<T = unknown> = {
  readonly [_K in string]?: T;
};
export interface SecurityValidationResult {
  readonly isValid: boolean;
  readonly data?: unknown;
  readonly errors?: readonly string[];
  readonly threats?: readonly ThreatInfo[];
}
export interface ThreatInfo {
  readonly type: string;
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly description: string;
  readonly confidence: number;
}
export interface ThreatAnalysisResult {
  analysisId: string;
  isHighRisk: boolean;
  riskScore: number;
  threatTypes: string[];
  threatDetails: {
    pattern?: string;
    location?: string;
    severity: "low" | "medium" | "high" | "critical";
    confidence: number;
    description: string;
  }[];
  metadata: {
    serviceType: ValidationServiceType;
    environment: string;
    operationId: string;
    timestamp: Date;
    analysisDurationMs: number;
  };
}
export interface ValidationSuccessMetrics {
  operationId: string;
  serviceType: ValidationServiceType;
  processingTimeMs: number;
  inputSize: number;
  threatRiskScore: number;
  metadata?: TypedRecord;
}
export interface ValidationFailureMetrics {
  operationId: string;
  serviceType: ValidationServiceType;
  errorType: string;
  processingTimeMs: number;
  metadata?: TypedRecord;
}
export interface ValidationAuditEntry {
  logId: string;
  operationId: string;
  serviceType: ValidationServiceType;
  securityLevel: ValidationSecurityLevel;
  timestamp: Date;
  eventType:
    | "validation_success"
    | "validation_failure"
    | "security_threat"
    | "performance_anomaly";
  details: {
    inputHash?: string;
    processingTimeMs: number;
    errorMessage?: string;
    threatInfo?: ThreatAnalysisResult;
    metadata?: Record<string, unknown>;
  };
  severity: "info" | "warn" | "error" | "critical";
}
export interface ValidationCacheEntry {
  cacheKey: string;
  inputHash: string;
  validationResult: ValidationResult;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  serviceType: ValidationServiceType;
  securityLevel: ValidationSecurityLevel;
}
export interface ValidationProfile {
  profileId: string;
  serviceType: ValidationServiceType;
  environment: string;
  securityLevel: ValidationSecurityLevel;
  config: {
    transform: boolean;
    whitelist: boolean;
    forbidNonWhitelisted: boolean;
    enableSanitization: boolean;
    enableThreatDetection: boolean;
    maxPayloadSize: number;
    validationTimeout: number;
    customRules: Record<string, unknown>;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: string;
    description: string;
  };
}
export interface SecurityThreatContext {
  serviceType: ValidationServiceType;
  environment: string;
  operationId: string;
  userContext?: {
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  requestContext?: {
    method: string;
    path: string;
    headers?: Record<string, string>;
  };
}
export interface ValidationFailureContext {
  operationId: string;
  serviceType: ValidationServiceType;
  error: Error;
  inputValue: unknown;
  metadata: ArgumentMetadata;
  processingTimeMs: number;
  additionalContext?: Record<string, unknown>;
}
export interface ValidationPerformanceMetrics {
  serviceType: ValidationServiceType;
  environment: string;
  period: {
    startTime: Date;
    endTime: Date;
  };
  stats: {
    totalValidations: number;
    successfulValidations: number;
    failedValidations: number;
    averageProcessingTimeMs: number;
    maxProcessingTimeMs: number;
    minProcessingTimeMs: number;
    cacheHitRate: number;
    threatDetectionRate: number;
  };
  alerts: Array<{
    alertType:
      | "high_latency"
      | "high_failure_rate"
      | "cache_miss_spike"
      | "threat_spike";
    severity: "warning" | "critical";
    message: string;
    triggeredAt: Date;
  }>;
}
export interface CustomValidationRule {
  ruleId: string;
  name: string;
  description: string;
  category: "security" | "business" | "performance" | "compliance";
  priority: number;
  validator: <TValue = unknown, TContext extends TypedRecord = TypedRecord>(
    _value: TValue,
    _context: TContext,
  ) => boolean | Promise<boolean>;
  errorMessage: string;
  enabled: boolean;
  applicableServices: ValidationServiceType[];
  applicableEnvironments: string[];
}
export declare const ValidationTypeNames: {
  readonly ThreatAnalysisResult: "ThreatAnalysisResult";
  readonly ValidationSuccessMetrics: "ValidationSuccessMetrics";
  readonly ValidationFailureMetrics: "ValidationFailureMetrics";
  readonly ValidationAuditEntry: "ValidationAuditEntry";
  readonly ValidationCacheEntry: "ValidationCacheEntry";
  readonly ValidationProfile: "ValidationProfile";
  readonly SecurityThreatContext: "SecurityThreatContext";
  readonly ValidationFailureContext: "ValidationFailureContext";
  readonly ValidationPerformanceMetrics: "ValidationPerformanceMetrics";
  readonly CustomValidationRule: "CustomValidationRule";
};
export default ValidationTypeNames;
//# sourceMappingURL=types.d.ts.map
