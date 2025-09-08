/**
 * Environment-Based Security Configuration
 *
 * Comprehensive security configuration management with environment-specific policies,
 * adaptive security levels, and integration with Bytebot services configuration.
 *
 * Features:
 * - Environment-aware security policies (development, staging, production)
 * - Service-specific security configurations with inheritance
 * - Dynamic security level adaptation based on threat assessment
 * - Configuration validation and security policy enforcement
 * - Integration with helmet.js, CORS, CSP, and rate limiting
 * - Compliance tracking and security posture monitoring
 * - Feature flags for gradual security policy rollout
 *
 * @fileoverview Advanced environment-based security configuration system
 * @version 2.0.0
 * @author Environment Security Configuration Specialist
 */

import { RateLimitServiceType } from "../types/security.types";
import { HelmetSecurityConfig } from "../middleware/helmet-security.middleware";
import { CSPNonceConfig } from "../middleware/csp-nonce.middleware";

/**
 * Simple logger for environment security configuration
 * Uses console logging to avoid NestJS dependency in shared package
 */
const logger = {
  log: (message: string, context?: Record<string, unknown> | string) => {
    console.log(`[EnvironmentSecurityConfig] ${message}`, context || "");
  },
  warn: (message: string, context?: Record<string, unknown> | string) => {
    console.warn(`[EnvironmentSecurityConfig] ${message}`, context || "");
  },
  error: (message: string, context?: Record<string, unknown> | string) => {
    console.error(`[EnvironmentSecurityConfig] ${message}`, context || "");
  },
};

/**
 * Environment types for security configuration
 * ESLint disabled: Complete environment coverage for deployment flexibility
 */
/* eslint-disable no-unused-vars */

export enum SecurityEnvironment {
  DEVELOPMENT = "development",
  STAGING = "staging",
  PRODUCTION = "production",
  TEST = "test",
}
/* eslint-enable no-unused-vars */

/**
 * Security levels with different policy strictness
 * ESLint disabled: Complete security level coverage for flexible deployment
 */
/* eslint-disable no-unused-vars */

export enum SecurityLevel {
  MINIMAL = "minimal", // Development only
  STANDARD = "standard", // Staging
  HIGH = "high", // Production default
  MAXIMUM = "maximum", // High-security production
}
/* eslint-enable no-unused-vars */

/**
 * Security feature flags for gradual rollout
 */
export interface SecurityFeatureFlags {
  /** Enable advanced CORS policies */
  advancedCors: boolean;

  /** Enable dynamic CSP nonce generation */
  dynamicCspNonce: boolean;

  /** Enable comprehensive security headers */
  comprehensiveHeaders: boolean;

  /** Enable DoS protection and advanced rate limiting */
  dosProtection: boolean;

  /** Enable real-time security monitoring */
  securityMonitoring: boolean;

  /** Enable security incident response */
  incidentResponse: boolean;

  /** Enable compliance tracking */
  complianceTracking: boolean;

  /** Enable performance security metrics */
  performanceMetrics: boolean;

  /** Enable security testing and validation */
  securityTesting: boolean;

  /** Enable threat intelligence integration */
  threatIntelligence: boolean;
}

/**
 * Comprehensive environment security configuration
 */
export interface EnvironmentSecurityConfig {
  /** Environment type */
  environment: SecurityEnvironment;

  /** Security level */
  securityLevel: SecurityLevel;

  /** Service type */
  serviceType: RateLimitServiceType;

  /** Security feature flags */
  features: SecurityFeatureFlags;

  /** CORS configuration */
  cors: {
    enabled: boolean;
    strictMode: boolean;
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    credentials: boolean;
    maxAge: number;
    preflightContinue: boolean;
    optionsSuccessStatus: number;
  };

  /** Helmet.js security headers configuration */
  helmet: Partial<HelmetSecurityConfig>;

  /** CSP nonce configuration */
  cspNonce: Partial<CSPNonceConfig>;

  /** Rate limiting configuration */
  rateLimiting: {
    enabled: boolean;
    strictMode: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
    keyGenerator?: string; // Function name for custom key generation
    skip?: string; // Function name for skip logic
    handler?: string; // Function name for limit exceeded handler
  };

  /** Input validation and sanitization */
  inputValidation: {
    enabled: boolean;
    strictMode: boolean;
    sanitizeHtml: boolean;
    sanitizeScripts: boolean;
    validateTypes: boolean;
    maxFieldLength: number;
    maxObjectDepth: number;
    blockMaliciousPatterns: boolean;
  };

  /** Logging and monitoring configuration */
  logging: {
    level: "error" | "warn" | "info" | "debug" | "verbose";
    securityEvents: boolean;
    performanceMetrics: boolean;
    errorTracking: boolean;
    auditLogs: boolean;
    structuredLogging: boolean;
  };

  /** Compliance and governance */
  compliance: {
    enabled: boolean;
    frameworks: string[]; // OWASP, SOC2, GDPR, etc.
    auditTrail: boolean;
    dataRetention: number; // days
    encryptionAtRest: boolean;
    encryptionInTransit: boolean;
  };

  /** Performance and resource limits */
  performance: {
    requestTimeout: number;
    maxConcurrentRequests: number;
    memoryLimit: number; // MB
    cpuThreshold: number; // percentage
    diskSpaceThreshold: number; // percentage
  };

  /** Emergency and incident response */
  emergency: {
    enableKillSwitch: boolean;
    maxSecurityViolations: number;
    lockdownDuration: number; // minutes
    alertThresholds: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
  };
}

/**
 * Default security configurations for different environments
 */
const ENVIRONMENT_SECURITY_DEFAULTS: Record<
  SecurityEnvironment,
  Partial<EnvironmentSecurityConfig>
> = {
  [SecurityEnvironment.DEVELOPMENT]: {
    environment: SecurityEnvironment.DEVELOPMENT,
    securityLevel: SecurityLevel.MINIMAL,
    features: {
      advancedCors: false,
      dynamicCspNonce: false,
      comprehensiveHeaders: false,
      dosProtection: false,
      securityMonitoring: true, // For testing
      incidentResponse: false,
      complianceTracking: false,
      performanceMetrics: true,
      securityTesting: true,
      threatIntelligence: false,
    },
    cors: {
      enabled: true,
      strictMode: false,
      allowedOrigins: ["*"], // Permissive for development
      allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["*"],
      exposedHeaders: ["X-Total-Count", "X-Debug-Info"],
      credentials: true,
      maxAge: 86400,
      preflightContinue: false,
      optionsSuccessStatus: 200,
    },
    rateLimiting: {
      enabled: false, // Disabled for development ease
      strictMode: false,
      windowMs: 900000, // 15 minutes
      maxRequests: 1000,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
    inputValidation: {
      enabled: true,
      strictMode: false,
      sanitizeHtml: true,
      sanitizeScripts: true,
      validateTypes: false, // Lenient for development
      maxFieldLength: 10000,
      maxObjectDepth: 10,
      blockMaliciousPatterns: false,
    },
    logging: {
      level: "debug",
      securityEvents: true,
      performanceMetrics: true,
      errorTracking: true,
      auditLogs: false,
      structuredLogging: false,
    },
    compliance: {
      enabled: false,
      frameworks: [],
      auditTrail: false,
      dataRetention: 7,
      encryptionAtRest: false,
      encryptionInTransit: false,
    },
    performance: {
      requestTimeout: 30000, // 30 seconds
      maxConcurrentRequests: 100,
      memoryLimit: 512,
      cpuThreshold: 80,
      diskSpaceThreshold: 80,
    },
    emergency: {
      enableKillSwitch: false,
      maxSecurityViolations: 100,
      lockdownDuration: 5,
      alertThresholds: {
        low: 10,
        medium: 25,
        high: 50,
        critical: 100,
      },
    },
  },

  [SecurityEnvironment.STAGING]: {
    environment: SecurityEnvironment.STAGING,
    securityLevel: SecurityLevel.STANDARD,
    features: {
      advancedCors: true,
      dynamicCspNonce: true,
      comprehensiveHeaders: true,
      dosProtection: true,
      securityMonitoring: true,
      incidentResponse: true,
      complianceTracking: true,
      performanceMetrics: true,
      securityTesting: true,
      threatIntelligence: false, // Limited in staging
    },
    cors: {
      enabled: true,
      strictMode: true,
      allowedOrigins: [
        "https://staging.bytebot.ai",
        "https://staging-api.bytebot.ai",
      ],
      allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      exposedHeaders: ["X-Total-Count", "X-RateLimit-Remaining"],
      credentials: true,
      maxAge: 86400,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    },
    rateLimiting: {
      enabled: true,
      strictMode: false,
      windowMs: 900000, // 15 minutes
      maxRequests: 500,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
    inputValidation: {
      enabled: true,
      strictMode: false,
      sanitizeHtml: true,
      sanitizeScripts: true,
      validateTypes: true,
      maxFieldLength: 5000,
      maxObjectDepth: 8,
      blockMaliciousPatterns: true,
    },
    logging: {
      level: "info",
      securityEvents: true,
      performanceMetrics: true,
      errorTracking: true,
      auditLogs: true,
      structuredLogging: true,
    },
    compliance: {
      enabled: true,
      frameworks: ["OWASP"],
      auditTrail: true,
      dataRetention: 30,
      encryptionAtRest: true,
      encryptionInTransit: true,
    },
    performance: {
      requestTimeout: 20000, // 20 seconds
      maxConcurrentRequests: 200,
      memoryLimit: 1024,
      cpuThreshold: 70,
      diskSpaceThreshold: 75,
    },
    emergency: {
      enableKillSwitch: true,
      maxSecurityViolations: 50,
      lockdownDuration: 10,
      alertThresholds: {
        low: 5,
        medium: 15,
        high: 30,
        critical: 50,
      },
    },
  },

  [SecurityEnvironment.PRODUCTION]: {
    environment: SecurityEnvironment.PRODUCTION,
    securityLevel: SecurityLevel.HIGH,
    features: {
      advancedCors: true,
      dynamicCspNonce: true,
      comprehensiveHeaders: true,
      dosProtection: true,
      securityMonitoring: true,
      incidentResponse: true,
      complianceTracking: true,
      performanceMetrics: true,
      securityTesting: true,
      threatIntelligence: true,
    },
    cors: {
      enabled: true,
      strictMode: true,
      allowedOrigins: ["https://bytebot.ai", "https://api.bytebot.ai"],
      allowedMethods: ["GET", "POST", "PUT", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
      exposedHeaders: ["X-RateLimit-Remaining"],
      credentials: false, // More secure in production
      maxAge: 3600, // Shorter cache for security
      preflightContinue: false,
      optionsSuccessStatus: 204,
    },
    rateLimiting: {
      enabled: true,
      strictMode: true,
      windowMs: 900000, // 15 minutes
      maxRequests: 100, // More restrictive
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
    inputValidation: {
      enabled: true,
      strictMode: true,
      sanitizeHtml: true,
      sanitizeScripts: true,
      validateTypes: true,
      maxFieldLength: 2000, // Stricter limits
      maxObjectDepth: 5,
      blockMaliciousPatterns: true,
    },
    logging: {
      level: "warn", // Reduce log noise in production
      securityEvents: true,
      performanceMetrics: true,
      errorTracking: true,
      auditLogs: true,
      structuredLogging: true,
    },
    compliance: {
      enabled: true,
      frameworks: ["OWASP", "SOC2", "GDPR"],
      auditTrail: true,
      dataRetention: 90,
      encryptionAtRest: true,
      encryptionInTransit: true,
    },
    performance: {
      requestTimeout: 10000, // 10 seconds
      maxConcurrentRequests: 500,
      memoryLimit: 2048,
      cpuThreshold: 60,
      diskSpaceThreshold: 70,
    },
    emergency: {
      enableKillSwitch: true,
      maxSecurityViolations: 20, // Lower threshold
      lockdownDuration: 30,
      alertThresholds: {
        low: 3,
        medium: 8,
        high: 15,
        critical: 20,
      },
    },
  },

  [SecurityEnvironment.TEST]: {
    environment: SecurityEnvironment.TEST,
    securityLevel: SecurityLevel.MINIMAL,
    features: {
      advancedCors: false,
      dynamicCspNonce: false,
      comprehensiveHeaders: false,
      dosProtection: false,
      securityMonitoring: false, // Reduce test noise
      incidentResponse: false,
      complianceTracking: false,
      performanceMetrics: false,
      securityTesting: true,
      threatIntelligence: false,
    },
    cors: {
      enabled: false, // Disabled for unit tests
      strictMode: false,
      allowedOrigins: ["*"],
      allowedMethods: ["*"],
      allowedHeaders: ["*"],
      exposedHeaders: [],
      credentials: false,
      maxAge: 0,
      preflightContinue: false,
      optionsSuccessStatus: 200,
    },
    rateLimiting: {
      enabled: false, // Disabled for testing
      strictMode: false,
      windowMs: 60000,
      maxRequests: 10000,
      skipSuccessfulRequests: true,
      skipFailedRequests: true,
    },
    inputValidation: {
      enabled: true,
      strictMode: false,
      sanitizeHtml: false, // Allow test data through
      sanitizeScripts: false,
      validateTypes: false,
      maxFieldLength: 50000,
      maxObjectDepth: 20,
      blockMaliciousPatterns: false,
    },
    logging: {
      level: "error", // Minimal logging for tests
      securityEvents: false,
      performanceMetrics: false,
      errorTracking: false,
      auditLogs: false,
      structuredLogging: false,
    },
    compliance: {
      enabled: false,
      frameworks: [],
      auditTrail: false,
      dataRetention: 1,
      encryptionAtRest: false,
      encryptionInTransit: false,
    },
    performance: {
      requestTimeout: 5000, // Fast tests
      maxConcurrentRequests: 1000,
      memoryLimit: 256,
      cpuThreshold: 90,
      diskSpaceThreshold: 90,
    },
    emergency: {
      enableKillSwitch: false,
      maxSecurityViolations: 1000,
      lockdownDuration: 1,
      alertThresholds: {
        low: 100,
        medium: 250,
        high: 500,
        critical: 1000,
      },
    },
  },
};

/**
 * Service-specific security overrides
 */
/**
 * Service-specific security overrides with complete configuration objects
 * Uses proper deep partial types to avoid TypeScript build errors
 */
interface ServiceSecurityOverrides {
  rateLimiting?: Partial<EnvironmentSecurityConfig["rateLimiting"]>;
  performance?: Partial<EnvironmentSecurityConfig["performance"]>;
  cors?: Partial<EnvironmentSecurityConfig["cors"]>;
  emergency?: Partial<EnvironmentSecurityConfig["emergency"]>;
  logging?: Partial<EnvironmentSecurityConfig["logging"]>;
}

const SERVICE_SECURITY_OVERRIDES: Record<
  RateLimitServiceType,
  ServiceSecurityOverrides
> = {
  [RateLimitServiceType.BYTEBOTD]: {
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

  [RateLimitServiceType.BYTEBOT_AGENT]: {
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

  [RateLimitServiceType.BYTEBOT_UI]: {
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

  [RateLimitServiceType.SHARED]: {
    // Use environment defaults - empty override
  },
};

/**
 * Environment Security Configuration Manager
 */
export class EnvironmentSecurityConfigManager {
  private static instance: EnvironmentSecurityConfigManager;
  private configCache = new Map<string, EnvironmentSecurityConfig>();

  private constructor() {
    logger.log("Environment Security Configuration Manager initialized");
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): EnvironmentSecurityConfigManager {
    if (!EnvironmentSecurityConfigManager.instance) {
      EnvironmentSecurityConfigManager.instance =
        new EnvironmentSecurityConfigManager();
    }
    return EnvironmentSecurityConfigManager.instance;
  }

  /**
   * Get security configuration for environment and service
   */
  public getSecurityConfig(
    environment: SecurityEnvironment,
    serviceType: RateLimitServiceType,
    overrides?: Partial<EnvironmentSecurityConfig>,
  ): EnvironmentSecurityConfig {
    const cacheKey = `${environment}:${serviceType}`;

    if (this.configCache.has(cacheKey) && !overrides) {
      return this.configCache.get(cacheKey)!;
    }

    // Build configuration with inheritance
    const baseConfig = ENVIRONMENT_SECURITY_DEFAULTS[environment];
    const serviceOverrides = SERVICE_SECURITY_OVERRIDES[serviceType];

    const config: EnvironmentSecurityConfig = {
      ...baseConfig,
      ...serviceOverrides,
      ...overrides,
      serviceType,
      environment,
    } as EnvironmentSecurityConfig;

    // Validate configuration
    this.validateConfiguration(config);

    // Cache the configuration
    this.configCache.set(cacheKey, config);

    logger.log("Security configuration generated", {
      environment,
      serviceType,
      securityLevel: config.securityLevel,
      featuresEnabled: Object.entries(config.features)
        .filter(([, enabled]) => enabled)
        .map(([feature]) => feature),
    });

    return config;
  }

  /**
   * Get security configuration based on NODE_ENV
   */
  public getConfigFromNodeEnv(
    serviceType: RateLimitServiceType,
    overrides?: Partial<EnvironmentSecurityConfig>,
  ): EnvironmentSecurityConfig {
    const nodeEnv = process.env.NODE_ENV || "development";
    let environment: SecurityEnvironment;

    switch (nodeEnv.toLowerCase()) {
      case "production":
        environment = SecurityEnvironment.PRODUCTION;
        break;
      case "staging":
        environment = SecurityEnvironment.STAGING;
        break;
      case "test":
        environment = SecurityEnvironment.TEST;
        break;
      case "development":
      default:
        environment = SecurityEnvironment.DEVELOPMENT;
        break;
    }

    return this.getSecurityConfig(environment, serviceType, overrides);
  }

  /**
   * Update security configuration at runtime
   */
  public updateSecurityConfig(
    environment: SecurityEnvironment,
    serviceType: RateLimitServiceType,
    updates: Partial<EnvironmentSecurityConfig>,
  ): void {
    const cacheKey = `${environment}:${serviceType}`;
    const existingConfig = this.getSecurityConfig(environment, serviceType);

    const updatedConfig = {
      ...existingConfig,
      ...updates,
    };

    this.validateConfiguration(updatedConfig);
    this.configCache.set(cacheKey, updatedConfig);

    logger.warn("Security configuration updated at runtime", {
      environment,
      serviceType,
      updatedFields: Object.keys(updates),
    });
  }

  /**
   * Validate security configuration
   */
  private validateConfiguration(config: EnvironmentSecurityConfig): void {
    const errors: string[] = [];

    // Validate environment-security level compatibility
    if (
      config.environment === SecurityEnvironment.PRODUCTION &&
      config.securityLevel === SecurityLevel.MINIMAL
    ) {
      errors.push("Production environment cannot use minimal security level");
    }

    if (
      config.environment === SecurityEnvironment.DEVELOPMENT &&
      config.securityLevel === SecurityLevel.MAXIMUM
    ) {
      errors.push(
        "Development environment should not use maximum security level",
      );
    }

    // Validate CORS configuration
    if (
      config.cors.enabled &&
      config.cors.strictMode &&
      config.cors.allowedOrigins.includes("*")
    ) {
      errors.push("Strict CORS mode cannot allow wildcard origins");
    }

    // Validate rate limiting
    if (config.rateLimiting.enabled && config.rateLimiting.maxRequests <= 0) {
      errors.push("Rate limiting max requests must be positive");
    }

    // Validate performance limits
    if (config.performance.requestTimeout <= 0) {
      errors.push("Request timeout must be positive");
    }

    if (config.performance.maxConcurrentRequests <= 0) {
      errors.push("Max concurrent requests must be positive");
    }

    if (errors.length > 0) {
      throw new Error(
        `Security configuration validation failed: ${errors.join(", ")}`,
      );
    }
  }

  /**
   * Get security posture assessment
   */
  public getSecurityPosture(
    environment: SecurityEnvironment,
    serviceType: RateLimitServiceType,
  ): {
    score: number;
    level: SecurityLevel;
    recommendations: string[];
    compliance: string[];
  } {
    const config = this.getSecurityConfig(environment, serviceType);
    let score = 0;
    const recommendations: string[] = [];
    const compliance: string[] = [];

    // Calculate security score based on enabled features and configuration
    const enabledFeatures = Object.values(config.features).filter(
      Boolean,
    ).length;
    score += (enabledFeatures / 10) * 30; // 30 points for features

    if (config.cors.strictMode) score += 10;
    if (config.rateLimiting.enabled && config.rateLimiting.strictMode)
      score += 15;
    if (config.inputValidation.strictMode) score += 15;
    if (config.compliance.enabled) score += 20;
    if (config.emergency.enableKillSwitch) score += 10;

    // Generate recommendations
    if (!config.features.dosProtection) {
      recommendations.push("Enable DoS protection for better security");
    }
    if (
      !config.features.threatIntelligence &&
      environment === SecurityEnvironment.PRODUCTION
    ) {
      recommendations.push("Enable threat intelligence in production");
    }
    if (!config.compliance.encryptionAtRest) {
      recommendations.push("Enable encryption at rest");
    }

    // Check compliance
    if (config.compliance.frameworks.includes("OWASP")) {
      compliance.push("OWASP Top 10 guidelines");
    }
    if (config.compliance.frameworks.includes("SOC2")) {
      compliance.push("SOC 2 Type II compliance");
    }

    return {
      score: Math.min(100, score),
      level: config.securityLevel,
      recommendations,
      compliance,
    };
  }

  /**
   * Clear configuration cache
   */
  public clearCache(): void {
    this.configCache.clear();
    logger.log("Security configuration cache cleared");
  }
}

/**
 * Factory function to get environment security configuration
 */
export function getEnvironmentSecurityConfig(
  serviceType: RateLimitServiceType,
  overrides?: Partial<EnvironmentSecurityConfig>,
): EnvironmentSecurityConfig {
  const manager = EnvironmentSecurityConfigManager.getInstance();
  return manager.getConfigFromNodeEnv(serviceType, overrides);
}

/**
 * Helper function to check if a security feature is enabled
 */
export function isSecurityFeatureEnabled(
  feature: keyof SecurityFeatureFlags,
  serviceType: RateLimitServiceType,
  environment?: SecurityEnvironment,
): boolean {
  const manager = EnvironmentSecurityConfigManager.getInstance();

  if (environment) {
    const config = manager.getSecurityConfig(environment, serviceType);
    return config.features[feature];
  } else {
    const config = manager.getConfigFromNodeEnv(serviceType);
    return config.features[feature];
  }
}

/**
 * Helper function to get security level for environment
 */
export function getSecurityLevelForEnvironment(
  environment: SecurityEnvironment,
): SecurityLevel {
  switch (environment) {
    case SecurityEnvironment.PRODUCTION:
      return SecurityLevel.HIGH;
    case SecurityEnvironment.STAGING:
      return SecurityLevel.STANDARD;
    case SecurityEnvironment.DEVELOPMENT:
    case SecurityEnvironment.TEST:
    default:
      return SecurityLevel.MINIMAL;
  }
}

// Export statements removed to prevent conflicts - types are already declared above
