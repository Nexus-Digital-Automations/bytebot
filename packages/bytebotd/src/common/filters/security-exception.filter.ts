/**
 * Enterprise Security Exception Filter - Secure Error Handling
 *
 * This filter provides comprehensive error handling with security-focused
 * response sanitization to prevent information disclosure while maintaining
 * proper error logging and monitoring for security incidents.
 *
 * @fileoverview Enterprise-grade secure error handling and response sanitization
 * @version 1.0.0
 * @author Input Validation & API Security Specialist
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';

/**
 * Security-focused error classification
 */
enum SecurityErrorType {
  VALIDATION_ERROR = 'validation_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  SECURITY_VIOLATION = 'security_violation',
  SYSTEM_ERROR = 'system_error',
  INPUT_ERROR = 'input_error',
}

/**
 * Secure error response structure
 */
interface SecureErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path: string;
  requestId: string;
  // Only include in development
  details?: any;
  stack?: string;
}

/**
 * Security metrics for error tracking
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface SecurityErrorMetrics {
  errorType: SecurityErrorType;
  statusCode: number;
  clientIP: string;
  userAgent: string;
  endpoint: string;
  timestamp: Date;
  riskScore: number;
}

@Catch()
export class SecurityExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SecurityExceptionFilter.name);

  // Track error patterns for security analysis
  private errorPatterns = new Map<
    string,
    {
      count: number;
      lastSeen: Date;
      riskScore: number;
    }
  >();

  /**
   * Handle all exceptions with security-focused processing
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Generate request ID for tracking (use existing or create new)
    const requestId =
      (request.headers['x-correlation-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Classify and analyze the exception
    const errorAnalysis = this.analyzeException(exception, request);

    // Create secure error response (never leak sensitive info)
    const secureResponse = this.createSecureResponse(
      exception,
      request,
      requestId,
      errorAnalysis,
    );

    // Log security event with full details (for internal use)
    this.logSecurityEvent(exception, request, errorAnalysis, requestId);

    // Track error patterns for threat detection
    this.trackErrorPattern(request, errorAnalysis);

    // Check for security attack patterns
    if (errorAnalysis.riskScore >= 7) {
      this.handleHighRiskError(request, errorAnalysis, requestId);
    }

    // Set security headers
    response.setHeader('X-Request-ID', requestId);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');

    // Send secure response
    response.status(secureResponse.statusCode).json(secureResponse);
  }

  /**
   * Analyze exception for security classification and risk assessment
   */
  private analyzeException(
    exception: unknown,
    request: Request,
  ): {
    errorType: SecurityErrorType;
    statusCode: number;
    riskScore: number;
    threatIndicators: string[];
    isSecurityRelated: boolean;
  } {
    let errorType = SecurityErrorType.SYSTEM_ERROR;
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let riskScore = 1;
    const threatIndicators: string[] = [];

    // Analyze exception type
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();

      // Classify by HTTP status code
      switch (statusCode) {
        case HttpStatus.BAD_REQUEST:
          errorType = SecurityErrorType.INPUT_ERROR;
          riskScore = 2;
          break;
        case HttpStatus.UNAUTHORIZED:
          errorType = SecurityErrorType.AUTHENTICATION_ERROR;
          riskScore = 4;
          threatIndicators.push('auth_failure');
          break;
        case HttpStatus.FORBIDDEN:
          errorType = SecurityErrorType.AUTHORIZATION_ERROR;
          riskScore = 5;
          threatIndicators.push('access_denied');
          break;
        case HttpStatus.TOO_MANY_REQUESTS:
          errorType = SecurityErrorType.RATE_LIMIT_ERROR;
          riskScore = 3;
          threatIndicators.push('rate_limit_exceeded');
          break;
        default:
          if (statusCode >= 400 && statusCode < 500) {
            riskScore = 3;
          }
      }

      // Check for specific exception types
      if (exception instanceof ThrottlerException) {
        errorType = SecurityErrorType.RATE_LIMIT_ERROR;
        riskScore = 4;
        threatIndicators.push('throttle_violation');
      }

      // Analyze error message for security patterns
      const message = exception.message?.toLowerCase() || '';

      if (message.includes('validation') || message.includes('sanitization')) {
        errorType = SecurityErrorType.VALIDATION_ERROR;
        riskScore += 1;
      }

      if (
        message.includes('xss') ||
        message.includes('injection') ||
        message.includes('malicious')
      ) {
        errorType = SecurityErrorType.SECURITY_VIOLATION;
        riskScore += 4;
        threatIndicators.push('attack_detected');
      }
    }

    // Increase risk score for repeated errors from same client
    const clientIdentifier = this.getClientIdentifier(request);
    const existingPattern = this.errorPatterns.get(clientIdentifier);
    if (existingPattern && existingPattern.count > 5) {
      riskScore += 2;
      threatIndicators.push('repeated_errors');
    }

    return {
      errorType,
      statusCode,
      riskScore: Math.min(10, riskScore), // Cap at 10
      threatIndicators,
      isSecurityRelated: riskScore >= 4 || threatIndicators.length > 0,
    };
  }

  /**
   * Create secure error response that doesn't leak sensitive information
   */
  private createSecureResponse(
    exception: unknown,
    request: Request,
    requestId: string,
    errorAnalysis: any,
  ): SecureErrorResponse {
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Base secure response
    const response: SecureErrorResponse = {
      statusCode: errorAnalysis.statusCode,
      error: this.getSecureErrorName(errorAnalysis.statusCode),
      message: this.getSecureErrorMessage(exception, errorAnalysis),
      timestamp: new Date().toISOString(),
      path: request.path,
      requestId,
    };

    // Only include detailed information in development
    if (isDevelopment) {
      response.details = this.sanitizeErrorDetails(exception);

      if (exception instanceof Error && exception.stack) {
        response.stack = exception.stack;
      }
    }

    return response;
  }

  /**
   * Get secure error name based on status code
   */
  private getSecureErrorName(statusCode: number): string {
    const errorNames = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };

    return errorNames[statusCode] || 'Unknown Error';
  }

  /**
   * Get secure error message that doesn't leak sensitive information
   */
  private getSecureErrorMessage(
    exception: unknown,
    errorAnalysis: any,
  ): string {
    // For security violations, use generic message
    if (errorAnalysis.errorType === SecurityErrorType.SECURITY_VIOLATION) {
      return 'Request blocked due to security policy violation';
    }

    // For rate limiting
    if (errorAnalysis.errorType === SecurityErrorType.RATE_LIMIT_ERROR) {
      return 'Too many requests. Please try again later';
    }

    // For validation errors, provide safe message
    if (errorAnalysis.errorType === SecurityErrorType.VALIDATION_ERROR) {
      return 'Invalid input provided. Please check your request';
    }

    // For HTTP exceptions, use the message but sanitize it
    if (exception instanceof HttpException) {
      const message = exception.message;
      return this.sanitizeErrorMessage(message);
    }

    // Generic message for other errors
    return 'An error occurred while processing your request';
  }

  /**
   * Sanitize error message to prevent information disclosure
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove sensitive patterns
    const sanitizedMessage = message
      // Remove file paths
      .replace(/\/[a-zA-Z0-9/_-]+/g, '[PATH_REMOVED]')
      // Remove database information
      .replace(/database|table|column|sql|query/gi, '[DB_INFO_REMOVED]')
      // Remove system information
      .replace(/system|process|memory|cpu/gi, '[SYSTEM_INFO_REMOVED]')
      // Remove stack traces
      .replace(/at [a-zA-Z0-9._]+\([^)]+\)/g, '[STACK_REMOVED]')
      // Remove sensitive environment variables
      .replace(
        /NODE_ENV|API_KEY|SECRET|PASSWORD|TOKEN/gi,
        '[SENSITIVE_REMOVED]',
      );

    return sanitizedMessage.substring(0, 200); // Limit message length
  }

  /**
   * Sanitize error details for development responses
   */
  private sanitizeErrorDetails(exception: unknown): any {
    if (!(exception instanceof Error)) {
      return null;
    }

    return {
      name: exception.name,
      cause: exception.cause || 'Unknown',
      // Don't include the full stack trace in JSON response
    };
  }

  /**
   * Log security event with full details for monitoring
   */
  private logSecurityEvent(
    exception: unknown,
    request: Request,
    errorAnalysis: any,
    requestId: string,
  ): void {
    const logData = {
      event: 'security_exception',
      requestId,
      errorType: errorAnalysis.errorType,
      statusCode: errorAnalysis.statusCode,
      riskScore: errorAnalysis.riskScore,
      threatIndicators: errorAnalysis.threatIndicators,
      isSecurityRelated: errorAnalysis.isSecurityRelated,
      request: {
        method: request.method,
        url: request.url,
        path: request.path,
        query: request.query,
        headers: this.sanitizeHeaders(request.headers),
        clientIP: this.getClientIP(request),
        userAgent: request.headers['user-agent'],
      },
      exception: {
        name: exception instanceof Error ? exception.name : 'Unknown',
        message:
          exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      },
      timestamp: new Date().toISOString(),
    };

    // Log at appropriate level based on risk score
    if (errorAnalysis.riskScore >= 7) {
      this.logger.error(`[${requestId}] HIGH RISK SECURITY EXCEPTION`, logData);
    } else if (errorAnalysis.isSecurityRelated) {
      this.logger.warn(`[${requestId}] Security-related exception`, logData);
    } else {
      this.logger.debug(`[${requestId}] Application exception`, logData);
    }
  }

  /**
   * Track error patterns for threat detection
   */
  private trackErrorPattern(request: Request, errorAnalysis: any): void {
    const clientIdentifier = this.getClientIdentifier(request);
    const now = new Date();

    if (!this.errorPatterns.has(clientIdentifier)) {
      this.errorPatterns.set(clientIdentifier, {
        count: 1,
        lastSeen: now,
        riskScore: errorAnalysis.riskScore,
      });
    } else {
      const pattern = this.errorPatterns.get(clientIdentifier)!;
      pattern.count += 1;
      pattern.lastSeen = now;
      pattern.riskScore = Math.max(pattern.riskScore, errorAnalysis.riskScore);
    }

    // Clean up old patterns (older than 1 hour)
    this.cleanupErrorPatterns();
  }

  /**
   * Handle high-risk security errors
   */
  private handleHighRiskError(
    request: Request,
    errorAnalysis: any,
    requestId: string,
  ): void {
    const clientIP = this.getClientIP(request);
    const userAgent = request.headers['user-agent'];

    this.logger.error(`[${requestId}] HIGH RISK SECURITY EVENT DETECTED`, {
      event: 'high_risk_error',
      requestId,
      clientIP,
      userAgent,
      endpoint: request.path,
      riskScore: errorAnalysis.riskScore,
      threatIndicators: errorAnalysis.threatIndicators,
      recommendation:
        'Consider implementing additional security measures for this client',
      timestamp: new Date().toISOString(),
    });

    // In a production environment, you might:
    // - Send alert to security team
    // - Add IP to temporary blocklist
    // - Increase monitoring for this client
    // - Trigger additional security measures
  }

  /**
   * Generate client identifier for tracking
   */
  private getClientIdentifier(request: Request): string {
    const ip = this.getClientIP(request);
    const userAgent = (request.headers['user-agent'] || '').substring(0, 50);
    return `${ip}:${userAgent}`.replace(/[^a-zA-Z0-9:.-]/g, '_');
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };

    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'proxy-authorization',
    ];

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Clean up old error patterns
   */
  private cleanupErrorPatterns(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, pattern] of this.errorPatterns.entries()) {
      if (now - pattern.lastSeen.getTime() > maxAge) {
        this.errorPatterns.delete(key);
      }
    }
  }

  /**
   * Get current error pattern statistics (for monitoring)
   */
  getErrorPatternStats(): {
    totalClients: number;
    highRiskClients: number;
    topErrorClients: Array<{
      client: string;
      count: number;
      riskScore: number;
      lastSeen: Date;
    }>;
  } {
    const highRiskClients = Array.from(this.errorPatterns.entries()).filter(
      ([, pattern]) => pattern.riskScore >= 6,
    ).length;

    const topErrorClients = Array.from(this.errorPatterns.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([client, pattern]) => ({
        client: client.substring(0, 30) + '...', // Truncate for privacy
        count: pattern.count,
        riskScore: pattern.riskScore,
        lastSeen: pattern.lastSeen,
      }));

    return {
      totalClients: this.errorPatterns.size,
      highRiskClients,
      topErrorClients,
    };
  }
}
