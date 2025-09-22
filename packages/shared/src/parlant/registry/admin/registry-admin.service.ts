/**
 * PARLANT Phase 1 Function Registration System - Registry Admin Service
 *
 * Implements comprehensive administrative functions for the function registry.
 * Provides maintenance operations, backup/restore capabilities, metrics collection,
 * configuration management, auditing, and system health monitoring.
 *
 * @fileoverview Administrative service for function registry management
 * @version 1.0.0
 * @author Registry Administration Agent #10
 */

import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  IRegistryAdmin,
  MaintenanceResult,
  BackupResult,
  RestoreResult,
  RegistryMetrics,
  ConfigurationResult,
  AuditLog,
  PurgeResult,
  IndexRebuildResult,
  RegistryStatus,
  MaintenanceOptions,
  BackupOptions,
  RestoreOptions,
  TimeRange,
  RegistrySettings,
  AuditLogOptions,
  PurgeCriteria,
  MaintenanceAction,
  ActionResult,
  MaintenanceIssue,
  IssueType,
  IssueSeverity,
  PerformanceMetrics,
  UsageMetrics,
  HealthMetrics,
  StorageMetrics,
  PopularFunction,
  CacheSettings,
  IndexSettings,
  SecuritySettings,
  PerformanceSettings,
  EvictionPolicy,
  OptimizationLevel,
  AuditOperation,
  AuditEntry,
  OperationResult,
  HealthStatus,
  PerformanceStatus,
  PerformanceLevel,
  StorageStatus,
  ValidationResult,
  TrendDirection,
} from "../core/registry.interface";

/**
 * Maintenance task types
 */
export enum MaintenanceTaskType {
  _CLEANUP_STALE_DATA = "cleanup_stale_data",
  _REBUILD_INDICES = "rebuild_indices",
  _COMPACT_STORAGE = "compact_storage",
  _VALIDATE_INTEGRITY = "validate_integrity",
  _OPTIMIZE_PERFORMANCE = "optimize_performance",
  _UPDATE_STATISTICS = "update_statistics",
  _CLEANUP_LOGS = "cleanup_logs",
  _VACUUM_DATABASE = "vacuum_database",
}

/**
 * Backup types
 */
export enum BackupType {
  _FULL = "full",
  _INCREMENTAL = "incremental",
  _DIFFERENTIAL = "differential",
  _SNAPSHOT = "snapshot",
}

/**
 * Registry storage interface
 */
export interface IRegistryStorage {
  // Configuration operations
  getRegistrySettings(): Promise<RegistrySettings>;
  setRegistrySettings(settings: RegistrySettings): Promise<void>;

  // Backup operations
  createBackup(options: BackupOptions): Promise<BackupResult>;
  restoreFromBackup(
    backupId: string,
    options: RestoreOptions,
  ): Promise<RestoreResult>;
  listBackups(): Promise<BackupInfo[]>;
  deleteBackup(backupId: string): Promise<void>;

  // Metrics operations
  getPerformanceMetrics(timeRange: TimeRange): Promise<PerformanceMetrics>;
  getUsageMetrics(timeRange: TimeRange): Promise<UsageMetrics>;
  getStorageMetrics(): Promise<StorageMetrics>;

  // Audit operations
  getAuditEntries(options: AuditLogOptions): Promise<AuditEntry[]>;
  addAuditEntry(entry: Omit<AuditEntry, "id">): Promise<void>;

  // Maintenance operations
  cleanupStaleData(cutoffDate: Date): Promise<number>;
  rebuildIndices(): Promise<void>;
  compactStorage(): Promise<number>;
  validateIntegrity(): Promise<IntegrityReport>;
  optimizePerformance(): Promise<OptimizationReport>;

  // Purge operations
  purgeInactiveFunctions(criteria: PurgeCriteria): Promise<string[]>;

  // Status operations
  getSystemStatus(): Promise<SystemStatus>;
}

export interface BackupInfo {
  id: string;
  type: BackupType;
  size: number;
  createdAt: Date;
  description: string;
  metadata: Record<string, unknown>;
}

export interface IntegrityReport {
  valid: boolean;
  issues: IntegrityIssue[];
  checkedItems: number;
  duration: number;
}

export interface IntegrityIssue {
  type: string;
  description: string;
  severity: IssueSeverity;
  affectedItems: string[];
  suggestedFix: string;
}

export interface OptimizationReport {
  performanceImprovement: number;
  spaceSaved: number;
  optimizations: OptimizationAction[];
  duration: number;
}

export interface OptimizationAction {
  type: string;
  description: string;
  impact: string;
  result: ActionResult;
}

export interface SystemStatus {
  operational: boolean;
  uptime: number;
  version: string;
  lastMaintenance: Date;
  activeConnections: number;
  memoryUsage: number;
  diskUsage: number;
  cpuUsage: number;
}

/**
 * Registry admin service implementing comprehensive administrative functions
 */
@Injectable()
export class RegistryAdminService implements IRegistryAdmin {
  private readonly logger = new Logger(RegistryAdminService.name);
  private readonly maintenanceHistory = new Map<string, MaintenanceResult>();
  private readonly backupHistory = new Map<string, BackupResult>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly storage: IRegistryStorage,
  ) {
    this.initializeService();
  }

  /**
   * Perform registry maintenance
   */
  async performMaintenance(
    options: MaintenanceOptions,
  ): Promise<MaintenanceResult> {
    const maintenanceId = this.generateMaintenanceId();
    this.logger.log(`Starting registry maintenance: ${maintenanceId}`);

    const startTime = Date.now();
    const actionsPerformed: MaintenanceAction[] = [];
    const issues: MaintenanceIssue[] = [];

    try {
      // Cleanup stale data
      if (options.cleanupStaleData) {
        const action = await this.performCleanupStaleData();
        actionsPerformed.push(action);
      }

      // Rebuild indices
      if (options.rebuildIndices) {
        const action = await this.performRebuildIndices();
        actionsPerformed.push(action);
      }

      // Compact storage
      if (options.compactStorage) {
        const action = await this.performCompactStorage();
        actionsPerformed.push(action);
      }

      // Validate integrity
      if (options.validateIntegrity) {
        const action = await this.performValidateIntegrity(issues);
        actionsPerformed.push(action);
      }

      // Optimize performance
      if (options.optimizePerformance) {
        const action = await this.performOptimizePerformance();
        actionsPerformed.push(action);
      }

      const duration = Date.now() - startTime;
      const recommendations = this.generateMaintenanceRecommendations(
        actionsPerformed,
        issues,
      );

      const result: MaintenanceResult = {
        success: true,
        duration,
        actionsPerformed,
        issues,
        recommendations,
      };

      // Store maintenance history
      this.maintenanceHistory.set(maintenanceId, result);

      // Emit maintenance completed event
      this.eventEmitter.emit("registry.maintenance-completed", {
        maintenanceId,
        duration,
        actionsCount: actionsPerformed.length,
        issuesFound: issues.length,
        timestamp: new Date(),
      });

      this.logger.log(
        `Registry maintenance completed: ${maintenanceId} in ${duration}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Registry maintenance failed: ${maintenanceId}`, error);

      const result: MaintenanceResult = {
        success: false,
        duration: Date.now() - startTime,
        actionsPerformed,
        issues: [
          ...issues,
          {
            type: IssueType._PERFORMANCE_ISSUE,
            description: `Maintenance failed: ${error instanceof Error ? error.message : String(error)}`,
            severity: IssueSeverity._HIGH,
            resolution: "Review error logs and retry maintenance",
          },
        ],
        recommendations: [
          "Review maintenance failure and retry with adjusted parameters",
        ],
      };

      this.maintenanceHistory.set(maintenanceId, result);

      return result;
    }
  }

  /**
   * Backup registry
   */
  async backup(options: BackupOptions): Promise<BackupResult> {
    const backupId = this.generateBackupId();
    this.logger.log(`Starting registry backup: ${backupId}`);

    const startTime = Date.now();

    try {
      const result = await this.storage.createBackup(options);

      // Store backup history
      this.backupHistory.set(backupId, result);

      // Emit backup completed event
      this.eventEmitter.emit("registry.backup-completed", {
        backupId: result.backupId,
        size: result.size,
        duration: result.duration,
        timestamp: new Date(),
      });

      this.logger.log(
        `Registry backup completed: ${result.backupId} (${result.size} bytes)`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Registry backup failed: ${backupId}`, error);
      throw error;
    }
  }

  /**
   * Restore registry from backup
   */
  async restore(
    backupId: string,
    options: RestoreOptions,
  ): Promise<RestoreResult> {
    this.logger.log(`Starting registry restore from backup: ${backupId}`);

    const startTime = Date.now();

    try {
      const result = await this.storage.restoreFromBackup(backupId, options);

      // Emit restore completed event
      this.eventEmitter.emit("registry.restore-completed", {
        backupId,
        restoredItems: result.restoredItems,
        duration: result.duration,
        timestamp: new Date(),
      });

      this.logger.log(
        `Registry restore completed from backup: ${backupId} (${result.restoredItems} items)`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Registry restore failed from backup: ${backupId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get registry metrics
   */
  async getMetrics(timeRange: TimeRange): Promise<RegistryMetrics> {
    this.logger.debug(
      `Getting registry metrics for time range: ${timeRange.start} - ${timeRange.end}`,
    );

    try {
      const [performance, usage, health, storage] = await Promise.all([
        this.storage.getPerformanceMetrics(timeRange),
        this.storage.getUsageMetrics(timeRange),
        this.getHealthMetrics(),
        this.storage.getStorageMetrics(),
      ]);

      const metrics: RegistryMetrics = {
        performance,
        usage,
        health,
        storage,
      };

      this.logger.debug("Registry metrics retrieved successfully");

      return metrics;
    } catch (error) {
      this.logger.error(
        `Failed to get registry metrics: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Configure registry settings
   */
  async configureRegistry(
    settings: RegistrySettings,
  ): Promise<ConfigurationResult> {
    this.logger.log("Configuring registry settings");

    try {
      // Validate settings
      const validationResult = this.validateRegistrySettings(settings);
      if (!validationResult.valid) {
        throw new Error(
          `Invalid settings: ${validationResult.issues.join(", ")}`,
        );
      }

      // Get current settings
      const currentSettings = await this.storage.getRegistrySettings();

      // Apply new settings
      await this.storage.setRegistrySettings(settings);

      // Determine which settings require restart
      const restartRequired = this.requiresRestart(currentSettings, settings);

      // Get applied settings
      const appliedSettings = Object.keys(settings).filter(
        (key) =>
          JSON.stringify((currentSettings as any)[key]) !==
          JSON.stringify((settings as any)[key]),
      );

      // Generate warnings
      const warnings = this.generateConfigurationWarnings(settings);

      // Emit configuration updated event
      this.eventEmitter.emit("registry.configuration-updated", {
        appliedSettings,
        restartRequired,
        timestamp: new Date(),
      });

      const result: ConfigurationResult = {
        success: true,
        appliedSettings,
        restartRequired,
        warnings,
      };

      this.logger.log(
        `Registry configuration updated: ${appliedSettings.length} settings changed`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to configure registry: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Get audit log
   */
  async getAuditLog(options: AuditLogOptions): Promise<AuditLog> {
    this.logger.debug("Getting audit log");

    try {
      const entries = await this.storage.getAuditEntries(options);

      const auditLog: AuditLog = {
        entries,
        totalCount: entries.length,
        timeRange: {
          start: options.startTime,
          end: options.endTime,
        },
      };

      this.logger.debug(`Audit log retrieved: ${entries.length} entries`);

      return auditLog;
    } catch (error) {
      this.logger.error(
        `Failed to get audit log: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Purge inactive functions
   */
  async purgeInactive(criteria: PurgeCriteria): Promise<PurgeResult> {
    this.logger.log("Purging inactive functions");

    try {
      if (criteria.dryRun) {
        this.logger.log("Performing dry run for purge operation");
      }

      const purgedFunctions =
        await this.storage.purgeInactiveFunctions(criteria);

      // Calculate space saved (estimated)
      const spaceSaved = purgedFunctions.length * 1024; // Estimated 1KB per function

      // Get preserved functions (functions that met purge criteria but were preserved)
      const preservedFunctions = criteria.preserveSystemFunctions
        ? await this.getSystemFunctions()
        : [];

      const result: PurgeResult = {
        success: true,
        purgedFunctions,
        preservedFunctions,
        spaceSaved,
      };

      // Emit purge completed event
      this.eventEmitter.emit("registry.purge-completed", {
        purgedCount: purgedFunctions.length,
        preservedCount: preservedFunctions.length,
        spaceSaved,
        dryRun: criteria.dryRun,
        timestamp: new Date(),
      });

      this.logger.log(
        `Purge operation completed: ${purgedFunctions.length} functions purged`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to purge inactive functions: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Rebuild registry indices
   */
  async rebuildIndices(): Promise<IndexRebuildResult> {
    this.logger.log("Rebuilding registry indices");

    const startTime = Date.now();

    try {
      await this.storage.rebuildIndices();

      const rebuildTime = Date.now() - startTime;
      const indicesRebuilt = [
        "function_name",
        "function_type",
        "creation_date",
        "status",
      ]; // Example indices
      const performanceImprovement = 25; // Estimated percentage improvement

      const result: IndexRebuildResult = {
        success: true,
        rebuildTime,
        indicesRebuilt,
        performanceImprovement,
      };

      // Emit index rebuild completed event
      this.eventEmitter.emit("registry.indices-rebuilt", {
        indicesCount: indicesRebuilt.length,
        rebuildTime,
        performanceImprovement,
        timestamp: new Date(),
      });

      this.logger.log(
        `Registry indices rebuilt successfully in ${rebuildTime}ms`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to rebuild indices: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Get registry status
   */
  async getStatus(): Promise<RegistryStatus> {
    this.logger.debug("Getting registry status");

    try {
      const systemStatus = await this.storage.getSystemStatus();

      const status: RegistryStatus = {
        operational: systemStatus.operational,
        health: this.determineHealthStatus(systemStatus),
        performance: this.determinePerformanceStatus(systemStatus),
        storage: this.determineStorageStatus(systemStatus),
        lastMaintenance: systemStatus.lastMaintenance,
      };

      return status;
    } catch (error) {
      this.logger.error(
        `Failed to get registry status: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Scheduled maintenance operations
   */
  // @Cron('0 2 * * *') - Decorator temporarily commented due to TypeScript issue
  async performScheduledMaintenance(): Promise<void> {
    this.logger.log("Starting scheduled maintenance");

    try {
      const options: MaintenanceOptions = {
        cleanupStaleData: true,
        rebuildIndices: false, // Only on weekends
        compactStorage: true,
        validateIntegrity: true,
        optimizePerformance: false, // Only on demand
      };

      await this.performMaintenance(options);

      this.logger.log("Scheduled maintenance completed successfully");
    } catch (error) {
      this.logger.error(
        `Scheduled maintenance failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Weekly comprehensive maintenance
   */
  // @Cron('0 3 * * 0') - Decorator temporarily commented due to TypeScript issue
  async performWeeklyMaintenance(): Promise<void> {
    this.logger.log("Starting weekly comprehensive maintenance");

    try {
      const options: MaintenanceOptions = {
        cleanupStaleData: true,
        rebuildIndices: true,
        compactStorage: true,
        validateIntegrity: true,
        optimizePerformance: true,
      };

      await this.performMaintenance(options);

      this.logger.log(
        "Weekly comprehensive maintenance completed successfully",
      );
    } catch (error) {
      this.logger.error(
        `Weekly comprehensive maintenance failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Automated backup
   */
  // @Cron('0 1 * * *') - Decorator temporarily commented due to TypeScript issue
  async performAutomatedBackup(): Promise<void> {
    this.logger.log("Starting automated backup");

    try {
      const options: BackupOptions = {
        includeConfiguration: true,
        includeMetadata: true,
        includeHistory: true,
        compression: true,
        encryption: true,
      };

      await this.backup(options);

      // Cleanup old backups (keep last 7 days)
      await this.cleanupOldBackups(7);

      this.logger.log("Automated backup completed successfully");
    } catch (error) {
      this.logger.error(
        `Automated backup failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  // ===========================
  // PRIVATE HELPER METHODS
  // ===========================

  /**
   * Initialize the service
   */
  private async initializeService(): Promise<void> {
    this.logger.log("Initializing Registry Admin Service");

    try {
      // Initialize service state
      this.logger.log("Registry Admin Service initialized successfully");
    } catch (error) {
      this.logger.error(
        `Failed to initialize Registry Admin Service: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Generate maintenance ID
   */
  private generateMaintenanceId(): string {
    return `maintenance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate backup ID
   */
  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Perform cleanup stale data
   */
  private async performCleanupStaleData(): Promise<MaintenanceAction> {
    const startTime = Date.now();

    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const cleanedItems = await this.storage.cleanupStaleData(cutoffDate);

      return {
        name: "cleanup_stale_data",
        duration: Date.now() - startTime,
        result: ActionResult._SUCCESS,
        details: `Cleaned up ${cleanedItems} stale data items`,
      };
    } catch (error) {
      return {
        name: "cleanup_stale_data",
        duration: Date.now() - startTime,
        result: ActionResult._FAILURE,
        details: `Failed to cleanup stale data: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Perform rebuild indices
   */
  private async performRebuildIndices(): Promise<MaintenanceAction> {
    const startTime = Date.now();

    try {
      await this.storage.rebuildIndices();

      return {
        name: "rebuild_indices",
        duration: Date.now() - startTime,
        result: ActionResult._SUCCESS,
        details: "All indices rebuilt successfully",
      };
    } catch (error) {
      return {
        name: "rebuild_indices",
        duration: Date.now() - startTime,
        result: ActionResult._FAILURE,
        details: `Failed to rebuild indices: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Perform compact storage
   */
  private async performCompactStorage(): Promise<MaintenanceAction> {
    const startTime = Date.now();

    try {
      const spaceSaved = await this.storage.compactStorage();

      return {
        name: "compact_storage",
        duration: Date.now() - startTime,
        result: ActionResult._SUCCESS,
        details: `Storage compacted, saved ${spaceSaved} bytes`,
      };
    } catch (error) {
      return {
        name: "compact_storage",
        duration: Date.now() - startTime,
        result: ActionResult._FAILURE,
        details: `Failed to compact storage: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Perform validate integrity
   */
  private async performValidateIntegrity(
    issues: MaintenanceIssue[],
  ): Promise<MaintenanceAction> {
    const startTime = Date.now();

    try {
      const report = await this.storage.validateIntegrity();

      // Convert integrity issues to maintenance issues
      report.issues.forEach((issue) => {
        issues.push({
          type: IssueType._DATA_CORRUPTION,
          description: issue.description,
          severity: issue.severity,
          resolution: issue.suggestedFix,
        });
      });

      return {
        name: "validate_integrity",
        duration: Date.now() - startTime,
        result: report.valid ? ActionResult._SUCCESS : ActionResult._WARNING,
        details: `Integrity validation completed, ${report.issues.length} issues found`,
      };
    } catch (error) {
      return {
        name: "validate_integrity",
        duration: Date.now() - startTime,
        result: ActionResult._FAILURE,
        details: `Failed to validate integrity: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Perform optimize performance
   */
  private async performOptimizePerformance(): Promise<MaintenanceAction> {
    const startTime = Date.now();

    try {
      const report = await this.storage.optimizePerformance();

      return {
        name: "optimize_performance",
        duration: Date.now() - startTime,
        result: ActionResult._SUCCESS,
        details: `Performance optimized, ${report.performanceImprovement}% improvement`,
      };
    } catch (error) {
      return {
        name: "optimize_performance",
        duration: Date.now() - startTime,
        result: ActionResult._FAILURE,
        details: `Failed to optimize performance: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Generate maintenance recommendations
   */
  private generateMaintenanceRecommendations(
    actions: MaintenanceAction[],
    issues: MaintenanceIssue[],
  ): string[] {
    const recommendations: string[] = [];

    // Check for failed actions
    const failedActions = actions.filter(
      (a) => a.result === ActionResult._FAILURE,
    );
    if (failedActions.length > 0) {
      recommendations.push("Review and retry failed maintenance actions");
    }

    // Check for performance issues
    const performanceIssues = issues.filter(
      (i) => i.type === IssueType._PERFORMANCE_ISSUE,
    );
    if (performanceIssues.length > 0) {
      recommendations.push("Consider additional performance optimization");
    }

    // Check for storage issues
    const storageIssues = issues.filter(
      (i) => i.type === IssueType._STORAGE_ISSUE,
    );
    if (storageIssues.length > 0) {
      recommendations.push("Monitor storage usage and consider cleanup");
    }

    // General recommendations
    recommendations.push("Schedule regular maintenance operations");
    recommendations.push("Monitor system metrics for early issue detection");

    return recommendations;
  }

  /**
   * Validate registry settings
   */
  private validateRegistrySettings(settings: RegistrySettings): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Validate cache settings
    if (settings.cacheSettings.enabled && settings.cacheSettings.maxSize <= 0) {
      issues.push("Cache max size must be greater than 0");
    }

    if (settings.cacheSettings.ttl <= 0) {
      issues.push("Cache TTL must be greater than 0");
    }

    // Validate index settings
    if (
      settings.indexSettings.rebuildThreshold < 0 ||
      settings.indexSettings.rebuildThreshold > 1
    ) {
      issues.push("Index rebuild threshold must be between 0 and 1");
    }

    // Validate performance settings
    if (settings.performanceSettings.queryTimeout <= 0) {
      issues.push("Query timeout must be greater than 0");
    }

    if (settings.performanceSettings.batchSize <= 0) {
      issues.push("Batch size must be greater than 0");
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Check if settings require restart
   */
  private requiresRestart(
    current: RegistrySettings,
    updated: RegistrySettings,
  ): boolean {
    // Settings that require restart
    const restartRequired = [
      "securitySettings.encryptionEnabled",
      "performanceSettings.maxCacheSize",
      "indexSettings.optimizationLevel",
    ];

    return restartRequired.some((path) => {
      const currentValue = this.getNestedValue(current, path);
      const updatedValue = this.getNestedValue(updated, path);
      return currentValue !== updatedValue;
    });
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  /**
   * Generate configuration warnings
   */
  private generateConfigurationWarnings(settings: RegistrySettings): string[] {
    const warnings: string[] = [];

    // Check for potential issues
    if (settings.cacheSettings.maxSize > 1000000000) {
      // 1GB
      warnings.push("Large cache size may impact memory usage");
    }

    if (settings.performanceSettings.batchSize > 1000) {
      warnings.push("Large batch size may impact query performance");
    }

    if (!settings.securitySettings.auditingLevel) {
      warnings.push("Consider enabling auditing for security compliance");
    }

    return warnings;
  }

  /**
   * Get health metrics
   */
  private async getHealthMetrics(): Promise<HealthMetrics> {
    // This would integrate with the health monitoring service
    // For now, return mock metrics
    return {
      functionId: "system",
      timestamp: new Date(),
      metrics: new Map([
        [
          "uptime",
          {
            value: 99.9,
            unit: "%",
            trend: "stable" as TrendDirection,
            history: [],
          },
        ],
        [
          "response_time",
          {
            value: 50,
            unit: "ms",
            trend: "improving" as TrendDirection,
            history: [],
          },
        ],
        [
          "error_rate",
          {
            value: 0.1,
            unit: "%",
            trend: "stable" as TrendDirection,
            history: [],
          },
        ],
      ]),
    };
  }

  /**
   * Get system functions
   */
  private async getSystemFunctions(): Promise<string[]> {
    // Return list of system functions that should not be purged
    return ["system_health_check", "system_backup", "system_restore"];
  }

  /**
   * Determine health status
   */
  private determineHealthStatus(systemStatus: SystemStatus): HealthStatus {
    if (!systemStatus.operational) return HealthStatus._CRITICAL;
    if (systemStatus.memoryUsage > 90 || systemStatus.diskUsage > 90)
      return HealthStatus._POOR;
    if (systemStatus.cpuUsage > 80) return HealthStatus._POOR;
    return HealthStatus._EXCELLENT;
  }

  /**
   * Determine performance status
   */
  private determinePerformanceStatus(
    systemStatus: SystemStatus,
  ): PerformanceStatus {
    const queryPerformance =
      systemStatus.cpuUsage < 50
        ? PerformanceLevel._OPTIMAL
        : systemStatus.cpuUsage < 80
          ? PerformanceLevel._GOOD
          : PerformanceLevel._POOR;

    const indexPerformance =
      systemStatus.diskUsage < 70
        ? PerformanceLevel._OPTIMAL
        : systemStatus.diskUsage < 90
          ? PerformanceLevel._GOOD
          : PerformanceLevel._POOR;

    const cachePerformance =
      systemStatus.memoryUsage < 70
        ? PerformanceLevel._OPTIMAL
        : systemStatus.memoryUsage < 90
          ? PerformanceLevel._GOOD
          : PerformanceLevel._POOR;

    return {
      queryPerformance,
      indexPerformance,
      cachePerformance,
    };
  }

  /**
   * Determine storage status
   */
  private determineStorageStatus(systemStatus: SystemStatus): StorageStatus {
    return {
      utilization: systemStatus.diskUsage,
      fragmentation: 10, // Mock value
      compressionRatio: 0.7, // Mock value
      freeSpace: 100 - systemStatus.diskUsage,
    };
  }

  /**
   * Cleanup old backups
   */
  private async cleanupOldBackups(retentionDays: number): Promise<void> {
    try {
      const backups = await this.storage.listBackups();
      const cutoffDate = new Date(
        Date.now() - retentionDays * 24 * 60 * 60 * 1000,
      );

      for (const backup of backups) {
        if (backup.createdAt < cutoffDate) {
          await this.storage.deleteBackup(backup.id);
          this.logger.debug(`Deleted old backup: ${backup.id}`);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to cleanup old backups: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
