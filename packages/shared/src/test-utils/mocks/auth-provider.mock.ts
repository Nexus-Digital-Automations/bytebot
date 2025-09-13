/**
 * Authentication Provider Mock Implementation
 *
 * Mock implementation for authentication testing including:
 * - JWT token generation and validation
 * - Session management
 * - Multi-factor authentication (MFA)
 * - OAuth 2.0 / OpenID Connect flows
 * - Role-based access control (RBAC)
 * - Password hashing and verification
 *
 * @author Claude Code
 * @version 2.0.0
 */

import { MockConfig as _MockConfig } from "./mock-config";
import { JwtPayload } from "../../types/security.types";

export type UserRole = "admin" | "moderator" | "user" | "guest";

export type AuthenticationMethod =
  | "password"
  | "oauth"
  | "sso"
  | "api_key"
  | "mfa";

export type TokenType = "access" | "refresh" | "id";

export interface User {
  id: string;
  username: string;
  email: string;
  roles: UserRole[];
  isActive: boolean;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface AuthToken {
  token: string;
  type: TokenType;
  expiresAt: Date;
  issuedAt: Date;
  userId: string;
  sessionId?: string;
  scope?: string[];
}

export interface AuthSession {
  id: string;
  userId: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  lastAccessAt: Date;
}

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
  mfaCode?: string;
  rememberMe?: boolean;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  expiresIn?: number;
  requiresMfa?: boolean;
  mfaChallenge?: string;
  error?: string;
}

export interface AuthProviderMock {
  authenticate: jest.MockedFunction<
    (_credentials: LoginCredentials) => Promise<LoginResult>
  >;
  validateToken: jest.MockedFunction<
    (
      _token: string,
      _tokenType?: TokenType,
    ) => Promise<{ valid: boolean; payload?: JwtPayload; error?: string }>
  >;
  refreshToken: jest.MockedFunction<
    (
      _refreshToken: string,
    ) => Promise<{ accessToken?: string; expiresIn?: number; error?: string }>
  >;
  logout: jest.MockedFunction<
    (_sessionId: string) => Promise<{ success: boolean; error?: string }>
  >;
  logoutAll: jest.MockedFunction<
    (
      _userId: string,
    ) => Promise<{ success: boolean; sessionsTerminated: number }>
  >;
  createUser: jest.MockedFunction<
    (
      _userData: Partial<User> & { password: string },
    ) => Promise<{ user?: User; error?: string }>
  >;
  getUserById: jest.MockedFunction<(_userId: string) => Promise<User | null>>;
  getUserByEmail: jest.MockedFunction<(_email: string) => Promise<User | null>>;
  getUserByUsername: jest.MockedFunction<
    (_username: string) => Promise<User | null>
  >;
  updateUser: jest.MockedFunction<
    (
      _userId: string,
      _updates: Partial<User>,
    ) => Promise<{ user?: User; error?: string }>
  >;
  changePassword: jest.MockedFunction<
    (
      _userId: string,
      _currentPassword: string,
      _newPassword: string,
    ) => Promise<{ success: boolean; error?: string }>
  >;
  resetPassword: jest.MockedFunction<
    (
      _email: string,
    ) => Promise<{ success: boolean; resetToken?: string; error?: string }>
  >;
  verifyEmail: jest.MockedFunction<
    (
      _userId: string,
      _verificationToken: string,
    ) => Promise<{ success: boolean; error?: string }>
  >;
  enableMfa: jest.MockedFunction<
    (_userId: string) => Promise<{
      success: boolean;
      qrCode?: string;
      backupCodes?: string[];
      error?: string;
    }>
  >;
  disableMfa: jest.MockedFunction<
    (
      _userId: string,
      _mfaCode: string,
    ) => Promise<{ success: boolean; error?: string }>
  >;
  verifyMfa: jest.MockedFunction<
    (
      _userId: string,
      _mfaCode: string,
    ) => Promise<{ valid: boolean; error?: string }>
  >;
  hasPermission: jest.MockedFunction<
    (_userId: string, _resource: string, _action: string) => Promise<boolean>
  >;
  hasRole: jest.MockedFunction<
    (_userId: string, _role: UserRole) => Promise<boolean>
  >;
  getSessions: jest.MockedFunction<(_userId: string) => Promise<AuthSession[]>>;
  terminateSession: jest.MockedFunction<
    (_sessionId: string) => Promise<{ success: boolean; error?: string }>
  >;
  generateApiKey: jest.MockedFunction<
    (
      _userId: string,
      _name: string,
      _permissions?: string[],
    ) => Promise<{ apiKey?: string; error?: string }>
  >;
  validateApiKey: jest.MockedFunction<
    (_apiKey: string) => Promise<{
      valid: boolean;
      userId?: string;
      permissions?: string[];
      error?: string;
    }>
  >;
}

// Mock storage for authentication data
class MockAuthStore {
  private users = new Map<
    string,
    User & { passwordHash: string; mfaSecret?: string }
  >();
  private sessions = new Map<string, AuthSession>();
  private apiKeys = new Map<
    string,
    { userId: string; name: string; permissions: string[]; createdAt: Date }
  >();
  private refreshTokens = new Map<
    string,
    { userId: string; expiresAt: Date; sessionId: string }
  >();

  // Initialize with test users
  constructor() {
    this.createTestUsers();
  }

  private createTestUsers(): void {
    const testUsers = [
      {
        id: "test-admin-user",
        username: "admin",
        email: "admin@test.com",
        roles: ["admin"] as UserRole[],
        isActive: true,
        isEmailVerified: true,
        mfaEnabled: false,
        passwordHash: "mock_hash_admin123",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date(),
      },
      {
        id: "test-regular-user",
        username: "testuser",
        email: "user@test.com",
        roles: ["user"] as UserRole[],
        isActive: true,
        isEmailVerified: true,
        mfaEnabled: false,
        passwordHash: "mock_hash_password123",
        createdAt: new Date("2024-01-02"),
        updatedAt: new Date(),
      },
      {
        id: "test-mfa-user",
        username: "mfauser",
        email: "mfa@test.com",
        roles: ["user"] as UserRole[],
        isActive: true,
        isEmailVerified: true,
        mfaEnabled: true,
        passwordHash: "mock_hash_secure123",
        mfaSecret: "mock_mfa_secret",
        createdAt: new Date("2024-01-03"),
        updatedAt: new Date(),
      },
    ];

    testUsers.forEach((user) => {
      this.users.set(user.id, user);
    });
  }

  getUser(
    id: string,
  ): (User & { passwordHash: string; mfaSecret?: string }) | undefined {
    return this.users.get(id);
  }

  getUserByEmail(
    email: string,
  ): (User & { passwordHash: string; mfaSecret?: string }) | undefined {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  getUserByUsername(
    username: string,
  ): (User & { passwordHash: string; mfaSecret?: string }) | undefined {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  addUser(user: User & { passwordHash: string; mfaSecret?: string }): void {
    this.users.set(user.id, user);
  }

  updateUser(id: string, updates: Partial<User>): boolean {
    const user = this.users.get(id);
    if (!user) return false;

    Object.assign(user, updates, { updatedAt: new Date() });
    return true;
  }

  createSession(session: AuthSession): void {
    this.sessions.set(session.id, session);
  }

  getSession(id: string): AuthSession | undefined {
    return this.sessions.get(id);
  }

  getUserSessions(userId: string): AuthSession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.userId === userId,
    );
  }

  terminateSession(id: string): boolean {
    return this.sessions.delete(id);
  }

  terminateUserSessions(userId: string): number {
    const userSessions = this.getUserSessions(userId);
    userSessions.forEach((session) => this.sessions.delete(session.id));
    return userSessions.length;
  }

  addRefreshToken(
    token: string,
    data: { userId: string; expiresAt: Date; sessionId: string },
  ): void {
    this.refreshTokens.set(token, data);
  }

  getRefreshToken(
    token: string,
  ): { userId: string; expiresAt: Date; sessionId: string } | undefined {
    return this.refreshTokens.get(token);
  }

  removeRefreshToken(token: string): boolean {
    return this.refreshTokens.delete(token);
  }

  addApiKey(
    apiKey: string,
    data: { userId: string; name: string; permissions: string[] },
  ): void {
    this.apiKeys.set(apiKey, { ...data, createdAt: new Date() });
  }

  getApiKey(
    apiKey: string,
  ):
    | { userId: string; name: string; permissions: string[]; createdAt: Date }
    | undefined {
    return this.apiKeys.get(apiKey);
  }

  clearAll(): void {
    this.users.clear();
    this.sessions.clear();
    this.apiKeys.clear();
    this.refreshTokens.clear();
    this.createTestUsers();
  }
}

// Singleton store instance
const mockAuthStore = new MockAuthStore();

/**
 * Creates a comprehensive authentication provider mock
 */
export const createAuthProviderMock = (): AuthProviderMock => {
  const generateToken = (
    payload: Record<string, unknown>,
    type: TokenType = "access",
  ): string => {
    // Mock JWT-like token generation
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64");
    const encodedPayload = Buffer.from(
      JSON.stringify({
        ...payload,
        type,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (type === "access" ? 3600 : 86400), // 1 hour for access, 24 hours for refresh
      }),
    ).toString("base64");
    const signature = "mock_signature";

    return `${header}.${encodedPayload}.${signature}`;
  };

  const parseToken = (token: string): JwtPayload | null => {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());

      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  };

  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  };

  const hashPassword = (password: string): string => {
    // Mock password hashing
    return `mock_hash_${password}`;
  };

  const verifyPassword = (password: string, hash: string): boolean => {
    return hashPassword(password) === hash;
  };

  const _generateMfaCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  return {
    authenticate: jest.fn(
      async (credentials: LoginCredentials): Promise<LoginResult> => {
        const { username, email, password, mfaCode, rememberMe } = credentials;

        // Find user by username or email
        let user = username
          ? mockAuthStore.getUserByUsername(username)
          : undefined;
        if (!user && email) {
          user = mockAuthStore.getUserByEmail(email);
        }

        if (!user) {
          return { success: false, error: "User not found" };
        }

        if (!user.isActive) {
          return { success: false, error: "Account is disabled" };
        }

        // Verify password
        if (!verifyPassword(password, user.passwordHash)) {
          return { success: false, error: "Invalid credentials" };
        }

        // Check MFA if enabled
        if (user.mfaEnabled) {
          if (!mfaCode) {
            return {
              success: false,
              requiresMfa: true,
              mfaChallenge: "totp", // Time-based One-Time Password
              error: "MFA code required",
            };
          }

          // Mock MFA verification (in real implementation, this would verify TOTP)
          const validMfaCodes = ["123456", "000000"]; // Mock valid codes for testing
          if (!validMfaCodes.includes(mfaCode)) {
            return { success: false, error: "Invalid MFA code" };
          }
        }

        // Create session
        const sessionId = generateSessionId();
        const expiresAt = new Date(
          Date.now() +
            (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000),
        );

        const session: AuthSession = {
          id: sessionId,
          userId: user.id,
          createdAt: new Date(),
          expiresAt,
          isActive: true,
          lastAccessAt: new Date(),
        };

        mockAuthStore.createSession(session);

        // Generate tokens
        const accessToken = generateToken(
          { userId: user.id, sessionId, roles: user.roles },
          "access",
        );
        const refreshToken = generateToken(
          { userId: user.id, sessionId },
          "refresh",
        );

        // Store refresh token
        mockAuthStore.addRefreshToken(refreshToken, {
          userId: user.id,
          expiresAt,
          sessionId,
        });

        // Update last login
        mockAuthStore.updateUser(user.id, { lastLoginAt: new Date() });

        const {
          passwordHash: _passwordHash,
          mfaSecret: _mfaSecret,
          ...userWithoutSecrets
        } = user;

        return {
          success: true,
          user: userWithoutSecrets,
          accessToken,
          refreshToken,
          sessionId,
          expiresIn: 3600, // 1 hour in seconds
        };
      },
    ),

    validateToken: jest.fn(
      async (
        token: string,
        tokenType?: TokenType,
      ): Promise<{ valid: boolean; payload?: JwtPayload; error?: string }> => {
        const payload = parseToken(token);

        if (!payload) {
          return { valid: false, error: "Invalid or expired token" };
        }

        if (tokenType && payload.type !== tokenType) {
          return {
            valid: false,
            error: `Expected ${tokenType} token, got ${payload.type}`,
          };
        }

        // Verify session is still active (for access tokens)
        if (payload.type === "access" && payload.sessionId) {
          const session = mockAuthStore.getSession(payload.sessionId);
          if (!session || !session.isActive || session.expiresAt < new Date()) {
            return { valid: false, error: "Session expired" };
          }

          // Update last access time
          session.lastAccessAt = new Date();
        }

        return { valid: true, payload };
      },
    ),

    refreshToken: jest.fn(
      async (
        refreshToken: string,
      ): Promise<{
        accessToken?: string;
        expiresIn?: number;
        error?: string;
      }> => {
        const tokenData = mockAuthStore.getRefreshToken(refreshToken);

        if (!tokenData) {
          return { error: "Invalid refresh token" };
        }

        if (tokenData.expiresAt < new Date()) {
          mockAuthStore.removeRefreshToken(refreshToken);
          return { error: "Refresh token expired" };
        }

        const user = mockAuthStore.getUser(tokenData.userId);
        if (!user || !user.isActive) {
          return { error: "User not found or inactive" };
        }

        // Generate new access token
        const accessToken = generateToken(
          {
            userId: user.id,
            sessionId: tokenData.sessionId,
            roles: user.roles,
          },
          "access",
        );

        return {
          accessToken,
          expiresIn: 3600,
        };
      },
    ),

    logout: jest.fn(
      async (
        sessionId: string,
      ): Promise<{ success: boolean; error?: string }> => {
        const session = mockAuthStore.getSession(sessionId);
        if (!session) {
          return { success: false, error: "Session not found" };
        }

        // Remove session
        mockAuthStore.terminateSession(sessionId);

        // Remove associated refresh tokens
        Array.from(mockAuthStore["refreshTokens"].entries())
          .filter(([, data]) => data.sessionId === sessionId)
          .forEach(([token]) => mockAuthStore.removeRefreshToken(token));

        return { success: true };
      },
    ),

    logoutAll: jest.fn(
      async (
        userId: string,
      ): Promise<{ success: boolean; sessionsTerminated: number }> => {
        const sessionsTerminated = mockAuthStore.terminateUserSessions(userId);

        // Remove all refresh tokens for this user
        Array.from(mockAuthStore["refreshTokens"].entries())
          .filter(([, data]) => data.userId === userId)
          .forEach(([token]) => mockAuthStore.removeRefreshToken(token));

        return { success: true, sessionsTerminated };
      },
    ),

    createUser: jest.fn(
      async (
        userData: Partial<User> & { password: string },
      ): Promise<{ user?: User; error?: string }> => {
        const { password, ...userFields } = userData;

        // Check for existing users
        if (
          userFields.email &&
          mockAuthStore.getUserByEmail(userFields.email)
        ) {
          return { error: "Email already exists" };
        }
        if (
          userFields.username &&
          mockAuthStore.getUserByUsername(userFields.username)
        ) {
          return { error: "Username already exists" };
        }

        const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const newUser: User & { passwordHash: string } = {
          id: userId,
          username: userFields.username || `user_${userId}`,
          email: userFields.email || `${userId}@test.com`,
          roles: userFields.roles || ["user"],
          isActive:
            userFields.isActive !== undefined ? userFields.isActive : true,
          isEmailVerified: userFields.isEmailVerified || false,
          mfaEnabled: userFields.mfaEnabled || false,
          createdAt: new Date(),
          updatedAt: new Date(),
          passwordHash: hashPassword(password),
          metadata: userFields.metadata,
        };

        mockAuthStore.addUser(newUser);

        const { passwordHash: _passwordHash, ...userWithoutSecrets } = newUser;
        return { user: userWithoutSecrets };
      },
    ),

    getUserById: jest.fn(async (userId: string): Promise<User | null> => {
      const user = mockAuthStore.getUser(userId);
      if (!user) return null;

      const {
        passwordHash: _passwordHash,
        mfaSecret: _mfaSecret,
        ...userWithoutSecrets
      } = user;
      return userWithoutSecrets;
    }),

    getUserByEmail: jest.fn(async (email: string): Promise<User | null> => {
      const user = mockAuthStore.getUserByEmail(email);
      if (!user) return null;

      const {
        passwordHash: _passwordHash,
        mfaSecret: _mfaSecret,
        ...userWithoutSecrets
      } = user;
      return userWithoutSecrets;
    }),

    getUserByUsername: jest.fn(
      async (username: string): Promise<User | null> => {
        const user = mockAuthStore.getUserByUsername(username);
        if (!user) return null;

        const {
          passwordHash: _passwordHash,
          mfaSecret: _mfaSecret,
          ...userWithoutSecrets
        } = user;
        return userWithoutSecrets;
      },
    ),

    updateUser: jest.fn(
      async (
        userId: string,
        updates: Partial<User>,
      ): Promise<{ user?: User; error?: string }> => {
        const success = mockAuthStore.updateUser(userId, updates);
        if (!success) {
          return { error: "User not found" };
        }

        const updatedUser = mockAuthStore.getUser(userId);
        if (!updatedUser) {
          return { error: "Failed to retrieve updated user" };
        }

        const {
          passwordHash: _passwordHash,
          mfaSecret: _mfaSecret,
          ...userWithoutSecrets
        } = updatedUser;
        return { user: userWithoutSecrets };
      },
    ),

    changePassword: jest.fn(
      async (
        userId: string,
        currentPassword: string,
        newPassword: string,
      ): Promise<{ success: boolean; error?: string }> => {
        const user = mockAuthStore.getUser(userId);
        if (!user) {
          return { success: false, error: "User not found" };
        }

        if (!verifyPassword(currentPassword, user.passwordHash)) {
          return { success: false, error: "Current password is incorrect" };
        }

        user.passwordHash = hashPassword(newPassword);
        user.updatedAt = new Date();

        // Terminate all sessions for security
        mockAuthStore.terminateUserSessions(userId);

        return { success: true };
      },
    ),

    resetPassword: jest.fn(
      async (
        email: string,
      ): Promise<{ success: boolean; resetToken?: string; error?: string }> => {
        const user = mockAuthStore.getUserByEmail(email);
        if (!user) {
          return { success: false, error: "User not found" };
        }

        // Generate mock reset token
        const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        return { success: true, resetToken };
      },
    ),

    verifyEmail: jest.fn(
      async (
        userId: string,
        verificationToken: string,
      ): Promise<{ success: boolean; error?: string }> => {
        const user = mockAuthStore.getUser(userId);
        if (!user) {
          return { success: false, error: "User not found" };
        }

        // Mock verification - in real implementation, would check token validity
        if (verificationToken.startsWith("verify_")) {
          mockAuthStore.updateUser(userId, { isEmailVerified: true });
          return { success: true };
        }

        return { success: false, error: "Invalid verification token" };
      },
    ),

    enableMfa: jest.fn(
      async (
        userId: string,
      ): Promise<{
        success: boolean;
        qrCode?: string;
        backupCodes?: string[];
        error?: string;
      }> => {
        const user = mockAuthStore.getUser(userId);
        if (!user) {
          return { success: false, error: "User not found" };
        }

        if (user.mfaEnabled) {
          return { success: false, error: "MFA is already enabled" };
        }

        const mfaSecret = `mock_mfa_secret_${Math.random().toString(36).substring(7)}`;
        const qrCode = `data:image/png;base64,mock_qr_code_data`;
        const backupCodes = Array.from({ length: 10 }, () =>
          Math.random().toString(36).substring(2, 10).toUpperCase(),
        );

        user.mfaSecret = mfaSecret;
        mockAuthStore.updateUser(userId, { mfaEnabled: true });

        return { success: true, qrCode, backupCodes };
      },
    ),

    disableMfa: jest.fn(
      async (
        userId: string,
        mfaCode: string,
      ): Promise<{ success: boolean; error?: string }> => {
        const user = mockAuthStore.getUser(userId);
        if (!user) {
          return { success: false, error: "User not found" };
        }

        if (!user.mfaEnabled) {
          return { success: false, error: "MFA is not enabled" };
        }

        // Mock MFA verification
        const validMfaCodes = ["123456", "000000"];
        if (!validMfaCodes.includes(mfaCode)) {
          return { success: false, error: "Invalid MFA code" };
        }

        user.mfaSecret = undefined;
        mockAuthStore.updateUser(userId, { mfaEnabled: false });

        return { success: true };
      },
    ),

    verifyMfa: jest.fn(
      async (
        userId: string,
        mfaCode: string,
      ): Promise<{ valid: boolean; error?: string }> => {
        const user = mockAuthStore.getUser(userId);
        if (!user || !user.mfaEnabled) {
          return { valid: false, error: "MFA not enabled for user" };
        }

        // Mock MFA verification
        const validMfaCodes = ["123456", "000000"];
        const valid = validMfaCodes.includes(mfaCode);

        return { valid, error: valid ? undefined : "Invalid MFA code" };
      },
    ),

    hasPermission: jest.fn(
      async (
        userId: string,
        resource: string,
        action: string,
      ): Promise<boolean> => {
        const user = mockAuthStore.getUser(userId);
        if (!user || !user.isActive) return false;

        // Simple RBAC implementation
        const permissions: Record<
          UserRole,
          { resources: string[]; actions: string[] }
        > = {
          admin: { resources: ["*"], actions: ["*"] },
          moderator: {
            resources: ["posts", "comments", "users"],
            actions: ["read", "write", "moderate"],
          },
          user: {
            resources: ["posts", "comments"],
            actions: ["read", "write"],
          },
          guest: { resources: ["posts", "comments"], actions: ["read"] },
        };

        return user.roles.some((role) => {
          const rolePermissions = permissions[role];
          const hasResource =
            rolePermissions.resources.includes("*") ||
            rolePermissions.resources.includes(resource);
          const hasAction =
            rolePermissions.actions.includes("*") ||
            rolePermissions.actions.includes(action);
          return hasResource && hasAction;
        });
      },
    ),

    hasRole: jest.fn(
      async (userId: string, role: UserRole): Promise<boolean> => {
        const user = mockAuthStore.getUser(userId);
        return user ? user.roles.includes(role) : false;
      },
    ),

    getSessions: jest.fn(async (userId: string): Promise<AuthSession[]> => {
      return mockAuthStore.getUserSessions(userId);
    }),

    terminateSession: jest.fn(
      async (
        sessionId: string,
      ): Promise<{ success: boolean; error?: string }> => {
        const success = mockAuthStore.terminateSession(sessionId);
        return success
          ? { success: true }
          : { success: false, error: "Session not found" };
      },
    ),

    generateApiKey: jest.fn(
      async (
        userId: string,
        name: string,
        permissions?: string[],
      ): Promise<{ apiKey?: string; error?: string }> => {
        const user = mockAuthStore.getUser(userId);
        if (!user) {
          return { error: "User not found" };
        }

        const apiKey = `ak_${Math.random().toString(36).substring(2)}_${Date.now()}`;

        mockAuthStore.addApiKey(apiKey, {
          userId,
          name,
          permissions: permissions || ["read"],
        });

        return { apiKey };
      },
    ),

    validateApiKey: jest.fn(
      async (
        apiKey: string,
      ): Promise<{
        valid: boolean;
        userId?: string;
        permissions?: string[];
        error?: string;
      }> => {
        const apiKeyData = mockAuthStore.getApiKey(apiKey);

        if (!apiKeyData) {
          return { valid: false, error: "Invalid API key" };
        }

        const user = mockAuthStore.getUser(apiKeyData.userId);
        if (!user || !user.isActive) {
          return { valid: false, error: "User not found or inactive" };
        }

        return {
          valid: true,
          userId: apiKeyData.userId,
          permissions: apiKeyData.permissions,
        };
      },
    ),
  };
};

// Default mock instance
export const authProviderMock = createAuthProviderMock();

// Mock auth provider factory with configurable behavior
export const createMockAuthProvider = (
  options: {
    alwaysAuthenticate?: boolean;
    alwaysFail?: boolean;
    requireMfa?: boolean;
    simulateLatency?: number;
    failureRate?: number;
    tokenExpirySeconds?: number;
  } = {},
) => {
  const {
    alwaysAuthenticate = false,
    alwaysFail = false,
    requireMfa = false,
    simulateLatency = 0,
    failureRate = 0,
    tokenExpirySeconds = 3600,
  } = options;

  const mock = createAuthProviderMock();

  // Override authentication behavior
  if (alwaysAuthenticate) {
    mock.authenticate = jest.fn(
      async (_credentials: LoginCredentials): Promise<LoginResult> => ({
        success: true,
        user: {
          id: "mock-user",
          username: "mockuser",
          email: "mock@test.com",
          roles: ["user"],
          isActive: true,
          isEmailVerified: true,
          mfaEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        accessToken: "mock.access.token",
        refreshToken: "mock.refresh.token",
        sessionId: "mock-session",
        expiresIn: tokenExpirySeconds,
      }),
    );
  }

  if (alwaysFail) {
    mock.authenticate = jest.fn(
      async (_credentials: LoginCredentials): Promise<LoginResult> => ({
        success: false,
        error: "Authentication failed",
      }),
    );
  }

  if (requireMfa) {
    const originalAuth = mock.authenticate;
    mock.authenticate = jest.fn(async (credentials) => {
      if (!credentials.mfaCode) {
        return {
          success: false,
          requiresMfa: true,
          mfaChallenge: "totp",
          error: "MFA code required",
        };
      }
      return originalAuth(credentials);
    });
  }

  // Add latency simulation
  if (simulateLatency > 0) {
    const originalMethods = {
      authenticate: mock.authenticate,
      validateToken: mock.validateToken,
      refreshToken: mock.refreshToken,
    };

    Object.entries(originalMethods).forEach(([methodName, originalMethod]) => {
      (
        mock as Record<
          string,
          jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>
        >
      )[methodName] = jest.fn(async (...args: unknown[]) => {
        await new Promise((resolve) => setTimeout(resolve, simulateLatency));
        return (originalMethod as (...args: unknown[]) => Promise<unknown>)(
          ...args,
        );
      });
    });
  }

  // Add random failure simulation
  if (failureRate > 0) {
    const authMethods = ["authenticate", "validateToken", "refreshToken"];

    authMethods.forEach((methodName) => {
      const originalMethod = (
        mock as Record<
          string,
          jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>
        >
      )[methodName];
      (
        mock as Record<
          string,
          jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>
        >
      )[methodName] = jest.fn(async (...args: unknown[]) => {
        if (Math.random() < failureRate) {
          throw new Error("Authentication service temporarily unavailable");
        }
        return originalMethod(...args);
      });
    });
  }

  return mock;
};

// Utility functions for authentication testing
export const AuthTestUtils = {
  /**
   * Reset mock auth store
   */
  resetMockStore: (): void => {
    mockAuthStore.clearAll();
  },

  /**
   * Create test user credentials
   */
  createTestCredentials: (
    type: "valid" | "invalid" | "mfa" = "valid",
  ): LoginCredentials => {
    const credentials = {
      valid: { username: "testuser", password: "password123" },
      invalid: { username: "baduser", password: "wrongpass" },
      mfa: { username: "mfauser", password: "secure123", mfaCode: "123456" },
    };

    return credentials[type];
  },

  /**
   * Create test user data
   */
  createTestUser: (overrides: Partial<User> = {}): User => {
    const timestamp = Date.now();
    return {
      id: `test_user_${timestamp}`,
      username: `testuser_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      roles: ["user"],
      isActive: true,
      isEmailVerified: true,
      mfaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Validate authentication result structure
   */
  validateLoginResult: (result: LoginResult): boolean => {
    if (!result.success) {
      return typeof result.error === "string";
    }

    return !!(
      result.user &&
      result.accessToken &&
      typeof result.expiresIn === "number"
    );
  },

  /**
   * Extract payload from mock JWT token
   */
  extractTokenPayload: (token: string): JwtPayload | null => {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      return JSON.parse(Buffer.from(parts[1], "base64").toString());
    } catch {
      return null;
    }
  },
};
