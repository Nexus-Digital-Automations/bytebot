/**
 * Standardized Rate Limiting Guards - Bytebot Platform Security Framework
 *
 * This module provides standardized rate limiting guards with service-specific configurations
 * for consistent API protection across all Bytebot microservices:
 * - BytebotD (Computer Control Service) - STRICT RATE LIMITS
 * - Bytebot-Agent (Task Management Service) - MODERATE RATE LIMITS
 * - Bytebot-UI (Frontend Service) - LENIENT RATE LIMITS
 *
 * @fileoverview Enterprise rate limiting guards standardization framework
 * @version 2.0.0
 * @author Enterprise Rate Limiting & API Protection Specialist
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
import Redis from "ioredis";
import {
  RateLimitConfig,
  RateLimitPreset,
  SecurityEventType,
  createSecurityEvent,
  generateRateLimitKey,
  DEFAULT_RATE_LIMITS,
} from "../utils/security.utils";

/**
 * Service-specific rate limiting profiles
 */
export enum RateLimitServiceType {
  /** Computer control service - requires strict rate limits */
  BYTEBOTD = "bytebotd",

  /** Task management API service - requires moderate rate limits */
  BYTEBOT_AGENT = "bytebot-agent",

  /** Frontend UI service - requires lenient rate limits */
  BYTEBOT_UI = "bytebot-ui",

  /** Shared libraries and utilities */
  SHARED = "shared",
}

/**
 * Rate limit information for client headers
 */
interface StandardizedRateLimitInfo {
  /** Maximum requests allowed */
  limit: number;

  /** Remaining requests */
  remaining: number;

  /** Window reset time (Unix timestamp) */
  resetTime: number;

  /** Retry after seconds (when limited) */
  retryAfter?: number;

  /** Rate limit preset used */
  preset: string;

  /** Whether user is authenticated */
  authenticated: boolean;

  /** Service type applying the limit */
  serviceType: RateLimitServiceType;

  /** Security level applied */
  securityLevel: "strict" | "moderate" | "lenient";
}

/**
 * Enhanced rate limit state with service-specific tracking
 */
interface StandardizedRateLimitState {
  /** Current request count */
  count: number;

  /** Window start time */
  windowStart: number;

  /** Total requests ever (for trend analysis) */
  totalRequests: number;

  /** Burst request tracking */
  burstCount?: number;

  /** Burst window start */
  burstWindowStart?: number;

  /** Consecutive limit hits */
  limitHits?: number;

  /** Last request timestamp */
  lastRequest: number;

  /** User agent fingerprint */
  userAgent?: string;

  /** Suspicious activity score */
  suspiciousScore?: number;

  /** Service type requesting */
  serviceType: RateLimitServiceType;

  /** IP geolocation info (if available) */
  ipInfo?: {
    country?: string;
    region?: string;
    isp?: string;
    threat?: boolean;
  };
}

/**
 * Service-specific rate limiting configurations
 */
const SERVICE_RATE_LIMITS: Record<
  RateLimitServiceType,
  Record<RateLimitPreset, RateLimitConfig>
> = {
  [RateLimitServiceType.BYTEBOTD]: {
    [RateLimitPreset.AUTH]: {
      max: 3, // Very strict for computer control authentication
      windowMs: 15 * 60 * 1000, // 15 minutes
      message:
        "Authentication rate limit exceeded for computer control service",
    },
    [RateLimitPreset.COMPUTER_USE]: {
      max: 50, // Moderate for computer operations
      windowMs: 60 * 1000, // 1 minute
      message: "Computer control rate limit exceeded",
    },
    [RateLimitPreset.TASK_OPERATIONS]: {
      max: 20, // Restricted task operations
      windowMs: 60 * 1000, // 1 minute
      message:
        "Task operation rate limit exceeded for computer control service",
    },
    [RateLimitPreset.READ_OPERATIONS]: {
      max: 100, // Limited read operations
      windowMs: 60 * 1000, // 1 minute
      message:
        "Read operation rate limit exceeded for computer control service",
    },
    [RateLimitPreset.WEBSOCKET]: {
      max: 5, // Very limited WebSocket connections
      windowMs: 60 * 1000, // 1 minute
      message:
        "WebSocket connection rate limit exceeded for computer control service",
    },
  },

  [RateLimitServiceType.BYTEBOT_AGENT]: {
    [RateLimitPreset.AUTH]: {
      max: 5, // Standard authentication limits
      windowMs: 15 * 60 * 1000, // 15 minutes
      message: "Authentication rate limit exceeded for task management service",
    },
    [RateLimitPreset.COMPUTER_USE]: {
      max: 100, // Moderate computer operations via API
      windowMs: 60 * 1000, // 1 minute
      message: "Computer control rate limit exceeded via API",
    },
    [RateLimitPreset.TASK_OPERATIONS]: {
      max: 100, // Higher limit for task API
      windowMs: 60 * 1000, // 1 minute
      message: "Task operation rate limit exceeded",
    },
    [RateLimitPreset.READ_OPERATIONS]: {
      max: 500, // High read limits for API service
      windowMs: 60 * 1000, // 1 minute
      message: "Read operation rate limit exceeded",
    },
    [RateLimitPreset.WEBSOCKET]: {
      max: 20, // Moderate WebSocket connections
      windowMs: 60 * 1000, // 1 minute
      message: "WebSocket connection rate limit exceeded",
    },
  },

  [RateLimitServiceType.BYTEBOT_UI]: {
    [RateLimitPreset.AUTH]: {
      max: 10, // Lenient for UI authentication
      windowMs: 15 * 60 * 1000, // 15 minutes
      message: "Authentication rate limit exceeded",
    },
    [RateLimitPreset.COMPUTER_USE]: {
      max: 200, // High limit for UI interactions
      windowMs: 60 * 1000, // 1 minute
      message: "UI interaction rate limit exceeded",
    },
    [RateLimitPreset.TASK_OPERATIONS]: {
      max: 200, // High limit for UI task interactions
      windowMs: 60 * 1000, // 1 minute
      message: "Task interaction rate limit exceeded",
    },
    [RateLimitPreset.READ_OPERATIONS]: {
      max: 1000, // Very high read limits for UI
      windowMs: 60 * 1000, // 1 minute
      message: "Read operation rate limit exceeded",
    },
    [RateLimitPreset.WEBSOCKET]: {
      max: 50, // High WebSocket limits for real-time UI
      windowMs: 60 * 1000, // 1 minute
      message: "WebSocket connection rate limit exceeded",
    },
  },

  [RateLimitServiceType.SHARED]: {
    // Default limits for shared utilities
    ...DEFAULT_RATE_LIMITS,
  },
};

/**
 * Rate limiting decorator metadata
 */
export const STANDARDIZED_RATE_LIMIT_KEY = "standardized_rate_limit";

/**
 * Enhanced rate limiting decorator for method-level limits
 * @param preset - Rate limit preset or custom config
 * @param serviceType - Service type for profile selection
 */
export const StandardizedRateLimit = (
  preset: RateLimitPreset | RateLimitConfig,
  serviceType?: RateLimitServiceType,
) => Reflect.metadata(STANDARDIZED_RATE_LIMIT_KEY, { preset, serviceType });

@Injectable()
export class StandardizedRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(StandardizedRateLimitGuard.name);
  private redis: Redis;
  private readonly serviceType: RateLimitServiceType;
  private readonly rateLimitConfigs: Record<RateLimitPreset, RateLimitConfig>;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    @Inject("REDIS_CLIENT") private redisClient?: Redis,
    serviceType: RateLimitServiceType = RateLimitServiceType.SHARED,
  ) {
    this.serviceType = serviceType;

    // Initialize Redis client
    this.redis =
      redisClient ||
      new Redis({
        host: this.configService.get("REDIS_HOST", "localhost"),
        port: this.configService.get("REDIS_PORT", 6379),
        password: this.configService.get("REDIS_PASSWORD"),
        db: this.configService.get("REDIS_DB", 2), // Use DB 2 for rate limiting
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keyPrefix: `rl:${serviceType}:`,
      });

    // Set up service-specific rate limits
    this.rateLimitConfigs = {
      ...SERVICE_RATE_LIMITS[serviceType],
      // Override with configuration if provided
      ...this.configService.get(`rateLimiting.${serviceType}`, {}),
    };

    this.logger.log(
      `Standardized rate limit guard initialized for ${serviceType}`,
      {
        serviceType,
        redisHost: this.configService.get("REDIS_HOST", "localhost"),
        redisPort: this.configService.get("REDIS_PORT", 6379),
        availablePresets: Object.keys(this.rateLimitConfigs),
      },
    );
  }

  /**
   * Check if request should be allowed based on standardized rate limiting
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const operationId = `rate-limit-${this.serviceType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      const request = context.switchToHttp().getRequest<Request>();
      const response = context.switchToHttp().getResponse<Response>();

      // Get rate limit configuration for this endpoint
      const rateLimitConfig = this.getRateLimitConfig(context);

      if (!rateLimitConfig) {
        // No rate limiting configured for this endpoint
        return true;
      }

      this.logger.debug(
        `[${operationId}] Checking rate limit for ${this.serviceType}`,
        {
          operationId,
          serviceType: this.serviceType,
          method: request.method,
          url: request.url,
          ip: request.ip,
          userAgent: request.get("User-Agent"),
          authenticated: !!request.user,
        },
      );

      // Generate service-specific rate limit key
      const key = this.generateServiceRateLimitKey(request, rateLimitConfig);

      // Check and update rate limit state
      const rateLimitInfo = await this.checkServiceRateLimit(
        key,
        rateLimitConfig,
        request,
        operationId,
      );

      // Set standardized rate limit headers
      this.setStandardizedRateLimitHeaders(response, rateLimitInfo);

      // Allow request if under limit
      if (rateLimitInfo.remaining >= 0) {
        const processingTime = Date.now() - startTime;

        this.logger.debug(
          `[${operationId}] Rate limit check passed for ${this.serviceType}`,
          {
            operationId,
            serviceType: this.serviceType,
            securityLevel: rateLimitInfo.securityLevel,
            key: key.substring(0, 30) + "...",
            limit: rateLimitInfo.limit,
            remaining: rateLimitInfo.remaining,
            resetTime: rateLimitInfo.resetTime,
            processingTimeMs: processingTime,
          },
        );

        return true;
      }

      // Rate limit exceeded
      const processingTime = Date.now() - startTime;

      this.logger.warn(
        `[${operationId}] Rate limit exceeded for ${this.serviceType}`,
        {
          operationId,
          serviceType: this.serviceType,
          securityLevel: rateLimitInfo.securityLevel,
          key: key.substring(0, 30) + "...",
          limit: rateLimitInfo.limit,
          remaining: rateLimitInfo.remaining,
          resetTime: rateLimitInfo.resetTime,
          retryAfter: rateLimitInfo.retryAfter,
          processingTimeMs: processingTime,
          ip: request.ip,
          userAgent: request.get("User-Agent"),
        },
      );

      // Log security event
      await this.logRateLimitSecurityEvent(request, rateLimitInfo, operationId);

      // Return enhanced rate limit error
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded for ${this.serviceType}`,
          error: "Too Many Requests",
          serviceType: this.serviceType,
          securityLevel: rateLimitInfo.securityLevel,
          rateLimitInfo: {
            limit: rateLimitInfo.limit,
            remaining: rateLimitInfo.remaining,
            resetTime: rateLimitInfo.resetTime,
            retryAfter: rateLimitInfo.retryAfter,
            preset: rateLimitInfo.preset,
          },
          operationId,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `[${operationId}] Rate limiting error for ${this.serviceType}`,
        {
          operationId,
          serviceType: this.serviceType,
          error: error.message,
          stack: error.stack,
          processingTimeMs: processingTime,
        },
      );

      // Allow request on rate limiting system failure
      return true;
    }
  }

  /**
   * Get rate limit configuration for the current context
   */
  private getRateLimitConfig(
    context: ExecutionContext,
  ): RateLimitConfig | null {
    // Check method-level decorator
    const methodRateLimit = this.reflector.get<{
      preset: RateLimitPreset | RateLimitConfig;
      serviceType?: RateLimitServiceType;
    }>(STANDARDIZED_RATE_LIMIT_KEY, context.getHandler());

    if (methodRateLimit) {
      const { preset, serviceType } = methodRateLimit;

      // Use service-specific config if provided
      const targetService = serviceType || this.serviceType;
      const configs =
        SERVICE_RATE_LIMITS[targetService] || this.rateLimitConfigs;

      return typeof preset === "string" ? configs[preset] : preset;
    }

    // Check class-level decorator
    const classRateLimit = this.reflector.get<{
      preset: RateLimitPreset | RateLimitConfig;
      serviceType?: RateLimitServiceType;
    }>(STANDARDIZED_RATE_LIMIT_KEY, context.getClass());

    if (classRateLimit) {
      const { preset, serviceType } = classRateLimit;

      // Use service-specific config if provided
      const targetService = serviceType || this.serviceType;
      const configs =
        SERVICE_RATE_LIMITS[targetService] || this.rateLimitConfigs;

      return typeof preset === "string" ? configs[preset] : preset;
    }

    // Default rate limiting based on service type and endpoint
    const request = context.switchToHttp().getRequest<Request>();

    return this.getDefaultRateLimitForEndpoint(request);
  }

  /**
   * Get default rate limit configuration based on endpoint and service type
   */
  private getDefaultRateLimitForEndpoint(
    request: Request,
  ): RateLimitConfig | null {
    const url = request.url.toLowerCase();

    // Authentication endpoints
    if (url.includes("/auth/")) {
      return this.rateLimitConfigs[RateLimitPreset.AUTH];
    }

    // Computer control endpoints
    if (url.includes("/computer-use/") || url.includes("/computer/")) {
      return this.rateLimitConfigs[RateLimitPreset.COMPUTER_USE];
    }

    // Task endpoints
    if (url.includes("/tasks/")) {
      return this.rateLimitConfigs[RateLimitPreset.TASK_OPERATIONS];
    }

    // WebSocket endpoints
    if (url.includes("/websocket") || url.includes("/socket.io")) {
      return this.rateLimitConfigs[RateLimitPreset.WEBSOCKET];
    }

    // Default for read operations
    if (request.method === "GET" || request.method === "HEAD") {
      return this.rateLimitConfigs[RateLimitPreset.READ_OPERATIONS];
    }

    // Apply moderate limits for unknown endpoints based on service type
    switch (this.serviceType) {
      case RateLimitServiceType.BYTEBOTD:
        return {
          max: 30,
          windowMs: 60 * 1000,
          message: "Request rate limit exceeded for computer control service",
        };
      case RateLimitServiceType.BYTEBOT_AGENT:
        return {
          max: 60,
          windowMs: 60 * 1000,
          message: "Request rate limit exceeded for task management service",
        };
      case RateLimitServiceType.BYTEBOT_UI:
        return {
          max: 120,
          windowMs: 60 * 1000,
          message: "Request rate limit exceeded for UI service",
        };
      default:
        return null;
    }
  }

  /**
   * Generate service-specific rate limiting key
   */
  private generateServiceRateLimitKey(
    request: Request,
    config: RateLimitConfig,
  ): string {
    // Use custom key generator if provided
    if (config.keyGenerator) {
      return `${this.serviceType}:${config.keyGenerator(request)}`;
    }

    // Default service-aware key generation
    const ip = request.ip || request.connection.remoteAddress || "unknown";
    const userId = (request as any).user?.id || "anonymous";
    const endpoint = request.route?.path || request.url;
    const method = request.method;

    return `${this.serviceType}:${ip}:${userId}:${method}:${endpoint}`;
  }

  /**
   * Check and update service-specific rate limit state
   */
  private async checkServiceRateLimit(
    key: string,
    config: RateLimitConfig,
    request: Request,
    operationId: string,
  ): Promise<StandardizedRateLimitInfo> {
    const now = Date.now();
    const windowMs = config.windowMs;
    const limit = config.max;
    const isAuthenticated = !!(request as any).user;

    // Determine security level based on service type and limit
    let securityLevel: "strict" | "moderate" | "lenient" = "moderate";

    switch (this.serviceType) {
      case RateLimitServiceType.BYTEBOTD:
        securityLevel = limit <= 50 ? "strict" : "moderate";
        break;
      case RateLimitServiceType.BYTEBOT_AGENT:
        securityLevel = limit <= 100 ? "moderate" : "lenient";
        break;
      case RateLimitServiceType.BYTEBOT_UI:
        securityLevel = limit <= 200 ? "moderate" : "lenient";
        break;
    }

    try {
      // Get current state from Redis
      const stateData = await this.redis.get(key);
      let state: StandardizedRateLimitState = stateData
        ? JSON.parse(stateData)
        : {
            count: 0,
            windowStart: now,
            totalRequests: 0,
            lastRequest: now,
            userAgent: request.get("User-Agent"),
            suspiciousScore: 0,
            serviceType: this.serviceType,
          };

      // Check if we need to reset the window
      if (now - state.windowStart >= windowMs) {
        // Reset window
        state = {
          ...state,
          count: 0,
          windowStart: now,
          burstCount: 0,
          burstWindowStart: now,
        };
      }

      // Update state
      state.count += 1;
      state.totalRequests += 1;
      state.lastRequest = now;

      // Enhanced burst detection for service-specific patterns
      const burstWindow = windowMs * 0.1; // 10% of window
      const burstThreshold = this.getBurstThreshold(limit, securityLevel);

      if (
        !state.burstWindowStart ||
        now - state.burstWindowStart >= burstWindow
      ) {
        state.burstCount = 1;
        state.burstWindowStart = now;
      } else {
        state.burstCount = (state.burstCount || 0) + 1;
      }

      // Service-specific suspicious activity detection
      if (state.burstCount >= burstThreshold) {
        state.suspiciousScore =
          (state.suspiciousScore || 0) +
          this.getSuspiciousScoreIncrement(securityLevel);

        this.logger.warn(
          `[${operationId}] Burst activity detected for ${this.serviceType}`,
          {
            operationId,
            serviceType: this.serviceType,
            securityLevel,
            key: key.substring(0, 30) + "...",
            burstCount: state.burstCount,
            burstThreshold,
            suspiciousScore: state.suspiciousScore,
          },
        );
      }

      // Track consecutive limit hits
      if (state.count > limit) {
        state.limitHits = (state.limitHits || 0) + 1;
        state.suspiciousScore =
          (state.suspiciousScore || 0) +
          this.getSuspiciousScoreIncrement(securityLevel);
      } else {
        state.limitHits = 0;
      }

      // Save state to Redis with TTL
      const ttl = Math.ceil(windowMs / 1000) + 60; // Window + 60 seconds buffer
      await this.redis.setex(key, ttl, JSON.stringify(state));

      // Calculate rate limit info
      const remaining = Math.max(0, limit - state.count);
      const resetTime = Math.ceil((state.windowStart + windowMs) / 1000);
      const retryAfter =
        remaining === 0
          ? Math.ceil((state.windowStart + windowMs - now) / 1000)
          : undefined;

      return {
        limit,
        remaining,
        resetTime,
        retryAfter,
        preset: this.getPresetName(config),
        authenticated: isAuthenticated,
        serviceType: this.serviceType,
        securityLevel,
      };
    } catch (redisError) {
      this.logger.error(
        `[${operationId}] Redis error in rate limiting for ${this.serviceType}`,
        {
          operationId,
          serviceType: this.serviceType,
          error: redisError.message,
          key: key.substring(0, 30) + "...",
        },
      );

      // Fallback to allow request if Redis fails
      return {
        limit,
        remaining: limit - 1,
        resetTime: Math.ceil((now + windowMs) / 1000),
        preset: "fallback",
        authenticated: isAuthenticated,
        serviceType: this.serviceType,
        securityLevel,
      };
    }
  }

  /**
   * Get burst threshold based on limit and security level
   */
  private getBurstThreshold(
    limit: number,
    securityLevel: "strict" | "moderate" | "lenient",
  ): number {
    switch (securityLevel) {
      case "strict":
        return Math.ceil(limit * 0.3); // 30% of limit
      case "moderate":
        return Math.ceil(limit * 0.5); // 50% of limit
      case "lenient":
        return Math.ceil(limit * 0.7); // 70% of limit
      default:
        return Math.ceil(limit * 0.5);
    }
  }

  /**
   * Get suspicious score increment based on security level
   */
  private getSuspiciousScoreIncrement(
    securityLevel: "strict" | "moderate" | "lenient",
  ): number {
    switch (securityLevel) {
      case "strict":
        return 15; // Higher penalties for strict services
      case "moderate":
        return 10; // Standard penalties
      case "lenient":
        return 5; // Lower penalties for UI services
      default:
        return 10;
    }
  }

  /**
   * Set standardized rate limit headers with service information
   */
  private setStandardizedRateLimitHeaders(
    response: Response,
    rateLimitInfo: StandardizedRateLimitInfo,
  ): void {
    response.set({
      "X-RateLimit-Limit": rateLimitInfo.limit.toString(),
      "X-RateLimit-Remaining": rateLimitInfo.remaining.toString(),
      "X-RateLimit-Reset": rateLimitInfo.resetTime.toString(),
      "X-RateLimit-Policy": rateLimitInfo.preset,
      "X-RateLimit-Authenticated": rateLimitInfo.authenticated.toString(),
      "X-RateLimit-Service": rateLimitInfo.serviceType,
      "X-RateLimit-Security-Level": rateLimitInfo.securityLevel,
    });

    if (rateLimitInfo.retryAfter) {
      response.set("Retry-After", rateLimitInfo.retryAfter.toString());
    }
  }

  /**
   * Get preset name for configuration
   */
  private getPresetName(config: RateLimitConfig): string {
    for (const [preset, presetConfig] of Object.entries(
      this.rateLimitConfigs,
    )) {
      if (
        presetConfig.max === config.max &&
        presetConfig.windowMs === config.windowMs
      ) {
        return preset;
      }
    }
    return "custom";
  }

  /**
   * Log security event for rate limit violation
   */
  private async logRateLimitSecurityEvent(
    request: Request,
    rateLimitInfo: StandardizedRateLimitInfo,
    operationId: string,
  ): Promise<void> {
    try {
      const securityEvent = createSecurityEvent(
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        request.url,
        request.method,
        false,
        `Rate limit exceeded for ${rateLimitInfo.serviceType}: ${rateLimitInfo.limit} requests per window`,
        {
          operationId,
          serviceType: rateLimitInfo.serviceType,
          securityLevel: rateLimitInfo.securityLevel,
          limit: rateLimitInfo.limit,
          remaining: rateLimitInfo.remaining,
          resetTime: rateLimitInfo.resetTime,
          retryAfter: rateLimitInfo.retryAfter,
          preset: rateLimitInfo.preset,
          authenticated: rateLimitInfo.authenticated,
          endpoint: request.url,
          method: request.method,
        },
        (request as any).user?.id,
        request.ip,
        request.get("User-Agent"),
      );

      this.logger.warn(
        `Rate limit security event for ${rateLimitInfo.serviceType}: ${securityEvent.eventId}`,
        {
          eventId: securityEvent.eventId,
          riskScore: securityEvent.riskScore,
          serviceType: rateLimitInfo.serviceType,
          securityLevel: rateLimitInfo.securityLevel,
          operationId,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to log rate limit security event for ${this.serviceType}`,
        {
          operationId,
          serviceType: this.serviceType,
          error: error.message,
        },
      );
    }
  }

  /**
   * Get current service type
   */
  getServiceType(): RateLimitServiceType {
    return this.serviceType;
  }

  /**
   * Get rate limit configuration for debugging
   */
  getRateLimitConfigs(): Record<RateLimitPreset, RateLimitConfig> {
    return { ...this.rateLimitConfigs };
  }

  /**
   * Factory methods for creating service-specific rate limit guards
   */
  static createBytebotDGuard(
    reflector: Reflector,
    configService: ConfigService,
    redisClient?: Redis,
  ): StandardizedRateLimitGuard {
    return new StandardizedRateLimitGuard(
      reflector,
      configService,
      redisClient,
      RateLimitServiceType.BYTEBOTD,
    );
  }

  static createBytebotAgentGuard(
    reflector: Reflector,
    configService: ConfigService,
    redisClient?: Redis,
  ): StandardizedRateLimitGuard {
    return new StandardizedRateLimitGuard(
      reflector,
      configService,
      redisClient,
      RateLimitServiceType.BYTEBOT_AGENT,
    );
  }

  static createBytebotUIGuard(
    reflector: Reflector,
    configService: ConfigService,
    redisClient?: Redis,
  ): StandardizedRateLimitGuard {
    return new StandardizedRateLimitGuard(
      reflector,
      configService,
      redisClient,
      RateLimitServiceType.BYTEBOT_UI,
    );
  }
}

export default StandardizedRateLimitGuard;
