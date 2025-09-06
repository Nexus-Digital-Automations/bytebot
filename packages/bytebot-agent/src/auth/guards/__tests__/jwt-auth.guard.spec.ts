/**
 * JWT Authentication Guard Unit Tests - Comprehensive testing for JWT guard
 * Tests JWT token validation, user context setting, and security flows
 *
 * Test Coverage:
 * - Valid JWT token authentication
 * - Invalid/expired token rejection
 * - Missing token handling
 * - User context injection
 * - Request security validation
 * - Authorization header parsing
 * - JWT payload validation
 * - Error handling and security logging
 *
 * @author Testing & Quality Assurance Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let reflector: jest.Mocked<Reflector>;
  let configService: jest.Mocked<ConfigService>;
  let prismaService: jest.Mocked<PrismaService>;

  // Test data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.VIEWER,
    isActive: true,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    permissions: [
      { id: 'perm-1', name: 'task:read', description: 'Read tasks' },
      { id: 'perm-2', name: 'task:write', description: 'Write tasks' },
    ],
  };

  const validJwtPayload = {
    sub: mockUser.id,
    username: mockUser.username,
    email: mockUser.email,
    role: mockUser.role,
    type: 'access',
    sessionId: 'session-123',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
    aud: 'bytebot-api',
    iss: 'bytebot-auth-service',
  };

  const mockRequest = {
    headers: {
      authorization: 'Bearer valid-jwt-token',
    },
    user: undefined,
    ip: '127.0.0.1',
    get: jest.fn((header: string) => {
      if (header === 'authorization') return 'Bearer valid-jwt-token';
      if (header === 'user-agent') return 'Test Agent';
      return undefined;
    }),
  };

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;

  beforeEach(async () => {
    const mockJwtService = {
      verifyAsync: jest.fn(),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get(JwtService);
    reflector = module.get(Reflector);
    configService = module.get(ConfigService);
    prismaService = module.get(PrismaService);

    // Setup default mocks
    reflector.getAllAndOverride.mockReturnValue(false); // Not public route
    configService.get.mockReturnValue({
      jwtSecret: 'test-secret-key-that-is-32-characters',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset request user
    mockRequest.user = undefined;
  });

  describe('canActivate', () => {
    it('should allow access with valid JWT token', async () => {
      // Arrange
      jwtService.verifyAsync.mockResolvedValue(validJwtPayload);
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-jwt-token');
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: validJwtPayload.sub },
        include: { permissions: true },
      });
      expect(mockRequest.user).toEqual({
        ...mockUser,
        sessionId: validJwtPayload.sessionId,
      });
    });

    it('should allow access to public routes without token', async () => {
      // Arrange
      reflector.getAllAndOverride.mockReturnValue(true); // Public route
      mockRequest.headers.authorization = undefined;

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
      expect(prismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when no authorization header', async () => {
      // Arrange
      mockRequest.headers.authorization = undefined;

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when authorization header is malformed', async () => {
      // Arrange
      mockRequest.headers.authorization = 'Invalid token format';

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when JWT token is invalid', async () => {
      // Arrange
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-jwt-token');
    });

    it('should throw UnauthorizedException when JWT token is expired', async () => {
      // Arrange
      const expiredPayload = {
        ...validJwtPayload,
        exp: Math.floor(Date.now() / 1000) - 60, // Expired 1 minute ago
      };
      jwtService.verifyAsync.mockResolvedValue(expiredPayload);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token type is not access', async () => {
      // Arrange
      const refreshTokenPayload = {
        ...validJwtPayload,
        type: 'refresh',
      };
      jwtService.verifyAsync.mockResolvedValue(refreshTokenPayload);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user not found in database', async () => {
      // Arrange
      jwtService.verifyAsync.mockResolvedValue(validJwtPayload);
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: validJwtPayload.sub },
        include: { permissions: true },
      });
    });

    it('should throw UnauthorizedException when user account is inactive', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      jwtService.verifyAsync.mockResolvedValue(validJwtPayload);
      prismaService.user.findUnique.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle different authorization header formats', async () => {
      // Test case: lowercase 'bearer'
      mockRequest.headers.authorization = 'bearer valid-jwt-token';
      jwtService.verifyAsync.mockResolvedValue(validJwtPayload);
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-jwt-token');
    });

    it('should handle missing sessionId in JWT payload', async () => {
      // Arrange
      const payloadWithoutSession = {
        ...validJwtPayload,
        sessionId: undefined,
      };
      jwtService.verifyAsync.mockResolvedValue(payloadWithoutSession);
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({
        ...mockUser,
        sessionId: undefined,
      });
    });

    it('should validate JWT audience and issuer claims', async () => {
      // Test invalid audience
      const invalidAudPayload = {
        ...validJwtPayload,
        aud: 'wrong-audience',
      };
      jwtService.verifyAsync.mockResolvedValue(invalidAudPayload);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );

      // Test invalid issuer
      const invalidIssPayload = {
        ...validJwtPayload,
        iss: 'wrong-issuer',
      };
      jwtService.verifyAsync.mockResolvedValue(invalidIssPayload);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should log security events for authentication attempts', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(guard['logger'], 'log');
      const warnSpy = jest.spyOn(guard['logger'], 'warn');

      jwtService.verifyAsync.mockResolvedValue(validJwtPayload);
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      await guard.canActivate(mockExecutionContext);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('JWT authentication successful'),
        expect.objectContaining({
          userId: mockUser.id,
          role: mockUser.role,
        }),
      );

      // Test failed authentication logging
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('JWT authentication failed'),
        expect.any(Object),
      );
    });

    it('should handle concurrent authentication requests', async () => {
      // Arrange
      jwtService.verifyAsync.mockResolvedValue(validJwtPayload);
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const context1 = { ...mockExecutionContext };
      const context2 = { ...mockExecutionContext };

      // Act - simulate concurrent requests
      const [result1, result2] = await Promise.all([
        guard.canActivate(context1),
        guard.canActivate(context2),
      ]);

      // Assert
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledTimes(2);
      expect(prismaService.user.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer authorization header', () => {
      // This tests the private method indirectly through canActivate
      const authHeaders = [
        'Bearer valid-token',
        'bearer valid-token',
        'BEARER valid-token',
      ];

      authHeaders.forEach(async (header) => {
        mockRequest.headers.authorization = header;
        jwtService.verifyAsync.mockResolvedValue(validJwtPayload);
        prismaService.user.findUnique.mockResolvedValue(mockUser);

        const result = await guard.canActivate(mockExecutionContext);
        expect(result).toBe(true);
        expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
      });
    });
  });

  describe('performance tests', () => {
    it('should complete authentication within performance threshold', async () => {
      // Arrange
      jwtService.verifyAsync.mockResolvedValue(validJwtPayload);
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const startTime = Date.now();
      await guard.canActivate(mockExecutionContext);
      const duration = Date.now() - startTime;

      // Assert - should complete within 100ms for unit test
      expect(duration).toBeLessThan(100);
    });

    it('should handle high load authentication requests', async () => {
      // Arrange
      jwtService.verifyAsync.mockResolvedValue(validJwtPayload);
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const requestCount = 100;
      const contexts = Array.from(
        { length: requestCount },
        () => mockExecutionContext,
      );

      // Act
      const startTime = Date.now();
      const results = await Promise.all(
        contexts.map((context) => guard.canActivate(context)),
      );
      const duration = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(requestCount);
      expect(results.every((result) => result === true)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete 100 requests within 5 seconds
    });
  });
});
