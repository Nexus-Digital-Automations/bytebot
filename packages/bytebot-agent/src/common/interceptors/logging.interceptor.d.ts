import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
export declare class LoggingInterceptor implements NestInterceptor {
    private readonly logger;
    constructor();
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
    private getOrCreateCorrelationId;
    private extractUserId;
    private extractSessionId;
    private calculateRequestSize;
    private calculateResponseSize;
    private extractClientIP;
    private logIncomingRequest;
    private logSuccessfulResponse;
    private logErrorResponse;
    private sanitizeUrl;
    private sanitizeHeaders;
    private sanitizeRequestBody;
    private isHealthCheck;
    private categorizePerformance;
}
//# sourceMappingURL=logging.interceptor.d.ts.map