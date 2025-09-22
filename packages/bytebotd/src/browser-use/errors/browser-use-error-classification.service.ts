/**
 * Browser-Use API Error Classification Service
 *
 * Provides specialized error classification and categorization for browser automation
 * API endpoints with enhanced error handling, recovery strategies, and monitoring.
 *
 * Features:
 * - Browser automation specific error classification
 * - Session management error categorization
 * - DOM interaction error patterns
 * - Network timeout and connectivity handling
 * - Security violation detection
 * - Performance issue identification
 * - Intelligent error recovery recommendations
 * - Comprehensive error analytics and reporting
 *
 * @author Browser-Use API Error Handling Specialist
 * @version 1.0.0
 * @since Browser-Use API Integration
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  AutomationErrorHandlerService,
  AutomationErrorCategory,
  ErrorSeverity,
  AutomationError,
  RecoveryStrategy,
} from '../../common/error-handling/automation-error-handler.service';

/**
 * Browser-Use specific error categories
 */
export enum BrowserUseErrorCategory {
  // Browser Engine Errors
  BROWSER_LAUNCH_FAILED = 'browser_launch_failed',
  BROWSER_CRASH = 'browser_crash',
  BROWSER_TIMEOUT = 'browser_timeout',
  BROWSER_VERSION_INCOMPATIBLE = 'browser_version_incompatible',

  // Session Management Errors
  SESSION_CREATE_FAILED = 'session_create_failed',
  SESSION_NOT_FOUND = 'session_not_found',
  SESSION_EXPIRED = 'session_expired',
  SESSION_CONFLICT = 'session_conflict',
  SESSION_RESOURCE_EXHAUSTED = 'session_resource_exhausted',

  // Page Navigation Errors
  NAVIGATION_FAILED = 'navigation_failed',
  PAGE_LOAD_TIMEOUT = 'page_load_timeout',
  NETWORK_UNREACHABLE = 'network_unreachable',
  SSL_CERTIFICATE_ERROR = 'ssl_certificate_error',
  DNS_RESOLUTION_FAILED = 'dns_resolution_failed',

  // DOM Interaction Errors
  ELEMENT_NOT_FOUND = 'element_not_found',
  ELEMENT_NOT_INTERACTABLE = 'element_not_interactable',
  ELEMENT_STALE_REFERENCE = 'element_stale_reference',
  SELECTOR_INVALID = 'selector_invalid',
  CLICK_INTERCEPTED = 'click_intercepted',

  // Form Automation Errors
  FORM_FIELD_NOT_FOUND = 'form_field_not_found',
  FORM_VALIDATION_FAILED = 'form_validation_failed',
  FORM_SUBMIT_FAILED = 'form_submit_failed',
  INPUT_TYPE_MISMATCH = 'input_type_mismatch',

  // Data Extraction Errors
  DATA_EXTRACTION_FAILED = 'data_extraction_failed',
  CONTENT_PARSING_ERROR = 'content_parsing_error',
  SCREENSHOT_CAPTURE_FAILED = 'screenshot_capture_failed',
  FILE_DOWNLOAD_FAILED = 'file_download_failed',

  // Authentication & Security Errors
  AUTHENTICATION_REQUIRED = 'authentication_required',
  CAPTCHA_DETECTED = 'captcha_detected',
  BOT_DETECTION = 'bot_detection',
  SECURITY_CHALLENGE = 'security_challenge',
  RATE_LIMIT_DETECTED = 'rate_limit_detected',

  // Performance & Resource Errors
  MEMORY_EXHAUSTED = 'memory_exhausted',
  CPU_THROTTLING = 'cpu_throttling',
  DISK_SPACE_FULL = 'disk_space_full',
  PERFORMANCE_DEGRADATION = 'performance_degradation',

  // API Specific Errors
  INVALID_TASK_CONFIGURATION = 'invalid_task_configuration',
  TASK_EXECUTION_TIMEOUT = 'task_execution_timeout',
  CONCURRENT_TASK_LIMIT = 'concurrent_task_limit',
  TASK_QUEUE_FULL = 'task_queue_full',
}

/**
 * Enhanced browser automation error interface
 */
export interface BrowserUseError extends AutomationError {
  readonly browserUseCategory: BrowserUseErrorCategory;
  readonly sessionId?: string;
  readonly taskId?: string;
  readonly pageUrl?: string;
  readonly selector?: string;
  readonly browserInfo?: {
    readonly version: string;
    readonly userAgent: string;
    readonly viewport: { width: number; height: number };
  };
  readonly performanceMetrics?: {
    readonly memoryUsageMB: number;
    readonly cpuUsagePercent: number;
    readonly networkLatencyMs: number;
  };
  readonly recoveryAttempts?: number;
  readonly maxRecoveryAttempts?: number;
}

/**
 * Browser-Use recovery action configuration
 */
export interface BrowserUseRecoveryAction {
  readonly strategy: RecoveryStrategy;
  readonly maxRetries: number;
  readonly backoffMs?: number;
  readonly maxBackoffMs?: number;
  readonly sessionRestart?: boolean;
  readonly browserRelaunch?: boolean;
  readonly clearCache?: boolean;
  readonly changeUserAgent?: boolean;
  readonly retryWithProxy?: boolean;
  readonly waitForStability?: boolean;
  readonly customActions?: string[];
}

/**
 * Error pattern detection interface
 */
interface ErrorPattern {
  readonly pattern: RegExp;
  readonly category: BrowserUseErrorCategory;
  readonly severity: ErrorSeverity;
  readonly indicators: string[];
  readonly recoveryAction: BrowserUseRecoveryAction;
}

/**
 * Browser-Use API Error Classification Service
 */
@Injectable()
export class BrowserUseErrorClassificationService {
  private readonly logger = new Logger(
    BrowserUseErrorClassificationService.name,
  );
  private readonly errorPatterns: Map<string, ErrorPattern> = new Map();
  private readonly errorHistory: Map<string, BrowserUseError[]> = new Map();
  private readonly sessionErrorCounts: Map<string, number> = new Map();

  constructor(
    private readonly automationErrorHandler: AutomationErrorHandlerService,
  ) {
    this.initializeErrorPatterns();
    this.logger.log('Browser-Use Error Classification Service initialized');
  }

  /**
   * Classify and enhance browser-use specific error
   */
  async classifyBrowserUseError(
    error: Error,
    context: {
      sessionId?: string;
      taskId?: string;
      pageUrl?: string;
      selector?: string;
      operation?: string;
      browserInfo?: any;
      performanceMetrics?: any;
    },
  ): Promise<BrowserUseError> {
    const operationId = `error_classify_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Classifying browser-use error`, {
      operationId,
      errorMessage: error.message,
      sessionId: context.sessionId,
      taskId: context.taskId,
      operation: context.operation,
      pageUrl: context.pageUrl,
    });

    try {
      // Detect browser-use specific error category
      const browserUseCategory = this.detectBrowserUseCategory(error, context);

      // Determine error severity
      const severity = this.determineSeverity(
        browserUseCategory,
        error,
        context,
      );

      // Get recovery attempts count
      const recoveryAttempts = this.getRecoveryAttempts(
        context.sessionId,
        browserUseCategory,
      );

      // Create enhanced browser-use error
      const browserUseError: BrowserUseError = {
        errorId: `browser_use_error_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        category: this.mapToAutomationCategory(browserUseCategory),
        browserUseCategory,
        severity,
        message: error.message,
        originalError: error,
        context: {
          ...context,
          operation: context.operation ?? 'unknown',
          errorClassificationTime: Date.now() - startTime,
        },
        timestamp: new Date(),
        operationId: context.taskId,
        sessionId: context.sessionId,
        stackTrace: error.stack,
        pageUrl: context.pageUrl,
        selector: context.selector,
        browserInfo: context.browserInfo,
        performanceMetrics: context.performanceMetrics,
        recoveryAttempts,
        maxRecoveryAttempts: this.getMaxRecoveryAttempts(browserUseCategory),
        metadata: {
          component: 'browser-use-api',
          method: context.operation ?? 'unknown',
          url: context.pageUrl,
          selector: context.selector,
          userAgent: context.browserInfo?.userAgent,
          browserVersion: context.browserInfo?.version,
          retryCount: recoveryAttempts,
          maxRetries: this.getMaxRecoveryAttempts(browserUseCategory),
        },
      };

      // Store error in history
      this.storeErrorInHistory(browserUseError);

      // Update session error count
      if (context.sessionId) {
        const currentCount =
          this.sessionErrorCounts.get(context.sessionId) || 0;
        this.sessionErrorCounts.set(context.sessionId, currentCount + 1);
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`[${operationId}] Error classification completed`, {
        operationId,
        browserUseCategory,
        severity,
        recoveryAttempts,
        duration,
      });

      return browserUseError;
    } catch (classificationError) {
      const duration = Date.now() - startTime;

      this.logger.error(`[${operationId}] Error classification failed`, {
        operationId,
        originalError: error.message,
        classificationError:
          classificationError instanceof Error
            ? classificationError.message
            : String(classificationError),
        duration,
      });

      // Return minimal error if classification fails
      return {
        errorId: `browser_use_error_fallback_${Date.now()}`,
        category: AutomationErrorCategory.UNKNOWN_ERROR,
        browserUseCategory: BrowserUseErrorCategory.TASK_EXECUTION_TIMEOUT,
        severity: ErrorSeverity.HIGH,
        message: error.message,
        originalError: error,
        context: { ...context, classificationFailed: true },
        timestamp: new Date(),
        sessionId: context.sessionId,
        stackTrace: error.stack,
        recoveryAttempts: 0,
        maxRecoveryAttempts: 3,
        metadata: {
          component: 'browser-use-api',
          method: context.operation ?? 'unknown',
          retryCount: 0,
          maxRetries: 3,
        },
      };
    }
  }

  /**
   * Get recommended recovery action for browser-use error
   */
  getRecoveryAction(error: BrowserUseError): BrowserUseRecoveryAction {
    const category = error.browserUseCategory;
    const recoveryAttempts = error.recoveryAttempts || 0;

    // Progressive recovery strategies based on attempt count
    switch (category) {
      case BrowserUseErrorCategory.BROWSER_LAUNCH_FAILED:
      case BrowserUseErrorCategory.BROWSER_CRASH:
        return {
          strategy: RecoveryStrategy.RETRY,
          maxRetries: 3,
          backoffMs: 2000,
          maxBackoffMs: 8000,
          browserRelaunch: true,
          clearCache: recoveryAttempts > 1,
          changeUserAgent: recoveryAttempts > 2,
        };

      case BrowserUseErrorCategory.SESSION_CREATE_FAILED:
      case BrowserUseErrorCategory.SESSION_EXPIRED:
        return {
          strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
          maxRetries: 2,
          backoffMs: 1000,
          maxBackoffMs: 5000,
          sessionRestart: true,
          clearCache: recoveryAttempts > 0,
        };

      case BrowserUseErrorCategory.NAVIGATION_FAILED:
      case BrowserUseErrorCategory.PAGE_LOAD_TIMEOUT:
        return {
          strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
          maxRetries: 3,
          backoffMs: 1500,
          maxBackoffMs: 10000,
          waitForStability: true,
          retryWithProxy: recoveryAttempts > 1,
        };

      case BrowserUseErrorCategory.ELEMENT_NOT_FOUND:
      case BrowserUseErrorCategory.ELEMENT_NOT_INTERACTABLE:
        return {
          strategy: RecoveryStrategy.RETRY,
          maxRetries: 5,
          backoffMs: 500,
          maxBackoffMs: 3000,
          waitForStability: true,
          customActions: ['scroll_to_element', 'wait_for_element'],
        };

      case BrowserUseErrorCategory.BOT_DETECTION:
      case BrowserUseErrorCategory.CAPTCHA_DETECTED:
        return {
          strategy: RecoveryStrategy.MANUAL_INTERVENTION,
          maxRetries: 0,
          changeUserAgent: true,
          retryWithProxy: true,
          customActions: ['human_verification_required'],
        };

      case BrowserUseErrorCategory.MEMORY_EXHAUSTED:
      case BrowserUseErrorCategory.PERFORMANCE_DEGRADATION:
        return {
          strategy: RecoveryStrategy.GRACEFUL_DEGRADATION,
          maxRetries: 1,
          sessionRestart: true,
          clearCache: true,
          customActions: ['reduce_concurrent_sessions', 'garbage_collect'],
        };

      case BrowserUseErrorCategory.RATE_LIMIT_DETECTED:
        return {
          strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
          maxRetries: 3,
          backoffMs: 5000,
          maxBackoffMs: 30000,
          retryWithProxy: recoveryAttempts > 1,
          changeUserAgent: recoveryAttempts > 2,
        };

      default:
        return {
          strategy: RecoveryStrategy.RETRY,
          maxRetries: 2,
          backoffMs: 1000,
          maxBackoffMs: 5000,
          waitForStability: true,
        };
    }
  }

  /**
   * Get error analytics for browser-use errors
   */
  getErrorAnalytics(timeRange?: { start: Date; end: Date }): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    sessionErrorRates: Record<string, number>;
    topErrorPatterns: Array<{
      pattern: string;
      count: number;
      category: string;
    }>;
    recoverySuccessRates: Record<string, number>;
    performanceImpact: {
      averageErrorResolutionTime: number;
      sessionRestarts: number;
      browserRelaunches: number;
    };
  } {
    const allErrors = Array.from(this.errorHistory.values()).flat();

    // Filter by time range if provided
    const filteredErrors = timeRange
      ? allErrors.filter(
          (e) => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end,
        )
      : allErrors;

    const analytics = {
      totalErrors: filteredErrors.length,
      errorsByCategory: this.groupErrorsByBrowserUseCategory(filteredErrors),
      errorsBySeverity: this.groupErrorsBySeverity(filteredErrors),
      sessionErrorRates: this.calculateSessionErrorRates(filteredErrors),
      topErrorPatterns: this.getTopErrorPatterns(filteredErrors),
      recoverySuccessRates: this.calculateRecoverySuccessRates(filteredErrors),
      performanceImpact: this.calculatePerformanceImpact(filteredErrors),
    };

    this.logger.debug('Browser-Use error analytics generated', {
      totalErrors: analytics.totalErrors,
      timeRange: timeRange
        ? `${timeRange.start.toISOString()} - ${timeRange.end.toISOString()}`
        : 'all time',
      topCategory:
        Object.entries(analytics.errorsByCategory).sort(
          ([, a], [, b]) => b - a,
        )[0]?.[0] || 'none',
    });

    return analytics;
  }

  /**
   * Clear error history for session
   */
  clearSessionErrorHistory(sessionId: string): void {
    this.errorHistory.delete(sessionId);
    this.sessionErrorCounts.delete(sessionId);

    this.logger.debug(`Cleared error history for session: ${sessionId}`);
  }

  // ===== PRIVATE METHODS =====

  private initializeErrorPatterns(): void {
    // Browser engine patterns
    this.errorPatterns.set('browser_launch', {
      pattern:
        /browser.*launch.*failed|could not start browser|browser not found/i,
      category: BrowserUseErrorCategory.BROWSER_LAUNCH_FAILED,
      severity: ErrorSeverity.HIGH,
      indicators: ['browser_launch_failure', 'binary_not_found'],
      recoveryAction: {
        strategy: RecoveryStrategy.RETRY,
        maxRetries: 3,
        backoffMs: 2000,
        browserRelaunch: true,
      },
    });

    // Session management patterns
    this.errorPatterns.set('session_expired', {
      pattern: /session.*expired|session.*not.*found|invalid.*session/i,
      category: BrowserUseErrorCategory.SESSION_EXPIRED,
      severity: ErrorSeverity.MEDIUM,
      indicators: ['session_timeout', 'session_invalidated'],
      recoveryAction: {
        strategy: RecoveryStrategy.RETRY,
        maxRetries: 2,
        sessionRestart: true,
      },
    });

    // Navigation patterns
    this.errorPatterns.set('navigation_timeout', {
      pattern:
        /navigation.*timeout|page.*load.*timeout|timeout.*waiting.*page/i,
      category: BrowserUseErrorCategory.PAGE_LOAD_TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      indicators: ['page_load_slow', 'network_delay'],
      recoveryAction: {
        strategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
        maxRetries: 3,
        backoffMs: 2000,
        waitForStability: true,
      },
    });

    // Element interaction patterns
    this.errorPatterns.set('element_not_found', {
      pattern:
        /element.*not.*found|no.*such.*element|element.*does.*not.*exist/i,
      category: BrowserUseErrorCategory.ELEMENT_NOT_FOUND,
      severity: ErrorSeverity.MEDIUM,
      indicators: ['selector_mismatch', 'dom_not_ready'],
      recoveryAction: {
        strategy: RecoveryStrategy.RETRY,
        maxRetries: 5,
        backoffMs: 500,
        waitForStability: true,
      },
    });

    // Security and bot detection patterns
    this.errorPatterns.set('bot_detection', {
      pattern: /bot.*detected|automation.*detected|suspicious.*activity/i,
      category: BrowserUseErrorCategory.BOT_DETECTION,
      severity: ErrorSeverity.HIGH,
      indicators: ['anti_automation', 'security_measure'],
      recoveryAction: {
        strategy: RecoveryStrategy.MANUAL_INTERVENTION,
        maxRetries: 0,
        changeUserAgent: true,
      },
    });

    this.logger.log(`Initialized ${this.errorPatterns.size} error patterns`);
  }

  private detectBrowserUseCategory(
    error: Error,
    context: { operation?: string; pageUrl?: string; selector?: string },
  ): BrowserUseErrorCategory {
    const message = error.message.toLowerCase();
    const operation = context.operation?.toLowerCase() || '';

    // Check predefined patterns first
    for (const [key, pattern] of this.errorPatterns.entries()) {
      if (pattern.pattern.test(message)) {
        this.logger.debug(`Error matched pattern: ${key}`, {
          pattern: pattern.category,
        });
        return pattern.category;
      }
    }

    // Context-based categorization
    if (operation.includes('launch') || operation.includes('start')) {
      return BrowserUseErrorCategory.BROWSER_LAUNCH_FAILED;
    }

    if (operation.includes('session') || operation.includes('connect')) {
      return BrowserUseErrorCategory.SESSION_CREATE_FAILED;
    }

    if (operation.includes('navigate') || operation.includes('goto')) {
      return BrowserUseErrorCategory.NAVIGATION_FAILED;
    }

    if (
      operation.includes('click') ||
      operation.includes('type') ||
      operation.includes('interact')
    ) {
      return BrowserUseErrorCategory.ELEMENT_NOT_INTERACTABLE;
    }

    if (operation.includes('extract') || operation.includes('scrape')) {
      return BrowserUseErrorCategory.DATA_EXTRACTION_FAILED;
    }

    if (operation.includes('screenshot') || operation.includes('capture')) {
      return BrowserUseErrorCategory.SCREENSHOT_CAPTURE_FAILED;
    }

    // Message-based categorization
    if (message.includes('timeout')) {
      return BrowserUseErrorCategory.TASK_EXECUTION_TIMEOUT;
    }

    if (message.includes('memory') || message.includes('resource')) {
      return BrowserUseErrorCategory.MEMORY_EXHAUSTED;
    }

    if (message.includes('network') || message.includes('connection')) {
      return BrowserUseErrorCategory.NETWORK_UNREACHABLE;
    }

    // Default fallback
    return BrowserUseErrorCategory.TASK_EXECUTION_TIMEOUT;
  }

  private determineSeverity(
    category: BrowserUseErrorCategory,
    error: Error,
    context: any,
  ): ErrorSeverity {
    // Critical errors that require immediate attention
    const criticalCategories = [
      BrowserUseErrorCategory.BROWSER_CRASH,
      BrowserUseErrorCategory.MEMORY_EXHAUSTED,
      BrowserUseErrorCategory.SECURITY_CHALLENGE,
    ];

    if (criticalCategories.includes(category)) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity for security and session issues
    const highSeverityCategories = [
      BrowserUseErrorCategory.BOT_DETECTION,
      BrowserUseErrorCategory.CAPTCHA_DETECTED,
      BrowserUseErrorCategory.SESSION_RESOURCE_EXHAUSTED,
      BrowserUseErrorCategory.AUTHENTICATION_REQUIRED,
    ];

    if (highSeverityCategories.includes(category)) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity for operational issues
    const mediumSeverityCategories = [
      BrowserUseErrorCategory.NAVIGATION_FAILED,
      BrowserUseErrorCategory.PAGE_LOAD_TIMEOUT,
      BrowserUseErrorCategory.SESSION_EXPIRED,
      BrowserUseErrorCategory.FORM_VALIDATION_FAILED,
    ];

    if (mediumSeverityCategories.includes(category)) {
      return ErrorSeverity.MEDIUM;
    }

    // Default to low severity
    return ErrorSeverity.LOW;
  }

  private mapToAutomationCategory(
    browserUseCategory: BrowserUseErrorCategory,
  ): AutomationErrorCategory {
    switch (browserUseCategory) {
      case BrowserUseErrorCategory.BROWSER_LAUNCH_FAILED:
      case BrowserUseErrorCategory.BROWSER_CRASH:
      case BrowserUseErrorCategory.BROWSER_TIMEOUT:
        return AutomationErrorCategory.BROWSER_ERROR;

      case BrowserUseErrorCategory.FORM_FIELD_NOT_FOUND:
      case BrowserUseErrorCategory.FORM_VALIDATION_FAILED:
      case BrowserUseErrorCategory.FORM_SUBMIT_FAILED:
        return AutomationErrorCategory.FORM_ERROR;

      case BrowserUseErrorCategory.DATA_EXTRACTION_FAILED:
      case BrowserUseErrorCategory.CONTENT_PARSING_ERROR:
        return AutomationErrorCategory.DATA_EXTRACTION_ERROR;

      case BrowserUseErrorCategory.NETWORK_UNREACHABLE:
      case BrowserUseErrorCategory.DNS_RESOLUTION_FAILED:
        return AutomationErrorCategory.NETWORK_ERROR;

      case BrowserUseErrorCategory.AUTHENTICATION_REQUIRED:
      case BrowserUseErrorCategory.SECURITY_CHALLENGE:
        return AutomationErrorCategory.AUTHENTICATION_ERROR;

      case BrowserUseErrorCategory.RATE_LIMIT_DETECTED:
        return AutomationErrorCategory.RATE_LIMIT_ERROR;

      case BrowserUseErrorCategory.INVALID_TASK_CONFIGURATION:
        return AutomationErrorCategory.VALIDATION_ERROR;

      case BrowserUseErrorCategory.MEMORY_EXHAUSTED:
      case BrowserUseErrorCategory.CPU_THROTTLING:
        return AutomationErrorCategory.SYSTEM_ERROR;

      default:
        return AutomationErrorCategory.UNKNOWN_ERROR;
    }
  }

  private getRecoveryAttempts(
    sessionId?: string,
    category?: BrowserUseErrorCategory,
  ): number {
    if (!sessionId) return 0;

    const sessionErrors = this.errorHistory.get(sessionId) || [];
    return sessionErrors.filter((e) => e.browserUseCategory === category)
      .length;
  }

  private getMaxRecoveryAttempts(category: BrowserUseErrorCategory): number {
    const maxAttempts = {
      [BrowserUseErrorCategory.ELEMENT_NOT_FOUND]: 5,
      [BrowserUseErrorCategory.ELEMENT_NOT_INTERACTABLE]: 5,
      [BrowserUseErrorCategory.NAVIGATION_FAILED]: 3,
      [BrowserUseErrorCategory.PAGE_LOAD_TIMEOUT]: 3,
      [BrowserUseErrorCategory.BROWSER_LAUNCH_FAILED]: 3,
      [BrowserUseErrorCategory.SESSION_CREATE_FAILED]: 2,
      [BrowserUseErrorCategory.BOT_DETECTION]: 0,
      [BrowserUseErrorCategory.CAPTCHA_DETECTED]: 0,
      [BrowserUseErrorCategory.MEMORY_EXHAUSTED]: 1,
    };

    return maxAttempts[category] || 2;
  }

  private storeErrorInHistory(error: BrowserUseError): void {
    const sessionId = error.sessionId || 'global';

    if (!this.errorHistory.has(sessionId)) {
      this.errorHistory.set(sessionId, []);
    }

    const sessionErrors = this.errorHistory.get(sessionId)!;
    sessionErrors.push(error);

    // Keep only last 100 errors per session
    if (sessionErrors.length > 100) {
      sessionErrors.splice(0, sessionErrors.length - 100);
    }
  }

  private groupErrorsByBrowserUseCategory(
    errors: BrowserUseError[],
  ): Record<string, number> {
    return errors.reduce(
      (acc, error) => {
        acc[error.browserUseCategory] =
          (acc[error.browserUseCategory] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private groupErrorsBySeverity(
    errors: BrowserUseError[],
  ): Record<string, number> {
    return errors.reduce(
      (acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private calculateSessionErrorRates(
    errors: BrowserUseError[],
  ): Record<string, number> {
    const sessionCounts = new Map<string, number>();

    errors.forEach((error) => {
      if (error.sessionId) {
        sessionCounts.set(
          error.sessionId,
          (sessionCounts.get(error.sessionId) || 0) + 1,
        );
      }
    });

    return Object.fromEntries(sessionCounts);
  }

  private getTopErrorPatterns(
    errors: BrowserUseError[],
  ): Array<{ pattern: string; count: number; category: string }> {
    const patternCounts = new Map<
      string,
      { count: number; category: string }
    >();

    errors.forEach((error) => {
      const key = error.message.substring(0, 100); // First 100 chars as pattern
      const current = patternCounts.get(key) || {
        count: 0,
        category: error.browserUseCategory,
      };
      patternCounts.set(key, {
        count: current.count + 1,
        category: current.category,
      });
    });

    return Array.from(patternCounts.entries())
      .map(([pattern, data]) => ({
        pattern,
        count: data.count,
        category: data.category,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateRecoverySuccessRates(
    errors: BrowserUseError[],
  ): Record<string, number> {
    // Mock implementation - in real implementation, track recovery outcomes
    const categories = [...new Set(errors.map((e) => e.browserUseCategory))];

    return categories.reduce(
      (acc, category) => {
        // Simulate success rates based on category type
        const mockSuccessRate = category.includes('timeout')
          ? 0.7
          : category.includes('not_found')
            ? 0.8
            : category.includes('crash')
              ? 0.4
              : 0.75;
        acc[category] = mockSuccessRate;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private calculatePerformanceImpact(errors: BrowserUseError[]): {
    averageErrorResolutionTime: number;
    sessionRestarts: number;
    browserRelaunches: number;
  } {
    // Mock implementation - in real implementation, track actual metrics
    return {
      averageErrorResolutionTime: 2500, // ms
      sessionRestarts: errors.filter((e) =>
        e.browserUseCategory.includes('session'),
      ).length,
      browserRelaunches: errors.filter((e) =>
        e.browserUseCategory.includes('browser'),
      ).length,
    };
  }
}
