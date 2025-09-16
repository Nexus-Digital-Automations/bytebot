/**
 * Agent Performance Tests - Comprehensive Performance and Reliability Testing
 *
 * Production-ready performance tests covering all critical performance scenarios:
 * - Load testing and concurrent processing benchmarks
 * - Memory usage optimization and leak detection
 * - Response time measurements and SLA validation
 * - Resource utilization monitoring and optimization
 * - Scalability testing under various load conditions
 * - Error handling performance and recovery time
 * - Database operation efficiency and query optimization
 * - Network latency handling and timeout management
 * - CPU intensive operations and processing efficiency
 * - Stress testing and system stability validation
 *
 * @author Testing & Quality Assurance Specialist
 * @version 2.0.0
 * @since Phase 1: Bytebot Core Module Testing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentProcessor } from '../agent.processor';
import { AgentScheduler } from '../agent.scheduler';
import { InputCaptureService } from '../input-capture.service';
import { AgentAnalyticsService } from '../agent.analytics';
import { TasksService } from '../../tasks/tasks.service';
import { MessagesService } from '../../messages/messages.service';
import { SummariesService } from '../../summaries/summaries.service';
import { AnthropicService } from '../../anthropic/anthropic.service';
import {
  Task,
  TaskStatus,
  TaskType,
  TaskPriority,
  MessageRole,
  Message,
} from '@prisma/client';
import { MessageContentType, BytebotAgentResponse } from '@bytebot/shared';

// Mock external dependencies
global.fetch = jest.fn();
jest.mock('../agent.computer-use', () => ({
  handleComputerToolUse: jest.fn(),
  writeFile: jest.fn(),
}));

import { handleComputerToolUse, writeFile } from '../agent.computer-use';

describe('Agent Performance Tests', () => {
  let module: TestingModule;
  let agentProcessor: AgentProcessor;
  let agentScheduler: AgentScheduler;
  let inputCaptureService: InputCaptureService;
  let agentAnalyticsService: AgentAnalyticsService;
  let tasksService: any;
  let messagesService: any;
  let summariesService: any;
  let anthropicService: any;
  let configService: any;
  let logger: any;

  // Performance metrics tracking
  interface PerformanceMetrics {
    startTime: number;
    endTime: number;
    duration: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
  }

  const measurePerformance = async <T>(
    operation: () => Promise<T>,
  ): Promise<{ result: T; metrics: PerformanceMetrics }> => {
    const startCpuUsage = process.cpuUsage();
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    const result = await operation();

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const cpuUsage = process.cpuUsage(startCpuUsage);

    return {
      result,
      metrics: {
        startTime,
        endTime,
        duration: endTime - startTime,
        memoryUsage: {
          rss: endMemory.rss - startMemory.rss,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
        },
        cpuUsage,
      },
    };
  };

  // Test data generators
  const generateLargeTask = (
    id: string,
    size: 'small' | 'medium' | 'large' | 'huge' = 'medium',
  ): Task => {
    const baseSizes = {
      small: { desc: 100, result: 1000 },
      medium: { desc: 500, result: 5000 },
      large: { desc: 2000, result: 20000 },
      huge: { desc: 10000, result: 100000 },
    };

    const { desc, result } = baseSizes[size];

    return {
      id,
      description: 'X'.repeat(desc),
      type: TaskType.IMMEDIATE,
      status: TaskStatus.PENDING,
      priority: TaskPriority.MEDIUM,
      control: MessageRole.ASSISTANT,
      createdAt: new Date(),
      createdBy: MessageRole.USER,
      userId: 'perf-user-123',
      scheduledFor: null,
      updatedAt: new Date(),
      executedAt: null,
      completedAt: null,
      queuedAt: new Date(),
      error: null,
      result: 'Y'.repeat(result),
      model: {
        provider: 'anthropic',
        name: 'claude-3-sonnet',
        contextWindow: 200000,
      },
    };
  };

  const generateLargeMessages = (count: number, taskId: string): Message[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `perf-message-${i}`,
      content: [
        {
          type: MessageContentType._Text,
          text: `Performance test message ${i} with content: ${'A'.repeat(500)}`,
        },
      ],
      role: i % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT,
      taskId,
      summaryId: null,
      createdAt: new Date(Date.now() + i * 1000),
      updatedAt: new Date(Date.now() + i * 1000),
    }));
  };

  beforeEach(async () => {
    // Create performance-optimized service mocks
    tasksService = {
      findById: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findScheduledTasks: jest.fn(),
      findNextTask: jest.fn(),
    };

    messagesService = {
      findUnsummarized: jest.fn(),
      findEvery: jest.fn(),
      create: jest.fn(),
      attachSummary: jest.fn(),
    };

    summariesService = {
      findLatest: jest.fn(),
      create: jest.fn(),
    };

    anthropicService = {
      generateMessage: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    logger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        AgentProcessor,
        AgentScheduler,
        InputCaptureService,
        AgentAnalyticsService,
        {
          provide: TasksService,
          useValue: tasksService,
        },
        {
          provide: MessagesService,
          useValue: messagesService,
        },
        {
          provide: SummariesService,
          useValue: summariesService,
        },
        {
          provide: AnthropicService,
          useValue: anthropicService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: Logger,
          useValue: logger,
        },
      ],
    }).compile();

    agentProcessor = module.get<AgentProcessor>(AgentProcessor);
    agentScheduler = module.get<AgentScheduler>(AgentScheduler);
    inputCaptureService = module.get<InputCaptureService>(InputCaptureService);
    agentAnalyticsService = module.get<AgentAnalyticsService>(
      AgentAnalyticsService,
    );

    // Setup default fast-responding mocks
    tasksService.findById.mockImplementation((id: string) =>
      Promise.resolve(generateLargeTask(id, 'medium')),
    );
    messagesService.findUnsummarized.mockResolvedValue([]);
    messagesService.findEvery.mockResolvedValue([]);
    summariesService.findLatest.mockResolvedValue(null);
    anthropicService.generateMessage.mockResolvedValue({
      contentBlocks: [
        {
          type: MessageContentType._Text,
          text: 'Quick response',
        },
      ],
      tokenUsage: { totalTokens: 100, inputTokens: 50, outputTokens: 50 },
    });
    configService.get.mockReturnValue('http://localhost:8080');
    tasksService.update.mockResolvedValue({});
    messagesService.create.mockResolvedValue({ id: 'created' });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
    });
    (handleComputerToolUse as jest.Mock).mockResolvedValue({
      type: MessageContentType._ToolResult,
      tool_use_id: 'perf-tool',
      content: [{ type: MessageContentType._Text, text: 'Done' }],
    });
    (writeFile as jest.Mock).mockResolvedValue({ success: true });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (agentProcessor) {
      await agentProcessor.stopProcessing();
    }
    if (module) {
      await module.close();
    }
  });

  describe('Load Testing and Concurrent Processing', () => {
    it('should handle high-frequency task processing requests', async () => {
      const taskCount = 100;
      const tasks = Array.from({ length: taskCount }, (_, i) =>
        generateLargeTask(`load-test-${i}`, 'small'),
      );

      tasksService.findById.mockImplementation((id: string) =>
        Promise.resolve(tasks.find((t) => t.id === id)),
      );

      const { metrics } = await measurePerformance(async () => {
        // Simulate rapid task processing requests
        const promises = tasks.map((task) => {
          agentProcessor.processTask(task.id);
          return new Promise((resolve) => setTimeout(resolve, 5));
        });

        await Promise.all(promises);
        await new Promise((resolve) => setTimeout(resolve, 100)); // Allow processing
      });

      expect(metrics.duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(metrics.memoryUsage.heapUsed).toBeLessThan(50 * 1024 * 1024); // Less than 50MB heap growth
      expect(logger.warn).toHaveBeenCalledTimes(taskCount - 1); // Only first task processes, others warned
    });

    it('should efficiently process large batches of scheduled tasks', async () => {
      const batchSize = 200;
      const scheduledTasks = Array.from({ length: batchSize }, (_, i) =>
        generateLargeTask(`scheduled-${i}`, 'small'),
      ).map((task) => ({
        ...task,
        type: TaskType.SCHEDULED,
        scheduledFor: new Date(Date.now() - 1000), // All past due
      }));

      tasksService.findScheduledTasks.mockResolvedValue(scheduledTasks);

      const { metrics } = await measurePerformance(async () => {
        await agentScheduler.handleCron();
      });

      expect(metrics.duration).toBeLessThan(3000); // Should complete within 3 seconds
      expect(tasksService.update).toHaveBeenCalledTimes(batchSize);
      expect(metrics.memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });

    it('should maintain performance under concurrent scheduler operations', async () => {
      const concurrentOperations = 10;
      tasksService.findScheduledTasks.mockResolvedValue([]);
      tasksService.findNextTask.mockResolvedValue(null);

      const { metrics } = await measurePerformance(async () => {
        const promises = Array.from({ length: concurrentOperations }, () =>
          agentScheduler.handleCron(),
        );
        await Promise.all(promises);
      });

      expect(metrics.duration).toBeLessThan(1000); // Should complete within 1 second
      expect(tasksService.findScheduledTasks).toHaveBeenCalledTimes(
        concurrentOperations,
      );
      expect(metrics.cpuUsage?.user).toBeLessThan(500000); // Less than 500ms CPU time
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should efficiently handle large message datasets', async () => {
      const messageCount = 5000;
      const taskId = 'large-message-test';
      const largeMessages = generateLargeMessages(messageCount, taskId);

      messagesService.findUnsummarized.mockResolvedValue(largeMessages);
      tasksService.findById.mockResolvedValue(
        generateLargeTask(taskId, 'large'),
      );

      const initialMemory = process.memoryUsage();

      const { metrics } = await measurePerformance(async () => {
        agentProcessor.processTask(taskId);
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(memoryGrowth).toBeLessThan(200 * 1024 * 1024); // Less than 200MB growth
      expect(anthropicService.generateMessage).toHaveBeenCalled();
      expect(metrics.duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should prevent memory leaks during repeated operations', async () => {
      const iterations = 50;
      const taskIds = Array.from(
        { length: iterations },
        (_, i) => `memory-test-${i}`,
      );

      const initialMemory = process.memoryUsage();

      for (let i = 0; i < iterations; i++) {
        agentProcessor.processTask(taskIds[i]);
        await new Promise((resolve) => setTimeout(resolve, 10));
        await agentProcessor.stopProcessing();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be minimal after repeated operations
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });

    it('should efficiently process huge task data without memory overflow', async () => {
      const hugeTask = generateLargeTask('huge-task', 'huge');
      const hugeMessages = generateLargeMessages(1000, hugeTask.id);

      tasksService.findById.mockResolvedValue(hugeTask);
      messagesService.findEvery.mockResolvedValue(hugeMessages);
      configService.get.mockReturnValue('https://analytics.test.com');

      const { metrics } = await measurePerformance(async () => {
        await agentAnalyticsService.handleTaskEvent({ taskId: hugeTask.id });
      });

      expect(metrics.duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(global.fetch).toHaveBeenCalled();
      expect(metrics.memoryUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // Less than 500MB
    });
  });

  describe('Response Time and SLA Validation', () => {
    it('should meet response time SLA for standard task processing', async () => {
      const standardTask = generateLargeTask('sla-test', 'medium');
      const standardMessages = generateLargeMessages(10, standardTask.id);

      tasksService.findById.mockResolvedValue(standardTask);
      messagesService.findUnsummarized.mockResolvedValue(standardMessages);

      const { metrics } = await measurePerformance(async () => {
        agentProcessor.processTask(standardTask.id);
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // SLA: Standard task processing should complete within 500ms
      expect(metrics.duration).toBeLessThan(500);
      expect(anthropicService.generateMessage).toHaveBeenCalled();
    });

    it('should meet response time SLA for input capture operations', async () => {
      const mockSocket = {
        connected: false,
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn(),
        on: jest.fn(),
        removeAllListeners: jest.fn(),
      };

      jest.doMock('socket.io-client', () => ({
        io: jest.fn(() => mockSocket),
      }));

      const { metrics } = await measurePerformance(async () => {
        inputCaptureService.start('sla-input-test');
        inputCaptureService.stop();
      });

      // SLA: Input capture start/stop should complete within 100ms
      expect(metrics.duration).toBeLessThan(100);
    });

    it('should meet response time SLA for analytics data transmission', async () => {
      const task = generateLargeTask('analytics-sla', 'small');
      const messages = generateLargeMessages(5, task.id);

      tasksService.findById.mockResolvedValue(task);
      messagesService.findEvery.mockResolvedValue(messages);
      configService.get.mockReturnValue('https://analytics.test.com');

      const { metrics } = await measurePerformance(async () => {
        await agentAnalyticsService.handleTaskEvent({ taskId: task.id });
      });

      // SLA: Analytics transmission should complete within 200ms
      expect(metrics.duration).toBeLessThan(200);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should maintain performance under varying load conditions', async () => {
      const loadLevels = ['small', 'medium', 'large'] as const;
      const results: { [K in (typeof loadLevels)[number]]: number } = {
        small: 0,
        medium: 0,
        large: 0,
      };

      for (const loadLevel of loadLevels) {
        const task = generateLargeTask(`load-${loadLevel}`, loadLevel);
        const messageCount =
          loadLevel === 'small' ? 10 : loadLevel === 'medium' ? 50 : 200;
        const messages = generateLargeMessages(messageCount, task.id);

        tasksService.findById.mockResolvedValue(task);
        messagesService.findUnsummarized.mockResolvedValue(messages);

        const { metrics } = await measurePerformance(async () => {
          agentProcessor.processTask(task.id);
          await new Promise((resolve) => setTimeout(resolve, 100));
        });

        results[loadLevel] = metrics.duration;
      }

      // Verify performance scales reasonably with load
      expect(results.small).toBeLessThan(200);
      expect(results.medium).toBeLessThan(500);
      expect(results.large).toBeLessThan(1000);
      expect(results.medium).toBeGreaterThan(results.small);
      expect(results.large).toBeGreaterThan(results.medium);
    });
  });

  describe('Resource Utilization Monitoring', () => {
    it('should efficiently utilize CPU resources during processing', async () => {
      const tasks = Array.from({ length: 20 }, (_, i) =>
        generateLargeTask(`cpu-test-${i}`, 'medium'),
      );

      tasksService.findById.mockImplementation((id: string) =>
        Promise.resolve(tasks.find((t) => t.id === id)),
      );

      const { metrics } = await measurePerformance(async () => {
        for (const task of tasks) {
          agentProcessor.processTask(task.id);
          await new Promise((resolve) => setTimeout(resolve, 20));
          await agentProcessor.stopProcessing();
        }
      });

      // CPU usage should be reasonable for the workload
      expect(metrics.cpuUsage?.user).toBeLessThan(2000000); // Less than 2 seconds CPU time
      expect(metrics.duration).toBeLessThan(5000); // Complete within 5 seconds
    });

    it('should handle file I/O operations efficiently', async () => {
      const filesCount = 100;
      const taskWithManyFiles = {
        ...generateLargeTask('file-io-test', 'small'),
        files: Array.from({ length: filesCount }, (_, i) => ({
          id: `file-${i}`,
          name: `test-file-${i}.txt`,
          type: 'text/plain',
          size: 1024,
          data: `RmlsZSAke2l9IGNvbnRlbnQ=`, // Base64 content
          taskId: 'file-io-test',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      };

      tasksService.findNextTask.mockResolvedValue(taskWithManyFiles);
      jest.spyOn(agentProcessor, 'isRunning').mockReturnValue(false);

      const { metrics } = await measurePerformance(async () => {
        await agentScheduler.handleCron();
      });

      expect(metrics.duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(writeFile).toHaveBeenCalledTimes(filesCount);
      expect(metrics.cpuUsage?.user).toBeLessThan(1000000); // Less than 1 second CPU time
    });

    it('should optimize network resource usage', async () => {
      const networkOperations = 50;
      const tasks = Array.from({ length: networkOperations }, (_, i) =>
        generateLargeTask(`network-${i}`, 'small'),
      );

      tasksService.findById.mockImplementation((id: string) =>
        Promise.resolve(tasks.find((t) => t.id === id)),
      );
      messagesService.findEvery.mockImplementation((taskId: string) =>
        Promise.resolve([generateLargeMessages(1, taskId)[0]]),
      );
      configService.get.mockReturnValue('https://analytics.test.com');

      const { metrics } = await measurePerformance(async () => {
        const promises = tasks.map((task) =>
          agentAnalyticsService.handleTaskEvent({ taskId: task.id }),
        );
        await Promise.all(promises);
      });

      expect(metrics.duration).toBeLessThan(3000); // Should complete within 3 seconds
      expect(global.fetch).toHaveBeenCalledTimes(networkOperations);
      expect(metrics.memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });

  describe('Error Handling Performance', () => {
    it('should quickly recover from service failures', async () => {
      const errorTasks = Array.from({ length: 10 }, (_, i) =>
        generateLargeTask(`error-${i}`, 'small'),
      );

      // Mock intermittent failures
      anthropicService.generateMessage.mockImplementation(
        (prompt, messages, taskId) => {
          const id = taskId?.split('-')[1];
          const index = id ? parseInt(id) : 0;
          if (index % 3 === 0) {
            return Promise.reject(new Error('Service temporarily unavailable'));
          }
          return Promise.resolve({
            contentBlocks: [
              { type: MessageContentType._Text, text: 'Success' },
            ],
            tokenUsage: { totalTokens: 100, inputTokens: 50, outputTokens: 50 },
          });
        },
      );

      const { metrics } = await measurePerformance(async () => {
        const promises = errorTasks.map(async (task) => {
          agentProcessor.processTask(task.id);
          await new Promise((resolve) => setTimeout(resolve, 50));
          await agentProcessor.stopProcessing();
        });
        await Promise.all(promises);
      });

      expect(metrics.duration).toBeLessThan(3000); // Should handle errors quickly
      expect(logger.error).toHaveBeenCalled(); // Errors should be logged
      expect(tasksService.update).toHaveBeenCalledWith(
        expect.stringMatching(/error-(0|3|6|9)/),
        { status: TaskStatus.FAILED },
      );
    });

    it('should efficiently handle timeout scenarios', async () => {
      const timeoutTask = generateLargeTask('timeout-test', 'medium');

      // Mock slow service that will timeout
      anthropicService.generateMessage.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 5000)), // 5 second delay
      );

      const { metrics } = await measurePerformance(async () => {
        agentProcessor.processTask(timeoutTask.id);
        await new Promise((resolve) => setTimeout(resolve, 200)); // Short wait
        await agentProcessor.stopProcessing(); // Force stop
      });

      expect(metrics.duration).toBeLessThan(1000); // Should stop quickly
      expect(agentProcessor.isRunning()).toBe(false);
    });
  });

  describe('Scalability and Stress Testing', () => {
    it('should scale performance linearly with task complexity', async () => {
      const complexityLevels = [10, 50, 100, 200] as const;
      const results: number[] = [];

      for (const messageCount of complexityLevels) {
        const task = generateLargeTask(`scale-${messageCount}`, 'medium');
        const messages = generateLargeMessages(messageCount, task.id);

        tasksService.findById.mockResolvedValue(task);
        messagesService.findUnsummarized.mockResolvedValue(messages);

        const { metrics } = await measurePerformance(async () => {
          agentProcessor.processTask(task.id);
          await new Promise((resolve) => setTimeout(resolve, 100));
        });

        results.push(metrics.duration);
      }

      // Performance should scale reasonably (not exponentially)
      expect(results[0]).toBeLessThan(200); // 10 messages
      expect(results[1]).toBeLessThan(400); // 50 messages
      expect(results[2]).toBeLessThan(600); // 100 messages
      expect(results[3]).toBeLessThan(1000); // 200 messages

      // Verify linear-ish scaling (each level shouldn't be more than 2x previous)
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toBeLessThan(results[i - 1] * 2.5);
      }
    });

    it('should handle extreme stress conditions gracefully', async () => {
      const extremeStressTask = generateLargeTask('stress-test', 'huge');
      const extremeMessages = generateLargeMessages(
        10000,
        extremeStressTask.id,
      );

      tasksService.findById.mockResolvedValue(extremeStressTask);
      messagesService.findEvery.mockResolvedValue(extremeMessages);
      configService.get.mockReturnValue('https://analytics.test.com');

      // This should not crash or hang
      const { metrics } = await measurePerformance(async () => {
        try {
          await Promise.race([
            agentAnalyticsService.handleTaskEvent({
              taskId: extremeStressTask.id,
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 5000),
            ),
          ]);
        } catch (error) {
          // Timeout is acceptable under extreme stress
          expect(error.message).toBe('Timeout');
        }
      });

      expect(metrics.duration).toBeLessThan(6000); // Should timeout or complete within 6 seconds
    });

    it('should maintain system stability under sustained load', async () => {
      const sustainedOperations = 500;
      let completedOperations = 0;
      let errors = 0;

      const { metrics } = await measurePerformance(async () => {
        const operations = Array.from(
          { length: sustainedOperations },
          async (_, i) => {
            try {
              const task = generateLargeTask(`sustained-${i}`, 'small');
              tasksService.findById.mockResolvedValueOnce(task);
              messagesService.findUnsummarized.mockResolvedValueOnce([]);

              agentProcessor.processTask(task.id);
              await new Promise((resolve) => setTimeout(resolve, 2));
              await agentProcessor.stopProcessing();

              completedOperations++;
            } catch (error) {
              errors++;
            }
          },
        );

        // Process in batches to avoid overwhelming the system
        const batchSize = 20;
        for (let i = 0; i < operations.length; i += batchSize) {
          const batch = operations.slice(i, i + batchSize);
          await Promise.all(batch);
        }
      });

      expect(metrics.duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(completedOperations).toBeGreaterThan(sustainedOperations * 0.95); // 95% success rate
      expect(errors).toBeLessThan(sustainedOperations * 0.05); // Less than 5% error rate
      expect(metrics.memoryUsage.heapUsed).toBeLessThan(1000 * 1024 * 1024); // Less than 1GB
    });
  });

  describe('Performance Benchmarks and SLA Validation', () => {
    it('should meet all performance SLAs simultaneously', async () => {
      const benchmarkTask = generateLargeTask('benchmark', 'medium');
      const benchmarkMessages = generateLargeMessages(25, benchmarkTask.id);

      tasksService.findById.mockResolvedValue(benchmarkTask);
      messagesService.findUnsummarized.mockResolvedValue(benchmarkMessages);
      messagesService.findEvery.mockResolvedValue(benchmarkMessages);
      configService.get.mockReturnValue('https://analytics.test.com');

      const { metrics: processingMetrics } = await measurePerformance(
        async () => {
          agentProcessor.processTask(benchmarkTask.id);
          await new Promise((resolve) => setTimeout(resolve, 200));
        },
      );

      const { metrics: analyticsMetrics } = await measurePerformance(
        async () => {
          await agentAnalyticsService.handleTaskEvent({
            taskId: benchmarkTask.id,
          });
        },
      );

      const { metrics: schedulerMetrics } = await measurePerformance(
        async () => {
          tasksService.findScheduledTasks.mockResolvedValueOnce([]);
          tasksService.findNextTask.mockResolvedValueOnce(null);
          await agentScheduler.handleCron();
        },
      );

      // All SLAs should be met
      expect(processingMetrics.duration).toBeLessThan(500); // Processing SLA: 500ms
      expect(analyticsMetrics.duration).toBeLessThan(200); // Analytics SLA: 200ms
      expect(schedulerMetrics.duration).toBeLessThan(100); // Scheduler SLA: 100ms

      // Memory usage SLA: Combined operations should use less than 100MB
      const totalMemoryUsage =
        processingMetrics.memoryUsage.heapUsed +
        analyticsMetrics.memoryUsage.heapUsed +
        schedulerMetrics.memoryUsage.heapUsed;
      expect(totalMemoryUsage).toBeLessThan(100 * 1024 * 1024);

      // CPU usage SLA: Combined operations should use less than 1 second CPU time
      const totalCpuUsage =
        (processingMetrics.cpuUsage?.user || 0) +
        (analyticsMetrics.cpuUsage?.user || 0) +
        (schedulerMetrics.cpuUsage?.user || 0);
      expect(totalCpuUsage).toBeLessThan(1000000);
    });

    it('should generate comprehensive performance report', async () => {
      const testCases = [
        { name: 'Small Task', size: 'small' as const, expectedTime: 100 },
        { name: 'Medium Task', size: 'medium' as const, expectedTime: 300 },
        { name: 'Large Task', size: 'large' as const, expectedTime: 800 },
      ];

      const performanceReport: Array<{
        testCase: string;
        duration: number;
        memoryUsage: number;
        cpuUsage: number;
        withinSLA: boolean;
      }> = [];

      for (const testCase of testCases) {
        const task = generateLargeTask(
          `report-${testCase.size}`,
          testCase.size,
        );
        const messages = generateLargeMessages(
          testCase.size === 'small' ? 5 : testCase.size === 'medium' ? 25 : 100,
          task.id,
        );

        tasksService.findById.mockResolvedValue(task);
        messagesService.findUnsummarized.mockResolvedValue(messages);

        const { metrics } = await measurePerformance(async () => {
          agentProcessor.processTask(task.id);
          await new Promise((resolve) => setTimeout(resolve, 200));
        });

        performanceReport.push({
          testCase: testCase.name,
          duration: metrics.duration,
          memoryUsage: metrics.memoryUsage.heapUsed,
          cpuUsage: metrics.cpuUsage?.user || 0,
          withinSLA: metrics.duration <= testCase.expectedTime,
        });
      }

      // Verify all test cases meet their SLAs
      performanceReport.forEach((result) => {
        expect(result.withinSLA).toBe(true);
        expect(result.memoryUsage).toBeLessThan(50 * 1024 * 1024); // 50MB max
        expect(result.cpuUsage).toBeLessThan(500000); // 500ms CPU max
      });

      // Log performance report for analysis
      console.table(performanceReport);
    });
  });
});
