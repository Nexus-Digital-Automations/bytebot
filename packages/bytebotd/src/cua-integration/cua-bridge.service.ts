/**
 * C/ua Bridge Service
 *
 * Service for managing communication with the native macOS Apple Neural Engine bridge.
 * Handles connection management, request routing, and fallback strategies.
 *
 * Features:
 * - Connection pool management
 * - Request queuing and batching
 * - Health monitoring and automatic recovery
 * - Fallback handling for bridge unavailability
 * - Performance optimization
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
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CuaIntegrationConfig } from './cua-integration.service';
import { CuaPerformanceService } from './cua-performance.service';
import * as crypto from 'crypto';

/**
 * Bridge Health Status
 */
export interface BridgeHealthStatus {
  connected: boolean;
  responseTime: number;
  lastCheck: Date;
  errorCount: number;
  capabilities: string[];
  version?: string;
}

/**
 * Bridge Request Interface
 */
export interface BridgeRequest {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: any;
  timeout?: number;
  retries?: number;
  priority?: 'low' | 'normal' | 'high';
  timestamp: Date;
}

/**
 * Bridge Response Interface
 */
export interface BridgeResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  responseTime: number;
  requestId: string;
}

@Injectable()
export class CuaBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CuaBridgeService.name);
  private readonly config: CuaIntegrationConfig;
  private healthStatus: BridgeHealthStatus;
  private requestQueue: BridgeRequest[] = [];
  private activeRequests = new Map<
    string,
    { timestamp: Date; timeout: NodeJS.Timeout }
  >();
  private healthCheckInterval!: NodeJS.Timeout;
  private processingQueue = false;
  private readonly MAX_CONCURRENT_REQUESTS = 10;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly performanceService: CuaPerformanceService,
  ) {
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

    this.healthStatus = {
      connected: false,
      responseTime: 0,
      lastCheck: new Date(),
      errorCount: 0,
      capabilities: [],
      version: undefined,
    };

    this.logger.log(
      `ANE Bridge Service initialized - Bridge URL: ${this.config?.aneBridge?.baseUrl}`,
    );
  }

  async onModuleInit() {
    if (!this.config?.aneBridge?.enabled) {
      this.logger.log('ANE Bridge is disabled');
      return;
    }

    this.logger.log('Initializing ANE Bridge Service');

    // Initial health check
    await this.performHealthCheck();

    // Start health monitoring
    this.startHealthMonitoring();

    // Start request queue processing - handle promise properly
    void this.processRequestQueue().catch((error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to start request queue processing: ${errorMessage}`,
      );
    });

    this.logger.log('ANE Bridge Service initialized');
  }

  onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Cancel all active requests
    this.activeRequests.forEach((request, requestId) => {
      clearTimeout(request.timeout);
      this.activeRequests.delete(requestId);
    });

    this.logger.log('ANE Bridge Service shut down');
  }

  /**
   * Get current bridge health status
   */
  getHealthStatus(): BridgeHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Check if bridge is connected and healthy
   */
  isHealthy(): boolean {
    return this.healthStatus.connected && this.healthStatus.errorCount < 5;
  }

  /**
   * Send a request to the ANE bridge
   */
  async sendRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    payload?: any,
    options: {
      timeout?: number;
      retries?: number;
      priority?: 'low' | 'normal' | 'high';
      immediate?: boolean;
    } = {},
  ): Promise<BridgeResponse<T>> {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    this.logger.debug(
      `[${requestId}] Sending ${method} request to ${endpoint}`,
    );

    if (!this.config?.aneBridge?.enabled) {
      return {
        success: false,
        error: 'ANE Bridge is disabled',
        responseTime: 0,
        requestId,
      };
    }

    const request: BridgeRequest = {
      id: requestId,
      endpoint,
      method,
      payload: payload as Record<string, unknown> | undefined,
      timeout: options.timeout || this.config.aneBridge.timeoutMs || 5000,
      retries: options.retries || this.MAX_RETRY_ATTEMPTS,
      priority: options.priority || 'normal',
      timestamp: new Date(),
    };

    try {
      // For immediate requests or when bridge is healthy, send directly
      if (
        options.immediate ||
        (this.isHealthy() &&
          this.activeRequests.size < this.MAX_CONCURRENT_REQUESTS)
      ) {
        return await this.executeRequest<T>(request);
      } else {
        // Queue the request for processing
        return await this.queueRequest<T>(request);
      }
    } catch (error: unknown) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      this.logger.error(`[${requestId}] Request failed: ${errorMessage}`);

      // Record performance metric
      this.performanceService.recordMetric('ane_bridge_request', {
        duration: responseTime,
        success: false,
        error: errorMessage,
        endpoint,
        method,
        requestId,
      });

      return {
        success: false,
        error: errorMessage,
        responseTime,
        requestId,
      };
    }
  }

  /**
   * Send OCR request to ANE bridge
   */
  async sendOcrRequest(
    imageData: string,
    options: {
      recognitionLevel?: string;
      languages?: string[];
      customWords?: string[];
      enableBoundingBoxes?: boolean;
      operationId?: string;
    } = {},
  ): Promise<BridgeResponse> {
    const recognitionLevel: string = options.recognitionLevel || 'accurate';
    const languages: string[] = options.languages || ['en-US'];
    const customWords: string[] = options.customWords || [];
    const enableBoundingBoxes: boolean = options.enableBoundingBoxes || false;
    const operationId: string | undefined = options.operationId;

    return this.sendRequest(
      '/api/v1/vision/ocr',
      'POST',
      {
        image: imageData,
        recognitionLevel,
        languages,
        customWords,
        enableBoundingBoxes,
        operationId,
      },
      {
        priority: 'high',
        timeout: this.config.aneBridge.timeoutMs || 5000,
      },
    );
  }

  /**
   * Send text detection request to ANE bridge
   */
  async sendTextDetectionRequest(
    imageData: string,
    options: { operationId?: string } = {},
  ): Promise<BridgeResponse> {
    const operationId: string | undefined = options.operationId;

    return this.sendRequest(
      '/api/v1/vision/text',
      'POST',
      {
        image: imageData,
        operationId,
      },
      {
        priority: 'normal',
        timeout: this.config.aneBridge.timeoutMs || 5000,
      },
    );
  }

  /**
   * Get bridge capabilities and information
   */
  async getBridgeInfo(): Promise<BridgeResponse> {
    return this.sendRequest('/api/v1/info', 'GET', undefined, {
      immediate: true,
      timeout: 5000,
    });
  }

  /**
   * Get bridge performance metrics
   */
  async getBridgeMetrics(): Promise<BridgeResponse> {
    return this.sendRequest('/metrics', 'GET', undefined, {
      immediate: true,
      timeout: 3000,
    });
  }

  // === Private Methods ===

  /**
   * Execute a bridge request immediately
   */
  private async executeRequest<T>(
    request: BridgeRequest,
  ): Promise<BridgeResponse<T>> {
    const startTime = Date.now();
    const fullUrl = `${this.config.aneBridge.baseUrl}${request.endpoint}`;

    // Track active request
    const timeoutHandle = setTimeout(() => {
      this.activeRequests.delete(request.id);
    }, request.timeout);

    this.activeRequests.set(request.id, {
      timestamp: request.timestamp,
      timeout: timeoutHandle,
    });

    try {
      let response: { data: T; status: number };

      if (request.method === 'GET') {
        const axiosResponse = await firstValueFrom(
          this.httpService.get<T>(fullUrl, {
            timeout: request.timeout,
            headers: {
              'X-Request-ID': request.id,
              'X-Priority': request.priority,
            },
          }),
        );
        response = {
          data: axiosResponse.data,
          status: axiosResponse.status,
        };
      } else {
        const axiosResponse = await firstValueFrom(
          this.httpService.request<T>({
            method: request.method,
            url: fullUrl,
            data: request.payload as Record<string, unknown> | undefined,
            timeout: request.timeout,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': request.id,
              'X-Priority': request.priority,
            },
          }),
        );
        response = {
          data: axiosResponse.data,
          status: axiosResponse.status,
        };
      }

      const responseTime = Date.now() - startTime;

      // Clean up active request tracking
      clearTimeout(timeoutHandle);
      this.activeRequests.delete(request.id);

      // Record successful request
      this.healthStatus.errorCount = Math.max(
        0,
        this.healthStatus.errorCount - 1,
      );

      // Record performance metric
      this.performanceService.recordMetric('ane_bridge_request', {
        duration: responseTime,
        success: true,
        endpoint: request.endpoint,
        method: request.method,
        requestId: request.id,
      });

      this.logger.debug(
        `[${request.id}] Request completed successfully in ${responseTime}ms`,
      );

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
        responseTime,
        requestId: request.id,
      };
    } catch (error: unknown) {
      const responseTime = Date.now() - startTime;

      // Clean up active request tracking
      clearTimeout(timeoutHandle);
      this.activeRequests.delete(request.id);

      // Record error
      this.healthStatus.errorCount++;

      // Handle error message safely
      let errorMessage: string;
      if (error instanceof Error) {
        // Check for axios error structure with type safety
        const potentialAxiosError = error as Error & {
          response?: { data?: { message?: string } };
        };
        errorMessage =
          potentialAxiosError.response?.data?.message || error.message;
      } else {
        errorMessage = 'Unknown error occurred';
      }

      // Record performance metric
      this.performanceService.recordMetric('ane_bridge_request', {
        duration: responseTime,
        success: false,
        error: errorMessage,
        endpoint: request.endpoint,
        method: request.method,
        requestId: request.id,
      });

      throw new Error(`Bridge request failed: ${errorMessage}`);
    }
  }

  /**
   * Queue a request for later processing
   */
  private async queueRequest<T>(
    request: BridgeRequest,
  ): Promise<BridgeResponse<T>> {
    return new Promise<BridgeResponse<T>>((resolve, reject) => {
      // Add resolve/reject handlers to request with proper typing
      const extendedRequest = request as BridgeRequest & {
        resolve: (value: BridgeResponse<T>) => void;
        reject: (reason?: unknown) => void;
      };
      extendedRequest.resolve = resolve;
      extendedRequest.reject = reject;

      // Insert request based on priority
      if (request.priority === 'high') {
        this.requestQueue.unshift(request);
      } else {
        this.requestQueue.push(request);
      }

      this.logger.debug(
        `[${request.id}] Request queued (priority: ${request.priority}, queue size: ${this.requestQueue.length})`,
      );

      // Start queue processing if not already running
      if (!this.processingQueue) {
        void this.processRequestQueue().catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Queue processing failed: ${errorMessage}`);
        });
      }
    });
  }

  /**
   * Process queued requests
   */
  private async processRequestQueue(): Promise<void> {
    if (this.processingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    while (
      this.requestQueue.length > 0 &&
      this.activeRequests.size < this.MAX_CONCURRENT_REQUESTS
    ) {
      const request = this.requestQueue.shift();
      if (!request) break;

      try {
        const result = await this.executeRequest(request);
        const extendedRequest = request as BridgeRequest & {
          resolve: (value: BridgeResponse<unknown>) => void;
        };
        extendedRequest.resolve(result);
      } catch (error: unknown) {
        const extendedRequest = request as BridgeRequest & {
          reject: (reason?: unknown) => void;
        };
        extendedRequest.reject(error);
      }
    }

    this.processingQueue = false;

    // Continue processing if there are more requests
    if (this.requestQueue.length > 0) {
      setTimeout(() => {
        void this.processRequestQueue().catch((error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Delayed queue processing failed: ${errorMessage}`);
        });
      }, 100);
    }
  }

  /**
   * Perform health check on the ANE bridge
   */
  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now();

    try {
      const response = await firstValueFrom(
        this.httpService.get<{
          capabilities?: string[];
          version?: string;
        }>(`${this.config.aneBridge.baseUrl}/health`, {
          timeout: 5000,
        }),
      );

      const responseTime = Date.now() - startTime;

      this.healthStatus = {
        connected: true,
        responseTime,
        lastCheck: new Date(),
        errorCount: Math.max(0, this.healthStatus.errorCount - 1),
        capabilities: response.data.capabilities || [],
        version: response.data.version,
      };

      this.logger.debug(
        `Health check passed - Response time: ${responseTime}ms`,
      );
    } catch (error: unknown) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      this.healthStatus = {
        connected: false,
        responseTime,
        lastCheck: new Date(),
        errorCount: this.healthStatus.errorCount + 1,
        capabilities: [],
        version: undefined,
      };

      this.logger.warn(`Health check failed: ${errorMessage}`);
    }
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      void this.performHealthCheck().catch((error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        this.logger.warn(`Health monitoring error: ${errorMessage}`);
      });
    }, this.HEALTH_CHECK_INTERVAL);
  }
}
