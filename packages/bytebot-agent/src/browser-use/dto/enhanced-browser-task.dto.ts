/**
 * Enhanced Browser Task DTOs - Enterprise-Grade Browser Automation
 *
 * This module provides comprehensive Data Transfer Objects for browser automation
 * with advanced validation, security controls, and type safety. Designed for
 * enterprise-level browser automation with extensive error handling and monitoring.
 *
 * @fileoverview Enhanced browser task DTOs with security and validation
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
  IsUrl,
  ValidateNested,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
  IsJSON,
  ArrayMinSize,
  ArrayMaxSize,
  IsUUID,
  IsPositive,
  IsEmail,
  IsIP,
  IsFQDN,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Enhanced task status with detailed state tracking
 */
export enum EnhancedTaskStatus {
  QUEUED = 'queued',
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
  RECOVERING = 'recovering',
}

/**
 * Task priority levels with business importance mapping
 */
export enum TaskPriority {
  CRITICAL = 'critical', // Business critical operations
  HIGH = 'high', // Important user requests
  NORMAL = 'normal', // Standard automation tasks
  LOW = 'low', // Background/maintenance tasks
  BULK = 'bulk', // Batch processing tasks
}

/**
 * Security levels for task execution
 */
export enum SecurityLevel {
  RESTRICTED = 'restricted', // Limited actions, strict validation
  STANDARD = 'standard', // Default security controls
  ELEVATED = 'elevated', // Additional permissions with audit
  ADMIN = 'admin', // Full access with comprehensive logging
}

/**
 * URL validation and security constraints
 */
export class URLSecurityConfig {
  @ApiPropertyOptional({
    description: 'Allowed domain whitelist (regex patterns supported)',
    example: ['*.example.com', 'trusted-site.org'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  allowedDomains?: string[];

  @ApiPropertyOptional({
    description: 'Blocked domain blacklist (takes precedence over whitelist)',
    example: ['malicious-site.com', '*.phishing-domain.net'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(1000)
  blockedDomains?: string[];

  @ApiPropertyOptional({
    description: 'Allowed URL schemes',
    example: ['https', 'http'],
    enum: ['https', 'http', 'ftp', 'file'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(['https', 'http', 'ftp', 'file'], { each: true })
  allowedSchemes?: string[] = ['https', 'http'];

  @ApiPropertyOptional({
    description: 'Block URLs with suspicious query parameters',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  blockSuspiciousQueries?: boolean = true;

  @ApiPropertyOptional({
    description: 'Maximum URL length allowed',
    minimum: 100,
    maximum: 8192,
    default: 2048,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(8192)
  maxUrlLength?: number = 2048;

  @ApiPropertyOptional({
    description: 'Validate SSL certificates for HTTPS URLs',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  validateSSL?: boolean = true;
}

/**
 * Execution constraints with enterprise controls
 */
export class EnhancedTaskConstraints {
  @ApiPropertyOptional({
    description: 'Maximum execution time in seconds',
    minimum: 30,
    maximum: 7200,
    default: 600,
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(7200)
  maxExecutionTimeSeconds?: number = 600;

  @ApiPropertyOptional({
    description: 'Maximum number of browser actions',
    minimum: 1,
    maximum: 10000,
    default: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  maxActions?: number = 1000;

  @ApiPropertyOptional({
    description: 'Maximum number of page navigations',
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxNavigations?: number = 50;

  @ApiPropertyOptional({
    description: 'Maximum memory usage in MB',
    minimum: 128,
    maximum: 8192,
    default: 1024,
  })
  @IsOptional()
  @IsNumber()
  @Min(128)
  @Max(8192)
  maxMemoryMB?: number = 1024;

  @ApiPropertyOptional({
    description: 'URL security configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => URLSecurityConfig)
  urlSecurity?: URLSecurityConfig;

  @ApiPropertyOptional({
    description: 'Enable comprehensive audit logging',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableAuditLogging?: boolean = true;

  @ApiPropertyOptional({
    description: 'Enable performance monitoring',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enablePerformanceMonitoring?: boolean = true;

  @ApiPropertyOptional({
    description: 'Enable screenshot capture',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableScreenshots?: boolean = true;

  @ApiPropertyOptional({
    description: 'Screenshot capture frequency (per N actions)',
    minimum: 1,
    maximum: 100,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  screenshotFrequency?: number = 5;

  @ApiPropertyOptional({
    description: 'Enable video recording of task execution',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  enableVideoRecording?: boolean = false;

  @ApiPropertyOptional({
    description: 'Task retry configuration',
  })
  @IsOptional()
  @IsObject()
  retryConfig?: {
    maxAttempts: number;
    backoffMultiplier: number;
    retryOnFailure: boolean;
    retryableErrors: string[];
  };
}

/**
 * Task metadata with business context
 */
export class TaskBusinessMetadata {
  @ApiPropertyOptional({
    description: 'Business unit or department',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessUnit?: string;

  @ApiPropertyOptional({
    description: 'Project or campaign identifier',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Cost center for billing',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  costCenter?: string;

  @ApiPropertyOptional({
    description: 'Compliance requirements',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  complianceRequirements?: string[];

  @ApiPropertyOptional({
    description: 'Data classification level',
    enum: ['public', 'internal', 'confidential', 'restricted'],
  })
  @IsOptional()
  @IsEnum(['public', 'internal', 'confidential', 'restricted'])
  dataClassification?: string;

  @ApiPropertyOptional({
    description: 'Estimated business value (1-10)',
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  businessValue?: number;
}

/**
 * Enhanced ExecuteBrowserTaskDto with comprehensive validation
 */
export class ExecuteBrowserTaskDto {
  @ApiProperty({
    description: 'Task name with strict validation',
    example: 'Extract product data from e-commerce site',
    minLength: 3,
    maxLength: 200,
  })
  @IsString({ message: 'Task name must be a string' })
  @MinLength(3, { message: 'Task name must be at least 3 characters long' })
  @MaxLength(200, { message: 'Task name must not exceed 200 characters' })
  @Matches(/^[a-zA-Z0-9\s\-_.()]+$/, {
    message: 'Task name contains invalid characters',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @ApiProperty({
    description: 'Detailed task description with business context',
    example:
      'Navigate to product pages and extract pricing, availability, and specifications for competitive analysis',
    minLength: 10,
    maxLength: 5000,
  })
  @IsString({ message: 'Description must be a string' })
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description!: string;

  @ApiPropertyOptional({
    description: 'Initial URL with security validation',
    example: 'https://trusted-ecommerce.com/products',
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] }, { message: 'Invalid URL format' })
  @MaxLength(2048, { message: 'URL too long' })
  startUrl?: string;

  @ApiPropertyOptional({
    description: 'Task priority with business impact',
    enum: TaskPriority,
    default: TaskPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(TaskPriority, { message: 'Invalid priority level' })
  priority?: TaskPriority = TaskPriority.NORMAL;

  @ApiPropertyOptional({
    description: 'Security level for task execution',
    enum: SecurityLevel,
    default: SecurityLevel.STANDARD,
  })
  @IsOptional()
  @IsEnum(SecurityLevel, { message: 'Invalid security level' })
  securityLevel?: SecurityLevel = SecurityLevel.STANDARD;

  @ApiPropertyOptional({
    description: 'Comprehensive task execution constraints',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EnhancedTaskConstraints)
  constraints?: EnhancedTaskConstraints;

  @ApiPropertyOptional({
    description: 'Business metadata for reporting and compliance',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaskBusinessMetadata)
  businessMetadata?: TaskBusinessMetadata;

  @ApiPropertyOptional({
    description: 'Task configuration parameters (validated JSON)',
  })
  @IsOptional()
  @IsObject({ message: 'Configuration must be a valid object' })
  config?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Organizational tags for categorization',
    example: ['ecommerce', 'competitive-analysis', 'automated'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @ArrayMaxSize(20, { message: 'Maximum 20 tags allowed' })
  @MaxLength(50, {
    each: true,
    message: 'Each tag must not exceed 50 characters',
  })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Auto-start task execution upon creation',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Auto-start must be a boolean value' })
  autoStart?: boolean = false;

  @ApiPropertyOptional({
    description: 'Task timeout in seconds (overrides constraint defaults)',
    minimum: 30,
    maximum: 7200,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Timeout must be a number' })
  @Min(30, { message: 'Timeout must be at least 30 seconds' })
  @Max(7200, { message: 'Timeout must not exceed 2 hours' })
  @IsPositive({ message: 'Timeout must be positive' })
  timeoutSeconds?: number;

  @ApiPropertyOptional({
    description: 'Notification configuration for task completion',
  })
  @IsOptional()
  @IsObject()
  notifications?: {
    email?: string[];
    webhook?: string;
    slack?: {
      channel: string;
      token: string;
    };
  };

  @ApiPropertyOptional({
    description: 'Task scheduling configuration',
  })
  @IsOptional()
  @IsObject()
  scheduling?: {
    scheduleAt?: Date;
    cronExpression?: string;
    timezone?: string;
    maxOccurrences?: number;
  };

  @ApiPropertyOptional({
    description: 'Data extraction specifications',
  })
  @IsOptional()
  @IsObject()
  dataExtraction?: {
    selectors?: Record<string, string>;
    outputFormat?: 'json' | 'csv' | 'xml';
    dataValidation?: Record<string, unknown>;
  };
}

/**
 * Enhanced Browser Task Result with comprehensive data
 */
export class BrowserTaskResultDto {
  @ApiProperty({ description: 'Unique task identifier' })
  @IsUUID(4, { message: 'Invalid task ID format' })
  id!: string;

  @ApiProperty({ description: 'Task execution status' })
  @IsEnum(EnhancedTaskStatus)
  status!: EnhancedTaskStatus;

  @ApiProperty({ description: 'Task name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Task creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Task start timestamp' })
  startedAt?: Date;

  @ApiProperty({ description: 'Task completion timestamp' })
  completedAt?: Date;

  @ApiProperty({ description: 'Total execution duration in milliseconds' })
  @IsNumber()
  @Min(0)
  executionTimeMs!: number;

  @ApiProperty({ description: 'Task result data' })
  @IsOptional()
  @IsObject()
  result?: Record<string, unknown>;

  @ApiProperty({ description: 'Comprehensive execution metrics' })
  metrics!: {
    actionsPerformed: number;
    pagesVisited: number;
    screenshotsTaken: number;
    dataPointsExtracted: number;
    errorsEncountered: number;
    warningsGenerated: number;
    peakMemoryUsageMB: number;
    averagePageLoadTimeMs: number;
    networkRequestsCount: number;
    securityViolations: number;
  };

  @ApiProperty({ description: 'Error information if task failed' })
  @IsOptional()
  error?: {
    code: string;
    message: string;
    category: 'validation' | 'security' | 'timeout' | 'network' | 'system';
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
    stackTrace?: string;
    context?: Record<string, unknown>;
    recoverable: boolean;
    retryAttempts: number;
  };

  @ApiProperty({ description: 'Security audit information' })
  securityAudit!: {
    securityLevel: SecurityLevel;
    accessedDomains: string[];
    blockedRequests: number;
    suspiciousActivity: Array<{
      type: string;
      description: string;
      timestamp: Date;
      severity: string;
    }>;
    complianceStatus: 'compliant' | 'non-compliant' | 'pending-review';
  };

  @ApiProperty({ description: 'Business context and reporting data' })
  @IsOptional()
  businessContext?: TaskBusinessMetadata & {
    actualCost?: number;
    roi?: number;
    businessImpact?: string;
  };
}

/**
 * Enhanced Error Response with detailed diagnostics
 */
export class ErrorResponseDto {
  @ApiProperty({ description: 'HTTP status code' })
  @IsNumber()
  statusCode!: number;

  @ApiProperty({ description: 'Error message' })
  @IsString()
  message!: string;

  @ApiProperty({ description: 'Error code for programmatic handling' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Request timestamp' })
  timestamp!: Date;

  @ApiProperty({ description: 'Request path' })
  @IsString()
  path!: string;

  @ApiProperty({ description: 'Correlation ID for tracking' })
  @IsUUID()
  correlationId!: string;

  @ApiProperty({ description: 'Detailed error context' })
  @IsOptional()
  details?: {
    validationErrors?: Array<{
      field: string;
      value: unknown;
      message: string;
      constraint: string;
    }>;
    securityViolations?: Array<{
      type: string;
      description: string;
      severity: string;
    }>;
    systemInfo?: {
      version: string;
      environment: string;
      nodeId: string;
    };
  };

  @ApiProperty({ description: 'Suggested resolution steps' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  resolutionSteps?: string[];

  @ApiProperty({ description: 'Support contact information' })
  @IsOptional()
  support?: {
    documentation: string;
    email: string;
    chatUrl?: string;
  };
}

// Export all enhanced DTOs
export {
  EnhancedTaskStatus,
  TaskPriority,
  SecurityLevel,
  URLSecurityConfig,
  EnhancedTaskConstraints,
  TaskBusinessMetadata,
};
