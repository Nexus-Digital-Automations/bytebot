/**
 * Browser-Use Exception Filter
 *
 * Specialized exception filter for browser automation errors,
 * providing detailed error context and recovery suggestions.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

export class BrowserUseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
    public readonly recoverable: boolean = true,
  ) {
    super(message);
    this.name = 'BrowserUseError';
  }
}

@Catch(BrowserUseError, HttpException)
export class BrowserUseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(BrowserUseExceptionFilter.name);

  catch(exception: BrowserUseError | HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ correlationId?: string; url?: string }>();

    const correlationId = request.correlationId || this.generateCorrelationId();

    if (exception instanceof BrowserUseError) {
      this.handleBrowserUseError(exception, response, correlationId, request);
    } else {
      this.handleHttpException(exception, response, correlationId, request);
    }
  }

  private handleBrowserUseError(
    exception: BrowserUseError,
    _response: Response,
    correlationId: string,
    _request: { correlationId?: string; url?: string },
  ) {
    const statusCode = this.mapErrorCodeToStatus(exception.code);

    const errorResponse = {
      statusCode,
      message: exception.message || 'Unknown error',
      _error: 'Browser Automation Error',
      code: exception.code,
      recoverable: exception.recoverable,
      details: exception.details,
      timestamp: new Date().toISOString(),
      path: request?.url || 'unknown',
      correlationId,
      suggestions: this.getRecoverySuggestions(exception.code),
    };

    this.logger.error(
      `Browser automation _error: ${exception.message} [${exception.code}] [${correlationId}]`,
      exception.stack,
    );

    response.status(statusCode).json(errorResponse);
  }

  private handleHttpException(
    exception: HttpException,
    _response: Response,
    correlationId: string,
    _request: { correlationId?: string; url?: string },
  ) {
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      statusCode,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : ((exceptionResponse as Record<string, unknown>)
              ?.message as string) || 'Unknown error',
      _error: exception.name,
      timestamp: new Date().toISOString(),
      path: request?.url || 'unknown',
      correlationId,
    };

    this.logger.error(
      `HTTP exception: ${exception.message} [${statusCode}] [${correlationId}]`,
      exception.stack,
    );

    response.status(statusCode).json(errorResponse);
  }

  private mapErrorCodeToStatus(code: string): number {
    const errorCodeMap: Record<string, number> = {
      BROWSER_SESSION_NOT_FOUND: HttpStatus.NOT_FOUND,
      BROWSER_PROCESS_FAILED: HttpStatus.INTERNAL_SERVER_ERROR,
      TASK_TIMEOUT: HttpStatus.REQUEST_TIMEOUT,
      ELEMENT_NOT_FOUND: HttpStatus.NOT_FOUND,
      NAVIGATION_FAILED: HttpStatus.BAD_REQUEST,
      SCREENSHOT_FAILED: HttpStatus.INTERNAL_SERVER_ERROR,
      INVALID_SELECTOR: HttpStatus.BAD_REQUEST,
      FORM_VALIDATION_FAILED: HttpStatus.UNPROCESSABLE_ENTITY,
      RESOURCE_LIMIT_EXCEEDED: HttpStatus.TOO_MANY_REQUESTS,
      SECURITY_VIOLATION: HttpStatus.FORBIDDEN,
    };

    return errorCodeMap[code] || HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getRecoverySuggestions(code: string): string[] {
    const suggestions: Record<string, string[]> = {
      BROWSER_SESSION_NOT_FOUND: [
        'Create a new browser session',
        'Check if session ID is valid',
        'Verify session has not expired',
      ],
      BROWSER_PROCESS_FAILED: [
        'Restart the browser service',
        'Check system resources',
        'Verify Chrome/Chromium installation',
      ],
      TASK_TIMEOUT: [
        'Increase task timeout value',
        'Simplify task complexity',
        'Check network connectivity',
      ],
      ELEMENT_NOT_FOUND: [
        'Verify element selector',
        'Wait for page to load completely',
        'Check if element exists on current page',
      ],
      NAVIGATION_FAILED: [
        'Check URL validity',
        'Verify network connectivity',
        'Ensure domain is allowed',
      ],
      INVALID_SELECTOR: [
        'Use valid CSS or XPath selector',
        'Test selector in browser console',
        'Check for dynamic content',
      ],
    };

    return (
      suggestions[code] || ['Contact system administrator', 'Check system logs']
    );
  }

  private generateCorrelationId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
