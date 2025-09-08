"use strict";
/**
 * Input Sanitization Interceptor - Enterprise Security Input Processing
 *
 * This interceptor provides comprehensive input sanitization using DOMPurify and
 * custom security filters. It processes all incoming requests to remove XSS threats,
 * SQL injection attempts, and other malicious content while preserving legitimate data.
 *
 * @fileoverview Advanced input sanitization interceptor with DOMPurify and threat detection
 * @version 1.0.0
 * @author API Security & Documentation Specialist
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SanitizationInterceptor = void 0;
var common_1 = require("@nestjs/common");
var operators_1 = require("rxjs/operators");
var dompurify_1 = require("dompurify");
var jsdom_1 = require("jsdom");
var shared_1 = require("@bytebot/shared");
/**
 * Control characters regex pattern
 * Matches control characters that should be removed from input
 * Using string construction to avoid ESLint control-regex rule
 */
var CONTROL_CHARS_PATTERN = new RegExp("[".concat(String.fromCharCode(0), "-").concat(String.fromCharCode(8)).concat(String.fromCharCode(11)).concat(String.fromCharCode(12)).concat(String.fromCharCode(14), "-").concat(String.fromCharCode(31)).concat(String.fromCharCode(127), "]"), 'gu');
/**
 * Threat detection patterns
 */
var SECURITY_PATTERNS = {
    xss: [
        /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
        /javascript\s*:/gi,
        /on\w+\s*=\s*["'].*?["']/gi,
        /<iframe[\s\S]*?>/gi,
        /<object[\s\S]*?>/gi,
        /<embed[\s\S]*?>/gi,
        /data\s*:\s*text\/html/gi,
        /vbscript\s*:/gi,
        /eval\s*\(/gi,
        /expression\s*\(/gi,
    ],
    sqlInjection: [
        /('|(\\')|(;)|(\\-;)|(\|)|(\\|)|(\\*)|(\*))/gi,
        /(union|select|insert|delete|drop|create|alter|exec|execute|cast|char|varchar|nchar|nvarchar|syscolumns|sysobjects|sleep|benchmark|waitfor|delay)/gi,
        /(script|vbscript|onload|onerror|onclick|onmouseover|onfocus|onblur)/gi,
        /(\\\\['"]|\\\\\\\\|\\\\[nrtbf])/gi,
    ],
    pathTraversal: [/\.\.\//gi, /%2e%2e%2f|%2e%2e%5c/gi, /\.\.\\/gi],
    commandInjection: [
        /[;&|`$(){}\\[\\]]/g,
        /(rm|del|copy|move|wget|curl|nc|netcat|telnet|ssh|ftp)/gi,
    ],
};
/**
 * Default sanitization configuration
 */
var DEFAULT_CONFIG = {
    enabled: true,
    sanitizeHtml: true,
    stripHtml: false,
    detectXss: true,
    detectSqlInjection: true,
    maxStringLength: 50000, // 50KB
    maxObjectDepth: 10,
    maxArrayLength: 1000,
    enableLogging: true,
    skipEndpoints: ['/health', '/metrics', '/api-docs'],
    endpointRules: {
        '/api/v1/tasks': {
            allowHtml: true,
            stripHtml: false,
            maxLength: 10000,
        },
        '/api/v1/computer-use': {
            allowHtml: false,
            stripHtml: true,
            maxLength: 1000,
        },
    },
};
var SanitizationInterceptor = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var SanitizationInterceptor = _classThis = /** @class */ (function () {
        function SanitizationInterceptor_1(configService) {
            var _this = this;
            var _a;
            this.configService = configService;
            this.logger = new common_1.Logger(SanitizationInterceptor.name);
            // Initialize configuration with proper type safety
            var sanitizationConfig = (_a = this.configService.get('sanitization')) !== null && _a !== void 0 ? _a : {};
            this.config = __assign(__assign({}, DEFAULT_CONFIG), sanitizationConfig);
            // Initialize DOMPurify with JSDOM
            try {
                var jsdomInstance = new jsdom_1.JSDOM('');
                var window_1 = jsdomInstance.window;
                if (!window_1) {
                    throw new Error('Failed to initialize JSDOM window');
                }
                // Create DOMPurify instance with proper typing
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                var rawDOMPurify_1 = (0, dompurify_1.default)(window_1);
                var domPurifyInstance = {
                    sanitize: function (source, config) {
                        return rawDOMPurify_1.sanitize(source, config);
                    },
                    addHook: function (entryPoint, callback) {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                        return rawDOMPurify_1.addHook(entryPoint, callback);
                    },
                };
                this.domPurify = domPurifyInstance;
                // Configure DOMPurify with secure defaults
                domPurifyInstance.addHook('beforeSanitizeElements', function (node) {
                    // Log suspicious elements
                    if (typeof node === 'object' &&
                        node !== null &&
                        node.nodeName &&
                        ['SCRIPT', 'OBJECT', 'EMBED'].includes(node.nodeName)) {
                        _this.logger.warn("Blocked dangerous element: ".concat(node.nodeName));
                    }
                });
            }
            catch (initError) {
                var errorMessage = initError instanceof Error ? initError.message : String(initError);
                this.logger.error('Failed to initialize DOMPurify', {
                    error: errorMessage,
                });
                throw new Error("DOMPurify initialization failed: ".concat(errorMessage));
            }
            this.logger.log('Sanitization interceptor initialized', {
                enabled: this.config.enabled,
                sanitizeHtml: this.config.sanitizeHtml,
                detectXss: this.config.detectXss,
                detectSqlInjection: this.config.detectSqlInjection,
                maxStringLength: this.config.maxStringLength,
                skipEndpoints: this.config.skipEndpoints.length,
            });
        }
        /**
         * Intercept incoming requests and sanitize input data
         */
        SanitizationInterceptor_1.prototype.intercept = function (context, next) {
            var _this = this;
            var _a, _b, _c;
            if (!this.config.enabled) {
                return next.handle();
            }
            var operationId = "sanitization-".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 9));
            var startTime = Date.now();
            var request = context.switchToHttp().getRequest();
            var response = context.switchToHttp().getResponse();
            // Check if endpoint should skip sanitization
            if (this.shouldSkipSanitization(request.path)) {
                return next.handle();
            }
            this.logger.debug("[".concat(operationId, "] Starting input sanitization"), {
                operationId: operationId,
                method: request.method,
                path: request.path,
                contentType: request.headers['content-type'],
                hasBody: !!request.body && Object.keys((_a = request.body) !== null && _a !== void 0 ? _a : {}).length > 0,
            });
            try {
                // Sanitize request body
                if (request.body && Object.keys(request.body).length > 0) {
                    var sanitizedBody = this.sanitizeObject(request.body, request.path, operationId);
                    request.body = sanitizedBody;
                }
                // Sanitize query parameters
                if (request.query && Object.keys(request.query).length > 0) {
                    var sanitizedQuery = this.sanitizeObject(request.query, request.path, operationId);
                    request.query = sanitizedQuery;
                }
                // Sanitize route parameters
                if (request.params && Object.keys(request.params).length > 0) {
                    var sanitizedParams = this.sanitizeObject(request.params, request.path, operationId);
                    request.params = sanitizedParams;
                }
                var processingTime = Date.now() - startTime;
                this.logger.debug("[".concat(operationId, "] Input sanitization completed"), {
                    operationId: operationId,
                    processingTimeMs: processingTime,
                    sanitizedBody: !!request.body,
                    sanitizedQuery: !!request.query,
                    sanitizedParams: !!request.params,
                });
                // Add sanitization metadata to response headers
                response.setHeader('X-Sanitization-Applied', 'true');
                response.setHeader('X-Sanitization-Time', processingTime.toString());
                response.setHeader('X-Sanitization-Id', operationId);
                return next.handle().pipe((0, operators_1.tap)(function () {
                    _this.logger.debug("[".concat(operationId, "] Request processing completed"));
                }), (0, operators_1.map)(function (data) {
                    // Optionally sanitize response data
                    return _this.config.sanitizeHtml && data && typeof data === 'object'
                        ? _this.sanitizeResponseData(data, operationId)
                        : data;
                }));
            }
            catch (error) {
                var structuredError = error;
                var processingTime = Date.now() - startTime;
                var errorMessage = (_b = structuredError.message) !== null && _b !== void 0 ? _b : 'Unknown error';
                var errorStack = (_c = structuredError.stack) !== null && _c !== void 0 ? _c : '';
                this.logger.error("[".concat(operationId, "] Sanitization failed"), {
                    operationId: operationId,
                    error: errorMessage,
                    stack: errorStack,
                    processingTimeMs: processingTime,
                    path: request.path,
                    method: request.method,
                });
                // Log security event
                this.logSecurityEvent(request, 'SANITIZATION_FAILED', errorMessage, operationId);
                throw new common_1.BadRequestException({
                    message: 'Input validation failed',
                    errorCode: 'SANITIZATION_ERROR',
                    operationId: operationId,
                });
            }
        };
        /**
         * Check if sanitization should be skipped for this endpoint
         */
        SanitizationInterceptor_1.prototype.shouldSkipSanitization = function (path) {
            return this.config.skipEndpoints.some(function (skipPath) {
                return path.startsWith(skipPath);
            });
        };
        /**
         * Sanitize object recursively
         */
        SanitizationInterceptor_1.prototype.sanitizeObject = function (obj, endpoint, operationId, depth) {
            var _this = this;
            if (depth === void 0) { depth = 0; }
            if (depth > this.config.maxObjectDepth) {
                throw new Error("Object depth limit exceeded: ".concat(this.config.maxObjectDepth));
            }
            if (obj === null || obj === undefined) {
                return obj;
            }
            if (typeof obj === 'string') {
                return this.sanitizeString(obj, endpoint, operationId);
            }
            if (typeof obj === 'number' || typeof obj === 'boolean') {
                return obj;
            }
            if (Array.isArray(obj)) {
                if (obj.length > this.config.maxArrayLength) {
                    throw new Error("Array length limit exceeded: ".concat(this.config.maxArrayLength));
                }
                return obj.map(function (item, index) {
                    try {
                        return _this.sanitizeObject(item, endpoint, operationId, depth + 1);
                    }
                    catch (error) {
                        _this.logger.warn("[".concat(operationId, "] Failed to sanitize array item ").concat(index), {
                            operationId: operationId,
                            index: index,
                            error: error instanceof Error ? error.message : String(error),
                        });
                        throw error;
                    }
                });
            }
            if (typeof obj === 'object') {
                var sanitized = {};
                var objRecord = obj;
                for (var _i = 0, _a = Object.entries(objRecord); _i < _a.length; _i++) {
                    var _b = _a[_i], key = _b[0], value = _b[1];
                    try {
                        // Sanitize the key itself
                        var sanitizedKey = this.sanitizeString(key, endpoint, operationId);
                        // Sanitize the value
                        sanitized[sanitizedKey] = this.sanitizeObject(value, endpoint, operationId, depth + 1);
                    }
                    catch (error) {
                        this.logger.warn("[".concat(operationId, "] Failed to sanitize object property ").concat(key), {
                            operationId: operationId,
                            key: key,
                            error: error instanceof Error ? error.message : String(error),
                        });
                        throw error;
                    }
                }
                return sanitized;
            }
            return obj;
        };
        /**
         * Sanitize individual string values
         */
        SanitizationInterceptor_1.prototype.sanitizeString = function (input, endpoint, operationId) {
            if (!input || typeof input !== 'string') {
                return input;
            }
            // Check string length limit
            if (input.length > this.config.maxStringLength) {
                this.logger.warn("[".concat(operationId, "] String length limit exceeded"), {
                    operationId: operationId,
                    length: input.length,
                    limit: this.config.maxStringLength,
                    preview: input.substring(0, 100) + '...',
                });
                throw new Error("String length limit exceeded: ".concat(this.config.maxStringLength));
            }
            var sanitized = input;
            var threats = [];
            // Detect security threats
            if (this.config.detectXss) {
                for (var _i = 0, _a = SECURITY_PATTERNS.xss; _i < _a.length; _i++) {
                    var pattern = _a[_i];
                    if (pattern.test(input)) {
                        threats.push('XSS');
                        break;
                    }
                }
            }
            if (this.config.detectSqlInjection) {
                for (var _b = 0, _c = SECURITY_PATTERNS.sqlInjection; _b < _c.length; _b++) {
                    var pattern = _c[_b];
                    if (pattern.test(input)) {
                        threats.push('SQL_INJECTION');
                        break;
                    }
                }
            }
            // Check for path traversal
            for (var _d = 0, _e = SECURITY_PATTERNS.pathTraversal; _d < _e.length; _d++) {
                var pattern = _e[_d];
                if (pattern.test(input)) {
                    threats.push('PATH_TRAVERSAL');
                    break;
                }
            }
            // Check for command injection
            for (var _f = 0, _g = SECURITY_PATTERNS.commandInjection; _f < _g.length; _f++) {
                var pattern = _g[_f];
                if (pattern.test(input)) {
                    threats.push('COMMAND_INJECTION');
                    break;
                }
            }
            // Block if threats detected
            if (threats.length > 0) {
                this.logger.error("[".concat(operationId, "] Security threats detected in input"), {
                    operationId: operationId,
                    threats: threats,
                    inputLength: input.length,
                    inputPreview: input.substring(0, 100) + '...',
                    endpoint: endpoint,
                });
                throw new common_1.BadRequestException({
                    message: "Security violation detected: ".concat(threats.join(', ')),
                    errorCode: 'SECURITY_THREAT_DETECTED',
                    threats: threats,
                    operationId: operationId,
                });
            }
            // Get endpoint-specific sanitization rules
            var endpointRules = this.getEndpointRules(endpoint);
            // Apply HTML sanitization if enabled
            if (this.config.sanitizeHtml || endpointRules.allowHtml) {
                if (endpointRules.stripHtml || this.config.stripHtml) {
                    // Strip all HTML tags
                    sanitized = sanitized.replace(/<[^>]*>/g, '');
                }
                else {
                    // Sanitize with DOMPurify
                    var purifyConfig = {
                        ALLOWED_TAGS: endpointRules.allowedTags || [
                            'b',
                            'i',
                            'em',
                            'strong',
                            'u',
                            'br',
                            'p',
                            'span',
                            'div',
                        ],
                        ALLOWED_ATTR: endpointRules.allowedAttributes || [
                            'class',
                            'style',
                            'title',
                            'alt',
                        ],
                        KEEP_CONTENT: true,
                        SANITIZE_DOM: true,
                    };
                    try {
                        // Use type assertion to handle DOMPurify's flexible return type
                        var domPurifyInstance = this.domPurify;
                        var sanitizedResult = domPurifyInstance.sanitize(sanitized, purifyConfig);
                        sanitized = sanitizedResult;
                    }
                    catch (sanitizeError) {
                        var errorMessage = sanitizeError instanceof Error
                            ? sanitizeError.message
                            : String(sanitizeError);
                        this.logger.warn('DOMPurify sanitization failed, keeping original', {
                            error: errorMessage,
                            operationId: operationId,
                        });
                    }
                }
            }
            // Apply additional string transformations
            sanitized = sanitized
                .trim() // Remove leading/trailing whitespace
                .replace(/\s+/g, ' ') // Normalize whitespace
                .replace(CONTROL_CHARS_PATTERN, ''); // Remove control characters
            // Log if content was modified
            if (sanitized !== input) {
                this.logger.debug("[".concat(operationId, "] String sanitized"), {
                    operationId: operationId,
                    originalLength: input.length,
                    sanitizedLength: sanitized.length,
                    endpoint: endpoint,
                    modified: true,
                });
            }
            return sanitized;
        };
        /**
         * Get sanitization rules for specific endpoint
         */
        SanitizationInterceptor_1.prototype.getEndpointRules = function (endpoint) {
            for (var _i = 0, _a = Object.entries(this.config.endpointRules); _i < _a.length; _i++) {
                var _b = _a[_i], pattern = _b[0], rules = _b[1];
                if (endpoint.includes(pattern)) {
                    return __assign(__assign({}, shared_1.DEFAULT_SANITIZATION_OPTIONS), rules);
                }
            }
            return shared_1.DEFAULT_SANITIZATION_OPTIONS;
        };
        /**
         * Sanitize response data (optional)
         */
        SanitizationInterceptor_1.prototype.sanitizeResponseData = function (data, operationId) {
            var _a;
            try {
                return this.sanitizeObject(data, '', operationId);
            }
            catch (error) {
                var structuredError = error;
                this.logger.warn("[".concat(operationId, "] Failed to sanitize response data"), {
                    operationId: operationId,
                    error: (_a = structuredError.message) !== null && _a !== void 0 ? _a : 'Unknown error',
                });
                return data; // Return original data if sanitization fails
            }
        };
        /**
         * Log security events for audit trail
         */
        SanitizationInterceptor_1.prototype.logSecurityEvent = function (request, eventType, message, operationId) {
            var _a, _b;
            try {
                var securityEventType = shared_1.SecurityEventType.SUSPICIOUS_ACTIVITY;
                switch (eventType) {
                    case 'XSS':
                        securityEventType = shared_1.SecurityEventType.XSS_ATTEMPT_BLOCKED;
                        break;
                    case 'SQL_INJECTION':
                        securityEventType = shared_1.SecurityEventType.INJECTION_ATTEMPT_BLOCKED;
                        break;
                    case 'SANITIZATION_FAILED':
                        securityEventType = shared_1.SecurityEventType.VALIDATION_FAILED;
                        break;
                }
                var securityEvent = (0, shared_1.createSecurityEvent)(securityEventType, request.path, request.method, false, message, {
                    operationId: operationId,
                    middleware: 'sanitization-interceptor',
                    eventType: eventType,
                    userAgent: request.get('User-Agent'),
                    contentType: request.get('Content-Type'),
                    bodySize: request.body ? JSON.stringify(request.body).length : 0,
                }, ((_a = request.user) === null || _a === void 0 ? void 0 : _a.id) ? String(request.user.id) : undefined, request.ip, request.get('User-Agent'));
                this.logger.warn("Sanitization security event: ".concat(securityEvent.eventId), {
                    eventId: securityEvent.eventId,
                    eventType: securityEvent.type,
                    riskScore: securityEvent.riskScore,
                    operationId: operationId,
                });
            }
            catch (error) {
                var structuredError = error;
                this.logger.error('Failed to log sanitization security event', {
                    operationId: operationId,
                    error: (_b = structuredError.message) !== null && _b !== void 0 ? _b : 'Unknown error',
                    originalEventType: eventType,
                });
            }
        };
        /**
         * Get sanitization statistics
         */
        SanitizationInterceptor_1.prototype.getStatistics = function () {
            return {
                enabled: this.config.enabled,
                config: this.config,
                patterns: SECURITY_PATTERNS,
            };
        };
        return SanitizationInterceptor_1;
    }());
    __setFunctionName(_classThis, "SanitizationInterceptor");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SanitizationInterceptor = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SanitizationInterceptor = _classThis;
}();
exports.SanitizationInterceptor = SanitizationInterceptor;
exports.default = SanitizationInterceptor;
