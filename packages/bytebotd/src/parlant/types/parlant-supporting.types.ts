/**
 * Parlant Supporting Types
 *
 * Additional type definitions for supporting Parlant integration functionality
 * including detailed metadata, enumerations, and complex nested types.
 *
 * @module ParlantSupportingTypes
 * @version 1.0.0
 * @author Claude Code (Parlant Integration Specialist)
 * @since Parlant TypeScript Supporting Types Implementation
 */

import { EvidenceType } from './parlant.types';

// =============================================================================
// Enumeration Types
// =============================================================================

export enum EntityType {
  PERSON = 'PERSON',
  ORGANIZATION = 'ORGANIZATION',
  LOCATION = 'LOCATION',
  DATE = 'DATE',
  TIME = 'TIME',
  MONETARY = 'MONETARY',
  PERCENTAGE = 'PERCENTAGE',
  TECHNICAL_TERM = 'TECHNICAL_TERM',
  PRODUCT = 'PRODUCT',
  SERVICE = 'SERVICE',
  PROCESS = 'PROCESS',
  DOCUMENT = 'DOCUMENT',
  SYSTEM = 'SYSTEM',
  CREDENTIAL = 'CREDENTIAL',
  IDENTIFIER = 'IDENTIFIER',
}

export enum SensitivityLevel {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  TOP_SECRET = 'TOP_SECRET',
}

export enum FormalityLevel {
  INFORMAL = 'INFORMAL',
  CASUAL = 'CASUAL',
  FORMAL = 'FORMAL',
  PROFESSIONAL = 'PROFESSIONAL',
  LEGAL = 'LEGAL',
  TECHNICAL = 'TECHNICAL',
}

export enum BehaviorType {
  COOPERATION = 'COOPERATION',
  RESISTANCE = 'RESISTANCE',
  CONFUSION = 'CONFUSION',
  EXPERTISE = 'EXPERTISE',
  URGENCY = 'URGENCY',
  EVASION = 'EVASION',
  AGGRESSION = 'AGGRESSION',
  SATISFACTION = 'SATISFACTION',
}

export enum CustodyAction {
  RECEIVED = 'RECEIVED',
  TRANSFERRED = 'TRANSFERRED',
  ACCESSED = 'ACCESSED',
  ANALYZED = 'ANALYZED',
  COPIED = 'COPIED',
  ARCHIVED = 'ARCHIVED',
  DESTROYED = 'DESTROYED',
  RESTORED = 'RESTORED',
}

export enum TrustLevel {
  UNTRUSTED = 'UNTRUSTED',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERIFIED = 'VERIFIED',
  CERTIFIED = 'CERTIFIED',
}

export enum ConfidentialityLevel {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  SECRET = 'SECRET',
  TOP_SECRET = 'TOP_SECRET',
}

// =============================================================================
// Metadata and Context Types
// =============================================================================

export interface EmotionalTone {
  readonly emotion: string;
  readonly intensity: number;
  readonly confidence: number;
  readonly context: string;
  readonly indicators: string[];
}

export interface ContextualFactor {
  readonly factor: string;
  readonly impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  readonly weight: number;
  readonly evidence: string[];
}

export interface ComplexityFactor {
  readonly factor: string;
  readonly category: string;
  readonly contribution: number;
  readonly details: string;
}

export interface EntityRelationship {
  readonly relationshipId: string;
  readonly relatedEntityId: string;
  readonly relationType: string;
  readonly strength: number;
  readonly bidirectional: boolean;
  readonly context: string;
}

export interface EntityClassification {
  readonly classificationId: string;
  readonly primary: string;
  readonly secondary: string[];
  readonly taxonomy: string;
  readonly confidence: number;
  readonly version: string;
}

export interface BehaviorPattern {
  readonly patternId: string;
  readonly name: string;
  readonly frequency: number;
  readonly consistency: number;
  readonly predictability: number;
  readonly variations: string[];
}

export interface BehaviorContext {
  readonly contextId: string;
  readonly environment: string;
  readonly triggers: string[];
  readonly influences: string[];
  readonly constraints: string[];
  readonly enablers: string[];
}

// =============================================================================
// Evidence and Chain of Custody Types
// =============================================================================

export interface CustodianInfo {
  readonly custodianId: string;
  readonly name: string;
  readonly role: string;
  readonly organization: string;
  readonly credentials: CustodianCredentials;
  readonly authorization: AuthorizationLevel;
  readonly contactInfo: ContactInfo;
}

export interface CustodianCredentials {
  readonly credentialId: string;
  readonly type: string;
  readonly issuer: string;
  readonly number: string;
  readonly validFrom: Date;
  readonly validUntil: Date;
  readonly verificationMethod: string;
}

export interface AuthorizationLevel {
  readonly level: string;
  readonly scope: string[];
  readonly restrictions: string[];
  readonly grantedBy: string;
  readonly grantedDate: Date;
  readonly expiryDate: Date;
}

export interface ContactInfo {
  readonly email: string;
  readonly phone: string;
  readonly address: string;
  readonly emergencyContact: string;
  readonly preferredMethod: string;
}

export interface LocationInfo {
  readonly locationId: string;
  readonly facility: string;
  readonly room: string;
  readonly coordinates: GeographicCoordinates;
  readonly accessControls: AccessControl[];
  readonly environmentalConditions: EnvironmentalCondition[];
  readonly securityLevel: string;
}

export interface GeographicCoordinates {
  readonly latitude: number;
  readonly longitude: number;
  readonly altitude?: number;
  readonly accuracy: number;
  readonly source: string;
}

export interface AccessControl {
  readonly controlId: string;
  readonly type: 'PHYSICAL' | 'LOGICAL' | 'ADMINISTRATIVE';
  readonly method: string;
  readonly level: string;
  readonly restrictions: string[];
  readonly authorizedPersons: string[];
  readonly auditLog: AccessLogEntry[];
}

export interface AccessLogEntry {
  readonly entryId: string;
  readonly timestamp: Date;
  readonly accessor: string;
  readonly action: string;
  readonly result: 'GRANTED' | 'DENIED' | 'ERROR';
  readonly details: string;
}

export interface EnvironmentalCondition {
  readonly conditionId: string;
  readonly parameter: string;
  readonly value: number;
  readonly unit: string;
  readonly acceptable: boolean;
  readonly timestamp: Date;
}

export interface IntegrityVerification {
  readonly verificationId: string;
  readonly method: string;
  readonly result: 'PASSED' | 'FAILED' | 'WARNING';
  readonly details: string;
  readonly timestamp: Date;
  readonly verifiedBy: string;
}

// =============================================================================
// Evidence Content and Source Types
// =============================================================================

export interface EvidenceSource {
  readonly sourceId: string;
  readonly type: 'SYSTEM' | 'HUMAN' | 'SENSOR' | 'EXTERNAL';
  readonly name: string;
  readonly version: string;
  readonly reliability: ReliabilityRating;
  readonly credentials: SourceCredentials;
  readonly location: string;
  readonly timestamp: Date;
}

export interface ReliabilityRating {
  readonly rating:
    | 'UNRELIABLE'
    | 'QUESTIONABLE'
    | 'RELIABLE'
    | 'HIGHLY_RELIABLE';
  readonly confidence: number;
  readonly basis: string[];
  readonly history: ReliabilityHistory[];
}

export interface ReliabilityHistory {
  readonly timestamp: Date;
  readonly rating: string;
  readonly reason: string;
  readonly evidence: string[];
}

export interface SourceCredentials {
  readonly credentialType: string;
  readonly identifier: string;
  readonly issuer: string;
  readonly validationMethod: string;
  readonly status: 'VALID' | 'INVALID' | 'EXPIRED' | 'REVOKED';
}

export interface EvidenceContent {
  readonly contentId: string;
  readonly format: ContentFormat;
  readonly size: number;
  readonly encoding: string;
  readonly compression: CompressionInfo;
  readonly encryption: EncryptionInfo;
  readonly preview: ContentPreview;
  readonly structure: ContentStructure;
}

export interface ContentFormat {
  readonly mimeType: string;
  readonly extension: string;
  readonly version: string;
  readonly schema: string;
  readonly standards: string[];
}

export interface CompressionInfo {
  readonly algorithm: string;
  readonly ratio: number;
  readonly originalSize: number;
  readonly compressedSize: number;
  readonly integrity: boolean;
}

export interface EncryptionInfo {
  readonly algorithm: string;
  readonly keyId: string;
  readonly keyLength: number;
  readonly mode: string;
  readonly strength: 'WEAK' | 'MEDIUM' | 'STRONG' | 'UNBREAKABLE';
}

export interface ContentPreview {
  readonly previewType: string;
  readonly summary: string;
  readonly thumbnail?: string;
  readonly keyPoints: string[];
  readonly statistics: ContentStatistics;
}

export interface ContentStatistics {
  readonly lineCount?: number;
  readonly wordCount?: number;
  readonly characterCount?: number;
  readonly pageCount?: number;
  readonly duration?: number;
  readonly fileCount?: number;
}

export interface ContentStructure {
  readonly sections: ContentSection[];
  readonly hierarchy: HierarchyLevel[];
  readonly relationships: ContentRelationship[];
  readonly references: ContentReference[];
}

export interface ContentSection {
  readonly sectionId: string;
  readonly name: string;
  readonly type: string;
  readonly offset: number;
  readonly length: number;
  readonly metadata: Record<string, unknown>;
}

export interface HierarchyLevel {
  readonly level: number;
  readonly name: string;
  readonly children: string[];
  readonly parent?: string;
}

export interface ContentRelationship {
  readonly relationshipId: string;
  readonly type: string;
  readonly source: string;
  readonly target: string;
  readonly strength: number;
}

export interface ContentReference {
  readonly referenceId: string;
  readonly type: string;
  readonly target: string;
  readonly context: string;
  readonly validated: boolean;
}

export interface EvidenceMetadata {
  readonly metadataId: string;
  readonly creation: CreationMetadata;
  readonly collection: CollectionMetadata;
  readonly processing: ProcessingMetadata;
  readonly classification: ClassificationMetadata;
  readonly relationships: RelationshipMetadata;
  readonly quality: QualityMetadata;
}

export interface CreationMetadata {
  readonly createdBy: string;
  readonly creationDate: Date;
  readonly creationMethod: string;
  readonly originalLocation: string;
  readonly purpose: string;
  readonly context: string;
}

export interface CollectionMetadata {
  readonly collectedBy: string;
  readonly collectionDate: Date;
  readonly collectionMethod: string;
  readonly tools: string[];
  readonly procedures: string[];
  readonly authorization: string;
}

export interface ProcessingMetadata {
  readonly processedBy: string;
  readonly processingDate: Date;
  readonly operations: ProcessingOperation[];
  readonly tools: string[];
  readonly validation: ValidationResult[];
}

export interface ProcessingOperation {
  readonly operationId: string;
  readonly type: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  readonly timestamp: Date;
  readonly result: 'SUCCESS' | 'FAILURE' | 'WARNING';
}

export interface ValidationResult {
  readonly validationId: string;
  readonly type: string;
  readonly result: 'PASS' | 'FAIL' | 'WARNING';
  readonly score: number;
  readonly details: string;
  readonly timestamp: Date;
}

export interface ClassificationMetadata {
  readonly classificationId: string;
  readonly scheme: string;
  readonly categories: string[];
  readonly sensitivity: SensitivityLevel;
  readonly confidentiality: ConfidentialityLevel;
  readonly restrictions: string[];
}

export interface RelationshipMetadata {
  readonly relationships: EvidenceRelationship[];
  readonly dependencies: string[];
  readonly references: string[];
  readonly derivations: string[];
}

export interface EvidenceRelationship {
  readonly relationshipId: string;
  readonly type: string;
  readonly relatedEvidenceId: string;
  readonly description: string;
  readonly strength: number;
}

export interface QualityMetadata {
  readonly qualityScore: number;
  readonly completeness: number;
  readonly accuracy: number;
  readonly reliability: number;
  readonly authenticity: number;
  readonly integrity: number;
}

// =============================================================================
// Legal and Compliance Supporting Types
// =============================================================================

export interface LegalHold {
  readonly holdId: string;
  readonly caseNumber: string;
  readonly court: string;
  readonly issuedBy: string;
  readonly issuedDate: Date;
  readonly scope: string[];
  readonly instructions: string[];
  readonly status: 'ACTIVE' | 'RELEASED' | 'MODIFIED' | 'APPEALED';
}

export interface AdmissibilityAssessment {
  readonly assessmentId: string;
  readonly jurisdiction: string;
  readonly rules: ApplicableRule[];
  readonly factors: AdmissibilityFactor[];
  readonly opinion: 'ADMISSIBLE' | 'INADMISSIBLE' | 'CONDITIONAL' | 'UNCERTAIN';
  readonly confidence: number;
  readonly recommendations: string[];
}

export interface ApplicableRule {
  readonly ruleId: string;
  readonly citation: string;
  readonly description: string;
  readonly relevance: number;
  readonly precedents: string[];
}

export interface AdmissibilityFactor {
  readonly factor: string;
  readonly impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  readonly weight: number;
  readonly description: string;
}

export interface PrivilegeAssessment {
  readonly assessmentId: string;
  readonly privilegeTypes: PrivilegeType[];
  readonly waived: boolean;
  readonly waiverConditions: string[];
  readonly protectedElements: string[];
  readonly disclosureRisks: string[];
}

export interface PrivilegeType {
  readonly type: string;
  readonly basis: string;
  readonly scope: string;
  readonly limitations: string[];
  readonly applicable: boolean;
}

export interface DisclosureRestriction {
  readonly restrictionId: string;
  readonly type: string;
  readonly basis: string;
  readonly scope: string[];
  readonly exceptions: string[];
  readonly procedures: string[];
}

export interface LitigationReadiness {
  readonly readinessId: string;
  readonly status: 'READY' | 'NEEDS_PREPARATION' | 'NOT_READY' | 'UNKNOWN';
  readonly completeness: number;
  readonly issues: LitigationIssue[];
  readonly preparations: PreparationTask[];
  readonly timeline: LitigationTimeline;
}

export interface LitigationIssue {
  readonly issueId: string;
  readonly description: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly impact: string;
  readonly resolution: string;
  readonly status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DEFERRED';
}

export interface PreparationTask {
  readonly taskId: string;
  readonly description: string;
  readonly priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly assignee: string;
  readonly dueDate: Date;
  readonly status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
}

export interface LitigationTimeline {
  readonly milestones: Milestone[];
  readonly deadlines: Deadline[];
  readonly phases: LitigationPhase[];
  readonly dependencies: TimelineDependency[];
}

export interface Milestone {
  readonly milestoneId: string;
  readonly name: string;
  readonly description: string;
  readonly date: Date;
  readonly status: 'PENDING' | 'ACHIEVED' | 'MISSED' | 'RESCHEDULED';
}

export interface Deadline {
  readonly deadlineId: string;
  readonly name: string;
  readonly date: Date;
  readonly type: 'FILING' | 'DISCOVERY' | 'HEARING' | 'TRIAL' | 'APPEAL';
  readonly consequences: string[];
}

export interface LitigationPhase {
  readonly phaseId: string;
  readonly name: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly objectives: string[];
  readonly deliverables: string[];
}

export interface TimelineDependency {
  readonly dependencyId: string;
  readonly predecessor: string;
  readonly successor: string;
  readonly type:
    | 'FINISH_TO_START'
    | 'START_TO_START'
    | 'FINISH_TO_FINISH'
    | 'START_TO_FINISH';
  readonly lag: number;
}

// =============================================================================
// Additional Supporting Types
// =============================================================================

export interface BusinessRule {
  readonly ruleId: string;
  readonly name: string;
  readonly description: string;
  readonly condition: string;
  readonly action: string;
  readonly priority: number;
  readonly active: boolean;
  readonly version: string;
}

export interface KPIMetric {
  readonly kpiId: string;
  readonly name: string;
  readonly category: string;
  readonly target: number;
  readonly current: number;
  readonly unit: string;
  readonly trend: 'IMPROVING' | 'DECLINING' | 'STABLE' | 'VOLATILE';
}

export interface QualityRequirement {
  readonly accuracy: number;
  readonly completeness: number;
  readonly consistency: number;
  readonly timeliness: number;
  readonly validity: number;
  readonly uniqueness: number;
}

export interface RetentionRequirement {
  readonly period: number;
  readonly unit: 'DAYS' | 'MONTHS' | 'YEARS';
  readonly triggers: string[];
  readonly exceptions: string[];
  readonly disposal: string;
}

export interface FormatRequirement {
  readonly format: string;
  readonly version: string;
  readonly encoding: string;
  readonly compression: boolean;
  readonly encryption: boolean;
}

export interface MetadataRequirement {
  readonly field: string;
  readonly mandatory: boolean;
  readonly format: string;
  readonly validation: string;
  readonly source: string;
}

export interface IntegrityRequirement {
  readonly checksums: boolean;
  readonly signatures: boolean;
  readonly timestamps: boolean;
  readonly blockchain: boolean;
  readonly verification: string;
}

export interface ChainRequirement {
  readonly documentation: boolean;
  readonly signatures: boolean;
  readonly automation: boolean;
  readonly verification: boolean;
  readonly frequency: string;
}

export interface ReviewSchedule {
  readonly frequency: string;
  readonly nextReview: Date;
  readonly responsible: string[];
  readonly criteria: string[];
  readonly procedures: string[];
}

export interface DurationExtension {
  readonly extensionId: string;
  readonly requestedBy: string;
  readonly approvedBy: string;
  readonly duration: number;
  readonly reason: string;
  readonly conditions: string[];
}

export interface DurationNotification {
  readonly notificationId: string;
  readonly type: 'WARNING' | 'EXPIRY' | 'EXTENSION';
  readonly timing: string;
  readonly recipients: string[];
  readonly message: string;
}

export interface MonitoringMetric {
  readonly metricId: string;
  readonly name: string;
  readonly type: string;
  readonly threshold: number;
  readonly current: number;
  readonly status: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface MonitoringAlert {
  readonly alertId: string;
  readonly condition: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly recipients: string[];
  readonly actions: string[];
}

export interface MonitoringReport {
  readonly reportId: string;
  readonly frequency: string;
  readonly recipients: string[];
  readonly format: string;
  readonly sections: string[];
}

export interface MonitoringEscalation {
  readonly escalationId: string;
  readonly triggers: string[];
  readonly levels: EscalationLevel[];
  readonly notifications: string[];
  readonly actions: string[];
}

export interface EscalationLevel {
  readonly level: number;
  readonly name: string;
  readonly timeout: number;
  readonly recipients: string[];
  readonly actions: string[];
}

export interface MonitoringDashboard {
  readonly dashboardId: string;
  readonly url: string;
  readonly widgets: DashboardWidget[];
  readonly refresh: number;
  readonly access: string[];
}

export interface DashboardWidget {
  readonly widgetId: string;
  readonly type: string;
  readonly position: Position;
  readonly size: Size;
  readonly configuration: Record<string, unknown>;
}

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface MonitoringAutomation {
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

export interface RollbackStep {
  readonly stepId: string;
  readonly name: string;
  readonly action: string;
  readonly parameters: Record<string, unknown>;
  readonly order: number;
  readonly timeout: number;
}

export interface RollbackTrigger {
  readonly triggerId: string;
  readonly condition: string;
  readonly automatic: boolean;
  readonly threshold: number;
  readonly action: string;
}

export interface RollbackAutomation {
  readonly automationId: string;
  readonly enabled: boolean;
  readonly triggers: string[];
  readonly conditions: string[];
  readonly actions: string[];
}

export interface RollbackVerification {
  readonly verificationId: string;
  readonly checks: VerificationCheck[];
  readonly acceptance: AcceptanceCriteria[];
  readonly testing: TestingProcedure[];
  readonly validation: ValidationProcedure[];
}

export interface VerificationCheck {
  readonly checkId: string;
  readonly name: string;
  readonly type: string;
  readonly expected: string;
  readonly tolerance: number;
  readonly critical: boolean;
}

export interface AcceptanceCriteria {
  readonly criteriaId: string;
  readonly description: string;
  readonly measure: string;
  readonly threshold: number;
  readonly mandatory: boolean;
}

export interface TestingProcedure {
  readonly procedureId: string;
  readonly name: string;
  readonly steps: string[];
  readonly expected: string[];
  readonly tools: string[];
}

export interface ValidationProcedure {
  readonly procedureId: string;
  readonly name: string;
  readonly method: string;
  readonly criteria: string[];
  readonly approval: string[];
}

export interface RollbackTimeline {
  readonly phases: TimelinePhase[];
  readonly dependencies: TimelineDependency[];
  readonly milestones: Milestone[];
  readonly critical_path: string[];
}

export interface TimelinePhase {
  readonly phaseId: string;
  readonly name: string;
  readonly duration: number;
  readonly dependencies: string[];
  readonly deliverables: string[];
}

// Note: All types are already exported when declared with 'export interface' above
// The following export block has been removed to prevent duplicate export conflicts
/*
export type {
  EmotionalTone,
  ContextualFactor,
  ComplexityFactor,
  EntityRelationship,
  EntityClassification,
  BehaviorPattern,
  BehaviorContext,
  CustodianInfo,
  CustodianCredentials,
  AuthorizationLevel,
  ContactInfo,
  LocationInfo,
  GeographicCoordinates,
  AccessControl,
  AccessLogEntry,
  EnvironmentalCondition,
  IntegrityVerification,
  EvidenceSource,
  ReliabilityRating,
  ReliabilityHistory,
  SourceCredentials,
  EvidenceContent,
  ContentFormat,
  CompressionInfo,
  EncryptionInfo,
  ContentPreview,
  ContentStatistics,
  ContentStructure,
  ContentSection,
  HierarchyLevel,
  ContentRelationship,
  ContentReference,
  EvidenceMetadata,
  CreationMetadata,
  CollectionMetadata,
  ProcessingMetadata,
  ProcessingOperation,
  ValidationResult,
  ClassificationMetadata,
  RelationshipMetadata,
  EvidenceRelationship,
  QualityMetadata,
  LegalHold,
  AdmissibilityAssessment,
  ApplicableRule,
  AdmissibilityFactor,
  PrivilegeAssessment,
  PrivilegeType,
  DisclosureRestriction,
  LitigationReadiness,
  LitigationIssue,
  PreparationTask,
  LitigationTimeline,
  Milestone,
  Deadline,
  LitigationPhase,
  TimelineDependency,
  BusinessRule,
  KPIMetric,
  QualityRequirement,
  RetentionRequirement,
  FormatRequirement,
  MetadataRequirement,
  IntegrityRequirement,
  ChainRequirement,
  ReviewSchedule,
  DurationExtension,
  DurationNotification,
  MonitoringMetric,
  MonitoringAlert,
  MonitoringReport,
  MonitoringEscalation,
  EscalationLevel,
  MonitoringDashboard,
  DashboardWidget,
  Position,
  Size,
  MonitoringAutomation,
  AutomationAction,
  RollbackStep,
  RollbackTrigger,
  RollbackAutomation,
  RollbackVerification,
  VerificationCheck,
  AcceptanceCriteria,
  TestingProcedure,
  ValidationProcedure,
  RollbackTimeline,
  TimelinePhase,
};
*/

// Default export for enums
export default {
  EntityType,
  SensitivityLevel,
  FormalityLevel,
  BehaviorType,
  CustodyAction,
  TrustLevel,
  ConfidentialityLevel,
} as const;
