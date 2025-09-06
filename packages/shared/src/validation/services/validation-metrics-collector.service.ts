/**
 * Validation Metrics Collector Service
 *
 * Collects and aggregates validation performance metrics across all services.
 * Provides real-time monitoring, alerting, and performance optimization insights.
 *
 * @fileoverview Validation metrics collection service
 * @version 1.0.0
 * @author Enterprise Security Validation Team
 */

import { Injectable, Logger } from "@nestjs/common";
import { ValidationSuccessMetrics, ValidationFailureMetrics } from "./types";

/**
 * Validation Metrics Collector Service
 * Handles all validation performance metrics and monitoring
 */
@Injectable()
export class ValidationMetricsCollector {
  private readonly logger = new Logger(ValidationMetricsCollector.name);

  /**
   * Record a successful validation event
   * @param metrics Success metrics
   */
  recordValidationSuccess(metrics: ValidationSuccessMetrics): void {
    this.logger.debug(`Validation success recorded: ${metrics.operationId}`, {
      serviceType: metrics.serviceType,
      processingTime: metrics.processingTimeMs,
      inputSize: metrics.inputSize,
      riskScore: metrics.threatRiskScore,
    });
  }

  /**
   * Record a validation failure event
   * @param metrics Failure metrics
   */
  recordValidationFailure(metrics: ValidationFailureMetrics): void {
    this.logger.warn(`Validation failure recorded: ${metrics.operationId}`, {
      serviceType: metrics.serviceType,
      errorType: metrics.errorType,
      processingTime: metrics.processingTimeMs,
    });
  }

  /**
   * Record a cache hit event
   * @param operationId Operation identifier
   */
  recordCacheHit(operationId: string): void {
    this.logger.debug(`Cache hit recorded: ${operationId}`);
  }

  /**
   * Record a cache miss event
   * @param operationId Operation identifier
   */
  recordCacheMiss(operationId: string): void {
    this.logger.debug(`Cache miss recorded: ${operationId}`);
  }
}

export default ValidationMetricsCollector;
