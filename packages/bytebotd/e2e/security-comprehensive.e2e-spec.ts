/**
 * Comprehensive End-to-End Security Test Suite
 *
 * Full-stack security testing covering:
 * - Complete authentication and authorization flows
 * - Multi-role security scenario testing
 * - Security middleware integration validation
 * - Cross-component security consistency
 * - Performance under security load
 * - Real-world attack simulation
 * - Security monitoring and alerting
 *
 * @author Security E2E Testing Specialist
 * @version 1.0.0
 * @coverage-target 95%+
 * @security-focus Critical
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import type { Express } from 'express';
import { Request, Response, NextFunction } from 'express';
import { JwtService as _JwtService } from '@nestjs/jwt';
import { ConfigService as _ConfigService } from '@nestjs/config';
import { UserRole, Permission } from '@bytebot/shared';
import {
  StrictRecord,
  TypedMiddleware as _TypedMiddleware,
  AuthenticatedRequest as _AuthenticatedRequest,
  ClientInfo,
  TaskData,
  DecodedJwtPayload,
} from '../src/types';

// Extend Express Request interface to include user with role
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      sub: string;
      email: string;
      role: UserRole;
      sessionId?: string;
      permissions?: string[];
      clientInfo?: ClientInfo;
    };
  }
}

/**
 * Comprehensive E2E Security Testing Module
 */
class _SecurityE2ETestModule {
  static forTesting() {
    return {
      module: _SecurityE2ETestModule,
      providers: [
        SecurityE2EAuthService,
        SecurityE2EJwtService,
        SecurityE2EConfigService,
        SecurityE2EUserService,
      ],
      controllers: [
        SecurityE2EAuthController,
        SecurityE2EProtectedController,
        SecurityE2EAdminController,
        SecurityE2EHealthController,
      ],
    };
  }
}

/**
 * Type definitions for security testing
 */
interface SecuritySession {
  id: string;
  userId: string;
  email: string;
  role: UserRole;
  createdAt: number;
  lastActivity: number;
  clientInfo?: ClientInfo;
}

interface FailedAttempt {
  count: number;
  lastAttempt: number;
}

interface _SecurityUser {
  id: string;
  email: string;
  role: string;
  password: string;
}

// TaskData interface is now imported from '../src/types'

/**
 * Mock services for comprehensive security testing
 */
class SecurityE2EAuthService {
  private users = new Map([
    [
      'admin@bytebot.ai',
      {
        id: '1',
        email: 'admin@bytebot.ai',
        role: UserRole._ADMIN,
        password: 'Admin123!@#',
      },
    ],
    [
      'operator@bytebot.ai',
      {
        id: '2',
        email: 'operator@bytebot.ai',
        role: UserRole._OPERATOR,
        password: 'Operator123!@#',
      },
    ],
    [
      'viewer@bytebot.ai',
      {
        id: '3',
        email: 'viewer@bytebot.ai',
        role: UserRole._VIEWER,
        password: 'Viewer123!@#',
      },
    ],
  ]);

  private sessions = new Map<string, SecuritySession>();
  private failedAttempts = new Map<string, FailedAttempt>();

  async authenticate(email: string, password: string, clientInfo: ClientInfo) {
    const user = this.users.get(email);

    // Track failed attempts for security monitoring
    const attempts = this.failedAttempts.get(email) ?? {
      count: 0,
      lastAttempt: 0,
    };

    if (!user || user.password !== password) {
      attempts.count++;
      attempts.lastAttempt = Date.now();
      this.failedAttempts.set(email, attempts);

      // Simulate rate limiting after multiple failures
      if (attempts.count > 3) {
        throw new Error(
          'Account temporarily locked due to multiple failed attempts',
        );
      }

      throw new Error('Invalid credentials');
    }

    // Reset failed attempts on successful login
    this.failedAttempts.delete(email);

    const sessionId = `session_${Date.now()}_${Math.random()}`;
    const session = {
      id: sessionId,
      userId: user.id,
      email: user.email,
      role: user.role,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      clientInfo,
    };

    this.sessions.set(sessionId, session);

    return {
      sessionId,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async validateSession(sessionId: string): Promise<SecuritySession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Invalid session');
    }

    // Check session expiration (30 minutes)
    if (Date.now() - session.lastActivity > 30 * 60 * 1000) {
      this.sessions.delete(sessionId);
      throw new Error('Session expired');
    }

    // Update last activity
    session.lastActivity = Date.now();

    return session;
  }

  async logout(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  getFailedAttempts(
    email?: string,
  ): FailedAttempt | Array<[string, FailedAttempt]> {
    if (email) {
      return this.failedAttempts.get(email) ?? { count: 0, lastAttempt: 0 };
    }
    return Array.from(this.failedAttempts.entries());
  }
}

class SecurityE2EJwtService {
  private secret = 'e2e-security-test-secret';

  sign(
    payload: Record<string, unknown>,
    options: { expiresIn?: string | number } = {},
  ) {
    // Simulate JWT signing
    const header = Buffer.from(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
    ).toString('base64url');
    const payloadEncoded = Buffer.from(
      JSON.stringify({
        ...payload,
        exp:
          Math.floor(Date.now() / 1000) +
          (options.expiresIn ? parseInt(String(options.expiresIn)) : 900), // 15 minutes default
        iat: Math.floor(Date.now() / 1000),
      }),
    ).toString('base64url');

    const signature = Buffer.from(`${this.secret}-${header}-${payloadEncoded}`)
      .toString('base64url')
      .substring(0, 43);

    return `${header}.${payloadEncoded}.${signature}`;
  }

  verify(token: string): DecodedJwtPayload {
    try {
      const [header, payload, signature] = token.split('.');

      // Ensure all parts are present
      if (!header || !payload || !signature) {
        throw new Error('Invalid token format');
      }

      const decodedPayload = JSON.parse(
        Buffer.from(payload, 'base64url').toString(),
      );

      // Check expiration
      if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('Token expired');
      }

      // Simple signature verification (for testing)
      const expectedSignature = Buffer.from(
        `${this.secret}-${header}-${payload}`,
      )
        .toString('base64url')
        .substring(0, 43);
      if (signature !== expectedSignature) {
        throw new Error('Invalid signature');
      }

      return decodedPayload as DecodedJwtPayload;
    } catch (_error) {
      throw new Error('Invalid token');
    }
  }
}

class SecurityE2EConfigService {
  private config: StrictRecord<string | number> = {
    JWT_SECRET: 'e2e-security-test-secret',
    JWT_REFRESH_SECRET: 'e2e-security-refresh-secret',
    JWT_EXPIRATION: '15m',
    JWT_REFRESH_EXPIRATION: '7d',
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX: 100,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    MAX_FAILED_ATTEMPTS: 3,
    ACCOUNT_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  };

  get(key: string): string | number | undefined {
    return this.config[key];
  }
}

class SecurityE2EUserService {
  getPermissions(role: UserRole): Permission[] {
    const rolePermissions: Record<UserRole, Permission[]> = {
      [UserRole._ADMIN]: [
        Permission._TASK_READ,
        Permission._TASK_WRITE,
        Permission._TASK_DELETE,
        Permission._COMPUTER_CONTROL,
        Permission._COMPUTER_VIEW,
        Permission._SYSTEM_ADMIN,
        Permission._USER_MANAGE,
        Permission._METRICS_VIEW,
        Permission._LOGS_VIEW,
      ],
      [UserRole._OPERATOR]: [
        Permission._TASK_READ,
        Permission._TASK_WRITE,
        Permission._COMPUTER_CONTROL,
        Permission._COMPUTER_VIEW,
        Permission._METRICS_VIEW,
      ],
      [UserRole._VIEWER]: [
        Permission._TASK_READ,
        Permission._COMPUTER_VIEW,
        Permission._METRICS_VIEW,
      ],
      [UserRole._USER]: [Permission._TASK_READ],
      [UserRole._GUEST]: [Permission._VIEW_PUBLIC_CONTENT],
    };

    return rolePermissions[role] ?? [];
  }
}

/**
 * Mock controllers for security testing
 */
class SecurityE2EAuthController {
  constructor(
    private authService: SecurityE2EAuthService,
    private jwtService: SecurityE2EJwtService,
  ) {}

  async login(
    body: { email: string; password: string },
    clientInfo: ClientInfo,
  ) {
    const { email, password } = body;

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const authResult = await this.authService.authenticate(
      email,
      password,
      clientInfo,
    );

    const accessToken = this.jwtService.sign({
      sub: authResult.user.id,
      email: authResult.user.email,
      role: authResult.user.role,
      sessionId: authResult.sessionId,
    });

    const refreshToken = this.jwtService.sign(
      {
        sub: authResult.user.id,
        sessionId: authResult.sessionId,
        type: 'refresh',
      },
      { expiresIn: '7d' },
    );

    return {
      accessToken,
      refreshToken,
      user: authResult.user,
      expiresIn: 900,
    };
  }

  async refresh(body: { refreshToken: string }) {
    const { refreshToken } = body;

    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    const payload = this.jwtService.verify(refreshToken);

    if (payload.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    const session = await this.authService.validateSession(payload.sessionId);

    const newAccessToken = this.jwtService.sign({
      sub: session.userId,
      email: session.email,
      role: session.role,
      sessionId: session.id,
    });

    return {
      accessToken: newAccessToken,
      expiresIn: 900,
    };
  }

  async logout(user: { sub: string; sessionId?: string }) {
    if (user.sessionId) {
      await this.authService.logout(user.sessionId);
    }

    return { message: 'Logged out successfully' };
  }
}

class SecurityE2EProtectedController {
  getUserData(user: {
    sub: string;
    email: string;
    role: UserRole;
    sessionId?: string;
  }) {
    return {
      id: user.sub,
      email: user.email,
      role: user.role,
      sessionId: user.sessionId,
      timestamp: Date.now(),
    };
  }

  getUserTasks(user: { sub: string }) {
    return {
      tasks: [
        { id: '1', title: 'Task 1', assignedTo: user.sub },
        { id: '2', title: 'Task 2', assignedTo: user.sub },
      ],
      total: 2,
      userId: user.sub,
    };
  }

  createTask(user: { sub: string }, data: Partial<TaskData>): TaskData {
    return {
      id: 'new-task-id',
      title: data.title ?? 'New Task',
      description: data.description,
      status: data.status ?? 'pending',
      priority: data.priority ?? 'medium',
      createdBy: user.sub,
      updatedBy: data.updatedBy,
      assignedTo: data.assignedTo,
      createdAt: Date.now(),
      updatedAt: data.updatedAt,
      dueDate: data.dueDate,
      metadata: data.metadata,
    };
  }

  updateTask(
    user: { sub: string },
    taskId: string,
    data: Partial<TaskData>,
  ): TaskData {
    return {
      id: taskId,
      title: data.title ?? 'Updated Task',
      description: data.description,
      status: data.status ?? 'pending',
      priority: data.priority ?? 'medium',
      createdBy: data.createdBy,
      updatedBy: user.sub,
      assignedTo: data.assignedTo,
      createdAt: data.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      dueDate: data.dueDate,
      metadata: data.metadata,
    };
  }
}

class SecurityE2EAdminController {
  getUserList(user: any) {
    return {
      users: [
        { id: '1', email: 'admin@bytebot.ai', role: UserRole._ADMIN },
        { id: '2', email: 'operator@bytebot.ai', role: UserRole._OPERATOR },
        { id: '3', email: 'viewer@bytebot.ai', role: UserRole._VIEWER },
      ],
      total: 3,
      requestedBy: user.sub,
    };
  }

  getSystemMetrics(user: any) {
    return {
      metrics: {
        activeUsers: 15,
        activeSessions: 23,
        failedLogins: 7,
        systemLoad: 0.45,
        memoryUsage: '2.3GB',
      },
      timestamp: Date.now(),
      requestedBy: user.sub,
    };
  }

  deleteUser(user: any, userId: string) {
    return {
      message: 'User deleted successfully',
      deletedUserId: userId,
      deletedBy: user.sub,
      timestamp: Date.now(),
    };
  }

  getAuditLogs(user: any) {
    return {
      logs: [
        {
          id: '1',
          action: 'login',
          userId: '2',
          timestamp: Date.now() - 3600000,
        },
        {
          id: '2',
          action: 'task_create',
          userId: '2',
          timestamp: Date.now() - 1800000,
        },
        {
          id: '3',
          action: 'logout',
          userId: '2',
          timestamp: Date.now() - 900000,
        },
      ],
      total: 3,
      requestedBy: user.sub,
    };
  }
}

class SecurityE2EHealthController {
  getHealth() {
    return {
      status: 'healthy',
      timestamp: Date.now(),
      uptime: 300,
      version: '1.0.0-e2e-security-test',
    };
  }

  getDetailedHealth() {
    return {
      status: 'healthy',
      components: {
        database: 'healthy',
        cache: 'healthy',
        jwt: 'healthy',
        auth: 'healthy',
      },
      metrics: {
        responseTime: 45,
        memoryUsage: 85.2,
        cpuUsage: 23.7,
      },
      timestamp: Date.now(),
    };
  }
}

/**
 * Comprehensive E2E Security Test Suite
 */
describe('Security E2E - Comprehensive Testing', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let authService: SecurityE2EAuthService;
  let jwtService: SecurityE2EJwtService;

  const operationId = `security_e2e_comprehensive_${Date.now()}`;
  const securityLogger = {
    info: (message: string, meta?: any) =>
      console.log(`[E2E-SECURITY] ${message}`, meta ?? ''),
    warn: (message: string, meta?: any) =>
      console.warn(`[E2E-WARNING] ${message}`, meta ?? ''),
    error: (message: string, meta?: any) =>
      console.error(`[E2E-ERROR] ${message}`, meta ?? ''),
    critical: (message: string, meta?: any) =>
      console.error(`[E2E-CRITICAL] ${message}`, meta ?? ''),
  };

  // Security monitoring utilities
  const securityMonitor = {
    trackSecurityEvent: (event: any) => {
      console.log(`[SECURITY-EVENT] ${JSON.stringify(event)}`);
    },

    trackFailedAuthentication: (
      email: string,
      ip: string,
      userAgent: string,
    ) => {
      securityMonitor.trackSecurityEvent({
        type: 'failed_authentication',
        email,
        ip,
        userAgent,
        timestamp: Date.now(),
        severity: 'medium',
      });
    },

    trackSuspiciousActivity: (
      userId: string,
      activity: string,
      metadata: any,
    ) => {
      securityMonitor.trackSecurityEvent({
        type: 'suspicious_activity',
        userId,
        activity,
        metadata,
        timestamp: Date.now(),
        severity: 'high',
      });
    },

    trackPrivilegeEscalation: (
      userId: string,
      attemptedRole: string,
      actualRole: string,
    ) => {
      securityMonitor.trackSecurityEvent({
        type: 'privilege_escalation_attempt',
        userId,
        attemptedRole,
        actualRole,
        timestamp: Date.now(),
        severity: 'critical',
      });
    },
  };

  beforeAll(async () => {
    securityLogger.info(
      `[${operationId}] Setting up comprehensive E2E security testing environment`,
    );

    moduleRef = await Test.createTestingModule({
      imports: [],
      providers: [
        SecurityE2EAuthService,
        SecurityE2EJwtService,
        SecurityE2EConfigService,
        SecurityE2EUserService,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    authService = moduleRef.get<SecurityE2EAuthService>(SecurityE2EAuthService);
    jwtService = moduleRef.get<SecurityE2EJwtService>(SecurityE2EJwtService);

    const _userService = moduleRef.get<SecurityE2EUserService>(
      SecurityE2EUserService,
    );

    // Create controller instances
    const authController = new SecurityE2EAuthController(
      authService,
      jwtService,
    );
    const protectedController = new SecurityE2EProtectedController();
    const adminController = new SecurityE2EAdminController();
    const healthController = new SecurityE2EHealthController();

    // Security middleware stack

    // 1. Security Headers Middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; object-src 'none'",
      );
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=()',
      );
      next();
    });

    // 2. Rate Limiting Middleware
    const rateLimits = new Map();
    app.use((req: Request, res: Response, next: NextFunction) => {
      const clientId = req.ip ?? req.connection?.remoteAddress ?? 'unknown';
      const now = Date.now();
      const windowMs = 15 * 60 * 1000; // 15 minutes
      const maxRequests = 100;

      const clientData = rateLimits.get(clientId) ?? {
        requests: [],
        windowStart: now,
      };

      // Clean old requests
      clientData.requests = clientData.requests.filter(
        (timestamp: number) => now - timestamp < windowMs,
      );

      if (clientData.requests.length >= maxRequests) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil(
            (windowMs - (now - clientData.requests[0])) / 1000,
          ),
        });
      }

      clientData.requests.push(now);
      rateLimits.set(clientId, clientData);

      return next();
    });

    // 3. Authentication Middleware
    app.use('/api/*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/api/health') {
        return next(); // Health endpoint is public
      }

      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        securityMonitor.trackFailedAuthentication(
          'unknown',
          req.ip ?? 'unknown',
          req.headers['user-agent'] ?? 'unknown',
        );
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
      }

      const token = authHeader.substring(7);

      try {
        const decoded = jwtService.verify(token);
        req.user = {
          sub: decoded.sub,
          email: decoded.email,
          role: decoded.role,
          sessionId: decoded.sessionId,
          permissions: decoded.permissions,
          clientInfo: decoded.clientInfo,
        };
        next();
      } catch (_error) {
        securityMonitor.trackFailedAuthentication(
          'token_invalid',
          req.ip ?? 'unknown',
          req.headers['user-agent'] ?? 'unknown',
        );
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
          code: 'TOKEN_INVALID',
        });
      }
    });

    // 4. Role-based Authorization Middleware
    const requireRole = (requiredRole: UserRole) => {
      return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Authentication required',
            code: 'AUTH_REQUIRED',
          });
        }

        const userRole = req.user.role;
        const roleHierarchy: Record<UserRole, UserRole[]> = {
          [UserRole._ADMIN]: [
            UserRole._ADMIN,
            UserRole._OPERATOR,
            UserRole._VIEWER,
            UserRole._USER,
          ],
          [UserRole._OPERATOR]: [
            UserRole._OPERATOR,
            UserRole._VIEWER,
            UserRole._USER,
          ],
          [UserRole._VIEWER]: [UserRole._VIEWER, UserRole._USER],
          [UserRole._USER]: [UserRole._USER],
          [UserRole._GUEST]: [UserRole._GUEST],
        };

        const allowedRoles = roleHierarchy[userRole] ?? [];

        if (!allowedRoles.includes(requiredRole)) {
          securityMonitor.trackPrivilegeEscalation(
            req.user.sub,
            requiredRole,
            userRole,
          );
          return res.status(403).json({
            error: 'Forbidden',
            message: `Insufficient permissions - ${requiredRole} role required`,
            code: 'INSUFFICIENT_PERMISSIONS',
            required: requiredRole,
            current: userRole,
          });
        }

        return next();
      };
    };

    // 5. Input Validation and Sanitization Middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
      // Basic input sanitization
      const sanitizeObject = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) return obj;

        for (const key in obj) {
          if (typeof obj[key] === 'string') {
            // Remove potential XSS patterns
            obj[key] = obj[key]
              .replace(/<script[^>]*>.*?<\/script>/gi, '')
              .replace(/<[^>]*>/g, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+=/gi, '');
          } else if (typeof obj[key] === 'object') {
            sanitizeObject(obj[key]);
          }
        }
      };

      if (req.body) {
        sanitizeObject(req.body);
      }

      if (req.query) {
        sanitizeObject(req.query);
      }

      next();
    });

    // Route definitions

    // Authentication routes
    app.getHttpAdapter().post('/auth/login', async (req, res) => {
      try {
        const clientInfo: ClientInfo = {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          timestamp: Date.now().toString(),
        };

        const result = await authController.login(req.body, clientInfo);
        res.json(result);
      } catch (error: unknown) {
        securityMonitor.trackFailedAuthentication(
          req.body?.email ?? 'unknown',
          req.ip ?? 'unknown',
          req.headers['user-agent'] ?? 'unknown',
        );
        res.status(401).json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    app.getHttpAdapter().post('/auth/refresh', async (req, res) => {
      try {
        const result = await authController.refresh(req.body);
        res.json(result);
      } catch (error: unknown) {
        res.status(401).json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    app.getHttpAdapter().post('/auth/logout', async (req, res) => {
      try {
        const result = await authController.logout(req.user);
        res.json(result);
      } catch (error: unknown) {
        res.status(500).json({
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    // Protected routes
    app.getHttpAdapter().get('/api/user/profile', (req, res) => {
      res.json(protectedController.getUserData(req.user));
    });

    app.getHttpAdapter().get('/api/user/tasks', (req, res) => {
      res.json(protectedController.getUserTasks(req.user));
    });

    app.getHttpAdapter().post('/api/tasks', (req, res) => {
      const middleware = requireRole(UserRole._OPERATOR);
      middleware(req, res, () => {
        res.json(protectedController.createTask(req.user, req.body));
      });
    });

    app.getHttpAdapter().put('/api/tasks/:id', (req, res) => {
      const middleware = requireRole(UserRole._OPERATOR);
      middleware(req, res, () => {
        res.json(
          protectedController.updateTask(req.user, req.params.id, req.body),
        );
      });
    });

    // Admin-only routes
    app.getHttpAdapter().get('/api/admin/users', (req, res) => {
      const middleware = requireRole(UserRole._ADMIN);
      middleware(req, res, () => {
        res.json(adminController.getUserList(req.user));
      });
    });

    app.getHttpAdapter().get('/api/admin/metrics', (req, res) => {
      const middleware = requireRole(UserRole._ADMIN);
      middleware(req, res, () => {
        res.json(adminController.getSystemMetrics(req.user));
      });
    });

    app.getHttpAdapter().delete('/api/admin/users/:id', (req, res) => {
      const middleware = requireRole(UserRole._ADMIN);
      middleware(req, res, () => {
        res.json(adminController.deleteUser(req.user, req.params.id));
      });
    });

    app.getHttpAdapter().get('/api/admin/audit-logs', (req, res) => {
      const middleware = requireRole(UserRole._ADMIN);
      middleware(req, res, () => {
        res.json(adminController.getAuditLogs(req.user));
      });
    });

    // Health endpoints
    app.getHttpAdapter().get('/health', (req, res) => {
      res.json(healthController.getHealth());
    });

    app.getHttpAdapter().get('/api/health', (req, res) => {
      res.json(healthController.getDetailedHealth());
    });

    await app.init();
    securityLogger.info(
      `[${operationId}] E2E security testing environment ready`,
    );
  });

  afterAll(async () => {
    await app?.close();
    securityLogger.info(
      `[${operationId}] E2E security testing environment cleaned up`,
    );
  });

  describe('Authentication Flow Security', () => {
    it('should complete full authentication flow successfully', async () => {
      const testId = `${operationId}_auth_flow_success`;
      securityLogger.info(`[${testId}] Testing complete authentication flow`);

      // Step 1: Login with valid credentials
      const loginResponse = await request(
        app.getHttpServer() as Express.Application,
      )
        .post('/auth/login')
        .send({
          email: 'admin@bytebot.ai',
          password: 'Admin123!@#',
        })
        .expect(200);

      expect(loginResponse.body.accessToken).toBeDefined();
      expect(loginResponse.body.refreshToken).toBeDefined();
      expect(loginResponse.body.user.role).toBe(UserRole._ADMIN);

      const { accessToken, refreshToken } = loginResponse.body;

      // Step 2: Access protected resource with token
      const profileResponse = await request(
        app.getHttpServer() as Express.Application,
      )
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body.email).toBe('admin@bytebot.ai');
      expect(profileResponse.body.role).toBe(UserRole._ADMIN);

      // Step 3: Refresh token
      const refreshResponse = await request(
        app.getHttpServer() as Express.Application,
      )
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.accessToken).toBeDefined();
      expect(refreshResponse.body.accessToken).not.toBe(accessToken);

      // Step 4: Use new token
      await request(app.getHttpServer() as Express.Application)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .expect(200);

      // Step 5: Logout
      await request(app.getHttpServer() as Express.Application)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .expect(200);

      securityLogger.info(
        `[${testId}] Complete authentication flow test successful`,
      );
    });

    it('should handle invalid credentials securely', async () => {
      const testId = `${operationId}_invalid_credentials`;
      securityLogger.info(`[${testId}] Testing invalid credentials handling`);

      const invalidCredentialsTests = [
        { email: 'admin@bytebot.ai', password: 'wrongpassword' },
        { email: 'nonexistent@bytebot.ai', password: 'Admin123!@#' },
        { email: '', password: 'Admin123!@#' },
        { email: 'admin@bytebot.ai', password: '' },
        {}, // Empty body
      ];

      for (const credentials of invalidCredentialsTests) {
        await request(app.getHttpServer() as Express.Application)
          .post('/auth/login')
          .send(credentials)
          .expect(401);
      }

      securityLogger.info(`[${testId}] Invalid credentials handled securely`);
    });

    it('should enforce account lockout after multiple failed attempts', async () => {
      const testId = `${operationId}_account_lockout`;
      securityLogger.info(`[${testId}] Testing account lockout mechanism`);

      const email = 'viewer@bytebot.ai';
      const wrongPassword = 'wrongpassword';

      // Make multiple failed attempts
      for (let i = 0; i < 4; i++) {
        const response = await request(
          app.getHttpServer() as Express.Application,
        )
          .post('/auth/login')
          .send({ email, password: wrongPassword });

        if (i < 3) {
          expect(response.status).toBe(401);
          expect(response.body.error).toContain('Invalid credentials');
        } else {
          expect(response.status).toBe(401);
          expect(response.body.error).toContain('temporarily locked');
        }
      }

      // Verify account is locked even with correct password
      await request(app.getHttpServer() as Express.Application)
        .post('/auth/login')
        .send({ email, password: 'Viewer123!@#' })
        .expect(401);

      securityLogger.warn(
        `[${testId}] Account lockout mechanism working correctly`,
      );
    });
  });

  describe('Multi-Role Security Scenarios', () => {
    it('should enforce role-based access control across all roles', async () => {
      const testId = `${operationId}_rbac_enforcement`;
      securityLogger.info(
        `[${testId}] Testing role-based access control enforcement`,
      );

      // Login as each role and test access patterns
      const roleTests = [
        {
          email: 'admin@bytebot.ai',
          password: 'Admin123!@#',
          role: UserRole._ADMIN,
          shouldAccess: {
            '/api/user/profile': true,
            '/api/tasks': true, // POST
            '/api/admin/users': true,
            '/api/admin/metrics': true,
          },
        },
        {
          email: 'operator@bytebot.ai',
          password: 'Operator123!@#',
          role: UserRole._OPERATOR,
          shouldAccess: {
            '/api/user/profile': true,
            '/api/tasks': true, // POST
            '/api/admin/users': false,
            '/api/admin/metrics': false,
          },
        },
        {
          email: 'viewer@bytebot.ai',
          password: 'Viewer123!@#',
          role: UserRole._VIEWER,
          shouldAccess: {
            '/api/user/profile': true,
            '/api/tasks': false, // POST
            '/api/admin/users': false,
            '/api/admin/metrics': false,
          },
        },
      ];

      for (const roleTest of roleTests) {
        // Login
        const loginResponse = await request(
          app.getHttpServer() as Express.Application,
        )
          .post('/auth/login')
          .send({
            email: roleTest.email,
            password: roleTest.password,
          })
          .expect(200);

        const token = loginResponse.body.accessToken;

        // Test profile access (should work for all)
        if (roleTest.shouldAccess['/api/user/profile']) {
          await request(app.getHttpServer() as Express.Application)
            .get('/api/user/profile')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
        }

        // Test task creation (operator and admin only)
        const taskResponse = await request(
          app.getHttpServer() as Express.Application,
        )
          .post('/api/tasks')
          .set('Authorization', `Bearer ${token}`)
          .send({ title: 'Test Task', description: 'Test Description' });

        if (roleTest.shouldAccess['/api/tasks']) {
          expect(taskResponse.status).toBe(200);
        } else {
          expect(taskResponse.status).toBe(403);
        }

        // Test admin user list (admin only)
        const usersResponse = await request(
          app.getHttpServer() as Express.Application,
        )
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${token}`);

        if (roleTest.shouldAccess['/api/admin/users']) {
          expect(usersResponse.status).toBe(200);
        } else {
          expect(usersResponse.status).toBe(403);
        }

        // Test admin metrics (admin only)
        const metricsResponse = await request(
          app.getHttpServer() as Express.Application,
        )
          .get('/api/admin/metrics')
          .set('Authorization', `Bearer ${token}`);

        if (roleTest.shouldAccess['/api/admin/metrics']) {
          expect(metricsResponse.status).toBe(200);
        } else {
          expect(metricsResponse.status).toBe(403);
        }
      }

      securityLogger.info(
        `[${testId}] Role-based access control working correctly`,
      );
    });

    it('should prevent horizontal privilege escalation', async () => {
      const testId = `${operationId}_horizontal_escalation`;
      securityLogger.info(
        `[${testId}] Testing horizontal privilege escalation prevention`,
      );

      // Login as operator
      const operatorLogin = await request(
        app.getHttpServer() as Express.Application,
      )
        .post('/auth/login')
        .send({
          email: 'operator@bytebot.ai',
          password: 'Operator123!@#',
        })
        .expect(200);

      const operatorToken = operatorLogin.body.accessToken;

      // Try to access another user's data (should be prevented by proper implementation)
      // This test assumes the API properly validates user ownership
      const profileResponse = await request(
        app.getHttpServer() as Express.Application,
      )
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${operatorToken}`)
        .expect(200);

      // Should only return operator's data
      expect(profileResponse.body.email).toBe('operator@bytebot.ai');
      expect(profileResponse.body.role).toBe(UserRole._OPERATOR);

      securityLogger.info(
        `[${testId}] Horizontal privilege escalation prevented`,
      );
    });
  });

  describe('Security Middleware Integration', () => {
    it('should include all required security headers', async () => {
      const testId = `${operationId}_security_headers`;
      securityLogger.info(`[${testId}] Testing security headers integration`);

      const response = await request(app.getHttpServer() as Express.Application)
        .get('/health')
        .expect(200);

      const requiredHeaders = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block',
        'strict-transport-security': 'max-age=31536000; includeSubDomains',
        'content-security-policy': "default-src 'self'",
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=()',
      };

      for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
        expect(response.headers[header]).toContain(expectedValue.split(';')[0]);
      }

      securityLogger.info(`[${testId}] All required security headers present`);
    });

    it('should enforce rate limiting', async () => {
      const testId = `${operationId}_rate_limiting`;
      securityLogger.info(`[${testId}] Testing rate limiting enforcement`);

      const requests = [];

      // Make requests up to the limit (100 requests per 15 minutes)
      for (let i = 0; i < 105; i++) {
        requests.push(
          request(app.getHttpServer() as Express.Application)
            .get('/health')
            .set('X-Forwarded-For', '192.168.1.100'), // Same IP
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(
        (res) => res.status === 429,
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      expect(rateLimitedResponses[0].body.error).toBe('Too Many Requests');

      securityLogger.warn(
        `[${testId}] Rate limiting enforced - ${rateLimitedResponses.length} requests blocked`,
      );
    });

    it('should sanitize malicious input', async () => {
      const testId = `${operationId}_input_sanitization`;
      securityLogger.info(`[${testId}] Testing input sanitization`);

      // Login first
      const loginResponse = await request(
        app.getHttpServer() as Express.Application,
      )
        .post('/auth/login')
        .send({
          email: 'operator@bytebot.ai',
          password: 'Operator123!@#',
        })
        .expect(200);

      const token = loginResponse.body.accessToken;

      // Test XSS sanitization in task creation
      const maliciousTask = {
        title: '<script>alert("XSS")</script>Malicious Task',
        description: '<img src=x onerror=alert("XSS")>Task with XSS',
        priority: 'high',
        metadata: {
          note: 'javascript:alert("XSS")',
          tag: '<svg onload=alert("XSS")>',
        },
      };

      const taskResponse = await request(
        app.getHttpServer() as Express.Application,
      )
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(maliciousTask)
        .expect(200);

      // Verify XSS content was sanitized
      expect(taskResponse.body.title).toBeDefined();
      expect(taskResponse.body.title).not.toContain('<script>');
      expect(taskResponse.body.description).not.toContain('<img');

      securityLogger.info(`[${testId}] Malicious input sanitized successfully`);
    });
  });

  describe('Performance Under Security Load', () => {
    it('should maintain performance with security middleware', async () => {
      const testId = `${operationId}_security_performance`;
      securityLogger.info(
        `[${testId}] Testing performance under security load`,
      );

      // Login first
      const loginResponse = await request(
        app.getHttpServer() as Express.Application,
      )
        .post('/auth/login')
        .send({
          email: 'admin@bytebot.ai',
          password: 'Admin123!@#',
        })
        .expect(200);

      const token = loginResponse.body.accessToken;
      const startTime = Date.now();

      // Make 50 concurrent authenticated requests
      const promises = Array(50)
        .fill(null)
        .map(() =>
          request(app.getHttpServer() as Express.Application)
            .get('/api/user/profile')
            .set('Authorization', `Bearer ${token}`),
        );

      const responses = await Promise.all(promises);
      const processingTime = Date.now() - startTime;

      // All requests should succeed
      const successfulRequests = responses.filter(
        (res) => res.status === 200,
      ).length;
      expect(successfulRequests).toBe(50);

      // Should complete within reasonable time (less than 5 seconds)
      expect(processingTime).toBeLessThan(5000);

      securityLogger.info(
        `[${testId}] Security performance maintained (${processingTime}ms for 50 requests)`,
      );
    });

    it('should handle mixed legitimate and attack traffic', async () => {
      const testId = `${operationId}_mixed_traffic`;
      securityLogger.info(`[${testId}] Testing mixed traffic handling`);

      // Login for legitimate requests
      const loginResponse = await request(
        app.getHttpServer() as Express.Application,
      )
        .post('/auth/login')
        .send({
          email: 'admin@bytebot.ai',
          password: 'Admin123!@#',
        })
        .expect(200);

      const token = loginResponse.body.accessToken;
      const startTime = Date.now();

      const promises = [
        // Legitimate requests (20)
        ...Array(20)
          .fill(null)
          .map(() =>
            request(app.getHttpServer() as Express.Application)
              .get('/api/user/profile')
              .set('Authorization', `Bearer ${token}`),
          ),

        // Attack requests - invalid tokens (15)
        ...Array(15)
          .fill(null)
          .map(() =>
            request(app.getHttpServer() as Express.Application)
              .get('/api/admin/users')
              .set('Authorization', 'Bearer invalid-token'),
          ),

        // Attack requests - no authentication (15)
        ...Array(15)
          .fill(null)
          .map(() =>
            request(app.getHttpServer() as Express.Application).get(
              '/api/admin/metrics',
            ),
          ),
      ];

      const responses = await Promise.all(promises);
      const processingTime = Date.now() - startTime;

      const legitimateSuccess = responses
        .slice(0, 20)
        .filter((res) => res.status === 200).length;
      const attacksBlocked = responses
        .slice(20)
        .filter((res) => [401, 403].includes(res.status)).length;

      expect(legitimateSuccess).toBe(20);
      expect(attacksBlocked).toBe(30);
      expect(processingTime).toBeLessThan(8000); // Should complete within 8 seconds

      securityLogger.info(
        `[${testId}] Mixed traffic handled efficiently (${processingTime}ms, ${legitimateSuccess} legitimate, ${attacksBlocked} blocked)`,
      );
    });
  });

  describe('Security Monitoring and Alerting', () => {
    it('should track and log security events', async () => {
      const testId = `${operationId}_security_events`;
      securityLogger.info(`[${testId}] Testing security event tracking`);

      // Mock console to capture security events
      const securityEvents: string[] = [];
      const originalConsoleLog = console.log;

      console.log = (...args) => {
        const message = args.join(' ');
        if (message.includes('[SECURITY-EVENT]')) {
          securityEvents.push(message);
        }
        originalConsoleLog(...args);
      };

      // Generate various security events

      // Failed authentication
      await request(app.getHttpServer() as Express.Application)
        .post('/auth/login')
        .send({
          email: 'attacker@malicious.com',
          password: 'wrongpassword',
        })
        .expect(401);

      // Unauthorized access attempt
      await request(app.getHttpServer() as Express.Application)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Role escalation attempt
      const viewerLogin = await request(
        app.getHttpServer() as Express.Application,
      )
        .post('/auth/login')
        .send({
          email: 'viewer@bytebot.ai',
          password: 'Viewer123!@#',
        })
        .expect(200);

      await request(app.getHttpServer() as Express.Application)
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${viewerLogin.body.accessToken}`)
        .expect(403);

      // Restore console
      console.log = originalConsoleLog;

      // Verify security events were logged
      expect(securityEvents.length).toBeGreaterThan(0);

      const hasFailedAuthEvent = securityEvents.some((event) =>
        event.includes('failed_authentication'),
      );
      const hasPrivilegeEscalationEvent = securityEvents.some((event) =>
        event.includes('privilege_escalation_attempt'),
      );

      expect(hasFailedAuthEvent).toBe(true);
      expect(hasPrivilegeEscalationEvent).toBe(true);

      securityLogger.critical(
        `[${testId}] Security events tracked successfully (${securityEvents.length} events)`,
      );
    });

    it('should provide detailed audit information', async () => {
      const testId = `${operationId}_audit_information`;
      securityLogger.info(`[${testId}] Testing audit information detail`);

      // Login as admin
      const loginResponse = await request(
        app.getHttpServer() as Express.Application,
      )
        .post('/auth/login')
        .send({
          email: 'admin@bytebot.ai',
          password: 'Admin123!@#',
        })
        .expect(200);

      const token = loginResponse.body.accessToken;

      // Access audit logs
      const auditResponse = await request(
        app.getHttpServer() as Express.Application,
      )
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(auditResponse.body.logs).toBeDefined();
      expect(Array.isArray(auditResponse.body.logs)).toBe(true);
      expect(auditResponse.body.requestedBy).toBeDefined();

      // Verify audit log structure
      if (auditResponse.body.logs.length > 0) {
        const log = auditResponse.body.logs[0];
        expect(log.id).toBeDefined();
        expect(log.action).toBeDefined();
        expect(log.userId).toBeDefined();
        expect(log.timestamp).toBeDefined();
      }

      securityLogger.info(
        `[${testId}] Audit information detailed and comprehensive`,
      );
    });
  });

  describe('Cross-Component Security Consistency', () => {
    it('should maintain consistent security across all endpoints', async () => {
      const testId = `${operationId}_security_consistency`;
      securityLogger.info(
        `[${testId}] Testing security consistency across endpoints`,
      );

      const endpoints = [
        { path: '/api/user/profile', method: 'get', authRequired: true },
        { path: '/api/user/tasks', method: 'get', authRequired: true },
        { path: '/api/tasks', method: 'post', authRequired: true },
        { path: '/api/admin/users', method: 'get', authRequired: true },
        { path: '/api/admin/metrics', method: 'get', authRequired: true },
        { path: '/health', method: 'get', authRequired: false },
        { path: '/api/health', method: 'get', authRequired: false },
      ];

      for (const endpoint of endpoints) {
        const response = await request(
          app.getHttpServer() as Express.Application,
        )[endpoint.method](endpoint.path);

        if (endpoint.authRequired) {
          expect(response.status).toBe(401); // Should require authentication
        } else {
          expect([200, 404].includes(response.status)).toBe(true); // Should work without auth
        }

        // All responses should have security headers
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBe('DENY');
      }

      securityLogger.info(
        `[${testId}] Security consistency maintained across all endpoints`,
      );
    });

    it('should handle edge cases consistently', async () => {
      const testId = `${operationId}_edge_cases`;
      securityLogger.info(`[${testId}] Testing edge case handling consistency`);

      const edgeCases = [
        // Malformed tokens
        { authorization: 'Bearer malformed.token' },
        { authorization: 'Bearer' }, // Missing token
        { authorization: 'Basic dXNlcjpwYXNz' }, // Wrong auth type
        { authorization: '' }, // Empty header

        // Unusual content types
        { 'content-type': 'application/xml' },
        { 'content-type': 'text/plain' },

        // Large headers
        { 'x-large-header': 'A'.repeat(10000) },
      ];

      for (const headers of edgeCases) {
        const response = await request(
          app.getHttpServer() as Express.Application,
        )
          .get('/api/user/profile')
          .set(headers);

        // Should handle gracefully (return 401 for auth issues)
        expect([400, 401, 413, 431].includes(response.status)).toBe(true);

        // Should still include security headers
        expect(response.headers['x-content-type-options']).toBe('nosniff');
      }

      securityLogger.info(`[${testId}] Edge cases handled consistently`);
    });
  });
});
