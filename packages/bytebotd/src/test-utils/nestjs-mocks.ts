 
 
 
 

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

// TypeScript safety note: This file contains testing utilities that intentionally use flexible typing for mock compatibility

import { TestingModule, Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ModuleMetadata } from '@nestjs/common/interfaces';

/**
 * Type definitions for mock utilities
 */
type DecoratorTarget = {
  controllerPath?: string;
  injectable?: boolean;
  moduleMetadata?: ModuleMetadata;
  websocketOptions?: {
    port?: number;
    path?: string;
    cors?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type MockServiceMethods<T = Record<string, unknown>> = jest.Mocked<T>;

type WebSocketOptions = {
  port?: number;
  path?: string;
  cors?: boolean;
  [key: string]: unknown;
};

/**
 * Mock implementation for NestJS decorators
 */
export const mockDecorators = {
  /**
   * Mock @Controller decorator
   */
  Controller:
    (path?: string) =>
    (target: DecoratorTarget): DecoratorTarget => {
      target.controllerPath = path;
      return target;
    },

  /**
   * Mock @Injectable decorator
   */
  Injectable:
    () =>
    (target: DecoratorTarget): DecoratorTarget => {
      target.injectable = true;
      return target;
    },

  /**
   * Mock @Module decorator
   */
  Module:
    (metadata: ModuleMetadata) =>
    (target: DecoratorTarget): DecoratorTarget => {
      target.moduleMetadata = metadata;
      return target;
    },

  /**
   * Mock HTTP method decorators
   */
  Get:
    (path?: string) =>
    (
      _target: DecoratorTarget,
      _propertyKey: string,
      descriptor: PropertyDescriptor,
    ): PropertyDescriptor => {
      if (descriptor.value && typeof descriptor.value === 'object') {
        (descriptor.value as Record<string, unknown>).httpMethod = 'GET';
        (descriptor.value as Record<string, unknown>).path = path;
      }
      return descriptor;
    },

  Post:
    (path?: string) =>
    (
      _target: DecoratorTarget,
      _propertyKey: string,
      descriptor: PropertyDescriptor,
    ): PropertyDescriptor => {
      if (descriptor.value && typeof descriptor.value === 'object') {
        (descriptor.value as Record<string, unknown>).httpMethod = 'POST';
        (descriptor.value as Record<string, unknown>).path = path;
      }
      return descriptor;
    },

  Put:
    (path?: string) =>
    (
      _target: DecoratorTarget,
      _propertyKey: string,
      descriptor: PropertyDescriptor,
    ): PropertyDescriptor => {
      if (descriptor.value && typeof descriptor.value === 'object') {
        (descriptor.value as Record<string, unknown>).httpMethod = 'PUT';
        (descriptor.value as Record<string, unknown>).path = path;
      }
      return descriptor;
    },

  Delete:
    (path?: string) =>
    (
      _target: DecoratorTarget,
      _propertyKey: string,
      descriptor: PropertyDescriptor,
    ): PropertyDescriptor => {
      if (descriptor.value && typeof descriptor.value === 'object') {
        (descriptor.value as Record<string, unknown>).httpMethod = 'DELETE';
        (descriptor.value as Record<string, unknown>).path = path;
      }
      return descriptor;
    },

  /**
   * Mock parameter decorators
   */

  Body:
    () =>
    (
      _target: DecoratorTarget,
      _propertyKey: string | undefined,
      _parameterIndex: number,
    ): void => {
      // Mock parameter decorator behavior
    },

  Param:
    (_key?: string) =>
    (
      _target: DecoratorTarget,
      _propertyKey: string | undefined,
      _parameterIndex: number,
    ): void => {
      // Mock parameter decorator behavior
    },

  Query:
    (_key?: string) =>
    (
      _target: DecoratorTarget,
      _propertyKey: string | undefined,
      _parameterIndex: number,
    ): void => {
      // Mock parameter decorator behavior
    },

  /**
   * Mock WebSocket decorators
   */
  WebSocketGateway:
    (options?: WebSocketOptions) =>
    (target: DecoratorTarget): DecoratorTarget => {
      (target as DecoratorTarget).websocketOptions = options;
      return target;
    },

  SubscribeMessage:
    (message: string) =>
    (
      _target: DecoratorTarget,
      _propertyKey: string,
      descriptor: PropertyDescriptor,
    ): PropertyDescriptor => {
      if (descriptor.value && typeof descriptor.value === 'object') {
        (descriptor.value as Record<string, unknown>).messagePattern = message;
      }
      return descriptor;
    },

  MessageBody:
    () =>
    (
      _target: DecoratorTarget,
      _propertyKey: string | undefined,
      _parameterIndex: number,
    ): void => {
      // Mock message body decorator
    },

  ConnectedSocket:
    () =>
    (
      _target: DecoratorTarget,
      _propertyKey: string | undefined,
      _parameterIndex: number,
    ): void => {
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
  addProvider(provider: NonNullable<ModuleMetadata['providers']>[0]): this {
    this.moduleMetadata.providers = this.moduleMetadata.providers ?? [];
    this.moduleMetadata.providers.push(provider);
    return this;
  }

  /**
   * Add mock provider with value
   */
  addMockProvider(token: string | symbol | Function, mockValue: unknown): this {
    return this.addProvider({
      provide: token,
      useValue: mockValue,
    });
  }

  /**
   * Add mock provider with factory
   */
  addMockProviderFactory(
    token: string | symbol | Function,
    factory: () => unknown,
  ): this {
    return this.addProvider({
      provide: token,
      useFactory: factory,
    });
  }

  /**
   * Add controllers to the testing module
   */
  addController(
    controller: NonNullable<ModuleMetadata['controllers']>[0],
  ): this {
    this.moduleMetadata.controllers = this.moduleMetadata.controllers ?? [];
    this.moduleMetadata.controllers.push(controller);
    return this;
  }

  /**
   * Build the testing module
   */
  async build(): Promise<TestingModule> {
    return Test.createTestingModule(this.moduleMetadata).compile();
  }

  /**
   * Create a testing module (alias for backwards compatibility)
   */
  createTestingModule(metadata: ModuleMetadata) {
    this.moduleMetadata = { ...this.moduleMetadata, ...metadata };
    return {
      overrideModule: (moduleToOverride: string | symbol | Function) => ({
        useValue: (overrideValue: unknown) => ({
          compile: async () => {
            return Test.createTestingModule({
              ...this.moduleMetadata,
              providers: [
                ...(this.moduleMetadata.providers ?? []),
                {
                  provide: moduleToOverride,
                  useValue: overrideValue,
                },
              ],
            }).compile();
          },
        }),
      }),
      compile: async () =>
        Test.createTestingModule(this.moduleMetadata).compile(),
    };
  }
}

/**
 * Common mock implementations for NestJS services
 */
export const createMockService = <
  T extends Record<string, unknown> = Record<string, unknown>,
>(
  methods: (keyof T)[] = [],
): MockServiceMethods<T> => {
  const mockService = {} as MockServiceMethods<T>;

  methods.forEach((method) => {
    mockService[method] = jest.fn() as T[typeof method];
  });

  return mockService;
};

/**
 * Mock repository implementation for TypeORM/Prisma
 */
export const createMockRepository = <
  T extends Record<string, unknown> = Record<string, unknown>,
>(): MockServiceMethods<T> => {
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
  } as MockServiceMethods<T>;
};

/**
 * Mock logger implementation with all required NestJS Logger properties
 */
export const createMockLogger = (): MockServiceMethods<{
  log: jest.MockedFunction<(...args: unknown[]) => void>;
  error: jest.MockedFunction<(...args: unknown[]) => void>;
  warn: jest.MockedFunction<(...args: unknown[]) => void>;
  debug: jest.MockedFunction<(...args: unknown[]) => void>;
  verbose: jest.MockedFunction<(...args: unknown[]) => void>;
  fatal: jest.MockedFunction<(...args: unknown[]) => void>;
  setContext: jest.MockedFunction<(context: string) => void>;
  localInstance: Record<string, unknown>;
}> => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
  setContext: jest.fn(),
  localInstance: {},
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
  _req: {
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
  intercept: jest
    .fn()
    .mockImplementation((_context: unknown, next: { handle(): unknown }) =>
      next.handle(),
    ),
});

/**
 * Mock pipe implementation
 */
export const createMockPipe = () => ({
  transform: jest.fn().mockImplementation((value: unknown) => value),
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
  }) as jest.Mocked<INestApplication>;

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
