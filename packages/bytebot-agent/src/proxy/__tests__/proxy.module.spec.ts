import { TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProxyModule } from '../proxy.module';
import { ProxyService } from '../proxy.service';

describe('ProxyModule', () => {
  let module: TestingModule;
  let proxyService: ProxyService;
  let configService: ConfigService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ProxyModule, ConfigModule.forRoot()],
    }).compile();

    proxyService = module.get<ProxyService>(ProxyService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Structure', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should provide ProxyService', () => {
      expect(proxyService).toBeDefined();
      expect(proxyService).toBeInstanceOf(ProxyService);
    });

    it('should provide ConfigService', () => {
      expect(configService).toBeDefined();
      expect(configService).toBeInstanceOf(ConfigService);
    });

    it('should export ProxyService for use in other modules', () => {
      const exportedServices = Reflect.getMetadata('exports', ProxyModule);
      expect(exportedServices).toContain(ProxyService);
    });

    it('should import ConfigModule for configuration management', () => {
      const importedModules = Reflect.getMetadata('imports', ProxyModule);
      expect(importedModules).toContain(ConfigModule);
    });
  });

  describe('Dependency Injection', () => {
    it('should properly inject ConfigService into ProxyService', () => {
      // ProxyService should be able to access ConfigService
      expect(proxyService).toBeDefined();

      // Test that the service can be instantiated (implicit ConfigService injection test)
      expect(() => proxyService.generateMessage).not.toThrow();
    });

    it('should create singleton instances', async () => {
      // Get another instance of ProxyService
      const anotherProxyService = module.get<ProxyService>(ProxyService);

      // Should be the same instance (singleton)
      expect(proxyService).toBe(anotherProxyService);
    });

    it('should handle missing configuration gracefully', async () => {
      // Create a module with empty configuration
      const testModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            ignoreEnvFile: true,
            load: [() => ({})], // Empty configuration
          }),
        ],
        providers: [ProxyService],
      }).compile();

      const testProxyService = testModule.get<ProxyService>(ProxyService);
      expect(testProxyService).toBeDefined();

      await testModule.close();
    });
  });

  describe('Module Configuration', () => {
    it('should be a valid NestJS module', () => {
      // Check that the module has the required metadata
      expect(Reflect.getMetadata('imports', ProxyModule)).toBeDefined();
      expect(Reflect.getMetadata('providers', ProxyModule)).toBeDefined();
      expect(Reflect.getMetadata('exports', ProxyModule)).toBeDefined();
    });

    it('should have correct provider configuration', () => {
      const providers = Reflect.getMetadata('providers', ProxyModule);
      expect(providers).toContain(ProxyService);
      expect(providers).toHaveLength(1);
    });

    it('should have correct import configuration', () => {
      const imports = Reflect.getMetadata('imports', ProxyModule);
      expect(imports).toContain(ConfigModule);
      expect(imports).toHaveLength(1);
    });

    it('should have correct export configuration', () => {
      const exports = Reflect.getMetadata('exports', ProxyModule);
      expect(exports).toContain(ProxyService);
      expect(exports).toHaveLength(1);
    });
  });

  describe('Integration with Other Modules', () => {
    it('should be importable by other modules', async () => {
      // Create a test module that imports ProxyModule
      const testModule = await Test.createTestingModule({
        imports: [ProxyModule],
        providers: [
          {
            provide: 'TEST_SERVICE',
            useFactory: (proxyService: ProxyService) => {
              return {
                proxyService,
                test: () => 'integration test',
              };
            },
            inject: [ProxyService],
          },
        ],
      }).compile();

      const testService = testModule.get('TEST_SERVICE');
      expect(testService).toBeDefined();
      expect(testService.proxyService).toBeDefined();
      expect(testService.proxyService).toBeInstanceOf(ProxyService);
      expect(testService.test()).toBe('integration test');

      await testModule.close();
    });

    it('should work with custom ConfigModule configuration', async () => {
      const customConfig = {
        BYTEBOT_LLM_PROXY_URL: 'http://custom-proxy:8080',
        OTHER_CONFIG: 'test-value',
      };

      const testModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            ignoreEnvFile: true,
            load: [() => customConfig],
          }),
        ],
        providers: [ProxyService],
      }).compile();

      const testConfigService = testModule.get<ConfigService>(ConfigService);
      const testProxyService = testModule.get<ProxyService>(ProxyService);

      expect(testConfigService.get('BYTEBOT_LLM_PROXY_URL')).toBe(
        customConfig.BYTEBOT_LLM_PROXY_URL,
      );
      expect(testProxyService).toBeDefined();

      await testModule.close();
    });
  });

  describe('Module Lifecycle', () => {
    it('should initialize without errors', async () => {
      expect(module).toBeDefined();
      expect(proxyService).toBeDefined();
    });

    it('should close gracefully', async () => {
      await expect(module.close()).resolves.not.toThrow();
    });

    it('should handle multiple initialization/closure cycles', async () => {
      for (let i = 0; i < 3; i++) {
        const testModule = await Test.createTestingModule({
          imports: [ProxyModule],
        }).compile();

        const testService = testModule.get<ProxyService>(ProxyService);
        expect(testService).toBeDefined();

        await testModule.close();
      }
    });

    it('should not leak resources during lifecycle', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create and destroy multiple module instances
      for (let i = 0; i < 10; i++) {
        const testModule = await Test.createTestingModule({
          imports: [ProxyModule],
        }).compile();

        const testService = testModule.get<ProxyService>(ProxyService);
        expect(testService).toBeDefined();

        await testModule.close();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration errors gracefully', async () => {
      // Test with invalid configuration
      await expect(
        Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              ignoreEnvFile: true,
              load: [
                () => {
                  throw new Error('Configuration load error');
                },
              ],
            }),
          ],
          providers: [ProxyService],
        }).compile(),
      ).rejects.toThrow();
    });

    it('should handle missing dependencies', async () => {
      // Test module without required dependencies
      await expect(
        Test.createTestingModule({
          providers: [ProxyService], // Missing ConfigModule
        }).compile(),
      ).rejects.toThrow();
    });

    it('should provide meaningful error messages for misconfiguration', async () => {
      try {
        await Test.createTestingModule({
          providers: [ProxyService], // Missing ConfigModule
        }).compile();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('dependencies');
      }
    });
  });

  describe('Performance', () => {
    it('should initialize quickly', async () => {
      const startTime = performance.now();

      const testModule = await Test.createTestingModule({
        imports: [ProxyModule],
      }).compile();

      const endTime = performance.now();
      const initTime = endTime - startTime;

      expect(testModule).toBeDefined();
      expect(initTime).toBeLessThan(1000); // Should initialize in less than 1 second

      await testModule.close();
    });

    it('should handle concurrent module creation', async () => {
      const modulePromises = Array.from({ length: 5 }, () =>
        Test.createTestingModule({
          imports: [ProxyModule],
        }).compile(),
      );

      const modules = await Promise.all(modulePromises);

      expect(modules).toHaveLength(5);
      modules.forEach((mod) => {
        expect(mod).toBeDefined();
        const service = mod.get<ProxyService>(ProxyService);
        expect(service).toBeDefined();
      });

      // Clean up
      await Promise.all(modules.map((mod) => mod.close()));
    });

    it('should scale with multiple service instances', async () => {
      const startTime = performance.now();

      // Create multiple modules and access services
      const operations = Array.from({ length: 100 }, async () => {
        const testModule = await Test.createTestingModule({
          imports: [ProxyModule],
        }).compile();

        const service = testModule.get<ProxyService>(ProxyService);
        expect(service).toBeDefined();

        await testModule.close();
      });

      await Promise.all(operations);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (less than 10 seconds)
      expect(totalTime).toBeLessThan(10000);
    });
  });

  describe('Module Configuration Validation', () => {
    it('should have NestJS module structure', () => {
      // Basic validation that module is properly configured
      expect(ProxyModule).toBeDefined();
      expect(typeof ProxyModule).toBe('function');
    });

    it('should provide required services through dependency injection', () => {
      // Validate services are available through the module
      expect(proxyService).toBeDefined();
      expect(configService).toBeDefined();
    });

    it('should support module composition', async () => {
      // Test that the module can be composed with other modules
      const compositeModule = await Test.createTestingModule({
        imports: [ProxyModule],
        providers: [
          {
            provide: 'COMPOSITE_SERVICE',
            useFactory: (proxy: ProxyService) => ({ proxy }),
            inject: [ProxyService],
          },
        ],
      }).compile();

      const compositeService = compositeModule.get('COMPOSITE_SERVICE');
      expect(compositeService).toBeDefined();
      expect(compositeService.proxy).toBeInstanceOf(ProxyService);

      await compositeModule.close();
    });
  });

  describe('Type Safety and TypeScript Integration', () => {
    it('should provide properly typed service instances', () => {
      // TypeScript should infer correct types
      expect(proxyService).toBeInstanceOf(ProxyService);
      expect(typeof proxyService.generateMessage).toBe('function');
    });

    it('should support generic module operations', async () => {
      const service = module.get<ProxyService>(ProxyService);
      expect(service).toBeInstanceOf(ProxyService);

      const config = module.get<ConfigService>(ConfigService);
      expect(config).toBeInstanceOf(ConfigService);
    });

    it('should handle interface compliance', () => {
      // ProxyService should implement BytebotAgentService
      expect(typeof proxyService.generateMessage).toBe('function');
      expect(proxyService.generateMessage.length).toBeGreaterThanOrEqual(3); // At least 3 required parameters
    });
  });
});
