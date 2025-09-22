/**
 * Enhanced Computer Control Validation Service - PARLANT Integration
 *
 * Comprehensive PARLANT conversational validation for Computer Control APIs
 * with enterprise-grade security, performance optimization, and risk assessment.
 *
 * Features:
 * - Sub-500ms validation response times for real-time operations
 * - Risk-based assessment for mouse/keyboard automation
 * - Conversational approval for system-level operations
 * - Natural language confirmation for desktop automation commands
 * - Intelligent validation for accessibility features
 * - Privacy-aware screen interaction validation
 *
 * Performance Requirements:
 * - <200ms for minimal risk operations (screenshot, cursor position)
 * - <350ms for moderate risk operations (mouse clicks, keyboard input)
 * - <500ms for high risk operations (application control, file system)
 *
 * Security Classifications:
 * - MINIMAL: Read-only operations (screenshot, cursor position)
 * - LOW: Basic interaction (mouse movement)
 * - MODERATE: User input simulation (clicks, typing)
 * - HIGH: System control (application management)
 * - CRITICAL: File system modification, system configuration
 */

import { Injectable, Logger } from '@nestjs/common';
import { ParlantIntegrationService,
  ParlantValidationRequest,
  ParlantConversationContext,
  RiskLevel,
  ConversationalValidationError
} from '../parlant/parlant-integration.service';
import {
  ComputerAction,
  MoveMouseAction,
  ClickMouseAction,
  TypeTextAction,
  TypeKeysAction,
  PressKeysAction,
  TraceMouseAction,
  DragMouseAction,
  ScrollAction,
  PasteTextAction,
} from '@bytebot/shared';

// ===== ENHANCED VALIDATION INTERFACES =====

/**
 * Computer control validation context with performance tracking
 */
export interface ComputerControlValidationContext extends ParlantConversationContext {
  readonly screenResolution: { width: number; height: number };
  readonly activeApplication?: string;
  readonly currentWindowTitle?: string;
  readonly userAccessibilityNeeds?: string[];
  readonly performanceRequirements: {
    maxValidationTimeMs: number;
    requiresRealtime: boolean;
    criticalPath: boolean;
  };
  readonly privacyContext: {
    screenRecordingAllowed: boolean;
    sensitiveDataVisible: boolean;
    userConsentTimestamp?: Date;
  };
}

/**
 * Mouse operation risk assessment
 */
export interface MouseOperationRisk {
  readonly riskLevel: RiskLevel;
  readonly coordinateRisk: 'SAFE' | 'UI_ELEMENT' | 'SYSTEM_AREA' | 'CRITICAL_ZONE';
  readonly clickTargetType: 'BUTTON' | 'LINK' | 'INPUT' | 'MENU' | 'SYSTEM' | 'UNKNOWN';
  readonly potentialImpact: string[];
  readonly requiresConfirmation: boolean;
  readonly safeguards: string[];
}

/**
 * Keyboard input risk assessment
 */
export interface KeyboardInputRisk {
  readonly riskLevel: RiskLevel;
  readonly contentType: 'TEXT' | 'PASSWORD' | 'COMMAND' | 'SYSTEM_KEY' | 'UNKNOWN';
  readonly sensitiveData: boolean;
  readonly systemImpact: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  readonly validationRequired: boolean;
  readonly maskContent: boolean;
}

/**
 * Performance optimization cache for validation
 */
interface ValidationCache {
  readonly key: string;
  readonly result: any;
  readonly timestamp: Date;
  readonly expiryMs: number;
  readonly hitCount: number;
}

// ===== ENHANCED COMPUTER CONTROL VALIDATION SERVICE =====

@Injectable()
export class EnhancedComputerControlValidationService {
  private readonly logger = new Logger(EnhancedComputerControlValidationService.name);
  private readonly validationCache = new Map<string, ValidationCache>();
  private readonly performanceMetrics = {
    totalValidations: 0,
    averageValidationTime: 0,
    cacheHitRate: 0,
    sub200msOperations: 0,
    sub350msOperations: 0,
    sub500msOperations: 0,
  };

  constructor(
    private readonly parlantIntegrationService: ParlantIntegrationService
  ) {
    this.logger.log('Enhanced Computer Control Validation Service initialized');

    // Start cache cleanup interval
    setInterval(() => this.cleanupCache(), 60000); // Every minute

    // Performance metrics logging
    setInterval(() => this.logPerformanceMetrics(), 300000); // Every 5 minutes
  }

  // ===== MOUSE CONTROL VALIDATION =====

  /**
   * Validate mouse movement operations with coordinate risk assessment
   */
  async validateMouseMovement(
    action: MoveMouseAction,
    context: ComputerControlValidationContext
  ): Promise<boolean> {
    const operationId = `mouse_move_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      // Performance optimization: check cache first
      const cacheKey = this.generateCacheKey('mouse_move', action, context);
      const cached = this.getCachedValidation(cacheKey);
      if (cached) {
        this.updatePerformanceMetrics(Date.now() - startTime, true);
        return cached;
      }

      // Risk assessment for mouse coordinates
      const riskAssessment = await this.assessMouseOperationRisk(action, context);

      // Fast-path for safe movements (cursor tracking, etc.)
      if (riskAssessment.riskLevel === RiskLevel._MINIMAL) {
        this.setCachedValidation(cacheKey, true, 30000); // 30s cache
        this.updatePerformanceMetrics(Date.now() - startTime, false);
        return true;
      }

      // Conversational validation for higher risk movements
      const validationRequest: ParlantValidationRequest = {
        functionName: `ComputerControl.moveMouse`,
        functionParams: {
          coordinates: action.coordinates,
          targetType: riskAssessment.clickTargetType,
          riskLevel: riskAssessment.riskLevel,
        },
        actionDescription: `Move mouse cursor to coordinates (${action.coordinates?.x}, ${action.coordinates?.y})`,
        context: context,
        riskLevel: riskAssessment.riskLevel,
        operationId,
        performanceRequirements: {
          maxValidationTimeMs: Math.min(context.performanceRequirements.maxValidationTimeMs, 200),
          requiresRealtime: context.performanceRequirements.requiresRealtime,
        },
      };

      const validationResponse = await this.parlantIntegrationService.validateFunctionExecution(validationRequest);

      // Cache successful validations
      if (validationResponse.approved) {
        this.setCachedValidation(cacheKey, true, 15000); // 15s cache for approved movements
      }

      this.updatePerformanceMetrics(Date.now() - startTime, false);
      return validationResponse.approved;

    } catch (error) {
      this.logger.error(`[${operationId}] Mouse movement validation failed`, {
        operationId,
        coordinates: action.coordinates,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });

      // Fail-safe: allow basic cursor movement for accessibility
      if (this.isAccessibilityMovement(action, context)) {
        return true;
      }

      throw error;
    }
  }

  /**
   * Validate mouse click operations with target analysis
   */
  async validateMouseClick(
    action: ClickMouseAction,
    context: ComputerControlValidationContext
  ): Promise<boolean> {
    const operationId = `mouse_click_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      // Enhanced risk assessment for clicks
      const riskAssessment = await this.assessMouseOperationRisk(action, context);

      // All clicks require some level of validation due to potential UI changes
      const validationRequest: ParlantValidationRequest = {
        functionName: `ComputerControl.clickMouse`,
        functionParams: {
          coordinates: action.coordinates,
          button: action.button ?? 'left',
          targetType: riskAssessment.clickTargetType,
          riskAssessment,
        },
        actionDescription: this.generateClickDescription(action, riskAssessment),
        context: context,
        riskLevel: riskAssessment.riskLevel,
        operationId,
        performanceRequirements: {
          maxValidationTimeMs: Math.min(context.performanceRequirements.maxValidationTimeMs, 350),
          requiresRealtime: context.performanceRequirements.requiresRealtime,
        },
      };

      const validationResponse = await this.parlantIntegrationService.validateFunctionExecution(validationRequest);

      if (validationResponse.approved) {
        this.logger.log(`[${operationId}] Mouse click approved: ${riskAssessment.clickTargetType}`, {
          operationId,
          coordinates: action.coordinates,
          riskLevel: riskAssessment.riskLevel,
          validationTime: Date.now() - startTime,
        });
      }

      this.updatePerformanceMetrics(Date.now() - startTime, false);
      return validationResponse.approved;

    } catch (error) {
      this.logger.error(`[${operationId}] Mouse click validation failed`, {
        operationId,
        coordinates: action.coordinates,
        button: action.button,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Validate complex mouse operations (drag, trace, scroll)
   */
  async validateComplexMouseOperation(
    action: DragMouseAction | TraceMouseAction | ScrollAction,
    context: ComputerControlValidationContext
  ): Promise<boolean> {
    const operationId = `mouse_complex_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      // Complex mouse operations always require validation due to multiple interactions
      const riskLevel = this.assessComplexMouseRisk(action, context);

      const validationRequest: ParlantValidationRequest = {
        functionName: `ComputerControl.${action.action}`,
        functionParams: this.sanitizeComplexMouseParams(action),
        actionDescription: this.generateComplexMouseDescription(action),
        context: context,
        riskLevel,
        operationId,
        performanceRequirements: {
          maxValidationTimeMs: Math.min(context.performanceRequirements.maxValidationTimeMs, 500),
          requiresRealtime: false, // Complex operations can tolerate slightly higher latency
        },
      };

      const validationResponse = await this.parlantIntegrationService.validateFunctionExecution(validationRequest);

      this.updatePerformanceMetrics(Date.now() - startTime, false);
      return validationResponse.approved;

    } catch (error) {
      this.logger.error(`[${operationId}] Complex mouse operation validation failed`, {
        operationId,
        action: action.action,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  // ===== KEYBOARD CONTROL VALIDATION =====

  /**
   * Validate keyboard input operations with content analysis
   */
  async validateKeyboardInput(
    action: TypeTextAction | TypeKeysAction | PressKeysAction | PasteTextAction,
    context: ComputerControlValidationContext
  ): Promise<boolean> {
    const operationId = `keyboard_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      // Performance optimization: check cache for common input patterns
      const cacheKey = this.generateKeyboardCacheKey(action, context);
      const cached = this.getCachedValidation(cacheKey);
      if (cached) {
        this.updatePerformanceMetrics(Date.now() - startTime, true);
        return cached;
      }

      // Risk assessment for keyboard input
      const inputRisk = await this.assessKeyboardInputRisk(action, context);

      // Fast-path for safe text input
      if (inputRisk.riskLevel === RiskLevel._MINIMAL && !inputRisk.sensitiveData) {
        this.setCachedValidation(cacheKey, true, 10000); // 10s cache for safe input
        this.updatePerformanceMetrics(Date.now() - startTime, false);
        return true;
      }

      // Conversational validation for higher risk input
      const validationRequest: ParlantValidationRequest = {
        functionName: `ComputerControl.${action.action}`,
        functionParams: this.sanitizeKeyboardParams(action, inputRisk),
        actionDescription: this.generateKeyboardDescription(action, inputRisk),
        context: context,
        riskLevel: inputRisk.riskLevel,
        operationId,
        performanceRequirements: {
          maxValidationTimeMs: Math.min(context.performanceRequirements.maxValidationTimeMs, 350),
          requiresRealtime: context.performanceRequirements.requiresRealtime,
        },
      };

      const validationResponse = await this.parlantIntegrationService.validateFunctionExecution(validationRequest);

      // Cache approved safe input patterns
      if (validationResponse.approved && inputRisk.riskLevel <= RiskLevel._LOW) {
        this.setCachedValidation(cacheKey, true, 5000); // 5s cache for approved input
      }

      this.updatePerformanceMetrics(Date.now() - startTime, false);
      return validationResponse.approved;

    } catch (error) {
      this.logger.error(`[${operationId}] Keyboard input validation failed`, {
        operationId,
        action: action.action,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  // ===== RISK ASSESSMENT METHODS =====

  /**
   * Assess risk level for mouse operations based on coordinates and context
   */
  private async assessMouseOperationRisk(
    action: MoveMouseAction | ClickMouseAction,
    context: ComputerControlValidationContext
  ): Promise<MouseOperationRisk> {
    const coordinates = action.coordinates;
    if (!coordinates) {
      return {
        riskLevel: RiskLevel._MODERATE,
        coordinateRisk: 'UNKNOWN',
        clickTargetType: 'UNKNOWN',
        potentialImpact: ['uncertain_target'],
        requiresConfirmation: true,
        safeguards: ['coordinate_validation'],
      };
    }

    // Analyze coordinate risk based on screen zones
    const coordinateRisk = this.analyzeCoordinateRisk(coordinates, context);
    const clickTargetType = await this.identifyClickTarget(coordinates, context);

    let riskLevel: RiskLevel;
    const potentialImpact: string[] = [];
    const safeguards: string[] = [];

    // Determine risk level based on target analysis
    switch (clickTargetType) {
      case 'BUTTON':
      case 'LINK':
        riskLevel = RiskLevel._LOW;
        potentialImpact.push('ui_interaction');
        safeguards.push('target_verification');
        break;

      case 'INPUT':
        riskLevel = RiskLevel._MODERATE;
        potentialImpact.push('data_entry', 'form_submission');
        safeguards.push('input_validation', 'content_review');
        break;

      case 'MENU':
        riskLevel = RiskLevel._MODERATE;
        potentialImpact.push('navigation_change', 'context_switch');
        safeguards.push('menu_item_verification');
        break;

      case 'SYSTEM':
        riskLevel = RiskLevel._HIGH;
        potentialImpact.push('system_control', 'application_state_change');
        safeguards.push('system_verification', 'state_backup');
        break;

      default:
        riskLevel = RiskLevel._MODERATE;
        potentialImpact.push('unknown_interaction');
        safeguards.push('target_identification');
    }

    // Escalate risk for critical screen zones
    if (coordinateRisk === 'CRITICAL_ZONE') {
      riskLevel = this.escalateRiskLevel(riskLevel);
      potentialImpact.push('critical_area_access');
      safeguards.push('critical_zone_protection');
    }

    return {
      riskLevel,
      coordinateRisk,
      clickTargetType,
      potentialImpact,
      requiresConfirmation: riskLevel >= RiskLevel._MODERATE,
      safeguards,
    };
  }

  /**
   * Assess risk level for keyboard input operations
   */
  private async assessKeyboardInputRisk(
    action: TypeTextAction | TypeKeysAction | PressKeysAction | PasteTextAction,
    context: ComputerControlValidationContext
  ): Promise<KeyboardInputRisk> {
    let contentType: KeyboardInputRisk['contentType'] = 'TEXT';
    let sensitiveData = false;
    let systemImpact: KeyboardInputRisk['systemImpact'] = 'NONE';
    let riskLevel: RiskLevel = RiskLevel._LOW;

    // Analyze input content
    if ('text' in action && action.text) {
      const content = action.text;

      // Check for sensitive data patterns
      if (this.containsSensitiveData(content)) {
        sensitiveData = true;
        contentType = 'PASSWORD';
        riskLevel = RiskLevel._HIGH;
        systemImpact = 'MODERATE';
      }

      // Check for command patterns
      if (this.looksLikeCommand(content)) {
        contentType = 'COMMAND';
        riskLevel = RiskLevel._HIGH;
        systemImpact = 'HIGH';
      }
    }

    // Analyze key combinations
    if ('keys' in action && action.keys) {
      const keys = Array.isArray(action.keys) ? action.keys : [action.keys];

      if (this.containsSystemKeys(keys)) {
        contentType = 'SYSTEM_KEY';
        riskLevel = RiskLevel._HIGH;
        systemImpact = 'HIGH';
      }
    }

    return {
      riskLevel,
      contentType,
      sensitiveData,
      systemImpact,
      validationRequired: riskLevel >= RiskLevel._MODERATE,
      maskContent: sensitiveData,
    };
  }

  // ===== HELPER METHODS =====

  /**
   * Generate cache key for mouse operations
   */
  private generateCacheKey(operation: string, action: any, context: ComputerControlValidationContext): string {
    const baseKey = `${operation}_${context.userId}_${context.activeApplication}`;
    if (action.coordinates) {
      return `${baseKey}_${action.coordinates.x}_${action.coordinates.y}`;
    }
    return baseKey;
  }

  /**
   * Generate cache key for keyboard operations
   */
  private generateKeyboardCacheKey(action: any, context: ComputerControlValidationContext): string {
    const baseKey = `keyboard_${context.userId}_${context.activeApplication}`;

    if ('text' in action && action.text) {
      // Hash text content for privacy while maintaining cache effectiveness
      const contentHash = this.hashContent(action.text);
      return `${baseKey}_text_${contentHash}`;
    }

    if ('keys' in action && action.keys) {
      const keysStr = Array.isArray(action.keys) ? action.keys.join('_') : action.keys;
      return `${baseKey}_keys_${keysStr}`;
    }

    return `${baseKey}_${action.action}`;
  }

  /**
   * Analyze coordinate risk based on screen zones
   */
  private analyzeCoordinateRisk(
    coordinates: { x: number; y: number },
    context: ComputerControlValidationContext
  ): MouseOperationRisk['coordinateRisk'] {
    const { width, height } = context.screenResolution;

    // Define critical zones (system areas, window controls, etc.)
    const criticalZones = [
      { x: 0, y: 0, width: 50, height: 50 }, // Top-left corner
      { x: width - 50, y: 0, width: 50, height: 50 }, // Top-right corner
      { x: 0, y: height - 50, width: width, height: 50 }, // Bottom taskbar area
    ];

    // Check if coordinates are in critical zones
    for (const zone of criticalZones) {
      if (coordinates.x >= zone.x && coordinates.x <= zone.x + zone.width &&
          coordinates.y >= zone.y && coordinates.y <= zone.y + zone.height) {
        return 'CRITICAL_ZONE';
      }
    }

    // Check for system UI areas (top 100px, bottom 100px)
    if (coordinates.y < 100 || coordinates.y > height - 100) {
      return 'SYSTEM_AREA';
    }

    return 'SAFE';
  }

  /**
   * Identify click target type (placeholder - would use actual screen analysis)
   */
  private async identifyClickTarget(
    coordinates: { x: number; y: number },
    context: ComputerControlValidationContext
  ): Promise<MouseOperationRisk['clickTargetType']> {
    // Placeholder implementation - in real system would use:
    // - OCR/computer vision to identify UI elements
    // - Accessibility API to get element information
    // - Application context to understand target types

    return 'UNKNOWN'; // Conservative default
  }

  /**
   * Check if content contains sensitive data
   */
  private containsSensitiveData(content: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /key/i,
      /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/, // Credit card pattern
      /\d{3}-\d{2}-\d{4}/, // SSN pattern
      /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/, // Email pattern
    ];

    return sensitivePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Check if content looks like system commands
   */
  private looksLikeCommand(content: string): boolean {
    const commandPatterns = [
      /^sudo\s/,
      /^rm\s+-rf/,
      /^chmod\s/,
      /^chown\s/,
      /^\w+\s+--/,
      /^\w+\.\w+\s*\(/,
    ];

    return commandPatterns.some(pattern => pattern.test(content.trim()));
  }

  /**
   * Check if key combination contains system keys
   */
  private containsSystemKeys(keys: string[]): boolean {
    const systemKeys = [
      'ctrl+alt+del',
      'cmd+option+esc',
      'alt+f4',
      'ctrl+shift+esc',
      'win+r',
      'cmd+space',
    ];

    const keyCombo = keys.join('+').toLowerCase();
    return systemKeys.some(sysKey => keyCombo.includes(sysKey));
  }

  /**
   * Hash content for privacy-preserving cache keys
   */
  private hashContent(content: string): string {
    // Simple hash for demonstration - use crypto.createHash in production
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if mouse movement is for accessibility
   */
  private isAccessibilityMovement(action: MoveMouseAction, context: ComputerControlValidationContext): boolean {
    return context.userAccessibilityNeeds && context.userAccessibilityNeeds.length > 0;
  }

  /**
   * Escalate risk level to next higher level
   */
  private escalateRiskLevel(currentLevel: RiskLevel): RiskLevel {
    switch (currentLevel) {
      case RiskLevel._MINIMAL: return RiskLevel._LOW;
      case RiskLevel._LOW: return RiskLevel._MODERATE;
      case RiskLevel._MODERATE: return RiskLevel._HIGH;
      case RiskLevel._HIGH: return RiskLevel._CRITICAL;
      case RiskLevel._CRITICAL: return RiskLevel._CRITICAL;
      default: return RiskLevel._MODERATE;
    }
  }

  // ===== CACHE MANAGEMENT =====

  private getCachedValidation(key: string): boolean | null {
    const cached = this.validationCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp.getTime() > cached.expiryMs) {
      this.validationCache.delete(key);
      return null;
    }

    // Update hit count and return result
    cached.hitCount++;
    return cached.result;
  }

  private setCachedValidation(key: string, result: boolean, expiryMs: number): void {
    this.validationCache.set(key, {
      key,
      result,
      timestamp: new Date(),
      expiryMs,
      hitCount: 0,
    });
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.validationCache.entries()) {
      if (now - cached.timestamp.getTime() > cached.expiryMs) {
        this.validationCache.delete(key);
      }
    }
  }

  // ===== PERFORMANCE TRACKING =====

  private updatePerformanceMetrics(durationMs: number, fromCache: boolean): void {
    this.performanceMetrics.totalValidations++;

    if (fromCache) {
      this.performanceMetrics.cacheHitRate =
        (this.performanceMetrics.cacheHitRate * (this.performanceMetrics.totalValidations - 1) + 1) /
        this.performanceMetrics.totalValidations;
    } else {
      this.performanceMetrics.averageValidationTime =
        (this.performanceMetrics.averageValidationTime * (this.performanceMetrics.totalValidations - 1) + durationMs) /
        this.performanceMetrics.totalValidations;

      if (durationMs < 200) this.performanceMetrics.sub200msOperations++;
      if (durationMs < 350) this.performanceMetrics.sub350msOperations++;
      if (durationMs < 500) this.performanceMetrics.sub500msOperations++;
    }
  }

  private logPerformanceMetrics(): void {
    const { totalValidations } = this.performanceMetrics;

    this.logger.log('Enhanced Computer Control Validation Performance Metrics', {
      totalValidations,
      averageValidationTime: `${this.performanceMetrics.averageValidationTime.toFixed(2)}ms`,
      cacheHitRate: `${(this.performanceMetrics.cacheHitRate * 100).toFixed(1)}%`,
      sub200msRate: `${((this.performanceMetrics.sub200msOperations / totalValidations) * 100).toFixed(1)}%`,
      sub350msRate: `${((this.performanceMetrics.sub350msOperations / totalValidations) * 100).toFixed(1)}%`,
      sub500msRate: `${((this.performanceMetrics.sub500msOperations / totalValidations) * 100).toFixed(1)}%`,
      cacheSize: this.validationCache.size,
    });
  }

  // ===== DESCRIPTION GENERATORS =====

  private generateClickDescription(action: ClickMouseAction, risk: MouseOperationRisk): string {
    const coords = action.coordinates;
    const button = action.button ?? 'left';
    const target = risk.clickTargetType.toLowerCase();

    return `${button} click on ${target} at coordinates (${coords?.x}, ${coords?.y}) - Risk: ${risk.riskLevel}`;
  }

  private generateComplexMouseDescription(action: DragMouseAction | TraceMouseAction | ScrollAction): string {
    switch (action.action) {
      case 'drag_mouse':
        return `Drag mouse operation with complex path`;
      case 'trace_mouse':
        return `Trace mouse operation following specified path`;
      case 'scroll':
        return `Scroll operation on current view`;
      default:
        return `Complex mouse operation: ${action.action}`;
    }
  }

  private generateKeyboardDescription(action: TypeTextAction | TypeKeysAction | PressKeysAction | PasteTextAction, risk: KeyboardInputRisk): string {
    const actionType = action.action;
    const contentType = risk.contentType.toLowerCase();
    const masked = risk.maskContent ? '[CONTENT MASKED]' : '';

    return `${actionType} operation with ${contentType} content ${masked} - Risk: ${risk.riskLevel}`;
  }

  private assessComplexMouseRisk(action: DragMouseAction | TraceMouseAction | ScrollAction, context: ComputerControlValidationContext): RiskLevel {
    // Complex mouse operations typically have moderate to high risk
    switch (action.action) {
      case 'scroll':
        return RiskLevel._LOW; // Scrolling is relatively safe
      case 'trace_mouse':
        return RiskLevel._MODERATE; // Path tracing can affect multiple UI elements
      case 'drag_mouse':
        return RiskLevel._HIGH; // Dragging can move/modify content
      default:
        return RiskLevel._MODERATE;
    }
  }

  private sanitizeComplexMouseParams(action: DragMouseAction | TraceMouseAction | ScrollAction): Record<string, unknown> {
    // Remove potentially sensitive path data while preserving validation context
    const sanitized: Record<string, unknown> = {
      action: action.action,
    };

    if ('startCoordinates' in action && action.startCoordinates) {
      sanitized.hasStartCoordinates = true;
    }

    if ('endCoordinates' in action && action.endCoordinates) {
      sanitized.hasEndCoordinates = true;
    }

    if ('path' in action && action.path) {
      sanitized.pathLength = Array.isArray(action.path) ? action.path.length : 1;
    }

    return sanitized;
  }

  private sanitizeKeyboardParams(action: TypeTextAction | TypeKeysAction | PressKeysAction | PasteTextAction, risk: KeyboardInputRisk): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {
      action: action.action,
      contentType: risk.contentType,
      riskLevel: risk.riskLevel,
    };

    if ('text' in action && action.text) {
      if (risk.maskContent) {
        sanitized.textLength = action.text.length;
        sanitized.content = '[SENSITIVE CONTENT MASKED]';
      } else {
        sanitized.content = action.text.substring(0, 100); // Truncate for validation
      }
    }

    if ('keys' in action && action.keys) {
      sanitized.keys = Array.isArray(action.keys) ? action.keys : [action.keys];
    }

    return sanitized;
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }
}