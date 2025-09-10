/**
 * Response Interceptor
 *
 * Basic response formatting interceptor for consistent API responses.
 * This is a minimal implementation to resolve import dependencies.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // Basic response formatting
        if (data && typeof data === "object" && !data.timestamp) {
          return {
            ...data,
            timestamp: new Date().toISOString(),
          };
        }
        return data;
      }),
    );
  }
}
