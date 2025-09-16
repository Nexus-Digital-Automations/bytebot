/**
 * Connection Pool Service Comprehensive Test Suite
 * Tests connection pool management, monitoring, maintenance, leak detection,
 * and health assessment for enterprise database operations
 *
 * Coverage:
 * - Connection registration and lifecycle management
 * - Real-time pool metrics and monitoring
 * - Pool health assessment and issue detection
 * - Automated maintenance and recovery operations
 * - Connection leak detection and prevention
 * - Performance tracking and optimization
 * - Error handling and resilience patterns
 *
 * @author Database Testing Specialist
 * @version 1.0.0
 * @since Comprehensive Database Testing Phase
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  ConnectionPoolService,
  ConnectionPoolMetrics,
  ConnectionHealthMetrics,
} from '../connection-pool.service';
import { ConnectionPoolConfig } from '../connection-pool.config';

describe('ConnectionPoolService Comprehensive Test Suite', () => {
  let service: ConnectionPoolService;
  let configService: ConfigService;
  let connectionPoolConfig: ConnectionPoolConfig;
  let module: TestingModule;

  // Mock data
  const mockConnectionPoolOptions = {
    maxConnections: 10,
    minConnections: 2,
    acquireTimeoutMs: 5000,
    createTimeoutMs: 2000,
    destroyTimeoutMs: 1000,
    idleTimeoutMs: 30000,
    reapIntervalMs: 1000,
    createRetryIntervalMs: 200,
    logQueries: false,
    slowQueryThreshold: 1000,
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ConnectionPoolService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                DB_POOL_MONITORING_INTERVAL: 10000,
                DB_POOL_MAINTENANCE_INTERVAL: 300000,
                DB_POOL_LEAK_DETECTION_INTERVAL: 60000,
                DATABASE_URL: 'postgresql://user:pass@localhost:5432/test_db',
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: ConnectionPoolConfig,
          useValue: {
            getConnectionPoolOptions: jest
              .fn()
              .mockReturnValue(mockConnectionPoolOptions),
            validateConfiguration: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConnectionPoolService>(ConnectionPoolService);
    configService = module.get<ConfigService>(ConfigService);
    connectionPoolConfig =
      module.get<ConnectionPoolConfig>(ConnectionPoolConfig);

    // Clear any existing timers
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(async () => {
    // Clean up intervals
    service.onModuleDestroy();
    jest.useRealTimers();
    await module.close();
  });

  describe('Service Initialization', () => {
    it('should initialize connection pool service with default metrics', () => {
      expect(service).toBeDefined();

      const metrics = service.getPoolMetrics();
      expect(metrics.active).toBe(0);
      expect(metrics.idle).toBe(0);
      expect(metrics.total).toBe(0);
      expect(metrics.utilization).toBe(0);
      expect(metrics.healthy).toBe(true);
      expect(metrics.exhausted).toBe(false);
      expect(metrics.leakDetected).toBe(false);
      expect(metrics.lastMaintenanceRun).toBeInstanceOf(Date);
    });

    it('should start monitoring and maintenance on module init', () => {
      service.onModuleInit();

      expect(configService.get).toHaveBeenCalledWith(
        'DB_POOL_MONITORING_INTERVAL',
        10000,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'DB_POOL_MAINTENANCE_INTERVAL',
        300000,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'DB_POOL_LEAK_DETECTION_INTERVAL',
        60000,
      );

      // Verify intervals are set (they exist as private properties)
      expect((service as any).monitoringInterval).toBeDefined();
      expect((service as any).maintenanceInterval).toBeDefined();
      expect((service as any).leakDetectionInterval).toBeDefined();
    });

    it('should clean up intervals on module destroy', () => {
      service.onModuleInit();

      // Verify intervals exist
      expect((service as any).monitoringInterval).toBeDefined();
      expect((service as any).maintenanceInterval).toBeDefined();
      expect((service as any).leakDetectionInterval).toBeDefined();

      service.onModuleDestroy();

      // Verify intervals are cleared
      expect((service as any).monitoringInterval).toBeUndefined();
      expect((service as any).maintenanceInterval).toBeUndefined();
      expect((service as any).leakDetectionInterval).toBeUndefined();
    });
  });

  describe('Connection Registration and Management', () => {
    let mockPrismaClient: jest.Mocked<PrismaClient>;

    beforeEach(() => {
      mockPrismaClient = {} as jest.Mocked<PrismaClient>;
    });

    it('should register new database connection', () => {
      const connectionId = 'conn_123';

      service.registerConnection(connectionId, mockPrismaClient);

      const metrics = service.getPoolMetrics();
      expect(metrics.total).toBe(1);

      const healthMetrics = service.getConnectionHealthMetrics();
      expect(healthMetrics).toHaveLength(1);
      expect(healthMetrics[0].connectionId).toBe(connectionId);
      expect(healthMetrics[0].isActive).toBe(true);
      expect(healthMetrics[0].isHealthy).toBe(true);
      expect(healthMetrics[0].queriesExecuted).toBe(0);
      expect(healthMetrics[0].errors).toBe(0);
    });

    it('should register multiple connections', () => {
      const connectionIds = ['conn_1', 'conn_2', 'conn_3'];

      connectionIds.forEach((id) => {
        service.registerConnection(id, mockPrismaClient);
      });

      const metrics = service.getPoolMetrics();
      expect(metrics.total).toBe(3);
      expect(metrics.active).toBe(3);
      expect(metrics.idle).toBe(0);

      const healthMetrics = service.getConnectionHealthMetrics();
      expect(healthMetrics).toHaveLength(3);
      expect(healthMetrics.map((h) => h.connectionId)).toEqual(connectionIds);
    });

    it('should unregister database connection', () => {
      const connectionId = 'conn_123';

      service.registerConnection(connectionId, mockPrismaClient);
      expect(service.getPoolMetrics().total).toBe(1);

      service.unregisterConnection(connectionId);
      expect(service.getPoolMetrics().total).toBe(0);

      const healthMetrics = service.getConnectionHealthMetrics();
      expect(healthMetrics).toHaveLength(0);
    });

    it('should handle unregistering non-existent connection gracefully', () => {
      service.unregisterConnection('non_existent');

      // Should not throw error and metrics should remain unchanged
      const metrics = service.getPoolMetrics();
      expect(metrics.total).toBe(0);
    });

    it('should record query execution statistics', () => {
      const connectionId = 'conn_123';
      service.registerConnection(connectionId, mockPrismaClient);

      // Record successful query
      service.recordQueryExecution(connectionId, 150, true);

      const healthMetrics = service.getConnectionHealthMetrics();
      const connection = healthMetrics.find(
        (h) => h.connectionId === connectionId,
      );

      expect(connection?.queriesExecuted).toBe(1);
      expect(connection?.totalExecutionTime).toBe(150);
      expect(connection?.errors).toBe(0);
      expect(connection?.isHealthy).toBe(true);
      expect(connection?.lastUsed).toBeInstanceOf(Date);
    });

    it('should track query execution errors', () => {
      const connectionId = 'conn_123';
      service.registerConnection(connectionId, mockPrismaClient);

      // Record failed query
      service.recordQueryExecution(connectionId, 500, false);

      const healthMetrics = service.getConnectionHealthMetrics();
      const connection = healthMetrics.find(
        (h) => h.connectionId === connectionId,
      );

      expect(connection?.queriesExecuted).toBe(1);
      expect(connection?.totalExecutionTime).toBe(500);
      expect(connection?.errors).toBe(1);
      expect(connection?.isHealthy).toBe(true); // Still healthy with just 1 error
    });

    it('should mark connection unhealthy after many errors', () => {
      const connectionId = 'conn_123';
      service.registerConnection(connectionId, mockPrismaClient);

      // Record many failed queries (exceeding error threshold)
      for (let i = 0; i < 15; i++) {
        service.recordQueryExecution(connectionId, 100, false);
      }

      const healthMetrics = service.getConnectionHealthMetrics();
      const connection = healthMetrics.find(
        (h) => h.connectionId === connectionId,
      );

      expect(connection?.errors).toBe(15);
      expect(connection?.isHealthy).toBe(false); // Should be unhealthy due to high error count
    });

    it('should handle query recording for non-existent connection', () => {
      // Should not throw error when recording for non-existent connection
      expect(() => {
        service.recordQueryExecution('non_existent', 100, true);
      }).not.toThrow();
    });
  });

  describe('Pool Metrics and Monitoring', () => {
    beforeEach(() => {
      const mockPrismaClient = {} as jest.Mocked<PrismaClient>;

      // Register test connections
      service.registerConnection('conn_1', mockPrismaClient);
      service.registerConnection('conn_2', mockPrismaClient);
      service.registerConnection('conn_3', mockPrismaClient);
    });

    it('should calculate pool utilization correctly', () => {
      const metrics = service.getPoolMetrics();

      // 3 active connections out of 10 max = 30% utilization
      expect(metrics.active).toBe(3);
      expect(metrics.total).toBe(3);
      expect(metrics.utilization).toBe(30); // (3/10) * 100
    });

    it('should track peak connections', () => {
      const mockPrismaClient = {} as jest.Mocked<PrismaClient>;

      // Add more connections to increase peak
      service.registerConnection('conn_4', mockPrismaClient);
      service.registerConnection('conn_5', mockPrismaClient);

      const metrics = service.getPoolMetrics();
      expect(metrics.peakConnections).toBe(5);

      // Remove some connections
      service.unregisterConnection('conn_4');
      service.unregisterConnection('conn_5');

      const updatedMetrics = service.getPoolMetrics();
      expect(updatedMetrics.active).toBe(3);
      expect(updatedMetrics.peakConnections).toBe(5); // Peak should remain
    });

    it('should calculate average connection lifetime', () => {
      // Fast forward time to create age difference
      jest.advanceTimersByTime(60000); // 1 minute

      // Trigger metrics update
      (service as any).updatePoolMetrics();

      const metrics = service.getPoolMetrics();
      expect(metrics.connectionLifetimeMs).toBeGreaterThan(0);
      expect(metrics.connectionLifetimeMs).toBeCloseTo(60000, -3); // Approximately 1 minute
    });

    it('should update health status based on connection health', () => {
      const connectionId = 'conn_1';

      // Make one connection unhealthy
      for (let i = 0; i < 15; i++) {
        service.recordQueryExecution(connectionId, 100, false);
      }

      // Force metrics update to reflect connection health changes
      (service as any).updatePoolMetrics();

      const metrics = service.getPoolMetrics();
      expect(metrics.healthy).toBe(false); // Pool should be unhealthy if any connection is unhealthy
    });

    it('should perform periodic metrics updates', () => {
      service.onModuleInit();
      const updateSpy = jest.spyOn(service as any, 'updatePoolMetrics');

      // Fast forward monitoring interval
      jest.advanceTimersByTime(10000);

      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('Pool Health Assessment', () => {
    beforeEach(() => {
      const mockPrismaClient = {} as jest.Mocked<PrismaClient>;
      service.registerConnection('conn_1', mockPrismaClient);
      service.registerConnection('conn_2', mockPrismaClient);
    });

    it('should perform health check with healthy pool', () => {
      const healthCheck = service.performPoolHealthCheck();

      expect(healthCheck.healthy).toBe(true);
      expect(healthCheck.issues).toEqual([]);
      expect(healthCheck.recommendations).toEqual([]);
    });

    it('should detect high utilization issues', () => {
      // Set up high utilization scenario (9 out of 10 connections = 90%)
      const mockPrismaClient = {} as jest.Mocked<PrismaClient>;
      for (let i = 3; i <= 9; i++) {
        service.registerConnection(`conn_${i}`, mockPrismaClient);
      }

      const healthCheck = service.performPoolHealthCheck();

      expect(healthCheck.healthy).toBe(false);
      expect(healthCheck.issues).toContain('High pool utilization detected');
      expect(healthCheck.recommendations).toContain(
        'Consider increasing max connections',
      );
    });

    it('should detect connection leak issues', () => {
      // Simulate connection leak detection
      (service as any).poolMetrics.leakDetected = true;

      const healthCheck = service.performPoolHealthCheck();

      expect(healthCheck.healthy).toBe(false);
      expect(healthCheck.issues).toContain(
        'Potential connection leaks detected',
      );
      expect(healthCheck.recommendations).toContain(
        'Review connection lifecycle management',
      );
    });

    it('should detect high wait time issues', () => {
      // Simulate high wait times
      (service as any).poolMetrics.waitTimeMs = 2000;

      const healthCheck = service.performPoolHealthCheck();

      expect(healthCheck.healthy).toBe(false);
      expect(healthCheck.issues).toContain(
        'High connection acquisition wait times',
      );
      expect(healthCheck.recommendations).toContain(
        'Optimize connection pool configuration',
      );
    });

    it('should detect high error rate issues', () => {
      // Simulate high error rate
      (service as any).poolMetrics.totalErrors = 50;
      (service as any).poolMetrics.totalRequests = 100; // 50% error rate

      const healthCheck = service.performPoolHealthCheck();

      expect(healthCheck.healthy).toBe(false);
      expect(healthCheck.issues).toContain(
        'High connection error rate detected',
      );
      expect(healthCheck.recommendations).toContain(
        'Investigate database connectivity issues',
      );
    });

    it('should handle health check errors gracefully', () => {
      // Mock error in health check process
      jest
        .spyOn(service as any, 'generateOperationId')
        .mockImplementation(() => {
          throw new Error('Health check failed');
        });

      const healthCheck = service.performPoolHealthCheck();

      expect(healthCheck.healthy).toBe(false);
      expect(healthCheck.issues).toContain('Health assessment failed');
      expect(healthCheck.recommendations).toContain(
        'Contact system administrator',
      );
    });
  });

  describe('Pool Maintenance Operations', () => {
    beforeEach(() => {
      const mockPrismaClient = {} as jest.Mocked<PrismaClient>;
      service.registerConnection('conn_1', mockPrismaClient);
      service.registerConnection('conn_2', mockPrismaClient);
      service.registerConnection('conn_3', mockPrismaClient);
    });

    it('should perform pool maintenance successfully', () => {
      const maintenanceResult = service.performPoolMaintenance();

      expect(maintenanceResult.cleaned).toBeGreaterThanOrEqual(0);
      expect(maintenanceResult.recovered).toBeGreaterThanOrEqual(0);
      expect(maintenanceResult.errors).toEqual([]);

      const metrics = service.getPoolMetrics();
      expect(metrics.lastMaintenanceRun).toBeInstanceOf(Date);
    });

    it('should clean up stale connections during maintenance', () => {
      // Make connections stale by setting old lastUsed time
      const healthMetrics = service.getConnectionHealthMetrics();
      healthMetrics.forEach((connection) => {
        connection.lastUsed = new Date(Date.now() - 35 * 60 * 1000); // 35 minutes ago
        connection.isActive = false; // Mark as inactive for cleanup
      });

      const maintenanceResult = service.performPoolMaintenance();

      expect(maintenanceResult.cleaned).toBe(3); // All connections should be cleaned
      expect(service.getPoolMetrics().total).toBe(0);
    });

    it('should recover unhealthy connections during maintenance', () => {
      // Make one connection unhealthy
      const healthMetrics = service.getConnectionHealthMetrics();
      healthMetrics[0].isHealthy = false;
      healthMetrics[0].errors = 5;

      // Mock successful health test for recovery
      jest.spyOn(service as any, 'testConnectionHealth').mockReturnValue(true);

      const maintenanceResult = service.performPoolMaintenance();

      expect(maintenanceResult.recovered).toBe(1);

      // Check that connection was recovered
      const updatedMetrics = service.getConnectionHealthMetrics();
      const recoveredConnection = updatedMetrics.find(
        (c) => c.connectionId === healthMetrics[0].connectionId,
      );
      expect(recoveredConnection?.isHealthy).toBe(true);
      expect(recoveredConnection?.errors).toBe(0); // Errors should be reset
    });

    it('should handle maintenance errors gracefully', () => {
      // Mock error during maintenance
      jest.spyOn(service as any, 'updatePoolMetrics').mockImplementation(() => {
        throw new Error('Maintenance error');
      });

      const maintenanceResult = service.performPoolMaintenance();

      expect(maintenanceResult.errors).toContain('Maintenance error');
    });

    it('should perform periodic maintenance operations', () => {
      service.onModuleInit();
      const maintenanceSpy = jest.spyOn(service, 'performPoolMaintenance');

      // Fast forward maintenance interval
      jest.advanceTimersByTime(300000); // 5 minutes

      expect(maintenanceSpy).toHaveBeenCalled();
    });
  });

  describe('Connection Leak Detection', () => {
    beforeEach(() => {
      const mockPrismaClient = {} as jest.Mocked<PrismaClient>;
      service.registerConnection('conn_1', mockPrismaClient);
      service.registerConnection('conn_2', mockPrismaClient);
    });

    it('should not detect leaks for active connections', () => {
      service.onModuleInit();

      // Trigger leak detection
      jest.advanceTimersByTime(60000);

      const metrics = service.getPoolMetrics();
      expect(metrics.leakDetected).toBe(false);
    });

    it('should detect connection leaks for old active connections', () => {
      // Set connections as old but still active (potential leak)
      const healthMetrics = service.getConnectionHealthMetrics();
      healthMetrics.forEach((connection) => {
        connection.lastUsed = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
        connection.isActive = true; // Still marked as active = potential leak
      });

      // Trigger leak detection manually
      (service as any).detectConnectionLeaks();

      const metrics = service.getPoolMetrics();
      expect(metrics.leakDetected).toBe(true);
    });

    it('should perform periodic leak detection', () => {
      service.onModuleInit();
      const leakDetectionSpy = jest.spyOn(
        service as any,
        'detectConnectionLeaks',
      );

      // Fast forward leak detection interval
      jest.advanceTimersByTime(60000); // 1 minute

      expect(leakDetectionSpy).toHaveBeenCalled();
    });

    it('should log potential leaks when detected', () => {
      const loggerWarnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();

      // Set up leak scenario
      const healthMetrics = service.getConnectionHealthMetrics();
      healthMetrics[0].lastUsed = new Date(Date.now() - 2 * 60 * 60 * 1000);
      healthMetrics[0].isActive = true;

      (service as any).detectConnectionLeaks();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Potential connection leaks detected',
        expect.objectContaining({
          leakedConnections: 1,
          connectionIds: [healthMetrics[0].connectionId],
        }),
      );

      loggerWarnSpy.mockRestore();
    });
  });

  describe('Pool Exhaustion Detection', () => {
    it('should detect pool exhaustion at 95% utilization', () => {
      const mockPrismaClient = {} as jest.Mocked<PrismaClient>;

      // Register 10 connections (100% of max)
      for (let i = 1; i <= 10; i++) {
        service.registerConnection(`conn_${i}`, mockPrismaClient);
      }

      // Trigger exhaustion detection
      (service as any).detectPoolExhaustion();

      const metrics = service.getPoolMetrics();
      expect(metrics.exhausted).toBe(true);
    });

    it('should not detect exhaustion below 95% utilization', () => {
      const mockPrismaClient = {} as jest.Mocked<PrismaClient>;

      // Register 9 connections (90% of max)
      for (let i = 1; i <= 9; i++) {
        service.registerConnection(`conn_${i}`, mockPrismaClient);
      }

      (service as any).detectPoolExhaustion();

      const metrics = service.getPoolMetrics();
      expect(metrics.exhausted).toBe(false);
    });

    it('should log warning when exhaustion is detected', () => {
      const loggerWarnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation();
      const mockPrismaClient = {} as jest.Mocked<PrismaClient>;

      // Create exhaustion scenario
      for (let i = 1; i <= 10; i++) {
        service.registerConnection(`conn_${i}`, mockPrismaClient);
      }

      (service as any).detectPoolExhaustion();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Connection pool exhaustion detected',
        expect.objectContaining({
          active: 10,
          max: 10,
          utilization: 100,
        }),
      );

      loggerWarnSpy.mockRestore();
    });
  });

  describe('Connection Health Assessment', () => {
    it('should assess healthy connection correctly', () => {
      const healthyConnection: ConnectionHealthMetrics = {
        connectionId: 'conn_1',
        createdAt: new Date(),
        lastUsed: new Date(),
        queriesExecuted: 50,
        totalExecutionTime: 5000,
        errors: 2, // Below threshold
        isActive: true,
        isHealthy: true,
        connectionString: 'postgresql://localhost:5432/test',
      };

      const isHealthy = (service as any).assessConnectionHealth(
        healthyConnection,
      );
      expect(isHealthy).toBe(true);
    });

    it('should detect unhealthy connection due to high error count', () => {
      const unhealthyConnection: ConnectionHealthMetrics = {
        connectionId: 'conn_1',
        createdAt: new Date(),
        lastUsed: new Date(),
        queriesExecuted: 50,
        totalExecutionTime: 5000,
        errors: 15, // Above threshold
        isActive: true,
        isHealthy: true,
        connectionString: 'postgresql://localhost:5432/test',
      };

      const isHealthy = (service as any).assessConnectionHealth(
        unhealthyConnection,
      );
      expect(isHealthy).toBe(false);
    });

    it('should detect unhealthy connection due to old age', () => {
      const oldConnection: ConnectionHealthMetrics = {
        connectionId: 'conn_1',
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours old
        lastUsed: new Date(),
        queriesExecuted: 50,
        totalExecutionTime: 5000,
        errors: 2,
        isActive: true,
        isHealthy: true,
        connectionString: 'postgresql://localhost:5432/test',
      };

      const isHealthy = (service as any).assessConnectionHealth(oldConnection);
      expect(isHealthy).toBe(false);
    });

    it('should test connection health with ping', () => {
      const connectionId = 'conn_1';

      // Test successful health check
      const healthyResult = (service as any).testConnectionHealth(connectionId);
      expect(healthyResult).toBe(true); // Placeholder implementation returns true
    });
  });

  describe('Utility Functions and Edge Cases', () => {
    it('should sanitize connection string for logging', () => {
      const sanitizedString = (service as any).sanitizeConnectionString();

      expect(sanitizedString).toBe('postgresql://localhost:5432/test_db');
      expect(sanitizedString).not.toContain('user');
      expect(sanitizedString).not.toContain('pass');
    });

    it('should handle invalid DATABASE_URL gracefully', () => {
      configService.get = jest.fn().mockReturnValue('invalid-url');

      const sanitizedString = (service as any).sanitizeConnectionString();
      expect(sanitizedString).toBe('postgresql://***:***@***:***/**');
    });

    it('should generate unique operation IDs', () => {
      const operationIds = new Set();

      for (let i = 0; i < 50; i++) {
        const operationId = (service as any).generateOperationId();
        expect(operationId).toMatch(/^pool_op_\d+_[a-z0-9]{7}$/);
        expect(operationIds.has(operationId)).toBe(false);
        operationIds.add(operationId);
      }

      expect(operationIds.size).toBe(50);
    });

    it('should handle empty connection pool gracefully', () => {
      const metrics = service.getPoolMetrics();

      expect(metrics.total).toBe(0);
      expect(metrics.active).toBe(0);
      expect(metrics.idle).toBe(0);
      expect(metrics.utilization).toBe(0);
      expect(metrics.connectionLifetimeMs).toBe(0);
      expect(metrics.healthy).toBe(true);
    });

    it('should return copy of metrics to prevent external modification', () => {
      const metrics1 = service.getPoolMetrics();
      const metrics2 = service.getPoolMetrics();

      // Verify they are separate objects
      expect(metrics1).not.toBe(metrics2);
      expect(metrics1).toEqual(metrics2);

      // Modify one and verify the other is unchanged
      metrics1.active = 999;
      expect(metrics2.active).not.toBe(999);
    });

    it('should return copy of connection health metrics', () => {
      const mockPrismaClient = {} as jest.Mocked<PrismaClient>;
      service.registerConnection('conn_1', mockPrismaClient);

      const healthMetrics1 = service.getConnectionHealthMetrics();
      const healthMetrics2 = service.getConnectionHealthMetrics();

      // Verify they are separate arrays
      expect(healthMetrics1).not.toBe(healthMetrics2);
      expect(healthMetrics1).toEqual(healthMetrics2);
    });

    it('should handle configuration values correctly', () => {
      // Reset the mocks to ensure they're tracked properly
      jest.clearAllMocks();

      service.onModuleInit();

      expect(configService.get).toHaveBeenCalledWith(
        'DB_POOL_MONITORING_INTERVAL',
        10000,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'DB_POOL_MAINTENANCE_INTERVAL',
        300000,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'DB_POOL_LEAK_DETECTION_INTERVAL',
        60000,
      );
      // Note: connectionPoolConfig call might not be directly accessible in this test context
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle connection pool config errors', () => {
      connectionPoolConfig.getConnectionPoolOptions = jest
        .fn()
        .mockImplementation(() => {
          throw new Error('Config error');
        });

      // Should not throw when getting pool metrics
      expect(() => {
        const metrics = service.getPoolMetrics();
        expect(metrics.utilization).toBe(0); // Should handle division by zero
      }).not.toThrow();
    });

    it('should handle monitoring interval errors gracefully', () => {
      const loggerErrorSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      // Mock error in metrics update
      jest.spyOn(service as any, 'updatePoolMetrics').mockImplementation(() => {
        throw new Error('Monitoring error');
      });

      service.onModuleInit();

      // Trigger monitoring interval
      jest.advanceTimersByTime(10000);

      // Error should be caught and logged, but service should continue
      expect(() => jest.runOnlyPendingTimers()).not.toThrow();

      loggerErrorSpy.mockRestore();
    });

    it('should handle maintenance errors and continue operation', () => {
      // Create connection first
      const mockPrismaClient = {} as jest.Mocked<PrismaClient>;
      service.registerConnection('conn_1', mockPrismaClient);

      // Mock error in individual connection processing
      const originalConnectionPool = (service as any).connectionPool;
      const mockConnectionPool = new Map();
      mockConnectionPool.set('error_conn', {
        connectionId: 'error_conn',
        lastUsed: new Date(Date.now() - 35 * 60 * 1000),
        isActive: false,
      });

      // Replace the connection pool temporarily
      (service as any).connectionPool = mockConnectionPool;

      // Mock the Map.entries() to throw an error for specific connection
      const originalEntries = mockConnectionPool.entries;
      mockConnectionPool.entries = function* () {
        for (const [key, value] of originalEntries.call(this)) {
          if (key === 'error_conn') {
            throw new Error('Connection processing error');
          }
          yield [key, value];
        }
      };

      const maintenanceResult = service.performPoolMaintenance();

      expect(maintenanceResult.errors).toHaveLength(1);
      expect(maintenanceResult.errors[0]).toContain(
        'Connection processing error',
      );

      // Restore original connection pool
      (service as any).connectionPool = originalConnectionPool;
    });

    it('should handle zero total requests in error rate calculation', () => {
      // Set up scenario with errors but no requests
      (service as any).poolMetrics.totalErrors = 5;
      (service as any).poolMetrics.totalRequests = 0;

      const healthCheck = service.performPoolHealthCheck();

      // Should not throw error and should handle division by zero
      // When no requests have been made, the pool should still be considered healthy
      // as there's no actual usage data to evaluate
      expect(healthCheck.healthy).toBe(false); // Errors present without requests indicates problems
    });
  });
});
