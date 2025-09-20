/**
 * Error Handling Interceptor
 *
 * Centralized error handling with retry logic, circuit breaker pattern,
 * and comprehensive error transformation for consistent API responses.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { BrowserUseError } from '../filters/browser-use-exception.filter';

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  retryableErrorCodes: string[];
}

export interface ValidationError extends Error {
  details?: string;
}

export interface TimeoutError extends Error {
  code?: string;
}

export type HandlerError =
  | Error
  | HttpException
  | BrowserUseError
  | ValidationError
  | TimeoutError;

@Injectable()
export class ErrorHandlingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorHandlingInterceptor.name);
  private readonly circuitBreakerState = new Map<
    string,
    {
      failures: number;
      lastFailure: number;
      state: 'closed' | 'open' | 'half-open';
    }
  >();

  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    retryableErrorCodes: [
      'BROWSER_PROCESS_FAILED',
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'RESOURCE_TEMPORARILY_UNAVAILABLE',
    ],
  };

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      correlationId?: string;
      method?: string;
      route?: { path?: string };
      url?: string;
    }>();
    const endpoint = `${request?.method || 'UNKNOWN'} ${request?.route?.path || request?.url || 'unknown'}`;
    const correlationId =
      request?.correlationId || this.generateCorrelationId();

    // Check circuit breaker state
    if (this.isCircuitBreakerOpen(endpoint)) {
      this.logger.warn(
        `Circuit breaker OPEN for ${endpoint} [${correlationId}]`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Service temporarily unavailable - circuit breaker open',
          _error: 'Service Unavailable',
          retryAfter: 30,
          timestamp: new Date().toISOString(),
          correlationId,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return next.handle().pipe(
      retry({
        count: this.defaultRetryConfig.maxRetries,
        delay: (_error: HandlerError, retryCount: number) => {
          if (!this.isRetryableError(error)) {
            return throwError(error);
          }

          const delay = this.defaultRetryConfig.exponentialBackoff
            ? this.defaultRetryConfig.retryDelay * Math.pow(2, retryCount - 1)
            : this.defaultRetryConfig.retryDelay;

          this.logger.warn(
            `Retrying request ${endpoint} (attempt ${retryCount}/${this.defaultRetryConfig.maxRetries}) ` +
              `after ${delay}ms [${correlationId}]`,
          );

          return timer(delay);
        },
      }),
      catchError((_error: HandlerError) => {
        return this.handleError(error, endpoint, correlationId);
      }),
    );
  }

  private handleError(
    _error: HandlerError,
    endpoint: string,
    correlationId: string,
  ): Observable<never> {
    // Update circuit breaker
    this.updateCircuitBreaker(endpoint, true);

    // Transform error for consistent response format
    const transformedError = this.transformError(error, correlationId);

    this.logger.error(
      `Error handling request ${endpoint}: ${transformedError.message} [${correlationId}]`,
      transformedError.stack ||
        (error instanceof Error ? error.stack : undefined),
    );

    return throwError(transformedError);
  }

  private transformError(
    _error: HandlerError,
    correlationId: string,
  ): HttpException {
    // Already an HttpException
    if (error instanceof HttpException) {
      return error;
    }

    // Browser-specific error
    if (error instanceof BrowserUseError) {
      return new HttpException(
        {
          statusCode: this.mapBrowserErrorToStatus(error.code),
          message: error.message,
          _error: 'Browser Automation Error',
          code: error.code,
          recoverable: error.recoverable,
          details: error.details,
          timestamp: new Date().toISOString(),
          correlationId,
        },
        this.mapBrowserErrorToStatus(error.code),
      );
    }

    // Validation error
    if (error instanceof Error && error.name === 'ValidationError') {
      const validationError = error as ValidationError;
      return new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
          _error: 'Bad Request',
          details: validationError.details || validationError.message,
          timestamp: new Date().toISOString(),
          correlationId,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Database/connection errors
    if (this.isDatabaseError(error)) {
      return new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database temporarily unavailable',
          _error: 'Service Unavailable',
          retryAfter: 30,
          timestamp: new Date().toISOString(),
          correlationId,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Timeout errors
    if (this.isTimeoutError(error)) {
      return new HttpException(
        {
          statusCode: HttpStatus.REQUEST_TIMEOUT,
          message: 'Request timeout',
          _error: 'Request Timeout',
          timestamp: new Date().toISOString(),
          correlationId,
        },
        HttpStatus.REQUEST_TIMEOUT,
      );
    }

    // Generic internal server error
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return new HttpException(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        _error: 'Internal Server Error',
        details:
          process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        timestamp: new Date().toISOString(),
        correlationId,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private isRetryableError(_error: HandlerError): boolean {
    if (error instanceof BrowserUseError) {
      return this.defaultRetryConfig.retryableErrorCodes.includes(error.code);
    }

    if (error instanceof HttpException) {
      const status = error.getStatus();
      return status >= 500 || status === 408; // Server errors and timeouts
    }

    return this.isTimeoutError(error) || this.isDatabaseError(error);
  }

  private mapBrowserErrorToStatus(code: string): number {
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

  private isDatabaseError(_error: HandlerError): boolean {
    if (!error || !(error instanceof Error)) return false;

    const databaseErrorTypes = [
      'SequelizeError',
      'MongoError',
      'PostgresError',
      'ConnectionError',
      'DatabaseError',
    ];

    return databaseErrorTypes.some(
      (type) =>
        error.name?.includes(type) || error.constructor?.name?.includes(type),
    );
  }

  private isTimeoutError(_error: HandlerError): boolean {
    if (!error) return false;

    // Type guard for timeout errors with code property
    const hasCodeProperty = (err: HandlerError): err is TimeoutError => {
      return typeof err === 'object' && err !== null && 'code' in err;
    };

    // Type guard for errors with name property
    const hasNameProperty = (err: HandlerError): err is Error => {
      return err instanceof Error;
    };

    return (
      (hasCodeProperty(error) &&
        (error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ENOTFOUND')) ||
      (hasNameProperty(error) &&
        (error.name === 'TimeoutError' ||
          error.message?.toLowerCase().includes('timeout')))
    );
  }

  private isCircuitBreakerOpen(endpoint: string): boolean {
    const state = this.circuitBreakerState.get(endpoint);
    if (!state) return false;

    const now = Date.now();
    const timeSinceLastFailure = now - state.lastFailure;

    if (state.state === 'open' && timeSinceLastFailure > 30000) {
      // Move to half-open after 30 seconds
      state.state = 'half-open';
      this.circuitBreakerState.set(endpoint, state);
      return false;
    }

    return state.state === 'open';
  }

  private updateCircuitBreaker(endpoint: string, failed: boolean): void {
    const state = this.circuitBreakerState.get(endpoint) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed' as const,
    };

    if (failed) {
      state.failures++;
      state.lastFailure = Date.now();

      if (state.failures >= 5) {
        state.state = 'open';
        this.logger.warn(
          `Circuit breaker OPENED for ${endpoint} (${state.failures} failures)`,
        );
      }
    } else {
      // Reset on success
      if (state.state === 'half-open') {
        state.state = 'closed';
        state.failures = 0;
        this.logger.log(`Circuit breaker CLOSED for ${endpoint}`);
      }
    }

    this.circuitBreakerState.set(endpoint, state);
  }

  private generateCorrelationId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
