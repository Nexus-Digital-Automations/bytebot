/**
 * Comprehensive Parlant Integration Types
 *
 * Complete type definitions for Parlant conversational AI integration including
 * validation types, audit types, compliance types, evidence management, and
 * enterprise security types.
 *
 * Type Categories:
 * - Core Parlant Integration: Base validation and conversation types
 * - Audit Types: Comprehensive audit trail and enterprise compliance
 * - Evidence Management: Digital evidence collection and chain of custody
 * - Compliance Types: Regulatory compliance and metadata
 * - Security Types: Security validation and threat assessment
 * - Performance Types: Performance monitoring and optimization
 *
 * @module ParlantTypes
 * @version 1.0.0
 * @author Claude Code (Parlant Integration Specialist)
 * @since Parlant TypeScript Integration Implementation
 */

import { RiskLevel } from '@bytebot/shared';

// Import shared types from supporting types
import type {
  TrustLevel,
  EntityType,
  SensitivityLevel,
  EmotionalTone,
  ContextualFactor,
  ComplexityFactor,
  EntityRelationship,
  EntityClassification,
  FormalityLevel,
  BehaviorType,
  BehaviorPattern,
  BehaviorContext,
  ReviewSchedule,
  DurationExtension,
  DurationNotification,
} from './parlant-supporting.types';

// Import additional types needed for complete definitions
import type {
  QualityMetric,
  ValidationRequirement,
  ResourceRequirement,
} from './parlant-additional.types';

// =============================================================================
// Core Parlant Integration Types
// =============================================================================

/**
 * Parlant validation session with conversation context
 */
export interface ParlantValidationSession {
  readonly sessionId: string;
  readonly conversationId: string;
  readonly userId: string;
  readonly agentRole: string;
  readonly status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'EXPIRED' | 'ERROR';
  readonly securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly createdAt: Date;
  readonly lastActivity: Date;
  readonly expiresAt: Date;
  readonly context: ParlantConversationContext;
  readonly validationHistory: ParlantValidationResponse[];
  readonly metadata: Record<string, unknown>;
}

/**
 * Parlant conversation context for validation sessions
 */
export interface ParlantConversationContext {
  readonly userId: string;
  readonly sessionId?: string;
  readonly agentRole: string;
  readonly securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly conversationHistory: ConversationEntry[];
  readonly metadata: Record<string, unknown>;
  readonly businessContext?: BusinessContext;
  readonly complianceContext?: ComplianceContext;
}

/**
 * Individual conversation entry in the audit trail
 */
export interface ConversationEntry {
  readonly timestamp: Date;
  readonly speaker: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'PARLANT';
  readonly message: string;
  readonly intent?: string;
  readonly confidence?: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Parlant validation request structure
 */
export interface ParlantValidationRequest {
  readonly functionName: string;
  readonly functionParams: Record<string, unknown>;
  readonly actionDescription: string;
  readonly context: ParlantConversationContext;
  readonly riskLevel: RiskLevel;
  readonly operationId: string;
  readonly businessJustification?: string;
  readonly complianceRequirements?: string[];
  readonly evidenceRequirements?: EvidenceRequirement[];
}

/**
 * Parlant validation response with detailed analysis
 */
export interface ParlantValidationResponse {
  readonly approved: boolean;
  readonly conversationId: string;
  readonly validationTimestamp: Date;
  readonly reasoning: string;
  readonly confidence: number;
  readonly suggestedAlternatives?: string[];
  readonly additionalContext?: Record<string, unknown>;
  readonly executionContext?: ExecutionContext;
  readonly complianceAssessment?: ComplianceAssessment;
  readonly riskAssessment?: RiskAssessment;
  readonly auditMetadata?: AuditMetadata;
}

/**
 * Conversation analysis with intent and sentiment
 */
export interface ConversationAnalysis {
  readonly analysisId: string;
  readonly conversationId: string;
  readonly timestamp: Date;
  readonly intent: ConversationIntent;
  readonly sentiment: ConversationSentiment;
  readonly complexity: ConversationComplexity;
  readonly topics: string[];
  readonly entities: ExtractedEntity[];
  readonly confidence: number;
  readonly languageMetrics: LanguageMetrics;
  readonly behavioralIndicators: BehavioralIndicator[];
}

/**
 * Decision reasoning structure for audit trails
 */
export interface DecisionReasoning {
  readonly reasoningId: string;
  readonly decisionType: 'APPROVE' | 'DENY' | 'ESCALATE' | 'CONDITIONAL';
  readonly primaryFactors: ReasoningFactor[];
  readonly secondaryFactors: ReasoningFactor[];
  readonly riskConsiderations: RiskConsideration[];
  readonly complianceChecks: ComplianceCheck[];
  readonly businessImpact: BusinessImpactFactor[];
  readonly technicalFeasibility: TechnicalFeasibilityFactor[];
  readonly alternativeOptions: AlternativeOption[];
  readonly confidence: number;
  readonly rationale: string;
  readonly supporting_evidence: string[];
}

/**
 * Bypass information for security exceptions
 */
export interface BypassInfo {
  readonly bypassId: string;
  readonly bypassType: 'EMERGENCY' | 'SCHEDULED_MAINTENANCE' | 'ADMINISTRATIVE' | 'TECHNICAL';
  readonly requestedBy: string;
  readonly approvedBy: string;
  readonly reason: string;
  readonly justification: string;
  readonly riskAcceptance: RiskAcceptance;
  readonly duration: BypassDuration;
  readonly conditions: BypassCondition[];
  readonly monitoring: BypassMonitoring;
  readonly rollbackPlan: RollbackPlan;
  readonly auditTrail: BypassAuditEntry[];
}

// =============================================================================
// Audit and Compliance Types
// =============================================================================

/**
 * Audit Parlant response for enterprise compliance
 */
export interface AuditParlantResponse {
  readonly auditId: string;
  readonly operationId: string;
  readonly conversationId: string;
  readonly validationResponse: ParlantValidationResponse;
  readonly auditTimestamp: Date;
  readonly auditMetadata: AuditMetadata;
  readonly complianceMetadata: ComplianceMetadata;
  readonly evidencePackage: EvidencePackage;
  readonly digitalSignature: DigitalSignature;
  readonly auditHash: string;
  readonly retentionPolicy: RetentionPolicy;
  readonly accessControls: AccessControl[];
}

/**
 * Compliance metadata for regulatory requirements
 */
export interface ComplianceMetadata {
  readonly complianceId: string;
  readonly frameworks: ComplianceFramework[];
  readonly classification: ComplianceClassification;
  readonly requirements: ComplianceRequirement[];
  readonly violations: ComplianceViolation[];
  readonly assessments: ComplianceAssessment[];
  readonly notifications: RegulatoryNotification[];
  readonly certifications: ComplianceCertification[];
  readonly auditFindings: AuditFinding[];
  readonly remediationActions: RemediationAction[];
}

/**
 * Compliance classification system
 */
export interface ComplianceClassification {
  readonly classificationId: string;
  readonly level: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' | 'CLASSIFIED';
  readonly dataClassification: DataClassification;
  readonly regulatory: RegulatoryClassification[];
  readonly industry: IndustryClassification[];
  readonly geographic: GeographicClassification[];
  readonly handling: HandlingRequirements;
  readonly retention: RetentionRequirements;
}

/**
 * Regulatory notification for compliance events
 */
export interface RegulatoryNotification {
  readonly notificationId: string;
  readonly regulatoryBody: string;
  readonly framework: string;
  readonly eventType: 'INCIDENT' | 'VIOLATION' | 'BREACH' | 'AUDIT' | 'CERTIFICATION';
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly description: string;
  readonly impactAssessment: ImpactAssessment;
  readonly timeline: NotificationTimeline;
  readonly requiredActions: RequiredAction[];
  readonly reportingDeadline: Date;
  readonly status: 'PENDING' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'RESOLVED';
}

// =============================================================================
// Evidence Management Types
// =============================================================================

/**
 * Evidence type enumeration for digital forensics
 */
export enum EvidenceType {
  AUDIT_LOG = 'AUDIT_LOG',
  CONVERSATION_TRANSCRIPT = 'CONVERSATION_TRANSCRIPT',
  SYSTEM_METRICS = 'SYSTEM_METRICS',
  USER_INTERACTION = 'USER_INTERACTION',
  SECURITY_EVENT = 'SECURITY_EVENT',
  COMPLIANCE_RECORD = 'COMPLIANCE_RECORD',
  DIGITAL_SIGNATURE = 'DIGITAL_SIGNATURE',
  CRYPTOGRAPHIC_PROOF = 'CRYPTOGRAPHIC_PROOF',
  NETWORK_TRAFFIC = 'NETWORK_TRAFFIC',
  DATABASE_TRANSACTION = 'DATABASE_TRANSACTION',
  API_CALL = 'API_CALL',
  FILE_ACCESS = 'FILE_ACCESS',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  ALERT_NOTIFICATION = 'ALERT_NOTIFICATION',
  PERFORMANCE_DATA = 'PERFORMANCE_DATA',
  DOCUMENT = 'DOCUMENT',
  SCREENSHOT = 'SCREENSHOT',
  VIDEO_RECORDING = 'VIDEO_RECORDING',
  AUDIO_RECORDING = 'AUDIO_RECORDING'
}

/**
 * Chain of custody entry for evidence tracking
 */
export interface ChainOfCustodyEntry {
  readonly entryId: string;
  readonly evidenceId: string;
  readonly timestamp: Date;
  readonly custodian: CustodianInfo;
  readonly action: CustodyAction;
  readonly location: LocationInfo;
  readonly purpose: string;
  readonly digitalSignature: DigitalSignature;
  readonly integrity: IntegrityVerification;
  readonly accessControls: AccessControl[];
  readonly metadata: Record<string, unknown>;
}

/**
 * Evidence item with comprehensive metadata
 */
export interface EvidenceItem {
  readonly evidenceId: string;
  readonly type: EvidenceType;
  readonly source: EvidenceSource;
  readonly content: EvidenceContent;
  readonly metadata: EvidenceMetadata;
  readonly integrity: EvidenceIntegrityVerification;
  readonly legal: LegalMetadata;
  readonly preservation: PreservationMetadata;
  readonly access: AccessControl[];
  readonly chain: ChainOfCustodyEntry[];
  readonly analysis: EvidenceAnalysis[];
  readonly retention: RetentionPolicy;
}

/**
 * Evidence integrity verification
 */
export interface EvidenceIntegrityVerification {
  readonly verificationId: string;
  readonly checksums: ChecksumVerification[];
  readonly digitalSignatures: DigitalSignature[];
  readonly timestamps: TimestampVerification[];
  readonly cryptographicProofs: CryptographicProof[];
  readonly blockchainAnchors: BlockchainAnchor[];
  readonly integrityStatus: 'VERIFIED' | 'COMPROMISED' | 'UNKNOWN' | 'PENDING';
  readonly lastVerification: Date;
  readonly verificationHistory: VerificationHistoryEntry[];
}

/**
 * Legal metadata for evidence
 */
export interface LegalMetadata {
  readonly legalId: string;
  readonly jurisdiction: string[];
  readonly legalHold: LegalHold;
  readonly admissibility: AdmissibilityAssessment;
  readonly privilege: PrivilegeAssessment;
  readonly confidentiality: ConfidentialityLevel;
  readonly disclosureRestrictions: DisclosureRestriction[];
  readonly expertWitness: ExpertWitnessAssignment[];
  readonly litigationReadiness: LitigationReadiness;
}

/**
 * Preservation metadata for evidence lifecycle
 */
export interface PreservationMetadata {
  readonly preservationId: string;
  readonly preservationOrder: PreservationOrder;
  readonly retentionSchedule: RetentionSchedule;
  readonly storageRequirements: StorageRequirement[];
  readonly environmentalControls: EnvironmentalControl[];
  readonly backupStrategy: BackupStrategy;
  readonly migrationPlan: MigrationPlan;
  readonly disposalPlan: DisposalPlan;
  readonly auditSchedule: AuditSchedule;
}

/**
 * Expert witness assignment for legal proceedings
 */
export interface ExpertWitnessAssignment {
  readonly assignmentId: string;
  readonly expertId: string;
  readonly expertName: string;
  readonly credentials: ExpertCredentials;
  readonly specialization: string[];
  readonly assignmentDate: Date;
  readonly scope: string;
  readonly responsibilities: string[];
  readonly deliverables: Deliverable[];
  readonly timeline: ExpertTimeline;
  readonly compensation: CompensationAgreement;
}

/**
 * Digital signature for evidence authentication
 */
export interface DigitalSignature {
  readonly signatureId: string;
  readonly algorithm: string;
  readonly keyId: string;
  readonly signature: string;
  readonly signedBy: SignatoryInfo;
  readonly timestamp: Date;
  readonly certificateChain: Certificate[];
  readonly revocationStatus: RevocationStatus;
  readonly trustLevel: TrustLevel;
  readonly validationStatus: 'VALID' | 'INVALID' | 'EXPIRED' | 'REVOKED' | 'UNKNOWN';
}

// =============================================================================
// Collection and Analysis Types
// =============================================================================

/**
 * Collection tool for evidence gathering
 */
export interface CollectionTool {
  readonly toolId: string;
  readonly name: string;
  readonly version: string;
  readonly vendor: string;
  readonly capabilities: CollectionCapability[];
  readonly certification: CollectionCertification;
  readonly configuration: ToolConfiguration;
  readonly calibration: CalibrationRecord[];
  readonly qualityMetrics: CollectionQualityMetrics;
  readonly supportedFormats: SupportedFormat[];
  readonly limitations: ToolLimitation[];
}

/**
 * Collection certification for forensic tools
 */
export interface CollectionCertification {
  readonly certificationId: string;
  readonly certifyingBody: string;
  readonly standard: string;
  readonly level: string;
  readonly issueDate: Date;
  readonly expiryDate: Date;
  readonly scope: string[];
  readonly restrictions: string[];
  readonly validationTests: ValidationTest[];
  readonly certificateNumber: string;
  readonly status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED';
}

/**
 * Collection quality metrics for evidence assessment
 */
export interface CollectionQualityMetrics {
  readonly metricsId: string;
  readonly completeness: CompletenessMetric;
  readonly accuracy: AccuracyMetric;
  readonly reliability: ReliabilityMetric;
  readonly timeliness: TimelinessMetric;
  readonly integrity: IntegrityMetric;
  readonly authenticity: AuthenticityMetric;
  readonly auditability: AuditabilityMetric;
  readonly overallScore: number;
  readonly qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

// =============================================================================
// Supporting Types and Interfaces
// =============================================================================

/**
 * Business context for validation decisions
 */
export interface BusinessContext {
  readonly organizationId: string;
  readonly departmentId: string;
  readonly projectId?: string;
  readonly businessUnit: string;
  readonly costCenter: string;
  readonly budgetCategory: string;
  readonly businessOwner: string;
  readonly stakeholders: string[];
  readonly businessRules: BusinessRule[];
  readonly kpis: KPIMetric[];
}

/**
 * Compliance context for regulatory requirements
 */
export interface ComplianceContext {
  readonly frameworks: string[];
  readonly jurisdiction: string;
  readonly dataClassification: string;
  readonly retentionRequirements: number;
  readonly accessControls: string[];
  readonly auditRequirements: string[];
  readonly reportingObligations: string[];
  readonly certificationLevel: string;
}

/**
 * Evidence requirement specification
 */
export interface EvidenceRequirement {
  readonly requirementId: string;
  readonly type: EvidenceType;
  readonly mandatory: boolean;
  readonly quality: QualityRequirement;
  readonly retention: RetentionRequirement;
  readonly format: FormatRequirement[];
  readonly metadata: MetadataRequirement[];
  readonly integrity: IntegrityRequirement;
  readonly chain: ChainRequirement;
}

/**
 * Execution context for approved operations
 */
export interface ExecutionContext {
  readonly timeoutMs?: number;
  readonly retryAttempts?: number;
  readonly monitoringLevel: 'BASIC' | 'DETAILED' | 'COMPREHENSIVE';
  readonly safeguards: string[];
  readonly rollbackPlan?: string;
  readonly approvalConditions?: string[];
  readonly complianceChecks?: string[];
  readonly auditRequirements?: string[];
}

/**
 * Compliance assessment result
 */
export interface ComplianceAssessment {
  readonly assessmentId: string;
  readonly framework: string;
  readonly status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL' | 'UNKNOWN';
  readonly score: number;
  readonly findings: AssessmentFinding[];
  readonly recommendations: string[];
  readonly nextReview: Date;
  readonly certificationLevel: string;
}

/**
 * Risk assessment for operations
 */
export interface RiskAssessment {
  readonly assessmentId: string;
  readonly overallRisk: RiskLevel;
  readonly riskFactors: RiskFactor[];
  readonly mitigations: RiskMitigation[];
  readonly residualRisk: RiskLevel;
  readonly acceptanceLevel: 'ACCEPTABLE' | 'CONDITIONAL' | 'UNACCEPTABLE';
  readonly reviewRequired: boolean;
  readonly escalationRequired: boolean;
}

/**
 * Audit metadata for compliance tracking
 */
export interface AuditMetadata {
  readonly auditId: string;
  readonly auditType: 'OPERATIONAL' | 'COMPLIANCE' | 'SECURITY' | 'PERFORMANCE';
  readonly auditor: string;
  readonly framework: string;
  readonly scope: string[];
  readonly methodology: string;
  readonly tools: string[];
  readonly evidence: string[];
  readonly findings: string[];
  readonly recommendations: string[];
}

/**
 * Conversation intent classification
 */
export interface ConversationIntent {
  readonly intentId: string;
  readonly primaryIntent: string;
  readonly secondaryIntents: string[];
  readonly confidence: number;
  readonly intentHierarchy: string[];
  readonly businessCategory: string;
  readonly riskCategory: string;
  readonly complianceCategory: string;
}

/**
 * Conversation sentiment analysis
 */
export interface ConversationSentiment {
  readonly sentimentId: string;
  readonly overallSentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';
  readonly emotionalTone: EmotionalTone[];
  readonly urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly frustrationLevel: number;
  readonly satisfactionLevel: number;
  readonly confidenceLevel: number;
  readonly contextualFactors: ContextualFactor[];
}

/**
 * Conversation complexity measurement
 */
export interface ConversationComplexity {
  readonly complexityId: string;
  readonly overallComplexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'HIGHLY_COMPLEX';
  readonly linguisticComplexity: number;
  readonly topicalComplexity: number;
  readonly technicalComplexity: number;
  readonly conceptualComplexity: number;
  readonly interdependencyComplexity: number;
  readonly factors: ComplexityFactor[];
}

/**
 * Extracted entity from conversation
 */
export interface ExtractedEntity {
  readonly entityId: string;
  readonly type: EntityType;
  readonly value: string;
  readonly confidence: number;
  readonly context: string;
  readonly relationships: EntityRelationship[];
  readonly sensitivity: SensitivityLevel;
  readonly classification: EntityClassification;
}

/**
 * Language metrics for conversation analysis
 */
export interface LanguageMetrics {
  readonly metricsId: string;
  readonly language: string;
  readonly readabilityScore: number;
  readonly vocabularyComplexity: number;
  readonly grammarComplexity: number;
  readonly sentenceComplexity: number;
  readonly technicalTerms: number;
  readonly formalityLevel: FormalityLevel;
  readonly dialectVariations: string[];
}

/**
 * Behavioral indicator from conversation
 */
export interface BehavioralIndicator {
  readonly indicatorId: string;
  readonly type: BehaviorType;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly confidence: number;
  readonly pattern: BehaviorPattern;
  readonly triggers: string[];
  readonly context: BehaviorContext;
  readonly recommendations: string[];
}

/**
 * Reasoning factor for decision analysis
 */
export interface ReasoningFactor {
  readonly factorId: string;
  readonly category: 'TECHNICAL' | 'BUSINESS' | 'LEGAL' | 'ETHICAL' | 'OPERATIONAL';
  readonly weight: number;
  readonly impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  readonly confidence: number;
  readonly evidence: string[];
  readonly rationale: string;
}

/**
 * Risk consideration for decision making
 */
export interface RiskConsideration {
  readonly considerationId: string;
  readonly riskType: string;
  readonly likelihood: number;
  readonly impact: number;
  readonly severity: RiskLevel;
  readonly mitigation: string[];
  readonly contingency: string[];
  readonly monitoring: string[];
}

/**
 * Compliance check result
 */
export interface ComplianceCheck {
  readonly checkId: string;
  readonly framework: string;
  readonly requirement: string;
  readonly status: 'PASS' | 'FAIL' | 'WARNING' | 'NOT_APPLICABLE';
  readonly details: string;
  readonly evidence: string[];
  readonly remediation: string[];
}

/**
 * Business impact factor
 */
export interface BusinessImpactFactor {
  readonly factorId: string;
  readonly category: string;
  readonly impact: 'HIGH' | 'MEDIUM' | 'LOW' | 'NEGLIGIBLE';
  readonly quantification: number;
  readonly unit: string;
  readonly timeframe: string;
  readonly stakeholders: string[];
}

/**
 * Technical feasibility factor
 */
export interface TechnicalFeasibilityFactor {
  readonly factorId: string;
  readonly aspect: string;
  readonly feasibility: 'HIGH' | 'MEDIUM' | 'LOW' | 'IMPOSSIBLE';
  readonly complexity: number;
  readonly resources: string[];
  readonly dependencies: string[];
  readonly constraints: string[];
}

/**
 * Alternative option for decisions
 */
export interface AlternativeOption {
  readonly optionId: string;
  readonly description: string;
  readonly feasibility: number;
  readonly risk: RiskLevel;
  readonly cost: number;
  readonly benefits: string[];
  readonly drawbacks: string[];
  readonly timeline: string;
}

/**
 * Risk acceptance documentation
 */
export interface RiskAcceptance {
  readonly acceptanceId: string;
  readonly acceptedBy: string;
  readonly acceptanceDate: Date;
  readonly riskLevel: RiskLevel;
  readonly justification: string;
  readonly conditions: string[];
  readonly reviewSchedule: ReviewSchedule;
  readonly escalationCriteria: string[];
}

/**
 * Bypass duration specification
 */
export interface BypassDuration {
  readonly startTime: Date;
  readonly endTime: Date;
  readonly duration: number;
  readonly unit: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS';
  readonly extensions: DurationExtension[];
  readonly autoExpiry: boolean;
  readonly notifications: DurationNotification[];
}

/**
 * Bypass condition
 */
export interface BypassCondition {
  readonly conditionId: string;
  readonly type: 'MONITORING' | 'APPROVAL' | 'NOTIFICATION' | 'AUDIT';
  readonly description: string;
  readonly mandatory: boolean;
  readonly validation: string;
  readonly frequency: string;
  readonly responsible: string[];
}

/**
 * Bypass monitoring
 */
export interface BypassMonitoring {
  readonly monitoringId: string;
  readonly metrics: MonitoringMetric[];
  readonly alerts: MonitoringAlert[];
  readonly reporting: MonitoringReport[];
  readonly escalation: MonitoringEscalation;
  readonly dashboard: MonitoringDashboard;
  readonly automation: MonitoringAutomation;
}

/**
 * Rollback plan for bypass operations
 */
export interface RollbackPlan {
  readonly planId: string;
  readonly steps: RollbackStep[];
  readonly triggers: RollbackTrigger[];
  readonly automation: RollbackAutomation;
  readonly verification: RollbackVerification;
  readonly timeline: RollbackTimeline;
  readonly stakeholders: string[];
}

/**
 * Bypass audit entry
 */
export interface BypassAuditEntry {
  readonly entryId: string;
  readonly timestamp: Date;
  readonly action: string;
  readonly actor: string;
  readonly details: Record<string, unknown>;
  readonly outcome: string;
  readonly evidence: string[];
  readonly digitalSignature: DigitalSignature;
}

// =============================================================================
// Additional Missing Interface Definitions
// =============================================================================

/**
 * Checksum verification for integrity checking
 */
export interface ChecksumVerification {
  readonly checksumId: string;
  readonly algorithm: 'MD5' | 'SHA1' | 'SHA256' | 'SHA512' | 'CRC32';
  readonly value: string;
  readonly timestamp: Date;
  readonly verified: boolean;
  readonly source: string;
}

/**
 * Timestamp verification for temporal integrity
 */
export interface TimestampVerification {
  readonly timestampId: string;
  readonly authority: string;
  readonly timestamp: Date;
  readonly signature: string;
  readonly certificate: string;
  readonly verified: boolean;
}

/**
 * Cryptographic proof for advanced verification
 */
export interface CryptographicProof {
  readonly proofId: string;
  readonly algorithm: string;
  readonly proof: string;
  readonly challenge: string;
  readonly response: string;
  readonly verified: boolean;
}

/**
 * Blockchain anchor for immutable verification
 */
export interface BlockchainAnchor {
  readonly anchorId: string;
  readonly blockchain: string;
  readonly transactionHash: string;
  readonly blockHeight: number;
  readonly timestamp: Date;
  readonly merkleRoot: string;
}

/**
 * Verification history entry
 */
export interface VerificationHistoryEntry {
  readonly entryId: string;
  readonly timestamp: Date;
  readonly verifiedBy: string;
  readonly method: string;
  readonly result: 'PASSED' | 'FAILED' | 'WARNING';
  readonly details: string;
}

/**
 * Evidence package for comprehensive evidence management
 */
export interface EvidencePackage {
  readonly packageId: string;
  readonly evidence: EvidenceItem[];
  readonly manifest: EvidenceManifest;
  readonly integrity: PackageIntegrity;
  readonly access: PackageAccess;
  readonly transmission: TransmissionRecord[];
}

/**
 * Evidence manifest for package contents
 */
export interface EvidenceManifest {
  readonly manifestId: string;
  readonly contents: ManifestEntry[];
  readonly checksums: Record<string, string>;
  readonly signatures: DigitalSignature[];
  readonly timestamp: Date;
  readonly version: string;
}

/**
 * Manifest entry for individual evidence items
 */
export interface ManifestEntry {
  readonly entryId: string;
  readonly evidenceId: string;
  readonly path: string;
  readonly size: number;
  readonly checksum: string;
  readonly metadata: Record<string, unknown>;
}

/**
 * Package integrity verification
 */
export interface PackageIntegrity {
  readonly integrityId: string;
  readonly verified: boolean;
  readonly checksums: ChecksumVerification[];
  readonly signatures: DigitalSignature[];
  readonly tampering: TamperingEvidence[];
  readonly lastVerification: Date;
}

/**
 * Tampering evidence
 */
export interface TamperingEvidence {
  readonly evidenceId: string;
  readonly type: 'CHECKSUM_MISMATCH' | 'SIGNATURE_INVALID' | 'TIMESTAMP_INCONSISTENT' | 'STRUCTURAL_CHANGE';
  readonly detected: Date;
  readonly details: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Package access control
 */
export interface PackageAccess {
  readonly accessId: string;
  readonly permissions: AccessPermission[];
  readonly restrictions: AccessRestriction[];
  readonly audit: AccessAuditEntry[];
  readonly expiry: Date;
}

/**
 * Access permission
 */
export interface AccessPermission {
  readonly permissionId: string;
  readonly principal: string;
  readonly actions: string[];
  readonly conditions: string[];
  readonly granted: Date;
  readonly grantedBy: string;
}

/**
 * Access restriction
 */
export interface AccessRestriction {
  readonly restrictionId: string;
  readonly type: string;
  readonly scope: string[];
  readonly conditions: string[];
  readonly rationale: string;
}

/**
 * Access audit entry
 */
export interface AccessAuditEntry {
  readonly auditId: string;
  readonly timestamp: Date;
  readonly principal: string;
  readonly action: string;
  readonly resource: string;
  readonly result: 'GRANTED' | 'DENIED' | 'ERROR';
  readonly details: string;
}

/**
 * Transmission record for evidence transfer
 */
export interface TransmissionRecord {
  readonly transmissionId: string;
  readonly source: TransmissionEndpoint;
  readonly destination: TransmissionEndpoint;
  readonly timestamp: Date;
  readonly protocol: string;
  readonly integrity: TransmissionIntegrity;
  readonly status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

/**
 * Transmission endpoint
 */
export interface TransmissionEndpoint {
  readonly endpointId: string;
  readonly address: string;
  readonly authentication: EndpointAuthentication;
  readonly certificate: string;
  readonly capabilities: string[];
}

/**
 * Endpoint authentication
 */
export interface EndpointAuthentication {
  readonly method: 'CERTIFICATE' | 'API_KEY' | 'OAUTH' | 'KERBEROS';
  readonly credentials: string;
  readonly validated: boolean;
  readonly expiry: Date;
}

/**
 * Transmission integrity
 */
export interface TransmissionIntegrity {
  readonly integrityId: string;
  readonly encryption: TransmissionEncryption;
  readonly checksums: ChecksumVerification[];
  readonly signatures: DigitalSignature[];
  readonly verified: boolean;
}

/**
 * Transmission encryption
 */
export interface TransmissionEncryption {
  readonly algorithm: string;
  readonly keyExchange: string;
  readonly cipherSuite: string;
  readonly strength: number;
  readonly validated: boolean;
}

/**
 * Retention policy for evidence lifecycle
 */
export interface RetentionPolicy {
  readonly policyId: string;
  readonly category: string;
  readonly duration: number;
  readonly unit: 'DAYS' | 'MONTHS' | 'YEARS';
  readonly triggers: string[];
  readonly exceptions: string[];
  readonly disposal: DisposalPolicy;
}

/**
 * Disposal policy for evidence destruction
 */
export interface DisposalPolicy {
  readonly policyId: string;
  readonly method: 'SECURE_DELETE' | 'CRYPTOGRAPHIC_ERASURE' | 'PHYSICAL_DESTRUCTION' | 'DEGAUSSING';
  readonly certification: boolean;
  readonly verification: string[];
  readonly audit: boolean;
}

/**
 * Evidence analysis result
 */
export interface EvidenceAnalysis {
  readonly analysisId: string;
  readonly type: 'CONTENT' | 'METADATA' | 'FORENSIC' | 'STATISTICAL' | 'COMPARATIVE';
  readonly method: string;
  readonly results: AnalysisResult[];
  readonly confidence: number;
  readonly timestamp: Date;
  readonly analyst: string;
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  readonly resultId: string;
  readonly finding: string;
  readonly evidence: string[];
  readonly confidence: number;
  readonly significance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly implications: string[];
}

/**
 * Certificate for digital signatures
 */
export interface Certificate {
  readonly certificateId: string;
  readonly subject: string;
  readonly issuer: string;
  readonly serialNumber: string;
  readonly validFrom: Date;
  readonly validTo: Date;
  readonly keyUsage: string[];
  readonly extensions: CertificateExtension[];
}

/**
 * Certificate extension
 */
export interface CertificateExtension {
  readonly oid: string;
  readonly critical: boolean;
  readonly value: string;
  readonly description: string;
}

/**
 * Revocation status for certificates
 */
export interface RevocationStatus {
  readonly statusId: string;
  readonly status: 'VALID' | 'REVOKED' | 'SUSPENDED' | 'UNKNOWN';
  readonly revocationDate?: Date;
  readonly reason?: string;
  readonly checkedAt: Date;
  readonly nextCheck: Date;
}

/**
 * Signatory information
 */
export interface SignatoryInfo {
  readonly signatoryId: string;
  readonly name: string;
  readonly role: string;
  readonly organization: string;
  readonly contact: string;
  readonly authority: string[];
}

/**
 * Risk factor for assessments
 */
export interface RiskFactor {
  readonly factorId: string;
  readonly category: string;
  readonly description: string;
  readonly likelihood: number;
  readonly impact: number;
  readonly severity: RiskLevel;
  readonly mitigation: string[];
}

/**
 * Risk mitigation strategy
 */
export interface RiskMitigation {
  readonly mitigationId: string;
  readonly strategy: 'ACCEPT' | 'AVOID' | 'MITIGATE' | 'TRANSFER';
  readonly actions: string[];
  readonly effectiveness: number;
  readonly cost: number;
  readonly timeline: number;
}

/**
 * Assessment finding for compliance assessments
 */
export interface AssessmentFinding {
  readonly findingId: string;
  readonly type: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly description: string;
  readonly evidence: string[];
  readonly recommendation: string[];
  readonly status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
}

/**
 * Milestone tracking
 */
export interface Milestone {
  readonly milestoneId: string;
  readonly name: string;
  readonly description: string;
  readonly targetDate: Date;
  readonly actualDate?: Date;
  readonly status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  readonly dependencies: string[];
}

/**
 * Timeline dependency
 */
export interface TimelineDependency {
  readonly dependencyId: string;
  readonly predecessor: string;
  readonly successor: string;
  readonly type: 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH' | 'START_TO_FINISH';
  readonly lag: number;
  readonly critical: boolean;
}

/**
 * Rollback step definition
 */
export interface RollbackStep {
  readonly stepId: string;
  readonly name: string;
  readonly description: string;
  readonly action: string;
  readonly parameters: Record<string, unknown>;
  readonly order: number;
  readonly timeout: number;
  readonly verification: string[];
}

/**
 * Rollback trigger condition
 */
export interface RollbackTrigger {
  readonly triggerId: string;
  readonly condition: string;
  readonly threshold: number;
  readonly duration: number;
  readonly automatic: boolean;
  readonly approval: string[];
}

/**
 * Rollback automation configuration
 */
export interface RollbackAutomation {
  readonly automationId: string;
  readonly enabled: boolean;
  readonly triggers: string[];
  readonly conditions: string[];
  readonly actions: string[];
  readonly verification: boolean;
}

/**
 * Rollback verification procedures
 */
export interface RollbackVerification {
  readonly verificationId: string;
  readonly procedures: string[];
  readonly acceptance: string[];
  readonly testing: string[];
  readonly approval: string[];
  readonly documentation: boolean;
}

/**
 * Rollback timeline
 */
export interface RollbackTimeline {
  readonly timelineId: string;
  readonly phases: TimelinePhase[];
  readonly checkpoints: string[];
  readonly duration: number;
  readonly critical_path: string[];
}

/**
 * Timeline phase
 */
export interface TimelinePhase {
  readonly phaseId: string;
  readonly name: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly objectives: string[];
  readonly deliverables: string[];
  readonly dependencies: string[];
}

// =============================================================================
// Missing Interface Definitions Referenced in the File
// =============================================================================

export interface DisposalPlan {
  readonly planId: string;
  readonly method: 'SECURE_DELETE' | 'PHYSICAL_DESTRUCTION' | 'DEGAUSSING' | 'OVERWRITE';
  readonly schedule: Date;
  readonly responsible: string;
  readonly certification: boolean;
  readonly verification: string[];
}

export interface AuditSchedule {
  readonly scheduleId: string;
  readonly frequency: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'WEEKLY';
  readonly scope: string[];
  readonly auditors: string[];
  readonly nextAudit: Date;
  readonly lastAudit: Date;
}

export interface ExpertCredentials {
  readonly credentialId: string;
  readonly type: 'CERTIFICATION' | 'LICENSE' | 'DEGREE' | 'EXPERIENCE';
  readonly issuer: string;
  readonly validFrom: Date;
  readonly validTo: Date;
  readonly verified: boolean;
}

export interface Deliverable {
  readonly deliverableId: string;
  readonly name: string;
  readonly description: string;
  readonly dueDate: Date;
  readonly status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED';
  readonly dependencies: string[];
}

export interface ExpertTimeline {
  readonly timelineId: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly milestones: string[];
  readonly deliverables: Deliverable[];
  readonly dependencies: string[];
}

export interface CompensationAgreement {
  readonly agreementId: string;
  readonly hourlyRate: number;
  readonly totalBudget: number;
  readonly paymentTerms: string[];
  readonly expenses: boolean;
  readonly currency: string;
}

export interface CollectionCapability {
  readonly capabilityId: string;
  readonly type: string;
  readonly supported: boolean;
  readonly limitations: string[];
  readonly accuracy: number;
  readonly performance: Record<string, number>;
}

export interface ToolConfiguration {
  readonly configurationId: string;
  readonly parameters: Record<string, any>;
  readonly calibration: Date;
  readonly operator: string;
  readonly validated: boolean;
  readonly limitations: string[];
}

export interface SupportedFormat {
  readonly formatId: string;
  readonly name: string;
  readonly extension: string;
  readonly mimeType: string;
  readonly compression: boolean;
  readonly encryption: boolean;
}

export interface ToolLimitation {
  readonly limitationId: string;
  readonly type: 'TECHNICAL' | 'OPERATIONAL' | 'LEGAL';
  readonly description: string;
  readonly impact: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly workaround?: string;
}

export interface ValidationTest {
  readonly testId: string;
  readonly name: string;
  readonly procedure: string[];
  readonly expected: string[];
  readonly actual?: string[];
  readonly result: 'PASS' | 'FAIL' | 'PENDING';
}

export interface CompletenessMetric {
  readonly metricId: string;
  readonly target: number;
  readonly actual: number;
  readonly threshold: number;
  readonly status: 'ACCEPTABLE' | 'WARNING' | 'CRITICAL';
}

export interface AccuracyMetric {
  readonly metricId: string;
  readonly target: number;
  readonly actual: number;
  readonly measurement: string;
  readonly validation: string[];
}

export interface ReliabilityMetric {
  readonly metricId: string;
  readonly availability: number;
  readonly uptime: number;
  readonly errorRate: number;
  readonly performance: number;
}

export interface TimelinessMetric {
  readonly metricId: string;
  readonly target: number;
  readonly actual: number;
  readonly unit: 'SECONDS' | 'MINUTES' | 'HOURS' | 'DAYS';
  readonly trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

export interface IntegrityMetric {
  readonly metricId: string;
  readonly checksumValidation: boolean;
  readonly digitalSignature: boolean;
  readonly tamperEvidence: boolean;
  readonly integrityScore: number;
}

export interface AuthenticityMetric {
  readonly metricId: string;
  readonly sourceVerification: boolean;
  readonly chainOfCustody: boolean;
  readonly witnessVerification: boolean;
  readonly authenticityScore: number;
}

export interface AuditabilityMetric {
  readonly metricId: string;
  readonly traceability: number;
  readonly documentation: number;
  readonly accessibility: number;
  readonly compliance: number;
}

export interface BusinessRule {
  readonly ruleId: string;
  readonly name: string;
  readonly condition: string;
  readonly action: string;
  readonly priority: number;
  readonly enabled: boolean;
}

export interface KPIMetric {
  readonly kpiId: string;
  readonly name: string;
  readonly target: number;
  readonly actual: number;
  readonly unit: string;
  readonly frequency: 'REAL_TIME' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
}

export interface QualityRequirement {
  readonly requirementId: string;
  readonly metric: string;
  readonly target: number;
  readonly threshold: number;
  readonly measurement: string;
  readonly validation: string[];
}

export interface RetentionRequirement {
  readonly requirementId: string;
  readonly duration: number;
  readonly unit: 'DAYS' | 'MONTHS' | 'YEARS';
  readonly trigger: 'CREATION' | 'LAST_ACCESS' | 'CLOSURE';
  readonly disposal: DisposalPlan;
}

export interface FormatRequirement {
  readonly requirementId: string;
  readonly formats: string[];
  readonly compression: boolean;
  readonly encryption: boolean;
  readonly validation: string[];
}

export interface MetadataRequirement {
  readonly requirementId: string;
  readonly required: string[];
  readonly optional: string[];
  readonly format: string;
  readonly validation: string[];
}

export interface IntegrityRequirement {
  readonly requirementId: string;
  readonly checksums: boolean;
  readonly digitalSignatures: boolean;
  readonly timestamping: boolean;
  readonly verification: string[];
}

export interface ChainRequirement {
  readonly requirementId: string;
  readonly continuity: boolean;
  readonly documentation: boolean;
  readonly verification: boolean;
  readonly auditTrail: boolean;
}

// Additional interfaces that were referenced in exports but need definitions
export interface CalibrationStandard {
  readonly standardId: string;
  readonly name: string;
  readonly authority: string;
  readonly specifications: string[];
  readonly accuracy: number;
  readonly uncertainty: number;
  readonly traceability: string[];
  readonly validity: Date;
}

export interface CalibrationProcedure {
  readonly procedureId: string;
  readonly steps: string[];
  readonly equipment: string[];
  readonly conditions: string[];
  readonly acceptance: string[];
  readonly documentation: string[];
}

export interface CalibrationHistory {
  readonly historyId: string;
  readonly calibrations: CalibrationRecord[];
  readonly trends: string[];
  readonly maintenance: string[];
  readonly compliance: string[];
}

export interface CalibrationRecord {
  readonly recordId: string;
  readonly date: Date;
  readonly technician: string;
  readonly standard: string;
  readonly results: Record<string, number>;
  readonly status: 'PASS' | 'FAIL' | 'CONDITIONAL';
  readonly nextDue: Date;
}

export interface MonitoringAlert {
  readonly alertId: string;
  readonly condition: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly recipients: string[];
  readonly escalation: boolean;
}

export interface MonitoringReport {
  readonly reportId: string;
  readonly period: string;
  readonly metrics: Record<string, number>;
  readonly analysis: string[];
  readonly recommendations: string[];
}

export interface MonitoringEscalation {
  readonly escalationId: string;
  readonly level: number;
  readonly recipients: string[];
  readonly timeline: number;
  readonly actions: string[];
}

export interface MonitoringDashboard {
  readonly dashboardId: string;
  readonly widgets: string[];
  readonly layout: string;
  readonly filters: Record<string, any>;
  readonly permissions: string[];
}

export interface MonitoringAutomation {
  readonly automationId: string;
  readonly triggers: string[];
  readonly actions: string[];
  readonly conditions: string[];
  readonly schedule: string;
}

export interface MonitoringMetric {
  readonly metricId: string;
  readonly name: string;
  readonly type: 'COUNTER' | 'GAUGE' | 'HISTOGRAM' | 'SUMMARY';
  readonly unit: string;
  readonly frequency: number;
  readonly retention: number;
}

export interface AutomationAction {
  readonly actionId: string;
  readonly type: string;
  readonly parameters: Record<string, unknown>;
  readonly timeout: number;
  readonly retry: number;
}

// Note: All interfaces are already exported when declared above, no need for additional export type statements

// Default export for convenience
export default {
  EvidenceType,
} as const;