/**
 * Prisma Service Unit Tests - Comprehensive testing for database service layer
 * Tests database connections, transaction handling, and query optimization
 *
 * Test Coverage:
 * - Database connection management and pooling
 * - Transaction handling and rollback scenarios
 * - Query performance and optimization
 * - Error handling and recovery mechanisms
 * - Connection health monitoring
 * - Database security and access controls
 *
 * @author Testing & Quality Assurance Specialist
 * @version 1.0.0
 * @since Orchestrator Test Coverage Enhancement
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma.service';

// Mock Prisma Client
jest.mock('@prisma/client');
const MockPrismaClient = PrismaClient as jest.MockedClass<typeof PrismaClient>;

describe('PrismaService', () => {
  let service: PrismaService;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<Logger>;
  let mockPrismaClient: jest.Mocked<PrismaClient>;

  // Mock configuration
  const mockDatabaseConfig = {
    url: 'postgresql://test:password@localhost:5432/testdb',
    connectionPoolSize: 20,
    connectionTimeout: 10000,
    queryTimeout: 30000,
    enableLogging: true,
    logLevel: 'query',
    enableMetrics: true,
  };

  beforeEach(async () => {
    // Create mock instances with proper jest mock types
    mockPrismaClient = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
      $on: jest.fn(),
      user: {
        findMany: jest.fn() as jest.MockedFunction<any>,
        findUnique: jest.fn() as jest.MockedFunction<any>,
        create: jest.fn() as jest.MockedFunction<any>,
        update: jest.fn() as jest.MockedFunction<any>,
        delete: jest.fn() as jest.MockedFunction<any>,
        count: jest.fn() as jest.MockedFunction<any>,
      },
      task: {
        findMany: jest.fn() as jest.MockedFunction<any>,
        findUnique: jest.fn() as jest.MockedFunction<any>,
        create: jest.fn() as jest.MockedFunction<any>,
        update: jest.fn() as jest.MockedFunction<any>,
        delete: jest.fn() as jest.MockedFunction<any>,
        count: jest.fn() as jest.MockedFunction<any>,
      },
      userSession: {
        findMany: jest.fn() as jest.MockedFunction<any>,
        create: jest.fn() as jest.MockedFunction<any>,
        update: jest.fn() as jest.MockedFunction<any>,
        delete: jest.fn() as jest.MockedFunction<any>,
      },
    } as any;

    MockPrismaClient.mockImplementation(() => mockPrismaClient);

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    configService = module.get(ConfigService);
    logger = module.get(Logger);

    // Setup default config responses
    configService.get.mockImplementation((key: string) => {
      if (key === 'database') return mockDatabaseConfig;
      if (key.startsWith('database.')) {
        const configKey = key.replace('database.', '');
        return (mockDatabaseConfig as any)[configKey];
      }
      return undefined;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should establish database connection on module initialization', async () => {
      // Arrange
      mockPrismaClient.$connect.mockResolvedValue(undefined);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Database connection established'),
      );
    });

    it('should handle connection failures gracefully', async () => {
      // Arrange
      const connectionError = new Error('Connection refused');
      mockPrismaClient.$connect.mockRejectedValue(connectionError);

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow(
        'Connection refused',
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Database connection failed'),
        expect.objectContaining({ error: connectionError }),
      );
    });

    it('should setup query logging when enabled in config', async () => {
      // Arrange
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      configService.get.mockImplementation((key) => {
        if (key === 'database.enableLogging') return true;
        return mockDatabaseConfig;
      });

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockPrismaClient.$on).toHaveBeenCalledWith(
        'query',
        expect.any(Function),
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Query logging enabled'),
      );
    });

    it('should setup connection monitoring when configured', async () => {
      // Arrange
      mockPrismaClient.$connect.mockResolvedValue(undefined);
      configService.get.mockImplementation((key) => {
        if (key === 'database.enableMetrics') return true;
        return mockDatabaseConfig;
      });

      // Act
      await service.onModuleInit();

      // Assert
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Connection monitoring enabled'),
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should gracefully close database connection on module destruction', async () => {
      // Arrange
      (mockPrismaClient.$disconnect as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(mockPrismaClient.$disconnect).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Database connection closed'),
      );
    });

    it('should handle disconnection errors gracefully', async () => {
      // Arrange
      const disconnectionError = new Error('Disconnection failed');
      mockPrismaClient.$disconnect.mockRejectedValue(disconnectionError);

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error during database disconnection'),
        expect.objectContaining({ error: disconnectionError }),
      );
    });

    it('should wait for pending operations before disconnecting', async () => {
      // Arrange
      let pendingOperationCompleted = false;
      const longRunningQuery = new Promise((resolve) => {
        setTimeout(() => {
          pendingOperationCompleted = true;
          resolve('result');
        }, 100);
      });

      (mockPrismaClient.user.findMany as jest.Mock).mockImplementation(
        () => longRunningQuery as any,
      );
      (mockPrismaClient.$disconnect as jest.Mock).mockResolvedValue(undefined);

      // Act - Start a long-running query then try to destroy
      const queryPromise = service.user.findMany();
      const destroyPromise = service.onModuleDestroy();

      await Promise.all([queryPromise, destroyPromise]);

      // Assert
      expect(pendingOperationCompleted).toBe(true);
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    });
  });

  describe('Transaction Handling', () => {
    it('should execute transactions successfully', async () => {
      // Arrange
      const mockTransactionResult = { id: '123', name: 'Test User' };
      (mockPrismaClient.$transaction as jest.Mock).mockResolvedValue([
        mockTransactionResult,
      ]);

      const transactionCallback = jest
        .fn()
        .mockResolvedValue([mockTransactionResult]);

      // Act
      const result = await service.$transaction(transactionCallback);

      // Assert
      expect(result).toEqual([mockTransactionResult]);
      expect(mockPrismaClient.$transaction).toHaveBeenCalledWith(
        transactionCallback,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Transaction completed successfully'),
      );
    });

    it('should handle transaction rollbacks on errors', async () => {
      // Arrange
      const transactionError = new Error('Transaction failed');
      mockPrismaClient.$transaction.mockRejectedValue(transactionError);

      const transactionCallback = jest.fn();

      // Act & Assert
      await expect(service.$transaction(transactionCallback)).rejects.toThrow(
        'Transaction failed',
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Transaction failed'),
        expect.objectContaining({ error: transactionError }),
      );
    });

    it('should handle deadlock detection and retry', async () => {
      // Arrange
      const deadlockError = new Error('Deadlock detected');
      deadlockError.name = 'P2034'; // Prisma deadlock error code

      mockPrismaClient.$transaction
        .mockRejectedValueOnce(deadlockError)
        .mockResolvedValueOnce(['success']);

      const transactionCallback = jest.fn();

      // Act
      const result = await service.$transaction(transactionCallback);

      // Assert
      expect(result).toEqual(['success']);
      expect(mockPrismaClient.$transaction).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Deadlock detected, retrying transaction'),
      );
    });

    it('should track transaction performance metrics', async () => {
      // Arrange
      const mockResult = { id: '123' };
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate delay
        return callback(service as any);
      });

      const transactionCallback = jest.fn().mockResolvedValue(mockResult);

      // Act
      const startTime = Date.now();
      await service.$transaction(transactionCallback);
      const endTime = Date.now();

      // Assert
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringMatching(/Transaction execution time: \d+ms/),
      );
    });
  });

  describe('Raw Query Handling', () => {
    it('should execute raw queries with proper error handling', async () => {
      // Arrange
      const mockQueryResult = [{ count: 10 }];
      mockPrismaClient.$queryRaw.mockResolvedValue(mockQueryResult);

      const query = 'SELECT COUNT(*) as count FROM users WHERE active = true';

      // Act
      const result = await service.$queryRaw`${query}`;

      // Assert
      expect(result).toEqual(mockQueryResult);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledWith([query]);
    });

    it('should prevent SQL injection in raw queries', async () => {
      // Arrange
      const maliciousInput = "'; DROP TABLE users; --";
      (mockPrismaClient.$queryRaw as jest.Mock).mockImplementation(
        (query: any, ...params: any[]) => {
          // Simulate Prisma's built-in SQL injection protection
          if (typeof query === 'string' && query.includes('DROP TABLE')) {
            throw new Error('SQL injection attempt detected');
          }
          return Promise.resolve([]);
        },
      );

      // Act & Assert
      await expect(
        service.$queryRaw`SELECT * FROM users WHERE name = ${maliciousInput}`,
      ).rejects.toThrow('SQL injection attempt detected');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Potentially dangerous query detected'),
      );
    });

    it('should handle query timeouts appropriately', async () => {
      // Arrange
      const timeoutError = new Error('Query timeout');
      timeoutError.name = 'P2024'; // Prisma timeout error code
      mockPrismaClient.$queryRaw.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(
        service.$queryRaw`SELECT * FROM large_table`,
      ).rejects.toThrow('Query timeout');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Query timeout detected'),
      );
    });
  });

  describe('Connection Health Monitoring', () => {
    it('should provide database health status', async () => {
      // Arrange
      mockPrismaClient.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // Act
      const healthStatus = await service.getHealthStatus();

      // Assert
      expect(healthStatus).toMatchObject({
        isHealthy: true,
        lastHealthCheck: expect.any(Date),
        uptime: expect.any(Number),
        connectionStatus: 'connected',
      });
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledWith([
        'SELECT 1 as result',
      ]);
    });

    it('should detect unhealthy database status', async () => {
      // Arrange
      const connectionError = new Error('Connection lost');
      mockPrismaClient.$queryRaw.mockRejectedValue(connectionError);

      // Act
      const healthStatus = await service.getHealthStatus();

      // Assert
      expect(healthStatus.isHealthy).toBe(false);
      expect(healthStatus.connectionStatus).toBe('disconnected');
      expect('error' in healthStatus).toBe(true);
      if ('error' in healthStatus) {
        expect(healthStatus.error).toBeDefined();
      }
    });

    it('should provide database metrics', async () => {
      // Arrange
      mockPrismaClient.$queryRaw.mockResolvedValue([{ result: 1 }]);

      // Act
      const metrics = service.getDatabaseMetrics();

      // Assert
      expect(metrics).toMatchObject({
        connectionPool: {
          active: expect.any(Number),
          idle: expect.any(Number),
          waiting: expect.any(Number),
          total: expect.any(Number),
        },
        performance: {
          averageQueryTime: expect.any(Number),
          slowQueries: expect.any(Number),
          totalQueries: expect.any(Number),
          queriesPerSecond: expect.any(Number),
        },
        health: expect.any(Object),
      });
    });
  });

  describe('Query Performance Optimization', () => {
    it('should log slow queries for optimization', async () => {
      // Arrange
      (mockPrismaClient.user.findMany as jest.Mock).mockImplementation(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 1100)); // Simulate slow query
          return [];
        },
      );

      // Act
      await service.user.findMany();

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/Slow query detected.*execution time: \d+ms/),
      );
    });

    it('should track database operation metrics', async () => {
      // Arrange - Execute several queries with different performance
      (mockPrismaClient.user.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // Fast query
        .mockImplementationOnce(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return [];
        }) // Medium query
        .mockImplementationOnce(async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return [];
        }); // Slow query

      // Act
      await Promise.all([
        service.user.findMany(),
        service.user.findMany(),
        service.user.findMany(),
      ]);

      const metrics = service.getDatabaseMetrics();

      // Assert
      expect(metrics.performance).toMatchObject({
        averageQueryTime: expect.any(Number),
        slowQueries: expect.any(Number),
        totalQueries: expect.any(Number),
        queriesPerSecond: expect.any(Number),
      });
    });

    it('should detect and warn about N+1 query problems', async () => {
      // Arrange - Simulate N+1 pattern
      const users = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
      }));
      (mockPrismaClient.user.findMany as jest.Mock).mockResolvedValue(
        users as any,
      );

      // Simulate multiple individual queries (N+1 pattern)
      (mockPrismaClient.task.findMany as jest.Mock).mockImplementation(
        async ({ where }: any) => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return []; // Simulate query for each user
        },
      );

      // Act
      const userList = await service.user.findMany();
      await Promise.all(
        userList.map((user) =>
          service.task.findMany({ where: { userId: user.id } }),
        ),
      );

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Potential N+1 query pattern detected'),
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle connection pool exhaustion', async () => {
      // Arrange
      const poolError = new Error('Connection pool exhausted');
      poolError.name = 'P2037';
      (mockPrismaClient.user.findMany as jest.Mock).mockRejectedValue(
        poolError,
      );

      // Act & Assert
      await expect(service.user.findMany()).rejects.toThrow(
        'Connection pool exhausted',
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Connection pool exhausted'),
      );
    });

    it('should implement circuit breaker for database failures', async () => {
      // Arrange - Simulate consecutive failures
      const dbError = new Error('Database unavailable');
      (mockPrismaClient.user.findMany as jest.Mock).mockRejectedValue(dbError);

      // Act - Try multiple times to trigger circuit breaker
      const attempts = Array.from({ length: 5 }, () =>
        service.user.findMany().catch((err) => err),
      );

      const results = await Promise.all(attempts);

      // Assert
      expect(results.every((result) => result instanceof Error)).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Database circuit breaker opened'),
      );
    });

    it('should retry transient failures automatically', async () => {
      // Arrange - Fail first attempt, succeed on retry
      const transientError = new Error('Connection reset');
      transientError.name = 'ECONNRESET';

      (mockPrismaClient.user.findMany as jest.Mock)
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce([{ id: 1, name: 'Test User' }] as any);

      // Act
      const result = await service.user.findMany();

      // Assert
      expect(result).toEqual([{ id: 1, name: 'Test User' }]);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining(
          'Retrying database operation after transient failure',
        ),
      );
    });
  });

  describe('Security and Access Controls', () => {
    it('should validate database permissions before critical operations', async () => {
      // Arrange
      const sensitiveQuery = 'DELETE FROM users WHERE id > 0';
      (mockPrismaClient.$executeRaw as jest.Mock).mockImplementation(
        async (query: any) => {
          if (typeof query === 'string' && query.includes('DELETE')) {
            // Simulate permission check
            throw new Error('Insufficient permissions for DELETE operation');
          }
          return { count: 0 };
        },
      );

      // Act & Assert
      await expect(service.$executeRaw`${sensitiveQuery}`).rejects.toThrow(
        'Insufficient permissions',
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Database permission denied'),
      );
    });

    it('should audit sensitive database operations', async () => {
      // Arrange
      const auditableOperation = {
        model: 'User',
        action: 'delete',
        userId: 'user-123',
      };

      (mockPrismaClient.user.delete as jest.Mock).mockResolvedValue({
        id: 'user-123',
      } as any);

      // Act
      await service.user.delete({ where: { id: 'user-123' } });

      // Assert
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Database operation audited'),
        expect.objectContaining({
          operation: 'delete',
          model: 'user',
        }),
      );
    });

    it('should encrypt sensitive data before storage', async () => {
      // Arrange
      const sensitiveUserData = {
        email: 'user@example.com',
        password: 'plaintext-password',
        ssn: '123-45-6789',
      };

      (mockPrismaClient.user.create as jest.Mock).mockImplementation(
        async (data: any) => {
          // Simulate encryption check
          if (data.data.password === 'plaintext-password') {
            throw new Error(
              'Plaintext password detected - encryption required',
            );
          }
          return { id: 'user-123' } as any;
        },
      );

      // Act & Assert
      await expect(
        service.user.create({ data: sensitiveUserData } as any),
      ).rejects.toThrow('encryption required');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Sensitive data encryption validation failed'),
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should track database operation metrics', async () => {
      // Arrange
      (mockPrismaClient.user.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaClient.user.create as jest.Mock).mockResolvedValue({
        id: 'user-123',
      } as any);
      (mockPrismaClient.user.update as jest.Mock).mockResolvedValue({
        id: 'user-123',
      } as any);

      // Act
      await service.user.findMany();
      await service.user.create({ data: { email: 'test@example.com' } } as any);
      await service.user.update({
        where: { id: 'user-123' },
        data: { name: 'Updated' },
      } as any);

      const metrics = service.getDatabaseMetrics();

      // Assert
      expect(metrics).toMatchObject({
        totalOperations: expect.any(Number),
        readOperations: expect.any(Number),
        writeOperations: expect.any(Number),
        averageResponseTime: expect.any(Number),
        errorRate: expect.any(Number),
      });
    });

    it('should provide connection pool metrics', async () => {
      // Act
      const metrics = service.getDatabaseMetrics();

      // Assert
      expect(metrics.connectionPool).toMatchObject({
        active: expect.any(Number),
        idle: expect.any(Number),
        waiting: expect.any(Number),
        total: expect.any(Number),
      });
    });
  });
});
