/**
 * PARLANT Phase 1 Function Wrapper Framework - Parameter Capture and Validation
 *
 * Advanced parameter capture and validation systems for PARLANT conversational
 * validation. Provides comprehensive parameter analysis, type validation,
 * security sanitization, and PARLANT context preparation.
 *
 * @fileoverview Parameter capture and validation with security and performance optimization
 * @version 1.0.0
 * @author Function Wrapper Framework Agent
 * @created 2025-09-19
 */

import { Injectable, Logger } from "@nestjs/common";
import {
  ValidationContext,
  ValidationResult,
  ValidationRule,
  UserContext,
  ValidationLevel,
  DataClassification,
  ErrorCategory,
  WrapperError,
} from "../interfaces/wrapper-types";

/**
 * Advanced Parameter Capture and Validation Service
 * Handles comprehensive parameter analysis and PARLANT context preparation
 */
@Injectable()
export class ParameterCaptureValidationService {
  private readonly logger = new Logger(ParameterCaptureValidationService.name);
  private readonly sanitizer = new ParameterSanitizer();
  private readonly typeAnalyzer = new ParameterTypeAnalyzer();
  private readonly securityValidator = new ParameterSecurityValidator();
  private readonly performanceOptimizer = new ParameterPerformanceOptimizer();

  /**
   * Capture and validate function parameters for PARLANT processing
   *
   * @param functionName - Name of function being called
   * @param parameters - Raw function parameters
   * @param userContext - User context for validation
   * @param validationLevel - Required validation level
   * @param customRules - Additional validation rules
   * @returns Comprehensive parameter validation result
   */
  public async captureAndValidateParameters(
    functionName: string,
    parameters: readonly any[],
    userContext: UserContext,
    validationLevel: ValidationLevel,
    customRules: readonly ValidationRule[] = [],
  ): Promise<ParameterValidationResult> {
    const startTime = Date.now();
    const captureId = this.generateCaptureId();

    this.logger.debug(`Starting parameter capture for ${functionName}`, {
      captureId,
      parameterCount: parameters.length,
      validationLevel,
    });

    try {
      // Step 1: Capture raw parameters with metadata
      const capturedParameters = await this.captureParametersWithMetadata(
        parameters,
        functionName,
        captureId,
      );

      // Step 2: Perform type analysis
      const typeAnalysis = await this.typeAnalyzer.analyzeParameterTypes(
        capturedParameters,
        functionName,
      );

      // Step 3: Security validation and sanitization
      const securityValidation =
        await this.securityValidator.validateParameterSecurity(
          capturedParameters,
          userContext,
          validationLevel,
        );

      if (!securityValidation.passed) {
        const error = new Error(
          `Parameter security validation failed: ${securityValidation.violations.join(", ")}`,
        );
        (error as any).code = "PARAMETER_SECURITY_VIOLATION";
        (error as any).category = ErrorCategory.VALIDATION_ERROR;
        (error as any).metadata = {
          captureId,
          functionName,
          violations: securityValidation.violations,
        };
        throw error;
      }

      // Step 4: Sanitize parameters for PARLANT context
      const sanitizedParameters = await this.sanitizer.sanitizeParameters(
        capturedParameters,
        securityValidation.sensitiveParameterIndices,
      );

      // Step 5: Apply custom validation rules
      const customValidationResults = await this.applyCustomValidationRules(
        capturedParameters,
        customRules,
        userContext,
        functionName,
      );

      // Step 6: Performance optimization analysis
      const performanceAnalysis =
        await this.performanceOptimizer.analyzeParameterPerformance(
          capturedParameters,
          typeAnalysis,
        );

      // Step 7: Create PARLANT-ready validation context
      const parlantContext = await this.createParlantValidationContext(
        functionName,
        sanitizedParameters,
        userContext,
        typeAnalysis,
        performanceAnalysis,
        captureId,
      );

      const executionTime = Date.now() - startTime;

      this.logger.debug(`Parameter capture completed for ${functionName}`, {
        captureId,
        executionTime,
        securityPassed: securityValidation.passed,
        customRulesPassed: customValidationResults.every((r) => r.passed),
      });

      return {
        captureId,
        functionName,
        originalParameters: parameters,
        capturedParameters,
        sanitizedParameters,
        typeAnalysis,
        securityValidation,
        customValidationResults,
        performanceAnalysis,
        parlantContext,
        validationPassed: true,
        executionTime,
        metadata: {
          validationLevel,
          userPermissions: userContext.permissions,
          parameterCount: parameters.length,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error(`Parameter capture failed for ${functionName}`, {
        captureId,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      });

      return {
        captureId,
        functionName,
        originalParameters: parameters,
        capturedParameters: [],
        sanitizedParameters: [],
        typeAnalysis: {
          parameterTypes: [],
          complexityScore: 0,
          riskFactors: [],
        },
        securityValidation: {
          passed: false,
          violations: [error instanceof Error ? error.message : String(error)],
          sensitiveParameterIndices: [],
        },
        customValidationResults: [],
        performanceAnalysis: {
          estimatedProcessingTime: 0,
          memoryFootprint: 0,
          optimizationRecommendations: [],
        },
        parlantContext: null,
        validationPassed: false,
        executionTime,
        error: error as WrapperError,
        metadata: {
          validationLevel,
          userPermissions: userContext.permissions,
          parameterCount: parameters.length,
        },
      };
    }
  }

  /**
   * Create context-aware parameter summary for PARLANT conversation
   *
   * @param parameters - Sanitized parameters
   * @param functionName - Function name
   * @param userContext - User context
   * @returns Human-readable parameter summary
   */
  public createParameterSummaryForConversation(
    parameters: readonly CapturedParameter[],
    functionName: string,
    userContext: UserContext,
  ): ParameterConversationSummary {
    const summary: ParameterConversationSummary = {
      functionName,
      parameterCount: parameters.length,
      humanReadableDescription: this.generateHumanReadableDescription(
        parameters,
        functionName,
      ),
      keyParameters: this.identifyKeyParameters(parameters),
      securityRelevantParameters:
        this.identifySecurityRelevantParameters(parameters),
      dataClassificationLevel:
        this.determineOverallDataClassification(parameters),
      conversationPrompts: this.generateConversationPrompts(
        parameters,
        functionName,
        userContext,
      ),
      riskAssessment: this.assessParameterRisks(parameters, functionName),
      recommendedActions: this.generateRecommendations(
        parameters,
        functionName,
        userContext,
      ),
    };

    return summary;
  }

  /**
   * Validate parameter changes during conversation
   *
   * @param originalParameters - Original parameters
   * @param modifiedParameters - Modified parameters from conversation
   * @param userContext - User context
   * @returns Parameter change validation result
   */
  public async validateParameterChanges(
    originalParameters: readonly CapturedParameter[],
    modifiedParameters: readonly any[],
    userContext: UserContext,
  ): Promise<ParameterChangeValidationResult> {
    const changeAnalysis = await this.analyzeParameterChanges(
      originalParameters,
      modifiedParameters,
    );

    const securityImpact = await this.assessSecurityImpactOfChanges(
      changeAnalysis,
      userContext,
    );

    const businessImpact = await this.assessBusinessImpactOfChanges(
      changeAnalysis,
      originalParameters,
    );

    const validationPassed =
      securityImpact.acceptableRisk && businessImpact.acceptableImpact;

    return {
      changeAnalysis,
      securityImpact,
      businessImpact,
      validationPassed,
      approvalRequired: !validationPassed || securityImpact.requiresApproval,
      rejectionReason: validationPassed
        ? null
        : this.generateRejectionReason(securityImpact, businessImpact),
      recommendations: this.generateChangeRecommendations(
        changeAnalysis,
        securityImpact,
        businessImpact,
      ),
    };
  }

  /**
   * Generate unique capture ID for tracking
   *
   * @returns Unique capture identifier
   */
  private generateCaptureId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `capture_${timestamp}_${random}`;
  }

  /**
   * Capture parameters with comprehensive metadata
   *
   * @param parameters - Raw parameters
   * @param functionName - Function name
   * @param captureId - Capture identifier
   * @returns Captured parameters with metadata
   */
  private async captureParametersWithMetadata(
    parameters: readonly any[],
    functionName: string,
    captureId: string,
  ): Promise<CapturedParameter[]> {
    const capturedParameters: CapturedParameter[] = [];

    for (let i = 0; i < parameters.length; i++) {
      const param = parameters[i];

      const capturedParam: CapturedParameter = {
        index: i,
        originalValue: param,
        type: typeof param,
        serializedValue: await this.serializeParameter(param),
        metadata: {
          captureId,
          functionName,
          captureTimestamp: new Date(),
          size: this.calculateParameterSize(param),
          complexity: this.calculateParameterComplexity(param),
          containsPII: await this.detectPII(param),
          containsCredentials: await this.detectCredentials(param),
          dataClassification: await this.classifyParameterData(param),
          securityRisk: await this.assessParameterSecurityRisk(param),
        },
      };

      capturedParameters.push(capturedParam);
    }

    return capturedParameters;
  }

  /**
   * Serialize parameter for safe storage and transmission
   *
   * @param param - Parameter to serialize
   * @returns Serialized parameter value
   */
  private async serializeParameter(param: any): Promise<string> {
    try {
      // Handle special cases
      if (param === null) return "null";
      if (param === undefined) return "undefined";
      if (typeof param === "function") return "[Function]";
      if (param instanceof Date) return param.toISOString();
      if (param instanceof Error) return `[Error: ${param.message}]`;
      if (param instanceof Buffer) return `[Buffer: ${param.length} bytes]`;

      // Handle circular references
      const seen = new WeakSet();
      const serialized = JSON.stringify(param, (key, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular Reference]";
          }
          seen.add(value);
        }
        return value;
      });

      // Truncate very large serialized values
      if (serialized.length > 10000) {
        return serialized.substring(0, 10000) + "... [Truncated]";
      }

      return serialized;
    } catch (error) {
      return `[Serialization Error: ${error instanceof Error ? error.message : String(error)}]`;
    }
  }

  /**
   * Calculate parameter size in bytes
   *
   * @param param - Parameter to measure
   * @returns Size in bytes
   */
  private calculateParameterSize(param: any): number {
    try {
      if (param === null || param === undefined) return 0;
      if (typeof param === "string") return Buffer.byteLength(param, "utf8");
      if (typeof param === "number") return 8;
      if (typeof param === "boolean") return 1;
      if (param instanceof Buffer) return param.length;

      // Approximate size for objects
      const serialized = JSON.stringify(param);
      return Buffer.byteLength(serialized, "utf8");
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate parameter complexity score
   *
   * @param param - Parameter to analyze
   * @returns Complexity score (0-100)
   */
  private calculateParameterComplexity(param: any): number {
    if (param === null || param === undefined) return 0;
    if (
      typeof param === "string" ||
      typeof param === "number" ||
      typeof param === "boolean"
    )
      return 10;

    if (Array.isArray(param)) {
      const baseComplexity = 20;
      const lengthComplexity = Math.min(param.length * 2, 30);
      const nestedComplexity =
        Math.max(
          ...param.map((item) => this.calculateParameterComplexity(item)),
        ) * 0.5;
      return Math.min(
        baseComplexity + lengthComplexity + nestedComplexity,
        100,
      );
    }

    if (typeof param === "object") {
      const baseComplexity = 30;
      const keyComplexity = Math.min(Object.keys(param).length * 3, 40);
      const nestedComplexity =
        Math.max(
          ...Object.values(param).map((value) =>
            this.calculateParameterComplexity(value),
          ),
        ) * 0.5;
      return Math.min(baseComplexity + keyComplexity + nestedComplexity, 100);
    }

    return 50; // Default for unknown types
  }

  /**
   * Detect personally identifiable information in parameter
   *
   * @param param - Parameter to check
   * @returns True if PII detected
   */
  private async detectPII(param: any): Promise<boolean> {
    const serialized = await this.serializeParameter(param);

    // Simple PII detection patterns
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/, // Credit card
      /\b\d{3}-\d{3}-\d{4}\b/, // Phone number
      /\b\d{1,5}\s\w+\s(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Pl|Place)\b/i, // Address
    ];

    return piiPatterns.some((pattern) => pattern.test(serialized));
  }

  /**
   * Detect credentials in parameter
   *
   * @param param - Parameter to check
   * @returns True if credentials detected
   */
  private async detectCredentials(param: any): Promise<boolean> {
    const serialized = await this.serializeParameter(param);

    // Credential detection patterns
    const credentialPatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /key/i,
      /auth/i,
      /bearer/i,
      /api[_-]?key/i,
      /access[_-]?token/i,
      /private[_-]?key/i,
    ];

    // Check for JWT tokens
    const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;

    return (
      credentialPatterns.some((pattern) => pattern.test(serialized)) ||
      jwtPattern.test(serialized)
    );
  }

  /**
   * Classify parameter data sensitivity
   *
   * @param param - Parameter to classify
   * @returns Data classification level
   */
  private async classifyParameterData(param: any): Promise<DataClassification> {
    const hasPII = await this.detectPII(param);
    const hasCredentials = await this.detectCredentials(param);

    if (hasCredentials) return DataClassification.RESTRICTED;
    if (hasPII) return DataClassification.CONFIDENTIAL;

    const serialized = await this.serializeParameter(param);

    // Check for internal identifiers
    if (/\b(id|uuid|guid)\b/i.test(serialized)) {
      return DataClassification.INTERNAL;
    }

    return DataClassification.PUBLIC;
  }

  /**
   * Assess security risk of parameter
   *
   * @param param - Parameter to assess
   * @returns Security risk level
   */
  private async assessParameterSecurityRisk(
    param: any,
  ): Promise<SecurityRiskLevel> {
    const hasCredentials = await this.detectCredentials(param);
    const hasPII = await this.detectPII(param);
    const complexity = this.calculateParameterComplexity(param);
    const size = this.calculateParameterSize(param);

    if (hasCredentials) return SecurityRiskLevel.CRITICAL;
    if (hasPII) return SecurityRiskLevel.HIGH;
    if (complexity > 80 || size > 100000) return SecurityRiskLevel.MEDIUM;

    return SecurityRiskLevel.LOW;
  }

  /**
   * Apply custom validation rules to parameters
   *
   * @param parameters - Captured parameters
   * @param rules - Custom validation rules
   * @param userContext - User context
   * @param functionName - Function name
   * @returns Validation results for each rule
   */
  private async applyCustomValidationRules(
    parameters: readonly CapturedParameter[],
    rules: readonly ValidationRule[],
    userContext: UserContext,
    functionName: string,
  ): Promise<CustomValidationResult[]> {
    const results: CustomValidationResult[] = [];

    // Sort rules by priority
    const sortedRules = [...rules].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0),
    );

    for (const rule of sortedRules) {
      try {
        const validationContext: ValidationContext = {
          functionName,
          parameters: parameters.map((p) => p.originalValue),
          userContext,
          conversationId: `val_${this.generateCaptureId()}`,
          previousValidations: [],
          timestamp: new Date(),
          metadata: {
            ruleId: rule.id,
            parameterCount: parameters.length,
          },
        };

        const ruleResult = await rule.validator(
          parameters.map((p) => p.originalValue),
          validationContext,
        );

        results.push({
          ruleId: rule.id,
          ruleName: rule.description,
          passed: ruleResult.approved,
          message: ruleResult.reason,
          priority: rule.priority || 0,
          continueOnFailure: rule.continueOnFailure || false,
          executionTime: ruleResult.executionTime || 0,
          metadata: ruleResult.metadata || {},
        });

        // Stop processing if rule failed and continueOnFailure is false
        if (!ruleResult.approved && !rule.continueOnFailure) {
          break;
        }
      } catch (error) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.description,
          passed: false,
          message: `Rule execution failed: ${error instanceof Error ? error.message : String(error)}`,
          priority: rule.priority || 0,
          continueOnFailure: rule.continueOnFailure || false,
          executionTime: 0,
          metadata: {
            error: error instanceof Error ? error.message : String(error),
          },
        });

        if (!rule.continueOnFailure) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Create PARLANT validation context from captured parameters
   *
   * @param functionName - Function name
   * @param parameters - Sanitized parameters
   * @param userContext - User context
   * @param typeAnalysis - Type analysis result
   * @param performanceAnalysis - Performance analysis result
   * @param captureId - Capture identifier
   * @returns PARLANT validation context
   */
  private async createParlantValidationContext(
    functionName: string,
    parameters: readonly CapturedParameter[],
    userContext: UserContext,
    typeAnalysis: ParameterTypeAnalysis,
    performanceAnalysis: ParameterPerformanceAnalysis,
    captureId: string,
  ): Promise<ValidationContext> {
    return {
      functionName,
      parameters: parameters.map((p) => p.originalValue),
      userContext,
      conversationId: `conv_${captureId}`,
      previousValidations: [],
      timestamp: new Date(),
      metadata: {
        captureId,
        parameterCount: parameters.length,
        complexityScore: typeAnalysis.complexityScore,
        riskFactors: typeAnalysis.riskFactors,
        estimatedProcessingTime: performanceAnalysis.estimatedProcessingTime,
        memoryFootprint: performanceAnalysis.memoryFootprint,
        sanitizedParameterCount: parameters.filter(
          (p) => p.metadata.containsPII || p.metadata.containsCredentials,
        ).length,
      },
    };
  }

  /**
   * Generate human-readable description of parameters
   *
   * @param parameters - Parameters to describe
   * @param functionName - Function name
   * @returns Human-readable description
   */
  private generateHumanReadableDescription(
    parameters: readonly CapturedParameter[],
    functionName: string,
  ): string {
    if (parameters.length === 0) {
      return `Function ${functionName} will be called with no parameters.`;
    }

    const descriptions = parameters.map((param, index) => {
      const type = param.type;
      const hasData =
        param.metadata.containsPII || param.metadata.containsCredentials;
      const sizeMB = (param.metadata.size / 1024 / 1024).toFixed(2);

      let description = `Parameter ${index + 1}: ${type}`;

      if (hasData) {
        description += " (contains sensitive data)";
      }

      if (param.metadata.size > 1024) {
        description += ` (${sizeMB} MB)`;
      }

      return description;
    });

    return `Function ${functionName} will be called with ${parameters.length} parameter(s): ${descriptions.join(", ")}.`;
  }

  /**
   * Identify key parameters for conversation focus
   *
   * @param parameters - Parameters to analyze
   * @returns Key parameter indices
   */
  private identifyKeyParameters(
    parameters: readonly CapturedParameter[],
  ): number[] {
    return parameters
      .map((param, index) => ({
        index,
        importance: this.calculateParameterImportance(param),
      }))
      .filter((item) => item.importance > 70)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 3) // Top 3 most important
      .map((item) => item.index);
  }

  /**
   * Calculate parameter importance score
   *
   * @param param - Parameter to evaluate
   * @returns Importance score (0-100)
   */
  private calculateParameterImportance(param: CapturedParameter): number {
    let score = 0;

    // Base score by type
    if (param.type === "object") score += 40;
    else if (param.type === "string") score += 30;
    else if (param.type === "number") score += 20;
    else score += 10;

    // Security relevance
    if (param.metadata.containsCredentials) score += 40;
    if (param.metadata.containsPII) score += 30;

    // Size relevance
    if (param.metadata.size > 10000) score += 20;

    // Complexity relevance
    score += Math.min(param.metadata.complexity * 0.3, 30);

    return Math.min(score, 100);
  }

  /**
   * Identify security-relevant parameters
   *
   * @param parameters - Parameters to analyze
   * @returns Security-relevant parameter indices
   */
  private identifySecurityRelevantParameters(
    parameters: readonly CapturedParameter[],
  ): number[] {
    return parameters
      .map((param, index) => ({ index, param }))
      .filter(
        (item) =>
          item.param.metadata.containsPII ||
          item.param.metadata.containsCredentials ||
          item.param.metadata.securityRisk === SecurityRiskLevel.HIGH ||
          item.param.metadata.securityRisk === SecurityRiskLevel.CRITICAL,
      )
      .map((item) => item.index);
  }

  /**
   * Determine overall data classification for parameter set
   *
   * @param parameters - Parameters to classify
   * @returns Highest classification level
   */
  private determineOverallDataClassification(
    parameters: readonly CapturedParameter[],
  ): DataClassification {
    const classifications = parameters.map(
      (p) => p.metadata.dataClassification,
    );

    if (classifications.includes(DataClassification.RESTRICTED))
      return DataClassification.RESTRICTED;
    if (classifications.includes(DataClassification.CONFIDENTIAL))
      return DataClassification.CONFIDENTIAL;
    if (classifications.includes(DataClassification.INTERNAL))
      return DataClassification.INTERNAL;

    return DataClassification.PUBLIC;
  }

  /**
   * Generate conversation prompts for PARLANT
   *
   * @param parameters - Parameters
   * @param functionName - Function name
   * @param userContext - User context
   * @returns Conversation prompts
   */
  private generateConversationPrompts(
    parameters: readonly CapturedParameter[],
    functionName: string,
    userContext: UserContext,
  ): ConversationPrompt[] {
    const prompts: ConversationPrompt[] = [];

    // General confirmation prompt
    prompts.push({
      type: "confirmation",
      message: `Do you want to execute ${functionName} with the provided parameters?`,
      priority: 1,
      requiresResponse: true,
    });

    // Security-specific prompts
    const securityParams = this.identifySecurityRelevantParameters(parameters);
    if (securityParams.length > 0) {
      prompts.push({
        type: "security_warning",
        message: `This function will process ${securityParams.length} parameter(s) containing sensitive data. Are you sure you want to proceed?`,
        priority: 10,
        requiresResponse: true,
      });
    }

    // Performance warning prompts
    const largeParams = parameters.filter((p) => p.metadata.size > 100000);
    if (largeParams.length > 0) {
      prompts.push({
        type: "performance_warning",
        message: `This function has ${largeParams.length} large parameter(s). Processing may take longer than usual. Continue?`,
        priority: 5,
        requiresResponse: false,
      });
    }

    return prompts;
  }

  /**
   * Assess parameter risks for conversation
   *
   * @param parameters - Parameters to assess
   * @param functionName - Function name
   * @returns Risk assessment
   */
  private assessParameterRisks(
    parameters: readonly CapturedParameter[],
    functionName: string,
  ): ParameterRiskAssessment {
    const riskFactors: string[] = [];
    let overallRiskLevel: SecurityRiskLevel = SecurityRiskLevel.LOW;

    // Analyze individual parameter risks
    parameters.forEach((param, index) => {
      if (param.metadata.securityRisk === SecurityRiskLevel.CRITICAL) {
        overallRiskLevel = SecurityRiskLevel.CRITICAL;
        riskFactors.push(
          `Parameter ${index + 1} contains critical security data`,
        );
      } else if (
        param.metadata.securityRisk === SecurityRiskLevel.HIGH &&
        overallRiskLevel !== SecurityRiskLevel.CRITICAL
      ) {
        overallRiskLevel = SecurityRiskLevel.HIGH;
        riskFactors.push(`Parameter ${index + 1} contains high-risk data`);
      }

      if (param.metadata.complexity > 80) {
        riskFactors.push(
          `Parameter ${index + 1} has high complexity (${param.metadata.complexity})`,
        );
      }

      if (param.metadata.size > 1000000) {
        riskFactors.push(
          `Parameter ${index + 1} is very large (${(param.metadata.size / 1024 / 1024).toFixed(2)} MB)`,
        );
      }
    });

    // Function-specific risk assessment
    if (
      functionName.toLowerCase().includes("delete") ||
      functionName.toLowerCase().includes("remove")
    ) {
      riskFactors.push("Function performs destructive operations");
      if (overallRiskLevel === SecurityRiskLevel.LOW) {
        overallRiskLevel = SecurityRiskLevel.MEDIUM;
      }
    }

    return {
      overallRiskLevel,
      riskFactors,
      recommendedValidationLevel:
        this.mapRiskToValidationLevel(overallRiskLevel),
      requiresApproval: [
        SecurityRiskLevel.CRITICAL,
        SecurityRiskLevel.HIGH,
      ].includes(overallRiskLevel),
    };
  }

  /**
   * Map security risk to validation level
   *
   * @param riskLevel - Security risk level
   * @returns Recommended validation level
   */
  private mapRiskToValidationLevel(
    riskLevel: SecurityRiskLevel,
  ): ValidationLevel {
    switch (riskLevel) {
      case SecurityRiskLevel.CRITICAL:
        return ValidationLevel.CRITICAL;
      case SecurityRiskLevel.HIGH:
        return ValidationLevel.HIGH;
      case SecurityRiskLevel.MEDIUM:
        return ValidationLevel.MEDIUM;
      case SecurityRiskLevel.LOW:
      default:
        return ValidationLevel.LOW;
    }
  }

  /**
   * Generate recommended actions for parameters
   *
   * @param parameters - Parameters
   * @param functionName - Function name
   * @param userContext - User context
   * @returns Recommended actions
   */
  private generateRecommendations(
    parameters: readonly CapturedParameter[],
    functionName: string,
    userContext: UserContext,
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];

    // Security recommendations
    const sensitiveParams = parameters.filter(
      (p) => p.metadata.containsPII || p.metadata.containsCredentials,
    );
    if (sensitiveParams.length > 0) {
      actions.push({
        type: "security",
        action: "review_sensitive_data",
        description: "Review sensitive data before proceeding",
        priority: 10,
        required: true,
      });
    }

    // Performance recommendations
    const largeParams = parameters.filter((p) => p.metadata.size > 100000);
    if (largeParams.length > 0) {
      actions.push({
        type: "performance",
        action: "monitor_execution_time",
        description: "Monitor execution time due to large parameters",
        priority: 5,
        required: false,
      });
    }

    // Validation recommendations
    const complexParams = parameters.filter((p) => p.metadata.complexity > 70);
    if (complexParams.length > 0) {
      actions.push({
        type: "validation",
        action: "validate_complex_parameters",
        description: "Validate complex parameter structures",
        priority: 7,
        required: true,
      });
    }

    return actions;
  }

  /**
   * Analyze parameter changes during conversation
   *
   * @param original - Original parameters
   * @param modified - Modified parameters
   * @returns Change analysis
   */
  private async analyzeParameterChanges(
    original: readonly CapturedParameter[],
    modified: readonly any[],
  ): Promise<ParameterChangeAnalysis> {
    const changes: ParameterChange[] = [];

    // Analyze each parameter
    for (let i = 0; i < Math.max(original.length, modified.length); i++) {
      const originalParam = original[i];
      const modifiedParam = modified[i];

      if (!originalParam && modifiedParam !== undefined) {
        // Parameter added
        changes.push({
          index: i,
          changeType: "added",
          originalValue: undefined,
          newValue: modifiedParam,
          impact: await this.assessChangeImpact(
            "added",
            undefined,
            modifiedParam,
          ),
        });
      } else if (originalParam && modifiedParam === undefined) {
        // Parameter removed
        changes.push({
          index: i,
          changeType: "removed",
          originalValue: originalParam.originalValue,
          newValue: undefined,
          impact: await this.assessChangeImpact(
            "removed",
            originalParam.originalValue,
            undefined,
          ),
        });
      } else if (originalParam && modifiedParam !== undefined) {
        // Parameter potentially modified
        const originalSerialized = await this.serializeParameter(
          originalParam.originalValue,
        );
        const modifiedSerialized = await this.serializeParameter(modifiedParam);

        if (originalSerialized !== modifiedSerialized) {
          changes.push({
            index: i,
            changeType: "modified",
            originalValue: originalParam.originalValue,
            newValue: modifiedParam,
            impact: await this.assessChangeImpact(
              "modified",
              originalParam.originalValue,
              modifiedParam,
            ),
          });
        }
      }
    }

    return {
      hasChanges: changes.length > 0,
      changeCount: changes.length,
      changes,
      overallImpact: this.calculateOverallChangeImpact(changes),
    };
  }

  /**
   * Assess impact of a parameter change
   *
   * @param changeType - Type of change
   * @param originalValue - Original value
   * @param newValue - New value
   * @returns Change impact level
   */
  private async assessChangeImpact(
    changeType: "added" | "removed" | "modified",
    originalValue: any,
    newValue: any,
  ): Promise<ChangeImpactLevel> {
    switch (changeType) {
      case "added":
        const newValueHasPII = await this.detectPII(newValue);
        const newValueHasCredentials = await this.detectCredentials(newValue);
        if (newValueHasCredentials) return ChangeImpactLevel.CRITICAL;
        if (newValueHasPII) return ChangeImpactLevel.HIGH;
        return ChangeImpactLevel.MEDIUM;

      case "removed":
        const originalHasPII = await this.detectPII(originalValue);
        const originalHasCredentials =
          await this.detectCredentials(originalValue);
        if (originalHasCredentials) return ChangeImpactLevel.HIGH;
        if (originalHasPII) return ChangeImpactLevel.MEDIUM;
        return ChangeImpactLevel.LOW;

      case "modified":
        const bothHaveCredentials =
          (await this.detectCredentials(originalValue)) &&
          (await this.detectCredentials(newValue));
        const bothHavePII =
          (await this.detectPII(originalValue)) &&
          (await this.detectPII(newValue));

        if (bothHaveCredentials) return ChangeImpactLevel.CRITICAL;
        if (bothHavePII) return ChangeImpactLevel.HIGH;

        const originalSize = this.calculateParameterSize(originalValue);
        const newSize = this.calculateParameterSize(newValue);
        const sizeChange =
          Math.abs(newSize - originalSize) / Math.max(originalSize, 1);

        if (sizeChange > 0.5) return ChangeImpactLevel.MEDIUM;
        return ChangeImpactLevel.LOW;

      default:
        return ChangeImpactLevel.LOW;
    }
  }

  /**
   * Calculate overall change impact
   *
   * @param changes - Parameter changes
   * @returns Overall impact level
   */
  private calculateOverallChangeImpact(
    changes: readonly ParameterChange[],
  ): ChangeImpactLevel {
    if (changes.length === 0) return ChangeImpactLevel.NONE;

    const impacts = changes.map((c) => c.impact);

    if (impacts.includes(ChangeImpactLevel.CRITICAL))
      return ChangeImpactLevel.CRITICAL;
    if (impacts.includes(ChangeImpactLevel.HIGH)) return ChangeImpactLevel.HIGH;
    if (impacts.includes(ChangeImpactLevel.MEDIUM))
      return ChangeImpactLevel.MEDIUM;

    return ChangeImpactLevel.LOW;
  }

  /**
   * Assess security impact of parameter changes
   *
   * @param changeAnalysis - Change analysis
   * @param userContext - User context
   * @returns Security impact assessment
   */
  private async assessSecurityImpactOfChanges(
    changeAnalysis: ParameterChangeAnalysis,
    userContext: UserContext,
  ): Promise<SecurityImpactAssessment> {
    const securityViolations: string[] = [];
    let requiresApproval = false;
    let acceptableRisk = true;

    // Check for high-impact changes
    const criticalChanges = changeAnalysis.changes.filter(
      (c) => c.impact === ChangeImpactLevel.CRITICAL,
    );
    if (criticalChanges.length > 0) {
      securityViolations.push(
        `${criticalChanges.length} critical security changes detected`,
      );
      requiresApproval = true;
      acceptableRisk = false;
    }

    // Check for credential-related changes
    for (const change of changeAnalysis.changes) {
      if (
        change.changeType === "added" &&
        (await this.detectCredentials(change.newValue))
      ) {
        securityViolations.push(
          `New credential parameter added at index ${change.index}`,
        );
        requiresApproval = true;
      }
    }

    // Check user permissions for changes
    if (
      changeAnalysis.hasChanges &&
      !userContext.permissions.includes("modify-parameters")
    ) {
      securityViolations.push("User lacks permission to modify parameters");
      acceptableRisk = false;
    }

    return {
      acceptableRisk,
      requiresApproval,
      securityViolations,
      riskMitigations: this.generateRiskMitigations(securityViolations),
    };
  }

  /**
   * Generate risk mitigations for security violations
   *
   * @param violations - Security violations
   * @returns Risk mitigation strategies
   */
  private generateRiskMitigations(violations: readonly string[]): string[] {
    const mitigations: string[] = [];

    violations.forEach((violation) => {
      if (violation.includes("credential")) {
        mitigations.push("Encrypt credential parameters before processing");
        mitigations.push("Log credential access for audit trail");
      } else if (violation.includes("permission")) {
        mitigations.push("Request elevated permissions from administrator");
        mitigations.push("Use read-only mode if available");
      } else if (violation.includes("critical")) {
        mitigations.push(
          "Require multi-factor authentication for critical changes",
        );
        mitigations.push("Create backup before applying changes");
      }
    });

    return mitigations;
  }

  /**
   * Assess business impact of parameter changes
   *
   * @param changeAnalysis - Change analysis
   * @param originalParameters - Original parameters
   * @returns Business impact assessment
   */
  private async assessBusinessImpactOfChanges(
    changeAnalysis: ParameterChangeAnalysis,
    originalParameters: readonly CapturedParameter[],
  ): Promise<BusinessImpactAssessment> {
    const impactFactors: string[] = [];
    let acceptableImpact = true;

    // Assess data loss risk
    const removedParams = changeAnalysis.changes.filter(
      (c) => c.changeType === "removed",
    );
    if (removedParams.length > 0) {
      impactFactors.push(
        `${removedParams.length} parameter(s) removed - potential data loss`,
      );
    }

    // Assess processing time impact
    const sizeChanges = changeAnalysis.changes
      .filter((c) => c.changeType === "added" || c.changeType === "modified")
      .map((c) => this.calculateParameterSize(c.newValue))
      .reduce((sum, size) => sum + size, 0);

    if (sizeChanges > 1000000) {
      // > 1MB
      impactFactors.push(
        `Large parameter changes may impact processing time (${(sizeChanges / 1024 / 1024).toFixed(2)} MB)`,
      );
    }

    // Assess complexity impact
    const highImpactChanges = changeAnalysis.changes.filter(
      (c) =>
        c.impact === ChangeImpactLevel.HIGH ||
        c.impact === ChangeImpactLevel.CRITICAL,
    );

    if (highImpactChanges.length > originalParameters.length * 0.5) {
      impactFactors.push("Majority of parameters have high-impact changes");
      acceptableImpact = false;
    }

    return {
      acceptableImpact,
      impactFactors,
      mitigationStrategies: this.generateImpactMitigations(impactFactors),
    };
  }

  /**
   * Generate impact mitigation strategies
   *
   * @param factors - Impact factors
   * @returns Mitigation strategies
   */
  private generateImpactMitigations(factors: readonly string[]): string[] {
    const strategies: string[] = [];

    factors.forEach((factor) => {
      if (factor.includes("data loss")) {
        strategies.push("Create parameter backup before applying changes");
        strategies.push("Validate removed parameters are not critical");
      } else if (factor.includes("processing time")) {
        strategies.push("Consider parameter compression or chunking");
        strategies.push("Increase timeout limits for execution");
      } else if (factor.includes("high-impact")) {
        strategies.push("Apply changes incrementally with validation");
        strategies.push("Implement rollback mechanism");
      }
    });

    return strategies;
  }

  /**
   * Generate rejection reason for parameter changes
   *
   * @param securityImpact - Security impact
   * @param businessImpact - Business impact
   * @returns Rejection reason
   */
  private generateRejectionReason(
    securityImpact: SecurityImpactAssessment,
    businessImpact: BusinessImpactAssessment,
  ): string {
    const reasons: string[] = [];

    if (!securityImpact.acceptableRisk) {
      reasons.push("Security risk too high");
      reasons.push(...securityImpact.securityViolations);
    }

    if (!businessImpact.acceptableImpact) {
      reasons.push("Business impact too significant");
      reasons.push(...businessImpact.impactFactors);
    }

    return reasons.join("; ");
  }

  /**
   * Generate recommendations for parameter changes
   *
   * @param changeAnalysis - Change analysis
   * @param securityImpact - Security impact
   * @param businessImpact - Business impact
   * @returns Change recommendations
   */
  private generateChangeRecommendations(
    changeAnalysis: ParameterChangeAnalysis,
    securityImpact: SecurityImpactAssessment,
    businessImpact: BusinessImpactAssessment,
  ): string[] {
    const recommendations: string[] = [];

    // Security recommendations
    recommendations.push(...securityImpact.riskMitigations);

    // Business recommendations
    recommendations.push(...businessImpact.mitigationStrategies);

    // General recommendations
    if (changeAnalysis.changeCount > 5) {
      recommendations.push("Consider splitting changes into smaller batches");
    }

    if (changeAnalysis.overallImpact === ChangeImpactLevel.CRITICAL) {
      recommendations.push(
        "Require administrator approval for critical changes",
      );
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }
}

/**
 * Parameter Sanitizer
 * Handles sanitization of parameters for secure processing
 */
export class ParameterSanitizer {
  private readonly logger = new Logger(ParameterSanitizer.name);

  /**
   * Sanitize parameters for PARLANT context
   *
   * @param parameters - Parameters to sanitize
   * @param sensitiveIndices - Indices of sensitive parameters
   * @returns Sanitized parameters
   */
  public async sanitizeParameters(
    parameters: readonly CapturedParameter[],
    sensitiveIndices: readonly number[],
  ): Promise<CapturedParameter[]> {
    const sanitized: CapturedParameter[] = [];

    for (let i = 0; i < parameters.length; i++) {
      const param = parameters[i];
      const isSensitive = sensitiveIndices.includes(i);

      const sanitizedParam: CapturedParameter = {
        ...param,
        serializedValue: isSensitive
          ? await this.sanitizeSensitiveValue(
              param.serializedValue,
              param.metadata,
            )
          : param.serializedValue,
      };

      sanitized.push(sanitizedParam);
    }

    return sanitized;
  }

  /**
   * Sanitize sensitive parameter value
   *
   * @param value - Value to sanitize
   * @param metadata - Parameter metadata
   * @returns Sanitized value
   */
  private async sanitizeSensitiveValue(
    value: string,
    metadata: ParameterMetadata,
  ): Promise<string> {
    if (metadata.containsCredentials) {
      return "[CREDENTIALS_REDACTED]";
    }

    if (metadata.containsPII) {
      return this.redactPII(value);
    }

    if (metadata.size > 10000) {
      return value.substring(0, 100) + "...[TRUNCATED_FOR_SECURITY]";
    }

    return value;
  }

  /**
   * Redact PII from value
   *
   * @param value - Value containing PII
   * @returns Redacted value
   */
  private redactPII(value: string): string {
    let redacted = value;

    // Redact common PII patterns
    redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "XXX-XX-XXXX"); // SSN
    redacted = redacted.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      "[EMAIL_REDACTED]",
    ); // Email
    redacted = redacted.replace(
      /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g,
      "XXXX XXXX XXXX XXXX",
    ); // Credit card
    redacted = redacted.replace(/\b\d{3}-\d{3}-\d{4}\b/g, "XXX-XXX-XXXX"); // Phone

    return redacted;
  }
}

/**
 * Parameter Type Analyzer
 * Analyzes parameter types and structures
 */
export class ParameterTypeAnalyzer {
  private readonly logger = new Logger(ParameterTypeAnalyzer.name);

  /**
   * Analyze parameter types comprehensively
   *
   * @param parameters - Parameters to analyze
   * @param functionName - Function name for context
   * @returns Type analysis result
   */
  public async analyzeParameterTypes(
    parameters: readonly CapturedParameter[],
    functionName: string,
  ): Promise<ParameterTypeAnalysis> {
    const parameterTypes = parameters.map((p) => this.analyzeParameterType(p));
    const complexityScore = this.calculateOverallComplexity(parameters);
    const riskFactors = this.identifyRiskFactors(parameters, functionName);

    return {
      parameterTypes,
      complexityScore,
      riskFactors,
    };
  }

  /**
   * Analyze individual parameter type
   *
   * @param parameter - Parameter to analyze
   * @returns Type analysis
   */
  private analyzeParameterType(
    parameter: CapturedParameter,
  ): ParameterTypeInfo {
    const baseType = parameter.type;
    let detailedType = baseType;
    let isCollection = false;
    let elementCount = 0;

    // Detailed type analysis
    if (Array.isArray(parameter.originalValue)) {
      detailedType = `Array<${this.inferArrayElementType(parameter.originalValue)}>`;
      isCollection = true;
      elementCount = parameter.originalValue.length;
    } else if (
      parameter.originalValue &&
      typeof parameter.originalValue === "object"
    ) {
      if (parameter.originalValue.constructor.name !== "Object") {
        detailedType = parameter.originalValue.constructor.name;
      } else {
        detailedType = "Object";
        elementCount = Object.keys(parameter.originalValue).length;
      }
    }

    return {
      baseType,
      detailedType,
      isCollection,
      elementCount,
      nullable:
        parameter.originalValue === null ||
        parameter.originalValue === undefined,
      complexity: parameter.metadata.complexity,
    };
  }

  /**
   * Infer array element type
   *
   * @param array - Array to analyze
   * @returns Element type
   */
  private inferArrayElementType(array: any[]): string {
    if (array.length === 0) return "unknown";

    const types = new Set(array.map((item) => typeof item));
    if (types.size === 1) {
      return Array.from(types)[0];
    }

    return "mixed";
  }

  /**
   * Calculate overall complexity score
   *
   * @param parameters - Parameters to analyze
   * @returns Complexity score (0-100)
   */
  private calculateOverallComplexity(
    parameters: readonly CapturedParameter[],
  ): number {
    if (parameters.length === 0) return 0;

    const totalComplexity = parameters.reduce(
      (sum, p) => sum + p.metadata.complexity,
      0,
    );
    const averageComplexity = totalComplexity / parameters.length;

    // Adjust for parameter count
    const countFactor = Math.min(parameters.length / 10, 1);

    return Math.min(averageComplexity + countFactor * 20, 100);
  }

  /**
   * Identify risk factors in parameters
   *
   * @param parameters - Parameters to analyze
   * @param functionName - Function name
   * @returns Risk factors
   */
  private identifyRiskFactors(
    parameters: readonly CapturedParameter[],
    functionName: string,
  ): string[] {
    const riskFactors: string[] = [];

    // Parameter count risks
    if (parameters.length > 10) {
      riskFactors.push(`High parameter count (${parameters.length})`);
    }

    // Complexity risks
    const highComplexityParams = parameters.filter(
      (p) => p.metadata.complexity > 80,
    );
    if (highComplexityParams.length > 0) {
      riskFactors.push(
        `${highComplexityParams.length} high-complexity parameters`,
      );
    }

    // Size risks
    const largeParams = parameters.filter((p) => p.metadata.size > 100000);
    if (largeParams.length > 0) {
      riskFactors.push(`${largeParams.length} large parameters (>100KB)`);
    }

    // Security risks
    const sensitiveParams = parameters.filter(
      (p) => p.metadata.containsPII || p.metadata.containsCredentials,
    );
    if (sensitiveParams.length > 0) {
      riskFactors.push(
        `${sensitiveParams.length} parameters with sensitive data`,
      );
    }

    // Function-specific risks
    if (
      functionName.toLowerCase().includes("sql") ||
      functionName.toLowerCase().includes("query")
    ) {
      riskFactors.push("SQL injection risk due to function type");
    }

    return riskFactors;
  }
}

/**
 * Parameter Security Validator
 * Validates parameter security and identifies violations
 */
export class ParameterSecurityValidator {
  private readonly logger = new Logger(ParameterSecurityValidator.name);

  /**
   * Validate parameter security
   *
   * @param parameters - Parameters to validate
   * @param userContext - User context
   * @param validationLevel - Required validation level
   * @returns Security validation result
   */
  public async validateParameterSecurity(
    parameters: readonly CapturedParameter[],
    userContext: UserContext,
    validationLevel: ValidationLevel,
  ): Promise<ParameterSecurityValidationResult> {
    const violations: string[] = [];
    const sensitiveParameterIndices: number[] = [];

    // Validate each parameter
    for (let i = 0; i < parameters.length; i++) {
      const param = parameters[i];
      const paramViolations = await this.validateParameterSecurityIndividual(
        param,
        userContext,
        validationLevel,
        i,
      );

      violations.push(...paramViolations);

      if (param.metadata.containsPII || param.metadata.containsCredentials) {
        sensitiveParameterIndices.push(i);
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      sensitiveParameterIndices,
    };
  }

  /**
   * Validate individual parameter security
   *
   * @param parameter - Parameter to validate
   * @param userContext - User context
   * @param validationLevel - Required validation level
   * @param index - Parameter index
   * @returns Security violations
   */
  private async validateParameterSecurityIndividual(
    parameter: CapturedParameter,
    userContext: UserContext,
    validationLevel: ValidationLevel,
    index: number,
  ): Promise<string[]> {
    const violations: string[] = [];

    // Check credentials access permissions
    if (parameter.metadata.containsCredentials) {
      if (!userContext.permissions.includes("access-credentials")) {
        violations.push(
          `Parameter ${index + 1}: User lacks permission to access credentials`,
        );
      }

      if (validationLevel === ValidationLevel.LOW) {
        violations.push(
          `Parameter ${index + 1}: Credentials require higher validation level`,
        );
      }
    }

    // Check PII access permissions
    if (parameter.metadata.containsPII) {
      if (!userContext.permissions.includes("access-pii")) {
        violations.push(
          `Parameter ${index + 1}: User lacks permission to access PII`,
        );
      }
    }

    // Check parameter size limits
    if (parameter.metadata.size > 10000000) {
      // 10MB
      violations.push(
        `Parameter ${index + 1}: Exceeds maximum size limit (${(parameter.metadata.size / 1024 / 1024).toFixed(2)} MB)`,
      );
    }

    // Check security risk level
    if (parameter.metadata.securityRisk === SecurityRiskLevel.CRITICAL) {
      if (validationLevel !== ValidationLevel.CRITICAL) {
        violations.push(
          `Parameter ${index + 1}: Critical security risk requires critical validation level`,
        );
      }
    }

    return violations;
  }
}

/**
 * Parameter Performance Optimizer
 * Optimizes parameter processing for performance
 */
export class ParameterPerformanceOptimizer {
  private readonly logger = new Logger(ParameterPerformanceOptimizer.name);

  /**
   * Analyze parameter performance characteristics
   *
   * @param parameters - Parameters to analyze
   * @param typeAnalysis - Type analysis result
   * @returns Performance analysis
   */
  public async analyzeParameterPerformance(
    parameters: readonly CapturedParameter[],
    typeAnalysis: ParameterTypeAnalysis,
  ): Promise<ParameterPerformanceAnalysis> {
    const estimatedProcessingTime = this.estimateProcessingTime(parameters);
    const memoryFootprint = this.estimateMemoryFootprint(parameters);
    const optimizationRecommendations =
      this.generateOptimizationRecommendations(parameters, typeAnalysis);

    return {
      estimatedProcessingTime,
      memoryFootprint,
      optimizationRecommendations,
    };
  }

  /**
   * Estimate processing time for parameters
   *
   * @param parameters - Parameters to analyze
   * @returns Estimated processing time in milliseconds
   */
  private estimateProcessingTime(
    parameters: readonly CapturedParameter[],
  ): number {
    let totalTime = 0;

    parameters.forEach((param) => {
      // Base processing time
      totalTime += 10; // 10ms base per parameter

      // Size-based time
      const sizeMB = param.metadata.size / 1024 / 1024;
      totalTime += sizeMB * 100; // 100ms per MB

      // Complexity-based time
      totalTime += (param.metadata.complexity / 100) * 50; // Up to 50ms for complexity

      // Security processing time
      if (param.metadata.containsPII || param.metadata.containsCredentials) {
        totalTime += 200; // Additional 200ms for security processing
      }
    });

    return Math.round(totalTime);
  }

  /**
   * Estimate memory footprint for parameters
   *
   * @param parameters - Parameters to analyze
   * @returns Estimated memory footprint in bytes
   */
  private estimateMemoryFootprint(
    parameters: readonly CapturedParameter[],
  ): number {
    const totalSize = parameters.reduce(
      (sum, param) => sum + param.metadata.size,
      0,
    );

    // Account for processing overhead (typically 2-3x)
    const processingOverhead = totalSize * 2.5;

    // Account for serialization and validation overhead
    const validationOverhead = parameters.length * 1024; // 1KB per parameter

    return Math.round(totalSize + processingOverhead + validationOverhead);
  }

  /**
   * Generate optimization recommendations
   *
   * @param parameters - Parameters to analyze
   * @param typeAnalysis - Type analysis
   * @returns Optimization recommendations
   */
  private generateOptimizationRecommendations(
    parameters: readonly CapturedParameter[],
    typeAnalysis: ParameterTypeAnalysis,
  ): string[] {
    const recommendations: string[] = [];

    // Large parameter recommendations
    const largeParams = parameters.filter((p) => p.metadata.size > 1000000);
    if (largeParams.length > 0) {
      recommendations.push(
        "Consider compressing large parameters before processing",
      );
      recommendations.push("Use streaming processing for large data sets");
    }

    // Complex parameter recommendations
    if (typeAnalysis.complexityScore > 80) {
      recommendations.push("Simplify complex parameter structures if possible");
      recommendations.push(
        "Consider breaking complex operations into smaller steps",
      );
    }

    // Performance recommendations based on parameter count
    if (parameters.length > 10) {
      recommendations.push(
        "Consider using batch processing for multiple parameters",
      );
      recommendations.push("Implement parameter validation caching");
    }

    // Security performance recommendations
    const sensitiveParams = parameters.filter(
      (p) => p.metadata.containsPII || p.metadata.containsCredentials,
    );
    if (sensitiveParams.length > 0) {
      recommendations.push(
        "Cache security validation results where appropriate",
      );
      recommendations.push("Use secure parameter serialization");
    }

    return recommendations;
  }
}

// Type Definitions

/**
 * Security risk level enumeration
 */
export enum SecurityRiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Change impact level enumeration
 */
export enum ChangeImpactLevel {
  NONE = "none",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Captured parameter with metadata
 */
export interface CapturedParameter {
  readonly index: number;
  readonly originalValue: any;
  readonly type: string;
  readonly serializedValue: string;
  readonly metadata: ParameterMetadata;
}

/**
 * Parameter metadata
 */
export interface ParameterMetadata {
  readonly captureId: string;
  readonly functionName: string;
  readonly captureTimestamp: Date;
  readonly size: number;
  readonly complexity: number;
  readonly containsPII: boolean;
  readonly containsCredentials: boolean;
  readonly dataClassification: DataClassification;
  readonly securityRisk: SecurityRiskLevel;
}

/**
 * Parameter validation result
 */
export interface ParameterValidationResult {
  readonly captureId: string;
  readonly functionName: string;
  readonly originalParameters: readonly any[];
  readonly capturedParameters: readonly CapturedParameter[];
  readonly sanitizedParameters: readonly CapturedParameter[];
  readonly typeAnalysis: ParameterTypeAnalysis;
  readonly securityValidation: ParameterSecurityValidationResult;
  readonly customValidationResults: readonly CustomValidationResult[];
  readonly performanceAnalysis: ParameterPerformanceAnalysis;
  readonly parlantContext: ValidationContext | null;
  readonly validationPassed: boolean;
  readonly executionTime: number;
  readonly error?: WrapperError;
  readonly metadata: Record<string, any>;
}

/**
 * Parameter type analysis result
 */
export interface ParameterTypeAnalysis {
  readonly parameterTypes: readonly ParameterTypeInfo[];
  readonly complexityScore: number;
  readonly riskFactors: readonly string[];
}

/**
 * Parameter type information
 */
export interface ParameterTypeInfo {
  readonly baseType: string;
  readonly detailedType: string;
  readonly isCollection: boolean;
  readonly elementCount: number;
  readonly nullable: boolean;
  readonly complexity: number;
}

/**
 * Parameter security validation result
 */
export interface ParameterSecurityValidationResult {
  readonly passed: boolean;
  readonly violations: readonly string[];
  readonly sensitiveParameterIndices: readonly number[];
}

/**
 * Custom validation result
 */
export interface CustomValidationResult {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly passed: boolean;
  readonly message: string;
  readonly priority: number;
  readonly continueOnFailure: boolean;
  readonly executionTime: number;
  readonly metadata: Record<string, any>;
}

/**
 * Parameter performance analysis
 */
export interface ParameterPerformanceAnalysis {
  readonly estimatedProcessingTime: number;
  readonly memoryFootprint: number;
  readonly optimizationRecommendations: readonly string[];
}

/**
 * Parameter conversation summary
 */
export interface ParameterConversationSummary {
  readonly functionName: string;
  readonly parameterCount: number;
  readonly humanReadableDescription: string;
  readonly keyParameters: readonly number[];
  readonly securityRelevantParameters: readonly number[];
  readonly dataClassificationLevel: DataClassification;
  readonly conversationPrompts: readonly ConversationPrompt[];
  readonly riskAssessment: ParameterRiskAssessment;
  readonly recommendedActions: readonly RecommendedAction[];
}

/**
 * Conversation prompt
 */
export interface ConversationPrompt {
  readonly type:
    | "confirmation"
    | "security_warning"
    | "performance_warning"
    | "information";
  readonly message: string;
  readonly priority: number;
  readonly requiresResponse: boolean;
}

/**
 * Parameter risk assessment
 */
export interface ParameterRiskAssessment {
  readonly overallRiskLevel: SecurityRiskLevel;
  readonly riskFactors: readonly string[];
  readonly recommendedValidationLevel: ValidationLevel;
  readonly requiresApproval: boolean;
}

/**
 * Recommended action
 */
export interface RecommendedAction {
  readonly type: "security" | "performance" | "validation" | "optimization";
  readonly action: string;
  readonly description: string;
  readonly priority: number;
  readonly required: boolean;
}

/**
 * Parameter change validation result
 */
export interface ParameterChangeValidationResult {
  readonly changeAnalysis: ParameterChangeAnalysis;
  readonly securityImpact: SecurityImpactAssessment;
  readonly businessImpact: BusinessImpactAssessment;
  readonly validationPassed: boolean;
  readonly approvalRequired: boolean;
  readonly rejectionReason: string | null;
  readonly recommendations: readonly string[];
}

/**
 * Parameter change analysis
 */
export interface ParameterChangeAnalysis {
  readonly hasChanges: boolean;
  readonly changeCount: number;
  readonly changes: readonly ParameterChange[];
  readonly overallImpact: ChangeImpactLevel;
}

/**
 * Parameter change
 */
export interface ParameterChange {
  readonly index: number;
  readonly changeType: "added" | "removed" | "modified";
  readonly originalValue: any;
  readonly newValue: any;
  readonly impact: ChangeImpactLevel;
}

/**
 * Security impact assessment
 */
export interface SecurityImpactAssessment {
  readonly acceptableRisk: boolean;
  readonly requiresApproval: boolean;
  readonly securityViolations: readonly string[];
  readonly riskMitigations: readonly string[];
}

/**
 * Business impact assessment
 */
export interface BusinessImpactAssessment {
  readonly acceptableImpact: boolean;
  readonly impactFactors: readonly string[];
  readonly mitigationStrategies: readonly string[];
}
