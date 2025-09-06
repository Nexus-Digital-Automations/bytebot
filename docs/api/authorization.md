# API Authorization

## Overview

Bytebot API implements Role-Based Access Control (RBAC) for fine-grained authorization management. The system supports hierarchical roles with granular permissions for different operations and resources.

## RBAC System Architecture

### Role Hierarchy

```
admin
├── system:admin         # Full system administration
├── system:monitor       # System monitoring and health
├── api:manage          # API management and configuration
└── api:access          # Basic API access

operator
├── task:execute        # Execute automation tasks
├── task:write          # Create and modify tasks
├── task:read           # View task status and results
├── computer:control    # Full computer control operations
└── computer:view       # View computer state only

viewer
├── task:read           # View task status only
├── computer:view       # View computer state only
└── api:access          # Basic API access

api-consumer
└── api:access          # Basic API access for external integrations
```

### Permission Matrix

| Resource | Action | admin | operator | viewer | api-consumer |
|----------|--------|-------|----------|--------|--------------|
| Tasks | Create | ✅ | ✅ | ❌ | ✅ |
| Tasks | Read | ✅ | ✅ | ✅ | ✅ |
| Tasks | Update | ✅ | ✅ | ❌ | ✅ |
| Tasks | Delete | ✅ | ✅ | ❌ | ❌ |
| Tasks | Execute | ✅ | ✅ | ❌ | ✅ |
| Computer | Control | ✅ | ✅ | ❌ | ✅ |
| Computer | View | ✅ | ✅ | ✅ | ✅ |
| System | Monitor | ✅ | ❌ | ❌ | ❌ |
| System | Configure | ✅ | ❌ | ❌ | ❌ |
| Users | Manage | ✅ | ❌ | ❌ | ❌ |
| API | Access | ✅ | ✅ | ✅ | ✅ |
| API | Manage | ✅ | ❌ | ❌ | ❌ |

## Implementation

### Permission Decorators

```typescript
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) => 
  SetMetadata(PERMISSIONS_KEY, permissions);

// Usage in controllers
@Controller('tasks')
export class TasksController {
  
  @Post()
  @RequirePermissions('task:write')
  async createTask(@Body() createTaskDto: CreateTaskDto) {
    // Implementation
  }

  @Get()
  @RequirePermissions('task:read')
  async getTasks(@Query() query: GetTasksDto) {
    // Implementation
  }

  @Post(':id/execute')
  @RequirePermissions('task:execute')
  async executeTask(@Param('id') id: string) {
    // Implementation
  }

  @Delete(':id')
  @RequirePermissions('task:write', 'task:delete')
  async deleteTask(@Param('id') id: string) {
    // Implementation
  }
}
```

### Authorization Guard

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermissions) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasPermission = requiredPermissions.every(permission => 
      user.permissions.includes(permission)
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
      );
    }

    return true;
  }
}
```

### User Permission Model

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  roles: Role[];
  permissions: string[];
  isActive: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isDefault: boolean;
  createdAt: Date;
}

interface Permission {
  id: string;
  resource: string;    // 'task', 'computer', 'system', 'api'
  action: string;      // 'read', 'write', 'execute', 'delete', 'admin'
  scope?: string;      // Optional scope limitation
  description: string;
}
```

## API Endpoints

### Role Management

#### List Roles

```http
GET /api/v1/roles
Authorization: Bearer <token>
```

**Response:**
```json
{
  "roles": [
    {
      "id": "role_admin",
      "name": "admin",
      "description": "Full system administration access",
      "permissions": [
        "system:admin", "system:monitor", "api:manage", "api:access",
        "task:read", "task:write", "task:execute", "task:delete",
        "computer:control", "computer:view"
      ],
      "userCount": 2,
      "isDefault": false
    },
    {
      "id": "role_operator",
      "name": "operator", 
      "description": "Task execution and computer control",
      "permissions": [
        "task:read", "task:write", "task:execute", 
        "computer:control", "computer:view", "api:access"
      ],
      "userCount": 15,
      "isDefault": true
    }
  ]
}
```

#### Create Role

```http
POST /api/v1/roles
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "custom-role",
  "description": "Custom role for specific team",
  "permissions": ["task:read", "task:write", "computer:view"]
}
```

#### Assign Role to User

```http
POST /api/v1/users/{userId}/roles
Authorization: Bearer <token>
Content-Type: application/json

{
  "roleId": "role_operator"
}
```

### Permission Checking

#### Check User Permissions

```http
GET /api/v1/auth/permissions
Authorization: Bearer <token>
```

**Response:**
```json
{
  "userId": "user_123",
  "username": "operator@example.com",
  "roles": ["operator"],
  "permissions": [
    "task:read", "task:write", "task:execute",
    "computer:control", "computer:view", "api:access"
  ],
  "effectivePermissions": {
    "tasks": {
      "canRead": true,
      "canWrite": true,
      "canExecute": true,
      "canDelete": false
    },
    "computer": {
      "canView": true,
      "canControl": true
    },
    "system": {
      "canMonitor": false,
      "canAdmin": false
    }
  }
}
```

#### Check Specific Permission

```http
POST /api/v1/auth/check-permission
Authorization: Bearer <token>
Content-Type: application/json

{
  "permission": "task:execute"
}
```

**Response:**
```json
{
  "hasPermission": true,
  "permission": "task:execute",
  "reason": "User has 'operator' role which includes 'task:execute' permission"
}
```

## Resource-Level Authorization

### Task-Level Permissions

Tasks can have additional ownership-based authorization:

```typescript
@Get(':id')
@RequirePermissions('task:read')
async getTask(
  @Param('id') id: string,
  @CurrentUser() user: User
): Promise<Task> {
  const task = await this.tasksService.findById(id);
  
  // Check if user can access this specific task
  if (!this.canAccessTask(user, task)) {
    throw new ForbiddenException('Cannot access this task');
  }
  
  return task;
}

private canAccessTask(user: User, task: Task): boolean {
  // Admin can access all tasks
  if (user.permissions.includes('system:admin')) {
    return true;
  }
  
  // Users can access their own tasks
  if (task.createdBy === user.id) {
    return true;
  }
  
  // Users can access tasks shared with their team
  if (task.teamId && user.teamIds.includes(task.teamId)) {
    return true;
  }
  
  return false;
}
```

### Computer-Use Authorization

Computer operations require elevated permissions:

```typescript
@Post('computer/click')
@RequirePermissions('computer:control')
async clickOperation(
  @Body() operation: ClickOperation,
  @CurrentUser() user: User
): Promise<OperationResult> {
  // Additional security check for sensitive operations
  if (operation.isElevated && !user.permissions.includes('system:admin')) {
    throw new ForbiddenException('Elevated operations require admin permission');
  }
  
  return this.computerService.click(operation);
}
```

## Security Features

### Permission Inheritance

Roles inherit permissions from parent roles:

```typescript
const roleHierarchy = {
  'admin': ['operator', 'viewer'],
  'operator': ['viewer'],
  'viewer': ['api-consumer']
};

function getUserPermissions(user: User): string[] {
  const allPermissions = new Set<string>();
  
  for (const role of user.roles) {
    // Add direct permissions
    role.permissions.forEach(p => allPermissions.add(p.resource + ':' + p.action));
    
    // Add inherited permissions from parent roles
    const inheritedRoles = getInheritedRoles(role.name);
    for (const inheritedRole of inheritedRoles) {
      inheritedRole.permissions.forEach(p => 
        allPermissions.add(p.resource + ':' + p.action)
      );
    }
  }
  
  return Array.from(allPermissions);
}
```

### Time-Based Access Control

Implement time-based restrictions:

```typescript
interface TemporalPermission {
  permission: string;
  validFrom: Date;
  validUntil: Date;
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  hoursRange?: { start: number; end: number }; // 0-23
}

function checkTemporalPermission(
  permission: string,
  temporalRules: TemporalPermission[]
): boolean {
  const now = new Date();
  
  const applicableRule = temporalRules.find(rule => 
    rule.permission === permission &&
    now >= rule.validFrom &&
    now <= rule.validUntil
  );
  
  if (!applicableRule) return true; // No temporal restriction
  
  // Check day of week restriction
  if (applicableRule.daysOfWeek) {
    const currentDay = now.getDay();
    if (!applicableRule.daysOfWeek.includes(currentDay)) {
      return false;
    }
  }
  
  // Check hour range restriction
  if (applicableRule.hoursRange) {
    const currentHour = now.getHours();
    if (currentHour < applicableRule.hoursRange.start || 
        currentHour > applicableRule.hoursRange.end) {
      return false;
    }
  }
  
  return true;
}
```

### IP-Based Restrictions

Implement IP allowlisting for sensitive operations:

```typescript
interface IPRestriction {
  permission: string;
  allowedIPs: string[];
  allowedCIDRs: string[];
}

@Injectable()
export class IPRestrictionsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const requiredPermissions = this.reflector.get(PERMISSIONS_KEY, context.getHandler());
    
    if (this.requiresIPCheck(requiredPermissions)) {
      const clientIP = this.getClientIP(request);
      return this.isIPAllowed(clientIP, requiredPermissions);
    }
    
    return true;
  }
  
  private isIPAllowed(clientIP: string, permissions: string[]): boolean {
    const restrictions = this.getIPRestrictionsForPermissions(permissions);
    return restrictions.every(restriction => 
      restriction.allowedIPs.includes(clientIP) ||
      this.isIPInCIDRRange(clientIP, restriction.allowedCIDRs)
    );
  }
}
```

## Integration Examples

### React/TypeScript Frontend

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    fetchUserPermissions();
  }, []);

  const fetchUserPermissions = async () => {
    try {
      const response = await fetch('/api/v1/auth/permissions', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      setUser(data);
      setPermissions(data.permissions);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(permission => permissions.includes(permission));
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(permission => permissions.includes(permission));
  };

  return (
    <AuthContext.Provider value={{
      user, permissions, hasPermission, hasAnyPermission, hasAllPermissions
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Permission-based component rendering
export const ProtectedComponent: React.FC<{
  permission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ permission, fallback = null, children }) => {
  const { hasPermission } = useAuth();
  
  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// Usage example
function TaskDashboard() {
  const { hasPermission } = useAuth();
  
  return (
    <div>
      <h1>Tasks</h1>
      
      <ProtectedComponent 
        permission="task:write"
        fallback={<p>You don't have permission to create tasks</p>}
      >
        <button onClick={createTask}>Create New Task</button>
      </ProtectedComponent>
      
      <ProtectedComponent permission="task:read">
        <TaskList />
      </ProtectedComponent>
      
      {hasPermission('system:admin') && (
        <AdminPanel />
      )}
    </div>
  );
}
```

### Python Client

```python
import requests
from typing import List, Dict, Any
from enum import Enum

class Permission(Enum):
    TASK_READ = "task:read"
    TASK_WRITE = "task:write"
    TASK_EXECUTE = "task:execute"
    TASK_DELETE = "task:delete"
    COMPUTER_VIEW = "computer:view"
    COMPUTER_CONTROL = "computer:control"
    SYSTEM_MONITOR = "system:monitor"
    SYSTEM_ADMIN = "system:admin"
    API_ACCESS = "api:access"
    API_MANAGE = "api:manage"

class BytebotAuthClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token
        self.permissions: List[str] = []
        self._load_permissions()
    
    def _load_permissions(self):
        """Load user permissions from API"""
        response = requests.get(
            f"{self.base_url}/api/v1/auth/permissions",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        if response.ok:
            data = response.json()
            self.permissions = data.get("permissions", [])
    
    def has_permission(self, permission: Permission) -> bool:
        """Check if user has specific permission"""
        return permission.value in self.permissions
    
    def has_any_permission(self, permissions: List[Permission]) -> bool:
        """Check if user has any of the specified permissions"""
        return any(p.value in self.permissions for p in permissions)
    
    def has_all_permissions(self, permissions: List[Permission]) -> bool:
        """Check if user has all specified permissions"""
        return all(p.value in self.permissions for p in permissions)
    
    def require_permission(self, permission: Permission):
        """Decorator to require specific permission"""
        def decorator(func):
            def wrapper(*args, **kwargs):
                if not self.has_permission(permission):
                    raise PermissionError(f"Missing required permission: {permission.value}")
                return func(*args, **kwargs)
            return wrapper
        return decorator
    
    @require_permission(Permission.TASK_WRITE)
    def create_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new task - requires task:write permission"""
        response = requests.post(
            f"{self.base_url}/api/v1/tasks",
            headers={"Authorization": f"Bearer {self.token}"},
            json=task_data
        )
        return response.json()
    
    @require_permission(Permission.TASK_EXECUTE)
    def execute_task(self, task_id: str) -> Dict[str, Any]:
        """Execute a task - requires task:execute permission"""
        response = requests.post(
            f"{self.base_url}/api/v1/tasks/{task_id}/execute",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        return response.json()

# Usage example
client = BytebotAuthClient("https://api.bytebot.com", "your_jwt_token")

# Check permissions
if client.has_permission(Permission.TASK_WRITE):
    task = client.create_task({"name": "Test Task", "type": "automation"})
    print(f"Created task: {task['id']}")

if client.has_permission(Permission.TASK_EXECUTE):
    result = client.execute_task(task["id"])
    print(f"Execution result: {result['status']}")
```

## Error Handling

### Authorization Errors

| Status Code | Error Code | Description | Action |
|-------------|------------|-------------|---------|
| 403 | `INSUFFICIENT_PERMISSIONS` | User lacks required permissions | Check role assignments |
| 403 | `ROLE_NOT_ASSIGNED` | User has no roles assigned | Assign appropriate role |
| 403 | `PERMISSION_EXPIRED` | Time-based permission expired | Wait or request extension |
| 403 | `IP_RESTRICTED` | Access from unauthorized IP | Use allowed IP address |
| 403 | `RESOURCE_ACCESS_DENIED` | Cannot access specific resource | Check resource ownership |

### Error Response Format

```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "User lacks required permissions for this operation",
    "details": {
      "required_permissions": ["task:execute"],
      "user_permissions": ["task:read", "task:write"],
      "missing_permissions": ["task:execute"]
    }
  }
}
```

## Monitoring and Auditing

### Authorization Events

The system logs all authorization events:

```typescript
interface AuthorizationEvent {
  timestamp: Date;
  userId: string;
  username: string;
  resource: string;
  action: string;
  permission: string;
  result: 'granted' | 'denied';
  reason?: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;
}
```

### Key Metrics

Monitor these authorization metrics:

- **Permission Check Latency**: Target < 10ms p95
- **Authorization Success Rate**: Target > 99.5%
- **Failed Authorization Rate**: Alert on > 1% in 5 minutes
- **Role Assignment Changes**: Monitor for security audits
- **Privilege Escalation Attempts**: Alert immediately

### Audit Trails

```bash
# View authorization logs
tail -f /var/log/bytebot/authorization.log

# Search for specific permission denials
grep "INSUFFICIENT_PERMISSIONS" /var/log/bytebot/authorization.log

# Monitor privilege escalation attempts
grep "privilege_escalation" /var/log/bytebot/security.log
```

## Best Practices

### Development

1. **Principle of Least Privilege**: Grant minimal permissions required
2. **Regular Permission Reviews**: Quarterly access reviews
3. **Role-Based Design**: Design features around roles, not individual permissions
4. **Permission Caching**: Cache user permissions for performance
5. **Graceful Degradation**: Provide clear feedback for missing permissions

### Administration

1. **Default Roles**: Assign appropriate default roles for new users
2. **Permission Documentation**: Keep permission matrix updated
3. **Regular Audits**: Review user permissions and role assignments
4. **Emergency Procedures**: Process for temporary privilege escalation
5. **Compliance Tracking**: Maintain audit logs for compliance requirements

---

**Last Updated**: September 6, 2025  
**Version**: 1.0.0  
**Next Review**: December 6, 2025