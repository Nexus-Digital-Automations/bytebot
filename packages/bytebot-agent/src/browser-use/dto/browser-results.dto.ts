/**
 * Browser Results DTOs
 *
 * Data Transfer Objects for browser task results retrieval, export,
 * and archive management. Supports multiple export formats and
 * comprehensive result metadata for analysis and reporting.
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsBoolean,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  XML = 'xml',
  PDF = 'pdf',
  HTML = 'html',
  XLSX = 'xlsx',
}

export enum ResultStatus {
  SUCCESS = 'success',
  PARTIAL = 'partial',
  FAILED = 'failed',
  ERROR = 'error',
}

export class ExportResultsDto {
  @ApiProperty({
    description: 'Export format',
    enum: ExportFormat,
    default: ExportFormat.JSON,
  })
  @IsEnum(ExportFormat)
  format: ExportFormat = ExportFormat.JSON;

  @ApiPropertyOptional({
    description: 'Include screenshots in export',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeScreenshots?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include detailed logs in export',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeLogs?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include performance metrics in export',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeMetrics?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include extracted data in export',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeExtractedData?: boolean = true;

  @ApiPropertyOptional({
    description: 'Compress export file',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  compress?: boolean = false;

  @ApiPropertyOptional({
    description: 'Custom export filename (without extension)',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  filename?: string;

  @ApiPropertyOptional({
    description: 'Export password protection',
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    description: 'Custom export configuration',
  })
  @IsOptional()
  @IsObject()
  exportConfig?: Record<string, any>;
}

export class TaskExecutionStep {
  @ApiProperty({ description: 'Step number in execution sequence' })
  stepNumber!: number;

  @ApiProperty({ description: 'Action type performed' })
  action!: string;

  @ApiProperty({ description: 'Step execution status' })
  status!: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

  @ApiProperty({ description: 'Step start timestamp' })
  startedAt!: Date;

  @ApiProperty({ description: 'Step completion timestamp' })
  completedAt?: Date;

  @ApiProperty({ description: 'Step execution duration in milliseconds' })
  durationMs?: number;

  @ApiProperty({ description: 'Step input parameters' })
  input?: Record<string, any>;

  @ApiProperty({ description: 'Step output result' })
  output?: Record<string, any>;

  @ApiProperty({ description: 'Step error information' })
  error?: {
    code: string;
    message: string;
    details?: any;
  };

  @ApiProperty({ description: 'Screenshots taken during this step' })
  screenshots?: Array<{
    screenshotId: string;
    capturedAt: Date;
    description: string;
  }>;
}

export class ExtractedDataResult {
  @ApiProperty({ description: 'Extraction method used' })
  method!: 'ai_query' | 'css_selectors' | 'xpath_selectors' | 'regex_patterns';

  @ApiProperty({ description: 'Number of items extracted' })
  itemCount!: number;

  @ApiProperty({ description: 'Extracted data items' })
  data!: Array<Record<string, any>>;

  @ApiProperty({ description: 'Data quality score (0-1)' })
  qualityScore!: number;

  @ApiProperty({ description: 'Extraction confidence score (0-1)' })
  confidence!: number;

  @ApiProperty({ description: 'Source page URL' })
  sourceUrl!: string;

  @ApiProperty({ description: 'Extraction timestamp' })
  extractedAt!: Date;

  @ApiProperty({ description: 'Extraction duration in milliseconds' })
  extractionTimeMs!: number;
}

export class TaskPerformanceMetrics {
  @ApiProperty({ description: 'Total task execution time in milliseconds' })
  totalExecutionTimeMs!: number;

  @ApiProperty({ description: 'Average step execution time in milliseconds' })
  averageStepTimeMs!: number;

  @ApiProperty({ description: 'Browser session startup time in milliseconds' })
  sessionStartupTimeMs!: number;

  @ApiProperty({ description: 'Page load times for each navigation' })
  pageLoadTimes!: Array<{
    url: string;
    loadTimeMs: number;
    timestamp: Date;
  }>;

  @ApiProperty({ description: 'Memory usage statistics' })
  memoryUsage!: {
    peakMemoryMB: number;
    averageMemoryMB: number;
    memoryLeaks?: Array<{
      timestamp: Date;
      memoryMB: number;
    }>;
  };

  @ApiProperty({ description: 'CPU usage statistics' })
  cpuUsage!: {
    peakCpuPercent: number;
    averageCpuPercent: number;
  };

  @ApiProperty({ description: 'Network activity metrics' })
  networkActivity!: {
    totalRequests: number;
    totalDataTransferred: number;
    slowestRequest?: {
      url: string;
      durationMs: number;
    };
  };
}

export class BrowserResultsResponseDto {
  @ApiProperty({ description: 'Task identifier' })
  taskId!: string;

  @ApiProperty({ description: 'Task execution status' })
  status!: ResultStatus;

  @ApiProperty({ description: 'Task name/title' })
  taskName!: string;

  @ApiProperty({ description: 'Task execution start time' })
  startedAt!: Date;

  @ApiProperty({ description: 'Task completion time' })
  completedAt?: Date;

  @ApiProperty({ description: 'Total execution duration in milliseconds' })
  executionTimeMs!: number;

  @ApiProperty({
    description: 'Detailed execution steps',
    type: [TaskExecutionStep],
  })
  executionSteps!: TaskExecutionStep[];

  @ApiProperty({
    description: 'Extracted data results',
    type: [ExtractedDataResult],
  })
  extractedData!: ExtractedDataResult[];

  @ApiProperty({
    description: 'Screenshots captured during task execution',
  })
  screenshots!: Array<{
    screenshotId: string;
    sessionId: string;
    capturedAt: Date;
    description: string;
    fileSize: number;
    dimensions: {
      width: number;
      height: number;
    };
  }>;

  @ApiProperty({
    description: 'Task performance metrics',
    type: TaskPerformanceMetrics,
  })
  performanceMetrics!: TaskPerformanceMetrics;

  @ApiProperty({ description: 'Task execution logs' })
  executionLogs!: Array<{
    timestamp: Date;
    level: 'debug' | 'info' | 'warning' | 'error';
    message: string;
    source: string;
    details?: any;
  }>;

  @ApiProperty({ description: 'Browser session information' })
  sessionInfo!: {
    sessionId: string;
    browserType: string;
    browserVersion: string;
    viewportSize: {
      width: number;
      height: number;
    };
    userAgent: string;
    headless: boolean;
  };

  @ApiProperty({ description: 'Task configuration used' })
  taskConfiguration!: Record<string, any>;

  @ApiProperty({ description: 'Final result summary' })
  resultSummary!: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    skippedSteps: number;
    dataExtracted: number;
    screenshotsCaptured: number;
    errorsEncountered: number;
    warnings: string[];
  };

  @ApiProperty({
    description: 'Export information if task results were exported',
  })
  exportInfo?: {
    format: ExportFormat;
    filename: string;
    fileSize: number;
    exportedAt: Date;
    downloadUrl?: string;
    expiresAt?: Date;
  };

  @ApiProperty({ description: 'Error information if task failed' })
  error?: {
    code: string;
    message: string;
    timestamp: Date;
    failedStep?: number;
    recoverable: boolean;
    details?: any;
  };

  @ApiProperty({ description: 'Task archival status' })
  archived!: boolean;

  @ApiProperty({ description: 'Results retrieval timestamp' })
  retrievedAt!: Date;
}

export class BrowserResultsListResponseDto {
  @ApiProperty({ description: 'Total number of results available' })
  total!: number;

  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @ApiProperty({ description: 'Results per page' })
  limit!: number;

  @ApiProperty({
    description: 'List of task results',
    type: [BrowserResultsResponseDto],
  })
  results!: BrowserResultsResponseDto[];

  @ApiProperty({ description: 'Result retrieval timestamp' })
  retrievedAt!: Date;
}

export class ArchiveResultsDto {
  @ApiProperty({ description: 'Array of task IDs to archive' })
  @IsArray()
  @IsString({ each: true })
  taskIds!: string[];

  @ApiPropertyOptional({
    description: 'Archive compression level (1-9)',
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  compressionLevel?: number = 5;

  @ApiPropertyOptional({
    description: 'Include screenshots in archive',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeScreenshots?: boolean = false;

  @ApiPropertyOptional({
    description: 'Archive password protection',
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    description: 'Archive retention period in days',
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  retentionDays?: number = 30;
}

export class ResultsStatisticsDto {
  @ApiProperty({ description: 'Total number of completed tasks' })
  totalTasks!: number;

  @ApiProperty({ description: 'Number of successful tasks' })
  successfulTasks!: number;

  @ApiProperty({ description: 'Number of failed tasks' })
  failedTasks!: number;

  @ApiProperty({ description: 'Average task execution time in milliseconds' })
  averageExecutionTimeMs!: number;

  @ApiProperty({ description: 'Total data extraction count' })
  totalDataExtracted!: number;

  @ApiProperty({ description: 'Total screenshots captured' })
  totalScreenshots!: number;

  @ApiProperty({ description: 'Disk usage statistics' })
  diskUsage!: {
    totalSizeBytes: number;
    resultFilesCount: number;
    screenshotsCount: number;
    archivesCount: number;
  };

  @ApiProperty({ description: 'Most common task types' })
  taskTypeDistribution!: Record<string, number>;

  @ApiProperty({ description: 'Success rate by task type' })
  successRateByType!: Record<string, number>;

  @ApiProperty({ description: 'Performance trends over time' })
  performanceTrends!: Array<{
    date: Date;
    averageExecutionTimeMs: number;
    successRate: number;
  }>;

  @ApiProperty({ description: 'Statistics generation timestamp' })
  generatedAt!: Date;
}
