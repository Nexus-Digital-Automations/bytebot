/**
 * Security Logging Interceptor
 *
 * Basic security logging interceptor for audit trails.
 * This is a minimal implementation to resolve import dependencies.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap, catchError } from "rxjs/operators";
import { throwError } from "rxjs";

// Export both SecurityLoggingInterceptor and AuditLoggingInterceptor for compatibility
export const AuditLoggingInterceptor = SecurityLoggingInterceptor;

@Injectable()
export class SecurityLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SecurityLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    // Log incoming request
    this.logger.log(`${method} ${url}`, "REQUEST");

    return next.handle().pipe(
      tap((_data) => {
        // Log successful response
        this.logger.log(`${method} ${url} - Success`, "RESPONSE");
      }),
      catchError((error) => {
        // Log error response
        this.logger.error(
          `${method} ${url} - Error: ${error instanceof Error ? error.message : String(error)}`,
          "ERROR",
        );
        return throwError(error);
      }),
    );
  }
}
