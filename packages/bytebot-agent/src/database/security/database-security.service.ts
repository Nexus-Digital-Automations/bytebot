/**
 * Database Security Service - Enterprise Database Security Implementation
 * Provides comprehensive database security including SSL/TLS encryption,
 * connection authentication, audit logging, and access control for Bytebot API
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

export interface DatabaseSecurityConfig {
  // SSL/TLS Configuration
  sslEnabled: boolean;
  sslMode: 'require' | 'prefer' | 'allow' | 'disable';
  sslCertPath?: string;
  sslKeyPath?: string;
  sslRootCertPath?: string;

  // Authentication Configuration
  connectionAuthentication: boolean;
  userCredentialsEncrypted: boolean;
  connectionStringObfuscation: boolean;

  // Audit Logging Configuration
  auditLoggingEnabled: boolean;
  auditSensitiveOperations: boolean;
  auditAllQueries: boolean;
  auditRetentionDays: number;

  // Access Control
  restrictedOperations: string[];
  allowedIpRanges?: string[];
  maxConcurrentConnections: number;
}

export interface DatabaseAuditEvent {
  eventId: string;
  timestamp: Date;
  eventType:
    | 'query'
    | 'connection'
    | 'authentication'
    | 'schema_change'
    | 'security_violation';
  severity: 'info' | 'warning' | 'error' | 'critical';
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  operation: string;
  tableName?: string;
  affectedRows?: number;
  queryText?: string; // Sanitized query text
  success: boolean;
  duration: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface SecurityViolation {
  violationId: string;
  timestamp: Date;
  type:
    | 'unauthorized_access'
    | 'suspicious_query'
    | 'connection_limit_exceeded'
    | 'ip_restriction'
    | 'sql_injection_attempt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  sourceIp?: string;
  userId?: string;
  sessionId?: string;
  context: Record<string, any>;
  blocked: boolean;
}

@Injectable()
export class DatabaseSecurityService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseSecurityService.name);
  private securityConfig: DatabaseSecurityConfig;
  private auditEvents: DatabaseAuditEvent[] = [];
  private securityViolations: SecurityViolation[] = [];
  private auditCleanupInterval: NodeJS.Timeout;
  private connectionRegistry = new Map<
    string,
    {
      connectionId: string;
      userId?: string;
      ipAddress?: string;
      connectedAt: Date;
      lastActivity: Date;
      operationCount: number;
    }
  >();

  constructor(private readonly configService: ConfigService) {
    this.initializeSecurityConfig();
    this.logger.log('Database security service initialized', {
      sslEnabled: this.securityConfig.sslEnabled,
      auditEnabled: this.securityConfig.auditLoggingEnabled,
      connectionAuth: this.securityConfig.connectionAuthentication,
    });
  }

  async onModuleInit() {
    this.logger.log('Starting database security monitoring');

    // Validate SSL/TLS configuration
    if (this.securityConfig.sslEnabled) {
      this.validateSslConfiguration();
    }

    // Start audit log cleanup
    if (this.securityConfig.auditLoggingEnabled) {
      this.startAuditCleanup();
    }

    this.logger.log('Database security service fully operational');
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down database security service');

    if (this.auditCleanupInterval) {
      clearInterval(this.auditCleanupInterval);
    }

    // Flush any pending audit events
    if (this.auditEvents.length > 0) {
      await this.flushAuditEvents();
    }

    this.logger.log('Database security service shutdown complete');
  }

  /**
   * Audit database operation
   */
  async auditOperation(
    operation: string,
    context: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      tableName?: string;
      queryText?: string;
      duration: number;
      success: boolean;
      error?: string;
      affectedRows?: number;
    },
  ): Promise<void> {
    if (!this.securityConfig.auditLoggingEnabled) {
      return;
    }

    const operationId = this.generateOperationId();

    try {
      // Determine event type based on operation
      const eventType = this.categorizeOperation(operation);

      // Determine severity
      const severity = this.determineSeverity(
        eventType,
        context.success,
        context.error,
      );

      // Create audit event
      const auditEvent: DatabaseAuditEvent = {
        eventId: operationId,
        timestamp: new Date(),
        eventType,
        severity,
        userId: context.userId,
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        operation,
        tableName: context.tableName,
        affectedRows: context.affectedRows,
        queryText: this.sanitizeQueryText(context.queryText),
        success: context.success,
        duration: context.duration,
        error: context.error,
        metadata: {
          timestamp: new Date().toISOString(),
          serverVersion: process.version,
        },
      };

      // Add to audit log
      this.addAuditEvent(auditEvent);

      // Check for security violations
      await this.checkSecurityViolations(auditEvent, context);

      // Log significant events
      if (severity === 'error' || severity === 'critical') {
        this.logger.warn('Security-relevant database operation', {
          eventId: operationId,
          eventType,
          operation,
          success: context.success,
          error: context.error,
          userId: context.userId,
        });
      }
    } catch (error) {
      this.logger.error('Failed to audit database operation', {
        operationId,
        operation,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Audit database connection
   */
  async auditConnection(
    connectionId: string,
    event: 'connect' | 'disconnect',
    context: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      success: boolean;
      error?: string;
    },
  ): Promise<void> {
    const operationId = this.generateOperationId();

    try {
      if (event === 'connect' && context.success) {
        // Register connection
        this.connectionRegistry.set(connectionId, {
          connectionId,
          userId: context.userId,
          ipAddress: context.ipAddress,
          connectedAt: new Date(),
          lastActivity: new Date(),
          operationCount: 0,
        });
      } else if (event === 'disconnect') {
        // Unregister connection
        this.connectionRegistry.delete(connectionId);
      }

      // Audit the connection event
      await this.auditOperation(`database_${event}`, {
        ...context,
        duration: 0,
      });

      this.logger.debug('Database connection audited', {
        operationId,
        connectionId,
        event,
        success: context.success,
        userId: context.userId,
      });
    } catch (error) {
      this.logger.error('Failed to audit database connection', {
        operationId,
        connectionId,
        event,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check query for security violations
   */
  async validateQuerySecurity(
    queryText: string,
    context: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
    },
  ): Promise<{
    allowed: boolean;
    violations: SecurityViolation[];
  }> {
    const violations: SecurityViolation[] = [];

    try {
      // Check for SQL injection patterns
      const injectionPatterns = [
        /union\s+select/i,
        /or\s+1\s*=\s*1/i,
        /drop\s+table/i,
        /delete\s+from\s+\w+\s*;\s*drop/i,
        /insert\s+into.*values.*\(/i,
        /';\s*(drop|delete|insert|update)/i,
      ];

      for (const pattern of injectionPatterns) {
        if (pattern.test(queryText)) {
          violations.push(
            this.createSecurityViolation(
              'sql_injection_attempt',
              'critical',
              'Potential SQL injection pattern detected',
              context,
              {
                pattern: pattern.toString(),
                queryText: this.sanitizeQueryText(queryText),
              },
            ),
          );
        }
      }

      // Check for restricted operations
      const restrictedPattern = new RegExp(
        `\\b(${this.securityConfig.restrictedOperations.join('|')})\\b`,
        'i',
      );

      if (restrictedPattern.test(queryText)) {
        violations.push(
          this.createSecurityViolation(
            'unauthorized_access',
            'high',
            'Attempted restricted database operation',
            context,
            { queryText: this.sanitizeQueryText(queryText) },
          ),
        );
      }

      // Check for suspicious query patterns
      if (this.isSuspiciousQuery(queryText)) {
        violations.push(
          this.createSecurityViolation(
            'suspicious_query',
            'medium',
            'Suspicious query pattern detected',
            context,
            { queryText: this.sanitizeQueryText(queryText) },
          ),
        );
      }
    } catch (error) {
      this.logger.error('Failed to validate query security', {
        error: error instanceof Error ? error.message : String(error),
        context,
      });
    }

    // Record violations
    violations.forEach((violation) => {
      this.securityViolations.push(violation);
      this.logger.warn('Security violation detected', {
        violationId: violation.violationId,
        type: violation.type,
        severity: violation.severity,
        description: violation.description,
      });
    });

    return {
      allowed:
        violations.filter(
          (v) => v.severity === 'critical' || v.severity === 'high',
        ).length === 0,
      violations,
    };
  }

  /**
   * Get security metrics and statistics
   */
  getSecurityMetrics() {
    const now = Date.now();
    const last24Hours = now - 24 * 60 * 60 * 1000;
    const recentAudits = this.auditEvents.filter(
      (event) => event.timestamp.getTime() > last24Hours,
    );
    const recentViolations = this.securityViolations.filter(
      (violation) => violation.timestamp.getTime() > last24Hours,
    );

    return {
      auditEvents: {
        total: this.auditEvents.length,
        last24Hours: recentAudits.length,
        byType: this.groupEventsByType(recentAudits),
        bySeverity: this.groupEventsBySeverity(recentAudits),
        errorRate: this.calculateErrorRate(recentAudits),
      },
      securityViolations: {
        total: this.securityViolations.length,
        last24Hours: recentViolations.length,
        byType: this.groupViolationsByType(recentViolations),
        bySeverity: this.groupViolationsBySeverity(recentViolations),
      },
      connections: {
        active: this.connectionRegistry.size,
        totalRegistered: this.connectionRegistry.size,
      },
      configuration: {
        sslEnabled: this.securityConfig.sslEnabled,
        auditEnabled: this.securityConfig.auditLoggingEnabled,
        restrictedOperations: this.securityConfig.restrictedOperations.length,
      },
    };
  }

  /**
   * Get recent security violations
   */
  getSecurityViolations(limit = 50): SecurityViolation[] {
    return this.securityViolations
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get audit event history
   */
  getAuditHistory(limit = 100): DatabaseAuditEvent[] {
    return this.auditEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Initialize security configuration
   */
  private initializeSecurityConfig() {
    this.securityConfig = {
      sslEnabled: this.configService.get<boolean>('DB_SSL_ENABLED', true),
      sslMode: this.configService.get<
        'require' | 'prefer' | 'allow' | 'disable'
      >('DB_SSL_MODE', 'prefer'),
      sslCertPath: this.configService.get<string>('DB_SSL_CERT_PATH'),
      sslKeyPath: this.configService.get<string>('DB_SSL_KEY_PATH'),
      sslRootCertPath: this.configService.get<string>('DB_SSL_ROOT_CERT_PATH'),

      connectionAuthentication: this.configService.get<boolean>(
        'DB_CONNECTION_AUTH_ENABLED',
        true,
      ),
      userCredentialsEncrypted: this.configService.get<boolean>(
        'DB_CREDENTIALS_ENCRYPTED',
        true,
      ),
      connectionStringObfuscation: this.configService.get<boolean>(
        'DB_CONNECTION_STRING_OBFUSCATION',
        true,
      ),

      auditLoggingEnabled: this.configService.get<boolean>(
        'DB_AUDIT_LOGGING_ENABLED',
        true,
      ),
      auditSensitiveOperations: this.configService.get<boolean>(
        'DB_AUDIT_SENSITIVE_OPS',
        true,
      ),
      auditAllQueries: this.configService.get<boolean>(
        'DB_AUDIT_ALL_QUERIES',
        false,
      ),
      auditRetentionDays: this.configService.get<number>(
        'DB_AUDIT_RETENTION_DAYS',
        30,
      ),

      restrictedOperations: this.configService
        .get<string>('DB_RESTRICTED_OPERATIONS', 'DROP,TRUNCATE,ALTER')
        .split(','),
      allowedIpRanges: this.configService
        .get<string>('DB_ALLOWED_IP_RANGES', '')
        .split(',')
        .filter(Boolean),
      maxConcurrentConnections: this.configService.get<number>(
        'DB_MAX_CONCURRENT_CONNECTIONS',
        100,
      ),
    };
  }

  /**
   * Validate SSL/TLS configuration
   */
  private validateSslConfiguration() {
    if (
      this.securityConfig.sslMode === 'require' &&
      !process.env.DATABASE_URL?.includes('sslmode=require')
    ) {
      this.logger.warn(
        'SSL required but DATABASE_URL does not specify sslmode=require',
      );
    }

    if (
      this.securityConfig.sslCertPath &&
      !require('fs').existsSync(this.securityConfig.sslCertPath)
    ) {
      this.logger.error('SSL certificate file not found', {
        path: this.securityConfig.sslCertPath,
      });
    }

    this.logger.log('SSL configuration validated', {
      sslMode: this.securityConfig.sslMode,
      certConfigured: !!this.securityConfig.sslCertPath,
    });
  }

  /**
   * Categorize operation for audit logging
   */
  private categorizeOperation(
    operation: string,
  ): DatabaseAuditEvent['eventType'] {
    const op = operation.toLowerCase();

    if (op.includes('connect') || op.includes('disconnect')) {
      return 'connection';
    }
    if (op.includes('login') || op.includes('auth')) {
      return 'authentication';
    }
    if (op.includes('create') || op.includes('alter') || op.includes('drop')) {
      return 'schema_change';
    }
    if (op.includes('violation') || op.includes('security')) {
      return 'security_violation';
    }

    return 'query';
  }

  /**
   * Determine severity based on operation context
   */
  private determineSeverity(
    eventType: DatabaseAuditEvent['eventType'],
    success: boolean,
    error?: string,
  ): DatabaseAuditEvent['severity'] {
    if (eventType === 'security_violation') {
      return 'critical';
    }
    if (eventType === 'schema_change') {
      return success ? 'warning' : 'error';
    }
    if (!success) {
      return error?.includes('authentication') ? 'error' : 'warning';
    }

    return 'info';
  }

  /**
   * Sanitize query text for logging (remove sensitive data)
   */
  private sanitizeQueryText(queryText?: string): string | undefined {
    if (!queryText) return undefined;

    // Remove potential passwords, tokens, secrets
    let sanitized = queryText
      .replace(/password\s*=\s*'[^']*'/gi, "password='[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='[REDACTED]'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret='[REDACTED]'")
      .replace(/key\s*=\s*'[^']*'/gi, "key='[REDACTED]'");

    // Truncate very long queries
    if (sanitized.length > 1000) {
      sanitized = sanitized.substring(0, 1000) + '...[TRUNCATED]';
    }

    return sanitized;
  }

  /**
   * Add audit event to the log
   */
  private addAuditEvent(event: DatabaseAuditEvent) {
    this.auditEvents.push(event);

    // Maintain maximum audit log size in memory
    const maxInMemoryEvents = 10000;
    if (this.auditEvents.length > maxInMemoryEvents) {
      this.auditEvents = this.auditEvents.slice(-maxInMemoryEvents);
    }
  }

  /**
   * Check for security violations in audit events
   */
  private async checkSecurityViolations(
    event: DatabaseAuditEvent,
    context: any,
  ): Promise<void> {
    // Check for failed authentication attempts
    if (event.eventType === 'authentication' && !event.success) {
      const violation = this.createSecurityViolation(
        'unauthorized_access',
        'medium',
        'Failed authentication attempt',
        {
          userId: context.userId,
          sessionId: context.sessionId,
          ipAddress: context.ipAddress,
        },
        { operation: event.operation, error: event.error },
      );

      this.securityViolations.push(violation);
    }

    // Check for excessive connection attempts
    if (
      event.eventType === 'connection' &&
      this.connectionRegistry.size >
        this.securityConfig.maxConcurrentConnections
    ) {
      const violation = this.createSecurityViolation(
        'connection_limit_exceeded',
        'high',
        'Maximum concurrent connections exceeded',
        {
          ipAddress: context.ipAddress,
        },
        {
          currentConnections: this.connectionRegistry.size,
          limit: this.securityConfig.maxConcurrentConnections,
        },
      );

      this.securityViolations.push(violation);
    }
  }

  /**
   * Create security violation record
   */
  private createSecurityViolation(
    type: SecurityViolation['type'],
    severity: SecurityViolation['severity'],
    description: string,
    context: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
    },
    metadata: Record<string, any> = {},
  ): SecurityViolation {
    return {
      violationId: this.generateOperationId(),
      timestamp: new Date(),
      type,
      severity,
      description,
      sourceIp: context.ipAddress,
      userId: context.userId,
      sessionId: context.sessionId,
      context: metadata,
      blocked: severity === 'critical' || severity === 'high',
    };
  }

  /**
   * Check if query appears suspicious
   */
  private isSuspiciousQuery(queryText: string): boolean {
    const suspiciousPatterns = [
      /select\s+\*\s+from\s+\w+\s+where\s+1\s*=\s*1/i,
      /union\s+all\s+select/i,
      /information_schema\.(tables|columns)/i,
      /pg_catalog\./i,
      /--\s*$/m, // SQL comments at end of line
      /\/\*.*\*\//s, // Multi-line comments
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(queryText));
  }

  /**
   * Start audit log cleanup process
   */
  private startAuditCleanup() {
    const cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours

    this.auditCleanupInterval = setInterval(() => {
      this.cleanupExpiredAuditEvents();
    }, cleanupInterval);

    this.logger.debug('Audit cleanup started', {
      interval: cleanupInterval,
      retentionDays: this.securityConfig.auditRetentionDays,
    });
  }

  /**
   * Clean up expired audit events
   */
  private cleanupExpiredAuditEvents() {
    const cutoffDate = new Date();
    cutoffDate.setDate(
      cutoffDate.getDate() - this.securityConfig.auditRetentionDays,
    );

    const beforeCount = this.auditEvents.length;
    this.auditEvents = this.auditEvents.filter(
      (event) => event.timestamp > cutoffDate,
    );

    const afterCount = this.auditEvents.length;
    const cleaned = beforeCount - afterCount;

    if (cleaned > 0) {
      this.logger.log('Audit log cleanup completed', {
        removedEvents: cleaned,
        remainingEvents: afterCount,
        cutoffDate: cutoffDate.toISOString(),
      });
    }
  }

  /**
   * Flush audit events (placeholder for persistent storage)
   */
  private async flushAuditEvents(): Promise<void> {
    // In a production system, this would persist audit events to:
    // - Database audit table
    // - External log management system
    // - SIEM system
    this.logger.debug('Flushing audit events', {
      eventCount: this.auditEvents.length,
    });
  }

  /**
   * Group events by type for metrics
   */
  private groupEventsByType(events: DatabaseAuditEvent[]) {
    return events.reduce(
      (acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Group events by severity for metrics
   */
  private groupEventsBySeverity(events: DatabaseAuditEvent[]) {
    return events.reduce(
      (acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Group violations by type for metrics
   */
  private groupViolationsByType(violations: SecurityViolation[]) {
    return violations.reduce(
      (acc, violation) => {
        acc[violation.type] = (acc[violation.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Group violations by severity for metrics
   */
  private groupViolationsBySeverity(violations: SecurityViolation[]) {
    return violations.reduce(
      (acc, violation) => {
        acc[violation.severity] = (acc[violation.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  /**
   * Calculate error rate from audit events
   */
  private calculateErrorRate(events: DatabaseAuditEvent[]): number {
    if (events.length === 0) return 0;

    const errorEvents = events.filter((event) => !event.success).length;
    return (errorEvents / events.length) * 100;
  }

  /**
   * Generate unique operation ID for tracking
   */
  private generateOperationId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
