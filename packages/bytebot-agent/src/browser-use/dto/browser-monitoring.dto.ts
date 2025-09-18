/**
 * Browser Monitoring DTOs
 *
 * Data Transfer Objects for monitoring browser-use service health,
 * task status, performance metrics, and system diagnostics.
 */

import { ApiProperty } from '@nestjs/swagger';

export class BrowserMonitoringResponseDto {
  @ApiProperty({ description: 'Overall service health status' })
  serviceHealth!: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
    uptime: number; // seconds
    version: string;
  };

  @ApiProperty({ description: 'Browser process information' })
  browserProcesses!: {
    totalProcesses: number;
    activeProcesses: number;
    idleProcesses: number;
    failedProcesses: number;
    memoryUsageMB: number;
    cpuUsagePercent: number;
  };

  @ApiProperty({ description: 'System resource usage' })
  systemResources!: {
    totalMemoryMB: number;
    availableMemoryMB: number;
    memoryUsagePercent: number;
    cpuUsagePercent: number;
    diskUsagePercent: number;
    networkLatencyMs: number;
  };

  @ApiProperty({ description: 'Service configuration' })
  configuration!: {
    maxConcurrentSessions: number;
    sessionTimeoutSeconds: number;
    enableHeadless: boolean;
    enableScreenshots: boolean;
    enableVideoRecording: boolean;
    workingDirectory: string;
  };

  @ApiProperty({ description: 'Component status' })
  components!: {
    browserUseFramework: 'online' | 'offline' | 'error';
    pythonRuntime: 'online' | 'offline' | 'error';
    chromeDriver: 'online' | 'offline' | 'error';
    localStorage: 'online' | 'offline' | 'error';
  };

  @ApiProperty({ description: 'Recent errors and warnings' })
  recentIssues!: Array<{
    timestamp: Date;
    level: 'error' | 'warning' | 'info';
    message: string;
    source: string;
    details?: any;
  }>;

  @ApiProperty({ description: 'Health check timestamp' })
  timestamp!: Date;
}

export class TaskStatusResponseDto {
  @ApiProperty({ description: 'Task identifier' })
  taskId!: string;

  @ApiProperty({ description: 'Current task status' })
  status!: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  @ApiProperty({ description: 'Task progress information' })
  progress!: {
    currentStep: number;
    totalSteps: number;
    percentComplete: number;
    currentAction: string;
    estimatedRemainingSeconds?: number;
  };

  @ApiProperty({ description: 'Execution timing' })
  timing!: {
    queuedAt: Date;
    startedAt?: Date;
    lastActivityAt?: Date;
    completedAt?: Date;
    totalDurationMs?: number;
    executionTimeMs?: number;
  };

  @ApiProperty({ description: 'Resource usage during execution' })
  resourceUsage!: {
    memoryUsageMB: number;
    cpuUsagePercent: number;
    networkRequests: number;
    screenshotsTaken: number;
    pagesVisited: number;
  };

  @ApiProperty({ description: 'Current browser state' })
  browserState?: {
    sessionId: string;
    currentUrl: string;
    pageTitle: string;
    loadingStatus: string;
    tabsOpen: number;
  };

  @ApiProperty({ description: 'Task execution steps' })
  executionSteps!: Array<{
    stepNumber: number;
    action: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt?: Date;
    completedAt?: Date;
    result?: string;
    error?: string;
  }>;

  @ApiProperty({ description: 'Real-time logs' })
  recentLogs!: Array<{
    timestamp: Date;
    level: 'debug' | 'info' | 'warning' | 'error';
    message: string;
    source: string;
  }>;

  @ApiProperty({ description: 'Error information if task failed' })
  error?: {
    code: string;
    message: string;
    stack?: string;
    timestamp: Date;
    retryCount: number;
  };

  @ApiProperty({ description: 'Status check timestamp' })
  timestamp!: Date;
}

// Type aliases for backward compatibility
export type BrowserMonitoringDto = BrowserMonitoringResponseDto;
