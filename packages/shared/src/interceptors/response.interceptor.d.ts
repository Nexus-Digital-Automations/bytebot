import { NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
export declare class ResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    _next: CallHandler,
  ): Observable<unknown>;
}
//# sourceMappingURL=response.interceptor.d.ts.map
