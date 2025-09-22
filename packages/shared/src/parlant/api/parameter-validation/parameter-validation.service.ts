/**
 * PARLANT Phase 1 - Parameter Validation Service
 *
 * Comprehensive parameter validation enabling conversational parameter verification
 * and sanitization with enterprise-grade security and intelligent user guidance.
 *
 * Features:
 * - Conversational parameter interpretation and validation
 * - Multi-layer validation (syntax, semantics, business rules)
 * - Intelligent sanitization with user confirmation
 * - Natural language parameter format conversion
 * - Enterprise-grade security against injection attacks
 * - Sub-200ms parameter validation response times
 *
 * @module ParameterValidationService
 * @version 1.0.0
 * @author AIgent PARLANT Integration Team
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ValidationRequest,
  ValidationResponse,
  ConversationContext,
  ValidationDecision,
  SecurityLevel,
  RiskLevel
} from '../../validation/types/validation-layer.types';
import { ParlantValidationBridge } from '../../validation/parlant-validation-bridge.service';
import { ConversationContextBuilder } from '../../validation/context/conversation-context-builder.service';

// ===== PARAMETER VALIDATION INTERFACES =====

export interface ParameterValidationRequest {
  /** Function name being validated */
  functionName: string;

  /** Raw parameters provided by user */
  rawParameters: Record<string, any>;

  /** Expected parameter schema */
  expectedSchema: ParameterSchema;

  /** User context for validation */
  userContext: UserContext;

  /** Validation options */
  options: ValidationOptions;
}

export interface ParameterValidationResponse {
  /** Validation success status */
  isValid: boolean;

  /** Sanitized and validated parameters */
  validatedParameters: Record<string, any>;

  /** Conversational validation result */
  conversationalResult: ValidationResponse;

  /** Parameter validation details */
  validationDetails: ParameterValidationDetails;

  /** Security assessment */
  securityAssessment: SecurityAssessment;

  /** Performance metrics */
  performanceMetrics: PerformanceMetrics;
}

export interface ParameterSchema {
  /** Parameter definitions */
  parameters: Record<string, ParameterDefinition>;

  /** Required parameters */
  required: string[];

  /** Business rules */
  businessRules: BusinessRule[];

  /** Security constraints */
  securityConstraints: SecurityConstraint[];
}

export interface ParameterDefinition {
  /** Parameter type */
  type: ParameterType;

  /** Human-readable description */
  description: string;

  /** Validation rules */
  validationRules: ValidationRule[];

  /** Default value */
  defaultValue?: any;

  /** Sanitization rules */
  sanitizationRules: SanitizationRule[];

  /** Security classification */
  securityLevel: SecurityLevel;

  /** Natural language examples */
  examples: string[];
}

export enum ParameterType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  DATE = 'date',
  EMAIL = 'email',
  URL = 'url',
  FILE_PATH = 'file_path',
  JSON = 'json',
  ENUM = 'enum'
}

export interface ValidationRule {
  /** Rule type */
  type: ValidationRuleType;

  /** Rule configuration */
  config: Record<string, any>;

  /** Error message template */
  errorMessage: string;

  /** Conversational explanation */
  conversationalExplanation: string;
}

export enum ValidationRuleType {
  MIN_LENGTH = 'min_length',
  MAX_LENGTH = 'max_length',
  REGEX_PATTERN = 'regex_pattern',
  RANGE = 'range',
  ENUM_VALUES = 'enum_values',
  CUSTOM_FUNCTION = 'custom_function',
  DEPENDENCY = 'dependency',
  CONDITIONAL = 'conditional'
}

export interface SanitizationRule {
  /** Sanitization type */
  type: SanitizationType;

  /** Sanitization configuration */
  config: Record<string, any>;

  /** Require user confirmation */
  requireConfirmation: boolean;

  /** Conversational explanation */
  explanation: string;
}

export enum SanitizationType {
  TRIM_WHITESPACE = 'trim_whitespace',
  ESCAPE_HTML = 'escape_html',
  REMOVE_SCRIPT_TAGS = 'remove_script_tags',
  SQL_INJECTION_PREVENTION = 'sql_injection_prevention',
  XSS_PREVENTION = 'xss_prevention',
  PATH_TRAVERSAL_PREVENTION = 'path_traversal_prevention',
  NORMALIZE_UNICODE = 'normalize_unicode',
  VALIDATE_ENCODING = 'validate_encoding'
}

export interface BusinessRule {
  /** Rule identifier */
  id: string;

  /** Rule description */
  description: string;

  /** Rule condition */
  condition: string;

  /** Rule severity */
  severity: RuleSeverity;

  /** Conversational explanation */
  conversationalExplanation: string;
}

export enum RuleSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface SecurityConstraint {
  /** Constraint type */
  type: SecurityConstraintType;

  /** Constraint configuration */
  config: Record<string, any>;

  /** Risk level */
  riskLevel: RiskLevel;

  /** Mitigation strategies */
  mitigationStrategies: string[];
}

export enum SecurityConstraintType {
  INJECTION_PREVENTION = 'injection_prevention',
  ACCESS_CONTROL = 'access_control',
  DATA_CLASSIFICATION = 'data_classification',
  AUDIT_REQUIREMENT = 'audit_requirement',
  ENCRYPTION_REQUIREMENT = 'encryption_requirement'
}

export interface ParameterValidationDetails {
  /** Individual parameter results */
  parameterResults: Record<string, ParameterResult>;

  /** Business rule violations */
  businessRuleViolations: BusinessRuleViolation[];

  /** Security violations */
  securityViolations: SecurityViolation[];

  /** Sanitization actions taken */
  sanitizationActions: SanitizationAction[];

  /** Validation warnings */
  warnings: ValidationWarning[];
}

export interface ParameterResult {
  /** Parameter name */
  name: string;

  /** Original value */
  originalValue: any;

  /** Sanitized value */
  sanitizedValue: any;

  /** Validation status */
  status: ParameterValidationStatus;

  /** Validation messages */
  messages: string[];

  /** Type conversion performed */
  typeConversion?: TypeConversion;
}

export enum ParameterValidationStatus {
  VALID = 'valid',
  INVALID = 'invalid',
  SANITIZED = 'sanitized',
  TYPE_CONVERTED = 'type_converted',
  DEFAULT_APPLIED = 'default_applied'
}

export interface TypeConversion {
  /** Original type */
  fromType: string;

  /** Target type */
  toType: string;

  /** Conversion strategy */
  strategy: string;

  /** Success status */
  success: boolean;

  /** Conversion notes */
  notes: string;
}

export interface SecurityAssessment {
  /** Overall security level */
  overallSecurityLevel: SecurityLevel;

  /** Threat indicators */
  threatIndicators: ThreatIndicator[];

  /** Risk score (0-100) */
  riskScore: number;

  /** Recommended actions */
  recommendedActions: string[];

  /** Audit requirements */
  auditRequirements: AuditRequirement[];
}

export interface ThreatIndicator {
  /** Threat type */
  type: ThreatType;

  /** Threat description */
  description: string;

  /** Severity level */
  severity: RiskLevel;

  /** Affected parameters */
  affectedParameters: string[];

  /** Mitigation applied */
  mitigationApplied: boolean;
}

export enum ThreatType {
  SQL_INJECTION = 'sql_injection',
  XSS_ATTACK = 'xss_attack',
  PATH_TRAVERSAL = 'path_traversal',
  COMMAND_INJECTION = 'command_injection',
  LDAP_INJECTION = 'ldap_injection',
  XML_INJECTION = 'xml_injection',
  SCRIPT_INJECTION = 'script_injection',
  DATA_EXFILTRATION = 'data_exfiltration'
}

export interface AuditRequirement {
  /** Audit type */
  type: string;

  /** Required detail level */
  detailLevel: string;

  /** Retention period */
  retentionPeriod: number;

  /** Compliance frameworks */
  complianceFrameworks: string[];
}

export interface PerformanceMetrics {
  /** Total validation time (ms) */
  totalValidationTime: number;

  /** Parsing time (ms) */
  parsingTime: number;

  /** Validation time (ms) */
  validationTime: number;

  /** Sanitization time (ms) */
  sanitizationTime: number;

  /** Conversational validation time (ms) */
  conversationalValidationTime: number;

  /** Memory usage (bytes) */
  memoryUsage: number;

  /** Parameters processed count */
  parametersProcessed: number;
}

export interface ValidationOptions {
  /** Enable strict validation */
  strictValidation: boolean;

  /** Enable conversational validation */
  enableConversationalValidation: boolean;

  /** Auto-sanitize parameters */
  autoSanitize: boolean;

  /** Require user confirmation for sanitization */
  requireSanitizationConfirmation: boolean;

  /** Target performance (ms) */
  targetPerformanceMs: number;

  /** Enable intelligent type conversion */
  enableTypeConversion: boolean;

  /** Enable parameter learning */
  enableParameterLearning: boolean;
}

export interface UserContext {
  /** User ID */
  userId: string;

  /** User roles */
  roles: string[];

  /** User permissions */
  permissions: string[];

  /** Session ID */
  sessionId: string;

  /** User preferences */
  preferences: UserPreferences;

  /** Security context */
  securityContext: UserSecurityContext;
}

export interface UserPreferences {
  /** Preferred validation style */
  validationStyle: 'strict' | 'lenient' | 'guided';

  /** Confirmation preferences */
  confirmationPreferences: ConfirmationPreferences;

  /** Language preference */
  language: string;

  /** Accessibility preferences */
  accessibility: AccessibilityPreferences;
}

export interface ConfirmationPreferences {
  /** Always confirm sanitization */
  alwaysConfirmSanitization: boolean;

  /** Confirm type conversions */
  confirmTypeConversions: boolean;

  /** Confirm default value application */
  confirmDefaultValues: boolean;

  /** Batch confirmations */
  enableBatchConfirmation: boolean;
}

export interface AccessibilityPreferences {
  /** Screen reader support */
  screenReader: boolean;

  /** High contrast mode */
  highContrast: boolean;

  /** Large text */
  largeText: boolean;

  /** Voice interaction */
  voiceInteraction: boolean;
}

export interface UserSecurityContext {
  /** Security clearance level */
  securityClearance: SecurityLevel;

  /** Access restrictions */
  accessRestrictions: string[];

  /** IP address */
  ipAddress: string;

  /** Device information */
  deviceInfo: DeviceInfo;

  /** Risk assessment */
  riskAssessment: UserRiskAssessment;
}

export interface DeviceInfo {
  /** Device type */
  deviceType: string;

  /** Operating system */
  operatingSystem: string;

  /** Browser information */
  browserInfo: string;

  /** Device security status */
  securityStatus: string;
}

export interface UserRiskAssessment {
  /** Overall risk level */
  riskLevel: RiskLevel;

  /** Risk factors */
  riskFactors: string[];

  /** Trust score (0-100) */
  trustScore: number;

  /** Recent suspicious activity */
  suspiciousActivity: boolean;
}

// ===== SUPPORTING INTERFACES =====

export interface BusinessRuleViolation {
  /** Rule ID */
  ruleId: string;

  /** Rule description */
  description: string;

  /** Affected parameters */
  affectedParameters: string[];

  /** Violation severity */
  severity: RuleSeverity;

  /** Suggested resolution */
  suggestedResolution: string;
}

export interface SecurityViolation {
  /** Violation type */
  type: SecurityViolationType;

  /** Violation description */
  description: string;

  /** Affected parameters */
  affectedParameters: string[];

  /** Risk level */
  riskLevel: RiskLevel;

  /** Immediate action required */
  immediateActionRequired: boolean;

  /** Recommended mitigation */
  recommendedMitigation: string;
}

export enum SecurityViolationType {
  INJECTION_ATTEMPT = 'injection_attempt',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  DATA_EXFILTRATION_ATTEMPT = 'data_exfiltration_attempt',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  SUSPICIOUS_PATTERN = 'suspicious_pattern'
}

export interface SanitizationAction {
  /** Parameter name */
  parameterName: string;

  /** Sanitization type applied */
  sanitizationType: SanitizationType;

  /** Original value */
  originalValue: any;

  /** Sanitized value */
  sanitizedValue: any;

  /** User confirmation received */
  userConfirmationReceived: boolean;

  /** Action timestamp */
  timestamp: Date;
}

export interface ValidationWarning {
  /** Warning type */
  type: ValidationWarningType;

  /** Warning message */
  message: string;

  /** Affected parameters */
  affectedParameters: string[];

  /** Severity level */
  severity: 'low' | 'medium' | 'high';

  /** Suggested action */
  suggestedAction: string;
}

export enum ValidationWarningType {
  TYPE_MISMATCH = 'type_mismatch',
  DEPRECATED_PARAMETER = 'deprecated_parameter',
  PERFORMANCE_CONCERN = 'performance_concern',
  SECURITY_CONCERN = 'security_concern',
  COMPATIBILITY_ISSUE = 'compatibility_issue'
}

// ===== MAIN SERVICE IMPLEMENTATION =====

@Injectable()
export class ParameterValidationService {
  private readonly logger = new Logger(ParameterValidationService.name);

  constructor(
    private readonly parlantValidationBridge: ParlantValidationBridge,
    private readonly contextBuilder: ConversationContextBuilder
  ) {}

  /**
   * Validate and sanitize parameters through conversational AI interface
   */
  async validateParameters(
    request: ParameterValidationRequest
  ): Promise<ParameterValidationResponse> {
    const startTime = Date.now();
    this.logger.log(`Starting parameter validation for function: ${request.functionName}`);

    try {
      // 1. Parse and pre-process parameters
      const parsingStart = Date.now();
      const parsedParameters = await this.parseParameters(request.rawParameters, request.expectedSchema);
      const parsingTime = Date.now() - parsingStart;

      // 2. Perform syntax and type validation
      const validationStart = Date.now();
      const syntaxValidation = await this.performSyntaxValidation(parsedParameters, request.expectedSchema);
      const validationTime = Date.now() - validationStart;

      // 3. Apply sanitization rules
      const sanitizationStart = Date.now();
      const sanitizationResult = await this.applySanitization(
        syntaxValidation.parameters,
        request.expectedSchema,
        request.options,
        request.userContext
      );
      const sanitizationTime = Date.now() - sanitizationStart;

      // 4. Validate business rules
      const businessValidation = await this.validateBusinessRules(
        sanitizationResult.sanitizedParameters,
        request.expectedSchema.businessRules,
        request.userContext
      );

      // 5. Perform security assessment
      const securityAssessment = await this.performSecurityAssessment(
        sanitizationResult.sanitizedParameters,
        request.expectedSchema.securityConstraints,
        request.userContext
      );

      // 6. Conversational validation if enabled
      let conversationalResult: ValidationResponse | null = null;
      let conversationalTime = 0;

      if (request.options.enableConversationalValidation) {
        const conversationalStart = Date.now();
        conversationalResult = await this.performConversationalValidation(
          request,
          sanitizationResult.sanitizedParameters,
          businessValidation,
          securityAssessment
        );
        conversationalTime = Date.now() - conversationalStart;
      }

      // 7. Compile final results
      const finalParameters = this.compileFinalParameters(
        sanitizationResult.sanitizedParameters,
        conversationalResult,
        request.expectedSchema
      );

      const totalTime = Date.now() - startTime;

      const response: ParameterValidationResponse = {
        isValid: this.determineOverallValidity(syntaxValidation, businessValidation, securityAssessment, conversationalResult),
        validatedParameters: finalParameters,
        conversationalResult: conversationalResult || this.createDefaultValidationResponse(request),
        validationDetails: {
          parameterResults: syntaxValidation.parameterResults,
          businessRuleViolations: businessValidation.violations,
          securityViolations: securityAssessment.violations,
          sanitizationActions: sanitizationResult.actions,
          warnings: this.compileWarnings(syntaxValidation, businessValidation, securityAssessment)
        },
        securityAssessment: {
          overallSecurityLevel: securityAssessment.overallSecurityLevel,
          threatIndicators: securityAssessment.threatIndicators,
          riskScore: securityAssessment.riskScore,
          recommendedActions: securityAssessment.recommendedActions,
          auditRequirements: securityAssessment.auditRequirements
        },
        performanceMetrics: {
          totalValidationTime: totalTime,
          parsingTime,
          validationTime,
          sanitizationTime,
          conversationalValidationTime: conversationalTime,
          memoryUsage: process.memoryUsage().heapUsed,
          parametersProcessed: Object.keys(request.rawParameters).length
        }
      };

      this.logger.log(`Parameter validation completed in ${totalTime}ms for ${request.functionName}`);
      return response;

    } catch (error) {
      this.logger.error(`Parameter validation failed for ${request.functionName}:`, error);
      throw new Error(`Parameter validation failed: ${error.message}`);
    }
  }

  /**
   * Parse raw parameters and apply initial type inference
   */
  private async parseParameters(
    rawParameters: Record<string, any>,
    schema: ParameterSchema
  ): Promise<Record<string, any>> {
    const parsedParameters: Record<string, any> = {};

    for (const [key, value] of Object.entries(rawParameters)) {
      const paramDef = schema.parameters[key];

      if (paramDef) {
        parsedParameters[key] = await this.parseParameterValue(value, paramDef);
      } else {
        // Handle unexpected parameters
        parsedParameters[key] = value;
      }
    }

    // Apply default values for missing required parameters
    for (const requiredParam of schema.required) {
      if (!(requiredParam in parsedParameters)) {
        const paramDef = schema.parameters[requiredParam];
        if (paramDef?.defaultValue !== undefined) {
          parsedParameters[requiredParam] = paramDef.defaultValue;
        }
      }
    }

    return parsedParameters;
  }

  /**
   * Parse individual parameter value based on definition
   */
  private async parseParameterValue(value: any, definition: ParameterDefinition): Promise<any> {
    // Handle null/undefined values
    if (value === null || value === undefined) {
      return definition.defaultValue;
    }

    // Type-specific parsing
    switch (definition.type) {
      case ParameterType.STRING:
        return String(value);

      case ParameterType.NUMBER:
        const num = Number(value);
        return isNaN(num) ? value : num;

      case ParameterType.BOOLEAN:
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          return lower === 'true' || lower === 'yes' || lower === '1';
        }
        return Boolean(value);

      case ParameterType.DATE:
        if (value instanceof Date) return value;
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date;

      case ParameterType.JSON:
        if (typeof value === 'object') return value;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }

      case ParameterType.ARRAY:
        return Array.isArray(value) ? value : [value];

      default:
        return value;
    }
  }

  /**
   * Perform syntax and type validation
   */
  private async performSyntaxValidation(
    parameters: Record<string, any>,
    schema: ParameterSchema
  ): Promise<{ parameters: Record<string, any>, parameterResults: Record<string, ParameterResult> }> {
    const parameterResults: Record<string, ParameterResult> = {};
    const validatedParameters: Record<string, any> = {};

    for (const [key, value] of Object.entries(parameters)) {
      const paramDef = schema.parameters[key];
      const result = await this.validateParameter(key, value, paramDef);

      parameterResults[key] = result;
      validatedParameters[key] = result.sanitizedValue;
    }

    return { parameters: validatedParameters, parameterResults };
  }

  /**
   * Validate individual parameter
   */
  private async validateParameter(
    name: string,
    value: any,
    definition?: ParameterDefinition
  ): Promise<ParameterResult> {
    const result: ParameterResult = {
      name,
      originalValue: value,
      sanitizedValue: value,
      status: ParameterValidationStatus.VALID,
      messages: []
    };

    if (!definition) {
      result.messages.push(`Parameter '${name}' not defined in schema`);
      result.status = ParameterValidationStatus.INVALID;
      return result;
    }

    // Validate against rules
    for (const rule of definition.validationRules) {
      const ruleResult = await this.applyValidationRule(value, rule);
      if (!ruleResult.isValid) {
        result.status = ParameterValidationStatus.INVALID;
        result.messages.push(ruleResult.message);
      }
    }

    return result;
  }

  /**
   * Apply individual validation rule
   */
  private async applyValidationRule(
    value: any,
    rule: ValidationRule
  ): Promise<{ isValid: boolean, message: string }> {
    switch (rule.type) {
      case ValidationRuleType.MIN_LENGTH:
        const minLen = rule.config.minLength as number;
        const isValidMin = String(value).length >= minLen;
        return {
          isValid: isValidMin,
          message: isValidMin ? '' : rule.errorMessage.replace('{minLength}', minLen.toString())
        };

      case ValidationRuleType.MAX_LENGTH:
        const maxLen = rule.config.maxLength as number;
        const isValidMax = String(value).length <= maxLen;
        return {
          isValid: isValidMax,
          message: isValidMax ? '' : rule.errorMessage.replace('{maxLength}', maxLen.toString())
        };

      case ValidationRuleType.REGEX_PATTERN:
        const pattern = new RegExp(rule.config.pattern as string);
        const isValidRegex = pattern.test(String(value));
        return {
          isValid: isValidRegex,
          message: isValidRegex ? '' : rule.errorMessage
        };

      case ValidationRuleType.RANGE:
        const num = Number(value);
        const min = rule.config.min as number;
        const max = rule.config.max as number;
        const isValidRange = !isNaN(num) && num >= min && num <= max;
        return {
          isValid: isValidRange,
          message: isValidRange ? '' : rule.errorMessage.replace('{min}', min.toString()).replace('{max}', max.toString())
        };

      case ValidationRuleType.ENUM_VALUES:
        const allowedValues = rule.config.values as any[];
        const isValidEnum = allowedValues.includes(value);
        return {
          isValid: isValidEnum,
          message: isValidEnum ? '' : rule.errorMessage.replace('{allowedValues}', allowedValues.join(', '))
        };

      default:
        return { isValid: true, message: '' };
    }
  }

  /**
   * Apply sanitization rules with user confirmation
   */
  private async applySanitization(
    parameters: Record<string, any>,
    schema: ParameterSchema,
    options: ValidationOptions,
    userContext: UserContext
  ): Promise<{ sanitizedParameters: Record<string, any>, actions: SanitizationAction[] }> {
    const sanitizedParameters: Record<string, any> = { ...parameters };
    const actions: SanitizationAction[] = [];

    if (!options.autoSanitize) {
      return { sanitizedParameters, actions };
    }

    for (const [key, value] of Object.entries(parameters)) {
      const paramDef = schema.parameters[key];
      if (paramDef?.sanitizationRules) {
        for (const rule of paramDef.sanitizationRules) {
          const sanitizedValue = await this.applySanitizationRule(value, rule);

          if (sanitizedValue !== value) {
            const action: SanitizationAction = {
              parameterName: key,
              sanitizationType: rule.type,
              originalValue: value,
              sanitizedValue: sanitizedValue,
              userConfirmationReceived: !rule.requireConfirmation || await this.requestSanitizationConfirmation(key, rule, value, sanitizedValue, userContext),
              timestamp: new Date()
            };

            if (action.userConfirmationReceived) {
              sanitizedParameters[key] = sanitizedValue;
              actions.push(action);
            }
          }
        }
      }
    }

    return { sanitizedParameters, actions };
  }

  /**
   * Apply individual sanitization rule
   */
  private async applySanitizationRule(value: any, rule: SanitizationRule): Promise<any> {
    const stringValue = String(value);

    switch (rule.type) {
      case SanitizationType.TRIM_WHITESPACE:
        return stringValue.trim();

      case SanitizationType.ESCAPE_HTML:
        return stringValue
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');

      case SanitizationType.REMOVE_SCRIPT_TAGS:
        return stringValue.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

      case SanitizationType.SQL_INJECTION_PREVENTION:
        return stringValue.replace(/['"\\]/g, '\\$&');

      case SanitizationType.XSS_PREVENTION:
        return stringValue.replace(/[<>'"&]/g, (match) => {
          const entities: Record<string, string> = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '&': '&amp;'
          };
          return entities[match] || match;
        });

      case SanitizationType.PATH_TRAVERSAL_PREVENTION:
        return stringValue.replace(/\.\./g, '').replace(/[\/\\]/g, '');

      case SanitizationType.NORMALIZE_UNICODE:
        return stringValue.normalize('NFC');

      default:
        return value;
    }
  }

  /**
   * Request user confirmation for sanitization
   */
  private async requestSanitizationConfirmation(
    parameterName: string,
    rule: SanitizationRule,
    originalValue: any,
    sanitizedValue: any,
    userContext: UserContext
  ): Promise<boolean> {
    // For now, return true for auto-approval
    // TODO: Implement actual conversational confirmation through PARLANT
    this.logger.log(`Sanitization confirmation requested for parameter '${parameterName}': ${rule.explanation}`);
    return true;
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(
    parameters: Record<string, any>,
    businessRules: BusinessRule[],
    userContext: UserContext
  ): Promise<{ violations: BusinessRuleViolation[] }> {
    const violations: BusinessRuleViolation[] = [];

    for (const rule of businessRules) {
      const isViolated = await this.evaluateBusinessRule(rule, parameters, userContext);

      if (isViolated) {
        violations.push({
          ruleId: rule.id,
          description: rule.description,
          affectedParameters: this.getAffectedParameters(rule, parameters),
          severity: rule.severity,
          suggestedResolution: `Please review and adjust parameters according to business rule: ${rule.description}`
        });
      }
    }

    return { violations };
  }

  /**
   * Evaluate individual business rule
   */
  private async evaluateBusinessRule(
    rule: BusinessRule,
    parameters: Record<string, any>,
    userContext: UserContext
  ): Promise<boolean> {
    // TODO: Implement sophisticated business rule evaluation engine
    // For now, return false (no violations)
    return false;
  }

  /**
   * Get parameters affected by a business rule
   */
  private getAffectedParameters(rule: BusinessRule, parameters: Record<string, any>): string[] {
    // TODO: Parse rule condition to identify affected parameters
    return Object.keys(parameters);
  }

  /**
   * Perform comprehensive security assessment
   */
  private async performSecurityAssessment(
    parameters: Record<string, any>,
    securityConstraints: SecurityConstraint[],
    userContext: UserContext
  ): Promise<{
    overallSecurityLevel: SecurityLevel,
    threatIndicators: ThreatIndicator[],
    riskScore: number,
    recommendedActions: string[],
    auditRequirements: AuditRequirement[],
    violations: SecurityViolation[]
  }> {
    const threatIndicators: ThreatIndicator[] = [];
    const violations: SecurityViolation[] = [];
    const recommendedActions: string[] = [];
    const auditRequirements: AuditRequirement[] = [];

    // Detect potential security threats
    for (const [key, value] of Object.entries(parameters)) {
      const threats = await this.detectSecurityThreats(key, value);
      threatIndicators.push(...threats);
    }

    // Evaluate security constraints
    for (const constraint of securityConstraints) {
      const constraintResult = await this.evaluateSecurityConstraint(constraint, parameters, userContext);

      if (constraintResult.violated) {
        violations.push(constraintResult.violation);
      }

      recommendedActions.push(...constraintResult.recommendedActions);
      auditRequirements.push(...constraintResult.auditRequirements);
    }

    // Calculate overall risk score
    const riskScore = this.calculateRiskScore(threatIndicators, violations, userContext);

    // Determine overall security level
    const overallSecurityLevel = this.determineSecurityLevel(riskScore, userContext.securityContext.securityClearance);

    return {
      overallSecurityLevel,
      threatIndicators,
      riskScore,
      recommendedActions,
      auditRequirements,
      violations
    };
  }

  /**
   * Detect security threats in parameter values
   */
  private async detectSecurityThreats(parameterName: string, value: any): Promise<ThreatIndicator[]> {
    const threats: ThreatIndicator[] = [];
    const stringValue = String(value);

    // SQL Injection detection
    const sqlPatterns = [
      /('|(\\')|(;)|(\-\-)|(\|)|(\*)|(%)|(<)|(>)|(\\)|(\/\*)|(\*\/)|(\bUNION\b)|(\bSELECT\b)|(\bINSERT\b)|(\bDELETE\b)|(\bUPDATE\b)|(\bDROP\b)/i
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(stringValue)) {
        threats.push({
          type: ThreatType.SQL_INJECTION,
          description: `Potential SQL injection pattern detected in parameter '${parameterName}'`,
          severity: RiskLevel.HIGH,
          affectedParameters: [parameterName],
          mitigationApplied: false
        });
        break;
      }
    }

    // XSS detection
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(stringValue)) {
        threats.push({
          type: ThreatType.XSS_ATTACK,
          description: `Potential XSS attack pattern detected in parameter '${parameterName}'`,
          severity: RiskLevel.HIGH,
          affectedParameters: [parameterName],
          mitigationApplied: false
        });
        break;
      }
    }

    // Path traversal detection
    const pathTraversalPatterns = [
      /\.\.\//g,
      /\.\.\\\\/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi
    ];

    for (const pattern of pathTraversalPatterns) {
      if (pattern.test(stringValue)) {
        threats.push({
          type: ThreatType.PATH_TRAVERSAL,
          description: `Potential path traversal attack detected in parameter '${parameterName}'`,
          severity: RiskLevel.MEDIUM,
          affectedParameters: [parameterName],
          mitigationApplied: false
        });
        break;
      }
    }

    return threats;
  }

  /**
   * Evaluate security constraint
   */
  private async evaluateSecurityConstraint(
    constraint: SecurityConstraint,
    parameters: Record<string, any>,
    userContext: UserContext
  ): Promise<{
    violated: boolean,
    violation?: SecurityViolation,
    recommendedActions: string[],
    auditRequirements: AuditRequirement[]
  }> {
    // TODO: Implement comprehensive security constraint evaluation
    return {
      violated: false,
      recommendedActions: [],
      auditRequirements: []
    };
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(
    threatIndicators: ThreatIndicator[],
    violations: SecurityViolation[],
    userContext: UserContext
  ): number {
    let riskScore = 0;

    // Base risk from threat indicators
    for (const threat of threatIndicators) {
      switch (threat.severity) {
        case RiskLevel.CRITICAL:
          riskScore += 25;
          break;
        case RiskLevel.HIGH:
          riskScore += 15;
          break;
        case RiskLevel.MEDIUM:
          riskScore += 10;
          break;
        case RiskLevel.LOW:
          riskScore += 5;
          break;
      }
    }

    // Additional risk from violations
    riskScore += violations.length * 10;

    // User context risk factors
    riskScore += (100 - userContext.securityContext.riskAssessment.trustScore) * 0.2;

    return Math.min(riskScore, 100);
  }

  /**
   * Determine security level based on risk score
   */
  private determineSecurityLevel(riskScore: number, userClearance: SecurityLevel): SecurityLevel {
    if (riskScore >= 80) return SecurityLevel.CLASSIFIED;
    if (riskScore >= 60) return SecurityLevel.RESTRICTED;
    if (riskScore >= 40) return SecurityLevel.CONFIDENTIAL;
    if (riskScore >= 20) return SecurityLevel.INTERNAL;
    return SecurityLevel.PUBLIC;
  }

  /**
   * Perform conversational validation through PARLANT
   */
  private async performConversationalValidation(
    request: ParameterValidationRequest,
    parameters: Record<string, any>,
    businessValidation: { violations: BusinessRuleViolation[] },
    securityAssessment: any
  ): Promise<ValidationResponse> {
    // Build conversation context
    const conversationContext = await this.buildConversationContext(
      request,
      parameters,
      businessValidation,
      securityAssessment
    );

    // Create validation request for PARLANT
    const parlantRequest: ValidationRequest = {
      id: `param-validation-${Date.now()}`,
      functionName: request.functionName,
      packageName: 'parameter-validation',
      operationType: request.expectedSchema.parameters ?
        (Object.keys(request.expectedSchema.parameters).some(key =>
          request.expectedSchema.parameters[key].type === ParameterType.OBJECT ||
          request.expectedSchema.parameters[key].type === ParameterType.ARRAY
        ) ? DatabaseOperationType.BULK_OPERATION : DatabaseOperationType.READ) : DatabaseOperationType.READ,
      parameters: parameters,
      userContext: {
        userId: request.userContext.userId,
        roles: request.userContext.roles,
        sessionId: request.userContext.sessionId,
        ipAddress: request.userContext.securityContext.ipAddress,
        userAgent: request.userContext.securityContext.deviceInfo.browserInfo,
        metadata: request.userContext.preferences
      },
      securityLevel: securityAssessment.overallSecurityLevel,
      timestamp: new Date(),
      timeoutMs: request.options.targetPerformanceMs || 5000,
      conversationMeta: {
        priority: this.determineConversationPriority(securityAssessment.riskScore),
        responseTypes: ['DETAILED', 'INTERACTIVE'],
        language: request.userContext.preferences.language || 'en',
        interfacePreferences: {
          preferredMode: 'text',
          accessibility: {
            screenReader: request.userContext.preferences.accessibility.screenReader,
            highContrast: request.userContext.preferences.accessibility.highContrast,
            largeText: request.userContext.preferences.accessibility.largeText,
            keyboardOnly: false
          },
          responseFormat: 'natural_language'
        }
      }
    };

    // Send to PARLANT for validation
    return await this.parlantValidationBridge.validateRequest(parlantRequest, conversationContext);
  }

  /**
   * Build conversation context for PARLANT
   */
  private async buildConversationContext(
    request: ParameterValidationRequest,
    parameters: Record<string, any>,
    businessValidation: { violations: BusinessRuleViolation[] },
    securityAssessment: any
  ): Promise<ConversationContext> {
    const operationDescription = this.generateOperationDescription(request.functionName, parameters);
    const parameterSummary = this.generateParameterSummary(parameters, request.expectedSchema);
    const riskContext = this.buildRiskContext(securityAssessment, businessValidation);

    return {
      operationDescription,
      parameterSummary,
      riskContext,
      userIntent: `Validate parameters for ${request.functionName} function`,
      businessImpact: {
        severity: businessValidation.violations.length > 0 ? ImpactSeverity.MODERATE : ImpactSeverity.MINOR,
        affectedAreas: ['Parameter Validation', 'Function Execution'],
        estimatedDurationMs: request.options.targetPerformanceMs || 1000,
        recoveryRequirements: ['Review parameters', 'Correct validation errors']
      }
    };
  }

  /**
   * Generate natural language operation description
   */
  private generateOperationDescription(functionName: string, parameters: Record<string, any>): string {
    const paramCount = Object.keys(parameters).length;
    return `Execute function '${functionName}' with ${paramCount} parameter${paramCount !== 1 ? 's' : ''}`;
  }

  /**
   * Generate parameter summary for conversation
   */
  private generateParameterSummary(parameters: Record<string, any>, schema: ParameterSchema): string {
    const summaryParts: string[] = [];

    for (const [key, value] of Object.entries(parameters)) {
      const paramDef = schema.parameters[key];
      const description = paramDef?.description || 'No description available';
      const valueStr = this.formatValueForSummary(value);
      summaryParts.push(`${key}: ${valueStr} (${description})`);
    }

    return summaryParts.join(', ');
  }

  /**
   * Format parameter value for summary display
   */
  private formatValueForSummary(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }

    if (typeof value === 'string') {
      return value.length > 50 ? `"${value.substring(0, 50)}..."` : `"${value}"`;
    }

    if (typeof value === 'object') {
      return Array.isArray(value) ? `Array(${value.length})` : 'Object';
    }

    return String(value);
  }

  /**
   * Build risk context for conversation
   */
  private buildRiskContext(securityAssessment: any, businessValidation: { violations: BusinessRuleViolation[] }): any {
    const riskFactors: string[] = [];

    // Add security risk factors
    for (const indicator of securityAssessment.threatIndicators) {
      riskFactors.push(`Security: ${indicator.description}`);
    }

    // Add business rule violations
    for (const violation of businessValidation.violations) {
      riskFactors.push(`Business Rule: ${violation.description}`);
    }

    return {
      riskLevel: this.translateRiskLevel(securityAssessment.riskScore),
      riskFactors,
      mitigationStrategies: securityAssessment.recommendedActions,
      riskScore: securityAssessment.riskScore
    };
  }

  /**
   * Translate numeric risk score to risk level
   */
  private translateRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 80) return RiskLevel.CRITICAL;
    if (riskScore >= 60) return RiskLevel.HIGH;
    if (riskScore >= 40) return RiskLevel.MEDIUM;
    if (riskScore >= 20) return RiskLevel.LOW;
    return RiskLevel.MINIMAL;
  }

  /**
   * Determine conversation priority based on risk score
   */
  private determineConversationPriority(riskScore: number): any {
    if (riskScore >= 80) return 'EMERGENCY';
    if (riskScore >= 60) return 'URGENT';
    if (riskScore >= 40) return 'HIGH';
    if (riskScore >= 20) return 'NORMAL';
    return 'LOW';
  }

  /**
   * Compile final validated parameters
   */
  private compileFinalParameters(
    sanitizedParameters: Record<string, any>,
    conversationalResult: ValidationResponse | null,
    schema: ParameterSchema
  ): Record<string, any> {
    // If conversational validation denied, return empty object
    if (conversationalResult?.decision === ValidationDecision.DENY) {
      return {};
    }

    // Apply any modifications from conversational validation
    let finalParameters = { ...sanitizedParameters };

    if (conversationalResult?.decision === ValidationDecision.MODIFY && conversationalResult.executionContext) {
      // TODO: Apply modifications based on execution context
    }

    return finalParameters;
  }

  /**
   * Determine overall validation success
   */
  private determineOverallValidity(
    syntaxValidation: any,
    businessValidation: { violations: BusinessRuleViolation[] },
    securityAssessment: any,
    conversationalResult: ValidationResponse | null
  ): boolean {
    // Check for critical syntax errors
    const hasCriticalSyntaxErrors = Object.values(syntaxValidation.parameterResults).some(
      (result: any) => result.status === ParameterValidationStatus.INVALID
    );

    if (hasCriticalSyntaxErrors) {
      return false;
    }

    // Check for critical business rule violations
    const hasCriticalBusinessViolations = businessValidation.violations.some(
      violation => violation.severity === RuleSeverity.CRITICAL
    );

    if (hasCriticalBusinessViolations) {
      return false;
    }

    // Check for critical security violations
    const hasCriticalSecurityViolations = securityAssessment.violations.some(
      (violation: SecurityViolation) => violation.riskLevel === RiskLevel.CRITICAL
    );

    if (hasCriticalSecurityViolations) {
      return false;
    }

    // Check conversational validation result
    if (conversationalResult?.decision === ValidationDecision.DENY) {
      return false;
    }

    return true;
  }

  /**
   * Compile validation warnings
   */
  private compileWarnings(
    syntaxValidation: any,
    businessValidation: { violations: BusinessRuleViolation[] },
    securityAssessment: any
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Add syntax warnings
    for (const [paramName, result] of Object.entries(syntaxValidation.parameterResults)) {
      const paramResult = result as ParameterResult;
      if (paramResult.status === ParameterValidationStatus.TYPE_CONVERTED) {
        warnings.push({
          type: ValidationWarningType.TYPE_MISMATCH,
          message: `Parameter '${paramName}' was automatically converted to expected type`,
          affectedParameters: [paramName],
          severity: 'low',
          suggestedAction: 'Review parameter type and provide correct type in future'
        });
      }
    }

    // Add business rule warnings
    for (const violation of businessValidation.violations) {
      if (violation.severity === RuleSeverity.WARNING) {
        warnings.push({
          type: ValidationWarningType.COMPATIBILITY_ISSUE,
          message: violation.description,
          affectedParameters: violation.affectedParameters,
          severity: 'medium',
          suggestedAction: violation.suggestedResolution
        });
      }
    }

    // Add security warnings
    for (const indicator of securityAssessment.threatIndicators) {
      if (indicator.severity === RiskLevel.MEDIUM) {
        warnings.push({
          type: ValidationWarningType.SECURITY_CONCERN,
          message: indicator.description,
          affectedParameters: indicator.affectedParameters,
          severity: 'medium',
          suggestedAction: 'Review parameter content for potential security risks'
        });
      }
    }

    return warnings;
  }

  /**
   * Create default validation response when conversational validation is disabled
   */
  private createDefaultValidationResponse(request: ParameterValidationRequest): ValidationResponse {
    return {
      requestId: `default-${Date.now()}`,
      decision: ValidationDecision.APPROVE,
      conversationId: '',
      reasoning: 'Automated validation without conversational review',
      confidence: 0.8,
      timestamp: new Date(),
      processingTimeMs: 0,
      cacheInfo: {
        status: 'MISS',
        strategy: 'DISABLED',
        tier: 'L1_MEMORY',
        ttlRemainingMs: 0
      },
      metadata: {
        source: 'FALLBACK',
        pipelineStages: [],
        performanceMetrics: {
          responseTime: 0,
          throughput: 1,
          errorRate: 0,
          resourceUtilization: {
            cpu: 0,
            memory: 0,
            network: 0,
            storage: 0
          }
        },
        qualityIndicators: []
      }
    };
  }
}