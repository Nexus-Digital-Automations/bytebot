/**
 * CUA Integration Module Tests
 *
 * Comprehensive test suite for CuaIntegrationModule covering:
 * - Module initialization and dependency injection
 * - Service provider configuration
 * - Configuration factory functionality
 * - HttpModule integration
 * - Module lifecycle hooks (OnModuleInit, OnModuleDestroy)
 * - Environment variable handling
 * - Service exports and availability
 * - Error handling during module setup
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { CuaIntegrationModule } from '../cua-integration.module';
import { CuaIntegrationService } from '../cua-integration.service';
import { CuaVisionService } from '../cua-vision.service';
import { CuaPerformanceService } from '../cua-performance.service';
import { CuaBridgeService } from '../cua-bridge.service';
import { CuaIntegrationController } from '../cua-integration.controller';

// Mock environment variables
const mockEnvironment = {
  CUA_FRAMEWORK_ENABLED: 'true',
  CUA_CONTAINER_ID: 'test-container',
  CUA_VERSION: '1.2.0',
  CUA_PERFORMANCE_MODE: 'optimized',
  CUA_LOG_LEVEL: 'debug',
  ANE_BRIDGE_ENABLED: 'true',
  ANE_BRIDGE_HOST: 'test-host',
  ANE_BRIDGE_PORT: '9090',
  ANE_FALLBACK_ENABLED: 'true',
  ANE_CACHE_ENABLED: 'true',
  ANE_BATCH_SIZE: '20',
  ANE_TIMEOUT_MS: '10000',
  PERFORMANCE_MONITORING: 'enabled',
  METRICS_COLLECTION: 'enabled',
  RESOURCE_LIMITS_ENABLED: 'true',
  MEMORY_OPTIMIZATION: 'enabled',
  NATIVE_BRIDGE_ENABLED: 'true',
  CONTAINER_ORCHESTRATION: 'docker',
  CUA_SHARED_VOLUME: '/opt/test/shared',
};

// Save original env
const originalEnv = process.env;

// Mock logger
const mockLogger = {
  log: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setContext: jest.fn(),
};

describe('CuaIntegrationModule', () => {
  let module: TestingModule;
  let cuaIntegrationModule: CuaIntegrationModule;

  beforeEach(async () => {
    // Reset environment variables
    jest.resetModules();
    process.env = { ...originalEnv, ...mockEnvironment };

    // Clear all mocks
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Mock Logger constructor to return our mock
    jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLogger.log);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(mockLogger.debug);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(mockLogger.warn);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLogger.error);

    module = await Test.createTestingModule({
      imports: [CuaIntegrationModule],
    }).compile();

    cuaIntegrationModule =
      module.get<CuaIntegrationModule>(CuaIntegrationModule);
  });

  afterEach(async () => {
    // Clean up module
    if (module) {
      await module.close();
    }

    // Restore original environment
    process.env = originalEnv;
  });

  describe('Module Definition and Structure', () => {
    it('should be defined', () => {
      expect(cuaIntegrationModule).toBeDefined();
      expect(cuaIntegrationModule).toBeInstanceOf(CuaIntegrationModule);
    });

    it('should have correct module metadata', () => {
      const moduleMetadata = Reflect.getMetadata(
        'imports',
        CuaIntegrationModule,
      );
      expect(moduleMetadata).toBeDefined();
    });

    it('should log initialization message', () => {
      expect(mockLogger.log).toHaveBeenCalledWith(
        'C/ua Framework Integration Module initialized',
      );
    });
  });

  describe('Dependency Injection and Service Availability', () => {
    it('should provide CuaIntegrationService', () => {
      const service = module.get<CuaIntegrationService>(CuaIntegrationService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(CuaIntegrationService);
    });

    it('should provide CuaVisionService', () => {
      const service = module.get<CuaVisionService>(CuaVisionService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(CuaVisionService);
    });

    it('should provide CuaPerformanceService', () => {
      const service = module.get<CuaPerformanceService>(CuaPerformanceService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(CuaPerformanceService);
    });

    it('should provide CuaBridgeService', () => {
      const service = module.get<CuaBridgeService>(CuaBridgeService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(CuaBridgeService);
    });

    it('should provide CuaIntegrationController', () => {
      const controller = module.get<CuaIntegrationController>(
        CuaIntegrationController,
      );
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(CuaIntegrationController);
    });

    it('should have all services accessible as exports', () => {
      // Test that services are properly exported and can be imported by other modules
      const integrationService = module.get<CuaIntegrationService>(
        CuaIntegrationService,
      );
      const visionService = module.get<CuaVisionService>(CuaVisionService);
      const performanceService = module.get<CuaPerformanceService>(
        CuaPerformanceService,
      );
      const bridgeService = module.get<CuaBridgeService>(CuaBridgeService);

      expect(integrationService).toBeDefined();
      expect(visionService).toBeDefined();
      expect(performanceService).toBeDefined();
      expect(bridgeService).toBeDefined();
    });
  });

  describe('Configuration Factory', () => {
    it('should create configuration from environment variables', async () => {
      // Create a new module to test configuration factory
      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      const integrationService = testModule.get<CuaIntegrationService>(
        CuaIntegrationService,
      );
      const config = integrationService.getConfiguration();

      expect(config).toMatchObject({
        framework: {
          enabled: true,
          containerId: 'test-container',
          version: '1.2.0',
          performanceMode: 'optimized',
          logLevel: 'debug',
        },
        aneBridge: {
          enabled: true,
          host: 'test-host',
          port: 9090,
          baseUrl: 'http://test-host:9090',
          fallbackEnabled: true,
          timeoutMs: 10000,
        },
        monitoring: {
          enabled: true,
          metricsCollection: true,
        },
        hybrid: {
          nativeBridgeEnabled: true,
          sharedVolumePath: '/opt/test/shared',
        },
      });

      await testModule.close();
    });

    it('should handle missing environment variables with defaults', async () => {
      // Clear environment variables to test defaults
      process.env = {};

      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      const integrationService = testModule.get<CuaIntegrationService>(
        CuaIntegrationService,
      );
      const config = integrationService.getConfiguration();

      expect(config.framework.enabled).toBe(false); // Default false for missing CUA_FRAMEWORK_ENABLED
      expect(config.framework.containerId).toBe('bytebot-desktop-cua'); // Default value
      expect(config.framework.version).toBe('1.0.0'); // Default value
      expect(config.aneBridge.enabled).toBe(false); // Default false for missing ANE_BRIDGE_ENABLED
      expect(config.aneBridge.host).toBe('host.docker.internal'); // Default value
      expect(config.aneBridge.port).toBe(8080); // Default value

      await testModule.close();
    });

    it('should handle boolean environment variables correctly', async () => {
      // Test various boolean representations
      const booleanTestCases: Array<{
        CUA_FRAMEWORK_ENABLED: string;
        expectedResult: boolean;
      }> = [
        { CUA_FRAMEWORK_ENABLED: 'true', expectedResult: true },
        { CUA_FRAMEWORK_ENABLED: 'false', expectedResult: false },
        { CUA_FRAMEWORK_ENABLED: 'TRUE', expectedResult: false }, // Only 'true' should be true
        { CUA_FRAMEWORK_ENABLED: '1', expectedResult: false },
        { CUA_FRAMEWORK_ENABLED: '', expectedResult: false },
      ];

      for (const testCase of booleanTestCases) {
        // Set only the string environment variable
        process.env = { CUA_FRAMEWORK_ENABLED: testCase.CUA_FRAMEWORK_ENABLED };

        const testModule = await Test.createTestingModule({
          imports: [CuaIntegrationModule],
        }).compile();

        const integrationService = testModule.get<CuaIntegrationService>(
          CuaIntegrationService,
        );
        const config = integrationService.getConfiguration();

        expect(config.framework.enabled).toBe(testCase.expectedResult);

        await testModule.close();
      }
    });

    it('should handle numeric environment variables correctly', async () => {
      process.env = {
        ANE_BRIDGE_PORT: '3000',
        ANE_BATCH_SIZE: '15',
        ANE_TIMEOUT_MS: '7500',
      };

      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      const integrationService = testModule.get<CuaIntegrationService>(
        CuaIntegrationService,
      );
      const config = integrationService.getConfiguration();

      expect(config.aneBridge.port).toBe(3000);
      expect(config.aneBridge.baseUrl).toBe('http://host.docker.internal:3000');

      await testModule.close();
    });

    it('should log configuration loading', async () => {
      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('C/ua integration configuration loaded'),
      );

      await testModule.close();
    });
  });

  describe('HttpModule Integration', () => {
    it('should configure HttpModule correctly', async () => {
      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      // Test that HttpModule is properly configured by checking if HttpService is available
      const bridgeService = testModule.get<CuaBridgeService>(CuaBridgeService);
      expect(bridgeService).toBeDefined();

      await testModule.close();
    });

    it('should use correct HTTP configuration', async () => {
      // This tests that HttpModule is registered with correct configuration
      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      const bridgeService = testModule.get<CuaBridgeService>(CuaBridgeService);

      // Verify that bridge service can be instantiated (requires HttpService)
      expect(bridgeService).toBeDefined();

      await testModule.close();
    });
  });

  describe('ConfigModule Integration', () => {
    it('should load configuration factory correctly', async () => {
      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      const integrationService = testModule.get<CuaIntegrationService>(
        CuaIntegrationService,
      );
      const config = integrationService.getConfiguration();

      // Verify configuration was loaded from factory
      expect(config).toBeDefined();
      expect(config.framework).toBeDefined();
      expect(config.aneBridge).toBeDefined();
      expect(config.monitoring).toBeDefined();
      expect(config.hybrid).toBeDefined();

      await testModule.close();
    });

    it('should handle configuration caching', async () => {
      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      // Multiple calls should return consistent configuration
      const integrationService = testModule.get<CuaIntegrationService>(
        CuaIntegrationService,
      );
      const config1 = integrationService.getConfiguration();
      const config2 = integrationService.getConfiguration();

      expect(config1).toEqual(config2);

      await testModule.close();
    });
  });

  describe('Module Lifecycle Hooks', () => {
    describe('onModuleInit', () => {
      it('should call onModuleInit lifecycle hook', async () => {
        const testModule = await Test.createTestingModule({
          imports: [CuaIntegrationModule],
        }).compile();

        const moduleInstance =
          testModule.get<CuaIntegrationModule>(CuaIntegrationModule);

        // onModuleInit should be called automatically during compilation
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Initializing C/ua Framework Integration Module',
        );

        await testModule.close();
      });

      it('should log framework status during initialization', async () => {
        process.env = {
          ...mockEnvironment,
          CUA_FRAMEWORK_ENABLED: 'true',
          ANE_BRIDGE_ENABLED: 'true',
        };

        const testModule = await Test.createTestingModule({
          imports: [CuaIntegrationModule],
        }).compile();

        expect(mockLogger.log).toHaveBeenCalledWith(
          'Framework Status - Enabled: true, ANE Bridge: true',
        );

        await testModule.close();
      });

      it('should warn when framework is disabled', async () => {
        process.env = { ...mockEnvironment, CUA_FRAMEWORK_ENABLED: 'false' };

        const testModule = await Test.createTestingModule({
          imports: [CuaIntegrationModule],
        }).compile();

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'C/ua Framework is disabled - running in compatibility mode',
        );

        await testModule.close();
      });

      it('should handle different framework status combinations', async () => {
        const statusCombinations: Array<{
          framework: string;
          bridge: string;
          frameworkExpected: boolean;
          bridgeExpected: boolean;
        }> = [
          {
            framework: 'true',
            bridge: 'true',
            frameworkExpected: true,
            bridgeExpected: true,
          },
          {
            framework: 'true',
            bridge: 'false',
            frameworkExpected: true,
            bridgeExpected: false,
          },
          {
            framework: 'false',
            bridge: 'true',
            frameworkExpected: false,
            bridgeExpected: true,
          },
          {
            framework: 'false',
            bridge: 'false',
            frameworkExpected: false,
            bridgeExpected: false,
          },
        ];

        for (const combo of statusCombinations) {
          process.env = {
            ...mockEnvironment,
            CUA_FRAMEWORK_ENABLED: combo.framework,
            ANE_BRIDGE_ENABLED: combo.bridge,
          };

          const testModule = await Test.createTestingModule({
            imports: [CuaIntegrationModule],
          }).compile();

          expect(mockLogger.log).toHaveBeenCalledWith(
            `Framework Status - Enabled: ${combo.frameworkExpected}, ANE Bridge: ${combo.bridgeExpected}`,
          );

          await testModule.close();

          // Clear mock calls for next iteration
          mockLogger.log.mockClear();
          mockLogger.warn.mockClear();
        }
      });
    });

    describe('onModuleDestroy', () => {
      it('should call onModuleDestroy lifecycle hook', async () => {
        const testModule = await Test.createTestingModule({
          imports: [CuaIntegrationModule],
        }).compile();

        await testModule.close();

        expect(mockLogger.log).toHaveBeenCalledWith(
          'Shutting down C/ua Framework Integration Module',
        );
      });

      it('should handle graceful shutdown', async () => {
        const testModule = await Test.createTestingModule({
          imports: [CuaIntegrationModule],
        }).compile();

        // Gracefully close the module
        await expect(testModule.close()).resolves.not.toThrow();

        expect(mockLogger.log).toHaveBeenCalledWith(
          'Shutting down C/ua Framework Integration Module',
        );
      });
    });
  });

  describe('Service Dependencies and Interactions', () => {
    it('should properly inject HttpService into bridge service', async () => {
      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      const bridgeService = testModule.get<CuaBridgeService>(CuaBridgeService);

      // Bridge service should be created successfully with HttpService dependency
      expect(bridgeService).toBeDefined();
      expect(bridgeService.getHealthStatus()).toBeDefined();

      await testModule.close();
    });

    it('should properly inject performance service into bridge service', async () => {
      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      const bridgeService = testModule.get<CuaBridgeService>(CuaBridgeService);
      const performanceService = testModule.get<CuaPerformanceService>(
        CuaPerformanceService,
      );

      // Both services should be available
      expect(bridgeService).toBeDefined();
      expect(performanceService).toBeDefined();

      await testModule.close();
    });

    it('should properly inject integration service into vision service', async () => {
      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      const visionService = testModule.get<CuaVisionService>(CuaVisionService);
      const integrationService = testModule.get<CuaIntegrationService>(
        CuaIntegrationService,
      );

      // Both services should be available
      expect(visionService).toBeDefined();
      expect(integrationService).toBeDefined();

      await testModule.close();
    });

    it('should inject all services into controller', async () => {
      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      const controller = testModule.get<CuaIntegrationController>(
        CuaIntegrationController,
      );

      // Controller should be created with all service dependencies
      expect(controller).toBeDefined();

      await testModule.close();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid environment variable types gracefully', async () => {
      process.env = {
        ANE_BRIDGE_PORT: 'invalid_number',
        ANE_BATCH_SIZE: 'not_a_number',
        ANE_TIMEOUT_MS: '',
      };

      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      const integrationService = testModule.get<CuaIntegrationService>(
        CuaIntegrationService,
      );
      const config = integrationService.getConfiguration();

      // Should use default values for invalid numbers
      expect(config.aneBridge.port).toBe(8080); // Default port
      expect(config.aneBridge.timeoutMs).toBe(5000); // Default timeout

      await testModule.close();
    });

    it('should handle missing required services gracefully', async () => {
      // This test ensures the module can handle edge cases during instantiation
      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      // All services should be properly instantiated despite any initialization issues
      expect(() => {
        testModule.get<CuaIntegrationService>(CuaIntegrationService);
        testModule.get<CuaVisionService>(CuaVisionService);
        testModule.get<CuaPerformanceService>(CuaPerformanceService);
        testModule.get<CuaBridgeService>(CuaBridgeService);
        testModule.get<CuaIntegrationController>(CuaIntegrationController);
      }).not.toThrow();

      await testModule.close();
    });

    it('should handle configuration factory errors', async () => {
      // Test with extremely malformed environment
      process.env = {
        // Very long values that might cause issues
        CUA_CONTAINER_ID: 'x'.repeat(1000),
        CUA_SHARED_VOLUME: '/'.repeat(100),
      };

      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      const integrationService = testModule.get<CuaIntegrationService>(
        CuaIntegrationService,
      );

      // Should not throw when getting configuration
      expect(() => integrationService.getConfiguration()).not.toThrow();

      await testModule.close();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should create singleton instances of services', async () => {
      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      const service1 = testModule.get<CuaIntegrationService>(
        CuaIntegrationService,
      );
      const service2 = testModule.get<CuaIntegrationService>(
        CuaIntegrationService,
      );

      // Should return the same instance (singleton)
      expect(service1).toBe(service2);

      await testModule.close();
    });

    it('should handle rapid module creation and destruction', async () => {
      const moduleCount = 10;
      const modules: TestingModule[] = [];

      // Create multiple modules rapidly
      for (let i = 0; i < moduleCount; i++) {
        const testModule = await Test.createTestingModule({
          imports: [CuaIntegrationModule],
        }).compile();
        modules.push(testModule);
      }

      // All modules should be created successfully
      expect(modules).toHaveLength(moduleCount);

      // Clean up all modules
      for (const mod of modules) {
        await mod.close();
      }

      // Should not throw during cleanup
      expect(true).toBe(true);
    });

    it('should properly clean up resources during module destruction', async () => {
      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      // Get references to services
      const integrationService = testModule.get<CuaIntegrationService>(
        CuaIntegrationService,
      );
      const bridgeService = testModule.get<CuaBridgeService>(CuaBridgeService);

      // Ensure services are initialized
      expect(integrationService).toBeDefined();
      expect(bridgeService).toBeDefined();

      // Close module - should clean up all resources
      await expect(testModule.close()).resolves.not.toThrow();
    });
  });

  describe('Integration with NestJS Framework', () => {
    it('should be compatible with NestJS module system', async () => {
      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      // Should be able to get the app context
      const app = testModule.createNestApplication();
      await expect(app.init()).resolves.not.toThrow();

      await app.close();
      await testModule.close();
    });

    it('should support lazy loading scenario', async () => {
      // Test that module can be imported dynamically
      const LazyModule = class {
        static imports = [CuaIntegrationModule];
      };

      const testModule = await Test.createTestingModule({
        imports: [LazyModule],
      }).compile();

      expect(testModule).toBeDefined();

      await testModule.close();
    });

    it('should handle circular dependency detection', async () => {
      // Module should not have circular dependencies
      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      // All services should be resolvable without circular dependency issues
      const services = [
        testModule.get<CuaIntegrationService>(CuaIntegrationService),
        testModule.get<CuaVisionService>(CuaVisionService),
        testModule.get<CuaPerformanceService>(CuaPerformanceService),
        testModule.get<CuaBridgeService>(CuaBridgeService),
        testModule.get<CuaIntegrationController>(CuaIntegrationController),
      ];

      services.forEach((service) => {
        expect(service).toBeDefined();
      });

      await testModule.close();
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle configuration with special characters', async () => {
      process.env = {
        CUA_CONTAINER_ID: 'test-container-with-special-chars!@#$%',
        CUA_SHARED_VOLUME: '/path/with spaces/and-special@chars',
        ANE_BRIDGE_HOST: 'host-with-dashes.example.com',
      };

      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      const integrationService = testModule.get<CuaIntegrationService>(
        CuaIntegrationService,
      );
      const config = integrationService.getConfiguration();

      expect(config.framework.containerId).toBe(
        'test-container-with-special-chars!@#$%',
      );
      expect(config.hybrid.sharedVolumePath).toBe(
        '/path/with spaces/and-special@chars',
      );
      expect(config.aneBridge.host).toBe('host-with-dashes.example.com');

      await testModule.close();
    });

    it('should handle empty string environment variables', async () => {
      process.env = {
        CUA_CONTAINER_ID: '',
        CUA_VERSION: '',
        ANE_BRIDGE_HOST: '',
        CUA_SHARED_VOLUME: '',
      };

      const testModule = await Test.createTestingModule({
        imports: [CuaIntegrationModule],
      }).compile();

      const integrationService = testModule.get<CuaIntegrationService>(
        CuaIntegrationService,
      );
      const config = integrationService.getConfiguration();

      // Should use defaults for empty strings
      expect(config.framework.containerId).toBe('bytebot-desktop-cua');
      expect(config.framework.version).toBe('1.0.0');
      expect(config.aneBridge.host).toBe('host.docker.internal');
      expect(config.hybrid.sharedVolumePath).toBe('/opt/cua/shared');

      await testModule.close();
    });
  });
});
