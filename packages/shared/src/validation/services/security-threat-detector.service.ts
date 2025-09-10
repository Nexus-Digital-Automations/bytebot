/**
 * Security Threat Detector Service
 *
 * Advanced threat detection system for identifying and analyzing potential
 * security threats in user input across all Bytebot services.
 *
 * Features:
 * - Real-time threat pattern matching
 * - AI-powered threat analysis
 * - Risk scoring and classification
 * - Custom threat pattern support
 * - Performance-optimized detection
 *
 * @fileoverview Security threat detection service
 * @version 1.0.0
 * @author Enterprise Security Validation Team
 */

import { Injectable, Logger } from "@nestjs/common";
import {
  detectXSS,
  detectSQLInjection,
  detectMaliciousFileContent,
  generateEventId,
} from "../../utils/security.utils";
import { ThreatAnalysisResult, SecurityThreatContext } from "./types";
import { ValidationServiceType } from "../../pipes/validation.standardized";

/**
 * Advanced threat patterns for enterprise security
 */
const ENTERPRISE_THREAT_PATTERNS = {
  // Advanced XSS patterns
  XSS_PATTERNS: [
    // JavaScript protocol variations
    /(?:javascript|jscript|ecmascript|livescript):[^;\s]*/gi,
    // Event handler variations
    /on(?:load|error|click|focus|blur|change|submit|reset|select|resize|scroll)[^=]*=[\s'"]*[^>'"]*/gi,
    // DOM manipulation patterns
    /(?:document|window|navigator|location|history)\.(?:write|writeln|open|close|cookie|domain)/gi,
    // Script injection via attributes
    /<[^>]+(?:style|href|src|action|formaction|background|poster|code|codebase)\s*=\s*['"]*javascript:/gi,
    // SVG-based XSS
    /<svg[^>]*>[\s\S]*?<(?:script|use|image|foreignObject)[^>]*>[\s\S]*?<\/svg>/gi,
    // CSS expression attacks
    /expression\s*\([\s\S]*?\)|url\s*\(\s*(?:javascript|vbscript|data:text\/html)/gi,
  ],

  // Advanced SQL injection patterns
  SQL_INJECTION_PATTERNS: [
    // Union-based attacks with encoding
    /(?:union|select|insert|update|delete|drop|create|alter|truncate|replace)[\s/*]*(?:\+|\|\||chr\(|char\(|ascii\(|length\(|substring\()/gi,
    // Blind SQL injection patterns
    /(?:and|or)[\s/*]*(?:1\s*=\s*1|1\s*=\s*0|true|false)[\s/*]*(?:and|or|--|#)/gi,
    // Time-based blind attacks
    /(?:waitfor|delay|sleep|benchmark)\s*\([\d\s,]*\)/gi,
    // Database function exploitation
    /(?:information_schema|sys\.tables|pg_tables|sqlite_master|msysaccessobjects)\.[\w\s]*/gi,
    // SQL comment variations
    /(?:--[\s\r\n]|\/\*[\s\S]*?\*\/|#[\s\r\n]|;[\s]*(?:drop|delete|truncate|update))/gi,
  ],

  // Command injection patterns
  COMMAND_INJECTION_PATTERNS: [
    // Shell command separators
    /[;&|`${}][\s]*(?:cat|ls|dir|type|rm|del|mkdir|rmdir|touch|chmod|chown|ps|kill|whoami|id|uname|pwd|cd|echo|wget|curl|nc|netcat|bash|sh|cmd|powershell)/gi,
    // Path traversal with commands
    /(?:\.\.\/|\.\.\\)+[\s]*(?:etc\/passwd|windows\/system32|proc\/self|dev\/null)/gi,
    // System information gathering
    /(?:\/proc\/|\/sys\/|\/dev\/|c:\\windows\\|%systemroot%)/gi,
  ],

  // Template injection patterns
  TEMPLATE_INJECTION_PATTERNS: [
    // Server-side template injection
    /\{\{[\s\S]*?(?:config|self|request|session|global|__globals__|__builtins__)[\s\S]*?\}\}/gi,
    // Expression language injection
    /\$\{[\s\S]*?(?:java\.lang|System\.|Runtime\.|ProcessBuilder|Class\.forName)[\s\S]*?\}/gi,
    // Twig/Smarty template injection
    /{[%{][\s\S]*?(?:system|exec|eval|file_get_contents|include|require)[\s\S]*?[%}]}/gi,
  ],

  // LDAP injection patterns
  LDAP_INJECTION_PATTERNS: [/[*()\\/]|(?:\)\(|&\(|\|\()/gi],

  // XML/XXE patterns
  XML_XXE_PATTERNS: [
    /<!(?:DOCTYPE|ENTITY)[\s\S]*?(?:SYSTEM|PUBLIC)[\s\S]*?>/gi,
    /<\?xml[\s\S]*?encoding[\s]*=[\s]*["'][^"']*["'][\s\S]*?\?>/gi,
  ],

  // NoSQL injection patterns
  NOSQL_INJECTION_PATTERNS: [
    /\$(?:where|ne|gt|lt|gte|lte|in|nin|regex|exists|type|size|all|elemMatch)/gi,
  ],

  // Deserialization attack patterns
  DESERIALIZATION_PATTERNS: [
    /(?:rO0AB|aced00|java\.lang\.Runtime|java\.io\.ObjectInputStream|pickle\.loads|__reduce__|eval\(|exec\()/gi,
  ],
};

/**
 * Threat severity levels
 */
/* eslint-disable no-unused-vars */
enum ThreatSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}
/* eslint-enable no-unused-vars */

/**
 * Security Threat Detector Service
 * Provides comprehensive threat detection and analysis capabilities
 */
@Injectable()
export class SecurityThreatDetector {
  private readonly logger = new Logger(SecurityThreatDetector.name);

  /**
   * Analyze input for potential security threats
   * @param value Input value to analyze
   * @param context Security context for analysis
   * @returns Comprehensive threat analysis result
   */
  analyzeThreat(
    value: unknown,
    context: SecurityThreatContext,
  ): ThreatAnalysisResult {
    const analysisId = generateEventId();
    const startTime = Date.now();

    this.logger.debug(`Starting threat analysis: ${analysisId}`, {
      analysisId,
      serviceType: context.serviceType,
      operationId: context.operationId,
    });

    try {
      const threats: Array<{
        type: string;
        pattern?: string;
        location?: string;
        severity: ThreatSeverity;
        confidence: number;
        description: string;
      }> = [];

      // Convert input to analyzable string
      const inputString = this.convertToAnalyzableString(value);

      // Perform basic threat detection
      const basicThreats = this.detectBasicThreats(inputString);
      threats.push(...basicThreats);

      // Perform advanced pattern matching
      const advancedThreats = this.detectAdvancedThreats(inputString);
      threats.push(...advancedThreats);

      // Perform context-aware analysis
      const contextualThreats = this.detectContextualThreats(
        inputString,
        context,
      );
      threats.push(...contextualThreats);

      // Calculate overall risk score
      const riskScore = this.calculateOverallRiskScore(threats);
      const isHighRisk =
        riskScore >= 70 ||
        threats.some((t) => t.severity === ThreatSeverity.CRITICAL);

      const analysisDurationMs = Date.now() - startTime;

      const result: ThreatAnalysisResult = {
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
    } catch (err) {
      const analysisDurationMs = Date.now() - startTime;

      this.logger.error(`Threat analysis failed: ${analysisId}`, {
        analysisId,
        error: (err as Error).message,
        analysisDurationMs,
      });

      // Return safe default result on analysis failure
      return {
        analysisId,
        isHighRisk: true, // Fail securely
        riskScore: 100,
        threatTypes: ["ANALYSIS_FAILURE"],
        threatDetails: [
          {
            severity: ThreatSeverity.CRITICAL,
            confidence: 1.0,
            description: `Threat analysis failed: ${(err as Error).message}`,
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

  /**
   * Convert input value to analyzable string format
   * @param value Input value
   * @returns String representation for analysis
   */
  private convertToAnalyzableString(value: unknown): string {
    if (typeof value === "string") {
      return value;
    }

    if (value === null || value === undefined) {
      return "";
    }

    try {
      return JSON.stringify(value);
    } catch (err) {
      this.logger.warn("Failed to stringify input for analysis", {
        error: (err as Error).message,
        valueType: typeof value,
      });
      if (typeof value === "object" && value !== null) {
        return "[object Object]";
      }
      if (value === null || value === undefined) {
        return "";
      }
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        return String(value);
      }
      return "[object Object]";
    }
  }

  /**
   * Detect basic security threats using existing utility functions
   * @param input Input string to analyze
   * @returns Array of basic threats detected
   */
  private detectBasicThreats(input: string): Array<{
    type: string;
    pattern?: string;
    location?: string;
    severity: ThreatSeverity;
    confidence: number;
    description: string;
  }> {
    const threats: Array<{
      type: string;
      pattern?: string;
      location?: string;
      severity: ThreatSeverity;
      confidence: number;
      description: string;
    }> = [];

    // XSS detection
    if (detectXSS(input)) {
      threats.push({
        type: "XSS",
        severity: ThreatSeverity.HIGH,
        confidence: 0.85,
        description: "Cross-Site Scripting (XSS) attack patterns detected",
      });
    }

    // SQL injection detection
    if (detectSQLInjection(input)) {
      threats.push({
        type: "SQL_INJECTION",
        severity: ThreatSeverity.CRITICAL,
        confidence: 0.9,
        description: "SQL injection attack patterns detected",
      });
    }

    // Malicious file content detection
    if (detectMaliciousFileContent(input)) {
      threats.push({
        type: "MALICIOUS_FILE",
        severity: ThreatSeverity.HIGH,
        confidence: 0.8,
        description: "Malicious file content or executable patterns detected",
      });
    }

    return threats;
  }

  /**
   * Detect advanced threats using enterprise pattern matching
   * @param input Input string to analyze
   * @returns Array of advanced threats detected
   */
  private detectAdvancedThreats(input: string): Array<{
    type: string;
    pattern?: string;
    location?: string;
    severity: ThreatSeverity;
    confidence: number;
    description: string;
  }> {
    const threats: Array<{
      type: string;
      pattern?: string;
      location?: string;
      severity: ThreatSeverity;
      confidence: number;
      description: string;
    }> = [];

    // Advanced XSS detection
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

    // Advanced SQL injection detection
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

    // Command injection detection
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

    // Template injection detection
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

    // LDAP injection detection
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

    // XML/XXE detection
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

    // NoSQL injection detection
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

    // Deserialization attack detection
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

  /**
   * Detect contextual threats based on service and environment context
   * @param input Input string to analyze
   * @param context Security context
   * @returns Array of contextual threats detected
   */
  private detectContextualThreats(
    input: string,
    context: SecurityThreatContext,
  ): Array<{
    type: string;
    pattern?: string;
    location?: string;
    severity: ThreatSeverity;
    confidence: number;
    description: string;
  }> {
    const threats: Array<{
      type: string;
      pattern?: string;
      location?: string;
      severity: ThreatSeverity;
      confidence: number;
      description: string;
    }> = [];

    // Context-specific threat detection based on service type
    switch (context.serviceType) {
      case ValidationServiceType._BYTEBOTD:
        // Additional computer-use specific threats
        if (
          /(?:shutdown|reboot|halt|poweroff|kill|pkill|killall)/gi.test(input)
        ) {
          threats.push({
            type: "SYSTEM_CONTROL_ABUSE",
            severity: ThreatSeverity.CRITICAL,
            confidence: 0.95,
            description:
              "System control commands detected in computer-use context",
          });
        }
        break;

      case ValidationServiceType._BYTEBOT_AGENT:
        // Task management specific threats
        if (
          /(?:__proto__|constructor\.prototype|Object\.prototype)/gi.test(input)
        ) {
          threats.push({
            type: "PROTOTYPE_POLLUTION",
            severity: ThreatSeverity.HIGH,
            confidence: 0.8,
            description:
              "Prototype pollution attempt detected in task management context",
          });
        }
        break;

      case ValidationServiceType._BYTEBOT_UI:
        // Frontend specific threats
        if (/(?:postMessage|origin|parent\.)/gi.test(input)) {
          threats.push({
            type: "CROSS_FRAME_ATTACK",
            severity: ThreatSeverity.MEDIUM,
            confidence: 0.7,
            description:
              "Cross-frame communication abuse detected in UI context",
          });
        }
        break;
    }

    // Environment-specific threat detection
    if (context.environment === "production") {
      // More strict detection in production
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

  /**
   * Calculate overall risk score based on detected threats
   * @param threats Array of detected threats
   * @returns Overall risk score (0-100)
   */
  private calculateOverallRiskScore(
    threats: Array<{
      type: string;
      severity: ThreatSeverity;
      confidence: number;
    }>,
  ): number {
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

    // Use a combination of total score and maximum individual score
    // This ensures that even a single critical threat results in high risk
    const averageScore = totalScore / threats.length;
    const combinedScore = Math.max(averageScore, maxScore * 0.8);

    return Math.min(100, Math.round(combinedScore));
  }
}

export default SecurityThreatDetector;
