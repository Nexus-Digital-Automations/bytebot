/**
 * Isolated test for Record type configurations
 */

import {
  RateLimitServiceType,
  RateLimitPreset,
  RateLimitConfig,
} from "./types/security.types";

// Test ServiceSecurityOverrides interface
interface ServiceSecurityOverrides {
  rateLimiting?: {
    enabled?: boolean;
    strictMode?: boolean;
    windowMs?: number;
    maxRequests?: number;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  };
  performance?: {
    requestTimeout?: number;
    maxConcurrentRequests?: number;
    memoryLimit?: number;
    cpuThreshold?: number;
    diskSpaceThreshold?: number;
  };
  cors?: {
    enabled?: boolean;
    strictMode?: boolean;
    credentials?: boolean;
    allowedMethods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
  };
  emergency?: {
    maxSecurityViolations?: number;
  };
  logging?: {
    level?: string;
  };
}

// Test Record<RateLimitServiceType, ServiceSecurityOverrides>
const SERVICE_SECURITY_OVERRIDES: Record<
  RateLimitServiceType,
  ServiceSecurityOverrides
> = {
  [RateLimitServiceType._BYTEBOTD]: {
    rateLimiting: {
      enabled: true,
      strictMode: true,
      windowMs: 900000,
      maxRequests: 50,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
    performance: {
      requestTimeout: 30000,
      maxConcurrentRequests: 10,
      memoryLimit: 2048,
      cpuThreshold: 80,
      diskSpaceThreshold: 85,
    },
    emergency: {
      maxSecurityViolations: 5,
    },
  },
  [RateLimitServiceType._BYTEBOT_AGENT]: {
    rateLimiting: {
      enabled: true,
      strictMode: false,
      windowMs: 900000,
      maxRequests: 200,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
    performance: {
      requestTimeout: 15000,
      maxConcurrentRequests: 100,
      memoryLimit: 1024,
      cpuThreshold: 70,
      diskSpaceThreshold: 80,
    },
    logging: {
      level: "info",
    },
  },
  [RateLimitServiceType._BYTEBOT_UI]: {
    cors: {
      enabled: true,
      strictMode: false,
      credentials: true,
      allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-CSRF-Token",
      ],
      exposedHeaders: ["X-Total-Count", "X-Request-ID"],
    },
    rateLimiting: {
      enabled: true,
      strictMode: false,
      windowMs: 900000,
      maxRequests: 1000,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
    performance: {
      requestTimeout: 10000,
      maxConcurrentRequests: 200,
      memoryLimit: 512,
      cpuThreshold: 60,
      diskSpaceThreshold: 75,
    },
  },
  [RateLimitServiceType._SHARED]: {
    // Use environment defaults - empty override
  },
};

// Test Record<RateLimitPreset, RateLimitConfig>
const DEFAULT_RATE_LIMITS: Record<RateLimitPreset, RateLimitConfig> = {
  [RateLimitPreset._AUTH]: {
    max: 5,
    windowMs: 15 * 60 * 1000,
    message: "Too many authentication attempts. Please try again later.",
    skip: undefined,
    keyGenerator: undefined,
  },
  [RateLimitPreset._COMPUTER_USE]: {
    max: 100,
    windowMs: 60 * 1000,
    message:
      "Computer control rate limit exceeded. Please slow down your requests.",
    skip: undefined,
    keyGenerator: undefined,
  },
  [RateLimitPreset._TASK_OPERATIONS]: {
    max: 50,
    windowMs: 60 * 1000,
    message: "Task operation rate limit exceeded. Please wait before retrying.",
    skip: undefined,
    keyGenerator: undefined,
  },
  [RateLimitPreset._READ_OPERATIONS]: {
    max: 500,
    windowMs: 60 * 1000,
    message:
      "Read operation rate limit exceeded. Please reduce request frequency.",
    skip: undefined,
    keyGenerator: undefined,
  },
  [RateLimitPreset._WEBSOCKET]: {
    max: 10,
    windowMs: 60 * 1000,
    message:
      "WebSocket connection rate limit exceeded. Please wait before reconnecting.",
    skip: undefined,
    keyGenerator: undefined,
  },
};

console.log(
  "✅ Record<RateLimitServiceType, ServiceSecurityOverrides> - Compiles successfully",
);
console.log(
  "✅ Record<RateLimitPreset, RateLimitConfig> - Compiles successfully",
);
console.log("🎉 All Record type configurations are TypeScript compliant!");

// Export for type checking
export { SERVICE_SECURITY_OVERRIDES, DEFAULT_RATE_LIMITS };
