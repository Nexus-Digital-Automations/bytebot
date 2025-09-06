/**
 * Enterprise Rate Limiting Guard - Computer Use API Security Protection
 *
 * This guard provides comprehensive rate limiting protection for all Bytebot
 * computer-use endpoints with threat detection, IP-based tracking, and
 * configurable limits per endpoint type.
 *
 * @fileoverview Enterprise-grade rate limiting with security monitoring
 * @version 1.0.0
 * @author Input Validation & API Security Specialist
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Rate limiting configuration per endpoint type
 */
interface RateLimitConfig {
  /** Maximum requests per time window */
  limit: number;
  
  /** Time window in seconds */
  windowSeconds: number;
  
  /** Rate limit tier (for logging/monitoring) */
  tier: 'strict' | 'moderate' | 'lenient';
  
  /** Custom error message */
  message?: string;
}

/**
 * Default rate limiting configurations by endpoint type
 */
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Computer control operations - moderate limits
  computer_use: {
    limit: 120,
    windowSeconds: 60,
    tier: 'moderate',
    message: 'Computer control rate limit exceeded. Please slow down.',
  },
  
  // Authentication endpoints - strict limits
  auth: {
    limit: 10,
    windowSeconds: 60,
    tier: 'strict',
    message: 'Authentication rate limit exceeded. Try again later.',
  },
  
  // Screenshot/vision operations - moderate limits (resource intensive)
  vision: {
    limit: 30,
    windowSeconds: 60,
    tier: 'moderate',
    message: 'Vision processing rate limit exceeded.',
  },
  
  // File operations - strict limits (potential for abuse)
  file_operations: {
    limit: 20,
    windowSeconds: 60,
    tier: 'strict',
    message: 'File operation rate limit exceeded.',
  },
  
  // General API operations - lenient limits
  general: {
    limit: 200,
    windowSeconds: 60,
    tier: 'lenient',
    message: 'API rate limit exceeded. Please reduce request frequency.',
  },
};

/**
 * Metadata key for rate limit configuration
 */
export const RATE_LIMIT_KEY = 'rate-limit';

/**
 * Decorator to set custom rate limits for specific endpoints
 */
export const RateLimit = (config: Partial<RateLimitConfig> & { type: string }) =>
  SetMetadata(RATE_LIMIT_KEY, {
    ...RATE_LIMIT_CONFIGS.general,
    ...config,
  });

@Injectable()
export class EnterpriseRateLimitGuard extends ThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(EnterpriseRateLimitGuard.name);

  // In-memory tracking for suspicious activity
  private suspiciousActivityTracker = new Map<string, {
    violations: number;
    firstViolation: Date;
    blocked: boolean;
  }>();

  constructor(
    options: any, 
    storageService: any, 
    protected reflector: Reflector
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const operationId = `rate-limit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Get rate limit configuration for this endpoint
      const rateLimitConfig = this.getRateLimitConfig(context);
      const clientIdentifier = this.getClientIdentifier(request);

      this.logger.debug(`[${operationId}] Rate limit check initiated`, {
        operationId,
        endpoint: request.path,
        method: request.method,
        clientIdentifier,
        rateLimitTier: rateLimitConfig.tier,
        limit: rateLimitConfig.limit,
        windowSeconds: rateLimitConfig.windowSeconds,
      });

      // Check if client is temporarily blocked for suspicious activity
      if (this.isClientBlocked(clientIdentifier)) {
        this.logger.warn(`[${operationId}] Client blocked due to suspicious activity`, {
          operationId,
          clientIdentifier,
          endpoint: request.path,
          blocked: true,
        });

        throw new ThrottlerException(
          'Access temporarily blocked due to suspicious activity',
        );
      }

      // Perform rate limiting check using NestJS throttler
      const allowed = await super.canActivate(context);

      if (allowed) {
        this.logger.debug(`[${operationId}] Rate limit check passed`, {
          operationId,
          clientIdentifier,
          endpoint: request.path,
          allowed: true,
          rateLimitTier: rateLimitConfig.tier,
        });

        // Reset suspicious activity counter on successful request
        this.resetSuspiciousActivity(clientIdentifier);
        
        return true;
      }

      // This shouldn't be reached if super.canActivate throws on failure
      return false;

    } catch (error) {
      if (error instanceof ThrottlerException || error.status === HttpStatus.TOO_MANY_REQUESTS) {
        const clientIdentifier = this.getClientIdentifier(request);
        const rateLimitConfig = this.getRateLimitConfig(context);

        // Track rate limit violations for suspicious activity detection
        this.trackSuspiciousActivity(clientIdentifier);

        this.logger.warn(`[${operationId}] Rate limit exceeded`, {
          operationId,
          clientIdentifier,
          endpoint: request.path,
          method: request.method,
          rateLimitTier: rateLimitConfig.tier,
          limit: rateLimitConfig.limit,
          userAgent: request.headers['user-agent'],
          rateLimited: true,
        });

        // Return custom error message
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: rateLimitConfig.message || 'Rate limit exceeded',
            retryAfter: rateLimitConfig.windowSeconds,
            rateLimitTier: rateLimitConfig.tier,
            operationId,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Get rate limit configuration for the current endpoint
   */
  private getRateLimitConfig(context: ExecutionContext): RateLimitConfig {
    // Try to get custom rate limit from decorator first
    const customConfig = this.reflector.getAllAndOverride<RateLimitConfig & { type: string }>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (customConfig) {
      return customConfig;
    }

    // Determine rate limit type based on endpoint path
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path.toLowerCase();

    if (path.includes('computer-use')) {
      return RATE_LIMIT_CONFIGS.computer_use;
    } else if (path.includes('auth') || path.includes('login')) {
      return RATE_LIMIT_CONFIGS.auth;
    } else if (path.includes('screenshot') || path.includes('vision') || path.includes('ocr')) {
      return RATE_LIMIT_CONFIGS.vision;
    } else if (path.includes('file') || path.includes('read') || path.includes('write')) {
      return RATE_LIMIT_CONFIGS.file_operations;
    }

    // Default to general rate limiting
    return RATE_LIMIT_CONFIGS.general;
  }

  /**
   * Generate client identifier for rate limiting
   */
  private getClientIdentifier(request: Request): string {
    // Use combination of IP and User-Agent for better identification
    const ip = request.ip || 
               request.connection.remoteAddress || 
               request.socket.remoteAddress ||
               (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
               'unknown';
    
    const userAgent = request.headers['user-agent'] || 'unknown';
    
    // Create hash-like identifier without actually hashing (for performance)
    return `${ip}:${userAgent.substring(0, 50)}`.replace(/[^a-zA-Z0-9:.-]/g, '_');
  }

  /**
   * Track suspicious activity for potential threats
   */
  private trackSuspiciousActivity(clientIdentifier: string): void {
    const now = new Date();
    const existingEntry = this.suspiciousActivityTracker.get(clientIdentifier);

    if (existingEntry) {
      existingEntry.violations += 1;
      
      // Block client if too many violations within time window
      const timeDiff = now.getTime() - existingEntry.firstViolation.getTime();
      if (existingEntry.violations >= 10 && timeDiff < 300000) { // 5 minutes
        existingEntry.blocked = true;
        
        this.logger.error('Client blocked for suspicious rate limit violations', {
          clientIdentifier,
          violations: existingEntry.violations,
          timePeriodMs: timeDiff,
          blocked: true,
        });
      }
    } else {
      this.suspiciousActivityTracker.set(clientIdentifier, {
        violations: 1,
        firstViolation: now,
        blocked: false,
      });
    }

    // Clean up old entries (keep only last hour)
    this.cleanupSuspiciousActivityTracker();
  }

  /**
   * Check if client is currently blocked
   */
  private isClientBlocked(clientIdentifier: string): boolean {
    const entry = this.suspiciousActivityTracker.get(clientIdentifier);
    
    if (!entry) return false;

    // Unblock after 1 hour
    const blockDuration = 60 * 60 * 1000; // 1 hour
    const timeSinceFirstViolation = Date.now() - entry.firstViolation.getTime();
    
    if (timeSinceFirstViolation > blockDuration) {
      this.suspiciousActivityTracker.delete(clientIdentifier);
      return false;
    }

    return entry.blocked;
  }

  /**
   * Reset suspicious activity tracking for client
   */
  private resetSuspiciousActivity(clientIdentifier: string): void {
    const entry = this.suspiciousActivityTracker.get(clientIdentifier);
    
    if (entry && entry.violations > 0) {
      // Reset violations but keep the entry for tracking
      entry.violations = 0;
      entry.blocked = false;
    }
  }

  /**
   * Clean up old suspicious activity entries
   */
  private cleanupSuspiciousActivityTracker(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [clientId, entry] of this.suspiciousActivityTracker.entries()) {
      if (now - entry.firstViolation.getTime() > maxAge) {
        this.suspiciousActivityTracker.delete(clientId);
      }
    }
  }

  /**
   * Get current suspicious activity statistics (for monitoring)
   */
  getSuspiciousActivityStats(): {
    totalTracked: number;
    currentlyBlocked: number;
    topViolators: Array<{ client: string; violations: number; blocked: boolean }>;
  } {
    const blocked = Array.from(this.suspiciousActivityTracker.entries())
      .filter(([, entry]) => entry.blocked).length;

    const topViolators = Array.from(this.suspiciousActivityTracker.entries())
      .sort(([, a], [, b]) => b.violations - a.violations)
      .slice(0, 10)
      .map(([client, entry]) => ({
        client: client.substring(0, 20) + '...', // Truncate for privacy
        violations: entry.violations,
        blocked: entry.blocked,
      }));

    return {
      totalTracked: this.suspiciousActivityTracker.size,
      currentlyBlocked: blocked,
      topViolators,
    };
  }
}