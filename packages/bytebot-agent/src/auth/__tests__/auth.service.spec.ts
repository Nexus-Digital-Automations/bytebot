/**
 * Authentication Service Unit Tests - Comprehensive testing for JWT authentication
 * Tests all authentication functionality with mocked dependencies
 *
 * Test Coverage:
 * - User login with valid/invalid credentials
 * - User registration with validation
 * - JWT token generation and validation
 * - Token refresh functionality
 * - Password change with verification
 * - User logout and session management
 * - Error handling and security scenarios
 *
 * @author Security Implementation Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

// Mock bcrypt functions
jest.mock('bcryptjs');
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  // Test data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: '$2a$12$hashed.password.here',
    role: UserRole.VIEWER,
    isActive: true,
    emailVerified: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    permissions: [],
  };

  const mockSession = {
    id: 'session-123',
    userId: mockUser.id,
    refreshToken: 'mock-refresh-token',
    isRevoked: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    ipAddress: '127.0.0.1',
    userAgent: 'Test Agent',
    user: mockUser,
  };

  const mockConfig = {
    security: {
      jwtSecret: 'test-secret-key-that-is-32-characters',
      jwtExpiresIn: '15m',
      jwtRefreshExpiresIn: '7d',
      encryptionKey: 'test-encryption-key-32-characters',
    },
  };

  beforeEach(async () => {
    // Create mocks
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    // Setup default mocks
    configService.get.mockReturnValue(mockConfig.security);
    bcryptMock.compare = jest.fn();
    bcryptMock.hash = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      rememberMe: false,
    };

    it('should successfully login with valid credentials', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(true as never);
      jwtService.signAsync
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');
      prismaService.userSession.create.mockResolvedValue(mockSession);
      prismaService.user.update.mockResolvedValue(mockUser);

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        tokenType: 'Bearer',
        expiresIn: 900, // 15 minutes in seconds
      });

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
        include: { permissions: true },
      });
      expect(bcryptMock.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.passwordHash,
      );
      expect(prismaService.userSession.create).toHaveBeenCalled();
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcryptMock.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      prismaService.user.findUnique.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcryptMock.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(false as never);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcryptMock.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.passwordHash,
      );
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      username: 'newuser',
      firstName: 'New',
      lastName: 'User',
      password: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    };

    it('should successfully register new user', async () => {
      // Arrange
      const newUser = {
        ...mockUser,
        id: 'user-456',
        email: registerDto.email,
        username: registerDto.username,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      };

      prismaService.user.findUnique
        .mockResolvedValueOnce(null) // Email check
        .mockResolvedValueOnce(null); // Username check
      bcryptMock.hash.mockResolvedValue('hashed-password' as never);
      prismaService.user.create.mockResolvedValue(newUser);

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result).toEqual({
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        isActive: newUser.isActive,
        emailVerified: newUser.emailVerified,
        lastLoginAt: newUser.lastLoginAt,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      });

      expect(bcryptMock.hash).toHaveBeenCalledWith(registerDto.password, 12);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: registerDto.email,
          username: registerDto.username,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          passwordHash: 'hashed-password',
          role: UserRole.VIEWER,
          isActive: true,
          emailVerified: false,
        },
      });
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      // Arrange
      const invalidDto = {
        ...registerDto,
        confirmPassword: 'DifferentPassword123!',
      };

      // Act & Assert
      await expect(service.register(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValueOnce(mockUser); // Email exists

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when username already exists', async () => {
      // Arrange
      prismaService.user.findUnique
        .mockResolvedValueOnce(null) // Email check passes
        .mockResolvedValueOnce(mockUser); // Username exists

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('refreshTokens', () => {
    const refreshToken = 'valid-refresh-token';
    const refreshPayload = {
      sub: mockUser.id,
      sessionId: 'session-123',
      type: 'refresh' as const,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    };

    it('should successfully refresh tokens', async () => {
      // Arrange
      jwtService.verifyAsync.mockResolvedValue(refreshPayload);
      prismaService.userSession.findUnique.mockResolvedValue(mockSession);
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      prismaService.userSession.update.mockResolvedValue({
        ...mockSession,
        refreshToken: 'new-refresh-token',
      });

      // Act
      const result = await service.refreshTokens(refreshToken);

      // Assert
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        tokenType: 'Bearer',
        expiresIn: 900,
      });

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(refreshToken);
      expect(prismaService.userSession.findUnique).toHaveBeenCalledWith({
        where: { refreshToken },
        include: { user: true },
      });
      expect(prismaService.userSession.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when token type is invalid', async () => {
      // Arrange
      const invalidPayload = { ...refreshPayload, type: 'access' as const };
      jwtService.verifyAsync.mockResolvedValue(invalidPayload);

      // Act & Assert
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when session is revoked', async () => {
      // Arrange
      const revokedSession = { ...mockSession, isRevoked: true };
      jwtService.verifyAsync.mockResolvedValue(refreshPayload);
      prismaService.userSession.findUnique.mockResolvedValue(revokedSession);

      // Act & Assert
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when session is expired', async () => {
      // Arrange
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000),
      };
      jwtService.verifyAsync.mockResolvedValue(refreshPayload);
      prismaService.userSession.findUnique.mockResolvedValue(expiredSession);

      // Act & Assert
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      // Arrange
      const inactiveUserSession = {
        ...mockSession,
        user: { ...mockUser, isActive: false },
      };
      jwtService.verifyAsync.mockResolvedValue(refreshPayload);
      prismaService.userSession.findUnique.mockResolvedValue(
        inactiveUserSession,
      );

      // Act & Assert
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    const refreshToken = 'valid-refresh-token';

    it('should successfully logout user', async () => {
      // Arrange
      prismaService.userSession.findUnique.mockResolvedValue(mockSession);
      prismaService.userSession.update.mockResolvedValue({
        ...mockSession,
        isRevoked: true,
      });

      // Act
      await service.logout(refreshToken);

      // Assert
      expect(prismaService.userSession.findUnique).toHaveBeenCalledWith({
        where: { refreshToken },
      });
      expect(prismaService.userSession.update).toHaveBeenCalledWith({
        where: { id: mockSession.id },
        data: {
          isRevoked: true,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should handle logout gracefully when session not found', async () => {
      // Arrange
      prismaService.userSession.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.logout(refreshToken)).resolves.toBeUndefined();
      expect(prismaService.userSession.update).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const userId = mockUser.id;
    const changePasswordDto = {
      currentPassword: 'CurrentPassword123!',
      newPassword: 'NewPassword123!',
      confirmNewPassword: 'NewPassword123!',
    };

    it('should successfully change password', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(true as never);
      bcryptMock.hash.mockResolvedValue('new-hashed-password' as never);
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        passwordHash: 'new-hashed-password',
      });
      prismaService.userSession.updateMany.mockResolvedValue({ count: 2 });

      // Act
      await service.changePassword(userId, changePasswordDto);

      // Assert
      expect(bcryptMock.compare).toHaveBeenCalledWith(
        changePasswordDto.currentPassword,
        mockUser.passwordHash,
      );
      expect(bcryptMock.hash).toHaveBeenCalledWith(
        changePasswordDto.newPassword,
        12,
      );
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          passwordHash: 'new-hashed-password',
          updatedAt: expect.any(Date),
        },
      });
      expect(prismaService.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId },
        data: {
          isRevoked: true,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should throw BadRequestException when new passwords do not match', async () => {
      // Arrange
      const invalidDto = {
        ...changePasswordDto,
        confirmNewPassword: 'DifferentPassword123!',
      };

      // Act & Assert
      await expect(service.changePassword(userId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.changePassword(userId, changePasswordDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when current password is invalid', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(false as never);

      // Act & Assert
      await expect(
        service.changePassword(userId, changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
      expect(bcryptMock.hash).not.toHaveBeenCalled();
    });
  });
});
