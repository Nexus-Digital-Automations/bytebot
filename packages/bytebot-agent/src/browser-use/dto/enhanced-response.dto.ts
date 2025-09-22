/**
 * Enhanced Response DTOs - Standardized API Response Handling
 *
 * This module provides comprehensive Data Transfer Objects for API responses
 * with standardized error handling, monitoring, and enterprise-grade response
 * structures. Ensures consistent response formats across all browser automation endpoints.
 *
 * @fileoverview Enhanced response DTOs with standardized error handling
 * @version 2.0.0
 * @author DTO & Validation Agent
 * @since Browser-Use API Endpoints Implementation
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsUUID,
  IsPositive,
  IsDate,
  IsISO8601,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard response status codes
 */
export enum ResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  PARTIAL = 'partial',
  PENDING = 'pending',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error categories for systematic handling
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  SECURITY = 'security',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  CONFIGURATION = 'configuration',
  RATE_LIMIT = 'rate_limit',
  MAINTENANCE = 'maintenance',
  UNKNOWN = 'unknown',
}

/**
 * Response priority levels
 */
export enum ResponsePriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low',
}

/**
 * Performance metrics for response analysis
 */
export class ResponsePerformanceMetrics {
  @ApiProperty({
    description: 'Total request processing time in milliseconds',
    minimum: 0,
  })
  @IsNumber({}, { message: 'Processing time must be a number' })
  @Min(0, { message: 'Processing time must be non-negative' })
  processingTimeMs!: number;

  @ApiProperty({
    description: 'Database query time in milliseconds',
    minimum: 0,
  })
  @IsNumber({}, { message: 'Database time must be a number' })
  @Min(0, { message: 'Database time must be non-negative' })
  databaseTimeMs!: number;

  @ApiProperty({
    description: 'External service call time in milliseconds',
    minimum: 0,
  })
  @IsNumber({}, { message: 'External service time must be a number' })
  @Min(0, { message: 'External service time must be non-negative' })
  externalServiceTimeMs!: number;

  @ApiProperty({
    description: 'Validation time in milliseconds',
    minimum: 0,
  })
  @IsNumber({}, { message: 'Validation time must be a number' })
  @Min(0, { message: 'Validation time must be non-negative' })
  validationTimeMs!: number;

  @ApiProperty({
    description: 'Serialization time in milliseconds',
    minimum: 0,
  })
  @IsNumber({}, { message: 'Serialization time must be a number' })
  @Min(0, { message: 'Serialization time must be non-negative' })
  serializationTimeMs!: number;

  @ApiProperty({
    description: 'Memory usage in MB',
    minimum: 0,
  })
  @IsNumber({}, { message: 'Memory usage must be a number' })
  @Min(0, { message: 'Memory usage must be non-negative' })
  memoryUsageMB!: number;

  @ApiProperty({
    description: 'CPU usage percentage',
    minimum: 0,
    maximum: 100,
  })
  @IsNumber({}, { message: 'CPU usage must be a number' })
  @Min(0, { message: 'CPU usage must be non-negative' })
  @Max(100, { message: 'CPU usage cannot exceed 100%' })
  cpuUsagePercent!: number;

  @ApiPropertyOptional({
    description: 'Cache hit ratio',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Cache hit ratio must be a number' })
  @Min(0, { message: 'Cache hit ratio must be non-negative' })
  @Max(1, { message: 'Cache hit ratio cannot exceed 1' })
  cacheHitRatio?: number;

  @ApiPropertyOptional({
    description: 'Number of retry attempts',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Retry attempts must be a number' })
  @Min(0, { message: 'Retry attempts must be non-negative' })
  retryAttempts?: number;
}

/**
 * Detailed error information structure
 */
export class EnhancedErrorDetails {
  @ApiProperty({
    description: 'Error code for programmatic handling',
    example: 'VALIDATION_FAILED',
  })
  @IsString({ message: 'Error code must be a string' })
  @MinLength(1, { message: 'Error code cannot be empty' })
  @MaxLength(100, { message: 'Error code too long' })
  code!: string;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'The provided URL format is invalid',
  })
  @IsString({ message: 'Error message must be a string' })
  @MinLength(1, { message: 'Error message cannot be empty' })
  @MaxLength(1000, { message: 'Error message too long' })
  message!: string;

  @ApiProperty({
    description: 'Error category for systematic handling',
    enum: ErrorCategory,
  })
  @IsEnum(ErrorCategory, { message: 'Invalid error category' })
  category!: ErrorCategory;

  @ApiProperty({
    description: 'Error severity level',
    enum: ErrorSeverity,
  })
  @IsEnum(ErrorSeverity, { message: 'Invalid error severity' })
  severity!: ErrorSeverity;

  @ApiProperty({
    description: 'Error occurrence timestamp',
  })
  @IsDate({ message: 'Timestamp must be a valid date' })
  timestamp!: Date;

  @ApiPropertyOptional({
    description: 'Whether this error is recoverable',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Recoverable flag must be boolean' })
  recoverable?: boolean = false;

  @ApiPropertyOptional({
    description: 'Field-specific validation errors',
    type: [Object],
  })
  @IsOptional()
  @IsArray({ message: 'Validation errors must be an array' })
  validationErrors?: Array<{
    field: string;
    value: unknown;
    message: string;
    constraint: string;
    code: string;
  }>;

  @ApiPropertyOptional({
    description: 'Stack trace for debugging (dev environments only)',
  })
  @IsOptional()
  @IsString({ message: 'Stack trace must be a string' })
  stackTrace?: string;

  @ApiPropertyOptional({
    description: 'Additional error context',
  })
  @IsOptional()
  @IsObject({ message: 'Error context must be an object' })
  context?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Related error identifiers',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Related errors must be an array' })
  @IsString({ each: true, message: 'Each related error must be a string' })
  relatedErrors?: string[];

  @ApiPropertyOptional({
    description: 'Error resolution suggestions',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Resolution steps must be an array' })
  @IsString({ each: true, message: 'Each resolution step must be a string' })
  resolutionSteps?: string[];

  @ApiPropertyOptional({
    description: 'Documentation links for error resolution',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Documentation links must be an array' })
  @IsString({ each: true, message: 'Each documentation link must be a string' })
  documentationLinks?: string[];

  @ApiPropertyOptional({
    description: 'Support contact information',
  })
  @IsOptional()
  @IsObject()
  supportContact?: {
    email?: string;
    phone?: string;
    chatUrl?: string;
    ticketUrl?: string;
  };
}

/**
 * Warning information structure
 */
export class WarningDetails {
  @ApiProperty({
    description: 'Warning code',
    example: 'DEPRECATED_FEATURE',
  })
  @IsString({ message: 'Warning code must be a string' })
  @MinLength(1, { message: 'Warning code cannot be empty' })
  @MaxLength(100, { message: 'Warning code too long' })
  code!: string;

  @ApiProperty({
    description: 'Warning message',
    example: 'This feature will be deprecated in v2.0',
  })
  @IsString({ message: 'Warning message must be a string' })
  @MinLength(1, { message: 'Warning message cannot be empty' })
  @MaxLength(500, { message: 'Warning message too long' })
  message!: string;

  @ApiProperty({
    description: 'Warning severity',
    enum: ['info', 'warning', 'deprecated'],
  })
  @IsEnum(['info', 'warning', 'deprecated'], { message: 'Invalid warning severity' })
  severity!: string;

  @ApiPropertyOptional({
    description: 'Additional warning context',
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

/**
 * API response metadata
 */
export class ResponseMetadata {
  @ApiProperty({
    description: 'API version used for this response',
    example: 'v2.0.0',
  })
  @IsString({ message: 'API version must be a string' })
  @Matches(/^v\d+\.\d+\.\d+$/, { message: 'Invalid API version format' })
  apiVersion!: string;

  @ApiProperty({
    description: 'Unique request identifier for tracing',
  })
  @IsUUID(4, { message: 'Invalid request ID format' })
  requestId!: string;

  @ApiProperty({
    description: 'Unique correlation ID for request tracking',
  })
  @IsUUID(4, { message: 'Invalid correlation ID format' })
  correlationId!: string;

  @ApiProperty({
    description: 'Response generation timestamp',
  })
  @IsISO8601({}, { message: 'Invalid timestamp format' })
  timestamp!: string;

  @ApiPropertyOptional({
    description: 'Server node that processed the request',
    example: 'node-01-us-west',
  })
  @IsOptional()
  @IsString({ message: 'Server node must be a string' })
  @MaxLength(100, { message: 'Server node name too long' })
  serverNode?: string;

  @ApiPropertyOptional({
    description: 'Response priority level',
    enum: ResponsePriority,
    default: ResponsePriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(ResponsePriority, { message: 'Invalid response priority' })
  priority?: ResponsePriority = ResponsePriority.NORMAL;

  @ApiPropertyOptional({
    description: 'Request processing environment',
    enum: ['development', 'staging', 'production'],
  })
  @IsOptional()
  @IsEnum(['development', 'staging', 'production'], { message: 'Invalid environment' })
  environment?: string;

  @ApiPropertyOptional({
    description: 'Response rate limiting information',
  })
  @IsOptional()
  @IsObject()
  rateLimiting?: {
    limit: number;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
  };

  @ApiPropertyOptional({
    description: 'Response caching information',
  })
  @IsOptional()
  @IsObject()
  caching?: {
    cacheable: boolean;
    maxAge?: number;
    etag?: string;
    lastModified?: Date;
  };
}

/**
 * Pagination information for list responses
 */
export class PaginationInfo {
  @ApiProperty({
    description: 'Current page number (1-based)',
    minimum: 1,
  })
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page!: number;

  @ApiProperty({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 1000,
  })
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(1000, { message: 'Limit cannot exceed 1000' })
  limit!: number;

  @ApiProperty({
    description: 'Total number of items available',
    minimum: 0,
  })
  @IsNumber({}, { message: 'Total must be a number' })
  @Min(0, { message: 'Total must be non-negative' })
  total!: number;

  @ApiProperty({
    description: 'Total number of pages',
    minimum: 0,
  })
  @IsNumber({}, { message: 'Total pages must be a number' })
  @Min(0, { message: 'Total pages must be non-negative' })
  totalPages!: number;

  @ApiProperty({
    description: 'Whether there are more pages after current',
  })
  @IsBoolean({ message: 'Has next must be boolean' })
  hasNext!: boolean;

  @ApiProperty({
    description: 'Whether there are pages before current',
  })
  @IsBoolean({ message: 'Has previous must be boolean' })
  hasPrevious!: boolean;

  @ApiPropertyOptional({
    description: 'URL for next page',
  })
  @IsOptional()
  @IsString({ message: 'Next URL must be a string' })
  nextUrl?: string;

  @ApiPropertyOptional({
    description: 'URL for previous page',
  })
  @IsOptional()
  @IsString({ message: 'Previous URL must be a string' })
  previousUrl?: string;

  @ApiPropertyOptional({
    description: 'Cursor for cursor-based pagination',
  })
  @IsOptional()
  @IsString({ message: 'Cursor must be a string' })
  cursor?: string;
}

/**
 * Base Enhanced Response DTO
 */
export class BaseEnhancedResponseDto<T = any> {
  @ApiProperty({
    description: 'Response status',
    enum: ResponseStatus,
  })
  @IsEnum(ResponseStatus, { message: 'Invalid response status' })
  status!: ResponseStatus;

  @ApiProperty({
    description: 'Whether the operation was successful',
  })
  @IsBoolean({ message: 'Success flag must be boolean' })
  success!: boolean;

  @ApiProperty({
    description: 'Human-readable response message',
    example: 'Operation completed successfully',
  })
  @IsString({ message: 'Message must be a string' })
  @MinLength(1, { message: 'Message cannot be empty' })
  @MaxLength(500, { message: 'Message too long' })
  message!: string;

  @ApiPropertyOptional({
    description: 'Response data payload',
  })
  @IsOptional()
  data?: T;

  @ApiProperty({
    description: 'Response metadata',
  })
  @ValidateNested()
  @Type(() => ResponseMetadata)
  metadata!: ResponseMetadata;

  @ApiProperty({
    description: 'Performance metrics',
  })
  @ValidateNested()
  @Type(() => ResponsePerformanceMetrics)
  performance!: ResponsePerformanceMetrics;

  @ApiPropertyOptional({
    description: 'Error details if operation failed',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EnhancedErrorDetails)
  error?: EnhancedErrorDetails;

  @ApiPropertyOptional({
    description: 'Warning information',
    type: [WarningDetails],
  })
  @IsOptional()
  @IsArray({ message: 'Warnings must be an array' })
  @ValidateNested({ each: true })
  @Type(() => WarningDetails)
  warnings?: WarningDetails[];

  @ApiPropertyOptional({
    description: 'Pagination information for list responses',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaginationInfo)
  pagination?: PaginationInfo;

  @ApiPropertyOptional({
    description: 'Related resource links',
  })
  @IsOptional()
  @IsObject()
  links?: {
    self?: string;
    related?: string;
    documentation?: string;
    support?: string;
  };

  @ApiPropertyOptional({
    description: 'Debug information (development environments only)',
  })
  @IsOptional()
  @IsObject()
  debug?: {
    queries?: string[];
    middlewareStack?: string[];
    additionalMetrics?: Record<string, unknown>;
  };
}

/**
 * List Response DTO with pagination
 */
export class EnhancedListResponseDto<T = any> extends BaseEnhancedResponseDto<T[]> {
  @ApiProperty({
    description: 'Array of items',
    isArray: true,
  })
  @IsArray({ message: 'Items must be an array' })
  items!: T[];

  @ApiProperty({
    description: 'Pagination information',
  })
  @ValidateNested()
  @Type(() => PaginationInfo)
  pagination!: PaginationInfo;

  @ApiPropertyOptional({
    description: 'Filtering information applied',
  })
  @IsOptional()
  @IsObject()
  filters?: {
    applied: Record<string, unknown>;
    available: string[];
    total: number;
  };

  @ApiPropertyOptional({
    description: 'Sorting information applied',
  })
  @IsOptional()
  @IsObject()
  sorting?: {
    field: string;
    direction: 'asc' | 'desc';
    available: string[];
  };
}

/**
 * Create/Update Response DTO
 */
export class CreateUpdateResponseDto<T = any> extends BaseEnhancedResponseDto<T> {
  @ApiProperty({
    description: 'Created/updated resource identifier',
  })
  @IsString({ message: 'Resource ID must be a string' })
  resourceId!: string;

  @ApiProperty({
    description: 'Resource type',
    example: 'browser-task',
  })
  @IsString({ message: 'Resource type must be a string' })
  resourceType!: string;

  @ApiPropertyOptional({
    description: 'Resource version (for optimistic locking)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Version must be a number' })
  version?: number;

  @ApiPropertyOptional({
    description: 'Validation results',
  })
  @IsOptional()
  @IsObject()
  validation?: {
    passed: boolean;
    warnings: string[];
    info: string[];
  };
}

/**
 * Delete Response DTO
 */
export class DeleteResponseDto extends BaseEnhancedResponseDto<void> {
  @ApiProperty({
    description: 'Deleted resource identifier',
  })
  @IsString({ message: 'Resource ID must be a string' })
  deletedId!: string;

  @ApiProperty({
    description: 'Resource type that was deleted',
    example: 'browser-session',
  })
  @IsString({ message: 'Resource type must be a string' })
  resourceType!: string;

  @ApiPropertyOptional({
    description: 'Cascade deletion information',
  })
  @IsOptional()
  @IsObject()
  cascadeInfo?: {
    relatedResourcesDeleted: number;
    affectedTables: string[];
    cleanupTasks: string[];
  };
}

/**
 * Status/Health Check Response DTO
 */
export class StatusResponseDto extends BaseEnhancedResponseDto<any> {
  @ApiProperty({
    description: 'Overall system health status',
    enum: ['healthy', 'warning', 'critical', 'maintenance'],
  })
  @IsEnum(['healthy', 'warning', 'critical', 'maintenance'], { message: 'Invalid health status' })
  healthStatus!: string;

  @ApiProperty({
    description: 'Individual component statuses',
    type: [Object],
  })
  @IsArray({ message: 'Components must be an array' })
  components!: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'critical' | 'unknown';
    message?: string;
    lastChecked: Date;
    responseTime?: number;
  }>;

  @ApiPropertyOptional({
    description: 'System uptime in seconds',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Uptime must be a number' })
  @Min(0, { message: 'Uptime must be non-negative' })
  uptimeSeconds?: number;

  @ApiPropertyOptional({
    description: 'Current system load metrics',
  })
  @IsOptional()
  @IsObject()
  systemLoad?: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    activeConnections: number;
  };
}

// Export enhanced response DTOs
export {
  ResponseStatus,
  ErrorSeverity,
  ErrorCategory,
  ResponsePriority,
  ResponsePerformanceMetrics,
  EnhancedErrorDetails,
  WarningDetails,
  ResponseMetadata,
  PaginationInfo,
};