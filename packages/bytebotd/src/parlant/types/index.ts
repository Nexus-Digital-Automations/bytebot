/**
 * Parlant Types Index
 *
 * Central export point for all Parlant integration type definitions.
 * Provides comprehensive TypeScript type safety for Parlant conversational AI
 * validation, compliance, evidence management, and enterprise security.
 *
 * @module ParlantTypesIndex
 * @version 1.0.0
 * @author Claude Code (Parlant Integration Specialist)
 * @since Parlant TypeScript Types Implementation
 */

// =============================================================================
// Core Parlant Integration Types - Simple Implementation
// =============================================================================

export type {
  // Core validation types
  ParlantValidationSession,
  ParlantConversationContext,
  ConversationEntry,
  ParlantValidationRequest,
  ParlantValidationResponse,
  ConversationAnalysis,
  DecisionReasoning,
  BypassInfo,

  // Audit and compliance
  AuditParlantResponse,
  ComplianceMetadata,
  ComplianceClassification,
  RegulatoryNotification,

  // Evidence management
  EvidenceItem,
  EvidenceIntegrityVerification,
  LegalMetadata,
  PreservationMetadata,
  ExpertWitnessAssignment,
  DigitalSignature,
  ChainOfCustodyEntry,
  EvidenceMetadata,

  // Collection and analysis
  CollectionTool,
  CollectionCertification,
  CollectionQualityMetrics,

  // Supporting types
  ExecutionContext,
  BusinessContext,
  ComplianceContext,
  EvidenceRequirement,
  ComplianceAssessment,
  RiskAssessment,
  AuditMetadata,
  ConversationIntent,
  ConversationSentiment,
  ConversationComplexity,
  ExtractedEntity,
  LanguageMetrics,
  BehavioralIndicator,
  ReasoningFactor,
  RiskConsideration,
  ComplianceCheck,
  BusinessImpactFactor,
  TechnicalFeasibilityFactor,
  AlternativeOption,
  RiskAcceptance,
  BypassDuration,
  BypassCondition,
  BypassMonitoring,
  RollbackPlan,
  BypassAuditEntry,
} from './simple-parlant.types';

// Evidence type enum
export { EvidenceType } from './simple-parlant.types';

// Import evidence enum for default export
import { EvidenceType as EvidenceTypeImport } from './simple-parlant.types';

// =============================================================================
// Default Export
// =============================================================================

/**
 * Default export with commonly used enums
 */
export default {
  // Enums
  EvidenceType: EvidenceTypeImport,
} as const;
