/**
 * Enhanced Job Result DTOs - Enterprise-Grade Result Management
 *
 * Comprehensive data transfer objects for advanced job result handling,
 * streaming capabilities, compression optimization, and metadata tracking.
 *
 * Features:
 * - Large result streaming with resumable downloads
 * - Intelligent compression with algorithm selection
 * - Result format conversion and export capabilities
 * - Comprehensive metadata and storage information
 * - Checksum verification and data integrity
 * - Multi-format support (JSON, binary, text, stream)
 *
 * @author Claude Code - Job Management Specialist
 * @version 1.0.0
 */

import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  Max,
  IsUrl,
} from 'class-validator';import { Type } from 'class-transformer';import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';import { JobStatus } from './async-job.dto';/*** Result storage and compression information
 */
export class ResultStorageInfoDto {
  @ApiProperty({
    description: 'Unique result identifier',example: 'result_1702983456789_xyz890',})@IsString()
  @IsUUID('4')resultId: string = '';@ApiProperty({description: 'Original result size in bytes',example: 2048576,})
  @IsNumber()
  @Min(0)
  size: number = 0;

  @ApiProperty({
    description: 'Whether result data is compressed',example: true,})
  @IsBoolean()
  compressed: boolean = false;

  @ApiPropertyOptional({
    description: 'Compression ratio (original/compressed)',example: 3.2,})
  @IsOptional()
  @IsNumber()
  @Min(1)
  compressionRatio?: number;

  @ApiProperty({
    description: 'Result data format',enum: ['json', 'binary', 'text', 'stream'],example: 'json',})@IsEnum(['json', 'binary', 'text', 'stream'])format: string = 'json';@ApiProperty({description: 'Content type/MIME type',example: 'application/json',})@IsString()
  contentType: string = '';@ApiProperty({description: 'Data integrity checksum (SHA-256)',example: 'a1b2c3d4e5f6789012345678901234567890abcdef',})@IsString()
  checksum: string = '';@ApiPropertyOptional({description: 'Number of chunks for streaming results',example: 25,})
  @IsOptional()
  @IsNumber()
  @Min(1)
  chunks?: number;

  @ApiProperty({
    description: 'Storage location identifier',example: 'bytebot:job:result:job_1702983456789_abc123',})@IsString()
  storageLocation: string = '';@ApiPropertyOptional({description: 'Encryption information',type: Object,})
  @IsOptional()
  @IsObject()
  encryption?: {
    algorithm: string;
    keyId: string;
  };

  @ApiProperty({
    description: 'Result creation timestamp',example: '2023-12-19T10:31:15.789Z',})@IsDateString()
  createdAt: string = '';@ApiProperty({description: 'Result expiration timestamp',example: '2023-12-26T10:31:15.789Z',})@IsDateString()
  expiresAt: string = '';@ApiPropertyOptional({description: 'Additional storage metadata',example: {storageType: 'redis',compressionAlgorithm: 'gzip',originalFormat: 'json',},})
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Streaming configuration for large results
 */
export class StreamingConfigDto {
  @ApiProperty({
    description: 'Chunk size in bytes for streaming',example: 1048576,})
  @IsNumber()
  @Min(1024)
  chunkSize: number = 1048576; // 1MB default

  @ApiProperty({
    description: 'Maximum concurrent chunks for parallel download',example: 5,})
  @IsNumber()
  @Min(1)
  @Max(20)
  maxConcurrentChunks: number = 5;

  @ApiProperty({
    description: 'Whether compression is enabled for streaming',example: true,})
  @IsBoolean()
  compressionEnabled: boolean = true;

  @ApiProperty({
    description: 'Support for resumable downloads',example: true,})
  @IsBoolean()
  resumableDownloads: boolean = true;

  @ApiProperty({
    description: 'Whether to cache chunks',example: false,})
  @IsBoolean()
  cacheChunks: boolean = false;

  @ApiProperty({
    description: 'Streaming threshold in megabytes',example: 5,})
  @IsNumber()
  @Min(1)
  streamingThresholdMB: number = 5;
}

/**
 * Enhanced job result response with comprehensive metadata
 */
export class EnhancedJobResultResponseDto {
  @ApiProperty({
    description: 'Unique job identifier',example: 'job_1702983456789_abc123',})@IsString()
  @IsUUID('4')jobId: string = '';@ApiProperty({description: 'Final job status',enum: JobStatus,example: JobStatus.COMPLETED,
  })
  @IsEnum(JobStatus)
  status: JobStatus = JobStatus.COMPLETED;

  @ApiPropertyOptional({
    description: 'Job execution result data (for non-streaming results)',example: {screenshot: 'base64-encoded-image-data',elementFound: true,coordinates: { x: 150, y: 200 },
    },
  })
  @IsOptional()
  result?: unknown;

  @ApiProperty({
    description: 'Result storage and metadata information',type: ResultStorageInfoDto,})
  @ValidateNested()
  @Type(() => ResultStorageInfoDto)
  storageInfo: ResultStorageInfoDto = new ResultStorageInfoDto();

  @ApiPropertyOptional({
    description: 'Error message if job failed',example: 'Screenshot capture failed: Display not available',})@IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiProperty({
    description: 'Job submission timestamp',example: '2023-12-19T10:30:45.789Z',})@IsDateString()
  submittedAt: string = '';@ApiProperty({description: 'Job completion timestamp',example: '2023-12-19T10:31:15.789Z',})@IsDateString()
  completedAt: string = '';@ApiProperty({description: 'Total execution time in milliseconds',example: 30123,})
  @IsNumber()
  @Min(0)
  executionTimeMs: number = 0;

  @ApiProperty({
    description: 'Job execution duration in milliseconds',example: 1250,})
  @IsNumber()
  @Min(0)
  duration: number = 0;

  @ApiPropertyOptional({
    description: 'Result processing metrics',type: Object,})
  @IsOptional()
  @IsObject()
  processingMetrics?: {
    compressionTimeMs: number;
    compressionRatio: number;
    checksumVerificationMs: number;
    storageTimeMs: number;
  };

  @ApiPropertyOptional({
    description: 'Additional result metadata',example: {retryCount: 0,
      cacheHit: false,
      originalFormat: 'image/png',quality: 'high',},})
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Download URLs for streaming results',type: [String],})
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  downloadUrls?: string[];

  @ApiPropertyOptional({
    description: 'Alternative result formats available',example: ['json', 'csv', 'xml'],})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableFormats?: string[];
}

/**
 * Streaming result chunk information
 */
export class ResultChunkInfoDto {
  @ApiProperty({
    description: 'Chunk index (0-based)',example: 5,})
  @IsNumber()
  @Min(0)
  chunkIndex: number = 0;

  @ApiProperty({
    description: 'Total number of chunks',example: 25,})
  @IsNumber()
  @Min(1)
  totalChunks: number = 1;

  @ApiProperty({
    description: 'Chunk size in bytes',example: 1048576,})
  @IsNumber()
  @Min(1)
  chunkSize: number = 0;

  @ApiProperty({
    description: 'Chunk data checksum',example: 'b2c3d4e5f6789012345678901234567890abcdef1',})@IsString()
  checksum: string = '';@ApiPropertyOptional({description: 'Download URL for this specific chunk',example: 'https://api.bytebot.com/jobs/job_123/result/chunks/5',})@IsOptional()
  @IsUrl()
  downloadUrl?: string;

  @ApiProperty({
    description: 'Whether this chunk is compressed',example: true,})
  @IsBoolean()
  compressed: boolean = false;

  @ApiProperty({
    description: 'Chunk creation timestamp',example: '2023-12-19T10:31:15.789Z',})@IsDateString()
  createdAt: string = '';}/**
 * Result download request configuration
 */
export class ResultDownloadRequestDto {
  @ApiProperty({
    description: 'Job identifier',example: 'job_1702983456789_abc123',})@IsString()
  @IsUUID('4')jobId: string = '';@ApiPropertyOptional({description: 'Preferred result format',enum: ['json', 'binary', 'text', 'original'],example: 'json',default: 'original',})@IsOptional()
  @IsEnum(['json', 'binary', 'text', 'original'])format?: string = 'original';@ApiPropertyOptional({description: 'Whether to enable compression for download',example: true,default: true,
  })
  @IsOptional()
  @IsBoolean()
  compress?: boolean = true;

  @ApiPropertyOptional({
    description: 'Chunk range for partial downloads (streaming)',type: Object,})
  @IsOptional()
  @IsObject()
  chunkRange?: {
    start: number;
    end: number;
  };

  @ApiPropertyOptional({
    description: 'Custom download headers and options',example: {'Content-Disposition': 'attachment; filename="result.json"",'Cache-Control': 'no-cache',},})
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Download expiration time in seconds',example: 3600,default: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(86400)
  expirationSeconds?: number = 3600;
}

/**
 * Result download response with URLs and metadata
 */
export class ResultDownloadResponseDto {
  @ApiProperty({
    description: 'Job identifier',example: 'job_1702983456789_abc123',})@IsString()
  @IsUUID('4')jobId: string = '';@ApiProperty({description: 'Download URL for the result',example: 'https://api.bytebot.com/jobs/job_123/result/download?token=abc123',})@IsUrl()
  downloadUrl: string = '';@ApiProperty({description: 'Result storage information',type: ResultStorageInfoDto,})
  @ValidateNested()
  @Type(() => ResultStorageInfoDto)
  storageInfo: ResultStorageInfoDto = new ResultStorageInfoDto();

  @ApiProperty({
    description: 'URL expiration timestamp',example: '2023-12-19T11:31:15.789Z',})@IsDateString()
  expiresAt: string = '';@ApiPropertyOptional({description: 'Chunk information for streaming downloads',type: [ResultChunkInfoDto],})
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultChunkInfoDto)
  chunks?: ResultChunkInfoDto[];

  @ApiProperty({
    description: 'Streaming configuration if applicable',type: StreamingConfigDto,})
  @ValidateNested()
  @Type(() => StreamingConfigDto)
  streamingConfig: StreamingConfigDto = new StreamingConfigDto();

  @ApiPropertyOptional({
    description: 'Suggested download client configuration',type: Object,})
  @IsOptional()
  @IsObject()
  clientConfig?: {
    retryAttempts: number;
    retryDelayMs: number;
    verifyChecksum: boolean;
    resumeSupport: boolean;
  };
}

/**
 * Result export request for format conversion
 */
export class ResultExportRequestDto {
  @ApiProperty({
    description: 'Job identifier',example: 'job_1702983456789_abc123',})@IsString()
  @IsUUID('4')jobId: string = '';@ApiProperty({description: 'Target export format',enum: ['json', 'csv', 'xml', 'excel', 'pdf', 'text'],example: 'csv',})@IsEnum(['json', 'csv', 'xml', 'excel', 'pdf', 'text'])targetFormat: string = '';@ApiPropertyOptional({description: 'Export configuration options',example: {includeHeaders: true,
      delimiter: ',',encoding: 'utf-8',dateFormat: 'ISO',},})
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Custom filename for export',example: 'job-results-2023-12-19.csv',})@IsOptional()
  @IsString()
  filename?: string;

  @ApiPropertyOptional({
    description: 'Whether to compress the exported file',example: true,default: false,
  })
  @IsOptional()
  @IsBoolean()
  compress?: boolean = false;
}

/**
 * Result export response with download information
 */
export class ResultExportResponseDto {
  @ApiProperty({
    description: 'Job identifier',example: 'job_1702983456789_abc123',})@IsString()
  @IsUUID('4')jobId: string = '';@ApiProperty({description: 'Export format',example: 'csv',})@IsString()
  format: string = '';@ApiProperty({description: 'Download URL for exported file',example: 'https://api.bytebot.com/exports/export_456/download',})@IsUrl()
  downloadUrl: string = '';@ApiProperty({description: 'Exported file size in bytes',example: 524288,})
  @IsNumber()
  @Min(0)
  fileSize: number = 0;

  @ApiProperty({
    description: 'Export filename',example: 'job-results-2023-12-19.csv',})@IsString()
  filename: string = '';@ApiProperty({description: 'File MIME type',example: 'text/csv',})@IsString()
  mimeType: string = '';@ApiProperty({description: 'Export creation timestamp',example: '2023-12-19T10:31:15.789Z',})@IsDateString()
  createdAt: string = '';@ApiProperty({description: 'Export expiration timestamp',example: '2023-12-19T12:31:15.789Z',})@IsDateString()
  expiresAt: string = '';@ApiPropertyOptional({description: 'Export processing metrics',type: Object,})
  @IsOptional()
  @IsObject()
  processingMetrics?: {
    conversionTimeMs: number;
    originalSize: number;
    convertedSize: number;
    compressionRatio?: number;
  };

  @ApiPropertyOptional({
    description: 'Export metadata and options used',example: {includeHeaders: true,
      delimiter: ',',recordCount: 1500,encoding: 'utf-8',},})
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Bulk result retrieval request
 */
export class BulkResultRequestDto {
  @ApiProperty({
    description: 'List of job IDs to retrieve results for',example: ['job_1702983456789_abc123', 'job_1702983456790_def456'],})@IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })jobIds: string[] = [];@ApiPropertyOptional({
    description: 'Include full result data (not recommended for large results)',example: false,default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeResultData?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include storage metadata',example: true,default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeStorageInfo?: boolean = true;

  @ApiPropertyOptional({
    description: 'Preferred result format for included data',enum: ['json', 'summary'],example: 'summary',default: 'summary',})@IsOptional()
  @IsEnum(['json', 'summary'])resultFormat?: string = 'summary';@ApiPropertyOptional({description: 'Maximum total response size in MB',example: 50,default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  maxResponseSizeMB?: number = 50;
}

/**
 * Bulk result retrieval response
 */
export class BulkResultResponseDto {
  @ApiProperty({
    description: 'Result entries for requested jobs',type: [EnhancedJobResultResponseDto],})
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnhancedJobResultResponseDto)
  results: EnhancedJobResultResponseDto[] = [];

  @ApiProperty({
    description: 'Request processing timestamp',example: '2023-12-19T10:31:15.789Z',})@IsDateString()
  timestamp: string = '';@ApiProperty({description: 'Total jobs requested',example: 5,})
  @IsNumber()
  @Min(0)
  totalRequested: number = 0;

  @ApiProperty({
    description: 'Total results found',example: 4,})
  @IsNumber()
  @Min(0)
  totalFound: number = 0;

  @ApiPropertyOptional({
    description: 'Job IDs not found or without results',example: ['job_1702983456791_ghi789'],})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  notFound?: string[];

  @ApiProperty({
    description: 'Total response size in bytes',example: 2048576,})
  @IsNumber()
  @Min(0)
  totalSizeBytes: number = 0;

  @ApiProperty({
    description: 'Query execution time in milliseconds',example: 250,})
  @IsNumber()
  @Min(0)
  executionTimeMs: number = 0;

  @ApiPropertyOptional({
    description: 'Results that exceeded size limits',example: ['job_1702983456792_jkl012'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  truncatedResults?: string[];
}