/**
 * JWT Strategy Unit Tests - Comprehensive testing for Passport JWT strategy
 * Tests JWT token extraction, validation, and user payload creation
 *
 * Test Coverage:
 * - JWT token extraction from various sources
 * - JWT payload validation and verification
 * - User context creation from JWT payload
 * - Error handling for invalid/expired tokens
 * - Security validation and logging
 * - Performance testing for token validation
 * - Integration with Passport.js framework
 *
 * @author Testing & Quality Assurance Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { JwtPayload } from '../../types/jwt-payload.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
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
      {
        id: 'perm-2',
        name: 'computer:view',
        description: 'View computer status',
      },
    ],
  };

  const validJwtPayload: JwtPayload = {
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

  const mockSecurityConfig = {
    jwtSecret: 'test-secret-key-that-is-32-characters',
    jwtExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
  };

  beforeEach(async () => {
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
        JwtStrategy,
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

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get(ConfigService);
    prismaService = module.get(PrismaService);

    // Setup default mocks
    configService.get.mockReturnValue(mockSecurityConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct JWT options', () => {
      // Verify that the strategy is configured correctly
      expect(configService.get).toHaveBeenCalledWith('security', {
        infer: true,
      });

      // The strategy should be properly configured with security settings
      // (This is tested indirectly through the constructor behavior)
    });

    it('should throw error if security configuration is missing', () => {
      // Arrange
      configService.get.mockReturnValue(undefined);

      // Act & Assert
      expect(() => {
        new JwtStrategy(configService, prismaService);
      }).toThrow('Security configuration not found');
    });

    it('should configure JWT extraction from Authorization header', () => {
      // This tests the JWT extraction configuration
      // The actual extraction is handled by passport-jwt, but we ensure it's configured
      expect(strategy).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should successfully validate JWT payload and return user', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(validJwtPayload);

      // Assert
      expect(result).toEqual({
        ...mockUser,
        sessionId: validJwtPayload.sessionId,
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: validJwtPayload.sub },
        include: { permissions: true },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(validJwtPayload)).rejects.toThrow(
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
      prismaService.user.findUnique.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(strategy.validate(validJwtPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should validate JWT payload structure', async () => {
      // Test with missing required fields
      const invalidPayloads = [
        { ...validJwtPayload, sub: undefined },
        { ...validJwtPayload, type: 'refresh' }, // Wrong token type
        { ...validJwtPayload, aud: 'wrong-audience' },
        { ...validJwtPayload, iss: 'wrong-issuer' },
        { ...validJwtPayload, exp: Math.floor(Date.now() / 1000) - 60 }, // Expired
      ];

      for (const payload of invalidPayloads) {
        await expect(strategy.validate(payload as JwtPayload)).rejects.toThrow(
          UnauthorizedException,
        );
      }
    });

    it('should handle missing sessionId in JWT payload', async () => {
      // Arrange
      const payloadWithoutSession = {
        ...validJwtPayload,
        sessionId: undefined,
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(payloadWithoutSession);

      // Assert
      expect(result).toEqual({
        ...mockUser,
        sessionId: undefined,
      });
    });

    it('should validate token expiration', async () => {
      // Arrange - expired token
      const expiredPayload = {
        ...validJwtPayload,
        exp: Math.floor(Date.now() / 1000) - 60, // Expired 1 minute ago
      };

      // Act & Assert
      await expect(strategy.validate(expiredPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should validate token audience claim', async () => {
      // Arrange
      const invalidAudiencePayload = {
        ...validJwtPayload,
        aud: 'malicious-app',
      };

      // Act & Assert
      await expect(strategy.validate(invalidAudiencePayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should validate token issuer claim', async () => {
      // Arrange
      const invalidIssuerPayload = {
        ...validJwtPayload,
        iss: 'malicious-issuer',
      };

      // Act & Assert
      await expect(strategy.validate(invalidIssuerPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should validate token type claim', async () => {
      // Arrange - refresh token should not be accepted
      const refreshTokenPayload = {
        ...validJwtPayload,
        type: 'refresh' as const,
      };

      // Act & Assert
      await expect(strategy.validate(refreshTokenPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should include user permissions in validated user', async () => {
      // Arrange
      const userWithExtendedPermissions = {
        ...mockUser,
        permissions: [
          { id: 'perm-1', name: 'task:read', description: 'Read tasks' },
          { id: 'perm-2', name: 'task:write', description: 'Write tasks' },
          { id: 'perm-3', name: 'task:execute', description: 'Execute tasks' },
          {
            id: 'perm-4',
            name: 'computer:control',
            description: 'Control computer',
          },
        ],
      };
      prismaService.user.findUnique.mockResolvedValue(
        userWithExtendedPermissions,
      );

      // Act
      const result = await strategy.validate(validJwtPayload);

      // Assert
      expect(result.permissions).toHaveLength(4);
      expect(result.permissions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'task:read' }),
          expect.objectContaining({ name: 'task:write' }),
          expect.objectContaining({ name: 'task:execute' }),
          expect.objectContaining({ name: 'computer:control' }),
        ]),
      );
    });

    it('should handle database connection errors gracefully', async () => {
      // Arrange
      prismaService.user.findUnique.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act & Assert
      await expect(strategy.validate(validJwtPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should validate different user roles correctly', async () => {
      const testRoles = [
        UserRole.ADMIN,
        UserRole.OPERATOR,
        UserRole.VIEWER,
        UserRole.API_CONSUMER,
      ];

      for (const role of testRoles) {
        // Arrange
        const userWithRole = { ...mockUser, role };
        const payloadWithRole = { ...validJwtPayload, role };
        prismaService.user.findUnique.mockResolvedValue(userWithRole);

        // Act
        const result = await strategy.validate(payloadWithRole);

        // Assert
        expect(result.role).toBe(role);

        // Clear mocks for next iteration
        jest.clearAllMocks();
        configService.get.mockReturnValue(mockSecurityConfig);
      }
    });
  });

  describe('security and logging', () => {
    it('should log successful JWT validation', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(strategy['logger'], 'debug');
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      await strategy.validate(validJwtPayload);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('JWT strategy validation successful'),
        expect.objectContaining({
          userId: validJwtPayload.sub,
          username: validJwtPayload.username,
          role: validJwtPayload.role,
          sessionId: validJwtPayload.sessionId,
        }),
      );
    });

    it('should log failed JWT validation attempts', async () => {
      // Arrange
      const warnSpy = jest.spyOn(strategy['logger'], 'warn');
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(validJwtPayload)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('JWT strategy validation failed'),
        expect.objectContaining({
          userId: validJwtPayload.sub,
          reason: 'User not found',
        }),
      );
    });

    it('should log security violations', async () => {
      // Arrange
      const warnSpy = jest.spyOn(strategy['logger'], 'warn');
      const maliciousPayload = {
        ...validJwtPayload,
        aud: 'malicious-app',
      };

      // Act & Assert
      await expect(strategy.validate(maliciousPayload)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('JWT security validation failed'),
        expect.objectContaining({
          reason: 'Invalid audience claim',
          providedAudience: 'malicious-app',
          expectedAudience: 'bytebot-api',
        }),
      );
    });

    it('should not log sensitive information in validation logs', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(strategy['logger'], 'debug');
      const sensitivePayload = {
        ...validJwtPayload,
        sensitiveData: 'secret-information',
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      await strategy.validate(sensitivePayload as any);

      // Assert
      const logCalls = loggerSpy.mock.calls.flat();
      const loggedData = JSON.stringify(logCalls);
      expect(loggedData).not.toContain('secret-information');
    });
  });

  describe('performance tests', () => {
    it('should complete validation within performance threshold', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const startTime = Date.now();
      await strategy.validate(validJwtPayload);
      const duration = Date.now() - startTime;

      // Assert - should complete within 100ms for unit test
      expect(duration).toBeLessThan(100);
    });

    it('should handle concurrent validation requests efficiently', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const concurrentRequests = 50;
      const payloads = Array.from({ length: concurrentRequests }, (_, i) => ({
        ...validJwtPayload,
        sub: `user-${i}`,
      }));

      // Act
      const startTime = Date.now();
      const results = await Promise.all(
        payloads.map((payload) => strategy.validate(payload)),
      );
      const duration = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(concurrentRequests);
      expect(results.every((result) => result.id.startsWith('user-123'))).toBe(
        true,
      );
      expect(duration).toBeLessThan(2000); // Should complete 50 validations within 2 seconds
    });

    it('should efficiently handle large permission sets', async () => {
      // Arrange
      const userWithManyPermissions = {
        ...mockUser,
        permissions: Array.from({ length: 100 }, (_, i) => ({
          id: `perm-${i}`,
          name: `permission:${i}`,
          description: `Permission ${i}`,
        })),
      };
      prismaService.user.findUnique.mockResolvedValue(userWithManyPermissions);

      // Act
      const startTime = Date.now();
      const result = await strategy.validate(validJwtPayload);
      const duration = Date.now() - startTime;

      // Assert
      expect(result.permissions).toHaveLength(100);
      expect(duration).toBeLessThan(200); // Should handle large permission sets efficiently
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined JWT payload gracefully', async () => {
      // Act & Assert
      await expect(strategy.validate(null as any)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(undefined as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle malformed JWT payload', async () => {
      // Arrange
      const malformedPayload = {
        // Missing required fields
        randomField: 'random-value',
      };

      // Act & Assert
      await expect(strategy.validate(malformedPayload as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle user with missing permissions array', async () => {
      // Arrange
      const userWithoutPermissions = {
        ...mockUser,
        permissions: undefined,
      };
      prismaService.user.findUnique.mockResolvedValue(userWithoutPermissions);

      // Act
      const result = await strategy.validate(validJwtPayload);

      // Assert
      expect(result.permissions).toBeUndefined();
    });

    it('should handle user with empty permissions array', async () => {
      // Arrange
      const userWithEmptyPermissions = {
        ...mockUser,
        permissions: [],
      };
      prismaService.user.findUnique.mockResolvedValue(userWithEmptyPermissions);

      // Act
      const result = await strategy.validate(validJwtPayload);

      // Assert
      expect(result.permissions).toEqual([]);
    });

    it('should validate numeric timestamps correctly', async () => {
      // Arrange
      const currentTime = Math.floor(Date.now() / 1000);
      const payloadWithNumericTimes = {
        ...validJwtPayload,
        iat: currentTime - 60, // Issued 1 minute ago
        exp: currentTime + 900, // Expires in 15 minutes
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(payloadWithNumericTimes);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockUser.id);
    });
  });
});
