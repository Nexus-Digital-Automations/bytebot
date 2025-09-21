import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';import {IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/*** Real-time event types
 */
export enum RealtimeEventType {
  // Browser session events
  SESSION_CREATED = 'session_created',
  SESSION_CLOSED = 'session_closed',
  SESSION_ERROR = 'session_error',

  // Page events
  PAGE_LOADED = 'page_loaded',
  PAGE_NAVIGATION = 'page_navigation',
  PAGE_ERROR = 'page_error',
  PAGE_CONSOLE = 'page_console',

  // DOM events
  DOM_CHANGED = 'dom_changed',
  DOM_NODE_ADDED = 'dom_node_added',
  DOM_NODE_REMOVED = 'dom_node_removed',
  DOM_ATTRIBUTE_CHANGED = 'dom_attribute_changed',

  // User interaction events
  CLICK_EVENT = 'click_event',
  SCROLL_EVENT = 'scroll_event',
  INPUT_EVENT = 'input_event',
  FORM_SUBMIT = 'form_submit',

  // Network events
  REQUEST_STARTED = 'request_started',
  REQUEST_COMPLETED = 'request_completed',
  REQUEST_FAILED = 'request_failed',
  RESPONSE_RECEIVED = 'response_received',

  // Task execution events
  TASK_STARTED = 'task_started',
  TASK_PROGRESS = 'task_progress',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',

  // Screenshot events
  SCREENSHOT_CAPTURED = 'screenshot_captured',
  SCREENSHOT_FAILED = 'screenshot_failed',

  // Element detection events
  ELEMENT_DETECTED = 'element_detected',
  ELEMENT_INTERACTION = 'element_interaction',

  // Performance events
  PERFORMANCE_METRIC = 'performance_metric',
  MEMORY_USAGE = 'memory_usage',

  // Error events
  JAVASCRIPT_ERROR = 'javascript_error',
  NETWORK_ERROR = 'network_error',
  BROWSER_ERROR = 'browser_error',

  // Custom events
  CUSTOM_EVENT = 'custom_event',
}/**
 * Real-time subscription types
 */
export enum SubscriptionType {
  SESSION_EVENTS = 'session_events',
  PAGE_EVENTS = 'page_events',
  DOM_EVENTS = 'dom_events',
  INTERACTION_EVENTS = 'interaction_events',
  NETWORK_EVENTS = 'network_events',
  TASK_EVENTS = 'task_events',
  SCREENSHOT_EVENTS = 'screenshot_events',
  ELEMENT_EVENTS = 'element_events',
  PERFORMANCE_EVENTS = 'performance_events',
  ERROR_EVENTS = 'error_events',
  ALL_EVENTS = 'all_events',
}/**
 * WebSocket connection states
 */
export enum WebSocketState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}/**
 * Event filter criteria
 */
export class EventFilterDto {
  @ApiPropertyOptional({
    description: 'Event types to include',type: [String],enum: RealtimeEventType,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(RealtimeEventType, { each: true })
  includeEventTypes?: RealtimeEventType[];

  @ApiPropertyOptional({
    description: 'Event types to exclude',type: [String],enum: RealtimeEventType,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(RealtimeEventType, { each: true })
  excludeEventTypes?: RealtimeEventType[];

  @ApiPropertyOptional({
    description: 'Minimum event severity level',enum: ['debug', 'info', 'warn', 'error'],default: 'info',})@IsOptional()
  @IsString()
  minSeverity?: string = 'info';@ApiPropertyOptional({description: 'Filter events by source URL pattern',})@IsOptional()
  @IsString()
  urlPattern?: string;

  @ApiPropertyOptional({
    description: 'Filter events by element selector',})@IsOptional()
  @IsString()
  elementSelector?: string;

  @ApiPropertyOptional({
    description: 'Custom filter criteria',type: 'object',additionalProperties: true,})
  @IsOptional()
  @IsObject()
  customFilters?: Record<string, unknown>;
}

/**
 * Real-time subscription configuration
 */
export class RealtimeSubscriptionDto {
  @ApiProperty({
    description: 'Browser session identifier',example: 'session_abc123',})@IsString()
  sessionId: string = '';@ApiProperty({description: 'Subscription types',type: [String],enum: SubscriptionType,
  })
  @IsArray()
  @IsEnum(SubscriptionType, { each: true })
  subscriptionTypes: SubscriptionType[] = [];

  @ApiPropertyOptional({
    description: 'Event filtering criteria',type: EventFilterDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => EventFilterDto)
  eventFilter?: EventFilterDto;

  @ApiPropertyOptional({
    description: 'Include event payload data',default: true,})
  @IsOptional()
  @IsBoolean()
  includePayload?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include screenshots with events',default: false,})
  @IsOptional()
  @IsBoolean()
  includeScreenshots?: boolean = false;

  @ApiPropertyOptional({
    description: 'Event buffer size for missed events',minimum: 0,maximum: 1000,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  bufferSize?: number = 100;

  @ApiPropertyOptional({
    description: 'Heartbeat interval in seconds',minimum: 1,maximum: 300,
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(300)
  heartbeatInterval?: number = 30;

  @ApiPropertyOptional({
    description: 'Auto-reconnect on connection loss',default: true,})
  @IsOptional()
  @IsBoolean()
  autoReconnect?: boolean = true;

  @ApiPropertyOptional({
    description: 'Maximum reconnection attempts',minimum: 0,maximum: 20,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  maxReconnectAttempts?: number = 5;

  @ApiPropertyOptional({
    description: 'Client identifier for debugging',example: 'automation_client_001',})@IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Subscription metadata',type: 'object',additionalProperties: true,})
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Real-time event data
 */
export class RealtimeEventDto {
  @ApiProperty({
    description: 'Unique event identifier',example: 'event_xyz789',})eventId: string = '';@ApiProperty({description: 'Event type',enum: RealtimeEventType,})
  eventType: RealtimeEventType = RealtimeEventType.CUSTOM_EVENT;

  @ApiProperty({
    description: 'Browser session identifier',example: 'session_abc123',})sessionId: string = '';@ApiProperty({description: 'Event timestamp',})timestamp: Date = new Date();

  @ApiProperty({
    description: 'Event severity level',enum: ['debug', 'info', 'warn', 'error'],})severity: string = 'info';@ApiProperty({description: 'Event source URL',})sourceUrl: string = '';@ApiProperty({description: 'Event title/summary',})title: string = '';@ApiPropertyOptional({description: 'Detailed event message',})message?: string;

  @ApiProperty({
    description: 'Event payload data',type: 'object',additionalProperties: true,})
  payload: Record<string, unknown> = {};

  @ApiPropertyOptional({
    description: 'Element selector if event is element-related',})elementSelector?: string;

  @ApiPropertyOptional({
    description: 'Element information if available',type: 'object',properties: {tagName: { type: 'string' },id: { type: 'string' },className: { type: 'string' },textContent: { type: 'string' },boundingBox: {type: 'object',properties: {x: { type: 'number' },y: { type: 'number' },width: { type: 'number' },height: { type: 'number' },},},
    },
  })
  elementInfo?: {
    tagName: string;
    id?: string;
    className?: string;
    textContent?: string;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };

  @ApiPropertyOptional({
    description: 'Screenshot data (base64) if enabled',})screenshot?: string;

  @ApiPropertyOptional({
    description: 'Network request/response data for network events',type: 'object',properties: {method: { type: 'string' },url: { type: 'string' },statusCode: { type: 'number' },headers: { type: 'object' },responseTime: { type: 'number' },responseSize: { type: 'number' },},})
  networkData?: {
    method: string;
    url: string;
    statusCode?: number;
    headers?: Record<string, string>;
    responseTime?: number;
    responseSize?: number;
  };

  @ApiPropertyOptional({
    description: 'Performance metrics for performance events',type: 'object',properties: {loadTime: { type: 'number' },domContentLoaded: { type: 'number' },firstContentfulPaint: { type: 'number' },largestContentfulPaint: { type: 'number' },memoryUsage: { type: 'number' },cpuUsage: { type: 'number' },},})
  performanceData?: {
    loadTime?: number;
    domContentLoaded?: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };

  @ApiPropertyOptional({
    description: 'Error details for error events',type: 'object',properties: {name: { type: 'string' },message: { type: 'string' },stack: { type: 'string' },lineNumber: { type: 'number' },columnNumber: { type: 'number' },},})
  errorData?: {
    name: string;
    message: string;
    stack?: string;
    lineNumber?: number;
    columnNumber?: number;
  };

  @ApiPropertyOptional({
    description: 'Task execution data for task events',type: 'object',properties: {taskId: { type: 'string' },taskName: { type: 'string' },progress: { type: 'number', minimum: 0, maximum: 100 },currentAction: { type: 'string' },estimatedTimeRemaining: { type: 'number' },},})
  taskData?: {
    taskId: string;
    taskName: string;
    progress?: number;
    currentAction?: string;
    estimatedTimeRemaining?: number;
  };

  @ApiPropertyOptional({
    description: 'Additional event metadata',type: 'object',additionalProperties: true,})
  metadata?: Record<string, unknown>;
}

/**
 * Real-time connection status
 */
export class RealtimeConnectionStatusDto {
  @ApiProperty({
    description: 'Connection identifier',example: 'conn_abc123',})connectionId: string = '';@ApiProperty({description: 'Browser session identifier',example: 'session_abc123',})sessionId: string = '';@ApiProperty({description: 'WebSocket connection state',enum: WebSocketState,})
  state: WebSocketState = WebSocketState.DISCONNECTED;

  @ApiProperty({
    description: 'Connection established timestamp',})connectedAt: Date = new Date();

  @ApiPropertyOptional({
    description: 'Last activity timestamp',})lastActivity?: Date;

  @ApiProperty({
    description: 'Active subscription types',type: [String],enum: SubscriptionType,
  })
  activeSubscriptions: SubscriptionType[] = [];

  @ApiProperty({
    description: 'Total events sent',})eventsSent: number = 0;

  @ApiProperty({
    description: 'Events in buffer',})eventsBuffered: number = 0;

  @ApiPropertyOptional({
    description: 'Client identifier',})clientId?: string;

  @ApiPropertyOptional({
    description: 'Connection error if any',})error?: string;

  @ApiPropertyOptional({
    description: 'Network latency in milliseconds',})latencyMs?: number;

  @ApiProperty({
    description: 'Connection quality metrics',type: 'object',properties: {stability: { type: 'number', minimum: 0, maximum: 1 },throughput: { type: 'number' },reliability: { type: 'number', minimum: 0, maximum: 1 },},})
  quality: {
    stability: number;
    throughput: number;
    reliability: number;
  } = {
    stability: 1.0,
    throughput: 0,
    reliability: 1.0,
  };

  @ApiPropertyOptional({
    description: 'Connection metadata',type: 'object',additionalProperties: true,})
  metadata?: Record<string, unknown>;
}

/**
 * Server-Sent Events configuration
 */
export class SSEConfigDto {
  @ApiProperty({
    description: 'Browser session identifier',example: 'session_abc123',})@IsString()
  sessionId: string = '';@ApiPropertyOptional({description: 'Event stream identifier',example: 'stream_automation_001',})@IsOptional()
  @IsString()
  streamId?: string;

  @ApiPropertyOptional({
    description: 'Event types to stream',type: [String],enum: RealtimeEventType,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(RealtimeEventType, { each: true })
  eventTypes?: RealtimeEventType[];

  @ApiPropertyOptional({
    description: 'Event filtering criteria',type: EventFilterDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => EventFilterDto)
  filter?: EventFilterDto;

  @ApiPropertyOptional({
    description: 'Keep connection alive with heartbeats',default: true,})
  @IsOptional()
  @IsBoolean()
  keepAlive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Heartbeat interval in seconds',minimum: 5,maximum: 300,
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(300)
  heartbeatInterval?: number = 30;

  @ApiPropertyOptional({
    description: 'Include retry information in events',default: true,})
  @IsOptional()
  @IsBoolean()
  includeRetry?: boolean = true;

  @ApiPropertyOptional({
    description: 'Maximum number of events to buffer',minimum: 0,maximum: 1000,
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  maxBuffer?: number = 50;

  @ApiPropertyOptional({
    description: 'Stream metadata',type: 'object',additionalProperties: true,})
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * WebSocket message types
 */
export enum WebSocketMessageType {
  SUBSCRIBE = 'subscribe',UNSUBSCRIBE = 'unsubscribe',EVENT = 'event',HEARTBEAT = 'heartbeat',ERROR = 'error',STATUS = 'status',RECONNECT = 'reconnect',}/**
 * WebSocket message structure
 */
export class WebSocketMessageDto {
  @ApiProperty({
    description: 'Message type',enum: WebSocketMessageType,})
  type: WebSocketMessageType = WebSocketMessageType.EVENT;

  @ApiProperty({
    description: 'Message identifier',})messageId: string = '';@ApiProperty({description: 'Message timestamp',})timestamp: Date = new Date();

  @ApiPropertyOptional({
    description: 'Target session identifier',})sessionId?: string;

  @ApiProperty({
    description: 'Message payload',type: 'object',additionalProperties: true,})
  payload: Record<string, unknown> = {};

  @ApiPropertyOptional({
    description: 'Message metadata',type: 'object',additionalProperties: true,})
  metadata?: Record<string, unknown>;
}

/**
 * Real-time event statistics
 */
export class RealtimeEventStatsDto {
  @ApiProperty({
    description: 'Browser session identifier',example: 'session_abc123',})sessionId: string = '';@ApiProperty({description: 'Statistics collection period start',})periodStart: Date = new Date();

  @ApiProperty({
    description: 'Statistics collection period end',})periodEnd: Date = new Date();

  @ApiProperty({
    description: 'Total events generated',})totalEvents: number = 0;

  @ApiProperty({
    description: 'Events by type',type: 'object',additionalProperties: { type: 'number' },})eventsByType: Record<string, number> = {};

  @ApiProperty({
    description: 'Events by severity',type: 'object',properties: {debug: { type: 'number' },info: { type: 'number' },warn: { type: 'number' },error: { type: 'number' },},})
  eventsBySeverity: {
    debug: number;
    info: number;
    warn: number;
    error: number;
  } = {
    debug: 0,
    info: 0,
    warn: 0,
    error: 0,
  };

  @ApiProperty({
    description: 'Active connections count',})activeConnections: number = 0;

  @ApiProperty({
    description: 'Average events per minute',})averageEventsPerMinute: number = 0;

  @ApiProperty({
    description: 'Peak events per minute',})peakEventsPerMinute: number = 0;

  @ApiPropertyOptional({
    description: 'Connection quality metrics',type: 'object',properties: {averageLatency: { type: 'number' },connectionDrops: { type: 'number' },reconnectionAttempts: { type: 'number' },successfulReconnections: { type: 'number' },},})
  connectionMetrics?: {
    averageLatency: number;
    connectionDrops: number;
    reconnectionAttempts: number;
    successfulReconnections: number;
  };

  @ApiPropertyOptional({
    description: 'Additional statistics metadata',type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, unknown>;
}