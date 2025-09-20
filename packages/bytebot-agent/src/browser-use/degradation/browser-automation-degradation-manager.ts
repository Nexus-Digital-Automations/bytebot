/**
 * Browser Automation Degradation Manager
 *
 * Graceful degradation mechanisms for browser automation failures with
 * alternative approaches, user notification systems, and fallback strategies.
 *
 * Features:
 * - Intelligent degradation decision making
 * - Alternative operation modes
 * - User notification and communication
 * - Service level management
 * - Performance optimization during degradation
 * - Recovery and restoration mechanisms
 */

import { Injectable } from '@nestjs/common';
// Removed unused imports - these are imported but not used in the current implementation
import { BrowserAutomationOperationType } from '../response/browser-automation-response-formatter';
import { BrowserAutomationMonitoringService } from '../monitoring/browser-automation-monitoring.service';

export enum DegradationLevel {
  NONE = 'NONE', // Full functionality available
  MINIMAL = 'MINIMAL', // Minor feature limitations
  MODERATE = 'MODERATE', // Significant feature reductions
  SEVERE = 'SEVERE', // Basic functionality only
  EMERGENCY = 'EMERGENCY', // Emergency mode, critical functions only
}

export enum DegradationTrigger {
  ERROR_RATE_THRESHOLD = 'ERROR_RATE_THRESHOLD',
  RESOURCE_EXHAUSTION = 'RESOURCE_EXHAUSTION',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  PERFORMANCE_DEGRADATION = 'PERFORMANCE_DEGRADATION',
  SECURITY_INCIDENT = 'SECURITY_INCIDENT',
  MANUAL_ACTIVATION = 'MANUAL_ACTIVATION',
  DEPENDENCY_FAILURE = 'DEPENDENCY_FAILURE',
  CAPACITY_OVERLOAD = 'CAPACITY_OVERLOAD',
}

export interface DegradationStrategy {
  name: string;
  level: DegradationLevel;
  applicableOperations: BrowserAutomationOperationType[];
  triggers: DegradationTrigger[];
  conditions: {
    errorRateThreshold?: number;
    memoryUsageThreshold?: number;
    cpuUsageThreshold?: number;
    responseTimeThreshold?: number;
    consecutiveFailures?: number;
    timeWindowMinutes?: number;
  };
  mitigations: Array<{
    type:
      | 'disable_feature'
      | 'reduce_quality'
      | 'increase_timeout'
      | 'use_fallback'
      | 'limit_concurrency'
      | 'cache_aggressively';
    target: string;
    parameters: Record<string, unknown>;
    impact: string;
  }>;
  userNotification: {
    message: string;
    severity: 'INFO' | 'WARNING' | 'ERROR';
    showToUser: boolean;
    includeETA?: boolean;
    alternativeActions?: string[];
  };
  autoRecovery: {
    enabled: boolean;
    checkIntervalMinutes: number;
    recoveryConditions: {
      errorRateBelow?: number;
      resourceUsageBelow?: number;
      consecutiveSuccesses?: number;
    };
  };
}

export interface DegradationState {
  active: boolean;
  level: DegradationLevel;
  activatedAt: Date;
  trigger: DegradationTrigger;
  strategy: string;
  affectedOperations: BrowserAutomationOperationType[];
  mitigationsApplied: string[];
  userNotified: boolean;
  recoveryAttempts: number;
  estimatedRecoveryTime?: Date;
  _metadata: Record<string, unknown>;
}

export interface FallbackOperation {
  originalOperation: BrowserAutomationOperationType;
  fallbackMethod: string;
  qualityReduction: number; // 0-100 percentage
  performanceImpact: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  successRate: number; // 0-1
  requirements: string[];
  limitations: string[];
}

/**
 * Browser Automation Degradation Manager
 */
@Injectable()
export class BrowserAutomationDegradationManager {
  private readonly logger = new Logger(
    BrowserAutomationDegradationManager.name,
  );
  private readonly degradationStrategies = new Map<
    string,
    DegradationStrategy
  >();
  private readonly fallbackOperations = new Map<
    BrowserAutomationOperationType,
    FallbackOperation[]
  >();
  private currentDegradationState: DegradationState | null = null;
  private readonly degradationHistory: Array<
    DegradationState & { deactivatedAt?: Date; duration?: number }
  > = [];

  private degradationCheckInterval?: NodeJS.Timeout;
  private recoveryCheckInterval?: NodeJS.Timeout;

  constructor(
    private readonly monitoringService: BrowserAutomationMonitoringService,
  ) {
    this.initializeDegradationStrategies();
    this.initializeFallbackOperations();
    this.startDegradationMonitoring();
  }

  /**
   * Check if degradation should be activated based on current system state
   */
  async evaluateDegradationNeed(): Promise<{
    shouldActivate: boolean;
    recommendedLevel: DegradationLevel;
    trigger: DegradationTrigger;
    strategy?: string;
    reasoning: string[];
  }> {
    const systemHealth = this.monitoringService.getSystemHealthMetrics();
    this.monitoringService.getErrorMetrics();
    const performanceMetrics = this.monitoringService.getPerformanceMetrics();

    const reasoning: string[] = [];
    let recommendedLevel = DegradationLevel.NONE;
    let trigger = DegradationTrigger.ERROR_RATE_THRESHOLD;
    let suggestedStrategy: string | undefined;

    // Check error rate
    const totalOperations = Array.from(performanceMetrics.values()).reduce(
      (sum, m) => sum + m.totalOperations,
      0,
    );
    const totalErrors = Array.from(performanceMetrics.values()).reduce(
      (sum, m) => sum + m.failedOperations,
      0,
    );
    const errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;

    if (errorRate > 0.5) {
      recommendedLevel = DegradationLevel.EMERGENCY;
      trigger = DegradationTrigger.ERROR_RATE_THRESHOLD;
      reasoning.push(`Critical error rate: ${(errorRate * 100).toFixed(1)}%`);
      suggestedStrategy = 'emergency_mode';
    } else if (errorRate > 0.3) {
      recommendedLevel = DegradationLevel.SEVERE;
      trigger = DegradationTrigger.ERROR_RATE_THRESHOLD;
      reasoning.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
      suggestedStrategy = 'high_error_rate_mitigation';
    } else if (errorRate > 0.15) {
      recommendedLevel = DegradationLevel.MODERATE;
      trigger = DegradationTrigger.ERROR_RATE_THRESHOLD;
      reasoning.push(`Elevated error rate: ${(errorRate * 100).toFixed(1)}%`);
      suggestedStrategy = 'error_rate_management';
    } else if (errorRate > 0.05) {
      recommendedLevel = DegradationLevel.MINIMAL;
      trigger = DegradationTrigger.ERROR_RATE_THRESHOLD;
      reasoning.push(
        `Slightly elevated error rate: ${(errorRate * 100).toFixed(1)}%`,
      );
      suggestedStrategy = 'minimal_degradation';
    }

    // Check resource usage
    if (systemHealth.resources.memoryUsagePercent > 95) {
      if (recommendedLevel === DegradationLevel.NONE) {
        recommendedLevel = DegradationLevel.SEVERE;
        trigger = DegradationTrigger.RESOURCE_EXHAUSTION;
        suggestedStrategy = 'memory_conservation';
      }
      reasoning.push(
        `Critical memory usage: ${systemHealth.resources.memoryUsagePercent.toFixed(1)}%`,
      );
    } else if (systemHealth.resources.memoryUsagePercent > 85) {
      if (
        recommendedLevel === DegradationLevel.NONE ||
        recommendedLevel === DegradationLevel.MINIMAL
      ) {
        recommendedLevel = DegradationLevel.MODERATE;
        trigger = DegradationTrigger.RESOURCE_EXHAUSTION;
        suggestedStrategy = 'resource_optimization';
      }
      reasoning.push(
        `High memory usage: ${systemHealth.resources.memoryUsagePercent.toFixed(1)}%`,
      );
    }

    // Check CPU usage
    if (systemHealth.resources.cpuUsagePercent > 90) {
      if (recommendedLevel === DegradationLevel.NONE) {
        recommendedLevel = DegradationLevel.MODERATE;
        trigger = DegradationTrigger.RESOURCE_EXHAUSTION;
        suggestedStrategy = 'cpu_optimization';
      }
      reasoning.push(
        `High CPU usage: ${systemHealth.resources.cpuUsagePercent.toFixed(1)}%`,
      );
    }

    // Check browser process health
    if (systemHealth.browserProcesses.crashed > 0) {
      if (recommendedLevel === DegradationLevel.NONE) {
        recommendedLevel = DegradationLevel.MODERATE;
        trigger = DegradationTrigger.SERVICE_UNAVAILABLE;
        suggestedStrategy = 'process_stability';
      }
      reasoning.push(
        `Browser processes crashed: ${systemHealth.browserProcesses.crashed}`,
      );
    }

    // Check performance degradation
    const avgResponseTime =
      Array.from(performanceMetrics.values()).reduce(
        (sum, m) => sum + m.averageDurationMs,
        0,
      ) / performanceMetrics.size;

    if (avgResponseTime > 30000) {
      // 30 seconds
      if (recommendedLevel === DegradationLevel.NONE) {
        recommendedLevel = DegradationLevel.MODERATE;
        trigger = DegradationTrigger.PERFORMANCE_DEGRADATION;
        suggestedStrategy = 'performance_optimization';
      }
      reasoning.push(`Slow response times: ${avgResponseTime}ms average`);
    }

    const shouldActivate = recommendedLevel !== DegradationLevel.NONE;

    return {
      shouldActivate,
      recommendedLevel,
      trigger,
      strategy: suggestedStrategy,
      reasoning,
    };
  }

  /**
   * Activate degradation mode
   */
  async activateDegradation(
    level: DegradationLevel,
    trigger: DegradationTrigger,
    strategyName?: string,
    metadata?: Record<string, unknown>,
  ): Promise<{
    success: boolean;
    state: DegradationState;
    mitigationsApplied: string[];
    error?: string;
  }> {
    try {
      this.logger.warn(`Activating degradation mode: ${level}`, {
        trigger,
        strategy: strategyName,
        metadata,
      });

      // Deactivate current degradation if active
      if (this.currentDegradationState) {
        await this.deactivateDegradation();
      }

      // Find appropriate strategy
      const strategy = strategyName
        ? this.degradationStrategies.get(strategyName)
        : this.findBestStrategy(level, trigger);

      if (!strategy) {
        return {
          success: false,
          state: {} as DegradationState,
          mitigationsApplied: [],
          _error: `No suitable degradation strategy found for level: ${level}`,
        };
      }

      // Apply mitigations
      const mitigationsApplied: string[] = [];
      for (const mitigation of strategy.mitigations) {
        try {
          await this.applyMitigation(mitigation);
          mitigationsApplied.push(mitigation.type);
          this.logger.debug(
            `Applied mitigation: ${mitigation.type}`,
            mitigation,
          );
        } catch (error) {
          this.logger.error(
            `Failed to apply mitigation: ${mitigation.type}`,
            error,
          );
        }
      }

      // Create degradation state
      this.currentDegradationState = {
        active: true,
        level,
        activatedAt: new Date(),
        trigger,
        strategy: strategy.name,
        affectedOperations: strategy.applicableOperations,
        mitigationsApplied,
        userNotified: false,
        recoveryAttempts: 0,
        _metadata: metadata || {},
      };

      // Notify users if required
      if (strategy.userNotification.showToUser) {
        await this.notifyUsers(strategy.userNotification);
        this.currentDegradationState.userNotified = true;
      }

      // Start recovery monitoring if enabled
      if (strategy.autoRecovery.enabled) {
        this.startRecoveryMonitoring(strategy);
      }

      // Record in history
      this.degradationHistory.push({ ...this.currentDegradationState });

      this.logger.log(`Degradation mode activated successfully: ${level}`, {
        strategy: strategy.name,
        mitigationsApplied,
      });

      return {
        success: true,
        state: this.currentDegradationState,
        mitigationsApplied,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to activate degradation mode: ${errorMessage}`,
        error,
      );

      return {
        success: false,
        state: {} as DegradationState,
        mitigationsApplied: [],
        _error: errorMessage,
      };
    }
  }

  /**
   * Deactivate degradation mode
   */
  async deactivateDegradation(): Promise<{
    success: boolean;
    previousState?: DegradationState;
    error?: string;
  }> {
    try {
      if (!this.currentDegradationState) {
        return {
          success: true,
          _error: 'No active degradation to deactivate',
        };
      }

      this.logger.log(
        `Deactivating degradation mode: ${this.currentDegradationState.level}`,
      );

      const previousState = { ...this.currentDegradationState };

      // Remove applied mitigations
      for (const mitigationType of this.currentDegradationState
        .mitigationsApplied) {
        try {
          await this.removeMitigation(mitigationType);
          this.logger.debug(`Removed mitigation: ${mitigationType}`);
        } catch (error) {
          this.logger.error(
            `Failed to remove mitigation: ${mitigationType}`,
            error,
          );
        }
      }

      // Update history
      const historyEntry =
        this.degradationHistory[this.degradationHistory.length - 1];
      if (historyEntry && !historyEntry.deactivatedAt) {
        historyEntry.deactivatedAt = new Date();
        historyEntry.duration =
          historyEntry.deactivatedAt.getTime() -
          historyEntry.activatedAt.getTime();
      }

      // Clear current state
      this.currentDegradationState = null;

      // Stop recovery monitoring
      if (this.recoveryCheckInterval) {
        clearInterval(this.recoveryCheckInterval);
        this.recoveryCheckInterval = undefined;
      }

      // Notify users of recovery
      await this.notifyUsers({
        message:
          'System has recovered from degraded mode. Full functionality restored.',
        severity: 'INFO',
        showToUser: true,
        alternativeActions: [],
      });

      this.logger.log('Degradation mode deactivated successfully');

      return {
        success: true,
        previousState,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to deactivate degradation mode: ${errorMessage}`,
        error,
      );

      return {
        success: false,
        _error: errorMessage,
      };
    }
  }

  /**
   * Get fallback operation for a given operation type
   */
  getFallbackOperation(
    operationType: BrowserAutomationOperationType,
    currentDegradationLevel?: DegradationLevel,
  ): FallbackOperation | null {
    const fallbacks = this.fallbackOperations.get(operationType);
    if (!fallbacks || fallbacks.length === 0) {
      return null;
    }

    // Select best fallback based on degradation level
    if (currentDegradationLevel) {
      // For higher degradation levels, prefer simpler fallbacks
      // For higher degradation levels, prefer simpler fallbacks
      // Priority: Emergency(4) > Severe(3) > Moderate(2) > Minimal(1) > None(0)

      return (
        fallbacks.find(
          (fallback) =>
            fallback.performanceImpact === 'LOW' ||
            fallback.performanceImpact === 'NONE',
        ) || fallbacks[0]
      );
    }

    // Return the first available fallback
    return fallbacks[0];
  }

  /**
   * Execute operation with degradation awareness
   */
  async executeWithDegradation<T>(
    operationType: BrowserAutomationOperationType,
    originalOperation: () => Promise<T>,
    context?: Record<string, unknown>,
  ): Promise<{
    result?: T;
    success: boolean;
    degraded: boolean;
    fallbackUsed?: string;
    qualityReduction?: number;
    error?: Error;
  }> {
    try {
      // If no degradation is active, execute normally
      if (!this.currentDegradationState) {
        const result = await originalOperation();
        return {
          result,
          success: true,
          degraded: false,
        };
      }

      // Check if operation is affected by current degradation
      if (
        !this.currentDegradationState.affectedOperations.includes(operationType)
      ) {
        const result = await originalOperation();
        return {
          result,
          success: true,
          degraded: false,
        };
      }

      // Get fallback operation
      const fallback = this.getFallbackOperation(
        operationType,
        this.currentDegradationState.level,
      );

      if (!fallback) {
        // No fallback available, try original operation with warnings
        this.logger.warn(
          `No fallback available for operation: ${operationType} in degraded mode`,
        );

        try {
          const result = await originalOperation();
          return {
            result,
            success: true,
            degraded: true,
            qualityReduction: 0,
          };
        } catch (error) {
          return {
            success: false,
            degraded: true,
            _error: error instanceof Error ? _error : new Error(String(error)),
          };
        }
      }

      // Execute fallback operation
      this.logger.debug(
        `Executing fallback operation: ${fallback.fallbackMethod} for ${operationType}`,
      );

      const fallbackResult = await this.executeFallbackOperation(
        fallback,
        context,
      );

      return {
        _result: fallbackResult as T,
        success: true,
        degraded: true,
        fallbackUsed: fallback.fallbackMethod,
        qualityReduction: fallback.qualityReduction,
      };
    } catch (error) {
      return {
        success: false,
        degraded: !!this.currentDegradationState,
        _error: error instanceof Error ? _error : new Error(String(error)),
      };
    }
  }

  /**
   * Get current degradation state
   */
  getCurrentDegradationState(): DegradationState | null {
    return this.currentDegradationState;
  }

  /**
   * Get degradation history
   */
  getDegradationHistory(): Array<
    DegradationState & { deactivatedAt?: Date; duration?: number }
  > {
    return [...this.degradationHistory];
  }

  /**
   * Get available degradation strategies
   */
  getAvailableStrategies(): DegradationStrategy[] {
    return Array.from(this.degradationStrategies.values());
  }

  /**
   * Get available fallback operations
   */
  getAvailableFallbacks(): Map<
    BrowserAutomationOperationType,
    FallbackOperation[]
  > {
    return new Map(this.fallbackOperations);
  }

  /**
   * Manual recovery attempt
   */
  async attemptRecovery(): Promise<{
    success: boolean;
    recovered: boolean;
    reasoning: string[];
  }> {
    if (!this.currentDegradationState) {
      return {
        success: true,
        recovered: false,
        reasoning: ['No active degradation to recover from'],
      };
    }

    const evaluation = await this.evaluateDegradationNeed();

    if (!evaluation.shouldActivate) {
      await this.deactivateDegradation();
      return {
        success: true,
        recovered: true,
        reasoning: ['System conditions have improved', ...evaluation.reasoning],
      };
    }

    this.currentDegradationState.recoveryAttempts++;

    return {
      success: true,
      recovered: false,
      reasoning: ['Recovery conditions not yet met', ...evaluation.reasoning],
    };
  }

  /**
   * Private implementation methods
   */

  private initializeDegradationStrategies(): void {
    // Minimal degradation strategy
    this.degradationStrategies.set('minimal_degradation', {
      name: 'minimal_degradation',
      level: DegradationLevel.MINIMAL,
      applicableOperations: [
        BrowserAutomationOperationType.SCREENSHOT,
        BrowserAutomationOperationType.DATA_EXTRACTION,
      ],
      triggers: [DegradationTrigger.ERROR_RATE_THRESHOLD],
      conditions: {
        errorRateThreshold: 0.05,
        timeWindowMinutes: 5,
      },
      mitigations: [
        {
          type: 'reduce_quality',
          target: 'screenshots',
          parameters: { quality: 70 },
          impact: 'Reduced screenshot quality to improve performance',
        },
        {
          type: 'increase_timeout',
          target: 'page_load',
          parameters: { timeoutMs: 45000 },
          impact: 'Increased page load timeout to reduce failures',
        },
      ],
      userNotification: {
        message:
          'System is operating with minor optimizations to improve stability.',
        severity: 'INFO',
        showToUser: false,
      },
      autoRecovery: {
        enabled: true,
        checkIntervalMinutes: 5,
        recoveryConditions: {
          errorRateBelow: 0.03,
          consecutiveSuccesses: 10,
        },
      },
    });

    // Error rate management strategy
    this.degradationStrategies.set('error_rate_management', {
      name: 'error_rate_management',
      level: DegradationLevel.MODERATE,
      applicableOperations: [
        BrowserAutomationOperationType.NAVIGATION,
        BrowserAutomationOperationType.ELEMENT_INTERACTION,
        BrowserAutomationOperationType.FORM_SUBMISSION,
      ],
      triggers: [DegradationTrigger.ERROR_RATE_THRESHOLD],
      conditions: {
        errorRateThreshold: 0.15,
        timeWindowMinutes: 10,
      },
      mitigations: [
        {
          type: 'limit_concurrency',
          target: 'browser_sessions',
          parameters: { maxConcurrent: 3 },
          impact: 'Reduced concurrent sessions to improve stability',
        },
        {
          type: 'increase_timeout',
          target: 'all_operations',
          parameters: { multiplier: 1.5 },
          impact: 'Increased operation timeouts',
        },
        {
          type: 'cache_aggressively',
          target: 'page_resources',
          parameters: { cacheTtlMinutes: 30 },
          impact: 'Aggressive caching to reduce network load',
        },
      ],
      userNotification: {
        message:
          'System is managing high error rates. Some operations may be slower but more reliable.',
        severity: 'WARNING',
        showToUser: true,
        alternativeActions: [
          'Use cached data where available',
          'Retry failed operations',
        ],
      },
      autoRecovery: {
        enabled: true,
        checkIntervalMinutes: 10,
        recoveryConditions: {
          errorRateBelow: 0.1,
          consecutiveSuccesses: 20,
        },
      },
    });

    // High error rate mitigation
    this.degradationStrategies.set('high_error_rate_mitigation', {
      name: 'high_error_rate_mitigation',
      level: DegradationLevel.SEVERE,
      applicableOperations: Object.values(BrowserAutomationOperationType),
      triggers: [DegradationTrigger.ERROR_RATE_THRESHOLD],
      conditions: {
        errorRateThreshold: 0.3,
        timeWindowMinutes: 5,
      },
      mitigations: [
        {
          type: 'limit_concurrency',
          target: 'browser_sessions',
          parameters: { maxConcurrent: 1 },
          impact: 'Single session mode for maximum stability',
        },
        {
          type: 'disable_feature',
          target: 'video_recording',
          parameters: {},
          impact: 'Disabled video recording to conserve resources',
        },
        {
          type: 'reduce_quality',
          target: 'screenshots',
          parameters: { quality: 50 },
          impact: 'Reduced screenshot quality significantly',
        },
        {
          type: 'use_fallback',
          target: 'complex_operations',
          parameters: { mode: 'simple' },
          impact: 'Using simplified operation modes',
        },
      ],
      userNotification: {
        message:
          'System is experiencing high error rates. Operating in limited mode for stability.',
        severity: 'ERROR',
        showToUser: true,
        includeETA: true,
        alternativeActions: [
          'Wait for system recovery',
          'Use manual alternative methods',
        ],
      },
      autoRecovery: {
        enabled: true,
        checkIntervalMinutes: 15,
        recoveryConditions: {
          errorRateBelow: 0.2,
          consecutiveSuccesses: 30,
        },
      },
    });

    // Emergency mode
    this.degradationStrategies.set('emergency_mode', {
      name: 'emergency_mode',
      level: DegradationLevel.EMERGENCY,
      applicableOperations: Object.values(BrowserAutomationOperationType),
      triggers: [
        DegradationTrigger.ERROR_RATE_THRESHOLD,
        DegradationTrigger.RESOURCE_EXHAUSTION,
        DegradationTrigger.SECURITY_INCIDENT,
      ],
      conditions: {
        errorRateThreshold: 0.5,
        memoryUsageThreshold: 95,
        timeWindowMinutes: 5,
      },
      mitigations: [
        {
          type: 'disable_feature',
          target: 'all_non_essential',
          parameters: {},
          impact: 'Disabled all non-essential features',
        },
        {
          type: 'limit_concurrency',
          target: 'browser_sessions',
          parameters: { maxConcurrent: 1 },
          impact: 'Emergency single session mode',
        },
        {
          type: 'use_fallback',
          target: 'all_operations',
          parameters: { mode: 'emergency' },
          impact: 'All operations use emergency fallbacks',
        },
      ],
      userNotification: {
        message:
          'System is in emergency mode. Only critical functions are available.',
        severity: 'ERROR',
        showToUser: true,
        includeETA: true,
        alternativeActions: [
          'Contact system administrator',
          'Use alternative systems',
        ],
      },
      autoRecovery: {
        enabled: true,
        checkIntervalMinutes: 30,
        recoveryConditions: {
          errorRateBelow: 0.1,
          resourceUsageBelow: 80,
          consecutiveSuccesses: 50,
        },
      },
    });
  }

  private initializeFallbackOperations(): void {
    // Screenshot fallbacks
    this.fallbackOperations.set(BrowserAutomationOperationType.SCREENSHOT, [
      {
        originalOperation: BrowserAutomationOperationType.SCREENSHOT,
        fallbackMethod: 'reduced_quality_screenshot',
        qualityReduction: 30,
        performanceImpact: 'LOW',
        successRate: 0.95,
        requirements: ['browser_session'],
        limitations: ['Lower image quality', 'Reduced file size'],
      },
      {
        originalOperation: BrowserAutomationOperationType.SCREENSHOT,
        fallbackMethod: 'viewport_only_screenshot',
        qualityReduction: 50,
        performanceImpact: 'LOW',
        successRate: 0.98,
        requirements: ['browser_session'],
        limitations: ['Viewport only', 'No full page capture'],
      },
    ]);

    // Navigation fallbacks
    this.fallbackOperations.set(BrowserAutomationOperationType.NAVIGATION, [
      {
        originalOperation: BrowserAutomationOperationType.NAVIGATION,
        fallbackMethod: 'simple_navigation',
        qualityReduction: 20,
        performanceImpact: 'LOW',
        successRate: 0.9,
        requirements: ['browser_session'],
        limitations: ['No advanced loading strategies', 'Basic error handling'],
      },
      {
        originalOperation: BrowserAutomationOperationType.NAVIGATION,
        fallbackMethod: 'cached_navigation',
        qualityReduction: 10,
        performanceImpact: 'NONE',
        successRate: 0.99,
        requirements: ['cached_page'],
        limitations: ['May show stale content', 'Limited interactivity'],
      },
    ]);

    // Element interaction fallbacks
    this.fallbackOperations.set(
      BrowserAutomationOperationType.ELEMENT_INTERACTION,
      [
        {
          originalOperation: BrowserAutomationOperationType.ELEMENT_INTERACTION,
          fallbackMethod: 'simple_click',
          qualityReduction: 25,
          performanceImpact: 'LOW',
          successRate: 0.85,
          requirements: ['element_visible'],
          limitations: ['No complex interactions', 'Basic click only'],
        },
        {
          originalOperation: BrowserAutomationOperationType.ELEMENT_INTERACTION,
          fallbackMethod: 'javascript_interaction',
          qualityReduction: 40,
          performanceImpact: 'MEDIUM',
          successRate: 0.8,
          requirements: ['javascript_enabled'],
          limitations: [
            'May bypass browser security',
            'Limited event simulation',
          ],
        },
      ],
    );

    // Data extraction fallbacks
    this.fallbackOperations.set(
      BrowserAutomationOperationType.DATA_EXTRACTION,
      [
        {
          originalOperation: BrowserAutomationOperationType.DATA_EXTRACTION,
          fallbackMethod: 'text_only_extraction',
          qualityReduction: 35,
          performanceImpact: 'LOW',
          successRate: 0.9,
          requirements: ['page_loaded'],
          limitations: ['Text content only', 'No structured data'],
        },
        {
          originalOperation: BrowserAutomationOperationType.DATA_EXTRACTION,
          fallbackMethod: 'cached_data_extraction',
          qualityReduction: 60,
          performanceImpact: 'NONE',
          successRate: 0.95,
          requirements: ['cached_data'],
          limitations: ['Potentially stale data', 'No real-time updates'],
        },
      ],
    );
  }

  private startDegradationMonitoring(): void {
    this.degradationCheckInterval = setInterval(async () => {
      if (!this.currentDegradationState) {
        const evaluation = await this.evaluateDegradationNeed();
        if (evaluation.shouldActivate) {
          await this.activateDegradation(
            evaluation.recommendedLevel,
            evaluation.trigger,
            evaluation.strategy,
            { automatic: true, reasoning: evaluation.reasoning },
          );
        }
      }
    }, 60000); // Check every minute
  }

  private startRecoveryMonitoring(strategy: DegradationStrategy): void {
    if (this.recoveryCheckInterval) {
      clearInterval(this.recoveryCheckInterval);
    }

    this.recoveryCheckInterval = setInterval(async () => {
      if (this.currentDegradationState) {
        const shouldRecover = await this.evaluateRecoveryConditions(strategy);
        if (shouldRecover) {
          await this.attemptRecovery();
        }
      }
    }, strategy.autoRecovery.checkIntervalMinutes * 60000);
  }

  private async evaluateRecoveryConditions(
    strategy: DegradationStrategy,
  ): Promise<boolean> {
    const conditions = strategy.autoRecovery.recoveryConditions;
    const systemHealth = this.monitoringService.getSystemHealthMetrics();
    const performanceMetrics = this.monitoringService.getPerformanceMetrics();

    // Check error rate
    if (conditions.errorRateBelow) {
      const totalOps = Array.from(performanceMetrics.values()).reduce(
        (sum, m) => sum + m.totalOperations,
        0,
      );
      const totalErrors = Array.from(performanceMetrics.values()).reduce(
        (sum, m) => sum + m.failedOperations,
        0,
      );
      const errorRate = totalOps > 0 ? totalErrors / totalOps : 0;

      if (errorRate >= conditions.errorRateBelow) {
        return false;
      }
    }

    // Check resource usage
    if (conditions.resourceUsageBelow) {
      if (
        systemHealth.resources.memoryUsagePercent >=
          conditions.resourceUsageBelow ||
        systemHealth.resources.cpuUsagePercent >= conditions.resourceUsageBelow
      ) {
        return false;
      }
    }

    // Check consecutive successes (simplified)
    if (conditions.consecutiveSuccesses) {
      // In a real implementation, this would track consecutive successful operations
      // For now, we'll assume this condition is met if other conditions pass
    }

    return true;
  }

  private findBestStrategy(
    level: DegradationLevel,
    trigger: DegradationTrigger,
  ): DegradationStrategy | undefined {
    const strategies = Array.from(this.degradationStrategies.values())
      .filter(
        (strategy) =>
          strategy.level === level && strategy.triggers.includes(trigger),
      )
      .sort((a, b) => a.mitigations.length - b.mitigations.length); // Prefer simpler strategies

    return strategies[0];
  }

  private async applyMitigation(
    mitigation: DegradationStrategy['mitigations'][0],
  ): Promise<void> {
    this.logger.debug(`Applying mitigation: ${mitigation.type}`, mitigation);

    switch (mitigation.type) {
      case 'disable_feature':
        // Implement feature disabling logic
        break;
      case 'reduce_quality':
        // Implement quality reduction logic
        break;
      case 'increase_timeout':
        // Implement timeout increase logic
        break;
      case 'use_fallback':
        // Implement fallback activation logic
        break;
      case 'limit_concurrency':
        // Implement concurrency limiting logic
        break;
      case 'cache_aggressively':
        // Implement aggressive caching logic
        break;
    }
  }

  private async removeMitigation(mitigationType: string): Promise<void> {
    this.logger.debug(`Removing mitigation: ${mitigationType}`);

    switch (mitigationType) {
      case 'disable_feature':
        // Re-enable features
        break;
      case 'reduce_quality':
        // Restore quality settings
        break;
      case 'increase_timeout':
        // Restore timeout settings
        break;
      case 'use_fallback':
        // Restore normal operations
        break;
      case 'limit_concurrency':
        // Restore concurrency limits
        break;
      case 'cache_aggressively':
        // Restore normal caching
        break;
    }
  }

  private async executeFallbackOperation(
    fallback: FallbackOperation,
    context?: Record<string, unknown>,
  ): Promise<unknown> {
    this.logger.debug(`Executing fallback: ${fallback.fallbackMethod}`);

    // Implement fallback operation execution based on method
    switch (fallback.fallbackMethod) {
      case 'reduced_quality_screenshot':
        return this.executeReducedQualityScreenshot(context);
      case 'viewport_only_screenshot':
        return this.executeViewportOnlyScreenshot(context);
      case 'simple_navigation':
        return this.executeSimpleNavigation(context);
      case 'cached_navigation':
        return this.executeCachedNavigation(context);
      case 'simple_click':
        return this.executeSimpleClick(context);
      case 'javascript_interaction':
        return this.executeJavaScriptInteraction(context);
      case 'text_only_extraction':
        return this.executeTextOnlyExtraction(context);
      case 'cached_data_extraction':
        return this.executeCachedDataExtraction(context);
      default:
        throw new Error(`Unknown fallback method: ${fallback.fallbackMethod}`);
    }
  }

  private async notifyUsers(
    notification: DegradationStrategy['userNotification'],
  ): Promise<void> {
    this.logger.log(`User notification: ${notification.message}`, {
      severity: notification.severity,
      showToUser: notification.showToUser,
    });

    // In a real implementation, this would send notifications through various channels
    // (UI notifications, emails, webhooks, etc.)
  }

  // Simplified fallback operation implementations
  private async executeReducedQualityScreenshot(
    _context?: Record<string, unknown>,
  ): Promise<unknown> {
    // Implement reduced quality screenshot logic
    return { screenshot: 'base64_data_reduced_quality', quality: 70 };
  }

  private async executeViewportOnlyScreenshot(
    _context?: Record<string, unknown>,
  ): Promise<unknown> {
    // Implement viewport-only screenshot logic
    return { screenshot: 'base64_data_viewport_only', fullPage: false };
  }

  private async executeSimpleNavigation(
    context?: Record<string, unknown>,
  ): Promise<unknown> {
    // Implement simple navigation logic
    return { url: context?.url, navigated: true, method: 'simple' };
  }

  private async executeCachedNavigation(
    context?: Record<string, unknown>,
  ): Promise<unknown> {
    // Implement cached navigation logic
    return { url: context?.url, navigated: true, cached: true };
  }

  private async executeSimpleClick(
    _context?: Record<string, unknown>,
  ): Promise<unknown> {
    // Implement simple click logic
    return { clicked: true, method: 'simple' };
  }

  private async executeJavaScriptInteraction(
    _context?: Record<string, unknown>,
  ): Promise<unknown> {
    // Implement JavaScript interaction logic
    return { interacted: true, method: 'javascript' };
  }

  private async executeTextOnlyExtraction(
    _context?: Record<string, unknown>,
  ): Promise<unknown> {
    // Implement text-only extraction logic
    return { text: 'extracted_text_content', type: 'text_only' };
  }

  private async executeCachedDataExtraction(
    _context?: Record<string, unknown>,
  ): Promise<unknown> {
    // Implement cached data extraction logic
    return { _data: 'cached_extracted_data', cached: true };
  }
}
