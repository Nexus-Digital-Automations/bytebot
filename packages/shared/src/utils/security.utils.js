"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitServiceType = exports.SecurityEventType = exports.detectComprehensiveMaliciousPatterns = exports.detectNoSQLInjection = exports.detectXMLInjection = exports.detectLDAPInjection = exports.detectTemplateInjection = exports.detectCommandInjectionAdvanced = exports.detectPathTraversal = exports.generateCSPHeader = exports.scanFileContent = exports.sanitizeContentByContext = exports.detectAdvancedXSS = exports.ENHANCED_DOMPURIFY_CONFIGS = exports.validateCoordinates = exports.validateFilePath = exports.detectMaliciousFileContent = exports.hashData = exports.verifyHMAC = exports.generateHMAC = exports.generateRandomString = exports.generateRateLimitKey = exports.getAllRateLimitConfigs = exports.getRateLimitConfig = exports.DEFAULT_RATE_LIMITS = exports.createSecurityEvent = exports.calculateRiskScore = exports.generateEventId = exports.hasRole = exports.hasPermission = exports.ROLE_PERMISSIONS = exports.detectCommandInjection = exports.detectSQLInjectionLegacy = exports.detectSQLInjection = exports.detectXSS = exports.sanitizeObject = exports.sanitizeInput = exports.DEFAULT_SANITIZATION_OPTIONS = exports.verifyToken = exports.generateRefreshToken = exports.generateAccessToken = exports.generateSecurePassword = exports.validatePassword = exports.verifyPassword = exports.hashPassword = exports.DEFAULT_PASSWORD_POLICY = exports.ADVANCED_SQL_INJECTION_PATTERNS = exports.ADVANCED_XSS_PATTERNS = void 0;
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const DOMPurify = __importStar(require("dompurify"));
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const jsdom_1 = require("jsdom");
const security_types_1 = require("../types/security.types");
let purify = null;
function getPurify() {
    if (!purify) {
        try {
            const jsdomWindow = new jsdom_1.JSDOM("").window;
            const window = {
                NodeFilter: jsdomWindow.NodeFilter,
                Node: jsdomWindow.Node,
                Element: jsdomWindow.Element,
                HTMLTemplateElement: jsdomWindow.HTMLTemplateElement,
                DocumentFragment: jsdomWindow.DocumentFragment,
                HTMLFormElement: jsdomWindow.HTMLFormElement,
                DOMParser: jsdomWindow.DOMParser,
                NamedNodeMap: jsdomWindow.NamedNodeMap,
                document: jsdomWindow.document,
            };
            const purifyConstructor = DOMPurify.default || DOMPurify;
            purify = purifyConstructor(window);
        }
        catch (err) {
            throw new Error(`Failed to initialize DOMPurify: ${err.message}`);
        }
    }
    return purify;
}
exports.ADVANCED_XSS_PATTERNS = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
    /data:text\/html/gi,
    /data:application\/octet-stream/gi,
    /<iframe[^>]*src=[^>]*>/gi,
    /<embed[^>]*src=[^>]*>/gi,
    /<object[^>]*data=[^>]*>/gi,
    /<svg[^>]*onload=[^>]*>/gi,
    /<svg[^>]*>[\s\S]*?<script[\s\S]*?<\/svg>/gi,
    /\{\{.*?\}\}/g,
    /%7B%7B.*?%7D%7D/gi,
    /<%.*?%>/g,
    /\${.*?}/g,
    /#\{.*?\}/g,
    /name\s*=\s*['"]__proto__['"]|id\s*=\s*['"]__proto__['"]/gi,
    /name\s*=\s*['"]constructor['"]|id\s*=\s*['"]constructor['"]/gi,
];
exports.ADVANCED_SQL_INJECTION_PATTERNS = [
    /(union|select|insert|update|delete|drop|create|alter|execute|exec)\s+/gi,
    /('{1}|"{1}).*?(or|and)\s+[\w\s]*?=[\w\s]*?\1/gi,
    /('{1}|"{1})[^'"]*(or|and)[^'"]*('{1}|"{1})/gi,
    /\s+(or|and)\s+\d+\s*=\s*\d+/gi,
    /\s+(or|and)\s+['"][\w\s]*?['"](\s*=\s*['"][\w\s]*?['"])?/gi,
    /waitfor\s+delay\s+['"][\d:]+['"]/gi,
    /sleep\s*\(\s*\d+\s*\)/gi,
    /pg_sleep\s*\(\s*\d+\s*\)/gi,
    /benchmark\s*\(\s*\d+\s*,/gi,
    /union\s+(all\s+)?select\s+/gi,
    /\d+\s+union\s+(all\s+)?select/gi,
    /;\s*(select|insert|update|delete|drop|create|alter)/gi,
    /\(\s*select\s+[\w\s,*]+\s+from\s+[\w]+/gi,
    /(--|#|\/\*|\*\/)/g,
    /(ascii|char|concat|substring|mid|length|count|group_concat)/gi,
    /(load_file|into\s+outfile|dumpfile)/gi,
    /(xp_cmdshell|sp_configure|openrowset)/gi,
];
const COMMAND_INJECTION_PATTERNS = [
    /[;&|`$(){}]/g,
    /(cat|ls|pwd|whoami|id|uname|ps|netstat|wget|curl|nc|telnet|ssh|ftp)/gi,
    /(Get-Process|Start-Process|Invoke-Expression|New-Object|Download)/gi,
    /\$\([^)]*\)/g,
    /`[^`]*`/g,
    /\$\{[^}]*\}/g,
    /[<>]/g,
];
const PATH_TRAVERSAL_PATTERNS = [
    /\.\.\//g,
    /\.\.\\\\]/g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
    /%252e%252e%252f/gi,
    /%c0%ae%c0%ae%c0%af/gi,
    /\.\.%2f/gi,
    /\.\.%5c/gi,
    /%25%2e%25%2e%25%2f/gi,
    /\u002e\u002e\u002f/gi,
    /\uff0e\uff0e\uff0f/gi,
];
const TEMPLATE_INJECTION_PATTERNS = [
    /\{\{.*?(config|request|session|g|lipsum|cycler|joiner|namespace).*?\}\}/gi,
    /\{%.*?(for|if|set|import|include|extends).*?%\}/gi,
    /<#.*?>/g,
    /\${.*?}/g,
    /\{.*?\}/g,
    /#set\s*\(/gi,
    /#if\s*\(/gi,
    /\{%\s*(load|extends|block|for|if)\s*.*?%\}/gi,
];
const LDAP_INJECTION_PATTERNS = [
    /[()&|!*]/g,
    /(\*|\(|\)|&|\||!|=|~=|>|<)/g,
    /\*/g,
];
const XML_INJECTION_PATTERNS = [
    /<!DOCTYPE[^>]*>/gi,
    /<!ENTITY[^>]*>/gi,
    /<!\[CDATA\[.*?\]\]>/gi,
    /<\?xml[^>]*\?>/gi,
    /&[a-zA-Z][a-zA-Z0-9]*;/g,
];
const NOSQL_INJECTION_PATTERNS = [
    /\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$exists|\$regex/gi,
    /function\s*\(/gi,
    /this\./gi,
    /\{.*?"?\$.*?"?:/gi,
];
exports.DEFAULT_PASSWORD_POLICY = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    saltRounds: 12,
};
async function hashPassword(password, saltRounds = 12) {
    try {
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(password, salt);
        return hashedPassword;
    }
    catch (err) {
        throw new Error(`Password hashing failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
exports.hashPassword = hashPassword;
async function verifyPassword(password, hashedPassword) {
    try {
        return await bcrypt.compare(password, hashedPassword);
    }
    catch (err) {
        throw new Error(`Password verification failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
exports.verifyPassword = verifyPassword;
function validatePassword(password, policy = exports.DEFAULT_PASSWORD_POLICY) {
    const errors = [];
    const timestamp = new Date();
    if (password.length < policy.minLength) {
        errors.push({
            field: "password",
            constraint: "minLength",
            message: `Password must be at least ${policy.minLength} characters long`,
            rejectedValue: password.length,
        });
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push({
            field: "password",
            constraint: "requireUppercase",
            message: "Password must contain at least one uppercase letter",
            rejectedValue: password,
        });
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
        errors.push({
            field: "password",
            constraint: "requireLowercase",
            message: "Password must contain at least one lowercase letter",
            rejectedValue: password,
        });
    }
    if (policy.requireNumbers && !/\d/.test(password)) {
        errors.push({
            field: "password",
            constraint: "requireNumbers",
            message: "Password must contain at least one number",
            rejectedValue: password,
        });
    }
    if (policy.requireSpecialChars &&
        !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
        errors.push({
            field: "password",
            constraint: "requireSpecialChars",
            message: "Password must contain at least one special character",
            rejectedValue: password,
        });
    }
    const result = {
        isValid: errors.length === 0,
        errors,
        timestamp,
    };
    if (errors.length === 0) {
        result.sanitizedData = { password };
    }
    return result;
}
exports.validatePassword = validatePassword;
function generateSecurePassword(length = 16, includeSymbols = true) {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    let charset = lowercase + uppercase + numbers;
    if (includeSymbols) {
        charset += symbols;
    }
    let password = "";
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    if (includeSymbols) {
        password += symbols[Math.floor(Math.random() * symbols.length)];
    }
    for (let i = password.length; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
    }
    return password
        .split("")
        .sort(() => Math.random() - 0.5)
        .join("");
}
exports.generateSecurePassword = generateSecurePassword;
function generateAccessToken(payload, secret, expiresIn = "15m") {
    const now = Math.floor(Date.now() / 1000);
    const expSeconds = parseExpirationToSeconds(expiresIn);
    const fullPayload = {
        ...payload,
        iat: now,
        exp: now + expSeconds,
    };
    return jwt.sign(fullPayload, secret, {
        algorithm: "HS256",
    });
}
exports.generateAccessToken = generateAccessToken;
function generateRefreshToken(userId, sessionId, secret) {
    const payload = {
        sub: userId,
        sessionId,
        type: "refresh",
        iat: Math.floor(Date.now() / 1000),
    };
    return jwt.sign(payload, secret, {
        algorithm: "HS256",
    });
}
exports.generateRefreshToken = generateRefreshToken;
function verifyToken(token, secret) {
    try {
        return jwt.verify(token, secret);
    }
    catch (err) {
        const errorObj = err;
        if (errorObj.name === "TokenExpiredError") {
            throw new Error("Token has expired");
        }
        else if (errorObj.name === "JsonWebTokenError") {
            throw new Error("Invalid token");
        }
        else {
            throw new Error("Token verification failed");
        }
    }
}
exports.verifyToken = verifyToken;
function parseExpirationToSeconds(expiration) {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
        throw new Error("Invalid expiration format");
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
        case "s":
            return value;
        case "m":
            return value * 60;
        case "h":
            return value * 60 * 60;
        case "d":
            return value * 60 * 60 * 24;
        default:
            throw new Error("Invalid expiration unit");
    }
}
exports.DEFAULT_SANITIZATION_OPTIONS = {
    allowHtml: false,
    stripHtml: true,
    allowedTags: ["b", "i", "em", "strong", "p", "br"],
    allowedAttributes: {
        a: ["href"],
        img: ["src", "alt"],
    },
    maxLength: 10000,
    trim: true,
    normalizeWhitespace: true,
    removeControlChars: true,
    escapeSpecialChars: true,
};
function sanitizeInput(input, options = exports.DEFAULT_SANITIZATION_OPTIONS) {
    if (typeof input !== "string") {
        return "";
    }
    let sanitized = input;
    if (options.trim) {
        sanitized = sanitized.trim();
    }
    if (options.maxLength && sanitized.length > options.maxLength) {
        sanitized = sanitized.substring(0, options.maxLength);
    }
    if (options.stripHtml) {
        sanitized = sanitized.replace(/<[^>]*>/g, "");
    }
    else if (options.allowHtml) {
        try {
            sanitized = (0, sanitize_html_1.default)(sanitized, {
                allowedTags: options.allowedTags || [],
                allowedAttributes: options.allowedAttributes || {},
                allowedSchemes: ["http", "https", "mailto"],
            });
        }
        catch {
            sanitized = sanitized.replace(/<[^>]*>/g, "");
        }
    }
    sanitized = sanitized
        .replace(/javascript:/gi, "")
        .replace(/vbscript:/gi, "")
        .replace(/on\w+\s*=/gi, "")
        .replace(/expression\s*\(/gi, "");
    sanitized = sanitized
        .replace(/\{\{.*?\}\}/g, "")
        .replace(/\$\{.*?\}/g, "")
        .replace(/<!--\s*#(include|exec|echo).*?-->/gi, "")
        .replace(/<\?xml[\s\S]*?\?>/gi, "")
        .replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, "")
        .replace(/data:(?!image\/(png|jpg|jpeg|gif|svg\+xml);base64,)[^;]*;base64,[a-zA-Z0-9+/=]*/gi, "")
        .replace(/[()\\]/g, "")
        .replace(/[;&|`${}]/g, "")
        .replace(/\.{2,}[/\\\\]/g, "")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    return sanitized;
}
exports.sanitizeInput = sanitizeInput;
function sanitizeObject(obj, options = exports.DEFAULT_SANITIZATION_OPTIONS) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj === "string") {
        return sanitizeInput(obj, options);
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeObject(item, options));
    }
    if (typeof obj === "object") {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            const sanitizedKey = sanitizeInput(key, options);
            sanitized[sanitizedKey] = sanitizeObject(value, options);
        }
        return sanitized;
    }
    return obj;
}
exports.sanitizeObject = sanitizeObject;
function detectXSS(input) {
    if (typeof input !== "string") {
        return false;
    }
    const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /data:text\/html/gi,
        /data:image\/svg\+xml/gi,
        /on\w+\s*=/gi,
        /on\w+\s*\(/gi,
        /<object[^>]*>.*?<\/object>/gi,
        /<embed[^>]*>.*?<\/embed>/gi,
        /<applet[^>]*>.*?<\/applet>/gi,
        /expression\s*\(/gi,
        /-moz-binding/gi,
        /behavior\s*:/gi,
        /<link[^>]*stylesheet.*?>/gi,
        /<style[^>]*>.*?<\/style>/gi,
        /&#x[0-9a-f]+;/gi,
        /&#[0-9]+;/gi,
        /\\u[0-9a-f]{4}/gi,
        /\\x[0-9a-f]{2}/gi,
        /document\.|window\.|eval\(|setTimeout\(|setInterval\(/gi,
        /data:.*base64.*script/gi,
        /<svg[^>]*>.*?<\/svg>/gi,
        /<use[^>]*xlink:href/gi,
        /\{\{.*\}\}/gi,
        /\$\{.*\}/gi,
        /<!--\s*#(include|exec|echo)/gi,
    ];
    return xssPatterns.some((pattern) => pattern.test(input));
}
exports.detectXSS = detectXSS;
function detectSQLInjection(input) {
    console.log(`[SQL-INJECTION-ENGINE] Starting advanced SQL injection detection for input: ${input.substring(0, 100)}${input.length > 100 ? "..." : ""}`);
    if (typeof input !== "string") {
        console.log("[SQL-INJECTION-ENGINE] Input validation: Non-string input rejected");
        return {
            hasInjection: false,
            threats: [],
            riskScore: 0,
            severity: "low",
            confidence: 100,
            detectionContext: [],
        };
    }
    const threats = [];
    const detectionContext = [];
    let riskScore = 0;
    let totalConfidence = 0;
    let detectionCount = 0;
    let detectedDatabaseType;
    input.normalize("NFKC").toLowerCase();
    const originalInput = input;
    const startTime = performance.now();
    const advancedSQLPatterns = [
        {
            pattern: /(\bor\b|\bOR\b)\s+(\d+\s*=\s*\d+|'[^']*'\s*=\s*'[^']*'|"[^"]*"\s*=\s*"[^"]*")/gi,
            threat: "Boolean-Based Blind Injection",
            score: 9,
            confidence: 95,
            context: "boolean-blind",
            dbType: "generic",
        },
        {
            pattern: /(\band\b|\bAND\b)\s+(\d+\s*=\s*\d+|'[^']*'\s*=\s*'[^']*'|"[^"]*"\s*=\s*"[^"]*")/gi,
            threat: "Boolean-Based Blind AND Injection",
            score: 9,
            confidence: 95,
            context: "boolean-blind",
            dbType: "generic",
        },
        {
            pattern: /('\s*or\s*'1'\s*=\s*'1'|"\s*or\s*"1"\s*=\s*"1"|'\s*or\s*1=1|"\s*or\s*1=1)/gi,
            threat: "Classic OR 1=1 Injection",
            score: 10,
            confidence: 98,
            context: "classic-injection",
            dbType: "generic",
        },
        {
            pattern: /(\bunion\b|\bUNION\b)[\s/*]*(?:all\s*)?[\s/*]*(\bselect\b|\bSELECT\b)/gi,
            threat: "UNION-Based Injection",
            score: 9,
            confidence: 90,
            context: "union-based",
            dbType: "generic",
        },
        {
            pattern: /union\s+select\s+null/gi,
            threat: "UNION SELECT NULL Injection",
            score: 10,
            confidence: 95,
            context: "union-based",
            dbType: "generic",
        },
        {
            pattern: /(\bselect\b|\bSELECT\b)\s+.*(\bfrom\b|\bFROM\b)/gi,
            threat: "SELECT Statement Injection",
            score: 8,
            confidence: 85,
            context: "sql-keywords",
            dbType: "generic",
        },
        {
            pattern: /(\binsert\b|\bINSERT\b)\s+.*(\binto\b|\bINTO\b)/gi,
            threat: "INSERT Statement Injection",
            score: 9,
            confidence: 90,
            context: "sql-keywords",
            dbType: "generic",
        },
        {
            pattern: /(\bupdate\b|\bUPDATE\b)\s+.*(\bset\b|\bSET\b)/gi,
            threat: "UPDATE Statement Injection",
            score: 9,
            confidence: 90,
            context: "sql-keywords",
            dbType: "generic",
        },
        {
            pattern: /(\bdelete\b|\bDELETE\b)\s+.*(\bfrom\b|\bFROM\b)/gi,
            threat: "DELETE Statement Injection",
            score: 10,
            confidence: 95,
            context: "sql-keywords",
            dbType: "generic",
        },
        {
            pattern: /(\bdrop\b|\bDROP\b)\s+(\btable\b|\bTABLE\b|\bdatabase\b|\bDATABASE\b)/gi,
            threat: "DROP Statement Injection",
            score: 10,
            confidence: 98,
            context: "destructive-sql",
            dbType: "generic",
        },
        {
            pattern: /(\btruncate\b|\bTRUNCATE\b)\s+(\btable\b|\bTABLE\b)/gi,
            threat: "TRUNCATE Statement Injection",
            score: 10,
            confidence: 95,
            context: "destructive-sql",
            dbType: "generic",
        },
        {
            pattern: /(\balter\b|\bALTER\b)\s+(\btable\b|\bTABLE\b)/gi,
            threat: "ALTER Statement Injection",
            score: 9,
            confidence: 90,
            context: "sql-keywords",
            dbType: "generic",
        },
        {
            pattern: /(\bcreate\b|\bCREATE\b)\s+(\btable\b|\bTABLE\b|\bdatabase\b|\bDATABASE\b)/gi,
            threat: "CREATE Statement Injection",
            score: 8,
            confidence: 85,
            context: "sql-keywords",
            dbType: "generic",
        },
        {
            pattern: /(\bexec\b|\bEXEC\b|\bexecute\b|\bEXECUTE\b)\s+(\bsp_|\bxp_)/gi,
            threat: "Stored Procedure Execution",
            score: 10,
            confidence: 95,
            context: "stored-procedure",
            dbType: "mssql",
        },
        {
            pattern: /(xp_cmdshell|sp_configure|openrowset|opendatasource|sp_makewebtask)/gi,
            threat: "Dangerous SQL Server Procedures",
            score: 10,
            confidence: 98,
            context: "stored-procedure",
            dbType: "mssql",
        },
        {
            pattern: /--[+\s][\s\S]*/gi,
            threat: "SQL Comment Injection",
            score: 7,
            confidence: 80,
            context: "comment-based",
            dbType: "generic",
        },
        {
            pattern: /\/\*[\s\S]*?\*\//gi,
            threat: "Multi-line Comment Injection",
            score: 7,
            confidence: 85,
            context: "comment-based",
            dbType: "generic",
        },
        {
            pattern: /#.*$/gm,
            threat: "Hash Comment Injection",
            score: 6,
            confidence: 75,
            context: "comment-based",
            dbType: "mysql",
        },
        {
            pattern: /(0x[0-9a-f]+|\\x[0-9a-f]{2}|%[0-9a-f]{2})/gi,
            threat: "Hex/URL Encoded Injection",
            score: 8,
            confidence: 85,
            context: "encoding-bypass",
            dbType: "generic",
        },
        {
            pattern: /(&#x[0-9a-f]+;|&#[0-9]+;|\\u[0-9a-f]{4})/gi,
            threat: "Unicode/HTML Entity Encoding",
            score: 7,
            confidence: 80,
            context: "encoding-bypass",
            dbType: "generic",
        },
        {
            pattern: /(waitfor\s+delay\s+['"]?\d{2}:\d{2}:\d{2}['"]?|waitfor\s+time\s+['"]?\d{2}:\d{2}:\d{2}['"]?)/gi,
            threat: "SQL Server Time-Based Blind Injection",
            score: 10,
            confidence: 98,
            context: "time-based-blind",
            dbType: "mssql",
        },
        {
            pattern: /(sleep\s*\(\s*\d+\s*\)|pg_sleep\s*\(\s*\d+\s*\))/gi,
            threat: "MySQL/PostgreSQL Sleep Function",
            score: 10,
            confidence: 95,
            context: "time-based-blind",
            dbType: "mysql-postgres",
        },
        {
            pattern: /(benchmark\s*\(\s*\d+\s*,\s*[^)]+\))/gi,
            threat: "MySQL Benchmark Time Delay",
            score: 10,
            confidence: 95,
            context: "time-based-blind",
            dbType: "mysql",
        },
        {
            pattern: /(dbms_pipe\.receive_message\s*\([^)]+\)|dbms_lock\.sleep\s*\(\s*\d+\s*\))/gi,
            threat: "Oracle Time-Based Injection",
            score: 10,
            confidence: 95,
            context: "time-based-blind",
            dbType: "oracle",
        },
        {
            pattern: /(randomblob\s*\(\s*\d+\s*\)|like\s+['"][^'"]*%[^'"]*['"])/gi,
            threat: "SQLite Time-Based Injection",
            score: 9,
            confidence: 85,
            context: "time-based-blind",
            dbType: "sqlite",
        },
        {
            pattern: /(extractvalue\s*\([^)]+\)|updatexml\s*\([^)]+\))/gi,
            threat: "MySQL XML Error-Based Injection",
            score: 10,
            confidence: 95,
            context: "error-based",
            dbType: "mysql",
        },
        {
            pattern: /(convert\s*\(\s*int\s*,\s*[^)]+\)|cast\s*\([^)]+\s+as\s+int\s*\))/gi,
            threat: "SQL Server Error-Based Injection",
            score: 10,
            confidence: 90,
            context: "error-based",
            dbType: "mssql",
        },
        {
            pattern: /(ctxsys\.drithsx\.sn\s*\([^)]+\)|XMLType\s*\([^)]+\))/gi,
            threat: "Oracle Error-Based Injection",
            score: 10,
            confidence: 95,
            context: "error-based",
            dbType: "oracle",
        },
        {
            pattern: /((\d+::int|\d+::text)\s*[+\-*/]\s*['"][^'"]*['"])/gi,
            threat: "PostgreSQL Error-Based Injection",
            score: 9,
            confidence: 85,
            context: "error-based",
            dbType: "postgresql",
        },
        {
            pattern: /(\$where\s*:|\$ne\s*:|\$gt\s*:|\$lt\s*:|\$regex\s*:)/gi,
            threat: "MongoDB NoSQL Injection",
            score: 10,
            confidence: 95,
            context: "nosql-injection",
            dbType: "mongodb",
        },
        {
            pattern: /(\$or\s*:\s*\[|\$and\s*:\s*\[|\$in\s*:\s*\[)/gi,
            threat: "MongoDB Logical Operator Injection",
            score: 9,
            confidence: 90,
            context: "nosql-injection",
            dbType: "mongodb",
        },
        {
            pattern: /(this\s*\.\s*\w+|function\s*\(\s*\))/gi,
            threat: "MongoDB JavaScript Injection",
            score: 10,
            confidence: 85,
            context: "nosql-injection",
            dbType: "mongodb",
        },
        {
            pattern: /(cql\s*=|select\s+.+from\s+.+where)/gi,
            threat: "Cassandra CQL Injection",
            score: 9,
            confidence: 80,
            context: "nosql-injection",
            dbType: "cassandra",
        },
        {
            pattern: /(redis\.|get\s+.+|set\s+.+|eval\s+['"][^'"]*['"])/gi,
            threat: "Redis Command Injection",
            score: 9,
            confidence: 80,
            context: "nosql-injection",
            dbType: "redis",
        },
        {
            pattern: /({[^}]*['"][^'"]*['"]\s*:\s*{\s*['"]\$[^'"]*['"])/gi,
            threat: "JSON NoSQL Injection",
            score: 9,
            confidence: 85,
            context: "json-injection",
            dbType: "document",
        },
        {
            pattern: /(<\?xml[^>]*>|<\.DOCTYPE[^>]*>)/gi,
            threat: "XML External Entity (XXE) Attack",
            score: 10,
            confidence: 95,
            context: "xml-injection",
            dbType: "generic",
        },
        {
            pattern: /(xpath\s*\([^)]*['"][^'"]*['"][^)]*\))/gi,
            threat: "XPath Injection",
            score: 9,
            confidence: 90,
            context: "xml-injection",
            dbType: "generic",
        },
        {
            pattern: /(json_extract\s*\([^)]*\)|json_unquote\s*\([^)]*\))/gi,
            threat: "JSON Function Injection",
            score: 8,
            confidence: 80,
            context: "json-injection",
            dbType: "mysql",
        },
        {
            pattern: /(mutation\s*{|query\s*{|subscription\s*{)/gi,
            threat: "GraphQL Query Injection",
            score: 8,
            confidence: 85,
            context: "graphql-injection",
            dbType: "graphql",
        },
        {
            pattern: /(__schema|__type|__typename|__inputfields)/gi,
            threat: "GraphQL Introspection Attack",
            score: 9,
            confidence: 90,
            context: "graphql-injection",
            dbType: "graphql",
        },
        {
            pattern: /(fragment\s+\w+\s+on\s+\w+)/gi,
            threat: "GraphQL Fragment Injection",
            score: 7,
            confidence: 75,
            context: "graphql-injection",
            dbType: "graphql",
        },
        {
            pattern: /(\bfrom\s*\(\s*['"][^'"]+['"]\s*\)|raw\s*\(['"][^'"]+['"]\))/gi,
            threat: "ORM Raw Query Injection",
            score: 10,
            confidence: 90,
            context: "orm-injection",
            dbType: "generic",
        },
        {
            pattern: /(whereRaw\s*\(['"][^'"]+['"]\)|havingRaw\s*\(['"][^'"]+['"]\))/gi,
            threat: "Knex.js Raw Injection",
            score: 9,
            confidence: 85,
            context: "orm-injection",
            dbType: "knex",
        },
        {
            pattern: /(\$raw\s*\(['"][^'"]+['"]\)|DB::raw\s*\(['"][^'"]+['"]\))/gi,
            threat: "Laravel Eloquent Raw Injection",
            score: 9,
            confidence: 85,
            context: "orm-injection",
            dbType: "laravel",
        },
        {
            pattern: /(createQuery\s*\(['"][^'"]+['"]\)|createNativeQuery\s*\(['"][^'"]+['"]\))/gi,
            threat: "JPA/Hibernate Native Query Injection",
            score: 9,
            confidence: 85,
            context: "orm-injection",
            dbType: "jpa",
        },
        {
            pattern: /(from_statement\s*\(['"][^'"]+['"]\)|text\s*\(['"][^'"]+['"]\))/gi,
            threat: "SQLAlchemy Raw Query Injection",
            score: 9,
            confidence: 85,
            context: "orm-injection",
            dbType: "sqlalchemy",
        },
        {
            pattern: /(load_file\s*\(['"][^'"]+['"]\)|into\s+outfile\s+['"][^'"]+['"]|into\s+dumpfile\s+['"][^'"]+['"])/gi,
            threat: "MySQL File System Access",
            score: 10,
            confidence: 95,
            context: "file-access",
            dbType: "mysql",
        },
        {
            pattern: /(copy\s+.+from\s+['"][^'"]+['"]|copy\s+.+to\s+['"][^'"]+['"])/gi,
            threat: "PostgreSQL File System Access",
            score: 10,
            confidence: 90,
            context: "file-access",
            dbType: "postgresql",
        },
        {
            pattern: /(utl_file\.|utl_http\.|dbms_java\.)/gi,
            threat: "Oracle System Package Abuse",
            score: 10,
            confidence: 95,
            context: "system-access",
            dbType: "oracle",
        },
        {
            pattern: /(information_schema\.|sys\.|msdb\.|master\.|tempdb\.)/gi,
            threat: "System Database Access",
            score: 9,
            confidence: 90,
            context: "info-disclosure",
            dbType: "generic",
        },
        {
            pattern: /(@@version|version\(\)|@@servername|@@hostname)/gi,
            threat: "Database Version Disclosure",
            score: 7,
            confidence: 85,
            context: "info-disclosure",
            dbType: "generic",
        },
        {
            pattern: /(user\(\)|current_user|session_user|system_user)/gi,
            threat: "User Information Disclosure",
            score: 6,
            confidence: 80,
            context: "info-disclosure",
            dbType: "generic",
        },
        {
            pattern: /(substring\s*\([^)]+\)|substr\s*\([^)]+\)|mid\s*\([^)]+\))/gi,
            threat: "String Extraction Functions",
            score: 8,
            confidence: 85,
            context: "blind-injection",
            dbType: "generic",
        },
        {
            pattern: /(ascii\s*\([^)]+\)|ord\s*\([^)]+\)|char\s*\([^)]+\))/gi,
            threat: "Character Manipulation Functions",
            score: 8,
            confidence: 85,
            context: "blind-injection",
            dbType: "generic",
        },
        {
            pattern: /(hex\s*\([^)]+\)|unhex\s*\([^)]+\)|bin\s*\([^)]+\))/gi,
            threat: "Encoding/Decoding Functions",
            score: 7,
            confidence: 80,
            context: "blind-injection",
            dbType: "mysql",
        },
        {
            pattern: /;\s*(select|insert|update|delete|drop|create|alter|exec|call)/gi,
            threat: "Stacked Query Injection",
            score: 10,
            confidence: 95,
            context: "stacked-queries",
            dbType: "generic",
        },
        {
            pattern: /(;\s*declare\s+@\w+|;\s*set\s+@\w+)/gi,
            threat: "SQL Server Variable Declaration",
            score: 9,
            confidence: 90,
            context: "stacked-queries",
            dbType: "mssql",
        },
        {
            pattern: /(concat\s*\([^)]+\)|\|\||\+\s*['"][^'"]*['"])/gi,
            threat: "String Concatenation Injection",
            score: 7,
            confidence: 75,
            context: "string-manipulation",
            dbType: "generic",
        },
        {
            pattern: /(case\s+when[^e]*end|if\s*\([^)]+\s*,\s*[^)]+\s*,\s*[^)]+\))/gi,
            threat: "Conditional Logic Injection",
            score: 8,
            confidence: 80,
            context: "conditional-logic",
            dbType: "generic",
        },
    ];
    console.log("[SQL-INJECTION-ENGINE] Starting pattern matching pipeline");
    const highConfidencePatterns = advancedSQLPatterns.filter((p) => p.confidence >= 90);
    for (const { pattern, threat, score, confidence, context, dbType, } of highConfidencePatterns) {
        if (pattern.test(originalInput)) {
            console.log(`[SQL-INJECTION-ENGINE] High-confidence threat detected: ${threat} (confidence: ${confidence}%, context: ${context}, db: ${dbType})`);
            threats.push(threat);
            riskScore += score;
            totalConfidence += confidence;
            detectionCount++;
            detectionContext.push(context);
            if (!detectedDatabaseType || dbType !== "generic") {
                detectedDatabaseType = dbType;
            }
        }
    }
    if (threats.length === 0) {
        const mediumConfidencePatterns = advancedSQLPatterns.filter((p) => p.confidence >= 75 && p.confidence < 90);
        for (const { pattern, threat, score, confidence, context, dbType, } of mediumConfidencePatterns) {
            if (pattern.test(originalInput)) {
                console.log(`[SQL-INJECTION-ENGINE] Medium-confidence threat detected: ${threat} (confidence: ${confidence}%, context: ${context}, db: ${dbType})`);
                threats.push(threat);
                riskScore += score * 0.8;
                totalConfidence += confidence;
                detectionCount++;
                detectionContext.push(context);
                if (!detectedDatabaseType || dbType !== "generic") {
                    detectedDatabaseType = dbType;
                }
            }
        }
    }
    if (threats.length === 0 &&
        (input.includes("'") ||
            input.includes('"') ||
            /\b(select|insert|update|delete)\b/gi.test(input))) {
        const lowConfidencePatterns = advancedSQLPatterns.filter((p) => p.confidence < 75);
        for (const { pattern, threat, score, confidence, context, dbType, } of lowConfidencePatterns) {
            if (pattern.test(originalInput)) {
                console.log(`[SQL-INJECTION-ENGINE] Low-confidence threat detected: ${threat} (confidence: ${confidence}%, context: ${context}, db: ${dbType})`);
                threats.push(threat);
                riskScore += score * 0.5;
                totalConfidence += confidence;
                detectionCount++;
                detectionContext.push(context);
                if (!detectedDatabaseType || dbType !== "generic") {
                    detectedDatabaseType = dbType;
                }
            }
        }
    }
    const normalizedRiskScore = Math.min(10, Math.floor(riskScore / 10));
    const averageConfidence = detectionCount > 0 ? Math.round(totalConfidence / detectionCount) : 100;
    let severity;
    if (normalizedRiskScore >= 8 && averageConfidence >= 90) {
        severity = "critical";
    }
    else if (normalizedRiskScore >= 6 && averageConfidence >= 80) {
        severity = "high";
    }
    else if (normalizedRiskScore >= 3 && averageConfidence >= 70) {
        severity = "medium";
    }
    else {
        severity = "low";
    }
    const detectionTime = performance.now() - startTime;
    console.log(`[SQL-INJECTION-ENGINE] Detection completed in ${detectionTime.toFixed(2)}ms - Threats: ${threats.length}, Risk Score: ${normalizedRiskScore}, Severity: ${severity}, Confidence: ${averageConfidence}%, DB Type: ${detectedDatabaseType || "unknown"}`);
    const uniqueContexts = Array.from(new Set(detectionContext));
    const contextualRiskAdjustment = uniqueContexts.length > 3 ? 1.2 : 1.0;
    const adjustedRiskScore = Math.min(10, Math.floor(normalizedRiskScore * contextualRiskAdjustment));
    const result = {
        hasInjection: threats.length > 0,
        threats,
        riskScore: adjustedRiskScore,
        severity,
        confidence: averageConfidence,
        detectionContext: uniqueContexts,
    };
    if (detectedDatabaseType) {
        result.databaseType = detectedDatabaseType;
    }
    return result;
}
exports.detectSQLInjection = detectSQLInjection;
function detectSQLInjectionLegacy(input) {
    const result = detectSQLInjection(input);
    return result.hasInjection;
}
exports.detectSQLInjectionLegacy = detectSQLInjectionLegacy;
function detectCommandInjection(input, options = {}) {
    const startTime = performance.now();
    console.log(`[CMD-INJECTION-ENGINE] Starting comprehensive command injection analysis for input length: ${input.length}`);
    const { strictMode = false, contextType = "general" } = options;
    const originalInput = input;
    const threats = [];
    let riskScore = 0;
    let totalConfidence = 0;
    let detectionCount = 0;
    const detectionContext = [];
    const attackVectors = [];
    let detectedPlatformType;
    console.log(`[CMD-INJECTION-ENGINE] Analysis mode: ${strictMode ? "strict" : "standard"}, Context: ${contextType}`);
    const criticalPatterns = [
        {
            pattern: /[;&|`$(){}[\]<>]|\|\||&&/g,
            threat: "Shell Command Separator",
            score: 90,
            confidence: 95,
            context: "Command chaining/piping detected",
            platform: "unix",
        },
        {
            pattern: /\$\([^)]*\)|`[^`]*`|\${[^}]*}/g,
            threat: "Command Substitution",
            score: 95,
            confidence: 98,
            context: "Process substitution syntax detected",
            platform: "unix",
        },
        {
            pattern: /(&\s*[a-z]+)|(\|\s*[a-z]+)|(cmd\s*\/[ckqstv])|powershell|pwsh/gi,
            threat: "Windows Command Injection",
            score: 85,
            confidence: 90,
            context: "Windows shell command patterns",
            platform: "windows",
        },
        {
            pattern: /(rm\s+-rf|del\s+\/[sqf]|rmdir|rd\s+\/s)[\s/\\]|\.\.\//g,
            threat: "File System Manipulation",
            score: 88,
            confidence: 92,
            context: "Dangerous file operations detected",
            platform: "multi",
        },
        {
            pattern: /(wget|curl|nc|netcat|telnet|ssh|scp|rsync)\s+/gi,
            threat: "Network Command Execution",
            score: 80,
            confidence: 85,
            context: "Network tools for data exfiltration",
            platform: "unix",
        },
        {
            pattern: /(whoami|id|ps\s|netstat|ifconfig|ipconfig|systeminfo|uname)/gi,
            threat: "System Information Gathering",
            score: 75,
            confidence: 80,
            context: "System reconnaissance commands",
            platform: "multi",
        },
        {
            pattern: /(sudo|su\s|runas|kill\s+-9|killall|taskkill)/gi,
            threat: "Privilege Escalation",
            score: 90,
            confidence: 95,
            context: "Privilege escalation attempts",
            platform: "multi",
        },
        {
            pattern: /(docker\s+|kubectl\s+|containerd|runc|cgroups|\/proc\/self\/|chroot)/gi,
            threat: "Container Escape Attempt",
            score: 95,
            confidence: 90,
            context: "Container breakout patterns",
            platform: "unix",
        },
        {
            pattern: /(python|perl|ruby|node|php|bash|sh|zsh|csh|tcsh|fish)\s+(-c\s+|\/dev\/stdin|<<|<\s*\()/gi,
            threat: "Script Injection",
            score: 85,
            confidence: 88,
            context: "Interpreter execution with inline code",
            platform: "multi",
        },
        {
            pattern: /(export\s+|set\s+|setenv\s+|env\s+|PATH\s*=|LD_PRELOAD\s*=|LD_LIBRARY_PATH\s*=)/gi,
            threat: "Environment Variable Manipulation",
            score: 70,
            confidence: 75,
            context: "Environment variable tampering",
            platform: "unix",
        },
    ];
    const encodingBypassPatterns = [
        {
            pattern: /%[0-9a-f]{2}/gi,
            threat: "URL Encoding Bypass",
            score: 60,
            confidence: 70,
            context: "URL encoded characters detected",
            platform: "multi",
        },
        {
            pattern: /&#x?[0-9a-f]+;/gi,
            threat: "HTML Entity Bypass",
            score: 65,
            confidence: 75,
            context: "HTML entity encoding detected",
            platform: "multi",
        },
        {
            pattern: /\\u[0-9a-f]{4}|\\x[0-9a-f]{2}/gi,
            threat: "Unicode Escape Bypass",
            score: 70,
            confidence: 80,
            context: "Unicode escape sequences detected",
            platform: "multi",
        },
        {
            pattern: /[a-zA-Z0-9+/]{4,}={0,2}/g,
            threat: "Base64 Encoding Bypass",
            score: 50,
            confidence: 60,
            context: "Potential Base64 encoded payload",
            platform: "multi",
        },
        {
            pattern: /\\[0-7]{3}|\\[abfnrtv\\]/g,
            threat: "Octal/Escape Sequence Bypass",
            score: 65,
            confidence: 70,
            context: "Escape sequence encoding detected",
            platform: "multi",
        },
    ];
    const evasionPatterns = [
        {
            pattern: /\${IFS}|\$\(echo|\$'\w+'|\\\w/g,
            threat: "Advanced Shell Evasion",
            score: 85,
            confidence: 90,
            context: "Sophisticated shell metacharacter evasion",
            platform: "unix",
        },
        {
            pattern: /\^[a-zA-Z]|\|\s*more|\|\s*findstr/gi,
            threat: "Windows Command Evasion",
            score: 80,
            confidence: 85,
            context: "Windows-specific command evasion",
            platform: "windows",
        },
        {
            pattern: /(exec|system|eval|assert|call_user_func|passthru|shell_exec|popen|proc_open)/gi,
            threat: "Code Execution Function",
            score: 95,
            confidence: 98,
            context: "Dangerous code execution functions",
            platform: "multi",
        },
        {
            pattern: /\/\*[\s\S]*?\*\/|\/\/.*?[\r\n]|<!--[\s\S]*?-->/g,
            threat: "Comment-based Evasion",
            score: 40,
            confidence: 50,
            context: "Comments used for payload hiding",
            platform: "multi",
        },
        {
            pattern: /\+\s*'|'\s*\+|"\s*\+|\+\s*"|concat\s*\(/gi,
            threat: "String Concatenation Evasion",
            score: 60,
            confidence: 65,
            context: "String concatenation to evade detection",
            platform: "multi",
        },
    ];
    const contextualPatterns = [
        {
            pattern: /(ls\s|dir\s|cat\s|type\s|echo\s|printf\s)/gi,
            threat: "Basic System Commands",
            score: 30,
            confidence: 40,
            context: "Basic system commands - context dependent",
            platform: "multi",
        },
        {
            pattern: /\/[a-z]+\/[a-z]+|[a-z]:\\[a-z]+\\[a-z]+/gi,
            threat: "File Path Access",
            score: 35,
            confidence: 45,
            context: "Absolute file path references",
            platform: "multi",
        },
        {
            pattern: /\.(bat|cmd|exe|sh|py|pl|rb|js|vbs|ps1)[\s;"'|&<>]/gi,
            threat: "Executable File Reference",
            score: 55,
            confidence: 65,
            context: "References to executable files",
            platform: "multi",
        },
    ];
    console.log(`[CMD-INJECTION-ENGINE] Executing critical pattern analysis...`);
    for (const { pattern, threat, score, confidence, context, platform, } of criticalPatterns) {
        const matches = originalInput.match(pattern);
        if (matches) {
            console.log(`[CMD-INJECTION-ENGINE] CRITICAL threat detected: ${threat} - Matches: ${matches.length} (confidence: ${confidence}%, platform: ${platform})`);
            threats.push(threat);
            attackVectors.push(`${threat}: ${matches.slice(0, 3).join(", ")}${matches.length > 3 ? "..." : ""}`);
            riskScore += score;
            totalConfidence += confidence;
            detectionCount++;
            detectionContext.push(context);
            if (!detectedPlatformType || platform !== "multi") {
                detectedPlatformType = platform;
            }
        }
    }
    console.log(`[CMD-INJECTION-ENGINE] Executing encoding bypass analysis...`);
    for (const { pattern, threat, score, confidence, context, platform: _platform, } of encodingBypassPatterns) {
        const matches = originalInput.match(pattern);
        if (matches) {
            console.log(`[CMD-INJECTION-ENGINE] Encoding bypass detected: ${threat} - Matches: ${matches.length} (confidence: ${confidence}%)`);
            threats.push(threat);
            attackVectors.push(`${threat}: ${matches.slice(0, 2).join(", ")}`);
            riskScore += score;
            totalConfidence += confidence;
            detectionCount++;
            detectionContext.push(context);
        }
    }
    console.log(`[CMD-INJECTION-ENGINE] Executing evasion technique analysis...`);
    for (const { pattern, threat, score, confidence, context, platform, } of evasionPatterns) {
        const matches = originalInput.match(pattern);
        if (matches) {
            console.log(`[CMD-INJECTION-ENGINE] Advanced evasion detected: ${threat} - Matches: ${matches.length} (confidence: ${confidence}%, platform: ${platform})`);
            threats.push(threat);
            attackVectors.push(`${threat}: ${matches.slice(0, 2).join(", ")}`);
            riskScore += score;
            totalConfidence += confidence;
            detectionCount++;
            detectionContext.push(context);
            if (!detectedPlatformType || platform !== "multi") {
                detectedPlatformType = platform;
            }
        }
    }
    if (!strictMode || contextType === "general") {
        console.log(`[CMD-INJECTION-ENGINE] Executing contextual pattern analysis...`);
        for (const { pattern, threat, score, confidence, context, } of contextualPatterns) {
            const matches = originalInput.match(pattern);
            if (matches) {
                let adjustedScore = score;
                let adjustedConfidence = confidence;
                if (contextType === "url" || contextType === "api") {
                    adjustedScore *= 1.5;
                    adjustedConfidence += 10;
                }
                else if (contextType === "file") {
                    adjustedScore *= 0.7;
                    adjustedConfidence -= 10;
                }
                console.log(`[CMD-INJECTION-ENGINE] Contextual pattern detected: ${threat} - Context: ${contextType} - Adjusted Score: ${adjustedScore}`);
                threats.push(threat);
                attackVectors.push(`${threat}: ${matches.slice(0, 2).join(", ")}`);
                riskScore += adjustedScore;
                totalConfidence += adjustedConfidence;
                detectionCount++;
                detectionContext.push(context);
            }
        }
    }
    const normalizedRiskScore = Math.min(10, Math.floor(riskScore / 10));
    const averageConfidence = detectionCount > 0 ? Math.round(totalConfidence / detectionCount) : 100;
    let severity;
    const uniqueThreats = new Set(threats).size;
    const hasHighConfidenceThreats = threats.some((_, index) => index < criticalPatterns.length &&
        (criticalPatterns[index]?.confidence ?? 0) >= 90);
    if (normalizedRiskScore >= 8 &&
        averageConfidence >= 90 &&
        hasHighConfidenceThreats) {
        severity = "critical";
    }
    else if (normalizedRiskScore >= 6 &&
        averageConfidence >= 80 &&
        uniqueThreats >= 2) {
        severity = "high";
    }
    else if (normalizedRiskScore >= 3 && averageConfidence >= 70) {
        severity = "medium";
    }
    else {
        severity = "low";
    }
    const uniqueContexts = Array.from(new Set(detectionContext));
    const contextualRiskMultiplier = uniqueContexts.length > 3 ? 1.3 : uniqueContexts.length > 1 ? 1.1 : 1.0;
    const platformSpecificMultiplier = detectedPlatformType && detectedPlatformType !== "multi" ? 1.1 : 1.0;
    const finalRiskScore = Math.min(10, Math.floor(normalizedRiskScore *
        contextualRiskMultiplier *
        platformSpecificMultiplier));
    const detectionTime = performance.now() - startTime;
    console.log(`[CMD-INJECTION-ENGINE] Analysis completed in ${detectionTime.toFixed(2)}ms`);
    console.log(`[CMD-INJECTION-ENGINE] Final Results: Threats=${threats.length}, Risk=${finalRiskScore}, Severity=${severity}, Confidence=${averageConfidence}%, Platform=${detectedPlatformType || "unknown"}`);
    console.log(`[CMD-INJECTION-ENGINE] Attack Vectors: ${attackVectors.slice(0, 3).join(" | ")}${attackVectors.length > 3 ? "..." : ""}`);
    return {
        hasInjection: threats.length > 0,
        threats: Array.from(new Set(threats)),
        riskScore: finalRiskScore,
        severity,
        confidence: averageConfidence,
        detectionContext: uniqueContexts,
        platformType: detectedPlatformType || "unknown",
        attackVectors: attackVectors.slice(0, 10),
    };
}
exports.detectCommandInjection = detectCommandInjection;
exports.ROLE_PERMISSIONS = {
    [security_types_1.UserRole._ADMIN]: [
        security_types_1.Permission._TASK_READ,
        security_types_1.Permission._TASK_WRITE,
        security_types_1.Permission._TASK_DELETE,
        security_types_1.Permission._COMPUTER_CONTROL,
        security_types_1.Permission._COMPUTER_VIEW,
        security_types_1.Permission._SYSTEM_ADMIN,
        security_types_1.Permission._USER_MANAGE,
        security_types_1.Permission._METRICS_VIEW,
        security_types_1.Permission._LOGS_VIEW,
    ],
    [security_types_1.UserRole._OPERATOR]: [
        security_types_1.Permission._TASK_READ,
        security_types_1.Permission._TASK_WRITE,
        security_types_1.Permission._COMPUTER_CONTROL,
        security_types_1.Permission._COMPUTER_VIEW,
        security_types_1.Permission._METRICS_VIEW,
    ],
    [security_types_1.UserRole._VIEWER]: [
        security_types_1.Permission._TASK_READ,
        security_types_1.Permission._COMPUTER_VIEW,
        security_types_1.Permission._METRICS_VIEW,
    ],
    [security_types_1.UserRole._USER]: [
        security_types_1.Permission._TASK_READ,
        security_types_1.Permission._COMPUTER_VIEW,
        security_types_1.Permission._VIEW_OWN_PROFILE,
        security_types_1.Permission._VIEW_PUBLIC_CONTENT,
    ],
    [security_types_1.UserRole._GUEST]: [security_types_1.Permission._VIEW_PUBLIC_CONTENT],
};
function hasPermission(userRole, requiredPermissions, requireAll = true) {
    const userPermissions = exports.ROLE_PERMISSIONS[userRole] || [];
    if (requireAll) {
        return requiredPermissions.every((permission) => userPermissions.includes(permission));
    }
    else {
        return requiredPermissions.some((permission) => userPermissions.includes(permission));
    }
}
exports.hasPermission = hasPermission;
function hasRole(userRole, requiredRoles, requireAll = false) {
    if (requireAll) {
        return requiredRoles.every((role) => role === userRole);
    }
    else {
        return requiredRoles.includes(userRole);
    }
}
exports.hasRole = hasRole;
function generateEventId() {
    const timestamp = Date.now().toString(36);
    const random = (0, crypto_1.randomBytes)(8).toString("hex");
    return `evt_${timestamp}_${random}`;
}
exports.generateEventId = generateEventId;
function calculateRiskScore(eventType, metadata) {
    const baseScores = {
        [security_types_1.SecurityEventType._LOGIN_SUCCESS]: 0,
        [security_types_1.SecurityEventType._LOGIN_FAILED]: 25,
        [security_types_1.SecurityEventType._LOGOUT]: 0,
        [security_types_1.SecurityEventType._TOKEN_REFRESH]: 0,
        [security_types_1.SecurityEventType._ACCESS_GRANTED]: 0,
        [security_types_1.SecurityEventType._ACCESS_DENIED]: 30,
        [security_types_1.SecurityEventType._PERMISSION_ESCALATION_ATTEMPT]: 80,
        [security_types_1.SecurityEventType._VALIDATION_FAILED]: 20,
        [security_types_1.SecurityEventType._XSS_ATTEMPT_BLOCKED]: 70,
        [security_types_1.SecurityEventType._INJECTION_ATTEMPT_BLOCKED]: 85,
        [security_types_1.SecurityEventType._RATE_LIMIT_EXCEEDED]: 40,
        [security_types_1.SecurityEventType._SUSPICIOUS_ACTIVITY]: 60,
        [security_types_1.SecurityEventType._SECURITY_CONFIG_CHANGED]: 50,
        [security_types_1.SecurityEventType._ADMIN_ACTION]: 10,
    };
    let score = baseScores[eventType] || 50;
    if (metadata) {
        if (typeof metadata.attemptCount === "number" &&
            metadata.attemptCount > 3) {
            score += 20;
        }
        if (metadata.suspiciousIP) {
            score += 25;
        }
        if (metadata.offHours) {
            score += 15;
        }
        if (typeof metadata.failedAttemptsFromIP === "number" &&
            metadata.failedAttemptsFromIP > 5) {
            score += 30;
        }
    }
    return Math.min(100, Math.max(0, score));
}
exports.calculateRiskScore = calculateRiskScore;
function createSecurityEvent(type, resource, method, success, message, metadata, userId, ipAddress, userAgent, sessionId) {
    const event = {
        eventId: generateEventId(),
        type,
        timestamp: new Date(),
        endpoint: resource,
        method,
        riskScore: calculateRiskScore(type, metadata),
    };
    if (userId !== undefined)
        event.userId = userId;
    if (ipAddress !== undefined)
        event.ipAddress = ipAddress;
    if (userAgent !== undefined)
        event.userAgent = userAgent;
    if (sessionId !== undefined)
        event.sessionId = sessionId;
    if (success !== undefined)
        event.success = success;
    if (message !== undefined)
        event.message = message;
    if (metadata !== undefined)
        event.metadata = metadata;
    if (resource !== undefined)
        event.resource = resource;
    return event;
}
exports.createSecurityEvent = createSecurityEvent;
exports.DEFAULT_RATE_LIMITS = {
    [security_types_1.RateLimitPreset._AUTH]: {
        max: 5,
        windowMs: 15 * 60 * 1000,
        message: "Too many authentication attempts. Please try again later.",
    },
    [security_types_1.RateLimitPreset._COMPUTER_USE]: {
        max: 100,
        windowMs: 60 * 1000,
        message: "Computer control rate limit exceeded. Please slow down your requests.",
    },
    [security_types_1.RateLimitPreset._TASK_OPERATIONS]: {
        max: 50,
        windowMs: 60 * 1000,
        message: "Task operation rate limit exceeded. Please wait before retrying.",
    },
    [security_types_1.RateLimitPreset._READ_OPERATIONS]: {
        max: 500,
        windowMs: 60 * 1000,
        message: "Read operation rate limit exceeded. Please reduce request frequency.",
    },
    [security_types_1.RateLimitPreset._WEBSOCKET]: {
        max: 10,
        windowMs: 60 * 1000,
        message: "WebSocket connection rate limit exceeded. Please wait before reconnecting.",
    },
};
const _rateLimitPresetCompleteness = {
    [security_types_1.RateLimitPreset._AUTH]: true,
    [security_types_1.RateLimitPreset._COMPUTER_USE]: true,
    [security_types_1.RateLimitPreset._TASK_OPERATIONS]: true,
    [security_types_1.RateLimitPreset._READ_OPERATIONS]: true,
    [security_types_1.RateLimitPreset._WEBSOCKET]: true,
};
const _defaultRateLimitsKeys = Object.keys(exports.DEFAULT_RATE_LIMITS);
const _presetKeys = Object.keys(_rateLimitPresetCompleteness);
const _completenessCheck = true;
function getRateLimitConfig(preset) {
    const config = exports.DEFAULT_RATE_LIMITS[preset];
    if (!config) {
        throw new Error(`Rate limit configuration not found for preset: ${preset}`);
    }
    return { ...config };
}
exports.getRateLimitConfig = getRateLimitConfig;
function getAllRateLimitConfigs() {
    return { ...exports.DEFAULT_RATE_LIMITS };
}
exports.getAllRateLimitConfigs = getAllRateLimitConfigs;
function generateRateLimitKey(req, prefix = "rl") {
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const userId = req.user?.id || "anonymous";
    return `${prefix}:${ip}:${userId}`;
}
exports.generateRateLimitKey = generateRateLimitKey;
function generateRandomString(length = 32, encoding = "hex") {
    return (0, crypto_1.randomBytes)(length).toString(encoding);
}
exports.generateRandomString = generateRandomString;
function generateHMAC(data, secret, algorithm = "sha256") {
    return (0, crypto_1.createHmac)(algorithm, secret).update(data).digest("hex");
}
exports.generateHMAC = generateHMAC;
function verifyHMAC(data, signature, secret, algorithm = "sha256") {
    const expectedSignature = generateHMAC(data, secret, algorithm);
    return signature === expectedSignature;
}
exports.verifyHMAC = verifyHMAC;
function hashData(data, algorithm = "sha256") {
    return (0, crypto_1.createHash)(algorithm).update(data).digest("hex");
}
exports.hashData = hashData;
function detectMaliciousFileContent(content, filename) {
    const contentStr = Buffer.isBuffer(content)
        ? content.toString("utf8")
        : content;
    const executableSignatures = [
        /^MZ/,
        /^\x7fELF/,
        /^\xca\xfe\xba\xbe/,
        /^PK\x03\x04.*\.jar$/i,
        /^#!/,
    ];
    const scriptPatterns = [
        /<\?php/gi,
        /<script[^>]*>/gi,
        /<%[^>]*%>/gi,
        /\${.*}/gi,
        /eval\s*\(/gi,
        /exec\s*\(/gi,
        /system\s*\(/gi,
        /passthru\s*\(/gi,
        /shell_exec\s*\(/gi,
    ];
    if (filename) {
        const suspiciousExtensions = [
            ".php",
            ".asp",
            ".aspx",
            ".jsp",
            ".py",
            ".rb",
            ".pl",
            ".sh",
            ".bat",
            ".cmd",
            ".exe",
            ".scr",
            ".com",
            ".pif",
            ".jar",
            ".vbs",
            ".js",
            ".jar",
            ".war",
        ];
        const hasBlockedExtension = suspiciousExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
        if (hasBlockedExtension) {
            return true;
        }
    }
    if (executableSignatures.some((sig) => sig.test(contentStr))) {
        return true;
    }
    if (scriptPatterns.some((pattern) => pattern.test(contentStr))) {
        return true;
    }
    return false;
}
exports.detectMaliciousFileContent = detectMaliciousFileContent;
function validateFilePath(filePath, allowedBasePaths, options = {}) {
    const errors = [];
    const timestamp = new Date();
    const startTime = Date.now();
    const { allowAbsolutePaths = false, maxPathLength = 4096, allowedExtensions, strictMode = true, logSecurityEvents = true, } = options;
    console.log(`[PATH_VALIDATION] Starting validation for: ${filePath.substring(0, 100)}${filePath.length > 100 ? "..." : ""}`);
    if (!filePath || typeof filePath !== "string") {
        errors.push({
            field: "filePath",
            constraint: "invalidInput",
            message: "File path must be a non-empty string",
            rejectedValue: filePath,
        });
        return { isValid: false, errors, sanitizedData: {}, timestamp };
    }
    if (filePath.length > maxPathLength) {
        console.warn(`[PATH_SECURITY] Long path attack detected: ${filePath.length} chars (max: ${maxPathLength})`);
        errors.push({
            field: "filePath",
            constraint: "pathTooLong",
            message: `Path length exceeds maximum allowed (${maxPathLength} characters)`,
            rejectedValue: filePath,
        });
    }
    const normalizedPath = filePath.normalize("NFC");
    if (normalizedPath !== filePath) {
        console.warn(`[PATH_SECURITY] Unicode normalization attack detected`);
        errors.push({
            field: "filePath",
            constraint: "unicodeNormalizationAttack",
            message: "Suspicious Unicode normalization detected",
            rejectedValue: filePath,
        });
    }
    const urlEncodingPatterns = [
        /%2e%2e/gi,
        /%2f/gi,
        /%5c/gi,
        /%252e/gi,
        /%252f/gi,
        /%255c/gi,
    ];
    for (const pattern of urlEncodingPatterns) {
        if (pattern.test(filePath)) {
            console.warn(`[PATH_SECURITY] URL encoding bypass attempt detected: ${pattern}`);
            errors.push({
                field: "filePath",
                constraint: "urlEncodingBypass",
                message: "URL encoding bypass attempt detected",
                rejectedValue: filePath,
            });
            break;
        }
    }
    const htmlEntityPatterns = [
        /&dot;&dot;/gi,
        /&#46;&#46;/gi,
        /&#x2e;&#x2e;/gi,
        /&sol;/gi,
        /&#47;/gi,
        /&#x2f;/gi,
    ];
    for (const pattern of htmlEntityPatterns) {
        if (pattern.test(filePath)) {
            console.warn(`[PATH_SECURITY] HTML entity encoding bypass detected`);
            errors.push({
                field: "filePath",
                constraint: "htmlEntityBypass",
                message: "HTML entity encoding bypass attempt detected",
                rejectedValue: filePath,
            });
            break;
        }
    }
    if (/[A-Za-z0-9+/]{20,}={0,2}/.test(filePath)) {
        try {
            const decoded = Buffer.from(filePath, "base64").toString();
            if (/\.{2,}[/\\]|[/\\]\.{2,}/.test(decoded)) {
                console.warn(`[PATH_SECURITY] Base64 encoded path traversal detected`);
                errors.push({
                    field: "filePath",
                    constraint: "base64EncodingBypass",
                    message: "Base64 encoded path traversal attempt detected",
                    rejectedValue: filePath,
                });
            }
        }
        catch {
        }
    }
    const osSpecificPatterns = [
        /\.\.[/\\]/g,
        /\.\.\\|\\\.\.$/g,
        /[/\\]\.\.$/g,
        /\.\.;/g,
        /\$\$[^/\\]*\$\$/g,
        /\.\.\/|\/\.\.$|\/\.\.$/g,
        /~[^/]*\//g,
        /\/\.{1,2}\//g,
        /\.{3,}/g,
        /[/\\]{2,}/g,
        /\.[/\\]/g,
        /[/\\]\./g,
    ];
    for (const pattern of osSpecificPatterns) {
        if (pattern.test(filePath)) {
            console.warn(`[PATH_SECURITY] OS-specific path traversal pattern detected: ${pattern}`);
            errors.push({
                field: "filePath",
                constraint: "osSpecificTraversal",
                message: "OS-specific path traversal pattern detected",
                rejectedValue: filePath,
            });
            break;
        }
    }
    const symlinkPatterns = [
        /\/proc\//gi,
        /\/sys\//gi,
        /\/dev\//gi,
        /\\Device\\/gi,
        /\\DosDevices\\/gi,
        /\\\\\?\\/gi,
    ];
    for (const pattern of symlinkPatterns) {
        if (pattern.test(filePath)) {
            console.warn(`[PATH_SECURITY] Symlink attack pattern detected: ${pattern}`);
            errors.push({
                field: "filePath",
                constraint: "symlinkAttack",
                message: "Potential symlink attack detected",
                rejectedValue: filePath,
            });
            break;
        }
    }
    if (strictMode) {
        const upperPath = filePath.toUpperCase();
        const lowerPath = filePath.toLowerCase();
        const dangerousPatterns = ["../", "..\\", "../", "..\\"];
        for (const pattern of dangerousPatterns) {
            if (upperPath.includes(pattern.toUpperCase()) ||
                lowerPath.includes(pattern.toLowerCase())) {
                console.warn(`[PATH_SECURITY] Case sensitivity bypass detected`);
                errors.push({
                    field: "filePath",
                    constraint: "caseSensitivityBypass",
                    message: "Case sensitivity bypass attempt detected",
                    rejectedValue: filePath,
                });
                break;
            }
        }
    }
    const controlCharPattern = /[\x00-\x1f\x7f-\x9f]|\u0000|\uFEFF/;
    if (controlCharPattern.test(filePath)) {
        console.warn(`[PATH_SECURITY] Control characters or null bytes detected`);
        errors.push({
            field: "filePath",
            constraint: "controlCharacters",
            message: "Control characters or null bytes detected in file path",
            rejectedValue: filePath,
        });
    }
    if (!allowAbsolutePaths) {
        const absolutePathPatterns = [
            /^[/\\]/,
            /^[A-Za-z]:[/\\]/,
            /^\\\\/,
            /^file:\/\//gi,
            /^[a-z]+:\/\//gi,
        ];
        for (const pattern of absolutePathPatterns) {
            if (pattern.test(filePath)) {
                console.warn(`[PATH_SECURITY] Absolute path detected when not allowed`);
                errors.push({
                    field: "filePath",
                    constraint: "absolutePath",
                    message: "Absolute paths are not allowed",
                    rejectedValue: filePath,
                });
                break;
            }
        }
    }
    const fileExtension = filePath.split(".").pop()?.toLowerCase();
    if (allowedExtensions && allowedExtensions.length > 0 && fileExtension) {
        const normalizedAllowed = allowedExtensions.map((ext) => ext.toLowerCase().replace(/^\./, ""));
        if (!normalizedAllowed.includes(fileExtension)) {
            console.warn(`[PATH_SECURITY] Disallowed file extension: ${fileExtension}`);
            errors.push({
                field: "filePath",
                constraint: "disallowedExtension",
                message: `File extension '${fileExtension}' is not allowed`,
                rejectedValue: filePath,
            });
        }
    }
    const dangerousExtensions = [
        "exe",
        "bat",
        "cmd",
        "com",
        "pif",
        "scr",
        "vbs",
        "js",
        "jar",
        "sh",
        "ps1",
        "php",
        "asp",
        "jsp",
        "py",
        "rb",
        "pl",
    ];
    if (fileExtension && dangerousExtensions.includes(fileExtension)) {
        console.warn(`[PATH_SECURITY] Dangerous file extension detected: ${fileExtension}`);
        errors.push({
            field: "filePath",
            constraint: "dangerousExtension",
            message: `Potentially dangerous file extension '${fileExtension}' detected`,
            rejectedValue: filePath,
        });
    }
    if (allowedBasePaths && allowedBasePaths.length > 0) {
        console.log(`[PATH_VALIDATION] Checking against ${allowedBasePaths.length} allowed base paths`);
        const canonicalizePath = (path) => {
            return path
                .replace(/[/\\]+/g, "/")
                .replace(/\/\.\//g, "/")
                .replace(/\/[^/]*\/\.\.\//g, "/")
                .replace(/^\.\//g, "")
                .toLowerCase()
                .trim();
        };
        const canonicalPath = canonicalizePath(filePath);
        const isAllowed = allowedBasePaths.some((basePath) => {
            const canonicalBase = canonicalizePath(basePath);
            const isWithinBase = canonicalPath.startsWith(canonicalBase);
            console.log(`[PATH_VALIDATION] Checking '${canonicalPath}' against '${canonicalBase}': ${isWithinBase}`);
            return isWithinBase;
        });
        if (!isAllowed) {
            console.warn(`[PATH_SECURITY] Path not within allowed directories`);
            errors.push({
                field: "filePath",
                constraint: "unauthorizedPath",
                message: "File path is not within allowed directories",
                rejectedValue: filePath,
            });
        }
    }
    let sanitizedPath = filePath;
    if (errors.length === 0) {
        sanitizedPath = filePath
            .replace(/[\x00-\x1f\x7f-\x9f]/g, "")
            .normalize("NFC")
            .replace(/\.{4,}/g, "...")
            .replace(/[/\\]{2,}/g, "/")
            .trim();
        console.log(`[PATH_VALIDATION] Path sanitized successfully`);
    }
    else {
        console.warn(`[PATH_SECURITY] Path validation failed with ${errors.length} errors`);
        sanitizedPath = null;
    }
    const validationTime = Date.now() - startTime;
    if (logSecurityEvents && errors.length > 0) {
        const securityEvent = {
            type: "PATH_TRAVERSAL_ATTEMPT",
            timestamp,
            severity: "HIGH",
            details: {
                originalPath: filePath,
                validationErrors: errors.map((e) => e.constraint),
                validationTimeMs: validationTime,
                userAgent: "system",
            },
        };
        console.error(`[SECURITY_EVENT] ${JSON.stringify(securityEvent, null, 2)}`);
    }
    console.log(`[PATH_VALIDATION] Completed in ${validationTime}ms - Valid: ${errors.length === 0}`);
    const result = {
        isValid: errors.length === 0,
        errors,
        timestamp,
    };
    if (sanitizedPath) {
        result.sanitizedData = { path: sanitizedPath };
    }
    return result;
}
exports.validateFilePath = validateFilePath;
const DEFAULT_COORDINATE_CONFIG = {
    maxReasonableCoordinate: 65535,
    multiMonitorSupport: true,
    floatingPointProtection: true,
    performanceMonitoring: true,
    accessibilityChecks: true,
};
function validateCoordinates(x, y, screenBounds, multiMonitorConfig, config = DEFAULT_COORDINATE_CONFIG) {
    const startTime = config.performanceMonitoring
        ? process.hrtime.bigint()
        : BigInt(0);
    const errors = [];
    const timestamp = new Date();
    const checksPerformed = [];
    let threatLevel = "none";
    const suspiciousPatterns = [];
    const recommendations = [];
    console.info("🔍 [COORDINATE_VALIDATION] Starting enhanced coordinate validation", {
        coordinates: { x, y },
        timestamp: timestamp.toISOString(),
        config: {
            multiMonitorSupport: config.multiMonitorSupport,
            floatingPointProtection: config.floatingPointProtection,
            maxReasonableCoordinate: config.maxReasonableCoordinate,
        },
    });
    checksPerformed.push("type_validation");
    if (typeof x !== "number" || typeof y !== "number") {
        errors.push({
            field: "coordinates",
            constraint: "invalidType",
            message: "Coordinates must be numeric values",
            rejectedValue: { x: typeof x, y: typeof y },
        });
        threatLevel = "medium";
        suspiciousPatterns.push("non_numeric_coordinates");
        recommendations.push("Ensure coordinates are passed as number types");
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
        errors.push({
            field: "coordinates",
            constraint: "invalidNumber",
            message: "Coordinates must be finite numbers (no NaN, Infinity, -Infinity)",
            rejectedValue: { x, y },
        });
        threatLevel = "high";
        suspiciousPatterns.push("infinite_or_nan_coordinates");
        recommendations.push("Validate coordinate inputs before passing to validation function");
    }
    if (config.floatingPointProtection) {
        checksPerformed.push("floating_point_protection");
        const xDecimalPlaces = (x.toString().split(".")[1] || "").length;
        const yDecimalPlaces = (y.toString().split(".")[1] || "").length;
        const MAX_DECIMAL_PLACES = 10;
        if (xDecimalPlaces > MAX_DECIMAL_PLACES ||
            yDecimalPlaces > MAX_DECIMAL_PLACES) {
            errors.push({
                field: "coordinates",
                constraint: "excessivePrecision",
                message: `Coordinates have excessive decimal precision (max ${MAX_DECIMAL_PLACES} places)`,
                rejectedValue: { x, y, xDecimalPlaces, yDecimalPlaces },
            });
            threatLevel = "medium";
            suspiciousPatterns.push("excessive_floating_point_precision");
            recommendations.push("Round coordinates to reasonable precision before validation");
        }
        const xStr = x.toString();
        const yStr = y.toString();
        if (xStr.includes("e") ||
            yStr.includes("e") ||
            xStr.length > 20 ||
            yStr.length > 20) {
            suspiciousPatterns.push("scientific_notation_or_excessive_length");
            if (threatLevel === "none")
                threatLevel = "low";
        }
    }
    checksPerformed.push("overflow_protection");
    const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
    const MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER;
    if (x > MAX_SAFE_INTEGER ||
        x < MIN_SAFE_INTEGER ||
        y > MAX_SAFE_INTEGER ||
        y < MIN_SAFE_INTEGER) {
        errors.push({
            field: "coordinates",
            constraint: "integerOverflow",
            message: "Coordinates exceed safe integer limits",
            rejectedValue: { x, y, MAX_SAFE_INTEGER, MIN_SAFE_INTEGER },
        });
        threatLevel = "critical";
        suspiciousPatterns.push("integer_overflow_attempt");
        recommendations.push("Implement input sanitization at API boundary");
    }
    checksPerformed.push("bounds_validation");
    const minX = config.customBounds?.minX ?? 0;
    const minY = config.customBounds?.minY ?? 0;
    if (x < minX || y < minY) {
        errors.push({
            field: "coordinates",
            constraint: "belowMinimumBounds",
            message: `Coordinates cannot be below minimum bounds (x >= ${minX}, y >= ${minY})`,
            rejectedValue: { x, y, minX, minY },
        });
        if (x < -1000 || y < -1000) {
            threatLevel = "medium";
            suspiciousPatterns.push("extremely_negative_coordinates");
        }
    }
    if (config.multiMonitorSupport && multiMonitorConfig) {
        checksPerformed.push("multi_monitor_validation");
        const { primary, secondary = [], virtual } = multiMonitorConfig;
        let isWithinAnyScreen = false;
        if (x >= primary.x &&
            x <= primary.x + primary.width &&
            y >= primary.y &&
            y <= primary.y + primary.height) {
            isWithinAnyScreen = true;
        }
        for (const screen of secondary) {
            if (x >= screen.x &&
                x <= screen.x + screen.width &&
                y >= screen.y &&
                y <= screen.y + screen.height) {
                isWithinAnyScreen = true;
                break;
            }
        }
        if (!isWithinAnyScreen) {
            if (x < virtual.x ||
                x > virtual.x + virtual.width ||
                y < virtual.y ||
                y > virtual.y + virtual.height) {
                errors.push({
                    field: "coordinates",
                    constraint: "outsideMultiMonitorBounds",
                    message: "Coordinates are outside all configured monitor boundaries",
                    rejectedValue: { x, y, multiMonitorConfig },
                });
                suspiciousPatterns.push("coordinates_outside_all_monitors");
            }
        }
    }
    else if (screenBounds) {
        if (x > screenBounds.width || y > screenBounds.height) {
            errors.push({
                field: "coordinates",
                constraint: "outOfBounds",
                message: "Coordinates exceed screen boundaries",
                rejectedValue: { x, y, screenBounds },
            });
        }
    }
    checksPerformed.push("suspicious_value_detection");
    const maxCoordinate = config.customBounds?.maxX ??
        config.customBounds?.maxY ??
        config.maxReasonableCoordinate;
    if (x > maxCoordinate || y > maxCoordinate) {
        const severity = x > maxCoordinate * 10 || y > maxCoordinate * 10 ? "high" : "medium";
        errors.push({
            field: "coordinates",
            constraint: "suspiciouslyLarge",
            message: `Coordinates are suspiciously large (max reasonable: ${maxCoordinate})`,
            rejectedValue: { x, y, maxCoordinate },
        });
        threatLevel = severity;
        suspiciousPatterns.push("suspiciously_large_coordinates");
        recommendations.push("Implement coordinate bounds checking at input layer");
    }
    checksPerformed.push("injection_attack_detection");
    const coordStr = `${x},${y}`;
    const injectionPatterns = [
        /[<>]/,
        /['"]/,
        /[;{}]/,
        /\\[x]/,
    ];
    const hasControlChars = coordStr.split("").some((char) => {
        const code = char.charCodeAt(0);
        return code >= 0 && code <= 31;
    });
    for (const pattern of injectionPatterns) {
        if (pattern.test(coordStr)) {
            errors.push({
                field: "coordinates",
                constraint: "injectionPattern",
                message: "Coordinates contain suspicious injection patterns",
                rejectedValue: { x, y, pattern: pattern.source },
            });
            threatLevel = "high";
            suspiciousPatterns.push("potential_injection_attack");
            recommendations.push("Sanitize inputs before coordinate validation");
        }
    }
    if (hasControlChars) {
        errors.push({
            field: "coordinates",
            constraint: "controlCharacters",
            message: "Coordinates contain control characters",
            rejectedValue: { x, y },
        });
        threatLevel = "high";
        suspiciousPatterns.push("control_characters_detected");
        recommendations.push("Remove control characters from coordinate inputs");
    }
    if (config.accessibilityChecks) {
        checksPerformed.push("accessibility_validation");
        const accessibilityZones = {
            topLeft: { x: 0, y: 0, width: 100, height: 100 },
            topRight: {
                x: (screenBounds?.width || 1920) - 100,
                y: 0,
                width: 100,
                height: 100,
            },
        };
        for (const [zone, bounds] of Object.entries(accessibilityZones)) {
            if (x >= bounds.x &&
                x <= bounds.x + bounds.width &&
                y >= bounds.y &&
                y <= bounds.y + bounds.height) {
                console.warn("⚠️ [COORDINATE_VALIDATION] Coordinate targets accessibility zone", {
                    zone,
                    coordinates: { x, y },
                    bounds,
                });
                suspiciousPatterns.push(`accessibility_zone_targeting_${zone}`);
            }
        }
    }
    const endTime = config.performanceMonitoring
        ? process.hrtime.bigint()
        : BigInt(0);
    const duration = config.performanceMonitoring
        ? Number(endTime - startTime)
        : 0;
    let riskScore = 0;
    if (suspiciousPatterns.length > 0) {
        riskScore = Math.min(100, suspiciousPatterns.length * 20);
    }
    if (errors.length > 3) {
        threatLevel = "high";
    }
    else if (errors.length > 1 && suspiciousPatterns.length > 0) {
        threatLevel = threatLevel === "none" ? "medium" : threatLevel;
    }
    let sanitizedData = undefined;
    if (errors.length === 0 && Number.isFinite(x) && Number.isFinite(y)) {
        sanitizedData = {
            x: Math.round(Math.max(minX, Math.min(maxCoordinate, x))),
            y: Math.round(Math.max(minY, Math.min(maxCoordinate, y))),
            originalPrecision: {
                x: x,
                y: y,
            },
        };
    }
    if (threatLevel !== "none" || suspiciousPatterns.length > 0) {
        console.warn("⚠️ [COORDINATE_SECURITY] Suspicious coordinate validation detected", {
            threatLevel,
            suspiciousPatterns,
            coordinates: { x, y },
            riskScore,
            timestamp: timestamp.toISOString(),
        });
    }
    if (config.performanceMonitoring && duration > 1000000) {
        console.warn("⚠️ [COORDINATE_PERFORMANCE] Slow coordinate validation detected", {
            duration,
            durationMs: duration / 1000000,
            checksPerformed,
            coordinates: { x, y },
        });
    }
    const result = {
        isValid: errors.length === 0,
        errors,
        timestamp,
    };
    if (sanitizedData) {
        result.sanitizedData = sanitizedData;
    }
    if (config.performanceMonitoring) {
        result.metrics = {
            startTime: Number(startTime),
            endTime: Number(endTime),
            duration,
            checksPerformed,
            threatLevel,
        };
    }
    if (suspiciousPatterns.length > 0) {
        result.threatAnalysis = {
            suspiciousPatterns,
            riskScore,
            recommendations,
        };
    }
    console.info("✅ [COORDINATE_VALIDATION] Coordinate validation completed", {
        isValid: result.isValid,
        threatLevel,
        checksPerformed: checksPerformed.length,
        duration: config.performanceMonitoring
            ? `${duration / 1000000}ms`
            : "not_measured",
        timestamp: timestamp.toISOString(),
    });
    return result;
}
exports.validateCoordinates = validateCoordinates;
exports.ENHANCED_DOMPURIFY_CONFIGS = {
    ULTRA_STRICT: {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
        SANITIZE_DOM: true,
        FORBID_TAGS: [
            "script",
            "object",
            "embed",
            "link",
            "style",
            "iframe",
            "frame",
            "frameset",
        ],
        FORBID_ATTR: [
            "onerror",
            "onload",
            "onclick",
            "onmouseover",
            "onfocus",
            "onblur",
            "onchange",
            "onsubmit",
        ],
    },
    STRICT: {
        ALLOWED_TAGS: ["b", "i", "em", "strong", "u", "br", "p"],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
        SANITIZE_DOM: true,
        FORBID_TAGS: [
            "script",
            "object",
            "embed",
            "link",
            "style",
            "iframe",
            "frame",
            "frameset",
        ],
        FORBID_ATTR: [
            "onerror",
            "onload",
            "onclick",
            "onmouseover",
            "onfocus",
            "onblur",
            "onchange",
            "onsubmit",
        ],
    },
    MODERATE: {
        ALLOWED_TAGS: [
            "b",
            "i",
            "em",
            "strong",
            "u",
            "br",
            "p",
            "span",
            "div",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "ul",
            "ol",
            "li",
        ],
        ALLOWED_ATTR: ["class", "id", "title"],
        KEEP_CONTENT: true,
        SANITIZE_DOM: true,
        FORBID_TAGS: [
            "script",
            "object",
            "embed",
            "link",
            "style",
            "iframe",
            "frame",
            "frameset",
        ],
        FORBID_ATTR: [
            "onerror",
            "onload",
            "onclick",
            "onmouseover",
            "onfocus",
            "onblur",
            "onchange",
            "onsubmit",
        ],
    },
    RICH_CONTENT: {
        ALLOWED_TAGS: [
            "b",
            "i",
            "em",
            "strong",
            "u",
            "br",
            "p",
            "span",
            "div",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "ul",
            "ol",
            "li",
            "a",
            "img",
            "blockquote",
            "pre",
            "code",
        ],
        ALLOWED_ATTR: ["class", "id", "title", "href", "src", "alt", "target"],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
        KEEP_CONTENT: true,
        SANITIZE_DOM: true,
        FORBID_TAGS: [
            "script",
            "object",
            "embed",
            "link",
            "style",
            "iframe",
            "frame",
            "frameset",
        ],
        FORBID_ATTR: [
            "onerror",
            "onload",
            "onclick",
            "onmouseover",
            "onfocus",
            "onblur",
            "onchange",
            "onsubmit",
        ],
    },
};
function detectAdvancedXSS(input) {
    if (typeof input !== "string") {
        console.log("[XSS-ENGINE] Input validation: Non-string input rejected");
        return {
            hasXSS: false,
            threats: [],
            riskScore: 0,
            severity: "low",
            confidence: 100,
            detectionContext: [],
        };
    }
    console.log(`[XSS-ENGINE] Starting advanced XSS detection for input: ${input.substring(0, 100)}${input.length > 100 ? "..." : ""}`);
    const threats = [];
    const detectionContext = [];
    let riskScore = 0;
    let totalConfidence = 0;
    let detectionCount = 0;
    const normalizedInput = input.normalize("NFKC");
    if (normalizedInput !== input) {
        console.log("[XSS-ENGINE] Unicode normalization difference detected");
        detectionContext.push("unicode-normalization");
    }
    const advancedXSSPatterns = [
        {
            pattern: /<script[^>]*>.*?<\/script>/gi,
            threat: "Script Injection",
            score: 10,
            confidence: 95,
            context: "html-injection",
        },
        {
            pattern: /<iframe[^>]*>.*?<\/iframe>/gi,
            threat: "IFrame Injection",
            score: 9,
            confidence: 90,
            context: "html-injection",
        },
        {
            pattern: /javascript\s*:/gi,
            threat: "JavaScript Protocol",
            score: 9,
            confidence: 95,
            context: "protocol-injection",
        },
        {
            pattern: /vbscript\s*:/gi,
            threat: "VBScript Protocol",
            score: 8,
            confidence: 90,
            context: "protocol-injection",
        },
        {
            pattern: /data\s*:\s*text\/html/gi,
            threat: "Data HTML Protocol",
            score: 8,
            confidence: 85,
            context: "protocol-injection",
        },
        {
            pattern: /data\s*:\s*image\/svg\+xml/gi,
            threat: "SVG Data Protocol",
            score: 7,
            confidence: 80,
            context: "protocol-injection",
        },
        {
            pattern: /on(?:abort|blur|change|click|dblclick|error|focus|keydown|keypress|keyup|load|mousedown|mousemove|mouseout|mouseover|mouseup|reset|resize|select|submit|unload)\s*=/gi,
            threat: "Event Handler",
            score: 8,
            confidence: 90,
            context: "event-handler",
        },
        {
            pattern: /<object[^>]*>.*?<\/object>/gi,
            threat: "Object Injection",
            score: 8,
            confidence: 85,
            context: "html-injection",
        },
        {
            pattern: /<embed[^>]*>.*?<\/embed>/gi,
            threat: "Embed Injection",
            score: 8,
            confidence: 85,
            context: "html-injection",
        },
        {
            pattern: /<applet[^>]*>.*?<\/applet>/gi,
            threat: "Applet Injection",
            score: 8,
            confidence: 85,
            context: "html-injection",
        },
        {
            pattern: /expression\s*\(/gi,
            threat: "CSS Expression",
            score: 7,
            confidence: 85,
            context: "css-injection",
        },
        {
            pattern: /-moz-binding\s*:/gi,
            threat: "Mozilla Binding",
            score: 7,
            confidence: 80,
            context: "css-injection",
        },
        {
            pattern: /behavior\s*:/gi,
            threat: "CSS Behavior",
            score: 6,
            confidence: 75,
            context: "css-injection",
        },
        {
            pattern: /<style[^>]*>.*?<\/style>/gi,
            threat: "Style Injection",
            score: 6,
            confidence: 80,
            context: "css-injection",
        },
        {
            pattern: /&#x[0-9a-f]+;/gi,
            threat: "Hex Entity Encoding",
            score: 5,
            confidence: 70,
            context: "encoding",
        },
        {
            pattern: /&#[0-9]+;/gi,
            threat: "Decimal Entity Encoding",
            score: 4,
            confidence: 65,
            context: "encoding",
        },
        {
            pattern: /\\u[0-9a-f]{4}/gi,
            threat: "Unicode Escape",
            score: 5,
            confidence: 70,
            context: "encoding",
        },
        {
            pattern: /\\x[0-9a-f]{2}/gi,
            threat: "Hex Escape",
            score: 5,
            confidence: 70,
            context: "encoding",
        },
        {
            pattern: /document\.|window\.|eval\(|setTimeout\(|setInterval\(/gi,
            threat: "DOM Manipulation",
            score: 8,
            confidence: 85,
            context: "dom-manipulation",
        },
        {
            pattern: /data\s*:.*base64.*(?:script|javascript)/gi,
            threat: "Base64 Script",
            score: 9,
            confidence: 90,
            context: "encoding",
        },
        {
            pattern: /<svg[^>]*>.*?<\/svg>/gi,
            threat: "SVG Injection",
            score: 7,
            confidence: 80,
            context: "svg-injection",
        },
        {
            pattern: /<use[^>]*xlink:href/gi,
            threat: "SVG XLink",
            score: 6,
            confidence: 75,
            context: "svg-injection",
        },
        {
            pattern: /\{\{.*?\}\}/gi,
            threat: "Template Injection",
            score: 7,
            confidence: 75,
            context: "template-injection",
        },
        {
            pattern: /\$\{.*?\}/gi,
            threat: "Template Literal",
            score: 7,
            confidence: 80,
            context: "template-injection",
        },
        {
            pattern: /<!--\s*#(?:include|exec|echo)/gi,
            threat: "SSI Injection",
            score: 8,
            confidence: 85,
            context: "server-side-injection",
        },
        {
            pattern: /<meta[^>]*refresh[^>]*>/gi,
            threat: "Meta Refresh",
            score: 6,
            confidence: 80,
            context: "html-injection",
        },
        {
            pattern: /<form[^>]*>.*?<\/form>/gi,
            threat: "Form Injection",
            score: 5,
            confidence: 70,
            context: "html-injection",
        },
        {
            pattern: /<link[^>]*>/gi,
            threat: "Link Injection",
            score: 6,
            confidence: 75,
            context: "html-injection",
        },
        {
            pattern: /@import\s*["'].*?["']/gi,
            threat: "CSS Import",
            score: 6,
            confidence: 75,
            context: "css-injection",
        },
        {
            pattern: /WebAssembly\.(instantiate|compile)|new\s+WebAssembly\.(Module|Instance)/gi,
            threat: "WebAssembly XSS",
            score: 10,
            confidence: 95,
            context: "webassembly-injection",
        },
        {
            pattern: /\.wasm["']?\s*[,)}]]|\.wasm\b/gi,
            threat: "WebAssembly Binary Reference",
            score: 8,
            confidence: 80,
            context: "webassembly-injection",
        },
        {
            pattern: /application\/wasm|wasm-module/gi,
            threat: "WebAssembly MIME Type",
            score: 7,
            confidence: 75,
            context: "webassembly-injection",
        },
        {
            pattern: /styled\.|css`|emotion\.|@emotion\/styled/gi,
            threat: "CSS-in-JS Injection",
            score: 8,
            confidence: 85,
            context: "css-in-js-injection",
        },
        {
            pattern: /\$\{[^}]*(?:eval|Function|setTimeout|setInterval|document|window)[^}]*\}/gi,
            threat: "CSS-in-JS Template Injection",
            score: 9,
            confidence: 90,
            context: "css-in-js-injection",
        },
        {
            pattern: /createGlobalStyle|ThemeProvider.*\$\{/gi,
            threat: "Styled Components Injection",
            score: 7,
            confidence: 80,
            context: "css-in-js-injection",
        },
        {
            pattern: /<!--(?:[^>]|>(?!\s*-->))*--!?>|<\?xml[^>]*\?>.*<script/gi,
            threat: "Polyglot HTML/XML XSS",
            score: 9,
            confidence: 85,
            context: "polyglot-attack",
        },
        {
            pattern: /\/\*.*?<script.*?\*\//gi,
            threat: "Polyglot CSS/JS XSS",
            score: 8,
            confidence: 80,
            context: "polyglot-attack",
        },
        {
            pattern: /%PDF.*javascript|PDF.*openAction|PDF.*JS/gi,
            threat: "Polyglot PDF/JS XSS",
            score: 9,
            confidence: 85,
            context: "polyglot-attack",
        },
        {
            pattern: /[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g,
            threat: "Unicode Control Characters",
            score: 7,
            confidence: 90,
            context: "unicode-normalization",
        },
        {
            pattern: /(?:[\u0300-\u036F]|[\u1AB0-\u1AFF]|[\u1DC0-\u1DFF])+/g,
            threat: "Unicode Combining Characters",
            score: 6,
            confidence: 75,
            context: "unicode-normalization",
        },
        {
            pattern: /[\uFE00-\uFE0F]/g,
            threat: "Unicode Variation Selectors",
            score: 6,
            confidence: 80,
            context: "unicode-normalization",
        },
        {
            pattern: /%0D%0A|%0A%0D|\\r\\n|\\n\\r|%0D|%0A/gi,
            threat: "CRLF Injection (Encoded)",
            score: 8,
            confidence: 90,
            context: "crlf-injection",
        },
        {
            pattern: /\r\n.*?(?:Location:|Set-Cookie:|Content-Type:)/gi,
            threat: "CRLF Header Injection",
            score: 9,
            confidence: 85,
            context: "crlf-injection",
        },
        {
            pattern: /\\u000D\\u000A|\\u000A\\u000D/gi,
            threat: "CRLF Unicode Injection",
            score: 8,
            confidence: 80,
            context: "crlf-injection",
        },
        {
            pattern: /<(?:img|form|iframe|object)\s+[^>]*(?:name|id)\s*=\s*["']?(?:location|document|window|eval)["']?/gi,
            threat: "DOM Clobbering",
            score: 9,
            confidence: 90,
            context: "dom-clobbering",
        },
        {
            pattern: /<form[^>]*name\s*=\s*["']?(?:attributes|innerHTML|outerHTML)["']?/gi,
            threat: "Form DOM Clobbering",
            score: 8,
            confidence: 85,
            context: "dom-clobbering",
        },
        {
            pattern: /<iframe[^>]*name\s*=\s*["']?(?:contentDocument|contentWindow)["']?/gi,
            threat: "IFrame DOM Clobbering",
            score: 9,
            confidence: 85,
            context: "dom-clobbering",
        },
        {
            pattern: /attachShadow|shadowRoot|customElements\.define/gi,
            threat: "Shadow DOM Manipulation",
            score: 8,
            confidence: 85,
            context: "shadow-dom-manipulation",
        },
        {
            pattern: /<template[^>]*>.*?<\/template>/gi,
            threat: "Template Element Injection",
            score: 7,
            confidence: 80,
            context: "shadow-dom-manipulation",
        },
        {
            pattern: /slot\s*=|<slot[^>]*>/gi,
            threat: "Shadow DOM Slot Injection",
            score: 6,
            confidence: 75,
            context: "shadow-dom-manipulation",
        },
        {
            pattern: /on(?:auxclick|beforeinput|compositionstart|compositionupdate|compositionend|contextmenu|wheel|animationstart|animationend|transitionstart|transitionend)\s*=/gi,
            threat: "Modern Event Handler",
            score: 8,
            confidence: 85,
            context: "modern-event-handler",
        },
        {
            pattern: /addEventListener\s*\(\s*["'](?:message|storage|popstate|hashchange)["']/gi,
            threat: "Dynamic Event Listener",
            score: 7,
            confidence: 80,
            context: "modern-event-handler",
        },
        {
            pattern: /(?:fetch|XMLHttpRequest).*?(?:eval|Function|setTimeout)/gi,
            threat: "Fetch API Code Injection",
            score: 9,
            confidence: 85,
            context: "modern-api-abuse",
        },
        {
            pattern: /(?:localStorage|sessionStorage)\.setItem.*?(?:<script|javascript:|eval)/gi,
            threat: "Storage API XSS",
            score: 8,
            confidence: 80,
            context: "modern-api-abuse",
        },
        {
            pattern: /postMessage\s*\([^)]*(?:eval|Function|setTimeout)/gi,
            threat: "PostMessage Code Injection",
            score: 9,
            confidence: 85,
            context: "modern-api-abuse",
        },
        {
            pattern: /new\s+(?:ServiceWorker|Worker|SharedWorker)\s*\(/gi,
            threat: "Web Worker Injection",
            score: 9,
            confidence: 90,
            context: "web-worker-injection",
        },
        {
            pattern: /navigator\.serviceWorker\.register/gi,
            threat: "Service Worker Registration",
            score: 8,
            confidence: 85,
            context: "web-worker-injection",
        },
        {
            pattern: /importScripts\s*\(/gi,
            threat: "Worker Script Import",
            score: 8,
            confidence: 80,
            context: "web-worker-injection",
        },
        {
            pattern: /'unsafe-(?:eval|inline)'|'unsafe-hashes'|data:|blob:/gi,
            threat: "CSP Bypass Directive",
            score: 8,
            confidence: 85,
            context: "csp-bypass",
        },
        {
            pattern: /Content-Security-Policy.*(?:'none'|\*)/gi,
            threat: "Weak CSP Configuration",
            score: 7,
            confidence: 80,
            context: "csp-bypass",
        },
    ];
    const startTime = performance.now();
    const highConfidencePatterns = advancedXSSPatterns.filter((p) => p.confidence >= 85);
    for (const { pattern, threat, score, confidence, context, } of highConfidencePatterns) {
        if (pattern.test(input)) {
            console.log(`[XSS-ENGINE] High-confidence threat detected: ${threat} (confidence: ${confidence}%, context: ${context})`);
            threats.push(threat);
            riskScore += score;
            totalConfidence += confidence;
            detectionCount++;
            detectionContext.push(context);
        }
    }
    if (threats.length === 0) {
        const mediumConfidencePatterns = advancedXSSPatterns.filter((p) => p.confidence >= 70 && p.confidence < 85);
        for (const { pattern, threat, score, confidence, context, } of mediumConfidencePatterns) {
            if (pattern.test(input)) {
                console.log(`[XSS-ENGINE] Medium-confidence threat detected: ${threat} (confidence: ${confidence}%, context: ${context})`);
                threats.push(threat);
                riskScore += score * 0.8;
                totalConfidence += confidence;
                detectionCount++;
                detectionContext.push(context);
            }
        }
    }
    if (threats.length === 0 && input.includes("<") && input.includes(">")) {
        const lowConfidencePatterns = advancedXSSPatterns.filter((p) => p.confidence < 70);
        for (const { pattern, threat, score, confidence, context, } of lowConfidencePatterns) {
            if (pattern.test(input)) {
                console.log(`[XSS-ENGINE] Low-confidence threat detected: ${threat} (confidence: ${confidence}%, context: ${context})`);
                threats.push(threat);
                riskScore += score * 0.5;
                totalConfidence += confidence;
                detectionCount++;
                detectionContext.push(context);
            }
        }
    }
    const normalizedRiskScore = Math.min(10, Math.floor(riskScore / 10));
    const averageConfidence = detectionCount > 0 ? Math.round(totalConfidence / detectionCount) : 100;
    let severity;
    if (normalizedRiskScore >= 8 && averageConfidence >= 85) {
        severity = "critical";
    }
    else if (normalizedRiskScore >= 6 && averageConfidence >= 75) {
        severity = "high";
    }
    else if (normalizedRiskScore >= 3 && averageConfidence >= 65) {
        severity = "medium";
    }
    else {
        severity = "low";
    }
    const detectionTime = performance.now() - startTime;
    console.log(`[XSS-ENGINE] Detection completed in ${detectionTime.toFixed(2)}ms - Threats: ${threats.length}, Risk Score: ${normalizedRiskScore}, Severity: ${severity}, Confidence: ${averageConfidence}%`);
    const uniqueContexts = Array.from(new Set(detectionContext));
    const contextualRiskAdjustment = uniqueContexts.length > 3 ? 1.2 : 1.0;
    const adjustedRiskScore = Math.min(10, Math.floor(normalizedRiskScore * contextualRiskAdjustment));
    return {
        hasXSS: threats.length > 0,
        threats,
        riskScore: adjustedRiskScore,
        severity,
        confidence: averageConfidence,
        detectionContext: uniqueContexts,
    };
}
exports.detectAdvancedXSS = detectAdvancedXSS;
function sanitizeContentByContext(input, context, options) {
    if (typeof input !== "string") {
        return { sanitized: "", removed: [], riskScore: 0 };
    }
    const removed = [];
    let sanitized = input;
    const xssAnalysis = detectAdvancedXSS(input);
    if (xssAnalysis.hasXSS) {
        removed.push(...xssAnalysis.threats);
    }
    const contextRules = {
        task_description: {
            allowHtml: false,
            stripHtml: true,
            maxLength: 10000,
            allowedTags: [],
            allowedAttributes: {},
        },
        message_content: {
            allowHtml: false,
            stripHtml: true,
            maxLength: 50000,
            allowedTags: ["b", "i", "em", "strong", "br", "p"],
            allowedAttributes: {},
        },
        search_query: {
            allowHtml: false,
            stripHtml: true,
            maxLength: 500,
            allowedTags: [],
            allowedAttributes: {},
        },
        file_name: {
            allowHtml: false,
            stripHtml: true,
            maxLength: 255,
            allowedTags: [],
            allowedAttributes: {},
        },
        config_data: {
            allowHtml: false,
            stripHtml: true,
            maxLength: 1000,
            allowedTags: [],
            allowedAttributes: {},
        },
        user_input: {
            allowHtml: false,
            stripHtml: true,
            maxLength: 5000,
            allowedTags: [],
            allowedAttributes: {},
        },
    };
    const rules = { ...contextRules[context], ...options };
    const jsdomWindow = new jsdom_1.JSDOM("").window;
    const window = {
        NodeFilter: jsdomWindow.NodeFilter,
        Node: jsdomWindow.Node,
        Element: jsdomWindow.Element,
        HTMLTemplateElement: jsdomWindow.HTMLTemplateElement,
        DocumentFragment: jsdomWindow.DocumentFragment,
        HTMLFormElement: jsdomWindow.HTMLFormElement,
        DOMParser: jsdomWindow.DOMParser,
        NamedNodeMap: jsdomWindow.NamedNodeMap,
        document: jsdomWindow.document,
    };
    const purifyConstructor = DOMPurify.default || DOMPurify;
    const _purify = purifyConstructor(window);
    if (rules.stripHtml || !rules.allowHtml) {
        sanitized = sanitized.replace(/<[^>]*>/g, "");
        if (/<[^>]*>/.test(input)) {
            removed.push("HTML Tags Stripped");
        }
    }
    else if (rules.allowHtml) {
        let config;
        switch (context) {
            case "message_content":
                config = exports.ENHANCED_DOMPURIFY_CONFIGS.MODERATE;
                break;
            case "task_description":
                config = exports.ENHANCED_DOMPURIFY_CONFIGS.STRICT;
                break;
            default:
                config = exports.ENHANCED_DOMPURIFY_CONFIGS.ULTRA_STRICT;
        }
        const originalLength = sanitized.length;
        sanitized = getPurify().sanitize(sanitized, config);
        if (sanitized.length < originalLength) {
            removed.push("Dangerous HTML Sanitized");
        }
    }
    if (rules.maxLength && sanitized.length > rules.maxLength) {
        sanitized = sanitized.substring(0, rules.maxLength);
        removed.push(`Content Truncated (max: ${rules.maxLength})`);
    }
    const originalSanitized = sanitized;
    sanitized = sanitized
        .replace(/javascript\s*:/gi, "")
        .replace(/vbscript\s*:/gi, "")
        .replace(/on\w+\s*=/gi, "")
        .replace(/expression\s*\(/gi, "")
        .replace(/\{\{.*?\}\}/g, "")
        .replace(/\$\{.*?\}/g, "")
        .replace(/<!--\s*#(?:include|exec|echo).*?-->/gi, "")
        .replace(/<\?xml[\s\S]*?\?>/gi, "")
        .replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, "")
        .replace(/data:(?!image\/(?:png|jpg|jpeg|gif|svg\+xml);base64,)[^;]*;base64,[a-zA-Z0-9+/=]*/gi, "")
        .replace(/[()\\*]/g, "")
        .replace(/[;&|`${}]/g, "")
        .replace(/\.{2,}[/\\\\]/g, "")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    if (originalSanitized !== sanitized) {
        removed.push("Dangerous Patterns Removed");
    }
    return {
        sanitized,
        removed,
        riskScore: xssAnalysis.riskScore,
    };
}
exports.sanitizeContentByContext = sanitizeContentByContext;
function scanFileContent(content, fileName, mimeType) {
    const threats = [];
    let riskScore = 0;
    const contentStr = Buffer.isBuffer(content)
        ? content.toString("utf8")
        : content;
    const fileSize = Buffer.isBuffer(content)
        ? content.length
        : Buffer.byteLength(contentStr, "utf8");
    if (fileSize > 10 * 1024 * 1024) {
        threats.push("File Too Large");
        riskScore += 8;
    }
    if (fileName) {
        const dangerousExtensions = [
            ".exe",
            ".bat",
            ".cmd",
            ".com",
            ".pif",
            ".scr",
            ".vbs",
            ".vbe",
            ".js",
            ".jse",
            ".ws",
            ".wsf",
            ".wsc",
            ".wsh",
            ".ps1",
            ".ps1xml",
            ".ps2",
            ".ps2xml",
            ".psc1",
            ".psc2",
            ".msh",
            ".msh1",
            ".msh2",
            ".mshxml",
            ".msh1xml",
            ".msh2xml",
            ".scf",
            ".lnk",
            ".inf",
            ".reg",
            ".doc",
            ".xls",
            ".ppt",
            ".docm",
            ".xlsm",
            ".pptm",
            ".jar",
            ".class",
            ".war",
            ".ear",
            ".php",
            ".asp",
            ".aspx",
            ".jsp",
            ".py",
            ".rb",
            ".pl",
            ".sh",
            ".bash",
            ".zsh",
            ".fish",
        ];
        const fileExt = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
        if (dangerousExtensions.includes(fileExt)) {
            threats.push(`Dangerous File Extension: ${fileExt}`);
            riskScore += 9;
        }
    }
    const executableSignatures = [
        { pattern: /^MZ/, name: "Windows PE Executable", risk: 10 },
        { pattern: /^\x7fELF/, name: "Linux ELF Executable", risk: 10 },
        { pattern: /^\xca\xfe\xba\xbe/, name: "Java Class File", risk: 8 },
        { pattern: /^PK\x03\x04.*\.jar$/i, name: "JAR Archive", risk: 7 },
        { pattern: /^#!/, name: "Shell Script", risk: 8 },
        { pattern: /^\xff\xfb/, name: "MP3 with potential payload", risk: 3 },
        { pattern: /^\x89PNG/, name: "PNG with potential payload", risk: 2 },
    ];
    for (const { pattern, name, risk } of executableSignatures) {
        if (pattern.test(contentStr)) {
            threats.push(name);
            riskScore += risk;
        }
    }
    const scriptPatterns = [
        { pattern: /<\?php/gi, name: "PHP Code", risk: 9 },
        { pattern: /<script[^>]*>/gi, name: "JavaScript Code", risk: 8 },
        { pattern: /<%[^>]*%>/gi, name: "ASP Code", risk: 8 },
        { pattern: /\${.*}/gi, name: "Template Injection", risk: 7 },
        { pattern: /eval\s*\(/gi, name: "Eval Function", risk: 9 },
        { pattern: /exec\s*\(/gi, name: "Exec Function", risk: 9 },
        { pattern: /system\s*\(/gi, name: "System Function", risk: 9 },
        { pattern: /passthru\s*\(/gi, name: "Passthru Function", risk: 9 },
        { pattern: /shell_exec\s*\(/gi, name: "Shell Exec Function", risk: 9 },
        { pattern: /base64_decode\s*\(/gi, name: "Base64 Decode", risk: 6 },
        { pattern: /document\.cookie/gi, name: "Cookie Access", risk: 5 },
        { pattern: /window\.location/gi, name: "Location Manipulation", risk: 5 },
    ];
    for (const { pattern, name, risk } of scriptPatterns) {
        if (pattern.test(contentStr)) {
            threats.push(name);
            riskScore += risk;
        }
    }
    const xssAnalysis = detectAdvancedXSS(contentStr);
    if (xssAnalysis.hasXSS) {
        threats.push(...xssAnalysis.threats.map((t) => `XSS: ${t}`));
        riskScore += xssAnalysis.riskScore;
    }
    if (detectSQLInjection(contentStr)) {
        threats.push("SQL Injection Patterns");
        riskScore += 7;
    }
    const malwarePatterns = [
        { pattern: /CreateObject\s*\(/gi, name: "COM Object Creation", risk: 7 },
        { pattern: /WScript\.Shell/gi, name: "WScript Shell", risk: 8 },
        { pattern: /cmd\.exe/gi, name: "Command Prompt Access", risk: 7 },
        { pattern: /powershell/gi, name: "PowerShell Access", risk: 7 },
        { pattern: /wget|curl/gi, name: "Network Download Tools", risk: 6 },
        { pattern: /nc\s|netcat/gi, name: "Network Tools", risk: 6 },
    ];
    for (const { pattern, name, risk } of malwarePatterns) {
        if (pattern.test(contentStr)) {
            threats.push(name);
            riskScore += risk;
        }
    }
    const metadata = {
        fileSize,
    };
    if (mimeType !== undefined) {
        metadata.contentType = mimeType;
    }
    const encoding = Buffer.isBuffer(content) ? "binary" : "utf8";
    if (encoding !== undefined) {
        metadata.encoding = encoding;
    }
    return {
        isSafe: threats.length === 0,
        threats,
        riskScore: Math.min(10, Math.floor(riskScore / 10)),
        metadata,
    };
}
exports.scanFileContent = scanFileContent;
function generateCSPHeader(context) {
    const baseCSP = {
        "default-src": "'self'",
        "script-src": "'self'",
        "style-src": "'self' 'unsafe-inline'",
        "img-src": "'self' data: https:",
        "font-src": "'self'",
        "connect-src": "'self'",
        "frame-src": "'none'",
        "object-src": "'none'",
        "base-uri": "'self'",
        "form-action": "'self'",
        "frame-ancestors": "'none'",
        "block-all-mixed-content": "",
        "upgrade-insecure-requests": "",
    };
    const contextCSP = {
        api: {
            ...baseCSP,
            "script-src": "'none'",
            "style-src": "'none'",
            "img-src": "'none'",
        },
        ui: {
            ...baseCSP,
            "script-src": "'self' 'unsafe-eval'",
            "style-src": "'self' 'unsafe-inline'",
            "img-src": "'self' data: https:",
        },
        admin: {
            ...baseCSP,
            "script-src": "'self' 'nonce-{nonce}'",
            "style-src": "'self' 'nonce-{nonce}'",
            "img-src": "'self' data:",
        },
    };
    const csp = contextCSP[context];
    return Object.entries(csp)
        .map(([directive, sources]) => `${directive} ${sources}`)
        .join("; ");
}
exports.generateCSPHeader = generateCSPHeader;
exports.default = {
    hashPassword,
    verifyPassword,
    validatePassword,
    generateSecurePassword,
    DEFAULT_PASSWORD_POLICY: exports.DEFAULT_PASSWORD_POLICY,
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
    sanitizeInput,
    sanitizeObject,
    detectXSS,
    detectSQLInjection,
    detectSQLInjectionLegacy,
    detectCommandInjection,
    DEFAULT_SANITIZATION_OPTIONS: exports.DEFAULT_SANITIZATION_OPTIONS,
    detectAdvancedXSS,
    sanitizeContentByContext,
    scanFileContent,
    generateCSPHeader,
    ENHANCED_DOMPURIFY_CONFIGS: exports.ENHANCED_DOMPURIFY_CONFIGS,
    hasPermission,
    hasRole,
    ROLE_PERMISSIONS: exports.ROLE_PERMISSIONS,
    generateEventId,
    calculateRiskScore,
    createSecurityEvent,
    DEFAULT_RATE_LIMITS: exports.DEFAULT_RATE_LIMITS,
    generateRateLimitKey,
    getRateLimitConfig,
    getAllRateLimitConfigs,
    generateRandomString,
    generateHMAC,
    verifyHMAC,
    hashData,
    detectMaliciousFileContent,
    validateFilePath,
    validateCoordinates,
    detectPathTraversal,
    detectCommandInjectionAdvanced,
    detectTemplateInjection,
    detectLDAPInjection,
    detectXMLInjection,
    detectNoSQLInjection,
    detectComprehensiveMaliciousPatterns,
};
function detectPathTraversal(input) {
    const threats = [];
    let riskScore = 0;
    PATH_TRAVERSAL_PATTERNS.forEach((pattern) => {
        const matches = input.match(pattern);
        if (matches) {
            threats.push({
                type: "Path Traversal",
                pattern: matches[0],
                severity: 8,
                confidence: 90,
            });
            riskScore += 8;
        }
    });
    return {
        isDetected: threats.length > 0,
        threats,
        riskScore: Math.min(riskScore, 10),
    };
}
exports.detectPathTraversal = detectPathTraversal;
function detectCommandInjectionAdvanced(input) {
    const threats = [];
    let riskScore = 0;
    COMMAND_INJECTION_PATTERNS.forEach((pattern, index) => {
        const matches = input.match(pattern);
        if (matches) {
            const severity = index < 2 ? 9 : index < 5 ? 8 : 7;
            const platform = index < 2 ? "unix" : index < 5 ? "windows" : "multi";
            threats.push({
                type: "Command Injection",
                pattern: matches[0],
                severity,
                confidence: 85,
                platform,
            });
            riskScore += severity;
        }
    });
    return {
        isDetected: threats.length > 0,
        threats,
        riskScore: Math.min(riskScore, 10),
    };
}
exports.detectCommandInjectionAdvanced = detectCommandInjectionAdvanced;
function detectTemplateInjection(input) {
    const threats = [];
    let riskScore = 0;
    const jinja2Patterns = TEMPLATE_INJECTION_PATTERNS.slice(0, 2);
    jinja2Patterns.forEach((pattern) => {
        const matches = input.match(pattern);
        if (matches) {
            threats.push({
                type: "Template Injection",
                engine: "Jinja2/Twig",
                pattern: matches[0],
                severity: 9,
                confidence: 90,
            });
            riskScore += 9;
        }
    });
    TEMPLATE_INJECTION_PATTERNS.slice(2).forEach((pattern, index) => {
        const matches = input.match(pattern);
        if (matches) {
            const engines = ["Freemarker", "Smarty", "Velocity", "Django"];
            threats.push({
                type: "Template Injection",
                engine: engines[index] || "Unknown",
                pattern: matches[0],
                severity: 8,
                confidence: 80,
            });
            riskScore += 8;
        }
    });
    return {
        isDetected: threats.length > 0,
        threats,
        riskScore: Math.min(riskScore, 10),
    };
}
exports.detectTemplateInjection = detectTemplateInjection;
function detectLDAPInjection(input) {
    const threats = [];
    let riskScore = 0;
    LDAP_INJECTION_PATTERNS.forEach((pattern) => {
        const matches = input.match(pattern);
        if (matches) {
            threats.push({
                type: "LDAP Injection",
                pattern: matches[0],
                severity: 7,
                confidence: 80,
            });
            riskScore += 7;
        }
    });
    return {
        isDetected: threats.length > 0,
        threats,
        riskScore: Math.min(riskScore, 10),
    };
}
exports.detectLDAPInjection = detectLDAPInjection;
function detectXMLInjection(input) {
    const threats = [];
    let riskScore = 0;
    XML_INJECTION_PATTERNS.forEach((pattern, index) => {
        const matches = input.match(pattern);
        if (matches) {
            const severity = index < 2 ? 10 : index < 4 ? 8 : 6;
            threats.push({
                type: index < 2 ? "XXE Injection" : "XML Injection",
                pattern: matches[0],
                severity,
                confidence: 85,
            });
            riskScore += severity;
        }
    });
    return {
        isDetected: threats.length > 0,
        threats,
        riskScore: Math.min(riskScore, 10),
    };
}
exports.detectXMLInjection = detectXMLInjection;
function detectNoSQLInjection(input) {
    const threats = [];
    let riskScore = 0;
    NOSQL_INJECTION_PATTERNS.forEach((pattern, index) => {
        const matches = input.match(pattern);
        if (matches) {
            const database = index < 1 ? "MongoDB" : "Generic NoSQL";
            threats.push({
                type: "NoSQL Injection",
                pattern: matches[0],
                severity: 8,
                confidence: 85,
                database,
            });
            riskScore += 8;
        }
    });
    return {
        isDetected: threats.length > 0,
        threats,
        riskScore: Math.min(riskScore, 10),
    };
}
exports.detectNoSQLInjection = detectNoSQLInjection;
function detectComprehensiveMaliciousPatterns(input) {
    const threatCategories = {
        xss: detectAdvancedXSS(input),
        sqlInjection: detectSQLInjection(input),
        pathTraversal: detectPathTraversal(input),
        commandInjection: detectCommandInjectionAdvanced(input),
        templateInjection: detectTemplateInjection(input),
        ldapInjection: detectLDAPInjection(input),
        xmlInjection: detectXMLInjection(input),
        nosqlInjection: detectNoSQLInjection(input),
    };
    const totalRiskScore = Object.values(threatCategories).reduce((sum, threat) => sum + (threat.riskScore || 0), 0);
    const isDetected = Object.values(threatCategories).some((threat) => {
        const t = threat;
        return t.isDetected || t.hasXSS || t.hasInjection || t.detected;
    });
    const recommendations = [];
    if (threatCategories.xss.hasXSS) {
        recommendations.push("Apply XSS sanitization with DOMPurify");
        recommendations.push("Implement Content Security Policy (CSP)");
    }
    if (threatCategories.sqlInjection.hasInjection) {
        recommendations.push("Use parameterized queries/prepared statements");
        recommendations.push("Apply input validation and sanitization");
    }
    if (threatCategories.pathTraversal.detected ||
        threatCategories.pathTraversal.isDetected) {
        recommendations.push("Validate and normalize file paths");
        recommendations.push("Use allow-lists for permitted directories");
    }
    if (threatCategories.commandInjection.isDetected) {
        recommendations.push("Avoid direct shell command execution");
        recommendations.push("Use safe APIs for system operations");
    }
    if (threatCategories.templateInjection.isDetected) {
        recommendations.push("Use sandboxed template engines");
        recommendations.push("Validate template input strictly");
    }
    if (totalRiskScore > 15) {
        recommendations.push("CRITICAL: Block request immediately");
        recommendations.push("Log security incident for investigation");
    }
    else if (totalRiskScore > 8) {
        recommendations.push("HIGH RISK: Apply strict sanitization");
        recommendations.push("Monitor user activity closely");
    }
    return {
        isDetected,
        totalRiskScore: Math.min(totalRiskScore, 100),
        threatCategories,
        recommendations,
    };
}
exports.detectComprehensiveMaliciousPatterns = detectComprehensiveMaliciousPatterns;
var security_types_2 = require("../types/security.types");
Object.defineProperty(exports, "SecurityEventType", { enumerable: true, get: function () { return security_types_2.SecurityEventType; } });
Object.defineProperty(exports, "RateLimitServiceType", { enumerable: true, get: function () { return security_types_2.RateLimitServiceType; } });
//# sourceMappingURL=security.utils.js.map