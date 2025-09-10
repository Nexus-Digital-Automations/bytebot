/**
 * Standardized Security Middleware Framework - Bytebot Platform
 *
 * This module provides a unified security middleware deployment framework
 * for consistent security posture across all Bytebot microservices:
 * - BytebotD (Computer Control Service) - MAXIMUM SECURITY
 * - Bytebot-Agent (Task Management Service) - HIGH SECURITY
 * - Bytebot-UI (Frontend Service) - STANDARD SECURITY
 *
 * @fileoverview Enterprise security middleware standardization framework
 * @version 2.0.0
 * @author Enterprise Security Middleware Specialist
 */

import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";
import helmet, { HelmetOptions as HelmetOptionsType } from "helmet";
import {
  SecurityHeadersConfig as _SecurityHeadersConfig,
  CorsConfig as _CorsConfig,
  SecurityEventType,
  createSecurityEvent,
  SanitizationOptions as _SanitizationOptions,
  DEFAULT_SANITIZATION_OPTIONS as _DEFAULT_SANITIZATION_OPTIONS,
} from "../types/security.types";

/**
 * Interface for Express request with correlation ID
 */
interface RequestWithCorrelation extends Request {
  correlationId?: string;
}

/**
 * Interface for middleware callback function
 */
interface _MiddlewareCallback {
  (_err?: Error): void;
}

/**
 * Security levels for service-specific configurations
 */
export enum SecurityLevel {
  /** Maximum security for critical operations (BytebotD) */
  _MAXIMUM = "maximum",

  /** High security for API services (Bytebot-Agent) */
  _HIGH = "high",

  /** Standard security for frontend services (Bytebot-UI) */
  _STANDARD = "standard",

  /** Development-friendly security (All services in dev) */
  _DEVELOPMENT = "development",
}

/**
 * Service-specific security profiles
 */
export enum ServiceType {
  /** Computer control service - requires maximum security */
  _BYTEBOTD = "bytebotd",

  /** Task management API service - requires high security */
  _BYTEBOT_AGENT = "bytebot-agent",

  /** Frontend UI service - requires standard security */
  _BYTEBOT_UI = "bytebot-ui",

  /** Shared libraries and utilities */
  _SHARED = "shared",
}

/**
 * Comprehensive security middleware configuration
 */
interface StandardizedSecurityConfig {
  /** Index signature for flexible configuration */
  [key: string]: unknown;

  /** Service type for profile selection */
  serviceType: ServiceType;

  /** Security level override */
  securityLevel?: SecurityLevel;

  /** Environment (development, staging, production) */
  environment: string;

  /** Enable Content Security Policy */
  csp: boolean;

  /** CSP directives */
  cspDirectives?: Record<string, string[]>;

  /** Enable HSTS */
  hsts: boolean;

  /** HSTS configuration */
  hstsConfig: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };

  /** Frame options configuration */
  frameOptions: "DENY" | "SAMEORIGIN" | false;

  /** Security headers toggles */
  securityHeaders: {
    noSniff: boolean;
    xssFilter: boolean;
    dnsPrefetchControl: boolean;
    hidePoweredBy: boolean;
    ieNoOpen: boolean;
    originAgentCluster: boolean;
  };

  /** Referrer policy */
  referrerPolicy: string | false;

  /** CORS configuration */
  cors: {
    origins: string[] | string;
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAge: number;
  };

  /** Request limits */
  requestLimits: {
    maxPayloadSize: string;
    maxUrlLength: number;
    maxHeaderSize: number;
  };

  /** Custom security headers */
  customHeaders?: Record<string, string>;

  /** Security event logging */
  auditLogging: {
    enabled: boolean;
    logLevel: "debug" | "info" | "warn" | "error";
    includeRequestBody: boolean;
    includeResponseHeaders: boolean;
  };

  /** Trusted proxies for IP detection */
  trustedProxies?: string[];

  /** Rate limiting configuration */
  rateLimiting?: {
    enabled: boolean;
    windowMs: number;
    max: number;
    skipSuccessfulRequests: boolean;
  };
}

// Use the official Helmet types
type HelmetOptions = HelmetOptionsType;

/**
 * Security profiles by service type and environment
 */
const SECURITY_PROFILES: Record<
  ServiceType,
  Record<string, Partial<StandardizedSecurityConfig>>
> = {
  [ServiceType._BYTEBOTD]: {
    development: {
      securityLevel: SecurityLevel._DEVELOPMENT as SecurityLevel,
      csp: false,
      hsts: false,
      frameOptions: "SAMEORIGIN", // Allow VNC embedding
      cors: {
        origins: [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:8080",
          "http://localhost:9992",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "Accept",
          "Origin",
        ],
        exposedHeaders: ["X-Request-ID", "X-Response-Time"],
        maxAge: 86400,
      },
      requestLimits: {
        maxPayloadSize: "100mb",
        maxUrlLength: 2048,
        maxHeaderSize: 8192,
      },
      auditLogging: {
        enabled: false,
        logLevel: "debug",
        includeRequestBody: false,
        includeResponseHeaders: false,
      },
    },

    staging: {
      securityLevel: SecurityLevel._HIGH as SecurityLevel,
      csp: true,
      hsts: true,
      hstsConfig: {
        maxAge: 86400, // 1 day
        includeSubDomains: true,
        preload: false,
      },
      frameOptions: "SAMEORIGIN", // VNC viewer compatibility
      auditLogging: {
        enabled: true,
        logLevel: "info",
        includeRequestBody: true,
        includeResponseHeaders: true,
      },
    },

    production: {
      securityLevel: SecurityLevel._MAXIMUM as SecurityLevel,
      csp: true,
      hsts: true,
      hstsConfig: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      frameOptions: "SAMEORIGIN", // VNC viewer compatibility
      cors: {
        origins: [
          "https://app.bytebot.ai",
          "https://bytebot.ai",
          "https://*.bytebot.ai",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-API-Key",
          "X-Service-ID",
        ],
        exposedHeaders: [
          "X-Request-ID",
          "X-Response-Time",
          "X-Rate-Limit-Remaining",
        ],
        maxAge: 86400,
      },
      requestLimits: {
        maxPayloadSize: "50mb", // Tighter limits in production
        maxUrlLength: 1024,
        maxHeaderSize: 4096,
      },
      customHeaders: {
        "X-Powered-By": "", // Remove
        Server: "", // Remove
        "X-Service": "BytebotD",
        "X-API-Version": "2.0",
        "X-Security-Level": "MAXIMUM",
      },
      auditLogging: {
        enabled: true,
        logLevel: "warn",
        includeRequestBody: true,
        includeResponseHeaders: true,
      },
      rateLimiting: {
        enabled: true,
        windowMs: 60000, // 1 minute
        max: 100,
        skipSuccessfulRequests: false,
      },
    },
  },

  [ServiceType._BYTEBOT_AGENT]: {
    development: {
      securityLevel: SecurityLevel._DEVELOPMENT as SecurityLevel,
      csp: false,
      hsts: false,
      frameOptions: "SAMEORIGIN",
      cors: {
        origins: [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:9990",
          "http://localhost:9992",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "Accept",
          "Origin",
        ],
        exposedHeaders: ["X-Request-ID", "X-Response-Time"],
        maxAge: 86400,
      },
      requestLimits: {
        maxPayloadSize: "50mb",
        maxUrlLength: 2048,
        maxHeaderSize: 8192,
      },
      auditLogging: {
        enabled: false,
        logLevel: "debug",
        includeRequestBody: false,
        includeResponseHeaders: false,
      },
    },

    staging: {
      securityLevel: SecurityLevel._HIGH as SecurityLevel,
      csp: true,
      hsts: true,
      hstsConfig: {
        maxAge: 86400,
        includeSubDomains: true,
        preload: false,
      },
      frameOptions: "DENY",
      auditLogging: {
        enabled: true,
        logLevel: "info",
        includeRequestBody: true,
        includeResponseHeaders: true,
      },
    },

    production: {
      securityLevel: SecurityLevel._HIGH as SecurityLevel,
      csp: true,
      hsts: true,
      hstsConfig: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameOptions: "DENY",
      cors: {
        origins: [
          "https://app.bytebot.ai",
          "https://bytebot.ai",
          "https://*.bytebot.ai",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-API-Key",
          "X-User-Agent",
        ],
        exposedHeaders: [
          "X-Request-ID",
          "X-Response-Time",
          "X-Rate-Limit-Remaining",
        ],
        maxAge: 86400,
      },
      requestLimits: {
        maxPayloadSize: "25mb",
        maxUrlLength: 1024,
        maxHeaderSize: 4096,
      },
      customHeaders: {
        "X-Powered-By": "", // Remove
        Server: "", // Remove
        "X-Service": "Bytebot-Agent",
        "X-API-Version": "2.0",
        "X-Security-Level": "HIGH",
      },
      auditLogging: {
        enabled: true,
        logLevel: "info",
        includeRequestBody: true,
        includeResponseHeaders: true,
      },
      rateLimiting: {
        enabled: true,
        windowMs: 60000,
        max: 200,
        skipSuccessfulRequests: true,
      },
    },
  },

  [ServiceType._BYTEBOT_UI]: {
    development: {
      securityLevel: SecurityLevel._DEVELOPMENT as SecurityLevel,
      csp: false,
      hsts: false,
      frameOptions: "SAMEORIGIN",
      cors: {
        origins: "*", // Allow all origins in development
        credentials: false,
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Accept", "X-Requested-With"],
        exposedHeaders: ["X-Request-ID"],
        maxAge: 3600,
      },
      requestLimits: {
        maxPayloadSize: "10mb",
        maxUrlLength: 2048,
        maxHeaderSize: 4096,
      },
      auditLogging: {
        enabled: false,
        logLevel: "debug",
        includeRequestBody: false,
        includeResponseHeaders: false,
      },
    },

    staging: {
      securityLevel: SecurityLevel._STANDARD as SecurityLevel,
      csp: true,
      hsts: true,
      hstsConfig: {
        maxAge: 86400,
        includeSubDomains: false,
        preload: false,
      },
      frameOptions: "DENY",
      auditLogging: {
        enabled: true,
        logLevel: "info",
        includeRequestBody: false,
        includeResponseHeaders: false,
      },
    },

    production: {
      securityLevel: SecurityLevel._STANDARD as SecurityLevel,
      csp: true,
      hsts: true,
      hstsConfig: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameOptions: "DENY",
      cors: {
        origins: ["https://bytebot.ai", "https://app.bytebot.ai"],
        credentials: false,
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Accept", "X-Requested-With"],
        exposedHeaders: ["X-Request-ID"],
        maxAge: 86400,
      },
      requestLimits: {
        maxPayloadSize: "5mb",
        maxUrlLength: 1024,
        maxHeaderSize: 2048,
      },
      customHeaders: {
        "X-Powered-By": "", // Remove
        Server: "", // Remove
        "X-Service": "Bytebot-UI",
        "X-Security-Level": "STANDARD",
      },
      auditLogging: {
        enabled: true,
        logLevel: "warn",
        includeRequestBody: false,
        includeResponseHeaders: false,
      },
      rateLimiting: {
        enabled: true,
        windowMs: 60000,
        max: 1000,
        skipSuccessfulRequests: true,
      },
    },
  },

  [ServiceType._SHARED]: {
    development: {
      securityLevel: SecurityLevel._DEVELOPMENT as SecurityLevel,
      auditLogging: {
        enabled: false,
        logLevel: "debug",
        includeRequestBody: false,
        includeResponseHeaders: false,
      },
    },
  },
};

/**
 * CSP directives by service type
 */
const CSP_DIRECTIVES_BY_SERVICE: Record<
  ServiceType,
  Record<string, string[]>
> = {
  [ServiceType._BYTEBOTD]: {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for VNC
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "http://localhost:*"],
    "media-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'", "http://localhost:*"],
    "connect-src": [
      "'self'",
      "ws:",
      "wss:",
      "http://localhost:*",
      "https://localhost:*",
    ],
    "worker-src": ["'self'", "blob:"],
  },

  [ServiceType._BYTEBOT_AGENT]: {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"], // Swagger UI
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    "img-src": ["'self'", "data:", "https:"],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "connect-src": ["'self'"],
    "worker-src": ["'self'"],
  },

  [ServiceType._BYTEBOT_UI]: {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Next.js requirements
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "https:"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "connect-src": ["'self'", "ws:", "wss:"],
    "worker-src": ["'self'", "blob:"],
  },

  [ServiceType._SHARED]: {},
};

@Injectable()
export class StandardizedSecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(StandardizedSecurityMiddleware.name);
  private readonly config: StandardizedSecurityConfig;
  private readonly helmetMiddleware: (
    _req: Request,
    _res: Response,
    _next: NextFunction,
  ) => void;

  constructor(
    private _configService: ConfigService<Record<string, unknown>>,
    private serviceType: ServiceType = ServiceType._SHARED,
  ) {
    const environment = String(
      this._configService.get("NODE_ENV", "development"),
    );

    // Build standardized configuration
    this.config = this.buildStandardizedConfig(serviceType, environment);

    // Initialize helmet middleware
    this.helmetMiddleware = this.createHelmetMiddleware();

    this.logger.log(
      `Standardized security middleware initialized for ${serviceType}`,
      {
        serviceType,
        environment: String(environment),
        securityLevel: this.config.securityLevel as string,
        csp: this.config.csp,
        hsts: this.config.hsts,
        frameOptions: this.config.frameOptions,
        auditLogging: this.config.auditLogging.enabled,
      },
    );
  }

  /**
   * Build standardized configuration for service type and environment
   */
  private buildStandardizedConfig(
    serviceType: ServiceType,
    environment: string,
  ): StandardizedSecurityConfig {
    const profile =
      SECURITY_PROFILES[serviceType]?.[environment] ||
      SECURITY_PROFILES[serviceType]?.["development"] ||
      {};

    const defaultConfig: StandardizedSecurityConfig = {
      serviceType,
      securityLevel:
        (profile.securityLevel as SecurityLevel) || SecurityLevel._STANDARD,
      environment,
      csp: true,
      cspDirectives: CSP_DIRECTIVES_BY_SERVICE[serviceType],
      hsts: environment === "production",
      hstsConfig: {
        maxAge: environment === "production" ? 31536000 : 86400,
        includeSubDomains: true,
        preload: environment === "production",
      },
      frameOptions: "DENY",
      securityHeaders: {
        noSniff: true,
        xssFilter: true,
        dnsPrefetchControl: true,
        hidePoweredBy: true,
        ieNoOpen: true,
        originAgentCluster: true,
      },
      referrerPolicy: "same-origin",
      cors: {
        origins: ["http://localhost:3000"],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
        exposedHeaders: ["X-Request-ID", "X-Response-Time"],
        maxAge: 86400,
      },
      requestLimits: {
        maxPayloadSize: "10mb",
        maxUrlLength: 1024,
        maxHeaderSize: 4096,
      },
      auditLogging: {
        enabled: environment !== "development",
        logLevel: "info",
        includeRequestBody: false,
        includeResponseHeaders: false,
      },
    };

    // Merge with profile configuration
    const mergedConfig = this.deepMerge(
      defaultConfig as Record<string, unknown>,
      profile as Partial<Record<string, unknown>>,
    ) as StandardizedSecurityConfig;

    // Override with environment-specific config
    const envOverrides =
      this._configService.get<Record<string, unknown>>(
        `security.${serviceType}`,
        {},
      ) || {};

    return this.deepMerge(
      mergedConfig as Record<string, unknown>,
      envOverrides as Partial<Record<string, unknown>>,
    ) as StandardizedSecurityConfig;
  }

  /**
   * Deep merge configuration objects
   */
  private deepMerge<T extends Record<string, unknown>>(
    target: T,
    source: Partial<T>,
  ): T {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(
          (result[key] as Record<string, unknown>) || {},
          source[key] as Partial<Record<string, unknown>>,
        ) as unknown as T[Extract<keyof T, string>];
      } else {
        result[key] = source[key] as T[Extract<keyof T, string>];
      }
    }

    return result;
  }

  /**
   * Apply standardized security headers to request
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const operationId = `security-${this.config.serviceType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Set correlation ID for request tracking
    (req as RequestWithCorrelation).correlationId = operationId;

    if (
      this.config.auditLogging.enabled &&
      this.config.auditLogging.logLevel === "debug"
    ) {
      this.logger.debug(
        `[${operationId}] Applying ${this.config.serviceType} security headers`,
        {
          operationId,
          serviceType: this.config.serviceType,
          securityLevel: this.config.securityLevel,
          method: req.method,
          url: req.url,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          origin: req.get("Origin"),
        },
      );
    }

    try {
      // Apply helmet security headers
      this.helmetMiddleware(req, res, (err?: Error | string) => {
        const error = typeof err === "string" ? new Error(err) : err;
        if (error) {
          const processingTime = Date.now() - startTime;

          this.logger.error(
            `[${operationId}] Helmet middleware error for ${this.config.serviceType}`,
            {
              operationId,
              serviceType: this.config.serviceType,
              error: error.message,
              stack: error.stack,
              processingTimeMs: processingTime,
            },
          );

          // Log security event for middleware failure
          this.logSecurityEvent(
            req,
            SecurityEventType._SECURITY_CONFIG_CHANGED,
            error.message,
            operationId,
          );

          return next(error);
        }

        // Apply custom security headers
        this.applyCustomHeaders(res, operationId);

        // Apply CORS headers
        this.applyCorsHeaders(req, res, operationId);

        // Apply request limits
        this.enforceRequestLimits(req, operationId);

        // Log successful application
        const processingTime = Date.now() - startTime;

        if (
          this.config.auditLogging.enabled &&
          this.config.auditLogging.logLevel === "debug"
        ) {
          this.logger.debug(
            `[${operationId}] ${this.config.serviceType} security headers applied successfully`,
            {
              operationId,
              serviceType: this.config.serviceType,
              securityLevel: this.config.securityLevel,
              processingTimeMs: processingTime,
              headersCount: Object.keys(res.getHeaders()).length,
            },
          );
        }

        next();
      });
    } catch (err) {
      const processingTime = Date.now() - startTime;

      this.logger.error(
        `[${operationId}] Security middleware error for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          processingTimeMs: processingTime,
        },
      );

      // Log security event
      this.logSecurityEvent(
        req,
        SecurityEventType._SUSPICIOUS_ACTIVITY,
        err instanceof Error ? err.message : String(err),
        operationId,
      );

      next(err);
    }
  }

  /**
   * Create helmet middleware with service-specific configuration
   */
  private createHelmetMiddleware(): (
    _req: Request,
    _res: Response,
    _next: NextFunction,
  ) => void {
    const helmetOptions: HelmetOptions = {
      // Content Security Policy
      contentSecurityPolicy: this.config.csp
        ? {
            directives: this.config.cspDirectives,
            reportOnly: this.config.environment === "development",
          }
        : false,

      // HTTP Strict Transport Security
      strictTransportSecurity: this.config.hsts
        ? {
            maxAge: this.config.hstsConfig.maxAge,
            includeSubDomains: this.config.hstsConfig.includeSubDomains,
            preload: this.config.hstsConfig.preload,
          }
        : false,

      // X-Frame-Options
      xFrameOptions: this.config.frameOptions
        ? {
            action: this.config.frameOptions.toLowerCase() as
              | "deny"
              | "sameorigin",
          }
        : false,

      // Security headers
      xContentTypeOptions: this.config.securityHeaders.noSniff,
      xXssProtection: this.config.securityHeaders.xssFilter,
      xPoweredBy: !this.config.securityHeaders.hidePoweredBy,
      xDownloadOptions: this.config.securityHeaders.ieNoOpen,
      originAgentCluster: this.config.securityHeaders.originAgentCluster,

      // DNS Prefetch Control
      xDnsPrefetchControl: {
        allow: !this.config.securityHeaders.dnsPrefetchControl,
      },

      // Referrer Policy
      referrerPolicy: this.config.referrerPolicy
        ? {
            policy: this.config.referrerPolicy as
              | "no-referrer"
              | "no-referrer-when-downgrade"
              | "origin"
              | "origin-when-cross-origin"
              | "same-origin"
              | "strict-origin"
              | "strict-origin-when-cross-origin"
              | "unsafe-url",
          }
        : false,
    };

    return helmet(helmetOptions);
  }

  /**
   * Apply custom security headers
   */
  private applyCustomHeaders(res: Response, operationId: string): void {
    if (!this.config.customHeaders) {
      return;
    }

    let headersApplied = 0;

    for (const [header, value] of Object.entries(this.config.customHeaders)) {
      if (value === "") {
        // Remove header
        res.removeHeader(header);
      } else {
        // Set header
        res.setHeader(header, value);
      }
      headersApplied++;
    }

    if (
      this.config.auditLogging.enabled &&
      this.config.auditLogging.logLevel === "debug"
    ) {
      this.logger.debug(
        `[${operationId}] Applied custom security headers for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          headersApplied,
          headers: Object.keys(this.config.customHeaders),
        },
      );
    }
  }

  /**
   * Apply CORS headers with service-specific configuration
   */
  private applyCorsHeaders(
    req: Request,
    res: Response,
    operationId: string,
  ): void {
    const origin = req.get("Origin");

    if (!origin) {
      return; // No CORS needed for same-origin requests
    }

    // Check if origin is allowed
    const isAllowedOrigin = this.isOriginAllowed(origin);

    if (isAllowedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", origin);

      if (this.config.cors.credentials) {
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }

      // Set other CORS headers for preflight
      if (req.method === "OPTIONS") {
        res.setHeader(
          "Access-Control-Allow-Methods",
          this.config.cors.methods.join(", "),
        );
        res.setHeader(
          "Access-Control-Allow-Headers",
          this.config.cors.allowedHeaders.join(", "),
        );
        res.setHeader(
          "Access-Control-Expose-Headers",
          this.config.cors.exposedHeaders.join(", "),
        );
        res.setHeader(
          "Access-Control-Max-Age",
          this.config.cors.maxAge.toString(),
        );
      }

      if (
        this.config.auditLogging.enabled &&
        this.config.auditLogging.logLevel === "debug"
      ) {
        this.logger.debug(
          `[${operationId}] CORS headers applied for ${this.config.serviceType}`,
          {
            operationId,
            serviceType: this.config.serviceType,
            origin,
            credentials: this.config.cors.credentials,
            method: req.method,
            isPreflight: req.method === "OPTIONS",
          },
        );
      }
    } else {
      // Log potential security issue
      this.logger.warn(
        `[${operationId}] CORS blocked for unauthorized origin on ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          origin,
          method: req.method,
          url: req.url,
          ip: req.ip,
        },
      );

      this.logSecurityEvent(
        req,
        SecurityEventType._ACCESS_DENIED,
        `Unauthorized origin: ${origin}`,
        operationId,
      );
    }
  }

  /**
   * Check if origin is allowed by CORS policy
   */
  private isOriginAllowed(origin: string): boolean {
    const corsOrigins = this.config.cors.origins;

    if (typeof corsOrigins === "string") {
      return corsOrigins === "*" || corsOrigins === origin;
    }

    if (Array.isArray(corsOrigins)) {
      return (
        corsOrigins.includes(origin) ||
        corsOrigins.includes("*") ||
        corsOrigins.some((allowed) => {
          // Support wildcard subdomains
          if (allowed.startsWith("*.")) {
            const domain = allowed.substring(2);
            return origin.endsWith(domain);
          }
          // Support localhost with any port
          if (allowed.includes("localhost:*")) {
            const baseOrigin = allowed.replace(":*", "");
            return origin.startsWith(baseOrigin);
          }
          return allowed === origin;
        })
      );
    }

    return false;
  }

  /**
   * Enforce request limits (headers, URL length, etc.)
   */
  private enforceRequestLimits(req: Request, operationId: string): void {
    // Check URL length
    if (req.url && req.url.length > this.config.requestLimits.maxUrlLength) {
      this.logger.warn(
        `[${operationId}] URL length limit exceeded for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          urlLength: req.url.length,
          maxUrlLength: this.config.requestLimits.maxUrlLength,
        },
      );

      this.logSecurityEvent(
        req,
        SecurityEventType._SUSPICIOUS_ACTIVITY,
        `URL length exceeded: ${req.url.length}`,
        operationId,
      );
    }

    // Check header size (approximate)
    const headerSize = JSON.stringify(req.headers).length;
    if (headerSize > this.config.requestLimits.maxHeaderSize) {
      this.logger.warn(
        `[${operationId}] Header size limit exceeded for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          headerSize,
          maxHeaderSize: this.config.requestLimits.maxHeaderSize,
        },
      );

      this.logSecurityEvent(
        req,
        SecurityEventType._SUSPICIOUS_ACTIVITY,
        `Header size exceeded: ${headerSize}`,
        operationId,
      );
    }
  }

  /**
   * Log security events for audit purposes
   */
  private logSecurityEvent(
    req: Request,
    eventType: SecurityEventType,
    message: string,
    operationId: string,
  ): void {
    if (!this.config.auditLogging.enabled) {
      return;
    }

    try {
      const securityEvent = createSecurityEvent(
        eventType,
        req.url,
        req.method,
        false,
        message,
        {
          operationId,
          middleware: "standardized-security",
          serviceType: this.config.serviceType,
          securityLevel: this.config.securityLevel,
          eventType,
          userAgent: req.get("User-Agent"),
          origin: req.get("Origin"),
          referer: req.get("Referer"),
        },
        undefined, // No user ID at middleware level
        req.ip,
        req.get("User-Agent"),
      );

      const logMessage = `Security event for ${this.config.serviceType}: ${securityEvent.eventId}`;
      const logData = {
        eventId: securityEvent.eventId,
        eventType: securityEvent.type,
        riskScore: securityEvent.riskScore,
        serviceType: this.config.serviceType,
        operationId,
      };

      // Log at appropriate level
      switch (this.config.auditLogging.logLevel) {
        case "error":
          this.logger.error(logMessage, logData);
          break;
        case "warn":
          this.logger.warn(logMessage, logData);
          break;
        case "info":
          this.logger.log(logMessage, logData);
          break;
        case "debug":
        default:
          this.logger.debug(logMessage, logData);
          break;
      }
    } catch (err) {
      this.logger.error(
        `Failed to log security event for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          error: err instanceof Error ? err.message : String(err),
          originalEventType: eventType as string,
        },
      );
    }
  }

  /**
   * Get current security configuration (for debugging/testing)
   */
  getSecurityConfig(): StandardizedSecurityConfig {
    return { ...this.config };
  }

  /**
   * Factory methods for creating service-specific middleware instances
   */
  static createBytebotDMiddleware(
    configService: ConfigService<Record<string, unknown>>,
  ): StandardizedSecurityMiddleware {
    return new StandardizedSecurityMiddleware(
      configService,
      ServiceType._BYTEBOTD as ServiceType,
    );
  }

  static createBytebotAgentMiddleware(
    configService: ConfigService<Record<string, unknown>>,
  ): StandardizedSecurityMiddleware {
    return new StandardizedSecurityMiddleware(
      configService,
      ServiceType._BYTEBOT_AGENT as ServiceType,
    );
  }

  static createBytebotUIMiddleware(
    configService: ConfigService<Record<string, unknown>>,
  ): StandardizedSecurityMiddleware {
    return new StandardizedSecurityMiddleware(
      configService,
      ServiceType._BYTEBOT_UI as ServiceType,
    );
  }
}

export default StandardizedSecurityMiddleware;
