/**
 * PARLANT Phase 1 Compliance Reporting Service
 *
 * Multi-regulatory compliance reporting system for GDPR, SOX, HIPAA, PCI-DSS
 * and other regulatory frameworks with automated report generation, evidence
 * collection, and regulatory submission capabilities.
 *
 * Features:
 * - GDPR compliance reporting and DPIA automation
 * - SOX financial controls and audit trails
 * - HIPAA privacy and security compliance
 * - PCI-DSS payment security compliance
 * - Automated evidence collection and packaging
 * - Regulatory submission workflows
 * - Compliance dashboard and analytics
 * - Real-time compliance monitoring
 *
 * @fileoverview Multi-regulatory compliance reporting service
 * @version 1.0.0
 * @author Claude Code - Audit Trail System Agent
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuditEvent,
  AuditEventId,
  ComplianceAuditId,
  AuditEventSeverity,
  ComplianceMetadata,
} from '../types/audit-core.types';
import {
  ComplianceFramework,
  ComplianceStatus,
  ComplianceCheck,
  ComplianceViolation,
  DataCategory,
  SensitiveDataType,
  RetentionRequirement,
  PrivacyRequirement,
  BreachNotificationRequirement,
} from '../types/compliance-forensic.types';
import { createHash, randomBytes } from 'crypto';
import { performance } from 'perf_hooks';

// ===========================
// COMPLIANCE REPORTING INTERFACES
// ===========================

/**
 * Compliance report package
 */
export interface ComplianceReportPackage {
  /** Report identifier */
  reportId: ComplianceAuditId;

  /** Report framework */
  framework: ComplianceFramework;

  /** Report period */
  reportPeriod: ReportPeriod;

  /** Report metadata */
  reportMetadata: ComplianceReportMetadata;

  /** Executive summary */
  executiveSummary: ExecutiveSummary;

  /** Compliance assessment */
  complianceAssessment: ComplianceAssessment;

  /** Risk assessment */
  riskAssessment: ComplianceRiskAssessment;

  /** Evidence package */
  evidencePackage: ComplianceEvidencePackage;

  /** Recommendations */
  recommendations: ComplianceRecommendation[];

  /** Action plan */
  actionPlan: ComplianceActionPlan;

  /** Appendices */
  appendices: ReportAppendix[];

  /** Report signature */
  reportSignature: ReportSignature;

  /** Certification */
  certification: ComplianceCertification;
}

/**
 * Report period
 */
export interface ReportPeriod {
  /** Start date */
  startDate: Date;

  /** End date */
  endDate: Date;

  /** Period type */
  periodType: ReportPeriodType;

  /** Reporting frequency */
  reportingFrequency: ReportingFrequency;

  /** Previous report reference */
  previousReportReference?: string;
}

/**
 * Report period types
 */
export enum ReportPeriodType {
  ANNUAL = 'annual',
  QUARTERLY = 'quarterly',
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
  AD_HOC = 'ad_hoc',
  INCIDENT_DRIVEN = 'incident_driven',
  AUDIT_DRIVEN = 'audit_driven',
}

/**
 * Reporting frequencies
 */
export enum ReportingFrequency {
  REAL_TIME = 'real_time',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUALLY = 'semi_annually',
  ANNUALLY = 'annually',
  AS_NEEDED = 'as_needed',
}

/**
 * Compliance report metadata
 */
export interface ComplianceReportMetadata {
  /** Report creation timestamp */
  creationTimestamp: Date;

  /** Report version */
  version: string;

  /** Report author */
  author: ReportAuthor;

  /** Report reviewers */
  reviewers: ReportReviewer[];

  /** Report approvers */
  approvers: ReportApprover[];

  /** Report classification */
  classification: ReportClassification;

  /** Distribution list */
  distributionList: DistributionEntry[];

  /** Report scope */
  scope: ReportScope;

  /** Report methodology */
  methodology: ReportMethodology;

  /** Quality assurance */
  qualityAssurance: QualityAssuranceInfo;
}

/**
 * Report author
 */
export interface ReportAuthor {
  /** Author identifier */
  authorId: string;

  /** Author name */
  name: string;

  /** Author title */
  title: string;

  /** Author organization */
  organization: string;

  /** Author credentials */
  credentials: string[];

  /** Contact information */
  contactInfo: AuthorContactInfo;

  /** Digital signature */
  digitalSignature: string;
}

/**
 * Author contact information
 */
export interface AuthorContactInfo {
  /** Email address */
  email: string;

  /** Phone number */
  phone: string;

  /** Office location */
  officeLocation: string;

  /** Professional certifications */
  certifications: ProfessionalCertification[];
}

/**
 * Professional certification
 */
export interface ProfessionalCertification {
  /** Certification name */
  name: string;

  /** Certifying body */
  certifyingBody: string;

  /** Certification number */
  certificationNumber: string;

  /** Issue date */
  issueDate: Date;

  /** Expiry date */
  expiryDate: Date;

  /** Verification URL */
  verificationUrl?: string;
}

/**
 * Report reviewer
 */
export interface ReportReviewer {
  /** Reviewer identifier */
  reviewerId: string;

  /** Reviewer name */
  name: string;

  /** Reviewer role */
  role: ReviewerRole;

  /** Review completion date */
  reviewCompletionDate: Date;

  /** Review comments */
  comments: ReviewComment[];

  /** Approval status */
  approvalStatus: ReviewApprovalStatus;

  /** Digital signature */
  digitalSignature: string;
}

/**
 * Reviewer roles
 */
export enum ReviewerRole {
  TECHNICAL_REVIEWER = 'technical_reviewer',
  LEGAL_REVIEWER = 'legal_reviewer',
  COMPLIANCE_OFFICER = 'compliance_officer',
  SECURITY_OFFICER = 'security_officer',
  PRIVACY_OFFICER = 'privacy_officer',
  SUBJECT_MATTER_EXPERT = 'subject_matter_expert',
  EXTERNAL_AUDITOR = 'external_auditor',
}

/**
 * Review comment
 */
export interface ReviewComment {
  /** Comment identifier */
  commentId: string;

  /** Section reference */
  sectionReference: string;

  /** Comment type */
  commentType: ReviewCommentType;

  /** Comment severity */
  severity: CommentSeverity;

  /** Comment text */
  commentText: string;

  /** Suggested resolution */
  suggestedResolution?: string;

  /** Resolution status */
  resolutionStatus: ResolutionStatus;

  /** Author response */
  authorResponse?: string;
}

/**
 * Review comment types
 */
export enum ReviewCommentType {
  CLARIFICATION_REQUEST = 'clarification_request',
  FACTUAL_CORRECTION = 'factual_correction',
  METHODOLOGY_CONCERN = 'methodology_concern',
  COMPLIANCE_CONCERN = 'compliance_concern',
  RECOMMENDATION = 'recommendation',
  APPROVAL_CONDITION = 'approval_condition',
  EDITORIAL_SUGGESTION = 'editorial_suggestion',
}

/**
 * Comment severity levels
 */
export enum CommentSeverity {
  INFORMATIONAL = 'informational',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  BLOCKING = 'blocking',
}

/**
 * Resolution status
 */
export enum ResolutionStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  DEFERRED = 'deferred',
}

/**
 * Review approval status
 */
export enum ReviewApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  APPROVED_WITH_CONDITIONS = 'approved_with_conditions',
  REJECTED = 'rejected',
  REQUIRES_REVISION = 'requires_revision',
}

/**
 * Report approver
 */
export interface ReportApprover {
  /** Approver identifier */
  approverId: string;

  /** Approver name */
  name: string;

  /** Approver title */
  title: string;

  /** Approval authority */
  approvalAuthority: ApprovalAuthority;

  /** Approval date */
  approvalDate: Date;

  /** Approval conditions */
  approvalConditions: string[];

  /** Digital signature */
  digitalSignature: string;

  /** Seal of approval */
  sealOfApproval: SealOfApproval;
}

/**
 * Approval authority
 */
export interface ApprovalAuthority {
  /** Authority level */
  authorityLevel: AuthorityLevel;

  /** Scope of authority */
  scopeOfAuthority: string[];

  /** Delegation authority */
  delegationAuthority: boolean;

  /** Authority limitations */
  limitations: string[];

  /** Authority verification */
  verification: AuthorityVerification;
}

/**
 * Authority levels
 */
export enum AuthorityLevel {
  OPERATIONAL = 'operational',
  MANAGEMENT = 'management',
  EXECUTIVE = 'executive',
  BOARD_LEVEL = 'board_level',
  REGULATORY = 'regulatory',
  EXTERNAL_AUDITOR = 'external_auditor',
}

/**
 * Authority verification
 */
export interface AuthorityVerification {
  /** Verification method */
  verificationMethod: VerificationMethod;

  /** Verification reference */
  verificationReference: string;

  /** Verification date */
  verificationDate: Date;

  /** Verifying authority */
  verifyingAuthority: string;
}

/**
 * Verification methods
 */
export enum VerificationMethod {
  ORGANIZATIONAL_CHART = 'organizational_chart',
  BOARD_RESOLUTION = 'board_resolution',
  REGULATORY_APPOINTMENT = 'regulatory_appointment',
  PROFESSIONAL_LICENSE = 'professional_license',
  DELEGATION_DOCUMENT = 'delegation_document',
}

/**
 * Seal of approval
 */
export interface SealOfApproval {
  /** Seal type */
  sealType: SealType;

  /** Seal identifier */
  sealId: string;

  /** Seal image hash */
  sealImageHash: string;

  /** Seal validation code */
  validationCode: string;

  /** Seal expiry */
  sealExpiry?: Date;
}

/**
 * Seal types
 */
export enum SealType {
  DIGITAL_SEAL = 'digital_seal',
  ELECTRONIC_SIGNATURE = 'electronic_signature',
  NOTARIZED_SEAL = 'notarized_seal',
  CORPORATE_SEAL = 'corporate_seal',
  REGULATORY_SEAL = 'regulatory_seal',
}

/**
 * Report classification
 */
export interface ReportClassification {
  /** Classification level */
  classificationLevel: ClassificationLevel;

  /** Access restrictions */
  accessRestrictions: AccessRestriction[];

  /** Distribution restrictions */
  distributionRestrictions: DistributionRestriction[];

  /** Retention classification */
  retentionClassification: RetentionClassification;

  /** Declassification schedule */
  declassificationSchedule?: DeclassificationSchedule;
}

/**
 * Classification levels
 */
export enum ClassificationLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
  SECRET = 'secret',
  TOP_SECRET = 'top_secret',
}

/**
 * Access restriction
 */
export interface AccessRestriction {
  /** Restriction type */
  restrictionType: AccessRestrictionType;

  /** Authorized entities */
  authorizedEntities: string[];

  /** Access conditions */
  accessConditions: string[];

  /** Access approval required */
  approvalRequired: boolean;

  /** Access monitoring */
  monitoringRequired: boolean;
}

/**
 * Access restriction types
 */
export enum AccessRestrictionType {
  ROLE_BASED = 'role_based',
  CLEARANCE_BASED = 'clearance_based',
  NEED_TO_KNOW = 'need_to_know',
  TIME_LIMITED = 'time_limited',
  LOCATION_LIMITED = 'location_limited',
  PURPOSE_LIMITED = 'purpose_limited',
}

/**
 * Distribution restriction
 */
export interface DistributionRestriction {
  /** Restriction scope */
  restrictionScope: DistributionScope;

  /** Allowed recipients */
  allowedRecipients: RecipientCategory[];

  /** Distribution method */
  distributionMethod: DistributionMethod[];

  /** Copy control */
  copyControl: CopyControl;

  /** Forwarding restrictions */
  forwardingRestrictions: ForwardingRestriction[];
}

/**
 * Distribution scopes
 */
export enum DistributionScope {
  INTERNAL_ONLY = 'internal_only',
  AUTHORIZED_PARTNERS = 'authorized_partners',
  REGULATORY_BODIES = 'regulatory_bodies',
  PUBLIC_DISCLOSURE = 'public_disclosure',
  COURT_ORDERED = 'court_ordered',
  LAW_ENFORCEMENT = 'law_enforcement',
}

/**
 * Recipient categories
 */
export enum RecipientCategory {
  EXECUTIVES = 'executives',
  COMPLIANCE_TEAM = 'compliance_team',
  AUDIT_COMMITTEE = 'audit_committee',
  BOARD_OF_DIRECTORS = 'board_of_directors',
  EXTERNAL_AUDITORS = 'external_auditors',
  REGULATORY_AUTHORITIES = 'regulatory_authorities',
  LAW_ENFORCEMENT = 'law_enforcement',
  LEGAL_COUNSEL = 'legal_counsel',
}

/**
 * Distribution methods
 */
export enum DistributionMethod {
  SECURE_EMAIL = 'secure_email',
  ENCRYPTED_FILE_TRANSFER = 'encrypted_file_transfer',
  SECURE_PORTAL = 'secure_portal',
  PHYSICAL_DELIVERY = 'physical_delivery',
  REGISTERED_MAIL = 'registered_mail',
  COURIER_SERVICE = 'courier_service',
  IN_PERSON_HANDOFF = 'in_person_handoff',
}

/**
 * Copy control
 */
export interface CopyControl {
  /** Copy control enabled */
  enabled: boolean;

  /** Maximum copies allowed */
  maxCopies: number;

  /** Copy numbering required */
  copyNumberingRequired: boolean;

  /** Copy tracking required */
  trackingRequired: boolean;

  /** Copy destruction requirements */
  destructionRequirements: CopyDestructionRequirement[];
}

/**
 * Copy destruction requirement
 */
export interface CopyDestructionRequirement {
  /** Trigger condition */
  triggerCondition: DestructionTrigger;

  /** Destruction method */
  destructionMethod: DestructionMethod;

  /** Verification required */
  verificationRequired: boolean;

  /** Documentation required */
  documentationRequired: boolean;
}

/**
 * Destruction triggers
 */
export enum DestructionTrigger {
  TIME_BASED = 'time_based',
  EVENT_BASED = 'event_based',
  PURPOSE_COMPLETION = 'purpose_completion',
  SUPERSEDED = 'superseded',
  CLASSIFICATION_CHANGE = 'classification_change',
  REQUEST_BASED = 'request_based',
}

/**
 * Destruction methods
 */
export enum DestructionMethod {
  SECURE_DELETION = 'secure_deletion',
  PHYSICAL_SHREDDING = 'physical_shredding',
  INCINERATION = 'incineration',
  PULPING = 'pulping',
  DEGAUSSING = 'degaussing',
  CRYPTOGRAPHIC_ERASURE = 'cryptographic_erasure',
}

/**
 * Forwarding restriction
 */
export interface ForwardingRestriction {
  /** Forwarding allowed */
  forwardingAllowed: boolean;

  /** Authorization required */
  authorizationRequired: boolean;

  /** Authorized forwarders */
  authorizedForwarders: string[];

  /** Forwarding conditions */
  conditions: string[];

  /** Chain of custody required */
  chainOfCustodyRequired: boolean;
}

/**
 * Retention classification
 */
export interface RetentionClassification {
  /** Retention period */
  retentionPeriod: RetentionPeriod;

  /** Legal hold considerations */
  legalHoldConsiderations: LegalHoldConsideration[];

  /** Disposal authorization */
  disposalAuthorization: DisposalAuthorization;

  /** Archive requirements */
  archiveRequirements: ArchiveRequirement[];
}

/**
 * Retention period
 */
export interface RetentionPeriod {
  /** Duration */
  duration: number;

  /** Time unit */
  timeUnit: RetentionTimeUnit;

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
  MONTHS = 'months',
  YEARS = 'years',
  INDEFINITE = 'indefinite',
}

/**
 * Retention start triggers
 */
export enum RetentionStartTrigger {
  CREATION_DATE = 'creation_date',
  APPROVAL_DATE = 'approval_date',
  DISTRIBUTION_DATE = 'distribution_date',
  SUPERSEDED_DATE = 'superseded_date',
  PROJECT_COMPLETION = 'project_completion',
}

/**
 * Retention extension condition
 */
export interface RetentionExtensionCondition {
  /** Condition type */
  conditionType: ExtensionConditionType;

  /** Extension period */
  extensionPeriod: RetentionPeriod;

  /** Authorization requirements */
  authorizationRequirements: string[];

  /** Documentation requirements */
  documentationRequirements: string[];
}

/**
 * Extension condition types
 */
export enum ExtensionConditionType {
  LEGAL_HOLD = 'legal_hold',
  ONGOING_INVESTIGATION = 'ongoing_investigation',
  REGULATORY_REQUEST = 'regulatory_request',
  LITIGATION = 'litigation',
  BUSINESS_CONTINUITY = 'business_continuity',
}

/**
 * Legal hold consideration
 */
export interface LegalHoldConsideration {
  /** Hold type */
  holdType: LegalHoldType;

  /** Hold scope */
  holdScope: string[];

  /** Hold duration */
  holdDuration: RetentionPeriod;

  /** Release conditions */
  releaseConditions: HoldReleaseCondition[];

  /** Monitoring requirements */
  monitoringRequirements: string[];
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
  COMPLIANCE_HOLD = 'compliance_hold',
}

/**
 * Hold release condition
 */
export interface HoldReleaseCondition {
  /** Condition type */
  conditionType: ReleaseConditionType;

  /** Condition description */
  description: string;

  /** Authorization requirements */
  authorizationRequirements: string[];

  /** Verification requirements */
  verificationRequirements: string[];
}

/**
 * Release condition types
 */
export enum ReleaseConditionType {
  CASE_CLOSURE = 'case_closure',
  SETTLEMENT = 'settlement',
  COURT_ORDER = 'court_order',
  REGULATORY_CLEARANCE = 'regulatory_clearance',
  INVESTIGATION_COMPLETION = 'investigation_completion',
  TIME_EXPIRATION = 'time_expiration',
}

/**
 * Disposal authorization
 */
export interface DisposalAuthorization {
  /** Authorization required */
  authorizationRequired: boolean;

  /** Authorized disposers */
  authorizedDisposers: string[];

  /** Disposal methods */
  approvedDisposalMethods: DestructionMethod[];

  /** Verification requirements */
  verificationRequirements: DisposalVerificationRequirement[];

  /** Documentation requirements */
  documentationRequirements: string[];
}

/**
 * Disposal verification requirement
 */
export interface DisposalVerificationRequirement {
  /** Verification type */
  verificationType: DisposalVerificationType;

  /** Verification timeline */
  verificationTimeline: number;

  /** Third-party verification */
  thirdPartyVerification: boolean;

  /** Certificate required */
  certificateRequired: boolean;
}

/**
 * Disposal verification types
 */
export enum DisposalVerificationType {
  WITNESS_VERIFICATION = 'witness_verification',
  PHOTOGRAPHIC_EVIDENCE = 'photographic_evidence',
  VIDEO_DOCUMENTATION = 'video_documentation',
  CERTIFICATE_OF_DESTRUCTION = 'certificate_of_destruction',
  CHAIN_OF_CUSTODY = 'chain_of_custody',
  FORENSIC_VERIFICATION = 'forensic_verification',
}

/**
 * Archive requirement
 */
export interface ArchiveRequirement {
  /** Archive location */
  archiveLocation: ArchiveLocation;

  /** Archive format */
  archiveFormat: ArchiveFormat;

  /** Access restrictions */
  accessRestrictions: ArchiveAccessRestriction[];

  /** Preservation standards */
  preservationStandards: PreservationStandard[];

  /** Migration requirements */
  migrationRequirements: MigrationRequirement[];
}

/**
 * Archive locations
 */
export enum ArchiveLocation {
  ON_SITE_ARCHIVE = 'on_site_archive',
  OFF_SITE_ARCHIVE = 'off_site_archive',
  CLOUD_ARCHIVE = 'cloud_archive',
  HYBRID_ARCHIVE = 'hybrid_archive',
  THIRD_PARTY_ARCHIVE = 'third_party_archive',
  REGULATORY_ARCHIVE = 'regulatory_archive',
}

/**
 * Archive formats
 */
export enum ArchiveFormat {
  DIGITAL_ORIGINAL = 'digital_original',
  PDF_A = 'pdf_a',
  MICROFILM = 'microfilm',
  MICROFICHE = 'microfiche',
  OPTICAL_DISC = 'optical_disc',
  MAGNETIC_TAPE = 'magnetic_tape',
  PAPER_COPY = 'paper_copy',
}

/**
 * Archive access restriction
 */
export interface ArchiveAccessRestriction {
  /** Restriction type */
  restrictionType: ArchiveRestrictionType;

  /** Authorized personnel */
  authorizedPersonnel: string[];

  /** Access procedures */
  accessProcedures: string[];

  /** Monitoring requirements */
  monitoringRequirements: string[];
}

/**
 * Archive restriction types
 */
export enum ArchiveRestrictionType {
  ROLE_BASED_ACCESS = 'role_based_access',
  TIME_RESTRICTED_ACCESS = 'time_restricted_access',
  PURPOSE_LIMITED_ACCESS = 'purpose_limited_access',
  SUPERVISED_ACCESS_ONLY = 'supervised_access_only',
  READ_ONLY_ACCESS = 'read_only_access',
  NO_REPRODUCTION = 'no_reproduction',
}

/**
 * Preservation standard
 */
export interface PreservationStandard {
  /** Standard name */
  standardName: string;

  /** Standard version */
  version: string;

  /** Compliance requirements */
  complianceRequirements: string[];

  /** Validation procedures */
  validationProcedures: string[];

  /** Certification requirements */
  certificationRequirements: string[];
}

/**
 * Migration requirement
 */
export interface MigrationRequirement {
  /** Migration trigger */
  migrationTrigger: MigrationTrigger;

  /** Target format */
  targetFormat: ArchiveFormat;

  /** Migration timeline */
  migrationTimeline: number;

  /** Quality assurance */
  qualityAssurance: MigrationQualityAssurance;

  /** Validation requirements */
  validationRequirements: string[];
}

/**
 * Migration triggers
 */
export enum MigrationTrigger {
  FORMAT_OBSOLESCENCE = 'format_obsolescence',
  TECHNOLOGY_REFRESH = 'technology_refresh',
  STANDARD_UPDATE = 'standard_update',
  STORAGE_MIGRATION = 'storage_migration',
  COMPLIANCE_REQUIREMENT = 'compliance_requirement',
  ACCESSIBILITY_IMPROVEMENT = 'accessibility_improvement',
}

/**
 * Migration quality assurance
 */
export interface MigrationQualityAssurance {
  /** Pre-migration validation */
  preMigrationValidation: boolean;

  /** Post-migration validation */
  postMigrationValidation: boolean;

  /** Integrity verification */
  integrityVerification: boolean;

  /** Completeness verification */
  completenessVerification: boolean;

  /** Quality metrics */
  qualityMetrics: MigrationQualityMetric[];
}

/**
 * Migration quality metric
 */
export interface MigrationQualityMetric {
  /** Metric name */
  metricName: string;

  /** Target value */
  targetValue: number;

  /** Measurement method */
  measurementMethod: string;

  /** Acceptance criteria */
  acceptanceCriteria: string;
}

/**
 * Declassification schedule
 */
export interface DeclassificationSchedule {
  /** Declassification date */
  declassificationDate: Date;

  /** Declassification authority */
  declassificationAuthority: string;

  /** Review triggers */
  reviewTriggers: DeclassificationTrigger[];

  /** Declassification procedures */
  procedures: string[];

  /** Public release procedures */
  publicReleaseProcedures: string[];
}

/**
 * Declassification triggers
 */
export enum DeclassificationTrigger {
  TIME_BASED = 'time_based',
  EVENT_BASED = 'event_based',
  REQUEST_BASED = 'request_based',
  AUTOMATIC = 'automatic',
  MANUAL_REVIEW = 'manual_review',
  REGULATORY_CHANGE = 'regulatory_change',
}

/**
 * Distribution entry
 */
export interface DistributionEntry {
  /** Recipient identifier */
  recipientId: string;

  /** Recipient name */
  recipientName: string;

  /** Recipient category */
  recipientCategory: RecipientCategory;

  /** Distribution method */
  distributionMethod: DistributionMethod;

  /** Distribution date */
  distributionDate: Date;

  /** Receipt confirmation */
  receiptConfirmation: ReceiptConfirmation;

  /** Access restrictions */
  accessRestrictions: string[];
}

/**
 * Receipt confirmation
 */
export interface ReceiptConfirmation {
  /** Confirmation required */
  confirmationRequired: boolean;

  /** Confirmation received */
  confirmationReceived: boolean;

  /** Confirmation date */
  confirmationDate?: Date;

  /** Confirmation method */
  confirmationMethod?: ConfirmationMethod;

  /** Confirmation reference */
  confirmationReference?: string;
}

/**
 * Confirmation methods
 */
export enum ConfirmationMethod {
  EMAIL_CONFIRMATION = 'email_confirmation',
  DIGITAL_SIGNATURE = 'digital_signature',
  DELIVERY_RECEIPT = 'delivery_receipt',
  READ_RECEIPT = 'read_receipt',
  PORTAL_ACCESS_LOG = 'portal_access_log',
  PHYSICAL_SIGNATURE = 'physical_signature',
}

/**
 * Report scope
 */
export interface ReportScope {
  /** Organizational scope */
  organizationalScope: OrganizationalScope;

  /** Geographical scope */
  geographicalScope: GeographicalScope;

  /** Functional scope */
  functionalScope: FunctionalScope;

  /** Data scope */
  dataScope: DataScope;

  /** System scope */
  systemScope: SystemScope;

  /** Exclusions */
  exclusions: ScopeExclusion[];
}

/**
 * Organizational scope
 */
export interface OrganizationalScope {
  /** Business units included */
  businessUnitsIncluded: string[];

  /** Subsidiaries included */
  subsidiariesIncluded: string[];

  /** Joint ventures included */
  jointVenturesIncluded: string[];

  /** Third-party services included */
  thirdPartyServicesIncluded: string[];

  /** Organizational hierarchy level */
  hierarchyLevel: OrganizationalLevel;
}

/**
 * Organizational levels
 */
export enum OrganizationalLevel {
  CORPORATE = 'corporate',
  DIVISION = 'division',
  BUSINESS_UNIT = 'business_unit',
  DEPARTMENT = 'department',
  TEAM = 'team',
  INDIVIDUAL = 'individual',
}

/**
 * Geographical scope
 */
export interface GeographicalScope {
  /** Countries included */
  countriesIncluded: string[];

  /** Regions included */
  regionsIncluded: string[];

  /** Jurisdictions included */
  jurisdictionsIncluded: string[];

  /** Data centers included */
  dataCentersIncluded: string[];

  /** Cross-border activities */
  crossBorderActivities: CrossBorderActivity[];
}

/**
 * Cross-border activity
 */
export interface CrossBorderActivity {
  /** Activity type */
  activityType: CrossBorderActivityType;

  /** Source jurisdiction */
  sourceJurisdiction: string;

  /** Destination jurisdiction */
  destinationJurisdiction: string;

  /** Legal basis */
  legalBasis: string;

  /** Compliance requirements */
  complianceRequirements: string[];
}

/**
 * Cross-border activity types
 */
export enum CrossBorderActivityType {
  DATA_TRANSFER = 'data_transfer',
  SERVICE_DELIVERY = 'service_delivery',
  STAFF_ASSIGNMENT = 'staff_assignment',
  VENDOR_SERVICES = 'vendor_services',
  CLOUD_SERVICES = 'cloud_services',
  BACKUP_REPLICATION = 'backup_replication',
}

/**
 * Functional scope
 */
export interface FunctionalScope {
  /** Business processes included */
  businessProcessesIncluded: string[];

  /** IT systems included */
  itSystemsIncluded: string[];

  /** Applications included */
  applicationsIncluded: string[];

  /** Databases included */
  databasesIncluded: string[];

  /** Network components included */
  networkComponentsIncluded: string[];
}

/**
 * Data scope
 */
export interface DataScope {
  /** Data categories included */
  dataCategoriesIncluded: DataCategory[];

  /** Sensitive data types included */
  sensitiveDataTypesIncluded: SensitiveDataType[];

  /** Data classification levels */
  dataClassificationLevels: ClassificationLevel[];

  /** Data volume estimates */
  dataVolumeEstimates: DataVolumeEstimate[];

  /** Data retention periods */
  dataRetentionPeriods: RetentionPeriod[];
}

/**
 * Data volume estimate
 */
export interface DataVolumeEstimate {
  /** Data category */
  dataCategory: DataCategory;

  /** Volume estimate */
  volumeEstimate: number;

  /** Volume unit */
  volumeUnit: VolumeUnit;

  /** Estimation method */
  estimationMethod: EstimationMethod;

  /** Confidence level */
  confidenceLevel: number;
}

/**
 * Volume units
 */
export enum VolumeUnit {
  RECORDS = 'records',
  BYTES = 'bytes',
  KILOBYTES = 'kilobytes',
  MEGABYTES = 'megabytes',
  GIGABYTES = 'gigabytes',
  TERABYTES = 'terabytes',
  PETABYTES = 'petabytes',
}

/**
 * Estimation methods
 */
export enum EstimationMethod {
  ACTUAL_COUNT = 'actual_count',
  STATISTICAL_SAMPLING = 'statistical_sampling',
  EXPERT_ESTIMATION = 'expert_estimation',
  SYSTEM_METRICS = 'system_metrics',
  HISTORICAL_ANALYSIS = 'historical_analysis',
  VENDOR_ESTIMATES = 'vendor_estimates',
}

/**
 * System scope
 */
export interface SystemScope {
  /** Production systems */
  productionSystems: string[];

  /** Development systems */
  developmentSystems: string[];

  /** Testing systems */
  testingSystems: string[];

  /** Disaster recovery systems */
  disasterRecoverySystems: string[];

  /** Cloud platforms */
  cloudPlatforms: CloudPlatform[];

  /** Third-party systems */
  thirdPartySystems: ThirdPartySystem[];
}

/**
 * Cloud platform
 */
export interface CloudPlatform {
  /** Platform name */
  platformName: string;

  /** Service type */
  serviceType: CloudServiceType;

  /** Provider */
  provider: string;

  /** Deployment model */
  deploymentModel: CloudDeploymentModel;

  /** Data residency */
  dataResidency: string[];

  /** Compliance certifications */
  complianceCertifications: string[];
}

/**
 * Cloud service types
 */
export enum CloudServiceType {
  IAAS = 'iaas',
  PAAS = 'paas',
  SAAS = 'saas',
  FAAS = 'faas',
  CAAS = 'caas',
  DBAAS = 'dbaas',
}

/**
 * Cloud deployment models
 */
export enum CloudDeploymentModel {
  PUBLIC = 'public',
  PRIVATE = 'private',
  HYBRID = 'hybrid',
  MULTI_CLOUD = 'multi_cloud',
  COMMUNITY = 'community',
}

/**
 * Third-party system
 */
export interface ThirdPartySystem {
  /** System name */
  systemName: string;

  /** Vendor */
  vendor: string;

  /** Service category */
  serviceCategory: ThirdPartyServiceCategory;

  /** Data access level */
  dataAccessLevel: DataAccessLevel;

  /** Contract reference */
  contractReference: string;

  /** Compliance status */
  complianceStatus: ThirdPartyComplianceStatus;
}

/**
 * Third-party service categories
 */
export enum ThirdPartyServiceCategory {
  PAYMENT_PROCESSING = 'payment_processing',
  CUSTOMER_SUPPORT = 'customer_support',
  MARKETING_AUTOMATION = 'marketing_automation',
  ANALYTICS = 'analytics',
  BACKUP_SERVICES = 'backup_services',
  SECURITY_SERVICES = 'security_services',
  COMMUNICATION_SERVICES = 'communication_services',
}

/**
 * Data access levels
 */
export enum DataAccessLevel {
  NO_ACCESS = 'no_access',
  METADATA_ONLY = 'metadata_only',
  LIMITED_ACCESS = 'limited_access',
  FULL_ACCESS = 'full_access',
  ADMINISTRATIVE_ACCESS = 'administrative_access',
}

/**
 * Third-party compliance status
 */
export enum ThirdPartyComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  UNDER_REVIEW = 'under_review',
  NOT_ASSESSED = 'not_assessed',
  EXEMPTED = 'exempted',
}

/**
 * Scope exclusion
 */
export interface ScopeExclusion {
  /** Exclusion type */
  exclusionType: ExclusionType;

  /** Excluded items */
  excludedItems: string[];

  /** Exclusion reason */
  exclusionReason: string;

  /** Legal basis for exclusion */
  legalBasis?: string;

  /** Alternative coverage */
  alternativeCoverage?: string;
}

/**
 * Exclusion types
 */
export enum ExclusionType {
  ORGANIZATIONAL_EXCLUSION = 'organizational_exclusion',
  GEOGRAPHICAL_EXCLUSION = 'geographical_exclusion',
  FUNCTIONAL_EXCLUSION = 'functional_exclusion',
  DATA_EXCLUSION = 'data_exclusion',
  SYSTEM_EXCLUSION = 'system_exclusion',
  TEMPORAL_EXCLUSION = 'temporal_exclusion',
}

/**
 * Report methodology
 */
export interface ReportMethodology {
  /** Assessment approach */
  assessmentApproach: AssessmentApproach;

  /** Evidence collection methods */
  evidenceCollectionMethods: EvidenceCollectionMethod[];

  /** Analytical techniques */
  analyticalTechniques: AnalyticalTechnique[];

  /** Testing procedures */
  testingProcedures: TestingProcedure[];

  /** Validation methods */
  validationMethods: ValidationMethod[];

  /** Limitations */
  limitations: MethodologyLimitation[];
}

/**
 * Assessment approaches
 */
export enum AssessmentApproach {
  RISK_BASED = 'risk_based',
  CONTROLS_BASED = 'controls_based',
  PROCESS_BASED = 'process_based',
  OUTCOME_BASED = 'outcome_based',
  HYBRID = 'hybrid',
  COMPREHENSIVE = 'comprehensive',
}

/**
 * Evidence collection method
 */
export interface EvidenceCollectionMethod {
  /** Method name */
  methodName: string;

  /** Method type */
  methodType: EvidenceMethodType;

  /** Sampling approach */
  samplingApproach: SamplingApproach;

  /** Sample size */
  sampleSize: number;

  /** Confidence level */
  confidenceLevel: number;

  /** Data sources */
  dataSources: DataSource[];
}

/**
 * Evidence method types
 */
export enum EvidenceMethodType {
  DOCUMENTARY_REVIEW = 'documentary_review',
  INTERVIEWS = 'interviews',
  OBSERVATIONS = 'observations',
  TESTING = 'testing',
  ANALYTICAL_PROCEDURES = 'analytical_procedures',
  SYSTEM_INTERROGATION = 'system_interrogation',
}

/**
 * Sampling approaches
 */
export enum SamplingApproach {
  RANDOM_SAMPLING = 'random_sampling',
  SYSTEMATIC_SAMPLING = 'systematic_sampling',
  STRATIFIED_SAMPLING = 'stratified_sampling',
  CLUSTER_SAMPLING = 'cluster_sampling',
  JUDGMENTAL_SAMPLING = 'judgmental_sampling',
  CENSUS = 'census',
}

/**
 * Data source
 */
export interface DataSource {
  /** Source name */
  sourceName: string;

  /** Source type */
  sourceType: DataSourceType;

  /** Reliability rating */
  reliabilityRating: SourceReliabilityRating;

  /** Access method */
  accessMethod: SourceAccessMethod;

  /** Data extraction date */
  extractionDate: Date;

  /** Data validation performed */
  validationPerformed: boolean;
}

/**
 * Data source types
 */
export enum DataSourceType {
  SYSTEM_LOGS = 'system_logs',
  DATABASE_RECORDS = 'database_records',
  CONFIGURATION_FILES = 'configuration_files',
  DOCUMENTATION = 'documentation',
  INTERVIEW_NOTES = 'interview_notes',
  EXTERNAL_REPORTS = 'external_reports',
  THIRD_PARTY_ASSESSMENTS = 'third_party_assessments',
}

/**
 * Source reliability ratings
 */
export enum SourceReliabilityRating {
  HIGHLY_RELIABLE = 'highly_reliable',
  RELIABLE = 'reliable',
  MODERATELY_RELIABLE = 'moderately_reliable',
  QUESTIONABLE = 'questionable',
  UNRELIABLE = 'unreliable',
}

/**
 * Source access methods
 */
export enum SourceAccessMethod {
  DIRECT_ACCESS = 'direct_access',
  SYSTEM_EXPORT = 'system_export',
  API_EXTRACTION = 'api_extraction',
  MANUAL_COLLECTION = 'manual_collection',
  THIRD_PARTY_PROVISION = 'third_party_provision',
  AUTOMATED_COLLECTION = 'automated_collection',
}

/**
 * Analytical technique
 */
export interface AnalyticalTechnique {
  /** Technique name */
  techniqueName: string;

  /** Technique type */
  techniqueType: AnalyticalTechniqueType;

  /** Application purpose */
  applicationPurpose: string;

  /** Statistical methods */
  statisticalMethods: StatisticalMethod[];

  /** Tools used */
  toolsUsed: AnalyticalTool[];

  /** Accuracy measures */
  accuracyMeasures: AccuracyMeasure[];
}

/**
 * Analytical technique types
 */
export enum AnalyticalTechniqueType {
  DESCRIPTIVE_ANALYTICS = 'descriptive_analytics',
  DIAGNOSTIC_ANALYTICS = 'diagnostic_analytics',
  PREDICTIVE_ANALYTICS = 'predictive_analytics',
  PRESCRIPTIVE_ANALYTICS = 'prescriptive_analytics',
  COMPARATIVE_ANALYSIS = 'comparative_analysis',
  TREND_ANALYSIS = 'trend_analysis',
}

/**
 * Statistical method
 */
export interface StatisticalMethod {
  /** Method name */
  methodName: string;

  /** Method category */
  methodCategory: StatisticalMethodCategory;

  /** Assumptions */
  assumptions: string[];

  /** Limitations */
  limitations: string[];

  /** Confidence intervals */
  confidenceIntervals: ConfidenceInterval[];
}

/**
 * Statistical method categories
 */
export enum StatisticalMethodCategory {
  DESCRIPTIVE_STATISTICS = 'descriptive_statistics',
  INFERENTIAL_STATISTICS = 'inferential_statistics',
  REGRESSION_ANALYSIS = 'regression_analysis',
  TIME_SERIES_ANALYSIS = 'time_series_analysis',
  MULTIVARIATE_ANALYSIS = 'multivariate_analysis',
  HYPOTHESIS_TESTING = 'hypothesis_testing',
}

/**
 * Confidence interval
 */
export interface ConfidenceInterval {
  /** Confidence level */
  confidenceLevel: number;

  /** Lower bound */
  lowerBound: number;

  /** Upper bound */
  upperBound: number;

  /** Parameter estimated */
  parameterEstimated: string;
}

/**
 * Analytical tool
 */
export interface AnalyticalTool {
  /** Tool name */
  toolName: string;

  /** Tool version */
  toolVersion: string;

  /** Tool vendor */
  toolVendor: string;

  /** Tool capabilities */
  capabilities: ToolCapability[];

  /** Configuration used */
  configurationUsed: Record<string, unknown>;

  /** Validation performed */
  validationPerformed: boolean;
}

/**
 * Tool capabilities
 */
export enum ToolCapability {
  DATA_EXTRACTION = 'data_extraction',
  DATA_TRANSFORMATION = 'data_transformation',
  STATISTICAL_ANALYSIS = 'statistical_analysis',
  VISUALIZATION = 'visualization',
  REPORTING = 'reporting',
  AUTOMATION = 'automation',
}

/**
 * Accuracy measure
 */
export interface AccuracyMeasure {
  /** Measure name */
  measureName: string;

  /** Measure type */
  measureType: AccuracyMeasureType;

  /** Target accuracy */
  targetAccuracy: number;

  /** Achieved accuracy */
  achievedAccuracy: number;

  /** Measurement method */
  measurementMethod: string;
}

/**
 * Accuracy measure types
 */
export enum AccuracyMeasureType {
  PRECISION = 'precision',
  RECALL = 'recall',
  F1_SCORE = 'f1_score',
  ACCURACY_RATE = 'accuracy_rate',
  ERROR_RATE = 'error_rate',
  CONFIDENCE_INTERVAL = 'confidence_interval',
}

/**
 * Testing procedure
 */
export interface TestingProcedure {
  /** Procedure name */
  procedureName: string;

  /** Procedure type */
  procedureType: TestingProcedureType;

  /** Test objectives */
  testObjectives: string[];

  /** Test scope */
  testScope: TestScope;

  /** Test methods */
  testMethods: TestMethod[];

  /** Expected outcomes */
  expectedOutcomes: string[];

  /** Actual outcomes */
  actualOutcomes: string[];
}

/**
 * Testing procedure types
 */
export enum TestingProcedureType {
  COMPLIANCE_TESTING = 'compliance_testing',
  CONTROLS_TESTING = 'controls_testing',
  SECURITY_TESTING = 'security_testing',
  PERFORMANCE_TESTING = 'performance_testing',
  INTEGRATION_TESTING = 'integration_testing',
  BUSINESS_PROCESS_TESTING = 'business_process_testing',
}

/**
 * Test scope
 */
export interface TestScope {
  /** Systems tested */
  systemsTested: string[];

  /** Controls tested */
  controlsTested: string[];

  /** Processes tested */
  processesTested: string[];

  /** Time period tested */
  timePeriodTested: ReportPeriod;

  /** Sample selection */
  sampleSelection: SampleSelection;
}

/**
 * Sample selection
 */
export interface SampleSelection {
  /** Selection method */
  selectionMethod: SamplingApproach;

  /** Sample size */
  sampleSize: number;

  /** Population size */
  populationSize: number;

  /** Selection criteria */
  selectionCriteria: string[];

  /** Representativeness assessment */
  representativenessAssessment: string;
}

/**
 * Test method
 */
export interface TestMethod {
  /** Method name */
  methodName: string;

  /** Method type */
  methodType: TestMethodType;

  /** Execution approach */
  executionApproach: TestExecutionApproach;

  /** Test tools */
  testTools: string[];

  /** Success criteria */
  successCriteria: string[];
}

/**
 * Test method types
 */
export enum TestMethodType {
  MANUAL_TESTING = 'manual_testing',
  AUTOMATED_TESTING = 'automated_testing',
  WALKTHROUGH = 'walkthrough',
  INSPECTION = 'inspection',
  SIMULATION = 'simulation',
  PENETRATION_TESTING = 'penetration_testing',
}

/**
 * Test execution approaches
 */
export enum TestExecutionApproach {
  BLACK_BOX = 'black_box',
  WHITE_BOX = 'white_box',
  GRAY_BOX = 'gray_box',
  RISK_BASED = 'risk_based',
  SCENARIO_BASED = 'scenario_based',
  EXPLORATORY = 'exploratory',
}

/**
 * Validation method
 */
export interface ValidationMethod {
  /** Method name */
  methodName: string;

  /** Method type */
  methodType: ValidationMethodType;

  /** Validation criteria */
  validationCriteria: string[];

  /** Validation procedures */
  validationProcedures: string[];

  /** Quality checks */
  qualityChecks: QualityCheck[];

  /** Validation results */
  validationResults: ValidationResult[];
}

/**
 * Validation method types
 */
export enum ValidationMethodType {
  DATA_VALIDATION = 'data_validation',
  PROCESS_VALIDATION = 'process_validation',
  SYSTEM_VALIDATION = 'system_validation',
  DOCUMENT_VALIDATION = 'document_validation',
  RESULT_VALIDATION = 'result_validation',
  CROSS_VALIDATION = 'cross_validation',
}

/**
 * Quality check
 */
export interface QualityCheck {
  /** Check name */
  checkName: string;

  /** Check type */
  checkType: QualityCheckType;

  /** Check criteria */
  checkCriteria: string[];

  /** Check result */
  checkResult: QualityCheckResult;

  /** Check details */
  checkDetails: string;
}

/**
 * Quality check types
 */
export enum QualityCheckType {
  COMPLETENESS_CHECK = 'completeness_check',
  ACCURACY_CHECK = 'accuracy_check',
  CONSISTENCY_CHECK = 'consistency_check',
  VALIDITY_CHECK = 'validity_check',
  RELIABILITY_CHECK = 'reliability_check',
  TIMELINESS_CHECK = 'timeliness_check',
}

/**
 * Quality check results
 */
export enum QualityCheckResult {
  PASSED = 'passed',
  FAILED = 'failed',
  WARNING = 'warning',
  NOT_APPLICABLE = 'not_applicable',
  INSUFFICIENT_DATA = 'insufficient_data',
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Validation aspect */
  validationAspect: string;

  /** Result status */
  resultStatus: ValidationResultStatus;

  /** Confidence score */
  confidenceScore: number;

  /** Supporting evidence */
  supportingEvidence: string[];

  /** Limitations noted */
  limitationsNoted: string[];
}

/**
 * Validation result status
 */
export enum ValidationResultStatus {
  VALIDATED = 'validated',
  PARTIALLY_VALIDATED = 'partially_validated',
  NOT_VALIDATED = 'not_validated',
  VALIDATION_FAILED = 'validation_failed',
  INSUFFICIENT_EVIDENCE = 'insufficient_evidence',
}

/**
 * Methodology limitation
 */
export interface MethodologyLimitation {
  /** Limitation type */
  limitationType: LimitationType;

  /** Limitation description */
  limitationDescription: string;

  /** Impact assessment */
  impactAssessment: ImpactAssessment;

  /** Mitigation measures */
  mitigationMeasures: string[];

  /** Residual risk */
  residualRisk: ResidualRiskAssessment;
}

/**
 * Limitation types
 */
export enum LimitationType {
  DATA_LIMITATION = 'data_limitation',
  SCOPE_LIMITATION = 'scope_limitation',
  TIME_LIMITATION = 'time_limitation',
  RESOURCE_LIMITATION = 'resource_limitation',
  ACCESS_LIMITATION = 'access_limitation',
  TECHNICAL_LIMITATION = 'technical_limitation',
}

/**
 * Impact assessment
 */
export interface ImpactAssessment {
  /** Impact level */
  impactLevel: ImpactLevel;

  /** Affected areas */
  affectedAreas: string[];

  /** Confidence impact */
  confidenceImpact: ConfidenceImpactLevel;

  /** Conclusion impact */
  conclusionImpact: ConclusionImpactLevel;
}

/**
 * Impact levels
 */
export enum ImpactLevel {
  NEGLIGIBLE = 'negligible',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  SEVERE = 'severe',
}

/**
 * Confidence impact levels
 */
export enum ConfidenceImpactLevel {
  NO_IMPACT = 'no_impact',
  MINOR_REDUCTION = 'minor_reduction',
  MODERATE_REDUCTION = 'moderate_reduction',
  SIGNIFICANT_REDUCTION = 'significant_reduction',
  MAJOR_REDUCTION = 'major_reduction',
}

/**
 * Conclusion impact levels
 */
export enum ConclusionImpactLevel {
  NO_IMPACT = 'no_impact',
  QUALIFICATION_REQUIRED = 'qualification_required',
  SCOPE_LIMITATION = 'scope_limitation',
  OPINION_MODIFICATION = 'opinion_modification',
  DISCLAIMER_REQUIRED = 'disclaimer_required',
}

/**
 * Residual risk assessment
 */
export interface ResidualRiskAssessment {
  /** Risk level */
  riskLevel: RiskLevel;

  /** Risk description */
  riskDescription: string;

  /** Risk probability */
  riskProbability: RiskProbability;

  /** Risk impact */
  riskImpact: RiskImpact;

  /** Risk mitigation */
  riskMitigation: string[];
}

/**
 * Risk levels
 */
export enum RiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
  CRITICAL = 'critical',
}

/**
 * Risk probability
 */
export enum RiskProbability {
  VERY_UNLIKELY = 'very_unlikely',
  UNLIKELY = 'unlikely',
  POSSIBLE = 'possible',
  LIKELY = 'likely',
  VERY_LIKELY = 'very_likely',
  CERTAIN = 'certain',
}

/**
 * Risk impact
 */
export enum RiskImpact {
  NEGLIGIBLE = 'negligible',
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
  SEVERE = 'severe',
  CATASTROPHIC = 'catastrophic',
}

/**
 * Quality assurance information
 */
export interface QualityAssuranceInfo {
  /** QA procedures applied */
  qaProceduresApplied: QualityAssuranceProcedure[];

  /** Review levels */
  reviewLevels: ReviewLevel[];

  /** Quality metrics */
  qualityMetrics: QualityMetric[];

  /** QA certification */
  qaCertification: QualityAssuranceCertification;
}

/**
 * Quality assurance procedure
 */
export interface QualityAssuranceProcedure {
  /** Procedure name */
  procedureName: string;

  /** Procedure type */
  procedureType: QualityAssuranceProcedureType;

  /** Implementation level */
  implementationLevel: ImplementationLevel;

  /** Procedure standards */
  procedureStandards: string[];

  /** Compliance verification */
  complianceVerification: boolean;
}

/**
 * Quality assurance procedure types
 */
export enum QualityAssuranceProcedureType {
  PEER_REVIEW = 'peer_review',
  INDEPENDENT_REVIEW = 'independent_review',
  TECHNICAL_REVIEW = 'technical_review',
  EDITORIAL_REVIEW = 'editorial_review',
  COMPLIANCE_REVIEW = 'compliance_review',
  QUALITY_CONTROL = 'quality_control',
}

/**
 * Implementation levels
 */
export enum ImplementationLevel {
  BASIC = 'basic',
  STANDARD = 'standard',
  ENHANCED = 'enhanced',
  COMPREHENSIVE = 'comprehensive',
  ENTERPRISE = 'enterprise',
}

/**
 * Review level
 */
export interface ReviewLevel {
  /** Level name */
  levelName: string;

  /** Level sequence */
  levelSequence: number;

  /** Review criteria */
  reviewCriteria: string[];

  /** Required qualifications */
  requiredQualifications: string[];

  /** Review completeness */
  reviewCompleteness: ReviewCompleteness;
}

/**
 * Review completeness
 */
export enum ReviewCompleteness {
  COMPLETE = 'complete',
  SUBSTANTIALLY_COMPLETE = 'substantially_complete',
  PARTIALLY_COMPLETE = 'partially_complete',
  INCOMPLETE = 'incomplete',
  NOT_STARTED = 'not_started',
}

/**
 * Quality metric
 */
export interface QualityMetric {
  /** Metric name */
  metricName: string;

  /** Metric category */
  metricCategory: QualityMetricCategory;

  /** Target value */
  targetValue: number;

  /** Actual value */
  actualValue: number;

  /** Measurement unit */
  measurementUnit: string;

  /** Performance assessment */
  performanceAssessment: PerformanceAssessment;
}

/**
 * Quality metric categories
 */
export enum QualityMetricCategory {
  ACCURACY = 'accuracy',
  COMPLETENESS = 'completeness',
  CONSISTENCY = 'consistency',
  TIMELINESS = 'timeliness',
  RELEVANCE = 'relevance',
  RELIABILITY = 'reliability',
}

/**
 * Performance assessments
 */
export enum PerformanceAssessment {
  EXCEEDS_TARGET = 'exceeds_target',
  MEETS_TARGET = 'meets_target',
  APPROACHES_TARGET = 'approaches_target',
  BELOW_TARGET = 'below_target',
  SIGNIFICANTLY_BELOW_TARGET = 'significantly_below_target',
}

/**
 * Quality assurance certification
 */
export interface QualityAssuranceCertification {
  /** Certification authority */
  certificationAuthority: string;

  /** Certification standard */
  certificationStandard: string;

  /** Certification level */
  certificationLevel: CertificationLevel;

  /** Certification date */
  certificationDate: Date;

  /** Certification validity */
  certificationValidity: CertificationValidity;

  /** Certification evidence */
  certificationEvidence: string[];
}

/**
 * Certification levels
 */
export enum CertificationLevel {
  BASIC = 'basic',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
  MASTER = 'master',
}

/**
 * Certification validity
 */
export interface CertificationValidity {
  /** Valid from */
  validFrom: Date;

  /** Valid until */
  validUntil: Date;

  /** Renewal required */
  renewalRequired: boolean;

  /** Renewal date */
  renewalDate?: Date;

  /** Maintenance requirements */
  maintenanceRequirements: string[];
}

// Continue with remaining interfaces in next part...

export * from './compliance-reporting.service';