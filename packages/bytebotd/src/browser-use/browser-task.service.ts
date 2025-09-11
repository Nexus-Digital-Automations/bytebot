import { Injectable, Logger } from '@nestjs/common';
import { v4 as _uuidv4 } from 'uuid';
import {
  BrowserTaskResultDto,
  BrowserTaskStatus,
  BrowserTaskPriority,
} from './dto/browser-task.dto';

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
  async createTask(taskData: {
    taskId: string;
    name: string;
    description: string;
    actions: any[];
    priority?: BrowserTaskPriority;
    sessionConfig?: any;
    maxExecutionTimeMs?: number;
    metadata?: Record<string, any>;
    enableLogging?: boolean;
    continueOnError?: boolean;
    status: BrowserTaskStatus;
    startedAt: Date;
    actionsCompleted: number;
    totalActions: number;
    logs: any[];
  }): Promise<BrowserTaskResultDto> {
    const task: BrowserTaskResultDto = {
      taskId: taskData.taskId,
      status: taskData.status,
      startedAt: taskData.startedAt,
      executionTimeMs: 0,
      actionsCompleted: taskData.actionsCompleted,
      totalActions: taskData.totalActions,
      logs: taskData.logs,
      metadata: {
        ...taskData.metadata,
        name: taskData.name,
        description: taskData.description,
        priority: taskData.priority || BrowserTaskPriority.NORMAL,
        maxExecutionTimeMs: taskData.maxExecutionTimeMs || 300000,
        enableLogging: taskData.enableLogging ?? true,
        continueOnError: taskData.continueOnError ?? false,
        createdAt: new Date(),
      },
    };

    // Store task
    this.tasks.set(taskData.taskId, task);
    this.taskMetrics.totalTasks++;

    // Add to queue if needed
    if (taskData.status === BrowserTaskStatus.PENDING) {
      this.addToQueue(
        taskData.taskId,
        taskData.priority || BrowserTaskPriority.NORMAL,
      );
    }

    this.logger.log(`Created browser task: ${taskData.taskId}`, {
      taskId: taskData.taskId,
      name: taskData.name,
      totalActions: taskData.totalActions,
      priority: taskData.priority,
      status: taskData.status,
    });

    return task;
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: string): Promise<BrowserTaskResultDto | null> {
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
  async getAllTasks(): Promise<BrowserTaskResultDto[]> {
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
  async updateTaskStatus(
    taskId: string,
    updates: {
      status?: BrowserTaskStatus;
      completedAt?: Date;
      executionTimeMs?: number;
      extractedData?: Record<string, any>;
      screenshots?: string[];
      logs?: any[];
      errorMessage?: string;
      errorDetails?: Record<string, any>;
    },
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Update task fields
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
  async updateTaskProgress(
    taskId: string,
    progress: {
      actionsCompleted?: number;
      currentStep?: string;
      progress?: number;
    },
  ): Promise<void> {
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

    this.logger.debug(`Updated task progress: ${taskId}`, {
      taskId,
      actionsCompleted: task.actionsCompleted,
      totalActions: task.totalActions,
      progress: progress.progress,
    });
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(
    status: BrowserTaskStatus,
  ): Promise<BrowserTaskResultDto[]> {
    const tasks = Array.from(this.tasks.values()).filter(
      (task) => task.status === status,
    );

    // Update execution times for running tasks
    if (status === BrowserTaskStatus.RUNNING) {
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
  async getNextQueuedTask(): Promise<BrowserTaskResultDto | null> {
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

    this.logger.log(`Started queued task: ${taskId}`, {
      taskId,
      queuePosition: 0,
      remainingInQueue: this.taskQueue.length,
    });

    return task;
  }

  /**
   * Cancel task
   */
  async cancelTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (
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
      level: 'warn',
      message: 'Task cancelled by user',
      metadata: {
        reason: 'user_cancellation',
        actionsCompleted: task.actionsCompleted,
      },
    });

    // Remove from queue if pending
    const queueIndex = this.taskQueue.indexOf(taskId);
    if (queueIndex >= 0) {
      this.taskQueue.splice(queueIndex, 1);
    }

    this.tasks.set(taskId, task);

    this.logger.log(`Cancelled task: ${taskId}`, {
      taskId,
      actionsCompleted: task.actionsCompleted,
      totalActions: task.totalActions,
      executionTimeMs: task.executionTimeMs,
    });
  }

  /**
   * Delete task (cleanup)
   */
  async deleteTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return;
    }

    // Only allow deletion of completed, failed, or cancelled tasks
    if (
      task.status === BrowserTaskStatus.RUNNING ||
      task.status === BrowserTaskStatus.PENDING
    ) {
      throw new Error(`Cannot delete task in status: ${task.status}`);
    }

    // Remove from queue if present
    const queueIndex = this.taskQueue.indexOf(taskId);
    if (queueIndex >= 0) {
      this.taskQueue.splice(queueIndex, 1);
    }

    // Delete task
    this.tasks.delete(taskId);

    this.logger.log(`Deleted task: ${taskId}`, {
      taskId,
      status: task.status,
    });
  }

  /**
   * Get task metrics and statistics
   */
  async getTaskMetrics(): Promise<{
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    runningTasks: number;
    pendingTasks: number;
    cancelledTasks: number;
    averageExecutionTime: number;
    successRate: number;
    queueLength: number;
  }> {
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
  async cleanupOldTasks(maxAge: number = 86400000): Promise<number> {
    // 24 hours default
    const now = Date.now();
    let cleanedCount = 0;

    for (const [taskId, task] of this.tasks.entries()) {
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

      if (taskAge > maxAge) {
        this.tasks.delete(taskId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} old tasks`, {
        cleanedCount,
        maxAgeHours: maxAge / (1000 * 60 * 60),
        remainingTasks: this.tasks.size,
      });
    }

    return cleanedCount;
  }

  /**
   * Add task to priority queue
   */
  private addToQueue(taskId: string, priority: BrowserTaskPriority): void {
    // Insert based on priority
    const priorityOrder = {
      [BrowserTaskPriority.CRITICAL]: 0,
      [BrowserTaskPriority.HIGH]: 1,
      [BrowserTaskPriority.NORMAL]: 2,
      [BrowserTaskPriority.LOW]: 3,
    };

    const taskPriorityValue = priorityOrder[priority];
    let insertIndex = this.taskQueue.length;

    // Find correct insertion position
    for (let i = 0; i < this.taskQueue.length; i++) {
      const queuedTaskId = this.taskQueue[i];
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
      priority,
      queuePosition: insertIndex,
      queueLength: this.taskQueue.length,
    });
  }
}
