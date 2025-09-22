/**
 * Advanced Logging Utility for Network Security Testing
 * Provides comprehensive logging with multiple output formats and security-aware features
 */

import * as winston from 'winston';
import * as path from 'path';
import { createHash } from 'crypto';

export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  operation?: string;
  target?: string;
  scanId?: string;
  [key: string]: any;
}

export interface SecurityLogEvent {
  level: string;
  message: string;
  timestamp: Date;
  context: LogContext;
  sensitive?: boolean;
  hash?: string;
}

export class Logger {
  private winston: winston.Logger;
  private component: string;
  private sensitiveFields = new Set(['password', 'token', 'secret', 'key', 'credential']);

  constructor(component: string) {
    this.component = component;
    this.winston = this.createLogger();
  }

  /**
   * Log debug message
   */
  public debug(message: string, context: LogContext = {}): void {
    this.log('debug', message, context);
  }

  /**
   * Log info message
   */
  public info(message: string, context: LogContext = {}): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  public warn(message: string, context: LogContext = {}): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message
   */
  public error(message: string, context: LogContext = {}): void {
    this.log('error', message, context);
  }

  /**
   * Log fatal error message
   */
  public fatal(message: string, context: LogContext = {}): void {
    this.log('error', `FATAL: ${message}`, context);
  }

  /**
   * Log security event
   */
  public security(message: string, context: LogContext = {}): void {
    this.log('warn', `SECURITY: ${message}`, { ...context, security: true });
  }

  /**
   * Log audit event
   */
  public audit(message: string, context: LogContext = {}): void {
    this.log('info', `AUDIT: ${message}`, { ...context, audit: true });
  }

  /**
   * Log performance metrics
   */
  public performance(operation: string, duration: number, context: LogContext = {}): void {
    this.log('info', `PERFORMANCE: ${operation} completed in ${duration}ms`, {
      ...context,
      performance: true,
      operation,
      duration
    });
  }

  /**
   * Create child logger with additional context
   */
  public child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(this.component);

    // Override the log method to include additional context
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level: string, message: string, context: LogContext = {}) => {
      originalLog(level, message, { ...additionalContext, ...context });
    };

    return childLogger;
  }

  /**
   * Core logging method
   */
  private log(level: string, message: string, context: LogContext = {}): void {
    const logContext = {
      component: this.component,
      ...context
    };

    // Sanitize sensitive data
    const sanitizedContext = this.sanitizeContext(logContext);

    // Create security log event
    const logEvent: SecurityLogEvent = {
      level,
      message,
      timestamp: new Date(),
      context: sanitizedContext,
      sensitive: this.containsSensitiveData(logContext)
    };

    // Add hash for sensitive events
    if (logEvent.sensitive) {
      logEvent.hash = this.createHash(JSON.stringify(logContext));
    }

    this.winston.log(level, message, logEvent);
  }

  /**
   * Create Winston logger instance
   */
  private createLogger(): winston.Logger {
    const logDir = process.env.LOG_DIR || 'logs';
    const logLevel = process.env.LOG_LEVEL || 'info';

    return winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'network-security-testing',
        component: this.component
      },
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, component, ...meta }) => {
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} [${component}] ${level}: ${message}${metaStr}`;
            })
          )
        }),

        // File transport for all logs
        new winston.transports.File({
          filename: path.join(logDir, 'network-security.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true
        }),

        // Separate file for error logs
        new winston.transports.File({
          filename: path.join(logDir, 'network-security-errors.log'),
          level: 'error',
          maxsize: 5 * 1024 * 1024, // 5MB
          maxFiles: 3,
          tailable: true
        }),

        // Separate file for security events
        new winston.transports.File({
          filename: path.join(logDir, 'network-security-audit.log'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format.printf((info) => {
              if (info.context?.security || info.context?.audit) {
                return JSON.stringify(info);
              }
              return '';
            })
          )
        })
      ],

      // Handle exceptions and rejections
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(logDir, 'network-security-exceptions.log')
        })
      ],
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(logDir, 'network-security-rejections.log')
        })
      ]
    });
  }

  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context: LogContext): LogContext {
    const sanitized: LogContext = {};

    for (const [key, value] of Object.entries(context)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = this.maskSensitiveValue(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize nested objects
   */
  private sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item =>
        typeof item === 'object' && item !== null
          ? this.sanitizeObject(item)
          : item
      );
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = this.maskSensitiveValue(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Check if field contains sensitive data
   */
  private isSensitiveField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();
    return Array.from(this.sensitiveFields).some(sensitive =>
      lowerField.includes(sensitive)
    );
  }

  /**
   * Mask sensitive values
   */
  private maskSensitiveValue(value: any): string {
    if (typeof value === 'string' && value.length > 0) {
      if (value.length <= 4) {
        return '***';
      }
      return value.substring(0, 2) + '***' + value.substring(value.length - 2);
    }
    return '***';
  }

  /**
   * Check if context contains sensitive data
   */
  private containsSensitiveData(context: LogContext): boolean {
    return this.deepCheck(context, (key, value) => {
      return this.isSensitiveField(key) ||
             (typeof value === 'string' && this.looksLikeSensitiveData(value));
    });
  }

  /**
   * Deep check object for condition
   */
  private deepCheck(obj: any, condition: (key: string, value: any) => boolean): boolean {
    for (const [key, value] of Object.entries(obj)) {
      if (condition(key, value)) {
        return true;
      }

      if (typeof value === 'object' && value !== null) {
        if (this.deepCheck(value, condition)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Heuristic check if string looks like sensitive data
   */
  private looksLikeSensitiveData(value: string): boolean {
    // Check for patterns that look like tokens, keys, etc.
    const sensitivePatterns = [
      /^[A-Za-z0-9+/]{20,}={0,2}$/, // Base64-like
      /^[a-f0-9]{32,}$/i,           // Hex strings (32+ chars)
      /^sk_[a-zA-Z0-9_]{20,}$/,     // API keys
      /^ghp_[a-zA-Z0-9]{36}$/,      // GitHub tokens
      /^xox[baprs]-[a-zA-Z0-9-]+$/, // Slack tokens
    ];

    return sensitivePatterns.some(pattern => pattern.test(value));
  }

  /**
   * Create hash for sensitive data
   */
  private createHash(data: string): string {
    return createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Add sensitive field pattern
   */
  public addSensitiveField(field: string): void {
    this.sensitiveFields.add(field.toLowerCase());
  }

  /**
   * Remove sensitive field pattern
   */
  public removeSensitiveField(field: string): void {
    this.sensitiveFields.delete(field.toLowerCase());
  }

  /**
   * Get current log level
   */
  public getLogLevel(): string {
    return this.winston.level;
  }

  /**
   * Set log level
   */
  public setLogLevel(level: string): void {
    this.winston.level = level;
  }

  /**
   * Flush logs (useful for testing)
   */
  public async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.winston.on('finish', resolve);
      this.winston.end();
    });
  }
}