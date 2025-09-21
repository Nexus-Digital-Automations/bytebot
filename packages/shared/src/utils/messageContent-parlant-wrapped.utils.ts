/**
 * Parlant-Wrapped Message Content Utilities - Conversational AI Validated Content Processing
 *
 * This module provides Parlant conversational AI validation for all message content utility functions
 * across the Bytebot platform. Every content processing operation is validated through conversational
 * AI to ensure data integrity, security, and compliance.
 *
 * @fileoverview Parlant-wrapped message content utilities with conversational AI validation
 * @version 1.0.0
 * @author AIgent Parlant Integration Team
 */

import {
  parlantWrapper,
  ParlantWrapperRegistry,
  FunctionWrapperConfig,
} from "./parlant-wrapper.utils";
import {
  ValidationMode,
  ApprovalLevel,
  FunctionSecurityLevel,
  RiskLevel,
  ConversationPriority,
} from "../types/parlant.types";
import { ParlantIntegrationService } from "../services/parlant-integration.service";
import { Logger } from "@nestjs/common";

// Import original message content functions
import * as MessageContentUtils from "./messageContent.utils";

// Initialize logger and Parlant service
const logger = new Logger("ParlantMessageContentUtils");
const parlantService = new ParlantIntegrationService(); // This would be injected in real usage
const registry = ParlantWrapperRegistry.getInstance();

// ===========================
// TYPE GUARD FUNCTIONS (LOW RISK)
// ===========================

/**
 * Parlant-wrapped text content block validation with conversational AI validation
 * LOW risk type guard function with automated validation
 */
export const isTextContentBlock = parlantWrapper(
  MessageContentUtils.isTextContentBlock,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._AUTOMATIC)
  .securityLevel(FunctionSecurityLevel._PUBLIC)
  .riskLevel(RiskLevel._LOW)
  .timeout(5000)
  .conversationPriority(ConversationPriority._LOW)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped thinking content block validation with conversational AI validation
 * LOW risk type guard function with automated validation
 */
export const isThinkingContentBlock = parlantWrapper(
  MessageContentUtils.isThinkingContentBlock,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._AUTOMATIC)
  .securityLevel(FunctionSecurityLevel._PUBLIC)
  .riskLevel(RiskLevel._LOW)
  .timeout(5000)
  .conversationPriority(ConversationPriority._LOW)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped image content block validation with conversational AI validation
 * MEDIUM risk type guard function for image processing
 */
export const isImageContentBlock = parlantWrapper(
  MessageContentUtils.isImageContentBlock,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._AUTOMATIC)
  .securityLevel(FunctionSecurityLevel._INTERNAL)
  .riskLevel(RiskLevel._MODERATE)
  .timeout(10000)
  .conversationPriority(ConversationPriority._NORMAL)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped document content block validation with conversational AI validation
 * MEDIUM risk type guard function for document processing
 */
export const isDocumentContentBlock = parlantWrapper(
  MessageContentUtils.isDocumentContentBlock,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._AUTOMATIC)
  .securityLevel(FunctionSecurityLevel._INTERNAL)
  .riskLevel(RiskLevel._MODERATE)
  .timeout(10000)
  .conversationPriority(ConversationPriority._NORMAL)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped tool use content block validation with conversational AI validation
 * HIGH risk type guard function for tool execution validation
 */
export const isToolUseContentBlock = parlantWrapper(
  MessageContentUtils.isToolUseContentBlock,
  parlantService,
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(15000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped computer tool use validation with conversational AI validation
 * CRITICAL risk type guard function for computer automation validation
 */
export const isComputerToolUseContentBlock = parlantWrapper(
  MessageContentUtils.isComputerToolUseContentBlock,
  parlantService,
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._DUAL_APPROVAL)
  .securityLevel(FunctionSecurityLevel._RESTRICTED)
  .riskLevel(RiskLevel._CRITICAL)
  .timeout(30000)
  .conversationPriority(ConversationPriority._CRITICAL)
  .cacheable(false) // Never cache computer automation validation
  .build();

/**
 * Parlant-wrapped tool result content block validation with conversational AI validation
 * MEDIUM risk type guard function for tool result processing
 */
export const isToolResultContentBlock = parlantWrapper(
  MessageContentUtils.isToolResultContentBlock,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._INTERNAL)
  .riskLevel(RiskLevel._MODERATE)
  .timeout(10000)
  .conversationPriority(ConversationPriority._NORMAL)
  .cacheable(true)
  .build();

// ===========================
// CONTENT PROCESSING FUNCTIONS
// ===========================

/**
 * Parlant-wrapped content block extraction with conversational AI validation
 * MEDIUM risk content processing function
 */
export const extractContentBlocks = parlantWrapper(
  MessageContentUtils.extractContentBlocks,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._INTERNAL)
  .riskLevel(RiskLevel._MODERATE)
  .timeout(15000)
  .conversationPriority(ConversationPriority._NORMAL)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped content validation with conversational AI validation
 * HIGH risk content validation function
 */
export const validateContentBlock = parlantWrapper(
  MessageContentUtils.validateContentBlock,
  parlantService,
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(20000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped content sanitization with conversational AI validation
 * HIGH risk content sanitization function
 */
export const sanitizeContentBlock = parlantWrapper(
  MessageContentUtils.sanitizeContentBlock,
  parlantService,
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(20000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped content transformation with conversational AI validation
 * MEDIUM risk content transformation function
 */
export const transformContentBlock = parlantWrapper(
  MessageContentUtils.transformContentBlock,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._INTERNAL)
  .riskLevel(RiskLevel._MODERATE)
  .timeout(15000)
  .conversationPriority(ConversationPriority._NORMAL)
  .cacheable(true)
  .build();

// ===========================
// COMPUTER INTERACTION FUNCTIONS (CRITICAL)
// ===========================

/**
 * Parlant-wrapped mouse action validation with conversational AI validation
 * CRITICAL risk computer interaction function
 */
export const isMouseActionBlock = parlantWrapper(
  MessageContentUtils.isMouseActionBlock,
  parlantService,
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._DUAL_APPROVAL)
  .securityLevel(FunctionSecurityLevel._RESTRICTED)
  .riskLevel(RiskLevel._CRITICAL)
  .timeout(30000)
  .conversationPriority(ConversationPriority._CRITICAL)
  .cacheable(false)
  .build();

/**
 * Parlant-wrapped keyboard action validation with conversational AI validation
 * CRITICAL risk computer interaction function
 */
export const isKeyboardActionBlock = parlantWrapper(
  MessageContentUtils.isKeyboardActionBlock,
  parlantService,
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._DUAL_APPROVAL)
  .securityLevel(FunctionSecurityLevel._RESTRICTED)
  .riskLevel(RiskLevel._CRITICAL)
  .timeout(30000)
  .conversationPriority(ConversationPriority._CRITICAL)
  .cacheable(false)
  .build();

/**
 * Parlant-wrapped file operation validation with conversational AI validation
 * CRITICAL risk file system operation function
 */
export const isFileOperationBlock = parlantWrapper(
  MessageContentUtils.isFileOperationBlock,
  parlantService,
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._DUAL_APPROVAL)
  .securityLevel(FunctionSecurityLevel._RESTRICTED)
  .riskLevel(RiskLevel._CRITICAL)
  .timeout(30000)
  .conversationPriority(ConversationPriority._CRITICAL)
  .cacheable(false)
  .build();

// ===========================
// UTILITY REGISTRATION
// ===========================

/**
 * Register all Parlant-wrapped message content functions with the global registry
 */
export function registerParlantMessageContentFunctions(): void {
  const functions: Array<{
    name: string;
    func: (..._args: unknown[]) => unknown;
    level: FunctionSecurityLevel;
  }> = [
    // Type Guards - Low Risk
    {
      name: "isTextContentBlock",
      func: isTextContentBlock,
      level: FunctionSecurityLevel._PUBLIC,
    },
    {
      name: "isThinkingContentBlock",
      func: isThinkingContentBlock,
      level: FunctionSecurityLevel._PUBLIC,
    },

    // Content Processing - Medium Risk
    {
      name: "isImageContentBlock",
      func: isImageContentBlock,
      level: FunctionSecurityLevel._INTERNAL,
    },
    {
      name: "isDocumentContentBlock",
      func: isDocumentContentBlock,
      level: FunctionSecurityLevel._INTERNAL,
    },
    {
      name: "isToolResultContentBlock",
      func: isToolResultContentBlock,
      level: FunctionSecurityLevel._INTERNAL,
    },
    {
      name: "extractContentBlocks",
      func: extractContentBlocks,
      level: FunctionSecurityLevel._INTERNAL,
    },
    {
      name: "transformContentBlock",
      func: transformContentBlock,
      level: FunctionSecurityLevel._INTERNAL,
    },

    // High Risk Functions
    {
      name: "isToolUseContentBlock",
      func: isToolUseContentBlock,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "validateContentBlock",
      func: validateContentBlock,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "sanitizeContentBlock",
      func: sanitizeContentBlock,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },

    // Critical Risk Functions
    {
      name: "isComputerToolUseContentBlock",
      func: isComputerToolUseContentBlock,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "isMouseActionBlock",
      func: isMouseActionBlock,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "isKeyboardActionBlock",
      func: isKeyboardActionBlock,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "isFileOperationBlock",
      func: isFileOperationBlock,
      level: FunctionSecurityLevel._RESTRICTED,
    },
  ];

  for (const { name, func, level } of functions) {
    const config: FunctionWrapperConfig = {
      enabled: true,
      validationMode:
        level === FunctionSecurityLevel._RESTRICTED
          ? ValidationMode._INTERACTIVE
          : level === FunctionSecurityLevel._CONFIDENTIAL
            ? ValidationMode._INTERACTIVE
            : ValidationMode._AUTOMATED,
      approvalLevel:
        level === FunctionSecurityLevel._RESTRICTED
          ? ApprovalLevel._DUAL_APPROVAL
          : level === FunctionSecurityLevel._CONFIDENTIAL
            ? ApprovalLevel._SINGLE_APPROVAL
            : ApprovalLevel._AUTOMATIC,
      securityLevel: level,
      riskLevel:
        level === FunctionSecurityLevel._RESTRICTED
          ? RiskLevel._CRITICAL
          : level === FunctionSecurityLevel._CONFIDENTIAL
            ? RiskLevel._HIGH
            : level === FunctionSecurityLevel._INTERNAL
              ? RiskLevel._MODERATE
              : RiskLevel._LOW,
      timeout:
        level === FunctionSecurityLevel._RESTRICTED
          ? 30000
          : level === FunctionSecurityLevel._CONFIDENTIAL
            ? 20000
            : level === FunctionSecurityLevel._INTERNAL
              ? 15000
              : 10000,
      cacheable: level !== FunctionSecurityLevel._RESTRICTED, // Never cache critical operations
      rules: [],
      conversationPriority:
        level === FunctionSecurityLevel._RESTRICTED
          ? ConversationPriority._CRITICAL
          : level === FunctionSecurityLevel._CONFIDENTIAL
            ? ConversationPriority._HIGH
            : level === FunctionSecurityLevel._INTERNAL
              ? ConversationPriority._NORMAL
              : ConversationPriority._LOW,
    };

    // Cast the function to WrappedFunction type for registry compatibility
    const wrappedFunc = func as unknown as import("./parlant-wrapper.utils").WrappedFunction<(..._args: unknown[]) => unknown>;
    registry.register(`messageContent.${name}`, wrappedFunc, config);
  }

  logger.log(
    `Registered ${functions.length} Parlant-wrapped message content functions`,
    {
      critical: functions.filter(
        (f) => f.level === FunctionSecurityLevel._RESTRICTED,
      ).length,
      high: functions.filter(
        (f) => f.level === FunctionSecurityLevel._CONFIDENTIAL,
      ).length,
      medium: functions.filter(
        (f) => f.level === FunctionSecurityLevel._INTERNAL,
      ).length,
      low: functions.filter((f) => f.level === FunctionSecurityLevel._PUBLIC)
        .length,
    },
  );
}

/**
 * Get registry statistics for message content functions
 */
export function getMessageContentFunctionStats() {
  return registry.getStatistics();
}

// Initialize registration on module load
registerParlantMessageContentFunctions();

// Re-export original functions for backwards compatibility (with warning)
export const originalMessageContentUtils = MessageContentUtils;

logger.log("Parlant-wrapped message content utilities initialized", {
  message:
    "All message content processing functions now protected by conversational AI validation",
  criticalFunctions: 4,
  highSecurityFunctions: 3,
  mediumSecurityFunctions: 5,
  lowRiskFunctions: 2,
});
