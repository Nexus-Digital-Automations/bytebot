/**
 * Parlant-Wrapped Computer Action Utilities - Conversational AI Validated Computer Automation
 *
 * This module provides Parlant conversational AI validation for ALL computer action utility functions
 * across the Bytebot platform. Every computer automation operation is validated through conversational
 * AI to ensure maximum security, safety, and compliance for system-level operations.
 *
 * @fileoverview Parlant-wrapped computer action utilities with conversational AI validation
 * @version 1.0.0
 * @author AIgent Parlant Integration Team
 */

import {
  createParlantWrapper,
  parlantWrapper,
  ParlantWrapperRegistry,
  FunctionWrapperConfig,
} from './parlant-wrapper.utils';
import {
  ValidationMode,
  ApprovalLevel,
  FunctionSecurityLevel,
  RiskLevel,
  ConversationPriority,
} from '../types/parlant.types';
import { ParlantIntegrationService } from '../services/parlant-integration.service';
import { Logger } from '@nestjs/common';

// Import original computer action functions
import * as ComputerActionUtils from './computerAction.utils';

// Initialize logger and Parlant service
const logger = new Logger('ParlantComputerActionUtils');
const parlantService = new ParlantIntegrationService(); // This would be injected in real usage
const registry = ParlantWrapperRegistry.getInstance();

// ===========================
// CRITICAL COMPUTER AUTOMATION FUNCTIONS
// ===========================

/**
 * Parlant-wrapped move mouse action converter with conversational AI validation
 * CRITICAL security function for computer automation
 */
export const convertMoveMouseActionToToolUseBlock = parlantWrapper(
  ComputerActionUtils.convertMoveMouseActionToToolUseBlock,
  parlantService
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._DUAL_APPROVAL)
  .securityLevel(FunctionSecurityLevel._RESTRICTED)
  .riskLevel(RiskLevel._CRITICAL)
  .timeout(60000)
  .conversationPriority(ConversationPriority._CRITICAL)
  .cacheable(false) // Never cache computer automation operations
  .build();

/**
 * Parlant-wrapped trace mouse action converter with conversational AI validation
 * CRITICAL security function for computer automation
 */
export const convertTraceMouseActionToToolUseBlock = parlantWrapper(
  ComputerActionUtils.convertTraceMouseActionToToolUseBlock,
  parlantService
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._DUAL_APPROVAL)
  .securityLevel(FunctionSecurityLevel._RESTRICTED)
  .riskLevel(RiskLevel._CRITICAL)
  .timeout(60000)
  .conversationPriority(ConversationPriority._CRITICAL)
  .cacheable(false)
  .build();

/**
 * Parlant-wrapped click mouse action converter with conversational AI validation
 * CRITICAL security function for computer automation
 */
export const convertClickMouseActionToToolUseBlock = parlantWrapper(
  ComputerActionUtils.convertClickMouseActionToToolUseBlock,
  parlantService
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._DUAL_APPROVAL)
  .securityLevel(FunctionSecurityLevel._RESTRICTED)
  .riskLevel(RiskLevel._CRITICAL)
  .timeout(60000)
  .conversationPriority(ConversationPriority._CRITICAL)
  .cacheable(false)
  .build();

/**
 * Parlant-wrapped press mouse action converter with conversational AI validation
 * CRITICAL security function for computer automation
 */
export const convertPressMouseActionToToolUseBlock = parlantWrapper(
  ComputerActionUtils.convertPressMouseActionToToolUseBlock,
  parlantService
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._DUAL_APPROVAL)
  .securityLevel(FunctionSecurityLevel._RESTRICTED)
  .riskLevel(RiskLevel._CRITICAL)
  .timeout(60000)
  .conversationPriority(ConversationPriority._CRITICAL)
  .cacheable(false)
  .build();

/**
 * Parlant-wrapped drag mouse action converter with conversational AI validation
 * CRITICAL security function for computer automation
 */
export const convertDragMouseActionToToolUseBlock = parlantWrapper(
  ComputerActionUtils.convertDragMouseActionToToolUseBlock,
  parlantService
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._DUAL_APPROVAL)
  .securityLevel(FunctionSecurityLevel._RESTRICTED)
  .riskLevel(RiskLevel._CRITICAL)
  .timeout(60000)
  .conversationPriority(ConversationPriority._CRITICAL)
  .cacheable(false)
  .build();

/**
 * Parlant-wrapped scroll action converter with conversational AI validation
 * CRITICAL security function for computer automation
 */
export const convertScrollActionToToolUseBlock = parlantWrapper(
  ComputerActionUtils.convertScrollActionToToolUseBlock,
  parlantService
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._DUAL_APPROVAL)
  .securityLevel(FunctionSecurityLevel._RESTRICTED)
  .riskLevel(RiskLevel._CRITICAL)
  .timeout(60000)
  .conversationPriority(ConversationPriority._CRITICAL)
  .cacheable(false)
  .build();

/**
 * Parlant-wrapped type keys action converter with conversational AI validation
 * CRITICAL security function for keyboard automation
 */
export const convertTypeKeysActionToToolUseBlock = parlantWrapper(
  ComputerActionUtils.convertTypeKeysActionToToolUseBlock,
  parlantService
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._DUAL_APPROVAL)
  .securityLevel(FunctionSecurityLevel._RESTRICTED)
  .riskLevel(RiskLevel._CRITICAL)
  .timeout(60000)
  .conversationPriority(ConversationPriority._CRITICAL)
  .cacheable(false)
  .build();

/**
 * Parlant-wrapped press keys action converter with conversational AI validation
 * CRITICAL security function for keyboard automation
 */
export const convertPressKeysActionToToolUseBlock = parlantWrapper(
  ComputerActionUtils.convertPressKeysActionToToolUseBlock,
  parlantService
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._DUAL_APPROVAL)
  .securityLevel(FunctionSecurityLevel._RESTRICTED)
  .riskLevel(RiskLevel._CRITICAL)
  .timeout(60000)
  .conversationPriority(ConversationPriority._CRITICAL)
  .cacheable(false)
  .build();

/**
 * Parlant-wrapped type text action converter with conversational AI validation
 * CRITICAL security function for text input automation
 */
export const convertTypeTextActionToToolUseBlock = parlantWrapper(
  ComputerActionUtils.convertTypeTextActionToToolUseBlock,
  parlantService
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._DUAL_APPROVAL)
  .securityLevel(FunctionSecurityLevel._RESTRICTED)
  .riskLevel(RiskLevel._CRITICAL)
  .timeout(60000)
  .conversationPriority(ConversationPriority._CRITICAL)
  .cacheable(false)
  .build();

/**
 * Parlant-wrapped paste text action converter with conversational AI validation
 * CRITICAL security function for clipboard automation
 */
export const convertPasteTextActionToToolUseBlock = parlantWrapper(
  ComputerActionUtils.convertPasteTextActionToToolUseBlock,
  parlantService
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._DUAL_APPROVAL)
  .securityLevel(FunctionSecurityLevel._RESTRICTED)
  .riskLevel(RiskLevel._CRITICAL)
  .timeout(60000)
  .conversationPriority(ConversationPriority._CRITICAL)
  .cacheable(false)
  .build();

/**
 * Parlant-wrapped wait action converter with conversational AI validation
 * HIGH security function for timing control
 */
export const convertWaitActionToToolUseBlock = parlantWrapper(
  ComputerActionUtils.convertWaitActionToToolUseBlock,
  parlantService
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(30000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(false)
  .build();

/**
 * Parlant-wrapped screenshot action converter with conversational AI validation
 * HIGH security function for screen capture
 */
export const convertScreenshotActionToToolUseBlock = parlantWrapper(
  ComputerActionUtils.convertScreenshotActionToToolUseBlock,
  parlantService
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(30000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(false)
  .build();

/**
 * Parlant-wrapped cursor position action converter with conversational AI validation
 * MEDIUM security function for cursor positioning
 */
export const convertCursorPositionActionToToolUseBlock = parlantWrapper(
  ComputerActionUtils.convertCursorPositionActionToToolUseBlock,
  parlantService
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
 * Parlant-wrapped application action converter with conversational AI validation
 * CRITICAL security function for application control
 */
export const convertApplicationActionToToolUseBlock = parlantWrapper(
  ComputerActionUtils.convertApplicationActionToToolUseBlock,
  parlantService
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._DUAL_APPROVAL)
  .securityLevel(FunctionSecurityLevel._RESTRICTED)
  .riskLevel(RiskLevel._CRITICAL)
  .timeout(60000)
  .conversationPriority(ConversationPriority._CRITICAL)
  .cacheable(false)
  .build();

// ===========================
// FILE SYSTEM OPERATIONS (CRITICAL)
// ===========================

/**
 * Parlant-wrapped write file action converter with conversational AI validation
 * CRITICAL security function for file system write operations
 */
export const convertWriteFileActionToToolUseBlock = parlantWrapper(
  ComputerActionUtils.convertWriteFileActionToToolUseBlock,
  parlantService
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._DUAL_APPROVAL)
  .securityLevel(FunctionSecurityLevel._RESTRICTED)
  .riskLevel(RiskLevel._CRITICAL)
  .timeout(60000)
  .conversationPriority(ConversationPriority._CRITICAL)
  .cacheable(false)
  .build();

/**
 * Parlant-wrapped read file action converter with conversational AI validation
 * HIGH security function for file system read operations
 */
export const convertReadFileActionToToolUseBlock = parlantWrapper(
  ComputerActionUtils.convertReadFileActionToToolUseBlock,
  parlantService
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(30000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

// ===========================
// TYPE GUARD FUNCTIONS
// ===========================

/**
 * Parlant-wrapped computer tool use validation with conversational AI validation
 * HIGH security type guard for computer automation
 */
export const isComputerToolUseContentBlock = parlantWrapper(
  ComputerActionUtils.isComputerToolUseContentBlock,
  parlantService
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(15000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

// ===========================
// UTILITY REGISTRATION
// ===========================

/**
 * Register all Parlant-wrapped computer action functions with the global registry
 */
export function registerParlantComputerActionFunctions(): void {
  const functions: Array<{ name: string; func: any; level: FunctionSecurityLevel }> = [
    // Critical Computer Automation Functions
    { name: 'convertMoveMouseActionToToolUseBlock', func: convertMoveMouseActionToToolUseBlock, level: FunctionSecurityLevel._RESTRICTED },
    { name: 'convertTraceMouseActionToToolUseBlock', func: convertTraceMouseActionToToolUseBlock, level: FunctionSecurityLevel._RESTRICTED },
    { name: 'convertClickMouseActionToToolUseBlock', func: convertClickMouseActionToToolUseBlock, level: FunctionSecurityLevel._RESTRICTED },
    { name: 'convertPressMouseActionToToolUseBlock', func: convertPressMouseActionToToolUseBlock, level: FunctionSecurityLevel._RESTRICTED },
    { name: 'convertDragMouseActionToToolUseBlock', func: convertDragMouseActionToToolUseBlock, level: FunctionSecurityLevel._RESTRICTED },
    { name: 'convertScrollActionToToolUseBlock', func: convertScrollActionToToolUseBlock, level: FunctionSecurityLevel._RESTRICTED },
    { name: 'convertTypeKeysActionToToolUseBlock', func: convertTypeKeysActionToToolUseBlock, level: FunctionSecurityLevel._RESTRICTED },
    { name: 'convertPressKeysActionToToolUseBlock', func: convertPressKeysActionToToolUseBlock, level: FunctionSecurityLevel._RESTRICTED },
    { name: 'convertTypeTextActionToToolUseBlock', func: convertTypeTextActionToToolUseBlock, level: FunctionSecurityLevel._RESTRICTED },
    { name: 'convertPasteTextActionToToolUseBlock', func: convertPasteTextActionToToolUseBlock, level: FunctionSecurityLevel._RESTRICTED },
    { name: 'convertApplicationActionToToolUseBlock', func: convertApplicationActionToToolUseBlock, level: FunctionSecurityLevel._RESTRICTED },
    { name: 'convertWriteFileActionToToolUseBlock', func: convertWriteFileActionToToolUseBlock, level: FunctionSecurityLevel._RESTRICTED },

    // High Security Functions
    { name: 'convertWaitActionToToolUseBlock', func: convertWaitActionToToolUseBlock, level: FunctionSecurityLevel._CONFIDENTIAL },
    { name: 'convertScreenshotActionToToolUseBlock', func: convertScreenshotActionToToolUseBlock, level: FunctionSecurityLevel._CONFIDENTIAL },
    { name: 'convertReadFileActionToToolUseBlock', func: convertReadFileActionToToolUseBlock, level: FunctionSecurityLevel._CONFIDENTIAL },
    { name: 'isComputerToolUseContentBlock', func: isComputerToolUseContentBlock, level: FunctionSecurityLevel._CONFIDENTIAL },

    // Medium Security Functions
    { name: 'convertCursorPositionActionToToolUseBlock', func: convertCursorPositionActionToToolUseBlock, level: FunctionSecurityLevel._INTERNAL },
  ];

  for (const { name, func, level } of functions) {
    const config: FunctionWrapperConfig = {
      enabled: true,
      validationMode: level === FunctionSecurityLevel._RESTRICTED 
        ? ValidationMode._INTERACTIVE 
        : level === FunctionSecurityLevel._CONFIDENTIAL
        ? ValidationMode._INTERACTIVE
        : ValidationMode._AUTOMATED,
      approvalLevel: level === FunctionSecurityLevel._RESTRICTED
        ? ApprovalLevel._DUAL_APPROVAL
        : level === FunctionSecurityLevel._CONFIDENTIAL
        ? ApprovalLevel._SINGLE_APPROVAL
        : ApprovalLevel._AUTOMATIC,
      securityLevel: level,
      riskLevel: level === FunctionSecurityLevel._RESTRICTED
        ? RiskLevel._CRITICAL
        : level === FunctionSecurityLevel._CONFIDENTIAL
        ? RiskLevel._HIGH
        : RiskLevel._MODERATE,
      timeout: level === FunctionSecurityLevel._RESTRICTED ? 60000 : 
               level === FunctionSecurityLevel._CONFIDENTIAL ? 30000 : 15000,
      cacheable: level === FunctionSecurityLevel._INTERNAL, // Only cache low-risk operations
      rules: [],
      conversationPriority: level === FunctionSecurityLevel._RESTRICTED
        ? ConversationPriority._CRITICAL
        : level === FunctionSecurityLevel._CONFIDENTIAL
        ? ConversationPriority._HIGH
        : ConversationPriority._NORMAL,
    };

    registry.register(`computerAction.${name}`, func, config);
  }

  logger.log(`Registered ${functions.length} Parlant-wrapped computer action functions`, {
    critical: functions.filter(f => f.level === FunctionSecurityLevel._RESTRICTED).length,
    high: functions.filter(f => f.level === FunctionSecurityLevel._CONFIDENTIAL).length,
    medium: functions.filter(f => f.level === FunctionSecurityLevel._INTERNAL).length,
  });
}

/**
 * Get registry statistics for computer action functions
 */
export function getComputerActionFunctionStats() {
  return registry.getStatistics();
}

// Initialize registration on module load
registerParlantComputerActionFunctions();

// Re-export original functions for backwards compatibility (with warning)
export const originalComputerActionUtils = ComputerActionUtils;

logger.log('Parlant-wrapped computer action utilities initialized', {
  message: 'ALL computer automation functions now protected by conversational AI validation',
  criticalFunctions: 12,
  highSecurityFunctions: 4,
  mediumSecurityFunctions: 1,
  warningMessage: 'Computer automation requires dual approval and conversational validation',
});