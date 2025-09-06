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
import helmet from "helmet";
import {
  SecurityHeadersConfig,
  CorsConfig,
  SecurityEventType,
  createSecurityEvent,
  SanitizationOptions,
  DEFAULT_SANITIZATION_OPTIONS,
} from "../types/security.types";

/**
 * Security levels for service-specific configurations
 */
export enum SecurityLevel {
  /** Maximum security for critical operations (BytebotD) */
  MAXIMUM = "maximum",

  /** High security for API services (Bytebot-Agent) */
  HIGH = "high",

  /** Standard security for frontend services (Bytebot-UI) */
  STANDARD = "standard",

  /** Development-friendly security (All services in dev) */
  DEVELOPMENT = "development",
}

/**
 * Service-specific security profiles
 */
export enum ServiceType {
  /** Computer control service - requires maximum security */
  BYTEBOTD = "bytebotd",

  /** Task management API service - requires high security */
  BYTEBOT_AGENT = "bytebot-agent",

  /** Frontend UI service - requires standard security */
  BYTEBOT_UI = "bytebot-ui",

  /** Shared libraries and utilities */
  SHARED = "shared",
}

/**
 * Comprehensive security middleware configuration
 */
interface StandardizedSecurityConfig {
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

/**
 * Security profiles by service type and environment
 */
const SECURITY_PROFILES: Record<
  ServiceType,
  Record<string, Partial<StandardizedSecurityConfig>>
> = {
  [ServiceType.BYTEBOTD]: {
    development: {
      securityLevel: SecurityLevel.DEVELOPMENT,
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
      securityLevel: SecurityLevel.HIGH,
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
      securityLevel: SecurityLevel.MAXIMUM,
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

  [ServiceType.BYTEBOT_AGENT]: {
    development: {
      securityLevel: SecurityLevel.DEVELOPMENT,
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
      securityLevel: SecurityLevel.HIGH,
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
      securityLevel: SecurityLevel.HIGH,
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

  [ServiceType.BYTEBOT_UI]: {
    development: {
      securityLevel: SecurityLevel.DEVELOPMENT,
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
      securityLevel: SecurityLevel.STANDARD,
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
      securityLevel: SecurityLevel.STANDARD,
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

  [ServiceType.SHARED]: {
    development: {
      securityLevel: SecurityLevel.DEVELOPMENT,
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
  [ServiceType.BYTEBOTD]: {
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

  [ServiceType.BYTEBOT_AGENT]: {
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

  [ServiceType.BYTEBOT_UI]: {
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

  [ServiceType.SHARED]: {},
};

@Injectable()
export class StandardizedSecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(StandardizedSecurityMiddleware.name);
  private readonly config: StandardizedSecurityConfig;
  private readonly helmetMiddleware: any;

  constructor(
    private configService: ConfigService,
    private serviceType: ServiceType = ServiceType.SHARED,
  ) {
    const environment = this.configService.get("NODE_ENV", "development");

    // Build standardized configuration
    this.config = this.buildStandardizedConfig(serviceType, environment);

    // Initialize helmet middleware
    this.helmetMiddleware = this.createHelmetMiddleware();

    this.logger.log(
      `Standardized security middleware initialized for ${serviceType}`,
      {
        serviceType,
        environment,
        securityLevel: this.config.securityLevel,
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
      securityLevel: profile.securityLevel || SecurityLevel.STANDARD,
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
    const mergedConfig = this.deepMerge(defaultConfig, profile);

    // Override with environment-specific config
    const envOverrides = this.configService.get(`security.${serviceType}`, {});

    return this.deepMerge(mergedConfig, envOverrides);
  }

  /**
   * Deep merge configuration objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
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
    (req as any).correlationId = operationId;

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
      this.helmetMiddleware(req, res, (err?: any) => {
        if (err) {
          const processingTime = Date.now() - startTime;

          this.logger.error(
            `[${operationId}] Helmet middleware error for ${this.config.serviceType}`,
            {
              operationId,
              serviceType: this.config.serviceType,
              error: err.message,
              stack: err.stack,
              processingTimeMs: processingTime,
            },
          );

          // Log security event for middleware failure
          this.logSecurityEvent(
            req,
            "MIDDLEWARE_ERROR",
            err.message,
            operationId,
          );

          return next(err);
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
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(
        `[${operationId}] Security middleware error for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          error: error.message,
          stack: error.stack,
          processingTimeMs: processingTime,
        },
      );

      // Log security event
      this.logSecurityEvent(
        req,
        "MIDDLEWARE_FAILURE",
        error.message,
        operationId,
      );

      next(error);
    }
  }

  /**
   * Create helmet middleware with service-specific configuration
   */
  private createHelmetMiddleware(): any {
    const helmetOptions: any = {
      // Content Security Policy
      contentSecurityPolicy: this.config.csp
        ? {
            directives: this.config.cspDirectives,
            reportOnly: this.config.environment === "development",
          }
        : false,

      // HTTP Strict Transport Security
      hsts: this.config.hsts
        ? {
            maxAge: this.config.hstsConfig.maxAge,
            includeSubDomains: this.config.hstsConfig.includeSubDomains,
            preload: this.config.hstsConfig.preload,
          }
        : false,

      // X-Frame-Options
      frameguard: this.config.frameOptions
        ? {
            action: this.config.frameOptions.toLowerCase(),
          }
        : false,

      // Security headers
      noSniff: this.config.securityHeaders.noSniff,
      xssFilter: this.config.securityHeaders.xssFilter,
      hidePoweredBy: this.config.securityHeaders.hidePoweredBy,
      ieNoOpen: this.config.securityHeaders.ieNoOpen,
      originAgentCluster: this.config.securityHeaders.originAgentCluster,

      // DNS Prefetch Control
      dnsPrefetchControl: {
        allow: !this.config.securityHeaders.dnsPrefetchControl,
      },

      // Referrer Policy
      referrerPolicy: this.config.referrerPolicy
        ? {
            policy: this.config.referrerPolicy,
          }
        : false,

      // Expect-CT for production
      expectCt:
        this.config.environment === "production"
          ? {
              maxAge: 86400,
              enforce: true,
            }
          : false,

      // Permissions Policy
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: [],
        usb: [],
        magnetometer: [],
        gyroscope: [],
        accelerometer: [],
      },
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
        "CORS_VIOLATION",
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
        "REQUEST_LIMIT_VIOLATION",
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
        "REQUEST_LIMIT_VIOLATION",
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
    eventType: string,
    message: string,
    operationId: string,
  ): void {
    if (!this.config.auditLogging.enabled) {
      return;
    }

    try {
      const securityEventType = this.mapEventType(eventType);

      const securityEvent = createSecurityEvent(
        securityEventType,
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
    } catch (error) {
      this.logger.error(
        `Failed to log security event for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          error: error.message,
          originalEventType: eventType,
        },
      );
    }
  }

  /**
   * Map internal event types to security event types
   */
  private mapEventType(eventType: string): SecurityEventType {
    switch (eventType) {
      case "CORS_VIOLATION":
        return SecurityEventType.ACCESS_DENIED;
      case "MIDDLEWARE_ERROR":
      case "MIDDLEWARE_FAILURE":
        return SecurityEventType.SECURITY_CONFIG_CHANGED;
      case "REQUEST_LIMIT_VIOLATION":
        return SecurityEventType.SUSPICIOUS_ACTIVITY;
      default:
        return SecurityEventType.SUSPICIOUS_ACTIVITY;
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
    configService: ConfigService,
  ): StandardizedSecurityMiddleware {
    return new StandardizedSecurityMiddleware(
      configService,
      ServiceType.BYTEBOTD,
    );
  }

  static createBytebotAgentMiddleware(
    configService: ConfigService,
  ): StandardizedSecurityMiddleware {
    return new StandardizedSecurityMiddleware(
      configService,
      ServiceType.BYTEBOT_AGENT,
    );
  }

  static createBytebotUIMiddleware(
    configService: ConfigService,
  ): StandardizedSecurityMiddleware {
    return new StandardizedSecurityMiddleware(
      configService,
      ServiceType.BYTEBOT_UI,
    );
  }
}

export default StandardizedSecurityMiddleware;
