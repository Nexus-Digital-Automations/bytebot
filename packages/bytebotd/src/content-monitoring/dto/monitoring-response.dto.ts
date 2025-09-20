import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MonitoringType, ChangeDetectionMethod, NotificationMethod, AlertSeverity } from './monitoring.dto';

/**
 * Monitor status
 */
export enum MonitorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PAUSED = 'paused',
  ERROR = 'error',
  STOPPED = 'stopped',
  STARTING = 'starting',
  STOPPING = 'stopping'
}

/**
 * Change detection result
 */
export class ChangeDetectionResultDto {
  @ApiProperty({
    description: 'Whether changes were detected',
    example: true
  })
  detected: boolean;

  @ApiProperty({
    description: 'Change detection confidence score (0-100)',
    example: 95.5
  })
  confidence: number;

  @ApiPropertyOptional({
    description: 'Description of changes detected',
    example: 'Price changed from $99.99 to $79.99'
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Old content value',
    example: '$99.99'
  })
  oldValue?: string;

  @ApiPropertyOptional({
    description: 'New content value',
    example: '$79.99'
  })
  newValue?: string;

  @ApiPropertyOptional({
    description: 'Detailed difference analysis',
    example: {
      additions: ['$79.99'],
      deletions: ['$99.99'],
      modifications: 1
    }
  })
  diff?: any;

  @ApiPropertyOptional({
    description: 'Screenshot before change',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  })
  screenshotBefore?: string;

  @ApiPropertyOptional({
    description: 'Screenshot after change',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  })
  screenshotAfter?: string;

  @ApiProperty({
    description: 'Timestamp when change was detected',
    example: '2024-01-15T10:30:00.000Z'
  })
  detectedAt: string;

  @ApiProperty({
    description: 'Detection method used',
    enum: ChangeDetectionMethod,
    example: ChangeDetectionMethod.TEXT_DIFF
  })
  method: ChangeDetectionMethod;

  @ApiPropertyOptional({
    description: 'Changed elements or regions',
    example: [
      { selector: '.price', type: 'text', change: 'value' },
      { selector: '.status', type: 'class', change: 'attribute' }
    ]
  })
  changedElements?: any[];
}

/**
 * Notification delivery result
 */
export class NotificationResultDto {
  @ApiProperty({
    description: 'Notification method used',
    enum: NotificationMethod,
    example: NotificationMethod.EMAIL
  })
  method: NotificationMethod;

  @ApiProperty({
    description: 'Notification target',
    example: 'admin@example.com'
  })
  target: string;

  @ApiProperty({
    description: 'Whether notification was delivered successfully',
    example: true
  })
  delivered: boolean;

  @ApiProperty({
    description: 'Notification delivery timestamp',
    example: '2024-01-15T10:30:05.000Z'
  })
  deliveredAt: string;

  @ApiPropertyOptional({
    description: 'Delivery response or confirmation ID',
    example: 'msg_1234567890'
  })
  deliveryId?: string;

  @ApiPropertyOptional({
    description: 'Error message if delivery failed',
    example: 'SMTP server connection timeout'
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Delivery attempt number',
    example: 1
  })
  attemptNumber?: number;

  @ApiPropertyOptional({
    description: 'Next retry timestamp if delivery failed',
    example: '2024-01-15T10:35:00.000Z'
  })
  nextRetryAt?: string;
}

/**
 * Monitor check result
 */
export class MonitorCheckResultDto {
  @ApiProperty({
    description: 'Monitor check ID',
    example: 'check_1704454800_abc123'
  })
  checkId: string;

  @ApiProperty({
    description: 'Monitor ID',
    example: 'monitor_price_tracker_123'
  })
  monitorId: string;

  @ApiProperty({
    description: 'Check timestamp',
    example: '2024-01-15T10:30:00.000Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'Whether check was successful',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Check duration in milliseconds',
    example: 2500
  })
  durationMs: number;

  @ApiProperty({
    description: 'Change detection result',
    type: ChangeDetectionResultDto
  })
  changeDetection: ChangeDetectionResultDto;

  @ApiPropertyOptional({
    description: 'Notification results if changes were detected',
    type: [NotificationResultDto]
  })
  notifications?: NotificationResultDto[];

  @ApiPropertyOptional({
    description: 'Current page title',
    example: 'Product Details - Amazing Widget'
  })
  pageTitle?: string;

  @ApiPropertyOptional({
    description: 'Current page URL',
    example: 'https://example.com/product/123'
  })
  pageUrl?: string;

  @ApiPropertyOptional({
    description: 'HTTP response status code',
    example: 200
  })
  statusCode?: number;

  @ApiPropertyOptional({
    description: 'Page load time in milliseconds',
    example: 1200
  })
  loadTime?: number;

  @ApiPropertyOptional({
    description: 'Error message if check failed',
    example: 'Network timeout while loading page'
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Additional check metadata',
    example: {
      userAgent: 'Mozilla/5.0...',
      viewport: { width: 1920, height: 1080 }
    }
  })
  metadata?: Record<string, any>;
}

/**
 * Monitor statistics
 */
export class MonitorStatisticsDto {
  @ApiProperty({
    description: 'Monitor ID',
    example: 'monitor_price_tracker_123'
  })
  monitorId: string;

  @ApiProperty({
    description: 'Total number of checks performed',
    example: 1440
  })
  totalChecks: number;

  @ApiProperty({
    description: 'Number of successful checks',
    example: 1420
  })
  successfulChecks: number;

  @ApiProperty({
    description: 'Number of failed checks',
    example: 20
  })
  failedChecks: number;

  @ApiProperty({
    description: 'Total number of changes detected',
    example: 15
  })
  changesDetected: number;

  @ApiProperty({
    description: 'Number of notifications sent',
    example: 15
  })
  notificationsSent: number;

  @ApiProperty({
    description: 'Number of failed notifications',
    example: 1
  })
  notificationsFailed: number;

  @ApiProperty({
    description: 'Average check duration in milliseconds',
    example: 2350
  })
  averageCheckDuration: number;

  @ApiProperty({
    description: 'Success rate percentage',
    example: 98.6
  })
  successRate: number;

  @ApiProperty({
    description: 'Last check timestamp',
    example: '2024-01-15T10:30:00.000Z'
  })
  lastCheck: string;

  @ApiProperty({
    description: 'Last change detected timestamp',
    example: '2024-01-15T09:15:00.000Z'
  })
  lastChangeDetected: string;

  @ApiProperty({
    description: 'Monitor uptime percentage',
    example: 99.2
  })
  uptime: number;

  @ApiPropertyOptional({
    description: 'Recent check results (last 10)',
    type: [MonitorCheckResultDto]
  })
  recentChecks?: MonitorCheckResultDto[];
}

/**
 * Monitor status response
 */
export class MonitorStatusResponseDto {
  @ApiProperty({
    description: 'Monitor ID',
    example: 'monitor_price_tracker_123'
  })
  monitorId: string;

  @ApiProperty({
    description: 'Monitor name',
    example: 'Product Price Monitor'
  })
  monitorName: string;

  @ApiProperty({
    description: 'Current monitor status',
    enum: MonitorStatus,
    example: MonitorStatus.ACTIVE
  })
  status: MonitorStatus;

  @ApiProperty({
    description: 'Monitor type',
    enum: MonitoringType,
    example: MonitoringType.TEXT_CHANGE
  })
  type: MonitoringType;

  @ApiProperty({
    description: 'URL being monitored',
    example: 'https://example.com/product/123'
  })
  url: string;

  @ApiPropertyOptional({
    description: 'CSS selector being monitored',
    example: '.price-value'
  })
  selector?: string;

  @ApiProperty({
    description: 'Monitor creation timestamp',
    example: '2024-01-15T08:00:00.000Z'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Monitor last update timestamp',
    example: '2024-01-15T09:00:00.000Z'
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description: 'Next scheduled check timestamp',
    example: '2024-01-15T10:31:00.000Z'
  })
  nextCheck?: string;

  @ApiProperty({
    description: 'Monitor statistics',
    type: MonitorStatisticsDto
  })
  statistics: MonitorStatisticsDto;

  @ApiPropertyOptional({
    description: 'Current error message if monitor is in error state',
    example: 'Target selector not found on page'
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Monitor configuration summary',
    example: {
      interval: 60000,
      method: 'text_diff',
      notifications: 2,
      severity: 'medium'
    }
  })
  configuration?: Record<string, any>;
}

/**
 * Monitor operation response
 */
export class MonitorOperationResponseDto {
  @ApiProperty({
    description: 'Whether operation was successful',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Operation that was performed',
    example: 'start'
  })
  operation: string;

  @ApiProperty({
    description: 'Monitor ID',
    example: 'monitor_price_tracker_123'
  })
  monitorId: string;

  @ApiProperty({
    description: 'Operation timestamp',
    example: '2024-01-15T10:30:00.000Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'New monitor status after operation',
    enum: MonitorStatus,
    example: MonitorStatus.ACTIVE
  })
  newStatus: MonitorStatus;

  @ApiPropertyOptional({
    description: 'Previous monitor status',
    enum: MonitorStatus,
    example: MonitorStatus.PAUSED
  })
  previousStatus?: MonitorStatus;

  @ApiPropertyOptional({
    description: 'Operation result message',
    example: 'Monitor started successfully'
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'Error message if operation failed',
    example: 'Monitor is already in the requested state'
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Additional operation metadata',
    example: { operationDuration: 250, changesApplied: 3 }
  })
  metadata?: Record<string, any>;
}

/**
 * Bulk monitor operation response
 */
export class BulkMonitorOperationResponseDto {
  @ApiProperty({
    description: 'Whether all operations were successful',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Operation that was performed',
    example: 'pause'
  })
  operation: string;

  @ApiProperty({
    description: 'Total number of monitors processed',
    example: 10
  })
  totalMonitors: number;

  @ApiProperty({
    description: 'Number of successful operations',
    example: 9
  })
  successfulOperations: number;

  @ApiProperty({
    description: 'Number of failed operations',
    example: 1
  })
  failedOperations: number;

  @ApiProperty({
    description: 'Individual operation results',
    type: [MonitorOperationResponseDto]
  })
  results: MonitorOperationResponseDto[];

  @ApiProperty({
    description: 'Operation timestamp',
    example: '2024-01-15T10:30:00.000Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'Total processing time in milliseconds',
    example: 5000
  })
  processingTimeMs: number;

  @ApiPropertyOptional({
    description: 'Global error message if bulk operation failed',
    example: 'Some monitors could not be processed due to invalid state'
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Operation summary',
    example: {
      monitorsStarted: 5,
      monitorsPaused: 3,
      monitorsStopped: 1,
      monitorsErrored: 1
    }
  })
  summary?: Record<string, any>;
}

/**
 * Monitor list response
 */
export class MonitorListResponseDto {
  @ApiProperty({
    description: 'List of monitors',
    type: [MonitorStatusResponseDto]
  })
  monitors: MonitorStatusResponseDto[];

  @ApiProperty({
    description: 'Total number of monitors',
    example: 25
  })
  totalCount: number;

  @ApiProperty({
    description: 'Number of active monitors',
    example: 20
  })
  activeCount: number;

  @ApiProperty({
    description: 'Number of paused monitors',
    example: 3
  })
  pausedCount: number;

  @ApiProperty({
    description: 'Number of error monitors',
    example: 2
  })
  errorCount: number;

  @ApiPropertyOptional({
    description: 'Pagination information',
    example: { page: 1, pageSize: 20, totalPages: 2 }
  })
  pagination?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Applied filters',
    example: { status: 'active', type: 'text_change' }
  })
  filters?: Record<string, any>;

  @ApiProperty({
    description: 'Response timestamp',
    example: '2024-01-15T10:30:00.000Z'
  })
  timestamp: string;
}

/**
 * Change history response
 */
export class ChangeHistoryResponseDto {
  @ApiProperty({
    description: 'Monitor ID',
    example: 'monitor_price_tracker_123'
  })
  monitorId: string;

  @ApiProperty({
    description: 'List of detected changes',
    type: [ChangeDetectionResultDto]
  })
  changes: ChangeDetectionResultDto[];

  @ApiProperty({
    description: 'Total number of changes',
    example: 15
  })
  totalChanges: number;

  @ApiProperty({
    description: 'Date range start',
    example: '2024-01-01T00:00:00.000Z'
  })
  dateFrom: string;

  @ApiProperty({
    description: 'Date range end',
    example: '2024-01-15T23:59:59.000Z'
  })
  dateTo: string;

  @ApiPropertyOptional({
    description: 'Pagination information',
    example: { page: 1, pageSize: 50, totalPages: 1 }
  })
  pagination?: Record<string, any>;

  @ApiProperty({
    description: 'Response timestamp',
    example: '2024-01-15T10:30:00.000Z'
  })
  timestamp: string;
}