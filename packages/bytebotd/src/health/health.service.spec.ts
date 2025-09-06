/**
 * Unit Tests for Enhanced Health Service
 *
 * Comprehensive test suite for the enterprise health monitoring service
 * with Kubernetes health check support. Validates all health check types,
 * probe endpoints, and error handling scenarios.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let logger: jest.Mocked<Logger>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService],
    }).compile();

    service = module.get<HealthService>(HealthService);
    logger = module.get<Logger>(Logger) as jest.Mocked<Logger>;
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with current timestamp', () => {
      const initTime = service.getInitializationTime();
      expect(initTime).toBeDefined();
      expect(typeof initTime).toBe('number');
      expect(initTime).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Basic Health Checks', () => {
    it('should return basic health information', () => {
      const health = service.getBasicHealth();
      
      expect(health).toHaveProperty('status', 'healthy');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('memory');
      expect(health.memory).toHaveProperty('used');
      expect(health.memory).toHaveProperty('free');
      expect(health.memory).toHaveProperty('total');
    });

    it('should return detailed status information', () => {
      const status = service.getDetailedStatus();
      
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('timestamp');
      expect(status).toHaveProperty('uptime');
      expect(status).toHaveProperty('memory');
      expect(status).toHaveProperty('services');
      expect(status).toHaveProperty('performance');
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(status.status);
    });
  });

  describe('Kubernetes Health Probes', () => {
    describe('Process Health (Liveness Probe)', () => {
      it('should pass process health check', async () => {
        const result = await service.checkProcessHealth();
        
        expect(result).toHaveProperty('process');
        expect(result.process).toHaveProperty('status', 'up');
        expect(result.process).toHaveProperty('uptime');
        expect(result.process).toHaveProperty('memoryMB');
      });

      it('should handle process health check errors', async () => {
        // Mock process.memoryUsage to throw error
        const originalMemoryUsage = process.memoryUsage;
        process.memoryUsage = jest.fn(() => {
          throw new Error('Memory error');
        });

        const result = await service.checkProcessHealth();
        
        expect(result).toHaveProperty('process');
        expect(result.process).toHaveProperty('status', 'down');
        expect(result.process).toHaveProperty('error');

        // Restore original function
        process.memoryUsage = originalMemoryUsage;
      });
    });

    describe('Database Health (Readiness Probe)', () => {
      it('should pass database health check', async () => {
        const result = await service.checkDatabaseHealth();
        
        expect(result).toHaveProperty('database');
        expect(result.database).toHaveProperty('status', 'up');
        expect(result.database).toHaveProperty('responseTime');
      });

      it('should handle database connection failures', async () => {
        // Mock performDatabasePing to return false
        jest.spyOn(service as any, 'performDatabasePing').mockResolvedValueOnce(false);

        const result = await service.checkDatabaseHealth();
        
        expect(result).toHaveProperty('database');
        expect(result.database).toHaveProperty('status', 'down');
      });
    });

    describe('External Services Health', () => {
      it('should check external services', async () => {
        const result = await service.checkExternalServices();
        
        expect(result).toHaveProperty('external_services');
        expect(result.external_services).toHaveProperty('status');
      });

      it('should handle external service check errors', async () => {
        // Mock checkExternalService to throw error
        jest.spyOn(service as any, 'checkExternalService').mockRejectedValue(new Error('Service error'));

        const result = await service.checkExternalServices();
        
        expect(result).toHaveProperty('external_services');
      });
    });

    describe('Startup Health Check', () => {
      it('should fail startup check for new service', async () => {
        // Create a new service instance (will have recent start time)
        const newService = new HealthService();
        
        const result = await newService.checkStartupComplete();
        
        expect(result).toHaveProperty('startup');
        expect(result.startup).toHaveProperty('status', 'down');
        expect(result.startup).toHaveProperty('message', 'Service is still starting up');
      });

      it('should pass startup check after sufficient uptime', async () => {
        // Mock the start time to be old enough
        (service as any).startTime = Date.now() - 15000; // 15 seconds ago
        
        const result = await service.checkStartupComplete();
        
        expect(result).toHaveProperty('startup');
        expect(result.startup).toHaveProperty('status', 'up');
      });
    });

    describe('Module Initialization Check', () => {
      it('should check module initialization', async () => {
        const result = await service.checkModuleInitialization();
        
        expect(result).toHaveProperty('modules');
        expect(result.modules).toHaveProperty('status', 'up');
        expect(result.modules).toHaveProperty('modules');
        
        const modules = result.modules.modules;
        expect(modules).toHaveProperty('computer-use', true);
        expect(modules).toHaveProperty('input-tracking', true);
        expect(modules).toHaveProperty('cua-integration', true);
        expect(modules).toHaveProperty('health', true);
      });
    });
  });

  describe('Service Stability', () => {
    it('should check service stability with default threshold', () => {
      // Mock start time to be 35 seconds ago
      (service as any).startTime = Date.now() - 35000;
      
      const isStable = service.isServiceStable();
      expect(isStable).toBe(true);
    });

    it('should check service stability with custom threshold', () => {
      // Mock start time to be 25 seconds ago
      (service as any).startTime = Date.now() - 25000;
      
      const isStable = service.isServiceStable(60); // 60 second threshold
      expect(isStable).toBe(false);
    });

    it('should return false for newly started service', () => {
      const newService = new HealthService();
      const isStable = newService.isServiceStable();
      expect(isStable).toBe(false);
    });
  });

  describe('Private Methods', () => {
    describe('Database Ping', () => {
      it('should simulate database ping successfully', async () => {
        const result = await (service as any).performDatabasePing();
        expect(result).toBe(true);
      });
    });

    describe('External Service Check', () => {
      it('should check individual external service', async () => {
        const result = await (service as any).checkExternalService('test-service', 'http://test.com/health');
        
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('responseTime');
        expect(['healthy', 'unhealthy']).toContain(result.status);
      });
    });

    describe('Legacy Service Health Check', () => {
      it('should return legacy service health status', () => {
        const services = (service as any).checkServiceHealth();
        
        expect(services).toHaveProperty('database', 'unknown');
        expect(services).toHaveProperty('cache', 'unknown');
        expect(services).toHaveProperty('external', 'unknown');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in basic health check gracefully', () => {
      // Mock process.uptime to throw error
      const originalUptime = process.uptime;
      process.uptime = jest.fn(() => {
        throw new Error('Uptime error');
      });

      expect(() => service.getBasicHealth()).toThrow();

      // Restore original function
      process.uptime = originalUptime;
    });

    it('should handle errors in detailed status check gracefully', () => {
      // Mock process.uptime to throw error
      const originalUptime = process.uptime;
      process.uptime = jest.fn(() => {
        throw new Error('Status error');
      });

      expect(() => service.getDetailedStatus()).toThrow();

      // Restore original function
      process.uptime = originalUptime;
    });

    it('should handle startup check errors', async () => {
      // Mock Date.now to throw error
      const originalNow = Date.now;
      Date.now = jest.fn(() => {
        throw new Error('Date error');
      });

      const result = await service.checkStartupComplete();
      
      expect(result).toHaveProperty('startup');
      expect(result.startup).toHaveProperty('status', 'down');
      expect(result.startup).toHaveProperty('error');

      // Restore original function
      Date.now = originalNow;
    });

    it('should handle module initialization errors', async () => {
      // Mock Object.values to throw error
      const originalValues = Object.values;
      Object.values = jest.fn(() => {
        throw new Error('Module error');
      });

      const result = await service.checkModuleInitialization();
      
      expect(result).toHaveProperty('modules');
      expect(result.modules).toHaveProperty('status', 'down');
      expect(result.modules).toHaveProperty('error');

      // Restore original function
      Object.values = originalValues;
    });
  });

  describe('Performance Metrics', () => {
    it('should include performance metrics in detailed status', () => {
      const status = service.getDetailedStatus();
      
      expect(status.performance).toHaveProperty('requestsPerSecond');
      expect(status.performance).toHaveProperty('averageResponseTime');
      expect(typeof status.performance.requestsPerSecond).toBe('number');
      expect(typeof status.performance.averageResponseTime).toBe('number');
    });
  });

  describe('Memory Metrics', () => {
    it('should provide accurate memory measurements', () => {
      const health = service.getBasicHealth();
      
      expect(health.memory.used).toBeGreaterThan(0);
      expect(health.memory.total).toBeGreaterThan(0);
      expect(health.memory.free).toBeGreaterThanOrEqual(0);
      expect(health.memory.used).toBeLessThanOrEqual(health.memory.total);
    });

    it('should provide detailed memory info in status', () => {
      const status = service.getDetailedStatus();
      
      expect(status.memory).toHaveProperty('heapUsed');
      expect(status.memory).toHaveProperty('heapTotal');
      expect(status.memory.heapUsed).toBeGreaterThan(0);
      expect(status.memory.heapTotal).toBeGreaterThan(0);
    });
  });
});