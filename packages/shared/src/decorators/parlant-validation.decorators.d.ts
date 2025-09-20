import { ValidationMode, ApprovalLevel, FunctionSecurityLevel, RiskLevel, ValidationRule, ParlantWrapperConfig, ConversationPriority, ParticipantRole } from "../types/parlant.types";
import { SecurityLevel } from "../types/parlant-integration.types";
export declare const PARLANT_VALIDATION_KEY = "parlant:validation";
export declare const PARLANT_CONVERSATION_KEY = "parlant:conversation";
export declare const PARLANT_SECURITY_KEY = "parlant:security";
export declare const PARLANT_APPROVAL_KEY = "parlant:approval";
export declare const PARLANT_WRAPPER_CONFIG_KEY = "parlant:wrapper_config";
export declare const PARLANT_RULES_KEY = "parlant:rules";
export declare const PARLANT_CONTEXT_KEY = "parlant:context";
export interface ParlantValidationConfig {
    enabled?: boolean;
    mode?: ValidationMode;
    approvalLevel?: ApprovalLevel;
    timeout?: number;
    cacheable?: boolean;
    rules?: ValidationRule[];
    priority?: ConversationPriority;
    requiredRoles?: ParticipantRole[];
    customConfig?: Record<string, unknown>;
}
export declare function ParlantValidation(config?: ParlantValidationConfig): (target: object, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export interface ConversationContextConfig {
    autoCreate?: boolean;
    topic?: string;
    priority?: ConversationPriority;
    requiredParticipants?: ParticipantRole[];
    maxParticipants?: number;
    conversationTimeout?: number;
    persistHistory?: boolean;
    metadata?: Record<string, unknown>;
}
export declare function ConversationContext(config?: ConversationContextConfig): (target: object, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export interface SecurityClassificationConfig {
    securityLevel: FunctionSecurityLevel;
    riskLevel: RiskLevel;
    requiredClearance?: string[];
    securityTags?: string[];
    securityMetadata?: Record<string, unknown>;
}
export declare function SecurityClassification(config: SecurityClassificationConfig): (target: object, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export interface ApprovalWorkflowConfig {
    level: ApprovalLevel;
    requiredRoles: ParticipantRole[];
    timeout?: number;
    allowSelfApproval?: boolean;
    escalationRules?: EscalationRule[];
    metadata?: Record<string, unknown>;
}
export interface EscalationRule {
    id: string;
    condition: EscalationCondition;
    targetRole: ParticipantRole;
    delay: number;
    priority: number;
}
export declare enum EscalationCondition {
    _TIMEOUT = "timeout",
    _MULTIPLE_DENIALS = "multiple_denials",
    _HIGH_RISK_DETECTED = "high_risk_detected",
    _SECURITY_VIOLATION = "security_violation",
    _CUSTOM_CONDITION = "custom_condition"
}
export declare function ApprovalWorkflow(config: ApprovalWorkflowConfig): (target: object, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function ParlantWrapper(config: Partial<ParlantWrapperConfig>): (target: new (..._args: unknown[]) => unknown) => void;
export declare function ValidationRules(rules: ValidationRule[]): (target: object, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare const ConversationParam: (...dataOrPipes: unknown[]) => ParameterDecorator;
export declare const ValidationRequestParam: (...dataOrPipes: unknown[]) => ParameterDecorator;
export declare const UserContextParam: (...dataOrPipes: unknown[]) => ParameterDecorator;
export interface CompleteParlantConfig {
    validation: ParlantValidationConfig;
    conversation: ConversationContextConfig;
    security: SecurityClassificationConfig;
    approval: ApprovalWorkflowConfig;
    rules?: ValidationRule[];
}
export declare function ParlantIntegrated(config: CompleteParlantConfig): (target: object, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function getParlantValidationMetadata(target: object, propertyKey: string): ParlantValidationConfig | undefined;
export declare function getConversationContextMetadata(target: object, propertyKey: string): ConversationContextConfig | undefined;
export declare function getSecurityClassificationMetadata(target: object, propertyKey: string): SecurityClassificationConfig | undefined;
export declare function getApprovalWorkflowMetadata(target: object, propertyKey: string): ApprovalWorkflowConfig | undefined;
export declare function getValidationRulesMetadata(target: object, propertyKey: string): ValidationRule[] | undefined;
export declare function hasParlantValidation(target: object, propertyKey: string): boolean;
export declare function getAllParlantMetadata(target: object, propertyKey: string): {
    validation: ParlantValidationConfig | undefined;
    conversation: ConversationContextConfig | undefined;
    security: SecurityClassificationConfig | undefined;
    approval: ApprovalWorkflowConfig | undefined;
    rules: ValidationRule[] | undefined;
};
export declare function ParlantValidated(config?: ParlantValidationConfig): (target: object, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function ParlantSecure(securityLevel?: SecurityLevel): (target: object, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export { SecurityLevel };
//# sourceMappingURL=parlant-validation.decorators.d.ts.map