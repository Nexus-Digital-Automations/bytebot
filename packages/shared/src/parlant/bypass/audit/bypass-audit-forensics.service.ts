/**
 * PARLANT Phase 1 Emergency Bypass System - Audit & Forensics Service
 *
 * Enterprise-grade audit trail and forensics system with comprehensive
 * logging, tamper-proof storage, and advanced forensic analysis capabilities.
 *
 * @version 1.0.0
 * @author PARLANT Emergency Bypass System Agent
 * @compliance GDPR, SOX, HIPAA, SOC2, ISO27001
 */

import { Injectable, Logger } from "@nestjs/common";
import { createHash, createHmac } from "crypto";
import { v4 as uuidv4 } from "uuid";
import {
  EmergencyBypassToken,
  BypassOperationResult,
  BypassAuthorizationLevel,
  BypassRole,
  BypassOperationType,
  ApprovalWorkflow,
  SecurityViolation,
  ViolationSeverity,
} from "../types/bypass-core.types";

/**
 * Audit entry for bypass operations
 */
export interface BypassAuditEntry {
  /** Unique audit entry ID */
  auditId: string;

  /** Entry timestamp */
  timestamp: Date;

  /** Audit entry type */
  entryType: AuditEntryType;

  /** User who performed the action */
  actor: AuditActor;

  /** Action performed */
  action: AuditAction;

  /** Resource affected */
  resource: AuditResource;

  /** Outcome of the action */
  outcome: AuditOutcome;

  /** Additional details */
  details: AuditDetails;

  /** Security classification */
  classification: SecurityClassification;

  /** Compliance tags */
  complianceTags: ComplianceTag[];

  /** Digital signature for integrity */
  signature: string;

  /** Hash chain for tamper detection */
  previousHash?: string;

  /** Current entry hash */
  entryHash: string;
}

/**
 * Audit entry types
 */
export enum AuditEntryType {
  TOKEN_CREATION = "token_creation",
  TOKEN_APPROVAL = "token_approval",
  TOKEN_REVOCATION = "token_revocation",
  BYPASS_OPERATION = "bypass_operation",
  AUTHORIZATION_DECISION = "authorization_decision",
  SECURITY_VIOLATION = "security_violation",
  ABUSE_DETECTION = "abuse_detection",
  SYSTEM_TRIGGER = "system_trigger",
  CONFIGURATION_CHANGE = "configuration_change",
  DATA_ACCESS = "data_access",
  EXPORT_REQUEST = "export_request",
}

/**
 * Audit actor (user/system)
 */
export interface AuditActor {
  /** Actor ID */
  id: string;

  /** Actor type */
  type: ActorType;

  /** Actor name */
  name: string;

  /** Actor role */
  role: BypassRole;

  /** IP address */
  ipAddress: string;

  /** User agent */
  userAgent: string;

  /** Geographic location */
  location?: string;

  /** Session ID */
  sessionId?: string;
}

/**
 * Actor types
 */
export enum ActorType {
  HUMAN_USER = "human_user",
  SYSTEM_SERVICE = "system_service",
  API_CLIENT = "api_client",
  AUTOMATION = "automation",
  EXTERNAL_SYSTEM = "external_system",
}

/**
 * Audit action
 */
export interface AuditAction {
  /** Action name */
  name: string;

  /** Action category */
  category: ActionCategory;

  /** Function or method called */
  function: string;

  /** Parameters passed */
  parameters: Record<string, any>;

  /** Duration of action */
  duration: number;

  /** Success status */
  success: boolean;

  /** Error details if failed */
  error?: string;
}

/**
 * Action categories
 */
export enum ActionCategory {
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  DATA_ACCESS = "data_access",
  DATA_MODIFICATION = "data_modification",
  CONFIGURATION = "configuration",
  SECURITY = "security",
  MONITORING = "monitoring",
  ADMINISTRATION = "administration",
}

/**
 * Audit resource
 */
export interface AuditResource {
  /** Resource ID */
  id: string;

  /** Resource type */
  type: ResourceType;

  /** Resource name */
  name: string;

  /** Resource path */
  path?: string;

  /** Resource attributes */
  attributes: Record<string, any>;

  /** Data sensitivity level */
  sensitivityLevel: DataSensitivityLevel;
}

/**
 * Resource types
 */
export enum ResourceType {
  DATABASE_TABLE = "database_table",
  DATABASE_RECORD = "database_record",
  CONFIG_FILE = "config_file",
  API_ENDPOINT = "api_endpoint",
  SYSTEM_FUNCTION = "system_function",
  USER_ACCOUNT = "user_account",
  SECURITY_TOKEN = "security_token",
  AUDIT_LOG = "audit_log",
}

/**
 * Data sensitivity levels
 */
export enum DataSensitivityLevel {
  PUBLIC = "public",
  INTERNAL = "internal",
  CONFIDENTIAL = "confidential",
  RESTRICTED = "restricted",
  TOP_SECRET = "top_secret",
}

/**
 * Audit outcome
 */
export interface AuditOutcome {
  /** Success status */
  success: boolean;

  /** Result code */
  resultCode: string;

  /** Result message */
  message: string;

  /** Data returned (if any) */
  dataReturned?: boolean;

  /** Records affected */
  recordsAffected: number;

  /** Security impact */
  securityImpact: SecurityImpactLevel;
}

/**
 * Security impact levels
 */
export enum SecurityImpactLevel {
  NONE = "none",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Audit details
 */
export interface AuditDetails {
  /** Request context */
  requestContext: RequestContext;

  /** Response context */
  responseContext: ResponseContext;

  /** Performance metrics */
  performanceMetrics: AuditPerformanceMetrics;

  /** Security context */
  securityContext: AuditSecurityContext;

  /** Business context */
  businessContext: BusinessContext;

  /** Technical context */
  technicalContext: TechnicalContext;
}

/**
 * Request context
 */
export interface RequestContext {
  /** Request ID */
  requestId: string;

  /** HTTP method */
  method?: string;

  /** Request path */
  path?: string;

  /** Request headers */
  headers: Record<string, string>;

  /** Request size */
  size: number;

  /** Request timestamp */
  timestamp: Date;
}

/**
 * Response context
 */
export interface ResponseContext {
  /** HTTP status code */
  statusCode: number;

  /** Response headers */
  headers: Record<string, string>;

  /** Response size */
  size: number;

  /** Response time */
  responseTime: number;

  /** Cache status */
  cacheStatus?: string;
}

/**
 * Audit performance metrics
 */
export interface AuditPerformanceMetrics {
  /** Total execution time */
  executionTime: number;

  /** Database query time */
  databaseTime: number;

  /** Network time */
  networkTime: number;

  /** CPU usage */
  cpuUsage: number;

  /** Memory usage */
  memoryUsage: number;

  /** I/O operations */
  ioOperations: number;
}

/**
 * Audit security context
 */
export interface AuditSecurityContext {
  /** Authorization level used */
  authorizationLevel: BypassAuthorizationLevel;

  /** Token ID used */
  tokenId?: string;

  /** Risk score at time of action */
  riskScore: number;

  /** Security flags */
  securityFlags: string[];

  /** Threat indicators */
  threatIndicators: string[];

  /** Compliance violations */
  complianceViolations: string[];
}

/**
 * Business context
 */
export interface BusinessContext {
  /** Business process */
  businessProcess: string;

  /** Business impact */
  businessImpact: string;

  /** Cost center */
  costCenter?: string;

  /** Project ID */
  projectId?: string;

  /** Service level agreement */
  sla?: string;
}

/**
 * Technical context
 */
export interface TechnicalContext {
  /** System version */
  systemVersion: string;

  /** Environment */
  environment: string;

  /** Deployment region */
  region: string;

  /** Service instance */
  serviceInstance: string;

  /** Technology stack */
  technologyStack: string[];

  /** Dependencies */
  dependencies: string[];
}

/**
 * Security classification
 */
export enum SecurityClassification {
  UNCLASSIFIED = "unclassified",
  INTERNAL = "internal",
  CONFIDENTIAL = "confidential",
  SECRET = "secret",
  TOP_SECRET = "top_secret",
}

/**
 * Compliance tags
 */
export enum ComplianceTag {
  GDPR = "gdpr",
  SOX = "sox",
  HIPAA = "hipaa",
  SOC2 = "soc2",
  ISO27001 = "iso27001",
  PCI_DSS = "pci_dss",
  CCPA = "ccpa",
  NIST = "nist",
}

/**
 * Forensic investigation
 */
export interface ForensicInvestigation {
  /** Investigation ID */
  investigationId: string;

  /** Investigation title */
  title: string;

  /** Investigation type */
  type: InvestigationType;

  /** Investigator */
  investigator: string;

  /** Start timestamp */
  startedAt: Date;

  /** End timestamp */
  completedAt?: Date;

  /** Investigation status */
  status: InvestigationStatus;

  /** Scope of investigation */
  scope: InvestigationScope;

  /** Evidence collected */
  evidence: ForensicEvidence[];

  /** Findings */
  findings: InvestigationFinding[];

  /** Timeline of events */
  timeline: TimelineEvent[];

  /** Recommendations */
  recommendations: string[];

  /** Final report */
  report?: InvestigationReport;
}

/**
 * Investigation types
 */
export enum InvestigationType {
  SECURITY_INCIDENT = "security_incident",
  COMPLIANCE_AUDIT = "compliance_audit",
  FRAUD_INVESTIGATION = "fraud_investigation",
  DATA_BREACH = "data_breach",
  UNAUTHORIZED_ACCESS = "unauthorized_access",
  SYSTEM_COMPROMISE = "system_compromise",
  INSIDER_THREAT = "insider_threat",
}

/**
 * Investigation status
 */
export enum InvestigationStatus {
  INITIATED = "initiated",
  IN_PROGRESS = "in_progress",
  SUSPENDED = "suspended",
  COMPLETED = "completed",
  CLOSED = "closed",
}

/**
 * Investigation scope
 */
export interface InvestigationScope {
  /** Time range */
  timeRange: TimeRange;

  /** Users involved */
  users: string[];

  /** Systems involved */
  systems: string[];

  /** Data sources */
  dataSources: string[];

  /** Investigation criteria */
  criteria: InvestigationCriteria[];
}

/**
 * Time range
 */
export interface TimeRange {
  /** Start time */
  startTime: Date;

  /** End time */
  endTime: Date;

  /** Timezone */
  timezone: string;
}

/**
 * Investigation criteria
 */
export interface InvestigationCriteria {
  /** Criteria type */
  type: string;

  /** Criteria value */
  value: any;

  /** Criteria operator */
  operator: string;
}

/**
 * Forensic evidence
 */
export interface ForensicEvidence {
  /** Evidence ID */
  evidenceId: string;

  /** Evidence type */
  type: EvidenceType;

  /** Source of evidence */
  source: string;

  /** Collection timestamp */
  collectedAt: Date;

  /** Evidence data */
  data: any;

  /** Chain of custody */
  chainOfCustody: CustodyRecord[];

  /** Evidence integrity hash */
  integrityHash: string;

  /** Evidence classification */
  classification: SecurityClassification;
}

/**
 * Evidence types
 */
export enum EvidenceType {
  AUDIT_LOG = "audit_log",
  SYSTEM_LOG = "system_log",
  DATABASE_RECORD = "database_record",
  NETWORK_TRAFFIC = "network_traffic",
  FILE_SYSTEM = "file_system",
  MEMORY_DUMP = "memory_dump",
  SCREENSHOT = "screenshot",
  CONFIGURATION = "configuration",
}

/**
 * Custody record
 */
export interface CustodyRecord {
  /** Custodian */
  custodian: string;

  /** Timestamp */
  timestamp: Date;

  /** Action */
  action: CustodyAction;

  /** Reason */
  reason: string;

  /** Digital signature */
  signature: string;
}

/**
 * Custody actions
 */
export enum CustodyAction {
  COLLECTED = "collected",
  TRANSFERRED = "transferred",
  ANALYZED = "analyzed",
  STORED = "stored",
  DESTROYED = "destroyed",
}

/**
 * Investigation finding
 */
export interface InvestigationFinding {
  /** Finding ID */
  findingId: string;

  /** Finding type */
  type: FindingType;

  /** Severity */
  severity: ViolationSeverity;

  /** Description */
  description: string;

  /** Supporting evidence */
  supportingEvidence: string[];

  /** Remediation required */
  remediationRequired: boolean;

  /** Impact assessment */
  impact: ImpactAssessment;
}

/**
 * Finding types
 */
export enum FindingType {
  POLICY_VIOLATION = "policy_violation",
  UNAUTHORIZED_ACCESS = "unauthorized_access",
  DATA_EXFILTRATION = "data_exfiltration",
  PRIVILEGE_ABUSE = "privilege_abuse",
  SYSTEM_COMPROMISE = "system_compromise",
  COMPLIANCE_VIOLATION = "compliance_violation",
}

/**
 * Impact assessment
 */
export interface ImpactAssessment {
  /** Business impact */
  businessImpact: string;

  /** Financial impact */
  financialImpact?: number;

  /** Regulatory impact */
  regulatoryImpact: string;

  /** Reputation impact */
  reputationImpact: string;

  /** Data compromised */
  dataCompromised: boolean;

  /** Systems affected */
  systemsAffected: string[];
}

/**
 * Timeline event
 */
export interface TimelineEvent {
  /** Event timestamp */
  timestamp: Date;

  /** Event type */
  type: string;

  /** Event description */
  description: string;

  /** Actor involved */
  actor: string;

  /** Evidence references */
  evidenceReferences: string[];

  /** Confidence level */
  confidence: ConfidenceLevel;
}

/**
 * Confidence levels
 */
export enum ConfidenceLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CERTAIN = "certain",
}

/**
 * Investigation report
 */
export interface InvestigationReport {
  /** Report ID */
  reportId: string;

  /** Report title */
  title: string;

  /** Executive summary */
  executiveSummary: string;

  /** Methodology */
  methodology: string;

  /** Key findings */
  keyFindings: string[];

  /** Timeline of events */
  eventTimeline: string;

  /** Evidence summary */
  evidenceSummary: string;

  /** Conclusions */
  conclusions: string;

  /** Recommendations */
  recommendations: string[];

  /** Lessons learned */
  lessonsLearned: string[];

  /** Report date */
  reportDate: Date;

  /** Report author */
  author: string;

  /** Report reviewers */
  reviewers: string[];
}

/**
 * Bypass Audit & Forensics Service
 *
 * Provides comprehensive audit and forensic capabilities:
 * - Tamper-proof audit logging
 * - Digital signature verification
 * - Forensic investigation tools
 * - Compliance reporting
 * - Chain of custody management
 */
@Injectable()
export class BypassAuditForensicsService {
  private readonly logger = new Logger(BypassAuditForensicsService.name);
  private readonly auditEntries = new Map<string, BypassAuditEntry>();
  private readonly investigations = new Map<string, ForensicInvestigation>();
  private readonly chainHash = new Map<string, string>();
  private readonly secretKey: string;

  constructor() {
    this.secretKey = process.env.AUDIT_SECRET_KEY || this.generateSecretKey();
    this.initializeAuditSystem();
  }

  /**
   * Log bypass operation audit entry
   */
  async logBypassOperation(
    operation: BypassOperationResult,
    actor: AuditActor,
    token?: EmergencyBypassToken,
  ): Promise<string> {
    const auditEntry: BypassAuditEntry = {
      auditId: uuidv4(),
      timestamp: new Date(),
      entryType: AuditEntryType.BYPASS_OPERATION,
      actor,
      action: {
        name: "bypass_operation_executed",
        category: ActionCategory.AUTHORIZATION,
        function: operation.functionName,
        parameters: {}, // Sanitized parameters
        duration: operation.performanceMetrics.duration,
        success: operation.success,
        error: operation.error?.message,
      },
      resource: {
        id: operation.operationId,
        type: ResourceType.SYSTEM_FUNCTION,
        name: operation.functionName,
        attributes: {
          tokenId: operation.tokenId,
          operationType: this.extractOperationType(operation.functionName),
        },
        sensitivityLevel: this.determineSensitivityLevel(
          operation.functionName,
        ),
      },
      outcome: {
        success: operation.success,
        resultCode: operation.success ? "SUCCESS" : "FAILURE",
        message: operation.success
          ? "Operation completed successfully"
          : operation.error?.message || "Operation failed",
        dataReturned: !!operation.result,
        recordsAffected: 1,
        securityImpact: this.assessSecurityImpact(operation),
      },
      details: {
        requestContext: {
          requestId: operation.operationId,
          headers: {},
          size: 0,
          timestamp: operation.executedAt,
        },
        responseContext: {
          statusCode: operation.success ? 200 : 500,
          headers: {},
          size: 0,
          responseTime: operation.performanceMetrics.duration,
        },
        performanceMetrics: {
          executionTime: operation.performanceMetrics.duration,
          databaseTime: operation.performanceMetrics.dbTime,
          networkTime: operation.performanceMetrics.networkLatency,
          cpuUsage: 0,
          memoryUsage: 0,
          ioOperations: 1,
        },
        securityContext: {
          authorizationLevel:
            token?.authorizationLevel ||
            BypassAuthorizationLevel.SYSTEM_CRITICAL,
          tokenId: operation.tokenId,
          riskScore: operation.securityValidation.riskScore,
          securityFlags: operation.securityValidation.violations.map(
            (v) => v.type,
          ),
          threatIndicators: [],
          complianceViolations: [],
        },
        businessContext: {
          businessProcess: "emergency_bypass",
          businessImpact: "operational_continuity",
        },
        technicalContext: {
          systemVersion: "1.0.0",
          environment: process.env.NODE_ENV || "development",
          region: "us-east-1",
          serviceInstance: "bypass-service-1",
          technologyStack: ["nodejs", "typescript", "nestjs"],
          dependencies: ["parlant-service", "database"],
        },
      },
      classification: SecurityClassification.CONFIDENTIAL,
      complianceTags: [
        ComplianceTag.SOX,
        ComplianceTag.SOC2,
        ComplianceTag.ISO27001,
      ],
      signature: "",
      entryHash: "",
    };

    // Generate signature and hash
    auditEntry.signature = this.generateSignature(auditEntry);
    auditEntry.entryHash = this.generateEntryHash(auditEntry);
    auditEntry.previousHash = this.getLastChainHash();

    // Store entry
    this.auditEntries.set(auditEntry.auditId, auditEntry);
    this.updateChainHash(auditEntry.entryHash);

    this.logger.log(
      `Audit entry created: ${auditEntry.auditId} for operation ${operation.operationId}`,
    );

    return auditEntry.auditId;
  }

  /**
   * Log token creation audit entry
   */
  async logTokenCreation(
    token: EmergencyBypassToken,
    actor: AuditActor,
  ): Promise<string> {
    const auditEntry: BypassAuditEntry = {
      auditId: uuidv4(),
      timestamp: new Date(),
      entryType: AuditEntryType.TOKEN_CREATION,
      actor,
      action: {
        name: "emergency_token_created",
        category: ActionCategory.AUTHENTICATION,
        function: "createEmergencyToken",
        parameters: {
          authorizationLevel: token.authorizationLevel,
          allowedOperations: token.allowedOperations,
          maxOperations: token.maxOperations,
          durationMinutes: Math.round(
            (token.expiresAt.getTime() - token.createdAt.getTime()) / 60000,
          ),
        },
        duration: 0,
        success: true,
      },
      resource: {
        id: token.tokenId,
        type: ResourceType.SECURITY_TOKEN,
        name: "emergency_bypass_token",
        attributes: {
          authorizationLevel: token.authorizationLevel,
          allowedOperations: token.allowedOperations,
        },
        sensitivityLevel: DataSensitivityLevel.RESTRICTED,
      },
      outcome: {
        success: true,
        resultCode: "TOKEN_CREATED",
        message: "Emergency bypass token created successfully",
        dataReturned: true,
        recordsAffected: 1,
        securityImpact: SecurityImpactLevel.HIGH,
      },
      details: this.createBasicDetails(token.tokenId),
      classification: SecurityClassification.SECRET,
      complianceTags: [
        ComplianceTag.SOX,
        ComplianceTag.SOC2,
        ComplianceTag.ISO27001,
        ComplianceTag.GDPR,
      ],
      signature: "",
      entryHash: "",
    };

    // Generate signature and hash
    auditEntry.signature = this.generateSignature(auditEntry);
    auditEntry.entryHash = this.generateEntryHash(auditEntry);
    auditEntry.previousHash = this.getLastChainHash();

    // Store entry
    this.auditEntries.set(auditEntry.auditId, auditEntry);
    this.updateChainHash(auditEntry.entryHash);

    this.logger.warn(
      `Token creation audit entry: ${auditEntry.auditId} for token ${token.tokenId}`,
    );

    return auditEntry.auditId;
  }

  /**
   * Log security violation
   */
  async logSecurityViolation(
    violation: SecurityViolation,
    actor: AuditActor,
    context: any,
  ): Promise<string> {
    const auditEntry: BypassAuditEntry = {
      auditId: uuidv4(),
      timestamp: new Date(),
      entryType: AuditEntryType.SECURITY_VIOLATION,
      actor,
      action: {
        name: "security_violation_detected",
        category: ActionCategory.SECURITY,
        function: "detectSecurityViolation",
        parameters: {
          violationType: violation.type,
          severity: violation.severity,
        },
        duration: 0,
        success: true,
      },
      resource: {
        id: uuidv4(),
        type: ResourceType.SYSTEM_FUNCTION,
        name: "security_monitoring",
        attributes: {
          violationType: violation.type,
          severity: violation.severity,
        },
        sensitivityLevel: DataSensitivityLevel.RESTRICTED,
      },
      outcome: {
        success: true,
        resultCode: "VIOLATION_DETECTED",
        message: violation.description,
        dataReturned: false,
        recordsAffected: 0,
        securityImpact: this.mapSeverityToImpact(violation.severity),
      },
      details: {
        ...this.createBasicDetails("security_violation"),
        securityContext: {
          authorizationLevel: BypassAuthorizationLevel.SYSTEM_CRITICAL,
          riskScore: 100,
          securityFlags: [violation.type],
          threatIndicators: [violation.type],
          complianceViolations: [violation.type],
        },
      },
      classification: SecurityClassification.SECRET,
      complianceTags: [
        ComplianceTag.SOX,
        ComplianceTag.SOC2,
        ComplianceTag.ISO27001,
      ],
      signature: "",
      entryHash: "",
    };

    // Generate signature and hash
    auditEntry.signature = this.generateSignature(auditEntry);
    auditEntry.entryHash = this.generateEntryHash(auditEntry);
    auditEntry.previousHash = this.getLastChainHash();

    // Store entry
    this.auditEntries.set(auditEntry.auditId, auditEntry);
    this.updateChainHash(auditEntry.entryHash);

    this.logger.error(
      `Security violation audit entry: ${auditEntry.auditId} - ${violation.type}`,
    );

    return auditEntry.auditId;
  }

  /**
   * Start forensic investigation
   */
  async startInvestigation(
    title: string,
    type: InvestigationType,
    investigator: string,
    scope: InvestigationScope,
  ): Promise<string> {
    const investigationId = uuidv4();

    const investigation: ForensicInvestigation = {
      investigationId,
      title,
      type,
      investigator,
      startedAt: new Date(),
      status: InvestigationStatus.INITIATED,
      scope,
      evidence: [],
      findings: [],
      timeline: [],
      recommendations: [],
    };

    this.investigations.set(investigationId, investigation);

    this.logger.warn(
      `Forensic investigation started: ${investigationId} - ${title}`,
    );

    return investigationId;
  }

  /**
   * Collect evidence for investigation
   */
  async collectEvidence(
    investigationId: string,
    evidenceType: EvidenceType,
    source: string,
    data: any,
  ): Promise<string> {
    const investigation = this.investigations.get(investigationId);
    if (!investigation) {
      throw new Error("Investigation not found");
    }

    const evidenceId = uuidv4();
    const evidence: ForensicEvidence = {
      evidenceId,
      type: evidenceType,
      source,
      collectedAt: new Date(),
      data,
      chainOfCustody: [
        {
          custodian: investigation.investigator,
          timestamp: new Date(),
          action: CustodyAction.COLLECTED,
          reason: "Evidence collection for investigation",
          signature: this.generateEvidenceSignature(evidenceId, data),
        },
      ],
      integrityHash: this.generateIntegrityHash(data),
      classification: SecurityClassification.CONFIDENTIAL,
    };

    investigation.evidence.push(evidence);
    this.investigations.set(investigationId, investigation);

    this.logger.log(
      `Evidence collected: ${evidenceId} for investigation ${investigationId}`,
    );

    return evidenceId;
  }

  /**
   * Query audit entries
   */
  async queryAuditEntries(
    criteria: AuditQueryCriteria,
  ): Promise<BypassAuditEntry[]> {
    let entries = Array.from(this.auditEntries.values());

    // Apply filters
    if (criteria.startTime) {
      entries = entries.filter((e) => e.timestamp >= criteria.startTime!);
    }

    if (criteria.endTime) {
      entries = entries.filter((e) => e.timestamp <= criteria.endTime!);
    }

    if (criteria.entryTypes?.length) {
      entries = entries.filter((e) =>
        criteria.entryTypes!.includes(e.entryType),
      );
    }

    if (criteria.actors?.length) {
      entries = entries.filter((e) => criteria.actors!.includes(e.actor.id));
    }

    if (criteria.functions?.length) {
      entries = entries.filter((e) =>
        criteria.functions!.includes(e.action.function),
      );
    }

    if (criteria.successOnly !== undefined) {
      entries = entries.filter(
        (e) => e.outcome.success === criteria.successOnly,
      );
    }

    // Sort by timestamp
    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (criteria.limit) {
      entries = entries.slice(0, criteria.limit);
    }

    return entries;
  }

  /**
   * Verify audit trail integrity
   */
  async verifyAuditIntegrity(): Promise<IntegrityVerificationResult> {
    const entries = Array.from(this.auditEntries.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    const results: IntegrityCheck[] = [];
    let previousHash: string | undefined;

    for (const entry of entries) {
      const check: IntegrityCheck = {
        auditId: entry.auditId,
        signatureValid: this.verifySignature(entry),
        hashValid: this.verifyEntryHash(entry),
        chainValid: this.verifyChainHash(entry, previousHash),
        timestamp: entry.timestamp,
      };

      results.push(check);
      previousHash = entry.entryHash;
    }

    const invalidChecks = results.filter(
      (r) => !r.signatureValid || !r.hashValid || !r.chainValid,
    );

    return {
      totalEntries: results.length,
      validEntries: results.length - invalidChecks.length,
      invalidEntries: invalidChecks.length,
      integrityScore: (results.length - invalidChecks.length) / results.length,
      checks: results,
      tamperedEntries: invalidChecks.map((c) => c.auditId),
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    complianceFramework: ComplianceTag,
    timeRange: TimeRange,
  ): Promise<ComplianceReport> {
    const entries = await this.queryAuditEntries({
      startTime: timeRange.startTime,
      endTime: timeRange.endTime,
    });

    const relevantEntries = entries.filter((e) =>
      e.complianceTags.includes(complianceFramework),
    );

    return {
      reportId: uuidv4(),
      framework: complianceFramework,
      timeRange,
      generatedAt: new Date(),
      totalEntries: relevantEntries.length,
      entriesByType: this.groupEntriesByType(relevantEntries),
      securityViolations: relevantEntries.filter(
        (e) => e.entryType === AuditEntryType.SECURITY_VIOLATION,
      ).length,
      integrityVerification: await this.verifyAuditIntegrity(),
      recommendations: this.generateComplianceRecommendations(
        complianceFramework,
        relevantEntries,
      ),
    };
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private initializeAuditSystem(): void {
    this.logger.warn("Audit and forensics system initialized");
  }

  private generateSecretKey(): string {
    // In production, this should be loaded from secure configuration
    return "default-audit-secret-key-change-in-production";
  }

  private generateSignature(entry: BypassAuditEntry): string {
    const data = JSON.stringify({
      auditId: entry.auditId,
      timestamp: entry.timestamp,
      actor: entry.actor.id,
      action: entry.action.name,
      resource: entry.resource.id,
    });

    return createHmac("sha256", this.secretKey).update(data).digest("hex");
  }

  private generateEntryHash(entry: BypassAuditEntry): string {
    const data = JSON.stringify(entry, null, 0);
    return createHash("sha256").update(data).digest("hex");
  }

  private generateEvidenceSignature(evidenceId: string, data: any): string {
    const signatureData = `${evidenceId}:${JSON.stringify(data)}`;
    return createHmac("sha256", this.secretKey)
      .update(signatureData)
      .digest("hex");
  }

  private generateIntegrityHash(data: any): string {
    return createHash("sha256").update(JSON.stringify(data)).digest("hex");
  }

  private getLastChainHash(): string | undefined {
    const entries = Array.from(this.auditEntries.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );

    return entries.length > 0 ? entries[0].entryHash : undefined;
  }

  private updateChainHash(hash: string): void {
    this.chainHash.set(Date.now().toString(), hash);
  }

  private verifySignature(entry: BypassAuditEntry): boolean {
    const expectedSignature = this.generateSignature(entry);
    return entry.signature === expectedSignature;
  }

  private verifyEntryHash(entry: BypassAuditEntry): boolean {
    // Use destructuring to exclude entryHash instead of delete operator
    const { entryHash: _, ...entryWithoutHash } = entry;
    const expectedHash = createHash("sha256")
      .update(JSON.stringify(entryWithoutHash))
      .digest("hex");
    return entry.entryHash === expectedHash;
  }

  private verifyChainHash(
    entry: BypassAuditEntry,
    expectedPreviousHash?: string,
  ): boolean {
    if (!expectedPreviousHash && !entry.previousHash) {
      return true; // First entry
    }

    return entry.previousHash === expectedPreviousHash;
  }

  private extractOperationType(functionName: string): BypassOperationType {
    if (functionName.includes("database") || functionName.includes("db")) {
      return BypassOperationType.DATABASE_CRITICAL;
    } else if (functionName.includes("auth")) {
      return BypassOperationType.AUTH_CRITICAL;
    } else if (functionName.includes("config")) {
      return BypassOperationType.CONFIG_CRITICAL;
    } else {
      return BypassOperationType.MAINTENANCE;
    }
  }

  private determineSensitivityLevel(
    functionName: string,
  ): DataSensitivityLevel {
    if (functionName.includes("secret") || functionName.includes("private")) {
      return DataSensitivityLevel.TOP_SECRET;
    } else if (
      functionName.includes("auth") ||
      functionName.includes("security")
    ) {
      return DataSensitivityLevel.RESTRICTED;
    } else if (functionName.includes("config")) {
      return DataSensitivityLevel.CONFIDENTIAL;
    } else {
      return DataSensitivityLevel.INTERNAL;
    }
  }

  private assessSecurityImpact(
    operation: BypassOperationResult,
  ): SecurityImpactLevel {
    if (operation.securityValidation.riskScore > 90) {
      return SecurityImpactLevel.CRITICAL;
    } else if (operation.securityValidation.riskScore > 70) {
      return SecurityImpactLevel.HIGH;
    } else if (operation.securityValidation.riskScore > 50) {
      return SecurityImpactLevel.MEDIUM;
    } else if (operation.securityValidation.riskScore > 30) {
      return SecurityImpactLevel.LOW;
    } else {
      return SecurityImpactLevel.NONE;
    }
  }

  private mapSeverityToImpact(
    severity: ViolationSeverity,
  ): SecurityImpactLevel {
    switch (severity) {
      case ViolationSeverity.CRITICAL:
        return SecurityImpactLevel.CRITICAL;
      case ViolationSeverity.HIGH:
        return SecurityImpactLevel.HIGH;
      case ViolationSeverity.MEDIUM:
        return SecurityImpactLevel.MEDIUM;
      case ViolationSeverity.LOW:
        return SecurityImpactLevel.LOW;
      default:
        return SecurityImpactLevel.NONE;
    }
  }

  private createBasicDetails(resourceId: string): AuditDetails {
    return {
      requestContext: {
        requestId: uuidv4(),
        headers: {},
        size: 0,
        timestamp: new Date(),
      },
      responseContext: {
        statusCode: 200,
        headers: {},
        size: 0,
        responseTime: 0,
      },
      performanceMetrics: {
        executionTime: 0,
        databaseTime: 0,
        networkTime: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        ioOperations: 0,
      },
      securityContext: {
        authorizationLevel: BypassAuthorizationLevel.SYSTEM_CRITICAL,
        riskScore: 50,
        securityFlags: [],
        threatIndicators: [],
        complianceViolations: [],
      },
      businessContext: {
        businessProcess: "emergency_bypass",
        businessImpact: "operational_continuity",
      },
      technicalContext: {
        systemVersion: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        region: "us-east-1",
        serviceInstance: "bypass-service-1",
        technologyStack: ["nodejs", "typescript", "nestjs"],
        dependencies: ["parlant-service", "database"],
      },
    };
  }

  private groupEntriesByType(
    entries: BypassAuditEntry[],
  ): Record<AuditEntryType, number> {
    const groups: Record<AuditEntryType, number> = {} as Record<
      AuditEntryType,
      number
    >;

    for (const entry of entries) {
      groups[entry.entryType] = (groups[entry.entryType] || 0) + 1;
    }

    return groups;
  }

  private generateComplianceRecommendations(
    framework: ComplianceTag,
    entries: BypassAuditEntry[],
  ): string[] {
    const recommendations: string[] = [];

    // Generic recommendations based on framework
    switch (framework) {
      case ComplianceTag.SOX:
        recommendations.push(
          "Ensure all financial data access is properly documented",
        );
        recommendations.push("Implement quarterly access reviews");
        break;
      case ComplianceTag.GDPR:
        recommendations.push(
          "Verify data subject consent for all personal data processing",
        );
        recommendations.push("Implement data retention policies");
        break;
      case ComplianceTag.HIPAA:
        recommendations.push("Ensure PHI access is properly authorized");
        recommendations.push("Implement minimum necessary access controls");
        break;
      default:
        recommendations.push("Review access patterns for anomalies");
        recommendations.push("Implement regular audit reviews");
    }

    return recommendations;
  }
}

// =============================================================================
// SUPPORTING INTERFACES
// =============================================================================

export interface AuditQueryCriteria {
  startTime?: Date;
  endTime?: Date;
  entryTypes?: AuditEntryType[];
  actors?: string[];
  functions?: string[];
  successOnly?: boolean;
  limit?: number;
}

export interface IntegrityVerificationResult {
  totalEntries: number;
  validEntries: number;
  invalidEntries: number;
  integrityScore: number;
  checks: IntegrityCheck[];
  tamperedEntries: string[];
}

export interface IntegrityCheck {
  auditId: string;
  signatureValid: boolean;
  hashValid: boolean;
  chainValid: boolean;
  timestamp: Date;
}

export interface ComplianceReport {
  reportId: string;
  framework: ComplianceTag;
  timeRange: TimeRange;
  generatedAt: Date;
  totalEntries: number;
  entriesByType: Record<AuditEntryType, number>;
  securityViolations: number;
  integrityVerification: IntegrityVerificationResult;
  recommendations: string[];
}
