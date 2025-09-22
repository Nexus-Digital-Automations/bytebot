/**
 * Document Generation Controller
 * RESTful API endpoints for document generation operations
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  UseGuards,
  UseInterceptors,
  Logger,
  ValidationPipe,
  UsePipes
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiProduces
} from '@nestjs/swagger';

// Core services
import { DocumentEngineService } from '../core/document-engine.service';

// DTOs
import { CreateDocumentGenerationRequestDto } from '../dto/create-document-generation-request.dto';
import { DocumentGenerationResponseDto } from '../dto/document-generation-response.dto';
import { ProcessingStatusResponseDto } from '../dto/processing-status-response.dto';

// Types
import {
  DocumentGenerationRequest,
  DocumentGenerationResult,
  ProcessingStatus
} from '../types/document.types';

// Guards and Middleware (placeholder imports - will be implemented with security integration)
// import { JwtAuthGuard } from '@bytebot/shared/guards';
// import { ParlantValidationGuard } from '../guards/parlant-validation.guard';
// import { RateLimitGuard } from '../guards/rate-limit.guard';

/**
 * Controller handling all document generation operations
 * Provides enterprise-grade API endpoints with comprehensive validation and monitoring
 */
@ApiTags('Document Generation')
@Controller('document-generation')
// @UseGuards(JwtAuthGuard, ParlantValidationGuard, RateLimitGuard) // TODO: Enable after security integration
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class DocumentGenerationController {
  private readonly logger = new Logger(DocumentGenerationController.name);

  constructor(
    private readonly documentEngine: DocumentEngineService
  ) {}

  /**
   * Generate a new document from template and data
   * Primary endpoint for document generation operations
   */
  @Post('generate')
  @ApiOperation({
    summary: 'Generate document from template',
    description: 'Creates a new document by processing a template with provided data. Supports multiple output formats and advanced processing options.'
  })
  @ApiBody({
    type: CreateDocumentGenerationRequestDto,
    description: 'Document generation request payload'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Document generation initiated successfully',
    type: DocumentGenerationResponseDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters or data validation failed'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions'
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'Template validation failed or data schema mismatch'
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error during processing'
  })
  @ApiConsumes('application/json')
  @ApiProduces('application/json')
  // @ApiBearerAuth() // TODO: Enable after JWT integration
  async generateDocument(
    @Body() createRequestDto: CreateDocumentGenerationRequestDto
  ): Promise<DocumentGenerationResponseDto> {
    this.logger.log(`Document generation request received: ${createRequestDto.templateId}`);

    try {
      // Convert DTO to internal request format
      const request: DocumentGenerationRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        templateId: createRequestDto.templateId,
        data: createRequestDto.data,
        format: createRequestDto.format,
        options: {
          outputFormat: createRequestDto.format,
          customSettings: createRequestDto.options?.customSettings || {},
          ...createRequestDto.options
        },
        metadata: {
          source: 'api',
          userId: createRequestDto.userId || 'anonymous', // TODO: Extract from JWT token
          customProperties: createRequestDto.metadata || {}
        },
        priority: createRequestDto.priority || 'normal',
        createdAt: new Date(),
        requestedBy: createRequestDto.userId || 'anonymous'
      };

      // Initiate document generation
      const result = await this.documentEngine.generateDocument(request);

      // Convert result to response DTO
      const response: DocumentGenerationResponseDto = {
        id: result.id,
        requestId: result.requestId,
        status: result.status,
        document: result.document ? {
          id: result.document.id,
          downloadUrl: result.document.downloadUrl,
          metadata: result.document.metadata,
          expiresAt: result.document.expiresAt
        } : undefined,
        error: result.error,
        metrics: result.metrics,
        createdAt: result.createdAt,
        completedAt: result.completedAt
      };

      this.logger.log(`Document generation completed with status: ${result.status}`);
      return response;

    } catch (error) {
      this.logger.error('Document generation failed:', error);

      if (error.message.includes('validation')) {
        throw new HttpException(
          {
            message: 'Validation failed',
            details: error.message,
            timestamp: new Date().toISOString()
          },
          HttpStatus.UNPROCESSABLE_ENTITY
        );
      }

      if (error.message.includes('not found')) {
        throw new HttpException(
          {
            message: 'Resource not found',
            details: error.message,
            timestamp: new Date().toISOString()
          },
          HttpStatus.NOT_FOUND
        );
      }

      throw new HttpException(
        {
          message: 'Internal server error',
          details: 'An unexpected error occurred during document generation',
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get the status of a document generation request
   * Allows clients to poll for completion status and results
   */
  @Get('status/:requestId')
  @ApiOperation({
    summary: 'Get generation status',
    description: 'Retrieves the current status and results of a document generation request'
  })
  @ApiParam({
    name: 'requestId',
    description: 'Unique identifier of the generation request',
    example: 'req_1234567890_abcdef123'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status retrieved successfully',
    type: ProcessingStatusResponseDto
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Request ID not found'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required'
  })
  @ApiProduces('application/json')
  // @ApiBearerAuth()
  async getGenerationStatus(
    @Param('requestId') requestId: string
  ): Promise<ProcessingStatusResponseDto> {
    this.logger.log(`Status request for: ${requestId}`);

    try {
      const result = await this.documentEngine.getGenerationStatus(requestId);

      if (!result) {
        throw new HttpException(
          {
            message: 'Request not found',
            details: `No generation request found with ID: ${requestId}`,
            timestamp: new Date().toISOString()
          },
          HttpStatus.NOT_FOUND
        );
      }

      const response: ProcessingStatusResponseDto = {
        requestId: result.requestId,
        status: result.status,
        progress: result.status === ProcessingStatus.PROCESSING ? {
          percentage: Math.random() * 100, // TODO: Implement actual progress tracking
          currentStep: 'Processing template',
          estimatedTimeRemainingMs: 5000
        } : undefined,
        document: result.document ? {
          id: result.document.id,
          downloadUrl: result.document.downloadUrl,
          metadata: result.document.metadata,
          expiresAt: result.document.expiresAt
        } : undefined,
        error: result.error,
        metrics: result.metrics,
        createdAt: result.createdAt,
        completedAt: result.completedAt
      };

      return response;

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Error retrieving status for ${requestId}:`, error);
      throw new HttpException(
        {
          message: 'Internal server error',
          details: 'Failed to retrieve generation status',
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Cancel a pending or in-progress document generation request
   * Provides ability to abort long-running operations
   */
  @Delete('cancel/:requestId')
  @ApiOperation({
    summary: 'Cancel generation request',
    description: 'Cancels a pending or in-progress document generation request'
  })
  @ApiParam({
    name: 'requestId',
    description: 'Unique identifier of the generation request to cancel',
    example: 'req_1234567890_abcdef123'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Request cancelled successfully'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Request ID not found'
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Request cannot be cancelled (already completed)'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required'
  })
  @ApiProduces('application/json')
  // @ApiBearerAuth()
  async cancelGeneration(
    @Param('requestId') requestId: string
    // TODO: Extract userId from JWT token
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Cancellation request for: ${requestId}`);

    try {
      const userId = 'anonymous'; // TODO: Extract from JWT token
      const cancelled = await this.documentEngine.cancelGeneration(requestId, userId);

      if (!cancelled) {
        throw new HttpException(
          {
            message: 'Cannot cancel request',
            details: 'Request not found or already completed',
            timestamp: new Date().toISOString()
          },
          HttpStatus.CONFLICT
        );
      }

      return {
        success: true,
        message: 'Document generation request cancelled successfully'
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Error cancelling request ${requestId}:`, error);
      throw new HttpException(
        {
          message: 'Internal server error',
          details: 'Failed to cancel generation request',
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get processing metrics and statistics
   * Provides insights into system performance and usage
   */
  @Get('metrics')
  @ApiOperation({
    summary: 'Get processing metrics',
    description: 'Retrieves aggregated metrics and statistics for document generation operations'
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Time period for metrics (hour, day, week, month)',
    example: 'day'
  })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Filter metrics by document format',
    example: 'pdf'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Metrics retrieved successfully'
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required'
  })
  @ApiProduces('application/json')
  // @ApiBearerAuth()
  async getProcessingMetrics(
    @Query('period') period?: string,
    @Query('format') format?: string
  ): Promise<any> {
    this.logger.log(`Metrics request - period: ${period}, format: ${format}`);

    try {
      const metrics = await this.documentEngine.getProcessingMetrics();

      // TODO: Implement filtering by period and format
      return {
        period: period || 'day',
        format: format || 'all',
        metrics,
        generatedAt: new Date()
      };

    } catch (error) {
      this.logger.error('Error retrieving metrics:', error);
      throw new HttpException(
        {
          message: 'Internal server error',
          details: 'Failed to retrieve processing metrics',
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}