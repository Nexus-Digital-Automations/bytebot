/**
 * Parlant Validation Decorators - Conversational AI Function Wrapping
 *
 * This module provides decorators for wrapping functions with Parlant conversational
 * AI validation capabilities. These decorators enable seamless integration of
 * real-time validation, approval workflows, and conversational interfaces
 * across all Bytebot microservices.
 *
 * @fileoverview Parlant conversational validation decorators
 * @version 1.0.0
 * @author Parlant Integration Research Agent #2
 */

import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
} from "@nestjs/common";
import {
  ValidationMode,
  ApprovalLevel,
  FunctionSecurityLevel,
  RiskLevel,
  ValidationRule,
  ParlantWrapperConfig,
  ConversationPriority,
  ParticipantRole,
} from "../types/parlant.types";

// ===========================
// METADATA KEYS FOR PARLANT DECORATORS
// ===========================

export const PARLANT_VALIDATION_KEY = "parlant:validation";
export const PARLANT_CONVERSATION_KEY = "parlant:conversation";
export const PARLANT_SECURITY_KEY = "parlant:security";
export const PARLANT_APPROVAL_KEY = "parlant:approval";
export const PARLANT_WRAPPER_CONFIG_KEY = "parlant:wrapper_config";
export const PARLANT_RULES_KEY = "parlant:rules";
export const PARLANT_CONTEXT_KEY = "parlant:context";

// ===========================
// CORE PARLANT VALIDATION DECORATORS
// ===========================

/**
 * Configuration interface for Parlant validation decorator
 */
export interface ParlantValidationConfig {
  /** Enable validation for this function */
  enabled?: boolean;

  /** Validation mode to use */
  mode?: ValidationMode;

  /** Required approval level */
  approvalLevel?: ApprovalLevel;

  /** Validation timeout in milliseconds */
  timeout?: number;

  /** Whether results should be cached */
  cacheable?: boolean;

  /** Custom validation rules */
  rules?: ValidationRule[];

  /** Conversation priority */
  priority?: ConversationPriority;

  /** Required participant roles for approval */
  requiredRoles?: ParticipantRole[];

  /** Custom configuration properties */
  customConfig?: Record<string, unknown>;
}

/**
 * Parlant validation decorator for function-level conversational validation
 *
 * @param config - Validation configuration
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ParlantValidation({
 *   mode: ValidationMode.INTERACTIVE,
 *   approvalLevel: ApprovalLevel.SINGLE_APPROVAL,
 *   priority: ConversationPriority.HIGH
 * })
 * async executeCommand(command: string): Promise<CommandResult> {
 *   // Function implementation
 * }
 * ```
 */
export function ParlantValidation(config: ParlantValidationConfig = {}) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const defaultConfig: ParlantValidationConfig = {
      enabled: true,
      mode: ValidationMode.INTERACTIVE,
      approvalLevel: ApprovalLevel.SINGLE_APPROVAL,
      timeout: 30000, // 30 seconds
      cacheable: false,
      priority: ConversationPriority.NORMAL,
      requiredRoles: [ParticipantRole.APPROVER],
      ...config,
    };

    // Store validation configuration in metadata
    SetMetadata(PARLANT_VALIDATION_KEY, defaultConfig)(
      target,
      propertyKey,
      descriptor,
    );

    // Store function metadata for analysis
    const functionMetadata = {
      className: target.constructor.name,
      methodName: propertyKey,
      parameterTypes:
        Reflect.getMetadata("design:paramtypes", target, propertyKey) || [],
      returnType: Reflect.getMetadata("design:returntype", target, propertyKey),
    };

    SetMetadata(`${PARLANT_VALIDATION_KEY}:metadata`, functionMetadata)(
      target,
      propertyKey,
      descriptor,
    );

    return descriptor;
  };
}

/**
 * Configuration interface for conversation context
 */
export interface ConversationContextConfig {
  /** Auto-create conversation if none exists */
  autoCreate?: boolean;

  /** Conversation topic/subject */
  topic?: string;

  /** Conversation priority level */
  priority?: ConversationPriority;

  /** Required participant roles */
  requiredParticipants?: ParticipantRole[];

  /** Maximum conversation participants */
  maxParticipants?: number;

  /** Conversation timeout in milliseconds */
  conversationTimeout?: number;

  /** Whether to persist conversation history */
  persistHistory?: boolean;

  /** Custom conversation metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Conversation context decorator for managing conversational state
 *
 * @param config - Conversation context configuration
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ConversationContext({
 *   autoCreate: true,
 *   topic: "Database Migration Approval",
 *   priority: ConversationPriority.CRITICAL,
 *   requiredParticipants: [ParticipantRole.APPROVER, ParticipantRole.VALIDATOR]
 * })
 * async migrateDatabaseSchema(): Promise<void> {
 *   // Implementation
 * }
 * ```
 */
export function ConversationContext(config: ConversationContextConfig = {}) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const defaultConfig: ConversationContextConfig = {
      autoCreate: true,
      priority: ConversationPriority.NORMAL,
      requiredParticipants: [ParticipantRole.APPROVER],
      maxParticipants: 10,
      conversationTimeout: 300000, // 5 minutes
      persistHistory: true,
      ...config,
    };

    SetMetadata(PARLANT_CONVERSATION_KEY, defaultConfig)(
      target,
      propertyKey,
      descriptor,
    );

    return descriptor;
  };
}

/**
 * Security classification configuration
 */
export interface SecurityClassificationConfig {
  /** Function security level */
  securityLevel: FunctionSecurityLevel;

  /** Function risk level */
  riskLevel: RiskLevel;

  /** Required security clearance */
  requiredClearance?: string[];

  /** Security tags */
  securityTags?: string[];

  /** Custom security metadata */
  securityMetadata?: Record<string, unknown>;
}

/**
 * Security classification decorator for Parlant validation
 *
 * @param config - Security classification configuration
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @SecurityClassification({
 *   securityLevel: FunctionSecurityLevel.RESTRICTED,
 *   riskLevel: RiskLevel.HIGH,
 *   requiredClearance: ['admin', 'security_officer'],
 *   securityTags: ['sensitive_data', 'production_access']
 * })
 * async accessSensitiveData(): Promise<SensitiveData> {
 *   // Implementation
 * }
 * ```
 */
export function SecurityClassification(config: SecurityClassificationConfig) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    SetMetadata(PARLANT_SECURITY_KEY, config)(target, propertyKey, descriptor);

    return descriptor;
  };
}

/**
 * Approval workflow configuration
 */
export interface ApprovalWorkflowConfig {
  /** Required approval level */
  level: ApprovalLevel;

  /** Required approver roles */
  requiredRoles: ParticipantRole[];

  /** Approval timeout in milliseconds */
  timeout?: number;

  /** Whether to allow self-approval */
  allowSelfApproval?: boolean;

  /** Escalation rules */
  escalationRules?: EscalationRule[];

  /** Custom approval metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Escalation rule definition
 */
export interface EscalationRule {
  /** Rule identifier */
  id: string;

  /** Trigger condition */
  condition: EscalationCondition;

  /** Target role for escalation */
  targetRole: ParticipantRole;

  /** Escalation delay in milliseconds */
  delay: number;

  /** Rule priority */
  priority: number;
}

/**
 * Escalation conditions
 */
export enum EscalationCondition {
  _TIMEOUT = "timeout",
  _MULTIPLE_DENIALS = "multiple_denials",
  _HIGH_RISK_DETECTED = "high_risk_detected",
  _SECURITY_VIOLATION = "security_violation",
  _CUSTOM_CONDITION = "custom_condition",
}

/**
 * Approval workflow decorator for defining approval requirements
 *
 * @param config - Approval workflow configuration
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ApprovalWorkflow({
 *   level: ApprovalLevel.DUAL_APPROVAL,
 *   requiredRoles: [ParticipantRole.APPROVER, ParticipantRole.VALIDATOR],
 *   timeout: 60000,
 *   allowSelfApproval: false,
 *   escalationRules: [{
 *     id: 'timeout_escalation',
 *     condition: EscalationCondition._TIMEOUT,
 *     targetRole: ParticipantRole.MODERATOR,
 *     delay: 30000,
 *     priority: 1
 *   }]
 * })
 * async criticalOperation(): Promise<void> {
 *   // Implementation
 * }
 * ```
 */
export function ApprovalWorkflow(config: ApprovalWorkflowConfig) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    SetMetadata(PARLANT_APPROVAL_KEY, config)(target, propertyKey, descriptor);

    return descriptor;
  };
}

/**
 * Wrapper configuration decorator for Parlant integration settings
 *
 * @param config - Wrapper configuration
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ParlantWrapper({
 *   enabled: true,
 *   defaultValidationMode: ValidationMode.ASYNCHRONOUS,
 *   defaultApprovalLevel: ApprovalLevel.SINGLE_APPROVAL,
 *   defaultTimeout: 45000
 * })
 * class DatabaseService {
 *   // Service implementation
 * }
 * ```
 */
export function ParlantWrapper(config: Partial<ParlantWrapperConfig>) {
  return function (target: object) {
    SetMetadata(PARLANT_WRAPPER_CONFIG_KEY, config)(target);
  };
}

/**
 * Validation rules decorator for custom validation logic
 *
 * @param rules - Array of validation rules
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ValidationRules([
 *   {
 *     id: 'business_hours_check',
 *     name: 'Business Hours Validation',
 *     type: ValidationRuleType.BUSINESS_LOGIC,
 *     config: { allowedHours: { start: 9, end: 17 } },
 *     priority: 1,
 *     enabled: true
 *   }
 * ])
 * async scheduleMaintenanceTask(): Promise<void> {
 *   // Implementation
 * }
 * ```
 */
export function ValidationRules(rules: ValidationRule[]) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    SetMetadata(PARLANT_RULES_KEY, rules)(target, propertyKey, descriptor);

    return descriptor;
  };
}

// ===========================
// PARAMETER DECORATORS
// ===========================

/**
 * Conversation context parameter decorator for injecting current conversation
 *
 * @example
 * ```typescript
 * async processRequest(
 *   @ConversationParam() conversation: ParlantConversationContext,
 *   request: ProcessingRequest
 * ): Promise<ProcessingResult> {
 *   // Use conversation context
 * }
 * ```
 */
export const ConversationParam = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.parlantConversation;
  },
);

/**
 * Validation request parameter decorator for injecting validation request
 *
 * @example
 * ```typescript
 * async handleValidation(
 *   @ValidationRequestParam() validationRequest: ParlantValidationRequest
 * ): Promise<void> {
 *   // Use validation request
 * }
 * ```
 */
export const ValidationRequestParam = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.parlantValidationRequest;
  },
);

/**
 * User context parameter decorator for injecting user information
 *
 * @example
 * ```typescript
 * async processUserAction(
 *   @UserContextParam() user: UserContext,
 *   action: UserAction
 * ): Promise<void> {
 *   // Use user context
 * }
 * ```
 */
export const UserContextParam = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.parlantUserContext;
  },
);

// ===========================
// COMBINED DECORATORS
// ===========================

/**
 * Configuration for complete Parlant integration
 */
export interface CompleteParlantConfig {
  validation: ParlantValidationConfig;
  conversation: ConversationContextConfig;
  security: SecurityClassificationConfig;
  approval: ApprovalWorkflowConfig;
  rules?: ValidationRule[];
}

/**
 * Complete Parlant integration decorator combining all features
 *
 * @param config - Complete Parlant configuration
 * @returns Method decorator
 *
 * @example
 * ```typescript
 * @ParlantIntegrated({
 *   validation: {
 *     mode: ValidationMode.INTERACTIVE,
 *     approvalLevel: ApprovalLevel.DUAL_APPROVAL,
 *     timeout: 60000
 *   },
 *   conversation: {
 *     topic: "Critical System Operation",
 *     priority: ConversationPriority.CRITICAL
 *   },
 *   security: {
 *     securityLevel: FunctionSecurityLevel.RESTRICTED,
 *     riskLevel: RiskLevel.HIGH
 *   },
 *   approval: {
 *     level: ApprovalLevel.DUAL_APPROVAL,
 *     requiredRoles: [ParticipantRole.APPROVER, ParticipantRole.VALIDATOR]
 *   }
 * })
 * async criticalSystemOperation(): Promise<void> {
 *   // Implementation
 * }
 * ```
 */
export function ParlantIntegrated(config: CompleteParlantConfig) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // Apply all individual decorators
    ParlantValidation(config.validation)(target, propertyKey, descriptor);
    ConversationContext(config.conversation)(target, propertyKey, descriptor);
    SecurityClassification(config.security)(target, propertyKey, descriptor);
    ApprovalWorkflow(config.approval)(target, propertyKey, descriptor);

    if (config.rules && config.rules.length > 0) {
      ValidationRules(config.rules)(target, propertyKey, descriptor);
    }

    return descriptor;
  };
}

// ===========================
// METADATA EXTRACTION UTILITIES
// ===========================

/**
 * Extract Parlant validation metadata from a method
 *
 * @param target - Target class
 * @param propertyKey - Method name
 * @returns Parlant validation configuration or undefined
 */
export function getParlantValidationMetadata(
  target: object,
  propertyKey: string,
): ParlantValidationConfig | undefined {
  return Reflect.getMetadata(PARLANT_VALIDATION_KEY, target, propertyKey);
}

/**
 * Extract conversation context metadata from a method
 *
 * @param target - Target class
 * @param propertyKey - Method name
 * @returns Conversation context configuration or undefined
 */
export function getConversationContextMetadata(
  target: object,
  propertyKey: string,
): ConversationContextConfig | undefined {
  return Reflect.getMetadata(PARLANT_CONVERSATION_KEY, target, propertyKey);
}

/**
 * Extract security classification metadata from a method
 *
 * @param target - Target class
 * @param propertyKey - Method name
 * @returns Security classification configuration or undefined
 */
export function getSecurityClassificationMetadata(
  target: object,
  propertyKey: string,
): SecurityClassificationConfig | undefined {
  return Reflect.getMetadata(PARLANT_SECURITY_KEY, target, propertyKey);
}

/**
 * Extract approval workflow metadata from a method
 *
 * @param target - Target class
 * @param propertyKey - Method name
 * @returns Approval workflow configuration or undefined
 */
export function getApprovalWorkflowMetadata(
  target: object,
  propertyKey: string,
): ApprovalWorkflowConfig | undefined {
  return Reflect.getMetadata(PARLANT_APPROVAL_KEY, target, propertyKey);
}

/**
 * Extract validation rules metadata from a method
 *
 * @param target - Target class
 * @param propertyKey - Method name
 * @returns Validation rules array or undefined
 */
export function getValidationRulesMetadata(
  target: object,
  propertyKey: string,
): ValidationRule[] | undefined {
  return Reflect.getMetadata(PARLANT_RULES_KEY, target, propertyKey);
}

/**
 * Check if a method has Parlant validation enabled
 *
 * @param target - Target class
 * @param propertyKey - Method name
 * @returns True if Parlant validation is enabled
 */
export function hasParlantValidation(
  target: object,
  propertyKey: string,
): boolean {
  const config = getParlantValidationMetadata(target, propertyKey);
  return config?.enabled === true;
}

/**
 * Get all Parlant metadata for a method
 *
 * @param target - Target class
 * @param propertyKey - Method name
 * @returns Complete Parlant metadata object
 */
export function getAllParlantMetadata(target: object, propertyKey: string) {
  return {
    validation: getParlantValidationMetadata(target, propertyKey),
    conversation: getConversationContextMetadata(target, propertyKey),
    security: getSecurityClassificationMetadata(target, propertyKey),
    approval: getApprovalWorkflowMetadata(target, propertyKey),
    rules: getValidationRulesMetadata(target, propertyKey),
  };
}
