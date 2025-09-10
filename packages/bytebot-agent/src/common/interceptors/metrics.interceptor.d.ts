import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MetricsService } from '../../metrics/metrics.service';
export declare class MetricsInterceptor implements NestInterceptor {
    private readonly metricsService;
    private readonly logger;
    constructor(metricsService: MetricsService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
    private extractRoute;
    private normalizeRoutePath;
    private extractUserId;
    private generateOperationId;
    private recordRequestStart;
    private recordSuccessfulRequest;
    private recordErrorRequest;
    private recordErrorRequestOld;
    private recordRequestEnd;
    private calculateResponseSize;
    private categorizeErrorSeverity;
    private shouldExcludeFromMetrics;
}
//# sourceMappingURL=metrics.interceptor.d.ts.map