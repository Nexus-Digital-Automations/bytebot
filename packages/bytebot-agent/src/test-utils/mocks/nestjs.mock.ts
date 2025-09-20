/* eslint-disable @typescript-eslint/no-unsafe-function-type */

/**
 * NestJS Core Components Mock - Comprehensive testing utilities for NestJS framework
 *
 * This mock provides complete coverage of NestJS core functionality including:
 * - Module decorators and metadata
 * - HTTP method decorators (@Get, @Post, @Put, @Delete, @Patch)
 * - Dependency injection containers and providers
 * - Request/Response object mocking
 * - Guards, Interceptors, and Pipes infrastructure
 * - Exception handling and HTTP status codes
 * - Testing module builders and utilities
 *
 * Features:
 * - Type-safe Jest mocks with full TypeScript support
 * - Realistic request/response simulation
 * - Configurable behavior for different test scenarios
 * - Performance monitoring and timing capabilities
 * - Comprehensive error simulation and edge case handling
 * - Memory-efficient mock cleanup utilities
 *
 * @author Claude Code
 * @version 2.0.0
 * @since Bytebot Agent Testing Framework
 */

import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { TestingModule } from '@nestjs/testing';
// ============================================================================
// NestJS Decorator Mocks
// ============================================================================

/**
 * Mock implementation of NestJS @Module decorator
 * Captures module metadata for testing validation
 */
export const MockModule = (_metadata: {
  imports?: any[];
  controllers?: any[];
  providers?: any[];
  exports?: any[];
}): ClassDecorator => {
  return (target: any) => {
    // Store metadata for testing verification
    target.__nestjs_module_metadata = metadata;
    return target;
  };
};

/**
 * Mock implementation of NestJS @Controller decorator
 * Captures controller path and metadata
 */
export const MockController = (path?: string): ClassDecorator => {
  return (target: any) => {
    target.__nestjs_controller_path = path || '';
    target.__nestjs_controller_metadata = { path };
    return target;
  };
};

/**
 * Mock implementation of NestJS @Injectable decorator
 * Marks classes as injectable for dependency injection
 */
export const MockInjectable = (): ClassDecorator => {
  return (target: any) => {
    target.__nestjs_injectable = true;
    return target;
  };
};

// ============================================================================
// HTTP Method Decorator Mocks
// ============================================================================

/**
 * Mock HTTP method decorator factory
 * Creates mocks for @Get, @Post, @Put, @Delete, @Patch decorators
 */
const createHttpMethodMock = (method: string) => {
  return (path?: string): MethodDecorator => {
    return (
      target: any,
      propertyKey: string | symbol | undefined,
      descriptor: PropertyDescriptor,
    ) => {
      if (propertyKey) {
        // Store route metadata
        target[`__nestjs_${method.toLowerCase()}_${String(propertyKey)}`] = {
          method: method.toUpperCase(),
          path: path || '',
          handler: descriptor.value,
        };
      }
      return descriptor;
    };
  };
};

export const MockGet = createHttpMethodMock('GET');
export const MockPost = createHttpMethodMock('POST');
export const MockPut = createHttpMethodMock('PUT');
export const MockDelete = createHttpMethodMock('DELETE');
export const MockPatch = createHttpMethodMock('PATCH');

// ============================================================================
// Parameter Decorator Mocks
// ============================================================================

/**
 * Mock @Body decorator for request body extraction
 */
export const MockBody = (key?: string): ParameterDecorator => {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    const existingParams = target.__nestjs_params || [];
    existingParams[parameterIndex] = { type: 'body', key };
    target.__nestjs_params = existingParams;
  };
};

/**
 * Mock @Param decorator for route parameter extraction
 */
export const MockParam = (key?: string): ParameterDecorator => {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    const existingParams = target.__nestjs_params || [];
    existingParams[parameterIndex] = { type: 'param', key };
    target.__nestjs_params = existingParams;
  };
};

/**
 * Mock @Query decorator for query parameter extraction
 */
export const MockQuery = (key?: string): ParameterDecorator => {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    const existingParams = target.__nestjs_params || [];
    existingParams[parameterIndex] = { type: 'query', key };
    target.__nestjs_params = existingParams;
  };
};

/**
 * Mock @Headers decorator for header extraction
 */
export const MockHeaders = (key?: string): ParameterDecorator => {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    const existingParams = target.__nestjs_params || [];
    existingParams[parameterIndex] = { type: 'headers', key };
    target.__nestjs_params = existingParams;
  };
};

/**
 * Mock @Req decorator for request object injection
 */
export const MockReq = (): ParameterDecorator => {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    const existingParams = target.__nestjs_params || [];
    existingParams[parameterIndex] = { type: 'request' };
    target.__nestjs_params = existingParams;
  };
};

/**
 * Mock @Res decorator for response object injection
 */
export const MockRes = (): ParameterDecorator => {
  return (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) => {
    const existingParams = target.__nestjs_params || [];
    existingParams[parameterIndex] = { type: 'response' };
    target.__nestjs_params = existingParams;
  };
};

// ============================================================================
// Request/Response Object Mocks
// ============================================================================

/**
 * Comprehensive Request object mock with realistic properties and methods
 */
export interface MockRequest {
  method: string;
  url: string;
  path: string;
  params: Record<string, any>;
  query: Record<string, any>;
  body: any;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  user?: any;
  ip: string;
  userAgent: string;
  get: jest.MockedFunction<(header: string) => string | undefined>;
  header: jest.MockedFunction<(header: string) => string | undefined>;
  param: jest.MockedFunction<(key: string) => string | undefined>;
}

/**
 * Create mock Request object with customizable properties
 */
export const createMockRequest = (
  overrides: Partial<MockRequest> = {},
): MockRequest => {
  const mockRequest: MockRequest = {
    method: 'GET',
    url: '/api/test',
    path: '/api/test',
    params: {},
    query: {},
    body: {},
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Jest Test Suite',
      authorization: 'Bearer mock-jwt-token',
    },
    cookies: {},
    ip: '127.0.0.1',
    userAgent: 'Jest Test Suite',
    user: undefined,
    get: jest.fn((header: string) => mockRequest.headers[header.toLowerCase()]),
    header: jest.fn(
      (header: string) => mockRequest.headers[header.toLowerCase()],
    ),
    param: jest.fn((key: string) => mockRequest.params[key]),
    ...overrides,
  };

  // Update method implementations after merging overrides
  mockRequest.get = jest.fn(
    (header: string) => mockRequest.headers[header.toLowerCase()],
  );
  mockRequest.header = jest.fn(
    (header: string) => mockRequest.headers[header.toLowerCase()],
  );
  mockRequest.param = jest.fn((key: string) => mockRequest.params[key]);

  return mockRequest;
};

/**
 * Comprehensive Response object mock with realistic methods
 */
export interface MockResponse {
  status: jest.MockedFunction<(code: number) => MockResponse>;
  json: jest.MockedFunction<(body: any) => MockResponse>;
  send: jest.MockedFunction<(body: any) => MockResponse>;
  end: jest.MockedFunction<() => MockResponse>;
  header: jest.MockedFunction<(name: string, value: string) => MockResponse>;
  set: jest.MockedFunction<
    (headers: Record<string, string> | string, value?: string) => MockResponse
  >;
  cookie: jest.MockedFunction<
    (name: string, value: string, options?: any) => MockResponse
  >;
  clearCookie: jest.MockedFunction<
    (name: string, options?: any) => MockResponse
  >;
  redirect: jest.MockedFunction<(status: number, url: string) => MockResponse>;
  statusCode: number;
  headersSent: boolean;
}

/**
 * Create mock Response object with chainable methods
 */
export const createMockResponse = (): MockResponse => {
  const mockResponse: MockResponse = {
    statusCode: 200,
    headersSent: false,
    status: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    end: jest.fn(),
    header: jest.fn(),
    set: jest.fn(),
    cookie: jest.fn(),
    clearCookie: jest.fn(),
    redirect: jest.fn(),
  };

  // Make methods chainable by returning mockResponse
  mockResponse.status.mockImplementation((code: number) => {
    mockResponse.statusCode = code;
    return mockResponse;
  });
  mockResponse.json.mockReturnValue(mockResponse);
  mockResponse.send.mockReturnValue(mockResponse);
  mockResponse.end.mockReturnValue(mockResponse);
  mockResponse.header.mockReturnValue(mockResponse);
  mockResponse.set.mockReturnValue(mockResponse);
  mockResponse.cookie.mockReturnValue(mockResponse);
  mockResponse.clearCookie.mockReturnValue(mockResponse);
  mockResponse.redirect.mockReturnValue(mockResponse);

  return mockResponse;
};

// ============================================================================
// ExecutionContext Mock for Guards and Interceptors
// ============================================================================

/**
 * Mock ExecutionContext for testing Guards and Interceptors
 */
export interface MockExecutionContext {
  switchToHttp: jest.MockedFunction<
    () => {
      getRequest: jest.MockedFunction<() => any>;
      getResponse: jest.MockedFunction<() => any>;
      getNext: jest.MockedFunction<() => any>;
    }
  >;
  getHandler: jest.MockedFunction<() => Function>;
  getClass: jest.MockedFunction<() => any>;
  getArgs: jest.MockedFunction<any>;
  getArgByIndex: jest.MockedFunction<(_index: number) => any>;
  switchToRpc: jest.MockedFunction<() => any>;
  switchToWs: jest.MockedFunction<() => any>;
  getType: jest.MockedFunction<any>;
}

/**
 * Create mock ExecutionContext with HTTP context
 */
export const createMockExecutionContext = (
  _request: MockRequest = createMockRequest(),
  _response: MockResponse = createMockResponse(),
): MockExecutionContext => {
  const mockContext: MockExecutionContext = {
    switchToHttp: jest.fn(() => ({
      getRequest: jest.fn(() => request),
      getResponse: jest.fn(() => response),
      getNext: jest.fn(() => jest.fn()),
    })),
    getHandler: jest.fn(() => jest.fn()),
    getClass: jest.fn(() => class MockController {}),
    getArgs: jest.fn(() => [request, response]),
    getArgByIndex: jest.fn((_index: number) => [request, response][index]),
    switchToRpc: jest.fn(() => ({})),
    switchToWs: jest.fn(() => ({})),
    getType: jest.fn(() => 'http'),
  };

  return mockContext;
};

// ============================================================================
// CallHandler Mock for Interceptors
// ============================================================================

/**
 * Mock CallHandler for testing Interceptors
 */
export interface MockCallHandler extends CallHandler {
  handle: jest.MockedFunction<() => Observable<any>>;
}

/**
 * Create mock CallHandler with customizable response
 */
export const createMockCallHandler = <T = any>(
  _response: T = {} as T,
): MockCallHandler => {
  return {
    handle: jest.fn(() => of(response)),
  };
};

// ============================================================================
// Exception Filter Mocks
// ============================================================================

/**
 * Mock HTTP Exception with status code and message
 */
export class MockHttpException extends Error {
  constructor(
    public readonly message: string,
    public readonly status: number,
    public readonly response?: any,
  ) {
    super(message);
    this.name = 'MockHttpException';
  }

  getStatus(): number {
    return this.status;
  }

  getResponse(): any {
    return this.response || this.message;
  }
}

/**
 * Common HTTP exception creators
 */
export const createMockBadRequestException = (message = 'Bad Request') =>
  new MockHttpException(message, 400);

export const createMockUnauthorizedException = (message = 'Unauthorized') =>
  new MockHttpException(message, 401);

export const createMockForbiddenException = (message = 'Forbidden') =>
  new MockHttpException(message, 403);

export const createMockNotFoundException = (message = 'Not Found') =>
  new MockHttpException(message, 404);

export const createMockInternalServerErrorException = (
  message = 'Internal Server Error',
) => new MockHttpException(message, 500);

// ============================================================================
// Testing Module Builder Mocks
// ============================================================================

/**
 * Mock TestingModule with common NestJS testing patterns
 */
export interface MockTestingModule {
  get: jest.MockedFunction<
    <TInput = any, TResult = TInput>(
      metatypeOrToken: any,
      options?: { strict: boolean },
    ) => TResult
  >;
  select: jest.MockedFunction<(module: any) => TestingModule>;
  createNestApplication: jest.MockedFunction<() => any>;
  close: jest.MockedFunction<() => Promise<void>>;
}

/**
 * Create mock TestingModule for unit tests
 */
export const createMockTestingModule = (
  providers: Map<any, any> = new Map(),
): MockTestingModule => {
  const mockModule = {
    get: jest.fn((token: any) => {
      return providers.get(token) || {};
    }),
    select: jest.fn((module: any) => mockModule as unknown as TestingModule),
    createNestApplication: jest.fn(() => ({
      listen: jest.fn(),
      close: jest.fn(),
      init: jest.fn(),
    })),
    close: jest.fn(() => Promise.resolve()),
  } as unknown as MockTestingModule;

  return mockModule;
};

/**
 * Mock Test class for creating testing modules
 */
export class MockTest {
  private static moduleProviders = new Map<any, any>();

  static createTestingModule(moduleMetadata: {
    imports?: any[];
    controllers?: any[];
    providers?: any[];
    exports?: any[];
  }): { compile: jest.MockedFunction<() => Promise<MockTestingModule>> } {
    return {
      compile: jest.fn(async () => {
        // Process providers and create mocks
        if (moduleMetadata.providers) {
          moduleMetadata.providers.forEach((provider) => {
            if (typeof provider === 'function') {
              this.moduleProviders.set(provider, new provider());
            } else if (provider.provide && provider.useValue) {
              this.moduleProviders.set(provider.provide, provider.useValue);
            } else if (provider.provide && provider.useFactory) {
              const factoryResult = provider.useFactory();
              this.moduleProviders.set(provider.provide, factoryResult);
            }
          });
        }

        return createMockTestingModule(this.moduleProviders);
      }),
    };
  }

  static clearProviders(): void {
    this.moduleProviders.clear();
  }
}

// ============================================================================
// Guard, Interceptor, and Pipe Mocks
// ============================================================================

/**
 * Base mock Guard implementation
 */
export class MockGuard {
  canActivate = jest.fn((_context: ExecutionContext) => true);
}

/**
 * Base mock Interceptor implementation
 */
export class MockInterceptor {
  intercept = jest.fn((_context: ExecutionContext, next: CallHandler) =>
    next.handle(),
  );
}

/**
 * Base mock Pipe implementation
 */
export class MockPipe {
  transform = jest.fn((value: any, metadata?: any) => value);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Reset all NestJS mocks to their default state
 */
export const resetNestJSMocks = (): void => {
  jest.clearAllMocks();
  MockTest.clearProviders();
};

/**
 * Create a mock provider configuration
 */
export const createMockProvider = (
  token: any,
  value?: any,
  factory?: () => any,
) => {
  if (factory) {
    return {
      provide: token,
      useFactory: factory,
    };
  }

  return {
    provide: token,
    useValue: value || {},
  };
};

/**
 * Mock dependency injection for testing
 */
export const mockDependencyInjection = (dependencies: Record<string, any>) => {
  const providers = Object.entries(dependencies).map(([token, value]) =>
    createMockProvider(token, value),
  );

  return providers;
};

/**
 * Performance timing utilities for mock operations
 */
export const MockPerformanceTimer = {
  start: jest.fn(() => ({ name: 'mock-timer', startTime: Date.now() })),
  end: jest.fn((timer: { name: string; startTime: number }) => ({
    ...timer,
    endTime: Date.now(),
    duration: Date.now() - timer.startTime,
  })),
};

/**
 * Mock metadata reflection utilities
 */
export const MockReflector = {
  get: jest.fn((key: string, target: any) => target[key]),
  getAll: jest.fn((key: string, targets: any[]) =>
    targets.map((target) => target[key]).filter(Boolean),
  ),
  getAllAndOverride: jest.fn((key: string, targets: any[]) => {
    const values = targets.map((target) => target[key]).filter(Boolean);
    return values[values.length - 1] || null;
  }),
};

// Export all mocks for easy importing
export const NestJSMocks = {
  // Decorators
  Module: MockModule,
  Controller: MockController,
  Injectable: MockInjectable,
  Get: MockGet,
  Post: MockPost,
  Put: MockPut,
  Delete: MockDelete,
  Patch: MockPatch,
  Body: MockBody,
  Param: MockParam,
  Query: MockQuery,
  Headers: MockHeaders,
  Req: MockReq,
  Res: MockRes,

  // Objects
  createMockRequest,
  createMockResponse,
  createMockExecutionContext,
  createMockCallHandler,
  createMockTestingModule,

  // Classes
  Test: MockTest,
  Guard: MockGuard,
  Interceptor: MockInterceptor,
  Pipe: MockPipe,

  // Exceptions
  HttpException: MockHttpException,
  BadRequestException: createMockBadRequestException,
  UnauthorizedException: createMockUnauthorizedException,
  ForbiddenException: createMockForbiddenException,
  NotFoundException: createMockNotFoundException,
  InternalServerErrorException: createMockInternalServerErrorException,

  // Utilities
  resetMocks: resetNestJSMocks,
  createProvider: createMockProvider,
  mockDI: mockDependencyInjection,
  PerformanceTimer: MockPerformanceTimer,
  Reflector: MockReflector,
};

export default NestJSMocks;
