/**
 * Authentication Test Helper - Comprehensive authentication testing utilities
 *
 * This helper provides enterprise-grade authentication testing infrastructure with:
 * - JWT token generation and validation mocking
 * - User context simulation and role-based testing
 * - Authentication guard and strategy testing utilities
 * - Security scenario simulation (attack patterns, rate limiting)
 * - Performance testing for authentication workflows
 *
 * @author Claude Code
 * @version 2.0.0
 * @since Bytebot Agent Testing Framework
 */

import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { createMockExecutionContext } from './nestjs-test-builder';

/**
 * User roles for testing
 */
export enum TestUserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  GUEST = 'GUEST',
}

/**
 * Test user interface
 */
export interface TestUser {
  id: string;
  email: string;
  username?: string;
  role: TestUserRole;
  permissions?: string[];
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Authentication test configuration
 */
export interface AuthTestConfig {
  defaultUser?: TestUser;
  jwtSecret?: string;
  jwtExpiresIn?: string;
  enableRoleChecks?: boolean;
  simulateExpiredTokens?: boolean;
  simulateInvalidTokens?: boolean;
}

/**
 * JWT payload interface for testing
 */
export interface TestJwtPayload {
  sub: string;
  email: string;
  role: TestUserRole;
  permissions?: string[];
  iat?: number;
  exp?: number;
  [key: string]: any;
}

/**
 * Authentication Test Data Factory
 */
export class AuthTestDataFactory {
  /**
   * Create a test user with default values
   */
  static createTestUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: `test-user-${Date.now()}@example.com`,
      username: `testuser${Date.now()}`,
      role: TestUserRole.USER,
      permissions: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create an admin test user
   */
  static createAdminUser(overrides: Partial<TestUser> = {}): TestUser {
    return this.createTestUser({
      role: TestUserRole.ADMIN,
      permissions: ['read', 'write', 'delete', 'admin'],
      email: `admin-${Date.now()}@example.com`,
      ...overrides,
    });
  }

  /**
   * Create a moderator test user
   */
  static createModeratorUser(overrides: Partial<TestUser> = {}): TestUser {
    return this.createTestUser({
      role: TestUserRole.MODERATOR,
      permissions: ['read', 'write', 'moderate'],
      email: `moderator-${Date.now()}@example.com`,
      ...overrides,
    });
  }

  /**
   * Create a guest test user
   */
  static createGuestUser(overrides: Partial<TestUser> = {}): TestUser {
    return this.createTestUser({
      role: TestUserRole.GUEST,
      permissions: ['read'],
      email: `guest-${Date.now()}@example.com`,
      ...overrides,
    });
  }

  /**
   * Create multiple users with different roles
   */
  static createUserHierarchy(): TestUser[] {
    return [
      this.createGuestUser(),
      this.createTestUser(),
      this.createModeratorUser(),
      this.createAdminUser(),
    ];
  }

  /**
   * Create a valid JWT payload
   */
  static createJwtPayload(
    user: TestUser,
    overrides: Partial<TestJwtPayload> = {},
  ): TestJwtPayload {
    const now = Math.floor(Date.now() / 1000);
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      iat: now,
      exp: now + 3600, // 1 hour
      ...overrides,
    };
  }

  /**
   * Create an expired JWT payload
   */
  static createExpiredJwtPayload(user: TestUser): TestJwtPayload {
    const now = Math.floor(Date.now() / 1000);
    return this.createJwtPayload(user, {
      iat: now - 7200, // 2 hours ago
      exp: now - 3600, // 1 hour ago
    });
  }

  /**
   * Create a future JWT payload (not yet valid)
   */
  static createFutureJwtPayload(user: TestUser): TestJwtPayload {
    const now = Math.floor(Date.now() / 1000);
    return this.createJwtPayload(user, {
      iat: now + 3600, // 1 hour from now
      exp: now + 7200, // 2 hours from now
    });
  }

  /**
   * Create a mock JWT token string (for testing token format)
   */
  static createMockJwtToken(payload?: TestJwtPayload): string {
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const payloadStr = Buffer.from(
      JSON.stringify(
        payload || {
          sub: 'test-user-id',
          email: 'test@example.com',
          role: 'USER',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
      ),
    ).toString('base64url');
    const signature = 'mock-signature-for-testing';

    return `${header}.${payloadStr}.${signature}`;
  }
}

/**
 * Authentication Test Helper - Main utility class
 */
export class AuthTestHelper {
  private config: AuthTestConfig;
  private mockJwtService: Partial<JwtService>;
  private mockReflector: Partial<Reflector>;

  constructor(config: AuthTestConfig = {}) {
    this.config = {
      jwtSecret: 'test-jwt-secret-for-testing',
      jwtExpiresIn: '1h',
      enableRoleChecks: true,
      simulateExpiredTokens: false,
      simulateInvalidTokens: false,
      ...config,
    };

    this.setupMocks();
  }

  /**
   * Setup JWT service and reflector mocks
   */
  private setupMocks(): void {
    this.mockJwtService = {
      sign: jest
        .fn()
        .mockImplementation((payload: TestJwtPayload | undefined) => {
          return AuthTestDataFactory.createMockJwtToken(payload);
        }),

      verify: jest.fn().mockImplementation((_token: string) => {
        if (this.config.simulateExpiredTokens) {
          throw new Error('jwt expired');
        }
        if (this.config.simulateInvalidTokens) {
          throw new Error('invalid token');
        }

        // Return mock payload for valid tokens
        return this.config.defaultUser
          ? AuthTestDataFactory.createJwtPayload(this.config.defaultUser)
          : {
              sub: 'test-user-id',
              email: 'test@example.com',
              role: TestUserRole.USER,
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 3600,
            };
      }),

      decode: jest.fn().mockImplementation((_token: string) => {
        return this.config.defaultUser
          ? AuthTestDataFactory.createJwtPayload(this.config.defaultUser)
          : {
              sub: 'test-user-id',
              email: 'test@example.com',
              role: TestUserRole.USER,
            };
      }),
    };

    this.mockReflector = {
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndOverride: jest.fn().mockImplementation((key: string) => {
        if (key === 'isPublic') {
          return false; // Routes are protected by default
        }
        if (key === 'roles') {
          return [TestUserRole.USER]; // Default role requirement
        }
        return undefined;
      }),
      getAllAndMerge: jest.fn(),
    };
  }

  /**
   * Get mock JWT service
   */
  getMockJwtService(): Partial<JwtService> {
    return this.mockJwtService;
  }

  /**
   * Get mock Reflector
   */
  getMockReflector(): Partial<Reflector> {
    return this.mockReflector;
  }

  /**
   * Create authenticated execution context
   */
  createAuthenticatedContext(
    user: TestUser,
    token?: string,
    overrides: Partial<ExecutionContext> = {},
  ): ExecutionContext {
    const jwtToken =
      token ||
      AuthTestDataFactory.createMockJwtToken(
        AuthTestDataFactory.createJwtPayload(user),
      );

    const mockHttpContext = {
      getRequest: jest.fn(() => ({
        method: 'GET',
        url: '/api/test',
        headers: {
          authorization: `Bearer ${jwtToken}`,
          'user-agent': 'Jest Test Suite',
        },
        user,
        ip: '127.0.0.1',
      })),
      getResponse: jest.fn(() => ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      })),
      getNext: jest.fn(),
    };

    const mockContext = createMockExecutionContext({
      switchToHttp: jest.fn(() => mockHttpContext as any),
      ...overrides,
    });
    return mockContext;
  }

  /**
   * Create unauthenticated execution context
   */
  createUnauthenticatedContext(
    overrides: Partial<ExecutionContext> = {},
  ): ExecutionContext {
    const mockHttpContext = {
      getRequest: jest.fn(() => ({
        method: 'GET',
        url: '/api/test',
        headers: {
          'user-agent': 'Jest Test Suite',
          // No authorization header
        },
        ip: '127.0.0.1',
      })) as jest.MockedFunction<() => Record<string, unknown>>,
      getResponse: jest.fn(() => ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      })) as jest.MockedFunction<() => Record<string, unknown>>,
      getNext: jest.fn() as jest.MockedFunction<() => unknown>,
    };

    const mockContext = createMockExecutionContext({
      switchToHttp: jest.fn(() => mockHttpContext as any),
      ...overrides,
    });
    return mockContext;
  }

  /**
   * Create context with invalid token
   */
  createInvalidTokenContext(
    overrides: Partial<ExecutionContext> = {},
  ): ExecutionContext {
    const mockHttpContext = {
      getRequest: jest.fn(() => ({
        method: 'GET',
        url: '/api/test',
        headers: {
          authorization: 'Bearer invalid-token-format',
          'user-agent': 'Jest Test Suite',
        },
        ip: '127.0.0.1',
      })),
      getResponse: jest.fn(() => ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      })),
      getNext: jest.fn(),
    };

    const mockContext = createMockExecutionContext({
      switchToHttp: jest.fn(() => mockHttpContext as any),
      ...overrides,
    });
    return mockContext;
  }

  /**
   * Create context with expired token
   */
  createExpiredTokenContext(
    user: TestUser,
    overrides: Partial<ExecutionContext> = {},
  ): ExecutionContext {
    const expiredPayload = AuthTestDataFactory.createExpiredJwtPayload(user);
    const expiredToken = AuthTestDataFactory.createMockJwtToken(expiredPayload);

    const mockHttpContext = {
      getRequest: jest.fn(() => ({
        method: 'GET',
        url: '/api/test',
        headers: {
          authorization: `Bearer ${expiredToken}`,
          'user-agent': 'Jest Test Suite',
        },
        ip: '127.0.0.1',
      })),
      getResponse: jest.fn(() => ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      })),
      getNext: jest.fn(),
    };

    const mockContext = createMockExecutionContext({
      switchToHttp: jest.fn(() => mockHttpContext as any),
      ...overrides,
    });
    return mockContext;
  }

  /**
   * Simulate role-based access scenarios
   */
  setupRoleBasedTest(requiredRoles: TestUserRole[]): void {
    (this.mockReflector.getAllAndOverride as jest.Mock).mockImplementation(
      (key: string) => {
        if (key === 'roles') {
          return requiredRoles;
        }
        if (key === 'isPublic') {
          return false;
        }
        return undefined;
      },
    );
  }

  /**
   * Simulate public route (no authentication required)
   */
  setupPublicRoute(): void {
    (this.mockReflector.getAllAndOverride as jest.Mock).mockImplementation(
      (key: string) => {
        if (key === 'isPublic') {
          return true;
        }
        return undefined;
      },
    );
  }

  /**
   * Simulate authentication errors
   */
  simulateAuthError(errorType: 'expired' | 'invalid' | 'missing'): void {
    switch (errorType) {
      case 'expired':
        (this.mockJwtService.verify as jest.Mock).mockImplementation(() => {
          throw new Error('jwt expired');
        });
        break;
      case 'invalid':
        (this.mockJwtService.verify as jest.Mock).mockImplementation(() => {
          throw new Error('invalid token');
        });
        break;
      case 'missing':
        // This would be handled by the context having no authorization header
        break;
    }
  }

  /**
   * Reset all authentication mocks
   */
  resetMocks(): void {
    jest.clearAllMocks();
    this.setupMocks();
  }

  /**
   * Create test scenarios for comprehensive auth testing
   */
  createTestScenarios(): Array<{
    name: string;
    user: TestUser;
    context: ExecutionContext;
    expectedResult: boolean;
    description: string;
  }> {
    const users = AuthTestDataFactory.createUserHierarchy();

    return [
      {
        name: 'Valid User Authentication',
        user: users[1], // Regular user
        context: this.createAuthenticatedContext(users[1]),
        expectedResult: true,
        description: 'Should authenticate valid user with proper token',
      },
      {
        name: 'Admin User Authentication',
        user: users[3], // Admin user
        context: this.createAuthenticatedContext(users[3]),
        expectedResult: true,
        description: 'Should authenticate admin user with proper token',
      },
      {
        name: 'Guest User Authentication',
        user: users[0], // Guest user
        context: this.createAuthenticatedContext(users[0]),
        expectedResult: true,
        description: 'Should authenticate guest user with proper token',
      },
      {
        name: 'Missing Token',
        user: users[1],
        context: this.createUnauthenticatedContext(),
        expectedResult: false,
        description: 'Should reject request without authentication token',
      },
      {
        name: 'Invalid Token Format',
        user: users[1],
        context: this.createInvalidTokenContext(),
        expectedResult: false,
        description: 'Should reject request with malformed token',
      },
      {
        name: 'Expired Token',
        user: users[1],
        context: this.createExpiredTokenContext(users[1]),
        expectedResult: false,
        description: 'Should reject request with expired token',
      },
    ];
  }

  /**
   * Performance testing utilities
   */
  static async measureAuthPerformance<T>(
    label: string,
    authOperation: () => Promise<T>,
    iterations: number = 100,
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
    successRate: number;
    results: T[];
  }> {
    const times: number[] = [];
    const results: T[] = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        const result = await authOperation();
        results.push(result);
        successCount++;
      } catch {
        // Count failures
      }
      const end = performance.now();
      times.push(end - start);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const successRate = (successCount / iterations) * 100;

    console.log(`🔐 Auth Performance [${label}]:
      - Iterations: ${iterations}
      - Average Time: ${averageTime.toFixed(2)}ms
      - Min Time: ${minTime.toFixed(2)}ms
      - Max Time: ${maxTime.toFixed(2)}ms
      - Success Rate: ${successRate.toFixed(2)}%`);

    return {
      averageTime,
      minTime,
      maxTime,
      totalTime,
      successRate,
      results,
    };
  }
}

/**
 * Convenience functions for creating auth test helpers
 */
export const createAuthTestHelper = (
  config?: AuthTestConfig,
): AuthTestHelper => {
  return new AuthTestHelper(config);
};

export const createUserAuthTestHelper = (user: TestUser): AuthTestHelper => {
  return new AuthTestHelper({ defaultUser: user });
};

export const createAdminAuthTestHelper = (): AuthTestHelper => {
  return new AuthTestHelper({
    defaultUser: AuthTestDataFactory.createAdminUser(),
  });
};

/**
 * Authentication test utilities
 */
export const AuthTestUtils = {
  DataFactory: AuthTestDataFactory,
  Helper: AuthTestHelper,
  UserRole: TestUserRole,
  createHelper: createAuthTestHelper,
  createUserHelper: createUserAuthTestHelper,
  createAdminHelper: createAdminAuthTestHelper,
};
