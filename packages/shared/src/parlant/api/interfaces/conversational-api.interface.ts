/**
 * @fileoverview Comprehensive Conversational API Interface Definitions
 * Enterprise-grade API integration patterns for natural language control
 * with 10,000+ requests/second throughput support
 *
 * @version 1.0.0
 * @author AIgent Enterprise API Team
 * @since 2025-09-21
 */

export interface UserContext {
  userId: string;
  username: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
  profile: UserProfile;
  preferences: UserPreferences;
  capabilities: string[];
  timezone: string;
  sessionId: string;
  deviceId: string;
  recentConversations: ConversationHistory[];
  datePreferences: DatePreferences;
  notificationPreferences: NotificationPreferences;
}

export interface UserProfile {
  technicalLevel: 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  role: string;
  department: string;
  capabilities: UserCapability[];
}

export interface UserPreferences {
  explanationStyle: 'BRIEF' | 'DETAILED' | 'TECHNICAL';
  includeExamples: boolean;
  includeVisualAids: boolean;
  includeTechnicalDetails: boolean;
  monitoringPreferences: MonitoringPreferences;
}

export interface UserCapability {
  domain: string;
  level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  certifications: string[];
}

export interface MonitoringPreferences {
  technicalDetailLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  updateFrequency: 'REAL_TIME' | 'PERIODIC' | 'ON_DEMAND';
  alertThresholds: AlertThreshold[];
}

export interface AlertThreshold {
  metric: string;
  threshold: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ConversationHistory {
  conversationId: string;
  timestamp: Date;
  intent: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'CANCELLED';
  duration: number;
}

export interface DatePreferences {
  format: string;
  timezone: string;
  calendarType: 'GREGORIAN' | 'FISCAL' | 'CUSTOM';
}

export interface NotificationPreferences {
  channels: NotificationChannel[];
  frequency: 'IMMEDIATE' | 'BATCHED' | 'DAILY_SUMMARY';
  quietHours: TimeRange;
}

export interface NotificationChannel {
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'WEBHOOK';
  address: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface TimeRange {
  startTime: string;
  endTime: string;
  timezone: string;
}

// API Request and Response Interfaces

export interface APIRequest {
  id: string;
  method: string;
  endpoint: string;
  parameters: Record<string, any>;
  headers: Record<string, string>;
  userContext: UserContext;
  authContext: AuthContext;
  sourceContext: SourceContext;
  operation: APIOperation;
  resource: string;
  deviceId: string;
  deviceFingerprint: string;
  deviceLocation: GeographicLocation;
  sourceIP: string;
  networkLocation: string;
  vpnStatus: VPNStatus;
  size: number;
  contentType: string;
  securityLevel: SecurityLevel;
}

export interface AuthContext {
  method: AuthMethod;
  mfaCompleted: boolean;
  sessionId: string;
  sessionAge: number;
  authenticationMethod: string;
  multiFactorCompleted: boolean;
}

export interface SourceContext {
  ipAddress: string;
  userAgent: string;
  deviceId: string;
  geolocation?: GeographicLocation;
}

export interface GeographicLocation {
  latitude: number;
  longitude: number;
  country: string;
  region: string;
  city: string;
}

export interface VPNStatus {
  isUsingVPN: boolean;
  vpnProvider?: string;
  exitLocation?: GeographicLocation;
}

export type SecurityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AuthMethod = 'PASSWORD' | 'MFA' | 'SSO' | 'CERTIFICATE' | 'BIOMETRIC';

export interface APIOperation {
  type: string;
  id: string;
  name: string;
  description: string;
  baselineExecutionTime: number;
  currentState: OperationState;
  progress: OperationProgress;
  userContext: UserContext;
}

export interface OperationState {
  phase: 'VALIDATION' | 'EXECUTION' | 'COMPLETION' | 'ERROR';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startTime: Date;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
}

export interface OperationProgress {
  percentage: number;
  estimatedTimeRemaining: number;
  currentActivity: string;
  milestones: ProgressMilestone[];
}

export interface ProgressMilestone {
  name: string;
  completed: boolean;
  timestamp?: Date;
  duration?: number;
}

// Conversational Validation Interfaces

export interface ConversationalPreExecutionValidator {
  analyzeUserIntent(naturalLanguageRequest: string, context: UserContext): Promise<IntentAnalysis>;
  validateIntentAgainstCapabilities(intent: IntentAnalysis, apiCapabilities: APICapabilities): Promise<CapabilityValidation>;
  negotiateParameters(intent: IntentAnalysis, apiSchema: APISchema): Promise<ParameterNegotiation>;
  clarifyAmbiguousParameters(ambiguities: ParameterAmbiguity[]): Promise<ParameterClarification>;
  assessOperationRisks(intent: IntentAnalysis, parameters: ResolvedParameters): Promise<RiskAssessment>;
  requestUserConfirmation(risks: Risk[], operation: PlannedOperation): Promise<UserConfirmation>;
}

export interface IntentAnalysis {
  primaryIntent: string;
  confidence: number;
  alternativeInterpretations: IntentInterpretation[];
  clarifyingQuestions: string[];
  conversationId: string;
  explanation: string;
  alternatives: IntentInterpretation[];
}

export interface IntentInterpretation {
  intent: string;
  confidence: number;
  reasoning: string;
  parameters: Record<string, any>;
}

export interface APICapabilities {
  supportedOperations: APIOperation[];
  getCapabilitiesSummary(): CapabilitiesSummary;
}

export interface CapabilitiesSummary {
  totalOperations: number;
  categories: OperationCategory[];
  securityLevels: SecurityLevel[];
  averageResponseTime: number;
}

export interface OperationCategory {
  name: string;
  operationCount: number;
  description: string;
}

export interface CapabilityValidation {
  isSupported: boolean;
  matchingCapabilities: APIOperation[];
  recommendations: CapabilityRecommendation[];
  alternatives: APIOperation[];
}

export interface CapabilityRecommendation {
  operation: APIOperation;
  confidence: number;
  reasoning: string;
  requiredModifications: string[];
}

export interface APISchema {
  required: string[];
  properties: Record<string, ParameterSchema>;
  businessRules?: BusinessRule[];
}

export interface ParameterSchema {
  type: ParameterType;
  description: string;
  validation: ValidationRule[];
  businessRules?: BusinessRule[];
}

export type ParameterType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

export interface ValidationRule {
  type: 'REQUIRED' | 'MIN_LENGTH' | 'MAX_LENGTH' | 'PATTERN' | 'RANGE' | 'CUSTOM';
  value?: any;
  message: string;
}

export interface BusinessRule {
  id: string;
  description: string;
  condition: string;
  action: string;
  severity: 'WARNING' | 'ERROR' | 'BLOCKING';
}

export interface ParameterNegotiation {
  resolvedParameters: Record<string, any>;
  resolvedMethod: string;
  negotiationSteps: NegotiationStep[];
  parameterConfidence: number;
}

export interface NegotiationStep {
  stepType: 'MISSING_PARAMETER' | 'AMBIGUOUS_VALUE' | 'VALIDATION_ERROR' | 'USER_INPUT';
  parameter: string;
  userInput: string;
  resolution: string;
  timestamp: Date;
}

export interface ParameterAmbiguity {
  parameter: string;
  providedValue: any;
  possibleInterpretations: ValueInterpretation[];
  schema: ParameterSchema;
}

export interface ValueInterpretation {
  value: any;
  confidence: number;
  reasoning: string;
  conversionMethod: string;
}

export interface ParameterClarification {
  parameter: string;
  clarificationQuestion: string;
  userResponse: string;
  resolvedValue: any;
  confidence: number;
}

export type ResolvedParameters = Record<string, any>;

export interface RiskAssessment {
  overallRiskLevel: RiskLevel;
  identifiedRisks: Risk[];
  estimatedImpact: ImpactAssessment;
  requiresConfirmation: boolean;
  suggestedAlternatives: Alternative[];
  recommendedMonitoringLevel: MonitoringLevel;
  estimatedDuration: number;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type MonitoringLevel = 'BASIC' | 'ENHANCED' | 'COMPREHENSIVE' | 'REAL_TIME';

export interface Risk {
  type: RiskType;
  severity: RiskLevel;
  description: string;
  likelihood: number;
  impact: string;
  mitigation: string[];
}

export type RiskType = 'SECURITY' | 'BUSINESS' | 'COMPLIANCE' | 'PERFORMANCE' | 'DATA_LOSS' | 'FINANCIAL';

export interface ImpactAssessment {
  businessImpact: BusinessImpact;
  technicalImpact: TechnicalImpact;
  complianceImpact: ComplianceImpact;
  userImpact: UserImpact;
}

export interface BusinessImpact {
  severity: RiskLevel;
  description: string;
  affectedProcesses: string[];
  estimatedCost: number;
  recovery: string;
}

export interface TechnicalImpact {
  severity: RiskLevel;
  description: string;
  affectedSystems: string[];
  performanceImpact: number;
  recovery: string;
}

export interface ComplianceImpact {
  severity: RiskLevel;
  description: string;
  affectedRegulations: string[];
  reportingRequired: boolean;
  recovery: string;
}

export interface UserImpact {
  severity: RiskLevel;
  description: string;
  affectedUsers: number;
  serviceInterruption: number;
  recovery: string;
}

export interface Alternative {
  description: string;
  approach: string;
  reasoning: string;
  advantages: string[];
  disadvantages: string[];
}

export interface PlannedOperation {
  api: APIDefinition;
  parameters: ResolvedParameters;
  estimatedImpact: ImpactAssessment;
}

export interface APIDefinition {
  name: string;
  method: string;
  endpoint: string;
  schema: APISchema;
  description: string;
  securityLevel: SecurityLevel;
  rateLimit: RateLimit;
  specializations: string[];
}

export interface RateLimit {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
}

export interface UserConfirmation {
  approved: boolean;
  reason?: string;
  additionalRequirements?: string[];
  modifiedParameters?: Record<string, any>;
}

// API Execution and Response Interfaces

export interface APIExecutionPlan {
  status: 'APPROVED' | 'CANCELLED';
  reason?: string;
  alternatives?: Alternative[];
  executionPlan?: ExecutionPlan;
}

export interface ExecutionPlan {
  api: APIDefinition;
  method: string;
  parameters: ResolvedParameters;
  headers: Record<string, string>;
  validationId: string;
  conversationId: string;
  expectedDuration: number;
  monitoringLevel: MonitoringLevel;
}

export interface APITransaction {
  id: string;
  userContext: UserContext;
  authContext: AuthContext;
  sourceContext: SourceContext;
  request: TransactionRequest;
  validation: ValidationContext;
  execution: ExecutionContext;
  response: TransactionResponse;
  security: SecurityContext;
}

export interface TransactionRequest {
  method: string;
  endpoint: string;
  parameters: Record<string, any>;
  headers: Record<string, string>;
  size: number;
  contentType: string;
}

export interface ValidationContext {
  sessionId: string;
  intentAnalysis: IntentAnalysis;
  riskAssessment: RiskAssessment;
  userConfirmation: UserConfirmation;
  decision: 'APPROVED' | 'REJECTED' | 'MODIFIED';
  reasoning: string;
  alternatives: Alternative[];
}

export interface ExecutionContext {
  startTime: Date;
  endTime: Date;
  duration: number;
  path: string[];
  servicesInvolved: string[];
  databaseAccess: DatabaseAccess[];
  externalApiCalls: ExternalAPICall[];
}

export interface DatabaseAccess {
  database: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  tables: string[];
  recordsAffected: number;
  duration: number;
}

export interface ExternalAPICall {
  service: string;
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
}

export interface TransactionResponse {
  statusCode: number;
  size: number;
  data: any;
  error?: APIError;
}

export interface APIError {
  type: string;
  message: string;
  code: string;
  stackTrace?: string;
  timestamp: Date;
  context?: ErrorContext;
}

export interface ErrorContext {
  operation: APIOperation;
  userAction: string;
  systemState: SystemState;
  recentErrors: APIError[];
  userContext: UserContext;
}

export interface SystemState {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  activeConnections: number;
  queueDepth: number;
}

export interface SecurityContext {
  level: SecurityLevel;
  encryptionUsed: EncryptionDetails;
  dataClassification: DataClassification;
  accessControls: AccessControl[];
  threatAssessment: ThreatAssessment;
  requiredBiometricLevel?: BiometricLevel;
}

export interface EncryptionDetails {
  algorithm: string;
  keySize: number;
  protocol: string;
}

export interface DataClassification {
  level: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  categories: string[];
  retentionPeriod: number;
  handlingRequirements: string[];
}

export interface AccessControl {
  type: 'RBAC' | 'ABAC' | 'MAC' | 'DAC';
  policy: string;
  enforcement: 'STRICT' | 'ADVISORY';
}

export interface ThreatAssessment {
  riskScore: number;
  threats: DetectedThreat[];
  mitigations: string[];
  recommendations: string[];
}

export interface DetectedThreat {
  type: ThreatType;
  severity: RiskLevel;
  confidence: number;
  description: string;
  indicators: string[];
}

export type ThreatType = 'MALWARE' | 'PHISHING' | 'DATA_EXFILTRATION' | 'UNAUTHORIZED_ACCESS' | 'DDOS' | 'INJECTION';
export type BiometricLevel = 'BASIC' | 'ENHANCED' | 'MULTI_MODAL';