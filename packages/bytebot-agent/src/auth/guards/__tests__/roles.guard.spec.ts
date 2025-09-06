/**
 * RBAC Roles Guard Unit Tests - Comprehensive testing for role-based authorization
 * Tests role-based access control, permission checking, and authorization flows
 *
 * Test Coverage:
 * - Role-based access control validation
 * - Permission-based authorization
 * - Hierarchical role checking
 * - Multiple role requirements
 * - User context validation
 * - Public route handling
 * - Authorization failure scenarios
 * - Performance and security testing
 *
 * @author Testing & Quality Assurance Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles.guard';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  // Test users with different roles and permissions
  const adminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    username: 'admin',
    role: UserRole.ADMIN,
    isActive: true,
    permissions: [
      { id: 'perm-1', name: 'task:read', description: 'Read tasks' },
      { id: 'perm-2', name: 'task:write', description: 'Write tasks' },
      { id: 'perm-3', name: 'task:execute', description: 'Execute tasks' },
      {
        id: 'perm-4',
        name: 'computer:control',
        description: 'Control computer',
      },
      {
        id: 'perm-5',
        name: 'system:admin',
        description: 'System administration',
      },
      { id: 'perm-6', name: 'api:manage', description: 'Manage API' },
    ],
  };

  const operatorUser = {
    id: 'operator-123',
    email: 'operator@example.com',
    username: 'operator',
    role: UserRole.OPERATOR,
    isActive: true,
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

  const viewerUser = {
    id: 'viewer-123',
    email: 'viewer@example.com',
    username: 'viewer',
    role: UserRole.VIEWER,
    isActive: true,
    permissions: [
      { id: 'perm-1', name: 'task:read', description: 'Read tasks' },
      {
        id: 'perm-7',
        name: 'computer:view',
        description: 'View computer status',
      },
    ],
  };

  const apiConsumerUser = {
    id: 'api-consumer-123',
    email: 'api@example.com',
    username: 'api-consumer',
    role: UserRole.API_CONSUMER,
    isActive: true,
    permissions: [
      { id: 'perm-8', name: 'api:access', description: 'Access API' },
    ],
  };

  const createMockExecutionContext = (user: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          ip: '127.0.0.1',
          headers: { 'user-agent': 'Test Agent' },
        }),
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    describe('role-based authorization', () => {
      it('should allow access when user has required role (ADMIN)', async () => {
        // Arrange
        const context = createMockExecutionContext(adminUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
          context.getHandler(),
          context.getClass(),
        ]);
      });

      it('should allow access when user has one of multiple required roles', async () => {
        // Arrange
        const context = createMockExecutionContext(operatorUser);
        reflector.getAllAndOverride.mockReturnValue([
          UserRole.ADMIN,
          UserRole.OPERATOR,
        ]);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });

      it('should deny access when user does not have required role', async () => {
        // Arrange
        const context = createMockExecutionContext(viewerUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should allow access when no roles are required (public route)', async () => {
        // Arrange
        const context = createMockExecutionContext(viewerUser);
        reflector.getAllAndOverride.mockReturnValue(undefined);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });

      it('should allow access when empty roles array (public route)', async () => {
        // Arrange
        const context = createMockExecutionContext(viewerUser);
        reflector.getAllAndOverride.mockReturnValue([]);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('permission-based authorization', () => {
      it('should allow access when user has required permission', async () => {
        // Arrange
        const context = createMockExecutionContext(operatorUser);
        reflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // No roles required
          .mockReturnValueOnce(['task:write']); // Permissions required

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });

      it('should allow access when user has one of multiple required permissions', async () => {
        // Arrange
        const context = createMockExecutionContext(viewerUser);
        reflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // No roles required
          .mockReturnValueOnce(['task:write', 'computer:view']); // One permission matches

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });

      it('should deny access when user does not have required permission', async () => {
        // Arrange
        const context = createMockExecutionContext(viewerUser);
        reflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // No roles required
          .mockReturnValueOnce(['system:admin']); // Permission not granted

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should allow access when no permissions are required', async () => {
        // Arrange
        const context = createMockExecutionContext(viewerUser);
        reflector.getAllAndOverride
          .mockReturnValueOnce(undefined) // No roles required
          .mockReturnValueOnce(undefined); // No permissions required

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('combined role and permission authorization', () => {
      it('should require BOTH role AND permission when both are specified', async () => {
        // Test case: User has role but not permission - should deny
        const context = createMockExecutionContext(operatorUser);
        reflector.getAllAndOverride
          .mockReturnValueOnce([UserRole.OPERATOR]) // Has role
          .mockReturnValueOnce(['system:admin']); // Missing permission

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should allow access when user has both required role and permission', async () => {
        // Arrange
        const context = createMockExecutionContext(adminUser);
        reflector.getAllAndOverride
          .mockReturnValueOnce([UserRole.ADMIN]) // Has role
          .mockReturnValueOnce(['system:admin']); // Has permission

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('hierarchical role system', () => {
      it('should respect role hierarchy (ADMIN > OPERATOR > VIEWER)', async () => {
        // Admin can access operator routes
        const adminContext = createMockExecutionContext(adminUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.OPERATOR]);

        let result = await guard.canActivate(adminContext);
        expect(result).toBe(true);

        // Admin can access viewer routes
        reflector.getAllAndOverride.mockReturnValue([UserRole.VIEWER]);
        result = await guard.canActivate(adminContext);
        expect(result).toBe(true);

        // Operator can access viewer routes
        const operatorContext = createMockExecutionContext(operatorUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.VIEWER]);
        result = await guard.canActivate(operatorContext);
        expect(result).toBe(true);
      });

      it('should not allow lower roles to access higher role routes', async () => {
        // Viewer cannot access operator routes
        const viewerContext = createMockExecutionContext(viewerUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.OPERATOR]);

        await expect(guard.canActivate(viewerContext)).rejects.toThrow(
          ForbiddenException,
        );

        // Operator cannot access admin routes
        const operatorContext = createMockExecutionContext(operatorUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        await expect(guard.canActivate(operatorContext)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe('API consumer role handling', () => {
      it('should handle API_CONSUMER role with specific permissions', async () => {
        // Arrange
        const context = createMockExecutionContext(apiConsumerUser);
        reflector.getAllAndOverride
          .mockReturnValueOnce([UserRole.API_CONSUMER])
          .mockReturnValueOnce(['api:access']);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });

      it('should deny API_CONSUMER access to non-API permissions', async () => {
        // Arrange
        const context = createMockExecutionContext(apiConsumerUser);
        reflector.getAllAndOverride
          .mockReturnValueOnce([UserRole.API_CONSUMER])
          .mockReturnValueOnce(['task:execute']);

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe('edge cases and error handling', () => {
      it('should throw ForbiddenException when user is not authenticated', async () => {
        // Arrange
        const context = createMockExecutionContext(null); // No user
        reflector.getAllAndOverride.mockReturnValue([UserRole.VIEWER]);

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should throw ForbiddenException when user is inactive', async () => {
        // Arrange
        const inactiveUser = { ...viewerUser, isActive: false };
        const context = createMockExecutionContext(inactiveUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.VIEWER]);

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should handle missing permissions array gracefully', async () => {
        // Arrange
        const userWithoutPermissions = {
          ...viewerUser,
          permissions: undefined,
        };
        const context = createMockExecutionContext(userWithoutPermissions);
        reflector.getAllAndOverride
          .mockReturnValueOnce(undefined)
          .mockReturnValueOnce(['task:read']);

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should handle empty permissions array', async () => {
        // Arrange
        const userWithEmptyPermissions = {
          ...viewerUser,
          permissions: [],
        };
        const context = createMockExecutionContext(userWithEmptyPermissions);
        reflector.getAllAndOverride
          .mockReturnValueOnce(undefined)
          .mockReturnValueOnce(['task:read']);

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should handle malformed permission objects', async () => {
        // Arrange
        const userWithMalformedPermissions = {
          ...viewerUser,
          permissions: [
            { name: 'task:read' }, // Missing id and description
            null,
            undefined,
            { id: 'perm-2' }, // Missing name
          ],
        };
        const context = createMockExecutionContext(
          userWithMalformedPermissions,
        );
        reflector.getAllAndOverride
          .mockReturnValueOnce(undefined)
          .mockReturnValueOnce(['task:read']);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true); // Should still work with valid permission
      });
    });

    describe('security logging and monitoring', () => {
      it('should log successful authorization attempts', async () => {
        // Arrange
        const loggerSpy = jest.spyOn(guard['logger'], 'log');
        const context = createMockExecutionContext(adminUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('Authorization successful'),
          expect.objectContaining({
            userId: adminUser.id,
            role: adminUser.role,
            requiredRoles: [UserRole.ADMIN],
          }),
        );
      });

      it('should log failed authorization attempts', async () => {
        // Arrange
        const warnSpy = jest.spyOn(guard['logger'], 'warn');
        const context = createMockExecutionContext(viewerUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Authorization failed'),
          expect.objectContaining({
            userId: viewerUser.id,
            userRole: viewerUser.role,
            requiredRoles: [UserRole.ADMIN],
          }),
        );
      });

      it('should log permission-based authorization failures', async () => {
        // Arrange
        const warnSpy = jest.spyOn(guard['logger'], 'warn');
        const context = createMockExecutionContext(viewerUser);
        reflector.getAllAndOverride
          .mockReturnValueOnce(undefined)
          .mockReturnValueOnce(['system:admin']);

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Permission authorization failed'),
          expect.objectContaining({
            userId: viewerUser.id,
            requiredPermissions: ['system:admin'],
            userPermissions: expect.arrayContaining([
              'task:read',
              'computer:view',
            ]),
          }),
        );
      });
    });

    describe('performance tests', () => {
      it('should complete authorization check within performance threshold', async () => {
        // Arrange
        const context = createMockExecutionContext(adminUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        // Act
        const startTime = Date.now();
        await guard.canActivate(context);
        const duration = Date.now() - startTime;

        // Assert - should complete within 50ms for unit test
        expect(duration).toBeLessThan(50);
      });

      it('should handle concurrent authorization requests efficiently', async () => {
        // Arrange
        const contexts = Array.from({ length: 50 }, () =>
          createMockExecutionContext(adminUser),
        );
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        // Act
        const startTime = Date.now();
        const results = await Promise.all(
          contexts.map((context) => guard.canActivate(context)),
        );
        const duration = Date.now() - startTime;

        // Assert
        expect(results).toHaveLength(50);
        expect(results.every((result) => result === true)).toBe(true);
        expect(duration).toBeLessThan(1000); // Should complete 50 requests within 1 second
      });

      it('should efficiently check large permission sets', async () => {
        // Arrange
        const userWithManyPermissions = {
          ...adminUser,
          permissions: Array.from({ length: 100 }, (_, i) => ({
            id: `perm-${i}`,
            name: `permission:${i}`,
            description: `Permission ${i}`,
          })),
        };
        const context = createMockExecutionContext(userWithManyPermissions);
        reflector.getAllAndOverride
          .mockReturnValueOnce(undefined)
          .mockReturnValueOnce(['permission:50']); // Permission in the middle

        // Act
        const startTime = Date.now();
        const result = await guard.canActivate(context);
        const duration = Date.now() - startTime;

        // Assert
        expect(result).toBe(true);
        expect(duration).toBeLessThan(100); // Should handle large permission sets efficiently
      });
    });
  });
});
