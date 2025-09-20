/**
 * Test Utils Integration Test Suite - Meta-Testing for Testing Infrastructure
 *
 * Tests the testing utilities themselves to ensure reliable test infrastructure
 * Validates mocks, helpers, templates, and test configuration integrity
 *
 * @author Claude Code
 * @version 1.0.0
 * @since Testing Infrastructure Validation Phase
 */

import { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MockRegistry,
  MockConfig,
  resetAllMocks,
  configureMocks,
  toggleMockFeatures,
} from '../mocks';

describe('Test Utils Integration', () => {
  let module: TestingModule;

  beforeEach(async () => {
    resetAllMocks();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
    resetAllMocks();
  });

  describe('Mock Registry', () => {
    it('should provide all required mock modules', () => {
      expect(MockRegistry.NestJS).toBeDefined();
      expect(MockRegistry.Auth).toBeDefined();
      expect(MockRegistry.Agent).toBeDefined();
      expect(MockRegistry.Database).toBeDefined();
      expect(MockRegistry.ExternalAPIs).toBeDefined();
      expect(MockRegistry.WebSocket).toBeDefined();
      expect(MockRegistry.Config).toBeDefined();
    });

    it('should have consistent mock interfaces', () => {
      // Check that each mock registry provides expected functions
      expect(typeof MockRegistry.NestJS.createMockModule).toBe('function');
      expect(typeof MockRegistry.Auth.createMockAuthService).toBe('function');
      expect(typeof MockRegistry.Agent.createMockAgentProcessor).toBe(
        'function',
      );
      expect(typeof MockRegistry.Database.createMockPrismaService).toBe(
        'function',
      );
    });
  });

  describe('Mock Configuration', () => {
    it('should provide default configuration values', () => {
      expect(MockConfig.auth).toBeDefined();
      expect(MockConfig.agent).toBeDefined();
      expect(MockConfig.database).toBeDefined();
      expect(MockConfig.externalAPIs).toBeDefined();
      expect(MockConfig.websocket).toBeDefined();
    });

    it('should have secure default values for testing', () => {
      expect(MockConfig.auth.jwt.secret).toContain('test');
      expect(MockConfig.auth.jwt.expiresIn).toBe('1h');
      expect(MockConfig.database.url).toBe(':memory:');
      expect(MockConfig.database.provider).toBe('sqlite');
    });

    it('should allow configuration updates', () => {
      const originalTimeout = MockConfig.agent.processing.defaultTimeout;

      configureMocks({
        agent: {
          processing: {
            defaultTimeout: 10000,
            maxRetries: 5,
            simulateLatency: true,
          },
        },
      });

      expect(MockConfig.agent.processing.defaultTimeout).toBe(10000);
      expect(MockConfig.agent.processing.maxRetries).toBe(5);
      expect(MockConfig.agent.processing.simulateLatency).toBe(true);

      // Reset to original
      MockConfig.agent.processing.defaultTimeout = originalTimeout;
    });

    it('should toggle mock features independently', () => {
      const originalAuthState = MockConfig.auth.users.enableTestUsers;
      const originalDatabaseState = MockConfig.database.resetBetweenTests;

      toggleMockFeatures({
        auth: false,
        database: false,
        externalAPIs: true,
        websocket: true,
      });

      expect(MockConfig.auth.users.enableTestUsers).toBe(false);
      expect(MockConfig.database.resetBetweenTests).toBe(false);
      expect(MockConfig.externalAPIs.anthropic.enableMock).toBe(true);
      expect(MockConfig.websocket.mockConnections).toBe(true);

      // Reset to original
      MockConfig.auth.users.enableTestUsers = originalAuthState;
      MockConfig.database.resetBetweenTests = originalDatabaseState;
    });
  });

  describe('NestJS Mock Integration', () => {
    it('should create functional NestJS test modules', async () => {
      const mockModule = MockRegistry.NestJS.createMockModule({
        providers: ['TestService'],
        controllers: ['TestController'],
      });

      module = await Test.createTestingModule(mockModule).compile();

      expect(module).toBeDefined();
      expect(module.get).toBeDefined();
    });

    it('should provide proper dependency injection mocks', async () => {
      const mockConfigService = MockRegistry.Config.createMockConfigService({
        'test.value': 'mock-config-value',
      });

      module = await Test.createTestingModule({
        providers: [
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const configService = module.get<ConfigService>(ConfigService);
      expect(configService.get('test.value')).toBe('mock-config-value');
    });
  });

  describe('Authentication Mock Validation', () => {
    it('should provide functional JWT mock service', async () => {
      const mockJwtService = MockRegistry.Auth.createMockJwtService();

      module = await Test.createTestingModule({
        providers: [
          {
            provide: JwtService,
            useValue: mockJwtService,
          },
        ],
      }).compile();

      const jwtService = module.get<JwtService>(JwtService);

      const token = jwtService.sign({ sub: 'user-123', role: 'admin' });
      expect(typeof token).toBe('string');
      expect(token).toContain('mock-jwt-token');

      const decoded = jwtService.verify(token);
      expect(decoded).toMatchObject({
        sub: 'user-123',
        role: 'admin',
      });
    });

    it('should provide consistent user mock data', () => {
      const mockUser = MockRegistry.Auth.createMockUser({
        id: 'test-user-id',
        role: 'admin',
      });

      expect(mockUser.id).toBe('test-user-id');
      expect(mockUser.role).toBe('admin');
      expect(mockUser.email).toContain('@');
      expect(mockUser.username).toBeDefined();
      expect(mockUser.isActive).toBe(true);
    });

    it('should handle authentication scenarios', () => {
      const mockAuthGuard = MockRegistry.Auth.createMockAuthGuard();

      // Test successful authentication
      const authenticatedContext =
        MockRegistry.NestJS.createMockExecutionContext({
          user: { id: 'user-123', role: 'admin' },
        });

      expect(mockAuthGuard.canActivate(authenticatedContext)).toBe(true);

      // Test failed authentication
      const unauthenticatedContext =
        MockRegistry.NestJS.createMockExecutionContext({
          user: null,
        });

      expect(mockAuthGuard.canActivate(unauthenticatedContext)).toBe(false);
    });
  });

  describe('Database Mock Validation', () => {
    it('should provide functional Prisma mock service', async () => {
      const mockPrismaService = MockRegistry.Database.createMockPrismaService();

      module = await Test.createTestingModule({
        providers: [
          {
            provide: PrismaService,
            useValue: mockPrismaService,
          },
        ],
      }).compile();

      const prismaService = module.get<PrismaService>(PrismaService);

      // Test mock user operations
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      };

      prismaService.user.create.mockResolvedValue(mockUser as any);
      const createdUser = await prismaService.user.create({
        _data: mockUser,
      });

      expect(createdUser).toEqual(mockUser);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        _data: mockUser,
      });
    });

    it('should simulate database transactions', async () => {
      const mockPrismaService = MockRegistry.Database.createMockPrismaService();

      const transactionResult = await mockPrismaService.$transaction([
        mockPrismaService.user.create({ _data: { username: 'user1' } }),
        mockPrismaService.user.create({ _data: { username: 'user2' } }),
      ]);

      expect(transactionResult).toHaveLength(2);
      expect(transactionResult[0].username).toBe('user1');
      expect(transactionResult[1].username).toBe('user2');
    });

    it('should handle database errors appropriately', async () => {
      const mockPrismaService = MockRegistry.Database.createMockPrismaService();

      mockPrismaService.user.create.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        mockPrismaService.user.create({ _data: { username: 'test' } }),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('External API Mock Validation', () => {
    it('should mock Anthropic API responses', async () => {
      const mockAnthropicService =
        MockRegistry.ExternalAPIs.createMockAnthropicService();

      const response = await mockAnthropicService.createCompletion({
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 100,
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(response.content[0].text).toContain('Hello');
      expect(response.usage.input_tokens).toBeGreaterThan(0);
      expect(response.usage.output_tokens).toBeGreaterThan(0);
    });

    it('should mock OpenAI API responses', async () => {
      const mockOpenAIService =
        MockRegistry.ExternalAPIs.createMockOpenAIService();

      const response = await mockOpenAIService.createChatCompletion({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 100,
      });

      expect(response).toBeDefined();
      expect(response.choices).toHaveLength(1);
      expect(response.choices[0].message.content).toContain('Hello');
      expect(response.usage.prompt_tokens).toBeGreaterThan(0);
      expect(response.usage.completion_tokens).toBeGreaterThan(0);
    });

    it('should simulate API rate limiting and errors', async () => {
      const mockAnthropicService =
        MockRegistry.ExternalAPIs.createMockAnthropicService({
          enableErrorSimulation: true,
          errorRate: 0.5, // 50% error rate
        });

      let errorCount = 0;
      const totalRequests = 10;

      for (let i = 0; i < totalRequests; i++) {
        try {
          await mockAnthropicService.createCompletion({
            model: 'claude-3-sonnet-20240229',
            messages: [{ role: 'user', content: `Request ${i}` }],
            max_tokens: 10,
          });
        } catch (error) {
          errorCount++;
        }
      }

      // Should have some errors due to simulation
      expect(errorCount).toBeGreaterThan(0);
      expect(errorCount).toBeLessThan(totalRequests);
    });
  });

  describe('WebSocket Mock Validation', () => {
    it('should mock WebSocket connections', () => {
      const mockWebSocketGateway =
        MockRegistry.WebSocket.createMockWebSocketGateway();

      const mockClient = MockRegistry.WebSocket.createMockSocketClient();
      const eventData = { message: 'test-message' };

      mockWebSocketGateway.handleConnection(mockClient);
      mockWebSocketGateway.handleMessage(mockClient, eventData);

      expect(mockClient.emit).toHaveBeenCalledWith(
        'message-received',
        expect.objectContaining(eventData),
      );
    });

    it('should simulate WebSocket disconnections', () => {
      const mockWebSocketGateway =
        MockRegistry.WebSocket.createMockWebSocketGateway();
      const mockClient = MockRegistry.WebSocket.createMockSocketClient();

      mockWebSocketGateway.handleConnection(mockClient);
      expect(mockWebSocketGateway.connectedClients.size).toBe(1);

      mockWebSocketGateway.handleDisconnect(mockClient);
      expect(mockWebSocketGateway.connectedClients.size).toBe(0);
    });

    it('should handle WebSocket room management', () => {
      const mockWebSocketGateway =
        MockRegistry.WebSocket.createMockWebSocketGateway();
      const mockClient = MockRegistry.WebSocket.createMockSocketClient();

      mockWebSocketGateway.handleConnection(mockClient);
      mockWebSocketGateway.handleJoinRoom(mockClient, { room: 'test-room' });

      expect(mockClient.join).toHaveBeenCalledWith('test-room');

      mockWebSocketGateway.broadcastToRoom('test-room', {
        _event: 'room-message',
        _data: 'Hello room',
      });

      expect(mockClient.to).toHaveBeenCalledWith('test-room');
    });
  });

  describe('Test Helpers and Templates', () => {
    it('should provide auth test helpers', async () => {
      const { AuthTestHelper } = await import('../helpers/auth-test-helper');

      const helper = new AuthTestHelper();
      const mockRequest = helper.createAuthenticatedRequest({
        user: { id: 'user-123', role: 'admin' },
      });

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user.id).toBe('user-123');
      expect(mockRequest.user.role).toBe('admin');
      expect(mockRequest.headers.authorization).toContain('Bearer');
    });

    it('should provide database test helpers', async () => {
      const { DatabaseTestHelper } = await import(
        '../helpers/database-test-helper'
      );

      const helper = new DatabaseTestHelper();
      const testData = helper.createTestUser({
        username: 'testuser',
        email: 'test@example.com',
      });

      expect(testData.username).toBe('testuser');
      expect(testData.email).toBe('test@example.com');
      expect(testData.id).toBeDefined();
      expect(testData.createdAt).toBeInstanceOf(Date);
    });

    it('should provide NestJS test builder', async () => {
      const { NestJSTestBuilder } = await import(
        '../helpers/nestjs-test-builder'
      );

      const builder = new NestJSTestBuilder()
        .withProvider('TestService')
        .withController('TestController')
        .withMockDatabase()
        .withMockAuth();

      const moduleDefinition = builder.build();

      expect(moduleDefinition.providers).toBeDefined();
      expect(moduleDefinition.controllers).toBeDefined();
      expect(moduleDefinition.imports).toBeDefined();
    });
  });

  describe('Test Templates', () => {
    it('should provide unit test templates', async () => {
      const { UnitTestTemplate } = await import(
        '../templates/unit-test.template'
      );

      const template = new UnitTestTemplate({
        serviceName: 'TestService',
        mockDependencies: ['ConfigService', 'PrismaService'],
      });

      const testSuite = template.generate();

      expect(testSuite).toContain("describe('TestService'");
      expect(testSuite).toContain('beforeEach');
      expect(testSuite).toContain('afterEach');
      expect(testSuite).toContain('ConfigService');
      expect(testSuite).toContain('PrismaService');
    });

    it('should provide integration test templates', async () => {
      const { IntegrationTestTemplate } = await import(
        '../templates/integration-test.template'
      );

      const template = new IntegrationTestTemplate({
        moduleName: 'TestModule',
        endpoints: ['/test', '/test/:id'],
      });

      const testSuite = template.generate();

      expect(testSuite).toContain("describe('TestModule Integration'");
      expect(testSuite).toContain('beforeAll');
      expect(testSuite).toContain('afterAll');
      expect(testSuite).toContain('GET /test');
      expect(testSuite).toContain('GET /test/:id');
    });

    it('should provide E2E test templates', async () => {
      const { E2ETestTemplate } = await import(
        '../templates/e2e-test.template'
      );

      const template = new E2ETestTemplate({
        appName: 'TestApp',
        workflows: ['user-registration', 'task-creation'],
      });

      const testSuite = template.generate();

      expect(testSuite).toContain("describe('TestApp E2E'");
      expect(testSuite).toContain('beforeAll');
      expect(testSuite).toContain('afterAll');
      expect(testSuite).toContain('user-registration');
      expect(testSuite).toContain('task-creation');
    });
  });

  describe('Mock Reset and Cleanup', () => {
    it('should reset all mocks properly', () => {
      const mockFn = jest.fn();
      mockFn('test-call');

      expect(mockFn).toHaveBeenCalledWith('test-call');
      expect(mockFn).toHaveBeenCalledTimes(1);

      resetAllMocks();

      expect(mockFn).toHaveBeenCalledTimes(0);
    });

    it('should handle cleanup for all mock categories', () => {
      // Setup mocks in different categories
      const authMock = MockRegistry.Auth.createMockJwtService();
      const databaseMock = MockRegistry.Database.createMockPrismaService();
      const apiMock = MockRegistry.ExternalAPIs.createMockAnthropicService();

      // Use mocks
      authMock.sign({ test: 'data' });
      databaseMock.user.findMany();
      apiMock.createCompletion({
        messages: [],
        model: 'claude-3',
        max_tokens: 10,
      });

      // Reset and verify cleanup
      resetAllMocks();

      expect(authMock.sign).not.toHaveBeenCalled();
      expect(databaseMock.user.findMany).not.toHaveBeenCalled();
      expect(apiMock.createCompletion).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large-scale mock operations efficiently', () => {
      const startTime = Date.now();
      const mocks = [];

      // Create many mock services
      for (let i = 0; i < 100; i++) {
        mocks.push(MockRegistry.Database.createMockPrismaService());
        mocks.push(MockRegistry.Auth.createMockJwtService());
      }

      const endTime = Date.now();
      const creationTime = endTime - startTime;

      expect(creationTime).toBeLessThan(1000); // Should create 200 mocks in under 1 second
      expect(mocks).toHaveLength(200);
    });

    it('should clean up memory after test completion', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create and use many mocks
      const mocks = [];
      for (let i = 0; i < 50; i++) {
        const mockService = MockRegistry.Database.createMockPrismaService();
        mockService.user.create({ _data: { username: `user-${i}` } });
        mocks.push(mockService);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      resetAllMocks();

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory should not have increased significantly
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });
  });
});
