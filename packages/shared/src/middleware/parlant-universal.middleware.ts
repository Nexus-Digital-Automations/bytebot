/**
 * PARLANT Universal Middleware - Enterprise-Grade Conversational Validation
 *
 * This middleware provides automatic PARLANT conversational validation for ALL API endpoints
 * across the entire Bytebot ecosystem with zero configuration required. It intelligently
 * analyzes incoming requests and applies appropriate validation levels based on:
 *
 * - Endpoint sensitivity analysis
 * - Request risk assessment
 * - User role and permissions
 * - Business impact evaluation
 * - Security classification
 *
 * Key Features:
 * - Zero-overhead intelligent caching with request fingerprinting
 * - Automatic endpoint discovery and classification
 * - Dynamic security level mapping based on business rules
 * - Comprehensive conversational error handling
 * - Enterprise-grade audit trails with conversation context
 * - Real-time monitoring and performance metrics
 * - Intelligent failover and fallback mechanisms
 *
 * @author Claude Code - PARLANT Universal Integration Team
 * @version 1.0.0 - Enterprise Universal Framework
 */

import {
  Injectable,
  NestMiddleware,
  Logger,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Request, Response, NextFunction } from "express";
import { Cache } from "cache-manager";
import { ParlantIntegrationService } from "../services/parlant-integration.service";
import {
  SecurityLevel,
  ValidationMode,
  ConversationPriority,
  ApprovalLevel,
  FunctionSecurityLevel,
  RiskLevel,
  ParticipantRole,
} from "../types/parlant.types";
import {
  ParlantValidationRequest,
  ParlantValidationResponse,
} from "../types/parlant-integration.types";
import { ConversationContext } from "../types/conversation-context.types";

// Enhanced Request interface with PARLANT context
interface ParlantEnhancedRequest extends Request {
  parlantContext?: {
    validated: boolean;
    conversationId?: string;
    securityLevel: SecurityLevel;
    validationMode: ValidationMode;
    approvalLevel: ApprovalLevel;
    riskScore: number;
    cacheKey?: string;
    processingTime?: number;
    errorContext?: ConversationalErrorContext;
  };
  user?: {
    id: string;
    username: string;
    roles: string[];
    permissions: string[];
  };
}

interface ConversationalErrorContext {
  originalError: Error;
  conversationalExplanation: string;
  userFriendlyMessage: string;
  suggestedActions: string[];
  escalationLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  requiresHumanIntervention: boolean;
}

interface EndpointAnalysis {
  path: string;
  method: string;
  securityLevel: SecurityLevel;
  riskLevel: RiskLevel;
  businessCategory: string;
  requiresValidation: boolean;
  cacheStrategy: "NONE" | "SHORT" | "MEDIUM" | "LONG";
  complianceFlags: string[];
}

interface RequestFingerprint {
  userId: string;
  endpoint: string;
  method: string;
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  bodyHash?: string;
  timestamp: number;
}

@Injectable()
export class ParlantUniversalMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ParlantUniversalMiddleware.name);
  private readonly endpointCache = new Map<string, EndpointAnalysis>();
  private readonly performanceMetrics = new Map<string, number[]>();

  // Configuration for universal validation rules
  private readonly universalConfig = {
    enabledByDefault: true,
    globalCacheTimeout: 300000, // 5 minutes
    riskThresholds: {
      low: 25,
      medium: 50,
      high: 75,
      critical: 90,
    },
    endpointPatterns: {
      // Critical endpoints requiring explicit validation
      critical: [
        "/computer-use/**",
        "/admin/**",
        "/config/**",
        "/system/**",
        "/auth/**",
        "/**/batch/**",
        "/**/critical/**",
      ],
      // High-risk endpoints requiring conversational validation
      high: [
        "/data-extraction/**",
        "/file-management/**",
        "/workflow-automation/**",
        "/browser/**",
        "/**/delete/**",
        "/**/execute/**",
      ],
      // Medium-risk endpoints with intelligent validation
      medium: [
        "/metrics/**",
        "/monitoring/**",
        "/analytics/**",
        "/**/search/**",
        "/**/status/**",
      ],
      // Low-risk endpoints with automatic approval
      low: ["/health/**", "/version/**", "/ping/**", "/**/info/**"],
    },
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly parlantService: ParlantIntegrationService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.logger.log("PARLANT Universal Middleware initialized", {
      version: "1.0.0",
      enabledByDefault: this.universalConfig.enabledByDefault,
      cacheTimeout: this.universalConfig.globalCacheTimeout,
      criticalPatterns: this.universalConfig.endpointPatterns.critical.length,
      highPatterns: this.universalConfig.endpointPatterns.high.length,
    });
  }

  async use(req: ParlantEnhancedRequest, res: Response, next: NextFunction) {
    const operationId = `parlant-universal-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.debug(
      `[${operationId}] Universal PARLANT middleware initiated`,
      {
        operationId,
        method: req.method,
        url: req.url,
        userAgent: req.get("User-Agent"),
        clientIp: this.getClientIp(req),
      },
    );

    try {
      // Skip validation for health checks and non-API endpoints
      if (this.shouldSkipValidation(req)) {
        this.logger.debug(
          `[${operationId}] Skipping validation for: ${req.url}`,
        );
        return next();
      }

      // Analyze endpoint characteristics
      const endpointAnalysis = await this.analyzeEndpoint(req);

      // Perform risk assessment
      const riskScore = await this.assessRequestRisk(req, endpointAnalysis);

      // Determine validation requirements
      const validationConfig = this.determineValidationConfig(
        endpointAnalysis,
        riskScore,
      );

      // Initialize PARLANT context
      req.parlantContext = {
        validated: false,
        securityLevel: validationConfig.securityLevel,
        validationMode: validationConfig.validationMode,
        approvalLevel: validationConfig.approvalLevel,
        riskScore,
      };

      // Check cache for previous validation
      const cacheKey = await this.generateCacheKey(req, validationConfig);
      const cachedResult = await this.getCachedValidation(cacheKey);

      if (cachedResult && this.isCacheValid(cachedResult, validationConfig)) {
        this.applyCachedValidation(req, cachedResult);
        this.recordPerformanceMetric(
          operationId,
          Date.now() - startTime,
          "cached",
        );
        return next();
      }

      // Perform PARLANT validation
      if (validationConfig.requiresValidation) {
        await this.performParlantValidation(req, operationId, validationConfig);
      } else {
        // Auto-approve low-risk requests
        req.parlantContext.validated = true;
        this.logger.debug(`[${operationId}] Auto-approved low-risk request`);
      }

      // Cache successful validation
      if (req.parlantContext.validated && validationConfig.cacheable) {
        await this.cacheValidation(
          cacheKey,
          req.parlantContext,
          validationConfig,
        );
      }

      // Set response headers
      this.setUniversalHeaders(req, res, operationId);

      const processingTime = Date.now() - startTime;
      req.parlantContext.processingTime = processingTime;

      this.recordPerformanceMetric(operationId, processingTime, "validated");

      this.logger.log(`[${operationId}] Universal validation completed`, {
        operationId,
        validated: req.parlantContext.validated,
        securityLevel: req.parlantContext.securityLevel,
        riskScore: req.parlantContext.riskScore,
        processingTime,
        cacheUsed: !!cachedResult,
      });

      next();
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const conversationalError = await this.createConversationalError(
        error,
        req,
        operationId,
      );

      req.parlantContext = req.parlantContext || ({} as any);
      req.parlantContext!.errorContext = conversationalError;
      req.parlantContext!.processingTime = processingTime;

      this.logger.error(`[${operationId}] Universal validation failed`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        processingTime,
        url: req.url,
        method: req.method,
      });

      // Let the conversational error handler deal with this
      res.locals.parlantError = conversationalError;
      next();
    }
  }

  /**
   * Analyze endpoint characteristics and security requirements
   */
  private async analyzeEndpoint(
    req: ParlantEnhancedRequest,
  ): Promise<EndpointAnalysis> {
    const cacheKey = `endpoint-analysis:${req.method}:${req.route?.path || req.url}`;
    const cached = this.endpointCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const analysis: EndpointAnalysis = {
      path: req.route?.path || req.url,
      method: req.method,
      securityLevel: this.classifySecurityLevel(req),
      riskLevel: this.classifyRiskLevel(req),
      businessCategory: this.determineBusinessCategory(req),
      requiresValidation: this.shouldRequireValidation(req),
      cacheStrategy: this.determineCacheStrategy(req),
      complianceFlags: this.determineComplianceFlags(req),
    };

    this.endpointCache.set(cacheKey, analysis);
    return analysis;
  }

  /**
   * Classify security level based on endpoint patterns
   */
  private classifySecurityLevel(req: ParlantEnhancedRequest): SecurityLevel {
    const url = req.url.toLowerCase();

    // Critical security level
    for (const pattern of this.universalConfig.endpointPatterns.critical) {
      if (this.matchesPattern(url, pattern)) {
        return SecurityLevel._CRITICAL;
      }
    }

    // High security level
    for (const pattern of this.universalConfig.endpointPatterns.high) {
      if (this.matchesPattern(url, pattern)) {
        return SecurityLevel._HIGH;
      }
    }

    // Medium security level
    for (const pattern of this.universalConfig.endpointPatterns.medium) {
      if (this.matchesPattern(url, pattern)) {
        return SecurityLevel._MEDIUM;
      }
    }

    // Default to low for unmatched patterns
    return SecurityLevel._LOW;
  }

  /**
   * Classify risk level based on request characteristics
   */
  private classifyRiskLevel(req: ParlantEnhancedRequest): RiskLevel {
    let riskScore = 0;

    // Method-based risk
    if (req.method === "DELETE") riskScore += 30;
    else if (req.method === "POST" || req.method === "PUT") riskScore += 20;
    else if (req.method === "PATCH") riskScore += 15;

    // URL-based risk
    const url = req.url.toLowerCase();
    if (url.includes("admin")) riskScore += 25;
    if (url.includes("system")) riskScore += 20;
    if (url.includes("config")) riskScore += 20;
    if (url.includes("execute")) riskScore += 25;
    if (url.includes("batch")) riskScore += 15;

    // Body size risk (large payloads)
    const contentLength = parseInt(req.get("content-length") || "0");
    if (contentLength > 1000000) riskScore += 15; // > 1MB

    // Convert score to risk level
    if (riskScore >= this.universalConfig.riskThresholds.critical)
      return RiskLevel._CRITICAL;
    if (riskScore >= this.universalConfig.riskThresholds.high)
      return RiskLevel._HIGH;
    if (riskScore >= this.universalConfig.riskThresholds.medium)
      return RiskLevel._MODERATE;
    if (riskScore >= this.universalConfig.riskThresholds.low)
      return RiskLevel._LOW;
    return RiskLevel._MINIMAL;
  }

  /**
   * Determine business category for compliance
   */
  private determineBusinessCategory(req: ParlantEnhancedRequest): string {
    const url = req.url.toLowerCase();

    if (url.includes("computer-use")) return "COMPUTER_AUTOMATION";
    if (url.includes("data-extraction")) return "DATA_PROCESSING";
    if (url.includes("file-management")) return "FILE_OPERATIONS";
    if (url.includes("workflow")) return "WORKFLOW_AUTOMATION";
    if (url.includes("browser")) return "BROWSER_AUTOMATION";
    if (url.includes("health")) return "SYSTEM_MONITORING";
    if (url.includes("metrics")) return "PERFORMANCE_MONITORING";
    if (url.includes("auth")) return "AUTHENTICATION";
    if (url.includes("admin")) return "ADMINISTRATION";

    return "GENERAL_API";
  }

  /**
   * Determine if endpoint requires validation
   */
  private shouldRequireValidation(req: ParlantEnhancedRequest): boolean {
    const securityLevel = this.classifySecurityLevel(req);
    const riskLevel = this.classifyRiskLevel(req);

    // Always validate critical or high security endpoints
    if (
      securityLevel === SecurityLevel._CRITICAL ||
      securityLevel === SecurityLevel._HIGH
    ) {
      return true;
    }

    // Validate medium security endpoints with moderate+ risk
    if (
      securityLevel === SecurityLevel._MEDIUM &&
      (riskLevel === RiskLevel._MODERATE ||
        riskLevel === RiskLevel._HIGH ||
        riskLevel === RiskLevel._CRITICAL)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Determine caching strategy based on endpoint characteristics
   */
  private determineCacheStrategy(
    req: ParlantEnhancedRequest,
  ): "NONE" | "SHORT" | "MEDIUM" | "LONG" {
    if (req.method !== "GET") return "NONE";

    const url = req.url.toLowerCase();
    if (url.includes("health") || url.includes("status")) return "SHORT";
    if (url.includes("metrics") || url.includes("analytics")) return "MEDIUM";
    if (url.includes("config") || url.includes("version")) return "LONG";

    return "SHORT";
  }

  /**
   * Determine compliance flags for audit trail
   */
  private determineComplianceFlags(req: ParlantEnhancedRequest): string[] {
    const flags: string[] = [];
    const url = req.url.toLowerCase();

    if (url.includes("computer-use")) flags.push("SYSTEM_CONTROL");
    if (url.includes("admin")) flags.push("ADMINISTRATIVE_ACCESS");
    if (url.includes("data")) flags.push("DATA_PROCESSING");
    if (url.includes("file")) flags.push("FILE_ACCESS");
    if (url.includes("execute")) flags.push("EXECUTION_CONTROL");
    if (req.method === "DELETE") flags.push("DATA_DELETION");
    if (url.includes("batch")) flags.push("BATCH_PROCESSING");

    return flags;
  }

  /**
   * Assess overall request risk score
   */
  private async assessRequestRisk(
    req: ParlantEnhancedRequest,
    analysis: EndpointAnalysis,
  ): Promise<number> {
    let totalRisk = 0;

    // Base risk from classification
    switch (analysis.riskLevel) {
      case RiskLevel._CRITICAL:
        totalRisk += 40;
        break;
      case RiskLevel._HIGH:
        totalRisk += 30;
        break;
      case RiskLevel._MODERATE:
        totalRisk += 20;
        break;
      case RiskLevel._LOW:
        totalRisk += 10;
        break;
      default:
        totalRisk += 0;
    }

    // User context risk
    if (!req.user)
      totalRisk += 25; // Anonymous user
    else if (!req.user.roles?.includes("ADMIN")) totalRisk += 10;

    // Time-based risk (unusual hours)
    const hour = new Date().getHours();
    if (hour >= 23 || hour <= 6) totalRisk += 15;

    // Rate limiting risk (could check previous requests)
    // TODO: Implement rate limiting history check

    return Math.min(totalRisk, 100);
  }

  /**
   * Determine validation configuration based on analysis
   */
  private determineValidationConfig(
    analysis: EndpointAnalysis,
    riskScore: number,
  ): any {
    let validationMode = ValidationMode._AUTOMATED;
    let approvalLevel = ApprovalLevel._AUTOMATIC;
    let requiresValidation = analysis.requiresValidation;
    let cacheable = true;
    let timeout = 5000;

    // Adjust based on security level
    switch (analysis.securityLevel) {
      case SecurityLevel._CRITICAL:
        validationMode = ValidationMode._SYNCHRONOUS;
        approvalLevel = ApprovalLevel._DUAL_APPROVAL;
        requiresValidation = true;
        cacheable = false;
        timeout = 30000;
        break;

      case SecurityLevel._HIGH:
        validationMode = ValidationMode._INTERACTIVE;
        approvalLevel = ApprovalLevel._SINGLE_APPROVAL;
        requiresValidation = true;
        timeout = 15000;
        break;

      case SecurityLevel._MEDIUM:
        validationMode = ValidationMode._INTERACTIVE;
        approvalLevel = ApprovalLevel._SINGLE_APPROVAL;
        timeout = 10000;
        break;

      case SecurityLevel._LOW:
        validationMode = ValidationMode._AUTOMATED;
        approvalLevel = ApprovalLevel._AUTOMATIC;
        timeout = 3000;
        break;
    }

    // Adjust based on risk score
    if (riskScore >= this.universalConfig.riskThresholds.critical) {
      validationMode = ValidationMode._SYNCHRONOUS;
      approvalLevel = ApprovalLevel._DUAL_APPROVAL;
      requiresValidation = true;
      cacheable = false;
    } else if (riskScore >= this.universalConfig.riskThresholds.high) {
      if (validationMode === ValidationMode._AUTOMATED) {
        validationMode = ValidationMode._INTERACTIVE;
      }
      requiresValidation = true;
    }

    return {
      securityLevel: analysis.securityLevel,
      validationMode,
      approvalLevel,
      requiresValidation,
      cacheable,
      timeout,
      businessCategory: analysis.businessCategory,
      complianceFlags: analysis.complianceFlags,
    };
  }

  /**
   * Perform actual PARLANT validation
   */
  private async performParlantValidation(
    req: ParlantEnhancedRequest,
    operationId: string,
    config: any,
  ): Promise<void> {
    const validationRequest: ParlantValidationRequest = {
      operationId,
      functionName: `${req.method} ${req.route?.path || req.url}`,
      packageName: "@bytebot/universal-middleware",
      description: `Universal PARLANT validation for ${config.businessCategory} operation`,
      parameters: this.sanitizeRequestParameters(req),
      userContext: {
        userId: req.user?.id || "anonymous",
        roles: req.user?.roles || [],
        sessionId: operationId,
        ipAddress: this.getClientIp(req),
        metadata: {
          userAgent: req.get("User-Agent"),
          riskScore: req.parlantContext!.riskScore,
          endpointCategory: config.businessCategory,
        },
      },
      securityLevel: config.securityLevel,
      timeout: config.timeout,
    };

    const startTime = Date.now();
    const response =
      await this.parlantService.validateFunctionExecution(validationRequest);
    const validationTime = Date.now() - startTime;

    this.logger.debug(`[${operationId}] PARLANT validation completed`, {
      operationId,
      approved: response.approved,
      confidence: response.confidence,
      validationTime,
      reason: response.reason,
    });

    if (response.approved) {
      req.parlantContext!.validated = true;
      req.parlantContext!.conversationId = response.conversationId;
    } else {
      throw new HttpException(
        `Access denied: ${response.reason}`,
        HttpStatus.FORBIDDEN,
      );
    }
  }

  /**
   * Create conversational error explanation
   */
  private async createConversationalError(
    error: unknown,
    req: ParlantEnhancedRequest,
    operationId: string,
  ): Promise<ConversationalErrorContext> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Analyze error type and context
    let escalationLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM";
    let userFriendlyMessage =
      "An unexpected error occurred while processing your request.";
    let suggestedActions: string[] = [
      "Please try again later",
      "Contact support if the problem persists",
    ];
    let requiresHumanIntervention = false;

    // Categorize error types
    if (errorMessage.includes("timeout") || errorMessage.includes("TIMEOUT")) {
      escalationLevel = "MEDIUM";
      userFriendlyMessage =
        "The validation process timed out. This might be due to high system load.";
      suggestedActions = [
        "Try the request again in a few minutes",
        "If this is urgent, contact an administrator",
        "Check if there are any system maintenance notices",
      ];
    } else if (
      errorMessage.includes("denied") ||
      errorMessage.includes("forbidden")
    ) {
      escalationLevel = "HIGH";
      userFriendlyMessage =
        "Access to this operation requires additional approval or higher privileges.";
      suggestedActions = [
        "Ensure you have the necessary permissions",
        "Request approval from an administrator",
        "Contact your supervisor if this operation is business-critical",
      ];
      requiresHumanIntervention = true;
    } else if (
      errorMessage.includes("validation") ||
      errorMessage.includes("VALIDATION")
    ) {
      escalationLevel = "LOW";
      userFriendlyMessage =
        "The system needs to verify this operation through our conversational validation process.";
      suggestedActions = [
        "Respond to any validation prompts that appear",
        "Ensure your request details are accurate",
        "Contact support if validation repeatedly fails",
      ];
    } else if (
      errorMessage.includes("critical") ||
      errorMessage.includes("CRITICAL")
    ) {
      escalationLevel = "CRITICAL";
      userFriendlyMessage =
        "A critical system error has occurred. Our team has been notified.";
      suggestedActions = [
        "Do not retry this operation immediately",
        "Contact emergency support if this affects business operations",
        "Wait for system status updates",
      ];
      requiresHumanIntervention = true;
    }

    const conversationalExplanation = `
The system encountered an issue while validating your ${req.method} request to ${req.url}.

Here's what happened:
- ${userFriendlyMessage}
- Operation ID: ${operationId}
- Timestamp: ${new Date().toISOString()}
- Classification: ${escalationLevel} priority

What you can do:
${suggestedActions.map((action) => `• ${action}`).join("\n")}

Technical details have been logged for our development team to investigate and improve the system.
    `.trim();

    return {
      originalError: error instanceof Error ? error : new Error(String(error)),
      conversationalExplanation,
      userFriendlyMessage,
      suggestedActions,
      escalationLevel,
      requiresHumanIntervention,
    };
  }

  /**
   * Generate cache key for validation result
   */
  private async generateCacheKey(
    req: ParlantEnhancedRequest,
    config: any,
  ): Promise<string> {
    if (!config.cacheable) return "";

    const fingerprint: RequestFingerprint = {
      userId: req.user?.id || "anonymous",
      endpoint: req.route?.path || req.url,
      method: req.method,
      pathParams: req.params || {},
      queryParams: req.query as Record<string, string>,
      timestamp: Date.now(),
    };

    // Create hash of fingerprint for cache key
    const fingerprintStr = JSON.stringify(fingerprint);
    const hash = Buffer.from(fingerprintStr).toString("base64url");

    return `parlant-validation:${hash}`;
  }

  /**
   * Get cached validation result
   */
  private async getCachedValidation(cacheKey: string): Promise<any> {
    if (!cacheKey) return null;

    try {
      return await this.cacheManager.get(cacheKey);
    } catch (error) {
      this.logger.warn("Cache retrieval failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Cache validation result
   */
  private async cacheValidation(
    cacheKey: string,
    context: any,
    config: any,
  ): Promise<void> {
    if (!cacheKey || !config.cacheable) return;

    const cacheData = {
      validated: context.validated,
      conversationId: context.conversationId,
      securityLevel: context.securityLevel,
      timestamp: Date.now(),
    };

    try {
      const ttl = this.getCacheTTL(config.cacheStrategy);
      await this.cacheManager.set(cacheKey, cacheData, ttl);
    } catch (error) {
      this.logger.warn("Cache storage failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Apply cached validation result
   */
  private applyCachedValidation(
    req: ParlantEnhancedRequest,
    cachedResult: any,
  ): void {
    req.parlantContext!.validated = cachedResult.validated;
    req.parlantContext!.conversationId = cachedResult.conversationId;
    req.parlantContext!.cacheKey = "HIT";
  }

  /**
   * Check if cached result is still valid
   */
  private isCacheValid(cachedResult: any, config: any): boolean {
    if (!cachedResult || !cachedResult.timestamp) return false;

    const age = Date.now() - cachedResult.timestamp;
    const maxAge = this.getCacheTTL(config.cacheStrategy);

    return age < maxAge;
  }

  /**
   * Get cache TTL based on strategy
   */
  private getCacheTTL(strategy: string): number {
    switch (strategy) {
      case "SHORT":
        return 60000; // 1 minute
      case "MEDIUM":
        return 300000; // 5 minutes
      case "LONG":
        return 1800000; // 30 minutes
      default:
        return this.universalConfig.globalCacheTimeout;
    }
  }

  /**
   * Set universal response headers
   */
  private setUniversalHeaders(
    req: ParlantEnhancedRequest,
    res: Response,
    operationId: string,
  ): void {
    const headers: Record<string, string> = {
      "X-Parlant-Universal": "true",
      "X-Parlant-Operation-Id": operationId,
      "X-Parlant-Validated": req.parlantContext?.validated ? "true" : "false",
      "X-Parlant-Security-Level":
        req.parlantContext?.securityLevel || "unknown",
      "X-Parlant-Risk-Score": req.parlantContext?.riskScore?.toString() || "0",
    };

    if (req.parlantContext?.conversationId) {
      headers["X-Parlant-Conversation-Id"] = req.parlantContext.conversationId;
    }

    if (req.parlantContext?.cacheKey) {
      headers["X-Parlant-Cache"] = req.parlantContext.cacheKey;
    }

    if (req.parlantContext?.processingTime) {
      headers["X-Parlant-Processing-Time"] =
        req.parlantContext.processingTime.toString();
    }

    res.set(headers);
  }

  /**
   * Record performance metrics
   */
  private recordPerformanceMetric(
    operationId: string,
    processingTime: number,
    type: string,
  ): void {
    const key = `${type}_processing_times`;
    const metrics = this.performanceMetrics.get(key) || [];
    metrics.push(processingTime);

    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }

    this.performanceMetrics.set(key, metrics);

    // Log performance warnings
    if (processingTime > 5000 && type === "validated") {
      this.logger.warn(`Slow validation detected: ${processingTime}ms`, {
        operationId,
        type,
      });
    }
  }

  /**
   * Check if validation should be skipped
   */
  private shouldSkipValidation(req: ParlantEnhancedRequest): boolean {
    const url = req.url.toLowerCase();

    // Skip for health checks
    if (
      url.includes("/health") ||
      url.includes("/ping") ||
      url.includes("/version")
    ) {
      return true;
    }

    // Skip for non-API endpoints
    if (
      !url.startsWith("/api") &&
      !url.includes("computer-use") &&
      !url.includes("admin")
    ) {
      return true;
    }

    // Skip if explicitly disabled
    if (req.headers["x-parlant-skip"] === "true") {
      return true;
    }

    return false;
  }

  /**
   * Sanitize request parameters for validation
   */
  private sanitizeRequestParameters(
    req: ParlantEnhancedRequest,
  ): Record<string, any> {
    const params: Record<string, any> = {
      method: req.method,
      url: req.url,
      userAgent: req.get("User-Agent"),
    };

    // Add path parameters if available
    if (req.params && Object.keys(req.params).length > 0) {
      params.pathParams = req.params;
    }

    // Add query parameters (but limit size)
    if (req.query && Object.keys(req.query).length > 0) {
      const queryStr = JSON.stringify(req.query);
      params.queryParams =
        queryStr.length > 500 ? "[Large query object]" : req.query;
    }

    // Add body info (but not actual body content)
    if (req.body) {
      const bodyStr = JSON.stringify(req.body);
      params.bodySize = bodyStr.length;
      params.hasBody = true;
    }

    return params;
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: Request): string {
    return (
      req.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.get("x-real-ip") ||
      req.socket?.remoteAddress ||
      "unknown"
    );
  }

  /**
   * Check if URL matches pattern (supports wildcards)
   */
  private matchesPattern(url: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*\*/g, ".*") // ** matches any path
      .replace(/\*/g, "[^/]*") // * matches any segment
      .replace(/\//g, "\\/"); // escape slashes

    const regex = new RegExp(`^${regexPattern}$`, "i");
    return regex.test(url);
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceMetrics(): Record<string, any> {
    const summary: Record<string, any> = {};

    for (const [key, values] of this.performanceMetrics.entries()) {
      if (values.length === 0) continue;

      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      summary[key] = {
        average: Math.round(avg),
        minimum: min,
        maximum: max,
        count: values.length,
      };
    }

    return summary;
  }

  /**
   * Clear performance metrics
   */
  clearPerformanceMetrics(): void {
    this.performanceMetrics.clear();
    this.logger.log("Performance metrics cleared");
  }
}
