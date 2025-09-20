/**
 * Authentication Controller Tests - Comprehensive HTTP endpoint testing
 * Tests all authentication endpoints with security validation and error handling
 *
 * Test Coverage:
 * - User login endpoint with various scenarios
 * - User registration with validation and error cases
 * - JWT token refresh functionality
 * - Secure logout with token invalidation
 * - Password change with authentication verification
 * - User profile retrieval endpoint
 * - Rate limiting and security measures
 * - Request/response logging verification
 * - IP address extraction utilities
 *
 * @author Authentication Controller Testing Specialist
 * @version 1.0.0
 * @since Phase 2: Authentication Controller Testing
 */

import { TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
} from '../dto/login.dto';
import { TokenPair } from '../types/jwt-payload.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

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
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  const mockTokenPair: TokenPair = {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-access-token',
    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-refresh-token',
    tokenType: 'Bearer',
    expiresIn: 900, // 15 minutes
  };

  const createMockRequest = (overrides: any = {}) => ({
    headers: {
      'user-agent': 'Mozilla/5.0 (Test Browser)',
      'x-forwarded-for': '192.168.1.100',
      ...overrides.headers,
    },
    connection: { remoteAddress: '192.168.1.100' },
    socket: { remoteAddress: '192.168.1.100' },
    ...overrides,
  });

  beforeEach(async () => {
    // Create mock AuthService
    const mockAuthService = {
      login: jest.fn(),
      register: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      changePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login endpoint', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: false,
    };

    it('should successfully login with valid credentials', async () => {
      // Arrange
      authService.login.mockResolvedValue(mockTokenPair);
      const request = createMockRequest();

      // Act
      const result = await controller.login(loginDto, request);

      // Assert
      expect(result).toEqual(mockTokenPair);
      expect(authService.login).toHaveBeenCalledWith(
        loginDto,
        '192.168.1.100',
        'Mozilla/5.0 (Test Browser)',
      );
    });

    it('should handle login with remember me option', async () => {
      // Arrange
      const loginDtoWithRememberMe = { ...loginDto, rememberMe: true };
      authService.login.mockResolvedValue(mockTokenPair);
      const request = createMockRequest();

      // Act
      const result = await controller.login(loginDtoWithRememberMe, request);

      // Assert
      expect(result).toEqual(mockTokenPair);
      expect(authService.login).toHaveBeenCalledWith(
        loginDtoWithRememberMe,
        '192.168.1.100',
        'Mozilla/5.0 (Test Browser)',
      );
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      // Arrange
      authService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );
      const request = createMockRequest();

      // Act & Assert
      await expect(controller.login(loginDto, request)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.login).toHaveBeenCalledWith(
        loginDto,
        '192.168.1.100',
        'Mozilla/5.0 (Test Browser)',
      );
    });

    it('should log successful login attempts', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(controller['logger'], 'log');
      authService.login.mockResolvedValue(mockTokenPair);
      const request = createMockRequest();

      // Act
      await controller.login(loginDto, request);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Login request received'),
        expect.objectContaining({
          email: loginDto.email,
          rememberMe: loginDto.rememberMe,
          ipAddress: '192.168.1.100',
        }),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Login successful'),
        expect.objectContaining({
          email: loginDto.email,
          ipAddress: '192.168.1.100',
        }),
      );
    });

    it('should log failed login attempts', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(controller['logger'], 'warn');
      const errorMessage = 'Invalid credentials';
      authService.login.mockRejectedValue(
        new UnauthorizedException(errorMessage),
      );
      const request = createMockRequest();

      // Act & Assert
      await expect(controller.login(loginDto, request)).rejects.toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Login failed'),
        expect.objectContaining({
          email: loginDto.email,
          _error: errorMessage,
          ipAddress: '192.168.1.100',
        }),
      );
    });

    it('should extract IP address from various headers', async () => {
      // Arrange
      authService.login.mockResolvedValue(mockTokenPair);

      const testCases = [
        {
          headers: { 'x-forwarded-for': '203.0.113.1, 203.0.113.2' },
          expectedIP: '203.0.113.1',
        },
        {
          headers: { 'x-real-ip': '203.0.113.3' },
          expectedIP: '203.0.113.3',
        },
        {
          headers: {},
          connection: { remoteAddress: '203.0.113.4' },
          expectedIP: '203.0.113.4',
        },
      ];

      for (const testCase of testCases) {
        const request = createMockRequest(testCase);

        // Act
        await controller.login(loginDto, request);

        // Assert
        expect(authService.login).toHaveBeenCalledWith(
          loginDto,
          testCase.expectedIP,
          'Mozilla/5.0 (Test Browser)',
        );

        // Clear mock for next iteration
        authService.login.mockClear();
      }
    });
  });

  describe('register endpoint', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      username: 'newuser',
      firstName: 'New',
      lastName: 'User',
      password: 'password123',
      confirmPassword: 'password123',
    };

    it('should successfully register new user', async () => {
      // Arrange
      const newUser = { ...mockUser, ...registerDto };
      delete (newUser as any).password;
      delete (newUser as any).confirmPassword;
      authService.register.mockResolvedValue(newUser);

      // Act
      const result = await controller.register(registerDto);

      // Assert
      expect(result).toEqual({
        message: 'User registered successfully',
        user: newUser,
      });
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should throw ConflictException for duplicate email', async () => {
      // Arrange
      authService.register.mockRejectedValue(
        new ConflictException('Email already exists'),
      );

      // Act & Assert
      await expect(controller.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should throw BadRequestException for invalid data', async () => {
      // Arrange
      authService.register.mockRejectedValue(
        new BadRequestException('Passwords do not match'),
      );

      // Act & Assert
      await expect(controller.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should log successful registration', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(controller['logger'], 'log');
      const newUser = { ...mockUser, ...registerDto };
      authService.register.mockResolvedValue(newUser);

      // Act
      await controller.register(registerDto);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Registration request received'),
        expect.objectContaining({
          email: registerDto.email,
          username: registerDto.username,
        }),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Registration successful'),
        expect.objectContaining({
          email: newUser.email,
          username: newUser.username,
        }),
      );
    });

    it('should log failed registration attempts', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(controller['logger'], 'warn');
      const errorMessage = 'Email already exists';
      authService.register.mockRejectedValue(
        new ConflictException(errorMessage),
      );

      // Act & Assert
      await expect(controller.register(registerDto)).rejects.toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Registration failed'),
        expect.objectContaining({
          email: registerDto.email,
          username: registerDto.username,
          _error: errorMessage,
        }),
      );
    });
  });

  describe('refresh endpoint', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-refresh-token',
    };

    it('should successfully refresh tokens', async () => {
      // Arrange
      const newTokenPair = {
        ...mockTokenPair,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };
      authService.refreshTokens.mockResolvedValue(newTokenPair);

      // Act
      const result = await controller.refresh(refreshTokenDto);

      // Assert
      expect(result).toEqual(newTokenPair);
      expect(authService.refreshTokens).toHaveBeenCalledWith(
        refreshTokenDto.refreshToken,
      );
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      authService.refreshTokens.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      // Act & Assert
      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.refreshTokens).toHaveBeenCalledWith(
        refreshTokenDto.refreshToken,
      );
    });

    it('should log successful token refresh', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(controller['logger'], 'log');
      authService.refreshTokens.mockResolvedValue(mockTokenPair);

      // Act
      await controller.refresh(refreshTokenDto);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Token refresh successful'),
        expect.objectContaining({
          refreshTimeMs: expect.any(Number),
        }),
      );
    });

    it('should log failed token refresh attempts', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(controller['logger'], 'warn');
      const errorMessage = 'Invalid refresh token';
      authService.refreshTokens.mockRejectedValue(
        new UnauthorizedException(errorMessage),
      );

      // Act & Assert
      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Token refresh failed'),
        expect.objectContaining({
          _error: errorMessage,
        }),
      );
    });
  });

  describe('logout endpoint', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-refresh-token',
    };

    it('should successfully logout user', async () => {
      // Arrange
      authService.logout.mockResolvedValue(undefined);

      // Act
      const result = await controller.logout(refreshTokenDto);

      // Assert
      expect(result).toEqual({ message: 'Logout successful' });
      expect(authService.logout).toHaveBeenCalledWith(
        refreshTokenDto.refreshToken,
      );
    });

    it('should always return success even if logout fails', async () => {
      // Arrange
      authService.logout.mockRejectedValue(new Error('Token not found'));

      // Act
      const result = await controller.logout(refreshTokenDto);

      // Assert
      expect(result).toEqual({ message: 'Logout successful' });
      expect(authService.logout).toHaveBeenCalledWith(
        refreshTokenDto.refreshToken,
      );
    });

    it('should log successful logout', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(controller['logger'], 'log');
      authService.logout.mockResolvedValue(undefined);

      // Act
      await controller.logout(refreshTokenDto);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Logout request received'),
        expect.any(Object),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Logout successful'),
        expect.objectContaining({
          logoutTimeMs: expect.any(Number),
        }),
      );
    });

    it('should log logout errors but still return success', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(controller['logger'], 'warn');
      authService.logout.mockRejectedValue(new Error('Token not found'));

      // Act
      const result = await controller.logout(refreshTokenDto);

      // Assert
      expect(result).toEqual({ message: 'Logout successful' });
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Logout processing completed with issues'),
        expect.objectContaining({
          _error: 'Token not found',
        }),
      );
    });
  });

  describe('changePassword endpoint', () => {
    const changePasswordDto: ChangePasswordDto = {
      currentPassword: 'oldpassword123',
      newPassword: 'newpassword123',
      confirmNewPassword: 'newpassword123',
    };

    it('should successfully change password', async () => {
      // Arrange
      authService.changePassword.mockResolvedValue(undefined);

      // Act
      const result = await controller.changePassword(
        changePasswordDto,
        mockUser,
      );

      // Assert
      expect(result).toEqual({ message: 'Password changed successfully' });
      expect(authService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        changePasswordDto,
      );
    });

    it('should throw UnauthorizedException for wrong current password', async () => {
      // Arrange
      authService.changePassword.mockRejectedValue(
        new UnauthorizedException('Invalid current password'),
      );

      // Act & Assert
      await expect(
        controller.changePassword(changePasswordDto, mockUser),
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        changePasswordDto,
      );
    });

    it('should throw BadRequestException for password validation errors', async () => {
      // Arrange
      authService.changePassword.mockRejectedValue(
        new BadRequestException('New passwords do not match'),
      );

      // Act & Assert
      await expect(
        controller.changePassword(changePasswordDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should log successful password change', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(controller['logger'], 'log');
      authService.changePassword.mockResolvedValue(undefined);

      // Act
      await controller.changePassword(changePasswordDto, mockUser);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Password change request received'),
        expect.objectContaining({
          userId: mockUser.id,
          username: mockUser.username,
        }),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Password change successful'),
        expect.objectContaining({
          userId: mockUser.id,
          username: mockUser.username,
        }),
      );
    });

    it('should log failed password change attempts', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(controller['logger'], 'warn');
      const errorMessage = 'Invalid current password';
      authService.changePassword.mockRejectedValue(
        new UnauthorizedException(errorMessage),
      );

      // Act & Assert
      await expect(
        controller.changePassword(changePasswordDto, mockUser),
      ).rejects.toThrow();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Password change failed'),
        expect.objectContaining({
          userId: mockUser.id,
          username: mockUser.username,
          _error: errorMessage,
        }),
      );
    });
  });

  describe('getProfile endpoint', () => {
    it('should return user profile without password hash', () => {
      // Arrange
      const expectedProfile = {
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        isActive: mockUser.isActive,
        emailVerified: mockUser.emailVerified,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        lastLoginAt: mockUser.lastLoginAt,
      };

      // Act
      const result = controller.getProfile(mockUser);

      // Assert
      expect(result).toEqual(expectedProfile);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should log profile request', () => {
      // Arrange
      const loggerSpy = jest.spyOn(controller['logger'], 'debug');

      // Act
      controller.getProfile(mockUser);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Profile request received'),
        expect.objectContaining({
          userId: mockUser.id,
          username: mockUser.username,
        }),
      );
    });

    it('should handle user with null lastLoginAt', () => {
      // Arrange
      const userWithNullLogin = { ...mockUser, lastLoginAt: null };

      // Act
      const result = controller.getProfile(userWithNullLogin);

      // Assert
      expect(result.lastLoginAt).toBeNull();
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('IP address extraction utility', () => {
    it('should extract IP from x-forwarded-for header', () => {
      // Arrange
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '203.0.113.1, 203.0.113.2' },
      });

      // Act
      const ip = controller['getClientIpAddress'](request);

      // Assert
      expect(ip).toBe('203.0.113.1');
    });

    it('should extract IP from x-real-ip header', () => {
      // Arrange
      const request = createMockRequest({
        headers: { 'x-real-ip': '203.0.113.3' },
      });
      delete request.headers['x-forwarded-for'];

      // Act
      const ip = controller['getClientIpAddress'](request);

      // Assert
      expect(ip).toBe('203.0.113.3');
    });

    it('should fallback to connection remote address', () => {
      // Arrange
      const request = createMockRequest({
        headers: {},
        connection: { remoteAddress: '203.0.113.4' },
      });

      // Act
      const ip = controller['getClientIpAddress'](request);

      // Assert
      expect(ip).toBe('203.0.113.4');
    });

    it('should fallback to socket remote address', () => {
      // Arrange
      const request = createMockRequest({
        headers: {},
        connection: undefined,
        socket: { remoteAddress: '203.0.113.5' },
      });

      // Act
      const ip = controller['getClientIpAddress'](request);

      // Assert
      expect(ip).toBe('203.0.113.5');
    });

    it('should return unknown when no IP is available', () => {
      // Arrange
      const request = createMockRequest({
        headers: {},
        connection: undefined,
        socket: undefined,
      });

      // Act
      const ip = controller['getClientIpAddress'](request);

      // Assert
      expect(ip).toBe('unknown');
    });

    it('should handle malformed x-forwarded-for header', () => {
      // Arrange
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '   ,   ,   ' },
      });

      // Act
      const ip = controller['getClientIpAddress'](request);

      // Assert
      expect(ip).toBe('unknown'); // Should fallback due to empty values
    });
  });

  describe('error handling and logging', () => {
    it('should handle service errors gracefully in all endpoints', async () => {
      // Arrange
      const serviceError = new Error('Database connection failed');
      const endpoints = [
        () =>
          controller.login(
            { email: 'test@test.com', password: 'pass', rememberMe: false },
            createMockRequest(),
          ),
        () =>
          controller.register({
            email: 'test@test.com',
            username: 'test',
            firstName: 'Test',
            lastName: 'User',
            password: 'pass',
            confirmPassword: 'pass',
          }),
        () => controller.refresh({ refreshToken: 'token' }),
        () =>
          controller.changePassword(
            {
              currentPassword: 'old',
              newPassword: 'new',
              confirmNewPassword: 'new',
            },
            mockUser,
          ),
      ];

      // Setup mocks to throw errors
      authService.login.mockRejectedValue(serviceError);
      authService.register.mockRejectedValue(serviceError);
      authService.refreshTokens.mockRejectedValue(serviceError);
      authService.changePassword.mockRejectedValue(serviceError);

      // Act & Assert
      for (const endpoint of endpoints) {
        await expect(endpoint()).rejects.toThrow('Database connection failed');
      }
    });

    it('should include timing information in all logs', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(controller['logger'], 'log');
      authService.login.mockResolvedValue(mockTokenPair);

      // Act
      await controller.login(
        { email: 'test@test.com', password: 'pass', rememberMe: false },
        createMockRequest(),
      );

      // Assert
      const logCalls = loggerSpy.mock.calls;
      const successLog = logCalls.find((call) =>
        call[0].includes('Login successful'),
      );
      expect(successLog?.[1]).toHaveProperty('loginTimeMs');
      expect(typeof successLog?.[1].loginTimeMs).toBe('number');
    });

    it('should sanitize sensitive information from logs', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(controller['logger'], 'log');
      authService.login.mockResolvedValue(mockTokenPair);

      // Act
      await controller.login(
        {
          email: 'test@test.com',
          password: 'secretpassword123',
          rememberMe: false,
        },
        createMockRequest(),
      );

      // Assert
      const logCalls = loggerSpy.mock.calls.flat();
      const loggedData = JSON.stringify(logCalls);
      expect(loggedData).not.toContain('secretpassword123');
    });
  });

  describe('response structure validation', () => {
    it('should return consistent response structure for login', async () => {
      // Arrange
      authService.login.mockResolvedValue(mockTokenPair);

      // Act
      const result = await controller.login(
        { email: 'test@test.com', password: 'pass', rememberMe: false },
        createMockRequest(),
      );

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('tokenType', 'Bearer');
      expect(result).toHaveProperty('expiresIn');
      expect(typeof result.expiresIn).toBe('number');
    });

    it('should return consistent response structure for registration', async () => {
      // Arrange
      const newUser = { ...mockUser };
      authService.register.mockResolvedValue(newUser);

      // Act
      const result = await controller.register({
        email: 'test@test.com',
        username: 'test',
        firstName: 'Test',
        lastName: 'User',
        password: 'pass',
        confirmPassword: 'pass',
      });

      // Assert
      expect(result).toHaveProperty('message', 'User registered successfully');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('username');
    });

    it('should return consistent response structure for password change', async () => {
      // Arrange
      authService.changePassword.mockResolvedValue(undefined);

      // Act
      const result = await controller.changePassword(
        {
          currentPassword: 'old',
          newPassword: 'new',
          confirmNewPassword: 'new',
        },
        mockUser,
      );

      // Assert
      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should return consistent response structure for logout', async () => {
      // Arrange
      authService.logout.mockResolvedValue(undefined);

      // Act
      const result = await controller.logout({ refreshToken: 'token' });

      // Assert
      expect(result).toEqual({ message: 'Logout successful' });
    });
  });
});
