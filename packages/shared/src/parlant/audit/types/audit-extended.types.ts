/**
 * PARLANT Phase 1 Audit Trail System - Extended Data Models and Schemas
 *
 * Extended audit trail types for specialized tracking, compliance reporting,
 * forensic analysis, and security monitoring.
 *
 * @fileoverview Extended audit data models and schemas
 * @version 1.0.0
 * @author Claude Code - Audit Trail System Agent
 */

import {
  AuditEventId,
  AuditSessionId,
  DatabaseOperationId,
  ComplianceAuditId,
  ForensicEvidenceId,
  AuditEventSeverity,
  ComplianceFramework,
  SensitiveDataType,
  RiskLevel,
} from "./audit-core.types";
import { ParlantValidationResponse } from "../../../types/parlant.types";

// ===========================
// AUDIT PARLANT RESPONSE
// ===========================

/**
 * Audit PARLANT response with comprehensive analysis
 */
export interface AuditParlantResponse {
  /** Original response */
  originalResponse: ParlantValidationResponse;

  /** Response processing */
  responseProcessing: ResponseProcessing;

  /** Decision analysis */
  decisionAnalysis: DecisionAnalysis;

  /** Confidence assessment */
  confidenceAssessment: ConfidenceAssessment;

  /** Response validation */
  responseValidation: ResponseValidation;
}

/**
 * Response processing details
 */
export interface ResponseProcessing {
  /** Processing steps */
  steps: ProcessingStep[];

  /** Response transformation */
  transformation: ResponseTransformation;

  /** Quality assurance checks */
  qualityAssurance: QualityAssuranceCheck[];

  /** Processing metrics */
  processingMetrics: ProcessingMetrics;
}

/**
 * Processing step details
 */
export interface ProcessingStep {
  /** Step identifier */
  stepId: string;

  /** Step name */
  name: string;

  /** Step type */
  type: ProcessingStepType;

  /** Step start time */
  startTime: Date;

  /** Step end time */
  endTime: Date;

  /** Step status */
  status: ProcessingStepStatus;

  /** Step result */
  result: unknown;

  /** Step metadata */
  metadata: Record<string, unknown>;
}

/**
 * Processing step types
 */
export enum ProcessingStepType {
  PARSING = "parsing",
  VALIDATION = "validation",
  TRANSFORMATION = "transformation",
  ENRICHMENT = "enrichment",
  FILTERING = "filtering",
  AGGREGATION = "aggregation",
  NORMALIZATION = "normalization",
  SERIALIZATION = "serialization",
}

/**
 * Processing step status
 */
export enum ProcessingStepStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  SKIPPED = "skipped",
  TIMEOUT = "timeout",
}

/**
 * Response transformation details
 */
export interface ResponseTransformation {
  /** Transformation type */
  type: string;

  /** Input format */
  inputFormat: string;

  /** Output format */
  outputFormat: string;

  /** Transformation rules */
  rules: TransformationRule[];

  /** Transformation timestamp */
  timestamp: Date;
}

/**
 * Transformation rule details
 */
export interface TransformationRule {
  /** Rule identifier */
  ruleId: string;

  /** Rule name */
  name: string;

  /** Rule type */
  type: string;

  /** Rule condition */
  condition: string;

  /** Rule action */
  action: string;

  /** Rule parameters */
  parameters: Record<string, unknown>;
}

/**
 * Quality assurance check details
 */
export interface QualityAssuranceCheck {
  /** Check name */
  name: string;

  /** Check type */
  type: QualityCheckType;

  /** Check result */
  result: QualityCheckResult;

  /** Check score */
  score: number;

  /** Check threshold */
  threshold: number;

  /** Check details */
  details: string;
}

/**
 * Quality check types
 */
export enum QualityCheckType {
  COMPLETENESS = "completeness",
  ACCURACY = "accuracy",
  CONSISTENCY = "consistency",
  RELEVANCE = "relevance",
  TIMELINESS = "timeliness",
  VALIDITY = "validity",
  UNIQUENESS = "uniqueness",
  INTEGRITY = "integrity",
}

/**
 * Quality check results
 */
export enum QualityCheckResult {
  PASSED = "passed",
  FAILED = "failed",
  WARNING = "warning",
  INFORMATION = "information",
  NOT_APPLICABLE = "not_applicable",
}

/**
 * Processing metrics
 */
export interface ProcessingMetrics {
  /** Total processing time */
  totalProcessingTime: number;

  /** Steps completed */
  stepsCompleted: number;

  /** Steps failed */
  stepsFailed: number;

  /** Data volume processed */
  dataVolumeProcessed: number;

  /** Memory usage */
  memoryUsage: number;

  /** CPU usage */
  cpuUsage: number;

  /** I/O operations */
  ioOperations: number;
}

/**
 * Decision analysis details
 */
export interface DecisionAnalysis {
  /** Decision factors */
  decisionFactors: DecisionFactor[];

  /** Decision tree path */
  decisionTreePath: DecisionTreeNode[];

  /** Alternative decisions */
  alternativeDecisions: AlternativeDecision[];

  /** Decision rationale */
  rationale: DecisionRationale;

  /** Decision quality metrics */
  qualityMetrics: DecisionQualityMetrics;
}

/**
 * Decision factor details
 */
export interface DecisionFactor {
  /** Factor name */
  name: string;

  /** Factor category */
  category: DecisionFactorCategory;

  /** Factor weight */
  weight: number;

  /** Factor value */
  value: string | number | boolean | object;

  /** Factor influence */
  influence: InfluenceLevel;

  /** Factor confidence */
  confidence: number;
}

/**
 * Decision factor categories
 */
export enum DecisionFactorCategory {
  SECURITY = "security",
  COMPLIANCE = "compliance",
  RISK = "risk",
  PERFORMANCE = "performance",
  BUSINESS = "business",
  TECHNICAL = "technical",
  USER = "user",
  CONTEXTUAL = "contextual",
}

/**
 * Influence levels
 */
export enum InfluenceLevel {
  NEGLIGIBLE = "negligible",
  LOW = "low",
  MODERATE = "moderate",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Decision tree node
 */
export interface DecisionTreeNode {
  /** Node identifier */
  nodeId: string;

  /** Node type */
  type: DecisionNodeType;

  /** Node condition */
  condition: string;

  /** Node decision */
  decision: string;

  /** Child nodes */
  children: string[];

  /** Node metadata */
  metadata: Record<string, unknown>;
}

/**
 * Decision node types
 */
export enum DecisionNodeType {
  ROOT = "root",
  CONDITION = "condition",
  DECISION = "decision",
  LEAF = "leaf",
}

/**
 * Alternative decision
 */
export interface AlternativeDecision {
  /** Decision identifier */
  decisionId: string;

  /** Decision name */
  name: string;

  /** Decision type */
  type: string;

  /** Decision probability */
  probability: number;

  /** Decision impact */
  impact: ImpactAssessment;

  /** Decision rationale */
  rationale: string;
}

/**
 * Impact assessment
 */
export interface ImpactAssessment {
  /** Security impact */
  securityImpact: ImpactLevel;

  /** Compliance impact */
  complianceImpact: ImpactLevel;

  /** Performance impact */
  performanceImpact: ImpactLevel;

  /** Business impact */
  businessImpact: ImpactLevel;

  /** User impact */
  userImpact: ImpactLevel;
}

/**
 * Impact levels
 */
export enum ImpactLevel {
  MINIMAL = "minimal",
  LOW = "low",
  MODERATE = "moderate",
  HIGH = "high",
  SEVERE = "severe",
  CATASTROPHIC = "catastrophic",
}

/**
 * Decision rationale
 */
export interface DecisionRationale {
  /** Primary reasoning */
  primaryReasoning: string;

  /** Supporting evidence */
  supportingEvidence: EvidenceItem[];

  /** Risk considerations */
  riskConsiderations: string[];

  /** Compliance considerations */
  complianceConsiderations: string[];

  /** Business justification */
  businessJustification: string;

  /** Technical considerations */
  technicalConsiderations: string[];
}

/**
 * Evidence item
 */
export interface EvidenceItem {
  /** Evidence identifier */
  evidenceId: string;

  /** Evidence type */
  type: EvidenceType;

  /** Evidence source */
  source: string;

  /** Evidence content */
  content: string;

  /** Evidence reliability */
  reliability: ReliabilityLevel;

  /** Evidence timestamp */
  timestamp: Date;
}

/**
 * Evidence types
 */
export enum EvidenceType {
  HISTORICAL_DATA = "historical_data",
  STATISTICAL_ANALYSIS = "statistical_analysis",
  EXPERT_OPINION = "expert_opinion",
  POLICY_REFERENCE = "policy_reference",
  TECHNICAL_ANALYSIS = "technical_analysis",
  USER_FEEDBACK = "user_feedback",
  SYSTEM_METRICS = "system_metrics",
  THIRD_PARTY_VALIDATION = "third_party_validation",
}

/**
 * Reliability levels
 */
export enum ReliabilityLevel {
  VERY_LOW = "very_low",
  LOW = "low",
  MODERATE = "moderate",
  HIGH = "high",
  VERY_HIGH = "very_high",
  ABSOLUTE = "absolute",
}

/**
 * Decision quality metrics
 */
export interface DecisionQualityMetrics {
  /** Overall quality score */
  overallQualityScore: number;

  /** Accuracy score */
  accuracyScore: number;

  /** Consistency score */
  consistencyScore: number;

  /** Completeness score */
  completenessScore: number;

  /** Timeliness score */
  timelinessScore: number;

  /** Transparency score */
  transparencyScore: number;
}

/**
 * Confidence assessment
 */
export interface ConfidenceAssessment {
  /** Overall confidence level */
  overallConfidence: number;

  /** Confidence factors */
  confidenceFactors: ConfidenceFactor[];

  /** Uncertainty analysis */
  uncertaintyAnalysis: UncertaintyAnalysis;

  /** Confidence history */
  confidenceHistory: ConfidenceHistoryEntry[];
}

/**
 * Confidence factor
 */
export interface ConfidenceFactor {
  /** Factor name */
  name: string;

  /** Factor category */
  category: ConfidenceFactorCategory;

  /** Factor value */
  value: number;

  /** Factor weight */
  weight: number;

  /** Factor description */
  description: string;
}

/**
 * Confidence factor categories
 */
export enum ConfidenceFactorCategory {
  DATA_QUALITY = "data_quality",
  MODEL_PERFORMANCE = "model_performance",
  HISTORICAL_ACCURACY = "historical_accuracy",
  DOMAIN_EXPERTISE = "domain_expertise",
  CONTEXTUAL_RELEVANCE = "contextual_relevance",
  VALIDATION_COVERAGE = "validation_coverage",
}

/**
 * Uncertainty analysis
 */
export interface UncertaintyAnalysis {
  /** Uncertainty sources */
  uncertaintySources: UncertaintySource[];

  /** Uncertainty quantification */
  uncertaintyQuantification: UncertaintyQuantification;

  /** Mitigation strategies */
  mitigationStrategies: string[];

  /** Sensitivity analysis */
  sensitivityAnalysis: SensitivityAnalysis;
}

/**
 * Uncertainty source
 */
export interface UncertaintySource {
  /** Source name */
  name: string;

  /** Source type */
  type: UncertaintySourceType;

  /** Uncertainty level */
  uncertaintyLevel: number;

  /** Impact on decision */
  impactOnDecision: ImpactLevel;

  /** Mitigation possible */
  mitigationPossible: boolean;
}

/**
 * Uncertainty source types
 */
export enum UncertaintySourceType {
  DATA_INCOMPLETE = "data_incomplete",
  DATA_INACCURATE = "data_inaccurate",
  MODEL_LIMITATION = "model_limitation",
  ENVIRONMENTAL_CHANGE = "environmental_change",
  HUMAN_FACTOR = "human_factor",
  SYSTEM_VARIABILITY = "system_variability",
  EXTERNAL_DEPENDENCY = "external_dependency",
}

/**
 * Uncertainty quantification
 */
export interface UncertaintyQuantification {
  /** Uncertainty distribution */
  uncertaintyDistribution: DistributionParameters;

  /** Confidence intervals */
  confidenceIntervals: ConfidenceInterval[];

  /** Monte Carlo simulation */
  monteCarloSimulation?: MonteCarloResults;

  /** Bayesian analysis */
  bayesianAnalysis?: BayesianAnalysisResults;
}

/**
 * Distribution parameters
 */
export interface DistributionParameters {
  /** Distribution type */
  type: DistributionType;

  /** Distribution parameters */
  parameters: Record<string, number>;

  /** Sample size */
  sampleSize: number;

  /** Goodness of fit */
  goodnessOfFit: number;
}

/**
 * Distribution types
 */
export enum DistributionType {
  NORMAL = "normal",
  UNIFORM = "uniform",
  EXPONENTIAL = "exponential",
  BETA = "beta",
  GAMMA = "gamma",
  POISSON = "poisson",
  BINOMIAL = "binomial",
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

  /** Interval width */
  intervalWidth: number;
}

/**
 * Monte Carlo simulation results
 */
export interface MonteCarloResults {
  /** Number of simulations */
  numberOfSimulations: number;

  /** Mean result */
  meanResult: number;

  /** Standard deviation */
  standardDeviation: number;

  /** Percentiles */
  percentiles: Record<string, number>;

  /** Convergence analysis */
  convergenceAnalysis: ConvergenceAnalysis;
}

/**
 * Convergence analysis
 */
export interface ConvergenceAnalysis {
  /** Converged */
  converged: boolean;

  /** Convergence iterations */
  convergenceIterations: number;

  /** Convergence threshold */
  convergenceThreshold: number;

  /** Final error */
  finalError: number;
}

/**
 * Bayesian analysis results
 */
export interface BayesianAnalysisResults {
  /** Prior distribution */
  priorDistribution: DistributionParameters;

  /** Likelihood function */
  likelihoodFunction: string;

  /** Posterior distribution */
  posteriorDistribution: DistributionParameters;

  /** Bayes factor */
  bayesFactor: number;

  /** Model evidence */
  modelEvidence: number;
}

/**
 * Sensitivity analysis
 */
export interface SensitivityAnalysis {
  /** Sensitivity measures */
  sensitivityMeasures: SensitivityMeasure[];

  /** Parameter importance */
  parameterImportance: ParameterImportance[];

  /** Interaction effects */
  interactionEffects: InteractionEffect[];

  /** Robustness assessment */
  robustnessAssessment: RobustnessAssessment;
}

/**
 * Sensitivity measure
 */
export interface SensitivityMeasure {
  /** Parameter name */
  parameterName: string;

  /** Sensitivity coefficient */
  sensitivityCoefficient: number;

  /** Elasticity */
  elasticity: number;

  /** Partial derivative */
  partialDerivative: number;

  /** Variance contribution */
  varianceContribution: number;
}

/**
 * Parameter importance
 */
export interface ParameterImportance {
  /** Parameter name */
  parameterName: string;

  /** Importance score */
  importanceScore: number;

  /** Ranking */
  ranking: number;

  /** Confidence in ranking */
  confidenceInRanking: number;
}

/**
 * Interaction effect
 */
export interface InteractionEffect {
  /** Parameter 1 */
  parameter1: string;

  /** Parameter 2 */
  parameter2: string;

  /** Interaction strength */
  interactionStrength: number;

  /** Effect type */
  effectType: InteractionEffectType;

  /** Statistical significance */
  statisticalSignificance: number;
}

/**
 * Interaction effect types
 */
export enum InteractionEffectType {
  SYNERGISTIC = "synergistic",
  ANTAGONISTIC = "antagonistic",
  MULTIPLICATIVE = "multiplicative",
  ADDITIVE = "additive",
  CONDITIONAL = "conditional",
}

/**
 * Robustness assessment
 */
export interface RobustnessAssessment {
  /** Overall robustness score */
  overallRobustnessScore: number;

  /** Stress test results */
  stressTestResults: StressTestResult[];

  /** Boundary analysis */
  boundaryAnalysis: BoundaryAnalysis;

  /** Failure modes */
  failureModes: FailureMode[];
}

/**
 * Stress test result
 */
export interface StressTestResult {
  /** Test name */
  testName: string;

  /** Test type */
  testType: StressTestType;

  /** Test parameters */
  testParameters: Record<string, unknown>;

  /** Test result */
  testResult: StressTestOutcome;

  /** Failure threshold */
  failureThreshold: number;

  /** Performance degradation */
  performanceDegradation: number;
}

/**
 * Stress test types
 */
export enum StressTestType {
  LOAD_TESTING = "load_testing",
  VOLUME_TESTING = "volume_testing",
  SPIKE_TESTING = "spike_testing",
  ENDURANCE_TESTING = "endurance_testing",
  BOUNDARY_TESTING = "boundary_testing",
  CHAOS_TESTING = "chaos_testing",
}

/**
 * Stress test outcomes
 */
export enum StressTestOutcome {
  PASSED = "passed",
  FAILED = "failed",
  DEGRADED = "degraded",
  UNSTABLE = "unstable",
  TIMEOUT = "timeout",
  ERROR = "error",
}

/**
 * Boundary analysis
 */
export interface BoundaryAnalysis {
  /** Operating boundaries */
  operatingBoundaries: OperatingBoundary[];

  /** Boundary violations */
  boundaryViolations: BoundaryViolation[];

  /** Safety margins */
  safetyMargins: SafetyMargin[];
}

/**
 * Operating boundary
 */
export interface OperatingBoundary {
  /** Parameter name */
  parameterName: string;

  /** Minimum value */
  minimumValue: number;

  /** Maximum value */
  maximumValue: number;

  /** Optimal range */
  optimalRange: [number, number];

  /** Boundary type */
  boundaryType: BoundaryType;
}

/**
 * Boundary types
 */
export enum BoundaryType {
  HARD_LIMIT = "hard_limit",
  SOFT_LIMIT = "soft_limit",
  RECOMMENDED_RANGE = "recommended_range",
  PERFORMANCE_BOUNDARY = "performance_boundary",
  SAFETY_BOUNDARY = "safety_boundary",
}

/**
 * Boundary violation
 */
export interface BoundaryViolation {
  /** Parameter name */
  parameterName: string;

  /** Violation type */
  violationType: BoundaryViolationType;

  /** Violation severity */
  violationSeverity: AuditEventSeverity;

  /** Violation value */
  violationValue: number;

  /** Expected range */
  expectedRange: [number, number];

  /** Violation timestamp */
  timestamp: Date;
}

/**
 * Boundary violation types
 */
export enum BoundaryViolationType {
  EXCEEDS_MAXIMUM = "exceeds_maximum",
  BELOW_MINIMUM = "below_minimum",
  OUTSIDE_OPTIMAL_RANGE = "outside_optimal_range",
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  RESOURCE_EXHAUSTED = "resource_exhausted",
}

/**
 * Safety margin
 */
export interface SafetyMargin {
  /** Parameter name */
  parameterName: string;

  /** Current value */
  currentValue: number;

  /** Safety threshold */
  safetyThreshold: number;

  /** Margin percentage */
  marginPercentage: number;

  /** Margin adequacy */
  marginAdequacy: MarginAdequacy;
}

/**
 * Margin adequacy levels
 */
export enum MarginAdequacy {
  EXCESSIVE = "excessive",
  ADEQUATE = "adequate",
  MINIMAL = "minimal",
  INSUFFICIENT = "insufficient",
  CRITICAL = "critical",
}

/**
 * Failure mode
 */
export interface FailureMode {
  /** Failure mode name */
  name: string;

  /** Failure type */
  type: FailureType;

  /** Failure probability */
  probability: number;

  /** Failure impact */
  impact: ImpactLevel;

  /** Detection methods */
  detectionMethods: string[];

  /** Mitigation strategies */
  mitigationStrategies: string[];

  /** Recovery procedures */
  recoveryProcedures: string[];
}

/**
 * Failure types
 */
export enum FailureType {
  HARDWARE_FAILURE = "hardware_failure",
  SOFTWARE_FAILURE = "software_failure",
  NETWORK_FAILURE = "network_failure",
  DATA_CORRUPTION = "data_corruption",
  SECURITY_BREACH = "security_breach",
  HUMAN_ERROR = "human_error",
  EXTERNAL_DEPENDENCY = "external_dependency",
  RESOURCE_EXHAUSTION = "resource_exhaustion",
}

/**
 * Confidence history entry
 */
export interface ConfidenceHistoryEntry {
  /** Timestamp */
  timestamp: Date;

  /** Confidence level */
  confidenceLevel: number;

  /** Change reason */
  changeReason: string;

  /** Contributing factors */
  contributingFactors: string[];

  /** Impact on decision */
  impactOnDecision: ImpactLevel;
}

/**
 * Response validation
 */
export interface ResponseValidation {
  /** Validation passed */
  validationPassed: boolean;

  /** Schema validation */
  schemaValidation: ResponseSchemaValidation;

  /** Content validation */
  contentValidation: ResponseContentValidation;

  /** Consistency validation */
  consistencyValidation: ResponseConsistencyValidation;

  /** Completeness validation */
  completenessValidation: ResponseCompletenessValidation;
}

/**
 * Response schema validation
 */
export interface ResponseSchemaValidation {
  /** Schema valid */
  schemaValid: boolean;

  /** Schema version */
  schemaVersion: string;

  /** Validation errors */
  validationErrors: ResponseValidationError[];

  /** Validation warnings */
  validationWarnings: ResponseValidationWarning[];
}

/**
 * Response validation error
 */
export interface ResponseValidationError {
  /** Error code */
  errorCode: string;

  /** Error message */
  errorMessage: string;

  /** Field path */
  fieldPath: string;

  /** Error severity */
  severity: AuditEventSeverity;

  /** Suggested fix */
  suggestedFix: string;
}

/**
 * Response validation warning
 */
export interface ResponseValidationWarning {
  /** Warning code */
  warningCode: string;

  /** Warning message */
  warningMessage: string;

  /** Field path */
  fieldPath: string;

  /** Recommended action */
  recommendedAction: string;
}

/**
 * Response content validation
 */
export interface ResponseContentValidation {
  /** Content valid */
  contentValid: boolean;

  /** Content checks */
  contentChecks: ContentCheck[];

  /** Quality score */
  qualityScore: number;

  /** Content analysis */
  contentAnalysis: ContentAnalysis;
}

/**
 * Content check
 */
export interface ContentCheck {
  /** Check name */
  checkName: string;

  /** Check type */
  checkType: ContentCheckType;

  /** Check result */
  checkResult: boolean;

  /** Check score */
  checkScore: number;

  /** Check details */
  checkDetails: string;
}

/**
 * Content check types
 */
export enum ContentCheckType {
  RELEVANCE = "relevance",
  ACCURACY = "accuracy",
  COMPLETENESS = "completeness",
  CLARITY = "clarity",
  CONSISTENCY = "consistency",
  APPROPRIATENESS = "appropriateness",
  BIAS_DETECTION = "bias_detection",
  SENTIMENT_ANALYSIS = "sentiment_analysis",
}

/**
 * Content analysis
 */
export interface ContentAnalysis {
  /** Word count */
  wordCount: number;

  /** Readability score */
  readabilityScore: number;

  /** Sentiment score */
  sentimentScore: number;

  /** Bias indicators */
  biasIndicators: BiasIndicator[];

  /** Topic classification */
  topicClassification: TopicClassification[];

  /** Language analysis */
  languageAnalysis: LanguageAnalysis;
}

/**
 * Bias indicator
 */
export interface BiasIndicator {
  /** Bias type */
  biasType: BiasType;

  /** Confidence score */
  confidence: number;

  /** Evidence text */
  evidenceText: string;

  /** Mitigation suggestion */
  mitigationSuggestion: string;
}

/**
 * Bias types
 */
export enum BiasType {
  GENDER_BIAS = "gender_bias",
  RACIAL_BIAS = "racial_bias",
  AGE_BIAS = "age_bias",
  CULTURAL_BIAS = "cultural_bias",
  CONFIRMATION_BIAS = "confirmation_bias",
  SELECTION_BIAS = "selection_bias",
  ANCHORING_BIAS = "anchoring_bias",
}

/**
 * Topic classification
 */
export interface TopicClassification {
  /** Topic name */
  topicName: string;

  /** Confidence score */
  confidence: number;

  /** Topic category */
  category: string;

  /** Keywords */
  keywords: string[];
}

/**
 * Language analysis
 */
export interface LanguageAnalysis {
  /** Detected language */
  detectedLanguage: string;

  /** Language confidence */
  languageConfidence: number;

  /** Grammar score */
  grammarScore: number;

  /** Spelling errors */
  spellingErrors: SpellingError[];

  /** Style issues */
  styleIssues: StyleIssue[];
}

/**
 * Spelling error
 */
export interface SpellingError {
  /** Misspelled word */
  misspelledWord: string;

  /** Suggested correction */
  suggestedCorrection: string;

  /** Position in text */
  position: number;

  /** Context */
  context: string;
}

/**
 * Style issue
 */
export interface StyleIssue {
  /** Issue type */
  issueType: StyleIssueType;

  /** Issue description */
  description: string;

  /** Suggestion */
  suggestion: string;

  /** Severity */
  severity: AuditEventSeverity;
}

/**
 * Style issue types
 */
export enum StyleIssueType {
  PASSIVE_VOICE = "passive_voice",
  WORDINESS = "wordiness",
  UNCLEAR_REFERENCE = "unclear_reference",
  INCONSISTENT_TERMINOLOGY = "inconsistent_terminology",
  INAPPROPRIATE_TONE = "inappropriate_tone",
  POOR_STRUCTURE = "poor_structure",
}

/**
 * Response consistency validation
 */
export interface ResponseConsistencyValidation {
  /** Consistency valid */
  consistencyValid: boolean;

  /** Historical consistency */
  historicalConsistency: HistoricalConsistencyCheck;

  /** Internal consistency */
  internalConsistency: InternalConsistencyCheck;

  /** Cross-reference consistency */
  crossReferenceConsistency: CrossReferenceConsistencyCheck;
}

/**
 * Historical consistency check
 */
export interface HistoricalConsistencyCheck {
  /** Consistency score */
  consistencyScore: number;

  /** Similar cases */
  similarCases: SimilarCase[];

  /** Deviation analysis */
  deviationAnalysis: DeviationAnalysis;

  /** Trend analysis */
  trendAnalysis: TrendAnalysis;
}

/**
 * Similar case
 */
export interface SimilarCase {
  /** Case identifier */
  caseId: string;

  /** Similarity score */
  similarityScore: number;

  /** Case outcome */
  caseOutcome: string;

  /** Case timestamp */
  timestamp: Date;

  /** Difference analysis */
  differenceAnalysis: string[];
}

/**
 * Deviation analysis
 */
export interface DeviationAnalysis {
  /** Deviation detected */
  deviationDetected: boolean;

  /** Deviation magnitude */
  deviationMagnitude: number;

  /** Deviation reasons */
  deviationReasons: string[];

  /** Acceptability assessment */
  acceptabilityAssessment: AcceptabilityLevel;
}

/**
 * Acceptability levels
 */
export enum AcceptabilityLevel {
  FULLY_ACCEPTABLE = "fully_acceptable",
  ACCEPTABLE = "acceptable",
  QUESTIONABLE = "questionable",
  UNACCEPTABLE = "unacceptable",
  HIGHLY_CONCERNING = "highly_concerning",
}

/**
 * Trend analysis
 */
export interface TrendAnalysis {
  /** Trend direction */
  trendDirection: TrendDirection;

  /** Trend strength */
  trendStrength: number;

  /** Trend significance */
  trendSignificance: number;

  /** Forecast accuracy */
  forecastAccuracy: number;

  /** Trend indicators */
  trendIndicators: TrendIndicator[];
}

/**
 * Trend directions
 */
export enum TrendDirection {
  INCREASING = "increasing",
  DECREASING = "decreasing",
  STABLE = "stable",
  CYCLICAL = "cyclical",
  VOLATILE = "volatile",
  UNKNOWN = "unknown",
}

/**
 * Trend indicator
 */
export interface TrendIndicator {
  /** Indicator name */
  name: string;

  /** Indicator value */
  value: number;

  /** Indicator change */
  change: number;

  /** Indicator significance */
  significance: number;
}

/**
 * Internal consistency check
 */
export interface InternalConsistencyCheck {
  /** Consistency score */
  consistencyScore: number;

  /** Logic checks */
  logicChecks: LogicCheck[];

  /** Contradiction detection */
  contradictionDetection: ContradictionDetection;

  /** Coherence analysis */
  coherenceAnalysis: CoherenceAnalysis;
}

/**
 * Logic check
 */
export interface LogicCheck {
  /** Check name */
  checkName: string;

  /** Check result */
  checkResult: boolean;

  /** Check details */
  checkDetails: string;

  /** Error level */
  errorLevel: AuditEventSeverity;
}

/**
 * Contradiction detection
 */
export interface ContradictionDetection {
  /** Contradictions found */
  contradictionsFound: Contradiction[];

  /** Overall consistency */
  overallConsistency: number;

  /** Resolution suggestions */
  resolutionSuggestions: string[];
}

/**
 * Contradiction
 */
export interface Contradiction {
  /** Contradiction type */
  type: ContradictionType;

  /** Conflicting statements */
  conflictingStatements: string[];

  /** Severity */
  severity: AuditEventSeverity;

  /** Resolution priority */
  resolutionPriority: number;
}

/**
 * Contradiction types
 */
export enum ContradictionType {
  LOGICAL_CONTRADICTION = "logical_contradiction",
  FACTUAL_CONTRADICTION = "factual_contradiction",
  TEMPORAL_CONTRADICTION = "temporal_contradiction",
  CAUSAL_CONTRADICTION = "causal_contradiction",
  DEFINITIONAL_CONTRADICTION = "definitional_contradiction",
}

/**
 * Coherence analysis
 */
export interface CoherenceAnalysis {
  /** Coherence score */
  coherenceScore: number;

  /** Coherence factors */
  coherenceFactors: CoherenceFactor[];

  /** Cohesion analysis */
  cohesionAnalysis: CohesionAnalysis;

  /** Flow analysis */
  flowAnalysis: FlowAnalysis;
}

/**
 * Coherence factor
 */
export interface CoherenceFactor {
  /** Factor name */
  factorName: string;

  /** Factor score */
  factorScore: number;

  /** Factor weight */
  factorWeight: number;

  /** Factor description */
  factorDescription: string;
}

/**
 * Cohesion analysis
 */
export interface CohesionAnalysis {
  /** Cohesion score */
  cohesionScore: number;

  /** Lexical cohesion */
  lexicalCohesion: number;

  /** Grammatical cohesion */
  grammaticalCohesion: number;

  /** Semantic cohesion */
  semanticCohesion: number;
}

/**
 * Flow analysis
 */
export interface FlowAnalysis {
  /** Flow score */
  flowScore: number;

  /** Transition quality */
  transitionQuality: number;

  /** Information ordering */
  informationOrdering: number;

  /** Logical progression */
  logicalProgression: number;
}

/**
 * Cross-reference consistency check
 */
export interface CrossReferenceConsistencyCheck {
  /** Consistency score */
  consistencyScore: number;

  /** External references */
  externalReferences: ExternalReference[];

  /** Reference validation */
  referenceValidation: ReferenceValidation[];

  /** Citation analysis */
  citationAnalysis: CitationAnalysis;
}

/**
 * External reference
 */
export interface ExternalReference {
  /** Reference identifier */
  referenceId: string;

  /** Reference type */
  referenceType: ReferenceType;

  /** Reference source */
  source: string;

  /** Reference validity */
  validity: ReferenceValidity;

  /** Reference relevance */
  relevance: number;
}

/**
 * Reference types
 */
export enum ReferenceType {
  ACADEMIC_PAPER = "academic_paper",
  TECHNICAL_DOCUMENTATION = "technical_documentation",
  POLICY_DOCUMENT = "policy_document",
  LEGAL_STATUTE = "legal_statute",
  INDUSTRY_STANDARD = "industry_standard",
  INTERNAL_DOCUMENT = "internal_document",
  WEB_RESOURCE = "web_resource",
}

/**
 * Reference validity
 */
export enum ReferenceValidity {
  VALID = "valid",
  INVALID = "invalid",
  QUESTIONABLE = "questionable",
  UNVERIFIABLE = "unverifiable",
  OUTDATED = "outdated",
}

/**
 * Reference validation
 */
export interface ReferenceValidation {
  /** Reference identifier */
  referenceId: string;

  /** Validation result */
  validationResult: ReferenceValidity;

  /** Validation method */
  validationMethod: string;

  /** Validation timestamp */
  validationTimestamp: Date;

  /** Validation details */
  validationDetails: string;
}

/**
 * Citation analysis
 */
export interface CitationAnalysis {
  /** Citation accuracy */
  citationAccuracy: number;

  /** Citation completeness */
  citationCompleteness: number;

  /** Citation style consistency */
  citationStyleConsistency: number;

  /** Citation relevance */
  citationRelevance: number;
}

/**
 * Response completeness validation
 */
export interface ResponseCompletenessValidation {
  /** Completeness score */
  completenessScore: number;

  /** Required elements */
  requiredElements: RequiredElement[];

  /** Missing elements */
  missingElements: MissingElement[];

  /** Optional elements */
  optionalElements: OptionalElement[];
}

/**
 * Required element
 */
export interface RequiredElement {
  /** Element name */
  elementName: string;

  /** Element present */
  present: boolean;

  /** Element quality */
  quality: number;

  /** Element completeness */
  completeness: number;
}

/**
 * Missing element
 */
export interface MissingElement {
  /** Element name */
  elementName: string;

  /** Element importance */
  importance: ImportanceLevel;

  /** Impact of absence */
  impactOfAbsence: ImpactLevel;

  /** Suggested action */
  suggestedAction: string;
}

/**
 * Importance levels
 */
export enum ImportanceLevel {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  OPTIONAL = "optional",
}

/**
 * Optional element
 */
export interface OptionalElement {
  /** Element name */
  elementName: string;

  /** Element present */
  present: boolean;

  /** Element value */
  value: number;

  /** Element recommendation */
  recommendation: string;
}

export * from "./audit-extended.types";
