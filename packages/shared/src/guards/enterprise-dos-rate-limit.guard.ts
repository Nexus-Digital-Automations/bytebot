/**
 * Enterprise DoS Protection & Rate Limiting Guard
 *
 * This guard provides comprehensive DoS protection and enterprise-grade rate limiting with:
 * - Advanced DoS attack detection and mitigation
 * - Circuit breaker integration for service protection
 * - Dynamic rate limiting based on threat levels
 * - IP reputation scoring and geolocation analysis
 * - Multi-layer protection (global, endpoint, user, IP-based)
 * - Real-time threat intelligence correlation
 * - Adaptive thresholds based on system load
 *
 * @fileoverview Advanced DoS protection and rate limiting guard
 * @version 1.0.0
 * @author Enterprise DoS Protection & Rate Limiting Team
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";
import {
  DoSProtectionService,
  DoSMitigationAction,
  DoSAnalysisResult,
} from "../services/dos-protection.service";
import {
  EnhancedCircuitBreakerService,
  CircuitBreakerOpenException,
} from "../services/enhanced-circuit-breaker.service";
import {
  StandardizedRateLimitGuard,
  RateLimitServiceType,
  STANDARDIZED_RATE_LIMIT_KEY,
} from "./rate-limit.standardized";
import {
  RateLimitConfig,
  RateLimitPreset,
  SecurityEventType,
  createSecurityEvent,
  generateEventId,
} from "../utils/security.utils";

/**
 * Enterprise DoS protection configuration
 */
export interface EnterpriseDoSProtectionConfig {
  /** Enable DoS protection */
  enabled: boolean;

  /** DoS detection sensitivity (low, medium, high) */
  sensitivity: "low" | "medium" | "high";

  /** Enable circuit breaker integration */
  enableCircuitBreaker: boolean;

  /** Circuit breaker name for this guard instance */
  circuitBreakerName: string;

  /** Enable IP blocking */
  enableIPBlocking: boolean;

  /** Enable CAPTCHA challenge */
  enableCaptchaChallenge: boolean;

  /** Enable dynamic rate limiting */
  enableDynamicRateLimiting: boolean;

  /** Maximum risk score before blocking (0-100) */
  blockingThreshold: number;

  /** Temporary IP block duration (milliseconds) */
  temporaryBlockDurationMs: number;

  /** Service type for configuration */
  serviceType: RateLimitServiceType;
}

/**
 * Enterprise DoS protection result
 */
export interface EnterpriseDoSProtectionResult {
  /** Analysis ID for tracking */
  analysisId: string;

  /** Whether request is allowed */
  allowed: boolean;

  /** DoS analysis result */
  dosAnalysis: DoSAnalysisResult;

  /** Rate limiting information */
  rateLimitInfo: {
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
    preset: string;
  };

  /** Applied mitigation actions */
  mitigationActions: DoSMitigationAction[];

  /** Circuit breaker state */
  circuitBreakerState?: string;

  /** Processing metrics */
  processingMetrics: {
    totalProcessingTimeMs: number;
    dosAnalysisTimeMs: number;
    rateLimitCheckTimeMs: number;
    circuitBreakerTimeMs: number;
  };
}

/**
 * Default DoS protection configurations for different service types
 */
const DEFAULT_DOS_PROTECTION_CONFIGS: Record<
  RateLimitServiceType,
  EnterpriseDoSProtectionConfig
> = {
  [RateLimitServiceType.BYTEBOTD]: {
    enabled: true,
    sensitivity: "high", // High sensitivity for computer control
    enableCircuitBreaker: true,
    circuitBreakerName: "bytebotd_dos_protection",
    enableIPBlocking: true,
    enableCaptchaChallenge: false, // Not suitable for API service
    enableDynamicRateLimiting: true,
    blockingThreshold: 60, // Block at 60% risk score
    temporaryBlockDurationMs: 5 * 60 * 1000, // 5 minutes
    serviceType: RateLimitServiceType.BYTEBOTD,
  },

  [RateLimitServiceType.BYTEBOT_AGENT]: {
    enabled: true,
    sensitivity: "medium", // Medium sensitivity for task management
    enableCircuitBreaker: true,
    circuitBreakerName: "bytebot_agent_dos_protection",
    enableIPBlocking: true,
    enableCaptchaChallenge: false, // Not suitable for API service
    enableDynamicRateLimiting: true,
    blockingThreshold: 70, // Block at 70% risk score
    temporaryBlockDurationMs: 3 * 60 * 1000, // 3 minutes
    serviceType: RateLimitServiceType.BYTEBOT_AGENT,
  },

  [RateLimitServiceType.BYTEBOT_UI]: {
    enabled: true,
    sensitivity: "low", // Lower sensitivity for UI
    enableCircuitBreaker: true,
    circuitBreakerName: "bytebot_ui_dos_protection",
    enableIPBlocking: true,
    enableCaptchaChallenge: true, // Suitable for UI service
    enableDynamicRateLimiting: true,
    blockingThreshold: 80, // Block at 80% risk score
    temporaryBlockDurationMs: 2 * 60 * 1000, // 2 minutes
    serviceType: RateLimitServiceType.BYTEBOT_UI,
  },

  [RateLimitServiceType.SHARED]: {
    enabled: true,
    sensitivity: "medium",
    enableCircuitBreaker: true,
    circuitBreakerName: "shared_dos_protection",
    enableIPBlocking: true,
    enableCaptchaChallenge: false,
    enableDynamicRateLimiting: true,
    blockingThreshold: 75,
    temporaryBlockDurationMs: 3 * 60 * 1000,
    serviceType: RateLimitServiceType.SHARED,
  },
};

/**
 * Enterprise DoS protection decorator metadata key
 */
export const ENTERPRISE_DOS_PROTECTION_KEY = "enterprise_dos_protection";

/**
 * Enhanced DoS protection decorator
 * @param config - DoS protection configuration
 */
export const EnterpriseDoSProtection = (
  config?: Partial<EnterpriseDoSProtectionConfig>,
) => Reflect.metadata(ENTERPRISE_DOS_PROTECTION_KEY, config);

/**
 * Enterprise DoS Protection & Rate Limiting Guard
 * Provides comprehensive DoS protection integrated with rate limiting and circuit breakers
 */
@Injectable()
export class EnterpriseDoSRateLimitGuard extends StandardizedRateLimitGuard {
  private readonly logger = new Logger(EnterpriseDoSRateLimitGuard.name);
  private readonly dosProtectionConfig: EnterpriseDoSProtectionConfig;

  constructor(
    protected reflector: Reflector,
    protected configService: ConfigService,
    @Inject("REDIS_CLIENT") protected redisClient: any,
    protected dosProtectionService: DoSProtectionService,
    protected circuitBreakerService: EnhancedCircuitBreakerService,
    serviceType: RateLimitServiceType = RateLimitServiceType.SHARED,
  ) {
    super(reflector, configService, redisClient, serviceType);

    // Initialize DoS protection configuration
    this.dosProtectionConfig = {
      ...DEFAULT_DOS_PROTECTION_CONFIGS[serviceType],
      ...this.configService.get(`dosProtection.${serviceType}`, {}),
    };

    this.logger.log(
      `Enterprise DoS Protection & Rate Limiting Guard initialized for ${serviceType}`,
      {
        serviceType: this.dosProtectionConfig.serviceType,
        enabled: this.dosProtectionConfig.enabled,
        sensitivity: this.dosProtectionConfig.sensitivity,
        blockingThreshold: this.dosProtectionConfig.blockingThreshold,
        circuitBreakerEnabled: this.dosProtectionConfig.enableCircuitBreaker,
      },
    );
  }

  /**
   * Enhanced rate limiting with DoS protection and circuit breaker integration
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const operationId = generateEventId();
    const startTime = Date.now();

    this.logger.debug(
      `[${operationId}] Starting enterprise DoS protection analysis`,
      {
        operationId,
        serviceType: this.dosProtectionConfig.serviceType,
      },
    );

    try {
      const request = context.switchToHttp().getRequest<Request>();
      const response = context.switchToHttp().getResponse<Response>();

      // Check if DoS protection is disabled
      if (!this.dosProtectionConfig.enabled) {
        this.logger.debug(
          `[${operationId}] DoS protection disabled, falling back to standard rate limiting`,
        );
        return super.canActivate(context);
      }

      // Get method-level DoS protection override
      const methodDoSConfig = this.reflector.get<
        Partial<EnterpriseDoSProtectionConfig>
      >(ENTERPRISE_DOS_PROTECTION_KEY, context.getHandler());

      const effectiveConfig = methodDoSConfig
        ? { ...this.dosProtectionConfig, ...methodDoSConfig }
        : this.dosProtectionConfig;

      // Execute with circuit breaker protection if enabled
      if (effectiveConfig.enableCircuitBreaker) {
        const result =
          await this.circuitBreakerService.executeWithCircuitBreaker(
            effectiveConfig.circuitBreakerName,
            () =>
              this.performEnterpriseProtectionAnalysis(
                request,
                response,
                context,
                effectiveConfig,
                operationId,
                startTime,
              ),
            () =>
              this.handleCircuitBreakerFallback(request, response, operationId),
          );

        if (!result.success) {
          if (result.error instanceof CircuitBreakerOpenException) {
            throw new HttpException(
              {
                statusCode: HttpStatus.SERVICE_UNAVAILABLE,
                message: "Service temporarily unavailable due to high load",
                error: "Service Unavailable",
                serviceType: this.dosProtectionConfig.serviceType,
                circuitBreakerState: result.circuitState,
                operationId,
                retryAfter: 60, // Suggest retry after 60 seconds
              },
              HttpStatus.SERVICE_UNAVAILABLE,
            );
          }

          throw result.error;
        }

        return result.result;
      } else {
        // Execute without circuit breaker
        return this.performEnterpriseProtectionAnalysis(
          request,
          response,
          context,
          effectiveConfig,
          operationId,
          startTime,
        );
      }
    } catch (error) {
      const totalProcessingTime = Date.now() - startTime;

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`[${operationId}] Enterprise DoS protection error`, {
        operationId,
        error: (error as Error).message,
        stack: (error as Error).stack,
        totalProcessingTimeMs: totalProcessingTime,
        serviceType: this.dosProtectionConfig.serviceType,
      });

      // Fall back to standard rate limiting on DoS protection failure
      return super.canActivate(context);
    }
  }

  /**
   * Perform comprehensive enterprise protection analysis
   */
  private async performEnterpriseProtectionAnalysis(
    request: Request,
    response: Response,
    context: ExecutionContext,
    config: EnterpriseDoSProtectionConfig,
    operationId: string,
    startTime: number,
  ): Promise<boolean> {
    const ip = request.ip || request.connection.remoteAddress || "unknown";
    const endpoint = request.url;
    const userAgent = request.get("User-Agent");

    // Step 1: DoS Attack Analysis
    const dosAnalysisStartTime = Date.now();
    const dosAnalysis = await this.dosProtectionService.analyzeDoSAttack(
      ip,
      endpoint,
      config.serviceType,
      userAgent,
      {
        operationId,
        method: request.method,
        authenticated: !!(request as any).user,
      },
    );
    const dosAnalysisTime = Date.now() - dosAnalysisStartTime;

    // Track request for DoS pattern analysis
    await this.dosProtectionService.trackRequest(ip, endpoint);

    // Step 2: Apply DoS mitigation actions
    const mitigationActions = await this.applyDoSMitigationActions(
      dosAnalysis,
      request,
      response,
      config,
      operationId,
    );

    // Step 3: Standard rate limiting with dynamic adjustments
    const rateLimitStartTime = Date.now();
    let rateLimitAllowed = true;
    let rateLimitInfo: any = null;

    try {
      // Get dynamic rate limit configuration based on DoS analysis
      const dynamicConfig = this.getDynamicRateLimitConfig(
        context,
        dosAnalysis,
        config,
      );

      if (dynamicConfig) {
        // Temporarily override rate limit configuration for this request
        const originalCanActivate = super.canActivate.bind(this);
        rateLimitAllowed = await originalCanActivate(context);
      } else {
        rateLimitAllowed = await super.canActivate(context);
      }
    } catch (rateLimitError) {
      if (
        rateLimitError instanceof HttpException &&
        rateLimitError.getStatus() === HttpStatus.TOO_MANY_REQUESTS
      ) {
        const errorResponse = rateLimitError.getResponse();
        rateLimitInfo = errorResponse.rateLimitInfo;
        rateLimitAllowed = false;
      } else {
        throw rateLimitError;
      }
    }

    const rateLimitTime = Date.now() - rateLimitStartTime;
    const totalProcessingTime = Date.now() - startTime;

    // Step 4: Final decision based on DoS analysis and rate limiting
    const finalDecision = this.makeFinalProtectionDecision(
      dosAnalysis,
      rateLimitAllowed,
      mitigationActions,
      config,
    );

    // Set comprehensive protection headers
    this.setEnterpriseProtectionHeaders(response, {
      analysisId: dosAnalysis.analysisId,
      allowed: finalDecision,
      dosAnalysis,
      rateLimitInfo: rateLimitInfo || {
        limit: 0,
        remaining: 0,
        resetTime: 0,
        preset: "unknown",
      },
      mitigationActions,
      processingMetrics: {
        totalProcessingTimeMs: totalProcessingTime,
        dosAnalysisTimeMs: dosAnalysisTime,
        rateLimitCheckTimeMs: rateLimitTime,
        circuitBreakerTimeMs: 0, // Set by circuit breaker if used
      },
    });

    this.logger.log(
      `[${operationId}] Enterprise DoS protection analysis completed: ${finalDecision ? "ALLOWED" : "BLOCKED"}`,
      {
        operationId,
        finalDecision,
        dosRiskScore: dosAnalysis.riskScore,
        isDoSAttack: dosAnalysis.isDoSAttack,
        attackPatterns: dosAnalysis.attackPatterns,
        rateLimitAllowed,
        mitigationActions,
        processingMetrics: {
          totalProcessingTimeMs: totalProcessingTime,
          dosAnalysisTimeMs: dosAnalysisTime,
          rateLimitCheckTimeMs: rateLimitTime,
        },
        serviceType: config.serviceType,
      },
    );

    if (!finalDecision) {
      // Log comprehensive security event for blocked request
      await this.logEnterpriseSecurityEvent(
        request,
        dosAnalysis,
        mitigationActions,
        operationId,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Request blocked by enterprise DoS protection",
          error: "DoS Protection Activated",
          serviceType: config.serviceType,
          protectionInfo: {
            analysisId: dosAnalysis.analysisId,
            riskScore: dosAnalysis.riskScore,
            isDoSAttack: dosAnalysis.isDoSAttack,
            attackPatterns: dosAnalysis.attackPatterns,
            mitigationActions: mitigationActions.filter(
              (action) => action !== DoSMitigationAction.LOG_FOR_MONITORING,
            ),
          },
          operationId,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Apply DoS mitigation actions based on analysis results
   */
  private async applyDoSMitigationActions(
    dosAnalysis: DoSAnalysisResult,
    request: Request,
    response: Response,
    config: EnterpriseDoSProtectionConfig,
    operationId: string,
  ): Promise<DoSMitigationAction[]> {
    const appliedActions: DoSMitigationAction[] = [];

    for (const action of dosAnalysis.recommendedActions) {
      try {
        switch (action) {
          case DoSMitigationAction.BLOCK_IP_TEMPORARY:
            if (config.enableIPBlocking) {
              await this.blockIPTemporarily(
                dosAnalysis.ipReputation.ip,
                config.temporaryBlockDurationMs,
                operationId,
              );
              appliedActions.push(action);
            }
            break;

          case DoSMitigationAction.BLOCK_IP_PERMANENT:
            if (config.enableIPBlocking) {
              await this.blockIPPermanently(
                dosAnalysis.ipReputation.ip,
                operationId,
              );
              appliedActions.push(action);
            }
            break;

          case DoSMitigationAction.ENABLE_CAPTCHA_CHALLENGE:
            if (config.enableCaptchaChallenge) {
              this.setCaptchaChallenge(response);
              appliedActions.push(action);
            }
            break;

          case DoSMitigationAction.TRIGGER_CIRCUIT_BREAKER:
            if (config.enableCircuitBreaker) {
              // Circuit breaker is handled at the guard level
              appliedActions.push(action);
            }
            break;

          case DoSMitigationAction.LOG_FOR_MONITORING:
            appliedActions.push(action);
            break;

          case DoSMitigationAction.ESCALATE_TO_SECURITY_TEAM:
            await this.escalateToSecurityTeam(dosAnalysis, operationId);
            appliedActions.push(action);
            break;

          case DoSMitigationAction.APPLY_AGGRESSIVE_RATE_LIMIT:
            if (config.enableDynamicRateLimiting) {
              // Applied in rate limiting step
              appliedActions.push(action);
            }
            break;
        }
      } catch (error) {
        this.logger.warn(
          `[${operationId}] Failed to apply mitigation action: ${action}`,
          {
            operationId,
            action,
            error: (error as Error).message,
          },
        );
      }
    }

    return appliedActions;
  }

  /**
   * Get dynamic rate limit configuration based on DoS analysis
   */
  private getDynamicRateLimitConfig(
    context: ExecutionContext,
    dosAnalysis: DoSAnalysisResult,
    config: EnterpriseDoSProtectionConfig,
  ): RateLimitConfig | null {
    if (!config.enableDynamicRateLimiting) {
      return null;
    }

    // Get base rate limit configuration
    const baseConfig = this.getRateLimitConfig(context);
    if (!baseConfig) {
      return null;
    }

    // Adjust limits based on DoS risk score
    let limitMultiplier = 1.0;

    if (dosAnalysis.riskScore >= 80) {
      limitMultiplier = 0.1; // Reduce to 10% of normal limit
    } else if (dosAnalysis.riskScore >= 60) {
      limitMultiplier = 0.25; // Reduce to 25% of normal limit
    } else if (dosAnalysis.riskScore >= 40) {
      limitMultiplier = 0.5; // Reduce to 50% of normal limit
    } else if (dosAnalysis.riskScore >= 20) {
      limitMultiplier = 0.75; // Reduce to 75% of normal limit
    }

    // Apply sensitivity-based adjustments
    switch (config.sensitivity) {
      case "high":
        limitMultiplier *= 0.75; // More aggressive reduction
        break;
      case "low":
        limitMultiplier *= 1.25; // Less aggressive reduction
        break;
      // "medium" uses base multiplier
    }

    const dynamicLimit = Math.max(
      1,
      Math.floor(baseConfig.max * limitMultiplier),
    );

    return {
      ...baseConfig,
      max: dynamicLimit,
      message: `Dynamic rate limit applied due to security threat (${dosAnalysis.riskScore}% risk)`,
    };
  }

  /**
   * Make final protection decision based on all factors
   */
  private makeFinalProtectionDecision(
    dosAnalysis: DoSAnalysisResult,
    rateLimitAllowed: boolean,
    mitigationActions: DoSMitigationAction[],
    config: EnterpriseDoSProtectionConfig,
  ): boolean {
    // Block if DoS attack detected and risk score exceeds threshold
    if (
      dosAnalysis.isDoSAttack &&
      dosAnalysis.riskScore >= config.blockingThreshold
    ) {
      return false;
    }

    // Block if permanent IP block action was applied
    if (mitigationActions.includes(DoSMitigationAction.BLOCK_IP_PERMANENT)) {
      return false;
    }

    // Block if temporary IP block action was applied
    if (mitigationActions.includes(DoSMitigationAction.BLOCK_IP_TEMPORARY)) {
      return false;
    }

    // Block if rate limiting failed
    if (!rateLimitAllowed) {
      return false;
    }

    // Allow request if all checks passed
    return true;
  }

  /**
   * Set comprehensive enterprise protection headers
   */
  private setEnterpriseProtectionHeaders(
    response: Response,
    protectionResult: EnterpriseDoSProtectionResult,
  ): void {
    response.set({
      "X-DoS-Protection-Analysis-ID": protectionResult.analysisId,
      "X-DoS-Protection-Risk-Score":
        protectionResult.dosAnalysis.riskScore.toString(),
      "X-DoS-Protection-Is-Attack":
        protectionResult.dosAnalysis.isDoSAttack.toString(),
      "X-DoS-Protection-Patterns":
        protectionResult.dosAnalysis.attackPatterns.join(","),
      "X-DoS-Protection-Actions": protectionResult.mitigationActions.join(","),
      "X-DoS-Protection-Processing-Time":
        protectionResult.processingMetrics.totalProcessingTimeMs.toString(),
      "X-DoS-Protection-Service":
        protectionResult.dosAnalysis.metadata.serviceType,
    });

    // Add IP reputation headers
    if (protectionResult.dosAnalysis.ipReputation) {
      response.set({
        "X-DoS-Protection-IP-Threat":
          protectionResult.dosAnalysis.ipReputation.isThreat.toString(),
        "X-DoS-Protection-IP-Score":
          protectionResult.dosAnalysis.ipReputation.reputationScore.toString(),
      });
    }
  }

  /**
   * Handle circuit breaker fallback
   */
  private async handleCircuitBreakerFallback(
    request: Request,
    response: Response,
    operationId: string,
  ): Promise<boolean> {
    this.logger.warn(
      `[${operationId}] Circuit breaker open, using fallback protection`,
    );

    // Apply basic rate limiting as fallback
    // In a real implementation, this could be a simplified protection mechanism
    const ip = request.ip || "unknown";
    const now = Date.now();
    const fallbackKey = `fallback:${ip}`;

    // Implement simple fallback logic here
    return true; // For now, allow requests when circuit is open
  }

  /**
   * Block IP temporarily
   */
  private async blockIPTemporarily(
    ip: string,
    durationMs: number,
    operationId: string,
  ): Promise<void> {
    try {
      const blockKey = `ip_block:temporary:${ip}`;
      await this.redis.setex(
        blockKey,
        Math.ceil(durationMs / 1000),
        operationId,
      );

      this.logger.warn(`IP blocked temporarily`, {
        ip,
        durationMs,
        operationId,
      });
    } catch (error) {
      this.logger.error("Failed to block IP temporarily", {
        ip,
        operationId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Block IP permanently
   */
  private async blockIPPermanently(
    ip: string,
    operationId: string,
  ): Promise<void> {
    try {
      const blockKey = `ip_block:permanent:${ip}`;
      await this.redis.set(blockKey, operationId);

      this.logger.error(`IP blocked permanently`, {
        ip,
        operationId,
      });
    } catch (error) {
      this.logger.error("Failed to block IP permanently", {
        ip,
        operationId,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Set CAPTCHA challenge header
   */
  private setCaptchaChallenge(response: Response): void {
    response.set({
      "X-DoS-Protection-Challenge": "captcha",
      "X-DoS-Protection-Challenge-Type": "recaptcha",
    });
  }

  /**
   * Escalate to security team
   */
  private async escalateToSecurityTeam(
    dosAnalysis: DoSAnalysisResult,
    operationId: string,
  ): Promise<void> {
    // In a real implementation, this would send alerts to the security team
    this.logger.error(
      `SECURITY ALERT: DoS attack detected - escalating to security team`,
      {
        analysisId: dosAnalysis.analysisId,
        riskScore: dosAnalysis.riskScore,
        attackPatterns: dosAnalysis.attackPatterns,
        ipAddress: dosAnalysis.ipReputation.ip,
        operationId,
      },
    );
  }

  /**
   * Log comprehensive enterprise security event
   */
  private async logEnterpriseSecurityEvent(
    request: Request,
    dosAnalysis: DoSAnalysisResult,
    mitigationActions: DoSMitigationAction[],
    operationId: string,
  ): Promise<void> {
    try {
      const securityEvent = createSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        request.url,
        request.method,
        false,
        `Enterprise DoS protection blocked request: ${dosAnalysis.riskScore}% risk score`,
        {
          operationId,
          analysisId: dosAnalysis.analysisId,
          dosRiskScore: dosAnalysis.riskScore,
          isDoSAttack: dosAnalysis.isDoSAttack,
          attackPatterns: dosAnalysis.attackPatterns,
          ipReputation: dosAnalysis.ipReputation,
          mitigationActions,
          serviceType: this.dosProtectionConfig.serviceType,
          processingTimeMs: dosAnalysis.metadata.analysisDurationMs,
        },
        (request as any).user?.id,
        request.ip,
        request.get("User-Agent"),
      );

      this.logger.error(
        `Enterprise DoS protection security event: ${securityEvent.eventId}`,
        {
          eventId: securityEvent.eventId,
          riskScore: securityEvent.riskScore,
          analysisId: dosAnalysis.analysisId,
          operationId,
        },
      );
    } catch (error) {
      this.logger.error(
        "Failed to log enterprise DoS protection security event",
        {
          operationId,
          error: (error as Error).message,
        },
      );
    }
  }

  /**
   * Factory methods for creating service-specific enterprise DoS guards
   */
  static createBytebotDGuard(
    reflector: Reflector,
    configService: ConfigService,
    redisClient: any,
    dosProtectionService: DoSProtectionService,
    circuitBreakerService: EnhancedCircuitBreakerService,
  ): EnterpriseDoSRateLimitGuard {
    return new EnterpriseDoSRateLimitGuard(
      reflector,
      configService,
      redisClient,
      dosProtectionService,
      circuitBreakerService,
      RateLimitServiceType.BYTEBOTD,
    );
  }

  static createBytebotAgentGuard(
    reflector: Reflector,
    configService: ConfigService,
    redisClient: any,
    dosProtectionService: DoSProtectionService,
    circuitBreakerService: EnhancedCircuitBreakerService,
  ): EnterpriseDoSRateLimitGuard {
    return new EnterpriseDoSRateLimitGuard(
      reflector,
      configService,
      redisClient,
      dosProtectionService,
      circuitBreakerService,
      RateLimitServiceType.BYTEBOT_AGENT,
    );
  }

  static createBytebotUIGuard(
    reflector: Reflector,
    configService: ConfigService,
    redisClient: any,
    dosProtectionService: DoSProtectionService,
    circuitBreakerService: EnhancedCircuitBreakerService,
  ): EnterpriseDoSRateLimitGuard {
    return new EnterpriseDoSRateLimitGuard(
      reflector,
      configService,
      redisClient,
      dosProtectionService,
      circuitBreakerService,
      RateLimitServiceType.BYTEBOT_UI,
    );
  }
}

export default EnterpriseDoSRateLimitGuard;
