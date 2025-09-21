/**
 * Parlant Additional Types
 *
 * Additional comprehensive type definitions to complete the parlant integration
 * type system. Contains remaining missing interfaces and supporting types.
 *
 * @module ParlantAdditionalTypes
 * @version 1.0.0
 * @author Claude Code (Parlant Integration Specialist)
 * @since Parlant Additional Types Implementation
 */

// =============================================================================
// Additional Missing Interface Definitions
// =============================================================================

export interface FindingEvidence {
  readonly evidenceId: string;
  readonly type: string;
  readonly source: string;
  readonly content: string;
  readonly reliability: number;
  readonly timestamp: Date;
}

export interface ImpactAssessment {
  readonly assessmentId: string;
  readonly financial: number;
  readonly operational: number;
  readonly reputational: number;
  readonly compliance: number;
  readonly overall: number;
}

export interface Recommendation {
  readonly recommendationId: string;
  readonly priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly description: string;
  readonly rationale: string;
  readonly implementation: string[];
  readonly timeline: number;
}

export interface RemediationPlan {
  readonly planId: string;
  readonly actions: RemediationAction[];
  readonly timeline: RemediationTimeline;
  readonly resources: ResourceRequirement[];
  readonly dependencies: string[];
  readonly milestones: string[];
}

// Import shared interfaces from parlant.types.ts
import { TimelinePhase, Milestone, TimelineDependency } from './parlant.types';

export interface RemediationTimeline {
  readonly timelineId: string;
  readonly phases: TimelinePhase[];
  readonly milestones: Milestone[];
  readonly dependencies: TimelineDependency[];
  readonly criticalPath: string[];
}

export interface RemediationAction {
  readonly actionId: string;
  readonly description: string;
  readonly responsible: string;
  readonly dueDate: Date;
  readonly status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  readonly priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ResponsibleParty {
  readonly partyId: string;
  readonly name: string;
  readonly role: string;
  readonly contact: string;
  readonly authority: string[];
  readonly accountability: string[];
}

export interface FindingStatus {
  readonly status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'DEFERRED';
  readonly lastUpdated: Date;
  readonly updatedBy: string;
  readonly comments: string[];
  readonly nextReview: Date;
}

export interface ViolationImpact {
  readonly impactId: string;
  readonly category: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly scope: string[];
  readonly stakeholders: string[];
  readonly quantification: number;
}

export interface ViolationEvidence {
  readonly evidenceId: string;
  readonly type: string;
  readonly description: string;
  readonly source: string;
  readonly collected: Date;
  readonly custodian: string;
}

export interface DiscoveryInfo {
  readonly discoveryId: string;
  readonly method: string;
  readonly discoveredBy: string;
  readonly discoveryDate: Date;
  readonly circumstances: string;
  readonly notifications: string[];
}

export interface DisclosureRequirement {
  readonly requirementId: string;
  readonly authority: string;
  readonly timeline: number;
  readonly format: string[];
  readonly content: string[];
  readonly mandatory: boolean;
}

export interface ViolationRemediation {
  readonly remediationId: string;
  readonly plan: RemediationPlan;
  readonly actions: ViolationRemediationAction[];
  readonly timeline: ViolationRemediationTimeline;
  readonly monitoring: ViolationMonitoring;
}

export interface ViolationRemediationAction {
  readonly actionId: string;
  readonly type: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM';
  readonly description: string;
  readonly responsible: string;
  readonly deadline: Date;
  readonly status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

export interface ViolationRemediationTimeline {
  readonly timelineId: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly phases: RemediationPhase[];
  readonly checkpoints: RemediationCheckpoint[];
}

export interface RemediationPhase {
  readonly phaseId: string;
  readonly name: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly objectives: string[];
  readonly deliverables: string[];
}

export interface RemediationCheckpoint {
  readonly checkpointId: string;
  readonly date: Date;
  readonly criteria: string[];
  readonly responsible: string;
  readonly status: 'PENDING' | 'PASSED' | 'FAILED' | 'DEFERRED';
}

export interface ViolationMonitoring {
  readonly monitoringId: string;
  readonly metrics: ViolationMetric[];
  readonly reporting: ViolationReporting[];
  readonly alerts: ViolationAlert[];
  readonly dashboard: string;
}

export interface ViolationMetric {
  readonly metricId: string;
  readonly name: string;
  readonly target: number;
  readonly current: number;
  readonly trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  readonly threshold: number;
}

export interface ViolationReporting {
  readonly reportId: string;
  readonly frequency: string;
  readonly recipients: string[];
  readonly format: string;
  readonly content: string[];
}

export interface ViolationAlert {
  readonly alertId: string;
  readonly condition: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly recipients: string[];
  readonly escalation: boolean;
}

export interface PreventionMeasure {
  readonly measureId: string;
  readonly type: 'PREVENTIVE' | 'DETECTIVE' | 'CORRECTIVE';
  readonly description: string;
  readonly implementation: string[];
  readonly effectiveness: number;
  readonly monitoring: string[];
}

export interface ViolationStatus {
  readonly status: 'DISCOVERED' | 'REPORTED' | 'INVESTIGATING' | 'REMEDIATING' | 'RESOLVED' | 'CLOSED';
  readonly lastUpdated: Date;
  readonly updatedBy: string;
  readonly nextAction: string;
  readonly dueDate: Date;
}

export interface AuditCategory {
  readonly categoryId: string;
  readonly name: string;
  readonly scope: string[];
  readonly methodology: string[];
  readonly frequency: string;
  readonly standards: string[];
}

export interface AuditCriteria {
  readonly criteriaId: string;
  readonly standard: string;
  readonly requirement: string;
  readonly measurement: string;
  readonly evidence: string[];
  readonly acceptance: string[];
}

export interface AuditCondition {
  readonly conditionId: string;
  readonly description: string;
  readonly evidence: string[];
  readonly significance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly systemic: boolean;
}

export interface AuditCause {
  readonly causeId: string;
  readonly category: 'DESIGN' | 'OPERATING' | 'COMPLIANCE' | 'GOVERNANCE';
  readonly description: string;
  readonly contributing_factors: string[];
  readonly root_cause: boolean;
}

export interface AuditEffect {
  readonly effectId: string;
  readonly description: string;
  readonly impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly quantification: number;
  readonly stakeholders: string[];
}

export interface AuditRecommendation {
  readonly recommendationId: string;
  readonly priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly description: string;
  readonly rationale: string;
  readonly implementation: string[];
  readonly timeline: number;
  readonly responsible: string;
}

export interface ManagementResponse {
  readonly responseId: string;
  readonly response: 'AGREE' | 'DISAGREE' | 'PARTIALLY_AGREE';
  readonly rationale: string;
  readonly corrective_action: string[];
  readonly timeline: number;
  readonly responsible: string;
}

export interface FollowUpAction {
  readonly actionId: string;
  readonly description: string;
  readonly responsible: string;
  readonly dueDate: Date;
  readonly status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  readonly evidence: string[];
}

export interface ActionTimeline {
  readonly timelineId: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly milestones: ActionMilestone[];
  readonly dependencies: ActionDependency[];
  readonly critical_path: string[];
}

export interface ActionMilestone {
  readonly milestoneId: string;
  readonly name: string;
  readonly date: Date;
  readonly criteria: string[];
  readonly status: 'PENDING' | 'ACHIEVED' | 'MISSED' | 'RESCHEDULED';
}

export interface ActionDependency {
  readonly dependencyId: string;
  readonly predecessor: string;
  readonly successor: string;
  readonly type: 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH' | 'START_TO_FINISH';
  readonly lag: number;
}

export interface SuccessCriteria {
  readonly criteriaId: string;
  readonly description: string;
  readonly measurement: string;
  readonly target: number;
  readonly acceptance: string[];
  readonly validation: string[];
}

export interface ValidationRequirement {
  readonly requirementId: string;
  readonly type: 'TESTING' | 'INSPECTION' | 'REVIEW' | 'AUDIT';
  readonly description: string;
  readonly responsible: string;
  readonly timeline: number;
  readonly acceptance: string[];
}

export interface ActionStatus {
  readonly status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  readonly progress: number;
  readonly lastUpdated: Date;
  readonly nextMilestone: Date;
  readonly blockers: string[];
}

export interface ActionPriority {
  readonly priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';
  readonly rationale: string;
  readonly escalation: boolean;
  readonly deadline: Date;
  readonly dependencies: string[];
}

export interface ResourceRequirement {
  readonly requirementId: string;
  readonly type: 'HUMAN' | 'FINANCIAL' | 'TECHNICAL' | 'PHYSICAL';
  readonly description: string;
  readonly quantity: number;
  readonly unit: string;
  readonly availability: string;
}

export interface CertificationLevel {
  readonly level: string;
  readonly description: string;
  readonly requirements: string[];
  readonly evidence: string[];
  readonly validity: number;
  readonly maintenance: string[];
}

export interface CertificationScope {
  readonly scopeId: string;
  readonly domains: string[];
  readonly processes: string[];
  readonly systems: string[];
  readonly locations: string[];
  readonly exclusions: string[];
}

export interface CertificationBody {
  readonly bodyId: string;
  readonly name: string;
  readonly accreditation: string[];
  readonly authority: string[];
  readonly contact: string[];
  readonly recognition: string[];
}

export interface ValidityPeriod {
  readonly periodId: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly extensions: ValidityExtension[];
  readonly conditions: ValidityCondition[];
}

export interface ValidityExtension {
  readonly extensionId: string;
  readonly duration: number;
  readonly conditions: string[];
  readonly approved: boolean;
  readonly approver: string;
}

export interface ValidityCondition {
  readonly conditionId: string;
  readonly description: string;
  readonly compliance: boolean;
  readonly monitoring: string[];
  readonly consequences: string[];
}

export interface CertificationCondition {
  readonly conditionId: string;
  readonly type: 'MANDATORY' | 'OPTIONAL' | 'CONDITIONAL';
  readonly description: string;
  readonly compliance: boolean;
  readonly evidence: string[];
}

export interface SurveillanceRequirement {
  readonly requirementId: string;
  readonly frequency: string;
  readonly scope: string[];
  readonly methods: string[];
  readonly responsible: string;
  readonly reporting: string[];
}

export interface MaintenanceRequirement {
  readonly requirementId: string;
  readonly type: 'CONTINUOUS' | 'PERIODIC' | 'TRIGGERED';
  readonly activities: string[];
  readonly frequency: string;
  readonly responsible: string;
  readonly documentation: string[];
}

export interface RenewalProcess {
  readonly processId: string;
  readonly timeline: number;
  readonly requirements: string[];
  readonly assessment: string[];
  readonly approval: string[];
  readonly transition: string[];
}

export interface CapabilityType {
  readonly typeId: string;
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly standards: string[];
  readonly validation: string[];
}

export interface CollectionScope {
  readonly scopeId: string;
  readonly domain: string;
  readonly range: string[];
  readonly limitations: string[];
  readonly conditions: string[];
  readonly authorization: string[];
}

export interface CollectionMethod {
  readonly methodId: string;
  readonly name: string;
  readonly type: string;
  readonly procedure: string[];
  readonly tools: string[];
  readonly validation: string[];
}

export interface QualitySpecification {
  readonly specificationId: string;
  readonly standards: string[];
  readonly metrics: QualityMetric[];
  readonly acceptance: QualityAcceptance[];
  readonly validation: QualityValidation[];
}

export interface QualityMetric {
  readonly metricId: string;
  readonly name: string;
  readonly target: number;
  readonly threshold: number;
  readonly measurement: string;
  readonly frequency: string;
}

export interface QualityAcceptance {
  readonly acceptanceId: string;
  readonly criteria: string[];
  readonly threshold: number;
  readonly measurement: string;
  readonly responsible: string;
}

export interface QualityValidation {
  readonly validationId: string;
  readonly method: string;
  readonly frequency: string;
  readonly responsible: string;
  readonly reporting: string[];
}

export interface CapabilityLimitation {
  readonly limitationId: string;
  readonly type: 'TECHNICAL' | 'OPERATIONAL' | 'LEGAL' | 'RESOURCE';
  readonly description: string;
  readonly impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly workaround: string[];
}

export interface CapabilityValidation {
  readonly validationId: string;
  readonly method: string;
  readonly criteria: string[];
  readonly frequency: string;
  readonly responsible: string;
  readonly evidence: string[];
}

export interface CapabilityCertification {
  readonly certificationId: string;
  readonly standard: string;
  readonly level: string;
  readonly issuer: string;
  readonly validity: ValidityPeriod;
  readonly conditions: string[];
}

export interface CompressionSupport {
  readonly algorithm: string;
  readonly level: string[];
  readonly performance: CompressionPerformance;
  readonly compatibility: string[];
  readonly limitations: string[];
}

export interface CompressionPerformance {
  readonly ratio: number;
  readonly speed: number;
  readonly memory: number;
  readonly quality: 'LOSSY' | 'LOSSLESS';
  readonly efficiency: number;
}

export interface EncryptionSupport {
  readonly algorithm: string;
  readonly keyLength: number[];
  readonly modes: string[];
  readonly performance: EncryptionPerformance;
  readonly compliance: string[];
}

export interface EncryptionPerformance {
  readonly speed: number;
  readonly strength: 'WEAK' | 'MEDIUM' | 'STRONG' | 'UNBREAKABLE';
  readonly overhead: number;
  readonly scalability: number;
  readonly efficiency: number;
}

export interface FormatValidation {
  readonly validationId: string;
  readonly rules: ValidationRule[];
  readonly tools: string[];
  readonly automation: boolean;
  readonly reporting: ValidationReporting[];
}

export interface ValidationRule {
  readonly ruleId: string;
  readonly description: string;
  readonly pattern: string;
  readonly severity: 'ERROR' | 'WARNING' | 'INFO';
  readonly action: 'REJECT' | 'WARN' | 'ACCEPT';
}

export interface ValidationReporting {
  readonly reportId: string;
  readonly format: string;
  readonly recipients: string[];
  readonly frequency: string;
  readonly content: string[];
}

export interface ConversionCapability {
  readonly conversionId: string;
  readonly sourceFormat: string;
  readonly targetFormat: string;
  readonly quality: 'LOSSLESS' | 'HIGH' | 'MEDIUM' | 'LOW';
  readonly automation: boolean;
  readonly validation: boolean;
}

export interface ConfigurationParameter {
  readonly parameterId: string;
  readonly name: string;
  readonly type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';
  readonly defaultValue: any;
  readonly validation: ParameterValidation;
  readonly description: string;
}

export interface ParameterValidation {
  readonly required: boolean;
  readonly format: string;
  readonly range?: ParameterRange;
  readonly enum?: string[];
  readonly dependencies: string[];
}

export interface ParameterRange {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly exclusive?: boolean;
}

export interface ConfigurationSetting {
  readonly settingId: string;
  readonly category: string;
  readonly name: string;
  readonly value: any;
  readonly source: 'DEFAULT' | 'USER' | 'SYSTEM' | 'EXTERNAL';
  readonly override: boolean;
}

export interface ConfigurationProfile {
  readonly profileId: string;
  readonly name: string;
  readonly description: string;
  readonly settings: ConfigurationSetting[];
  readonly inheritance: string[];
  readonly validation: ProfileValidation;
}

export interface ProfileValidation {
  readonly rules: ValidationRule[];
  readonly dependencies: ProfileDependency[];
  readonly conflicts: ProfileConflict[];
  readonly compatibility: string[];
}

export interface ProfileDependency {
  readonly dependencyId: string;
  readonly required: string[];
  readonly optional: string[];
  readonly mutual: string[];
  readonly exclusive: string[];
}

export interface ProfileConflict {
  readonly conflictId: string;
  readonly conflicting: string[];
  readonly resolution: string;
  readonly priority: number;
  readonly action: string;
}

export interface ConfigurationTemplate {
  readonly templateId: string;
  readonly name: string;
  readonly description: string;
  readonly parameters: ConfigurationParameter[];
  readonly defaults: Record<string, any>;
  readonly validation: TemplateValidation;
}

export interface TemplateValidation {
  readonly schema: string;
  readonly rules: ValidationRule[];
  readonly tests: TemplateTest[];
  readonly compatibility: string[];
}

export interface TemplateTest {
  readonly testId: string;
  readonly name: string;
  readonly input: Record<string, any>;
  readonly expected: Record<string, any>;
  readonly validation: string[];
}

export interface ConfigurationValidation {
  readonly validationId: string;
  readonly rules: ValidationRule[];
  readonly tests: ConfigurationTest[];
  readonly automation: ValidationAutomation;
  readonly reporting: ValidationReporting[];
}

export interface ConfigurationTest {
  readonly testId: string;
  readonly name: string;
  readonly type: 'SYNTAX' | 'SEMANTIC' | 'FUNCTIONAL' | 'PERFORMANCE';
  readonly procedure: string[];
  readonly expected: string[];
  readonly automation: boolean;
}

export interface ValidationAutomation {
  readonly automationId: string;
  readonly triggers: string[];
  readonly actions: AutomationAction[];
  readonly conditions: string[];
  readonly schedule: string;
}

export interface AutomationAction {
  readonly actionId: string;
  readonly type: string;
  readonly parameters: Record<string, unknown>;
  readonly timeout: number;
  readonly retry: number;
}

export interface ConfigurationVersioning {
  readonly versioningId: string;
  readonly strategy: 'SEMANTIC' | 'TIMESTAMP' | 'INCREMENTAL' | 'HASH';
  readonly history: VersionHistory[];
  readonly rollback: RollbackCapability;
  readonly branching: BranchingStrategy;
}

export interface VersionHistory {
  readonly version: string;
  readonly timestamp: Date;
  readonly author: string;
  readonly changes: ConfigurationChange[];
  readonly notes: string;
  readonly approved: boolean;
}

export interface ConfigurationChange {
  readonly changeId: string;
  readonly type: 'ADD' | 'UPDATE' | 'DELETE' | 'MOVE';
  readonly path: string;
  readonly oldValue?: any;
  readonly newValue?: any;
  readonly rationale: string;
}

export interface RollbackCapability {
  readonly enabled: boolean;
  readonly retention: number;
  readonly automation: boolean;
  readonly validation: boolean;
  readonly approval: string[];
}

export interface BranchingStrategy {
  readonly strategy: 'SINGLE' | 'FEATURE' | 'ENVIRONMENT' | 'RELEASE';
  readonly branches: ConfigurationBranch[];
  readonly merging: MergingPolicy;
  readonly protection: BranchProtection[];
}

export interface ConfigurationBranch {
  readonly branchId: string;
  readonly name: string;
  readonly parent?: string;
  readonly purpose: string;
  readonly protection: BranchProtection[];
  readonly policies: BranchPolicy[];
}

export interface BranchProtection {
  readonly protectionId: string;
  readonly type: 'READ_ONLY' | 'APPROVAL_REQUIRED' | 'TESTING_REQUIRED' | 'REVIEW_REQUIRED';
  readonly conditions: string[];
  readonly exceptions: string[];
  readonly enforcement: string[];
}

export interface BranchPolicy {
  readonly policyId: string;
  readonly name: string;
  readonly rules: PolicyRule[];
  readonly enforcement: 'ADVISORY' | 'BLOCKING' | 'ERROR';
  readonly exceptions: string[];
}

export interface PolicyRule {
  readonly ruleId: string;
  readonly condition: string;
  readonly action: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly message: string;
}

export interface MergingPolicy {
  readonly policyId: string;
  readonly strategy: 'FAST_FORWARD' | 'MERGE_COMMIT' | 'SQUASH' | 'REBASE';
  readonly validation: MergeValidation;
  readonly automation: MergeAutomation;
  readonly conflicts: ConflictResolution;
}

export interface MergeValidation {
  readonly required: boolean;
  readonly tests: string[];
  readonly approvals: string[];
  readonly gates: QualityGate[];
}

export interface QualityGate {
  readonly gateId: string;
  readonly name: string;
  readonly criteria: GateCriteria[];
  readonly blocking: boolean;
  readonly override: string[];
}

export interface GateCriteria {
  readonly criteriaId: string;
  readonly metric: string;
  readonly operator: 'GT' | 'LT' | 'EQ' | 'GTE' | 'LTE';
  readonly threshold: number;
  readonly measurement: string;
}

export interface MergeAutomation {
  readonly enabled: boolean;
  readonly triggers: string[];
  readonly conditions: string[];
  readonly actions: string[];
  readonly rollback: boolean;
}

export interface ConflictResolution {
  readonly strategy: 'MANUAL' | 'AUTOMATIC' | 'POLICY_BASED';
  readonly rules: ConflictRule[];
  readonly escalation: ConflictEscalation[];
  readonly documentation: boolean;
}

export interface ConflictRule {
  readonly ruleId: string;
  readonly pattern: string;
  readonly resolution: 'PREFER_SOURCE' | 'PREFER_TARGET' | 'MERGE' | 'MANUAL';
  readonly priority: number;
  readonly rationale: string;
}

export interface ConflictEscalation {
  readonly escalationId: string;
  readonly condition: string;
  readonly level: number;
  readonly recipients: string[];
  readonly timeline: number;
}

export interface DeploymentConfiguration {
  readonly deploymentId: string;
  readonly strategy: 'BLUE_GREEN' | 'ROLLING' | 'CANARY' | 'RECREATE';
  readonly environments: DeploymentEnvironment[];
  readonly pipeline: DeploymentPipeline;
  readonly validation: DeploymentValidation;
}

export interface DeploymentEnvironment {
  readonly environmentId: string;
  readonly name: string;
  readonly type: 'DEVELOPMENT' | 'TESTING' | 'STAGING' | 'PRODUCTION';
  readonly configuration: EnvironmentConfiguration;
  readonly promotion: PromotionCriteria;
}

export interface EnvironmentConfiguration {
  readonly configurationId: string;
  readonly variables: EnvironmentVariable[];
  readonly resources: EnvironmentResource[];
  readonly policies: EnvironmentPolicy[];
  readonly monitoring: EnvironmentMonitoring;
}

export interface EnvironmentVariable {
  readonly name: string;
  readonly value: string;
  readonly type: 'STRING' | 'SECRET' | 'REFERENCE';
  readonly source: string;
  readonly override: boolean;
}

export interface EnvironmentResource {
  readonly resourceId: string;
  readonly type: string;
  readonly allocation: ResourceAllocation;
  readonly limits: ResourceLimits;
  readonly monitoring: boolean;
}

export interface ResourceAllocation {
  readonly cpu: number;
  readonly memory: number;
  readonly storage: number;
  readonly network: number;
  readonly custom: Record<string, number>;
}

export interface ResourceLimits {
  readonly maxCpu: number;
  readonly maxMemory: number;
  readonly maxStorage: number;
  readonly maxNetwork: number;
  readonly quotas: Record<string, number>;
}

export interface EnvironmentPolicy {
  readonly policyId: string;
  readonly name: string;
  readonly rules: PolicyRule[];
  readonly enforcement: 'ADVISORY' | 'BLOCKING' | 'ERROR';
  readonly scope: string[];
}

export interface EnvironmentMonitoring {
  readonly monitoringId: string;
  readonly metrics: MonitoringMetric[];
  readonly alerts: MonitoringAlert[];
  readonly dashboards: string[];
  readonly reporting: MonitoringReporting[];
}

export interface MonitoringMetric {
  readonly metricId: string;
  readonly name: string;
  readonly type: 'COUNTER' | 'GAUGE' | 'HISTOGRAM' | 'SUMMARY';
  readonly collection: MetricCollection;
  readonly aggregation: MetricAggregation;
}

export interface MetricCollection {
  readonly frequency: number;
  readonly method: string;
  readonly source: string;
  readonly transformation: string[];
  readonly validation: string[];
}

export interface MetricAggregation {
  readonly functions: string[];
  readonly windows: number[];
  readonly dimensions: string[];
  readonly retention: number;
}

export interface MonitoringAlert {
  readonly alertId: string;
  readonly name: string;
  readonly condition: AlertCondition;
  readonly notification: AlertNotification;
  readonly escalation: AlertEscalation;
}

export interface AlertCondition {
  readonly metric: string;
  readonly operator: 'GT' | 'LT' | 'EQ' | 'GTE' | 'LTE';
  readonly threshold: number;
  readonly duration: number;
  readonly evaluation: string;
}

export interface AlertNotification {
  readonly channels: string[];
  readonly recipients: string[];
  readonly template: string;
  readonly frequency: string;
  readonly suppression: number;
}

export interface AlertEscalation {
  readonly enabled: boolean;
  readonly levels: EscalationLevel[];
  readonly timeout: number;
  readonly final_action: string;
}

export interface EscalationLevel {
  readonly level: number;
  readonly timeout: number;
  readonly recipients: string[];
  readonly actions: string[];
}

export interface MonitoringReporting {
  readonly reportId: string;
  readonly frequency: string;
  readonly format: string;
  readonly recipients: string[];
  readonly content: ReportContent[];
}

export interface ReportContent {
  readonly contentId: string;
  readonly type: 'METRICS' | 'ALERTS' | 'TRENDS' | 'SUMMARY';
  readonly parameters: Record<string, any>;
  readonly visualization: string[];
}

export interface PromotionCriteria {
  readonly criteriaId: string;
  readonly gates: QualityGate[];
  readonly approvals: ApprovalCriteria[];
  readonly automation: PromotionAutomation;
  readonly rollback: PromotionRollback;
}

export interface ApprovalCriteria {
  readonly approvalId: string;
  readonly required: boolean;
  readonly approvers: string[];
  readonly conditions: string[];
  readonly timeout: number;
}

export interface PromotionAutomation {
  readonly enabled: boolean;
  readonly triggers: string[];
  readonly conditions: string[];
  readonly validation: string[];
  readonly rollback: boolean;
}

export interface PromotionRollback {
  readonly enabled: boolean;
  readonly triggers: string[];
  readonly strategy: string;
  readonly validation: string[];
  readonly approval: string[];
}

export interface DeploymentPipeline {
  readonly pipelineId: string;
  readonly stages: PipelineStage[];
  readonly triggers: PipelineTrigger[];
  readonly gates: PipelineGate[];
  readonly monitoring: PipelineMonitoring;
}

export interface PipelineStage {
  readonly stageId: string;
  readonly name: string;
  readonly type: 'BUILD' | 'TEST' | 'DEPLOY' | 'VALIDATE' | 'PROMOTE';
  readonly tasks: PipelineTask[];
  readonly dependencies: string[];
  readonly parallel: boolean;
}

export interface PipelineTask {
  readonly taskId: string;
  readonly name: string;
  readonly type: string;
  readonly configuration: Record<string, any>;
  readonly timeout: number;
  readonly retry: TaskRetry;
}

export interface TaskRetry {
  readonly enabled: boolean;
  readonly maxAttempts: number;
  readonly delay: number;
  readonly backoff: 'LINEAR' | 'EXPONENTIAL' | 'FIXED';
  readonly conditions: string[];
}

export interface PipelineTrigger {
  readonly triggerId: string;
  readonly type: 'MANUAL' | 'SCHEDULE' | 'WEBHOOK' | 'EVENT';
  readonly configuration: TriggerConfiguration;
  readonly conditions: string[];
  readonly enabled: boolean;
}

export interface TriggerConfiguration {
  readonly schedule?: string;
  readonly webhook?: WebhookConfiguration;
  readonly event?: EventConfiguration;
  readonly manual?: ManualConfiguration;
}

export interface WebhookConfiguration {
  readonly url: string;
  readonly authentication: string;
  readonly validation: string[];
  readonly transformation: string[];
}

export interface EventConfiguration {
  readonly source: string;
  readonly type: string;
  readonly filter: string[];
  readonly transformation: string[];
}

export interface ManualConfiguration {
  readonly approvers: string[];
  readonly parameters: TriggerParameter[];
  readonly validation: string[];
  readonly confirmation: boolean;
}

export interface TriggerParameter {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly default?: any;
  readonly validation: string[];
}

export interface PipelineGate {
  readonly gateId: string;
  readonly type: 'APPROVAL' | 'QUALITY' | 'SECURITY' | 'COMPLIANCE';
  readonly criteria: GateCriteria[];
  readonly approvals: GateApproval[];
  readonly timeout: number;
}

export interface GateApproval {
  readonly approvalId: string;
  readonly approver: string;
  readonly required: boolean;
  readonly conditions: string[];
  readonly timeout: number;
}

export interface PipelineMonitoring {
  readonly monitoringId: string;
  readonly metrics: string[];
  readonly logging: LoggingConfiguration;
  readonly notifications: PipelineNotification[];
  readonly dashboard: string;
}

export interface LoggingConfiguration {
  readonly level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  readonly format: string;
  readonly destinations: LogDestination[];
  readonly retention: number;
}

export interface LogDestination {
  readonly type: 'FILE' | 'CONSOLE' | 'SYSLOG' | 'REMOTE';
  readonly configuration: Record<string, any>;
  readonly filters: string[];
  readonly formatting: string[];
}

export interface PipelineNotification {
  readonly notificationId: string;
  readonly events: string[];
  readonly channels: string[];
  readonly recipients: string[];
  readonly template: string;
}

export interface DeploymentValidation {
  readonly validationId: string;
  readonly preDeployment: ValidationStep[];
  readonly postDeployment: ValidationStep[];
  readonly healthChecks: HealthCheck[];
  readonly rollback: RollbackValidation;
}

export interface ValidationStep {
  readonly stepId: string;
  readonly name: string;
  readonly type: 'FUNCTIONAL' | 'PERFORMANCE' | 'SECURITY' | 'COMPLIANCE';
  readonly tests: ValidationTest[];
  readonly acceptance: AcceptanceCriteria[];
  readonly timeout: number;
}

export interface ValidationTest {
  readonly testId: string;
  readonly name: string;
  readonly procedure: string[];
  readonly expected: string[];
  readonly automation: boolean;
  readonly evidence: string[];
}

export interface AcceptanceCriteria {
  readonly criteriaId: string;
  readonly description: string;
  readonly measurement: string;
  readonly threshold: number;
  readonly mandatory: boolean;
}

export interface HealthCheck {
  readonly checkId: string;
  readonly name: string;
  readonly type: 'LIVENESS' | 'READINESS' | 'STARTUP';
  readonly endpoint: string;
  readonly interval: number;
  readonly timeout: number;
  readonly retries: number;
}

export interface RollbackValidation {
  readonly validationId: string;
  readonly triggers: RollbackTrigger[];
  readonly validation: string[];
  readonly approval: string[];
  readonly automation: boolean;
}

export interface RollbackTrigger {
  readonly triggerId: string;
  readonly condition: string;
  readonly threshold: number;
  readonly duration: number;
  readonly action: 'AUTOMATIC' | 'MANUAL' | 'ALERT';
}

// Note: All types are already exported when declared above