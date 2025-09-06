/**
 * API Deprecation Guard - BytebotD Desktop Service Deprecation Management
 *
 * This guard manages API deprecation lifecycle for BytebotD desktop services,
 * enforces sunset dates, tracks usage of deprecated desktop endpoints, and
 * provides migration guidance specific to computer use operations.
 *
 * @fileoverview API deprecation lifecycle management for BytebotD desktop services
 * @version 1.0.0
 * @author Input Validation & API Security Specialist
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  HttpException,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import {
  getVersionConfig,
  isDesktopApiVersion,
  getDesktopCompatibility,
} from './api-version.decorator';

/**
 * Deprecation enforcement levels for BytebotD desktop services
 */
export enum DeprecationEnforcement {
  /** Log usage but allow requests */
  LOG_ONLY = 'log_only',

  /** Add warning headers but allow requests */
  WARN = 'warn',

  /** Block requests with deprecation warnings (grace period for desktop clients) */
  BLOCK_WITH_WARNING = 'block_with_warning',

  /** Block all requests to deprecated endpoints */
  STRICT_BLOCK = 'strict_block',
}

/**
 * Deprecation policy configuration for BytebotD
 */
interface DeprecationPolicy {
  /** Enforcement level for deprecated APIs */
  enforcement: DeprecationEnforcement;

  /** Grace period after deprecation before blocking (days) */
  gracePeriodDays: number;

  /** Grace period after sunset before strict blocking (days) */
  sunsetGracePeriodDays: number;

  /** Extended grace period for desktop clients (days) */
  desktopGracePeriodDays: number;

  /** Whether to allow requests with special bypass header */
  allowBypass: boolean;

  /** Special bypass header name */
  bypassHeader: string;

  /** Whether to track usage statistics */
  trackUsage: boolean;

  /** Rate limit deprecated endpoint usage */
  rateLimitDeprecated: boolean;

  /** Desktop-specific deprecation settings */
  desktopSpecific: {
    /** Allow legacy desktop clients extended access */
    allowLegacyClients: boolean;

    /** Minimum desktop client version for deprecation enforcement */
    minClientVersionForEnforcement: string;

    /** Computer use feature deprecation grace period */
    computerUseGracePeriodDays: number;
  };
}

/**
 * Deprecation usage statistics for BytebotD
 */
interface DeprecationStats {
  /** Total requests to deprecated endpoints */
  deprecatedRequests: number;

  /** Unique desktop clients accessing deprecated endpoints */
  uniqueDesktopClients: Set<string>;

  /** Endpoints and their usage counts */
  endpointUsage: Map<string, number>;

  /** Computer use specific deprecated requests */
  computerUseDeprecatedRequests: number;

  /** First seen timestamp */
  firstSeen: Date;

  /** Last seen timestamp */
  lastSeen: Date;

  /** Desktop client versions accessing deprecated endpoints */
  desktopClientVersions: Set<string>;

  /** VNC client information */
  vncClients: Set<string>;
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
    // Load deprecation policy from configuration with BytebotD defaults
    this.policy = {
      enforcement: this.configService.get(
        'api.deprecation.enforcement',
        DeprecationEnforcement.WARN,
      ),
      gracePeriodDays: this.configService.get(
        'api.deprecation.gracePeriodDays',
        30,
      ),
      sunsetGracePeriodDays: this.configService.get(
        'api.deprecation.sunsetGracePeriodDays',
        7,
      ),
      desktopGracePeriodDays: this.configService.get(
        'api.deprecation.desktopGracePeriodDays',
        60, // Extended grace period for desktop clients
      ),
      allowBypass: this.configService.get('api.deprecation.allowBypass', false),
      bypassHeader: this.configService.get(
        'api.deprecation.bypassHeader',
        'X-Deprecation-Bypass',
      ),
      trackUsage: this.configService.get('api.deprecation.trackUsage', true),
      rateLimitDeprecated: this.configService.get(
        'api.deprecation.rateLimitDeprecated',
        true,
      ),
      desktopSpecific: {
        allowLegacyClients: this.configService.get(
          'api.deprecation.desktop.allowLegacyClients',
          true,
        ),
        minClientVersionForEnforcement: this.configService.get(
          'api.deprecation.desktop.minClientVersion',
          '1.0.0',
        ),
        computerUseGracePeriodDays: this.configService.get(
          'api.deprecation.desktop.computerUseGracePeriod',
          90, // Extended grace for computer use operations
        ),
      },
    };

    // Initialize usage statistics
    this.stats = {
      deprecatedRequests: 0,
      uniqueDesktopClients: new Set(),
      endpointUsage: new Map(),
      computerUseDeprecatedRequests: 0,
      firstSeen: new Date(),
      lastSeen: new Date(),
      desktopClientVersions: new Set(),
      vncClients: new Set(),
    };

    this.logger.log('BytebotD deprecation guard initialized', {
      enforcement: this.policy.enforcement,
      gracePeriodDays: this.policy.gracePeriodDays,
      desktopGracePeriodDays: this.policy.desktopGracePeriodDays,
      sunsetGracePeriodDays: this.policy.sunsetGracePeriodDays,
      allowBypass: this.policy.allowBypass,
      trackUsage: this.policy.trackUsage,
      desktopSpecific: this.policy.desktopSpecific,
    });
  }

  /**
   * Check if request can access potentially deprecated desktop endpoint
   * @param context - Execution context
   * @returns Promise<boolean> - Whether request is allowed
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const operationId = `bytebotd-deprecation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      const request = context.switchToHttp().getRequest<Request>();
      const response = context.switchToHttp().getResponse<Response>();

      // Get version configuration from endpoint
      const versionConfig = getVersionConfig(context.getHandler());
      const isDesktopEndpoint = isDesktopApiVersion(context.getHandler());
      const desktopCompatibility = getDesktopCompatibility(
        context.getHandler(),
      );

      if (!versionConfig || !versionConfig.deprecation?.deprecated) {
        // Endpoint is not deprecated, allow request
        return true;
      }

      this.logger.debug(
        `[${operationId}] Checking deprecated BytebotD endpoint access`,
        {
          operationId,
          endpoint: request.url,
          method: request.method,
          isDesktopEndpoint,
          deprecationSince: versionConfig.deprecation.since,
          sunsetDate: versionConfig.deprecation.sunset,
          enforcement: this.policy.enforcement,
          desktopCompatibility,
        },
      );

      // Extract desktop client information
      const desktopClientInfo = this.extractDesktopClientInfo(request);

      // Track usage if enabled
      if (this.policy.trackUsage) {
        this.trackDeprecatedUsage(
          request,
          versionConfig,
          desktopClientInfo,
          operationId,
        );
      }

      // Check for bypass header
      if (this.policy.allowBypass && request.get(this.policy.bypassHeader)) {
        this.logger.warn(`[${operationId}] BytebotD deprecation bypass used`, {
          operationId,
          endpoint: request.url,
          bypassHeader: this.policy.bypassHeader,
          desktopClient: desktopClientInfo,
        });

        // Log security event for bypass usage
        await this.logDeprecationBypass(
          request,
          versionConfig,
          desktopClientInfo,
          operationId,
        );

        // Set warning headers but allow request
        this.setDeprecationHeaders(
          response,
          versionConfig,
          true,
          desktopClientInfo,
        );
        return true;
      }

      // Check enforcement level and dates with desktop-specific logic
      const now = new Date();
      const deprecationResult = this.evaluateDeprecation(
        versionConfig,
        now,
        isDesktopEndpoint,
        desktopClientInfo,
        operationId,
      );

      // Set deprecation headers
      this.setDeprecationHeaders(
        response,
        versionConfig,
        false,
        desktopClientInfo,
      );

      // Apply enforcement policy with desktop considerations
      const allowed = this.applyEnforcementPolicy(
        deprecationResult,
        request,
        versionConfig,
        isDesktopEndpoint,
        desktopClientInfo,
        operationId,
      );

      const processingTime = Date.now() - startTime;

      if (allowed) {
        this.logger.debug(
          `[${operationId}] Deprecated BytebotD endpoint access allowed`,
          {
            operationId,
            enforcement: this.policy.enforcement,
            deprecationState: deprecationResult.state,
            isDesktopEndpoint,
            desktopClient: desktopClientInfo,
            processingTimeMs: processingTime,
          },
        );
      } else {
        this.logger.warn(
          `[${operationId}] Deprecated BytebotD endpoint access blocked`,
          {
            operationId,
            enforcement: this.policy.enforcement,
            deprecationState: deprecationResult.state,
            isDesktopEndpoint,
            desktopClient: desktopClientInfo,
            processingTimeMs: processingTime,
          },
        );
      }

      return allowed;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] BytebotD deprecation guard error`, {
        operationId,
        error: error.message,
        stack: error.stack,
        processingTimeMs: processingTime,
      });

      // Allow request on error (fail open)
      return true;
    }
  }

  /**
   * Extract desktop client information from request headers
   * @param request - Express request
   * @returns Desktop client information
   */
  private extractDesktopClientInfo(request: Request): {
    clientId: string;
    version: string;
    vncClient: string;
    isComputerUse: boolean;
  } {
    const desktopClient = request.get('X-Desktop-Client') || 'unknown';
    const computerUseClient = request.get('X-Computer-Use-Client');
    const vncClient = request.get('X-VNC-Client') || 'unknown';
    const userAgent = request.get('User-Agent') || 'unknown';

    // Extract version from client header (e.g., "BytebotD-Desktop-1.0.0")
    const versionMatch = desktopClient.match(/-([0-9]+\.[0-9]+\.[0-9]+)/);
    const version = versionMatch ? versionMatch[1] : '0.0.0';

    const isComputerUse = !!(
      computerUseClient ||
      request.path.includes('computer-use') ||
      request.path.includes('screenshot') ||
      request.path.includes('click') ||
      request.path.includes('type')
    );

    return {
      clientId: desktopClient,
      version,
      vncClient,
      isComputerUse,
    };
  }

  /**
   * Evaluate deprecation status of endpoint with desktop-specific considerations
   * @param versionConfig - Version configuration
   * @param now - Current date
   * @param isDesktopEndpoint - Whether this is a desktop endpoint
   * @param desktopClientInfo - Desktop client information
   * @param operationId - Operation ID
   * @returns Deprecation evaluation result
   */
  private evaluateDeprecation(
    versionConfig: any,
    now: Date,
    isDesktopEndpoint: boolean,
    desktopClientInfo: any,
    operationId: string,
  ) {
    const deprecation = versionConfig.deprecation;

    if (!deprecation) {
      return {
        state: 'not_deprecated',
        inGracePeriod: false,
        inDesktopGracePeriod: false,
        isSunset: false,
        isPastSunsetGrace: false,
        daysUntilSunset: null,
      };
    }

    const deprecatedSince = deprecation.since
      ? new Date(deprecation.since)
      : null;
    const sunsetDate = deprecation.sunset ? new Date(deprecation.sunset) : null;

    // Calculate grace periods
    const standardGracePeriod = deprecatedSince
      ? now.getTime() - deprecatedSince.getTime() <=
        this.policy.gracePeriodDays * 24 * 60 * 60 * 1000
      : false;

    // Desktop clients get extended grace period
    const desktopGracePeriod =
      deprecatedSince && isDesktopEndpoint
        ? now.getTime() - deprecatedSince.getTime() <=
          this.policy.desktopGracePeriodDays * 24 * 60 * 60 * 1000
        : false;

    // Computer use operations get even longer grace period
    const computerUseGracePeriod =
      deprecatedSince && desktopClientInfo.isComputerUse
        ? now.getTime() - deprecatedSince.getTime() <=
          this.policy.desktopSpecific.computerUseGracePeriodDays *
            24 *
            60 *
            60 *
            1000
        : false;

    const inGracePeriod =
      standardGracePeriod || desktopGracePeriod || computerUseGracePeriod;
    const inDesktopGracePeriod = desktopGracePeriod || computerUseGracePeriod;

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

    let state = 'deprecated';
    if (isSunset) {
      state = isPastSunsetGrace ? 'sunset_strict' : 'sunset';
    } else if (inGracePeriod) {
      state = computerUseGracePeriod
        ? 'computer_use_grace'
        : desktopGracePeriod
          ? 'desktop_grace'
          : 'deprecated_grace';
    }

    this.logger.debug(
      `[${operationId}] BytebotD deprecation evaluation completed`,
      {
        operationId,
        state,
        inGracePeriod,
        inDesktopGracePeriod,
        isSunset,
        isPastSunsetGrace,
        daysUntilSunset,
        isComputerUse: desktopClientInfo.isComputerUse,
        desktopClientVersion: desktopClientInfo.version,
        deprecatedSince: deprecatedSince?.toISOString(),
        sunsetDate: sunsetDate?.toISOString(),
      },
    );

    return {
      state,
      inGracePeriod,
      inDesktopGracePeriod,
      isSunset,
      isPastSunsetGrace,
      daysUntilSunset,
    };
  }

  /**
   * Apply deprecation enforcement policy with desktop-specific logic
   * @param deprecationResult - Deprecation evaluation result
   * @param request - Express request
   * @param versionConfig - Version configuration
   * @param isDesktopEndpoint - Whether this is a desktop endpoint
   * @param desktopClientInfo - Desktop client information
   * @param operationId - Operation ID
   * @returns Whether request is allowed
   */
  private applyEnforcementPolicy(
    deprecationResult: any,
    request: Request,
    versionConfig: any,
    isDesktopEndpoint: boolean,
    desktopClientInfo: any,
    operationId: string,
  ): boolean {
    // Check if legacy desktop clients should be allowed extended access
    if (
      this.policy.desktopSpecific.allowLegacyClients &&
      isDesktopEndpoint &&
      this.isLegacyDesktopClient(desktopClientInfo)
    ) {
      this.logger.warn(
        `[${operationId}] Legacy desktop client allowed deprecated access`,
        {
          operationId,
          desktopClient: desktopClientInfo,
          deprecationState: deprecationResult.state,
        },
      );
      return true;
    }

    switch (this.policy.enforcement) {
      case DeprecationEnforcement.LOG_ONLY:
        // Always allow, just log
        this.logDeprecationAccess(
          request,
          versionConfig,
          deprecationResult,
          desktopClientInfo,
          operationId,
        );
        return true;

      case DeprecationEnforcement.WARN:
        // Allow but log warning
        this.logDeprecationAccess(
          request,
          versionConfig,
          deprecationResult,
          desktopClientInfo,
          operationId,
        );
        return true;

      case DeprecationEnforcement.BLOCK_WITH_WARNING:
        // Block if past grace period or sunset, considering desktop extensions
        if (
          deprecationResult.state === 'sunset_strict' ||
          (!deprecationResult.inGracePeriod &&
            !deprecationResult.inDesktopGracePeriod &&
            ![
              'deprecated_grace',
              'desktop_grace',
              'computer_use_grace',
            ].includes(deprecationResult.state))
        ) {
          this.throwDeprecationError(
            versionConfig,
            deprecationResult,
            desktopClientInfo,
            operationId,
          );
          return false;
        }
        return true;

      case DeprecationEnforcement.STRICT_BLOCK:
        // Block all deprecated endpoint access, except for computer use grace period
        if (deprecationResult.state === 'computer_use_grace') {
          this.logger.warn(
            `[${operationId}] Computer use endpoint allowed despite strict block policy`,
            {
              operationId,
              desktopClient: desktopClientInfo,
            },
          );
          return true;
        }

        this.throwDeprecationError(
          versionConfig,
          deprecationResult,
          desktopClientInfo,
          operationId,
        );
        return false;

      default:
        this.logger.warn(
          `[${operationId}] Unknown enforcement level: ${this.policy.enforcement}`,
        );
        return true;
    }
  }

  /**
   * Check if desktop client is considered legacy and should get extended access
   * @param desktopClientInfo - Desktop client information
   * @returns Boolean indicating if client is legacy
   */
  private isLegacyDesktopClient(desktopClientInfo: any): boolean {
    const minVersion =
      this.policy.desktopSpecific.minClientVersionForEnforcement;
    const clientVersion = desktopClientInfo.version;

    // Simple version comparison (assumes semantic versioning)
    if (clientVersion === '0.0.0' || clientVersion === 'unknown') {
      return true; // Unknown versions are considered legacy
    }

    const minParts = minVersion.split('.').map(Number);
    const clientParts = clientVersion.split('.').map(Number);

    for (let i = 0; i < Math.max(minParts.length, clientParts.length); i++) {
      const minPart = minParts[i] || 0;
      const clientPart = clientParts[i] || 0;

      if (clientPart < minPart) {
        return true;
      } else if (clientPart > minPart) {
        return false;
      }
    }

    return false; // Versions are equal, not legacy
  }

  /**
   * Set deprecation response headers with desktop-specific information
   * @param response - Express response
   * @param versionConfig - Version configuration
   * @param bypassUsed - Whether bypass was used
   * @param desktopClientInfo - Desktop client information
   */
  private setDeprecationHeaders(
    response: Response,
    versionConfig: any,
    bypassUsed: boolean,
    desktopClientInfo: any,
  ): void {
    const deprecation = versionConfig.deprecation;

    if (deprecation.since) {
      response.setHeader(
        'Deprecation',
        `date="${deprecation.since.toISOString()}"`,
      );
    }

    if (deprecation.sunset) {
      response.setHeader('Sunset', deprecation.sunset.toISOString());
    }

    if (deprecation.migration) {
      response.setHeader('API-Migration-Guide', deprecation.migration);
    }

    if (deprecation.desktopMigrationNotes) {
      response.setHeader(
        'X-Desktop-Migration-Notes',
        deprecation.desktopMigrationNotes,
      );
    }

    // Add desktop-specific warning header
    let warningMessage = `299 - "BytebotD desktop API endpoint is deprecated"`;
    if (deprecation.sunset) {
      warningMessage += ` and will be removed on ${deprecation.sunset.toISOString()}`;
    }

    if (desktopClientInfo.isComputerUse) {
      warningMessage += ` (Computer use operations have extended grace period)`;
    }

    response.setHeader('Warning', warningMessage);
    response.setHeader('X-Desktop-Client-Detected', desktopClientInfo.clientId);
    response.setHeader('X-Desktop-Client-Version', desktopClientInfo.version);

    if (bypassUsed) {
      response.setHeader('X-Deprecation-Bypass-Used', 'true');
    }
  }

  /**
   * Track usage statistics for deprecated desktop endpoints
   * @param request - Express request
   * @param versionConfig - Version configuration
   * @param desktopClientInfo - Desktop client information
   * @param operationId - Operation ID
   */
  private trackDeprecatedUsage(
    request: Request,
    versionConfig: any,
    desktopClientInfo: any,
    operationId: string,
  ): void {
    try {
      this.stats.deprecatedRequests++;
      this.stats.lastSeen = new Date();

      this.stats.uniqueDesktopClients.add(desktopClientInfo.clientId);
      this.stats.desktopClientVersions.add(desktopClientInfo.version);
      this.stats.vncClients.add(desktopClientInfo.vncClient);

      if (desktopClientInfo.isComputerUse) {
        this.stats.computerUseDeprecatedRequests++;
      }

      const endpoint = `${request.method} ${request.url}`;
      const currentCount = this.stats.endpointUsage.get(endpoint) || 0;
      this.stats.endpointUsage.set(endpoint, currentCount + 1);

      this.logger.debug(
        `[${operationId}] BytebotD deprecated endpoint usage tracked`,
        {
          operationId,
          endpoint,
          desktopClient: desktopClientInfo.clientId,
          version: desktopClientInfo.version,
          isComputerUse: desktopClientInfo.isComputerUse,
          totalDeprecatedRequests: this.stats.deprecatedRequests,
          uniqueDesktopClients: this.stats.uniqueDesktopClients.size,
          computerUseRequests: this.stats.computerUseDeprecatedRequests,
        },
      );
    } catch (error) {
      this.logger.error(
        `[${operationId}] Failed to track BytebotD deprecated usage`,
        {
          operationId,
          error: error.message,
        },
      );
    }
  }

  /**
   * Log deprecation access for monitoring with desktop-specific details
   * @param request - Express request
   * @param versionConfig - Version configuration
   * @param deprecationResult - Deprecation evaluation result
   * @param desktopClientInfo - Desktop client information
   * @param operationId - Operation ID
   */
  private async logDeprecationAccess(
    request: Request,
    versionConfig: any,
    deprecationResult: any,
    desktopClientInfo: any,
    operationId: string,
  ): Promise<void> {
    try {
      this.logger.warn(`BytebotD deprecated API access: ${operationId}`, {
        operationId,
        endpoint: request.url,
        method: request.method,
        apiVersion: versionConfig.version,
        deprecationState: deprecationResult.state,
        inGracePeriod: deprecationResult.inGracePeriod,
        inDesktopGracePeriod: deprecationResult.inDesktopGracePeriod,
        isSunset: deprecationResult.isSunset,
        daysUntilSunset: deprecationResult.daysUntilSunset,
        enforcement: this.policy.enforcement,
        deprecationSince: versionConfig.deprecation?.since,
        sunsetDate: versionConfig.deprecation?.sunset,
        migrationGuide: versionConfig.deprecation?.migration,
        desktopMigrationNotes: versionConfig.deprecation?.desktopMigrationNotes,
        desktopClient: desktopClientInfo,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
      });
    } catch (error) {
      this.logger.error('Failed to log BytebotD deprecation access', {
        operationId,
        error: error.message,
      });
    }
  }

  /**
   * Log deprecation bypass usage with desktop client information
   * @param request - Express request
   * @param versionConfig - Version configuration
   * @param desktopClientInfo - Desktop client information
   * @param operationId - Operation ID
   */
  private async logDeprecationBypass(
    request: Request,
    versionConfig: any,
    desktopClientInfo: any,
    operationId: string,
  ): Promise<void> {
    try {
      this.logger.warn(`BytebotD deprecation bypass used: ${operationId}`, {
        operationId,
        endpoint: request.url,
        method: request.method,
        apiVersion: versionConfig.version,
        bypassType: 'deprecation_bypass',
        bypassHeader: this.policy.bypassHeader,
        desktopClient: desktopClientInfo,
        userAgent: request.get('User-Agent'),
        ip: request.ip,
      });
    } catch (error) {
      this.logger.error('Failed to log BytebotD deprecation bypass', {
        operationId,
        error: error.message,
      });
    }
  }

  /**
   * Throw appropriate deprecation error with desktop-specific messaging
   * @param versionConfig - Version configuration
   * @param deprecationResult - Deprecation evaluation result
   * @param desktopClientInfo - Desktop client information
   * @param operationId - Operation ID
   */
  private throwDeprecationError(
    versionConfig: any,
    deprecationResult: any,
    desktopClientInfo: any,
    operationId: string,
  ): void {
    const deprecation = versionConfig.deprecation;
    let message = `BytebotD desktop API endpoint is deprecated`;
    let statusCode = HttpStatus.GONE; // 410 Gone

    if (deprecationResult.isSunset) {
      message = `BytebotD desktop API endpoint has been sunset and is no longer available`;
      statusCode = HttpStatus.GONE;
    } else if (deprecation.sunset) {
      message += ` and will be removed on ${deprecation.sunset.toISOString()}`;
    }

    if (desktopClientInfo.isComputerUse) {
      message += `. Note: Computer use operations may have extended grace periods`;
    }

    if (deprecation.migration) {
      message += `. Migration guide: ${deprecation.migration}`;
    }

    if (deprecation.desktopMigrationNotes) {
      message += `. Desktop migration notes: ${deprecation.desktopMigrationNotes}`;
    }

    throw new HttpException(
      {
        statusCode,
        message,
        error: 'Gone',
        service: 'BytebotD',
        deprecation: {
          since: deprecation.since,
          sunset: deprecation.sunset,
          migration: deprecation.migration,
          desktopMigrationNotes: deprecation.desktopMigrationNotes,
          state: deprecationResult.state,
          daysUntilSunset: deprecationResult.daysUntilSunset,
        },
        desktopClient: {
          clientId: desktopClientInfo.clientId,
          version: desktopClientInfo.version,
          isComputerUse: desktopClientInfo.isComputerUse,
        },
        operationId,
      },
      statusCode,
    );
  }

  /**
   * Get current deprecation usage statistics for BytebotD
   * @returns Deprecation usage statistics
   */
  getUsageStatistics(): Omit<
    DeprecationStats,
    'uniqueDesktopClients' | 'desktopClientVersions' | 'vncClients'
  > & {
    uniqueDesktopClients: number;
    desktopClientVersions: number;
    vncClients: number;
  } {
    return {
      deprecatedRequests: this.stats.deprecatedRequests,
      uniqueDesktopClients: this.stats.uniqueDesktopClients.size,
      endpointUsage: this.stats.endpointUsage,
      computerUseDeprecatedRequests: this.stats.computerUseDeprecatedRequests,
      firstSeen: this.stats.firstSeen,
      lastSeen: this.stats.lastSeen,
      desktopClientVersions: this.stats.desktopClientVersions.size,
      vncClients: this.stats.vncClients.size,
    };
  }

  /**
   * Clear usage statistics
   */
  clearStatistics(): void {
    this.stats.deprecatedRequests = 0;
    this.stats.uniqueDesktopClients.clear();
    this.stats.endpointUsage.clear();
    this.stats.computerUseDeprecatedRequests = 0;
    this.stats.desktopClientVersions.clear();
    this.stats.vncClients.clear();
    this.stats.firstSeen = new Date();
    this.stats.lastSeen = new Date();

    this.logger.log('BytebotD deprecation usage statistics cleared');
  }

  /**
   * Get desktop-specific deprecation policy
   * @returns Desktop deprecation policy
   */
  getDesktopPolicy(): DeprecationPolicy['desktopSpecific'] {
    return this.policy.desktopSpecific;
  }
}

export default DeprecationGuard;
