/**
 * Mock Integration Tests - Verify mock functionality and integration
 *
 * Tests all mock services to ensure they work correctly and provide
 * realistic behavior for testing scenarios.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { UserRole } from '@prisma/client';
import {
  NestJSMocks,
  createMockRequest,
  createMockResponse,
  createMockExecutionContext,
} from '../nestjs.mock';
import {
  AuthMocks,
  createMockUser,
  createMockTokenPair,
  createTestLoginDto,
} from '../auth.mock';

describe('Mock Integration Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
    NestJSMocks.resetMocks();
    AuthMocks.resetAllMocks();
  });

  describe('NestJS Mocks', () => {
    it('should create realistic request objects', () => {
      const request = createMockRequest({
        method: 'POST',
        url: '/api/auth/login',
        body: { email: 'test@example.com' },
      });

      expect(request.method).toBe('POST');
      expect(request.url).toBe('/api/auth/login');
      expect(request.body.email).toBe('test@example.com');
      expect(request.headers['content-type']).toBe('application/json');
      expect(request.get).toBeInstanceOf(Function);
      expect(request.get('content-type')).toBe('application/json');
    });

    it('should create chainable response objects', () => {
      const response = createMockResponse();

      const result = response.status(200).json({ message: 'success' });

      expect(result).toBe(response);
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({ message: 'success' });
      expect(response.statusCode).toBe(200);
    });

    it('should create execution context for guards', () => {
      const request = createMockRequest({ user: createMockUser() });
      const response = createMockResponse();
      const context = createMockExecutionContext(request, response);

      const httpContext = context.switchToHttp();
      expect(httpContext.getRequest()).toBe(request);
      expect(httpContext.getResponse()).toBe(response);
      expect(context.getType()).toBe('http');
    });

    it('should simulate guard behavior', () => {
      const guard = new NestJSMocks.Guard();
      const context = createMockExecutionContext();

      const result = guard.canActivate(context as any);
      expect(result).toBe(true);
      expect(guard.canActivate).toHaveBeenCalledWith(context);
    });
  });

  describe('Auth Mocks', () => {
    it('should create realistic mock users', () => {
      const user = createMockUser({
        email: 'custom@test.com',
        role: UserRole.ADMIN,
      });

      expect(user.email).toBe('custom@test.com');
      expect(user.role).toBe(UserRole.ADMIN);
      expect(user.id).toBeDefined();
      expect(user.passwordHash).toContain('$2a$12$');
      expect(user.isActive).toBe(true);
    });

    it('should provide JWT service mocks with realistic behavior', () => {
      const jwtService = new AuthMocks.JwtService();
      const user = createMockUser();

      // Test token signing
      const mockPayload = { sub: user.id, email: user.email };
      void jwtService.signAsync(mockPayload);

      expect(jwtService.signAsync).toHaveBeenCalledWith(mockPayload);
    });

    it('should simulate authentication service flows', async () => {
      const authService = new AuthMocks.AuthService();
      const loginDto = createTestLoginDto();

      // Test successful login
      const result = await authService.login(loginDto);

      expect(result).toBeDefined();
      expect(result.accessToken).toContain('mock-jwt-access-token');
      expect(result.tokenType).toBe('Bearer');
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should handle authentication failures', async () => {
      const authService = new AuthMocks.AuthService();
      const invalidLoginDto = createTestLoginDto({
        email: 'nonexistent@test.com',
      });

      await expect(authService.login(invalidLoginDto)).rejects.toThrow(
        'UnauthorizedException: Invalid credentials',
      );
    });

    it('should simulate JWT guard behavior', () => {
      const guard = new AuthMocks.JwtAuthGuard();
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });
      const context = createMockExecutionContext(request);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(request.user).toBeDefined();
      expect(request.user.id).toBeDefined();
    });

    it('should deny access with invalid tokens', () => {
      const guard = new AuthMocks.JwtAuthGuard();
      const request = createMockRequest({
        headers: { authorization: 'Bearer invalid-token' },
      });
      const context = createMockExecutionContext(request);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should simulate role-based access control', () => {
      const guard = new AuthMocks.RolesGuard();

      // Test admin access
      guard.mockAllowRole(UserRole.ADMIN);
      const adminRequest = createMockRequest({
        user: createMockUser({ role: UserRole.ADMIN }),
      });
      const adminContext = createMockExecutionContext(adminRequest);

      expect(guard.canActivate(adminContext)).toBe(true);

      // Test viewer denied
      const viewerRequest = createMockRequest({
        user: createMockUser({ role: UserRole.VIEWER }),
      });
      const viewerContext = createMockExecutionContext(viewerRequest);

      expect(guard.canActivate(viewerContext)).toBe(false);
    });

    it('should create token pairs with proper structure', () => {
      const tokens = createMockTokenPair({
        expiresIn: 1800, // 30 minutes
      });

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.tokenType).toBe('Bearer');
      expect(tokens.expiresIn).toBe(1800);
    });

    it('should simulate password operations', async () => {
      const passwordService = new AuthMocks.PasswordService();

      const plaintext = 'TestPassword123!';
      const hash = await passwordService.hash(plaintext, 12);

      expect(hash).toContain('$2a$12$mock.hash');
      expect(hash).toContain('TestPasswo'); // First part of password

      const isValid = await passwordService.compare(plaintext, hash);
      expect(isValid).toBe(true);

      const isInvalid = await passwordService.compare('wrong-password', hash);
      expect(isInvalid).toBe(false);
    });

    it('should validate password strength', () => {
      const passwordService = new AuthMocks.PasswordService();

      // Strong password
      expect(passwordService.validateStrength('StrongPass123!')).toBe(true);

      // Weak passwords
      expect(passwordService.validateStrength('weak')).toBe(false);
      expect(passwordService.validateStrength('password')).toBe(false);
      expect(passwordService.validateStrength('12345678')).toBe(false);
    });
  });

  describe('Mock Integration', () => {
    it('should work together in authentication flow', async () => {
      // Setup
      const authService = new AuthMocks.AuthService();
      const jwtGuard = new AuthMocks.JwtAuthGuard();
      const loginDto = createTestLoginDto();

      // Login
      const tokens = await authService.login(loginDto);
      expect(tokens.accessToken).toBeDefined();

      // Create authenticated request
      const request = createMockRequest({
        headers: { authorization: `Bearer ${tokens.accessToken}` },
      });
      const context = createMockExecutionContext(request);

      // Validate access
      const hasAccess = jwtGuard.canActivate(context);
      expect(hasAccess).toBe(true);
      expect(request.user).toBeDefined();
    });

    it('should simulate complete request/response cycle', () => {
      const request = createMockRequest({
        method: 'POST',
        url: '/api/tasks',
        body: { title: 'New Task', description: 'Task description' },
        user: createMockUser({ role: UserRole.OPERATOR }),
      });

      const response = createMockResponse();

      // Simulate controller handling
      const mockResult = { id: '123', ...request.body };
      response.status(201).json(mockResult);

      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.json).toHaveBeenCalledWith(mockResult);
      expect(request.user.role).toBe(UserRole.OPERATOR);
    });

    it('should handle error scenarios realistically', async () => {
      const authService = new AuthMocks.AuthService();

      // Test validation error
      const invalidDto = createTestLoginDto({
        password: 'invalid-password',
      });

      await expect(authService.login(invalidDto)).rejects.toThrow();

      // Test registration conflict
      const registerDto = {
        email: 'test@bytebot.dev', // Existing email
        username: 'newuser',
        firstName: 'New',
        lastName: 'User',
        password: 'Password123!',
        confirmPassword: 'Password123!',
      };

      await expect(authService.register(registerDto)).rejects.toThrow(
        'ConflictException',
      );
    });
  });

  describe('Mock Performance and Cleanup', () => {
    it('should reset mock states properly', () => {
      const authService = new AuthMocks.AuthService();
      const jwtService = new AuthMocks.JwtService();

      // Modify mock state
      authService.addMockUser(createMockUser({ id: 'test-user' }));
      jwtService.mockSignError(new Error('Test error'));

      // Reset
      authService.resetMocks();
      jwtService.resetMocks();

      // Verify reset worked
      expect(authService.getMockUser('test-user')).toBeUndefined();
      expect(jwtService.signAsync).not.toThrow();
    });

    it('should provide consistent mock behavior', async () => {
      const authService = new AuthMocks.AuthService();
      const loginDto = createTestLoginDto();

      // Multiple calls should behave consistently
      const result1 = await authService.login(loginDto);
      const result2 = await authService.login(loginDto);

      expect(result1.tokenType).toBe(result2.tokenType);
      expect(result1.expiresIn).toBe(result2.expiresIn);
    });
  });
});
