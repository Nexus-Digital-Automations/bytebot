import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import {
  AutomationErrorHandlerService,
  AutomationErrorCategory,
  ErrorSeverity,
} from './automation-error-handler.service'; /*** Error Recovery Interceptor
 *
 * Automatically handles errors in automation endpoints with intelligent recovery strategies.
 * This interceptor integrates with the AutomationErrorHandlerService to provide:
 * - Automatic error classification and categorization
 * - Context-aware recovery strategies
 * - Performance monitoring and error tracking
 * - Graceful error responses with recovery metadata
 *
 * Features:
 * - Transparent error handling for all automation controllers
 * - Automatic retry for transient errors
 * - Circuit breaker integration
 * - Error correlation across requests
 * - Performance impact monitoring
 */
@Injectable()
export class ErrorRecoveryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorRecoveryInterceptor.name);

  constructor(private readonly errorHandler: AutomationErrorHandlerService) {
    this.logger.log('ErrorRecoveryInterceptor initialized');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest() as {
      url: string;
      method: string;
      headers?: Record<string, string>;
      user?: { id: string };
      sessionID?: string;
      body?: unknown;
      query?: unknown;
    };
    const operationContext = this.extractOperationContext(context, request);

    return next.handle().pipe(
      timeout(30000), // 30-second timeout for automation operations
      catchError((error) => this.handleError(error, operationContext, context)),
    );
  }

  private async handleError(
    error: unknown,
    operationContext: Record<string, unknown>,
    _executionContext: ExecutionContext,
  ): Promise<Observable<never>> {
    const startTime = Date.now();

    this.logger.warn('Interceptor handling error', {
      error: (error as { message?: string }).message ?? 'Unknown error',
      operation: operationContext.operationName,
      url: operationContext.url,
    });

    try {
      // Handle error through the centralized error handler
      const handlingResult = await this.errorHandler.handleError(
        error,
        operationContext,
      );

      const processingTime = Date.now() - startTime;

      // If recovery was successful, return the recovered result
      if (handlingResult.success && handlingResult.result !== undefined) {
        this.logger.log('Error recovery successful via interceptor', {
          operation: operationContext.operationName,
          strategy: handlingResult.strategy,
          retryCount: handlingResult.retryCount,
          processingTime,
        });

        // Return the recovered result wrapped in an observable
        return new Observable((subscriber) => {
          subscriber.next({
            success: true,
            data: handlingResult.result,
            recovered: true,
            recovery: {
              strategy: handlingResult.strategy,
              retryCount: handlingResult.retryCount,
              recoveryTime: handlingResult.recoveryTime,
            },
          });
          subscriber.complete();
        });
      }

      // Recovery failed, create enhanced error response
      const enhancedError = this.createEnhancedErrorResponse(
        handlingResult.finalError ??
          (error as {
            category?: string;
            message?: string;
            severity?: string;
            errorId?: string;
          }),
        operationContext,
        handlingResult,
      );

      this.logger.error('Error recovery failed via interceptor', {
        operation: operationContext.operationName,
        strategy: handlingResult.strategy,
        processingTime,
        errorCategory: handlingResult.finalError?.category,
      });

      return throwError(() => enhancedError);
    } catch (handlerError) {
      this.logger.error('Error handler itself failed', {
        originalError:
          (error as { message?: string }).message ?? 'Unknown error',
        handlerError: (handlerError as Error).message,
        operation: operationContext.operationName,
      });

      // Fallback to basic error handling
      const fallbackError = this.createFallbackErrorResponse(
        error,
        operationContext,
      );
      return throwError(() => fallbackError);
    }
  }

  private extractOperationContext(
    context: ExecutionContext,
    request: {
      url: string;
      method: string;
      headers?: Record<string, string>;
      user?: { id: string };
      sessionID?: string;
      body?: unknown;
      query?: unknown;
    },
  ): Record<string, unknown> {
    const controllerClass = context.getClass().name;
    const handlerMethod = context.getHandler().name;

    return {
      operationName: `${controllerClass}.${handlerMethod}`,
      component: this.extractComponentName(controllerClass),
      method: handlerMethod,
      url: request.url,
      httpMethod: request.method,
      userAgent: request.headers?.['user-agent'],
      userId: request.user?.id,
      sessionId: request.sessionID,
      requestId: request.headers?.['x-request-id'],
      timestamp: new Date().toISOString(),
      requestBody: request.body,
      queryParams: request.query,
      headers: this.sanitizeHeaders(request.headers),
    };
  }

  private extractComponentName(controllerClass: string): string {
    if (controllerClass.includes('FormAutomation')) return 'form-automation';
    if (controllerClass.includes('DataExtraction')) return 'data-extraction';
    if (controllerClass.includes('WorkflowAutomation'))
      return 'workflow-automation';
    if (controllerClass.includes('FileManagement')) return 'file-management';
    if (controllerClass.includes('ContentMonitoring'))
      return 'content-monitoring';
    return 'unknown';
  }
  private sanitizeHeaders(
    headers: Record<string, string> | undefined,
  ): Record<string, string> {
    const sanitized = { ...headers } as Record<string, string>;

    // Remove sensitive headers
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    return sanitized;
  }

  private createEnhancedErrorResponse(
    error: {
      category?: string;
      message?: string;
      severity?: string;
      errorId?: string;
    },
    operationContext: Record<string, unknown>,
    handlingResult: {
      strategy: string;
      retryCount: number;
      recoveryTime: number;
      success: boolean;
    },
  ): HttpException {
    const errorResponse = {
      success: false,
      error: {
        type: error.category ?? AutomationErrorCategory.UNKNOWN_ERROR,
        message: error.message ?? 'An automation error occurred',
        severity: error.severity ?? ErrorSeverity.MEDIUM,
        operation: operationContext.operationName,
        component: operationContext.component,
        timestamp: new Date().toISOString(),
        requestId: operationContext.requestId,
        recovery: {
          attempted: true,
          strategy: handlingResult.strategy,
          retryCount: handlingResult.retryCount,
          recoveryTime: handlingResult.recoveryTime,
          success: handlingResult.success,
        },
      },
      metadata: {
        errorId: error.errorId ?? 'unknown',
        url: operationContext.url,
        method: operationContext.httpMethod,
        userAgent: operationContext.userAgent,
      },
    };

    // Determine HTTP status based on error type and severity
    const httpStatus = this.determineHttpStatus(error);

    return new HttpException(errorResponse, httpStatus);
  }

  private createFallbackErrorResponse(
    error: { message?: string },
    operationContext: Record<string, unknown>,
  ): HttpException {
    const fallbackResponse = {
      success: false,
      error: {
        type: 'system_error',
        message: 'An unexpected error occurred during automation operation',
        severity: 'high',
        operation: operationContext.operationName,
        component: operationContext.component,
        timestamp: new Date().toISOString(),
        requestId: operationContext.requestId,
        recovery: {
          attempted: false,
          reason: 'Error handler failure',
        },
      },
      metadata: {
        originalError: error.message ?? 'Unknown error',
        url: operationContext.url,
        method: operationContext.httpMethod,
      },
    };

    return new HttpException(
      fallbackResponse,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private determineHttpStatus(error: {
    category?: string;
    severity?: string;
  }): HttpStatus {
    if (error.category) {
      switch (error.category) {
        case AutomationErrorCategory.AUTHENTICATION_ERROR:
          return HttpStatus.UNAUTHORIZED;
        case AutomationErrorCategory.VALIDATION_ERROR:
          return HttpStatus.BAD_REQUEST;
        case AutomationErrorCategory.RATE_LIMIT_ERROR:
          return HttpStatus.TOO_MANY_REQUESTS;
        case AutomationErrorCategory.NETWORK_ERROR:
          return HttpStatus.SERVICE_UNAVAILABLE;
        case AutomationErrorCategory.FORM_ERROR:
        case AutomationErrorCategory.DATA_EXTRACTION_ERROR:
        case AutomationErrorCategory.WORKFLOW_ERROR:
          return HttpStatus.UNPROCESSABLE_ENTITY;
        case AutomationErrorCategory.FILE_OPERATION_ERROR:
          return HttpStatus.UNPROCESSABLE_ENTITY;
        case AutomationErrorCategory.MONITORING_ERROR:
          return HttpStatus.SERVICE_UNAVAILABLE;
        case AutomationErrorCategory.SYSTEM_ERROR:
          return HttpStatus.INTERNAL_SERVER_ERROR;
        default:
          return HttpStatus.INTERNAL_SERVER_ERROR;
          break;
      }
    }

    if (error.severity) {
      switch (error.severity) {
        case ErrorSeverity.CRITICAL:
          return HttpStatus.INTERNAL_SERVER_ERROR;
        case ErrorSeverity.HIGH:
          return HttpStatus.BAD_REQUEST;
        case ErrorSeverity.MEDIUM:
          return HttpStatus.UNPROCESSABLE_ENTITY;
        case ErrorSeverity.LOW:
          return HttpStatus.BAD_REQUEST;
        default:
          return HttpStatus.INTERNAL_SERVER_ERROR;
          break;
      }
    }

    // Default fallback
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
