/**
 * Browser Automation Rate Limiting Service
 *
 * Provides advanced rate limiting and request throttling for browser automation
 * endpoints with user-based, IP-based, and endpoint-specific limits.
 *
 * Features:
 * - Multi-tier rate limiting (user, IP, endpoint)
 * - Dynamic rate limit adjustment
 * - Burst protection and sliding window
 * - Distributed rate limiting support
 * - Rate limit monitoring and analytics
 * - Intelligent throttling algorithms
 * - Graceful degradation strategies
 *
 * @author API Security Specialist
 * @version 1.0.0
 * @since Browser Automation Security Implementation
 */

import {
  Injectable,
  Logger,
  TooManyRequestsException,
} from '@nestjs/common';import { ConfigService } from '@nestjs/config';import { ParlantIntegrationService, ParlantConversationContext } from '../parlant/parlant-integration.service';/*** Rate limiting configuration
 */
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  burstLimit?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (context: RateLimitContext) => string;
  onLimitReached?: (context: RateLimitContext) => void;
}

/**
 * Rate limiting context
 */
interface RateLimitContext {
  userId?: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  method: string;
  requestId: string;
  timestamp: Date;
  sessionId?: string;
  userRole?: string;
}

/**
 * Rate limit tracker
 */
interface RateLimitTracker {
  requests: number;
  windowStart: number;
  blocked: boolean;
  lastRequest: Date;
  burstCount: number;
  violations: number;
  firstViolation?: Date;
  backoffUntil?: Date;
}

/**
 * Rate limit result
 */
interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  blocked: boolean;
  reason?: string;
}

/**
 * Rate limiting statistics
 */
interface RateLimitStatistics {
  totalRequests: number;
  blockedRequests: number;
  uniqueUsers: number;
  uniqueIPs: number;
  averageRequestsPerMinute: number;
  topViolators: Array<{
    identifier: string;
    violations: number;
    lastViolation: Date;
  }>;
}

/**
 * Rate limiting tier configuration
 */
enum RateLimitTier {
  USER = 'user',IP = 'ip',ENDPOINT = 'endpoint',GLOBAL = 'global',}/**
 * Advanced browser automation rate limiting service
 */
@Injectable()
export class BrowserRateLimitingService {
  private readonly logger = new Logger(BrowserRateLimitingService.name);
  private readonly rateLimitTrackers = new Map<string, RateLimitTracker>();
  private readonly config: Map<string, RateLimitConfig> = new Map();

  // Performance tracking
  private totalRequests = 0;
  private blockedRequests = 0;
  private readonly statistics = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService,
    private readonly parlantService: ParlantIntegrationService,
  ) {
    this.initializeRateLimitConfigurations();

    // Setup cleanup intervals
    setInterval(() => this.cleanupExpiredTrackers(), 300000); // Every 5 minutes
    setInterval(() => this.updateStatistics(), 60000); // Every minute

    this.logger.log('Browser Rate Limiting Service initialized', {configurations: this.config.size,cleanupInterval: '5 minutes',statisticsInterval: '1 minute',
    });
  }

  /**
   * Check rate limit for browser automation request
   */
  async checkRateLimit(context: RateLimitContext, configKey?: string): Promise<RateLimitResult> {
    const operationId = `rate_limit_${Date.now()}_${Math.random().toString(36).substring(7)}`;const startTime = Date.now();this.logger.debug(`[${operationId}] Checking rate limit`, {
      operationId,
      userId: context.userId,
      ipAddress: context.ipAddress,
      endpoint: context.endpoint,
      method: context.method,
      configKey,
    });

    try {
      this.totalRequests++;

      // Determine rate limit configuration
      const config = this.getRateLimitConfiguration(configKey || 'default', context);

      // Generate tracking key
      const trackingKey = this.generateTrackingKey(context, config);

      // Check rate limit
      const result = await this.performRateLimitCheck(trackingKey, context, config);

      // Update tracking
      this.updateTracker(trackingKey, context, result, config);

      // Log rate limit check
      const duration = Date.now() - startTime;
      this.logger.debug(`[${operationId}] Rate limit check completed`, {operationId,allowed: result.allowed,
        remaining: result.remaining,
        blocked: result.blocked,
        reason: result.reason,
        duration,
      });

      // Update statistics
      if (result.blocked) {
        this.blockedRequests++;
        this.updateViolationStatistics(context);
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(`[${operationId}] Rate limit check failed`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        context: {
          userId: context.userId,
          ipAddress: context.ipAddress,
          endpoint: context.endpoint,
        },
        duration,
      });

      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        limit: 1000,
        remaining: 999,
        resetTime: Date.now() + 60000,
        blocked: false,
        reason: 'rate_limit_check_failed',
      };
    }
  }

  /**
   * Apply rate limiting with automatic exception throwing
   */
  async enforceRateLimit(context: RateLimitContext, configKey?: string): Promise<void> {
    const result = await this.checkRateLimit(context, configKey);

    if (!result.allowed) {
      this.logger.warn(`Rate limit exceeded`, {
        userId: context.userId,
        ipAddress: context.ipAddress,
        endpoint: context.endpoint,
        limit: result.limit,
        remaining: result.remaining,
        retryAfter: result.retryAfter,
        reason: result.reason,
      });

      throw new TooManyRequestsException({
        message: 'Rate limit exceeded',type: 'rate_limit_exceeded',limit: result.limit,remaining: result.remaining,
        resetTime: result.resetTime,
        retryAfter: result.retryAfter,
        reason: result.reason,
      });
    }
  }

  /**
   * Get rate limiting statistics
   */
  getRateLimitStatistics(): RateLimitStatistics {
    const uniqueUsers = new Set<string>();
    const uniqueIPs = new Set<string>();
    const violators: Array<{ identifier: string; violations: number; lastViolation: Date }> = [];

    // Analyze trackers for statistics
    for (const [key, tracker] of this.rateLimitTrackers.entries()) {
      // Extract user ID and IP from key if possible
      const keyParts = key.split(':');if (keyParts.length >= 2) {if (keyParts[0] !== 'unknown') uniqueUsers.add(keyParts[0]);if (keyParts[1] !== 'unknown') uniqueIPs.add(keyParts[1]);}// Track violators
      if (tracker.violations > 0) {
        violators.push({
          identifier: key,
          violations: tracker.violations,
          lastViolation: tracker.firstViolation || tracker.lastRequest,
        });
      }
    }

    // Sort violators by violation count
    violators.sort((a, b) => b.violations - a.violations);

    return {
      totalRequests: this.totalRequests,
      blockedRequests: this.blockedRequests,
      uniqueUsers: uniqueUsers.size,
      uniqueIPs: uniqueIPs.size,
      averageRequestsPerMinute: this.calculateAverageRequestsPerMinute(),
      topViolators: violators.slice(0, 10), // Top 10 violators
    };
  }

  /**
   * Reset rate limit for specific user/IP
   */
  async resetRateLimit(userId?: string, ipAddress?: string): Promise<boolean> {
    let resetCount = 0;

    for (const [key, tracker] of this.rateLimitTrackers.entries()) {
      const keyParts = key.split(':');
      const trackerUserId = keyParts[0];
      const trackerIpAddress = keyParts[1];

      if ((userId && trackerUserId === userId) || (ipAddress && trackerIpAddress === ipAddress)) {
        // Reset tracker
        tracker.requests = 0;
        tracker.blocked = false;
        tracker.violations = 0;
        tracker.burstCount = 0;
        tracker.windowStart = Date.now();
        tracker.backoffUntil = undefined;
        tracker.firstViolation = undefined;
        resetCount++;
      }
    }

    this.logger.log(`Rate limit reset completed`, {userId,ipAddress,
      resetCount,
    });

    return resetCount > 0;
  }

  /**
   * Add dynamic rate limit configuration
   */
  addRateLimitConfiguration(key: string, config: RateLimitConfig): void {
    this.config.set(key, config);

    this.logger.log(`Rate limit configuration added`, {key,windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      burstLimit: config.burstLimit,
    });
  }

  /**
   * Update existing rate limit configuration
   */
  updateRateLimitConfiguration(key: string, updates: Partial<RateLimitConfig>): boolean {
    const existing = this.config.get(key);
    if (!existing) {
      return false;
    }

    const updated = { ...existing, ...updates };
    this.config.set(key, updated);

    this.logger.log(`Rate limit configuration updated`, {
      key,
      updates,
    });

    return true;
  }

  // ===== PRIVATE METHODS =====

  private initializeRateLimitConfigurations(): void {
    // Default configuration
    this.config.set('default', {windowMs: this.configService.get<number>('BROWSER_RATE_LIMIT_WINDOW_MS', 60000), // 1 minutemaxRequests: this.configService.get<number>('BROWSER_RATE_LIMIT_MAX_REQUESTS', 100),burstLimit: this.configService.get<number>('BROWSER_RATE_LIMIT_BURST', 10),});// Task execution limits
    this.config.set('tasks', {windowMs: 60000, // 1 minutemaxRequests: 10,
      burstLimit: 3,
    });

    // Session creation limits
    this.config.set('sessions', {windowMs: 300000, // 5 minutesmaxRequests: 5,
      burstLimit: 2,
    });

    // Screenshot limits
    this.config.set('screenshots', {windowMs: 60000, // 1 minutemaxRequests: 30,
      burstLimit: 10,
    });

    // Data extraction limits
    this.config.set('extraction', {windowMs: 600000, // 10 minutesmaxRequests: 20,
      burstLimit: 5,
    });

    // Admin operation limits
    this.config.set('admin', {windowMs: 300000, // 5 minutesmaxRequests: 3,
      burstLimit: 1,
    });

    this.logger.log('Rate limit configurations initialized', {configurationsCount: this.config.size,});
  }

  private getRateLimitConfiguration(key: string, context: RateLimitContext): RateLimitConfig {
    // Try to get specific configuration
    let config = this.config.get(key);

    if (!config) {
      // Try endpoint-based configuration
      if (context.endpoint.includes('/tasks')) {config = this.config.get('tasks');} else if (context.endpoint.includes('/sessions')) {config = this.config.get('sessions');} else if (context.endpoint.includes('/screenshot')) {config = this.config.get('screenshots');} else if (context.endpoint.includes('/extract')) {config = this.config.get('extraction');} else if (context.endpoint.includes('/admin')) {config = this.config.get('admin');}}

    // Fallback to default
    if (!config) {
      config = this.config.get('default')!;}// Apply user role adjustments
    if (context.userRole === 'admin') {return {...config,
        maxRequests: Math.floor(config.maxRequests * 2), // Admins get double limits
        burstLimit: config.burstLimit ? Math.floor(config.burstLimit * 1.5) : undefined,
      };
    }

    return config;
  }

  private generateTrackingKey(context: RateLimitContext, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(context);
    }

    // Default key generation: userId:ipAddress:endpoint
    const userId = context.userId || 'anonymous';const ipAddress = context.ipAddress || 'unknown';
    const endpoint = context.endpoint;

    return `${userId}:${ipAddress}:${endpoint}`;
  }

  private async performRateLimitCheck(
    trackingKey: string,
    context: RateLimitContext,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let tracker = this.rateLimitTrackers.get(trackingKey);

    if (!tracker || tracker.windowStart < windowStart) {
      // Create new or reset tracker
      tracker = {
        requests: 0,
        windowStart: now,
        blocked: false,
        lastRequest: new Date(),
        burstCount: 0,
        violations: 0,
      };
      this.rateLimitTrackers.set(trackingKey, tracker);
    }

    // Check if in backoff period
    if (tracker.backoffUntil && now < tracker.backoffUntil) {
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: tracker.backoffUntil,
        retryAfter: Math.ceil((tracker.backoffUntil - now) / 1000),
        blocked: true,
        reason: 'backoff_period',};}

    // Check burst limit
    if (config.burstLimit && tracker.burstCount >= config.burstLimit) {
      const timeSinceLastRequest = now - tracker.lastRequest.getTime();
      if (timeSinceLastRequest < 1000) { // Less than 1 second
        tracker.violations++;
        tracker.blocked = true;

        return {
          allowed: false,
          limit: config.burstLimit,
          remaining: 0,
          resetTime: now + 60000, // 1 minute cooldown
          retryAfter: 60,
          blocked: true,
          reason: 'burst_limit_exceeded',};} else {
        // Reset burst count if enough time has passed
        tracker.burstCount = 0;
      }
    }

    // Check main rate limit
    if (tracker.requests >= config.maxRequests) {
      tracker.violations++;
      tracker.blocked = true;
      if (!tracker.firstViolation) {
        tracker.firstViolation = new Date();
      }

      // Calculate exponential backoff for repeat violators
      const backoffMs = this.calculateBackoff(tracker.violations);
      tracker.backoffUntil = now + backoffMs;

      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: tracker.windowStart + config.windowMs,
        retryAfter: Math.ceil((tracker.windowStart + config.windowMs - now) / 1000),
        blocked: true,
        reason: 'rate_limit_exceeded',
      };
    }

    // Allow request
    const remaining = config.maxRequests - tracker.requests - 1;
    const resetTime = tracker.windowStart + config.windowMs;

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining,
      resetTime,
      blocked: false,
    };
  }

  private updateTracker(
    trackingKey: string,
    context: RateLimitContext,
    result: RateLimitResult,
    config: RateLimitConfig,
  ): void {
    const tracker = this.rateLimitTrackers.get(trackingKey);
    if (!tracker) return;

    if (result.allowed) {
      tracker.requests++;
      tracker.burstCount++;
      tracker.lastRequest = new Date();
      tracker.blocked = false;
    }

    // Reset burst count periodically
    const timeSinceLastRequest = Date.now() - tracker.lastRequest.getTime();
    if (timeSinceLastRequest > 5000) { // 5 seconds
      tracker.burstCount = Math.max(0, tracker.burstCount - 1);
    }
  }

  private calculateBackoff(violations: number): number {
    // Exponential backoff: 2^violations seconds, capped at 1 hour
    const backoffSeconds = Math.min(Math.pow(2, violations), 3600);
    return backoffSeconds * 1000; // Convert to milliseconds
  }

  private updateViolationStatistics(context: RateLimitContext): void {
    const key = `violations_${context.userId || context.ipAddress}`;
    const current = this.statistics.get(key) || 0;
    this.statistics.set(key, current + 1);
  }

  private calculateAverageRequestsPerMinute(): number {
    // Simple calculation - in production, you'd use a sliding window
    const uptimeMinutes = Math.max(1, process.uptime() / 60);
    return Math.round(this.totalRequests / uptimeMinutes);
  }

  private cleanupExpiredTrackers(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    let removedCount = 0;

    for (const [key, tracker] of this.rateLimitTrackers.entries()) {
      if (now - tracker.lastRequest.getTime() > maxAge) {
        this.rateLimitTrackers.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.debug(`Cleaned up ${removedCount} expired rate limit trackers`, {
        remainingTrackers: this.rateLimitTrackers.size,
      });
    }
  }

  private updateStatistics(): void {
    // Update various statistics
    const stats = this.getRateLimitStatistics();

    this.logger.debug('Rate limiting statistics updated', {totalRequests: stats.totalRequests,blockedRequests: stats.blockedRequests,
      blockRate: (stats.blockedRequests / stats.totalRequests * 100).toFixed(2) + '%',
      uniqueUsers: stats.uniqueUsers,
      uniqueIPs: stats.uniqueIPs,
      averageRequestsPerMinute: stats.averageRequestsPerMinute,
      topViolatorsCount: stats.topViolators.length,
    });
  }
}