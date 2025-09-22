import { ParlantValidationRequest, ParlantValidationResponse } from '../../../shared/src/parlant/monitoring/parlant-integration.service';
import { RiskLevel } from '../../../shared/src/types/parlant.types';
export interface DatabaseOperationContext {
    readonly operationType: DatabaseOperationType;
    readonly tableName: string;
    readonly queryText: string;
    readonly parameters: Record<string, unknown>;
    readonly estimatedRows: number;
    readonly isDestructive: boolean;
    readonly requiresTransaction: boolean;
    readonly securityClassification: DataClassification;
    readonly complianceRequirements: ComplianceFramework[];
    readonly businessJustification: string;
}
export declare enum DatabaseOperationType {
    SELECT = "SELECT",
    INSERT = "INSERT",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
    CREATE_TABLE = "CREATE_TABLE",
    ALTER_TABLE = "ALTER_TABLE",
    DROP_TABLE = "DROP_TABLE",
    CREATE_INDEX = "CREATE_INDEX",
    DROP_INDEX = "DROP_INDEX",
    BACKUP = "BACKUP",
    RESTORE = "RESTORE",
    MIGRATION = "MIGRATION",
    BULK_OPERATION = "BULK_OPERATION",
    ADMIN_OPERATION = "ADMIN_OPERATION"
}
export declare enum DataClassification {
    PUBLIC = "PUBLIC",
    INTERNAL = "INTERNAL",
    CONFIDENTIAL = "CONFIDENTIAL",
    RESTRICTED = "RESTRICTED",
    TOP_SECRET = "TOP_SECRET"
}
export declare enum ComplianceFramework {
    SOX = "SOX",
    GDPR = "GDPR",
    HIPAA = "HIPAA",
    PCI_DSS = "PCI_DSS",
    ISO_27001 = "ISO_27001",
    NIST = "NIST",
    SOC2 = "SOC2"
}
export interface ParlantDatabaseValidationRequest extends ParlantValidationRequest {
    readonly databaseOperation: DatabaseOperationContext;
    readonly transactionContext?: TransactionContext;
    readonly performanceConstraints?: PerformanceConstraints;
}
export interface TransactionContext {
    readonly transactionId: string;
    readonly isolationLevel: TransactionIsolationLevel;
    readonly timeoutMs: number;
    readonly rollbackStrategy: RollbackStrategy;
    readonly backupRequired: boolean;
    readonly approvalRequired: boolean;
}
export declare enum TransactionIsolationLevel {
    READ_UNCOMMITTED = "READ_UNCOMMITTED",
    READ_COMMITTED = "READ_COMMITTED",
    REPEATABLE_READ = "REPEATABLE_READ",
    SERIALIZABLE = "SERIALIZABLE"
}
export declare enum RollbackStrategy {
    AUTOMATIC = "AUTOMATIC",
    MANUAL_APPROVAL = "MANUAL_APPROVAL",
    CONDITIONAL = "CONDITIONAL",
    NEVER = "NEVER"
}
export interface PerformanceConstraints {
    readonly maxExecutionTimeMs: number;
    readonly maxResourceUsage: number;
    readonly priorityLevel: QueryPriority;
    readonly cachePolicy: CachePolicy;
}
export declare enum QueryPriority {
    LOW = "LOW",
    NORMAL = "NORMAL",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}
export declare enum CachePolicy {
    NO_CACHE = "NO_CACHE",
    SHORT_TERM = "SHORT_TERM",
    MEDIUM_TERM = "MEDIUM_TERM",
    LONG_TERM = "LONG_TERM",
    PERSISTENT = "PERSISTENT"
}
export interface ParlantDatabaseValidationResponse extends ParlantValidationResponse {
    readonly optimizedQuery?: string;
    readonly performanceRecommendations: string[];
    readonly securityRecommendations: string[];
    readonly complianceNotes: string[];
    readonly executionPlan?: DatabaseExecutionPlan;
    readonly auditTrail: DatabaseAuditTrail;
}
export interface DatabaseExecutionPlan {
    readonly planId: string;
    readonly steps: ExecutionStep[];
    readonly estimatedCost: number;
    readonly estimatedDuration: number;
    readonly resourceRequirements: ResourceRequirements;
    readonly riskAssessment: ExecutionRiskAssessment;
}
export interface ExecutionStep {
    readonly stepId: string;
    readonly operation: string;
    readonly description: string;
    readonly estimatedRows: number;
    readonly estimatedCost: number;
    readonly dependencies: string[];
    readonly risks: string[];
    readonly mitigations: string[];
}
export interface ResourceRequirements {
    readonly cpuUsage: number;
    readonly memoryUsage: number;
    readonly diskIO: number;
    readonly networkIO: number;
    readonly lockRequirements: LockRequirement[];
}
export interface LockRequirement {
    readonly resourceType: 'TABLE' | 'ROW' | 'INDEX' | 'SCHEMA';
    readonly resourceName: string;
    readonly lockType: 'SHARED' | 'EXCLUSIVE' | 'UPDATE';
    readonly duration: number;
}
export interface ExecutionRiskAssessment {
    readonly overallRisk: RiskLevel;
    readonly riskFactors: RiskFactor[];
    readonly mitigationStrategies: string[];
    readonly rollbackComplexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    readonly dataIntegrityRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
export interface RiskFactor {
    readonly factor: string;
    readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    readonly description: string;
    readonly mitigation: string;
    readonly probability: number;
    readonly impact: number;
}
export interface DatabaseAuditTrail {
    readonly auditId: string;
    readonly timestamp: Date;
    readonly userId: string;
    readonly sessionId: string;
    readonly operation: DatabaseOperationContext;
    readonly validationResult: ParlantValidationResponse;
    readonly executionMetrics?: ExecutionMetrics;
    readonly complianceRecord: ComplianceRecord;
    readonly businessContext: BusinessContext;
}
export interface ExecutionMetrics {
    readonly actualDuration: number;
    readonly resourcesUsed: ResourceRequirements;
    readonly rowsAffected: number;
    readonly performanceScore: number;
    readonly optimizationOpportunities: string[];
}
export interface ComplianceRecord {
    readonly frameworks: ComplianceFramework[];
    readonly requirements: ComplianceRequirement[];
    readonly attestations: ComplianceAttestation[];
    readonly exceptions: ComplianceException[];
}
export interface ComplianceRequirement {
    readonly requirementId: string;
    readonly framework: ComplianceFramework;
    readonly description: string;
    readonly satisfied: boolean;
    readonly evidence: string[];
    readonly notes: string;
}
export interface ComplianceAttestation {
    readonly attestationId: string;
    readonly attestedBy: string;
    readonly attestationDate: Date;
    readonly framework: ComplianceFramework;
    readonly scope: string;
    readonly validity: Date;
}
export interface ComplianceException {
    readonly exceptionId: string;
    readonly framework: ComplianceFramework;
    readonly reason: string;
    readonly approvedBy: string;
    readonly expirationDate: Date;
    readonly conditions: string[];
}
export interface BusinessContext {
    readonly businessFunction: string;
    readonly department: string;
    readonly project: string;
    readonly costCenter: string;
    readonly businessJustification: string;
    readonly expectedBenefit: string;
    readonly urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
export declare class QueryRiskAssessmentAgent {
    private readonly logger;
    assessQueryRisk(request: ParlantDatabaseValidationRequest): Promise<ExecutionRiskAssessment>;
    private identifyRiskFactors;
    private calculateOverallRisk;
    private generateMitigationStrategies;
    private assessRollbackComplexity;
    private assessDataIntegrityRisk;
}
export declare class TransactionManagementAgent {
    private readonly logger;
    validateTransactionContext(request: ParlantDatabaseValidationRequest): Promise<TransactionContext>;
    private determineTransactionRequirement;
    private recommendIsolationLevel;
    private calculateTransactionTimeout;
    private determineRollbackStrategy;
    private requiresBackup;
    private requiresApproval;
}
export declare class DataAuditTrailAgent {
    private readonly logger;
    createAuditTrail(request: ParlantDatabaseValidationRequest, response: ParlantValidationResponse): Promise<DatabaseAuditTrail>;
    private generateComplianceRecord;
    private mapComplianceRequirements;
    private getValidAttestations;
    private checkComplianceExceptions;
    private extractBusinessContext;
    private determineUrgencyLevel;
}
export declare class NaturalLanguageExplanationAgent {
    private readonly logger;
    generateOperationExplanation(request: ParlantDatabaseValidationRequest): Promise<string>;
    private getBaseExplanation;
    private getRiskExplanation;
    private getImpactExplanation;
    private getComplianceExplanation;
}
export declare class DataIntegrityValidationAgent {
    private readonly logger;
    validateDataIntegrity(request: ParlantDatabaseValidationRequest): Promise<DataIntegrityReport>;
    private checkConstraintViolations;
    private validateRelationshipIntegrity;
    private validateBusinessRules;
    private assessDataQuality;
    private calculateOverallIntegrity;
    private generateIntegrityRecommendations;
}
export interface DataIntegrityReport {
    readonly validationId: string;
    readonly constraintViolations: ConstraintViolation[];
    readonly relationshipIssues: RelationshipIssue[];
    readonly businessRuleViolations: BusinessRuleViolation[];
    readonly dataQualityScore: number;
    readonly overallIntegrity: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    readonly recommendations: string[];
}
export interface ConstraintViolation {
    readonly constraintType: string;
    readonly description: string;
    readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    readonly affectedRows: number;
    readonly recommendation: string;
}
export interface RelationshipIssue {
    readonly relationshipType: string;
    readonly description: string;
    readonly affectedTables: string[];
    readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    readonly recommendation: string;
}
export interface BusinessRuleViolation {
    readonly ruleId: string;
    readonly ruleName: string;
    readonly description: string;
    readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    readonly recommendation: string;
}
export declare class DatabaseSecurityValidationAgent {
    private readonly logger;
    validateSecurityRequirements(request: ParlantDatabaseValidationRequest): Promise<SecurityValidationReport>;
    private validateAccessControl;
    private validateDataClassification;
    private validateEncryptionRequirements;
    private validateAuditRequirements;
    private mapClassificationToClearance;
    private isAccessApproved;
    private getClassificationRestrictions;
    private determineAuditLevel;
    private calculateRetentionPeriod;
    private calculateSecurityScore;
    private generateSecurityRecommendations;
}
export interface SecurityValidationReport {
    readonly validationId: string;
    readonly accessControlValidation: AccessControlValidation;
    readonly dataClassificationValidation: DataClassificationValidation;
    readonly encryptionValidation: EncryptionValidation;
    readonly auditValidation: AuditValidation;
    readonly overallSecurityScore: number;
    readonly securityRecommendations: string[];
}
export interface AccessControlValidation {
    readonly hasRequiredPermissions: boolean;
    readonly requiredRoles: string[];
    readonly currentRoles: string[];
    readonly accessLevel: string;
    readonly restrictions: string[];
}
export interface DataClassificationValidation {
    readonly dataClassification: DataClassification;
    readonly requiredClearance: string;
    readonly userClearance: string;
    readonly approved: boolean;
    readonly restrictions: string[];
}
export interface EncryptionValidation {
    readonly encryptionRequired: boolean;
    readonly encryptionInPlace: boolean;
    readonly encryptionAlgorithm: string;
    readonly keyManagement: string;
    readonly compliant: boolean;
}
export interface AuditValidation {
    readonly auditRequired: boolean;
    readonly auditLevel: string;
    readonly retentionPeriod: number;
    readonly auditDestination: string;
    readonly compliant: boolean;
}
export declare class ParlantDatabaseValidationComprehensiveService {
    private readonly queryRiskAgent;
    private readonly transactionAgent;
    private readonly auditAgent;
    private readonly explanationAgent;
    private readonly integrityAgent;
    private readonly securityAgent;
    private readonly logger;
    constructor(queryRiskAgent: QueryRiskAssessmentAgent, transactionAgent: TransactionManagementAgent, auditAgent: DataAuditTrailAgent, explanationAgent: NaturalLanguageExplanationAgent, integrityAgent: DataIntegrityValidationAgent, securityAgent: DatabaseSecurityValidationAgent);
    validateDatabaseOperation(request: ParlantDatabaseValidationRequest): Promise<ParlantDatabaseValidationResponse>;
    private createBaseValidationResponse;
    private determineApproval;
    private calculateConfidence;
    private generateValidationReason;
    private generateSuggestedAlternatives;
    private calculateRiskScore;
    private generateOptimizedQuery;
    private generatePerformanceRecommendations;
    private generateComplianceNotes;
    private generateExecutionPlan;
    private estimateExecutionDuration;
}
export { QueryRiskAssessmentAgent, TransactionManagementAgent, DataAuditTrailAgent, NaturalLanguageExplanationAgent, DataIntegrityValidationAgent, DatabaseSecurityValidationAgent, };
//# sourceMappingURL=parlant-database-validation-comprehensive.service.d.ts.map