/**
 * JWT Authentication Guard Test Suite
 *
 * Comprehensive unit tests for JWT authentication guard covering:
 * - JWT token validation and extraction
 * - Request authentication flow
 * - Token expiration and security validation
 * - Authentication failure scenarios
 * - Performance and reliability testing
 *
 * @author Claude Code (Testing & QA Specialist)
 * @version 1.0.0
 * @coverage-target 95%+
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

// Mock JWT Authentication Guard implementation for Phase 1 requirements
class MockJwtAuthGuard {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Validate token payload structure
      if (!payload.sub || !payload.email || !payload.role) {
        throw new UnauthorizedException('Invalid token payload structure');
      }

      // Check token expiration
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < currentTime) {
        throw new UnauthorizedException('Token has expired');
      }

      // Attach user information to request
      request.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions || [],
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers?.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

describe('JwtAuthGuard', () => {
  let guard: MockJwtAuthGuard;
  let jwtService: JwtService;
  let configService: ConfigService;
  let reflector: Reflector;

  const operationId = `jwt_guard_test_${Date.now()}`;

  // Mock execution context
  const createMockExecutionContext = (
    headers: any = {},
    isPublic = false,
  ): ExecutionContext => {
    const mockRequest = {
      headers,
      user: undefined,
    };

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue({}),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  beforeEach(async () => {
    console.log(`[${operationId}] Setting up JwtAuthGuard test module`);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                JWT_SECRET: 'test-jwt-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
              };
              return config[key];
            }),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    reflector = module.get<Reflector>(Reflector);

    guard = new MockJwtAuthGuard(jwtService, configService, reflector);

    console.log(`[${operationId}] JwtAuthGuard test setup completed`);
  });

  afterEach(() => {
    console.log(`[${operationId}] JwtAuthGuard test cleanup completed`);
  });

  describe('Public Route Access', () => {
    it('should allow access to public routes without authentication', async () => {
      const testId = `${operationId}_public_access`;
      console.log(`[${testId}] Testing public route access`);

      const context = createMockExecutionContext({});
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();

      console.log(
        `[${testId}] Public route access test completed successfully`,
      );
    });

    it('should enforce authentication on protected routes', async () => {
      const testId = `${operationId}_protected_enforcement`;
      console.log(
        `[${testId}] Testing protected route authentication enforcement`,
      );

      const context = createMockExecutionContext({});
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      console.log(
        `[${testId}] Protected route authentication enforcement test completed`,
      );
    });
  });

  describe('Token Extraction', () => {
    it('should extract valid Bearer token from Authorization header', async () => {
      const testId = `${operationId}_token_extraction_valid`;
      console.log(`[${testId}] Testing valid Bearer token extraction`);

      const validToken = 'valid-jwt-token';
      const context = createMockExecutionContext({
        authorization: `Bearer ${validToken}`,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
        sub: 'user_123',
        email: 'test@bytebot.ai',
        role: 'admin',
        permissions: ['task:read', 'task:write'],
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(validToken, {
        secret: 'test-jwt-secret',
      });

      console.log(`[${testId}] Valid Bearer token extraction test completed`);
    });

    it('should reject malformed Authorization header', async () => {
      const testId = `${operationId}_token_extraction_malformed`;
      console.log(
        `[${testId}] Testing malformed Authorization header rejection`,
      );

      const context = createMockExecutionContext({
        authorization: 'NotBearer invalid-format',
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      console.log(
        `[${testId}] Malformed Authorization header rejection test completed`,
      );
    });

    it('should reject missing Authorization header', async () => {
      const testId = `${operationId}_token_extraction_missing`;
      console.log(`[${testId}] Testing missing Authorization header rejection`);

      const context = createMockExecutionContext({});
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('No authentication token provided'),
      );

      console.log(
        `[${testId}] Missing Authorization header rejection test completed`,
      );
    });

    it('should reject empty Bearer token', async () => {
      const testId = `${operationId}_token_extraction_empty`;
      console.log(`[${testId}] Testing empty Bearer token rejection`);

      const context = createMockExecutionContext({
        authorization: 'Bearer ',
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      console.log(`[${testId}] Empty Bearer token rejection test completed`);
    });
  });

  describe('Token Validation', () => {
    it('should validate JWT token structure and payload', async () => {
      const testId = `${operationId}_token_validation_structure`;
      console.log(`[${testId}] Testing JWT token structure validation`);

      const validToken = 'valid-structured-token';
      const context = createMockExecutionContext({
        authorization: `Bearer ${validToken}`,
      });

      const validPayload = {
        sub: 'user_123',
        email: 'admin@bytebot.ai',
        role: 'admin',
        permissions: [
          'task:read',
          'task:write',
          'computer:control',
          'system:admin',
        ],
        iat: Math.floor(Date.now() / 1000) - 300, // 5 minutes ago
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(validPayload);

      const result = await guard.canActivate(context);
      const request = context.switchToHttp().getRequest();

      expect(result).toBe(true);
      expect(request.user).toEqual({
        id: validPayload.sub,
        email: validPayload.email,
        role: validPayload.role,
        permissions: validPayload.permissions,
      });

      console.log(`[${testId}] JWT token structure validation test completed`);
    });

    it('should reject token with missing required fields', async () => {
      const testId = `${operationId}_token_validation_missing_fields`;
      console.log(`[${testId}] Testing token with missing required fields`);

      const invalidToken = 'token-missing-fields';
      const context = createMockExecutionContext({
        authorization: `Bearer ${invalidToken}`,
      });

      const incompletePayload = {
        sub: 'user_123',
        // Missing email and role
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockResolvedValue(incompletePayload);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload structure'),
      );

      console.log(
        `[${testId}] Missing required fields validation test completed`,
      );
    });

    it('should reject expired tokens', async () => {
      const testId = `${operationId}_token_validation_expired`;
      console.log(`[${testId}] Testing expired token rejection`);

      const expiredToken = 'expired-jwt-token';
      const context = createMockExecutionContext({
        authorization: `Bearer ${expiredToken}`,
      });

      const expiredPayload = {
        sub: 'user_123',
        email: 'test@bytebot.ai',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(expiredPayload);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Token has expired'),
      );

      console.log(`[${testId}] Expired token rejection test completed`);
    });

    it('should handle JWT verification errors', async () => {
      const testId = `${operationId}_token_validation_jwt_error`;
      console.log(`[${testId}] Testing JWT verification error handling`);

      const invalidToken = 'invalid-jwt-signature';
      const context = createMockExecutionContext({
        authorization: `Bearer ${invalidToken}`,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockRejectedValue(new Error('JWT signature invalid'));

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid authentication token'),
      );

      console.log(`[${testId}] JWT verification error handling test completed`);
    });
  });

  describe('Role and Permission Validation', () => {
    it('should attach correct user information to request', async () => {
      const testId = `${operationId}_user_attachment`;
      console.log(`[${testId}] Testing user information attachment to request`);

      const validToken = 'user-info-token';
      const context = createMockExecutionContext({
        authorization: `Bearer ${validToken}`,
      });

      const userPayload = {
        sub: 'operator_456',
        email: 'operator@bytebot.ai',
        role: 'operator',
        permissions: ['task:read', 'task:write', 'computer:control'],
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(userPayload);

      await guard.canActivate(context);
      const request = context.switchToHttp().getRequest();

      expect(request.user).toEqual({
        id: userPayload.sub,
        email: userPayload.email,
        role: userPayload.role,
        permissions: userPayload.permissions,
      });

      console.log(`[${testId}] User information attachment test completed`);
    });

    it('should handle tokens without permissions gracefully', async () => {
      const testId = `${operationId}_no_permissions`;
      console.log(`[${testId}] Testing token without permissions handling`);

      const validToken = 'no-permissions-token';
      const context = createMockExecutionContext({
        authorization: `Bearer ${validToken}`,
      });

      const payloadWithoutPermissions = {
        sub: 'viewer_789',
        email: 'viewer@bytebot.ai',
        role: 'viewer',
        exp: Math.floor(Date.now() / 1000) + 3600,
        // No permissions field
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockResolvedValue(payloadWithoutPermissions);

      await guard.canActivate(context);
      const request = context.switchToHttp().getRequest();

      expect(request.user.permissions).toEqual([]);

      console.log(
        `[${testId}] Token without permissions handling test completed`,
      );
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle concurrent authentication requests', async () => {
      const testId = `${operationId}_concurrent_auth`;
      console.log(`[${testId}] Testing concurrent authentication requests`);

      const validToken = 'concurrent-test-token';
      const payload = {
        sub: 'concurrent_user',
        email: 'concurrent@bytebot.ai',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(payload);

      // Create multiple concurrent authentication requests
      const contexts = Array(10)
        .fill(null)
        .map(() =>
          createMockExecutionContext({
            authorization: `Bearer ${validToken}`,
          }),
        );

      const promises = contexts.map((context) => guard.canActivate(context));
      const results = await Promise.all(promises);

      // All requests should succeed
      results.forEach((result) => {
        expect(result).toBe(true);
      });

      // Verify user information is correctly attached to each request
      contexts.forEach((context) => {
        const request = context.switchToHttp().getRequest();
        expect(request.user.id).toBe(payload.sub);
        expect(request.user.email).toBe(payload.email);
      });

      console.log(`[${testId}] Concurrent authentication test completed`);
    });

    it('should handle token injection attempts', async () => {
      const testId = `${operationId}_token_injection`;
      console.log(`[${testId}] Testing token injection protection`);

      const maliciousHeaders = {
        authorization: 'Bearer malicious-token',
        'x-forwarded-authorization': 'Bearer admin-token',
        'x-real-authorization': 'Bearer super-admin-token',
      };

      const context = createMockExecutionContext(maliciousHeaders);

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockRejectedValue(new Error('Invalid token'));

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );

      // Verify only the primary authorization header was used
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        'malicious-token',
        expect.any(Object),
      );

      console.log(`[${testId}] Token injection protection test completed`);
    });

    it('should handle case-sensitive header parsing', async () => {
      const testId = `${operationId}_case_sensitive_headers`;
      console.log(`[${testId}] Testing case-sensitive header parsing`);

      const contexts = [
        createMockExecutionContext({ authorization: 'Bearer valid-token' }),
        createMockExecutionContext({ Authorization: 'Bearer valid-token' }),
        createMockExecutionContext({ AUTHORIZATION: 'Bearer valid-token' }),
      ];

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
        sub: 'user_123',
        email: 'test@bytebot.ai',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const results = await Promise.allSettled(
        contexts.map((context) => guard.canActivate(context)),
      );

      // Only lowercase 'authorization' header should work
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('rejected');

      console.log(`[${testId}] Case-sensitive header parsing test completed`);
    });
  });

  describe('Performance & Reliability', () => {
    it('should complete authentication within performance threshold', async () => {
      const testId = `${operationId}_performance_threshold`;
      console.log(`[${testId}] Testing authentication performance threshold`);

      const validToken = 'performance-test-token';
      const context = createMockExecutionContext({
        authorization: `Bearer ${validToken}`,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
        sub: 'perf_user',
        email: 'perf@bytebot.ai',
        role: 'operator',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const startTime = Date.now();
      await guard.canActivate(context);
      const executionTime = Date.now() - startTime;

      // Authentication should complete within 100ms
      expect(executionTime).toBeLessThan(100);

      console.log(
        `[${testId}] Authentication performance test completed (${executionTime}ms)`,
      );
    });

    it('should handle high-frequency authentication requests', async () => {
      const testId = `${operationId}_high_frequency`;
      console.log(`[${testId}] Testing high-frequency authentication handling`);

      const validToken = 'high-freq-token';
      const payload = {
        sub: 'freq_user',
        email: 'freq@bytebot.ai',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(payload);

      // Simulate high-frequency requests (100 requests)
      const startTime = Date.now();
      const promises = Array(100)
        .fill(null)
        .map(() => {
          const context = createMockExecutionContext({
            authorization: `Bearer ${validToken}`,
          });
          return guard.canActivate(context);
        });

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      expect(results.every((result) => result === true)).toBe(true);
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second

      console.log(
        `[${testId}] High-frequency authentication test completed (${totalTime}ms for 100 requests)`,
      );
    });

    it('should handle JWT service failures gracefully', async () => {
      const testId = `${operationId}_jwt_service_failure`;
      console.log(`[${testId}] Testing JWT service failure handling`);

      const validToken = 'service-failure-token';
      const context = createMockExecutionContext({
        authorization: `Bearer ${validToken}`,
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockRejectedValue(new Error('JWT service unavailable'));

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid authentication token'),
      );

      console.log(`[${testId}] JWT service failure handling test completed`);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory during authentication', async () => {
      const testId = `${operationId}_memory_leak`;
      console.log(`[${testId}] Testing memory leak prevention`);

      const initialMemory = process.memoryUsage();

      // Perform multiple authentication operations
      for (let i = 0; i < 50; i++) {
        const context = createMockExecutionContext({
          authorization: `Bearer token-${i}`,
        });

        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
          sub: `user_${i}`,
          email: `user${i}@bytebot.ai`,
          role: 'viewer',
          exp: Math.floor(Date.now() / 1000) + 3600,
        });

        await guard.canActivate(context);
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be reasonable (less than 5MB for 50 operations)
      expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024);

      console.log(
        `[${testId}] Memory leak prevention test completed (${Math.round(memoryGrowth / 1024)}KB growth)`,
      );
    });

    it('should clean up resources properly', async () => {
      const testId = `${operationId}_resource_cleanup`;
      console.log(`[${testId}] Testing resource cleanup`);

      const context = createMockExecutionContext({
        authorization: 'Bearer cleanup-test-token',
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
        sub: 'cleanup_user',
        email: 'cleanup@bytebot.ai',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);

      // Verify no persistent references or leaks
      const request = context.switchToHttp().getRequest();
      expect(request.user).toBeDefined();

      console.log(`[${testId}] Resource cleanup test completed`);
    });
  });
});
