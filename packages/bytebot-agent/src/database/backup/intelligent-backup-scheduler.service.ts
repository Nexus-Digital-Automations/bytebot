/**
 * Intelligent Backup Scheduler Service - PARLANT Conversational Scheduling
 *
 * Provides intelligent backup scheduling with PARLANT conversational approval,
 * automated schedule optimization, conflict resolution, and user-friendly
 * backup management interfaces with enterprise governance controls.
 *
 * Features:
 * - PARLANT conversational approval for backup schedules
 * - Intelligent schedule optimization based on system load patterns
 * - Automated conflict detection and resolution
 * - Dynamic schedule adjustment based on business requirements
 * - User-friendly approval interfaces with risk assessment
 * - Comprehensive schedule audit trail and compliance reporting
 * - Integration with disaster recovery planning
 * - Performance-aware scheduling with resource optimization
 *
 * Architecture: Event-driven scheduler with PARLANT integration
 * Security: Role-based schedule approval with enterprise compliance
 * Performance: Load-aware scheduling with automatic optimization
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ParlantBackupValidationService,
  BackupSchedule,
} from './parlant-backup-validation.service';
import {
  DatabaseBackupService,
  BackupCreationRequest,
  BackupCreationResult,
} from '../database-backup.service';
import { ParlantUserContext } from '@shared/types/parlant-integration.types';
import {
  DatabaseOperationMetadata,
  RiskLevel,
} from '../parlant-validated-database.service';

// ===== SCHEDULING INTERFACES =====

/**
 * Schedule creation request
 */
export interface ScheduleCreationRequest {
  name: string;
  description: string;
  cronExpression: string;
  backupType: 'FULL' | 'INCREMENTAL' | 'PARTIAL' | 'DIFFERENTIAL';
  targetTables?: string[];
  retentionDays: number;
  maxCopies: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  approvalRequired: boolean;
  notificationSettings: NotificationSettings;
  conditions: ScheduleCondition[];
}

/**
 * Schedule optimization request
 */
export interface ScheduleOptimizationRequest {
  scheduleId: string;
  optimizationGoals: OptimizationGoal[];
  constraints: ScheduleConstraint[];
  timeWindow: TimeWindow;
}

/**
 * Optimization goal
 */
export interface OptimizationGoal {
  type:
    | 'MINIMIZE_RESOURCE_USAGE'
    | 'MAXIMIZE_RELIABILITY'
    | 'MINIMIZE_DOWNTIME'
    | 'BALANCE_LOAD';
  weight: number; // 0-1
  description: string;
}

/**
 * Schedule constraint
 */
export interface ScheduleConstraint {
  type:
    | 'TIME_WINDOW'
    | 'RESOURCE_LIMIT'
    | 'DEPENDENCY'
    | 'BUSINESS_HOUR'
    | 'MAINTENANCE_WINDOW';
  description: string;
  constraint: any;
  mandatory: boolean;
}

/**
 * Time window specification
 */
export interface TimeWindow {
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  timezone: string;
  daysOfWeek: number[]; // 0-6, Sunday=0
  excludeDates?: Date[];
}

/**
 * Schedule condition
 */
export interface ScheduleCondition {
  type:
    | 'SYSTEM_LOAD'
    | 'DISK_SPACE'
    | 'NETWORK_USAGE'
    | 'BUSINESS_HOURS'
    | 'USER_ACTIVITY';
  operator: '<' | '>' | '=' | '<=' | '>=' | '!=';
  threshold: number;
  description: string;
  enabled: boolean;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  onSuccess: boolean;
  onFailure: boolean;
  onApprovalRequired: boolean;
  recipients: NotificationRecipient[];
  channels: NotificationChannel[];
}

/**
 * Notification recipient
 */
export interface NotificationRecipient {
  userId: string;
  email: string;
  role: string;
  notificationLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Notification channel
 */
export interface NotificationChannel {
  type: 'EMAIL' | 'SMS' | 'SLACK' | 'WEBHOOK' | 'DASHBOARD';
  config: Record<string, any>;
  enabled: boolean;
}

/**
 * Schedule execution result
 */
export interface ScheduleExecutionResult {
  executionId: string;
  scheduleId: string;
  executionTime: Date;
  status: 'SUCCESS' | 'FAILURE' | 'SKIPPED' | 'CANCELLED';
  backupResult?: BackupCreationResult;
  executionDuration: number;
  conditionsEvaluated: ConditionEvaluationResult[];
  errorMessage?: string;
  nextExecutionTime?: Date;
}

/**
 * Condition evaluation result
 */
export interface ConditionEvaluationResult {
  conditionType: ScheduleCondition['type'];
  currentValue: number;
  threshold: number;
  operator: string;
  _result: boolean;
  evaluationTime: Date;
}

/**
 * Schedule conflict
 */
export interface ScheduleConflict {
  conflictId: string;
  schedules: string[]; // Schedule IDs
  conflictType:
    | 'RESOURCE_OVERLAP'
    | 'TIME_OVERLAP'
    | 'DEPENDENCY_CYCLE'
    | 'CAPACITY_LIMIT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  suggestedResolution: string[];
  autoResolvable: boolean;
}

/**
 * Schedule analytics
 */
export interface ScheduleAnalytics {
  scheduleId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  averageBackupSize: number;
  resourceUsagePattern: ResourceUsagePattern;
  optimalExecutionWindows: TimeWindow[];
  performanceRecommendations: string[];
}

/**
 * Resource usage pattern
 */
export interface ResourceUsagePattern {
  cpuUsage: number[];
  memoryUsage: number[];
  diskIOPS: number[];
  networkBandwidth: number[];
  timestamps: Date[];
}

// ===== INTELLIGENT BACKUP SCHEDULER SERVICE =====

@Injectable()
export class IntelligentBackupSchedulerService {
  private readonly logger = new Logger(IntelligentBackupSchedulerService.name);

  // Schedule management
  private readonly activeSchedules = new Map<string, BackupSchedule>();
  private readonly scheduleExecutions = new Map<
    string,
    ScheduleExecutionResult[]
  >();
  private readonly pendingApprovals = new Map<
    string,
    ScheduleCreationRequest
  >();
  private readonly scheduleConflicts = new Map<string, ScheduleConflict>();

  // Performance monitoring
  private readonly performanceMetrics = new Map<string, ScheduleAnalytics>();
  private systemLoadHistory: number[] = [];
  private resourceUsageHistory: ResourceUsagePattern[] = [];

  // Configuration
  private schedulingEnabled = true;
  private maxConcurrentBackups = 3;
  private defaultApprovalTimeoutHours = 24;

  constructor(
    private readonly configService: ConfigService,
    private readonly parlantBackupValidationService: ParlantBackupValidationService,
    private readonly backupService: DatabaseBackupService,
  ) {
    this.logger.log('Initializing Intelligent Backup Scheduler Service', {
      schedulingEnabled: this.isSchedulingEnabled(),
      maxConcurrentBackups: this.getMaxConcurrentBackups(),
      intelligentOptimization: this.isIntelligentOptimizationEnabled(),
      conversationalApproval: this.isConversationalApprovalEnabled(),
    });

    // Initialize monitoring
    this.startSystemMonitoring();
    this.startScheduleOptimization();
    this.loadPersistedSchedules();
  }

  // ===== CORE SCHEDULING METHODS =====

  /**
   * Create new backup schedule with PARLANT approval
   */
  async createSchedule(
    _request: ScheduleCreationRequest,
    userContext: ParlantUserContext,
  ): Promise<{
    scheduleId: string;
    approvalRequired: boolean;
    validationResponse?: ParlantValidationResponse;
  }> {
    const operationId = this.generateOperationId();
    const scheduleId = this.generateScheduleId();

    this.logger.log(`[${operationId}] Creating backup schedule`, {
      scheduleName: request.name,
      cronExpression: request.cronExpression,
      backupType: request.backupType,
      approvalRequired: request.approvalRequired,
      operationId,
    });

    try {
      // 1. Validate schedule parameters
      await this.validateScheduleParameters(request);

      // 2. Detect potential conflicts
      const conflicts = await this.detectScheduleConflicts(request, scheduleId);
      if (conflicts.length > 0) {
        await this.handleScheduleConflicts(conflicts, request, userContext);
      }

      // 3. Create schedule object
      const schedule: BackupSchedule = {
        scheduleId,
        name: request.name,
        cronExpression: request.cronExpression,
        backupType: request.backupType,
        enabled: false, // Disabled until approved
        approvalRequired: request.approvalRequired,
        lastExecution: undefined,
        nextExecution: this.calculateNextExecution(request.cronExpression),
      };

      // 4. If approval required, initiate PARLANT validation
      if (request.approvalRequired) {
        const validationResponse =
          await this.parlantBackupValidationService.validateBackupSchedule(
            schedule,
            userContext,
          );

        if (!validationResponse.approved) {
          this.logger.warn(`[${operationId}] Schedule approval denied`, {
            scheduleId,
            reason: validationResponse.reason,
            operationId,
          });

          return {
            scheduleId,
            approvalRequired: true,
            validationResponse,
          };
        }

        // Approved - enable schedule
        schedule.enabled = true;
        schedule.approvedBy = userContext.userId;
        schedule.approvalExpiry = new Date(
          Date.now() + this.defaultApprovalTimeoutHours * 60 * 60 * 1000,
        );
      } else {
        // No approval required - enable immediately
        schedule.enabled = true;
      }

      // 5. Store active schedule
      this.activeSchedules.set(scheduleId, schedule);

      // 6. Initialize performance tracking
      this.initializeScheduleAnalytics(scheduleId);

      // 7. Optimize schedule if intelligent optimization is enabled
      if (this.isIntelligentOptimizationEnabled()) {
        await this.optimizeScheduleAsync(scheduleId);
      }

      this.logger.log(`[${operationId}] Backup schedule created successfully`, {
        scheduleId,
        enabled: schedule.enabled,
        nextExecution: schedule.nextExecution,
        operationId,
      });

      return {
        scheduleId,
        approvalRequired: request.approvalRequired,
        validationResponse: request.approvalRequired
          ? undefined
          : ({
              approved: true,
              conversationId: `auto_approval_${operationId}`,
              reason: 'Schedule created without approval requirement',
              confidence: 1.0,
            } as ParlantValidationResponse),
      };
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to create backup schedule`, {
        _error: error instanceof Error ? error.message : String(error),
        scheduleName: request.name,
        operationId,
      });

      throw error;
    }
  }

  /**
   * Execute scheduled backup with conditions evaluation
   */
  async executeScheduledBackup(
    scheduleId: string,
    _userContext: ParlantUserContext,
  ): Promise<ScheduleExecutionResult> {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    this.logger.log(`[${executionId}] Executing scheduled backup`, {
      scheduleId,
      executionId,
    });

    try {
      // 1. Get schedule
      const schedule = this.activeSchedules.get(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      if (!schedule.enabled) {
        throw new Error(`Schedule ${scheduleId} is disabled`);
      }

      // 2. Evaluate schedule conditions
      const conditionResults = await this.evaluateScheduleConditions(schedule);
      const conditionsMet = conditionResults.every((result) => result.result);

      if (!conditionsMet) {
        this.logger.warn(
          `[${executionId}] Schedule conditions not met, skipping execution`,
          {
            scheduleId,
            failedConditions: conditionResults.filter((r) => !r.result),
            executionId,
          },
        );

        return {
          executionId,
          scheduleId,
          executionTime: new Date(),
          status: 'SKIPPED',
          executionDuration: Date.now() - startTime,
          conditionsEvaluated: conditionResults,
          nextExecutionTime: this.calculateNextExecution(
            schedule.cronExpression,
          ),
        };
      }

      // 3. Check concurrent backup limit
      const concurrentBackups = await this.getCurrentConcurrentBackups();
      if (concurrentBackups >= this.maxConcurrentBackups) {
        this.logger.warn(
          `[${executionId}] Maximum concurrent backups reached, skipping execution`,
          {
            scheduleId,
            concurrentBackups,
            maxAllowed: this.maxConcurrentBackups,
            executionId,
          },
        );

        return {
          executionId,
          scheduleId,
          executionTime: new Date(),
          status: 'SKIPPED',
          executionDuration: Date.now() - startTime,
          conditionsEvaluated: conditionResults,
          errorMessage: `Maximum concurrent backups (${this.maxConcurrentBackups}) reached`,
          nextExecutionTime: this.calculateNextExecution(
            schedule.cronExpression,
          ),
        };
      }

      // 4. Create backup request
      const backupRequest = this.createBackupRequestFromSchedule(schedule);

      // 5. Execute backup
      const backupResult =
        await this.backupService.createPreOperationBackup(backupRequest);

      // 6. Update schedule execution time
      schedule.lastExecution = new Date();
      schedule.nextExecution = this.calculateNextExecution(
        schedule.cronExpression,
      );

      const executionResult: ScheduleExecutionResult = {
        executionId,
        scheduleId,
        executionTime: new Date(),
        status: 'SUCCESS',
        backupResult,
        executionDuration: Date.now() - startTime,
        conditionsEvaluated: conditionResults,
        nextExecutionTime: schedule.nextExecution,
      };

      // 7. Record execution
      this.recordScheduleExecution(scheduleId, executionResult);

      // 8. Update performance metrics
      this.updateScheduleAnalytics(scheduleId, executionResult);

      this.logger.log(
        `[${executionId}] Scheduled backup completed successfully`,
        {
          scheduleId,
          backupId: backupResult.backupId,
          backupSize: backupResult.backupSize,
          executionDuration: executionResult.executionDuration,
          nextExecution: schedule.nextExecution,
          executionId,
        },
      );

      return executionResult;
    } catch (error) {
      const executionResult: ScheduleExecutionResult = {
        executionId,
        scheduleId,
        executionTime: new Date(),
        status: 'FAILURE',
        executionDuration: Date.now() - startTime,
        conditionsEvaluated: [],
        errorMessage: error instanceof Error ? error.message : String(error),
        nextExecutionTime: this.calculateNextExecution(
          this.activeSchedules.get(scheduleId)?.cronExpression || '0 0 * * *',
        ),
      };

      // Record failed execution
      this.recordScheduleExecution(scheduleId, executionResult);

      this.logger.error(`[${executionId}] Scheduled backup failed`, {
        scheduleId,
        _error: executionResult.errorMessage,
        executionDuration: executionResult.executionDuration,
        executionId,
      });

      return executionResult;
    }
  }

  /**
   * Optimize schedule based on system performance patterns
   */
  async optimizeSchedule(
    _request: ScheduleOptimizationRequest,
    userContext: ParlantUserContext,
  ): Promise<{
    optimizedSchedule: BackupSchedule;
    improvements: string[];
    validationResponse: ParlantValidationResponse;
  }> {
    const operationId = this.generateOperationId();

    this.logger.log(`[${operationId}] Optimizing backup schedule`, {
      scheduleId: request.scheduleId,
      optimizationGoals: request.optimizationGoals.map((g) => g.type),
      operationId,
    });

    try {
      // 1. Get current schedule
      const currentSchedule = this.activeSchedules.get(request.scheduleId);
      if (!currentSchedule) {
        throw new Error(`Schedule ${request.scheduleId} not found`);
      }

      // 2. Analyze current performance
      const analytics = this.performanceMetrics.get(request.scheduleId);
      if (!analytics) {
        throw new Error(
          `No performance data available for schedule ${request.scheduleId}`,
        );
      }

      // 3. Generate optimization recommendations
      const optimizationAnalysis = await this.analyzeOptimizationOpportunities(
        currentSchedule,
        analytics,
        request,
      );

      // 4. Create optimized schedule
      const optimizedSchedule = await this.createOptimizedSchedule(
        currentSchedule,
        optimizationAnalysis,
        request,
      );

      // 5. Validate optimization with PARLANT
      const validationResponse =
        await this.parlantBackupValidationService.validateBackupSchedule(
          optimizedSchedule,
          userContext,
        );

      if (!validationResponse.approved) {
        this.logger.warn(
          `[${operationId}] Schedule optimization not approved`,
          {
            scheduleId: request.scheduleId,
            reason: validationResponse.reason,
            operationId,
          },
        );

        return {
          optimizedSchedule: currentSchedule,
          improvements: [],
          validationResponse,
        };
      }

      // 6. Apply optimization
      this.activeSchedules.set(request.scheduleId, optimizedSchedule);

      this.logger.log(`[${operationId}] Schedule optimization completed`, {
        scheduleId: request.scheduleId,
        improvements: optimizationAnalysis.improvements,
        newCronExpression: optimizedSchedule.cronExpression,
        operationId,
      });

      return {
        optimizedSchedule,
        improvements: optimizationAnalysis.improvements,
        validationResponse,
      };
    } catch (error) {
      this.logger.error(`[${operationId}] Schedule optimization failed`, {
        scheduleId: request.scheduleId,
        _error: error instanceof Error ? error.message : String(error),
        operationId,
      });

      throw error;
    }
  }

  // ===== AUTOMATIC SCHEDULING =====

  /**
   * Automatically execute scheduled backups (runs every minute)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async executeScheduledBackups(): Promise<void> {
    if (!this.schedulingEnabled) return;

    const now = new Date();
    const activeSchedulesToExecute: BackupSchedule[] = [];

    // Find schedules due for execution
    for (const schedule of this.activeSchedules.values()) {
      if (
        schedule.enabled &&
        schedule.nextExecution &&
        schedule.nextExecution <= now
      ) {
        activeSchedulesToExecute.push(schedule);
      }
    }

    if (activeSchedulesToExecute.length === 0) {
      return;
    }

    this.logger.log(
      `Executing ${activeSchedulesToExecute.length} scheduled backup(s)`,
      {
        schedules: activeSchedulesToExecute.map((s) => ({
          id: s.scheduleId,
          name: s.name,
          nextExecution: s.nextExecution,
        })),
      },
    );

    // Execute schedules in priority order
    const sortedSchedules = this.sortSchedulesByPriority(
      activeSchedulesToExecute,
    );

    for (const schedule of sortedSchedules) {
      try {
        const systemUserContext: ParlantUserContext = {
          userId: 'system',
          sessionId: 'scheduled_backup',
          userRole: 'system',
          permissions: ['backup:execute'],
        };

        await this.executeScheduledBackup(
          schedule.scheduleId,
          systemUserContext,
        );
      } catch (error) {
        this.logger.error(`Failed to execute scheduled backup`, {
          scheduleId: schedule.scheduleId,
          scheduleName: schedule.name,
          _error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Optimize all schedules (runs every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async performAutomaticOptimization(): Promise<void> {
    if (!this.isIntelligentOptimizationEnabled()) return;

    this.logger.log('Performing automatic schedule optimization');

    for (const scheduleId of this.activeSchedules.keys()) {
      try {
        await this.optimizeScheduleAsync(scheduleId);
      } catch (error) {
        this.logger.error(`Failed to optimize schedule ${scheduleId}`, {
          _error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // ===== CONDITION EVALUATION =====

  /**
   * Evaluate all conditions for a schedule
   */
  private async evaluateScheduleConditions(
    _schedule: BackupSchedule,
  ): Promise<ConditionEvaluationResult[]> {
    const results: ConditionEvaluationResult[] = [];

    // Get current system metrics
    const systemMetrics = await this.getCurrentSystemMetrics();

    // Mock schedule conditions (in production, these would be stored with the schedule)
    const defaultConditions: ScheduleCondition[] = [
      {
        type: 'SYSTEM_LOAD',
        operator: '<',
        threshold: 80,
        description: 'System CPU usage below 80%',
        enabled: true,
      },
      {
        type: 'DISK_SPACE',
        operator: '>',
        threshold: 20,
        description: 'Available disk space above 20%',
        enabled: true,
      },
    ];

    for (const condition of defaultConditions) {
      if (!condition.enabled) continue;

      let currentValue: number;
      switch (condition.type) {
        case 'SYSTEM_LOAD':
          currentValue = systemMetrics.cpuUsage;
          break;
        case 'DISK_SPACE':
          currentValue = systemMetrics.diskSpacePercent;
          break;
        case 'NETWORK_USAGE':
          currentValue = systemMetrics.networkUsage;
          break;
        case 'USER_ACTIVITY':
          currentValue = systemMetrics.activeUsers;
          break;
        default:
          currentValue = 0;
      }

      const result = this.evaluateCondition(
        currentValue,
        condition.operator,
        condition.threshold,
      );

      results.push({
        conditionType: condition.type,
        currentValue,
        threshold: condition.threshold,
        operator: condition.operator,
        result,
        evaluationTime: new Date(),
      });
    }

    return results;
  }

  /**
   * Evaluate individual condition
   */
  private evaluateCondition(
    currentValue: number,
    operator: string,
    threshold: number,
  ): boolean {
    switch (operator) {
      case '<':
        return currentValue < threshold;
      case '>':
        return currentValue > threshold;
      case '=':
        return currentValue === threshold;
      case '<=':
        return currentValue <= threshold;
      case '>=':
        return currentValue >= threshold;
      case '!=':
        return currentValue !== threshold;
      default:
        return false;
    }
  }

  // ===== CONFLICT DETECTION AND RESOLUTION =====

  /**
   * Detect potential schedule conflicts
   */
  private async detectScheduleConflicts(
    _request: ScheduleCreationRequest,
    scheduleId: string,
  ): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];

    // Check for time overlaps with existing schedules
    const requestExecutionTimes = this.generateExecutionTimes(
      request.cronExpression,
      24,
    ); // Next 24 hours

    for (const existingSchedule of this.activeSchedules.values()) {
      const existingExecutionTimes = this.generateExecutionTimes(
        existingSchedule.cronExpression,
        24,
      );

      // Check for time overlaps
      const overlappingTimes = requestExecutionTimes.filter((time) =>
        existingExecutionTimes.some(
          (existingTime) =>
            Math.abs(time.getTime() - existingTime.getTime()) < 300000, // 5 minutes
        ),
      );

      if (overlappingTimes.length > 0) {
        conflicts.push({
          conflictId: `time_overlap_${Date.now()}`,
          schedules: [scheduleId, existingSchedule.scheduleId],
          conflictType: 'TIME_OVERLAP',
          severity: 'MEDIUM',
          description: `Schedule overlaps with "${existingSchedule.name}" at ${overlappingTimes.length} time(s)`,
          suggestedResolution: [
            'Adjust cron expression to avoid overlap',
            'Stagger execution times by 5+ minutes',
            'Consider different backup types (incremental vs full)',
          ],
          autoResolvable: true,
        });
      }
    }

    // Check for resource capacity limits
    if (this.activeSchedules.size >= this.getMaxSchedules()) {
      conflicts.push({
        conflictId: `capacity_limit_${Date.now()}`,
        schedules: [scheduleId],
        conflictType: 'CAPACITY_LIMIT',
        severity: 'HIGH',
        description: `Maximum number of schedules (${this.getMaxSchedules()}) reached`,
        suggestedResolution: [
          'Remove unused schedules',
          'Combine similar schedules',
          'Increase schedule capacity limit',
        ],
        autoResolvable: false,
      });
    }

    return conflicts;
  }

  /**
   * Handle schedule conflicts
   */
  private async handleScheduleConflicts(
    conflicts: ScheduleConflict[],
    _request: ScheduleCreationRequest,
    _userContext: ParlantUserContext,
  ): Promise<void> {
    for (const conflict of conflicts) {
      this.scheduleConflicts.set(conflict.conflictId, conflict);

      this.logger.warn('Schedule conflict detected', {
        conflictId: conflict.conflictId,
        conflictType: conflict.conflictType,
        severity: conflict.severity,
        description: conflict.description,
      });

      // Auto-resolve if possible
      if (conflict.autoResolvable && conflict.conflictType === 'TIME_OVERLAP') {
        await this.autoResolveTimeOverlap(conflict, request);
      }
    }
  }

  /**
   * Auto-resolve time overlap conflicts
   */
  private async autoResolveTimeOverlap(
    conflict: ScheduleConflict,
    _request: ScheduleCreationRequest,
  ): Promise<void> {
    // Simple resolution: add 5 minutes offset to the new schedule
    const originalCron = request.cronExpression;
    const adjustedCron = this.adjustCronExpression(originalCron, 5); // Add 5 minutes

    this.logger.log('Auto-resolving time overlap conflict', {
      conflictId: conflict.conflictId,
      originalCron,
      adjustedCron,
    });

    // Update the request with the adjusted cron expression
    request.cronExpression = adjustedCron;
  }

  // ===== PERFORMANCE MONITORING AND OPTIMIZATION =====

  /**
   * Start system monitoring
   */
  private startSystemMonitoring(): void {
    // Monitor system metrics every 5 minutes
    setInterval(async () => {
      try {
        const metrics = await this.getCurrentSystemMetrics();
        this.systemLoadHistory.push(metrics.cpuUsage);

        // Keep only last 24 hours of data (288 data points at 5-minute intervals)
        if (this.systemLoadHistory.length > 288) {
          this.systemLoadHistory = this.systemLoadHistory.slice(-288);
        }

        this.resourceUsageHistory.push({
          cpuUsage: [metrics.cpuUsage],
          memoryUsage: [metrics.memoryUsage],
          diskIOPS: [metrics.diskIOPS],
          networkBandwidth: [metrics.networkUsage],
          timestamps: [new Date()],
        });

        // Keep only last 24 hours of resource data
        if (this.resourceUsageHistory.length > 288) {
          this.resourceUsageHistory = this.resourceUsageHistory.slice(-288);
        }
      } catch (error) {
        this.logger.error('Failed to collect system metrics', {
          _error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 300000); // 5 minutes
  }

  /**
   * Start schedule optimization
   */
  private startScheduleOptimization(): void {
    // Run optimization analysis every hour
    setInterval(async () => {
      if (!this.isIntelligentOptimizationEnabled()) return;

      try {
        await this.performOptimizationAnalysis();
      } catch (error) {
        this.logger.error('Failed to perform optimization analysis', {
          _error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 3600000); // 1 hour
  }

  /**
   * Perform optimization analysis
   */
  private async performOptimizationAnalysis(): Promise<void> {
    const optimizationOpportunities: string[] = [];

    // Analyze system load patterns
    if (this.systemLoadHistory.length >= 48) {
      // At least 4 hours of data
      // Calculate average load for analysis (future use)
      // this.systemLoadHistory.reduce((sum, load) => sum + load, 0) / this.systemLoadHistory.length;
      const lowLoadPeriods = this.identifyLowLoadPeriods();

      if (lowLoadPeriods.length > 0) {
        optimizationOpportunities.push(
          `Identified ${lowLoadPeriods.length} low-load periods for backup optimization`,
        );
      }

      // Check if schedules are running during high-load periods
      for (const schedule of this.activeSchedules.values()) {
        if (schedule.nextExecution) {
          const executionHour = schedule.nextExecution.getHours();
          const isHighLoadPeriod = this.isHighLoadPeriod(executionHour);

          if (isHighLoadPeriod) {
            optimizationOpportunities.push(
              `Schedule "${schedule.name}" executing during high-load period (${executionHour}:00)`,
            );
          }
        }
      }
    }

    if (optimizationOpportunities.length > 0) {
      this.logger.log('Optimization opportunities identified', {
        opportunities: optimizationOpportunities,
        totalSchedules: this.activeSchedules.size,
      });
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Validate schedule parameters
   */
  private async validateScheduleParameters(
    _request: ScheduleCreationRequest,
  ): Promise<void> {
    // Validate cron expression
    if (!this.isValidCronExpression(request.cronExpression)) {
      throw new Error(`Invalid cron expression: ${request.cronExpression}`);
    }

    // Validate backup type
    const validBackupTypes = ['FULL', 'INCREMENTAL', 'PARTIAL', 'DIFFERENTIAL'];
    if (!validBackupTypes.includes(request.backupType)) {
      throw new Error(`Invalid backup type: ${request.backupType}`);
    }

    // Validate retention settings
    if (request.retentionDays < 1 || request.retentionDays > 3650) {
      // 1 day to 10 years
      throw new Error(`Invalid retention days: ${request.retentionDays}`);
    }

    if (request.maxCopies < 1 || request.maxCopies > 100) {
      throw new Error(`Invalid max copies: ${request.maxCopies}`);
    }
  }

  /**
   * Calculate next execution time from cron expression
   */
  private calculateNextExecution(_cronExpression: string): Date {
    // Simplified implementation - in production, use a proper cron parser
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    return nextHour;
  }

  /**
   * Generate execution times for a cron expression
   */
  private generateExecutionTimes(
    _cronExpression: string,
    hours: number,
  ): Date[] {
    const times: Date[] = [];
    const startTime = new Date();

    // Simplified implementation - generate hourly executions
    for (let i = 0; i < hours; i++) {
      times.push(new Date(startTime.getTime() + i * 60 * 60 * 1000));
    }

    return times;
  }

  /**
   * Create backup request from schedule
   */
  private createBackupRequestFromSchedule(
    schedule: BackupSchedule,
  ): BackupCreationRequest {
    const operationMetadata: DatabaseOperationMetadata = {
      operationType: 'WRITE',
      queryDescription: `Scheduled ${schedule.backupType} backup: ${schedule.name}`,
      isDestructive: false,
      requiresBackup: false,
    };

    return {
      operationMetadata,
      riskLevel: this.determineScheduleRiskLevel(schedule),
      requestingUserId: 'system',
      backupReason: `Scheduled backup execution: ${schedule.name}`,
    };
  }

  /**
   * Determine risk level for scheduled backup
   */
  private determineScheduleRiskLevel(schedule: BackupSchedule): RiskLevel {
    switch (schedule.backupType) {
      case 'FULL':
        return RiskLevel.MEDIUM;
      case 'PARTIAL':
        return RiskLevel.LOW;
      case 'INCREMENTAL':
        return RiskLevel.LOW;
      case 'DIFFERENTIAL':
        return RiskLevel.LOW;
      default:
        return RiskLevel.MEDIUM;
    }
  }

  /**
   * Get current system metrics
   */
  private async getCurrentSystemMetrics(): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    diskSpacePercent: number;
    diskIOPS: number;
    networkUsage: number;
    activeUsers: number;
  }> {
    // Mock implementation - in production, get real system metrics
    return {
      cpuUsage: Math.floor(Math.random() * 100),
      memoryUsage: Math.floor(Math.random() * 100),
      diskSpacePercent: 70 + Math.floor(Math.random() * 20), // 70-90%
      diskIOPS: Math.floor(Math.random() * 1000),
      networkUsage: Math.floor(Math.random() * 100),
      activeUsers: Math.floor(Math.random() * 50),
    };
  }

  /**
   * Get current number of concurrent backups
   */
  private async getCurrentConcurrentBackups(): Promise<number> {
    const activeBackups = this.backupService.getActiveBackupOperations();
    return activeBackups.length;
  }

  /**
   * Initialize schedule analytics
   */
  private initializeScheduleAnalytics(scheduleId: string): void {
    this.performanceMetrics.set(scheduleId, {
      scheduleId,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      averageBackupSize: 0,
      resourceUsagePattern: {
        cpuUsage: [],
        memoryUsage: [],
        diskIOPS: [],
        networkBandwidth: [],
        timestamps: [],
      },
      optimalExecutionWindows: [],
      performanceRecommendations: [],
    });
  }

  /**
   * Update schedule analytics
   */
  private updateScheduleAnalytics(
    scheduleId: string,
    _result: ScheduleExecutionResult,
  ): void {
    const analytics = this.performanceMetrics.get(scheduleId);
    if (!analytics) return;

    analytics.totalExecutions++;

    if (result.status === 'SUCCESS') {
      analytics.successfulExecutions++;

      if (result.backupResult) {
        const newAvgTime =
          (analytics.averageExecutionTime *
            (analytics.successfulExecutions - 1) +
            result.executionDuration) /
          analytics.successfulExecutions;

        const newAvgSize =
          (analytics.averageBackupSize * (analytics.successfulExecutions - 1) +
            result.backupResult.backupSize) /
          analytics.successfulExecutions;

        analytics.averageExecutionTime = newAvgTime;
        analytics.averageBackupSize = newAvgSize;
      }
    } else {
      analytics.failedExecutions++;
    }

    this.performanceMetrics.set(scheduleId, analytics);
  }

  /**
   * Record schedule execution
   */
  private recordScheduleExecution(
    scheduleId: string,
    _result: ScheduleExecutionResult,
  ): void {
    const executions = this.scheduleExecutions.get(scheduleId) || [];
    executions.push(result);

    // Keep only last 100 executions
    if (executions.length > 100) {
      executions.splice(0, executions.length - 100);
    }

    this.scheduleExecutions.set(scheduleId, executions);
  }

  /**
   * Sort schedules by priority
   */
  private sortSchedulesByPriority(
    schedules: BackupSchedule[],
  ): BackupSchedule[] {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

    return schedules.sort((_a, _b) => {
      // Mock priority - in production, this would be stored with schedule
      const aPriority = priorityOrder['MEDIUM'] || 2;
      const bPriority = priorityOrder['MEDIUM'] || 2;
      return aPriority - bPriority;
    });
  }

  /**
   * Identify low load periods
   */
  private identifyLowLoadPeriods(): TimeWindow[] {
    // Mock implementation - analyze historical data to find low-load periods
    return [
      {
        startTime: '02:00',
        endTime: '06:00',
        timezone: 'UTC',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
      },
    ];
  }

  /**
   * Check if hour is a high-load period
   */
  private isHighLoadPeriod(hour: number): boolean {
    // Business hours (9 AM - 5 PM) are typically high-load
    return hour >= 9 && hour <= 17;
  }

  /**
   * Check if cron expression is valid
   */
  private isValidCronExpression(cronExpression: string): boolean {
    // Simplified validation - in production, use a proper cron validator
    const parts = cronExpression.split(' ');
    return parts.length === 5;
  }

  /**
   * Adjust cron expression by adding minutes
   */
  private adjustCronExpression(
    cronExpression: string,
    minutesToAdd: number,
  ): string {
    // Simplified implementation - in production, use proper cron manipulation
    const parts = cronExpression.split(' ');
    if (parts.length === 5) {
      const currentMinute = parseInt(parts[0]) || 0;
      const newMinute = (currentMinute + minutesToAdd) % 60;
      parts[0] = newMinute.toString();
      return parts.join(' ');
    }
    return cronExpression;
  }

  // Configuration helpers
  private isSchedulingEnabled(): boolean {
    return this.configService.get<boolean>('BACKUP_SCHEDULING_ENABLED', true);
  }

  private getMaxConcurrentBackups(): number {
    return this.configService.get<number>('MAX_CONCURRENT_BACKUPS', 3);
  }

  private getMaxSchedules(): number {
    return this.configService.get<number>('MAX_BACKUP_SCHEDULES', 50);
  }

  private isIntelligentOptimizationEnabled(): boolean {
    return this.configService.get<boolean>(
      'INTELLIGENT_OPTIMIZATION_ENABLED',
      true,
    );
  }

  private isConversationalApprovalEnabled(): boolean {
    return this.configService.get<boolean>(
      'CONVERSATIONAL_APPROVAL_ENABLED',
      true,
    );
  }

  private generateOperationId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateScheduleId(): string {
    return `sched_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Placeholder methods for optimization logic
  private async optimizeScheduleAsync(scheduleId: string): Promise<void> {
    // Placeholder for async schedule optimization
    this.logger.debug(`Optimizing schedule ${scheduleId} asynchronously`);
  }

  private async analyzeOptimizationOpportunities(
    _schedule: BackupSchedule,
    _analytics: ScheduleAnalytics,
    _request: ScheduleOptimizationRequest,
  ): Promise<{ improvements: string[] }> {
    // Mock optimization analysis
    return {
      improvements: [
        'Adjusted execution time to low-load period',
        'Optimized backup type based on usage patterns',
        'Reduced resource conflicts with other schedules',
      ],
    };
  }

  private async createOptimizedSchedule(
    currentSchedule: BackupSchedule,
    _analysis: { improvements: string[] },
    _request: ScheduleOptimizationRequest,
  ): Promise<BackupSchedule> {
    // Return optimized schedule (mock implementation)
    return {
      ...currentSchedule,
      cronExpression: this.adjustCronExpression(
        currentSchedule.cronExpression,
        -30,
      ), // Move 30 minutes earlier
    };
  }

  private loadPersistedSchedules(): void {
    // Load schedules from persistent storage (placeholder)
    this.logger.debug('Loading persisted backup schedules');
  }

  // ===== PUBLIC API METHODS =====

  /**
   * Get all active schedules
   */
  getActiveSchedules(): BackupSchedule[] {
    return Array.from(this.activeSchedules.values());
  }

  /**
   * Get schedule by ID
   */
  getSchedule(scheduleId: string): BackupSchedule | undefined {
    return this.activeSchedules.get(scheduleId);
  }

  /**
   * Get schedule execution history
   */
  getScheduleExecutions(scheduleId: string): ScheduleExecutionResult[] {
    return this.scheduleExecutions.get(scheduleId) || [];
  }

  /**
   * Get schedule analytics
   */
  getScheduleAnalytics(scheduleId: string): ScheduleAnalytics | undefined {
    return this.performanceMetrics.get(scheduleId);
  }

  /**
   * Get active conflicts
   */
  getActiveConflicts(): ScheduleConflict[] {
    return Array.from(this.scheduleConflicts.values());
  }

  /**
   * Enable/disable schedule
   */
  async setScheduleEnabled(
    scheduleId: string,
    enabled: boolean,
  ): Promise<boolean> {
    const schedule = this.activeSchedules.get(scheduleId);
    if (!schedule) return false;

    schedule.enabled = enabled;
    this.activeSchedules.set(scheduleId, schedule);

    this.logger.log(`Schedule ${enabled ? 'enabled' : 'disabled'}`, {
      scheduleId,
      scheduleName: schedule.name,
    });

    return true;
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(scheduleId: string): Promise<boolean> {
    const schedule = this.activeSchedules.get(scheduleId);
    if (!schedule) return false;

    this.activeSchedules.delete(scheduleId);
    this.scheduleExecutions.delete(scheduleId);
    this.performanceMetrics.delete(scheduleId);

    this.logger.log(`Schedule deleted`, {
      scheduleId,
      scheduleName: schedule.name,
    });

    return true;
  }

  /**
   * Get scheduler statistics
   */
  getSchedulerStatistics() {
    const totalExecutions = Array.from(this.scheduleExecutions.values()).reduce(
      (sum, executions) => sum + executions.length,
      0,
    );

    const successfulExecutions = Array.from(
      this.scheduleExecutions.values(),
    ).reduce(
      (sum, executions) =>
        sum + executions.filter((e) => e.status === 'SUCCESS').length,
      0,
    );

    return {
      totalSchedules: this.activeSchedules.size,
      enabledSchedules: Array.from(this.activeSchedules.values()).filter(
        (s) => s.enabled,
      ).length,
      totalExecutions,
      successfulExecutions,
      successRate:
        totalExecutions > 0
          ? `${((successfulExecutions / totalExecutions) * 100).toFixed(2)}%`
          : '0%',
      activeConflicts: this.scheduleConflicts.size,
      systemLoadHistory: this.systemLoadHistory.length,
      schedulingEnabled: this.schedulingEnabled,
    };
  }
}
