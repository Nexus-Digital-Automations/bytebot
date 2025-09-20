"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityLevel = exports.UserContextParam = exports.ValidationRequestParam = exports.ConversationParam = exports.EscalationCondition = exports.PARLANT_CONTEXT_KEY = exports.PARLANT_RULES_KEY = exports.PARLANT_WRAPPER_CONFIG_KEY = exports.PARLANT_APPROVAL_KEY = exports.PARLANT_SECURITY_KEY = exports.PARLANT_CONVERSATION_KEY = exports.PARLANT_VALIDATION_KEY = void 0;
exports.ParlantValidation = ParlantValidation;
exports.ConversationContext = ConversationContext;
exports.SecurityClassification = SecurityClassification;
exports.ApprovalWorkflow = ApprovalWorkflow;
exports.ParlantWrapper = ParlantWrapper;
exports.ValidationRules = ValidationRules;
exports.ParlantIntegrated = ParlantIntegrated;
exports.getParlantValidationMetadata = getParlantValidationMetadata;
exports.getConversationContextMetadata = getConversationContextMetadata;
exports.getSecurityClassificationMetadata = getSecurityClassificationMetadata;
exports.getApprovalWorkflowMetadata = getApprovalWorkflowMetadata;
exports.getValidationRulesMetadata = getValidationRulesMetadata;
exports.hasParlantValidation = hasParlantValidation;
exports.getAllParlantMetadata = getAllParlantMetadata;
exports.ParlantValidated = ParlantValidated;
exports.ParlantSecure = ParlantSecure;
const common_1 = require("@nestjs/common");
const parlant_types_1 = require("../types/parlant.types");
const parlant_integration_types_1 = require("../types/parlant-integration.types");
Object.defineProperty(exports, "SecurityLevel", { enumerable: true, get: function () { return parlant_integration_types_1.SecurityLevel; } });
exports.PARLANT_VALIDATION_KEY = "parlant:validation";
exports.PARLANT_CONVERSATION_KEY = "parlant:conversation";
exports.PARLANT_SECURITY_KEY = "parlant:security";
exports.PARLANT_APPROVAL_KEY = "parlant:approval";
exports.PARLANT_WRAPPER_CONFIG_KEY = "parlant:wrapper_config";
exports.PARLANT_RULES_KEY = "parlant:rules";
exports.PARLANT_CONTEXT_KEY = "parlant:context";
function ParlantValidation(config = {}) {
    return function (target, propertyKey, descriptor) {
        const defaultConfig = {
            enabled: true,
            mode: parlant_types_1.ValidationMode._INTERACTIVE,
            approvalLevel: parlant_types_1.ApprovalLevel._SINGLE_APPROVAL,
            timeout: 30000,
            cacheable: false,
            priority: parlant_types_1.ConversationPriority._NORMAL,
            requiredRoles: [parlant_types_1.ParticipantRole._APPROVER],
            ...config,
        };
        (0, common_1.SetMetadata)(exports.PARLANT_VALIDATION_KEY, defaultConfig)(target, propertyKey, descriptor);
        const functionMetadata = {
            className: target.constructor.name,
            methodName: propertyKey,
            parameterTypes: Reflect.getMetadata("design:paramtypes", target, propertyKey) || [],
            returnType: Reflect.getMetadata("design:returntype", target, propertyKey),
        };
        (0, common_1.SetMetadata)(`${exports.PARLANT_VALIDATION_KEY}:metadata`, functionMetadata)(target, propertyKey, descriptor);
        return descriptor;
    };
}
function ConversationContext(config = {}) {
    return function (target, propertyKey, descriptor) {
        const defaultConfig = {
            autoCreate: true,
            priority: parlant_types_1.ConversationPriority._NORMAL,
            requiredParticipants: [parlant_types_1.ParticipantRole._APPROVER],
            maxParticipants: 10,
            conversationTimeout: 300000,
            persistHistory: true,
            ...config,
        };
        (0, common_1.SetMetadata)(exports.PARLANT_CONVERSATION_KEY, defaultConfig)(target, propertyKey, descriptor);
        return descriptor;
    };
}
function SecurityClassification(config) {
    return function (target, propertyKey, descriptor) {
        (0, common_1.SetMetadata)(exports.PARLANT_SECURITY_KEY, config)(target, propertyKey, descriptor);
        return descriptor;
    };
}
var EscalationCondition;
(function (EscalationCondition) {
    EscalationCondition["_TIMEOUT"] = "timeout";
    EscalationCondition["_MULTIPLE_DENIALS"] = "multiple_denials";
    EscalationCondition["_HIGH_RISK_DETECTED"] = "high_risk_detected";
    EscalationCondition["_SECURITY_VIOLATION"] = "security_violation";
    EscalationCondition["_CUSTOM_CONDITION"] = "custom_condition";
})(EscalationCondition || (exports.EscalationCondition = EscalationCondition = {}));
function ApprovalWorkflow(config) {
    return function (target, propertyKey, descriptor) {
        (0, common_1.SetMetadata)(exports.PARLANT_APPROVAL_KEY, config)(target, propertyKey, descriptor);
        return descriptor;
    };
}
function ParlantWrapper(config) {
    return function (target) {
        (0, common_1.SetMetadata)(exports.PARLANT_WRAPPER_CONFIG_KEY, config)(target);
    };
}
function ValidationRules(rules) {
    return function (target, propertyKey, descriptor) {
        (0, common_1.SetMetadata)(exports.PARLANT_RULES_KEY, rules)(target, propertyKey, descriptor);
        return descriptor;
    };
}
exports.ConversationParam = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.parlantConversation;
});
exports.ValidationRequestParam = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.parlantValidationRequest;
});
exports.UserContextParam = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.parlantUserContext;
});
function ParlantIntegrated(config) {
    return function (target, propertyKey, descriptor) {
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
function getParlantValidationMetadata(target, propertyKey) {
    return Reflect.getMetadata(exports.PARLANT_VALIDATION_KEY, target, propertyKey);
}
function getConversationContextMetadata(target, propertyKey) {
    return Reflect.getMetadata(exports.PARLANT_CONVERSATION_KEY, target, propertyKey);
}
function getSecurityClassificationMetadata(target, propertyKey) {
    return Reflect.getMetadata(exports.PARLANT_SECURITY_KEY, target, propertyKey);
}
function getApprovalWorkflowMetadata(target, propertyKey) {
    return Reflect.getMetadata(exports.PARLANT_APPROVAL_KEY, target, propertyKey);
}
function getValidationRulesMetadata(target, propertyKey) {
    return Reflect.getMetadata(exports.PARLANT_RULES_KEY, target, propertyKey);
}
function hasParlantValidation(target, propertyKey) {
    const config = getParlantValidationMetadata(target, propertyKey);
    return config?.enabled === true;
}
function getAllParlantMetadata(target, propertyKey) {
    return {
        validation: getParlantValidationMetadata(target, propertyKey),
        conversation: getConversationContextMetadata(target, propertyKey),
        security: getSecurityClassificationMetadata(target, propertyKey),
        approval: getApprovalWorkflowMetadata(target, propertyKey),
        rules: getValidationRulesMetadata(target, propertyKey),
    };
}
function ParlantValidated(config = {}) {
    return ParlantValidation(config);
}
function ParlantSecure(securityLevel = parlant_integration_types_1.SecurityLevel._MEDIUM) {
    return ParlantValidation({
        enabled: true,
        mode: parlant_types_1.ValidationMode._INTERACTIVE,
        approvalLevel: parlant_types_1.ApprovalLevel._SINGLE_APPROVAL,
        priority: parlant_types_1.ConversationPriority._HIGH,
        requiredRoles: [parlant_types_1.ParticipantRole._APPROVER, parlant_types_1.ParticipantRole._VALIDATOR],
        customConfig: {
            securityLevel,
            requiresSecureApproval: true,
        },
    });
}
//# sourceMappingURL=parlant-validation.decorators.js.map