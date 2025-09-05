/**
 * NestJS Testing Utilities and Mock Helpers
 *
 * Provides comprehensive mocking utilities for NestJS applications including:
 * - Decorator mocking for controllers and services
 * - Module testing helpers
 * - Dependency injection mocks
 * - WebSocket gateway mocks
 * - Guard and interceptor mocks
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { TestingModule, Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';

/**
 * Mock implementation for NestJS decorators
 */
export const mockDecorators = {
  /**
   * Mock @Controller decorator
   */
  Controller: (path?: string) => (target: any) => {
    target.controllerPath = path;
    return target;
  },

  /**
   * Mock @Injectable decorator
   */
  Injectable: () => (target: any) => {
    target.injectable = true;
    return target;
  },

  /**
   * Mock @Module decorator
   */
  Module: (metadata: ModuleMetadata) => (target: any) => {
    target.moduleMetadata = metadata;
    return target;
  },

  /**
   * Mock HTTP method decorators
   */
  Get:
    (path?: string) =>
    (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      descriptor.value.httpMethod = 'GET';
      descriptor.value.path = path;
      return descriptor;
    },

  Post:
    (path?: string) =>
    (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      descriptor.value.httpMethod = 'POST';
      descriptor.value.path = path;
      return descriptor;
    },

  Put:
    (path?: string) =>
    (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      descriptor.value.httpMethod = 'PUT';
      descriptor.value.path = path;
      return descriptor;
    },

  Delete:
    (path?: string) =>
    (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      descriptor.value.httpMethod = 'DELETE';
      descriptor.value.path = path;
      return descriptor;
    },

  /**
   * Mock parameter decorators
   */

  Body:
    () =>
    (
      _target: any,
      _propertyKey: string | undefined,
      _parameterIndex: number,
    ) => {
      // Mock parameter decorator behavior
    },

  Param:
    (_key?: string) =>
    (
      _target: any,
      _propertyKey: string | undefined,
      _parameterIndex: number,
    ) => {
      // Mock parameter decorator behavior
    },

  Query:
    (_key?: string) =>
    (
      _target: any,
      _propertyKey: string | undefined,
      _parameterIndex: number,
    ) => {
      // Mock parameter decorator behavior
    },

  /**
   * Mock WebSocket decorators
   */
  WebSocketGateway: (options?: any) => (target: any) => {
    target.websocketOptions = options;
    return target;
  },

  SubscribeMessage:
    (message: string) =>
    (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      descriptor.value.messagePattern = message;
      return descriptor;
    },

  MessageBody:
    () =>
    (
      _target: any,
      _propertyKey: string | undefined,
      _parameterIndex: number,
    ) => {
      // Mock message body decorator
    },

  ConnectedSocket:
    () =>
    (
      _target: any,
      _propertyKey: string | undefined,
      _parameterIndex: number,
    ) => {
      // Mock connected socket decorator
    },
};

/**
 * Create a mock NestJS testing module
 */
export class MockTestingModuleBuilder {
  private moduleMetadata: ModuleMetadata = {
    providers: [],
    controllers: [],
    imports: [],
    exports: [],
  };

  /**
   * Add providers to the testing module
   */
  addProvider(provider: any): this {
    this.moduleMetadata.providers = this.moduleMetadata.providers || [];
    this.moduleMetadata.providers.push(provider);
    return this;
  }

  /**
   * Add mock provider with value
   */
  addMockProvider(token: any, mockValue: any): this {
    return this.addProvider({
      provide: token,
      useValue: mockValue,
    });
  }

  /**
   * Add mock provider with factory
   */
  addMockProviderFactory(token: any, factory: () => any): this {
    return this.addProvider({
      provide: token,
      useFactory: factory,
    });
  }

  /**
   * Add controllers to the testing module
   */
  addController(controller: any): this {
    this.moduleMetadata.controllers = this.moduleMetadata.controllers || [];
    this.moduleMetadata.controllers.push(controller);
    return this;
  }

  /**
   * Build the testing module
   */
  async build(): Promise<TestingModule> {
    return Test.createTestingModule(this.moduleMetadata).compile();
  }
}

/**
 * Common mock implementations for NestJS services
 */
export const createMockService = <T = any>(
  methods: (keyof T)[] = [],
): jest.Mocked<T> => {
  const mockService = {} as jest.Mocked<T>;

  methods.forEach((method) => {
    mockService[method] = jest.fn() as any;
  });

  return mockService;
};

/**
 * Mock repository implementation for TypeORM/Prisma
 */
export const createMockRepository = <T = any>(): jest.Mocked<T> => {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    findAndCount: jest.fn(),
  } as any;
};

/**
 * Mock logger implementation
 */
export const createMockLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  setContext: jest.fn(),
});

/**
 * Mock WebSocket server
 */
export const createMockWebSocketServer = () => ({
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  except: jest.fn().mockReturnThis(),
  compress: jest.fn().mockReturnThis(),
  volatile: jest.fn().mockReturnThis(),
  local: jest.fn().mockReturnThis(),
  close: jest.fn(),
  engine: {
    generateId: jest.fn(() => 'mock-socket-id'),
  },
});

/**
 * Mock WebSocket client
 */
export const createMockWebSocketClient = () => ({
  id: 'mock-client-id',
  emit: jest.fn(),
  on: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  disconnect: jest.fn(),
  handshake: {
    auth: {},
    headers: {},
    query: {},
    address: '127.0.0.1',
  },
  data: {},
});

/**
 * Mock HTTP context for controllers
 */
export const createMockHttpContext = () => ({
  req: {
    method: 'GET',
    url: '/test',
    headers: {},
    body: {},
    query: {},
    params: {},
    user: null,
  },
  res: {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  },
});

/**
 * Mock execution context for guards and interceptors
 */
export const createMockExecutionContext = (
  contextType: 'http' | 'ws' | 'rpc' = 'http',
) => ({
  getType: jest.fn().mockReturnValue(contextType),
  getClass: jest.fn(),
  getHandler: jest.fn(),
  getArgs: jest.fn(),
  getArgByIndex: jest.fn(),
  switchToHttp: jest.fn().mockReturnValue(createMockHttpContext()),
  switchToWs: jest.fn().mockReturnValue({
    getClient: jest.fn(),
    getData: jest.fn(),
  }),
  switchToRpc: jest.fn().mockReturnValue({
    getContext: jest.fn(),
    getData: jest.fn(),
  }),
});

/**
 * Mock guard implementation
 */
export const createMockGuard = (shouldActivate = true) => ({
  canActivate: jest.fn().mockResolvedValue(shouldActivate),
});

/**
 * Mock interceptor implementation
 */
export const createMockInterceptor = () => ({
  intercept: jest.fn().mockImplementation((context, next) => next.handle()),
});

/**
 * Mock pipe implementation
 */
export const createMockPipe = () => ({
  transform: jest.fn().mockImplementation((value) => value),
});

/**
 * Mock filter implementation
 */
export const createMockFilter = () => ({
  catch: jest.fn(),
});

/**
 * Create a full application mock for E2E testing
 */
export const createMockApplication = (): jest.Mocked<INestApplication> =>
  ({
    listen: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    init: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    select: jest.fn(),
    use: jest.fn(),
    useGlobalFilters: jest.fn(),
    useGlobalGuards: jest.fn(),
    useGlobalInterceptors: jest.fn(),
    useGlobalPipes: jest.fn(),
    useLogger: jest.fn(),
    flushLogs: jest.fn(),
    enableShutdownHooks: jest.fn(),
    getHttpAdapter: jest.fn(),
    getUrl: jest.fn().mockResolvedValue('http://localhost:3000'),
    enableCors: jest.fn(),
    enableVersioning: jest.fn(),
    setGlobalPrefix: jest.fn(),
    getHttpServer: jest.fn(),
    resolve: jest.fn(),
    createNestMicroservice: jest.fn(),
    getMicroservices: jest.fn(),
    getInternalConfig: jest.fn(),
    register: jest.fn(),
    registerParserMiddleware: jest.fn(),
  }) as any;

/**
 * Testing utilities for async operations
 */
export const testUtils = {
  /**
   * Wait for all promises to resolve
   */
  waitForPromises: () => new Promise((resolve) => setImmediate(resolve)),

  /**
   * Create a delayed promise
   */
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),

  /**
   * Mock timer utilities
   */
  mockTimers: {
    useFake: () => jest.useFakeTimers(),
    useReal: () => jest.useRealTimers(),
    advanceTime: (ms: number) => jest.advanceTimersByTime(ms),
    runAllTimers: () => jest.runAllTimers(),
    runOnlyPendingTimers: () => jest.runOnlyPendingTimers(),
  },

  /**
   * Memory usage tracking for tests
   */
  getMemoryUsage: () => process.memoryUsage(),

  /**
   * CPU usage tracking for tests
   */
  getCpuUsage: () => process.cpuUsage(),
};

// All exports are already declared above with 'export' keywords - no need for explicit export block
