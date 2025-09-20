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

// Security types - Runtime exports (enums, classes, functions)
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
  AuthCredentialsDto,
  RegisterUserDto,
} from "./types/security.types";

// Security types - Type-only exports (interfaces)
export type {
  SanitizationOptions,
  FilePathValidationResult,
  CoordinatesValidationResult,
  SecurityHeadersConfig,
  CorsConfig,
  SecurityEvent,
  XSSDetectionResult,
  SQLInjectionDetectionResult,
  CommandInjectionDetectionResult,
  JwtPayload,
  AuthTokenResponse,
  ValidationError,
  RateLimitConfig,
  JwtConfig,
  PasswordPolicy,
  SecurityConfig,
  ApiVersion,
  RoleMetadata,
  PermissionMetadata,
  ThrottleMetadata,
  SecurityError,
} from "./types/security.types";

// RBAC types - Runtime exports (enums)
export {
  ResourceType,
  Role as RBACRole,
  Permission as RBACPermission,
} from "./types/rbac.types";

// RBAC types - Type-only exports (interfaces, aliased to avoid conflicts with Parlant types)
export type {
  UserContext as RBACUserContext,
  RequestContext as RBACRequestContext,
} from "./types/rbac.types";

// Core Parlant types - Runtime exports (enums)
export {
  ValidationDecision,
  ConversationState,
  ConversationPriority,
  MessageType,
  FunctionSecurityLevel,
  RiskLevel,
  ValidationMode,
  ApprovalLevel,
  ParticipantRole,
  ParticipantType,
  ParticipantCapability,
  ExecutionEnvironment,
  ActorType,
  AuditAction,
  AuditEntryType,
} from "./types/parlant.types";

// Core Parlant types - Type-only exports (interfaces, using aliases to avoid conflicts with integration types)
export type {
  FunctionContext,
  SourceLocation,
  UserContext as ParlantCoreUserContext,
  RequestContext as ParlantCoreRequestContext,
  SessionContext,
  ValidationParameters,
  ParlantConversationContext,
  // Aliased exports to avoid conflicts
  ValidationResult as ParlantCoreValidationResult,
  ParlantValidationRequest as ParlantCoreValidationRequest,
  ParlantValidationResponse as ParlantCoreValidationResponse,
  ParlantAuditEntry as ParlantCoreAuditEntry,
} from "./types/parlant.types";

// Parlant integration types - Runtime exports (enums, classes)
export {
  SecurityLevel,
  ParlantMessageType,
  ParlantIntegrationError,
  ParlantValidationError,
  ParlantConnectionError,
  ParlantAuthenticationError,
  ParlantTimeoutError,
} from "./types/parlant-integration.types";

// Parlant integration types - Type-only exports (interfaces)
export type {
  ParlantValidationRequest,
  ParlantValidationResponse,
  ParlantAuditEntry,
  ParlantUserContext,
  ParlantServiceConfig,
  ParlantCacheEntry,
  ParlantHealthStatus,
  ParlantHealthMetrics,
  ParlantWebSocketMessage,
  ParlantFunctionWrapper,
  ParlantFunctionMetadata,
  ParlantValidationConfig as ParlantIntegrationValidationConfig,
} from "./types/parlant-integration.types";

// Export enums directly (these have runtime exports)
export { MessageContentType, Role } from "./types/messageContent.types";
// Note: ConversationState and other parlant types already exported above to prevent duplicates

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

// Note: Security enums and constants already exported above to prevent duplicates

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
