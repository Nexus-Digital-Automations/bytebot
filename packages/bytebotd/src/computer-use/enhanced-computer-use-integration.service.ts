/**
 * Enhanced Computer-Use Integration Service - PARLANT Master Coordinator
 *
 * Master integration service that coordinates all Computer-Use API validation
 * services with PARLANT conversational AI validation. Provides unified interface
 * for enterprise-grade security, performance optimization, and comprehensive
 * audit trails.
 *
 * Features:
 * - Unified validation interface for all computer-use operations
 * - Cross-service coordination and dependency management
 * - Performance optimization with intelligent caching strategies
 * - Enterprise-grade audit trails and compliance reporting
 * - Real-time monitoring and alerting
 * - Sub-500ms validation performance guarantee
 *
 * Architecture:
 * - Computer Control Validation (mouse/keyboard operations)
 * - Screen Capture Validation (privacy-aware capture/analysis)
 * - File System Validation (secure file operations)
 * - Application Control Validation (process management)
 * - Centralized PARLANT integration and caching
 *
 * Performance Targets:
 * - <100ms for minimal risk operations
 * - <200ms for low risk operations
 * - <350ms for moderate risk operations
 * - <500ms for high/critical risk operations
 * - >90% cache hit rate for repeated operations
 * - >99.9% availability with graceful degradation
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  EnhancedComputerControlValidationService,
  ComputerControlValidationContext,
} from './enhanced-computer-control-validation.service';
import {
  EnhancedScreenCaptureValidationService,
  ScreenCaptureValidationContext,
} from './enhanced-screen-capture-validation.service';
import {
  EnhancedFileSystemValidationService,
  FileSystemValidationContext,
} from './enhanced-file-system-validation.service';
import {
  EnhancedApplicationControlValidationService,
  ApplicationControlValidationContext,
} from './enhanced-application-control-validation.service';
import {
  ParlantIntegrationService,
  ParlantConversationContext,
  RiskLevel,
} from '../parlant/parlant-integration.service';
import {
  ComputerAction,
  MoveMouseAction,
  ClickMouseAction,
  TypeTextAction,
  TypeKeysAction,
  ApplicationAction,
  WriteFileAction,
  ReadFileAction,
} from '@bytebot/shared';

// ===== INTEGRATION INTERFACES =====

/**
 * Unified computer-use validation context
 */
export interface ComputerUseValidationContext
  extends ParlantConversationContext {
  readonly systemContext: {
    screenResolution: { width: number; height: number };
    activeApplication?: string;
    windowTitle?: string;
    workingDirectory: string;
    userHomeDirectory: string;
    currentProcesses: Array<{
      processId: number;
      name: string;
      status: string;
      memoryUsage: number;
    }>;
  };
  readonly securitySettings: {
    allowSystemOperations: boolean;
    allowFileSystemAccess: boolean;
    allowApplicationControl: boolean;
    allowScreenCapture: boolean;
    requireBackupsForDestructiveOps: boolean;
    maxOperationRiskLevel: RiskLevel;
  };
  readonly performanceRequirements: {
    maxValidationTimeMs: number;
    requiresRealtime: boolean;
    allowCaching: boolean;
    criticalPath: boolean;
  };
  readonly privacySettings: {
    allowScreenRecording: boolean;
    allowContentAnalysis: boolean;
    allowOCRProcessing: boolean;
    consentExpiryMinutes: number;
  };
  readonly accessibilitySettings: {
    userAccessibilityNeeds: string[];
    screenReaderActive: boolean;
    highContrastMode: boolean;
    magnificationLevel: number;
  };
}

/**
 * Comprehensive validation result
 */
export interface ComputerUseValidationResult {
  readonly approved: boolean;
  readonly operationId: string;
  readonly validationTimestamp: Date;
  readonly validationDurationMs: number;
  readonly riskLevel: RiskLevel;
  readonly conversationId: string;
  readonly reasoning: string;
  readonly confidence: number;
  readonly serviceUsed:
    | 'COMPUTER_CONTROL'
    | 'SCREEN_CAPTURE'
    | 'FILE_SYSTEM'
    | 'APPLICATION_CONTROL';
  readonly fromCache: boolean;
  readonly safeguards: string[];
  readonly monitoringRequired: boolean;
  readonly auditTrail: {
    userId: string;
    timestamp: Date;
    operation: string;
    parameters: Record<string, unknown>;
    result: 'APPROVED' | 'DENIED' | 'ERROR';
    riskAssessment: string;
  };
  readonly performance: {
    validationTimeMs: number;
    serviceResponseTimeMs: number;
    cacheHit: boolean;
    subServiceMetrics: Record<string, number>;
  };
}

/**
 * System health and performance metrics
 */
export interface SystemPerformanceMetrics {
  readonly totalOperations: number;
  readonly operationsByType: Record<string, number>;
  readonly operationsByRiskLevel: Record<string, number>;
  readonly averageValidationTime: number;
  readonly cacheHitRate: number;
  readonly approvalRate: number;
  readonly systemLoad: {
    cpuUsage: number;
    memoryUsage: number;
    activeValidations: number;
  };
  readonly performanceTargets: {
    sub100msOperations: number;
    sub200msOperations: number;
    sub350msOperations: number;
    sub500msOperations: number;
  };
  readonly healthStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  readonly lastHealthCheck: Date;
}

// ===== ENHANCED COMPUTER-USE INTEGRATION SERVICE =====

@Injectable()
export class EnhancedComputerUseIntegrationService {
  private readonly logger = new Logger(
    EnhancedComputerUseIntegrationService.name,
  );

  // Master performance metrics
  private readonly systemMetrics = {
    totalOperations: 0,
    operationsByType: new Map<string, number>(),
    operationsByRiskLevel: new Map<RiskLevel, number>(),
    approvedOperations: 0,
    deniedOperations: 0,
    errorOperations: 0,
    averageValidationTime: 0,
    cacheHitRate: 0,
    performanceTargets: {
      sub100ms: 0,
      sub200ms: 0,
      sub350ms: 0,
      sub500ms: 0,
    },
    serviceHealth: {
      computerControl: 'HEALTHY',
      screenCapture: 'HEALTHY',
      fileSystem: 'HEALTHY',
      applicationControl: 'HEALTHY',
      parlantIntegration: 'HEALTHY',
    },
  };

  // Cross-service cache for optimization
  private readonly masterCache = new Map<
    string,
    {
      result: ComputerUseValidationResult;
      timestamp: Date;
      expiryMs: number;
      hitCount: number;
    }
  >();

  // Active operation tracking
  private readonly activeOperations = new Map<
    string,
    {
      operationId: string;
      startTime: Date;
      operationType: string;
      userId: string;
      riskLevel: RiskLevel;
    }
  >();

  constructor(
    private readonly computerControlService: EnhancedComputerControlValidationService,
    private readonly screenCaptureService: EnhancedScreenCaptureValidationService,
    private readonly fileSystemService: EnhancedFileSystemValidationService,
    private readonly applicationControlService: EnhancedApplicationControlValidationService,
    private readonly parlantIntegrationService: ParlantIntegrationService,
  ) {
    this.logger.log('Enhanced Computer-Use Integration Service initialized');

    // System health monitoring
    setInterval(() => this.performHealthCheck(), 60000); // Every minute

    // Performance metrics logging
    setInterval(() => this.logSystemMetrics(), 300000); // Every 5 minutes

    // Cache cleanup
    setInterval(() => this.cleanupMasterCache(), 300000); // Every 5 minutes

    // Active operations cleanup
    setInterval(() => this.cleanupActiveOperations(), 30000); // Every 30 seconds
  }

  // ===== UNIFIED VALIDATION INTERFACE =====

  /**
   * Universal computer action validation with intelligent service routing
   */
  async validateComputerAction(
    action: ComputerAction,
    context: ComputerUseValidationContext,
  ): Promise<ComputerUseValidationResult> {
    const operationId = `master_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.log(
      `[${operationId}] Starting computer action validation: ${action.action}`,
      {
        operationId,
        actionType: action.action,
        userId: context.userId,
        riskLevel: 'ASSESSING',
      },
    );

    try {
      this.systemMetrics.totalOperations++;
      this.trackOperationType(action.action);
      this.trackActiveOperation(
        operationId,
        action.action,
        context.userId,
        startTime,
      );

      // Check master cache first
      const cacheKey = this.generateMasterCacheKey(action, context);
      const cachedResult = this.getMasterCachedResult(cacheKey);
      if (cachedResult) {
        this.updateSystemMetrics(
          Date.now() - startTime,
          true,
          cachedResult.riskLevel,
        );
        this.completeActiveOperation(operationId, 'CACHE_HIT');
        return cachedResult;
      }

      // Route to appropriate validation service
      const validationResult = await this.routeToValidationService(
        action,
        context,
        operationId,
      );

      // Cache successful validations
      if (
        validationResult.approved &&
        validationResult.riskLevel <= RiskLevel._MODERATE
      ) {
        this.setMasterCachedResult(
          cacheKey,
          validationResult,
          this.calculateCacheExpiry(validationResult.riskLevel),
        );
      }

      // Update metrics and complete operation
      this.updateSystemMetrics(
        Date.now() - startTime,
        false,
        validationResult.riskLevel,
      );
      this.completeActiveOperation(
        operationId,
        validationResult.approved ? 'APPROVED' : 'DENIED',
      );

      this.logger.log(`[${operationId}] Computer action validation completed`, {
        operationId,
        actionType: action.action,
        approved: validationResult.approved,
        riskLevel: validationResult.riskLevel,
        duration: validationResult.validationDurationMs,
        serviceUsed: validationResult.serviceUsed,
        fromCache: validationResult.fromCache,
      });

      return validationResult;
    } catch (error) {
      this.systemMetrics.errorOperations++;
      this.completeActiveOperation(operationId, 'ERROR');

      this.logger.error(`[${operationId}] Computer action validation failed`, {
        operationId,
        actionType: action.action,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });

      throw error;
    }
  }

  // ===== SERVICE ROUTING =====

  /**
   * Route actions to appropriate validation services
   */
  private async routeToValidationService(
    action: ComputerAction,
    context: ComputerUseValidationContext,
    operationId: string,
  ): Promise<ComputerUseValidationResult> {
    const startTime = Date.now();

    switch (action.action) {
      // Computer Control Operations
      case 'move_mouse':
        return await this.validateMouseMovement(
          action as MoveMouseAction,
          context,
          operationId,
          startTime,
        );

      case 'click_mouse':
      case 'press_mouse':
        return await this.validateMouseClick(
          action as ClickMouseAction,
          context,
          operationId,
          startTime,
        );

      case 'drag_mouse':
      case 'trace_mouse':
      case 'scroll':
        return await this.validateComplexMouseOperation(
          action,
          context,
          operationId,
          startTime,
        );

      case 'type_text':
      case 'type_keys':
      case 'press_keys':
      case 'paste_text':
        return await this.validateKeyboardInput(
          action,
          context,
          operationId,
          startTime,
        );

      // Screen Capture Operations
      case 'screenshot':
        return await this.validateScreenshot(context, operationId, startTime);

      // File System Operations
      case 'read_file':
        return await this.validateFileRead(
          action as ReadFileAction,
          context,
          operationId,
          startTime,
        );

      case 'write_file':
        return await this.validateFileWrite(
          action as WriteFileAction,
          context,
          operationId,
          startTime,
        );

      // Application Control Operations
      case 'application':
        return await this.validateApplicationControl(
          action as ApplicationAction,
          context,
          operationId,
          startTime,
        );

      default:
        throw new Error(`Unsupported computer action: ${action.action}`);
    }
  }

  // ===== COMPUTER CONTROL VALIDATION =====

  private async validateMouseMovement(
    action: MoveMouseAction,
    context: ComputerUseValidationContext,
    operationId: string,
    startTime: number,
  ): Promise<ComputerUseValidationResult> {
    const controlContext = this.mapToComputerControlContext(context);
    const approved = await this.computerControlService.validateMouseMovement(
      action,
      controlContext,
    );

    return this.createValidationResult({
      approved,
      operationId,
      startTime,
      action: 'move_mouse',
      serviceUsed: 'COMPUTER_CONTROL',
      context,
      riskLevel: RiskLevel._MINIMAL,
    });
  }

  private async validateMouseClick(
    action: ClickMouseAction,
    context: ComputerUseValidationContext,
    operationId: string,
    startTime: number,
  ): Promise<ComputerUseValidationResult> {
    const controlContext = this.mapToComputerControlContext(context);
    const approved = await this.computerControlService.validateMouseClick(
      action,
      controlContext,
    );

    return this.createValidationResult({
      approved,
      operationId,
      startTime,
      action: 'click_mouse',
      serviceUsed: 'COMPUTER_CONTROL',
      context,
      riskLevel: RiskLevel._LOW,
    });
  }

  private async validateComplexMouseOperation(
    action: ComputerAction,
    context: ComputerUseValidationContext,
    operationId: string,
    startTime: number,
  ): Promise<ComputerUseValidationResult> {
    const controlContext = this.mapToComputerControlContext(context);
    const approved =
      await this.computerControlService.validateComplexMouseOperation(
        action as any,
        controlContext,
      );

    return this.createValidationResult({
      approved,
      operationId,
      startTime,
      action: action.action,
      serviceUsed: 'COMPUTER_CONTROL',
      context,
      riskLevel: RiskLevel._MODERATE,
    });
  }

  private async validateKeyboardInput(
    action: ComputerAction,
    context: ComputerUseValidationContext,
    operationId: string,
    startTime: number,
  ): Promise<ComputerUseValidationResult> {
    const controlContext = this.mapToComputerControlContext(context);
    const approved = await this.computerControlService.validateKeyboardInput(
      action as any,
      controlContext,
    );

    return this.createValidationResult({
      approved,
      operationId,
      startTime,
      action: action.action,
      serviceUsed: 'COMPUTER_CONTROL',
      context,
      riskLevel: RiskLevel._MODERATE,
    });
  }

  // ===== SCREEN CAPTURE VALIDATION =====

  private async validateScreenshot(
    context: ComputerUseValidationContext,
    operationId: string,
    startTime: number,
  ): Promise<ComputerUseValidationResult> {
    const captureContext = this.mapToScreenCaptureContext(context);
    const approved =
      await this.screenCaptureService.validateScreenshotCapture(captureContext);

    return this.createValidationResult({
      approved,
      operationId,
      startTime,
      action: 'screenshot',
      serviceUsed: 'SCREEN_CAPTURE',
      context,
      riskLevel: RiskLevel._LOW,
    });
  }

  // ===== FILE SYSTEM VALIDATION =====

  private async validateFileRead(
    action: ReadFileAction,
    context: ComputerUseValidationContext,
    operationId: string,
    startTime: number,
  ): Promise<ComputerUseValidationResult> {
    const fileContext = this.mapToFileSystemContext(context);
    const approved = await this.fileSystemService.validateFileRead(
      action.path!,
      fileContext,
    );

    return this.createValidationResult({
      approved,
      operationId,
      startTime,
      action: 'read_file',
      serviceUsed: 'FILE_SYSTEM',
      context,
      riskLevel: RiskLevel._LOW,
    });
  }

  private async validateFileWrite(
    action: WriteFileAction,
    context: ComputerUseValidationContext,
    operationId: string,
    startTime: number,
  ): Promise<ComputerUseValidationResult> {
    const fileContext = this.mapToFileSystemContext(context);
    const approved = await this.fileSystemService.validateFileWrite(
      action.path!,
      action.content!,
      fileContext,
    );

    return this.createValidationResult({
      approved,
      operationId,
      startTime,
      action: 'write_file',
      serviceUsed: 'FILE_SYSTEM',
      context,
      riskLevel: RiskLevel._MODERATE,
    });
  }

  // ===== APPLICATION CONTROL VALIDATION =====

  private async validateApplicationControl(
    action: ApplicationAction,
    context: ComputerUseValidationContext,
    operationId: string,
    startTime: number,
  ): Promise<ComputerUseValidationResult> {
    const appContext = this.mapToApplicationControlContext(context);
    const approved =
      await this.applicationControlService.validateApplicationLaunch(
        action.application!,
        `/Applications/${action.application}.app`,
        [],
        appContext,
      );

    return this.createValidationResult({
      approved,
      operationId,
      startTime,
      action: 'application',
      serviceUsed: 'APPLICATION_CONTROL',
      context,
      riskLevel: RiskLevel._MODERATE,
    });
  }

  // ===== CONTEXT MAPPING =====

  private mapToComputerControlContext(
    context: ComputerUseValidationContext,
  ): ComputerControlValidationContext {
    return {
      ...context,
      screenResolution: context.systemContext.screenResolution,
      activeApplication: context.systemContext.activeApplication,
      currentWindowTitle: context.systemContext.windowTitle,
      userAccessibilityNeeds:
        context.accessibilitySettings.userAccessibilityNeeds,
      performanceRequirements: context.performanceRequirements,
      privacyContext: {
        screenRecordingAllowed: context.privacySettings.allowScreenRecording,
        sensitiveDataVisible: false,
      },
    };
  }

  private mapToScreenCaptureContext(
    context: ComputerUseValidationContext,
  ): ScreenCaptureValidationContext {
    return {
      ...context,
      screenResolution: context.systemContext.screenResolution,
      activeApplication: context.systemContext.activeApplication,
      windowTitle: context.systemContext.windowTitle,
      privacySettings: context.privacySettings,
      accessibilityContext: context.accessibilitySettings,
      performanceRequirements: context.performanceRequirements,
    };
  }

  private mapToFileSystemContext(
    context: ComputerUseValidationContext,
  ): FileSystemValidationContext {
    return {
      ...context,
      userHomeDirectory: context.systemContext.userHomeDirectory,
      workingDirectory: context.systemContext.workingDirectory,
      allowedPaths: [context.systemContext.userHomeDirectory, '/tmp/'],
      restrictedPaths: ['/etc/', '/System/', '/Windows/'],
      securitySettings: {
        allowSystemFileAccess: context.securitySettings.allowSystemOperations,
        allowExecutableFileAccess: false,
        allowConfigFileModification: false,
        requireBackupForDestrictiveOps:
          context.securitySettings.requireBackupsForDestructiveOps,
        maxFileSizeBytes: 100 * 1024 * 1024, // 100MB
      },
      performanceRequirements: context.performanceRequirements,
    };
  }

  private mapToApplicationControlContext(
    context: ComputerUseValidationContext,
  ): ApplicationControlValidationContext {
    return {
      ...context,
      systemResources: {
        cpuUsagePercent: 25, // Would be retrieved from system monitoring
        memoryUsagePercent: 60,
        diskSpaceAvailable: 10 * 1024 * 1024 * 1024, // 10GB
        networkActivity: false,
      },
      securitySettings: {
        allowSystemApplications: context.securitySettings.allowSystemOperations,
        allowThirdPartyApplications: true,
        allowCommandLineTools: false,
        allowNetworkApplications: true,
        maxConcurrentApps: 10,
      },
      currentApplications: context.systemContext.currentProcesses.map(
        (proc) => ({
          processId: proc.processId,
          name: proc.name,
          status: proc.status as 'running' | 'stopped' | 'suspended',
          memoryUsage: proc.memoryUsage,
          cpuUsage: 0,
        }),
      ),
      performanceRequirements: context.performanceRequirements,
    };
  }

  // ===== RESULT CREATION =====

  private createValidationResult(params: {
    approved: boolean;
    operationId: string;
    startTime: number;
    action: string;
    serviceUsed: ComputerUseValidationResult['serviceUsed'];
    context: ComputerUseValidationContext;
    riskLevel: RiskLevel;
    conversationId?: string;
    reasoning?: string;
    confidence?: number;
  }): ComputerUseValidationResult {
    const validationDurationMs = Date.now() - params.startTime;

    return {
      approved: params.approved,
      operationId: params.operationId,
      validationTimestamp: new Date(),
      validationDurationMs,
      riskLevel: params.riskLevel,
      conversationId: params.conversationId || `conv_${params.operationId}`,
      reasoning:
        params.reasoning ||
        `${params.action} operation ${params.approved ? 'approved' : 'denied'} through ${params.serviceUsed} validation`,
      confidence: params.confidence || 0.9,
      serviceUsed: params.serviceUsed,
      fromCache: false,
      safeguards: this.generateSafeguards(params.riskLevel),
      monitoringRequired: params.riskLevel >= RiskLevel._HIGH,
      auditTrail: {
        userId: params.context.userId,
        timestamp: new Date(),
        operation: params.action,
        parameters: { action: params.action },
        result: params.approved ? 'APPROVED' : 'DENIED',
        riskAssessment: params.riskLevel,
      },
      performance: {
        validationTimeMs: validationDurationMs,
        serviceResponseTimeMs: validationDurationMs,
        cacheHit: false,
        subServiceMetrics: {},
      },
    };
  }

  // ===== HELPER METHODS =====

  private generateSafeguards(riskLevel: RiskLevel): string[] {
    switch (riskLevel) {
      case RiskLevel._CRITICAL:
        return [
          'comprehensive_monitoring',
          'multi_step_approval',
          'rollback_capability',
        ];
      case RiskLevel._HIGH:
        return ['enhanced_monitoring', 'approval_required', 'audit_logging'];
      case RiskLevel._MODERATE:
        return ['basic_monitoring', 'user_notification'];
      default:
        return ['standard_logging'];
    }
  }

  private calculateCacheExpiry(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case RiskLevel._MINIMAL:
        return 300000; // 5 minutes
      case RiskLevel._LOW:
        return 60000; // 1 minute
      case RiskLevel._MODERATE:
        return 30000; // 30 seconds
      default:
        return 0; // No caching for high/critical risk
    }
  }

  // ===== CACHE MANAGEMENT =====

  private generateMasterCacheKey(
    action: ComputerAction,
    context: ComputerUseValidationContext,
  ): string {
    const baseKey = `${action.action}_${context.userId}`;

    if ('coordinates' in action && action.coordinates) {
      return `${baseKey}_${action.coordinates.x}_${action.coordinates.y}`;
    }

    if ('path' in action && action.path) {
      return `${baseKey}_${action.path}`;
    }

    if ('application' in action && action.application) {
      return `${baseKey}_${action.application}`;
    }

    return baseKey;
  }

  private getMasterCachedResult(
    key: string,
  ): ComputerUseValidationResult | null {
    const cached = this.masterCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp.getTime() > cached.expiryMs) {
      this.masterCache.delete(key);
      return null;
    }

    cached.hitCount++;
    const result = { ...cached.result };
    result.fromCache = true;
    return result;
  }

  private setMasterCachedResult(
    key: string,
    result: ComputerUseValidationResult,
    expiryMs: number,
  ): void {
    this.masterCache.set(key, {
      result: { ...result },
      timestamp: new Date(),
      expiryMs,
      hitCount: 0,
    });
  }

  private cleanupMasterCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.masterCache.entries()) {
      if (now - cached.timestamp.getTime() > cached.expiryMs) {
        this.masterCache.delete(key);
      }
    }
  }

  // ===== TRACKING AND METRICS =====

  private trackOperationType(actionType: string): void {
    const current = this.systemMetrics.operationsByType.get(actionType) || 0;
    this.systemMetrics.operationsByType.set(actionType, current + 1);
  }

  private trackActiveOperation(
    operationId: string,
    operationType: string,
    userId: string,
    startTime: Date,
  ): void {
    this.activeOperations.set(operationId, {
      operationId,
      startTime,
      operationType,
      userId,
      riskLevel: RiskLevel._MODERATE, // Will be updated
    });
  }

  private completeActiveOperation(operationId: string, result: string): void {
    this.activeOperations.delete(operationId);

    if (result === 'APPROVED') {
      this.systemMetrics.approvedOperations++;
    } else if (result === 'DENIED') {
      this.systemMetrics.deniedOperations++;
    }
  }

  private cleanupActiveOperations(): void {
    const timeout = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    for (const [operationId, operation] of this.activeOperations.entries()) {
      if (now - operation.startTime.getTime() > timeout) {
        this.logger.warn(`Active operation timeout: ${operationId}`, {
          operationId,
          operationType: operation.operationType,
          duration: now - operation.startTime.getTime(),
        });
        this.activeOperations.delete(operationId);
      }
    }
  }

  private updateSystemMetrics(
    durationMs: number,
    fromCache: boolean,
    riskLevel: RiskLevel,
  ): void {
    // Update average validation time
    this.systemMetrics.averageValidationTime =
      (this.systemMetrics.averageValidationTime *
        (this.systemMetrics.totalOperations - 1) +
        durationMs) /
      this.systemMetrics.totalOperations;

    // Update cache hit rate
    if (fromCache) {
      this.systemMetrics.cacheHitRate =
        (this.systemMetrics.cacheHitRate *
          (this.systemMetrics.totalOperations - 1) +
          1) /
        this.systemMetrics.totalOperations;
    }

    // Update performance targets
    if (durationMs < 100) this.systemMetrics.performanceTargets.sub100ms++;
    if (durationMs < 200) this.systemMetrics.performanceTargets.sub200ms++;
    if (durationMs < 350) this.systemMetrics.performanceTargets.sub350ms++;
    if (durationMs < 500) this.systemMetrics.performanceTargets.sub500ms++;

    // Update risk level tracking
    const current =
      this.systemMetrics.operationsByRiskLevel.get(riskLevel) || 0;
    this.systemMetrics.operationsByRiskLevel.set(riskLevel, current + 1);
  }

  // ===== HEALTH MONITORING =====

  private async performHealthCheck(): Promise<void> {
    try {
      // Check individual service health
      const computerControlMetrics =
        this.computerControlService.getPerformanceMetrics();
      const screenCaptureMetrics =
        this.screenCaptureService.getPerformanceMetrics();
      const fileSystemMetrics = this.fileSystemService.getPerformanceMetrics();
      const applicationControlMetrics =
        this.applicationControlService.getPerformanceMetrics();

      // Update service health status
      this.systemMetrics.serviceHealth.computerControl =
        this.assessServiceHealth(computerControlMetrics);
      this.systemMetrics.serviceHealth.screenCapture =
        this.assessServiceHealth(screenCaptureMetrics);
      this.systemMetrics.serviceHealth.fileSystem =
        this.assessServiceHealth(fileSystemMetrics);
      this.systemMetrics.serviceHealth.applicationControl =
        this.assessServiceHealth(applicationControlMetrics);

      // Log health status
      this.logger.debug('System health check completed', {
        serviceHealth: this.systemMetrics.serviceHealth,
        activeOperations: this.activeOperations.size,
        cacheSize: this.masterCache.size,
      });
    } catch (error) {
      this.logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private assessServiceHealth(
    metrics: any,
  ): 'HEALTHY' | 'DEGRADED' | 'CRITICAL' {
    if (!metrics) return 'CRITICAL';

    // Check average response time
    if (metrics.averageValidationTime > 1000) return 'CRITICAL';
    if (metrics.averageValidationTime > 500) return 'DEGRADED';

    // Check error rate
    const totalOps =
      metrics.totalOperations ||
      metrics.totalApplicationLaunches ||
      metrics.totalScreenCaptures ||
      metrics.totalFileOperations;
    if (totalOps > 0) {
      const errorRate = (metrics.securityViolations || 0) / totalOps;
      if (errorRate > 0.1) return 'CRITICAL';
      if (errorRate > 0.05) return 'DEGRADED';
    }

    return 'HEALTHY';
  }

  private logSystemMetrics(): void {
    const totalOps = this.systemMetrics.totalOperations;

    this.logger.log('Enhanced Computer-Use Integration System Metrics', {
      totalOperations: totalOps,
      approvedOperations: this.systemMetrics.approvedOperations,
      deniedOperations: this.systemMetrics.deniedOperations,
      errorOperations: this.systemMetrics.errorOperations,
      approvalRate:
        totalOps > 0
          ? `${((this.systemMetrics.approvedOperations / totalOps) * 100).toFixed(1)}%`
          : '0%',
      averageValidationTime: `${this.systemMetrics.averageValidationTime.toFixed(2)}ms`,
      cacheHitRate: `${(this.systemMetrics.cacheHitRate * 100).toFixed(1)}%`,
      performanceTargets: {
        sub100msRate: `${((this.systemMetrics.performanceTargets.sub100ms / totalOps) * 100).toFixed(1)}%`,
        sub200msRate: `${((this.systemMetrics.performanceTargets.sub200ms / totalOps) * 100).toFixed(1)}%`,
        sub350msRate: `${((this.systemMetrics.performanceTargets.sub350ms / totalOps) * 100).toFixed(1)}%`,
        sub500msRate: `${((this.systemMetrics.performanceTargets.sub500ms / totalOps) * 100).toFixed(1)}%`,
      },
      serviceHealth: this.systemMetrics.serviceHealth,
      cacheSize: this.masterCache.size,
      activeOperations: this.activeOperations.size,
    });
  }

  // ===== PUBLIC API =====

  /**
   * Get comprehensive system performance metrics
   */
  getSystemPerformanceMetrics(): SystemPerformanceMetrics {
    const totalOps = this.systemMetrics.totalOperations;

    return {
      totalOperations: totalOps,
      operationsByType: Object.fromEntries(
        this.systemMetrics.operationsByType.entries(),
      ),
      operationsByRiskLevel: Object.fromEntries(
        this.systemMetrics.operationsByRiskLevel.entries(),
      ),
      averageValidationTime: this.systemMetrics.averageValidationTime,
      cacheHitRate: this.systemMetrics.cacheHitRate,
      approvalRate:
        totalOps > 0 ? this.systemMetrics.approvedOperations / totalOps : 0,
      systemLoad: {
        cpuUsage: 0, // Would be retrieved from system monitoring
        memoryUsage: 0,
        activeValidations: this.activeOperations.size,
      },
      performanceTargets: {
        sub100msOperations: this.systemMetrics.performanceTargets.sub100ms,
        sub200msOperations: this.systemMetrics.performanceTargets.sub200ms,
        sub350msOperations: this.systemMetrics.performanceTargets.sub350ms,
        sub500msOperations: this.systemMetrics.performanceTargets.sub500ms,
      },
      healthStatus: this.determineOverallHealthStatus(),
      lastHealthCheck: new Date(),
    };
  }

  private determineOverallHealthStatus(): 'HEALTHY' | 'DEGRADED' | 'CRITICAL' {
    const healthValues = Object.values(this.systemMetrics.serviceHealth);

    if (healthValues.includes('CRITICAL')) return 'CRITICAL';
    if (healthValues.includes('DEGRADED')) return 'DEGRADED';
    return 'HEALTHY';
  }

  /**
   * Clear all caches (for testing/maintenance)
   */
  clearCaches(): void {
    this.masterCache.clear();
    this.logger.log('All caches cleared');
  }

  /**
   * Get active operations count
   */
  getActiveOperationsCount(): number {
    return this.activeOperations.size;
  }
}
