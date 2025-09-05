/**
 * C/ua Framework Integration Service
 *
 * Core service providing C/ua framework integration, lifecycle management,
 * and coordination between containerized environment and native macOS services.
 *
 * Features:
 * - Framework initialization and configuration
 * - Hybrid architecture coordination
 * - Performance monitoring integration
 * - Service health management
 *
 * @author Claude Code
 * @version 1.0.0
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Error Handler Utility for safe error processing
 * Provides type-safe error message extraction and stack trace handling
 */
export class ErrorHandler {
  /**
   * Safely extract error message from unknown error types
   * @param error - Unknown error object
   * @returns Safe error message string
   */
  static extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      const errorObj = error as { message: unknown };
      return typeof errorObj.message === 'string'
        ? errorObj.message
        : JSON.stringify(error);
    }
    return typeof error === 'string' ? error : JSON.stringify(error);
  }

  /**
   * Safely extract stack trace from unknown error types
   * @param error - Unknown error object
   * @returns Stack trace string or undefined
   */
  static extractErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) {
      return error.stack;
    }
    if (error && typeof error === 'object' && 'stack' in error) {
      const errorObj = error as { stack: unknown };
      return typeof errorObj.stack === 'string' ? errorObj.stack : undefined;
    }
    return undefined;
  }
}

/**
 * C/ua Framework Status Interface
 */
export interface CuaFrameworkStatus {
  enabled: boolean;
  containerId: string;
  version: string;
  performanceMode: string;
  servicesRunning: string[];
  lastHealthCheck: Date;
  aneBridgeStatus: 'connected' | 'fallback' | 'disabled' | 'error';
  hybridArchitectureActive: boolean;
}

/**
 * C/ua Integration Configuration Interface
 */
export interface CuaIntegrationConfig {
  framework: {
    enabled: boolean;
    containerId: string;
    version: string;
    performanceMode: string;
    logLevel: string;
  };
  aneBridge: {
    enabled: boolean;
    host: string;
    port: number;
    baseUrl: string;
    fallbackEnabled: boolean;
    timeoutMs: number;
  };
  monitoring: {
    enabled: boolean;
    metricsCollection: boolean;
  };
  hybrid: {
    nativeBridgeEnabled: boolean;
    sharedVolumePath: string;
  };
}

@Injectable()
export class CuaIntegrationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CuaIntegrationService.name);
  private readonly config: CuaIntegrationConfig;
  private frameworkStatus: CuaFrameworkStatus;
  private healthCheckInterval!: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    // Initialize configuration from ConfigService
    this.config = this.configService.get<CuaIntegrationConfig>('cua') || {
      framework: {
        enabled: false,
        containerId: 'unknown',
        version: '1.0.0',
        performanceMode: 'standard',
        logLevel: 'info',
      },
      aneBridge: {
        enabled: false,
        host: 'localhost',
        port: 8080,
        baseUrl: 'http://localhost:8080',
        fallbackEnabled: true,
        timeoutMs: 5000,
      },
      monitoring: { enabled: false, metricsCollection: false },
      hybrid: { nativeBridgeEnabled: false, sharedVolumePath: '/tmp' },
    };

    // Initialize framework status
    this.frameworkStatus = {
      enabled: this.config?.framework?.enabled || false,
      containerId: this.config?.framework?.containerId || 'unknown',
      version: this.config?.framework?.version || '1.0.0',
      performanceMode: this.config?.framework?.performanceMode || 'standard',
      servicesRunning: [],
      lastHealthCheck: new Date(),
      aneBridgeStatus: 'disabled',
      hybridArchitectureActive: false,
    };

    this.logger.log(
      `C/ua Integration Service initialized with config: ${JSON.stringify({
        enabled: this.frameworkStatus.enabled,
        containerId: this.frameworkStatus.containerId,
        aneBridge: this.config?.aneBridge?.enabled || false,
      })}`,
    );
  }

  /**
   * Module initialization - Set up C/ua framework integration
   */
  async onModuleInit() {
    this.logger.log('Initializing C/ua Framework Integration');

    if (!this.frameworkStatus.enabled) {
      this.logger.warn('C/ua Framework is disabled - skipping initialization');
      return;
    }

    try {
      // Initialize framework components
      await this.initializeFramework();

      // Test ANE bridge connectivity
      await this.testAneBridgeConnectivity();

      // Set up health monitoring
      this.startHealthMonitoring();

      // Update shared status
      await this.updateSharedStatus();

      this.logger.log('C/ua Framework Integration initialized successfully');
    } catch (error) {
      const errorMessage = ErrorHandler.extractErrorMessage(error);
      const errorStack = ErrorHandler.extractErrorStack(error);

      this.logger.error(
        `Failed to initialize C/ua Framework: ${errorMessage}`,
        errorStack,
      );

      // Set error status but don't fail the service
      this.frameworkStatus.aneBridgeStatus = 'error';
    }
  }

  /**
   * Module cleanup - Graceful shutdown of C/ua components
   */
  async onModuleDestroy() {
    this.logger.log('Shutting down C/ua Framework Integration');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Update shared status to indicate shutdown
    try {
      await this.updateSharedStatus('shutting_down');
    } catch (error) {
      const errorMessage = ErrorHandler.extractErrorMessage(error);
      this.logger.warn(`Failed to update shutdown status: ${errorMessage}`);
    }

    this.logger.log('C/ua Framework Integration shut down complete');
  }

  /**
   * Get current C/ua framework status
   */
  getFrameworkStatus(): CuaFrameworkStatus {
    return { ...this.frameworkStatus };
  }

  /**
   * Check if C/ua framework is enabled and operational
   */
  isFrameworkEnabled(): boolean {
    return (
      this.frameworkStatus.enabled &&
      this.frameworkStatus.servicesRunning.length > 0
    );
  }

  /**
   * Check if Apple Neural Engine bridge is available
   */
  isAneBridgeAvailable(): boolean {
    return this.frameworkStatus.aneBridgeStatus === 'connected';
  }

  /**
   * Test connectivity to a service endpoint
   */
  async testServiceConnectivity(
    serviceName: string,
    url: string,
    timeoutMs: number = 5000,
  ): Promise<boolean> {
    this.logger.debug(`Testing connectivity to ${serviceName} at ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: timeoutMs,
          validateStatus: (status) => status < 500, // Accept 4xx as \"connected\"
        }),
      );

      this.logger.debug(
        `✓ ${serviceName} is accessible (status: ${response.status})`,
      );
      return true;
    } catch (error) {
      const errorMessage = ErrorHandler.extractErrorMessage(error);
      this.logger.debug(`✗ ${serviceName} is not accessible: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Get configuration for external services
   */
  getConfiguration(): CuaIntegrationConfig {
    return { ...this.config };
  }

  // === Private Methods ===

  /**
   * Initialize C/ua framework components
   */
  private async initializeFramework(): Promise<void> {
    this.logger.log('Initializing C/ua framework components');

    // Test essential services
    const services = [
      { name: 'CUA_Agent_API', url: 'http://localhost:9993/api/v1/health' },
      { name: 'WebSocket_Server', url: 'http://localhost:9996/health' },
    ];

    const runningServices: string[] = [];

    for (const service of services) {
      const isRunning = await this.testServiceConnectivity(
        service.name,
        service.url,
        3000,
      );
      if (isRunning) {
        runningServices.push(service.name);
      }
    }

    this.frameworkStatus.servicesRunning = runningServices;
    this.frameworkStatus.hybridArchitectureActive =
      this.config.hybrid.nativeBridgeEnabled;

    this.logger.log(
      `Framework services status: ${runningServices.join(', ')} (${runningServices.length} running)`,
    );
  }

  /**
   * Test Apple Neural Engine bridge connectivity
   */
  private async testAneBridgeConnectivity(): Promise<void> {
    if (!this.config.aneBridge.enabled) {
      this.frameworkStatus.aneBridgeStatus = 'disabled';
      return;
    }

    this.logger.log('Testing Apple Neural Engine bridge connectivity');

    const bridgeHealthUrl = `${this.config.aneBridge.baseUrl}/health`;
    const isConnected = await this.testServiceConnectivity(
      'ANE_Bridge',
      bridgeHealthUrl,
      this.config.aneBridge.timeoutMs,
    );

    if (isConnected) {
      this.frameworkStatus.aneBridgeStatus = 'connected';
      this.logger.log('✓ Apple Neural Engine bridge is connected');
    } else if (this.config.aneBridge.fallbackEnabled) {
      this.frameworkStatus.aneBridgeStatus = 'fallback';
      this.logger.warn('⚠ ANE bridge unavailable - using fallback mode');
    } else {
      this.frameworkStatus.aneBridgeStatus = 'error';
      this.logger.error('✗ ANE bridge unavailable and fallback disabled');
    }
  }

  /**
   * Start health monitoring for C/ua services
   */
  private startHealthMonitoring(): void {
    if (!this.config.monitoring.enabled) {
      this.logger.log('Health monitoring is disabled');
      return;
    }

    this.logger.log('Starting C/ua health monitoring');

    // Health check every 60 seconds
    this.healthCheckInterval = setInterval(() => {
      void (async (): Promise<void> => {
        try {
          await this.performHealthCheck();
        } catch (error) {
          const errorMessage = ErrorHandler.extractErrorMessage(error);
          this.logger.warn(`Health check failed: ${errorMessage}`);
        }
      })();
    }, 60000);
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    this.logger.debug('Performing C/ua health check');

    // Update last health check time
    this.frameworkStatus.lastHealthCheck = new Date();

    // Re-test ANE bridge if it was in error state
    if (
      this.frameworkStatus.aneBridgeStatus === 'error' &&
      this.config.aneBridge.enabled
    ) {
      await this.testAneBridgeConnectivity();
    }

    // Update shared status
    await this.updateSharedStatus();

    this.logger.debug(
      `Health check completed - ANE bridge: ${this.frameworkStatus.aneBridgeStatus}`,
    );
  }

  /**
   * Update shared status file for inter-service communication
   */
  private async updateSharedStatus(
    status: string = 'operational',
  ): Promise<void> {
    if (!this.config.hybrid.sharedVolumePath) {
      return;
    }

    try {
      const statusData = {
        timestamp: new Date().toISOString(),
        service: 'bytebotd-cua-integration',
        status: status,
        framework: {
          enabled: this.frameworkStatus.enabled,
          containerId: this.frameworkStatus.containerId,
          version: this.frameworkStatus.version,
          servicesRunning: this.frameworkStatus.servicesRunning,
          aneBridgeStatus: this.frameworkStatus.aneBridgeStatus,
          hybridArchitectureActive:
            this.frameworkStatus.hybridArchitectureActive,
        },
        lastHealthCheck: this.frameworkStatus.lastHealthCheck.toISOString(),
      };

      const statusPath = path.join(
        this.config.hybrid.sharedVolumePath,
        'bytebotd-status.json',
      );
      await fs.writeFile(statusPath, JSON.stringify(statusData, null, 2));
    } catch (error) {
      const errorMessage = ErrorHandler.extractErrorMessage(error);
      this.logger.debug(`Failed to update shared status: ${errorMessage}`);
    }
  }
}
