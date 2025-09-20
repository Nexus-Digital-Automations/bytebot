import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';import { IsString, IsObject, IsOptional, IsBoolean, IsArray, IsEnum, IsNumber, ValidateNested } from 'class-validator';import { Type } from 'class-transformer';/*** Content monitoring types
 */
export enum MonitoringType {
  TEXT_CHANGE = 'text_change',ELEMENT_CHANGE = 'element_change',PAGE_CHANGE = 'page_change',IMAGE_CHANGE = 'image_change',FORM_CHANGE = 'form_change',TABLE_CHANGE = 'table_change',LIST_CHANGE = 'list_change',ATTRIBUTE_CHANGE = 'attribute_change',CSS_CHANGE = 'css_change',URL_CHANGE = 'url_change',TITLE_CHANGE = 'title_change',METADATA_CHANGE = 'metadata_change',PERFORMANCE_CHANGE = 'performance_change',ERROR_DETECTION = 'error_detection',CUSTOM_CONDITION = 'custom_condition'}/**
 * Change detection methods
 */
export enum ChangeDetectionMethod {
  DOM_COMPARISON = 'dom_comparison',TEXT_DIFF = 'text_diff',VISUAL_DIFF = 'visual_diff',HASH_COMPARISON = 'hash_comparison',POLLING = 'polling',MUTATION_OBSERVER = 'mutation_observer',WEBSOCKET_EVENTS = 'websocket_events',API_POLLING = 'api_polling',EVENT_LISTENER = 'event_listener'}/**
 * Notification methods
 */
export enum NotificationMethod {
  EMAIL = 'email',WEBHOOK = 'webhook',SMS = 'sms',SLACK = 'slack',DISCORD = 'discord',TEAMS = 'teams',PUSH_NOTIFICATION = 'push_notification',DATABASE_LOG = 'database_log',FILE_LOG = 'file_log',CUSTOM_CALLBACK = 'custom_callback'}/**
 * Alert severity levels
 */
export enum AlertSeverity {
  LOW = 'low',MEDIUM = 'medium',HIGH = 'high',CRITICAL = 'critical',INFO = 'info',WARNING = 'warning',ERROR = 'error'}/**
 * Monitoring frequency configuration
 */
export class MonitoringFrequencyDto {
  @ApiProperty({
    description: 'Monitoring interval in milliseconds',example: 60000})
  @IsNumber()
  interval: number;

  @ApiPropertyOptional({
    description: 'Maximum monitoring duration in milliseconds',example: 3600000})
  @IsOptional()
  @IsNumber()
  maxDuration?: number;

  @ApiPropertyOptional({
    description: 'Number of consecutive checks required to confirm change',example: 2,default: 1
  })
  @IsOptional()
  @IsNumber()
  confirmationChecks?: number;

  @ApiPropertyOptional({
    description: 'Delay between confirmation checks in milliseconds',example: 5000,default: 1000
  })
  @IsOptional()
  @IsNumber()
  confirmationDelay?: number;

  @ApiPropertyOptional({
    description: 'Whether to use exponential backoff for failed checks',example: true,default: false
  })
  @IsOptional()
  @IsBoolean()
  exponentialBackoff?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum interval for exponential backoff in milliseconds',example: 300000,default: 300000
  })
  @IsOptional()
  @IsNumber()
  maxBackoffInterval?: number;
}

/**
 * Change detection configuration
 */
export class ChangeDetectionConfigDto {
  @ApiProperty({
    description: 'Change detection method',enum: ChangeDetectionMethod,example: ChangeDetectionMethod.DOM_COMPARISON
  })
  @IsEnum(ChangeDetectionMethod)
  method: ChangeDetectionMethod;

  @ApiPropertyOptional({
    description: 'Sensitivity threshold for change detection (0-100)',example: 80,default: 90
  })
  @IsOptional()
  @IsNumber()
  sensitivity?: number;

  @ApiPropertyOptional({
    description: 'Whether to ignore whitespace changes',example: true,default: false
  })
  @IsOptional()
  @IsBoolean()
  ignoreWhitespace?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to ignore case differences',example: true,default: false
  })
  @IsOptional()
  @IsBoolean()
  ignoreCase?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum change size to trigger detection',example: 10})
  @IsOptional()
  @IsNumber()
  minChangeSize?: number;

  @ApiPropertyOptional({
    description: 'Elements to exclude from change detection',example: ['.timestamp', '#live-counter', '.dynamic-content']})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeSelectors?: string[];

  @ApiPropertyOptional({
    description: 'Attributes to include in attribute change detection',example: ['class', 'style', 'data-value']})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  monitoredAttributes?: string[];

  @ApiPropertyOptional({
    description: 'Custom change detection function (JavaScript)',example: '(oldContent, newContent) => oldContent.price !== newContent.price'})@IsOptional()
  @IsString()
  customDetectionFunction?: string;
}

/**
 * Notification configuration
 */
export class NotificationConfigDto {
  @ApiProperty({
    description: 'Notification method',enum: NotificationMethod,example: NotificationMethod.EMAIL
  })
  @IsEnum(NotificationMethod)
  method: NotificationMethod;

  @ApiPropertyOptional({
    description: 'Notification target (email, webhook URL, etc.)',example: 'admin@example.com'})@IsOptional()
  @IsString()
  target?: string;

  @ApiPropertyOptional({
    description: 'Notification message template',example: 'Content change detected on ${url}: ${changeDescription}'})@IsOptional()
  @IsString()
  messageTemplate?: string;

  @ApiPropertyOptional({
    description: 'Notification subject template',example: 'Alert: Content Change on ${url}'})@IsOptional()
  @IsString()
  subjectTemplate?: string;

  @ApiPropertyOptional({
    description: 'Whether to include screenshots in notifications',example: true,default: false
  })
  @IsOptional()
  @IsBoolean()
  includeScreenshots?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to include detailed change diff',example: true,default: true
  })
  @IsOptional()
  @IsBoolean()
  includeDiff?: boolean;

  @ApiPropertyOptional({
    description: 'Rate limiting for notifications (max per hour)',example: 10,default: 100
  })
  @IsOptional()
  @IsNumber()
  rateLimitPerHour?: number;

  @ApiPropertyOptional({
    description: 'Additional notification headers or metadata',example: { 'X-Priority': 'High', 'X-Category': 'Content-Monitor' }})@IsOptional()
  @IsObject()
  headers?: Record<string, string>;
}

/**
 * Filter configuration for change detection
 */
export class FilterConfigDto {
  @ApiPropertyOptional({
    description: 'Text patterns to include (regex)',example: ['price.*\\$\\d+', 'status.*available']})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  includePatterns?: string[];

  @ApiPropertyOptional({
    description: 'Text patterns to exclude (regex)',example: ['\\d{4}-\\d{2}-\\d{2}', 'last updated.*']})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];

  @ApiPropertyOptional({
    description: 'Minimum text length to consider for changes',example: 5,default: 1
  })
  @IsOptional()
  @IsNumber()
  minTextLength?: number;

  @ApiPropertyOptional({
    description: 'Maximum text length to consider for changes',example: 1000})
  @IsOptional()
  @IsNumber()
  maxTextLength?: number;

  @ApiPropertyOptional({
    description: 'Keywords that must be present for change detection',example: ['price', 'stock', 'availability']})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredKeywords?: string[];

  @ApiPropertyOptional({
    description: 'Keywords that will trigger alerts if found',example: ['error', 'unavailable', 'out of stock']})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  alertKeywords?: string[];
}

/**
 * Content monitoring configuration
 */
export class ContentMonitoringDto {
  @ApiProperty({
    description: 'Unique monitor identifier',example: 'monitor_price_tracker_123'})@IsString()
  id: string;

  @ApiProperty({
    description: 'Monitor name',example: 'Product Price Monitor'})@IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Monitor description',example: 'Monitors product prices for changes and alerts when price drops'})@IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Type of content monitoring',enum: MonitoringType,example: MonitoringType.TEXT_CHANGE
  })
  @IsEnum(MonitoringType)
  type: MonitoringType;

  @ApiProperty({
    description: 'URL to monitor',example: 'https://example.com/product/123'})@IsString()
  url: string;

  @ApiPropertyOptional({
    description: 'CSS selector for specific element to monitor',example: '.price-value, #product-price, .stock-status'})@IsOptional()
  @IsString()
  selector?: string;

  @ApiProperty({
    description: 'Monitoring frequency configuration',type: MonitoringFrequencyDto})
  @ValidateNested()
  @Type(() => MonitoringFrequencyDto)
  frequency: MonitoringFrequencyDto;

  @ApiProperty({
    description: 'Change detection configuration',type: ChangeDetectionConfigDto})
  @ValidateNested()
  @Type(() => ChangeDetectionConfigDto)
  detection: ChangeDetectionConfigDto;

  @ApiProperty({
    description: 'Notification configurations',type: [NotificationConfigDto]})
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationConfigDto)
  notifications: NotificationConfigDto[];

  @ApiPropertyOptional({
    description: 'Filter configuration for change detection',type: FilterConfigDto})
  @IsOptional()
  @ValidateNested()
  @Type(() => FilterConfigDto)
  filters?: FilterConfigDto;

  @ApiPropertyOptional({
    description: 'Alert severity level',enum: AlertSeverity,example: AlertSeverity.MEDIUM,
    default: AlertSeverity.MEDIUM
  })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional({
    description: 'Whether monitor is currently enabled',example: true,default: true
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Authentication configuration for protected pages',example: { type: 'basic', username: 'user', password: 'pass' }})@IsOptional()
  @IsObject()
  authentication?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Custom headers for requests',example: { 'User-Agent': 'Mozilla/5.0...', 'Authorization': 'Bearer token' }})@IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Proxy configuration for requests',example: { host: 'proxy.example.com', port: 8080, auth: 'user:pass' }})@IsOptional()
  @IsObject()
  proxy?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional metadata for the monitor',example: { category: 'e-commerce', tags: ['price', 'product'] }})@IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Monitor management operations
 */
export class MonitorOperationDto {
  @ApiProperty({
    description: 'Operation to perform on monitor',enum: ['start', 'stop', 'pause', 'resume', 'reset', 'update'],example: 'start'})@IsString()
  operation: 'start' | 'stop' | 'pause' | 'resume' | 'reset' | 'update';@ApiPropertyOptional({description: 'Monitor configuration for update operation',type: ContentMonitoringDto})
  @IsOptional()
  @ValidateNested()
  @Type(() => ContentMonitoringDto)
  config?: ContentMonitoringDto;

  @ApiPropertyOptional({
    description: 'Operation metadata',example: { reason: 'Scheduled maintenance', duration: 3600000 }})@IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Bulk monitoring operation
 */
export class BulkMonitorOperationDto {
  @ApiProperty({
    description: 'Monitor IDs to operate on',example: ['monitor_1', 'monitor_2', 'monitor_3']})@IsArray()
  @IsString({ each: true })
  monitorIds: string[];

  @ApiProperty({
    description: 'Operation to perform',enum: ['start', 'stop', 'pause', 'resume', 'delete'],example: 'pause'})@IsString()
  operation: 'start' | 'stop' | 'pause' | 'resume' | 'delete';@ApiPropertyOptional({description: 'Whether to continue on individual operation failure',example: true,default: false
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean;

  @ApiPropertyOptional({
    description: 'Operation metadata',example: { reason: 'Maintenance window', scheduledBy: 'admin' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}