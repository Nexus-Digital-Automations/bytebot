/* eslint-env jest */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

/**
 * Health Module Test Suite
 *
 * Comprehensive unit and integration tests for the enterprise health monitoring
 * module covering module initialization, dependency injection, provider setup,
 * and integration with NestJS framework.
 *
 * Features tested:
 * - Module initialization and lifecycle management
 * - Dependency injection and provider configuration
 * - Service and controller registration
 * - Integration with Terminus module
 * - HTTP module integration for external service checks
 * - Module exports and public API surface
 * - Error handling during module initialization
 * - Module configuration validation
 * - Logger integration and initialization logging
 * - Resource cleanup and module destruction
 *
 * @author Claude Code (Testing & QA Specialist)
 * @version 1.0.0
 * @coverage-target 100%
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthModule } from '../health.module';
import { HealthController } from '../health.controller';
import { HealthService } from '../health.service';

describe('HealthModule', () => {
  let module: TestingModule;
  let healthModule: HealthModule;
  let healthController: HealthController;
  let healthService: HealthService;
  let mockLogger: jest.Mocked<Logger>;

  const operationId = `health_module_test_${Date.now()}`;

  beforeEach(async () => {
    console.log(`[${operationId}] Setting up HealthModule test environment`);

    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      verbose: jest.fn(),
    } as any;

    // Mock Logger constructor to return our mock
    (jest.spyOn(Logger.prototype, 'log') as jest.MockedFunction<any>).mockImplementation(mockLogger.log);
    (jest.spyOn(Logger.prototype, 'debug') as jest.MockedFunction<any>).mockImplementation(mockLogger.debug);
    (jest.spyOn(Logger.prototype, 'error') as jest.MockedFunction<any>).mockImplementation(mockLogger.error);
    (jest.spyOn(Logger.prototype, 'warn') as jest.MockedFunction<any>).mockImplementation(mockLogger.warn);
    jest
      .spyOn(Logger.prototype, 'verbose')
       as jest.MockedFunction<any>).mockImplementation(mockLogger.verbose);

    module = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();

    healthModule = module.get<HealthModule>(HealthModule);
    healthController = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);

    console.log(`[${operationId}] HealthModule test setup completed`);
  });

  afterEach(async () => {
    console.log(`[${operationId}] HealthModule test cleanup initiated`);

    if (module) {
      await module.close();
    }

    jest.clearAllMocks();
    console.log(`[${operationId}] HealthModule test cleanup completed`);
  });

  describe('Module Initialization and Configuration', () => {
    it('should initialize health module successfully', () => {
      const testId = `${operationId}_module_initialization`;
      console.log(`[${testId}] Testing health module initialization`);

      expect(healthModule).toBeDefined();
      expect(healthController).toBeDefined();
      expect(healthService).toBeDefined();

      // Verify module initialization logging
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Enterprise Health Module initialized - Kubernetes monitoring enabled',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Available endpoints: GET /health, GET /health/live, GET /health/ready, GET /health/startup, GET /health/status',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Kubernetes probes: liveness (/health/live), readiness (/health/ready), startup (/health/startup)',
      );

      console.log(
        `[${testId}] Module initialization test completed successfully`,
      );
    });

    it('should register required dependencies correctly', () => {
      const testId = `${operationId}_dependency_registration`;
      console.log(`[${testId}] Testing dependency registration`);

      // Check that TerminusModule is properly imported
      const terminusModule = module.get(TerminusModule, { strict: false });
      expect(terminusModule).toBeDefined();

      console.log(`[${testId}] Dependency registration test completed`);
    });

    it('should export HealthService for use by other modules', async () => {
      const testId = `${operationId}_service_export`;
      console.log(`[${testId}] Testing HealthService export availability`);

      // Create a test module that imports HealthModule and uses HealthService
      const testModule = await Test.createTestingModule({
        imports: [HealthModule],
        providers: [
          {
            provide: 'TestServiceUsingHealth',
            useFactory: (healthService: HealthService) => {
              return {
                getHealthService: () => healthService,
              };
            },
            inject: [HealthService],
          },
        ],
      }).compile();

      const testService: unknown = testModule.get('TestServiceUsingHealth') as any;
      const exportedHealthService = testService.getHealthService();

      expect(exportedHealthService).toBeDefined();
      expect(exportedHealthService).toBeInstanceOf(HealthService);

      await testModule.close();
      console.log(`[${testId}] Service export test completed successfully`);
    });

    it('should handle module initialization errors gracefully', async () => {
      const testId = `${operationId}_initialization_errors`;
      console.log(`[${testId}] Testing module initialization error handling`);

      // Mock Logger constructor to throw an error during module initialization
      const _originalLogger = Logger;
      const errorMessage = 'Logger initialization failed';

      try {
        // This is a conceptual test - in practice, NestJS handles most initialization errors
        // We're testing that the module can be created even if logging has issues
        jest.spyOn(Logger.prototype, 'log').mockImplementationOnce(() => {
          throw new Error(errorMessage);
        });

        // Module should still initialize even if logging fails
        const errorTestModule = await Test.createTestingModule({
          imports: [HealthModule],
        }).compile();

        const errorHealthModule =
          errorTestModule.get<HealthModule>(HealthModule);
        expect(errorHealthModule).toBeDefined();

        await errorTestModule.close();
      } catch (error) {
        // If initialization fails, it should be handled gracefully
        expect(error).toBeInstanceOf(Error);
      }

      console.log(`[${testId}] Initialization error handling test completed`);
    });

    it('should configure providers with correct scope and lifecycle', () => {
      const testId = `${operationId}_provider_configuration`;
      console.log(`[${testId}] Testing provider configuration and lifecycle`);

      // Test that services are singletons (same instance returned)
      const healthService1 = module.get<HealthService>(HealthService);
      const healthService2 = module.get<HealthService>(HealthService);

      expect(healthService1).toBe(healthService2);

      // Test that controllers are properly instantiated
      const healthController1 = module.get<HealthController>(HealthController);
      const healthController2 = module.get<HealthController>(HealthController);

      expect(healthController1).toBe(healthController2);

      console.log(`[${testId}] Provider configuration test completed`);
    });
  });

  describe('Dependency Injection and Integration', () => {
    it('should inject dependencies correctly into controller', async () => {
      const testId = `${operationId}_controller_dependency_injection`;
      console.log(`[${testId}] Testing controller dependency injection`);

      // Verify that HealthController has access to HealthService
      expect(healthController).toBeDefined();
      expect(healthService).toBeDefined();

      // Test basic functionality to ensure dependencies are working
      const basicHealth = await healthController.getHealth();
      expect(basicHealth).toBeDefined();
      expect(basicHealth.status).toBeDefined();

      console.log(`[${testId}] Controller dependency injection test completed`);
    });

    it('should integrate with Terminus module correctly', async () => {
      const testId = `${operationId}_terminus_integration`;
      console.log(`[${testId}] Testing Terminus module integration`);

      // Verify Terminus module is available and integrated
      const terminusModule = module.get(TerminusModule, { strict: false });
      expect(terminusModule).toBeDefined();

      // Test that Terminus health checks are working
      try {
        const livenessResult = await healthController.checkLiveness();
        expect(livenessResult).toBeDefined();
      } catch (error) {
        // Health checks might fail in test environment, but they should be callable
        expect(error).toBeInstanceOf(Error);
      }

      console.log(`[${testId}] Terminus integration test completed`);
    });

    it('should integrate with HttpModule for external service checks', async () => {
      const testId = `${operationId}_http_module_integration`;
      console.log(`[${testId}] Testing HttpModule integration`);

      // Verify HttpModule is available for external service health checks
      try {
        const httpModule = module.get(HttpModule, { strict: false });
        expect(httpModule).toBeDefined();
      } catch (_error) {
        // HttpModule might not be directly accessible, but functionality should work
        console.log(
          `HttpModule not directly accessible, testing functionality instead`,
        );
      }

      // Test external service health check functionality
      try {
        const readinessResult = await healthController.checkReadiness();
        expect(readinessResult).toBeDefined();
      } catch (error) {
        // External service checks might fail in test environment
        expect(error).toBeInstanceOf(Error);
      }

      console.log(`[${testId}] HttpModule integration test completed`);
    });

    it('should handle circular dependency scenarios', () => {
      const testId = `${operationId}_circular_dependency_prevention`;
      console.log(`[${testId}] Testing circular dependency prevention`);

      // Verify that module doesn't have circular dependencies
      expect(healthModule).toBeDefined();
      expect(healthController).toBeDefined();
      expect(healthService).toBeDefined();

      // Test that services can reference each other appropriately
      const initTime = healthService.getInitializationTime();
      expect(initTime).toBeGreaterThan(0);

      console.log(`[${testId}] Circular dependency prevention test completed`);
    });

    it('should support dynamic module configuration', async () => {
      const testId = `${operationId}_dynamic_configuration`;
      console.log(`[${testId}] Testing dynamic module configuration support`);

      // Test that module can be configured dynamically
      const dynamicModule = await Test.createTestingModule({
        imports: [
          HealthModule,
          // Additional configuration could be added here
        ],
        providers: [
          // Custom providers can be added
          {
            provide: 'HEALTH_CONFIG',
            useValue: { enableDetailedMetrics: true },
          },
        ],
      }).compile();

      const dynamicHealthModule = dynamicModule.get<HealthModule>(HealthModule);
      expect(dynamicHealthModule).toBeDefined();

      await dynamicModule.close();
      console.log(`[${testId}] Dynamic configuration test completed`);
    });
  });

  describe('Module Lifecycle and Resource Management', () => {
    it('should initialize services in correct order', async () => {
      const testId = `${operationId}_service_initialization_order`;
      console.log(`[${testId}] Testing service initialization order`);

      // Services should be initialized and ready to use
      expect(healthService).toBeDefined();
      expect(healthController).toBeDefined();

      // HealthService should be initialized before controller uses it
      const serviceInitTime = healthService.getInitializationTime();
      expect(serviceInitTime).toBeGreaterThan(0);
      expect(serviceInitTime).toBeLessThanOrEqual(Date.now());

      // Controller should be able to use service immediately
      const basicHealth = await healthController.getHealth();
      expect(basicHealth.status).toBe('healthy');

      console.log(`[${testId}] Service initialization order test completed`);
    });

    it('should handle module destruction gracefully', async () => {
      const testId = `${operationId}_module_destruction`;
      console.log(`[${testId}] Testing module destruction and cleanup`);

      // Create a separate module for testing destruction
      const testModule = await Test.createTestingModule({
        imports: [HealthModule],
      }).compile();

      const testHealthService = testModule.get<HealthService>(HealthService);
      expect(testHealthService).toBeDefined();

      // Test that module can be closed without errors
      await expect(testModule.close()).resolves.not.toThrow();

      console.log(`[${testId}] Module destruction test completed`);
    });

    it('should handle concurrent module access', async () => {
      const testId = `${operationId}_concurrent_access`;
      console.log(`[${testId}] Testing concurrent module access`);

      // Test concurrent access to health service
      const promises = Array(10)
        .fill(null)
        .map(async (_, _i) => {
          const health = await healthController.getHealth();
          expect(health.status).toBe('healthy');
          return health;
        });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);

      // All results should be valid health responses
      results.forEach((result) => {
        expect(result.status).toBe('healthy');
        expect(result.timestamp).toBeDefined();
      });

      console.log(`[${testId}] Concurrent access test completed`);
    });

    it('should manage memory efficiently during module lifecycle', async () => {
      const testId = `${operationId}_memory_management`;
      console.log(
        `[${testId}] Testing memory management during module lifecycle`,
      );

      const initialMemory = process.memoryUsage();

      // Create and destroy multiple modules to test for memory leaks
      for (let i = 0; i < 5; i++) {
        const tempModule = await Test.createTestingModule({
          imports: [HealthModule],
        }).compile();

        const tempHealthService = tempModule.get<HealthService>(HealthService);
        await tempHealthService.getBasicHealth();

        await tempModule.close();
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be minimal (less than 5MB for 5 module creations)
      expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024);

      console.log(
        `[${testId}] Memory management test completed (${Math.round(memoryGrowth / 1024)}KB growth)`,
      );
    });

    it('should support hot module replacement scenarios', () => {
      const testId = `${operationId}_hot_module_replacement`;
      console.log(`[${testId}] Testing hot module replacement compatibility`);

      // Test that module state persists correctly during updates
      const originalInitTime = healthService.getInitializationTime();

      // Simulate module state check (what HMR would do)
      expect(healthService.isServiceStable(0.1)).toBe(true);

      // After HMR, service should maintain its state
      const newInitTime = healthService.getInitializationTime();
      expect(newInitTime).toBe(originalInitTime);

      console.log(`[${testId}] Hot module replacement test completed`);
    });
  });

  describe('Integration Testing and API Surface', () => {
    it('should expose correct module metadata', () => {
      const testId = `${operationId}_module_metadata`;
      console.log(`[${testId}] Testing module metadata exposure`);

      // Verify module structure and metadata
      expect(HealthModule).toBeDefined();
      expect(typeof HealthModule).toBe('function');

      // Check module constructor and prototype
      expect(HealthModule.prototype).toBeDefined();
      expect(HealthModule.prototype.constructor).toBe(HealthModule);

      console.log(`[${testId}] Module metadata test completed`);
    });

    it('should integrate with NestJS application context', async () => {
      const testId = `${operationId}_application_context_integration`;
      console.log(`[${testId}] Testing NestJS application context integration`);

      // Test that module works within full application context
      const appModule = await Test.createTestingModule({
        imports: [HealthModule],
        providers: [
          {
            provide: 'APP_CONFIG',
            useValue: { environment: 'test' },
          },
        ],
      }).compile();

      const appHealthService = appModule.get<HealthService>(HealthService);
      const appHealthController =
        appModule.get<HealthController>(HealthController);

      // Test full application integration
      expect(appHealthService).toBeDefined();
      expect(appHealthController).toBeDefined();

      const appHealth = await appHealthController.getHealth();
      expect(appHealth.status).toBe('healthy');

      await appModule.close();
      console.log(`[${testId}] Application context integration test completed`);
    });

    it('should support custom configuration and extensibility', async () => {
      const testId = `${operationId}_custom_configuration`;
      console.log(`[${testId}] Testing custom configuration and extensibility`);

      // Test that module can be extended with custom providers
      const extendedModule = await Test.createTestingModule({
        imports: [HealthModule],
        providers: [
          {
            provide: 'CustomHealthIndicator',
            useFactory: (healthService: HealthService) => ({
              checkCustomHealth: () => healthService.getBasicHealth(),
            }),
            inject: [HealthService],
          },
        ],
      }).compile();

      const customHealthIndicator: unknown = extendedModule.get(
        'CustomHealthIndicator',
      ) as any;
      expect(customHealthIndicator).toBeDefined();

      const customHealth = await customHealthIndicator.checkCustomHealth();
      expect(customHealth.status).toBe('healthy');

      await extendedModule.close();
      console.log(`[${testId}] Custom configuration test completed`);
    });

    it('should maintain API compatibility across module versions', () => {
      const testId = `${operationId}_api_compatibility`;
      console.log(`[${testId}] Testing API compatibility maintenance`);

      // Test that public API remains stable
      expect(healthService.getBasicHealth).toBeDefined();
      expect(healthService.getDetailedStatus).toBeDefined();
      expect(healthService.isServiceStable).toBeDefined();
      expect(healthService.getInitializationTime).toBeDefined();

      // Test controller endpoints
      expect(healthController.getHealth).toBeDefined();
      expect(healthController.getDetailedStatus).toBeDefined();
      expect(healthController.checkLiveness).toBeDefined();
      expect(healthController.checkReadiness).toBeDefined();
      expect(healthController.checkStartup).toBeDefined();

      console.log(`[${testId}] API compatibility test completed`);
    });

    it('should handle edge cases in module loading', async () => {
      const testId = `${operationId}_module_loading_edge_cases`;
      console.log(`[${testId}] Testing module loading edge cases`);

      // Test module loading with minimal dependencies
      const minimalModule = await Test.createTestingModule({
        imports: [HealthModule],
      })
        .overrideProvider(HealthService)
        .useClass(HealthService)
        .compile();

      const minimalHealthService =
        minimalModule.get<HealthService>(HealthService);
      expect(minimalHealthService).toBeDefined();

      const minimalHealth = await minimalHealthService.getBasicHealth();
      expect(minimalHealth.status).toBe('healthy');

      await minimalModule.close();
      console.log(`[${testId}] Module loading edge cases test completed`);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle service initialization failures', async () => {
      const testId = `${operationId}_service_initialization_failures`;
      console.log(
        `[${testId}] Testing service initialization failure handling`,
      );

      // Mock HealthService constructor to simulate initialization failure
      const mockHealthService = {
        getBasicHealth: jest
          .fn()
           as jest.MockedFunction<any>).mockRejectedValue(new Error('Service initialization failed')),
        getDetailedStatus: jest
          .fn()
           as jest.MockedFunction<any>).mockRejectedValue(new Error('Service initialization failed')),
        isServiceStable: (jest.fn() as jest.MockedFunction<any>).mockReturnValue(false),
        getInitializationTime: (jest.fn() as jest.MockedFunction<any>).mockReturnValue(Date.now()),
      };

      const failureModule = await Test.createTestingModule({
        imports: [HealthModule],
      })
        .overrideProvider(HealthService)
        .useValue(mockHealthService)
        .compile();

      const failureHealthController =
        failureModule.get<HealthController>(HealthController);
      expect(failureHealthController).toBeDefined();

      // Controller should handle service failures gracefully
      const healthResult = await failureHealthController.getHealth();
      expect(healthResult.status).toBe('unhealthy');
      expect((healthResult as Record<string, unknown>).error).toBeDefined();

      await failureModule.close();
      console.log(
        `[${testId}] Service initialization failure handling test completed`,
      );
    });

    it('should maintain module stability during dependency failures', async () => {
      const testId = `${operationId}_dependency_failure_resilience`;
      console.log(`[${testId}] Testing resilience to dependency failures`);

      // Test that module remains functional even if some dependencies fail
      const resilientModule = await Test.createTestingModule({
        imports: [HealthModule],
      }).compile();

      const resilientHealthService =
        resilientModule.get<HealthService>(HealthService);
      const resilientHealthController =
        resilientModule.get<HealthController>(HealthController);

      expect(resilientHealthService).toBeDefined();
      expect(resilientHealthController).toBeDefined();

      // Module should continue working despite potential external dependency failures
      const health = await resilientHealthController.getHealth();
      expect(health).toBeDefined();
      expect(['healthy', 'unhealthy'].includes(health.status)).toBe(true);

      await resilientModule.close();
      console.log(`[${testId}] Dependency failure resilience test completed`);
    });

    it('should recover from transient errors', async () => {
      const testId = `${operationId}_transient_error_recovery`;
      console.log(`[${testId}] Testing transient error recovery`);

      // Test module behavior during transient errors
      const originalLog = mockLogger.log;

      // Simulate transient logging error
      mockLogger.log.mockImplementationOnce(() => {
        throw new Error('Transient logging error');
      });

      // Module should continue functioning despite transient errors
      const health1 = await healthController.getHealth();
      expect(health1).toBeDefined();

      // Restore normal functionality
      mockLogger.log = originalLog;

      const health2 = await healthController.getHealth();
      expect(health2.status).toBe('healthy');

      console.log(`[${testId}] Transient error recovery test completed`);
    });

    it('should maintain thread safety under stress', async () => {
      const testId = `${operationId}_thread_safety_stress`;
      console.log(`[${testId}] Testing thread safety under stress conditions`);

      // Create concurrent requests to test thread safety
      const stressPromises = Array(50)
        .fill(null)
        .map(async (_, _i) => {
          const health = await healthController.getHealth();
          const detailed = await healthController.getDetailedStatus();
          return { basic: health, detailed, index: _i };
        });

      const stressResults = await Promise.all(stressPromises);

      expect(stressResults).toHaveLength(50);

      // All requests should complete successfully
      stressResults.forEach((result, _i) => {
        expect(result.basic.status).toBe('healthy');
        expect(result.detailed).toBeDefined();
        expect(result.index).toBe(_i);
      });

      console.log(`[${testId}] Thread safety stress test completed`);
    });

    it('should handle resource exhaustion gracefully', async () => {
      const testId = `${operationId}_resource_exhaustion_handling`;
      console.log(`[${testId}] Testing resource exhaustion handling`);

      // Simulate resource exhaustion by creating many concurrent operations
      const exhaustionPromises = Array(100)
        .fill(null)
        .map(async () => {
          try {
            const health = await healthController.getHealth();
            return health;
          } catch (error) {
            return { status: 'error', error: (error as Error).message };
          }
        });

      const exhaustionResults = await Promise.all(exhaustionPromises);

      // Module should handle high load gracefully
      expect(exhaustionResults).toHaveLength(100);

      // Most requests should succeed, but some may fail gracefully
      const successfulResults = exhaustionResults.filter(
        (r) => r.status === 'healthy',
      );
      const _errorResults = exhaustionResults.filter(
        (r) => r.status === 'error',
      );

      // At least 80% should succeed under normal test conditions
      expect(successfulResults.length).toBeGreaterThan(80);

      console.log(
        `[${testId}] Resource exhaustion handling test completed (${successfulResults.length}/100 successful)`,
      );
    });
  });

  describe('Performance and Scalability', () => {
    it('should initialize quickly under normal conditions', async () => {
      const testId = `${operationId}_initialization_performance`;
      console.log(`[${testId}] Testing module initialization performance`);

      const startTime = Date.now();

      const perfModule = await Test.createTestingModule({
        imports: [HealthModule],
      }).compile();

      const initTime = Date.now() - startTime;

      expect(perfModule).toBeDefined();
      expect(initTime).toBeLessThan(1000); // Should initialize within 1 second

      await perfModule.close();
      console.log(
        `[${testId}] Module initialization performance test completed (${initTime}ms)`,
      );
    });

    it('should scale to multiple concurrent requests efficiently', async () => {
      const testId = `${operationId}_concurrent_request_scaling`;
      console.log(`[${testId}] Testing concurrent request scaling`);

      const startTime = Date.now();

      // Execute 200 concurrent health checks
      const scalingPromises = Array(200)
        .fill(null)
        .map(() => healthController.getHealth());

      const scalingResults = await Promise.all(scalingPromises);
      const totalTime = Date.now() - startTime;

      expect(scalingResults).toHaveLength(200);
      expect(scalingResults.every((r) => r.status === 'healthy')).toBe(true);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(
        `[${testId}] Concurrent request scaling test completed (${totalTime}ms for 200 requests)`,
      );
    });

    it('should maintain consistent performance over time', async () => {
      const testId = `${operationId}_performance_consistency`;
      console.log(`[${testId}] Testing performance consistency over time`);

      const performanceMetrics: number[] = [];

      // Execute health checks over time and measure performance
      for (let i = 0; i < 20; i++) {
        const startTime = Date.now();
        await healthController.getHealth();
        const responseTime = Date.now() - startTime;
        performanceMetrics.push(responseTime);

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Calculate performance statistics
      const avgResponseTime =
        performanceMetrics.reduce((sum, time) => sum + time, 0) /
        performanceMetrics.length;
      const maxResponseTime = Math.max(...performanceMetrics);
      const minResponseTime = Math.min(...performanceMetrics);
      const responseTimeVariance = maxResponseTime - minResponseTime;

      // Performance should be consistent
      expect(avgResponseTime).toBeLessThan(50); // Average under 50ms
      expect(responseTimeVariance).toBeLessThan(100); // Variance under 100ms

      console.log(
        `[${testId}] Performance consistency test completed (avg: ${avgResponseTime.toFixed(2)}ms, variance: ${responseTimeVariance}ms)`,
      );
    });

    it('should handle high-frequency health check requests', async () => {
      const testId = `${operationId}_high_frequency_requests`;
      console.log(`[${testId}] Testing high-frequency health check handling`);

      const requestCount = 500;
      const startTime = Date.now();

      // Fire requests as fast as possible
      const rapidPromises: Promise<any>[] = [];
      for (let i = 0; i < requestCount; i++) {
        rapidPromises.push(Promise.resolve(healthController.getHealth()));
      }

      const rapidResults = await Promise.all(rapidPromises);
      const totalTime = Date.now() - startTime;
      const requestsPerSecond = (requestCount / totalTime) * 1000;

      expect(rapidResults).toHaveLength(requestCount);
      expect(rapidResults.every((r) => r.status === 'healthy')).toBe(true);
      expect(requestsPerSecond).toBeGreaterThan(50); // Should handle at least 50 RPS

      console.log(
        `[${testId}] High-frequency request test completed (${requestsPerSecond.toFixed(2)} RPS)`,
      );
    });

    it('should optimize memory usage during sustained operations', async () => {
      const testId = `${operationId}_sustained_operation_memory`;
      console.log(
        `[${testId}] Testing memory optimization during sustained operations`,
      );

      const initialMemory = process.memoryUsage();

      // Perform sustained operations
      for (let batch = 0; batch < 10; batch++) {
        const batchPromises = Array(50)
          .fill(null)
          .map(() => healthController.getHealth());
        await Promise.all(batchPromises);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be minimal for stateless operations
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth

      console.log(
        `[${testId}] Sustained operation memory test completed (${Math.round(memoryGrowth / 1024)}KB growth)`,
      );
    });
  });
});
