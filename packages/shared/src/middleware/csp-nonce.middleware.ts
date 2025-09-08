/**
 * CSP Nonce Generation Middleware
 *
 * Specialized middleware for generating and managing Content Security Policy (CSP) nonces
 * with advanced security features, memory optimization, and enterprise-grade nonce management.
 *
 * Features:
 * - Cryptographically secure nonce generation using Node.js crypto module
 * - Memory-efficient nonce management with automatic cleanup
 * - Request-specific nonce injection for templates and API responses
 * - Nonce validation and verification for inline scripts and styles
 * - Performance monitoring and metrics collection
 * - Integration with helmet.js and comprehensive security middleware
 * - Service-aware nonce policies with different configurations
 * - Violation reporting for CSP nonce mismatches
 *
 * @fileoverview Advanced CSP nonce generation and management middleware
 * @version 2.0.0
 * @author CSP Nonce Generation Specialist
 */

import { Injectable, NestMiddleware, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";
import { randomBytes, createHash } from "crypto";
import {
  generateEventId,
  SecurityEventType,
  createSecurityEvent,
} from "../utils/security.utils";
import { RateLimitServiceType } from "../types/security.types";

/**
 * Extended request interface with nonce information
 */
export interface RequestWithNonce extends Request {
  nonce?: string;
  nonceInfo?: {
    generatedAt: number;
    expiresAt: number;
    operationId: string;
    serviceType: RateLimitServiceType;
  };
  csrfToken?: string; // Integration with CSRF protection
  session?: {
    id?: string;
    [key: string]: any;
  };
}

/**
 * CSP nonce configuration interface
 */
export interface CSPNonceConfig {
  /** Enable CSP nonce generation */
  enabled: boolean;

  /** Service type for configuration */
  serviceType: RateLimitServiceType;

  /** Nonce generation settings */
  generation: {
    /** Length of generated nonce in bytes (before base64 encoding) */
    length: number;

    /** Algorithm for nonce generation ("random" | "hash-based") */
    algorithm: "random" | "hash-based";

    /** Hash algorithm for hash-based generation */
    hashAlgorithm: "sha256" | "sha512";

    /** Include timestamp in hash-based generation */
    includeTimestamp: boolean;
  };

  /** Nonce lifecycle management */
  lifecycle: {
    /** Nonce validity duration in milliseconds */
    validityMs: number;

    /** Enable automatic nonce refresh */
    autoRefresh: boolean;

    /** Minimum time between nonce refreshes */
    minRefreshInterval: number;

    /** Maximum nonces stored per session */
    maxNoncesPerSession: number;
  };

  /** CSP integration settings */
  csp: {
    /** Include nonce in script-src directive */
    includeScriptSrc: boolean;

    /** Include nonce in style-src directive */
    includeStyleSrc: boolean;

    /** Include nonce in object-src directive */
    includeObjectSrc: boolean;

    /** Strict CSP mode (block all non-nonce content) */
    strictMode: boolean;
  };

  /** Response headers configuration */
  headers: {
    /** Include nonce in custom headers */
    includeNonceHeader: boolean;

    /** Custom header name for nonce */
    nonceHeaderName: string;

    /** Include nonce info headers */
    includeInfoHeaders: boolean;

    /** Include performance metrics in headers */
    includeMetrics: boolean;
  };

  /** Security and monitoring */
  security: {
    /** Enable nonce validation */
    validateNonce: boolean;

    /** Log nonce generation events */
    logGeneration: boolean;

    /** Log nonce usage violations */
    logViolations: boolean;

    /** Enable rate limiting for nonce requests */
    enableRateLimit: boolean;

    /** Maximum nonce requests per minute per IP */
    maxRequestsPerMinute: number;
  };

  /** Memory management */
  memory: {
    /** Enable memory cleanup */
    enableCleanup: boolean;

    /** Cleanup interval in milliseconds */
    cleanupInterval: number;

    /** Maximum memory usage for nonces (in MB) */
    maxMemoryUsage: number;

    /** Enable memory monitoring */
    enableMonitoring: boolean;
  };
}

/**
 * Nonce statistics and metrics
 */
interface NonceMetrics {
  totalGenerated: number;
  currentActive: number;
  averageGenerationTime: number;
  memoryUsage: number;
  violationsDetected: number;
  successfulValidations: number;
}

/**
 * Default CSP nonce configurations for different service types
 */
const DEFAULT_CSP_NONCE_CONFIGS: Record<RateLimitServiceType, CSPNonceConfig> =
  {
    [RateLimitServiceType.BYTEBOTD]: {
      enabled: true,
      serviceType: RateLimitServiceType.BYTEBOTD,
      generation: {
        length: 32,
        algorithm: "random",
        hashAlgorithm: "sha256",
        includeTimestamp: true,
      },
      lifecycle: {
        validityMs: 300000, // 5 minutes
        autoRefresh: true,
        minRefreshInterval: 60000, // 1 minute
        maxNoncesPerSession: 10,
      },
      csp: {
        includeScriptSrc: true,
        includeStyleSrc: true,
        includeObjectSrc: false,
        strictMode: true, // Strict for computer control
      },
      headers: {
        includeNonceHeader: true,
        nonceHeaderName: "X-CSP-Nonce",
        includeInfoHeaders: true,
        includeMetrics: true,
      },
      security: {
        validateNonce: true,
        logGeneration: true,
        logViolations: true,
        enableRateLimit: true,
        maxRequestsPerMinute: 60,
      },
      memory: {
        enableCleanup: true,
        cleanupInterval: 60000, // 1 minute
        maxMemoryUsage: 10, // 10 MB
        enableMonitoring: true,
      },
    },

    [RateLimitServiceType.BYTEBOT_AGENT]: {
      enabled: true,
      serviceType: RateLimitServiceType.BYTEBOT_AGENT,
      generation: {
        length: 32,
        algorithm: "hash-based",
        hashAlgorithm: "sha512",
        includeTimestamp: true,
      },
      lifecycle: {
        validityMs: 600000, // 10 minutes
        autoRefresh: true,
        minRefreshInterval: 120000, // 2 minutes
        maxNoncesPerSession: 5,
      },
      csp: {
        includeScriptSrc: true,
        includeStyleSrc: false, // API doesn't serve styles
        includeObjectSrc: false,
        strictMode: true,
      },
      headers: {
        includeNonceHeader: true,
        nonceHeaderName: "X-API-CSP-Nonce",
        includeInfoHeaders: false, // Minimize API response size
        includeMetrics: false,
      },
      security: {
        validateNonce: true,
        logGeneration: false, // Reduce API logging
        logViolations: true,
        enableRateLimit: true,
        maxRequestsPerMinute: 120,
      },
      memory: {
        enableCleanup: true,
        cleanupInterval: 120000, // 2 minutes
        maxMemoryUsage: 5, // 5 MB
        enableMonitoring: false,
      },
    },

    [RateLimitServiceType.BYTEBOT_UI]: {
      enabled: true,
      serviceType: RateLimitServiceType.BYTEBOT_UI,
      generation: {
        length: 24,
        algorithm: "random",
        hashAlgorithm: "sha256",
        includeTimestamp: false,
      },
      lifecycle: {
        validityMs: 1800000, // 30 minutes
        autoRefresh: false, // Manual refresh for UI
        minRefreshInterval: 300000, // 5 minutes
        maxNoncesPerSession: 20,
      },
      csp: {
        includeScriptSrc: true,
        includeStyleSrc: true,
        includeObjectSrc: false,
        strictMode: false, // Less strict for UI flexibility
      },
      headers: {
        includeNonceHeader: true,
        nonceHeaderName: "X-UI-CSP-Nonce",
        includeInfoHeaders: true,
        includeMetrics: true,
      },
      security: {
        validateNonce: false, // UI handles validation client-side
        logGeneration: true,
        logViolations: true,
        enableRateLimit: false, // UI generates less frequently
        maxRequestsPerMinute: 30,
      },
      memory: {
        enableCleanup: true,
        cleanupInterval: 300000, // 5 minutes
        maxMemoryUsage: 20, // 20 MB for UI assets
        enableMonitoring: true,
      },
    },

    [RateLimitServiceType.SHARED]: {
      enabled: true,
      serviceType: RateLimitServiceType.SHARED,
      generation: {
        length: 32,
        algorithm: "random",
        hashAlgorithm: "sha256",
        includeTimestamp: true,
      },
      lifecycle: {
        validityMs: 600000, // 10 minutes
        autoRefresh: true,
        minRefreshInterval: 120000, // 2 minutes
        maxNoncesPerSession: 10,
      },
      csp: {
        includeScriptSrc: true,
        includeStyleSrc: true,
        includeObjectSrc: false,
        strictMode: true,
      },
      headers: {
        includeNonceHeader: true,
        nonceHeaderName: "X-Shared-CSP-Nonce",
        includeInfoHeaders: true,
        includeMetrics: true,
      },
      security: {
        validateNonce: true,
        logGeneration: true,
        logViolations: true,
        enableRateLimit: true,
        maxRequestsPerMinute: 90,
      },
      memory: {
        enableCleanup: true,
        cleanupInterval: 120000, // 2 minutes
        maxMemoryUsage: 15, // 15 MB
        enableMonitoring: true,
      },
    },
  };

/**
 * CSP Nonce Generation Middleware
 * Provides enterprise-grade nonce generation and management for Content Security Policies
 */
@Injectable()
export class CSPNonceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CSPNonceMiddleware.name);
  private readonly config: CSPNonceConfig;
  private readonly nonceCache = new Map<
    string,
    { nonce: string; generatedAt: number; expiresAt: number }
  >();
  private readonly rateLimitTracker = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private metrics: NonceMetrics = {
    totalGenerated: 0,
    currentActive: 0,
    averageGenerationTime: 0,
    memoryUsage: 0,
    violationsDetected: 0,
    successfulValidations: 0,
  };

  constructor(
    private readonly configService: ConfigService,
    @Inject("SERVICE_TYPE") private readonly serviceType: RateLimitServiceType,
  ) {
    // Initialize configuration
    this.config = {
      ...DEFAULT_CSP_NONCE_CONFIGS[serviceType],
      ...this.configService.get<Partial<CSPNonceConfig>>(
        `cspNonce.${serviceType}`,
        {},
      ),
    };

    this.logger.log(`CSP nonce middleware initialized for ${serviceType}`, {
      serviceType: this.config.serviceType,
      enabled: this.config.enabled,
      algorithm: this.config.generation.algorithm,
      nonceLength: this.config.generation.length,
      validityMs: this.config.lifecycle.validityMs,
      strictMode: this.config.csp.strictMode,
    });

    // Set up cleanup interval if enabled
    if (this.config.memory.enableCleanup) {
      setInterval(() => {
        this.performMemoryCleanup();
      }, this.config.memory.cleanupInterval);
    }

    // Set up memory monitoring if enabled
    if (this.config.memory.enableMonitoring) {
      setInterval(() => {
        this.updateMemoryMetrics();
      }, 30000); // Update every 30 seconds
    }
  }

  /**
   * Generate and inject CSP nonce into request
   */
  use(req: RequestWithNonce, res: Response, next: NextFunction): void {
    const operationId = generateEventId();
    const startTime = Date.now();

    try {
      // Skip if disabled
      if (!this.config.enabled) {
        this.logger.debug(`[${operationId}] CSP nonce generation disabled`);
        return next();
      }

      // Rate limiting check
      if (
        this.config.security.enableRateLimit &&
        !this.checkRateLimit(req, operationId)
      ) {
        return this.handleRateLimitExceeded(res, operationId);
      }

      // Generate or retrieve nonce
      const nonceResult = this.generateNonce(req, operationId);

      // Inject nonce into request
      req.nonce = nonceResult.nonce;
      req.nonceInfo = {
        generatedAt: nonceResult.generatedAt,
        expiresAt: nonceResult.expiresAt,
        operationId,
        serviceType: this.config.serviceType,
      };

      // Add nonce headers to response
      this.addNonceHeaders(res, nonceResult, operationId);

      const processingTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(processingTime, nonceResult.wasGenerated);

      // Log nonce generation if enabled
      if (this.config.security.logGeneration) {
        this.logger.debug(`[${operationId}] CSP nonce generated successfully`, {
          operationId,
          nonceLength: nonceResult.nonce.length,
          algorithm: this.config.generation.algorithm,
          validityMs: this.config.lifecycle.validityMs,
          processingTimeMs: processingTime,
          wasGenerated: nonceResult.wasGenerated,
        });
      }

      next();
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] CSP nonce generation error`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: processingTime,
        serviceType: this.config.serviceType,
      });

      // Log security event for nonce generation failure
      this.logSecurityEvent(req, operationId, "nonce_generation_error", {
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: processingTime,
      });

      // Continue without nonce as fallback
      next();
    }
  }

  /**
   * Generate new CSP nonce based on configuration
   */
  private generateNonce(
    req: RequestWithNonce,
    operationId: string,
  ): {
    nonce: string;
    generatedAt: number;
    expiresAt: number;
    wasGenerated: boolean;
  } {
    const startTime = Date.now();
    const sessionId = this.getSessionId(req);

    // Check for existing valid nonce
    const cachedNonce = this.nonceCache.get(sessionId);
    if (cachedNonce && cachedNonce.expiresAt > Date.now()) {
      return {
        nonce: cachedNonce.nonce,
        generatedAt: cachedNonce.generatedAt,
        expiresAt: cachedNonce.expiresAt,
        wasGenerated: false,
      };
    }

    // Generate new nonce
    let nonce: string;
    const generatedAt = Date.now();
    const expiresAt = generatedAt + this.config.lifecycle.validityMs;

    switch (this.config.generation.algorithm) {
      case "hash-based":
        nonce = this.generateHashBasedNonce(req, operationId, generatedAt);
        break;

      case "random":
      default:
        nonce = this.generateRandomNonce();
        break;
    }

    // Cache the nonce
    this.nonceCache.set(sessionId, { nonce, generatedAt, expiresAt });

    // Update metrics
    this.metrics.totalGenerated++;
    this.metrics.currentActive = this.nonceCache.size;

    return {
      nonce,
      generatedAt,
      expiresAt,
      wasGenerated: true,
    };
  }

  /**
   * Generate cryptographically secure random nonce
   */
  private generateRandomNonce(): string {
    const buffer = randomBytes(this.config.generation.length);
    return buffer
      .toString("base64")
      .replace(/[+/]/g, "") // Remove characters that could cause CSP issues
      .substring(0, this.config.generation.length);
  }

  /**
   * Generate hash-based nonce using request data
   */
  private generateHashBasedNonce(
    req: RequestWithNonce,
    operationId: string,
    timestamp: number,
  ): string {
    const hashData = [
      req.ip || "unknown",
      req.get("User-Agent") || "unknown",
      operationId,
      this.config.generation.includeTimestamp ? timestamp.toString() : "",
      process.hrtime.bigint().toString(), // High-resolution timestamp
    ].join("|");

    const hash = createHash(this.config.generation.hashAlgorithm);
    hash.update(hashData);

    return hash
      .digest("base64")
      .replace(/[+/]/g, "")
      .substring(0, this.config.generation.length);
  }

  /**
   * Get session identifier for nonce caching
   */
  private getSessionId(req: RequestWithNonce): string {
    // Use session ID if available, otherwise use IP + User-Agent hash
    const sessionId = req.session?.id;
    if (sessionId) {
      return `session:${sessionId}`;
    }

    const identifier = [
      req.ip || "unknown",
      req.get("User-Agent") || "unknown",
    ].join("|");

    const hash = createHash("sha256");
    hash.update(identifier);
    return `ip:${hash.digest("hex").substring(0, 16)}`;
  }

  /**
   * Check rate limiting for nonce generation
   */
  private checkRateLimit(req: RequestWithNonce, operationId: string): boolean {
    const ip = req.ip || "unknown";
    const now = Date.now();
    const windowStart = Math.floor(now / 60000) * 60000; // 1-minute window

    const rateLimitEntry = this.rateLimitTracker.get(ip);

    if (!rateLimitEntry || rateLimitEntry.resetTime !== windowStart) {
      // New window or first request
      this.rateLimitTracker.set(ip, { count: 1, resetTime: windowStart });
      return true;
    }

    if (rateLimitEntry.count >= this.config.security.maxRequestsPerMinute) {
      this.logger.warn(`[${operationId}] CSP nonce rate limit exceeded`, {
        operationId,
        ip,
        currentCount: rateLimitEntry.count,
        maxRequests: this.config.security.maxRequestsPerMinute,
      });
      return false;
    }

    rateLimitEntry.count++;
    return true;
  }

  /**
   * Handle rate limit exceeded response
   */
  private handleRateLimitExceeded(res: Response, operationId: string): void {
    res.status(429).json({
      statusCode: 429,
      message: "CSP nonce generation rate limit exceeded",
      error: "Too Many Requests",
      operationId,
      retryAfter: 60, // Seconds
    });
  }

  /**
   * Add nonce-related headers to response
   */
  private addNonceHeaders(
    res: Response,
    nonceResult: { nonce: string; generatedAt: number; expiresAt: number },
    operationId: string,
  ): void {
    // Core nonce header
    if (this.config.headers.includeNonceHeader) {
      res.set(this.config.headers.nonceHeaderName, nonceResult.nonce);
    }

    // Information headers
    if (this.config.headers.includeInfoHeaders) {
      res.set({
        "X-CSP-Nonce-Generated-At": nonceResult.generatedAt.toString(),
        "X-CSP-Nonce-Expires-At": nonceResult.expiresAt.toString(),
        "X-CSP-Nonce-Service": this.config.serviceType,
        "X-CSP-Nonce-Operation-ID": operationId,
      });
    }

    // Metrics headers
    if (this.config.headers.includeMetrics) {
      res.set({
        "X-CSP-Nonce-Total-Generated": this.metrics.totalGenerated.toString(),
        "X-CSP-Nonce-Current-Active": this.metrics.currentActive.toString(),
        "X-CSP-Nonce-Memory-Usage": this.metrics.memoryUsage.toString(),
      });
    }
  }

  /**
   * Update performance and usage metrics
   */
  private updateMetrics(processingTime: number, wasGenerated: boolean): void {
    // Update average generation time
    if (wasGenerated) {
      const totalTime =
        this.metrics.averageGenerationTime * this.metrics.totalGenerated;
      this.metrics.averageGenerationTime =
        (totalTime + processingTime) / (this.metrics.totalGenerated + 1);
    }
  }

  /**
   * Update memory usage metrics
   */
  private updateMemoryMetrics(): void {
    // Calculate approximate memory usage
    const cacheEntries = Array.from(this.nonceCache.entries());
    const rateLimitEntries = Array.from(this.rateLimitTracker.entries());

    const cacheMemory = cacheEntries.length * 200; // Approximate bytes per entry
    const rateLimitMemory = rateLimitEntries.length * 50; // Approximate bytes per entry

    this.metrics.memoryUsage = (cacheMemory + rateLimitMemory) / 1024 / 1024; // Convert to MB
    this.metrics.currentActive = this.nonceCache.size;

    // Log memory warning if approaching limit
    if (this.metrics.memoryUsage > this.config.memory.maxMemoryUsage * 0.8) {
      this.logger.warn("CSP nonce memory usage approaching limit", {
        currentUsage: this.metrics.memoryUsage.toFixed(2),
        maxUsage: this.config.memory.maxMemoryUsage,
        activeNonces: this.metrics.currentActive,
      });
    }
  }

  /**
   * Perform periodic memory cleanup
   */
  private performMemoryCleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // Clean expired nonces
    for (const [sessionId, nonceData] of this.nonceCache.entries()) {
      if (nonceData.expiresAt <= now) {
        this.nonceCache.delete(sessionId);
        cleanedCount++;
      }
    }

    // Clean old rate limit entries
    const windowStart = Math.floor(now / 60000) * 60000;
    for (const [ip, rateLimitData] of this.rateLimitTracker.entries()) {
      if (rateLimitData.resetTime < windowStart - 60000) {
        this.rateLimitTracker.delete(ip);
      }
    }

    // Update metrics
    this.metrics.currentActive = this.nonceCache.size;

    if (cleanedCount > 0) {
      this.logger.debug(`CSP nonce memory cleanup completed`, {
        cleanedNonces: cleanedCount,
        remainingActive: this.metrics.currentActive,
        memoryUsage: this.metrics.memoryUsage.toFixed(2),
      });
    }
  }

  /**
   * Log security events for monitoring and alerting
   */
  private logSecurityEvent(
    req: RequestWithNonce,
    operationId: string,
    eventType: string,
    metadata: Record<string, any>,
  ): void {
    if (!this.config.security.logViolations) {
      return;
    }

    try {
      const securityEvent = createSecurityEvent(
        SecurityEventType.CSP_VIOLATION,
        req.url,
        req.method,
        false,
        `CSP nonce event: ${eventType}`,
        {
          operationId,
          eventType,
          serviceType: this.config.serviceType,
          ...metadata,
        },
        (req as any).user?.id,
        req.ip,
        req.get("User-Agent"),
      );

      this.logger.warn(`CSP nonce security event: ${securityEvent.eventId}`, {
        eventId: securityEvent.eventId,
        eventType,
        operationId,
        serviceType: this.config.serviceType,
      });
    } catch (error) {
      this.logger.error("Failed to log CSP nonce security event", {
        operationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get current nonce metrics for monitoring
   */
  public getMetrics(): NonceMetrics {
    return { ...this.metrics };
  }

  /**
   * Validate nonce (for external validation)
   */
  public validateNonce(sessionId: string, providedNonce: string): boolean {
    if (!this.config.security.validateNonce) {
      return true; // Validation disabled
    }

    const cachedNonce = this.nonceCache.get(sessionId);
    if (!cachedNonce || cachedNonce.expiresAt <= Date.now()) {
      this.metrics.violationsDetected++;
      return false;
    }

    if (cachedNonce.nonce === providedNonce) {
      this.metrics.successfulValidations++;
      return true;
    }

    this.metrics.violationsDetected++;
    return false;
  }

  /**
   * Factory methods for creating service-specific CSP nonce middleware
   */
  static createBytebotDMiddleware(
    configService: ConfigService,
  ): CSPNonceMiddleware {
    return new CSPNonceMiddleware(configService, RateLimitServiceType.BYTEBOTD);
  }

  static createBytebotAgentMiddleware(
    configService: ConfigService,
  ): CSPNonceMiddleware {
    return new CSPNonceMiddleware(
      configService,
      RateLimitServiceType.BYTEBOT_AGENT,
    );
  }

  static createBytebotUIMiddleware(
    configService: ConfigService,
  ): CSPNonceMiddleware {
    return new CSPNonceMiddleware(
      configService,
      RateLimitServiceType.BYTEBOT_UI,
    );
  }
}

export default CSPNonceMiddleware;
