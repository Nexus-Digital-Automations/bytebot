/**
 * Browser Security Decorators - ByteBotd Computer Control Service
 * Specialized security decorators for browser automation endpoints
 *
 * Features:
 * - URL whitelisting and validation decorators
 * - XSS protection decorators
 * - Script injection prevention
 * - Rate limiting for browser operations
 * - Session isolation enforcement
 * - Audit logging for browser actions
 *
 * @author Security Implementation Specialist
 * @version 2.0.0
 * @since ByteBotd Browser Security Implementation
 */

import {
  SetMetadata,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { UserRole, Permission } from '@bytebot/shared';

/**
 * Browser operation types for security classification
 */
export enum BrowserOperationType {
  NAVIGATION = 'navigation',
  INTERACTION = 'interaction',
  EXTRACTION = 'extraction',
  SCREENSHOT = 'screenshot',
  UPLOAD = 'upload',
  SCRIPT_EXECUTION = 'script_execution',
  SESSION_MANAGEMENT = 'session_management',
}

/**
 * Browser security levels
 */
export enum BrowserSecurityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Browser operation configuration interface
 */
interface BrowserOperationConfig {
  operationType: BrowserOperationType;
  securityLevel: BrowserSecurityLevel;
  allowedDomains?: string[];
  maxSessionTime?: number;
  requireMFA?: boolean;
  auditLevel?: 'basic' | 'detailed' | 'comprehensive';
  rateLimits?: {
    perMinute?: number;
    perHour?: number;
    perDay?: number;
  };
}

/**
 * Browser session security config
 */
interface BrowserSessionConfig {
  isolationLevel: 'none' | 'basic' | 'strict';
  maxConcurrentSessions?: number;
  sessionTimeout?: number;
  requireUniqueFingerprint?: boolean;
}

/**
 * XSS protection configuration
 */
interface XSSProtectionConfig {
  enableInputSanitization: boolean;
  enableOutputEncoding: boolean;
  allowedTags?: string[];
  allowedAttributes?: string[];
  strictMode?: boolean;
}

/**
 * Metadata keys for browser security
 */
export const BROWSER_OPERATION_KEY = 'browser_operation';
export const BROWSER_SESSION_CONFIG_KEY = 'browser_session_config';
export const XSS_PROTECTION_KEY = 'xss_protection';
export const DOMAIN_WHITELIST_KEY = 'domain_whitelist';
export const SCRIPT_PROTECTION_KEY = 'script_protection';
export const AUDIT_LOGGING_KEY = 'audit_logging';

/**
 * Decorator to configure browser operation security
 *
 * @param config Browser operation configuration
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * @BrowserOperation({
 *   operationType: BrowserOperationType.NAVIGATION,
 *   securityLevel: BrowserSecurityLevel.HIGH,
 *   allowedDomains: ['example.com', '*.trusted-site.org'],
 *   requireMFA: true,
 *   auditLevel: 'comprehensive'
 * })
 * @Post('/navigate')
 * async navigateToUrl(@Body() dto: NavigationDto) {
 *   return this.browserService.navigate(dto);
 * }
 * ```
 */
export const BrowserOperation = (config: BrowserOperationConfig) =>
  SetMetadata(BROWSER_OPERATION_KEY, config);

/**
 * Decorator for high-security browser navigation operations
 *
 * @param allowedDomains Optional domain whitelist
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * @SecureBrowserNavigation(['example.com', '*.trusted.org'])
 * @Post('/navigate')
 * async secureNavigate(@Body() dto: NavigationDto) {
 *   return this.browserService.navigate(dto);
 * }
 * ```
 */
export const SecureBrowserNavigation = (allowedDomains?: string[]) =>
  BrowserOperation({
    operationType: BrowserOperationType.NAVIGATION,
    securityLevel: BrowserSecurityLevel.HIGH,
    allowedDomains,
    requireMFA: true,
    auditLevel: 'comprehensive',
    rateLimits: {
      perMinute: 10,
      perHour: 100,
    },
  });

/**
 * Decorator for browser interaction operations (clicks, typing, etc.)
 *
 * @param securityLevel Security level for the interaction
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * @BrowserInteraction(BrowserSecurityLevel.MEDIUM)
 * @Post('/click')
 * async clickElement(@Body() dto: ClickDto) {
 *   return this.browserService.click(dto);
 * }
 * ```
 */
export const BrowserInteraction = (
  securityLevel: BrowserSecurityLevel = BrowserSecurityLevel.MEDIUM,
) =>
  BrowserOperation({
    operationType: BrowserOperationType.INTERACTION,
    securityLevel,
    auditLevel: 'detailed',
    rateLimits: {
      perMinute: 30,
      perHour: 500,
    },
  });

/**
 * Decorator for browser data extraction operations
 *
 * @param requireApproval Whether data extraction requires approval
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * @BrowserDataExtraction(true)
 * @Post('/extract')
 * async extractData(@Body() dto: ExtractionDto) {
 *   return this.browserService.extractData(dto);
 * }
 * ```
 */
export const BrowserDataExtraction = (requireApproval: boolean = false) =>
  BrowserOperation({
    operationType: BrowserOperationType.EXTRACTION,
    securityLevel: requireApproval
      ? BrowserSecurityLevel.CRITICAL
      : BrowserSecurityLevel.HIGH,
    requireMFA: requireApproval,
    auditLevel: 'comprehensive',
    rateLimits: {
      perMinute: 5,
      perHour: 50,
    },
  });

/**
 * Decorator for screenshot capture operations
 *
 * @param securityLevel Security level for screenshots
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * @BrowserScreenshot(BrowserSecurityLevel.MEDIUM)
 * @Post('/screenshot')
 * async captureScreenshot(@Body() dto: ScreenshotDto) {
 *   return this.browserService.screenshot(dto);
 * }
 * ```
 */
export const BrowserScreenshot = (
  securityLevel: BrowserSecurityLevel = BrowserSecurityLevel.MEDIUM,
) =>
  BrowserOperation({
    operationType: BrowserOperationType.SCREENSHOT,
    securityLevel,
    auditLevel: 'basic',
    rateLimits: {
      perMinute: 20,
      perHour: 200,
    },
  });

/**
 * Decorator for script execution operations (highest security)
 *
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * @CriticalScriptExecution()
 * @Post('/execute-script')
 * async executeScript(@Body() dto: ScriptDto) {
 *   return this.browserService.executeScript(dto);
 * }
 * ```
 */
export const CriticalScriptExecution = () =>
  BrowserOperation({
    operationType: BrowserOperationType.SCRIPT_EXECUTION,
    securityLevel: BrowserSecurityLevel.CRITICAL,
    requireMFA: true,
    auditLevel: 'comprehensive',
    rateLimits: {
      perMinute: 2,
      perHour: 10,
      perDay: 50,
    },
  });

/**
 * Decorator to configure browser session security
 *
 * @param config Session security configuration
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * @BrowserSessionSecurity({
 *   isolationLevel: 'strict',
 *   maxConcurrentSessions: 5,
 *   sessionTimeout: 1800000, // 30 minutes
 *   requireUniqueFingerprint: true
 * })
 * @Post('/create-session')
 * async createSession(@Body() dto: CreateSessionDto) {
 *   return this.browserSessionService.create(dto);
 * }
 * ```
 */
export const BrowserSessionSecurity = (config: BrowserSessionConfig) =>
  SetMetadata(BROWSER_SESSION_CONFIG_KEY, config);

/**
 * Decorator to enable XSS protection with custom configuration
 *
 * @param config XSS protection configuration
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * @XSSProtection({
 *   enableInputSanitization: true,
 *   enableOutputEncoding: true,
 *   strictMode: true,
 *   allowedTags: ['p', 'br', 'strong']
 * })
 * @Post('/form-fill')
 * async fillForm(@Body() dto: FormFillDto) {
 *   return this.browserService.fillForm(dto);
 * }
 * ```
 */
export const XSSProtection = (config: XSSProtectionConfig) =>
  SetMetadata(XSS_PROTECTION_KEY, config);

/**
 * Decorator to enforce domain whitelist for browser operations
 *
 * @param domains Allowed domains (supports wildcards)
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * @DomainWhitelist(['example.com', '*.trusted.org', 'localhost'])
 * @Post('/navigate')
 * async navigate(@Body() dto: NavigationDto) {
 *   return this.browserService.navigate(dto);
 * }
 * ```
 */
export const DomainWhitelist = (domains: string[]) =>
  SetMetadata(DOMAIN_WHITELIST_KEY, domains);

/**
 * Decorator to enable script injection protection
 *
 * @param strictMode Whether to use strict mode (block vs sanitize)
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * @ScriptProtection(true)
 * @Post('/execute')
 * async executeAction(@Body() dto: ActionDto) {
 *   return this.browserService.execute(dto);
 * }
 * ```
 */
export const ScriptProtection = (strictMode: boolean = true) =>
  SetMetadata(SCRIPT_PROTECTION_KEY, { strictMode });

/**
 * Decorator to configure audit logging for browser operations
 *
 * @param level Audit logging level
 * @param includeScreenshots Whether to include screenshots in audit
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * @AuditLogging('comprehensive', true)
 * @Post('/sensitive-operation')
 * async sensitiveOperation(@Body() dto: SensitiveDto) {
 *   return this.browserService.performSensitiveOperation(dto);
 * }
 * ```
 */
export const AuditLogging = (
  level: 'basic' | 'detailed' | 'comprehensive' = 'basic',
  includeScreenshots: boolean = false,
) => SetMetadata(AUDIT_LOGGING_KEY, { level, includeScreenshots });

/**
 * Decorator for admin-only browser operations
 *
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * @AdminOnlyBrowserOperation()
 * @Delete('/sessions/all')
 * async destroyAllSessions() {
 *   return this.browserSessionService.destroyAll();
 * }
 * ```
 */
export const AdminOnlyBrowserOperation = () => {
  return (
    target: Record<string, unknown>,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    // Apply role restriction
    SetMetadata('roles', [UserRole._ADMIN])(target, propertyKey, descriptor);

    // Apply browser operation config
    BrowserOperation({
      operationType: BrowserOperationType.SESSION_MANAGEMENT,
      securityLevel: BrowserSecurityLevel.CRITICAL,
      requireMFA: true,
      auditLevel: 'comprehensive',
    })(target, propertyKey, descriptor);
  };
};

/**
 * Decorator for operator-level browser operations
 *
 * @returns MethodDecorator
 *
 * @example
 * ```typescript
 * @OperatorBrowserOperation()
 * @Post('/automation/run')
 * async runAutomation(@Body() dto: AutomationDto) {
 *   return this.browserService.runAutomation(dto);
 * }
 * ```
 */
export const OperatorBrowserOperation = () => {
  return (
    target: Record<string, unknown>,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    // Apply role restriction
    SetMetadata('roles', [UserRole._ADMIN, UserRole._OPERATOR])(
      target,
      propertyKey,
      descriptor,
    );

    // Apply browser operation config
    BrowserOperation({
      operationType: BrowserOperationType.INTERACTION,
      securityLevel: BrowserSecurityLevel.HIGH,
      auditLevel: 'detailed',
      rateLimits: {
        perMinute: 20,
        perHour: 300,
      },
    })(target, propertyKey, descriptor);
  };
};

/**
 * Parameter decorator to extract browser session context
 *
 * @param property Optional property to extract from session context
 * @returns ParameterDecorator
 *
 * @example
 * ```typescript
 * @Post('/action')
 * async performAction(
 *   @BrowserSession() session: BrowserSessionContext,
 *   @BrowserSession('sessionId') sessionId: string,
 *   @Body() dto: ActionDto
 * ) {
 *   return this.browserService.performAction(sessionId, dto);
 * }
 * ```
 */
export const BrowserSession = createParamDecorator(
  (property: string | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest() as {
      browserSession?: Record<string, unknown>;
    };
    const browserSession = request.browserSession;

    if (property && browserSession && typeof browserSession === 'object') {
      return (browserSession as Record<string, unknown>)[property];
    }

    return browserSession;
  },
);

/**
 * Parameter decorator to extract browser security context
 *
 * @param property Optional property to extract from security context
 * @returns ParameterDecorator
 *
 * @example
 * ```typescript
 * @Post('/secure-action')
 * async secureAction(
 *   @BrowserSecurityContext() securityContext: BrowserSecurityContext,
 *   @BrowserSecurityContext('riskScore') riskScore: number,
 *   @Body() dto: ActionDto
 * ) {
 *   if (riskScore > 80) {
 *     throw new ForbiddenException('Risk score too high');
 *   }
 *   return this.browserService.performSecureAction(dto);
 * }
 * ```
 */
export const BrowserSecurityContext = createParamDecorator(
  (property: string | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest() as {
      browserSecurityContext?: Record<string, unknown>;
    };
    const securityContext = request.browserSecurityContext;

    if (property && securityContext && typeof securityContext === 'object') {
      return (securityContext as Record<string, unknown>)[property];
    }

    return securityContext;
  },
);

/**
 * Parameter decorator to extract sanitized input data
 *
 * @param property Optional property to extract from sanitized data
 * @returns ParameterDecorator
 *
 * @example
 * ```typescript
 * @Post('/safe-input')
 * async handleSafeInput(
 *   @SanitizedInput() data: SanitizedInputData,
 *   @SanitizedInput('url') safeUrl: string,
 *   @Body() originalDto: InputDto
 * ) {
 *   // Use sanitized data for safe processing
 *   return this.browserService.processInput(safeUrl, data);
 * }
 * ```
 */
export const SanitizedInput = createParamDecorator(
  (property: string | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest() as {
      sanitizedData?: Record<string, unknown>;
    };
    const sanitizedData = request.sanitizedData;

    if (property && sanitizedData && typeof sanitizedData === 'object') {
      return (sanitizedData as Record<string, unknown>)[property];
    }

    return sanitizedData;
  },
);

/**
 * Shorthand decorators for common browser operation patterns
 */

/**
 * Secure browser navigation with comprehensive protection
 */
export const SecureNavigation = () => {
  return (
    target: Record<string, unknown>,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    SecureBrowserNavigation()(target, propertyKey, descriptor);
    XSSProtection({
      enableInputSanitization: true,
      enableOutputEncoding: true,
      strictMode: true,
    })(target, propertyKey, descriptor);
    ScriptProtection(true)(target, propertyKey, descriptor);
    AuditLogging('comprehensive', true)(target, propertyKey, descriptor);
  };
};

/**
 * Safe browser interaction with standard protection
 */
export const SafeInteraction = () => {
  return (
    target: Record<string, unknown>,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    BrowserInteraction(BrowserSecurityLevel.MEDIUM)(
      target,
      propertyKey,
      descriptor,
    );
    XSSProtection({
      enableInputSanitization: true,
      enableOutputEncoding: true,
      strictMode: false,
    })(target, propertyKey, descriptor);
    ScriptProtection(false)(target, propertyKey, descriptor);
    AuditLogging('detailed', false)(target, propertyKey, descriptor);
  };
};

/**
 * Critical browser operation with maximum security
 */
export const CriticalBrowserOperation = () => {
  return (
    target: Record<string, unknown>,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    SetMetadata('roles', [UserRole._ADMIN])(target, propertyKey, descriptor);
    BrowserOperation({
      operationType: BrowserOperationType.SCRIPT_EXECUTION,
      securityLevel: BrowserSecurityLevel.CRITICAL,
      requireMFA: true,
      auditLevel: 'comprehensive',
      rateLimits: {
        perMinute: 1,
        perHour: 5,
        perDay: 20,
      },
    })(target, propertyKey, descriptor);
    XSSProtection({
      enableInputSanitization: true,
      enableOutputEncoding: true,
      strictMode: true,
    })(target, propertyKey, descriptor);
    ScriptProtection(true)(target, propertyKey, descriptor);
    AuditLogging('comprehensive', true)(target, propertyKey, descriptor);
  };
};

/**
 * Type definitions for parameter decorators
 */
export interface BrowserSessionContext {
  sessionId: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  fingerprint: string;
  ipAddress: string;
  userAgent: string;
}

export interface BrowserSecurityContext {
  riskScore: number;
  violations: Record<string, unknown>[];
  sanitized: boolean;
  operationType: BrowserOperationType;
  securityLevel: BrowserSecurityLevel;
  timestamp: Date;
}

export interface SanitizedInputData {
  [key: string]: unknown;
  _sanitizationReport?: {
    sanitized: boolean;
    removedTags: string[];
    blockedScripts: number;
    modifiedUrls: string[];
  };
}
