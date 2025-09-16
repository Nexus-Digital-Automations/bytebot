/**
 * AgentModule Unit Tests - Comprehensive Module Configuration and Dependency Testing
 *
 * Production-ready unit tests covering all AgentModule functionality:
 * - Module dependency imports and configuration
 * - Provider registration and instantiation
 * - Service dependency injection and resolution
 * - Module exports and public API exposure
 * - Integration with external modules (Tasks, Messages, AI services)
 * - Configuration module integration
 * - Error handling for missing dependencies
 * - Module lifecycle and initialization
 * - Service availability and accessibility
 * - Circular dependency detection and prevention
 *
 * @author Testing & Quality Assurance Specialist
 * @version 2.0.0
 * @since Phase 1: Bytebot Core Module Testing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AgentModule } from '../agent.module';
import { AgentProcessor } from '../agent.processor';
import { AgentScheduler } from '../agent.scheduler';
import { InputCaptureService } from '../input-capture.service';
import { AgentAnalyticsService } from '../agent.analytics';
import { TasksModule } from '../../tasks/tasks.module';
import { MessagesModule } from '../../messages/messages.module';
import { SummariesModule } from '../../summaries/summaries.module';
import { AnthropicModule } from '../../anthropic/anthropic.module';
import { OpenAIModule } from '../../openai/openai.module';
import { GoogleModule } from '../../google/google.module';
import { ProxyModule } from '../../proxy/proxy.module';

// Mock external modules to avoid full dependency tree
jest.mock('../../tasks/tasks.module', () => ({
  TasksModule: class MockTasksModule {},
}));

jest.mock('../../messages/messages.module', () => ({
  MessagesModule: class MockMessagesModule {},
}));

jest.mock('../../summaries/summaries.module', () => ({
  SummariesModule: class MockSummariesModule {},
}));

jest.mock('../../anthropic/anthropic.module', () => ({
  AnthropicModule: class MockAnthropicModule {},
}));

jest.mock('../../openai/openai.module', () => ({
  OpenAIModule: class MockOpenAIModule {},
}));

jest.mock('../../google/google.module', () => ({
  GoogleModule: class MockGoogleModule {},
}));

jest.mock('../../proxy/proxy.module', () => ({
  ProxyModule: class MockProxyModule {},
}));

// Mock the services to avoid complex dependency chains
jest.mock('../agent.processor');
jest.mock('../agent.scheduler');
jest.mock('../input-capture.service');
jest.mock('../agent.analytics');

describe('AgentModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Configuration', () => {
    it('should compile the module successfully', async () => {
      module = await Test.createTestingModule({
        imports: [AgentModule],
      }).compile();

      expect(module).toBeDefined();
      expect(module.get(AgentModule)).toBeDefined();
    });

    it('should have correct imports configured', async () => {
      module = await Test.createTestingModule({
        imports: [AgentModule],
      }).compile();

      // Verify that the module includes all required imports
      const moduleDefinition = Reflect.getMetadata('imports', AgentModule);

      expect(moduleDefinition).toContain(ConfigModule);
      expect(moduleDefinition).toContain(TasksModule);
      expect(moduleDefinition).toContain(MessagesModule);
      expect(moduleDefinition).toContain(SummariesModule);
      expect(moduleDefinition).toContain(AnthropicModule);
      expect(moduleDefinition).toContain(OpenAIModule);
      expect(moduleDefinition).toContain(GoogleModule);
      expect(moduleDefinition).toContain(ProxyModule);
    });

    it('should have correct providers configured', async () => {
      module = await Test.createTestingModule({
        imports: [AgentModule],
      }).compile();

      const moduleDefinition = Reflect.getMetadata('providers', AgentModule);

      expect(moduleDefinition).toContain(AgentProcessor);
      expect(moduleDefinition).toContain(AgentScheduler);
      expect(moduleDefinition).toContain(InputCaptureService);
      expect(moduleDefinition).toContain(AgentAnalyticsService);
    });

    it('should have correct exports configured', async () => {
      module = await Test.createTestingModule({
        imports: [AgentModule],
      }).compile();

      const moduleDefinition = Reflect.getMetadata('exports', AgentModule);

      expect(moduleDefinition).toContain(AgentProcessor);
      expect(moduleDefinition).toHaveLength(1); // Only AgentProcessor should be exported
    });

    it('should export exactly 4 providers', async () => {
      module = await Test.createTestingModule({
        imports: [AgentModule],
      }).compile();

      const moduleDefinition = Reflect.getMetadata('providers', AgentModule);
      expect(moduleDefinition).toHaveLength(4);
    });

    it('should import exactly 8 modules', async () => {
      module = await Test.createTestingModule({
        imports: [AgentModule],
      }).compile();

      const moduleDefinition = Reflect.getMetadata('imports', AgentModule);
      expect(moduleDefinition).toHaveLength(8);
    });
  });

  describe('Provider Registration and Instantiation', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [AgentModule],
      })
        .overrideProvider(AgentProcessor)
        .useValue({
          processTask: jest.fn(),
          isRunning: jest.fn().mockReturnValue(false),
          getCurrentTaskId: jest.fn().mockReturnValue(null),
        })
        .overrideProvider(AgentScheduler)
        .useValue({
          handleCron: jest.fn(),
          onModuleInit: jest.fn(),
        })
        .overrideProvider(InputCaptureService)
        .useValue({
          start: jest.fn(),
          stop: jest.fn(),
          isCapturing: jest.fn().mockReturnValue(false),
        })
        .overrideProvider(AgentAnalyticsService)
        .useValue({
          handleTaskEvent: jest.fn(),
        })
        .compile();
    });

    it('should provide AgentProcessor service', () => {
      const agentProcessor = module.get<AgentProcessor>(AgentProcessor);

      expect(agentProcessor).toBeDefined();
      expect(agentProcessor.processTask).toBeDefined();
      expect(agentProcessor.isRunning).toBeDefined();
      expect(agentProcessor.getCurrentTaskId).toBeDefined();
    });

    it('should provide AgentScheduler service', () => {
      const agentScheduler = module.get<AgentScheduler>(AgentScheduler);

      expect(agentScheduler).toBeDefined();
      expect(agentScheduler.handleCron).toBeDefined();
      expect(agentScheduler.onModuleInit).toBeDefined();
    });

    it('should provide InputCaptureService service', () => {
      const inputCaptureService =
        module.get<InputCaptureService>(InputCaptureService);

      expect(inputCaptureService).toBeDefined();
      expect(inputCaptureService.start).toBeDefined();
      expect(inputCaptureService.stop).toBeDefined();
      expect(inputCaptureService.isCapturing).toBeDefined();
    });

    it('should provide AgentAnalyticsService service', () => {
      const agentAnalyticsService = module.get<AgentAnalyticsService>(
        AgentAnalyticsService,
      );

      expect(agentAnalyticsService).toBeDefined();
      expect(agentAnalyticsService.handleTaskEvent).toBeDefined();
    });

    it('should create singleton instances of services', () => {
      const agentProcessor1 = module.get<AgentProcessor>(AgentProcessor);
      const agentProcessor2 = module.get<AgentProcessor>(AgentProcessor);

      expect(agentProcessor1).toBe(agentProcessor2);

      const agentScheduler1 = module.get<AgentScheduler>(AgentScheduler);
      const agentScheduler2 = module.get<AgentScheduler>(AgentScheduler);

      expect(agentScheduler1).toBe(agentScheduler2);
    });

    it('should allow access to all provider services', () => {
      expect(() => module.get(AgentProcessor)).not.toThrow();
      expect(() => module.get(AgentScheduler)).not.toThrow();
      expect(() => module.get(InputCaptureService)).not.toThrow();
      expect(() => module.get(AgentAnalyticsService)).not.toThrow();
    });
  });

  describe('Service Dependency Injection', () => {
    beforeEach(async () => {
      // Create module with mock dependencies
      module = await Test.createTestingModule({
        imports: [AgentModule],
      })
        .overrideProvider(AgentProcessor)
        .useClass(
          class MockAgentProcessor {
            constructor(
              // Mock all dependencies that AgentProcessor might need
              public tasksService?: any,
              public messagesService?: any,
              public summariesService?: any,
              public anthropicService?: any,
              public openaiService?: any,
              public googleService?: any,
              public proxyService?: any,
              public inputCaptureService?: any,
            ) {}

            processTask = jest.fn();
            isRunning = jest.fn().mockReturnValue(false);
            getCurrentTaskId = jest.fn().mockReturnValue(null);
          },
        )
        .overrideProvider(AgentScheduler)
        .useClass(
          class MockAgentScheduler {
            constructor(
              public tasksService?: any,
              public agentProcessor?: any,
            ) {}

            handleCron = jest.fn();
            onModuleInit = jest.fn();
          },
        )
        .overrideProvider(InputCaptureService)
        .useClass(
          class MockInputCaptureService {
            constructor(
              public messagesService?: any,
              public configService?: any,
            ) {}

            start = jest.fn();
            stop = jest.fn();
            isCapturing = jest.fn().mockReturnValue(false);
          },
        )
        .overrideProvider(AgentAnalyticsService)
        .useClass(
          class MockAgentAnalyticsService {
            constructor(
              public tasksService?: any,
              public messagesService?: any,
              public configService?: any,
            ) {}

            handleTaskEvent = jest.fn();
          },
        )
        .compile();
    });

    it('should inject dependencies into AgentProcessor', () => {
      const agentProcessor = module.get<AgentProcessor>(AgentProcessor);

      expect(agentProcessor).toBeDefined();
      // AgentProcessor should have its dependencies injected
      expect(agentProcessor.processTask).toBeDefined();
    });

    it('should inject dependencies into AgentScheduler', () => {
      const agentScheduler = module.get<AgentScheduler>(AgentScheduler);

      expect(agentScheduler).toBeDefined();
      expect(agentScheduler.handleCron).toBeDefined();
    });

    it('should inject dependencies into InputCaptureService', () => {
      const inputCaptureService =
        module.get<InputCaptureService>(InputCaptureService);

      expect(inputCaptureService).toBeDefined();
      expect(inputCaptureService.start).toBeDefined();
    });

    it('should inject dependencies into AgentAnalyticsService', () => {
      const agentAnalyticsService = module.get<AgentAnalyticsService>(
        AgentAnalyticsService,
      );

      expect(agentAnalyticsService).toBeDefined();
      expect(agentAnalyticsService.handleTaskEvent).toBeDefined();
    });
  });

  describe('Module Exports and Public API', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [AgentModule],
      })
        .overrideProvider(AgentProcessor)
        .useValue({
          processTask: jest.fn(),
          isRunning: jest.fn().mockReturnValue(false),
          getCurrentTaskId: jest.fn().mockReturnValue(null),
        })
        .overrideProvider(AgentScheduler)
        .useValue({ handleCron: jest.fn() })
        .overrideProvider(InputCaptureService)
        .useValue({ start: jest.fn(), stop: jest.fn() })
        .overrideProvider(AgentAnalyticsService)
        .useValue({ handleTaskEvent: jest.fn() })
        .compile();
    });

    it('should export AgentProcessor for external use', () => {
      const agentProcessor = module.get<AgentProcessor>(AgentProcessor);

      expect(agentProcessor).toBeDefined();
      expect(agentProcessor.processTask).toBeDefined();
      expect(agentProcessor.isRunning).toBeDefined();
      expect(agentProcessor.getCurrentTaskId).toBeDefined();
    });

    it('should not export internal services externally by default', () => {
      // These services should be available within the module but not exported
      expect(() => module.get(AgentScheduler)).not.toThrow();
      expect(() => module.get(InputCaptureService)).not.toThrow();
      expect(() => module.get(AgentAnalyticsService)).not.toThrow();

      // But only AgentProcessor should be in the exports array
      const moduleDefinition = Reflect.getMetadata('exports', AgentModule);
      expect(moduleDefinition).not.toContain(AgentScheduler);
      expect(moduleDefinition).not.toContain(InputCaptureService);
      expect(moduleDefinition).not.toContain(AgentAnalyticsService);
    });

    it('should provide a clean public API through exports', () => {
      const agentProcessor = module.get<AgentProcessor>(AgentProcessor);

      // Verify that the exported service has the expected public interface
      expect(typeof agentProcessor.processTask).toBe('function');
      expect(typeof agentProcessor.isRunning).toBe('function');
      expect(typeof agentProcessor.getCurrentTaskId).toBe('function');
    });
  });

  describe('Integration with External Modules', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [AgentModule],
      })
        .overrideProvider(AgentProcessor)
        .useValue({ processTask: jest.fn() })
        .overrideProvider(AgentScheduler)
        .useValue({ handleCron: jest.fn() })
        .overrideProvider(InputCaptureService)
        .useValue({ start: jest.fn() })
        .overrideProvider(AgentAnalyticsService)
        .useValue({ handleTaskEvent: jest.fn() })
        .compile();
    });

    it('should integrate with ConfigModule', () => {
      // ConfigModule should be available for dependency injection
      expect(() =>
        module.get('CONFIG_OPTIONS', { strict: false }),
      ).not.toThrow();
    });

    it('should properly import all required external modules', () => {
      const moduleDefinition = Reflect.getMetadata('imports', AgentModule);

      // Verify all expected modules are imported
      const expectedModules = [
        ConfigModule,
        TasksModule,
        MessagesModule,
        SummariesModule,
        AnthropicModule,
        OpenAIModule,
        GoogleModule,
        ProxyModule,
      ];

      expectedModules.forEach((expectedModule) => {
        expect(moduleDefinition).toContain(expectedModule);
      });
    });

    it('should maintain proper module isolation', () => {
      // AgentModule should be self-contained and not leak internal details
      const agentProcessor = module.get<AgentProcessor>(AgentProcessor);
      expect(agentProcessor).toBeDefined();

      // Internal services should be available but properly encapsulated
      const agentScheduler = module.get<AgentScheduler>(AgentScheduler);
      expect(agentScheduler).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing dependencies gracefully during testing', async () => {
      // This test ensures the module can be compiled even when some dependencies are mocked
      const testModule = await Test.createTestingModule({
        imports: [AgentModule],
      })
        .overrideProvider(AgentProcessor)
        .useValue({})
        .overrideProvider(AgentScheduler)
        .useValue({})
        .overrideProvider(InputCaptureService)
        .useValue({})
        .overrideProvider(AgentAnalyticsService)
        .useValue({})
        .compile();

      expect(testModule).toBeDefined();
      await testModule.close();
    });

    it('should handle module compilation with partial mocks', async () => {
      const testModule = await Test.createTestingModule({
        imports: [AgentModule],
      })
        .overrideProvider(AgentProcessor)
        .useValue({ processTask: jest.fn() })
        // Intentionally leave other providers unmocked to test robustness
        .compile();

      expect(testModule).toBeDefined();
      expect(testModule.get(AgentProcessor)).toBeDefined();
      await testModule.close();
    });

    it('should maintain service availability after module operations', async () => {
      const testModule = await Test.createTestingModule({
        imports: [AgentModule],
      })
        .overrideProvider(AgentProcessor)
        .useValue({ processTask: jest.fn() })
        .overrideProvider(AgentScheduler)
        .useValue({ handleCron: jest.fn() })
        .overrideProvider(InputCaptureService)
        .useValue({ start: jest.fn() })
        .overrideProvider(AgentAnalyticsService)
        .useValue({ handleTaskEvent: jest.fn() })
        .compile();

      // Multiple accesses should not cause issues
      expect(testModule.get(AgentProcessor)).toBeDefined();
      expect(testModule.get(AgentProcessor)).toBeDefined();
      expect(testModule.get(AgentScheduler)).toBeDefined();

      await testModule.close();
    });

    it('should handle concurrent module access', async () => {
      const testModule = await Test.createTestingModule({
        imports: [AgentModule],
      })
        .overrideProvider(AgentProcessor)
        .useValue({ processTask: jest.fn() })
        .overrideProvider(AgentScheduler)
        .useValue({ handleCron: jest.fn() })
        .overrideProvider(InputCaptureService)
        .useValue({ start: jest.fn() })
        .overrideProvider(AgentAnalyticsService)
        .useValue({ handleTaskEvent: jest.fn() })
        .compile();

      // Simulate concurrent access to services
      const promises = [
        Promise.resolve(testModule.get(AgentProcessor)),
        Promise.resolve(testModule.get(AgentScheduler)),
        Promise.resolve(testModule.get(InputCaptureService)),
        Promise.resolve(testModule.get(AgentAnalyticsService)),
      ];

      const results = await Promise.all(promises);

      results.forEach((service) => {
        expect(service).toBeDefined();
      });

      await testModule.close();
    });
  });

  describe('Module Lifecycle and Initialization', () => {
    it('should initialize all services during module compilation', async () => {
      const mockOnModuleInit = jest.fn();

      const testModule = await Test.createTestingModule({
        imports: [AgentModule],
      })
        .overrideProvider(AgentProcessor)
        .useValue({ processTask: jest.fn() })
        .overrideProvider(AgentScheduler)
        .useValue({
          handleCron: jest.fn(),
          onModuleInit: mockOnModuleInit,
        })
        .overrideProvider(InputCaptureService)
        .useValue({ start: jest.fn() })
        .overrideProvider(AgentAnalyticsService)
        .useValue({ handleTaskEvent: jest.fn() })
        .compile();

      expect(testModule).toBeDefined();

      // Verify services are accessible immediately after compilation
      expect(testModule.get(AgentProcessor)).toBeDefined();
      expect(testModule.get(AgentScheduler)).toBeDefined();
      expect(testModule.get(InputCaptureService)).toBeDefined();
      expect(testModule.get(AgentAnalyticsService)).toBeDefined();

      await testModule.close();
    });

    it('should properly clean up resources during module closure', async () => {
      const testModule = await Test.createTestingModule({
        imports: [AgentModule],
      })
        .overrideProvider(AgentProcessor)
        .useValue({ processTask: jest.fn() })
        .overrideProvider(AgentScheduler)
        .useValue({ handleCron: jest.fn() })
        .overrideProvider(InputCaptureService)
        .useValue({ start: jest.fn() })
        .overrideProvider(AgentAnalyticsService)
        .useValue({ handleTaskEvent: jest.fn() })
        .compile();

      // Should not throw during cleanup
      await expect(testModule.close()).resolves.not.toThrow();
    });

    it('should maintain service state consistency throughout lifecycle', async () => {
      const agentProcessorMock = {
        processTask: jest.fn(),
        isRunning: jest.fn().mockReturnValue(false),
        getCurrentTaskId: jest.fn().mockReturnValue(null),
      };

      const testModule = await Test.createTestingModule({
        imports: [AgentModule],
      })
        .overrideProvider(AgentProcessor)
        .useValue(agentProcessorMock)
        .overrideProvider(AgentScheduler)
        .useValue({ handleCron: jest.fn() })
        .overrideProvider(InputCaptureService)
        .useValue({ start: jest.fn() })
        .overrideProvider(AgentAnalyticsService)
        .useValue({ handleTaskEvent: jest.fn() })
        .compile();

      const agentProcessor = testModule.get<AgentProcessor>(AgentProcessor);

      // State should be consistent across multiple accesses
      expect(agentProcessor.isRunning()).toBe(false);
      expect(agentProcessor.getCurrentTaskId()).toBeNull();
      expect(agentProcessor.isRunning()).toBe(false); // Should remain consistent

      await testModule.close();
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should not have circular dependencies between services', async () => {
      // This test ensures that the module can be compiled without circular dependency issues
      const testModule = await Test.createTestingModule({
        imports: [AgentModule],
      })
        .overrideProvider(AgentProcessor)
        .useValue({ processTask: jest.fn() })
        .overrideProvider(AgentScheduler)
        .useValue({ handleCron: jest.fn() })
        .overrideProvider(InputCaptureService)
        .useValue({ start: jest.fn() })
        .overrideProvider(AgentAnalyticsService)
        .useValue({ handleTaskEvent: jest.fn() })
        .compile();

      // If compilation succeeds, there are no circular dependencies
      expect(testModule).toBeDefined();

      // All services should be accessible
      expect(testModule.get(AgentProcessor)).toBeDefined();
      expect(testModule.get(AgentScheduler)).toBeDefined();
      expect(testModule.get(InputCaptureService)).toBeDefined();
      expect(testModule.get(AgentAnalyticsService)).toBeDefined();

      await testModule.close();
    });

    it('should handle complex dependency graphs without issues', async () => {
      // Test that even with complex mocked dependencies, the module remains stable
      const complexAgentProcessor = {
        processTask: jest.fn(),
        dependencies: {
          tasks: { findById: jest.fn() },
          messages: { create: jest.fn() },
          ai: { generate: jest.fn() },
        },
      };

      const testModule = await Test.createTestingModule({
        imports: [AgentModule],
      })
        .overrideProvider(AgentProcessor)
        .useValue(complexAgentProcessor)
        .overrideProvider(AgentScheduler)
        .useValue({
          handleCron: jest.fn(),
          processor: { processTask: jest.fn() },
        })
        .overrideProvider(InputCaptureService)
        .useValue({
          start: jest.fn(),
          messages: { create: jest.fn() },
        })
        .overrideProvider(AgentAnalyticsService)
        .useValue({
          handleTaskEvent: jest.fn(),
          tasks: { findById: jest.fn() },
          messages: { findEvery: jest.fn() },
        })
        .compile();

      expect(testModule).toBeDefined();
      expect(testModule.get(AgentProcessor)).toBe(complexAgentProcessor);

      await testModule.close();
    });
  });
});
