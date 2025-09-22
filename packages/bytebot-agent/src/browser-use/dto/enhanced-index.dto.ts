/**
 * Enhanced Browser Use DTOs - Comprehensive Index
 *
 * Centralized exports for all enhanced browser use related Data Transfer Objects
 * with comprehensive validation, security controls, and enterprise features.
 * This module provides a single entry point for all browser automation DTOs.
 *
 * @fileoverview Enhanced browser use DTOs index with comprehensive exports
 * @version 2.0.0
 * @author DTO & Validation Agent
 * @since Browser-Use API Endpoints Implementation
 */

// Enhanced Task DTOs
export * from './enhanced-browser-task.dto';
export {
  ExecuteBrowserTaskDto,
  BrowserTaskResultDto,
  ErrorResponseDto,
  EnhancedTaskStatus,
  TaskPriority,
  SecurityLevel,
  URLSecurityConfig,
  EnhancedTaskConstraints,
  TaskBusinessMetadata,
} from './enhanced-browser-task.dto';

// Enhanced Navigation DTOs
export * from './enhanced-navigation.dto';
export {
  NavigationDto,
  NavigationResponseDto,
  NavigationWaitStrategy,
  URLValidationSeverity,
  TimeoutStrategy,
  PerformanceOptimization,
  URLSecurityValidation,
  NavigationRetryConfig,
} from './enhanced-navigation.dto';

// Enhanced Interaction DTOs
export * from './enhanced-interaction.dto';
export {
  ClickInteractionDto,
  TypeInteractionDto,
  ScrollInteractionDto,
  InteractionResponseDto,
  ClickType,
  InputMethod,
  ElementTargetingStrategy,
  InteractionSafetyLevel,
  ScrollBehavior,
  VisibilityRequirement,
  ElementLocator,
  Coordinates,
  InteractionTiming,
} from './enhanced-interaction.dto';

// Enhanced Screenshot DTOs
export * from './enhanced-screenshot.dto';
export {
  CaptureScreenshotDto,
  ScreenshotResponseDto,
  ScreenshotFormat,
  ScreenshotType,
  ImageQuality,
  ImageProcessingOperation,
  StorageOption,
  AnnotationType,
  ClipRegion,
  ScreenshotAnnotation,
  ImageProcessing,
  WaitConditions,
} from './enhanced-screenshot.dto';

// Enhanced Session Configuration DTOs
export * from './enhanced-session-config.dto';
export {
  SessionConfigDto,
  SessionStatusDto,
  BrowserType,
  SessionSecurityLevel,
  SessionIsolationLevel,
  PerformanceProfile,
  AutomationFramework,
  MonitoringLevel,
  BrowserArguments,
  NetworkConfiguration,
  ResourceManagement,
  SecurityConfiguration,
  BrowserCapabilities,
} from './enhanced-session-config.dto';

// Enhanced Response DTOs
export * from './enhanced-response.dto';
export {
  BaseEnhancedResponseDto,
  EnhancedListResponseDto,
  CreateUpdateResponseDto,
  DeleteResponseDto,
  StatusResponseDto,
  ResponseStatus,
  ErrorSeverity,
  ErrorCategory,
  ResponsePriority,
  ResponsePerformanceMetrics,
  EnhancedErrorDetails,
  WarningDetails,
  ResponseMetadata,
  PaginationInfo,
} from './enhanced-response.dto';

// Legacy DTOs for backward compatibility (re-export existing DTOs)
export * from './browser-task.dto';
export * from './browser-session.dto';
export * from './browser-data.dto';
export * from './browser-results.dto';
export * from './browser-screenshot.dto';
export * from './browser-monitoring.dto';
export * from './browser-form.dto';
export * from './browser-dom.dto';

/**
 * DTO Categories for organized imports
 */
export const DTOCategories = {
  // Enhanced DTOs
  ENHANCED_TASK: [
    'ExecuteBrowserTaskDto',
    'BrowserTaskResultDto',
    'ErrorResponseDto',
  ],
  ENHANCED_NAVIGATION: [
    'NavigationDto',
    'NavigationResponseDto',
  ],
  ENHANCED_INTERACTION: [
    'ClickInteractionDto',
    'TypeInteractionDto',
    'ScrollInteractionDto',
    'InteractionResponseDto',
  ],
  ENHANCED_SCREENSHOT: [
    'CaptureScreenshotDto',
    'ScreenshotResponseDto',
  ],
  ENHANCED_SESSION: [
    'SessionConfigDto',
    'SessionStatusDto',
  ],
  ENHANCED_RESPONSE: [
    'BaseEnhancedResponseDto',
    'EnhancedListResponseDto',
    'CreateUpdateResponseDto',
    'DeleteResponseDto',
    'StatusResponseDto',
  ],

  // Legacy DTOs
  LEGACY_TASK: [
    'CreateBrowserTaskDto',
    'UpdateBrowserTaskDto',
    'BrowserTaskResponseDto',
    'BrowserTaskStatusDto',
  ],
  LEGACY_SESSION: [
    'CreateBrowserSessionDto',
    'BrowserSessionResponseDto',
  ],
  LEGACY_SCREENSHOT: [
    'BrowserScreenshotDto',
  ],
  LEGACY_INTERACTION: [
    'BrowserNavigateDto',
    'BrowserClickDto',
    'BrowserTypeDto',
    'BrowserScrollDto',
  ],
} as const;

/**
 * DTO Validation Groups for different validation scenarios
 */
export const ValidationGroups = {
  CREATE: 'create',
  UPDATE: 'update',
  STRICT: 'strict',
  RELAXED: 'relaxed',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
} as const;

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  // URL patterns
  HTTP_URL: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
  SECURE_URL: /^https:\/\/[^\s/$.?#].[^\s]*$/i,

  // CSS selector patterns
  CSS_SELECTOR: /^[a-zA-Z0-9\s\-_#.,:[\]()>"'=*+~^$|\\]+$/,
  SIMPLE_CSS_SELECTOR: /^[a-zA-Z0-9\-_#.]+$/,

  // XPath patterns
  XPATH: /^(\/\/?[\w\-_\[\]@='":\(\)\s\.]*)+$/,

  // Identifier patterns
  UUID_V4: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,

  // Content patterns
  SAFE_HTML: /^[a-zA-Z0-9\s\-_.,!?()[\]{}:;"'+=@#$%^&*\/\\|<>]*$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  FILENAME: /^[a-zA-Z0-9\-_. ]+$/,

  // Security patterns
  NO_SCRIPT_TAGS: /^(?!.*<script).*$/i,
  NO_SQL_INJECTION: /^(?!.*(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)).*$/i,
} as const;

/**
 * Default values for common DTO properties
 */
export const DTODefaults = {
  TASK: {
    PRIORITY: TaskPriority.NORMAL,
    SECURITY_LEVEL: SecurityLevel.STANDARD,
    TIMEOUT_SECONDS: 600,
    MAX_ACTIONS: 1000,
  },
  NAVIGATION: {
    WAIT_STRATEGY: NavigationWaitStrategy.NETWORK_IDLE_0,
    TIMEOUT_SECONDS: 30,
    VALIDATION_SEVERITY: URLValidationSeverity.MODERATE,
  },
  INTERACTION: {
    CLICK_TYPE: ClickType.SINGLE,
    INPUT_METHOD: InputMethod.CLEAR_AND_TYPE,
    TARGETING_STRATEGY: ElementTargetingStrategy.CSS_SELECTOR,
    SAFETY_LEVEL: InteractionSafetyLevel.SAFE,
    TIMEOUT_SECONDS: 10,
  },
  SCREENSHOT: {
    TYPE: ScreenshotType.FULLPAGE,
    FORMAT: ScreenshotFormat.PNG,
    QUALITY: ImageQuality.STANDARD,
    STORAGE: StorageOption.MEMORY,
  },
  SESSION: {
    BROWSER_TYPE: BrowserType.CHROMIUM,
    FRAMEWORK: AutomationFramework.PUPPETEER,
    SECURITY_LEVEL: SessionSecurityLevel.STANDARD,
    ISOLATION_LEVEL: SessionIsolationLevel.PROCESS,
    PERFORMANCE_PROFILE: PerformanceProfile.BALANCED,
    MONITORING_LEVEL: MonitoringLevel.BASIC,
  },
  RESPONSE: {
    STATUS: ResponseStatus.SUCCESS,
    PRIORITY: ResponsePriority.NORMAL,
    API_VERSION: 'v2.0.0',
  },
} as const;

/**
 * Type definitions for enhanced type safety
 */
export type EnhancedDTOType =
  | 'task'
  | 'navigation'
  | 'interaction'
  | 'screenshot'
  | 'session'
  | 'response';

export type ValidationMode =
  | 'strict'
  | 'standard'
  | 'relaxed'
  | 'development'
  | 'production';

export type SecurityMode =
  | 'minimal'
  | 'standard'
  | 'enhanced'
  | 'maximum'
  | 'compliance';

/**
 * Utility functions for DTO operations
 */
export const DTOUtils = {
  /**
   * Check if a DTO is an enhanced type
   */
  isEnhancedDTO: (dto: any): boolean => {
    return dto && typeof dto === 'object' && dto.constructor.name.includes('Enhanced');
  },

  /**
   * Get default values for a DTO type
   */
  getDefaults: (dtoType: EnhancedDTOType): any => {
    return DTODefaults[dtoType.toUpperCase() as keyof typeof DTODefaults];
  },

  /**
   * Validate a pattern against predefined regex
   */
  validatePattern: (value: string, patternName: keyof typeof ValidationPatterns): boolean => {
    return ValidationPatterns[patternName].test(value);
  },

  /**
   * Get DTOs by category
   */
  getDTOsByCategory: (category: keyof typeof DTOCategories): readonly string[] => {
    return DTOCategories[category];
  },
} as const;