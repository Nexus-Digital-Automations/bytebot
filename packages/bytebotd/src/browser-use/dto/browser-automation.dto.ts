/**
 * Comprehensive DTOs for Browser Automation API
 * Service Layer Implementation for Browser-Use API Endpoints
 */

import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, ValidateNested, IsObject, IsArray, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Browser Session DTOs
export class CreateBrowserSessionDto {
  @ApiPropertyOptional({ description: 'Custom session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Browser configuration options' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrowserSessionConfigDto)
  config?: BrowserSessionConfigDto;
}

export class BrowserSessionConfigDto {
  @ApiPropertyOptional({ description: 'Run browser in headless mode', default: true })
  @IsOptional()
  @IsBoolean()
  headless?: boolean;

  @ApiPropertyOptional({ description: 'Browser window width', default: 1920 })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ description: 'Browser window height', default: 1080 })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ description: 'Custom user agent string' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Default timeout in milliseconds', default: 30000 })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({ description: 'Browser type to use' })
  @IsOptional()
  @IsEnum(['chrome', 'firefox', 'safari', 'edge'])
  browser?: 'chrome' | 'firefox' | 'safari' | 'edge';

  @ApiPropertyOptional({ description: 'Custom browser executable path' })
  @IsOptional()
  @IsString()
  executablePath?: string;

  @ApiPropertyOptional({ description: 'Browser launch arguments' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  args?: string[];
}

export class BrowserSessionResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiPropertyOptional({ description: 'Additional session metadata' })
  metadata?: Record<string, any>;
}

// Browser Task DTOs
export class CreateBrowserTaskDto {
  @ApiProperty({ description: 'Target session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Task type', enum: ['navigation', 'interaction', 'extraction', 'automation', 'screenshot'] })
  @IsEnum(['navigation', 'interaction', 'extraction', 'automation', 'screenshot'])
  type: 'navigation' | 'interaction' | 'extraction' | 'automation' | 'screenshot';

  @ApiProperty({ description: 'Natural language instruction for the task' })
  @IsString()
  instruction: string;

  @ApiPropertyOptional({ description: 'Task-specific parameters' })
  @IsOptional()
  @IsObject()
  params?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Task priority level', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export class BrowserTaskResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiProperty({ description: 'Task ID' })
  taskId: string;

  @ApiProperty({ description: 'Task status' })
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  @ApiPropertyOptional({ description: 'Task result data' })
  data?: any;

  @ApiPropertyOptional({ description: 'Error information if task failed' })
  error?: BrowserErrorDto;

  @ApiPropertyOptional({ description: 'Task execution metadata' })
  metadata?: {
    duration?: number;
    timestamp: Date;
  };
}

// Browser Interaction DTOs
export class BrowserInteractionDto {
  @ApiProperty({ description: 'Interaction type', enum: ['click', 'type', 'select', 'hover', 'scroll', 'wait', 'navigate'] })
  @IsEnum(['click', 'type', 'select', 'hover', 'scroll', 'wait', 'navigate'])
  type: 'click' | 'type' | 'select' | 'hover' | 'scroll' | 'wait' | 'navigate';

  @ApiPropertyOptional({ description: 'CSS selector for target element' })
  @IsOptional()
  @IsString()
  selector?: string;

  @ApiPropertyOptional({ description: 'Value to input (for type, select operations)' })
  @IsOptional()
  value?: string | number | boolean;

  @ApiPropertyOptional({ description: 'Coordinate position for click operations' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;

  @ApiPropertyOptional({ description: 'Additional interaction options' })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Timeout for this interaction in milliseconds' })
  @IsOptional()
  @IsNumber()
  timeout?: number;
}

export class CoordinatesDto {
  @ApiProperty({ description: 'X coordinate' })
  @IsNumber()
  x: number;

  @ApiProperty({ description: 'Y coordinate' })
  @IsNumber()
  y: number;
}

export class BrowserInteractionResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Interaction result data' })
  data?: any;

  @ApiPropertyOptional({ description: 'Screenshot after interaction (base64)' })
  screenshot?: string;

  @ApiPropertyOptional({ description: 'Error information if interaction failed' })
  error?: BrowserErrorDto;
}

// DOM Element DTOs
export class DOMElementDto {
  @ApiProperty({ description: 'CSS selector for the element' })
  selector: string;

  @ApiProperty({ description: 'HTML tag name' })
  tagName: string;

  @ApiPropertyOptional({ description: 'Element text content' })
  text?: string;

  @ApiPropertyOptional({ description: 'Element value (for input elements)' })
  value?: string;

  @ApiPropertyOptional({ description: 'Element attributes' })
  attributes?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Element bounding box' })
  @ValidateNested()
  @Type(() => BoundingBoxDto)
  boundingBox?: BoundingBoxDto;

  @ApiProperty({ description: 'Whether element is visible' })
  visible: boolean;

  @ApiProperty({ description: 'Whether element is enabled' })
  enabled: boolean;
}

export class BoundingBoxDto {
  @ApiProperty({ description: 'X position' })
  @IsNumber()
  x: number;

  @ApiProperty({ description: 'Y position' })
  @IsNumber()
  y: number;

  @ApiProperty({ description: 'Element width' })
  @IsNumber()
  width: number;

  @ApiProperty({ description: 'Element height' })
  @IsNumber()
  height: number;
}

// Error DTOs
export class BrowserErrorDto {
  @ApiProperty({ description: 'Error code' })
  code: string;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiPropertyOptional({ description: 'Error stack trace' })
  stack?: string;

  @ApiPropertyOptional({ description: 'Error context information' })
  context?: {
    sessionId?: string;
    taskId?: string;
    selector?: string;
    url?: string;
  };

  @ApiProperty({ description: 'Error timestamp' })
  timestamp: Date;

  @ApiProperty({ description: 'Error severity', enum: ['info', 'warning', 'error', 'critical'] })
  @IsEnum(['info', 'warning', 'error', 'critical'])
  severity: 'info' | 'warning' | 'error' | 'critical';
}

// Health and Statistics DTOs
export class BrowserHealthDto {
  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Health status' })
  healthy: boolean;

  @ApiProperty({ description: 'Detailed status message' })
  status: string;

  @ApiProperty({ description: 'Last ping timestamp' })
  lastPing: Date;

  @ApiProperty({ description: 'Response time in milliseconds' })
  responseTime: number;

  @ApiPropertyOptional({ description: 'Memory usage in MB' })
  memoryUsage?: number;

  @ApiPropertyOptional({ description: 'CPU usage percentage' })
  cpuUsage?: number;

  @ApiPropertyOptional({ description: 'Recent errors' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BrowserErrorDto)
  errors?: BrowserErrorDto[];
}

export class SessionStatisticsDto {
  @ApiProperty({ description: 'Session ID' })
  sessionId: string;

  @ApiProperty({ description: 'Number of completed tasks' })
  tasksCompleted: number;

  @ApiProperty({ description: 'Number of failed tasks' })
  tasksFailedCount: number;

  @ApiProperty({ description: 'Average task duration in milliseconds' })
  averageTaskDuration: number;

  @ApiProperty({ description: 'Total memory usage in MB' })
  totalMemoryUsage: number;

  @ApiProperty({ description: 'Total CPU time in seconds' })
  totalCpuTime: number;

  @ApiProperty({ description: 'Session uptime in seconds' })
  uptime: number;

  @ApiProperty({ description: 'Last activity timestamp' })
  lastActivity: Date;
}

// Service Response DTO
export class ServiceResponseDto<T = any> {
  @ApiProperty({ description: 'Operation success status' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Response data' })
  data?: T;

  @ApiPropertyOptional({ description: 'Error information' })
  @ValidateNested()
  @Type(() => BrowserErrorDto)
  error?: BrowserErrorDto;

  @ApiPropertyOptional({ description: 'Response metadata' })
  metadata?: {
    timestamp: Date;
    duration?: number;
    version?: string;
  };
}

// Query DTOs
export class GetSessionsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by session status' })
  @IsOptional()
  @IsEnum(['initializing', 'active', 'paused', 'error', 'destroyed'])
  status?: 'initializing' | 'active' | 'paused' | 'error' | 'destroyed';

  @ApiPropertyOptional({ description: 'Maximum number of sessions to return', default: 10 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of sessions to skip', default: 0 })
  @IsOptional()
  @IsNumber()
  offset?: number;
}

export class GetTasksQueryDto {
  @ApiProperty({ description: 'Session ID to filter tasks' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Filter by task status' })
  @IsOptional()
  @IsEnum(['pending', 'running', 'completed', 'failed', 'cancelled'])
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  @ApiPropertyOptional({ description: 'Filter by task type' })
  @IsOptional()
  @IsEnum(['navigation', 'interaction', 'extraction', 'automation', 'screenshot'])
  type?: 'navigation' | 'interaction' | 'extraction' | 'automation' | 'screenshot';

  @ApiPropertyOptional({ description: 'Maximum number of tasks to return', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of tasks to skip', default: 0 })
  @IsOptional()
  @IsNumber()
  offset?: number;
}