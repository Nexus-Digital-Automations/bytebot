/**
 * Enhanced Security Service - Comprehensive XSS Protection & Content Sanitization
 *
 * This service provides enterprise-grade XSS protection, content sanitization,
 * and file security scanning with real-time threat detection and monitoring.
 *
 * @fileoverview Enhanced security service with comprehensive protection
 * @version 2.0.0
 * @author Security & Content Sanitization Specialist
 */

import { Injectable, Logger } from "@nestjs/common";
import {
  detectAdvancedXSS,
  sanitizeContentByContext,
  scanFileContent,
  generateCSPHeader,
  ENHANCED_DOMPURIFY_CONFIGS,
  createSecurityEvent,
  SecurityEventType,
} from "../utils/security.utils";
import { SanitizationOptions } from "../types/security.types";

/**
 * Security monitoring metrics
 */
interface SecurityMetrics {
  totalRequestsProcessed: number;
  xssAttemptsBlocked: number;
  fileThreatsBlocked: number;
  contentSanitized: number;
  averageProcessingTime: number;
  lastThreatDetected: Date | null;
  threatsByType: Record<string, number>;
}

/**
 * Content sanitization result
 */
export interface ContentSanitizationResult {
  sanitized: string;
  originalLength: number;
  finalLength: number;
  threatsRemoved: string[];
  riskScore: number;
  processingTime: number;
  context: string;
  safe: boolean;
}

/**
 * File security scan result
 */
export interface FileScanResult {
  filename?: string;
  isSafe: boolean;
  threats: string[];
  riskScore: number;
  metadata: {
    fileSize: number;
    contentType?: string;
    encoding?: string;
  };
  processingTime: number;
  recommendations: string[];
}

@Injectable()
export class EnhancedSecurityService {
  private readonly logger = new Logger(EnhancedSecurityService.name);
  private readonly metrics: SecurityMetrics = {
    totalRequestsProcessed: 0,
    xssAttemptsBlocked: 0,
    fileThreatsBlocked: 0,
    contentSanitized: 0,
    averageProcessingTime: 0,
    lastThreatDetected: null,
    threatsByType: {},
  };

  constructor() {
    this.logger.log(
      "Enhanced Security Service initialized with comprehensive XSS protection",
    );
  }

  /**
   * Sanitize content with context-aware protection
   */
  async sanitizeContent(
    content: string,
    context:
      | "task_description"
      | "message_content"
      | "search_query"
      | "file_name"
      | "config_data"
      | "user_input",
    options?: Partial<SanitizationOptions>,
  ): Promise<ContentSanitizationResult> {
    const startTime = Date.now();
    const operationId = `sanitize-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.logger.debug(`[${operationId}] Starting content sanitization`, {
      operationId,
      context,
      contentLength: content?.length || 0,
      hasOptions: !!options,
    });

    try {
      this.metrics.totalRequestsProcessed++;

      if (!content || typeof content !== "string") {
        return {
          sanitized: "",
          originalLength: 0,
          finalLength: 0,
          threatsRemoved: [],
          riskScore: 0,
          processingTime: 0,
          context,
          safe: true,
        };
      }

      // Perform advanced XSS detection
      const xssAnalysis = detectAdvancedXSS(content);

      if (xssAnalysis.hasXSS) {
        this.metrics.xssAttemptsBlocked++;
        this.metrics.lastThreatDetected = new Date();

        // Update threat metrics
        xssAnalysis.threats.forEach((threat) => {
          this.metrics.threatsByType[threat] =
            (this.metrics.threatsByType[threat] || 0) + 1;
        });

        this.logger.warn(`[${operationId}] XSS threats detected`, {
          operationId,
          context,
          threats: xssAnalysis.threats,
          riskScore: xssAnalysis.riskScore,
          contentPreview: content.substring(0, 100) + "...",
        });
      }

      // Perform context-aware sanitization
      const sanitizationResult = sanitizeContentByContext(
        content,
        context,
        options,
      );

      if (sanitizationResult.removed.length > 0) {
        this.metrics.contentSanitized++;

        this.logger.info(`[${operationId}] Content sanitized`, {
          operationId,
          context,
          threatsRemoved: sanitizationResult.removed,
          originalLength: content.length,
          finalLength: sanitizationResult.sanitized.length,
          riskScore: sanitizationResult.riskScore,
        });
      }

      const processingTime = Date.now() - startTime;
      this.updateAverageProcessingTime(processingTime);

      const result: ContentSanitizationResult = {
        sanitized: sanitizationResult.sanitized,
        originalLength: content.length,
        finalLength: sanitizationResult.sanitized.length,
        threatsRemoved: sanitizationResult.removed,
        riskScore: sanitizationResult.riskScore,
        processingTime,
        context,
        safe: sanitizationResult.riskScore <= 3, // Safe if risk score is low
      };

      this.logger.debug(`[${operationId}] Content sanitization completed`, {
        operationId,
        processingTimeMs: processingTime,
        safe: result.safe,
        threatsRemoved: result.threatsRemoved.length,
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] Content sanitization failed`, {
        operationId,
        error: error.message,
        context,
        processingTimeMs: processingTime,
      });

      throw new Error(`Content sanitization failed: ${error.message}`);
    }
  }

  /**
   * Scan file content for security threats
   */
  async scanFile(
    content: string | Buffer,
    fileName?: string,
    mimeType?: string,
  ): Promise<FileScanResult> {
    const startTime = Date.now();
    const operationId = `scan-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.logger.debug(`[${operationId}] Starting file security scan`, {
      operationId,
      fileName,
      mimeType,
      contentSize: Buffer.isBuffer(content) ? content.length : content.length,
    });

    try {
      this.metrics.totalRequestsProcessed++;

      const scanResult = scanFileContent(content, fileName, mimeType);
      const processingTime = Date.now() - startTime;

      if (!scanResult.isSafe) {
        this.metrics.fileThreatsBlocked++;
        this.metrics.lastThreatDetected = new Date();

        // Update threat metrics
        scanResult.threats.forEach((threat) => {
          this.metrics.threatsByType[threat] =
            (this.metrics.threatsByType[threat] || 0) + 1;
        });

        this.logger.warn(`[${operationId}] File security threats detected`, {
          operationId,
          fileName,
          threats: scanResult.threats,
          riskScore: scanResult.riskScore,
          fileSize: scanResult.metadata.fileSize,
        });
      }

      // Generate security recommendations
      const recommendations =
        this.generateFileSecurityRecommendations(scanResult);

      const result: FileScanResult = {
        filename: fileName,
        isSafe: scanResult.isSafe,
        threats: scanResult.threats,
        riskScore: scanResult.riskScore,
        metadata: scanResult.metadata,
        processingTime,
        recommendations,
      };

      this.updateAverageProcessingTime(processingTime);

      this.logger.debug(`[${operationId}] File security scan completed`, {
        operationId,
        safe: result.isSafe,
        threatsFound: result.threats.length,
        processingTimeMs: processingTime,
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] File security scan failed`, {
        operationId,
        fileName,
        error: error.message,
        processingTimeMs: processingTime,
      });

      throw new Error(`File security scan failed: ${error.message}`);
    }
  }

  /**
   * Generate Content Security Policy header
   */
  generateCSP(context: "api" | "ui" | "admin", nonce?: string): string {
    let csp = generateCSPHeader(context);

    if (nonce && context === "admin") {
      csp = csp.replace(/\{nonce\}/g, nonce);
    }

    return csp;
  }

  /**
   * Validate multiple content items in batch
   */
  async batchSanitize(
    items: Array<{
      content: string;
      context:
        | "task_description"
        | "message_content"
        | "search_query"
        | "file_name"
        | "config_data"
        | "user_input";
      options?: Partial<SanitizationOptions>;
    }>,
  ): Promise<ContentSanitizationResult[]> {
    const operationId = `batch-sanitize-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Starting batch sanitization`, {
      operationId,
      itemCount: items.length,
    });

    try {
      const results = await Promise.all(
        items.map((item) =>
          this.sanitizeContent(item.content, item.context, item.options),
        ),
      );

      const processingTime = Date.now() - startTime;
      const totalThreats = results.reduce(
        (sum, result) => sum + result.threatsRemoved.length,
        0,
      );
      const unsafeItems = results.filter((result) => !result.safe).length;

      this.logger.debug(`[${operationId}] Batch sanitization completed`, {
        operationId,
        itemCount: items.length,
        totalThreats,
        unsafeItems,
        processingTimeMs: processingTime,
      });

      return results;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] Batch sanitization failed`, {
        operationId,
        itemCount: items.length,
        error: error.message,
        processingTimeMs: processingTime,
      });

      throw error;
    }
  }

  /**
   * Create security event for audit trail
   */
  createSecurityEvent(
    type: SecurityEventType,
    resource: string,
    method: string,
    success: boolean,
    message: string,
    metadata?: Record<string, any>,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string,
  ) {
    return createSecurityEvent(
      type,
      resource,
      method,
      success,
      message,
      {
        ...metadata,
        serviceVersion: "2.0.0",
        enhancedSecurityService: true,
      },
      userId,
      ipAddress,
      userAgent,
      sessionId,
    );
  }

  /**
   * Get current security metrics
   */
  getSecurityMetrics(): SecurityMetrics & {
    uptime: number;
    version: string;
    threatDetectionRate: number;
  } {
    const totalProcessed = this.metrics.totalRequestsProcessed;
    const totalThreats =
      this.metrics.xssAttemptsBlocked + this.metrics.fileThreatsBlocked;

    return {
      ...this.metrics,
      uptime: process.uptime(),
      version: "2.0.0",
      threatDetectionRate:
        totalProcessed > 0 ? (totalThreats / totalProcessed) * 100 : 0,
    };
  }

  /**
   * Reset security metrics (for testing or maintenance)
   */
  resetMetrics(): void {
    Object.assign(this.metrics, {
      totalRequestsProcessed: 0,
      xssAttemptsBlocked: 0,
      fileThreatsBlocked: 0,
      contentSanitized: 0,
      averageProcessingTime: 0,
      lastThreatDetected: null,
      threatsByType: {},
    });

    this.logger.log("Security metrics reset");
  }

  /**
   * Get DOMPurify configurations
   */
  getDOMPurifyConfigs() {
    return ENHANCED_DOMPURIFY_CONFIGS;
  }

  /**
   * Private helper methods
   */
  private updateAverageProcessingTime(processingTime: number): void {
    const currentAverage = this.metrics.averageProcessingTime;
    const totalProcessed = this.metrics.totalRequestsProcessed;

    this.metrics.averageProcessingTime =
      (currentAverage * (totalProcessed - 1) + processingTime) / totalProcessed;
  }

  private generateFileSecurityRecommendations(scanResult: {
    isSafe: boolean;
    threats: string[];
    riskScore: number;
    metadata: { fileSize: number; contentType?: string; encoding?: string };
  }): string[] {
    const recommendations: string[] = [];

    if (!scanResult.isSafe) {
      recommendations.push(
        "🚨 File contains security threats - consider rejecting upload",
      );

      if (
        scanResult.threats.includes("Windows PE Executable") ||
        scanResult.threats.includes("Linux ELF Executable")
      ) {
        recommendations.push(
          "❌ Executable files should be blocked completely",
        );
      }

      if (scanResult.threats.some((t) => t.includes("Script"))) {
        recommendations.push(
          "⚠️ Script content detected - sanitize or reject if not expected",
        );
      }

      if (scanResult.threats.some((t) => t.includes("XSS"))) {
        recommendations.push(
          "🔒 XSS patterns found - apply additional sanitization",
        );
      }

      if (scanResult.riskScore >= 8) {
        recommendations.push(
          "🔥 High risk score - immediate manual review recommended",
        );
      }
    }

    if (scanResult.metadata.fileSize > 5 * 1024 * 1024) {
      recommendations.push(
        "📏 Large file size - consider size limits for uploads",
      );
    }

    if (!scanResult.metadata.contentType) {
      recommendations.push(
        "🏷️ Missing content type - validate file type before processing",
      );
    }

    if (scanResult.isSafe && scanResult.riskScore === 0) {
      recommendations.push("✅ File appears safe for processing");
    }

    return recommendations;
  }
}

export default EnhancedSecurityService;
