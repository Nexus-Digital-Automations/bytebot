/**
 * Template Version DTOs
 * Data transfer objects for template version operations
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsObject,
  ValidateNested,
  IsEnum,
  IsNumber,
  IsBoolean,
  ArrayMaxSize
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TemplateFormat } from '../types/template-editor.types';

export class CreateTemplateVersionDto {
  @ApiProperty({
    description: 'Template content in the specified format',
    example: '<html><body><h1>{{title}}</h1><p>{{content}}</p></body></html>'
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'User ID creating the version',
    example: 'user_12345'
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    description: 'Template format/engine',
    enum: TemplateFormat,
    example: TemplateFormat.HANDLEBARS
  })
  @IsOptional()
  @IsEnum(TemplateFormat)
  format?: TemplateFormat;

  @ApiPropertyOptional({
    description: 'Version description',
    example: 'Initial template version with basic layout'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Commit message for version control',
    example: 'feat: Add initial template structure'
  })
  @IsOptional()
  @IsString()
  commitMessage?: string;

  @ApiPropertyOptional({
    description: 'Template tags for categorization',
    example: ['invoice', 'business', 'formal']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Template category',
    example: 'business-documents'
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: {
      difficulty: 'intermediate',
      estimatedRenderTime: 2000
    }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateTemplateVersionDto {
  @ApiProperty({
    description: 'Updated template content',
    example: '<html><body><h1>{{title}}</h1><p>{{content}}</p><footer>{{footer}}</footer></body></html>'
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'User ID making the update',
    example: 'user_12345'
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    description: 'Commit message describing the changes',
    example: 'feat: Add footer section to template'
  })
  @IsOptional()
  @IsString()
  commitMessage?: string;

  @ApiPropertyOptional({
    description: 'Updated version description',
    example: 'Enhanced template with footer support'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated tags',
    example: ['invoice', 'business', 'formal', 'enhanced']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Updated metadata',
    example: {
      difficulty: 'intermediate',
      estimatedRenderTime: 2500,
      hasFooter: true
    }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class TemplateValidationDto {
  @ApiProperty({
    description: 'Template content to validate',
    example: '<html><body><h1>{{title}}</h1><p>{{content}}</p></body></html>'
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Template format for validation',
    enum: TemplateFormat,
    example: TemplateFormat.HANDLEBARS
  })
  @IsOptional()
  @IsEnum(TemplateFormat)
  format?: TemplateFormat;

  @ApiPropertyOptional({
    description: 'Validation options',
    example: {
      checkPerformance: true,
      validateVariables: true,
      strictMode: false
    }
  })
  @IsOptional()
  @IsObject()
  options?: {
    checkPerformance?: boolean;
    validateVariables?: boolean;
    strictMode?: boolean;
    maxComplexity?: number;
  };
}

export class TemplatePreviewDto {
  @ApiProperty({
    description: 'Sample data for preview generation',
    example: {
      title: 'Sample Invoice',
      content: 'This is a sample invoice content.',
      customerName: 'John Doe',
      amount: '$1,500.00'
    }
  })
  @IsObject()
  @IsNotEmpty()
  sampleData: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Preview options',
    example: {
      format: 'html',
      includeStyles: true,
      responsive: true
    }
  })
  @IsOptional()
  @IsObject()
  options?: {
    format?: string;
    includeStyles?: boolean;
    responsive?: boolean;
    viewport?: {
      width: number;
      height: number;
    };
  };
}

export class CreateEditorSessionDto {
  @ApiProperty({
    description: 'Template ID to edit',
    example: 'template_12345'
  })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({
    description: 'Version ID to edit',
    example: 'version_12345'
  })
  @IsString()
  @IsNotEmpty()
  versionId: string;

  @ApiProperty({
    description: 'User ID starting the session',
    example: 'user_12345'
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    description: 'Editor mode',
    enum: ['visual', 'code', 'split', 'preview'],
    example: 'code'
  })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({
    description: 'Session preferences',
    example: {
      theme: 'dark',
      fontSize: 14,
      autoSave: true
    }
  })
  @IsOptional()
  @IsObject()
  preferences?: {
    theme?: string;
    fontSize?: number;
    autoSave?: boolean;
    tabSize?: number;
    wordWrap?: boolean;
  };
}

export class TemplateCommentDto {
  @ApiProperty({
    description: 'Comment content',
    example: 'Consider adding validation for the email field here'
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Line number for the comment',
    example: 15
  })
  @IsNumber()
  line: number;

  @ApiProperty({
    description: 'Column position for the comment',
    example: 20
  })
  @IsNumber()
  column: number;

  @ApiPropertyOptional({
    description: 'Length of text the comment refers to',
    example: 10
  })
  @IsOptional()
  @IsNumber()
  length?: number;

  @ApiPropertyOptional({
    description: 'Parent comment ID for replies',
    example: 'comment_12345'
  })
  @IsOptional()
  @IsString()
  parentCommentId?: string;

  @ApiPropertyOptional({
    description: 'Mentioned users',
    example: ['user_12346', 'user_12347']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];
}

export class TemplateMergeDto {
  @ApiProperty({
    description: 'Source version ID',
    example: 'version_12345'
  })
  @IsString()
  @IsNotEmpty()
  sourceVersionId: string;

  @ApiProperty({
    description: 'Target version ID',
    example: 'version_12346'
  })
  @IsString()
  @IsNotEmpty()
  targetVersionId: string;

  @ApiProperty({
    description: 'User performing the merge',
    example: 'user_12345'
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    description: 'Merge strategy',
    enum: ['auto', 'manual', 'ours', 'theirs'],
    example: 'auto'
  })
  @IsOptional()
  @IsString()
  strategy?: string;

  @ApiPropertyOptional({
    description: 'Merge commit message',
    example: 'Merge feature branch into main template'
  })
  @IsOptional()
  @IsString()
  commitMessage?: string;

  @ApiPropertyOptional({
    description: 'Conflict resolutions',
    example: [
      {
        conflictId: 'conflict_123',
        resolution: 'accept_source',
        resolvedContent: '<h1>{{title}}</h1>'
      }
    ]
  })
  @IsOptional()
  @IsArray()
  conflictResolutions?: Array<{
    conflictId: string;
    resolution: string;
    resolvedContent?: string;
  }>;
}