/**
 * Client-safe exports for @bytebot/shared package
 *
 * This entry point only includes utilities and types that are safe
 * for browser/Next.js environments. Server-only components like
 * NestJS interceptors and services are excluded to prevent
 * Node.js dependency conflicts.
 */

// Core types - safe for client use
export * from "./types/messageContent.types";
export * from "./types/computerAction.types";
export * from "./types/agent.types";
export * from "./types/security.types";
export * from "./types/parlant.types";
export * from "./types/parlant-integration.types";

// Export enums directly (these have runtime exports)
export { MessageContentType, Role } from "./types/messageContent.types";
export { 
  ConversationState, 
  ConversationPriority, 
  MessageType, 
  ValidationDecision, 
  ParticipantType,
  ParticipantRole 
} from "./types/parlant.types";

// Type-only exports are handled by `export * from` above
// Individual type exports are commented out to prevent Next.js warnings

// Client-safe utilities - Re-export all functions
export * from "./utils/messageContent.utils";
export * from "./utils/computerAction.utils";

// Additional function exports that are frequently imported individually
export {
  isSetTaskStatusToolUseBlock,
  isCreateTaskToolUseBlock,
  isToolResultContentBlock,
  isThinkingContentBlock,
  isRedactedThinkingContentBlock,
  isToolUseContentBlock,
  isTextContentBlock,
  isImageContentBlock,
  isDocumentContentBlock,
  isComputerToolUseContentBlock,
  isUserActionContentBlock,
  isMessageContentBlock,
  getMessageContentBlockType,
  // Mouse tool block functions
  isMoveMouseToolUseBlock,
  isTraceMouseToolUseBlock,
  isClickMouseToolUseBlock,
  isCursorPositionToolUseBlock,
  isPressMouseToolUseBlock,
  isDragMouseToolUseBlock,
  isScrollToolUseBlock,
  // Keyboard tool block functions
  isTypeKeysToolUseBlock,
  isPressKeysToolUseBlock,
  isTypeTextToolUseBlock,
  isPasteTextToolUseBlock,
  // Utility tool block functions
  isWaitToolUseBlock,
  isScreenshotToolUseBlock,
  isApplicationToolUseBlock,
  isWriteFileToolUseBlock,
  isReadFileToolUseBlock,
} from "./utils/messageContent.utils";

// Export security enums and constants directly (these have runtime exports)
export {
  SecurityEventType,
  UserRole,
  Permission,
  RateLimitPreset,
  RateLimitServiceType,
  SecurityErrorCode,
  VersioningStrategy,
  DEFAULT_SANITIZATION_OPTIONS,
  createSecurityEvent,
} from "./types/security.types";

// Type-only exports are handled by `export * from` above

// Client-safe Security Utilities (browser-compatible subset)
export {
  sanitizeInput,
  sanitizeObject,
  detectXSS,
  detectSQLInjection,
  detectCommandInjection,
  hasPermission,
  hasRole,
  DEFAULT_PASSWORD_POLICY,
  ROLE_PERMISSIONS,
  detectComprehensiveMaliciousPatterns,
  detectAdvancedXSS,
  detectMaliciousFileContent,
  validateFilePath,
  validateCoordinates,
} from "./utils/security-client.utils";

// Task Management DTOs - types only, safe for client
export * from "./dto/task-validation.dto";

// Note: The following are excluded from client builds to prevent Node.js dependency conflicts:
// - NestJS interceptors and services
// - Server-only middleware components
// - NestJS decorators and modules
// - Enterprise validation services that depend on NestJS
//
// These should be imported directly from the server entry point when needed:
// import { CriticalAreaSanitizationInterceptor } from "@bytebot/shared/server";
