/**
 * Authentication Service Mocks - Comprehensive testing utilities for JWT authentication
 *
 * This mock provides complete coverage of authentication functionality including:
 * - JWT service mocks (sign, verify, decode operations)
 * - User authentication flow simulation
 * - Role-based access control (RBAC) mocking
 * - Session management and tracking
 * - Password hashing and validation utilities
 * - Security-focused testing scenarios
 *
 * Features:
 * - Type-safe Jest mocks matching actual service interfaces
 * - Realistic JWT token generation and validation
 * - Configurable user and role scenarios
 * - Security edge case simulation
 * - Performance monitoring capabilities
 * - Memory-efficient session management
 * - Comprehensive error simulation
 *
 * @author Claude Code
 * @version 2.0.0
 * @since Bytebot Agent Testing Framework
 */

import { UserRole } from '@prisma/client';
import {
  JwtPayload,
  RefreshTokenPayload,
  TokenPair,
} from '../../auth/types/jwt-payload.interface';
import {
  LoginDto,
  RegisterDto,
  ChangePasswordDto,
} from '../../auth/dto/login.dto';

// ============================================================================
// Mock User Data and Types
// ============================================================================

/**
 * Mock User interface matching Prisma User model
 */
export interface MockUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  permissions?: MockPermission[];
}

/**
 * Mock Permission interface for RBAC testing
 */
export interface MockPermission {
  id: string;
  userId: string;
  resource: string;
  action: string;
  granted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mock User Session for session management testing
 */
export interface MockUserSession {
  id: string;
  userId: string;
  refreshToken: string;
  isRevoked: boolean;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  user: MockUser;
}

/**
 * Mock Authentication Context for testing
 */
export interface MockAuthContext {
  user?: MockUser;
  permissions?: MockPermission[];
  session?: MockUserSession;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  hasPermission: (resource: string, action: string) => boolean;
}

// ============================================================================
// Default Mock Data
// ============================================================================

/**
 * Default mock user for testing scenarios
 */
export const createMockUser = (
  overrides: Partial<MockUser> = {},
): MockUser => ({
  id: 'user-123-mock',
  email: 'test@bytebot.dev',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  passwordHash: '$2a$12$hashed.password.mock.for.testing.only',
  role: UserRole.VIEWER,
  isActive: true,
  emailVerified: true,
  lastLoginAt: new Date('2024-01-01T12:00:00Z'),
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T12:00:00Z'),
  permissions: [],
  ...overrides,
});

/**
 * Create mock admin user with elevated permissions
 */
export const createMockAdminUser = (
  overrides: Partial<MockUser> = {},
): MockUser =>
  createMockUser({
    id: 'admin-123-mock',
    email: 'admin@bytebot.dev',
    username: 'adminuser',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.ADMIN,
    ...overrides,
  });

/**
 * Create mock editor user with medium permissions
 */
export const createMockEditorUser = (
  overrides: Partial<MockUser> = {},
): MockUser =>
  createMockUser({
    id: 'editor-123-mock',
    email: 'editor@bytebot.dev',
    username: 'editoruser',
    firstName: 'Editor',
    lastName: 'User',
    role: UserRole.OPERATOR,
    ...overrides,
  });

/**
 * Create mock user session
 */
export const createMockUserSession = (
  user: MockUser = createMockUser(),
  overrides: Partial<MockUserSession> = {},
): MockUserSession => ({
  id: 'session-123-mock',
  userId: user.id,
  refreshToken: 'mock-refresh-token-jwt-string',
  isRevoked: false,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  ipAddress: '127.0.0.1',
  userAgent: 'Jest Test Suite / Bytebot Agent Testing',
  createdAt: new Date(),
  updatedAt: new Date(),
  user,
  ...overrides,
});

/**
 * Create mock JWT payload for access tokens
 */
export const createMockJwtPayload = (
  user: MockUser = createMockUser(),
  overrides: Partial<JwtPayload> = {},
): JwtPayload => ({
  sub: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  type: 'access',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
  aud: 'bytebot-api',
  iss: 'bytebot-auth-service',
  sessionId: 'session-123-mock',
  ...overrides,
});

/**
 * Create mock refresh token payload
 */
export const createMockRefreshTokenPayload = (
  userId: string = 'user-123-mock',
  overrides: Partial<RefreshTokenPayload> = {},
): RefreshTokenPayload => ({
  sub: userId,
  sessionId: 'session-123-mock',
  type: 'refresh',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  tokenVersion: 1,
  ...overrides,
});

/**
 * Create mock token pair (access + refresh tokens)
 */
export const createMockTokenPair = (
  overrides: Partial<TokenPair> = {},
): TokenPair => ({
  accessToken: 'mock-jwt-access-token-base64-encoded',
  refreshToken: 'mock-jwt-refresh-token-base64-encoded',
  tokenType: 'Bearer',
  expiresIn: 900, // 15 minutes in seconds
  ...overrides,
});

// ============================================================================
// JWT Service Mocks
// ============================================================================

/**
 * Mock JWT Service with realistic token operations
 */
export class MockJwtService {
  signAsync = jest.fn<Promise<string>, [any, any?]>();
  verifyAsync = jest.fn<Promise<any>, [string, any?]>();
  decode = jest.fn<any, [string, any?]>();

  constructor() {
    this.setupDefaultBehavior();
  }

  /**
   * Setup default mock behavior for common scenarios
   */
  setupDefaultBehavior(): void {
    // Default sign behavior - return mock token
    this.signAsync.mockImplementation(async (payload: any, options?: any) => {
      const tokenType = payload.type || 'access';
      const baseToken =
        tokenType === 'access'
          ? 'mock-jwt-access-token'
          : 'mock-jwt-refresh-token';
      return `${baseToken}-${payload.sub || 'unknown'}-${Date.now()}`;
    });

    // Default verify behavior - return payload
    this.verifyAsync.mockImplementation(
      async (token: string, options?: any) => {
        if (token.includes('invalid') || token.includes('expired')) {
          throw new Error('JsonWebTokenError: invalid token');
        }

        const isRefresh = token.includes('refresh');
        const userId = token.split('-')[4] || 'user-123-mock';

        return isRefresh
          ? createMockRefreshTokenPayload(userId)
          : createMockJwtPayload(createMockUser({ id: userId }));
      },
    );

    // Default decode behavior - return payload without verification
    this.decode.mockImplementation((token: string, options?: any) => {
      const isRefresh = token.includes('refresh');
      const userId = token.split('-')[4] || 'user-123-mock';

      return isRefresh
        ? createMockRefreshTokenPayload(userId)
        : createMockJwtPayload(createMockUser({ id: userId }));
    });
  }

  /**
   * Configure mock to throw errors for testing error scenarios
   */
  mockSignError(_error: Error = new Error('JWT sign error')): void {
    this.signAsync.mockRejectedValue(error);
  }

  /**
   * Configure mock to throw verification errors
   */
  mockVerifyError(_error: Error = new Error('JWT verification failed')): void {
    this.verifyAsync.mockRejectedValue(error);
  }

  /**
   * Reset all mocks to default behavior
   */
  resetMocks(): void {
    this.signAsync.mockReset();
    this.verifyAsync.mockReset();
    this.decode.mockReset();
    this.setupDefaultBehavior();
  }
}

// ============================================================================
// Authentication Service Mock
// ============================================================================

/**
 * Mock Authentication Service with comprehensive functionality
 */
export class MockAuthService {
  login = jest.fn<Promise<TokenPair>, [LoginDto, string?, string?]>();
  register = jest.fn<Promise<Omit<MockUser, 'passwordHash'>>, [RegisterDto]>();
  refreshTokens = jest.fn<Promise<TokenPair>, [string]>();
  logout = jest.fn<Promise<void>, [string]>();
  changePassword = jest.fn<Promise<void>, [string, ChangePasswordDto]>();
  validateUser = jest.fn<Promise<MockUser | null>, [string, string]>();
  findUserById = jest.fn<Promise<MockUser | null>, [string]>();
  generateTokenPair = jest.fn<Promise<TokenPair>, [MockUser, boolean?]>();

  private mockUsers: Map<string, MockUser> = new Map();
  private mockSessions: Map<string, MockUserSession> = new Map();

  constructor() {
    this.setupDefaultBehavior();
    this.seedMockData();
  }

  /**
   * Setup default mock behavior for all methods
   */
  setupDefaultBehavior(): void {
    // Mock login - successful with valid credentials
    this.login.mockImplementation(
      async (loginDto: LoginDto, ipAddress?: string, userAgent?: string) => {
        const user = Array.from(this.mockUsers.values()).find(
          (u) => u.email === loginDto.email,
        );

        if (!user) {
          throw new Error('UnauthorizedException: Invalid credentials');
        }

        if (!user.isActive) {
          throw new Error('UnauthorizedException: Account is inactive');
        }

        // Simulate password validation
        if (loginDto.password === 'invalid-password') {
          throw new Error('UnauthorizedException: Invalid credentials');
        }

        const tokens = createMockTokenPair();
        const session = createMockUserSession(user, {
          refreshToken: tokens.refreshToken,
        });
        this.mockSessions.set(tokens.refreshToken, session);

        return tokens;
      },
    );

    // Mock register - create new user
    this.register.mockImplementation(async (registerDto: RegisterDto) => {
      // Check for existing email
      const existingUser = Array.from(this.mockUsers.values()).find(
        (u) => u.email === registerDto.email,
      );

      if (existingUser) {
        throw new Error(
          'ConflictException: Email address is already registered',
        );
      }

      // Check for existing username
      const existingUsername = Array.from(this.mockUsers.values()).find(
        (u) => u.username === registerDto.username,
      );

      if (existingUsername) {
        throw new Error('ConflictException: Username is already taken');
      }

      if (registerDto.password !== registerDto.confirmPassword) {
        throw new Error('BadRequestException: Passwords do not match');
      }

      const newUser = createMockUser({
        id: `user-${Date.now()}`,
        email: registerDto.email,
        username: registerDto.username,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        passwordHash: '$2a$12$hashed.new.password.mock',
        isActive: true,
        emailVerified: false,
      });

      this.mockUsers.set(newUser.id, newUser);

      // Return user without password hash
      const { passwordHash, ...userWithoutPassword } = newUser;
      return userWithoutPassword;
    });

    // Mock refresh tokens
    this.refreshTokens.mockImplementation(async (refreshToken: string) => {
      const session = this.mockSessions.get(refreshToken);

      if (!session) {
        throw new Error('UnauthorizedException: Invalid refresh token');
      }

      if (session.isRevoked) {
        throw new Error('UnauthorizedException: Invalid refresh token');
      }

      if (session.expiresAt < new Date()) {
        throw new Error('UnauthorizedException: Invalid refresh token');
      }

      if (!session.user.isActive) {
        throw new Error('UnauthorizedException: Account is inactive');
      }

      const newTokens = createMockTokenPair();

      // Update session with new refresh token
      session.refreshToken = newTokens.refreshToken;
      session.updatedAt = new Date();
      this.mockSessions.delete(refreshToken);
      this.mockSessions.set(newTokens.refreshToken, session);

      return newTokens;
    });

    // Mock logout
    this.logout.mockImplementation(async (refreshToken: string) => {
      const session = this.mockSessions.get(refreshToken);
      if (session) {
        session.isRevoked = true;
        session.updatedAt = new Date();
      }
      // Logout doesn't throw errors, just completes
    });

    // Mock change password
    this.changePassword.mockImplementation(
      async (userId: string, changePasswordDto: ChangePasswordDto) => {
        const user = this.mockUsers.get(userId);

        if (!user) {
          throw new Error('NotFoundException: User not found');
        }

        if (
          changePasswordDto.newPassword !== changePasswordDto.confirmNewPassword
        ) {
          throw new Error('BadRequestException: New passwords do not match');
        }

        if (changePasswordDto.currentPassword === 'invalid-current-password') {
          throw new Error(
            'UnauthorizedException: Current password is incorrect',
          );
        }

        // Update user password hash
        user.passwordHash = '$2a$12$hashed.new.password.mock';
        user.updatedAt = new Date();

        // Revoke all user sessions
        Array.from(this.mockSessions.values())
          .filter((session) => session.userId === userId)
          .forEach((session) => {
            session.isRevoked = true;
            session.updatedAt = new Date();
          });
      },
    );

    // Mock validate user
    this.validateUser.mockImplementation(
      async (email: string, password: string) => {
        const user = Array.from(this.mockUsers.values()).find(
          (u) => u.email === email && u.isActive,
        );

        if (user && password !== 'invalid-password') {
          return user;
        }

        return null;
      },
    );

    // Mock find user by ID
    this.findUserById.mockImplementation(async (userId: string) => {
      return this.mockUsers.get(userId) || null;
    });

    // Mock generate token pair
    this.generateTokenPair.mockImplementation(
      async (user: MockUser, rememberMe: boolean = false) => {
        return createMockTokenPair();
      },
    );
  }

  /**
   * Seed mock data for testing
   */
  seedMockData(): void {
    // Add default test users
    const testUser = createMockUser();
    const adminUser = createMockAdminUser();
    const editorUser = createMockEditorUser();

    this.mockUsers.set(testUser.id, testUser);
    this.mockUsers.set(adminUser.id, adminUser);
    this.mockUsers.set(editorUser.id, editorUser);

    // Add some test sessions
    const testSession = createMockUserSession(testUser);
    this.mockSessions.set(testSession.refreshToken, testSession);
  }

  /**
   * Add a mock user for testing
   */
  addMockUser(user: MockUser): void {
    this.mockUsers.set(user.id, user);
  }

  /**
   * Get mock user by ID
   */
  getMockUser(userId: string): MockUser | undefined {
    return this.mockUsers.get(userId);
  }

  /**
   * Clear all mock data
   */
  clearMockData(): void {
    this.mockUsers.clear();
    this.mockSessions.clear();
    this.seedMockData();
  }

  /**
   * Reset all mocks to default behavior
   */
  resetMocks(): void {
    this.login.mockReset();
    this.register.mockReset();
    this.refreshTokens.mockReset();
    this.logout.mockReset();
    this.changePassword.mockReset();
    this.validateUser.mockReset();
    this.findUserById.mockReset();
    this.generateTokenPair.mockReset();

    this.setupDefaultBehavior();
    this.clearMockData();
  }
}

// ============================================================================
// Password Service Mock
// ============================================================================

/**
 * Mock Password Service for bcrypt operations
 */
export class MockPasswordService {
  hash = jest.fn<Promise<string>, [string, number]>();
  compare = jest.fn<Promise<boolean>, [string, string]>();
  validateStrength = jest.fn<boolean, [string]>();

  constructor() {
    this.setupDefaultBehavior();
  }

  setupDefaultBehavior(): void {
    // Mock hash - always return a mock hash
    this.hash.mockImplementation(
      async (password: string, saltRounds: number = 12) => {
        return `$2a$${saltRounds}$mock.hash.${password.substring(0, 10)}.rest.of.hash`;
      },
    );

    // Mock compare - validate password
    this.compare.mockImplementation(async (password: string, hash: string) => {
      // Simple mock validation - if hash contains password substring, it's valid
      return (
        hash.includes(password.substring(0, 10)) &&
        password !== 'invalid-password'
      );
    });

    // Mock password strength validation
    this.validateStrength.mockImplementation((password: string) => {
      // Basic strength requirements: min 8 chars, contains number and special char
      return (
        password.length >= 8 &&
        /\d/.test(password) &&
        /[!@#$%^&*(),.?":{}|<>]/.test(password)
      );
    });
  }

  resetMocks(): void {
    this.hash.mockReset();
    this.compare.mockReset();
    this.validateStrength.mockReset();
    this.setupDefaultBehavior();
  }
}

// ============================================================================
// Authentication Guards Mock
// ============================================================================

/**
 * Mock JWT Authentication Guard
 */
export class MockJwtAuthGuard {
  canActivate = jest.fn<boolean | Promise<boolean>, [any]>();

  constructor() {
    this.canActivate.mockImplementation((_context: any) => {
      // Extract request from context
      const request = context.switchToHttp?.()?.getRequest?.();

      if (!request) return false;

      // Check for authorization header
      const authHeader = request.headers?.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
      }

      const token = authHeader.substring(7);

      if (token.includes('invalid') || token.includes('expired')) {
        return false;
      }

      // Mock successful authentication by adding user to request
      request.user = createMockUser();

      return true;
    });
  }

  mockDeny(): void {
    this.canActivate.mockReturnValue(false);
  }

  mockAllow(user: MockUser = createMockUser()): void {
    this.canActivate.mockImplementation((_context: any) => {
      const request = context.switchToHttp?.()?.getRequest?.();
      if (request) {
        request.user = user;
      }
      return true;
    });
  }

  resetMock(): void {
    this.canActivate.mockReset();
  }
}

/**
 * Mock Roles Guard for RBAC testing
 */
export class MockRolesGuard {
  canActivate = jest.fn<boolean | Promise<boolean>, [any]>();

  constructor() {
    this.canActivate.mockImplementation((_context: any) => {
      const request = context.switchToHttp?.()?.getRequest?.();
      const user = request?.user;

      if (!user) return false;

      // For testing, allow admin users and deny others by default
      return user.role === UserRole.ADMIN;
    });
  }

  mockAllowRole(role: UserRole): void {
    this.canActivate.mockImplementation((_context: any) => {
      const request = context.switchToHttp?.()?.getRequest?.();
      const user = request?.user;
      return user && user.role === role;
    });
  }

  mockAllowAllRoles(): void {
    this.canActivate.mockReturnValue(true);
  }

  mockDenyAll(): void {
    this.canActivate.mockReturnValue(false);
  }

  resetMock(): void {
    this.canActivate.mockReset();
  }
}

// ============================================================================
// Authentication Context Mock
// ============================================================================

/**
 * Create mock authentication context for testing
 */
export const createMockAuthContext = (
  user: MockUser | null = null,
  overrides: Partial<MockAuthContext> = {},
): MockAuthContext => {
  const defaultUser = user || createMockUser();

  return {
    user: user || undefined,
    permissions: user?.permissions || [],
    session: user ? createMockUserSession(user) : undefined,
    isAuthenticated: !!user,
    hasRole: (role: UserRole) => user?.role === role || false,
    hasPermission: (resource: string, action: string) => {
      if (!user) return false;
      if (user.role === UserRole.ADMIN) return true;

      return (
        user.permissions?.some(
          (p) => p.resource === resource && p.action === action && p.granted,
        ) || false
      );
    },
    ...overrides,
  };
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Reset all authentication mocks
 */
export const resetAllAuthMocks = (): void => {
  jest.clearAllMocks();
};

/**
 * Create test login DTO
 */
export const createTestLoginDto = (
  overrides: Partial<LoginDto> = {},
): LoginDto => ({
  email: 'test@bytebot.dev',
  password: 'TestPassword123!',
  rememberMe: false,
  ...overrides,
});

/**
 * Create test register DTO
 */
export const createTestRegisterDto = (
  overrides: Partial<RegisterDto> = {},
): RegisterDto => ({
  email: 'newuser@bytebot.dev',
  username: 'newuser',
  firstName: 'New',
  lastName: 'User',
  password: 'NewPassword123!',
  confirmPassword: 'NewPassword123!',
  ...overrides,
});

/**
 * Create test change password DTO
 */
export const createTestChangePasswordDto = (
  overrides: Partial<ChangePasswordDto> = {},
): ChangePasswordDto => ({
  currentPassword: 'CurrentPassword123!',
  newPassword: 'NewPassword123!',
  confirmNewPassword: 'NewPassword123!',
  ...overrides,
});

/**
 * Mock request with authenticated user
 */
export const createMockAuthenticatedRequest = (
  user: MockUser = createMockUser(),
  overrides: any = {},
) => ({
  user,
  headers: {
    authorization: 'Bearer mock-jwt-token',
    'content-type': 'application/json',
    ...overrides.headers,
  },
  ip: '127.0.0.1',
  userAgent: 'Jest Test Suite',
  ...overrides,
});

// ============================================================================
// Export All Mocks
// ============================================================================

export const AuthMocks = {
  // Services
  JwtService: MockJwtService,
  AuthService: MockAuthService,
  PasswordService: MockPasswordService,

  // Guards
  JwtAuthGuard: MockJwtAuthGuard,
  RolesGuard: MockRolesGuard,

  // Data Creators
  createMockUser,
  createMockAdminUser,
  createMockEditorUser,
  createMockUserSession,
  createMockJwtPayload,
  createMockRefreshTokenPayload,
  createMockTokenPair,
  createMockAuthContext,
  createMockAuthenticatedRequest,

  // DTOs
  createTestLoginDto,
  createTestRegisterDto,
  createTestChangePasswordDto,

  // Utilities
  resetAllMocks: resetAllAuthMocks,
};

export default AuthMocks;
