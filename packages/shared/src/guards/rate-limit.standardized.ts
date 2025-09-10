/**
 * Standardized Rate Limiting Guard - Bytebot Platform Security Framework
 *
 * This module provides standardized rate limiting guards with security-specific configurations
 * for consistent rate limiting and protection across all Bytebot microservices:
 * - BytebotD (Computer Control Service) - MAXIMUM SECURITY
 * - Bytebot-Agent (Task Management Service) - HIGH SECURITY
 * - Bytebot-UI (Frontend Service) - STANDARD SECURITY
 *
 * @fileoverview Enterprise security rate limiting guard standardization framework
 * @version 2.0.0
 * @author Enterprise Security Rate Limiting Specialist
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import {
  RateLimitConfig,
  SecurityEventType,
  createSecurityEvent,
  RateLimitServiceType,
} from "../types/security.types";

/**
 * Rate limiting security levels for service-specific configurations
 */
/* eslint-disable no-unused-vars */
export enum RateLimitSecurityLevel {
  /** Maximum security - strictest rate limits */
  MAXIMUM = "maximum",

  /** High security - balanced rate limiting */
  HIGH = "high",

  /** Standard security - moderate rate limiting */
  STANDARD = "standard",

  /** Development security - relaxed rate limiting for development */
  DEVELOPMENT = "development",
}
/* eslint-enable no-unused-vars */

/**
 * Rate limiting configuration for standardized guard
 */
export interface StandardizedRateLimitConfig extends RateLimitConfig {
  /** Service type for profile selection */
  serviceType: RateLimitServiceType;

  /** Security level override */
  securityLevel: RateLimitSecurityLevel;

  /** Environment (development, staging, production) */
  environment: string;

  /** Enable blocking mode (reject requests) vs logging mode */
  blockingMode: boolean;

  /** Enable security event logging */
  enableSecurityLogging: boolean;

  /** Custom error message for rate limit exceeded */
  customErrorMessage?: string;

  /** Headers to include in rate limit response */
  includeHeaders: boolean;

  /** Skip rate limiting for certain conditions */
  skipConditions?: {
    ips?: string[];
    userAgents?: string[];
    endpoints?: string[];
  };
}

@Injectable()
export class StandardizedRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(StandardizedRateLimitGuard.name);
  private readonly config: StandardizedRateLimitConfig;
  private readonly requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  constructor(config: StandardizedRateLimitConfig) {
    this.config = config;

    this.logger.log(
      `Standardized rate limit guard initialized for ${config.serviceType}`,
      {
        serviceType: config.serviceType,
        environment: config.environment,
        securityLevel: config.securityLevel,
        maxRequests: config.max,
        windowMs: config.windowMs,
        blockingMode: config.blockingMode,
        enableSecurityLogging: config.enableSecurityLogging,
      },
    );
  }

  /**
   * Check if request should be rate limited
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const operationId = `rate-limit-${this.config.serviceType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const clientIdentifier = this.getClientIdentifier(request);

    try {
      // Check if request should be skipped
      if (this.shouldSkipRateLimit(request)) {
        return true;
      }

      // Get current request count for client
      const currentCount = this.getCurrentRequestCount(clientIdentifier);

      // Check if rate limit exceeded
      if (currentCount.count >= this.config.max) {
        return this.handleRateLimitExceeded(
          request,
          response,
          clientIdentifier,
          currentCount,
          operationId,
        );
      }

      // Increment request count
      this.incrementRequestCount(clientIdentifier);

      // Set rate limit headers
      if (this.config.includeHeaders) {
        this.setRateLimitHeaders(response, currentCount.count + 1);
      }

      return true;
    } catch (err) {
      this.logger.error(
        `[${operationId}] Rate limiting error for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          clientIdentifier,
          error: err instanceof Error ? err.message : String(err),
        },
      );

      // In case of error, allow request but log it
      return true;
    }
  }

  /**
   * Get client identifier for rate limiting
   */
  private getClientIdentifier(request: Request): string {
    const clientIp =
      request.ip ||
      request.connection?.remoteAddress ||
      (request.socket as { remoteAddress?: string })?.remoteAddress ||
      "unknown";

    return `ip:${clientIp}`;
  }

  /**
   * Check if rate limiting should be skipped for this request
   */
  private shouldSkipRateLimit(request: Request): boolean {
    if (!this.config.skipConditions) {
      return false;
    }

    const { ips, userAgents, endpoints } = this.config.skipConditions;

    // Skip for whitelisted IPs
    if (ips && request.ip && ips.includes(request.ip)) {
      return true;
    }

    // Skip for whitelisted user agents
    if (userAgents && request.headers["user-agent"]) {
      const userAgent = request.headers["user-agent"];
      if (userAgents.some((ua) => userAgent.includes(ua))) {
        return true;
      }
    }

    // Skip for whitelisted endpoints
    if (endpoints && endpoints.includes(request.path)) {
      return true;
    }

    return false;
  }

  /**
   * Get current request count for client
   */
  private getCurrentRequestCount(clientIdentifier: string): {
    count: number;
    resetTime: number;
  } {
    const now = Date.now();
    const existing = this.requestCounts.get(clientIdentifier);

    if (!existing || now >= existing.resetTime) {
      // Create new tracking window
      const resetTime = now + this.config.windowMs;
      const newEntry = { count: 0, resetTime };
      this.requestCounts.set(clientIdentifier, newEntry);
      return newEntry;
    }

    return existing;
  }

  /**
   * Increment request count for client
   */
  private incrementRequestCount(clientIdentifier: string): void {
    const current = this.getCurrentRequestCount(clientIdentifier);
    current.count += 1;
    this.requestCounts.set(clientIdentifier, current);
  }

  /**
   * Handle rate limit exceeded scenario
   */
  private handleRateLimitExceeded(
    request: Request,
    response: Response,
    clientIdentifier: string,
    currentCount: { count: number; resetTime: number },
    operationId: string,
  ): boolean {
    const retryAfter = Math.ceil((currentCount.resetTime - Date.now()) / 1000);

    // Log security event
    if (this.config.enableSecurityLogging) {
      this.logRateLimitSecurityEvent(
        operationId,
        request,
        clientIdentifier,
        currentCount.count,
      );
    }

    // Set rate limit exceeded headers
    response.setHeader("X-RateLimit-Limit", this.config.max);
    response.setHeader("X-RateLimit-Remaining", 0);
    response.setHeader(
      "X-RateLimit-Reset",
      Math.ceil(currentCount.resetTime / 1000),
    );
    response.setHeader("Retry-After", retryAfter);

    if (this.config.blockingMode) {
      // Block the request
      const errorMessage =
        this.config.customErrorMessage ||
        `Rate limit exceeded for ${this.config.serviceType}. Try again in ${retryAfter} seconds.`;

      throw new HttpException(
        {
          message: errorMessage,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          timestamp: new Date().toISOString(),
          operationId,
          serviceType: this.config.serviceType,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    } else {
      // Log but allow request (non-blocking mode)
      this.logger.warn(
        `[${operationId}] Rate limit exceeded but allowing request for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          clientIdentifier,
          requestCount: currentCount.count,
          maxRequests: this.config.max,
          blockingMode: false,
        },
      );
      return true;
    }
  }

  /**
   * Set rate limit headers on response
   */
  private setRateLimitHeaders(response: Response, currentCount: number): void {
    response.setHeader("X-RateLimit-Limit", this.config.max);
    response.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, this.config.max - currentCount),
    );
    response.setHeader("X-RateLimit-Window", this.config.windowMs);
  }

  /**
   * Log security event for rate limit exceeded
   */
  private logRateLimitSecurityEvent(
    operationId: string,
    request: Request,
    clientIdentifier: string,
    requestCount: number,
  ): void {
    try {
      const securityEvent = createSecurityEvent(
        SecurityEventType._RATE_LIMIT_EXCEEDED,
        request.path,
        request.method,
        false,
        `Rate limit exceeded: ${requestCount}/${this.config.max} requests`,
        {
          operationId,
          serviceType: this.config.serviceType,
          securityLevel: this.config.securityLevel,
          clientIdentifier,
          requestCount,
          maxRequests: this.config.max,
          windowMs: this.config.windowMs,
          userAgent: request.headers["user-agent"],
          referer: request.headers.referer,
        },
      );

      this.logger.warn(
        `Rate limit security event for ${this.config.serviceType}: ${securityEvent.eventId}`,
        {
          eventId: securityEvent.eventId,
          eventType: securityEvent.type,
          riskScore: securityEvent.riskScore,
          serviceType: this.config.serviceType,
          operationId,
          clientIdentifier,
          requestCount,
        },
      );
    } catch (err) {
      this.logger.error(
        `Failed to log rate limit security event for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          clientIdentifier,
          error: err instanceof Error ? err.message : String(err),
        },
      );
    }
  }

  /**
   * Factory methods for creating service-specific rate limit guards
   */
  static createBytebotDGuard(
    environment: string = "development",
    customOptions?: Partial<StandardizedRateLimitConfig>,
  ): StandardizedRateLimitGuard {
    const config: StandardizedRateLimitConfig = {
      serviceType: RateLimitServiceType._BYTEBOTD,
      securityLevel:
        environment === "production"
          ? RateLimitSecurityLevel.MAXIMUM
          : RateLimitSecurityLevel.DEVELOPMENT,
      environment,
      windowMs: 15 * 60 * 1000,
      max: environment === "production" ? 100 : 1000,
      message: "Rate limit exceeded for BytebotD service",
      blockingMode: environment === "production",
      enableSecurityLogging: environment !== "development",
      includeHeaders: environment === "development",
      ...customOptions,
    };
    return new StandardizedRateLimitGuard(config);
  }

  static createBytebotAgentGuard(
    environment: string = "development",
    customOptions?: Partial<StandardizedRateLimitConfig>,
  ): StandardizedRateLimitGuard {
    const config: StandardizedRateLimitConfig = {
      serviceType: RateLimitServiceType._BYTEBOT_AGENT,
      securityLevel:
        environment === "production"
          ? RateLimitSecurityLevel.HIGH
          : RateLimitSecurityLevel.DEVELOPMENT,
      environment,
      windowMs: 15 * 60 * 1000,
      max: environment === "production" ? 300 : 2000,
      message: "Rate limit exceeded for Bytebot Agent service",
      blockingMode: environment === "production",
      enableSecurityLogging: environment !== "development",
      includeHeaders: environment === "development",
      ...customOptions,
    };
    return new StandardizedRateLimitGuard(config);
  }

  static createBytebotUIGuard(
    environment: string = "development",
    customOptions?: Partial<StandardizedRateLimitConfig>,
  ): StandardizedRateLimitGuard {
    const config: StandardizedRateLimitConfig = {
      serviceType: RateLimitServiceType._BYTEBOT_UI,
      securityLevel:
        environment === "production"
          ? RateLimitSecurityLevel.STANDARD
          : RateLimitSecurityLevel.DEVELOPMENT,
      environment,
      windowMs: 15 * 60 * 1000,
      max: environment === "production" ? 800 : 5000,
      message: "Rate limit exceeded for Bytebot UI service",
      blockingMode: environment === "production",
      enableSecurityLogging: environment !== "development",
      includeHeaders: environment === "development",
      ...customOptions,
    };
    return new StandardizedRateLimitGuard(config);
  }
}

/**
 * Pre-configured rate limit guards by security level
 */
export const StandardizedRateLimitGuards = {
  /**
   * Maximum security rate limiting for BytebotD
   */
  MAXIMUM_SECURITY: (environment: string = "production") =>
    StandardizedRateLimitGuard.createBytebotDGuard(environment, {
      securityLevel: RateLimitSecurityLevel.MAXIMUM,
      max: 50, // Very strict
      message: "Maximum security rate limit exceeded",
      windowMs: 15 * 60 * 1000,
      blockingMode: true,
      enableSecurityLogging: true,
    }),

  /**
   * High security rate limiting for Bytebot-Agent
   */
  HIGH_SECURITY: (environment: string = "production") =>
    StandardizedRateLimitGuard.createBytebotAgentGuard(environment, {
      securityLevel: RateLimitSecurityLevel.HIGH,
      max: 200,
      message: "High security rate limit exceeded",
      windowMs: 15 * 60 * 1000,
      blockingMode: true,
      enableSecurityLogging: true,
    }),

  /**
   * Standard security rate limiting for Bytebot-UI
   */
  STANDARD_SECURITY: (environment: string = "production") =>
    StandardizedRateLimitGuard.createBytebotUIGuard(environment, {
      securityLevel: RateLimitSecurityLevel.STANDARD,
      max: 500,
      message: "Standard security rate limit exceeded",
      windowMs: 15 * 60 * 1000,
      blockingMode: true,
      enableSecurityLogging: true,
    }),

  /**
   * Development-friendly rate limiting for all services
   */
  DEVELOPMENT: (
    serviceType: RateLimitServiceType = RateLimitServiceType._SHARED,
  ) => {
    const config: StandardizedRateLimitConfig = {
      serviceType,
      securityLevel: RateLimitSecurityLevel.DEVELOPMENT,
      environment: "development",
      windowMs: 15 * 60 * 1000,
      max: 10000, // Very high for development
      message: "Development rate limit exceeded",
      blockingMode: false,
      enableSecurityLogging: false,
      includeHeaders: true,
    };
    return new StandardizedRateLimitGuard(config);
  },
} as const;

export default StandardizedRateLimitGuard;
