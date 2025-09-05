/**
 * C/ua Framework Integration Module
 *
 * This module provides integration between Bytebot's NestJS services and the C/ua framework,
 * including Apple Neural Engine bridge communication and enhanced computer vision capabilities.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Module, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CuaIntegrationService } from './cua-integration.service';
import { CuaVisionService } from './cua-vision.service';
import { CuaPerformanceService } from './cua-performance.service';
import { CuaBridgeService } from './cua-bridge.service';
import { CuaIntegrationController } from './cua-integration.controller';

/**
 * Configuration factory for C/ua integration settings
 * Loads configuration from environment variables and container metadata
 */
const cuaConfigFactory = () => {
  const logger = new Logger('CuaConfigFactory');

  const config = {
    // === Framework Configuration ===
    framework: {
      enabled: process.env.CUA_FRAMEWORK_ENABLED === 'true',
      containerId: process.env.CUA_CONTAINER_ID || 'bytebot-desktop-cua',
      version: process.env.CUA_VERSION || '1.0.0',
      performanceMode: process.env.CUA_PERFORMANCE_MODE || 'optimized',
      logLevel: process.env.CUA_LOG_LEVEL || 'info',
    },

    // === Apple Neural Engine Bridge ===
    aneBridge: {
      enabled: process.env.ANE_BRIDGE_ENABLED === 'true',
      host: process.env.ANE_BRIDGE_HOST || 'host.docker.internal',
      port: parseInt(process.env.ANE_BRIDGE_PORT || '8080', 10),
      baseUrl: `http://${process.env.ANE_BRIDGE_HOST || 'host.docker.internal'}:${process.env.ANE_BRIDGE_PORT || '8080'}`,
      fallbackEnabled: process.env.ANE_FALLBACK_ENABLED === 'true',
      cacheEnabled: process.env.ANE_CACHE_ENABLED === 'true',
      batchSize: parseInt(process.env.ANE_BATCH_SIZE || '10', 10),
      timeoutMs: parseInt(process.env.ANE_TIMEOUT_MS || '5000', 10),
    },

    // === Performance Monitoring ===
    monitoring: {
      enabled: process.env.PERFORMANCE_MONITORING === 'enabled',
      metricsCollection: process.env.METRICS_COLLECTION === 'enabled',
      resourceLimitsEnabled: process.env.RESOURCE_LIMITS_ENABLED === 'true',
      memoryOptimization: process.env.MEMORY_OPTIMIZATION === 'enabled',
    },

    // === Hybrid Architecture ===
    hybrid: {
      nativeBridgeEnabled: process.env.NATIVE_BRIDGE_ENABLED === 'true',
      containerOrchestration: process.env.CONTAINER_ORCHESTRATION || 'cua',
      sharedVolumePath: process.env.CUA_SHARED_VOLUME || '/opt/cua/shared',
    },
  };

  logger.log(
    `C/ua integration configuration loaded: ${JSON.stringify({
      frameworkEnabled: config.framework.enabled,
      aneBridgeEnabled: config.aneBridge.enabled,
      performanceMonitoring: config.monitoring.enabled,
      nativeBridge: config.hybrid.nativeBridgeEnabled,
    })}`,
  );

  return { cua: config };
};

@Module({
  imports: [
    // HTTP module for ANE bridge communication
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),

    // Configuration module with C/ua settings
    ConfigModule.forRoot({
      load: [cuaConfigFactory],
      isGlobal: false,
      cache: true,
    }),
  ],

  controllers: [CuaIntegrationController],

  providers: [
    // Core C/ua Integration Service - handles framework initialization, lifecycle management, and coordination
    CuaIntegrationService,

    // C/ua Vision Service - provides enhanced computer vision capabilities via Apple Neural Engine
    CuaVisionService,

    // C/ua Performance Service - handles performance monitoring, metrics collection, and optimization
    CuaPerformanceService,

    // C/ua Bridge Service - manages communication with native macOS ANE bridge service
    CuaBridgeService,
  ],

  exports: [
    // Export services for use in other modules
    CuaIntegrationService,
    CuaVisionService,
    CuaPerformanceService,
    CuaBridgeService,
  ],
})
export class CuaIntegrationModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CuaIntegrationModule.name);

  constructor() {
    this.logger.log('C/ua Framework Integration Module initialized');
  }

  /**
   * Module initialization hook
   * Performs framework setup and validation
   */
  onModuleInit(): void {
    this.logger.log('Initializing C/ua Framework Integration Module');

    // Log integration status
    const frameworkEnabled = process.env.CUA_FRAMEWORK_ENABLED === 'true';
    const aneBridgeEnabled = process.env.ANE_BRIDGE_ENABLED === 'true';

    this.logger.log(
      `Framework Status - Enabled: ${frameworkEnabled}, ANE Bridge: ${aneBridgeEnabled}`,
    );

    if (!frameworkEnabled) {
      this.logger.warn(
        'C/ua Framework is disabled - running in compatibility mode',
      );
    }
  }

  /**
   * Module destruction hook
   * Performs cleanup and graceful shutdown
   */
  onModuleDestroy(): void {
    this.logger.log('Shutting down C/ua Framework Integration Module');
  }
}
