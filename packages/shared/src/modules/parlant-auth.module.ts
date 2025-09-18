/**
 * Parlant Authentication & Authorization Module
 *
 * Comprehensive NestJS module that integrates all Parlant-enhanced
 * authentication and authorization components into a cohesive system.
 *
 * Features:
 * - Automated service registration and dependency injection
 * - Configuration management for Parlant integration
 * - Provider setup for enhanced authentication services
 * - Guard and interceptor registration
 * - Export management for consuming modules
 *
 * @fileoverview Parlant authentication module for Bytebot platform
 * @version 1.0.0
 * @author Parlant Integration Research Agent #3
 */

import {
  Module,
  DynamicModule,
  Type,
  ForwardReference,
  Provider,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { CacheModule } from "@nestjs/cache-manager";
import { ModuleMetadata } from "@nestjs/common/interfaces";

// Import Parlant core services
import { ParlantIntegrationService } from "../services/parlant-integration.service";

// Import Parlant enhanced authentication services
import { ParlantEnhancedAuthService } from "../services/parlant-enhanced-auth.service";
import { ParlantMFAService } from "../services/parlant-mfa.service";

// Import Parlant enhanced guards
import { ParlantEnhancedRBACGuard } from "../guards/parlant-enhanced-rbac.guard";
import { RBACAuthorizationGuard } from "../guards/rbac-authorization.guard";

// Import Parlant enhanced middleware
import { ParlantEnhancedAuthMiddleware } from "../middleware/parlant-enhanced-auth.middleware";

// Import other required services and guards
import { Reflector } from "@nestjs/core";

/**
 * Configuration options for Parlant Authentication Module
 */
export interface ParlantAuthModuleOptions {
  /** Whether to enable conversational authentication */
  enableConversationalAuth?: boolean;

  /** Whether to enable conversational authorization */
  enableConversationalAuthz?: boolean;

  /** Whether to enable conversational MFA */
  enableConversationalMFA?: boolean;

  /** Risk assessment configuration */
  riskAssessment?: {
    /** Enable risk-based authentication */
    enabled?: boolean;

    /** Risk thresholds */
    thresholds?: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
  };

  /** MFA configuration */
  mfa?: {
    /** Default challenge expiry in milliseconds */
    challengeExpiry?: number;

    /** Maximum attempts per challenge */
    maxAttempts?: number;

    /** Supported MFA methods */
    supportedMethods?: string[];
  };

  /** Conversation configuration */
  conversation?: {
    /** Default conversation timeout */
    timeout?: number;

    /** Cache TTL for conversation results */
    cacheTTL?: number;
  };

  /** Performance configuration */
  performance?: {
    /** Enable caching */
    caching?: boolean;

    /** Cache TTL in milliseconds */
    cacheTTL?: number;

    /** Target response time in milliseconds */
    targetResponseTime?: number;
  };

  /** Security configuration */
  security?: {
    /** JWT secret key */
    jwtSecret?: string;

    /** JWT expiration time */
    jwtExpiresIn?: string;

    /** Enable audit logging */
    auditLogging?: boolean;
  };

  /** Fallback configuration */
  fallback?: {
    /** Enable fallback to standard auth when Parlant unavailable */
    enabled?: boolean;

    /** Fallback timeout in milliseconds */
    timeout?: number;
  };
}

/**
 * Async configuration options for Parlant Authentication Module
 */
export interface ParlantAuthModuleAsyncOptions
  extends Pick<ModuleMetadata, "imports"> {
  /** Imports for dependency injection */
  imports?: Array<
    Type<unknown> | DynamicModule | Promise<DynamicModule> | ForwardReference
  >;

  /** Providers for dependency injection */
  providers?: Provider[];

  /** Factory function to create options */
  useFactory?: (
    ..._args: unknown[]
  ) => Promise<ParlantAuthModuleOptions> | ParlantAuthModuleOptions;

  /** Providers to inject into factory function */
  inject?: unknown[];
}

/**
 * Default configuration for Parlant Authentication Module
 */
const DEFAULT_OPTIONS: ParlantAuthModuleOptions = {
  enableConversationalAuth: true,
  enableConversationalAuthz: true,
  enableConversationalMFA: true,
  riskAssessment: {
    enabled: true,
    thresholds: {
      low: 25,
      medium: 50,
      high: 75,
      critical: 90,
    },
  },
  mfa: {
    challengeExpiry: 300000, // 5 minutes
    maxAttempts: 3,
    supportedMethods: ["sms", "email", "totp"],
  },
  conversation: {
    timeout: 30000, // 30 seconds
    cacheTTL: 300000, // 5 minutes
  },
  performance: {
    caching: true,
    cacheTTL: 300000, // 5 minutes
    targetResponseTime: 500, // 500ms
  },
  security: {
    jwtExpiresIn: "15m",
    auditLogging: true,
  },
  fallback: {
    enabled: true,
    timeout: 5000, // 5 seconds
  },
};

/**
 * Parlant Authentication & Authorization Module
 *
 * Provides comprehensive conversational AI-powered authentication and
 * authorization capabilities for NestJS applications.
 */
@Module({})
export class ParlantAuthModule {
  /**
   * Register module with synchronous configuration
   *
   * @param options - Configuration options
   * @returns DynamicModule - Configured module
   */
  static forRoot(options: ParlantAuthModuleOptions = {}): DynamicModule {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    return {
      module: ParlantAuthModule,
      imports: [
        // Configuration module for environment-based config
        ConfigModule.forFeature(() => ({
          parlantAuth: mergedOptions,
        })),

        // JWT module for token management
        JwtModule.register({
          secret:
            mergedOptions.security?.jwtSecret ||
            process.env.JWT_SECRET ||
            "default-secret",
          signOptions: {
            expiresIn: mergedOptions.security?.jwtExpiresIn || "15m",
          },
        }),

        // Cache module for performance optimization
        CacheModule.register({
          ttl: mergedOptions.performance?.cacheTTL || 300000, // 5 minutes
          max: 1000, // Maximum number of cached items
        }),
      ],
      providers: [
        // Configuration provider
        {
          provide: "PARLANT_AUTH_OPTIONS",
          useValue: mergedOptions,
        },

        // Core Parlant service
        ParlantIntegrationService,

        // Enhanced authentication services
        ParlantEnhancedAuthService,
        ParlantMFAService,

        // Enhanced guards
        ParlantEnhancedRBACGuard,
        RBACAuthorizationGuard,

        // Enhanced middleware
        ParlantEnhancedAuthMiddleware,

        // NestJS core services
        Reflector,

        // Configuration-based providers
        {
          provide: "PARLANT_RISK_THRESHOLDS",
          useFactory: (config: ConfigService) => {
            return (
              config.get("parlantAuth.riskAssessment.thresholds") ||
              mergedOptions.riskAssessment?.thresholds
            );
          },
          inject: [ConfigService],
        },

        {
          provide: "PARLANT_MFA_CONFIG",
          useFactory: (config: ConfigService) => {
            return config.get("parlantAuth.mfa") || mergedOptions.mfa;
          },
          inject: [ConfigService],
        },

        {
          provide: "PARLANT_CONVERSATION_CONFIG",
          useFactory: (config: ConfigService) => {
            return (
              config.get("parlantAuth.conversation") ||
              mergedOptions.conversation
            );
          },
          inject: [ConfigService],
        },
      ],
      exports: [
        // Export core services for use in consuming modules
        ParlantIntegrationService,
        ParlantEnhancedAuthService,
        ParlantMFAService,

        // Export guards for use in controllers
        ParlantEnhancedRBACGuard,
        RBACAuthorizationGuard,

        // Export middleware for application configuration
        ParlantEnhancedAuthMiddleware,

        // Export configuration providers
        "PARLANT_AUTH_OPTIONS",
        "PARLANT_RISK_THRESHOLDS",
        "PARLANT_MFA_CONFIG",
        "PARLANT_CONVERSATION_CONFIG",
      ],
      global: true, // Make module globally available
    };
  }

  /**
   * Register module with asynchronous configuration
   *
   * @param options - Async configuration options
   * @returns DynamicModule - Configured module
   */
  static forRootAsync(options: ParlantAuthModuleAsyncOptions): DynamicModule {
    return {
      module: ParlantAuthModule,
      imports: [
        // Include imports from options
        ...(options.imports || []),

        // Configuration module
        ConfigModule,

        // JWT module with async configuration
        JwtModule.registerAsync({
          imports: options.imports,
          useFactory: async (...args: unknown[]) => {
            const parlantOptions = options.useFactory
              ? await options.useFactory(...args)
              : {};
            const mergedOptions = { ...DEFAULT_OPTIONS, ...parlantOptions };

            return {
              secret:
                mergedOptions.security?.jwtSecret ||
                process.env.JWT_SECRET ||
                "default-secret",
              signOptions: {
                expiresIn: mergedOptions.security?.jwtExpiresIn || "15m",
              },
            };
          },
          inject: options.inject || [],
        }),

        // Cache module with async configuration
        CacheModule.registerAsync({
          imports: options.imports,
          useFactory: async (...args: unknown[]) => {
            const parlantOptions = options.useFactory
              ? await options.useFactory(...args)
              : {};
            const mergedOptions = { ...DEFAULT_OPTIONS, ...parlantOptions };

            return {
              ttl: mergedOptions.performance?.cacheTTL || 300000,
              max: 1000,
            };
          },
          inject: options.inject || [],
        }),
      ],
      providers: [
        // Async configuration providers
        ...(options.providers || ([] as Provider[])),

        // Options provider
        {
          provide: "PARLANT_AUTH_OPTIONS",
          useFactory: options.useFactory || (() => ({})),
          inject: options.inject || [],
        },

        // Core services
        ParlantIntegrationService,
        ParlantEnhancedAuthService,
        ParlantMFAService,
        ParlantEnhancedRBACGuard,
        RBACAuthorizationGuard,
        ParlantEnhancedAuthMiddleware,
        Reflector,

        // Dynamic configuration providers
        {
          provide: "PARLANT_RISK_THRESHOLDS",
          useFactory: async (...args: unknown[]) => {
            const parlantOptions = options.useFactory
              ? await options.useFactory(...args)
              : {};
            const mergedOptions = { ...DEFAULT_OPTIONS, ...parlantOptions };
            return mergedOptions.riskAssessment?.thresholds;
          },
          inject: options.inject || [],
        },

        {
          provide: "PARLANT_MFA_CONFIG",
          useFactory: async (...args: unknown[]) => {
            const parlantOptions = options.useFactory
              ? await options.useFactory(...args)
              : {};
            const mergedOptions = { ...DEFAULT_OPTIONS, ...parlantOptions };
            return mergedOptions.mfa;
          },
          inject: options.inject || [],
        },

        {
          provide: "PARLANT_CONVERSATION_CONFIG",
          useFactory: async (...args: unknown[]) => {
            const parlantOptions = options.useFactory
              ? await options.useFactory(...args)
              : {};
            const mergedOptions = { ...DEFAULT_OPTIONS, ...parlantOptions };
            return mergedOptions.conversation;
          },
          inject: options.inject || [],
        },
      ],
      exports: [
        ParlantIntegrationService,
        ParlantEnhancedAuthService,
        ParlantMFAService,
        ParlantEnhancedRBACGuard,
        RBACAuthorizationGuard,
        ParlantEnhancedAuthMiddleware,
        "PARLANT_AUTH_OPTIONS",
        "PARLANT_RISK_THRESHOLDS",
        "PARLANT_MFA_CONFIG",
        "PARLANT_CONVERSATION_CONFIG",
      ],
      global: true,
    };
  }

  /**
   * Create a feature module for specific authentication features
   *
   * @param features - Features to enable
   * @returns DynamicModule - Feature-specific module
   */
  static forFeature(features: {
    auth?: boolean;
    authz?: boolean;
    mfa?: boolean;
    riskAssessment?: boolean;
  }): DynamicModule {
    const providers: unknown[] = [];
    const exports: unknown[] = [];

    // Add services based on enabled features
    if (features.auth) {
      providers.push(ParlantEnhancedAuthService);
      exports.push(ParlantEnhancedAuthService);
    }

    if (features.authz) {
      providers.push(ParlantEnhancedRBACGuard);
      exports.push(ParlantEnhancedRBACGuard);
    }

    if (features.mfa) {
      providers.push(ParlantMFAService);
      exports.push(ParlantMFAService);
    }

    // Always include core service if any features are enabled
    if (Object.values(features).some(Boolean)) {
      providers.push(ParlantIntegrationService);
      exports.push(ParlantIntegrationService);
    }

    return {
      module: ParlantAuthModule,
      providers: providers as Provider[],
      exports: exports as Array<
        string | symbol | Type<unknown> | DynamicModule | Provider
      >,
    };
  }
}

/**
 * Utility function to create environment-based configuration
 *
 * @returns ParlantAuthModuleOptions - Environment-based configuration
 */
export function createEnvironmentConfig(): ParlantAuthModuleOptions {
  return {
    enableConversationalAuth: process.env.PARLANT_AUTH_ENABLED === "true",
    enableConversationalAuthz: process.env.PARLANT_AUTHZ_ENABLED === "true",
    enableConversationalMFA: process.env.PARLANT_MFA_ENABLED === "true",

    riskAssessment: {
      enabled: process.env.PARLANT_RISK_ASSESSMENT_ENABLED === "true",
      thresholds: {
        low: parseInt(process.env.PARLANT_RISK_LOW_THRESHOLD || "25"),
        medium: parseInt(process.env.PARLANT_RISK_MEDIUM_THRESHOLD || "50"),
        high: parseInt(process.env.PARLANT_RISK_HIGH_THRESHOLD || "75"),
        critical: parseInt(process.env.PARLANT_RISK_CRITICAL_THRESHOLD || "90"),
      },
    },

    mfa: {
      challengeExpiry: parseInt(
        process.env.PARLANT_MFA_CHALLENGE_EXPIRY || "300000",
      ),
      maxAttempts: parseInt(process.env.PARLANT_MFA_MAX_ATTEMPTS || "3"),
      supportedMethods: process.env.PARLANT_MFA_SUPPORTED_METHODS?.split(
        ",",
      ) || ["sms", "email", "totp"],
    },

    conversation: {
      timeout: parseInt(process.env.PARLANT_CONVERSATION_TIMEOUT || "30000"),
      cacheTTL: parseInt(
        process.env.PARLANT_CONVERSATION_CACHE_TTL || "300000",
      ),
    },

    performance: {
      caching: process.env.PARLANT_CACHING_ENABLED !== "false",
      cacheTTL: parseInt(process.env.PARLANT_CACHE_TTL || "300000"),
      targetResponseTime: parseInt(
        process.env.PARLANT_TARGET_RESPONSE_TIME || "500",
      ),
    },

    security: {
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
      auditLogging: process.env.PARLANT_AUDIT_LOGGING_ENABLED !== "false",
    },

    fallback: {
      enabled: process.env.PARLANT_FALLBACK_ENABLED !== "false",
      timeout: parseInt(process.env.PARLANT_FALLBACK_TIMEOUT || "5000"),
    },
  };
}

/**
 * Utility function to validate configuration
 *
 * @param options - Configuration options to validate
 * @throws Error - If configuration is invalid
 */
export function validateParlantAuthConfig(
  options: ParlantAuthModuleOptions,
): void {
  // Validate risk thresholds
  if (options.riskAssessment?.thresholds) {
    const thresholds = options.riskAssessment.thresholds;

    if (
      thresholds.low >= thresholds.medium ||
      thresholds.medium >= thresholds.high ||
      thresholds.high >= thresholds.critical
    ) {
      throw new Error(
        "Risk thresholds must be in ascending order: low < medium < high < critical",
      );
    }

    if (thresholds.critical > 100) {
      throw new Error("Critical risk threshold cannot exceed 100");
    }
  }

  // Validate MFA configuration
  if (options.mfa?.challengeExpiry && options.mfa.challengeExpiry < 30000) {
    throw new Error("MFA challenge expiry must be at least 30 seconds");
  }

  if (
    options.mfa?.maxAttempts &&
    (options.mfa.maxAttempts < 1 || options.mfa.maxAttempts > 10)
  ) {
    throw new Error("MFA max attempts must be between 1 and 10");
  }

  // Validate conversation timeout
  if (options.conversation?.timeout && options.conversation.timeout < 5000) {
    throw new Error("Conversation timeout must be at least 5 seconds");
  }

  // Validate performance configuration
  if (
    options.performance?.targetResponseTime &&
    options.performance.targetResponseTime < 100
  ) {
    throw new Error("Target response time must be at least 100ms");
  }
}
