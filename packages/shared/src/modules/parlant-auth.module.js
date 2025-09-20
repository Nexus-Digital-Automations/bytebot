"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ParlantAuthModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParlantAuthModule = void 0;
exports.createEnvironmentConfig = createEnvironmentConfig;
exports.validateParlantAuthConfig = validateParlantAuthConfig;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const cache_manager_1 = require("@nestjs/cache-manager");
const parlant_integration_service_1 = require("../services/parlant-integration.service");
const parlant_enhanced_auth_service_1 = require("../services/parlant-enhanced-auth.service");
const parlant_mfa_service_1 = require("../services/parlant-mfa.service");
const parlant_enhanced_rbac_guard_1 = require("../guards/parlant-enhanced-rbac.guard");
const rbac_authorization_guard_1 = require("../guards/rbac-authorization.guard");
const parlant_enhanced_auth_middleware_1 = require("../middleware/parlant-enhanced-auth.middleware");
const core_1 = require("@nestjs/core");
const DEFAULT_OPTIONS = {
    enableConversationalAuth: true,
    enableConversationalAuthz: true,
    enableConversationalMFA: true,
    riskAssessment: {
        enabled: true,
        thresholds: {
            low: 25,
            medium: 50,
            high: 75,
            critical: 90,
        },
    },
    mfa: {
        challengeExpiry: 300000,
        maxAttempts: 3,
        supportedMethods: ["sms", "email", "totp"],
    },
    conversation: {
        timeout: 30000,
        cacheTTL: 300000,
    },
    performance: {
        caching: true,
        cacheTTL: 300000,
        targetResponseTime: 500,
    },
    security: {
        jwtExpiresIn: "15m",
        auditLogging: true,
    },
    fallback: {
        enabled: true,
        timeout: 5000,
    },
};
let ParlantAuthModule = ParlantAuthModule_1 = class ParlantAuthModule {
    static forRoot(options = {}) {
        const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
        return {
            module: ParlantAuthModule_1,
            imports: [
                config_1.ConfigModule.forFeature(() => ({
                    parlantAuth: mergedOptions,
                })),
                jwt_1.JwtModule.register({
                    secret: mergedOptions.security?.jwtSecret ||
                        process.env.JWT_SECRET ||
                        "default-secret",
                    signOptions: {
                        expiresIn: mergedOptions.security?.jwtExpiresIn || "15m",
                    },
                }),
                cache_manager_1.CacheModule.register({
                    ttl: mergedOptions.performance?.cacheTTL || 300000,
                    max: 1000,
                }),
            ],
            providers: [
                {
                    provide: "PARLANT_AUTH_OPTIONS",
                    useValue: mergedOptions,
                },
                parlant_integration_service_1.ParlantIntegrationService,
                parlant_enhanced_auth_service_1.ParlantEnhancedAuthService,
                parlant_mfa_service_1.ParlantMFAService,
                parlant_enhanced_rbac_guard_1.ParlantEnhancedRBACGuard,
                rbac_authorization_guard_1.RBACAuthorizationGuard,
                parlant_enhanced_auth_middleware_1.ParlantEnhancedAuthMiddleware,
                core_1.Reflector,
                {
                    provide: "PARLANT_RISK_THRESHOLDS",
                    useFactory: (config) => {
                        return (config.get("parlantAuth.riskAssessment.thresholds") ||
                            mergedOptions.riskAssessment?.thresholds);
                    },
                    inject: [config_1.ConfigService],
                },
                {
                    provide: "PARLANT_MFA_CONFIG",
                    useFactory: (config) => {
                        return config.get("parlantAuth.mfa") || mergedOptions.mfa;
                    },
                    inject: [config_1.ConfigService],
                },
                {
                    provide: "PARLANT_CONVERSATION_CONFIG",
                    useFactory: (config) => {
                        return (config.get("parlantAuth.conversation") ||
                            mergedOptions.conversation);
                    },
                    inject: [config_1.ConfigService],
                },
            ],
            exports: [
                parlant_integration_service_1.ParlantIntegrationService,
                parlant_enhanced_auth_service_1.ParlantEnhancedAuthService,
                parlant_mfa_service_1.ParlantMFAService,
                parlant_enhanced_rbac_guard_1.ParlantEnhancedRBACGuard,
                rbac_authorization_guard_1.RBACAuthorizationGuard,
                parlant_enhanced_auth_middleware_1.ParlantEnhancedAuthMiddleware,
                "PARLANT_AUTH_OPTIONS",
                "PARLANT_RISK_THRESHOLDS",
                "PARLANT_MFA_CONFIG",
                "PARLANT_CONVERSATION_CONFIG",
            ],
            global: true,
        };
    }
    static forRootAsync(options) {
        return {
            module: ParlantAuthModule_1,
            imports: [
                ...(options.imports || []),
                config_1.ConfigModule,
                jwt_1.JwtModule.registerAsync({
                    imports: options.imports,
                    useFactory: async (...args) => {
                        const parlantOptions = options.useFactory
                            ? await options.useFactory(...args)
                            : {};
                        const mergedOptions = { ...DEFAULT_OPTIONS, ...parlantOptions };
                        return {
                            secret: mergedOptions.security?.jwtSecret ||
                                process.env.JWT_SECRET ||
                                "default-secret",
                            signOptions: {
                                expiresIn: mergedOptions.security?.jwtExpiresIn || "15m",
                            },
                        };
                    },
                    inject: (options.inject || []),
                }),
                cache_manager_1.CacheModule.registerAsync({
                    imports: options.imports,
                    useFactory: async (...args) => {
                        const parlantOptions = options.useFactory
                            ? await options.useFactory(...args)
                            : {};
                        const mergedOptions = { ...DEFAULT_OPTIONS, ...parlantOptions };
                        return {
                            ttl: mergedOptions.performance?.cacheTTL || 300000,
                            max: 1000,
                        };
                    },
                    inject: (options.inject || []),
                }),
            ],
            providers: [
                ...(options.providers || []),
                {
                    provide: "PARLANT_AUTH_OPTIONS",
                    useFactory: options.useFactory || (() => ({})),
                    inject: (options.inject || []),
                },
                parlant_integration_service_1.ParlantIntegrationService,
                parlant_enhanced_auth_service_1.ParlantEnhancedAuthService,
                parlant_mfa_service_1.ParlantMFAService,
                parlant_enhanced_rbac_guard_1.ParlantEnhancedRBACGuard,
                rbac_authorization_guard_1.RBACAuthorizationGuard,
                parlant_enhanced_auth_middleware_1.ParlantEnhancedAuthMiddleware,
                core_1.Reflector,
                {
                    provide: "PARLANT_RISK_THRESHOLDS",
                    useFactory: async (...args) => {
                        const parlantOptions = options.useFactory
                            ? await options.useFactory(...args)
                            : {};
                        const mergedOptions = { ...DEFAULT_OPTIONS, ...parlantOptions };
                        return mergedOptions.riskAssessment?.thresholds;
                    },
                    inject: (options.inject || []),
                },
                {
                    provide: "PARLANT_MFA_CONFIG",
                    useFactory: async (...args) => {
                        const parlantOptions = options.useFactory
                            ? await options.useFactory(...args)
                            : {};
                        const mergedOptions = { ...DEFAULT_OPTIONS, ...parlantOptions };
                        return mergedOptions.mfa;
                    },
                    inject: (options.inject || []),
                },
                {
                    provide: "PARLANT_CONVERSATION_CONFIG",
                    useFactory: async (...args) => {
                        const parlantOptions = options.useFactory
                            ? await options.useFactory(...args)
                            : {};
                        const mergedOptions = { ...DEFAULT_OPTIONS, ...parlantOptions };
                        return mergedOptions.conversation;
                    },
                    inject: (options.inject || []),
                },
            ],
            exports: [
                parlant_integration_service_1.ParlantIntegrationService,
                parlant_enhanced_auth_service_1.ParlantEnhancedAuthService,
                parlant_mfa_service_1.ParlantMFAService,
                parlant_enhanced_rbac_guard_1.ParlantEnhancedRBACGuard,
                rbac_authorization_guard_1.RBACAuthorizationGuard,
                parlant_enhanced_auth_middleware_1.ParlantEnhancedAuthMiddleware,
                "PARLANT_AUTH_OPTIONS",
                "PARLANT_RISK_THRESHOLDS",
                "PARLANT_MFA_CONFIG",
                "PARLANT_CONVERSATION_CONFIG",
            ],
            global: true,
        };
    }
    static forFeature(features) {
        const providers = [];
        const exports = [];
        if (features.auth) {
            providers.push(parlant_enhanced_auth_service_1.ParlantEnhancedAuthService);
            exports.push(parlant_enhanced_auth_service_1.ParlantEnhancedAuthService);
        }
        if (features.authz) {
            providers.push(parlant_enhanced_rbac_guard_1.ParlantEnhancedRBACGuard);
            exports.push(parlant_enhanced_rbac_guard_1.ParlantEnhancedRBACGuard);
        }
        if (features.mfa) {
            providers.push(parlant_mfa_service_1.ParlantMFAService);
            exports.push(parlant_mfa_service_1.ParlantMFAService);
        }
        if (Object.values(features).some(Boolean)) {
            providers.push(parlant_integration_service_1.ParlantIntegrationService);
            exports.push(parlant_integration_service_1.ParlantIntegrationService);
        }
        return {
            module: ParlantAuthModule_1,
            providers: providers,
            exports: exports,
        };
    }
};
exports.ParlantAuthModule = ParlantAuthModule;
exports.ParlantAuthModule = ParlantAuthModule = ParlantAuthModule_1 = __decorate([
    (0, common_1.Module)({})
], ParlantAuthModule);
function createEnvironmentConfig() {
    return {
        enableConversationalAuth: process.env.PARLANT_AUTH_ENABLED === "true",
        enableConversationalAuthz: process.env.PARLANT_AUTHZ_ENABLED === "true",
        enableConversationalMFA: process.env.PARLANT_MFA_ENABLED === "true",
        riskAssessment: {
            enabled: process.env.PARLANT_RISK_ASSESSMENT_ENABLED === "true",
            thresholds: {
                low: parseInt(process.env.PARLANT_RISK_LOW_THRESHOLD || "25"),
                medium: parseInt(process.env.PARLANT_RISK_MEDIUM_THRESHOLD || "50"),
                high: parseInt(process.env.PARLANT_RISK_HIGH_THRESHOLD || "75"),
                critical: parseInt(process.env.PARLANT_RISK_CRITICAL_THRESHOLD || "90"),
            },
        },
        mfa: {
            challengeExpiry: parseInt(process.env.PARLANT_MFA_CHALLENGE_EXPIRY || "300000"),
            maxAttempts: parseInt(process.env.PARLANT_MFA_MAX_ATTEMPTS || "3"),
            supportedMethods: process.env.PARLANT_MFA_SUPPORTED_METHODS?.split(",") || ["sms", "email", "totp"],
        },
        conversation: {
            timeout: parseInt(process.env.PARLANT_CONVERSATION_TIMEOUT || "30000"),
            cacheTTL: parseInt(process.env.PARLANT_CONVERSATION_CACHE_TTL || "300000"),
        },
        performance: {
            caching: process.env.PARLANT_CACHING_ENABLED !== "false",
            cacheTTL: parseInt(process.env.PARLANT_CACHE_TTL || "300000"),
            targetResponseTime: parseInt(process.env.PARLANT_TARGET_RESPONSE_TIME || "500"),
        },
        security: {
            jwtSecret: process.env.JWT_SECRET,
            jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
            auditLogging: process.env.PARLANT_AUDIT_LOGGING_ENABLED !== "false",
        },
        fallback: {
            enabled: process.env.PARLANT_FALLBACK_ENABLED !== "false",
            timeout: parseInt(process.env.PARLANT_FALLBACK_TIMEOUT || "5000"),
        },
    };
}
function validateParlantAuthConfig(options) {
    if (options.riskAssessment?.thresholds) {
        const thresholds = options.riskAssessment.thresholds;
        if (thresholds.low >= thresholds.medium ||
            thresholds.medium >= thresholds.high ||
            thresholds.high >= thresholds.critical) {
            throw new Error("Risk thresholds must be in ascending order: low < medium < high < critical");
        }
        if (thresholds.critical > 100) {
            throw new Error("Critical risk threshold cannot exceed 100");
        }
    }
    if (options.mfa?.challengeExpiry && options.mfa.challengeExpiry < 30000) {
        throw new Error("MFA challenge expiry must be at least 30 seconds");
    }
    if (options.mfa?.maxAttempts &&
        (options.mfa.maxAttempts < 1 || options.mfa.maxAttempts > 10)) {
        throw new Error("MFA max attempts must be between 1 and 10");
    }
    if (options.conversation?.timeout && options.conversation.timeout < 5000) {
        throw new Error("Conversation timeout must be at least 5 seconds");
    }
    if (options.performance?.targetResponseTime &&
        options.performance.targetResponseTime < 100) {
        throw new Error("Target response time must be at least 100ms");
    }
}
//# sourceMappingURL=parlant-auth.module.js.map