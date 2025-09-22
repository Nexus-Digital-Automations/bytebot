/**
 * PARLANT Phase 1 - High-Performance Batch Processing Engine
 *
 * Intelligent batching system for high-throughput operations with
 * adaptive batch sizing, priority queuing, and performance optimization.
 *
 * Performance Targets:
 * - Throughput: >10,000 operations/second
 * - Batch Efficiency: >95% optimal batch utilization
 * - Processing Latency: <100ms per batch
 * - Queue Utilization: >90% efficiency
 * - Memory Efficiency: <1GB heap usage per 10k operations
 *
 * @fileoverview High-performance batch processing with intelligent queuing
 * @version 1.0.0
 * @author Batch Processing Agent
 * @created 2025-09-21
 */

import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter } from "events";
import { performance } from "perf_hooks";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { promisify } from "util";

// Type guards
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

function getErrorMessage(error: unknown): string {
  if (isError(error)) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred";
}

/**
 * Batch configuration interface
 */
interface BatchConfig {
  maxBatchSize: number;
  minBatchSize: number;
  maxWaitTime: number;
  processingTimeout: number;
  retryPolicy: BatchRetryPolicy;
  priorityLevels: number;
  concurrentBatches: number;
  memoryThreshold: number;
  compressionEnabled: boolean;
  adaptiveSizing: boolean;
}

/**
 * Batch retry policy
 */
interface BatchRetryPolicy {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  partialRetry: boolean;
  deadLetterQueue: boolean;
}

/**
 * Batch item with metadata
 */
interface BatchItem<T = any> {
  id: string;
  data: T;
  priority: number;
  timestamp: Date;
  retries: number;
  timeout: number;
  metadata: Record<string, any>;
  dependencies?: string[];
  callback?: (result: any, error?: Error) => void;
}

/**
 * Batch processing result
 */
interface BatchResult<T = any> {
  batchId: string;
  items: BatchItem<T>[];
  results: Array<{ id: string; result?: any; error?: Error }>;
  processingTime: number;
  successful: number;
  failed: number;
  retried: number;
  metadata: {
    batchSize: number;
    memoryUsed: number;
    cpuTime: number;
    queueTime: number;
  };
}

/**
 * Batch processor function type
 */
type BatchProcessor<T, R> = (items: BatchItem<T>[]) => Promise<R[]>;

/**
 * Batch metrics
 */
interface BatchMetrics {
  totalBatches: number;
  totalItems: number;
  successfulBatches: number;
  failedBatches: number;
  averageBatchSize: number;
  averageProcessingTime: number;
  throughput: number;
  queueDepth: number;
  memoryUsage: number;
  cpuUtilization: number;
  errorRate: number;
  batchEfficiency: number;
}

/**
 * Priority queue for batch items
 */
class PriorityQueue<T> {
  private readonly items: Array<{ item: T; priority: number }> = [];

  enqueue(item: T, priority: number): void {
    const queueItem = { item, priority };
    let added = false;

    for (let i = 0; i < this.items.length; i++) {
      if (queueItem.priority > this.items[i].priority) {
        this.items.splice(i, 0, queueItem);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(queueItem);
    }
  }

  dequeue(): T | undefined {
    const item = this.items.shift();
    return item?.item;
  }

  peek(): T | undefined {
    return this.items[0]?.item;
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  clear(): void {
    this.items.length = 0;
  }

  toArray(): T[] {
    return this.items.map((item) => item.item);
  }
}

/**
 * Adaptive batch sizer
 */
class AdaptiveBatchSizer {
  private readonly logger = new Logger(AdaptiveBatchSizer.name);
  private performanceHistory: Array<{
    batchSize: number;
    processingTime: number;
    throughput: number;
  }> = [];
  private readonly maxHistory = 100;

  calculateOptimalBatchSize(
    queueDepth: number,
    currentThroughput: number,
    memoryUsage: number,
    config: BatchConfig,
  ): number {
    if (!config.adaptiveSizing) {
      return config.maxBatchSize;
    }

    // Base calculation on queue depth
    let optimalSize = Math.min(
      Math.ceil(queueDepth * 0.1),
      config.maxBatchSize,
    );

    // Adjust based on performance history
    if (this.performanceHistory.length > 10) {
      const avgPerformance = this.calculateAveragePerformance();
      const currentPerformance = currentThroughput;

      if (currentPerformance < avgPerformance * 0.8) {
        // Performance degrading, reduce batch size
        optimalSize = Math.max(optimalSize * 0.8, config.minBatchSize);
      } else if (currentPerformance > avgPerformance * 1.2) {
        // Performance improving, increase batch size
        optimalSize = Math.min(optimalSize * 1.2, config.maxBatchSize);
      }
    }

    // Memory pressure adjustment
    if (memoryUsage > config.memoryThreshold * 0.8) {
      optimalSize = Math.max(optimalSize * 0.7, config.minBatchSize);
    }

    return Math.floor(Math.max(optimalSize, config.minBatchSize));
  }

  recordPerformance(
    batchSize: number,
    processingTime: number,
    throughput: number,
  ): void {
    this.performanceHistory.push({ batchSize, processingTime, throughput });

    if (this.performanceHistory.length > this.maxHistory) {
      this.performanceHistory.shift();
    }
  }

  private calculateAveragePerformance(): number {
    if (this.performanceHistory.length === 0) return 0;

    const totalThroughput = this.performanceHistory.reduce(
      (sum, entry) => sum + entry.throughput,
      0,
    );
    return totalThroughput / this.performanceHistory.length;
  }
}

/**
 * Batch processing worker
 */
class BatchWorker<T, R> {
  private readonly logger = new Logger(`BatchWorker-${this.workerId}`);
  private isProcessing = false;
  private lastActivity = Date.now();

  constructor(
    private readonly workerId: string,
    private readonly processor: BatchProcessor<T, R>,
  ) {}

  async processBatch(items: BatchItem<T>[]): Promise<BatchResult<T>> {
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage().heapUsed;

    this.isProcessing = true;
    this.lastActivity = Date.now();

    try {
      this.logger.debug(
        `Processing batch ${batchId} with ${items.length} items`,
      );

      // Process items
      const results = await this.processor(items);
      const processingTime = performance.now() - startTime;
      const memoryAfter = process.memoryUsage().heapUsed;

      // Create result mapping
      const itemResults = items.map((item, index) => ({
        id: item.id,
        result: results[index],
        error: undefined,
      }));

      const successful = itemResults.filter((r) => !r.error).length;
      const failed = itemResults.filter((r) => r.error).length;

      return {
        batchId,
        items,
        results: itemResults,
        processingTime,
        successful,
        failed,
        retried: 0,
        metadata: {
          batchSize: items.length,
          memoryUsed: memoryAfter - memoryBefore,
          cpuTime: processingTime,
          queueTime: 0,
        },
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;

      // Create error results for all items
      const itemResults = items.map((item) => ({
        id: item.id,
        result: undefined,
        error: isError(error) ? error : new Error(getErrorMessage(error)),
      }));

      return {
        batchId,
        items,
        results: itemResults,
        processingTime,
        successful: 0,
        failed: items.length,
        retried: 0,
        metadata: {
          batchSize: items.length,
          memoryUsed: 0,
          cpuTime: processingTime,
          queueTime: 0,
        },
      };
    } finally {
      this.isProcessing = false;
      this.lastActivity = Date.now();
    }
  }

  isAvailable(): boolean {
    return !this.isProcessing;
  }

  getLastActivity(): number {
    return this.lastActivity;
  }
}

/**
 * High-Performance Batch Processing Engine
 */
@Injectable()
export class BatchProcessingEngine<T = any, R = any> {
  private readonly logger = new Logger(BatchProcessingEngine.name);
  private readonly eventEmitter = new EventEmitter();

  // Processing queues by priority
  private readonly queues: Map<number, PriorityQueue<BatchItem<T>>> = new Map();

  // Worker pool
  private readonly workers: BatchWorker<T, R>[] = [];

  // Processing state
  private isRunning = false;
  private processingIntervals: NodeJS.Timeout[] = [];

  // Metrics
  private readonly metrics: BatchMetrics;

  // Components
  private readonly adaptiveSizer: AdaptiveBatchSizer;
  private readonly config: BatchConfig;

  constructor(
    config: Partial<BatchConfig> = {},
    private readonly processor: BatchProcessor<T, R>,
  ) {
    this.logger.log("Initializing High-Performance Batch Processing Engine");

    this.config = {
      maxBatchSize: 1000,
      minBatchSize: 10,
      maxWaitTime: 100,
      processingTimeout: 30000,
      retryPolicy: {
        maxRetries: 3,
        retryDelay: 1000,
        exponentialBackoff: true,
        partialRetry: true,
        deadLetterQueue: true,
      },
      priorityLevels: 5,
      concurrentBatches: 4,
      memoryThreshold: 1024 * 1024 * 1024, // 1GB
      compressionEnabled: true,
      adaptiveSizing: true,
      ...config,
    };

    this.metrics = this.initializeMetrics();
    this.adaptiveSizer = new AdaptiveBatchSizer();

    this.initializeQueues();
    this.initializeWorkers();
    this.setupEventListeners();
  }

  /**
   * Add item to batch queue
   */
  async addItem(
    data: T,
    options: {
      priority?: number;
      timeout?: number;
      metadata?: Record<string, any>;
      dependencies?: string[];
      callback?: (result: any, error?: Error) => void;
    } = {},
  ): Promise<string> {
    const item: BatchItem<T> = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data,
      priority: options.priority || 0,
      timestamp: new Date(),
      retries: 0,
      timeout: options.timeout || this.config.processingTimeout,
      metadata: options.metadata || {},
      dependencies: options.dependencies,
      callback: options.callback,
    };

    // Add to appropriate priority queue
    const priority = Math.min(
      options.priority || 0,
      this.config.priorityLevels - 1,
    );
    const queue = this.queues.get(priority)!;
    queue.enqueue(item, item.priority);

    this.logger.debug(`Added item ${item.id} to priority ${priority} queue`);
    this.eventEmitter.emit("item-queued", item);

    return item.id;
  }

  /**
   * Add multiple items as batch
   */
  async addBatch(
    items: Array<{
      data: T;
      priority?: number;
      metadata?: Record<string, any>;
    }>,
  ): Promise<string[]> {
    const itemIds: string[] = [];

    for (const item of items) {
      const id = await this.addItem(item.data, {
        priority: item.priority,
        metadata: item.metadata,
      });
      itemIds.push(id);
    }

    return itemIds;
  }

  /**
   * Start batch processing
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn("Batch processing engine is already running");
      return;
    }

    this.isRunning = true;
    this.logger.log("Starting batch processing engine");

    // Start processing loops for each priority level
    for (
      let priority = this.config.priorityLevels - 1;
      priority >= 0;
      priority--
    ) {
      const interval = setInterval(
        () => this.processPriorityQueue(priority),
        this.calculateProcessingInterval(priority),
      );
      this.processingIntervals.push(interval);
    }

    this.startMetricsCollection();
    this.eventEmitter.emit("engine-started");
  }

  /**
   * Stop batch processing
   */
  stop(): void {
    if (!this.isRunning) {
      this.logger.warn("Batch processing engine is not running");
      return;
    }

    this.isRunning = false;
    this.logger.log("Stopping batch processing engine");

    // Clear processing intervals
    for (const interval of this.processingIntervals) {
      clearInterval(interval);
    }
    this.processingIntervals = [];

    this.eventEmitter.emit("engine-stopped");
  }

  /**
   * Process items in priority queue
   */
  private async processPriorityQueue(priority: number): Promise<void> {
    const queue = this.queues.get(priority)!;

    if (queue.isEmpty()) {
      return;
    }

    // Find available worker
    const worker = this.workers.find((w) => w.isAvailable());
    if (!worker) {
      return;
    }

    // Calculate optimal batch size
    const queueDepth = this.getTotalQueueDepth();
    const currentThroughput = this.metrics.throughput;
    const memoryUsage = process.memoryUsage().heapUsed;

    const batchSize = this.adaptiveSizer.calculateOptimalBatchSize(
      queueDepth,
      currentThroughput,
      memoryUsage,
      this.config,
    );

    // Collect batch items
    const batchItems: BatchItem<T>[] = [];
    while (!queue.isEmpty() && batchItems.length < batchSize) {
      const item = queue.dequeue();
      if (item && this.isItemReady(item)) {
        batchItems.push(item);
      }
    }

    if (batchItems.length === 0) {
      return;
    }

    try {
      // Process batch
      const result = await worker.processBatch(batchItems);

      // Record metrics
      this.recordBatchMetrics(result);

      // Record performance for adaptive sizing
      this.adaptiveSizer.recordPerformance(
        result.metadata.batchSize,
        result.processingTime,
        result.metadata.batchSize / (result.processingTime / 1000),
      );

      // Handle results
      await this.handleBatchResult(result);

      this.eventEmitter.emit("batch-processed", result);
    } catch (error) {
      this.logger.error(`Batch processing failed: ${getErrorMessage(error)}`);
      this.handleBatchError(batchItems, error);
    }
  }

  /**
   * Handle batch processing result
   */
  private async handleBatchResult(result: BatchResult<T>): Promise<void> {
    for (const itemResult of result.results) {
      const originalItem = result.items.find(
        (item) => item.id === itemResult.id,
      );

      if (originalItem?.callback) {
        try {
          originalItem.callback(itemResult.result, itemResult.error);
        } catch (error) {
          this.logger.error(
            `Callback error for item ${itemResult.id}: ${getErrorMessage(error)}`,
          );
        }
      }

      if (itemResult.error && this.shouldRetryItem(originalItem!)) {
        await this.retryItem(originalItem!);
      }
    }
  }

  /**
   * Handle batch processing error
   */
  private handleBatchError(items: BatchItem<T>[], error: unknown): void {
    for (const item of items) {
      if (this.shouldRetryItem(item)) {
        this.retryItem(item);
      } else {
        // Send to dead letter queue or call error callback
        if (item.callback) {
          item.callback(
            undefined,
            isError(error) ? error : new Error(getErrorMessage(error)),
          );
        }
      }
    }
  }

  /**
   * Check if item is ready for processing
   */
  private isItemReady(item: BatchItem<T>): boolean {
    // Check dependencies
    if (item.dependencies && item.dependencies.length > 0) {
      // Implement dependency checking logic
      return true; // Placeholder
    }

    // Check timeout
    const age = Date.now() - item.timestamp.getTime();
    return age >= this.config.maxWaitTime;
  }

  /**
   * Check if item should be retried
   */
  private shouldRetryItem(item: BatchItem<T>): boolean {
    return (
      item.retries < this.config.retryPolicy.maxRetries &&
      this.config.retryPolicy.partialRetry
    );
  }

  /**
   * Retry failed item
   */
  private async retryItem(item: BatchItem<T>): Promise<void> {
    item.retries++;
    item.timestamp = new Date();

    // Calculate retry delay
    const delay = this.config.retryPolicy.exponentialBackoff
      ? this.config.retryPolicy.retryDelay * Math.pow(2, item.retries - 1)
      : this.config.retryPolicy.retryDelay;

    setTimeout(() => {
      const queue = this.queues.get(item.priority)!;
      queue.enqueue(item, item.priority);
    }, delay);
  }

  /**
   * Get current batch metrics
   */
  getMetrics(): BatchMetrics {
    return { ...this.metrics };
  }

  /**
   * Validate performance targets
   */
  validatePerformanceTargets(): {
    throughput: boolean;
    batchEfficiency: boolean;
    processingLatency: boolean;
    queueUtilization: boolean;
    memoryEfficiency: boolean;
  } {
    return {
      throughput: this.metrics.throughput >= 10000, // >10k ops/sec
      batchEfficiency: this.metrics.batchEfficiency >= 0.95, // >95%
      processingLatency: this.metrics.averageProcessingTime <= 100, // <100ms
      queueUtilization: true, // Implement queue utilization calculation
      memoryEfficiency: this.metrics.memoryUsage <= this.config.memoryThreshold, // <1GB
    };
  }

  // Helper methods
  private initializeQueues(): void {
    for (let i = 0; i < this.config.priorityLevels; i++) {
      this.queues.set(i, new PriorityQueue<BatchItem<T>>());
    }
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.config.concurrentBatches; i++) {
      const worker = new BatchWorker(`worker-${i}`, this.processor);
      this.workers.push(worker);
    }
  }

  private calculateProcessingInterval(priority: number): number {
    // Higher priority = shorter interval
    const baseInterval = 100; // 100ms
    return baseInterval + (this.config.priorityLevels - priority - 1) * 50;
  }

  private getTotalQueueDepth(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.size();
    }
    return total;
  }

  private recordBatchMetrics(result: BatchResult<T>): void {
    this.metrics.totalBatches++;
    this.metrics.totalItems += result.items.length;

    if (result.failed === 0) {
      this.metrics.successfulBatches++;
    } else {
      this.metrics.failedBatches++;
    }

    // Update averages
    this.metrics.averageBatchSize =
      (this.metrics.averageBatchSize + result.metadata.batchSize) / 2;
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime + result.processingTime) / 2;

    // Calculate throughput (items per second)
    this.metrics.throughput =
      result.metadata.batchSize / (result.processingTime / 1000);

    // Update queue depth
    this.metrics.queueDepth = this.getTotalQueueDepth();

    // Update memory usage
    this.metrics.memoryUsage = process.memoryUsage().heapUsed;

    // Calculate error rate
    this.metrics.errorRate =
      this.metrics.failedBatches / this.metrics.totalBatches;

    // Calculate batch efficiency
    this.metrics.batchEfficiency =
      this.metrics.averageBatchSize / this.config.maxBatchSize;
  }

  private initializeMetrics(): BatchMetrics {
    return {
      totalBatches: 0,
      totalItems: 0,
      successfulBatches: 0,
      failedBatches: 0,
      averageBatchSize: 0,
      averageProcessingTime: 0,
      throughput: 0,
      queueDepth: 0,
      memoryUsage: 0,
      cpuUtilization: 0,
      errorRate: 0,
      batchEfficiency: 0,
    };
  }

  private setupEventListeners(): void {
    this.eventEmitter.on("item-queued", (item: BatchItem<T>) => {
      this.logger.debug(`Item queued: ${item.id}`);
    });

    this.eventEmitter.on("batch-processed", (result: BatchResult<T>) => {
      this.logger.debug(
        `Batch processed: ${result.batchId} (${result.successful}/${result.items.length} successful)`,
      );
    });
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      const targets = this.validatePerformanceTargets();
      this.logger.log("Batch Processing Performance:", targets);
    }, 15000); // Every 15 seconds
  }
}

export {
  BatchProcessingEngine,
  BatchConfig,
  BatchItem,
  BatchResult,
  BatchMetrics,
  BatchProcessor,
};
