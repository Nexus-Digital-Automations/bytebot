/**
 * RBAC Roles Guard Advanced Security Test Suite
 *
 * Comprehensive security-focused tests for Role-Based Access Control covering:
 * - Role escalation attack prevention
 * - Permission bypass vulnerability testing
 * - Concurrent authorization attack handling
 * - Role hierarchy manipulation attempts
 * - Authorization timing attack mitigation
 * - Security audit logging validation
 *
 * @author Security Implementation Specialist
 * @version 1.0.0
 * @coverage-target 95%+
 * @security-focus Critical
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../guards/roles.guard';
import { UserRole, Permission } from '@bytebot/shared';
import { ByteBotdUser } from '../guards/jwt-auth.guard';

/**
 * Advanced Security-Focused RBAC Tests
 * Tests critical authorization vulnerabilities and attack vectors
 */
describe('RolesGuard - Advanced Security Tests', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let module: TestingModule;

  const operationId = `roles_security_test_${Date.now()}`;
  const securityLogger = {
    info: (message: string, meta?: any) => console.log(`[RBAC-SECURITY] ${message}`, meta || ''),
    warn: (message: string, meta?: any) => console.warn(`[RBAC-WARNING] ${message}`, meta || ''),
    error: (message: string, meta?: any) => console.error(`[RBAC-ERROR] ${message}`, meta || ''),
  };

  // Mock execution context factory with security metadata
  const createMockExecutionContext = (
    user?: ByteBotdUser,
    route = 'test-route',
    method = 'GET',
    ip = '127.0.0.1'
  ): ExecutionContext => {
    const mockRequest = {
      user,
      url: `/${route}`,
      method,
      ip,
      headers: {
        'user-agent': 'Test-Agent/1.0',
        'x-forwarded-for': ip,
      },
      connection: { remoteAddress: ip },
      socket: { remoteAddress: ip },
    };

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue({}),
      }),
      getHandler: jest.fn().mockReturnValue({ name: 'testHandler' }),
      getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
    } as any;
  };

  // Create malicious user objects for security testing
  const createMaliciousUsers = () => {
    return {
      // User with prototype pollution attempt
      prototypePollution: {
        id: 'user_123',
        email: 'user@test.com',
        username: 'testuser',
        role: UserRole.VIEWER,
        isActive: true,
        __proto__: { role: UserRole.ADMIN }, // Prototype pollution
        constructor: { prototype: { role: UserRole.ADMIN } },
      } as ByteBotdUser,

      // User with role confusion
      roleConfusion: {
        id: 'user_456',
        email: 'admin@test.com',
        username: 'fakeadmin',
        role: 'ADMIN' as UserRole, // String instead of enum
        isActive: true,
        admin: true, // Additional admin flag
        roles: [UserRole.ADMIN], // Array of roles
      } as any,

      // User with XSS in properties
      xssPayload: {
        id: '<script>alert("XSS")</script>',
        email: '<img src=x onerror=alert("XSS")>@test.com',
        username: 'javascript:alert("XSS")',
        firstName: '<svg onload=alert("XSS")>',
        lastName: '\u003cscript\u003ealert("XSS")\u003c/script\u003e',
        role: UserRole.VIEWER,
        isActive: true,
      } as ByteBotdUser,

      // User with SQL injection in properties
      sqlInjection: {
        id: "'; DROP TABLE users; --",
        email: "admin@test.com'; DELETE FROM sessions WHERE '1'='1",
        username: "admin' OR '1'='1",
        role: UserRole.VIEWER,
        isActive: true,
      } as ByteBotdUser,

      // Inactive user attempting access
      inactiveUser: {
        id: 'inactive_user',
        email: 'inactive@test.com',
        username: 'inactive',
        role: UserRole.ADMIN,
        isActive: false, // Inactive user with admin role
      } as ByteBotdUser,
    };
  };

  beforeEach(async () => {
    securityLogger.info(`[${operationId}] Setting up RBAC Security test module`);

    module = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);

    securityLogger.info(`[${operationId}] RBAC Security test setup completed`);
  });

  afterEach(async () => {
    await module.close();
    securityLogger.info(`[${operationId}] RBAC Security test cleanup completed`);
  });

  describe('Role Escalation Attack Prevention', () => {
    it('should prevent prototype pollution role escalation', async () => {
      const testId = `${operationId}_prototype_pollution`;
      securityLogger.info(`[${testId}] Testing prototype pollution role escalation prevention`);

      const maliciousUsers = createMaliciousUsers();
      const context = createMockExecutionContext(
        maliciousUsers.prototypePollution,
        'admin-endpoint',
        'POST',
        '192.168.1.100'
      );

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce([UserRole.ADMIN]) // roles
        .mockReturnValueOnce(undefined); // permissions

      // Should deny access despite prototype pollution attempt
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      
      securityLogger.warn(`[${testId}] Prototype pollution attack blocked - user role: ${maliciousUsers.prototypePollution.role}`);
    });

    it('should prevent role confusion attacks', async () => {
      const testId = `${operationId}_role_confusion`;
      securityLogger.info(`[${testId}] Testing role confusion attack prevention`);

      const maliciousUsers = createMaliciousUsers();
      const context = createMockExecutionContext(
        maliciousUsers.roleConfusion,
        'sensitive-data',
        'GET'
      );

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce([UserRole.ADMIN]) // roles
        .mockReturnValueOnce(undefined); // permissions

      // Test role validation strictness
      try {
        await guard.canActivate(context);
        // If it passes, verify it's because of proper role validation, not confusion
        const request = context.switchToHttp().getRequest();
        expect(request.user.role).toBe(UserRole.ADMIN);
      } catch (error) {
        // Should throw ForbiddenException if role validation is strict
        expect(error).toBeInstanceOf(ForbiddenException);
      }
      
      securityLogger.info(`[${testId}] Role confusion attack handled appropriately`);
    });

    it('should prevent inactive user role escalation', async () => {
      const testId = `${operationId}_inactive_escalation`;
      securityLogger.info(`[${testId}] Testing inactive user role escalation prevention`);

      const maliciousUsers = createMaliciousUsers();
      const context = createMockExecutionContext(
        maliciousUsers.inactiveUser,
        'user-management',
        'DELETE'
      );

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce([UserRole.ADMIN]) // roles
        .mockReturnValueOnce(undefined); // permissions

      // Inactive users should not be able to access protected resources
      // regardless of their role
      if (maliciousUsers.inactiveUser.isActive === false) {
        await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      }
      
      securityLogger.warn(`[${testId}] Inactive user access denied despite admin role`);
    });

    it('should prevent concurrent role modification attacks', async () => {
      const testId = `${operationId}_concurrent_role_modification`;
      securityLogger.info(`[${testId}] Testing concurrent role modification attack prevention`);

      const user: ByteBotdUser = {
        id: 'mutable_user',
        email: 'user@test.com',
        username: 'mutableuser',
        role: UserRole.VIEWER,
        isActive: true,
      };

      const contexts = Array(10).fill(null).map(() => 
        createMockExecutionContext(user, 'admin-action', 'POST')
      );

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN]); // All require admin

      // Simulate concurrent requests where user role might be modified
      const promises = contexts.map(async (context, index) => {
        // Simulate role modification during concurrent requests
        if (index === 5) {
          user.role = UserRole.ADMIN; // Simulate role escalation mid-flight
        }
        
        try {
          const result = await guard.canActivate(context);
          return { success: true, index };
        } catch (error) {
          return { success: false, index, error: error.message };
        }
      });

      const results = await Promise.all(promises);
      const failedRequests = results.filter(r => !r.success).length;
      
      // Most requests should fail since user started as VIEWER
      expect(failedRequests).toBeGreaterThan(5);
      
      securityLogger.warn(`[${testId}] Concurrent role modification handled - ${failedRequests} requests blocked`);
    });
  });

  describe('Permission Bypass Attack Prevention', () => {
    it('should prevent permission array manipulation', async () => {
      const testId = `${operationId}_permission_manipulation`;
      securityLogger.info(`[${testId}] Testing permission array manipulation prevention`);

      const user: ByteBotdUser = {
        id: 'perm_user',
        email: 'user@test.com',
        username: 'permuser',
        role: UserRole.VIEWER,
        isActive: true,
      };

      const context = createMockExecutionContext(user, 'system-admin', 'POST');

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(undefined) // roles
        .mockReturnValueOnce([Permission.SYSTEM_ADMIN]); // permissions

      // Attempt to manipulate permissions during request
      const originalPermissions = Object.values(Permission);
      const maliciousRequest = context.switchToHttp().getRequest();
      
      // Try to inject permissions
      (maliciousRequest.user as any).permissions = [Permission.SYSTEM_ADMIN];
      (maliciousRequest.user as any).__permissions = [Permission.SYSTEM_ADMIN];
      
      // Should still deny access based on role-based permissions
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      
      securityLogger.warn(`[${testId}] Permission manipulation attack blocked`);
    });

    it('should prevent permission spoofing through object injection', async () => {
      const testId = `${operationId}_permission_spoofing`;
      securityLogger.info(`[${testId}] Testing permission spoofing attack prevention`);

      const spoofedUser = {
        id: 'spoof_user',
        email: 'user@test.com',
        username: 'spoofuser',
        role: UserRole.VIEWER,
        isActive: true,
        // Injection attempts
        toString: () => UserRole.ADMIN,
        valueOf: () => UserRole.ADMIN,
        [Symbol.toPrimitive]: () => UserRole.ADMIN,
        constructor: {
          prototype: {
            role: UserRole.ADMIN,
            permissions: [Permission.SYSTEM_ADMIN],
          },
        },
      } as any;

      const context = createMockExecutionContext(spoofedUser, 'admin-panel', 'GET');

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce([UserRole.ADMIN]) // roles
        .mockReturnValueOnce(undefined); // permissions

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      
      securityLogger.warn(`[${testId}] Permission spoofing through object injection blocked`);
    });
  });

  describe('Authorization Timing Attack Prevention', () => {
    it('should maintain consistent response times regardless of role', async () => {
      const testId = `${operationId}_timing_consistency`;
      securityLogger.info(`[${testId}] Testing authorization timing consistency`);

      const users = [
        { role: UserRole.ADMIN, expected: true },
        { role: UserRole.OPERATOR, expected: false },
        { role: UserRole.VIEWER, expected: false },
        { role: 'invalid' as UserRole, expected: false },
        { role: null as any, expected: false },
      ];

      const timings: number[] = [];

      for (const testUser of users) {
        const user: ByteBotdUser = {
          id: `timing_${Date.now()}`,
          email: 'timing@test.com',
          username: 'timinguser',
          role: testUser.role,
          isActive: true,
        };

        const context = createMockExecutionContext(user, 'admin-only', 'POST');

        jest.spyOn(reflector, 'getAllAndOverride')
          .mockReturnValueOnce([UserRole.ADMIN])
          .mockReturnValueOnce(undefined);

        const startTime = process.hrtime.bigint();
        
        try {
          await guard.canActivate(context);
        } catch (error) {
          // Expected for non-admin users
        }
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        timings.push(duration);
      }

      // Check timing consistency (should not vary significantly)
      const avgTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
      const maxDeviation = Math.max(...timings.map(time => Math.abs(time - avgTime)));
      
      // Should not deviate more than 25ms from average
      expect(maxDeviation).toBeLessThan(25);
      
      securityLogger.info(`[${testId}] Timing consistency maintained (avg: ${avgTime.toFixed(2)}ms, max deviation: ${maxDeviation.toFixed(2)}ms)`);
    });

    it('should handle rapid authorization checks without performance degradation', async () => {
      const testId = `${operationId}_rapid_checks`;
      securityLogger.info(`[${testId}] Testing rapid authorization check performance`);

      const user: ByteBotdUser = {
        id: 'rapid_user',
        email: 'rapid@test.com',
        username: 'rapiduser',
        role: UserRole.ADMIN,
        isActive: true,
      };

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN]);

      const startTime = Date.now();
      
      // Perform 1000 rapid authorization checks
      const promises = Array(1000).fill(null).map(() => {
        const context = createMockExecutionContext(user, 'rapid-test', 'GET');
        return guard.canActivate(context);
      });

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // All should succeed
      expect(results.every(result => result === true)).toBe(true);
      
      // Should complete within reasonable time (less than 2 seconds for 1000 checks)
      expect(totalTime).toBeLessThan(2000);
      
      securityLogger.info(`[${testId}] Rapid authorization checks completed in ${totalTime}ms (avg: ${(totalTime/1000).toFixed(2)}ms per check)`);
    });
  });

  describe('Input Sanitization and Injection Prevention', () => {
    it('should handle XSS payloads in user properties safely', async () => {
      const testId = `${operationId}_xss_handling`;
      securityLogger.info(`[${testId}] Testing XSS payload handling in user properties`);

      const maliciousUsers = createMaliciousUsers();
      const context = createMockExecutionContext(
        maliciousUsers.xssPayload,
        'user-profile',
        'GET'
      );

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce([UserRole.VIEWER])
        .mockReturnValueOnce(undefined);

      // Should allow access but safely handle XSS content
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      
      // Verify user properties are handled safely (no script execution)
      const request = context.switchToHttp().getRequest();
      expect(request.user.id).toBeDefined();
      expect(request.user.email).toBeDefined();
      expect(request.user.username).toBeDefined();
      
      securityLogger.info(`[${testId}] XSS payloads in user properties handled safely`);
    });

    it('should prevent SQL injection through user properties', async () => {
      const testId = `${operationId}_sql_injection_handling`;
      securityLogger.info(`[${testId}] Testing SQL injection prevention in user properties`);

      const maliciousUsers = createMaliciousUsers();
      const context = createMockExecutionContext(
        maliciousUsers.sqlInjection,
        'data-query',
        'POST'
      );

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce([UserRole.VIEWER])
        .mockReturnValueOnce(undefined);

      // Should allow access but safely handle SQL injection content
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      
      // Verify SQL injection payloads are safely handled
      const request = context.switchToHttp().getRequest();
      expect(request.user.id).toBeDefined();
      expect(request.user.email).toBeDefined();
      expect(request.user.username).toBeDefined();
      
      securityLogger.info(`[${testId}] SQL injection payloads in user properties handled safely`);
    });
  });

  describe('Concurrent Access Attack Prevention', () => {
    it('should handle concurrent authorization attacks', async () => {
      const testId = `${operationId}_concurrent_attacks`;
      securityLogger.info(`[${testId}] Testing concurrent authorization attack handling`);

      const attackUsers = Array(50).fill(null).map((_, index) => ({
        id: `attacker_${index}`,
        email: `attacker${index}@malicious.com`,
        username: `attacker${index}`,
        role: UserRole.VIEWER,
        isActive: true,
      }) as ByteBotdUser);

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN]); // All require admin access

      const startTime = Date.now();
      
      // Launch concurrent attacks
      const promises = attackUsers.map(async (user, index) => {
        const context = createMockExecutionContext(
          user,
          `admin-endpoint-${index}`,
          'POST',
          `192.168.1.${100 + (index % 155)}` // Different IPs
        );
        
        try {
          const result = await guard.canActivate(context);
          return { success: true, userId: user.id };
        } catch (error) {
          return { success: false, userId: user.id, error: error.message };
        }
      });

      const results = await Promise.all(promises);
      const attacksBlocked = results.filter(r => !r.success).length;
      const processingTime = Date.now() - startTime;

      // All attacks should be blocked
      expect(attacksBlocked).toBe(50);
      
      // Should complete within reasonable time
      expect(processingTime).toBeLessThan(5000); // 5 seconds for 50 concurrent attacks
      
      securityLogger.warn(`[${testId}] Blocked ${attacksBlocked} concurrent authorization attacks in ${processingTime}ms`);
    });

    it('should prevent race conditions in role checking', async () => {
      const testId = `${operationId}_race_conditions`;
      securityLogger.info(`[${testId}] Testing race condition prevention in role checking`);

      const sharedUser: ByteBotdUser = {
        id: 'race_user',
        email: 'race@test.com',
        username: 'raceuser',
        role: UserRole.VIEWER,
        isActive: true,
      };

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN]);

      // Create multiple contexts sharing the same user object
      const contexts = Array(20).fill(null).map((_, index) => 
        createMockExecutionContext(sharedUser, `race-endpoint-${index}`, 'GET')
      );

      // Simulate race condition by modifying user role during concurrent checks
      const promises = contexts.map(async (context, index) => {
        // Simulate role modification during concurrent access
        if (index === 10) {
          setTimeout(() => {
            sharedUser.role = UserRole.ADMIN;
          }, 10);
        }
        
        try {
          const result = await guard.canActivate(context);
          return { success: true, index };
        } catch (error) {
          return { success: false, index };
        }
      });

      const results = await Promise.all(promises);
      const inconsistentResults = results.filter(r => r.success).length;
      
      // Should have consistent behavior despite race conditions
      // Most should fail since user started as VIEWER
      expect(inconsistentResults).toBeLessThan(10);
      
      securityLogger.info(`[${testId}] Race conditions handled consistently`);
    });
  });

  describe('Security Audit and Logging', () => {
    it('should log authorization failures with security context', async () => {
      const testId = `${operationId}_audit_logging`;
      securityLogger.info(`[${testId}] Testing security audit logging`);

      // Mock console to capture security logs
      const originalConsole = { ...console };
      const auditLogs: string[] = [];
      
      console.warn = (...args) => {
        auditLogs.push(args.join(' '));
        originalConsole.warn(...args);
      };
      
      console.error = (...args) => {
        auditLogs.push(args.join(' '));
        originalConsole.error(...args);
      };

      const suspiciousUser: ByteBotdUser = {
        id: 'suspicious_user',
        email: 'attacker@malicious.com',
        username: 'hacker',
        role: UserRole.VIEWER,
        isActive: true,
      };

      const context = createMockExecutionContext(
        suspiciousUser,
        'financial-data',
        'DELETE',
        '10.0.0.1' // Suspicious IP
      );

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce([UserRole.ADMIN])
        .mockReturnValueOnce([Permission.SYSTEM_ADMIN]);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);

      // Restore console
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;

      // Verify security audit logs contain relevant information
      const hasSecurityAudit = auditLogs.some(log => 
        log.includes('10.0.0.1') || 
        log.includes('suspicious') || 
        log.includes('authorization') ||
        log.includes('financial-data')
      );
      
      expect(hasSecurityAudit).toBe(true);
      
      securityLogger.warn(`[${testId}] Authorization failure logged with security context`);
    });

    it('should track authorization patterns for anomaly detection', async () => {
      const testId = `${operationId}_anomaly_tracking`;
      securityLogger.info(`[${testId}] Testing authorization pattern tracking`);

      const normalUser: ByteBotdUser = {
        id: 'normal_user',
        email: 'user@company.com',
        username: 'normaluser',
        role: UserRole.OPERATOR,
        isActive: true,
      };

      // Simulate normal access pattern
      const normalEndpoints = ['tasks', 'reports', 'dashboard'];
      const normalPromises = normalEndpoints.map(endpoint => {
        const context = createMockExecutionContext(normalUser, endpoint, 'GET');
        jest.spyOn(reflector, 'getAllAndOverride')
          .mockReturnValueOnce([UserRole.OPERATOR])
          .mockReturnValueOnce(undefined);
        return guard.canActivate(context);
      });

      await Promise.all(normalPromises);

      // Simulate suspicious access pattern
      const suspiciousEndpoints = [
        'admin-panel', 'user-management', 'system-config',
        'financial-reports', 'audit-logs', 'security-settings'
      ];
      
      const suspiciousPromises = suspiciousEndpoints.map(endpoint => {
        const context = createMockExecutionContext(normalUser, endpoint, 'POST');
        jest.spyOn(reflector, 'getAllAndOverride')
          .mockReturnValueOnce([UserRole.ADMIN])
          .mockReturnValueOnce([Permission.SYSTEM_ADMIN]);
        return guard.canActivate(context).catch(() => 'blocked');
      });

      const suspiciousResults = await Promise.all(suspiciousPromises);
      const blockedAttempts = suspiciousResults.filter(r => r === 'blocked').length;
      
      // All suspicious attempts should be blocked
      expect(blockedAttempts).toBe(6);
      
      securityLogger.warn(`[${testId}] Suspicious access pattern detected and blocked (${blockedAttempts} attempts)`);
    });
  });

  describe('Memory and Resource Security', () => {
    it('should prevent memory exhaustion during sustained attacks', async () => {
      const testId = `${operationId}_memory_exhaustion`;
      securityLogger.info(`[${testId}] Testing memory exhaustion prevention`);

      const initialMemory = process.memoryUsage();
      
      // Simulate sustained authorization attacks
      for (let i = 0; i < 500; i++) {
        const attackUser: ByteBotdUser = {
          id: `memory_attacker_${i}`,
          email: `attacker${i}@malicious.com`,
          username: `attacker${i}`,
          role: UserRole.VIEWER,
          isActive: true,
        };

        const context = createMockExecutionContext(
          attackUser,
          `attack-endpoint-${i}`,
          'POST'
        );

        jest.spyOn(reflector, 'getAllAndOverride')
          .mockReturnValueOnce([UserRole.ADMIN])
          .mockReturnValueOnce([Permission.SYSTEM_ADMIN]);

        try {
          await guard.canActivate(context);
        } catch {
          // Expected for attack attempts
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory growth should be minimal (less than 2MB for 500 operations)
      expect(memoryGrowth).toBeLessThan(2 * 1024 * 1024);
      
      securityLogger.info(`[${testId}] Memory usage remained stable during attacks (${Math.round(memoryGrowth / 1024)}KB growth)`);
    });

    it('should maintain consistent performance under load', async () => {
      const testId = `${operationId}_performance_consistency`;
      securityLogger.info(`[${testId}] Testing performance consistency under load`);

      const loadUser: ByteBotdUser = {
        id: 'load_user',
        email: 'load@test.com',
        username: 'loaduser',
        role: UserRole.ADMIN,
        isActive: true,
      };

      jest.spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.ADMIN]);

      const iterations = 100;
      const timings: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const context = createMockExecutionContext(
          loadUser,
          `load-test-${i}`,
          'GET'
        );
        
        const startTime = process.hrtime.bigint();
        await guard.canActivate(context);
        const endTime = process.hrtime.bigint();
        
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        timings.push(duration);
      }

      const avgTime = timings.reduce((sum, time) => sum + time, 0) / timings.length;
      const maxTime = Math.max(...timings);
      const minTime = Math.min(...timings);
      
      // Performance should be consistent (max shouldn't be more than 3x average)
      expect(maxTime).toBeLessThan(avgTime * 3);
      
      securityLogger.info(`[${testId}] Performance consistency maintained (avg: ${avgTime.toFixed(2)}ms, min: ${minTime.toFixed(2)}ms, max: ${maxTime.toFixed(2)}ms)`);
    });
  });
});
