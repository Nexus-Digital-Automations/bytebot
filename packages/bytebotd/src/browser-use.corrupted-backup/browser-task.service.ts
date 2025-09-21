import { Injectable, Logger } from '@nestjs/common';import { v4 as uuidv4 } from 'uuid';import {BrowserTaskResultDto,
  BrowserTaskStatus,
  BrowserTaskPriority,
  CreateBrowserTaskDto,
  BrowserActionType,
} from './dto/browser-task.dto';/*** Browser automation action interface
 */
export interface BrowserAction {
  type: BrowserActionType;
  selector?: string;
  value?: string | number;
  timeout?: number;
  coordinates?: { x: number; y: number };
  options?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Browser session configuration
 */
export interface BrowserSessionConfig {
  headless?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  defaultTimeout?: number;
  slowMo?: number;
  devtools?: boolean;
  args?: string[];
  executablePath?: string;
  ignoreHTTPSErrors?: boolean;
  defaultNavigationTimeout?: number;
  defaultWaitTimeout?: number;
}

/**
 * Task execution log entry
 */
export interface TaskLogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  actionIndex?: number;
  actionType?: string;
  duration?: number;
  screenshot?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Task creation data interface
 */
export interface TaskCreationData {
  taskId: string;
  name: string;
  description: string;
  actions: BrowserAction[];
  priority?: BrowserTaskPriority;
  sessionConfig?: BrowserSessionConfig;
  maxExecutionTimeMs?: number;
  metadata?: Record<string, unknown>;
  enableLogging?: boolean;
  continueOnError?: boolean;
  status: BrowserTaskStatus;
  startedAt: Date;
  actionsCompleted: number;
  totalActions: number;
  logs: TaskLogEntry[];
}

/**
 * Task update data interface
 */
export interface TaskUpdateData {
  status?: BrowserTaskStatus;
  completedAt?: Date;
  executionTimeMs?: number;
  extractedData?: Record<string, unknown>;
  screenshots?: string[];
  logs?: TaskLogEntry[];
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;
}

/**
 * Browser Task Service - Task Lifecycle Management
 *
 * Manages browser automation task tracking, monitoring, and persistence.
 * Provides local-only task management without any cloud dependencies.
 *
 * Key Responsibilities:
 * - Task creation and tracking
 * - Status updates and progress monitoring
 * - Task queue management
 * - Result storage and retrieval
 * - Performance metrics collection
 */
@Injectable()
export class BrowserTaskService {
  private readonly logger = new Logger(BrowserTaskService.name);
  private readonly tasks: Map<string, BrowserTaskResultDto> = new Map();
  private readonly taskQueue: string[] = [];
  private readonly taskMetrics = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageExecutionTime: 0,
    totalExecutionTime: 0,
  };

  /**
   * Create a new browser automation task
   */
  createTask(_taskData: CreateBrowserTaskDto): BrowserTaskResultDto {
    const task: BrowserTaskResultDto = {
      taskId: uuidv4(),
      status: BrowserTaskStatus.PENDING,
      startedAt: new Date(),
      executionTimeMs: 0,
      actionsCompleted: 0,
      totalActions: _taskData.actions?.length ?? 0,
      logs: [],
      metadata: {
        ..._taskData.metadata,
        name: _taskData.name,
        description: _taskData.description,
        priority: _taskData.priority ?? BrowserTaskPriority.NORMAL,
        maxExecutionTimeMs: _taskData.maxExecutionTimeMs ?? 300000,
        enableLogging: _taskData.enableLogging ?? true,
        continueOnError: _taskData.continueOnError ?? false,
        createdAt: new Date(),
      },
    };

    // Store task
    this.tasks.set(task.taskId, task);
    this.taskMetrics.totalTasks++;

    this.logger.log(`Created browser task: ${task.taskId}`, {taskId: task.taskId,name: _taskData.name,
      totalActions: task.totalActions,
      priority: _taskData.priority,
      status: task.status,
    });

    return task;
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): BrowserTaskResultDto | null {
    const task = this.tasks.get(taskId);

    if (!task) {
      return null;
    }

    // Update execution time for running tasks
    if (task.status === BrowserTaskStatus.RUNNING && task.startedAt) {
      task.executionTimeMs = Date.now() - task.startedAt.getTime();
    }

    return task;
  }

  /**
   * Get all tasks
   */
  getAllTasks(): BrowserTaskResultDto[] {
    const tasks = Array.from(this.tasks.values());

    // Update execution times for running tasks
    tasks.forEach((task) => {
      if (task.status === BrowserTaskStatus.RUNNING && task.startedAt) {
        task.executionTimeMs = Date.now() - task.startedAt.getTime();
      }
    });

    return tasks;
  }

  /**
   * Update task status
   */
  updateTaskStatus(taskId: string, updates: Partial<BrowserTaskResultDto>): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);}// Update task fields
    if (updates.status) {
      task.status = updates.status;
    }

    if (updates.completedAt) {
      task.completedAt = updates.completedAt;
    }

    if (updates.executionTimeMs !== undefined) {
      task.executionTimeMs = updates.executionTimeMs;
    }

    if (updates.extractedData) {
      task.extractedData = updates.extractedData;
    }

    if (updates.screenshots) {
      task.screenshots = updates.screenshots;
    }

    if (updates.logs) {
      task.logs = updates.logs;
    }

    if (updates.errorMessage) {
      task.errorMessage = updates.errorMessage;
    }

    if (updates.errorDetails) {
      task.errorDetails = updates.errorDetails;
    }

    // Update metrics
    if (updates.status === BrowserTaskStatus.COMPLETED) {
      this.taskMetrics.completedTasks++;
      if (task.executionTimeMs > 0) {
        this.taskMetrics.totalExecutionTime += task.executionTimeMs;
        this.taskMetrics.averageExecutionTime =
          this.taskMetrics.totalExecutionTime / this.taskMetrics.completedTasks;
      }
    } else if (updates.status === BrowserTaskStatus.FAILED) {
      this.taskMetrics.failedTasks++;
    }

    this.tasks.set(taskId, task);

    this.logger.log(`Updated task status: ${taskId}`, {
      taskId,
      status: task.status,
      executionTimeMs: task.executionTimeMs,
      actionsCompleted: task.actionsCompleted,
    });
  }

  /**
   * Update task progress
   */
  updateTaskProgress(
    taskId: string,
    progress: {
      actionsCompleted?: number;
      currentStep?: string;
      progress?: number;
    },
  ): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    if (progress.actionsCompleted !== undefined) {
      task.actionsCompleted = progress.actionsCompleted;
    }

    // Add progress log entry
    if (progress.currentStep) {
      task.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: progress.currentStep,
        metadata: {
          progress: progress.progress,
          actionsCompleted: task.actionsCompleted,
          totalActions: task.totalActions,
        },
      });
    }

    // Update execution time for running tasks
    if (task.status === BrowserTaskStatus.RUNNING && task.startedAt) {
      task.executionTimeMs = Date.now() - task.startedAt.getTime();
    }

    this.tasks.set(taskId, task);

    this.logger.debug(`Updated task progress: ${taskId}`, {taskId,actionsCompleted: task.actionsCompleted,
      totalActions: task.totalActions,
      progress: progress.progress,
    });
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(_status: BrowserTaskStatus): BrowserTaskResultDto[] {
    const tasks = Array.from(this.tasks.values()).filter(
      (task) => task.status === _status,
    );

    // Update execution times for running tasks
    if (_status === BrowserTaskStatus.RUNNING) {
      tasks.forEach((task) => {
        if (task.startedAt) {
          task.executionTimeMs = Date.now() - task.startedAt.getTime();
        }
      });
    }

    return tasks;
  }

  /**
   * Get next task from queue
   */
  getNextQueuedTask(): BrowserTaskResultDto | null {
    if (this.taskQueue.length === 0) {
      return null;
    }

    const taskId = this.taskQueue.shift();
    if (!taskId) {
      return null;
    }

    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }

    // Update task status to running
    task.status = BrowserTaskStatus.RUNNING;
    task.startedAt = new Date();
    this.tasks.set(taskId, task);

    this.logger.log(`Started queued task: ${taskId}`, {taskId,queuePosition: 0,
      remainingInQueue: this.taskQueue.length,
    });

    return task;
  }

  /**
   * Cancel task
   */
  cancelTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);}if (
      task.status === BrowserTaskStatus.COMPLETED ||
      task.status === BrowserTaskStatus.FAILED ||
      task.status === BrowserTaskStatus.CANCELLED
    ) {
      throw new Error(`Cannot cancel task in status: ${task.status}`);
    }

    // Update task status
    task.status = BrowserTaskStatus.CANCELLED;
    task.completedAt = new Date();

    if (task.startedAt) {
      task.executionTimeMs = Date.now() - task.startedAt.getTime();
    }

    // Add cancellation log
    task.logs.push({
      timestamp: new Date(),
      level: 'warn',message: 'Task cancelled by user',metadata: {reason: 'user_cancellation',
        actionsCompleted: task.actionsCompleted,
      },
    });

    // Remove from queue if pending
    const queueIndex = this.taskQueue.indexOf(taskId);
    if (queueIndex >= 0) {
      this.taskQueue.splice(queueIndex, 1);
    }

    this.tasks.set(taskId, task);

    this.logger.log(`Cancelled task: ${taskId}`, {taskId,actionsCompleted: task.actionsCompleted,
      totalActions: task.totalActions,
      executionTimeMs: task.executionTimeMs,
    });
  }

  /**
   * Delete task (cleanup)
   */
  deleteTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    // Only allow deletion of completed, failed, or cancelled tasks
    if (
      task.status === BrowserTaskStatus.RUNNING ||
      task.status === BrowserTaskStatus.PENDING
    ) {
      throw new Error(`Cannot delete task in status: ${task.status}`);}// Remove from queue if present
    const queueIndex = this.taskQueue.indexOf(taskId);
    if (queueIndex >= 0) {
      this.taskQueue.splice(queueIndex, 1);
    }

    // Delete task
    this.tasks.delete(taskId);

    this.logger.log(`Deleted task: ${taskId}`, {taskId,status: task.status,
    });
  }

  /**
   * Get task metrics and statistics
   */
  getTaskMetrics(): {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    runningTasks: number;
    pendingTasks: number;
    cancelledTasks: number;
    averageExecutionTime: number;
    successRate: number;
    queueLength: number;
  } {
    const tasks = Array.from(this.tasks.values());

    const runningTasks = tasks.filter(
      (t) => t.status === BrowserTaskStatus.RUNNING,
    ).length;
    const pendingTasks = tasks.filter(
      (t) => t.status === BrowserTaskStatus.PENDING,
    ).length;
    const cancelledTasks = tasks.filter(
      (t) => t.status === BrowserTaskStatus.CANCELLED,
    ).length;

    const completedOrFailed =
      this.taskMetrics.completedTasks + this.taskMetrics.failedTasks;
    const successRate =
      completedOrFailed > 0
        ? (this.taskMetrics.completedTasks / completedOrFailed) * 100
        : 0;

    return {
      totalTasks: this.taskMetrics.totalTasks,
      completedTasks: this.taskMetrics.completedTasks,
      failedTasks: this.taskMetrics.failedTasks,
      runningTasks,
      pendingTasks,
      cancelledTasks,
      averageExecutionTime: Math.round(this.taskMetrics.averageExecutionTime),
      successRate: Math.round(successRate * 100) / 100,
      queueLength: this.taskQueue.length,
    };
  }

  /**
   * Clean up old completed tasks
   */
  cleanupOldTasks(_maxAge: number): number {
    // 24 hours default
    const now = Date.now();
    let cleanedCount = 0;

    for (const [taskId, task] of Array.from(this.tasks.entries())) {
      // Skip active tasks
      if (
        task.status === BrowserTaskStatus.RUNNING ||
        task.status === BrowserTaskStatus.PENDING
      ) {
        continue;
      }

      // Check age
      const taskAge = task.completedAt
        ? now - task.completedAt.getTime()
        : now - task.startedAt.getTime();

      if (taskAge > _maxAge) {
        this.tasks.delete(taskId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} old tasks`, {cleanedCount,maxAgeHours: _maxAge / (1000 * 60 * 60),
        remainingTasks: this.tasks.size,
      });
    }

    return cleanedCount;
  }

  /**
   * Add task to priority queue
   */
  private addToQueue(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    // Insert based on priority
    const priorityOrder = {
      [BrowserTaskPriority.CRITICAL]: 0,
      [BrowserTaskPriority.HIGH]: 1,
      [BrowserTaskPriority.NORMAL]: 2,
      [BrowserTaskPriority.LOW]: 3,
    };

    const taskPriority = task.metadata?.priority as BrowserTaskPriority ?? BrowserTaskPriority.NORMAL;
    const taskPriorityValue = priorityOrder[taskPriority];
    let insertIndex = this.taskQueue.length;

    // Find correct insertion position
    for (let i = 0; i < this.taskQueue.length; i++) {
      const queuedTaskId = this.taskQueue[i];
      if (!queuedTaskId) continue;
      const queuedTask = this.tasks.get(queuedTaskId);

      if (queuedTask?.metadata?.priority) {
        const queuedPriorityValue =
          priorityOrder[queuedTask.metadata.priority as BrowserTaskPriority];
        if (taskPriorityValue < queuedPriorityValue) {
          insertIndex = i;
          break;
        }
      }
    }

    this.taskQueue.splice(insertIndex, 0, taskId);

    this.logger.log(`Added task to queue: ${taskId}`, {
      taskId,
      priority: taskPriority,
      queuePosition: insertIndex,
      queueLength: this.taskQueue.length,
    });
  }
}
