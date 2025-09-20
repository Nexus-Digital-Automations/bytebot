/**
 * Database Mock Services - Comprehensive Mocking for Database Operations
 *
 * Provides comprehensive mock implementations for all database-related services:
 * - Prisma client mocks with realistic behavior
 * - Database connection and health monitoring mocks
 * - CRUD operation mocks with validation
 * - Transaction management mocks
 * - Migration and schema mocks
 * - Connection pool and performance metrics mocks
 *
 * Features:
 * - Jest-compatible mock patterns with TypeScript support
 * - In-memory data simulation for realistic testing
 * - Configurable failure scenarios and error conditions
 * - Performance metrics simulation with realistic timing
 * - Circuit breaker and retry pattern mocks
 * - Enterprise-grade reliability pattern mocks
 * - Connection pool simulation with realistic metrics
 *
 * @author Claude Code
 * @version 2.0.0
 */

import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

import {
  DatabaseMetrics,
  QueryPerformanceMetrics,
} from '../../database/database.service';
import {
  ConnectionPoolConfig,
  ConnectionPoolOptions,
} from '../../database/connection-pool.config';

// ============================================================================
// Type Definitions
// ============================================================================

interface DatabaseRecord {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: unknown;
}

interface QueryResult {
  success?: boolean;
  message?: string;
  affected?: number;
  id?: string;
  [key: string]: unknown;
}

interface InsertParams {
  [key: string]: unknown;
}

interface UpdateParams {
  [key: string]: unknown;
}

interface MockBehaviorOptions {
  shouldFailConnection?: boolean;
  shouldFailQueries?: boolean;
  connectionDelay?: number;
  queryDelay?: number;
}

interface DatabaseServiceMockOptions {
  shouldFailHealthCheck?: boolean;
  shouldFailOperations?: boolean;
  customMetrics?: Partial<DatabaseMetrics>;
}

interface EcosystemMockConfig {
  shouldFailConnection?: boolean;
  shouldFailQueries?: boolean;
  shouldFailHealthCheck?: boolean;
  shouldFailOperations?: boolean;
  queryDelay?: number;
  connectionDelay?: number;
  customMetrics?: Partial<DatabaseMetrics>;
}

// ============================================================================
// In-Memory Database Simulation
// ============================================================================

/**
 * In-memory database simulation for realistic testing
 */
export class InMemoryDatabase {
  private tables: Map<string, Map<string, DatabaseRecord>> = new Map();
  private queryLog: QueryPerformanceMetrics[] = [];
  private connectionMetrics = {
    activeConnections: 0,
    idleConnections: 5,
    waitingConnections: 0,
    totalConnections: 5,
  };

  constructor() {
    // Initialize common tables
    this.tables.set('Task', new Map());
    this.tables.set('Message', new Map());
    this.tables.set('Summary', new Map());
    this.tables.set('File', new Map());
    this.tables.set('User', new Map());
  }

  /**
   * Simulate database query execution
   */
  async executeQuery(
    query: string,
    params: unknown[] = [],
    table?: string,
  ): Promise<QueryResult> {
    const startTime = Date.now();
    // queryId is generated but not used in current implementation
    // const queryId = this.generateQueryId();

    try {
      // Simulate query processing delay
      await this.simulateQueryDelay(query);

      let _result: QueryResult;

      // Parse and execute mock query based on type
      if (query.includes('SELECT')) {
        const selectResult = this.simulateSelect(query, table);
        result = { success: true, _data: selectResult };
      } else if (query.includes('INSERT')) {
        const insertResult = this.simulateInsert(query, params, table);
        result = insertResult;
      } else if (query.includes('UPDATE')) {
        const updateResult = this.simulateUpdate(query, params, table);
        result = updateResult;
      } else if (query.includes('DELETE')) {
        const deleteResult = this.simulateDelete(query, table);
        result = deleteResult;
      } else if (query.includes('CREATE') || query.includes('DROP')) {
        const schemaResult = await this.simulateSchema(query);
        result = schemaResult;
      } else {
        result = { success: true, message: 'Query executed successfully' };
      }

      const duration = Date.now() - startTime;

      // Log query performance
      this.queryLog.push({
        query: query.substring(0, 100),
        duration,
        timestamp: new Date(),
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log failed query
      this.queryLog.push({
        query: query.substring(0, 100),
        duration,
        timestamp: new Date(),
        success: false,
        _error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Simulate realistic query processing delays
   */
  private async simulateQueryDelay(query: string): Promise<void> {
    let delay = 10; // Base delay in ms

    // Different query types have different processing times
    if (query.includes('SELECT')) {
      delay = Math.floor(Math.random() * 50) + 10; // 10-60ms
    } else if (query.includes('INSERT')) {
      delay = Math.floor(Math.random() * 30) + 20; // 20-50ms
    } else if (query.includes('UPDATE')) {
      delay = Math.floor(Math.random() * 40) + 15; // 15-55ms
    } else if (query.includes('DELETE')) {
      delay = Math.floor(Math.random() * 25) + 15; // 15-40ms
    } else if (query.includes('CREATE') || query.includes('DROP')) {
      delay = Math.floor(Math.random() * 100) + 50; // 50-150ms
    }

    // Complex queries take longer
    if (query.includes('JOIN')) delay *= 1.5;
    if (query.includes('GROUP BY')) delay *= 1.3;
    if (query.includes('ORDER BY')) delay *= 1.2;
    if (query.includes('HAVING')) delay *= 1.4;

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Simulate SELECT operations
   */
  private simulateSelect(query: string, table?: string): DatabaseRecord[] {
    if (table && this.tables.has(table)) {
      const tableData = this.tables.get(table)!;
      return Array.from(tableData.values());
    }

    // Return mock data for common queries
    if (query.includes('health_check')) {
      return [{ id: 'health', health_check: 1 }];
    }

    // Return empty result for unknown queries
    return [];
  }

  /**
   * Simulate INSERT operations
   */
  private simulateInsert(
    _query: string,
    params: unknown[],
    table?: string,
  ): DatabaseRecord {
    if (table && this.tables.has(table)) {
      const tableData = this.tables.get(table)!;
      const id = this.generateId();
      const insertData = this.extractInsertData(params);
      const record: DatabaseRecord = {
        id,
        ...insertData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      tableData.set(id, record);
      return record;
    }

    return { id: this.generateId(), affected: 1 };
  }

  /**
   * Simulate UPDATE operations
   */
  private simulateUpdate(
    _query: string,
    params: unknown[],
    table?: string,
  ): QueryResult {
    if (table && this.tables.has(table)) {
      const tableData = this.tables.get(table)!;
      let affected = 0;

      // Update all records (simplified mock)
      const updateData = this.extractUpdateData(params);
      for (const [id, record] of Array.from(tableData.entries())) {
        const updatedRecord: DatabaseRecord = {
          ...record,
          ...updateData,
          updatedAt: new Date(),
        };
        tableData.set(id, updatedRecord);
        affected++;
      }

      return { affected };
    }

    return { affected: Math.floor(Math.random() * 5) + 1 };
  }

  /**
   * Simulate DELETE operations
   */
  private simulateDelete(_query: string, table?: string): QueryResult {
    if (table && this.tables.has(table)) {
      const tableData = this.tables.get(table)!;
      const beforeSize = tableData.size;

      // Delete some records (simplified mock)
      const keysToDelete = Array.from(tableData.keys()).slice(0, 1);
      keysToDelete.forEach((key) => tableData.delete(key));

      return { affected: beforeSize - tableData.size };
    }

    return { affected: Math.floor(Math.random() * 3) };
  }

  /**
   * Simulate schema operations (CREATE, DROP, ALTER)
   */
  private async simulateSchema(_query: string): Promise<QueryResult> {
    // Simulate schema modification delay
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    return { success: true, message: 'Schema operation completed' };
  }

  /**
   * Extract data from INSERT parameters (simplified)
   */
  private extractInsertData(params: unknown[]): InsertParams {
    if (
      params.length > 0 &&
      typeof params[0] === 'object' &&
      params[0] !== null
    ) {
      return params[0] as InsertParams;
    }
    return {};
  }

  /**
   * Extract data from UPDATE parameters (simplified)
   */
  private extractUpdateData(params: unknown[]): UpdateParams {
    if (
      params.length > 0 &&
      typeof params[0] === 'object' &&
      params[0] !== null
    ) {
      return params[0] as UpdateParams;
    }
    return {};
  }

  /**
   * Generate unique ID for records
   */
  private generateId(): string {
    return `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique query ID for tracking
   */
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Get query performance metrics
   */
  getQueryMetrics(): QueryPerformanceMetrics[] {
    return [...this.queryLog];
  }

  /**
   * Get connection metrics
   */
  getConnectionMetrics() {
    return { ...this.connectionMetrics };
  }

  /**
   * Simulate connection acquisition
   */
  acquireConnection(): void {
    this.connectionMetrics.activeConnections++;
    this.connectionMetrics.idleConnections = Math.max(
      0,
      this.connectionMetrics.idleConnections - 1,
    );
  }

  /**
   * Simulate connection release
   */
  releaseConnection(): void {
    this.connectionMetrics.activeConnections = Math.max(
      0,
      this.connectionMetrics.activeConnections - 1,
    );
    this.connectionMetrics.idleConnections++;
  }

  /**
   * Clear all data for fresh test runs
   */
  clearAllData(): void {
    this.tables.clear();
    this.queryLog = [];
    this.connectionMetrics = {
      activeConnections: 0,
      idleConnections: 5,
      waitingConnections: 0,
      totalConnections: 5,
    };
  }

  /**
   * Get table data for inspection
   */
  getTableData(tableName: string): DatabaseRecord[] {
    const table = this.tables.get(tableName);
    return table ? Array.from(table.values()) : [];
  }

  /**
   * Set mock data for a table
   */
  setTableData(tableName: string, _data: DatabaseRecord[]): void {
    const table = new Map<string, DatabaseRecord>();
    data.forEach((item, index) => {
      if (this.isDatabaseRecord(item)) {
        const id = item.id || `mock_${index}`;
        table.set(id, item);
      }
    });
    this.tables.set(tableName, table);
  }

  /**
   * Type guard to check if an object is a DatabaseRecord
   */
  private isDatabaseRecord(obj: unknown): obj is DatabaseRecord {
    return typeof obj === 'object' && obj !== null;
  }
}

// ============================================================================
// Mock Prisma Client
// ============================================================================

// Define the structure for mock Prisma model operations
interface MockPrismaModel {
  findMany: jest.MockedFunction<(args?: unknown) => Promise<DatabaseRecord[]>>;
  findUnique: jest.MockedFunction<
    (args: { where?: { id?: string } }) => Promise<DatabaseRecord | null>
  >;
  findFirst: jest.MockedFunction<
    (args?: unknown) => Promise<DatabaseRecord | null>
  >;
  create: jest.MockedFunction<
    (args: { _data: unknown }) => Promise<DatabaseRecord>
  >;
  createMany: jest.MockedFunction<
    (args: { _data: unknown[] }) => Promise<{ count: number }>
  >;
  update: jest.MockedFunction<
    (args: { _data: unknown }) => Promise<QueryResult>
  >;
  updateMany: jest.MockedFunction<
    (args: { _data: unknown }) => Promise<QueryResult>
  >;
  delete: jest.MockedFunction<(args: unknown) => Promise<QueryResult>>;
  deleteMany: jest.MockedFunction<(args?: unknown) => Promise<QueryResult>>;
  count: jest.MockedFunction<(args?: unknown) => Promise<number>>;
  aggregate: jest.MockedFunction<(args: unknown) => Promise<unknown>>;
  groupBy: jest.MockedFunction<(args: unknown) => Promise<unknown[]>>;
  upsert: jest.MockedFunction<
    (args: {
      where?: { id?: string };
      update: unknown;
      create: unknown;
    }) => Promise<DatabaseRecord>
  >;
}

/**
 * Comprehensive mock implementation of PrismaClient
 */
export class MockPrismaClient {
  private readonly logger = new Logger(MockPrismaClient.name);
  private inMemoryDb = new InMemoryDatabase();
  private isConnected = false;
  private shouldFailConnection = false;
  private shouldFailQueries = false;
  private connectionDelay = 100;
  private queryDelay = 50;

  // Mock models - using specific interfaces instead of any
  public task!: MockPrismaModel;
  public message!: MockPrismaModel;
  public summary!: MockPrismaModel;
  public file!: MockPrismaModel;
  public user!: MockPrismaModel;

  constructor() {
    this.initializeMockModels();
  }

  /**
   * Initialize mock models with CRUD operations
   */
  private initializeMockModels(): void {
    this.task = this.createMockModel('Task');
    this.message = this.createMockModel('Message');
    this.summary = this.createMockModel('Summary');
    this.file = this.createMockModel('File');
    this.user = this.createMockModel('User');
  }

  /**
   * Create a mock model with standard Prisma operations
   */
  private createMockModel(tableName: string): MockPrismaModel {
    return {
      findMany: jest.fn().mockImplementation(async (_args?: unknown) => {
        await this.checkConnectionAndDelay();
        return this.inMemoryDb.getTableData(tableName);
      }),

      findUnique: jest
        .fn()
        .mockImplementation(async (args: { where?: { id?: string } }) => {
          await this.checkConnectionAndDelay();
          const data = this.inMemoryDb.getTableData(tableName);
          return data.find((item) => item.id === args.where?.id) || null;
        }),

      findFirst: jest.fn().mockImplementation(async (_args?: unknown) => {
        await this.checkConnectionAndDelay();
        const data = this.inMemoryDb.getTableData(tableName);
        return data[0] || null;
      }),

      create: jest.fn().mockImplementation(async (args: { _data: unknown }) => {
        await this.checkConnectionAndDelay();
        const result = await this.inMemoryDb.executeQuery(
          `INSERT INTO ${tableName}`,
          [args.data],
          tableName,
        );
        // Return the created record instead of query result
        return result as DatabaseRecord;
      }),

      createMany: jest
        .fn()
        .mockImplementation(async (args: { _data: unknown[] }) => {
          await this.checkConnectionAndDelay();
          const results: unknown[] = [];
          for (const item of args.data) {
            const result = await this.inMemoryDb.executeQuery(
              `INSERT INTO ${tableName}`,
              [item],
              tableName,
            );
            results.push(result);
          }
          return { count: results.length };
        }),

      update: jest.fn().mockImplementation(async (args: { _data: unknown }) => {
        await this.checkConnectionAndDelay();
        return this.inMemoryDb.executeQuery(
          `UPDATE ${tableName}`,
          [args.data],
          tableName,
        );
      }),

      updateMany: jest
        .fn()
        .mockImplementation(async (args: { _data: unknown }) => {
          await this.checkConnectionAndDelay();
          return this.inMemoryDb.executeQuery(
            `UPDATE ${tableName}`,
            [args.data],
            tableName,
          );
        }),

      delete: jest.fn().mockImplementation(async (_args: unknown) => {
        await this.checkConnectionAndDelay();
        return this.inMemoryDb.executeQuery(
          `DELETE FROM ${tableName}`,
          [],
          tableName,
        );
      }),

      deleteMany: jest.fn().mockImplementation(async (_args?: unknown) => {
        await this.checkConnectionAndDelay();
        return this.inMemoryDb.executeQuery(
          `DELETE FROM ${tableName}`,
          [],
          tableName,
        );
      }),

      count: jest.fn().mockImplementation(async (_args?: unknown) => {
        await this.checkConnectionAndDelay();
        return this.inMemoryDb.getTableData(tableName).length;
      }),

      aggregate: jest.fn().mockImplementation(async (_args: unknown) => {
        await this.checkConnectionAndDelay();
        const data = this.inMemoryDb.getTableData(tableName);
        return {
          _count: { _all: data.length },
          _avg: {},
          _sum: {},
          _min: {},
          _max: {},
        };
      }),

      groupBy: jest.fn().mockImplementation(async (_args: unknown) => {
        await this.checkConnectionAndDelay();
        return [];
      }),

      upsert: jest
        .fn()
        .mockImplementation(
          async (args: {
            where?: { id?: string };
            update: unknown;
            create: unknown;
          }) => {
            await this.checkConnectionAndDelay();
            // Try to find existing record
            const existing = this.inMemoryDb
              .getTableData(tableName)
              .find((item) => item.id === args.where?.id);

            if (existing) {
              const result = await this.inMemoryDb.executeQuery(
                `UPDATE ${tableName}`,
                [args.update],
                tableName,
              );
              return result as DatabaseRecord;
            } else {
              const result = await this.inMemoryDb.executeQuery(
                `INSERT INTO ${tableName}`,
                [args.create],
                tableName,
              );
              return result as DatabaseRecord;
            }
          },
        ),
    };
  }

  /**
   * Mock $connect method
   */
  async $connect(): Promise<void> {
    this.logger.log('Mock Prisma client connecting...');

    if (this.shouldFailConnection) {
      throw new Error('Mock connection failure');
    }

    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, this.connectionDelay));

    this.isConnected = true;
    this.inMemoryDb.acquireConnection();
    this.logger.log('Mock Prisma client connected successfully');
  }

  /**
   * Mock $disconnect method
   */
  async $disconnect(): Promise<void> {
    this.logger.log('Mock Prisma client disconnecting...');

    // Simulate disconnection delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    this.isConnected = false;
    this.inMemoryDb.releaseConnection();
    this.logger.log('Mock Prisma client disconnected');
  }

  /**
   * Mock $queryRaw method
   */
  async $queryRaw(query: unknown, ...params: unknown[]): Promise<unknown> {
    await this.checkConnectionAndDelay();

    const queryString =
      typeof query === 'string' ? query : JSON.stringify(query);
    return this.inMemoryDb.executeQuery(queryString, params);
  }

  /**
   * Mock $queryRawUnsafe method
   */
  async $queryRawUnsafe(query: string, ...params: unknown[]): Promise<unknown> {
    await this.checkConnectionAndDelay();
    return this.inMemoryDb.executeQuery(query, params);
  }

  /**
   * Mock $executeRaw method
   */
  async $executeRaw(
    query: unknown,
    ...params: unknown[]
  ): Promise<QueryResult> {
    await this.checkConnectionAndDelay();

    const queryString =
      typeof query === 'string' ? query : JSON.stringify(query);
    const result = await this.inMemoryDb.executeQuery(queryString, params);

    return { affected: result.affected || 1 };
  }

  /**
   * Mock $executeRawUnsafe method
   */
  async $executeRawUnsafe(
    query: string,
    ...params: unknown[]
  ): Promise<QueryResult> {
    await this.checkConnectionAndDelay();
    const result = await this.inMemoryDb.executeQuery(query, params);

    return { affected: result.affected || 1 };
  }

  /**
   * Mock $transaction method
   */
  async $transaction(
    operations: unknown[] | ((prisma: unknown) => Promise<unknown>),
  ): Promise<unknown> {
    await this.checkConnectionAndDelay();

    if (typeof operations === 'function') {
      // Interactive transaction
      return await operations(this);
    } else {
      // Sequential transaction
      const results: unknown[] = [];
      for (const operation of operations) {
        const result = await Promise.resolve(operation);
        results.push(result);
      }
      return results;
    }
  }

  /**
   * Mock $use method for middleware
   */
  $use(_middleware: unknown): void {
    this.logger.debug('Mock middleware registered');
  }

  /**
   * Mock $on method for event listeners
   */
  $on(_event: string, _callback: unknown): void {
    this.logger.debug(`Mock event listener registered for: ${event}`);
  }

  /**
   * Mock $extends method for extensions
   */
  $extends(_extension: unknown): this {
    this.logger.debug('Mock extension registered');
    return this;
  }

  // ========================================================================
  // Configuration and Testing Methods
  // ========================================================================

  /**
   * Check connection status and simulate delays
   */
  private async checkConnectionAndDelay(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Mock Prisma client is not connected');
    }

    if (this.shouldFailQueries) {
      throw new Error('Mock query failure configured');
    }

    // Simulate query processing delay
    await new Promise((resolve) => setTimeout(resolve, this.queryDelay));
  }

  /**
   * Configure mock behavior for testing scenarios
   */
  configureMockBehavior(_options: MockBehaviorOptions): void {
    if (options.shouldFailConnection !== undefined) {
      this.shouldFailConnection = options.shouldFailConnection;
    }
    if (options.shouldFailQueries !== undefined) {
      this.shouldFailQueries = options.shouldFailQueries;
    }
    if (options.connectionDelay !== undefined) {
      this.connectionDelay = options.connectionDelay;
    }
    if (options.queryDelay !== undefined) {
      this.queryDelay = options.queryDelay;
    }
  }

  /**
   * Get mock database metrics
   */
  getMockMetrics() {
    return {
      isConnected: this.isConnected,
      queryMetrics: this.inMemoryDb.getQueryMetrics(),
      connectionMetrics: this.inMemoryDb.getConnectionMetrics(),
    };
  }

  /**
   * Reset mock state for clean testing
   */
  resetMockState(): void {
    this.isConnected = false;
    this.shouldFailConnection = false;
    this.shouldFailQueries = false;
    this.connectionDelay = 100;
    this.queryDelay = 50;
    this.inMemoryDb.clearAllData();

    // Reset all model mocks
    this.initializeMockModels();
  }

  /**
   * Seed mock data for testing
   */
  seedMockData(tableName: string, _data: DatabaseRecord[]): void {
    this.inMemoryDb.setTableData(tableName, data);
  }

  /**
   * Get in-memory database instance
   */
  getInMemoryDb(): InMemoryDatabase {
    return this.inMemoryDb;
  }
}

// ============================================================================
// Mock Database Service
// ============================================================================

/**
 * Mock implementation of DatabaseService with enterprise features
 */
export class MockDatabaseService {
  private readonly logger = new Logger(MockDatabaseService.name);
  private mockPrismaClient = new MockPrismaClient();
  private isHealthy = true;
  private startTime = new Date();
  private lastHealthCheck = new Date();
  private shouldFailHealthCheck = false;
  private shouldFailOperations = false;

  private metrics: DatabaseMetrics = {
    connectionPool: {
      active: 5,
      idle: 3,
      waiting: 0,
      total: 8,
    },
    performance: {
      averageQueryTime: 25,
      slowQueries: 2,
      totalQueries: 150,
      queriesPerSecond: 12.5,
    },
    health: {
      isConnected: true,
      lastHealthCheck: new Date(),
      uptime: 0,
      errorRate: 0.01,
    },
  };

  constructor(
    private readonly configService?: ConfigService,
    private readonly connectionPoolConfig?: ConnectionPoolConfig,
  ) {}

  /**
   * Mock onModuleInit
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Mock Database service initialized');
    await this.mockPrismaClient.$connect();
  }

  /**
   * Mock onModuleDestroy
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Mock Database service destroyed');
    await this.mockPrismaClient.$disconnect();
  }

  /**
   * Get mock Prisma client
   */
  getPrismaClient(): PrismaClient {
    return this.mockPrismaClient as unknown as PrismaClient;
  }

  /**
   * Mock database metrics
   */
  getMetrics(): DatabaseMetrics {
    const uptime = Date.now() - this.startTime.getTime();
    return {
      ...this.metrics,
      health: {
        ...this.metrics.health,
        uptime,
        lastHealthCheck: this.lastHealthCheck,
      },
    };
  }

  /**
   * Mock health status
   */
  getHealthStatus() {
    const uptime = Date.now() - this.startTime.getTime();
    return {
      isHealthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      uptime,
      connectionStatus: this.isHealthy ? 'connected' : 'disconnected',
    };
  }

  /**
   * Mock raw query execution
   */
  async executeRawQuery(query: string, params?: unknown[]): Promise<unknown> {
    if (this.shouldFailOperations) {
      throw new Error('Mock database operation failure');
    }

    return this.mockPrismaClient.$queryRawUnsafe(query, ...(params || []));
  }

  /**
   * Mock circuit breaker execution
   */
  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    _circuitName: string = 'database_default',
  ): Promise<T> {
    if (this.shouldFailOperations) {
      throw new Error('Mock circuit breaker is open');
    }

    return await operation();
  }

  /**
   * Mock retry execution
   */
  async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }

        // Simulate retry delay
        await new Promise((resolve) => setTimeout(resolve, 100 * attempts));
      }
    }

    throw new Error('Max retry attempts exceeded');
  }

  /**
   * Mock reliability execution (circuit breaker + retry)
   */
  async executeWithReliability<T>(
    operation: () => Promise<T>,
    _circuitName: string = 'database_default',
  ): Promise<T> {
    return this.executeWithCircuitBreaker(
      () => this.executeWithRetry(operation),
      _circuitName,
    );
  }

  /**
   * Mock raw query with reliability
   */
  async executeRawQueryWithReliability(
    query: string,
    params?: unknown[],
  ): Promise<unknown> {
    return this.executeWithReliability(() =>
      this.executeRawQuery(query, params),
    );
  }

  /**
   * Mock reliability metrics
   */
  getReliabilityMetrics() {
    return {
      circuitBreakers: [
        {
          circuitName: 'database_default',
          state: 'CLOSED',
          failureCount: 0,
          lastFailureTime: null,
          successfulCalls: 100,
          failedCalls: 2,
        },
      ],
      connectionPool: this.metrics.connectionPool,
      performance: this.metrics.performance,
    };
  }

  // ========================================================================
  // Configuration and Testing Methods
  // ========================================================================

  /**
   * Configure mock behavior for testing scenarios
   */
  configureMockBehavior(_options: DatabaseServiceMockOptions): void {
    if (options.shouldFailHealthCheck !== undefined) {
      this.shouldFailHealthCheck = options.shouldFailHealthCheck;
      this.isHealthy = !options.shouldFailHealthCheck;
    }
    if (options.shouldFailOperations !== undefined) {
      this.shouldFailOperations = options.shouldFailOperations;
    }
    if (options.customMetrics) {
      this.metrics = { ...this.metrics, ...options.customMetrics };
    }
  }

  /**
   * Simulate health check execution
   */
  performMockHealthCheck(): void {
    this.lastHealthCheck = new Date();

    if (this.shouldFailHealthCheck) {
      this.isHealthy = false;
      throw new Error('Mock health check failed');
    }

    this.isHealthy = true;
  }

  /**
   * Get mock Prisma client for direct manipulation
   */
  getMockPrismaClient(): MockPrismaClient {
    return this.mockPrismaClient;
  }

  /**
   * Reset mock state for clean testing
   */
  resetMockState(): void {
    this.isHealthy = true;
    this.startTime = new Date();
    this.lastHealthCheck = new Date();
    this.shouldFailHealthCheck = false;
    this.shouldFailOperations = false;

    this.metrics = {
      connectionPool: {
        active: 5,
        idle: 3,
        waiting: 0,
        total: 8,
      },
      performance: {
        averageQueryTime: 25,
        slowQueries: 2,
        totalQueries: 150,
        queriesPerSecond: 12.5,
      },
      health: {
        isConnected: true,
        lastHealthCheck: new Date(),
        uptime: 0,
        errorRate: 0.01,
      },
    };

    this.mockPrismaClient.resetMockState();
  }

  /**
   * Seed test data across multiple tables
   */
  seedTestData(_data: { [tableName: string]: DatabaseRecord[] }): void {
    Object.entries(data).forEach(([tableName, tableData]) => {
      this.mockPrismaClient.seedMockData(tableName, tableData);
    });
  }
}

// ============================================================================
// Mock Prisma Service
// ============================================================================

/**
 * Mock implementation of PrismaService
 */
export class MockPrismaService extends MockPrismaClient {
  private readonly serviceLogger = new Logger(MockPrismaService.name);
  private mockDatabaseService?: MockDatabaseService;

  constructor(mockDatabaseService?: MockDatabaseService) {
    super();
    this.mockDatabaseService = mockDatabaseService;
  }

  /**
   * Mock onModuleInit
   */
  async onModuleInit(): Promise<void> {
    this.serviceLogger.log('Mock Prisma service initialized');

    if (!this.mockDatabaseService) {
      await this.$connect();
    }
  }

  /**
   * Mock onModuleDestroy
   */
  async onModuleDestroy(): Promise<void> {
    this.serviceLogger.log('Mock Prisma service destroyed');

    if (!this.mockDatabaseService) {
      await this.$disconnect();
    }
  }

  /**
   * Get optimized client (returns self for mocking)
   */
  getOptimizedClient(): PrismaClient {
    if (this.mockDatabaseService) {
      return this.mockDatabaseService.getPrismaClient();
    }
    return this as unknown as PrismaClient;
  }

  /**
   * Execute query with automatic optimization routing
   */
  async executeQuery<T>(
    queryFn: (client: PrismaClient) => Promise<T>,
  ): Promise<T> {
    const client = this.getOptimizedClient();
    return await queryFn(client);
  }

  /**
   * Mock health status
   */
  async getHealthStatus() {
    if (this.mockDatabaseService) {
      return this.mockDatabaseService.getHealthStatus();
    }

    try {
      await this.$queryRaw`SELECT 1`;
      return {
        isHealthy: true,
        lastHealthCheck: new Date(),
        uptime: 0,
        connectionStatus: 'connected',
      };
    } catch (error) {
      return {
        isHealthy: false,
        lastHealthCheck: new Date(),
        uptime: 0,
        connectionStatus: 'disconnected',
        _error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Mock database metrics
   */
  getDatabaseMetrics() {
    if (this.mockDatabaseService) {
      return this.mockDatabaseService.getMetrics();
    }

    return {
      connectionPool: { active: 1, idle: 0, waiting: 0, total: 1 },
      performance: {
        averageQueryTime: 0,
        slowQueries: 0,
        totalQueries: 0,
        queriesPerSecond: 0,
      },
      health: {
        isConnected: true,
        lastHealthCheck: new Date(),
        uptime: 0,
        errorRate: 0,
      },
    };
  }
}

// ============================================================================
// Mock Connection Pool Config
// ============================================================================

/**
 * Mock implementation of ConnectionPoolConfig
 */
export class MockConnectionPoolConfig {
  private readonly logger = new Logger(MockConnectionPoolConfig.name);

  private mockOptions: ConnectionPoolOptions = {
    minConnections: 2,
    maxConnections: 10,
    acquireTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    testOnBorrow: true,
    testOnCreate: true,
    testWhileIdle: true,
    maxWaitingClients: 10,
    preparedStatements: true,
    statementTimeout: 30000,
    queryTimeout: 30000,
    connectionRetryAttempts: 3,
    connectionRetryDelay: 1000,
    evictionRunIntervalMillis: 30000,
    logQueries: false,
    logConnections: false,
    slowQueryThreshold: 1000,
  };

  /**
   * Mock validation
   */
  validateConfiguration(): void {
    this.logger.log('Mock connection pool configuration validated');
  }

  /**
   * Get mock connection pool options
   */
  getConnectionPoolOptions(): ConnectionPoolOptions {
    return { ...this.mockOptions };
  }

  /**
   * Get mock Prisma connection URL
   */
  getPrismaConnectionUrl(): string {
    return 'mock://localhost:5432/test_db?connection_limit=10&pool_timeout=5';
  }

  /**
   * Get mock metrics configuration
   */
  getMetricsConfig() {
    return {
      collectConnectionMetrics: true,
      metricsCollectionInterval: 30000,
    };
  }

  /**
   * Configure mock behavior
   */
  configureMockBehavior(_options: Partial<ConnectionPoolOptions>): void {
    this.mockOptions = { ...this.mockOptions, ...options };
  }

  /**
   * Reset to default configuration
   */
  resetMockConfig(): void {
    this.mockOptions = {
      minConnections: 2,
      maxConnections: 10,
      acquireTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      testOnBorrow: true,
      testOnCreate: true,
      testWhileIdle: true,
      maxWaitingClients: 10,
      preparedStatements: true,
      statementTimeout: 30000,
      queryTimeout: 30000,
      connectionRetryAttempts: 3,
      connectionRetryDelay: 1000,
      evictionRunIntervalMillis: 30000,
      logQueries: false,
      logConnections: false,
      slowQueryThreshold: 1000,
    };
  }
}

// ============================================================================
// Jest Mock Factories
// ============================================================================

/**
 * Create complete mock Prisma client for Jest tests
 */
export const createMockPrismaClient = (_options: MockBehaviorOptions = {}) => {
  const mockClient = new MockPrismaClient();
  mockClient.configureMockBehavior(options);

  return {
    ...mockClient,

    // Expose mock-specific methods for testing
    configureMockBehavior: (opts: MockBehaviorOptions) =>
      mockClient.configureMockBehavior(opts),
    getMockMetrics: () => mockClient.getMockMetrics(),
    resetMockState: () => mockClient.resetMockState(),
    seedMockData: (tableName: string, _data: DatabaseRecord[]) =>
      mockClient.seedMockData(tableName, data),
    getInMemoryDb: () => mockClient.getInMemoryDb(),
  };
};

/**
 * Create complete mock Database service for Jest tests
 */
export const createMockDatabaseService = (
  dependencies: {
    configService?: ConfigService;
    connectionPoolConfig?: MockConnectionPoolConfig;
  } = {},
) => {
  const mockService = new MockDatabaseService(
    dependencies.configService,
    dependencies.connectionPoolConfig as unknown as ConnectionPoolConfig,
  );

  return {
    onModuleInit: jest
      .fn()
      .mockImplementation(() => mockService.onModuleInit()),
    onModuleDestroy: jest
      .fn()
      .mockImplementation(() => mockService.onModuleDestroy()),
    getPrismaClient: jest
      .fn()
      .mockImplementation(() => mockService.getPrismaClient()),
    getMetrics: jest.fn().mockImplementation(() => mockService.getMetrics()),
    getHealthStatus: jest
      .fn()
      .mockImplementation(() => mockService.getHealthStatus()),
    executeRawQuery: jest
      .fn()
      .mockImplementation((query: string, params?: unknown[]) =>
        mockService.executeRawQuery(query, params),
      ),
    executeWithCircuitBreaker: jest
      .fn()
      .mockImplementation(
        (operation: () => Promise<unknown>, circuitName?: string) =>
          mockService.executeWithCircuitBreaker(operation, circuitName),
      ),
    executeWithRetry: jest
      .fn()
      .mockImplementation((operation: () => Promise<unknown>) =>
        mockService.executeWithRetry(operation),
      ),
    executeWithReliability: jest
      .fn()
      .mockImplementation(
        (operation: () => Promise<unknown>, circuitName?: string) =>
          mockService.executeWithReliability(operation, circuitName),
      ),
    executeRawQueryWithReliability: jest
      .fn()
      .mockImplementation((query: string, params?: unknown[]) =>
        mockService.executeRawQueryWithReliability(query, params),
      ),
    getReliabilityMetrics: jest
      .fn()
      .mockImplementation(() => mockService.getReliabilityMetrics()),

    // Expose mock-specific methods for testing
    configureMockBehavior: (_options: DatabaseServiceMockOptions) =>
      mockService.configureMockBehavior(options),
    performMockHealthCheck: () => mockService.performMockHealthCheck(),
    getMockPrismaClient: () => mockService.getMockPrismaClient(),
    resetMockState: () => mockService.resetMockState(),
    seedTestData: (_data: { [tableName: string]: DatabaseRecord[] }) =>
      mockService.seedTestData(data),
  };
};

/**
 * Create complete mock Prisma service for Jest tests
 */
export const createMockPrismaService = (
  mockDatabaseService?: MockDatabaseService,
) => {
  const mockService = new MockPrismaService(mockDatabaseService);

  return {
    ...mockService,

    onModuleInit: jest
      .fn()
      .mockImplementation(() => mockService.onModuleInit()),
    onModuleDestroy: jest
      .fn()
      .mockImplementation(() => mockService.onModuleDestroy()),
    getOptimizedClient: jest
      .fn()
      .mockImplementation(() => mockService.getOptimizedClient()),
    executeQuery: jest
      .fn()
      .mockImplementation(
        (queryFn: (client: PrismaClient) => Promise<unknown>) =>
          mockService.executeQuery(queryFn),
      ),
    getHealthStatus: jest
      .fn()
      .mockImplementation(() => mockService.getHealthStatus()),
    getDatabaseMetrics: jest
      .fn()
      .mockImplementation(() => mockService.getDatabaseMetrics()),

    // Expose parent mock methods
    configureMockBehavior: (opts: MockBehaviorOptions) =>
      mockService.configureMockBehavior(opts),
    resetMockState: () => mockService.resetMockState(),
    seedMockData: (tableName: string, _data: DatabaseRecord[]) =>
      mockService.seedMockData(tableName, data),
  };
};

/**
 * Create mock connection pool config for Jest tests
 */
export const createMockConnectionPoolConfig = () => {
  const mockConfig = new MockConnectionPoolConfig();

  return {
    validateConfiguration: jest
      .fn()
      .mockImplementation(() => mockConfig.validateConfiguration()),
    getConnectionPoolOptions: jest
      .fn()
      .mockImplementation(() => mockConfig.getConnectionPoolOptions()),
    getPrismaConnectionUrl: jest
      .fn()
      .mockImplementation(() => mockConfig.getPrismaConnectionUrl()),
    getMetricsConfig: jest
      .fn()
      .mockImplementation(() => mockConfig.getMetricsConfig()),

    // Expose mock-specific methods
    configureMockBehavior: (_options: Partial<ConnectionPoolOptions>) =>
      mockConfig.configureMockBehavior(options),
    resetMockConfig: () => mockConfig.resetMockConfig(),
  };
};

// ============================================================================
// Integration Helpers
// ============================================================================

/**
 * Create complete mock database ecosystem for integration testing
 */
export const createMockDatabaseEcosystem = (
  dependencies: {
    configService?: ConfigService;
  } = {},
) => {
  const connectionPoolConfig = createMockConnectionPoolConfig();
  const databaseService = createMockDatabaseService({
    configService: dependencies.configService,
    connectionPoolConfig:
      connectionPoolConfig as unknown as MockConnectionPoolConfig,
  });
  const prismaService = createMockPrismaService(
    databaseService as unknown as MockDatabaseService,
  );

  return {
    connectionPoolConfig,
    databaseService,
    prismaService,

    // Utility methods for ecosystem management
    configureEcosystem: (config: EcosystemMockConfig) => {
      databaseService.configureMockBehavior({
        shouldFailHealthCheck: config.shouldFailHealthCheck,
        shouldFailOperations: config.shouldFailOperations,
        customMetrics: config.customMetrics,
      });

      prismaService.configureMockBehavior({
        shouldFailConnection: config.shouldFailConnection,
        shouldFailQueries: config.shouldFailQueries,
        queryDelay: config.queryDelay,
        connectionDelay: config.connectionDelay,
      });
    },

    resetEcosystem: () => {
      connectionPoolConfig.resetMockConfig();
      databaseService.resetMockState();
      prismaService.resetMockState();
    },

    seedEcosystemData: (_data: { [tableName: string]: DatabaseRecord[] }) => {
      databaseService.seedTestData(data);
      Object.entries(data).forEach(([tableName, tableData]) => {
        prismaService.seedMockData(tableName, tableData);
      });
    },
  };
};

/**
 * Database performance testing utilities
 */
export const DatabaseMockPerformanceUtils = {
  /**
   * Simulate high-load database scenario
   */
  async simulateHighLoad(
    ecosystem: ReturnType<typeof createMockDatabaseEcosystem>,
    queryCount: number = 1000,
  ): Promise<{
    totalTime: number;
    averageTimePerQuery: number;
    successRate: number;
    queriesExecuted: number;
  }> {
    const startTime = Date.now();
    let successCount = 0;

    const queries = Array.from(
      { length: queryCount },
      (_, i) => `SELECT * FROM task WHERE id = 'test-${i}'`,
    );

    // Execute queries concurrently
    await Promise.allSettled(
      queries.map(async (query) => {
        try {
          await ecosystem.databaseService.executeRawQuery(query);
          successCount++;
        } catch {
          // Expected for some scenarios
        }
      }),
    );

    const totalTime = Date.now() - startTime;

    return {
      totalTime,
      averageTimePerQuery: totalTime / queryCount,
      successRate: successCount / queryCount,
      queriesExecuted: successCount,
    };
  },

  /**
   * Memory pressure simulation with large result sets
   */
  simulateMemoryPressure(
    ecosystem: ReturnType<typeof createMockDatabaseEcosystem>,
  ) {
    // Seed large datasets
    const largeDatasets = {
      Task: Array.from({ length: 10000 }, (_, i) => ({
        id: `task-${i}`,
        description: `Large task description ${i} `.repeat(100),
        type: 'GENERAL',
        status: 'PENDING',
        priority: 'MEDIUM',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      Message: Array.from({ length: 50000 }, (_, i) => ({
        id: `message-${i}`,
        taskId: `task-${i % 1000}`,
        role: 'USER',
        content: `Large message content ${i} `.repeat(200),
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };

    ecosystem.seedEcosystemData(largeDatasets);

    return {
      cleanup: () => {
        ecosystem.resetEcosystem();
      },
      getDatasetsSize: () => ({
        tasks: largeDatasets.Task.length,
        messages: largeDatasets.Message.length,
      }),
    };
  },

  /**
   * Transaction failure scenario simulation
   */
  simulateTransactionFailures(
    ecosystem: ReturnType<typeof createMockDatabaseEcosystem>,
  ) {
    // Configure ecosystem to fail operations randomly
    let shouldFail = false;

    const originalExecuteRawQuery = ecosystem.databaseService.executeRawQuery;
    ecosystem.databaseService.executeRawQuery = jest
      .fn()
      .mockImplementation((query: string, params?: unknown[]) => {
        if (shouldFail && Math.random() < 0.3) {
          // 30% failure rate
          throw new Error('Mock transaction failure');
        }
        const _result: unknown = originalExecuteRawQuery.call(
          ecosystem.databaseService,
          query,
          params,
        );
        return result;
      });

    return {
      enableFailures: () => {
        shouldFail = true;
      },
      disableFailures: () => {
        shouldFail = false;
      },
      cleanup: () => {
        ecosystem.databaseService.executeRawQuery = originalExecuteRawQuery;
        ecosystem.resetEcosystem();
      },
    };
  },
};
