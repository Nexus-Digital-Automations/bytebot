/**
 * Conversation Context Builder Service
 *
 * Builds rich conversational context from database function parameters for
 * PARLANT validation. Transforms technical function calls into natural language
 * descriptions that enable meaningful conversational validation.
 *
 * Features:
 * - Natural language operation descriptions
 * - Risk assessment and business impact analysis
 * - User intent interpretation from parameters
 * - Historical context and pattern matching
 * - Parameter sanitization and security filtering
 * - Context optimization for validation performance
 *
 * @module ConversationContextBuilder
 * @version 1.0.0
 * @author AIgent Integration Team
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ValidationRequest,
  ConversationContext,
  RiskContext,
  BusinessImpact,
  DatabaseOperationType,
  RiskLevel,
  ImpactSeverity,
  UserValidationContext,
  ConversationHistoryEntry,
} from "../types/validation-layer.types";

// ===== CONTEXT BUILDER CONFIGURATION =====

interface ContextBuilderConfig {
  /** Enable detailed parameter analysis */
  enableDetailedAnalysis: boolean;
  /** Maximum parameter depth for analysis */
  maxParameterDepth: number;
  /** Include sensitive data in context (masked) */
  includeSensitiveData: boolean;
  /** Risk assessment sensitivity level */
  riskSensitivity: RiskSensitivityLevel;
  /** Context length optimization */
  optimizeContextLength: boolean;
  /** Maximum context length in characters */
  maxContextLength: number;
}

enum RiskSensitivityLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  PARANOID = "paranoid",
}

// ===== PARAMETER ANALYSIS TYPES =====

interface ParameterAnalysis {
  /** Parameter name */
  name: string;
  /** Parameter value (sanitized) */
  value: unknown;
  /** Parameter type */
  type: string;
  /** Data sensitivity level */
  sensitivityLevel: DataSensitivityLevel;
  /** Business relevance score */
  businessRelevance: number;
  /** Risk factors identified */
  riskFactors: string[];
  /** Natural language description */
  description: string;
}

enum DataSensitivityLevel {
  PUBLIC = "public",
  INTERNAL = "internal",
  CONFIDENTIAL = "confidential",
  RESTRICTED = "restricted",
  CLASSIFIED = "classified",
}

interface OperationPattern {
  /** Pattern name */
  name: string;
  /** Pattern description */
  description: string;
  /** Risk level associated with pattern */
  riskLevel: RiskLevel;
  /** Business impact level */
  impactLevel: ImpactSeverity;
  /** Mitigation strategies */
  mitigations: string[];
}

// ===== CONVERSATION CONTEXT BUILDER SERVICE =====

@Injectable()
export class ConversationContextBuilder {
  private readonly logger = new Logger(ConversationContextBuilder.name);
  private config!: ContextBuilderConfig;
  private operationPatterns = new Map<string, OperationPattern>();
  private sensitiveDataPatterns!: RegExp[];

  constructor(private readonly configService: ConfigService) {
    this.initializeConfiguration();
    this.initializeOperationPatterns();
    this.initializeSensitiveDataPatterns();
  }

  /**
   * Initialize context builder configuration
   */
  private initializeConfiguration(): void {
    this.config = {
      enableDetailedAnalysis:
        this.configService.get<boolean>("PARLANT_DETAILED_ANALYSIS") !== false,
      maxParameterDepth:
        this.configService.get<number>("PARLANT_MAX_PARAM_DEPTH") || 5,
      includeSensitiveData:
        this.configService.get<boolean>("PARLANT_INCLUDE_SENSITIVE") || false,
      riskSensitivity:
        (this.configService.get<string>(
          "PARLANT_RISK_SENSITIVITY",
        ) as RiskSensitivityLevel) || RiskSensitivityLevel.MEDIUM,
      optimizeContextLength:
        this.configService.get<boolean>("PARLANT_OPTIMIZE_CONTEXT") !== false,
      maxContextLength:
        this.configService.get<number>("PARLANT_MAX_CONTEXT_LENGTH") || 4000,
    };

    this.logger.log("Conversation context builder configured", {
      detailedAnalysis: this.config.enableDetailedAnalysis,
      riskSensitivity: this.config.riskSensitivity,
      maxContextLength: this.config.maxContextLength,
    });
  }

  /**
   * Initialize operation patterns for risk assessment
   */
  private initializeOperationPatterns(): void {
    const patterns: OperationPattern[] = [
      {
        name: "bulk_delete",
        description: "Bulk deletion operations affecting multiple records",
        riskLevel: RiskLevel.HIGH,
        impactLevel: ImpactSeverity.MAJOR,
        mitigations: [
          "backup_required",
          "confirmation_required",
          "audit_trail",
        ],
      },
      {
        name: "schema_modification",
        description: "Database schema changes affecting structure",
        riskLevel: RiskLevel.CRITICAL,
        impactLevel: ImpactSeverity.CRITICAL,
        mitigations: ["maintenance_window", "rollback_plan", "multi_approval"],
      },
      {
        name: "user_data_access",
        description: "Access to user personal data",
        riskLevel: RiskLevel.MEDIUM,
        impactLevel: ImpactSeverity.MODERATE,
        mitigations: ["access_logging", "purpose_justification"],
      },
      {
        name: "financial_transaction",
        description: "Operations involving financial data",
        riskLevel: RiskLevel.HIGH,
        impactLevel: ImpactSeverity.MAJOR,
        mitigations: ["dual_approval", "transaction_logging", "reconciliation"],
      },
      {
        name: "security_config",
        description: "Security configuration changes",
        riskLevel: RiskLevel.CRITICAL,
        impactLevel: ImpactSeverity.CRITICAL,
        mitigations: ["security_review", "testing_required", "rollback_plan"],
      },
      {
        name: "admin_operation",
        description: "Administrative operations with elevated privileges",
        riskLevel: RiskLevel.HIGH,
        impactLevel: ImpactSeverity.MAJOR,
        mitigations: ["admin_approval", "justification_required"],
      },
    ];

    for (const pattern of patterns) {
      this.operationPatterns.set(pattern.name, pattern);
    }

    this.logger.debug("Operation patterns initialized", {
      patternCount: this.operationPatterns.size,
    });
  }

  /**
   * Initialize sensitive data detection patterns
   */
  private initializeSensitiveDataPatterns(): void {
    this.sensitiveDataPatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card numbers
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
      /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g, // Phone numbers
      /\b[A-Z0-9]{20,}\b/g, // API keys or tokens
      /password|pwd|secret|key|token/i, // Sensitive keywords
    ];
  }

  /**
   * Build conversation context from validation request
   */
  async buildContext(
    request: ValidationRequest,
    conversationHistory?: ConversationHistoryEntry[],
  ): Promise<ConversationContext> {
    try {
      const startTime = performance.now();

      // Analyze function parameters
      const parameterAnalysis = await this.analyzeParameters(
        request.parameters,
      );

      // Generate operation description
      const operationDescription = this.generateOperationDescription(
        request.functionName,
        request.operationType,
        parameterAnalysis,
      );

      // Create parameter summary
      const parameterSummary = this.createParameterSummary(parameterAnalysis);

      // Assess risk context
      const riskContext = await this.assessRiskContext(
        request,
        parameterAnalysis,
        conversationHistory,
      );

      // Interpret user intent
      const userIntent = this.interpretUserIntent(
        request.userContext,
        request.functionName,
        parameterAnalysis,
      );

      // Assess business impact
      const businessImpact = this.assessBusinessImpact(
        request.operationType,
        parameterAnalysis,
        riskContext,
      );

      // Build final context
      const context: ConversationContext = {
        operationDescription,
        parameterSummary,
        riskContext,
        userIntent,
        businessImpact,
        conversationHistory: conversationHistory?.slice(0, 5), // Limit history
      };

      // Optimize context length if needed
      const optimizedContext = this.config.optimizeContextLength
        ? this.optimizeContextLength(context)
        : context;

      const processingTime = performance.now() - startTime;

      this.logger.debug("Conversation context built", {
        functionName: request.functionName,
        operationType: request.operationType,
        riskLevel: riskContext.riskLevel,
        contextLength: JSON.stringify(optimizedContext).length,
        processingTimeMs: processingTime,
      });

      return optimizedContext;
    } catch (error) {
      this.logger.error("Failed to build conversation context", {
        functionName: request.functionName,
        error: (error as Error).message,
      });

      // Return minimal context on error
      return this.buildMinimalContext(request);
    }
  }

  /**
   * Analyze function parameters for context building
   */
  private async analyzeParameters(
    parameters: Record<string, unknown>,
  ): Promise<ParameterAnalysis[]> {
    const analyses: ParameterAnalysis[] = [];

    for (const [name, value] of Object.entries(parameters)) {
      try {
        const analysis = await this.analyzeParameter(name, value, 0);
        analyses.push(analysis);
      } catch (error) {
        this.logger.warn("Failed to analyze parameter", {
          parameterName: name,
          error: (error as Error).message,
        });

        // Add basic analysis on error
        analyses.push({
          name,
          value: "[analysis_failed]",
          type: typeof value,
          sensitivityLevel: DataSensitivityLevel.INTERNAL,
          businessRelevance: 0.5,
          riskFactors: ["analysis_error"],
          description: `Parameter ${name} (analysis failed)`,
        });
      }
    }

    return analyses;
  }

  /**
   * Analyze individual parameter
   */
  private async analyzeParameter(
    name: string,
    value: unknown,
    depth: number,
  ): Promise<ParameterAnalysis> {
    if (depth > this.config.maxParameterDepth) {
      return {
        name,
        value: "[depth_limit_exceeded]",
        type: typeof value,
        sensitivityLevel: DataSensitivityLevel.INTERNAL,
        businessRelevance: 0.1,
        riskFactors: ["max_depth_exceeded"],
        description: `Parameter ${name} (depth limit exceeded)`,
      };
    }

    // Sanitize value for sensitivity
    const sanitizedValue = this.sanitizeValue(value);
    const valueType = this.getValueType(value);

    // Assess sensitivity level
    const sensitivityLevel = this.assessDataSensitivity(name, value);

    // Calculate business relevance
    const businessRelevance = this.calculateBusinessRelevance(
      name,
      value,
      valueType,
    );

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(name, value, sensitivityLevel);

    // Generate description
    const description = this.generateParameterDescription(
      name,
      sanitizedValue,
      valueType,
    );

    return {
      name,
      value: sanitizedValue,
      type: valueType,
      sensitivityLevel,
      businessRelevance,
      riskFactors,
      description,
    };
  }

  /**
   * Sanitize parameter value for safe display
   */
  private sanitizeValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === "string") {
      // Check for sensitive patterns
      let sanitized = value;
      for (const pattern of this.sensitiveDataPatterns) {
        sanitized = sanitized.replace(pattern, "[REDACTED]");
      }
      return sanitized;
    }

    if (typeof value === "object") {
      if (Array.isArray(value)) {
        return value.length > 10
          ? `[Array with ${value.length} items]`
          : value.map((item) => this.sanitizeValue(item));
      }

      const sanitizedObj: Record<string, unknown> = {};
      let keyCount = 0;
      for (const [key, val] of Object.entries(value)) {
        if (keyCount >= 10) {
          sanitizedObj["..."] =
            `${Object.keys(value).length - keyCount} more properties`;
          break;
        }
        sanitizedObj[key] = this.sanitizeValue(val);
        keyCount++;
      }
      return sanitizedObj;
    }

    return value;
  }

  /**
   * Get detailed value type
   */
  private getValueType(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (Array.isArray(value)) return `array[${value.length}]`;
    if (value instanceof Date) return "date";
    if (typeof value === "object")
      return `object[${Object.keys(value).length}]`;
    return typeof value;
  }

  /**
   * Assess data sensitivity level
   */
  private assessDataSensitivity(
    name: string,
    value: unknown,
  ): DataSensitivityLevel {
    const nameLoiwer = name.toLowerCase();

    // Classified data
    if (this.isClassifiedData(nameLoiwer, value)) {
      return DataSensitivityLevel.CLASSIFIED;
    }

    // Restricted data
    if (this.isRestrictedData(nameLoiwer, value)) {
      return DataSensitivityLevel.RESTRICTED;
    }

    // Confidential data
    if (this.isConfidentialData(nameLoiwer, value)) {
      return DataSensitivityLevel.CONFIDENTIAL;
    }

    // Internal data
    if (this.isInternalData(nameLoiwer, value)) {
      return DataSensitivityLevel.INTERNAL;
    }

    return DataSensitivityLevel.PUBLIC;
  }

  /**
   * Check if data is classified
   */
  private isClassifiedData(name: string, value: unknown): boolean {
    const classifiedKeywords = [
      "ssn",
      "social_security",
      "financial_account",
      "credit_card",
      "bank_account",
    ];
    return classifiedKeywords.some((keyword) => name.includes(keyword));
  }

  /**
   * Check if data is restricted
   */
  private isRestrictedData(name: string, value: unknown): boolean {
    const restrictedKeywords = [
      "password",
      "secret",
      "private_key",
      "token",
      "api_key",
      "auth",
    ];
    return restrictedKeywords.some((keyword) => name.includes(keyword));
  }

  /**
   * Check if data is confidential
   */
  private isConfidentialData(name: string, value: unknown): boolean {
    const confidentialKeywords = [
      "email",
      "phone",
      "address",
      "personal",
      "private",
      "user_data",
    ];
    return confidentialKeywords.some((keyword) => name.includes(keyword));
  }

  /**
   * Check if data is internal
   */
  private isInternalData(name: string, value: unknown): boolean {
    const internalKeywords = [
      "id",
      "internal",
      "config",
      "setting",
      "preference",
    ];
    return internalKeywords.some((keyword) => name.includes(keyword));
  }

  /**
   * Calculate business relevance score
   */
  private calculateBusinessRelevance(
    name: string,
    value: unknown,
    type: string,
  ): number {
    let relevance = 0.5; // Base relevance

    // Higher relevance for certain parameter names
    const highRelevanceKeywords = [
      "amount",
      "quantity",
      "user",
      "customer",
      "order",
      "transaction",
    ];
    if (
      highRelevanceKeywords.some((keyword) =>
        name.toLowerCase().includes(keyword),
      )
    ) {
      relevance += 0.3;
    }

    // Medium relevance for IDs and references
    if (
      name.toLowerCase().includes("id") ||
      name.toLowerCase().includes("ref")
    ) {
      relevance += 0.1;
    }

    // Adjust for data types
    if (type.includes("array") || type.includes("object")) {
      relevance += 0.1;
    }

    return Math.min(1.0, relevance);
  }

  /**
   * Identify risk factors in parameters
   */
  private identifyRiskFactors(
    name: string,
    value: unknown,
    sensitivityLevel: DataSensitivityLevel,
  ): string[] {
    const riskFactors: string[] = [];

    // Sensitivity-based risks
    if (sensitivityLevel === DataSensitivityLevel.CLASSIFIED) {
      riskFactors.push("classified_data_access");
    } else if (sensitivityLevel === DataSensitivityLevel.RESTRICTED) {
      riskFactors.push("restricted_data_access");
    }

    // Parameter-specific risks
    if (name.toLowerCase().includes("delete")) {
      riskFactors.push("destructive_operation");
    }

    if (
      name.toLowerCase().includes("bulk") ||
      name.toLowerCase().includes("batch")
    ) {
      riskFactors.push("bulk_operation");
    }

    if (Array.isArray(value) && value.length > 100) {
      riskFactors.push("large_dataset");
    }

    if (typeof value === "string" && value.length > 1000) {
      riskFactors.push("large_data_payload");
    }

    // SQL-like patterns
    if (
      typeof value === "string" &&
      /\b(DROP|DELETE|UPDATE|INSERT|ALTER)\b/i.test(value)
    ) {
      riskFactors.push("sql_keywords_detected");
    }

    return riskFactors;
  }

  /**
   * Generate parameter description
   */
  private generateParameterDescription(
    name: string,
    value: unknown,
    type: string,
  ): string {
    if (value === null || value === undefined) {
      return `${name}: ${value}`;
    }

    if (typeof value === "string") {
      const length = (value as string).length;
      return `${name}: "${value}" (${length} characters)`;
    }

    if (typeof value === "number") {
      return `${name}: ${value}`;
    }

    if (typeof value === "boolean") {
      return `${name}: ${value}`;
    }

    if (Array.isArray(value)) {
      return `${name}: array with ${value.length} items`;
    }

    if (typeof value === "object") {
      const keys = Object.keys(value as object);
      return `${name}: object with ${keys.length} properties`;
    }

    return `${name}: ${type}`;
  }

  /**
   * Generate operation description
   */
  private generateOperationDescription(
    functionName: string,
    operationType: DatabaseOperationType,
    parameterAnalysis: ParameterAnalysis[],
  ): string {
    const primaryParams = parameterAnalysis
      .filter((p) => p.businessRelevance > 0.6)
      .slice(0, 3);

    const operationVerb = this.getOperationVerb(operationType);
    const contextualInfo = this.getContextualInfo(parameterAnalysis);

    let description = `${operationVerb} operation "${functionName}"`;

    if (primaryParams.length > 0) {
      const paramNames = primaryParams.map((p) => p.name).join(", ");
      description += ` involving ${paramNames}`;
    }

    if (contextualInfo) {
      description += ` (${contextualInfo})`;
    }

    return description;
  }

  /**
   * Get operation verb based on type
   */
  private getOperationVerb(operationType: DatabaseOperationType): string {
    const verbMap: Record<DatabaseOperationType, string> = {
      [DatabaseOperationType.READ]: "Data retrieval",
      [DatabaseOperationType.WRITE]: "Data creation",
      [DatabaseOperationType.UPDATE]: "Data modification",
      [DatabaseOperationType.DELETE]: "Data deletion",
      [DatabaseOperationType.BULK_OPERATION]: "Bulk data",
      [DatabaseOperationType.SCHEMA_CHANGE]: "Schema modification",
      [DatabaseOperationType.TRANSACTION]: "Transaction",
      [DatabaseOperationType.ADMIN_OPERATION]: "Administrative",
    };

    return verbMap[operationType] || "Database";
  }

  /**
   * Get contextual information from parameters
   */
  private getContextualInfo(parameterAnalysis: ParameterAnalysis[]): string {
    const info: string[] = [];

    const sensitiveParams = parameterAnalysis.filter(
      (p) =>
        p.sensitivityLevel === DataSensitivityLevel.CONFIDENTIAL ||
        p.sensitivityLevel === DataSensitivityLevel.RESTRICTED ||
        p.sensitivityLevel === DataSensitivityLevel.CLASSIFIED,
    );

    if (sensitiveParams.length > 0) {
      info.push(`${sensitiveParams.length} sensitive parameter(s)`);
    }

    const bulkParams = parameterAnalysis.filter(
      (p) =>
        p.riskFactors.includes("bulk_operation") ||
        p.riskFactors.includes("large_dataset"),
    );

    if (bulkParams.length > 0) {
      info.push("bulk operation");
    }

    const destructiveParams = parameterAnalysis.filter((p) =>
      p.riskFactors.includes("destructive_operation"),
    );

    if (destructiveParams.length > 0) {
      info.push("potentially destructive");
    }

    return info.join(", ");
  }

  /**
   * Create parameter summary
   */
  private createParameterSummary(
    parameterAnalysis: ParameterAnalysis[],
  ): string {
    if (parameterAnalysis.length === 0) {
      return "No parameters provided";
    }

    const summaryParts: string[] = [];

    // Group by sensitivity
    const bySensitivity = new Map<DataSensitivityLevel, ParameterAnalysis[]>();
    for (const analysis of parameterAnalysis) {
      const existing = bySensitivity.get(analysis.sensitivityLevel) || [];
      existing.push(analysis);
      bySensitivity.set(analysis.sensitivityLevel, existing);
    }

    // Add sensitivity summary
    for (const [level, params] of bySensitivity) {
      if (level !== DataSensitivityLevel.PUBLIC) {
        summaryParts.push(`${params.length} ${level} parameter(s)`);
      }
    }

    // Add high-relevance parameters
    const highRelevance = parameterAnalysis
      .filter((p) => p.businessRelevance > 0.7)
      .slice(0, 3);

    if (highRelevance.length > 0) {
      const paramDescriptions = highRelevance.map((p) => p.description);
      summaryParts.push(`Key parameters: ${paramDescriptions.join("; ")}`);
    }

    // Add risk factors summary
    const allRiskFactors = parameterAnalysis.flatMap((p) => p.riskFactors);
    const uniqueRiskFactors = [...new Set(allRiskFactors)];

    if (uniqueRiskFactors.length > 0) {
      summaryParts.push(
        `Risk factors: ${uniqueRiskFactors.slice(0, 3).join(", ")}`,
      );
    }

    return summaryParts.length > 0
      ? summaryParts.join(". ")
      : `${parameterAnalysis.length} parameter(s) provided`;
  }

  /**
   * Assess risk context for the operation
   */
  private async assessRiskContext(
    request: ValidationRequest,
    parameterAnalysis: ParameterAnalysis[],
    conversationHistory?: ConversationHistoryEntry[],
  ): Promise<RiskContext> {
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Collect parameter risk factors
    const paramRiskFactors = parameterAnalysis.flatMap((p) => p.riskFactors);
    riskFactors.push(...paramRiskFactors);

    // Assess operation type risk
    const operationRisk = this.assessOperationTypeRisk(request.operationType);
    riskFactors.push(...operationRisk.factors);
    riskScore += operationRisk.score;

    // Assess data sensitivity risk
    const sensitivityRisk = this.assessSensitivityRisk(parameterAnalysis);
    riskFactors.push(...sensitivityRisk.factors);
    riskScore += sensitivityRisk.score;

    // Assess user context risk
    const userRisk = this.assessUserContextRisk(request.userContext);
    riskFactors.push(...userRisk.factors);
    riskScore += userRisk.score;

    // Assess historical patterns
    if (conversationHistory) {
      const historyRisk = this.assessHistoricalRisk(conversationHistory);
      riskFactors.push(...historyRisk.factors);
      riskScore += historyRisk.score;
    }

    // Determine risk level
    const riskLevel = this.determineRiskLevel(riskScore);

    // Generate mitigation strategies
    const mitigationStrategies = this.generateMitigationStrategies(
      riskFactors,
      riskLevel,
    );

    return {
      riskLevel,
      riskFactors: [...new Set(riskFactors)], // Remove duplicates
      mitigationStrategies,
      riskScore: Math.min(100, riskScore),
    };
  }

  /**
   * Assess risk based on operation type
   */
  private assessOperationTypeRisk(operationType: DatabaseOperationType): {
    factors: string[];
    score: number;
  } {
    const riskMap: Record<
      DatabaseOperationType,
      { factors: string[]; score: number }
    > = {
      [DatabaseOperationType.READ]: { factors: [], score: 10 },
      [DatabaseOperationType.WRITE]: { factors: ["data_creation"], score: 20 },
      [DatabaseOperationType.UPDATE]: {
        factors: ["data_modification"],
        score: 30,
      },
      [DatabaseOperationType.DELETE]: {
        factors: ["data_deletion", "destructive_operation"],
        score: 50,
      },
      [DatabaseOperationType.BULK_OPERATION]: {
        factors: ["bulk_operation", "high_impact"],
        score: 60,
      },
      [DatabaseOperationType.SCHEMA_CHANGE]: {
        factors: ["schema_modification", "structural_change"],
        score: 80,
      },
      [DatabaseOperationType.TRANSACTION]: {
        factors: ["transaction_operation"],
        score: 25,
      },
      [DatabaseOperationType.ADMIN_OPERATION]: {
        factors: ["admin_privilege", "elevated_access"],
        score: 70,
      },
    };

    return (
      riskMap[operationType] || { factors: ["unknown_operation"], score: 40 }
    );
  }

  /**
   * Assess risk based on data sensitivity
   */
  private assessSensitivityRisk(parameterAnalysis: ParameterAnalysis[]): {
    factors: string[];
    score: number;
  } {
    const factors: string[] = [];
    let score = 0;

    const sensitivityCounts = new Map<DataSensitivityLevel, number>();
    for (const analysis of parameterAnalysis) {
      const count = sensitivityCounts.get(analysis.sensitivityLevel) || 0;
      sensitivityCounts.set(analysis.sensitivityLevel, count + 1);
    }

    if (sensitivityCounts.get(DataSensitivityLevel.CLASSIFIED) || 0 > 0) {
      factors.push("classified_data_involved");
      score += 50;
    }

    if (sensitivityCounts.get(DataSensitivityLevel.RESTRICTED) || 0 > 0) {
      factors.push("restricted_data_involved");
      score += 40;
    }

    if (sensitivityCounts.get(DataSensitivityLevel.CONFIDENTIAL) || 0 > 0) {
      factors.push("confidential_data_involved");
      score += 30;
    }

    return { factors, score };
  }

  /**
   * Assess risk based on user context
   */
  private assessUserContextRisk(userContext: UserValidationContext): {
    factors: string[];
    score: number;
  } {
    const factors: string[] = [];
    let score = 0;

    // Check for admin roles
    const adminRoles = ["admin", "administrator", "root", "superuser"];
    if (
      userContext.roles.some((role) => adminRoles.includes(role.toLowerCase()))
    ) {
      factors.push("admin_user");
      score += 20;
    }

    // Check for service accounts
    if (
      userContext.userId.includes("service") ||
      userContext.userId.includes("system")
    ) {
      factors.push("service_account");
      score += 10;
    }

    return { factors, score };
  }

  /**
   * Assess risk based on conversation history
   */
  private assessHistoricalRisk(history: ConversationHistoryEntry[]): {
    factors: string[];
    score: number;
  } {
    const factors: string[] = [];
    let score = 0;

    // Check for recent failures
    const recentFailures = history.filter(
      (h) =>
        h.decision.toString().includes("DENY") ||
        h.decision.toString().includes("ESCALATE"),
    );

    if (recentFailures.length > 0) {
      factors.push("recent_validation_failures");
      score += recentFailures.length * 10;
    }

    // Check for pattern of risky operations
    const riskyOperations = history.filter(
      (h) =>
        h.relatedFunction.includes("delete") ||
        h.relatedFunction.includes("admin"),
    );

    if (riskyOperations.length > 2) {
      factors.push("pattern_of_risky_operations");
      score += 15;
    }

    return { factors, score };
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 80) return RiskLevel.CRITICAL;
    if (riskScore >= 60) return RiskLevel.HIGH;
    if (riskScore >= 40) return RiskLevel.MEDIUM;
    if (riskScore >= 20) return RiskLevel.LOW;
    return RiskLevel.MINIMAL;
  }

  /**
   * Generate mitigation strategies
   */
  private generateMitigationStrategies(
    riskFactors: string[],
    riskLevel: RiskLevel,
  ): string[] {
    const strategies: string[] = [];

    // Risk-level based strategies
    if (riskLevel === RiskLevel.CRITICAL) {
      strategies.push("Multi-party approval required");
      strategies.push("Comprehensive audit trail");
      strategies.push("Rollback plan required");
    } else if (riskLevel === RiskLevel.HIGH) {
      strategies.push("Senior approval required");
      strategies.push("Backup verification");
      strategies.push("Impact assessment");
    } else if (riskLevel === RiskLevel.MEDIUM) {
      strategies.push("Supervisor notification");
      strategies.push("Activity logging");
    }

    // Risk-factor specific strategies
    if (riskFactors.includes("destructive_operation")) {
      strategies.push("Backup creation required");
    }

    if (riskFactors.includes("bulk_operation")) {
      strategies.push("Batch size limitation");
      strategies.push("Progress monitoring");
    }

    if (riskFactors.includes("classified_data_involved")) {
      strategies.push("Data classification compliance");
      strategies.push("Access justification required");
    }

    return [...new Set(strategies)]; // Remove duplicates
  }

  /**
   * Interpret user intent from context
   */
  private interpretUserIntent(
    userContext: UserValidationContext,
    functionName: string,
    parameterAnalysis: ParameterAnalysis[],
  ): string {
    const intentParts: string[] = [];

    // Function-based intent
    if (functionName.includes("create") || functionName.includes("add")) {
      intentParts.push("Create new data");
    } else if (
      functionName.includes("update") ||
      functionName.includes("modify")
    ) {
      intentParts.push("Modify existing data");
    } else if (
      functionName.includes("delete") ||
      functionName.includes("remove")
    ) {
      intentParts.push("Remove data");
    } else if (
      functionName.includes("get") ||
      functionName.includes("find") ||
      functionName.includes("search")
    ) {
      intentParts.push("Retrieve data");
    } else {
      intentParts.push("Perform database operation");
    }

    // Parameter-based intent refinement
    const businessParams = parameterAnalysis.filter(
      (p) => p.businessRelevance > 0.6,
    );
    if (businessParams.length > 0) {
      const subjects = businessParams.map((p) => p.name).slice(0, 2);
      intentParts.push(`involving ${subjects.join(" and ")}`);
    }

    // User role context
    if (userContext.roles.includes("admin")) {
      intentParts.push("as administrator");
    } else if (userContext.roles.includes("user")) {
      intentParts.push("as regular user");
    }

    return intentParts.join(" ");
  }

  /**
   * Assess business impact
   */
  private assessBusinessImpact(
    operationType: DatabaseOperationType,
    parameterAnalysis: ParameterAnalysis[],
    riskContext: RiskContext,
  ): BusinessImpact {
    let severity = ImpactSeverity.MINOR;
    const affectedAreas: string[] = [];
    let estimatedDurationMs = 60000; // 1 minute default
    const recoveryRequirements: string[] = [];

    // Assess severity based on operation type and risk
    if (operationType === DatabaseOperationType.SCHEMA_CHANGE) {
      severity = ImpactSeverity.CRITICAL;
      affectedAreas.push("Database Structure", "Application Functionality");
      estimatedDurationMs = 3600000; // 1 hour
      recoveryRequirements.push("Database rollback", "Application restart");
    } else if (
      operationType === DatabaseOperationType.DELETE ||
      operationType === DatabaseOperationType.BULK_OPERATION
    ) {
      severity =
        riskContext.riskLevel === RiskLevel.CRITICAL
          ? ImpactSeverity.MAJOR
          : ImpactSeverity.MODERATE;
      affectedAreas.push("Data Integrity");
      estimatedDurationMs = 1800000; // 30 minutes
      recoveryRequirements.push("Data restoration from backup");
    } else if (operationType === DatabaseOperationType.ADMIN_OPERATION) {
      severity = ImpactSeverity.MODERATE;
      affectedAreas.push("System Configuration");
      estimatedDurationMs = 900000; // 15 minutes
      recoveryRequirements.push("Configuration rollback");
    }

    // Adjust based on data sensitivity
    const hasSensitiveData = parameterAnalysis.some(
      (p) =>
        p.sensitivityLevel === DataSensitivityLevel.CONFIDENTIAL ||
        p.sensitivityLevel === DataSensitivityLevel.RESTRICTED ||
        p.sensitivityLevel === DataSensitivityLevel.CLASSIFIED,
    );

    if (hasSensitiveData) {
      if (severity === ImpactSeverity.MINOR) severity = ImpactSeverity.MODERATE;
      else if (severity === ImpactSeverity.MODERATE)
        severity = ImpactSeverity.MAJOR;
      affectedAreas.push("Data Privacy", "Compliance");
      recoveryRequirements.push("Compliance notification");
    }

    return {
      severity,
      affectedAreas,
      estimatedDurationMs,
      recoveryRequirements,
    };
  }

  /**
   * Optimize context length to stay within limits
   */
  private optimizeContextLength(
    context: ConversationContext,
  ): ConversationContext {
    const contextJson = JSON.stringify(context);

    if (contextJson.length <= this.config.maxContextLength) {
      return context;
    }

    this.logger.debug("Optimizing context length", {
      originalLength: contextJson.length,
      maxLength: this.config.maxContextLength,
    });

    // Create optimized version
    const optimized = { ...context };

    // Truncate parameter summary if too long
    if (optimized.parameterSummary.length > 500) {
      optimized.parameterSummary =
        optimized.parameterSummary.substring(0, 497) + "...";
    }

    // Limit risk factors
    if (optimized.riskContext.riskFactors.length > 5) {
      optimized.riskContext.riskFactors =
        optimized.riskContext.riskFactors.slice(0, 5);
    }

    // Limit mitigation strategies
    if (optimized.riskContext.mitigationStrategies.length > 3) {
      optimized.riskContext.mitigationStrategies =
        optimized.riskContext.mitigationStrategies.slice(0, 3);
    }

    // Limit affected areas
    if (optimized.businessImpact.affectedAreas.length > 3) {
      optimized.businessImpact.affectedAreas =
        optimized.businessImpact.affectedAreas.slice(0, 3);
    }

    // Remove conversation history if still too long
    const optimizedJson = JSON.stringify(optimized);
    if (optimizedJson.length > this.config.maxContextLength) {
      optimized.conversationHistory = undefined;
    }

    return optimized;
  }

  /**
   * Build minimal context on error
   */
  private buildMinimalContext(request: ValidationRequest): ConversationContext {
    return {
      operationDescription: `${request.operationType} operation: ${request.functionName}`,
      parameterSummary: `${Object.keys(request.parameters).length} parameter(s) provided`,
      riskContext: {
        riskLevel: RiskLevel.MEDIUM,
        riskFactors: ["context_build_error"],
        mitigationStrategies: ["Manual review required"],
        riskScore: 50,
      },
      userIntent: "Database operation requested",
      businessImpact: {
        severity: ImpactSeverity.MODERATE,
        affectedAreas: ["Database"],
        estimatedDurationMs: 300000, // 5 minutes
        recoveryRequirements: ["Manual verification"],
      },
    };
  }
}
