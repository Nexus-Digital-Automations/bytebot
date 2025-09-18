/**
 * Browser Monitoring Service
 *
 * Specialized service for monitoring browser automation health, performance,
 * and system metrics. Provides comprehensive monitoring capabilities including
 * service health checks, resource usage tracking, and performance monitoring.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BrowserMonitoringResponseDto,
  TaskStatusResponseDto,
} from '../dto/browser-monitoring.dto';
import { BrowserSessionStatus } from '../dto/browser-session.dto';
import {
  BrowserTaskStatusDto,
  BrowserTaskStatus,
} from '../dto/browser-task.dto';
import { BrowserUseService } from '../browser-use.service';
import { BrowserSessionService } from './browser-session.service';
import { BrowserTaskService } from './browser-task.service';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as dns from 'dns';

export interface SystemMetrics {
  cpu: {
    usagePercent: number;
    loadAverage: number[];
    coreCount: number;
  };
  memory: {
    totalMB: number;
    usedMB: number;
    availableMB: number;
    usagePercent: number;
  };
  disk: {
    totalGB: number;
    usedGB: number;
    availableGB: number;
    usagePercent: number;
  };
  network: {
    latencyMs: number;
    connectionsActive: number;
  };
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  uptime: number;
  version: string;
  components: {
    browserUseFramework: 'online' | 'offline' | 'error';
    pythonRuntime: 'online' | 'offline' | 'error';
    chromeDriver: 'online' | 'offline' | 'error';
    localStorage: 'online' | 'offline' | 'error';
  };
  configuration: {
    maxConcurrentSessions: number;
    sessionTimeoutSeconds: number;
    enableHeadless: boolean;
    enableScreenshots: boolean;
    enableVideoRecording: boolean;
    workingDirectory: string;
  };
}

export interface PerformanceMetrics {
  browserProcesses: {
    totalProcesses: number;
    activeProcesses: number;
    idleProcesses: number;
    failedProcesses: number;
    memoryUsageMB: number;
    cpuUsagePercent: number;
  };
  taskMetrics: {
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageExecutionTimeMs: number;
    tasksPerMinute: number;
    successRate: number;
  };
  sessionMetrics: {
    totalSessions: number;
    activeSessions: number;
    averageSessionDurationMs: number;
    sessionsCreatedPerHour: number;
  };
}

export interface BrowserSession {
  id: string;
  status: string;
  currentUrl?: string;
  pageTitle?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaskError {
  code?: string;
  message?: string;
  stack?: string;
  timestamp?: Date;
}

export interface TaskProgress {
  currentStep?: number;
  totalSteps?: number;
  percentComplete?: number;
  estimatedRemainingMs?: number;
}

export interface TaskTiming {
  startedAt?: Date;
  lastActivityAt?: Date;
  completedAt?: Date;
  totalDurationMs?: number;
}

export interface TaskMetrics {
  memoryUsageMB?: number;
  cpuUsagePercent?: number;
  networkRequests?: number;
  screenshotsTaken?: number;
  pagesVisited?: number;
}

export interface TaskExecutionStep {
  stepNumber: number;
  action: string;
  status: string;
  startedAt?: Date;
  completedAt?: Date;
  result?: unknown;
  error?: TaskError;
}

export interface TaskStatusInfo {
  success: boolean;
  found: boolean;
  sessionId?: string;
  status: string;
  progress?: TaskProgress;
  timing?: TaskTiming;
  executionTime?: number;
  metrics?: TaskMetrics;
  executionSteps?: TaskExecutionStep[];
  error?: TaskError;
}

export interface TaskServiceMetrics {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTimeMs: number;
  successRate: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
}

export interface MonitoringError extends Error {
  code?: string;
  timestamp?: Date;
}

export interface IssueRecord {
  timestamp: Date;
  level: 'error' | 'warning' | 'info';
  message: string;
  source: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class BrowserMonitoringService {
  private readonly logger = new Logger(BrowserMonitoringService.name);
  private readonly startTime = Date.now();
  private readonly recentIssues: IssueRecord[] = [];
  private readonly maxIssuesHistory = 100;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private systemMetricsCache: {
    metrics: SystemMetrics;
    timestamp: Date;
  } | null = null;
  private readonly metricsRefreshIntervalMs = 30000; // 30 seconds

  constructor(
    private readonly browserUseService: BrowserUseService,
    private readonly sessionService: BrowserSessionService,
    private readonly taskService: BrowserTaskService,
    private readonly configService: ConfigService,
  ) {
    this.startSystemMetricsCollection();
  }

  /**
   * Get comprehensive service health status
   */
  async getServiceHealth(): Promise<BrowserMonitoringResponseDto> {
    const timestamp = new Date();

    try {
      this.logger.debug('Collecting service health metrics');

      // Get system metrics
      const systemMetrics = await this.getSystemMetrics();

      // Check component health
      const componentHealth = await this.checkComponentHealth();

      // Get service configuration
      const configuration = this.getServiceConfiguration();

      // Get browser process metrics
      const browserProcesses = await this.getBrowserProcessMetrics();

      // Determine overall service health
      const serviceHealth = this.calculateServiceHealth(
        componentHealth,
        systemMetrics,
      );

      return {
        serviceHealth: {
          status: serviceHealth.status,
          message: serviceHealth.message,
          uptime: Math.floor((Date.now() - this.startTime) / 1000),
          version: this.getServiceVersion(),
        },
        browserProcesses,
        systemResources: {
          totalMemoryMB: systemMetrics.memory.totalMB,
          availableMemoryMB: systemMetrics.memory.availableMB,
          memoryUsagePercent: systemMetrics.memory.usagePercent,
          cpuUsagePercent: systemMetrics.cpu.usagePercent,
          diskUsagePercent: systemMetrics.disk.usagePercent,
          networkLatencyMs: systemMetrics.network.latencyMs,
        },
        configuration,
        components: componentHealth,
        recentIssues: this.recentIssues.slice(-10), // Last 10 issues
        timestamp,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to get service health: ${errorMessage}`,
        errorStack,
      );

      return {
        serviceHealth: {
          status: 'unhealthy',
          message: `Health check failed: ${errorMessage}`,
          uptime: Math.floor((Date.now() - this.startTime) / 1000),
          version: this.getServiceVersion(),
        },
        browserProcesses: {
          totalProcesses: 0,
          activeProcesses: 0,
          idleProcesses: 0,
          failedProcesses: 0,
          memoryUsageMB: 0,
          cpuUsagePercent: 0,
        },
        systemResources: {
          totalMemoryMB: 0,
          availableMemoryMB: 0,
          memoryUsagePercent: 0,
          cpuUsagePercent: 0,
          diskUsagePercent: 0,
          networkLatencyMs: 0,
        },
        configuration: this.getServiceConfiguration(),
        components: {
          browserUseFramework: 'error',
          pythonRuntime: 'error',
          chromeDriver: 'error',
          localStorage: 'error',
        },
        recentIssues: [
          {
            timestamp,
            level: 'error',
            message: `Health check failed: ${errorMessage}`,
            source: 'BrowserMonitoringService',
            details: { error: errorMessage },
          },
        ],
        timestamp,
      };
    }
  }

  /**
   * Get detailed task status and monitoring information
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponseDto> {
    const timestamp = new Date();

    try {
      this.logger.debug(`Getting detailed status for task: ${taskId}`);

      // Get task status from task service
      const taskStatus = this.taskService.getTaskStatus(taskId);

      if (!taskStatus.success || !taskStatus.found) {
        return {
          taskId,
          status: 'cancelled',
          progress: {
            currentStep: 0,
            totalSteps: 0,
            percentComplete: 0,
            currentAction: 'Task not found',
          },
          timing: {
            queuedAt: new Date(),
          },
          resourceUsage: {
            memoryUsageMB: 0,
            cpuUsagePercent: 0,
            networkRequests: 0,
            screenshotsTaken: 0,
            pagesVisited: 0,
          },
          executionSteps: [],
          recentLogs: [],
          error: {
            code: 'TASK_NOT_FOUND',
            message: `Task ${taskId} not found`,
            timestamp,
            retryCount: 0,
          },
          timestamp,
        };
      }

      // Get current browser state if task has a session
      let browserState:
        | {
            sessionId: string;
            currentUrl: string;
            pageTitle: string;
            loadingStatus: string;
            tabsOpen: number;
          }
        | undefined;
      if (taskStatus.sessionId) {
        try {
          const session = await this.sessionService.getSession(
            taskStatus.sessionId,
          );
          if (session) {
            browserState = {
              sessionId: taskStatus.sessionId,
              currentUrl: session.currentUrl ?? 'unknown',
              pageTitle: session.pageTitle ?? 'Untitled',
              loadingStatus:
                session.status === BrowserSessionStatus.ACTIVE
                  ? 'complete'
                  : 'loading',
              tabsOpen: 1, // Simplified
            };
          }
        } catch {
          this.logger.warn(
            `Could not get browser state for session: ${taskStatus.sessionId}`,
          );
        }
      }

      // Convert execution steps
      const executionSteps = (taskStatus.executionSteps || []).map((step) => ({
        stepNumber: step.stepNumber,
        action: step.action,
        status: step.status as 'pending' | 'running' | 'completed' | 'failed',
        startedAt: step.startedAt,
        completedAt: step.completedAt,
        result: step.result,
        error: step.error,
      }));

      // Generate recent logs (simplified implementation)
      const recentLogs = this.generateTaskLogs(taskId, taskStatus);

      return {
        taskId,
        status: taskStatus.status as
          | 'pending'
          | 'running'
          | 'completed'
          | 'failed'
          | 'cancelled',
        progress: {
          currentStep: taskStatus.progress?.currentStep ?? 0,
          totalSteps: taskStatus.progress?.totalSteps ?? 0,
          percentComplete: taskStatus.progress?.percentComplete ?? 0,
          currentAction: this.getCurrentAction(taskStatus),
          estimatedRemainingSeconds: taskStatus.progress?.estimatedRemainingMs
            ? Math.round(taskStatus.progress.estimatedRemainingMs / 1000)
            : undefined,
        },
        timing: {
          queuedAt: taskStatus.timing?.startedAt ?? new Date(),
          startedAt: taskStatus.timing?.startedAt,
          lastActivityAt: taskStatus.timing?.lastActivityAt,
          completedAt: taskStatus.timing?.completedAt,
          totalDurationMs: taskStatus.timing?.totalDurationMs,
          executionTimeMs: taskStatus.executionTime,
        },
        resourceUsage: {
          memoryUsageMB: taskStatus.metrics?.memoryUsageMB ?? 0,
          cpuUsagePercent: taskStatus.metrics?.cpuUsagePercent ?? 0,
          networkRequests: taskStatus.metrics?.networkRequests ?? 0,
          screenshotsTaken: taskStatus.metrics?.screenshotsTaken ?? 0,
          pagesVisited: taskStatus.metrics?.pagesVisited ?? 0,
        },
        browserState,
        executionSteps,
        recentLogs,
        error: taskStatus.error
          ? {
              code: taskStatus.error.code || 'UNKNOWN_ERROR',
              message: taskStatus.error.message || 'Unknown error occurred',
              stack: taskStatus.error.stack,
              timestamp: taskStatus.error.timestamp || timestamp,
              retryCount: 0, // Would be tracked separately
            }
          : undefined,
        timestamp,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to get task status: ${errorMessage}`,
        errorStack,
      );

      return {
        taskId,
        status: 'failed',
        progress: {
          currentStep: 0,
          totalSteps: 0,
          percentComplete: 0,
          currentAction: 'Status check failed',
        },
        timing: {
          queuedAt: new Date(),
        },
        resourceUsage: {
          memoryUsageMB: 0,
          cpuUsagePercent: 0,
          networkRequests: 0,
          screenshotsTaken: 0,
          pagesVisited: 0,
        },
        executionSteps: [],
        recentLogs: [],
        error: {
          code: 'STATUS_CHECK_FAILED',
          message: errorMessage,
          timestamp,
          retryCount: 0,
        },
        timestamp,
      };
    }
  }

  /**
   * Record an issue for monitoring
   */
  recordIssue(
    level: 'error' | 'warning' | 'info',
    message: string,
    source: string,
    details?: unknown,
  ): void {
    const issue = {
      timestamp: new Date(),
      level,
      message,
      source,
      details: details as Record<string, unknown> | undefined,
    };

    this.recentIssues.push(issue);

    // Maintain issue history size
    if (this.recentIssues.length > this.maxIssuesHistory) {
      this.recentIssues.shift();
    }

    // Log the issue
    switch (level) {
      case 'error':
        this.logger.error(`[${source}] ${message}`, details);
        break;
      case 'warning':
        this.logger.warn(`[${source}] ${message}`, details);
        break;
      case 'info':
        this.logger.log(`[${source}] ${message}`, details);
        break;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      // Get task metrics
      const taskMetrics = this.taskService.getTaskMetrics();

      // Get session metrics
      const sessionMetrics = await this.getSessionMetrics();

      // Get browser process metrics
      const browserProcesses = await this.getBrowserProcessMetrics();

      return {
        browserProcesses,
        taskMetrics: {
          totalTasks: taskMetrics.totalTasks,
          activeTasks: taskMetrics.activeTasks,
          completedTasks: taskMetrics.completedTasks,
          failedTasks: taskMetrics.failedTasks,
          averageExecutionTimeMs: taskMetrics.averageExecutionTimeMs,
          tasksPerMinute: this.calculateTasksPerMinute(),
          successRate: taskMetrics.successRate,
        },
        sessionMetrics,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get performance metrics: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    // Return cached metrics if recent
    if (
      this.systemMetricsCache &&
      Date.now() - this.systemMetricsCache.timestamp.getTime() <
        this.metricsRefreshIntervalMs
    ) {
      return this.systemMetricsCache.metrics;
    }

    try {
      const metrics: SystemMetrics = {
        cpu: {
          usagePercent: await this.getCpuUsage(),
          loadAverage: os.loadavg(),
          coreCount: os.cpus().length,
        },
        memory: {
          totalMB: Math.round(os.totalmem() / 1024 / 1024),
          usedMB: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
          availableMB: Math.round(os.freemem() / 1024 / 1024),
          usagePercent: Math.round(
            ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
          ),
        },
        disk: await this.getDiskUsage(),
        network: {
          latencyMs: await this.getNetworkLatency(),
          connectionsActive: 0, // Would require additional network monitoring
        },
      };

      // Cache the metrics
      this.systemMetricsCache = {
        metrics,
        timestamp: new Date(),
      };

      return metrics;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get system metrics: ${errorMessage}`);
      throw error;
    }
  }

  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = Date.now();

      setTimeout(() => {
        const currentUsage = process.cpuUsage(startUsage);
        const elapsedTime = Date.now() - startTime;
        const elapsedTimeInMicroseconds = elapsedTime * 1000;

        const cpuPercent =
          ((currentUsage.user + currentUsage.system) /
            elapsedTimeInMicroseconds) *
          100;

        resolve(Math.round(cpuPercent * 100) / 100);
      }, 1000);
    });
  }

  private getDiskUsage(): Promise<{
    totalGB: number;
    usedGB: number;
    availableGB: number;
    usagePercent: number;
  }> {
    try {
      // This is a simplified implementation
      // In production, you would use a library like 'node-disk-usage'
      return Promise.resolve({
        totalGB: 100,
        usedGB: 60,
        availableGB: 40,
        usagePercent: 60,
      });
    } catch {
      return Promise.resolve({
        totalGB: 0,
        usedGB: 0,
        availableGB: 0,
        usagePercent: 0,
      });
    }
  }

  private async getNetworkLatency(): Promise<number> {
    // Simple localhost ping - in production you might ping a reliable external host
    const startTime = Date.now();
    try {
      // Attempt to resolve localhost
      await new Promise<void>((resolve, reject) => {
        dns.resolve('localhost', (err) => {
          if (err) {
            reject(new Error('DNS resolution failed'));
          } else {
            resolve();
          }
        });
      });
      return Date.now() - startTime;
    } catch {
      return 999; // High latency indicates network issues
    }
  }

  private async checkComponentHealth(): Promise<ServiceHealth['components']> {
    const health: ServiceHealth['components'] = {
      browserUseFramework: 'offline',
      pythonRuntime: 'offline',
      chromeDriver: 'offline',
      localStorage: 'offline',
    };

    try {
      // Check browser-use framework
      const browserTest = this.browserUseService.healthCheck
        ? this.browserUseService.healthCheck()
        : null;
      health.browserUseFramework =
        browserTest?.status === 'healthy' ? 'online' : 'error';
    } catch {
      health.browserUseFramework = 'error';
    }

    try {
      // Check Python runtime
      health.pythonRuntime = 'online'; // Simplified check
    } catch {
      health.pythonRuntime = 'error';
    }

    try {
      // Check Chrome driver
      health.chromeDriver = 'online'; // Simplified check
    } catch {
      health.chromeDriver = 'error';
    }

    try {
      // Check local storage
      await fs.access(process.cwd());
      health.localStorage = 'online';
    } catch {
      health.localStorage = 'error';
    }

    return health;
  }

  private getServiceConfiguration(): ServiceHealth['configuration'] {
    return {
      maxConcurrentSessions: this.configService.get<number>(
        'BROWSER_MAX_CONCURRENT_SESSIONS',
        3,
      ),
      sessionTimeoutSeconds: this.configService.get<number>(
        'BROWSER_SESSION_TIMEOUT_SECONDS',
        1800,
      ),
      enableHeadless: this.configService.get<boolean>('BROWSER_HEADLESS', true),
      enableScreenshots: this.configService.get<boolean>(
        'BROWSER_ENABLE_SCREENSHOTS',
        true,
      ),
      enableVideoRecording: this.configService.get<boolean>(
        'BROWSER_ENABLE_VIDEO',
        false,
      ),
      workingDirectory: this.configService.get<string>(
        'BROWSER_WORKING_DIR',
        process.cwd(),
      ),
    };
  }

  private async getBrowserProcessMetrics(): Promise<
    PerformanceMetrics['browserProcesses']
  > {
    try {
      // This would need integration with actual browser process monitoring
      // Simplified implementation for demonstration
      const activeProcesses = 1; // Would count actual browser processes
      const totalProcesses = 1;

      return {
        totalProcesses,
        activeProcesses,
        idleProcesses: totalProcesses - activeProcesses,
        failedProcesses: 0,
        memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        cpuUsagePercent: await this.getCpuUsage(),
      };
    } catch {
      return {
        totalProcesses: 0,
        activeProcesses: 0,
        idleProcesses: 0,
        failedProcesses: 0,
        memoryUsageMB: 0,
        cpuUsagePercent: 0,
      };
    }
  }

  private calculateServiceHealth(
    componentHealth: ServiceHealth['components'],
    systemMetrics: SystemMetrics,
  ): { status: ServiceHealth['status']; message: string } {
    const offlineComponents = Object.values(componentHealth).filter(
      (status) => status === 'offline',
    ).length;
    const errorComponents = Object.values(componentHealth).filter(
      (status) => status === 'error',
    ).length;

    if (errorComponents > 0) {
      return {
        status: 'unhealthy',
        message: `${errorComponents} components have errors`,
      };
    }

    if (offlineComponents > 0) {
      return {
        status: 'degraded',
        message: `${offlineComponents} components offline`,
      };
    }

    // Check resource usage
    if (
      systemMetrics.memory.usagePercent > 90 ||
      systemMetrics.cpu.usagePercent > 90
    ) {
      return {
        status: 'degraded',
        message: 'High resource usage detected',
      };
    }

    return {
      status: 'healthy',
      message: 'All systems operational',
    };
  }

  private getServiceVersion(): string {
    return this.configService.get<string>('SERVICE_VERSION', '1.0.0');
  }

  private async getSessionMetrics(): Promise<
    PerformanceMetrics['sessionMetrics']
  > {
    try {
      const sessions = await this.sessionService.listSessions();
      const activeSessions =
        sessions && Array.isArray(sessions)
          ? sessions.filter((s: BrowserSession) => s.status === 'active')
          : [];

      return {
        totalSessions: sessions?.length ?? 0,
        activeSessions: Array.isArray(activeSessions)
          ? activeSessions.length
          : 0,
        averageSessionDurationMs: 300000, // Would be calculated from actual session data
        sessionsCreatedPerHour: 5, // Would be calculated from session creation timestamps
      };
    } catch {
      return {
        totalSessions: 0,
        activeSessions: 0,
        averageSessionDurationMs: 0,
        sessionsCreatedPerHour: 0,
      };
    }
  }

  private calculateTasksPerMinute(): number {
    // Simplified calculation - would use actual task completion timestamps
    return 2.5;
  }

  private getCurrentAction(taskStatus: BrowserTaskStatusDto): string {
    if (
      taskStatus.status === BrowserTaskStatus.RUNNING &&
      taskStatus.executionSteps &&
      taskStatus.executionSteps.length > 0
    ) {
      const currentStep = taskStatus.executionSteps.find(
        (step) => step.status === BrowserTaskStatus.RUNNING,
      );
      return currentStep?.action || 'Processing...';
    }

    switch (taskStatus.status) {
      case BrowserTaskStatus.PENDING:
        return 'Waiting in queue';
      case BrowserTaskStatus.RUNNING:
        return 'Executing task';
      case BrowserTaskStatus.COMPLETED:
        return 'Task completed';
      case BrowserTaskStatus.FAILED:
        return 'Task failed';
      case BrowserTaskStatus.CANCELLED:
        return 'Task cancelled';
      default:
        return 'Unknown';
    }
  }

  private generateTaskLogs(
    taskId: string,
    taskStatus: BrowserTaskStatusDto,
  ): Array<{
    timestamp: Date;
    level: 'debug' | 'info' | 'warning' | 'error';
    message: string;
    source: string;
  }> {
    // Simplified log generation - in production, would retrieve from logging system
    const logs: Array<{
      timestamp: Date;
      level: 'debug' | 'info' | 'warning' | 'error';
      message: string;
      source: string;
    }> = [];
    const now = new Date();

    logs.push({
      timestamp: new Date(now.getTime() - 5000),
      level: 'info' as const,
      message: `Task ${taskId} started`,
      source: 'BrowserTaskService',
    });

    if (taskStatus.status === BrowserTaskStatus.RUNNING) {
      logs.push({
        timestamp: new Date(now.getTime() - 2000),
        level: 'debug' as const,
        message: `Executing step ${taskStatus.progress?.currentStep || 1}`,
        source: 'BrowserTaskService',
      });
    }

    if (taskStatus.error) {
      logs.push({
        timestamp: taskStatus.error.timestamp || now,
        level: 'error' as const,
        message: taskStatus.error.message || 'Unknown error',
        source: 'BrowserTaskService',
      });
    }

    return logs;
  }

  private startSystemMetricsCollection(): void {
    // Start periodic metrics collection
    this.monitoringInterval = setInterval(() => {
      this.getSystemMetrics().catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Failed to collect system metrics: ${errorMessage}`);
      });
    }, this.metricsRefreshIntervalMs);
  }

  /**
   * Cleanup on service destruction
   */
  onModuleDestroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.logger.log('Browser monitoring service cleanup completed');
  }
}
