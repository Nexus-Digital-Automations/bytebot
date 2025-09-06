/**
 * Rate Limiting Guard - Enterprise API Rate Limiting & Throttling
 *
 * This guard provides sophisticated rate limiting with Redis backing store,
 * different limits for authenticated vs anonymous users, burst protection,
 * and intelligent threat detection based on request patterns.
 *
 * @fileoverview Enterprise-grade rate limiting guard with Redis and threat detection
 * @version 1.0.0
 * @author API Rate Limiting & Throttling Specialist
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import Redis from 'ioredis';
import {
  RateLimitConfig,
  RateLimitPreset,
  SecurityEventType,
  createSecurityEvent,
  generateRateLimitKey,
  DEFAULT_RATE_LIMITS,
} from '@bytebot/shared';

/**
 * Rate limit information for client headers
 */
interface RateLimitInfo {
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
}

/**
 * Rate limit state stored in Redis
 */
interface RateLimitState {
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
}

/**
 * Rate limiting decorator metadata
 */
export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * Rate limiting decorator for method-level limits
 * @param preset - Rate limit preset or custom config
 */
export const RateLimit = (preset: RateLimitPreset | RateLimitConfig) =>
  Reflect.metadata(RATE_LIMIT_KEY, preset);

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private redis: Redis;
  private readonly defaultConfig: Record<RateLimitPreset, RateLimitConfig>;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    @Inject('REDIS_CLIENT') private redisClient?: Redis,
  ) {
    // Initialize Redis client
    this.redis =
      redisClient ||
      new Redis({
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
        password: this.configService.get('REDIS_PASSWORD'),
        db: this.configService.get('REDIS_DB', 1),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

    // Set up default rate limits
    this.defaultConfig = {
      ...DEFAULT_RATE_LIMITS,
      // Override with configuration if provided
      ...this.configService.get('rateLimiting', {}),
    };

    this.logger.log('Rate limit guard initialized', {
      redisHost: this.configService.get('REDIS_HOST', 'localhost'),
      redisPort: this.configService.get('REDIS_PORT', 6379),
      defaultPresets: Object.keys(this.defaultConfig),
    });
  }

  /**
   * Check if request should be allowed based on rate limiting
   * @param context - Execution context
   * @returns Promise<boolean> - Whether request is allowed
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const operationId = `rate-limit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

      this.logger.debug(`[${operationId}] Checking rate limit`, {
        operationId,
        method: request.method,
        url: request.url,
        ip: request.ip,
        userAgent: request.get('User-Agent'),
        authenticated: !!request.user,
      });

      // Generate rate limit key
      const key = this.generateRateLimitKey(request, rateLimitConfig);

      // Check and update rate limit state
      const rateLimitInfo = await this.checkRateLimit(
        key,
        rateLimitConfig,
        request,
        operationId,
      );

      // Set rate limit headers
      this.setRateLimitHeaders(response, rateLimitInfo);

      // Allow request if under limit
      if (rateLimitInfo.remaining >= 0) {
        const processingTime = Date.now() - startTime;

        this.logger.debug(`[${operationId}] Rate limit check passed`, {
          operationId,
          key: key.substring(0, 20) + '...',
          limit: rateLimitInfo.limit,
          remaining: rateLimitInfo.remaining,
          resetTime: rateLimitInfo.resetTime,
          processingTimeMs: processingTime,
        });

        return true;
      }

      // Rate limit exceeded
      const processingTime = Date.now() - startTime;

      this.logger.warn(`[${operationId}] Rate limit exceeded`, {
        operationId,
        key: key.substring(0, 20) + '...',
        limit: rateLimitInfo.limit,
        remaining: rateLimitInfo.remaining,
        resetTime: rateLimitInfo.resetTime,
        retryAfter: rateLimitInfo.retryAfter,
        processingTimeMs: processingTime,
        ip: request.ip,
        userAgent: request.get('User-Agent'),
      });

      // Log security event
      await this.logRateLimitEvent(request, rateLimitInfo, operationId);

      // Return rate limit error
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
          error: 'Too Many Requests',
          rateLimitInfo: {
            limit: rateLimitInfo.limit,
            remaining: rateLimitInfo.remaining,
            resetTime: rateLimitInfo.resetTime,
            retryAfter: rateLimitInfo.retryAfter,
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

      this.logger.error(`[${operationId}] Rate limiting error`, {
        operationId,
        error: error.message,
        stack: error.stack,
        processingTimeMs: processingTime,
      });

      // Allow request on rate limiting system failure
      return true;
    }
  }

  /**
   * Get rate limit configuration for the current context
   * @param context - Execution context
   * @returns Rate limit configuration or null
   */
  private getRateLimitConfig(
    context: ExecutionContext,
  ): RateLimitConfig | null {
    // Check method-level decorator
    const methodRateLimit = this.reflector.get<
      RateLimitPreset | RateLimitConfig
    >(RATE_LIMIT_KEY, context.getHandler());

    if (methodRateLimit) {
      return typeof methodRateLimit === 'string'
        ? this.defaultConfig[methodRateLimit]
        : methodRateLimit;
    }

    // Check class-level decorator
    const classRateLimit = this.reflector.get<
      RateLimitPreset | RateLimitConfig
    >(RATE_LIMIT_KEY, context.getClass());

    if (classRateLimit) {
      return typeof classRateLimit === 'string'
        ? this.defaultConfig[classRateLimit]
        : classRateLimit;
    }

    // Default rate limiting based on endpoint type
    const request = context.switchToHttp().getRequest<Request>();

    if (request.url.includes('/auth/')) {
      return this.defaultConfig[RateLimitPreset.AUTH];
    }

    if (
      request.url.includes('/computer-use/') ||
      request.url.includes('/computer/')
    ) {
      return this.defaultConfig[RateLimitPreset.COMPUTER_USE];
    }

    if (request.url.includes('/tasks/')) {
      return this.defaultConfig[RateLimitPreset.TASK_OPERATIONS];
    }

    // Default for read operations
    if (request.method === 'GET' || request.method === 'HEAD') {
      return this.defaultConfig[RateLimitPreset.READ_OPERATIONS];
    }

    return null;
  }

  /**
   * Generate rate limiting key for request
   * @param request - Express request object
   * @param config - Rate limit configuration
   * @returns Rate limiting key
   */
  private generateRateLimitKey(
    request: Request,
    config: RateLimitConfig,
  ): string {
    // Use custom key generator if provided
    if (config.keyGenerator) {
      return config.keyGenerator(request);
    }

    // Default key generation
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const userId = (request as any).user?.id || 'anonymous';
    const endpoint = request.route?.path || request.url;

    return `rl:${ip}:${userId}:${endpoint}`;
  }

  /**
   * Check and update rate limit state in Redis
   * @param key - Rate limit key
   * @param config - Rate limit configuration
   * @param request - Express request
   * @param operationId - Operation ID for tracking
   * @returns Rate limit information
   */
  private async checkRateLimit(
    key: string,
    config: RateLimitConfig,
    request: Request,
    operationId: string,
  ): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowMs = config.windowMs;
    const limit = config.max;
    const isAuthenticated = !!(request as any).user;

    try {
      // Get current state from Redis
      const stateData = await this.redis.get(key);
      let state: RateLimitState = stateData
        ? JSON.parse(stateData)
        : {
            count: 0,
            windowStart: now,
            totalRequests: 0,
            lastRequest: now,
            userAgent: request.get('User-Agent'),
            suspiciousScore: 0,
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

      // Burst detection (more than 50% of limit in 10% of window)
      const burstWindow = windowMs * 0.1; // 10% of window
      if (
        !state.burstWindowStart ||
        now - state.burstWindowStart >= burstWindow
      ) {
        state.burstCount = 1;
        state.burstWindowStart = now;
      } else {
        state.burstCount = (state.burstCount || 0) + 1;
      }

      // Suspicious activity detection
      const burstThreshold = Math.ceil(limit * 0.5); // 50% of limit in burst window
      if (state.burstCount >= burstThreshold) {
        state.suspiciousScore = (state.suspiciousScore || 0) + 10;

        this.logger.warn(`[${operationId}] Burst activity detected`, {
          operationId,
          key: key.substring(0, 20) + '...',
          burstCount: state.burstCount,
          burstThreshold,
          suspiciousScore: state.suspiciousScore,
        });
      }

      // Track consecutive limit hits
      if (state.count > limit) {
        state.limitHits = (state.limitHits || 0) + 1;
        state.suspiciousScore = (state.suspiciousScore || 0) + 5;
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
      };
    } catch (redisError) {
      this.logger.error(`[${operationId}] Redis error in rate limiting`, {
        operationId,
        error: redisError.message,
        key: key.substring(0, 20) + '...',
      });

      // Fallback to allow request if Redis fails
      return {
        limit,
        remaining: limit - 1,
        resetTime: Math.ceil((now + windowMs) / 1000),
        preset: 'fallback',
        authenticated: isAuthenticated,
      };
    }
  }

  /**
   * Set rate limit headers on response
   * @param response - Express response object
   * @param rateLimitInfo - Rate limit information
   */
  private setRateLimitHeaders(
    response: Response,
    rateLimitInfo: RateLimitInfo,
  ): void {
    response.set({
      'X-RateLimit-Limit': rateLimitInfo.limit.toString(),
      'X-RateLimit-Remaining': rateLimitInfo.remaining.toString(),
      'X-RateLimit-Reset': rateLimitInfo.resetTime.toString(),
      'X-RateLimit-Policy': rateLimitInfo.preset,
      'X-RateLimit-Authenticated': rateLimitInfo.authenticated.toString(),
    });

    if (rateLimitInfo.retryAfter) {
      response.set('Retry-After', rateLimitInfo.retryAfter.toString());
    }
  }

  /**
   * Get preset name for configuration
   * @param config - Rate limit configuration
   * @returns Preset name or 'custom'
   */
  private getPresetName(config: RateLimitConfig): string {
    for (const [preset, presetConfig] of Object.entries(this.defaultConfig)) {
      if (
        presetConfig.max === config.max &&
        presetConfig.windowMs === config.windowMs
      ) {
        return preset;
      }
    }
    return 'custom';
  }

  /**
   * Log security event for rate limit violation
   * @param request - Express request
   * @param rateLimitInfo - Rate limit info
   * @param operationId - Operation ID
   */
  private async logRateLimitEvent(
    request: Request,
    rateLimitInfo: RateLimitInfo,
    operationId: string,
  ): Promise<void> {
    try {
      const securityEvent = createSecurityEvent(
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        request.url,
        request.method,
        false,
        `Rate limit exceeded: ${rateLimitInfo.limit} requests per window`,
        {
          operationId,
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
        request.get('User-Agent'),
      );

      this.logger.warn(`Rate limit security event: ${securityEvent.eventId}`, {
        eventId: securityEvent.eventId,
        riskScore: securityEvent.riskScore,
        operationId,
      });
    } catch (error) {
      this.logger.error('Failed to log rate limit security event', {
        operationId,
        error: error.message,
      });
    }
  }
}

export default RateLimitGuard;
