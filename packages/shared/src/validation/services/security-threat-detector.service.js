"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SecurityThreatDetector_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityThreatDetector = void 0;
const common_1 = require("@nestjs/common");
const security_utils_1 = require("../../utils/security.utils");
const validation_standardized_1 = require("../../pipes/validation.standardized");
const ENTERPRISE_THREAT_PATTERNS = {
    XSS_PATTERNS: [
        /(?:javascript|jscript|ecmascript|livescript):[^;\s]*/gi,
        /on(?:load|error|click|focus|blur|change|submit|reset|select|resize|scroll)[^=]*=[\s'"]*[^>'"]*/gi,
        /(?:document|window|navigator|location|history)\.(?:write|writeln|open|close|cookie|domain)/gi,
        /<[^>]+(?:style|href|src|action|formaction|background|poster|code|codebase)\s*=\s*['"]*javascript:/gi,
        /<svg[^>]*>[\s\S]*?<(?:script|use|image|foreignObject)[^>]*>[\s\S]*?<\/svg>/gi,
        /expression\s*\([\s\S]*?\)|url\s*\(\s*(?:javascript|vbscript|data:text\/html)/gi,
    ],
    SQL_INJECTION_PATTERNS: [
        /(?:union|select|insert|update|delete|drop|create|alter|truncate|replace)[\s/*]*(?:\+|\|\||chr\(|char\(|ascii\(|length\(|substring\()/gi,
        /(?:and|or)[\s/*]*(?:1\s*=\s*1|1\s*=\s*0|true|false)[\s/*]*(?:and|or|--|#)/gi,
        /(?:waitfor|delay|sleep|benchmark)\s*\([\d\s,]*\)/gi,
        /(?:information_schema|sys\.tables|pg_tables|sqlite_master|msysaccessobjects)\.[\w\s]*/gi,
        /(?:--[\s\r\n]|\/\*[\s\S]*?\*\/|#[\s\r\n]|;[\s]*(?:drop|delete|truncate|update))/gi,
    ],
    COMMAND_INJECTION_PATTERNS: [
        /[;&|`${}][\s]*(?:cat|ls|dir|type|rm|del|mkdir|rmdir|touch|chmod|chown|ps|kill|whoami|id|uname|pwd|cd|echo|wget|curl|nc|netcat|bash|sh|cmd|powershell)/gi,
        /(?:\.\.\/|\.\.\\)+[\s]*(?:etc\/passwd|windows\/system32|proc\/self|dev\/null)/gi,
        /(?:\/proc\/|\/sys\/|\/dev\/|c:\\windows\\|%systemroot%)/gi,
    ],
    TEMPLATE_INJECTION_PATTERNS: [
        /\{\{[\s\S]*?(?:config|self|request|session|global|__globals__|__builtins__)[\s\S]*?\}\}/gi,
        /\$\{[\s\S]*?(?:java\.lang|System\.|Runtime\.|ProcessBuilder|Class\.forName)[\s\S]*?\}/gi,
        /{[%{][\s\S]*?(?:system|exec|eval|file_get_contents|include|require)[\s\S]*?[%}]}/gi,
    ],
    LDAP_INJECTION_PATTERNS: [/[*()\\/]|(?:\)\(|&\(|\|\()/gi],
    XML_XXE_PATTERNS: [
        /<!(?:DOCTYPE|ENTITY)[\s\S]*?(?:SYSTEM|PUBLIC)[\s\S]*?>/gi,
        /<\?xml[\s\S]*?encoding[\s]*=[\s]*["'][^"']*["'][\s\S]*?\?>/gi,
    ],
    NOSQL_INJECTION_PATTERNS: [
        /\$(?:where|ne|gt|lt|gte|lte|in|nin|regex|exists|type|size|all|elemMatch)/gi,
    ],
    DESERIALIZATION_PATTERNS: [
        /(?:rO0AB|aced00|java\.lang\.Runtime|java\.io\.ObjectInputStream|pickle\.loads|__reduce__|eval\(|exec\()/gi,
    ],
};
var ThreatSeverity;
(function (ThreatSeverity) {
    ThreatSeverity["LOW"] = "low";
    ThreatSeverity["MEDIUM"] = "medium";
    ThreatSeverity["HIGH"] = "high";
    ThreatSeverity["CRITICAL"] = "critical";
})(ThreatSeverity || (ThreatSeverity = {}));
let SecurityThreatDetector = SecurityThreatDetector_1 = class SecurityThreatDetector {
    logger = new common_1.Logger(SecurityThreatDetector_1.name);
    analyzeThreat(value, context) {
        const analysisId = (0, security_utils_1.generateEventId)();
        const startTime = Date.now();
        this.logger.debug(`Starting threat analysis: ${analysisId}`, {
            analysisId,
            serviceType: context.serviceType,
            operationId: context.operationId,
        });
        try {
            const threats = [];
            const inputString = this.convertToAnalyzableString(value);
            const basicThreats = this.detectBasicThreats(inputString);
            threats.push(...basicThreats);
            const advancedThreats = this.detectAdvancedThreats(inputString);
            threats.push(...advancedThreats);
            const contextualThreats = this.detectContextualThreats(inputString, context);
            threats.push(...contextualThreats);
            const riskScore = this.calculateOverallRiskScore(threats);
            const isHighRisk = riskScore >= 70 ||
                threats.some((t) => t.severity === ThreatSeverity.CRITICAL);
            const analysisDurationMs = Date.now() - startTime;
            const result = {
                analysisId,
                isHighRisk,
                riskScore,
                threatTypes: Array.from(new Set(threats.map((t) => t.type))),
                threatDetails: threats.map((threat) => ({
                    pattern: threat.pattern,
                    location: threat.location,
                    severity: threat.severity,
                    confidence: threat.confidence,
                    description: threat.description,
                })),
                metadata: {
                    serviceType: context.serviceType,
                    environment: context.environment,
                    operationId: context.operationId,
                    timestamp: new Date(),
                    analysisDurationMs,
                },
            };
            this.logger.debug(`Threat analysis completed: ${analysisId}`, {
                analysisId,
                isHighRisk,
                riskScore,
                threatCount: threats.length,
                analysisDurationMs,
            });
            return result;
        }
        catch (err) {
            const analysisDurationMs = Date.now() - startTime;
            this.logger.error(`Threat analysis failed: ${analysisId}`, {
                analysisId,
                error: err.message,
                analysisDurationMs,
            });
            return {
                analysisId,
                isHighRisk: true,
                riskScore: 100,
                threatTypes: ["ANALYSIS_FAILURE"],
                threatDetails: [
                    {
                        severity: ThreatSeverity.CRITICAL,
                        confidence: 1.0,
                        description: `Threat analysis failed: ${err.message}`,
                    },
                ],
                metadata: {
                    serviceType: context.serviceType,
                    environment: context.environment,
                    operationId: context.operationId,
                    timestamp: new Date(),
                    analysisDurationMs,
                },
            };
        }
    }
    convertToAnalyzableString(value) {
        if (typeof value === "string") {
            return value;
        }
        if (value === null || value === undefined) {
            return "";
        }
        try {
            return JSON.stringify(value);
        }
        catch (err) {
            this.logger.warn("Failed to stringify input for analysis", {
                error: err.message,
                valueType: typeof value,
            });
            if (typeof value === "object" && value !== null) {
                return "[object Object]";
            }
            if (value === null || value === undefined) {
                return "";
            }
            if (typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean") {
                return String(value);
            }
            return "[object Object]";
        }
    }
    detectBasicThreats(input) {
        const threats = [];
        if ((0, security_utils_1.detectXSS)(input)) {
            threats.push({
                type: "XSS",
                severity: ThreatSeverity.HIGH,
                confidence: 0.85,
                description: "Cross-Site Scripting (XSS) attack patterns detected",
            });
        }
        if ((0, security_utils_1.detectSQLInjection)(input)) {
            threats.push({
                type: "SQL_INJECTION",
                severity: ThreatSeverity.CRITICAL,
                confidence: 0.9,
                description: "SQL injection attack patterns detected",
            });
        }
        if ((0, security_utils_1.detectMaliciousFileContent)(input)) {
            threats.push({
                type: "MALICIOUS_FILE",
                severity: ThreatSeverity.HIGH,
                confidence: 0.8,
                description: "Malicious file content or executable patterns detected",
            });
        }
        return threats;
    }
    detectAdvancedThreats(input) {
        const threats = [];
        for (const pattern of ENTERPRISE_THREAT_PATTERNS.XSS_PATTERNS) {
            const matches = input.match(pattern);
            if (matches) {
                threats.push({
                    type: "ADVANCED_XSS",
                    pattern: pattern.source,
                    severity: ThreatSeverity.HIGH,
                    confidence: 0.75,
                    description: `Advanced XSS pattern detected: ${matches[0].substring(0, 50)}...`,
                });
            }
        }
        for (const pattern of ENTERPRISE_THREAT_PATTERNS.SQL_INJECTION_PATTERNS) {
            const matches = input.match(pattern);
            if (matches) {
                threats.push({
                    type: "ADVANCED_SQL_INJECTION",
                    pattern: pattern.source,
                    severity: ThreatSeverity.CRITICAL,
                    confidence: 0.85,
                    description: `Advanced SQL injection pattern detected: ${matches[0].substring(0, 50)}...`,
                });
            }
        }
        for (const pattern of ENTERPRISE_THREAT_PATTERNS.COMMAND_INJECTION_PATTERNS) {
            const matches = input.match(pattern);
            if (matches) {
                threats.push({
                    type: "COMMAND_INJECTION",
                    pattern: pattern.source,
                    severity: ThreatSeverity.CRITICAL,
                    confidence: 0.8,
                    description: `Command injection pattern detected: ${matches[0].substring(0, 50)}...`,
                });
            }
        }
        for (const pattern of ENTERPRISE_THREAT_PATTERNS.TEMPLATE_INJECTION_PATTERNS) {
            const matches = input.match(pattern);
            if (matches) {
                threats.push({
                    type: "TEMPLATE_INJECTION",
                    pattern: pattern.source,
                    severity: ThreatSeverity.HIGH,
                    confidence: 0.75,
                    description: `Template injection pattern detected: ${matches[0].substring(0, 50)}...`,
                });
            }
        }
        for (const pattern of ENTERPRISE_THREAT_PATTERNS.LDAP_INJECTION_PATTERNS) {
            const matches = input.match(pattern);
            if (matches) {
                threats.push({
                    type: "LDAP_INJECTION",
                    pattern: pattern.source,
                    severity: ThreatSeverity.MEDIUM,
                    confidence: 0.7,
                    description: `LDAP injection pattern detected: ${matches[0].substring(0, 50)}...`,
                });
            }
        }
        for (const pattern of ENTERPRISE_THREAT_PATTERNS.XML_XXE_PATTERNS) {
            const matches = input.match(pattern);
            if (matches) {
                threats.push({
                    type: "XML_XXE",
                    pattern: pattern.source,
                    severity: ThreatSeverity.HIGH,
                    confidence: 0.85,
                    description: `XML External Entity (XXE) pattern detected: ${matches[0].substring(0, 50)}...`,
                });
            }
        }
        for (const pattern of ENTERPRISE_THREAT_PATTERNS.NOSQL_INJECTION_PATTERNS) {
            const matches = input.match(pattern);
            if (matches) {
                threats.push({
                    type: "NOSQL_INJECTION",
                    pattern: pattern.source,
                    severity: ThreatSeverity.HIGH,
                    confidence: 0.8,
                    description: `NoSQL injection pattern detected: ${matches[0].substring(0, 50)}...`,
                });
            }
        }
        for (const pattern of ENTERPRISE_THREAT_PATTERNS.DESERIALIZATION_PATTERNS) {
            const matches = input.match(pattern);
            if (matches) {
                threats.push({
                    type: "DESERIALIZATION_ATTACK",
                    pattern: pattern.source,
                    severity: ThreatSeverity.CRITICAL,
                    confidence: 0.9,
                    description: `Deserialization attack pattern detected: ${matches[0].substring(0, 50)}...`,
                });
            }
        }
        return threats;
    }
    detectContextualThreats(input, context) {
        const threats = [];
        switch (context.serviceType) {
            case validation_standardized_1.ValidationServiceType._BYTEBOTD:
                if (/(?:shutdown|reboot|halt|poweroff|kill|pkill|killall)/gi.test(input)) {
                    threats.push({
                        type: "SYSTEM_CONTROL_ABUSE",
                        severity: ThreatSeverity.CRITICAL,
                        confidence: 0.95,
                        description: "System control commands detected in computer-use context",
                    });
                }
                break;
            case validation_standardized_1.ValidationServiceType._BYTEBOT_AGENT:
                if (/(?:__proto__|constructor\.prototype|Object\.prototype)/gi.test(input)) {
                    threats.push({
                        type: "PROTOTYPE_POLLUTION",
                        severity: ThreatSeverity.HIGH,
                        confidence: 0.8,
                        description: "Prototype pollution attempt detected in task management context",
                    });
                }
                break;
            case validation_standardized_1.ValidationServiceType._BYTEBOT_UI:
                if (/(?:postMessage|origin|parent\.)/gi.test(input)) {
                    threats.push({
                        type: "CROSS_FRAME_ATTACK",
                        severity: ThreatSeverity.MEDIUM,
                        confidence: 0.7,
                        description: "Cross-frame communication abuse detected in UI context",
                    });
                }
                break;
        }
        if (context.environment === "production") {
            if (/(?:debug|test|development|dev|staging)/gi.test(input)) {
                threats.push({
                    type: "ENVIRONMENT_PROBE",
                    severity: ThreatSeverity.MEDIUM,
                    confidence: 0.6,
                    description: "Environment probing attempt detected in production",
                });
            }
        }
        return threats;
    }
    calculateOverallRiskScore(threats) {
        if (threats.length === 0) {
            return 0;
        }
        const severityWeights = {
            [ThreatSeverity.LOW]: 10,
            [ThreatSeverity.MEDIUM]: 25,
            [ThreatSeverity.HIGH]: 50,
            [ThreatSeverity.CRITICAL]: 100,
        };
        let totalScore = 0;
        let maxScore = 0;
        for (const threat of threats) {
            const baseScore = severityWeights[threat.severity];
            const weightedScore = baseScore * threat.confidence;
            totalScore += weightedScore;
            maxScore = Math.max(maxScore, weightedScore);
        }
        const averageScore = totalScore / threats.length;
        const combinedScore = Math.max(averageScore, maxScore * 0.8);
        return Math.min(100, Math.round(combinedScore));
    }
};
exports.SecurityThreatDetector = SecurityThreatDetector;
exports.SecurityThreatDetector = SecurityThreatDetector = SecurityThreatDetector_1 = __decorate([
    (0, common_1.Injectable)()
], SecurityThreatDetector);
exports.default = SecurityThreatDetector;
//# sourceMappingURL=security-threat-detector.service.js.map