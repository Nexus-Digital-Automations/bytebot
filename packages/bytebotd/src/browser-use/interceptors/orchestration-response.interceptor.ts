/**
 * Orchestration Response Interceptor
 *
 * Provides standardized response formatting for browser orchestration operations
 * including distributed task results, workflow progress tracking, resource utilization
 * metrics, and comprehensive error reporting with recovery metadata.
 *
 * @author Browser Orchestration Specialist
 * @version 1.0.0
 * @security-focus Critical
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';import { Observable } from 'rxjs';import { map, tap, catchError } from 'rxjs/operators';import {OrchestrationError,
  OrchestrationErrorType,
  OrchestrationOperationType,
  isOrchestrationError,
} from '../errors/orchestration-errors';/*** Standard orchestration response format
 */
export interface OrchestrationResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly orchestration: {
    readonly orchestrationId: string;
    readonly operationType: OrchestrationOperationType;
    readonly status: 'initializing' | 'executing' | 'aggregating' | 'completed' | 'failed' | 'cancelled';readonly progress: {readonly totalOperations: number;
      readonly completedOperations: number;
      readonly failedOperations: number;
      readonly remainingOperations: number;
      readonly progressPercentage: number;
      readonly estimatedTimeRemaining?: number;
    };
    readonly execution: {
      readonly startTime: Date;
      readonly endTime?: Date;
      readonly duration?: number;
      readonly parallelExecutions: number;
      readonly coordinationState: string;
    };
    readonly resources: {
      readonly browserSessions: number;
      readonly activeTasks: number;
      readonly memoryUsage?: number;
      readonly cpuUsage?: number;
      readonly networkConnections?: number;
      readonly resourceUtilization?: number;
    };
    readonly performance: {
      readonly executionTime: number;
      readonly expectedTime?: number;
      readonly performanceRatio?: number;
      readonly throughputMbps?: number;
      readonly operationsPerSecond?: number;
    };
  };
  readonly operations?: Array<{
    readonly operationId: string;
    readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';readonly startTime?: Date;readonly endTime?: Date;
    readonly duration?: number;
    readonly result?: unknown;
    readonly error?: string;
    readonly retryCount?: number;
    readonly dependencies?: string[];
  }>;
  readonly error?: {
    readonly type: string;
    readonly message: string;
    readonly severity: string;
    readonly category: string;
    readonly orchestrationId: string;
    readonly affectedOperations: string[];
    readonly recovery?: {
      readonly attempted: boolean;
      readonly strategy?: string;
      readonly success?: boolean;
      readonly retryCount?: number;
      readonly estimatedRecoveryTime?: number;
    };
    readonly recommendations?: string[];
  };
  readonly metadata: {
    readonly requestId: string;
    readonly timestamp: Date;
    readonly processingTime: number;
    readonly version: string;
    readonly environment: string;
    readonly traceId?: string;
    readonly userId?: string;
    readonly sessionId?: string;
  };
  readonly pagination?: {
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
    readonly hasNext: boolean;
    readonly hasPrevious: boolean;
  };
}

/**
 * Orchestration result with progress tracking
 */
export interface OrchestrationResult<T = unknown> {
  readonly data: T;
  readonly orchestrationContext: {
    readonly orchestrationId: string;
    readonly operationType: OrchestrationOperationType;
    readonly distributedContext: OrchestrationError['distributedContext'];readonly resourceContext: OrchestrationError['resourceContext'];readonly performanceMetrics: OrchestrationError['performanceMetrics'];};readonly operationResults?: Array<{
    readonly operationId: string;
    readonly result: unknown;
    readonly metadata: Record<string, unknown>;
  }>;
}

/**
 * Request context interface for orchestration operations
 */
interface OrchestrationRequestContext {
  readonly url: string;
  readonly method: string;
  readonly headers?: Record<string, string>;
  readonly user?: { id: string };
  readonly sessionID?: string;
  readonly orchestrationId?: string;
  readonly operationType?: OrchestrationOperationType;
  readonly requestId?: string;
  readonly startTime: Date;
}

/**
 * Orchestration Response Interceptor
 *
 * Features:
 * - Standardized response format for all orchestration operations
 * - Real-time progress tracking for distributed operations
 * - Comprehensive resource utilization reporting
 * - Performance metrics collection and analysis
 * - Error context preservation and enhancement
 * - Recovery metadata inclusion
 * - Pagination support for large result sets
 * - Trace correlation for debugging
 */
@Injectable()
export class OrchestrationResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OrchestrationResponseInterceptor.name);
  private readonly version = '1.0.0';private readonly environment = process.env.NODE_ENV || 'development';constructor() {this.logger.log('OrchestrationResponseInterceptor initialized');}intercept(context: ExecutionContext, next: CallHandler): Observable<OrchestrationResponse> {
    const requestContext = this.extractRequestContext(context);
    const startTime = Date.now();

    this.logger.log('Processing orchestration request', {orchestrationId: requestContext.orchestrationId,operationType: requestContext.operationType,
      url: requestContext.url,
      method: requestContext.method,
    });

    return next.handle().pipe(
      map((data) => this.formatSuccessResponse(data, requestContext, startTime)),
      tap((response) => this.logResponseMetrics(response, requestContext)),
      catchError((error) => {
        const errorResponse = this.formatErrorResponse(error, requestContext, startTime);
        this.logErrorMetrics(errorResponse, requestContext, error);
        throw errorResponse;
      })
    );
  }

  /**
   * Format successful orchestration response
   */
  private formatSuccessResponse(
    data: unknown,
    requestContext: OrchestrationRequestContext,
    startTime: number
  ): OrchestrationResponse {
    const processingTime = Date.now() - startTime;
    const orchestrationResult = this.extractOrchestrationResult(data);

    // Determine orchestration status based on result data
    let status: OrchestrationResponse['orchestration']['status'] = 'completed';let progress = {totalOperations: 1,
      completedOperations: 1,
      failedOperations: 0,
      remainingOperations: 0,
      progressPercentage: 100,
    };

    if (orchestrationResult?.orchestrationContext) {
      const context = orchestrationResult.orchestrationContext.distributedContext;
      status = context.coordinationState === 'executing' ? 'executing' :context.coordinationState === 'aggregating' ? 'aggregating' :context.coordinationState === 'failed' ? 'failed' : 'completed';progress = {totalOperations: context.totalOperations,
        completedOperations: context.completedOperations,
        failedOperations: context.failedOperations,
        remainingOperations: context.remainingOperations,
        progressPercentage: context.totalOperations > 0
          ? Math.round((context.completedOperations / context.totalOperations) * 100)
          : 100,
        estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(context, processingTime),
      };
    }

    const response: OrchestrationResponse = {
      success: true,
      data: orchestrationResult?.data || data,
      orchestration: {
        orchestrationId: requestContext.orchestrationId || this.generateOrchestrationId(),
        operationType: requestContext.operationType || OrchestrationOperationType.WORKFLOW_EXECUTION,
        status,
        progress,
        execution: {
          startTime: requestContext.startTime,
          endTime: new Date(),
          duration: processingTime,
          parallelExecutions: orchestrationResult?.orchestrationContext?.distributedContext?.parallelExecutions || 1,
          coordinationState: orchestrationResult?.orchestrationContext?.distributedContext?.coordinationState || 'completed',},resources: {
          browserSessions: orchestrationResult?.orchestrationContext?.resourceContext?.browserSessions || 0,
          activeTasks: orchestrationResult?.orchestrationContext?.resourceContext?.activeTasks || 0,
          memoryUsage: orchestrationResult?.orchestrationContext?.resourceContext?.memoryUsage,
          cpuUsage: orchestrationResult?.orchestrationContext?.resourceContext?.cpuUsage,
          networkConnections: orchestrationResult?.orchestrationContext?.resourceContext?.networkConnections,
          resourceUtilization: this.calculateResourceUtilization(orchestrationResult?.orchestrationContext?.resourceContext),
        },
        performance: {
          executionTime: processingTime,
          expectedTime: orchestrationResult?.orchestrationContext?.performanceMetrics?.expectedTime,
          performanceRatio: orchestrationResult?.orchestrationContext?.performanceMetrics?.performanceRatio,
          throughputMbps: orchestrationResult?.orchestrationContext?.performanceMetrics?.throughputMbps,
          operationsPerSecond: this.calculateOperationsPerSecond(progress.completedOperations, processingTime),
        },
      },
      operations: this.formatOperationResults(orchestrationResult?.operationResults),
      metadata: {
        requestId: requestContext.requestId || this.generateRequestId(),
        timestamp: new Date(),
        processingTime,
        version: this.version,
        environment: this.environment,
        traceId: this.extractTraceId(requestContext),
        userId: requestContext.user?.id,
        sessionId: requestContext.sessionID,
      },
      pagination: this.extractPaginationInfo(data),
    };

    return response;
  }

  /**
   * Format error response for orchestration operations
   */
  private formatErrorResponse(
    error: unknown,
    requestContext: OrchestrationRequestContext,
    startTime: number
  ): OrchestrationResponse {
    const processingTime = Date.now() - startTime;
    const orchestrationError = isOrchestrationError(error) ? error : null;

    let errorInfo = {
      type: 'unknown_error',message: 'An unexpected error occurred',severity: 'medium',category: 'system_error',orchestrationId: requestContext.orchestrationId || 'unknown',affectedOperations: [] as string[],};

    if (orchestrationError) {
      errorInfo = {
        type: orchestrationError.category,
        message: orchestrationError.message,
        severity: orchestrationError.severity,
        category: orchestrationError.category,
        orchestrationId: orchestrationError.orchestrationId,
        affectedOperations: orchestrationError.affectedOperations.map(op => op.operationId),
      };
    } else if (error instanceof Error) {
      errorInfo.message = error.message;
      errorInfo.type = error.name || 'error';}const progress = orchestrationError ? {
      totalOperations: orchestrationError.distributedContext.totalOperations,
      completedOperations: orchestrationError.distributedContext.completedOperations,
      failedOperations: orchestrationError.distributedContext.failedOperations,
      remainingOperations: orchestrationError.distributedContext.remainingOperations,
      progressPercentage: orchestrationError.distributedContext.totalOperations > 0
        ? Math.round((orchestrationError.distributedContext.completedOperations / orchestrationError.distributedContext.totalOperations) * 100)
        : 0,
    } : {
      totalOperations: 1,
      completedOperations: 0,
      failedOperations: 1,
      remainingOperations: 0,
      progressPercentage: 0,
    };

    const response: OrchestrationResponse = {
      success: false,
      orchestration: {
        orchestrationId: errorInfo.orchestrationId,
        operationType: requestContext.operationType || OrchestrationOperationType.WORKFLOW_EXECUTION,
        status: 'failed',progress,execution: {
          startTime: requestContext.startTime,
          endTime: new Date(),
          duration: processingTime,
          parallelExecutions: orchestrationError?.distributedContext?.parallelExecutions || 0,
          coordinationState: orchestrationError?.distributedContext?.coordinationState || 'failed',},resources: {
          browserSessions: orchestrationError?.resourceContext?.browserSessions || 0,
          activeTasks: orchestrationError?.resourceContext?.activeTasks || 0,
          memoryUsage: orchestrationError?.resourceContext?.memoryUsage,
          cpuUsage: orchestrationError?.resourceContext?.cpuUsage,
          networkConnections: orchestrationError?.resourceContext?.networkConnections,
          resourceUtilization: this.calculateResourceUtilization(orchestrationError?.resourceContext),
        },
        performance: {
          executionTime: processingTime,
          expectedTime: orchestrationError?.performanceMetrics?.expectedTime,
          performanceRatio: orchestrationError?.performanceMetrics?.performanceRatio,
          throughputMbps: orchestrationError?.performanceMetrics?.throughputMbps,
          operationsPerSecond: 0,
        },
      },
      operations: orchestrationError ? this.formatFailedOperations(orchestrationError.affectedOperations) : undefined,
      error: {
        ...errorInfo,
        recovery: this.extractRecoveryInfo(error),
        recommendations: this.getErrorRecommendations(orchestrationError),
      },
      metadata: {
        requestId: requestContext.requestId || this.generateRequestId(),
        timestamp: new Date(),
        processingTime,
        version: this.version,
        environment: this.environment,
        traceId: this.extractTraceId(requestContext),
        userId: requestContext.user?.id,
        sessionId: requestContext.sessionID,
      },
    };

    return response;
  }

  /**
   * Extract request context from execution context
   */
  private extractRequestContext(context: ExecutionContext): OrchestrationRequestContext {
    const request = context.switchToHttp().getRequest() as {
      url: string;
      method: string;
      headers?: Record<string, string>;
      user?: { id: string };
      sessionID?: string;
      body?: { orchestrationId?: string; operationType?: string };
      query?: { orchestrationId?: string; operationType?: string };
    };

    return {
      url: request.url,
      method: request.method,
      headers: request.headers,
      user: request.user,
      sessionID: request.sessionID,
      orchestrationId: request.body?.orchestrationId || request.query?.orchestrationId || request.headers?.['x-orchestration-id'],operationType: (request.body?.operationType || request.query?.operationType) as OrchestrationOperationType,requestId: request.headers?.['x-request-id'],startTime: new Date(),};
  }

  /**
   * Extract orchestration result from response data
   */
  private extractOrchestrationResult(data: unknown): OrchestrationResult | null {
    if (data && typeof data === 'object' && 'orchestrationContext' in data) {return data as OrchestrationResult;}
    return null;
  }

  /**
   * Format operation results for response
   */
  private formatOperationResults(
    operationResults?: OrchestrationResult['operationResults']): OrchestrationResponse['operations'] {if (!operationResults) {return undefined;
    }

    return operationResults.map(op => ({
      operationId: op.operationId,
      status: 'completed' as const,result: op.result,startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      dependencies: [],
    }));
  }

  /**
   * Format failed operations for error response
   */
  private formatFailedOperations(
    affectedOperations: OrchestrationError['affectedOperations']): OrchestrationResponse['operations'] {return affectedOperations.map(op => ({operationId: op.operationId,
      status: op.status,
      error: op.errorMessage,
      retryCount: op.retryCount,
      dependencies: [],
    }));
  }

  /**
   * Calculate estimated time remaining for operations
   */
  private calculateEstimatedTimeRemaining(
    context: OrchestrationError['distributedContext'],currentProcessingTime: number): number | undefined {
    if (context.completedOperations === 0 || context.remainingOperations === 0) {
      return undefined;
    }

    const averageTimePerOperation = currentProcessingTime / context.completedOperations;
    return Math.round(averageTimePerOperation * context.remainingOperations);
  }

  /**
   * Calculate resource utilization percentage
   */
  private calculateResourceUtilization(
    resourceContext?: OrchestrationError['resourceContext']): number | undefined {if (!resourceContext?.memoryUsage || !resourceContext.cpuUsage) {
      return undefined;
    }

    // Simple average of memory and CPU usage
    return Math.round((resourceContext.memoryUsage + resourceContext.cpuUsage) / 2);
  }

  /**
   * Calculate operations per second
   */
  private calculateOperationsPerSecond(completedOperations: number, processingTime: number): number {
    if (processingTime === 0) {
      return 0;
    }
    return Math.round((completedOperations * 1000) / processingTime * 100) / 100;
  }

  /**
   * Extract pagination information from data
   */
  private extractPaginationInfo(data: unknown): OrchestrationResponse['pagination'] {if (data && typeof data === 'object' && 'pagination' in data) {const pagination = (data as { pagination: unknown }).pagination;if (pagination && typeof pagination === 'object') {return pagination as OrchestrationResponse['pagination'];}}
    return undefined;
  }

  /**
   * Extract trace ID from request context
   */
  private extractTraceId(requestContext: OrchestrationRequestContext): string | undefined {
    return requestContext.headers?.['x-trace-id'] ||requestContext.headers?.['traceparent'] ||requestContext.headers?.['x-correlation-id'];}/**
   * Extract recovery information from error
   */
  private extractRecoveryInfo(error: unknown): OrchestrationResponse['error']['recovery'] {// Check if error has recovery metadata (from error handler)if (error && typeof error === 'object' && 'recovery' in error) {const recovery = (error as { recovery: unknown }).recovery;if (recovery && typeof recovery === 'object') {return recovery as OrchestrationResponse['error']['recovery'];}}

    return {
      attempted: false,
    };
  }

  /**
   * Get error recommendations based on orchestration error type
   */
  private getErrorRecommendations(orchestrationError: OrchestrationErrorType | null): string[] {
    if (!orchestrationError) {
      return ['Contact system administrator for assistance'];}// Import recommendations from error analyzer
    // This would typically import from the orchestration-errors module
    return [
      'Review orchestration configuration','Check resource availability','Consider reducing parallel operations',];}

  /**
   * Log response metrics
   */
  private logResponseMetrics(
    response: OrchestrationResponse,
    requestContext: OrchestrationRequestContext
  ): void {
    this.logger.log('Orchestration response processed successfully', {orchestrationId: response.orchestration.orchestrationId,operationType: response.orchestration.operationType,
      status: response.orchestration.status,
      processingTime: response.metadata.processingTime,
      totalOperations: response.orchestration.progress.totalOperations,
      completedOperations: response.orchestration.progress.completedOperations,
      progressPercentage: response.orchestration.progress.progressPercentage,
      url: requestContext.url,
    });
  }

  /**
   * Log error metrics
   */
  private logErrorMetrics(
    response: OrchestrationResponse,
    requestContext: OrchestrationRequestContext,
    originalError: unknown
  ): void {
    this.logger.error('Orchestration response error processed', {orchestrationId: response.orchestration.orchestrationId,errorType: response.error?.type,
      errorCategory: response.error?.category,
      severity: response.error?.severity,
      processingTime: response.metadata.processingTime,
      affectedOperations: response.error?.affectedOperations?.length || 0,
      url: requestContext.url,
      originalError: originalError instanceof Error ? originalError.message : 'Unknown error',
    });
  }

  /**
   * Generate orchestration ID
   */
  private generateOrchestrationId(): string {
    return `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;}/**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}