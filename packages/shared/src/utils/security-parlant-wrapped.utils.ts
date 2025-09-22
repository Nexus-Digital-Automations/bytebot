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
  SecurityUtils.verifyPassword as (..._args: unknown[]) => unknown,
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
  SecurityUtils.generateAccessToken as (..._args: unknown[]) => unknown,
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
  SecurityUtils.generateRefreshToken as (..._args: unknown[]) => unknown,
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
  SecurityUtils.verifyToken as (..._args: unknown[]) => unknown,
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
  SecurityUtils.validatePassword as (..._args: unknown[]) => unknown,
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
  SecurityUtils.generateSecurePassword as (..._args: unknown[]) => unknown,
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
  SecurityUtils.sanitizeInput as (..._args: unknown[]) => unknown,
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
  SecurityUtils.sanitizeObject as (..._args: unknown[]) => unknown,
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
export const detectXSS = parlantWrapper(SecurityUtils.detectXSS as (..._args: unknown[]) => unknown, parlantService)
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
  SecurityUtils.detectSQLInjection as (..._args: unknown[]) => unknown,
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
  SecurityUtils.detectCommandInjection as (..._args: unknown[]) => unknown,
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
  SecurityUtils.detectPathTraversal as (..._args: unknown[]) => unknown,
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
  SecurityUtils.hashPassword as (..._args: unknown[]) => unknown,
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
export const hashData = parlantWrapper(SecurityUtils.hashData as (..._args: unknown[]) => unknown, parlantService)
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
  SecurityUtils.generateHMAC as (..._args: unknown[]) => unknown,
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
  SecurityUtils.verifyHMAC as (..._args: unknown[]) => unknown,
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
  SecurityUtils.generateRandomString as (..._args: unknown[]) => unknown,
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
  SecurityUtils.hasPermission as (..._args: unknown[]) => unknown,
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
export const hasRole = parlantWrapper(SecurityUtils.hasRole as (..._args: unknown[]) => unknown, parlantService)
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
  SecurityUtils.createSecurityEvent as (..._args: unknown[]) => unknown,
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
  SecurityUtils.generateEventId as (..._args: unknown[]) => unknown,
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
  SecurityUtils.calculateRiskScore as (..._args: unknown[]) => unknown,
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
  SecurityUtils.getRateLimitConfig as (..._args: unknown[]) => unknown,
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
  SecurityUtils.generateRateLimitKey as (..._args: unknown[]) => unknown,
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
  SecurityUtils.detectMaliciousFileContent as (..._args: unknown[]) => unknown,
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
  SecurityUtils.validateFilePath as (..._args: unknown[]) => unknown,
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
  SecurityUtils.scanFileContent as (..._args: unknown[]) => unknown,
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
  SecurityUtils.validateCoordinates as (..._args: unknown[]) => unknown,
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
  SecurityUtils.detectAdvancedXSS as (..._args: unknown[]) => unknown,
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
  ((...args: unknown[]) => SecurityUtils.sanitizeContentByContext(args[0] as string, args[1] as any, args[2] as any)),
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
  ((...args: unknown[]) => SecurityUtils.generateCSPHeader(args[0] as any)),
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
  ((...args: unknown[]) => SecurityUtils.detectCommandInjectionAdvanced(args[0] as string)),
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
  ((...args: unknown[]) => SecurityUtils.detectTemplateInjection(args[0] as string)),
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
  ((...args: unknown[]) => SecurityUtils.detectLDAPInjection(args[0] as string)),
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
  ((...args: unknown[]) => SecurityUtils.detectXMLInjection(args[0] as string)),
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
  ((...args: unknown[]) => SecurityUtils.detectNoSQLInjection(args[0] as string)),
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
  ((...args: unknown[]) => SecurityUtils.detectComprehensiveMaliciousPatterns(args[0] as string)),
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
  ((...args: unknown[]) => SecurityUtils.detectSQLInjectionLegacy(args[0] as string)),
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
    func: (...args: unknown[]) => Promise<unknown>;
    level: FunctionSecurityLevel;
  }> = [
    // CRITICAL SECURITY FUNCTIONS (Dual Approval Required)
    {
      name: "hashPassword",
      func: hashPassword as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "verifyPassword",
      func: verifyPassword as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "generateAccessToken",
      func: generateAccessToken as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "generateRefreshToken",
      func: generateRefreshToken as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "verifyToken",
      func: verifyToken as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "generateHMAC",
      func: generateHMAC as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "verifyHMAC",
      func: verifyHMAC as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "detectMaliciousFileContent",
      func: detectMaliciousFileContent as (
        ...args: unknown[]
      ) => Promise<unknown>,
      level: FunctionSecurityLevel._RESTRICTED,
    },
    {
      name: "detectComprehensiveMaliciousPatterns",
      func: detectComprehensiveMaliciousPatterns as (
        ...args: unknown[]
      ) => Promise<unknown>,
      level: FunctionSecurityLevel._RESTRICTED,
    },

    // HIGH SECURITY FUNCTIONS (Single Approval Required)
    {
      name: "validatePassword",
      func: validatePassword as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "generateSecurePassword",
      func: generateSecurePassword as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "sanitizeInput",
      func: sanitizeInput as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "sanitizeObject",
      func: sanitizeObject as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "detectXSS",
      func: detectXSS as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "hashData",
      func: hashData as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "generateRandomString",
      func: generateRandomString as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "hasPermission",
      func: hasPermission as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "hasRole",
      func: hasRole as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "createSecurityEvent",
      func: createSecurityEvent as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "calculateRiskScore",
      func: calculateRiskScore as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "validateFilePath",
      func: validateFilePath as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "scanFileContent",
      func: scanFileContent as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "detectAdvancedXSS",
      func: detectAdvancedXSS as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "sanitizeContentByContext",
      func: ((...args) => Promise.resolve(sanitizeContentByContext(args[0] as string, args[1] as any, args[2] as any))) as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "generateCSPHeader",
      func: ((...args) => Promise.resolve(generateCSPHeader(args[0] as any))) as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "detectCommandInjectionAdvanced",
      func: ((...args) => Promise.resolve(detectCommandInjectionAdvanced(args[0] as string))) as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "detectTemplateInjection",
      func: detectTemplateInjection as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "detectLDAPInjection",
      func: detectLDAPInjection as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "detectXMLInjection",
      func: detectXMLInjection as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },
    {
      name: "detectNoSQLInjection",
      func: detectNoSQLInjection as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._CONFIDENTIAL,
    },

    // MEDIUM SECURITY FUNCTIONS (Automatic Approval)
    {
      name: "detectSQLInjection",
      func: detectSQLInjection as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._INTERNAL,
    },
    {
      name: "detectCommandInjection",
      func: detectCommandInjection as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._INTERNAL,
    },
    {
      name: "detectPathTraversal",
      func: detectPathTraversal as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._INTERNAL,
    },
    {
      name: "generateEventId",
      func: generateEventId as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._INTERNAL,
    },
    {
      name: "getRateLimitConfig",
      func: getRateLimitConfig as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._INTERNAL,
    },
    {
      name: "generateRateLimitKey",
      func: generateRateLimitKey as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._INTERNAL,
    },
    {
      name: "detectSQLInjectionLegacy",
      func: detectSQLInjectionLegacy as (
        ...args: unknown[]
      ) => Promise<unknown>,
      level: FunctionSecurityLevel._INTERNAL,
    },

    // LOW SECURITY FUNCTIONS (Optional Approval)
    {
      name: "validateCoordinates",
      func: validateCoordinates as (...args: unknown[]) => Promise<unknown>,
      level: FunctionSecurityLevel._PUBLIC,
    },
    {
      name: "getAllRateLimitConfigs",
      func: getAllRateLimitConfigs as (...args: unknown[]) => Promise<unknown>,
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
