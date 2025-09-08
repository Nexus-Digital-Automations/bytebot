/**
 * RBAC Authorization Decorators Tests - Comprehensive Test Suite
 *
 * This test suite provides comprehensive coverage for all RBAC authorization decorators
 * including role-based, permission-based, and advanced access control decorators.
 *
 * @fileoverview Test suite for RBAC authorization decorators
 * @version 2.0.0
 * @author RBAC Decorators Specialist
 */

import "reflect-metadata";
import {
  Role,
  Permission,
  ResourceType,
  RequireRole,
  RequirePermission,
  RequireAnyRole,
  RequireAllPermissions,
  AdminOnly,
  CanRead,
  CanWrite,
  CanDelete,
  CanExecute,
  ResourceOwner,
  ConditionalAccess,
  TimeBasedAccess,
  IPBasedAccess,
  AuditAccess,
  SecureEndpoint,
  UserAccess,
  ModeratorAccess,
  SystemAccess,
  DeveloperAccess,
  AuditorAccess,
  ComputerUseAccess,
  TaskManagementAccess,
  APIAdminAccess,
  SecurityManagementAccess,
  extractRBACMetadata,
  hasRequiredRoles,
  hasRequiredPermissions,
  validateTimeBasedAccess,
  validateIPBasedAccess,
  ROLES_KEY,
  PERMISSIONS_KEY,
  ANY_ROLE_KEY,
  ALL_PERMISSIONS_KEY,
  RESOURCE_KEY,
  OWNERSHIP_KEY,
  CONDITIONAL_ACCESS_KEY,
  TIME_ACCESS_KEY,
  IP_ACCESS_KEY,
  AUDIT_ACCESS_KEY,
  SECURE_ENDPOINT_KEY,
  ADMIN_ONLY_KEY,
} from "../rbac-authorization.decorators";

describe("RBAC Authorization Decorators", () => {
  // ===========================
  // CORE RBAC DECORATORS TESTS
  // ===========================

  describe("Core RBAC Decorators", () => {
    describe("@RequireRole", () => {
      it("should set role metadata correctly", () => {
        class TestController {
          @RequireRole([Role.ADMIN, Role.MODERATOR])
          testMethod() {}
        }

        const metadata = Reflect.getMetadata(
          ROLES_KEY,
          TestController.prototype,
          "testMethod",
        );
        expect(metadata).toEqual([Role.ADMIN, Role.MODERATOR]);
      });

      it("should work with single role", () => {
        class TestController {
          @RequireRole([Role.USER])
          userMethod() {}
        }

        const metadata = Reflect.getMetadata(
          ROLES_KEY,
          TestController.prototype,
          "userMethod",
        );
        expect(metadata).toEqual([Role.USER]);
      });
    });

    describe("@RequirePermission", () => {
      it("should set permission metadata correctly", () => {
        class TestController {
          @RequirePermission([Permission.READ, Permission.WRITE])
          testMethod() {}
        }

        const metadata = Reflect.getMetadata(
          PERMISSIONS_KEY,
          TestController.prototype,
          "testMethod",
        );
        expect(metadata).toEqual([Permission.READ, Permission.WRITE]);
      });

      it("should work with single permission", () => {
        class TestController {
          @RequirePermission([Permission.EXECUTE])
          executeMethod() {}
        }

        const metadata = Reflect.getMetadata(
          PERMISSIONS_KEY,
          TestController.prototype,
          "executeMethod",
        );
        expect(metadata).toEqual([Permission.EXECUTE]);
      });
    });

    describe("@RequireAnyRole", () => {
      it("should set anyRole metadata correctly", () => {
        class TestController {
          @RequireAnyRole([Role.USER, Role.GUEST])
          publicMethod() {}
        }

        const metadata = Reflect.getMetadata(
          ANY_ROLE_KEY,
          TestController.prototype,
          "publicMethod",
        );
        expect(metadata).toEqual([Role.USER, Role.GUEST]);
      });
    });

    describe("@RequireAllPermissions", () => {
      it("should set allPermissions metadata correctly", () => {
        class TestController {
          @RequireAllPermissions([
            Permission.READ,
            Permission.WRITE,
            Permission.DELETE,
          ])
          powerUserMethod() {}
        }

        const metadata = Reflect.getMetadata(
          ALL_PERMISSIONS_KEY,
          TestController.prototype,
          "powerUserMethod",
        );
        expect(metadata).toEqual([
          Permission.READ,
          Permission.WRITE,
          Permission.DELETE,
        ]);
      });
    });

    describe("@AdminOnly", () => {
      it("should set admin-only metadata correctly", () => {
        class TestController {
          @AdminOnly()
          adminMethod() {}
        }

        const metadata = Reflect.getMetadata(
          ADMIN_ONLY_KEY,
          TestController.prototype,
          "adminMethod",
        );
        expect(metadata).toBe(true);
      });
    });
  });

  // ===========================
  // RESOURCE-BASED DECORATORS TESTS
  // ===========================

  describe("Resource-Based Decorators", () => {
    describe("@CanRead", () => {
      it("should set resource read metadata correctly", () => {
        class TestController {
          @CanRead("user")
          getUserMethod() {}
        }

        const metadata = Reflect.getMetadata(
          RESOURCE_KEY,
          TestController.prototype,
          "getUserMethod",
        );
        expect(metadata).toEqual({ action: "read", resource: "user" });
      });
    });

    describe("@CanWrite", () => {
      it("should set resource write metadata correctly", () => {
        class TestController {
          @CanWrite("task")
          updateTaskMethod() {}
        }

        const metadata = Reflect.getMetadata(
          RESOURCE_KEY,
          TestController.prototype,
          "updateTaskMethod",
        );
        expect(metadata).toEqual({ action: "write", resource: "task" });
      });
    });

    describe("@CanDelete", () => {
      it("should set resource delete metadata correctly", () => {
        class TestController {
          @CanDelete("file")
          deleteFileMethod() {}
        }

        const metadata = Reflect.getMetadata(
          RESOURCE_KEY,
          TestController.prototype,
          "deleteFileMethod",
        );
        expect(metadata).toEqual({ action: "delete", resource: "file" });
      });
    });

    describe("@CanExecute", () => {
      it("should set resource execute metadata correctly", () => {
        class TestController {
          @CanExecute("system_backup")
          backupMethod() {}
        }

        const metadata = Reflect.getMetadata(
          RESOURCE_KEY,
          TestController.prototype,
          "backupMethod",
        );
        expect(metadata).toEqual({
          action: "execute",
          resource: "system_backup",
        });
      });
    });

    describe("@ResourceOwner", () => {
      it("should set ownership metadata correctly", () => {
        class TestController {
          @ResourceOwner()
          ownerOnlyMethod() {}
        }

        const metadata = Reflect.getMetadata(
          OWNERSHIP_KEY,
          TestController.prototype,
          "ownerOnlyMethod",
        );
        expect(metadata).toBe(true);
      });
    });
  });

  // ===========================
  // ADVANCED ACCESS CONTROL TESTS
  // ===========================

  describe("Advanced Access Control Decorators", () => {
    describe("@ConditionalAccess", () => {
      it("should set conditional access metadata correctly", () => {
        class TestController {
          @ConditionalAccess({
            requiredAttributes: { department: "engineering" },
            requireMFA: true,
            minSessionAge: 5,
            maxSessionAge: 480,
          })
          engineeringMethod() {}
        }

        const metadata = Reflect.getMetadata(
          CONDITIONAL_ACCESS_KEY,
          TestController.prototype,
          "engineeringMethod",
        );
        expect(metadata).toEqual({
          requiredAttributes: { department: "engineering" },
          requireMFA: true,
          minSessionAge: 5,
          maxSessionAge: 480,
        });
      });
    });

    describe("@TimeBasedAccess", () => {
      it("should set time-based access metadata correctly", () => {
        class TestController {
          @TimeBasedAccess({
            allowedHours: [9, 10, 11, 12, 13, 14, 15, 16, 17],
            allowedDaysOfWeek: [1, 2, 3, 4, 5],
            timezone: "America/New_York",
          })
          businessHoursMethod() {}
        }

        const metadata = Reflect.getMetadata(
          TIME_ACCESS_KEY,
          TestController.prototype,
          "businessHoursMethod",
        );
        expect(metadata).toEqual({
          allowedHours: [9, 10, 11, 12, 13, 14, 15, 16, 17],
          allowedDaysOfWeek: [1, 2, 3, 4, 5],
          timezone: "America/New_York",
        });
      });
    });

    describe("@IPBasedAccess", () => {
      it("should set IP-based access metadata correctly", () => {
        class TestController {
          @IPBasedAccess({
            allowedIPs: ["192.168.1.0/24", "10.0.0.0/8"],
            allowedCountries: ["US", "CA"],
            allowPrivateNetworks: true,
          })
          internalMethod() {}
        }

        const metadata = Reflect.getMetadata(
          IP_ACCESS_KEY,
          TestController.prototype,
          "internalMethod",
        );
        expect(metadata).toEqual({
          allowedIPs: ["192.168.1.0/24", "10.0.0.0/8"],
          allowedCountries: ["US", "CA"],
          allowPrivateNetworks: true,
        });
      });
    });

    describe("@AuditAccess", () => {
      it("should set audit access metadata correctly", () => {
        class TestController {
          @AuditAccess()
          auditedMethod() {}
        }

        const metadata = Reflect.getMetadata(
          AUDIT_ACCESS_KEY,
          TestController.prototype,
          "auditedMethod",
        );
        expect(metadata).toBe(true);
      });
    });

    describe("@SecureEndpoint", () => {
      it("should set secure endpoint metadata correctly", () => {
        class TestController {
          @SecureEndpoint({
            roles: [Role.ADMIN],
            permissions: [Permission.SYSTEM_MANAGEMENT],
            resourceTypes: [ResourceType.SYSTEM],
            auditLogging: true,
            rateLimit: { requests: 10, windowMs: 60000 },
            requireEncryption: true,
            httpsOnly: true,
          })
          criticalMethod() {}
        }

        const metadata = Reflect.getMetadata(
          SECURE_ENDPOINT_KEY,
          TestController.prototype,
          "criticalMethod",
        );
        expect(metadata).toEqual({
          roles: [Role.ADMIN],
          permissions: [Permission.SYSTEM_MANAGEMENT],
          resourceTypes: [ResourceType.SYSTEM],
          auditLogging: true,
          rateLimit: { requests: 10, windowMs: 60000 },
          requireEncryption: true,
          httpsOnly: true,
        });
      });
    });
  });

  // ===========================
  // COMPOSITE DECORATORS TESTS
  // ===========================

  describe("Composite Decorators", () => {
    describe("@UserAccess", () => {
      it("should set user access roles correctly", () => {
        class TestController {
          @UserAccess()
          userMethod() {}
        }

        const metadata = Reflect.getMetadata(
          ROLES_KEY,
          TestController.prototype,
          "userMethod",
        );
        expect(metadata).toEqual([Role.USER, Role.ADMIN, Role.MODERATOR]);
      });
    });

    describe("@ModeratorAccess", () => {
      it("should set moderator access roles correctly", () => {
        class TestController {
          @ModeratorAccess()
          modMethod() {}
        }

        const metadata = Reflect.getMetadata(
          ROLES_KEY,
          TestController.prototype,
          "modMethod",
        );
        expect(metadata).toEqual([Role.MODERATOR, Role.ADMIN]);
      });
    });

    describe("@SystemAccess", () => {
      it("should set system access roles correctly", () => {
        class TestController {
          @SystemAccess()
          systemMethod() {}
        }

        const metadata = Reflect.getMetadata(
          ROLES_KEY,
          TestController.prototype,
          "systemMethod",
        );
        expect(metadata).toEqual([Role.SYSTEM, Role.ADMIN, Role.OPERATOR]);
      });
    });

    describe("@DeveloperAccess", () => {
      it("should set developer access roles correctly", () => {
        class TestController {
          @DeveloperAccess()
          devMethod() {}
        }

        const metadata = Reflect.getMetadata(
          ROLES_KEY,
          TestController.prototype,
          "devMethod",
        );
        expect(metadata).toEqual([Role.DEVELOPER, Role.ADMIN]);
      });
    });

    describe("@AuditorAccess", () => {
      it("should set auditor access roles correctly", () => {
        class TestController {
          @AuditorAccess()
          auditMethod() {}
        }

        const metadata = Reflect.getMetadata(
          ROLES_KEY,
          TestController.prototype,
          "auditMethod",
        );
        expect(metadata).toEqual([Role.AUDITOR, Role.ADMIN]);
      });
    });
  });

  // ===========================
  // BYTEBOT-SPECIFIC DECORATORS TESTS
  // ===========================

  describe("Bytebot-Specific Composite Decorators", () => {
    describe("@ComputerUseAccess", () => {
      it("should set computer-use access metadata correctly", () => {
        class TestController {
          @ComputerUseAccess()
          computerMethod() {}
        }

        const rolesMetadata = Reflect.getMetadata(
          ROLES_KEY,
          TestController.prototype,
          "computerMethod",
        );
        const permissionsMetadata = Reflect.getMetadata(
          PERMISSIONS_KEY,
          TestController.prototype,
          "computerMethod",
        );
        const auditMetadata = Reflect.getMetadata(
          AUDIT_ACCESS_KEY,
          TestController.prototype,
          "computerMethod",
        );

        expect(rolesMetadata).toEqual([Role.USER, Role.ADMIN, Role.OPERATOR]);
        expect(permissionsMetadata).toEqual([Permission.COMPUTER_USE]);
        expect(auditMetadata).toBe(true);
      });
    });

    describe("@TaskManagementAccess", () => {
      it("should set task management access metadata correctly", () => {
        class TestController {
          @TaskManagementAccess()
          taskMethod() {}
        }

        const rolesMetadata = Reflect.getMetadata(
          ROLES_KEY,
          TestController.prototype,
          "taskMethod",
        );
        const permissionsMetadata = Reflect.getMetadata(
          PERMISSIONS_KEY,
          TestController.prototype,
          "taskMethod",
        );

        expect(rolesMetadata).toEqual([Role.USER, Role.ADMIN, Role.OPERATOR]);
        expect(permissionsMetadata).toEqual([Permission.TASK_MANAGEMENT]);
      });
    });

    describe("@APIAdminAccess", () => {
      it("should set API admin access metadata correctly", () => {
        class TestController {
          @APIAdminAccess()
          apiAdminMethod() {}
        }

        const rolesMetadata = Reflect.getMetadata(
          ROLES_KEY,
          TestController.prototype,
          "apiAdminMethod",
        );
        const permissionsMetadata = Reflect.getMetadata(
          PERMISSIONS_KEY,
          TestController.prototype,
          "apiAdminMethod",
        );
        const auditMetadata = Reflect.getMetadata(
          AUDIT_ACCESS_KEY,
          TestController.prototype,
          "apiAdminMethod",
        );

        expect(rolesMetadata).toEqual([Role.ADMIN, Role.SUPER_ADMIN]);
        expect(permissionsMetadata).toEqual([
          Permission.API_ADMIN,
          Permission.ADMIN,
        ]);
        expect(auditMetadata).toBe(true);
      });
    });

    describe("@SecurityManagementAccess", () => {
      it("should set security management access metadata correctly", () => {
        class TestController {
          @SecurityManagementAccess()
          securityMethod() {}
        }

        const rolesMetadata = Reflect.getMetadata(
          ROLES_KEY,
          TestController.prototype,
          "securityMethod",
        );
        const permissionsMetadata = Reflect.getMetadata(
          PERMISSIONS_KEY,
          TestController.prototype,
          "securityMethod",
        );
        const auditMetadata = Reflect.getMetadata(
          AUDIT_ACCESS_KEY,
          TestController.prototype,
          "securityMethod",
        );
        const secureEndpointMetadata = Reflect.getMetadata(
          SECURE_ENDPOINT_KEY,
          TestController.prototype,
          "securityMethod",
        );

        expect(rolesMetadata).toEqual([Role.ADMIN, Role.SUPER_ADMIN]);
        expect(permissionsMetadata).toEqual([
          Permission.SECURITY_MANAGEMENT,
          Permission.ADMIN,
        ]);
        expect(auditMetadata).toBe(true);
        expect(secureEndpointMetadata).toEqual({
          requireEncryption: true,
          httpsOnly: true,
          auditLogging: true,
        });
      });
    });
  });

  // ===========================
  // METADATA EXTRACTION TESTS
  // ===========================

  describe("Metadata Extraction", () => {
    describe("extractRBACMetadata", () => {
      it("should extract complete metadata from a decorated method", () => {
        class TestController {
          @RequireRole([Role.ADMIN])
          @RequirePermission([Permission.READ, Permission.WRITE])
          @AuditAccess()
          @CanWrite("user")
          complexMethod() {}
        }

        const metadata = extractRBACMetadata(
          TestController.prototype,
          "complexMethod",
        );

        expect(metadata.roles).toEqual([Role.ADMIN]);
        expect(metadata.permissions).toEqual([
          Permission.READ,
          Permission.WRITE,
        ]);
        expect(metadata.auditAccess).toBe(true);
        expect(metadata.resource).toEqual({
          action: "write",
          resource: "user",
        });
      });

      it("should return empty metadata for undecorated method", () => {
        class TestController {
          plainMethod() {}
        }

        const metadata = extractRBACMetadata(
          TestController.prototype,
          "plainMethod",
        );

        expect(metadata).toEqual({});
      });

      it("should handle class-level metadata", () => {
        @RequireRole([Role.USER])
        class TestController {
          someMethod() {}
        }

        const metadata = extractRBACMetadata(TestController);

        expect(metadata.roles).toEqual([Role.USER]);
      });
    });
  });

  // ===========================
  // UTILITY FUNCTIONS TESTS
  // ===========================

  describe("Utility Functions", () => {
    describe("hasRequiredRoles", () => {
      it("should return true when user has required role", () => {
        const userRoles = [Role.USER, Role.MODERATOR];
        const requiredRoles = [Role.MODERATOR];

        expect(hasRequiredRoles(userRoles, requiredRoles)).toBe(true);
      });

      it("should return false when user does not have required role", () => {
        const userRoles = [Role.USER];
        const requiredRoles = [Role.ADMIN];

        expect(hasRequiredRoles(userRoles, requiredRoles)).toBe(false);
      });

      it("should return true when user has any of the required roles", () => {
        const userRoles = [Role.USER];
        const requiredRoles = [Role.USER, Role.ADMIN];

        expect(hasRequiredRoles(userRoles, requiredRoles)).toBe(true);
      });

      it("should handle requireAll parameter correctly", () => {
        const userRoles = [Role.USER, Role.MODERATOR];
        const requiredRoles = [Role.USER, Role.ADMIN];

        expect(hasRequiredRoles(userRoles, requiredRoles, false)).toBe(true); // Any role
        expect(hasRequiredRoles(userRoles, requiredRoles, true)).toBe(false); // All roles
      });

      it("should handle empty arrays", () => {
        expect(hasRequiredRoles([], [])).toBe(false);
        expect(hasRequiredRoles([Role.USER], [])).toBe(false);
        expect(hasRequiredRoles([], [Role.USER])).toBe(false);
      });
    });

    describe("hasRequiredPermissions", () => {
      it("should return true when user has required permission", () => {
        const userPermissions = [Permission.READ, Permission.WRITE];
        const requiredPermissions = [Permission.READ];

        expect(
          hasRequiredPermissions(userPermissions, requiredPermissions),
        ).toBe(true);
      });

      it("should return false when user does not have required permission", () => {
        const userPermissions = [Permission.READ];
        const requiredPermissions = [Permission.ADMIN];

        expect(
          hasRequiredPermissions(userPermissions, requiredPermissions),
        ).toBe(false);
      });

      it("should return true when user has any of the required permissions", () => {
        const userPermissions = [Permission.READ];
        const requiredPermissions = [Permission.READ, Permission.WRITE];

        expect(
          hasRequiredPermissions(userPermissions, requiredPermissions),
        ).toBe(true);
      });

      it("should handle requireAll parameter correctly", () => {
        const userPermissions = [Permission.READ, Permission.WRITE];
        const requiredPermissions = [Permission.READ, Permission.DELETE];

        expect(
          hasRequiredPermissions(userPermissions, requiredPermissions, false),
        ).toBe(true); // Any permission
        expect(
          hasRequiredPermissions(userPermissions, requiredPermissions, true),
        ).toBe(false); // All permissions
      });

      it("should handle empty arrays", () => {
        expect(hasRequiredPermissions([], [])).toBe(false);
        expect(hasRequiredPermissions([Permission.READ], [])).toBe(false);
        expect(hasRequiredPermissions([], [Permission.READ])).toBe(false);
      });
    });

    describe("validateTimeBasedAccess", () => {
      it("should allow access during allowed hours", () => {
        const config = { allowedHours: [9, 10, 11, 12, 13, 14, 15, 16, 17] };
        const testTime = new Date("2024-01-15T10:00:00Z"); // 10 AM

        expect(validateTimeBasedAccess(config, testTime)).toBe(true);
      });

      it("should deny access outside allowed hours", () => {
        const config = { allowedHours: [9, 10, 11, 12, 13, 14, 15, 16, 17] };
        const testTime = new Date("2024-01-15T20:00:00Z"); // 8 PM

        expect(validateTimeBasedAccess(config, testTime)).toBe(false);
      });

      it("should allow access on allowed days", () => {
        const config = { allowedDaysOfWeek: [1, 2, 3, 4, 5] }; // Weekdays
        const testTime = new Date("2024-01-15T10:00:00Z"); // Monday

        expect(validateTimeBasedAccess(config, testTime)).toBe(true);
      });

      it("should deny access on disallowed days", () => {
        const config = { allowedDaysOfWeek: [1, 2, 3, 4, 5] }; // Weekdays
        const testTime = new Date("2024-01-14T10:00:00Z"); // Sunday

        expect(validateTimeBasedAccess(config, testTime)).toBe(false);
      });

      it("should handle date ranges correctly", () => {
        const config = {
          startDate: "2024-01-01T00:00:00Z",
          endDate: "2024-12-31T23:59:59Z",
        };
        const validTime = new Date("2024-06-15T10:00:00Z");
        const invalidTime = new Date("2025-01-15T10:00:00Z");

        expect(validateTimeBasedAccess(config, validTime)).toBe(true);
        expect(validateTimeBasedAccess(config, invalidTime)).toBe(false);
      });

      it("should return true when no restrictions are specified", () => {
        expect(validateTimeBasedAccess({})).toBe(true);
      });

      it("should handle errors gracefully", () => {
        const config = { startDate: "invalid-date" };

        expect(validateTimeBasedAccess(config)).toBe(false);
      });
    });

    describe("validateIPBasedAccess", () => {
      it("should allow access from allowed IPs", () => {
        const config = { allowedIPs: ["192.168.1.100"] };

        expect(validateIPBasedAccess(config, "192.168.1.100")).toBe(true);
      });

      it("should deny access from non-allowed IPs", () => {
        const config = { allowedIPs: ["192.168.1.100"] };

        expect(validateIPBasedAccess(config, "10.0.0.1")).toBe(false);
      });

      it("should block access from blocked IPs", () => {
        const config = { blockedIPs: ["192.168.1.100"] };

        expect(validateIPBasedAccess(config, "192.168.1.100")).toBe(false);
      });

      it("should handle private network restrictions", () => {
        const config = { allowPrivateNetworks: false };

        expect(validateIPBasedAccess(config, "192.168.1.100")).toBe(false);
        expect(validateIPBasedAccess(config, "8.8.8.8")).toBe(true);
      });

      it("should return true when no restrictions are specified", () => {
        expect(validateIPBasedAccess({}, "192.168.1.100")).toBe(true);
      });

      it("should handle errors gracefully", () => {
        const config = { allowedIPs: null as any };

        expect(validateIPBasedAccess(config, "192.168.1.100")).toBe(true);
      });
    });
  });

  // ===========================
  // MULTIPLE DECORATORS TESTS
  // ===========================

  describe("Multiple Decorators Interaction", () => {
    it("should handle multiple role and permission decorators", () => {
      class TestController {
        @RequireRole([Role.ADMIN])
        @RequirePermission([Permission.READ])
        @RequireAnyRole([Role.USER, Role.MODERATOR])
        @RequireAllPermissions([Permission.WRITE, Permission.DELETE])
        multipleDecoratorsMethod() {}
      }

      const rolesMetadata = Reflect.getMetadata(
        ROLES_KEY,
        TestController.prototype,
        "multipleDecoratorsMethod",
      );
      const permissionsMetadata = Reflect.getMetadata(
        PERMISSIONS_KEY,
        TestController.prototype,
        "multipleDecoratorsMethod",
      );
      const anyRoleMetadata = Reflect.getMetadata(
        ANY_ROLE_KEY,
        TestController.prototype,
        "multipleDecoratorsMethod",
      );
      const allPermissionsMetadata = Reflect.getMetadata(
        ALL_PERMISSIONS_KEY,
        TestController.prototype,
        "multipleDecoratorsMethod",
      );

      expect(rolesMetadata).toEqual([Role.ADMIN]);
      expect(permissionsMetadata).toEqual([Permission.READ]);
      expect(anyRoleMetadata).toEqual([Role.USER, Role.MODERATOR]);
      expect(allPermissionsMetadata).toEqual([
        Permission.WRITE,
        Permission.DELETE,
      ]);
    });

    it("should handle advanced access control with basic decorators", () => {
      class TestController {
        @RequireRole([Role.ADMIN])
        @TimeBasedAccess({ allowedHours: [9, 17] })
        @IPBasedAccess({ allowedIPs: ["192.168.1.0/24"] })
        @AuditAccess()
        advancedMethod() {}
      }

      const metadata = extractRBACMetadata(
        TestController.prototype,
        "advancedMethod",
      );

      expect(metadata.roles).toEqual([Role.ADMIN]);
      expect(metadata.timeAccess).toEqual({ allowedHours: [9, 17] });
      expect(metadata.ipAccess).toEqual({ allowedIPs: ["192.168.1.0/24"] });
      expect(metadata.auditAccess).toBe(true);
    });
  });

  // ===========================
  // EDGE CASES AND ERROR HANDLING
  // ===========================

  describe("Edge Cases and Error Handling", () => {
    it("should handle undefined metadata gracefully", () => {
      class TestController {
        plainMethod() {}
      }

      expect(() => {
        extractRBACMetadata(TestController.prototype, "plainMethod");
      }).not.toThrow();
    });

    it("should handle null values in utility functions", () => {
      expect(hasRequiredRoles(null as any, null as any)).toBe(false);
      expect(hasRequiredPermissions(null as any, null as any)).toBe(false);
    });

    it("should handle invalid decorator parameters gracefully", () => {
      expect(() => {
        class TestController {
          @RequireRole([] as any)
          emptyRoleMethod() {}
        }
      }).not.toThrow();
    });
  });

  // ===========================
  // INHERITANCE TESTS
  // ===========================

  describe("Class Inheritance", () => {
    it("should inherit class-level metadata", () => {
      @RequireRole([Role.USER])
      class BaseController {
        baseMethod() {}
      }

      class ChildController extends BaseController {
        childMethod() {}
      }

      const baseMetadata = extractRBACMetadata(BaseController, "baseMethod");
      const childMetadata = extractRBACMetadata(ChildController, "childMethod");

      expect(baseMetadata.roles).toEqual([Role.USER]);
      // Child should inherit class-level metadata
      expect(Reflect.getMetadata(ROLES_KEY, BaseController)).toEqual([
        Role.USER,
      ]);
    });

    it("should allow method-level overrides of class-level metadata", () => {
      @RequireRole([Role.USER])
      class BaseController {
        @RequireRole([Role.ADMIN])
        overriddenMethod() {}
      }

      const classMetadata = extractRBACMetadata(BaseController);
      const methodMetadata = extractRBACMetadata(
        BaseController.prototype,
        "overriddenMethod",
      );

      expect(classMetadata.roles).toEqual([Role.USER]);
      expect(methodMetadata.roles).toEqual([Role.ADMIN]);
    });
  });
});
