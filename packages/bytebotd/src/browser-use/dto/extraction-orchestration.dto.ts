/**
 * Extraction Orchestration DTOs
 *
 * Data Transfer Objects for advanced extraction orchestration operations including
 * distributed scraping, multi-source extraction, result aggregation, and data validation.
 * Supports enterprise-scale data collection with comprehensive configuration options.
 */

import {
  IsString,
  IsArray,
  IsObject,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsUrl,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';import { Type } from 'class-transformer';import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';// Enumsexport enum ExportFormat {
  JSON = 'json',CSV = 'csv',XML = 'xml',XLSX = 'xlsx',PDF = 'pdf',}export enum AggregationStrategy {
  MERGE = 'merge',DEDUPLICATE = 'deduplicate',VALIDATE = 'validate',TRANSFORM = 'transform',}export enum JobStatus {
  PENDING = 'pending',RUNNING = 'running',COMPLETED = 'completed',FAILED = 'failed',CANCELLED = 'cancelled',}export enum AgentStatus {
  IDLE = 'idle',BUSY = 'busy',ERROR = 'error',OFFLINE = 'offline',}// Configuration Classes
export class ThrottleConfig {
  @ApiProperty({ description: 'Maximum requests per minute', example: 60 })@IsNumber()@Min(1)
  @Max(1000)
  requestsPerMinute!: number;

  @ApiProperty({ description: 'Delay between requests in milliseconds', example: 1000 })@IsNumber()@Min(0)
  @Max(60000)
  delayBetweenRequests!: number;
}

export class PaginationConfig {
  @ApiProperty({ description: 'Enable pagination support', example: true })@IsBoolean()enabled!: boolean;

  @ApiProperty({ description: 'Maximum pages to process', example: 50 })@IsNumber()@Min(1)
  @Max(1000)
  maxPages!: number;

  @ApiProperty({ description: 'CSS selector for next page button', example: '.next-page' })@IsString()nextButtonSelector!: string;

  @ApiPropertyOptional({ description: 'Delay between page navigation in milliseconds', example: 2000 })@IsOptional()@IsNumber()
  navigationDelay?: number;
}

export class ExtractionConfig {
  @ApiProperty({ description: 'CSS selectors for data extraction', example: ['.product-item', '.product-card'] })@IsArray()@IsString({ each: true })
  @ArrayMinSize(1)
  selectors!: string[];

  @ApiProperty({ description: 'Data fields to extract', example: ['name', 'price', 'description'] })@IsArray()@IsString({ each: true })
  @ArrayMinSize(1)
  dataFields!: string[];

  @ApiPropertyOptional({ description: 'Pagination configuration' })@IsOptional()@ValidateNested()
  @Type(() => PaginationConfig)
  pagination?: PaginationConfig;

  @ApiPropertyOptional({ description: 'Wait for selector before extraction' })@IsOptional()@IsString()
  waitForSelector?: string;

  @ApiPropertyOptional({ description: 'Extraction timeout in milliseconds', example: 30000 })@IsOptional()@IsNumber()
  @Min(1000)
  @Max(300000)
  timeout?: number;
}

export class OrchestrationConfig {
  @ApiProperty({ description: 'Maximum concurrent agents to use', example: 5 })@IsNumber()@Min(1)
  @Max(20)
  maxConcurrentAgents!: number;

  @ApiProperty({ description: 'Number of retry attempts for failed tasks', example: 3 })@IsNumber()@Min(0)
  @Max(10)
  retryAttempts!: number;

  @ApiProperty({ description: 'Overall operation timeout in milliseconds', example: 300000 })@IsNumber()@Min(10000)
  @Max(3600000)
  timeout!: number;

  @ApiPropertyOptional({ description: 'Request throttling configuration' })@IsOptional()@ValidateNested()
  @Type(() => ThrottleConfig)
  throttle?: ThrottleConfig;

  @ApiPropertyOptional({ description: 'Priority level for the operation (1-10)', example: 5 })@IsOptional()@IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;
}

export class DeduplicationConfig {
  @ApiProperty({ description: 'Enable deduplication', example: true })@IsBoolean()enabled!: boolean;

  @ApiProperty({ description: 'Fields to use as deduplication keys', example: ['name', 'url'] })@IsArray()@IsString({ each: true })
  keyFields!: string[];

  @ApiPropertyOptional({ description: 'Similarity threshold for fuzzy matching (0-1)', example: 0.85 })@IsOptional()@IsNumber()
  @Min(0)
  @Max(1)
  similarity?: number;

  @ApiPropertyOptional({ description: 'Case-sensitive matching', example: false })@IsOptional()@IsBoolean()
  caseSensitive?: boolean;
}

export class ValidationConfig {
  @ApiProperty({ description: 'Enable data validation', example: true })@IsBoolean()enabled!: boolean;

  @ApiProperty({ description: 'Required fields for valid items', example: ['name', 'price'] })@IsArray()@IsString({ each: true })
  requiredFields!: string[];

  @ApiPropertyOptional({ description: 'Expected data types for fields' })@IsOptional()@IsObject()
  dataTypes?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Custom validation rules' })@IsOptional()@IsObject()
  customRules?: Record<string, any>;
}

export class AggregationStrategyConfig {
  @ApiPropertyOptional({ description: 'Deduplication configuration' })@IsOptional()@ValidateNested()
  @Type(() => DeduplicationConfig)
  deduplication?: DeduplicationConfig;

  @ApiPropertyOptional({ description: 'Validation configuration' })@IsOptional()@ValidateNested()
  @Type(() => ValidationConfig)
  validation?: ValidationConfig;

  @ApiPropertyOptional({ description: 'Custom aggregation settings' })@IsOptional()@IsObject()
  customAggregation?: Record<string, any>;
}

export class ExportOptions {
  @ApiProperty({ description: 'Export format', enum: ExportFormat, example: ExportFormat.CSV })@IsEnum(ExportFormat)format!: ExportFormat;

  @ApiPropertyOptional({ description: 'Include metadata in export', example: true })@IsOptional()@IsBoolean()
  includeMetadata?: boolean;

  @ApiPropertyOptional({ description: 'Compress export file', example: true })@IsOptional()@IsBoolean()
  compress?: boolean;

  @ApiPropertyOptional({ description: 'Custom filename (without extension)' })@IsOptional()@IsString()
  filename?: string;

  @ApiPropertyOptional({ description: 'Export password protection' })@IsOptional()@IsString()
  password?: string;
}

// Source Configuration for Multi-Source Extraction
export class SourceConfig {
  @ApiProperty({ description: 'Unique source identifier', example: 'source_001' })@IsString()sourceId!: string;

  @ApiProperty({ description: 'Source URL', example: 'https://example.com/data' })@IsUrl()url!: string;

  @ApiProperty({ description: 'Source name/description', example: 'Product Catalog' })@IsString()name!: string;

  @ApiProperty({ description: 'Extraction configuration for this source' })@ValidateNested()@Type(() => ExtractionConfig)
  extractionConfig!: ExtractionConfig;

  @ApiPropertyOptional({ description: 'Source priority (1-10)', example: 5 })@IsOptional()@IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;

  @ApiPropertyOptional({ description: 'Source-specific metadata' })@IsOptional()@IsObject()
  metadata?: Record<string, any>;
}

export class CorrelationConfig {
  @ApiProperty({ description: 'Fields to use for correlation', example: ['name', 'id'] })@IsArray()@IsString({ each: true })
  correlationFields!: string[];

  @ApiPropertyOptional({ description: 'Correlation threshold (0-1)', example: 0.8 })@IsOptional()@IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;

  @ApiPropertyOptional({ description: 'Correlation algorithm to use', example: 'fuzzy' })@IsOptional()@IsString()
  algorithm?: string;

  @ApiPropertyOptional({ description: 'Enable cross-source validation', example: true })@IsOptional()@IsBoolean()
  crossValidation?: boolean;
}

export class TransformationConfig {
  @ApiPropertyOptional({ description: 'Field mapping rules' })@IsOptional()@IsObject()
  fieldMapping?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Data normalization rules' })@IsOptional()@IsObject()
  normalization?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Custom transformation functions' })@IsOptional()@IsObject()
  customTransformations?: Record<string, any>;
}

// Request DTOs
export class DistributedScrapingRequestDto {
  @ApiProperty({
    description: 'URLs to scrape across multiple agents',example: ['https://example.com/page1', 'https://example.com/page2'],})@IsArray()
  @IsUrl({}, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  urls!: string[];

  @ApiProperty({ description: 'Extraction configuration' })@ValidateNested()@Type(() => ExtractionConfig)
  extractionConfig!: ExtractionConfig;

  @ApiPropertyOptional({ description: 'Orchestration configuration' })@IsOptional()@ValidateNested()
  @Type(() => OrchestrationConfig)
  orchestrationConfig?: OrchestrationConfig;

  @ApiPropertyOptional({ description: 'Result aggregation strategy' })@IsOptional()@ValidateNested()
  @Type(() => AggregationStrategyConfig)
  aggregationStrategy?: AggregationStrategyConfig;

  @ApiPropertyOptional({ description: 'Export options' })@IsOptional()@ValidateNested()
  @Type(() => ExportOptions)
  exportOptions?: ExportOptions;

  @ApiPropertyOptional({ description: 'Custom metadata for the operation' })@IsOptional()@IsObject()
  metadata?: Record<string, any>;
}

export class MultiSourceExtractionRequestDto {
  @ApiProperty({ description: 'Data sources to extract from' })@IsArray()@ValidateNested({ each: true })
  @Type(() => SourceConfig)
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  sources!: SourceConfig[];

  @ApiPropertyOptional({ description: 'Correlation configuration for cross-source data matching' })@IsOptional()@ValidateNested()
  @Type(() => CorrelationConfig)
  correlationConfig?: CorrelationConfig;

  @ApiPropertyOptional({ description: 'Data transformation configuration' })@IsOptional()@ValidateNested()
  @Type(() => TransformationConfig)
  transformationConfig?: TransformationConfig;

  @ApiPropertyOptional({ description: 'Export options' })@IsOptional()@ValidateNested()
  @Type(() => ExportOptions)
  exportOptions?: ExportOptions;

  @ApiPropertyOptional({ description: 'Operation metadata' })@IsOptional()@IsObject()
  metadata?: Record<string, any>;
}

export class FilterConfig {
  @ApiPropertyOptional({ description: 'Filter by job status' })@IsOptional()@IsArray()
  @IsString({ each: true })
  status?: string[];

  @ApiPropertyOptional({ description: 'Filter by operation type' })@IsOptional()@IsArray()
  @IsString({ each: true })
  type?: string[];

  @ApiPropertyOptional({ description: 'Filter by user ID' })@IsOptional()@IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by agent ID' })@IsOptional()@IsString()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Date range filter' })@IsOptional()@IsObject()
  dateRange?: {
    startDate: string;
    endDate: string;
  };

  @ApiPropertyOptional({ description: 'Custom filter criteria' })@IsOptional()@IsObject()
  custom?: Record<string, any>;
}

export class PaginationOptions {
  @ApiPropertyOptional({ description: 'Page number (1-based)', example: 1 })@IsOptional()@IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Results per page', example: 50 })@IsOptional()@IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;
}

export class SortingOptions {
  @ApiPropertyOptional({ description: 'Field to sort by', example: 'timestamp' })@IsOptional()@IsString()
  field?: string;

  @ApiPropertyOptional({ description: 'Sort order', example: 'desc' })@IsOptional()@IsString()
  order?: 'asc' | 'desc';}export class AggregationOptions {
  @ApiPropertyOptional({ description: 'Group results by field', example: 'type' })@IsOptional()@IsString()
  groupBy?: string;

  @ApiPropertyOptional({ description: 'Calculate statistical summaries', example: true })@IsOptional()@IsBoolean()
  includeStats?: boolean;

  @ApiPropertyOptional({ description: 'Generate time series data', example: true })@IsOptional()@IsBoolean()
  includeTimeSeries?: boolean;

  @ApiPropertyOptional({ description: 'Custom aggregation functions' })@IsOptional()@IsObject()
  customAggregations?: Record<string, any>;
}

export class AggregatedResultsRequestDto {
  @ApiPropertyOptional({ description: 'Result filters' })@IsOptional()@ValidateNested()
  @Type(() => FilterConfig)
  filters?: FilterConfig;

  @ApiPropertyOptional({ description: 'Pagination options' })@IsOptional()@ValidateNested()
  @Type(() => PaginationOptions)
  pagination?: PaginationOptions;

  @ApiPropertyOptional({ description: 'Sorting options' })@IsOptional()@ValidateNested()
  @Type(() => SortingOptions)
  sorting?: SortingOptions;

  @ApiPropertyOptional({ description: 'Aggregation options' })@IsOptional()@ValidateNested()
  @Type(() => AggregationOptions)
  aggregations?: AggregationOptions;

  @ApiPropertyOptional({ description: 'Export options' })@IsOptional()@ValidateNested()
  @Type(() => ExportOptions)
  exportOptions?: ExportOptions;

  @ApiPropertyOptional({ description: 'Include detailed analytics', example: true })@IsOptional()@IsBoolean()
  includeAnalytics?: boolean;
}

// Data Validation DTOs
export class SchemaValidationConfig {
  @ApiProperty({ description: 'Required fields schema' })@IsObject()required!: Record<string, string>;

  @ApiPropertyOptional({ description: 'Optional fields schema' })@IsOptional()@IsObject()
  optional?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Field constraints' })@IsOptional()@IsObject()
  constraints?: Record<string, any>;
}

export class QualityRulesConfig {
  @ApiPropertyOptional({ description: 'Minimum completeness threshold (0-1)', example: 0.8 })@IsOptional()@IsNumber()
  @Min(0)
  @Max(1)
  minCompleteness?: number;

  @ApiPropertyOptional({ description: 'Minimum accuracy threshold (0-1)', example: 0.7 })@IsOptional()@IsNumber()
  @Min(0)
  @Max(1)
  minAccuracy?: number;

  @ApiPropertyOptional({ description: 'Custom quality rules' })@IsOptional()@IsObject()
  customRules?: Record<string, any>;
}

export class ContentValidationConfig {
  @ApiPropertyOptional({ description: 'Enable content validation', example: true })@IsOptional()@IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Spam detection rules' })@IsOptional()@IsObject()
  spamDetection?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Content format validation' })@IsOptional()@IsObject()
  formatValidation?: Record<string, any>;
}

export class DuplicateDetectionConfig {
  @ApiPropertyOptional({ description: 'Duplicate detection algorithm', example: 'exact' })@IsOptional()@IsString()
  algorithm?: 'exact' | 'fuzzy' | 'semantic';@ApiPropertyOptional({ description: 'Similarity threshold for fuzzy matching', example: 0.85 })@IsOptional()@IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;

  @ApiPropertyOptional({ description: 'Fields to compare for duplicates' })@IsOptional()@IsArray()
  @IsString({ each: true })
  compareFields?: string[];
}

export class StatisticalAnalysisConfig {
  @ApiPropertyOptional({ description: 'Enable distribution analysis', example: true })@IsOptional()@IsBoolean()
  distributionAnalysis?: boolean;

  @ApiPropertyOptional({ description: 'Enable outlier detection', example: true })@IsOptional()@IsBoolean()
  outlierDetection?: boolean;

  @ApiPropertyOptional({ description: 'Enable correlation analysis', example: true })@IsOptional()@IsBoolean()
  correlationAnalysis?: boolean;

  @ApiPropertyOptional({ description: 'Statistical significance threshold', example: 0.05 })@IsOptional()@IsNumber()
  @Min(0)
  @Max(1)
  significanceThreshold?: number;
}

export class DataValidationConfigDto {
  @ApiProperty({ description: 'Schema validation configuration' })@ValidateNested()@Type(() => SchemaValidationConfig)
  schema!: SchemaValidationConfig;

  @ApiPropertyOptional({ description: 'Quality assessment rules' })@IsOptional()@ValidateNested()
  @Type(() => QualityRulesConfig)
  qualityRules?: QualityRulesConfig;

  @ApiPropertyOptional({ description: 'Content validation configuration' })@IsOptional()@ValidateNested()
  @Type(() => ContentValidationConfig)
  contentValidation?: ContentValidationConfig;

  @ApiPropertyOptional({ description: 'Duplicate detection configuration' })@IsOptional()@ValidateNested()
  @Type(() => DuplicateDetectionConfig)
  duplicateDetection?: DuplicateDetectionConfig;

  @ApiPropertyOptional({ description: 'Statistical analysis configuration' })@IsOptional()@ValidateNested()
  @Type(() => StatisticalAnalysisConfig)
  statisticalAnalysis?: StatisticalAnalysisConfig;
}

export class DataValidationRequestDto {
  @ApiProperty({ description: 'Data to validate' })@IsArray()@ArrayMinSize(1)
  data!: any[];

  @ApiProperty({ description: 'Validation configuration' })@ValidateNested()@Type(() => DataValidationConfigDto)
  validationConfig!: DataValidationConfigDto;

  @ApiPropertyOptional({ description: 'Data transformation configuration' })@IsOptional()@ValidateNested()
  @Type(() => TransformationConfig)
  transformationConfig?: TransformationConfig;

  @ApiPropertyOptional({ description: 'Include transformed data in response', example: false })@IsOptional()@IsBoolean()
  includeTransformedData?: boolean;

  @ApiPropertyOptional({ description: 'Export options' })@IsOptional()@ValidateNested()
  @Type(() => ExportOptions)
  exportOptions?: ExportOptions;
}

// Response DTOs
export class AggregationSummary {
  @ApiProperty({ description: 'Total items before aggregation', example: 1500 })totalItems!: number;@ApiProperty({ description: 'Items after deduplication', example: 1200 })deduplicatedItems!: number;@ApiProperty({ description: 'Valid items after validation', example: 1100 })validItems!: number;@ApiProperty({ description: 'Overall quality score (0-1)', example: 0.85 })qualityScore!: number;}

export class ExportInfo {
  @ApiProperty({ description: 'Export format used', enum: ExportFormat })format!: ExportFormat;@ApiProperty({ description: 'Generated filename', example: 'extraction_12345.csv' })filename!: string;@ApiProperty({ description: 'File size in bytes', example: 2048576 })size!: number;@ApiProperty({ description: 'Download URL', example: '/api/exports/extraction_12345.csv' })downloadUrl!: string;@ApiProperty({ description: 'Export generation timestamp' })generatedAt!: Date;@ApiPropertyOptional({ description: 'Export expiration timestamp' })expiresAt?: Date;}

export class DistributedScrapingResponseDto {
  @ApiProperty({ description: 'Operation success status', example: true })success!: boolean;@ApiProperty({ description: 'Unique operation identifier', example: 'dist_scrape_12345' })operationId!: string;@ApiProperty({ description: 'Job identifier for tracking', example: 'job_67890' })jobId!: string;@ApiProperty({ description: 'Result identifier for retrieval', example: 'result_abcde' })resultId!: string;@ApiProperty({ description: 'Number of agents used in operation', example: 5 })agentsUsed!: number;@ApiProperty({ description: 'Number of URLs processed', example: 100 })urlsProcessed!: number;@ApiProperty({ description: 'Total items extracted', example: 1200 })itemsExtracted!: number;@ApiProperty({ description: 'Total execution time in milliseconds', example: 45000 })executionTimeMs!: number;@ApiProperty({ description: 'Aggregation summary' })aggregationSummary!: AggregationSummary;@ApiPropertyOptional({ description: 'Export information if requested' })exportInfo?: ExportInfo;@ApiProperty({ description: 'URL for tracking operation progress', example: '/api/extraction-orchestration/progress/job_67890' })progressTrackingUrl!: string;}

export class SourceResult {
  @ApiProperty({ description: 'Source identifier', example: 'source_001' })sourceId!: string;@ApiProperty({ description: 'Number of items extracted', example: 250 })itemCount!: number;@ApiProperty({ description: 'Quality score for this source (0-1)', example: 0.9 })qualityScore!: number;@ApiProperty({ description: 'Processing time in milliseconds', example: 8000 })processingTimeMs!: number;@ApiProperty({ description: 'Errors encountered during extraction' })errors!: string[];}

export class QualityMetrics {
  @ApiProperty({ description: 'Overall quality score (0-1)', example: 0.85 })overallScore!: number;@ApiProperty({ description: 'Source consistency score (0-1)', example: 0.88 })sourceConsistency!: number;@ApiProperty({ description: 'Data completeness score (0-1)', example: 0.92 })dataCompleteness!: number;@ApiProperty({ description: 'Correlation accuracy score (0-1)', example: 0.78 })correlationAccuracy!: number;}

export class MultiSourceExtractionResponseDto {
  @ApiProperty({ description: 'Operation success status', example: true })success!: boolean;@ApiProperty({ description: 'Unique operation identifier', example: 'multi_extract_12345' })operationId!: string;@ApiProperty({ description: 'Job identifier for tracking', example: 'job_67890' })jobId!: string;@ApiProperty({ description: 'Result identifier for retrieval', example: 'result_abcde' })resultId!: string;@ApiProperty({ description: 'Number of sources processed', example: 5 })sourcesProcessed!: number;@ApiProperty({ description: 'Total items extracted across all sources', example: 1500 })totalItemsExtracted!: number;@ApiProperty({ description: 'Number of items with correlations', example: 800 })correlatedItemsCount!: number;@ApiProperty({ description: 'Total execution time in milliseconds', example: 35000 })executionTimeMs!: number;@ApiProperty({ description: 'Results per source', type: [SourceResult] })sourceResults!: SourceResult[];@ApiProperty({ description: 'Quality metrics for the operation' })qualityMetrics!: QualityMetrics;@ApiPropertyOptional({ description: 'Export information if requested' })exportInfo?: ExportInfo;}

export class DataQualityMetrics {
  @ApiProperty({ description: 'Overall quality score (0-1)', example: 0.85 })overallScore!: number;@ApiProperty({ description: 'Data completeness percentage', example: 92.5 })dataCompleteness!: number;@ApiProperty({ description: 'Accuracy score (0-1)', example: 0.88 })accuracyScore!: number;@ApiProperty({ description: 'Data freshness score (0-1)', example: 0.95 })freshnessScore!: number;}

export class PaginationInfo {
  @ApiProperty({ description: 'Current page number', example: 1 })page!: number;@ApiProperty({ description: 'Total number of pages', example: 10 })totalPages!: number;@ApiProperty({ description: 'Has next page', example: true })hasNext!: boolean;@ApiProperty({ description: 'Has previous page', example: false })hasPrevious!: boolean;}

export class AggregatedResultsResponseDto {
  @ApiProperty({ description: 'Operation success status', example: true })success!: boolean;@ApiProperty({ description: 'Unique operation identifier', example: 'agg_results_12345' })operationId!: string;@ApiProperty({ description: 'Total results available', example: 5000 })totalResults!: number;@ApiProperty({ description: 'Number of filtered results', example: 1200 })filteredResults!: number;@ApiProperty({ description: 'Aggregated data results' })aggregatedData!: any;@ApiProperty({ description: 'Analytics and insights' })analytics!: any;@ApiProperty({ description: 'Generated insights and recommendations' })insights!: any;@ApiProperty({ description: 'Quality metrics for the results' })qualityMetrics!: DataQualityMetrics;@ApiProperty({ description: 'Pagination information' })pagination!: PaginationInfo;@ApiPropertyOptional({ description: 'Export information if requested' })exportInfo?: ExportInfo;@ApiProperty({ description: 'Results retrieval timestamp' })retrievedAt!: Date;}

export class AgentStatus {
  @ApiProperty({ description: 'Agent identifier', example: 'agent_001' })agentId!: string;@ApiProperty({ description: 'Current agent status', enum: AgentStatus })status!: AgentStatus;@ApiProperty({ description: 'Current load percentage (0-100)', example: 75 })load!: number;@ApiPropertyOptional({ description: 'Current task description' })currentTask?: string;}

export class ProgressInfo {
  @ApiProperty({ description: 'Total number of tasks', example: 100 })totalTasks!: number;@ApiProperty({ description: 'Completed tasks count', example: 75 })completedTasks!: number;@ApiProperty({ description: 'Failed tasks count', example: 5 })failedTasks!: number;@ApiProperty({ description: 'Completion percentage', example: 75 })percentage!: number;@ApiPropertyOptional({ description: 'Current task being processed' })currentTask?: string;}

export class ThroughputMetrics {
  @ApiProperty({ description: 'Items processed per second', example: 12.5 })itemsPerSecond!: number;@ApiProperty({ description: 'Average task completion time in milliseconds', example: 2500 })averageTaskTime!: number;@ApiProperty({ description: 'Overall efficiency percentage', example: 85.5 })efficiency!: number;}

export class ExtractionProgressDto {
  @ApiProperty({ description: 'Extraction identifier', example: 'extract_12345' })extractionId!: string;@ApiProperty({ description: 'Job identifier', example: 'job_67890' })jobId!: string;@ApiProperty({ description: 'Current job status', enum: JobStatus })status!: JobStatus;@ApiProperty({ description: 'Progress information' })progress!: ProgressInfo;@ApiProperty({ description: 'Status of assigned agents', type: [AgentStatus] })agentStatus!: AgentStatus[];@ApiPropertyOptional({ description: 'Operation start time' })startTime?: Date;@ApiPropertyOptional({ description: 'Estimated completion time' })estimatedCompletionTime?: Date;@ApiProperty({ description: 'Errors encountered during execution' })errors!: string[];@ApiProperty({ description: 'Throughput and performance metrics' })throughputMetrics!: ThroughputMetrics;@ApiProperty({ description: 'Last update timestamp' })lastUpdated!: Date;}

// Data Validation Response DTOs
export class ValidationResults {
  @ApiPropertyOptional({ description: 'Schema validation results' })schema?: any;@ApiPropertyOptional({ description: 'Quality assessment results' })quality?: any;@ApiPropertyOptional({ description: 'Content validation results' })content?: any;@ApiPropertyOptional({ description: 'Duplicate detection results' })duplicates?: any;@ApiPropertyOptional({ description: 'Statistical analysis results' })statistics?: any;}

export class DataValidationResponseDto {
  @ApiProperty({ description: 'Validation success status', example: true })success!: boolean;@ApiProperty({ description: 'Unique operation identifier', example: 'data_val_12345' })operationId!: string;@ApiProperty({ description: 'Number of items validated', example: 1000 })validatedItemCount!: number;@ApiProperty({ description: 'Overall quality score (0-1)', example: 0.85 })qualityScore!: number;@ApiProperty({ description: 'Detailed validation results' })validationResults!: ValidationResults;@ApiPropertyOptional({ description: 'Transformed data if requested' })transformedData?: any[];@ApiProperty({ description: 'Validation recommendations' })recommendations!: string[];@ApiProperty({ description: 'Processing time in milliseconds', example: 15000 })processingTimeMs!: number;@ApiPropertyOptional({ description: 'Export information if requested' })exportInfo?: ExportInfo;@ApiProperty({ description: 'Validation completion timestamp' })validatedAt!: Date;}

// System Statistics DTOs
export class AgentMetrics {
  @ApiProperty({ description: 'Total number of agents', example: 10 })totalAgents!: number;@ApiProperty({ description: 'Number of active agents', example: 8 })activeAgents!: number;@ApiProperty({ description: 'Number of busy agents', example: 5 })busyAgents!: number;@ApiProperty({ description: 'Average load across all agents', example: 65 })averageLoad!: number;@ApiProperty({ description: 'Resource utilization metrics' })resourceUtilization!: {cpu: number;
    memory: number;
    network: number;
  };
}

export class JobMetrics {
  @ApiProperty({ description: 'Total number of jobs', example: 150 })totalJobs!: number;@ApiProperty({ description: 'Number of active jobs', example: 12 })activeJobs!: number;@ApiProperty({ description: 'Number of completed jobs', example: 130 })completedJobs!: number;@ApiProperty({ description: 'Number of failed jobs', example: 8 })failedJobs!: number;@ApiProperty({ description: 'Average job duration in milliseconds', example: 45000 })averageJobDuration!: number;@ApiProperty({ description: 'Job throughput per hour', example: 25.5 })jobThroughput!: number;}

export class ExtractionMetrics {
  @ApiProperty({ description: 'Total items extracted', example: 500000 })totalItemsExtracted!: number;@ApiProperty({ description: 'Success rate percentage', example: 95.5 })successRate!: number;@ApiProperty({ description: 'Average quality score (0-1)', example: 0.88 })averageQualityScore!: number;@ApiProperty({ description: 'Data volume in bytes', example: 1024000000 })dataVolume!: number;@ApiProperty({ description: 'Error rate percentage', example: 2.1 })errorRate!: number;}

export class PerformanceMetrics {
  @ApiProperty({ description: 'Average response time in milliseconds', example: 2500 })averageResponseTime!: number;@ApiProperty({ description: 'System throughput (items per second)', example: 125.5 })throughput!: number;@ApiProperty({ description: 'System efficiency percentage', example: 92.3 })efficiency!: number;@ApiProperty({ description: 'Resource optimization score', example: 88.7 })resourceOptimization!: number;}

export class SystemHealth {
  @ApiProperty({ description: 'Overall system health status', example: 'healthy' })status!: 'healthy' | 'warning' | 'critical';@ApiProperty({ description: 'Active system alerts' })alerts!: string[];@ApiProperty({ description: 'System recommendations' })recommendations!: string[];}

export class ExtractionOrchestratorStatsDto {
  @ApiProperty({ description: 'Statistics period', example: '24h' })period!: string;@ApiProperty({ description: 'Time range for statistics' })timeRange!: {startDate: Date;
    endDate: Date;
  };

  @ApiProperty({ description: 'Agent-related metrics' })agentMetrics!: AgentMetrics;@ApiProperty({ description: 'Job-related metrics' })jobMetrics!: JobMetrics;@ApiProperty({ description: 'Extraction-related metrics' })extractionMetrics!: ExtractionMetrics;@ApiProperty({ description: 'Performance metrics' })performanceMetrics!: PerformanceMetrics;@ApiProperty({ description: 'System health information' })systemHealth!: SystemHealth;@ApiProperty({ description: 'Statistics generation timestamp' })
  generatedAt!: Date;
}