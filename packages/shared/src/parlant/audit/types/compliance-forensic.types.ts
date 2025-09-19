/**
 * PARLANT Phase 1 Audit Trail System - Compliance and Forensic Types
 *
 * Specialized types for regulatory compliance, forensic analysis, and evidence preservation.
 * Supports GDPR, SOX, HIPAA, PCI-DSS and other regulatory frameworks.
 *
 * @fileoverview Compliance and forensic data models
 * @version 1.0.0
 * @author Claude Code - Audit Trail System Agent
 */

import {
  AuditEventId,
  ComplianceAuditId,
  ForensicEvidenceId,
  AuditEventSeverity,
  SensitiveDataType,
  RiskLevel,
} from './audit-core.types';

// ===========================
// COMPLIANCE METADATA
// ===========================

/**
 * Comprehensive compliance metadata for all audit events
 */
export interface ComplianceMetadata {
  /** Compliance frameworks applicable */
  applicableFrameworks: ApplicableFramework[];

  /** Data protection requirements */
  dataProtectionRequirements: DataProtectionRequirement[];

  /** Retention requirements */
  retentionRequirements: RetentionRequirement[];

  /** Privacy requirements */
  privacyRequirements: PrivacyRequirement[];

  /** Regulatory notifications */
  regulatoryNotifications: RegulatoryNotification[];

  /** Compliance status */
  complianceStatus: ComplianceStatus;

  /** Risk assessments */
  riskAssessments: ComplianceRiskAssessment[];

  /** Compliance documentation */
  complianceDocumentation: ComplianceDocumentation;
}

/**
 * Applicable compliance framework
 */
export interface ApplicableFramework {
  /** Framework identifier */
  frameworkId: string;

  /** Framework name */
  frameworkName: ComplianceFramework;

  /** Framework version */
  version: string;

  /** Applicable sections */
  applicableSections: FrameworkSection[];

  /** Compliance requirements */
  requirements: ComplianceRequirement[];

  /** Implementation status */
  implementationStatus: ImplementationStatus;

  /** Last assessment date */
  lastAssessmentDate: Date;

  /** Next assessment due */
  nextAssessmentDue: Date;
}

/**
 * Compliance frameworks enum
 */
export enum ComplianceFramework {
  GDPR = 'gdpr',                    // General Data Protection Regulation
  SOX = 'sox',                      // Sarbanes-Oxley Act
  HIPAA = 'hipaa',                  // Health Insurance Portability and Accountability Act
  PCI_DSS = 'pci_dss',             // Payment Card Industry Data Security Standard
  ISO_27001 = 'iso_27001',         // Information Security Management
  NIST_CSF = 'nist_csf',           // NIST Cybersecurity Framework
  FedRAMP = 'fedramp',             // Federal Risk and Authorization Management Program
  SOC2 = 'soc2',                   // Service Organization Control 2
  CCPA = 'ccpa',                   // California Consumer Privacy Act
  PIPEDA = 'pipeda',               // Personal Information Protection and Electronic Documents Act
  FISMA = 'fisma',                 // Federal Information Security Management Act
  HITECH = 'hitech',               // Health Information Technology for Economic and Clinical Health
  GLBA = 'glba',                   // Gramm-Leach-Bliley Act
  FERPA = 'ferpa',                 // Family Educational Rights and Privacy Act
  COSO = 'coso',                   // Committee of Sponsoring Organizations
  COBIT = 'cobit',                 // Control Objectives for Information and Related Technologies
}

/**
 * Framework section details
 */
export interface FrameworkSection {
  /** Section identifier */
  sectionId: string;

  /** Section title */
  title: string;

  /** Section description */
  description: string;

  /** Section requirements */
  requirements: string[];

  /** Implementation guidance */
  implementationGuidance: string[];

  /** Assessment criteria */
  assessmentCriteria: AssessmentCriterion[];

  /** Control objectives */
  controlObjectives: ControlObjective[];
}

/**
 * Assessment criterion
 */
export interface AssessmentCriterion {
  /** Criterion identifier */
  criterionId: string;

  /** Criterion description */
  description: string;

  /** Evidence requirements */
  evidenceRequirements: string[];

  /** Assessment method */
  assessmentMethod: AssessmentMethod;

  /** Passing threshold */
  passingThreshold: number;

  /** Weighting factor */
  weightingFactor: number;
}

/**
 * Assessment methods
 */
export enum AssessmentMethod {
  AUTOMATED_TESTING = 'automated_testing',
  MANUAL_REVIEW = 'manual_review',
  DOCUMENTATION_REVIEW = 'documentation_review',
  INTERVIEW = 'interview',
  OBSERVATION = 'observation',
  TECHNICAL_TESTING = 'technical_testing',
  SAMPLING = 'sampling',
  WALKTHROUGH = 'walkthrough',
}

/**
 * Control objective
 */
export interface ControlObjective {
  /** Objective identifier */
  objectiveId: string;

  /** Objective description */
  description: string;

  /** Control activities */
  controlActivities: ControlActivity[];

  /** Risk mitigation */
  riskMitigation: RiskMitigation[];

  /** Performance indicators */
  performanceIndicators: PerformanceIndicator[];

  /** Implementation status */
  implementationStatus: ImplementationStatus;
}

/**
 * Control activity
 */
export interface ControlActivity {
  /** Activity identifier */
  activityId: string;

  /** Activity name */
  name: string;

  /** Activity type */
  type: ControlActivityType;

  /** Frequency */
  frequency: ControlFrequency;

  /** Responsible party */
  responsibleParty: string;

  /** Automation level */
  automationLevel: AutomationLevel;

  /** Effectiveness rating */
  effectivenessRating: EffectivenessRating;
}

/**
 * Control activity types
 */
export enum ControlActivityType {
  PREVENTIVE = 'preventive',
  DETECTIVE = 'detective',
  CORRECTIVE = 'corrective',
  COMPENSATING = 'compensating',
  DETERRENT = 'deterrent',
  RECOVERY = 'recovery',
}

/**
 * Control frequencies
 */
export enum ControlFrequency {
  CONTINUOUS = 'continuous',
  REAL_TIME = 'real_time',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
  EVENT_DRIVEN = 'event_driven',
}

/**
 * Automation levels
 */
export enum AutomationLevel {
  FULLY_AUTOMATED = 'fully_automated',
  PARTIALLY_AUTOMATED = 'partially_automated',
  MANUAL = 'manual',
  HYBRID = 'hybrid',
}

/**
 * Effectiveness ratings
 */
export enum EffectivenessRating {
  HIGHLY_EFFECTIVE = 'highly_effective',
  EFFECTIVE = 'effective',
  PARTIALLY_EFFECTIVE = 'partially_effective',
  INEFFECTIVE = 'ineffective',
  NOT_EVALUATED = 'not_evaluated',
}

/**
 * Risk mitigation
 */
export interface RiskMitigation {
  /** Risk identifier */
  riskId: string;

  /** Risk description */
  riskDescription: string;

  /** Mitigation strategy */
  mitigationStrategy: MitigationStrategy;

  /** Residual risk level */
  residualRiskLevel: RiskLevel;

  /** Mitigation effectiveness */
  mitigationEffectiveness: EffectivenessRating;

  /** Cost-benefit analysis */
  costBenefitAnalysis: CostBenefitAnalysis;
}

/**
 * Mitigation strategies
 */
export enum MitigationStrategy {
  AVOID = 'avoid',
  TRANSFER = 'transfer',
  MITIGATE = 'mitigate',
  ACCEPT = 'accept',
  MONITOR = 'monitor',
  ESCALATE = 'escalate',
}

/**
 * Cost-benefit analysis
 */
export interface CostBenefitAnalysis {
  /** Implementation cost */
  implementationCost: number;

  /** Ongoing cost */
  ongoingCost: number;

  /** Risk reduction benefit */
  riskReductionBenefit: number;

  /** Compliance benefit */
  complianceBenefit: number;

  /** Return on investment */
  returnOnInvestment: number;

  /** Payback period */
  paybackPeriod: number;
}

/**
 * Performance indicator
 */
export interface PerformanceIndicator {
  /** Indicator identifier */
  indicatorId: string;

  /** Indicator name */
  name: string;

  /** Indicator type */
  type: IndicatorType;

  /** Target value */
  targetValue: number;

  /** Current value */
  currentValue: number;

  /** Measurement frequency */
  measurementFrequency: ControlFrequency;

  /** Trend analysis */
  trendAnalysis: IndicatorTrend;
}

/**
 * Indicator types
 */
export enum IndicatorType {
  EFFECTIVENESS_INDICATOR = 'effectiveness_indicator',
  EFFICIENCY_INDICATOR = 'efficiency_indicator',
  COVERAGE_INDICATOR = 'coverage_indicator',
  MATURITY_INDICATOR = 'maturity_indicator',
  COMPLIANCE_INDICATOR = 'compliance_indicator',
  RISK_INDICATOR = 'risk_indicator',
}

/**
 * Indicator trends
 */
export enum IndicatorTrend {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining',
  VOLATILE = 'volatile',
  INSUFFICIENT_DATA = 'insufficient_data',
}

/**
 * Implementation status
 */
export enum ImplementationStatus {
  NOT_STARTED = 'not_started',
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  IMPLEMENTED = 'implemented',
  OPERATIONAL = 'operational',
  UNDER_REVIEW = 'under_review',
  NEEDS_IMPROVEMENT = 'needs_improvement',
  NON_COMPLIANT = 'non_compliant',
}

/**
 * Compliance requirement
 */
export interface ComplianceRequirement {
  /** Requirement identifier */
  requirementId: string;

  /** Requirement description */
  description: string;

  /** Requirement type */
  type: RequirementType;

  /** Mandatory indicator */
  mandatory: boolean;

  /** Implementation deadline */
  implementationDeadline: Date;

  /** Assessment frequency */
  assessmentFrequency: ControlFrequency;

  /** Evidence requirements */
  evidenceRequirements: EvidenceRequirement[];

  /** Related controls */
  relatedControls: string[];
}

/**
 * Requirement types
 */
export enum RequirementType {
  LEGAL = 'legal',
  REGULATORY = 'regulatory',
  CONTRACTUAL = 'contractual',
  BUSINESS = 'business',
  TECHNICAL = 'technical',
  OPERATIONAL = 'operational',
}

/**
 * Evidence requirement
 */
export interface EvidenceRequirement {
  /** Evidence type */
  evidenceType: EvidenceType;

  /** Evidence description */
  description: string;

  /** Collection method */
  collectionMethod: string;

  /** Retention period */
  retentionPeriod: number;

  /** Confidentiality level */
  confidentialityLevel: ConfidentialityLevel;

  /** Integrity requirements */
  integrityRequirements: IntegrityRequirement[];
}

/**
 * Evidence types
 */
export enum EvidenceType {
  DOCUMENTARY = 'documentary',
  TESTIMONIAL = 'testimonial',
  ANALYTICAL = 'analytical',
  OBSERVATIONAL = 'observational',
  DIGITAL = 'digital',
  PHYSICAL = 'physical',
  CIRCUMSTANTIAL = 'circumstantial',
}

/**
 * Confidentiality levels
 */
export enum ConfidentialityLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  TOP_SECRET = 'top_secret',
}

/**
 * Integrity requirement
 */
export interface IntegrityRequirement {
  /** Requirement type */
  type: IntegrityRequirementType;

  /** Implementation method */
  implementationMethod: string;

  /** Verification method */
  verificationMethod: string;

  /** Verification frequency */
  verificationFrequency: ControlFrequency;
}

/**
 * Integrity requirement types
 */
export enum IntegrityRequirementType {
  HASH_VERIFICATION = 'hash_verification',
  DIGITAL_SIGNATURE = 'digital_signature',
  BLOCKCHAIN_NOTARIZATION = 'blockchain_notarization',
  AUDIT_TRAIL = 'audit_trail',
  ACCESS_CONTROL = 'access_control',
  TAMPER_EVIDENCE = 'tamper_evidence',
}

/**
 * Data protection requirement
 */
export interface DataProtectionRequirement {
  /** Data category */
  dataCategory: DataCategory;

  /** Protection level */
  protectionLevel: DataProtectionLevel;

  /** Encryption requirements */
  encryptionRequirements: EncryptionRequirement[];

  /** Access controls */
  accessControls: AccessControl[];

  /** Anonymization requirements */
  anonymizationRequirements: AnonymizationRequirement[];

  /** Breach notification requirements */
  breachNotificationRequirements: BreachNotificationRequirement[];
}

/**
 * Data categories
 */
export enum DataCategory {
  PERSONAL_DATA = 'personal_data',
  SENSITIVE_PERSONAL_DATA = 'sensitive_personal_data',
  HEALTH_DATA = 'health_data',
  FINANCIAL_DATA = 'financial_data',
  BIOMETRIC_DATA = 'biometric_data',
  GENETIC_DATA = 'genetic_data',
  LOCATION_DATA = 'location_data',
  BEHAVIORAL_DATA = 'behavioral_data',
  COMMUNICATION_DATA = 'communication_data',
  BUSINESS_DATA = 'business_data',
}

/**
 * Data protection levels
 */
export enum DataProtectionLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  TOP_SECRET = 'top_secret',
}

/**
 * Encryption requirement
 */
export interface EncryptionRequirement {
  /** Encryption type */
  encryptionType: EncryptionType;

  /** Encryption strength */
  encryptionStrength: EncryptionStrength;

  /** Key management requirements */
  keyManagementRequirements: KeyManagementRequirement[];

  /** Implementation deadline */
  implementationDeadline: Date;

  /** Compliance frameworks requiring */
  complianceFrameworksRequiring: ComplianceFramework[];
}

/**
 * Encryption types
 */
export enum EncryptionType {
  SYMMETRIC = 'symmetric',
  ASYMMETRIC = 'asymmetric',
  HASHING = 'hashing',
  DIGITAL_SIGNATURE = 'digital_signature',
  HOMOMORPHIC = 'homomorphic',
  QUANTUM_RESISTANT = 'quantum_resistant',
}

/**
 * Encryption strength levels
 */
export enum EncryptionStrength {
  MINIMAL = 'minimal',           // < 128 bits
  STANDARD = 'standard',         // 128 bits
  STRONG = 'strong',            // 192-256 bits
  MILITARY_GRADE = 'military_grade', // > 256 bits
  QUANTUM_RESISTANT = 'quantum_resistant',
}

/**
 * Key management requirement
 */
export interface KeyManagementRequirement {
  /** Key lifecycle stage */
  lifecycleStage: KeyLifecycleStage;

  /** Management requirement */
  requirement: string;

  /** Implementation method */
  implementationMethod: string;

  /** Compliance frameworks */
  complianceFrameworks: ComplianceFramework[];
}

/**
 * Key lifecycle stages
 */
export enum KeyLifecycleStage {
  GENERATION = 'generation',
  DISTRIBUTION = 'distribution',
  STORAGE = 'storage',
  USAGE = 'usage',
  ROTATION = 'rotation',
  REVOCATION = 'revocation',
  DESTRUCTION = 'destruction',
}

/**
 * Access control requirement
 */
export interface AccessControl {
  /** Control type */
  controlType: AccessControlType;

  /** Access level */
  accessLevel: AccessLevel;

  /** Authorization requirements */
  authorizationRequirements: AuthorizationRequirement[];

  /** Monitoring requirements */
  monitoringRequirements: MonitoringRequirement[];
}

/**
 * Access control types
 */
export enum AccessControlType {
  ROLE_BASED = 'role_based',
  ATTRIBUTE_BASED = 'attribute_based',
  MANDATORY = 'mandatory',
  DISCRETIONARY = 'discretionary',
  RULE_BASED = 'rule_based',
  CONTEXT_BASED = 'context_based',
}

/**
 * Access levels
 */
export enum AccessLevel {
  NO_ACCESS = 'no_access',
  READ_ONLY = 'read_only',
  READ_WRITE = 'read_write',
  ADMIN = 'admin',
  FULL_CONTROL = 'full_control',
}

/**
 * Authorization requirement
 */
export interface AuthorizationRequirement {
  /** Authorization type */
  authorizationType: AuthorizationType;

  /** Required approvers */
  requiredApprovers: number;

  /** Approval timeout */
  approvalTimeout: number;

  /** Escalation procedure */
  escalationProcedure: string;
}

/**
 * Authorization types
 */
export enum AuthorizationType {
  SINGLE_APPROVAL = 'single_approval',
  DUAL_APPROVAL = 'dual_approval',
  COMMITTEE_APPROVAL = 'committee_approval',
  AUTOMATED_APPROVAL = 'automated_approval',
  CONDITIONAL_APPROVAL = 'conditional_approval',
}

/**
 * Monitoring requirement
 */
export interface MonitoringRequirement {
  /** Monitoring type */
  monitoringType: MonitoringType;

  /** Monitoring frequency */
  frequency: ControlFrequency;

  /** Alert thresholds */
  alertThresholds: AlertThreshold[];

  /** Reporting requirements */
  reportingRequirements: ReportingRequirement[];
}

/**
 * Monitoring types
 */
export enum MonitoringType {
  ACCESS_MONITORING = 'access_monitoring',
  BEHAVIOR_MONITORING = 'behavior_monitoring',
  PERFORMANCE_MONITORING = 'performance_monitoring',
  COMPLIANCE_MONITORING = 'compliance_monitoring',
  SECURITY_MONITORING = 'security_monitoring',
  INTEGRITY_MONITORING = 'integrity_monitoring',
}

/**
 * Alert threshold
 */
export interface AlertThreshold {
  /** Metric name */
  metricName: string;

  /** Threshold value */
  thresholdValue: number;

  /** Threshold operator */
  operator: ThresholdOperator;

  /** Alert severity */
  alertSeverity: AuditEventSeverity;

  /** Response time requirement */
  responseTimeRequirement: number;
}

/**
 * Threshold operators
 */
export enum ThresholdOperator {
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
}

/**
 * Reporting requirement
 */
export interface ReportingRequirement {
  /** Report type */
  reportType: ReportType;

  /** Report frequency */
  frequency: ControlFrequency;

  /** Report recipients */
  recipients: string[];

  /** Report format */
  format: ReportFormat;

  /** Delivery method */
  deliveryMethod: DeliveryMethod;
}

/**
 * Report types
 */
export enum ReportType {
  COMPLIANCE_REPORT = 'compliance_report',
  SECURITY_REPORT = 'security_report',
  AUDIT_REPORT = 'audit_report',
  INCIDENT_REPORT = 'incident_report',
  PERFORMANCE_REPORT = 'performance_report',
  RISK_REPORT = 'risk_report',
  EXCEPTION_REPORT = 'exception_report',
}

/**
 * Report formats
 */
export enum ReportFormat {
  PDF = 'pdf',
  HTML = 'html',
  XML = 'xml',
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'excel',
  DASHBOARD = 'dashboard',
}

/**
 * Delivery methods
 */
export enum DeliveryMethod {
  EMAIL = 'email',
  SECURE_PORTAL = 'secure_portal',
  API = 'api',
  FILE_TRANSFER = 'file_transfer',
  PRINT = 'print',
  AUTOMATED_SYSTEM = 'automated_system',
}

/**
 * Anonymization requirement
 */
export interface AnonymizationRequirement {
  /** Anonymization technique */
  technique: AnonymizationTechnique;

  /** Risk tolerance */
  riskTolerance: AnonymizationRiskTolerance;

  /** Utility preservation */
  utilityPreservation: UtilityPreservationLevel;

  /** Re-identification risk assessment */
  reIdentificationRiskAssessment: ReIdentificationRiskAssessment;
}

/**
 * Anonymization techniques
 */
export enum AnonymizationTechnique {
  K_ANONYMITY = 'k_anonymity',
  L_DIVERSITY = 'l_diversity',
  T_CLOSENESS = 't_closeness',
  DIFFERENTIAL_PRIVACY = 'differential_privacy',
  SYNTHETIC_DATA = 'synthetic_data',
  DATA_MASKING = 'data_masking',
  GENERALIZATION = 'generalization',
  SUPPRESSION = 'suppression',
}

/**
 * Anonymization risk tolerance
 */
export enum AnonymizationRiskTolerance {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

/**
 * Utility preservation levels
 */
export enum UtilityPreservationLevel {
  MINIMAL = 'minimal',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  MAXIMUM = 'maximum',
}

/**
 * Re-identification risk assessment
 */
export interface ReIdentificationRiskAssessment {
  /** Risk level */
  riskLevel: RiskLevel;

  /** Risk factors */
  riskFactors: ReIdentificationRiskFactor[];

  /** Mitigation measures */
  mitigationMeasures: string[];

  /** Assessment method */
  assessmentMethod: string;

  /** Assessment date */
  assessmentDate: Date;
}

/**
 * Re-identification risk factor
 */
export interface ReIdentificationRiskFactor {
  /** Factor name */
  factorName: string;

  /** Factor weight */
  weight: number;

  /** Factor value */
  value: number;

  /** Factor description */
  description: string;
}

/**
 * Breach notification requirement
 */
export interface BreachNotificationRequirement {
  /** Notification target */
  target: NotificationTarget;

  /** Notification timeline */
  timeline: NotificationTimeline;

  /** Notification content requirements */
  contentRequirements: NotificationContentRequirement[];

  /** Compliance frameworks requiring */
  complianceFrameworksRequiring: ComplianceFramework[];
}

/**
 * Notification targets
 */
export enum NotificationTarget {
  REGULATORY_AUTHORITY = 'regulatory_authority',
  DATA_SUBJECTS = 'data_subjects',
  BUSINESS_PARTNERS = 'business_partners',
  MEDIA = 'media',
  LAW_ENFORCEMENT = 'law_enforcement',
  INSURANCE_PROVIDER = 'insurance_provider',
  LEGAL_COUNSEL = 'legal_counsel',
}

/**
 * Notification timeline
 */
export interface NotificationTimeline {
  /** Initial notification timeframe */
  initialNotificationHours: number;

  /** Detailed notification timeframe */
  detailedNotificationHours: number;

  /** Public notification timeframe */
  publicNotificationHours?: number;

  /** Follow-up notification timeframe */
  followUpNotificationHours?: number;
}

/**
 * Notification content requirement
 */
export interface NotificationContentRequirement {
  /** Content element */
  element: NotificationContentElement;

  /** Required indicator */
  required: boolean;

  /** Content description */
  description: string;

  /** Format requirements */
  formatRequirements: string[];
}

/**
 * Notification content elements
 */
export enum NotificationContentElement {
  INCIDENT_DESCRIPTION = 'incident_description',
  DATA_TYPES_INVOLVED = 'data_types_involved',
  NUMBER_OF_AFFECTED_INDIVIDUALS = 'number_of_affected_individuals',
  POTENTIAL_CONSEQUENCES = 'potential_consequences',
  MITIGATION_MEASURES = 'mitigation_measures',
  CONTACT_INFORMATION = 'contact_information',
  REMEDIAL_ACTIONS = 'remedial_actions',
  PREVENTION_MEASURES = 'prevention_measures',
}

/**
 * Retention requirement
 */
export interface RetentionRequirement {
  /** Data category */
  dataCategory: DataCategory;

  /** Retention period */
  retentionPeriod: RetentionPeriod;

  /** Retention triggers */
  retentionTriggers: RetentionTrigger[];

  /** Disposal requirements */
  disposalRequirements: DisposalRequirement[];

  /** Legal hold considerations */
  legalHoldConsiderations: LegalHoldConsideration[];
}

/**
 * Retention period
 */
export interface RetentionPeriod {
  /** Duration value */
  duration: number;

  /** Duration unit */
  unit: RetentionTimeUnit;

  /** Start trigger */
  startTrigger: RetentionStartTrigger;

  /** Extension conditions */
  extensionConditions: RetentionExtensionCondition[];
}

/**
 * Retention time units
 */
export enum RetentionTimeUnit {
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
  YEARS = 'years',
  INDEFINITE = 'indefinite',
}

/**
 * Retention start triggers
 */
export enum RetentionStartTrigger {
  DATA_CREATION = 'data_creation',
  LAST_ACCESS = 'last_access',
  RELATIONSHIP_END = 'relationship_end',
  CONTRACT_TERMINATION = 'contract_termination',
  LEGAL_REQUIREMENT_END = 'legal_requirement_end',
  BUSINESS_PURPOSE_FULFILLED = 'business_purpose_fulfilled',
}

/**
 * Retention extension condition
 */
export interface RetentionExtensionCondition {
  /** Condition type */
  conditionType: RetentionExtensionType;

  /** Extension period */
  extensionPeriod: RetentionPeriod;

  /** Condition criteria */
  criteria: string;

  /** Approval requirements */
  approvalRequirements: AuthorizationRequirement[];
}

/**
 * Retention extension types
 */
export enum RetentionExtensionType {
  LEGAL_HOLD = 'legal_hold',
  INVESTIGATION_PENDING = 'investigation_pending',
  LITIGATION_HOLD = 'litigation_hold',
  REGULATORY_REQUEST = 'regulatory_request',
  BUSINESS_JUSTIFICATION = 'business_justification',
  CONSENT_EXTENSION = 'consent_extension',
}

/**
 * Retention trigger
 */
export interface RetentionTrigger {
  /** Trigger type */
  triggerType: RetentionTriggerType;

  /** Trigger condition */
  condition: string;

  /** Automated processing */
  automatedProcessing: boolean;

  /** Approval requirements */
  approvalRequirements: AuthorizationRequirement[];
}

/**
 * Retention trigger types
 */
export enum RetentionTriggerType {
  TIME_BASED = 'time_based',
  EVENT_BASED = 'event_based',
  CONDITION_BASED = 'condition_based',
  REQUEST_BASED = 'request_based',
  REGULATORY_BASED = 'regulatory_based',
}

/**
 * Disposal requirement
 */
export interface DisposalRequirement {
  /** Disposal method */
  disposalMethod: DisposalMethod;

  /** Security level */
  securityLevel: DisposalSecurityLevel;

  /** Verification requirements */
  verificationRequirements: DisposalVerificationRequirement[];

  /** Documentation requirements */
  documentationRequirements: string[];
}

/**
 * Disposal methods
 */
export enum DisposalMethod {
  SECURE_DELETION = 'secure_deletion',
  CRYPTOGRAPHIC_ERASURE = 'cryptographic_erasure',
  PHYSICAL_DESTRUCTION = 'physical_destruction',
  DEGAUSSING = 'degaussing',
  OVERWRITING = 'overwriting',
  INCINERATION = 'incineration',
  SHREDDING = 'shredding',
}

/**
 * Disposal security levels
 */
export enum DisposalSecurityLevel {
  STANDARD = 'standard',
  HIGH_SECURITY = 'high_security',
  TOP_SECRET = 'top_secret',
  MILITARY_GRADE = 'military_grade',
}

/**
 * Disposal verification requirement
 */
export interface DisposalVerificationRequirement {
  /** Verification method */
  verificationMethod: DisposalVerificationMethod;

  /** Verification timeline */
  verificationTimeline: number;

  /** Verification documentation */
  verificationDocumentation: string[];

  /** Third-party verification */
  thirdPartyVerification: boolean;
}

/**
 * Disposal verification methods
 */
export enum DisposalVerificationMethod {
  CERTIFICATE_OF_DESTRUCTION = 'certificate_of_destruction',
  WITNESS_VERIFICATION = 'witness_verification',
  DIGITAL_VERIFICATION = 'digital_verification',
  AUDIT_VERIFICATION = 'audit_verification',
  FORENSIC_VERIFICATION = 'forensic_verification',
}

/**
 * Legal hold consideration
 */
export interface LegalHoldConsideration {
  /** Hold type */
  holdType: LegalHoldType;

  /** Hold reason */
  holdReason: string;

  /** Hold duration */
  holdDuration: RetentionPeriod;

  /** Hold scope */
  holdScope: LegalHoldScope;

  /** Release conditions */
  releaseConditions: LegalHoldReleaseCondition[];
}

/**
 * Legal hold types
 */
export enum LegalHoldType {
  LITIGATION_HOLD = 'litigation_hold',
  INVESTIGATION_HOLD = 'investigation_hold',
  REGULATORY_HOLD = 'regulatory_hold',
  DISCOVERY_HOLD = 'discovery_hold',
  PRESERVATION_ORDER = 'preservation_order',
}

/**
 * Legal hold scope
 */
export interface LegalHoldScope {
  /** Data categories included */
  includedDataCategories: DataCategory[];

  /** Time range */
  timeRange: TimeRange;

  /** Geographic scope */
  geographicScope: string[];

  /** System scope */
  systemScope: string[];

  /** Personnel scope */
  personnelScope: string[];
}

/**
 * Time range
 */
export interface TimeRange {
  /** Start date */
  startDate: Date;

  /** End date */
  endDate?: Date;

  /** Open-ended indicator */
  openEnded: boolean;
}

/**
 * Legal hold release condition
 */
export interface LegalHoldReleaseCondition {
  /** Condition type */
  conditionType: LegalHoldReleaseType;

  /** Condition description */
  description: string;

  /** Approval requirements */
  approvalRequirements: AuthorizationRequirement[];

  /** Documentation requirements */
  documentationRequirements: string[];
}

/**
 * Legal hold release types
 */
export enum LegalHoldReleaseType {
  CASE_CLOSURE = 'case_closure',
  SETTLEMENT_AGREEMENT = 'settlement_agreement',
  COURT_ORDER = 'court_order',
  INVESTIGATION_COMPLETION = 'investigation_completion',
  REGULATORY_CLEARANCE = 'regulatory_clearance',
  EXPIRATION = 'expiration',
}

/**
 * Privacy requirement
 */
export interface PrivacyRequirement {
  /** Privacy principle */
  principle: PrivacyPrinciple;

  /** Implementation requirements */
  implementationRequirements: PrivacyImplementationRequirement[];

  /** Assessment requirements */
  assessmentRequirements: PrivacyAssessmentRequirement[];

  /** Individual rights */
  individualRights: IndividualRight[];
}

/**
 * Privacy principles
 */
export enum PrivacyPrinciple {
  LAWFULNESS = 'lawfulness',
  FAIRNESS = 'fairness',
  TRANSPARENCY = 'transparency',
  PURPOSE_LIMITATION = 'purpose_limitation',
  DATA_MINIMIZATION = 'data_minimization',
  ACCURACY = 'accuracy',
  STORAGE_LIMITATION = 'storage_limitation',
  INTEGRITY_CONFIDENTIALITY = 'integrity_confidentiality',
  ACCOUNTABILITY = 'accountability',
}

/**
 * Privacy implementation requirement
 */
export interface PrivacyImplementationRequirement {
  /** Requirement description */
  description: string;

  /** Implementation methods */
  implementationMethods: PrivacyImplementationMethod[];

  /** Technical measures */
  technicalMeasures: string[];

  /** Organizational measures */
  organizationalMeasures: string[];
}

/**
 * Privacy implementation methods
 */
export enum PrivacyImplementationMethod {
  PRIVACY_BY_DESIGN = 'privacy_by_design',
  PRIVACY_BY_DEFAULT = 'privacy_by_default',
  DATA_PROTECTION_IMPACT_ASSESSMENT = 'data_protection_impact_assessment',
  CONSENT_MANAGEMENT = 'consent_management',
  ANONYMIZATION = 'anonymization',
  PSEUDONYMIZATION = 'pseudonymization',
  ACCESS_CONTROLS = 'access_controls',
  ENCRYPTION = 'encryption',
}

/**
 * Privacy assessment requirement
 */
export interface PrivacyAssessmentRequirement {
  /** Assessment type */
  assessmentType: PrivacyAssessmentType;

  /** Assessment frequency */
  frequency: ControlFrequency;

  /** Assessment scope */
  scope: PrivacyAssessmentScope;

  /** Deliverables */
  deliverables: string[];
}

/**
 * Privacy assessment types
 */
export enum PrivacyAssessmentType {
  PRIVACY_IMPACT_ASSESSMENT = 'privacy_impact_assessment',
  DATA_PROTECTION_IMPACT_ASSESSMENT = 'data_protection_impact_assessment',
  PRIVACY_AUDIT = 'privacy_audit',
  CONSENT_ASSESSMENT = 'consent_assessment',
  TRANSPARENCY_ASSESSMENT = 'transparency_assessment',
  RIGHTS_ASSESSMENT = 'rights_assessment',
}

/**
 * Privacy assessment scope
 */
export interface PrivacyAssessmentScope {
  /** Data processing activities */
  dataProcessingActivities: string[];

  /** Systems in scope */
  systemsInScope: string[];

  /** Geographic scope */
  geographicScope: string[];

  /** Time period */
  timePeriod: TimeRange;
}

/**
 * Individual right
 */
export interface IndividualRight {
  /** Right type */
  rightType: IndividualRightType;

  /** Implementation requirements */
  implementationRequirements: IndividualRightImplementation[];

  /** Response timeline */
  responseTimeline: ResponseTimeline;

  /** Verification requirements */
  verificationRequirements: IdentityVerificationRequirement[];
}

/**
 * Individual right types
 */
export enum IndividualRightType {
  RIGHT_TO_INFORMATION = 'right_to_information',
  RIGHT_OF_ACCESS = 'right_of_access',
  RIGHT_TO_RECTIFICATION = 'right_to_rectification',
  RIGHT_TO_ERASURE = 'right_to_erasure',
  RIGHT_TO_RESTRICT_PROCESSING = 'right_to_restrict_processing',
  RIGHT_TO_DATA_PORTABILITY = 'right_to_data_portability',
  RIGHT_TO_OBJECT = 'right_to_object',
  RIGHT_NOT_TO_BE_SUBJECT_TO_AUTOMATED_DECISION_MAKING = 'right_not_to_be_subject_to_automated_decision_making',
}

/**
 * Individual right implementation
 */
export interface IndividualRightImplementation {
  /** Implementation method */
  method: RightImplementationMethod;

  /** Automation level */
  automationLevel: AutomationLevel;

  /** Quality assurance measures */
  qualityAssuranceMeasures: string[];

  /** Exception handling */
  exceptionHandling: ExceptionHandling[];
}

/**
 * Right implementation methods
 */
export enum RightImplementationMethod {
  SELF_SERVICE_PORTAL = 'self_service_portal',
  EMAIL_REQUEST = 'email_request',
  PHONE_REQUEST = 'phone_request',
  MAIL_REQUEST = 'mail_request',
  IN_PERSON_REQUEST = 'in_person_request',
  API_REQUEST = 'api_request',
}

/**
 * Response timeline
 */
export interface ResponseTimeline {
  /** Acknowledgment timeline */
  acknowledgmentHours: number;

  /** Initial response timeline */
  initialResponseHours: number;

  /** Complete response timeline */
  completeResponseHours: number;

  /** Extension conditions */
  extensionConditions: ResponseExtensionCondition[];
}

/**
 * Response extension condition
 */
export interface ResponseExtensionCondition {
  /** Condition type */
  conditionType: ResponseExtensionType;

  /** Extension period */
  extensionHours: number;

  /** Notification requirements */
  notificationRequirements: string[];

  /** Approval requirements */
  approvalRequirements: AuthorizationRequirement[];
}

/**
 * Response extension types
 */
export enum ResponseExtensionType {
  COMPLEX_REQUEST = 'complex_request',
  HIGH_VOLUME_REQUEST = 'high_volume_request',
  TECHNICAL_DIFFICULTIES = 'technical_difficulties',
  THIRD_PARTY_INVOLVEMENT = 'third_party_involvement',
  LEGAL_COMPLEXITY = 'legal_complexity',
}

/**
 * Identity verification requirement
 */
export interface IdentityVerificationRequirement {
  /** Verification method */
  verificationMethod: IdentityVerificationMethod;

  /** Verification strength */
  verificationStrength: VerificationStrength;

  /** Required documents */
  requiredDocuments: string[];

  /** Verification timeline */
  verificationTimeline: number;
}

/**
 * Identity verification methods
 */
export enum IdentityVerificationMethod {
  GOVERNMENT_ID = 'government_id',
  BIOMETRIC_VERIFICATION = 'biometric_verification',
  KNOWLEDGE_BASED_AUTHENTICATION = 'knowledge_based_authentication',
  DOCUMENT_VERIFICATION = 'document_verification',
  DIGITAL_IDENTITY = 'digital_identity',
  THIRD_PARTY_VERIFICATION = 'third_party_verification',
}

/**
 * Verification strength levels
 */
export enum VerificationStrength {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

/**
 * Exception handling
 */
export interface ExceptionHandling {
  /** Exception type */
  exceptionType: RightExceptionType;

  /** Handling procedure */
  handlingProcedure: string;

  /** Legal basis */
  legalBasis: string;

  /** Documentation requirements */
  documentationRequirements: string[];
}

/**
 * Right exception types
 */
export enum RightExceptionType {
  FREEDOM_OF_EXPRESSION = 'freedom_of_expression',
  LEGAL_OBLIGATION = 'legal_obligation',
  PUBLIC_INTEREST = 'public_interest',
  LEGITIMATE_INTERESTS = 'legitimate_interests',
  VITAL_INTERESTS = 'vital_interests',
  ARCHIVAL_PURPOSES = 'archival_purposes',
  SCIENTIFIC_RESEARCH = 'scientific_research',
}

// Continue with remaining types...

export * from './compliance-forensic.types';