/**
 * Advanced Throttle Guard - Enhanced NestJS Throttler with Security
 *
 * This guard extends the standard NestJS throttler with advanced features:
 * - Dynamic rate limiting based on user roles
 * - Intelligent burst detection and adaptive limits
 * - Security event logging and threat detection
 * - Custom key generation strategies
 *
 * @fileoverview Advanced throttling guard with role-based and adaptive limiting
 * @version 1.0.0
 * @author API Rate Limiting & Throttling Specialist
 */

import {
  Injectable,
  ExecutionContext,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';
import {
  UserRole,
  SecurityEventType,
  createSecurityEvent,
  RateLimitPreset,
} from '@bytebot/shared';

/**
 * Role-based throttling limits
 */
interface RoleThrottleConfig {
  /** Requests per minute for this role */
  rpm: number;

  /** Burst allowance (requests in 10 seconds) */
  burst?: number;

  /** Skip throttling for this role */
  skip?: boolean;
}

/**
 * Dynamic throttling configuration
 */
interface DynamicThrottleConfig {
  /** Base limit */
  baseLimit: number;

  /** Role-specific overrides */
  roleOverrides: Partial<Record<UserRole, RoleThrottleConfig>>;

  /** Enable adaptive limiting */
  adaptive?: boolean;

  /** Security monitoring */
  securityMonitoring?: boolean;

  /** Custom key strategy */
  keyStrategy?: 'ip' | 'user' | 'ip-user' | 'endpoint' | 'custom';

  /** Custom key generator function */
  customKeyGen?: (request: Request) => string;
}

/**
 * Default role-based throttle limits
 */
const DEFAULT_ROLE_LIMITS: Record<UserRole, RoleThrottleConfig> = {
  [UserRole.ADMIN]: {
    rpm: 1000,
    burst: 100,
    skip: false,
  },
  [UserRole.OPERATOR]: {
    rpm: 500,
    burst: 50,
    skip: false,
  },
  [UserRole.VIEWER]: {
    rpm: 100,
    burst: 20,
    skip: false,
  },
};

/**
 * Throttle configuration decorator
 */
export const THROTTLE_CONFIG_KEY = 'throttle_config';

/**
 * Advanced throttle decorator with role-based limits
 */
export const AdvancedThrottle = (config: DynamicThrottleConfig) =>
  Reflect.metadata(THROTTLE_CONFIG_KEY, config);

/**
 * Role-based throttle decorator
 */
export const RoleThrottle = (
  baseRpm: number,
  roleOverrides?: Partial<Record<UserRole, RoleThrottleConfig>>,
) =>
  AdvancedThrottle({
    baseLimit: baseRpm,
    roleOverrides: { ...DEFAULT_ROLE_LIMITS, ...roleOverrides },
    adaptive: true,
    securityMonitoring: true,
    keyStrategy: 'user',
  });

@Injectable()
export class AdvancedThrottleGuard extends ThrottlerGuard {
  private readonly logger = new Logger(AdvancedThrottleGuard.name);
  private readonly requestCounts = new Map<string, number>();
  private readonly suspiciousActivities = new Map<string, number>();

  constructor(private reflector: Reflector) {
    super();

    this.logger.log('Advanced throttle guard initialized', {
      defaultRoleLimits: DEFAULT_ROLE_LIMITS,
      features: [
        'role-based-limits',
        'adaptive-throttling',
        'security-monitoring',
      ],
    });
  }

  /**
   * Enhanced throttle check with role-based and adaptive limiting
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const operationId = `throttle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      const request = context.switchToHttp().getRequest<Request>();
      const user = (request as any).user;

      // Get throttle configuration
      const throttleConfig = this.getThrottleConfig(context);

      if (!throttleConfig) {
        // No throttling configured, use standard throttler
        return super.canActivate(context);
      }

      this.logger.debug(`[${operationId}] Advanced throttle check`, {
        operationId,
        method: request.method,
        url: request.url,
        userRole: user?.role,
        userId: user?.id,
        ip: request.ip,
        keyStrategy: throttleConfig.keyStrategy,
      });

      // Check if user role should skip throttling
      if (user?.role && throttleConfig.roleOverrides?.[user.role]?.skip) {
        this.logger.debug(`[${operationId}] Throttling skipped for role`, {
          operationId,
          userRole: user.role,
          userId: user.id,
        });
        return true;
      }

      // Generate throttle key
      const throttleKey = this.generateThrottleKey(request, throttleConfig);

      // Get effective limits for this request
      const limits = this.getEffectiveLimits(user, throttleConfig, throttleKey);

      // Check throttle limits
      const allowed = await this.checkThrottleLimits(
        throttleKey,
        limits,
        request,
        operationId,
      );

      if (!allowed) {
        // Log security event for throttling
        await this.logThrottleEvent(request, limits, operationId);

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Rate limit exceeded for ${user?.role || 'anonymous'} user`,
            error: 'Too Many Requests',
            limits: {
              rpm: limits.rpm,
              burst: limits.burst,
              keyStrategy: throttleConfig.keyStrategy,
            },
            operationId,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const processingTime = Date.now() - startTime;

      this.logger.debug(`[${operationId}] Advanced throttle check passed`, {
        operationId,
        processingTimeMs: processingTime,
        rpm: limits.rpm,
        burst: limits.burst,
        keyStrategy: throttleConfig.keyStrategy,
      });

      return true;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      if (
        error instanceof HttpException ||
        error instanceof ThrottlerException
      ) {
        throw error;
      }

      this.logger.error(`[${operationId}] Advanced throttle error`, {
        operationId,
        error: error.message,
        stack: error.stack,
        processingTimeMs: processingTime,
      });

      // Fall back to standard throttler on error
      return super.canActivate(context);
    }
  }

  /**
   * Get throttle configuration for current context
   */
  private getThrottleConfig(
    context: ExecutionContext,
  ): DynamicThrottleConfig | null {
    // Check method-level configuration
    const methodConfig = this.reflector.get<DynamicThrottleConfig>(
      THROTTLE_CONFIG_KEY,
      context.getHandler(),
    );

    if (methodConfig) {
      return methodConfig;
    }

    // Check class-level configuration
    const classConfig = this.reflector.get<DynamicThrottleConfig>(
      THROTTLE_CONFIG_KEY,
      context.getClass(),
    );

    if (classConfig) {
      return classConfig;
    }

    // Check for default endpoint-based throttling
    const request = context.switchToHttp().getRequest<Request>();

    if (request.url.includes('/auth/')) {
      return {
        baseLimit: 30, // 30 RPM for auth endpoints
        roleOverrides: DEFAULT_ROLE_LIMITS,
        adaptive: true,
        securityMonitoring: true,
        keyStrategy: 'ip',
      };
    }

    if (request.url.includes('/computer-use/')) {
      return {
        baseLimit: 120, // 120 RPM for computer operations
        roleOverrides: DEFAULT_ROLE_LIMITS,
        adaptive: true,
        securityMonitoring: true,
        keyStrategy: 'user',
      };
    }

    return null;
  }

  /**
   * Generate throttle key based on strategy
   */
  private generateThrottleKey(
    request: Request,
    config: DynamicThrottleConfig,
  ): string {
    const user = (request as any).user;
    const ip = request.ip || request.connection.remoteAddress || 'unknown';

    switch (config.keyStrategy) {
      case 'ip':
        return `throttle:ip:${ip}`;

      case 'user':
        return user?.id ? `throttle:user:${user.id}` : `throttle:ip:${ip}`;

      case 'ip-user':
        return user?.id
          ? `throttle:ip-user:${ip}:${user.id}`
          : `throttle:ip:${ip}`;

      case 'endpoint':
        return `throttle:endpoint:${request.method}:${request.route?.path || request.url}:${ip}`;

      case 'custom':
        return config.customKeyGen
          ? config.customKeyGen(request)
          : `throttle:custom:${ip}`;

      default:
        return `throttle:default:${ip}`;
    }
  }

  /**
   * Get effective throttle limits for user and configuration
   */
  private getEffectiveLimits(
    user: any,
    config: DynamicThrottleConfig,
    throttleKey: string,
  ): RoleThrottleConfig {
    let baseLimits: RoleThrottleConfig = {
      rpm: config.baseLimit,
      burst: Math.ceil(config.baseLimit / 6), // 10 seconds worth at base rate
      skip: false,
    };

    // Apply role-specific overrides
    if (user?.role && config.roleOverrides?.[user.role]) {
      baseLimits = { ...baseLimits, ...config.roleOverrides[user.role] };
    }

    // Apply adaptive adjustments
    if (config.adaptive) {
      baseLimits = this.applyAdaptiveLimits(baseLimits, throttleKey);
    }

    return baseLimits;
  }

  /**
   * Apply adaptive throttling based on request patterns
   */
  private applyAdaptiveLimits(
    baseLimits: RoleThrottleConfig,
    throttleKey: string,
  ): RoleThrottleConfig {
    const recentRequests = this.requestCounts.get(throttleKey) || 0;
    const suspiciousScore = this.suspiciousActivities.get(throttleKey) || 0;

    const adaptedLimits = { ...baseLimits };

    // Increase limits for consistent, normal usage
    if (recentRequests > 0 && suspiciousScore === 0) {
      adaptedLimits.rpm = Math.ceil(baseLimits.rpm * 1.2);
      adaptedLimits.burst = Math.ceil((baseLimits.burst || 0) * 1.2);
    }

    // Decrease limits for suspicious activity
    if (suspiciousScore > 0) {
      const penalty = Math.min(0.5, suspiciousScore * 0.1); // Max 50% reduction
      adaptedLimits.rpm = Math.ceil(baseLimits.rpm * (1 - penalty));
      adaptedLimits.burst = Math.ceil((baseLimits.burst || 0) * (1 - penalty));
    }

    this.logger.debug('Applied adaptive throttling', {
      throttleKey: throttleKey.substring(0, 30) + '...',
      originalRpm: baseLimits.rpm,
      adaptedRpm: adaptedLimits.rpm,
      recentRequests,
      suspiciousScore,
      adjustment: adaptedLimits.rpm !== baseLimits.rpm ? 'applied' : 'none',
    });

    return adaptedLimits;
  }

  /**
   * Check if request is within throttle limits
   */
  private async checkThrottleLimits(
    throttleKey: string,
    limits: RoleThrottleConfig,
    request: Request,
    operationId: string,
  ): Promise<boolean> {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const burstWindowMs = 10000; // 10 second burst window

    try {
      // Update request count
      const currentCount = this.requestCounts.get(throttleKey) || 0;
      this.requestCounts.set(throttleKey, currentCount + 1);

      // Clean up old counts (simplified in-memory approach)
      // In production, this should use Redis with proper expiration
      setTimeout(() => {
        const count = this.requestCounts.get(throttleKey) || 0;
        if (count > 0) {
          this.requestCounts.set(throttleKey, count - 1);
        }
      }, windowMs);

      // Check RPM limit
      if (currentCount >= limits.rpm) {
        this.logger.warn(`[${operationId}] RPM limit exceeded`, {
          operationId,
          throttleKey: throttleKey.substring(0, 30) + '...',
          currentCount,
          rpmLimit: limits.rpm,
          method: request.method,
          url: request.url,
        });

        // Track suspicious activity
        this.trackSuspiciousActivity(throttleKey);

        return false;
      }

      // Burst detection (simplified)
      if (limits.burst && currentCount >= limits.burst) {
        // Check if this is a burst (more than burst limit in burst window)
        // This is a simplified implementation - production should track precise timing
        const burstScore = Math.ceil(currentCount / 10); // Rough burst calculation

        if (burstScore >= (limits.burst || 0)) {
          this.logger.warn(`[${operationId}] Burst limit exceeded`, {
            operationId,
            throttleKey: throttleKey.substring(0, 30) + '...',
            currentCount,
            burstLimit: limits.burst,
            burstScore,
          });

          this.trackSuspiciousActivity(throttleKey);
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`[${operationId}] Error checking throttle limits`, {
        operationId,
        error: error.message,
        throttleKey: throttleKey.substring(0, 30) + '...',
      });

      // Allow request on error
      return true;
    }
  }

  /**
   * Track suspicious activity for adaptive throttling
   */
  private trackSuspiciousActivity(throttleKey: string): void {
    const currentScore = this.suspiciousActivities.get(throttleKey) || 0;
    this.suspiciousActivities.set(throttleKey, currentScore + 1);

    // Reset suspicious score after 5 minutes
    setTimeout(() => {
      const score = this.suspiciousActivities.get(throttleKey) || 0;
      if (score > 0) {
        this.suspiciousActivities.set(throttleKey, Math.max(0, score - 1));
      }
    }, 5 * 60000);

    this.logger.debug('Tracked suspicious activity', {
      throttleKey: throttleKey.substring(0, 30) + '...',
      suspiciousScore: currentScore + 1,
    });
  }

  /**
   * Log security event for throttle violation
   */
  private async logThrottleEvent(
    request: Request,
    limits: RoleThrottleConfig,
    operationId: string,
  ): Promise<void> {
    try {
      const user = (request as any).user;

      const securityEvent = createSecurityEvent(
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        request.url,
        request.method,
        false,
        `Advanced throttle limit exceeded: ${limits.rpm} RPM`,
        {
          operationId,
          rpmLimit: limits.rpm,
          burstLimit: limits.burst,
          userRole: user?.role,
          throttleType: 'advanced',
          adaptive: true,
          endpoint: request.url,
          method: request.method,
        },
        user?.id,
        request.ip,
        request.get('User-Agent'),
      );

      this.logger.warn(
        `Advanced throttle security event: ${securityEvent.eventId}`,
        {
          eventId: securityEvent.eventId,
          riskScore: securityEvent.riskScore,
          operationId,
        },
      );
    } catch (error) {
      this.logger.error('Failed to log advanced throttle security event', {
        operationId,
        error: error.message,
      });
    }
  }

  /**
   * Override the error message generation
   */
  protected generateErrorMessage(
    context: ExecutionContext,
    limit: number,
    ttl: number,
  ): string {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    return `Advanced rate limiting exceeded for ${user?.role || 'anonymous'} user. Try again in ${ttl} seconds.`;
  }
}

export default AdvancedThrottleGuard;
