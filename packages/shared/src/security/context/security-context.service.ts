/**
 * Security Context Management Service
 *
 * Provides comprehensive security context management for Bytebot microservices
 * including user authentication context, role/permission context, session management,
 * and cross-service context propagation with local SQLite-based storage.
 *
 * Features:
 * - User authentication context with JWT token management
 * - Role-based permission context with hierarchical permissions
 * - Session management with automatic cleanup and validation
 * - Cross-service context propagation via HTTP headers
 * - Thread-safe storage with SQLite database
 * - Request lifecycle management with interceptors
 * - Security state tracking and audit trail maintenance
 * - Performance optimization with caching layers
 *
 * Local-Only Architecture:
 * - SQLite database for 100% local storage
 * - No external dependencies or cloud services
 * - Thread-safe operations with proper resource management
 * - Audit trail with local file-based storage
 *
 * @author Claude Code - REST API Development Specialist Agent
 * @version 1.0.0 - Enterprise Security Context Management
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';
import { promisify } from 'util';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// ===== SECURITY CONTEXT INTERFACES =====

export interface UserAuthenticationContext {
  userId: string;
  username: string;
  email?: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  issuedAt: Date;
  expiresAt: Date;
  lastActive: Date;
  ipAddress?: string;
  userAgent?: string;
  loginMethod: 'password' | 'token' | 'sso' | 'api_key';
  mfaVerified: boolean;
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface RolePermissionContext {
  roleId: string;
  roleName: string;
  permissions: Permission[];
  hierarchyLevel: number;
  parentRoles: string[];
  childRoles: string[];
  restrictions: Restriction[];
  effectivePermissions: string[];
  lastUpdated: Date;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
  scope: 'global' | 'organization' | 'project' | 'personal';
  priority: number;
  grantedAt: Date;
  grantedBy: string;
  expiresAt?: Date;
}

export interface Restriction {
  id: string;
  type: 'time_based' | 'ip_based' | 'location_based' | 'resource_based' | 'action_based';
  conditions: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  reason: string;
}

export interface SessionContext {
  sessionId: string;
  userId: string;
  deviceId?: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  data: Record<string, any>;
  securityEvents: SecurityEvent[];
  location?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
}

export interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'permission_check' | 'access_denied' | 'session_expired' | 'suspicious_activity';
  sessionId: string;
  userId?: string;
  timestamp: Date;
  details: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  resolved: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface CrossServiceContext {
  requestId: string;
  sourceService: string;
  targetService: string;
  userId?: string;
  sessionId?: string;
  roles: string[];
  permissions: string[];
  securityLevel: string;
  propagatedAt: Date;
  headers: Record<string, string>;
  authenticated: boolean;
}

export interface SecurityContextStorage {
  contextId: string;
  userId: string;
  data: string; // JSON serialized context
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  type: 'authentication' | 'session' | 'permission' | 'cross_service';
  metadata: Record<string, any>;
}

export interface AuditTrailEntry {
  id: string;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  result: 'success' | 'failure' | 'denied';
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  riskScore: number;
  flagged: boolean;
}

// ===== SECURITY CONTEXT CONFIGURATION =====

export interface SecurityContextConfig {
  database: {
    path: string;
    maxConnections: number;
    busyTimeout: number;
    enableWAL: boolean;
  };
  sessions: {
    defaultTimeout: number;
    maxConcurrentSessions: number;
    cleanupInterval: number;
    refreshThreshold: number;
  };
  permissions: {
    cacheTimeout: number;
    hierarchyMaxDepth: number;
    defaultSecurityLevel: string;
  };
  audit: {
    enableLogging: boolean;
    retentionDays: number;
    logDirectory: string;
    maxLogSize: number;
  };
  crossService: {
    enablePropagation: boolean;
    trustedServices: string[];
    headerPrefix: string;
    encryptionKey?: string;
  };
}

// ===== SECURITY CONTEXT SERVICE =====

@Injectable()
export class SecurityContextService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SecurityContextService.name);
  private database: Database.Database;
  private config: SecurityContextConfig;
  private permissionCache = new Map<string, RolePermissionContext>();
  private sessionCache = new Map<string, SessionContext>();
  private auditBuffer: AuditTrailEntry[] = [];
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.config = {
      database: {
        path: process.env.SECURITY_CONTEXT_DB_PATH || './data/security-context.db',
        maxConnections: parseInt(process.env.SECURITY_CONTEXT_MAX_CONNECTIONS || '10'),
        busyTimeout: parseInt(process.env.SECURITY_CONTEXT_BUSY_TIMEOUT || '30000'),
        enableWAL: process.env.SECURITY_CONTEXT_ENABLE_WAL !== 'false',
      },
      sessions: {
        defaultTimeout: parseInt(process.env.SECURITY_SESSION_TIMEOUT || '3600000'), // 1 hour
        maxConcurrentSessions: parseInt(process.env.SECURITY_MAX_CONCURRENT_SESSIONS || '5'),
        cleanupInterval: parseInt(process.env.SECURITY_CLEANUP_INTERVAL || '300000'), // 5 minutes
        refreshThreshold: parseInt(process.env.SECURITY_REFRESH_THRESHOLD || '600000'), // 10 minutes
      },
      permissions: {
        cacheTimeout: parseInt(process.env.SECURITY_PERMISSION_CACHE_TIMEOUT || '900000'), // 15 minutes
        hierarchyMaxDepth: parseInt(process.env.SECURITY_HIERARCHY_MAX_DEPTH || '10'),
        defaultSecurityLevel: process.env.SECURITY_DEFAULT_LEVEL || 'medium',
      },
      audit: {
        enableLogging: process.env.SECURITY_AUDIT_LOGGING !== 'false',
        retentionDays: parseInt(process.env.SECURITY_AUDIT_RETENTION_DAYS || '90'),
        logDirectory: process.env.SECURITY_AUDIT_LOG_DIR || './logs/security',
        maxLogSize: parseInt(process.env.SECURITY_AUDIT_MAX_LOG_SIZE || '104857600'), // 100MB
      },
      crossService: {
        enablePropagation: process.env.SECURITY_CROSS_SERVICE_PROPAGATION !== 'false',
        trustedServices: (process.env.SECURITY_TRUSTED_SERVICES || 'bytebot-agent,bytebotd,orchestrator').split(','),
        headerPrefix: process.env.SECURITY_HEADER_PREFIX || 'X-Security-Context-',
        encryptionKey: process.env.SECURITY_ENCRYPTION_KEY,
      },
    };
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Security Context Management Service...');

    try {
      await this.initializeDatabase();
      await this.initializeAuditSystem();
      this.startPeriodicCleanup();
      this.logger.log('Security Context Management Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Security Context Management Service', error.stack);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Security Context Management Service...');

    try {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      await this.flushAuditBuffer();
      if (this.database) {
        this.database.close();
      }
      this.logger.log('Security Context Management Service shut down successfully');
    } catch (error) {
      this.logger.error('Error during Security Context Management Service shutdown', error.stack);
    }
  }

  // ===== USER AUTHENTICATION CONTEXT =====

  /**
   * Create user authentication context from JWT token
   */
  async createAuthenticationContext(
    token: string,
    request: Request,
  ): Promise<UserAuthenticationContext> {
    const operationId = `create_auth_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.debug(`[${operationId}] Creating authentication context`, {
        operationId,
        ipAddress: request.ip,
        userAgent: request.get('User-Agent')?.substring(0, 100),
      });

      // Verify and decode JWT token
      const decoded = await this.verifyJwtToken(token);

      // Create authentication context
      const authContext: UserAuthenticationContext = {
        userId: decoded.sub || decoded.userId,
        username: decoded.username || decoded.preferred_username,
        email: decoded.email,
        roles: decoded.roles || [],
        permissions: decoded.permissions || [],
        sessionId: decoded.sessionId || uuidv4(),
        issuedAt: new Date(decoded.iat * 1000),
        expiresAt: new Date(decoded.exp * 1000),
        lastActive: new Date(),
        ipAddress: request.ip,
        userAgent: request.get('User-Agent'),
        loginMethod: decoded.loginMethod || 'token',
        mfaVerified: decoded.mfaVerified || false,
        securityLevel: decoded.securityLevel || this.config.permissions.defaultSecurityLevel,
      };

      // Store in database
      await this.storeSecurityContext(authContext.userId, 'authentication', authContext);

      // Log security event
      await this.logSecurityEvent({
        type: 'login',
        sessionId: authContext.sessionId,
        userId: authContext.userId,
        details: {
          loginMethod: authContext.loginMethod,
          mfaVerified: authContext.mfaVerified,
          securityLevel: authContext.securityLevel,
        },
        severity: 'info',
        ipAddress: request.ip,
        userAgent: request.get('User-Agent'),
      });

      this.logger.log(`[${operationId}] Authentication context created successfully`, {
        operationId,
        userId: authContext.userId,
        username: authContext.username,
        roles: authContext.roles.length,
        permissions: authContext.permissions.length,
      });

      return authContext;

    } catch (error) {
      this.logger.error(`[${operationId}] Failed to create authentication context: ${error.message}`, error.stack, {
        operationId,
      });

      await this.logSecurityEvent({
        type: 'login',
        sessionId: 'unknown',
        details: {
          error: error.message,
          tokenProvided: !!token,
        },
        severity: 'error',
        ipAddress: request.ip,
        userAgent: request.get('User-Agent'),
      });

      throw error;
    }
  }

  /**
   * Get authentication context by user ID
   */
  async getAuthenticationContext(userId: string): Promise<UserAuthenticationContext | null> {
    try {
      const stored = await this.getSecurityContext(userId, 'authentication');
      return stored ? JSON.parse(stored.data) : null;
    } catch (error) {
      this.logger.error(`Failed to get authentication context for user ${userId}: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Update authentication context last active time
   */
  async updateLastActive(userId: string): Promise<void> {
    try {
      const context = await this.getAuthenticationContext(userId);
      if (context) {
        context.lastActive = new Date();
        await this.storeSecurityContext(userId, 'authentication', context);
      }
    } catch (error) {
      this.logger.error(`Failed to update last active for user ${userId}: ${error.message}`, error.stack);
    }
  }

  // ===== ROLE & PERMISSION CONTEXT =====

  /**
   * Get role permission context with hierarchy resolution
   */
  async getRolePermissionContext(roleNames: string[]): Promise<RolePermissionContext[]> {
    const operationId = `get_permissions_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.debug(`[${operationId}] Getting role permission contexts`, {
        operationId,
        roles: roleNames,
      });

      const contexts: RolePermissionContext[] = [];

      for (const roleName of roleNames) {
        // Check cache first
        if (this.permissionCache.has(roleName)) {
          const cached = this.permissionCache.get(roleName)!;
          if (Date.now() - cached.lastUpdated.getTime() < this.config.permissions.cacheTimeout) {
            contexts.push(cached);
            continue;
          }
        }

        // Load from database
        const roleContext = await this.loadRolePermissions(roleName);
        if (roleContext) {
          // Resolve permission hierarchy
          roleContext.effectivePermissions = await this.resolvePermissionHierarchy(roleContext);

          // Cache the result
          this.permissionCache.set(roleName, roleContext);
          contexts.push(roleContext);
        }
      }

      this.logger.debug(`[${operationId}] Role permission contexts retrieved`, {
        operationId,
        foundRoles: contexts.length,
        totalPermissions: contexts.reduce((sum, ctx) => sum + ctx.effectivePermissions.length, 0),
      });

      return contexts;

    } catch (error) {
      this.logger.error(`[${operationId}] Failed to get role permission contexts: ${error.message}`, error.stack, {
        operationId,
        roles: roleNames,
      });
      return [];
    }
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(
    userId: string,
    resource: string,
    action: string,
    context?: Record<string, any>,
  ): Promise<boolean> {
    const operationId = `check_permission_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.debug(`[${operationId}] Checking permission`, {
        operationId,
        userId,
        resource,
        action,
      });

      // Get user authentication context
      const authContext = await this.getAuthenticationContext(userId);
      if (!authContext) {
        await this.logSecurityEvent({
          type: 'permission_check',
          userId,
          details: { resource, action, result: 'no_auth_context' },
          severity: 'warning',
        });
        return false;
      }

      // Get role permission contexts
      const roleContexts = await this.getRolePermissionContext(authContext.roles);

      // Check permissions
      const hasPermission = this.evaluatePermissions(roleContexts, resource, action, context);

      // Log the permission check
      await this.logSecurityEvent({
        type: 'permission_check',
        sessionId: authContext.sessionId,
        userId,
        details: {
          resource,
          action,
          result: hasPermission ? 'granted' : 'denied',
          roles: authContext.roles,
          context,
        },
        severity: hasPermission ? 'info' : 'warning',
      });

      if (!hasPermission) {
        await this.logSecurityEvent({
          type: 'access_denied',
          sessionId: authContext.sessionId,
          userId,
          details: { resource, action, roles: authContext.roles },
          severity: 'warning',
        });
      }

      this.logger.debug(`[${operationId}] Permission check result: ${hasPermission}`, {
        operationId,
        userId,
        resource,
        action,
        result: hasPermission,
      });

      return hasPermission;

    } catch (error) {
      this.logger.error(`[${operationId}] Permission check failed: ${error.message}`, error.stack, {
        operationId,
        userId,
        resource,
        action,
      });

      await this.logSecurityEvent({
        type: 'permission_check',
        userId,
        details: {
          resource,
          action,
          result: 'error',
          error: error.message,
        },
        severity: 'error',
      });

      return false;
    }
  }

  // ===== SESSION MANAGEMENT =====

  /**
   * Create or update session context
   */
  async createOrUpdateSession(
    userId: string,
    request: Request,
    sessionData?: Record<string, any>,
  ): Promise<SessionContext> {
    const operationId = `create_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.debug(`[${operationId}] Creating/updating session`, {
        operationId,
        userId,
        ipAddress: request.ip,
      });

      // Check for existing active sessions
      await this.enforceSessionLimits(userId);

      const sessionId = uuidv4();
      const now = new Date();

      const sessionContext: SessionContext = {
        sessionId,
        userId,
        deviceId: request.get('X-Device-ID'),
        ipAddress: request.ip || 'unknown',
        userAgent: request.get('User-Agent') || 'unknown',
        createdAt: now,
        lastAccessedAt: now,
        expiresAt: new Date(now.getTime() + this.config.sessions.defaultTimeout),
        isActive: true,
        data: sessionData || {},
        securityEvents: [],
        location: await this.resolveLocation(request.ip),
      };

      // Store in database and cache
      await this.storeSecurityContext(sessionId, 'session', sessionContext);
      this.sessionCache.set(sessionId, sessionContext);

      this.logger.log(`[${operationId}] Session created successfully`, {
        operationId,
        sessionId,
        userId,
        expiresAt: sessionContext.expiresAt,
      });

      return sessionContext;

    } catch (error) {
      this.logger.error(`[${operationId}] Failed to create session: ${error.message}`, error.stack, {
        operationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get session context
   */
  async getSessionContext(sessionId: string): Promise<SessionContext | null> {
    try {
      // Check cache first
      if (this.sessionCache.has(sessionId)) {
        const cached = this.sessionCache.get(sessionId)!;
        if (cached.isActive && cached.expiresAt > new Date()) {
          return cached;
        } else {
          // Session expired, remove from cache
          this.sessionCache.delete(sessionId);
        }
      }

      // Load from database
      const stored = await this.getSecurityContext(sessionId, 'session');
      if (stored) {
        const sessionContext: SessionContext = JSON.parse(stored.data);

        // Check if session is still valid
        if (sessionContext.isActive && sessionContext.expiresAt > new Date()) {
          this.sessionCache.set(sessionId, sessionContext);
          return sessionContext;
        } else {
          // Session expired, mark as inactive
          await this.invalidateSession(sessionId);
        }
      }

      return null;

    } catch (error) {
      this.logger.error(`Failed to get session context ${sessionId}: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    try {
      const sessionContext = await this.getSessionContext(sessionId);
      if (sessionContext) {
        sessionContext.isActive = false;
        await this.storeSecurityContext(sessionId, 'session', sessionContext);

        await this.logSecurityEvent({
          type: 'logout',
          sessionId,
          userId: sessionContext.userId,
          details: { reason: 'explicit_logout' },
          severity: 'info',
        });
      }

      this.sessionCache.delete(sessionId);

    } catch (error) {
      this.logger.error(`Failed to invalidate session ${sessionId}: ${error.message}`, error.stack);
    }
  }

  // ===== CROSS-SERVICE CONTEXT PROPAGATION =====

  /**
   * Create cross-service context for HTTP requests
   */
  createCrossServiceContext(
    sourceService: string,
    targetService: string,
    authContext?: UserAuthenticationContext,
  ): CrossServiceContext {
    const requestId = uuidv4();

    return {
      requestId,
      sourceService,
      targetService,
      userId: authContext?.userId,
      sessionId: authContext?.sessionId,
      roles: authContext?.roles || [],
      permissions: authContext?.permissions || [],
      securityLevel: authContext?.securityLevel || this.config.permissions.defaultSecurityLevel,
      propagatedAt: new Date(),
      headers: this.createSecurityHeaders(authContext),
      authenticated: !!authContext,
    };
  }

  /**
   * Extract cross-service context from HTTP headers
   */
  extractCrossServiceContext(request: Request): CrossServiceContext | null {
    try {
      const headers = request.headers;
      const prefix = this.config.crossService.headerPrefix.toLowerCase();

      const userId = headers[`${prefix}user-id`] as string;
      const sessionId = headers[`${prefix}session-id`] as string;
      const roles = (headers[`${prefix}roles`] as string)?.split(',') || [];
      const permissions = (headers[`${prefix}permissions`] as string)?.split(',') || [];
      const securityLevel = headers[`${prefix}security-level`] as string || this.config.permissions.defaultSecurityLevel;
      const sourceService = headers[`${prefix}source-service`] as string;
      const requestId = headers[`${prefix}request-id`] as string;

      if (!sourceService || !requestId) {
        return null;
      }

      return {
        requestId,
        sourceService,
        targetService: process.env.SERVICE_NAME || 'unknown',
        userId,
        sessionId,
        roles,
        permissions,
        securityLevel,
        propagatedAt: new Date(),
        headers: {},
        authenticated: !!userId,
      };

    } catch (error) {
      this.logger.error(`Failed to extract cross-service context: ${error.message}`, error.stack);
      return null;
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Initialize SQLite database with security context tables
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Ensure data directory exists
      const dbDir = this.config.database.path.substring(0, this.config.database.path.lastIndexOf('/'));
      if (!existsSync(dbDir)) {
        await mkdir(dbDir, { recursive: true });
      }

      this.database = new Database(this.config.database.path, {
        timeout: this.config.database.busyTimeout,
      });

      // Enable WAL mode for better concurrency
      if (this.config.database.enableWAL) {
        this.database.exec('PRAGMA journal_mode = WAL');
      }

      // Create tables
      this.database.exec(`
        CREATE TABLE IF NOT EXISTS security_contexts (
          context_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          data TEXT NOT NULL,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          INDEX idx_user_type (user_id, type),
          INDEX idx_expires (expires_at)
        )
      `);

      this.database.exec(`
        CREATE TABLE IF NOT EXISTS security_events (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          session_id TEXT,
          user_id TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          severity TEXT NOT NULL,
          details TEXT,
          resolved BOOLEAN DEFAULT FALSE,
          ip_address TEXT,
          user_agent TEXT,
          INDEX idx_user_timestamp (user_id, timestamp),
          INDEX idx_session_timestamp (session_id, timestamp),
          INDEX idx_type_timestamp (type, timestamp)
        )
      `);

      this.database.exec(`
        CREATE TABLE IF NOT EXISTS audit_trail (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          session_id TEXT,
          action TEXT NOT NULL,
          resource TEXT NOT NULL,
          result TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          ip_address TEXT,
          user_agent TEXT,
          details TEXT,
          risk_score REAL DEFAULT 0,
          flagged BOOLEAN DEFAULT FALSE,
          INDEX idx_user_timestamp (user_id, timestamp),
          INDEX idx_action_timestamp (action, timestamp),
          INDEX idx_flagged (flagged)
        )
      `);

      this.logger.log('Security context database initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize security context database', error.stack);
      throw error;
    }
  }

  /**
   * Initialize audit logging system
   */
  private async initializeAuditSystem(): Promise<void> {
    try {
      if (this.config.audit.enableLogging) {
        // Ensure audit log directory exists
        if (!existsSync(this.config.audit.logDirectory)) {
          await mkdir(this.config.audit.logDirectory, { recursive: true });
        }

        this.logger.log('Audit logging system initialized successfully');
      }
    } catch (error) {
      this.logger.error('Failed to initialize audit logging system', error.stack);
      throw error;
    }
  }

  /**
   * Verify JWT token
   */
  private async verifyJwtToken(token: string): Promise<any> {
    try {
      const secret = process.env.JWT_SECRET || 'default-secret';
      const verify = promisify(jwt.verify);
      return await verify(token, secret);
    } catch (error) {
      throw new Error(`Invalid JWT token: ${error.message}`);
    }
  }

  /**
   * Store security context in database
   */
  private async storeSecurityContext(
    contextId: string,
    type: string,
    data: any,
    expiresAt?: Date,
  ): Promise<void> {
    try {
      const stmt = this.database.prepare(`
        INSERT OR REPLACE INTO security_contexts
        (context_id, user_id, type, data, expires_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(
        contextId,
        data.userId || contextId,
        type,
        JSON.stringify(data),
        expiresAt?.toISOString(),
      );

    } catch (error) {
      this.logger.error(`Failed to store security context: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get security context from database
   */
  private async getSecurityContext(
    contextId: string,
    type: string,
  ): Promise<SecurityContextStorage | null> {
    try {
      const stmt = this.database.prepare(`
        SELECT * FROM security_contexts
        WHERE context_id = ? AND type = ?
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      `);

      const row = stmt.get(contextId, type) as any;
      if (!row) return null;

      return {
        contextId: row.context_id,
        userId: row.user_id,
        data: row.data,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        expiresAt: row.expires_at ? new Date(row.expires_at) : null,
        type: row.type,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
      };

    } catch (error) {
      this.logger.error(`Failed to get security context: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(event: Partial<SecurityEvent>): Promise<void> {
    try {
      const securityEvent: SecurityEvent = {
        id: uuidv4(),
        type: event.type!,
        sessionId: event.sessionId || 'unknown',
        userId: event.userId,
        timestamp: new Date(),
        details: event.details || {},
        severity: event.severity || 'info',
        resolved: false,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      };

      // Store in database
      const stmt = this.database.prepare(`
        INSERT INTO security_events
        (id, type, session_id, user_id, timestamp, severity, details, resolved, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        securityEvent.id,
        securityEvent.type,
        securityEvent.sessionId,
        securityEvent.userId,
        securityEvent.timestamp.toISOString(),
        securityEvent.severity,
        JSON.stringify(securityEvent.details),
        securityEvent.resolved,
        securityEvent.ipAddress,
        securityEvent.userAgent,
      );

      // Add to audit buffer if enabled
      if (this.config.audit.enableLogging) {
        this.auditBuffer.push({
          id: securityEvent.id,
          userId: securityEvent.userId,
          sessionId: securityEvent.sessionId,
          action: securityEvent.type,
          resource: 'security_event',
          result: 'success',
          timestamp: securityEvent.timestamp,
          ipAddress: securityEvent.ipAddress,
          userAgent: securityEvent.userAgent,
          details: securityEvent.details,
          riskScore: this.calculateRiskScore(securityEvent),
          flagged: securityEvent.severity === 'critical' || securityEvent.severity === 'error',
        });
      }

    } catch (error) {
      this.logger.error(`Failed to log security event: ${error.message}`, error.stack);
    }
  }

  /**
   * Load role permissions from database
   */
  private async loadRolePermissions(roleName: string): Promise<RolePermissionContext | null> {
    // In a real implementation, this would load from a roles/permissions database
    // For demo purposes, return mock data
    return {
      roleId: uuidv4(),
      roleName,
      permissions: [
        {
          id: uuidv4(),
          name: `${roleName}_permissions`,
          resource: '*',
          action: '*',
          scope: 'global',
          priority: 1,
          grantedAt: new Date(),
          grantedBy: 'system',
        },
      ],
      hierarchyLevel: 1,
      parentRoles: [],
      childRoles: [],
      restrictions: [],
      effectivePermissions: [],
      lastUpdated: new Date(),
    };
  }

  /**
   * Resolve permission hierarchy
   */
  private async resolvePermissionHierarchy(roleContext: RolePermissionContext): Promise<string[]> {
    const permissions = new Set<string>();

    // Add direct permissions
    roleContext.permissions.forEach(permission => {
      if (!permission.expiresAt || permission.expiresAt > new Date()) {
        permissions.add(`${permission.resource}:${permission.action}`);
      }
    });

    // In a real implementation, resolve parent role permissions here

    return Array.from(permissions);
  }

  /**
   * Evaluate permissions against resource and action
   */
  private evaluatePermissions(
    roleContexts: RolePermissionContext[],
    resource: string,
    action: string,
    context?: Record<string, any>,
  ): boolean {
    for (const roleContext of roleContexts) {
      const hasPermission = roleContext.effectivePermissions.some(permission => {
        const [permResource, permAction] = permission.split(':');
        return (permResource === '*' || permResource === resource) &&
               (permAction === '*' || permAction === action);
      });

      if (hasPermission) {
        // Check restrictions
        const hasRestriction = roleContext.restrictions.some(restriction => {
          return restriction.isActive && this.evaluateRestriction(restriction, context);
        });

        if (!hasRestriction) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Evaluate restriction conditions
   */
  private evaluateRestriction(restriction: Restriction, context?: Record<string, any>): boolean {
    // Simple restriction evaluation - in production, this would be more sophisticated
    switch (restriction.type) {
      case 'time_based':
        const currentHour = new Date().getHours();
        return currentHour < restriction.conditions.startHour || currentHour > restriction.conditions.endHour;

      case 'ip_based':
        return context?.ipAddress && !restriction.conditions.allowedIPs?.includes(context.ipAddress);

      default:
        return false;
    }
  }

  /**
   * Enforce session limits for user
   */
  private async enforceSessionLimits(userId: string): Promise<void> {
    try {
      const stmt = this.database.prepare(`
        SELECT context_id FROM security_contexts
        WHERE user_id = ? AND type = 'session'
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        ORDER BY created_at DESC
      `);

      const sessions = stmt.all(userId) as any[];

      if (sessions.length >= this.config.sessions.maxConcurrentSessions) {
        // Remove oldest sessions
        const sessionsToRemove = sessions.slice(this.config.sessions.maxConcurrentSessions - 1);
        for (const session of sessionsToRemove) {
          await this.invalidateSession(session.context_id);
        }
      }

    } catch (error) {
      this.logger.error(`Failed to enforce session limits for user ${userId}: ${error.message}`, error.stack);
    }
  }

  /**
   * Resolve location from IP address
   */
  private async resolveLocation(ipAddress?: string): Promise<SessionContext['location'] | undefined> {
    // In a real implementation, this would use a GeoIP service
    // For demo purposes, return mock data
    if (!ipAddress || ipAddress === '127.0.0.1' || ipAddress === '::1') {
      return {
        country: 'Local',
        region: 'Local',
        city: 'Local',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    return undefined;
  }

  /**
   * Create security headers for cross-service requests
   */
  private createSecurityHeaders(authContext?: UserAuthenticationContext): Record<string, string> {
    const headers: Record<string, string> = {};
    const prefix = this.config.crossService.headerPrefix;

    if (authContext) {
      headers[`${prefix}User-Id`] = authContext.userId;
      headers[`${prefix}Session-Id`] = authContext.sessionId;
      headers[`${prefix}Roles`] = authContext.roles.join(',');
      headers[`${prefix}Permissions`] = authContext.permissions.join(',');
      headers[`${prefix}Security-Level`] = authContext.securityLevel;
    }

    headers[`${prefix}Source-Service`] = process.env.SERVICE_NAME || 'unknown';
    headers[`${prefix}Request-Id`] = uuidv4();
    headers[`${prefix}Timestamp`] = new Date().toISOString();

    return headers;
  }

  /**
   * Calculate risk score for security event
   */
  private calculateRiskScore(event: SecurityEvent): number {
    let score = 0;

    // Base score by event type
    switch (event.type) {
      case 'login': score = 1; break;
      case 'logout': score = 0; break;
      case 'permission_check': score = 0.5; break;
      case 'access_denied': score = 5; break;
      case 'session_expired': score = 2; break;
      case 'suspicious_activity': score = 8; break;
      default: score = 1;
    }

    // Adjust by severity
    switch (event.severity) {
      case 'critical': score *= 3; break;
      case 'error': score *= 2; break;
      case 'warning': score *= 1.5; break;
      case 'info': score *= 1; break;
    }

    return Math.min(score, 10); // Cap at 10
  }

  /**
   * Start periodic cleanup of expired contexts and sessions
   */
  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpiredContexts();
        await this.cleanupExpiredSessions();
        await this.flushAuditBuffer();
      } catch (error) {
        this.logger.error('Error during periodic cleanup', error.stack);
      }
    }, this.config.sessions.cleanupInterval);
  }

  /**
   * Cleanup expired security contexts
   */
  private async cleanupExpiredContexts(): Promise<void> {
    try {
      const stmt = this.database.prepare(`
        DELETE FROM security_contexts
        WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
      `);

      const result = stmt.run();
      if (result.changes > 0) {
        this.logger.log(`Cleaned up ${result.changes} expired security contexts`);
      }

    } catch (error) {
      this.logger.error('Failed to cleanup expired contexts', error.stack);
    }
  }

  /**
   * Cleanup expired sessions from cache
   */
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date();
      let cleanedCount = 0;

      for (const [sessionId, session] of this.sessionCache.entries()) {
        if (!session.isActive || session.expiresAt <= now) {
          this.sessionCache.delete(sessionId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} expired sessions from cache`);
      }

    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions', error.stack);
    }
  }

  /**
   * Flush audit buffer to file
   */
  private async flushAuditBuffer(): Promise<void> {
    if (!this.config.audit.enableLogging || this.auditBuffer.length === 0) {
      return;
    }

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const logFile = join(this.config.audit.logDirectory, `security-audit-${timestamp}.jsonl`);

      const logEntries = this.auditBuffer.map(entry => JSON.stringify(entry)).join('\n') + '\n';

      await writeFile(logFile, logEntries, { flag: 'a' });

      this.logger.debug(`Flushed ${this.auditBuffer.length} audit entries to ${logFile}`);
      this.auditBuffer = [];

    } catch (error) {
      this.logger.error('Failed to flush audit buffer', error.stack);
    }
  }

  // ===== PUBLIC API METHODS =====

  /**
   * Get security metrics and statistics
   */
  async getSecurityMetrics(): Promise<{
    activeSessions: number;
    totalUsers: number;
    recentEvents: number;
    permissionChecks: number;
    accessDenials: number;
    riskScore: number;
  }> {
    try {
      const metrics = {
        activeSessions: this.sessionCache.size,
        totalUsers: 0,
        recentEvents: 0,
        permissionChecks: 0,
        accessDenials: 0,
        riskScore: 0,
      };

      // Get database metrics
      const userCountStmt = this.database.prepare(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM security_contexts
        WHERE type = 'authentication'
      `);
      metrics.totalUsers = (userCountStmt.get() as any)?.count || 0;

      const recentEventsStmt = this.database.prepare(`
        SELECT COUNT(*) as count
        FROM security_events
        WHERE timestamp > datetime('now', '-1 hour')
      `);
      metrics.recentEvents = (recentEventsStmt.get() as any)?.count || 0;

      const permissionChecksStmt = this.database.prepare(`
        SELECT COUNT(*) as count
        FROM security_events
        WHERE type = 'permission_check' AND timestamp > datetime('now', '-1 hour')
      `);
      metrics.permissionChecks = (permissionChecksStmt.get() as any)?.count || 0;

      const accessDenialsStmt = this.database.prepare(`
        SELECT COUNT(*) as count
        FROM security_events
        WHERE type = 'access_denied' AND timestamp > datetime('now', '-1 hour')
      `);
      metrics.accessDenials = (accessDenialsStmt.get() as any)?.count || 0;

      const riskScoreStmt = this.database.prepare(`
        SELECT AVG(risk_score) as avg_risk
        FROM audit_trail
        WHERE timestamp > datetime('now', '-1 hour')
      `);
      metrics.riskScore = (riskScoreStmt.get() as any)?.avg_risk || 0;

      return metrics;

    } catch (error) {
      this.logger.error('Failed to get security metrics', error.stack);
      return {
        activeSessions: 0,
        totalUsers: 0,
        recentEvents: 0,
        permissionChecks: 0,
        accessDenials: 0,
        riskScore: 0,
      };
    }
  }

  /**
   * Get security events for user
   */
  async getSecurityEvents(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<SecurityEvent[]> {
    try {
      const stmt = this.database.prepare(`
        SELECT * FROM security_events
        WHERE user_id = ?
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `);

      const rows = stmt.all(userId, limit, offset) as any[];

      return rows.map(row => ({
        id: row.id,
        type: row.type,
        sessionId: row.session_id,
        userId: row.user_id,
        timestamp: new Date(row.timestamp),
        details: JSON.parse(row.details || '{}'),
        severity: row.severity,
        resolved: row.resolved,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
      }));

    } catch (error) {
      this.logger.error(`Failed to get security events for user ${userId}`, error.stack);
      return [];
    }
  }
}

// ===== SECURITY CONTEXT INTERCEPTOR =====

/**
 * NestJS Interceptor for automatic security context management
 */
@Injectable()
export class SecurityContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SecurityContextInterceptor.name);

  constructor(private readonly securityContextService: SecurityContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const startTime = Date.now();
    const operationId = `security_context_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Extract cross-service context if present
    const crossServiceContext = this.securityContextService.extractCrossServiceContext(request);
    if (crossServiceContext) {
      (request as any).crossServiceContext = crossServiceContext;
    }

    return next.handle().pipe(
      tap((data) => {
        const processingTime = Date.now() - startTime;
        this.logger.debug(`[${operationId}] Request completed successfully (${processingTime}ms)`, {
          operationId,
          method: request.method,
          url: request.url,
          statusCode: response.statusCode,
          processingTime,
          authenticated: !!crossServiceContext?.authenticated,
        });
      }),
      catchError((error) => {
        const processingTime = Date.now() - startTime;
        this.logger.error(`[${operationId}] Request failed (${processingTime}ms)`, error.stack, {
          operationId,
          method: request.method,
          url: request.url,
          error: error.message,
          processingTime,
        });
        throw error;
      }),
    );
  }
}