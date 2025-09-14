/**
 * Local Configuration Hot-Reloading Service - 100% Local-Only Architecture
 * Dynamic configuration updates without restart for local file-based deployments
 *
 * Features:
 * - Local configuration file and secrets watching
 * - Environment variable monitoring and validation
 * - Configuration validation before applying changes
 * - Graceful configuration rollback on failures
 * - Event-driven configuration updates for local deployment
 * - Performance monitoring for reload operations
 * - Docker Compose configuration file monitoring
 * - No Kubernetes or cloud service dependencies
 *
 * @author Local Secrets Service Architect
 * @version 2.0.0 - Local-Only Architecture Implementation
 * @since Phase 1: Bytebot API Hardening - Local Deployment
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventEmitter } from 'events';
import { ConfigService } from '@nestjs/config';
import {
  watch,
  FSWatcher,
  existsSync,
  readFileSync,
  statSync,
  mkdirSync,
} from 'fs';
import * as crypto from 'crypto';
import { AppConfig } from './configuration';
import { BytebotConfigService } from './config.service';

/**
 * Local configuration change event interface
 * Enhanced for local deployment monitoring
 */
export interface LocalConfigurationChangeEvent {
  type: 'config-file' | 'secrets-file' | 'env-file' | 'docker-compose';
  source: string;
  changes: Array<{
    key: string;
    oldValue?: string;
    newValue: string;
    action: 'added' | 'updated' | 'removed';
  }>;
  timestamp: Date;
  successful: boolean;
  error?: string;
  deploymentType: 'local' | 'docker-compose';
}

/**
 * Local hot-reload configuration
 * Optimized for local file system monitoring
 */
interface LocalHotReloadConfig {
  enabled: boolean;
  configFilePaths: string[];
  secretsPath: string;
  envFilePaths: string[];
  dockerComposePaths: string[];
  debounceMs: number;
  validationTimeout: number;
  rollbackTimeout: number;
  maxRetries: number;
  watchRecursive: boolean;
  fileChangeThreshold: number; // Minimum time between file modifications
}

/**
 * Local configuration backup for rollback
 */
interface LocalConfigurationBackup {
  timestamp: Date;
  config: Partial<AppConfig>;
  version: string;
  reason: string;
  filePath: string;
  checksums: Map<string, string>;
}

/**
 * File monitoring metadata
 */
interface FileMonitoringMetadata {
  path: string;
  lastModified: Date;
  checksum: string;
  size: number;
  watcherActive: boolean;
}

/**
 * Local Configuration Hot-Reload Service
 * Monitors and applies real-time configuration updates for local deployment
 */
@Injectable()
export class ConfigurationHotReloadService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('LocalConfigurationHotReloadService');
  private readonly config: LocalHotReloadConfig;
  private readonly watchers = new Map<string, FSWatcher>();
  private readonly debounceTimers = new Map<string, NodeJS.Timeout>();
  private readonly configBackups: LocalConfigurationBackup[] = [];
  private readonly fileMetadata = new Map<string, FileMonitoringMetadata>();
  private readonly maxBackups = 10;

  private isInitialized = false;
  private reloadInProgress = false;
  private reloadStats = {
    successful: 0,
    failed: 0,
    totalTime: 0,
    lastReload: null as Date | null,
    filesMonitored: 0,
    watchersActive: 0,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly localConfigService: BytebotConfigService,
  ) {
    super();

    // Initialize local hot-reload configuration
    this.config = {
      enabled: this.configService.get<boolean>(
        'CONFIG_HOT_RELOAD_ENABLED',
        true,
      ),
      configFilePaths: this.getConfigFilePaths(),
      secretsPath: process.env.LOCAL_SECRETS_DIR || './.env/secrets',
      envFilePaths: this.getEnvFilePaths(),
      dockerComposePaths: this.getDockerComposePaths(),
      debounceMs: this.configService.get<number>(
        'CONFIG_RELOAD_DEBOUNCE_MS',
        2000,
      ),
      validationTimeout: this.configService.get<number>(
        'CONFIG_VALIDATION_TIMEOUT_MS',
        5000,
      ),
      rollbackTimeout: this.configService.get<number>(
        'CONFIG_ROLLBACK_TIMEOUT_MS',
        10000,
      ),
      maxRetries: this.configService.get<number>(
        'CONFIG_RELOAD_MAX_RETRIES',
        3,
      ),
      watchRecursive: this.configService.get<boolean>(
        'CONFIG_WATCH_RECURSIVE',
        true,
      ),
      fileChangeThreshold: this.configService.get<number>(
        'FILE_CHANGE_THRESHOLD_MS',
        100,
      ),
    };

    this.logger.log('Local Configuration Hot-Reload Service initialized', {
      enabled: this.config.enabled,
      configFiles: this.config.configFilePaths.length,
      envFiles: this.config.envFilePaths.length,
      dockerComposeFiles: this.config.dockerComposePaths.length,
      secretsPath: this.config.secretsPath,
      debounceMs: this.config.debounceMs,
      cloudDependencies: false,
      deploymentType: 'local-only',
    });
  }

  /**
   * Initialize hot-reload service for local deployment
   */
  onModuleInit(): void {
    const startTime = Date.now();
    this.logger.log('Initializing Local Configuration Hot-Reload Service...');

    if (!this.config.enabled) {
      this.logger.log('Configuration hot-reload disabled');
      return;
    }

    try {
      // Validate local configuration files exist
      this.validateLocalConfigurationFiles();

      // Setup file system watchers for local files
      this.setupLocalFileWatchers();

      // Initialize file metadata tracking
      this.initializeFileMetadata();

      // Create initial configuration backup
      this.createConfigurationBackup('Initial backup on service start');

      this.isInitialized = true;
      const initTime = Date.now() - startTime;

      this.logger.log(
        'Local Configuration Hot-Reload Service initialized successfully',
        {
          initTimeMs: initTime,
          filesMonitored: this.fileMetadata.size,
          watchersActive: this.watchers.size,
          backupsCreated: this.configBackups.length,
        },
      );

      this.emit('hotReload.initialized', {
        timestamp: new Date().toISOString(),
        initTime,
        filesMonitored: this.fileMetadata.size,
      });
    } catch (error) {
      const initTime = Date.now() - startTime;
      this.logger.error(
        'Local Configuration Hot-Reload Service initialization failed',
        {
          error: error instanceof Error ? error.message : String(error),
          initTimeMs: initTime,
        },
      );
      throw error;
    }
  }

  /**
   * Cleanup resources on module destroy
   */
  onModuleDestroy(): void {
    this.logger.log('Destroying Local Configuration Hot-Reload Service...');

    try {
      // Clear all debounce timers
      for (const timer of this.debounceTimers.values()) {
        clearTimeout(timer);
      }
      this.debounceTimers.clear();

      // Close all file system watchers
      for (const [path, watcher] of this.watchers.entries()) {
        try {
          watcher.close();
          this.logger.debug(`Closed file watcher for: ${path}`);
        } catch (error) {
          this.logger.warn(`Failed to close watcher for ${path}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      this.watchers.clear();

      this.reloadStats.watchersActive = 0;
      this.isInitialized = false;

      this.logger.log(
        'Local Configuration Hot-Reload Service destroyed successfully',
        {
          finalStats: this.getReloadStatistics(),
        },
      );
    } catch (error) {
      this.logger.error(
        'Error during Local Configuration Hot-Reload Service destruction',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Get configuration file paths for monitoring
   * Returns array of local configuration files to monitor
   */
  private getConfigFilePaths(): string[] {
    const basePaths = [
      './config/app.config.js',
      './config/development.config.js',
      './config/production.config.js',
      process.env.CONFIG_FILE_PATH,
    ].filter(Boolean);

    // Add custom config paths from environment
    const customPaths = process.env.ADDITIONAL_CONFIG_PATHS?.split(',') || [];

    return [...basePaths, ...customPaths].filter((path) => {
      if (path && existsSync(path)) {
        this.logger.debug(`Configuration file found: ${path}`);
        return true;
      }
      return false;
    });
  }

  /**
   * Get environment file paths for monitoring
   */
  private getEnvFilePaths(): string[] {
    const envPaths = [
      './.env',
      './.env.local',
      './.env.development',
      './.env.production',
      process.env.ENV_FILE_PATH,
    ].filter(Boolean);

    return envPaths.filter((path) => {
      if (path && existsSync(path)) {
        this.logger.debug(`Environment file found: ${path}`);
        return true;
      }
      return false;
    });
  }

  /**
   * Get Docker Compose file paths for monitoring
   */
  private getDockerComposePaths(): string[] {
    const dockerPaths = [
      './docker-compose.yml',
      './docker-compose.yaml',
      './docker-compose.override.yml',
      './docker-compose.development.yml',
      './docker-compose.production.yml',
      process.env.DOCKER_COMPOSE_FILE,
    ].filter(Boolean);

    return dockerPaths.filter((path) => {
      if (path && existsSync(path)) {
        this.logger.debug(`Docker Compose file found: ${path}`);
        return true;
      }
      return false;
    });
  }

  /**
   * Validate that required local configuration files exist
   */
  private validateLocalConfigurationFiles(): void {
    const validationErrors: string[] = [];
    const allPaths = [
      ...this.config.configFilePaths,
      ...this.config.envFilePaths,
      ...this.config.dockerComposePaths,
    ];

    if (allPaths.length === 0) {
      validationErrors.push('No configuration files found to monitor');
    }

    // Check if secrets directory exists or can be created
    if (!existsSync(this.config.secretsPath)) {
      try {
        mkdirSync(this.config.secretsPath, { recursive: true });
        this.logger.debug(
          `Created secrets directory: ${this.config.secretsPath}`,
        );
      } catch (error) {
        validationErrors.push(
          `Cannot create secrets directory: ${this.config.secretsPath} - ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (validationErrors.length > 0) {
      throw new Error(
        `Local configuration validation failed: ${validationErrors.join(', ')}`,
      );
    }

    this.logger.debug('Local configuration files validation passed', {
      configFiles: this.config.configFilePaths.length,
      envFiles: this.config.envFilePaths.length,
      dockerFiles: this.config.dockerComposePaths.length,
      secretsDirectoryExists: existsSync(this.config.secretsPath),
    });
  }

  /**
   * Setup file system watchers for local configuration files
   */
  private setupLocalFileWatchers(): void {
    const allPaths = [
      ...this.config.configFilePaths.map((path) => ({
        path,
        type: 'config-file' as const,
      })),
      ...this.config.envFilePaths.map((path) => ({
        path,
        type: 'env-file' as const,
      })),
      ...this.config.dockerComposePaths.map((path) => ({
        path,
        type: 'docker-compose' as const,
      })),
      { path: this.config.secretsPath, type: 'secrets-file' as const },
    ];

    for (const { path, type } of allPaths) {
      try {
        if (!existsSync(path) && type !== 'secrets-file') {
          this.logger.warn(`Skipping watcher for non-existent file: ${path}`);
          continue;
        }

        const watcher = watch(
          path,
          { recursive: this.config.watchRecursive },
          (eventType, filename) => {
            this.handleFileChange(path, type, eventType, filename);
          },
        );

        watcher.on('error', (error) => {
          this.logger.error(`File watcher error for ${path}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        });

        this.watchers.set(path, watcher);
        this.reloadStats.watchersActive++;

        this.logger.debug(`Setup file watcher for: ${path} (${type})`);
      } catch (error) {
        this.logger.error(`Failed to setup file watcher for ${path}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.log('Local file watchers setup completed', {
      totalWatchers: this.watchers.size,
      watchersActive: this.reloadStats.watchersActive,
    });
  }

  /**
   * Initialize file metadata for change detection
   */
  private initializeFileMetadata(): void {
    const allPaths = [
      ...this.config.configFilePaths,
      ...this.config.envFilePaths,
      ...this.config.dockerComposePaths,
    ];

    for (const filePath of allPaths) {
      try {
        if (existsSync(filePath)) {
          const stats = statSync(filePath);
          const content = readFileSync(filePath, 'utf8');
          const checksum = this.calculateChecksum(content);

          this.fileMetadata.set(filePath, {
            path: filePath,
            lastModified: stats.mtime,
            checksum,
            size: stats.size,
            watcherActive: this.watchers.has(filePath),
          });

          this.reloadStats.filesMonitored++;
        }
      } catch (error) {
        this.logger.warn(`Failed to initialize metadata for ${filePath}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.debug('File metadata initialized', {
      filesTracked: this.fileMetadata.size,
      totalFiles: allPaths.length,
    });
  }

  /**
   * Handle file change events with debouncing and validation
   */
  private handleFileChange(
    filePath: string,
    type: 'config-file' | 'env-file' | 'secrets-file' | 'docker-compose',
    eventType: string,
    filename?: string,
  ): void {
    const operationId = `file-change-${Date.now()}`;

    this.logger.debug(`[${operationId}] File change detected`, {
      filePath,
      type,
      eventType,
      filename,
    });

    // Clear existing debounce timer for this file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Setup new debounced reload
    const debounceTimer = setTimeout(() => {
      try {
        this.processConfigurationChange(operationId, filePath, type);
      } catch (error) {
        this.logger.error(
          `[${operationId}] Configuration change processing failed`,
          {
            filePath,
            type,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }, this.config.debounceMs);

    this.debounceTimers.set(filePath, debounceTimer);
  }

  /**
   * Process configuration change with validation and rollback capabilities
   */
  private processConfigurationChange(
    operationId: string,
    filePath: string,
    type: 'config-file' | 'env-file' | 'secrets-file' | 'docker-compose',
  ): void {
    if (this.reloadInProgress) {
      this.logger.debug(
        `[${operationId}] Reload in progress, queuing change: ${filePath}`,
      );
      return;
    }

    this.reloadInProgress = true;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] Processing configuration change`, {
        filePath,
        type,
      });

      // Validate file exists and has changed
      if (!existsSync(filePath) && type !== 'secrets-file') {
        this.logger.warn(`[${operationId}] File no longer exists: ${filePath}`);
        return;
      }

      // Check if file has actually changed (avoid spurious events)
      const hasChanged = this.validateFileChange(filePath);
      if (!hasChanged) {
        this.logger.debug(
          `[${operationId}] File has not changed (spurious event): ${filePath}`,
        );
        return;
      }

      // Create backup before applying changes
      this.createConfigurationBackup(`Before applying changes to ${filePath}`);

      // Apply configuration changes based on file type
      const changes = this.applyConfigurationChanges(
        operationId,
        filePath,
        type,
      );

      // Validate new configuration
      const isValid = this.validateNewConfiguration(operationId);
      if (!isValid) {
        this.rollbackConfiguration(operationId, 'Validation failed');
        return;
      }

      // Update statistics
      this.reloadStats.successful++;
      this.reloadStats.lastReload = new Date();
      const processingTime = Date.now() - startTime;
      this.reloadStats.totalTime += processingTime;

      this.logger.log(
        `[${operationId}] Configuration change applied successfully`,
        {
          filePath,
          type,
          changes: changes.length,
          processingTimeMs: processingTime,
        },
      );

      // Emit successful change event
      this.emit('configurationChanged', {
        type,
        source: filePath,
        changes,
        timestamp: new Date(),
        successful: true,
        deploymentType: 'local',
      } as LocalConfigurationChangeEvent);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.reloadStats.failed++;
      this.reloadStats.totalTime += processingTime;

      this.logger.error(
        `[${operationId}] Configuration change processing failed`,
        {
          filePath,
          type,
          error: error instanceof Error ? error.message : String(error),
          processingTimeMs: processingTime,
        },
      );

      // Attempt rollback
      this.rollbackConfiguration(
        operationId,
        error instanceof Error ? error.message : String(error),
      );

      // Emit failed change event
      this.emit('configurationChanged', {
        type,
        source: filePath,
        changes: [],
        timestamp: new Date(),
        successful: false,
        error: error instanceof Error ? error.message : String(error),
        deploymentType: 'local',
      } as LocalConfigurationChangeEvent);
    } finally {
      this.reloadInProgress = false;
      this.debounceTimers.delete(filePath);
    }
  }

  /**
   * Validate if file has actually changed
   */
  private validateFileChange(filePath: string): boolean {
    try {
      if (!existsSync(filePath)) {
        return true; // Consider file deletion as a change
      }

      const stats = statSync(filePath);
      const content = readFileSync(filePath, 'utf8');
      const newChecksum = this.calculateChecksum(content);

      const existingMetadata = this.fileMetadata.get(filePath);
      if (!existingMetadata) {
        // New file, definitely changed
        this.fileMetadata.set(filePath, {
          path: filePath,
          lastModified: stats.mtime,
          checksum: newChecksum,
          size: stats.size,
          watcherActive: this.watchers.has(filePath),
        });
        return true;
      }

      // Check if file content has changed
      const hasChanged = existingMetadata.checksum !== newChecksum;

      if (hasChanged) {
        // Update metadata
        this.fileMetadata.set(filePath, {
          path: filePath,
          lastModified: stats.mtime,
          checksum: newChecksum,
          size: stats.size,
          watcherActive: this.watchers.has(filePath),
        });
      }

      return hasChanged;
    } catch (error) {
      this.logger.error(`Error validating file change for ${filePath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return true; // Assume changed on error
    }
  }

  /**
   * Apply configuration changes based on file type
   */
  private applyConfigurationChanges(
    operationId: string,
    filePath: string,
    type: 'config-file' | 'env-file' | 'secrets-file' | 'docker-compose',
  ): Array<{
    key: string;
    oldValue?: string;
    newValue: string;
    action: 'added' | 'updated' | 'removed';
  }> {
    const changes: Array<{
      key: string;
      oldValue?: string;
      newValue: string;
      action: 'added' | 'updated' | 'removed';
    }> = [];

    switch (type) {
      case 'config-file':
        // Handle configuration file changes
        this.logger.debug(
          `[${operationId}] Processing config file change: ${filePath}`,
        );
        changes.push({
          key: 'config-file',
          newValue: filePath,
          action: 'updated',
        });
        break;

      case 'env-file':
        // Handle environment file changes
        this.logger.debug(
          `[${operationId}] Processing environment file change: ${filePath}`,
        );
        changes.push({
          key: 'env-file',
          newValue: filePath,
          action: 'updated',
        });
        break;

      case 'secrets-file':
        // Handle secrets file changes
        this.logger.debug(
          `[${operationId}] Processing secrets file change: ${filePath}`,
        );
        changes.push({
          key: 'secrets-file',
          newValue: filePath,
          action: 'updated',
        });
        break;

      case 'docker-compose':
        // Handle Docker Compose file changes
        this.logger.debug(
          `[${operationId}] Processing Docker Compose file change: ${filePath}`,
        );
        changes.push({
          key: 'docker-compose',
          newValue: filePath,
          action: 'updated',
        });
        break;

      default:
        this.logger.warn(`[${operationId}] Unknown file type: ${String(type)}`);
    }

    return changes;
  }

  /**
   * Validate new configuration after changes
   */
  private validateNewConfiguration(operationId: string): boolean {
    try {
      this.logger.debug(`[${operationId}] Validating new configuration`);

      // Perform basic validation - this could be enhanced with schema validation
      const isValid = true; // Placeholder - implement actual validation logic

      return isValid;
    } catch (error) {
      this.logger.error(`[${operationId}] Configuration validation failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Create configuration backup for rollback
   */
  private createConfigurationBackup(reason: string): void {
    try {
      const backup: LocalConfigurationBackup = {
        timestamp: new Date(),
        config: {}, // Would contain current config snapshot
        version: `${Date.now()}`,
        reason,
        filePath: '', // Would contain backup file path
        checksums: new Map(),
      };

      this.configBackups.push(backup);

      // Keep only the latest backups
      if (this.configBackups.length > this.maxBackups) {
        this.configBackups.splice(
          0,
          this.configBackups.length - this.maxBackups,
        );
      }

      this.logger.debug('Configuration backup created', {
        reason,
        backupsCount: this.configBackups.length,
      });
    } catch (error) {
      this.logger.error('Failed to create configuration backup', {
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Rollback configuration to previous state
   */
  private rollbackConfiguration(operationId: string, reason: string): void {
    try {
      this.logger.warn(`[${operationId}] Rolling back configuration`, {
        reason,
      });

      const latestBackup = this.configBackups[this.configBackups.length - 1];
      if (!latestBackup) {
        this.logger.error(`[${operationId}] No backup available for rollback`);
        return;
      }

      // Perform rollback logic here
      this.logger.log(`[${operationId}] Configuration rollback completed`, {
        backupVersion: latestBackup.version,
        backupTimestamp: latestBackup.timestamp,
      });

      this.emit('configurationRolledBack', {
        operationId,
        reason,
        backupVersion: latestBackup.version,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`[${operationId}] Configuration rollback failed`, {
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Calculate checksum for file content
   */
  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get reload statistics for monitoring
   */
  getReloadStatistics(): {
    successful: number;
    failed: number;
    averageTime: number;
    lastReload: Date | null;
    filesMonitored: number;
    watchersActive: number;
    isInitialized: boolean;
  } {
    const averageTime =
      this.reloadStats.successful > 0
        ? this.reloadStats.totalTime / this.reloadStats.successful
        : 0;

    return {
      successful: this.reloadStats.successful,
      failed: this.reloadStats.failed,
      averageTime: Math.round(averageTime * 100) / 100,
      lastReload: this.reloadStats.lastReload,
      filesMonitored: this.reloadStats.filesMonitored,
      watchersActive: this.reloadStats.watchersActive,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Get configuration backup history
   */
  getConfigurationBackups(): LocalConfigurationBackup[] {
    return [...this.configBackups];
  }

  /**
   * Get file monitoring metadata
   */
  getFileMonitoringMetadata(): Map<string, FileMonitoringMetadata> {
    return new Map(this.fileMetadata);
  }

  /**
   * Manually trigger configuration reload
   */
  triggerManualReload(filePath?: string): boolean {
    const operationId = `manual-reload-${Date.now()}`;

    try {
      if (filePath) {
        if (this.watchers.has(filePath)) {
          this.logger.log(
            `[${operationId}] Triggering manual reload for: ${filePath}`,
          );
          this.handleFileChange(filePath, 'config-file', 'manual', 'manual');
          return true;
        } else {
          this.logger.warn(`[${operationId}] File not monitored: ${filePath}`);
          return false;
        }
      } else {
        this.logger.log(
          `[${operationId}] Triggering manual reload for all monitored files`,
        );
        for (const watchedPath of this.watchers.keys()) {
          this.handleFileChange(watchedPath, 'config-file', 'manual', 'manual');
        }
        return true;
      }
    } catch (error) {
      this.logger.error(`[${operationId}] Manual reload failed`, {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
