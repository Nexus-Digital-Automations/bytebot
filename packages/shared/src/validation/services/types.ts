/**
 * Enterprise Validation Types and Interfaces
 *
 * Comprehensive type definitions for the enterprise validation system
 * used across all Bytebot services for input validation and security.
 *
 * @fileoverview Enterprise validation type definitions
 * @version 1.0.0
 * @author Enterprise Security Validation Team
 */

import { ArgumentMetadata } from '@nestjs/common';
import { ValidationServiceType, ValidationSecurityLevel } from '../../pipes/validation.standardized';

/**
 * Threat analysis result from security detection
 */
export interface ThreatAnalysisResult {
  /** Unique analysis identifier */
  analysisId: string;
  
  /** Whether this is considered a high-risk threat */
  isHighRisk: boolean;
  
  /** Risk score from 0-100 */
  riskScore: number;
  
  /** Types of threats detected */
  threatTypes: string[];
  
  /** Detailed threat information */
  threatDetails: {
    pattern?: string;
    location?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    description: string;
  }[];
  
  /** Analysis metadata */
  metadata: {
    serviceType: ValidationServiceType;
    environment: string;
    operationId: string;
    timestamp: Date;
    analysisDurationMs: number;
  };
}

/**
 * Validation success metrics
 */
export interface ValidationSuccessMetrics {
  /** Operation tracking identifier */
  operationId: string;
  
  /** Service type being validated */
  serviceType: ValidationServiceType;
  
  /** Processing time in milliseconds */
  processingTimeMs: number;
  
  /** Input payload size in bytes */
  inputSize: number;
  
  /** Threat risk score for the input */
  threatRiskScore: number;
  
  /** Optional additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Validation failure metrics
 */
export interface ValidationFailureMetrics {
  /** Operation tracking identifier */
  operationId: string;
  
  /** Service type being validated */
  serviceType: ValidationServiceType;
  
  /** Type of error that occurred */
  errorType: string;
  
  /** Processing time in milliseconds */
  processingTimeMs: number;
  
  /** Optional additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Validation audit log entry
 */
export interface ValidationAuditEntry {
  /** Unique log entry identifier */
  logId: string;
  
  /** Operation tracking identifier */
  operationId: string;
  
  /** Service type being validated */
  serviceType: ValidationServiceType;
  
  /** Security level used for validation */
  securityLevel: ValidationSecurityLevel;
  
  /** Timestamp of the event */
  timestamp: Date;
  
  /** Type of audit event */
  eventType: 'validation_success' | 'validation_failure' | 'security_threat' | 'performance_anomaly';
  
  /** Event details */
  details: {
    inputHash?: string;
    processingTimeMs: number;
    errorMessage?: string;
    threatInfo?: ThreatAnalysisResult;
    metadata?: Record<string, unknown>;
  };
  
  /** Severity level for alerting */
  severity: 'info' | 'warn' | 'error' | 'critical';
}

/**
 * Validation cache entry
 */
export interface ValidationCacheEntry {
  /** Unique cache key */
  cacheKey: string;
  
  /** Hash of the input value */
  inputHash: string;
  
  /** Cached validation result */
  validationResult: unknown;
  
  /** Cache creation timestamp */
  createdAt: Date;
  
  /** Cache expiration timestamp */
  expiresAt: Date;
  
  /** Number of times this cache entry has been accessed */
  accessCount: number;
  
  /** Service type that created this cache entry */
  serviceType: ValidationServiceType;
  
  /** Security level used for validation */
  securityLevel: ValidationSecurityLevel;
}

/**
 * Validation profile configuration
 */
export interface ValidationProfile {
  /** Profile identifier */
  profileId: string;
  
  /** Service type this profile is for */
  serviceType: ValidationServiceType;
  
  /** Environment this profile applies to */
  environment: string;
  
  /** Security level for this profile */
  securityLevel: ValidationSecurityLevel;
  
  /** Profile configuration options */
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
  
  /** Profile metadata */
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: string;
    description: string;
  };
}

/**
 * Security threat context for analysis
 */
export interface SecurityThreatContext {
  /** Service type being analyzed */
  serviceType: ValidationServiceType;
  
  /** Environment context */
  environment: string;
  
  /** Operation tracking identifier */
  operationId: string;
  
  /** Optional user context */
  userContext?: {
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  
  /** Optional request context */
  requestContext?: {
    method: string;
    path: string;
    headers?: Record<string, string>;
  };
}

/**
 * Validation failure log context
 */
export interface ValidationFailureContext {
  /** Operation tracking identifier */
  operationId: string;
  
  /** Service type being validated */
  serviceType: ValidationServiceType;
  
  /** Error that occurred */
  error: Error;
  
  /** Input value that failed validation */
  inputValue: unknown;
  
  /** NestJS argument metadata */
  metadata: ArgumentMetadata;
  
  /** Processing time in milliseconds */
  processingTimeMs: number;
  
  /** Optional additional context */
  additionalContext?: Record<string, unknown>;
}

/**
 * Performance monitoring metrics
 */
export interface ValidationPerformanceMetrics {
  /** Service type */
  serviceType: ValidationServiceType;
  
  /** Environment */
  environment: string;
  
  /** Time period for metrics */
  period: {
    startTime: Date;
    endTime: Date;
  };
  
  /** Validation statistics */
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
  
  /** Performance alerts */
  alerts: Array<{
    alertType: 'high_latency' | 'high_failure_rate' | 'cache_miss_spike' | 'threat_spike';
    severity: 'warning' | 'critical';
    message: string;
    triggeredAt: Date;
  }>;
}

/**
 * Configuration for custom validation rules
 */
export interface CustomValidationRule {
  /** Rule identifier */
  ruleId: string;
  
  /** Rule name */
  name: string;
  
  /** Rule description */
  description: string;
  
  /** Rule category */
  category: 'security' | 'business' | 'performance' | 'compliance';
  
  /** Rule priority (higher number = higher priority) */
  priority: number;
  
  /** Rule validation function */
  validator: (value: unknown, context: Record<string, unknown>) => boolean | Promise<boolean>;
  
  /** Error message for rule violation */
  errorMessage: string;
  
  /** Whether rule is enabled */
  enabled: boolean;
  
  /** Service types this rule applies to */
  applicableServices: ValidationServiceType[];
  
  /** Environments this rule applies to */
  applicableEnvironments: string[];
}

export default {
  ThreatAnalysisResult,
  ValidationSuccessMetrics,
  ValidationFailureMetrics,
  ValidationAuditEntry,
  ValidationCacheEntry,
  ValidationProfile,
  SecurityThreatContext,
  ValidationFailureContext,
  ValidationPerformanceMetrics,
  CustomValidationRule,
};