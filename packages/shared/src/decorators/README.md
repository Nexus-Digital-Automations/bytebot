# RBAC Authorization Decorators - Bytebot Platform

This directory contains comprehensive role-based access control (RBAC) authorization decorators for the Bytebot platform. These decorators provide flexible, type-safe authorization patterns for NestJS controllers and methods.

## Overview

The RBAC decorator system provides:

- **Role-based authorization**: Control access based on user roles
- **Permission-based authorization**: Fine-grained permission control
- **Resource-based authorization**: Access control for specific resources and actions
- **Advanced access controls**: Time-based, IP-based, and conditional access
- **Composite decorators**: Pre-configured access patterns for common use cases
- **Bytebot-specific decorators**: Specialized decorators for Bytebot services

## Core Decorators

### Basic Role & Permission Control

```typescript
import { 
  RequireRole, 
  RequirePermission, 
  RequireAnyRole, 
  RequireAllPermissions,
  AdminOnly,
  Role,
  Permission 
} from '@bytebot/shared/server';

@Controller('users')
export class UsersController {
  // Require specific roles
  @RequireRole([Role.ADMIN, Role.MODERATOR])
  @Get('/admin')
  async getAdminUsers() {
    return this.userService.getAdminUsers();
  }

  // Require specific permissions
  @RequirePermission([Permission.READ, Permission.USER_MANAGEMENT])
  @Get('/:id')
  async getUser(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  // Require ANY of the specified roles
  @RequireAnyRole([Role.USER, Role.GUEST])
  @Get('/public')
  async getPublicData() {
    return this.userService.getPublicData();
  }

  // Require ALL specified permissions
  @RequireAllPermissions([Permission.WRITE, Permission.DELETE, Permission.USER_MANAGEMENT])
  @Delete('/:id')
  async deleteUser(@Param('id') id: string) {
    return this.userService.delete(id);
  }

  // Admin-only access
  @AdminOnly()
  @Post('/system/reset')
  async resetSystem() {
    return this.systemService.reset();
  }
}
```

### Resource-Based Access Control

```typescript
import { CanRead, CanWrite, CanDelete, CanExecute, ResourceOwner } from '@bytebot/shared/server';

@Controller('files')
export class FilesController {
  @CanRead('file')
  @Get('/:id')
  async getFile(@Param('id') id: string) {
    return this.fileService.get(id);
  }

  @CanWrite('file')
  @Put('/:id')
  async updateFile(@Param('id') id: string, @Body() data: UpdateFileDto) {
    return this.fileService.update(id, data);
  }

  @CanDelete('file')
  @Delete('/:id')
  async deleteFile(@Param('id') id: string) {
    return this.fileService.delete(id);
  }

  @CanExecute('file_processing')
  @Post('/:id/process')
  async processFile(@Param('id') id: string) {
    return this.fileService.process(id);
  }

  // Only resource owner can access
  @ResourceOwner()
  @Get('/:id/private')
  async getPrivateFile(@Param('id') id: string, @Req() req: Request) {
    return this.fileService.getPrivate(id, req.user.id);
  }
}
```

## Advanced Access Control

### Time-Based Access

```typescript
import { TimeBasedAccess } from '@bytebot/shared/server';

@Controller('payroll')
export class PayrollController {
  @TimeBasedAccess({
    allowedHours: [9, 10, 11, 12, 13, 14, 15, 16, 17], // 9 AM to 5 PM
    allowedDaysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
    timezone: 'America/New_York'
  })
  @Post('/process')
  async processPayroll() {
    return this.payrollService.process();
  }

  @TimeBasedAccess({
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z'
  })
  @Get('/annual-report')
  async getAnnualReport() {
    return this.reportService.getAnnual();
  }
}
```

### IP-Based Access

```typescript
import { IPBasedAccess } from '@bytebot/shared/server';

@Controller('internal')
export class InternalController {
  @IPBasedAccess({
    allowedIPs: ['192.168.1.0/24', '10.0.0.0/8'],
    allowedCountries: ['US', 'CA'],
    allowPrivateNetworks: true
  })
  @Get('/metrics')
  async getInternalMetrics() {
    return this.metricsService.getInternal();
  }

  @IPBasedAccess({
    blockedIPs: ['123.456.789.0'],
    allowedCountries: ['US']
  })
  @Post('/sensitive-operation')
  async performSensitiveOperation() {
    return this.operationService.performSensitive();
  }
}
```

### Conditional Access

```typescript
import { ConditionalAccess } from '@bytebot/shared/server';

@Controller('engineering')
export class EngineeringController {
  @ConditionalAccess({
    requiredAttributes: { department: 'engineering' },
    requireMFA: true,
    minSessionAge: 5,
    maxSessionAge: 480
  })
  @Get('/secrets')
  async getEngineeringSecrets() {
    return this.secretsService.getEngineering();
  }

  @ConditionalAccess({
    conditionFunction: 'hasValidSecurityClearance',
    requireMFA: true
  })
  @Post('/classified-operation')
  async performClassifiedOperation() {
    return this.operationService.performClassified();
  }
}
```

### Comprehensive Security

```typescript
import { SecureEndpoint, AuditAccess } from '@bytebot/shared/server';

@Controller('system')
export class SystemController {
  @SecureEndpoint({
    roles: [Role.ADMIN],
    permissions: [Permission.SYSTEM_MANAGEMENT],
    resourceTypes: [ResourceType.SYSTEM],
    auditLogging: true,
    rateLimit: { requests: 10, windowMs: 60000 },
    requireEncryption: true,
    httpsOnly: true
  })
  @Post('/critical-operation')
  async performCriticalOperation(@Body() data: CriticalOperationDto) {
    return this.systemService.performCritical(data);
  }

  @AuditAccess()
  @Post('/users/:id/permissions')
  async updateUserPermissions(@Param('id') id: string, @Body() permissions: Permission[]) {
    return this.userService.updatePermissions(id, permissions);
  }
}
```

## Composite Decorators

### Standard Access Levels

```typescript
import { 
  UserAccess, 
  ModeratorAccess, 
  SystemAccess, 
  DeveloperAccess, 
  AuditorAccess 
} from '@bytebot/shared/server';

@Controller('dashboard')
export class DashboardController {
  @UserAccess()
  @Get('/profile')
  async getProfile(@Req() req: Request) {
    return this.userService.getProfile(req.user.id);
  }

  @ModeratorAccess()
  @Delete('/posts/:id')
  async deletePost(@Param('id') id: string) {
    return this.postService.delete(id);
  }

  @SystemAccess()
  @Post('/health-check')
  async performHealthCheck() {
    return this.healthService.check();
  }

  @DeveloperAccess()
  @Get('/debug-info')
  async getDebugInfo() {
    return this.debugService.getInfo();
  }

  @AuditorAccess()
  @Get('/audit-logs')
  async getAuditLogs(@Query() filters: AuditFilterDto) {
    return this.auditService.getLogs(filters);
  }
}
```

## Bytebot-Specific Decorators

### Computer-Use Operations

```typescript
import { ComputerUseAccess } from '@bytebot/shared/server';

@Controller('computer')
export class ComputerController {
  @ComputerUseAccess()
  @Post('/click')
  async performClick(@Body() clickData: ClickActionDto) {
    return this.computerService.click(clickData);
  }

  @ComputerUseAccess()
  @Post('/type')
  async performType(@Body() typeData: TypeActionDto) {
    return this.computerService.type(typeData);
  }
}
```

### Task Management

```typescript
import { TaskManagementAccess } from '@bytebot/shared/server';

@Controller('tasks')
export class TasksController {
  @TaskManagementAccess()
  @Post()
  async createTask(@Body() taskData: CreateTaskDto) {
    return this.taskService.create(taskData);
  }

  @TaskManagementAccess()
  @Put('/:id')
  async updateTask(@Param('id') id: string, @Body() taskData: UpdateTaskDto) {
    return this.taskService.update(id, taskData);
  }
}
```

### API Administration

```typescript
import { APIAdminAccess, SecurityManagementAccess } from '@bytebot/shared/server';

@Controller('api-admin')
export class APIAdminController {
  @APIAdminAccess()
  @Put('/config')
  async updateAPIConfig(@Body() config: APIConfigDto) {
    return this.apiService.updateConfig(config);
  }

  @SecurityManagementAccess()
  @Post('/security/policies')
  async updateSecurityPolicies(@Body() policies: SecurityPolicyDto[]) {
    return this.securityService.updatePolicies(policies);
  }
}
```

## Multiple Decorators

You can combine multiple decorators for complex authorization requirements:

```typescript
@Controller('secure')
export class SecureController {
  @RequireRole([Role.ADMIN])
  @TimeBasedAccess({ allowedHours: [9, 17] })
  @IPBasedAccess({ allowedIPs: ['192.168.1.0/24'] })
  @AuditAccess()
  @ConditionalAccess({ requireMFA: true })
  @Post('/ultra-secure')
  async ultraSecureOperation(@Body() data: SecureOperationDto) {
    return this.secureService.performUltraSecure(data);
  }
}
```

## Class-Level Decorators

Apply decorators at the class level for controller-wide access control:

```typescript
@RequireRole([Role.USER])
@Controller('protected')
export class ProtectedController {
  @Get('/data')
  async getData() {
    // Inherits @RequireRole([Role.USER]) from class
    return this.dataService.getData();
  }

  @RequireRole([Role.ADMIN]) // Overrides class-level requirement
  @Get('/admin-data')
  async getAdminData() {
    return this.dataService.getAdminData();
  }
}
```

## Metadata Extraction

For custom guards and interceptors, you can extract metadata:

```typescript
import { extractRBACMetadata, extractMergedMetadata } from '@bytebot/shared/server';

@Injectable()
export class CustomAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const controller = context.getClass();

    // Extract method-level metadata
    const methodMetadata = extractRBACMetadata(handler);

    // Extract merged class and method metadata
    const mergedMetadata = extractMergedMetadata(controller, handler.name);

    // Custom authorization logic
    return this.performCustomAuthorization(mergedMetadata, context);
  }
}
```

## Utility Functions

```typescript
import { 
  hasRequiredRoles, 
  hasRequiredPermissions, 
  validateTimeBasedAccess,
  validateIPBasedAccess 
} from '@bytebot/shared/server';

// Check if user has required roles
const hasAccess = hasRequiredRoles(
  [Role.USER, Role.MODERATOR], 
  [Role.MODERATOR, Role.ADMIN],
  false // requireAll = false (any role is sufficient)
);

// Check if user has required permissions
const hasPermissions = hasRequiredPermissions(
  [Permission.READ, Permission.WRITE],
  [Permission.READ],
  false
);

// Validate time-based access
const timeValid = validateTimeBasedAccess({
  allowedHours: [9, 17],
  allowedDaysOfWeek: [1, 5]
});

// Validate IP-based access
const ipValid = validateIPBasedAccess({
  allowedIPs: ['192.168.1.100']
}, '192.168.1.100');
```

## Integration with Guards

To use these decorators, you'll need to implement corresponding guards:

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { extractRBACMetadata, Role, Permission } from '@bytebot/shared/server';

@Injectable()
export class RBACGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Extract RBAC metadata from decorators
    const metadata = extractRBACMetadata(
      context.getHandler(),
      context.getClass().prototype,
      context.getHandler().name
    );

    // Implement your authorization logic here
    return this.performAuthorization(user, metadata, request);
  }

  private performAuthorization(user: any, metadata: any, request: any): boolean {
    // Your custom authorization logic
    return true;
  }
}
```

## Types and Interfaces

The system includes comprehensive TypeScript types:

```typescript
import { 
  Role, 
  Permission, 
  ResourceType,
  UserContext,
  SecurityContext,
  AuthorizationResult,
  RBACMetadata 
} from '@bytebot/shared/server';

// Example usage in services
@Injectable()
export class AuthorizationService {
  async authorize(
    metadata: RBACMetadata, 
    context: SecurityContext
  ): Promise<AuthorizationResult> {
    // Your authorization implementation
    return {
      granted: true,
      reason: 'User has required permissions',
      context: {
        requiredRoles: metadata.roles,
        userRoles: context.user.roles
      },
      security: {
        riskLevel: 'low',
        auditRequired: metadata.auditAccess || false,
        requiresMonitoring: false
      },
      timing: {
        startTime: new Date(),
        endTime: new Date(),
        durationMs: 0
      }
    };
  }
}
```

## Testing

The decorators come with comprehensive test utilities:

```typescript
import { extractRBACMetadata } from '@bytebot/shared/server';

describe('MyController', () => {
  it('should have correct RBAC metadata', () => {
    const metadata = extractRBACMetadata(MyController.prototype, 'myMethod');
    
    expect(metadata.roles).toEqual([Role.ADMIN]);
    expect(metadata.permissions).toEqual([Permission.READ]);
    expect(metadata.auditAccess).toBe(true);
  });
});
```

## Best Practices

1. **Use specific decorators**: Prefer `@RequireRole([Role.ADMIN])` over generic patterns
2. **Combine decorators thoughtfully**: Only combine decorators that make business sense
3. **Document complex access patterns**: Add comments for non-obvious authorization combinations
4. **Test authorization thoroughly**: Include negative test cases for denied access
5. **Use class-level decorators for common patterns**: Apply base authorization at the controller level
6. **Leverage composite decorators**: Use pre-built patterns like `@UserAccess()` for common scenarios
7. **Implement proper error handling**: Provide clear error messages for authorization failures
8. **Monitor authorization patterns**: Track which decorators and patterns are most used
9. **Keep permissions granular**: Use specific permissions rather than broad admin-only patterns
10. **Validate metadata in tests**: Ensure decorators apply correct metadata

## Error Handling

When authorization fails, the system should provide clear feedback:

```typescript
@Injectable()
export class AuthorizationExceptionFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    response.status(403).json({
      statusCode: 403,
      timestamp: new Date().toISOString(),
      message: 'Access denied: Insufficient permissions',
      error: 'Forbidden'
    });
  }
}
```

This RBAC decorator system provides a comprehensive, type-safe, and flexible foundation for implementing role-based access control across all Bytebot microservices.