/**
 * PARLANT Validation Module
 *
 * NestJS module that configures and provides all components of the PARLANT
 * validation integration layer. This module exports all services, configuration,
 * and dependencies needed for conversational database function validation.
 *
 * Features:
 * - Complete service registration and dependency injection
 * - Environment-based configuration
 * - Health checks and monitoring integration
 * - Graceful shutdown handling
 * - Performance optimization and caching
 *
 * @module ParlantValidationModule
 * @version 1.0.0
 * @author AIgent Integration Team
 */

import { Module, Logger, OnApplicationShutdown } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { HealthCheckService, TerminusModule } from "@nestjs/terminus";

// Core services
import { ParlantValidationBridge } from "./parlant-validation-bridge.service";
import { ParlantWebSocketClient } from "./websocket/parlant-websocket-client.service";
import { ParlantWebSocketManager } from "./websocket/parlant-websocket-manager.service";
import { ConversationContextBuilder } from "./context/conversation-context-builder.service";

// Configuration
import { ValidationLayerConfigService } from "./config/validation-layer.config";

// Health check
import { ParlantValidationHealthIndicator } from "./health/parlant-validation-health.indicator";

// ===== MODULE CONFIGURATION =====

@Module({
  imports: [ConfigModule, TerminusModule],
  providers: [
    // Configuration
    ValidationLayerConfigService,

    // Core services
    ParlantValidationBridge,
    ParlantWebSocketManager,
    ParlantWebSocketClient,
    ConversationContextBuilder,

    // Health monitoring
    ParlantValidationHealthIndicator,

    // Factory for configuration-based service initialization
    {
      provide: "PARLANT_VALIDATION_CONFIG",
      useFactory: (configService: ValidationLayerConfigService) => {
        return configService.getConfig();
      },
      inject: [ValidationLayerConfigService],
    },

    // Factory for conditional service activation
    {
      provide: "PARLANT_VALIDATION_ENABLED",
      useFactory: (configService: ValidationLayerConfigService) => {
        return configService.isValidationEnabled();
      },
      inject: [ValidationLayerConfigService],
    },
  ],
  exports: [
    // Main service for external use
    ParlantValidationBridge,

    // Configuration for external modules
    ValidationLayerConfigService,

    // WebSocket services for advanced use cases
    ParlantWebSocketManager,
    ParlantWebSocketClient,

    // Context builder for custom implementations
    ConversationContextBuilder,

    // Health indicator for monitoring
    ParlantValidationHealthIndicator,

    // Configuration constants
    "PARLANT_VALIDATION_CONFIG",
    "PARLANT_VALIDATION_ENABLED",
  ],
})
export class ParlantValidationModule implements OnApplicationShutdown {
  private readonly logger = new Logger(ParlantValidationModule.name);

  constructor(
    private readonly configService: ValidationLayerConfigService,
    private readonly validationBridge: ParlantValidationBridge,
    private readonly webSocketManager: ParlantWebSocketManager,
  ) {
    this.initializeModule();
  }

  /**
   * Initialize the module
   */
  private async initializeModule(): Promise<void> {
    try {
      this.logger.log("Initializing PARLANT Validation Module");

      // Validate configuration
      const configValidation = this.configService.validateConfiguration();
      if (!configValidation.valid) {
        this.logger.error("Configuration validation failed", {
          errors: configValidation.errors,
        });
        throw new Error(
          `Configuration validation failed: ${configValidation.errors.join(", ")}`,
        );
      }

      // Check if validation is enabled
      if (!this.configService.isValidationEnabled()) {
        this.logger.warn("PARLANT validation is disabled in configuration");
        return;
      }

      // Initialize validation bridge
      await this.validationBridge.initialize();

      this.logger.log("PARLANT Validation Module initialized successfully", {
        caching: this.configService.isCachingEnabled(),
        bypass: this.configService.isBypassEnabled(),
        websocketServers:
          this.configService.getWebSocketConfig().serverUrls.length,
      });
    } catch (error) {
      this.logger.error("Failed to initialize PARLANT Validation Module", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Application shutdown handler
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(
      `Shutting down PARLANT Validation Module (signal: ${signal})`,
    );

    try {
      // Graceful shutdown with timeout
      const shutdownPromises = [
        this.validationBridge.onApplicationShutdown(),
        this.webSocketManager.onApplicationShutdown(),
      ];

      // Wait for all services to shut down with timeout
      await Promise.race([
        Promise.all(shutdownPromises),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Shutdown timeout")), 30000),
        ),
      ]);

      this.logger.log("PARLANT Validation Module shutdown complete");
    } catch (error) {
      this.logger.error("Error during module shutdown", {
        error: (error as Error).message,
      });
    }
  }
}

// ===== ASYNC MODULE FACTORY =====

/**
 * Factory for creating ParlantValidationModule with async configuration
 */
export class ParlantValidationModuleFactory {
  static forRoot(options?: ParlantValidationModuleOptions): DynamicModule {
    return {
      module: ParlantValidationModule,
      imports: [ConfigModule.forRoot(options?.configOptions), TerminusModule],
      providers: [
        ValidationLayerConfigService,
        ParlantValidationBridge,
        ParlantWebSocketManager,
        ParlantWebSocketClient,
        ConversationContextBuilder,
        ParlantValidationHealthIndicator,
        {
          provide: "PARLANT_VALIDATION_OPTIONS",
          useValue: options || {},
        },
      ],
      exports: [
        ParlantValidationBridge,
        ValidationLayerConfigService,
        ParlantWebSocketManager,
        ParlantWebSocketClient,
        ConversationContextBuilder,
        ParlantValidationHealthIndicator,
      ],
      global: options?.global || false,
    };
  }

  static forRootAsync(
    options: ParlantValidationModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: ParlantValidationModule,
      imports: [
        ConfigModule.forRoot(),
        TerminusModule,
        ...(options.imports || []),
      ],
      providers: [
        ...this.createAsyncProviders(options),
        ValidationLayerConfigService,
        ParlantValidationBridge,
        ParlantWebSocketManager,
        ParlantWebSocketClient,
        ConversationContextBuilder,
        ParlantValidationHealthIndicator,
      ],
      exports: [
        ParlantValidationBridge,
        ValidationLayerConfigService,
        ParlantWebSocketManager,
        ParlantWebSocketClient,
        ConversationContextBuilder,
        ParlantValidationHealthIndicator,
      ],
      global: options.global || false,
    };
  }

  private static createAsyncProviders(
    options: ParlantValidationModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: "PARLANT_VALIDATION_OPTIONS",
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }

    if (options.useClass) {
      return [
        {
          provide: "PARLANT_VALIDATION_OPTIONS",
          useClass: options.useClass,
        },
      ];
    }

    if (options.useExisting) {
      return [
        {
          provide: "PARLANT_VALIDATION_OPTIONS",
          useExisting: options.useExisting,
        },
      ];
    }

    return [];
  }
}

// ===== MODULE OPTIONS INTERFACES =====

interface ParlantValidationModuleOptions {
  /** Make module global */
  global?: boolean;
  /** Configuration module options */
  configOptions?: any;
  /** Custom configuration overrides */
  configOverrides?: Partial<ValidationLayerConfig>;
  /** Enable development mode features */
  developmentMode?: boolean;
}

interface ParlantValidationModuleAsyncOptions {
  /** Make module global */
  global?: boolean;
  /** Modules to import */
  imports?: any[];
  /** Factory function for options */
  useFactory?: (
    ...args: any[]
  ) => Promise<ParlantValidationModuleOptions> | ParlantValidationModuleOptions;
  /** Dependencies to inject into factory */
  inject?: any[];
  /** Class to use for options */
  useClass?: Type<ParlantValidationModuleOptions>;
  /** Existing provider to use for options */
  useExisting?: string | symbol | Type<any>;
}

// ===== TYPE IMPORTS =====

import { DynamicModule, Provider, Type } from "@nestjs/common";
import { ValidationLayerConfig } from "./config/validation-layer.config";
