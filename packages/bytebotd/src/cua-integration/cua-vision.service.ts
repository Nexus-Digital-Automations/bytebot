/**
 * C/ua Vision Service
 *
 * Enhanced computer vision service leveraging Apple Neural Engine through C/ua framework.
 * Provides OCR, text detection, and image analysis capabilities with performance optimization.
 *
 * Features:
 * - Apple Neural Engine accelerated OCR
 * - Fallback to CPU-based processing
 * - Batch processing optimization
 * - Caching for improved performance
 * - Comprehensive error handling
 *
 * @author Claude Code
 * @version 1.2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  CuaIntegrationService,
  CuaIntegrationConfig,
} from './cua-integration.service';
import { CuaPerformanceService } from './cua-performance.service';
import * as crypto from 'crypto';

/**
 * Error Handler Utility for safe error processing
 * Provides type-safe error message extraction and response data handling
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

  /**
   * Safely extract response error details from HTTP error objects
   * @param error - Unknown error object that may contain response data
   * @returns Safe error details string
   */
  static extractResponseError(error: unknown): string {
    if (error && typeof error === 'object' && 'response' in error) {
      const httpError = error as {
        response?: { data?: { detail?: unknown; message?: unknown } };
      };
      if (httpError.response?.data) {
        const detail = httpError.response.data.detail;
        const message = httpError.response.data.message;
        if (typeof detail === 'string') return detail;
        if (typeof message === 'string') return message;
      }
    }
    return ErrorHandler.extractErrorMessage(error);
  }
}

/**
 * Type definitions for OCR response data structures
 * Provides strict typing for external API response validation
 */

/**
 * Bounding box data interface for OCR results
 */
export interface BoundingBoxData {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

/**
 * Text detection region data interface
 */
export interface TextDetectionRegionData {
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

/**
 * Type-safe property checking utility functions
 */
export class TypeGuardUtils {
  /**
   * Check if object has a specific string property
   */
  static hasStringProperty(obj: unknown, prop: string): boolean {
    return (
      obj !== null &&
      obj !== undefined &&
      typeof obj === 'object' &&
      prop in obj &&
      typeof (obj as Record<string, unknown>)[prop] === 'string'
    );
  }

  /**
   * Check if object has a specific number property
   */
  static hasNumberProperty(obj: unknown, prop: string): boolean {
    return (
      obj !== null &&
      obj !== undefined &&
      typeof obj === 'object' &&
      prop in obj &&
      typeof (obj as Record<string, unknown>)[prop] === 'number'
    );
  }

  /**
   * Check if object has optional string property (undefined or string)
   */
  static hasOptionalStringProperty(obj: unknown, prop: string): boolean {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return false;
    }
    const record = obj as Record<string, unknown>;
    return !(prop in record) || typeof record[prop] === 'string';
  }
}

/**
 * OCR Response Data Interface - Raw API response structure
 */
export interface OcrResponseData {
  text?: string;
  confidence?: number;
  bounding_boxes?: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
  processing_time_ms?: number;
  ane_used?: boolean;
  language?: string;
  error?: string;
}

/**
 * Text Detection Response Data Interface - Raw API response structure
 */
export interface TextDetectionResponseData {
  detected?: boolean;
  regions?: Array<{
    text?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
  processing_time_ms?: number;
  ane_used?: boolean;
  error?: string;
}

/**
 * Response Data Type Guards and Extractors
 */
export class ResponseDataHandler {
  /**
   * Type guard for checking if object has expected OCR response properties
   */
  static isValidOcrResponse(data: unknown): data is OcrResponseData {
    return data !== null && typeof data === 'object';
  }

  /**
   * Type guard for valid bounding box objects
   */
  static isValidBoundingBox(box: unknown): box is {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  } {
    return (
      TypeGuardUtils.hasStringProperty(box, 'text') &&
      TypeGuardUtils.hasNumberProperty(box, 'x') &&
      TypeGuardUtils.hasNumberProperty(box, 'y') &&
      TypeGuardUtils.hasNumberProperty(box, 'width') &&
      TypeGuardUtils.hasNumberProperty(box, 'height') &&
      TypeGuardUtils.hasNumberProperty(box, 'confidence')
    );
  }

  /**
   * Type guard for valid region objects
   */
  static isValidRegion(region: unknown): region is {
    text?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  } {
    return (
      TypeGuardUtils.hasNumberProperty(region, 'x') &&
      TypeGuardUtils.hasNumberProperty(region, 'y') &&
      TypeGuardUtils.hasNumberProperty(region, 'width') &&
      TypeGuardUtils.hasNumberProperty(region, 'height') &&
      TypeGuardUtils.hasNumberProperty(region, 'confidence') &&
      TypeGuardUtils.hasOptionalStringProperty(region, 'text')
    );
  }

  /**
   * Safely extract OCR response data
   */
  static extractOcrData(data: unknown): {
    text: string;
    confidence: number;
    boundingBoxes: Array<{
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number;
    }>;
    processingTimeMs: number;
    aneUsed: boolean;
    language?: string;
    error?: string;
  } {
    if (!ResponseDataHandler.isValidOcrResponse(data)) {
      return {
        text: '',
        confidence: 0,
        boundingBoxes: [],
        processingTimeMs: 0,
        aneUsed: false,
      };
    }

    // Type-safe extraction after validation
    const ocrData = data;
    return {
      text: typeof ocrData.text === 'string' ? ocrData.text : '',
      confidence:
        typeof ocrData.confidence === 'number' ? ocrData.confidence : 0,
      boundingBoxes: Array.isArray(ocrData.bounding_boxes)
        ? (ocrData.bounding_boxes.filter((box) =>
            ResponseDataHandler.isValidBoundingBox(box),
          ) as BoundingBoxData[])
        : [],
      processingTimeMs:
        typeof ocrData.processing_time_ms === 'number'
          ? ocrData.processing_time_ms
          : 0,
      aneUsed: typeof ocrData.ane_used === 'boolean' ? ocrData.ane_used : false,
      language:
        typeof ocrData.language === 'string' ? ocrData.language : undefined,
      error: typeof ocrData.error === 'string' ? ocrData.error : undefined,
    };
  }

  /**
   * Type guard for checking if object has expected text detection response properties
   */
  static isValidTextDetectionResponse(
    data: unknown,
  ): data is TextDetectionResponseData {
    return data !== null && typeof data === 'object';
  }

  /**
   * Safely extract text detection response data
   */
  static extractTextDetectionData(data: unknown): {
    detected: boolean;
    regions: Array<{
      text?: string;
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number;
    }>;
    processingTimeMs: number;
    aneUsed: boolean;
    error?: string;
  } {
    if (!ResponseDataHandler.isValidTextDetectionResponse(data)) {
      return {
        detected: false,
        regions: [],
        processingTimeMs: 0,
        aneUsed: false,
      };
    }

    // Type-safe extraction after validation
    const textData = data;
    return {
      detected:
        typeof textData.detected === 'boolean' ? textData.detected : false,
      regions: Array.isArray(textData.regions)
        ? (textData.regions.filter((region) =>
            ResponseDataHandler.isValidRegion(region),
          ) as TextDetectionRegionData[])
        : [],
      processingTimeMs:
        typeof textData.processing_time_ms === 'number'
          ? textData.processing_time_ms
          : 0,
      aneUsed:
        typeof textData.ane_used === 'boolean' ? textData.ane_used : false,
      error: typeof textData.error === 'string' ? textData.error : undefined,
    };
  }
}

/**
 * OCR Result Interface
 */
export interface OcrResult {
  text: string;
  confidence: number;
  boundingBoxes?: Array<{
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
  processingTimeMs: number;
  method: 'ane' | 'cpu' | 'cached';
  language?: string;
  requestId?: string;
  aneUsed?: boolean;
  error?: string;
}

/**
 * Text Detection Result Interface
 */
export interface TextDetectionResult {
  detected: boolean;
  regions: Array<{
    text?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }>;
  processingTimeMs: number;
  method: 'ane' | 'cpu';
  requestId?: string;
  aneUsed?: boolean;
  error?: string;
}

/**
 * Vision Processing Options
 */
export interface VisionProcessingOptions {
  recognitionLevel?: 'fast' | 'accurate';
  languages?: string[];
  customWords?: string[];
  enableBoundingBoxes?: boolean;
  cacheEnabled?: boolean;
  forceMethod?: 'ane' | 'cpu';
  batchId?: string;
  confidenceThreshold?: number;
  priority?: 'high' | 'normal' | 'low';
}

@Injectable()
export class CuaVisionService {
  private readonly logger = new Logger(CuaVisionService.name);
  private readonly config: CuaIntegrationConfig;
  private readonly resultCache = new Map<
    string,
    { result: OcrResult; timestamp: number }
  >();
  private readonly CACHE_TTL_MS = 60000; // 1 minute cache
  private readonly MAX_CACHE_SIZE = 1000;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cuaIntegrationService: CuaIntegrationService,
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

    this.logger.log(
      `C/ua Vision Service initialized - ANE Bridge: ${this.config?.aneBridge?.enabled ? 'enabled' : 'disabled'}`,
    );

    // Start cache cleanup interval
    setInterval(() => this.cleanupCache(), 300000); // 5 minutes
  }

  /**
   * Perform OCR on image with Apple Neural Engine acceleration
   *
   * @param imageData Base64 encoded image data
   * @param options Processing options
   * @returns OCR result with text and metadata
   */
  async performOcr(
    imageData: string,
    options: VisionProcessingOptions = {},
  ): Promise<OcrResult> {
    const startTime = Date.now();
    const operationId = crypto.randomUUID();

    this.logger.log(`[${operationId}] Starting OCR processing`, {
      imageSize: imageData.length,
      recognitionLevel: options.recognitionLevel || 'accurate',
      languages: options.languages?.join(',') || 'en-US',
      aneAvailable: this.cuaIntegrationService.isAneBridgeAvailable(),
    });

    try {
      // Check cache if enabled
      if (options.cacheEnabled !== false) {
        const cached = this.getCachedResult(imageData, options);
        if (cached) {
          this.logger.log(`[${operationId}] Returning cached OCR result`);
          cached.requestId = operationId;
          return cached;
        }
      }

      // Attempt ANE-accelerated processing first
      if (this.shouldUseAneBridge(options)) {
        try {
          const aneResult = await this.performAneOcr(
            imageData,
            options,
            operationId,
          );

          // Cache successful results
          if (options.cacheEnabled !== false && !aneResult.error) {
            this.cacheResult(imageData, options, aneResult);
          }

          // Record performance metrics
          this.performanceService?.recordMetric('ocr_processing', {
            duration: aneResult.processingTimeMs,
            method: 'ane',
            success: !aneResult.error,
            operationId,
          });

          return aneResult;
        } catch (aneError) {
          const aneErrorMessage = ErrorHandler.extractErrorMessage(aneError);
          this.logger.warn(
            `[${operationId}] ANE processing failed: ${aneErrorMessage}`,
          );

          // Fallback to CPU processing if ANE fails and fallback is enabled
          if (this.config.aneBridge.fallbackEnabled) {
            this.logger.log(`[${operationId}] Falling back to CPU processing`);
          } else {
            throw aneError;
          }
        }
      }

      // CPU fallback processing
      const cpuResult = await this.performCpuOcr(
        imageData,
        options,
        operationId,
      );

      // Cache successful results
      if (options.cacheEnabled !== false && !cpuResult.error) {
        this.cacheResult(imageData, options, cpuResult);
      }

      // Record performance metrics
      this.performanceService?.recordMetric('ocr_processing', {
        duration: cpuResult.processingTimeMs,
        method: 'cpu',
        success: !cpuResult.error,
        operationId,
      });

      return cpuResult;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      const errorMessage = ErrorHandler.extractErrorMessage(error);
      const errorStack = ErrorHandler.extractErrorStack(error);

      this.logger.error(
        `[${operationId}] OCR processing failed: ${errorMessage}`,
        errorStack,
      );

      // Record failure metrics
      this.performanceService?.recordMetric('ocr_processing', {
        duration: processingTime,
        method: 'unknown',
        success: false,
        error: errorMessage,
        operationId,
      });

      return {
        text: '',
        confidence: 0,
        processingTimeMs: processingTime,
        method: 'cpu',
        requestId: operationId,
        aneUsed: false,
        error: `OCR processing failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Perform text detection (find text regions without recognition)
   *
   * @param imageData Base64 encoded image data
   * @param options Processing options
   * @returns Text detection result with regions
   */
  async detectText(
    imageData: string,
    options: VisionProcessingOptions = {},
  ): Promise<TextDetectionResult> {
    const startTime = Date.now();
    const operationId = crypto.randomUUID();

    this.logger.log(`[${operationId}] Starting text detection`, {
      confidenceThreshold: options.confidenceThreshold || 0.8,
      aneAvailable: this.cuaIntegrationService.isAneBridgeAvailable(),
    });

    try {
      if (this.shouldUseAneBridge(options)) {
        const result = await this.performAneTextDetection(
          imageData,
          options,
          operationId,
        );

        this.logger.log(
          `[${operationId}] Text detection completed via ANE (${result.processingTimeMs}ms, ${result.regions.length} regions)`,
        );
        return result;
      } else {
        const result = await this.performCpuTextDetection(
          imageData,
          options,
          operationId,
        );

        this.logger.log(
          `[${operationId}] Text detection completed via CPU (${result.processingTimeMs}ms, ${result.regions.length} regions)`,
        );
        return result;
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;

      const errorMessage = ErrorHandler.extractErrorMessage(error);
      const errorStack = ErrorHandler.extractErrorStack(error);

      this.logger.error(
        `[${operationId}] Text detection failed: ${errorMessage}`,
        errorStack,
      );

      return {
        detected: false,
        regions: [],
        processingTimeMs: processingTime,
        method: 'cpu',
        requestId: operationId,
        aneUsed: false,
        error: `Text detection failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Batch OCR processing for multiple images
   *
   * @param images Array of base64 encoded images
   * @param options Processing options
   * @returns Array of OCR results
   */
  async batchOcr(
    images: string[],
    options: VisionProcessingOptions = {},
  ): Promise<OcrResult[]> {
    const batchId = crypto.randomUUID();
    const startTime = Date.now();

    this.logger.log(
      `[${batchId}] Starting batch OCR processing for ${images.length} images`,
    );

    try {
      // Add batch ID to options
      const batchOptions = { ...options, batchId };

      // Process images concurrently with limited concurrency
      const maxConcurrency = 5;
      const results: OcrResult[] = [];

      for (let i = 0; i < images.length; i += maxConcurrency) {
        const batch = images.slice(i, i + maxConcurrency);
        const batchResults = await Promise.all(
          batch.map((image, index) =>
            this.performOcr(image, {
              ...batchOptions,
              batchId: `${batchId}-${i + index}`,
            }),
          ),
        );
        results.push(...batchResults);
      }

      const totalTime = Date.now() - startTime;
      this.logger.log(
        `[${batchId}] Batch OCR completed: ${results.length} images in ${totalTime}ms`,
      );

      return results;
    } catch (error) {
      const errorMessage = ErrorHandler.extractErrorMessage(error);
      const errorStack = ErrorHandler.extractErrorStack(error);

      this.logger.error(
        `[${batchId}] Batch OCR failed: ${errorMessage}`,
        errorStack,
      );
      throw new Error(`Batch OCR failed: ${errorMessage}`);
    }
  }

  /**
   * Get vision service capabilities and status
   */
  getCapabilities() {
    return {
      aneEnabled: this.cuaIntegrationService.isAneBridgeAvailable(),
      fallbackEnabled: this.config.aneBridge?.fallbackEnabled || false,
      batchProcessing: true,
      caching: true,
      supportedFormats: ['PNG', 'JPEG', 'WebP', 'TIFF', 'BMP'],
      supportedLanguages: [
        'en-US',
        'en-GB',
        'es-ES',
        'fr-FR',
        'de-DE',
        'it-IT',
        'pt-BR',
        'zh-CN',
        'ja-JP',
      ],
      maxBatchSize: 10,
      performanceTargets: {
        latencyMs: '2-5 (ANE) / 15-40 (CPU)',
        throughputImagesPerSecond: '100-500',
      },
    };
  }

  // === Private Methods ===

  /**
   * Determine if ANE bridge should be used for processing
   */
  private shouldUseAneBridge(options: VisionProcessingOptions): boolean {
    // Force method if specified
    if (options.forceMethod) {
      return options.forceMethod === 'ane';
    }

    // Use ANE if available and not explicitly disabled
    return (
      this.cuaIntegrationService.isAneBridgeAvailable() &&
      this.config.aneBridge?.enabled
    );
  }

  /**
   * Perform OCR using Apple Neural Engine bridge
   */
  private async performAneOcr(
    imageData: string,
    options: VisionProcessingOptions,
    operationId: string,
  ): Promise<OcrResult> {
    const startTime = Date.now();

    const requestPayload = {
      image_data: imageData,
      recognition_level: options.recognitionLevel || 'accurate',
      languages: options.languages || ['en-US'],
      custom_words: options.customWords || [],
      minimum_text_height: 0.03125,
      priority: options.priority || 'normal',
      request_id: operationId,
    };

    try {
      this.logger.debug(`[${operationId}] Sending OCR request to ANE bridge`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.config.aneBridge.baseUrl}/api/v1/vision/ocr`,
          requestPayload,
          {
            timeout: this.config.aneBridge.timeoutMs,
            headers: {
              'Content-Type': 'application/json',
              'X-Operation-ID': operationId,
              'X-Request-Priority': options.priority || 'normal',
            },
          },
        ),
      );

      const processingTime = Date.now() - startTime;

      // Parse ANE bridge response format using safe data handler
      const responseData = ResponseDataHandler.extractOcrData(response.data);
      const result: OcrResult = {
        text: responseData.text,
        confidence: responseData.confidence,
        boundingBoxes: responseData.boundingBoxes,
        processingTimeMs: responseData.processingTimeMs || processingTime,
        method: responseData.aneUsed ? 'ane' : 'cpu',
        language: responseData.language,
        requestId: operationId,
        aneUsed: responseData.aneUsed,
        error: responseData.error,
      };

      this.logger.log(
        `[${operationId}] ANE OCR completed: ${result.text.length} chars, ${result.confidence.toFixed(2)} confidence, ${result.processingTimeMs.toFixed(1)}ms (ANE: ${result.aneUsed})`,
      );

      return result;
    } catch (error) {
      const responseError = ErrorHandler.extractResponseError(error);
      this.logger.error(
        `[${operationId}] ANE OCR request failed: ${responseError}`,
      );
      throw new Error(`ANE OCR request failed: ${responseError}`);
    }
  }

  /**
   * Perform OCR using CPU fallback method
   */
  private async performCpuOcr(
    imageData: string,
    options: VisionProcessingOptions,
    operationId: string,
  ): Promise<OcrResult> {
    const startTime = Date.now();

    this.logger.warn(`[${operationId}] Using CPU fallback for OCR processing`);

    // Simulate CPU-based OCR processing
    // In a real implementation, this would use a local OCR library like Tesseract
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate processing time

    const processingTime = Date.now() - startTime;

    return {
      text: 'CPU fallback OCR not fully implemented',
      confidence: 0.5,
      boundingBoxes: [],
      processingTimeMs: processingTime,
      method: 'cpu',
      requestId: operationId,
      aneUsed: false,
      error: 'CPU fallback requires local OCR library integration',
    };
  }

  /**
   * Perform text detection using Apple Neural Engine bridge
   */
  private async performAneTextDetection(
    imageData: string,
    options: VisionProcessingOptions,
    operationId: string,
  ): Promise<TextDetectionResult> {
    const startTime = Date.now();

    const requestPayload = {
      image_data: imageData,
      confidence_threshold: options.confidenceThreshold || 0.8,
      include_bounding_boxes: true,
      detect_orientation: true,
      priority: options.priority || 'normal',
      request_id: operationId,
    };

    try {
      this.logger.debug(
        `[${operationId}] Sending text detection request to ANE bridge`,
      );

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.config.aneBridge.baseUrl}/api/v1/vision/text`,
          requestPayload,
          {
            timeout: this.config.aneBridge.timeoutMs,
            headers: {
              'Content-Type': 'application/json',
              'X-Operation-ID': operationId,
              'X-Request-Priority': options.priority || 'normal',
            },
          },
        ),
      );

      const processingTime = Date.now() - startTime;

      // Parse ANE bridge response format using safe data handler
      const responseData = ResponseDataHandler.extractTextDetectionData(
        response.data,
      );

      return {
        detected: responseData.detected,
        regions: responseData.regions,
        processingTimeMs: responseData.processingTimeMs || processingTime,
        method: responseData.aneUsed ? 'ane' : 'cpu',
        requestId: operationId,
        aneUsed: responseData.aneUsed,
        error: responseData.error,
      };
    } catch (error) {
      const responseError = ErrorHandler.extractResponseError(error);
      this.logger.error(
        `[${operationId}] ANE text detection failed: ${responseError}`,
      );
      throw new Error(`ANE text detection failed: ${responseError}`);
    }
  }

  /**
   * Perform text detection using CPU fallback
   */
  private async performCpuTextDetection(
    imageData: string,
    options: VisionProcessingOptions,
    operationId: string,
  ): Promise<TextDetectionResult> {
    const startTime = Date.now();

    this.logger.warn(`[${operationId}] Using CPU fallback for text detection`);

    // Simulate CPU-based text detection
    await new Promise((resolve) => setTimeout(resolve, 50));

    const processingTime = Date.now() - startTime;

    return {
      detected: false,
      regions: [],
      processingTimeMs: processingTime,
      method: 'cpu',
      requestId: operationId,
      aneUsed: false,
      error: 'CPU text detection fallback not implemented',
    };
  }

  /**
   * Generate cache key for OCR result
   */
  private getCacheKey(
    imageData: string,
    options: VisionProcessingOptions,
  ): string {
    const keyData = {
      image: imageData.substring(0, 100), // First 100 chars of image data
      recognitionLevel: options.recognitionLevel || 'accurate',
      languages: (options.languages || ['en-US']).sort().join(','),
      customWords: (options.customWords || []).sort().join(','),
    };

    return crypto
      .createHash('md5')
      .update(JSON.stringify(keyData))
      .digest('hex');
  }

  /**
   * Get cached OCR result if available and not expired
   */
  private getCachedResult(
    imageData: string,
    options: VisionProcessingOptions,
  ): OcrResult | null {
    const cacheKey = this.getCacheKey(imageData, options);
    const cached = this.resultCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      const result = { ...cached.result };
      result.method = 'cached';
      return result;
    }

    // Remove expired entry if found
    if (cached) {
      this.resultCache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Cache OCR result
   */
  private cacheResult(
    imageData: string,
    options: VisionProcessingOptions,
    result: OcrResult,
  ): void {
    // Don't cache error results
    if (result.error) {
      return;
    }

    // Implement LRU eviction if cache is full
    if (this.resultCache.size >= this.MAX_CACHE_SIZE) {
      const iterator = this.resultCache.keys().next();
      if (!iterator.done) {
        const oldestKey = iterator.value as string;
        this.resultCache.delete(oldestKey);
      }
    }

    const cacheKey = this.getCacheKey(imageData, options);
    this.resultCache.set(cacheKey, {
      result: { ...result },
      timestamp: Date.now(),
    });
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of Array.from(this.resultCache.entries())) {
      if (now - value.timestamp > this.CACHE_TTL_MS) {
        this.resultCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }
}
