/**
 * MDM Logger Service
 * Enterprise-grade logging with structured output and performance monitoring
 */

import { Injectable, LoggerService, Logger } from '@nestjs/common';

export interface LogContext {
  userId?: string;
  deviceId?: string;
  action?: string;
  resource?: string;
  ip?: string;
  userAgent?: string;
  correlationId?: string;
  [key: string]: any;
}

@Injectable()
export class MdmLogger implements LoggerService {
  private readonly logger = new Logger('MDM');

  log(message: string, context?: LogContext): void {
    this.logger.log(this.formatMessage(message, context));
  }

  error(message: string, trace?: string, context?: LogContext): void {
    this.logger.error(this.formatMessage(message, context), trace);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(this.formatMessage(message, context));
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(this.formatMessage(message, context));
  }

  verbose(message: string, context?: LogContext): void {
    this.logger.verbose(this.formatMessage(message, context));
  }

  private formatMessage(message: string, context?: LogContext): string {
    if (!context) return message;

    const contextStr = Object.entries(context)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');

    return `${message} | ${contextStr}`;
  }

  logDeviceAction(deviceId: string, action: string, userId?: string, metadata?: any): void {
    this.log(`Device action: ${action}`, {
      deviceId,
      userId,
      action,
      metadata: JSON.stringify(metadata)
    });
  }

  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    const logMethod = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'log';
    this[logMethod](`Security event: ${event}`, { ...context, severity });
  }

  logPolicyViolation(deviceId: string, policyId: string, violation: string, context?: LogContext): void {
    this.warn(`Policy violation: ${violation}`, {
      ...context,
      deviceId,
      policyId,
      violation
    });
  }

  logPerformanceMetric(operation: string, duration: number, context?: LogContext): void {
    this.log(`Performance: ${operation} completed in ${duration}ms`, {
      ...context,
      operation,
      duration
    });
  }
}