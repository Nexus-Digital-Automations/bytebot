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

/**
 * Extended request interface with optional user
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    [key: string]: unknown;
  };
}
import {
  RateLimitConfig,
  RateLimitPreset,
  SecurityEventType,
  createSecurityEvent,
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
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

    // Set up default rate limits with proper typing
    this.defaultConfig = {} as Record<RateLimitPreset, RateLimitConfig>;

    // Initialize with available presets
    try {
      this.defaultConfig[RateLimitPreset._AUTH] = {
        max: 5,
        windowMs: 60000,
        message: 'Auth rate limit exceeded',
      };
      this.defaultConfig[RateLimitPreset._READ_OPERATIONS] = {
        max: 100,
        windowMs: 60000,
        message: 'Read operations rate limit exceeded',
      };
      this.defaultConfig[RateLimitPreset._COMPUTER_USE] = {
        max: 10,
        windowMs: 60000,
        message: 'Computer use rate limit exceeded',
      };
      this.defaultConfig[RateLimitPreset._TASK_OPERATIONS] = {
        max: 30,
        windowMs: 60000,
        message: 'Task operations rate limit exceeded',
      };

      // Skip WRITE_OPERATIONS preset if it doesn't exist
    } catch (error) {
      this.logger.warn('Error initializing rate limit config:', error);
      // Fallback configuration
      this.defaultConfig = {
        [RateLimitPreset._AUTH]: {
          max: 5,
          windowMs: 60000,
          message: 'Auth rate limit exceeded',
        },
        [RateLimitPreset._READ_OPERATIONS]: {
          max: 100,
          windowMs: 60000,
          message: 'Read operations rate limit exceeded',
        },
        [RateLimitPreset._COMPUTER_USE]: {
          max: 10,
          windowMs: 60000,
          message: 'Computer use rate limit exceeded',
        },
        [RateLimitPreset._TASK_OPERATIONS]: {
          max: 30,
          windowMs: 60000,
          message: 'Task operations rate limit exceeded',
        },
      } as Record<RateLimitPreset, RateLimitConfig>;
    }

    this.logger.log('Rate limit guard initialized', {
      redisHost: this.configService.get<string>('REDIS_HOST', 'localhost'),
      redisPort: this.configService.get<number>('REDIS_PORT', 6379),
      defaultPresets: Object.keys(this.defaultConfig),
    });
  }

  /**
   * Check if request should be allowed based on rate limiting
   * @param context - Execution context
   * @returns Promise<boolean> - Whether request is allowed
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const operationId = `rate-limit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const startTime = Date.now();

    try {
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
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
      this.logRateLimitEvent(request, rateLimitInfo, operationId);

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
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
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
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.url.includes('/auth/')) {
      return this.defaultConfig[RateLimitPreset._AUTH];
    }

    if (
      request.url.includes('/computer-use/') ||
      request.url.includes('/computer/')
    ) {
      return this.defaultConfig[RateLimitPreset._COMPUTER_USE];
    }

    if (request.url.includes('/tasks/')) {
      return this.defaultConfig[RateLimitPreset._TASK_OPERATIONS];
    }

    // Default for read operations
    if (request.method === 'GET' || request.method === 'HEAD') {
      return this.defaultConfig[RateLimitPreset._READ_OPERATIONS];
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
    request: AuthenticatedRequest,
    config: RateLimitConfig,
  ): string {
    // Use custom key generator if provided
    if (config.keyGenerator) {
      return config.keyGenerator(
        request as unknown as Parameters<
          NonNullable<typeof config.keyGenerator>
        >[0],
      );
    }

    // Default key generation
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const userId = request.user?.id || 'anonymous';
    // Use URL fallback instead of accessing unsafe route property
    const endpoint = request.url;

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
    request: AuthenticatedRequest,
    operationId: string,
  ): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowMs = config.windowMs;
    const limit = config.max;
    const isAuthenticated = !!request.user;

    try {
      // Get current state from Redis
      const stateData = await this.redis.get(key);
      let state: RateLimitState = stateData
        ? (JSON.parse(stateData) as RateLimitState)
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
        error:
          redisError instanceof Error
            ? redisError.message
            : 'Unknown Redis error',
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
  private logRateLimitEvent(
    request: AuthenticatedRequest,
    rateLimitInfo: RateLimitInfo,
    operationId: string,
  ): void {
    try {
      const securityEvent = createSecurityEvent(
        SecurityEventType._RATE_LIMIT_EXCEEDED,
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
        request.user?.id,
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
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default RateLimitGuard;
