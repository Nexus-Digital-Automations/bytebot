/**
 * Authentication Decorators Tests - Comprehensive decorator testing
 * Tests all authentication and authorization decorators
 *
 * Test Coverage:
 * - Roles decorator with various role combinations
 * - Permissions decorator with different permission sets
 * - Public decorator for bypassing authentication
 * - CurrentUser decorator for extracting user data
 * - User decorator with metadata enhancement
 * - Convenience decorators (AdminOnly, OperatorOrAdmin, etc.)
 * - Metadata setting and retrieval verification
 * - Parameter extraction functionality
 *
 * @author Authentication Decorators Testing Specialist
 * @version 1.0.0
 * @since Phase 2: Authentication Decorators Testing
 */

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, Permission, User } from '@prisma/client';
import {
  Roles,
  Permissions,
  Public,
  CurrentUser,
  RequireRole,
  RequirePermission,
  AdminOnly,
  OperatorOrAdmin,
  Authenticated,
  ROLES_KEY,
} from '../roles.decorator';
import { User as UserDecorator, AuthenticatedUser } from '../user.decorator';

describe('Authentication Decorators', () => {
  let reflector: Reflector;
  let mockExecutionContext: ExecutionContext;

  // Test data
  const mockUser: User = {
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

  const mockAuthenticatedUser: AuthenticatedUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'VIEWER',
    permissions: ['read', 'view'],
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Test Browser)',
    sessionId: 'session-123',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const createMockRequest = (
    user?: User | AuthenticatedUser,
    overrides: any = {},
  ) => ({
    user,
    ip: '192.168.1.100',
    connection: { remoteAddress: '192.168.1.100' },
    get: jest.fn((header: string) => {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Test Browser)',
        'Content-Type': 'application/json',
        ...overrides.headers,
      };
      return headers[header];
    }),
    ...overrides,
  });

  const createMockExecutionContext = (request: any): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => jest.fn(),
    }),
    getHandler: () => ({ name: 'testHandler' }),
    getClass: () => ({ name: 'TestController' }),
    getArgs: () => [],
    getArgByIndex: () => ({}),
    switchToRpc: () => ({ getData: () => ({}), getContext: () => ({}) }),
    switchToWs: () => ({ getData: () => ({}), getClient: () => ({}) }),
    getType: () => 'http' as const,
  });

  beforeEach(() => {
    reflector = new Reflector();
    const mockRequest = createMockRequest(mockUser);
    mockExecutionContext = createMockExecutionContext(mockRequest);
  });

  describe('Roles Decorator', () => {
    it('should set metadata for single role', () => {
      // Arrange
      class TestController {
        @Roles(UserRole.ADMIN)
        testMethod() {}
      }

      // Act
      const roles = reflector.get(
        ROLES_KEY,
        TestController.prototype.testMethod,
      );

      // Assert
      expect(roles).toEqual([UserRole.ADMIN]);
    });

    it('should set metadata for multiple roles', () => {
      // Arrange
      class TestController {
        @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
        testMethod() {}
      }

      // Act
      const roles = reflector.get(
        ROLES_KEY,
        TestController.prototype.testMethod,
      );

      // Assert
      expect(roles).toEqual([
        UserRole.ADMIN,
        UserRole.OPERATOR,
        UserRole.VIEWER,
      ]);
    });

    it('should handle empty roles array', () => {
      // Arrange
      class TestController {
        @Roles()
        testMethod() {}
      }

      // Act
      const roles = reflector.get(
        ROLES_KEY,
        TestController.prototype.testMethod,
      );

      // Assert
      expect(roles).toEqual([]);
    });

    it('should not interfere with other metadata', () => {
      // Arrange
      class TestController {
        @Roles(UserRole.ADMIN)
        @Public()
        testMethod() {}
      }

      // Act
      const roles = reflector.get(
        ROLES_KEY,
        TestController.prototype.testMethod,
      );
      const isPublic = reflector.get(
        'isPublic',
        TestController.prototype.testMethod,
      );

      // Assert
      expect(roles).toEqual([UserRole.ADMIN]);
      expect(isPublic).toBe(true);
    });
  });

  describe('Permissions Decorator', () => {
    it('should set metadata for single permission', () => {
      // Arrange
      class TestController {
        @Permissions(Permission.TASK_READ)
        testMethod() {}
      }

      // Act
      const permissions = reflector.get(
        'permissions',
        TestController.prototype.testMethod,
      );

      // Assert
      expect(permissions).toEqual([Permission.TASK_READ]);
    });

    it('should set metadata for multiple permissions', () => {
      // Arrange
      class TestController {
        @Permissions(
          Permission.TASK_READ,
          Permission.TASK_WRITE,
          Permission.COMPUTER_CONTROL,
        )
        testMethod() {}
      }

      // Act
      const permissions = reflector.get(
        'permissions',
        TestController.prototype.testMethod,
      );

      // Assert
      expect(permissions).toEqual([
        Permission.TASK_READ,
        Permission.TASK_WRITE,
        Permission.COMPUTER_CONTROL,
      ]);
    });

    it('should handle empty permissions array', () => {
      // Arrange
      class TestController {
        @Permissions()
        testMethod() {}
      }

      // Act
      const permissions = reflector.get(
        'permissions',
        TestController.prototype.testMethod,
      );

      // Assert
      expect(permissions).toEqual([]);
    });
  });

  describe('Public Decorator', () => {
    it('should set isPublic metadata to true', () => {
      // Arrange
      class TestController {
        @Public()
        testMethod() {}
      }

      // Act
      const isPublic = reflector.get(
        'isPublic',
        TestController.prototype.testMethod,
      );

      // Assert
      expect(isPublic).toBe(true);
    });

    it('should work with other decorators', () => {
      // Arrange
      class TestController {
        @Public()
        @Roles(UserRole.ADMIN)
        testMethod() {}
      }

      // Act
      const isPublic = reflector.get(
        'isPublic',
        TestController.prototype.testMethod,
      );
      const roles = reflector.get(
        ROLES_KEY,
        TestController.prototype.testMethod,
      );

      // Assert
      expect(isPublic).toBe(true);
      expect(roles).toEqual([UserRole.ADMIN]);
    });
  });

  describe('CurrentUser Decorator', () => {
    it('should extract full user object from request', () => {
      // Arrange
      const request = createMockRequest(mockUser);
      const context = createMockExecutionContext(request);

      // Act
      const extractedUser = CurrentUser(undefined, context);

      // Assert
      expect(extractedUser).toEqual(mockUser);
    });

    it('should extract specific user property', () => {
      // Arrange
      const request = createMockRequest(mockUser);
      const context = createMockExecutionContext(request);

      // Act
      const userId = CurrentUser('id', context);
      const userEmail = CurrentUser('email', context);
      const userRole = CurrentUser('role', context);

      // Assert
      expect(userId).toBe(mockUser.id);
      expect(userEmail).toBe(mockUser.email);
      expect(userRole).toBe(mockUser.role);
    });

    it('should return undefined when user is not present', () => {
      // Arrange
      const request = createMockRequest(); // No user
      const context = createMockExecutionContext(request);

      // Act
      const extractedUser = CurrentUser(undefined, context);

      // Assert
      expect(extractedUser).toBeUndefined();
    });

    it('should return undefined for property when user is not present', () => {
      // Arrange
      const request = createMockRequest(); // No user
      const context = createMockExecutionContext(request);

      // Act
      const userId = CurrentUser('id', context);

      // Assert
      expect(userId).toBeUndefined();
    });

    it('should handle request without user property gracefully', () => {
      // Arrange
      const request = createMockRequest();
      delete request.user; // Ensure user is undefined
      const context = createMockExecutionContext(request);

      // Act & Assert
      expect(() => CurrentUser(undefined, context)).not.toThrow();
      expect(CurrentUser(undefined, context)).toBeUndefined();
    });
  });

  describe('User Decorator', () => {
    it('should extract full AuthenticatedUser object from request', () => {
      // Arrange
      const request = createMockRequest(mockAuthenticatedUser);
      const context = createMockExecutionContext(request);

      // Act
      const extractedUser = UserDecorator(undefined, context);

      // Assert
      expect(extractedUser).toEqual(mockAuthenticatedUser);
    });

    it('should extract specific user property', () => {
      // Arrange
      const request = createMockRequest(mockAuthenticatedUser);
      const context = createMockExecutionContext(request);

      // Act
      const userId = UserDecorator('id', context);
      const username = UserDecorator('username', context);
      const permissions = UserDecorator('permissions', context);

      // Assert
      expect(userId).toBe(mockAuthenticatedUser.id);
      expect(username).toBe(mockAuthenticatedUser.username);
      expect(permissions).toEqual(mockAuthenticatedUser.permissions);
    });

    it('should enhance user object with IP and User-Agent when missing', () => {
      // Arrange
      const userWithoutMetadata = { ...mockAuthenticatedUser };
      delete userWithoutMetadata.ipAddress;
      delete userWithoutMetadata.userAgent;

      const request = createMockRequest(userWithoutMetadata);
      const context = createMockExecutionContext(request);

      // Act
      const extractedUser = UserDecorator(
        undefined,
        context,
      ) as AuthenticatedUser;

      // Assert
      expect(extractedUser.ipAddress).toBe('192.168.1.100');
      expect(extractedUser.userAgent).toBe('Mozilla/5.0 (Test Browser)');
    });

    it('should fallback to unknown when IP and User-Agent are not available', () => {
      // Arrange
      const userWithoutMetadata = { ...mockAuthenticatedUser };
      delete userWithoutMetadata.ipAddress;
      delete userWithoutMetadata.userAgent;

      const request = createMockRequest(userWithoutMetadata, {
        ip: undefined,
        connection: undefined,
        get: jest.fn(() => undefined),
      });
      const context = createMockExecutionContext(request);

      // Act
      const extractedUser = UserDecorator(
        undefined,
        context,
      ) as AuthenticatedUser;

      // Assert
      expect(extractedUser.ipAddress).toBe('unknown');
      expect(extractedUser.userAgent).toBe('unknown');
    });

    it('should not modify user object if IP and User-Agent already exist', () => {
      // Arrange
      const request = createMockRequest(mockAuthenticatedUser);
      const context = createMockExecutionContext(request);

      // Act
      const extractedUser = UserDecorator(
        undefined,
        context,
      ) as AuthenticatedUser;

      // Assert
      expect(extractedUser.ipAddress).toBe(mockAuthenticatedUser.ipAddress);
      expect(extractedUser.userAgent).toBe(mockAuthenticatedUser.userAgent);
    });

    it('should return undefined when user is not present', () => {
      // Arrange
      const request = createMockRequest(); // No user
      const context = createMockExecutionContext(request);

      // Act
      const extractedUser = UserDecorator(undefined, context);

      // Assert
      expect(extractedUser).toBeUndefined();
    });
  });

  describe('Convenience Decorators', () => {
    describe('RequireRole', () => {
      it('should set metadata for single role', () => {
        // Arrange
        class TestController {
          @RequireRole(UserRole.ADMIN)
          testMethod() {}
        }

        // Act
        const roles = reflector.get(
          ROLES_KEY,
          TestController.prototype.testMethod,
        );

        // Assert
        expect(roles).toEqual([UserRole.ADMIN]);
      });
    });

    describe('RequirePermission', () => {
      it('should set metadata for single permission', () => {
        // Arrange
        class TestController {
          @RequirePermission(Permission.SYSTEM_ADMIN)
          testMethod() {}
        }

        // Act
        const permissions = reflector.get(
          'permissions',
          TestController.prototype.testMethod,
        );

        // Assert
        expect(permissions).toEqual([Permission.SYSTEM_ADMIN]);
      });
    });

    describe('AdminOnly', () => {
      it('should require admin role only', () => {
        // Arrange
        class TestController {
          @AdminOnly()
          testMethod() {}
        }

        // Act
        const roles = reflector.get(
          ROLES_KEY,
          TestController.prototype.testMethod,
        );

        // Assert
        expect(roles).toEqual([UserRole.ADMIN]);
      });
    });

    describe('OperatorOrAdmin', () => {
      it('should require operator or admin roles', () => {
        // Arrange
        class TestController {
          @OperatorOrAdmin()
          testMethod() {}
        }

        // Act
        const roles = reflector.get(
          ROLES_KEY,
          TestController.prototype.testMethod,
        );

        // Assert
        expect(roles).toEqual([UserRole.OPERATOR, UserRole.ADMIN]);
      });
    });

    describe('Authenticated', () => {
      it('should require any authenticated role', () => {
        // Arrange
        class TestController {
          @Authenticated()
          testMethod() {}
        }

        // Act
        const roles = reflector.get(
          ROLES_KEY,
          TestController.prototype.testMethod,
        );

        // Assert
        expect(roles).toEqual([
          UserRole.ADMIN,
          UserRole.OPERATOR,
          UserRole.VIEWER,
        ]);
      });
    });
  });

  describe('Decorator Combinations', () => {
    it('should work with multiple decorators on same method', () => {
      // Arrange
      class TestController {
        @Roles(UserRole.ADMIN)
        @Permissions(Permission.SYSTEM_ADMIN)
        @Public()
        testMethod() {}
      }

      // Act
      const roles = reflector.get(
        ROLES_KEY,
        TestController.prototype.testMethod,
      );
      const permissions = reflector.get(
        'permissions',
        TestController.prototype.testMethod,
      );
      const isPublic = reflector.get(
        'isPublic',
        TestController.prototype.testMethod,
      );

      // Assert
      expect(roles).toEqual([UserRole.ADMIN]);
      expect(permissions).toEqual([Permission.SYSTEM_ADMIN]);
      expect(isPublic).toBe(true);
    });

    it('should work when decorators are applied to different methods', () => {
      // Arrange
      class TestController {
        @Roles(UserRole.ADMIN)
        adminMethod() {}

        @Permissions(Permission.TASK_READ)
        taskMethod() {}

        @Public()
        publicMethod() {}
      }

      // Act & Assert
      expect(
        reflector.get(ROLES_KEY, TestController.prototype.adminMethod),
      ).toEqual([UserRole.ADMIN]);
      expect(
        reflector.get('permissions', TestController.prototype.taskMethod),
      ).toEqual([Permission.TASK_READ]);
      expect(
        reflector.get('isPublic', TestController.prototype.publicMethod),
      ).toBe(true);

      // Ensure methods don't interfere with each other
      expect(
        reflector.get(ROLES_KEY, TestController.prototype.taskMethod),
      ).toBeUndefined();
      expect(
        reflector.get('permissions', TestController.prototype.adminMethod),
      ).toBeUndefined();
      expect(
        reflector.get('isPublic', TestController.prototype.adminMethod),
      ).toBeUndefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined execution context gracefully', () => {
      // Act & Assert
      expect(() => CurrentUser(undefined, undefined as any)).toThrow();
    });

    it('should handle malformed request object', () => {
      // Arrange
      const malformedContext = {
        switchToHttp: () => ({
          getRequest: () => null,
        }),
      } as any;

      // Act & Assert
      expect(() => CurrentUser(undefined, malformedContext)).toThrow();
    });

    it('should handle request without switchToHttp method', () => {
      // Arrange
      const malformedContext = {} as any;

      // Act & Assert
      expect(() => CurrentUser(undefined, malformedContext)).toThrow();
    });

    it('should handle non-existent user properties', () => {
      // Arrange
      const request = createMockRequest(mockUser);
      const context = createMockExecutionContext(request);

      // Act
      const nonExistentProperty = CurrentUser('nonExistent' as any, context);

      // Assert
      expect(nonExistentProperty).toBeUndefined();
    });

    it('should handle user object with null properties', () => {
      // Arrange
      const userWithNulls = { ...mockUser, email: null, lastName: null };
      const request = createMockRequest(userWithNulls);
      const context = createMockExecutionContext(request);

      // Act
      const email = CurrentUser('email', context);
      const lastName = CurrentUser('lastName', context);

      // Assert
      expect(email).toBeNull();
      expect(lastName).toBeNull();
    });

    it('should preserve user object immutability', () => {
      // Arrange
      const originalUser = { ...mockAuthenticatedUser };
      const request = createMockRequest(originalUser);
      const context = createMockExecutionContext(request);

      // Act
      UserDecorator(undefined, context);

      // Verify original object wasn't modified (except for enhancement)
      expect(originalUser.id).toBe(mockAuthenticatedUser.id);
      expect(originalUser.username).toBe(mockAuthenticatedUser.username);
      expect(originalUser.email).toBe(mockAuthenticatedUser.email);
    });
  });

  describe('Type Safety and Interface Compliance', () => {
    it('should work with TypeScript type checking for roles', () => {
      // This test verifies that the decorator accepts only valid UserRole values
      class TestController {
        @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER)
        testMethod() {}
      }

      const roles = reflector.get(
        ROLES_KEY,
        TestController.prototype.testMethod,
      );
      expect(roles).toContain(UserRole.ADMIN);
      expect(roles).toContain(UserRole.OPERATOR);
      expect(roles).toContain(UserRole.VIEWER);
    });

    it('should work with TypeScript type checking for permissions', () => {
      // This test verifies that the decorator accepts only valid Permission values
      class TestController {
        @Permissions(
          Permission.TASK_READ,
          Permission.TASK_WRITE,
          Permission.COMPUTER_CONTROL,
        )
        testMethod() {}
      }

      const permissions = reflector.get(
        'permissions',
        TestController.prototype.testMethod,
      );
      expect(permissions).toContain(Permission.TASK_READ);
      expect(permissions).toContain(Permission.TASK_WRITE);
      expect(permissions).toContain(Permission.COMPUTER_CONTROL);
    });

    it('should return correct types for CurrentUser decorator', () => {
      // Arrange
      const request = createMockRequest(mockUser);
      const context = createMockExecutionContext(request);

      // Act
      const fullUser = CurrentUser(undefined, context) as User;
      const userId = CurrentUser('id', context) as string;
      const userRole = CurrentUser('role', context) as UserRole;
      const isActive = CurrentUser('isActive', context) as boolean;

      // Assert - Type checking is done at compile time, runtime verification of values
      expect(typeof fullUser).toBe('object');
      expect(typeof userId).toBe('string');
      expect(Object.values(UserRole)).toContain(userRole);
      expect(typeof isActive).toBe('boolean');
    });
  });
});
