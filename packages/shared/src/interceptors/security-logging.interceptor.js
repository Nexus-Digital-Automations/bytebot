"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SecurityLoggingInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityLoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const rxjs_1 = require("rxjs");
let SecurityLoggingInterceptor = SecurityLoggingInterceptor_1 = class SecurityLoggingInterceptor {
    constructor() {
        this.logger = new common_1.Logger(SecurityLoggingInterceptor_1.name);
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const { method, url } = request;
        this.logger.log(`${method} ${url}`, "REQUEST");
        return next.handle().pipe((0, operators_1.tap)((data) => {
            this.logger.log(`${method} ${url} - Success`, "RESPONSE");
        }), (0, operators_1.catchError)((error) => {
            this.logger.error(`${method} ${url} - Error: ${error.message}`, "ERROR");
            return (0, rxjs_1.throwError)(error);
        }));
    }
};
exports.SecurityLoggingInterceptor = SecurityLoggingInterceptor;
exports.SecurityLoggingInterceptor = SecurityLoggingInterceptor = SecurityLoggingInterceptor_1 = __decorate([
    (0, common_1.Injectable)()
], SecurityLoggingInterceptor);
//# sourceMappingURL=security-logging.interceptor.js.map