/**
 * Agent Mock Services - Comprehensive Mocking for Agent Processing
 *
 * Provides comprehensive mock implementations for all agent-related services:
 * - Agent lifecycle management mocks
 * - Message processing pipeline mocks
 * - Task execution and scheduling mocks
 * - Agent communication and coordination mocks
 * - Performance monitoring mocks
 *
 * Features:
 * - Jest-compatible mock patterns with TypeScript support
 * - Configurable mock behaviors for different test scenarios
 * - Performance metrics simulation with realistic timing
 * - Agent state management with lifecycle tracking
 * - Error scenario simulation for resilience testing
 * - Integration with NestJS testing utilities
 *
 * @author Claude Code
 * @version 2.0.0
 */

import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskType,
  MessageRole,
  Message,
} from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import {
  BytebotAgentResponse,
  BytebotAgentService,
  BytebotAgentInterrupt,
} from '../../agent/agent.types';
import {
  MessageContentType,
  TextContentBlock,
  ToolUseContentBlock,
  ToolResultContentBlock,
} from '@bytebot/shared';

// ============================================================================
// Type Interfaces for Mock Safety
// ============================================================================

/**
 * Interface for mock task service methods
 */
interface MockTasksService {
  update: (taskId: string, data: Partial<Task>) => Promise<Task>;
  findNextTask: () => Promise<Task | null>;
}

/**
 * Interface for mock messages service methods
 */
interface MockMessagesService {
  create: (data: Partial<Message>) => Promise<Message>;
  update: (messageId: string, data: Partial<Message>) => Promise<Message>;
}

/**
 * Mock behavior configuration for testing
 */
export interface MockBehaviorConfig {
  // Database-related behavior
  shouldFailConnection?: boolean;
  shouldFailQueries?: boolean;
  connectionDelay?: number;
  queryDelay?: number;

  // Processing-related behavior
  processingDelay?: number;
  shouldFailProcessing?: boolean;
  shouldAbort?: boolean;

  // Generation-related behavior
  shouldFailGeneration?: boolean;
  customResponse?: BytebotAgentResponse;
  generationDelay?: number;
}

// ============================================================================
// Mock Data Factory
// ============================================================================

/**
 * Factory for generating realistic test data
 */
export class AgentMockDataFactory {
  private static taskIdCounter = 1;
  private static messageIdCounter = 1;

  /**
   * Create a mock task with realistic data
   */
  static createMockTask(overrides: Partial<Task> = {}): Task {
    const id = String(this.taskIdCounter++);
    const now = new Date();

    return {
      id,
      description: `Test task ${id} - Processing user request`,
      type: TaskType.IMMEDIATE,
      status: TaskStatus.PENDING,
      priority: TaskPriority.MEDIUM,
      createdAt: now,
      updatedAt: now,
      scheduledFor: null,
      queuedAt: null,
      executedAt: null,
      completedAt: null,
      createdBy: MessageRole.USER,
      model: {
        provider: 'anthropic' as const,
        name: 'claude-3-sonnet-20240229',
        title: 'Claude 3 Sonnet',
        contextWindow: 200000,
      },
      userId: 'test-user-id',
      control: MessageRole.ASSISTANT,
      result: null,
      error: null,
      ...overrides,
    };
  }

  /**
   * Create a mock message with realistic content
   */
  static createMockMessage(overrides: Partial<Message> = {}): Message {
    const id = String(this.messageIdCounter++);
    const now = new Date();

    return {
      id,
      taskId: 'test-task-id',
      role: MessageRole.USER,
      content: [
        {
          type: MessageContentType.Text,
          text: 'This is a test message content',
        } as TextContentBlock,
      ],
      createdAt: now,
      updatedAt: now,
      summaryId: null,
      ...overrides,
    };
  }

  /**
   * Create mock agent response with realistic structure
   */
  static createMockAgentResponse(
    overrides: Partial<BytebotAgentResponse> = {},
  ): BytebotAgentResponse {
    return {
      contentBlocks: [
        {
          type: MessageContentType.Text,
          text: 'I understand your request and will help you with that task.',
        } as TextContentBlock,
      ],
      tokenUsage: {
        inputTokens: 150,
        outputTokens: 75,
        totalTokens: 225,
      },
      ...overrides,
    };
  }

  /**
   * Create mock tool use content block
   */
  static createMockToolUse(
    toolName: string,
    input: Record<string, any> = {},
  ): ToolUseContentBlock {
    return {
      type: MessageContentType.ToolUse,
      id: `tool_use_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: toolName,
      input,
    };
  }

  /**
   * Create mock tool result content block
   */
  static createMockToolResult(
    toolUseId: string,
    isError: boolean = false,
    content: string = 'Tool execution completed successfully',
  ): ToolResultContentBlock {
    return {
      type: MessageContentType.ToolResult,
      tool_use_id: toolUseId,
      is_error: isError,
      content: [
        {
          type: MessageContentType.Text,
          text: content,
        } as TextContentBlock,
      ],
    };
  }

  /**
   * Generate realistic processing delay (for async testing)
   */
  static getRealisticDelay(): number {
    // Simulate realistic AI processing time: 100-2000ms
    return Math.floor(Math.random() * 1900) + 100;
  }
}

// ============================================================================
// Mock Agent Processor
// ============================================================================

/**
 * Mock implementation of AgentProcessor with configurable behavior
 */
export class MockAgentProcessor {
  public readonly logger = new Logger(MockAgentProcessor.name);
  private isProcessing = false;
  private currentTaskId: string | null = null;
  private processingDelay = 100;
  private shouldFailProcessing = false;
  private shouldAbort = false;
  private processedTasks: string[] = [];
  private metrics = {
    totalProcessed: 0,
    successfulProcessing: 0,
    failedProcessing: 0,
    averageProcessingTime: 0,
  };

  constructor(
    private readonly tasksService?: MockTasksService,
    private readonly messagesService?: MockMessagesService,
    private readonly eventEmitter?: EventEmitter2,
  ) {}

  /**
   * Check if processor is currently running
   */
  isRunning(): boolean {
    return this.isProcessing;
  }

  /**
   * Get current task ID being processed
   */
  getCurrentTaskId(): string | null {
    return this.currentTaskId;
  }

  /**
   * Start processing a task (with mock behavior)
   */
  async processTask(taskId: string): Promise<void> {
    if (this.isProcessing) {
      this.logger.warn('AgentProcessor is already processing another task');
      return;
    }

    this.isProcessing = true;
    this.currentTaskId = taskId;
    this.processedTasks.push(taskId);

    const startTime = Date.now();

    try {
      this.logger.log(`Starting mock processing for task ID: ${taskId}`);

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, this.processingDelay));

      // Check for abort signal
      if (this.shouldAbort) {
        throw new BytebotAgentInterrupt();
      }

      // Check for configured failure
      if (this.shouldFailProcessing) {
        throw new Error('Mock processing failure configured');
      }

      // Simulate successful processing
      if (this.tasksService?.update) {
        await this.tasksService.update(taskId, {
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
        });
      }

      this.metrics.totalProcessed++;
      this.metrics.successfulProcessing++;

      const processingTime = Date.now() - startTime;
      this.metrics.averageProcessingTime =
        (this.metrics.averageProcessingTime + processingTime) / 2;

      this.logger.log(`Mock processing completed for task ID: ${taskId}`);
    } catch (error) {
      this.metrics.failedProcessing++;

      if (error instanceof BytebotAgentInterrupt) {
        this.logger.warn(`Mock processing aborted for task ID: ${taskId}`);
      } else {
        this.logger.error(
          `Mock processing failed for task ID: ${taskId}`,
          error,
        );

        if (this.tasksService?.update) {
          await this.tasksService.update(taskId, {
            status: TaskStatus.FAILED,
          });
        }
      }

      throw error;
    } finally {
      this.isProcessing = false;
      this.currentTaskId = null;
    }
  }

  /**
   * Stop processing (mock implementation)
   */
  async stopProcessing(): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    this.logger.log(`Stopping mock execution of task ${this.currentTaskId}`);
    this.shouldAbort = true;

    // Simulate cleanup time
    await new Promise((resolve) => setTimeout(resolve, 50));

    this.isProcessing = false;
    this.currentTaskId = null;
    this.shouldAbort = false;
  }

  /**
   * Mock event handlers
   */
  handleTaskTakeover({ taskId }: { taskId: string }): void {
    this.logger.log(`Mock task takeover event received for task ID: ${taskId}`);

    if (this.currentTaskId === taskId && this.isProcessing) {
      this.shouldAbort = true;
    }
  }

  handleTaskResume({ taskId }: { taskId: string }): void {
    this.logger.log(`Mock task resume event received for task ID: ${taskId}`);

    if (this.currentTaskId === taskId && this.isProcessing) {
      this.shouldAbort = false;
    }
  }

  async handleTaskCancel({ taskId }: { taskId: string }): Promise<void> {
    this.logger.log(`Mock task cancel event received for task ID: ${taskId}`);
    await this.stopProcessing();
  }

  // ========================================================================
  // Configuration Methods for Testing
  // ========================================================================

  /**
   * Configure mock behavior for testing scenarios
   */
  configureMockBehavior(options: {
    processingDelay?: number;
    shouldFailProcessing?: boolean;
    shouldAbort?: boolean;
  }): void {
    if (options.processingDelay !== undefined) {
      this.processingDelay = options.processingDelay;
    }
    if (options.shouldFailProcessing !== undefined) {
      this.shouldFailProcessing = options.shouldFailProcessing;
    }
    if (options.shouldAbort !== undefined) {
      this.shouldAbort = options.shouldAbort;
    }
  }

  /**
   * Get processing metrics for testing validation
   */
  getProcessingMetrics() {
    return {
      ...this.metrics,
      processedTasks: [...this.processedTasks],
      currentlyProcessing: this.isProcessing,
      currentTask: this.currentTaskId,
    };
  }

  /**
   * Reset mock state for clean testing
   */
  resetMockState(): void {
    this.isProcessing = false;
    this.currentTaskId = null;
    this.processingDelay = 100;
    this.shouldFailProcessing = false;
    this.shouldAbort = false;
    this.processedTasks = [];
    this.metrics = {
      totalProcessed: 0,
      successfulProcessing: 0,
      failedProcessing: 0,
      averageProcessingTime: 0,
    };
  }
}

// ============================================================================
// Mock Agent Scheduler
// ============================================================================

/**
 * Mock implementation of AgentScheduler
 */
export class MockAgentScheduler {
  public readonly logger = new Logger(MockAgentScheduler.name);
  private isSchedulerActive = true;
  private scheduledTasksQueue: Task[] = [];
  private cronInterval: NodeJS.Timeout | null = null;
  private schedulingMetrics = {
    tasksScheduled: 0,
    tasksExecuted: 0,
    schedulingErrors: 0,
  };

  constructor(
    private readonly tasksService?: MockTasksService,
    private readonly agentProcessor?: MockAgentProcessor,
  ) {}

  /**
   * Initialize mock scheduler
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Mock AgentScheduler initialized');
    await this.handleCron();
  }

  /**
   * Mock cron handler
   */
  async handleCron(): Promise<void> {
    if (!this.isSchedulerActive) {
      return;
    }

    try {
      const now = new Date();

      // Process scheduled tasks (mock behavior)
      const scheduledTasks = this.scheduledTasksQueue.filter(
        (task) => task.scheduledFor && task.scheduledFor <= now,
      );

      for (const task of scheduledTasks) {
        this.logger.debug(`Mock scheduling task ID: ${task.id}`);

        if (this.tasksService?.update) {
          await this.tasksService.update(task.id, {
            queuedAt: now,
            status: TaskStatus.PENDING,
          });
        }

        this.schedulingMetrics.tasksScheduled++;
      }

      // Remove scheduled tasks from queue
      this.scheduledTasksQueue = this.scheduledTasksQueue.filter(
        (task) => !scheduledTasks.includes(task),
      );

      // Find next task to process (mock behavior)
      if (!this.agentProcessor?.isRunning()) {
        const nextTask = await this.getNextMockTask();

        if (nextTask) {
          if (this.tasksService?.update) {
            await this.tasksService.update(nextTask.id, {
              status: TaskStatus.RUNNING,
              executedAt: new Date(),
            });
          }

          this.logger.debug(`Mock processing task ID: ${nextTask.id}`);

          if (this.agentProcessor) {
            void this.agentProcessor.processTask(nextTask.id);
          }

          this.schedulingMetrics.tasksExecuted++;
        }
      }
    } catch (error) {
      this.schedulingMetrics.schedulingErrors++;
      this.logger.error('Mock cron execution failed', error);
    }
  }

  /**
   * Get next mock task (simulates task service behavior)
   */
  private async getNextMockTask(): Promise<Task | null> {
    // Simulate finding next task
    if (this.scheduledTasksQueue.length > 0) {
      return this.scheduledTasksQueue[0];
    }

    // Create a mock task for testing purposes
    if (this.tasksService?.findNextTask) {
      return await this.tasksService.findNextTask();
    }

    return null;
  }

  /**
   * Add task to mock scheduler queue
   */
  addMockTask(task: Task): void {
    this.scheduledTasksQueue.push(task);
  }

  /**
   * Get scheduling metrics for testing
   */
  getSchedulingMetrics() {
    return {
      ...this.schedulingMetrics,
      queuedTasks: this.scheduledTasksQueue.length,
      isActive: this.isSchedulerActive,
    };
  }

  /**
   * Control scheduler activation for testing
   */
  setSchedulerActive(active: boolean): void {
    this.isSchedulerActive = active;
  }

  /**
   * Reset scheduler state for clean testing
   */
  resetSchedulerState(): void {
    this.isSchedulerActive = true;
    this.scheduledTasksQueue = [];
    this.schedulingMetrics = {
      tasksScheduled: 0,
      tasksExecuted: 0,
      schedulingErrors: 0,
    };

    if (this.cronInterval) {
      clearInterval(this.cronInterval);
      this.cronInterval = null;
    }
  }
}

// ============================================================================
// Mock Agent Services (Anthropic, OpenAI, Google, Proxy)
// ============================================================================

/**
 * Base mock class for agent services
 */
abstract class MockAgentService implements BytebotAgentService {
  protected readonly logger = new Logger(this.constructor.name);
  protected shouldFailGeneration = false;
  protected customResponse: BytebotAgentResponse | null = null;
  protected generationDelay = 500;

  abstract generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string,
    useTools: boolean,
    signal?: AbortSignal,
  ): Promise<BytebotAgentResponse>;

  /**
   * Configure mock behavior
   */
  configureMockBehavior(options: {
    shouldFailGeneration?: boolean;
    customResponse?: BytebotAgentResponse;
    generationDelay?: number;
  }): void {
    if (options.shouldFailGeneration !== undefined) {
      this.shouldFailGeneration = options.shouldFailGeneration;
    }
    if (options.customResponse !== undefined) {
      this.customResponse = options.customResponse;
    }
    if (options.generationDelay !== undefined) {
      this.generationDelay = options.generationDelay;
    }
  }

  /**
   * Reset mock state
   */
  resetMockState(): void {
    this.shouldFailGeneration = false;
    this.customResponse = null;
    this.generationDelay = 500;
  }
}

/**
 * Mock Agent Anthropic Service
 */
export class MockAgentAnthropicService extends MockAgentService {
  async generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string,
    useTools: boolean,
    signal?: AbortSignal,
  ): Promise<BytebotAgentResponse> {
    this.logger.debug(`Mock Anthropic generation for model: ${model}`);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, this.generationDelay));

    // Check for abort signal
    if (signal?.aborted) {
      throw new BytebotAgentInterrupt();
    }

    // Check for configured failure
    if (this.shouldFailGeneration) {
      throw new Error('Mock Anthropic generation failure');
    }

    // Return custom response if configured
    if (this.customResponse) {
      return this.customResponse;
    }

    // Return default mock response
    return AgentMockDataFactory.createMockAgentResponse({
      contentBlocks: [
        {
          type: MessageContentType.Text,
          text: `Mock Anthropic response using ${model}. System prompt: "${systemPrompt.substring(0, 50)}...". Tools enabled: ${useTools}`,
        } as TextContentBlock,
      ],
      tokenUsage: {
        inputTokens: 200 + messages.length * 50,
        outputTokens: 100,
        totalTokens: 300 + messages.length * 50,
      },
    });
  }
}

/**
 * Mock OpenAI Service
 */
export class MockAgentOpenAIService extends MockAgentService {
  async generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string,
    useTools: boolean,
    signal?: AbortSignal,
  ): Promise<BytebotAgentResponse> {
    this.logger.debug(`Mock OpenAI generation for model: ${model}`);

    await new Promise((resolve) => setTimeout(resolve, this.generationDelay));

    if (signal?.aborted) {
      throw new BytebotAgentInterrupt();
    }

    if (this.shouldFailGeneration) {
      throw new Error('Mock OpenAI generation failure');
    }

    if (this.customResponse) {
      return this.customResponse;
    }

    return AgentMockDataFactory.createMockAgentResponse({
      contentBlocks: [
        {
          type: MessageContentType.Text,
          text: `Mock OpenAI response using ${model}. System prompt processed. Tools: ${useTools ? 'enabled' : 'disabled'}`,
        } as TextContentBlock,
      ],
      tokenUsage: {
        inputTokens: 180 + messages.length * 45,
        outputTokens: 90,
        totalTokens: 270 + messages.length * 45,
      },
    });
  }
}

/**
 * Mock Agent Google Service
 */
export class MockAgentGoogleService extends MockAgentService {
  async generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string,
    useTools: boolean,
    signal?: AbortSignal,
  ): Promise<BytebotAgentResponse> {
    this.logger.debug(`Mock Google generation for model: ${model}`);

    await new Promise((resolve) => setTimeout(resolve, this.generationDelay));

    if (signal?.aborted) {
      throw new BytebotAgentInterrupt();
    }

    if (this.shouldFailGeneration) {
      throw new Error('Mock Google generation failure');
    }

    if (this.customResponse) {
      return this.customResponse;
    }

    return AgentMockDataFactory.createMockAgentResponse({
      contentBlocks: [
        {
          type: MessageContentType.Text,
          text: `Mock Google response using ${model}. Processing complete with ${useTools ? 'tool support' : 'text only'}.`,
        } as TextContentBlock,
      ],
      tokenUsage: {
        inputTokens: 160 + messages.length * 40,
        outputTokens: 80,
        totalTokens: 240 + messages.length * 40,
      },
    });
  }
}

/**
 * Mock Proxy Service
 */
export class MockProxyService extends MockAgentService {
  async generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string,
    useTools: boolean,
    signal?: AbortSignal,
  ): Promise<BytebotAgentResponse> {
    this.logger.debug(`Mock Proxy generation for model: ${model}`);

    await new Promise((resolve) => setTimeout(resolve, this.generationDelay));

    if (signal?.aborted) {
      throw new BytebotAgentInterrupt();
    }

    if (this.shouldFailGeneration) {
      throw new Error('Mock Proxy generation failure');
    }

    if (this.customResponse) {
      return this.customResponse;
    }

    return AgentMockDataFactory.createMockAgentResponse({
      contentBlocks: [
        {
          type: MessageContentType.Text,
          text: `Mock Proxy response for ${model}. Proxy routing successful. Tools: ${useTools}`,
        } as TextContentBlock,
      ],
      tokenUsage: {
        inputTokens: 170 + messages.length * 42,
        outputTokens: 85,
        totalTokens: 255 + messages.length * 42,
      },
    });
  }
}

// ============================================================================
// Mock Input Capture Service
// ============================================================================

/**
 * Mock implementation of InputCaptureService
 */
export class MockInputCaptureService {
  public readonly logger = new Logger(MockInputCaptureService.name);
  private isCapturing = false;
  private currentTaskId: string | null = null;
  private capturedInputs: Array<{
    taskId: string;
    input: unknown;
    timestamp: Date;
  }> = [];

  /**
   * Start capturing input for a task
   */
  start(taskId: string): void {
    this.logger.log(`Mock input capture started for task: ${taskId}`);
    this.isCapturing = true;
    this.currentTaskId = taskId;
  }

  /**
   * Stop capturing input
   */
  stop(): void {
    this.logger.log(
      `Mock input capture stopped for task: ${this.currentTaskId}`,
    );
    this.isCapturing = false;
    this.currentTaskId = null;
  }

  /**
   * Simulate capturing input
   */
  captureInput(input: unknown): void {
    if (this.isCapturing && this.currentTaskId) {
      this.capturedInputs.push({
        taskId: this.currentTaskId,
        input,
        timestamp: new Date(),
      });
      this.logger.debug(`Mock input captured for task: ${this.currentTaskId}`);
    }
  }

  /**
   * Get captured inputs for testing
   */
  getCapturedInputs(taskId?: string) {
    if (taskId) {
      return this.capturedInputs.filter((capture) => capture.taskId === taskId);
    }
    return [...this.capturedInputs];
  }

  /**
   * Check if currently capturing
   */
  isCurrentlyCapturing(): boolean {
    return this.isCapturing;
  }

  /**
   * Reset capture state
   */
  resetCaptureState(): void {
    this.isCapturing = false;
    this.currentTaskId = null;
    this.capturedInputs = [];
  }
}

// ============================================================================
// Jest Mock Factories
// ============================================================================

/**
 * Create complete mock AgentProcessor for Jest tests
 */
export const createMockAgentProcessor = (
  mockServices: {
    tasksService?: MockTasksService;
    messagesService?: MockMessagesService;
    eventEmitter?: EventEmitter2;
  } = {},
) => {
  const mockProcessor = new MockAgentProcessor(
    mockServices.tasksService,
    mockServices.messagesService,
    mockServices.eventEmitter,
  );

  return {
    isRunning: jest.fn().mockImplementation(() => mockProcessor.isRunning()),
    getCurrentTaskId: jest
      .fn()
      .mockImplementation(() => mockProcessor.getCurrentTaskId()),
    processTask: jest
      .fn()
      .mockImplementation((taskId: string) =>
        mockProcessor.processTask(taskId),
      ),
    stopProcessing: jest
      .fn()
      .mockImplementation(() => mockProcessor.stopProcessing()),
    handleTaskTakeover: jest
      .fn()
      .mockImplementation((event: { taskId: string }) =>
        mockProcessor.handleTaskTakeover(event),
      ),
    handleTaskResume: jest
      .fn()
      .mockImplementation((event: { taskId: string }) =>
        mockProcessor.handleTaskResume(event),
      ),
    handleTaskCancel: jest
      .fn()
      .mockImplementation((event: { taskId: string }) =>
        mockProcessor.handleTaskCancel(event),
      ),

    // Expose mock-specific methods for testing
    configureMockBehavior: (options: MockBehaviorConfig) =>
      mockProcessor.configureMockBehavior(options),
    getProcessingMetrics: () => mockProcessor.getProcessingMetrics(),
    resetMockState: () => mockProcessor.resetMockState(),
  };
};

/**
 * Create complete mock AgentScheduler for Jest tests
 */
export const createMockAgentScheduler = (
  mockServices: {
    tasksService?: MockTasksService;
    agentProcessor?: MockAgentProcessor;
  } = {},
) => {
  const mockScheduler = new MockAgentScheduler(
    mockServices.tasksService,
    mockServices.agentProcessor,
  );

  return {
    onModuleInit: jest
      .fn()
      .mockImplementation(() => mockScheduler.onModuleInit()),
    handleCron: jest.fn().mockImplementation(() => mockScheduler.handleCron()),

    // Expose mock-specific methods for testing
    addMockTask: (task: Task) => mockScheduler.addMockTask(task),
    getSchedulingMetrics: () => mockScheduler.getSchedulingMetrics(),
    setSchedulerActive: (active: boolean) =>
      mockScheduler.setSchedulerActive(active),
    resetSchedulerState: () => mockScheduler.resetSchedulerState(),
  };
};

/**
 * Create mock agent services with configurable behavior
 */
export const createMockAgentServices = () => {
  const anthropicService = new MockAgentAnthropicService();
  const openaiService = new MockAgentOpenAIService();
  const googleService = new MockAgentGoogleService();
  const proxyService = new MockProxyService();

  return {
    anthropic: {
      generateMessage: jest
        .fn()
        .mockImplementation(
          (
            systemPrompt: string,
            messages: Message[],
            model: string,
            useTools: boolean,
            signal?: AbortSignal,
          ) =>
            anthropicService.generateMessage(
              systemPrompt,
              messages,
              model,
              useTools,
              signal,
            ),
        ),
      configureMockBehavior: (options: MockBehaviorConfig) =>
        anthropicService.configureMockBehavior(options),
      resetMockState: () => anthropicService.resetMockState(),
    },
    openai: {
      generateMessage: jest
        .fn()
        .mockImplementation(
          (
            systemPrompt: string,
            messages: Message[],
            model: string,
            useTools: boolean,
            signal?: AbortSignal,
          ) =>
            openaiService.generateMessage(
              systemPrompt,
              messages,
              model,
              useTools,
              signal,
            ),
        ),
      configureMockBehavior: (options: MockBehaviorConfig) =>
        openaiService.configureMockBehavior(options),
      resetMockState: () => openaiService.resetMockState(),
    },
    google: {
      generateMessage: jest
        .fn()
        .mockImplementation(
          (
            systemPrompt: string,
            messages: Message[],
            model: string,
            useTools: boolean,
            signal?: AbortSignal,
          ) =>
            googleService.generateMessage(
              systemPrompt,
              messages,
              model,
              useTools,
              signal,
            ),
        ),
      configureMockBehavior: (options: MockBehaviorConfig) =>
        googleService.configureMockBehavior(options),
      resetMockState: () => googleService.resetMockState(),
    },
    proxy: {
      generateMessage: jest
        .fn()
        .mockImplementation(
          (
            systemPrompt: string,
            messages: Message[],
            model: string,
            useTools: boolean,
            signal?: AbortSignal,
          ) =>
            proxyService.generateMessage(
              systemPrompt,
              messages,
              model,
              useTools,
              signal,
            ),
        ),
      configureMockBehavior: (options: MockBehaviorConfig) =>
        proxyService.configureMockBehavior(options),
      resetMockState: () => proxyService.resetMockState(),
    },
  };
};

/**
 * Create mock InputCaptureService for Jest tests
 */
export const createMockInputCaptureService = () => {
  const mockService = new MockInputCaptureService();

  return {
    start: jest
      .fn()
      .mockImplementation((taskId: string) => mockService.start(taskId)),
    stop: jest.fn().mockImplementation(() => mockService.stop()),
    captureInput: jest
      .fn()
      .mockImplementation((input: unknown) => mockService.captureInput(input)),

    // Expose mock-specific methods for testing
    getCapturedInputs: (taskId?: string) =>
      mockService.getCapturedInputs(taskId),
    isCurrentlyCapturing: () => mockService.isCurrentlyCapturing(),
    resetCaptureState: () => mockService.resetCaptureState(),
  };
};

// ============================================================================
// Integration Helpers
// ============================================================================

/**
 * Create complete mock agent ecosystem for integration testing
 */
export const createMockAgentEcosystem = (
  mockDependencies: {
    tasksService?: MockTasksService;
    messagesService?: MockMessagesService;
    summariesService?: unknown;
    eventEmitter?: EventEmitter2;
  } = {},
) => {
  const agentServices = createMockAgentServices();
  const inputCaptureService = createMockInputCaptureService();
  const agentProcessor = createMockAgentProcessor({
    tasksService: mockDependencies.tasksService,
    messagesService: mockDependencies.messagesService,
    eventEmitter: mockDependencies.eventEmitter,
  });
  const agentScheduler = createMockAgentScheduler({
    tasksService: mockDependencies.tasksService,
    agentProcessor: agentProcessor as unknown as MockAgentProcessor,
  });

  return {
    services: agentServices,
    inputCapture: inputCaptureService,
    processor: agentProcessor,
    scheduler: agentScheduler,
    dataFactory: AgentMockDataFactory,

    // Utility methods for ecosystem management
    configureEcosystem: (config: {
      processingDelay?: number;
      generationDelay?: number;
      shouldFailProcessing?: boolean;
      shouldFailGeneration?: boolean;
    }) => {
      agentProcessor.configureMockBehavior({
        processingDelay: config.processingDelay,
        shouldFailProcessing: config.shouldFailProcessing,
      } as MockBehaviorConfig);

      Object.values(agentServices).forEach((service) => {
        service.configureMockBehavior({
          generationDelay: config.generationDelay,
          shouldFailGeneration: config.shouldFailGeneration,
        } as MockBehaviorConfig);
      });
    },

    resetEcosystem: () => {
      agentProcessor.resetMockState();
      agentScheduler.resetSchedulerState();
      inputCaptureService.resetCaptureState();
      Object.values(agentServices).forEach((service) =>
        service.resetMockState(),
      );
    },
  };
};

/**
 * Performance testing utilities for agent mocks
 */
export const AgentMockPerformanceUtils = {
  /**
   * Simulate high-load processing scenario
   */
  async simulateHighLoad(
    ecosystem: ReturnType<typeof createMockAgentEcosystem>,
    taskCount: number = 100,
  ): Promise<{
    totalTime: number;
    averageTimePerTask: number;
    successRate: number;
    tasksProcessed: number;
  }> {
    const startTime = Date.now();
    const tasks = Array.from({ length: taskCount }, (_, i) =>
      AgentMockDataFactory.createMockTask({ id: `load-test-${i}` }),
    );

    let successCount = 0;

    // Process tasks concurrently
    await Promise.allSettled(
      tasks.map(async (task) => {
        try {
          await ecosystem.processor.processTask(task.id);
          successCount++;
        } catch {
          // Expected for some scenarios
        }
      }),
    );

    const totalTime = Date.now() - startTime;
    const metrics = ecosystem.processor.getProcessingMetrics();

    return {
      totalTime,
      averageTimePerTask: totalTime / taskCount,
      successRate: successCount / taskCount,
      tasksProcessed: metrics.totalProcessed,
    };
  },

  /**
   * Memory usage simulation for large datasets
   */
  simulateMemoryPressure(
    ecosystem: ReturnType<typeof createMockAgentEcosystem>,
  ) {
    // Simulate processing large messages and responses
    const largeMessages = Array.from({ length: 1000 }, () =>
      AgentMockDataFactory.createMockMessage({
        content: [
          {
            type: MessageContentType.Text,
            text: 'Large test message content '.repeat(100),
          } as TextContentBlock,
        ],
      }),
    );

    // Configure services to return large responses
    Object.values(ecosystem.services).forEach((service) => {
      service.configureMockBehavior({
        customResponse: AgentMockDataFactory.createMockAgentResponse({
          contentBlocks: Array.from(
            { length: 10 },
            () =>
              ({
                type: MessageContentType.Text,
                text: 'Large response content '.repeat(50),
              }) as TextContentBlock,
          ),
          tokenUsage: {
            inputTokens: 10000,
            outputTokens: 5000,
            totalTokens: 15000,
          },
        }),
      });
    });

    return {
      largeMessages,
      cleanup: () => {
        Object.values(ecosystem.services).forEach((service) =>
          service.resetMockState(),
        );
      },
    };
  },
};
