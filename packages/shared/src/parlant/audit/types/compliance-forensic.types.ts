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
  ComplianceStatus,
  ComplianceCheck,
  ComplianceViolation,
  ComplianceRiskAssessment,
} from './audit-core.types';

// Re-export commonly used types
export {
  SensitiveDataType,
  RiskLevel,
  ComplianceStatus,
  ComplianceCheck,
  ComplianceViolation,
  ComplianceRiskAssessment,
};

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

// ===========================
// EXECUTIVE SUMMARY & COMPLIANCE ASSESSMENT TYPES
// ===========================

/**
 * Executive summary for compliance reports
 */
export interface ExecutiveSummary {
  /** Summary identifier */
  summaryId: string;

  /** Report period covered */
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };

  /** Overall compliance score */
  overallComplianceScore: number;

  /** Key findings summary */
  keyFindings: ExecutiveFinding[];

  /** Critical violations */
  criticalViolations: ViolationSummary[];

  /** Risk assessment summary */
  riskAssessmentSummary: RiskSummary;

  /** Improvement recommendations */
  improvementRecommendations: RecommendationSummary[];

  /** Regulatory status */
  regulatoryStatus: RegulatoryStatusSummary;

  /** Financial impact assessment */
  financialImpactAssessment: FinancialImpactSummary;

  /** Next steps and timeline */
  nextStepsTimeline: NextStepsSummary;
}

/**
 * Executive finding
 */
export interface ExecutiveFinding {
  /** Finding identifier */
  findingId: string;

  /** Finding category */
  category: ExecutiveFindingCategory;

  /** Finding severity */
  severity: AuditEventSeverity;

  /** Brief description */
  briefDescription: string;

  /** Business impact */
  businessImpact: string;

  /** Recommended action */
  recommendedAction: string;

  /** Priority level */
  priority: ExecutivePriority;
}

/**
 * Executive finding categories
 */
export enum ExecutiveFindingCategory {
  COMPLIANCE_GAP = 'compliance_gap',
  SECURITY_VULNERABILITY = 'security_vulnerability',
  PROCESS_IMPROVEMENT = 'process_improvement',
  REGULATORY_CHANGE = 'regulatory_change',
  RISK_MITIGATION = 'risk_mitigation',
  OPERATIONAL_EFFICIENCY = 'operational_efficiency',
}

/**
 * Executive priority levels
 */
export enum ExecutivePriority {
  IMMEDIATE = 'immediate',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  MONITOR = 'monitor',
}

/**
 * Violation summary
 */
export interface ViolationSummary {
  /** Framework */
  framework: ComplianceFramework;

  /** Violation count */
  violationCount: number;

  /** Severity distribution */
  severityDistribution: Record<string, number>;

  /** Most critical violation */
  mostCriticalViolation: string;

  /** Estimated remediation effort */
  estimatedRemediationEffort: RemediationEffort;
}

/**
 * Remediation effort
 */
export interface RemediationEffort {
  /** Effort level */
  effortLevel: EffortLevel;

  /** Estimated hours */
  estimatedHours: number;

  /** Estimated cost */
  estimatedCost: number;

  /** Required resources */
  requiredResources: string[];

  /** Timeline estimate */
  timelineEstimate: TimelineEstimate;
}

/**
 * Effort levels
 */
export enum EffortLevel {
  MINIMAL = 'minimal',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  EXTENSIVE = 'extensive',
}

/**
 * Timeline estimate
 */
export interface TimelineEstimate {
  /** Minimum days */
  minimumDays: number;

  /** Maximum days */
  maximumDays: number;

  /** Confidence level */
  confidenceLevel: number;

  /** Dependencies */
  dependencies: string[];
}

/**
 * Risk summary
 */
export interface RiskSummary {
  /** Overall risk rating */
  overallRiskRating: RiskLevel;

  /** High risk areas */
  highRiskAreas: string[];

  /** Risk trend */
  riskTrend: RiskTrend;

  /** Risk mitigation status */
  mitigationStatus: MitigationStatus;
}

/**
 * Risk trends
 */
export enum RiskTrend {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DETERIORATING = 'deteriorating',
  VOLATILE = 'volatile',
}

/**
 * Mitigation status
 */
export enum MitigationStatus {
  ON_TRACK = 'on_track',
  BEHIND_SCHEDULE = 'behind_schedule',
  AT_RISK = 'at_risk',
  CRITICAL = 'critical',
}

/**
 * Recommendation summary
 */
export interface RecommendationSummary {
  /** Recommendation category */
  category: RecommendationCategory;

  /** Recommendation count */
  recommendationCount: number;

  /** Priority distribution */
  priorityDistribution: Record<ExecutivePriority, number>;

  /** Expected impact */
  expectedImpact: ExpectedImpact;
}

/**
 * Recommendation categories
 */
export enum RecommendationCategory {
  POLICY_UPDATE = 'policy_update',
  PROCESS_IMPROVEMENT = 'process_improvement',
  TECHNOLOGY_ENHANCEMENT = 'technology_enhancement',
  TRAINING_DEVELOPMENT = 'training_development',
  RISK_MITIGATION = 'risk_mitigation',
  COMPLIANCE_ALIGNMENT = 'compliance_alignment',
}

/**
 * Expected impact
 */
export interface ExpectedImpact {
  /** Compliance score improvement */
  complianceScoreImprovement: number;

  /** Risk reduction */
  riskReduction: number;

  /** Cost avoidance */
  costAvoidance: number;

  /** Efficiency gain */
  efficiencyGain: number;
}

/**
 * Regulatory status summary
 */
export interface RegulatoryStatusSummary {
  /** Frameworks assessed */
  frameworksAssessed: ComplianceFramework[];

  /** Compliance percentage by framework */
  complianceByFramework: Record<string, number>;

  /** Regulatory changes pending */
  pendingRegulatoryChanges: RegulatoryChange[];

  /** Audit readiness status */
  auditReadinessStatus: AuditReadinessLevel;
}

/**
 * Regulatory change
 */
export interface RegulatoryChange {
  /** Change identifier */
  changeId: string;

  /** Framework affected */
  frameworkAffected: ComplianceFramework;

  /** Change description */
  changeDescription: string;

  /** Effective date */
  effectiveDate: Date;

  /** Impact assessment */
  impactAssessment: string;

  /** Preparation status */
  preparationStatus: PreparationStatus;
}

/**
 * Preparation status
 */
export enum PreparationStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DEFERRED = 'deferred',
}

/**
 * Audit readiness levels
 */
export enum AuditReadinessLevel {
  FULLY_READY = 'fully_ready',
  MOSTLY_READY = 'mostly_ready',
  PARTIALLY_READY = 'partially_ready',
  NOT_READY = 'not_ready',
}

/**
 * Financial impact summary
 */
export interface FinancialImpactSummary {
  /** Total compliance cost */
  totalComplianceCost: number;

  /** Cost breakdown */
  costBreakdown: CostBreakdown;

  /** Cost savings identified */
  costSavingsIdentified: number;

  /** Return on investment */
  returnOnInvestment: number;

  /** Budget variance */
  budgetVariance: BudgetVariance;
}

/**
 * Cost breakdown
 */
export interface CostBreakdown {
  /** Personnel costs */
  personnelCosts: number;

  /** Technology costs */
  technologyCosts: number;

  /** External services */
  externalServices: number;

  /** Training costs */
  trainingCosts: number;

  /** Audit and assessment costs */
  auditAssessmentCosts: number;

  /** Remediation costs */
  remediationCosts: number;
}

/**
 * Budget variance
 */
export interface BudgetVariance {
  /** Planned budget */
  plannedBudget: number;

  /** Actual spending */
  actualSpending: number;

  /** Variance amount */
  varianceAmount: number;

  /** Variance percentage */
  variancePercentage: number;

  /** Variance explanation */
  varianceExplanation: string;
}

/**
 * Next steps summary
 */
export interface NextStepsSummary {
  /** Immediate actions */
  immediateActions: ActionItem[];

  /** Short-term initiatives */
  shortTermInitiatives: Initiative[];

  /** Long-term strategic goals */
  longTermStrategicGoals: StrategicGoal[];

  /** Key milestones */
  keyMilestones: Milestone[];
}

/**
 * Action item
 */
export interface ActionItem {
  /** Action identifier */
  actionId: string;

  /** Action description */
  description: string;

  /** Responsible party */
  responsibleParty: string;

  /** Due date */
  dueDate: Date;

  /** Priority */
  priority: ExecutivePriority;

  /** Dependencies */
  dependencies: string[];
}

/**
 * Initiative
 */
export interface Initiative {
  /** Initiative identifier */
  initiativeId: string;

  /** Initiative name */
  name: string;

  /** Initiative description */
  description: string;

  /** Success criteria */
  successCriteria: string[];

  /** Timeline */
  timeline: TimelineEstimate;

  /** Resource requirements */
  resourceRequirements: ResourceRequirement[];
}

/**
 * Resource requirement
 */
export interface ResourceRequirement {
  /** Resource type */
  resourceType: ResourceType;

  /** Quantity required */
  quantityRequired: number;

  /** Duration needed */
  durationNeeded: number;

  /** Skills required */
  skillsRequired: string[];
}

/**
 * Resource types
 */
export enum ResourceType {
  PERSONNEL = 'personnel',
  BUDGET = 'budget',
  TECHNOLOGY = 'technology',
  EXTERNAL_EXPERTISE = 'external_expertise',
  TRAINING = 'training',
}

/**
 * Strategic goal
 */
export interface StrategicGoal {
  /** Goal identifier */
  goalId: string;

  /** Goal statement */
  goalStatement: string;

  /** Success metrics */
  successMetrics: SuccessMetric[];

  /** Target completion date */
  targetCompletionDate: Date;

  /** Strategic alignment */
  strategicAlignment: string;
}

/**
 * Success metric
 */
export interface SuccessMetric {
  /** Metric name */
  metricName: string;

  /** Current value */
  currentValue: number;

  /** Target value */
  targetValue: number;

  /** Measurement frequency */
  measurementFrequency: string;

  /** Data source */
  dataSource: string;
}

/**
 * Milestone
 */
export interface Milestone {
  /** Milestone identifier */
  milestoneId: string;

  /** Milestone name */
  milestoneName: string;

  /** Milestone description */
  description: string;

  /** Target date */
  targetDate: Date;

  /** Success criteria */
  successCriteria: string[];

  /** Deliverables */
  deliverables: string[];
}

/**
 * Compliance assessment
 */
export interface ComplianceAssessment {
  /** Assessment identifier */
  assessmentId: string;

  /** Assessment date */
  assessmentDate: Date;

  /** Assessment scope */
  assessmentScope: AssessmentScope;

  /** Framework assessments */
  frameworkAssessments: FrameworkAssessment[];

  /** Overall compliance rating */
  overallComplianceRating: ComplianceRating;

  /** Assessment methodology */
  assessmentMethodology: AssessmentMethodology;

  /** Key findings */
  keyFindings: AssessmentFinding[];

  /** Recommendations */
  recommendations: AssessmentRecommendation[];

  /** Next assessment date */
  nextAssessmentDate: Date;
}

/**
 * Assessment scope
 */
export interface AssessmentScope {
  /** Organizational units */
  organizationalUnits: string[];

  /** Systems assessed */
  systemsAssessed: string[];

  /** Processes assessed */
  processesAssessed: string[];

  /** Time period assessed */
  timePeriodAssessed: {
    startDate: Date;
    endDate: Date;
  };

  /** Exclusions */
  exclusions: string[];
}

/**
 * Framework assessment
 */
export interface FrameworkAssessment {
  /** Framework */
  framework: ComplianceFramework;

  /** Compliance score */
  complianceScore: number;

  /** Controls assessed */
  controlsAssessed: ControlAssessment[];

  /** Gaps identified */
  gapsIdentified: ComplianceGap[];

  /** Improvement trend */
  improvementTrend: ImprovementTrend;
}

/**
 * Control assessment
 */
export interface ControlAssessment {
  /** Control identifier */
  controlId: string;

  /** Control name */
  controlName: string;

  /** Control effectiveness */
  controlEffectiveness: ControlEffectiveness;

  /** Implementation status */
  implementationStatus: ImplementationStatus;

  /** Testing results */
  testingResults: TestingResult[];

  /** Deficiencies identified */
  deficienciesIdentified: ControlDeficiency[];
}

/**
 * Control effectiveness levels
 */
export enum ControlEffectiveness {
  EFFECTIVE = 'effective',
  PARTIALLY_EFFECTIVE = 'partially_effective',
  INEFFECTIVE = 'ineffective',
  NOT_TESTED = 'not_tested',
}

/**
 * Testing result
 */
export interface TestingResult {
  /** Test identifier */
  testId: string;

  /** Test type */
  testType: TestType;

  /** Test result */
  testResult: TestResult;

  /** Sample size */
  sampleSize: number;

  /** Exceptions found */
  exceptionsFound: number;

  /** Test conclusion */
  testConclusion: string;
}

/**
 * Test types
 */
export enum TestType {
  WALKTHROUGH = 'walkthrough',
  INSPECTION = 'inspection',
  REPERFORMANCE = 'reperformance',
  OBSERVATION = 'observation',
  INQUIRY = 'inquiry',
}

/**
 * Test results
 */
export enum TestResult {
  PASSED = 'passed',
  FAILED = 'failed',
  PASSED_WITH_EXCEPTIONS = 'passed_with_exceptions',
  INCONCLUSIVE = 'inconclusive',
}

/**
 * Control deficiency
 */
export interface ControlDeficiency {
  /** Deficiency identifier */
  deficiencyId: string;

  /** Deficiency type */
  deficiencyType: DeficiencyType;

  /** Severity */
  severity: DeficiencySeverity;

  /** Description */
  description: string;

  /** Root cause */
  rootCause: string;

  /** Potential impact */
  potentialImpact: string;

  /** Remediation plan */
  remediationPlan: RemediationPlan;
}

/**
 * Deficiency types
 */
export enum DeficiencyType {
  DESIGN_DEFICIENCY = 'design_deficiency',
  OPERATING_DEFICIENCY = 'operating_deficiency',
  COMBINATION = 'combination',
}

/**
 * Deficiency severity
 */
export enum DeficiencySeverity {
  MATERIAL_WEAKNESS = 'material_weakness',
  SIGNIFICANT_DEFICIENCY = 'significant_deficiency',
  CONTROL_DEFICIENCY = 'control_deficiency',
}

/**
 * Remediation plan
 */
export interface RemediationPlan {
  /** Plan identifier */
  planId: string;

  /** Remediation actions */
  remediationActions: RemediationAction[];

  /** Target completion date */
  targetCompletionDate: Date;

  /** Responsible party */
  responsibleParty: string;

  /** Progress tracking */
  progressTracking: ProgressTracking;
}

/**
 * Remediation action
 */
export interface RemediationAction {
  /** Action identifier */
  actionId: string;

  /** Action description */
  actionDescription: string;

  /** Action type */
  actionType: RemediationActionType;

  /** Due date */
  dueDate: Date;

  /** Status */
  status: RemediationActionStatus;

  /** Progress percentage */
  progressPercentage: number;
}

/**
 * Remediation action types
 */
export enum RemediationActionType {
  POLICY_UPDATE = 'policy_update',
  PROCESS_CHANGE = 'process_change',
  SYSTEM_ENHANCEMENT = 'system_enhancement',
  TRAINING = 'training',
  STAFF_AUGMENTATION = 'staff_augmentation',
}

/**
 * Remediation action status
 */
export enum RemediationActionStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DELAYED = 'delayed',
  CANCELLED = 'cancelled',
}

/**
 * Progress tracking
 */
export interface ProgressTracking {
  /** Overall progress percentage */
  overallProgressPercentage: number;

  /** Milestones achieved */
  milestonesAchieved: number;

  /** Total milestones */
  totalMilestones: number;

  /** Last update date */
  lastUpdateDate: Date;

  /** Status summary */
  statusSummary: string;
}

/**
 * Compliance gap
 */
export interface ComplianceGap {
  /** Gap identifier */
  gapId: string;

  /** Gap description */
  gapDescription: string;

  /** Affected controls */
  affectedControls: string[];

  /** Risk level */
  riskLevel: RiskLevel;

  /** Remediation priority */
  remediationPriority: ExecutivePriority;

  /** Estimated effort */
  estimatedEffort: RemediationEffort;
}

/**
 * Improvement trend
 */
export interface ImprovementTrend {
  /** Trend direction */
  trendDirection: TrendDirection;

  /** Rate of improvement */
  rateOfImprovement: number;

  /** Historical data points */
  historicalDataPoints: TrendDataPoint[];

  /** Projected future score */
  projectedFutureScore: number;
}

/**
 * Trend directions
 */
export enum TrendDirection {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining',
}

/**
 * Trend data point
 */
export interface TrendDataPoint {
  /** Assessment date */
  assessmentDate: Date;

  /** Compliance score */
  complianceScore: number;

  /** Notable changes */
  notableChanges: string[];
}

/**
 * Compliance rating
 */
export interface ComplianceRating {
  /** Overall score */
  overallScore: number;

  /** Rating level */
  ratingLevel: RatingLevel;

  /** Framework scores */
  frameworkScores: Record<string, number>;

  /** Confidence level */
  confidenceLevel: number;

  /** Rating methodology */
  ratingMethodology: string;
}

/**
 * Rating levels
 */
export enum RatingLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  SATISFACTORY = 'satisfactory',
  NEEDS_IMPROVEMENT = 'needs_improvement',
  POOR = 'poor',
}

/**
 * Assessment methodology
 */
export interface AssessmentMethodology {
  /** Methodology name */
  methodologyName: string;

  /** Assessment standards */
  assessmentStandards: string[];

  /** Sampling approach */
  samplingApproach: SamplingApproach;

  /** Testing procedures */
  testingProcedures: string[];

  /** Evidence requirements */
  evidenceRequirements: string[];
}

/**
 * Assessment finding
 */
export interface AssessmentFinding {
  /** Finding identifier */
  findingId: string;

  /** Finding type */
  findingType: FindingType;

  /** Severity */
  severity: AuditEventSeverity;

  /** Framework reference */
  frameworkReference: string;

  /** Finding description */
  findingDescription: string;

  /** Evidence */
  evidence: string[];

  /** Impact assessment */
  impactAssessment: string;

  /** Management response */
  managementResponse?: string;
}

/**
 * Finding types
 */
export enum FindingType {
  COMPLIANCE_VIOLATION = 'compliance_violation',
  CONTROL_DEFICIENCY = 'control_deficiency',
  PROCESS_IMPROVEMENT = 'process_improvement',
  BEST_PRACTICE = 'best_practice',
  OBSERVATION = 'observation',
}

/**
 * Assessment recommendation
 */
export interface AssessmentRecommendation {
  /** Recommendation identifier */
  recommendationId: string;

  /** Recommendation category */
  category: RecommendationCategory;

  /** Priority */
  priority: ExecutivePriority;

  /** Recommendation text */
  recommendationText: string;

  /** Implementation guidance */
  implementationGuidance: string[];

  /** Expected benefits */
  expectedBenefits: string[];

  /** Implementation timeline */
  implementationTimeline: TimelineEstimate;

  /** Resource requirements */
  resourceRequirements: ResourceRequirement[];
}

/**
 * Compliance evidence package
 */
export interface ComplianceEvidencePackage {
  /** Package identifier */
  packageId: string;

  /** Collection date */
  collectionDate: Date;

  /** Evidence items */
  evidenceItems: ComplianceEvidenceItem[];

  /** Chain of custody */
  chainOfCustody: ChainOfCustodyRecord[];

  /** Integrity verification */
  integrityVerification: IntegrityVerification;

  /** Legal admissibility */
  legalAdmissibility: LegalAdmissibilityAssessment;

  /** Retention requirements */
  retentionRequirements: RetentionRequirement[];
}

/**
 * Compliance evidence item
 */
export interface ComplianceEvidenceItem {
  /** Evidence identifier */
  evidenceId: string;

  /** Evidence type */
  evidenceType: EvidenceType;

  /** Source system */
  sourceSystem: string;

  /** Collection method */
  collectionMethod: string;

  /** File path or reference */
  fileReference: string;

  /** Hash value */
  hashValue: string;

  /** Metadata */
  metadata: EvidenceMetadata;

  /** Relevance assessment */
  relevanceAssessment: RelevanceAssessment;
}

/**
 * Evidence metadata
 */
export interface EvidenceMetadata {
  /** File size */
  fileSize: number;

  /** Creation date */
  creationDate: Date;

  /** Last modified date */
  lastModifiedDate: Date;

  /** File format */
  fileFormat: string;

  /** Encoding */
  encoding: string;

  /** Digital signature */
  digitalSignature?: string;
}

/**
 * Relevance assessment
 */
export interface RelevanceAssessment {
  /** Relevance score */
  relevanceScore: number;

  /** Relevance criteria */
  relevanceCriteria: string[];

  /** Quality assessment */
  qualityAssessment: EvidenceQuality;

  /** Completeness assessment */
  completenessAssessment: CompletenessLevel;
}

/**
 * Evidence quality levels
 */
export enum EvidenceQuality {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  QUESTIONABLE = 'questionable',
}

/**
 * Completeness levels
 */
export enum CompletenessLevel {
  COMPLETE = 'complete',
  SUBSTANTIALLY_COMPLETE = 'substantially_complete',
  PARTIALLY_COMPLETE = 'partially_complete',
  INCOMPLETE = 'incomplete',
}

/**
 * Chain of custody record
 */
export interface ChainOfCustodyRecord {
  /** Record identifier */
  recordId: string;

  /** Custodian */
  custodian: string;

  /** Transfer date */
  transferDate: Date;

  /** Transfer reason */
  transferReason: string;

  /** Transfer method */
  transferMethod: string;

  /** Integrity verification */
  integrityVerified: boolean;

  /** Digital signature */
  digitalSignature: string;
}

/**
 * Integrity verification
 */
export interface IntegrityVerification {
  /** Verification method */
  verificationMethod: IntegrityVerificationMethod;

  /** Verification timestamp */
  verificationTimestamp: Date;

  /** Verification result */
  verificationResult: VerificationResult;

  /** Hash algorithm used */
  hashAlgorithm: string;

  /** Verification details */
  verificationDetails: string;
}

/**
 * Integrity verification methods
 */
export enum IntegrityVerificationMethod {
  HASH_COMPARISON = 'hash_comparison',
  DIGITAL_SIGNATURE = 'digital_signature',
  BLOCKCHAIN_VERIFICATION = 'blockchain_verification',
  TIMESTAMP_VERIFICATION = 'timestamp_verification',
}

/**
 * Verification results
 */
export enum VerificationResult {
  VERIFIED = 'verified',
  FAILED = 'failed',
  INCONCLUSIVE = 'inconclusive',
}

/**
 * Legal admissibility assessment
 */
export interface LegalAdmissibilityAssessment {
  /** Admissibility status */
  admissibilityStatus: AdmissibilityStatus;

  /** Legal standards met */
  legalStandardsMet: string[];

  /** Potential challenges */
  potentialChallenges: string[];

  /** Authentication requirements */
  authenticationRequirements: string[];

  /** Foundation requirements */
  foundationRequirements: string[];
}

/**
 * Admissibility status
 */
export enum AdmissibilityStatus {
  ADMISSIBLE = 'admissible',
  CONDITIONALLY_ADMISSIBLE = 'conditionally_admissible',
  NOT_ADMISSIBLE = 'not_admissible',
  UNDER_REVIEW = 'under_review',
}

/**
 * Compliance recommendation
 */
export interface ComplianceRecommendation {
  /** Recommendation identifier */
  recommendationId: string;

  /** Recommendation type */
  recommendationType: ComplianceRecommendationType;

  /** Priority level */
  priorityLevel: ExecutivePriority;

  /** Recommendation title */
  title: string;

  /** Detailed description */
  detailedDescription: string;

  /** Business justification */
  businessJustification: string;

  /** Implementation steps */
  implementationSteps: ImplementationStep[];

  /** Resource requirements */
  resourceRequirements: ResourceRequirement[];

  /** Timeline */
  timeline: TimelineEstimate;

  /** Success metrics */
  successMetrics: SuccessMetric[];

  /** Risk mitigation */
  riskMitigation: string[];

  /** Cost-benefit analysis */
  costBenefitAnalysis: CostBenefitAnalysis;
}

/**
 * Compliance recommendation types
 */
export enum ComplianceRecommendationType {
  IMMEDIATE_ACTION = 'immediate_action',
  SHORT_TERM_IMPROVEMENT = 'short_term_improvement',
  LONG_TERM_STRATEGIC = 'long_term_strategic',
  PROCESS_OPTIMIZATION = 'process_optimization',
  TECHNOLOGY_ENHANCEMENT = 'technology_enhancement',
  POLICY_UPDATE = 'policy_update',
}

/**
 * Implementation step
 */
export interface ImplementationStep {
  /** Step identifier */
  stepId: string;

  /** Step order */
  stepOrder: number;

  /** Step description */
  stepDescription: string;

  /** Responsible party */
  responsibleParty: string;

  /** Prerequisites */
  prerequisites: string[];

  /** Deliverables */
  deliverables: string[];

  /** Duration estimate */
  durationEstimate: number;

  /** Dependencies */
  dependencies: string[];
}

/**
 * Compliance action plan
 */
export interface ComplianceActionPlan {
  /** Plan identifier */
  planId: string;

  /** Plan name */
  planName: string;

  /** Plan description */
  planDescription: string;

  /** Plan objectives */
  planObjectives: string[];

  /** Action items */
  actionItems: ComplianceActionItem[];

  /** Timeline overview */
  timelineOverview: TimelineOverview;

  /** Resource allocation */
  resourceAllocation: ResourceAllocation;

  /** Risk assessment */
  riskAssessment: PlanRiskAssessment;

  /** Success criteria */
  successCriteria: PlanSuccessCriteria[];

  /** Monitoring and reporting */
  monitoringReporting: MonitoringReportingPlan;
}

/**
 * Compliance action item
 */
export interface ComplianceActionItem {
  /** Action identifier */
  actionId: string;

  /** Action title */
  actionTitle: string;

  /** Action description */
  actionDescription: string;

  /** Action category */
  actionCategory: ActionCategory;

  /** Priority */
  priority: ExecutivePriority;

  /** Assigned to */
  assignedTo: string;

  /** Due date */
  dueDate: Date;

  /** Status */
  status: ActionItemStatus;

  /** Progress percentage */
  progressPercentage: number;

  /** Dependencies */
  dependencies: string[];

  /** Deliverables */
  deliverables: ActionDeliverable[];

  /** Resource requirements */
  resourceRequirements: ResourceRequirement[];
}

/**
 * Action categories
 */
export enum ActionCategory {
  POLICY_DEVELOPMENT = 'policy_development',
  PROCESS_IMPROVEMENT = 'process_improvement',
  SYSTEM_IMPLEMENTATION = 'system_implementation',
  TRAINING_DELIVERY = 'training_delivery',
  DOCUMENTATION_UPDATE = 'documentation_update',
  RISK_MITIGATION = 'risk_mitigation',
}

/**
 * Action item status
 */
export enum ActionItemStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DEFERRED = 'deferred',
}

/**
 * Action deliverable
 */
export interface ActionDeliverable {
  /** Deliverable identifier */
  deliverableId: string;

  /** Deliverable name */
  deliverableName: string;

  /** Deliverable type */
  deliverableType: DeliverableType;

  /** Due date */
  dueDate: Date;

  /** Status */
  status: DeliverableStatus;

  /** Quality criteria */
  qualityCriteria: string[];

  /** Acceptance criteria */
  acceptanceCriteria: string[];
}

/**
 * Deliverable types
 */
export enum DeliverableType {
  DOCUMENT = 'document',
  SYSTEM = 'system',
  PROCESS = 'process',
  TRAINING_MATERIAL = 'training_material',
  REPORT = 'report',
  CERTIFICATION = 'certification',
}

/**
 * Deliverable status
 */
export enum DeliverableStatus {
  PENDING = 'pending',
  IN_DEVELOPMENT = 'in_development',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  DELIVERED = 'delivered',
  REJECTED = 'rejected',
}

/**
 * Timeline overview
 */
export interface TimelineOverview {
  /** Plan start date */
  planStartDate: Date;

  /** Plan end date */
  planEndDate: Date;

  /** Major phases */
  majorPhases: PlanPhase[];

  /** Critical path */
  criticalPath: string[];

  /** Key milestones */
  keyMilestones: Milestone[];
}

/**
 * Plan phase
 */
export interface PlanPhase {
  /** Phase identifier */
  phaseId: string;

  /** Phase name */
  phaseName: string;

  /** Phase description */
  phaseDescription: string;

  /** Start date */
  startDate: Date;

  /** End date */
  endDate: Date;

  /** Phase objectives */
  phaseObjectives: string[];

  /** Phase deliverables */
  phaseDeliverables: string[];
}

/**
 * Resource allocation
 */
export interface ResourceAllocation {
  /** Total budget allocated */
  totalBudgetAllocated: number;

  /** Budget by category */
  budgetByCategory: Record<string, number>;

  /** Personnel allocation */
  personnelAllocation: PersonnelAllocation[];

  /** Technology resources */
  technologyResources: TechnologyResource[];

  /** External services */
  externalServices: ExternalService[];
}

/**
 * Personnel allocation
 */
export interface PersonnelAllocation {
  /** Role */
  role: string;

  /** Skill requirements */
  skillRequirements: string[];

  /** Effort percentage */
  effortPercentage: number;

  /** Duration */
  duration: number;

  /** Cost */
  cost: number;
}

/**
 * Technology resource
 */
export interface TechnologyResource {
  /** Resource name */
  resourceName: string;

  /** Resource type */
  resourceType: TechnologyResourceType;

  /** Specifications */
  specifications: Record<string, unknown>;

  /** Cost */
  cost: number;

  /** Procurement timeline */
  procurementTimeline: number;
}

/**
 * Technology resource types
 */
export enum TechnologyResourceType {
  SOFTWARE_LICENSE = 'software_license',
  HARDWARE = 'hardware',
  CLOUD_SERVICE = 'cloud_service',
  SECURITY_TOOL = 'security_tool',
  MONITORING_TOOL = 'monitoring_tool',
}

/**
 * External service
 */
export interface ExternalService {
  /** Service name */
  serviceName: string;

  /** Service provider */
  serviceProvider: string;

  /** Service type */
  serviceType: ExternalServiceType;

  /** Service description */
  serviceDescription: string;

  /** Cost */
  cost: number;

  /** Contract duration */
  contractDuration: number;
}

/**
 * External service types
 */
export enum ExternalServiceType {
  CONSULTING = 'consulting',
  AUDIT_SERVICES = 'audit_services',
  TRAINING_SERVICES = 'training_services',
  LEGAL_SERVICES = 'legal_services',
  TECHNOLOGY_SERVICES = 'technology_services',
}

/**
 * Plan risk assessment
 */
export interface PlanRiskAssessment {
  /** Overall risk level */
  overallRiskLevel: RiskLevel;

  /** Risk factors */
  riskFactors: PlanRiskFactor[];

  /** Mitigation strategies */
  mitigationStrategies: RiskMitigationStrategy[];

  /** Contingency plans */
  contingencyPlans: ContingencyPlan[];
}

/**
 * Plan risk factor
 */
export interface PlanRiskFactor {
  /** Risk identifier */
  riskId: string;

  /** Risk description */
  riskDescription: string;

  /** Risk category */
  riskCategory: PlanRiskCategory;

  /** Probability */
  probability: RiskProbability;

  /** Impact */
  impact: RiskImpact;

  /** Risk score */
  riskScore: number;
}

/**
 * Plan risk categories
 */
export enum PlanRiskCategory {
  RESOURCE_RISK = 'resource_risk',
  TIMELINE_RISK = 'timeline_risk',
  TECHNICAL_RISK = 'technical_risk',
  STAKEHOLDER_RISK = 'stakeholder_risk',
  COMPLIANCE_RISK = 'compliance_risk',
  EXTERNAL_RISK = 'external_risk',
}

/**
 * Risk mitigation strategy
 */
export interface RiskMitigationStrategy {
  /** Strategy identifier */
  strategyId: string;

  /** Risk addressed */
  riskAddressed: string;

  /** Mitigation approach */
  mitigationApproach: MitigationApproach;

  /** Implementation actions */
  implementationActions: string[];

  /** Effectiveness assessment */
  effectivenessAssessment: EffectivenessAssessment;
}

/**
 * Mitigation approaches
 */
export enum MitigationApproach {
  AVOID = 'avoid',
  MITIGATE = 'mitigate',
  TRANSFER = 'transfer',
  ACCEPT = 'accept',
  MONITOR = 'monitor',
}

/**
 * Effectiveness assessment
 */
export interface EffectivenessAssessment {
  /** Effectiveness level */
  effectivenessLevel: EffectivenessLevel;

  /** Residual risk level */
  residualRiskLevel: RiskLevel;

  /** Monitoring requirements */
  monitoringRequirements: string[];
}

/**
 * Effectiveness levels
 */
export enum EffectivenessLevel {
  HIGHLY_EFFECTIVE = 'highly_effective',
  EFFECTIVE = 'effective',
  MODERATELY_EFFECTIVE = 'moderately_effective',
  MINIMALLY_EFFECTIVE = 'minimally_effective',
  INEFFECTIVE = 'ineffective',
}

/**
 * Contingency plan
 */
export interface ContingencyPlan {
  /** Plan identifier */
  planId: string;

  /** Trigger conditions */
  triggerConditions: string[];

  /** Response actions */
  responseActions: string[];

  /** Resource requirements */
  resourceRequirements: ResourceRequirement[];

  /** Activation criteria */
  activationCriteria: string[];
}

/**
 * Plan success criteria
 */
export interface PlanSuccessCriteria {
  /** Criteria identifier */
  criteriaId: string;

  /** Criteria description */
  criteriaDescription: string;

  /** Measurement method */
  measurementMethod: string;

  /** Target value */
  targetValue: number;

  /** Current value */
  currentValue: number;

  /** Progress indicator */
  progressIndicator: ProgressIndicator;
}

/**
 * Progress indicator
 */
export interface ProgressIndicator {
  /** Indicator type */
  indicatorType: ProgressIndicatorType;

  /** Current status */
  currentStatus: ProgressStatus;

  /** Trend */
  trend: ProgressTrend;

  /** Last update */
  lastUpdate: Date;
}

/**
 * Progress indicator types
 */
export enum ProgressIndicatorType {
  PERCENTAGE_COMPLETE = 'percentage_complete',
  MILESTONE_ACHIEVED = 'milestone_achieved',
  DELIVERABLE_COMPLETED = 'deliverable_completed',
  METRIC_IMPROVEMENT = 'metric_improvement',
}

/**
 * Progress status
 */
export enum ProgressStatus {
  ON_TRACK = 'on_track',
  AT_RISK = 'at_risk',
  BEHIND_SCHEDULE = 'behind_schedule',
  AHEAD_OF_SCHEDULE = 'ahead_of_schedule',
}

/**
 * Progress trends
 */
export enum ProgressTrend {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining',
}

/**
 * Monitoring and reporting plan
 */
export interface MonitoringReportingPlan {
  /** Monitoring frequency */
  monitoringFrequency: MonitoringFrequency;

  /** Reporting schedule */
  reportingSchedule: ReportingSchedule;

  /** Key performance indicators */
  keyPerformanceIndicators: KeyPerformanceIndicator[];

  /** Stakeholder communication */
  stakeholderCommunication: StakeholderCommunication[];

  /** Escalation procedures */
  escalationProcedures: EscalationProcedure[];
}

/**
 * Monitoring frequency
 */
export enum MonitoringFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BI_WEEKLY = 'bi_weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
}

/**
 * Reporting schedule
 */
export interface ReportingSchedule {
  /** Regular reports */
  regularReports: RegularReport[];

  /** Ad-hoc reports */
  adHocReports: AdHocReport[];

  /** Dashboard updates */
  dashboardUpdates: DashboardUpdate[];
}

/**
 * Regular report
 */
export interface RegularReport {
  /** Report name */
  reportName: string;

  /** Report frequency */
  reportFrequency: ReportingFrequency;

  /** Recipients */
  recipients: string[];

  /** Content elements */
  contentElements: string[];
}

/**
 * Ad-hoc report
 */
export interface AdHocReport {
  /** Report trigger */
  reportTrigger: string;

  /** Report recipients */
  reportRecipients: string[];

  /** Report content */
  reportContent: string[];

  /** Delivery method */
  deliveryMethod: string;
}

/**
 * Dashboard update
 */
export interface DashboardUpdate {
  /** Update frequency */
  updateFrequency: MonitoringFrequency;

  /** Metrics displayed */
  metricsDisplayed: string[];

  /** Access permissions */
  accessPermissions: string[];
}

/**
 * Key performance indicator
 */
export interface KeyPerformanceIndicator {
  /** KPI identifier */
  kpiId: string;

  /** KPI name */
  kpiName: string;

  /** KPI description */
  kpiDescription: string;

  /** Measurement unit */
  measurementUnit: string;

  /** Target value */
  targetValue: number;

  /** Current value */
  currentValue: number;

  /** Data source */
  dataSource: string;

  /** Calculation method */
  calculationMethod: string;
}

/**
 * Stakeholder communication
 */
export interface StakeholderCommunication {
  /** Stakeholder group */
  stakeholderGroup: string;

  /** Communication frequency */
  communicationFrequency: MonitoringFrequency;

  /** Communication method */
  communicationMethod: CommunicationMethod;

  /** Information shared */
  informationShared: string[];
}

/**
 * Communication methods
 */
export enum CommunicationMethod {
  EMAIL = 'email',
  MEETING = 'meeting',
  DASHBOARD = 'dashboard',
  REPORT = 'report',
  PRESENTATION = 'presentation',
}

/**
 * Escalation procedure
 */
export interface EscalationProcedure {
  /** Escalation trigger */
  escalationTrigger: string;

  /** Escalation level */
  escalationLevel: EscalationLevel;

  /** Escalation contacts */
  escalationContacts: string[];

  /** Response timeline */
  responseTimeline: number;

  /** Escalation actions */
  escalationActions: string[];
}

/**
 * Escalation levels
 */
export enum EscalationLevel {
  LEVEL_1 = 'level_1',
  LEVEL_2 = 'level_2',
  LEVEL_3 = 'level_3',
  EXECUTIVE = 'executive',
}

/**
 * Report appendix
 */
export interface ReportAppendix {
  /** Appendix identifier */
  appendixId: string;

  /** Appendix title */
  appendixTitle: string;

  /** Appendix type */
  appendixType: AppendixType;

  /** Content description */
  contentDescription: string;

  /** File references */
  fileReferences: FileReference[];

  /** Page count */
  pageCount: number;

  /** Access restrictions */
  accessRestrictions: string[];
}

/**
 * Appendix types
 */
export enum AppendixType {
  SUPPORTING_DOCUMENTATION = 'supporting_documentation',
  DETAILED_ANALYSIS = 'detailed_analysis',
  TECHNICAL_SPECIFICATIONS = 'technical_specifications',
  LEGAL_REFERENCES = 'legal_references',
  EVIDENCE_CATALOG = 'evidence_catalog',
  GLOSSARY = 'glossary',
}

/**
 * File reference
 */
export interface FileReference {
  /** File identifier */
  fileId: string;

  /** File name */
  fileName: string;

  /** File path */
  filePath: string;

  /** File type */
  fileType: string;

  /** File size */
  fileSize: number;

  /** Creation date */
  creationDate: Date;

  /** Hash value */
  hashValue: string;
}

/**
 * Report signature
 */
export interface ReportSignature {
  /** Signature identifier */
  signatureId: string;

  /** Signatory information */
  signatoryInformation: SignatoryInformation;

  /** Signature type */
  signatureType: SignatureType;

  /** Signature timestamp */
  signatureTimestamp: Date;

  /** Digital signature */
  digitalSignature: string;

  /** Signature validation */
  signatureValidation: SignatureValidation;
}

/**
 * Signatory information
 */
export interface SignatoryInformation {
  /** Signatory name */
  signatoryName: string;

  /** Signatory title */
  signatoryTitle: string;

  /** Organization */
  organization: string;

  /** Professional credentials */
  professionalCredentials: string[];

  /** Authority to sign */
  authorityToSign: string;

  /** Contact information */
  contactInformation: ContactInformation;
}

/**
 * Contact information
 */
export interface ContactInformation {
  /** Email address */
  emailAddress: string;

  /** Phone number */
  phoneNumber: string;

  /** Office address */
  officeAddress: string;

  /** Alternative contact */
  alternativeContact?: string;
}

/**
 * Signature types
 */
export enum SignatureType {
  DIGITAL_SIGNATURE = 'digital_signature',
  ELECTRONIC_SIGNATURE = 'electronic_signature',
  WET_SIGNATURE = 'wet_signature',
  NOTARIZED_SIGNATURE = 'notarized_signature',
}

/**
 * Signature validation
 */
export interface SignatureValidation {
  /** Validation status */
  validationStatus: ValidationStatus;

  /** Validation method */
  validationMethod: SignatureValidationMethod;

  /** Validation timestamp */
  validationTimestamp: Date;

  /** Certificate information */
  certificateInformation: CertificateInformation;

  /** Validation details */
  validationDetails: string;
}

/**
 * Validation status
 */
export enum ValidationStatus {
  VALID = 'valid',
  INVALID = 'invalid',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  UNKNOWN = 'unknown',
}

/**
 * Signature validation methods
 */
export enum SignatureValidationMethod {
  PKI_VALIDATION = 'pki_validation',
  CERTIFICATE_AUTHORITY = 'certificate_authority',
  TRUSTED_TIMESTAMPING = 'trusted_timestamping',
  BIOMETRIC_VERIFICATION = 'biometric_verification',
}

/**
 * Certificate information
 */
export interface CertificateInformation {
  /** Certificate serial number */
  certificateSerialNumber: string;

  /** Issuer */
  issuer: string;

  /** Subject */
  subject: string;

  /** Valid from */
  validFrom: Date;

  /** Valid to */
  validTo: Date;

  /** Certificate status */
  certificateStatus: CertificateStatus;
}

/**
 * Certificate status
 */
export enum CertificateStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  SUSPENDED = 'suspended',
}

/**
 * Compliance certification
 */
export interface ComplianceCertification {
  /** Certification identifier */
  certificationId: string;

  /** Certification type */
  certificationType: ComplianceCertificationType;

  /** Certifying body */
  certifyingBody: CertifyingBody;

  /** Certification scope */
  certificationScope: CertificationScope;

  /** Certification date */
  certificationDate: Date;

  /** Validity period */
  validityPeriod: CertificationValidityPeriod;

  /** Certification conditions */
  certificationConditions: CertificationCondition[];

  /** Surveillance requirements */
  surveillanceRequirements: SurveillanceRequirement[];

  /** Certification evidence */
  certificationEvidence: CertificationEvidence[];
}

/**
 * Compliance certification types
 */
export enum ComplianceCertificationType {
  ISO_27001 = 'iso_27001',
  SOC_2 = 'soc_2',
  PCI_DSS = 'pci_dss',
  HIPAA = 'hipaa',
  GDPR = 'gdpr',
  FedRAMP = 'fedramp',
  CUSTOM = 'custom',
}

/**
 * Certifying body
 */
export interface CertifyingBody {
  /** Body name */
  bodyName: string;

  /** Accreditation number */
  accreditationNumber: string;

  /** Accrediting authority */
  accreditingAuthority: string;

  /** Contact information */
  contactInformation: ContactInformation;

  /** Scope of accreditation */
  scopeOfAccreditation: string[];
}

/**
 * Certification scope
 */
export interface CertificationScope {
  /** Scope description */
  scopeDescription: string;

  /** Systems covered */
  systemsCovered: string[];

  /** Processes covered */
  processesCovered: string[];

  /** Locations covered */
  locationsCovered: string[];

  /** Exclusions */
  exclusions: string[];
}

/**
 * Certification validity period
 */
export interface CertificationValidityPeriod {
  /** Issue date */
  issueDate: Date;

  /** Expiry date */
  expiryDate: Date;

  /** Renewal requirements */
  renewalRequirements: RenewalRequirement[];

  /** Surveillance schedule */
  surveillanceSchedule: SurveillanceSchedule;
}

/**
 * Renewal requirement
 */
export interface RenewalRequirement {
  /** Requirement type */
  requirementType: RenewalRequirementType;

  /** Requirement description */
  requirementDescription: string;

  /** Due date */
  dueDate: Date;

  /** Completion status */
  completionStatus: CompletionStatus;
}

/**
 * Renewal requirement types
 */
export enum RenewalRequirementType {
  DOCUMENTATION_UPDATE = 'documentation_update',
  SYSTEM_ASSESSMENT = 'system_assessment',
  STAFF_TRAINING = 'staff_training',
  PROCESS_REVIEW = 'process_review',
  MANAGEMENT_REVIEW = 'management_review',
}

/**
 * Completion status
 */
export enum CompletionStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
}

/**
 * Surveillance schedule
 */
export interface SurveillanceSchedule {
  /** Surveillance frequency */
  surveillanceFrequency: SurveillanceFrequency;

  /** Next surveillance date */
  nextSurveillanceDate: Date;

  /** Surveillance scope */
  surveillanceScope: string[];

  /** Surveillance methods */
  surveillanceMethods: SurveillanceMethod[];
}

/**
 * Surveillance frequency
 */
export enum SurveillanceFrequency {
  ANNUAL = 'annual',
  BI_ANNUAL = 'bi_annual',
  QUARTERLY = 'quarterly',
  MONTHLY = 'monthly',
  CONTINUOUS = 'continuous',
}

/**
 * Surveillance methods
 */
export enum SurveillanceMethod {
  ON_SITE_AUDIT = 'on_site_audit',
  REMOTE_AUDIT = 'remote_audit',
  DOCUMENT_REVIEW = 'document_review',
  SYSTEM_MONITORING = 'system_monitoring',
  STAKEHOLDER_INTERVIEW = 'stakeholder_interview',
}

/**
 * Certification condition
 */
export interface CertificationCondition {
  /** Condition identifier */
  conditionId: string;

  /** Condition type */
  conditionType: ConditionType;

  /** Condition description */
  conditionDescription: string;

  /** Compliance deadline */
  complianceDeadline: Date;

  /** Verification requirements */
  verificationRequirements: string[];

  /** Status */
  status: ConditionStatus;
}

/**
 * Condition types
 */
export enum ConditionType {
  MANDATORY_IMPROVEMENT = 'mandatory_improvement',
  RECOMMENDED_IMPROVEMENT = 'recommended_improvement',
  MONITORING_REQUIREMENT = 'monitoring_requirement',
  REPORTING_REQUIREMENT = 'reporting_requirement',
  TRAINING_REQUIREMENT = 'training_requirement',
}

/**
 * Condition status
 */
export enum ConditionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
  WAIVED = 'waived',
}

/**
 * Surveillance requirement
 */
export interface SurveillanceRequirement {
  /** Requirement identifier */
  requirementId: string;

  /** Surveillance type */
  surveillanceType: SurveillanceType;

  /** Frequency */
  frequency: SurveillanceFrequency;

  /** Scope */
  scope: string[];

  /** Methods */
  methods: SurveillanceMethod[];

  /** Reporting requirements */
  reportingRequirements: string[];
}

/**
 * Surveillance types
 */
export enum SurveillanceType {
  COMPLIANCE_MONITORING = 'compliance_monitoring',
  PERFORMANCE_MONITORING = 'performance_monitoring',
  INCIDENT_MONITORING = 'incident_monitoring',
  CHANGE_MONITORING = 'change_monitoring',
  RISK_MONITORING = 'risk_monitoring',
}

/**
 * Certification evidence
 */
export interface CertificationEvidence {
  /** Evidence identifier */
  evidenceId: string;

  /** Evidence type */
  evidenceType: CertificationEvidenceType;

  /** Evidence description */
  evidenceDescription: string;

  /** File reference */
  fileReference: FileReference;

  /** Verification status */
  verificationStatus: EvidenceVerificationStatus;

  /** Retention period */
  retentionPeriod: number;
}

/**
 * Certification evidence types
 */
export enum CertificationEvidenceType {
  AUDIT_REPORT = 'audit_report',
  CERTIFICATE = 'certificate',
  ASSESSMENT_DOCUMENTATION = 'assessment_documentation',
  CORRECTIVE_ACTION_EVIDENCE = 'corrective_action_evidence',
  SURVEILLANCE_REPORT = 'surveillance_report',
}

/**
 * Evidence verification status
 */
export enum EvidenceVerificationStatus {
  VERIFIED = 'verified',
  PENDING_VERIFICATION = 'pending_verification',
  VERIFICATION_FAILED = 'verification_failed',
  NOT_REQUIRED = 'not_required',
}

// Continue with remaining types...

export * from './compliance-forensic.types';