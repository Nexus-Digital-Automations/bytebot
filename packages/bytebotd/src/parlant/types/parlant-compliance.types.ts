/**
 * Parlant Compliance Types
 *
 * Comprehensive type definitions for compliance, regulatory frameworks,
 * data classification, and enterprise governance requirements.
 *
 * @module ParlantComplianceTypes
 * @version 1.0.0
 * @author Claude Code (Compliance Specialist)
 * @since Parlant Compliance Types Implementation
 */

// Import shared types from additional types
import type {
  FindingEvidence,
  ImpactAssessment,
  Recommendation,
  RemediationPlan,
  RemediationTimeline,
  ResponsibleParty,
  FindingStatus,
  ViolationEvidence,
  ViolationImpact,
  ViolationStatus,
  DiscoveryInfo,
  DisclosureRequirement,
  ViolationRemediation,
  PreventionMeasure,
  AuditCategory,
  AuditCriteria,
  AuditCondition,
  AuditCause,
  AuditEffect,
  AuditRecommendation,
  ManagementResponse,
  FollowUpAction,
  ActionTimeline,
  ActionMilestone,
  ActionDependency,
  SuccessCriteria,
  ActionStatus,
  ActionPriority,
  ResourceRequirement,
  CertificationLevel,
  CertificationScope,
  CertificationBody,
  ValidityPeriod,
  CertificationCondition,
  SurveillanceRequirement,
  MaintenanceRequirement,
  RenewalProcess,
  CapabilityType,
  CollectionScope,
  CollectionMethod,
  QualitySpecification,
  CapabilityLimitation,
  CapabilityValidation,
  CapabilityCertification,
  CompressionSupport,
  EncryptionSupport,
  FormatValidation,
  ConversionCapability,
  ConfigurationParameter,
  ConfigurationSetting,
  ConfigurationProfile,
  ConfigurationTemplate,
  ConfigurationValidation,
  ConfigurationVersioning,
  DeploymentConfiguration,
  ValidationRequirement,
  // Add missing type definitions
  CalibrationStandard,
  CalibrationProcedure,
  CalibrationResult,
  CalibrationCertification,
  CalibrationStatus,
  LimitationType,
  LimitationImpact,
  WorkaroundProcedure,
  AlternativeTool,
  MitigationStrategy,
  LimitationDocumentation,
  CompletenessScope,
  CoverageAnalysis,
  IdentifiedGap,
  CompletenessAssessment,
  ImprovementRecommendation,
  CompletenessValidation,
  CompletenessReporting,
  AccuracyMethod,
  AccuracyBaseline,
  AccuracyMeasurement,
  AccuracyValidation,
  AccuracyBenchmark,
  AccuracyTrend,
  AccuracyImprovement,
  ReliabilityDimension,
  ReliabilityMeasurement,
  ReliabilityFactor,
  ReliabilityAssessment,
  ReliabilityMonitoring,
  ReliabilityImprovement,
  ReliabilityReporting,
  TimelinessRequirement,
  TimelinessMeasurement,
  TimelinessPerformance,
  TimelinessFactor,
  TimelinessImprovement,
  TimelinessMonitoring,
  TimelinessReporting,
  IntegrityVerification,
  IntegrityMonitoring,
  IntegrityViolation,
  IntegrityProtection,
  IntegrityRestoration,
  IntegrityAssessment,
  IntegrityReporting,
  AuthenticityVerification,
  AuthenticationMethod,
  Authenticitycertificate,
  AuthenticityValidation,
  AuthenticityChallenge,
  AuthenticityMonitoring,
  AuthenticityReporting,
  AuditCoverage,
  AuditTrail,
  AuditDocumentation,
  AuditAccessibility,
  AuditRetention,
  AuditQuality,
  AuditCompliance,
} from './parlant-additional.types';

// =============================================================================
// Core Compliance Framework Types
// =============================================================================

export interface ComplianceFramework {
  readonly frameworkId: string;
  readonly name: string;
  readonly version: string;
  readonly jurisdiction: string[];
  readonly scope: ComplianceScope;
  readonly requirements: FrameworkRequirement[];
  readonly controls: ComplianceControl[];
  readonly assessments: AssessmentType[];
  readonly reporting: ReportingRequirement[];
  readonly certification: CertificationRequirement[];
  readonly penalties: Penalty[];
  readonly effectiveDate: Date;
  readonly reviewCycle: number;
}

export interface ComplianceScope {
  readonly scopeId: string;
  readonly applicability: ApplicabilityRule[];
  readonly exclusions: ExclusionRule[];
  readonly geographic: GeographicScope[];
  readonly industry: IndustryScope[];
  readonly organizational: OrganizationalScope[];
  readonly functional: FunctionalScope[];
  readonly temporal: TemporalScope;
}

export interface FrameworkRequirement {
  readonly requirementId: string;
  readonly category: RequirementCategory;
  readonly description: string;
  readonly mandatory: boolean;
  readonly controls: string[];
  readonly evidence: EvidenceRequirement[];
  readonly testing: TestingRequirement[];
  readonly documentation: DocumentationRequirement[];
  readonly frequency: AssessmentFrequency;
  readonly maturityLevel: MaturityLevel;
}

export interface ComplianceControl {
  readonly controlId: string;
  readonly family: ControlFamily;
  readonly type: ControlType;
  readonly objective: string;
  readonly implementation: ImplementationGuidance[];
  readonly testing: TestingProcedure[];
  readonly automation: AutomationLevel;
  readonly effectiveness: EffectivenessRating;
  readonly compensating: CompensatingControl[];
  readonly dependencies: ControlDependency[];
}

// =============================================================================
// Data Classification Types
// =============================================================================

export interface DataClassification {
  readonly classificationId: string;
  readonly level: ClassificationLevel;
  readonly category: DataCategory;
  readonly sensitivity: DataSensitivity;
  readonly handling: HandlingInstructions;
  readonly access: AccessRequirements;
  readonly retention: RetentionClassification;
  readonly disposal: DisposalRequirements;
  readonly markings: ClassificationMarking[];
  readonly derivativeClassification: boolean;
}

export interface HandlingRequirements {
  readonly handlingId: string;
  readonly procedures: HandlingProcedure[];
  readonly restrictions: HandlingRestriction[];
  readonly approvals: ApprovalRequirement[];
  readonly monitoring: MonitoringRequirement[];
  readonly training: TrainingRequirement[];
  readonly equipment: EquipmentRequirement[];
  readonly environment: EnvironmentRequirement[];
}

export interface RetentionRequirements {
  readonly retentionId: string;
  readonly period: RetentionPeriod;
  readonly triggers: RetentionTrigger[];
  readonly extensions: ExtensionCondition[];
  readonly reviews: RetentionReview[];
  readonly disposal: DisposalMethod[];
  readonly certification: DisposalCertification;
  readonly audit: RetentionAudit[];
}

// =============================================================================
// Regulatory Classification Types
// =============================================================================

export interface RegulatoryClassification {
  readonly classificationId: string;
  readonly framework: string;
  readonly jurisdiction: string;
  readonly sector: IndustrySector;
  readonly applicability: ApplicabilityAssessment;
  readonly requirements: RegulatoryRequirement[];
  readonly obligations: RegulatoryObligation[];
  readonly penalties: RegulatoryPenalty[];
  readonly reporting: RegulatoryReporting[];
  readonly oversight: OversightBody[];
}

export interface IndustryClassification {
  readonly classificationId: string;
  readonly industry: string;
  readonly sector: string;
  readonly subSector: string;
  readonly naicsCode: string;
  readonly sicCode: string;
  readonly standards: IndustryStandard[];
  readonly bestPractices: BestPractice[];
  readonly benchmarks: IndustryBenchmark[];
}

export interface GeographicClassification {
  readonly classificationId: string;
  readonly region: string;
  readonly country: string;
  readonly state: string;
  readonly locality: string;
  readonly jurisdiction: JurisdictionInfo;
  readonly sovereignty: SovereigntyRequirements;
  readonly dataResidency: DataResidencyRequirements;
  readonly crossBorder: CrossBorderRequirements;
}

// =============================================================================
// Assessment and Audit Types
// =============================================================================

export interface AssessmentFinding {
  readonly findingId: string;
  readonly category: FindingCategory;
  readonly severity: FindingSeverity;
  readonly description: string;
  readonly evidence: FindingEvidence[];
  readonly impact: ImpactAssessment;
  readonly recommendation: Recommendation[];
  readonly remediation: RemediationPlan;
  readonly timeline: RemediationTimeline;
  readonly responsible: ResponsibleParty[];
  readonly status: FindingStatus;
}

export interface ComplianceViolation {
  readonly violationId: string;
  readonly framework: string;
  readonly requirement: string;
  readonly description: string;
  readonly severity: ViolationSeverity;
  readonly impact: ViolationImpact;
  readonly evidence: ViolationEvidence[];
  readonly discovery: DiscoveryInfo;
  readonly disclosure: DisclosureRequirement[];
  readonly remediation: ViolationRemediation;
  readonly prevention: PreventionMeasure[];
  readonly status: ViolationStatus;
}

export interface AuditFinding {
  readonly findingId: string;
  readonly auditId: string;
  readonly type: AuditFindingType;
  readonly category: AuditCategory;
  readonly description: string;
  readonly criteria: AuditCriteria;
  readonly condition: AuditCondition;
  readonly cause: AuditCause[];
  readonly effect: AuditEffect;
  readonly recommendation: AuditRecommendation[];
  readonly management_response: ManagementResponse;
  readonly followUp: FollowUpAction[];
}

export interface RemediationAction {
  readonly actionId: string;
  readonly type: RemediationType;
  readonly description: string;
  readonly priority: ActionPriority;
  readonly owner: string;
  readonly timeline: ActionTimeline;
  readonly resources: ResourceRequirement[];
  readonly dependencies: ActionDependency[];
  readonly milestones: ActionMilestone[];
  readonly success_criteria: SuccessCriteria[];
  readonly validation: ValidationRequirement[];
  readonly status: ActionStatus;
}

// =============================================================================
// Certification and Compliance Types
// =============================================================================

export interface ComplianceCertification {
  readonly certificationId: string;
  readonly type: CertificationType;
  readonly standard: string;
  readonly level: CertificationLevel;
  readonly scope: CertificationScope;
  readonly issuer: CertificationBody;
  readonly validity: ValidityPeriod;
  readonly conditions: CertificationCondition[];
  readonly surveillance: SurveillanceRequirement[];
  readonly maintenance: MaintenanceRequirement[];
  readonly renewal: RenewalProcess;
}

export interface CollectionCapability {
  readonly capabilityId: string;
  readonly type: CapabilityType;
  readonly scope: CollectionScope[];
  readonly methods: CollectionMethod[];
  readonly formats: SupportedFormat[];
  readonly quality: QualitySpecification;
  readonly limitations: CapabilityLimitation[];
  readonly validation: CapabilityValidation[];
  readonly certification: CapabilityCertification;
}

export interface SupportedFormat {
  readonly formatId: string;
  readonly name: string;
  readonly version: string;
  readonly specification: string;
  readonly encoding: string[];
  readonly compression: CompressionSupport[];
  readonly encryption: EncryptionSupport[];
  readonly validation: FormatValidation;
  readonly conversion: ConversionCapability[];
}

export interface ToolConfiguration {
  readonly configurationId: string;
  readonly parameters: ConfigurationParameter[];
  readonly settings: ConfigurationSetting[];
  readonly profiles: ConfigurationProfile[];
  readonly templates: ConfigurationTemplate[];
  readonly validation: ConfigurationValidation;
  readonly versioning: ConfigurationVersioning;
  readonly deployment: DeploymentConfiguration;
}

export interface CalibrationRecord {
  readonly recordId: string;
  readonly timestamp: Date;
  readonly calibratedBy: string;
  readonly standard: CalibrationStandard;
  readonly procedure: CalibrationProcedure;
  readonly results: CalibrationResult[];
  readonly certification: CalibrationCertification;
  readonly nextCalibration: Date;
  readonly status: CalibrationStatus;
}

export interface ToolLimitation {
  readonly limitationId: string;
  readonly type: LimitationType;
  readonly description: string;
  readonly impact: LimitationImpact;
  readonly workaround: WorkaroundProcedure[];
  readonly alternatives: AlternativeTool[];
  readonly mitigation: MitigationStrategy[];
  readonly documentation: LimitationDocumentation;
}

// =============================================================================
// Quality Metrics Types
// =============================================================================

export interface CompletenessMetric {
  readonly metricId: string;
  readonly scope: CompletenessScope;
  readonly coverage: CoverageAnalysis;
  readonly gaps: IdentifiedGap[];
  readonly assessment: CompletenessAssessment;
  readonly improvement: ImprovementRecommendation[];
  readonly validation: CompletenessValidation;
  readonly reporting: CompletenessReporting;
}

export interface AccuracyMetric {
  readonly metricId: string;
  readonly method: AccuracyMethod;
  readonly baseline: AccuracyBaseline;
  readonly measurement: AccuracyMeasurement[];
  readonly validation: AccuracyValidation;
  readonly benchmarks: AccuracyBenchmark[];
  readonly trends: AccuracyTrend[];
  readonly improvement: AccuracyImprovement[];
}

export interface ReliabilityMetric {
  readonly metricId: string;
  readonly dimension: ReliabilityDimension[];
  readonly measurement: ReliabilityMeasurement;
  readonly factors: ReliabilityFactor[];
  readonly assessment: ReliabilityAssessment;
  readonly monitoring: ReliabilityMonitoring;
  readonly improvement: ReliabilityImprovement[];
  readonly reporting: ReliabilityReporting;
}

export interface TimelinessMetric {
  readonly metricId: string;
  readonly requirements: TimelinessRequirement[];
  readonly measurement: TimelinessMeasurement;
  readonly performance: TimelinessPerformance[];
  readonly factors: TimelinessFactor[];
  readonly improvement: TimelinessImprovement[];
  readonly monitoring: TimelinessMonitoring;
  readonly reporting: TimelinessReporting;
}

export interface IntegrityMetric {
  readonly metricId: string;
  readonly verification: IntegrityVerification;
  readonly monitoring: IntegrityMonitoring;
  readonly violations: IntegrityViolation[];
  readonly protection: IntegrityProtection[];
  readonly restoration: IntegrityRestoration[];
  readonly assessment: IntegrityAssessment;
  readonly reporting: IntegrityReporting;
}

export interface AuthenticityMetric {
  readonly metricId: string;
  readonly verification: AuthenticityVerification;
  readonly methods: AuthenticationMethod[];
  readonly certificates: Authenticitycertificate[];
  readonly validation: AuthenticityValidation;
  readonly challenges: AuthenticityChallenge[];
  readonly monitoring: AuthenticityMonitoring;
  readonly reporting: AuthenticityReporting;
}

export interface AuditabilityMetric {
  readonly metricId: string;
  readonly coverage: AuditCoverage;
  readonly trail: AuditTrail;
  readonly documentation: AuditDocumentation;
  readonly accessibility: AuditAccessibility;
  readonly retention: AuditRetention;
  readonly quality: AuditQuality;
  readonly compliance: AuditCompliance;
}

// =============================================================================
// Supporting Enumerations
// =============================================================================

export enum RequirementCategory {
  GOVERNANCE = 'GOVERNANCE',
  RISK_MANAGEMENT = 'RISK_MANAGEMENT',
  COMPLIANCE = 'COMPLIANCE',
  SECURITY = 'SECURITY',
  PRIVACY = 'PRIVACY',
  DATA_PROTECTION = 'DATA_PROTECTION',
  AUDIT = 'AUDIT',
  REPORTING = 'REPORTING',
  INCIDENT_RESPONSE = 'INCIDENT_RESPONSE',
  BUSINESS_CONTINUITY = 'BUSINESS_CONTINUITY',
}

export enum ControlFamily {
  ACCESS_CONTROL = 'ACCESS_CONTROL',
  AUDIT_ACCOUNTABILITY = 'AUDIT_ACCOUNTABILITY',
  AWARENESS_TRAINING = 'AWARENESS_TRAINING',
  CONFIGURATION_MANAGEMENT = 'CONFIGURATION_MANAGEMENT',
  CONTINGENCY_PLANNING = 'CONTINGENCY_PLANNING',
  IDENTIFICATION_AUTHENTICATION = 'IDENTIFICATION_AUTHENTICATION',
  INCIDENT_RESPONSE = 'INCIDENT_RESPONSE',
  MAINTENANCE = 'MAINTENANCE',
  MEDIA_PROTECTION = 'MEDIA_PROTECTION',
  PHYSICAL_ENVIRONMENTAL = 'PHYSICAL_ENVIRONMENTAL',
  PLANNING = 'PLANNING',
  PERSONNEL_SECURITY = 'PERSONNEL_SECURITY',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  SECURITY_ASSESSMENT = 'SECURITY_ASSESSMENT',
  SYSTEM_COMMUNICATIONS = 'SYSTEM_COMMUNICATIONS',
  SYSTEM_INFORMATION = 'SYSTEM_INFORMATION',
}

export enum ControlType {
  PREVENTIVE = 'PREVENTIVE',
  DETECTIVE = 'DETECTIVE',
  CORRECTIVE = 'CORRECTIVE',
  DETERRENT = 'DETERRENT',
  RECOVERY = 'RECOVERY',
  COMPENSATING = 'COMPENSATING',
}

export enum ClassificationLevel {
  UNCLASSIFIED = 'UNCLASSIFIED',
  CONFIDENTIAL = 'CONFIDENTIAL',
  SECRET = 'SECRET',
  TOP_SECRET = 'TOP_SECRET',
}

export enum DataCategory {
  PERSONAL = 'PERSONAL',
  FINANCIAL = 'FINANCIAL',
  HEALTH = 'HEALTH',
  INTELLECTUAL_PROPERTY = 'INTELLECTUAL_PROPERTY',
  TRADE_SECRET = 'TRADE_SECRET',
  OPERATIONAL = 'OPERATIONAL',
  TECHNICAL = 'TECHNICAL',
  LEGAL = 'LEGAL',
}

export enum DataSensitivity {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  HIGHLY_CONFIDENTIAL = 'HIGHLY_CONFIDENTIAL',
}

export enum FindingCategory {
  CONTROL_DEFICIENCY = 'CONTROL_DEFICIENCY',
  PROCESS_INEFFICIENCY = 'PROCESS_INEFFICIENCY',
  COMPLIANCE_GAP = 'COMPLIANCE_GAP',
  RISK_EXPOSURE = 'RISK_EXPOSURE',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  PROCEDURE_DEVIATION = 'PROCEDURE_DEVIATION',
  DOCUMENTATION_ISSUE = 'DOCUMENTATION_ISSUE',
  TRAINING_DEFICIENCY = 'TRAINING_DEFICIENCY',
}

export enum FindingSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFORMATIONAL = 'INFORMATIONAL',
}

export enum ViolationSeverity {
  CATASTROPHIC = 'CATASTROPHIC',
  MAJOR = 'MAJOR',
  MODERATE = 'MODERATE',
  MINOR = 'MINOR',
  NEGLIGIBLE = 'NEGLIGIBLE',
}

export enum AuditFindingType {
  CONTROL_DEFICIENCY = 'CONTROL_DEFICIENCY',
  MATERIAL_WEAKNESS = 'MATERIAL_WEAKNESS',
  SIGNIFICANT_DEFICIENCY = 'SIGNIFICANT_DEFICIENCY',
  OPERATIONAL_FINDING = 'OPERATIONAL_FINDING',
  COMPLIANCE_EXCEPTION = 'COMPLIANCE_EXCEPTION',
  BEST_PRACTICE_OPPORTUNITY = 'BEST_PRACTICE_OPPORTUNITY',
}

export enum RemediationType {
  IMMEDIATE = 'IMMEDIATE',
  SHORT_TERM = 'SHORT_TERM',
  LONG_TERM = 'LONG_TERM',
  STRATEGIC = 'STRATEGIC',
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
}

export enum CertificationType {
  ISO_27001 = 'ISO_27001',
  SOC_2 = 'SOC_2',
  PCI_DSS = 'PCI_DSS',
  HIPAA = 'HIPAA',
  GDPR = 'GDPR',
  FedRAMP = 'FedRAMP',
  NIST = 'NIST',
  COBIT = 'COBIT',
}

// Note: All compliance types are already exported when declared with 'export interface' above

// =============================================================================
// Additional Supporting Interfaces
// =============================================================================

export interface ApplicabilityRule {
  readonly ruleId: string;
  readonly condition: string;
  readonly scope: string[];
  readonly exceptions: string[];
  readonly effective: boolean;
}

export interface ExclusionRule {
  readonly ruleId: string;
  readonly condition: string;
  readonly scope: string[];
  readonly justification: string;
  readonly approved: boolean;
}

export interface GeographicScope {
  readonly scopeId: string;
  readonly regions: string[];
  readonly countries: string[];
  readonly jurisdictions: string[];
  readonly restrictions: string[];
}

export interface IndustryScope {
  readonly scopeId: string;
  readonly sectors: string[];
  readonly subsectors: string[];
  readonly classifications: string[];
  readonly exclusions: string[];
}

export interface OrganizationalScope {
  readonly scopeId: string;
  readonly entities: string[];
  readonly departments: string[];
  readonly roles: string[];
  readonly functions: string[];
}

export interface FunctionalScope {
  readonly scopeId: string;
  readonly processes: string[];
  readonly systems: string[];
  readonly data: string[];
  readonly activities: string[];
}

export interface TemporalScope {
  readonly scopeId: string;
  readonly effectiveDate: Date;
  readonly expiryDate?: Date;
  readonly phases: TemporalPhase[];
  readonly transitions: TemporalTransition[];
}

export interface TemporalPhase {
  readonly phaseId: string;
  readonly name: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly requirements: string[];
}

export interface TemporalTransition {
  readonly transitionId: string;
  readonly fromPhase: string;
  readonly toPhase: string;
  readonly conditions: string[];
  readonly timeline: number;
}

export interface AssessmentType {
  readonly typeId: string;
  readonly name: string;
  readonly methodology: string;
  readonly frequency: AssessmentFrequency;
  readonly scope: string[];
  readonly criteria: string[];
}

export interface AssessmentFrequency {
  readonly frequency:
    | 'CONTINUOUS'
    | 'DAILY'
    | 'WEEKLY'
    | 'MONTHLY'
    | 'QUARTERLY'
    | 'ANNUALLY'
    | 'BIANNUAL';
  readonly interval: number;
  readonly tolerance: number;
  readonly exceptions: string[];
}

export interface ReportingRequirement {
  readonly requirementId: string;
  readonly type: 'REGULATORY' | 'INTERNAL' | 'EXTERNAL' | 'AUDIT';
  readonly frequency: ReportingFrequency;
  readonly recipients: string[];
  readonly format: string[];
  readonly content: string[];
}

export interface ReportingFrequency {
  readonly frequency:
    | 'REAL_TIME'
    | 'DAILY'
    | 'WEEKLY'
    | 'MONTHLY'
    | 'QUARTERLY'
    | 'ANNUALLY';
  readonly deadlines: Date[];
  readonly exceptions: string[];
  readonly grace_period: number;
}

export interface CertificationRequirement {
  readonly requirementId: string;
  readonly standard: string;
  readonly level: string;
  readonly scope: string[];
  readonly validity: number;
  readonly maintenance: string[];
}

export interface Penalty {
  readonly penaltyId: string;
  readonly type: 'MONETARY' | 'OPERATIONAL' | 'CRIMINAL' | 'CIVIL';
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'MAXIMUM';
  readonly amount?: number;
  readonly description: string;
  readonly conditions: string[];
}

export interface EvidenceRequirement {
  readonly requirementId: string;
  readonly type: string;
  readonly mandatory: boolean;
  readonly format: string[];
  readonly retention: number;
  readonly quality: string[];
}

export interface TestingRequirement {
  readonly requirementId: string;
  readonly type: 'COMPLIANCE' | 'EFFECTIVENESS' | 'SECURITY' | 'PERFORMANCE';
  readonly frequency: TestingFrequency;
  readonly methodology: string[];
  readonly acceptance: string[];
}

export interface TestingFrequency {
  readonly frequency:
    | 'CONTINUOUS'
    | 'DAILY'
    | 'WEEKLY'
    | 'MONTHLY'
    | 'QUARTERLY'
    | 'ANNUALLY';
  readonly samples: number;
  readonly coverage: number;
  readonly rotation: boolean;
}

export interface DocumentationRequirement {
  readonly requirementId: string;
  readonly type: 'POLICY' | 'PROCEDURE' | 'STANDARD' | 'GUIDELINE';
  readonly format: string[];
  readonly approval: string[];
  readonly maintenance: string[];
}

export interface MaturityLevel {
  readonly level: number;
  readonly name: string;
  readonly description: string;
  readonly criteria: string[];
  readonly evidence: string[];
}

export interface ImplementationGuidance {
  readonly guidanceId: string;
  readonly category: string;
  readonly recommendations: string[];
  readonly bestPractices: string[];
  readonly tools: string[];
}

export interface TestingProcedure {
  readonly procedureId: string;
  readonly name: string;
  readonly steps: string[];
  readonly expected: string[];
  readonly tools: string[];
}

export interface AutomationLevel {
  readonly level: 'NONE' | 'PARTIAL' | 'FULL' | 'ADAPTIVE';
  readonly coverage: number;
  readonly tools: string[];
  readonly exceptions: string[];
}

export interface EffectivenessRating {
  readonly rating:
    | 'INEFFECTIVE'
    | 'PARTIALLY_EFFECTIVE'
    | 'EFFECTIVE'
    | 'HIGHLY_EFFECTIVE';
  readonly score: number;
  readonly evidence: string[];
  readonly factors: string[];
}

export interface CompensatingControl {
  readonly controlId: string;
  readonly purpose: string;
  readonly implementation: string[];
  readonly effectiveness: EffectivenessRating;
  readonly limitations: string[];
}

export interface ControlDependency {
  readonly dependencyId: string;
  readonly dependentControl: string;
  readonly requiredControl: string;
  readonly type: 'PREREQUISITE' | 'COMPLEMENTARY' | 'COMPENSATING';
  readonly strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'CRITICAL';
}

export interface HandlingInstructions {
  readonly instructionId: string;
  readonly procedures: string[];
  readonly restrictions: string[];
  readonly approvals: string[];
  readonly monitoring: string[];
}

export interface HandlingProcedure {
  readonly procedureId: string;
  readonly name: string;
  readonly steps: string[];
  readonly roles: string[];
  readonly tools: string[];
}

export interface HandlingRestriction {
  readonly restrictionId: string;
  readonly type: string;
  readonly scope: string[];
  readonly conditions: string[];
  readonly exceptions: string[];
}

export interface ApprovalRequirement {
  readonly requirementId: string;
  readonly level: string;
  readonly approvers: string[];
  readonly process: string[];
  readonly timeline: number;
}

export interface MonitoringRequirement {
  readonly requirementId: string;
  readonly type: string;
  readonly frequency: string;
  readonly metrics: string[];
  readonly alerts: string[];
}

export interface TrainingRequirement {
  readonly requirementId: string;
  readonly audience: string[];
  readonly content: string[];
  readonly frequency: string;
  readonly assessment: string[];
}

export interface EquipmentRequirement {
  readonly requirementId: string;
  readonly equipment: string[];
  readonly specifications: string[];
  readonly certification: string[];
  readonly maintenance: string[];
}

export interface EnvironmentRequirement {
  readonly requirementId: string;
  readonly conditions: string[];
  readonly controls: string[];
  readonly monitoring: string[];
  readonly exceptions: string[];
}

export interface AccessRequirements {
  readonly requirementId: string;
  readonly levels: string[];
  readonly controls: string[];
  readonly authorization: string[];
  readonly monitoring: string[];
}

export interface RetentionClassification {
  readonly classificationId: string;
  readonly category: string;
  readonly period: number;
  readonly triggers: string[];
  readonly exceptions: string[];
}

export interface DisposalRequirements {
  readonly requirementId: string;
  readonly methods: string[];
  readonly certification: string[];
  readonly verification: string[];
  readonly documentation: string[];
}

export interface ClassificationMarking {
  readonly markingId: string;
  readonly text: string;
  readonly placement: string[];
  readonly format: string[];
  readonly visibility: string[];
}

export interface RetentionPeriod {
  readonly periodId: string;
  readonly duration: number;
  readonly unit: 'DAYS' | 'MONTHS' | 'YEARS';
  readonly justification: string;
  readonly exceptions: string[];
}

export interface RetentionTrigger {
  readonly triggerId: string;
  readonly event: string;
  readonly condition: string;
  readonly action: string;
  readonly timeline: number;
}

export interface ExtensionCondition {
  readonly conditionId: string;
  readonly criteria: string;
  readonly approval: string[];
  readonly justification: string;
  readonly duration: number;
}

export interface RetentionReview {
  readonly reviewId: string;
  readonly frequency: string;
  readonly criteria: string[];
  readonly approvers: string[];
  readonly documentation: string[];
}

export interface DisposalMethod {
  readonly methodId: string;
  readonly type: string;
  readonly procedure: string[];
  readonly certification: string[];
  readonly verification: string[];
}

export interface DisposalCertification {
  readonly certificationId: string;
  readonly provider: string;
  readonly method: string;
  readonly verification: string[];
  readonly documentation: string[];
}

export interface RetentionAudit {
  readonly auditId: string;
  readonly scope: string[];
  readonly frequency: string;
  readonly procedures: string[];
  readonly findings: string[];
}

// ... Additional supporting interfaces continued
export interface IndustrySector {
  readonly sectorId: string;
  readonly name: string;
  readonly classification: string;
  readonly regulations: string[];
  readonly standards: string[];
}

export interface ApplicabilityAssessment {
  readonly assessmentId: string;
  readonly scope: string[];
  readonly criteria: string[];
  readonly result: 'APPLICABLE' | 'NOT_APPLICABLE' | 'CONDITIONAL';
  readonly conditions: string[];
}

export interface RegulatoryRequirement {
  readonly requirementId: string;
  readonly description: string;
  readonly mandatory: boolean;
  readonly deadline: Date;
  readonly penalties: string[];
}

export interface RegulatoryObligation {
  readonly obligationId: string;
  readonly type: string;
  readonly description: string;
  readonly frequency: string;
  readonly responsible: string[];
}

export interface RegulatoryPenalty {
  readonly penaltyId: string;
  readonly violation: string;
  readonly type: string;
  readonly amount?: number;
  readonly conditions: string[];
}

export interface RegulatoryReporting {
  readonly reportingId: string;
  readonly type: string;
  readonly frequency: string;
  readonly format: string[];
  readonly recipients: string[];
}

export interface OversightBody {
  readonly bodyId: string;
  readonly name: string;
  readonly jurisdiction: string[];
  readonly authority: string[];
  readonly contact: string[];
}

export interface IndustryStandard {
  readonly standardId: string;
  readonly name: string;
  readonly version: string;
  readonly scope: string[];
  readonly requirements: string[];
}

export interface BestPractice {
  readonly practiceId: string;
  readonly name: string;
  readonly description: string;
  readonly benefits: string[];
  readonly implementation: string[];
}

export interface IndustryBenchmark {
  readonly benchmarkId: string;
  readonly metric: string;
  readonly target: number;
  readonly industry_average: number;
  readonly best_in_class: number;
}

export interface JurisdictionInfo {
  readonly jurisdictionId: string;
  readonly name: string;
  readonly type: string;
  readonly authority: string[];
  readonly regulations: string[];
}

export interface SovereigntyRequirements {
  readonly requirementId: string;
  readonly restrictions: string[];
  readonly exceptions: string[];
  readonly procedures: string[];
  readonly compliance: string[];
}

export interface DataResidencyRequirements {
  readonly requirementId: string;
  readonly locations: string[];
  readonly restrictions: string[];
  readonly exceptions: string[];
  readonly verification: string[];
}

export interface CrossBorderRequirements {
  readonly requirementId: string;
  readonly agreements: string[];
  readonly restrictions: string[];
  readonly approvals: string[];
  readonly monitoring: string[];
}

// Default export for enums
export default {
  RequirementCategory,
  ControlFamily,
  ControlType,
  ClassificationLevel,
  DataCategory,
  DataSensitivity,
  FindingCategory,
  FindingSeverity,
  ViolationSeverity,
  AuditFindingType,
  RemediationType,
  CertificationType,
} as const;
