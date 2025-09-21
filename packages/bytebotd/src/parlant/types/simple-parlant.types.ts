/**
 * Simple Parlant Integration Types
 *
 * Core type definitions for parlant integration that resolve the original
 * TypeScript compilation errors without complex interdependencies.
 *
 * @module SimpleParlantTypes
 * @version 1.0.0
 * @author Claude Code (Parlant Integration Specialist)
 * @since Parlant Simple Types Implementation
 */

// =============================================================================
// Core Parlant Integration Types
// =============================================================================

export interface ParlantValidationSession {
  readonly sessionId: string;
  readonly conversationId: string;
  readonly context: ParlantConversationContext;
  readonly startTime: Date;
  readonly endTime?: Date;
  readonly status: 'active' | 'completed' | 'failed';
  readonly validations: ParlantValidationRequest[];
}

export interface ParlantConversationContext {
  readonly contextId: string;
  readonly entries: ConversationEntry[];
  readonly metadata: Record<string, unknown>;
  readonly participants: string[];
  readonly language: string;
  readonly domain: string;
}

export interface ConversationEntry {
  readonly entryId: string;
  readonly timestamp: Date;
  readonly speaker: string;
  readonly content: string;
  readonly metadata: Record<string, unknown>;
  readonly sentiment?: ConversationSentiment;
  readonly intent?: ConversationIntent;
}

export interface ParlantValidationRequest {
  readonly requestId: string;
  readonly conversationId: string;
  readonly content: string;
  readonly context: ParlantConversationContext;
  readonly timestamp: Date;
  readonly metadata: Record<string, unknown>;
}

export interface ParlantValidationResponse {
  readonly responseId: string;
  readonly requestId: string;
  readonly approved: boolean;
  readonly confidence: number;
  readonly reasoning: string;
  readonly analysis: ConversationAnalysis;
  readonly validationTimestamp: Date;
  readonly bypass?: BypassInfo;
}

export interface ConversationAnalysis {
  readonly analysisId: string;
  readonly sentiment: ConversationSentiment;
  readonly intent: ConversationIntent;
  readonly complexity: ConversationComplexity;
  readonly entities: ExtractedEntity[];
  readonly languageMetrics: LanguageMetrics;
  readonly reasoning: DecisionReasoning;
}

export interface DecisionReasoning {
  readonly reasoningId: string;
  readonly factors: ReasoningFactor[];
  readonly riskConsiderations: RiskConsideration[];
  readonly complianceChecks: ComplianceCheck[];
  readonly businessImpact: BusinessImpactFactor[];
  readonly technicalFeasibility: TechnicalFeasibilityFactor[];
  readonly alternatives: AlternativeOption[];
}

export interface BypassInfo {
  readonly bypassId: string;
  readonly reason: string;
  readonly approver: string;
  readonly timestamp: Date;
  readonly duration: BypassDuration;
  readonly conditions: BypassCondition[];
  readonly monitoring: BypassMonitoring;
  readonly rollbackPlan: RollbackPlan;
  readonly auditTrail: BypassAuditEntry[];
}

// =============================================================================
// Audit and Compliance Types
// =============================================================================

export interface AuditParlantResponse {
  readonly auditId: string;
  readonly responseId: string;
  readonly timestamp: Date;
  readonly auditor: string;
  readonly findings: string[];
  readonly compliance: ComplianceMetadata;
  readonly recommendations: string[];
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ComplianceMetadata {
  readonly complianceId: string;
  readonly frameworks: string[];
  readonly classification: ComplianceClassification;
  readonly requirements: string[];
  readonly status: 'compliant' | 'non-compliant' | 'pending';
  readonly lastAssessment: Date;
  readonly nextReview: Date;
}

export interface ComplianceClassification {
  readonly classificationId: string;
  readonly level: 'public' | 'internal' | 'confidential' | 'restricted';
  readonly dataCategory: string[];
  readonly handlingRequirements: string[];
  readonly retentionPeriod: number;
  readonly jurisdiction: string[];
}

export interface RegulatoryNotification {
  readonly notificationId: string;
  readonly authority: string;
  readonly requirement: string;
  readonly deadline: Date;
  readonly status: 'pending' | 'submitted' | 'approved' | 'rejected';
  readonly content: string;
  readonly evidence: string[];
}

// =============================================================================
// Evidence Management Types
// =============================================================================

export enum EvidenceType {
  CONVERSATION = 'conversation',
  DOCUMENT = 'document',
  METADATA = 'metadata',
  AUDIT_LOG = 'audit_log',
  SYSTEM_LOG = 'system_log',
  USER_ACTION = 'user_action',
  VALIDATION_RESULT = 'validation_result',
  COMPLIANCE_RECORD = 'compliance_record'
}

export interface EvidenceItem {
  readonly evidenceId: string;
  readonly type: EvidenceType;
  readonly source: string;
  readonly content: string;
  readonly metadata: EvidenceMetadata;
  readonly integrityVerification: EvidenceIntegrityVerification;
  readonly legalMetadata: LegalMetadata;
  readonly preservationMetadata: PreservationMetadata;
  readonly digitalSignature?: DigitalSignature;
  readonly chainOfCustody: ChainOfCustodyEntry[];
}

export interface EvidenceIntegrityVerification {
  readonly verificationId: string;
  readonly checksum: string;
  readonly algorithm: string;
  readonly timestamp: Date;
  readonly verified: boolean;
  readonly verifiedBy: string;
  readonly tamperEvidence: boolean;
}

export interface LegalMetadata {
  readonly metadataId: string;
  readonly jurisdiction: string[];
  readonly legalHold: boolean;
  readonly privileged: boolean;
  readonly confidentiality: 'public' | 'internal' | 'confidential' | 'privileged';
  readonly retentionRequirement: number;
  readonly disposalDate?: Date;
  readonly expertWitness?: ExpertWitnessAssignment;
}

export interface PreservationMetadata {
  readonly preservationId: string;
  readonly preservationOrder?: string;
  readonly retentionSchedule: string;
  readonly storageLocation: string;
  readonly accessControls: string[];
  readonly environmentalConditions: string[];
  readonly backupStrategy: string;
  readonly migrationPlan?: string;
}

export interface ExpertWitnessAssignment {
  readonly assignmentId: string;
  readonly expertId: string;
  readonly name: string;
  readonly credentials: string[];
  readonly specialization: string[];
  readonly assignmentDate: Date;
  readonly scope: string;
  readonly deliverables: string[];
  readonly timeline: string;
  readonly compensation: string;
}

export interface DigitalSignature {
  readonly signatureId: string;
  readonly algorithm: string;
  readonly signature: string;
  readonly publicKey: string;
  readonly certificate: string;
  readonly timestamp: Date;
  readonly signedBy: string;
  readonly purpose: string;
  readonly valid: boolean;
}

export interface ChainOfCustodyEntry {
  readonly entryId: string;
  readonly evidenceId: string;
  readonly timestamp: Date;
  readonly custodian: string;
  readonly action: 'created' | 'accessed' | 'modified' | 'transferred' | 'verified';
  readonly location: string;
  readonly purpose: string;
  readonly authorization: string;
  readonly witness?: string;
  readonly integrityCheck: boolean;
}

export interface EvidenceMetadata {
  readonly metadataId: string;
  readonly creationDate: Date;
  readonly lastModified: Date;
  readonly size: number;
  readonly format: string;
  readonly encoding: string;
  readonly source: string;
  readonly creator: string;
  readonly classification: string;
  readonly tags: string[];
}

// =============================================================================
// Collection Types
// =============================================================================

export interface CollectionTool {
  readonly toolId: string;
  readonly name: string;
  readonly version: string;
  readonly manufacturer: string;
  readonly certification: CollectionCertification;
  readonly capabilities: string[];
  readonly limitations: string[];
  readonly configuration: Record<string, unknown>;
  readonly lastCalibration: Date;
  readonly nextCalibration: Date;
}

export interface CollectionCertification {
  readonly certificationId: string;
  readonly standard: string;
  readonly issuer: string;
  readonly issuedDate: Date;
  readonly expiryDate: Date;
  readonly scope: string[];
  readonly valid: boolean;
  readonly certificate: string;
}

export interface CollectionQualityMetrics {
  readonly metricsId: string;
  readonly completeness: number;
  readonly accuracy: number;
  readonly reliability: number;
  readonly timeliness: number;
  readonly integrity: number;
  readonly authenticity: number;
  readonly auditability: number;
}

// =============================================================================
// Supporting Context Types
// =============================================================================

export interface ExecutionContext {
  readonly contextId: string;
  readonly environment: string;
  readonly timestamp: Date;
  readonly user: string;
  readonly session: string;
  readonly system: string;
  readonly version: string;
}

export interface BusinessContext {
  readonly businessId: string;
  readonly department: string;
  readonly process: string;
  readonly objective: string;
  readonly stakeholders: string[];
  readonly risks: string[];
}

export interface ComplianceContext {
  readonly complianceId: string;
  readonly frameworks: string[];
  readonly requirements: string[];
  readonly controls: string[];
  readonly assessments: string[];
}

export interface EvidenceRequirement {
  readonly requirementId: string;
  readonly type: EvidenceType[];
  readonly minimumQuality: CollectionQualityMetrics;
  readonly retentionPeriod: number;
  readonly preservationStandard: string;
}

export interface ComplianceAssessment {
  readonly assessmentId: string;
  readonly framework: string;
  readonly scope: string[];
  readonly findings: string[];
  readonly score: number;
  readonly recommendations: string[];
}

export interface RiskAssessment {
  readonly assessmentId: string;
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
  readonly factors: string[];
  readonly impact: number;
  readonly probability: number;
  readonly mitigation: string[];
}

export interface AuditMetadata {
  readonly auditId: string;
  readonly auditor: string;
  readonly timestamp: Date;
  readonly scope: string[];
  readonly methodology: string[];
  readonly findings: string[];
}

// =============================================================================
// Conversation Analysis Supporting Types
// =============================================================================

export interface ConversationIntent {
  readonly intentId: string;
  readonly primary: string;
  readonly secondary: string[];
  readonly confidence: number;
  readonly context: string[];
}

export interface ConversationSentiment {
  readonly sentimentId: string;
  readonly overall: 'positive' | 'negative' | 'neutral';
  readonly confidence: number;
  readonly emotional_tone: string[];
  readonly intensity: number;
}

export interface ConversationComplexity {
  readonly complexityId: string;
  readonly level: 'simple' | 'moderate' | 'complex' | 'highly_complex';
  readonly factors: string[];
  readonly score: number;
  readonly indicators: string[];
}

export interface ExtractedEntity {
  readonly entityId: string;
  readonly type: string;
  readonly value: string;
  readonly confidence: number;
  readonly context: string;
  readonly relationships: string[];
}

export interface LanguageMetrics {
  readonly metricsId: string;
  readonly language: string;
  readonly readabilityScore: number;
  readonly sentenceComplexity: number;
  readonly vocabularyLevel: string;
  readonly formalityLevel: string;
}

export interface BehavioralIndicator {
  readonly indicatorId: string;
  readonly type: string;
  readonly value: string;
  readonly confidence: number;
  readonly context: string[];
}

// =============================================================================
// Decision Reasoning Supporting Types
// =============================================================================

export interface ReasoningFactor {
  readonly factorId: string;
  readonly type: string;
  readonly weight: number;
  readonly influence: 'positive' | 'negative' | 'neutral';
  readonly evidence: string[];
  readonly confidence: number;
}

export interface RiskConsideration {
  readonly considerationId: string;
  readonly riskType: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly probability: number;
  readonly impact: string[];
  readonly mitigation: string[];
}

export interface ComplianceCheck {
  readonly checkId: string;
  readonly requirement: string;
  readonly status: 'pass' | 'fail' | 'warning';
  readonly evidence: string[];
  readonly recommendations: string[];
}

export interface BusinessImpactFactor {
  readonly factorId: string;
  readonly category: string;
  readonly impact: 'positive' | 'negative' | 'neutral';
  readonly magnitude: number;
  readonly stakeholders: string[];
  readonly timeframe: string;
}

export interface TechnicalFeasibilityFactor {
  readonly factorId: string;
  readonly aspect: string;
  readonly feasibility: 'high' | 'medium' | 'low';
  readonly complexity: number;
  readonly resources: string[];
  readonly constraints: string[];
}

export interface AlternativeOption {
  readonly optionId: string;
  readonly description: string;
  readonly pros: string[];
  readonly cons: string[];
  readonly feasibility: number;
  readonly riskLevel: string;
}

export interface RiskAcceptance {
  readonly acceptanceId: string;
  readonly approver: string;
  readonly timestamp: Date;
  readonly rationale: string;
  readonly conditions: string[];
  readonly reviewDate: Date;
}

// =============================================================================
// Bypass Supporting Types
// =============================================================================

export interface BypassDuration {
  readonly durationId: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly maxDuration: number;
  readonly extensions: string[];
  readonly notifications: string[];
}

export interface BypassCondition {
  readonly conditionId: string;
  readonly type: string;
  readonly description: string;
  readonly required: boolean;
  readonly status: 'met' | 'not_met' | 'pending';
  readonly evidence: string[];
}

export interface BypassMonitoring {
  readonly monitoringId: string;
  readonly frequency: number;
  readonly metrics: string[];
  readonly alerts: string[];
  readonly dashboard: string;
  readonly reports: string[];
}

export interface RollbackPlan {
  readonly planId: string;
  readonly triggers: string[];
  readonly procedures: string[];
  readonly approvals: string[];
  readonly timeline: number;
  readonly validation: string[];
}

export interface BypassAuditEntry {
  readonly entryId: string;
  readonly timestamp: Date;
  readonly action: string;
  readonly actor: string;
  readonly details: string;
  readonly evidence: string[];
  readonly compliance: string;
}