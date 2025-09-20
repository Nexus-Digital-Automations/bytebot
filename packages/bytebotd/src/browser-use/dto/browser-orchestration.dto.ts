import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';import {IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsEnum,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';import { Type } from 'class-transformer';import { CreateBrowserTaskDto, BrowserTaskResultDto } from './browser-task.dto';/*** Browser orchestration execution strategies
 */
export enum OrchestrationStrategy {
  SEQUENTIAL = 'sequential',PARALLEL = 'parallel',HYBRID = 'hybrid',ADAPTIVE = 'adaptive',}/**
 * Orchestration execution status
 */
export enum OrchestrationStatus {
  PENDING = 'pending',INITIALIZING = 'initializing',EXECUTING = 'executing',COMPLETED = 'completed',FAILED = 'failed',CANCELLED = 'cancelled',TIMEOUT = 'timeout',}/**
 * Load balancing strategies for agent coordination
 */
export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round_robin',LEAST_LOADED = 'least_loaded',CAPABILITY_BASED = 'capability_based',ADAPTIVE = 'adaptive',}/**
 * Failure handling strategies
 */
export enum FailureStrategy {
  FAIL_FAST = 'fail_fast',CONTINUE_ON_ERROR = 'continue_on_error',RETRY_FAILED = 'retry_failed',}/**
 * Multi-agent coordination configuration
 */
export class MultiAgentConfigDto {
  @ApiPropertyOptional({
    description: 'Maximum number of concurrent browser agents',minimum: 1,maximum: 10,
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxConcurrentAgents?: number = 3;

  @ApiPropertyOptional({
    description: 'Maximum number of concurrent browser sessions',minimum: 1,maximum: 20,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxConcurrentSessions?: number = 5;

  @ApiPropertyOptional({
    description: 'Enable session reuse across tasks',default: true,})
  @IsOptional()
  @IsBoolean()
  enableSessionReuse?: boolean = true;

  @ApiPropertyOptional({
    description: 'Task distribution load balancing strategy',enum: LoadBalancingStrategy,default: LoadBalancingStrategy.ADAPTIVE,
  })
  @IsOptional()
  @IsEnum(LoadBalancingStrategy)
  loadBalancingStrategy?: LoadBalancingStrategy = LoadBalancingStrategy.ADAPTIVE;

  @ApiPropertyOptional({
    description: 'Agent coordination timeout in milliseconds',minimum: 5000,maximum: 300000,
    default: 60000,
  })
  @IsOptional()
  @IsNumber()
  @Min(5000)
  @Max(300000)
  coordinationTimeoutMs?: number = 60000;

  @ApiPropertyOptional({
    description: 'Enable intelligent task batching',default: true,})
  @IsOptional()
  @IsBoolean()
  enableTaskBatching?: boolean = true;

  @ApiPropertyOptional({
    description: 'Maximum batch size for task grouping',minimum: 1,maximum: 10,
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxBatchSize?: number = 3;

  @ApiPropertyOptional({
    description: 'Agent health check interval in milliseconds',minimum: 1000,maximum: 60000,
    default: 10000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(60000)
  healthCheckIntervalMs?: number = 10000;
}

/**
 * Performance optimization configuration
 */
export class PerformanceConfigDto {
  @ApiPropertyOptional({
    description: 'Enable task result caching',default: false,})
  @IsOptional()
  @IsBoolean()
  enableResultCaching?: boolean = false;

  @ApiPropertyOptional({
    description: 'Cache TTL in milliseconds',minimum: 60000,maximum: 3600000,
    default: 300000,
  })
  @IsOptional()
  @IsNumber()
  @Min(60000)
  @Max(3600000)
  cacheTtlMs?: number = 300000;

  @ApiPropertyOptional({
    description: 'Enable performance monitoring',default: true,})
  @IsOptional()
  @IsBoolean()
  enablePerformanceMonitoring?: boolean = true;

  @ApiPropertyOptional({
    description: 'Memory usage threshold for scaling (percentage)',minimum: 50,maximum: 95,
    default: 80,
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(95)
  memoryThresholdPercent?: number = 80;

  @ApiPropertyOptional({
    description: 'CPU usage threshold for scaling (percentage)',minimum: 50,maximum: 95,
    default: 85,
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(95)
  cpuThresholdPercent?: number = 85;
}

/**
 * Orchestrated browser task execution request
 */
export class BrowserOrchestrationDto {
  @ApiProperty({
    description: 'List of browser tasks to orchestrate',type: [CreateBrowserTaskDto],})
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBrowserTaskDto)
  tasks: CreateBrowserTaskDto[] = [];

  @ApiPropertyOptional({
    description: 'Orchestration execution strategy',enum: OrchestrationStrategy,default: OrchestrationStrategy.ADAPTIVE,
  })
  @IsOptional()
  @IsEnum(OrchestrationStrategy)
  strategy?: OrchestrationStrategy = OrchestrationStrategy.ADAPTIVE;

  @ApiPropertyOptional({
    description: 'Multi-agent coordination configuration',type: MultiAgentConfigDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => MultiAgentConfigDto)
  multiAgentConfig?: MultiAgentConfigDto;

  @ApiPropertyOptional({
    description: 'Performance optimization configuration',type: PerformanceConfigDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => PerformanceConfigDto)
  performanceConfig?: PerformanceConfigDto;

  @ApiPropertyOptional({
    description: 'Global orchestration timeout in milliseconds',minimum: 10000,maximum: 1800000,
    default: 600000,
  })
  @IsOptional()
  @IsNumber()
  @Min(10000)
  @Max(1800000)
  orchestrationTimeoutMs?: number = 600000;

  @ApiPropertyOptional({
    description: 'Enable real-time progress monitoring via WebSocket',default: true,})
  @IsOptional()
  @IsBoolean()
  enableRealtimeMonitoring?: boolean = true;

  @ApiPropertyOptional({
    description: 'Failure handling strategy',enum: FailureStrategy,default: FailureStrategy.RETRY_FAILED,
  })
  @IsOptional()
  @IsEnum(FailureStrategy)
  failureStrategy?: FailureStrategy = FailureStrategy.RETRY_FAILED;

  @ApiPropertyOptional({
    description: 'Maximum retry attempts for failed tasks',minimum: 0,maximum: 5,
    default: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  maxRetryAttempts?: number = 2;

  @ApiPropertyOptional({
    description: 'Priority override for all tasks in orchestration',enum: ['low', 'normal', 'high', 'critical'],})@IsOptional()
  @IsString()
  priorityOverride?: string;

  @ApiPropertyOptional({
    description: 'Enable detailed execution logging',default: true,})
  @IsOptional()
  @IsBoolean()
  enableDetailedLogging?: boolean = true;

  @ApiPropertyOptional({
    description: 'Custom orchestration metadata',type: 'object',additionalProperties: true,})
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Agent performance metrics
 */
export class AgentPerformanceDto {
  @ApiProperty({
    description: 'Agent identifier',})agentId: string = '';@ApiProperty({description: 'Number of tasks completed by agent',})tasksCompleted: number = 0;

  @ApiProperty({
    description: 'Average task execution time in milliseconds',})averageTaskTime: number = 0;

  @ApiProperty({
    description: 'Agent success rate as percentage',})successRate: number = 0;

  @ApiProperty({
    description: 'Current agent utilization percentage',})utilizationPercent: number = 0;

  @ApiProperty({
    description: 'Agent memory usage in MB',})memoryUsageMb: number = 0;

  @ApiProperty({
    description: 'Agent CPU usage percentage',})cpuUsagePercent: number = 0;

  @ApiPropertyOptional({
    description: 'Agent-specific metadata',type: 'object',additionalProperties: true,})
  metadata?: Record<string, unknown>;
}

/**
 * Orchestration agent metrics
 */
export class OrchestrationAgentMetricsDto {
  @ApiProperty({
    description: 'Total number of agents used',})totalAgentsUsed: number = 0;

  @ApiProperty({
    description: 'Average agent utilization percentage',})averageAgentUtilization: number = 0;

  @ApiProperty({
    description: 'Peak number of concurrent agents',})peakConcurrentAgents: number = 0;

  @ApiProperty({
    description: 'Individual agent performance metrics',type: [AgentPerformanceDto],})
  agentPerformance: AgentPerformanceDto[] = [];

  @ApiPropertyOptional({
    description: 'Load balancing efficiency metrics',type: 'object',additionalProperties: true,})
  loadBalancingMetrics?: {
    distributionVariance: number;
    balancingEfficiency: number;
    rebalancingEvents: number;
  };
}

/**
 * Orchestration execution log entry
 */
export class OrchestrationLogEntryDto {
  @ApiProperty({
    description: 'Log entry timestamp',})timestamp: Date = new Date();

  @ApiProperty({
    description: 'Log level',enum: ['debug', 'info', 'warn', 'error'],})level: string = 'info';@ApiProperty({description: 'Log message',})message: string = '';@ApiProperty({description: 'Component that generated the log',})component: string = '';@ApiPropertyOptional({description: 'Associated task ID',})taskId?: string;

  @ApiPropertyOptional({
    description: 'Associated agent ID',})agentId?: string;

  @ApiPropertyOptional({
    description: 'Additional log metadata',type: 'object',additionalProperties: true,})
  metadata?: Record<string, unknown>;
}

/**
 * Orchestration error details
 */
export class OrchestrationErrorDto {
  @ApiProperty({
    description: 'Error message',})message: string = '';@ApiProperty({description: 'Error code',})code: string = '';@ApiPropertyOptional({description: 'Error category',enum: ['validation', 'execution', 'timeout', 'resource', 'system'],})category?: string;

  @ApiPropertyOptional({
    description: 'Error severity',enum: ['low', 'medium', 'high', 'critical'],})severity?: string;

  @ApiPropertyOptional({
    description: 'Detailed error information',type: 'object',additionalProperties: true,})
  details?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Error recovery suggestions',type: [String],})
  recoverySuggestions?: string[];
}

/**
 * Orchestration execution result
 */
export class BrowserOrchestrationResultDto {
  @ApiProperty({
    description: 'Unique orchestration identifier',})orchestrationId: string = '';@ApiProperty({description: 'Current orchestration status',enum: OrchestrationStatus,})
  status: OrchestrationStatus = OrchestrationStatus.PENDING;

  @ApiProperty({
    description: 'Orchestration execution strategy used',enum: OrchestrationStrategy,})
  strategy: OrchestrationStrategy = OrchestrationStrategy.ADAPTIVE;

  @ApiProperty({
    description: 'Total number of tasks in orchestration',})totalTasks: number = 0;

  @ApiProperty({
    description: 'Number of successfully completed tasks',})successfulTasks: number = 0;

  @ApiProperty({
    description: 'Number of failed tasks',})failedTasks: number = 0;

  @ApiProperty({
    description: 'Number of cancelled tasks',})cancelledTasks: number = 0;

  @ApiProperty({
    description: 'Number of tasks currently in progress',})inProgressTasks: number = 0;

  @ApiProperty({
    description: 'Orchestration start timestamp',})startedAt: Date = new Date();

  @ApiPropertyOptional({
    description: 'Orchestration completion timestamp',})completedAt?: Date;

  @ApiProperty({
    description: 'Total orchestration duration in milliseconds',})durationMs: number = 0;

  @ApiProperty({
    description: 'Success rate as percentage',})successRate: number = 0;

  @ApiPropertyOptional({
    description: 'Estimated completion time for active orchestrations',})estimatedCompletionTime?: Date;

  @ApiProperty({
    description: 'Individual task execution results',type: [BrowserTaskResultDto],})
  taskResults: BrowserTaskResultDto[] = [];

  @ApiPropertyOptional({
    description: 'Agent utilization and performance metrics',type: OrchestrationAgentMetricsDto,})
  agentMetrics?: OrchestrationAgentMetricsDto;

  @ApiProperty({
    description: 'Orchestration execution logs',type: [OrchestrationLogEntryDto],})
  logs: OrchestrationLogEntryDto[] = [];

  @ApiPropertyOptional({
    description: 'Error information if orchestration failed',type: OrchestrationErrorDto,})
  error?: OrchestrationErrorDto;

  @ApiPropertyOptional({
    description: 'Performance metrics for orchestration',type: 'object',additionalProperties: true,})
  performanceMetrics?: {
    averageTaskExecutionTime: number;
    totalResourceUsage: {
      peakMemoryMb: number;
      peakCpuPercent: number;
      networkBytesTransferred: number;
    };
    scalingEvents: number;
    cacheHitRate?: number;
  };

  @ApiPropertyOptional({
    description: 'Custom orchestration metadata',type: 'object',additionalProperties: true,})
  metadata?: Record<string, unknown>;
}

/**
 * Real-time orchestration progress update
 */
export class OrchestrationProgressUpdateDto {
  @ApiProperty({
    description: 'Orchestration identifier',})orchestrationId: string = '';@ApiProperty({description: 'Current orchestration status',enum: OrchestrationStatus,})
  status: OrchestrationStatus = OrchestrationStatus.PENDING;

  @ApiPropertyOptional({
    description: 'Currently executing task identifier',})currentTask?: string;

  @ApiProperty({
    description: 'Progress information',type: 'object',properties: {completedTasks: { type: 'number' },totalTasks: { type: 'number' },percentage: { type: 'number' },},})
  progress: {
    completedTasks: number;
    totalTasks: number;
    percentage: number;
  } = { completedTasks: 0, totalTasks: 0, percentage: 0 };

  @ApiPropertyOptional({
    description: 'Current agent status information',type: [Object],})
  agentStatus?: Array<{
    agentId: string;
    status: string;
    currentTask?: string;
    utilizationPercent: number;
  }>;

  @ApiProperty({
    description: 'Update timestamp',})timestamp: Date = new Date();

  @ApiPropertyOptional({
    description: 'Estimated time remaining in milliseconds',})estimatedTimeRemainingMs?: number;

  @ApiPropertyOptional({
    description: 'Current throughput (tasks per minute)',})currentThroughput?: number;
}

/**
 * WebSocket subscription request
 */
export class OrchestrationSubscriptionDto {
  @ApiProperty({
    description: 'Orchestration ID to subscribe to',})@IsString()
  orchestrationId: string = '';@ApiPropertyOptional({description: 'Types of events to subscribe to',type: [String],enum: ['status', 'progress', 'logs', 'metrics'],})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventTypes?: string[] = ['status', 'progress'];@ApiPropertyOptional({description: 'Enable detailed progress updates',default: false,})
  @IsOptional()
  @IsBoolean()
  includeDetailedProgress?: boolean = false;
}

/**
 * Orchestration metrics summary
 */
export class OrchestrationMetricsSummaryDto {
  @ApiProperty({
    description: 'Summary statistics',type: 'object',properties: {totalOrchestrations: { type: 'number' },totalTasksExecuted: { type: 'number' },overallSuccessRate: { type: 'number' },averageOrchestrationTime: { type: 'number' },},})
  summary: {
    totalOrchestrations: number;
    totalTasksExecuted: number;
    overallSuccessRate: number;
    averageOrchestrationTime: number;
  } = {
    totalOrchestrations: 0,
    totalTasksExecuted: 0,
    overallSuccessRate: 0,
    averageOrchestrationTime: 0,
  };

  @ApiProperty({
    description: 'Number of currently active orchestrations',})activeOrchestrations: number = 0;

  @ApiProperty({
    description: 'Recent performance metrics',type: 'object',properties: {orchestrationsLast24h: { type: 'number' },tasksLast24h: { type: 'number' },successRateLast24h: { type: 'number' },},})
  recentPerformance: {
    orchestrationsLast24h: number;
    tasksLast24h: number;
    successRateLast24h: number;
  } = {
    orchestrationsLast24h: 0,
    tasksLast24h: 0,
    successRateLast24h: 0,
  };

  @ApiProperty({
    description: 'Agent utilization metrics',type: 'object',properties: {totalAgents: { type: 'number' },averageUtilization: { type: 'number' },healthyAgents: { type: 'number' },},})
  agentUtilization: {
    totalAgents: number;
    averageUtilization: number;
    healthyAgents: number;
  } = {
    totalAgents: 0,
    averageUtilization: 0,
    healthyAgents: 0,
  };

  @ApiProperty({
    description: 'Resource usage metrics',type: 'object',additionalProperties: true,})
  resourceUsage?: {
    averageMemoryUsageMb: number;
    averageCpuUsagePercent: number;
    totalNetworkBytes: number;
    diskUsagePercent: number;
  };

  @ApiProperty({
    description: 'Metrics timestamp',
  })
  timestamp: string = new Date().toISOString();
}