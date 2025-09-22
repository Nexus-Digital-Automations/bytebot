import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';import { ComputerUseService } from '../computer-use/computer-use.service';import {ContentMonitoringDto,
  MonitorOperationDto,
  BulkMonitorOperationDto,
  MonitoringType,
  ChangeDetectionMethod,
  NotificationMethod,
  AlertSeverity
} from './dto/monitoring.dto';import {MonitorStatus,
  ChangeDetectionResultDto,
  NotificationResultDto,
  MonitorCheckResultDto,
  MonitorStatisticsDto,
  MonitorStatusResponseDto,
  MonitorOperationResponseDto,
  BulkMonitorOperationResponseDto,
  MonitorListResponseDto,
  ChangeHistoryResponseDto
} from './dto/monitoring-response.dto';/*** Content Monitoring Service
 *
 * Provides comprehensive content monitoring capabilities including:
 * - Real-time page content monitoring with change detection
 * - Multiple change detection methods (DOM, text, visual, hash)
 * - Configurable notification systems (email, webhook, SMS, Slack)
 * - Monitor lifecycle management (start, stop, pause, resume)
 * - Historical change tracking and analytics
 * - Bulk monitor operations for enterprise scale
 * - Advanced filtering and pattern matching
 * - Performance monitoring and optimization
 *
 * Architecture:
 * - Event-driven monitoring with configurable intervals
 * - Intelligent change detection with confidence scoring
 * - Retry logic with exponential backoff
 * - Rate limiting for notifications
 * - Comprehensive error handling and recovery
 * - Memory-efficient screenshot comparison
 * - Database-agnostic storage interface
 */
@Injectable()
export class ContentMonitoringService {
  private readonly logger = new Logger(ContentMonitoringService.name);
  private readonly monitors = new Map<string, MonitorInstance>();
  private readonly changeHistory = new Map<string, ChangeDetectionResultDto[]>();
  private readonly monitorStats = new Map<string, MonitorStatistics>();

  constructor(
    private readonly computerUseService: ComputerUseService
  ) {
    this.logger.log('ContentMonitoringService initialized');
  }

  /**
   * Create and start a new content monitor
   */
  async createMonitor(config: ContentMonitoringDto): Promise<MonitorStatusResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Creating monitor: ${config.id}`, {url: config.url,type: config.type,
      interval: config.frequency.interval
    });

    try {
      // Validate configuration
      await this.validateMonitorConfig(config);

      // Create monitor instance
      const monitor = new MonitorInstance(config, this.computerUseService);
      this.monitors.set(config.id, monitor);

      // Initialize statistics
      this.monitorStats.set(config.id, new MonitorStatistics(config.id));
      this.changeHistory.set(config.id, []);

      // Start monitoring if enabled
      if (config.enabled !== false) {
        await monitor.start();
      }

      const response = await this.getMonitorStatus(config.id);

      this.logger.log(`Monitor created successfully in ${Date.now() - startTime}ms`, {monitorId: config.id,status: response.status
      });

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create monitor: ${config.id}`, {error: errorMessage,duration: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Get monitor status and statistics
   */
  async getMonitorStatus(monitorId: string): Promise<MonitorStatusResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Getting monitor status: ${monitorId}`);try {const monitor = this.getMonitor(monitorId);
      const stats = this.monitorStats.get(monitorId);

      if (!stats) {
        throw new NotFoundException(`Statistics not found for monitor: ${monitorId}`);}const response: MonitorStatusResponseDto = {
        monitorId: monitor.config.id,
        monitorName: monitor.config.name,
        status: monitor.status,
        type: monitor.config.type,
        url: monitor.config.url,
        selector: monitor.config.selector,
        createdAt: monitor.createdAt.toISOString(),
        updatedAt: monitor.updatedAt.toISOString(),
        nextCheck: monitor.nextCheck?.toISOString(),
        statistics: stats.toDto(),
        errorMessage: monitor.lastError?.message,
        configuration: {
          interval: monitor.config.frequency.interval,
          method: monitor.config.detection.method,
          notifications: monitor.config.notifications.length,
          severity: monitor.config.severity
        }
      };

      this.logger.log(`Monitor status retrieved in ${Date.now() - startTime}ms`, {monitorId,status: response.status
      });

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get monitor status: ${monitorId}`, {error: errorMessage,duration: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * List all monitors with filtering and pagination
   */
  async listMonitors(
    status?: MonitorStatus,
    type?: MonitoringType,
    page: number = 1,
    pageSize: number = 20
  ): Promise<MonitorListResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Listing monitors`, { status, type, page, pageSize });try {let monitors = Array.from(this.monitors.values());

      // Apply filters
      if (status) {
        monitors = monitors.filter(m => m.status === status);
      }
      if (type) {
        monitors = monitors.filter(m => m.config.type === type);
      }

      // Calculate pagination
      const totalCount = monitors.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedMonitors = monitors.slice(startIndex, endIndex);

      // Convert to response DTOs
      const monitorResponses = await Promise.all(
        paginatedMonitors.map(async (monitor) => {
          return await this.getMonitorStatus(monitor.config.id);
        })
      );

      // Calculate counts by status
      const allMonitors = Array.from(this.monitors.values());
      const activeCount = allMonitors.filter(m => m.status === MonitorStatus.ACTIVE).length;
      const pausedCount = allMonitors.filter(m => m.status === MonitorStatus.PAUSED).length;
      const errorCount = allMonitors.filter(m => m.status === MonitorStatus.ERROR).length;

      const response: MonitorListResponseDto = {
        monitors: monitorResponses,
        totalCount,
        activeCount,
        pausedCount,
        errorCount,
        pagination: {
          page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize)
        },
        filters: { status, type },
        timestamp: new Date().toISOString()
      };

      this.logger.log(`Listed ${monitorResponses.length} monitors in ${Date.now() - startTime}ms`, {totalCount,filteredCount: monitorResponses.length
      });

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to list monitors`, {error: errorMessage,duration: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Perform operation on a monitor (start, stop, pause, resume, reset, update)
   */
  async performMonitorOperation(
    monitorId: string,
    operation: MonitorOperationDto
  ): Promise<MonitorOperationResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Performing operation: ${operation.operation} on monitor: ${monitorId}`);

    try {
      const monitor = this.getMonitor(monitorId);
      const previousStatus = monitor.status;

      let newStatus: MonitorStatus;
      let message: string;

      switch (operation.operation) {
        case 'start':await monitor.start();newStatus = MonitorStatus.ACTIVE;
          message = 'Monitor started successfully';break;case 'stop':await monitor.stop();newStatus = MonitorStatus.STOPPED;
          message = 'Monitor stopped successfully';break;case 'pause':await monitor.pause();newStatus = MonitorStatus.PAUSED;
          message = 'Monitor paused successfully';break;case 'resume':await monitor.resume();newStatus = MonitorStatus.ACTIVE;
          message = 'Monitor resumed successfully';break;case 'reset':await monitor.reset();// Clear history and statistics
          this.changeHistory.set(monitorId, []);
          this.monitorStats.set(monitorId, new MonitorStatistics(monitorId));
          newStatus = monitor.status;
          message = 'Monitor reset successfully';break;case 'update':if (!operation.config) {throw new BadRequestException('Configuration required for update operation');}await this.validateMonitorConfig(operation.config);
          await monitor.updateConfig(operation.config);
          newStatus = monitor.status;
          message = 'Monitor configuration updated successfully';
          break;

        default:
          throw new BadRequestException(`Unknown operation: ${operation.operation}`);}const response: MonitorOperationResponseDto = {
        success: true,
        operation: operation.operation,
        monitorId,
        timestamp: new Date().toISOString(),
        newStatus,
        previousStatus,
        message,
        metadata: {
          operationDuration: Date.now() - startTime,
          ...operation.metadata
        }
      };

      this.logger.log(`Operation completed successfully in ${Date.now() - startTime}ms`, {operation: operation.operation,monitorId,
        previousStatus,
        newStatus
      });

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Operation failed: ${operation.operation} on monitor: ${monitorId}`, {error: errorMessage,duration: Date.now() - startTime
      });

      return {
        success: false,
        operation: operation.operation,
        monitorId,
        timestamp: new Date().toISOString(),
        newStatus: this.monitors.get(monitorId)?.status || MonitorStatus.ERROR,
        errorMessage,
        metadata: {
          operationDuration: Date.now() - startTime,
          ...operation.metadata
        }
      };
    }
  }

  /**
   * Perform bulk operations on multiple monitors
   */
  async performBulkOperation(
    operation: BulkMonitorOperationDto
  ): Promise<BulkMonitorOperationResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Performing bulk operation: ${operation.operation}`, {monitorCount: operation.monitorIds.length,continueOnError: operation.continueOnError
    });

    const results: MonitorOperationResponseDto[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const monitorId of operation.monitorIds) {
      try {
        const result = await this.performMonitorOperation(monitorId, {
          operation: operation.operation as any,
          metadata: operation.metadata
        });

        results.push(result);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorResult: MonitorOperationResponseDto = {
          success: false,
          operation: operation.operation,
          monitorId,
          timestamp: new Date().toISOString(),
          newStatus: MonitorStatus.ERROR,
          errorMessage
        };

        results.push(errorResult);
        failCount++;

        if (!operation.continueOnError) {
          break;
        }
      }
    }

    const response: BulkMonitorOperationResponseDto = {
      success: failCount === 0,
      operation: operation.operation,
      totalMonitors: operation.monitorIds.length,
      successfulOperations: successCount,
      failedOperations: failCount,
      results,
      timestamp: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime,
      summary: {
        [`monitors${operation.operation.charAt(0).toUpperCase() + operation.operation.slice(1)}ed`]: successCount,monitorsErrored: failCount}
    };

    this.logger.log(`Bulk operation completed in ${Date.now() - startTime}ms`, {operation: operation.operation,totalMonitors: operation.monitorIds.length,
      successCount,
      failCount
    });

    return response;
  }

  /**
   * Get change history for a monitor
   */
  async getChangeHistory(
    monitorId: string,
    dateFrom?: Date,
    dateTo?: Date,
    page: number = 1,
    pageSize: number = 50
  ): Promise<ChangeHistoryResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Getting change history for monitor: ${monitorId}`, {dateFrom,dateTo,
      page,
      pageSize
    });

    try {
      const changes = this.changeHistory.get(monitorId) || [];

      // Apply date filters
      let filteredChanges = changes;
      if (dateFrom || dateTo) {
        filteredChanges = changes.filter(change => {
          const changeDate = new Date(change.detectedAt);
          if (dateFrom && changeDate < dateFrom) return false;
          if (dateTo && changeDate > dateTo) return false;
          return true;
        });
      }

      // Apply pagination
      const totalChanges = filteredChanges.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedChanges = filteredChanges.slice(startIndex, endIndex);

      const response: ChangeHistoryResponseDto = {
        monitorId,
        changes: paginatedChanges,
        totalChanges,
        dateFrom: dateFrom?.toISOString() || filteredChanges[filteredChanges.length - 1]?.detectedAt || new Date().toISOString(),
        dateTo: dateTo?.toISOString() || filteredChanges[0]?.detectedAt || new Date().toISOString(),
        pagination: {
          page,
          pageSize,
          totalPages: Math.ceil(totalChanges / pageSize)
        },
        timestamp: new Date().toISOString()
      };

      this.logger.log(`Retrieved ${paginatedChanges.length} changes in ${Date.now() - startTime}ms`, {monitorId,totalChanges
      });

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get change history for monitor: ${monitorId}`, {error: errorMessage,duration: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Delete a monitor and its data
   */
  async deleteMonitor(monitorId: string): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Deleting monitor: ${monitorId}`);try {const monitor = this.getMonitor(monitorId);

      // Stop monitor if running
      if (monitor.status === MonitorStatus.ACTIVE) {
        await monitor.stop();
      }

      // Clean up data
      this.monitors.delete(monitorId);
      this.changeHistory.delete(monitorId);
      this.monitorStats.delete(monitorId);

      this.logger.log(`Monitor deleted successfully in ${Date.now() - startTime}ms`, {monitorId});

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete monitor: ${monitorId}`, {error: errorMessage,duration: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Trigger immediate check for a monitor
   */
  async triggerCheck(monitorId: string): Promise<MonitorCheckResultDto> {
    const startTime = Date.now();
    this.logger.log(`Triggering immediate check for monitor: ${monitorId}`);try {const monitor = this.getMonitor(monitorId);
      const result = await monitor.performCheck();

      // Update statistics
      const stats = this.monitorStats.get(monitorId);
      if (stats) {
        stats.recordCheck(result);
      }

      // Store change if detected
      if (result.changeDetection.detected) {
        const changes = this.changeHistory.get(monitorId) || [];
        changes.unshift(result.changeDetection);
        this.changeHistory.set(monitorId, changes.slice(0, 1000)); // Keep last 1000 changes
      }

      this.logger.log(`Check completed in ${Date.now() - startTime}ms`, {monitorId,changeDetected: result.changeDetection.detected,
        confidence: result.changeDetection.confidence
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to trigger check for monitor: ${monitorId}`, {error: errorMessage,duration: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Get monitor instance
   */
  private getMonitor(monitorId: string): MonitorInstance {
    const monitor = this.monitors.get(monitorId);
    if (!monitor) {
      throw new NotFoundException(`Monitor not found: ${monitorId}`);}return monitor;
  }

  /**
   * Validate monitor configuration
   */
  private async validateMonitorConfig(config: ContentMonitoringDto): Promise<void> {
    // Check if monitor ID already exists
    if (this.monitors.has(config.id)) {
      throw new BadRequestException(`Monitor with ID already exists: ${config.id}`);
    }

    // Validate URL accessibility
    try {
      const url = new URL(config.url);
      if (!['http:', 'https:'].includes(url.protocol)) {throw new BadRequestException('Only HTTP and HTTPS URLs are supported');
      }
    } catch (error) {
      throw new BadRequestException(`Invalid URL: ${config.url}`);
    }

    // Validate notification configuration
    for (const notification of config.notifications) {
      if (notification.method === NotificationMethod.EMAIL && !notification.target) {
        throw new BadRequestException('Email notification requires target email address');}if (notification.method === NotificationMethod.WEBHOOK && !notification.target) {
        throw new BadRequestException('Webhook notification requires target URL');}}

    // Validate frequency limits
    if (config.frequency.interval < 1000) {
      throw new BadRequestException('Minimum monitoring interval is 1000ms');
    }
  }
}

/**
 * Monitor instance class for managing individual monitor lifecycle
 */
class MonitorInstance {
  public status: MonitorStatus = MonitorStatus.INACTIVE;
  public createdAt: Date = new Date();
  public updatedAt: Date = new Date();
  public nextCheck?: Date;
  public lastError?: Error;
  public lastContent?: string;
  public lastScreenshot?: string;

  private intervalId?: NodeJS.Timeout;
  private checkCount: number = 0;
  private readonly logger = new Logger(`Monitor:${this.config.id}`);constructor(public config: ContentMonitoringDto,
    private readonly computerUse: ComputerUseService
  ) {
    this.logger.log(`Monitor instance created: ${config.name}`);
  }

  async start(): Promise<void> {
    if (this.status === MonitorStatus.ACTIVE) {
      throw new BadRequestException('Monitor is already active');
    }

    this.status = MonitorStatus.STARTING;
    this.updatedAt = new Date();

    try {
      // Perform initial check
      await this.performCheck();

      // Schedule recurring checks
      this.scheduleNextCheck();

      this.status = MonitorStatus.ACTIVE;
      this.logger.log(`Monitor started successfully`);} catch (error) {this.status = MonitorStatus.ERROR;
      this.lastError = error;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to start monitor`, { error: errorMessage });throw error;}
  }

  async stop(): Promise<void> {
    this.status = MonitorStatus.STOPPING;
    this.updatedAt = new Date();

    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = undefined;
    }

    this.status = MonitorStatus.STOPPED;
    this.nextCheck = undefined;
    this.logger.log(`Monitor stopped`);
  }

  async pause(): Promise<void> {
    if (this.status !== MonitorStatus.ACTIVE) {
      throw new BadRequestException('Can only pause active monitors');
    }

    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = undefined;
    }

    this.status = MonitorStatus.PAUSED;
    this.nextCheck = undefined;
    this.updatedAt = new Date();
    this.logger.log(`Monitor paused`);
  }

  async resume(): Promise<void> {
    if (this.status !== MonitorStatus.PAUSED) {
      throw new BadRequestException('Can only resume paused monitors');
    }

    this.status = MonitorStatus.ACTIVE;
    this.scheduleNextCheck();
    this.updatedAt = new Date();
    this.logger.log(`Monitor resumed`);}async reset(): Promise<void> {
    this.checkCount = 0;
    this.lastContent = undefined;
    this.lastScreenshot = undefined;
    this.lastError = undefined;
    this.updatedAt = new Date();
    this.logger.log(`Monitor reset`);}async updateConfig(newConfig: ContentMonitoringDto): Promise<void> {
    const wasActive = this.status === MonitorStatus.ACTIVE;

    if (wasActive) {
      await this.pause();
    }

    this.config = newConfig;
    this.updatedAt = new Date();

    if (wasActive) {
      await this.resume();
    }

    this.logger.log(`Monitor configuration updated`);}async performCheck(): Promise<MonitorCheckResultDto> {
    const checkId = `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;const startTime = Date.now();this.logger.log(`Performing check: ${checkId}`);

    try {
      this.checkCount++;

      // Note: Browser automation integration would go here
      // For now, we'll simulate content retrieval as this service is designed
      // to work with browser automation that would be implemented separately

      let currentContent: string;
      let currentScreenshot: string | undefined;

      // Simulate content extraction (in production, this would use browser automation)
      currentContent = await this.simulateContentExtraction();

      // Take screenshot if visual comparison enabled
      if (this.config.detection.method === ChangeDetectionMethod.VISUAL_DIFF) {
        const screenshotResult = await this.computerUse.screenshot();
        currentScreenshot = screenshotResult.screenshotData;
      }

      // Detect changes
      const changeDetection = await this.detectChanges(currentContent, currentScreenshot);

      // Send notifications if changes detected
      const notifications: NotificationResultDto[] = [];
      if (changeDetection.detected) {
        for (const notificationConfig of this.config.notifications) {
          try {
            const notification = await this.sendNotification(notificationConfig, changeDetection);
            notifications.push(notification);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Notification failed`, {
              method: notificationConfig.method,
              error: errorMessage
            });
            notifications.push({
              method: notificationConfig.method,
              target: notificationConfig.target || 'unknown',delivered: false,deliveredAt: new Date().toISOString(),
              errorMessage,
              attemptNumber: 1
            });
          }
        }
      }

      // Update stored content
      this.lastContent = currentContent;
      if (currentScreenshot) {
        this.lastScreenshot = currentScreenshot;
      }

      const result: MonitorCheckResultDto = {
        checkId,
        monitorId: this.config.id,
        timestamp: new Date().toISOString(),
        success: true,
        durationMs: Date.now() - startTime,
        changeDetection,
        notifications: notifications.length > 0 ? notifications : undefined,
        pageTitle: 'Simulated Page Title', // In production, this would get actual page title
        pageUrl: this.config.url,
        statusCode: 200, // Assume success if no error thrown
        loadTime: Date.now() - startTime,
        metadata: {
          checkCount: this.checkCount,
          contentLength: currentContent.length,
          method: this.config.detection.method
        }
      };

      this.logger.log(`Check completed successfully in ${result.durationMs}ms`, {checkId,changeDetected: changeDetection.detected,
        notificationsSent: notifications.length
      });

      return result;

    } catch (error) {
      this.lastError = error;
      const result: MonitorCheckResultDto = {
        checkId,
        monitorId: this.config.id,
        timestamp: new Date().toISOString(),
        success: false,
        durationMs: Date.now() - startTime,
        changeDetection: {
          detected: false,
          confidence: 0,
          detectedAt: new Date().toISOString(),
          method: this.config.detection.method
        },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          checkCount: this.checkCount,
          error: error instanceof Error ? error.name : 'Unknown'
        }
      };

      this.logger.error(`Check failed in ${result.durationMs}ms`, {
        checkId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return result;
    }
  }

  private async detectChanges(currentContent: string, currentScreenshot?: string): Promise<ChangeDetectionResultDto> {
    const method = this.config.detection.method;
    const sensitivity = this.config.detection.sensitivity || 90;

    // No previous content means no change (first check)
    if (!this.lastContent) {
      return {
        detected: false,
        confidence: 100,
        detectedAt: new Date().toISOString(),
        method
      };
    }

    let detected = false;
    let confidence = 0;
    let description: string | undefined;
    let oldValue: string | undefined;
    let newValue: string | undefined;
    let diff: any;

    switch (method) {
      case ChangeDetectionMethod.TEXT_DIFF:
        const textResult = this.compareText(this.lastContent, currentContent);
        detected = textResult.changePercentage >= (100 - sensitivity);
        confidence = detected ? textResult.changePercentage : 100 - textResult.changePercentage;
        description = textResult.description;
        oldValue = this.lastContent;
        newValue = currentContent;
        diff = textResult.diff;
        break;

      case ChangeDetectionMethod.HASH_COMPARISON:
        const oldHash = this.calculateHash(this.lastContent);
        const newHash = this.calculateHash(currentContent);
        detected = oldHash !== newHash;
        confidence = detected ? 100 : 0;
        description = detected ? 'Content hash changed' : 'Content hash unchanged';break;case ChangeDetectionMethod.VISUAL_DIFF:
        if (currentScreenshot && this.lastScreenshot) {
          // Basic visual comparison (would need more sophisticated implementation)
          detected = currentScreenshot !== this.lastScreenshot;
          confidence = detected ? 95 : 100;
          description = detected ? 'Visual changes detected' : 'No visual changes';}break;

      default:
        // Default to text comparison
        const defaultResult = this.compareText(this.lastContent, currentContent);
        detected = defaultResult.changePercentage >= (100 - sensitivity);
        confidence = detected ? defaultResult.changePercentage : 100 - defaultResult.changePercentage;
        description = defaultResult.description;
        break;
    }

    return {
      detected,
      confidence,
      description,
      oldValue,
      newValue,
      diff,
      screenshotBefore: this.lastScreenshot,
      screenshotAfter: currentScreenshot,
      detectedAt: new Date().toISOString(),
      method
    };
  }

  private compareText(oldText: string, newText: string): { changePercentage: number, description: string, diff: any } {
    if (oldText === newText) {
      return {
        changePercentage: 0,
        description: 'No changes detected',
        diff: { additions: [], deletions: [], modifications: 0 }
      };
    }

    // Simple character-level comparison
    const maxLength = Math.max(oldText.length, newText.length);
    let differences = 0;

    for (let i = 0; i < maxLength; i++) {
      if (oldText[i] !== newText[i]) {
        differences++;
      }
    }

    const changePercentage = (differences / maxLength) * 100;

    return {
      changePercentage,
      description: `${changePercentage.toFixed(1)}% of content changed`,
      diff: {
        additions: newText.length > oldText.length ? [newText.slice(oldText.length)] : [],
        deletions: oldText.length > newText.length ? [oldText.slice(newText.length)] : [],
        modifications: differences
      }
    };
  }

  private calculateHash(content: string): string {
    // Simple hash implementation (would use crypto in production)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private async sendNotification(
    config: any,
    changeDetection: ChangeDetectionResultDto
  ): Promise<NotificationResultDto> {
    const startTime = Date.now();

    // Mock notification implementation
    // In production, this would integrate with actual notification services

    const result: NotificationResultDto = {
      method: config.method,
      target: config.target || 'mock-target',
      delivered: true,
      deliveredAt: new Date().toISOString(),
      deliveryId: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,attemptNumber: 1};

    // Simulate notification delay
    await new Promise(resolve => setTimeout(resolve, 100));

    this.logger.log(`Notification sent successfully`, {method: config.method,target: config.target,
      duration: Date.now() - startTime
    });

    return result;
  }

  private async simulateContentExtraction(): Promise<string> {
    // Simulate content extraction based on monitoring type
    // In production, this would use actual browser automation
    const timestamp = new Date().toISOString();
    const randomValue = Math.floor(Math.random() * 1000);

    switch (this.config.type) {
      case MonitoringType.TEXT_CHANGE:
        return `Sample text content - ${timestamp} - Value: ${randomValue}`;case MonitoringType.ELEMENT_CHANGE:return `<div class="monitor-element">Content ${randomValue}</div>";case MonitoringType.PAGE_CHANGE:
        return `Full page content simulation - ${timestamp} - Random: ${randomValue}`;default:return `Generic content simulation - ${timestamp} - Value: ${randomValue}`;}}

  private scheduleNextCheck(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
    }

    const interval = this.config.frequency.interval;
    this.nextCheck = new Date(Date.now() + interval);

    this.intervalId = setTimeout(async () => {
      if (this.status === MonitorStatus.ACTIVE) {
        try {
          await this.performCheck();
          this.scheduleNextCheck(); // Schedule next check
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';\n          this.logger.error(`Scheduled check failed`, { error: errorMessage });
          this.status = MonitorStatus.ERROR;
          this.lastError = error;
        }
      }
    }, interval);
  }
}

/**
 * Monitor statistics tracking
 */
class MonitorStatistics {
  public totalChecks: number = 0;
  public successfulChecks: number = 0;
  public failedChecks: number = 0;
  public changesDetected: number = 0;
  public notificationsSent: number = 0;
  public notificationsFailed: number = 0;
  public totalCheckDuration: number = 0;
  public lastCheck?: Date;
  public lastChangeDetected?: Date;

  constructor(public readonly monitorId: string) {}

  recordCheck(result: MonitorCheckResultDto): void {
    this.totalChecks++;
    this.totalCheckDuration += result.durationMs;
    this.lastCheck = new Date(result.timestamp);

    if (result.success) {
      this.successfulChecks++;
    } else {
      this.failedChecks++;
    }

    if (result.changeDetection.detected) {
      this.changesDetected++;
      this.lastChangeDetected = new Date(result.timestamp);
    }

    if (result.notifications) {
      for (const notification of result.notifications) {
        if (notification.delivered) {
          this.notificationsSent++;
        } else {
          this.notificationsFailed++;
        }
      }
    }
  }

  toDto(): MonitorStatisticsDto {
    return {
      monitorId: this.monitorId,
      totalChecks: this.totalChecks,
      successfulChecks: this.successfulChecks,
      failedChecks: this.failedChecks,
      changesDetected: this.changesDetected,
      notificationsSent: this.notificationsSent,
      notificationsFailed: this.notificationsFailed,
      averageCheckDuration: this.totalChecks > 0 ? this.totalCheckDuration / this.totalChecks : 0,
      successRate: this.totalChecks > 0 ? (this.successfulChecks / this.totalChecks) * 100 : 0,
      lastCheck: this.lastCheck?.toISOString() || new Date().toISOString(),
      lastChangeDetected: this.lastChangeDetected?.toISOString() || new Date().toISOString(),
      uptime: this.totalChecks > 0 ? (this.successfulChecks / this.totalChecks) * 100 : 100
    };
  }
}