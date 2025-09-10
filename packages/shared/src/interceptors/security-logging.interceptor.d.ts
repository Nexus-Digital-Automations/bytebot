import { NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
export declare class SecurityLoggingInterceptor implements NestInterceptor {
  private readonly logger;
  intercept(
    _context: ExecutionContext,
    _next: CallHandler,
  ): Observable<unknown>;
}
//# sourceMappingURL=security-logging.interceptor.d.ts.map
