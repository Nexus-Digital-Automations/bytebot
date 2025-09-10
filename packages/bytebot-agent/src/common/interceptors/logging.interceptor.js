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
var LoggingInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const uuid_1 = require("uuid");
let LoggingInterceptor = LoggingInterceptor_1 = class LoggingInterceptor {
    logger = new common_1.Logger(LoggingInterceptor_1.name);
    constructor() {
        this.logger.log('Enterprise Structured Logging Interceptor initialized');
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const correlationId = this.getOrCreateCorrelationId(request);
        const requestContext = {
            correlationId,
            startTime: Date.now(),
            userId: this.extractUserId(request),
            sessionId: this.extractSessionId(request),
            requestSize: this.calculateRequestSize(request),
        };
        response.setHeader('X-Correlation-ID', correlationId);
        this.logIncomingRequest(request, requestContext);
        return next.handle().pipe((0, operators_1.tap)((responseData) => {
            this.logSuccessfulResponse(request, response, requestContext, responseData);
        }), (0, operators_1.catchError)((error) => {
            this.logErrorResponse(request, response, requestContext, error);
            return (0, rxjs_1.throwError)(error);
        }));
    }
    getOrCreateCorrelationId(request) {
        const existingId = request.headers['x-correlation-id'] ||
            request.headers['x-request-id'] ||
            request.headers['correlation-id'];
        if (existingId && typeof existingId === 'string') {
            return existingId;
        }
        return `req_${Date.now()}_${(0, uuid_1.v4)().substring(0, 8)}`;
    }
    extractUserId(request) {
        if (request.user && typeof request.user === 'object') {
            const user = request.user;
            const userId = user.id ?? user.sub ?? user.userId;
            return userId ? String(userId) : undefined;
        }
        if (request.session?.userId) {
            return String(request.session.userId);
        }
        const userIdHeader = request.headers['x-user-id'];
        if (userIdHeader && typeof userIdHeader === 'string') {
            return userIdHeader;
        }
        return undefined;
    }
    extractSessionId(request) {
        if (request.session?.id) {
            return request.session.id;
        }
        const sessionHeader = request.headers['x-session-id'];
        if (sessionHeader && typeof sessionHeader === 'string') {
            return sessionHeader;
        }
        return undefined;
    }
    calculateRequestSize(request) {
        if (request.body) {
            try {
                return JSON.stringify(request.body).length;
            }
            catch {
                return 0;
            }
        }
        return 0;
    }
    calculateResponseSize(responseData) {
        if (responseData) {
            try {
                return JSON.stringify(responseData).length;
            }
            catch {
                return 0;
            }
        }
        return 0;
    }
    extractClientIP(request) {
        return (request.headers['x-forwarded-for'] ||
            request.headers['x-real-ip'] ||
            request.connection.remoteAddress ||
            request.socket.remoteAddress ||
            'unknown');
    }
    logIncomingRequest(request, context) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            correlationId: context.correlationId,
            level: 'info',
            event: 'http_request_incoming',
            component: 'api',
            method: request.method,
            url: this.sanitizeUrl(request.url),
            userId: context.userId,
            userAgent: request.headers['user-agent'],
            ip: this.extractClientIP(request),
            requestSize: context.requestSize,
            metadata: {
                headers: this.sanitizeHeaders(request.headers),
                query: request.query,
                params: request.params,
                sessionId: context.sessionId,
                contentType: request.headers['content-type'],
                contentLength: request.headers['content-length'],
            },
        };
        if (this.isHealthCheck(request.url)) {
            this.logger.debug(JSON.stringify(logEntry));
        }
        else {
            this.logger.log(JSON.stringify(logEntry));
        }
    }
    logSuccessfulResponse(request, response, context, responseData) {
        const duration = Date.now() - context.startTime;
        const responseSize = this.calculateResponseSize(responseData);
        const logEntry = {
            timestamp: new Date().toISOString(),
            correlationId: context.correlationId,
            level: 'info',
            event: 'http_request_completed',
            component: 'api',
            method: request.method,
            url: this.sanitizeUrl(request.url),
            statusCode: response.statusCode,
            userId: context.userId,
            duration,
            requestSize: context.requestSize,
            responseSize,
            metadata: {
                sessionId: context.sessionId,
                responseHeaders: this.sanitizeHeaders(response.getHeaders()),
                performanceCategory: this.categorizePerformance(duration),
                cached: response.getHeader('x-cache-status') === 'HIT',
            },
        };
        if (this.isHealthCheck(request.url)) {
            this.logger.debug(JSON.stringify(logEntry));
        }
        else if (duration > 5000) {
            this.logger.warn(JSON.stringify(logEntry));
        }
        else {
            this.logger.log(JSON.stringify(logEntry));
        }
    }
    logErrorResponse(request, response, context, error) {
        const duration = Date.now() - context.startTime;
        const statusCode = error.status ?? error.statusCode ?? 500;
        const errorMessage = error.message ?? 'Unknown error';
        const errorStack = error.stack ?? '';
        const errorType = error.constructor?.name ?? 'Error';
        const errorCode = error.code ?? '';
        const errorDetails = error.details ?? error.response;
        const logEntry = {
            timestamp: new Date().toISOString(),
            correlationId: context.correlationId,
            level: 'error',
            event: 'http_request_error',
            component: 'api',
            method: request.method,
            url: this.sanitizeUrl(request.url),
            statusCode,
            userId: context.userId,
            duration,
            requestSize: context.requestSize,
            error: {
                message: errorMessage,
                stack: errorStack,
                type: errorType,
            },
            metadata: {
                sessionId: context.sessionId,
                errorCode,
                errorDetails,
                requestBody: this.sanitizeRequestBody(request.body),
                userAgent: request.headers['user-agent'],
                ip: this.extractClientIP(request),
                performanceCategory: this.categorizePerformance(duration),
            },
        };
        this.logger.error(JSON.stringify(logEntry));
    }
    sanitizeUrl(url) {
        if (!url)
            return 'unknown';
        const sensitiveParams = ['password', 'token', 'key', 'secret', 'auth'];
        let sanitizedUrl = url;
        sensitiveParams.forEach((param) => {
            const regex = new RegExp(`([?&])${param}=[^&]*`, 'gi');
            sanitizedUrl = sanitizedUrl.replace(regex, `$1${param}=***`);
        });
        return sanitizedUrl;
    }
    sanitizeHeaders(headers) {
        const sensitiveHeaders = [
            'authorization',
            'cookie',
            'x-api-key',
            'x-auth-token',
            'x-secret-key',
        ];
        const sanitized = {};
        Object.keys(headers).forEach((key) => {
            const lowerKey = key.toLowerCase();
            if (sensitiveHeaders.includes(lowerKey)) {
                sanitized[key] = '***';
            }
            else {
                const headerValue = headers[key];
                sanitized[key] = headerValue;
            }
        });
        return sanitized;
    }
    sanitizeRequestBody(body) {
        if (!body || typeof body !== 'object' || body === null) {
            return body;
        }
        const sensitiveFields = ['password', 'secret', 'token', 'key', 'auth'];
        const bodyObj = body;
        const sanitized = { ...bodyObj };
        sensitiveFields.forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(sanitized, field)) {
                sanitized[field] = '***';
            }
        });
        return sanitized;
    }
    isHealthCheck(url) {
        const healthPaths = ['/health', '/metrics', '/ping', '/status'];
        return healthPaths.some((path) => url.includes(path));
    }
    categorizePerformance(duration) {
        if (duration < 100)
            return 'excellent';
        if (duration < 500)
            return 'good';
        if (duration < 1000)
            return 'acceptable';
        if (duration < 5000)
            return 'slow';
        return 'critical';
    }
};
exports.LoggingInterceptor = LoggingInterceptor;
exports.LoggingInterceptor = LoggingInterceptor = LoggingInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], LoggingInterceptor);
//# sourceMappingURL=logging.interceptor.js.map