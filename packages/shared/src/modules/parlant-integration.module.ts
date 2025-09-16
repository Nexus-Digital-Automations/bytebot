/**
 * Parlant Integration Module
 *
 * Comprehensive NestJS module for Maximum Parlant Integration with AIgent ecosystem.
 * Provides function-level validation, authentication, caching, and WebSocket communication
 * across all 1,520+ functions with enterprise-grade performance and security.
 *
 * @module ParlantIntegrationModule
 * @version 1.0.0
 * @author AIgent Integration Team
 */

import { Module, DynamicModule, Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ParlantIntegrationService } from "../services/parlant-integration.service";
import { ParlantWebSocketBridgeService } from "../services/parlant-websocket-bridge.service";
import { ParlantAuthBridgeService } from "../services/parlant-auth-bridge.service";
import { ParlantCacheService } from "../services/parlant-cache.service";
import {
  ParlantServiceConfig,
  ParlantConfig,
  ParlantCacheConfig,
  ParlantWebSocketConfig,
  ParlantAuthConfig,
} from "../types/parlant-integration.types";

/**
 * Configuration options for Parlant Integration Module
 */
export interface ParlantIntegrationModuleOptions {
  /** Enable/disable Parlant integration globally */
  enabled?: boolean;

  /** Parlant connection configuration */
  connection?: Partial<ParlantConfig>;

  /** Caching configuration */
  cache?: Partial<ParlantCacheConfig>;

  /** WebSocket configuration */
  websocket?: Partial<ParlantWebSocketConfig>;

  /** Authentication configuration */
  authentication?: Partial<ParlantAuthConfig>;

  /** Custom configuration factory */
  configFactory?: () => ParlantServiceConfig | Promise<ParlantServiceConfig>;

  /** Import ConfigModule for environment-based configuration */
  useConfigModule?: boolean;

  /** Global decorator configuration */
  globalDecorators?: {
    enabled: boolean;
    defaultSecurityLevel?: string;
    autoWrapMethods?: boolean;
  };
}

/**
 * Async configuration options
 */
export interface ParlantIntegrationModuleAsyncOptions {
  /** Configuration factory function */
  useFactory?: (
    ...args: unknown[]
  ) =>
    | ParlantIntegrationModuleOptions
    | Promise<ParlantIntegrationModuleOptions>;

  /** Dependencies to inject into useFactory */
  inject?: unknown[];

  /** Imports for configuration dependencies */
  imports?: unknown[];

  /** Use existing provider */
  useExisting?: unknown;

  /** Use class for configuration */
  useClass?: unknown;
}

/**
 * Parlant Integration Module
 *
 * Revolutionary NestJS module that enables conversational AI control
 * over all AIgent functions through comprehensive Parlant integration.
 */
@Module({})
export class ParlantIntegrationModule {
  /**
   * Register Parlant Integration Module synchronously
   */
  static forRoot(options: ParlantIntegrationModuleOptions = {}): DynamicModule {
    const providers = this.createProviders(options);

    return {
      module: ParlantIntegrationModule,
      imports: options.useConfigModule ? [ConfigModule] : [],
      providers,
      exports: providers,
      global: true,
    };
  }

  /**
   * Register Parlant Integration Module asynchronously
   */
  static forRootAsync(
    options: ParlantIntegrationModuleAsyncOptions,
  ): DynamicModule {
    const providers = this.createAsyncProviders(options);

    return {
      module: ParlantIntegrationModule,
      imports: options.imports || [],
      providers,
      exports: [
        ParlantIntegrationService,
        ParlantWebSocketBridgeService,
        ParlantAuthBridgeService,
        ParlantCacheService,
        "PARLANT_CONFIG",
      ],
      global: true,
    };
  }

  /**
   * Register Parlant Integration Module for feature modules
   */
  static forFeature(
    options: Partial<ParlantIntegrationModuleOptions> = {},
  ): DynamicModule {
    const providers = this.createFeatureProviders(options);

    return {
      module: ParlantIntegrationModule,
      providers,
      exports: providers,
    };
  }

  /**
   * Create providers for synchronous registration
   */
  private static createProviders(
    options: ParlantIntegrationModuleOptions,
  ): Provider[] {
    const configProvider: Provider = {
      provide: "PARLANT_CONFIG",
      useFactory: () => this.createConfiguration(options),
    };

    const integrationServiceProvider: Provider = {
      provide: ParlantIntegrationService,
      useFactory: (config: ParlantServiceConfig) => {
        const service = new ParlantIntegrationService();
        (service as any).config = config;
        return service;
      },
      inject: ["PARLANT_CONFIG"],
    };

    const providers: Provider[] = [
      configProvider,
      integrationServiceProvider,
      ParlantWebSocketBridgeService,
      ParlantAuthBridgeService,
      ParlantCacheService,
    ];

    // Add global decorator configuration if enabled
    if (options.globalDecorators?.enabled) {
      providers.push({
        provide: "PARLANT_GLOBAL_DECORATORS",
        useValue: options.globalDecorators,
      });
    }

    return providers;
  }

  /**
   * Create providers for asynchronous registration
   */
  private static createAsyncProviders(
    options: ParlantIntegrationModuleAsyncOptions,
  ): Provider[] {
    const configProvider = this.createAsyncConfigProvider(options);

    const integrationServiceProvider: Provider = {
      provide: ParlantIntegrationService,
      useFactory: (config: ParlantServiceConfig) => {
        const service = new ParlantIntegrationService();
        (service as any).config = config;
        return service;
      },
      inject: ["PARLANT_CONFIG"],
    };

    return [
      configProvider,
      integrationServiceProvider,
      ParlantWebSocketBridgeService,
      ParlantAuthBridgeService,
      ParlantCacheService,
    ];
  }

  /**
   * Create providers for feature modules
   */
  private static createFeatureProviders(
    options: Partial<ParlantIntegrationModuleOptions>,
  ): Provider[] {
    // Feature modules get lightweight providers that use existing services
    return [
      {
        provide: "PARLANT_FEATURE_CONFIG",
        useValue: options,
      },
    ];
  }

  /**
   * Create async configuration provider
   */
  private static createAsyncConfigProvider(
    options: ParlantIntegrationModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: "PARLANT_CONFIG",
        useFactory: async (...args: unknown[]) => {
          const moduleOptions = await options.useFactory!(...args);
          return this.createConfiguration(moduleOptions);
        },
        inject: options.inject || [],
      };
    }

    if (options.useClass) {
      return {
        provide: "PARLANT_CONFIG",
        useFactory: async (configService: unknown) => {
          const moduleOptions = await configService.createParlantConfig();
          return this.createConfiguration(moduleOptions);
        },
        inject: [options.useClass],
      };
    }

    if (options.useExisting) {
      return {
        provide: "PARLANT_CONFIG",
        useFactory: async (configService: unknown) => {
          const moduleOptions = await configService.createParlantConfig();
          return this.createConfiguration(moduleOptions);
        },
        inject: [options.useExisting],
      };
    }

    // Fallback to environment-based configuration
    return {
      provide: "PARLANT_CONFIG",
      useFactory: (configService: ConfigService) => {
        const moduleOptions: ParlantIntegrationModuleOptions = {
          enabled: configService.get("PARLANT_ENABLED", "true") === "true",
          connection: {
            baseUrl: configService.get(
              "PARLANT_API_URL",
              "http://localhost:8000",
            ),
            websocketUrl: configService.get(
              "PARLANT_WS_URL",
              "ws://localhost:8000/ws",
            ),
            apiKey: configService.get("PARLANT_API_KEY", ""),
            sessionTimeout: parseInt(
              configService.get("PARLANT_SESSION_TIMEOUT", "300000"),
            ),
            maxRetries: parseInt(configService.get("PARLANT_MAX_RETRIES", "3")),
            cacheTtl: parseInt(
              configService.get("PARLANT_CACHE_TTL", "3600000"),
            ),
            debugMode: configService.get("NODE_ENV") === "development",
          },
        };

        return this.createConfiguration(moduleOptions);
      },
      inject: [ConfigService],
    };
  }

  /**
   * Create complete configuration object
   */
  private static createConfiguration(
    options: ParlantIntegrationModuleOptions,
  ): ParlantServiceConfig {
    const defaultConfig: ParlantServiceConfig = {
      connection: {
        baseUrl: process.env.PARLANT_API_URL || "http://localhost:8000",
        websocketUrl: process.env.PARLANT_WS_URL || "ws://localhost:8000/ws",
        apiKey: process.env.PARLANT_API_KEY || "",
        sessionTimeout: parseInt(
          process.env.PARLANT_SESSION_TIMEOUT || "300000",
        ),
        maxRetries: parseInt(process.env.PARLANT_MAX_RETRIES || "3"),
        cacheTtl: parseInt(process.env.PARLANT_CACHE_TTL || "3600000"),
        debugMode: process.env.NODE_ENV === "development",
      },
      wrapper: {
        enabled: options.enabled !== false,
        securityLevel: "medium" as any,
        cacheable: true,
        cacheTtl: 3600000,
        timeout: 5000,
        retryConfig: {
          maxAttempts: 3,
          baseDelay: 1000,
          backoffMultiplier: 2,
          maxDelay: 10000,
        },
      },
      cache: {
        enabled: true,
        type: "hybrid",
        defaultTtl: 3600000,
        maxSize: 10000,
        evictionPolicy: "lru",
        ...options.cache,
      },
      websocket: {
        enabled: true,
        reconnectAttempts: 5,
        heartbeatInterval: 30000,
        connectionTimeout: 10000,
        ...options.websocket,
      },
      authentication: {
        jwtSecret: process.env.JWT_SECRET || "default-secret",
        tokenExpiration: "1h",
        refreshTokenEnabled: true,
        sessionDuration: 3600000,
        ...options.authentication,
      },
      monitoring: {
        realTimeMonitoring: true,
        logAllOperations: true,
        alertOnViolations: true,
        auditTrail: true,
      },
    };

    // Merge user configuration
    if (options.connection) {
      defaultConfig.connection = {
        ...defaultConfig.connection,
        ...options.connection,
      };
    }

    // Apply custom configuration factory if provided
    if (options.configFactory) {
      const customConfig = options.configFactory();
      if (customConfig instanceof Promise) {
        throw new Error(
          "Synchronous registration cannot use async config factory. Use forRootAsync instead.",
        );
      }
      return { ...defaultConfig, ...customConfig };
    }

    return defaultConfig;
  }
}

/**
 * Configuration factory for common deployment scenarios
 */
export class ParlantConfigFactory {
  /**
   * Development configuration
   */
  static forDevelopment(): ParlantIntegrationModuleOptions {
    return {
      enabled: true,
      connection: {
        baseUrl: "http://localhost:8000",
        websocketUrl: "ws://localhost:8000/ws",
        debugMode: true,
      },
      cache: {
        enabled: true,
        type: "memory",
        maxSize: 1000,
      },
      websocket: {
        enabled: true,
        reconnectAttempts: 3,
      },
      globalDecorators: {
        enabled: true,
        defaultSecurityLevel: "low",
        autoWrapMethods: true,
      },
    };
  }

  /**
   * Production configuration
   */
  static forProduction(): ParlantIntegrationModuleOptions {
    return {
      enabled: true,
      connection: {
        debugMode: false,
      },
      cache: {
        enabled: true,
        type: "hybrid",
        maxSize: 50000,
      },
      websocket: {
        enabled: true,
        reconnectAttempts: 10,
      },
      authentication: {
        refreshTokenEnabled: true,
        sessionDuration: 7200000, // 2 hours
      },
      globalDecorators: {
        enabled: true,
        defaultSecurityLevel: "high",
        autoWrapMethods: false, // Manual control in production
      },
    };
  }

  /**
   * Testing configuration
   */
  static forTesting(): ParlantIntegrationModuleOptions {
    return {
      enabled: false, // Disabled by default for tests
      connection: {
        debugMode: true,
      },
      cache: {
        enabled: false,
      },
      websocket: {
        enabled: false,
      },
      globalDecorators: {
        enabled: false,
      },
    };
  }

  /**
   * High-security configuration
   */
  static forHighSecurity(): ParlantIntegrationModuleOptions {
    return {
      enabled: true,
      connection: {
        sessionTimeout: 900000, // 15 minutes
        maxRetries: 1,
      },
      cache: {
        enabled: true,
        type: "memory", // No persistent cache for security
        maxSize: 1000,
        defaultTtl: 300000, // 5 minutes
      },
      websocket: {
        enabled: true,
        heartbeatInterval: 15000, // More frequent heartbeats
      },
      authentication: {
        tokenExpiration: "15m",
        sessionDuration: 900000, // 15 minutes
        refreshTokenEnabled: false,
      },
      globalDecorators: {
        enabled: true,
        defaultSecurityLevel: "critical",
        autoWrapMethods: true,
      },
    };
  }

  /**
   * Performance-optimized configuration
   */
  static forPerformance(): ParlantIntegrationModuleOptions {
    return {
      enabled: true,
      cache: {
        enabled: true,
        type: "hybrid",
        maxSize: 100000,
        defaultTtl: 7200000, // 2 hours
        evictionPolicy: "lru",
      },
      websocket: {
        enabled: true,
        reconnectAttempts: 5,
        heartbeatInterval: 60000,
      },
      authentication: {
        sessionDuration: 14400000, // 4 hours
        refreshTokenEnabled: true,
      },
      globalDecorators: {
        enabled: true,
        defaultSecurityLevel: "medium",
        autoWrapMethods: true,
      },
    };
  }
}

/**
 * Decorator for marking services as Parlant-enabled
 */
export function ParlantEnabled(options?: {
  autoValidate?: boolean;
  securityLevel?: string;
  cacheResponses?: boolean;
}) {
  return function <T extends { new (...args: unknown[]): Record<string, unknown> }>(constructor: T) {
    return class extends constructor {
      constructor(...args: unknown[]) {
        super(...args);

        // Mark as Parlant-enabled for automatic function wrapping
        Object.defineProperty(this, "__parlantEnabled", {
          value: true,
          enumerable: false,
          writable: false,
        });

        Object.defineProperty(this, "__parlantOptions", {
          value: options || {},
          enumerable: false,
          writable: false,
        });
      }
    };
  };
}

/**
 * Injectable token for Parlant configuration
 */
export const PARLANT_CONFIG = "PARLANT_CONFIG";

/**
 * Injectable token for Parlant feature configuration
 */
export const PARLANT_FEATURE_CONFIG = "PARLANT_FEATURE_CONFIG";

/**
 * Injectable token for global decorator configuration
 */
export const PARLANT_GLOBAL_DECORATORS = "PARLANT_GLOBAL_DECORATORS";
