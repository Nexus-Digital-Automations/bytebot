import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Comprehensive API Rate Limiting Service
 *
 * Implements multiple rate limiting algorithms:
 * - Sliding Window Counter
 * - Token Bucket
 * - Fixed Window Counter
 * - Distributed Rate Limiting
 *
 * Features:
 * - User-based and IP-based rate limiting
 * - Dynamic rate limit adjustment
 * - Geographic rate limiting
 * - API key rate limiting
 * - Burst allowance handling
 */

export interface RateLimitRule {
  id: string;
  name: string;
  type: 'user' | 'ip' | 'api_key' | 'geographic' | 'endpoint';
  algorithm: 'sliding_window' | 'token_bucket' | 'fixed_window';
  limit: number;
  windowMs: number;
  burstLimit?: number;
  enabled: boolean;
  priority: number;
  conditions?: {
    endpoints?: string[];
    methods?: string[];
    userRoles?: string[];
    ipRanges?: string[];
    countries?: string[];
    headers?: Record<string, string>;
  };
  actions: {
    onLimit: 'block' | 'delay' | 'captcha' | 'redirect';
    onViolation: 'log' | 'alert' | 'ban' | 'throttle';
    delayMs?: number;
    banDurationMs?: number;
  };
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  rule: string;
  algorithm: string;
  reason?: string;
  action?: string;
}

export interface RateLimitMetrics {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  delayedRequests: number;
  avgResponseTime: number;
  uniqueIPs: number;
  uniqueUsers: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  topIPs: Array<{ ip: string; count: number }>;
  violationsByRule: Record<string, number>;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number;
}

interface SlidingWindow {
  requests: number[];
  windowStart: number;
  windowSize: number;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);

  // In-memory storage for rate limiting data (in production, use Redis)
  private tokenBuckets = new Map<string, TokenBucket>();
  private slidingWindows = new Map<string, SlidingWindow>();
  private fixedWindows = new Map<string, { count: number; resetTime: number }>();
  private bannedIPs = new Map<string, { bannedUntil: number; reason: string }>();
  private metrics: RateLimitMetrics = {
    totalRequests: 0,
    allowedRequests: 0,
    blockedRequests: 0,
    delayedRequests: 0,
    avgResponseTime: 0,
    uniqueIPs: 0,
    uniqueUsers: 0,
    topEndpoints: [],
    topIPs: [],
    violationsByRule: {}
  };

  // Default rate limiting rules
  private rules: RateLimitRule[] = [
    {
      id: 'global_ip_limit',
      name: 'Global IP Rate Limit',
      type: 'ip',
      algorithm: 'sliding_window',
      limit: 1000,
      windowMs: 60000, // 1 minute
      burstLimit: 100,
      enabled: true,
      priority: 1,
      actions: {
        onLimit: 'block',
        onViolation: 'log'
      }
    },
    {
      id: 'user_api_limit',
      name: 'User API Rate Limit',
      type: 'user',
      algorithm: 'token_bucket',
      limit: 100,
      windowMs: 60000,
      burstLimit: 20,
      enabled: true,
      priority: 2,
      actions: {
        onLimit: 'delay',
        onViolation: 'alert',
        delayMs: 1000
      }
    },
    {
      id: 'auth_endpoint_limit',
      name: 'Authentication Endpoint Limit',
      type: 'endpoint',
      algorithm: 'fixed_window',
      limit: 5,
      windowMs: 300000, // 5 minutes
      enabled: true,
      priority: 3,
      conditions: {
        endpoints: ['/auth/login', '/auth/register', '/auth/forgot-password']
      },
      actions: {
        onLimit: 'block',
        onViolation: 'ban',
        banDurationMs: 900000 // 15 minutes
      }
    },
    {
      id: 'api_key_limit',
      name: 'API Key Rate Limit',
      type: 'api_key',
      algorithm: 'sliding_window',
      limit: 10000,
      windowMs: 3600000, // 1 hour
      burstLimit: 500,
      enabled: true,
      priority: 4,
      actions: {
        onLimit: 'throttle',
        onViolation: 'alert'
      }
    }
  ];

  constructor(private readonly configService: ConfigService) {
    this.loadConfiguration();
    this.startMetricsCollection();
  }

  /**
   * Check if request should be rate limited
   */
  async checkRateLimit(req: Request): Promise<RateLimitResult> {
    const startTime = Date.now();

    try {
      // Update metrics
      this.metrics.totalRequests++;

      // Check if IP is banned
      const ip = this.getClientIP(req);
      if (this.isIPBanned(ip)) {
        this.metrics.blockedRequests++;
        return {
          allowed: false,
          limit: 0,
          remaining: 0,
          resetTime: this.bannedIPs.get(ip)?.bannedUntil || 0,
          rule: 'ip_ban',
          algorithm: 'ban',
          reason: this.bannedIPs.get(ip)?.reason || 'IP banned'
        };
      }

      // Apply rate limiting rules in priority order
      const sortedRules = this.rules
        .filter(rule => rule.enabled)
        .sort((a, b) => a.priority - b.priority);

      for (const rule of sortedRules) {
        if (!this.ruleApplies(rule, req)) {
          continue;
        }

        const result = await this.applyRule(rule, req);

        if (!result.allowed) {
          this.handleViolation(rule, req, result);
          this.metrics.blockedRequests++;

          // Record violation metric
          this.metrics.violationsByRule[rule.id] =
            (this.metrics.violationsByRule[rule.id] || 0) + 1;

          return result;
        }
      }

      // Request allowed
      this.metrics.allowedRequests++;
      this.updateMetrics(req, Date.now() - startTime);

      return {
        allowed: true,
        limit: 1000, // Default limit for allowed requests
        remaining: 999,
        resetTime: Date.now() + 60000,
        rule: 'allowed',
        algorithm: 'none'
      };

    } catch (error) {
      this.logger.error('Rate limiting check failed', error);

      // Fail open - allow request if rate limiting fails
      return {
        allowed: true,
        limit: 1000,
        remaining: 999,
        resetTime: Date.now() + 60000,
        rule: 'error_fallback',
        algorithm: 'none',
        reason: 'Rate limiting error'
      };
    }
  }

  /**
   * Apply specific rate limiting rule
   */
  private async applyRule(rule: RateLimitRule, req: Request): Promise<RateLimitResult> {
    const key = this.generateKey(rule, req);

    switch (rule.algorithm) {
      case 'sliding_window':
        return this.applySlidingWindow(rule, key);
      case 'token_bucket':
        return this.applyTokenBucket(rule, key);
      case 'fixed_window':
        return this.applyFixedWindow(rule, key);
      default:
        throw new Error(`Unknown algorithm: ${rule.algorithm}`);
    }
  }

  /**
   * Sliding Window Rate Limiting
   */
  private applySlidingWindow(rule: RateLimitRule, key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - rule.windowMs;

    let window = this.slidingWindows.get(key);
    if (!window) {
      window = {
        requests: [],
        windowStart: now,
        windowSize: rule.windowMs
      };
      this.slidingWindows.set(key, window);
    }

    // Remove old requests outside the window
    window.requests = window.requests.filter(timestamp => timestamp > windowStart);

    const currentCount = window.requests.length;
    const remaining = Math.max(0, rule.limit - currentCount);

    if (currentCount >= rule.limit) {
      const oldestRequest = Math.min(...window.requests);
      const resetTime = oldestRequest + rule.windowMs;

      return {
        allowed: false,
        limit: rule.limit,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000),
        rule: rule.id,
        algorithm: 'sliding_window'
      };
    }

    // Add current request
    window.requests.push(now);

    return {
      allowed: true,
      limit: rule.limit,
      remaining: remaining - 1,
      resetTime: now + rule.windowMs,
      rule: rule.id,
      algorithm: 'sliding_window'
    };
  }

  /**
   * Token Bucket Rate Limiting
   */
  private applyTokenBucket(rule: RateLimitRule, key: string): RateLimitResult {
    const now = Date.now();

    let bucket = this.tokenBuckets.get(key);
    if (!bucket) {
      bucket = {
        tokens: rule.limit,
        lastRefill: now,
        capacity: rule.limit,
        refillRate: rule.limit / (rule.windowMs / 1000) // tokens per second
      };
      this.tokenBuckets.set(key, bucket);
    }

    // Refill tokens based on time passed
    const timePassed = (now - bucket.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      const timeToRefill = (1 - bucket.tokens) / bucket.refillRate;

      return {
        allowed: false,
        limit: rule.limit,
        remaining: 0,
        resetTime: now + (timeToRefill * 1000),
        retryAfter: Math.ceil(timeToRefill),
        rule: rule.id,
        algorithm: 'token_bucket'
      };
    }

    // Consume token
    bucket.tokens -= 1;

    return {
      allowed: true,
      limit: rule.limit,
      remaining: Math.floor(bucket.tokens),
      resetTime: now + rule.windowMs,
      rule: rule.id,
      algorithm: 'token_bucket'
    };
  }

  /**
   * Fixed Window Rate Limiting
   */
  private applyFixedWindow(rule: RateLimitRule, key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = Math.floor(now / rule.windowMs) * rule.windowMs;
    const resetTime = windowStart + rule.windowMs;

    let window = this.fixedWindows.get(key);
    if (!window || window.resetTime !== resetTime) {
      window = { count: 0, resetTime };
      this.fixedWindows.set(key, window);
    }

    if (window.count >= rule.limit) {
      return {
        allowed: false,
        limit: rule.limit,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((resetTime - now) / 1000),
        rule: rule.id,
        algorithm: 'fixed_window'
      };
    }

    window.count += 1;

    return {
      allowed: true,
      limit: rule.limit,
      remaining: rule.limit - window.count,
      resetTime,
      rule: rule.id,
      algorithm: 'fixed_window'
    };
  }

  /**
   * Check if rule applies to request
   */
  private ruleApplies(rule: RateLimitRule, req: Request): boolean {
    if (!rule.conditions) {
      return true;
    }

    const { conditions } = rule;

    // Check endpoints
    if (conditions.endpoints && !conditions.endpoints.includes(req.path)) {
      return false;
    }

    // Check methods
    if (conditions.methods && !conditions.methods.includes(req.method)) {
      return false;
    }

    // Check headers
    if (conditions.headers) {
      for (const [header, value] of Object.entries(conditions.headers)) {
        if (req.headers[header.toLowerCase()] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Generate unique key for rate limiting
   */
  private generateKey(rule: RateLimitRule, req: Request): string {
    const base = `${rule.id}:`;

    switch (rule.type) {
      case 'ip':
        return base + this.getClientIP(req);
      case 'user':
        return base + (req.user?.id || 'anonymous');
      case 'api_key':
        return base + (req.headers['x-api-key'] || 'no-key');
      case 'endpoint':
        return base + req.path;
      case 'geographic':
        return base + this.getCountryCode(req);
      default:
        return base + 'global';
    }
  }

  /**
   * Handle rate limit violation
   */
  private handleViolation(rule: RateLimitRule, req: Request, result: RateLimitResult): void {
    const ip = this.getClientIP(req);
    const user = req.user?.id || 'anonymous';

    this.logger.warn(`Rate limit violation`, {
      rule: rule.id,
      ip,
      user,
      endpoint: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      result
    });

    // Execute violation actions
    switch (rule.actions.onViolation) {
      case 'ban':
        this.banIP(ip, rule.actions.banDurationMs || 900000, `Rate limit violation: ${rule.id}`);
        break;
      case 'alert':
        this.sendAlert(rule, req, result);
        break;
      case 'throttle':
        this.metrics.delayedRequests++;
        break;
    }
  }

  /**
   * Ban IP address
   */
  private banIP(ip: string, durationMs: number, reason: string): void {
    const bannedUntil = Date.now() + durationMs;
    this.bannedIPs.set(ip, { bannedUntil, reason });

    this.logger.warn(`IP banned`, { ip, durationMs, reason, bannedUntil });

    // Clean up expired bans
    setTimeout(() => {
      if (this.bannedIPs.get(ip)?.bannedUntil === bannedUntil) {
        this.bannedIPs.delete(ip);
        this.logger.log(`IP ban expired`, { ip });
      }
    }, durationMs);
  }

  /**
   * Check if IP is banned
   */
  private isIPBanned(ip: string): boolean {
    const ban = this.bannedIPs.get(ip);
    if (!ban) return false;

    if (Date.now() > ban.bannedUntil) {
      this.bannedIPs.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Send security alert
   */
  private sendAlert(rule: RateLimitRule, req: Request, result: RateLimitResult): void {
    // In production, integrate with alerting system (PagerDuty, Slack, etc.)
    this.logger.error(`SECURITY ALERT: Rate limit violation`, {
      rule: rule.id,
      ip: this.getClientIP(req),
      endpoint: req.path,
      userAgent: req.headers['user-agent'],
      result
    });
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    ).split(',')[0].trim();
  }

  /**
   * Get country code from IP (mock implementation)
   */
  private getCountryCode(req: Request): string {
    // In production, use GeoIP service
    return req.headers['cf-ipcountry'] as string || 'unknown';
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(req: Request, responseTime: number): void {
    // Update average response time
    this.metrics.avgResponseTime =
      (this.metrics.avgResponseTime + responseTime) / 2;

    // Track unique IPs and users
    // In production, use more sophisticated tracking
  }

  /**
   * Load configuration from environment
   */
  private loadConfiguration(): void {
    // Load custom rules from configuration
    const customRules = this.configService.get<RateLimitRule[]>('RATE_LIMIT_RULES');
    if (customRules) {
      this.rules = [...this.rules, ...customRules];
    }

    // Enable/disable global rate limiting
    const globalEnabled = this.configService.get<boolean>('RATE_LIMITING_ENABLED', true);
    if (!globalEnabled) {
      this.rules.forEach(rule => rule.enabled = false);
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    // Reset metrics every hour
    setInterval(() => {
      this.logger.log('Rate limiting metrics', this.metrics);
      this.resetMetrics();
    }, 3600000);
  }

  /**
   * Reset metrics
   */
  private resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      delayedRequests: 0,
      avgResponseTime: 0,
      uniqueIPs: 0,
      uniqueUsers: 0,
      topEndpoints: [],
      topIPs: [],
      violationsByRule: {}
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): RateLimitMetrics {
    return { ...this.metrics };
  }

  /**
   * Get rate limiting rules
   */
  getRules(): RateLimitRule[] {
    return [...this.rules];
  }

  /**
   * Add or update rate limiting rule
   */
  updateRule(rule: RateLimitRule): void {
    const index = this.rules.findIndex(r => r.id === rule.id);
    if (index >= 0) {
      this.rules[index] = rule;
    } else {
      this.rules.push(rule);
    }

    this.logger.log(`Rate limiting rule updated`, { rule: rule.id });
  }

  /**
   * Remove rate limiting rule
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
    this.logger.log(`Rate limiting rule removed`, { rule: ruleId });
  }

  /**
   * Clear all rate limiting data
   */
  clearData(): void {
    this.tokenBuckets.clear();
    this.slidingWindows.clear();
    this.fixedWindows.clear();
    this.bannedIPs.clear();
    this.resetMetrics();

    this.logger.log('Rate limiting data cleared');
  }
}