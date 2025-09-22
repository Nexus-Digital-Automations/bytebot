import { Injectable, NestMiddleware, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimiterService, RateLimitResult } from './rate-limiter.service';

/**
 * Rate Limiting Middleware
 *
 * Integrates rate limiting service with NestJS middleware pipeline
 * Provides consistent rate limiting across all API endpoints
 */

@Injectable()
export class RateLimitingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitingMiddleware.name);

  constructor(private readonly rateLimiterService: RateLimiterService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.rateLimiterService.checkRateLimit(req);

      // Set rate limiting headers
      this.setRateLimitHeaders(res, result);

      if (!result.allowed) {
        this.handleRateLimitExceeded(req, res, result);
        return;
      }

      next();
    } catch (error) {
      this.logger.error('Rate limiting middleware error', error);
      // Fail open - continue with request if rate limiting fails
      next();
    }
  }

  /**
   * Set standard rate limiting headers
   */
  private setRateLimitHeaders(res: Response, result: RateLimitResult): void {
    res.set({
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
      'X-RateLimit-Policy': `${result.limit};w=${Math.ceil((result.resetTime - Date.now()) / 1000)};comment="${result.algorithm}"`,
      'X-RateLimit-Rule': result.rule
    });

    if (result.retryAfter) {
      res.set('Retry-After', result.retryAfter.toString());
    }
  }

  /**
   * Handle rate limit exceeded
   */
  private handleRateLimitExceeded(req: Request, res: Response, result: RateLimitResult): void {
    this.logger.warn('Rate limit exceeded', {
      ip: req.ip,
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
      result
    });

    const errorResponse = {
      error: 'Rate limit exceeded',
      message: result.reason || 'Too many requests',
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      timestamp: new Date().toISOString(),
      path: req.path,
      rule: result.rule,
      algorithm: result.algorithm,
      retryAfter: result.retryAfter
    };

    res.status(HttpStatus.TOO_MANY_REQUESTS).json(errorResponse);
  }
}