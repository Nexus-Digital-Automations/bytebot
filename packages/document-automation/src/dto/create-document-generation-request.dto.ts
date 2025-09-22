/**
 * Data Transfer Objects for Document Generation API
 * Comprehensive validation and transformation schemas
 */

import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsEnum,
  IsOptional,
  IsUUID,
  ValidateNested,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsDateString,
  IsArray,
  ArrayMaxSize,
  IsUrl
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentFormat } from '../types/document.types';

/**
 * Watermark configuration for document post-processing
 */
export class WatermarkOptionsDto {
  @ApiProperty({
    description: 'Enable watermark application',
    example: true
  })
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({
    description: 'Watermark text content',
    example: 'CONFIDENTIAL'
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({
    description: 'Watermark image URL or base64 data',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    description: 'Watermark opacity (0.0 to 1.0)',
    example: 0.3,
    minimum: 0,
    maximum: 1
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity: number;

  @ApiProperty({
    description: 'Watermark position on document',
    enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'],
    example: 'bottom-right'
  })
  @IsEnum(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'])
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

  @ApiPropertyOptional({
    description: 'Font size for text watermarks',
    example: 12,
    minimum: 8,
    maximum: 72
  })
  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(72)
  fontSize?: number;

  @ApiPropertyOptional({
    description: 'Watermark color (hex format)',
    example: '#FF0000'
  })
  @IsOptional()
  @IsString()
  color?: string;
}

/**
 * Document protection settings for access control
 */
export class DocumentProtectionDto {
  @ApiPropertyOptional({
    description: 'Password for document protection',
    example: 'secure123'
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({
    description: 'Document access permissions'
  })
  @IsObject()
  @ValidateNested()
  @Type(() => DocumentPermissionsDto)
  permissions: DocumentPermissionsDto;
}

export class DocumentPermissionsDto {
  @ApiProperty({
    description: 'Allow printing of document',
    example: true
  })
  @IsBoolean()
  print: boolean;

  @ApiProperty({
    description: 'Allow copying content from document',
    example: false
  })
  @IsBoolean()
  copy: boolean;

  @ApiProperty({
    description: 'Allow editing of document',
    example: false
  })
  @IsBoolean()
  edit: boolean;

  @ApiProperty({
    description: 'Allow annotations and comments',
    example: true
  })
  @IsBoolean()
  annotate: boolean;
}

/**
 * Document generation options and post-processing settings
 */
export class GenerationOptionsDto {
  @ApiProperty({
    description: 'Target output format for generated document',
    enum: DocumentFormat,
    example: DocumentFormat.PDF
  })
  @IsEnum(DocumentFormat)
  outputFormat: DocumentFormat;

  @ApiPropertyOptional({
    description: 'Enable document compression',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  compression?: boolean;

  @ApiPropertyOptional({
    description: 'Watermark configuration',
    type: WatermarkOptionsDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WatermarkOptionsDto)
  watermark?: WatermarkOptionsDto;

  @ApiPropertyOptional({
    description: 'Document protection settings',
    type: DocumentProtectionDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentProtectionDto)
  protection?: DocumentProtectionDto;

  @ApiPropertyOptional({
    description: 'Document expiration in days',
    example: 30,
    minimum: 1,
    maximum: 365
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  expirationDays?: number;

  @ApiPropertyOptional({
    description: 'Custom generation settings',
    example: { pageSize: 'A4', margins: '1inch' }
  })
  @IsOptional()
  @IsObject()
  customSettings?: Record<string, any>;
}

/**
 * Main DTO for document generation requests
 */
export class CreateDocumentGenerationRequestDto {
  @ApiProperty({
    description: 'Unique identifier of the template to use',
    example: 'template_12345'
  })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({
    description: 'Data to merge with template',
    example: {
      title: 'Monthly Report',
      content: 'This is the content of the report...',
      author: 'John Doe',
      date: '2024-09-22'
    }
  })
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;

  @ApiProperty({
    description: 'Target output format for the generated document',
    enum: DocumentFormat,
    example: DocumentFormat.PDF
  })
  @IsEnum(DocumentFormat)
  format: DocumentFormat;

  @ApiPropertyOptional({
    description: 'Generation options and post-processing settings',
    type: GenerationOptionsDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GenerationOptionsDto)
  options?: GenerationOptionsDto;

  @ApiPropertyOptional({
    description: 'Processing priority level',
    enum: ['low', 'normal', 'high', 'urgent'],
    example: 'normal'
  })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  @ApiPropertyOptional({
    description: 'User ID making the request',
    example: 'user_12345'
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the request',
    example: {
      source: 'web-app',
      correlationId: 'req_abc123',
      businessUnit: 'finance'
    }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for batch document generation requests
 */
export class CreateBatchGenerationRequestDto {
  @ApiProperty({
    description: 'Human-readable name for the batch job',
    example: 'Monthly Reports Batch'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Array of individual generation requests',
    type: [CreateDocumentGenerationRequestDto]
  })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentGenerationRequestDto)
  requests: CreateDocumentGenerationRequestDto[];

  @ApiPropertyOptional({
    description: 'Maximum number of concurrent processing operations',
    example: 5,
    minimum: 1,
    maximum: 20
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxConcurrency?: number;

  @ApiPropertyOptional({
    description: 'Stop processing if any item fails',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  failFast?: boolean;

  @ApiPropertyOptional({
    description: 'Retry failed items automatically',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  retryFailedItems?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum retry attempts for failed items',
    example: 3,
    minimum: 0,
    maximum: 10
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional({
    description: 'Batch processing priority',
    enum: ['low', 'normal', 'high', 'urgent'],
    example: 'normal'
  })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  @ApiPropertyOptional({
    description: 'User ID creating the batch job',
    example: 'user_12345'
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the batch job',
    example: {
      department: 'finance',
      reportingPeriod: '2024-09'
    }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}