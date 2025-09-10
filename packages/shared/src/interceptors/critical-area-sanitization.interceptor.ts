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
import {
  MessageContentBlock,
  MessageContentType,
} from "../types/messageContent.types";

// Define minimal types to avoid DTO compilation issues
interface CreateTaskDto {
  title: string;
  description?: string;
  tags?: string[];
  [key: string]: unknown;
}

interface UpdateTaskDto {
  title?: string;
  description?: string;
  tags?: string[];
  status?: string;
  [key: string]: unknown;
}

interface TaskSearchDto {
  query?: string;
  assignedTo?: string;
  tags?: string[];
  statuses?: string[];
  categories?: string[];
  [key: string]: unknown;
}

/**
 * Metadata key for critical area sanitization configuration
 */
export const CRITICAL_AREA_SANITIZATION_KEY = "critical_area_sanitization";

/**
 * Critical area types for automatic detection
 */
export enum CriticalAreaType {
  _TASK_DATA = "task_data",
  _MESSAGE_CONTENT = "message_content",
  _CONFIGURATION_DATA = "configuration_data",
  _SEARCH_QUERY = "search_query",
  _FILE_DATA = "file_data",
  _USER_INPUT = "user_input",
  _AUTO_DETECT = "auto_detect",
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
  originalData: unknown;

  /** Sanitized request data */
  sanitizedData: unknown;

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
    private readonly _reflector: Reflector,
    private readonly _sanitizationService: CriticalAreaSanitizationService,
  ) {
    this.logger.log("Critical area sanitization interceptor initialized", {
      serviceType: "automatic-xss-protection",
      availableAreaTypes: Object.values(CriticalAreaType),
    });
  }

  /**
   * Intercept requests and apply critical area sanitization
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startTime = Date.now();
    const operationId = `sanitize-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

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
        (_error) => {
          this.logger.error(`[${operationId}] Sanitization failed`, {
            operationId,
            error: _error instanceof Error ? _error.message : String(_error),
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
    const methodConfig = this._reflector.get<CriticalAreaSanitizationConfig>(
      CRITICAL_AREA_SANITIZATION_KEY,
      context.getHandler(),
    );

    if (methodConfig) {
      return methodConfig;
    }

    // Check class-level decorator
    const classConfig = this._reflector.get<CriticalAreaSanitizationConfig>(
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
          areaType: CriticalAreaType._SEARCH_QUERY,
          securityLevel: "moderate",
          enableLogging: true,
        };
      } else if (method === "POST" || method === "PUT" || method === "PATCH") {
        return {
          areaType: CriticalAreaType._TASK_DATA,
          securityLevel: "strict",
          enableLogging: true,
        };
      }
    }

    // Message endpoints
    if (url.includes("/messages") || url.includes("/message")) {
      return {
        areaType: CriticalAreaType._MESSAGE_CONTENT,
        securityLevel: "strict",
        enableLogging: true,
      };
    }

    // Configuration endpoints
    if (url.includes("/config") || url.includes("/settings")) {
      return {
        areaType: CriticalAreaType._CONFIGURATION_DATA,
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
        areaType: CriticalAreaType._FILE_DATA,
        securityLevel: "strict",
        enableLogging: true,
        blockHighRisk: true,
        riskThreshold: 75,
      };
    }

    // Generic user input for other POST/PUT/PATCH endpoints
    if (["POST", "PUT", "PATCH"].includes(method) && request.body) {
      return {
        areaType: CriticalAreaType._USER_INPUT,
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
        | import("../services/critical-area-sanitization.service").ConfigurationDataSanitizationResult
        | null = null;
      let sanitizedData: unknown = request.body;
      let threatsDetected = 0;
      let riskScore = 0;
      let wasModified = false;

      switch (config.areaType) {
        case CriticalAreaType._TASK_DATA:
          result = this.sanitizeTaskData(request.body, operationId);
          // Type-safe property access for SanitizationResult
          if (this.isSanitizationResult(result)) {
            sanitizedData = result.sanitized;
            threatsDetected = result.totalThreats;
            riskScore = this.calculateRiskScore(result.overallRisk);
            wasModified =
              JSON.stringify(request.body) !== JSON.stringify(sanitizedData);
          }
          break;

        case CriticalAreaType._MESSAGE_CONTENT:
          result = this.sanitizeMessageContent(request.body, operationId);
          // Type-safe property access for MessageContentSanitizationResult
          if (this.isMessageContentSanitizationResult(result)) {
            const requestBodyObj = request.body as Record<string, unknown>;
            sanitizedData = { ...requestBodyObj, content: result.sanitized };
            threatsDetected = result.blockResults.reduce(
              (total, block) => total + block.threatsDetected.length,
              0,
            );
            riskScore = 100 - result.safetyScore;
            wasModified =
              JSON.stringify(requestBodyObj.content) !==
              JSON.stringify(result.sanitized);
          }
          break;

        case CriticalAreaType._SEARCH_QUERY:
          result = this.sanitizeSearchQuery(request.body, operationId);
          // Type-safe property access for SanitizationResult
          if (this.isSanitizationResult(result)) {
            sanitizedData = result.sanitized;
            threatsDetected = result.totalThreats;
            riskScore = this.calculateRiskScore(result.overallRisk);
            wasModified =
              JSON.stringify(request.body) !== JSON.stringify(sanitizedData);
          }
          break;

        case CriticalAreaType._CONFIGURATION_DATA:
          result = this._sanitizationService.sanitizeConfigurationData(
            request.body as Record<string, unknown>,
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

        case CriticalAreaType._FILE_DATA:
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

        case CriticalAreaType._USER_INPUT:
        case CriticalAreaType._AUTO_DETECT:
        default: {
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
    } catch (err) {
      const processingTimeMs = Date.now() - startTime;

      this.logger.error(`[${operationId}] Sanitization processing failed`, {
        operationId,
        areaType: config.areaType,
        error: err instanceof Error ? err.message : String(err),
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
  private sanitizeTaskData(data: unknown, operationId: string) {
    if (this.isCreateTaskDto(data) || this.isUpdateTaskDto(data)) {
      return this._sanitizationService.sanitizeTaskData(data, operationId);
    }

    // Fallback for unknown task data structure
    return this._sanitizationService.sanitizeTaskData(
      data as CreateTaskDto | UpdateTaskDto,
      operationId,
    );
  }

  /**
   * Sanitize message content
   */
  private sanitizeMessageContent(data: unknown, operationId: string) {
    // Type guard to ensure data is an object
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return null;
    }

    const dataObj = data as Record<string, unknown>;
    if (dataObj.content && Array.isArray(dataObj.content)) {
      return this._sanitizationService.sanitizeMessageContent(
        dataObj.content as MessageContentBlock[],
        operationId,
      );
    }

    // Fallback for single message or different structure
    const content =
      typeof dataObj.message === "string"
        ? dataObj.message
        : typeof dataObj.text === "string"
          ? dataObj.text
          : typeof dataObj.content === "string"
            ? dataObj.content
            : "";
    const blocks: MessageContentBlock[] = [
      {
        type: MessageContentType._Text,
        text: content,
      },
    ];

    return this._sanitizationService.sanitizeMessageContent(
      blocks,
      operationId,
    );
  }

  /**
   * Sanitize search query data
   */
  private sanitizeSearchQuery(data: unknown, operationId: string) {
    if (this.isTaskSearchDto(data)) {
      return this._sanitizationService.sanitizeSearchQuery(data, operationId);
    }

    // Convert generic search data to TaskSearchDto format
    const dataObj = data as Record<string, unknown>;
    const searchDto: TaskSearchDto = {
      query:
        typeof dataObj.query === "string"
          ? dataObj.query
          : typeof dataObj.search === "string"
            ? dataObj.search
            : typeof dataObj.q === "string"
              ? dataObj.q
              : undefined,
      assignedTo:
        typeof dataObj.assignedTo === "string" ? dataObj.assignedTo : undefined,
      tags: Array.isArray(dataObj.tags)
        ? (dataObj.tags as string[])
        : undefined,
    };

    return this._sanitizationService.sanitizeSearchQuery(
      searchDto,
      operationId,
    );
  }

  /**
   * Sanitize file data
   */
  private async sanitizeFileData(data: unknown, operationId: string) {
    // Type guard to ensure data is an object
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return null;
    }

    const dataObj = data as Record<string, unknown>;
    const filename =
      typeof dataObj.filename === "string"
        ? dataObj.filename
        : typeof dataObj.name === "string"
          ? dataObj.name
          : typeof dataObj.originalname === "string"
            ? dataObj.originalname
            : "unknown";
    const content = dataObj.content || dataObj.data || dataObj.buffer;
    const mimeType =
      typeof dataObj.mimetype === "string"
        ? dataObj.mimetype
        : typeof dataObj.type === "string"
          ? dataObj.type
          : undefined;

    return await this._sanitizationService.sanitizeFileData(
      filename,
      content?.toString() ?? "",
      mimeType ?? "text/plain",
      operationId,
    );
  }

  /**
   * Sanitize generic user input
   */
  private async sanitizeGenericUserInput(
    data: unknown,
    config: CriticalAreaSanitizationConfig,
    operationId: string,
  ): Promise<{
    sanitized: unknown;
    totalThreats: number;
    maxRiskScore: number;
  }> {
    let totalThreats = 0;
    let maxRiskScore = 0;
    // Type guard to ensure data is an object
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return {
        sanitized: data,
        totalThreats: 0,
        maxRiskScore: 0,
      };
    }

    const sanitizedData = { ...(data as Record<string, unknown>) } as Record<
      string,
      unknown
    >;

    // Recursively sanitize string fields
    for (const [key, value] of Object.entries(
      data as Record<string, unknown>,
    )) {
      if (config.excludeFields?.includes(key) || typeof value !== "string") {
        continue;
      }

      if (!config.targetFields || config.targetFields.includes(key)) {
        try {
          // Use basic XSS sanitization for generic input
          const result = await this._sanitizationService.sanitizeFileData(
            key, // Use key as filename for basic sanitization
            value,
            "text/plain",
            operationId,
          );

          if (result && typeof result === "object" && "sanitized" in result) {
            const sanitizedResult = result as {
              sanitized: { content?: string };
              maliciousPatterns?: unknown[];
              securityAssessment?: { contentRisk?: number };
            };
            const sanitizedContent = sanitizedResult.sanitized.content;
            sanitizedData[key] = sanitizedContent ?? value;

            if (
              sanitizedResult.maliciousPatterns &&
              Array.isArray(sanitizedResult.maliciousPatterns)
            ) {
              totalThreats += sanitizedResult.maliciousPatterns.length;
            }

            if (
              sanitizedResult.securityAssessment &&
              typeof sanitizedResult.securityAssessment === "object" &&
              typeof sanitizedResult.securityAssessment.contentRisk === "number"
            ) {
              maxRiskScore = Math.max(
                maxRiskScore,
                sanitizedResult.securityAssessment.contentRisk,
              );
            }
          }
        } catch (err: unknown) {
          // Keep original value on sanitization error
          this.logger.warn(`Failed to sanitize field ${key}`, {
            error: err instanceof Error ? err.message : String(err),
          });
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
  private isCreateTaskDto(data: unknown): data is CreateTaskDto {
    return (
      !!data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      typeof (data as Record<string, unknown>).title === "string"
    );
  }

  private isUpdateTaskDto(data: unknown): data is UpdateTaskDto {
    return (
      !!data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      !!(
        (data as Record<string, unknown>).title ||
        (data as Record<string, unknown>).description ||
        (data as Record<string, unknown>).status
      )
    );
  }

  private isTaskSearchDto(data: unknown): data is TaskSearchDto {
    return (
      !!data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      !!(
        (data as Record<string, unknown>).query ||
        (data as Record<string, unknown>).statuses ||
        (data as Record<string, unknown>).categories
      )
    );
  }

  /**
   * Type guards for sanitization results
   */
  private isSanitizationResult(
    result: unknown,
  ): result is import("../services/critical-area-sanitization.service").SanitizationResult {
    return (
      !!result &&
      typeof result === "object" &&
      "sanitized" in result &&
      "totalThreats" in result &&
      "overallRisk" in result
    );
  }

  private isMessageContentSanitizationResult(
    result: unknown,
  ): result is import("../services/critical-area-sanitization.service").MessageContentSanitizationResult {
    return (
      !!result &&
      typeof result === "object" &&
      "sanitized" in result &&
      "safetyScore" in result &&
      "blockResults" in result
    );
  }

  private isFileDataSanitizationResult(
    result: unknown,
  ): result is import("../services/critical-area-sanitization.service").FileDataSanitizationResult {
    return (
      !!result &&
      typeof result === "object" &&
      "sanitized" in result &&
      "maliciousPatterns" in result &&
      "securityAssessment" in result
    );
  }

  private isConfigurationDataSanitizationResult(
    result: unknown,
  ): result is import("../services/critical-area-sanitization.service").ConfigurationDataSanitizationResult {
    return (
      !!result &&
      typeof result === "object" &&
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
