/**
 * Validation Audit Logger Service
 *
 * Comprehensive audit logging for all validation activities across the enterprise.
 * Provides security event logging, performance monitoring, and compliance tracking.
 *
 * @fileoverview Validation audit logging service
 * @version 1.0.0
 * @author Enterprise Security Validation Team
 */

import { Injectable, Logger } from "@nestjs/common";
import {
  ThreatAnalysisResult,
  ValidationFailureContext,
  ValidationAuditEntry,
} from "./types";
import { ValidationSecurityLevel } from "../../pipes/validation.standardized";
import { generateEventId } from "../../utils/security.utils";

/**
 * Validation Audit Logger Service
 * Handles all validation audit logging and security event tracking
 */
@Injectable()
export class ValidationAuditLogger {
  private readonly logger = new Logger(ValidationAuditLogger.name);

  /**
   * Log a security threat detection event
   * @param threatAnalysis Threat analysis result
   */
  logSecurityThreat(threatAnalysis: ThreatAnalysisResult): Promise<void> {
    const logEntry: ValidationAuditEntry = {
      logId: generateEventId(),
      operationId: threatAnalysis.metadata.operationId,
      serviceType: threatAnalysis.metadata.serviceType,
      securityLevel: ValidationSecurityLevel.MAXIMUM,
      timestamp: new Date(),
      eventType: "security_threat",
      details: {
        processingTimeMs: threatAnalysis.metadata.analysisDurationMs,
        threatInfo: threatAnalysis,
      },
      severity: threatAnalysis.isHighRisk ? "critical" : "warn",
    };

    this.logger.warn(
      `Security threat detected: ${threatAnalysis.analysisId}`,
      logEntry,
    );
    return Promise.resolve();
  }

  /**
   * Log a validation failure event
   * @param context Validation failure context
   */
  logValidationFailure(context: ValidationFailureContext): Promise<void> {
    const logEntry: ValidationAuditEntry = {
      logId: generateEventId(),
      operationId: context.operationId,
      serviceType: context.serviceType,
      securityLevel: ValidationSecurityLevel.STANDARD,
      timestamp: new Date(),
      eventType: "validation_failure",
      details: {
        processingTimeMs: context.processingTimeMs,
        errorMessage: context.error.message,
        metadata: context.additionalContext,
      },
      severity: "error",
    };

    this.logger.error(`Validation failure: ${context.operationId}`, logEntry);
    return Promise.resolve();
  }
}

export default ValidationAuditLogger;
