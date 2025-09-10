"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MetricsInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const metrics_service_1 = require("../../metrics/metrics.service");
let MetricsInterceptor = MetricsInterceptor_1 = class MetricsInterceptor {
    metricsService;
    logger = new common_1.Logger(MetricsInterceptor_1.name);
    constructor(metricsService) {
        this.metricsService = metricsService;
        if (this.metricsService) {
            this.logger.log('Metrics Interceptor initialized with Prometheus integration');
        }
        else {
            this.logger.warn('Metrics Interceptor initialized without Prometheus service');
        }
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const metricsContext = {
            startTime: Date.now(),
            route: this.extractRoute(context, request),
            method: request.method,
            userId: this.extractUserId(request),
            operationId: this.generateOperationId(),
        };
        this.recordRequestStart(metricsContext);
        this.logger.debug(`[${metricsContext.operationId}] Request metrics collection started`, {
            method: metricsContext.method,
            route: metricsContext.route,
            userId: metricsContext.userId,
        });
        return next.handle().pipe((0, operators_1.tap)((responseData) => {
            this.recordSuccessfulRequest(metricsContext, response.statusCode, responseData);
        }), (0, operators_1.catchError)((error) => {
            this.recordErrorRequest(metricsContext, error);
            return (0, rxjs_1.throwError)(error);
        }), (0, operators_1.finalize)(() => {
            this.recordRequestEnd(metricsContext);
        }));
    }
    extractRoute(context, request) {
        try {
            const handler = context.getHandler();
            const controller = context.getClass();
            if (handler && controller) {
                const controllerPath = Reflect.getMetadata('path', controller) ?? '';
                const handlerPath = Reflect.getMetadata('path', handler) ?? '';
                const route = `${controllerPath}${handlerPath}`.replace(/\/+/g, '/');
                if (route && route !== '/') {
                    return route;
                }
            }
        }
        catch (error) {
            this.logger.debug('Failed to extract route from context, using URL path', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return this.normalizeRoutePath(request.url);
    }
    normalizeRoutePath(url) {
        if (!url)
            return '/unknown';
        const path = url.split('?')[0];
        const normalizedPath = path
            .replace(/\/\d+/g, '/:id')
            .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
            .replace(/\/[a-f0-9]{24}/g, '/:objectId')
            .replace(/\/+/g, '/')
            .replace(/\/$/, '') || '/';
        return normalizedPath;
    }
    extractUserId(request) {
        if (request.user && typeof request.user === 'object') {
            const user = request.user;
            const userId = user.id ?? user.sub ?? user.userId;
            return userId ? String(userId) : undefined;
        }
        const userIdHeader = request.headers['x-user-id'];
        if (userIdHeader && typeof userIdHeader === 'string') {
            return userIdHeader;
        }
        return undefined;
    }
    generateOperationId() {
        return `metrics_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }
    recordRequestStart(context) {
        if (!this.metricsService)
            return;
        try {
            this.metricsService.recordRequestStart(context.method, context.route);
            this.logger.debug(`[${context.operationId}] Request start recorded`, {
                method: context.method,
                route: context.route,
            });
        }
        catch (error) {
            this.logger.error(`[${context.operationId}] Failed to record request start`, {
                error: error instanceof Error ? error.message : String(error),
                method: context.method,
                route: context.route,
            });
        }
    }
    recordSuccessfulRequest(context, statusCode, responseData) {
        if (!this.metricsService)
            return;
        try {
            const duration = Date.now() - context.startTime;
            this.metricsService.recordApiRequest(context.method, context.route, statusCode, duration, context.userId);
            this.logger.debug(`[${context.operationId}] Successful request metrics recorded`, {
                method: context.method,
                route: context.route,
                statusCode,
                durationMs: duration,
                userId: context.userId,
                responseSize: this.calculateResponseSize(responseData),
                hasResponseData: !!responseData,
            });
        }
        catch (error) {
            this.logger.error(`[${context.operationId}] Failed to record successful request metrics`, {
                error: error instanceof Error ? error.message : String(error),
                method: context.method,
                route: context.route,
                statusCode,
            });
        }
    }
    recordErrorRequest(context, error) {
        if (!this.metricsService)
            return;
        try {
            const duration = Date.now() - context.startTime;
            const statusCode = error.status ?? error.statusCode ?? 500;
            const errorType = error.constructor?.name ?? 'UnknownError';
            this.metricsService.recordApiRequest(context.method, context.route, statusCode, duration, context.userId);
            this.metricsService.recordApplicationError(errorType, this.categorizeErrorSeverity(statusCode), 'api');
            this.logger.debug(`[${context.operationId}] Error request metrics recorded`, {
                method: context.method,
                route: context.route,
                statusCode,
                durationMs: duration,
                userId: context.userId,
                errorType,
                errorMessage: error.message ?? 'Unknown error',
            });
        }
        catch (metricsError) {
            this.logger.error(`[${context.operationId}] Failed to record error request metrics`, {
                error: metricsError instanceof Error
                    ? metricsError.message
                    : String(metricsError),
                method: context.method,
                route: context.route,
                originalError: error.message ?? 'Unknown error',
            });
        }
    }
    recordErrorRequestOld(context, error) {
        this.recordErrorRequest(context, error);
    }
    recordRequestEnd(context) {
        if (!this.metricsService)
            return;
        try {
            this.metricsService.recordRequestEnd(context.method, context.route);
            this.logger.debug(`[${context.operationId}] Request end recorded`, {
                method: context.method,
                route: context.route,
                totalDurationMs: Date.now() - context.startTime,
            });
        }
        catch (error) {
            this.logger.error(`[${context.operationId}] Failed to record request end`, {
                error: error instanceof Error ? error.message : String(error),
                method: context.method,
                route: context.route,
            });
        }
    }
    calculateResponseSize(responseData) {
        if (!responseData)
            return 0;
        try {
            if (typeof responseData === 'string') {
                return responseData.length;
            }
            if (typeof responseData === 'object') {
                return JSON.stringify(responseData).length;
            }
            if (typeof responseData === 'number' ||
                typeof responseData === 'boolean') {
                return String(responseData).length;
            }
            try {
                return JSON.stringify(responseData).length;
            }
            catch {
                if (responseData && typeof responseData === 'object') {
                    if (responseData instanceof Error) {
                        return responseData.message.length || responseData.name.length;
                    }
                    if ('toString' in responseData &&
                        typeof responseData.toString === 'function' &&
                        responseData.toString !== Object.prototype.toString) {
                        try {
                            const stringified = responseData.toString();
                            return typeof stringified === 'string'
                                ? stringified.length
                                : '[object Unknown]'.length;
                        }
                        catch {
                            return '[object Unknown]'.length;
                        }
                    }
                }
                return '[object Unknown]'.length;
            }
        }
        catch {
            return 0;
        }
    }
    categorizeErrorSeverity(statusCode) {
        if (statusCode >= 500)
            return 'critical';
        if (statusCode >= 400 && statusCode < 500)
            return 'medium';
        if (statusCode >= 300 && statusCode < 400)
            return 'low';
        return 'low';
    }
    shouldExcludeFromMetrics(route) {
        const excludedRoutes = ['/metrics', '/health', '/favicon.ico'];
        return excludedRoutes.some((excluded) => route.includes(excluded));
    }
};
exports.MetricsInterceptor = MetricsInterceptor;
exports.MetricsInterceptor = MetricsInterceptor = MetricsInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(metrics_service_1.MetricsService)),
    __metadata("design:paramtypes", [metrics_service_1.MetricsService])
], MetricsInterceptor);
//# sourceMappingURL=metrics.interceptor.js.map