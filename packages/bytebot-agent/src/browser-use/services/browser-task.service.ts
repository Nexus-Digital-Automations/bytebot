/**
 * Browser Task Service
 *
 * Core service for managing browser automation tasks, including task execution,
 * monitoring, and lifecycle management. Integrates with browser-use Python framework
 * for actual browser automation while providing enterprise-grade task management.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBrowserTaskDto,
  UpdateBrowserTaskDto,
  BrowserTaskResponseDto,
  BrowserTaskStatusDto,
  BrowserTaskListResponseDto,
  BrowserTaskStatus,
  BrowserTaskPriority,
} from '../dto/browser-task.dto';
import { BrowserUseService } from '../browser-use.service';
import { BrowserSessionService } from './browser-session.service';

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface BrowserTaskExecution {
  taskId: string;
  sessionId: string;
  status: TaskStatus;
  priority: TaskPriority;
  startedAt: Date;
  completedAt?: Date;
  lastActivityAt: Date;
  currentStep: number;
  totalSteps: number;
  estimatedRemainingMs?: number;
  result?: any;
  error?: {
    code: string;
    message: string;
    stack?: string;
    timestamp: Date;
  };
  metadata: {
    userId?: string;
    agentId?: string;
    retryCount: number;
    maxRetries: number;
    timeoutMs: number;
    tags: string[];
    customData: Record<string, any>;
  };
  metrics: {
    executionTimeMs?: number;
    memoryUsageMB: number;
    cpuUsagePercent: number;
    networkRequests: number;
    screenshotsTaken: number;
    pagesVisited: number;
  };
  executionSteps: Array<{
    stepNumber: number;
    action: string;
    status: TaskStatus;
    startedAt?: Date;
    completedAt?: Date;
    result?: string;
    error?: string;
    durationMs?: number;
  }>;
}

@Injectable()
export class BrowserTaskService {
  private readonly logger = new Logger(BrowserTaskService.name);
  private readonly activeTasks = new Map<string, BrowserTaskExecution>();
  private readonly taskQueue: string[] = [];
  private readonly completedTasks = new Map<string, BrowserTaskExecution>();
  private readonly maxConcurrentTasks: number;
  private readonly taskTimeoutMs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly browserUseService: BrowserUseService,
    private readonly sessionService: BrowserSessionService,
    private readonly configService: ConfigService,
  ) {
    this.maxConcurrentTasks = this.configService.get<number>(
      'BROWSER_MAX_CONCURRENT_TASKS',
      3,
    );
    this.taskTimeoutMs = this.configService.get<number>(
      'BROWSER_TASK_TIMEOUT_MS',
      300000, // 5 minutes
    );

    // Start cleanup interval for expired tasks
    this.startTaskCleanup();
  }

  /**
   * Create and queue a new browser automation task
   */
  async createTask(
    createTaskDto: CreateBrowserTaskDto,
    userId?: string,
    agentId?: string,
  ): Promise<BrowserTaskResponseDto> {
    const taskId = this.generateTaskId();
    const now = new Date();

    try {
      // Validate task configuration
      await this.validateTaskConfiguration(createTaskDto);

      // Create browser session
      const session = await this.sessionService.createSession({
        name: `Session for ${createTaskDto.name}`,
        description: createTaskDto.description,
      });
      const sessionId = session.id;

      // Create task execution object
      const taskExecution: BrowserTaskExecution = {
        taskId,
        sessionId,
        status: TaskStatus.PENDING,
        priority:
          (createTaskDto.priority as unknown as TaskPriority) ??
          TaskPriority.NORMAL,
        startedAt: now,
        lastActivityAt: now,
        currentStep: 0,
        totalSteps: this.calculateTotalSteps(createTaskDto),
        metadata: {
          userId,
          agentId,
          retryCount: 0,
          maxRetries: 3, // Default value
          timeoutMs:
            (createTaskDto.constraints?.maxExecutionTime ?? 300) * 1000,
          tags: createTaskDto.tags ?? [],
          customData: createTaskDto.config ?? {},
        },
        metrics: {
          memoryUsageMB: 0,
          cpuUsagePercent: 0,
          networkRequests: 0,
          screenshotsTaken: 0,
          pagesVisited: 0,
        },
        executionSteps: [],
      };

      // Store task
      this.activeTasks.set(taskId, taskExecution);

      // Queue task for execution
      this.queueTask(taskId);

      this.logger.log(
        `Browser task created: ${taskId} (${createTaskDto.name})`,
      );

      return {
        id: taskId,
        name: createTaskDto.name,
        description: createTaskDto.description,
        status: BrowserTaskStatus.PENDING,
        priority: createTaskDto.priority || BrowserTaskPriority.NORMAL,
        sessionId,
        createdAt: now,
        updatedAt: now,
        createdBy: userId || 'system',
        progress: 0,
        totalSteps: taskExecution.totalSteps,
        completedSteps: 0,
        executionSteps: [],
        constraints: createTaskDto.constraints,
        config: createTaskDto.config,
        tags: createTaskDto.tags,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to create browser task: ${errorMessage}`,
        errorStack,
      );

      // When task creation fails, throw an error instead of returning a response
      throw new Error(`Task creation failed: ${errorMessage}`);
    }
  }

  /**
   * Get status of a specific task
   */
  async getTaskStatus(taskId: string): Promise<BrowserTaskStatusDto> {
    const task =
      this.activeTasks.get(taskId) ?? this.completedTasks.get(taskId);

    if (!task) {
      return {
        success: false,
        taskId,
        found: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `Task ${taskId} not found`,
          timestamp: new Date(),
        },
        timestamp: new Date(),
      };
    }

    // Calculate progress
    const progressPercent = Math.round(
      (task.currentStep / Math.max(task.totalSteps, 1)) * 100,
    );

    // Estimate remaining time
    let estimatedRemainingMs: number | undefined;
    if (task.status === TaskStatus.RUNNING && task.currentStep > 0) {
      const elapsed = Date.now() - task.startedAt.getTime();
      const avgTimePerStep = elapsed / task.currentStep;
      const remainingSteps = task.totalSteps - task.currentStep;
      estimatedRemainingMs = Math.round(avgTimePerStep * remainingSteps);
    }

    return {
      success: true,
      taskId,
      found: true,
      status: task.status,
      progress: {
        currentStep: task.currentStep,
        totalSteps: task.totalSteps,
        percentComplete: progressPercent,
        estimatedRemainingMs,
      },
      timing: {
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        lastActivityAt: task.lastActivityAt,
        totalDurationMs: task.completedAt
          ? task.completedAt.getTime() - task.startedAt.getTime()
          : Date.now() - task.startedAt.getTime(),
      },
      sessionId: task.sessionId,
      metrics: task.metrics,
      executionSteps: task.executionSteps,
      result: task.result,
      error: task.error,
      timestamp: new Date(),
    };
  }

  /**
   * Cancel a running or pending task
   */
  async cancelTask(
    taskId: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    const task = this.activeTasks.get(taskId);

    if (!task) {
      return {
        success: false,
        message: `Task ${taskId} not found`,
      };
    }

    if (
      task.status === TaskStatus.COMPLETED ||
      task.status === TaskStatus.FAILED
    ) {
      return {
        success: false,
        message: `Task ${taskId} is already ${task.status.toLowerCase()}`,
      };
    }

    try {
      // Update task status
      task.status = TaskStatus.CANCELLED;
      task.completedAt = new Date();
      task.lastActivityAt = new Date();
      task.error = {
        code: 'TASK_CANCELLED',
        message: reason ?? 'Task was cancelled by user',
        timestamp: new Date(),
      };

      // Remove from queue if pending
      const queueIndex = this.taskQueue.indexOf(taskId);
      if (queueIndex >= 0) {
        this.taskQueue.splice(queueIndex, 1);
      }

      // Move to completed tasks
      this.completedTasks.set(taskId, task);
      this.activeTasks.delete(taskId);

      this.logger.log(`Browser task cancelled: ${taskId} - ${reason}`);

      return {
        success: true,
        message: `Task ${taskId} cancelled successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to cancel task ${taskId}: ${error.message}`);
      return {
        success: false,
        message: `Failed to cancel task: ${error.message}`,
      };
    }
  }

  /**
   * Get a specific task by ID
   */
  async getTask(taskId: string): Promise<BrowserTaskResponseDto> {
    const task =
      this.activeTasks.get(taskId) ?? this.completedTasks.get(taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Convert internal task to response DTO format
    const progressPercent = Math.round(
      (task.currentStep / Math.max(task.totalSteps, 1)) * 100,
    );

    return {
      id: task.taskId,
      name: `Browser Task ${task.taskId}`, // We don't store name separately in internal format
      description: 'Browser automation task', // We don't store description separately
      status: task.status as unknown as BrowserTaskStatus,
      priority: task.priority as any,
      sessionId: task.sessionId,
      createdAt: task.startedAt,
      updatedAt: task.lastActivityAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      createdBy: task.metadata.userId || 'system',
      progress: progressPercent,
      totalSteps: task.totalSteps,
      completedSteps: task.currentStep,
      executionSteps: task.executionSteps.map((step) => ({
        stepNumber: step.stepNumber,
        action: step.action,
        target: 'browser', // Default target since not stored in internal format
        result: step.result || 'completed',
        timestamp: step.startedAt || new Date(),
        screenshot: '', // Screenshots would need separate handling
        success: step.status === TaskStatus.COMPLETED,
        error: step.error,
      })),
      result: task.result,
      error: task.error
        ? {
            message: task.error.message,
            code: task.error.code,
            details: task.error.stack,
            timestamp: task.error.timestamp,
          }
        : undefined,
      metrics: {
        duration: task.metrics.executionTimeMs
          ? task.metrics.executionTimeMs / 1000
          : 0,
        actionsPerformed: task.currentStep,
        pagesVisited: task.metrics.pagesVisited,
        screenshotsTaken: task.metrics.screenshotsTaken,
        errorsEncountered: task.error ? 1 : 0,
      },
    };
  }

  /**
   * Update an existing task
   */
  async updateTask(
    taskId: string,
    updateTaskDto: UpdateBrowserTaskDto,
  ): Promise<BrowserTaskResponseDto> {
    const task = this.activeTasks.get(taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found or already completed`);
    }

    if (task.status === TaskStatus.RUNNING) {
      throw new Error(`Cannot update task ${taskId} while it is running`);
    }

    // Update task properties
    if (updateTaskDto.priority) {
      task.priority = updateTaskDto.priority as unknown as TaskPriority;
    }
    if (updateTaskDto.tags) {
      task.metadata.tags = updateTaskDto.tags;
    }
    if (updateTaskDto.config) {
      task.metadata.customData = {
        ...task.metadata.customData,
        ...updateTaskDto.config,
      };
    }
    if (updateTaskDto.constraints?.maxExecutionTime) {
      task.metadata.timeoutMs =
        updateTaskDto.constraints.maxExecutionTime * 1000;
    }

    task.lastActivityAt = new Date();

    this.logger.log(`Task updated: ${taskId}`);

    // Return updated task
    return await this.getTask(taskId);
  }

  /**
   * Start task execution
   */
  async startTask(taskId: string): Promise<BrowserTaskResponseDto> {
    const task = this.activeTasks.get(taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status === TaskStatus.RUNNING) {
      throw new Error(`Task ${taskId} is already running`);
    }

    if (
      task.status === TaskStatus.COMPLETED ||
      task.status === TaskStatus.FAILED
    ) {
      throw new Error(`Task ${taskId} is already ${task.status.toLowerCase()}`);
    }

    // Remove from queue if present and start immediately
    const queueIndex = this.taskQueue.indexOf(taskId);
    if (queueIndex >= 0) {
      this.taskQueue.splice(queueIndex, 1);
    }

    // Check if we have available slots
    const runningTasks = Array.from(this.activeTasks.values()).filter(
      (t) => t.status === TaskStatus.RUNNING,
    );

    if (runningTasks.length >= this.maxConcurrentTasks) {
      throw new Error('Maximum concurrent tasks limit reached');
    }

    this.logger.log(`Starting task manually: ${taskId}`);

    // Execute task immediately
    this.executeTask(task).catch((error) => {
      this.logger.error(`Task execution failed: ${error.message}`, error.stack);
    });

    return await this.getTask(taskId);
  }

  /**
   * Stop task execution
   */
  async stopTask(taskId: string): Promise<BrowserTaskResponseDto> {
    const result = await this.cancelTask(taskId, 'Task stopped by user');

    if (!result.success) {
      throw new Error(result.message);
    }

    // Try to get task from completed tasks since it was just cancelled
    try {
      return await this.getTask(taskId);
    } catch (error) {
      // If task is not found in completed tasks, create a minimal response
      throw new Error(
        `Task ${taskId} was stopped but could not retrieve final status`,
      );
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    const activeTask = this.activeTasks.get(taskId);
    const completedTask = this.completedTasks.get(taskId);

    if (!activeTask && !completedTask) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Cancel if running
    if (
      activeTask &&
      (activeTask.status === TaskStatus.RUNNING ||
        activeTask.status === TaskStatus.PENDING)
    ) {
      await this.cancelTask(taskId, 'Task deleted');
    }

    // Remove from all collections
    this.activeTasks.delete(taskId);
    this.completedTasks.delete(taskId);

    // Remove from queue if present
    const queueIndex = this.taskQueue.indexOf(taskId);
    if (queueIndex >= 0) {
      this.taskQueue.splice(queueIndex, 1);
    }

    this.logger.log(`Task deleted: ${taskId}`);
  }

  /**
   * Get list of all tasks (active and completed) with pagination
   */
  async listTasks(options: {
    status?: TaskStatus;
    page?: number;
    limit?: number;
  }): Promise<BrowserTaskListResponseDto> {
    const { status, page = 1, limit = 10 } = options;

    const allTasks = [
      ...Array.from(this.activeTasks.values()),
      ...Array.from(this.completedTasks.values()),
    ];

    // Filter by status if provided
    let filteredTasks = allTasks;
    if (status) {
      filteredTasks = allTasks.filter((task) => task.status === status);
    }

    // Sort by creation date (newest first)
    filteredTasks.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    // Apply pagination
    const total = filteredTasks.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

    // Convert to response DTOs
    const tasks: BrowserTaskResponseDto[] = [];
    for (const task of paginatedTasks) {
      try {
        const taskDto = await this.convertToResponseDto(task);
        tasks.push(taskDto);
      } catch (error) {
        this.logger.error(
          `Failed to convert task ${task.taskId}: ${error.message}`,
        );
      }
    }

    return {
      tasks,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /**
   * Get list of all tasks (active and completed) - Legacy method for backward compatibility
   */
  async listTasksLegacy(filters?: {
    status?: TaskStatus;
    userId?: string;
    agentId?: string;
    sessionId?: string;
    priority?: TaskPriority;
    tags?: string[];
  }): Promise<BrowserTaskStatusDto[]> {
    const allTasks = [
      ...Array.from(this.activeTasks.values()),
      ...Array.from(this.completedTasks.values()),
    ];

    let filteredTasks = allTasks;

    if (filters) {
      filteredTasks = allTasks.filter((task) => {
        if (filters.status && task.status !== filters.status) return false;
        if (filters.userId && task.metadata.userId !== filters.userId)
          return false;
        if (filters.agentId && task.metadata.agentId !== filters.agentId)
          return false;
        if (filters.sessionId && task.sessionId !== filters.sessionId)
          return false;
        if (filters.priority && task.priority !== filters.priority)
          return false;
        if (
          filters.tags &&
          !filters.tags.some((tag) => task.metadata.tags.includes(tag))
        ) {
          return false;
        }
        return true;
      });
    }

    return filteredTasks.map((task) => ({
      success: true,
      taskId: task.taskId,
      found: true,
      status: task.status,
      progress: {
        currentStep: task.currentStep,
        totalSteps: task.totalSteps,
        percentComplete: Math.round(
          (task.currentStep / Math.max(task.totalSteps, 1)) * 100,
        ),
      },
      timing: {
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        lastActivityAt: task.lastActivityAt,
        totalDurationMs: task.completedAt
          ? task.completedAt.getTime() - task.startedAt.getTime()
          : Date.now() - task.startedAt.getTime(),
      },
      sessionId: task.sessionId,
      metrics: task.metrics,
      executionSteps: task.executionSteps,
      result: task.result,
      error: task.error,
      timestamp: new Date(),
    }));
  }

  /**
   * Get task execution metrics and statistics
   */
  async getTaskMetrics(): Promise<{
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageExecutionTimeMs: number;
    successRate: number;
    queueLength: number;
    resourceUsage: {
      memoryUsageMB: number;
      cpuUsagePercent: number;
    };
  }> {
    const allTasks = [
      ...Array.from(this.activeTasks.values()),
      ...Array.from(this.completedTasks.values()),
    ];

    const activeTasks = allTasks.filter(
      (t) => t.status === TaskStatus.RUNNING || t.status === TaskStatus.PENDING,
    );
    const completedTasks = allTasks.filter(
      (t) => t.status === TaskStatus.COMPLETED,
    );
    const failedTasks = allTasks.filter((t) => t.status === TaskStatus.FAILED);

    const executionTimes = completedTasks
      .filter((t) => t.completedAt)
      .map((t) => t.completedAt.getTime() - t.startedAt.getTime());

    const averageExecutionTimeMs =
      executionTimes.length > 0
        ? executionTimes.reduce((sum, time) => sum + time, 0) /
          executionTimes.length
        : 0;

    const successRate =
      completedTasks.length + failedTasks.length > 0
        ? (completedTasks.length /
            (completedTasks.length + failedTasks.length)) *
          100
        : 100;

    // Calculate resource usage
    const activeTasksMetrics = activeTasks.map((t) => t.metrics);
    const totalMemoryMB = activeTasksMetrics.reduce(
      (sum, m) => sum + m.memoryUsageMB,
      0,
    );
    const avgCpuPercent =
      activeTasksMetrics.length > 0
        ? activeTasksMetrics.reduce((sum, m) => sum + m.cpuUsagePercent, 0) /
          activeTasksMetrics.length
        : 0;

    return {
      totalTasks: allTasks.length,
      activeTasks: activeTasks.length,
      completedTasks: completedTasks.length,
      failedTasks: failedTasks.length,
      averageExecutionTimeMs,
      successRate,
      queueLength: this.taskQueue.length,
      resourceUsage: {
        memoryUsageMB: totalMemoryMB,
        cpuUsagePercent: Math.round(avgCpuPercent * 100) / 100,
      },
    };
  }

  /**
   * Process task queue and execute pending tasks
   */
  private async processTaskQueue(): Promise<void> {
    if (this.taskQueue.length === 0) return;

    const runningTasks = Array.from(this.activeTasks.values()).filter(
      (t) => t.status === TaskStatus.RUNNING,
    );

    const availableSlots = this.maxConcurrentTasks - runningTasks.length;
    if (availableSlots <= 0) return;

    const tasksToStart = this.taskQueue.splice(0, availableSlots);

    for (const taskId of tasksToStart) {
      const task = this.activeTasks.get(taskId);
      if (task) {
        this.executeTask(task).catch((error) => {
          this.logger.error(
            `Task execution failed: ${error.message}`,
            error.stack,
          );
        });
      }
    }
  }

  /**
   * Execute a browser automation task
   */
  private async executeTask(task: BrowserTaskExecution): Promise<void> {
    task.status = TaskStatus.RUNNING;
    task.lastActivityAt = new Date();

    try {
      this.logger.log(`Starting browser task execution: ${task.taskId}`);

      // Execute task through BrowserUseService
      const result = await this.browserUseService.executeAutomationTask({
        taskId: task.taskId,
        sessionId: task.sessionId,
        actions: [], // Would be populated from task configuration
        options: {
          timeout: task.metadata.timeoutMs,
          screenshots: true,
          retryOnFailure: task.metadata.maxRetries > 0,
        },
      });

      // Update task with results
      task.status = result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED;
      task.completedAt = new Date();
      task.lastActivityAt = new Date();
      task.result = result.results;
      task.currentStep = task.totalSteps;

      if (!result.success && result.error) {
        task.error = {
          code: 'EXECUTION_FAILED',
          message: result.error,
          timestamp: new Date(),
        };
      }

      // Update metrics
      task.metrics.executionTimeMs = result.executionTimeMs;
      task.metrics.screenshotsTaken = result.screenshotsTaken ?? 0;

      // Move to completed tasks
      this.completedTasks.set(task.taskId, task);
      this.activeTasks.delete(task.taskId);

      this.logger.log(
        `Browser task completed: ${task.taskId} (${task.status})`,
      );
    } catch (error) {
      task.status = TaskStatus.FAILED;
      task.completedAt = new Date();
      task.lastActivityAt = new Date();
      task.error = {
        code: 'EXECUTION_ERROR',
        message: error.message,
        stack: error.stack,
        timestamp: new Date(),
      };

      this.completedTasks.set(task.taskId, task);
      this.activeTasks.delete(task.taskId);

      this.logger.error(
        `Browser task failed: ${task.taskId} - ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Private helper methods
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async validateTaskConfiguration(
    createTaskDto: CreateBrowserTaskDto,
  ): Promise<void> {
    if (!createTaskDto.name) {
      throw new Error('Task name is required');
    }

    if (
      createTaskDto.constraints?.maxExecutionTime &&
      createTaskDto.constraints.maxExecutionTime > 3600
    ) {
      throw new Error('Task timeout cannot exceed 1 hour');
    }

    // Additional validation logic...
  }

  private calculateTotalSteps(createTaskDto: CreateBrowserTaskDto): number {
    // Estimate steps based on task configuration
    let steps = 1; // Base step

    if (createTaskDto.constraints?.maxActions) {
      steps += Math.min(createTaskDto.constraints.maxActions, 10);
    }

    if (createTaskDto.constraints?.enableScreenshots) {
      steps += 1;
    }

    if (createTaskDto.constraints?.enableVideoRecording) {
      steps += 1;
    }

    return steps;
  }

  private queueTask(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    // Insert based on priority
    let insertIndex = this.taskQueue.length;

    for (let i = 0; i < this.taskQueue.length; i++) {
      const queuedTask = this.activeTasks.get(this.taskQueue[i]);
      if (
        queuedTask &&
        this.comparePriority(task.priority, queuedTask.priority) > 0
      ) {
        insertIndex = i;
        break;
      }
    }

    this.taskQueue.splice(insertIndex, 0, taskId);

    // Process queue asynchronously
    setImmediate(() => this.processTaskQueue());
  }

  private comparePriority(a: TaskPriority, b: TaskPriority): number {
    const priorities = {
      [TaskPriority.LOW]: 1,
      [TaskPriority.NORMAL]: 2,
      [TaskPriority.HIGH]: 3,
      [TaskPriority.URGENT]: 4,
    };
    return priorities[a] - priorities[b];
  }

  private getQueuePosition(taskId: string): number {
    return this.taskQueue.indexOf(taskId) + 1;
  }

  private calculateEstimatedStartTime(taskId: string): Date {
    const queuePosition = this.getQueuePosition(taskId);
    const averageTaskTime = 120000; // 2 minutes average
    const estimatedDelayMs = (queuePosition - 1) * averageTaskTime;
    return new Date(Date.now() + estimatedDelayMs);
  }

  private startTaskCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTasks();
    }, 60000); // Run every minute
  }

  private cleanupExpiredTasks(): void {
    const now = Date.now();
    const maxCompletedTaskAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [taskId, task] of this.completedTasks.entries()) {
      const age =
        now - (task.completedAt?.getTime() ?? task.startedAt.getTime());
      if (age > maxCompletedTaskAge) {
        this.completedTasks.delete(taskId);
        this.logger.debug(`Cleaned up expired task: ${taskId}`);
      }
    }
  }

  /**
   * Convert internal task to response DTO
   */
  private async convertToResponseDto(
    task: BrowserTaskExecution,
  ): Promise<BrowserTaskResponseDto> {
    const progressPercent = Math.round(
      (task.currentStep / Math.max(task.totalSteps, 1)) * 100,
    );

    return {
      id: task.taskId,
      name: `Browser Task ${task.taskId}`,
      description: 'Browser automation task',
      status: task.status as unknown as BrowserTaskStatus,
      priority: task.priority as any,
      sessionId: task.sessionId,
      createdAt: task.startedAt,
      updatedAt: task.lastActivityAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      createdBy: task.metadata.userId || 'system',
      progress: progressPercent,
      totalSteps: task.totalSteps,
      completedSteps: task.currentStep,
      executionSteps: task.executionSteps.map((step) => ({
        stepNumber: step.stepNumber,
        action: step.action,
        target: 'browser',
        result: step.result || 'completed',
        timestamp: step.startedAt || new Date(),
        screenshot: '',
        success: step.status === TaskStatus.COMPLETED,
        error: step.error,
      })),
      result: task.result,
      error: task.error
        ? {
            message: task.error.message,
            code: task.error.code,
            details: task.error.stack,
            timestamp: task.error.timestamp,
          }
        : undefined,
      metrics: {
        duration: task.metrics.executionTimeMs
          ? task.metrics.executionTimeMs / 1000
          : 0,
        actionsPerformed: task.currentStep,
        pagesVisited: task.metrics.pagesVisited,
        screenshotsTaken: task.metrics.screenshotsTaken,
        errorsEncountered: task.error ? 1 : 0,
      },
    };
  }

  /**
   * Cleanup on service destruction
   */
  async onModuleDestroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Cancel all active tasks
    for (const [taskId, task] of this.activeTasks.entries()) {
      if (
        task.status === TaskStatus.RUNNING ||
        task.status === TaskStatus.PENDING
      ) {
        await this.cancelTask(taskId, 'Service shutdown');
      }
    }

    this.logger.log('Browser task service shutdown completed');
  }
}
