/// <reference types="node" />
/// <reference types="node" />
import { UserRole, Permission, JwtPayload, PasswordPolicy, SanitizationOptions, ValidationResult, SecurityEvent, SecurityEventType, RateLimitConfig, RateLimitPreset } from "../types/security.types";
export declare const ADVANCED_XSS_PATTERNS: RegExp[];
export declare const ADVANCED_SQL_INJECTION_PATTERNS: RegExp[];
export declare const DEFAULT_PASSWORD_POLICY: PasswordPolicy;
export declare function hashPassword(password: string, saltRounds?: number): Promise<string>;
export declare function verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
export declare function validatePassword(password: string, policy?: PasswordPolicy): ValidationResult;
export declare function generateSecurePassword(length?: number, includeSymbols?: boolean): string;
export declare function generateAccessToken(payload: Omit<JwtPayload, "iat" | "exp">, secret: string, expiresIn?: string): string;
export declare function generateRefreshToken(userId: string, sessionId: string, secret: string): string;
export declare function verifyToken(token: string, secret: string): JwtPayload;
export declare const DEFAULT_SANITIZATION_OPTIONS: SanitizationOptions;
export declare function sanitizeInput(input: string, options?: SanitizationOptions): string;
export declare function sanitizeObject(obj: unknown, options?: SanitizationOptions): unknown;
export declare function detectXSS(input: string): boolean;
export declare function detectSQLInjection(input: string): {
    hasInjection: boolean;
    threats: string[];
    riskScore: number;
    severity: "low" | "medium" | "high" | "critical";
    confidence: number;
    detectionContext: string[];
    databaseType?: string;
};
export declare function detectSQLInjectionLegacy(input: string): boolean;
export interface CommandInjectionResult {
    hasInjection: boolean;
    threats: string[];
    riskScore: number;
    severity: "low" | "medium" | "high" | "critical";
    confidence: number;
    detectionContext: string[];
    platformType?: string;
    attackVectors: string[];
}
export declare function detectCommandInjection(input: string, options?: {
    strictMode?: boolean;
    contextType?: "url" | "form" | "api" | "file" | "general";
}): CommandInjectionResult;
export declare const ROLE_PERMISSIONS: Record<UserRole, Permission[]>;
export declare function hasPermission(userRole: UserRole, requiredPermissions: Permission[], requireAll?: boolean): boolean;
export declare function hasRole(userRole: UserRole, requiredRoles: UserRole[], requireAll?: boolean): boolean;
export declare function generateEventId(): string;
export declare function calculateRiskScore(eventType: SecurityEventType, metadata?: Record<string, unknown>): number;
export declare function createSecurityEvent(type: SecurityEventType, resource: string, method: string, success: boolean, message: string, metadata?: Record<string, unknown>, userId?: string, ipAddress?: string, userAgent?: string, sessionId?: string): SecurityEvent;
export declare const DEFAULT_RATE_LIMITS: Record<RateLimitPreset, RateLimitConfig>;
export declare function getRateLimitConfig(preset: RateLimitPreset): RateLimitConfig;
export declare function getAllRateLimitConfigs(): Record<RateLimitPreset, RateLimitConfig>;
export declare function generateRateLimitKey(req: {
    ip?: string;
    connection?: {
        remoteAddress?: string;
    };
    user?: {
        id?: string;
    };
}, prefix?: string): string;
export declare function generateRandomString(length?: number, encoding?: BufferEncoding): string;
export declare function generateHMAC(data: string, secret: string, algorithm?: string): string;
export declare function verifyHMAC(data: string, signature: string, secret: string, algorithm?: string): boolean;
export declare function hashData(data: string, algorithm?: string): string;
export declare function detectMaliciousFileContent(content: string | Buffer, filename?: string): boolean;
export declare function validateFilePath(filePath: string, allowedBasePaths?: string[], options?: {
    allowAbsolutePaths?: boolean;
    maxPathLength?: number;
    allowedExtensions?: string[];
    strictMode?: boolean;
    logSecurityEvents?: boolean;
}): ValidationResult;
interface CoordinateValidationConfig {
    maxReasonableCoordinate: number;
    multiMonitorSupport: boolean;
    floatingPointProtection: boolean;
    performanceMonitoring: boolean;
    accessibilityChecks: boolean;
    customBounds?: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    };
}
interface MultiMonitorConfig {
    primary: {
        width: number;
        height: number;
        x: number;
        y: number;
    };
    secondary?: Array<{
        width: number;
        height: number;
        x: number;
        y: number;
    }>;
    virtual: {
        width: number;
        height: number;
        x: number;
        y: number;
    };
}
interface CoordinateValidationMetrics {
    startTime: number;
    endTime: number;
    duration: number;
    checksPerformed: string[];
    threatLevel: "none" | "low" | "medium" | "high" | "critical";
}
export declare function validateCoordinates(x: number, y: number, screenBounds?: {
    width: number;
    height: number;
}, multiMonitorConfig?: MultiMonitorConfig, config?: CoordinateValidationConfig): ValidationResult & {
    metrics?: CoordinateValidationMetrics;
    threatAnalysis?: {
        suspiciousPatterns: string[];
        riskScore: number;
        recommendations: string[];
    };
};
export declare const ENHANCED_DOMPURIFY_CONFIGS: {
    readonly ULTRA_STRICT: {
        readonly ALLOWED_TAGS: readonly [];
        readonly ALLOWED_ATTR: readonly [];
        readonly KEEP_CONTENT: true;
        readonly SANITIZE_DOM: true;
        readonly FORBID_TAGS: readonly ["script", "object", "embed", "link", "style", "iframe", "frame", "frameset"];
        readonly FORBID_ATTR: readonly ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit"];
    };
    readonly STRICT: {
        readonly ALLOWED_TAGS: readonly ["b", "i", "em", "strong", "u", "br", "p"];
        readonly ALLOWED_ATTR: readonly [];
        readonly KEEP_CONTENT: true;
        readonly SANITIZE_DOM: true;
        readonly FORBID_TAGS: readonly ["script", "object", "embed", "link", "style", "iframe", "frame", "frameset"];
        readonly FORBID_ATTR: readonly ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit"];
    };
    readonly MODERATE: {
        readonly ALLOWED_TAGS: readonly ["b", "i", "em", "strong", "u", "br", "p", "span", "div", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li"];
        readonly ALLOWED_ATTR: readonly ["class", "id", "title"];
        readonly KEEP_CONTENT: true;
        readonly SANITIZE_DOM: true;
        readonly FORBID_TAGS: readonly ["script", "object", "embed", "link", "style", "iframe", "frame", "frameset"];
        readonly FORBID_ATTR: readonly ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit"];
    };
    readonly RICH_CONTENT: {
        readonly ALLOWED_TAGS: readonly ["b", "i", "em", "strong", "u", "br", "p", "span", "div", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a", "img", "blockquote", "pre", "code"];
        readonly ALLOWED_ATTR: readonly ["class", "id", "title", "href", "src", "alt", "target"];
        readonly ALLOWED_URI_REGEXP: RegExp;
        readonly KEEP_CONTENT: true;
        readonly SANITIZE_DOM: true;
        readonly FORBID_TAGS: readonly ["script", "object", "embed", "link", "style", "iframe", "frame", "frameset"];
        readonly FORBID_ATTR: readonly ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit"];
    };
};
export declare function detectAdvancedXSS(input: string): {
    hasXSS: boolean;
    threats: string[];
    riskScore: number;
    severity: "low" | "medium" | "high" | "critical";
    confidence: number;
    detectionContext: string[];
};
export declare function sanitizeContentByContext(input: string, context: "task_description" | "message_content" | "search_query" | "file_name" | "config_data" | "user_input", options?: Partial<SanitizationOptions>): {
    sanitized: string;
    removed: string[];
    riskScore: number;
};
export declare function scanFileContent(content: string | Buffer, fileName?: string, mimeType?: string): {
    isSafe: boolean;
    threats: string[];
    riskScore: number;
    metadata: {
        fileSize: number;
        contentType?: string;
        encoding?: string;
    };
};
export declare function generateCSPHeader(context: "api" | "ui" | "admin"): string;
declare const _default: {
    hashPassword: typeof hashPassword;
    verifyPassword: typeof verifyPassword;
    validatePassword: typeof validatePassword;
    generateSecurePassword: typeof generateSecurePassword;
    DEFAULT_PASSWORD_POLICY: PasswordPolicy;
    generateAccessToken: typeof generateAccessToken;
    generateRefreshToken: typeof generateRefreshToken;
    verifyToken: typeof verifyToken;
    sanitizeInput: typeof sanitizeInput;
    sanitizeObject: typeof sanitizeObject;
    detectXSS: typeof detectXSS;
    detectSQLInjection: typeof detectSQLInjection;
    detectSQLInjectionLegacy: typeof detectSQLInjectionLegacy;
    detectCommandInjection: typeof detectCommandInjection;
    DEFAULT_SANITIZATION_OPTIONS: SanitizationOptions;
    detectAdvancedXSS: typeof detectAdvancedXSS;
    sanitizeContentByContext: typeof sanitizeContentByContext;
    scanFileContent: typeof scanFileContent;
    generateCSPHeader: typeof generateCSPHeader;
    ENHANCED_DOMPURIFY_CONFIGS: {
        readonly ULTRA_STRICT: {
            readonly ALLOWED_TAGS: readonly [];
            readonly ALLOWED_ATTR: readonly [];
            readonly KEEP_CONTENT: true;
            readonly SANITIZE_DOM: true;
            readonly FORBID_TAGS: readonly ["script", "object", "embed", "link", "style", "iframe", "frame", "frameset"];
            readonly FORBID_ATTR: readonly ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit"];
        };
        readonly STRICT: {
            readonly ALLOWED_TAGS: readonly ["b", "i", "em", "strong", "u", "br", "p"];
            readonly ALLOWED_ATTR: readonly [];
            readonly KEEP_CONTENT: true;
            readonly SANITIZE_DOM: true;
            readonly FORBID_TAGS: readonly ["script", "object", "embed", "link", "style", "iframe", "frame", "frameset"];
            readonly FORBID_ATTR: readonly ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit"];
        };
        readonly MODERATE: {
            readonly ALLOWED_TAGS: readonly ["b", "i", "em", "strong", "u", "br", "p", "span", "div", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li"];
            readonly ALLOWED_ATTR: readonly ["class", "id", "title"];
            readonly KEEP_CONTENT: true;
            readonly SANITIZE_DOM: true;
            readonly FORBID_TAGS: readonly ["script", "object", "embed", "link", "style", "iframe", "frame", "frameset"];
            readonly FORBID_ATTR: readonly ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit"];
        };
        readonly RICH_CONTENT: {
            readonly ALLOWED_TAGS: readonly ["b", "i", "em", "strong", "u", "br", "p", "span", "div", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a", "img", "blockquote", "pre", "code"];
            readonly ALLOWED_ATTR: readonly ["class", "id", "title", "href", "src", "alt", "target"];
            readonly ALLOWED_URI_REGEXP: RegExp;
            readonly KEEP_CONTENT: true;
            readonly SANITIZE_DOM: true;
            readonly FORBID_TAGS: readonly ["script", "object", "embed", "link", "style", "iframe", "frame", "frameset"];
            readonly FORBID_ATTR: readonly ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit"];
        };
    };
    hasPermission: typeof hasPermission;
    hasRole: typeof hasRole;
    ROLE_PERMISSIONS: Record<UserRole, Permission[]>;
    generateEventId: typeof generateEventId;
    calculateRiskScore: typeof calculateRiskScore;
    createSecurityEvent: typeof createSecurityEvent;
    DEFAULT_RATE_LIMITS: Record<RateLimitPreset, RateLimitConfig>;
    generateRateLimitKey: typeof generateRateLimitKey;
    getRateLimitConfig: typeof getRateLimitConfig;
    getAllRateLimitConfigs: typeof getAllRateLimitConfigs;
    generateRandomString: typeof generateRandomString;
    generateHMAC: typeof generateHMAC;
    verifyHMAC: typeof verifyHMAC;
    hashData: typeof hashData;
    detectMaliciousFileContent: typeof detectMaliciousFileContent;
    validateFilePath: typeof validateFilePath;
    validateCoordinates: typeof validateCoordinates;
    detectPathTraversal: typeof detectPathTraversal;
    detectCommandInjectionAdvanced: typeof detectCommandInjectionAdvanced;
    detectTemplateInjection: typeof detectTemplateInjection;
    detectLDAPInjection: typeof detectLDAPInjection;
    detectXMLInjection: typeof detectXMLInjection;
    detectNoSQLInjection: typeof detectNoSQLInjection;
    detectComprehensiveMaliciousPatterns: typeof detectComprehensiveMaliciousPatterns;
};
export default _default;
export declare function detectPathTraversal(input: string): {
    isDetected: boolean;
    threats: Array<{
        type: string;
        pattern: string;
        severity: number;
        confidence: number;
    }>;
    riskScore: number;
};
export declare function detectCommandInjectionAdvanced(input: string): {
    isDetected: boolean;
    threats: Array<{
        type: string;
        pattern: string;
        severity: number;
        confidence: number;
        platform?: string;
    }>;
    riskScore: number;
};
export declare function detectTemplateInjection(input: string): {
    isDetected: boolean;
    threats: Array<{
        type: string;
        engine: string;
        pattern: string;
        severity: number;
        confidence: number;
    }>;
    riskScore: number;
};
export declare function detectLDAPInjection(input: string): {
    isDetected: boolean;
    threats: Array<{
        type: string;
        pattern: string;
        severity: number;
        confidence: number;
    }>;
    riskScore: number;
};
export declare function detectXMLInjection(input: string): {
    isDetected: boolean;
    threats: Array<{
        type: string;
        pattern: string;
        severity: number;
        confidence: number;
    }>;
    riskScore: number;
};
export declare function detectNoSQLInjection(input: string): {
    isDetected: boolean;
    threats: Array<{
        type: string;
        pattern: string;
        severity: number;
        confidence: number;
        database: string;
    }>;
    riskScore: number;
};
export declare function detectComprehensiveMaliciousPatterns(input: string): {
    isDetected: boolean;
    totalRiskScore: number;
    threatCategories: {
        xss: ReturnType<typeof detectAdvancedXSS>;
        sqlInjection: ReturnType<typeof detectSQLInjection>;
        pathTraversal: ReturnType<typeof detectPathTraversal>;
        commandInjection: ReturnType<typeof detectCommandInjectionAdvanced>;
        templateInjection: ReturnType<typeof detectTemplateInjection>;
        ldapInjection: ReturnType<typeof detectLDAPInjection>;
        xmlInjection: ReturnType<typeof detectXMLInjection>;
        nosqlInjection: ReturnType<typeof detectNoSQLInjection>;
    };
    recommendations: string[];
};
export type { SanitizationOptions, SecurityEvent, } from "../types/security.types";
export { SecurityEventType, RateLimitServiceType, } from "../types/security.types";
//# sourceMappingURL=security.utils.d.ts.map