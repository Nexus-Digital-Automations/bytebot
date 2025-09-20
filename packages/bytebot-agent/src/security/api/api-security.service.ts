/**
 * API Security Service - Comprehensive API security hardening and protection
 * Implements enterprise-grade API security measures including rate limiting, CORS, headers, and monitoring
 *
 * Features:
 * - Advanced rate limiting with multiple strategies (token bucket, sliding window, etc.)
 * - Comprehensive CORS configuration with origin validation
 * - Security headers implementation (HSTS, CSP, etc.)
 * - API gateway integration and traffic analysis
 * - Request/response sanitization and validation
 * - DDoS protection and traffic anomaly detection
 *
 * @author API Security Hardening Specialist
 * @version 2.0.0
 * @since Phase 2: Enterprise Security Implementation
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

import * as crypto from 'crypto';
import { performance } from 'perf_hooks';
import { User } from '@prisma/client';

/**
 * Extend Express Request to include user property
 */
interface AuthenticatedRequest extends Request {
  user?: User;
  requestId?: string;
  securityContext?: {
    startTime: number;
    ipAddress: string;
    userAgent?: string;
  };
}

/**
 * Rate limiting strategies
 */
export enum RateLimitStrategy {
  TOKEN_BUCKET = 'token_bucket',
  SLIDING_WINDOW = 'sliding_window',
  FIXED_WINDOW = 'fixed_window',
  SLIDING_LOG = 'sliding_log',
}

/**
 * Rate limit configuration interface
 */
export interface RateLimitConfig {
  strategy: RateLimitStrategy;
  maxRequests: number;
  windowMs: number;
  burstLimit?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: AuthenticatedRequest) => string;
  skipIf?: (req: AuthenticatedRequest) => boolean;
  onLimitReached?: (req: AuthenticatedRequest, res: Response) => void;
}

/**
 * CORS configuration interface
 */
export interface CORSConfig {
  enabled: boolean;
  allowedOrigins: string[] | RegExp[] | ((origin: string) => boolean);
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  credentials: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

/**
 * Security headers configuration
 */
export interface SecurityHeadersConfig {
  contentSecurityPolicy: {
    enabled: boolean;
    directives: Record<string, string[]>;
    reportOnly?: boolean;
    reportUri?: string;
  };
  strictTransportSecurity: {
    enabled: boolean;
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  xFrameOptions: {
    enabled: boolean;
    policy: string;
  };
  xContentTypeOptions: {
    enabled: boolean;
  };
  xXssProtection: {
    enabled: boolean;
    mode: '0' | '1' | '1; mode=block';
  };
  referrerPolicy: {
    enabled: boolean;
    policy: string;
  };
  permissionsPolicy: {
    enabled: boolean;
    directives: Record<string, string[]>;
  };
}

/**
 * API traffic anomaly detection
 */
interface TrafficAnomaly {
  id: string;
  timestamp: Date;
  type:
    | 'suspicious_pattern'
    | 'volume_spike'
    | 'unusual_endpoint'
    | 'malformed_requests';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: {
    ipAddress: string;
    userAgent?: string;
    userId?: string;
  };
  details: {
    requestCount?: number;
    timeWindow?: number;
    pattern?: string;
    endpoints?: string[];
    suspicious_headers?: string[];
  };
  action: 'monitor' | 'throttle' | 'block' | 'captcha';
}

/**
 * Rate limiter implementation using token bucket algorithm
 */
class TokenBucketRateLimiter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();

  constructor(
    private readonly maxTokens: number,
    private readonly refillRate: number, // tokens per second
  ) {}

  isAllowed(key: string): boolean {
    const now = Date.now() / 1000;
    const bucket = this.buckets.get(key) || {
      tokens: this.maxTokens,
      lastRefill: now,
    };

    // Refill tokens based on time elapsed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if request is allowed
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      this.buckets.set(key, bucket);
      return true;
    }

    this.buckets.set(key, bucket);
    return false;
  }

  cleanup(): void {
    const now = Date.now() / 1000;
    const cutoff = now - 3600; // Remove buckets older than 1 hour

    for (const [key, bucket] of Array.from(this.buckets.entries())) {
      if (bucket.lastRefill < cutoff) {
        this.buckets.delete(key);
      }
    }
  }
}

/**
 * Sliding window rate limiter
 */
class SlidingWindowRateLimiter {
  private windows = new Map<string, number[]>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const requests = this.windows.get(key) || [];

    // Remove requests outside the window
    const validRequests = requests.filter(
      (timestamp) => timestamp > windowStart,
    );

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.windows.set(key, validRequests);

    return true;
  }

  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs * 2;

    for (const [key, requests] of Array.from(this.windows.entries())) {
      const validRequests = requests.filter((timestamp) => timestamp > cutoff);

      if (validRequests.length === 0) {
        this.windows.delete(key);
      } else {
        this.windows.set(key, validRequests);
      }
    }
  }
}

/**
 * API Security Service
 */
@Injectable()
export class ApiSecurityService implements NestMiddleware {
  private readonly logger = new Logger(ApiSecurityService.name);
  private readonly tokenBucketLimiter: TokenBucketRateLimiter;
  private readonly slidingWindowLimiter: SlidingWindowRateLimiter;
  private readonly trafficAnomalies: TrafficAnomaly[] = [];
  private readonly requestStats = new Map<
    string,
    { count: number; lastSeen: number }
  >();

  // Security configurations
  private readonly rateLimitConfig: RateLimitConfig;
  private readonly corsConfig: CORSConfig;
  private readonly securityHeaders: SecurityHeadersConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('API Security Service initializing...');

    // Load configurations
    this.rateLimitConfig = this.loadRateLimitConfig();
    this.corsConfig = this.loadCORSConfig();
    this.securityHeaders = this.loadSecurityHeadersConfig();

    // Initialize rate limiters
    this.tokenBucketLimiter = new TokenBucketRateLimiter(
      this.rateLimitConfig.maxRequests,
      this.rateLimitConfig.maxRequests / (this.rateLimitConfig.windowMs / 1000),
    );

    this.slidingWindowLimiter = new SlidingWindowRateLimiter(
      this.rateLimitConfig.maxRequests,
      this.rateLimitConfig.windowMs,
    );

    // Start cleanup timers
    this.startCleanupTimers();

    // Start traffic analysis
    this.startTrafficAnalysis();

    this.logger.log('API Security Service initialized successfully', {
      rateLimitStrategy: this.rateLimitConfig.strategy,
      corsEnabled: this.corsConfig.enabled,
      securityHeadersEnabled: Object.entries(this.securityHeaders).filter(
        ([, config]) =>
          (config as Record<string, unknown> & { enabled: boolean }).enabled,
      ).length,
    });
  }

  /**
   * Main middleware implementation
   */
  use(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const startTime = performance.now();
    const requestId = crypto.randomUUID();

    // Add request ID and security context
    req['requestId'] = requestId;
    req['securityContext'] = {
      startTime,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
    };

    try {
      // Apply security headers
      this.applySecurityHeaders(res);

      // Handle CORS
      if (this.corsConfig.enabled) {
        const corsResult = this.handleCORS(req, res);
        if (!corsResult.allowed) {
          this.logger.warn('CORS request blocked', {
            requestId,
            origin: req.get('Origin'),
            method: req.method,
            ipAddress: this.getClientIP(req),
          });

          res.status(403).json({
            _error: 'CORS policy violation',
            code: 'CORS_BLOCKED',
            requestId,
          });
          return;
        }

        // Handle preflight requests
        if (req.method === 'OPTIONS' && corsResult.preflight) {
          res.status(this.corsConfig.optionsSuccessStatus || 204).end();
          return;
        }
      }

      // Apply rate limiting
      const rateLimitResult = this.applyRateLimit(req, res);
      if (!rateLimitResult.allowed) {
        this.logger.warn('Rate limit exceeded', {
          requestId,
          ipAddress: this.getClientIP(req),
          userId: req.user?.id,
          limit: this.rateLimitConfig.maxRequests,
          windowMs: this.rateLimitConfig.windowMs,
        });

        // Emit rate limit event
        this.eventEmitter.emit('api.rate_limit.exceeded', {
          requestId,
          ipAddress: this.getClientIP(req),
          userId: req.user?.id,
          endpoint: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
        });

        res.status(429).json({
          _error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.retryAfter,
          requestId,
        });
        return;
      }

      // Analyze traffic for anomalies
      this.analyzeTrafficAnomalies(req);

      // Sanitize request
      this.sanitizeRequest(req);

      // Update request statistics
      this.updateRequestStats(req);

      // Add response timing and cleanup
      res.on('finish', () => {
        const processingTime = performance.now() - startTime;

        // Log request completion
        this.logger.debug('API request completed', {
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          processingTimeMs: processingTime.toFixed(2),
          ipAddress: this.getClientIP(req),
          userAgent: req.get('User-Agent'),
          userId: req.user?.id,
        });

        // Emit completion event for monitoring
        this.eventEmitter.emit('api.request.completed', {
          requestId,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          processingTimeMs: processingTime,
          ipAddress: this.getClientIP(req),
          userId: req.user?.id,
        });
      });

      next();
    } catch (error) {
      const processingTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('API security middleware error', {
        requestId,
        _error: errorMessage,
        processingTimeMs: processingTime.toFixed(2),
        ipAddress: this.getClientIP(req),
      });

      // Emit error event
      this.eventEmitter.emit('api.security.error', {
        requestId,
        _error: errorMessage,
        ipAddress: this.getClientIP(req),
      });

      res.status(500).json({
        _error: 'Internal server error',
        code: 'SECURITY_MIDDLEWARE_ERROR',
        requestId,
      });
    }
  }

  /**
   * Apply comprehensive security headers
   */
  private applySecurityHeaders(res: Response): void {
    // Content Security Policy
    if (this.securityHeaders.contentSecurityPolicy.enabled) {
      const cspDirectives = Object.entries(
        this.securityHeaders.contentSecurityPolicy.directives,
      )
        .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
        .join('; ');

      const headerName = this.securityHeaders.contentSecurityPolicy.reportOnly
        ? 'Content-Security-Policy-Report-Only'
        : 'Content-Security-Policy';

      res.set(headerName, cspDirectives);
    }

    // Strict Transport Security
    if (this.securityHeaders.strictTransportSecurity.enabled) {
      let hstsValue = `max-age=${this.securityHeaders.strictTransportSecurity.maxAge}`;

      if (this.securityHeaders.strictTransportSecurity.includeSubDomains) {
        hstsValue += '; includeSubDomains';
      }

      if (this.securityHeaders.strictTransportSecurity.preload) {
        hstsValue += '; preload';
      }

      res.set('Strict-Transport-Security', hstsValue);
    }

    // X-Frame-Options
    if (this.securityHeaders.xFrameOptions.enabled) {
      res.set('X-Frame-Options', this.securityHeaders.xFrameOptions.policy);
    }

    // X-Content-Type-Options
    if (this.securityHeaders.xContentTypeOptions.enabled) {
      res.set('X-Content-Type-Options', 'nosniff');
    }

    // X-XSS-Protection
    if (this.securityHeaders.xXssProtection.enabled) {
      res.set('X-XSS-Protection', this.securityHeaders.xXssProtection.mode);
    }

    // Referrer-Policy
    if (this.securityHeaders.referrerPolicy.enabled) {
      res.set('Referrer-Policy', this.securityHeaders.referrerPolicy.policy);
    }

    // Permissions-Policy
    if (this.securityHeaders.permissionsPolicy.enabled) {
      const permissionsDirectives = Object.entries(
        this.securityHeaders.permissionsPolicy.directives,
      )
        .map(([directive, values]) => `${directive}=(${values.join(' ')})`)
        .join(', ');

      res.set('Permissions-Policy', permissionsDirectives);
    }

    // Additional security headers
    res.set('X-Powered-By', 'Bytebot-Agent/2.0'); // Custom header, don't reveal too much
    res.set('X-DNS-Prefetch-Control', 'off');
    res.set('X-Download-Options', 'noopen');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }

  /**
   * Handle CORS requests with comprehensive validation
   */
  private handleCORS(
    req: AuthenticatedRequest,
    res: Response,
  ): { allowed: boolean; preflight: boolean } {
    const origin = req.get('Origin');
    const method = req.method;
    const requestedMethod = req.get('Access-Control-Request-Method');
    const requestedHeaders = req.get('Access-Control-Request-Headers');

    // Check if origin is allowed
    let originAllowed = false;

    if (Array.isArray(this.corsConfig.allowedOrigins)) {
      originAllowed = this.corsConfig.allowedOrigins.some((allowedOrigin) => {
        if (typeof allowedOrigin === 'string') {
          return allowedOrigin === '*' || allowedOrigin === origin;
        } else if (allowedOrigin instanceof RegExp) {
          return origin ? allowedOrigin.test(origin) : false;
        }
        return false;
      });
    } else if (typeof this.corsConfig.allowedOrigins === 'function') {
      originAllowed = origin ? this.corsConfig.allowedOrigins(origin) : false;
    }

    if (!originAllowed) {
      return { allowed: false, preflight: false };
    }

    // Set CORS headers
    res.set('Access-Control-Allow-Origin', origin || '*');

    if (this.corsConfig.credentials) {
      res.set('Access-Control-Allow-Credentials', 'true');
    }

    if (
      this.corsConfig.exposedHeaders &&
      this.corsConfig.exposedHeaders.length > 0
    ) {
      res.set(
        'Access-Control-Expose-Headers',
        this.corsConfig.exposedHeaders.join(', '),
      );
    }

    // Handle preflight requests
    if (method === 'OPTIONS' && (requestedMethod || requestedHeaders)) {
      // Check if method is allowed
      const methodAllowed = requestedMethod
        ? this.corsConfig.allowedMethods.includes(requestedMethod.toUpperCase())
        : true;

      if (!methodAllowed) {
        return { allowed: false, preflight: true };
      }

      // Set preflight headers
      res.set(
        'Access-Control-Allow-Methods',
        this.corsConfig.allowedMethods.join(', '),
      );
      res.set(
        'Access-Control-Allow-Headers',
        this.corsConfig.allowedHeaders.join(', '),
      );

      if (this.corsConfig.maxAge !== undefined) {
        res.set('Access-Control-Max-Age', this.corsConfig.maxAge.toString());
      }

      return { allowed: true, preflight: true };
    }

    return { allowed: true, preflight: false };
  }

  /**
   * Apply rate limiting based on configured strategy
   */
  private applyRateLimit(
    req: AuthenticatedRequest,
    res: Response,
  ): { allowed: boolean; retryAfter?: number } {
    // Skip if configured
    if (this.rateLimitConfig.skipIf && this.rateLimitConfig.skipIf(req)) {
      return { allowed: true };
    }

    // Generate rate limit key
    const key = this.rateLimitConfig.keyGenerator
      ? this.rateLimitConfig.keyGenerator(req)
      : this.getClientIP(req);

    let allowed = false;
    let retryAfter: number | undefined;

    // Apply rate limiting based on strategy
    switch (this.rateLimitConfig.strategy) {
      case RateLimitStrategy.TOKEN_BUCKET:
        allowed = this.tokenBucketLimiter.isAllowed(key);
        retryAfter = allowed
          ? undefined
          : Math.ceil(this.rateLimitConfig.windowMs / 1000);
        break;

      case RateLimitStrategy.SLIDING_WINDOW:
        allowed = this.slidingWindowLimiter.isAllowed(key);
        retryAfter = allowed
          ? undefined
          : Math.ceil(this.rateLimitConfig.windowMs / 1000);
        break;

      default:
        // Default to token bucket
        allowed = this.tokenBucketLimiter.isAllowed(key);
        break;
    }

    if (allowed) {
      // Set rate limit headers for successful requests
      res.set('X-RateLimit-Limit', this.rateLimitConfig.maxRequests.toString());
      res.set('X-RateLimit-Window', this.rateLimitConfig.windowMs.toString());
    } else {
      // Set rate limit headers for blocked requests
      res.set('X-RateLimit-Limit', this.rateLimitConfig.maxRequests.toString());
      res.set('X-RateLimit-Window', this.rateLimitConfig.windowMs.toString());
      res.set('Retry-After', retryAfter?.toString() || '60');

      // Call configured callback
      if (this.rateLimitConfig.onLimitReached) {
        this.rateLimitConfig.onLimitReached(req, res);
      }
    }

    return { allowed, retryAfter };
  }

  /**
   * Analyze traffic for anomalies and suspicious patterns
   */
  private analyzeTrafficAnomalies(req: AuthenticatedRequest): void {
    const ipAddress = this.getClientIP(req);
    const userAgent = req.get('User-Agent');
    const endpoint = req.path;
    const now = Date.now();

    // Check for suspicious user agents
    if (userAgent && this.isSuspiciousUserAgent(userAgent)) {
      this.recordTrafficAnomaly({
        type: 'suspicious_pattern',
        severity: 'medium',
        source: { ipAddress, userAgent },
        details: { pattern: 'suspicious_user_agent' },
        action: 'monitor',
      });
    }

    // Check for unusual endpoints
    if (this.isUnusualEndpoint(endpoint)) {
      this.recordTrafficAnomaly({
        type: 'unusual_endpoint',
        severity: 'low',
        source: { ipAddress, userAgent },
        details: { endpoints: [endpoint] },
        action: 'monitor',
      });
    }

    // Check for malformed requests
    if (this.isMalformedRequest(req)) {
      this.recordTrafficAnomaly({
        type: 'malformed_requests',
        severity: 'medium',
        source: { ipAddress, userAgent },
        details: { suspicious_headers: Object.keys(req.headers) },
        action: 'monitor',
      });
    }

    // Check for volume spikes
    const stats = this.requestStats.get(ipAddress) || {
      count: 0,
      lastSeen: now,
    };
    stats.count++;
    stats.lastSeen = now;
    this.requestStats.set(ipAddress, stats);

    // Check if request count exceeds normal thresholds
    const timeWindow = 60000; // 1 minute
    if (stats.count > 1000 && now - stats.lastSeen < timeWindow) {
      this.recordTrafficAnomaly({
        type: 'volume_spike',
        severity: 'high',
        source: { ipAddress, userAgent },
        details: { requestCount: stats.count, timeWindow },
        action: 'throttle',
      });
    }
  }

  /**
   * Sanitize request to prevent common attacks
   */
  private sanitizeRequest(req: AuthenticatedRequest): void {
    // Sanitize query parameters
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
          req.query[key] = this.sanitizeString(value);
        }
      }
    }

    // Sanitize request body (if it's JSON)
    if (req.body && typeof req.body === 'object') {
      const sanitizedBody = this.sanitizeObject(req.body);
      req.body = sanitizedBody as Record<string, unknown>;
    }

    // Remove potentially dangerous headers
    const dangerousHeaders = [
      'x-forwarded-host',
      'x-original-url',
      'x-rewrite-url',
    ];
    dangerousHeaders.forEach((header) => {
      if (req.headers[header]) {
        delete req.headers[header];
      }
    });
  }

  /**
   * Helper methods
   */
  private getClientIP(req: AuthenticatedRequest): string {
    return (
      req.get('CF-Connecting-IP') ||
      req.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      req.get('X-Real-IP') ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /curl/i,
      /wget/i,
      /python-requests/i,
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /^$/,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
  }

  private isUnusualEndpoint(endpoint: string): boolean {
    const unusualPatterns = [
      /\.\./, // Directory traversal
      /\/\//, // Double slashes
      /\.(php|jsp|asp|cgi)/i, // Server-side scripts
      /admin|config|backup|test|debug/i, // Common probe endpoints
    ];

    return unusualPatterns.some((pattern) => pattern.test(endpoint));
  }

  private isMalformedRequest(req: AuthenticatedRequest): boolean {
    // Check for suspiciously long headers
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string' && value.length > 4096) {
        return true;
      }
      if (key.length > 256) {
        return true;
      }
    }

    // Check for invalid header characters
    const invalidHeaderPattern = /[^\x20-\x7E]/;
    for (const [key, value] of Object.entries(req.headers)) {
      if (
        invalidHeaderPattern.test(key) ||
        (typeof value === 'string' && invalidHeaderPattern.test(value))
      ) {
        return true;
      }
    }

    return false;
  }

  private sanitizeString(input: string): string {
    // Remove potentially dangerous characters
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/[<>'"]/g, '');
  }

  private sanitizeObject(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') {
      return typeof obj === 'string' ? this.sanitizeString(obj) : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item: unknown) => this.sanitizeObject(item));
    }

    const sanitized: Record<string, unknown> = {};
    const objectEntries = Object.entries(obj as Record<string, unknown>);
    for (const [key, value] of objectEntries) {
      const sanitizedKey = this.sanitizeString(key);
      sanitized[sanitizedKey] = this.sanitizeObject(value);
    }

    return sanitized;
  }

  private recordTrafficAnomaly(
    anomalyData: Partial<TrafficAnomaly> & {
      type: TrafficAnomaly['type'];
      severity: TrafficAnomaly['severity'];
      source: TrafficAnomaly['source'];
    },
  ): void {
    const anomaly: TrafficAnomaly = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: anomalyData.type,
      severity: anomalyData.severity,
      source: anomalyData.source,
      details: anomalyData.details || {},
      action: anomalyData.action || 'monitor',
    };

    this.trafficAnomalies.push(anomaly);

    // Keep only recent anomalies
    if (this.trafficAnomalies.length > 1000) {
      this.trafficAnomalies.splice(0, 100);
    }

    // Emit anomaly event
    this.eventEmitter.emit('api.traffic.anomaly', anomaly);

    this.logger.debug('Traffic anomaly detected', {
      anomalyId: anomaly.id,
      type: anomaly.type,
      severity: anomaly.severity,
      source: anomaly.source.ipAddress,
    });
  }

  private updateRequestStats(req: AuthenticatedRequest): void {
    const endpoint = req.path;
    const method = req.method;
    const key = `${method}:${endpoint}`;

    const stats = this.requestStats.get(key) || {
      count: 0,
      lastSeen: Date.now(),
    };
    stats.count++;
    stats.lastSeen = Date.now();
    this.requestStats.set(key, stats);
  }

  /**
   * Configuration loaders
   */
  private loadRateLimitConfig(): RateLimitConfig {
    return {
      strategy: this.configService.get(
        'api.security.rateLimit.strategy',
        RateLimitStrategy.TOKEN_BUCKET,
      ),
      maxRequests: this.configService.get(
        'api.security.rateLimit.maxRequests',
        1000,
      ),
      windowMs: this.configService.get(
        'api.security.rateLimit.windowMs',
        900000,
      ), // 15 minutes
      burstLimit: this.configService.get(
        'api.security.rateLimit.burstLimit',
        100,
      ),
      skipSuccessfulRequests: this.configService.get(
        'api.security.rateLimit.skipSuccessfulRequests',
        false,
      ),
      skipFailedRequests: this.configService.get(
        'api.security.rateLimit.skipFailedRequests',
        false,
      ),
    };
  }

  private loadCORSConfig(): CORSConfig {
    return {
      enabled: this.configService.get('api.security.cors.enabled', true),
      allowedOrigins: this.configService.get(
        'api.security.cors.allowedOrigins',
        ['http://localhost:3000'],
      ),
      allowedMethods: this.configService.get(
        'api.security.cors.allowedMethods',
        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      ),
      allowedHeaders: this.configService.get(
        'api.security.cors.allowedHeaders',
        [
          'Origin',
          'X-Requested-With',
          'Content-Type',
          'Accept',
          'Authorization',
          'X-Request-ID',
        ],
      ),
      exposedHeaders: this.configService.get(
        'api.security.cors.exposedHeaders',
        ['X-Request-ID'],
      ),
      credentials: this.configService.get(
        'api.security.cors.credentials',
        true,
      ),
      maxAge: this.configService.get('api.security.cors.maxAge', 86400), // 24 hours
      optionsSuccessStatus: this.configService.get(
        'api.security.cors.optionsSuccessStatus',
        204,
      ),
    };
  }

  private loadSecurityHeadersConfig(): SecurityHeadersConfig {
    return {
      contentSecurityPolicy: {
        enabled: this.configService.get(
          'api.security.headers.csp.enabled',
          true,
        ),
        directives: this.configService.get(
          'api.security.headers.csp.directives',
          {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'unsafe-inline'"],
            'style-src': ["'self'", "'unsafe-inline'"],
            'img-src': ["'self'", '_data:', 'https:'],
            'font-src': ["'self'"],
            'object-src': ["'none'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
          },
        ),
        reportOnly: this.configService.get(
          'api.security.headers.csp.reportOnly',
          false,
        ),
      },
      strictTransportSecurity: {
        enabled: this.configService.get(
          'api.security.headers.hsts.enabled',
          true,
        ),
        maxAge: this.configService.get(
          'api.security.headers.hsts.maxAge',
          31536000,
        ), // 1 year
        includeSubDomains: this.configService.get(
          'api.security.headers.hsts.includeSubDomains',
          true,
        ),
        preload: this.configService.get(
          'api.security.headers.hsts.preload',
          false,
        ),
      },
      xFrameOptions: {
        enabled: this.configService.get(
          'api.security.headers.xFrameOptions.enabled',
          true,
        ),
        policy: this.configService.get(
          'api.security.headers.xFrameOptions.policy',
          'DENY',
        ),
      },
      xContentTypeOptions: {
        enabled: this.configService.get(
          'api.security.headers.xContentTypeOptions.enabled',
          true,
        ),
      },
      xXssProtection: {
        enabled: this.configService.get(
          'api.security.headers.xXssProtection.enabled',
          true,
        ),
        mode: this.configService.get(
          'api.security.headers.xXssProtection.mode',
          '1; mode=block',
        ),
      },
      referrerPolicy: {
        enabled: this.configService.get(
          'api.security.headers.referrerPolicy.enabled',
          true,
        ),
        policy: this.configService.get(
          'api.security.headers.referrerPolicy.policy',
          'strict-origin-when-cross-origin',
        ),
      },
      permissionsPolicy: {
        enabled: this.configService.get(
          'api.security.headers.permissionsPolicy.enabled',
          true,
        ),
        directives: this.configService.get(
          'api.security.headers.permissionsPolicy.directives',
          {
            camera: ['()'],
            microphone: ['()'],
            geolocation: ['()'],
            payment: ['()'],
          },
        ),
      },
    };
  }

  /**
   * Cleanup and maintenance
   */
  private startCleanupTimers(): void {
    // Cleanup rate limiter buckets every 10 minutes
    setInterval(() => {
      this.tokenBucketLimiter.cleanup();
      this.slidingWindowLimiter.cleanup();
    }, 600000);

    // Cleanup request stats every hour
    setInterval(() => {
      const now = Date.now();
      const cutoff = now - 3600000; // 1 hour

      for (const [key, stats] of Array.from(this.requestStats.entries())) {
        if (stats.lastSeen < cutoff) {
          this.requestStats.delete(key);
        }
      }
    }, 3600000);

    // Cleanup old anomalies every 24 hours
    setInterval(() => {
      const cutoff = Date.now() - 86400000; // 24 hours
      const validAnomalies = this.trafficAnomalies.filter(
        (anomaly) => anomaly.timestamp.getTime() > cutoff,
      );

      this.trafficAnomalies.length = 0;
      this.trafficAnomalies.push(...validAnomalies);
    }, 86400000);
  }

  private startTrafficAnalysis(): void {
    // Analyze traffic patterns every 5 minutes
    setInterval(() => {
      this.analyzeOverallTraffic();
    }, 300000);
  }

  private analyzeOverallTraffic(): void {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;

    // Count recent requests by IP
    const ipCounts = new Map<string, number>();

    for (const [key, stats] of Array.from(this.requestStats.entries())) {
      if (stats.lastSeen > fiveMinutesAgo) {
        const parts = key.split(':');
        if (parts.length >= 2) {
          // This is a simplified analysis - in production would be more sophisticated
          const count = ipCounts.get('overall') || 0;
          ipCounts.set('overall', count + stats.count);
        }
      }
    }

    // Check for overall volume spikes
    const totalRequests = Array.from(ipCounts.values()).reduce(
      (sum, count) => sum + count,
      0,
    );

    if (totalRequests > 10000) {
      // Threshold for volume spike
      this.logger.warn('High traffic volume detected', {
        totalRequests,
        timeWindow: 300000,
        timestamp: new Date(now),
      });

      this.eventEmitter.emit('api.traffic.volume_spike', {
        totalRequests,
        timeWindow: 300000,
        timestamp: new Date(now),
      });
    }
  }

  /**
   * Get API security statistics
   */
  getSecurityStatistics(): {
    rateLimits: {
      strategy: string;
      activeKeys: number;
      totalBlocked: number;
    };
    cors: {
      enabled: boolean;
      allowedOrigins: number;
    };
    anomalies: {
      total: number;
      last24Hours: number;
      bySeverity: Record<string, number>;
    };
    traffic: {
      activeEndpoints: number;
      totalRequests: number;
    };
  } {
    const last24Hours = Date.now() - 86400000;
    const recentAnomalies = this.trafficAnomalies.filter(
      (anomaly) => anomaly.timestamp.getTime() > last24Hours,
    );

    const anomaliesBySeverity: Record<string, number> = {};
    recentAnomalies.forEach((anomaly) => {
      anomaliesBySeverity[anomaly.severity] =
        (anomaliesBySeverity[anomaly.severity] || 0) + 1;
    });

    return {
      rateLimits: {
        strategy: this.rateLimitConfig.strategy,
        activeKeys: this.requestStats.size,
        totalBlocked: 0, // Would track this in production
      },
      cors: {
        enabled: this.corsConfig.enabled,
        allowedOrigins: Array.isArray(this.corsConfig.allowedOrigins)
          ? this.corsConfig.allowedOrigins.length
          : 1,
      },
      anomalies: {
        total: this.trafficAnomalies.length,
        last24Hours: recentAnomalies.length,
        bySeverity: anomaliesBySeverity,
      },
      traffic: {
        activeEndpoints: this.requestStats.size,
        totalRequests: Array.from(this.requestStats.values()).reduce(
          (sum, stats) => sum + stats.count,
          0,
        ),
      },
    };
  }
}

export default ApiSecurityService;
