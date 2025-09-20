import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';import {IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsUrl,
  Min,
  Max,
} from 'class-validator';/*** Browser session status
 */
export enum BrowserSessionStatus {
  CREATING = 'creating',ACTIVE = 'active',IDLE = 'idle',BUSY = 'busy',CLOSING = 'closing',CLOSED = 'closed',ERROR = 'error',}/**
 * Browser tab information
 */
export class BrowserTabInfoDto {
  @ApiProperty({
    description: 'Unique tab identifier',})tabId: string = '';@ApiProperty({description: 'Current tab URL',})url: string = '';@ApiProperty({description: 'Tab title',})title: string = '';@ApiProperty({description: 'Whether tab is currently active/focused',})active: boolean = false;

  @ApiProperty({
    description: 'Tab loading status',})loading: boolean = false;

  @ApiPropertyOptional({
    description: 'Tab favicon URL',})faviconUrl?: string;

  @ApiProperty({
    description: 'Tab creation timestamp',})createdAt: Date = new Date();

  @ApiProperty({
    description: 'Last activity timestamp',})lastActivityAt: Date = new Date();
}

/**
 * Create browser session request
 */
export class CreateBrowserSessionDto {
  @ApiPropertyOptional({
    description: 'Session _name for identification',example: 'E-commerce data extraction session',})@IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Browser viewport width',minimum: 320,maximum: 3840,
    default: 1920,
  })
  @IsOptional()
  @IsNumber()
  @Min(320)
  @Max(3840)
  viewportWidth?: number = 1920;

  @ApiPropertyOptional({
    description: 'Browser viewport height',minimum: 240,maximum: 2160,
    default: 1080,
  })
  @IsOptional()
  @IsNumber()
  @Min(240)
  @Max(2160)
  viewportHeight?: number = 1080;

  @ApiPropertyOptional({
    description: 'Run browser in headless mode',default: false,})
  @IsOptional()
  @IsBoolean()
  headless?: boolean = false;

  @ApiPropertyOptional({
    description: 'Enable browser developer tools',default: false,})
  @IsOptional()
  @IsBoolean()
  devtools?: boolean = false;

  @ApiPropertyOptional({
    description: 'Custom user agent string',})@IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Additional Chrome launch arguments',type: [String],})
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalArgs?: string[];

  @ApiPropertyOptional({
    description: 'Proxy configuration',type: 'object',additionalProperties: true,})
  @IsOptional()
  @IsObject()
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };

  @ApiPropertyOptional({
    description: 'Browser profile directory path (local filesystem)',})@IsOptional()
  @IsString()
  profilePath?: string;

  @ApiPropertyOptional({
    description: 'Session timeout in milliseconds',minimum: 60000, // 1 minutemaximum: 7200000, // 2 hours
    default: 1800000, // 30 minutes
  })
  @IsOptional()
  @IsNumber()
  @Min(60000)
  @Max(7200000)
  sessionTimeoutMs?: number = 1800000;

  @ApiPropertyOptional({
    description: 'Initial URLs to open in tabs',type: [String],})
  @IsOptional()
  @IsArray()
  @IsUrl({ require_protocol: true }, { each: true })
  initialUrls?: string[];

  @ApiPropertyOptional({
    description: 'Enable automatic screenshot capture',default: true,})
  @IsOptional()
  @IsBoolean()
  enableScreenshots?: boolean = true;

  @ApiPropertyOptional({
    description: 'Screenshot capture interval in milliseconds',minimum: 1000,maximum: 60000,
    default: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(60000)
  screenshotIntervalMs?: number = 5000;

  @ApiPropertyOptional({
    description: 'Custom session metadata',type: 'object',additionalProperties: true,})
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Browser session information
 */
export class BrowserSessionDto {
  @ApiProperty({
    description: 'Unique session identifier',})sessionId: string = '';@ApiProperty({description: 'Session _name',})name: string = '';@ApiProperty({description: 'Current session status',enum: BrowserSessionStatus,})
  status: BrowserSessionStatus = BrowserSessionStatus.CREATING;

  @ApiProperty({
    description: 'Browser process ID',})browserPid: number = 0;

  @ApiProperty({
    description: 'Session creation timestamp',})createdAt: Date = new Date();

  @ApiProperty({
    description: 'Last activity timestamp',})lastActivityAt: Date = new Date();

  @ApiPropertyOptional({
    description: 'Session closure timestamp',})closedAt?: Date;

  @ApiProperty({
    description: 'Browser viewport dimensions',type: 'object',additionalProperties: true,})
  viewport: {
    width: number;
    height: number;
  } = { width: 1920, height: 1080 };

  @ApiProperty({
    description: 'Browser configuration',type: 'object',additionalProperties: true,})
  config: {
    headless: boolean;
    devtools: boolean;
    userAgent?: string;
    proxy?: {
      server: string;
      username?: string;
    };
    profilePath?: string;
  } = { headless: true, devtools: false };

  @ApiProperty({
    description: 'Active browser tabs',type: [BrowserTabInfoDto],})
  tabs: BrowserTabInfoDto[] = [];

  @ApiProperty({
    description: 'Current active tab ID',})activeTabId: string = '';@ApiProperty({description: 'Session statistics',type: 'object',additionalProperties: true,})
  statistics: {
    totalTabs: number;
    totalPageLoads: number;
    totalScreenshots: number;
    totalActions: number;
    upTimeMs: number;
  } = {
    totalTabs: 0,
    totalPageLoads: 0,
    totalScreenshots: 0,
    totalActions: 0,
    upTimeMs: 0
  };

  @ApiPropertyOptional({
    description: 'Session error information if in error state',type: 'object',additionalProperties: true,})
  errorInfo?: {
    message: string;
    code: string;
    timestamp: Date;
    details?: Record<string, unknown>;
  };

  @ApiPropertyOptional({
    description: 'Custom session metadata',type: 'object',additionalProperties: true,})
  metadata?: Record<string, unknown>;
}

/**
 * Tab management operations
 */
export class TabOperationDto {
  @ApiPropertyOptional({
    description: 'URL to navigate to (for create/navigate operations)',})@IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;

  @ApiPropertyOptional({
    description: 'Tab title (for create operations)',})@IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Make tab active after operation',default: true,})
  @IsOptional()
  @IsBoolean()
  makeActive?: boolean = true;
}

/**
 * DOM extraction configuration
 */
export class DomExtractionDto {
  @ApiPropertyOptional({
    description: 'CSS selector to extract specific elements',})@IsOptional()
  @IsString()
  selector?: string;

  @ApiPropertyOptional({
    description: 'Include element attributes in extraction',default: true,})
  @IsOptional()
  @IsBoolean()
  includeAttributes?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include element text content',default: true,})
  @IsOptional()
  @IsBoolean()
  includeText?: boolean = true;

  @ApiPropertyOptional({
    description: 'Maximum depth for DOM tree extraction',minimum: 1,maximum: 10,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxDepth?: number = 5;

  @ApiPropertyOptional({
    description: 'Filter out hidden elements',default: true,})
  @IsOptional()
  @IsBoolean()
  excludeHidden?: boolean = true;
}

/**
 * Screenshot configuration
 */
export class ScreenshotConfigDto {
  @ApiPropertyOptional({
    description: 'Screenshot format',enum: ['png', 'jpeg'],default: 'png',})@IsOptional()
  @IsEnum(['png', 'jpeg'])format?: 'png' | 'jpeg' = 'png';@ApiPropertyOptional({description: 'Screenshot quality (for JPEG)',minimum: 10,maximum: 100,
    default: 85,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  quality?: number = 85;

  @ApiPropertyOptional({
    description: 'Capture full page (vs viewport only)',default: false,})
  @IsOptional()
  @IsBoolean()
  fullPage?: boolean = false;

  @ApiPropertyOptional({
    description: 'CSS selector to capture specific element',})@IsOptional()
  @IsString()
  elementSelector?: string;

  @ApiPropertyOptional({
    description: 'Return screenshot as base64 string',default: true,})
  @IsOptional()
  @IsBoolean()
  returnBase64?: boolean = true;
}

/**
 * Session health check result
 */
export class SessionHealthCheckDto {
  @ApiProperty({
    description: 'Session identifier',})sessionId: string = '';@ApiProperty({description: 'Overall health status',enum: ['healthy', 'warning', 'critical'],})status: 'healthy' | 'warning' | 'critical' = 'healthy';@ApiProperty({description: 'Health score (0-100)',minimum: 0,maximum: 100,
  })
  healthScore: number = 100;

  @ApiProperty({
    description: 'Health check timestamp',})checkTimestamp: Date = new Date();

  @ApiProperty({
    description: 'Health check duration in milliseconds',})checkDurationMs: number = 0;

  @ApiPropertyOptional({
    description: 'List of health issues found',type: [String],})
  issues?: string[];

  @ApiPropertyOptional({
    description: 'Detailed health metrics',type: 'object',additionalProperties: true,})
  metrics?: {
    processHealth: boolean;
    memoryUsageMB: number;
    cpuUsagePercent: number;
    inactiveTimeMs: number;
    tabCount: number;
    errorTabCount: number;
  };
}

/**
 * Session metrics DTO
 */
export class SessionMetricsDto {
  @ApiProperty({
    description: 'Session identifier',})sessionId: string = '';@ApiProperty({description: 'Metrics timeframe',})timeframe: string = '';@ApiProperty({description: 'Metrics generation timestamp',})generatedAt: Date = new Date();

  @ApiProperty({
    description: 'Session information',type: 'object',additionalProperties: true,})
  session: {
    upTimeMs: number;
    status: BrowserSessionStatus;
    tabCount: number;
    lastActivityAt: Date;
  } = {
    upTimeMs: 0,
    status: BrowserSessionStatus.ACTIVE,
    tabCount: 0,
    lastActivityAt: new Date(),
  };

  @ApiProperty({
    description: 'Performance metrics',type: 'object',additionalProperties: true,})
  performance: {
    averageResponseTimeMs: number;
    peakMemoryUsageMB: number;
    averageCpuUsagePercent: number;
    totalScreenshots: number;
    totalPageLoads: number;
    totalActions: number;
  } = {
    averageResponseTimeMs: 0,
    peakMemoryUsageMB: 0,
    averageCpuUsagePercent: 0,
    totalScreenshots: 0,
    totalPageLoads: 0,
    totalActions: 0,
  };

  @ApiProperty({
    description: 'Resource usage metrics',type: 'object',additionalProperties: true,})
  resources: {
    memoryMB: number;
    cpuUsagePercent: number;
  } = {
    memoryMB: 0,
    cpuUsagePercent: 0,
  };

  @ApiProperty({
    description: 'Activity metrics',type: 'object',additionalProperties: true,})
  activity: {
    recentEvents: number;
    activityScore: number;
    healthScore: number;
  } = {
    recentEvents: 0,
    activityScore: 0,
    healthScore: 100,
  };

  @ApiProperty({
    description: 'Trend analysis',type: 'object',additionalProperties: true,})
  trends: {
    memoryTrend: 'increasing' | 'decreasing' | 'stable';cpuTrend: 'increasing' | 'decreasing' | 'stable';activityTrend: 'increasing' | 'decreasing' | 'stable';} = {memoryTrend: 'stable',cpuTrend: 'stable',activityTrend: 'stable',};}

/**
 * Session configuration update DTO
 */
export class SessionConfigUpdateDto {
  @ApiPropertyOptional({
    description: 'Update session timeout in milliseconds',minimum: 60000,maximum: 7200000,
  })
  @IsOptional()
  @IsNumber()
  @Min(60000)
  @Max(7200000)
  sessionTimeoutMs?: number;

  @ApiPropertyOptional({
    description: 'Update session metadata',type: 'object',additionalProperties: true,})
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Bulk session operation DTO
 */
export class BulkSessionOperationDto {
  @ApiProperty({
    description: 'Operation to perform',enum: ['create', 'close', 'health_check', 'update'],})@IsEnum(['create', 'close', 'health_check', 'update'])operation: 'create' | 'close' | 'health_check' | 'update' = 'health_check';@ApiPropertyOptional({description: 'Session IDs for operations (required for close, health_check, update)',type: [String],})
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sessionIds?: string[];

  @ApiPropertyOptional({
    description: 'Session configurations for bulk create operation',type: [CreateBrowserSessionDto],})
  @IsOptional()
  @IsArray()
  sessionConfigs?: CreateBrowserSessionDto[];

  @ApiPropertyOptional({
    description: 'Execute operations in parallel',default: true,})
  @IsOptional()
  @IsBoolean()
  parallel?: boolean = true;

  @ApiPropertyOptional({
    description: 'Maximum concurrent operations (when parallel=true)',minimum: 1,maximum: 20,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxConcurrency?: number = 5;
}

/**
 * Bulk session operation result DTO
 */
export class BulkSessionResultDto {
  @ApiProperty({
    description: 'Operation that was performed',})operation: string = '';@ApiProperty({description: 'Total number of sessions processed',})totalSessions: number = 0;

  @ApiProperty({
    description: 'Successfully processed session IDs',type: [String],})
  successful: string[] = [];

  @ApiProperty({
    description: 'Failed operations with error details',type: 'array',items: {type: 'object',properties: {sessionId: { type: 'string' },error: { type: 'string' },},},
  })
  failed: Array<{ sessionId: string; error: string }> = [];

  @ApiProperty({
    description: 'Total execution time in milliseconds',})executionTimeMs: number = 0;

  @ApiProperty({
    description: 'Operation summary statistics',type: 'object',
    additionalProperties: true,
  })
  summary: {
    successRate: number;
    avgExecutionTimeMs: number;
  } = {
    successRate: 0,
    avgExecutionTimeMs: 0,
  };
}
