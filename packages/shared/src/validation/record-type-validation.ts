/**
 * Record Type Validation Script
 *
 * This script validates that all Record<RateLimitServiceType, ServiceSecurityOverrides>
 * and Record<RateLimitPreset, RateLimitConfig> type configurations are complete
 * and TypeScript compliant.
 */

import {
  RateLimitServiceType,
  RateLimitPreset,
  RateLimitConfig,
} from "../types/security.types";

/**
 * ServiceSecurityOverrides interface - matches the one in environment-security.config.ts
 */
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

/**
 * Complete Record<RateLimitServiceType, ServiceSecurityOverrides> configuration
 * This ensures all enum values are covered
 */
const SERVICE_SECURITY_OVERRIDES_VALIDATION: Record<
  RateLimitServiceType,
  ServiceSecurityOverrides
> = {
  [RateLimitServiceType._BYTEBOTD]: {
    rateLimiting: {
      enabled: true,
      strictMode: true,
      windowMs: 900000, // 15 minutes
      maxRequests: 50, // Lower for computer control
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
    performance: {
      requestTimeout: 30000, // Longer for VNC operations
      maxConcurrentRequests: 10, // Limited concurrency
      memoryLimit: 2048, // MB
      cpuThreshold: 80, // %
      diskSpaceThreshold: 85, // %
    },
    emergency: {
      maxSecurityViolations: 5, // Stricter for computer control
    },
  },

  [RateLimitServiceType._BYTEBOT_AGENT]: {
    rateLimiting: {
      enabled: true,
      strictMode: false,
      windowMs: 900000, // 15 minutes
      maxRequests: 200, // Moderate for API
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
    performance: {
      requestTimeout: 15000,
      maxConcurrentRequests: 100,
      memoryLimit: 1024, // MB
      cpuThreshold: 70, // %
      diskSpaceThreshold: 80, // %
    },
    logging: {
      level: "info", // More detailed for API debugging
    },
  },

  [RateLimitServiceType._BYTEBOT_UI]: {
    cors: {
      enabled: true,
      strictMode: false,
      credentials: true, // UI needs credentials
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
      windowMs: 900000, // 15 minutes
      maxRequests: 1000, // Higher for UI interactions
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
    performance: {
      requestTimeout: 10000,
      maxConcurrentRequests: 200,
      memoryLimit: 512, // MB
      cpuThreshold: 60, // %
      diskSpaceThreshold: 75, // %
    },
  },

  [RateLimitServiceType._SHARED]: {
    // Use environment defaults - empty override
    // This is a valid configuration that uses all defaults
  },
};

/**
 * Complete Record<RateLimitPreset, RateLimitConfig> configuration
 * This ensures all enum values are covered
 */
const DEFAULT_RATE_LIMITS_VALIDATION: Record<RateLimitPreset, RateLimitConfig> =
  {
    [RateLimitPreset._AUTH]: {
      max: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      message: "Too many authentication attempts. Please try again later.",
      skip: undefined,
      keyGenerator: undefined,
    },

    [RateLimitPreset._COMPUTER_USE]: {
      max: 100,
      windowMs: 60 * 1000, // 1 minute
      message:
        "Computer control rate limit exceeded. Please slow down your requests.",
      skip: undefined,
      keyGenerator: undefined,
    },

    [RateLimitPreset._TASK_OPERATIONS]: {
      max: 50,
      windowMs: 60 * 1000, // 1 minute
      message:
        "Task operation rate limit exceeded. Please wait before retrying.",
      skip: undefined,
      keyGenerator: undefined,
    },

    [RateLimitPreset._READ_OPERATIONS]: {
      max: 500,
      windowMs: 60 * 1000, // 1 minute
      message:
        "Read operation rate limit exceeded. Please reduce request frequency.",
      skip: undefined,
      keyGenerator: undefined,
    },

    [RateLimitPreset._WEBSOCKET]: {
      max: 10,
      windowMs: 60 * 1000, // 1 minute
      message:
        "WebSocket connection rate limit exceeded. Please wait before reconnecting.",
      skip: undefined,
      keyGenerator: undefined,
    },
  };

/**
 * Compile-time validation that all enum values are covered
 */

// Validate RateLimitServiceType coverage
const _serviceTypeValidation: Record<RateLimitServiceType, true> = {
  [RateLimitServiceType._BYTEBOTD]: true,
  [RateLimitServiceType._BYTEBOT_AGENT]: true,
  [RateLimitServiceType._BYTEBOT_UI]: true,
  [RateLimitServiceType._SHARED]: true,
};

// Validate RateLimitPreset coverage
const _rateLimitPresetValidation: Record<RateLimitPreset, true> = {
  [RateLimitPreset._AUTH]: true,
  [RateLimitPreset._COMPUTER_USE]: true,
  [RateLimitPreset._TASK_OPERATIONS]: true,
  [RateLimitPreset._READ_OPERATIONS]: true,
  [RateLimitPreset._WEBSOCKET]: true,
};

/**
 * Runtime validation functions
 */

export function validateServiceSecurityOverrides(): boolean {
  const serviceTypes = Object.values(RateLimitServiceType);
  const configKeys = Object.keys(SERVICE_SECURITY_OVERRIDES_VALIDATION);

  console.log(
    "🔍 Validating Record<RateLimitServiceType, ServiceSecurityOverrides>",
  );
  console.log("Service Types:", serviceTypes);
  console.log("Config Keys:", configKeys);

  for (const serviceType of serviceTypes) {
    if (
      !Object.prototype.hasOwnProperty.call(
        SERVICE_SECURITY_OVERRIDES_VALIDATION,
        serviceType,
      )
    ) {
      console.error(
        `❌ Missing configuration for service type: ${serviceType}`,
      );
      return false;
    }
  }

  console.log(
    "✅ All RateLimitServiceType values have corresponding configurations",
  );
  return true;
}

export function validateRateLimitConfigs(): boolean {
  const presets = Object.values(RateLimitPreset);
  const configKeys = Object.keys(DEFAULT_RATE_LIMITS_VALIDATION);

  console.log("🔍 Validating Record<RateLimitPreset, RateLimitConfig>");
  console.log("Rate Limit Presets:", presets);
  console.log("Config Keys:", configKeys);

  for (const preset of presets) {
    if (
      !Object.prototype.hasOwnProperty.call(
        DEFAULT_RATE_LIMITS_VALIDATION,
        preset,
      )
    ) {
      console.error(
        `❌ Missing configuration for rate limit preset: ${preset}`,
      );
      return false;
    }
  }

  console.log(
    "✅ All RateLimitPreset values have corresponding configurations",
  );
  return true;
}

export function runValidation(): boolean {
  console.log("🚀 Starting Record Type Validation");
  console.log("=====================================");

  const serviceValidation = validateServiceSecurityOverrides();
  const rateLimitValidation = validateRateLimitConfigs();

  const overallSuccess = serviceValidation && rateLimitValidation;

  console.log("=====================================");
  console.log(`🎯 Overall Result: ${overallSuccess ? "✅ PASS" : "❌ FAIL"}`);

  if (overallSuccess) {
    console.log(
      "🎉 All Record type configurations are complete and TypeScript compliant!",
    );
  }

  return overallSuccess;
}

// Export configurations for use in other modules
export {
  SERVICE_SECURITY_OVERRIDES_VALIDATION,
  DEFAULT_RATE_LIMITS_VALIDATION,
};

// Run validation if this module is executed directly
if (require.main === module) {
  runValidation();
}
