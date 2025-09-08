/**
 * API Deprecation Guard - Enterprise Deprecation Management
 *
 * This guard manages API deprecation lifecycle, enforces sunset dates,
 * tracks usage of deprecated endpoints, and provides migration guidance.
 * Integrates with security event logging for deprecation monitoring.
 *
 * @fileoverview API deprecation lifecycle management guard
 * @version 1.0.0
 * @author API Versioning & Documentation Specialist
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { createSecurityEvent, SecurityEventType } from '@bytebot/shared';
import { getVersionConfig } from './api-version.decorator';

/**
 * Safely converts an unknown error to a string representation
 */
function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return '[Unserializable Error]';
  }
}

/**
 * Deprecation enforcement levels
 */
export enum DeprecationEnforcement {
  /** Log usage but allow requests */
  LOG_ONLY = 'log_only',

  /** Add warning headers but allow requests */
  WARN = 'warn',

  /** Block requests with deprecation warnings */
  BLOCK_WITH_WARNING = 'block_with_warning',

  /** Block all requests to deprecated endpoints */
  STRICT_BLOCK = 'strict_block',
}

/**
 * Deprecation policy configuration
 */
interface DeprecationPolicy {
  /** Enforcement level for deprecated APIs */
  enforcement: DeprecationEnforcement;

  /** Grace period after deprecation before blocking (days) */
  gracePeriodDays: number;

  /** Grace period after sunset before strict blocking (days) */
  sunsetGracePeriodDays: number;

  /** Whether to allow requests with special bypass header */
  allowBypass: boolean;

  /** Special bypass header name */
  bypassHeader: string;

  /** Whether to track usage statistics */
  trackUsage: boolean;

  /** Rate limit deprecated endpoint usage */
  rateLimitDeprecated: boolean;
}

/**
 * Deprecation usage statistics
 */
interface DeprecationStats {
  /** Total requests to deprecated endpoints */
  deprecatedRequests: number;

  /** Unique users accessing deprecated endpoints */
  uniqueUsers: Set<string>;

  /** Endpoints and their usage counts */
  endpointUsage: Map<string, number>;

  /** First seen timestamp */
  firstSeen: Date;

  /** Last seen timestamp */
  lastSeen: Date;

  /** User agents accessing deprecated endpoints */
  userAgents: Set<string>;
}

/**
 * Deprecation configuration interface
 */
interface DeprecationConfig {
  /** Whether the endpoint is deprecated */
  deprecated: boolean;
  /** Date when deprecation was announced */
  since?: string | Date;
  /** Date when endpoint will be sunset */
  sunset?: string | Date;
  /** Migration guide URL or instructions */
  migration?: string;
}

/**
 * Version configuration interface
 */
interface VersionConfig {
  /** API version */
  version: string;
  /** Deprecation information */
  deprecation?: DeprecationConfig;
}

/**
 * Deprecation evaluation result interface
 */
interface DeprecationResult {
  /** Current deprecation state */
  state:
    | 'not_deprecated'
    | 'deprecated_grace'
    | 'deprecated'
    | 'sunset'
    | 'sunset_strict';
  /** Whether endpoint is in grace period */
  inGracePeriod: boolean;
  /** Whether endpoint has reached sunset date */
  isSunset: boolean;
  /** Whether past sunset grace period */
  isPastSunsetGrace: boolean;
  /** Days until sunset (if applicable) */
  daysUntilSunset: number | null;
}

/**
 * Error type with message and optional stack
 */
interface ErrorWithStack {
  message: string;
  stack?: string;
}

/**
 * Request with optional user property
 */
interface RequestWithUser extends Request {
  user?: {
    id?: string;
    [key: string]: unknown;
  };
}

/**
 * Type guard to check if object is an error with stack
 * @param obj - Object to check
 * @returns Whether object is ErrorWithStack
 */
function isErrorWithStack(obj: unknown): obj is ErrorWithStack {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as ErrorWithStack).message === 'string'
  );
}

/**
 * Type guard to check if request has user property with id
 * @param request - Request to check
 * @returns Whether request has user.id
 */
function isRequestWithUser(request: Request): request is RequestWithUser {
  return (
    typeof (request as RequestWithUser).user === 'object' &&
    (request as RequestWithUser).user !== null
  );
}

@Injectable()
export class DeprecationGuard implements CanActivate {
  private readonly logger = new Logger(DeprecationGuard.name);
  private readonly policy: DeprecationPolicy;
  private readonly stats: DeprecationStats;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    // Load deprecation policy from configuration
    this.policy = {
      enforcement: this.configService.get(
        'api.deprecation.enforcement',
        DeprecationEnforcement.WARN,
      ),
      gracePeriodDays: Number(
        this.configService.get('api.deprecation.gracePeriodDays', 30),
      ),
      sunsetGracePeriodDays: Number(
        this.configService.get('api.deprecation.sunsetGracePeriodDays', 7),
      ),
      allowBypass: Boolean(
        this.configService.get<boolean>('api.deprecation.allowBypass', false),
      ),
      bypassHeader: String(
        this.configService.get(
          'api.deprecation.bypassHeader',
          'X-Deprecation-Bypass',
        ),
      ),
      trackUsage: Boolean(
        this.configService.get<boolean>('api.deprecation.trackUsage', true),
      ),
      rateLimitDeprecated: Boolean(
        this.configService.get<boolean>(
          'api.deprecation.rateLimitDeprecated',
          true,
        ),
      ),
    };

    // Initialize usage statistics
    this.stats = {
      deprecatedRequests: 0,
      uniqueUsers: new Set(),
      endpointUsage: new Map(),
      firstSeen: new Date(),
      lastSeen: new Date(),
      userAgents: new Set(),
    };

    this.logger.log('Deprecation guard initialized', {
      enforcement: this.policy.enforcement,
      gracePeriodDays: this.policy.gracePeriodDays,
      sunsetGracePeriodDays: this.policy.sunsetGracePeriodDays,
      allowBypass: this.policy.allowBypass,
      trackUsage: this.policy.trackUsage,
    });
  }

  /**
   * Check if request can access potentially deprecated endpoint
   * @param context - Execution context
   * @returns Promise<boolean> - Whether request is allowed
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const operationId = `deprecation-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const startTime = Date.now();

    try {
      const request = context.switchToHttp().getRequest<Request>();
      const response = context.switchToHttp().getResponse<Response>();

      // Get version configuration from endpoint (simulate async operation)
      const versionConfig = await Promise.resolve(
        getVersionConfig(context.getHandler()),
      );

      if (!versionConfig || !versionConfig.deprecation?.deprecated) {
        // Endpoint is not deprecated, allow request
        return true;
      }

      this.logger.debug(
        `[${operationId}] Checking deprecated endpoint access`,
        {
          operationId,
          endpoint: request.url,
          method: request.method,
          deprecationSince: versionConfig.deprecation.since,
          sunsetDate: versionConfig.deprecation.sunset,
          enforcement: this.policy.enforcement,
        },
      );

      // Track usage if enabled
      if (this.policy.trackUsage) {
        this.trackDeprecatedUsage(request, versionConfig, operationId);
      }

      // Check for bypass header
      if (this.policy.allowBypass && request.get(this.policy.bypassHeader)) {
        this.logger.warn(`[${operationId}] Deprecation bypass used`, {
          operationId,
          endpoint: request.url,
          bypassHeader: this.policy.bypassHeader,
        });

        // Log security event for bypass usage
        this.logDeprecationBypass(request, versionConfig, operationId);

        // Set warning headers but allow request
        this.setDeprecationHeaders(response, versionConfig, true);
        return true;
      }

      // Check enforcement level and dates
      const now = new Date();
      const deprecationResult = this.evaluateDeprecation(
        versionConfig,
        now,
        operationId,
      );

      // Set deprecation headers
      this.setDeprecationHeaders(response, versionConfig, false);

      // Apply enforcement policy
      const allowed = this.applyEnforcementPolicy(
        deprecationResult,
        request,
        versionConfig,
        operationId,
      );

      const processingTime = Date.now() - startTime;

      if (allowed) {
        this.logger.debug(
          `[${operationId}] Deprecated endpoint access allowed`,
          {
            operationId,
            enforcement: this.policy.enforcement,
            deprecationState: deprecationResult.state,
            processingTimeMs: processingTime,
          },
        );
      } else {
        this.logger.warn(
          `[${operationId}] Deprecated endpoint access blocked`,
          {
            operationId,
            enforcement: this.policy.enforcement,
            deprecationState: deprecationResult.state,
            processingTimeMs: processingTime,
          },
        );
      }

      return allowed;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;

      if (isErrorWithStack(error)) {
        this.logger.error(`[${operationId}] Deprecation guard error`, {
          operationId,
          error: error.message,
          stack: error.stack,
          processingTimeMs: processingTime,
        });
      } else {
        this.logger.error(`[${operationId}] Deprecation guard error`, {
          operationId,
          error: getSafeErrorMessage(error),
          processingTimeMs: processingTime,
        });
      }

      // Allow request on error (fail open)
      return true;
    }
  }

  /**
   * Evaluate deprecation status of endpoint
   * @param versionConfig - Version configuration
   * @param now - Current date
   * @param operationId - Operation ID
   * @returns Deprecation evaluation result
   */
  private evaluateDeprecation(
    versionConfig: VersionConfig,
    now: Date,
    operationId: string,
  ): DeprecationResult {
    const deprecation = versionConfig.deprecation;

    if (!deprecation) {
      return {
        state: 'not_deprecated',
        inGracePeriod: false,
        isSunset: false,
        isPastSunsetGrace: false,
        daysUntilSunset: null,
      };
    }

    const deprecatedSince = deprecation.since
      ? new Date(deprecation.since)
      : null;
    const sunsetDate = deprecation.sunset ? new Date(deprecation.sunset) : null;

    const inGracePeriod = deprecatedSince
      ? now.getTime() - deprecatedSince.getTime() <=
        this.policy.gracePeriodDays * 24 * 60 * 60 * 1000
      : false;

    const isSunset = sunsetDate ? now >= sunsetDate : false;

    const isPastSunsetGrace =
      sunsetDate && isSunset
        ? now.getTime() - sunsetDate.getTime() >
          this.policy.sunsetGracePeriodDays * 24 * 60 * 60 * 1000
        : false;

    const daysUntilSunset =
      sunsetDate && !isSunset
        ? Math.ceil(
            (sunsetDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
          )
        : null;

    let state: DeprecationResult['state'] = 'deprecated';
    if (isSunset) {
      state = isPastSunsetGrace ? 'sunset_strict' : 'sunset';
    } else if (inGracePeriod) {
      state = 'deprecated_grace';
    }

    this.logger.debug(`[${operationId}] Deprecation evaluation completed`, {
      operationId,
      state,
      inGracePeriod,
      isSunset,
      isPastSunsetGrace,
      daysUntilSunset,
      deprecatedSince: deprecatedSince?.toISOString(),
      sunsetDate: sunsetDate?.toISOString(),
    });

    return {
      state,
      inGracePeriod,
      isSunset,
      isPastSunsetGrace,
      daysUntilSunset,
    };
  }

  /**
   * Apply deprecation enforcement policy
   * @param deprecationResult - Deprecation evaluation result
   * @param request - Express request
   * @param versionConfig - Version configuration
   * @param operationId - Operation ID
   * @returns Whether request is allowed
   */
  private applyEnforcementPolicy(
    deprecationResult: DeprecationResult,
    request: Request,
    versionConfig: VersionConfig,
    operationId: string,
  ): boolean {
    switch (this.policy.enforcement) {
      case DeprecationEnforcement.LOG_ONLY:
        // Always allow, just log
        this.logDeprecationAccess(
          request,
          versionConfig,
          deprecationResult,
          operationId,
        );
        return true;

      case DeprecationEnforcement.WARN:
        // Allow but log warning
        this.logDeprecationAccess(
          request,
          versionConfig,
          deprecationResult,
          operationId,
        );
        return true;

      case DeprecationEnforcement.BLOCK_WITH_WARNING:
        // Block if past grace period or sunset
        if (
          deprecationResult.state === 'sunset_strict' ||
          (!deprecationResult.inGracePeriod &&
            deprecationResult.state !== 'deprecated_grace')
        ) {
          this.throwDeprecationError(
            versionConfig,
            deprecationResult,
            operationId,
          );
          return false;
        }
        return true;

      case DeprecationEnforcement.STRICT_BLOCK:
        // Block all deprecated endpoint access
        this.throwDeprecationError(
          versionConfig,
          deprecationResult,
          operationId,
        );
        return false;

      default:
        this.logger.warn(
          `[${operationId}] Unknown enforcement level: ${String(this.policy.enforcement)}`,
        );
        return true;
    }
  }

  /**
   * Set deprecation response headers
   * @param response - Express response
   * @param versionConfig - Version configuration
   * @param bypassUsed - Whether bypass was used
   */
  private setDeprecationHeaders(
    response: Response,
    versionConfig: VersionConfig,
    bypassUsed: boolean,
  ): void {
    const deprecation = versionConfig.deprecation;

    if (!deprecation) {
      return;
    }

    if (deprecation.since) {
      const sinceDate = new Date(deprecation.since);
      response.setHeader('Deprecation', `date="${sinceDate.toISOString()}"`);
    }

    if (deprecation.sunset) {
      const sunsetDate = new Date(deprecation.sunset);
      response.setHeader('Sunset', sunsetDate.toISOString());
    }

    if (deprecation.migration) {
      response.setHeader('API-Migration-Guide', deprecation.migration);
    }

    // Add warning header
    let warningMessage = `299 - "API endpoint is deprecated"`;
    if (deprecation.sunset) {
      const sunsetDate = new Date(deprecation.sunset);
      warningMessage += ` and will be removed on ${sunsetDate.toISOString()}`;
    }

    response.setHeader('Warning', warningMessage);

    if (bypassUsed) {
      response.setHeader('X-Deprecation-Bypass-Used', 'true');
    }
  }

  /**
   * Track usage statistics for deprecated endpoints
   * @param request - Express request
   * @param versionConfig - Version configuration
   * @param operationId - Operation ID
   */
  private trackDeprecatedUsage(
    request: Request,
    versionConfig: VersionConfig,
    operationId: string,
  ): void {
    try {
      this.stats.deprecatedRequests++;
      this.stats.lastSeen = new Date();

      const userId = isRequestWithUser(request)
        ? request.user?.id || 'anonymous'
        : 'anonymous';
      this.stats.uniqueUsers.add(userId);

      const endpoint = `${request.method} ${request.url}`;
      const currentCount = this.stats.endpointUsage.get(endpoint) || 0;
      this.stats.endpointUsage.set(endpoint, currentCount + 1);

      const userAgent = request.get('User-Agent') || 'unknown';
      this.stats.userAgents.add(userAgent);

      this.logger.debug(`[${operationId}] Deprecated endpoint usage tracked`, {
        operationId,
        endpoint,
        userId,
        totalDeprecatedRequests: this.stats.deprecatedRequests,
        uniqueUsers: this.stats.uniqueUsers.size,
      });
    } catch (error: unknown) {
      this.logger.error(`[${operationId}] Failed to track deprecated usage`, {
        operationId,
        error: isErrorWithStack(error)
          ? error.message
          : getSafeErrorMessage(error),
      });
    }
  }

  /**
   * Log deprecation access for monitoring
   * @param request - Express request
   * @param versionConfig - Version configuration
   * @param deprecationResult - Deprecation evaluation result
   * @param operationId - Operation ID
   */
  private logDeprecationAccess(
    request: Request,
    versionConfig: VersionConfig,
    deprecationResult: DeprecationResult,
    operationId: string,
  ): void {
    try {
      const userId = isRequestWithUser(request) ? request.user?.id : undefined;
      const userAgent = request.get('User-Agent') || undefined;

      const securityEvent = createSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        request.url,
        request.method,
        true,
        `Deprecated API endpoint accessed: ${request.url}`,
        {
          operationId,
          apiVersion: versionConfig.version,
          deprecationState: deprecationResult.state,
          inGracePeriod: deprecationResult.inGracePeriod,
          isSunset: deprecationResult.isSunset,
          daysUntilSunset: deprecationResult.daysUntilSunset,
          enforcement: this.policy.enforcement,
          deprecationSince: versionConfig.deprecation?.since,
          sunsetDate: versionConfig.deprecation?.sunset,
          migrationGuide: versionConfig.deprecation?.migration,
          endpoint: `${request.method} ${request.url}`,
        },
        userId,
        request.ip,
        userAgent,
      );

      this.logger.warn(`Deprecated API access: ${securityEvent.eventId}`, {
        eventId: securityEvent.eventId,
        endpoint: request.url,
        deprecationState: deprecationResult.state,
        riskScore: securityEvent.riskScore,
        operationId,
      });
    } catch (error: unknown) {
      this.logger.error('Failed to log deprecation access security event', {
        operationId,
        error: isErrorWithStack(error)
          ? error.message
          : getSafeErrorMessage(error),
      });
    }
  }

  /**
   * Log deprecation bypass usage
   * @param request - Express request
   * @param versionConfig - Version configuration
   * @param operationId - Operation ID
   */
  private logDeprecationBypass(
    request: Request,
    versionConfig: VersionConfig,
    operationId: string,
  ): void {
    try {
      const userId = isRequestWithUser(request) ? request.user?.id : undefined;
      const userAgent = request.get('User-Agent') || undefined;

      const securityEvent = createSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        request.url,
        request.method,
        true,
        `Deprecation bypass used for endpoint: ${request.url}`,
        {
          operationId,
          apiVersion: versionConfig.version,
          bypassType: 'deprecation_bypass',
          bypassHeader: this.policy.bypassHeader,
          endpoint: `${request.method} ${request.url}`,
        },
        userId,
        request.ip,
        userAgent,
      );

      this.logger.warn(`Deprecation bypass used: ${securityEvent.eventId}`, {
        eventId: securityEvent.eventId,
        endpoint: request.url,
        riskScore: securityEvent.riskScore,
        operationId,
      });
    } catch (error: unknown) {
      this.logger.error('Failed to log deprecation bypass security event', {
        operationId,
        error: isErrorWithStack(error)
          ? error.message
          : getSafeErrorMessage(error),
      });
    }
  }

  /**
   * Throw appropriate deprecation error
   * @param versionConfig - Version configuration
   * @param deprecationResult - Deprecation evaluation result
   * @param operationId - Operation ID
   */
  private throwDeprecationError(
    versionConfig: VersionConfig,
    deprecationResult: DeprecationResult,
    operationId: string,
  ): void {
    const deprecation = versionConfig.deprecation;

    if (!deprecation) {
      throw new HttpException(
        {
          statusCode: HttpStatus.GONE,
          message: 'API endpoint is deprecated',
          error: 'Gone',
          operationId,
        },
        HttpStatus.GONE,
      );
    }

    let message = `API endpoint is deprecated`;
    let statusCode = HttpStatus.GONE; // 410 Gone

    if (deprecationResult.isSunset) {
      message = `API endpoint has been sunset and is no longer available`;
      statusCode = HttpStatus.GONE;
    } else if (deprecation.sunset) {
      const sunsetDate = new Date(deprecation.sunset);
      message += ` and will be removed on ${sunsetDate.toISOString()}`;
    }

    if (deprecation.migration) {
      message += `. Migration guide: ${deprecation.migration}`;
    }

    throw new HttpException(
      {
        statusCode,
        message,
        error: 'Gone',
        deprecation: {
          since: deprecation.since,
          sunset: deprecation.sunset,
          migration: deprecation.migration,
          state: deprecationResult.state,
          daysUntilSunset: deprecationResult.daysUntilSunset,
        },
        operationId,
      },
      statusCode,
    );
  }

  /**
   * Get current deprecation usage statistics
   * @returns Deprecation usage statistics
   */
  getUsageStatistics(): Omit<DeprecationStats, 'uniqueUsers' | 'userAgents'> & {
    uniqueUsers: number;
    userAgents: number;
  } {
    return {
      deprecatedRequests: this.stats.deprecatedRequests,
      uniqueUsers: this.stats.uniqueUsers.size,
      endpointUsage: this.stats.endpointUsage,
      firstSeen: this.stats.firstSeen,
      lastSeen: this.stats.lastSeen,
      userAgents: this.stats.userAgents.size,
    };
  }

  /**
   * Clear usage statistics
   */
  clearStatistics(): void {
    this.stats.deprecatedRequests = 0;
    this.stats.uniqueUsers.clear();
    this.stats.endpointUsage.clear();
    this.stats.userAgents.clear();
    this.stats.firstSeen = new Date();
    this.stats.lastSeen = new Date();

    this.logger.log('Deprecation usage statistics cleared');
  }
}

export default DeprecationGuard;
