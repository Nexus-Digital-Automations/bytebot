/**
 * Validation Exception Filter
 *
 * Handles validation errors with detailed field-specific error messages
 * and user-friendly formatting for API responses.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
// ValidationError type not used in production code

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const correlationId =
      request?.correlationId || this.generateCorrelationId();
    const exceptionResponse = exception.getResponse() as any;

    // Handle validation errors specifically
    if (this.isValidationError(exceptionResponse)) {
      this.handleValidationError(
        exceptionResponse,
        response,
        correlationId,
        request,
      );
    } else {
      this.handleGenericBadRequest(exception, response, correlationId, request);
    }
  }

  private isValidationError(response: any): boolean {
    return (
      response &&
      Array.isArray(response.message) &&
      response.error === 'Bad Request'
    );
  }

  private handleValidationError(
    exceptionResponse: any,
    response: Response,
    correlationId: string,
    request: any,
  ) {
    const validationErrors = this.formatValidationErrors(
      exceptionResponse?.message || [],
    );

    const errorResponse = {
      statusCode: 400,
      message: 'Validation failed',
      error: 'Bad Request',
      validationErrors,
      timestamp: new Date().toISOString(),
      path: request?.url || 'unknown',
      correlationId,
      details: {
        totalErrors: validationErrors.length,
        fields: validationErrors.map((err) => err.field),
      },
    };

    this.logger.warn(
      `Validation failed: ${validationErrors.length} errors [${correlationId}]`,
      { validationErrors, path: request?.url || 'unknown' },
    );

    response.status(400).json(errorResponse);
  }

  private handleGenericBadRequest(
    exception: BadRequestException,
    response: Response,
    correlationId: string,
    request: any,
  ) {
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      statusCode: 400,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message,
      error: 'Bad Request',
      timestamp: new Date().toISOString(),
      path: request?.url || 'unknown',
      correlationId,
    };

    this.logger.warn(
      `Bad request: ${(exception as any)?.message || 'Unknown error'} [${correlationId}]`,
      {
        path: request?.url || 'unknown',
      },
    );

    response.status(400).json(errorResponse);
  }

  private formatValidationErrors(messages: string[]): Array<{
    field: string;
    message: string;
    value?: any;
  }> {
    return messages.map((message) => {
      // Extract field name from validation message
      const fieldMatch = message.match(/^(\w+)\s+(.+)$/);

      if (fieldMatch) {
        return {
          field: fieldMatch[1],
          message: fieldMatch[2],
        };
      }

      return {
        field: 'unknown',
        message: message,
      };
    });
  }

  private generateCorrelationId(): string {
    return `val_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
