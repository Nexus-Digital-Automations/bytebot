/**
 * CORS & Security Configuration - Environment-Specific Settings
 *
 * This module provides environment-specific CORS and security configurations
 * for all Bytebot microservices with comprehensive origin validation,
 * security headers, and monitoring capabilities.
 *
 * @fileoverview Environment-aware CORS and security configurations
 * @version 1.0.0
 * @author CORS & Security Configuration Specialist
 */

export interface CorsSecurityEnvironmentConfig {
  /** Environment identifier */
  environment: "development" | "staging" | "production";

  /** Domain configuration */
  domains: {
    primary: string;
    api: string;
    app: string;
    cdn?: string;
  };

  /** Allowed origins for CORS */
  allowedOrigins: string[];

  /** WebSocket origins (if different from HTTP origins) */
  websocketOrigins?: string[];

  /** Trusted proxy IP addresses */
  trustedProxies: string[];

  /** Security feature flags */
  security: {
    enforceHTTPS: boolean;
    enableHSTS: boolean;
    enableCSP: boolean;
    enableCSPReporting: boolean;
    strictOriginValidation: boolean;
    logCorsViolations: boolean;
  };

  /** Rate limiting by environment */
  rateLimits: {
    global: { requests: number; windowMs: number };
    auth: { requests: number; windowMs: number };
    computerUse: { requests: number; windowMs: number };
  };
}

/**
 * Development environment configuration
 */
export const DEVELOPMENT_CONFIG: CorsSecurityEnvironmentConfig = {
  environment: "development",

  domains: {
    primary: "localhost",
    api: "localhost:9991",
    app: "localhost:3000",
  },

  allowedOrigins: [
    // Standard development ports
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8080",

    // Bytebot service ports
    "http://localhost:9990", // BytebotD
    "http://localhost:9991", // Bytebot Agent
    "http://localhost:9992", // Bytebot UI

    // HTTPS variants for testing
    "https://localhost:3000",
    "https://localhost:3001",
    "https://localhost:9990",
    "https://localhost:9991",
    "https://localhost:9992",
  ],

  websocketOrigins: [
    "ws://localhost:3000",
    "ws://localhost:9990",
    "ws://localhost:9991",
    "wss://localhost:3000",
    "wss://localhost:9990",
    "wss://localhost:9991",
  ],

  trustedProxies: ["127.0.0.1", "::1", "localhost"],

  security: {
    enforceHTTPS: false,
    enableHSTS: false,
    enableCSP: true,
    enableCSPReporting: true,
    strictOriginValidation: false, // Relaxed for development
    logCorsViolations: true,
  },

  rateLimits: {
    global: { requests: 1000, windowMs: 60 * 1000 }, // 1000/min
    auth: { requests: 10, windowMs: 15 * 60 * 1000 }, // 10/15min
    computerUse: { requests: 200, windowMs: 60 * 1000 }, // 200/min
  },
};

/**
 * Staging environment configuration
 */
export const STAGING_CONFIG: CorsSecurityEnvironmentConfig = {
  environment: "staging",

  domains: {
    primary: "staging.bytebot.ai",
    api: "staging-api.bytebot.ai",
    app: "staging-app.bytebot.ai",
    cdn: "staging-cdn.bytebot.ai",
  },

  allowedOrigins: [
    "https://staging.bytebot.ai",
    "https://staging-app.bytebot.ai",
    "https://staging-api.bytebot.ai",

    // Allow localhost for local testing against staging
    "http://localhost:3000",
    "http://localhost:3001",
    "https://localhost:3000",
    "https://localhost:3001",
  ],

  websocketOrigins: [
    "wss://staging-app.bytebot.ai",
    "wss://staging-api.bytebot.ai",
  ],

  trustedProxies: [
    "10.0.0.0/8", // Private networks
    "172.16.0.0/12", // Private networks
    "192.168.0.0/16", // Private networks
    // Add specific load balancer IPs here
  ],

  security: {
    enforceHTTPS: true,
    enableHSTS: true,
    enableCSP: true,
    enableCSPReporting: true,
    strictOriginValidation: true,
    logCorsViolations: true,
  },

  rateLimits: {
    global: { requests: 500, windowMs: 60 * 1000 }, // 500/min
    auth: { requests: 5, windowMs: 15 * 60 * 1000 }, // 5/15min
    computerUse: { requests: 100, windowMs: 60 * 1000 }, // 100/min
  },
};

/**
 * Production environment configuration
 */
export const PRODUCTION_CONFIG: CorsSecurityEnvironmentConfig = {
  environment: "production",

  domains: {
    primary: "bytebot.ai",
    api: "api.bytebot.ai",
    app: "app.bytebot.ai",
    cdn: "cdn.bytebot.ai",
  },

  allowedOrigins: [
    "https://bytebot.ai",
    "https://app.bytebot.ai",
    "https://api.bytebot.ai",

    // Specific subdomain support
    "https://dashboard.bytebot.ai",
    "https://docs.bytebot.ai",
    "https://status.bytebot.ai",
  ],

  websocketOrigins: ["wss://app.bytebot.ai", "wss://api.bytebot.ai"],

  trustedProxies: [
    // Add production load balancer and CDN IPs
    "10.0.0.0/8", // AWS/GCP private networks
    "172.16.0.0/12", // Private networks
    "192.168.0.0/16", // Private networks
    // Cloudflare IPs (if using)
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
  ],

  security: {
    enforceHTTPS: true,
    enableHSTS: true,
    enableCSP: true,
    enableCSPReporting: false, // Disable to reduce noise in production
    strictOriginValidation: true,
    logCorsViolations: true,
  },

  rateLimits: {
    global: { requests: 100, windowMs: 60 * 1000 }, // 100/min
    auth: { requests: 3, windowMs: 15 * 60 * 1000 }, // 3/15min
    computerUse: { requests: 50, windowMs: 60 * 1000 }, // 50/min
  },
};

/**
 * Get configuration for specific environment
 * @param environment Target environment
 * @returns Environment-specific configuration
 */
export function getEnvironmentConfig(
  environment: string = process.env.NODE_ENV || "development",
): CorsSecurityEnvironmentConfig {
  switch (environment.toLowerCase()) {
    case "production":
      return PRODUCTION_CONFIG;
    case "staging":
      return STAGING_CONFIG;
    case "development":
    case "dev":
    case "test":
    default:
      return DEVELOPMENT_CONFIG;
  }
}

/**
 * Service-specific origin allowlists
 */
export const SERVICE_SPECIFIC_ORIGINS = {
  "Bytebot-Agent": {
    additional: [
      // Add any agent-specific origins
    ],
  },

  BytebotD: {
    additional: [
      // VNC viewer specific origins
      "vnc://localhost:5900",
      "vnc://127.0.0.1:5900",
    ],
  },

  "Bytebot-UI": {
    additional: [
      // UI-specific origins
    ],
  },
} as const;

/**
 * Get merged origins for specific service
 * @param serviceName Service identifier
 * @param environment Target environment
 * @returns Complete origin list for service
 */
export function getServiceOrigins(
  serviceName: keyof typeof SERVICE_SPECIFIC_ORIGINS | string,
  environment?: string,
): string[] {
  const envConfig = getEnvironmentConfig(environment);
  const serviceConfig =
    SERVICE_SPECIFIC_ORIGINS[
      serviceName as keyof typeof SERVICE_SPECIFIC_ORIGINS
    ];

  return [...envConfig.allowedOrigins, ...(serviceConfig?.additional || [])];
}

/**
 * Origin validation patterns for different environments
 */
export const ORIGIN_VALIDATION_PATTERNS = {
  development: [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
    /^https?:\/\/0\.0\.0\.0(:\d+)?$/,
  ],

  staging: [
    /^https:\/\/.*\.staging\.bytebot\.ai$/,
    /^https?:\/\/localhost(:\d+)?$/, // Allow localhost for testing
  ],

  production: [/^https:\/\/.*\.bytebot\.ai$/, /^https:\/\/bytebot\.ai$/],
} as const;

/**
 * Validate origin against environment patterns
 * @param origin Origin to validate
 * @param environment Target environment
 * @returns Validation result
 */
export function validateOriginPattern(
  origin: string,
  environment: string = process.env.NODE_ENV || "development",
): { valid: boolean; pattern?: RegExp; reason: string } {
  if (!origin) {
    return { valid: false, reason: "No origin provided" };
  }

  const patterns =
    ORIGIN_VALIDATION_PATTERNS[
      environment as keyof typeof ORIGIN_VALIDATION_PATTERNS
    ] || ORIGIN_VALIDATION_PATTERNS.development;

  for (const pattern of patterns) {
    if (pattern.test(origin)) {
      return {
        valid: true,
        pattern,
        reason: `Matches ${environment} pattern: ${pattern.source}`,
      };
    }
  }

  return {
    valid: false,
    reason: `Origin does not match any ${environment} patterns`,
  };
}

/**
 * Security event risk scoring for CORS violations
 */
export function calculateCorsRiskScore(
  origin: string,
  environment: string,
  metadata: {
    userAgent?: string;
    referer?: string;
    ipAddress?: string;
    requestCount?: number;
  } = {},
): number {
  let score = 30; // Base risk for CORS violation

  // Environment-specific adjustments
  if (environment === "production") {
    score += 20; // Higher risk in production
  }

  // Origin-based risk factors
  if (origin) {
    // IP-based origins are suspicious
    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(origin)) {
      score += 25;
    }

    // Non-HTTPS in production is high risk
    if (environment === "production" && !origin.startsWith("https://")) {
      score += 30;
    }

    // Localhost in production is suspicious
    if (environment === "production" && origin.includes("localhost")) {
      score += 40;
    }

    // Suspicious TLDs
    const suspiciousTlds = [".tk", ".ml", ".ga", ".cf"];
    if (suspiciousTlds.some((tld) => origin.includes(tld))) {
      score += 35;
    }
  }

  // Request pattern analysis
  if (metadata.requestCount && metadata.requestCount > 10) {
    score += 15; // Repeated violations
  }

  return Math.min(100, score);
}

export default {
  getEnvironmentConfig,
  getServiceOrigins,
  validateOriginPattern,
  calculateCorsRiskScore,
  DEVELOPMENT_CONFIG,
  STAGING_CONFIG,
  PRODUCTION_CONFIG,
  SERVICE_SPECIFIC_ORIGINS,
  ORIGIN_VALIDATION_PATTERNS,
};
