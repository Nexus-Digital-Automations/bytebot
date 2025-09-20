/**
 * PARLANT Phase 1 Function Registration System - Core Interfaces
 *
 * Defines the core interfaces for function registry operations including
 * registration, discovery, configuration management, and administrative functions.
 *
 * @fileoverview Core registry interfaces for PARLANT function wrapping system
 * @version 1.0.0
 * @author Function Registration System Agent #2
 */

import {
  FunctionRegistryEntry,
  FunctionDiscoveryResult,
  RegistryQuery,
  RegistryQueryResult,
  FunctionDiscoveryEntry,
  DiscoveryConfiguration,
  FunctionRegistrationConfig,
  FunctionHealthStatus,
  FunctionVersionInfo,
  RegistrationStatus
} from './registry.types';

// Re-export commonly used types
export {
  FunctionRegistrationConfig,
  FunctionHealthStatus,
  FunctionVersionInfo
};

// ===========================
// CORE REGISTRY INTERFACES
// ===========================

/**
 * Main registry interface for function registration and management
 */
export interface IFunctionRegistry {
  /**
   * Register a function in the registry
   * @param entry Function registry entry to register
   * @returns Promise resolving to registration result
   */
  register(entry: FunctionRegistryEntry): Promise<RegistrationResult>;

  /**
   * Unregister a function from the registry
   * @param functionId Function ID to unregister
   * @returns Promise resolving to unregistration result
   */
  unregister(functionId: string): Promise<UnregistrationResult>;

  /**
   * Update function registration
   * @param functionId Function ID to update
   * @param updates Partial updates to apply
   * @returns Promise resolving to update result
   */
  update(
    functionId: string,
    updates: Partial<FunctionRegistryEntry>
  ): Promise<UpdateResult>;

  /**
   * Get function by ID
   * @param functionId Function ID to retrieve
   * @returns Promise resolving to function entry or null
   */
  get(functionId: string): Promise<FunctionRegistryEntry | null>;

  /**
   * Query functions in the registry
   * @param query Query parameters
   * @returns Promise resolving to query results
   */
  query(query: RegistryQuery): Promise<RegistryQueryResult>;

  /**
   * Check if function exists in registry
   * @param functionId Function ID to check
   * @returns Promise resolving to existence status
   */
  exists(functionId: string): Promise<boolean>;

  /**
   * Get registry statistics
   * @returns Promise resolving to registry statistics
   */
  getStatistics(): Promise<RegistryStatistics>;

  /**
   * Validate registry integrity
   * @returns Promise resolving to validation result
   */
  validateIntegrity(): Promise<IntegrityValidationResult>;

  /**
   * Export registry data
   * @param options Export options
   * @returns Promise resolving to export result
   */
  export(options: ExportOptions): Promise<ExportResult>;

  /**
   * Import registry data
   * @param data Data to import
   * @param options Import options
   * @returns Promise resolving to import result
   */
  import(data: unknown, options: ImportOptions): Promise<ImportResult>;
}

/**
 * Function discovery interface for automatic function detection
 */
export interface IFunctionDiscovery {
  /**
   * Discover functions in specified scope
   * @param configuration Discovery configuration
   * @returns Promise resolving to discovery results
   */
  discover(configuration: DiscoveryConfiguration): Promise<FunctionDiscoveryResult>;

  /**
   * Discover functions in file
   * @param filePath Path to file to analyze
   * @returns Promise resolving to discovered functions
   */
  discoverInFile(filePath: string): Promise<FunctionDiscoveryEntry[]>;

  /**
   * Discover functions in directory
   * @param directoryPath Path to directory to scan
   * @param recursive Whether to scan recursively
   * @returns Promise resolving to discovered functions
   */
  discoverInDirectory(
    directoryPath: string,
    recursive: boolean
  ): Promise<FunctionDiscoveryEntry[]>;

  /**
   * Re-discover functions (update existing discoveries)
   * @param functionIds Function IDs to re-discover
   * @returns Promise resolving to re-discovery results
   */
  rediscover(functionIds: string[]): Promise<RediscoveryResult>;

  /**
   * Get discovery capabilities
   * @returns Available discovery methods and features
   */
  getCapabilities(): DiscoveryCapabilities;

  /**
   * Validate discovery configuration
   * @param configuration Configuration to validate
   * @returns Validation result
   */
  validateConfiguration(
    configuration: DiscoveryConfiguration
  ): ConfigurationValidationResult;
}

/**
 * Configuration management interface for runtime function configuration
 */
export interface IConfigurationManager {
  /**
   * Get function configuration
   * @param functionId Function ID
   * @returns Promise resolving to function configuration
   */
  getConfiguration(functionId: string): Promise<FunctionRegistrationConfig | null>;

  /**
   * Update function configuration
   * @param functionId Function ID
   * @param config New configuration
   * @returns Promise resolving to update result
   */
  updateConfiguration(
    functionId: string,
    config: Partial<FunctionRegistrationConfig>
  ): Promise<ConfigurationUpdateResult>;

  /**
   * Reset configuration to defaults
   * @param functionId Function ID
   * @returns Promise resolving to reset result
   */
  resetConfiguration(functionId: string): Promise<ConfigurationResetResult>;

  /**
   * Get global configuration
   * @returns Promise resolving to global configuration
   */
  getGlobalConfiguration(): Promise<GlobalConfiguration>;

  /**
   * Update global configuration
   * @param config Global configuration updates
   * @returns Promise resolving to update result
   */
  updateGlobalConfiguration(
    config: Partial<GlobalConfiguration>
  ): Promise<GlobalConfigurationUpdateResult>;

  /**
   * Validate configuration
   * @param config Configuration to validate
   * @returns Validation result
   */
  validateConfiguration(
    config: FunctionRegistrationConfig
  ): ConfigurationValidationResult;

  /**
   * Apply configuration template
   * @param functionId Function ID
   * @param templateName Template name
   * @returns Promise resolving to application result
   */
  applyTemplate(
    functionId: string,
    templateName: string
  ): Promise<TemplateApplicationResult>;

  /**
   * Get available configuration templates
   * @returns Available configuration templates
   */
  getTemplates(): Promise<ConfigurationTemplate[]>;
}

/**
 * Health monitoring interface for function health tracking
 */
export interface IHealthMonitor {
  /**
   * Check function health
   * @param functionId Function ID
   * @returns Promise resolving to health status
   */
  checkHealth(functionId: string): Promise<FunctionHealthStatus>;

  /**
   * Check health of multiple functions
   * @param functionIds Function IDs to check
   * @returns Promise resolving to health statuses
   */
  checkMultipleHealth(functionIds: string[]): Promise<HealthCheckResults>;

  /**
   * Check health of all registered functions
   * @returns Promise resolving to comprehensive health report
   */
  checkAllHealth(): Promise<ComprehensiveHealthReport>;

  /**
   * Get health history
   * @param functionId Function ID
   * @param timeRange Time range for history
   * @returns Promise resolving to health history
   */
  getHealthHistory(
    functionId: string,
    timeRange: TimeRange
  ): Promise<HealthHistory>;

  /**
   * Set health alert thresholds
   * @param functionId Function ID
   * @param thresholds Alert thresholds
   * @returns Promise resolving to threshold setting result
   */
  setAlertThresholds(
    functionId: string,
    thresholds: HealthThreshold[]
  ): Promise<ThresholdSettingResult>;

  /**
   * Get health metrics
   * @param functionId Function ID
   * @param metrics Metrics to retrieve
   * @returns Promise resolving to health metrics
   */
  getHealthMetrics(
    functionId: string,
    metrics: string[]
  ): Promise<HealthMetrics>;

  /**
   * Start health monitoring
   * @param functionId Function ID
   * @param interval Monitoring interval in milliseconds
   * @returns Promise resolving to monitoring session
   */
  startMonitoring(
    functionId: string,
    interval: number
  ): Promise<MonitoringSession>;

  /**
   * Stop health monitoring
   * @param sessionId Monitoring session ID
   * @returns Promise resolving to stop result
   */
  stopMonitoring(sessionId: string): Promise<MonitoringStopResult>;
}

/**
 * Version management interface for function versioning
 */
export interface IVersionManager {
  /**
   * Get function version information
   * @param functionId Function ID
   * @returns Promise resolving to version information
   */
  getVersionInfo(functionId: string): Promise<FunctionVersionInfo | null>;

  /**
   * Create new version
   * @param functionId Function ID
   * @param versionData Version data
   * @returns Promise resolving to version creation result
   */
  createVersion(
    functionId: string,
    versionData: VersionCreationData
  ): Promise<VersionCreationResult>;

  /**
   * Compare versions
   * @param functionId Function ID
   * @param version1 First version
   * @param version2 Second version
   * @returns Promise resolving to version comparison
   */
  compareVersions(
    functionId: string,
    version1: string,
    version2: string
  ): Promise<VersionComparisonResult>;

  /**
   * Get migration plan
   * @param functionId Function ID
   * @param fromVersion Source version
   * @param toVersion Target version
   * @returns Promise resolving to migration plan
   */
  getMigrationPlan(
    functionId: string,
    fromVersion: string,
    toVersion: string
  ): Promise<MigrationPlan>;

  /**
   * Execute migration
   * @param migrationPlan Migration plan to execute
   * @returns Promise resolving to migration result
   */
  executeMigration(migrationPlan: MigrationPlan): Promise<MigrationExecutionResult>;

  /**
   * Rollback version
   * @param functionId Function ID
   * @param targetVersion Version to rollback to
   * @returns Promise resolving to rollback result
   */
  rollbackVersion(
    functionId: string,
    targetVersion: string
  ): Promise<RollbackResult>;

  /**
   * Get version compatibility matrix
   * @param functionId Function ID
   * @returns Promise resolving to compatibility matrix
   */
  getCompatibilityMatrix(functionId: string): Promise<CompatibilityMatrix>;

  /**
   * Archive old versions
   * @param functionId Function ID
   * @param retentionPolicy Retention policy
   * @returns Promise resolving to archival result
   */
  archiveVersions(
    functionId: string,
    retentionPolicy: RetentionPolicy
  ): Promise<ArchivalResult>;
}

/**
 * Dependency tracking interface for function dependencies
 */
export interface IDependencyTracker {
  /**
   * Analyze function dependencies
   * @param functionId Function ID
   * @returns Promise resolving to dependency analysis
   */
  analyzeDependencies(functionId: string): Promise<DependencyAnalysis>;

  /**
   * Get dependency graph
   * @param functionIds Function IDs to include in graph
   * @returns Promise resolving to dependency graph
   */
  getDependencyGraph(functionIds: string[]): Promise<DependencyGraph>;

  /**
   * Find circular dependencies
   * @param functionIds Function IDs to check
   * @returns Promise resolving to circular dependency analysis
   */
  findCircularDependencies(functionIds: string[]): Promise<CircularDependencyAnalysis>;

  /**
   * Get impact analysis
   * @param functionId Function ID
   * @param changeType Type of change
   * @returns Promise resolving to impact analysis
   */
  getImpactAnalysis(
    functionId: string,
    changeType: ChangeType
  ): Promise<ImpactAnalysis>;

  /**
   * Update dependency information
   * @param functionId Function ID
   * @param dependencies New dependency information
   * @returns Promise resolving to update result
   */
  updateDependencies(
    functionId: string,
    dependencies: DependencyUpdate
  ): Promise<DependencyUpdateResult>;

  /**
   * Validate dependency consistency
   * @param functionIds Function IDs to validate
   * @returns Promise resolving to validation result
   */
  validateConsistency(functionIds: string[]): Promise<ConsistencyValidationResult>;

  /**
   * Optimize dependency resolution
   * @param functionIds Function IDs to optimize
   * @returns Promise resolving to optimization result
   */
  optimizeResolution(functionIds: string[]): Promise<OptimizationResult>;
}

/**
 * Administrative interface for registry management
 */
export interface IRegistryAdmin {
  /**
   * Perform registry maintenance
   * @param options Maintenance options
   * @returns Promise resolving to maintenance result
   */
  performMaintenance(options: MaintenanceOptions): Promise<MaintenanceResult>;

  /**
   * Backup registry
   * @param options Backup options
   * @returns Promise resolving to backup result
   */
  backup(options: BackupOptions): Promise<BackupResult>;

  /**
   * Restore registry from backup
   * @param backupId Backup ID to restore
   * @param options Restore options
   * @returns Promise resolving to restore result
   */
  restore(backupId: string, options: RestoreOptions): Promise<RestoreResult>;

  /**
   * Get registry metrics
   * @param timeRange Time range for metrics
   * @returns Promise resolving to registry metrics
   */
  getMetrics(timeRange: TimeRange): Promise<RegistryMetrics>;

  /**
   * Configure registry settings
   * @param settings Registry settings
   * @returns Promise resolving to configuration result
   */
  configureRegistry(settings: RegistrySettings): Promise<ConfigurationResult>;

  /**
   * Get audit log
   * @param options Audit log options
   * @returns Promise resolving to audit log
   */
  getAuditLog(options: AuditLogOptions): Promise<AuditLog>;

  /**
   * Purge inactive functions
   * @param criteria Purge criteria
   * @returns Promise resolving to purge result
   */
  purgeInactive(criteria: PurgeCriteria): Promise<PurgeResult>;

  /**
   * Rebuild registry indices
   * @returns Promise resolving to rebuild result
   */
  rebuildIndices(): Promise<IndexRebuildResult>;

  /**
   * Get registry status
   * @returns Promise resolving to registry status
   */
  getStatus(): Promise<RegistryStatus>;
}

// ===========================
// SUPPORTING TYPES
// ===========================

export interface RegistrationResult {
  success: boolean;
  functionId: string;
  message: string;
  warnings: string[];
  metadata: Record<string, unknown>;
}

export interface UnregistrationResult {
  success: boolean;
  functionId: string;
  message: string;
  affectedDependencies: string[];
}

export interface UpdateResult {
  success: boolean;
  functionId: string;
  message: string;
  updatedFields: string[];
  validationErrors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface RegistryStatistics {
  totalFunctions: number;
  activeFunctions: number;
  inactiveFunctions: number;
  deprecatedFunctions: number;
  averageHealthScore: number;
  lastUpdateTime: Date;
  registrySize: number;
  indexSize: number;
}

export interface IntegrityValidationResult {
  valid: boolean;
  issues: IntegrityIssue[];
  fixableIssues: number;
  criticalIssues: number;
  recommendedActions: string[];
}

export interface IntegrityIssue {
  type: IntegrityIssueType;
  functionId: string;
  description: string;
  severity: IssueSeverity;
  fixable: boolean;
}

export enum IntegrityIssueType {
  _MISSING_DEPENDENCY = "missing_dependency",
  _CIRCULAR_DEPENDENCY = "circular_dependency",
  _ORPHANED_FUNCTION = "orphaned_function",
  _INVALID_CONFIGURATION = "invalid_configuration",
  _CORRUPTED_METADATA = "corrupted_metadata"
}

export enum IssueSeverity {
  _LOW = "low",
  _MEDIUM = "medium",
  _HIGH = "high",
  _CRITICAL = "critical"
}

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  includeConfiguration: boolean;
  includeDependencies: boolean;
  compression: boolean;
  encryption: boolean;
}

export enum ExportFormat {
  _JSON = "json",
  _XML = "xml",
  _YAML = "yaml",
  _BINARY = "binary"
}

export interface ExportResult {
  success: boolean;
  exportPath: string;
  size: number;
  checksum: string;
  metadata: ExportMetadata;
}

export interface ExportMetadata {
  exportTime: Date;
  version: string;
  functionCount: number;
  format: ExportFormat;
}

export interface ImportOptions {
  validate: boolean;
  overwriteExisting: boolean;
  preserveIds: boolean;
  updateTimestamps: boolean;
}

export interface ImportResult {
  success: boolean;
  importedFunctions: number;
  skippedFunctions: number;
  errors: ImportError[];
  warnings: string[];
}

export interface ImportError {
  functionId: string;
  error: string;
  line?: number;
}

export interface RediscoveryResult {
  totalProcessed: number;
  successfulRediscoveries: number;
  failedRediscoveries: number;
  changesDetected: DiscoveryChange[];
  errors: DiscoveryError[];
}

export interface DiscoveryChange {
  functionId: string;
  changeType: DiscoveryChangeType;
  oldValue: unknown;
  newValue: unknown;
}

export enum DiscoveryChangeType {
  _SIGNATURE_CHANGE = "signature_change",
  _LOCATION_CHANGE = "location_change",
  _METADATA_CHANGE = "metadata_change",
  _DEPENDENCY_CHANGE = "dependency_change"
}

export interface DiscoveryError {
  functionId: string;
  error: string;
  context: Record<string, unknown>;
}

export interface DiscoveryCapabilities {
  supportedLanguages: string[];
  supportedMethods: string[];
  maxFileSize: number;
  maxFunctions: number;
  parallelProcessing: boolean;
}

export interface ConfigurationValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  recommendations: string[];
}

export interface ConfigurationUpdateResult {
  success: boolean;
  updatedFields: string[];
  validationErrors: ValidationError[];
  rollbackRequired: boolean;
}

export interface ConfigurationResetResult {
  success: boolean;
  resetFields: string[];
  backupCreated: boolean;
}

export interface GlobalConfiguration {
  defaultSettings: FunctionRegistrationConfig;
  enforcementPolicies: EnforcementPolicy[];
  securitySettings: SecuritySettings;
  performanceSettings: PerformanceSettings;
}

export interface EnforcementPolicy {
  name: string;
  rules: PolicyRule[];
  enforcement: EnforcementLevel;
}

export interface PolicyRule {
  condition: string;
  action: PolicyAction;
  parameters: Record<string, unknown>;
}

export enum PolicyAction {
  _ALLOW = "allow",
  _DENY = "deny",
  _WARN = "warn",
  _REQUIRE_APPROVAL = "require_approval"
}

export enum EnforcementLevel {
  _ADVISORY = "advisory",
  _WARNING = "warning",
  _BLOCKING = "blocking"
}

export interface SecuritySettings {
  encryptionEnabled: boolean;
  auditingLevel: AuditLevel;
  accessControlEnabled: boolean;
  defaultSecurityLevel: SecurityLevel;
}

export enum AuditLevel {
  _NONE = "none",
  _BASIC = "basic",
  _DETAILED = "detailed",
  _COMPREHENSIVE = "comprehensive"
}

export enum SecurityLevel {
  _MINIMAL = "minimal",
  _LOW = "low",
  _MEDIUM = "medium",
  _HIGH = "high",
  _CRITICAL = "critical"
}

export interface PerformanceSettings {
  cacheEnabled: boolean;
  maxCacheSize: number;
  queryTimeout: number;
  batchSize: number;
}

export interface GlobalConfigurationUpdateResult {
  success: boolean;
  affectedFunctions: string[];
  migrationRequired: boolean;
  rollbackPlan: RollbackPlan;
}

export interface RollbackPlan {
  steps: RollbackStep[];
  estimatedDuration: number;
  riskLevel: RiskLevel;
}

export interface RollbackStep {
  order: number;
  description: string;
  action: RollbackAction;
  parameters: Record<string, unknown>;
}

export enum RollbackAction {
  _RESTORE_CONFIG = "restore_config",
  _RESTART_SERVICE = "restart_service",
  _CLEAR_CACHE = "clear_cache",
  _REBUILD_INDEX = "rebuild_index"
}

export enum RiskLevel {
  _LOW = "low",
  _MEDIUM = "medium",
  _HIGH = "high",
  _CRITICAL = "critical"
}

export interface TemplateApplicationResult {
  success: boolean;
  appliedSettings: string[];
  conflicts: ConfigurationConflict[];
}

export interface ConfigurationConflict {
  setting: string;
  templateValue: unknown;
  currentValue: unknown;
  resolution: ConflictResolution;
}

export enum ConflictResolution {
  _USE_TEMPLATE = "use_template",
  _KEEP_CURRENT = "keep_current",
  _MERGE = "merge",
  _MANUAL_REQUIRED = "manual_required"
}

export interface ConfigurationTemplate {
  name: string;
  description: string;
  category: TemplateCategory;
  settings: Partial<FunctionRegistrationConfig>;
  applicability: TemplateApplicability;
}

export enum TemplateCategory {
  _SECURITY = "security",
  _PERFORMANCE = "performance",
  _MONITORING = "monitoring",
  _DEVELOPMENT = "development",
  _PRODUCTION = "production"
}

export interface TemplateApplicability {
  functionTypes: string[];
  securityLevels: SecurityLevel[];
  environments: string[];
}

export interface HealthCheckResults {
  results: Map<string, FunctionHealthStatus>;
  summary: HealthSummary;
  timestamp: Date;
}

export interface HealthSummary {
  totalFunctions: number;
  healthyFunctions: number;
  unhealthyFunctions: number;
  averageHealthScore: number;
  criticalIssues: number;
}

export interface ComprehensiveHealthReport {
  summary: HealthSummary;
  functionDetails: Map<string, FunctionHealthStatus>;
  trends: HealthTrend[];
  recommendations: HealthRecommendation[];
  alerts: HealthAlert[];
}

export interface HealthTrend {
  metric: string;
  trend: TrendDirection;
  change: number;
  timeframe: string;
}

export enum TrendDirection {
  _IMPROVING = "improving",
  _STABLE = "stable",
  _DEGRADING = "degrading"
}

export interface HealthRecommendation {
  functionId: string;
  recommendation: string;
  priority: RecommendationPriority;
  estimatedImpact: string;
}

export enum RecommendationPriority {
  _LOW = "low",
  _MEDIUM = "medium",
  _HIGH = "high",
  _URGENT = "urgent"
}

export interface HealthAlert {
  functionId: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
}

export enum AlertType {
  _PERFORMANCE_DEGRADATION = "performance_degradation",
  _ERROR_RATE_SPIKE = "error_rate_spike",
  _AVAILABILITY_ISSUE = "availability_issue",
  _SECURITY_CONCERN = "security_concern"
}

export enum AlertSeverity {
  _INFO = "info",
  _WARNING = "warning",
  _ERROR = "error",
  _CRITICAL = "critical"
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface HealthHistory {
  functionId: string;
  timeRange: TimeRange;
  dataPoints: HealthDataPoint[];
  summary: HealthHistorySummary;
}

export interface HealthDataPoint {
  timestamp: Date;
  score: number;
  metrics: Record<string, number>;
  events: HealthEvent[];
}

export interface HealthEvent {
  timestamp: Date;
  type: HealthEventType;
  description: string;
  impact: number;
}

export enum HealthEventType {
  _PERFORMANCE_SPIKE = "performance_spike",
  _ERROR_OCCURRED = "error_occurred",
  _RECOVERY = "recovery",
  _MAINTENANCE = "maintenance"
}

export interface HealthHistorySummary {
  averageScore: number;
  minimumScore: number;
  maximumScore: number;
  trendDirection: TrendDirection;
  significantEvents: HealthEvent[];
}

export interface HealthThreshold {
  metric: string;
  warningThreshold: number;
  criticalThreshold: number;
  operator: ComparisonOperator;
}

export enum ComparisonOperator {
  _GREATER_THAN = "gt",
  _LESS_THAN = "lt",
  _EQUALS = "eq"
}

export interface ThresholdSettingResult {
  success: boolean;
  appliedThresholds: string[];
  conflicts: ThresholdConflict[];
}

export interface ThresholdConflict {
  metric: string;
  existingThreshold: number;
  newThreshold: number;
  resolution: ConflictResolution;
}

export interface HealthMetrics {
  functionId: string;
  timestamp: Date;
  metrics: Map<string, MetricValue>;
}

export interface MetricValue {
  value: number;
  unit: string;
  trend: TrendDirection;
  history: number[];
}

export interface MonitoringSession {
  sessionId: string;
  functionId: string;
  interval: number;
  startTime: Date;
  configuration: MonitoringConfiguration;
}

export interface MonitoringConfiguration {
  metrics: string[];
  alertingEnabled: boolean;
  historicalData: boolean;
  realTimeUpdates: boolean;
}

export interface MonitoringStopResult {
  success: boolean;
  sessionId: string;
  duration: number;
  dataPointsCollected: number;
}

export interface VersionCreationData {
  version: string;
  description: string;
  changes: VersionChange[];
  author: string;
  breaking: boolean;
}

export interface VersionChange {
  type: ChangeType;
  description: string;
  files: string[];
}

export enum ChangeType {
  _FEATURE = "feature",
  _BUGFIX = "bugfix",
  _PERFORMANCE = "performance",
  _SECURITY = "security",
  _BREAKING = "breaking"
}

export interface VersionCreationResult {
  success: boolean;
  versionId: string;
  conflicts: VersionConflict[];
  migrationPlan?: MigrationPlan;
}

export interface VersionConflict {
  type: ConflictType;
  description: string;
  resolution: ConflictResolution;
}

export enum ConflictType {
  _VERSION_EXISTS = "version_exists",
  _INCOMPATIBLE_CHANGE = "incompatible_change",
  _DEPENDENCY_CONFLICT = "dependency_conflict"
}

export interface VersionComparisonResult {
  functionId: string;
  version1: string;
  version2: string;
  differences: VersionDifference[];
  compatibility: CompatibilityAssessment;
}

export interface VersionDifference {
  category: DifferenceCategory;
  description: string;
  impact: ImpactLevel;
  breaking: boolean;
}

export enum DifferenceCategory {
  _SIGNATURE = "signature",
  _BEHAVIOR = "behavior",
  _PERFORMANCE = "performance",
  _DEPENDENCIES = "dependencies"
}

export enum ImpactLevel {
  _NONE = "none",
  _LOW = "low",
  _MEDIUM = "medium",
  _HIGH = "high"
}

export interface CompatibilityAssessment {
  backwardCompatible: boolean;
  forwardCompatible: boolean;
  migrationRequired: boolean;
  riskLevel: RiskLevel;
}

export interface MigrationPlan {
  planId: string;
  functionId: string;
  sourceVersion: string;
  targetVersion: string;
  steps: MigrationStep[];
  estimatedDuration: number;
  riskAssessment: RiskAssessment;
}

export interface MigrationStep {
  stepId: string;
  order: number;
  description: string;
  type: MigrationStepType;
  automated: boolean;
  duration: number;
  dependencies: string[];
}

export enum MigrationStepType {
  _PREPARATION = "preparation",
  _CODE_UPDATE = "code_update",
  _CONFIGURATION_UPDATE = "configuration_update",
  _DATA_MIGRATION = "data_migration",
  _TESTING = "testing",
  _DEPLOYMENT = "deployment",
  _VERIFICATION = "verification"
}

export interface RiskAssessment {
  overallRisk: RiskLevel;
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
}

export interface RiskFactor {
  category: RiskCategory;
  description: string;
  likelihood: Likelihood;
  impact: ImpactLevel;
}

export enum RiskCategory {
  _TECHNICAL = "technical",
  _OPERATIONAL = "operational",
  _SECURITY = "security",
  _COMPLIANCE = "compliance"
}

export enum Likelihood {
  _LOW = "low",
  _MEDIUM = "medium",
  _HIGH = "high"
}

export interface MigrationExecutionResult {
  success: boolean;
  completedSteps: string[];
  failedSteps: string[];
  rollbackRequired: boolean;
  duration: number;
}

export interface RollbackResult {
  success: boolean;
  rolledBackVersion: string;
  affectedComponents: string[];
  verificationResults: VerificationResult[];
}

export interface VerificationResult {
  component: string;
  verified: boolean;
  issues: string[];
}

export interface CompatibilityMatrix {
  functionId: string;
  versions: string[];
  matrix: CompatibilityEntry[][];
}

export interface CompatibilityEntry {
  compatible: boolean;
  migrationRequired: boolean;
  riskLevel: RiskLevel;
}

export interface RetentionPolicy {
  maxVersions: number;
  maxAge: number;
  preserveReleases: boolean;
  preserveTags: string[];
}

export interface ArchivalResult {
  success: boolean;
  archivedVersions: string[];
  preservedVersions: string[];
  spaceSaved: number;
}

export interface DependencyAnalysis {
  functionId: string;
  directDependencies: DependencyInfo[];
  transitiveDependencies: DependencyInfo[];
  dependents: DependencyInfo[];
  circularDependencies: CircularDependency[];
  riskAssessment: DependencyRiskAssessment;
}

export interface DependencyInfo {
  functionId: string;
  type: DependencyType;
  strength: DependencyStrength;
  version: string;
  optional: boolean;
}

export enum DependencyType {
  _DIRECT = "direct",
  _TRANSITIVE = "transitive",
  _DEVELOPMENT = "development",
  _RUNTIME = "runtime"
}

export enum DependencyStrength {
  _WEAK = "weak",
  _MODERATE = "moderate",
  _STRONG = "strong"
}

export interface CircularDependency {
  cycle: string[];
  severity: CircularDependencySeverity;
  resolutionSuggestions: string[];
}

export enum CircularDependencySeverity {
  _LOW = "low",
  _MEDIUM = "medium",
  _HIGH = "high"
}

export interface DependencyRiskAssessment {
  overallRisk: RiskLevel;
  risks: DependencyRisk[];
  recommendations: string[];
}

export interface DependencyRisk {
  type: DependencyRiskType;
  description: string;
  severity: RiskLevel;
  affectedFunctions: string[];
}

export enum DependencyRiskType {
  _VERSION_MISMATCH = "version_mismatch",
  _CIRCULAR_DEPENDENCY = "circular_dependency",
  _DEPRECATED_DEPENDENCY = "deprecated_dependency",
  _SECURITY_VULNERABILITY = "security_vulnerability"
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  metadata: GraphMetadata;
}

export interface DependencyNode {
  id: string;
  functionId: string;
  metadata: NodeMetadata;
}

export interface NodeMetadata {
  level: number;
  criticalPath: boolean;
  riskScore: number;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: DependencyType;
  strength: DependencyStrength;
}

export interface GraphMetadata {
  totalNodes: number;
  totalEdges: number;
  maxDepth: number;
  complexityScore: number;
}

export interface CircularDependencyAnalysis {
  cyclesFound: CircularDependency[];
  affectedFunctions: string[];
  resolutionPlan: CircularDependencyResolutionPlan;
}

export interface CircularDependencyResolutionPlan {
  strategies: ResolutionStrategy[];
  estimatedEffort: number;
  riskLevel: RiskLevel;
}

export interface ResolutionStrategy {
  name: string;
  description: string;
  steps: string[];
  impact: ImpactLevel;
}

export interface ImpactAnalysis {
  functionId: string;
  changeType: ChangeType;
  affectedFunctions: string[];
  impactLevel: ImpactLevel;
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
}

export interface DependencyUpdate {
  added: DependencyInfo[];
  modified: DependencyInfo[];
  removed: string[];
}

export interface DependencyUpdateResult {
  success: boolean;
  updatedDependencies: string[];
  conflicts: DependencyConflict[];
  validationErrors: ValidationError[];
}

export interface DependencyConflict {
  functionId: string;
  conflictType: ConflictType;
  description: string;
  resolution: ConflictResolution;
}

export interface ConsistencyValidationResult {
  consistent: boolean;
  inconsistencies: DependencyInconsistency[];
  recommendations: string[];
}

export interface DependencyInconsistency {
  type: InconsistencyType;
  description: string;
  affectedFunctions: string[];
  severity: IssueSeverity;
}

export enum InconsistencyType {
  _MISSING_DEPENDENCY = "missing_dependency",
  _ORPHANED_DEPENDENCY = "orphaned_dependency",
  _VERSION_CONFLICT = "version_conflict",
  _CIRCULAR_REFERENCE = "circular_reference"
}

export interface OptimizationResult {
  optimizedFunctions: string[];
  improvements: OptimizationImprovement[];
  metrics: OptimizationMetrics;
}

export interface OptimizationImprovement {
  type: OptimizationType;
  description: string;
  expectedBenefit: string;
  implementationEffort: number;
}

export enum OptimizationType {
  _DEPENDENCY_REDUCTION = "dependency_reduction",
  _LOAD_ORDER_OPTIMIZATION = "load_order_optimization",
  _CACHING_STRATEGY = "caching_strategy",
  _PARALLELIZATION = "parallelization"
}

export interface OptimizationMetrics {
  performanceGain: number;
  memoryReduction: number;
  dependencyReduction: number;
  complexityReduction: number;
}

export interface MaintenanceOptions {
  cleanupStaleData: boolean;
  rebuildIndices: boolean;
  compactStorage: boolean;
  validateIntegrity: boolean;
  optimizePerformance: boolean;
}

export interface MaintenanceResult {
  success: boolean;
  duration: number;
  actionsPerformed: MaintenanceAction[];
  issues: MaintenanceIssue[];
  recommendations: string[];
}

export interface MaintenanceAction {
  name: string;
  duration: number;
  result: ActionResult;
  details: string;
}

export enum ActionResult {
  _SUCCESS = "success",
  _WARNING = "warning",
  _FAILURE = "failure",
  _SKIPPED = "skipped"
}

export interface MaintenanceIssue {
  type: IssueType;
  description: string;
  severity: IssueSeverity;
  resolution: string;
}

export enum IssueType {
  _DATA_CORRUPTION = "data_corruption",
  _INDEX_CORRUPTION = "index_corruption",
  _PERFORMANCE_ISSUE = "performance_issue",
  _STORAGE_ISSUE = "storage_issue"
}

export interface BackupOptions {
  includeConfiguration: boolean;
  includeMetadata: boolean;
  includeHistory: boolean;
  compression: boolean;
  encryption: boolean;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  size: number;
  duration: number;
  location: string;
}

export interface RestoreOptions {
  restoreConfiguration: boolean;
  restoreMetadata: boolean;
  restoreHistory: boolean;
  validateAfterRestore: boolean;
}

export interface RestoreResult {
  success: boolean;
  restoredItems: number;
  duration: number;
  validationResults: ValidationResult[];
}

export interface ValidationResult {
  component: string;
  valid: boolean;
  issues: string[];
}

export interface RegistryMetrics {
  performance: PerformanceMetrics;
  usage: UsageMetrics;
  health: HealthMetrics;
  storage: StorageMetrics;
}

export interface PerformanceMetrics {
  averageQueryTime: number;
  averageRegistrationTime: number;
  indexEfficiency: number;
  cacheHitRate: number;
}

export interface UsageMetrics {
  queriesPerMinute: number;
  registrationsPerDay: number;
  activeUsers: number;
  popularFunctions: PopularFunction[];
}

export interface PopularFunction {
  functionId: string;
  accessCount: number;
  lastAccessed: Date;
}

export interface StorageMetrics {
  totalSize: number;
  indexSize: number;
  compressionRatio: number;
  fragmentationLevel: number;
}

export interface RegistrySettings {
  cacheSettings: CacheSettings;
  indexSettings: IndexSettings;
  securitySettings: SecuritySettings;
  performanceSettings: PerformanceSettings;
}

export interface CacheSettings {
  enabled: boolean;
  maxSize: number;
  ttl: number;
  evictionPolicy: EvictionPolicy;
}

export enum EvictionPolicy {
  _LRU = "lru",
  _LFU = "lfu",
  _TTL = "ttl"
}

export interface IndexSettings {
  autoRebuild: boolean;
  rebuildThreshold: number;
  optimizationLevel: OptimizationLevel;
}

export enum OptimizationLevel {
  _NONE = "none",
  _BASIC = "basic",
  _ADVANCED = "advanced",
  _AGGRESSIVE = "aggressive"
}

export interface ConfigurationResult {
  success: boolean;
  appliedSettings: string[];
  restartRequired: boolean;
  warnings: string[];
}

export interface AuditLogOptions {
  startTime: Date;
  endTime: Date;
  operations: AuditOperation[];
  users: string[];
  functions: string[];
}

export enum AuditOperation {
  _REGISTER = "register",
  _UNREGISTER = "unregister",
  _UPDATE = "update",
  _QUERY = "query",
  _CONFIGURE = "configure"
}

export interface AuditLog {
  entries: AuditEntry[];
  totalCount: number;
  timeRange: TimeRange;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  operation: AuditOperation;
  user: string;
  functionId?: string;
  details: Record<string, unknown>;
  result: OperationResult;
}

export enum OperationResult {
  _SUCCESS = "success",
  _FAILURE = "failure",
  _PARTIAL_SUCCESS = "partial_success"
}

export interface PurgeCriteria {
  inactiveThreshold: number;
  deprecatedOnly: boolean;
  preserveSystemFunctions: boolean;
  dryRun: boolean;
}

export interface PurgeResult {
  success: boolean;
  purgedFunctions: string[];
  preservedFunctions: string[];
  spaceSaved: number;
}

export interface IndexRebuildResult {
  success: boolean;
  rebuildTime: number;
  indicesRebuilt: string[];
  performanceImprovement: number;
}

export interface RegistryStatus {
  operational: boolean;
  health: HealthStatus;
  performance: PerformanceStatus;
  storage: StorageStatus;
  lastMaintenance: Date;
}

export enum HealthStatus {
  _EXCELLENT = "excellent",
  _GOOD = "good",
  _FAIR = "fair",
  _POOR = "poor",
  _CRITICAL = "critical"
}

export interface PerformanceStatus {
  queryPerformance: PerformanceLevel;
  indexPerformance: PerformanceLevel;
  cachePerformance: PerformanceLevel;
}

export enum PerformanceLevel {
  _OPTIMAL = "optimal",
  _GOOD = "good",
  _ACCEPTABLE = "acceptable",
  _POOR = "poor",
  _CRITICAL = "critical"
}

export interface StorageStatus {
  utilization: number;
  fragmentation: number;
  compressionRatio: number;
  freeSpace: number;
}