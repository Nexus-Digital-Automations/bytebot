/**
 * Parlant-Wrapped Security Utilities - Conversational AI Validated Security Functions
 *
 * This module provides Parlant conversational AI validation for all security utility functions
 * across the Bytebot platform. Every security operation is validated through conversational
 * AI to ensure maximum security compliance and auditability.
 *
 * @fileoverview Parlant-wrapped security utilities with conversational AI validation
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

// Import original security functions
import * as SecurityUtils from "./security.utils";

// Initialize logger and Parlant service
const logger = new Logger("ParlantSecurityUtils");
const parlantService = new ParlantIntegrationService(); // This would be injected in real usage
const registry = ParlantWrapperRegistry.getInstance();

// ===========================
// CRITICAL SECURITY FUNCTIONS
// ===========================

/**
 * Parlant-wrapped password verification with conversational AI validation
 * CRITICAL security function for authentication
 */
export const verifyPassword = parlantWrapper(
  SecurityUtils.verifyPassword,
  parlantService,
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
 * Parlant-wrapped access token generation with conversational AI validation
 * CRITICAL security function for authentication tokens
 */
export const generateAccessToken = parlantWrapper(
  SecurityUtils.generateAccessToken,
  parlantService,
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
 * Parlant-wrapped refresh token generation with conversational AI validation
 * CRITICAL security function for refresh tokens
 */
export const generateRefreshToken = parlantWrapper(
  SecurityUtils.generateRefreshToken,
  parlantService,
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
 * Parlant-wrapped token verification with conversational AI validation
 * CRITICAL security function for token validation
 */
export const verifyToken = parlantWrapper(
  SecurityUtils.verifyToken,
  parlantService,
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._DUAL_APPROVAL)
  .securityLevel(FunctionSecurityLevel._RESTRICTED)
  .riskLevel(RiskLevel._CRITICAL)
  .timeout(60000)
  .conversationPriority(ConversationPriority._CRITICAL)
  .cacheable(true) // Can cache valid token verifications
  .build();

// ===========================
// HIGH SECURITY FUNCTIONS
// ===========================

/**
 * Parlant-wrapped password validation with conversational AI validation
 * HIGH security function for password policy enforcement
 */
export const validatePassword = parlantWrapper(
  SecurityUtils.validatePassword,
  parlantService,
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(30000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped secure password generation with conversational AI validation
 * HIGH security function for password generation
 */
export const generateSecurePassword = parlantWrapper(
  SecurityUtils.generateSecurePassword,
  parlantService,
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(30000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(false) // Never cache generated passwords
  .build();

/**
 * Parlant-wrapped input sanitization with conversational AI validation
 * HIGH security function for XSS prevention
 */
export const sanitizeInput = parlantWrapper(
  SecurityUtils.sanitizeInput,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(15000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped object sanitization with conversational AI validation
 * HIGH security function for comprehensive object sanitization
 */
export const sanitizeObject = parlantWrapper(
  SecurityUtils.sanitizeObject,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(15000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped XSS detection with conversational AI validation
 * HIGH security function for XSS threat detection
 */
export const detectXSS = parlantWrapper(SecurityUtils.detectXSS, parlantService)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(15000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

// ===========================
// MEDIUM SECURITY FUNCTIONS
// ===========================

/**
 * Parlant-wrapped SQL injection detection with conversational AI validation
 * MEDIUM security function for SQL injection prevention
 */
export const detectSQLInjection = parlantWrapper(
  SecurityUtils.detectSQLInjection,
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
 * Parlant-wrapped command injection detection with conversational AI validation
 * MEDIUM security function for command injection prevention
 */
export const detectCommandInjection = parlantWrapper(
  SecurityUtils.detectCommandInjection,
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
 * Parlant-wrapped path traversal detection with conversational AI validation
 * MEDIUM security function for path traversal prevention
 */
export const detectPathTraversal = parlantWrapper(
  SecurityUtils.detectPathTraversal,
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
 * Parlant-wrapped password hashing function with conversational AI validation
 * CRITICAL security function requiring dual approval for password operations
 */
export const hashPassword = parlantWrapper(
  SecurityUtils.hashPassword,
  parlantService,
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
 * Parlant-wrapped data hashing with conversational AI validation
 * HIGH security function for data integrity operations
 */
export const hashData = parlantWrapper(SecurityUtils.hashData, parlantService)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(30000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(false)
  .build();

/**
 * Parlant-wrapped HMAC generation with conversational AI validation
 * CRITICAL security function for cryptographic signatures
 */
export const generateHMAC = parlantWrapper(
  SecurityUtils.generateHMAC,
  parlantService,
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
 * Parlant-wrapped HMAC verification with conversational AI validation
 * CRITICAL security function for signature validation
 */
export const verifyHMAC = parlantWrapper(
  SecurityUtils.verifyHMAC,
  parlantService,
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
 * Parlant-wrapped random string generation with conversational AI validation
 * HIGH security function for secure random generation
 */
export const generateRandomString = parlantWrapper(
  SecurityUtils.generateRandomString,
  parlantService,
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(30000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(false)
  .build();

// ===========================
// ACCESS CONTROL FUNCTIONS
// ===========================

/**
 * Parlant-wrapped permission checking with conversational AI validation
 * HIGH security function for access control
 */
export const hasPermission = parlantWrapper(
  SecurityUtils.hasPermission,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(15000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped role checking with conversational AI validation
 * HIGH security function for role-based access control
 */
export const hasRole = parlantWrapper(SecurityUtils.hasRole, parlantService)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(15000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

// ===========================
// SECURITY EVENT FUNCTIONS
// ===========================

/**
 * Parlant-wrapped security event creation with conversational AI validation
 * HIGH security function for audit trail generation
 */
export const createSecurityEvent = parlantWrapper(
  SecurityUtils.createSecurityEvent,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(15000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(false)
  .build();

/**
 * Parlant-wrapped event ID generation with conversational AI validation
 * MEDIUM security function for unique identifier generation
 */
export const generateEventId = parlantWrapper(
  SecurityUtils.generateEventId,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._AUTOMATIC)
  .securityLevel(FunctionSecurityLevel._INTERNAL)
  .riskLevel(RiskLevel._MODERATE)
  .timeout(10000)
  .conversationPriority(ConversationPriority._NORMAL)
  .cacheable(false)
  .build();

/**
 * Parlant-wrapped risk score calculation with conversational AI validation
 * HIGH security function for threat assessment
 */
export const calculateRiskScore = parlantWrapper(
  SecurityUtils.calculateRiskScore,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(20000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

// ===========================
// RATE LIMITING FUNCTIONS
// ===========================

/**
 * Parlant-wrapped rate limit config retrieval with conversational AI validation
 * MEDIUM security function for rate limiting configuration
 */
export const getRateLimitConfig = parlantWrapper(
  SecurityUtils.getRateLimitConfig,
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
 * Parlant-wrapped rate limit key generation with conversational AI validation
 * MEDIUM security function for rate limiting key generation
 */
export const generateRateLimitKey = parlantWrapper(
  SecurityUtils.generateRateLimitKey,
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

// ===========================
// FILE SECURITY FUNCTIONS
// ===========================

/**
 * Parlant-wrapped malicious file detection with conversational AI validation
 * CRITICAL security function for file content analysis
 */
export const detectMaliciousFileContent = parlantWrapper(
  SecurityUtils.detectMaliciousFileContent,
  parlantService,
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
 * Parlant-wrapped file path validation with conversational AI validation
 * HIGH security function for path validation
 */
export const validateFilePath = parlantWrapper(
  SecurityUtils.validateFilePath,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(15000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped file content scanning with conversational AI validation
 * HIGH security function for comprehensive file analysis
 */
export const scanFileContent = parlantWrapper(
  SecurityUtils.scanFileContent,
  parlantService,
)
  .validationMode(ValidationMode._INTERACTIVE)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(30000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(false)
  .build();

// ===========================
// VALIDATION FUNCTIONS
// ===========================

/**
 * Parlant-wrapped coordinate validation with conversational AI validation
 * LOW security function for data validation
 */
export const validateCoordinates = parlantWrapper(
  SecurityUtils.validateCoordinates,
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

// ===========================
// ADVANCED THREAT DETECTION
// ===========================

/**
 * Parlant-wrapped advanced XSS detection with conversational AI validation
 * HIGH security function for sophisticated XSS analysis
 */
export const detectAdvancedXSS = parlantWrapper(
  SecurityUtils.detectAdvancedXSS,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(20000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped context-aware content sanitization with conversational AI validation
 * HIGH security function for contextual sanitization
 */
export const sanitizeContentByContext = parlantWrapper(
  SecurityUtils.sanitizeContentByContext,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(15000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped CSP header generation with conversational AI validation
 * HIGH security function for Content Security Policy generation
 */
export const generateCSPHeader = parlantWrapper(
  SecurityUtils.generateCSPHeader,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(15000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped advanced command injection detection with conversational AI validation
 * HIGH security function for sophisticated command injection analysis
 */
export const detectCommandInjectionAdvanced = parlantWrapper(
  SecurityUtils.detectCommandInjectionAdvanced,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(20000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped template injection detection with conversational AI validation
 * HIGH security function for template injection prevention
 */
export const detectTemplateInjection = parlantWrapper(
  SecurityUtils.detectTemplateInjection,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(20000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped LDAP injection detection with conversational AI validation
 * HIGH security function for LDAP injection prevention
 */
export const detectLDAPInjection = parlantWrapper(
  SecurityUtils.detectLDAPInjection,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(15000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped XML injection detection with conversational AI validation
 * HIGH security function for XML injection prevention
 */
export const detectXMLInjection = parlantWrapper(
  SecurityUtils.detectXMLInjection,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(15000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped NoSQL injection detection with conversational AI validation
 * HIGH security function for NoSQL injection prevention
 */
export const detectNoSQLInjection = parlantWrapper(
  SecurityUtils.detectNoSQLInjection,
  parlantService,
)
  .validationMode(ValidationMode._AUTOMATED)
  .approvalLevel(ApprovalLevel._SINGLE_APPROVAL)
  .securityLevel(FunctionSecurityLevel._CONFIDENTIAL)
  .riskLevel(RiskLevel._HIGH)
  .timeout(15000)
  .conversationPriority(ConversationPriority._HIGH)
  .cacheable(true)
  .build();

/**
 * Parlant-wrapped comprehensive malicious pattern detection with conversational AI validation
 * CRITICAL security function for comprehensive threat analysis
 */
export const detectComprehensiveMaliciousPatterns = parlantWrapper(
  SecurityUtils.detectComprehensiveMaliciousPatterns,
  parlantService,
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
 * Parlant-wrapped legacy SQL injection detection with conversational AI validation
 * MEDIUM security function for backward compatibility
 */
export const detectSQLInjectionLegacy = parlantWrapper(
  SecurityUtils.detectSQLInjectionLegacy,
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
 * Parlant-wrapped rate limit configs retrieval with conversational AI validation
 * LOW security function for configuration access
 */
export const getAllRateLimitConfigs = parlantWrapper(
  SecurityUtils.getAllRateLimitConfigs,
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

// ===========================
// UTILITY REGISTRATION
// ===========================

/**
 * Register all Parlant-wrapped security functions with the global registry
 */
export function registerParlantSecurityFunctions(): void {
  const functions: Array<{
    name: string;
    func: (..._args: unknown[]) => Promise<unknown>;
    level: FunctionSecurityLevel;
  }> = [
    // CRITICAL SECURITY FUNCTIONS (Dual Approval Required)
    {
      name: "hashPassword",
      func: hashPassword,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "verifyPassword",
      func: verifyPassword,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "generateAccessToken",
      func: generateAccessToken,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "generateRefreshToken",
      func: generateRefreshToken,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "verifyToken",
      func: verifyToken,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "generateHMAC",
      func: generateHMAC,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "verifyHMAC",
      func: verifyHMAC,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "detectMaliciousFileContent",
      func: detectMaliciousFileContent,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "detectComprehensiveMaliciousPatterns",
      func: detectComprehensiveMaliciousPatterns,
      level: FunctionSecurityLevel._RESTRICTED,
    },

    // HIGH SECURITY FUNCTIONS (Single Approval Required)
    {
      name: "validatePassword",
      func: validatePassword,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "generateSecurePassword",
      func: generateSecurePassword,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "sanitizeInput",
      func: sanitizeInput,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "sanitizeObject",
      func: sanitizeObject,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "detectXSS",
      func: detectXSS,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "hashData",
      func: hashData,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "generateRandomString",
      func: generateRandomString,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "hasPermission",
      func: hasPermission,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "hasRole",
      func: hasRole,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "createSecurityEvent",
      func: createSecurityEvent,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "calculateRiskScore",
      func: calculateRiskScore,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "validateFilePath",
      func: validateFilePath,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "scanFileContent",
      func: scanFileContent,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "detectAdvancedXSS",
      func: detectAdvancedXSS,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "sanitizeContentByContext",
      func: sanitizeContentByContext,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "generateCSPHeader",
      func: generateCSPHeader,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "detectCommandInjectionAdvanced",
      func: detectCommandInjectionAdvanced,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "detectTemplateInjection",
      func: detectTemplateInjection,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "detectLDAPInjection",
      func: detectLDAPInjection,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "detectXMLInjection",
      func: detectXMLInjection,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "detectNoSQLInjection",
      func: detectNoSQLInjection,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },

    // MEDIUM SECURITY FUNCTIONS (Automatic Approval)
    {
      name: "detectSQLInjection",
      func: detectSQLInjection,
      level: FunctionSecurityLevel._INTERNAL,
    },
    {
      name: "detectCommandInjection",
      func: detectCommandInjection,
      level: FunctionSecurityLevel._INTERNAL,
    },
    {
      name: "detectPathTraversal",
      func: detectPathTraversal,
      level: FunctionSecurityLevel._INTERNAL,
    },
    {
      name: "generateEventId",
      func: generateEventId,
      level: FunctionSecurityLevel._INTERNAL,
    },
    {
      name: "getRateLimitConfig",
      func: getRateLimitConfig,
      level: FunctionSecurityLevel._INTERNAL,
    },
    {
      name: "generateRateLimitKey",
      func: generateRateLimitKey,
      level: FunctionSecurityLevel._INTERNAL,
    },
    {
      name: "detectSQLInjectionLegacy",
      func: detectSQLInjectionLegacy,
      level: FunctionSecurityLevel._INTERNAL,
    },

    // LOW SECURITY FUNCTIONS (Optional Approval)
    {
      name: "validateCoordinates",
      func: validateCoordinates,
      level: FunctionSecurityLevel._PUBLIC,
    },
    {
      name: "getAllRateLimitConfigs",
      func: getAllRateLimitConfigs,
      level: FunctionSecurityLevel._PUBLIC,
    },
  ];

  for (const { name, func, level } of functions) {
    const config: FunctionWrapperConfig = {
      enabled: true,
      validationMode:
        level === FunctionSecurityLevel._RESTRICTED
          ? ValidationMode._INTERACTIVE
          : ValidationMode._AUTOMATED,
      approvalLevel:
        level === FunctionSecurityLevel._RESTRICTED
          ? ApprovalLevel._DUAL_APPROVAL
          : ApprovalLevel._SINGLE_APPROVAL,
      securityLevel: level,
      riskLevel:
        level === FunctionSecurityLevel._RESTRICTED
          ? RiskLevel._CRITICAL
          : RiskLevel._HIGH,
      timeout: level === FunctionSecurityLevel._RESTRICTED ? 60000 : 30000,
      cacheable: !name.includes("generate") && !name.includes("hash"),
      rules: [],
      conversationPriority:
        level === FunctionSecurityLevel._RESTRICTED
          ? ConversationPriority._CRITICAL
          : ConversationPriority._HIGH,
    };

    registry.register(`security.${name}`, func, config);
  }

  logger.log(
    `Registered ${functions.length} Parlant-wrapped security functions`,
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
    },
  );
}

/**
 * Get registry statistics for security functions
 */
export function getSecurityFunctionStats() {
  return registry.getStatistics();
}

// Initialize registration on module load
registerParlantSecurityFunctions();

// Re-export original functions for backwards compatibility (with warning)
export const originalSecurityUtils = SecurityUtils;

logger.log("Parlant-wrapped security utilities initialized", {
  message:
    "All security functions now protected by conversational AI validation",
  criticalFunctions: 9, // RESTRICTED level functions requiring dual approval
  highSecurityFunctions: 21, // CONFIDENTIAL level functions requiring single approval
  mediumSecurityFunctions: 7, // INTERNAL level functions with automatic approval
  lowSecurityFunctions: 2, // PUBLIC level functions with optional approval
  totalFunctions: 39, // Total number of wrapped security functions
});
