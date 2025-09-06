/**
 * C/ua Integration Controller
 *
 * REST API controller providing C/ua framework endpoints and enhanced computer vision capabilities.
 * Handles OCR requests, performance monitoring, and system status reporting.
 *
 * Features:
 * - Apple Neural Engine accelerated OCR endpoints
 * - Performance metrics and monitoring
 * - System health and status reporting
 * - Batch processing capabilities
 * - Integration status and configuration
 *
 * @author Claude Code
 * @version 1.0.0
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Logger,
  HttpException,
  HttpStatus,
  BadRequestException,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OperatorOrAdmin, Authenticated, CurrentUser, ByteBotdUser } from '../auth/decorators/roles.decorator';
import { CuaIntegrationService } from './cua-integration.service';
import {
  CuaVisionService,
  OcrResult,
  VisionProcessingOptions,
} from './cua-vision.service';
import { CuaPerformanceService } from './cua-performance.service';
import { CuaBridgeService } from './cua-bridge.service';

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

  /**
   * Create comprehensive error context for logging
   * @param operationId - Unique operation identifier
   * @param error - Unknown error object
   * @param additionalContext - Additional context information
   * @returns Structured error context object
   */
  static createErrorContext(
    operationId: string,
    error: unknown,
    additionalContext?: Record<string, unknown>,
  ): {
    operationId: string;
    message: string;
    stack?: string;
    context?: Record<string, unknown>;
  } {
    return {
      operationId,
      message: ErrorHandler.extractErrorMessage(error),
      stack: ErrorHandler.extractErrorStack(error),
      context: additionalContext,
    };
  }
}

/**
 * OCR Request DTO
 */
export class OcrRequestDto {
  image!: string; // Base64 encoded image
  recognitionLevel?: 'fast' | 'accurate' = 'accurate';
  languages?: string[] = ['en-US'];
  customWords?: string[] = [];
  enableBoundingBoxes?: boolean = false;
  cacheEnabled?: boolean = true;
  forceMethod?: 'ane' | 'cpu';
}

/**
 * Batch OCR Request DTO
 */
export class BatchOcrRequestDto {
  images!: string[]; // Array of Base64 encoded images
  recognitionLevel?: 'fast' | 'accurate' = 'accurate';
  languages?: string[] = ['en-US'];
  customWords?: string[] = [];
  enableBoundingBoxes?: boolean = false;
  cacheEnabled?: boolean = true;
}

@Controller('api/v1/cua')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer')
export class CuaIntegrationController {
  private readonly logger = new Logger(CuaIntegrationController.name);

  constructor(
    private readonly cuaIntegrationService: CuaIntegrationService,
    private readonly visionService: CuaVisionService,
    private readonly performanceService: CuaPerformanceService,
    private readonly bridgeService: CuaBridgeService,
  ) {
    this.logger.log('C/ua Integration Controller initialized');
  }

  /**
   * Get C/ua framework status and configuration
   * GET /api/v1/cua/status
   */
  @Get('status')
  @Authenticated()
  getFrameworkStatus(@CurrentUser() user: ByteBotdUser) {
    try {
      const frameworkStatus = this.cuaIntegrationService.getFrameworkStatus();
      const bridgeHealth = this.bridgeService.getHealthStatus();
      const systemHealth = this.performanceService.isSystemHealthy();
      const visionCapabilities = this.visionService.getCapabilities();

      return {
        timestamp: new Date().toISOString(),
        framework: frameworkStatus,
        bridge: {
          health: bridgeHealth,
          available: this.cuaIntegrationService.isAneBridgeAvailable(),
        },
        system: systemHealth,
        vision: visionCapabilities,
        endpoints: {
          ocr: '/api/v1/cua/vision/ocr',
          batchOcr: '/api/v1/cua/vision/ocr/batch',
          textDetection: '/api/v1/cua/vision/text',
          performance: '/api/v1/cua/performance',
          health: '/api/v1/cua/health',
        },
      };
    } catch (error) {
      const errorMessage = ErrorHandler.extractErrorMessage(error);
      const errorStack = ErrorHandler.extractErrorStack(error);

      this.logger.error(
        `Failed to get framework status: ${errorMessage}`,
        errorStack,
      );
      throw new HttpException(
        'Failed to retrieve framework status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Health check endpoint
   * GET /api/v1/cua/health
   */
  @Get('health')
  @Authenticated()
  healthCheck(@CurrentUser() user: ByteBotdUser) {
    const frameworkEnabled = this.cuaIntegrationService.isFrameworkEnabled();
    const bridgeHealthy = this.bridgeService.isHealthy();
    const systemHealthy = this.performanceService.isSystemHealthy();

    const status =
      frameworkEnabled && (bridgeHealthy || systemHealthy.healthy)
        ? 'healthy'
        : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      framework: {
        enabled: frameworkEnabled,
      },
      bridge: {
        healthy: bridgeHealthy,
      },
      system: systemHealthy,
      uptime: process.uptime(),
    };
  }

  /**
   * Perform OCR on image with Apple Neural Engine acceleration
   * POST /api/v1/cua/vision/ocr
   */
  @Post('vision/ocr')
  @OperatorOrAdmin()
  async performOcr(@Body() request: OcrRequestDto, @CurrentUser() user: ByteBotdUser): Promise<{
    success: boolean;
    result?: OcrResult;
    error?: string;
  }> {
    const operationId = `ocr_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(`[${operationId}] OCR request received`, {
      imageSize: request.image?.length || 0,
      recognitionLevel: request.recognitionLevel,
      languages: request.languages?.join(','),
      enableBoundingBoxes: request.enableBoundingBoxes,
    });

    try {
      // Validate input
      if (!request.image || typeof request.image !== 'string') {
        throw new BadRequestException('Missing or invalid image data');
      }

      if (request.image.length === 0) {
        throw new BadRequestException('Empty image data');
      }

      // Check if framework is available
      if (!this.cuaIntegrationService.isFrameworkEnabled()) {
        throw new ServiceUnavailableException(
          'C/ua framework is not available',
        );
      }

      // Prepare processing options
      const options: VisionProcessingOptions = {
        recognitionLevel: request.recognitionLevel || 'accurate',
        languages: request.languages || ['en-US'],
        customWords: request.customWords || [],
        enableBoundingBoxes: request.enableBoundingBoxes || false,
        cacheEnabled: request.cacheEnabled !== false,
        forceMethod: request.forceMethod,
      };

      // Perform OCR
      const result = await this.visionService.performOcr(
        request.image,
        options,
      );

      this.logger.log(`[${operationId}] OCR completed successfully`, {
        textLength: result.text.length,
        confidence: result.confidence,
        method: result.method,
        processingTime: result.processingTimeMs,
      });

      return {
        success: true,
        result,
      };
    } catch (error) {
      const errorMessage = ErrorHandler.extractErrorMessage(error);
      const errorStack = ErrorHandler.extractErrorStack(error);

      this.logger.error(
        `[${operationId}] OCR failed: ${errorMessage}`,
        errorStack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      throw new HttpException(
        `OCR processing failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get performance metrics and system statistics
   * GET /api/v1/cua/performance
   */
  @Get('performance')
  @OperatorOrAdmin()
  getPerformanceMetrics(
    @Query('timeRange') timeRange: string = '60', // minutes
    @CurrentUser() user: ByteBotdUser,
  ) {
    try {
      const timeRangeMinutes = parseInt(timeRange, 10) || 60;

      if (timeRangeMinutes < 1 || timeRangeMinutes > 1440) {
        // Max 24 hours
        throw new BadRequestException('Invalid time range (1-1440 minutes)');
      }

      const summary =
        this.performanceService.getPerformanceSummary(timeRangeMinutes);
      const systemMetrics = this.performanceService.getCurrentSystemMetrics();
      const systemHealth = this.performanceService.isSystemHealthy();

      return {
        timestamp: new Date().toISOString(),
        timeRangeMinutes,
        performance: summary,
        system: {
          current: systemMetrics,
          health: systemHealth,
        },
        bridge: {
          status: this.bridgeService.getHealthStatus(),
        },
      };
    } catch (error) {
      const errorMessage = ErrorHandler.extractErrorMessage(error);
      const errorStack = ErrorHandler.extractErrorStack(error);

      this.logger.error(
        `Failed to get performance metrics: ${errorMessage}`,
        errorStack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        'Failed to retrieve performance metrics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get system capabilities and configuration
   * GET /api/v1/cua/capabilities
   */
  @Get('capabilities')
  @Authenticated()
  getCapabilities(@CurrentUser() user: ByteBotdUser) {
    try {
      const frameworkConfig = this.cuaIntegrationService.getConfiguration();
      const visionCapabilities = this.visionService.getCapabilities();
      const bridgeHealth = this.bridgeService.getHealthStatus();

      return {
        timestamp: new Date().toISOString(),
        framework: {
          enabled: frameworkConfig.framework.enabled,
          version: frameworkConfig.framework.version,
          performanceMode: frameworkConfig.framework.performanceMode,
        },
        vision: visionCapabilities,
        bridge: {
          enabled: frameworkConfig.aneBridge.enabled,
          connected: bridgeHealth.connected,
          capabilities: bridgeHealth.capabilities,
          version: bridgeHealth.version,
        },
        endpoints: [
          'GET /api/v1/cua/status',
          'GET /api/v1/cua/health',
          'POST /api/v1/cua/vision/ocr',
          'GET /api/v1/cua/performance',
          'GET /api/v1/cua/capabilities',
        ],
      };
    } catch (error) {
      const errorMessage = ErrorHandler.extractErrorMessage(error);
      const errorStack = ErrorHandler.extractErrorStack(error);

      this.logger.error(
        `Failed to get capabilities: ${errorMessage}`,
        errorStack,
      );
      throw new HttpException(
        'Failed to retrieve capabilities',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
