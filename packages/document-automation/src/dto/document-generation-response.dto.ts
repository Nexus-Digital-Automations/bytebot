/**
 * Response DTOs for Document Generation API
 * Comprehensive response schemas for client consumption
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProcessingStatus, DocumentFormat } from '../types/document.types';

/**
 * Document metadata response DTO
 */
export class DocumentMetadataResponseDto {
  @ApiProperty({
    description: 'Unique document identifier',
    example: 'doc_1234567890_abcdef123'
  })
  id: string;

  @ApiProperty({
    description: 'Document title',
    example: 'Monthly Financial Report - September 2024'
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Document description',
    example: 'Comprehensive financial analysis and performance metrics'
  })
  description?: string;

  @ApiProperty({
    description: 'Document format',
    enum: DocumentFormat,
    example: DocumentFormat.PDF
  })
  format: DocumentFormat;

  @ApiProperty({
    description: 'Document size in bytes',
    example: 1048576
  })
  size: number;

  @ApiPropertyOptional({
    description: 'Number of pages in document',
    example: 15
  })
  pageCount?: number;

  @ApiProperty({
    description: 'Document creation timestamp',
    example: '2024-09-22T16:30:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Document last update timestamp',
    example: '2024-09-22T16:30:00.000Z'
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'User who created the document',
    example: 'user_12345'
  })
  createdBy: string;

  @ApiProperty({
    description: 'Document version',
    example: '1.0.0'
  })
  version: string;

  @ApiProperty({
    description: 'SHA-256 checksum for integrity verification',
    example: 'a1b2c3d4e5f6789012345678901234567890abcdef'
  })
  checksum: string;

  @ApiProperty({
    description: 'Document tags for categorization',
    example: ['financial', 'monthly', 'report', 'generated']
  })
  tags: string[];

  @ApiProperty({
    description: 'Custom document properties',
    example: {
      templateId: 'template_12345',
      reportingPeriod: '2024-09',
      department: 'finance'
    }
  })
  customProperties: Record<string, any>;
}

/**
 * Generated document response DTO
 */
export class GeneratedDocumentResponseDto {
  @ApiProperty({
    description: 'Unique document identifier',
    example: 'doc_1234567890_abcdef123'
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Direct download URL for the document',
    example: 'https://api.example.com/documents/download/doc_1234567890_abcdef123'
  })
  downloadUrl?: string;

  @ApiProperty({
    description: 'Document metadata',
    type: DocumentMetadataResponseDto
  })
  metadata: DocumentMetadataResponseDto;

  @ApiPropertyOptional({
    description: 'Document expiration timestamp',
    example: '2024-10-22T16:30:00.000Z'
  })
  expiresAt?: Date;
}

/**
 * Processing error response DTO
 */
export class ProcessingErrorResponseDto {
  @ApiProperty({
    description: 'Error code for programmatic handling',
    example: 'TEMPLATE_VALIDATION_FAILED'
  })
  code: string;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Template validation failed: Required field "title" is missing'
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Additional error details',
    example: {
      validationErrors: ['title is required', 'date format is invalid'],
      fieldErrors: { title: 'Field is required' }
    }
  })
  details?: any;

  @ApiPropertyOptional({
    description: 'Error stack trace (development mode only)',
    example: 'Error: Template validation failed\n    at TemplateProcessor.process...'
  })
  stack?: string;

  @ApiProperty({
    description: 'Whether the error is recoverable through retry',
    example: false
  })
  recoverable: boolean;
}

/**
 * Processing metrics response DTO
 */
export class ProcessingMetricsResponseDto {
  @ApiProperty({
    description: 'Total processing time in milliseconds',
    example: 2547
  })
  processingTimeMs: number;

  @ApiProperty({
    description: 'Template rendering time in milliseconds',
    example: 1234
  })
  templateRenderTimeMs: number;

  @ApiProperty({
    description: 'Format conversion time in milliseconds',
    example: 856
  })
  formatConversionTimeMs: number;

  @ApiProperty({
    description: 'Output document size in bytes',
    example: 1048576
  })
  outputSizeBytes: number;

  @ApiProperty({
    description: 'Memory usage during processing in MB',
    example: 45.7
  })
  memoryUsageMB: number;

  @ApiProperty({
    description: 'CPU usage percentage during processing',
    example: 23.5
  })
  cpuUsagePercent: number;
}

/**
 * Main document generation response DTO
 */
export class DocumentGenerationResponseDto {
  @ApiProperty({
    description: 'Unique result identifier',
    example: 'result_req_1234567890_abcdef123'
  })
  id: string;

  @ApiProperty({
    description: 'Original request identifier',
    example: 'req_1234567890_abcdef123'
  })
  requestId: string;

  @ApiProperty({
    description: 'Current processing status',
    enum: ProcessingStatus,
    example: ProcessingStatus.COMPLETED
  })
  status: ProcessingStatus;

  @ApiPropertyOptional({
    description: 'Generated document (available when status is COMPLETED)',
    type: GeneratedDocumentResponseDto
  })
  document?: GeneratedDocumentResponseDto;

  @ApiPropertyOptional({
    description: 'Error information (available when status is FAILED)',
    type: ProcessingErrorResponseDto
  })
  error?: ProcessingErrorResponseDto;

  @ApiProperty({
    description: 'Processing performance metrics',
    type: ProcessingMetricsResponseDto
  })
  metrics: ProcessingMetricsResponseDto;

  @ApiProperty({
    description: 'Request creation timestamp',
    example: '2024-09-22T16:25:00.000Z'
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Processing completion timestamp',
    example: '2024-09-22T16:30:00.000Z'
  })
  completedAt?: Date;
}

/**
 * Processing progress information DTO
 */
export class ProcessingProgressDto {
  @ApiProperty({
    description: 'Completion percentage (0-100)',
    example: 75.5
  })
  percentage: number;

  @ApiProperty({
    description: 'Current processing step description',
    example: 'Converting to PDF format'
  })
  currentStep: string;

  @ApiPropertyOptional({
    description: 'Estimated time remaining in milliseconds',
    example: 5000
  })
  estimatedTimeRemainingMs?: number;
}

/**
 * Processing status response DTO
 */
export class ProcessingStatusResponseDto {
  @ApiProperty({
    description: 'Request identifier',
    example: 'req_1234567890_abcdef123'
  })
  requestId: string;

  @ApiProperty({
    description: 'Current processing status',
    enum: ProcessingStatus,
    example: ProcessingStatus.PROCESSING
  })
  status: ProcessingStatus;

  @ApiPropertyOptional({
    description: 'Processing progress information (available when status is PROCESSING)',
    type: ProcessingProgressDto
  })
  progress?: ProcessingProgressDto;

  @ApiPropertyOptional({
    description: 'Generated document (available when status is COMPLETED)',
    type: GeneratedDocumentResponseDto
  })
  document?: GeneratedDocumentResponseDto;

  @ApiPropertyOptional({
    description: 'Error information (available when status is FAILED)',
    type: ProcessingErrorResponseDto
  })
  error?: ProcessingErrorResponseDto;

  @ApiProperty({
    description: 'Processing performance metrics',
    type: ProcessingMetricsResponseDto
  })
  metrics: ProcessingMetricsResponseDto;

  @ApiProperty({
    description: 'Request creation timestamp',
    example: '2024-09-22T16:25:00.000Z'
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Processing completion timestamp',
    example: '2024-09-22T16:30:00.000Z'
  })
  completedAt?: Date;
}

/**
 * Batch processing progress DTO
 */
export class BatchProgressResponseDto {
  @ApiProperty({
    description: 'Total number of items in batch',
    example: 50
  })
  total: number;

  @ApiProperty({
    description: 'Number of completed items',
    example: 42
  })
  completed: number;

  @ApiProperty({
    description: 'Number of failed items',
    example: 3
  })
  failed: number;

  @ApiProperty({
    description: 'Number of pending items',
    example: 5
  })
  pending: number;

  @ApiProperty({
    description: 'Overall completion percentage',
    example: 84.0
  })
  percentComplete: number;

  @ApiPropertyOptional({
    description: 'Estimated time remaining for batch completion',
    example: 15000
  })
  estimatedTimeRemainingMs?: number;
}

/**
 * Batch processing job response DTO
 */
export class BatchProcessingResponseDto {
  @ApiProperty({
    description: 'Unique batch job identifier',
    example: 'batch_1234567890_abcdef123'
  })
  id: string;

  @ApiProperty({
    description: 'Human-readable batch job name',
    example: 'Monthly Reports Batch'
  })
  name: string;

  @ApiProperty({
    description: 'Batch processing status',
    enum: ProcessingStatus,
    example: ProcessingStatus.PROCESSING
  })
  status: ProcessingStatus;

  @ApiProperty({
    description: 'Batch processing progress',
    type: BatchProgressResponseDto
  })
  progress: BatchProgressResponseDto;

  @ApiProperty({
    description: 'Array of individual generation results',
    type: [DocumentGenerationResponseDto]
  })
  results: DocumentGenerationResponseDto[];

  @ApiProperty({
    description: 'Batch job creation timestamp',
    example: '2024-09-22T16:25:00.000Z'
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Batch processing start timestamp',
    example: '2024-09-22T16:25:30.000Z'
  })
  startedAt?: Date;

  @ApiPropertyOptional({
    description: 'Batch processing completion timestamp',
    example: '2024-09-22T16:35:45.000Z'
  })
  completedAt?: Date;

  @ApiProperty({
    description: 'User who created the batch job',
    example: 'user_12345'
  })
  createdBy: string;
}