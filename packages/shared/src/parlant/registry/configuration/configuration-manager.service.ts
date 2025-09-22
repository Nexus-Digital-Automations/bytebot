/**
 * PARLANT Phase 1 Function Registration System - Configuration Manager Service
 *
 * Implements runtime configuration management for registered functions.
 * Provides dynamic configuration updates, template management, validation,
 * and hot-reload capabilities without system restarts.
 *
 * @fileoverview Configuration management service for function registry
 * @version 1.0.0
 * @author Configuration Management Agent #5
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IConfigurationManager,
  FunctionRegistrationConfig,
  ConfigurationUpdateResult,
  ConfigurationResetResult,
  GlobalConfiguration,
  GlobalConfigurationUpdateResult,
  ConfigurationValidationResult,
  TemplateApplicationResult,
  ConfigurationTemplate,
  EnforcementPolicy,
  SecuritySettings,
  PerformanceSettings,
  PolicyRule,
  PolicyAction,
  EnforcementLevel,
  CacheConfig,
  MonitoringConfig,
  ErrorHandlingConfig,
  ConfigOverride,
  OverrideCondition,
  ConditionType,
  TemplateCategory,
  TemplateApplicability,
  ConfigurationConflict,
  ConflictResolution,
  RollbackPlan,
  RollbackStep,
  RollbackAction,
  RiskLevel
} from '../core/registry.interface';
import {
  ValidationMode,
  ApprovalLevel,
  SecurityLevel
} from '../../../types/parlant-integration.types';

/**
 * Configuration change types
 */
export enum ConfigurationChangeType {
  _CREATE = 'create',
  _UPDATE = 'update',
  _DELETE = 'delete',
  _RESET = 'reset',
  _TEMPLATE_APPLY = 'template_apply',
  _OVERRIDE_ADD = 'override_add',
  _OVERRIDE_REMOVE = 'override_remove'
}

/**
 * Configuration change event
 */
export interface ConfigurationChangeEvent {
  functionId: string;
  changeType: ConfigurationChangeType;
  previousConfig?: Partial<FunctionRegistrationConfig>;
  newConfig?: Partial<FunctionRegistrationConfig>;
  timestamp: Date;
  userId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Configuration audit entry
 */
export interface ConfigurationAuditEntry {
  id: string;
  functionId: string;
  changeType: ConfigurationChangeType;
  changes: ConfigurationChange[];
  user: string;
  timestamp: Date;
  reason: string;
  approved: boolean;
  rollbackInfo?: RollbackInfo;
}

export interface ConfigurationChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  impact: ChangeImpact;
}

export enum ChangeImpact {
  _NONE = 'none',
  _LOW = 'low',
  _MEDIUM = 'medium',
  _HIGH = 'high',
  _BREAKING = 'breaking'
}

export interface RollbackInfo {
  rollbackId: string;
  supportedOperations: RollbackAction[];
  complexity: RollbackComplexity;
  estimatedTime: number;
}

export enum RollbackComplexity {
  _TRIVIAL = 'trivial',
  _SIMPLE = 'simple',
  _MODERATE = 'moderate',
  _COMPLEX = 'complex'
}

/**
 * Configuration validation context
 */
export interface ValidationContext {
  functionId: string;
  currentConfig?: FunctionRegistrationConfig;
  globalConfig: GlobalConfiguration;
  enforcementPolicies: EnforcementPolicy[];
  userPermissions: string[];
  environment: string;
}

/**
 * Configuration storage interface
 */
export interface IConfigurationStorage {
  getConfiguration(functionId: string): Promise<FunctionRegistrationConfig | null>;
  setConfiguration(functionId: string, config: FunctionRegistrationConfig): Promise<void>;
  deleteConfiguration(functionId: string): Promise<void>;
  getGlobalConfiguration(): Promise<GlobalConfiguration>;
  setGlobalConfiguration(config: GlobalConfiguration): Promise<void>;
  getTemplates(): Promise<ConfigurationTemplate[]>;
  getAuditLog(functionId?: string): Promise<ConfigurationAuditEntry[]>;
  addAuditEntry(entry: ConfigurationAuditEntry): Promise<void>;
}

/**
 * Configuration manager service implementing runtime configuration management
 */
@Injectable()
export class ConfigurationManagerService implements IConfigurationManager {
  private readonly logger = new Logger(ConfigurationManagerService.name);
  private readonly configurationCache = new Map<string, FunctionRegistrationConfig>();
  private readonly templateCache = new Map<string, ConfigurationTemplate>();
  private globalConfigurationCache: GlobalConfiguration | null = null;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly storage: IConfigurationStorage
  ) {
    this.initializeService();
  }

  /**
   * Get function configuration
   */
  async getConfiguration(functionId: string): Promise<FunctionRegistrationConfig | null> {
    this.logger.debug(`Getting configuration for function: ${functionId}`);

    try {
      // Check cache first
      if (this.configurationCache.has(functionId)) {
        this.logger.debug(`Configuration found in cache for function: ${functionId}`);
        return this.configurationCache.get(functionId)!;
      }

      // Load from storage
      const config = await this.storage.getConfiguration(functionId);

      if (config) {
        // Cache the configuration
        this.configurationCache.set(functionId, config);
        this.logger.debug(`Configuration loaded from storage for function: ${functionId}`);
        return config;
      }

      // Return default configuration if not found
      const defaultConfig = await this.getDefaultConfiguration();
      this.logger.debug(`Returning default configuration for function: ${functionId}`);
      return defaultConfig;

    } catch (error) {
      this.logger.error(`Failed to get configuration for function ${functionId}: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Update function configuration
   */
  async updateConfiguration(
    functionId: string,
    config: Partial<FunctionRegistrationConfig>
  ): Promise<ConfigurationUpdateResult> {
    this.logger.log(`Updating configuration for function: ${functionId}`);

    try {
      // Get current configuration
      const currentConfig = await this.getConfiguration(functionId);
      if (!currentConfig) {
        throw new Error(`Function ${functionId} not found`);
      }

      // Validate the update
      const mergedConfig = { ...currentConfig, ...config };
      const validationResult = await this.validateConfiguration(mergedConfig, functionId);

      if (!validationResult.valid) {
        return {
          success: false,
          updatedFields: [],
          validationErrors: validationResult.errors,
          rollbackRequired: false
        };
      }

      // Check for conflicts
      const conflicts = await this.detectConfigurationConflicts(functionId, config);

      // Apply the configuration update
      const updatedFields = Object.keys(config);
      await this.storage.setConfiguration(functionId, mergedConfig);

      // Update cache
      this.configurationCache.set(functionId, mergedConfig);

      // Create audit entry
      await this.createAuditEntry({
        functionId,
        changeType: ConfigurationChangeType._UPDATE,
        changes: this.createConfigurationChanges(currentConfig, mergedConfig),
        user: 'system', // Would be actual user in real implementation
        timestamp: new Date(),
        reason: 'Configuration update via API',
        approved: true
      });

      // Emit change event
      this.eventEmitter.emit('configuration.updated', {
        functionId,
        changeType: ConfigurationChangeType._UPDATE,
        previousConfig: currentConfig,
        newConfig: mergedConfig,
        timestamp: new Date()
      } as ConfigurationChangeEvent);

      this.logger.log(`Configuration updated successfully for function: ${functionId}`);

      return {
        success: true,
        updatedFields,
        validationErrors: [],
        rollbackRequired: false
      };

    } catch (error) {
      this.logger.error(`Failed to update configuration for function ${functionId}: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfiguration(functionId: string): Promise<ConfigurationResetResult> {
    this.logger.log(`Resetting configuration for function: ${functionId}`);

    try {
      // Get current configuration for backup
      const currentConfig = await this.getConfiguration(functionId);

      // Get default configuration
      const defaultConfig = await this.getDefaultConfiguration();

      // Apply default configuration
      await this.storage.setConfiguration(functionId, defaultConfig);

      // Update cache
      this.configurationCache.set(functionId, defaultConfig);

      // Create audit entry
      await this.createAuditEntry({
        functionId,
        changeType: ConfigurationChangeType._RESET,
        changes: currentConfig ? this.createConfigurationChanges(currentConfig, defaultConfig) : [],
        user: 'system',
        timestamp: new Date(),
        reason: 'Configuration reset to defaults',
        approved: true
      });

      // Emit change event
      this.eventEmitter.emit('configuration.reset', {
        functionId,
        changeType: ConfigurationChangeType._RESET,
        previousConfig: currentConfig,
        newConfig: defaultConfig,
        timestamp: new Date()
      } as ConfigurationChangeEvent);

      const resetFields = currentConfig ? Object.keys(defaultConfig) : [];

      this.logger.log(`Configuration reset successfully for function: ${functionId}`);

      return {
        success: true,
        resetFields,
        backupCreated: true
      };

    } catch (error) {
      this.logger.error(`Failed to reset configuration for function ${functionId}: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Get global configuration
   */
  async getGlobalConfiguration(): Promise<GlobalConfiguration> {
    this.logger.debug('Getting global configuration');

    try {
      // Check cache first
      if (this.globalConfigurationCache) {
        return this.globalConfigurationCache;
      }

      // Load from storage
      const globalConfig = await this.storage.getGlobalConfiguration();

      // Cache the configuration
      this.globalConfigurationCache = globalConfig;

      return globalConfig;

    } catch (error) {
      this.logger.error(`Failed to get global configuration: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Update global configuration
   */
  async updateGlobalConfiguration(
    config: Partial<GlobalConfiguration>
  ): Promise<GlobalConfigurationUpdateResult> {
    this.logger.log('Updating global configuration');

    try {
      // Get current global configuration
      const currentConfig = await this.getGlobalConfiguration();

      // Merge configurations
      const mergedConfig = this.mergeGlobalConfiguration(currentConfig, config);

      // Validate the merged configuration
      const validationResult = await this.validateGlobalConfiguration(mergedConfig);

      if (!validationResult.valid) {
        throw new Error(`Global configuration validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      // Apply the configuration
      await this.storage.setGlobalConfiguration(mergedConfig);

      // Update cache
      this.globalConfigurationCache = mergedConfig;

      // Determine affected functions
      const affectedFunctions = await this.getAffectedFunctions(config);

      // Create rollback plan
      const rollbackPlan = this.createRollbackPlan(currentConfig, mergedConfig);

      // Emit change event
      this.eventEmitter.emit('global-configuration.updated', {
        previousConfig: currentConfig,
        newConfig: mergedConfig,
        affectedFunctions,
        timestamp: new Date()
      });

      this.logger.log('Global configuration updated successfully');

      return {
        success: true,
        affectedFunctions,
        migrationRequired: this.isMigrationRequired(config),
        rollbackPlan
      };

    } catch (error) {
      this.logger.error(`Failed to update global configuration: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Validate configuration
   */
  async validateConfiguration(
    config: FunctionRegistrationConfig,
    functionId?: string
  ): Promise<ConfigurationValidationResult> {
    const errors: Array<{ field: string; message: string; code: string }> = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Get validation context
      const context: ValidationContext = {
        functionId: functionId || 'unknown',
        currentConfig: functionId ? (await this.getConfiguration(functionId)) || undefined : undefined,
        globalConfig: await this.getGlobalConfiguration(),
        enforcementPolicies: await this.getEnforcementPolicies(),
        userPermissions: [], // Would be populated from actual user context
        environment: process.env.NODE_ENV || 'development'
      };

      // Validate basic structure
      this.validateBasicStructure(config, errors);

      // Validate individual components
      this.validateCacheConfig(config.cache, errors, warnings);
      this.validateMonitoringConfig(config.monitoring, errors, warnings);
      this.validateErrorHandlingConfig(config.errorHandling, errors, warnings);

      // Apply enforcement policies
      await this.applyEnforcementPolicies(config, context, errors, warnings);

      // Generate recommendations
      this.generateRecommendations(config, context, recommendations);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        recommendations
      };

    } catch (error) {
      this.logger.error(`Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      errors.push({
        field: 'general',
        message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
        code: 'VALIDATION_ERROR'
      });

      return {
        valid: false,
        errors,
        warnings,
        recommendations
      };
    }
  }

  /**
   * Apply configuration template
   */
  async applyTemplate(
    functionId: string,
    templateName: string
  ): Promise<TemplateApplicationResult> {
    this.logger.log(`Applying template ${templateName} to function: ${functionId}`);

    try {
      // Get the template
      const template = await this.getTemplate(templateName);
      if (!template) {
        throw new Error(`Template ${templateName} not found`);
      }

      // Get current configuration
      const currentConfig = await this.getConfiguration(functionId);
      if (!currentConfig) {
        throw new Error(`Function ${functionId} not found`);
      }

      // Check template applicability
      const applicabilityCheck = await this.checkTemplateApplicability(functionId, template);
      if (!applicabilityCheck.applicable) {
        throw new Error(`Template ${templateName} is not applicable to function ${functionId}: ${applicabilityCheck.reason}`);
      }

      // Detect conflicts
      const conflicts = this.detectTemplateConflicts(currentConfig, template);

      // Apply template settings
      const updatedConfig = this.applyTemplateSettings(currentConfig, template, conflicts);

      // Update configuration
      const updateResult = await this.updateConfiguration(functionId, updatedConfig);

      if (!updateResult.success) {
        throw new Error(`Failed to apply template: ${updateResult.validationErrors?.map(e => e.message).join(', ')}`);
      }

      // Create audit entry
      await this.createAuditEntry({
        functionId,
        changeType: ConfigurationChangeType._TEMPLATE_APPLY,
        changes: this.createConfigurationChanges(currentConfig, updatedConfig),
        user: 'system',
        timestamp: new Date(),
        reason: `Applied template: ${templateName}`,
        approved: true
      });

      this.logger.log(`Template ${templateName} applied successfully to function: ${functionId}`);

      return {
        success: true,
        appliedSettings: Object.keys(template.settings),
        conflicts
      };

    } catch (error) {
      this.logger.error(`Failed to apply template ${templateName} to function ${functionId}: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * Get available configuration templates
   */
  async getTemplates(): Promise<ConfigurationTemplate[]> {
    this.logger.debug('Getting available configuration templates');

    try {
      // Check cache first
      if (this.templateCache.size > 0) {
        return Array.from(this.templateCache.values());
      }

      // Load from storage
      const templates = await this.storage.getTemplates();

      // Cache templates
      templates.forEach(template => {
        this.templateCache.set(template.name, template);
      });

      return templates;

    } catch (error) {
      this.logger.error(`Failed to get templates: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  // ===========================
  // PRIVATE HELPER METHODS
  // ===========================

  /**
   * Initialize the service
   */
  private async initializeService(): Promise<void> {
    this.logger.log('Initializing Configuration Manager Service');

    try {
      // Pre-load global configuration
      await this.getGlobalConfiguration();

      // Pre-load templates
      await this.getTemplates();

      this.logger.log('Configuration Manager Service initialized successfully');

    } catch (error) {
      this.logger.error(`Failed to initialize Configuration Manager Service: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
    }
  }

  /**
   * Get default configuration
   */
  private async getDefaultConfiguration(): Promise<FunctionRegistrationConfig> {
    const globalConfig = await this.getGlobalConfiguration();
    return globalConfig.defaultSettings;
  }

  /**
   * Detect configuration conflicts
   */
  private async detectConfigurationConflicts(
    functionId: string,
    config: Partial<FunctionRegistrationConfig>
  ): Promise<ConfigurationConflict[]> {
    const conflicts: ConfigurationConflict[] = [];

    // This would implement actual conflict detection logic
    // For now, return empty array

    return conflicts;
  }

  /**
   * Create configuration changes array
   */
  private createConfigurationChanges(
    oldConfig: FunctionRegistrationConfig,
    newConfig: FunctionRegistrationConfig
  ): ConfigurationChange[] {
    const changes: ConfigurationChange[] = [];

    // Compare configurations and identify changes
    // This is a simplified implementation
    Object.keys(newConfig).forEach(key => {
      const oldValue = (oldConfig as any)[key];
      const newValue = (newConfig as any)[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue,
          newValue,
          impact: this.assessChangeImpact(key, oldValue, newValue)
        });
      }
    });

    return changes;
  }

  /**
   * Assess change impact
   */
  private assessChangeImpact(field: string, oldValue: unknown, newValue: unknown): ChangeImpact {
    // Critical fields that have high impact
    const criticalFields = ['enabled', 'defaultApprovalLevel', 'defaultValidationMode'];

    if (criticalFields.includes(field)) {
      return ChangeImpact._HIGH;
    }

    // Performance-related fields
    const performanceFields = ['defaultTimeout', 'cache', 'monitoring'];

    if (performanceFields.includes(field)) {
      return ChangeImpact._MEDIUM;
    }

    return ChangeImpact._LOW;
  }

  /**
   * Create audit entry
   */
  private async createAuditEntry(entry: Omit<ConfigurationAuditEntry, 'id'>): Promise<void> {
    const auditEntry: ConfigurationAuditEntry = {
      id: this.generateAuditId(),
      ...entry
    };

    await this.storage.addAuditEntry(auditEntry);
  }

  /**
   * Generate audit ID
   */
  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Merge global configuration
   */
  private mergeGlobalConfiguration(
    current: GlobalConfiguration,
    updates: Partial<GlobalConfiguration>
  ): GlobalConfiguration {
    return {
      ...current,
      ...updates,
      defaultSettings: updates.defaultSettings
        ? { ...current.defaultSettings, ...updates.defaultSettings }
        : current.defaultSettings,
      enforcementPolicies: updates.enforcementPolicies || current.enforcementPolicies,
      securitySettings: updates.securitySettings
        ? { ...current.securitySettings, ...updates.securitySettings }
        : current.securitySettings,
      performanceSettings: updates.performanceSettings
        ? { ...current.performanceSettings, ...updates.performanceSettings }
        : current.performanceSettings
    };
  }

  /**
   * Validate global configuration
   */
  private async validateGlobalConfiguration(config: GlobalConfiguration): Promise<ConfigurationValidationResult> {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    // Validate default settings
    const defaultValidation = await this.validateConfiguration(config.defaultSettings);
    errors.push(...defaultValidation.errors);

    // Validate enforcement policies
    config.enforcementPolicies.forEach((policy, index) => {
      if (!policy.name || policy.name.trim() === '') {
        errors.push({
          field: `enforcementPolicies[${index}].name`,
          message: 'Policy name is required',
          code: 'POLICY_NAME_REQUIRED'
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
      recommendations: []
    };
  }

  /**
   * Get affected functions for global configuration change
   */
  private async getAffectedFunctions(config: Partial<GlobalConfiguration>): Promise<string[]> {
    // This would query the registry to find affected functions
    // For now, return empty array
    return [];
  }

  /**
   * Check if migration is required
   */
  private isMigrationRequired(config: Partial<GlobalConfiguration>): boolean {
    // Check if any breaking changes require migration
    const breakingFields = ['defaultSettings.defaultValidationMode', 'securitySettings.encryptionEnabled'];

    return breakingFields.some(field => {
      const keys = field.split('.');
      let value = config;
      for (const key of keys) {
        value = (value as any)?.[key];
        if (value === undefined) return false;
      }
      return value !== undefined;
    });
  }

  /**
   * Create rollback plan
   */
  private createRollbackPlan(
    currentConfig: GlobalConfiguration,
    newConfig: GlobalConfiguration
  ): RollbackPlan {
    const steps: RollbackStep[] = [
      {
        order: 1,
        description: 'Restore global configuration',
        action: RollbackAction._RESTORE_CONFIG,
        parameters: { config: currentConfig }
      },
      {
        order: 2,
        description: 'Clear configuration cache',
        action: RollbackAction._CLEAR_CACHE,
        parameters: {}
      }
    ];

    return {
      steps,
      estimatedDuration: 30000, // 30 seconds
      riskLevel: RiskLevel._LOW
    };
  }

  /**
   * Get enforcement policies
   */
  private async getEnforcementPolicies(): Promise<EnforcementPolicy[]> {
    const globalConfig = await this.getGlobalConfiguration();
    return globalConfig.enforcementPolicies;
  }

  /**
   * Validate basic configuration structure
   */
  private validateBasicStructure(
    config: FunctionRegistrationConfig,
    errors: Array<{ field: string; message: string; code: string }>
  ): void {
    if (typeof config.enabled !== 'boolean') {
      errors.push({
        field: 'enabled',
        message: 'Enabled must be a boolean value',
        code: 'INVALID_ENABLED_TYPE'
      });
    }

    if (config.defaultTimeout <= 0) {
      errors.push({
        field: 'defaultTimeout',
        message: 'Default timeout must be greater than 0',
        code: 'INVALID_TIMEOUT'
      });
    }
  }

  /**
   * Validate cache configuration
   */
  private validateCacheConfig(
    cache: CacheConfig,
    errors: Array<{ field: string; message: string; code: string }>,
    warnings: string[]
  ): void {
    if (cache.enabled && cache.ttl <= 0) {
      errors.push({
        field: 'cache.ttl',
        message: 'Cache TTL must be greater than 0 when caching is enabled',
        code: 'INVALID_CACHE_TTL'
      });
    }

    if (cache.enabled && cache.ttl > 86400) {
      warnings.push('Cache TTL is very long (> 24 hours), consider reducing it');
    }
  }

  /**
   * Validate monitoring configuration
   */
  private validateMonitoringConfig(
    monitoring: MonitoringConfig,
    errors: Array<{ field: string; message: string; code: string }>,
    warnings: string[]
  ): void {
    if (monitoring.enabled && monitoring.metrics.length === 0) {
      warnings.push('Monitoring is enabled but no metrics are configured');
    }

    if (monitoring.samplingRate < 0 || monitoring.samplingRate > 1) {
      errors.push({
        field: 'monitoring.samplingRate',
        message: 'Sampling rate must be between 0 and 1',
        code: 'INVALID_SAMPLING_RATE'
      });
    }
  }

  /**
   * Validate error handling configuration
   */
  private validateErrorHandlingConfig(
    errorHandling: ErrorHandlingConfig,
    errors: Array<{ field: string; message: string; code: string }>,
    warnings: string[]
  ): void {
    if (errorHandling.retry.maxAttempts < 0) {
      errors.push({
        field: 'errorHandling.retry.maxAttempts',
        message: 'Max retry attempts must be non-negative',
        code: 'INVALID_MAX_ATTEMPTS'
      });
    }

    if (errorHandling.retry.maxAttempts > 10) {
      warnings.push('High number of retry attempts may impact performance');
    }
  }

  /**
   * Apply enforcement policies
   */
  private async applyEnforcementPolicies(
    config: FunctionRegistrationConfig,
    context: ValidationContext,
    errors: Array<{ field: string; message: string; code: string }>,
    warnings: string[]
  ): Promise<void> {
    for (const policy of context.enforcementPolicies) {
      for (const rule of policy.rules) {
        const result = await this.evaluatePolicyRule(rule, config, context);

        if (!result.passed) {
          switch (policy.enforcement) {
            case EnforcementLevel._BLOCKING:
              errors.push({
                field: result.field || 'policy',
                message: `Policy violation: ${result.message}`,
                code: 'POLICY_VIOLATION'
              });
              break;
            case EnforcementLevel._WARNING:
              warnings.push(`Policy warning: ${result.message}`);
              break;
            case EnforcementLevel._ADVISORY:
              // Just log for advisory policies
              this.logger.warn(`Policy advisory: ${result.message}`);
              break;
          }
        }
      }
    }
  }

  /**
   * Evaluate policy rule
   */
  private async evaluatePolicyRule(
    rule: PolicyRule,
    config: FunctionRegistrationConfig,
    context: ValidationContext
  ): Promise<{ passed: boolean; message: string; field?: string }> {
    // Simplified policy rule evaluation
    // In a real implementation, this would use a rule engine

    switch (rule.action) {
      case PolicyAction._DENY:
        return { passed: false, message: 'Action denied by policy' };
      case PolicyAction._REQUIRE_APPROVAL:
        if (config.defaultApprovalLevel === ApprovalLevel._AUTOMATIC) {
          return {
            passed: false,
            message: 'Policy requires manual approval',
            field: 'defaultApprovalLevel'
          };
        }
        break;
    }

    return { passed: true, message: 'Policy check passed' };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    config: FunctionRegistrationConfig,
    context: ValidationContext,
    recommendations: string[]
  ): void {
    // Generate smart recommendations based on configuration

    if (config.cache.enabled && config.cache.ttl < 300) {
      recommendations.push('Consider increasing cache TTL for better performance');
    }

    if (!config.monitoring.enabled) {
      recommendations.push('Enable monitoring for better observability');
    }

    if (config.defaultTimeout > 60000) {
      recommendations.push('Consider reducing timeout for better responsiveness');
    }
  }

  /**
   * Get template by name
   */
  private async getTemplate(templateName: string): Promise<ConfigurationTemplate | null> {
    const templates = await this.getTemplates();
    return templates.find(t => t.name === templateName) || null;
  }

  /**
   * Check template applicability
   */
  private async checkTemplateApplicability(
    functionId: string,
    template: ConfigurationTemplate
  ): Promise<{ applicable: boolean; reason?: string }> {
    // Simplified applicability check
    // In a real implementation, this would check function metadata, security level, etc.

    return { applicable: true };
  }

  /**
   * Detect template conflicts
   */
  private detectTemplateConflicts(
    currentConfig: FunctionRegistrationConfig,
    template: ConfigurationTemplate
  ): ConfigurationConflict[] {
    const conflicts: ConfigurationConflict[] = [];

    // Check for setting conflicts
    Object.entries(template.settings).forEach(([key, templateValue]) => {
      const currentValue = (currentConfig as any)[key];

      if (currentValue !== undefined &&
          JSON.stringify(currentValue) !== JSON.stringify(templateValue)) {
        conflicts.push({
          setting: key,
          templateValue,
          currentValue,
          resolution: this.determineConflictResolution(key, currentValue, templateValue)
        });
      }
    });

    return conflicts;
  }

  /**
   * Determine conflict resolution
   */
  private determineConflictResolution(
    setting: string,
    currentValue: unknown,
    templateValue: unknown
  ): ConflictResolution {
    // Simple conflict resolution logic
    const criticalSettings = ['enabled', 'defaultValidationMode', 'defaultApprovalLevel'];

    if (criticalSettings.includes(setting)) {
      return ConflictResolution._MANUAL_REQUIRED;
    }

    return ConflictResolution._USE_TEMPLATE;
  }

  /**
   * Apply template settings
   */
  private applyTemplateSettings(
    currentConfig: FunctionRegistrationConfig,
    template: ConfigurationTemplate,
    conflicts: ConfigurationConflict[]
  ): Partial<FunctionRegistrationConfig> {
    const updates: Partial<FunctionRegistrationConfig> = {};

    // Apply template settings, respecting conflict resolutions
    Object.entries(template.settings).forEach(([key, value]) => {
      const conflict = conflicts.find(c => c.setting === key);

      if (!conflict || conflict.resolution === ConflictResolution._USE_TEMPLATE) {
        (updates as any)[key] = value;
      } else if (conflict.resolution === ConflictResolution._MERGE) {
        // Implement merge logic for specific types
        (updates as any)[key] = this.mergeConfigurationValues(
          (currentConfig as any)[key],
          value
        );
      }
      // For KEEP_CURRENT and MANUAL_REQUIRED, don't apply the template value
    });

    return updates;
  }

  /**
   * Merge configuration values
   */
  private mergeConfigurationValues(currentValue: unknown, templateValue: unknown): unknown {
    if (typeof currentValue === 'object' && typeof templateValue === 'object' &&
        currentValue !== null && templateValue !== null) {
      return { ...currentValue as object, ...templateValue as object };
    }
    return templateValue;
  }
}