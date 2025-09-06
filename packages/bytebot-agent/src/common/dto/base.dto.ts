/**
 * Base DTO Classes - Enterprise API Validation Foundation
 *
 * This module provides base DTO classes with comprehensive validation rules,
 * security constraints, and standardized response formats for the Bytebot API.
 * All endpoint-specific DTOs should extend these base classes.
 *
 * @fileoverview Base DTO classes with enterprise validation standards
 * @version 1.0.0
 * @author API Security & Documentation Specialist
 */

import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDate,
  IsEnum,
  IsUUID,
  IsArray,
  IsObject,
  Min,
  Max,
  Length,
  Matches,
  ValidateNested,
  IsNotEmpty,
  IsEmail,
  IsUrl,
  Transform,
  Type,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform as ClassTransform } from 'class-transformer';

/**
 * Standard HTTP status codes for API responses
 */
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
}

/**
 * API response status enumeration
 */
export enum ResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
}

/**
 * Base metadata for all API responses
 */
export class ResponseMetadata {
  @ApiProperty({
    description: 'Timestamp of the response',
    example: '2025-01-15T10:30:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  @Expose()
  timestamp: Date = new Date();

  @ApiProperty({
    description: 'Unique request identifier for tracking',
    example: 'req_1234567890abcdef',
    pattern: '^req_[a-f0-9]{16}$',
  })
  @IsString()
  @Matches(/^req_[a-f0-9]{16}$/, {
    message: 'Invalid request ID format',
  })
  @Expose()
  requestId: string;

  @ApiProperty({
    description: 'API version that processed this request',
    example: 'v1',
    enum: ['v1', 'v2'],
  })
  @IsString()
  @IsEnum(['v1', 'v2'])
  @Expose()
  version: string = 'v1';

  @ApiPropertyOptional({
    description: 'Response processing time in milliseconds',
    example: 42,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Expose()
  processingTimeMs?: number;

  @ApiPropertyOptional({
    description: 'Rate limiting information',
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  @Expose()
  rateLimit?: {
    limit: number;
    remaining: number;
    resetTime: number;
  };
}

/**
 * Base DTO for all API responses
 * Provides consistent structure and metadata
 */
export class BaseResponseDto<T = any> {
  @ApiProperty({
    description: 'Response status',
    enum: ResponseStatus,
    example: ResponseStatus.SUCCESS,
  })
  @IsEnum(ResponseStatus)
  @Expose()
  status: ResponseStatus;

  @ApiProperty({
    description: 'HTTP status code',
    enum: HttpStatusCode,
    example: HttpStatusCode.OK,
  })
  @IsNumber()
  @IsEnum(HttpStatusCode)
  @Expose()
  statusCode: HttpStatusCode;

  @ApiPropertyOptional({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  @Expose()
  message?: string;

  @ApiProperty({
    description: 'Response data payload',
    type: 'object',
  })
  @IsOptional()
  @Expose()
  data?: T;

  @ApiProperty({
    description: 'Response metadata',
    type: ResponseMetadata,
  })
  @ValidateNested()
  @Type(() => ResponseMetadata)
  @Expose()
  metadata: ResponseMetadata;

  constructor(
    data?: T,
    status: ResponseStatus = ResponseStatus.SUCCESS,
    statusCode: HttpStatusCode = HttpStatusCode.OK,
    message?: string,
    requestId: string = `req_${Date.now().toString(16)}`,
  ) {
    this.status = status;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.metadata = new ResponseMetadata();
    this.metadata.requestId = requestId;
  }
}

/**
 * Error details for validation failures
 */
export class ValidationErrorDetail {
  @ApiProperty({
    description: 'Field that failed validation',
    example: 'email',
  })
  @IsString()
  @IsNotEmpty()
  @Expose()
  field: string;

  @ApiProperty({
    description: 'Validation constraint that was violated',
    example: 'isEmail',
  })
  @IsString()
  @IsNotEmpty()
  @Expose()
  constraint: string;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Email must be a valid email address',
  })
  @IsString()
  @IsNotEmpty()
  @Expose()
  message: string;

  @ApiPropertyOptional({
    description: 'Invalid value provided',
    example: 'invalid-email',
  })
  @IsOptional()
  @Expose()
  rejectedValue?: any;
}

/**
 * Base error response DTO
 */
export class BaseErrorResponseDto extends BaseResponseDto {
  @ApiProperty({
    description: 'Error code for programmatic handling',
    example: 'VALIDATION_ERROR',
  })
  @IsString()
  @IsNotEmpty()
  @Expose()
  errorCode: string;

  @ApiPropertyOptional({
    description: 'Detailed validation errors',
    type: [ValidationErrorDetail],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidationErrorDetail)
  @Expose()
  validationErrors?: ValidationErrorDetail[];

  @ApiPropertyOptional({
    description: 'Additional error context',
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  @Expose()
  context?: Record<string, any>;

  constructor(
    errorCode: string,
    message: string,
    statusCode: HttpStatusCode = HttpStatusCode.BAD_REQUEST,
    validationErrors?: ValidationErrorDetail[],
    context?: Record<string, any>,
    requestId: string = `req_${Date.now().toString(16)}`,
  ) {
    super(undefined, ResponseStatus.ERROR, statusCode, message, requestId);
    this.errorCode = errorCode;
    this.validationErrors = validationErrors;
    this.context = context;
  }
}

/**
 * Pagination parameters DTO
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
    maximum: 10000,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  @Transform(({ value }) => parseInt(value, 10))
  @Expose()
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  @Expose()
  limit: number = 20;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'createdAt',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  @Matches(/^[a-zA-Z_][a-zA-Z0-9_.]*$/, {
    message: 'Sort field must be a valid field name',
  })
  @Expose()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort direction',
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  @Expose()
  sortDirection: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Search query string',
    example: 'example search',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  @ClassTransform(({ value }) => value?.trim())
  @Expose()
  search?: string;
}

/**
 * Paginated response metadata
 */
export class PaginationMetadata {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @Expose()
  currentPage: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  @Expose()
  pageSize: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 150,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Expose()
  totalItems: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Expose()
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  @IsBoolean()
  @Expose()
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  @IsBoolean()
  @Expose()
  hasPreviousPage: boolean;

  @ApiProperty({
    description: 'Number of items on current page',
    example: 20,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Expose()
  itemsOnPage: number;

  constructor(
    pagination: PaginationDto,
    totalItems: number,
    itemsOnPage: number,
  ) {
    this.currentPage = pagination.page;
    this.pageSize = pagination.limit;
    this.totalItems = totalItems;
    this.totalPages = Math.ceil(totalItems / pagination.limit);
    this.hasNextPage = pagination.page < this.totalPages;
    this.hasPreviousPage = pagination.page > 1;
    this.itemsOnPage = itemsOnPage;
  }
}

/**
 * Paginated response DTO
 */
export class PaginatedResponseDto<T> extends BaseResponseDto<T[]> {
  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetadata,
  })
  @ValidateNested()
  @Type(() => PaginationMetadata)
  @Expose()
  pagination: PaginationMetadata;

  constructor(
    items: T[],
    paginationParams: PaginationDto,
    totalItems: number,
    requestId: string = `req_${Date.now().toString(16)}`,
  ) {
    super(
      items,
      ResponseStatus.SUCCESS,
      HttpStatusCode.OK,
      undefined,
      requestId,
    );
    this.pagination = new PaginationMetadata(
      paginationParams,
      totalItems,
      items.length,
    );
  }
}

/**
 * Base entity DTO with common fields
 */
export class BaseEntityDto {
  @ApiProperty({
    description: 'Unique entity identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID(4, { message: 'Invalid UUID format' })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Entity creation timestamp',
    example: '2025-01-15T10:30:00.000Z',
    format: 'date-time',
  })
  @IsDate()
  @Type(() => Date)
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Entity last update timestamp',
    example: '2025-01-15T10:30:00.000Z',
    format: 'date-time',
  })
  @IsDate()
  @Type(() => Date)
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Entity version for optimistic locking',
    example: 1,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Expose()
  version?: number;
}

/**
 * Filtering base DTO for list endpoints
 */
export class FilterDto {
  @ApiPropertyOptional({
    description: 'Filter by creation date range - start date',
    example: '2025-01-01T00:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Expose()
  createdAfter?: Date;

  @ApiPropertyOptional({
    description: 'Filter by creation date range - end date',
    example: '2025-12-31T23:59:59.999Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Expose()
  createdBefore?: Date;

  @ApiPropertyOptional({
    description: 'Filter by update date range - start date',
    example: '2025-01-01T00:00:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Expose()
  updatedAfter?: Date;

  @ApiPropertyOptional({
    description: 'Filter by update date range - end date',
    example: '2025-12-31T23:59:59.999Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  @Expose()
  updatedBefore?: Date;
}

/**
 * Input sanitization and validation utilities
 */
export class SanitizedStringField {
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim().replace(/\s+/g, ' ');
    }
    return value;
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 1000)
  value: string;
}

/**
 * Secure email field with comprehensive validation
 */
export class SecureEmailField {
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim().toLowerCase();
    }
    return value;
  })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Length(5, 320, { message: 'Email must be between 5 and 320 characters' })
  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'Email format is invalid',
  })
  value: string;
}

/**
 * Secure URL field with validation
 */
export class SecureUrlField {
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  })
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
    },
    { message: 'Must be a valid HTTP or HTTPS URL' },
  )
  @Length(10, 2048, { message: 'URL must be between 10 and 2048 characters' })
  value: string;
}

/**
 * Health check response DTO
 */
export class HealthCheckResponseDto extends BaseResponseDto {
  @ApiProperty({
    description: 'Application health status',
    example: 'healthy',
    enum: ['healthy', 'degraded', 'unhealthy'],
  })
  @IsEnum(['healthy', 'degraded', 'unhealthy'])
  @Expose()
  health: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({
    description: 'Service uptime in seconds',
    example: 3661,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Expose()
  uptime: number;

  @ApiProperty({
    description: 'Application version',
    example: '1.0.0',
    pattern: '^\\d+\\.\\d+\\.\\d+',
  })
  @IsString()
  @Matches(/^\d+\.\d+\.\d+/, { message: 'Invalid version format' })
  @Expose()
  version: string;

  @ApiProperty({
    description: 'Service dependencies status',
    type: 'object',
    example: {
      database: 'healthy',
      redis: 'healthy',
      externalApi: 'degraded',
    },
  })
  @IsObject()
  @Expose()
  dependencies: Record<string, string>;
}

export default {
  BaseResponseDto,
  BaseErrorResponseDto,
  PaginationDto,
  PaginatedResponseDto,
  BaseEntityDto,
  FilterDto,
  HealthCheckResponseDto,
  ResponseStatus,
  HttpStatusCode,
  ValidationErrorDetail,
};
