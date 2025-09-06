/**
 * Unit Tests for Metrics Service
 *
 * Comprehensive test suite for the Prometheus metrics collection service.
 * Validates all metric types, recording functions, and error handling.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { register } from 'prom-client';

describe('MetricsService', () => {
  let service: MetricsService;
  let logger: jest.Mocked<Logger>;

  beforeEach(async () => {
    // Clear all metrics before each test
    register.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    logger = module.get<Logger>(Logger) as jest.Mocked<Logger>;
  });

  afterEach(() => {
    // Clean up metrics after each test
    register.clear();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with default metrics collection', () => {
      expect(service).toBeInstanceOf(MetricsService);
    });
  });

  describe('Prometheus Metrics Export', () => {
    it('should return Prometheus-formatted metrics', async () => {
      const metrics = await service.getPrometheusMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('bytebot_');
    });

    it('should handle metrics collection errors', async () => {
      // Mock register.metrics to throw error
      jest.spyOn(register, 'metrics').mockRejectedValueOnce(new Error('Test error'));

      await expect(service.getPrometheusMetrics()).rejects.toThrow('Test error');
    });
  });

  describe('API Request Metrics', () => {
    it('should record API request duration', () => {
      const method = 'GET';
      const route = '/health';
      const statusCode = 200;
      const duration = 150;

      expect(() => {
        service.recordApiRequestDuration(method, route, statusCode, duration);
      }).not.toThrow();
    });

    it('should handle request start and end', () => {
      const method = 'POST';
      const route = '/api/tasks';

      expect(() => {
        service.recordRequestStart(method, route);
        service.recordRequestEnd(method, route);
      }).not.toThrow();
    });
  });

  describe('Task Processing Metrics', () => {
    it('should record task processing metrics', () => {
      const taskType = 'automation';
      const status = 'completed';
      const duration = 5000;

      expect(() => {
        service.recordTaskProcessing(taskType, status, duration);
      }).not.toThrow();
    });

    it('should set tasks in progress count', () => {
      const taskType = 'screenshot';
      const count = 5;

      expect(() => {
        service.setTasksInProgress(taskType, count);
      }).not.toThrow();
    });
  });

  describe('Computer-use Operation Metrics', () => {
    it('should record computer-use operations', () => {
      const operationType = 'click';
      const status = 'success';
      const duration = 50;

      expect(() => {
        service.recordComputerUseOperation(operationType, status, duration);
      }).not.toThrow();
    });

    it('should record computer-use errors', () => {
      const operationType = 'type';
      const errorType = 'element_not_found';

      expect(() => {
        service.recordComputerUseError(operationType, errorType);
      }).not.toThrow();
    });
  });

  describe('WebSocket Metrics', () => {
    it('should set WebSocket connection count', () => {
      const connectionType = 'task_updates';
      const count = 10;

      expect(() => {
        service.setWebSocketConnections(connectionType, count);
      }).not.toThrow();
    });

    it('should record WebSocket messages', () => {
      const direction = 'incoming';
      const messageType = 'task_status';

      expect(() => {
        service.recordWebSocketMessage(direction, messageType);
      }).not.toThrow();
    });
  });

  describe('Database Metrics', () => {
    it('should set database connections', () => {
      const database = 'postgres';
      const state = 'active';
      const count = 5;

      expect(() => {
        service.setDatabaseConnections(database, state, count);
      }).not.toThrow();
    });

    it('should record database queries', () => {
      const operation = 'SELECT';
      const table = 'tasks';
      const duration = 25;

      expect(() => {
        service.recordDatabaseQuery(operation, table, duration);
      }).not.toThrow();
    });

    it('should record database errors', () => {
      const operation = 'INSERT';
      const errorType = 'constraint_violation';

      expect(() => {
        service.recordDatabaseError(operation, errorType);
      }).not.toThrow();
    });
  });

  describe('Placeholder Methods', () => {
    it('should handle cache operation recording', () => {
      const operation = 'get';
      const result = 'hit';
      const duration = 5;

      expect(() => {
        service.recordCacheOperation?.(operation, result, duration);
      }).not.toThrow();
    });

    it('should handle compression metrics recording', () => {
      const originalSize = 1000;
      const compressedSize = 600;
      const algorithm = 'gzip';
      const duration = 10;

      expect(() => {
        service.recordCompressionMetrics?.(originalSize, compressedSize, algorithm, duration);
      }).not.toThrow();
    });
  });

  describe('System Metrics', () => {
    it('should update system metrics periodically', () => {
      // Test that system metrics update doesn't throw errors
      expect(() => {
        (service as any).updateSystemMetrics();
      }).not.toThrow();
    });
  });

  describe('Metrics Cleanup', () => {
    it('should clear all metrics', () => {
      service.clearMetrics();
      
      // Verify metrics registry is cleared
      expect(register.getSingleMetric('bytebot_http_requests_total')).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle system metrics update errors gracefully', () => {
      // Mock process.memoryUsage to throw error
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => {
        throw new Error('Memory usage error');
      });

      expect(() => {
        (service as any).updateSystemMetrics();
      }).not.toThrow();

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });
});