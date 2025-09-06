/**
 * Centralized CORS & Security Headers Middleware - Bytebot Platform
 *
 * This module provides standardized CORS and security headers configuration
 * for all Bytebot microservices with environment-aware settings and
 * production-grade security policies.
 *
 * @fileoverview Unified CORS and security headers middleware
 * @version 1.0.0
 * @author CORS & Security Headers Specialist
 */

import helmet from "helmet";
import { CorsOptions } from "cors";

export interface SecurityConfig {
  /** Current environment (development, staging, production) */
  environment: "development" | "staging" | "production";

  /** Service identifier */
  serviceName: string;

  /** Enable Swagger/OpenAPI documentation */
  enableSwagger?: boolean;

  /** Enable VNC viewer support (for BytebotD) */
  enableVNC?: boolean;

  /** Custom allowed origins */
  customOrigins?: string[];

  /** Enable strict HSTS */
  enableHSTS?: boolean;

  /** Enable CSP reporting */
  enableCSPReporting?: boolean;
}

/**
 * Default allowed origins by environment
 */
const DEFAULT_ORIGINS = {
  development: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:9990", // BytebotD
    "http://localhost:9991", // Bytebot Agent
    "http://localhost:9992", // Bytebot UI
    "https://localhost:3000",
    "https://localhost:3001",
  ],
  staging: [
    "https://staging.bytebot.ai",
    "https://staging-app.bytebot.ai",
    "https://staging-api.bytebot.ai",
  ],
  production: [
    "https://bytebot.ai",
    "https://app.bytebot.ai",
    "https://api.bytebot.ai",
  ],
};

/**
 * Generate environment-aware helmet configuration
 * @param config Security configuration
 * @returns Helmet options
 */
export function createHelmetConfig(
  config: SecurityConfig,
): Parameters<typeof helmet>[0] {
  const { environment, enableSwagger, enableVNC, enableHSTS, serviceName } =
    config;

  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          ...(enableSwagger ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
          ...(enableVNC ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
          "https://cdn.jsdelivr.net",
          "https://unpkg.com",
        ],

        styleSrc: [
          "'self'",
          ...(enableSwagger || enableVNC ? ["'unsafe-inline'"] : []),
          "https://fonts.googleapis.com",
        ],

        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],

        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "blob:",
          ...(environment === "development" ? ["http://localhost:*"] : []),
        ],

        connectSrc: [
          "'self'",
          "ws:",
          "wss:",
          ...(environment === "development"
            ? ["http://localhost:*", "https://localhost:*"]
            : []),
          ...(environment === "production"
            ? ["wss://app.bytebot.ai", "https://api.bytebot.ai"]
            : []),
        ],

        objectSrc: ["'none'"],

        mediaSrc: ["'self'", "blob:"],

        frameSrc: enableVNC
          ? [
              "'self'",
              ...(environment === "development" ? ["http://localhost:*"] : []),
            ]
          : ["'none'"],

        frameAncestors: enableVNC
          ? [
              "'self'",
              ...(environment === "development"
                ? ["http://localhost:*", "https://localhost:*"]
                : []),
              ...(environment === "production"
                ? ["https://app.bytebot.ai", "https://bytebot.ai"]
                : []),
            ]
          : ["'none'"],

        baseUri: ["'self'"],
        formAction: ["'self'"],

        ...(environment === "production"
          ? {
              upgradeInsecureRequests: [],
            }
          : {}),
      },
      reportOnly: environment === "development",
    },

    // Cross-Origin Policies
    crossOriginEmbedderPolicy: false, // Disabled for WebSocket/API compatibility
    crossOriginOpenerPolicy: {
      policy: enableVNC ? "same-origin-allow-popups" : "same-origin",
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },

    // DNS and Frame Protection
    dnsPrefetchControl: { allow: false },
    frameguard: {
      action: enableVNC ? "sameorigin" : "deny",
    },

    // Hide server information
    hidePoweredBy: true,

    // HTTP Strict Transport Security
    hsts:
      environment === "production" && enableHSTS !== false
        ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
          }
        : false,

    // IE Protection
    ieNoOpen: true,

    // MIME type sniffing protection
    noSniff: true,

    // Origin Agent Cluster
    originAgentCluster: true,

    // Cross-domain policies
    permittedCrossDomainPolicies: false,

    // Referrer Policy
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },

    // XSS Protection
    xssFilter: true,

    // Certificate Transparency
    expectCt:
      environment === "production"
        ? {
            maxAge: 86400, // 24 hours
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
      ...(enableVNC
        ? {
            fullscreen: ["self"],
            screen: ["self"],
          }
        : {}),
    },
  };
}

/**
 * Generate environment-aware CORS configuration
 * @param config Security configuration
 * @returns CORS options
 */
export function createCorsConfig(config: SecurityConfig): CorsOptions {
  const { environment, customOrigins } = config;

  const baseOrigins =
    DEFAULT_ORIGINS[environment] || DEFAULT_ORIGINS.development;
  const allowedOrigins = customOrigins
    ? [...baseOrigins, ...customOrigins]
    : baseOrigins;

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow any localhost in development
      if (
        environment === "development" &&
        (origin.startsWith("http://localhost:") ||
          origin.startsWith("https://localhost:"))
      ) {
        return callback(null, true);
      }

      // Support wildcard subdomains for bytebot.ai in production
      if (environment === "production" && origin.endsWith(".bytebot.ai")) {
        return callback(null, true);
      }

      // Block unauthorized origins with structured logging
      const error = new Error(`Origin ${origin} not allowed by CORS policy`);

      // In development, log but don't block for easier testing
      if (environment === "development") {
        console.warn("CORS Warning - Unauthorized origin (allowed in dev):", {
          origin,
          allowedOrigins,
          environment,
          timestamp: new Date().toISOString(),
        });
        return callback(null, true);
      }

      // In production, block and log security event
      console.error("CORS Security - Blocked unauthorized origin:", {
        origin,
        allowedOrigins,
        environment,
        serviceName: config.serviceName,
        timestamp: new Date().toISOString(),
      });

      return callback(error, false);
    },

    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Cache-Control",
      "X-API-Key",
      "X-Service-ID",
      "X-Request-ID",
    ],

    exposedHeaders: [
      "X-Request-ID",
      "X-Response-Time",
      "X-Rate-Limit-Remaining",
      "X-Total-Count",
      "X-Service-ID",
      "X-API-Version",
    ],

    credentials: true,

    // Preflight cache duration
    maxAge: environment === "production" ? 86400 : 3600, // 24h prod, 1h dev

    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
}

/**
 * Create custom security headers middleware
 * @param config Security configuration
 * @returns Express middleware function
 */
export function createSecurityHeadersMiddleware(config: SecurityConfig) {
  return (req: any, res: any, next: any) => {
    // Set service identification headers
    res.setHeader("X-Service", config.serviceName);
    res.setHeader("X-API-Version", "1.0");
    res.setHeader(
      "X-Service-ID",
      config.serviceName.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    );

    // Remove sensitive headers in production
    if (config.environment === "production") {
      res.removeHeader("X-Powered-By");
      res.removeHeader("Server");
    }

    // Add custom security headers
    res.setHeader("X-Frame-Options", config.enableVNC ? "SAMEORIGIN" : "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // Rate limiting information (if available)
    if (req.rateLimit) {
      res.setHeader("X-Rate-Limit-Remaining", req.rateLimit.remaining || 0);
    }

    next();
  };
}

/**
 * Validate CORS origin against security policies
 * @param origin Origin to validate
 * @param config Security configuration
 * @returns Validation result
 */
export function validateCorsOrigin(
  origin: string,
  config: SecurityConfig,
): {
  allowed: boolean;
  reason: string;
  riskScore: number;
} {
  if (!origin) {
    return { allowed: true, reason: "No origin header", riskScore: 0 };
  }

  const { environment, customOrigins } = config;
  const baseOrigins =
    DEFAULT_ORIGINS[environment] || DEFAULT_ORIGINS.development;
  const allowedOrigins = customOrigins
    ? [...baseOrigins, ...customOrigins]
    : baseOrigins;

  // Check explicit allow list
  if (allowedOrigins.includes(origin)) {
    return { allowed: true, reason: "Explicitly allowed", riskScore: 0 };
  }

  // Development localhost check
  if (
    environment === "development" &&
    (origin.startsWith("http://localhost:") ||
      origin.startsWith("https://localhost:"))
  ) {
    return { allowed: true, reason: "Development localhost", riskScore: 5 };
  }

  // Production subdomain check
  if (environment === "production" && origin.endsWith(".bytebot.ai")) {
    return { allowed: true, reason: "Bytebot subdomain", riskScore: 10 };
  }

  // Calculate risk score based on origin characteristics
  let riskScore = 50; // Base risk for unknown origin

  // Suspicious patterns
  if (origin.includes("localhost") && environment === "production") {
    riskScore += 30; // Localhost in production is suspicious
  }

  if (!origin.startsWith("https://") && environment === "production") {
    riskScore += 20; // Non-HTTPS in production
  }

  if (origin.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)) {
    riskScore += 25; // IP address origins are suspicious
  }

  return {
    allowed: false,
    reason: "Not in allowed origins list",
    riskScore: Math.min(100, riskScore),
  };
}

/**
 * Log CORS security events for monitoring
 * @param origin Origin that was blocked/allowed
 * @param config Security configuration
 * @param allowed Whether access was allowed
 * @param reason Reason for decision
 */
export function logCorsSecurityEvent(
  origin: string,
  config: SecurityConfig,
  allowed: boolean,
  reason: string,
): void {
  const validation = validateCorsOrigin(origin, config);

  const event = {
    type: "CORS_ACCESS",
    timestamp: new Date().toISOString(),
    service: config.serviceName,
    environment: config.environment,
    origin,
    allowed,
    reason,
    riskScore: validation.riskScore,
  };

  if (allowed) {
    console.log("CORS Access Granted:", event);
  } else {
    console.warn("CORS Access Denied:", event);
  }
}

/**
 * Security configuration presets for different services
 */
export const SECURITY_PRESETS = {
  "Bytebot-Agent": {
    enableSwagger: true,
    enableVNC: false,
    enableHSTS: true,
  },
  BytebotD: {
    enableSwagger: false,
    enableVNC: true,
    enableHSTS: true,
  },
  "Bytebot-UI": {
    enableSwagger: false,
    enableVNC: true, // For embedded VNC viewer
    enableHSTS: true,
  },
} as const;

/**
 * Get security configuration for service with environment defaults
 * @param serviceName Service identifier
 * @param environment Current environment
 * @param overrides Custom configuration overrides
 * @returns Complete security configuration
 */
export function getSecurityConfig(
  serviceName: keyof typeof SECURITY_PRESETS | string,
  environment: SecurityConfig["environment"] = "development",
  overrides: Partial<SecurityConfig> = {},
): SecurityConfig {
  const preset =
    SECURITY_PRESETS[serviceName as keyof typeof SECURITY_PRESETS] || {};

  return {
    environment,
    serviceName: serviceName,
    enableSwagger: environment !== "production",
    enableVNC: false,
    enableHSTS: environment === "production",
    enableCSPReporting: environment !== "production",
    ...preset,
    ...overrides,
  };
}

export default {
  createHelmetConfig,
  createCorsConfig,
  createSecurityHeadersMiddleware,
  validateCorsOrigin,
  logCorsSecurityEvent,
  getSecurityConfig,
  SECURITY_PRESETS,
};
