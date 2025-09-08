/**
 * Critical Area Sanitization Interceptor - Automatic XSS Protection for High-Risk Endpoints
 *
 * This interceptor automatically applies specialized sanitization to request data for endpoints
 * that handle critical areas of the Bytebot platform. It integrates seamlessly with NestJS
 * request/response lifecycle to provide transparent security without requiring code changes
 * in existing controllers.
 *
 * Key Features:
 * - Automatic detection of critical area data types
 * - Specialized sanitization rules per data type
 * - Performance monitoring and threat reporting
 * - Configurable security levels per endpoint
 * - Comprehensive logging and alerting
 *
 * @fileoverview Automatic XSS protection interceptor for critical areas
 * @version 2.0.0
 * @author Critical Security Automation Specialist
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, tap } from "rxjs";
import { Request, Response } from "express";
import { CriticalAreaSanitizationService } from "../services/critical-area-sanitization.service";
// Import types conditionally to avoid compilation issues
// import {
//   CreateTaskDto,
//   UpdateTaskDto,
//   TaskSearchDto,
//   TaskCommentDto,
// } from "../dto/task-validation.dto";
import { MessageContentBlock } from "../types/messageContent.types";

// Define minimal types to avoid DTO compilation issues
interface CreateTaskDto {
  title: string;
  description?: string;
  tags?: string[];
  [key: string]: any;
}

interface UpdateTaskDto {
  title?: string;
  description?: string;
  tags?: string[];
  status?: string;
  [key: string]: any;
}

interface TaskSearchDto {
  query?: string;
  assignedTo?: string;
  tags?: string[];
  statuses?: string[];
  categories?: string[];
  [key: string]: any;
}

interface TaskCommentDto {
  content: string;
  [key: string]: any;
}

/**
 * Metadata key for critical area sanitization configuration
 */
export const CRITICAL_AREA_SANITIZATION_KEY = "critical_area_sanitization";

/**
 * Critical area types for automatic detection
 */
export enum CriticalAreaType {
  TASK_DATA = "task_data",
  MESSAGE_CONTENT = "message_content",
  CONFIGURATION_DATA = "configuration_data",
  SEARCH_QUERY = "search_query",
  FILE_DATA = "file_data",
  USER_INPUT = "user_input",
  AUTO_DETECT = "auto_detect", // Automatically detect based on request data
}

/**
 * Sanitization configuration options
 */
export interface CriticalAreaSanitizationConfig {
  /** Type of critical area to sanitize */
  areaType: CriticalAreaType;

  /** Security level: strict, moderate, lenient */
  securityLevel?: "strict" | "moderate" | "lenient";

  /** Fields to sanitize (for auto-detection) */
  targetFields?: string[];

  /** Fields to exclude from sanitization */
  excludeFields?: string[];

  /** Whether to log sanitization events */
  enableLogging?: boolean;

  /** Whether to block requests with high risk scores */
  blockHighRisk?: boolean;

  /** Risk threshold for blocking (0-100) */
  riskThreshold?: number;
}

/**
 * Decorator to apply critical area sanitization to endpoints
 */
export const CriticalAreaSanitization = (
  config: CriticalAreaSanitizationConfig,
) => Reflect.metadata(CRITICAL_AREA_SANITIZATION_KEY, config);

/**
 * Sanitization processing result
 */
interface SanitizationProcessingResult {
  /** Original request data */
  originalData: any;

  /** Sanitized request data */
  sanitizedData: any;

  /** Whether data was modified */
  wasModified: boolean;

  /** Total threats detected */
  threatsDetected: number;

  /** Overall risk score */
  riskScore: number;

  /** Processing time in milliseconds */
  processingTimeMs: number;

  /** Area type processed */
  areaType: CriticalAreaType;

  /** Security level used */
  securityLevel: string;
}

@Injectable()
export class CriticalAreaSanitizationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(
    CriticalAreaSanitizationInterceptor.name,
  );

  constructor(
    private readonly reflector: Reflector,
    @Inject(CriticalAreaSanitizationService)
    private readonly sanitizationService: CriticalAreaSanitizationService,
  ) {
    this.logger.log("Critical area sanitization interceptor initialized", {
      serviceType: "automatic-xss-protection",
      availableAreaTypes: Object.values(CriticalAreaType),
    });
  }

  /**
   * Intercept requests and apply critical area sanitization
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const operationId = `sanitize-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get sanitization configuration from decorator
    const config = this.getSanitizationConfig(context);

    if (!config) {
      // No sanitization configured for this endpoint
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    this.logger.debug(`[${operationId}] Starting critical area sanitization`, {
      operationId,
      method: request.method,
      url: request.url,
      areaType: config.areaType,
      securityLevel: config.securityLevel || "moderate",
      hasBody: !!request.body,
      bodySize: request.body ? JSON.stringify(request.body).length : 0,
    });

    // Apply sanitization based on configuration
    return new Observable((observer) => {
      this.applySanitization(request, config, operationId).then(
        (result) => {
          if (result.wasModified) {
            // Update request body with sanitized data
            request.body = result.sanitizedData;

            // Add sanitization headers
            response.setHeader("X-Sanitization-Applied", "true");
            response.setHeader(
              "X-Sanitization-Threats",
              result.threatsDetected.toString(),
            );
            response.setHeader(
              "X-Sanitization-Risk-Score",
              result.riskScore.toString(),
            );
            response.setHeader(
              "X-Sanitization-Processing-Time",
              result.processingTimeMs.toString(),
            );

            this.logger.debug(
              `[${operationId}] Sanitization applied successfully`,
              {
                operationId,
                areaType: result.areaType,
                threatsDetected: result.threatsDetected,
                riskScore: result.riskScore,
                processingTimeMs: result.processingTimeMs,
                dataModified: result.wasModified,
              },
            );

            // Block high-risk requests if configured
            if (
              config.blockHighRisk &&
              result.riskScore >= (config.riskThreshold || 80)
            ) {
              this.logger.warn(`[${operationId}] Blocking high-risk request`, {
                operationId,
                riskScore: result.riskScore,
                riskThreshold: config.riskThreshold || 80,
                threatsDetected: result.threatsDetected,
              });

              response.status(403).json({
                statusCode: 403,
                message: "Request blocked due to high security risk",
                error: "Forbidden",
                riskScore: result.riskScore,
                threatsDetected: result.threatsDetected,
                operationId,
              });

              observer.complete();
              return;
            }
          }

          // Continue with the original request
          next
            .handle()
            .pipe(
              tap(() => {
                const totalTime = Date.now() - startTime;

                if (config.enableLogging !== false) {
                  this.logger.debug(
                    `[${operationId}] Critical area sanitization completed`,
                    {
                      operationId,
                      totalProcessingTimeMs: totalTime,
                      sanitizationTimeMs: result.processingTimeMs,
                      overheadMs: totalTime - result.processingTimeMs,
                      success: true,
                    },
                  );
                }
              }),
            )
            .subscribe(observer);
        },
        (error) => {
          this.logger.error(`[${operationId}] Sanitization failed`, {
            operationId,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue with original request on error
          next.handle().subscribe(observer);
        },
      );
    });
  }

  /**
   * Get sanitization configuration from method or class decorator
   */
  private getSanitizationConfig(
    context: ExecutionContext,
  ): CriticalAreaSanitizationConfig | null {
    // Check method-level decorator first
    const methodConfig = this.reflector.get<CriticalAreaSanitizationConfig>(
      CRITICAL_AREA_SANITIZATION_KEY,
      context.getHandler(),
    );

    if (methodConfig) {
      return methodConfig;
    }

    // Check class-level decorator
    const classConfig = this.reflector.get<CriticalAreaSanitizationConfig>(
      CRITICAL_AREA_SANITIZATION_KEY,
      context.getClass(),
    );

    if (classConfig) {
      return classConfig;
    }

    // Auto-detect based on endpoint path
    const request = context.switchToHttp().getRequest<Request>();
    return this.autoDetectCriticalArea(request);
  }

  /**
   * Auto-detect critical area type based on request characteristics
   */
  private autoDetectCriticalArea(
    request: Request,
  ): CriticalAreaSanitizationConfig | null {
    const url = request.url.toLowerCase();
    const method = request.method.toUpperCase();

    // Task management endpoints
    if (url.includes("/tasks") || url.includes("/task")) {
      if (method === "GET" && (url.includes("/search") || url.includes("?"))) {
        return {
          areaType: CriticalAreaType.SEARCH_QUERY,
          securityLevel: "moderate",
          enableLogging: true,
        };
      } else if (method === "POST" || method === "PUT" || method === "PATCH") {
        return {
          areaType: CriticalAreaType.TASK_DATA,
          securityLevel: "strict",
          enableLogging: true,
        };
      }
    }

    // Message endpoints
    if (url.includes("/messages") || url.includes("/message")) {
      return {
        areaType: CriticalAreaType.MESSAGE_CONTENT,
        securityLevel: "strict",
        enableLogging: true,
      };
    }

    // Configuration endpoints
    if (url.includes("/config") || url.includes("/settings")) {
      return {
        areaType: CriticalAreaType.CONFIGURATION_DATA,
        securityLevel: "strict",
        enableLogging: true,
        blockHighRisk: true,
        riskThreshold: 70,
      };
    }

    // File upload/management endpoints
    if (
      url.includes("/files") ||
      url.includes("/upload") ||
      url.includes("/file")
    ) {
      return {
        areaType: CriticalAreaType.FILE_DATA,
        securityLevel: "strict",
        enableLogging: true,
        blockHighRisk: true,
        riskThreshold: 75,
      };
    }

    // Generic user input for other POST/PUT/PATCH endpoints
    if (["POST", "PUT", "PATCH"].includes(method) && request.body) {
      return {
        areaType: CriticalAreaType.USER_INPUT,
        securityLevel: "moderate",
        enableLogging: false, // Reduce noise for generic endpoints
      };
    }

    return null; // No sanitization needed
  }

  /**
   * Apply sanitization based on area type and configuration
   */
  private async applySanitization(
    request: Request,
    config: CriticalAreaSanitizationConfig,
    operationId: string,
  ): Promise<SanitizationProcessingResult> {
    const startTime = Date.now();

    try {
      let result:
        | import("../services/critical-area-sanitization.service").SanitizationResult
        | import("../services/critical-area-sanitization.service").MessageContentSanitizationResult
        | import("../services/critical-area-sanitization.service").FileDataSanitizationResult
        | import("../services/critical-area-sanitization.service").ConfigurationDataSanitizationResult;
      let sanitizedData = request.body;
      let threatsDetected = 0;
      let riskScore = 0;
      let wasModified = false;

      switch (config.areaType) {
        case CriticalAreaType.TASK_DATA:
          result = await this.sanitizeTaskData(request.body, operationId);
          // Type-safe property access for SanitizationResult
          if (this.isSanitizationResult(result)) {
            sanitizedData = result.sanitized;
            threatsDetected = result.totalThreats;
            riskScore = this.calculateRiskScore(result.overallRisk);
            wasModified =
              JSON.stringify(request.body) !== JSON.stringify(sanitizedData);
          }
          break;

        case CriticalAreaType.MESSAGE_CONTENT:
          result = await this.sanitizeMessageContent(request.body, operationId);
          // Type-safe property access for MessageContentSanitizationResult
          if (this.isMessageContentSanitizationResult(result)) {
            sanitizedData = { ...request.body, content: result.sanitized };
            threatsDetected = result.blockResults.reduce(
              (total, block) => total + block.threatsDetected.length,
              0,
            );
            riskScore = 100 - result.safetyScore;
            wasModified =
              JSON.stringify(request.body.content) !==
              JSON.stringify(result.sanitized);
          }
          break;

        case CriticalAreaType.SEARCH_QUERY:
          result = await this.sanitizeSearchQuery(request.body, operationId);
          // Type-safe property access for SanitizationResult
          if (this.isSanitizationResult(result)) {
            sanitizedData = result.sanitized;
            threatsDetected = result.totalThreats;
            riskScore = this.calculateRiskScore(result.overallRisk);
            wasModified =
              JSON.stringify(request.body) !== JSON.stringify(sanitizedData);
          }
          break;

        case CriticalAreaType.CONFIGURATION_DATA:
          result = await this.sanitizationService.sanitizeConfigurationData(
            request.body,
            operationId,
          );
          // Type-safe property access for ConfigurationDataSanitizationResult
          if (this.isConfigurationDataSanitizationResult(result)) {
            sanitizedData = result.sanitized;
            threatsDetected = result.blockedConfigurations.length;
            const riskValues = Object.values(result.keyRiskAssessment).filter(
              (val): val is number => typeof val === "number",
            );
            riskScore = riskValues.length > 0 ? Math.max(...riskValues) : 0;
            wasModified =
              JSON.stringify(request.body) !== JSON.stringify(sanitizedData);
          }
          break;

        case CriticalAreaType.FILE_DATA:
          result = await this.sanitizeFileData(request.body, operationId);
          // Type-safe property access for FileDataSanitizationResult
          if (this.isFileDataSanitizationResult(result)) {
            sanitizedData = result.sanitized;
            threatsDetected = result.maliciousPatterns.length;
            riskScore = result.securityAssessment.overallRisk;
            wasModified =
              JSON.stringify(request.body) !== JSON.stringify(sanitizedData);
          }
          break;

        case CriticalAreaType.USER_INPUT:
        case CriticalAreaType.AUTO_DETECT:
        default:
          const genericResult = await this.sanitizeGenericUserInput(
            request.body,
            config,
            operationId,
          );
          // Type-safe property access for generic sanitization result
          if (
            genericResult &&
            typeof genericResult === "object" &&
            "sanitized" in genericResult &&
            "totalThreats" in genericResult &&
            "maxRiskScore" in genericResult
          ) {
            sanitizedData = genericResult.sanitized;
            threatsDetected = genericResult.totalThreats;
            riskScore = genericResult.maxRiskScore;
            wasModified =
              JSON.stringify(request.body) !== JSON.stringify(sanitizedData);
          }
          break;
      }

      const processingTimeMs = Date.now() - startTime;

      return {
        originalData: request.body,
        sanitizedData,
        wasModified,
        threatsDetected,
        riskScore,
        processingTimeMs,
        areaType: config.areaType,
        securityLevel: config.securityLevel || "moderate",
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;

      this.logger.error(`[${operationId}] Sanitization processing failed`, {
        operationId,
        areaType: config.areaType,
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs,
      });

      // Return original data on error to avoid breaking requests
      return {
        originalData: request.body,
        sanitizedData: request.body,
        wasModified: false,
        threatsDetected: 0,
        riskScore: 0,
        processingTimeMs,
        areaType: config.areaType,
        securityLevel: config.securityLevel || "moderate",
      };
    }
  }

  /**
   * Sanitize task data (CreateTaskDto, UpdateTaskDto)
   */
  private async sanitizeTaskData(data: any, operationId: string) {
    if (this.isCreateTaskDto(data) || this.isUpdateTaskDto(data)) {
      return await this.sanitizationService.sanitizeTaskData(data, operationId);
    }

    // Fallback for unknown task data structure
    return await this.sanitizationService.sanitizeTaskData(data, operationId);
  }

  /**
   * Sanitize message content
   */
  private async sanitizeMessageContent(data: any, operationId: string) {
    if (data.content && Array.isArray(data.content)) {
      return await this.sanitizationService.sanitizeMessageContent(
        data.content as MessageContentBlock[],
        operationId,
      );
    }

    // Fallback for single message or different structure
    const content = data.message || data.text || data.content || "";
    const blocks: MessageContentBlock[] = [
      {
        type: "text" as any,
        text: content,
      } as any,
    ];

    return await this.sanitizationService.sanitizeMessageContent(
      blocks,
      operationId,
    );
  }

  /**
   * Sanitize search query data
   */
  private async sanitizeSearchQuery(data: any, operationId: string) {
    if (this.isTaskSearchDto(data)) {
      return await this.sanitizationService.sanitizeSearchQuery(
        data,
        operationId,
      );
    }

    // Convert generic search data to TaskSearchDto format
    const searchDto: TaskSearchDto = {
      query: data.query || data.search || data.q,
      assignedTo: data.assignedTo,
      tags: data.tags,
      ...data,
    };

    return await this.sanitizationService.sanitizeSearchQuery(
      searchDto,
      operationId,
    );
  }

  /**
   * Sanitize file data
   */
  private async sanitizeFileData(data: any, operationId: string) {
    const filename =
      data.filename || data.name || data.originalname || "unknown";
    const content = data.content || data.data || data.buffer;
    const mimeType = data.mimetype || data.type;

    return await this.sanitizationService.sanitizeFileData(
      filename,
      content?.toString(),
      mimeType,
      operationId,
    );
  }

  /**
   * Sanitize generic user input
   */
  private async sanitizeGenericUserInput(
    data: any,
    config: CriticalAreaSanitizationConfig,
    operationId: string,
  ): Promise<{
    sanitized: any;
    totalThreats: number;
    maxRiskScore: number;
  }> {
    let totalThreats = 0;
    let maxRiskScore = 0;
    const sanitizedData = { ...data };

    // Recursively sanitize string fields
    for (const [key, value] of Object.entries(data)) {
      if (config.excludeFields?.includes(key) || typeof value !== "string") {
        continue;
      }

      if (!config.targetFields || config.targetFields.includes(key)) {
        try {
          // Use basic XSS sanitization for generic input
          const result = await this.sanitizationService.sanitizeFileData(
            key, // Use key as filename for basic sanitization
            value,
            "text/plain",
            operationId,
          );

          sanitizedData[key] = result.sanitized.content || value;
          totalThreats += result.maliciousPatterns.length;
          maxRiskScore = Math.max(
            maxRiskScore,
            result.securityAssessment.contentRisk,
          );
        } catch (error) {
          // Keep original value on sanitization error
          this.logger.warn(`Failed to sanitize field ${key}`, { error });
        }
      }
    }

    return {
      sanitized: sanitizedData,
      totalThreats,
      maxRiskScore,
    };
  }

  /**
   * Type guards for different data structures
   */
  private isCreateTaskDto(data: any): data is CreateTaskDto {
    return data && typeof data.title === "string";
  }

  private isUpdateTaskDto(data: any): data is UpdateTaskDto {
    return data && (data.title || data.description || data.status);
  }

  private isTaskSearchDto(data: any): data is TaskSearchDto {
    return data && (data.query || data.statuses || data.categories);
  }

  /**
   * Type guards for sanitization results
   */
  private isSanitizationResult(
    result: any,
  ): result is import("../services/critical-area-sanitization.service").SanitizationResult {
    return (
      result &&
      "sanitized" in result &&
      "totalThreats" in result &&
      "overallRisk" in result
    );
  }

  private isMessageContentSanitizationResult(
    result: any,
  ): result is import("../services/critical-area-sanitization.service").MessageContentSanitizationResult {
    return (
      result &&
      "sanitized" in result &&
      "safetyScore" in result &&
      "blockResults" in result
    );
  }

  private isFileDataSanitizationResult(
    result: any,
  ): result is import("../services/critical-area-sanitization.service").FileDataSanitizationResult {
    return (
      result &&
      "sanitized" in result &&
      "maliciousPatterns" in result &&
      "securityAssessment" in result
    );
  }

  private isConfigurationDataSanitizationResult(
    result: any,
  ): result is import("../services/critical-area-sanitization.service").ConfigurationDataSanitizationResult {
    return (
      result &&
      "sanitized" in result &&
      "blockedConfigurations" in result &&
      "keyRiskAssessment" in result
    );
  }

  /**
   * Convert risk level to numeric score
   */
  private calculateRiskScore(
    riskLevel: "low" | "medium" | "high" | "critical",
  ): number {
    switch (riskLevel) {
      case "critical":
        return 95;
      case "high":
        return 75;
      case "medium":
        return 45;
      case "low":
        return 15;
      default:
        return 0;
    }
  }
}

export default CriticalAreaSanitizationInterceptor;
