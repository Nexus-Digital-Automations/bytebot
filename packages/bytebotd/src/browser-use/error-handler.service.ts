/**
 * Comprehensive Error Handler Service for Browser Automation
 * Service Layer Implementation for Browser-Use API Endpoints
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

import {
  IBrowserError,
  IServiceResponse,
} from './interfaces/browser-automation.interface';

import { ServiceResponseDto } from './dto/browser-automation.dto';

export interface ErrorReport {
  id: string;
  timestamp: Date;
  service: string;
  operation: string;
  error: IBrowserError;
  context: any;
  resolved: boolean;
  resolution?: {
    method: string;
    timestamp: Date;
    notes: string;
  };
}

export interface ErrorStatistics {
  totalErrors: number;
  errorsByService: { [service: string]: number };
  errorsByCode: { [code: string]: number };
  errorsBySeverity: { [severity: string]: number };
  recentErrors: ErrorReport[];
  resolutionRate: number;
  averageResolutionTime: number;
}

@Injectable()
export class ErrorHandlerService extends EventEmitter {
  private readonly logger = new Logger(ErrorHandlerService.name);
  private errorReports: Map<string, ErrorReport> = new Map();
  private errorStatistics: ErrorStatistics;
  private maxErrorHistory: number;

  constructor() {
    super();
    this.maxErrorHistory = parseInt(process.env.MAX_ERROR_HISTORY || '1000');
    this.initializeStatistics();
    this.logger.log(
      'ErrorHandlerService initialized with comprehensive error tracking',
    );
  }

  /**
   * Handle and log browser automation errors
   */
  handleError(
    service: string,
    operation: string,
    error: any,
    context?: any,
  ): IBrowserError {
    const browserError = this.normalizeToBrowserError(error, context);
    const errorReport = this.createErrorReport(
      service,
      operation,
      browserError,
      context,
    );

    // Store error report
    this.errorReports.set(errorReport.id, errorReport);
    this.updateStatistics(errorReport);

    // Emit error event for monitoring
    this.emit('error', errorReport);

    // Log based on severity
    this.logError(errorReport);

    // Apply error mitigation strategies if available
    this.applyErrorMitigation(errorReport);

    // Cleanup old errors if needed
    this.cleanupOldErrors();

    return browserError;
  }

  /**
   * Create standardized browser error from any error type
   */
  normalizeToBrowserError(error: any, context?: any): IBrowserError {
    // If already a browser error, return as-is
    if (this.isBrowserError(error)) {
      return error;
    }

    // Handle different error types
    let code = 'UNKNOWN_ERROR';
    let message = 'An unknown error occurred';
    let severity: 'info' | 'warning' | 'error' | 'critical' = 'error';

    if (error instanceof Error) {
      message = error.message;
      code = this.inferErrorCode(error, context);
      severity = this.inferErrorSeverity(error, context);
    } else if (typeof error === 'string') {
      message = error;
      code = 'STRING_ERROR';
    } else if (typeof error === 'object' && error !== null) {
      message = error.message || JSON.stringify(error);
      code = error.code || error.name || 'OBJECT_ERROR';
    }

    return {
      code,
      message,
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: new Date(),
      severity,
    };
  }

  /**
   * Resolve an error (mark as resolved)
   */
  resolveError(
    errorId: string,
    resolution: {
      method: string;
      notes: string;
    },
  ): ServiceResponseDto<ErrorReport> {
    const errorReport = this.errorReports.get(errorId);

    if (!errorReport) {
      return {
        success: false,
        error: this.normalizeToBrowserError(
          new Error(`Error report ${errorId} not found`),
          { errorId },
        ),
      };
    }

    errorReport.resolved = true;
    errorReport.resolution = {
      method: resolution.method,
      timestamp: new Date(),
      notes: resolution.notes,
    };

    this.errorReports.set(errorId, errorReport);
    this.updateResolutionStatistics();

    this.emit('errorResolved', errorReport);
    this.logger.log(`Error ${errorId} resolved using ${resolution.method}`);

    return {
      success: true,
      data: errorReport,
      metadata: {
        timestamp: new Date(),
      },
    };
  }

  /**
   * Get error report by ID
   */
  getErrorReport(errorId: string): ServiceResponseDto<ErrorReport> {
    const errorReport = this.errorReports.get(errorId);

    if (!errorReport) {
      return {
        success: false,
        error: this.normalizeToBrowserError(
          new Error(`Error report ${errorId} not found`),
          { errorId },
        ),
      };
    }

    return {
      success: true,
      data: errorReport,
      metadata: {
        timestamp: new Date(),
      },
    };
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): ServiceResponseDto<ErrorStatistics> {
    this.updateStatisticsCalculations();

    return {
      success: true,
      data: this.errorStatistics,
      metadata: {
        timestamp: new Date(),
      },
    };
  }

  /**
   * Get recent errors with optional filtering
   */
  getRecentErrors(options?: {
    service?: string;
    severity?: string;
    limit?: number;
    resolved?: boolean;
  }): ServiceResponseDto<ErrorReport[]> {
    let errors = Array.from(this.errorReports.values());

    // Apply filters
    if (options?.service) {
      errors = errors.filter((err) => err.service === options.service);
    }

    if (options?.severity) {
      errors = errors.filter((err) => err.error.severity === options.severity);
    }

    if (options?.resolved !== undefined) {
      errors = errors.filter((err) => err.resolved === options.resolved);
    }

    // Sort by timestamp (newest first)
    errors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (options?.limit) {
      errors = errors.slice(0, options.limit);
    }

    return {
      success: true,
      data: errors,
      metadata: {
        timestamp: new Date(),
        total: this.errorReports.size,
        filtered: errors.length,
      },
    };
  }

  /**
   * Generate error report for debugging
   */
  generateErrorReport(options?: {
    includeResolved?: boolean;
    timeRange?: { start: Date; end: Date };
  }): ServiceResponseDto<any> {
    const allErrors = Array.from(this.errorReports.values());
    let filteredErrors = allErrors;

    // Filter by resolution status
    if (options?.includeResolved === false) {
      filteredErrors = filteredErrors.filter((err) => !err.resolved);
    }

    // Filter by time range
    if (options?.timeRange) {
      filteredErrors = filteredErrors.filter(
        (err) =>
          err.timestamp >= options.timeRange!.start &&
          err.timestamp <= options.timeRange!.end,
      );
    }

    // Group errors by service
    const errorsByService = filteredErrors.reduce(
      (acc, err) => {
        if (!acc[err.service]) {
          acc[err.service] = [];
        }
        acc[err.service].push(err);
        return acc;
      },
      {} as { [service: string]: ErrorReport[] },
    );

    // Group errors by code
    const errorsByCode = filteredErrors.reduce(
      (acc, err) => {
        const code = err.error.code;
        if (!acc[code]) {
          acc[code] = [];
        }
        acc[code].push(err);
        return acc;
      },
      {} as { [code: string]: ErrorReport[] },
    );

    // Calculate trends
    const trends = this.calculateErrorTrends(filteredErrors);

    const report = {
      summary: {
        totalErrors: filteredErrors.length,
        resolvedErrors: filteredErrors.filter((err) => err.resolved).length,
        unresolvedErrors: filteredErrors.filter((err) => !err.resolved).length,
        criticalErrors: filteredErrors.filter(
          (err) => err.error.severity === 'critical',
        ).length,
        timeRange: options?.timeRange,
      },
      errorsByService,
      errorsByCode,
      trends,
      recentCriticalErrors: filteredErrors
        .filter((err) => err.error.severity === 'critical' && !err.resolved)
        .slice(0, 10),
      statistics: this.errorStatistics,
    };

    return {
      success: true,
      data: report,
      metadata: {
        timestamp: new Date(),
        generatedFor: options,
      },
    };
  }

  /**
   * Clear resolved errors older than specified time
   */
  clearOldResolvedErrors(
    olderThanHours: number = 24,
  ): ServiceResponseDto<number> {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let clearedCount = 0;

    for (const [id, errorReport] of this.errorReports.entries()) {
      if (errorReport.resolved && errorReport.timestamp < cutoffTime) {
        this.errorReports.delete(id);
        clearedCount++;
      }
    }

    this.updateStatisticsCalculations();

    this.logger.log(
      `Cleared ${clearedCount} resolved errors older than ${olderThanHours} hours`,
    );

    return {
      success: true,
      data: clearedCount,
      metadata: {
        timestamp: new Date(),
        cutoffTime,
        olderThanHours,
      },
    };
  }

  /**
   * Create error report
   */
  private createErrorReport(
    service: string,
    operation: string,
    browserError: IBrowserError,
    context?: any,
  ): ErrorReport {
    const id = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      timestamp: new Date(),
      service,
      operation,
      error: browserError,
      context,
      resolved: false,
    };
  }

  /**
   * Check if object is a browser error
   */
  private isBrowserError(obj: any): obj is IBrowserError {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.code === 'string' &&
      typeof obj.message === 'string' &&
      obj.timestamp instanceof Date &&
      ['info', 'warning', 'error', 'critical'].includes(obj.severity)
    );
  }

  /**
   * Infer error code from error and context
   */
  private inferErrorCode(error: Error, context?: any): string {
    // Check for specific error types
    if (error.name) {
      if (error.name.includes('Timeout')) return 'TIMEOUT_ERROR';
      if (error.name.includes('Network')) return 'NETWORK_ERROR';
      if (error.name.includes('Python')) return 'PYTHON_ERROR';
      if (error.name.includes('Browser')) return 'BROWSER_ERROR';
    }

    // Check error message for patterns
    const message = error.message.toLowerCase();
    if (message.includes('timeout')) return 'TIMEOUT_ERROR';
    if (message.includes('network')) return 'NETWORK_ERROR';
    if (message.includes('connection')) return 'CONNECTION_ERROR';
    if (message.includes('permission')) return 'PERMISSION_ERROR';
    if (message.includes('not found')) return 'NOT_FOUND_ERROR';
    if (message.includes('invalid')) return 'VALIDATION_ERROR';

    // Check context for service-specific patterns
    if (context?.sessionId) return 'SESSION_ERROR';
    if (context?.selector) return 'ELEMENT_ERROR';
    if (context?.script) return 'SCRIPT_ERROR';

    return error.name || 'UNKNOWN_ERROR';
  }

  /**
   * Infer error severity from error and context
   */
  private inferErrorSeverity(
    error: Error,
    context?: any,
  ): 'info' | 'warning' | 'error' | 'critical' {
    const message = error.message.toLowerCase();

    // Critical errors
    if (message.includes('fatal') || message.includes('critical')) {
      return 'critical';
    }

    // Timeout and connection issues are usually critical for browser automation
    if (message.includes('timeout') || message.includes('connection refused')) {
      return 'critical';
    }

    // Permission and authentication issues are critical
    if (
      message.includes('permission denied') ||
      message.includes('unauthorized')
    ) {
      return 'critical';
    }

    // Element not found is usually an error but not critical
    if (message.includes('not found') || message.includes('element')) {
      return 'error';
    }

    // Validation issues are usually warnings
    if (message.includes('invalid') || message.includes('validation')) {
      return 'warning';
    }

    // Default to error for Error objects
    return 'error';
  }

  /**
   * Log error based on severity
   */
  private logError(errorReport: ErrorReport): void {
    const logMessage = `[${errorReport.service}:${errorReport.operation}] ${errorReport.error.message}`;
    const logContext = {
      errorId: errorReport.id,
      code: errorReport.error.code,
      context: errorReport.context,
    };

    switch (errorReport.error.severity) {
      case 'critical':
        this.logger.error(`CRITICAL: ${logMessage}`, logContext);
        break;
      case 'error':
        this.logger.error(logMessage, logContext);
        break;
      case 'warning':
        this.logger.warn(logMessage, logContext);
        break;
      case 'info':
        this.logger.log(logMessage, logContext);
        break;
    }
  }

  /**
   * Apply error mitigation strategies
   */
  private applyErrorMitigation(errorReport: ErrorReport): void {
    // Auto-resolve certain types of errors
    if (this.shouldAutoResolve(errorReport)) {
      this.resolveError(errorReport.id, {
        method: 'auto-resolution',
        notes: 'Automatically resolved based on error pattern',
      });
      return;
    }

    // Emit specific events for error handling
    if (errorReport.error.severity === 'critical') {
      this.emit('criticalError', errorReport);
    }

    // Service-specific mitigation
    switch (errorReport.service) {
      case 'BrowserSessionService':
        this.handleSessionErrors(errorReport);
        break;
      case 'BrowserInteractionService':
        this.handleInteractionErrors(errorReport);
        break;
      case 'PythonIntegrationService':
        this.handlePythonErrors(errorReport);
        break;
    }
  }

  /**
   * Check if error should be auto-resolved
   */
  private shouldAutoResolve(errorReport: ErrorReport): boolean {
    const autoResolveCodes = [
      'ELEMENT_NOT_VISIBLE', // Temporary visibility issues
      'MINOR_TIMEOUT', // Short timeouts that might be transient
    ];

    return autoResolveCodes.includes(errorReport.error.code);
  }

  /**
   * Handle session-specific errors
   */
  private handleSessionErrors(errorReport: ErrorReport): void {
    switch (errorReport.error.code) {
      case 'SESSION_TIMEOUT':
        this.emit('sessionCleanupRequired', errorReport.context?.sessionId);
        break;
      case 'MAX_SESSIONS_EXCEEDED':
        this.emit('sessionLimitReached');
        break;
    }
  }

  /**
   * Handle interaction-specific errors
   */
  private handleInteractionErrors(errorReport: ErrorReport): void {
    switch (errorReport.error.code) {
      case 'ELEMENT_NOT_FOUND':
        this.emit('elementSearchRequired', {
          selector: errorReport.context?.selector,
          sessionId: errorReport.context?.sessionId,
        });
        break;
      case 'INTERACTION_TIMEOUT':
        this.emit('interactionRetryRequired', errorReport.context);
        break;
    }
  }

  /**
   * Handle Python integration errors
   */
  private handlePythonErrors(errorReport: ErrorReport): void {
    switch (errorReport.error.code) {
      case 'PYTHON_NOT_FOUND':
        this.emit('pythonInstallationRequired');
        break;
      case 'BROWSER_USE_NOT_FOUND':
        this.emit('browserUseInstallationRequired');
        break;
      case 'PYTHON_TIMEOUT':
        this.emit('pythonProcessCleanupRequired');
        break;
    }
  }

  /**
   * Initialize error statistics
   */
  private initializeStatistics(): void {
    this.errorStatistics = {
      totalErrors: 0,
      errorsByService: {},
      errorsByCode: {},
      errorsBySeverity: {},
      recentErrors: [],
      resolutionRate: 0,
      averageResolutionTime: 0,
    };
  }

  /**
   * Update statistics when new error is added
   */
  private updateStatistics(errorReport: ErrorReport): void {
    this.errorStatistics.totalErrors++;

    // Update by service
    this.errorStatistics.errorsByService[errorReport.service] =
      (this.errorStatistics.errorsByService[errorReport.service] || 0) + 1;

    // Update by code
    this.errorStatistics.errorsByCode[errorReport.error.code] =
      (this.errorStatistics.errorsByCode[errorReport.error.code] || 0) + 1;

    // Update by severity
    this.errorStatistics.errorsBySeverity[errorReport.error.severity] =
      (this.errorStatistics.errorsBySeverity[errorReport.error.severity] || 0) +
      1;

    // Update recent errors (keep last 50)
    this.errorStatistics.recentErrors.unshift(errorReport);
    this.errorStatistics.recentErrors = this.errorStatistics.recentErrors.slice(
      0,
      50,
    );
  }

  /**
   * Update resolution statistics
   */
  private updateResolutionStatistics(): void {
    const allErrors = Array.from(this.errorReports.values());
    const resolvedErrors = allErrors.filter((err) => err.resolved);

    if (allErrors.length > 0) {
      this.errorStatistics.resolutionRate =
        resolvedErrors.length / allErrors.length;
    }

    // Calculate average resolution time for resolved errors
    if (resolvedErrors.length > 0) {
      const totalResolutionTime = resolvedErrors.reduce((total, err) => {
        if (err.resolution) {
          return (
            total +
            (err.resolution.timestamp.getTime() - err.timestamp.getTime())
          );
        }
        return total;
      }, 0);

      this.errorStatistics.averageResolutionTime =
        totalResolutionTime / resolvedErrors.length;
    }
  }

  /**
   * Update calculated statistics
   */
  private updateStatisticsCalculations(): void {
    this.updateResolutionStatistics();
  }

  /**
   * Calculate error trends
   */
  private calculateErrorTrends(errors: ErrorReport[]): any {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const last24HoursErrors = errors.filter(
      (err) => err.timestamp >= last24Hours,
    );
    const last7DaysErrors = errors.filter((err) => err.timestamp >= last7Days);

    return {
      last24Hours: {
        total: last24HoursErrors.length,
        critical: last24HoursErrors.filter(
          (err) => err.error.severity === 'critical',
        ).length,
        resolved: last24HoursErrors.filter((err) => err.resolved).length,
      },
      last7Days: {
        total: last7DaysErrors.length,
        critical: last7DaysErrors.filter(
          (err) => err.error.severity === 'critical',
        ).length,
        resolved: last7DaysErrors.filter((err) => err.resolved).length,
      },
    };
  }

  /**
   * Cleanup old errors to prevent memory leaks
   */
  private cleanupOldErrors(): void {
    if (this.errorReports.size <= this.maxErrorHistory) {
      return;
    }

    // Get all errors sorted by timestamp (oldest first)
    const allErrors = Array.from(this.errorReports.entries()).sort(
      ([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    // Remove oldest errors until we're under the limit
    const toRemove = allErrors.slice(
      0,
      this.errorReports.size - this.maxErrorHistory,
    );

    for (const [id] of toRemove) {
      this.errorReports.delete(id);
    }

    this.logger.log(`Cleaned up ${toRemove.length} old error reports`);
  }
}
